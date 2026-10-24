import { describe, expect, it } from "vitest";
import { assertTsxSymbol, toAlphaSymbol, toTwelveSymbol } from "./symbols";

describe("TSX symbols", () => {
  it("accepts the dotted UI form and class shares", () => {
    expect(assertTsxSymbol(" ry.to ")).toBe("RY.TO");
    expect(assertTsxSymbol("teck-b.to")).toBe("TECK-B.TO");
    expect(toAlphaSymbol("RY.TO")).toBe("RY.TRT");
    expect(toTwelveSymbol("BIP-UN.TO")).toEqual({ symbol: "BIP.UN", exchange: "TSX" });
  });

  it("rejects a bare ticker", () => {
    expect(() => assertTsxSymbol("RY")).toThrow(/RY\.TO/);
  });
});
