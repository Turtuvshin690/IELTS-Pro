import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useTimer } from '../../shared/timer/useTimer';
import { rawToBand } from '../../../lib/band/calculator';
import { scoreReading } from './scoring';
import QuestionRenderer, { Question } from './QuestionRenderer';

type Passage = { id: string; title: string | null; body: string | null };
type Section = { id: string; testId: string; title: string | null; passageId: string | null; type: string | null };
type RawQuestionRow = { id: string; sectionId: string; qType: string; prompt: string; options: string; answer: string; marks: number };
type ParsedQuestion = Question & { sectionId: string; rawAnswer: string };

function parseJsonField(v: string | null): unknown {
  if (v == null) return v;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}

function answerToString(ans: unknown): string {
  const parsed = typeof ans === 'string' ? parseJsonField(ans) : ans;
  if (parsed == null) return '';
  if (Array.isArray(parsed)) return String(parsed[0] ?? '');
  return String(parsed);
}

export default function ReadingPage(): JSX.Element {
  const { testId } = useParams<{ testId: string }>();
  const [passages, setPassages] = useState<Passage[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [questions, setQuestions] = useState<ParsedQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<{ raw: number; total: number; band: number } | null>(null);
  const [startedAt] = useState(() => new Date().toISOString());

  const handleSubmit = useCallback(async () => {
    if (!testId) return;
    if (submitted) return;
    const items = questions.map((q) => ({
      answer: answerToString(q.rawAnswer ?? q.answer),
      user: answers[q.id] ?? '',
    }));
    const raw = scoreReading(items);
    const total = questions.length || 40;
    const band = rawToBand(raw, total);
    setSubmitted({ raw, total, band });

    // persist attempt local-only via window.db
    try {
      const w = window as unknown as { db?: { exec: (sql: string, params?: unknown[]) => Promise<unknown> } };
      if (w.db?.exec) {
        const id = `${testId}_${Date.now()}`;
        const now = new Date().toISOString();
        await w.db.exec(
          'INSERT INTO attempts (id, testId, mode, startedAt, submittedAt, rawScore, band, answers) VALUES (?,?,?,?,?,?,?,?)',
          [id, testId, 'reading', startedAt, now, raw, band, JSON.stringify(answers)],
        );
      }
    } catch (e) {
      // local-only, ignore persist failure
      console.error('attempt insert failed', e);
    }
  }, [testId, questions, answers, submitted, startedAt]);

  const { formatted } = useTimer(3600, handleSubmit);

  useEffect(() => {
    if (!testId) {
      setError('Missing testId');
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const w = window as unknown as { db?: { query: (sql: string, params?: unknown[]) => Promise<unknown[]> } };
        if (!w.db?.query) {
          // fallback for vite preview without electron: mock empty
          if (!cancelled) {
            setSections([]);
            setQuestions([]);
            setPassages([]);
            setLoading(false);
          }
          return;
        }
        const secs = (await w.db.query('SELECT * FROM sections WHERE testId = ?', [testId])) as Section[];
        if (cancelled) return;
        setSections(secs);

        // fetch questions for this test
        const qs = (await w.db.query(
          'SELECT q.* FROM questions q JOIN sections s ON q.sectionId = s.id WHERE s.testId = ?',
          [testId],
        )) as RawQuestionRow[];
        if (cancelled) return;
        const parsed: ParsedQuestion[] = qs.map((r) => ({
          id: r.id,
          sectionId: r.sectionId,
          qType: r.qType,
          prompt: parseJsonField(r.prompt) as string,
          options: parseJsonField(r.options),
          answer: parseJsonField(r.answer),
          rawAnswer: r.answer,
        }));
        setQuestions(parsed);

        // fetch passages linked to sections
        const passageIds = secs.map((s) => s.passageId).filter(Boolean) as string[];
        if (passageIds.length) {
          const placeholders = passageIds.map(() => '?').join(',');
          const ps = (await w.db.query(`SELECT * FROM passages WHERE id IN (${placeholders})`, passageIds)) as Passage[];
          if (!cancelled) setPassages(ps);
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

  const onChange = (id: string, v: string) => {
    setAnswers((prev) => ({ ...prev, [id]: v }));
  };

  if (loading) return <div className="p-8 text-sm">Loading reading test {testId}...</div>;
  if (error) return <div className="p-8 text-sm text-red-600">Error: {error}</div>;

  // group questions by section for rendering
  const bySection = sections.length
    ? sections.map((s) => ({
        section: s,
        qs: questions.filter((q) => q.sectionId === s.id),
        passage: passages.find((p) => p.id === s.passageId) ?? null,
      }))
    : [{ section: { id: 'default', testId: testId!, title: 'Passage', passageId: null, type: 'reading' } as Section, qs: questions, passage: passages[0] ?? null }];

  // if no sections but have passages/questions, show fallback single pane
  const hasPassage = passages.length > 0 || bySection.some((g) => g.passage);

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b px-4 py-2">
        <h1 className="text-sm font-semibold">Reading — {testId}</h1>
        <div className="flex items-center gap-4">
          <span className="font-mono text-sm" data-testid="timer">
            {formatted}
          </span>
          <button
            className="rounded bg-black px-4 py-1 text-sm text-white disabled:opacity-50"
            onClick={handleSubmit}
            disabled={!!submitted}
          >
            {submitted ? 'Submitted' : 'Submit'}
          </button>
        </div>
      </header>

      {submitted && (
        <div className="border-b bg-green-50 px-4 py-2 text-sm">
          Score: {submitted.raw}/{submitted.total} — Band {submitted.band}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Left: passage pane */}
        <div className="w-1/2 overflow-auto border-r p-4">
          {hasPassage ? (
            bySection.map((g) => (
              <div key={g.section.id} className="mb-8">
                <h2 className="mb-2 text-base font-bold">{g.passage?.title ?? g.section.title ?? 'Passage'}</h2>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {g.passage?.body ?? 'No passage content. Import a reading test with passages.'}
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-gray-500">
              <p className="font-medium">No passage linked.</p>
              <p className="mt-1">Import a test with passages to see synchronized reading content here.</p>
            </div>
          )}
        </div>

        {/* Right: questions pane */}
        <div className="w-1/2 overflow-auto p-4">
          {questions.length === 0 ? (
            <p className="text-sm text-gray-500">No questions for this test.</p>
          ) : (
            <div className="space-y-6">
              {bySection.map((g) => (
                <div key={g.section.id}>
                  {sections.length > 1 && (
                    <h3 className="mb-3 text-sm font-semibold border-b pb-1">{g.section.title ?? g.section.id}</h3>
                  )}
                  <div className="space-y-6">
                    {g.qs.map((q, idx) => (
                      <div key={q.id} className="rounded border p-3">
                        <div className="mb-1 text-xs text-gray-500">
                          Q{idx + 1} • {q.qType}
                        </div>
                        <QuestionRenderer question={q} value={answers[q.id] ?? ''} onChange={onChange} />
                      </div>
                    ))}
                    {g.qs.length === 0 && <p className="text-xs text-gray-400">No questions in this section.</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
