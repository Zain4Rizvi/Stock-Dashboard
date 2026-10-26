import handler from "./.open-next/worker.js";
import { runRefresh } from "./src/cron-entry";
import type { KvBinding } from "./src/lib/data/cache/kv";

const worker = {
  fetch: handler.fetch,
  async scheduled(_event: unknown, env: { MARKET_KV: KvBinding }, ctx: { waitUntil(promise: Promise<unknown>): void }) {
    ctx.waitUntil(runRefresh(env));
  },
};

export default worker;
