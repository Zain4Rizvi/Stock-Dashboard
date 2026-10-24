import type { PricePoint } from "@/types/market";

export function percentChange(start: number, end: number): number | null {
  if (!(start > 0) || !Number.isFinite(end)) return null;
  return ((end - start) / start) * 100;
}

export type ReplayHorizon = "1Y" | "5Y";

const REPLAY_YEARS: Record<ReplayHorizon, number> = { "1Y": 1, "5Y": 5 };

function shiftIsoDate(iso: string, years: number, days = 0): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year + years, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

export function resolveReplayHorizon(preset: string | undefined): ReplayHorizon {
  return preset === "5Y" ? "5Y" : "1Y";
}

/** Requested range plus the points the series actually has. Never fills gaps. */
export function replayWindow(
  history: PricePoint[],
  preset: string | undefined,
  now: string,
): { preset: ReplayHorizon; start: string; end: string; points: PricePoint[] } {
  const resolved = resolveReplayHorizon(preset);
  const start = shiftIsoDate(now, -REPLAY_YEARS[resolved]);
  const points = history.filter((point) => point.date >= start && point.date <= now);
  return { preset: resolved, start, end: now, points };
}

// ponytail: 5Y is the longest horizon this seed holds. Add 10Y when the fixture reaches it.
export function replayChoices(history: PricePoint[], now: string): ReplayHorizon[] {
  const choices: ReplayHorizon[] = ["1Y"];
  if (history.length === 0 || !now) return choices;
  let first = history[0].date;
  for (const point of history) if (point.date < first) first = point.date;
  if (first <= shiftIsoDate(shiftIsoDate(now, -5), 0, 7)) choices.push("5Y");
  return choices;
}

export function replayCaption(preset: string | undefined): string {
  return resolveReplayHorizon(preset) === "5Y" ? "About the last 5 years" : "About the last year";
}

export function oneYearReturn(history: PricePoint[]): number | null {
  if (history.length < 2) return null;
  const end = history[history.length - 1];
  const points = replayWindow(history, "1Y", end.date).points;
  if (points.length < 2) return null;
  return percentChange(points[0].close, points[points.length - 1].close);
}

/** Annualized standard deviation of daily log returns, in percent. */
export function annualizedVolatility(history: PricePoint[]): number | null {
  if (history.length < 5) return null;
  const rets: number[] = [];
  for (let i = 1; i < history.length; i++) {
    const previous = history[i - 1].close;
    const close = history[i].close;
    if (previous > 0 && close > 0) rets.push(Math.log(close / previous));
  }
  if (rets.length < 4) return null;
  const mean = rets.reduce((sum, value) => sum + value, 0) / rets.length;
  const variance =
    rets.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (rets.length - 1);
  return Math.sqrt(variance) * Math.sqrt(252) * 100;
}

export type ChartRange = "1M" | "3M" | "6M" | "1Y";

const RANGE_DAYS: Record<ChartRange, number> = {
  "1M": 21,
  "3M": 63,
  "6M": 126,
  "1Y": 252,
};

export function sliceHistory(history: PricePoint[], range: ChartRange): PricePoint[] {
  const days = RANGE_DAYS[range];
  if (history.length <= days) return history;
  return history.slice(-days);
}

export function replayInvestment(
  history: PricePoint[],
  dollars: number,
): { date: string; value: number }[] {
  if (history.length === 0 || !(dollars > 0) || !(history[0].close > 0)) return [];
  const shares = dollars / history[0].close;
  return history.map((point) => ({
    date: point.date,
    value: roundMoney(shares * point.close),
  }));
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
