"use client";

import { parseTsxSymbol } from "@/lib/data/symbols";
import { clampShares } from "@/lib/finance/csv";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createBrowserStorage } from "./adapter";

/**
 * A practice holding. `shares` is missing only while an old dollar basket
 * waits for a price. `dollars` is dropped once shares are saved.
 */
export interface Holding {
  symbol: string;
  shares?: number;
  dollars?: number;
}

type GalaxyMode = "auto" | "3d" | "2d";

export type PracticeAccount = "tfsa" | "rrsp" | "fhsa" | "other";

const WATCH_CAP = 30;

/** Adds a symbol, or leaves the list alone when it is already there. Past 30, the oldest star drops. */
export function addWatch(list: string[], symbol: string): string[] {
  if (list.includes(symbol)) return list;
  const next = [...list, symbol];
  return next.length > WATCH_CAP ? next.slice(next.length - WATCH_CAP) : next;
}

interface DeskState {
  holdings: Holding[];
  galaxyMode: GalaxyMode;
  bestQuiz: number;
  watchlist: string[];
  accountType: PracticeAccount | null;
  /** Indexes into the quiz question list from the last finished attempt. */
  missedQuiz: number[];
  addHolding: (symbol: string, shares?: number) => void;
  removeHolding: (symbol: string) => void;
  setShares: (symbol: string, shares: number) => void;
  setGalaxyMode: (mode: GalaxyMode) => void;
  setBestQuiz: (score: number) => void;
  toggleWatch: (symbol: string) => void;
  setAccountType: (accountType: PracticeAccount | null) => void;
  setMissedQuiz: (indexes: number[]) => void;
}

type PersistedDesk = Pick<DeskState, "holdings" | "galaxyMode" | "bestQuiz" | "watchlist" | "accountType" | "missedQuiz">;

function sanitizeMissedQuiz(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<number>();
  const indexes: number[] = [];
  for (const value of raw) {
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 99 || seen.has(value)) continue;
    seen.add(value);
    indexes.push(value);
  }
  return indexes;
}

function sanitizeWatchlist(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const symbols: string[] = [];
  for (const value of raw) {
    if (typeof value !== "string") continue;
    const symbol = parseTsxSymbol(value);
    if (!symbol || symbols.includes(symbol)) continue;
    symbols.push(symbol);
  }
  return symbols.length > WATCH_CAP ? symbols.slice(symbols.length - WATCH_CAP) : symbols;
}

function sanitizeAccount(raw: unknown): PracticeAccount | null {
  return raw === "tfsa" || raw === "rrsp" || raw === "fhsa" || raw === "other" ? raw : null;
}

function migrateHolding(raw: unknown): Holding | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as { symbol?: unknown; shares?: unknown; dollars?: unknown };
  if (typeof row.symbol !== "string" || row.symbol.length === 0) return null;
  if (typeof row.shares === "number" && Number.isFinite(row.shares) && row.shares > 0) {
    return { symbol: row.symbol, shares: clampShares(row.shares) };
  }
  if (typeof row.dollars === "number" && Number.isFinite(row.dollars)) {
    return { symbol: row.symbol, dollars: row.dollars };
  }
  return null;
}

const memory = createBrowserStorage();

export const useDesk = create<DeskState>()(
  persist<DeskState, [], [], PersistedDesk>(
    (set, get) => ({
      holdings: [],
      galaxyMode: "auto",
      bestQuiz: 0,
      watchlist: [],
      accountType: null,
      missedQuiz: [],
      addHolding: (symbol, shares = 1) => {
        if (get().holdings.some((holding) => holding.symbol === symbol)) return;
        if (!Number.isFinite(shares)) return;
        set({ holdings: [...get().holdings, { symbol, shares: clampShares(shares) }] });
      },
      removeHolding: (symbol) => set({ holdings: get().holdings.filter((holding) => holding.symbol !== symbol) }),
      setShares: (symbol, shares) => {
        if (!Number.isFinite(shares)) return;
        const next = clampShares(shares);
        set({
          holdings: get().holdings.map((holding) =>
            holding.symbol === symbol ? { symbol: holding.symbol, shares: next } : holding,
          ),
        });
      },
      setGalaxyMode: (galaxyMode) => set({ galaxyMode }),
      setBestQuiz: (score) => set({ bestQuiz: Math.max(get().bestQuiz, score) }),
      toggleWatch: (symbol) => {
        const parsed = parseTsxSymbol(symbol);
        if (!parsed) return;
        const current = sanitizeWatchlist(get().watchlist);
        if (current.includes(parsed)) {
          set({ watchlist: current.filter((item) => item !== parsed) });
          return;
        }
        set({ watchlist: addWatch(current, parsed) });
      },
      setAccountType: (accountType) => set({ accountType: sanitizeAccount(accountType) }),
      setMissedQuiz: (indexes) => set({ missedQuiz: sanitizeMissedQuiz(indexes) }),
    }),
    {
      name: "maple-market-desk",
      version: 2,
      skipHydration: true,
      migrate: (persisted) => {
        const state =
          persisted && typeof persisted === "object"
            ? (persisted as {
                holdings?: unknown;
                galaxyMode?: unknown;
                bestQuiz?: unknown;
                missedQuiz?: unknown;
                watchlist?: unknown;
                accountType?: unknown;
              })
            : {};
        const holdings = Array.isArray(state.holdings)
          ? state.holdings.flatMap((row) => {
              const holding = migrateHolding(row);
              return holding ? [holding] : [];
            })
          : [];
        const galaxyMode: GalaxyMode =
          state.galaxyMode === "3d" || state.galaxyMode === "2d" || state.galaxyMode === "auto" ? state.galaxyMode : "auto";
        const bestQuiz = typeof state.bestQuiz === "number" && Number.isFinite(state.bestQuiz) ? state.bestQuiz : 0;
        return {
          holdings,
          galaxyMode,
          bestQuiz,
          watchlist: sanitizeWatchlist(state.watchlist),
          accountType: sanitizeAccount(state.accountType),
          missedQuiz: sanitizeMissedQuiz(state.missedQuiz),
        };
      },
      storage: createJSONStorage(() => ({
        getItem: (key) => memory.get(key),
        setItem: (key, value) => memory.set(key, value),
        removeItem: (key) => memory.remove(key),
      })),
    },
  ),
);
