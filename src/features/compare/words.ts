export function contrast(label: string, rows: { name: string; score: number | null }[]): string | null {
  const ranked = rows.filter((row): row is { name: string; score: number } => row.score != null);
  if (ranked.length < 2) return null;
  ranked.sort((a, b) => b.score - a.score);
  const gap = ranked[0].score - ranked[ranked.length - 1].score;
  if (gap < 8) return `On ${label.toLowerCase()}, these companies sit close together.`;
  return `On ${label.toLowerCase()}, ${ranked[0].name} looks stronger than ${ranked[ranked.length - 1].name}. That compares the latest numbers. It is not a tip.`;
}
