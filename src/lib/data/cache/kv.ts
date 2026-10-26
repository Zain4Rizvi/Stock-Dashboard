import type { Cache } from "./types";

/** The slice of Workers KV this app uses. */
export interface KvBinding {
  get(key: string, type: "json"): Promise<unknown>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

interface Envelope {
  expires: number;
  value: unknown;
}

const SLOT = "__mapleMarketKv";

export function bindMarketKv(kv: KvBinding): void {
  (globalThis as Record<string, unknown>)[SLOT] = kv;
}

export function boundMarketKv(): KvBinding | null {
  const kv = (globalThis as Record<string, unknown>)[SLOT];
  if (!kv || typeof kv !== "object") return null;
  return kv as KvBinding;
}

export class KvCache implements Cache {
  constructor(
    private readonly kv: KvBinding,
    private readonly now: () => number = Date.now,
  ) {}

  async get<T>(key: string): Promise<T | null> {
    const parsed = (await this.kv.get(key, "json")) as Envelope | null;
    if (!parsed || typeof parsed.expires !== "number") return null;
    if (parsed.expires <= this.now()) {
      await this.kv.delete(key);
      return null;
    }
    return parsed.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const ttl = Math.max(60, Math.ceil(ttlSeconds));
    const envelope: Envelope = { expires: this.now() + ttl * 1000, value };
    await this.kv.put(key, JSON.stringify(envelope), { expirationTtl: ttl });
  }

  async delete(key: string): Promise<void> {
    await this.kv.delete(key);
  }
}
