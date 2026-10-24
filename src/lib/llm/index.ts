import "server-only";
import type { Scorecard } from "@/lib/scoring/score";
import type { Snapshot } from "@/types/market";
import { createGroqProvider } from "./groq";
import { explanationPrompt, sentimentPrompt } from "./prompts";
import type { LLMProvider } from "./provider";
import { ExplanationSchema, SentimentSchema, rejectsPrediction, type Explanation, type Sentiment } from "./schemas";
import { templateExplanation, templateSentiment } from "./template";

export function createLanguageProvider(): LLMProvider | null {
  const id = process.env.LLM_PROVIDER ?? "groq";
  if (id === "template") return null;
  if (id === "groq" && process.env.GROQ_API_KEY) return createGroqProvider();
  return null;
}

export async function explainSnapshot(snapshot: Snapshot, score: Scorecard): Promise<{ explanation: Explanation; source: "groq" | "template" }> {
  const fallback = () => ({ explanation: templateExplanation(snapshot, score), source: "template" as const });
  const live = createLanguageProvider();
  if (!live) return fallback();
  try {
    const explanation = await live.complete(explanationPrompt(snapshot, score), ExplanationSchema);
    const blob = JSON.stringify(explanation);
    if (rejectsPrediction(blob) || explanation.notAPrediction !== true) return fallback();
    return { explanation, source: "groq" };
  } catch {
    return fallback();
  }
}

export async function explainSentiment(snapshot: Snapshot): Promise<{ sentiment: Sentiment; source: "groq" | "template" }> {
  const fallback = () => ({ sentiment: templateSentiment(snapshot, snapshot.news), source: "template" as const });
  const live = createLanguageProvider();
  if (!live) return fallback();
  try {
    const sentiment = await live.complete(sentimentPrompt(snapshot, snapshot.news), SentimentSchema);
    if (rejectsPrediction(JSON.stringify(sentiment))) return fallback();
    return { sentiment, source: "groq" };
  } catch {
    return fallback();
  }
}
