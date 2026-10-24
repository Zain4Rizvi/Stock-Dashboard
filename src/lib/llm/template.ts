import type { Scorecard } from "@/lib/scoring/score";
import type { NewsItem, Snapshot } from "@/types/market";
import { ExplanationSchema, SentimentSchema, type Explanation, type Sentiment } from "./schemas";

export function templateExplanation(snapshot: Snapshot, score: Scorecard): Explanation {
  const strengths = score.metrics
    .filter((metric) => metric.score != null && metric.score >= 70)
    .map((metric) => `${metric.label}: ${metric.headline}`)
    .slice(0, 3);
  const watchouts = score.metrics
    .filter((metric) => metric.grade === "D" || metric.grade === "F" || (metric.score != null && metric.score < 55))
    .map((metric) => `${metric.label}: ${metric.headline}`)
    .slice(0, 3);
  const demo = snapshot.isSynthetic
    ? " These numbers are a demo snapshot, so treat the story as practice, not a live quote."
    : "";
  return ExplanationSchema.parse({
    headline: score.summary,
    story: `${snapshot.stock.blurb} ${score.summary}${demo}`,
    strengths: strengths.length > 0 ? strengths : ["The report card does not show a standout strength in the basic measures."],
    watchouts: watchouts.length > 0 ? watchouts : ["No single textbook measure is flashing a hard warning. That is not the same as a guarantee."],
    beginnerTake: "Read the grades as a vocabulary lesson. They describe the latest numbers. They do not know what the share price does next.",
    notAPrediction: true,
  });
}

export function templateSentiment(snapshot: Snapshot, headlines: NewsItem[]): Sentiment {
  if (headlines.length === 0) {
    return SentimentSchema.parse({
      tone: "quiet",
      title: "No live headlines are loaded",
      explanation: `Maple Market does not invent news about ${snapshot.stock.name}. The price chart and the report card are about published numbers, not about today's articles.`,
      whyItMatters: "Headlines can change how a price feels in the short run. They are still not a forecast, and a quiet news feed is not secretly bullish or bearish.",
      whatThisIsNot: "This is not a mood score from journalists, and it is not a prediction.",
    });
  }
  return SentimentSchema.parse({
    tone: "mixed",
    title: `${headlines.length} recent headlines are on the table`,
    explanation: headlines
      .slice(0, 3)
      .map((item) => item.title)
      .join(" · "),
    whyItMatters: "A headline is a story someone chose to write. It can be useful context. It is not the business itself, and it does not say where the shares go next.",
    whatThisIsNot: "This is not financial advice and not a price forecast.",
  });
}
