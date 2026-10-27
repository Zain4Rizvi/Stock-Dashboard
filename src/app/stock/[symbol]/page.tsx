import { ScorecardView } from "@/features/scorecard/Scorecard";
import { getGateway } from "@/lib/data";
import { parseTsxSymbol } from "@/lib/data/symbols";
import { scoreStock } from "@/lib/scoring/score";
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
  if (!snapshot) notFound();
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
