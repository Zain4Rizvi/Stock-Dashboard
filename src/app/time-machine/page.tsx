import { TimeMachine } from "@/features/timemachine/TimeMachine";
import { getGateway, liveDataEnabled } from "@/lib/data";
import { parseTsxSymbol } from "@/lib/data/symbols";
import { connection } from "next/server";
import { Suspense } from "react";

async function Body({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const symbol = typeof params.symbol === "string" ? parseTsxSymbol(params.symbol) : null;
  if (liveDataEnabled()) await connection();
  const gateway = getGateway();
  const universe = await gateway.getExplorer();
  const snapshot = symbol ? await gateway.getSnapshot(symbol) : null;
  return <TimeMachine universe={universe} snapshot={snapshot} initialDollars={1000} />;
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<p className="px-4 py-10 text-mist">Rewinding…</p>}>
      <Body searchParams={searchParams} />
    </Suspense>
  );
}
