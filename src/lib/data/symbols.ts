const TSX = /^[A-Z0-9]+(?:[.-][A-Z0-9]+)*\.TO$/;

/** UI symbols look like RY.TO or TECK-B.TO. */
export function parseTsxSymbol(input: string): string | null {
  try {
    return assertTsxSymbol(decodeURIComponent(input));
  } catch {
    return null;
  }
}

export function assertTsxSymbol(input: string): string {
  const symbol = input.trim().toUpperCase();
  if (!TSX.test(symbol)) {
    throw new Error(`Expected a TSX symbol like RY.TO, received "${input}"`);
  }
  return symbol;
}

export function toYahooSymbol(input: string): string {
  return assertTsxSymbol(input);
}

/** Alpha Vantage uses the Toronto suffix .TRT. */
export function toAlphaSymbol(input: string): string {
  return assertTsxSymbol(input).replace(/\.TO$/, ".TRT");
}

export function toFmpSymbol(input: string): string {
  return assertTsxSymbol(input);
}

/** Twelve Data wants the listing without .TO, hyphens as dots: BIP-UN.TO -> BIP.UN. */
export function toTwelveSymbol(input: string): { symbol: string; exchange: "TSX" } {
  const local = assertTsxSymbol(input).replace(/\.TO$/, "").replace(/-/g, ".");
  return { symbol: local, exchange: "TSX" };
}
