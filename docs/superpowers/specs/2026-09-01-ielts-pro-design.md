# IELTS Pro — Design Spec
**Date:** 2026-09-01
**Approach:** Electron Thin Client + Direct NVIDIA NIM Cloud (BYOK) — Approach 1
**Status:** Approved

## 1. Overview
Full-stack downloadable PC software for self-study IELTS learners (Band 6-9 target) covering all four sections — Reading, Listening, Writing, Speaking — with timed full mocks and AI band scoring + feedback. Everything local except model inference. No artificial limits (unlimited retakes, local storage only).

**Core constraint:** NVIDIA Nemotron 3.5 Lightning is text-only; Speaking requires separate ASR/TTS via NVIDIA Speech NIM (Parakeet + Magpie). All inference via `build.nvidia.com` NIM Cloud APIs using OpenAI-compatible endpoints, with bring-your-own-key (BYOK).

## 2. Architecture

```
[Electron Renderer: React 18 + Vite + Tailwind + Zustand]
        ↕ IPC (contextBridge, ipcRenderer/invoke)
[Electron Main: Node.js]
  ├─ NIM Proxy (OpenAI-compatible fetch + reasoning parser)
  ├─ safeStorage (BYOK encryption)
  ├─ SQLite (better-sqlite3) + FileSystem cache
  ├─ Audio (Web Audio API + MediaRecorder)
  └─ AutoUpdater (electron-updater + GitHub Releases)
        ↕ HTTPS
[NVIDIA NIM Cloud: build.nvidia.com]
  ├─ nemotron-3.5-lightning-30b-a3b (chat completions)
  ├─ parakeet-1-1b-ctc-en-us ASR (HTTP :9000 / gRPC :50051)
  └─ magpie-tts-multilingual TTS
```

- **Shell:** Electron 30+ with `electron-vite`, TypeScript strict, ESLint + Prettier.
- **Build:** `electron-builder` → NSIS `.exe`, `.msi`, `portable.zip`; autoUpdater via `electron-updater`.
- **State:** Zustand + persist (local only). No remote sync in v1.
- **Routing:** React Router v6, hash router for Electron.
- **Everything local except NIM:** No backend, no user accounts, no cloud DB. Content banks, attempts, scores, audio cache all in `%APPDATA%/IELTS Pro/` (prod) / project root (dev).

### 2.1 Project Structure
```
ielts-pro/
├─ src/
│  ├─ main/            # Electron main process
│  │  ├─ ipc/          # NIM proxy handlers, key vault, db
│  │  └─ windows/      # BrowserWindow factory
│  ├─ preload/         # contextBridge API
│  ├─ renderer/        # React app
│  │  ├─ modules/
│  │  │  ├─ reading/
│  │  │  ├─ listening/
│  │  │  ├─ writing/
│  │  │  └─ speaking/
│  │  ├─ shared/       # timer, band-calc, audio-player, progress
│  │  └─ app/
│  ├─ lib/
│  │  ├─ nim/          # nemotron client, parakeet client, magpie client
│  │  ├─ db/           # sqlite schema, migrations
│  │  └─ import/       # JSON/CSV importer
│  └─ types/
├─ resources/          # seed content banks (git-ignored audio)
├─ scripts/
└─ docs/superpowers/specs/
```

## 3. Components

### 3.1 Shared Services
- **TimerService:** Per-section countdown (Reading 60m, Listening 30m + 10m transfer, Writing 60m, Speaking 11-14m). Pause/resume only in practice mode; locked in mock mode. Auto-submit on expiry.
- **BandCalculator:** Converts raw scores ↔ band 0-9 (half bands) per official tables. Separate for Academic/General.
- **ProgressStore:** Local analytics — attempt history, weak-area detection (question-type accuracy), streak, predicted band.
- **AudioService:** Playback for Listening + Speaking prompts (WaveSurfer-style timeline), recording via `MediaRecorder` (webm/opus → wav), device selector, waveform viz.
- **ContentService:** Load tests/sections/questions from SQLite; fallback seed JSON.

### 3.2 Reading Module
- **Question types:** Multiple Choice, True/False/Not Given, Yes/No/Not Given, Matching Headings, Matching Features, Sentence Completion, Summary Completion, Diagram Label, Short Answer.
- **UI:** Split pane — passage (left, scroll-synced) + questions (right). Highlight search, word count, copy-paste disabled in mock mode.
- **Scoring:** Deterministic (answer key + tolerance for case/punctuation). Nemotron only for explanation generation (post-submit), not scoring.

### 3.3 Listening Module
- **Structure:** 4 parts, 40 Qs, single-play audio (mock) / repeatable (practice). Types mirror Reading + Map/Plan Labelling, Form/Note/Table Completion.
- **Player:** Custom controls — play once lock, volume, speed 0.75x only in practice, transcript hidden until review.
- **Audio cache:** Pre-download to `appData/audio/{testId}.mp3` on first open; cache forever locally.
- **Scoring:** Deterministic + Nemotron-generated transcript alignment for review.

### 3.4 Writing Module
- **Editor:** Task 1 (150w min, Academic: graph/process | General: letter) and Task 2 (250w min, essay). Rich text with live word count, paragraph count, no grammar autocorrect in mock.
- **Scoring (Nemotron 3.5 Lightning):**
  - Prompt: Band descriptors for TR/TA, CC, LR, GRA (public IELTS rubrics) — structured JSON output.
  - Sampling: `temperature: 1.0, top_p: 0.95` per NVIDIA recommendation; `enable_thinking: true` with `nemotron_v3` reasoning parser.
  - Context: Single essay per call (average 300 tokens) — well within 256K window. No tool calling.
  - Output: `{ tr: { band, feedback, examples }, cc, lr, gra, overall, suggestions[], band_justification }`.
  - Fallback: If offline / key missing, store attempt locally, queue scoring with retry banner.
- **Unlimited:** No limit on submissions; history paginated locally.

### 3.5 Speaking Module
- **Flow:** Part 1 (Intro, 4-5m, 12 Qs), Part 2 (Cue card 1m prep + 2m talk), Part 3 (Discussion 4-5m).
- **Recording:** Per-question recording (MediaRecorder → 16kHz wav). Max 4m per clip, auto-stop.
- **ASR:** Parakeet 1.1b CTC en-US (`parakeet-1-1b-ctc-en-us:1.5.3`, streaming+offline, HTTP port 9000) — `nvcr.io/nim/nvidia/parakeet-1-1b-ctc-en-us`. Falls back to local `whisper.cpp` if cloud unreachable? v1: show offline banner, keep audio locally for later transcription.
- **TTS (examiner):** Magpie TTS Multilingual (`magpie-tts-multilingual:1.10.0`, voices `Magpie-Multilingual.en-US.*`) for cue-card prompts and Part 1 questions.
- **Scoring (Nemotron 3.5 Lightning):** Input transcript + duration + lexical metrics → FC, LR, GRA, P (pronunciation based on transcript confidence + fluency markers), overall + turn-by-turn feedback. Prompt includes IELTS speaking band descriptors.
- **Pronunciation note:** Nemotron is text-only, so P band is estimated via fluency/lexical features + Parakeet confidence; not acoustic phoneme scoring (v2 could add dedicated pronunciation NIM).

## 4. Data Flow — NIM Integration

### 4.1 BYOK Key Vault
- User enters `NVIDIA_API_KEY` in Settings → validated via `GET /v1/models` probe.
- Stored encrypted via `safeStorage.encryptString` (Electron) → `keytar` fallback. Never in renderer, never in SQLite plaintext. Exported only via main IPC.
- Main proxy injects `Authorization: Bearer $key` on every NIM call. Rate-limit / 401 surfaces as non-blocking banner with “Check key” CTA.

### 4.2 Nemotron 3.5 Lightning Call
```ts
// Main process
const res = await fetch(`${NIM_BASE}/v1/chat/completions`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'nvidia/nemotron-3.5-lightning-30b-a3b',
    messages: [{ role: 'system', content: WRITING_SYSTEM }, { role: 'user', content: essay }],
    temperature: 1.0,
    top_p: 0.95,
    max_tokens: 2048,
    // reasoning parser enabled server-side via NIM config nemotron_v3
  })
});
```

### 4.3 Speech NIM Flow (Speaking)
```
Renderer: MediaRecorder → wav blob → IPC → Main
Main: POST /v1/audio/transcriptions (Parakeet HTTP :9000) with key → transcript
Main: POST /v1/chat/completions (Nemotron) with transcript → band JSON → Renderer
TTS: POST /v1/audio/speech (Magpie) → audio buffer → Renderer playback
```

### 4.4 Error Handling
- **No key:** Block AI scoring, allow deterministic Reading/Listening mocks, queue Writing/Speaking for later scoring.
- **Quota/429:** Exponential backoff 1s/2s/4s, user banner with retry.
- **Offline:** `navigator.onLine` + fetch timeout 15s → offline banner, cache attempt, auto-retry on reconnect.
- **Audio device fail:** Enumerate `mediaDevices`, fallback prompt, “Continue without mic” for reading-only.
- **Auto-save:** Every 30s to SQLite + on `beforeunload`; crash recovery reloads draft.

## 5. Storage & Content Import

### 5.1 SQLite Schema (better-sqlite3)
```sql
tests(id, kind TEXT, title, durationSec, createdAt)
sections(id, testId, type TEXT, title, audioPath, passageId)
passages(id, title, body)
questions(id, sectionId, qType TEXT, prompt JSON, options JSON, answer JSON, marks REAL)
attempts(id, testId, mode TEXT, startedAt, submittedAt, rawScore, band REAL, answers JSON)
scores(id, attemptId, subSkill TEXT, band REAL, feedback JSON) -- one row per TR/CC/etc
settings(key PK, value JSON) -- holds encrypted key ref, preferences
```

All local, unlimited rows, WAL mode, migrations via `umzug`-lite.

### 5.2 Import Pipeline (User's Existing Banks)
- **Formats:** JSON (`{ tests: [...] }`) and CSV (per-question-type). Validator checks required fields, Q-type enum, audio path existence.
- **Importer UI:** Drag-drop file/folder → preview table → “Import” → transaction insert + copy audio to `audio/` cache.
- **Seed content:** Ships with 2 demo mocks per section (no audio copyright risk) + importer for full banks.
- **No cloud content:** Importer runs entirely in main process; no upload.

### 5.3 Analytics (Local Only)
- Accuracy by Q-type, time per Q, band trend chart, weak-area cards, predicted band (moving average last 5 mocks).
- Unlimited history, paginated virtual list.

## 6. Security
- No secrets in renderer. IPC allowlist (`nim:chat`, `nim:asr`, `nim:tts`, `db:*`, `store:*`).
- CSP `default-src 'self'` in renderer.
- Key never logged; redacted in devtools.
- SQLite file permissions 600.

## 7. Testing & Distribution
- **Unit:** Vitest for band calculator, import validator, prompt builders.
- **Integration:** MSW mocks for NIM endpoints (record/replay real Nimotron responses for deterministic tests).
- **E2E:** Playwright + Electron (`_electron` fixture) — full mock flow per section, recording mock via fake MediaRecorder.
- **Calibration:** Manual check of 20 graded essays vs Cambridge IELTS 17-19 band descriptors; tune prompts until ±0.5 agreement.
- **Build:** `vite build` + `electron-builder --win nsis msi portable` → GitHub Releases. `electron-updater` checks on launch.
- **Tech:** Node 20, Electron 30, electron-vite, React 18, TypeScript 5, Tailwind 3, Zustand, better-sqlite3, wav encoder.

## 8. Success Criteria (v1)
- Installable `.exe` on Windows 10/11 without admin (portable fallback).
- All 4 mocks completable offline except AI scoring (queues when offline).
- BYOK validated in <2s; helpful error states.
- Writing/Speaking feedback in <8s p95 on cloud NIM.
- Importer handles 500+ questions without lag.

## 9. Out of Scope (v1) → v2
- User accounts / cloud sync / tutor dashboard
- Offline quantized Nemotron (GGUF) — cloud only in v1
- Acoustic pronunciation scoring / diarization
- Mobile / web version
- Payments / subscriptions

## 10. Risks & Mitigations
- **Nemotron text-only:** Documented; Speaking P band is heuristic until dedicated acoustic model added.
- **Key abuse / cost:** BYOK shifts cost to user; add usage estimator in settings.
- **Audio copyright:** Ship no MP3s; importer requires user-owned Cambridge-style banks.
