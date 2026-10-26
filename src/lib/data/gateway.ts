import type { Cache } from "@/lib/data/cache/types";
import { TTL } from "@/lib/data/cache/types";
import type { SeedProvider } from "@/lib/data/adapters/seed";
import type { MarketDataProvider } from "@/lib/data/provider";
import { RateLimiter } from "@/lib/data/ratelimit";
import { oneYearReturn } from "@/lib/finance/returns";
import type {
  DataSource,
  ExplorerItem,
  Fundamentals,
  NewsItem,
  PricePoint,
  Quote,
  Snapshot,
  Stock,
} from "@/types/market";

interface CachedValue<T> {
  source: DataSource;
  data: T;
}

export interface MarketGateway {
  getExplorer(): Promise<ExplorerItem[]>;
  getSnapshot(symbol: string, options?: { refresh?: boolean }): Promise<Snapshot | null>;
}

async function readThrough<T>(input: {
  key: string;
  ttl: number;
  refresh: boolean;
  live: MarketDataProvider | null;
  rates: RateLimiter;
  cache: Cache;
  fetchLive: () => Promise<T>;
  fallback: () => Promise<T>;
  fallbackSource: DataSource;
  fallbackSynthetic: boolean;
}): Promise<{ data: T; source: DataSource; isSynthetic: boolean }> {
  if (!input.refresh) {
    const cached = await input.cache.get<CachedValue<T>>(input.key);
    if (cached) return { data: cached.data, source: cached.source, isSynthetic: cached.source === "synthetic" };
    const seeded = await input.fallback();
    return { data: seeded, source: input.fallbackSource, isSynthetic: input.fallbackSynthetic };
  }

  const cached = await input.cache.get<CachedValue<T>>(input.key);
  if (cached && cached.source !== "synthetic") {
    return { data: cached.data, source: cached.source, isSynthetic: false };
  }

  if (input.live && (await input.rates.take(input.live.id))) {
    try {
      const data = await input.fetchLive();
      const source = input.live.id as DataSource;
      await input.cache.set(input.key, { source, data } satisfies CachedValue<T>, input.ttl);
      return { data, source, isSynthetic: false };
    } catch {
      /* live providers fail closed into cache or seed */
    }
  }

  if (cached) return { data: cached.data, source: cached.source, isSynthetic: cached.source === "synthetic" };
  const seeded = await input.fallback();
  return { data: seeded, source: input.fallbackSource, isSynthetic: input.fallbackSynthetic };
}

export function createGateway(deps: {
  live: MarketDataProvider | null;
  seed: SeedProvider;
  cache: Cache;
  rates?: RateLimiter;
}): MarketGateway {
  const rates = deps.rates ?? new RateLimiter(deps.cache);

  async function loadParts(symbol: string, refresh: boolean) {
    const stock = await deps.seed.getStock(symbol);
    if (!stock) return null;
    const origin = deps.seed.origin(stock.symbol);
    const quote = await readThrough<Quote>({
      key: `quote:${stock.symbol}`,
      ttl: TTL.quote,
      refresh,
      live: deps.live,
      rates,
      cache: deps.cache,
      fetchLive: () => deps.live!.getQuote(stock.symbol),
      fallback: () => deps.seed.getQuote(stock.symbol),
      fallbackSource: origin.source,
      fallbackSynthetic: origin.isSynthetic,
    });
    const history = await readThrough<PricePoint[]>({
      key: `history:${stock.symbol}`,
      ttl: TTL.history,
      refresh,
      live: deps.live,
      rates,
      cache: deps.cache,
      fetchLive: () => deps.live!.getHistory(stock.symbol),
      fallback: () => deps.seed.getHistory(stock.symbol),
      fallbackSource: origin.source,
      fallbackSynthetic: origin.isSynthetic,
    });
    const fundamentals = await readThrough<Fundamentals>({
      key: `fundamentals:${stock.symbol}`,
      ttl: TTL.fundamentals,
      refresh,
      live: deps.live,
      rates,
      cache: deps.cache,
      fetchLive: () => deps.live!.getFundamentals(stock.symbol),
      fallback: () => deps.seed.getFundamentals(stock.symbol),
      fallbackSource: origin.source,
      fallbackSynthetic: origin.isSynthetic,
    });
    const news = await readThrough<NewsItem[]>({
      key: `news:${stock.symbol}`,
      ttl: TTL.news,
      refresh,
      live: deps.live,
      rates,
      cache: deps.cache,
      fetchLive: () => deps.live!.getNews(stock.symbol),
      fallback: () => deps.seed.getNews(stock.symbol),
      fallbackSource: origin.source,
      fallbackSynthetic: origin.isSynthetic,
    });
    return { stock, quote, history, fundamentals, news };
  }

  return {
    async getExplorer() {
      const stocks = await deps.seed.listStocks();
      const rows = await Promise.all(
        stocks.map(async (stock) => {
          const parts = await loadParts(stock.symbol, false);
          if (!parts) return null;
          return toExplorer(
            parts.stock,
            parts.quote.data,
            parts.fundamentals.data,
            parts.history.data,
            parts.quote.isSynthetic,
            parts.quote.source,
            parts.quote.isSynthetic ? "demo" : "snapshot",
          );
        }),
      );
      return rows.filter((row): row is ExplorerItem => row != null);
    },
    async getSnapshot(symbol: string, options?: { refresh?: boolean }) {
      const refresh = options?.refresh ?? false;
      const parts = await loadParts(symbol, refresh);
      if (!parts) return null;
      const marketCap = parts.quote.data.marketCap ?? parts.fundamentals.data.marketCap;
      const quote = marketCap == null ? parts.quote.data : { ...parts.quote.data, marketCap: parts.quote.data.marketCap ?? marketCap };
      const synthetic = parts.quote.isSynthetic || parts.history.isSynthetic || parts.fundamentals.isSynthetic;
      return {
        stock: parts.stock,
        quote,
        history: parts.history.data,
        fundamentals: {
          ...parts.fundamentals.data,
          marketCap: parts.fundamentals.data.marketCap ?? marketCap,
        },
        news: parts.news.data,
        isSynthetic: synthetic,
        source: parts.quote.source,
        freshness: synthetic ? "demo" : refresh ? "live" : "snapshot",
      } satisfies Snapshot;
    },
  };
}

function toExplorer(
  stock: Stock,
  quote: Quote,
  fundamentals: Fundamentals,
  history: PricePoint[],
  isSynthetic: boolean,
  source: DataSource,
  freshness: ExplorerItem["freshness"],
): ExplorerItem {
  return {
    symbol: stock.symbol,
    name: stock.name,
    sector: stock.sector,
    blurb: stock.blurb,
    price: quote.price,
    change: quote.change,
    changePercent: quote.changePercent,
    marketCap: quote.marketCap ?? fundamentals.marketCap ?? 1,
    pe: fundamentals.pe,
    dividendYield: fundamentals.dividendYield,
    roe: fundamentals.roe,
    epsGrowth: fundamentals.epsGrowth,
    debtToEquity: fundamentals.debtToEquity,
    payoutRatio: fundamentals.payoutRatio,
    oneYearReturn: oneYearReturn(history),
    asOf: quote.asOf,
    isSynthetic,
    source,
    freshness,
  };
}
