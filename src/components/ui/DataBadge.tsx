import type { DataSource, Freshness } from "@/types/market";

function quoteDay(asOf?: string): string | null {
  if (!asOf) return null;
  const day = asOf.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
}

export function DataBadge({
  freshness,
  source,
  asOf,
}: {
  freshness: Freshness;
  source: DataSource;
  asOf?: string;
}) {
  const day = quoteDay(asOf);
  const dated = day ? ` · ${day}` : "";
  if (freshness === "demo") {
    return <span className="rounded-full bg-gold/20 px-2.5 py-1 text-xs font-medium text-gold">Demo data{dated}</span>;
  }
  if (source === "yahoo" && freshness === "snapshot") {
    return (
      <span className="rounded-full bg-cream/10 px-2.5 py-1 text-xs font-medium text-cream">
        Saved snapshot{dated} · unofficial Yahoo
      </span>
    );
  }
  if (source === "yahoo") {
    return (
      <span className="rounded-full bg-cream/10 px-2.5 py-1 text-xs font-medium text-cream">Unofficial Yahoo{dated}</span>
    );
  }
  if (freshness === "snapshot") {
    return <span className="rounded-full bg-cream/10 px-2.5 py-1 text-xs font-medium text-cream">Saved snapshot{dated}</span>;
  }
  return <span className="rounded-full bg-aurora/15 px-2.5 py-1 text-xs font-medium text-aurora">Live quote{dated}</span>;
}
