"use client";

import { returnToColor } from "@/features/galaxy/layout";
import { formatPercent } from "@/lib/format";
import type { ExplorerItem } from "@/types/market";
import { hierarchy, treemap } from "d3";
import { useEffect, useMemo, useState } from "react";

interface Leaf {
  name: string;
  value?: number;
  item?: ExplorerItem;
  children?: Leaf[];
}

export function Heatmap({
  universe,
  selected,
  onSelect,
}: {
  universe: ExplorerItem[];
  selected: string | null;
  onSelect: (symbol: string) => void;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const width = 1080;
  const height = 680;
  const leaves = useMemo(() => {
    const sectors = [...new Set(universe.map((item) => item.sector))].sort();
    const root = hierarchy<Leaf>({
      name: "TSX",
      children: sectors.map((sector) => ({
        name: sector,
        children: universe
          .filter((item) => item.sector === sector)
          .map((item) => ({ name: item.symbol, value: Math.max(item.marketCap, 1), item })),
      })),
    })
      .sum((node) => node.value ?? 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    treemap<Leaf>().size([width, height]).paddingOuter(4).paddingInner(3).paddingTop(22)(root);
    return root.leaves() as unknown as Array<{
      x0: number;
      y0: number;
      x1: number;
      y1: number;
      data: Leaf;
    }>;
  }, [universe]);

  if (!ready) return <div className="h-[70vh] rounded-3xl border border-cream/10" />;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[720px] w-full" aria-label="Market quilt sized by company value and colored by the past year">
        {leaves.map((leaf) => {
          const item = leaf.data.item;
          if (!item) return null;
          const x0 = leaf.x0 ?? 0;
          const y0 = leaf.y0 ?? 0;
          const x1 = leaf.x1 ?? 0;
          const y1 = leaf.y1 ?? 0;
          const w = x1 - x0;
          const h = y1 - y0;
          const active = item.symbol === selected;
          const pastYear = formatPercent(item.oneYearReturn ?? 0, 0, true);
          return (
            <g
              key={item.symbol}
              transform={`translate(${x0},${y0})`}
              className="cursor-pointer"
              role="button"
              tabIndex={0}
              aria-pressed={active}
              aria-label={`${item.name}, ${item.symbol}, past year ${pastYear}`}
              onClick={() => onSelect(item.symbol)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                onSelect(item.symbol);
              }}
            >
              <rect
                width={w}
                height={h}
                rx={8}
                fill={returnToColor(item.oneYearReturn ?? 0)}
                stroke={active ? "#f4f0e6" : "transparent"}
                strokeWidth={active ? 4 : 0}
              />
              {w > 54 && h > 36 ? (
                <>
                  <text x={10} y={22} fill="#07110d" fontSize={14} fontWeight={650}>
                    {item.symbol.replace(".TO", "")}
                  </text>
                  <text x={10} y={40} fill="#07110d" fontSize={12}>
                    {pastYear}
                  </text>
                </>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
