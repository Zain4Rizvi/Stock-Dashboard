import { Disclaimer } from "@/components/ui/Disclaimer";
import { ScorecardView } from "@/features/scorecard/Scorecard";
import { getGateway } from "@/lib/data";
import { UNIVERSE } from "@/lib/data/seed/universe";
import { parseTsxSymbol } from "@/lib/data/symbols";
import { scoreStock } from "@/lib/scoring/score";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";

export async function generateStaticParams() {
  const rows = await (await getGateway()).getExplorer();
  return rows.map((row) => ({ symbol: row.symbol }));
}

async function StockBody({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  await connection();
  const parsed = parseTsxSymbol(symbol);
  if (!parsed) notFound();
  const snapshot = await (await getGateway()).getSnapshot(parsed);
  if (!snapshot) {
    const fund = UNIVERSE.find((company) => company.symbol === parsed && company.kind === "fund");
    if (!fund) notFound();
    return (
      <div className="mx-auto grid w-full max-w-3xl gap-4 px-4 py-10">
        <p className="text-sm tracking-wide text-gold uppercase">Broad fund</p>
        <h1 className="font-display text-5xl">{fund.name}</h1>
        <p className="text-mist">{fund.symbol}</p>
        <p className="leading-7">{fund.blurb}</p>
        <p className="leading-7">
          A fund is a basket, so it does not get a company letter grade. No price is saved yet, so this page has no chart. A weekday update can add one. This is an example of a fund on the shelf, not a suggestion to buy it.
        </p>
        <Disclaimer prominent />
        <p className="text-sm">
          <Link href="/canada" className="text-gold underline decoration-cream/30 underline-offset-2">
            Canada notes
          </Link>
          <span className="px-2 text-mist" aria-hidden="true">
            ·
          </span>
          <Link href="/start" className="text-gold underline decoration-cream/30 underline-offset-2">
            Back to Start
          </Link>
        </p>
      </div>
    );
  }
  const score = scoreStock({
    name: snapshot.stock.name,
    sector: snapshot.stock.sector,
    kind: snapshot.stock.kind,
    fundamentals: snapshot.fundamentals,
    history: snapshot.history,
  });
  return <ScorecardView snapshot={snapshot} score={score} />;
}

export default function Page({ params }: { params: Promise<{ symbol: string }> }) {
  return (
    <Suspense fallback={<p className="px-4 py-10 text-mist">Loading…</p>}>
      <StockBody params={params} />
    </Suspense>
  );
}
