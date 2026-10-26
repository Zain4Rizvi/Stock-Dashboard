"use client";

import { Disclaimer } from "@/components/ui/Disclaimer";
import { simulateDividend } from "@/lib/finance/drip";
import { formatCad } from "@/lib/format";
import type { ExplorerItem } from "@/types/market";
import { useMemo, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function DividendLab({ universe }: { universe: ExplorerItem[] }) {
  const [symbol, setSymbol] = useState(universe.find((item) => (item.dividendYield ?? 0) > 1)?.symbol ?? universe[0]?.symbol ?? "");
  const [principal, setPrincipal] = useState(1000);
  const [years, setYears] = useState(10);
  const [reinvest, setReinvest] = useState(true);
  const item = universe.find((entry) => entry.symbol === symbol) ?? null;
  const yieldPercent = item?.dividendYield ?? 0;
  const rows = useMemo(() => {
    if (!item || yieldPercent <= 0) return [];
    return simulateDividend({
      principal: Math.max(principal, 0),
      yieldPercent,
      dividendGrowthPercent: 3,
      priceGrowthPercent: 4,
      years,
      reinvest,
    });
  }, [item, principal, reinvest, years, yieldPercent]);

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-8">
      <header>
        <h1 className="font-display text-5xl">Dividends</h1>
      </header>
      <Disclaimer prominent />
      <div className="flex flex-wrap gap-4">
        <label className="text-sm text-mist">
          Company
          <select className="mt-1 block rounded-2xl border border-cream/15 bg-pine px-3 py-2 text-cream" value={symbol} onChange={(event) => setSymbol(event.target.value)}>
            {universe.map((entry) => (
              <option key={entry.symbol} value={entry.symbol}>
                {entry.symbol} · {entry.dividendYield == null ? "yield unknown" : `${entry.dividendYield.toFixed(1)}% yield`}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-mist">
          Starting amount
          <input className="mt-1 block w-36 rounded-2xl border border-cream/15 bg-pine px-3 py-2 text-cream" type="number" min={0} value={principal} onChange={(event) => setPrincipal(Number(event.target.value))} />
        </label>
        <label className="text-sm text-mist">
          Years
          <input className="mt-1 block w-24 rounded-2xl border border-cream/15 bg-pine px-3 py-2 text-cream" type="number" min={1} max={40} value={years} onChange={(event) => setYears(Number(event.target.value))} />
        </label>
        <label className="flex items-end gap-2 text-sm">
          <input type="checkbox" checked={reinvest} onChange={(event) => setReinvest(event.target.checked)} />
          Reinvest the cash
        </label>
      </div>
      {item && yieldPercent <= 0 ? <p>{item.name} has no dividend.</p> : null}
      {item && yieldPercent > 0 && rows.length > 0 ? (
        <section className="rounded-3xl border border-cream/10 bg-pine/80 p-4">
          <p className="font-display text-3xl">Year {years} income about {formatCad(rows[rows.length - 1].income)}</p>
          <p className="mt-2 text-sm text-mist">
            {item.payoutRatio == null
              ? "Payout unknown"
              : `Yield ${yieldPercent.toFixed(1)}% · Payout ${item.payoutRatio.toFixed(0)}%`}
          </p>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows}>
                <XAxis dataKey="year" tick={{ fill: "#a9b7ae", fontSize: 11 }} />
                <YAxis tick={{ fill: "#a9b7ae", fontSize: 11 }} width={64} />
                <Tooltip formatter={(value) => formatCad(Number(value))} contentStyle={{ background: "#102019", borderRadius: 12 }} />
                <Bar dataKey="income" fill="#5ee0a0" radius={6} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      ) : null}
    </div>
  );
}
