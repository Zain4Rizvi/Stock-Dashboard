import { GalaxyExplorer } from "@/features/galaxy/GalaxyExplorer";
import { getGateway } from "@/lib/data";
import { connection } from "next/server";
import { Suspense } from "react";

async function Sky() {
  await connection();
  const universe = await (await getGateway()).getExplorer();
  return <GalaxyExplorer universe={universe} />;
}

function SkySkeleton() {
  return (
    <div className="grid flex-1 content-center justify-items-center gap-3 px-4" aria-busy="true" aria-label="Loading the sky">
      <p className="text-sm text-mist">Loading the sky</p>
      <div className="page-bone h-36 w-full max-w-lg rounded-3xl" />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<SkySkeleton />}>
      <Sky />
    </Suspense>
  );
}
