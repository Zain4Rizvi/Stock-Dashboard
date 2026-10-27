import { describe, expect, it } from "vitest";
import { priceChangeVersusFund, priceWindowLabel, shelfMedianText, shelfPriceChangeMedian } from "./words";

const blank = {
  pe: null,
  roe: null,
  epsGrowth: null,
  dividendYield: null,
  debtToEquity: null,
};

describe("compare words", () => {
  it("shows the price-change window and does not invent dates", () => {
    expect(
      priceWindowLabel({ oneYearReturn: 10, returnStart: "2025-10-24", returnEnd: "2026-10-23" }),
    ).toBe("+10.0% price change 2025-10-24 to 2026-10-23");
    expect(priceWindowLabel({ oneYearReturn: 10, returnStart: null, returnEnd: "2026-10-23" })).toBe(
      "Price change unavailable",
    );
    expect(priceWindowLabel({ oneYearReturn: null, returnStart: null, returnEnd: null })).toBe(
      "Price change unavailable",
    );
  });

  it("compares selected names with the fund's own name", () => {
    const line = priceChangeVersusFund(
      [
        {
          symbol: "RY.TO",
          name: "Royal Bank",
          oneYearReturn: 10,
          returnStart: "2025-10-24",
          returnEnd: "2026-10-23",
        },
        {
          symbol: "XIU.TO",
          name: "iShares S&P/TSX 60 Index ETF",
          oneYearReturn: 8,
          returnStart: "2025-10-24",
          returnEnd: "2026-10-23",
        },
      ],
      {
        symbol: "XIU.TO",
        name: "iShares S&P/TSX 60 Index ETF",
        oneYearReturn: 8,
        returnStart: "2025-10-24",
        returnEnd: "2026-10-23",
      },
    );
    expect(line).toBe(
      "Royal Bank +10.0% price change 2025-10-24 to 2026-10-23. iShares S&P/TSX 60 Index ETF +8.0% price change 2025-10-24 to 2026-10-23.",
    );
    expect(line.match(/iShares/g)).toHaveLength(1);
    expect(line).not.toMatch(/composite/i);
  });

  it("does not invent a price change the snapshot does not have", () => {
    const line = priceChangeVersusFund(
      [{ symbol: "RY.TO", name: "Royal Bank", oneYearReturn: null, returnStart: null, returnEnd: null }],
      {
        symbol: "XIU.TO",
        name: "iShares S&P/TSX 60 Index ETF",
        oneYearReturn: null,
        returnStart: null,
        returnEnd: null,
      },
    );
    expect(line).toBe(
      "Royal Bank has no price-change window in this snapshot. iShares S&P/TSX 60 Index ETF has no price-change window in this snapshot.",
    );
    expect(line).not.toMatch(/%/);
  });

  it("uses the middle company figure and leaves funds out", () => {
    const shelf = [
      { kind: "company" as const, ...blank, pe: 10, roe: 1, epsGrowth: 1, dividendYield: 0, debtToEquity: 1 },
      { kind: "company" as const, ...blank, pe: 20, epsGrowth: 5, debtToEquity: 3 },
      { kind: "fund" as const, ...blank, pe: 1000, roe: 1000, epsGrowth: 1000, dividendYield: 1000, debtToEquity: 1000 },
    ];
    expect(shelfMedianText("valuation", shelf)).toBe("15.0");
    expect(shelfMedianText("profitability", shelf)).toBe("1.0%");
    expect(shelfMedianText("growth", shelf)).toBe("3.0%");
    expect(shelfMedianText("income", shelf)).toBe("0%");
    expect(shelfMedianText("resilience", shelf)).toBe("2.0 debt");
    expect(shelfMedianText("valuation", [{ kind: "company", ...blank }])).toBe("—");
    expect(
      shelfPriceChangeMedian([
        { kind: "company", oneYearReturn: 10 },
        { kind: "company", oneYearReturn: 20 },
        { kind: "company", oneYearReturn: null },
        { kind: "fund", oneYearReturn: 100 },
      ]),
    ).toBe("+15.0%");
  });
});
