export interface ShelfWeight {
  sector: string;
  weight: number;
}

/** Share of market cap on this shelf. Null caps are left out. Weights are percents that sum to 100. */
export function shelfWeights(items: readonly { sector: string; marketCap: number | null }[]): ShelfWeight[] {
  const counted = items.filter((item): item is { sector: string; marketCap: number } => item.marketCap != null && item.marketCap > 0);
  const total = counted.reduce((sum, item) => sum + item.marketCap, 0);
  if (total === 0) return [];
  const caps = new Map<string, number>();
  for (const item of counted) caps.set(item.sector, (caps.get(item.sector) ?? 0) + item.marketCap);
  return [...caps.entries()].map(([sector, cap]) => ({ sector, weight: (cap / total) * 100 }));
}
