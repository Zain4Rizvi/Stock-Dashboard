import { describe, expect, it } from "vitest";
import type { Fundamentals, PricePoint } from "@/types/market";
import { scoreStock } from "./score";

function history(start: number, step: number, count = 40): PricePoint[] {
  return Array.from({ length: count }, (_, index) => ({
    date: `2026-03-${String((index % 27) + 1).padStart(2, "0")}`,
    close: start + index * step,
  }));
}

function fundamentals(patch: Partial<Fundamentals>): Fundamentals {
  return {
    symbol: "RY.TO",
    pe: 14,
    epsGrowth: 8,
    roe: 14,
    debtToEquity: 0.4,
    dividendYield: 3,
    payoutRatio: 40,
    marketCap: 1,
    ...patch,
  };
}

describe("scoreStock", () => {
  it("does not punish a bank for a huge debt ratio", () => {
    const card = scoreStock({
      name: "Royal Bank of Canada",
      sector: "Banks",
      fundamentals: fundamentals({ debtToEquity: 11 }),
      history: history(100, 0.05),
    });
    const steadiness = card.metrics.find((metric) => metric.id === "resilience");
    expect(steadiness?.detail).toMatch(/don't treat that as a red flag/i);
    expect(steadiness?.grade === "A" || steadiness?.grade === "B").toBe(true);
  });

  it("caps a non-bank that is heavily borrowed", () => {
    const card = scoreStock({
      name: "Restaurant Brands",
      sector: "Shops",
      fundamentals: fundamentals({ debtToEquity: 4.2, symbol: "QSR.TO" }),
      history: history(100, 0.02),
    });
    const steadiness = card.metrics.find((metric) => metric.id === "resilience");
    expect(steadiness?.score).not.toBeNull();
    expect(steadiness!.score!).toBeLessThanOrEqual(40);
    expect(steadiness?.detail).toMatch(/heavy load/i);
  });

  it("treats a missing dividend as not applicable, not a failure", () => {
    const card = scoreStock({
      name: "Shopify",
      sector: "Tech",
      fundamentals: fundamentals({ dividendYield: 0, payoutRatio: 0, pe: 86, symbol: "SHOP.TO" }),
      history: history(100, 0.2),
    });
    const income = card.metrics.find((metric) => metric.id === "income");
    expect(income?.grade).toBe("N/A");
    expect(card.overall).not.toBe("F");
  });

  it("warns when the dividend is larger than the profit", () => {
    const card = scoreStock({
      name: "BCE",
      sector: "Telecom",
      fundamentals: fundamentals({ dividendYield: 8.4, payoutRatio: 130, symbol: "BCE.TO" }),
      history: history(40, -0.05),
    });
    const income = card.metrics.find((metric) => metric.id === "income");
    expect(income?.headline).toMatch(/larger than the profit/i);
    expect(income?.detail).toMatch(/cut/i);
  });

  it("never tells you to buy", () => {
    const card = scoreStock({
      name: "Dollarama",
      sector: "Shops",
      fundamentals: fundamentals({ pe: 12, roe: 20, epsGrowth: 12 }),
      history: history(100, 0.04),
    });
    const text = JSON.stringify(card);
    expect(text.toLowerCase()).not.toMatch(/you should buy|strong buy|will go up/);
  });

  it("shows the P/E as the valuation figure", () => {
    const card = scoreStock({
      name: "Dollarama",
      sector: "Shops",
      fundamentals: fundamentals({ pe: 12.4 }),
      history: history(100, 0.04),
    });
    const valuation = card.metrics.find((metric) => metric.id === "valuation");
    expect(valuation?.label).toBe("Valuation");
    expect(valuation?.display).toBe("12.4");
  });

  it("shows a zero dividend yield as 0% and leaves the grade blank", () => {
    const card = scoreStock({
      name: "Shopify",
      sector: "Tech",
      fundamentals: fundamentals({ dividendYield: 0, payoutRatio: 0, symbol: "SHOP.TO" }),
      history: history(100, 0.2),
    });
    const income = card.metrics.find((metric) => metric.id === "income");
    expect(income?.display).toBe("0%");
    expect(income?.grade).toBe("N/A");
  });

  it("leaves missing P/E, ROE, and payout blank", () => {
    const card = scoreStock({
      name: "Example",
      sector: "Shops",
      fundamentals: fundamentals({
        pe: null,
        roe: null,
        payoutRatio: null,
        dividendYield: 2.5,
        symbol: "EX.TO",
      }),
      history: history(100, 0.01),
    });
    expect(card.metrics.find((metric) => metric.id === "valuation")?.display).toBe("—");
    expect(card.metrics.find((metric) => metric.id === "valuation")?.grade).toBe("N/A");
    expect(card.metrics.find((metric) => metric.id === "profitability")?.display).toBe("—");
    expect(card.metrics.find((metric) => metric.id === "profitability")?.grade).toBe("N/A");
    const income = card.metrics.find((metric) => metric.id === "income");
    expect(income?.detail).toMatch(/don't have a payout ratio/i);
    expect(income?.detail).not.toMatch(/payout ratio is \d/i);
  });

  it("does not give a fund a company letter grade", () => {
    const card = scoreStock({
      name: "iShares Core Equity ETF Portfolio",
      sector: "Funds",
      kind: "fund",
      fundamentals: fundamentals({
        pe: 12,
        roe: 20,
        epsGrowth: 12,
        dividendYield: 2,
        payoutRatio: 40,
        symbol: "XEQT.TO",
      }),
      history: history(40, 0.05),
    });
    expect(card.overall).toBe("N/A");
    expect(card.overallScore).toBeNull();
    expect(card.metrics.every((metric) => metric.grade === "N/A")).toBe(true);
    expect(card.metrics.every((metric) => metric.score == null)).toBe(true);
    const blank = scoreStock({
      name: "iShares Core Equity ETF Portfolio",
      sector: "Funds",
      kind: "fund",
      fundamentals: fundamentals({
        pe: null,
        roe: null,
        payoutRatio: null,
        dividendYield: null,
        epsGrowth: null,
        debtToEquity: null,
        symbol: "XEQT.TO",
      }),
      history: history(40, 0.05),
    });
    expect(blank.metrics.find((metric) => metric.id === "valuation")?.display).toBe("—");
    expect(blank.metrics.find((metric) => metric.id === "profitability")?.display).toBe("—");
    expect(blank.metrics.find((metric) => metric.id === "income")?.detail).not.toMatch(/payout ratio is \d/i);
  });
});
