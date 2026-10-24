export interface PersistenceAdapter {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export function createBrowserStorage(): PersistenceAdapter {
  return {
    get(key) {
      if (typeof window === "undefined") return null;
      return window.localStorage.getItem(key);
    },
    set(key, value) {
      window.localStorage.setItem(key, value);
    },
    remove(key) {
      window.localStorage.removeItem(key);
    },
  };
}
