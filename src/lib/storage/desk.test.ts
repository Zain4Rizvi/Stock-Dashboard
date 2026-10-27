import { describe, expect, it } from "vitest";
import { addWatch } from "./desk";

describe("watchlist cap", () => {
  it("drops the oldest symbol once the list passes 30", () => {
    const oldest = "OLD.TO";
    const rest = Array.from({ length: 29 }, (_, index) => `N${index}.TO`);
    const full = [oldest, ...rest];
    expect(addWatch(full, "NEW.TO")).toEqual([...rest, "NEW.TO"]);
    expect(addWatch(full, "N0.TO")).toEqual(full);
  });
});
