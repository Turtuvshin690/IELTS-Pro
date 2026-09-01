import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

type TestRow = { id: string; kind: string; title: string; durationSec: number };

export default function SpeakingListPage(): JSX.Element {
  const [tests, setTests] = useState<TestRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let c = false;
    (async () => {
      try {
        const w = window as unknown as { db?: { query: (s:string,p?:unknown[])=>Promise<unknown[]> } };
        if (!w.db?.query) return;
        const rows = (await w.db.query("SELECT * FROM tests WHERE kind='speaking' ORDER BY title")) as TestRow[];
        if (!c) setTests(rows);
      } finally { if (!c) setLoading(false); }
    })();
    return () => { c = true; };
  }, []);
  if (loading) return <div className="p-8 text-sm">Loading speaking tests…</div>;
  return (
    <div className="mx-auto max-w-5xl p-6" data-testid="speaking-list">
      <h1 className="text-2xl font-bold">Speaking</h1>
      <p className="mt-1 text-sm text-gray-600">11-14 min • Part 1 (4-5m) → Part 2 cue card (1m prep + 2m talk) → Part 3 (4-5m). Mic required • Parakeet ASR + Magpie TTS.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {tests.map(t => (
          <div key={t.id} className="flex flex-col rounded-lg border bg-white p-5 shadow-sm" data-testid={`speaking-card-${t.id}`}>
            <div className="flex items-center justify-between"><span className="text-xl">🎤</span><span className="rounded bg-orange-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">11-14 min</span></div>
            <div className="mt-3 text-sm font-semibold">{t.title}</div>
            <div className="mt-1 text-xs text-gray-600">Part 1 intro • Part 2 cue card • Part 3 discussion • FC/LR/GRA/P scored via Nemotron</div>
            <div className="mt-1 text-xs text-gray-500">{Math.round(t.durationSec/60)} min • device selector + waveform</div>
            <Link to={`/speaking/${t.id}`} className="mt-4 rounded-md bg-black px-4 py-2 text-center text-sm font-medium text-white hover:bg-gray-800" data-testid={`start-speaking-${t.id}`}>Start →</Link>
          </div>
        ))}
      </div>
      {tests.length===0 && <div className="mt-6 rounded border border-dashed bg-white p-8 text-center text-sm text-gray-500" data-testid="speaking-empty">No speaking tests. Import or restart to seed.</div>}
    </div>
  );
}
