import { writeFileSync } from "node:fs";
import { createYahooProvider } from "../src/lib/data/adapters/yahoo";
import { KvCache, type KvBinding } from "../src/lib/data/cache/kv";
import type { MarketDataProvider } from "../src/lib/data/provider";
import { refreshCanadaSlice, refreshCursorKey } from "../src/lib/data/refresh";
import { UNIVERSE } from "../src/lib/data/seed/universe";

class MemKv implements KvBinding {
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

function paced(inner: MarketDataProvider, ms: number): MarketDataProvider {
  let chain = Promise.resolve();
  const gate = () => {
    const run = chain.then(() => new Promise((resolve) => setTimeout(resolve, ms)));
    chain = run.then(() => undefined, () => undefined);
    return run;
  };
  return {
    ...inner,
    async getQuote(symbol) {
      await gate();
      return inner.getQuote(symbol);
    },
    async getHistory(symbol) {
      await gate();
      return inner.getHistory(symbol);
    },
    async getFundamentals(symbol) {
      await gate();
      return inner.getFundamentals(symbol);
    },
  };
}

async function main(): Promise<void> {
  const kv = new MemKv();
  const cache = new KvCache(kv);
  const yahoo = paced(createYahooProvider(), 200);
  const symbols = UNIVERSE.map((company) => company.symbol);
  const failed = new Set<string>();

  for (let pass = 0; pass < 2; pass += 1) {
    if (pass === 1) {
      if (failed.size === 0) break;
      await cache.delete(refreshCursorKey(new Date().toISOString().slice(0, 10)));
    }
    const pending = pass === 0 ? symbols : [...failed];
    failed.clear();
    for (;;) {
      const result = await refreshCanadaSlice({ cache, yahoo, symbols: pending });
      console.log(`pass ${pass}: refreshed ${result.refreshed.length}, failed ${result.failed.length}`);
      for (const symbol of result.failed) failed.add(symbol);
      if (result.refreshed.length + result.failed.length === 0) break;
    }
  }

  const pairs = [...kv.store.entries()]
    .filter(([key]) => !key.startsWith("refresh:cursor:"))
    .map(([key, value]) => ({ key, value }));
  writeFileSync(".tmp/kv-bulk.json", JSON.stringify(pairs));
  console.log(`wrote ${pairs.length} keys, still failed: ${[...failed].join(", ") || "none"}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
