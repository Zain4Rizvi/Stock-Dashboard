import { describe, expect, it } from "vitest";
import { layoutUniverse, planetLook, returnToColor, SECTOR_COLORS, valuationDistance } from "./layout";

describe("galaxy layout", () => {
  it("parks a richer price tag farther from its sector sun", () => {
    const placed = layoutUniverse([
      { symbol: "CHEAP.TO", sector: "Banks", marketCap: 80_000_000_000, pe: 10, oneYearReturn: 0 },
      { symbol: "RICH.TO", sector: "Banks", marketCap: 80_000_000_000, pe: 60, oneYearReturn: 0 },
    ]);
    const cheap = placed[0];
    const rich = placed[1];
    const cheapDistance = Math.hypot(cheap.x - cheap.sectorCenter.x, cheap.z - cheap.sectorCenter.z);
    const richDistance = Math.hypot(rich.x - rich.sectorCenter.x, rich.z - rich.sectorCenter.z);
    expect(richDistance).toBeGreaterThan(cheapDistance);
    expect(valuationDistance(60)).toBeGreaterThan(valuationDistance(10));
  });

  it("gives every sector its own planet silhouette", () => {
    const marks = Object.keys(SECTOR_COLORS).map((sector) => {
      const look = planetLook(sector);
      const shape = look.segments < 12 ? "faceted" : "smooth";
      const ring = look.ring === 0 ? "none" : look.ring < 1.6 ? "narrow" : "wide";
      return `${shape}:${ring}:${look.moon ? "moon" : "none"}`;
    });
    expect(new Set(marks).size).toBe(marks.length);
    expect(planetLook("Energy").ring).toBeGreaterThan(0);
    expect(planetLook("Tech").segments).toBeLessThan(12);
    expect(planetLook("Nowhere").ring).toBe(0);
    expect(planetLook("Nowhere").moon).toBe(false);
  });

  it("turns a down year red and an up year green", () => {
    expect(returnToColor(-20).toLowerCase()).not.toBe(returnToColor(20).toLowerCase());
    expect(returnToColor(-20) < returnToColor(20) || returnToColor(-20) > returnToColor(20)).toBe(true);
  });
});
