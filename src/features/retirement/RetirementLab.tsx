"use client";

import { Disclaimer } from "@/components/ui/Disclaimer";
import { INFLATION_RATE_MAX, INFLATION_RATE_MIN, assumptionSentence, inflationAdjusted, projectGrowth } from "@/lib/finance/compound";
import { monteCarloFan, projectOutcomeRange } from "@/lib/finance/montecarlo";
import { formatCad } from "@/lib/format";
import { useMemo, useState } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const PRESETS = [
  { id: "cautious", label: "Cautious", rate: 0.04, vol: 0.08 },
  { id: "balanced", label: "Balanced", rate: 0.06, vol: 0.12 },
  { id: "ambitious", label: "Ambitious", rate: 0.08, vol: 0.18 },
] as const;

export function RetirementLab() {
  const [age, setAge] = useState(22);
  const [retire, setRetire] = useState(65);
  const [monthly, setMonthly] = useState(300);
  const [start, setStart] = useState(1000);
  const [preset, setPreset] = useState<(typeof PRESETS)[number]["id"]>("balanced");
  const [inflationPercent, setInflationPercent] = useState(2);
  const choice = PRESETS.find((item) => item.id === preset) ?? PRESETS[1];
  const inflation = inflationPercent / 100;
  const years = Math.max(0, retire - age);
  const fan = useMemo(
    () =>
      monteCarloFan({
        principal: start,
        contributionPerYear: monthly * 12,
        meanReturn: choice.rate,
        volatility: choice.vol,
        years,
        paths: 300,
        seed: 22,
      }),
    [start, monthly, choice.rate, choice.vol, years],
  );
  const steady = projectGrowth({
    principal: start,
    contributionPerYear: monthly * 12,
    annualRate: choice.rate,
    years,
  });
  const inToday = (amount: number, elapsed: number) => inflationAdjusted(amount, inflation, elapsed);
  const chart = fan.map((row, index) => {
    const low = inToday(row.p10, row.year);
    const middle = inToday(row.p50, row.year);
    const high = inToday(row.p90, row.year);
    return {
      year: age + row.year,
      low,
      middle,
      high,
      p10: low,
      p50: middle,
      span: Math.max(0, high - low),
      steady: inToday(steady[index]?.balance ?? 0, row.year),
    };
  });
  const outcome = useMemo(() => {
    const nominal = projectOutcomeRange({
      principal: start,
      contributionPerYear: monthly * 12,
      annualReturn: choice.rate,
      years,
      volatility: choice.vol,
      paths: 300,
      seed: 22,
    });
    const adjust = (amount: number) => inflationAdjusted(amount, inflation, years);
    return {
      ...nominal,
      low: adjust(nominal.low),
      middle: adjust(nominal.middle),
      high: adjust(nominal.high),
    };
  }, [start, monthly, choice.rate, choice.vol, years, inflation]);

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-8">
      <header>
        <h1 className="font-display text-5xl">Years from now</h1>
        <p className="mt-3 max-w-2xl leading-7 text-mist">
          This is compound growth with a wobble. The band is a classroom range, not a promise about your retirement.
        </p>
      </header>
      <Disclaimer prominent />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Age now" value={age} onChange={setAge} />
        <Field label="Stop working" value={retire} onChange={setRetire} />
        <Field label="Saved already" value={start} onChange={setStart} />
        <Field label="Added each month" value={monthly} onChange={setMonthly} />
      </div>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setPreset(item.id)}
            className={`rounded-full px-3 py-1.5 text-sm ${preset === item.id ? "bg-cream text-ink" : "border border-cream/15"}`}
          >
            {item.label} · {(item.rate * 100).toFixed(0)}% pace
          </button>
        ))}
      </div>
      <label className="block max-w-sm text-sm text-mist">
        Prices rising about {inflationPercent}% a year. Amounts below are in today's dollars.
        <input
          className="mt-2 block w-full"
          type="range"
          min={INFLATION_RATE_MIN * 100}
          max={INFLATION_RATE_MAX * 100}
          step={1}
          value={inflationPercent}
          onChange={(event) => setInflationPercent(Number(event.target.value))}
        />
      </label>
      <section className="rounded-3xl border border-cream/10 bg-pine/80 p-4">
        <p className="text-sm text-mist">At age {retire}.</p>
        <dl className="mt-3 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-sm text-mist">{outcome.lowLabel}</dt>
            <dd className="mt-1 font-display text-3xl">{formatCad(outcome.low)}</dd>
          </div>
          <div>
            <dt className="text-sm text-mist">{outcome.middleLabel}</dt>
            <dd className="mt-1 font-display text-3xl">{formatCad(outcome.middle)}</dd>
          </div>
          <div>
            <dt className="text-sm text-mist">{outcome.highLabel}</dt>
            <dd className="mt-1 font-display text-3xl">{formatCad(outcome.high)}</dd>
          </div>
        </dl>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-mist">
          {assumptionSentence({ pace: choice.rate, wobble: choice.vol, inflation })}
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-mist">{outcome.note}</p>
        <div className="mt-4 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chart}>
              <CartesianGrid stroke="rgba(244,240,230,0.06)" />
              <XAxis dataKey="year" tick={{ fill: "#a9b7ae", fontSize: 11 }} />
              <YAxis tick={{ fill: "#a9b7ae", fontSize: 11 }} width={72} />
              <Tooltip
                content={({ active, payload }) => {
                  const row = payload?.[0]?.payload as { low?: number; middle?: number; high?: number } | undefined;
                  if (!active || !row) return null;
                  return (
                    <div className="rounded-xl px-3 py-2 text-sm text-cream" style={{ background: "#102019" }}>
                      <p>{outcome.lowLabel}: {formatCad(row.low ?? 0)}</p>
                      <p>{outcome.middleLabel}: {formatCad(row.middle ?? 0)}</p>
                      <p>{outcome.highLabel}: {formatCad(row.high ?? 0)}</p>
                    </div>
                  );
                }}
              />
              <Area dataKey="p10" stackId="band" stroke="none" fill="transparent" />
              <Area dataKey="span" stackId="band" stroke="none" fill="#5ee0a0" fillOpacity={0.22} />
              <Line dataKey="p50" stroke="#f4f0e6" dot={false} strokeWidth={2} name="Middle" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="text-sm text-mist">
      {label}
      <input
        className="mt-1 w-full rounded-2xl border border-cream/15 bg-pine px-3 py-2 text-cream"
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
