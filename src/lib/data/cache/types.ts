export interface Cache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
}

export const TTL = {
  quote: 15 * 60,
  history: 6 * 60 * 60,
  fundamentals: 24 * 60 * 60,
  news: 60 * 60,
} as const;
