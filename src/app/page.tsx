import { GalaxyExplorer } from "@/features/galaxy/GalaxyExplorer";
import { getGateway } from "@/lib/data";
import { connection } from "next/server";
import { Suspense } from "react";

async function Sky() {
  await connection();
  const universe = await (await getGateway()).getExplorer();
  return <GalaxyExplorer universe={universe} />;
}

export default function Home() {
  return (
    <Suspense fallback={<div className="grid flex-1 place-items-center text-sm text-mist">Setting the sky…</div>}>
      <Sky />
    </Suspense>
  );
}
