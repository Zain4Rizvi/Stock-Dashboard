import { describe, expect, it } from "vitest";
import { projectGrowth, futureValue } from "./compound";
import { simulateDividend } from "./drip";
import { monteCarloFan } from "./montecarlo";
import { replayInvestment } from "./returns";

describe("finance", () => {
  it("compounds a single year at 10%", () => {
    expect(futureValue(1000, 0.1, 1)).toBe(1100);
    const rows = projectGrowth({ principal: 1000, contributionPerYear: 100, annualRate: 0.1, years: 1 });
    expect(rows[1].balance).toBe(1200);
    expect(rows[1].contributed).toBe(1100);
  });

  it("is deterministic and flat when volatility is zero", () => {
    const fan = monteCarloFan({
      principal: 1000,
      contributionPerYear: 0,
      meanReturn: 0.1,
      volatility: 0,
      years: 1,
      paths: 40,
      seed: 5,
    });
    const again = monteCarloFan({
      principal: 1000,
      contributionPerYear: 0,
      meanReturn: 0.1,
      volatility: 0,
      years: 1,
      paths: 40,
      seed: 5,
    });
    expect(fan[1].p50).toBe(1100);
    expect(fan).toEqual(again);
  });

  it("pays the yield once, and DRIP adds shares", () => {
    const cash = simulateDividend({
      principal: 1000,
      yieldPercent: 5,
      dividendGrowthPercent: 0,
      priceGrowthPercent: 0,
      years: 1,
      reinvest: false,
    });
    expect(cash[0].income).toBe(50);
    expect(cash[0].shares).toBe(10);
    const drip = simulateDividend({
      principal: 1000,
      yieldPercent: 5,
      dividendGrowthPercent: 0,
      priceGrowthPercent: 0,
      years: 2,
      reinvest: true,
    });
    expect(drip[1].shares).toBeGreaterThan(drip[0].shares);
    expect(drip[1].cash).toBe(0);
  });

  it("replays a purchase from the first close", () => {
    const series = replayInvestment(
      [
        { date: "2026-01-02", close: 50 },
        { date: "2026-01-03", close: 75 },
      ],
      100,
    );
    expect(series[0].value).toBe(100);
    expect(series[1].value).toBe(150);
  });
});
