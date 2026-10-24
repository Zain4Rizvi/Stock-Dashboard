import { describe, expect, it } from "vitest";
import { projectGrowth, futureValue } from "./compound";
import { simulateDividend } from "./drip";
import { monteCarloFan, projectOutcomeRange } from "./montecarlo";
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

  it("splits a simulation band and three scenarios", () => {
    const shared = { principal: 1000, contributionPerYear: 1200, years: 10, paths: 80, seed: 22 };
    const slower = projectOutcomeRange({ ...shared, annualReturn: 0.04, volatility: 0.12 });
    const faster = projectOutcomeRange({ ...shared, annualReturn: 0.08, volatility: 0.12 });
    expect(slower.low).toBeLessThanOrEqual(slower.middle);
    expect(slower.middle).toBeLessThanOrEqual(slower.high);
    expect(faster.low).toBeGreaterThan(slower.low);
    expect(faster.middle).toBeGreaterThan(slower.middle);
    expect(faster.high).toBeGreaterThan(slower.high);
    expect(slower.kind).toBe("simulation");
    expect(slower.lowLabel).toBe("Low, an unlikely edge");
    expect(slower.middleLabel).toBe("Middle, where most simulated outcomes landed");
    expect(slower.highLabel).toBe("High, an unlikely edge");

    const cautious = projectOutcomeRange({ ...shared, annualReturn: 0.04 });
    const hopeful = projectOutcomeRange({ ...shared, annualReturn: 0.08 });
    expect(cautious.low).toBeLessThan(cautious.middle);
    expect(cautious.middle).toBeLessThan(cautious.high);
    expect(hopeful.low).toBeGreaterThan(cautious.low);
    expect(hopeful.middle).toBeGreaterThan(cautious.middle);
    expect(hopeful.high).toBeGreaterThan(cautious.high);
    expect(cautious.kind).toBe("scenario");
    expect(cautious.lowLabel).toBe("Conservative scenario");
    expect(cautious.middleLabel).toBe("Expected scenario");
    expect(cautious.highLabel).toBe("Optimistic scenario");
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
