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
