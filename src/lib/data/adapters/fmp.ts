import { FundamentalsSchema, PricePointSchema, QuoteSchema } from "@/lib/data/schemas";
import { asNumber, asRecord, fetchJson } from "@/lib/data/http";
import { ProviderError, type MarketDataProvider } from "@/lib/data/provider";
import { toFmpSymbol } from "@/lib/data/symbols";
import type { PricePoint } from "@/types/market";

function key(): string {
  const value = process.env.FMP_API_KEY;
  if (!value) throw new ProviderError("FMP_API_KEY is not set", "fmp");
  return value;
}

async function fmpGet(stablePath: string, legacyPath: string): Promise<unknown> {
  const apiKey = key();
  try {
    const payload = await fetchJson(
      `https://financialmodelingprep.com/stable${stablePath}${stablePath.includes("?") ? "&" : "?"}apikey=${apiKey}`,
      "fmp",
    );
    const record = asRecord(payload);
    const message = record?.["Error Message"] ?? record?.error;
    if (typeof message === "string") throw new ProviderError(message, "fmp");
    return payload;
  } catch (error) {
    if (error instanceof ProviderError && error.message.startsWith("FMP_API_KEY")) throw error;
    return fetchJson(
      `https://financialmodelingprep.com/api/v3${legacyPath}${legacyPath.includes("?") ? "&" : "?"}apikey=${apiKey}`,
      "fmp",
    );
  }
}

function firstRow(payload: unknown): Record<string, unknown> | null {
  if (Array.isArray(payload)) return asRecord(payload[0]);
  const record = asRecord(payload);
  if (!record) return null;
  if (typeof record["Error Message"] === "string") {
    throw new ProviderError(record["Error Message"], "fmp");
  }
  return record;
}

export function createFmpProvider(): MarketDataProvider {
  return {
    id: "fmp",
    async listStocks() {
      return [];
    },
    async getStock() {
      return null;
    },
    async getQuote(symbol: string) {
      const ticker = toFmpSymbol(symbol);
      const row = firstRow(
        await fmpGet(`/quote?symbol=${encodeURIComponent(ticker)}`, `/quote/${encodeURIComponent(ticker)}`),
      );
      const price = asNumber(row?.price);
      if (!row || price == null || price <= 0) throw new ProviderError(`No quote for ${ticker}`, "fmp");
      const previous = asNumber(row.previousClose);
      const change = asNumber(row.change) ?? (previous != null ? price - previous : 0);
      return QuoteSchema.parse({
        symbol: ticker,
        price,
        change,
        changePercent: asNumber(row.changesPercentage) ?? (previous ? (change / previous) * 100 : 0),
        previousClose: previous,
        marketCap: asNumber(row.marketCap),
        volume: asNumber(row.volume),
        asOf: new Date().toISOString(),
      });
    },
    async getHistory(symbol: string) {
      const ticker = toFmpSymbol(symbol);
      const payload = await fmpGet(
        `/historical-price-full?symbol=${encodeURIComponent(ticker)}`,
        `/historical-price-full/${encodeURIComponent(ticker)}`,
      );
      const record = asRecord(payload);
      const historical = Array.isArray(record?.historical)
        ? record.historical
        : Array.isArray(payload)
          ? payload
          : [];
      const points: PricePoint[] = [];
      for (const row of historical) {
        const item = asRecord(row);
        const close = asNumber(item?.close) ?? asNumber(item?.adjClose);
        const date = typeof item?.date === "string" ? item.date.slice(0, 10) : null;
        if (!date || close == null || close <= 0) continue;
        points.push(PricePointSchema.parse({ date, close, volume: asNumber(item?.volume) ?? undefined }));
      }
      points.sort((a, b) => a.date.localeCompare(b.date));
      const year = points.slice(-252);
      if (year.length < 20) throw new ProviderError(`Short history for ${ticker}`, "fmp");
      return year;
    },
    async getFundamentals(symbol: string) {
      const ticker = toFmpSymbol(symbol);
      const ratios = firstRow(
        await fmpGet(`/ratios-ttm?symbol=${encodeURIComponent(ticker)}`, `/ratios-ttm/${encodeURIComponent(ticker)}`),
      ) ?? {};
      const pe = asNumber(ratios.peRatioTTM) ?? asNumber(ratios.priceToEarningsRatioTTM);
      const payout = asPercent(asNumber(ratios.payoutRatioTTM) ?? asNumber(ratios.dividendPayoutRatioTTM));
      const dividendYield = asPercent(
        asNumber(ratios.dividendYielTTM) ?? asNumber(ratios.dividendYieldTTM) ?? asNumber(ratios.dividendYieldPercentageTTM),
      );
      const roe = asPercent(asNumber(ratios.returnOnEquityTTM));
      const debt = asNumber(ratios.debtEquityRatioTTM);
      if (pe == null && roe == null && dividendYield == null) {
        throw new ProviderError(`No fundamentals for ${ticker}`, "fmp");
      }
      return FundamentalsSchema.parse({
        symbol: ticker,
        pe,
        epsGrowth: null,
        roe,
        debtToEquity: debt,
        dividendYield,
        payoutRatio: payout,
        marketCap: null,
      });
    },
    async getNews() {
      return [];
    },
  };
}

function asPercent(value: number | null): number | null {
  if (value == null) return null;
  if (Math.abs(value) <= 1.5) return Math.round(value * 1000) / 10;
  return value;
}
