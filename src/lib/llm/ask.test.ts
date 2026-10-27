import { describe, expect, it } from "vitest";
import { limitedCoach, misconfiguredCoach, offlineCoach, offlineGuide, refusedCoach, unavailableCoach } from "./cards";
import { sourceLine } from "./client";
import { PAGE_BRIEFS, pageBrief, pageIdFromPath } from "./pages";
import { coachPrompt, guidePrompt, mentionedTicker } from "./prompts";
import { CoachCardSchema, GuideCardSchema, rejectsPrediction, resolveAskSource } from "./schemas";

describe("ask language", () => {
  it("keeps the guide on the page brief and the coach on plain profile words", () => {
    expect(pageBrief("explore").title).toBe("Explore");
    expect(pageBrief("nope").title).toBe("This screen");
    expect(pageBrief(undefined).title).toBe("This screen");
    expect(pageIdFromPath("/")).toBe("explore");
    expect(pageIdFromPath("/stock/RY.TO")).toBe("stock");
    expect(pageIdFromPath("/heatmap")).toBe("heatmap");
    expect(pageIdFromPath("/missing")).toBe("other");

    for (const id of Object.keys(PAGE_BRIEFS)) {
      expect(GuideCardSchema.safeParse(offlineGuide(pageBrief(id))).success).toBe(true);
    }

    const guide = guidePrompt(pageBrief("heatmap"), "What do the colors mean?", []);
    expect(guide).toMatch(/quilt/i);
    expect(guide).not.toContain("ZZZZ.TO");
    expect(guide).not.toMatch(/practice portfolio/i);
    expect(guide).not.toContain("Just learning");

    const coach = coachPrompt({
      message: "What fits me?",
      history: [],
      profile: { goal: "learn", horizon: "ten_plus", drop: "uneasy" },
      holdings: [{ symbol: "RY.TO", shares: 12 }],
      stock: null,
      unknownTicker: null,
    });
    expect(coach).toContain("Just learning");
    expect(coach).toContain("10 years or more");
    expect(coach).toContain("I'd feel sick but leave it");
    expect(coach).not.toContain("ten_plus");
    expect(coach).toContain("RY.TO");
    expect(coach).toContain("12 shares");
    expect(coach).not.toContain("$500");

    const blank = coachPrompt({
      message: "What fits me?",
      history: [],
      profile: null,
      holdings: [],
      stock: null,
      unknownTicker: null,
    });
    expect(blank).toMatch(/choices are empty/i);
    expect(blank).toMatch(/Practice portfolio: empty/);

    const card = {
      headline: "A dividend is cash, not a promise",
      answer: "Some companies send owners a slice of profit. They can cut it.",
      fit: "Just learning, and the practice shelf can stay small while you learn the words.",
      watchouts: ["A high yield can mean the price already fell."],
      terms: [{ word: "Yield", plain: "The yearly cash divided by the price." }],
      followUp: "Do you want that cash spent, or used to hold more shares?",
      notAPrediction: true as const,
    };
    expect(CoachCardSchema.safeParse(card).success).toBe(true);
    const { notAPrediction, ...missing } = card;
    expect(notAPrediction).toBe(true);
    expect(CoachCardSchema.safeParse(missing).success).toBe(false);
    expect(rejectsPrediction(JSON.stringify(refusedCoach()))).toBe(false);

    expect(mentionedTicker("What about ry.to and SHOP.TO?")).toBe("RY.TO");
    expect(mentionedTicker("Look at TECK-B.TO please")).toBe("TECK-B.TO");
    expect(mentionedTicker("no ticker here")).toBeNull();
  });
});

describe("ask outcomes", () => {
  it("maps a missing teacher to misconfigured and a thrown call to unavailable", () => {
    expect(resolveAskSource({ provider: null, overCap: false, failed: false, refused: false })).toBe("misconfigured");
    expect(resolveAskSource({ provider: null, overCap: true, failed: true, refused: true })).toBe("misconfigured");
    expect(resolveAskSource({ provider: {}, overCap: false, failed: true, refused: false })).toBe("unavailable");
    expect(resolveAskSource({ provider: {}, overCap: true, failed: true, refused: false })).toBe("limited");
    expect(resolveAskSource({ provider: {}, overCap: false, failed: false, refused: true })).toBe("refused");
    expect(resolveAskSource({ provider: {}, overCap: false, failed: false, refused: false })).toBe("groq");

    const missing = misconfiguredCoach();
    expect(missing.headline).toMatch(/not set up/i);
    expect(JSON.stringify(missing)).not.toMatch(/groq|api[_-]?key|secret|bearer/i);
    expect(unavailableCoach().answer).toMatch(/try the same question again/i);
    const hour = limitedCoach("hour", "21:00 UTC on 2026-10-26");
    const day = limitedCoach("day", "00:00 UTC on 2026-10-27");
    expect(hour.headline).not.toBe(offlineCoach().headline);
    expect(hour.answer).toContain("21:00 UTC on 2026-10-26");
    expect(hour.answer).not.toMatch(/offline/i);
    expect(day.answer).toContain("00:00 UTC on 2026-10-27");
    expect(sourceLine("unavailable")).not.toContain("No model was called");
    expect(sourceLine("misconfigured")).toMatch(/not set up/i);
    expect(sourceLine("limited")).not.toMatch(/offline/i);
    expect(sourceLine("groq")).toMatch(/AI/);
  });
});
