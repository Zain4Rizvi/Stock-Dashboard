"use client";

import { Button } from "@/components/ui/Button";
import { UniverseBadge } from "@/components/ui/DataBadge";
import { PriceChart } from "@/features/scorecard/PriceChart";
import { PricePointSchema, QuoteSchema, StockSchema } from "@/lib/data/schemas";
import { formatCad, formatPercent } from "@/lib/format";
import type { ExplorerItem } from "@/types/market";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { Heatmap } from "./Heatmap";
import { popTrail, pushTrail, resolvePreview } from "./trail";

const TRAIL_KEY = "maple-stock-trail";

const ChartPayload = z.object({
  stock: StockSchema.pick({ symbol: true, name: true }),
  quote: QuoteSchema.pick({ price: true, change: true, changePercent: true }),
  history: z.array(PricePointSchema),
});

type ChartPayload = z.infer<typeof ChartPayload>;

function readTrail(): string[] {
  try {
    const raw = sessionStorage.getItem(TRAIL_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

function writeTrail(trail: string[]) {
  try {
    sessionStorage.setItem(TRAIL_KEY, JSON.stringify(trail));
  } catch {
    // Private mode can refuse storage. The trail in state still works for this view.
  }
}

function largestSymbol(universe: ExplorerItem[]): string {
  return universe.reduce((best, item) => (item.marketCap > best.marketCap ? item : best)).symbol;
}

function replaceSymbol(symbol: string) {
  const next = `/heatmap?symbol=${encodeURIComponent(symbol)}`;
  if (`${window.location.pathname}${window.location.search}` === next) return;
  window.history.replaceState(window.history.state, "", next);
}

export function StockLookup({ universe, querySymbol }: { universe: ExplorerItem[]; querySymbol: string | null }) {
  const hydrated = useRef(false);
  const fallback = useMemo(() => largestSymbol(universe), [universe]);
  const known = useMemo(() => new Set(universe.map((item) => item.symbol)), [universe]);
  const [trail, setTrail] = useState<string[] | null>(null);
  const [query, setQuery] = useState("");
  const [chart, setChart] = useState<ChartPayload | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const current = trail?.at(-1) ?? null;
  const prior = trail && trail.length > 1 ? trail[trail.length - 2] : null;
  const selected = universe.find((item) => item.symbol === current) ?? null;

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    const resolved = resolvePreview(querySymbol, readTrail(), known, fallback);
    setTrail(resolved.trail);
    writeTrail(resolved.trail);
    replaceSymbol(resolved.symbol);
  }, [fallback, known, querySymbol]);

  useEffect(() => {
    if (!current) return;
    const controller = new AbortController();
    let cancelled = false;
    setStatus("loading");
    fetch(`/api/stocks/${encodeURIComponent(current)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(String(response.status));
        const parsed = ChartPayload.safeParse(await response.json());
        if (!parsed.success) throw new Error("shape");
        if (cancelled) return;
        setChart(parsed.data);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (cancelled || (error instanceof Error && error.name === "AbortError")) return;
        setStatus("error");
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [current]);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return universe
      .filter((item) => item.symbol.toLowerCase().includes(needle) || item.name.toLowerCase().includes(needle))
      .slice(0, 8);
  }, [query, universe]);

  function select(symbol: string) {
    const next = pushTrail(trail ?? [], symbol);
    setTrail(next);
    writeTrail(next);
    setQuery("");
    replaceSymbol(symbol);
  }

  function previous() {
    if (!trail) return;
    const next = popTrail(trail);
    const symbol = next.at(-1);
    if (!symbol || next.length === trail.length) return;
    setTrail(next);
    writeTrail(next);
    replaceSymbol(symbol);
  }

  const quote = chart?.stock.symbol === current ? chart.quote : null;
  const price = quote?.price ?? selected?.price ?? 0;
  const change = quote?.change ?? selected?.change ?? 0;
  const changePercent = quote?.changePercent ?? selected?.changePercent ?? 0;

  return (
    <div className="grid gap-6">
      <UniverseBadge universe={universe} />
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          if (matches[0]) select(matches[0].symbol);
        }}
      >
        <label className="block">
          <span className="sr-only">Search stocks</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search RY.TO or Royal Bank"
            autoComplete="off"
            aria-expanded={matches.length > 0}
            aria-controls="stock-search-results"
            className="w-full min-w-0 rounded-2xl border border-cream/15 bg-pine px-4 py-3 text-cream outline-none placeholder:text-mist"
          />
        </label>
        {query.trim() && matches.length === 0 ? (
          <p className="mt-2 text-sm text-mist">No TSX name matches that.</p>
        ) : null}
        {matches.length > 0 ? (
          <ul id="stock-search-results" className="mt-2 overflow-hidden rounded-2xl border border-cream/15 bg-pine">
            {matches.map((item) => (
              <li key={item.symbol}>
                <button
                  type="button"
                  className="flex w-full items-baseline justify-between gap-3 px-4 py-2 text-left text-sm hover:bg-cream/10"
                  onClick={() => select(item.symbol)}
                >
                  <span>{item.name}</span>
                  <span className="text-mist">{item.symbol}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </form>

      <section className="grid gap-4" aria-live="polite">
        {selected ? (
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-4xl leading-none">{selected.name}</h2>
              <p className="mt-2 text-gold">{selected.symbol}</p>
              <p className={change >= 0 ? "mt-1 text-aurora" : "mt-1 text-loss"}>
                {formatCad(price)} · {formatCad(change)} ({formatPercent(changePercent, 2, true)}) today
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {prior ? (
                <Button variant="ghost" onClick={previous}>
                  Previous {prior.replace(/\.TO$/, "")}
                </Button>
              ) : null}
              <Link
                href={`/stock/${encodeURIComponent(selected.symbol)}`}
                aria-label={`See more about ${selected.name}`}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-maple px-4 py-2 text-sm font-medium text-ink transition hover:bg-[#ff7463]"
              >
                See more
              </Link>
            </div>
          </div>
        ) : null}
        {status !== "error" && chart ? (
          <PriceChart key={chart.stock.symbol} history={chart.history} />
        ) : (
          <div className="grid h-72 place-items-center rounded-3xl border border-cream/10 bg-pine/80 p-4 text-center text-sm text-mist">
            {status === "error"
              ? "Could not load that chart. The quilt below still works."
              : "Drawing the chart…"}
          </div>
        )}
      </section>

      <Heatmap universe={universe} selected={current} onSelect={select} />
    </div>
  );
}
