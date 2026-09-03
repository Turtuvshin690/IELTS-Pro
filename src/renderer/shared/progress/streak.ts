export const TARGET_BAND_KEY = 'ieltsPro.targetBand';

export function dayKey(iso: string): string {
  return String(iso).slice(0, 10);
}

function prevDay(key: string): string {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function computeStreak(dayKeys: string[], todayKey: string): number {
  const set = new Set(dayKeys);
  let cursor = set.has(todayKey) ? todayKey : prevDay(todayKey);
  if (!set.has(cursor)) return 0;
  let n = 0;
  while (set.has(cursor)) {
    n += 1;
    cursor = prevDay(cursor);
  }
  return n;
}

export function computeXP(correctCount: number): number {
  return Math.max(0, Math.floor(correctCount)) * 10;
}
