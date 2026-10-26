import { CompareDesk } from "@/features/compare/CompareDesk";
import { getGateway } from "@/lib/data";
import { parseTsxSymbol } from "@/lib/data/symbols";
import { scoreStock } from "@/lib/scoring/score";
import { connection } from "next/server";
import { Suspense } from "react";

async function CompareBody({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = typeof params.symbols === "string" ? params.symbols : "";
  const symbols = raw
    .split(",")
    .map((symbol) => parseTsxSymbol(symbol))
    .filter((symbol): symbol is string => symbol != null)
    .slice(0, 3);
  await connection();
  const gateway = await getGateway();
  const universe = await gateway.getExplorer();
  const cards = [];
  for (const symbol of symbols) {
    const snapshot = await gateway.getSnapshot(symbol);
    if (!snapshot) continue;
    cards.push({
      symbol,
      name: snapshot.stock.name,
      score: scoreStock({
        name: snapshot.stock.name,
        sector: snapshot.stock.sector,
        fundamentals: snapshot.fundamentals,
        history: snapshot.history,
      }),
    });
  }
  return <CompareDesk universe={universe} selected={symbols} cards={cards} />;
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<p className="px-4 py-10 text-mist">Lining them up…</p>}>
      <CompareBody searchParams={searchParams} />
    </Suspense>
  );
}
