"use client";

import { Disclaimer } from "@/components/ui/Disclaimer";
import { Button } from "@/components/ui/Button";
import type { Explanation } from "@/lib/llm/schemas";
import { useState } from "react";

export function ExplainPanel({ symbol }: { symbol: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ explanation: Explanation; source: "groq" | "template" } | null>(null);

  async function explain() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol }),
      });
      if (!response.ok) throw new Error("The explanation didn't come back.");
      setResult((await response.json()) as { explanation: Explanation; source: "groq" | "template" });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The explanation didn't come back.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-3xl border border-cream/10 bg-pine/80 p-5">
      <h2 className="font-display text-3xl">Say it in a sentence</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-mist">
        This retells the report card in everyday language. It does not know the future.
      </p>
      <div className="mt-4">
        <Disclaimer prominent />
      </div>
      <Button className="mt-4" onClick={explain} disabled={loading}>
        {loading ? "Writing…" : "Explain this company"}
      </Button>
      {error ? <p className="mt-3 text-sm text-loss">{error}</p> : null}
      {result ? (
        <div className="mt-5 grid gap-4">
          <p className="text-xs tracking-wide text-gold uppercase">
            {result.source === "groq"
              ? "Drafted with AI from the numbers on this page. It can be wrong."
              : "Written from the numbers on this page. No model was called."}
          </p>
          <h3 className="font-display text-2xl">{result.explanation.headline}</h3>
          <p className="leading-7 text-cream/90">{result.explanation.story}</p>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="text-sm text-aurora">What's working</h4>
              <ul className="mt-2 grid gap-2 text-sm leading-6">
                {result.explanation.strengths.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm text-gold">Worth a second look</h4>
              <ul className="mt-2 grid gap-2 text-sm leading-6">
                {result.explanation.watchouts.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
          <p className="text-sm leading-6 text-mist">{result.explanation.beginnerTake}</p>
        </div>
      ) : null}
    </section>
  );
}
