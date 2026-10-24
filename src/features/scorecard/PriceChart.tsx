"use client";

import { percentChange, sliceHistory, type ChartRange } from "@/lib/finance/returns";
import { formatCad, formatPercent } from "@/lib/format";
import type { PricePoint } from "@/types/market";
import { useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const RANGES: ChartRange[] = ["1M", "3M", "6M", "1Y"];

export function PriceChart({ history }: { history: PricePoint[] }) {
  const [range, setRange] = useState<ChartRange>("1Y");
  const data = sliceHistory(history, range);
  const first = data[0]?.close ?? 0;
  const last = data[data.length - 1]?.close ?? 0;
  const change = percentChange(first, last);
  const up = (change ?? 0) >= 0;
  const stroke = up ? "#5ee0a0" : "#ff6d6d";

  return (
    <section className="rounded-3xl border border-cream/10 bg-pine/80 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl">The past year, drawn</h2>
          <p className="mt-1 max-w-xl text-sm leading-6 text-mist">
            {data.length > 1 && change != null
              ? `From ${data[0].date} to ${data[data.length - 1].date}, the price went from ${formatCad(first)} to ${formatCad(last)} (${formatPercent(change, 1, true)}). That already happened. It is not a forecast.`
              : "Not enough prices to draw a line."}
          </p>
        </div>
        <div className="flex gap-1 rounded-full border border-cream/15 p-1">
          {RANGES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setRange(option)}
              className={`rounded-full px-3 py-1 text-sm ${range === option ? "bg-cream text-ink" : "text-mist"}`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity={0.45} />
                <stop offset="100%" stopColor={stroke} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fill: "#a9b7ae", fontSize: 11 }} minTickGap={32} />
            <YAxis tick={{ fill: "#a9b7ae", fontSize: 11 }} width={64} domain={["auto", "auto"]} />
            <Tooltip
              formatter={(value) => formatCad(Number(value))}
              contentStyle={{ background: "#102019", border: "1px solid rgba(244,240,230,0.15)", borderRadius: 12 }}
            />
            <Area type="monotone" dataKey="close" stroke={stroke} fill="url(#priceFill)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
