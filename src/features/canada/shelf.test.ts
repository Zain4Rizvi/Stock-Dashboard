import { describe, expect, it } from "vitest";
import { shelfWeights } from "./shelf";

describe("shelfWeights", () => {
  it("sums to 100 and ignores a null market cap", () => {
    const weights = shelfWeights([
      { sector: "Banks", marketCap: 75 },
      { sector: "Funds", marketCap: 25 },
      { sector: "Shops", marketCap: null },
    ]);
    expect(weights).toEqual([
      { sector: "Banks", weight: 75 },
      { sector: "Funds", weight: 25 },
    ]);
    expect(weights.reduce((sum, row) => sum + row.weight, 0)).toBe(100);
  });
});
