import { z } from "zod";

export const QuoteSchema = z.object({
  symbol: z.string().min(1),
  price: z.number().positive(),
  change: z.number(),
  changePercent: z.number(),
  previousClose: z.number().positive().nullable(),
  marketCap: z.number().positive().nullable(),
  volume: z.number().nonnegative().nullable(),
  asOf: z.string().min(4),
  fetchedAt: z.string().min(4).optional(),
  delayMinutes: z.number().nonnegative().optional(),
});

export const PricePointSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  close: z.number().positive(),
  volume: z.number().nonnegative().optional(),
});

export const FundamentalsSchema = z.object({
  symbol: z.string().min(1),
  pe: z.number().nullable(),
  epsGrowth: z.number().nullable(),
  roe: z.number().nullable(),
  debtToEquity: z.number().nullable(),
  dividendYield: z.number().nullable(),
  payoutRatio: z.number().nullable(),
  marketCap: z.number().positive().nullable(),
});

export const NewsItemSchema = z.object({
  symbol: z.string().min(1),
  title: z.string().min(1),
  url: z.string().nullable(),
  source: z.string().nullable(),
  publishedAt: z.string().nullable(),
  summary: z.string().nullable(),
});

export const StockSchema = z.object({
  symbol: z.string().min(1),
  name: z.string().min(1),
  sector: z.string().min(1),
  blurb: z.string().min(1),
  currency: z.literal("CAD"),
  exchange: z.literal("TSX"),
});

export const SeedStockSchema = z.object({
  stock: StockSchema,
  quote: QuoteSchema,
  history: z.array(PricePointSchema).min(2),
  fundamentals: FundamentalsSchema,
  news: z.array(NewsItemSchema),
  isSynthetic: z.boolean(),
});

export const SeedFileSchema = z.object({
  generatedAt: z.string(),
  asOf: z.string(),
  source: z.string(),
  stocks: z.array(SeedStockSchema).min(1),
});

export type SeedFile = z.infer<typeof SeedFileSchema>;
export type SeedStock = z.infer<typeof SeedStockSchema>;
