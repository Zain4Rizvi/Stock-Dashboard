import path from "node:path";
import { FileCache } from "./file";
import { boundMarketKv, KvCache } from "./kv";
import { MemoryCache } from "./memory";
import type { Cache } from "./types";

class TieredCache implements Cache {
  constructor(
    private readonly memory: Cache,
    private readonly file: Cache,
  ) {}

  async get<T>(key: string): Promise<T | null> {
    const hot = await this.memory.get<T>(key);
    if (hot !== null) return hot;
    const cold = await this.file.get<T>(key);
    if (cold !== null) await this.memory.set(key, cold, 60);
    return cold;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await this.memory.set(key, value, ttlSeconds);
    await this.file.set(key, value, ttlSeconds);
  }

  async delete(key: string): Promise<void> {
    await this.memory.delete(key);
    await this.file.delete(key);
  }
}

/** Uses KV once the Worker has bound it, otherwise the local file cache. */
export class PreferKvCache implements Cache {
  constructor(private readonly fallback: Cache) {}

  private current(): Cache {
    const kv = boundMarketKv();
    return kv ? new KvCache(kv) : this.fallback;
  }

  async get<T>(key: string): Promise<T | null> {
    return this.current().get<T>(key);
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    return this.current().set(key, value, ttlSeconds);
  }

  async delete(key: string): Promise<void> {
    return this.current().delete(key);
  }
}

export function createCache(driver = process.env.CACHE_DRIVER ?? "file"): Cache {
  if (driver === "memory") return new MemoryCache();
  if (driver === "kv") return new PreferKvCache(new MemoryCache());
  return new TieredCache(new MemoryCache(), new FileCache(path.join(process.cwd(), ".cache", "market")));
}

export { FileCache, MemoryCache };
export type { Cache } from "./types";
export { TTL } from "./types";
