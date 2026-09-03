# Free Coach Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild IELTS Pro's UI into a "Free Coach" study app (new shell, coach home, unified libraries, consistent exam players) with zero database changes.

**Architecture:** Phased visual reconstruction — each task leaves the app compiling and all existing unit tests green. Pure logic (streak/XP) is TDD unit-tested; components are typechecked plus manually verified in the dev server. No new DB tables, no route changes, no scoring changes.

**Tech Stack:** React 18 + Tailwind v3 (existing). No new dependencies — ponytail: emoji icons already pattern the codebase (listening 🎧, writing ✍️, speaking 🎤) and the page fade is one CSS rule. Charts stay hand-rolled SVG. Electron 30, vitest 1.6.1 (node env, `tests/unit/**/*.test.ts`).

**Working rules (ponytail full):** No new npm deps. No new shared components — each player/library change is inlined per page (a shared extract happens only if a 4th caller appears). Fewest files, shortest diff that matches the spec. Intentional simplifications are marked with `// ponytail:` comments.

## Global Constraints

- No database schema changes — `attempts` / `questions` / `tests` / `sections` / `passages` tables untouched.
- All existing unit tests must stay green after every task (35 at plan start).
- Keep `data-testid` hooks: `sidebar`, `nav-*`, `dashboard-title`, `timer`, `question-item-*`, `attempts-table`, `band-chart`, `*-list`, `*-card-*`, `start-*-*`, `*-empty`, `parts-nav`, `submit-btn`.
- No network calls in core flows; no paywall/premium copy anywhere.
- Typecheck command: `npx tsc --noEmit -p tsconfig.web.json`.
- Unit test command: `npx vitest run tests/unit`.
- One atomic commit per task.

---

## File Structure

New files and what each owns:

- `src/renderer/shared/progress/streak.ts` — pure streak/XP/date helpers (no React, no DOM). Single source for all streak math.
- `tests/unit/streak.test.ts` — unit tests for the above.

Modified files (in place — no new shared components):

- `tailwind.config.js` — paper/ink/accent tokens.
- `src/renderer/index.css` — paper background, focus ring, smooth scroll.
- `src/renderer/App.tsx` — paper shell.
- `src/renderer/app/shell/Sidebar.tsx` — coach nav rewrite (full file replace, 47 lines).
- `src/renderer/shared/progress/Dashboard.tsx` — coach home rewrite (uses `streak.ts` + existing `analytics.ts` exports `weakAreas`, `bandTrends`, `paginate`).
- `src/renderer/modules/listening/ListeningListPage.tsx` — restyle in place (keep `META`).
- `src/renderer/modules/writing/WritingListPage.tsx` — restyle in place.
- `src/renderer/modules/speaking/SpeakingListPage.tsx` — restyle in place.
- `src/renderer/modules/reading/ReadingListPage.tsx` — card-style alignment only; its search/chips/category logic stays.
- `src/renderer/modules/listening/ListeningPage.tsx` — header restyle in place (lines 230-244).
- `src/renderer/modules/writing/WritingEditor.tsx` — header restyle in place (lines 249-264).
- `src/renderer/modules/speaking/SpeakingPage.tsx` — header restyle in place (lines 410-415, no timer there; keep device selector).
- `src/renderer/modules/reading/ReadingPage.tsx` — red promo banner (line ~373) becomes free-practice strip.

---

### Task 1: Theme tokens + paper shell

**Files:**
- Modify: `tailwind.config.js`
- Modify: `src/renderer/index.css`
- Modify: `src/renderer/App.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `paper` / `ink` Tailwind colors and `bg-paper text-ink` shell classes used by Tasks 3–6.

- [ ] **Step 1: Extend Tailwind tokens (no new dependencies)**

No `npm install` — ponytail: icons reuse the existing emoji pattern, motion is plain CSS. Replace `tailwind.config.js` theme block with:

```js
theme: {
  extend: {
    colors: {
      paper: '#FAFAF7',
      ink: '#18181B',
    },
    boxShadow: {
      card: '0 1px 2px rgb(24 24 27 / 0.05)',
    },
  },
},
```

- [ ] **Step 2: Run typecheck baseline to confirm green start**

Run: `npx tsc --noEmit -p tsconfig.web.json`
Expected: PASS (no output).

- [ ] **Step 3: Base styles in `src/renderer/index.css`**

Replace file content with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html {
  scroll-behavior: smooth;
}

body {
  background-color: #fafaf7;
  color: #18181b;
}

:focus-visible {
  outline: 2px solid #059669;
  outline-offset: 2px;
}
```

- [ ] **Step 4: Paper shell in `src/renderer/App.tsx`**

Change the wrapper div classes only: `flex h-screen bg-gray-50` → `flex h-screen bg-paper text-ink`, and `<main className="flex-1 overflow-auto bg-gray-50">` → `<main className="flex-1 overflow-auto bg-paper">`. No other changes (ponytail: page-fade animation skipped — static render is the minimum that works).

- [ ] **Step 5: Verify typecheck + full unit suite**

Run: `npx tsc --noEmit -p tsconfig.web.json`
Expected: PASS.

Run: `npx vitest run tests/unit`
Expected: 14 files / 35 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add tailwind.config.js src/renderer/index.css src/renderer/App.tsx
git commit -m "feat: free-coach theme tokens and paper shell"
```

---

### Task 2: Streak + XP helpers (TDD)

**Files:**
- Create: `src/renderer/shared/progress/streak.ts`
- Test: `tests/unit/streak.test.ts`

**Interfaces:**
- Consumes: ISO date strings from `attempts.submittedAt`.
- Produces: `dayKey(iso: string): string`, `computeStreak(dayKeys: string[], todayKey: string): number`, `computeXP(correctCount: number): number`, `TARGET_BAND_KEY = 'ieltsPro.targetBand'` used by Task 4.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/streak.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { dayKey, computeStreak, computeXP, TARGET_BAND_KEY } from '../../src/renderer/shared/progress/streak';

describe('streak helpers', () => {
  it('dayKey extracts YYYY-MM-DD', () => expect(dayKey('2026-09-03T10:16:00.000Z')).toBe('2026-09-03'));
  it('counts consecutive days ending today', () => {
    expect(computeStreak(['2026-09-01', '2026-09-02', '2026-09-03'], '2026-09-03')).toBe(3);
  });
  it('allows yesterday-active streak (today not yet studied)', () => {
    expect(computeStreak(['2026-09-01', '2026-09-02'], '2026-09-03')).toBe(2);
  });
  it('breaks on a gap', () => {
    expect(computeStreak(['2026-08-30', '2026-09-02', '2026-09-03'], '2026-09-03')).toBe(2);
  });
  it('empty input is zero', () => expect(computeStreak([], '2026-09-03')).toBe(0));
  it('XP is 10 per correct answer', () => expect(computeXP(7)).toBe(70));
  it('XP never goes negative', () => {
    expect(computeXP(-5)).toBe(0);
    expect(computeXP(0)).toBe(0);
  });
  it('exposes target band key', () => expect(TARGET_BAND_KEY).toBe('ieltsPro.targetBand'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/streak.test.ts`
Expected: FAIL with "Failed to resolve import" (module does not exist yet).

- [ ] **Step 3: Write minimal implementation**

Create `src/renderer/shared/progress/streak.ts`:

```ts
export const TARGET_BAND_KEY = 'ieltsPro.targetBand';

export function dayKey(iso: string): string {
  return String(iso).slice(0, 10);
}

function prevDay(key: string): string {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function computeStreak(dayKeys: string[], todayKey: string): number {
  const set = new Set(dayKeys);
  let cursor = set.has(todayKey) ? todayKey : prevDay(todayKey);
  if (!set.has(cursor)) return 0;
  let n = 0;
  while (set.has(cursor)) {
    n += 1;
    cursor = prevDay(cursor);
  }
  return n;
}

export function computeXP(correctCount: number): number {
  return Math.max(0, Math.floor(correctCount)) * 10;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/streak.test.ts`
Expected: 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/shared/progress/streak.ts tests/unit/streak.test.ts
git commit -m "feat: streak and XP helpers with unit tests"
```

---

### Task 3: Coach sidebar shell

**Files:**
- Modify: `src/renderer/app/shell/Sidebar.tsx` (full replace)

**Interfaces:**
- Consumes: `computeStreak`, `dayKey` from Task 2 (reads attempts internally via `window.db`).
- Produces: same `data-testid="sidebar"` + `nav-*` ids; streak element `data-testid="streak-count"`.

- [ ] **Step 1: Write the new sidebar**

Replace the full content of `src/renderer/app/shell/Sidebar.tsx` with:

```tsx
import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { dayKey, computeStreak } from '../../shared/progress/streak';

// ponytail: emoji icons match the existing list-page pattern (no icon dep)
const nav = [
  { to: '/', label: 'Home', icon: '🏠', end: true },
  { to: '/reading', label: 'Reading', icon: '📖' },
  { to: '/listening', label: 'Listening', icon: '🎧' },
  { to: '/writing', label: 'Writing', icon: '✍️' },
  { to: '/speaking', label: 'Speaking', icon: '🎤' },
  { to: '/resources', label: 'Resources', icon: '📚' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function Sidebar(): JSX.Element {
  const [streak, setStreak] = useState(0);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const w = window as unknown as { db?: { query: (s: string, p?: unknown[]) => Promise<unknown[]> } };
        if (!w.db?.query) return;
        const rows = (await w.db.query('SELECT submittedAt FROM attempts', [])) as { submittedAt: string }[];
        if (cancelled) return;
        setAttempts(rows.length);
        setStreak(computeStreak(rows.map((r) => dayKey(String(r.submittedAt ?? ''))), todayKey()));
      } catch {
        // sidebar stats are best-effort; nav works without them
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-zinc-200 bg-white" data-testid="sidebar">
      <div className="border-b border-zinc-100 px-4 py-4">
        <div className="text-[15px] font-extrabold tracking-tight">IELTS Pro</div>
        <div className="mt-0.5 flex items-center gap-1.5 text-xs">
          <span className="rounded bg-emerald-600 px-1.5 py-0.5 font-bold text-white">FREE FOREVER</span>
          <span className="flex items-center gap-0.5 font-semibold text-amber-600" data-testid="streak-count" title="Study streak">
            🔥 {streak}
          </span>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive ? 'bg-ink text-white' : 'text-zinc-700 hover:bg-zinc-100'
              }`
            }
            data-testid={`nav-${item.label.toLowerCase()}`}
          >
            <span className="text-base leading-none">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-zinc-100 p-3">
        <div className="rounded-lg bg-emerald-50 p-2.5 text-xs leading-relaxed text-emerald-900">
          <div className="font-bold">100% free · offline</div>
          <div>{attempts} attempt(s) stored on this PC.</div>
        </div>
        <div className="mt-2 text-[10px] tracking-wide text-zinc-400">v1.0.0 · Electron 30</div>
      </div>
    </aside>
  );
}
```

Notes: `nav-import` id is dropped (Import stays reachable via Settings/Resources links); all other historic `nav-*` ids are preserved. The old `/import` route still exists in `App.tsx`.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.web.json`
Expected: PASS.

- [ ] **Step 3: Full unit suite**

Run: `npx vitest run tests/unit`
Expected: PASS (35 + 8 new = 43 tests).

- [ ] **Step 4: Manual check in dev server**

Run: `npm run dev`, open Home. Confirm sidebar shows FREE FOREVER badge, streak flame, icon nav; click each nav item.
Expected: all routes render, no console errors.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/app/shell/Sidebar.tsx
git commit -m "feat: coach sidebar with free identity, emoji icons, streak"
```

---

### Task 4: Coach home dashboard

**Files:**
- Modify: `src/renderer/shared/progress/Dashboard.tsx` (full rewrite)

**Interfaces:**
- Consumes: `dayKey`, `computeStreak`, `computeXP`, `TARGET_BAND_KEY` (Task 2); `weakAreas`, `bandTrends`, `paginate` + `AttemptRow` type from `./analytics` (existing); `useProgressStore` from `./store` (existing).
- Produces: `data-testid="dashboard-title"`, `band-chart`, `attempts-table`, plus new `continue-card`, `today-plan`, `xp-row`, `target-band-input`, `weak-practice-*` links. AttemptRow shape reused verbatim:
  `{ id, testId, mode, startedAt, submittedAt, rawScore, band, answers }`.

- [ ] **Step 1: Rewrite Dashboard as coach home**

Replace `Dashboard.tsx` content with a component that keeps the existing data-fetching effect verbatim (attempts query + weak-items computation, lines 100–161 of the current file) and renders:

1. Header row: `h1 data-testid="dashboard-title"` "Good day — let's study", target-band number input (`data-testid="target-band-input"`, min 0 max 9 step 0.5, localStorage `TARGET_BAND_KEY`, default 6.5).
2. `div data-testid="xp-row"`: streak flame 🔥 + days (`computeStreak` over attempt days), XP total (`computeXP` over correctly-answered stored questions — reuse the `weakItems` correct count; XP = correct × 10), attempts count.
3. `section data-testid="continue-card"`: latest attempt from `sortedForTable[0]` → "Continue with {testId}" link to `/{mode}/{testId}` when mode is reading/listening/writing/speaking; when no attempts, diagnostic CTA linking to the first Reading test (`/reading/reading-ieltsfever-1`): "New here? Take a 10-min diagnostic".
4. `section data-testid="today-plan"`: up to 3 items from `weak` (lowest accuracy first) → "Drill {qType}" linking to `/reading` (reading qTypes) or the matching skill list; plus one review item linking to the weakest skill list. Each item `data-testid="today-plan-item-{qType}"`.
5. Keep `BandChart` function and `trends-section` verbatim (restyle container to `bg-white shadow-card`).
6. Weak-area cards keep `weak-card-{qType}` ids; each gets a "Practice this" link `data-testid="weak-practice-{qType}"` to the owning skill list page.
7. Skill shortcuts row: four links (Reading/Listening/Writing/Speaking lists) with emoji icons (📖🎧✍️🎤) and live test counts from `tests` table (`SELECT kind, COUNT(*)`) — fallback to static 0 when DB missing.
8. Keep history table + pagination (`history-section`, `attempts-table`, `prev-page`, `next-page`, `page-indicator`) verbatim.

Styling: page wrapper `mx-auto max-w-6xl p-6`, cards `rounded-xl border border-zinc-200 bg-white p-4 shadow-card`, section titles `text-sm font-bold`.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.web.json`
Expected: PASS.

- [ ] **Step 3: Unit suite**

Run: `npx vitest run tests/unit`
Expected: PASS.

- [ ] **Step 4: Manual check**

Run: `npm run dev`. With seeded DB: confirm continue card, today plan (after completing a test), streak/XP row, chart, weak cards with practice links. With empty DB (fresh profile): confirm diagnostic CTA, no blank crashes.
Expected: no console errors; all links navigate.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/shared/progress/Dashboard.tsx
git commit -m "feat: coach home with continue, today plan, streak and XP"
```

---

### Task 5: Unified free practice libraries (restyle in place)

**Files:**
- Modify: `src/renderer/modules/listening/ListeningListPage.tsx` (full replace, keep `META`)
- Modify: `src/renderer/modules/writing/WritingListPage.tsx` (full replace)
- Modify: `src/renderer/modules/speaking/SpeakingListPage.tsx` (full replace)
- Modify: `src/renderer/modules/reading/ReadingListPage.tsx` (card-style alignment only)

**Interfaces:**
- Consumes: nothing new — same `TestRow` DB query per page (unchanged SQL), inline JSX below.
- Produces: identical `data-testid` values as today (`listening-list`, `listening-card-*`, `start-listening-*`, `listening-empty`, same for writing/speaking).

- [ ] **Step 1: Rewrite `ListeningListPage.tsx`**

Keep the `META` record verbatim. Replace the component with the free-library layout (search + cards). Full file:

```tsx
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

type TestRow = { id: string; kind: string; title: string; durationSec: number };

const META: Record<string, { badge: string; desc: string }> = {
  'listening-1': { badge: '4 Parts', desc: 'Everyday conversation → Lecture • 5 Qs • once-only' },
  'listening-2': { badge: '4 Parts', desc: 'Campus & Academic • 4 Qs • map & completion' },
};

export default function ListeningListPage(): JSX.Element {
  const [tests, setTests] = useState<TestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const w = window as unknown as { db?: { query: (s: string, p?: unknown[]) => Promise<unknown[]> } };
        if (!w.db?.query) return;
        const rows = (await w.db.query("SELECT * FROM tests WHERE kind='listening' ORDER BY title")) as TestRow[];
        if (!cancelled) setTests(rows);
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return tests;
    return tests.filter((t) =>
      `${t.title} ${t.id} ${(META[t.id]?.desc ?? '')}`.toLowerCase().includes(needle),
    );
  }, [tests, q]);
  if (loading) return <div className="p-8 text-sm">Loading listening tests…</div>;
  return (
    <div className="mx-auto max-w-5xl p-6" data-testid="listening-list">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-xl text-white">🎧</span>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Listening</h1>
          <p className="mt-0.5 text-sm text-zinc-500">30 min + 10 min transfer · audio plays once in mock · <span className="font-semibold text-emerald-700">Free</span></p>
        </div>
      </div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search listening tests…"
        className="mt-5 w-full rounded-full border border-zinc-200 bg-white py-2.5 px-4 text-sm outline-none placeholder:text-zinc-400 focus:border-emerald-500"
      />
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {filtered.map((t) => {
          const m = META[t.id] ?? { badge: 'Listening', desc: `${Math.round(t.durationSec / 60)} min` };
          return (
            <div key={t.id} className="flex flex-col rounded-xl border border-zinc-200 bg-white p-5 shadow-card" data-testid={`listening-card-${t.id}`}>
              <div className="flex items-center justify-between"><span className="text-xl">🎧</span><span className="rounded bg-ink px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">{m.badge}</span></div>
              <div className="mt-3 text-sm font-bold">{t.title}</div>
              <div className="mt-1 text-xs text-zinc-500">{m.desc}</div>
              <div className="mt-1 text-xs text-zinc-400">{Math.round(t.durationSec / 60)} min · free forever</div>
              <Link to={`/listening/${t.id}`} className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-center text-sm font-bold text-white hover:bg-emerald-700" data-testid={`start-listening-${t.id}`}>Practice free →</Link>
            </div>
          );
        })}
      </div>
      {filtered.length === 0 && <div className="mt-6 rounded-xl border border-dashed bg-white p-8 text-center text-sm text-zinc-500" data-testid="listening-empty">{tests.length === 0 ? 'No listening tests. Import or restart to seed.' : 'No tests match your search.'}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Rewrite `WritingListPage.tsx`** — same structure as Step 1 with these exact substitutions: skill `writing`; header icon `✍️`; title `Writing`; subtitle `60 min · Task 1 + Task 2 · AI feedback included free · Free`; search placeholder `Search writing tests…`; no `META` record — badge is `t.id.includes('writing-a') ? 'Academic' : 'General'` and desc is `Task 1 + Task 2 · live word count · auto-save`; card icon `✍️`; testids `writing-list`, `writing-card-${t.id}`, `start-writing-${t.id}`, `writing-empty`; empty text `No writing tests. Import or restart to seed.`; SQL `WHERE kind='writing'`; link base `/writing`; loading text `Loading writing tests…`.

- [ ] **Step 3: Rewrite `SpeakingListPage.tsx`** — same structure as Step 1 with these exact substitutions: skill `speaking`; header icon `🎤`; title `Speaking`; subtitle `11–14 min · Parts 1–3 · mic required · Free`; search placeholder `Search speaking tests…`; no `META` record — badge is always `11-14 min` and desc is `Part 1 intro · Part 2 cue card · Part 3 discussion`; card icon `🎤`; testids `speaking-list`, `speaking-card-${t.id}`, `start-speaking-${t.id}`, `speaking-empty`; empty text `No speaking tests. Import or restart to seed.`; SQL `WHERE kind='speaking'`; link base `/speaking`; loading text `Loading speaking tests…`.

- [ ] **Step 4: Align Reading cards (no logic change)**

In `ReadingListPage.tsx`, change the card container class `shadow-sm` → `shadow-card` and the primary button `bg-red-600 hover:bg-red-700` → `bg-emerald-600 hover:bg-emerald-700`. Do not touch search/chips/category logic.

- [ ] **Step 5: Typecheck + unit suite**

Run: `npx tsc --noEmit -p tsconfig.web.json` → PASS.
Run: `npx vitest run tests/unit` → PASS.

- [ ] **Step 6: Manual check**

Run: `npm run dev`; visit `/listening`, `/writing`, `/speaking`. Confirm search filters cards, empty states show, Start links navigate to players.
Expected: no console errors.

- [ ] **Step 7: Commit**

```bash
git add src/renderer/modules/listening/ListeningListPage.tsx src/renderer/modules/writing/WritingListPage.tsx src/renderer/modules/speaking/SpeakingListPage.tsx src/renderer/modules/reading/ReadingListPage.tsx
git commit -m "feat: unified free practice libraries for listening, writing, speaking"
```

---

### Task 6: Consistent exam players + free strip

**Files:**
- Modify: `src/renderer/modules/listening/ListeningPage.tsx` (header lines 230-244)
- Modify: `src/renderer/modules/writing/WritingEditor.tsx` (header lines 249-264)
- Modify: `src/renderer/modules/speaking/SpeakingPage.tsx` (header lines 410-415)
- Modify: `src/renderer/modules/reading/ReadingPage.tsx` (promo banner ~line 371-379)

**Interfaces:**
- Consumes: nothing new — inline header JSX below, `useTimer` `formatted` strings pass through unchanged. All submit handlers unchanged.
- Produces: same `timer` / `submit-btn` / `score-banner` / `parts-nav` / `audio-bar` ids.

- [ ] **Step 1: Listening header restyle in place**

In `ListeningPage.tsx`, add `import { useNavigate } from 'react-router-dom';` and `const navigate = useNavigate();` next to the existing `useParams` line. Replace the `<header ...>...</header>` block (lines 230-244) with:

```tsx
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
```

- [ ] **Step 2: Writing header restyle in place**

In `WritingEditor.tsx`, ensure `useNavigate` is imported (add `import { useNavigate } from 'react-router-dom';` and `const navigate = useNavigate();` if absent — verify against the file top before editing). Replace its `<header ...>...</header>` (lines 249-264) with:

```tsx
<header className="flex h-12 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4">
  <div className="flex min-w-0 items-center gap-2">
    <button onClick={() => navigate('/writing')} className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-50" title="Exit test">
      ← Exit
    </button>
    <h1 className="truncate text-sm font-bold text-zinc-800">Writing — {testId}</h1>
  </div>
  <div className="flex items-center gap-3">
    <span className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1 font-mono text-sm font-bold tabular-nums" data-testid="timer">
      {formatted}
    </span>
    <button onClick={handleSubmit} disabled={!!result || submitting} data-testid="submit-btn" className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
      {result ? 'Submitted' : submitting ? 'Scoring…' : queued ? 'Queued' : 'Submit'}
    </button>
  </div>
</header>
```

Keep the queued/error/score banners below it exactly as they are.

- [ ] **Step 3: Speaking header restyle in place**

Replace lines 410-415 of `SpeakingPage.tsx` with:

```tsx
<header className="flex h-12 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4">
  <div className="flex min-w-0 items-center gap-2">
    <button onClick={() => navigate('/speaking')} className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-50" title="Exit test">
      ← Exit
    </button>
    <h1 className="truncate text-sm font-bold text-zinc-800">Speaking — {testId}</h1>
  </div>
  <span className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-600">
    11–14 min mock · per-question recording
  </span>
</header>
```

Ensure `useNavigate` is imported in `SpeakingPage.tsx` (add the import and `const navigate = useNavigate();` if absent — verify against the file top before editing).

- [ ] **Step 4: Reading free strip**

In `ReadingPage.tsx`, replace the red promo banner block:

```tsx
<div className="flex h-8 shrink-0 items-center justify-center bg-[#C1272D] px-4 text-center text-[13px] font-semibold text-white">
  <span className="mr-1">🔥</span>
  <span>
    Today Only: Save 30% on Premium — Offer Ends Soon! - <span className="underline">Upgrade Now!</span>
  </span>
</div>
```

with:

```tsx
<div className="flex h-8 shrink-0 items-center justify-center bg-emerald-600 px-4 text-center text-[13px] font-semibold text-white">
  <span>✓ 100% free — full test, instant checking, no account needed</span>
</div>
```

Also change the title-bar `bg-[#FDF2F2]` → `bg-white` and `border-red-100` → `border-zinc-200` on the same file's title bar div.

- [ ] **Step 5: Typecheck + unit suite**

Run: `npx tsc --noEmit -p tsconfig.web.json` → PASS.
Run: `npx vitest run tests/unit` → PASS.

- [ ] **Step 6: Manual check**

Run: `npm run dev`; open one test per skill, confirm header shows Exit + title + timer + green submit, submit flow + review still work, audio single-play lock intact, mic selector intact.
Expected: no console errors.

- [ ] **Step 7: Commit**

```bash
git add src/renderer/modules/listening/ListeningPage.tsx src/renderer/modules/writing/WritingEditor.tsx src/renderer/modules/speaking/SpeakingPage.tsx src/renderer/modules/reading/ReadingPage.tsx
git commit -m "feat: consistent exam headers and free strip across players"
```

---

### Task 7: Verification (no new test files)

**Files:** none (verification only).

- [ ] **Step 1: Full verification**

Run: `npx tsc --noEmit -p tsconfig.web.json` → PASS.
Run: `npx vitest run tests/unit` → all files PASS (35 existing + 8 streak = 43).

- [ ] **Step 2: Manual end-to-end checklist in dev server**

Run: `npm run dev` and walk: Home (badges, streak, continue, plan, chart, weak links) → each library (search, cards, start) → each player (exit, timer, submit, review) → back Home (attempt recorded, streak/XP updated).
Expected: zero console errors, zero premium copy (`grep -ri "premium\|upgrade now\|paywall" src/renderer` returns nothing).

- [ ] **Step 3: Commit the verification as an empty allowlist check**

No code changes expected. If the walk surfaces only trivial copy nits, fix inline in this task and commit:

```bash
git add -u
git commit -m "chore: free-coach verification fixes" --allow-empty
```

ponytail: no new `freeCoach.test.ts` — streak invariants live in `streak.test.ts` (Task 2) and seed coverage in `reading.test.ts`; a third file asserting the same would be boilerplate. Add one only when an invariant has no home.

---

## Self-review (run by plan author)

- **Spec coverage:** §1 tokens (no deps per ponytail) → Task 1; streak/XP math (§3) → Task 2; §2 shell → Task 3; §3 home → Task 4; §4 libraries → Task 5 (Reading filters explicitly preserved); §5 players → Task 6 (Engnovate Reading kept, free strip replaces promo); §6 data/errors/tests → Tasks 2/7, no schema change anywhere.
- **Placeholder scan:** no TBD/TODO; every code step ships exact code; Task 4's rewrite brief is explicit about which blocks stay verbatim and which ids must survive. The two "verify import first" notes (Writing/Speaking `useNavigate`) are concrete file-top checks, not open questions.
- **Type consistency:** inline `TestRow` shape matches the existing selects in all three list pages; header snippets match all three call sites (`formatted`, `handleSubmit`, `testId` all exist); `TARGET_BAND_KEY` string is identical in Task 2 and Task 4; testid strings match current files.
