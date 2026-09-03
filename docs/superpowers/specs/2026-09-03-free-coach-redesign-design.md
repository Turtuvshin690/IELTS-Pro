# Free Coach Redesign — Design Spec

Date: 2026-09-03
Status: Approved (all 6 sections approved 2026-09-03)
Scope: Full app visual reconstruction, approach A "Free Coach system"
Vibe: Coach dashboard. Everything at once. New libraries allowed.

## 1. Design system + libraries

- Tokens: paper `#FAFAF7`, ink `#18181B`, accent emerald-600 (free/go), amber for
  streaks, red reserved for timers/errors. Borders zinc-200, radius 12px cards.
- Type: system sans everywhere; Georgia serif only for passage/essay reading surfaces.
- New deps: `lucide-react` (icons), `framer-motion` (page fade, staggered cards,
  spring press states). No recharts: upgrade the existing SVG `BandChart`.
- Stays on Tailwind v3. No CSS framework migration. No global CSS rewrite.

## 2. App shell + navigation

- Replace gray sidebar with coach shell: "IELTS Pro — Free forever" wordmark,
  streak flame with day count, icon nav (Home, BookOpen Reading, Headphones
  Listening, PenLine Writing, Mic Speaking, Library Resources, Settings).
- Bottom card: "100% free · offline · N attempts stored locally".
- Remove premium/upgrade wording app-wide, including the red promo banner on the
  Reading page (becomes a free-practice strip).
- Routes unchanged (`/`, `/reading`, `/reading/:testId`, `/listening`,
  `/listening/:testId`, `/writing`, `/writing/:testId`, `/speaking`,
  `/speaking/:testId`, `/resources`, `/import`, `/settings`).
- Keep `data-testid="sidebar"` and `nav-*` ids as aliases.

## 3. Coach home (the "free" feeling)

- Header: greeting + target-band setter persisted to localStorage key
  `ieltsPro.targetBand` (number 0–9, default 6.5).
- "Continue learning" card: resumes last attempted test (from `attempts` table).
- "Today's plan": 3 drills derived from weakest qTypes via `weakAreas()` plus one
  review item. Each links to a filtered library or specific test.
- Streak + XP row: XP = 10 per correct answer computed from stored answers;
  streak = consecutive active days from `submittedAt`. Pure derivation, no schema.
- Band-trend SVG chart (existing component, restyled), weak-area cards with
  "Practice this" deep links, skill shortcut cards with test counts.
- New-user empty state: "Take a 10-min diagnostic" CTA linking to the first Reading
  test in the library, never a blank table.

## 4. Skill libraries (unified)

- One `PracticeLibrary` pattern for Reading/Listening/Writing/Speaking: search,
  question-type chips, level filter; cards show skill icon, question count,
  estimated minutes, best band, attempts count, "Practice free" primary action.
- Keep the Engnovate-style Reading filters; extend the same pattern to the other
  three skills so the app feels like one product.

## 5. Test players (consistent exam mode)

- Keep the Engnovate Reading split-pane (matches the real computer test).
- Align Listening/Writing/Speaking to the same chrome: slim header (exit, title,
  timer pill `data-testid="timer"`, Finish), instruction strip, work area, bottom
  question palette (answered/flagged/review), post-submit per-question review.
- No database schema changes. Same `attempts`/`questions` tables and scoring.

## 6. Data flow, errors, testing

- Data: `window.db` SQLite (WAL) + Zustand store, local-only. Auto-save drafts,
  offline queue for AI scoring. No cloud sync, no new tables.
- States: skeleton loaders, inline error cards (no `alert`), empty states with
  CTAs, visible focus rings, smooth scrolling, transform-only animations.
- Tests: all 35 existing unit tests stay green. Add shell/home smoke tests. Keep
  `data-testid` hooks: `sidebar`, `dashboard-title`, `timer`, `question-item-*`,
  `attempts-table`, `band-chart`.

## Non-goals

- No vocab SRS deck, no daily-plan generator service, no full-mock simulator,
  no onboarding wizard (deferred to a follow-up spec).
- No paywall, no accounts, no analytics beacons, no network calls for core flows.
