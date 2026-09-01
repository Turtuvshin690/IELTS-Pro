import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

type TestRow = { id: string; kind: string; title: string; durationSec: number };

export default function WritingListPage(): JSX.Element {
  const [tests, setTests] = useState<TestRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let c = false;
    (async () => {
      try {
        const w = window as unknown as { db?: { query: (s:string,p?:unknown[])=>Promise<unknown[]> } };
        if (!w.db?.query) return;
        const rows = (await w.db.query("SELECT * FROM tests WHERE kind='writing' ORDER BY title")) as TestRow[];
        if (!c) setTests(rows);
      } finally { if (!c) setLoading(false); }
    })();
    return () => { c = true; };
  }, []);
  if (loading) return <div className="p-8 text-sm">Loading writing tests…</div>;
  return (
    <div className="mx-auto max-w-5xl p-6" data-testid="writing-list">
      <h1 className="text-2xl font-bold">Writing</h1>
      <p className="mt-1 text-sm text-gray-600">60 min • Task 1 (150w/20m) + Task 2 (250w/40m). Scored by Nemotron 3.5 Lightning (TR/CC/LR/GRA) — needs BYOK.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {tests.map(t => (
          <div key={t.id} className="flex flex-col rounded-lg border bg-white p-5 shadow-sm" data-testid={`writing-card-${t.id}`}>
            <div className="flex items-center justify-between"><span className="text-xl">✍️</span><span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase text-white ${t.id.includes('writing-a') ? 'bg-blue-900' : 'bg-green-700'}`}>{t.id.includes('writing-a') ? 'Academic' : 'General'}</span></div>
            <div className="mt-3 text-sm font-semibold">{t.title}</div>
            <div className="mt-1 text-xs text-gray-600">Task 1 + Task 2 • live word count • auto-save 30s • offline queues</div>
            <div className="mt-1 text-xs text-gray-500">{Math.round(t.durationSec/60)} min • BYOK scoring after submit</div>
            <Link to={`/writing/${t.id}`} className="mt-4 rounded-md bg-black px-4 py-2 text-center text-sm font-medium text-white hover:bg-gray-800" data-testid={`start-writing-${t.id}`}>Start →</Link>
          </div>
        ))}
      </div>
      {tests.length===0 && <div className="mt-6 rounded border border-dashed bg-white p-8 text-center text-sm text-gray-500" data-testid="writing-empty">No writing tests. Import or restart to seed.</div>}
    </div>
  );
}
