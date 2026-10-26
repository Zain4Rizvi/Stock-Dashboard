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

export const ProfileSchema = z.object({
  goal: z.enum(["learn", "first_chunk", "long_term", "income_later"]),
  horizon: z.enum(["this_year", "five_years", "ten_plus"]),
  drop: z.enum(["sell", "uneasy", "leave_it"]),
});

export type Profile = z.infer<typeof ProfileSchema>;

export const GOAL_OPTIONS = [
  { id: "learn", label: "Just learning" },
  { id: "first_chunk", label: "A first chunk of money" },
  { id: "long_term", label: "Money not needed for years" },
  { id: "income_later", label: "Cash that shows up later" },
] as const satisfies readonly { id: Profile["goal"]; label: string }[];

export const HORIZON_OPTIONS = [
  { id: "this_year", label: "This year" },
  { id: "five_years", label: "About 5 years" },
  { id: "ten_plus", label: "10 years or more" },
] as const satisfies readonly { id: Profile["horizon"]; label: string }[];

export const DROP_OPTIONS = [
  { id: "sell", label: "I'd want out" },
  { id: "uneasy", label: "I'd feel sick but leave it" },
  { id: "leave_it", label: "I wouldn't check" },
] as const satisfies readonly { id: Profile["drop"]; label: string }[];

export const GuideCardSchema = z.object({
  answer: z.string().min(1).max(900),
  tryThis: z.string().min(1).max(240),
  notAPrediction: z.literal(true),
});

export const CoachCardSchema = z.object({
  headline: z.string().min(1).max(140),
  answer: z.string().min(1).max(1200),
  fit: z.string().min(1).max(500),
  watchouts: z.array(z.string().min(1).max(200)).max(3),
  terms: z
    .array(
      z.object({
        word: z.string().min(1).max(40),
        plain: z.string().min(1).max(160),
      }),
    )
    .max(3),
  followUp: z.string().max(200).nullable().optional(),
  notAPrediction: z.literal(true),
});

export type GuideCard = z.infer<typeof GuideCardSchema>;
export type CoachCard = z.infer<typeof CoachCardSchema>;
export type AskSource = "groq" | "offline" | "refused";

export const AskBodySchema = z.object({
  mode: z.enum(["guide", "coach"]),
  pageId: z.string().max(40).optional(),
  message: z.string().min(1).max(800),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        text: z.string().max(1600),
      }),
    )
    .max(8)
    .optional(),
  profile: ProfileSchema.nullable().optional(),
  holdings: z
    .array(
      z.object({
        symbol: z.string().min(1).max(20),
        shares: z.number(),
      }),
    )
    .max(12)
    .optional(),
});

export type AskBody = z.infer<typeof AskBodySchema>;

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
