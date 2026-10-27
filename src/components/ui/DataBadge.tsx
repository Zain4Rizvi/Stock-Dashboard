import { describeQuoteFreshness, isQuoteStale } from "@/lib/data/session";
import type { DataSource, ExplorerItem, Freshness } from "@/types/market";

export function DataBadge({
  freshness,
  source,
  asOf,
  fetchedAt,
  fallback,
  generatedAt,
  now,
}: {
  freshness: Freshness;
  source: DataSource;
  asOf?: string;
  fetchedAt?: string;
  fallback?: boolean;
  generatedAt?: string;
  now?: Date;
}) {
  const clock = now ?? new Date();
  const text = describeQuoteFreshness({ freshness, source, asOf, fetchedAt, fallback, generatedAt, now: clock });
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

/** Shelf badge from the first name, same fields the explorer already carries. */
export function UniverseBadge({ universe }: { universe: readonly ExplorerItem[] }) {
  const sample = universe[0];
  if (!sample) return null;
  const demo = universe.some((item) => item.freshness === "demo" || item.fallback);
  return (
    <DataBadge
      freshness={demo ? "demo" : sample.freshness}
      source={sample.source}
      asOf={sample.asOf}
      fetchedAt={demo ? undefined : sample.fetchedAt}
      fallback={Boolean(sample.fallback) || (demo && sample.source !== "synthetic")}
      generatedAt={sample.generatedAt ?? universe.find((item) => item.generatedAt)?.generatedAt}
    />
  );
}
