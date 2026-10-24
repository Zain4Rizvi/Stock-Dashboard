import { FundamentalsSchema, PricePointSchema, QuoteSchema } from "@/lib/data/schemas";
import { asNumber, asRecord, decimalToPercent, fetchJson } from "@/lib/data/http";
import { ProviderError, type MarketDataProvider } from "@/lib/data/provider";
import { toAlphaSymbol } from "@/lib/data/symbols";
import type { PricePoint } from "@/types/market";

function key(): string {
  const value = process.env.ALPHA_VANTAGE_API_KEY;
  if (!value) throw new ProviderError("ALPHA_VANTAGE_API_KEY is not set", "alphavantage");
  return value;
}

async function alphaGet(params: Record<string, string>): Promise<Record<string, unknown>> {
  const query = new URLSearchParams({ ...params, apikey: key() });
  const payload = asRecord(await fetchJson(`https://www.alphavantage.co/query?${query}`, "alphavantage"));
  if (!payload) throw new ProviderError("Empty response", "alphavantage");
  const note = payload.Note ?? payload.Information ?? payload["Error Message"];
  if (typeof note === "string") throw new ProviderError(note, "alphavantage");
  return payload;
}

export function createAlphaProvider(): MarketDataProvider {
  return {
    id: "alphavantage",
    async listStocks() {
      return [];
    },
    async getStock() {
      return null;
    },
    async getQuote(symbol: string) {
      const ticker = toAlphaSymbol(symbol);
      const payload = await alphaGet({ function: "GLOBAL_QUOTE", symbol: ticker });
      const row = asRecord(payload["Global Quote"]);
      const price = asNumber(row?.["05. price"]);
      if (!row || price == null || price <= 0) throw new ProviderError(`No quote for ${ticker}`, "alphavantage");
      const previous = asNumber(row["08. previous close"]);
      const change = asNumber(row["09. change"]) ?? (previous != null ? price - previous : 0);
      const percentRaw = typeof row["10. change percent"] === "string" ? row["10. change percent"].replace("%", "") : row["10. change percent"];
      return QuoteSchema.parse({
        symbol,
        price,
        change,
        changePercent: asNumber(percentRaw) ?? (previous ? (change / previous) * 100 : 0),
        previousClose: previous,
        marketCap: null,
        volume: asNumber(row["06. volume"]),
        asOf: new Date().toISOString(),
      });
    },
    async getHistory(symbol: string) {
      const ticker = toAlphaSymbol(symbol);
      const payload = await alphaGet({
        function: "TIME_SERIES_DAILY",
        symbol: ticker,
        outputsize: "full",
      });
      const series = asRecord(payload["Time Series (Daily)"]);
      if (!series) throw new ProviderError(`No history for ${ticker}`, "alphavantage");
      const points: PricePoint[] = [];
      for (const [date, value] of Object.entries(series)) {
        const row = asRecord(value);
        const close = asNumber(row?.["4. close"]);
        if (close == null || close <= 0) continue;
        points.push(PricePointSchema.parse({ date, close, volume: asNumber(row?.["5. volume"]) ?? undefined }));
      }
      points.sort((a, b) => a.date.localeCompare(b.date));
      const year = points.slice(-252);
      if (year.length < 20) throw new ProviderError(`Short history for ${ticker}`, "alphavantage");
      return year;
    },
    async getFundamentals(symbol: string) {
      const ticker = toAlphaSymbol(symbol);
      const row = await alphaGet({ function: "OVERVIEW", symbol: ticker });
      if (!row.Symbol && !row.Name) throw new ProviderError(`No fundamentals for ${ticker}`, "alphavantage");
      const pe = asNumber(row.PERatio);
      const epsGrowth = decimalToPercent(asNumber(row.QuarterlyEarningsGrowthYOY));
      const roe = decimalToPercent(asNumber(row.ReturnOnEquityTTM));
      const dividendYield = decimalToPercent(asNumber(row.DividendYield));
      const payout = decimalToPercent(asNumber(row.PayoutRatio));
      if (pe == null && roe == null && dividendYield == null && epsGrowth == null) {
        throw new ProviderError(`Overview had no usable ratios for ${ticker}`, "alphavantage");
      }
      return FundamentalsSchema.parse({
        symbol,
        pe,
        epsGrowth,
        roe,
        debtToEquity: null,
        dividendYield,
        payoutRatio: payout,
        marketCap: asNumber(row.MarketCapitalization),
      });
    },
    async getNews() {
      return [];
    },
  };
}
