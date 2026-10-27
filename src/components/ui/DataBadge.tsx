import { describeQuoteFreshness, isQuoteStale, torontoDate } from "@/lib/data/session";
import type { DataSource, ExplorerItem, Freshness } from "@/types/market";

function withDateRange(text: string, dateRange: string | null | undefined): string {
  if (!dateRange) return text;
  const unique = [...new Set(text.match(/\d{4}-\d{2}-\d{2}/g) ?? [])];
  if (unique.length === 1) return text.split(unique[0]).join(dateRange);
  if (unique.length === 0) return `${text} · ${dateRange}`;
  return text;
}

function quoteDateSpan(universe: readonly ExplorerItem[]): { start: string; end: string; oldestAsOf: string } | null {
  const dated = universe.flatMap((item) => {
    const day = torontoDate(item.asOf);
    return day ? [{ day, asOf: item.asOf }] : [];
  });
  if (dated.length === 0) return null;
  const sorted = [...dated].sort((a, b) => a.day.localeCompare(b.day) || a.asOf.localeCompare(b.asOf));
  return { start: sorted[0].day, end: sorted[sorted.length - 1].day, oldestAsOf: sorted[0].asOf };
}

export function DataBadge({
  freshness,
  source,
  asOf,
  fetchedAt,
  fallback,
  generatedAt,
  dateRange,
  now,
}: {
  freshness: Freshness;
  source: DataSource;
  asOf?: string;
  fetchedAt?: string;
  fallback?: boolean;
  generatedAt?: string;
  /** Oldest and newest quote dates when the set spans more than one day. */
  dateRange?: string | null;
  now?: Date;
}) {
  const clock = now ?? new Date();
  const text = withDateRange(
    describeQuoteFreshness({ freshness, source, asOf, fetchedAt, fallback, generatedAt, now: clock }),
    dateRange,
  );
  const warn =
    freshness === "demo" ||
    fallback ||
    source === "synthetic" ||
    (asOf ? isQuoteStale(asOf, clock) : false);
  const tone = warn ? "bg-gold/20 text-gold" : freshness === "live" && source !== "yahoo" ? "bg-aurora/15 text-aurora" : "bg-cream/10 text-cream";
  return (
    <span className={`max-w-xl rounded-full px-2.5 py-1 text-xs font-medium leading-5 ${tone}`} suppressHydrationWarning>
      {text}
    </span>
  );
}

/** Shelf badge. When quote dates differ, it names the oldest and the newest. */
export function UniverseBadge({ universe }: { universe: readonly ExplorerItem[] }) {
  const sample = universe[0];
  if (!sample) return null;
  const span = quoteDateSpan(universe);
  const dateRange = span && span.start !== span.end ? `${span.start} to ${span.end}` : null;
  const demo = universe.some((item) => item.freshness === "demo" || item.fallback);
  return (
    <DataBadge
      freshness={demo ? "demo" : sample.freshness}
      source={sample.source}
      asOf={dateRange ? span?.oldestAsOf : sample.asOf}
      fetchedAt={demo ? undefined : sample.fetchedAt}
      fallback={Boolean(sample.fallback) || (demo && sample.source !== "synthetic")}
      generatedAt={sample.generatedAt ?? universe.find((item) => item.generatedAt)?.generatedAt}
      dateRange={dateRange}
    />
  );
}
