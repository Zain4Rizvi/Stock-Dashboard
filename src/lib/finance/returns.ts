import type { PricePoint } from "@/types/market";

export function percentChange(start: number, end: number): number | null {
  if (!(start > 0) || !Number.isFinite(end)) return null;
  return ((end - start) / start) * 100;
}

export type ReplayHorizon = "1Y" | "5Y";

const REPLAY_YEARS: Record<ReplayHorizon, number> = { "1Y": 1, "5Y": 5 };

function shiftIsoDate(iso: string, years: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year + years, month - 1, day));
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

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
