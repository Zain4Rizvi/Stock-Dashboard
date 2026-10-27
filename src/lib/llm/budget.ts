import type { Cache } from "@/lib/data/cache/types";

export const ASK_HOUR_CAP = 8;
export const ASK_DAY_CAP = 150;

/** Salt for the visitor bucket. Not a secret; it only stops the raw IP from being the cache key. */
const ASK_IP_SALT = "maple-market-ask-ip-v1";

export type AskBudget = { ok: true } | { ok: false; scope: "hour" | "day"; retryAt: string };

export function askClientIp(request: Request): string | null {
  const cf = request.headers.get("cf-connecting-ip")?.trim();
  return cf ? cf : null;
}

export async function hashAskIp(ip: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${ASK_IP_SALT}:${ip}`));
  const bytes = new Uint8Array(digest);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) hex += bytes[i]!.toString(16).padStart(2, "0");
  return hex;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function when(date: Date): string {
  return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC on ${date.toISOString().slice(0, 10)}`;
}

function nextHour(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours() + 1));
}

function nextDay(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
}

function secondsUntil(then: Date, now: Date): number {
  return Math.max(60, Math.ceil((then.getTime() - now.getTime()) / 1000));
}

function asCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

/**
 * Counts one question against the visitor hour and the UTC day.
 * ponytail: get-then-set can overlap. This Cache has no atomic add; the caps are still the guard.
 */
export async function takeAskBudget(cache: Cache, ip: string | null, now = new Date()): Promise<AskBudget> {
  const bucket = ip ? await hashAskIp(ip) : "anonymous";
  const dayKey = `ask:day:${now.toISOString().slice(0, 10)}`;
  const hourKey = `ask:hour:${bucket}:${now.toISOString().slice(0, 13)}`;
  const dayCount = asCount(await cache.get<number>(dayKey));
  if (dayCount >= ASK_DAY_CAP) return { ok: false, scope: "day", retryAt: when(nextDay(now)) };
  const hourCount = asCount(await cache.get<number>(hourKey));
  if (hourCount >= ASK_HOUR_CAP) return { ok: false, scope: "hour", retryAt: when(nextHour(now)) };
  const dayEnds = nextDay(now);
  const hourEnds = nextHour(now);
  await cache.set(dayKey, dayCount + 1, secondsUntil(dayEnds, now));
  await cache.set(hourKey, hourCount + 1, secondsUntil(hourEnds, now));
  return { ok: true };
}
