import type { Scorecard } from "@/lib/scoring/score";
import type { NewsItem, Snapshot } from "@/types/market";

export function explanationPrompt(snapshot: Snapshot, score: Scorecard): string {
  return [
    "Write a plain-English company briefing for a 22-year-old who has never studied finance.",
    "Use only the numbers and blurbs below. Do not invent news, lawsuits, or catalysts.",
    "Do not predict the share price. Do not say buy or sell. Do not give a price target.",
    "If isSynthetic is true, say the figures are a demo snapshot, not a live quote.",
    "Return JSON with keys headline, story, strengths (1-3 strings), watchouts (1-3 strings), beginnerTake, notAPrediction.",
    "notAPrediction must be the boolean true.",
    JSON.stringify({
      name: snapshot.stock.name,
      symbol: snapshot.stock.symbol,
      blurb: snapshot.stock.blurb,
      sector: snapshot.stock.sector,
      isSynthetic: snapshot.isSynthetic,
      price: snapshot.quote.price,
      oneYearReturn: score.oneYearReturn,
      summary: score.summary,
      metrics: score.metrics.map((metric) => ({
        label: metric.label,
        grade: metric.grade,
        headline: metric.headline,
        detail: metric.detail,
      })),
    }),
  ].join("\n");
}

export function sentimentPrompt(snapshot: Snapshot, headlines: NewsItem[]): string {
  return [
    "Explain the mood around this company for a new investor.",
    "If the headline list is empty, say that live headlines are not loaded. Do not invent articles.",
    "Do not predict the share price. Do not say buy or sell.",
    "Return JSON with keys tone (upbeat, mixed, uneasy, or quiet), title, explanation, whyItMatters, whatThisIsNot.",
    JSON.stringify({
      name: snapshot.stock.name,
      symbol: snapshot.stock.symbol,
      isSynthetic: snapshot.isSynthetic,
      headlines: headlines.map((item) => ({ title: item.title, source: item.source })),
    }),
  ].join("\n");
}

export const SYSTEM_PROMPT = [
  "You are Maple Market's teacher, not a broker.",
  "You explain Canadian stocks in everyday language.",
  "You never promise a direction for the price.",
  "You reply with a single JSON object and no markdown.",
].join(" ");
