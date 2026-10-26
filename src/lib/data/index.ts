import "server-only";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createAlphaProvider } from "./adapters/alpha";
import { createFmpProvider } from "./adapters/fmp";
import { createSeedProvider } from "./adapters/seed";
import { createTwelveProvider } from "./adapters/twelve";
import { createYahooProvider } from "./adapters/yahoo";
import { createCache, PreferKvCache } from "./cache";
import { bindMarketKv, boundMarketKv, type KvBinding } from "./cache/kv";
import { createGateway, type MarketGateway } from "./gateway";
import type { MarketDataProvider } from "./provider";
import { SeedFileSchema, type SeedFile } from "./schemas";
import { seedFilePath } from "./seed-path";
import { buildSyntheticSeed } from "./seed/synthetic";

export function loadSeedFile(): SeedFile {
  const file = seedFilePath();
  if (existsSync(file)) {
    return SeedFileSchema.parse(JSON.parse(readFileSync(file, "utf8")));
  }
  const synthetic = buildSyntheticSeed();
  try {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(synthetic));
  } catch {
    /* A read-only disk can still serve the in-memory snapshot. */
  }
  return synthetic;
}

export function createLiveProvider(): MarketDataProvider | null {
  const id = process.env.MARKET_DATA_PROVIDER ?? "seed";
  if (id === "seed") return null;
  if (id === "yahoo") return createYahooProvider();
  if (id === "fmp") return process.env.FMP_API_KEY ? createFmpProvider() : null;
  if (id === "twelvedata") return process.env.TWELVE_DATA_API_KEY ? createTwelveProvider() : null;
  if (id === "alphavantage") return process.env.ALPHA_VANTAGE_API_KEY ? createAlphaProvider() : null;
  console.error(`Unknown MARKET_DATA_PROVIDER "${id}". Using the seed snapshot.`);
  return null;
}

let gateway: MarketGateway | null = null;

/** A failed bind is not remembered. Build-time static params run before a request has KV. */
async function attachKv(): Promise<void> {
  if (process.env.CACHE_DRIVER !== "kv" || boundMarketKv()) return;
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = await getCloudflareContext({ async: true });
    const kv = (env as { MARKET_KV?: KvBinding }).MARKET_KV;
    if (kv) bindMarketKv(kv);
  } catch {
    /* next dev, tests, and generateStaticParams have no Worker context. */
  }
}

export async function getGateway(): Promise<MarketGateway> {
  await attachKv();
  if (!gateway) {
    gateway = createGateway({
      live: createLiveProvider(),
      seed: createSeedProvider(loadSeedFile()),
      cache: new PreferKvCache(createCache(process.env.CACHE_DRIVER === "kv" ? "memory" : undefined)),
    });
  }
  return gateway;
}

export function liveDataEnabled(): boolean {
  return (process.env.MARKET_DATA_PROVIDER ?? "seed") !== "seed";
}
