import { CanadaDesk } from "@/features/canada/CanadaDesk";
import { getGateway } from "@/lib/data";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "In Canada · Maple Market",
  description: "Plain-language notes on TFSA, RRSP, FHSA, dividend tax, and a few Canadian funds.",
};

async function Body() {
  await connection();
  const universe = await (await getGateway()).getExplorer();
  return <CanadaDesk universe={universe} />;
}

export default function Page() {
  return (
    <Suspense fallback={<p className="px-4 py-10 text-mist">Loading…</p>}>
      <Body />
    </Suspense>
  );
}
