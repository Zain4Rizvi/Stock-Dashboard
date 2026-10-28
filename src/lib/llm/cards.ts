import type { PageBrief } from "./pages";
import { CoachCardSchema, GuideCardSchema, type CoachCard, type GuideCard } from "./schemas";

const ungrounded = { asOf: null, sourceNote: null };

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
    ...ungrounded,
    notAPrediction: true,
  });
}

export function misconfiguredGuide(page: Pick<PageBrief, "tryThis">): GuideCard {
  return GuideCardSchema.parse({
    answer: "The teacher is not set up yet, so this is not a live answer. Nothing was sent to a model.",
    tryThis: page.tryThis,
    notAPrediction: true,
  });
}

export function unavailableGuide(page: Pick<PageBrief, "tryThis">): GuideCard {
  return GuideCardSchema.parse({
    answer: "The teacher could not finish that answer. You can try the same question again.",
    tryThis: page.tryThis,
    notAPrediction: true,
  });
}

export function limitedGuide(page: Pick<PageBrief, "tryThis">, scope: "hour" | "day", retryAt: string): GuideCard {
  const when = retryAt.trim() || "later";
  const answer =
    scope === "day"
      ? `The site has answered as many questions as it can today. Try again at ${when}.`
      : `You've asked enough for this hour. Try again at ${when}.`;
  return GuideCardSchema.parse({
    answer,
    tryThis: page.tryThis,
    notAPrediction: true,
  });
}

export function misconfiguredCoach(): CoachCard {
  return CoachCardSchema.parse({
    headline: "The teacher is not set up",
    answer: "This desk cannot reach a teacher yet. Nothing was sent to a model, so this is not a personalized answer.",
    fit: "Your three choices were not used. Nothing here is a match.",
    watchouts: ["This is a setup gap, not a limit on your questions."],
    terms: [],
    ...ungrounded,
    notAPrediction: true,
  });
}

export function unavailableCoach(): CoachCard {
  return CoachCardSchema.parse({
    headline: "The teacher is unavailable",
    answer: "The teacher could not finish that answer. You can try the same question again.",
    fit: "Your three choices were not used for this reply. Nothing here is a match.",
    watchouts: ["A busy or timed-out teacher is not a verdict on a company."],
    terms: [],
    ...ungrounded,
    notAPrediction: true,
  });
}

export function limitedCoach(scope: "hour" | "day", retryAt: string): CoachCard {
  const when = retryAt.trim() || "later";
  const answer =
    scope === "day"
      ? `The site has answered as many questions as it can today. Try again at ${when}.`
      : `You've asked enough for this hour. Try again at ${when}.`;
  return CoachCardSchema.parse({
    headline: "The teacher is booked up",
    answer,
    fit: "Your three choices were not used for this reply. Nothing here is a match.",
    watchouts: ["This is a pause, not a verdict on a company."],
    terms: [],
    ...ungrounded,
    notAPrediction: true,
  });
}

export function refusedCoach(): CoachCard {
  return CoachCardSchema.parse({
    headline: "I don't give a verdict",
    answer: "I can explain a company and how your choices sit with it. I will not tell you to trade or guess the next price.",
    fit: "Your three choices and portfolio stay on this device. They are not a reason to trade.",
    watchouts: ["A grade or a green year describes the past."],
    terms: [],
    ...ungrounded,
    notAPrediction: true,
  });
}
