import "server-only";
import type { KvBinding } from "@/lib/data/cache/kv";
import type { Scorecard } from "@/lib/scoring/score";
import type { Snapshot } from "@/types/market";
import { createGroqProvider } from "./groq";
import { explanationPrompt, sentimentPrompt } from "./prompts";
import type { LLMProvider } from "./provider";
import { ExplanationSchema, SentimentSchema, rejectsPrediction, type Explanation, type Sentiment } from "./schemas";
import { templateExplanation, templateSentiment } from "./template";

export interface AskRuntime {
  apiKey?: string;
  model?: string;
  provider: string;
  kv: KvBinding | null;
}

function clean(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function onCloudflareWorker(): boolean {
  if (typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers") return true;
  return typeof (globalThis as { WebSocketPair?: unknown }).WebSocketPair === "function";
}

function asKv(value: unknown): KvBinding | null {
  if (!value || typeof value !== "object") return null;
  const kv = value as KvBinding;
  return typeof kv.get === "function" && typeof kv.put === "function" ? kv : null;
}

/** Worker secret when this request is on Cloudflare. next dev uses process.env. */
export async function readAskRuntime(): Promise<AskRuntime> {
  if (!onCloudflareWorker()) {
    return {
      apiKey: clean(process.env.GROQ_API_KEY),
      model: clean(process.env.LLM_MODEL),
      provider: clean(process.env.LLM_PROVIDER) ?? "groq",
      kv: null,
    };
  }
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = await getCloudflareContext({ async: true });
    const record = env as { GROQ_API_KEY?: unknown; LLM_MODEL?: unknown; LLM_PROVIDER?: unknown; MARKET_KV?: unknown };
    return {
      apiKey: clean(record.GROQ_API_KEY),
      model: clean(record.LLM_MODEL),
      provider: clean(record.LLM_PROVIDER) ?? "groq",
      kv: asKv(record.MARKET_KV),
    };
  } catch (error) {
    console.error("ask runtime unavailable", error instanceof Error ? error.name : "error");
    return { provider: "groq", kv: null };
  }
}

export async function createLanguageProvider(runtime: Promise<AskRuntime> | AskRuntime = readAskRuntime()): Promise<LLMProvider | null> {
  const env = await runtime;
  if (env.provider === "template") return null;
  if (env.provider === "groq" && env.apiKey) return createGroqProvider(env.apiKey, env.model);
  return null;
}

export async function explainSnapshot(snapshot: Snapshot, score: Scorecard): Promise<{ explanation: Explanation; source: "groq" | "template" }> {
  const fallback = () => ({ explanation: templateExplanation(snapshot, score), source: "template" as const });
  const live = await createLanguageProvider();
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
  const live = await createLanguageProvider();
  if (!live) return fallback();
  try {
    const sentiment = await live.complete(sentimentPrompt(snapshot, snapshot.news), SentimentSchema);
    if (rejectsPrediction(JSON.stringify(sentiment))) return fallback();
    return { sentiment, source: "groq" };
  } catch {
    return fallback();
  }
}
