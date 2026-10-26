import { createYahooProvider } from "./lib/data/adapters/yahoo";
import { KvCache, type KvBinding } from "./lib/data/cache/kv";
import { refreshCanadaSlice } from "./lib/data/refresh";
import { UNIVERSE } from "./lib/data/seed/universe";

export async function runRefresh(env: { MARKET_KV: KvBinding }): Promise<void> {
  await refreshCanadaSlice({
    cache: new KvCache(env.MARKET_KV),
    yahoo: createYahooProvider(),
    symbols: UNIVERSE.map((company) => company.symbol),
  });
}
