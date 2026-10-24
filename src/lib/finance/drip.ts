import { roundMoney } from "./returns";

export interface DripYear {
  year: number;
  income: number;
  value: number;
  shares: number;
  cash: number;
}

/**
 * Yields and growth rates are percents (5 means 5%).
 * Share price starts at 100 so the picture is about the mechanics, not a quote.
 */
export function simulateDividend(input: {
  principal: number;
  yieldPercent: number;
  dividendGrowthPercent: number;
  priceGrowthPercent: number;
  years: number;
  reinvest: boolean;
}): DripYear[] {
  const years = Math.max(0, Math.floor(input.years));
  const startPrice = 100;
  let price = startPrice;
  let shares = Math.max(0, input.principal) / startPrice;
  let cash = 0;
  let dividendPerShare = startPrice * (Math.max(0, input.yieldPercent) / 100);
  const priceGrowth = input.priceGrowthPercent / 100;
  const dividendGrowth = input.dividendGrowthPercent / 100;
  const rows: DripYear[] = [];

  for (let year = 1; year <= years; year++) {
    const income = shares * dividendPerShare;
    if (input.reinvest && price > 0) shares += income / price;
    else cash += income;
    price *= 1 + priceGrowth;
    dividendPerShare *= 1 + dividendGrowth;
    rows.push({
      year,
      income: roundMoney(income),
      value: roundMoney(shares * price + cash),
      shares: Math.round(shares * 1000) / 1000,
      cash: roundMoney(cash),
    });
  }
  return rows;
}
