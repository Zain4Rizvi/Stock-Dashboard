import { describe, expect, it } from "vitest";
import { portfolioOutlook, portfolioValue } from "./portfolio";

describe("portfolioValue", () => {
  it("adds shares times close when dates line up", () => {
    expect(
      portfolioValue([
        {
          shares: 2,
          history: [
            { date: "2024-01-02", close: 12 },
            { date: "2024-01-01", close: 10 },
          ],
        },
        {
          shares: 1,
          history: [
            { date: "2024-01-01", close: 20 },
            { date: "2024-01-02", close: 22 },
          ],
        },
      ]),
    ).toEqual([
      { date: "2024-01-01", value: 40 },
      { date: "2024-01-02", value: 46 },
    ]);
  });

  it("reuses the previous close across a gap", () => {
    expect(
      portfolioValue([
        {
          shares: 1,
          history: [
            { date: "2024-01-01", close: 10 },
            { date: "2024-01-03", close: 14 },
          ],
        },
        {
          shares: 1,
          history: [
            { date: "2024-01-01", close: 5 },
            { date: "2024-01-02", close: 6 },
            { date: "2024-01-03", close: 7 },
          ],
        },
      ]),
    ).toEqual([
      { date: "2024-01-01", value: 15 },
      { date: "2024-01-02", value: 16 },
      { date: "2024-01-03", value: 21 },
    ]);
  });

  it("starts once every leg has had a close", () => {
    expect(
      portfolioValue([
        {
          shares: 1,
          history: [
            { date: "2024-01-01", close: 10 },
            { date: "2024-01-02", close: 11 },
            { date: "2024-01-03", close: 12 },
          ],
        },
        { shares: 2, history: [{ date: "2024-01-03", close: 8 }] },
      ]),
    ).toEqual([{ date: "2024-01-03", value: 28 }]);
  });

  it("returns nothing for empty input", () => {
    expect(portfolioValue([])).toEqual([]);
  });

  it("skips a leg with no history and ignores shares that are not positive", () => {
    expect(
      portfolioValue([
        { shares: 4, history: [{ date: "2024-03-01", close: 5 }] },
        { shares: 2, history: [] },
        { shares: 0, history: [{ date: "2024-01-01", close: 99 }] },
        { shares: -3, history: [{ date: "2024-06-01", close: 99 }] },
      ]),
    ).toEqual([{ date: "2024-03-01", value: 20 }]);
  });

  it("rounds the summed value to cents", () => {
    expect(
      portfolioValue([
        { shares: 1, history: [{ date: "2024-01-01", close: 0.014 }] },
        { shares: 1, history: [{ date: "2024-01-01", close: 0.014 }] },
      ]),
    ).toEqual([{ date: "2024-01-01", value: 0.03 }]);
  });
});

describe("portfolioOutlook", () => {
  it("uses 6% when the mix does not cover a past year", () => {
    const outlook = portfolioOutlook({
      series: [
        { date: "2024-06-01", value: 100 },
        { date: "2024-07-01", value: 120 },
      ],
      currentValue: 999,
    });
    expect(outlook?.value).toBe(120);
    expect(outlook?.assumedRate).toBe(true);
    expect(outlook?.meanReturn).toBe(0.06);
    expect(outlook?.volatility).toBe(0.12);
    expect(outlook?.change).toBe(20);
    expect(outlook?.fan.map((step) => step.year)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("turns a measured past year into a decimal and keeps a flat year at 0%", () => {
    const flat = portfolioOutlook({
      series: [
        { date: "2023-01-01", value: 100 },
        { date: "2023-04-01", value: 100 },
        { date: "2023-07-01", value: 100 },
        { date: "2023-10-01", value: 100 },
        { date: "2024-01-01", value: 100 },
      ],
    });
    expect(flat?.assumedRate).toBe(false);
    expect(flat?.meanReturn).toBe(0);
    expect(flat?.volatility).toBe(0.12);
    expect(flat?.change).toBe(0);

    const gained = portfolioOutlook({
      series: [
        { date: "2023-01-01", value: 100 },
        { date: "2023-04-01", value: 100 },
        { date: "2023-07-01", value: 100 },
        { date: "2023-10-01", value: 100 },
        { date: "2024-01-01", value: 110 },
      ],
    });
    expect(gained?.assumedRate).toBe(false);
    expect(gained?.meanReturn).toBeCloseTo(0.1);
    expect(gained?.value).toBe(110);
    expect(gained?.change).toBe(10);
    expect(gained?.changePercent).toBe(10);
    expect(gained?.fan[0]).toMatchObject({ year: 0, date: "2024-01-01", p50: 110 });
    expect(gained?.fan[5]?.year).toBe(5);
    expect(gained?.fan[10]).toMatchObject({ year: 10, date: "2034-01-01" });
    expect(gained!.fan[5]!.p10).toBeLessThanOrEqual(gained!.fan[5]!.p50);
    expect(gained!.fan[5]!.p50).toBeLessThanOrEqual(gained!.fan[5]!.p90);
  });

  it("fans a quote value when history has not loaded", () => {
    const outlook = portfolioOutlook({ series: [], currentValue: 1000, anchorDate: "2024-01-01" });
    expect(outlook).toMatchObject({
      value: 1000,
      change: null,
      changePercent: null,
      assumedRate: true,
      meanReturn: 0.06,
      volatility: 0.12,
    });
    expect(outlook?.fan[0]).toMatchObject({ year: 0, date: "2024-01-01", p10: 1000, p50: 1000, p90: 1000 });
    expect(outlook?.fan[10]?.date).toBe("2034-01-01");
    expect(portfolioOutlook({ series: [], currentValue: 0, anchorDate: "2024-01-01" })).toBeNull();
  });
});
