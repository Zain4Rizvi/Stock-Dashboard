import { GalaxyExplorer } from "@/features/galaxy/GalaxyExplorer";
import { getGateway, liveDataEnabled } from "@/lib/data";
import { connection } from "next/server";
import { Suspense } from "react";

async function Sky() {
  if (liveDataEnabled()) await connection();
  const universe = await getGateway().getExplorer();
  return <GalaxyExplorer universe={universe} />;
}

export default function Home() {
  return (
    <Suspense fallback={<div className="grid flex-1 place-items-center text-sm text-mist">Setting the sky…</div>}>
      <Sky />
    </Suspense>
  );
}
