import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

type TestRow = { id: string; kind: string; title: string; durationSec: number };

const META: Record<string, { badge: string; desc: string; icon: string }> = {
  'reading-official-40': { badge: 'Official • 40 Qs', desc: 'IELTS.org 46pp • 10 sections • All task types • 60 min • Checked vs PDF keys', icon: '🎓' },
  'reading-a1': { badge: 'Academic', desc: '2 passages • 8 Qs • TFNG + MCQ + YNNG', icon: '📖' },
  'reading-a2': { badge: 'Academic', desc: '1 passage • 6 Qs • Silk Road focus', icon: '🏛️' },
  'reading-g1': { badge: 'General', desc: 'Notices & Workplace • 4 Qs • MCQ + Completion', icon: '📄' },
};

export default function ReadingListPage(): JSX.Element {
  const [tests, setTests] = useState<TestRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const w = window as unknown as { db?: { query: (sql: string, p?: unknown[]) => Promise<unknown[]> } };
        if (!w.db?.query) return;
        const rows = (await w.db.query("SELECT * FROM tests WHERE kind='reading' ORDER BY title")) as TestRow[];
        if (!cancelled) {
          const sorted = [...rows].sort((a, b) => (a.id === 'reading-official-40' ? -1 : b.id === 'reading-official-40' ? 1 : a.title.localeCompare(b.title)));
          setTests(sorted);
        }
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="p-8 text-sm">Loading reading tests…</div>;

  return (
    <div className="mx-auto max-w-5xl p-6" data-testid="reading-list">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Reading</h1>
        <p className="mt-1 text-sm text-gray-600">60 minutes • 40 questions in full mock. Choose a test, click Start — timer and synchronized passage pane begin.</p>
      </div>

      {tests.length === 0 ? (
        <div className="rounded border border-dashed bg-white p-8 text-center text-sm text-gray-600" data-testid="reading-empty">
          No reading tests. Import your banks via <Link to="/import" className="underline">Import</Link> or restart to seed demos.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {tests.map(t => {
            const m = META[t.id] ?? { badge: t.kind, desc: `${Math.round(t.durationSec / 60)} min`, icon: '📘' };
            return (
              <div key={t.id} className="flex flex-col rounded-lg border bg-white p-5 shadow-sm" data-testid={`reading-card-${t.id}`}>
                <div className="flex items-start justify-between">
                  <div className="text-2xl">{m.icon}</div>
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${m.badge === 'Academic' ? 'bg-blue-900 text-white' : 'bg-green-700 text-white'}`}>{m.badge}</span>
                </div>
                <div className="mt-3 text-sm font-semibold leading-tight">{t.title}</div>
                <div className="mt-1 text-xs text-gray-600">{m.desc}</div>
                <div className="mt-1 text-xs text-gray-500">{Math.round(t.durationSec / 60)} min • timer auto-starts</div>
                <div className="mt-4 flex gap-2">
                  <Link to={`/reading/${t.id}`} className="flex-1 rounded-md bg-black px-4 py-2 text-center text-sm font-medium text-white hover:bg-gray-800" data-testid={`start-reading-${t.id}`}>Start →</Link>
                  <span className="rounded border bg-gray-50 px-3 py-2 text-xs text-gray-600">{t.id}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 rounded bg-gray-900 p-4 text-xs leading-relaxed text-gray-100" data-testid="reading-help">
        <div className="font-medium text-white">How Reading works</div>
        Left pane: passage (scroll-synced). Right: questions by type (MCQ, TFNG/YNNG, Completion). Answers auto-saved every keystroke, score + band on Submit — deterministic local scoring, Nemotron explanations on Review.
      </div>
    </div>
  );
}
