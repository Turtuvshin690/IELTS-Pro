# IELTS Pro — Free Forever IELTS Study App

![Electron](https://img.shields.io/badge/Electron-30-47848F?logo=electron&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![Tailwind](https://img.shields.io/badge/Tailwind-3-38BDF8?logo=tailwindcss&logoColor=white)
![Tests](https://img.shields.io/badge/tests-43_passing-brightgreen)
![Price](https://img.shields.io/badge/price-free_forever-emerald)

A downloadable desktop app for IELTS self-study. All four skills, instant checking, streaks and band tracking — offline-first, no account, no paywall.

## Features

- **Coach home** — continue where you left off, today's plan from your weakest question types, streak + XP, target band, band trends
- **Reading** — 5 seeded tests incl. two full 40-question mocks, exam-style split-pane with timers and question palette
- **Listening** — seeded tests with single-play mock audio and transcript review after submit
- **Writing** — Task 1 + Task 2 editor with live word count, auto-save, offline queue; AI band scoring via your own NVIDIA key (TR/TA, CC, LR, GRA)
- **Speaking** — Parts 1–3 with mic recording, Parakeet transcripts, AI scoring
- **Resources** — curated official links (ielts.org, British Council, Cambridge, IDP) + study plans
- **100% local** — attempts in SQLite (`%APPDATA%/IELTS Pro`, JSON fallback included); API key in OS-encrypted storage

## Quickstart

```bash
npm install
npm run dev      # Electron + Vite dev window
```

Requires Node.js and npm. No native build tools needed — the app falls back to a JSON database if `better-sqlite3` can't load.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev window (Electron + Vite) |
| `npm test` | Unit suite (vitest, 43 tests) |
| `npm run test:e2e` | Playwright E2E (needs dev server) |
| `npm run typecheck` | `tsc --noEmit` (node + web configs) |
| `npm run lint` | ESLint (`.ts`/`.tsx`) |
| `npm run build` | Packaged installer (NSIS + portable) |
| `npm run build:portable` | Portable `.exe` only |
| `npm run build:dir` | Unpacked directory build |

## Project structure

```
src/
  main/            Electron main process (window, updater, logging)
  preload/         IPC bridge (db, nim AI, safeStorage)
  lib/
    db/            SQLite client + JSON fallback + seed (11 tests)
    nim/           NVIDIA NIM prompts and clients (offline-queued)
    band/          Raw-score → band calculator
    import/        Test importer + validator
    resources/     Study-resource catalog + plans
  renderer/
    App.tsx        Routes (/reading, /listening, /writing, /speaking, …)
    app/shell/    Sidebar, Settings (BYOK key lives here)
    modules/      One folder per skill: list page + player page
    shared/       Timer, progress store, streak/XP, analytics, audio cache
tests/unit/       15 files, 43 tests (scoring, streak, seed shape, import)
```

## AI scoring (optional, BYOK)

Writing/Speaking AI feedback needs your own NVIDIA API key: paste it in **Settings** (stored via Electron `safeStorage`, sent only to NVIDIA NIM). Everything else — all tests, checking, history, streaks — works fully offline with no key.
