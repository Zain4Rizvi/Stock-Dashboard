import { ProviderError } from "./provider";

export async function fetchJson(url: string, provider: string, timeoutMs = 12000): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        Accept: "application/json",
        "User-Agent": "MapleMarket/0.1 (educational research)",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "request failed";
    throw new ProviderError(message, provider);
  }
  if (!response.ok) {
    throw new ProviderError(`HTTP ${response.status}`, provider);
  }
  try {
    return await response.json();
  } catch {
    throw new ProviderError("Response was not JSON", provider);
  }
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  return null;
}

export function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && value !== "None" && value !== "-") {
    const parsed = Number(value.replace(/,/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

/** Twelve Data and Alpha Vantage often send ratios as decimals (0.035 = 3.5%). */
export function decimalToPercent(value: number | null): number | null {
  if (value == null) return null;
  if (Math.abs(value) <= 1.5) return Math.round(value * 10000) / 100;
  return value;
}
