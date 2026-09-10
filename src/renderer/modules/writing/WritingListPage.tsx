import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

type TestRow = { id: string; kind: string; title: string; durationSec: number };

const DESC = 'Task 1 + Task 2 · live word count · auto-save';

export default function WritingListPage(): JSX.Element {
  const [tests, setTests] = useState<TestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const w = window as unknown as { db?: { query: (s: string, p?: unknown[]) => Promise<unknown[]> } };
        if (!w.db?.query) return;
        const rows = (await w.db.query("SELECT * FROM tests WHERE kind='writing' ORDER BY title")) as TestRow[];
        if (!cancelled) setTests(rows);
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return tests;
    return tests.filter((t) =>
      `${t.title} ${t.id} ${DESC}`.toLowerCase().includes(needle),
    );
  }, [tests, q]);
  if (loading) return <div className="p-8 text-sm">Loading writing tests…</div>;
  return (
    <div className="mx-auto max-w-5xl p-6" data-testid="writing-list">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-xl text-white">✍️</span>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Writing</h1>
          <p className="mt-0.5 text-sm text-zinc-500">60 min · Task 1 + Task 2 · AI feedback included free · <span className="font-semibold text-emerald-700">Free</span></p>
        </div>
      </div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search writing tests…"
        className="mt-5 w-full rounded-full border border-zinc-200 bg-white py-2.5 px-4 text-sm outline-none placeholder:text-zinc-400 focus:border-emerald-500"
      />
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {filtered.map((t) => {
          const badge = t.id.includes('writing-a') ? 'Academic' : 'General';
          return (
            <div key={t.id} className="flex flex-col rounded-xl border border-zinc-200 bg-white p-5 shadow-card" data-testid={`writing-card-${t.id}`}>
              <div className="flex items-center justify-between"><span className="text-xl">✍️</span><span className="rounded bg-ink px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">{badge}</span></div>
              <div className="mt-3 text-sm font-bold">{t.title}</div>
              <div className="mt-1 text-xs text-zinc-500">{DESC}</div>
              <div className="mt-1 text-xs text-zinc-400">{Math.round(t.durationSec / 60)} min · free forever</div>
              <Link to={`/writing/${t.id}`} className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-center text-sm font-bold text-white hover:bg-emerald-700" data-testid={`start-writing-${t.id}`}>Practice free →</Link>
            </div>
          );
        })}
      </div>
      {filtered.length === 0 && <div className="mt-6 rounded-xl border border-dashed bg-white p-8 text-center text-sm text-zinc-500" data-testid="writing-empty">{tests.length === 0 ? 'No writing tests. Import or restart to seed.' : 'No tests match your search.'}</div>}
    </div>
  );
}
