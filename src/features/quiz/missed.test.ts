import { describe, expect, it } from "vitest";
import { missedQuizIndexes } from "./missed";

describe("missedQuizIndexes", () => {
  it("returns the indexes that do not match, in order", () => {
    expect(missedQuizIndexes([1, 0, 2, 1], [1, 0, 1, 1])).toEqual([2]);
    expect(missedQuizIndexes([0, 1], [1, 0, 2])).toEqual([0, 1, 2]);
    expect(missedQuizIndexes([1, 0, 2], [1, 0, 2])).toEqual([]);
  });
});
