import type { DataSource, Freshness } from "@/types/market";

export function DataBadge({ freshness, source }: { freshness: Freshness; source: DataSource }) {
  if (freshness === "demo") {
    return <span className="rounded-full bg-gold/20 px-2.5 py-1 text-xs font-medium text-gold">Demo data</span>;
  }
  if (source === "yahoo" && freshness === "snapshot") {
    return (
      <span className="rounded-full bg-cream/10 px-2.5 py-1 text-xs font-medium text-cream">
        Saved snapshot · unofficial Yahoo
      </span>
    );
  }
  if (source === "yahoo") {
    return (
      <span className="rounded-full bg-cream/10 px-2.5 py-1 text-xs font-medium text-cream">Unofficial Yahoo</span>
    );
  }
  if (freshness === "snapshot") {
    return <span className="rounded-full bg-cream/10 px-2.5 py-1 text-xs font-medium text-cream">Saved snapshot</span>;
  }
  return <span className="rounded-full bg-aurora/15 px-2.5 py-1 text-xs font-medium text-aurora">Live quote</span>;
}
