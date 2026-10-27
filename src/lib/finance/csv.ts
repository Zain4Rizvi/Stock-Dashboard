import { parseTsxSymbol } from "@/lib/data/symbols";

export interface HoldingCsvRow {
  symbol: string;
  shares: number;
}

export interface HoldingCsvResult {
  rows: HoldingCsvRow[];
  unknown: string[];
  skipped: string[];
  error: string | null;
}

const SYMBOL_HEADERS = new Set(["symbol", "ticker"]);
const SHARE_HEADERS = new Set(["shares", "quantity"]);

/** Same rounding the practice desk uses for a share count. */
export function clampShares(shares: number): number {
  const rounded = Math.round(shares * 10_000) / 10_000;
  return Math.min(1_000_000, Math.max(0.01, rounded));
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (quoted) {
      if (char === '"') {
        if (line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        current += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === ",") {
      cells.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current);
  return cells;
}

function parseShares(cell: string): number | null {
  const cleaned = cell.trim().replace(/,/g, "");
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(cleaned)) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  return clampShares(value);
}

function columnIndex(headers: string[], names: Set<string>): number {
  return headers.findIndex((header) => names.has(header.trim().toLowerCase()));
}

/**
 * Reads a symbol-and-shares sheet on this computer.
 * The first non-empty line has to be the header. Unknown symbols are listed and left out.
 */
export function parseHoldingCsv(input: string, known: ReadonlySet<string>): HoldingCsvResult {
  const lines = input.replace(/^\uFEFF/, "").split(/\r?\n/);
  let headerIndex = -1;
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index]?.trim()) {
      headerIndex = index;
      break;
    }
  }
  if (headerIndex < 0) {
    return { rows: [], unknown: [], skipped: [], error: "This file needs a header row with a symbol and a share count." };
  }

  const headers = parseCsvLine(lines[headerIndex] ?? "");
  const symbolCol = columnIndex(headers, SYMBOL_HEADERS);
  const shareCol = columnIndex(headers, SHARE_HEADERS);
  if (symbolCol < 0 || shareCol < 0) {
    return { rows: [], unknown: [], skipped: [], error: "This file needs a header row with a symbol and a share count." };
  }

  const rows: HoldingCsvRow[] = [];
  const unknown: string[] = [];
  const skipped: string[] = [];
  for (let index = headerIndex + 1; index < lines.length; index += 1) {
    const raw = (lines[index] ?? "").trim();
    if (!raw) continue;
    const cells = parseCsvLine(raw);
    const symbolCell = (cells[symbolCol] ?? "").trim();
    const shares = parseShares(cells[shareCol] ?? "");
    if (!symbolCell || shares == null) {
      skipped.push(raw);
      continue;
    }
    const symbol = parseTsxSymbol(symbolCell);
    if (!symbol || !known.has(symbol)) {
      unknown.push(symbolCell);
      continue;
    }
    const existing = rows.findIndex((row) => row.symbol === symbol);
    if (existing >= 0) rows[existing] = { symbol, shares };
    else rows.push({ symbol, shares });
  }

  return { rows, unknown, skipped, error: null };
}
