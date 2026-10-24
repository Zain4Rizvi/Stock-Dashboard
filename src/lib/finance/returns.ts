import type { PricePoint } from "@/types/market";

export function percentChange(start: number, end: number): number | null {
  if (!(start > 0) || !Number.isFinite(end)) return null;
  return ((end - start) / start) * 100;
}

export function oneYearReturn(history: PricePoint[]): number | null {
  if (history.length < 2) return null;
  return percentChange(history[0].close, history[history.length - 1].close);
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
  "1Y": 10000,
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
