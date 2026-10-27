import type { SeedFile, SeedStock } from "@/lib/data/schemas";
import { ProviderError, type MarketDataProvider } from "@/lib/data/provider";
import { UNIVERSE, type UniverseCompany } from "@/lib/data/seed/universe";
import { assertTsxSymbol } from "@/lib/data/symbols";
import type { DataSource, Fundamentals, Stock } from "@/types/market";

export interface SeedProvider extends MarketDataProvider {
  origin(symbol: string): { isSynthetic: boolean; source: DataSource; generatedAt: string };
}

const byUniverse = new Map<string, UniverseCompany>(UNIVERSE.map((company) => [company.symbol, company]));

function liveSource(source: string): DataSource {
  if (source === "fmp" || source === "twelvedata" || source === "alphavantage" || source === "yahoo") {
    return source;
  }
  return "yahoo";
}

function withKind(stock: SeedStock["stock"]): Stock {
  return {
    symbol: stock.symbol,
    name: stock.name,
    sector: stock.sector,
    blurb: stock.blurb,
    currency: stock.currency,
    exchange: stock.exchange,
    kind: stock.kind ?? byUniverse.get(stock.symbol)?.kind ?? "company",
  };
}

function stockFromUniverse(company: UniverseCompany): Stock {
  return {
    symbol: company.symbol,
    name: company.name,
    sector: company.sector,
    blurb: company.blurb,
    currency: "CAD",
    exchange: "TSX",
    kind: company.kind ?? "company",
  };
}

function blankFundamentals(symbol: string): Fundamentals {
  return {
    symbol,
    pe: null,
    epsGrowth: null,
    roe: null,
    debtToEquity: null,
    dividendYield: null,
    payoutRatio: null,
    marketCap: null,
  };
}

export function createSeedProvider(file: SeedFile): SeedProvider {
  const bySymbol = new Map<string, SeedStock>(file.stocks.map((stock) => [stock.stock.symbol, stock]));

  function normalized(symbol: string): string {
    return assertTsxSymbol(symbol);
  }

  function listedFund(symbol: string): UniverseCompany | null {
    const company = byUniverse.get(symbol);
    if (!company || company.kind !== "fund" || bySymbol.has(symbol)) return null;
    return company;
  }

  return {
    id: "seed",
    async listStocks() {
      const stocks = file.stocks.map((stock) => withKind(stock.stock));
      const seen = new Set(stocks.map((stock) => stock.symbol));
      for (const company of UNIVERSE) {
        if (company.kind !== "fund" || seen.has(company.symbol)) continue;
        stocks.push(stockFromUniverse(company));
      }
      return stocks;
    },
    async getStock(symbol: string): Promise<Stock | null> {
      try {
        const key = normalized(symbol);
        const found = bySymbol.get(key);
        if (found) return withKind(found.stock);
        const fund = listedFund(key);
        return fund ? stockFromUniverse(fund) : null;
      } catch {
        return null;
      }
    },
    async getQuote(symbol: string) {
      const key = normalized(symbol);
      const found = bySymbol.get(key);
      if (!found) throw new ProviderError(`No quote for ${key}`, "seed");
      return found.quote;
    },
    async getHistory(symbol: string) {
      const key = normalized(symbol);
      const found = bySymbol.get(key);
      if (found) return found.history;
      if (listedFund(key)) return [];
      throw new ProviderError(`Unknown TSX symbol ${key}`, "seed");
    },
    async getFundamentals(symbol: string) {
      const key = normalized(symbol);
      const found = bySymbol.get(key);
      if (found) return found.fundamentals;
      if (listedFund(key)) return blankFundamentals(key);
      throw new ProviderError(`Unknown TSX symbol ${key}`, "seed");
    },
    async getNews(symbol: string) {
      const key = normalized(symbol);
      const found = bySymbol.get(key);
      if (found) return found.news;
      if (listedFund(key)) return [];
      throw new ProviderError(`Unknown TSX symbol ${key}`, "seed");
    },
    origin(symbol: string) {
      const generatedAt = file.generatedAt;
      try {
        const key = normalized(symbol);
        const found = bySymbol.get(key);
        if (!found) {
          if (listedFund(key)) return { isSynthetic: false, source: "yahoo" as const, generatedAt };
          return { isSynthetic: true, source: "synthetic" as const, generatedAt };
        }
        if (found.isSynthetic) return { isSynthetic: true, source: "synthetic" as const, generatedAt };
        return { isSynthetic: false, source: liveSource(file.source), generatedAt };
      } catch {
        return { isSynthetic: true, source: "synthetic" as const, generatedAt };
      }
    },
  };
}
