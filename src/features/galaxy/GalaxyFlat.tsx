"use client";

import { displayName, formatPercent } from "@/lib/format";
import { sectorLabel, sectorPlain } from "@/lib/scoring/glossary";
import type { ExplorerItem } from "@/types/market";
import type { PlacedBody } from "./layout";

const NOT_THE_INDEX = "Not a total return and not the TSX composite.";

function priceChangeLabel(item: ExplorerItem | undefined, digits: number) {
  if (!item || item.oneYearReturn == null || !item.returnStart || !item.returnEnd) return null;
  return {
    percent: formatPercent(item.oneYearReturn, digits, true),
    window: `price change ${item.returnStart} to ${item.returnEnd}`,
  };
}

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
          <h2 className="mb-3 font-display text-2xl" title={sectorPlain(sector)}>
            {sectorLabel(sector)}
          </h2>
          <div className="flex flex-wrap gap-3">
            {bodies
              .filter((body) => body.sector === sector && !hidden.has(body.symbol))
              .map((body) => {
                const item = bySymbol.get(body.symbol);
                const shown = displayName(item?.name ?? "", body.symbol);
                const label = priceChangeLabel(item, 0);
                const size = 72 + body.radius * 36;
                return (
                  <div key={body.symbol} className="grid justify-items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onSelect(body.symbol)}
                      aria-label={
                        label
                          ? `${item?.name ?? body.symbol}, ${body.symbol}, ${label.percent} ${label.window}. ${NOT_THE_INDEX}`
                          : `${body.symbol}, price change unavailable`
                      }
                      className="grid place-items-center rounded-full border border-cream/15 text-center text-xs font-medium text-ink"
                      style={{ width: size, height: size, background: body.color }}
                    >
                      <span className="block max-w-[88%] px-1 text-center leading-tight">
                        <span className="block text-[11px] font-semibold">{shown.name}</span>
                        <span className="block text-[10px]">{shown.ticker}</span>
                        {label ? <span className="mt-0.5 block text-[10px]">{label.percent}</span> : null}
                      </span>
                    </button>
                    {label ? (
                      <p className="max-w-40 text-center text-[10px] leading-snug text-mist">
                        {label.window}. {NOT_THE_INDEX}
                      </p>
                    ) : null}
                  </div>
                );
              })}
          </div>
        </section>
      ))}
    </div>
  );
}
