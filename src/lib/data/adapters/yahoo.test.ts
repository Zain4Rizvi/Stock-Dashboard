import { describe, expect, it } from "vitest";
import { QuoteSchema } from "@/lib/data/schemas";
import { quoteClock, quoteEventDates } from "./yahoo";

const FETCHED = new Date("2026-10-26T22:00:30.000Z");

describe("Yahoo quote clock", () => {
  it("uses regularMarketTime as asOf and keeps the fetch time separate", () => {
    const clock = quoteClock(
      { regularMarketTime: new Date("2026-10-26T20:00:00.000Z"), exchangeDataDelayedBy: 15 },
      FETCHED,
    );
    expect(clock.asOf).toBe("2026-10-26T20:00:00.000Z");
    expect(clock.fetchedAt).toBe(FETCHED.toISOString());
    expect(clock.delayMinutes).toBe(15);
    const parsed = QuoteSchema.parse({
      symbol: "RY.TO",
      price: 1,
      change: 0,
      changePercent: 0,
      previousClose: 1,
      marketCap: 1,
      volume: 1,
      ...clock,
    });
    expect(parsed.asOf).toBe("2026-10-26T20:00:00.000Z");
    expect(parsed.fetchedAt).toBe(FETCHED.toISOString());
    expect(parsed.delayMinutes).toBe(15);
  });

  it("omits a delay Yahoo did not send", () => {
    const clock = quoteClock({ regularMarketTime: new Date("2026-10-26T20:00:00.000Z") }, FETCHED);
    expect(clock.delayMinutes).toBeUndefined();
    expect("delayMinutes" in clock).toBe(false);
  });

  it("falls back to the fetch time when the exchange time is missing", () => {
    const clock = quoteClock({}, FETCHED);
    expect(clock.asOf).toBe(FETCHED.toISOString());
    expect(clock.fetchedAt).toBeUndefined();
  });
});

describe("Yahoo quote dates", () => {
  it("maps an earnings date only when the quote includes one", () => {
    expect(quoteEventDates({ earningsTimestamp: new Date("2026-11-04T21:00:00.000Z") })).toEqual({
      earningsDate: "2026-11-04",
    });
    expect(quoteEventDates({})).toEqual({});
    expect(quoteEventDates({ dividendDate: new Date("2026-11-01T00:00:00.000Z") })).toEqual({});
  });

  it("maps exDividendDate only when that field is on the quote", () => {
    expect(quoteEventDates({ exDividendDate: new Date("2026-12-01T00:00:00.000Z") })).toEqual({
      exDividendDate: "2026-12-01",
    });
  });
});
