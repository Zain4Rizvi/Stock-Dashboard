import { parseTsxSymbol } from "@/lib/data/symbols";
import type { Scorecard } from "@/lib/scoring/score";
import type { NewsItem, Snapshot } from "@/types/market";
import type { PageBrief } from "./pages";
import { DROP_OPTIONS, GOAL_OPTIONS, HORIZON_OPTIONS, type Profile } from "./schemas";

export interface AskTurn {
  role: "user" | "assistant";
  text: string;
}

export interface CoachStock {
  symbol: string;
  name: string;
  sector: string;
  blurb: string;
  isSynthetic: boolean;
  price: number;
  summary: string;
}

const TICKER = /\b[A-Z0-9]+(?:[.-][A-Z0-9]+)*\.TO\b/;

export function mentionedTicker(text: string): string | null {
  const found = text.toUpperCase().match(TICKER);
  return found ? parseTsxSymbol(found[0]) : null;
}

function choiceLabel<T extends string>(options: readonly { id: T; label: string }[], id: T): string {
  return options.find((option) => option.id === id)?.label ?? id;
}

function historyBlock(history: AskTurn[]): string {
  if (history.length === 0) return "";
  return history
    .slice(-8)
    .map((turn) => `${turn.role === "user" ? "Student" : "Teacher"}: ${turn.text.slice(0, 800)}`)
    .join("\n");
}

export function guidePrompt(page: Pick<PageBrief, "title" | "brief">, message: string, history: AskTurn[]): string {
  const earlier = historyBlock(history);
  return [
    "The student is asking what this page does.",
    "Answer only from the page brief. Do not invent buttons, charts, or numbers.",
    "Do not recommend a stock. Do not guess a future price. Do not tell them to trade.",
    "If they ask which stock to own, or what a price will do, point them to the Ask page at /ask, and still explain this page.",
    "Return JSON with keys answer, tryThis, notAPrediction.",
    "notAPrediction must be the boolean true.",
    "tryThis is one concrete thing on this page, taken from the brief, and it does not start with the word Try.",
    `Page: ${page.title}`,
    page.brief,
    earlier ? `Earlier in this sidebar:\n${earlier}` : "",
    `Question: ${message}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function coachPrompt(input: {
  message: string;
  history: AskTurn[];
  profile: Profile | null;
  holdings: { symbol: string; dollars: number }[];
  stock: CoachStock | null;
  unknownTicker: string | null;
}): string {
  const profileLine = input.profile
    ? `Goal: ${choiceLabel(GOAL_OPTIONS, input.profile.goal)}. Horizon: ${choiceLabel(HORIZON_OPTIONS, input.profile.horizon)}. If a holding dropped a lot: ${choiceLabel(DROP_OPTIONS, input.profile.drop)}.`
    : "The three choices are empty. Do not invent a match. Say in fit that the choices are empty.";
  const shelf =
    input.holdings.length === 0
      ? "Practice portfolio: empty. Do not invent companies."
      : `Practice portfolio (pretend dollars, not a real account): ${input.holdings
          .map((holding) => `${holding.symbol} $${holding.dollars}`)
          .join(", ")}.`;
  const earlier = historyBlock(input.history);
  return [
    "Answer an investing question for a 22-year-old who has never studied finance.",
    "Use only the choices, the practice portfolio, and the stock snapshot below.",
    "Do not invent news, lawsuits, or numbers that are not written here.",
    "Do not guess a future price. Do not tell them to trade. Do not name a target.",
    input.profile
      ? "fit must use the goal, horizon, and drop words below. Do not say the choices are missing."
      : "fit must say the choices are empty. Do not invent a match.",
    input.holdings.length === 0
      ? "fit must say the practice portfolio is empty. Do not invent companies."
      : "fit must mention the practice portfolio symbols below. Do not invent extra companies.",
    "If isSynthetic is true, say the figures are a demo snapshot, not a live quote.",
    "If a ticker is not on the shelf, say that. Do not invent its numbers.",
    "Return JSON with keys headline, answer, fit, watchouts (0-3 strings), terms (0-3 objects with word and plain), followUp, notAPrediction.",
    "notAPrediction must be the boolean true.",
    "followUp is one useful next question, or null.",
    "terms define jargon you actually used, in plain words.",
    profileLine,
    shelf,
    input.unknownTicker ? `Ticker not on the shelf: ${input.unknownTicker}` : "",
    input.stock ? `Stock snapshot:\n${JSON.stringify(input.stock)}` : "",
    earlier ? `Earlier in this chat:\n${earlier}` : "",
    `Question: ${input.message}`,
  ]
    .filter(Boolean)
    .join("\n");
}

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
