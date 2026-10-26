import type { PageBrief } from "./pages";
import { CoachCardSchema, GuideCardSchema, type CoachCard, type GuideCard } from "./schemas";

export function offlineGuide(page: Pick<PageBrief, "brief" | "tryThis">): GuideCard {
  return GuideCardSchema.parse({
    answer: page.brief,
    tryThis: page.tryThis,
    notAPrediction: true,
  });
}

export function refusedGuide(): GuideCard {
  return GuideCardSchema.parse({
    answer: "I can't give a trade or a future price. I can still explain this page. Questions about what fits you belong on the Ask page.",
    tryThis: "Ask what the picture on this page is showing.",
    notAPrediction: true,
  });
}

export function offlineCoach(): CoachCard {
  return CoachCardSchema.parse({
    headline: "The teacher is offline",
    answer: "The model is off, so this is not a personalized answer.",
    fit: "Your three choices were not used for this reply. Nothing here is a match.",
    watchouts: ["Try again in a little while."],
    terms: [],
    notAPrediction: true,
  });
}

export function refusedCoach(): CoachCard {
  return CoachCardSchema.parse({
    headline: "I don't give a verdict",
    answer: "I can explain a company and how your choices sit with it. I will not tell you to trade or guess the next price.",
    fit: "Your three choices and practice portfolio stay on this device. They are not a reason to trade.",
    watchouts: ["A grade or a green year describes the past."],
    terms: [],
    notAPrediction: true,
  });
}
