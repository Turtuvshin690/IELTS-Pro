export type WeakArea = { qType: string; acc: number; total: number; wrong: number };

export function weakAreas(items: { qType: string; correct: boolean }[]): WeakArea[] {
  const map = new Map<string, { total: number; wrong: number }>();
  for (const i of items) {
    const g = map.get(i.qType) || { total: 0, wrong: 0 };
    g.total++;
    if (!i.correct) g.wrong++;
    map.set(i.qType, g);
  }
  return [...map.entries()]
    .map(([qType, v]) => ({ qType, acc: 1 - v.wrong / v.total, total: v.total, wrong: v.wrong }))
    .sort((a, b) => a.acc - b.acc);
}

export type AttemptRow = {
  id: string;
  testId: string;
  mode: string | null;
  startedAt: string | null;
  submittedAt: string | null;
  rawScore: number | null;
  band: number | null;
  answers: string | null;
};

export type BandPoint = { at: string; band: number; testId: string };

export function bandTrends(attempts: AttemptRow[] | { band: number; at: string }[]): BandPoint[] {
  const rows = attempts as AttemptRow[];
  // handle both Attempt store shape and DB row shape
  return rows
    .filter((r: any) => r.band != null && (r.at || r.submittedAt))
    .map((r: any) => ({
      at: r.at ?? r.submittedAt,
      band: Number(r.band),
      testId: r.testId ?? r.id ?? '',
    }))
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

export function paginate<T>(items: T[], page: number, pageSize: number): { pageItems: T[]; totalPages: number; total: number } {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const p = Math.min(Math.max(1, page), totalPages);
  const start = (p - 1) * pageSize;
  return { pageItems: items.slice(start, start + pageSize), totalPages, total };
}
