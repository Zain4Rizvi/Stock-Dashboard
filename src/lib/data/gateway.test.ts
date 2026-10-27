import { describe, expect, it } from "vitest";
import type { MarketDataProvider } from "./provider";
import { MemoryCache } from "./cache/memory";
import { createSeedProvider } from "./adapters/seed";
import { createGateway } from "./gateway";
import { RateLimiter } from "./ratelimit";
import { buildSyntheticSeed } from "./seed/synthetic";
import { UNIVERSE } from "./seed/universe";

function failingLive(onCall?: () => void): MarketDataProvider {
  return {
    id: "yahoo",
    async listStocks() {
      return [];
    },
    async getStock() {
      return null;
    },
    async getQuote() {
      onCall?.();
      throw new Error("down");
    },
    async getHistory() {
      onCall?.();
      throw new Error("down");
    },
    async getFundamentals() {
      onCall?.();
      throw new Error("down");
    },
    async getNews() {
      onCall?.();
      return [];
    },
  };
}

describe("gateway", () => {
  const file = buildSyntheticSeed([UNIVERSE[0]]);

  it("falls back to seed when live data throws", async () => {
    const gateway = createGateway({
      live: failingLive(),
      seed: createSeedProvider(file),
      cache: new MemoryCache(),
    });
    const snapshot = await gateway.getSnapshot("RY.TO", { refresh: true });
    expect(snapshot?.isSynthetic).toBe(true);
    expect(snapshot?.quote.price).toBe(file.stocks[0].quote.price);
    expect(snapshot?.source).toBe("synthetic");
  });

  it("does not call live once the daily budget is gone", async () => {
    let calls = 0;
    const cache = new MemoryCache();
    const gateway = createGateway({
      live: failingLive(() => {
        calls += 1;
      }),
      seed: createSeedProvider(file),
      cache,
      rates: new RateLimiter(cache, { yahoo: 0 }),
    });
    const snapshot = await gateway.getSnapshot("RY.TO", { refresh: true });
    expect(calls).toBe(0);
    expect(snapshot?.quote.price).toBe(file.stocks[0].quote.price);
  });

  it("serves a cached live quote without marking it synthetic", async () => {
    const cache = new MemoryCache();
    await cache.set(
      "quote:RY.TO",
      { source: "yahoo", data: { ...file.stocks[0].quote, price: 321 } },
      60,
    );
    await cache.set("history:RY.TO", { source: "yahoo", data: file.stocks[0].history }, 60);
    await cache.set("fundamentals:RY.TO", { source: "yahoo", data: file.stocks[0].fundamentals }, 60);
    await cache.set("news:RY.TO", { source: "yahoo", data: [] }, 60);
    const gateway = createGateway({
      live: failingLive(),
      seed: createSeedProvider(file),
      cache,
    });
    const explorer = await gateway.getExplorer();
    expect(explorer[0].price).toBe(321);
    expect(explorer[0].isSynthetic).toBe(false);
    expect(explorer[0].source).toBe("yahoo");
    expect(explorer[0].freshness).toBe("snapshot");
  });

  it("reads the daily cache when Yahoo is off and does not call it on a page view", async () => {
    let calls = 0;
    const cache = new MemoryCache();
    await cache.set(
      "quote:RY.TO",
      { source: "yahoo", data: { ...file.stocks[0].quote, price: 321 } },
      60,
    );
    await cache.set("history:RY.TO", { source: "yahoo", data: file.stocks[0].history }, 60);
    await cache.set("fundamentals:RY.TO", { source: "yahoo", data: file.stocks[0].fundamentals }, 60);
    await cache.set("news:RY.TO", { source: "yahoo", data: [] }, 60);
    const gateway = createGateway({
      live: failingLive(() => {
        calls += 1;
      }),
      seed: createSeedProvider(file),
      cache,
    });
    const snapshot = await gateway.getSnapshot("RY.TO");
    expect(calls).toBe(0);
    expect(snapshot?.quote.price).toBe(321);
    expect(snapshot?.freshness).toBe("snapshot");
    const offline = createGateway({ live: null, seed: createSeedProvider(file), cache });
    expect((await offline.getExplorer())[0].price).toBe(321);
    expect((await offline.getExplorer())[0].fallback).toBe(false);
  });

  it("returns the seed as a fallback when the cache is empty", async () => {
    let calls = 0;
    const seeded = {
      ...file,
      source: "yahoo",
      stocks: [{ ...file.stocks[0], isSynthetic: false }],
    };
    const gateway = createGateway({
      live: failingLive(() => {
        calls += 1;
      }),
      seed: createSeedProvider(seeded),
      cache: new MemoryCache(),
    });
    const explorer = await gateway.getExplorer();
    expect(calls).toBe(0);
    expect(explorer[0]?.fallback).toBe(true);
    expect(explorer[0]?.freshness).toBe("demo");
    expect(explorer[0]?.generatedAt).toBe(seeded.generatedAt);
    expect(explorer[0]?.source).toBe("yahoo");
    const snapshot = await gateway.getSnapshot("RY.TO");
    expect(calls).toBe(0);
    expect(snapshot?.fallback).toBe(true);
    expect(snapshot?.freshness).toBe("demo");
  });

  it("labels a two-point replay window with its close dates", async () => {
    const cache = new MemoryCache();
    await cache.set(
      "history:RY.TO",
      {
        source: "yahoo",
        data: [
          { date: "2024-01-02", close: 40 },
          { date: "2025-10-24", close: 80 },
          { date: "2026-10-23", close: 100 },
        ],
      },
      60,
    );
    const gateway = createGateway({
      live: null,
      seed: createSeedProvider(file),
      cache,
    });
    const row = (await gateway.getExplorer())[0];
    expect(row.oneYearReturn).toBe(25);
    expect(row.returnStart).toBe("2025-10-24");
    expect(row.returnEnd).toBe("2026-10-23");
  });

  it("passes an ex-dividend day through only when the quote stored one", async () => {
    const cache = new MemoryCache();
    await cache.set(
      "quote:RY.TO",
      { source: "yahoo", data: { ...file.stocks[0].quote, exDividendDate: "2026-12-01" } },
      60,
    );
    const gateway = createGateway({
      live: null,
      seed: createSeedProvider(file),
      cache,
    });
    const row = (await gateway.getExplorer()).find((item) => item.symbol === "RY.TO");
    expect(row?.exDividendDate).toBe("2026-12-01");

    const seeded = createGateway({
      live: null,
      seed: createSeedProvider(file),
      cache: new MemoryCache(),
    });
    const seedRow = (await seeded.getExplorer()).find((item) => item.symbol === "RY.TO");
    expect(seedRow?.exDividendDate).toBeUndefined();
  });

  it("returns a null price change and null dates for a one-point history", async () => {
    const cache = new MemoryCache();
    await cache.set(
      "history:RY.TO",
      { source: "yahoo", data: [{ date: "2026-10-23", close: 100 }] },
      60,
    );
    const gateway = createGateway({
      live: null,
      seed: createSeedProvider(file),
      cache,
    });
    const row = (await gateway.getExplorer())[0];
    expect(row.oneYearReturn).toBeNull();
    expect(row.oneYearReturn).not.toBe(0);
    expect(row.returnStart).toBeNull();
    expect(row.returnEnd).toBeNull();
  });

  it("lists a fund from the universe without inventing a price", async () => {
    const seed = createSeedProvider(file);
    const fund = await seed.getStock("XEQT.TO");
    expect(fund?.kind).toBe("fund");
    expect(fund?.name).toBeTruthy();
    const fundamentals = await seed.getFundamentals("XEQT.TO");
    expect(fundamentals.pe).toBeNull();
    expect(fundamentals.roe).toBeNull();
    expect(fundamentals.payoutRatio).toBeNull();
    expect(fundamentals.marketCap).toBeNull();
    await expect(seed.getQuote("XEQT.TO")).rejects.toThrow();
    const gateway = createGateway({
      live: null,
      seed,
      cache: new MemoryCache(),
    });
    const symbols = (await gateway.getExplorer()).map((row) => row.symbol);
    expect(symbols).toContain("RY.TO");
    expect(symbols).not.toContain("XEQT.TO");
    expect(await gateway.getSnapshot("XEQT.TO")).toBeNull();
  });

  it("shows a fund once the cron quote is cached", async () => {
    const cache = new MemoryCache();
    const quote = { ...file.stocks[0].quote, symbol: "XEQT.TO", price: 42.5, marketCap: 8_000_000_000 };
    await cache.set("quote:XEQT.TO", { source: "yahoo", data: quote }, 60);
    await cache.set("history:XEQT.TO", { source: "yahoo", data: file.stocks[0].history }, 60);
    const gateway = createGateway({
      live: null,
      seed: createSeedProvider(file),
      cache,
    });
    const row = (await gateway.getExplorer()).find((item) => item.symbol === "XEQT.TO");
    expect(row?.price).toBe(42.5);
    expect(row?.kind).toBe("fund");
    expect(row?.isSynthetic).toBe(false);
    expect(row?.marketCap).toBe(8_000_000_000);
  });
});
