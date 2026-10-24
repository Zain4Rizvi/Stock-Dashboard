import { Heatmap } from "@/features/heatmap/Heatmap";
import { getGateway, liveDataEnabled } from "@/lib/data";
import { connection } from "next/server";
import { Suspense } from "react";

async function MapBody() {
  if (liveDataEnabled()) await connection();
  const universe = await getGateway().getExplorer();
  const demo = universe.some((item) => item.freshness === "demo");
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-8">
      <header>
        <h1 className="font-display text-5xl">The market, as a quilt</h1>
        <p className="mt-3 max-w-2xl leading-7 text-mist">
          Bigger rectangles are bigger companies. Green had a stronger past year, red a weaker one. {demo ? "This quilt is demo data." : "Colors describe the past year in the snapshot, not a forecast."}
        </p>
      </header>
      <Heatmap universe={universe} />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<p className="px-4 py-10 text-mist">Stitching the quilt…</p>}>
      <MapBody />
    </Suspense>
  );
}
