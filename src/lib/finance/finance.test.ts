import { describe, expect, it } from "vitest";
import { INFLATION_RATE_MAX, INFLATION_RATE_MIN, futureValue, inflationAdjusted, projectGrowth, projectPortfolio } from "./compound";
import { simulateDividend } from "./drip";
import { monteCarloFan, projectOutcomeRange } from "./montecarlo";
import { oneYearReturn, replayWindow } from "./returns";

describe("finance", () => {
  it("compounds a single year at 10%", () => {
    expect(futureValue(1000, 0.1, 1)).toBe(1100);
    const rows = projectGrowth({ principal: 1000, contributionPerYear: 100, annualRate: 0.1, years: 1 });
    expect(rows[1].balance).toBe(1200);
    expect(rows[1].contributed).toBe(1100);
  });

  it("deflates a balance by inflation and clamps the slider range", () => {
    expect(inflationAdjusted(1000, 0, 10)).toBe(1000);
    const mild = inflationAdjusted(1000, 0.02, 10);
    const hotter = inflationAdjusted(1000, 0.05, 10);
    expect(mild).toBeLessThan(1000);
    expect(hotter).toBeLessThan(mild);
    expect(inflationAdjusted(1000, INFLATION_RATE_MIN - 1, 10)).toBe(1000);
    expect(inflationAdjusted(1000, INFLATION_RATE_MAX + 1, 10)).toBe(inflationAdjusted(1000, INFLATION_RATE_MAX, 10));
    expect(inflationAdjusted(1000, Number.NaN, 10)).toBe(1000);
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

  it("at 0% growth, one year of income is the yield times principal", () => {
    const principal = 800;
    const yieldPercent = 2.5;
    const rows = simulateDividend({
      principal,
      yieldPercent,
      dividendGrowthPercent: 0,
      priceGrowthPercent: 0,
      years: 2,
      reinvest: false,
    });
    const income = principal * (yieldPercent / 100);
    expect(rows[0]?.income).toBe(income);
    expect(rows[1]?.income).toBe(income);
  });

  it("projects an empty portfolio as nothing", () => {
    expect(projectPortfolio([], 0.06, 1)).toBeNull();
  });

  it("projects one holding with compound growth", () => {
    expect(projectPortfolio([{ dollars: 1000 }], 0.1, 1)).toBe(1100);
    expect(projectPortfolio([{ dollars: 1000 }], 0.1, 5)).toBe(futureValue(1000, 0.1, 5));
  });

  it("projects weights that sum to 100% as the whole pile", () => {
    const holdings = [{ dollars: 250 }, { dollars: 750 }];
    const total = holdings.reduce((sum, holding) => sum + holding.dollars, 0);
    const weight = holdings.reduce((sum, holding) => sum + holding.dollars / total, 0);
    expect(weight).toBe(1);
    expect(projectPortfolio(holdings, 0.1, 5)).toBe(futureValue(total, 0.1, 5));
  });

  it("ignores zero and negative dollars the desk cannot save", () => {
    expect(projectPortfolio([{ dollars: 0 }, { dollars: -40 }, { dollars: 500 }], 0.1, 1)).toBe(550);
    expect(projectPortfolio([{ dollars: 0 }, { dollars: -5 }], 0.1, 1)).toBeNull();
  });

  it("projects a higher assumed return as a higher value", () => {
    const low = projectPortfolio([{ dollars: 1000 }], 0.04, 10);
    const high = projectPortfolio([{ dollars: 1000 }], 0.08, 10);
    expect(high).toBeGreaterThan(low ?? 0);
    expect(high).toBe(futureValue(1000, 0.08, 10));
  });

  it("defaults a replay window to one year", () => {
    const now = "2026-10-23";
    const history = [
      { date: "2020-01-02", close: 40 },
      { date: "2025-10-23", close: 100 },
      { date: "2026-10-23", close: 116 },
    ];
    const window = replayWindow(history, undefined, now);
    expect(window.preset).toBe("1Y");
    expect(window.end).toBe(now);
    expect(window.start).toBe("2025-10-23");
    expect(window.points.map((point) => point.date)).toEqual(["2025-10-23", "2026-10-23"]);
  });

  it("requests five years ending on the same day", () => {
    const now = "2026-10-23";
    const window = replayWindow([], "5Y", now);
    expect(window.end).toBe(now);
    expect(window.start).toBe("2021-10-23");
    expect(window.end).toBe(replayWindow([], undefined, now).end);
  });

  it("clamps a horizon that is longer than the series", () => {
    const history = [
      { date: "2024-06-03", close: 10 },
      { date: "2025-06-02", close: 12 },
      { date: "2026-10-23", close: 14 },
    ];
    const window = replayWindow(history, "5Y", "2026-10-23");
    expect(window.points).toEqual(history);
  });

  it("falls back to one year for an unknown preset", () => {
    const now = "2026-10-23";
    const window = replayWindow([], "10Y", now);
    expect(window.preset).toBe("1Y");
    expect(window.start).toBe("2025-10-23");
    expect(window.end).toBe(now);
  });

  it("keeps a one-year return on the last year of a longer series", () => {
    expect(
      oneYearReturn([
        { date: "2021-10-23", close: 50 },
        { date: "2025-10-23", close: 100 },
        { date: "2026-10-23", close: 110 },
      ]),
    ).toBe(10);
  });
});
