import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

type TestRow = { id: string; kind: string; title: string; durationSec: number };

const META: Record<string, { badge: string; desc: string }> = {
  'listening-1': { badge: '4 Parts', desc: 'Everyday conversation → Lecture • 5 Qs • once-only' },
  'listening-2': { badge: '4 Parts', desc: 'Campus & Academic • 4 Qs • map & completion' },
};

export default function ListeningListPage(): JSX.Element {
  const [tests, setTests] = useState<TestRow[]>([]);
  const [loading, setLoading] = useState(true);
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
  if (loading) return <div className="p-8 text-sm">Loading listening tests…</div>;
  return (
    <div className="mx-auto max-w-5xl p-6" data-testid="listening-list">
      <h1 className="text-2xl font-bold">Listening</h1>
      <p className="mt-1 text-sm text-gray-600">30 min + 10 min transfer • 40 Qs in full mock. Audio plays once in Mock mode.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {tests.map(t => {
          const m = META[t.id] ?? { badge: 'Listening', desc: `${Math.round(t.durationSec/60)} min` };
          return (
            <div key={t.id} className="flex flex-col rounded-lg border bg-white p-5 shadow-sm" data-testid={`listening-card-${t.id}`}>
              <div className="flex items-center justify-between"><span className="text-xl">🎧</span><span className="rounded bg-purple-700 px-2 py-0.5 text-[10px] font-bold uppercase text-white">{m.badge}</span></div>
              <div className="mt-3 text-sm font-semibold">{t.title}</div>
              <div className="mt-1 text-xs text-gray-600">{m.desc}</div>
              <div className="mt-1 text-xs text-gray-500">{Math.round(t.durationSec/60)} min • single-play in mock</div>
              <Link to={`/listening/${t.id}`} className="mt-4 rounded-md bg-black px-4 py-2 text-center text-sm font-medium text-white hover:bg-gray-800" data-testid={`start-listening-${t.id}`}>Start →</Link>
            </div>
          );
        })}
      </div>
      {tests.length===0 && <div className="mt-6 rounded border border-dashed bg-white p-8 text-center text-sm text-gray-500" data-testid="listening-empty">No listening tests. Import or restart to seed.</div>}
    </div>
  );
}
