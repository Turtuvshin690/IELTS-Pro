import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

function toHMS(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function instructionFor(qType: string, partNum: number): string {
  switch (qType) {
    case 'TFNG':
      return `Do the following statements agree with the information given in Reading Passage ${partNum}?`;
    case 'YNNG':
      return `Do the following statements agree with the claims of the writer in Reading Passage ${partNum}?`;
    case 'MCQ':
      return 'Choose the correct letter, A-D.';
    case 'MCQ_MULTI':
      return 'Choose TWO letters, A-E.';
    case 'MATCHING_HEADINGS':
    case 'MATCH_HEADING':
      return 'Choose the correct heading for each paragraph from the list of headings below.';
    case 'MATCHING_INFORMATION':
      return 'Choose the correct option to match each statement with the correct paragraph.';
    case 'MATCHING_FEATURES':
    case 'MATCH_FEATURE':
      return 'Look at the following statements and the list of options below. Match each statement with the correct option.';
    case 'MATCHING_SENTENCE_ENDINGS':
      return 'Complete each sentence with the correct ending, A-G, below.';
    case 'SUMMARY_COMPLETION':
      return 'Complete the summary below.\nChoose ONE WORD ONLY from the passage for each answer.';
    case 'NOTE_COMPLETION':
      return 'Complete the notes below.\nChoose ONE WORD ONLY from the passage for each answer.';
    case 'TABLE_COMPLETION':
      return 'Complete the table below.\nChoose ONE WORD ONLY from the passage for each answer.';
    case 'FLOW_CHART':
      return 'Complete the flow-chart below.\nChoose ONE WORD ONLY from the passage for each answer.';
    case 'SENTENCE_COMPLETION':
      return 'Complete the sentences below.\nChoose ONE WORD ONLY from the passage for each answer.';
    case 'SHORT_ANSWER':
      return 'Answer the questions below.\nChoose ONE WORD ONLY from the passage for each answer.';
    case 'DIAGRAM_LABEL':
      return 'Label the diagram below.\nChoose ONE WORD ONLY from the passage for each answer.';
    default:
      return 'Read the text and answer the questions below.';
  }
}

export default function ReadingPage(): JSX.Element {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();

  const [passages, setPassages] = useState<Passage[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [questions, setQuestions] = useState<ParsedQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<{ raw: number; total: number; band: number } | null>(null);
  const [startedAt] = useState(() => new Date().toISOString());

  // IELTS Navigation & UI State
  const [activeSectionIdx, setActiveSectionIdx] = useState<number>(0);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [textSize, setTextSize] = useState<'normal' | 'large' | 'xlarge'>('normal');
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'correct' | 'incorrect' | 'flagged'>('all');
  const [leftWidth, setLeftWidth] = useState(50);
  const draggingRef = useRef(false);

  const questionListRef = useRef<HTMLDivElement>(null);

  // Score and submit handler
  const handleSubmit = useCallback(async () => {
    if (!testId || submitted) return;
    setShowConfirmSubmit(false);

    const items = questions.map((q) => ({
      answer: answerToString(q.rawAnswer ?? q.answer),
      user: answers[q.id] ?? '',
    }));
    const raw = scoreReading(items);
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
          [id, testId, 'reading', startedAt, now, raw, band, JSON.stringify(answers)],
        );
      }
    } catch (e) {
      console.error('attempt insert failed', e);
    }
  }, [testId, questions, answers, submitted, startedAt]);

  const { formatted: _formatted, remaining } = useTimer(3600, handleSubmit);
  void _formatted;
  const hms = toHMS(remaining);

  // Fetch test sections, questions, and passages
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

        const secs = (await w.db.query(
          'SELECT * FROM sections WHERE testId = ? ORDER BY id ASC',
          [testId]
        )) as Section[];
        if (cancelled) return;
        setSections(secs);

        const qs = (await w.db.query(
          'SELECT q.* FROM questions q JOIN sections s ON q.sectionId = s.id WHERE s.testId = ? ORDER BY q.id ASC',
          [testId]
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

        const passageIds = secs.map((s) => s.passageId).filter(Boolean) as string[];
        if (passageIds.length) {
          const placeholders = passageIds.map(() => '?').join(',');
          const ps = (await w.db.query(
            `SELECT * FROM passages WHERE id IN (${placeholders})`,
            passageIds
          )) as Passage[];
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

  // Group sections with questions and passages
  const sectionGroups = useMemo(() => {
    if (!sections.length) {
      return [
        {
          section: {
            id: 'default',
            testId: testId!,
            title: 'Section 1',
            passageId: null,
            type: 'reading',
          } as Section,
          qs: questions,
          passage: passages[0] ?? null,
          startIndex: 1,
        },
      ];
    }

    let runningQIndex = 1;
    return sections.map((s) => {
      const qs = questions.filter((q) => q.sectionId === s.id);
      const startIndex = runningQIndex;
      runningQIndex += qs.length;
      return {
        section: s,
        qs,
        passage: passages.find((p) => p.id === s.passageId) ?? null,
        startIndex,
      };
    });
  }, [sections, questions, passages, testId]);

  // Active section data
  const currentGroup = sectionGroups[activeSectionIdx] || sectionGroups[0];

  // Group consecutive same-type questions for Engnovate-style "Questions X-Y" headers
  const questionBlocks = useMemo(() => {
    const out: { qType: string; items: { q: ParsedQuestion; num: number }[] }[] = [];
    currentGroup?.qs.forEach((q, localIdx) => {
      const num = (currentGroup?.startIndex ?? 1) + localIdx;
      const last = out[out.length - 1];
      if (last && last.qType === q.qType) last.items.push({ q, num });
      else out.push({ qType: q.qType, items: [{ q, num }] });
    });
    return out;
  }, [currentGroup]);

  // Question Answer & Flag Handlers
  const onChange = (id: string, v: string) => {
    setAnswers((prev) => ({ ...prev, [id]: v }));
  };

  const toggleFlag = (id: string) => {
    setFlagged((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Jump to specific question
  const jumpToQuestion = (qId: string) => {
    setActiveQuestionId(qId);
    const targetSecIdx = sectionGroups.findIndex((g) => g.qs.some((q) => q.id === qId));
    if (targetSecIdx !== -1 && targetSecIdx !== activeSectionIdx) {
      setActiveSectionIdx(targetSecIdx);
    }
    setTimeout(() => {
      const el = document.getElementById(`question-${qId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);
  };

  // Sequential Next / Back question navigation
  const navigateStep = (direction: 'prev' | 'next') => {
    const allQs = questions;
    if (!allQs.length) return;
    const curIdx = activeQuestionId ? allQs.findIndex((q) => q.id === activeQuestionId) : 0;
    let nextIdx = curIdx;
    if (direction === 'next' && curIdx < allQs.length - 1) {
      nextIdx = curIdx + 1;
    } else if (direction === 'prev' && curIdx > 0) {
      nextIdx = curIdx - 1;
    }
    const targetQ = allQs[nextIdx];
    if (targetQ) jumpToQuestion(targetQ.id);
  };

  // Answered count stats
  const answeredCount = Object.values(answers).filter((v) => v && v.trim().length > 0).length;
  const unansweredCount = questions.length - answeredCount;

  // Section score calculation for review
  const sectionStats = useMemo(() => {
    if (!submitted) return [];
    return sectionGroups.map((g, idx) => {
      let correct = 0;
      g.qs.forEach((q) => {
        const correctAns = answerToString(q.rawAnswer ?? q.answer);
        const userAns = answers[q.id] ?? '';
        if (correctAns && userAns && correctAns.toLowerCase().trim() === userAns.toLowerCase().trim()) {
          correct++;
        }
      });
      return {
        part: `Part ${idx + 1}`,
        title: g.section.title ?? `Section ${idx + 1}`,
        correct,
        total: g.qs.length,
      };
    });
  }, [submitted, sectionGroups, answers]);

  // Splitter drag
  useEffect(() => {
    const up = () => {
      draggingRef.current = false;
    };
    const move = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const pct = (e.clientX / window.innerWidth) * 100;
      setLeftWidth(Math.min(75, Math.max(25, pct)));
    };
    window.addEventListener('mouseup', up);
    window.addEventListener('mousemove', move);
    return () => {
      window.removeEventListener('mouseup', up);
      window.removeEventListener('mousemove', move);
    };
  }, []);

  const bumpText = (dir: 1 | -1) => {
    setTextSize((s) => {
      const order: ('normal' | 'large' | 'xlarge')[] = ['normal', 'large', 'xlarge'];
      const i = order.indexOf(s);
      const n = Math.min(2, Math.max(0, i + dir));
      return order[n];
    });
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent" />
          <p className="text-sm font-medium text-zinc-700">Loading IELTS Reading Test…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-white p-6">
        <div className="max-w-md rounded border border-red-200 bg-white p-6">
          <h2 className="text-base font-bold text-red-600">Error Loading Test</h2>
          <p className="mt-2 text-sm text-zinc-600">{error}</p>
          <button
            onClick={() => navigate('/reading')}
            className="mt-4 rounded bg-zinc-900 px-4 py-2 text-xs font-semibold text-white"
          >
            Back to Tests
          </button>
        </div>
      </div>
    );
  }

  const endQ = (currentGroup?.startIndex ?? 1) + (currentGroup?.qs.length ?? 0) - 1;

  return (
    <div className="flex h-screen flex-col bg-white font-sans text-zinc-900 select-none">
      {/* Red promo banner */}
      <div className="flex h-8 shrink-0 items-center justify-center bg-[#C1272D] px-4 text-center text-[13px] font-semibold text-white">
        <span className="mr-1">🔥</span>
        <span>
          Today Only: Save 30% on Premium — Offer Ends Soon! - <span className="underline">Upgrade Now!</span>
        </span>
      </div>

      {/* Title bar */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-red-100 bg-[#FDF2F2] px-3">
        <div className="flex w-24 items-center gap-1">
          <span className="flex h-7 w-7 items-center justify-center rounded bg-gradient-to-b from-orange-400 to-red-600 text-lg font-extrabold text-white">
            E
          </span>
        </div>
        <h1 className="flex-1 truncate text-center text-[17px] font-bold text-zinc-800">
          {currentGroup?.passage?.title
            ? `Cambridge IELTS 21 Academic Reading Test ${activeSectionIdx + 1} (Online Test)`
            : `${testId} (Online Test)`}
        </h1>
        <div className="flex w-24 justify-end">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1 rounded border border-zinc-300 bg-white px-2 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            <span>📄</span> Export
          </button>
        </div>
      </div>

      {/* Toolbar: Focus | timer | menu */}
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-3">
        <button
          onClick={() => {
            if (document.fullscreenElement) document.exitFullscreen();
            else document.documentElement.requestFullscreen().catch(() => {});
          }}
          className="flex items-center gap-1 rounded border border-zinc-300 px-2 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
        >
          <span className="text-[11px]">⛶</span> Focus
        </button>
        <div data-testid="timer" className="flex items-center gap-1 text-[14px] font-bold tabular-nums text-zinc-900">
          <span>◷</span>
          <span>{hms}</span>
        </div>
        <button className="rounded p-1 text-xl leading-none text-zinc-800 hover:bg-zinc-100" title="Menu">
          ☰
        </button>
      </div>

      {/* Part info box */}
      <div className="shrink-0 bg-white px-2 pt-2">
        <div className="rounded border border-zinc-300 bg-white px-3 py-1.5">
          <div className="flex items-center gap-2 text-[13px]">
            <span className="font-bold">Part {activeSectionIdx + 1}</span>
            <span className="rounded bg-black px-2 py-[2px] text-[11px] font-bold text-white">
              Practice Skimming (1x)
            </span>
            <button
              onClick={() => bumpText(-1)}
              className="flex h-5 w-5 items-center justify-center rounded-[3px] bg-black text-xs font-bold text-white"
            >
              -
            </button>
            <button
              onClick={() => bumpText(1)}
              className="flex h-5 w-5 items-center justify-center rounded-[3px] bg-black text-xs font-bold text-white"
            >
              +
            </button>
          </div>
          <div className="mt-0.5 text-[13px] text-zinc-900">
            Read the text and answer questions {currentGroup?.startIndex ?? 1}-{endQ}
          </div>
        </div>
      </div>

      {/* Score banner (review mode) */}
      {submitted && (
        <div className="mx-2 mt-2 shrink-0 rounded border border-emerald-300 bg-emerald-50 px-4 py-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-base font-extrabold text-white">
                {submitted.band}
              </div>
              <div>
                <div className="text-sm font-extrabold text-emerald-950">
                  Band {submitted.band.toFixed(1)} — {submitted.raw}/{submitted.total} correct
                </div>
                <div className="flex gap-2 text-[11px] text-emerald-800">
                  {sectionStats.map((s) => (
                    <span key={s.part}>
                      {s.part}: <strong>{s.correct}/{s.total}</strong>
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-semibold">
              {(['all', 'correct', 'incorrect', 'flagged'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setReviewFilter(f)}
                  className={`rounded px-2 py-1 capitalize ${
                    reviewFilter === f ? 'bg-zinc-900 text-white' : 'border bg-white text-zinc-700'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main split */}
      <div className="flex min-h-0 flex-1">
        {/* Left: passage */}
        <div className="min-h-0 overflow-y-auto bg-white px-5 py-4 select-text" style={{ width: `${leftWidth}%` }}>
          <p className="text-[13.5px] italic leading-relaxed text-zinc-800">
            You should spend about 20 minutes on Questions {currentGroup?.startIndex ?? 1}-{endQ}, which are based
            on Reading Passage {activeSectionIdx + 1} below.
          </p>
          <h2
            className={`mt-4 font-bold text-zinc-900 ${
              textSize === 'xlarge' ? 'text-[19px]' : textSize === 'large' ? 'text-[17px]' : 'text-[15.5px]'
            }`}
          >
            {currentGroup?.passage?.title ?? currentGroup?.section.title ?? `Reading Passage ${activeSectionIdx + 1}`}
          </h2>
          <div
            className={`mt-3 whitespace-pre-wrap text-zinc-900 ${
              textSize === 'xlarge'
                ? 'text-[16px] leading-[2]'
                : textSize === 'large'
                ? 'text-[15px] leading-[1.95]'
                : 'text-[13.5px] leading-[1.9]'
            }`}
          >
            {currentGroup?.passage?.body ?? 'No passage linked to this section.'}
          </div>
        </div>

        {/* Splitter */}
        <div
          className="relative w-[7px] shrink-0 cursor-col-resize bg-zinc-300/60"
          onMouseDown={() => {
            draggingRef.current = true;
          }}
        >
          <div className="absolute left-1/2 top-1/2 flex h-6 w-[18px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[2px] border border-zinc-500 bg-white text-[11px] font-bold text-zinc-800">
            ↔
          </div>
        </div>

        {/* Right: questions */}
        <div ref={questionListRef} className="min-h-0 flex-1 overflow-y-auto bg-white px-5 py-4">
          {questionBlocks.map((block, bi) => {
            const s = block.items[0]?.num ?? 1;
            const e = block.items[block.items.length - 1]?.num ?? s;
            return (
              <div key={bi} className="mb-7">
                <div className="flex items-center gap-2">
                  <h3 className="text-[15px] font-bold text-zinc-900">
                    Questions {s}-{e}
                  </h3>
                  <span
                    className={`rounded border px-1.5 py-[1px] text-[10.5px] font-medium ${
                      bi === 0
                        ? 'border-blue-300 bg-blue-50 text-blue-700'
                        : 'border-zinc-300 bg-zinc-50 text-zinc-500'
                    }`}
                  >
                    {bi === 0 ? '◎ Practice this section only' : '🔒 Practice this section only'}
                  </span>
                </div>
                <p className="mt-1 whitespace-pre-line text-[13.5px] leading-relaxed text-zinc-900">
                  {instructionFor(block.qType, activeSectionIdx + 1)}
                </p>

                <div className="mt-3 space-y-4">
                  {block.items.map(({ q, num }) => {
                    const correctAns = answerToString(q.rawAnswer ?? q.answer);
                    const userAns = answers[q.id] ?? '';
                    const isCorrect = submitted
                      ? String(correctAns).toLowerCase().trim() === String(userAns).toLowerCase().trim()
                      : null;
                    if (submitted) {
                      if (reviewFilter === 'correct' && !isCorrect) return null;
                      if (reviewFilter === 'incorrect' && isCorrect) return null;
                      if (reviewFilter === 'flagged' && !flagged[q.id]) return null;
                    }
                    return (
                      <div key={q.id}>
                        <QuestionRenderer
                          question={q}
                          value={userAns}
                          onChange={onChange}
                          qNum={num}
                          isFlagged={!!flagged[q.id]}
                          onToggleFlag={toggleFlag}
                        />
                        {submitted && (
                          <div
                            className={`ml-8 mt-1 rounded border px-2 py-1.5 text-xs ${
                              isCorrect ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-red-300 bg-red-50 text-red-900'
                            }`}
                            data-testid={`answer-${q.id}`}
                          >
                            <span data-testid={`check-${q.id}`} className="font-bold">
                              {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                            </span>
                            <span className="ml-2">
                              Your: <strong>{userAns || '—'}</strong> · Correct: <strong>{correctAns}</strong>
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {(!currentGroup?.qs.length) && (
            <div className="rounded border border-dashed p-8 text-center text-sm text-zinc-400">
              No questions in this section.
            </div>
          )}

          {/* Bottom-right submit inside pane (like screenshots) */}
          <div className="mt-6 flex justify-end gap-2">
            <button className="rounded bg-blue-500 px-2.5 py-1.5 text-xs font-bold text-white" title="Questions list">
              ☰
            </button>
            <button
              onClick={() => (submitted ? null : setShowConfirmSubmit(true))}
              className={`flex items-center gap-1 rounded px-3 py-1.5 text-xs font-bold text-white ${
                submitted ? 'bg-emerald-700' : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              Submit ➤
            </button>
          </div>
        </div>
      </div>

      {/* Bottom parts bar */}
      <footer className="flex shrink-0 items-center gap-2 border-t border-zinc-300 bg-white px-2 py-1.5">
        <button
          type="button"
          onClick={() => navigateStep('prev')}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-zinc-900 text-xs font-bold text-white"
        >
          ←
        </button>
        <button
          type="button"
          onClick={() => navigateStep('next')}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-zinc-900 text-xs font-bold text-white"
        >
          →
        </button>

        <div className="flex min-w-0 flex-1 items-center justify-center gap-2 overflow-x-auto">
          {sectionGroups.map((g, secIdx) => {
            const isActive = activeSectionIdx === secIdx;
            const totalLabel = secIdx === 2 || g.qs.length === 14 ? 14 : g.qs.length === 13 ? 13 : g.qs.length;
            return (
              <button
                key={g.section.id}
                onClick={() => setActiveSectionIdx(secIdx)}
                className={`flex shrink-0 items-center gap-1.5 rounded border px-2 py-1 ${
                  isActive ? 'border-red-500 bg-white' : 'border-zinc-300 bg-white'
                }`}
              >
                <span className="text-[12px] font-bold text-zinc-900">
                  Part {secIdx + 1}:
                </span>
                {secIdx === 1 && g.qs.length > 0 && g.qs.length <= 14 ? (
                  <span className="text-[12px] italic text-zinc-700">{totalLabel} questions</span>
                ) : secIdx === 2 && g.qs.length > 0 ? (
                  <span className="text-[12px] italic text-zinc-700">{totalLabel} questions</span>
                ) : null}
                <span className="flex items-center gap-[3px]">
                  {g.qs.map((q, localIdx) => {
                    const num = g.startIndex + localIdx;
                    const hasAns = !!answers[q.id]?.trim();
                    const isSel = activeQuestionId === q.id;
                    let cls = 'border-zinc-400 bg-white text-zinc-800';
                    if (submitted) {
                      const c = answerToString(q.rawAnswer ?? q.answer);
                      const ok = String(c).toLowerCase().trim() === String(answers[q.id] ?? '').toLowerCase().trim();
                      cls = ok ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-red-600 bg-red-600 text-white';
                    } else if (hasAns) {
                      cls = 'border-zinc-900 bg-zinc-900 text-white';
                    }
                    return (
                      <span
                        key={q.id}
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          jumpToQuestion(q.id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') jumpToQuestion(q.id);
                        }}
                        className={`flex h-[22px] min-w-[22px] items-center justify-center border px-[3px] text-[11px] ${
                          isSel ? 'ring-2 ring-blue-500' : ''
                        } ${cls}`}
                      >
                        {num}
                      </span>
                    );
                  })}
                </span>
                {(secIdx === 0 || g.qs.length > 14 || g.qs.length === 0) && g.qs.length > 0 && g.qs.length !== 13 && g.qs.length !== 14 ? (
                  <span className="text-[11px] text-zinc-500">{g.qs.length} questions</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </footer>

      {/* Confirm modal */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded border border-zinc-300 bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-zinc-900">Finish and Submit Reading Test?</h3>
            <p className="mt-2 text-sm text-zinc-600">
              You have answered <strong className="text-zinc-900">{answeredCount}</strong> out of{' '}
              <strong className="text-zinc-900">{questions.length}</strong> questions.
            </p>
            {unansweredCount > 0 && (
              <div className="mt-3 rounded border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
                You still have <strong>{unansweredCount} unanswered</strong>. Review before finishing.
              </div>
            )}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmSubmit(false)}
                className="rounded border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                Continue Test
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="rounded bg-green-600 px-4 py-2 text-xs font-bold text-white hover:bg-green-700"
              >
                Submit Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
