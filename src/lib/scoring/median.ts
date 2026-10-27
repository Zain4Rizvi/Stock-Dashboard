import type { ListingKind } from "@/types/market";

/** Middle value. An even count averages the two middle values. Nulls are skipped. */
export function median(values: readonly (number | null)[]): number | null {
  const sorted = values
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
    .sort((a, b) => a - b);
  const count = sorted.length;
  if (count === 0) return null;
  const mid = Math.floor(count / 2);
  if (count % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Middle company figure. Funds are left out, then nulls are left out. */
export function companyMedian<T extends { kind: ListingKind }>(
  items: readonly T[],
  read: (item: T) => number | null,
): number | null {
  return median(
    items.filter((item) => item.kind !== "fund").map(read),
  );
}
