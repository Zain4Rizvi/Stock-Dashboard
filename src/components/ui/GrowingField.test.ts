import { describe, expect, it } from "vitest";
import { enterSends } from "./GrowingField";

describe("enterSends", () => {
  it("sends on desktop Enter", () => {
    expect(enterSends("Enter", false, false)).toBe(true);
  });

  it("does not send on Shift+Enter", () => {
    expect(enterSends("Enter", true, false)).toBe(false);
  });

  it("does not send on a coarse pointer", () => {
    expect(enterSends("Enter", false, true)).toBe(false);
  });
});
