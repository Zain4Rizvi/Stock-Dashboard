import { describe, expect, it } from "vitest";
import { SeedFileSchema } from "@/lib/data/schemas";
import { UNIVERSE } from "./universe";
import { buildPricePath, buildSyntheticSeed, businessDaysEnding, SYNTHETIC_AS_OF } from "./synthetic";

describe("synthetic TSX snapshot", () => {
  it("covers 60 unique companies", () => {
    const symbols = UNIVERSE.map((company) => company.symbol);
    expect(symbols).toHaveLength(60);
    expect(new Set(symbols).size).toBe(60);
    for (const symbol of symbols) expect(symbol.endsWith(".TO")).toBe(true);
  });

  it("builds weekday history that lands on the target price", () => {
    const dates = businessDaysEnding(SYNTHETIC_AS_OF, 252);
    expect(dates).toHaveLength(252);
    expect(dates[dates.length - 1]).toBe(SYNTHETIC_AS_OF);
    for (const date of dates) {
      const day = new Date(`${date}T12:00:00Z`).getUTCDay();
      expect(day).not.toBe(0);
      expect(day).not.toBe(6);
    }
    const seed = buildSyntheticSeed(UNIVERSE.slice(0, 2));
    expect(() => SeedFileSchema.parse(seed)).not.toThrow();
    for (const stock of seed.stocks) {
      expect(stock.isSynthetic).toBe(true);
      expect(stock.history).toHaveLength(252);
      expect(stock.history[stock.history.length - 1].close).toBe(stock.quote.price);
      expect(stock.news).toEqual([]);
    }
  });

  it("keeps the path endpoints fixed", () => {
    const path = buildPricePath({ start: 100, end: 110, steps: 40, noise: 0.02, seed: 7 });
    expect(path[0]).toBe(100);
    expect(path[path.length - 1]).toBe(110);
  });
});
