import { formatPercent } from "@/lib/format";
import { companyMedian } from "@/lib/scoring/median";
import type { MetricScore } from "@/lib/scoring/score";
import type { ListingKind } from "@/types/market";

const BLANK = "—";

export function contrast(label: string, rows: { name: string; score: number | null }[]): string | null {
  const ranked = rows.filter((row): row is { name: string; score: number } => row.score != null);
  if (ranked.length < 2) return null;
  ranked.sort((a, b) => b.score - a.score);
  const gap = ranked[0].score - ranked[ranked.length - 1].score;
  if (gap < 8) return `On ${label.toLowerCase()}, these companies sit close together.`;
  return `On ${label.toLowerCase()}, ${ranked[0].name} looks stronger than ${ranked[ranked.length - 1].name}. That compares the latest numbers. It is not a tip.`;
}

export interface PriceWindow {
  symbol: string;
  name: string;
  oneYearReturn: number | null;
  returnStart: string | null;
  returnEnd: string | null;
}

export function priceWindowLabel(item: {
  oneYearReturn: number | null;
  returnStart: string | null;
  returnEnd: string | null;
}): string {
  if (item.oneYearReturn == null || item.returnStart == null || item.returnEnd == null) {
    return "Price change unavailable";
  }
  return `${formatPercent(item.oneYearReturn, 1, true)} price change ${item.returnStart} to ${item.returnEnd}`;
}

export function priceChangeVersusFund(selected: PriceWindow[], fund: PriceWindow): string {
  const peers = selected.filter((item) => item.symbol !== fund.symbol);
  return [...peers, fund].map((item) => `${item.name} ${namedWindow(item)}`).join(". ") + ".";
}

function namedWindow(item: PriceWindow): string {
  if (item.oneYearReturn == null || item.returnStart == null || item.returnEnd == null) {
    return "has no price-change window in this snapshot";
  }
  return priceWindowLabel(item);
}

export interface ShelfFigures {
  kind: ListingKind;
  pe: number | null;
  roe: number | null;
  epsGrowth: number | null;
  dividendYield: number | null;
  debtToEquity: number | null;
}

function figure(id: MetricScore["id"], item: ShelfFigures): number | null {
  switch (id) {
    case "valuation":
      return item.pe;
    case "profitability":
      return item.roe;
    case "growth":
      return item.epsGrowth;
    case "income":
      return item.dividendYield;
    case "resilience":
      return item.debtToEquity;
  }
}

function formatFigure(id: MetricScore["id"], value: number): string {
  if (id === "valuation") return value.toFixed(1);
  if (id === "resilience") return `${value.toFixed(1)} debt`;
  if (value === 0) return "0%";
  return `${value.toFixed(1)}%`;
}

export function shelfMedianText(id: MetricScore["id"], shelf: readonly ShelfFigures[]): string {
  const mid = companyMedian(shelf, (item) => figure(id, item));
  if (mid == null) return BLANK;
  return formatFigure(id, mid);
}

export function shelfPriceChangeMedian(
  shelf: readonly { kind: ListingKind; oneYearReturn: number | null }[],
): string {
  const mid = companyMedian(shelf, (item) => item.oneYearReturn);
  if (mid == null) return BLANK;
  return formatPercent(mid, 1, true);
}
