import { DividendLab } from "@/features/dividends/DividendLab";
import { getGateway } from "@/lib/data";
import { connection } from "next/server";
import { Suspense } from "react";

async function Body() {
  await connection();
  const universe = await (await getGateway()).getExplorer();
  return <DividendLab universe={universe} />;
}

export default function Page() {
  return (
    <Suspense fallback={<p className="px-4 py-10 text-mist">Loading…</p>}>
      <Body />
    </Suspense>
  );
}
