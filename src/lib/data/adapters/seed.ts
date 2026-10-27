import type { SeedFile, SeedStock } from "@/lib/data/schemas";
import { ProviderError, type MarketDataProvider } from "@/lib/data/provider";
import { assertTsxSymbol } from "@/lib/data/symbols";
import type { DataSource, Stock } from "@/types/market";

export interface SeedProvider extends MarketDataProvider {
  origin(symbol: string): { isSynthetic: boolean; source: DataSource; generatedAt: string };
}

function liveSource(source: string): DataSource {
  if (source === "fmp" || source === "twelvedata" || source === "alphavantage" || source === "yahoo") {
    return source;
  }
  return "yahoo";
}

export function createSeedProvider(file: SeedFile): SeedProvider {
  const bySymbol = new Map<string, SeedStock>(file.stocks.map((stock) => [stock.stock.symbol, stock]));

  function row(symbol: string): SeedStock {
    const found = bySymbol.get(assertTsxSymbol(symbol));
    if (!found) throw new ProviderError(`Unknown TSX symbol ${symbol}`, "seed");
    return found;
  }

  return {
    id: "seed",
    async listStocks() {
      return file.stocks.map((stock) => stock.stock);
    },
    async getStock(symbol: string): Promise<Stock | null> {
      try {
        return row(symbol).stock;
      } catch {
        return null;
      }
    },
    async getQuote(symbol: string) {
      return row(symbol).quote;
    },
    async getHistory(symbol: string) {
      return row(symbol).history;
    },
    async getFundamentals(symbol: string) {
      return row(symbol).fundamentals;
    },
    async getNews(symbol: string) {
      return row(symbol).news;
    },
    origin(symbol: string) {
      const generatedAt = file.generatedAt;
      try {
        const found = row(symbol);
        if (found.isSynthetic) return { isSynthetic: true, source: "synthetic" as const, generatedAt };
        return { isSynthetic: false, source: liveSource(file.source), generatedAt };
      } catch {
        return { isSynthetic: true, source: "synthetic" as const, generatedAt };
      }
    },
  };
}
