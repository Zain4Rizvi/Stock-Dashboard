import type { PricePoint } from "@/types/market";
import { monteCarloFan } from "./montecarlo";
import { annualizedVolatility, oneYearReturn, percentChange, replayWindow, roundMoney } from "./returns";

export interface PortfolioLeg {
  shares: number;
  history: PricePoint[];
}

const ASSUMED_RETURN = 0.06;
const FALLBACK_VOLATILITY = 0.12;
/** A 252-session year starts about two weeks after the calendar anniversary. */
const YEAR_EDGE_DAYS = 21;

function compareDate(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function shiftDays(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function addYears(iso: string, years: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return new Date(Date.UTC(year + years, month - 1, day)).toISOString().slice(0, 10);
}

/**
 * Value of a share-count mix. A leg is skipped until it has a close, and the
 * series starts once every counted leg has had one. Later gaps reuse the previous close.
 */
export function portfolioValue(legs: readonly PortfolioLeg[]): { date: string; value: number }[] {
  const active: { shares: number; points: PricePoint[] }[] = [];
  for (const leg of legs) {
    if (!(leg.shares > 0)) continue;
    const sorted = leg.history
      .filter((point) => point.date !== "" && Number.isFinite(point.close))
      .slice()
      .sort((a, b) => compareDate(a.date, b.date));
    if (sorted.length === 0) continue;
    const points: PricePoint[] = [];
    for (const point of sorted) {
      const previous = points[points.length - 1];
      if (previous && previous.date === point.date) points[points.length - 1] = point;
      else points.push(point);
    }
    active.push({ shares: leg.shares, points });
  }
  if (active.length === 0) return [];

  let start = active[0]!.points[0]!.date;
  for (const leg of active) {
    const first = leg.points[0]!.date;
    if (first > start) start = first;
  }

  const dates = new Set<string>();
  for (const leg of active) {
    for (const point of leg.points) {
      if (point.date >= start) dates.add(point.date);
    }
  }

  const timeline = [...dates].sort(compareDate);
  const cursor = active.map((leg) => {
    let index = 0;
    while (index + 1 < leg.points.length && leg.points[index + 1]!.date <= start) index += 1;
    return index;
  });

  return timeline.map((date) => {
    let value = 0;
    for (let i = 0; i < active.length; i += 1) {
      const leg = active[i]!;
      let index = cursor[i]!;
      while (index + 1 < leg.points.length && leg.points[index + 1]!.date <= date) index += 1;
      cursor[i] = index;
      value += leg.shares * leg.points[index]!.close;
    }
    return { date, value: roundMoney(value) };
  });
}

/**
 * `oneYearReturn` is a percent, and it also returns a number when the window is shorter than a year.
 * This page only uses it when the mix actually reaches back about a year.
 */
function pastYearReturn(points: PricePoint[]): number | null {
  if (points.length < 2) return null;
  const end = points[points.length - 1]?.date;
  if (!end) return null;
  const window = replayWindow(points, "1Y", end);
  const first = window.points[0];
  if (!first || window.points.length < 2) return null;
  if (first.date > shiftDays(window.start, YEAR_EDGE_DAYS)) return null;
  const result = oneYearReturn(points);
  return result != null && Number.isFinite(result) ? result : null;
}

export interface PortfolioFanStep {
  year: number;
  date: string;
  p10: number;
  p50: number;
  p90: number;
}

export interface PortfolioOutlook {
  value: number;
  change: number | null;
  changePercent: number | null;
  assumedRate: boolean;
  meanReturn: number;
  volatility: number;
  fan: PortfolioFanStep[];
}

/** What-if fan for a mix. `series` is portfolio value; `currentValue` is used only when that series is empty. */
export function portfolioOutlook(input: {
  series: readonly { date: string; value: number }[];
  currentValue?: number;
  anchorDate?: string;
}): PortfolioOutlook | null {
  const series = input.series
    .filter((point) => point.date !== "" && Number.isFinite(point.value))
    .slice()
    .sort((a, b) => compareDate(a.date, b.date));
  const last = series[series.length - 1];
  const raw = last ? last.value : input.currentValue;
  if (raw == null || !Number.isFinite(raw)) return null;
  const value = roundMoney(raw);
  if (!(value > 0)) return null;
  const anchor = last?.date ?? input.anchorDate;
  if (!anchor) return null;

  const first = series[0];
  const change = series.length >= 2 && first ? roundMoney(value - first.value) : null;
  const changePercent = series.length >= 2 && first ? percentChange(first.value, value) : null;
  const points: PricePoint[] = series.map((point) => ({ date: point.date, close: point.value }));
  const measured = pastYearReturn(points);
  const assumedRate = measured == null;
  const meanReturn = assumedRate ? ASSUMED_RETURN : measured / 100;
  const vol = points.length > 0 ? annualizedVolatility(points) : null;
  const volatility = vol != null && Number.isFinite(vol) && vol > 0 ? vol / 100 : FALLBACK_VOLATILITY;
  const fan = monteCarloFan({
    principal: value,
    contributionPerYear: 0,
    meanReturn,
    volatility,
    years: 10,
  });

  return {
    value,
    change,
    changePercent,
    assumedRate,
    meanReturn,
    volatility,
    fan: fan.map((step) => ({
      year: step.year,
      date: addYears(anchor, step.year),
      p10: step.p10,
      p50: step.p50,
      p90: step.p90,
    })),
  };
}
