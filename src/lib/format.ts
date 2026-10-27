const cad = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 2,
});

const cadCompact = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatCad(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return cad.format(value);
}

export function formatCompactCad(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return cadCompact.format(value);
}

export function formatPercent(value: number, digits = 1, signed = false): string {
  if (!Number.isFinite(value)) return "—";
  const body = `${Math.abs(value).toFixed(digits)}%`;
  if (!signed) return value < 0 ? `-${body}` : body;
  if (value > 0) return `+${body}`;
  if (value < 0) return `-${body}`;
  return body;
}

export function formatNumber(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString("en-CA", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

const NAME_SUFFIXES = [
  " ETF Portfolio",
  " Index ETF",
  " of Canada",
  " Communications",
  " International",
  " Corporation",
  " Management",
  " Financial",
  " Resources",
  " Company",
  " Railway",
  " Mines",
  " Mining",
  " Portfolio",
  " ETF",
];

function shortCompanyName(name: string): string {
  let text = name.trim().replace(/\s+/g, " ");
  if (!text) return "";
  for (let guard = 0; text.length > 16 && guard < 6; guard++) {
    const suffix = NAME_SUFFIXES.find((item) => text.endsWith(item) && text.length - item.length >= 2);
    if (!suffix) break;
    text = text.slice(0, -suffix.length).trim();
  }
  if (text.length > 22) {
    const words = text.split(" ");
    if (words.length >= 2 && words[1]?.toLowerCase() !== "of") text = `${words[0]} ${words[1]}`;
  }
  return text;
}

/** Company short name first, ticker second. The ticker drops the `.TO` suffix. */
export function displayName(name: string, symbol: string): { name: string; ticker: string } {
  const trimmed = symbol.trim();
  const ticker = trimmed.replace(/\.TO$/i, "");
  const short = shortCompanyName(name);
  const sameAsSymbol = short.toUpperCase() === trimmed.toUpperCase();
  return {
    name: !short || sameAsSymbol ? ticker || trimmed : short,
    ticker: ticker || trimmed,
  };
}
