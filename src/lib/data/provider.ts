import type {
  Fundamentals,
  NewsItem,
  PricePoint,
  Quote,
  Stock,
} from "@/types/market";

export interface MarketDataProvider {
  readonly id: string;
  listStocks(): Promise<Stock[]>;
  getStock(symbol: string): Promise<Stock | null>;
  getQuote(symbol: string): Promise<Quote>;
  getHistory(symbol: string): Promise<PricePoint[]>;
  getFundamentals(symbol: string, known?: Quote): Promise<Fundamentals>;
  getNews(symbol: string): Promise<NewsItem[]>;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly provider: string,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
