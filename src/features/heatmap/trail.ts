export const TRAIL_CAP = 12;

export function pushTrail(trail: readonly string[], symbol: string): string[] {
  if (trail.at(-1) === symbol) return [...trail];
  const next = [...trail, symbol];
  return next.length > TRAIL_CAP ? next.slice(next.length - TRAIL_CAP) : next;
}

export function popTrail(trail: readonly string[]): string[] {
  return trail.length > 1 ? trail.slice(0, -1) : [...trail];
}

/** Query wins when it is in the universe. Otherwise the last stored symbol, then the fallback. */
export function resolvePreview(
  query: string | null,
  stored: readonly string[],
  known: ReadonlySet<string>,
  fallback: string,
): { symbol: string; trail: string[] } {
  const trail = stored.filter((symbol) => known.has(symbol));
  const asked = query && known.has(query) ? query : null;
  const symbol = asked ?? trail.at(-1) ?? fallback;
  return { symbol, trail: pushTrail(trail, symbol) };
}
