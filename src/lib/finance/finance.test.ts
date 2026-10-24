import { describe, expect, it } from "vitest";
import { projectGrowth, futureValue, projectPortfolio } from "./compound";
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
