"use client";

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

interface DeskState {
  holdings: Holding[];
  galaxyMode: GalaxyMode;
  bestQuiz: number;
  addHolding: (symbol: string, shares?: number) => void;
  removeHolding: (symbol: string) => void;
  setShares: (symbol: string, shares: number) => void;
  setGalaxyMode: (mode: GalaxyMode) => void;
  setBestQuiz: (score: number) => void;
}

type PersistedDesk = Pick<DeskState, "holdings" | "galaxyMode" | "bestQuiz">;

function clampShares(shares: number): number {
  const rounded = Math.round(shares * 10_000) / 10_000;
  return Math.min(1_000_000, Math.max(0.01, rounded));
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
    }),
    {
      name: "maple-market-desk",
      version: 2,
      skipHydration: true,
      migrate: (persisted) => {
        const state =
          persisted && typeof persisted === "object"
            ? (persisted as { holdings?: unknown; galaxyMode?: unknown; bestQuiz?: unknown })
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
        return { holdings, galaxyMode, bestQuiz };
      },
      storage: createJSONStorage(() => ({
        getItem: (key) => memory.get(key),
        setItem: (key, value) => memory.set(key, value),
        removeItem: (key) => memory.remove(key),
      })),
    },
  ),
);
