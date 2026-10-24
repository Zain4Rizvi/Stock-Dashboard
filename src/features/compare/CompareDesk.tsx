"use client";

import type { Scorecard } from "@/lib/scoring/score";
import type { ExplorerItem } from "@/types/market";
import { useRouter } from "next/navigation";
import { contrast } from "./words";
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

  function toggle(symbol: string) {
    const next = selected.includes(symbol) ? selected.filter((item) => item !== symbol) : [...selected, symbol].slice(-3);
    const query = next.length ? `?symbols=${next.join(",")}` : "";
    router.push(`/compare${query}`);
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8">
      <header>
        <h1 className="font-display text-5xl">Put them side by side</h1>
        <p className="mt-3 max-w-2xl text-mist">Pick up to three companies. The shape is the report card, not a winner's podium.</p>
      </header>
      <div className="grid gap-4">
        {sectors.map((sector) => (
          <div key={sector}>
            <h2 className="text-sm text-gold">{sector}</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {universe
                .filter((item) => item.sector === sector)
                .map((item) => {
                  const on = selected.includes(item.symbol);
                  return (
                    <button
                      key={item.symbol}
                      type="button"
                      onClick={() => toggle(item.symbol)}
                      className={`rounded-full px-3 py-1 text-sm ${on ? "bg-cream text-ink" : "border border-cream/15 text-cream"}`}
                    >
                      {item.symbol.replace(".TO", "")}
                    </button>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
      {cards.length > 0 ? (
        <>
          <Radar cards={cards.map((card) => ({ name: card.name, score: card.score }))} />
          <ul className="grid gap-2">
            {cards[0].score.metrics.map((metric) => {
              const line = contrast(
                metric.label,
                cards.map((card) => ({
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
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="text-mist">
                  <th className="py-2 font-medium">Measure</th>
                  {cards.map((card) => (
                    <th key={card.symbol} className="py-2 font-medium">
                      {card.name}
                    </th>
                  ))}
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
                          <span className="mt-1 block text-mist">{found?.headline}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="text-mist">Choose a company to start. Two makes a comparison. Three is plenty.</p>
      )}
    </div>
  );
}
