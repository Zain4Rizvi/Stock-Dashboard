import { describe, expect, it } from "vitest";
import { businessDaysEnding, buildPricePath, buildSyntheticSeed } from "./synthetic";
import { UNIVERSE } from "./universe";

describe("TSX universe", () => {
  it("holds 60 unique .TO symbols", () => {
    expect(UNIVERSE).toHaveLength(60);
    const symbols = UNIVERSE.map((company) => company.symbol);
    expect(new Set(symbols).size).toBe(60);
    for (const symbol of symbols) expect(symbol.endsWith(".TO")).toBe(true);
  });

  it("builds a year of weekday closes that finish on the quoted price", () => {
    const dates = businessDaysEnding("2026-10-23", 252);
    expect(dates).toHaveLength(252);
    expect(dates.every((date) => ![0, 6].includes(new Date(`${date}T12:00:00Z`).getUTCDay()))).toBe(true);
    const seed = buildSyntheticSeed(UNIVERSE.slice(0, 3));
    for (const stock of seed.stocks) {
      expect(stock.isSynthetic).toBe(true);
      expect(stock.history).toHaveLength(252);
      expect(stock.history.at(-1)?.close).toBe(stock.quote.price);
      expect(stock.news).toEqual([]);
    }
    const path = buildPricePath({ start: 100, end: 110, steps: 20, noise: 0.01, seed: 1 });
    expect(path[0]).toBe(100);
    expect(path.at(-1)).toBe(110);
  });
});
