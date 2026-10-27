import { roundMoney } from "./returns";

export interface GrowthYear {
  year: number;
  balance: number;
  contributed: number;
}

/**
 * `annualRate` is a decimal: 0.06 means 6% a year.
 * Contributions land at the end of each year.
 */
export function projectGrowth(input: {
  principal: number;
  contributionPerYear: number;
  annualRate: number;
  years: number;
}): GrowthYear[] {
  const years = Math.max(0, Math.floor(input.years));
  const rate = input.annualRate;
  let balance = Math.max(0, input.principal);
  let contributed = Math.max(0, input.principal);
  const rows: GrowthYear[] = [{ year: 0, balance: roundMoney(balance), contributed: roundMoney(contributed) }];
  for (let year = 1; year <= years; year++) {
    balance = balance * (1 + rate) + Math.max(0, input.contributionPerYear);
    contributed += Math.max(0, input.contributionPerYear);
    rows.push({ year, balance: roundMoney(balance), contributed: roundMoney(contributed) });
  }
  return rows;
}

export function futureValue(principal: number, annualRate: number, years: number): number {
  return roundMoney(principal * (1 + annualRate) ** years);
}

/** Rates are decimals: 0.06 is a 6% pace. Names the inputs. It is not a balance. */
export function assumptionSentence(input: { pace: number; wobble: number; inflation: number }): string {
  const percent = (rate: number) => {
    const amount = Math.round(rate * 100);
    const article = amount === 8 || amount === 18 ? "an" : "a";
    return `${article} ${amount}%`;
  };
  return `This band uses ${percent(input.pace)} pace, ${percent(input.wobble)} wobble, and ${percent(input.inflation)} inflation. Yearly contributions are modeled once a year.`;
}

/** The Future slider only sets 0% to 10% a year. */
export const INFLATION_RATE_MIN = 0;
export const INFLATION_RATE_MAX = 0.1;

/**
 * `annualInflation` is a decimal: 0.02 means prices rise 2% a year.
 * Rates outside the slider are clamped. The result is today's dollars.
 */
export function inflationAdjusted(nominal: number, annualInflation: number, years: number): number {
  const rate = Math.min(
    INFLATION_RATE_MAX,
    Math.max(INFLATION_RATE_MIN, Number.isFinite(annualInflation) ? annualInflation : INFLATION_RATE_MIN),
  );
  const elapsed = Math.max(0, Math.floor(years));
  return roundMoney(nominal / (1 + rate) ** elapsed);
}

/** Counted dollars compounded at `annualRate` (0.06 means 6%). Non-positive dollars are ignored. */
export function projectPortfolio(
  holdings: readonly { dollars: number }[],
  annualRate: number,
  years: number,
): number | null {
  const principal = holdings.reduce((sum, holding) => (holding.dollars > 0 ? sum + holding.dollars : sum), 0);
  if (!(principal > 0)) return null;
  return futureValue(principal, annualRate, years);
}
