import type { Cache } from "@/lib/data/cache/types";
import type { MarketDataProvider } from "@/lib/data/provider";

/** Kept longer than a long weekend. The next run overwrites a fresh value. */
export const REFRESH_TTL_SECONDS = 5 * 24 * 60 * 60;

/** Free-plan Workers allow 50 outbound calls. Yahoo uses up to 4 per name. */
export const REFRESH_BATCH = 12;

export function refreshCursorKey(day: string): string {
  return `refresh:cursor:${day}`;
}

export function nextBatch(symbols: readonly string[], cursor: number, size = REFRESH_BATCH): string[] {
  const start = Math.max(0, cursor);
  return symbols.slice(start, start + size);
}

/**
 * Refreshes the next 12 Canada names into the cache.
 * A name that throws is skipped until the next UTC day. Its previous cache value stays.
 */
export async function refreshCanadaSlice(input: {
  cache: Cache;
  yahoo: MarketDataProvider;
  symbols: readonly string[];
  now?: Date;
}): Promise<{ refreshed: string[]; failed: string[] }> {
  const now = input.now ?? new Date();
  const key = refreshCursorKey(now.toISOString().slice(0, 10));
  const cursor = (await input.cache.get<number>(key)) ?? 0;
  const batch = nextBatch(input.symbols, cursor);
  const refreshed: string[] = [];
  const failed: string[] = [];
  let advanced = cursor;
  for (const symbol of batch) {
    try {
      const quote = await input.yahoo.getQuote(symbol);
      const history = await input.yahoo.getHistory(symbol);
      await input.cache.set(`quote:${symbol}`, { source: "yahoo", data: quote }, REFRESH_TTL_SECONDS);
      await input.cache.set(`history:${symbol}`, { source: "yahoo", data: history }, REFRESH_TTL_SECONDS);
      try {
        const fundamentals = await input.yahoo.getFundamentals(symbol);
        await input.cache.set(
          `fundamentals:${symbol}`,
          { source: "yahoo", data: fundamentals },
          REFRESH_TTL_SECONDS,
        );
      } catch {
        /* Yesterday's fundamentals stay. Quote and history are already the new close. */
      }
      refreshed.push(symbol);
    } catch {
      failed.push(symbol);
    }
    advanced += 1;
    await input.cache.set(key, advanced, REFRESH_TTL_SECONDS);
  }
  return { refreshed, failed };
}
