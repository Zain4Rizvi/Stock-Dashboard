"use client";

import type { AskSource, CoachCard, Profile } from "@/lib/llm/schemas";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createBrowserStorage } from "./adapter";

export interface CoachMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  card?: CoachCard;
  source?: AskSource;
}

const MAX_TURNS = 40;
const memory = createBrowserStorage();

interface CoachState {
  profile: Profile | null;
  messages: CoachMessage[];
  setProfile: (profile: Profile) => void;
  push: (message: CoachMessage) => void;
  clear: () => void;
}

export const useCoach = create<CoachState>()(
  persist(
    (set, get) => ({
      profile: null,
      messages: [],
      setProfile: (profile) => set({ profile }),
      push: (message) => set({ messages: [...get().messages, message].slice(-MAX_TURNS) }),
      clear: () => set({ messages: [] }),
    }),
    {
      name: "maple-market-coach",
      skipHydration: true,
      storage: createJSONStorage(() => ({
        getItem: (key) => memory.get(key),
        setItem: (key, value) => memory.set(key, value),
        removeItem: (key) => memory.remove(key),
      })),
    },
  ),
);
