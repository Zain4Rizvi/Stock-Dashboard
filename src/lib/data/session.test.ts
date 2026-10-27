import { describe, expect, it } from "vitest";
import { describeQuoteFreshness, isQuoteStale, marketSessionNote } from "./session";

/** October 2026 is still on daylight time: Toronto is UTC-4. */
const FRIDAY_CLOSE = "2026-10-23T20:00:00.000Z";
const MONDAY_OPEN = new Date("2026-10-26T14:00:00.000Z");
const TUESDAY_OPEN = new Date("2026-10-27T14:00:00.000Z");
const SATURDAY = new Date("2026-10-24T14:00:00.000Z");

describe("quote age", () => {
  it("treats Friday's close as fresh on Monday morning", () => {
    expect(isQuoteStale(FRIDAY_CLOSE, MONDAY_OPEN)).toBe(false);
  });

  it("treats Friday's close as stale on Tuesday morning", () => {
    expect(isQuoteStale(FRIDAY_CLOSE, TUESDAY_OPEN)).toBe(true);
  });

  it("treats Friday's close as fresh on Saturday", () => {
    expect(isQuoteStale(FRIDAY_CLOSE, SATURDAY)).toBe(false);
  });
});

describe("market session note", () => {
  it("says the session is open and the number is still the previous close", () => {
    const note = marketSessionNote(MONDAY_OPEN);
    expect(note).toMatch(/session is open/i);
    expect(note).toMatch(/previous close/i);
    expect(note).toMatch(/evening job/i);
    expect(note?.toLowerCase()).not.toMatch(/real time|live quote/);
  });

  it("stays quiet outside the weekday session", () => {
    expect(marketSessionNote(SATURDAY)).toBeNull();
    expect(marketSessionNote(new Date("2026-10-26T13:29:00.000Z"))).toBeNull();
    expect(marketSessionNote(new Date("2026-10-26T13:30:00.000Z"))).toMatch(/session is open/i);
    expect(marketSessionNote(new Date("2026-10-26T20:00:00.000Z"))).toBeNull();
  });
});

describe("badge copy", () => {
  it("names a seed fallback as the demo snapshot", () => {
    const text = describeQuoteFreshness({
      freshness: "demo",
      source: "yahoo",
      asOf: "2026-10-23T20:58:02.946Z",
      fallback: true,
      generatedAt: "2026-10-23T20:58:45.868Z",
      now: MONDAY_OPEN,
    });
    expect(text).toMatch(/Demo snapshot/);
    expect(text).toMatch(/2026-10-23/);
    expect(text).not.toMatch(/Saved snapshot|Live quote/);
  });

  it("labels a Yahoo close as unofficial and not live", () => {
    const text = describeQuoteFreshness({
      freshness: "snapshot",
      source: "yahoo",
      asOf: FRIDAY_CLOSE,
      fetchedAt: "2026-10-23T22:00:30.000Z",
      now: MONDAY_OPEN,
    });
    expect(text).toMatch(/Last close 2026-10-23/);
    expect(text).toMatch(/unofficial Yahoo/);
    expect(text).toMatch(/not a live quote/);
    expect(text).toMatch(/session is open/i);
    expect(text).not.toMatch(/Live quote/);
    expect(text.toLowerCase()).not.toMatch(/real time/);
  });

  it("says fetched at when Yahoo did not send an exchange time", () => {
    const text = describeQuoteFreshness({
      freshness: "snapshot",
      source: "yahoo",
      asOf: "2026-10-26T22:00:30.000Z",
      now: SATURDAY,
    });
    expect(text).toMatch(/Fetched at 2026-10-26/);
    expect(text).not.toMatch(/Last close/);
  });

  it("warns when the close is stale", () => {
    const text = describeQuoteFreshness({
      freshness: "snapshot",
      source: "yahoo",
      asOf: FRIDAY_CLOSE,
      fetchedAt: "2026-10-23T22:00:30.000Z",
      now: TUESDAY_OPEN,
    });
    expect(text).toMatch(/older than the last few sessions/i);
  });
});
