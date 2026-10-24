"use client";

import { formatPercent } from "@/lib/format";
import type { ExplorerItem } from "@/types/market";
import type { PlacedBody } from "./layout";

export function GalaxyFlat({
  bodies,
  items,
  hidden,
  onSelect,
}: {
  bodies: PlacedBody[];
  items: ExplorerItem[];
  hidden: Set<string>;
  onSelect: (symbol: string) => void;
}) {
  const bySymbol = new Map(items.map((item) => [item.symbol, item]));
  const sectors = [...new Set(bodies.map((body) => body.sector))];
  return (
    <div className="grid gap-6 p-4 md:p-6">
      {sectors.map((sector) => (
        <section key={sector}>
          <h2 className="mb-3 font-display text-2xl">{sector}</h2>
          <div className="flex flex-wrap gap-3">
            {bodies
              .filter((body) => body.sector === sector && !hidden.has(body.symbol))
              .map((body) => {
                const item = bySymbol.get(body.symbol);
                const change = item?.oneYearReturn ?? 0;
                return (
                  <button
                    key={body.symbol}
                    type="button"
                    onClick={() => onSelect(body.symbol)}
                    className="grid place-items-center rounded-full border border-cream/15 text-center text-xs font-medium text-ink"
                    style={{
                      width: 72 + body.radius * 36,
                      height: 72 + body.radius * 36,
                      background: body.color,
                    }}
                  >
                    <span>
                      {body.symbol.replace(".TO", "")}
                      <span className="mt-1 block text-[10px]">{formatPercent(change, 0, true)}</span>
                    </span>
                  </button>
                );
              })}
          </div>
        </section>
      ))}
    </div>
  );
}
