import { getGateway, liveDataEnabled } from "@/lib/data";
import { parseTsxSymbol } from "@/lib/data/symbols";
import { connection } from "next/server";

export async function GET(_request: Request, context: { params: Promise<{ symbol: string }> }) {
  await connection();
  const { symbol } = await context.params;
  const parsed = parseTsxSymbol(symbol);
  if (!parsed) return Response.json({ error: "Expected a TSX symbol like RY.TO" }, { status: 400 });
  const snapshot = await getGateway().getSnapshot(parsed, { refresh: liveDataEnabled() });
  if (!snapshot) return Response.json({ error: "Unknown symbol" }, { status: 404 });
  return Response.json(snapshot);
}
