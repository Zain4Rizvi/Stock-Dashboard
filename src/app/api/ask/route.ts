import { getGateway } from "@/lib/data";
import { KvCache } from "@/lib/data/cache/kv";
import { MemoryCache } from "@/lib/data/cache/memory";
import { parseTsxSymbol } from "@/lib/data/symbols";
import { createLanguageProvider, readAskRuntime } from "@/lib/llm";
import { askClientIp, takeAskBudget } from "@/lib/llm/budget";
import {
  limitedCoach,
  limitedGuide,
  misconfiguredCoach,
  misconfiguredGuide,
  refusedCoach,
  refusedGuide,
  unavailableCoach,
  unavailableGuide,
} from "@/lib/llm/cards";
import { pageBrief } from "@/lib/llm/pages";
import { coachPrompt, guidePrompt, mentionedTicker, type AskTurn, type CoachStock } from "@/lib/llm/prompts";
import { AskBodySchema, CoachCardSchema, GuideCardSchema, rejectsPrediction, resolveAskSource, type AskSource, type CoachCard, type GuideCard } from "@/lib/llm/schemas";
import { scoreStock } from "@/lib/scoring/score";
import { connection } from "next/server";
import type { ZodType } from "zod";

/** Local cap when this process is not the Cloudflare Worker. Production counts live in MARKET_KV. */
const memoryBudget = new MemoryCache();

function clampShares(shares: number): number {
  const rounded = Math.round(shares * 10_000) / 10_000;
  return Math.min(1_000_000, Math.max(0.01, rounded));
}

function cleanHoldings(holdings: { symbol: string; shares: number }[]): { symbol: string; shares: number }[] {
  const out: { symbol: string; shares: number }[] = [];
  for (const holding of holdings) {
    const symbol = parseTsxSymbol(holding.symbol);
    if (!symbol || !Number.isFinite(holding.shares) || !(holding.shares > 0)) continue;
    out.push({ symbol, shares: clampShares(holding.shares) });
    if (out.length === 12) break;
  }
  return out;
}

async function stockContext(message: string): Promise<{ stock: CoachStock | null; unknownTicker: string | null }> {
  const ticker = mentionedTicker(message);
  if (!ticker) return { stock: null, unknownTicker: null };
  try {
    const snapshot = await (await getGateway()).getSnapshot(ticker);
    if (!snapshot) return { stock: null, unknownTicker: ticker };
    const score = scoreStock({
      name: snapshot.stock.name,
      sector: snapshot.stock.sector,
      fundamentals: snapshot.fundamentals,
      history: snapshot.history,
    });
    return {
      unknownTicker: null,
      stock: {
        symbol: snapshot.stock.symbol,
        name: snapshot.stock.name,
        sector: snapshot.stock.sector,
        blurb: snapshot.stock.blurb,
        isSynthetic: snapshot.isSynthetic,
        price: snapshot.quote.price,
        summary: score.summary,
      },
    };
  } catch {
    return { stock: null, unknownTicker: ticker };
  }
}

type ModelResult<T> =
  | { source: "groq"; card: T }
  | { source: "refused" }
  | { source: "misconfigured" }
  | { source: "unavailable" }
  | { source: "limited"; scope: "hour" | "day"; retryAt: string };

function safeAskError(error: unknown): string {
  if (!(error instanceof Error)) return "error";
  if (error.message.startsWith("Groq HTTP")) return error.message;
  return error.name;
}

async function askModel<T>(request: Request, prompt: string, schema: ZodType<T>): Promise<ModelResult<T>> {
  const runtimePromise = readAskRuntime();
  const live = await createLanguageProvider(runtimePromise);
  if (resolveAskSource({ provider: live, overCap: false, failed: false, refused: false }) === "misconfigured" || !live) {
    return { source: "misconfigured" };
  }
  const runtime = await runtimePromise;
  const budget = await takeAskBudget(runtime.kv ? new KvCache(runtime.kv) : memoryBudget, askClientIp(request));
  if (!budget.ok) return { source: "limited", scope: budget.scope, retryAt: budget.retryAt };
  try {
    const card = await live.complete(prompt, schema);
    if (resolveAskSource({ provider: live, overCap: false, failed: false, refused: rejectsPrediction(JSON.stringify(card)) }) === "refused") {
      return { source: "refused" };
    }
    return { source: "groq", card };
  } catch (error) {
    console.error("ask failed", safeAskError(error));
    return { source: "unavailable" };
  }
}

function coachCard(result: ModelResult<CoachCard>): CoachCard {
  switch (result.source) {
    case "groq":
      return result.card;
    case "refused":
      return refusedCoach();
    case "limited":
      return limitedCoach(result.scope, result.retryAt);
    case "unavailable":
      return unavailableCoach();
    case "misconfigured":
      return misconfiguredCoach();
  }
}

function guideCard(page: ReturnType<typeof pageBrief>, result: ModelResult<GuideCard>): GuideCard {
  switch (result.source) {
    case "groq":
      return result.card;
    case "refused":
      return refusedGuide();
    case "limited":
      return limitedGuide(page, result.scope, result.retryAt);
    case "unavailable":
      return unavailableGuide(page);
    case "misconfigured":
      return misconfiguredGuide(page);
  }
}

export async function POST(request: Request) {
  await connection();
  const json = await request.json().catch(() => null);
  const payload =
    json && typeof json === "object" && !Array.isArray(json) && "message" in json && typeof json.message === "string"
      ? { ...json, message: json.message.trim() }
      : json;
  const parsed = AskBodySchema.safeParse(payload);
  if (!parsed.success) return Response.json({ error: "That question didn't parse." }, { status: 400 });
  const body = parsed.data;
  const history: AskTurn[] = body.history ?? [];

  if (body.mode === "guide") {
    const page = pageBrief(body.pageId);
    const result = await askModel(request, guidePrompt(page, body.message, history), GuideCardSchema);
    const source: AskSource = result.source;
    return Response.json({ mode: "guide", source, card: guideCard(page, result) });
  }

  const { stock, unknownTicker } = await stockContext(body.message);
  const result = await askModel(
    request,
    coachPrompt({
      message: body.message,
      history,
      profile: body.profile ?? null,
      holdings: cleanHoldings(body.holdings ?? []),
      stock,
      unknownTicker,
    }),
    CoachCardSchema,
  );
  return Response.json({ mode: "coach", source: result.source, card: coachCard(result) });
}
