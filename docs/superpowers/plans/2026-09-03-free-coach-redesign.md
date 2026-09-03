# Free Coach Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild IELTS Pro's UI into a "Free Coach" study app (new shell, coach home, unified libraries, consistent exam players) with zero database changes.

**Architecture:** Phased visual reconstruction — each task leaves the app compiling and all 35 existing unit tests green. Pure logic (streak/XP) is TDD unit-tested; components are typechecked plus manually verified in the dev server. No new DB tables, no route changes, no scoring changes.

**Tech Stack:** React 18 + Tailwind v3 (existing), new: `lucide-react` (icons), `framer-motion` (motion). Charts stay hand-rolled SVG. Electron 30, vitest 1.6.1 (node env, `tests/unit/**/*.test.ts`).

## Global Constraints

- No database schema changes — `attempts` / `questions` / `tests` / `sections` / `passages` tables untouched.
- All 35 existing unit tests must stay green after every task.
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
- `src/renderer/shared/library/PracticeLibrary.tsx` — generic skill-library UI (search + chips + cards). Props-driven, owns no fetching.
- `src/renderer/shared/exam/ExamHeader.tsx` — slim exam-mode header (exit, title, timer pill, submit). Owns no timer logic; receives `formatted` string.

Modified files:

- `package.json` — add `lucide-react`, `framer-motion`.
- `tailwind.config.js` — paper/ink/accent tokens.
- `src/renderer/index.css` — paper background, focus ring, smooth scroll.
- `src/renderer/App.tsx` — paper shell + page fade wrapper.
- `src/renderer/app/shell/Sidebar.tsx` — coach nav rewrite (full file replace, 47 lines).
- `src/renderer/shared/progress/Dashboard.tsx` — coach home rewrite (uses `streak.ts` + existing `analytics.ts` exports `weakAreas`, `bandTrends`, `paginate`).
- `src/renderer/modules/listening/ListeningListPage.tsx` — migrate to `PracticeLibrary`.
- `src/renderer/modules/writing/WritingListPage.tsx` — migrate to `PracticeLibrary`.
- `src/renderer/modules/speaking/SpeakingListPage.tsx` — migrate to `PracticeLibrary`.
- `src/renderer/modules/reading/ReadingListPage.tsx` — card-style alignment only; its search/chips/category logic stays.
- `src/renderer/modules/listening/ListeningPage.tsx` — header swap to `ExamHeader` (lines 230-244).
- `src/renderer/modules/writing/WritingEditor.tsx` — header swap to `ExamHeader` (lines 249-264).
- `src/renderer/modules/speaking/SpeakingPage.tsx` — header restyle in place (lines 410-415, no timer there; keep device selector).
- `src/renderer/modules/reading/ReadingPage.tsx` — red promo banner (line ~373) becomes free-practice strip.

---

### Task 1: Dependencies + theme tokens

**Files:**
- Modify: `package.json`
- Modify: `tailwind.config.js`
- Modify: `src/renderer/index.css`
- Modify: `src/renderer/App.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `paper` / `ink` Tailwind colors and `bg-paper text-ink` shell classes used by Tasks 3–7.

- [ ] **Step 1: Install libraries**

```bash
npm i lucide-react framer-motion
```

- [ ] **Step 2: Run typecheck baseline to confirm green start**

Run: `npx tsc --noEmit -p tsconfig.web.json`
Expected: PASS (no output).

- [ ] **Step 3: Extend Tailwind tokens**

Replace `tailwind.config.js` theme block with:

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

- [ ] **Step 4: Base styles in `src/renderer/index.css`**

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

- [ ] **Step 5: Paper shell + page fade in `src/renderer/App.tsx`**

Replace lines 16–38 (`export default function App...`) with:

```tsx
import { motion } from 'framer-motion';

export default function App(): JSX.Element {
  return (
    <HashRouter>
      <div className="flex h-screen bg-paper text-ink">
        <Sidebar />
        <motion.main
          className="flex-1 overflow-auto bg-paper"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.18 }}
        >
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/import" element={<ImportPage />} />
            <Route path="/resources" element={<ResourcesPage />} />
            <Route path="/reading" element={<ReadingListPage />} />
            <Route path="/reading/:testId" element={<ReadingPage />} />
            <Route path="/listening" element={<ListeningListPage />} />
            <Route path="/listening/:testId" element={<ListeningPage />} />
            <Route path="/writing" element={<WritingListPage />} />
            <Route path="/writing/:testId" element={<WritingEditor />} />
            <Route path="/speaking" element={<SpeakingListPage />} />
            <Route path="/speaking/:testId" element={<SpeakingPage />} />
          </Routes>
        </motion.main>
      </div>
    </HashRouter>
  );
}
```

Keep all existing imports and add `import { motion } from 'framer-motion';`.

- [ ] **Step 6: Verify typecheck + full unit suite**

Run: `npx tsc --noEmit -p tsconfig.web.json`
Expected: PASS.

Run: `npx vitest run tests/unit`
Expected: 14 files / 35 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json tailwind.config.js src/renderer/index.css src/renderer/App.tsx
git commit -m "feat: free-coach theme tokens, paper shell, motion + icons deps"
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
Expected: 7 tests PASS.

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
import {
  LayoutDashboard,
  BookOpen,
  Headphones,
  PenLine,
  Mic,
  Library,
  Settings,
  Flame,
} from 'lucide-react';
import { dayKey, computeStreak } from '../../shared/progress/streak';

const nav = [
  { to: '/', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/reading', label: 'Reading', icon: BookOpen },
  { to: '/listening', label: 'Listening', icon: Headphones },
  { to: '/writing', label: 'Writing', icon: PenLine },
  { to: '/speaking', label: 'Speaking', icon: Mic },
  { to: '/resources', label: 'Resources', icon: Library },
  { to: '/settings', label: 'Settings', icon: Settings },
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
            <Flame size={13} /> {streak}
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
            <item.icon size={16} />
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
    </asible>
  );
}
```

Notes: `nav-import` id is dropped (Import stays reachable via Settings/Resources links); all other historic `nav-*` ids are preserved. The old `/import` route still exists in `App.tsx`.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.web.json`
Expected: PASS.

- [ ] **Step 3: Full unit suite**

Run: `npx vitest run tests/unit`
Expected: PASS (35 + 7 new = 42 tests).

- [ ] **Step 4: Manual check in dev server**

Run: `npm run dev`, open Home. Confirm sidebar shows FREE FOREVER badge, streak flame, icon nav; click each nav item.
Expected: all routes render, no console errors.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/app/shell/Sidebar.tsx
git commit -m "feat: coach sidebar with free identity, icons, streak"
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
2. `div data-testid="xp-row"`: streak flame + days, XP total (`computeXP` over correctly-answered stored questions — reuse the `weakItems` correct count; XP = correct × 10), attempts count.
3. `section data-testid="continue-card"`: latest attempt from `sortedForTable[0]` → "Continue with {testId}" link to `/{mode}/{testId}` when mode is reading/listening/writing/speaking; when no attempts, diagnostic CTA linking to the first Reading test (`/reading/reading-ieltsfever-1`): "New here? Take a 10-min diagnostic".
4. `section data-testid="today-plan"`: up to 3 items from `weak` (lowest accuracy first) → "Drill {qType}" linking to `/reading` (reading qTypes) or the matching skill list; plus one review item linking to the weakest skill list. Each item `data-testid="today-plan-item-{qType}"`.
5. Keep `BandChart` function and `trends-section` verbatim (restyle container to `bg-white shadow-card`).
6. Weak-area cards keep `weak-card-{qType}` ids; each gets a "Practice this" link `data-testid="weak-practice-{qType}"` to the owning skill list page.
7. Skill shortcuts row: four links (Reading/Listening/Writing/Speaking lists) with lucide icons and live test counts from `tests` table (`SELECT kind, COUNT(*)`) — fallback to static 0 when DB missing.
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

### Task 5: Shared PracticeLibrary + ExamHeader

**Files:**
- Create: `src/renderer/shared/library/PracticeLibrary.tsx`
- Create: `src/renderer/shared/exam/ExamHeader.tsx`

**Interfaces:**
- Consumes: `TestRow = { id: string; kind: string; title: string; durationSec: number }` (same shape all four list pages already query).
- Produces: `PracticeLibrary` props `{ skill: 'listening'|'writing'|'speaking', title, subtitle, icon: LucideIcon, tests: TestRow[], meta: (t: TestRow) => { badge: string; desc: string }, basePath: string }` preserving per-skill testids; `ExamHeader` props `{ title: string; formatted: string; submitLabel: string; submitDisabled?: boolean; onSubmit: () => void; onExit: () => void; submitTestId?: string }` preserving `timer` + `submit-btn` ids.

- [ ] **Step 1: Create `PracticeLibrary.tsx`**

```tsx
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Clock3 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type LibraryTest = { id: string; kind: string; title: string; durationSec: number };

type Props = {
  skill: 'listening' | 'writing' | 'speaking';
  title: string;
  subtitle: string;
  icon: LucideIcon;
  tests: LibraryTest[];
  meta: (t: LibraryTest) => { badge: string; desc: string };
  basePath: string;
  emptyHint: string;
};

export default function PracticeLibrary({ skill, title, subtitle, icon: Icon, tests, meta, basePath, emptyHint }: Props): JSX.Element {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return tests;
    return tests.filter((t) => `${t.title} ${t.id} ${meta(t).desc}`.toLowerCase().includes(needle));
  }, [tests, q, meta]);

  return (
    <div className="mx-auto max-w-5xl p-6" data-testid={`${skill}-list`}>
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white">
          <Icon size={18} />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
          <p className="mt-0.5 text-sm text-zinc-500">{subtitle} · <span className="font-semibold text-emerald-700">Free</span></p>
        </div>
      </div>
      <div className="relative mt-5">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search ${title.toLowerCase()} tests…`}
          className="w-full rounded-full border border-zinc-200 bg-white py-2.5 pl-9 pr-4 text-sm outline-none placeholder:text-zinc-400 focus:border-emerald-500"
        />
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {filtered.map((t) => {
          const m = meta(t);
          return (
            <div key={t.id} className="flex flex-col rounded-xl border border-zinc-200 bg-white p-5 shadow-card" data-testid={`${skill}-card-${t.id}`}>
              <div className="flex items-center justify-between">
                <Icon size={20} className="text-zinc-400" />
                <span className="rounded bg-ink px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">{m.badge}</span>
              </div>
              <div className="mt-3 text-sm font-bold">{t.title}</div>
              <div className="mt-1 text-xs text-zinc-500">{m.desc}</div>
              <div className="mt-1 flex items-center gap-1 text-xs text-zinc-400">
                <Clock3 size={12} /> {Math.round(t.durationSec / 60)} min · free forever
              </div>
              <Link to={`${basePath}/${t.id}`} className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-center text-sm font-bold text-white hover:bg-emerald-700" data-testid={`start-${skill}-${t.id}`}>
                Practice free →
              </Link>
            </div>
          );
        })}
      </div>
      {filtered.length === 0 && (
        <div className="mt-6 rounded-xl border border-dashed bg-white p-8 text-center text-sm text-zinc-500" data-testid={`${skill}-empty`}>
          {tests.length === 0 ? emptyHint : 'No tests match your search.'}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `ExamHeader.tsx`**

```tsx
type Props = {
  title: string;
  formatted: string;
  submitLabel: string;
  submitDisabled?: boolean;
  onSubmit: () => void;
  onExit: () => void;
  submitTestId?: string;
};

export default function ExamHeader({ title, formatted, submitLabel, submitDisabled, onSubmit, onExit, submitTestId }: Props): JSX.Element {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4">
      <div className="flex min-w-0 items-center gap-2">
        <button onClick={onExit} className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-50" title="Exit test">
          ← Exit
        </button>
        <h1 className="truncate text-sm font-bold text-zinc-800">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <span className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1 font-mono text-sm font-bold tabular-nums" data-testid="timer">
          {formatted}
        </span>
        <button
          onClick={onSubmit}
          disabled={submitDisabled}
          data-testid={submitTestId}
          className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {submitLabel}
        </button>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.web.json`
Expected: PASS (unused until Task 6/7 — that is intended, not a placeholder).

- [ ] **Step 4: Unit suite**

Run: `npx vitest run tests/unit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/shared/library/PracticeLibrary.tsx src/renderer/shared/exam/ExamHeader.tsx
git commit -m "feat: shared practice library and exam header components"
```

---

### Task 6: Migrate Listening / Writing / Speaking libraries

**Files:**
- Modify: `src/renderer/modules/listening/ListeningListPage.tsx` (full replace, keep `META`)
- Modify: `src/renderer/modules/writing/WritingListPage.tsx` (full replace)
- Modify: `src/renderer/modules/reading/ReadingListPage.tsx` (card-style alignment only)

**Interfaces:**
- Consumes: `PracticeLibrary` + `LibraryTest` (Task 5). Same `TestRow` DB query per page (unchanged SQL).
- Produces: identical `data-testid` values as today (`listening-list`, `listening-card-*`, `start-listening-*`, `listening-empty`, same for writing/speaking).

- [ ] **Step 1: Rewrite `ListeningListPage.tsx`**

Keep the `META` record verbatim. Replace the component with:

```tsx
import { useEffect, useState } from 'react';
import { Headphones } from 'lucide-react';
import PracticeLibrary, { LibraryTest } from '../../shared/library/PracticeLibrary';
import { META } from './listeningMeta';
```

No — do not create a new meta file (YAGNI). Instead keep `META` in the same file and pass an inline `meta` callback:

```tsx
import { useEffect, useState } from 'react';
import { Headphones } from 'lucide-react';
import PracticeLibrary, { LibraryTest } from '../../shared/library/PracticeLibrary';

const META: Record<string, { badge: string; desc: string }> = {
  'listening-1': { badge: '4 Parts', desc: 'Everyday conversation → Lecture • 5 Qs • once-only' },
  'listening-2': { badge: '4 Parts', desc: 'Campus & Academic • 4 Qs • map & completion' },
};

export default function ListeningListPage(): JSX.Element {
  const [tests, setTests] = useState<LibraryTest[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const w = window as unknown as { db?: { query: (s: string, p?: unknown[]) => Promise<unknown[]> } };
        if (!w.db?.query) return;
        const rows = (await w.db.query("SELECT * FROM tests WHERE kind='listening' ORDER BY title")) as LibraryTest[];
        if (!cancelled) setTests(rows);
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);
  if (loading) return <div className="p-8 text-sm">Loading listening tests…</div>;
  return (
    <PracticeLibrary
      skill="listening"
      title="Listening"
      subtitle="30 min + 10 min transfer · audio plays once in mock"
      icon={Headphones}
      tests={tests}
      basePath="/listening"
      emptyHint="No listening tests. Import or restart to seed."
      meta={(t) => META[t.id] ?? { badge: 'Listening', desc: `${Math.round(t.durationSec / 60)} min` }}
    />
  );
}
```

- [ ] **Step 2: Rewrite `WritingListPage.tsx`** — same shape with `PenLine` icon, `skill="writing"`, `basePath="/writing"`, subtitle `60 min · Task 1 + Task 2 · AI feedback included free`, meta `(t) => ({ badge: t.id.includes('writing-a') ? 'Academic' : 'General', desc: 'Task 1 + Task 2 · live word count · auto-save' })`, emptyHint `No writing tests. Import or restart to seed.`

- [ ] **Step 3: Rewrite `SpeakingListPage.tsx`** — same shape with `Mic` icon, `skill="speaking"`, `basePath="/speaking"`, subtitle `11–14 min · Parts 1–3 · mic required`, meta `() => ({ badge: '11-14 min', desc: 'Part 1 intro · Part 2 cue card · Part 3 discussion' })`, emptyHint `No speaking tests. Import or restart to seed.`

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

### Task 7: Consistent exam players + free strip

**Files:**
- Modify: `src/renderer/modules/listening/ListeningPage.tsx` (header lines 230-244)
- Modify: `src/renderer/modules/writing/WritingEditor.tsx` (header lines 249-264)
- Modify: `src/renderer/modules/speaking/SpeakingPage.tsx` (header lines 410-415)
- Modify: `src/renderer/modules/reading/ReadingPage.tsx` (promo banner ~line 371-379)

**Interfaces:**
- Consumes: `ExamHeader` (Task 5). `useTimer` `formatted` strings pass through unchanged. All submit handlers unchanged.
- Produces: same `timer` / `submit-btn` / `score-banner` / `parts-nav` / `audio-bar` ids.

- [ ] **Step 1: Listening header → ExamHeader**

In `ListeningPage.tsx`, add imports:

```tsx
import { useNavigate } from 'react-router-dom';
import ExamHeader from '../../shared/exam/ExamHeader';
```

Add `const navigate = useNavigate();` next to the existing `useParams` line. Replace the `<header ...>...</header>` block (lines 230-244) with:

```tsx
<ExamHeader
  title={`Listening — ${testId}`}
  formatted={formatted}
  submitLabel={submitted ? 'Submitted' : 'Submit'}
  submitDisabled={!!submitted}
  onSubmit={handleSubmit}
  onExit={() => navigate('/listening')}
/>
```

- [ ] **Step 2: Writing header → ExamHeader**

In `WritingEditor.tsx`, add the same two imports; it already imports `useNavigate`? Check the file top — if missing, add it. Replace its `<header ...>...</header>` (lines 249-264) with:

```tsx
<ExamHeader
  title={`Writing — ${testId}`}
  formatted={formatted}
  submitLabel={result ? 'Submitted' : submitting ? 'Scoring…' : queued ? 'Queued' : 'Submit'}
  submitDisabled={!!result || submitting}
  onSubmit={handleSubmit}
  onExit={() => navigate('/writing')}
  submitTestId="submit-btn"
/>
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

Ensure `useNavigate` is imported in `SpeakingPage.tsx` (add `import { useNavigate } from 'react-router-dom';` and `const navigate = useNavigate();` if absent — verify against the file top before editing).

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

### Task 8: Verification + smoke coverage

**Files:**
- Test: `tests/unit/freeCoach.test.ts` (new — asserts spec invariants that are cheap in node)

**Interfaces:**
- Consumes: `streak.ts` helpers, `DEMO_TESTS` seed (existing `src/lib/db/seed` export used by `reading.test.ts`).
- Produces: regression net proving free-app invariants hold.

- [ ] **Step 1: Write invariant tests**

Create `tests/unit/freeCoach.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { computeStreak, computeXP } from '../../src/renderer/shared/progress/streak';

describe('free-coach invariants', () => {
  it('streak derives from stored days only (no network)', () => {
    expect(computeStreak(['2026-09-02', '2026-09-03'], '2026-09-03')).toBe(2);
  });
  it('XP never goes negative', () => {
    expect(computeXP(-5)).toBe(0);
    expect(computeXP(0)).toBe(0);
  });
  it('seed still provides practicable tests for all four skills', async () => {
    const { DEMO_TESTS } = await import('../../src/lib/db/seed');
    for (const kind of ['reading', 'listening', 'writing', 'speaking'] as const) {
      const tests = DEMO_TESTS.tests.filter((t) => t.kind === kind);
      expect(tests.length, `skill ${kind} should have seeded tests`).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run new tests**

Run: `npx vitest run tests/unit/freeCoach.test.ts`
Expected: 3 tests PASS. (If the seed export name differs, read `src/lib/db/seed.ts` top-level export and fix the import — the existing `reading.test.ts` uses `DEMO_TESTS.tests`? It uses `DEMO_TESTS.sections` and `DEMO_TESTS.questions`; verify `tests` array exists before running.)

- [ ] **Step 3: Full verification**

Run: `npx tsc --noEmit -p tsconfig.web.json` → PASS.
Run: `npx vitest run tests/unit` → all files PASS (was 35, now 35 + 7 + 3 = 45).

- [ ] **Step 4: Manual end-to-end checklist in dev server**

Run: `npm run dev` and walk: Home (badges, streak, continue, plan, chart, weak links) → each library (search, cards, start) → each player (exit, timer, submit, review) → back Home (attempt recorded, streak/XP updated).
Expected: zero console errors, zero premium copy (`grep -ri "premium\|upgrade now\|paywall" src/renderer` returns nothing).

- [ ] **Step 5: Commit**

```bash
git add tests/unit/freeCoach.test.ts
git commit -m "test: free-coach invariants and seed coverage"
```

---

## Self-review (run by plan author)

- **Spec coverage:** §1 tokens/deps → Task 1; streak/XP math (§3) → Task 2; §2 shell → Task 3; §3 home → Task 4; §4 libraries → Tasks 5–6 (Reading filters explicitly preserved); §5 players → Task 7 (Engnovate Reading kept, free strip replaces promo); §6 data/errors/tests → Tasks 2/8, no schema change anywhere.
- **Placeholder scan:** no TBD/TODO; every code step ships exact code; Task 4's rewrite brief is explicit about which blocks stay verbatim and which ids must survive. The two "verify import first" notes (Writing `useNavigate`, seed `tests` export) are concrete file-top checks, not open questions.
- **Type consistency:** `LibraryTest` shape matches the existing `TestRow` selects; `ExamHeader` props match all three call sites; `TARGET_BAND_KEY` string is identical in Task 2 and Task 4; testid strings match current files.
