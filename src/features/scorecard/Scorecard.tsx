import { DataBadge } from "@/components/ui/DataBadge";
import { formatCad, formatCompactCad, formatPercent } from "@/lib/format";
import { GLOSSARY } from "@/lib/scoring/glossary";
import type { Scorecard as ScorecardModel } from "@/lib/scoring/score";
import type { Snapshot } from "@/types/market";
import Link from "next/link";
import { AddToPortfolio } from "./AddToPortfolio";
import { ExplainPanel } from "./ExplainPanel";
import { PriceChart } from "./PriceChart";
import { MoodPanel } from "@/features/sentiment/MoodPanel";

const GRADE_COLOR: Record<string, string> = {
  A: "text-aurora",
  B: "text-gold",
  C: "text-cream",
  D: "text-[#ffb15e]",
  F: "text-loss",
  "N/A": "text-mist",
};

export function ScorecardView({ snapshot, score }: { snapshot: Snapshot; score: ScorecardModel }) {
  const changeUp = snapshot.quote.change >= 0;
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8">
      <header className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="text-sm text-mist">{snapshot.stock.sector}</p>
          <h1 className="font-display text-5xl leading-none">{snapshot.stock.name}</h1>
          <p className="mt-2 text-lg text-gold">{snapshot.stock.symbol}</p>
          <p className="mt-4 max-w-2xl text-lg leading-8">{snapshot.stock.blurb}</p>
        </div>
        <div className="rounded-3xl border border-cream/10 bg-pine/80 p-5">
          <div className="flex flex-wrap gap-2">
            <DataBadge freshness={snapshot.freshness} source={snapshot.source} />
          </div>
          <p className="mt-3 font-display text-4xl">{formatCad(snapshot.quote.price)}</p>
          <p className={changeUp ? "text-aurora" : "text-loss"}>
            {formatCad(snapshot.quote.change)} ({formatPercent(snapshot.quote.changePercent, 2, true)}) today
          </p>
          <p className="mt-2 text-sm text-mist">About {formatCompactCad(snapshot.quote.marketCap ?? 0)} of company</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <AddToPortfolio symbol={snapshot.stock.symbol} />
            <Link href={`/compare?symbols=${snapshot.stock.symbol}`} className="rounded-full px-4 py-2 text-sm text-mist hover:text-cream">
              Compare
            </Link>
          </div>
        </div>
      </header>

      <PriceChart history={snapshot.history} />

      <section className="grid gap-4 rounded-3xl border border-cream/10 bg-ink/40 p-5 md:grid-cols-[160px_1fr] md:items-center">
        <p className={`font-display text-8xl leading-none ${GRADE_COLOR[score.overall]}`}>{score.overall}</p>
        <div>
          <h2 className="font-display text-3xl">Report card</h2>
          <p className="mt-2 max-w-2xl leading-7">{score.summary}</p>
          <p className="mt-2 text-sm text-mist">
            Past year: {score.oneYearReturn == null ? "unknown" : formatPercent(score.oneYearReturn, 1, true)}. Grades describe
            the latest numbers. They are not a buy rating.
          </p>
        </div>
      </section>

      <div className="grid gap-3">
        {score.metrics.map((metric) => (
          <article key={metric.id} className="grid gap-3 rounded-3xl border border-cream/10 bg-pine/70 p-4 md:grid-cols-[88px_1fr]">
            <p className={`font-display text-5xl ${GRADE_COLOR[metric.grade]}`}>{metric.grade}</p>
            <div>
              <h3 className="text-sm tracking-wide text-mist uppercase">{metric.label}</h3>
              <p className="font-display text-2xl">{metric.headline}</p>
              <p className="mt-2 text-sm leading-6 text-cream/85">{metric.detail}</p>
            </div>
          </article>
        ))}
      </div>

      <ExplainPanel symbol={snapshot.stock.symbol} />
      <MoodPanel symbol={snapshot.stock.symbol} news={snapshot.news} />

      <section>
        <h2 className="font-display text-3xl">What the words mean</h2>
        <dl className="mt-4 grid gap-3 md:grid-cols-2">
          {GLOSSARY.map((entry) => (
            <div key={entry.term} className="rounded-2xl border border-cream/10 p-4">
              <dt className="text-gold">{entry.term}</dt>
              <dd className="mt-1 text-sm leading-6 text-mist">{entry.plain}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
