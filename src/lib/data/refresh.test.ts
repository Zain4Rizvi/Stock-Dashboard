import { describe, expect, it } from "vitest";
import { MemoryCache } from "./cache/memory";
import { KvCache, type KvBinding } from "./cache/kv";
import type { MarketDataProvider } from "./provider";
import { nextBatch, refreshCanadaSlice } from "./refresh";

function yahoo(fail: string[] = []): MarketDataProvider {
  return {
    id: "yahoo",
    async listStocks() {
      return [];
    },
    async getStock() {
      return null;
    },
    async getQuote(symbol: string) {
      if (fail.includes(symbol)) throw new Error("down");
      return {
        symbol,
        price: 10,
        change: 1,
        changePercent: 1,
        previousClose: 9,
        marketCap: 1,
        volume: 1,
        asOf: "2026-10-26T21:00:00.000Z",
      };
    },
    async getHistory(symbol: string) {
      if (fail.includes(symbol)) throw new Error("down");
      return [
        { date: "2026-10-23", close: 9 },
        { date: "2026-10-26", close: 10 },
      ];
    },
    async getFundamentals(symbol: string) {
      if (fail.includes(`${symbol}:fund`)) throw new Error("down");
      return {
        symbol,
        pe: 1,
        epsGrowth: 1,
        roe: 1,
        debtToEquity: 1,
        dividendYield: 1,
        payoutRatio: 1,
        marketCap: 1,
      };
    },
    async getNews() {
      return [];
    },
  };
}

class FakeKv implements KvBinding {
  readonly store = new Map<string, string>();
  async get(key: string): Promise<unknown> {
    const raw = this.store.get(key);
    return raw ? JSON.parse(raw) : null;
  }
  async put(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }
  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}

describe("daily refresh", () => {
  const symbols = Array.from({ length: 25 }, (_, index) => `N${index}.TO`);

  it("takes 12 names and continues the next run", async () => {
    const cache = new MemoryCache();
    const now = new Date("2026-10-26T22:00:00.000Z");
    const first = await refreshCanadaSlice({ cache, yahoo: yahoo(), symbols, now });
    expect(first.refreshed).toEqual(symbols.slice(0, 12));
    const second = await refreshCanadaSlice({ cache, yahoo: yahoo(), symbols, now });
    expect(second.refreshed).toEqual(symbols.slice(12, 24));
    expect(nextBatch(symbols, 24)).toEqual(symbols.slice(24));
  });

  it("skips a failed name and keeps the previous quote", async () => {
    const cache = new MemoryCache();
    const now = new Date("2026-10-26T22:00:00.000Z");
    await cache.set("quote:N1.TO", { source: "yahoo", data: { price: 4 } }, 60);
    const result = await refreshCanadaSlice({
      cache,
      yahoo: yahoo(["N1.TO"]),
      symbols: ["N0.TO", "N1.TO"],
      now,
    });
    expect(result.refreshed).toEqual(["N0.TO"]);
    expect(result.failed).toEqual(["N1.TO"]);
    expect(await cache.get("quote:N1.TO")).toEqual({ source: "yahoo", data: { price: 4 } });
    expect((await cache.get<{ data: { price: number } }>("quote:N0.TO"))?.data.price).toBe(10);
    const again = await refreshCanadaSlice({ cache, yahoo: yahoo(), symbols: ["N0.TO", "N1.TO"], now });
    expect(again.refreshed).toEqual([]);
  });

  it("round-trips a value through KV until it expires", async () => {
    let now = 1_000;
    const cache = new KvCache(new FakeKv(), () => now);
    await cache.set("quote:RY.TO", { source: "yahoo", data: 5 }, 60);
    expect(await cache.get("quote:RY.TO")).toEqual({ source: "yahoo", data: 5 });
    now += 61_000;
    expect(await cache.get("quote:RY.TO")).toBeNull();
  });
});