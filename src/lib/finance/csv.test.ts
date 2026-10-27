import { describe, expect, it } from "vitest";
import { parseHoldingCsv } from "./csv";

const known = new Set(["RY.TO", "TD.TO", "TECK-B.TO", "SHOP.TO"]);

describe("parseHoldingCsv", () => {
  it("reads symbol and ticker headers with shares and quantity", () => {
    const fromSymbol = parseHoldingCsv(" Symbol , Shares \nRY.TO,2\n", known);
    const fromTicker = parseHoldingCsv("Name,Ticker,Quantity\nBank,td.to,4\n", known);
    expect(fromSymbol.error).toBeNull();
    expect(fromSymbol.rows).toEqual([{ symbol: "RY.TO", shares: 2 }]);
    expect(fromTicker.rows).toEqual([{ symbol: "TD.TO", shares: 4 }]);
  });

  it("normalizes dotted TSX symbols", () => {
    const parsed = parseHoldingCsv("symbol,shares\n ry.to ,1\nteck-b.to,2\n", known);
    expect(parsed.rows).toEqual([
      { symbol: "RY.TO", shares: 1 },
      { symbol: "TECK-B.TO", shares: 2 },
    ]);
  });

  it("lists unknown symbols and skips garbage rows", () => {
    const parsed = parseHoldingCsv("symbol,shares\nNOPE,3\nZZ.TO,1\nRY.TO,lots\n,4\n\nSHOP.TO,8\n", known);
    expect(parsed.rows).toEqual([{ symbol: "SHOP.TO", shares: 8 }]);
    expect(parsed.unknown).toEqual(["NOPE", "ZZ.TO"]);
    expect(parsed.skipped).toEqual(["RY.TO,lots", ",4"]);
  });

  it("clamps share counts the way the desk does", () => {
    const parsed = parseHoldingCsv(
      "quantity,ticker\n0,RY.TO\n2000000,TD.TO\n1.23456,SHOP.TO\n-3,TECK-B.TO\n",
      known,
    );
    expect(parsed.rows).toEqual([
      { symbol: "RY.TO", shares: 0.01 },
      { symbol: "TD.TO", shares: 1_000_000 },
      { symbol: "SHOP.TO", shares: 1.2346 },
      { symbol: "TECK-B.TO", shares: 0.01 },
    ]);
  });

  it("keeps a quoted comma from shifting the share count", () => {
    const parsed = parseHoldingCsv('symbol,name,shares\nRY.TO,"Royal Bank, Canada","1,000"\n', known);
    expect(parsed.rows).toEqual([{ symbol: "RY.TO", shares: 1000 }]);
  });

  it("refuses a file with no header row", () => {
    const parsed = parseHoldingCsv("RY.TO,10\n", known);
    expect(parsed.rows).toEqual([]);
    expect(parsed.unknown).toEqual([]);
    expect(parsed.error).toMatch(/header/i);
  });
});
