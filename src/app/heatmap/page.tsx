import { StockLookup } from "@/features/heatmap/StockLookup";
import { getGateway } from "@/lib/data";
import { parseTsxSymbol } from "@/lib/data/symbols";
import { connection } from "next/server";
import { Suspense } from "react";

async function MapBody({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = typeof params.symbol === "string" ? params.symbol : "";
  const querySymbol = raw ? parseTsxSymbol(raw) : null;
  await connection();
  const universe = await (await getGateway()).getExplorer();
  if (universe.length === 0) {
    return (
      <div className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-8">
        <h1 className="font-display text-5xl text-balance">Look up a stock</h1>
        <p className="max-w-2xl leading-7 text-mist">The snapshot failed to load.</p>
      </div>
    );
  }
  const demo = universe.some((item) => item.freshness === "demo");
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8">
      <header>
        <h1 className="font-display text-5xl text-balance">Look up a stock</h1>
        <p className="mt-3 max-w-2xl leading-7 text-mist">
          Search a name or ticker and the chart stays here. See more opens the company page. The quilt below is
          sized by company value. Green means the share price rose, red means it fell. Each percent is that price
          change, not a total return and not the TSX composite.
          {demo ? " This quilt is demo data." : " Colors describe the past year, not a forecast."}
        </p>
      </header>
      <StockLookup universe={universe} querySymbol={querySymbol} />
    </div>
  );
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-6xl px-4 py-8" aria-busy="true" aria-label="Loading the quilt">
          <p className="text-sm text-mist">Loading the quilt</p>
          <div className="page-bone mt-4 h-[70vh] rounded-3xl" />
        </div>
      }
    >
      <MapBody searchParams={searchParams} />
    </Suspense>
  );
}
