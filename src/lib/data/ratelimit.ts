import type { Cache } from "./cache/types";

/** Self-imposed daily ceilings so a page view cannot empty a free tier. */
export const DAILY_LIMITS: Record<string, number> = {
  // ponytail: unofficial Yahoo capped at 200/day; raise only if this adapter is a deliberate dev choice
  yahoo: 200,
  fmp: 200,
  twelvedata: 600,
  alphavantage: 20,
};

function dayKey(now: number, provider: string): string {
  return `ratelimit:${provider}:${new Date(now).toISOString().slice(0, 10)}`;
}

export class RateLimiter {
  constructor(
    private readonly cache: Cache,
    private readonly limits: Record<string, number> = DAILY_LIMITS,
    private readonly now: () => number = Date.now,
  ) {}

  private limitFor(provider: string): number {
    return this.limits[provider] ?? 50;
  }

  async used(provider: string): Promise<number> {
    const value = await this.cache.get<number>(dayKey(this.now(), provider));
    return value ?? 0;
  }

  async remaining(provider: string): Promise<number> {
    return Math.max(0, this.limitFor(provider) - (await this.used(provider)));
  }

  /** Returns false when the day's budget is already spent. */
  async take(provider: string, cost = 1): Promise<boolean> {
    const used = await this.used(provider);
    if (used + cost > this.limitFor(provider)) return false;
    await this.cache.set(dayKey(this.now(), provider), used + cost, 60 * 60 * 36);
    return true;
  }
}
