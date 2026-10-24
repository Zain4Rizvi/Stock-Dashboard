import { z } from "zod";

export const ExplanationSchema = z.object({
  headline: z.string().min(1).max(180),
  story: z.string().min(1).max(1400),
  strengths: z.array(z.string().min(1).max(240)).min(1).max(4),
  watchouts: z.array(z.string().min(1).max(240)).min(1).max(4),
  beginnerTake: z.string().min(1).max(600),
  notAPrediction: z.literal(true),
});

export const SentimentSchema = z.object({
  tone: z.enum(["upbeat", "mixed", "uneasy", "quiet"]),
  title: z.string().min(1).max(160),
  explanation: z.string().min(1).max(1200),
  whyItMatters: z.string().min(1).max(600),
  whatThisIsNot: z.string().min(1).max(400),
});

export type Explanation = z.infer<typeof ExplanationSchema>;
export type Sentiment = z.infer<typeof SentimentSchema>;

const BANNED = [
  /will go up/i,
  /will go down/i,
  /price target/i,
  /guaranteed return/i,
  /you should buy/i,
  /you should sell/i,
  /strong buy/i,
  /strong sell/i,
];

export function rejectsPrediction(text: string): boolean {
  return BANNED.some((pattern) => pattern.test(text));
}
