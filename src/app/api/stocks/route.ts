import { getGateway } from "@/lib/data";
import { connection } from "next/server";

export async function GET() {
  await connection();
  const rows = await (await getGateway()).getExplorer();
  return Response.json(rows);
}
