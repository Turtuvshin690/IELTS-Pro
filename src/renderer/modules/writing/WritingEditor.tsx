import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTimer } from '../../shared/timer/useTimer';
import { countWords, scoreWriting } from './scoring';

type WritingScore = {
  tr: { band: number; feedback: string };
  cc: { band: number; feedback: string };
  lr: { band: number; feedback: string };
  gra: { band: number; feedback: string };
  overall: number;
  suggestions: string[];
  justification: string;
};

type Passage = { id: string; title: string | null; body: string | null };
type Section = { id: string; testId: string; title: string | null; passageId: string | null; type: string | null };

export default function WritingEditor(): JSX.Element {
  const { testId } = useParams<{ testId: string }>();
  const [essay, setEssay] = useState('');
  const [result, setResult] = useState<WritingScore | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [queued, setQueued] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [prompt, setPrompt] = useState<Passage | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [startedAt] = useState(() => new Date().toISOString());

  const wordCount = countWords(essay);

  const essayRef = useRef(essay);
  useEffect(() => {
    essayRef.current = essay;
  }, [essay]);

  // auto-save draft every 30s + beforeunload + restore
  // uses ref get() pattern (equivalent to src/renderer/shared/autoSave.ts) so interval always reads current essay
  useEffect(() => {
    if (!testId) return;
    const key = `writingDraft:${testId}`;
    try {
      const saved = localStorage.getItem(key);
      if (saved) setEssay(saved);
    } catch {
      // ignore
    }
    const interval = window.setInterval(() => {
      try {
        localStorage.setItem(key, essayRef.current);
      } catch {
        // ignore
      }
    }, 30000);
    const onBeforeUnload = () => {
      try {
        localStorage.setItem(key, essayRef.current);
      } catch {
        // ignore
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [testId]);

  // keep essay persisted on change (immediate)
  useEffect(() => {
    if (!testId) return;
    try {
      localStorage.setItem(`writingDraft:${testId}`, essay);
    } catch {
      // ignore
    }
  }, [testId, essay]);

  const handleSubmit = useCallback(async () => {
    if (!testId) return;
    if (submitting || result) return;
    setError(null);
    if (!essay.trim()) {
      setError('Essay is empty');
      return;
    }

    // offline queue check
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      try {
        const raw = localStorage.getItem('offlineQueue');
        const q: unknown[] = raw ? JSON.parse(raw) : [];
        q.push({ id: `${testId}_${Date.now()}`, testId, essay, at: new Date().toISOString(), mode: 'writing' });
        localStorage.setItem('offlineQueue', JSON.stringify(q));
      } catch {
        // ignore
      }
      setQueued(true);
      // persist attempt locally without band
      try {
        const w = window as unknown as { db?: { exec: (sql: string, params?: unknown[]) => Promise<unknown> } };
        if (w.db?.exec) {
          const id = `${testId}_${Date.now()}`;
          const now = new Date().toISOString();
          await w.db.exec(
            'INSERT INTO attempts (id, testId, mode, startedAt, submittedAt, rawScore, band, answers) VALUES (?,?,?,?,?,?,?,?)',
            [id, testId, 'writing', startedAt, now, wordCount, null, JSON.stringify({ essay })],
          );
        }
      } catch (e) {
        console.error('attempt insert failed', e);
      }
      return;
    }

    setSubmitting(true);
    try {
      const score = (await scoreWriting(essay)) as WritingScore;
      setResult(score);
      // persist attempt + scores local-only
      try {
        const w = window as unknown as { db?: { exec: (sql: string, params?: unknown[]) => Promise<unknown> } };
        if (w.db?.exec) {
          const id = `${testId}_${Date.now()}`;
          const now = new Date().toISOString();
          await w.db.exec(
            'INSERT INTO attempts (id, testId, mode, startedAt, submittedAt, rawScore, band, answers) VALUES (?,?,?,?,?,?,?,?)',
            [id, testId, 'writing', startedAt, now, wordCount, score.overall, JSON.stringify({ essay })],
          );
          // store subSkill scores
          const subs: Array<[string, number, string]> = [
            ['TR', score.tr.band, score.tr.feedback],
            ['CC', score.cc.band, score.cc.feedback],
            ['LR', score.lr.band, score.lr.feedback],
            ['GRA', score.gra.band, score.gra.feedback],
          ];
          for (const [sub, band, feedback] of subs) {
            try {
              await w.db.exec('INSERT INTO scores (id, attemptId, subSkill, band, feedback) VALUES (?,?,?,?,?)', [
                `${id}_${sub}`,
                id,
                sub,
                band,
                feedback,
              ]);
            } catch {
              // ignore per-sub insert failure
            }
          }
        }
      } catch (e) {
        console.error('attempt insert failed', e);
      }
    } catch (e: unknown) {
      const msg = (e as Error).message ?? String(e);
      setError(msg);
      // if fetch failed due to offline, queue
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        try {
          const raw = localStorage.getItem('offlineQueue');
          const q: unknown[] = raw ? JSON.parse(raw) : [];
          q.push({ id: `${testId}_${Date.now()}`, testId, essay, at: new Date().toISOString(), mode: 'writing' });
          localStorage.setItem('offlineQueue', JSON.stringify(q));
        } catch {
          // ignore
        }
        setQueued(true);
      }
    } finally {
      setSubmitting(false);
    }
  }, [testId, essay, submitting, result, wordCount, startedAt]);

  const { formatted } = useTimer(3600, handleSubmit);

  useEffect(() => {
    if (!testId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const w = window as unknown as { db?: { query: (sql: string, params?: unknown[]) => Promise<unknown[]> } };
        if (!w.db?.query) {
          if (!cancelled) setLoading(false);
          return;
        }
        const secs = (await w.db.query('SELECT * FROM sections WHERE testId = ?', [testId])) as Section[];
        if (cancelled) return;
        setSections(secs);
        const passageIds = secs.map((s) => s.passageId).filter(Boolean) as string[];
        if (passageIds.length) {
          const placeholders = passageIds.map(() => '?').join(',');
          const ps = (await w.db.query(`SELECT * FROM passages WHERE id IN (${placeholders})`, passageIds)) as Passage[];
          if (!cancelled && ps.length) setPrompt(ps[0]);
        } else {
          // fallback: try first passage linked via test if any, or show generic
          try {
            const qs = (await w.db.query(
              'SELECT q.prompt FROM questions q JOIN sections s ON q.sectionId = s.id WHERE s.testId = ? LIMIT 1',
              [testId],
            )) as { prompt: string }[];
            if (!cancelled && qs.length) {
              let body: string | null = null;
              try {
                body = JSON.parse(qs[0].prompt as unknown as string) as string;
              } catch {
                body = qs[0].prompt;
              }
              if (body) setPrompt({ id: 'q-prompt', title: 'Task', body });
            }
          } catch {
            // ignore
          }
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
  }, [testId]);

  if (loading) return <div className="p-8 text-sm">Loading writing test {testId}...</div>;

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b px-4 py-2">
        <h1 className="text-sm font-semibold">Writing — {testId}</h1>
        <div className="flex items-center gap-4">
          <span className="font-mono text-sm" data-testid="timer">
            {formatted}
          </span>
          <button
            className="rounded bg-black px-4 py-1 text-sm text-white disabled:opacity-50"
            onClick={handleSubmit}
            disabled={!!result || submitting}
            data-testid="submit-btn"
          >
            {result ? 'Submitted' : submitting ? 'Scoring…' : queued ? 'Queued' : 'Submit'}
          </button>
        </div>
      </header>

      {queued && (
        <div className="border-b bg-amber-50 px-4 py-2 text-sm text-amber-800" data-testid="offline-queue-notice">
          Offline — essay queued for scoring. Will retry when online.
        </div>
      )}
      {error && (
        <div className="border-b bg-red-50 px-4 py-2 text-sm text-red-700" data-testid="error-banner">
          {error}
        </div>
      )}
      {result && (
        <div className="border-b bg-green-50 px-4 py-2 text-sm" data-testid="score-banner">
          Overall: {result.overall} — Band {result.overall}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Left: prompt pane */}
        <div className="w-1/2 overflow-auto border-r p-4">
          <h2 className="mb-2 text-sm font-semibold">
            {prompt?.title ?? sections[0]?.title ?? 'Writing Task'}
          </h2>
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {prompt?.body ?? 'No prompt loaded. You will see Task 2 prompt here after importing a writing test. Write your essay on the right. Minimum 250 words for Task 2 (150 for Task 1).'}
          </div>
          <div className="mt-6 rounded border bg-gray-50 p-3 text-xs text-gray-600">
            <p className="font-medium">Instructions</p>
            <ul className="mt-1 list-disc pl-4">
              <li>Task 2: at least 250 words. Task 1: at least 150 words.</li>
              <li>Timer: 60 minutes (auto-submit on expiry).</li>
              <li>Scoring uses TR/TA, CC, LR, GRA via Nemotron.</li>
            </ul>
          </div>
          {sections.length > 1 && (
            <div className="mt-4 text-xs text-gray-500">
              <p>Test has {sections.length} section(s). Prompt shown is first.</p>
            </div>
          )}
        </div>

        {/* Right: editor pane */}
        <div className="flex w-1/2 flex-col p-4">
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="writing-essay" className="text-sm font-medium">
              Your Essay
            </label>
            <span className="text-xs text-gray-600" data-testid="word-count">
              {wordCount} words
            </span>
          </div>
          <textarea
            id="writing-essay"
            data-testid="writing-textarea"
            className="flex-1 resize-none rounded border p-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-black"
            placeholder="Start writing your essay here..."
            value={essay}
            onChange={(e) => setEssay(e.target.value)}
            rows={20}
          />
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className={wordCount < 250 ? 'text-amber-600' : 'text-green-600'}>
              {wordCount < 250 ? `${250 - wordCount} words to reach 250 minimum` : 'Minimum reached (250)'}
            </span>
            <span className="text-gray-400">Live count • {wordCount}</span>
          </div>

          {result && (
            <div className="mt-4 space-y-3 overflow-auto" data-testid="band-cards">
              <h3 className="text-sm font-semibold">Band Feedback</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded border p-3" data-testid="tr-card">
                  <div className="text-xs font-semibold text-gray-500">TR</div>
                  <div className="text-lg font-bold">Band {result.tr.band}</div>
                  <p className="mt-1 text-xs text-gray-700">{result.tr.feedback}</p>
                </div>
                <div className="rounded border p-3" data-testid="cc-card">
                  <div className="text-xs font-semibold text-gray-500">CC</div>
                  <div className="text-lg font-bold">Band {result.cc.band}</div>
                  <p className="mt-1 text-xs text-gray-700">{result.cc.feedback}</p>
                </div>
                <div className="rounded border p-3" data-testid="lr-card">
                  <div className="text-xs font-semibold text-gray-500">LR</div>
                  <div className="text-lg font-bold">Band {result.lr.band}</div>
                  <p className="mt-1 text-xs text-gray-700">{result.lr.feedback}</p>
                </div>
                <div className="rounded border p-3" data-testid="gra-card">
                  <div className="text-xs font-semibold text-gray-500">GRA</div>
                  <div className="text-lg font-bold">Band {result.gra.band}</div>
                  <p className="mt-1 text-xs text-gray-700">{result.gra.feedback}</p>
                </div>
              </div>
              <div className="rounded bg-black p-3 text-white" data-testid="overall-card">
                <div className="text-xs opacity-70">Overall</div>
                <div className="text-xl font-bold">{result.overall}</div>
                <p className="mt-1 text-xs opacity-80">{result.justification}</p>
              </div>
              {result.suggestions && result.suggestions.length > 0 && (
                <div className="rounded border bg-amber-50 p-3" data-testid="suggestions-card">
                  <div className="text-xs font-semibold text-amber-800">Suggestions</div>
                  <ul className="mt-1 list-disc pl-4 text-xs text-amber-900">
                    {result.suggestions.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
