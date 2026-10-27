import { describe, expect, it } from "vitest";
import { companyMedian, median } from "./median";

describe("median", () => {
  it("averages the two middle values when the count is even", () => {
    expect(median([1, 3, 2, 4])).toBe(2.5);
  });

  it("picks the middle value when the count is odd", () => {
    expect(median([9, 1, 5])).toBe(5);
  });

  it("skips nulls", () => {
    expect(median([null, 10, null, 20])).toBe(15);
    expect(median([null, null])).toBeNull();
    expect(median([])).toBeNull();
  });

  it("leaves funds out of a company median", () => {
    expect(
      companyMedian(
        [
          { kind: "fund", value: 100 },
          { kind: "company", value: null },
          { kind: "company", value: 2 },
          { kind: "company", value: 4 },
        ],
        (item) => item.value,
      ),
    ).toBe(3);
  });
});
