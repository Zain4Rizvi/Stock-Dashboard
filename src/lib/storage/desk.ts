"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createBrowserStorage } from "./adapter";

export interface Holding {
  symbol: string;
  dollars: number;
}

type GalaxyMode = "auto" | "3d" | "2d";

interface DeskState {
  holdings: Holding[];
  galaxyMode: GalaxyMode;
  bestQuiz: number;
  addHolding: (symbol: string, dollars?: number) => void;
  removeHolding: (symbol: string) => void;
  setDollars: (symbol: string, dollars: number) => void;
  setGalaxyMode: (mode: GalaxyMode) => void;
  setBestQuiz: (score: number) => void;
}

const memory = createBrowserStorage();

export const useDesk = create<DeskState>()(
  persist(
    (set, get) => ({
      holdings: [],
      galaxyMode: "auto",
      bestQuiz: 0,
      addHolding: (symbol, dollars = 500) => {
        if (get().holdings.some((holding) => holding.symbol === symbol)) return;
        set({ holdings: [...get().holdings, { symbol, dollars }] });
      },
      removeHolding: (symbol) => set({ holdings: get().holdings.filter((holding) => holding.symbol !== symbol) }),
      setDollars: (symbol, dollars) => {
        const next = Math.max(1, Math.min(1_000_000, Math.round(dollars)));
        set({
          holdings: get().holdings.map((holding) => (holding.symbol === symbol ? { ...holding, dollars: next } : holding)),
        });
      },
      setGalaxyMode: (galaxyMode) => set({ galaxyMode }),
      setBestQuiz: (score) => set({ bestQuiz: Math.max(get().bestQuiz, score) }),
    }),
    {
      name: "maple-market-desk",
      skipHydration: true,
      storage: createJSONStorage(() => ({
        getItem: (key) => memory.get(key),
        setItem: (key, value) => memory.set(key, value),
        removeItem: (key) => memory.remove(key),
      })),
    },
  ),
);
