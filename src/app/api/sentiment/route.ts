import { getGateway } from "@/lib/data";
import { explainSentiment } from "@/lib/llm";
import { parseTsxSymbol } from "@/lib/data/symbols";
import { connection } from "next/server";
import { z } from "zod";

const Body = z.object({ symbol: z.string() });

export async function POST(request: Request) {
  await connection();
  const parsedBody = Body.safeParse(await request.json().catch(() => null));
  if (!parsedBody.success) return Response.json({ error: "Missing symbol" }, { status: 400 });
  const symbol = parseTsxSymbol(parsedBody.data.symbol);
  if (!symbol) return Response.json({ error: "Expected a TSX symbol like RY.TO" }, { status: 400 });
  const snapshot = await getGateway().getSnapshot(symbol);
  if (!snapshot) return Response.json({ error: "Unknown symbol" }, { status: 404 });
  const result = await explainSentiment(snapshot);
  return Response.json(result);
}
