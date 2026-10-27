"use client";

import { Button } from "@/components/ui/Button";
import { useDesk } from "@/lib/storage/desk";
import Link from "next/link";

export function WatchStar({ symbol }: { symbol: string }) {
  const on = useDesk((state) => state.watchlist.includes(symbol));
  const toggle = useDesk((state) => state.toggleWatch);
  return (
    <Button
      variant="ghost"
      aria-pressed={on}
      aria-label={on ? `Remove ${symbol} from starred names` : `Star ${symbol}`}
      onClick={() => toggle(symbol)}
    >
      {on ? "Starred" : "Star"}
    </Button>
  );
}

export function AddToPortfolio({ symbol }: { symbol: string }) {
  const add = useDesk((state) => state.addHolding);
  const saved = useDesk((state) => state.holdings.some((holding) => holding.symbol === symbol));
  if (saved) {
    return (
      <Link href="/portfolio" className="rounded-full border border-aurora/40 px-4 py-2 text-sm text-aurora">
        In your portfolio
      </Link>
    );
  }
  return (
    <Button variant="ghost" onClick={() => add(symbol)}>
      Add to portfolio
    </Button>
  );
}
