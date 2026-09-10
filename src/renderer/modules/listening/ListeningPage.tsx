import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTimer } from '../../shared/timer/useTimer';
import { rawToBand } from '../../../lib/band/calculator';
import { audioCachePath } from '../../shared/audio/cache';
import QuestionRenderer, { Question } from '../reading/QuestionRenderer';

type Passage = { id: string; title: string | null; body: string | null };
type Section = { id: string; testId: string; title: string | null; audioPath: string | null; passageId: string | null; type: string | null };
type TestRow = { id: string; title: string | null; durationSec: number | null };
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

function scoreItems(items: { answer: string; user: string }[]): number {
  return items.filter((i) => String(i.answer).toLowerCase().trim() === String(i.user).toLowerCase().trim()).length;
}

const DEFAULT_DURATION = 1800; // IELTS Listening: 30 min playback (+ 10 min transfer handled as separate, use 30m for mock)
const PART_LABELS = ['Part 1', 'Part 2', 'Part 3', 'Part 4'];

export default function ListeningPage(): JSX.Element {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const [passages, setPassages] = useState<Passage[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [questions, setQuestions] = useState<ParsedQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<{ raw: number; total: number; band: number } | null>(null);
  const [startedAt] = useState(() => new Date().toISOString());
  const [durationSec, setDurationSec] = useState<number>(DEFAULT_DURATION);
  const [activePart, setActivePart] = useState(0);

  // single-play lock in mock mode
  const [isMock] = useState(true);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleSubmit = useCallback(async () => {
    if (!testId) return;
    if (submitted) return;
    const items = questions.map((q) => ({
      answer: answerToString(q.rawAnswer ?? q.answer),
      user: answers[q.id] ?? '',
    }));
    const raw = scoreItems(items);
    const total = questions.length || 40;
    const band = rawToBand(raw, total);
    setSubmitted({ raw, total, band });
    try {
      const w = window as unknown as { db?: { exec: (sql: string, params?: unknown[]) => Promise<unknown> } };
      if (w.db?.exec) {
        const id = `${testId}_${Date.now()}`;
        const now = new Date().toISOString();
        await w.db.exec(
          'INSERT INTO attempts (id, testId, mode, startedAt, submittedAt, rawScore, band, answers) VALUES (?,?,?,?,?,?,?,?)',
          [id, testId, 'listening', startedAt, now, raw, band, JSON.stringify(answers)],
        );
      }
    } catch (e) {
      console.error('attempt insert failed', e);
    }
  }, [testId, questions, answers, submitted, startedAt]);

  const { formatted } = useTimer(durationSec, handleSubmit);

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
          if (!cancelled) {
            setSections([]);
            setQuestions([]);
            setPassages([]);
            setLoading(false);
          }
          return;
        }
        // fetch test for duration
        try {
          const rows = (await w.db.query('SELECT id, title, durationSec FROM tests WHERE id = ?', [testId])) as TestRow[];
          if (!cancelled && rows.length && rows[0].durationSec) {
            setDurationSec(rows[0].durationSec as number);
          }
        } catch {
          // ignore, keep default
        }

        const secs = (await w.db.query('SELECT * FROM sections WHERE testId = ?', [testId])) as Section[];
        if (cancelled) return;
        // ensure 4 parts order: sort by title or id; keep as returned if 4 else fallback
        const ordered = secs.length ? [...secs].sort((a, b) => String(a.title ?? a.id).localeCompare(String(b.title ?? b.id))) : secs;
        setSections(ordered);

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

        const passageIds = ordered.map((s) => s.passageId).filter(Boolean) as string[];
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

  const handlePlay = useCallback(() => {
    if (isMock && isLocked) {
      // single-play lock: prevent replay after completion
      audioRef.current?.pause();
      if (audioRef.current) audioRef.current.currentTime = audioRef.current.duration || 0;
      return;
    }
    if (isMock && !hasPlayed) {
      setHasPlayed(true);
    }
  }, [isMock, isLocked, hasPlayed]);

  const handleEnded = useCallback(() => {
    if (isMock) {
      setIsLocked(true);
      setHasPlayed(true);
    }
  }, [isMock]);

  const handleSeeking = useCallback(() => {
    if (!isMock) return;
    if (isLocked) {
      // lock seeking after single play completed — snap to end
      if (audioRef.current) {
        audioRef.current.currentTime = audioRef.current.duration || 0;
        audioRef.current.pause();
      }
      return;
    }
    // in mock mode, disallow seeking backward/forward after playback started is allowed,
    // but some specs want no scrubbing. We allow only forward? For single-play mock we block any seek after play started
    // Uncomment to strictly block seeking:
    // if (hasPlayed && audioRef.current) { audioRef.current.pause(); }
  }, [isMock, isLocked]);

  const handlePause = useCallback(() => {
    // if locked, keep paused at end; don't auto-resume
    if (isMock && isLocked) {
      if (audioRef.current && audioRef.current.currentTime < (audioRef.current.duration || 0)) {
        audioRef.current.currentTime = audioRef.current.duration || 0;
      }
    }
  }, [isMock, isLocked]);

  if (loading) return <div className="p-8 text-sm">Loading listening test {testId}...</div>;
  if (error) return <div className="p-8 text-sm text-red-600">Error: {error}</div>;

  // derive 4 parts navigation; if sections exist use them, else fallback to 4 empty parts
  const parts = sections.length
    ? sections.map((s, idx) => ({
        section: s,
        label: s.title ?? PART_LABELS[idx] ?? `Part ${idx + 1}`,
        qs: questions.filter((q) => q.sectionId === s.id),
        passage: passages.find((p) => p.id === s.passageId) ?? null,
      }))
    : PART_LABELS.map((label, idx) => ({
        section: { id: `part-${idx + 1}`, testId: testId!, title: label, passageId: null, audioPath: null, type: 'listening' } as Section,
        label,
        qs: idx === 0 ? questions : [],
        passage: null as Passage | null,
      }));

  // clamp activePart
  const safeActive = Math.min(activePart, parts.length - 1);
  const active = parts[safeActive] ?? parts[0];
  const audioPath = testId ? audioCachePath(testId) : '';
  // prefer section audioPath if present, else cache path
  const audioSrc = active.section.audioPath || audioPath;

  const hasTranscript = !!active.passage?.body;
  const showTranscript = !!submitted;

  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4">
        <div className="flex min-w-0 items-center gap-2">
          <button onClick={() => navigate('/listening')} className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-50" title="Exit test">
            ← Exit
          </button>
          <h1 className="truncate text-sm font-bold text-zinc-800">Listening — {testId}</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1 font-mono text-sm font-bold tabular-nums" data-testid="timer">
            {formatted}
          </span>
          <button onClick={handleSubmit} disabled={!!submitted} className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
            {submitted ? 'Submitted' : 'Submit'}
          </button>
        </div>
      </header>

      {submitted && (
        <div className="border-b bg-green-50 px-4 py-2 text-sm" data-testid="score-banner">
          Score: {submitted.raw}/{submitted.total} — Band {submitted.band}
        </div>
      )}

      {/* Audio player bar */}
      <div className="border-b bg-gray-50 px-4 py-3" data-testid="audio-bar">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-700">
              {active.label} Audio {isMock && <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">MOCK — single play</span>}
            </span>
            <span className="text-xs text-gray-500">{audioSrc}</span>
          </div>
          <audio
            ref={audioRef}
            controls
            src={audioSrc}
            onPlay={handlePlay}
            onEnded={handleEnded}
            onSeeking={handleSeeking}
            onPause={handlePause}
            data-testid="audio-player"
            className="w-full"
            // disable rewind via controls when locked: we keep controls but handlers block replay
            controlsList={isMock && isLocked ? 'nodownload noplaybackrate' : undefined}
            // prevent download
          />
          <div className="flex items-center justify-between text-xs">
            <span className={isLocked ? 'text-red-600 font-medium' : 'text-gray-500'}>
              {isLocked ? 'Playback locked — single play completed (replay disabled in mock mode)' : hasPlayed ? 'Playing — replay disabled after this play ends' : 'Audio will play once in mock mode'}
            </span>
            <span className="text-gray-400">Cache: {audioPath}</span>
          </div>
          {isMock && isLocked && (
            <p className="text-xs text-amber-700" data-testid="single-play-lock-notice">
              Single-play lock active: audio cannot be replayed in mock mode. Submit to review transcript.
            </p>
          )}
        </div>
      </div>

      {/* 4 parts navigation */}
      <nav className="flex gap-1 border-b bg-white px-2 py-1" data-testid="parts-nav">
        {parts.map((p, idx) => (
          <button
            key={p.section.id}
            onClick={() => setActivePart(idx)}
            className={`rounded px-3 py-1.5 text-sm font-medium ${safeActive === idx ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            data-testid={`part-tab-${idx}`}
            aria-current={safeActive === idx ? 'page' : undefined}
          >
            {p.label}
            <span className="ml-1 text-xs opacity-70">({p.qs.length})</span>
          </button>
        ))}
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: questions for active part */}
        <div className="w-1/2 overflow-auto border-r p-4">
          <h2 className="mb-3 text-sm font-semibold">{active.label} — Questions</h2>
          {active.qs.length === 0 ? (
            <p className="text-sm text-gray-500">No questions in this part. Import a listening test with questions.</p>
          ) : (
            <div className="space-y-4">
              {active.qs.map((q, idx) => (
                <div key={q.id} className="rounded border p-3">
                  <div className="mb-1 text-xs text-gray-500">
                    Q{idx + 1} • {q.qType}
                  </div>
                  <QuestionRenderer question={q} value={answers[q.id] ?? ''} onChange={onChange} />
                  {submitted && (
                    <div className="mt-2 rounded bg-gray-50 px-2 py-1 text-xs">
                      <span className="text-gray-500">Answer: </span>
                      <span className="font-medium">{answerToString(q.rawAnswer ?? q.answer)}</span>
                      {answers[q.id] != null && answers[q.id] !== '' && (
                        <span className={`ml-2 ${String(answers[q.id]).toLowerCase().trim() === String(answerToString(q.rawAnswer ?? q.answer)).toLowerCase().trim() ? 'text-green-600' : 'text-red-600'}`}>
                          Your: {answers[q.id] ?? '(empty)'}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: transcript hidden until review */}
        <div className="w-1/2 overflow-auto p-4">
          <h2 className="mb-3 text-sm font-semibold">Transcript</h2>
          {!showTranscript ? (
            <div className="rounded border border-dashed p-6 text-center" data-testid="transcript-hidden">
              <p className="text-sm font-medium text-gray-600">Transcript hidden until review</p>
              <p className="mt-1 text-xs text-gray-400">Submit the test to view the transcript and compare answers. In mock mode the audio plays only once.</p>
              {hasTranscript && <p className="mt-2 text-xs text-gray-400">Transcript available after submission</p>}
            </div>
          ) : (
            <div className="whitespace-pre-wrap text-sm leading-relaxed" data-testid="transcript-visible">
              {active.passage?.body ?? 'No transcript available for this part.'}
            </div>
          )}
          {showTranscript && active.qs.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-2 text-xs font-semibold text-gray-600">Review — all parts</h3>
              <div className="space-y-3">
                {parts.map((p) => (
                  <div key={p.section.id} className="rounded border p-3">
                    <div className="mb-1 text-xs font-medium">{p.label}</div>
                    {p.passage?.body ? (
                      <div className="whitespace-pre-wrap text-xs leading-relaxed text-gray-700">{p.passage.body}</div>
                    ) : (
                      <p className="text-xs text-gray-400">No transcript for {p.label}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
