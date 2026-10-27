import type { DataSource, Freshness } from "@/types/market";

const TORONTO = "America/Toronto";

interface TorontoClock {
  date: string;
  hour: number;
  minute: number;
  weekday: string;
}

function torontoClock(instant: Date): TorontoClock {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TORONTO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  }).formatToParts(instant);
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  const hour = Number(read("hour"));
  return {
    date: `${read("year")}-${read("month")}-${read("day")}`,
    hour: hour === 24 ? 0 : hour,
    minute: Number(read("minute")),
    weekday: read("weekday"),
  };
}

/** Calendar date in Toronto. A date-only string is already that date. */
export function torontoDate(value: string): string | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const instant = new Date(value);
  if (Number.isNaN(instant.getTime())) return null;
  return torontoClock(instant).date;
}

function daysBetween(earlier: string, later: string): number {
  const start = Date.parse(`${earlier}T00:00:00Z`);
  const end = Date.parse(`${later}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000);
}

/** True when the quote's Toronto date is more than three calendar days before now. */
export function isQuoteStale(asOf: string, now: Date): boolean {
  const quoteDay = torontoDate(asOf);
  if (!quoteDay) return true;
  return daysBetween(quoteDay, torontoClock(now).date) > 3;
}

/** Weekday 09:30–16:00 Toronto. The evening cron has not replaced this close yet. */
export function marketSessionNote(now: Date): string | null {
  const clock = torontoClock(now);
  if (clock.weekday === "Sat" || clock.weekday === "Sun") return null;
  const minutes = clock.hour * 60 + clock.minute;
  if (minutes < 9 * 60 + 30 || minutes >= 16 * 60) return null;
  return "The TSX session is open. This is still the previous close until the evening job.";
}

export function describeQuoteFreshness(input: {
  freshness: Freshness;
  source: DataSource;
  asOf?: string;
  fetchedAt?: string;
  fallback?: boolean;
  generatedAt?: string;
  now: Date;
}): string {
  const closeDay = input.asOf ? torontoDate(input.asOf) : null;
  const generatedDay = (input.generatedAt ? torontoDate(input.generatedAt) : null) ?? closeDay;
  const seedFallback = input.source !== "synthetic" && (input.fallback || input.freshness === "demo");
  if (seedFallback) {
    return [`Demo snapshot`, generatedDay, "not a live quote"].filter(Boolean).join(" · ");
  }
  if (input.freshness === "demo" || input.source === "synthetic") {
    return closeDay ? `Demo data · ${closeDay}` : "Demo data";
  }
  if (input.source === "yahoo") {
    const when = input.fetchedAt
      ? closeDay
        ? `Last close ${closeDay}`
        : "Last close"
      : closeDay
        ? `Fetched at ${closeDay}`
        : "Fetched at an unknown time";
    const stale = input.asOf ? isQuoteStale(input.asOf, input.now) : false;
    return [
      when,
      "unofficial Yahoo",
      "not a live quote",
      marketSessionNote(input.now),
      stale ? "This close is older than the last few sessions." : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }
  if (input.freshness === "snapshot") {
    return closeDay ? `Saved snapshot · ${closeDay}` : "Saved snapshot";
  }
  return closeDay ? `Live quote · ${closeDay}` : "Live quote";
}
