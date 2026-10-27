"use client";

import { UniverseBadge } from "@/components/ui/DataBadge";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { torontoDate } from "@/lib/data/session";
import { simulateDividend } from "@/lib/finance/drip";
import { displayName, formatCad } from "@/lib/format";
import type { ExplorerItem } from "@/types/market";
import { useMemo, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function snapshotDay(asOf: string): string {
  return torontoDate(asOf) ?? "this snapshot";
}

export function DividendLab({ universe }: { universe: ExplorerItem[] }) {
  const [symbol, setSymbol] = useState(
    universe.find((item) => (item.dividendYield ?? 0) > 1)?.symbol ?? universe[0]?.symbol ?? "",
  );
  const [principal, setPrincipal] = useState(1000);
  const [years, setYears] = useState(10);
  const [reinvest, setReinvest] = useState(true);
  const [dividendGrowth, setDividendGrowth] = useState(0);
  const [priceGrowth, setPriceGrowth] = useState(0);
  const item = universe.find((entry) => entry.symbol === symbol) ?? null;
  const yieldPercent = item?.dividendYield ?? null;
  const rows = useMemo(() => {
    if (!item || yieldPercent == null || yieldPercent <= 0) return [];
    return simulateDividend({
      principal: Math.max(principal, 0),
      yieldPercent,
      dividendGrowthPercent: dividendGrowth,
      priceGrowthPercent: priceGrowth,
      years,
      reinvest,
    });
  }, [dividendGrowth, item, priceGrowth, principal, reinvest, years, yieldPercent]);
  const asOf = item ? snapshotDay(item.asOf) : null;
  const canChart = item != null && yieldPercent != null && yieldPercent > 0 && rows.length > 0;

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-5xl">Dividends</h1>
        <UniverseBadge universe={universe} />
      </header>
      <Disclaimer prominent />
      <div className="flex flex-wrap gap-4">
        <label className="text-sm text-mist">
          Name
          <select
            className="mt-1 block rounded-2xl border border-cream/15 bg-pine px-3 py-2 text-cream"
            value={symbol}
            onChange={(event) => setSymbol(event.target.value)}
          >
            {universe.map((entry) => {
              const shown = displayName(entry.name, entry.symbol);
              const yieldLabel =
                entry.dividendYield == null ? "yield unknown" : `${entry.dividendYield.toFixed(1)}% yield`;
              return (
                <option key={entry.symbol} value={entry.symbol}>
                  {shown.name} ({shown.ticker}) · {yieldLabel}
                </option>
              );
            })}
          </select>
        </label>
        <label className="text-sm text-mist">
          Starting amount
          <input
            className="mt-1 block w-36 rounded-2xl border border-cream/15 bg-pine px-3 py-2 text-cream"
            type="number"
            min={0}
            value={principal}
            onChange={(event) => setPrincipal(Number(event.target.value))}
          />
        </label>
        <label className="text-sm text-mist">
          Years
          <input
            className="mt-1 block w-24 rounded-2xl border border-cream/15 bg-pine px-3 py-2 text-cream"
            type="number"
            min={1}
            max={40}
            value={years}
            onChange={(event) => setYears(Number(event.target.value))}
          />
        </label>
        <label className="flex items-end gap-2 text-sm">
          <input type="checkbox" checked={reinvest} onChange={(event) => setReinvest(event.target.checked)} />
          Reinvest the cash
        </label>
      </div>
      {item && asOf ? (
        <div className="grid gap-1 text-sm">
          <p>
            {yieldPercent == null ? "Yield unknown" : `Yield ${yieldPercent.toFixed(1)}%`} as of {asOf}
          </p>
          <p>
            {item.payoutRatio == null ? "Payout unknown" : `Payout ${item.payoutRatio.toFixed(0)}%`} as of {asOf}
          </p>
          {item.exDividendDate ? (
            <p>
              Ex-dividend {item.exDividendDate} as of {asOf}
            </p>
          ) : null}
        </div>
      ) : null}
      {item && yieldPercent != null && yieldPercent <= 0 ? (
        <p>{displayName(item.name, item.symbol).name} has no dividend.</p>
      ) : null}
      {item && yieldPercent == null ? <p>Yield unknown, so this chart stays blank.</p> : null}
      {canChart ? (
        <div className="grid max-w-sm gap-3">
          <p className="text-sm text-mist">Rates you picked, not this company's history.</p>
          <label className="text-sm text-mist">
            Dividend growth {dividendGrowth}%
            <input
              className="mt-2 block w-full"
              type="range"
              min={-10}
              max={20}
              step={1}
              value={dividendGrowth}
              onChange={(event) => setDividendGrowth(Number(event.target.value))}
            />
          </label>
          <label className="text-sm text-mist">
            Price growth {priceGrowth}%
            <input
              className="mt-2 block w-full"
              type="range"
              min={-10}
              max={20}
              step={1}
              value={priceGrowth}
              onChange={(event) => setPriceGrowth(Number(event.target.value))}
            />
          </label>
        </div>
      ) : null}
      {canChart ? (
        <section className="rounded-3xl border border-cream/10 bg-pine/80 p-4">
          <p className="font-display text-3xl">
            Year {years} income about {formatCad(rows[rows.length - 1].income)}
          </p>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows}>
                <XAxis dataKey="year" tick={{ fill: "#a9b7ae", fontSize: 11 }} />
                <YAxis tick={{ fill: "#a9b7ae", fontSize: 11 }} width={64} />
                <Tooltip
                  formatter={(value) => formatCad(Number(value))}
                  contentStyle={{ background: "#102019", borderRadius: 12 }}
                />
                <Bar dataKey="income" fill="#5ee0a0" radius={6} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      ) : null}
    </div>
  );
}
