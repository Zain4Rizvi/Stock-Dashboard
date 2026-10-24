"use client";

import { Button } from "@/components/ui/Button";
import { Disclaimer } from "@/components/ui/Disclaimer";
import type { Sentiment } from "@/lib/llm/schemas";
import type { NewsItem } from "@/types/market";
import { useState } from "react";

export function MoodPanel({ symbol, news }: { symbol: string; news: NewsItem[] }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ sentiment: Sentiment; source: "groq" | "template" } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/sentiment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol }),
      });
      if (!response.ok) return;
      setResult((await response.json()) as { sentiment: Sentiment; source: "groq" | "template" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-3xl border border-cream/10 bg-pine/80 p-5">
      <h2 className="font-display text-3xl">The mood, not a forecast</h2>
      <p className="mt-2 text-sm leading-6 text-mist">
        {news.length === 0
          ? "No headlines are loaded. We will not invent any."
          : `${news.length} headline${news.length === 1 ? "" : "s"} came back with the snapshot.`}
      </p>
      {news.length > 0 ? (
        <ul className="mt-4 grid gap-2">
          {news.slice(0, 5).map((item) => (
            <li key={item.title} className="text-sm leading-6">
              {item.url ? (
                <a href={item.url} className="underline decoration-cream/30 underline-offset-4" target="_blank" rel="noreferrer">
                  {item.title}
                </a>
              ) : (
                item.title
              )}
              {item.source ? <span className="text-mist"> · {item.source}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-4">
        <Disclaimer prominent />
      </div>
      <Button className="mt-4" variant="ghost" onClick={load} disabled={loading}>
        {loading ? "Reading…" : "Explain the mood"}
      </Button>
      {result ? (
        <div className="mt-4">
          <p className="text-xs tracking-wide text-gold uppercase">{result.sentiment.tone}</p>
          <h3 className="mt-1 font-display text-2xl">{result.sentiment.title}</h3>
          <p className="mt-2 leading-7">{result.sentiment.explanation}</p>
          <p className="mt-3 text-sm leading-6 text-mist">{result.sentiment.whyItMatters}</p>
          <p className="mt-2 text-sm leading-6 text-mist">{result.sentiment.whatThisIsNot}</p>
        </div>
      ) : null}
    </section>
  );
}
