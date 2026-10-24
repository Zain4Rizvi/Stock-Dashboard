"use client";

import { Button } from "@/components/ui/Button";
import { useDesk } from "@/lib/storage/desk";
import Link from "next/link";

export function AddToPortfolio({ symbol }: { symbol: string }) {
  const add = useDesk((state) => state.addHolding);
  const saved = useDesk((state) => state.holdings.some((holding) => holding.symbol === symbol));
  if (saved) {
    return (
      <Link href="/portfolio" className="rounded-full border border-aurora/40 px-4 py-2 text-sm text-aurora">
        In your practice portfolio
      </Link>
    );
  }
  return (
    <Button variant="ghost" onClick={() => add(symbol)}>
      Add to practice portfolio
    </Button>
  );
}
