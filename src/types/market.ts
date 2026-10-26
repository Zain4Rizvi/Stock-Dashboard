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
  asOf: string;
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
  isSynthetic: boolean;
  source: DataSource;
  freshness: Freshness;
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
}
