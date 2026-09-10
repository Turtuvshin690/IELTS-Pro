import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

type TestRow = { id: string; kind: string; title: string; durationSec: number };

const META: Record<string, { badge: string; desc: string }> = {
  'listening-1': { badge: '4 Parts', desc: 'Everyday conversation → Lecture • 5 Qs • once-only' },
  'listening-2': { badge: '4 Parts', desc: 'Campus & Academic • 4 Qs • map & completion' },
};

export default function ListeningListPage(): JSX.Element {
  const [tests, setTests] = useState<TestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const w = window as unknown as { db?: { query: (s: string, p?: unknown[]) => Promise<unknown[]> } };
        if (!w.db?.query) return;
        const rows = (await w.db.query("SELECT * FROM tests WHERE kind='listening' ORDER BY title")) as TestRow[];
        if (!cancelled) setTests(rows);
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return tests;
    return tests.filter((t) =>
      `${t.title} ${t.id} ${(META[t.id]?.desc ?? '')}`.toLowerCase().includes(needle),
    );
  }, [tests, q]);
  if (loading) return <div className="p-8 text-sm">Loading listening tests…</div>;
  return (
    <div className="mx-auto max-w-5xl p-6" data-testid="listening-list">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-xl text-white">🎧</span>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Listening</h1>
          <p className="mt-0.5 text-sm text-zinc-500">30 min + 10 min transfer · audio plays once in mock · <span className="font-semibold text-emerald-700">Free</span></p>
        </div>
      </div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search listening tests…"
        className="mt-5 w-full rounded-full border border-zinc-200 bg-white py-2.5 px-4 text-sm outline-none placeholder:text-zinc-400 focus:border-emerald-500"
      />
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {filtered.map((t) => {
          const m = META[t.id] ?? { badge: 'Listening', desc: `${Math.round(t.durationSec / 60)} min` };
          return (
            <div key={t.id} className="flex flex-col rounded-xl border border-zinc-200 bg-white p-5 shadow-card" data-testid={`listening-card-${t.id}`}>
              <div className="flex items-center justify-between"><span className="text-xl">🎧</span><span className="rounded bg-ink px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">{m.badge}</span></div>
              <div className="mt-3 text-sm font-bold">{t.title}</div>
              <div className="mt-1 text-xs text-zinc-500">{m.desc}</div>
              <div className="mt-1 text-xs text-zinc-400">{Math.round(t.durationSec / 60)} min · free forever</div>
              <Link to={`/listening/${t.id}`} className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-center text-sm font-bold text-white hover:bg-emerald-700" data-testid={`start-listening-${t.id}`}>Practice free →</Link>
            </div>
          );
        })}
      </div>
      {filtered.length === 0 && <div className="mt-6 rounded-xl border border-dashed bg-white p-8 text-center text-sm text-zinc-500" data-testid="listening-empty">{tests.length === 0 ? 'No listening tests. Import or restart to seed.' : 'No tests match your search.'}</div>}
    </div>
  );
}
