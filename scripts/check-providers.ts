import { createAlphaProvider } from "../src/lib/data/adapters/alpha";
import { createFmpProvider } from "../src/lib/data/adapters/fmp";
import { createTwelveProvider } from "../src/lib/data/adapters/twelve";
import { createYahooProvider } from "../src/lib/data/adapters/yahoo";
import type { MarketDataProvider } from "../src/lib/data/provider";
import { loadEnvFiles } from "./load-env";

loadEnvFiles();

const TICKERS = ["RY.TO", "SHOP.TO", "ENB.TO"] as const;

interface Probe {
  name: string;
  enabled: boolean;
  reason?: string;
  create?: () => MarketDataProvider;
}

const probes: Probe[] = [
  { name: "yahoo (unofficial)", enabled: true, create: () => createYahooProvider() },
  {
    name: "fmp",
    enabled: Boolean(process.env.FMP_API_KEY),
    reason: "FMP_API_KEY not set",
    create: () => createFmpProvider(),
  },
  {
    name: "twelvedata",
    enabled: Boolean(process.env.TWELVE_DATA_API_KEY),
    reason: "TWELVE_DATA_API_KEY not set",
    create: () => createTwelveProvider(),
  },
  {
    name: "alphavantage",
    enabled: Boolean(process.env.ALPHA_VANTAGE_API_KEY),
    reason: "ALPHA_VANTAGE_API_KEY not set",
    create: () => createAlphaProvider(),
  },
];

function cell(value: string, width: number): string {
  return value.padEnd(width);
}

async function checkOne(provider: MarketDataProvider, symbol: string, label: string, run: () => Promise<unknown>): Promise<string> {
  try {
    const result = await run();
    if (label === "history" && Array.isArray(result)) return `pass ${result.length}d`;
    if (label === "fundamentals" && result && typeof result === "object") {
      const row = result as { pe?: number | null; dividendYield?: number | null; roe?: number | null };
      const bits = [
        row.pe != null ? "pe" : null,
        row.roe != null ? "roe" : null,
        row.dividendYield != null ? "yield" : null,
      ].filter(Boolean);
      return bits.length > 0 ? `pass ${bits.join("+")}` : "fail empty";
    }
    return "pass";
  } catch (error) {
    const message = error instanceof Error ? error.message.replace(/\s+/g, " ") : "fail";
    return `fail ${message}`;
  }
}

async function main(): Promise<void> {
  console.log("Maple Market free-tier probe. Tickers: RY.TO, SHOP.TO, ENB.TO");
  console.log("Yahoo is unofficial and for development only.\n");
  const header = [
    cell("provider", 22),
    cell("ticker", 10),
    cell("quote", 28),
    cell("1Y history", 28),
    cell("fundamentals", 36),
  ].join(" ");
  console.log(header);
  console.log("-".repeat(header.length));

  for (const probe of probes) {
    if (!probe.enabled || !probe.create) {
      console.log(`${cell(probe.name, 22)} ${cell("—", 10)} ${cell(probe.reason ?? "skipped", 28)}`);
      continue;
    }
    const provider = probe.create();
    for (const ticker of TICKERS) {
      const quote = await checkOne(provider, ticker, "quote", () => provider.getQuote(ticker));
      const history = await checkOne(provider, ticker, "history", () => provider.getHistory(ticker));
      const fundamentals = await checkOne(provider, ticker, "fundamentals", () => provider.getFundamentals(ticker));
      console.log(
        [cell(probe.name, 22), cell(ticker, 10), cell(quote, 28), cell(history, 28), cell(fundamentals, 36)].join(" "),
      );
    }
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
