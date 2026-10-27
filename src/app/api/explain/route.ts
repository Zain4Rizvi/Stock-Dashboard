import { getGateway } from "@/lib/data";
import { explainSnapshot } from "@/lib/llm";
import { parseTsxSymbol } from "@/lib/data/symbols";
import { scoreStock } from "@/lib/scoring/score";
import { connection } from "next/server";
import { z } from "zod";

const Body = z.object({ symbol: z.string() });

export async function POST(request: Request) {
  await connection();
  const parsedBody = Body.safeParse(await request.json().catch(() => null));
  if (!parsedBody.success) return Response.json({ error: "Missing symbol" }, { status: 400 });
  const symbol = parseTsxSymbol(parsedBody.data.symbol);
  if (!symbol) return Response.json({ error: "Expected a TSX symbol like RY.TO" }, { status: 400 });
  const snapshot = await (await getGateway()).getSnapshot(symbol);
  if (!snapshot) return Response.json({ error: "Unknown symbol" }, { status: 404 });
  const score = scoreStock({
    name: snapshot.stock.name,
    sector: snapshot.stock.sector,
    kind: snapshot.stock.kind,
    fundamentals: snapshot.fundamentals,
    history: snapshot.history,
  });
  const result = await explainSnapshot(snapshot, score);
  return Response.json(result);
}
