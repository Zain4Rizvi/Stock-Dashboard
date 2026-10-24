"use client";

import { Button } from "@/components/ui/Button";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { projectPortfolio } from "@/lib/finance/compound";
import { formatCad, formatPercent } from "@/lib/format";
import { useDesk } from "@/lib/storage/desk";
import type { ExplorerItem } from "@/types/market";
import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import Link from "next/link";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["#ff5a45", "#5ee0a0", "#f0c96a", "#8eb7ff", "#ff8fbf", "#ffb15e", "#c6a4ff", "#7ddec8"];
const ASSUMED_GROWTH = 0.06;
const HORIZONS = [1, 5, 10] as const;

function Chip({ item }: { item: ExplorerItem }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.symbol });
  const add = useDesk((state) => state.addHolding);
  return (
    <div ref={setNodeRef} className={`flex items-center gap-2 rounded-full border border-cream/15 bg-pine px-3 py-1 ${isDragging ? "opacity-50" : ""}`}>
      <button type="button" className="cursor-grab text-sm" {...listeners} {...attributes}>
        {item.symbol.replace(".TO", "")}
      </button>
      <button type="button" className="text-xs text-gold" onClick={() => add(item.symbol)}>
        Add
      </button>
    </div>
  );
}

function Basket() {
  const { setNodeRef, isOver } = useDroppable({ id: "portfolio" });
  return (
    <div ref={setNodeRef} className={`rounded-3xl border border-dashed px-4 py-6 text-sm ${isOver ? "border-aurora text-aurora" : "border-cream/20 text-mist"}`}>
      Drop a company here, or press Add. You are not buying anything.
    </div>
  );
}

export function PortfolioDesk({ universe }: { universe: ExplorerItem[] }) {
  const holdings = useDesk((state) => state.holdings);
  const add = useDesk((state) => state.addHolding);
  const remove = useDesk((state) => state.removeHolding);
  const setDollars = useDesk((state) => state.setDollars);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const bySymbol = new Map(universe.map((item) => [item.symbol, item]));
  const rows = holdings
    .map((holding) => {
      const item = bySymbol.get(holding.symbol);
      if (!item) return null;
      return { ...holding, item };
    })
    .filter((row): row is { symbol: string; dollars: number; item: ExplorerItem } => row != null);
  const total = rows.reduce((sum, row) => sum + row.dollars, 0);
  const income = rows.reduce((sum, row) => sum + (row.dollars * (row.item.dividendYield ?? 0)) / 100, 0);
  const past = total
    ? rows.reduce((sum, row) => sum + (row.dollars / total) * (row.item.oneYearReturn ?? 0), 0)
    : 0;

  function onDragEnd(event: DragEndEvent) {
    if (event.over?.id === "portfolio") add(String(event.active.id));
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8">
        <header>
          <h1 className="font-display text-5xl">A practice portfolio</h1>
          <p className="mt-3 max-w-2xl leading-7 text-mist">
            This page is a sandbox for a portfolio: the companies you pick, and how many pretend dollars sit in each one. A portfolio is just that mix. A what-if further down asks what that pile would be if it grew at a pace we assumed. You are not opening an account.
          </p>
        </header>
        <Disclaimer prominent />
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h2 className="text-sm text-gold">The shelf</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {universe.map((item) => (
                <Chip key={item.symbol} item={item} />
              ))}
            </div>
          </div>
          <div className="grid gap-4">
            <Basket />
            {rows.length === 0 ? null : (
              <ul className="grid gap-3">
                {rows.map((row) => (
                    <li key={row.symbol} className="grid items-center gap-3 rounded-2xl border border-cream/10 p-3 sm:grid-cols-[1fr_auto_auto]">
                    <div>
                      <Link href={`/stock/${row.symbol}`} className="font-medium">
                        {row.item.name}
                      </Link>
                      <p className="text-xs text-mist">{row.item.sector}</p>
                    </div>
                    <label className="text-xs text-mist">
                      Pretend dollars
                      <input
                        className="mt-1 w-28 rounded-xl border border-cream/15 bg-pine px-2 py-1 text-cream"
                        type="number"
                        min={1}
                        value={row.dollars}
                        onChange={(event) => setDollars(row.symbol, Number(event.target.value))}
                      />
                    </label>
                    <Button variant="quiet" onClick={() => remove(row.symbol)}>
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        {total > 0 ? (
          <section className="grid items-center gap-6 rounded-3xl border border-cream/10 bg-pine/70 p-5 md:grid-cols-2">
            <div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={rows.map((row) => ({ name: row.symbol, value: row.dollars }))} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                      {rows.map((row, index) => (
                        <Cell key={row.symbol} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCad(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="flex flex-wrap justify-center gap-3 text-xs text-mist">
                {rows.map((row, index) => (
                  <li key={row.symbol} className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[index % COLORS.length] }} aria-hidden="true" />
                    {row.symbol}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-display text-3xl">{formatCad(total)} on paper</p>
              <p className="mt-3 leading-7">
                If every company kept paying the same cash dividend, this mix would pay about {formatCad(income)} in a year. A dividend is cash some companies hand out. Some of these pay nothing, and the amounts change.
              </p>
              <p className="mt-3 text-sm leading-6 text-mist">
                Over the past year, a mix with these weights would have moved about {formatPercent(past, 1, true)}. Weight means a company&apos;s share of the pile. That is history wearing a costume. It is not next year.
              </p>
              <PortfolioForecast rows={rows} />
            </div>
          </section>
        ) : null}
      </div>
    </DndContext>
  );
}

function PortfolioForecast({ rows }: { rows: { dollars: number }[] }) {
  const forecast = HORIZONS.flatMap((years) => {
    const value = projectPortfolio(rows, ASSUMED_GROWTH, years);
    return value == null ? [] : [{ years, value }];
  });
  if (forecast.length === 0) return null;
  const tallest = Math.max(...forecast.map((row) => row.value));
  const pace = formatPercent(ASSUMED_GROWTH * 100, 0);
  return (
    <div className="mt-5 grid gap-3">
      <h2 className="font-display text-2xl">If it grew at {pace} a year</h2>
      <p className="text-sm leading-6 text-mist">
        What-if, not a promise. This assumes the whole pile grows at that pace and you add nothing. The market does not owe you that.
      </p>
      <ul className="grid gap-2">
        {forecast.map((row) => (
          <li key={row.years}>
            <div className="flex justify-between text-sm">
              <span>{row.years === 1 ? "1 year" : `${row.years} years`}</span>
              <span>{formatCad(row.value)}</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-cream/10" aria-hidden="true">
              <div
                className="h-2 rounded-full bg-aurora"
                style={{ width: `${tallest > 0 ? (row.value / tallest) * 100 : 0}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
