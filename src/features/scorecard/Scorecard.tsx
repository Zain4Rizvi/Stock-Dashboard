import { DataBadge } from "@/components/ui/DataBadge";
import { replayWindow } from "@/lib/finance/returns";
import { formatCad, formatCompactCad, formatNumber, formatPercent } from "@/lib/format";
import { GLOSSARY } from "@/lib/scoring/glossary";
import type { Scorecard as ScorecardModel } from "@/lib/scoring/score";
import type { Snapshot } from "@/types/market";
import Link from "next/link";
import { AddToPortfolio, WatchStar } from "./AddToPortfolio";
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

const METRIC_TERMS = {
  valuation: ["P/E"],
  profitability: ["ROE"],
  growth: ["EPS growth"],
  income: ["Dividend yield", "Payout ratio"],
  resilience: ["Debt/equity"],
} as const;

function glossaryNotes(id: keyof typeof METRIC_TERMS) {
  const terms: readonly string[] = METRIC_TERMS[id];
  return GLOSSARY.filter((entry) => terms.includes(entry.term));
}

function pastPriceChange(history: Snapshot["history"], value: number | null): string | null {
  const endDate = history[history.length - 1]?.date;
  if (value == null || !endDate) return null;
  const points = replayWindow(history, "1Y", endDate).points;
  const start = points[0]?.date;
  const end = points[points.length - 1]?.date;
  if (!start || !end) return null;
  return `${formatPercent(value, 1, true)} price change ${start} to ${end}. Not a total return and not the TSX composite.`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

function formatSnapshotDay(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const month = MONTHS[Number(match[2]) - 1];
  if (!month) return iso;
  return `${month} ${Number(match[3])}, ${match[1]}`;
}

function SnapshotDates({ quote }: { quote: Snapshot["quote"] }) {
  const rows: { label: string; day: string }[] = [];
  if (quote.exDividendDate) rows.push({ label: "Ex-dividend", day: quote.exDividendDate });
  if (quote.earningsDate) rows.push({ label: "Earnings", day: quote.earningsDate });
  return (
    <section className="rounded-3xl border border-cream/10 bg-pine/70 p-5">
      <h2 className="font-display text-3xl">Dates</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-mist">Dates are not in this snapshot.</p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {rows.map((row) => (
            <li key={row.label} className="flex items-baseline justify-between gap-3">
              <span>{row.label}</span>
              <span className="text-mist">{formatSnapshotDay(row.day)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function GradeBadge({ grade }: { grade: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full border border-cream/20 px-2 py-1 font-display text-sm leading-none ${GRADE_COLOR[grade] ?? "text-mist"}`}
    >
      {grade}
    </span>
  );
}

export function ScorecardView({ snapshot, score }: { snapshot: Snapshot; score: ScorecardModel }) {
  const changeUp = snapshot.quote.change >= 0;
  const volume = snapshot.quote.volume;
  const priceChange = pastPriceChange(snapshot.history, score.oneYearReturn);
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8">
      <header className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <Link
            href={`/heatmap?symbol=${encodeURIComponent(snapshot.stock.symbol)}`}
            className="text-sm text-mist hover:text-cream"
          >
            Back to stocks
          </Link>
          <p className="mt-3 text-sm text-mist">{snapshot.stock.sector}</p>
          <h1 className="font-display text-5xl leading-none">{snapshot.stock.name}</h1>
          <p className="mt-2 text-lg text-gold">{snapshot.stock.symbol}</p>
          <p className="mt-4 max-w-2xl text-lg leading-8">{snapshot.stock.blurb}</p>
        </div>
        <div className="rounded-3xl border border-cream/10 bg-pine/80 p-5">
          <div className="flex flex-wrap gap-2">
            <DataBadge
              freshness={snapshot.freshness}
              source={snapshot.source}
              asOf={snapshot.quote.asOf}
              fetchedAt={snapshot.quote.fetchedAt}
              fallback={snapshot.fallback}
              generatedAt={snapshot.generatedAt}
            />
          </div>
          <p className="mt-3 font-display text-4xl">{formatCad(snapshot.quote.price)}</p>
          <p className={changeUp ? "text-aurora" : "text-loss"}>
            {formatCad(snapshot.quote.change)} ({formatPercent(snapshot.quote.changePercent, 2, true)}) today
          </p>
          <p className="mt-2 text-sm text-mist">
            About {formatCompactCad(snapshot.quote.marketCap ?? 0)}{" "}
            {snapshot.stock.kind === "fund" ? "in the fund" : "of company"}
          </p>
          {volume != null && volume > 0 ? (
            <p className="text-sm text-mist">{formatNumber(volume, 0)} shares traded</p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <AddToPortfolio symbol={snapshot.stock.symbol} />
            <WatchStar symbol={snapshot.stock.symbol} />
            <Link href={`/compare?symbols=${snapshot.stock.symbol}`} className="rounded-full px-4 py-2 text-sm text-mist hover:text-cream">
              Compare
            </Link>
          </div>
        </div>
      </header>

      <PriceChart history={snapshot.history} />

      <SnapshotDates quote={snapshot.quote} />

      <section className="flex items-start gap-4 rounded-3xl border border-cream/10 bg-ink/40 p-5">
        <GradeBadge grade={score.overall} />
        <div>
          <p className="leading-7">{score.summary}</p>
          {priceChange ? <p className="mt-2 text-sm text-mist">{priceChange}</p> : null}
          <p className="mt-1 text-sm text-mist">Grades describe the latest numbers. They are not a buy rating.</p>
        </div>
      </section>

      <div className="grid gap-3">
        {score.metrics.map((metric) => (
          <article key={metric.id} className="rounded-3xl border border-cream/10 bg-pine/70 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-4xl leading-none">{metric.display}</p>
                <h3 className="mt-2 text-sm tracking-wide text-mist uppercase">{metric.label}</h3>
              </div>
              <GradeBadge grade={metric.grade} />
            </div>
            <p className="mt-3 leading-7">{metric.headline}</p>
            <details className="mt-2">
              <summary className="cursor-pointer text-sm text-mist">Why this grade</summary>
              <div className="mt-2 grid gap-2 text-sm leading-6">
                <p className="text-cream/85">{metric.detail}</p>
                {glossaryNotes(metric.id).map((entry) => (
                  <p key={entry.term} className="text-mist">
                    <span className="text-gold">{entry.term}.</span> {entry.plain}
                  </p>
                ))}
              </div>
            </details>
          </article>
        ))}
      </div>

      <ExplainPanel symbol={snapshot.stock.symbol} />
      <MoodPanel symbol={snapshot.stock.symbol} news={snapshot.news} />
    </div>
  );
}
