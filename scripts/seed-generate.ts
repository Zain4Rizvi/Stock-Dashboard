import { writeFileSync } from "node:fs";
import { createAlphaProvider } from "../src/lib/data/adapters/alpha";
import { createFmpProvider } from "../src/lib/data/adapters/fmp";
import { createTwelveProvider } from "../src/lib/data/adapters/twelve";
import { createYahooProvider } from "../src/lib/data/adapters/yahoo";
import type { MarketDataProvider } from "../src/lib/data/provider";
import type { SeedFile } from "../src/lib/data/schemas";
import { seedFilePath } from "../src/lib/data/seed-path";
import { buildSyntheticSeed } from "../src/lib/data/seed/synthetic";
import { UNIVERSE } from "../src/lib/data/seed/universe";
import type { Fundamentals, NewsItem, PricePoint, Quote } from "../src/types/market";
import { loadEnvFiles } from "./load-env";

loadEnvFiles();

function selectedProvider(): MarketDataProvider | null {
  const id = process.env.MARKET_DATA_PROVIDER ?? "seed";
  if (id === "seed") return null;
  if (id === "yahoo") return createYahooProvider();
  if (id === "fmp" && process.env.FMP_API_KEY) return createFmpProvider();
  if (id === "twelvedata" && process.env.TWELVE_DATA_API_KEY) return createTwelveProvider();
  if (id === "alphavantage" && process.env.ALPHA_VANTAGE_API_KEY) return createAlphaProvider();
  console.warn(`No usable credentials for MARKET_DATA_PROVIDER=${id}. Writing a synthetic snapshot.`);
  return null;
}

async function main(): Promise<void> {
  const synthetic = buildSyntheticSeed();
  const live = selectedProvider();
  if (!live) {
    write(synthetic, synthetic.stocks.length, 0);
    return;
  }

  let liveCount = 0;
  const stocks = [];
  for (const company of UNIVERSE) {
    const fallback = synthetic.stocks.find((stock) => stock.stock.symbol === company.symbol)!;
    try {
      const quote: Quote = await live.getQuote(company.symbol);
      const history: PricePoint[] = await live.getHistory(company.symbol);
      let fundamentals: Fundamentals = fallback.fundamentals;
      try {
        fundamentals = await live.getFundamentals(company.symbol);
      } catch (error) {
        console.warn(`fundamentals ${company.symbol}: ${error instanceof Error ? error.message : error}`);
      }
      let news: NewsItem[] = [];
      try {
        news = await live.getNews(company.symbol);
      } catch {
        news = [];
      }
      stocks.push({
        stock: fallback.stock,
        quote: { ...quote, symbol: company.symbol, marketCap: quote.marketCap ?? fallback.quote.marketCap },
        history,
        fundamentals: {
          ...fallback.fundamentals,
          ...stripNulls(fundamentals),
          symbol: company.symbol,
          marketCap: fundamentals.marketCap ?? fallback.fundamentals.marketCap,
        },
        news,
        isSynthetic: false,
      });
      liveCount += 1;
      console.log(`live ${company.symbol}`);
    } catch (error) {
      console.warn(`seed ${company.symbol}: ${error instanceof Error ? error.message : error}`);
      stocks.push(fallback);
    }
    await new Promise((resolve) => setTimeout(resolve, 350));
  }

  const file: SeedFile = {
    generatedAt: new Date().toISOString(),
    asOf: new Date().toISOString().slice(0, 10),
    source: liveCount === stocks.length ? live.id : "mixed",
    stocks,
  };
  write(file, stocks.length - liveCount, liveCount);
}

function stripNulls(fundamentals: Fundamentals): Partial<Fundamentals> {
  return Object.fromEntries(Object.entries(fundamentals).filter(([, value]) => value != null));
}

function write(file: SeedFile, syntheticCount: number, liveCount: number): void {
  const destination = seedFilePath();
  writeFileSync(destination, JSON.stringify(file));
  console.log(`Wrote ${destination}`);
  console.log(`synthetic rows: ${syntheticCount}; live rows: ${liveCount}; flagged synthetic: ${file.stocks.filter((stock) => stock.isSynthetic).length}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
