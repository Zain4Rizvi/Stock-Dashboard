import type { SeedFile } from "@/lib/data/schemas";
import type { UniverseCompany } from "./universe";
import { UNIVERSE } from "./universe";

export const SYNTHETIC_AS_OF = "2026-10-23";

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSymbol(symbol: string): number {
  let hash = 2166136261;
  for (let i = 0; i < symbol.length; i++) {
    hash ^= symbol.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function businessDaysEnding(endIso: string, count: number): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${endIso}T12:00:00Z`);
  while (dates.length < count) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return dates.reverse();
}

export function buildPricePath(input: {
  start: number;
  end: number;
  steps: number;
  noise: number;
  seed: number;
}): number[] {
  const rng = mulberry32(input.seed || 1);
  const values = new Array<number>(input.steps);
  values[0] = input.start;
  values[input.steps - 1] = input.end;
  for (let i = 1; i < input.steps - 1; i++) {
    const t = i / (input.steps - 1);
    const bridge = input.start * (input.end / input.start) ** t;
    const envelope = Math.sin(Math.PI * t);
    const shock = (rng() * 2 - 1) * input.noise * bridge * 6 * envelope;
    values[i] = Math.max(0.5, bridge + shock);
  }
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 1; i < input.steps - 1; i++) {
      values[i] = values[i] * 0.6 + values[i - 1] * 0.2 + values[i + 1] * 0.2;
    }
  }
  values[0] = input.start;
  values[input.steps - 1] = input.end;
  return values.map((value) => Math.round(value * 100) / 100);
}

function companyToSeed(company: UniverseCompany, dates: string[]) {
  const end = company.price;
  const start = Math.round((end / (1 + company.oneYearReturn / 100)) * 100) / 100;
  const closes = buildPricePath({
    start,
    end,
    steps: dates.length,
    noise: company.pathNoise,
    seed: hashSymbol(company.symbol),
  });
  const previous = closes[closes.length - 2] ?? end;
  const change = Math.round((end - previous) * 100) / 100;
  const volumeBase = Math.round(company.marketCap / company.price / 90);
  const history = dates.map((date, index) => ({
    date,
    close: closes[index],
    volume: Math.round(volumeBase * (0.7 + ((index * 17) % 60) / 100)),
  }));

  return {
    stock: {
      symbol: company.symbol,
      name: company.name,
      sector: company.sector,
      blurb: company.blurb,
      currency: "CAD" as const,
      exchange: "TSX" as const,
      kind: company.kind ?? ("company" as const),
    },
    quote: {
      symbol: company.symbol,
      price: end,
      change,
      changePercent: previous > 0 ? Math.round((change / previous) * 10000) / 100 : 0,
      previousClose: previous,
      marketCap: company.marketCap,
      volume: history[history.length - 1]?.volume ?? null,
      asOf: SYNTHETIC_AS_OF,
    },
    history,
    fundamentals: {
      symbol: company.symbol,
      pe: company.pe,
      epsGrowth: company.epsGrowth,
      roe: company.roe,
      debtToEquity: company.debtToEquity,
      dividendYield: company.dividendYield,
      payoutRatio: company.payoutRatio,
      marketCap: company.marketCap,
    },
    news: [],
    isSynthetic: true,
  };
}

/** Funds stay off the generated snapshot. Their quotes come from the weekday cron. */
function companiesForSnapshot(companies: readonly UniverseCompany[]): UniverseCompany[] {
  return companies.filter((company) => company.kind !== "fund");
}

export function buildSyntheticSeed(companies: UniverseCompany[] = companiesForSnapshot(UNIVERSE)): SeedFile {
  const dates = businessDaysEnding(SYNTHETIC_AS_OF, 252);
  return {
    generatedAt: `${SYNTHETIC_AS_OF}T16:00:00.000Z`,
    asOf: SYNTHETIC_AS_OF,
    source: "synthetic",
    stocks: companies.map((company) => companyToSeed(company, dates)),
  };
}
