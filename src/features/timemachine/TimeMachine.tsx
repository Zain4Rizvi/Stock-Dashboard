"use client";

import { Disclaimer } from "@/components/ui/Disclaimer";
import { replayInvestment } from "@/lib/finance/returns";
import { formatCad, formatPercent } from "@/lib/format";
import type { ExplorerItem, Snapshot } from "@/types/market";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function TimeMachine({
  universe,
  snapshot,
  initialDollars,
}: {
  universe: ExplorerItem[];
  snapshot: Snapshot | null;
  initialDollars: number;
}) {
  const router = useRouter();
  const [dollars, setDollars] = useState(initialDollars);
  const series = useMemo(
    () => (snapshot ? replayInvestment(snapshot.history, Math.max(dollars, 1)) : []),
    [snapshot, dollars],
  );
  const start = series[0]?.value ?? 0;
  const end = series[series.length - 1]?.value ?? 0;
  const change = start > 0 ? ((end - start) / start) * 100 : 0;

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-8">
      <header>
        <h1 className="font-display text-5xl">Replay the past year</h1>
        <p className="mt-3 max-w-2xl leading-7 text-mist">
          Pick a company and a pretend amount. You will see what that amount became over the prices we have, which is about one year. The next year is not hiding in the line.
        </p>
      </header>
      <Disclaimer prominent />
      <div className="flex flex-wrap gap-4">
        <label className="text-sm text-mist">
          Company
          <select
            className="mt-1 block rounded-2xl border border-cream/15 bg-pine px-3 py-2 text-cream"
            value={snapshot?.stock.symbol ?? ""}
            onChange={(event) => router.push(`/time-machine?symbol=${event.target.value}`)}
          >
            <option value="">Choose</option>
            {universe.map((item) => (
              <option key={item.symbol} value={item.symbol}>
                {item.symbol} · {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-mist">
          Pretend amount
          <input
            className="mt-1 block w-36 rounded-2xl border border-cream/15 bg-pine px-3 py-2 text-cream"
            type="number"
            min={1}
            value={dollars}
            onChange={(event) => setDollars(Number(event.target.value))}
          />
        </label>
      </div>
      {snapshot && series.length > 1 ? (
        <section className="rounded-3xl border border-cream/10 bg-pine/80 p-4">
          <p className="font-display text-3xl">
            {formatCad(start)} became {formatCad(end)}
          </p>
          <p className={`mt-1 ${change < 0 ? "text-loss" : "text-aurora"}`}>{formatPercent(change, 1, true)}</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-mist">
            A year ago, {formatCad(dollars)} in {snapshot.stock.name} would be worth about {formatCad(end)} at the last price in this snapshot. Someone who bought on a different day got a different story.
          </p>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}>
                <XAxis dataKey="date" tick={{ fill: "#a9b7ae", fontSize: 11 }} minTickGap={36} />
                <YAxis tick={{ fill: "#a9b7ae", fontSize: 11 }} width={72} />
                <Tooltip formatter={(value) => formatCad(Number(value))} contentStyle={{ background: "#102019", borderRadius: 12 }} />
                <ReferenceLine y={start} stroke="rgba(244,240,230,0.35)" strokeDasharray="4 4" />
                <Line type="monotone" dataKey="value" stroke="#f0c96a" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      ) : (
        <p className="text-mist">Choose a company and the year will draw itself.</p>
      )}
    </div>
  );
}
