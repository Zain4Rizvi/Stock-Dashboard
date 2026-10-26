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
  const universe = await getGateway().getExplorer();
  const demo = universe.some((item) => item.freshness === "demo");
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8">
      <header>
        <h1 className="font-display text-5xl text-balance">Look up a stock</h1>
        <p className="mt-3 max-w-2xl leading-7 text-mist">
          Search a name or ticker and the chart stays here. See more opens the company page. The quilt below is
          sized by company value: green had a stronger past year, red a weaker one.
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
    <Suspense fallback={<p className="px-4 py-10 text-mist">Stitching the quilt…</p>}>
      <MapBody searchParams={searchParams} />
    </Suspense>
  );
}
