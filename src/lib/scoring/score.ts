import { annualizedVolatility, oneYearReturn } from "@/lib/finance/returns";
import type { Fundamentals, PricePoint } from "@/types/market";

export type GradeLetter = "A" | "B" | "C" | "D" | "F";

export interface MetricScore {
  id: "valuation" | "profitability" | "growth" | "income" | "resilience";
  label: string;
  grade: GradeLetter | "N/A";
  score: number | null;
  headline: string;
  detail: string;
}

export interface Scorecard {
  overall: GradeLetter | "N/A";
  overallScore: number | null;
  summary: string;
  metrics: MetricScore[];
  oneYearReturn: number | null;
  volatility: number | null;
}

const LEVERED_BY_DESIGN = new Set(["Banks", "Insurance"]);

export function letterGrade(score: number): GradeLetter {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  if (score >= 40) return "D";
  return "F";
}

function dollars(pe: number): string {
  return `$${Math.round(pe)}`;
}

function valuation(pe: number | null): MetricScore {
  if (pe == null) {
    return {
      id: "valuation",
      label: "Price tag",
      grade: "N/A",
      score: null,
      headline: "No price-to-earnings number",
      detail: "Without earnings, the usual price tag (P/E) does not apply. We leave this line blank instead of inventing a grade.",
    };
  }
  if (pe < 0) {
    return {
      id: "valuation",
      label: "Price tag",
      grade: "D",
      score: 35,
      headline: "The company is losing money",
      detail: "P/E compares the share price with profit. There is no profit right now, so you would be buying a turnaround story rather than a simple bargain.",
    };
  }
  let score = 60;
  if (pe < 8) score = 74;
  else if (pe <= 18) score = 90;
  else if (pe <= 28) score = 72;
  else if (pe <= 45) score = 52;
  else score = 34;
  const cheapNote =
    pe < 8
      ? " A very low P/E can be a bargain, or a sign that other investors expect trouble. The number alone does not say which."
      : "";
  const richNote =
    pe > 28
      ? " A high price can still work out if profit grows into it. If profit stalls, the same price tag feels heavy."
      : "";
  return {
    id: "valuation",
    label: "Price tag",
    grade: letterGrade(score),
    score,
    headline: `About ${dollars(pe)} for each $1 of yearly profit`,
    detail: `The price-to-earnings ratio is ${pe.toFixed(1)}. You pay about ${dollars(pe)} for each dollar the company earned over the past year.${cheapNote}${richNote}`,
  };
}

function profitability(roe: number | null): MetricScore {
  if (roe == null) {
    return {
      id: "profitability",
      label: "Profitability",
      grade: "N/A",
      score: null,
      headline: "No return-on-equity number",
      detail: "Return on equity compares profit with the shareholder money already inside the business. We don't have it here.",
    };
  }
  let score = 50;
  if (roe < 0) score = 22;
  else if (roe < 8) score = 46;
  else if (roe < 15) score = 72;
  else if (roe <= 25) score = 88;
  else score = 93;
  const headline =
    roe < 0
      ? "The business lost money on shareholder funds"
      : `About ${roe.toFixed(0)}% back on shareholder money`;
  const detail =
    roe > 25
      ? `Return on equity is ${roe.toFixed(1)}%. That is very high. Sometimes it is a wonderful business, and sometimes debt or a one-off gain makes the number look kinder than the everyday reality.`
      : `Return on equity is ${roe.toFixed(1)}%. It is a rough read on how hard the shareholder money inside the company is working.`;
  return {
    id: "profitability",
    label: "Profitability",
    grade: letterGrade(score),
    score,
    headline,
    detail,
  };
}

function growth(epsGrowth: number | null): MetricScore {
  if (epsGrowth == null) {
    return {
      id: "growth",
      label: "Growth",
      grade: "N/A",
      score: null,
      headline: "No earnings-growth number",
      detail: "We can't see how fast profit per share has been changing, so this line stays blank.",
    };
  }
  let score = 55;
  if (epsGrowth < -10) score = 28;
  else if (epsGrowth < 0) score = 42;
  else if (epsGrowth < 8) score = 64;
  else if (epsGrowth <= 20) score = 84;
  else score = 92;
  const direction =
    epsGrowth >= 0
      ? `Profit per share grew about ${epsGrowth.toFixed(0)}%.`
      : `Profit per share shrank about ${Math.abs(epsGrowth).toFixed(0)}%.`;
  return {
    id: "growth",
    label: "Growth",
    grade: letterGrade(score),
    score,
    headline: epsGrowth >= 8 ? "Profits have been growing" : epsGrowth >= 0 ? "Profits are roughly steady" : "Profits have been shrinking",
    detail: `${direction} Growth makes a rich price easier to live with. A shrink does the opposite. One stretch of growth is not a promise that the next stretch looks the same.`,
  };
}

function income(yieldPercent: number | null, payout: number | null): MetricScore {
  if (yieldPercent == null) {
    return {
      id: "income",
      label: "Dividend",
      grade: "N/A",
      score: null,
      headline: "No dividend number",
      detail: "We don't know whether this company sends cash to shareholders.",
    };
  }
  if (yieldPercent <= 0) {
    return {
      id: "income",
      label: "Dividend",
      grade: "N/A",
      score: null,
      headline: "No dividend",
      detail: "This company does not pay a dividend. That is normal for businesses that put profit back into growth. Your result would depend on the share price, not on a cash cheque.",
    };
  }
  let score = 68;
  const payoutText =
    payout == null
      ? "We don't have a payout ratio, so we can't see whether the dividend fits inside the profit."
      : `The payout ratio is ${payout.toFixed(0)}%, meaning about that slice of profit is sent out as dividends.`;
  if (payout != null && payout > 100) score = 36;
  else if (yieldPercent > 7 && (payout == null || payout > 80)) score = 40;
  else if (yieldPercent >= 2 && yieldPercent <= 6 && payout != null && payout >= 25 && payout <= 75) score = 90;
  else if (yieldPercent > 6 && payout != null && payout < 70) score = 80;
  else if (yieldPercent < 2) score = 70;
  const warning =
    payout != null && payout > 100
      ? " Paying out more than the company earns can force a dividend cut later."
      : yieldPercent > 7
        ? " A very high yield is often a warning that the price fell, or that the dividend may be hard to keep. It is not automatically a gift."
        : "";
  return {
    id: "income",
    label: "Dividend",
    grade: letterGrade(score),
    score,
    headline:
      payout != null && payout > 100
        ? "The dividend is larger than the profit"
        : `About ${yieldPercent.toFixed(1)}% cash yield`,
    detail: `At the current price, the dividend works out to about ${yieldPercent.toFixed(1)}% a year, if it is kept. On a $100 share that is about $${yieldPercent.toFixed(2)} a year. ${payoutText}${warning}`,
  };
}

function resilience(input: {
  sector: string;
  debtToEquity: number | null;
  volatility: number | null;
}): MetricScore {
  if (input.volatility == null && input.debtToEquity == null) {
    return {
      id: "resilience",
      label: "Steadiness",
      grade: "N/A",
      score: null,
      headline: "Not enough to judge steadiness",
      detail: "We need either price history or a debt figure before this line means anything.",
    };
  }
  let score = input.volatility == null ? 60 : input.volatility < 18 ? 90 : input.volatility < 28 ? 74 : input.volatility < 40 ? 56 : 36;
  const bank = LEVERED_BY_DESIGN.has(input.sector);
  let debtSentence = "We don't have a debt-to-equity figure.";
  if (input.debtToEquity != null) {
    debtSentence = `Debt-to-equity is ${input.debtToEquity.toFixed(1)}.`;
    if (bank) {
      debtSentence += " Banks and insurers are built on other people's money, so this ratio looks huge next to a software company. We don't treat that as a red flag by itself.";
    } else if (input.debtToEquity > 3.5) {
      score = Math.min(score, 40);
      debtSentence += " That is a heavy load of borrowing for a company outside the banks. More debt means less room when profits dip.";
    } else if (input.debtToEquity > 2) {
      score = Math.min(score, 58);
      debtSentence += " Borrowing is doing a lot of the work. That can boost returns, and it can hurt when business slows.";
    } else {
      debtSentence += " Borrowing looks moderate beside shareholder money.";
    }
  }
  const volSentence =
    input.volatility == null
      ? "We don't have enough trading days to describe how jumpy the price has been."
      : `Over the past year, the price moved enough that a typical year of similar wiggles is about ${input.volatility.toFixed(0)}% up or down. That describes the past. It is not a forecast.`;
  return {
    id: "resilience",
    label: "Steadiness",
    grade: letterGrade(score),
    score,
    headline: score >= 70 ? "The past year was relatively calm" : score >= 55 ? "Some jumpiness, nothing extreme" : "The price, or the debt, has been restless",
    detail: `${volSentence} ${debtSentence}`,
  };
}

function summarize(name: string, overall: GradeLetter | "N/A"): string {
  if (overall === "N/A") return `We don't have enough numbers to give ${name} a report card.`;
  if (overall === "A") return `On these textbook measures, ${name} looks like one of the sturdier companies in the set.`;
  if (overall === "B") return `${name} has a solid report card, with a few lines worth reading twice.`;
  if (overall === "C") return `${name} is a mixed picture: some strengths, some question marks.`;
  if (overall === "D") return `Several of the basic measures for ${name} look stretched or weak.`;
  return `The basic measures for ${name} are flashing caution. That is a reason to learn more, not a reason to panic or to bet against the shares.`;
}

export function scoreStock(input: {
  name: string;
  sector: string;
  fundamentals: Fundamentals;
  history: PricePoint[];
}): Scorecard {
  const volatility = annualizedVolatility(input.history);
  const metrics = [
    valuation(input.fundamentals.pe),
    profitability(input.fundamentals.roe),
    growth(input.fundamentals.epsGrowth),
    income(input.fundamentals.dividendYield, input.fundamentals.payoutRatio),
    resilience({
      sector: input.sector,
      debtToEquity: input.fundamentals.debtToEquity,
      volatility,
    }),
  ];
  const scored = metrics.filter((metric) => metric.score != null);
  const overallScore =
    scored.length === 0
      ? null
      : Math.round(scored.reduce((sum, metric) => sum + (metric.score ?? 0), 0) / scored.length);
  const overall = overallScore == null ? "N/A" : letterGrade(overallScore);
  return {
    overall,
    overallScore,
    summary: summarize(input.name, overall),
    metrics,
    oneYearReturn: oneYearReturn(input.history),
    volatility,
  };
}
