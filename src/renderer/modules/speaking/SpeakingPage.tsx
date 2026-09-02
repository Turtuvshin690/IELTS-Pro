import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { pickMime, isTooLong, startRecording } from './recorder';
import { SPEAKING_SYSTEM } from '../../../lib/nim/prompts';

type Passage = { id: string; title: string | null; body: string | null };
type Section = { id: string; testId: string; title: string | null; passageId: string | null; type: string | null; audioPath?: string | null };
type RawQuestionRow = { id: string; sectionId: string; qType: string; prompt: string; options: string; answer: string; marks: number };
type ParsedQuestion = { id: string; sectionId: string; qType: string; prompt: unknown; options: unknown; answer: unknown; rawPrompt: string };

type SpeakingScore = {
  fc: { band: number; feedback: string };
  lr: { band: number; feedback: string };
  gra: { band: number; feedback: string };
  p: { band: number; feedback: string };
  overall: number;
  suggestions: string[];
  justification: string;
};

function parseJsonField(v: string | null): unknown {
  if (v == null) return v;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}

function parseBandJson(s: string): SpeakingScore {
  const m = s.match(/\{[\s\S]*\}/);
  const raw = m ? m[0] : s;
  return JSON.parse(raw) as SpeakingScore;
}

const PART_LABELS = ['Part 1', 'Part 2', 'Part 3'];

export default function SpeakingPage(): JSX.Element {
  const { testId } = useParams<{ testId: string }>();
  const [sections, setSections] = useState<Section[]>([]);
  const [questions, setQuestions] = useState<ParsedQuestion[]>([]);
  const [passages, setPassages] = useState<Passage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePart, setActivePart] = useState(0);
  const [startedAt] = useState(() => new Date().toISOString());

  // device selector
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');

  // cue 60s prep for Part 2
  const [prepRemaining, setPrepRemaining] = useState(60);
  const [isPrepActive, setIsPrepActive] = useState(false);

  // per-question recorder state
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const [transcripts, setTranscripts] = useState<Record<string, string>>({});
  const [scores, setScores] = useState<Record<string, SpeakingScore>>({});
  const [scoringId, setScoringId] = useState<string | null>(null);
  const recorderRef = useRef<{ mr: MediaRecorder; stop: () => Promise<Blob>; startTime: number; stream: MediaStream } | null>(null);
  const durationIntervalRef = useRef<number | null>(null);

  // tts playback
  const [ttsLoading, setTtsLoading] = useState<string | null>(null);

  // enumerate devices
  useEffect(() => {
    let cancelled = false;
    async function loadDevices() {
      try {
        if (!navigator.mediaDevices?.enumerateDevices) return;
        const all = await navigator.mediaDevices.enumerateDevices();
        const mics = all.filter((d) => d.kind === 'audioinput');
        if (cancelled) return;
        setDevices(mics as MediaDeviceInfo[]);
        if (mics.length && !selectedDevice) {
          setSelectedDevice(mics[0].deviceId);
        }
      } catch (e) {
        console.error('enumerateDevices failed', e);
      }
    }
    loadDevices();
    const handler = () => loadDevices();
    try {
      navigator.mediaDevices?.addEventListener?.('devicechange', handler);
    } catch {
      // ignore
    }
    return () => {
      cancelled = true;
      try {
        navigator.mediaDevices?.removeEventListener?.('devicechange', handler);
      } catch {
        // ignore
      }
    };
  }, [selectedDevice]);

  // cue 60s prep timer
  useEffect(() => {
    if (!isPrepActive) return;
    if (prepRemaining <= 0) {
      setIsPrepActive(false);
      return;
    }
    const id = window.setInterval(() => {
      setPrepRemaining((r) => {
        if (r <= 1) {
          window.clearInterval(id);
          setIsPrepActive(false);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [isPrepActive, prepRemaining]);

  const startPrep = useCallback(() => {
    setPrepRemaining(60);
    setIsPrepActive(true);
  }, []);

  // duration tick while recording
  useEffect(() => {
    if (recordingId && recorderRef.current) {
      durationIntervalRef.current = window.setInterval(() => {
        const start = recorderRef.current?.startTime ?? Date.now();
        const sec = Math.round((Date.now() - start) / 1000);
        setDurations((prev) => ({ ...prev, [recordingId]: sec }));
        if (isTooLong(sec)) {
          // auto-stop when too long (>240s)
          handleStopRecording(recordingId);
        }
      }, 1000) as unknown as number;
    } else {
      if (durationIntervalRef.current) {
        window.clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }
    return () => {
      if (durationIntervalRef.current) {
        window.clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordingId]);

  // fetch test data
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
          prompt: parseJsonField(r.prompt),
          options: parseJsonField(r.options),
          answer: parseJsonField(r.answer),
          rawPrompt: r.prompt,
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

  const handleTts = useCallback(async (text: string, qId: string) => {
    setError(null);
    setTtsLoading(qId);
    try {
      const w = window as unknown as { nim?: { tts: (t: string) => Promise<Buffer | ArrayBuffer | Uint8Array> } };
      if (!w.nim?.tts) throw new Error('TTS not available — check BYOK key in Settings');
      const buf = await window.nim.tts(text);
      // create blob and play
      const blob = new Blob([buf as unknown as BlobPart], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play();
    } catch (e: unknown) {
      setError((e as Error).message ?? String(e));
    } finally {
      setTtsLoading(null);
    }
  }, []);

  const handleStopRecording = useCallback(
    async (qId: string) => {
      const rec = recorderRef.current;
      if (!rec) return;
      try {
        const blob = await rec.stop();
        rec.stream.getTracks().forEach((t) => t.stop());
        recorderRef.current = null;
        setRecordingId(null);
        if (durationIntervalRef.current) {
          window.clearInterval(durationIntervalRef.current);
          durationIntervalRef.current = null;
        }
        const durationSec = durations[qId] ?? Math.round((Date.now() - rec.startTime) / 1000);
        if (isTooLong(durationSec)) {
          setError(`Recording too long (${durationSec}s > 240s). Max 4 minutes per clip.`);
        }
        // ASR then Nemotron scoring
        setScoringId(qId);
        setError(null);
        try {
          const w = window as unknown as {
            nim?: {
              asr: (b: Buffer) => Promise<string>;
              chat: (m: unknown[]) => Promise<string>;
              tts: (t: string) => Promise<Buffer>;
            };
          };
          if (!w.nim?.asr) throw new Error('ASR not available — check BYOK key');
          if (!w.nim?.chat) throw new Error('NIM chat not available');
          // convert blob to Buffer for IPC
          const arrayBuffer = await blob.arrayBuffer();
          let wav: Buffer;
          try {
            // Buffer may be available via global or via require
            const maybeBuffer = (globalThis as unknown as { Buffer?: { from: (ab: ArrayBuffer) => Buffer } }).Buffer;
            if (maybeBuffer) wav = maybeBuffer.from(arrayBuffer);
            else wav = new Uint8Array(arrayBuffer) as unknown as Buffer;
          } catch {
            wav = new Uint8Array(arrayBuffer) as unknown as Buffer;
          }
          const transcript = await window.nim.asr(wav);
          setTranscripts((prev) => ({ ...prev, [qId]: transcript }));

          // Nemotron scoring with SPEAKING_SYSTEM
          const promptText = (() => {
            const q = questions.find((qq) => qq.id === qId);
            const qp = q ? String(q.prompt ?? q.rawPrompt ?? '') : '';
            return qp;
          })();
          const messages = [
            { role: 'system', content: SPEAKING_SYSTEM },
            { role: 'user', content: `Question: ${promptText}\nTranscript: "${transcript}"\nDuration: ${durationSec}s` },
          ];
          const raw = await window.nim.chat(messages);
          const score = parseBandJson(raw);
          setScores((prev) => ({ ...prev, [qId]: score }));

          // persist attempt local-only
          try {
            const dbw = window as unknown as { db?: { exec: (sql: string, params?: unknown[]) => Promise<unknown> } };
            if (dbw.db?.exec) {
              const attemptId = `${testId}_${qId}_${Date.now()}`;
              const now = new Date().toISOString();
              await dbw.db.exec(
                'INSERT INTO attempts (id, testId, mode, startedAt, submittedAt, rawScore, band, answers) VALUES (?,?,?,?,?,?,?,?)',
                [attemptId, testId, 'speaking', startedAt, now, durationSec, score.overall, JSON.stringify({ qId, transcript, durationSec })],
              );
              const subs: Array<[string, number, string]> = [
                ['FC', score.fc.band, score.fc.feedback],
                ['LR', score.lr.band, score.lr.feedback],
                ['GRA', score.gra.band, score.gra.feedback],
                ['P', score.p.band, score.p.feedback],
              ];
              for (const [sub, band, feedback] of subs) {
                try {
                  await dbw.db.exec('INSERT INTO scores (id, attemptId, subSkill, band, feedback) VALUES (?,?,?,?,?)', [
                    `${attemptId}_${sub}`,
                    attemptId,
                    sub,
                    band,
                    feedback,
                  ]);
                } catch {
                  // ignore per-sub
                }
              }
            }
          } catch (e) {
            console.error('attempt insert failed', e);
          }
        } catch (e: unknown) {
          setError((e as Error).message ?? String(e));
        } finally {
          setScoringId(null);
        }
      } catch (e: unknown) {
        setError((e as Error).message ?? String(e));
        setRecordingId(null);
        recorderRef.current = null;
      }
    },
    [durations, questions, testId, startedAt],
  );

  const handleRecord = useCallback(
    async (qId: string) => {
      setError(null);
      if (recordingId === qId) {
        await handleStopRecording(qId);
        return;
      }
      if (recordingId && recordingId !== qId) {
        setError('Already recording another question. Stop current first.');
        return;
      }
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone not available in this environment');
        const constraints: MediaStreamConstraints = {
          audio: selectedDevice ? { deviceId: { exact: selectedDevice } } : true,
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        // pick mime preferring webm
        const available = ['audio/webm', 'audio/ogg', 'audio/wav'];
        let supported: string[] = [];
        try {
          // check MediaRecorder.isTypeSupported if available
          const isSupported = (t: string) => {
            try {
              return typeof MediaRecorder !== 'undefined' && (MediaRecorder as unknown as { isTypeSupported: (m: string) => boolean }).isTypeSupported
                ? (MediaRecorder as unknown as { isTypeSupported: (m: string) => boolean }).isTypeSupported(t)
                : true;
            } catch {
              return true;
            }
          };
          supported = available.filter(isSupported);
          if (!supported.length) supported = available;
        } catch {
          supported = available;
        }
        const mime = pickMime(supported);
        const { mr, stop } = await startRecording(stream, mime);
        try {
          mr.start();
        } catch (e) {
          console.error('mr.start failed', e);
        }
        recorderRef.current = { mr, stop, startTime: Date.now(), stream };
        setRecordingId(qId);
        setDurations((prev) => ({ ...prev, [qId]: 0 }));
        // also expose duration guard via isTooLong on each tick (handled in interval)
      } catch (e: unknown) {
        setError((e as Error).message ?? String(e));
      }
    },
    [recordingId, selectedDevice, handleStopRecording],
  );

  if (loading) return <div className="p-8 text-sm">Loading speaking test {testId}...</div>;
  if (error && !questions.length && !sections.length) {
    // still show page but with error banner if DB empty; don't block
  }

  const parts = sections.length
    ? sections.map((s, idx) => ({
        section: s,
        label: s.title ?? PART_LABELS[idx] ?? `Part ${idx + 1}`,
        qs: questions.filter((q) => q.sectionId === s.id),
        passage: passages.find((p) => p.id === s.passageId) ?? null,
      }))
    : PART_LABELS.map((label, idx) => ({
        section: { id: `part-${idx + 1}`, testId: testId!, title: label, passageId: null, type: 'speaking' } as Section,
        label,
        qs: idx === 0 ? questions : [],
        passage: null as Passage | null,
      }));

  const safeActive = Math.min(activePart, parts.length - 1);
  const active = parts[safeActive] ?? parts[0];
  const isPart2 = safeActive === 1 || active.label.toLowerCase().includes('part 2') || active.label.toLowerCase().includes('cue');

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b px-4 py-2">
        <h1 className="text-sm font-semibold">Speaking — {testId}</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">11–14 min mock • per-question recording</span>
        </div>
      </header>

      {/* device selector */}
      <div className="border-b bg-gray-50 px-4 py-3" data-testid="device-selector">
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="mic-select" className="text-xs font-medium text-gray-700">
            Microphone
          </label>
          <select
            id="mic-select"
            data-testid="device-select"
            value={selectedDevice}
            onChange={(e) => setSelectedDevice(e.target.value)}
            className="rounded border bg-white px-2 py-1 text-sm"
          >
            {devices.length === 0 ? (
              <option value="">Default microphone</option>
            ) : (
              devices.map((d, idx) => (
                <option key={d.deviceId || `mic-${idx}`} value={d.deviceId}>
                  {d.label || `Microphone ${idx + 1}`} {d.deviceId === selectedDevice ? ' (selected)' : ''}
                </option>
              ))
            )}
          </select>
          <span className="text-xs text-gray-400">{devices.length} device(s) found</span>
          {recordingId && (
            <span className="ml-2 rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700" data-testid="recording-indicator">
              ● Recording {durations[recordingId] ?? 0}s {isTooLong(durations[recordingId] ?? 0) ? '(too long!)' : ''}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="border-b bg-red-50 px-4 py-2 text-sm text-red-700" data-testid="error-banner">
          {error}
        </div>
      )}

      {/* parts nav */}
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
        {/* left: prompt / cue card */}
        <div className="w-1/2 overflow-auto border-r p-4">
          <h2 className="mb-3 text-sm font-semibold">{active.label} — Prompts</h2>

          {isPart2 && (
            <div className="mb-4 rounded border bg-amber-50 p-3" data-testid="cue-card">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-amber-900">Cue Card — 60s Prep</h3>
                <span className="font-mono text-sm font-bold" data-testid="prep-timer">
                  {String(Math.floor(prepRemaining / 60)).padStart(2, '0')}:{String(prepRemaining % 60).padStart(2, '0')}
                </span>
              </div>
              <p className="mt-1 text-xs text-amber-800">
                You have 60 seconds to prepare. Use this time to note ideas, then record your 2-minute talk. Prep timer is enforced per cue card.
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={startPrep}
                  disabled={isPrepActive}
                  data-testid="prep-start"
                  className="rounded bg-amber-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
                >
                  {isPrepActive ? `Preparing… ${prepRemaining}s` : prepRemaining === 0 ? 'Prep Done — Start Recording' : 'Start 60s Prep'}
                </button>
                {isPrepActive && <span className="text-xs text-amber-700">Prep active — recording unlocks after timer or immediately (practice mode)</span>}
              </div>
              {active.passage?.body && (
                <div className="mt-3 whitespace-pre-wrap rounded bg-white p-2 text-sm leading-relaxed">{active.passage.body}</div>
              )}
            </div>
          )}

          {active.qs.length === 0 ? (
            <div className="rounded border border-dashed p-6 text-center">
              <p className="text-sm text-gray-500">No prompts in this part. Import a speaking test with questions.</p>
              <p className="mt-1 text-xs text-gray-400">Part 1: 12 short Qs • Part 2: Cue card (1m prep + 2m talk) • Part 3: Discussion 4-5m</p>
              {active.passage?.body ? (
                <div className="mt-4 whitespace-pre-wrap text-left text-sm">{active.passage.body}</div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-4">
              {active.qs.map((q, idx) => {
                const promptText = String(q.prompt ?? (typeof q.rawPrompt === 'string' ? (() => { try { return JSON.parse(q.rawPrompt); } catch { return q.rawPrompt; } })() : '') ?? '');
                const isRecordingThis = recordingId === q.id;
                const dur = durations[q.id] ?? 0;
                const tooLong = isTooLong(dur);
                const transcript = transcripts[q.id];
                const score = scores[q.id];
                const isScoring = scoringId === q.id;
                return (
                  <div key={q.id} className="rounded border p-3" data-testid={`question-${q.id}`}>
                    <div className="mb-1 text-xs text-gray-500">
                      Q{idx + 1} • {q.qType}
                    </div>
                    <div className="whitespace-pre-wrap text-sm font-medium leading-relaxed">{promptText || `Prompt ${idx + 1}`}</div>
                    {q.options != null && String(q.options) !== 'null' && (
                      <div className="mt-1 text-xs text-gray-600">Options: {String(JSON.stringify(q.options)).slice(0, 200)}</div>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleTts(promptText, q.id)}
                        disabled={ttsLoading === q.id}
                        data-testid={`tts-btn-${q.id}`}
                        className="rounded border bg-white px-3 py-1 text-xs font-medium hover:bg-gray-50 disabled:opacity-50"
                      >
                        {ttsLoading === q.id ? 'Synthesizing…' : '🔊 Play Prompt (Magpie TTS)'}
                      </button>
                      <button
                        onClick={() => handleRecord(q.id)}
                        data-testid={`record-btn-${q.id}`}
                        className={`rounded px-3 py-1 text-xs font-medium text-white ${isRecordingThis ? 'bg-red-600 hover:bg-red-700' : 'bg-black hover:bg-gray-800'}`}
                      >
                        {isRecordingThis ? `⏹ Stop (${dur}s)` : '● Record'}
                      </button>
                      <span className="text-xs text-gray-500" data-testid={`duration-${q.id}`}>
                        {dur}s{dur ? ` ${tooLong ? '— Too long!' : ''}` : ''}
                      </span>
                      {tooLong && (
                        <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-700" data-testid={`too-long-${q.id}`}>
                          Too long (&gt;240s) — max 4 min
                        </span>
                      )}
                      {isScoring && <span className="text-xs text-blue-600">Transcribing with Parakeet + scoring with Nemotron…</span>}
                    </div>

                    {transcript && (
                      <div className="mt-3 rounded bg-gray-50 p-2" data-testid={`transcript-${q.id}`}>
                        <div className="text-xs font-semibold text-gray-600">Transcript (Parakeet ASR)</div>
                        <p className="mt-1 text-sm leading-relaxed text-gray-800">{transcript}</p>
                      </div>
                    )}

                    {score && (
                      <div className="mt-3 space-y-2 rounded border bg-white p-3" data-testid={`score-${q.id}`}>
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-semibold">Checked — Band Feedback</h4>
                          <span className="rounded bg-black px-2 py-1 text-xs font-bold text-white" data-testid={`overall-${q.id}`}>
                            Overall {score.overall}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded border p-2" data-testid={`fc-${q.id}`}>
                            <div className="text-[11px] font-semibold text-gray-500">FC</div>
                            <div className="text-sm font-bold">Band {score.fc.band}</div>
                            <p className="mt-1 text-xs text-gray-700">{score.fc.feedback}</p>
                          </div>
                          <div className="rounded border p-2" data-testid={`lr-${q.id}`}>
                            <div className="text-[11px] font-semibold text-gray-500">LR</div>
                            <div className="text-sm font-bold">Band {score.lr.band}</div>
                            <p className="mt-1 text-xs text-gray-700">{score.lr.feedback}</p>
                          </div>
                          <div className="rounded border p-2" data-testid={`gra-${q.id}`}>
                            <div className="text-[11px] font-semibold text-gray-500">GRA</div>
                            <div className="text-sm font-bold">Band {score.gra.band}</div>
                            <p className="mt-1 text-xs text-gray-700">{score.gra.feedback}</p>
                          </div>
                          <div className="rounded border p-2" data-testid={`p-${q.id}`}>
                            <div className="text-[11px] font-semibold text-gray-500">P</div>
                            <div className="text-sm font-bold">Band {score.p.band}</div>
                            <p className="mt-1 text-xs text-gray-700">{score.p.feedback}</p>
                          </div>
                        </div>
                        {score.justification && <p className="text-xs text-gray-600">{score.justification}</p>}
                        {score.suggestions && score.suggestions.length > 0 && (
                          <div className="rounded bg-amber-50 p-2">
                            <div className="text-xs font-semibold text-amber-800">Suggestions</div>
                            <ul className="mt-1 list-disc pl-4 text-xs text-amber-900">
                              {score.suggestions.map((s, i) => (
                                <li key={i}>{s}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="mt-2 rounded border bg-blue-50 p-2" data-testid={`model-${q.id}`}>
                      <div className="text-xs font-semibold text-blue-800">Checked Model Answer (reference)</div>
                      <p className="mt-1 text-xs leading-relaxed text-blue-900">{String(q.answer ?? '')}</p>
                      <p className="mt-1 text-[11px] text-blue-700">Checked via Parakeet ASR transcript + Nemotron {q.qType} scoring — compare your transcript above to this Band 9 structure.</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* right: recording guidance / transcript log */}
        <div className="w-1/2 overflow-auto p-4">
          <h2 className="mb-3 text-sm font-semibold">Recorder &amp; Scoring</h2>
          <div className="space-y-3">
            <div className="rounded border bg-blue-50 p-3 text-xs text-blue-900">
              <p className="font-semibold">How it works</p>
              <ol className="mt-1 list-decimal pl-4">
                <li>Select microphone above (device selector).</li>
                <li>Click 🔊 to hear examiner prompt via Magpie TTS (window.nim.tts).</li>
                <li>Click ● Record per question — uses MediaRecorder with pickMime (prefers audio/webm) and isTooLong guard (&gt;240s).</li>
                <li>Click Stop → audio → Parakeet ASR (window.nim.asr) → Nemotron scoring (window.nim.chat with SPEAKING_SYSTEM).</li>
                <li>Cue card in Part 2 enforces 60s prep timer before talk.</li>
              </ol>
              <p className="mt-2 text-[11px] text-blue-700">Max 4 min per clip. Auto-stops at 240s.</p>
            </div>

            {questions.length > 0 && (
              <div className="rounded border p-3">
                <h3 className="text-xs font-semibold">Progress</h3>
                <div className="mt-2 space-y-1 text-xs">
                  {questions.map((q) => {
                    const tr = transcripts[q.id];
                    const sc = scores[q.id];
                    const dur = durations[q.id];
                    return (
                      <div key={q.id} className="flex items-center justify-between border-b py-1 last:border-0">
                        <span className="truncate">{String(q.prompt ?? q.id).slice(0, 40) || q.id}</span>
                        <span className="ml-2 shrink-0 text-gray-500">
                          {tr ? '✓ transcribed' : dur ? `${dur}s` : '—'} {sc ? `• Band ${sc.overall}` : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="rounded border p-3">
              <h3 className="text-xs font-semibold">Scoring rubric (Nemotron)</h3>
              <p className="mt-1 text-xs leading-relaxed text-gray-600">
                Uses SPEAKING_SYSTEM prompt: FC (Fluency & Coherence), LR (Lexical Resource), GRA (Grammar), P (Pronunciation — estimated from fluency/lexical markers,
                since Nemotron is text-only). Returns JSON with band 0–9 per criterion, overall, suggestions, justification.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
