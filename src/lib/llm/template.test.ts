import { describe, expect, it } from "vitest";
import { scoreStock } from "@/lib/scoring/score";
import { buildSyntheticSeed } from "@/lib/data/seed/synthetic";
import { UNIVERSE } from "@/lib/data/seed/universe";
import { templateExplanation, templateSentiment } from "./template";

describe("template language", () => {
  it("returns validated JSON and refuses a prediction", () => {
    const seed = buildSyntheticSeed([UNIVERSE.find((company) => company.symbol === "SHOP.TO")!]);
    const stock = seed.stocks[0];
    const score = scoreStock({
      name: stock.stock.name,
      sector: stock.stock.sector,
      fundamentals: stock.fundamentals,
      history: stock.history,
    });
    const explanation = templateExplanation(
      {
        stock: stock.stock,
        quote: stock.quote,
        history: stock.history,
        fundamentals: stock.fundamentals,
        news: [],
        isSynthetic: true,
        source: "synthetic",
        freshness: "demo",
      },
      score,
    );
    expect(explanation.notAPrediction).toBe(true);
    expect(explanation.story.toLowerCase()).not.toMatch(/you should buy|will go up/);
    expect(explanation.story).toMatch(/demo snapshot/i);
    const mood = templateSentiment(
      {
        stock: stock.stock,
        quote: stock.quote,
        history: stock.history,
        fundamentals: stock.fundamentals,
        news: [],
        isSynthetic: true,
        source: "synthetic",
        freshness: "demo",
      },
      [],
    );
    expect(mood.tone).toBe("quiet");
    expect(mood.explanation).toMatch(/does not invent news/i);
  });
});
