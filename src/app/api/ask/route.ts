import { getGateway } from "@/lib/data";
import { parseTsxSymbol } from "@/lib/data/symbols";
import { createLanguageProvider } from "@/lib/llm";
import { offlineCoach, offlineGuide, refusedCoach, refusedGuide } from "@/lib/llm/cards";
import { pageBrief } from "@/lib/llm/pages";
import { coachPrompt, guidePrompt, mentionedTicker, type AskTurn, type CoachStock } from "@/lib/llm/prompts";
import { AskBodySchema, CoachCardSchema, GuideCardSchema, rejectsPrediction, type AskSource } from "@/lib/llm/schemas";
import { scoreStock } from "@/lib/scoring/score";
import { connection } from "next/server";
import type { ZodType } from "zod";

const hits: number[] = [];

/** ponytail: one process, one clock. A second server needs a shared counter. */
function takeAskSlot(now = Date.now()): boolean {
  const cutoff = now - 60 * 60 * 1000;
  while (hits.length > 0 && hits[0]! < cutoff) hits.shift();
  if (hits.length >= 30) return false;
  hits.push(now);
  return true;
}

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

async function askModel<T>(prompt: string, schema: ZodType<T>): Promise<{ source: "groq"; card: T } | { source: "offline" } | { source: "refused" } | Response> {
  const live = createLanguageProvider();
  if (!live || !takeAskSlot()) return { source: "offline" };
  try {
    const card = await live.complete(prompt, schema);
    if (rejectsPrediction(JSON.stringify(card))) return { source: "refused" };
    return { source: "groq", card };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("ask failed", message.slice(0, 600));
    return Response.json({ error: "The teacher got tangled." }, { status: 502 });
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
    const result = await askModel(guidePrompt(page, body.message, history), GuideCardSchema);
    if (result instanceof Response) return result;
    const card = result.source === "groq" ? result.card : result.source === "refused" ? refusedGuide() : offlineGuide(page);
    const source: AskSource = result.source;
    return Response.json({ mode: "guide", source, card });
  }

  const { stock, unknownTicker } = await stockContext(body.message);
  const result = await askModel(
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
  if (result instanceof Response) return result;
  const card = result.source === "groq" ? result.card : result.source === "refused" ? refusedCoach() : offlineCoach();
  return Response.json({ mode: "coach", source: result.source, card });
}
