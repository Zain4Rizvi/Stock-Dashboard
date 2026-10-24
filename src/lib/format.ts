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
