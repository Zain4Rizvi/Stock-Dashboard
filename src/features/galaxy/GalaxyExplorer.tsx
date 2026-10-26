"use client";

import { DataBadge } from "@/components/ui/DataBadge";
import { formatCad, formatPercent } from "@/lib/format";
import { useDesk } from "@/lib/storage/desk";
import type { ExplorerItem } from "@/types/market";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { GalaxyFlat } from "./GalaxyFlat";
import { layoutUniverse } from "./layout";

const GalaxyCanvas = dynamic(() => import("./GalaxyCanvas").then((mod) => mod.GalaxyCanvas), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-mist">Lighting the sky…</div>,
});

export function GalaxyExplorer({ universe }: { universe: ExplorerItem[] }) {
  const router = useRouter();
  const mode = useDesk((state) => state.galaxyMode);
  const setMode = useDesk((state) => state.setGalaxyMode);
  const [resolved, setResolved] = useState<"2d" | "3d">("2d");
  const [sector, setSector] = useState("All");
  const [query, setQuery] = useState("");
  const [hover, setHover] = useState<string | null>(null);
  const [focus, setFocus] = useState<string | null>(null);

  useEffect(() => {
    if (mode === "2d" || mode === "3d") {
      setResolved(mode);
      return;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const narrow = window.matchMedia("(max-width: 767px)").matches;
    setResolved(reduce || narrow ? "2d" : "3d");
  }, [mode]);

  const bodies = useMemo(
    () =>
      layoutUniverse(
        universe.map((item) => ({
          symbol: item.symbol,
          sector: item.sector,
          marketCap: item.marketCap,
          pe: item.pe,
          oneYearReturn: item.oneYearReturn,
        })),
      ),
    [universe],
  );
  const sectors = useMemo(() => [...new Set(universe.map((item) => item.sector))].sort(), [universe]);
  const hidden = useMemo(() => {
    if (sector === "All") return new Set<string>();
    return new Set(universe.filter((item) => item.sector !== sector).map((item) => item.symbol));
  }, [sector, universe]);
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return universe
      .filter((item) => item.symbol.toLowerCase().includes(needle) || item.name.toLowerCase().includes(needle))
      .slice(0, 6);
  }, [query, universe]);
  const hovered = universe.find((item) => item.symbol === hover) ?? null;
  const demo = universe.some((item) => item.freshness === "demo");
  const sample = universe[0];

  function open(symbol: string) {
    router.push(`/stock/${symbol}`);
  }

  const panel = (
    <div className="max-w-md rounded-3xl border border-cream/10 bg-ink/80 p-4 backdrop-blur-md">
      <p className="text-xs tracking-[0.18em] text-gold uppercase">TSX, as a sky</p>
      <h1 className="mt-1 font-display text-4xl leading-none">Find a company by looking.</h1>
      <p className="mt-3 text-sm leading-6 text-mist">
        Bigger planets are bigger companies. Greener means a stronger past year, red means a weaker one. Farther from its
        sector sun means you pay more for each dollar of profit.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {sample ? (
          <DataBadge freshness={demo ? "demo" : sample.freshness} source={sample.source} asOf={sample.asOf} />
        ) : null}
        <div className="flex rounded-full border border-cream/15 p-1 text-xs">
          {(["auto", "3d", "2d"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setMode(option)}
              className={`rounded-full px-2.5 py-1 ${mode === option ? "bg-cream text-ink" : "text-mist"}`}
            >
              {option === "auto" ? "Auto" : option.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <label className="mt-3 block text-sm">
        <span className="sr-only">Search companies</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search RY.TO or Shopify"
          className="w-full rounded-2xl border border-cream/15 bg-pine px-3 py-2 text-cream outline-none placeholder:text-mist"
        />
      </label>
      {matches.length > 0 ? (
        <ul className="mt-2 grid gap-1">
          {matches.map((item) => (
            <li key={item.symbol}>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-left text-sm hover:bg-cream/10"
                onClick={() => {
                  setFocus(item.symbol);
                  setHover(item.symbol);
                  setQuery("");
                  if (resolved === "2d") open(item.symbol);
                }}
              >
                <span>
                  {item.symbol}
                  <span className="ml-2 text-mist">{item.name}</span>
                </span>
                <span>{formatPercent(item.oneYearReturn ?? 0, 0, true)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );

  const chips = (
    <div className="flex flex-wrap gap-2">
      {["All", ...sectors].map((name) => (
        <button
          key={name}
          type="button"
          onClick={() => setSector(name)}
          className={`rounded-full px-3 py-1.5 text-sm whitespace-nowrap ${sector === name ? "bg-cream text-ink" : "bg-ink/70 text-cream"}`}
        >
          {name}
        </button>
      ))}
    </div>
  );

  if (resolved === "2d") {
    return (
      <div className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-6">
        {panel}
        {chips}
        <GalaxyFlat bodies={bodies} items={universe} hidden={hidden} onSelect={open} />
      </div>
    );
  }

  return (
    <div className="relative min-h-full flex-1">
      <div className="absolute inset-0">
        <GalaxyCanvas bodies={bodies} focus={focus} hidden={hidden} onHover={setHover} onSelect={open} />
      </div>
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between gap-4 p-4 md:p-6">
        <div className="pointer-events-auto">{panel}</div>
        <div className="pointer-events-auto flex flex-wrap items-end justify-between gap-3">
          {chips}
          {hovered ? (
            <article className="w-64 rounded-3xl border border-cream/15 bg-ink/85 p-4 backdrop-blur">
              <p className="font-display text-3xl leading-none">{hovered.symbol}</p>
              <p className="mt-1 text-sm text-mist">{hovered.name}</p>
              <p className="mt-3 text-lg">{formatCad(hovered.price)}</p>
              <p className={hovered.oneYearReturn != null && hovered.oneYearReturn < 0 ? "text-loss" : "text-aurora"}>
                {formatPercent(hovered.oneYearReturn ?? 0, 1, true)} over the past year
              </p>
            </article>
          ) : (
            <p className="rounded-full bg-ink/70 px-3 py-1.5 text-xs text-mist">Drag to look around. Scroll to zoom. Click a planet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
