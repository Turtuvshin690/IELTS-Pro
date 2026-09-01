export const READING_MAP: Record<number, number> = {
  39: 9,
  37: 8.5,
  35: 8,
  33: 7.5,
  30: 7,
  27: 6.5,
  23: 6,
  19: 5.5,
  15: 5,
  13: 4.5,
  10: 4,
  8: 3.5,
  6: 3,
  4: 2.5,
};

export function rawToBand(raw: number, total: number): number {
  if (total !== 40) return Math.round((raw / total) * 9 * 2) / 2;
  const keys = Object.keys(READING_MAP)
    .map(Number)
    .sort((a, b) => b - a);
  for (const k of keys) if (raw >= k) return READING_MAP[k];
  return 0;
}

export function overallBand(scores: number[]): number {
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.round(avg * 2) / 2;
}
