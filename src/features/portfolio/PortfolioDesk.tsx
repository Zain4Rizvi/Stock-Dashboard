"use client";

import { DataBadge } from "@/components/ui/DataBadge";
import { Button } from "@/components/ui/Button";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { PricePointSchema, QuoteSchema, StockSchema } from "@/lib/data/schemas";
import { parseHoldingCsv, type HoldingCsvResult } from "@/lib/finance/csv";
import { portfolioOutlook, portfolioValue, type PortfolioFanStep, type PortfolioOutlook } from "@/lib/finance/portfolio";
import { formatCad, formatCompactCad, formatPercent } from "@/lib/format";
import { type Holding, type PracticeAccount, useDesk } from "@/lib/storage/desk";
import type { DataSource, ExplorerItem, Freshness } from "@/types/market";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Area, CartesianGrid, ComposedChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { z } from "zod";

const HoldingSnapshotSchema = z.object({
  stock: StockSchema.pick({ name: true }),
  quote: QuoteSchema.pick({ price: true, asOf: true, fetchedAt: true }),
  fallback: z.boolean().optional(),
  generatedAt: z.string().optional(),
  history: z.array(PricePointSchema),
  isSynthetic: z.boolean(),
  source: z.enum(["synthetic", "yahoo", "fmp", "twelvedata", "alphavantage"]),
  freshness: z.enum(["demo", "snapshot", "live"]),
});

type HoldingSnapshot = z.infer<typeof HoldingSnapshotSchema>;

type ChartRow = {
  t: number;
  label: string;
  actual: number | null;
  p10: number | null;
  span: number | null;
  mid: number | null;
  low: number | null;
  high: number | null;
};

function utcTime(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`);
}

function chartRows(series: { date: string; value: number }[], fan: PortfolioFanStep[]): ChartRow[] {
  const history: ChartRow[] = series.map((point) => ({
    t: utcTime(point.date),
    label: point.date,
    actual: point.value,
    p10: null,
    span: null,
    mid: null,
    low: null,
    high: null,
  }));
  const later = fan.filter((step) => step.year > 0);
  const forecast: ChartRow[] = later.map((step) => ({
    t: utcTime(step.date),
    label: step.date,
    actual: null,
    p10: step.p10,
    span: Math.max(0, step.p90 - step.p10),
    mid: step.p50,
    low: step.p10,
    high: step.p90,
  }));
  const anchor = fan.find((step) => step.year === 0);
  if (!anchor) return [...history, ...forecast];
  const anchorRow: ChartRow = {
    t: utcTime(anchor.date),
    label: anchor.date,
    actual: history.length > 0 ? history[history.length - 1]!.actual : null,
    p10: anchor.p10,
    span: Math.max(0, anchor.p90 - anchor.p10),
    mid: anchor.p50,
    low: anchor.p10,
    high: anchor.p90,
  };
  if (history.length > 0) history[history.length - 1] = anchorRow;
  else forecast.unshift(anchorRow);
  return [...history, ...forecast];
}

function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export function PortfolioDesk({ universe }: { universe: ExplorerItem[] }) {
  const holdings = useDesk((state) => state.holdings);
  const add = useDesk((state) => state.addHolding);
  const remove = useDesk((state) => state.removeHolding);
  const setShares = useDesk((state) => state.setShares);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState("");
  const [loaded, setLoaded] = useState<Record<string, HoldingSnapshot | null>>({});
  const symbolKey = holdings.map((holding) => holding.symbol).join("\n");
  const bySymbol = useMemo(() => new Map(universe.map((item) => [item.symbol, item])), [universe]);

  useEffect(() => {
    const finish = () => setReady(true);
    if (useDesk.persist.hasHydrated()) finish();
    const unsub = useDesk.persist.onFinishHydration(finish);
    void useDesk.persist.rehydrate();
    return unsub;
  }, []);

  useEffect(() => {
    if (!ready) return;
    const symbols = symbolKey.length > 0 ? symbolKey.split("\n") : [];
    if (symbols.length === 0) return;
    const controller = new AbortController();
    let cancelled = false;
    void Promise.all(
      symbols.map(async (symbol) => {
        try {
          const response = await fetch(`/api/stocks/${encodeURIComponent(symbol)}?refresh=0`, { signal: controller.signal });
          if (!response.ok) return [symbol, null] as const;
          const parsed = HoldingSnapshotSchema.safeParse(await response.json());
          return [symbol, parsed.success ? parsed.data : null] as const;
        } catch (error) {
          if (isAbort(error)) throw error;
          return [symbol, null] as const;
        }
      }),
    )
      .then((rows) => {
        if (cancelled) return;
        setLoaded(Object.fromEntries(rows));
      })
      .catch((error: unknown) => {
        if (cancelled || isAbort(error)) return;
        if (!cancelled) setLoaded(Object.fromEntries(symbols.map((symbol) => [symbol, null])));
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [ready, symbolKey]);

  useEffect(() => {
    if (!ready) return;
    for (const holding of holdings) {
      if (typeof holding.shares === "number") {
        if (holding.dollars != null) setShares(holding.symbol, holding.shares);
        continue;
      }
      if (typeof holding.dollars !== "number" || !Number.isFinite(holding.dollars)) continue;
      const price = loaded[holding.symbol]?.quote.price ?? bySymbol.get(holding.symbol)?.price;
      if (price == null || !Number.isFinite(price)) continue;
      const shares = price > 0 ? Math.max(1, Math.round(holding.dollars / price)) : 1;
      setShares(holding.symbol, shares);
    }
  }, [ready, holdings, loaded, bySymbol, setShares]);

  const settled = holdings.every((holding) => Object.prototype.hasOwnProperty.call(loaded, holding.symbol));
  const model = useMemo(() => {
    if (!settled) return { series: [] as { date: string; value: number }[], outlook: null as PortfolioOutlook | null };
    return mixModel(holdings, loaded, bySymbol);
  }, [settled, holdings, loaded, bySymbol]);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return universe.filter((item) => item.symbol.toLowerCase().includes(needle) || item.name.toLowerCase().includes(needle));
  }, [query, universe]);

  if (!ready) return <p className="px-4 py-10 text-mist">Opening your portfolio…</p>;

  const badge = mixBadge(holdings, loaded, bySymbol);
  const rows = chartRows(model.series, model.outlook?.fan ?? []);
  const showChart = holdings.length > 0 && settled && rows.length > 0;

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-5xl">Practice</h1>
          <p className="mt-3 max-w-2xl leading-7 text-mist">A practice mix of shares. Nothing is bought.</p>
          <AccountLabel />
        </div>
        {badge ? (
          <DataBadge
            freshness={badge.freshness}
            source={badge.source}
            asOf={badge.asOf}
            fetchedAt={badge.fetchedAt}
            fallback={badge.fallback}
            generatedAt={badge.generatedAt}
          />
        ) : null}
      </header>
      <Disclaimer prominent />
      {model.outlook ? <Summary outlook={model.outlook} /> : null}
      <section className="rounded-3xl border border-cream/10 bg-pine/80 p-4">
        {holdings.length === 0 ? (
          <p className="flex h-80 items-center justify-center text-sm text-mist">Add a stock below.</p>
        ) : !settled ? (
          <p className="flex h-80 items-center justify-center text-sm text-mist">Loading prices…</p>
        ) : showChart && model.outlook ? (
          <MixChart rows={rows} outlook={model.outlook} hasPast={model.series.length > 1} />
        ) : (
          <p className="flex h-80 items-center justify-center text-center text-sm text-mist">
            {holdings.some((holding) => holding.shares == null)
              ? "Waiting for a price to turn a saved dollar amount into shares."
              : "No prices for this mix yet."}
          </p>
        )}
      </section>
      {holdings.length > 0 ? (
        <section className="grid gap-3">
          <h2 className="text-sm text-mist">Holdings</h2>
          <ul className="grid gap-3">
            {holdings.map((holding) => (
              <HoldingRow
                key={holding.symbol}
                holding={holding}
                name={loaded[holding.symbol]?.stock.name ?? bySymbol.get(holding.symbol)?.name ?? holding.symbol}
                price={loaded[holding.symbol]?.quote.price ?? bySymbol.get(holding.symbol)?.price ?? null}
                onShares={(shares) => setShares(holding.symbol, shares)}
                onRemove={() => remove(holding.symbol)}
              />
            ))}
          </ul>
        </section>
      ) : null}
      <section>
        <label className="block text-sm text-mist">
          Add a company
          <input
            className="mt-1 w-full min-w-0 rounded-2xl border border-cream/15 bg-pine px-3 py-2 text-cream"
            placeholder="Search RY.TO or Royal Bank"
            value={query}
            autoComplete="off"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        {query.trim() && matches.length === 0 ? <p className="mt-3 text-sm text-mist">No match.</p> : null}
        {matches.length > 0 ? (
          <ul className="mt-3 grid gap-2">
            {matches.slice(0, 8).map((item) => {
              const held = holdings.some((holding) => holding.symbol === item.symbol);
              return (
                <li key={item.symbol} className="flex items-center justify-between gap-3 rounded-2xl border border-cream/10 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.name}</p>
                    <p className="text-xs text-mist">{item.symbol}</p>
                  </div>
                  <Button variant="ghost" disabled={held} onClick={() => add(item.symbol)}>
                    {held ? "Added" : "Add"}
                  </Button>
                </li>
              );
            })}
          </ul>
        ) : null}
        {matches.length > 8 ? <p className="mt-2 text-xs text-mist">Showing 8 matches. Type more to narrow them.</p> : null}
      </section>
      <HoldingImport known={bySymbol} />
    </div>
  );
}

function mixModel(
  holdings: Holding[],
  loaded: Record<string, HoldingSnapshot | null>,
  bySymbol: Map<string, ExplorerItem>,
): { series: { date: string; value: number }[]; outlook: PortfolioOutlook | null } {
  const shareHoldings = holdings.filter(
    (holding): holding is Holding & { shares: number } => typeof holding.shares === "number" && holding.shares > 0,
  );
  const legs = shareHoldings.flatMap((holding) => {
    const history = loaded[holding.symbol]?.history ?? [];
    return history.length > 0 ? [{ shares: holding.shares, history }] : [];
  });
  const series = shareHoldings.length > 0 && legs.length === shareHoldings.length ? portfolioValue(legs) : [];
  let quoteSum = 0;
  for (const holding of shareHoldings) {
    const price = loaded[holding.symbol]?.quote.price ?? bySymbol.get(holding.symbol)?.price;
    if (price != null && price > 0) quoteSum += holding.shares * price;
  }
  const outlook = portfolioOutlook({
    series,
    currentValue: quoteSum,
    anchorDate: new Date().toISOString().slice(0, 10),
  });
  return { series, outlook };
}

function mixBadge(
  holdings: Holding[],
  loaded: Record<string, HoldingSnapshot | null>,
  bySymbol: Map<string, ExplorerItem>,
): {
  freshness: Freshness;
  source: DataSource;
  asOf?: string;
  fetchedAt?: string;
  fallback?: boolean;
  generatedAt?: string;
} | null {
  let chosen: {
    freshness: Freshness;
    source: DataSource;
    asOf?: string;
    fetchedAt?: string;
    fallback?: boolean;
    generatedAt?: string;
  } | null = null;
  for (const holding of holdings) {
    const snap = loaded[holding.symbol];
    const item = bySymbol.get(holding.symbol);
    const row = snap
      ? {
          freshness: snap.freshness,
          source: snap.source,
          asOf: snap.quote.asOf,
          fetchedAt: snap.quote.fetchedAt,
          fallback: snap.fallback,
          generatedAt: snap.generatedAt,
        }
      : item
        ? {
            freshness: item.freshness,
            source: item.source,
            asOf: item.asOf,
            fetchedAt: item.fetchedAt,
            fallback: item.fallback,
            generatedAt: item.generatedAt,
          }
        : null;
    if (!row) continue;
    const demo = snap
      ? snap.isSynthetic || snap.freshness === "demo" || Boolean(snap.fallback)
      : Boolean(item?.isSynthetic || item?.freshness === "demo" || item?.fallback);
    if (demo) return { ...row, freshness: row.freshness === "live" ? "demo" : row.freshness };
    if (!chosen || (row.asOf && chosen.asOf && row.asOf < chosen.asOf)) chosen = row;
  }
  return chosen;
}

function Summary({ outlook }: { outlook: PortfolioOutlook }) {
  const year5 = outlook.fan.find((step) => step.year === 5);
  const year10 = outlook.fan.find((step) => step.year === 10);
  const tone = outlook.change == null ? "text-mist" : outlook.change > 0 ? "text-aurora" : outlook.change < 0 ? "text-loss" : "text-mist";
  return (
    <section className="grid gap-4 rounded-3xl border border-cream/10 bg-pine/70 p-5 sm:grid-cols-3">
      <div>
        <p className="text-sm text-mist">Value now</p>
        <p className="mt-1 font-display text-3xl">{formatCad(outlook.value)}</p>
        {outlook.change != null ? (
          <p className={`mt-1 text-sm ${tone}`}>
            {outlook.change > 0 ? "+" : ""}
            {formatCad(outlook.change)} ({formatPercent(outlook.changePercent ?? Number.NaN, 1, true)}) over this chart
          </p>
        ) : (
          <p className="mt-1 text-sm text-mist">Change over this chart is not available yet.</p>
        )}
        <p className="mt-1 text-sm text-mist">Dividends and fees are not in it.</p>
      </div>
      <Horizon label="In 5 years" step={year5} />
      <Horizon label="In 10 years" step={year10} />
    </section>
  );
}

function Horizon({ label, step }: { label: string; step: PortfolioFanStep | undefined }) {
  if (!step) return null;
  return (
    <div>
      <p className="text-sm text-mist">{label}</p>
      <p className="mt-1 font-display text-3xl">{formatCad(step.p50)}</p>
      <p className="mt-1 text-sm text-mist">
        Median · {formatCad(step.p10)} – {formatCad(step.p90)}
      </p>
    </div>
  );
}

function axisTick(value: number | string): string {
  return String(new Date(Number(value)).getUTCFullYear());
}

function MixChart({ rows, outlook, hasPast }: { rows: ChartRow[]; outlook: PortfolioOutlook; hasPast: boolean }) {
  const pastRows = rows.filter((row) => row.actual != null);
  const forecastRows = rows.filter((row) => row.mid != null);
  return (
    <div className="grid gap-6">
      <p className="text-sm leading-6 text-mist">
        This line is the share price times the share count. Dividends and fees are not in it.
      </p>
      <div>
        {hasPast ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={pastRows}>
                <CartesianGrid stroke="rgba(244,240,230,0.06)" />
                <XAxis
                  dataKey="t"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={axisTick}
                  tick={{ fill: "#a9b7ae", fontSize: 11 }}
                  minTickGap={28}
                />
                <YAxis
                  tick={{ fill: "#a9b7ae", fontSize: 11 }}
                  width={72}
                  domain={["auto", "auto"]}
                  tickFormatter={(value) => formatCompactCad(Number(value))}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    const row = payload?.[0]?.payload as ChartRow | undefined;
                    if (!active || !row || row.actual == null) return null;
                    return (
                      <div className="rounded-xl px-3 py-2 text-sm text-cream" style={{ background: "#102019" }}>
                        <p className="text-mist">{row.label}</p>
                        <p>Past value {formatCad(row.actual)}</p>
                      </div>
                    );
                  }}
                />
                <Line dataKey="actual" stroke="#f4f0e6" dot={false} strokeWidth={2.5} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="flex h-40 items-center justify-center text-center text-sm text-mist">
            No past line yet. Every holding needs a price history.
          </p>
        )}
        {hasPast ? (
          <ul className="mt-3 flex flex-wrap gap-4 text-xs text-mist">
            <li className="flex items-center gap-2">
              <span className="inline-block h-0.5 w-6 bg-cream" />
              Past value
            </li>
          </ul>
        ) : null}
      </div>
      {forecastRows.length > 0 ? (
        <div className="border-t border-cream/10 pt-5">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={forecastRows}>
                <CartesianGrid stroke="rgba(244,240,230,0.06)" />
                <XAxis
                  dataKey="t"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={axisTick}
                  tick={{ fill: "#a9b7ae", fontSize: 11 }}
                  minTickGap={28}
                />
                <YAxis
                  tick={{ fill: "#a9b7ae", fontSize: 11 }}
                  width={72}
                  domain={["auto", "auto"]}
                  tickFormatter={(value) => formatCompactCad(Number(value))}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    const row = payload?.[0]?.payload as ChartRow | undefined;
                    if (!active || !row || row.mid == null) return null;
                    return (
                      <div className="rounded-xl px-3 py-2 text-sm text-cream" style={{ background: "#102019" }}>
                        <p className="text-mist">{row.label}</p>
                        <p>Low {formatCad(row.low ?? 0)}</p>
                        <p>Middle {formatCad(row.mid)}</p>
                        <p>High {formatCad(row.high ?? 0)}</p>
                      </div>
                    );
                  }}
                />
                <Area dataKey="p10" stackId="band" stroke="none" fill="transparent" connectNulls={false} />
                <Area dataKey="span" stackId="band" stroke="none" fill="#f0c96a" fillOpacity={0.22} connectNulls={false} />
                <Line dataKey="mid" stroke="#f0c96a" strokeDasharray="6 4" dot={false} strokeWidth={2} connectNulls={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-3 flex flex-wrap gap-4 text-xs text-mist">
            <li className="flex items-center gap-2">
              <span className="inline-block h-3 w-6 rounded-sm bg-gold/30" />
              What-if range
            </li>
          </ul>
          {outlook.assumedRate ? (
            <p className="mt-3 text-sm leading-6 text-mist">
              There is not a full year of prices for this mix, so the what-if uses 6% a year.
            </p>
          ) : null}
          <p className="mt-2 text-sm leading-6 text-mist">If the past year repeated. A range, not a promise.</p>
        </div>
      ) : null}
    </div>
  );
}

function HoldingRow({
  holding,
  name,
  price,
  onShares,
  onRemove,
}: {
  holding: Holding;
  name: string;
  price: number | null;
  onShares: (shares: number) => void;
  onRemove: () => void;
}) {
  const value = typeof holding.shares === "number" && price != null && price > 0 ? holding.shares * price : null;
  return (
    <li className="grid items-center gap-3 rounded-2xl border border-cream/10 p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
      <div className="min-w-0">
        <Link href={`/stock/${encodeURIComponent(holding.symbol)}`} className="font-medium hover:underline">
          {holding.symbol}
        </Link>
        <p className="truncate text-sm text-mist">{name}</p>
      </div>
      {typeof holding.shares === "number" ? (
        <ShareCount shares={holding.shares} onCommit={onShares} />
      ) : (
        <p className="max-w-48 text-xs leading-5 text-mist">
          {typeof holding.dollars === "number" ? `${formatCad(holding.dollars)} saved earlier.` : "Waiting for a price."} Share count
          appears once a price loads.
        </p>
      )}
      <p className="text-xs text-mist">
        Value
        <span className="mt-1 block text-base text-cream">{value == null ? "—" : formatCad(value)}</span>
      </p>
      <Button variant="quiet" onClick={onRemove}>
        Remove
      </Button>
    </li>
  );
}

const ACCOUNT_LABEL: Record<PracticeAccount, string> = {
  tfsa: "TFSA",
  rrsp: "RRSP",
  fhsa: "FHSA",
  other: "Other",
};

function AccountLabel() {
  const accountType = useDesk((state) => state.accountType);
  const setAccountType = useDesk((state) => state.setAccountType);
  return (
    <div className="mt-4 grid max-w-md gap-2">
      <label className="block text-sm text-mist">
        Practice account
        <select
          className="mt-1 w-full rounded-2xl border border-cream/15 bg-pine px-3 py-2 text-cream"
          value={accountType ?? ""}
          onChange={(event) => {
            const value = event.target.value;
            setAccountType(value === "tfsa" || value === "rrsp" || value === "fhsa" || value === "other" ? value : null);
          }}
        >
          <option value="">Not set</option>
          <option value="tfsa">TFSA</option>
          <option value="rrsp">RRSP</option>
          <option value="fhsa">FHSA</option>
          <option value="other">Other</option>
        </select>
      </label>
      <p className="text-sm leading-6 text-mist">
        {accountType ? `Labeled as ${ACCOUNT_LABEL[accountType]}.` : "No account label."} This does not change the numbers.{" "}
        <Link href="/canada" className="text-gold hover:underline">
          What these accounts mean
        </Link>
      </p>
    </div>
  );
}

function HoldingImport({ known }: { known: Map<string, ExplorerItem> }) {
  const holdings = useDesk((state) => state.holdings);
  const add = useDesk((state) => state.addHolding);
  const setShares = useDesk((state) => state.setShares);
  const shelf = useMemo(() => new Set(known.keys()), [known]);
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);
  const parsed: HoldingCsvResult | null = text.trim() ? parseHoldingCsv(text, shelf) : null;

  function readFile(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSaved(false);
      setText(typeof reader.result === "string" ? reader.result : "");
    };
    reader.readAsText(file);
  }

  function save() {
    if (!parsed || parsed.error || parsed.rows.length === 0) return;
    for (const row of parsed.rows) {
      if (holdings.some((holding) => holding.symbol === row.symbol)) setShares(row.symbol, row.shares);
      else add(row.symbol, row.shares);
    }
    setText("");
    setSaved(true);
  }

  return (
    <section className="grid gap-3">
      <h2 className="text-sm text-mist">Bring in a spreadsheet</h2>
      <p className="max-w-2xl text-sm leading-6 text-mist">
        Paste rows or choose a file. The first row needs a symbol or ticker column, and a shares or quantity column. This stays in this browser. Nothing is uploaded.
      </p>
      <textarea
        className="min-h-28 w-full rounded-2xl border border-cream/15 bg-pine px-3 py-2 text-cream"
        aria-label="Symbol and shares rows"
        placeholder={"symbol,shares\nRY.TO,2"}
        value={text}
        onChange={(event) => {
          setSaved(false);
          setText(event.target.value);
        }}
      />
      <input
        className="text-sm text-mist"
        type="file"
        accept=".csv,text/csv,text/plain"
        aria-label="Choose a symbol and shares file"
        onChange={(event) => {
          readFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      {saved ? <p className="text-sm text-aurora">Saved on this browser.</p> : null}
      {parsed ? <ImportPreview parsed={parsed} onSave={save} /> : null}
    </section>
  );
}

function ImportPreview({ parsed, onSave }: { parsed: HoldingCsvResult; onSave: () => void }) {
  return (
    <div className="grid gap-3 rounded-2xl border border-cream/10 p-3">
      {parsed.error ? <p className="text-sm text-loss">{parsed.error}</p> : null}
      {parsed.rows.length > 0 ? (
        <ul className="grid gap-1 text-sm">
          {parsed.rows.map((row) => (
            <li key={row.symbol}>
              {row.symbol} · {row.shares} shares
            </li>
          ))}
        </ul>
      ) : parsed.error ? null : (
        <p className="text-sm text-mist">No share counts to save.</p>
      )}
      {parsed.unknown.length > 0 ? (
        <p className="text-sm leading-6 text-mist">Left out, not on this shelf: {parsed.unknown.join(", ")}</p>
      ) : null}
      {parsed.skipped.length > 0 ? (
        <div className="text-sm text-mist">
          <p>Could not read:</p>
          <ul className="mt-1 grid gap-1">
            {parsed.skipped.map((line, index) => (
              <li key={`${index}-${line}`}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <Button variant="ghost" disabled={parsed.error != null || parsed.rows.length === 0} onClick={onSave}>
        Save on this browser
      </Button>
    </div>
  );
}

function ShareCount({ shares, onCommit }: { shares: number; onCommit: (shares: number) => void }) {
  const [text, setText] = useState(() => String(shares));
  useEffect(() => {
    setText(String(shares));
  }, [shares]);

  function commit() {
    const next = Number(text);
    if (!Number.isFinite(next)) {
      setText(String(shares));
      return;
    }
    onCommit(next);
  }

  return (
    <label className="text-xs text-mist">
      Shares
      <input
        className="mt-1 w-28 rounded-xl border border-cream/15 bg-pine px-2 py-1 text-cream"
        type="number"
        min={0.01}
        max={1000000}
        step="any"
        inputMode="decimal"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
      />
    </label>
  );
}
