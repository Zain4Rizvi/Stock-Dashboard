import { describe, expect, it } from "vitest";
import { TRAIL_CAP, popTrail, pushTrail, resolvePreview } from "./trail";

describe("stock preview trail", () => {
  const known = new Set(["RY.TO", "TD.TO", "SHOP.TO"]);

  it("appends a symbol, skips a repeat of the current one, and drops the oldest past the cap", () => {
    expect(pushTrail([], "RY.TO")).toEqual(["RY.TO"]);
    expect(pushTrail(["RY.TO"], "RY.TO")).toEqual(["RY.TO"]);
    expect(pushTrail(["RY.TO"], "TD.TO")).toEqual(["RY.TO", "TD.TO"]);

    const full = Array.from({ length: TRAIL_CAP }, (_, index) => `N${index}.TO`);
    const capped = pushTrail(full, "SHOP.TO");
    expect(capped).toHaveLength(TRAIL_CAP);
    expect(capped[0]).toBe("N1.TO");
    expect(capped.at(-1)).toBe("SHOP.TO");
  });

  it("steps back one preview and keeps the last one", () => {
    expect(popTrail(["RY.TO", "TD.TO"])).toEqual(["RY.TO"]);
    expect(popTrail(["RY.TO"])).toEqual(["RY.TO"]);
    expect(popTrail([])).toEqual([]);
  });

  it("lets a known query win, otherwise the last stored symbol, otherwise the fallback", () => {
    expect(resolvePreview("SHOP.TO", ["RY.TO"], known, "RY.TO")).toEqual({
      symbol: "SHOP.TO",
      trail: ["RY.TO", "SHOP.TO"],
    });
    expect(resolvePreview("NOPE.TO", ["RY.TO", "TD.TO"], known, "RY.TO")).toEqual({
      symbol: "TD.TO",
      trail: ["RY.TO", "TD.TO"],
    });
    expect(resolvePreview(null, [], known, "RY.TO")).toEqual({
      symbol: "RY.TO",
      trail: ["RY.TO"],
    });
    expect(resolvePreview("RY.TO", ["GONE.TO", "RY.TO"], known, "TD.TO")).toEqual({
      symbol: "RY.TO",
      trail: ["RY.TO"],
    });
  });
});
