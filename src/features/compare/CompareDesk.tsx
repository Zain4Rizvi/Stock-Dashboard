"use client";

import { UniverseBadge } from "@/components/ui/DataBadge";
import { displayName } from "@/lib/format";
import { sectorLabel, sectorPlain } from "@/lib/scoring/glossary";
import type { Scorecard } from "@/lib/scoring/score";
import type { ExplorerItem } from "@/types/market";
import { useRouter } from "next/navigation";
import { contrast, priceChangeVersusFund, priceWindowLabel, shelfMedianText, shelfPriceChangeMedian } from "./words";
import { Radar } from "./Radar";

export function CompareDesk({
  universe,
  selected,
  cards,
}: {
  universe: ExplorerItem[];
  selected: string[];
  cards: { symbol: string; name: string; score: Scorecard }[];
}) {
  const router = useRouter();
  const sectors = [...new Set(universe.map((item) => item.sector))].sort();
  const graded = cards.filter((card) => universe.find((item) => item.symbol === card.symbol)?.kind !== "fund");
  const xiu = universe.find((item) => item.symbol === "XIU.TO");
  const versusFund =
    xiu && cards.length > 0
      ? priceChangeVersusFund(
          cards.map((card) => {
            const item = universe.find((entry) => entry.symbol === card.symbol);
            return {
              symbol: card.symbol,
              name: card.name,
              oneYearReturn: item?.oneYearReturn ?? null,
              returnStart: item?.returnStart ?? null,
              returnEnd: item?.returnEnd ?? null,
            };
          }),
          {
            symbol: xiu.symbol,
            name: xiu.name,
            oneYearReturn: xiu.oneYearReturn,
            returnStart: xiu.returnStart,
            returnEnd: xiu.returnEnd,
          },
        )
      : null;

  function toggle(symbol: string) {
    const next = selected.includes(symbol) ? selected.filter((item) => item !== symbol) : [...selected, symbol].slice(-3);
    const query = next.length ? `?symbols=${next.join(",")}` : "";
    router.push(`/compare${query}`);
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-5xl">Put them side by side</h1>
          <p className="mt-3 max-w-2xl text-mist">Pick up to three names. The shape is the report card, not a winner's podium.</p>
        </div>
        <UniverseBadge universe={universe} />
      </header>
      <div className="grid gap-4">
        {sectors.map((sector) => (
          <div key={sector}>
            <h2 className="text-sm text-gold" title={sectorPlain(sector)}>
              {sectorLabel(sector)}
            </h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {universe
                .filter((item) => item.sector === sector)
                .map((item) => {
                  const on = selected.includes(item.symbol);
                  const shown = displayName(item.name, item.symbol);
                  return (
                    <button
                      key={item.symbol}
                      type="button"
                      title={`${item.name} (${item.symbol})`}
                      onClick={() => toggle(item.symbol)}
                      className={`rounded-full px-3 py-1 text-sm ${on ? "bg-cream text-ink" : "border border-cream/15 text-cream"}`}
                    >
                      {shown.name} <span className="opacity-70">{shown.ticker}</span>
                    </button>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
      {cards.length > 0 ? (
        <>
          {cards.map((card) => {
            const kind = universe.find((item) => item.symbol === card.symbol)?.kind;
            if (kind !== "fund") return null;
            return (
              <p key={card.symbol} className="text-sm leading-6 text-mist">
                {card.score.summary}
              </p>
            );
          })}
          <Radar cards={graded.map((card) => ({ name: card.name, score: card.score }))} />
          <ul className="grid gap-2">
            {cards[0].score.metrics.map((metric) => {
              const line = contrast(
                metric.label,
                graded.map((card) => ({
                  name: card.name,
                  score: card.score.metrics.find((item) => item.id === metric.id)?.score ?? null,
                })),
              );
              return line ? (
                <li key={metric.id} className="text-sm leading-6 text-cream/90">
                  {line}
                </li>
              ) : null;
            })}
          </ul>
          {versusFund ? <p className="text-sm leading-6 text-cream/90">{versusFund}</p> : null}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="text-mist">
                  <th className="py-2 font-medium">Measure</th>
                  {cards.map((card) => (
                    <th key={card.symbol} className="py-2 font-medium">
                      {card.name}
                    </th>
                  ))}
                  <th className="py-2 font-medium">Shelf median</th>
                </tr>
              </thead>
              <tbody>
                {cards[0].score.metrics.map((metric) => (
                  <tr key={metric.id} className="border-t border-cream/10">
                    <th className="py-3 font-medium">{metric.label}</th>
                    {cards.map((card) => {
                      const found = card.score.metrics.find((item) => item.id === metric.id);
                      return (
                        <td key={card.symbol} className="py-3 pr-4">
                          <span className="font-display text-2xl">{found?.grade}</span>
                          <span className="mt-1 block">{found?.display}</span>
                          <span className="mt-1 block text-mist">{found?.headline}</span>
                        </td>
                      );
                    })}
                    <td className="py-3 pr-4 text-mist">{shelfMedianText(metric.id, universe)}</td>
                  </tr>
                ))}
                <tr className="border-t border-cream/10">
                  <th className="py-3 font-medium">Price change</th>
                  {cards.map((card) => {
                    const item = universe.find((entry) => entry.symbol === card.symbol);
                    return (
                      <td key={card.symbol} className="py-3 pr-4">
                        {priceWindowLabel({
                          oneYearReturn: item?.oneYearReturn ?? null,
                          returnStart: item?.returnStart ?? null,
                          returnEnd: item?.returnEnd ?? null,
                        })}
                      </td>
                    );
                  })}
                  <td className="py-3 pr-4 text-mist">{shelfPriceChangeMedian(universe)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm leading-6 text-mist">
            The shelf median is the middle company on this shelf. Funds are left out. For risk, that middle number is debt, because a price swing is not stored for every name.
          </p>
        </>
      ) : (
        <p className="text-mist">Choose a name to start. Two makes a comparison. Three is plenty.</p>
      )}
    </div>
  );
}
