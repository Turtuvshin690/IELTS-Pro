import { useEffect, useMemo, useState } from 'react';
import { useProgressStore } from './store';
import { weakAreas, paginate, bandTrends, type AttemptRow } from './analytics';

type DbAttemptRow = AttemptRow;
type QuestionRow = { id: string; qType: string; answer: string; sectionId: string };

const PAGE_SIZE = 10;

function BandChart({ points }: { points: { at: string; band: number }[] }): JSX.Element {
  if (points.length === 0) {
    return <div className="flex h-40 items-center justify-center rounded border border-dashed bg-gray-50 text-sm text-gray-500">No band data yet — complete a Reading/Listening/Writing/Speaking test to see trends.</div>;
  }
  const width = 640;
  const height = 160;
  const pad = { l: 32, r: 12, t: 12, b: 24 };
  const bands = points.map((p) => p.band);
  const minBand = 0;
  const maxBand = 9;
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const xFor = (i: number) => pad.l + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const yFor = (b: number) => pad.t + innerH - ((b - minBand) / (maxBand - minBand)) * innerH;

  const polyline = points.map((p, i) => `${xFor(i)},${yFor(p.band)}`).join(' ');

  // grid lines 0..9
  const gridBands = [0, 2, 4, 6, 7, 8, 9];

  return (
    <div className="overflow-x-auto" data-testid="band-chart">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-40 w-full" role="img" aria-label="Band trends chart">
        <rect x={0} y={0} width={width} height={height} fill="white" rx={8} />
        <rect x={pad.l} y={pad.t} width={innerW} height={innerH} fill="#f9fafb" stroke="#e5e7eb" />
        {gridBands.map((b) => (
          <g key={b}>
            <line x1={pad.l} x2={pad.l + innerW} y1={yFor(b)} y2={yFor(b)} stroke="#e5e7eb" strokeDasharray="3 3" />
            <text x={pad.l - 6} y={yFor(b) + 3} textAnchor="end" fontSize={9} fill="#6b7280">
              {b}
            </text>
          </g>
        ))}
        {/* x-axis labels */}
        {points.map((p, i) => {
          if (points.length > 12 && i % Math.ceil(points.length / 6) !== 0) return null;
          const d = new Date(p.at);
          const label = isNaN(d.getTime()) ? `#${i + 1}` : `${d.getMonth() + 1}/${d.getDate()}`;
          return (
            <text key={i} x={xFor(i)} y={height - 6} textAnchor="middle" fontSize={8} fill="#6b7280">
              {label}
            </text>
          );
        })}
        <polyline fill="none" stroke="#111827" strokeWidth={2} points={polyline} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={xFor(i)} cy={yFor(p.band)} r={3.5} fill="#111827" stroke="white" strokeWidth={1.2} />
            <text x={xFor(i)} y={yFor(p.band) - 8} textAnchor="middle" fontSize={8} fill="#111827" fontWeight={600}>
              {p.band}
            </text>
          </g>
        ))}
        <text x={width - pad.r} y={pad.t - 2} textAnchor="end" fontSize={8} fill="#9ca3af">
          {points.length} attempt(s) • band 0–9
        </text>
      </svg>
      <div className="mt-1 flex gap-2 text-[11px] text-gray-500">
        <span>Oldest → Newest</span>
        <span>•</span>
        <span>Avg: {(bands.reduce((a, b) => a + b, 0) / bands.length).toFixed(2)}</span>
        <span>•</span>
        <span>Latest: {bands[bands.length - 1]}</span>
      </div>
    </div>
  );
}

function parseAnswerField(raw: string | null): string {
  if (raw == null) return '';
  const s = String(raw).trim();
  if (!s) return '';
  try {
    const j = JSON.parse(s);
    if (Array.isArray(j)) return String(j[0] ?? '');
    if (typeof j === 'string') return j;
    return String(j);
  } catch {
    return s;
  }
}

export default function Dashboard(): JSX.Element {
  const storeAttempts = useProgressStore((s) => s.attempts);
  const [dbAttempts, setDbAttempts] = useState<DbAttemptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [weakItems, setWeakItems] = useState<{ qType: string; correct: boolean }[] | null>(null);

  // fetch attempts from window.db (local SQLite) — local-only
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const w = window as unknown as { db?: { query: (sql: string, params?: unknown[]) => Promise<unknown[]> } };
        if (!w.db?.query) {
          if (!cancelled) {
            setLoading(false);
            setDbAttempts([]);
          }
          return;
        }
        const rows = (await w.db.query('SELECT id, testId, mode, startedAt, submittedAt, rawScore, band, answers FROM attempts ORDER BY submittedAt DESC', [])) as DbAttemptRow[];
        if (!cancelled) {
          setDbAttempts(rows);
        }

        // also try to compute weakAreas from per-question data: join questions + attempts answers
        try {
          const qRows = (await w.db.query('SELECT id, qType, answer, sectionId FROM questions', [])) as QuestionRow[];
          const qById = new Map(qRows.map((q) => [q.id, q]));
          const items: { qType: string; correct: boolean }[] = [];
          for (const at of rows) {
            if (!at.answers) continue;
            let parsed: Record<string, string> | null = null;
            try {
              parsed = JSON.parse(at.answers);
              if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                // answers is { qId: userAnswer }
                for (const [qId, userAns] of Object.entries(parsed as Record<string, string>)) {
                  const q = qById.get(qId);
                  if (!q) continue;
                  const correctAns = parseAnswerField(q.answer);
                  const user = String(userAns ?? '');
                  const isCorrect = String(correctAns).toLowerCase().trim() === String(user).toLowerCase().trim() && user.trim() !== '';
                  items.push({ qType: q.qType, correct: isCorrect });
                }
              } else if (Array.isArray(parsed)) {
                // fallback unlikely
              }
            } catch {
              // if answers is not JSON object, skip
            }
            // also handle essay/speaking attempts where answers is { essay } — not counted for qType
          }
          if (!cancelled && items.length > 0) {
            setWeakItems(items);
          }
        } catch {
          // ignore weak compute failure
        }
      } catch (e: unknown) {
        if (!cancelled) setError((e as Error).message ?? String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // merge store + db: prefer db if non-empty, else store
  const allAttempts: (AttemptRow | { id: string; testId: string; band: number; at: string })[] = useMemo(() => {
    if (dbAttempts.length > 0) return dbAttempts;
    // map store attempts to AttemptRow shape for chart/table
    return storeAttempts.map((a) => ({
      id: a.id,
      testId: a.testId,
      mode: null,
      startedAt: a.at,
      submittedAt: a.at,
      rawScore: null,
      band: a.band,
      answers: null,
    }));
  }, [dbAttempts, storeAttempts]);

  const trends = useMemo(() => bandTrends(allAttempts as any), [allAttempts]);

  // pagination for table
  const sortedForTable = useMemo(() => {
    // already DESC from db; for store we sort DESC too
    const arr = [...allAttempts] as AttemptRow[];
    // ensure DESC by submittedAt/at
    arr.sort((a: any, b: any) => {
      const atA = a.submittedAt ?? a.at ?? '';
      const atB = b.submittedAt ?? b.at ?? '';
      return new Date(atB).getTime() - new Date(atA).getTime();
    });
    return arr;
  }, [allAttempts]);

  const { pageItems, totalPages, total } = useMemo(() => paginate(sortedForTable, page, PAGE_SIZE), [sortedForTable, page]);

  // weak areas
  const weak = useMemo(() => {
    if (weakItems && weakItems.length > 0) {
      return weakAreas(weakItems);
    }
    // fallback demo weakAreas if no per-question data: synthesize from attempts band distribution to show component still works
    if (allAttempts.length === 0) return [];
    // no per-question items yet — return empty to show placeholder cards
    return [];
  }, [weakItems, allAttempts]);

  // also compute weak fallback via demo if weak empty and attempts empty? Show placeholder
  const weakList = weak.length ? weak : null;

  const avgBand = useMemo(() => {
    if (trends.length === 0) return null;
    const sum = trends.reduce((a, p) => a + p.band, 0);
    return Math.round((sum / trends.length) * 10) / 10;
  }, [trends]);

  const latestBand = trends.length ? trends[trends.length - 1].band : null;

  if (loading) return <div className="p-6 text-sm">Loading dashboard…</div>;

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="dashboard-title">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500">Local-only analytics — all data from SQLite WAL in %APPDATA%/IELTS Pro.</p>
        </div>
        <div className="shrink-0 rounded border bg-white px-3 py-2 text-right shadow-sm">
          <div className="text-xs text-gray-500">Attempts</div>
          <div className="text-xl font-bold">{total}</div>
          <div className="text-xs text-gray-500">
            {avgBand != null ? `Avg ${avgBand}` : 'No avg yet'} {latestBand != null ? `• Latest ${latestBand}` : ''}
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" data-testid="error-banner">
          {error}
        </div>
      )}

      {/* Band trends chart */}
      <section className="mt-6 rounded-lg border bg-white p-4 shadow-sm" data-testid="trends-section">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Band Trends</h2>
          <span className="text-xs text-gray-500">{trends.length ? `${trends.length} point(s)` : 'No data'}</span>
        </div>
        <BandChart points={trends} />
        <p className="mt-2 text-xs text-gray-500">
          Chart is pure SVG (no cloud). Points sorted by <code>submittedAt</code>.
        </p>
      </section>

      {/* Weak-area cards */}
      <section className="mt-6" data-testid="weak-areas-section">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Weak Areas</h2>
          <span className="text-xs text-gray-500">Lowest accuracy first • TFNG/MCQ etc.</span>
        </div>
        {weakList && weakList.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="weak-cards">
            {weakList.map((w) => (
              <div key={w.qType} className="rounded-lg border bg-white p-4 shadow-sm" data-testid={`weak-card-${w.qType}`}>
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{w.qType}</div>
                  <span className={`rounded px-2 py-0.5 text-xs font-bold ${w.acc < 0.5 ? 'bg-red-100 text-red-700' : w.acc < 0.7 ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-700'}`}>
                    {(w.acc * 100).toFixed(0)}% acc
                  </span>
                </div>
                <div className="mt-2 text-sm">
                  <span className="font-medium">{w.total - w.wrong}</span>
                  <span className="text-gray-500"> / {w.total} correct</span>
                  <span className="ml-2 text-gray-400">• {w.wrong} wrong</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded bg-gray-100">
                  <div className={`h-full ${w.acc < 0.5 ? 'bg-red-500' : w.acc < 0.7 ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${Math.round(w.acc * 100)}%` }} />
                </div>
                <div className="mt-2 text-xs text-gray-500">{w.acc < 0.5 ? 'Focus area' : w.acc < 0.75 ? 'Practice recommended' : 'Strong'}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed bg-gray-50 p-6 text-center" data-testid="weak-empty">
            <div className="text-sm font-medium text-gray-700">No per-question weak areas yet</div>
            <p className="mt-1 text-xs text-gray-500">
              Complete a Reading or Listening test with questions stored in SQLite to generate accuracy by qType. Uses{' '}
              <code>weakAreas([{`{qType, correct}`}] sorting by acc)</code> — lowest accuracy first.
            </p>
            <div className="mt-3 flex justify-center gap-2">
              <span className="rounded border bg-white px-2 py-1 text-xs">Example: TFNG 0% (0/2) → weakest</span>
              <span className="rounded border bg-white px-2 py-1 text-xs">MCQ 100% (1/1)</span>
            </div>
          </div>
        )}
      </section>

      {/* Paginated attempts table + history */}
      <section className="mt-6 rounded-lg border bg-white shadow-sm" data-testid="history-section">
        <div className="border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">History</h2>
            <span className="text-xs text-gray-500" data-testid="pagination-info">
              {total} total • page {page} / {totalPages} • {PAGE_SIZE}/page
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500">Paginated local history — unlimited retakes. Stored in <code>attempts</code> table.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm" data-testid="attempts-table">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2 text-left">Test</th>
                <th className="px-4 py-2 text-left">Mode</th>
                <th className="px-4 py-2 text-left">Band</th>
                <th className="px-4 py-2 text-left">Raw</th>
                <th className="px-4 py-2 text-left">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {pageItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500" data-testid="empty-history">
                    No attempts yet. Run a timed mock (Reading/Listening/Writing/Speaking) and submit to see history here.
                  </td>
                </tr>
              ) : (
                pageItems.map((r: any) => (
                  <tr key={r.id} className="hover:bg-gray-50" data-testid={`attempt-row-${r.id}`}>
                    <td className="px-4 py-2 font-mono text-xs">{r.testId}</td>
                    <td className="px-4 py-2 text-xs">
                      <span className="rounded bg-gray-100 px-2 py-0.5">{r.mode ?? '—'}</span>
                    </td>
                    <td className="px-4 py-2">
                      {r.band != null ? <span className="rounded bg-black px-2 py-0.5 text-xs font-bold text-white">{r.band}</span> : <span className="text-xs text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-2 text-xs">{r.rawScore ?? '—'}</td>
                    <td className="px-4 py-2 text-xs text-gray-600">{r.submittedAt ?? r.at ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t px-4 py-3">
          <div className="text-xs text-gray-500">
            Paginated • {total} attempt(s) • local-only • no cloud sync
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded border px-3 py-1 text-xs font-medium disabled:opacity-40"
              data-testid="prev-page"
            >
              Prev
            </button>
            <span className="px-2 py-1 text-xs" data-testid="page-indicator">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded border px-3 py-1 text-xs font-medium disabled:opacity-40"
              data-testid="next-page"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      <div className="mt-6 rounded border bg-gray-50 p-3 text-xs leading-relaxed text-gray-600">
        <span className="font-semibold">Local-only:</span> Dashboard reads only from <code>window.db</code> (SQLite) and <code>useProgressStore</code> (Zustand). No network.
      </div>
    </div>
  );
}
