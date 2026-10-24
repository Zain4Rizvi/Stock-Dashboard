import { PortfolioDesk } from "@/features/portfolio/PortfolioDesk";
import { getGateway, liveDataEnabled } from "@/lib/data";
import { connection } from "next/server";
import { Suspense } from "react";

async function Body() {
  if (liveDataEnabled()) await connection();
  const universe = await getGateway().getExplorer();
  return <PortfolioDesk universe={universe} />;
}

export default function Page() {
  return (
    <Suspense fallback={<p className="px-4 py-10 text-mist">Clearing a table…</p>}>
      <Body />
    </Suspense>
  );
}
