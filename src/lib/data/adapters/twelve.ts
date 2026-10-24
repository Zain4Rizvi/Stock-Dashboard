import { FundamentalsSchema, PricePointSchema, QuoteSchema } from "@/lib/data/schemas";
import { asNumber, asRecord, decimalToPercent, fetchJson } from "@/lib/data/http";
import { ProviderError, type MarketDataProvider } from "@/lib/data/provider";
import { toTwelveSymbol } from "@/lib/data/symbols";
import type { PricePoint } from "@/types/market";

function key(): string {
  const value = process.env.TWELVE_DATA_API_KEY;
  if (!value) throw new ProviderError("TWELVE_DATA_API_KEY is not set", "twelvedata");
  return value;
}

async function twelveGet(path: string, params: Record<string, string>): Promise<unknown> {
  const query = new URLSearchParams({ ...params, apikey: key() });
  const payload = await fetchJson(`https://api.twelvedata.com/${path}?${query}`, "twelvedata");
  const record = asRecord(payload);
  if (record?.status === "error") {
    throw new ProviderError(String(record.message ?? "Twelve Data error"), "twelvedata");
  }
  return payload;
}

export function createTwelveProvider(): MarketDataProvider {
  return {
    id: "twelvedata",
    async listStocks() {
      return [];
    },
    async getStock() {
      return null;
    },
    async getQuote(symbol: string) {
      const mapped = toTwelveSymbol(symbol);
      const row = asRecord(await twelveGet("quote", { symbol: mapped.symbol, exchange: mapped.exchange }));
      const price = asNumber(row?.close);
      if (!row || price == null || price <= 0) {
        throw new ProviderError(`No quote for ${symbol}`, "twelvedata");
      }
      const previous = asNumber(row.previous_close);
      const change = asNumber(row.change) ?? (previous != null ? price - previous : 0);
      return QuoteSchema.parse({
        symbol: symbol.toUpperCase(),
        price,
        change,
        changePercent: asNumber(row.percent_change) ?? (previous ? (change / previous) * 100 : 0),
        previousClose: previous,
        marketCap: null,
        volume: asNumber(row.volume),
        asOf: typeof row.datetime === "string" ? row.datetime : new Date().toISOString(),
      });
    },
    async getHistory(symbol: string) {
      const mapped = toTwelveSymbol(symbol);
      const payload = asRecord(
        await twelveGet("time_series", {
          symbol: mapped.symbol,
          exchange: mapped.exchange,
          interval: "1day",
          outputsize: "252",
          order: "ASC",
        }),
      );
      const values = Array.isArray(payload?.values) ? payload.values : [];
      const points: PricePoint[] = [];
      for (const row of values) {
        const item = asRecord(row);
        const close = asNumber(item?.close);
        const date = typeof item?.datetime === "string" ? item.datetime.slice(0, 10) : null;
        if (!date || close == null || close <= 0) continue;
        points.push(PricePointSchema.parse({ date, close, volume: asNumber(item?.volume) ?? undefined }));
      }
      points.sort((a, b) => a.date.localeCompare(b.date));
      if (points.length < 20) throw new ProviderError(`Short history for ${symbol}`, "twelvedata");
      return points;
    },
    async getFundamentals(symbol: string) {
      const mapped = toTwelveSymbol(symbol);
      const payload = asRecord(
        await twelveGet("statistics", { symbol: mapped.symbol, exchange: mapped.exchange }),
      );
      const stats = asRecord(payload?.statistics) ?? payload ?? {};
      const valuations = asRecord(stats.valuations_metrics) ?? {};
      const financials = asRecord(stats.financials) ?? {};
      const dividends = asRecord(stats.dividends_and_splits) ?? {};
      const income = asRecord(financials.income_statement) ?? financials;
      const pe = asNumber(valuations.trailing_pe) ?? asNumber(valuations.price_to_earnings_ttm);
      const dividendYield = decimalToPercent(
        asNumber(dividends.trailing_annual_dividend_yield) ?? asNumber(dividends.forward_annual_dividend_yield),
      );
      const payout = decimalToPercent(asNumber(dividends.payout_ratio));
      const roe = decimalToPercent(asNumber(financials.return_on_equity_ttm));
      const epsGrowth = decimalToPercent(asNumber(income.quarterly_earnings_growth_yoy));
      if (pe == null && dividendYield == null && roe == null) {
        throw new ProviderError(`No fundamentals for ${symbol}`, "twelvedata");
      }
      return FundamentalsSchema.parse({
        symbol: symbol.toUpperCase(),
        pe,
        epsGrowth,
        roe,
        debtToEquity: null,
        dividendYield,
        payoutRatio: payout,
        marketCap: asNumber(valuations.market_capitalization),
      });
    },
    async getNews() {
      return [];
    },
  };
}
