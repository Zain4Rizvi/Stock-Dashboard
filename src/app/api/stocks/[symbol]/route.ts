import { getGateway, liveDataEnabled } from "@/lib/data";
import { parseTsxSymbol } from "@/lib/data/symbols";
import { connection } from "next/server";

export async function GET(request: Request, context: { params: Promise<{ symbol: string }> }) {
  await connection();
  const { symbol } = await context.params;
  const parsed = parseTsxSymbol(symbol);
  if (!parsed) return Response.json({ error: "Expected a TSX symbol like RY.TO" }, { status: 400 });
  const refreshQuery = new URL(request.url).searchParams.get("refresh");
  const refresh = refreshQuery === "0" || refreshQuery === "false" ? false : liveDataEnabled();
  const snapshot = await (await getGateway()).getSnapshot(parsed, { refresh });
  if (!snapshot) return Response.json({ error: "Unknown symbol" }, { status: 404 });
  return Response.json(snapshot);
}
