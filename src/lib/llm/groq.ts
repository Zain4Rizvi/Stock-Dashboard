import { SYSTEM_PROMPT } from "./prompts";
import type { LLMProvider } from "./provider";
import type { ZodType } from "zod";

function extractJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(trimmed);
}

export function createGroqProvider(): LLMProvider {
  return {
    id: "groq",
    async complete<T>(prompt: string, schema: ZodType<T>): Promise<T> {
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) throw new Error("GROQ_API_KEY is not set");
      const model = process.env.LLM_MODEL || "llama-3.3-70b-versatile";
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        signal: AbortSignal.timeout(20000),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
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
