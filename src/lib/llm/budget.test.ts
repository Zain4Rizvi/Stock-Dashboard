import type { Cache } from "@/lib/data/cache/types";
import { describe, expect, it } from "vitest";
import { ASK_DAY_CAP, ASK_HOUR_CAP, askClientIp, hashAskIp, takeAskBudget } from "./budget";

function fakeCache() {
  const store = new Map<string, unknown>();
  const cache: Cache = {
    async get<T>(key: string): Promise<T | null> {
      return store.has(key) ? (store.get(key) as T) : null;
    },
    async set<T>(key: string, value: T): Promise<void> {
      store.set(key, value);
    },
    async delete(key: string): Promise<void> {
      store.delete(key);
    },
  };
  return { cache, store };
}

const ip = "198.51.100.10";
const other = "198.51.100.11";
const during = new Date("2026-10-26T20:15:00.000Z");

describe("ask budget", () => {
  it("allows questions under the hour and day caps", async () => {
    expect(ASK_HOUR_CAP).toBe(8);
    expect(ASK_DAY_CAP).toBe(150);
    const { cache, store } = fakeCache();
    expect(await takeAskBudget(cache, ip, during)).toEqual({ ok: true });
    expect(await takeAskBudget(cache, ip, during)).toEqual({ ok: true });
    expect(store.get("ask:day:2026-10-26")).toBe(2);
    const hourKeys = [...store.keys()].filter((key) => key.startsWith("ask:hour:"));
    expect(hourKeys).toHaveLength(1);
    expect(hourKeys[0]).toContain(":2026-10-26T20");
    expect(hourKeys[0]).not.toContain(ip);
    expect(store.get(hourKeys[0]!)).toBe(2);
  });

  it("blocks the next question from one visitor for the rest of the hour", async () => {
    const { cache, store } = fakeCache();
    for (let i = 0; i < ASK_HOUR_CAP; i++) expect((await takeAskBudget(cache, ip, during)).ok).toBe(true);
    const blocked = await takeAskBudget(cache, ip, during);
    expect(blocked).toEqual({ ok: false, scope: "hour", retryAt: "21:00 UTC on 2026-10-26" });
    const hourKey = [...store.keys()].find((key) => key.startsWith("ask:hour:") && key.endsWith(":2026-10-26T20"));
    expect(store.get(hourKey!)).toBe(ASK_HOUR_CAP);
    expect(store.get("ask:day:2026-10-26")).toBe(ASK_HOUR_CAP);
    expect((await takeAskBudget(cache, other, during)).ok).toBe(true);
  });

  it("blocks everyone once the site hits the UTC day cap", async () => {
    const { cache, store } = fakeCache();
    await cache.set("ask:day:2026-10-26", ASK_DAY_CAP, 60);
    const blocked = await takeAskBudget(cache, ip, during);
    expect(blocked).toEqual({ ok: false, scope: "day", retryAt: "00:00 UTC on 2026-10-27" });
    expect([...store.keys()].some((key) => key.startsWith("ask:hour:"))).toBe(false);
    expect(store.get("ask:day:2026-10-26")).toBe(ASK_DAY_CAP);
    expect((await takeAskBudget(cache, other, new Date("2026-10-27T00:00:00.000Z"))).ok).toBe(true);
  });

  it("starts a fresh hour window without resetting the day", async () => {
    const { cache, store } = fakeCache();
    const late = new Date("2026-10-26T20:59:00.000Z");
    for (let i = 0; i < ASK_HOUR_CAP; i++) await takeAskBudget(cache, ip, late);
    expect((await takeAskBudget(cache, ip, late)).ok).toBe(false);
    expect((await takeAskBudget(cache, ip, new Date("2026-10-26T21:00:00.000Z"))).ok).toBe(true);
    const keys = [...store.keys()];
    expect(keys.filter((key) => key.includes(":2026-10-26T20"))).toHaveLength(1);
    expect(keys.filter((key) => key.includes(":2026-10-26T21"))).toHaveLength(1);
    expect(store.get("ask:day:2026-10-26")).toBe(ASK_HOUR_CAP + 1);
  });

  it("puts a missing address in one anonymous bucket and never stores the raw ip", async () => {
    const { cache, store } = fakeCache();
    expect(askClientIp(new Request("https://maple.test", { headers: { "cf-connecting-ip": " 203.0.113.4 " } }))).toBe("203.0.113.4");
    expect(askClientIp(new Request("https://maple.test", { headers: { "x-forwarded-for": "203.0.113.4" } }))).toBeNull();
    expect(await takeAskBudget(cache, null, during)).toEqual({ ok: true });
    expect(await takeAskBudget(cache, null, during)).toEqual({ ok: true });
    const hourKey = [...store.keys()].find((key) => key.startsWith("ask:hour:"));
    expect(hourKey).toBe("ask:hour:anonymous:2026-10-26T20");
    const hashed = await hashAskIp(ip);
    expect(hashed).toBe(await hashAskIp(ip));
    expect(hashed).not.toBe(await hashAskIp(other));
    expect(hashed).not.toContain(ip);
    expect([...store.keys()].join(" ")).not.toContain(ip);
  });
});
