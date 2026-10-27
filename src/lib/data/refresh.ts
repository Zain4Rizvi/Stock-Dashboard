import type { Cache } from "@/lib/data/cache/types";
import type { MarketDataProvider } from "@/lib/data/provider";
import { z } from "zod";

/** Kept longer than a long weekend. The next run overwrites a fresh value. */
export const REFRESH_TTL_SECONDS = 5 * 24 * 60 * 60;

/** Free-plan Workers allow 50 outbound calls. Twelve names are quote + history + one fundamentals call. */
export const REFRESH_BATCH = 12;

/** Stable across UTC dates. A dated key restarted the shelf at the first symbol every morning. */
export const REFRESH_CURSOR_KEY = "refresh:cursor";

export const REFRESH_STATUS_KEY = "refresh:status";

export const RefreshStatusSchema = z.object({
  lastRun: z.string().min(4),
  refreshed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
});

export function nextBatch(symbols: readonly string[], cursor: number, size = REFRESH_BATCH): string[] {
  const start = Math.max(0, cursor);
  return symbols.slice(start, start + size);
}

function storedCursor(value: unknown, length: number): number {
  const cursor = typeof value === "number" && Number.isFinite(value) ? value : 0;
  if (length === 0 || cursor < 0) return 0;
  if (cursor >= length) return 0;
  return cursor;
}

/**
 * Refreshes the next 12 Canada names into the cache.
 * The cursor survives midnight and wraps after the last symbol.
 * A name that throws is skipped until the cursor comes around again. Its previous cache value stays.
 */
export async function refreshCanadaSlice(input: {
  cache: Cache;
  yahoo: MarketDataProvider;
  symbols: readonly string[];
  now?: Date;
}): Promise<{ refreshed: string[]; failed: string[] }> {
  const now = input.now ?? new Date();
  const cursor = storedCursor(await input.cache.get<number>(REFRESH_CURSOR_KEY), input.symbols.length);
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
        const fundamentals = await input.yahoo.getFundamentals(symbol, quote);
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
    await input.cache.set(REFRESH_CURSOR_KEY, advanced, REFRESH_TTL_SECONDS);
  }
  await input.cache.set(
    REFRESH_STATUS_KEY,
    RefreshStatusSchema.parse({
      lastRun: now.toISOString(),
      refreshed: refreshed.length,
      failed: failed.length,
    }),
    REFRESH_TTL_SECONDS,
  );
  return { refreshed, failed };
}
