import {
  CoachCardSchema,
  GuideCardSchema,
  type AskBody,
  type AskSource,
} from "@/lib/llm/schemas";
import { z } from "zod";

const SourceSchema = z.enum(["groq", "offline", "refused"]);

const GuideReplySchema = z.object({
  mode: z.literal("guide"),
  source: SourceSchema,
  card: GuideCardSchema,
});

const CoachReplySchema = z.object({
  mode: z.literal("coach"),
  source: SourceSchema,
  card: CoachCardSchema,
});

export type GuideReply = z.infer<typeof GuideReplySchema>;
export type CoachReply = z.infer<typeof CoachReplySchema>;

export function sourceLine(source: AskSource): string {
  if (source === "groq") return "Drafted with AI. It can be wrong.";
  if (source === "refused") return "That answer would have been a trade or a price call. It was not shown.";
  return "No model was called.";
}

export function recentHistory(turns: { role: "user" | "assistant"; text: string }[]): AskBody["history"] {
  return turns.slice(-8).map((turn) => ({ role: turn.role, text: turn.text.slice(0, 800) }));
}

export async function postAsk(body: AskBody): Promise<GuideReply | CoachReply> {
  const response = await fetch("/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await response.json().catch(() => null);
  if (!response.ok) throw new Error("The teacher got tangled.");
  const parsed = (body.mode === "guide" ? GuideReplySchema : CoachReplySchema).safeParse(json);
  if (!parsed.success) throw new Error("The teacher got tangled.");
  return parsed.data;
}
