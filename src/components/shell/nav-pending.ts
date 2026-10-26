"use client";

import { useSyncExternalStore } from "react";

let pending = false;
const listeners = new Set<() => void>();

export function setNavPending(next: boolean) {
  if (pending === next) return;
  pending = next;
  listeners.forEach((listener) => listener());
}

export function useNavPending() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => pending,
    () => false,
  );
}
