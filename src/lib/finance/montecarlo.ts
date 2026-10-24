import { projectGrowth } from "./compound";
import { roundMoney } from "./returns";

export interface FanYear {
  year: number;
  p10: number;
  p50: number;
  p90: number;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rng: () => number): number {
  const u = Math.max(rng(), 1e-9);
  const v = Math.max(rng(), 1e-9);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] * (upper - index) + sorted[upper] * (index - lower);
}

/**
 * One step per year. `meanReturn` and `volatility` are decimals (0.06, 0.12).
 * Same seed always produces the same fan. This is a classroom sketch, not a forecast.
 */
export function monteCarloFan(input: {
  principal: number;
  contributionPerYear: number;
  meanReturn: number;
  volatility: number;
  years: number;
  paths?: number;
  seed?: number;
}): FanYear[] {
  const years = Math.max(0, Math.floor(input.years));
  const paths = Math.max(20, input.paths ?? 400);
  const rng = mulberry32(input.seed ?? 20261023);
  const balances: number[][] = Array.from({ length: years + 1 }, () => []);

  for (let path = 0; path < paths; path++) {
    let balance = Math.max(0, input.principal);
    balances[0].push(balance);
    for (let year = 1; year <= years; year++) {
      const shock = input.meanReturn + input.volatility * gaussian(rng);
      balance = Math.max(0, balance * (1 + shock) + Math.max(0, input.contributionPerYear));
      balances[year].push(balance);
    }
  }

  return balances.map((samples, year) => {
    const sorted = [...samples].sort((a, b) => a - b);
    return {
      year,
      p10: roundMoney(percentile(sorted, 0.1)),
      p50: roundMoney(percentile(sorted, 0.5)),
      p90: roundMoney(percentile(sorted, 0.9)),
    };
  });
}

export interface OutcomeRange {
  low: number;
  middle: number;
  high: number;
  kind: "simulation" | "scenario";
  lowLabel: string;
  middleLabel: string;
  highLabel: string;
  note: string;
}

const SIMULATION_COPY = {
  kind: "simulation" as const,
  lowLabel: "Low, an unlikely edge",
  middleLabel: "Middle, where most simulated outcomes landed",
  highLabel: "High, an unlikely edge",
  note: "Most simulated outcomes landed between these edges. The edges are unlikely, not a promise the market will land there.",
};

const SCENARIO_COPY = {
  kind: "scenario" as const,
  lowLabel: "Conservative scenario",
  middleLabel: "Expected scenario",
  highLabel: "Optimistic scenario",
  note: "These are three scenarios, not the odds of what the market will do.",
};

/** Final low, middle, and high. Pass `volatility` to use the simulation; omit it for three scenarios. */
export function projectOutcomeRange(input: {
  principal: number;
  contributionPerYear: number;
  annualReturn: number;
  years: number;
  volatility?: number;
  paths?: number;
  seed?: number;
}): OutcomeRange {
  if (input.volatility == null) {
    const ending = (annualRate: number) => {
      const rows = projectGrowth({
        principal: input.principal,
        contributionPerYear: input.contributionPerYear,
        annualRate,
        years: input.years,
      });
      return rows[rows.length - 1]?.balance ?? 0;
    };
    return {
      low: ending(input.annualReturn - 0.02),
      middle: ending(input.annualReturn),
      high: ending(input.annualReturn + 0.02),
      ...SCENARIO_COPY,
    };
  }

  const fan = monteCarloFan({
    principal: input.principal,
    contributionPerYear: input.contributionPerYear,
    meanReturn: input.annualReturn,
    volatility: input.volatility,
    years: input.years,
    paths: input.paths,
    seed: input.seed,
  });
  const last = fan[fan.length - 1];
  return {
    low: last?.p10 ?? 0,
    middle: last?.p50 ?? 0,
    high: last?.p90 ?? 0,
    ...SIMULATION_COPY,
  };
}
