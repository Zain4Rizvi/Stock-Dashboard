import {
  FundamentalsSchema,
  NewsItemSchema,
  PricePointSchema,
  QuoteSchema,
} from "@/lib/data/schemas";
import { asNumber, asRecord } from "@/lib/data/http";
import { ProviderError, type MarketDataProvider } from "@/lib/data/provider";
import { toYahooSymbol } from "@/lib/data/symbols";
import type { NewsItem, PricePoint, Quote } from "@/types/market";

/**
 * Unofficial Yahoo Finance adapter for development only.
 * yahoo-finance2 is not a licensed market-data vendor. Do not ship this as production data.
 */

interface YahooClient {
  quote(symbol: string): Promise<unknown>;
  chart(symbol: string, options: Record<string, unknown>): Promise<unknown>;
  quoteSummary(symbol: string, options: { modules: string[] }): Promise<unknown>;
  search?(symbol: string, options?: Record<string, unknown>): Promise<unknown>;
}

let clientPromise: Promise<YahooClient> | null = null;

async function yahooClient(): Promise<YahooClient> {
  if (!clientPromise) {
    clientPromise = import("yahoo-finance2").then((mod) => {
      const exported = (mod as { default?: unknown }).default ?? mod;
      if (typeof exported === "function") {
        try {
          const instance = new (exported as new (options?: unknown) => YahooClient)({
            suppressNotices: ["yahooSurvey"],
          });
          if (instance && typeof instance.quote === "function") return instance;
        } catch {
          const callable = exported as unknown as YahooClient;
          if (typeof callable.quote === "function") return callable;
        }
      }
      const objectClient = exported as unknown as YahooClient;
      if (objectClient && typeof objectClient.quote === "function") return objectClient;
      throw new ProviderError("yahoo-finance2 did not expose quote()", "yahoo");
    });
  }
  return clientPromise;
}

function marketTimeIso(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(value > 1e12 ? value : value * 1000);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  if (typeof value === "string" && value.trim()) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  return null;
}

/** asOf is regularMarketTime when Yahoo sends it. Fetch time stays on fetchedAt. */
export function quoteClock(
  raw: Record<string, unknown>,
  fetchedAt: Date,
): { asOf: string; fetchedAt?: string; delayMinutes?: number } {
  const asOf = marketTimeIso(raw.regularMarketTime);
  const delay = asNumber(raw.exchangeDataDelayedBy);
  const delayMinutes = delay == null || delay < 0 ? undefined : delay;
  if (asOf) {
    return delayMinutes == null
      ? { asOf, fetchedAt: fetchedAt.toISOString() }
      : { asOf, fetchedAt: fetchedAt.toISOString(), delayMinutes };
  }
  return delayMinutes == null ? { asOf: fetchedAt.toISOString() } : { asOf: fetchedAt.toISOString(), delayMinutes };
}

function yearAgo(): Date {
  const date = new Date();
  date.setUTCFullYear(date.getUTCFullYear() - 1);
  return date;
}

export function createYahooProvider(): MarketDataProvider {
  return {
    id: "yahoo",
    async listStocks() {
      return [];
    },
    async getStock() {
      return null;
    },
    async getQuote(symbol: string) {
      const ticker = toYahooSymbol(symbol);
      const yahoo = await yahooClient();
      const raw = asRecord(await yahoo.quote(ticker));
      const price = asNumber(raw?.regularMarketPrice);
      if (!raw || price == null || price <= 0) {
        throw new ProviderError(`No quote for ${ticker}`, "yahoo");
      }
      const previous = asNumber(raw.regularMarketPreviousClose);
      const change = asNumber(raw.regularMarketChange) ?? (previous != null ? price - previous : 0);
      const changePercent =
        asNumber(raw.regularMarketChangePercent) ??
        (previous ? (change / previous) * 100 : 0);
      return QuoteSchema.parse({
        symbol: ticker,
        price,
        change,
        changePercent,
        previousClose: previous,
        marketCap: asNumber(raw.marketCap),
        volume: asNumber(raw.regularMarketVolume),
        ...quoteClock(raw, new Date()),
      });
    },
    async getHistory(symbol: string) {
      const ticker = toYahooSymbol(symbol);
      const yahoo = await yahooClient();
      const raw = await yahoo.chart(ticker, { period1: yearAgo(), interval: "1d" });
      const points = readChart(raw, ticker);
      if (points.length < 20) throw new ProviderError(`Short history for ${ticker}`, "yahoo");
      return points.map((point) => PricePointSchema.parse(point));
    },
    async getFundamentals(symbol: string, known?: Quote) {
      const ticker = toYahooSymbol(symbol);
      const yahoo = await yahooClient();
      const summary = asRecord(
        await yahoo.quoteSummary(ticker, {
          modules: ["defaultKeyStatistics", "financialData", "summaryDetail"],
        }),
      );
      const stats = asRecord(summary?.defaultKeyStatistics) ?? {};
      const financial = asRecord(summary?.financialData) ?? {};
      const detail = asRecord(summary?.summaryDetail) ?? {};
      const quote: Record<string, unknown> = known
        ? { marketCap: known.marketCap }
        : (asRecord(await yahoo.quote(ticker)) ?? {});
      const pe = asNumber(detail.trailingPE) ?? asNumber(quote.trailingPE) ?? asNumber(stats.trailingPE);
      const epsGrowth =
        percentFromRatio(asNumber(financial.earningsGrowth) ?? asNumber(stats.earningsQuarterlyGrowth));
      const roe = percentFromRatio(asNumber(financial.returnOnEquity));
      const debtToEquity = asNumber(financial.debtToEquity);
      const dividendYield = yieldFromYahoo(asNumber(detail.dividendYield) ?? asNumber(quote.trailingAnnualDividendYield));
      const payout = percentFromRatio(asNumber(detail.payoutRatio) ?? asNumber(stats.payoutRatio));
      const marketCap = asNumber(detail.marketCap) ?? asNumber(quote.marketCap);
      if (pe == null && roe == null && dividendYield == null && epsGrowth == null) {
        throw new ProviderError(`No fundamentals for ${ticker}`, "yahoo");
      }
      return FundamentalsSchema.parse({
        symbol: ticker,
        pe,
        epsGrowth,
        roe,
        debtToEquity: debtToEquity == null ? null : debtToEquity > 20 ? debtToEquity / 100 : debtToEquity,
        dividendYield,
        payoutRatio: payout,
        marketCap,
      });
    },
    async getNews(symbol: string) {
      const ticker = toYahooSymbol(symbol);
      const yahoo = await yahooClient();
      if (!yahoo.search) return [];
      try {
        const raw = asRecord(await yahoo.search(ticker, { newsCount: 6, quotesCount: 0 }));
        const items = Array.isArray(raw?.news) ? raw.news : [];
        const news: NewsItem[] = [];
        for (const item of items) {
          const record = asRecord(item);
          if (!record) continue;
          const title = typeof record.title === "string" ? record.title : null;
          if (!title) continue;
          const published = record.providerPublishTime;
          const publishedAt =
            published instanceof Date
              ? published.toISOString()
              : typeof published === "number"
                ? new Date(published > 1e12 ? published : published * 1000).toISOString()
                : null;
          const parsed = NewsItemSchema.safeParse({
            symbol: ticker,
            title,
            url: typeof record.url === "string" ? record.url : typeof record.link === "string" ? record.link : null,
            source: typeof record.publisher === "string" ? record.publisher : null,
            publishedAt,
            summary: null,
          });
          if (parsed.success) news.push(parsed.data);
        }
        return news;
      } catch {
        return [];
      }
    },
  };
}

function percentFromRatio(value: number | null): number | null {
  if (value == null) return null;
  if (Math.abs(value) <= 1.5) return Math.round(value * 1000) / 10;
  return value;
}

function yieldFromYahoo(value: number | null): number | null {
  if (value == null) return null;
  const percent = Math.abs(value) <= 1 ? value * 100 : value;
  return Math.round(percent * 100) / 100;
}

function readChart(raw: unknown, symbol: string): PricePoint[] {
  const record = asRecord(raw);
  const quotes = Array.isArray(record?.quotes) ? record.quotes : [];
  const points: PricePoint[] = [];
  for (const row of quotes) {
    const item = asRecord(row);
    const close = asNumber(item?.close) ?? asNumber(item?.adjclose);
    const dateValue = item?.date;
    const date =
      dateValue instanceof Date
        ? dateValue.toISOString().slice(0, 10)
        : typeof dateValue === "string"
          ? dateValue.slice(0, 10)
          : null;
    if (!date || close == null || close <= 0) continue;
    points.push({
      date,
      close: Math.round(close * 100) / 100,
      volume: asNumber(item?.volume) ?? undefined,
    });
  }
  if (points.length > 0) return points;

  const result = asRecord(Array.isArray(asRecord(raw)?.chart) ? null : asRecord(asRecord(raw)?.chart)?.result);
  void symbol;
  void result;
  return points;
}
