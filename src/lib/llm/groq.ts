import { SYSTEM_PROMPT } from "./prompts";
import type { LLMProvider } from "./provider";
import type { ZodType } from "zod";

function extractJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(trimmed);
}

export function createGroqProvider(apiKey: string, model?: string): LLMProvider {
  const chosen = model?.trim() || "openai/gpt-oss-120b";
  return {
    id: "groq",
    async complete<T>(prompt: string, schema: ZodType<T>): Promise<T> {
      if (!apiKey.trim()) throw new Error("Teacher is not set up");
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        signal: AbortSignal.timeout(20000),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: chosen,
          temperature: 0.3,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: prompt },
          ],
        }),
      });
      if (!response.ok) {
        throw new Error(`Groq HTTP ${response.status}`);
      }
      const payload = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = payload.choices?.[0]?.message?.content;
      if (!content) throw new Error("Groq returned an empty message");
      return schema.parse(extractJson(content));
    },
  };
}
