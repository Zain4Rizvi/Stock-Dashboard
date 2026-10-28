import { describe, expect, it } from "vitest";
import { assumptionSentence } from "../finance/compound";
import { limitedCoach, misconfiguredCoach, offlineCoach, offlineGuide, refusedCoach, unavailableCoach } from "./cards";
import { sourceLine } from "./client";
import { PAGE_BRIEFS, pageBrief, pageIdFromPath } from "./pages";
import { coachPrompt, guidePrompt, mentionedTicker, snapshotGrounding } from "./prompts";
import { CoachCardSchema, GuideCardSchema, copiedGrounding, rejectsPrediction, resolveAskSource } from "./schemas";

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
    expect(blank).toMatch(/Portfolio: empty/);

    const card = {
      headline: "A dividend is cash, not a promise",
      answer: "Some companies send owners a slice of profit. They can cut it.",
      fit: "Just learning, and the practice shelf can stay small while you learn the words.",
      watchouts: ["A high yield can mean the price already fell."],
      terms: [{ word: "Yield", plain: "The yearly cash divided by the price." }],
      followUp: "Do you want that cash spent, or used to hold more shares?",
      asOf: null,
      sourceNote: null,
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

    expect(rejectsPrediction("should I buy RY.TO")).toBe(true);
    expect(rejectsPrediction("Should I sell SHOP.TO?")).toBe(true);
    expect(rejectsPrediction("will it rise")).toBe(true);
    expect(rejectsPrediction("What does a dividend actually do?")).toBe(false);

    const invented = {
      ...card,
      asOf: "2026-10-23T20:00:00.000Z",
      sourceNote: "a blog I like",
    };
    expect(CoachCardSchema.safeParse(invented).success).toBe(false);
    const grounded = { ...card, asOf: null, sourceNote: null };
    expect(CoachCardSchema.safeParse(grounded).success).toBe(true);
    expect(
      CoachCardSchema.safeParse({ ...grounded, asOf: "2026-10-23T20:00:00.000Z", sourceNote: "demo snapshot" }).success,
    ).toBe(true);
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

describe("ask grounding", () => {
  const history = [
    { date: "2020-01-02", close: 1.234 },
    { date: "2025-10-24", close: 100 },
    { date: "2026-10-23", close: 110 },
  ];

  it("names the demo snapshot date, source, and price-change window without the history", () => {
    const grounding = snapshotGrounding({
      quote: { price: 190.5, asOf: "2026-10-23T20:00:00.000Z" },
      history,
      source: "yahoo",
      isSynthetic: false,
      freshness: "demo",
      fallback: true,
    });
    expect(grounding.demoSnapshot).toBe(true);
    expect(grounding.sourceNote).toBe("demo snapshot");
    expect(grounding.asOf).toBe("2026-10-23T20:00:00.000Z");
    expect(grounding.source).toBe("yahoo");
    expect(grounding.price).toBe(190.5);
    expect(grounding.priceChange).toEqual({ start: "2025-10-24", end: "2026-10-23", percent: 10 });
    expect(JSON.stringify(grounding)).not.toContain("1.234");

    const prompt = coachPrompt({
      message: "What is RY.TO?",
      history: [],
      profile: null,
      holdings: [],
      stock: {
        symbol: "RY.TO",
        name: "Royal Bank",
        sector: "Financials",
        blurb: "A bank.",
        summary: "A large bank.",
        ...grounding,
      },
      unknownTicker: null,
    });
    expect(prompt).toContain("The figures below are the demo snapshot");
    expect(prompt).toContain("2026-10-23T20:00:00.000Z");
    expect(prompt).toContain("demo snapshot");
    expect(prompt).toContain("unofficial Yahoo close");
    expect(prompt).toContain("2025-10-24");
    expect(prompt).toContain("2026-10-23");
    expect(prompt).toContain("yahoo");
    expect(prompt).not.toContain("1.234");
  });

  it("keeps a live Yahoo close on the allowlist and drops a missing window", () => {
    const grounding = snapshotGrounding({
      quote: { price: 10, asOf: "2026-10-23T20:00:00.000Z" },
      history: [{ date: "2026-10-23", close: 10 }],
      source: "yahoo",
      isSynthetic: false,
      freshness: "snapshot",
    });
    expect(grounding.demoSnapshot).toBe(false);
    expect(grounding.sourceNote).toBe("unofficial Yahoo close");
    expect(grounding.priceChange).toBeNull();
    expect(copiedGrounding({ asOf: grounding.asOf, sourceNote: "demo snapshot" }, { asOf: grounding.asOf, sourceNote: grounding.sourceNote })).toBe(false);
    expect(copiedGrounding({ asOf: grounding.asOf, sourceNote: grounding.sourceNote }, { asOf: grounding.asOf, sourceNote: grounding.sourceNote })).toBe(true);
    expect(copiedGrounding({ asOf: null, sourceNote: null }, null)).toBe(true);
  });
});

describe("projection assumptions", () => {
  it("names the pace, the wobble, inflation, and yearly contributions", () => {
    const sentence = assumptionSentence({ pace: 0.06, wobble: 0.12, inflation: 0.02 });
    expect(sentence).toContain("6% pace");
    expect(sentence).toContain("12% wobble");
    expect(sentence).toContain("2% inflation");
    expect(sentence).toMatch(/yearly contributions/i);
    expect(sentence).toMatch(/once a year/i);
    expect(sentence.toLowerCase()).not.toContain("you will have");
    expect(sentence).not.toMatch(/\.TO\b/);
    expect(assumptionSentence({ pace: 0.08, wobble: 0.18, inflation: 0.03 })).toContain("an 8% pace");
    expect(assumptionSentence({ pace: 0.08, wobble: 0.18, inflation: 0.03 })).toContain("an 18% wobble");
  });
});
