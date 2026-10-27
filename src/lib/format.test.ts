import { describe, expect, it } from "vitest";
import { displayName } from "./format";

describe("displayName", () => {
  it("puts a short company name first and the ticker second", () => {
    expect(displayName("Royal Bank of Canada", "RY.TO")).toEqual({ name: "Royal Bank", ticker: "RY" });
    expect(displayName("Shopify", "SHOP.TO")).toEqual({ name: "Shopify", ticker: "SHOP" });
    expect(displayName("iShares Core Equity ETF Portfolio", "XEQT.TO")).toEqual({
      name: "iShares Core Equity",
      ticker: "XEQT",
    });
    expect(displayName("Bank of Nova Scotia", "BNS.TO")).toEqual({ name: "Bank of Nova Scotia", ticker: "BNS" });
    expect(displayName("Canadian Imperial Bank of Commerce", "CM.TO")).toEqual({
      name: "Canadian Imperial",
      ticker: "CM",
    });
    expect(displayName("", "RY.TO")).toEqual({ name: "RY", ticker: "RY" });
  });
});
