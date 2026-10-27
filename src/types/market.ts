/** Percent fields on fundamentals are already in percent: 3.5 means 3.5%, not 0.035. */

export type DataSource =
  | "synthetic"
  | "yahoo"
  | "fmp"
  | "twelvedata"
  | "alphavantage";

export interface Stock {
  symbol: string;
  name: string;
  sector: string;
  blurb: string;
  currency: "CAD";
  exchange: "TSX";
}

export interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number | null;
  marketCap: number | null;
  volume: number | null;
  /** Exchange time when Yahoo sent regularMarketTime. Otherwise the fetch time. */
  asOf: string;
  /** Cron clock. Present only when asOf is the exchange time. */
  fetchedAt?: string;
  /** Yahoo exchangeDataDelayedBy, in minutes. Omitted when Yahoo does not send it. */
  delayMinutes?: number;
}

export interface PricePoint {
  date: string;
  close: number;
  volume?: number;
}

export interface Fundamentals {
  symbol: string;
  pe: number | null;
  epsGrowth: number | null;
  roe: number | null;
  debtToEquity: number | null;
  dividendYield: number | null;
  payoutRatio: number | null;
  marketCap: number | null;
}

export interface NewsItem {
  symbol: string;
  title: string;
  url: string | null;
  source: string | null;
  publishedAt: string | null;
  summary: string | null;
}

export type Freshness = "demo" | "snapshot" | "live";

export interface ExplorerItem {
  symbol: string;
  name: string;
  sector: string;
  blurb: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: number;
  pe: number | null;
  dividendYield: number | null;
  roe: number | null;
  epsGrowth: number | null;
  debtToEquity: number | null;
  payoutRatio: number | null;
  oneYearReturn: number | null;
  /** Quote timestamp. The badge shows this date. */
  asOf: string;
  /** Present when asOf came from the exchange clock. */
  fetchedAt?: string;
  isSynthetic: boolean;
  source: DataSource;
  freshness: Freshness;
  /** Cache miss served the committed seed instead of a cron quote. */
  fallback?: boolean;
  /** Seed file generatedAt. Set only when fallback is true. */
  generatedAt?: string;
}

export interface Snapshot {
  stock: Stock;
  quote: Quote;
  history: PricePoint[];
  fundamentals: Fundamentals;
  news: NewsItem[];
  isSynthetic: boolean;
  source: DataSource;
  freshness: Freshness;
  /** Cache miss served the committed seed instead of a cron quote. */
  fallback?: boolean;
  /** Seed file generatedAt. Set only when fallback is true. */
  generatedAt?: string;
}
