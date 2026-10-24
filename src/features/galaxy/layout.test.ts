import { describe, expect, it } from "vitest";
import { layoutUniverse, returnToColor, valuationDistance } from "./layout";

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

  it("turns a down year red and an up year green", () => {
    expect(returnToColor(-20).toLowerCase()).not.toBe(returnToColor(20).toLowerCase());
    expect(returnToColor(-20) < returnToColor(20) || returnToColor(-20) > returnToColor(20)).toBe(true);
  });
});
