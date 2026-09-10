import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

type TestRow = { id: string; kind: string; title: string; durationSec: number };

// Engnovate-style categories — map our local tests
type CategoryId = 'all' | 'cambridge-academic' | 'cambridge-general' | 'ielts-fever' | 'official' | 'forecast';

const CATEGORY_META: Record<CategoryId, { label: string; starred?: boolean; desc: string }> = {
  'all': { label: 'All', desc: 'Select a category, search by keyword, or filter by question type.' },
  'cambridge-academic': { label: 'Cambridge Academic', starred: true, desc: 'Authentic past papers from Cambridge — the most reliable way to practice. Closest to the real Academic exam in format, logic and difficulty.' },
  'cambridge-general': { label: 'Cambridge General', starred: true, desc: 'Authentic General Training papers — best for true exam experience in GT format.' },
  'ielts-fever': { label: 'IELTS Fever Academic', starred: false, desc: 'IELTS Fever Test 1 — 40 Qs from scanned PDF with verified answer key. Your requested first test: Grocery Stores · Mapping · Communication in Science.' },
  'official': { label: 'Official Guide Academic', desc: 'From the Official Cambridge Guide & IELTS.org sample tasks — all task types in one 40-Q compilation.' },
  'forecast': { label: 'Forecast Academic', desc: 'AI-predicted topics from recent exam reports — built from real material, not generated.' },
};

const TEST_CATEGORY: Record<string, CategoryId> = {
  'reading-ieltsfever-1': 'ielts-fever',
  'reading-official-40': 'official',
  'reading-a1': 'cambridge-academic',
  'reading-a2': 'cambridge-academic',
  'reading-g1': 'cambridge-general',
};

const QUESTION_TYPE_CHIPS = [
  'One Choice', 'Two Choices', 'Three Choices', 'Four Choices', 'Five Choices',
  'Yes / No / Not Given', 'True / False / Not Given', 'Matching Features', 'Matching Information',
  'Matching Sentence Endings', 'Matching Headings', 'Diagram Labeling', 'Note Completion',
  'Table Completion', 'Flow Chart Completion', 'Summary Completion', 'Sentence Completion', 'Short Answers'
];

// Map chip label to qType substring for filtering
function chipMatchesTest(chip: string, testId: string): boolean {
  const qTypes: Record<string, string[]> = {
    'reading-ieltsfever-1': ['Matching Information', 'One Choice', 'Note Completion', 'Table Completion', 'Flow Chart', 'Summary', 'Diagram'],
    'reading-official-40': Object.values(QUESTION_TYPE_CHIPS),
    'reading-a1': ['True / False / Not Given', 'Matching Headings', 'Matching Features'],
    'reading-a2': ['True / False / Not Given', 'Sentence Completion'],
    'reading-g1': ['One Choice', 'Sentence Completion', 'Note Completion'],
  };
  return (qTypes[testId] || []).some(t => t.toLowerCase().includes(chip.toLowerCase().split(' /')[0].toLowerCase()) || chip.toLowerCase().includes(t.toLowerCase()));
}

const TEST_DETAILS: Record<string, { passages: string; qCount: number; note: string; format?: string }> = {
  'reading-ieltsfever-1': { passages: '3 sections', qCount: 40, note: 'Grocery Stores · Revolutions in Mapping · Communication in Science', format: '3 sections · ~13 questions each · 40 in total' },
  'reading-official-40': { passages: '3 sections', qCount: 40, note: 'Science & Nature · History & Society · Work & Evolution', format: '3 sections · ~13 questions each · 40 in total' },
  'reading-a1': { passages: '3 sections', qCount: 40, note: 'Climate-Responsive Architecture · Silk Road · Smart Transit', format: '3 sections · ~13 questions each · 40 in total' },
  'reading-a2': { passages: '3 sections', qCount: 40, note: 'Silk Road Reconsidered · Climate Architecture · Smart Cities', format: '3 sections · ~13 questions each · 40 in total' },
  'reading-g1': { passages: '3 sections', qCount: 40, note: 'Workplace Notices · Recruitment Procedures · Consumer Rights', format: '3 sections · ~13 questions each · 40 in total' },
};

export default function ReadingListPage(): JSX.Element {
  const [tests, setTests] = useState<TestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<CategoryId>('all');
  const [search, setSearch] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const w = window as unknown as { db?: { query: (sql: string, p?: unknown[]) => Promise<unknown[]> } };
        if (!w.db?.query) return;
        const rows = (await w.db.query("SELECT * FROM tests WHERE kind='reading' ORDER BY title")) as TestRow[];
        if (!cancelled) {
          // Force IELTS Fever first, then Official, then rest
          const order: Record<string, number> = { 'reading-ieltsfever-1': 0, 'reading-official-40': 1, 'reading-a1': 2, 'reading-a2': 3, 'reading-g1': 4 };
          const sorted = [...rows].sort((a, b) => (order[a.id] ?? 99) - (order[b.id] ?? 99) || a.title.localeCompare(b.title));
          setTests(sorted);
        }
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const toggleType = (chip: string) => {
    setSelectedTypes(prev => {
      const next = new Set(prev);
      if (next.has(chip)) next.delete(chip); else next.add(chip);
      return next;
    });
  };

  const filtered = useMemo(() => {
    return tests.filter(t => {
      const cat = TEST_CATEGORY[t.id] || 'cambridge-academic';
      if (activeCategory !== 'all' && cat !== activeCategory) return false;
      if (search) {
        const hay = `${t.title} ${t.id} ${TEST_DETAILS[t.id]?.note ?? ''}`.toLowerCase();
        if (!hay.includes(search.toLowerCase())) return false;
      }
      if (selectedTypes.size > 0) {
        // must match at least one selected type
        const matches = Array.from(selectedTypes).some(chip => chipMatchesTest(chip, t.id));
        if (!matches) return false;
      }
      return true;
    });
  }, [tests, activeCategory, search, selectedTypes]);

  // Group filtered tests by category for Engnovate-style sections
  const grouped = useMemo(() => {
    const map = new Map<CategoryId, TestRow[]>();
    for (const t of filtered) {
      const cat = TEST_CATEGORY[t.id] || 'cambridge-academic';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(t);
    }
    // Ensure all categories appear even if empty (for structure), but filter to those with tests
    return Array.from(map.entries());
  }, [filtered]);

  if (loading) return <div className="p-8 text-sm">Loading reading library…</div>;

  return (
    <div className="min-h-screen bg-[#FCFCF9] text-zinc-900" data-testid="reading-list">
      {/* Top banner — free, no premium */}
      <div className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-[1280px] px-6 py-3 flex items-center justify-between text-xs">
          <span className="rounded bg-emerald-600 px-3 py-1.5 font-bold text-white">✓ All Free — No Premium, No Paywall</span>
          <span className="hidden text-zinc-600 md:block">All tests, all solutions, all checks — free forever. Progress saved locally on this PC.</span>
        </div>
      </div>

      {/* Header */}
      <div className="mx-auto max-w-[1280px] px-6 pt-8 pb-6">
        <div className="flex items-start justify-between gap-6">
          <div className="max-w-3xl">
            <h1 className="font-serif text-[28px] font-[800] leading-none tracking-[-0.02em] text-zinc-900" style={{ fontFamily: "'Fraunces', 'Georgia', serif" }}>
              Free Online IELTS Reading Practice Test & Solution Collection
            </h1>
            <p className="mt-3 text-[13px] leading-relaxed text-zinc-600">
              Explore our extensive library of Free Online IELTS Reading Practice Tests & Solutions, carefully categorized by type. Take today&apos;s <span className="font-medium text-zinc-900">IELTS exams</span> — fresh tests every day, ranked on the leaderboards.
            </p>
            <p className="mt-2 text-[12px] text-zinc-500">
              Showing: <span className="font-semibold text-zinc-900">{filtered.length} Tests</span> {activeCategory !== 'all' && <span>· {CATEGORY_META[activeCategory].label}</span>}
              <span className="ml-2">Everything free — 60-min timed, instantly checked, no login required.</span>
            </p>
          </div>
          <div className="hidden shrink-0 rounded-lg border bg-white p-3 text-xs leading-relaxed text-zinc-600 md:block">
            <div className="font-medium text-zinc-900">IELTS Fever Test 1 is first ✓</div>
            <div>Scanned PDF Pages 2-9 + verified 40 answers. Click <span className="font-medium">Take Test</span> to start the 60-min mock.</div>
          </div>
        </div>
      </div>

      {/* Filters — Search + Find Tests Containing + Filter button + Category pills */}
      <div className="mx-auto max-w-[1280px] px-6">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          {/* Search row */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">⌕</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search across test titles, passages, and questions."
                className="w-full rounded-full border border-zinc-200 bg-zinc-50 py-2.5 pl-9 pr-4 text-sm outline-none placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white"
                data-testid="eng-search"
              />
            </div>
            <button className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-black" onClick={() => setSelectedTypes(new Set())}>
              Filter
            </button>
            {search && <button onClick={() => setSearch('')} className="text-sm text-zinc-500 hover:text-zinc-900">Clear</button>}
          </div>

          {/* Find Tests Containing chips */}
          <div className="mt-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-700">
              <span>Find Tests Containing</span>
              <span className="rounded bg-zinc-900 px-2 py-0.5 text-[10px] font-bold text-white">{selectedTypes.size} selected</span>
              {selectedTypes.size > 0 && <button onClick={() => setSelectedTypes(new Set())} className="ml-2 text-xs font-normal normal-case text-zinc-500 hover:text-zinc-900">Clear all</button>}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {QUESTION_TYPE_CHIPS.map(chip => {
                const active = selectedTypes.has(chip);
                return (
                  <button
                    key={chip}
                    onClick={() => toggleType(chip)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${active ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50'}`}
                    data-testid={`chip-${chip.replace(/\s+/g, '-')}`}
                  >
                    {chip}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category pills — Engnovate style */}
          <div className="mt-4 flex flex-wrap gap-1.5 border-t border-zinc-100 pt-4">
            {(Object.keys(CATEGORY_META) as CategoryId[]).map(cat => {
              const meta = CATEGORY_META[cat];
              const isActive = activeCategory === cat;
              const count = cat === 'all' ? tests.length : tests.filter(t => (TEST_CATEGORY[t.id] || 'cambridge-academic') === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${isActive ? 'border-red-600 bg-red-600 text-white' : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'}`}
                  data-testid={`cat-${cat}`}
                >
                  {meta.label}{meta.starred && <span className="ml-1 text-amber-300">★</span>} <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] ${isActive ? 'bg-white/20 text-white' : 'bg-zinc-100 text-zinc-600'}`}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Category sections — Engnovate style: each category has title + desc + 2-col grid of Full Test cards */}
      <div className="mx-auto max-w-[1280px] px-6 pb-12">
        {grouped.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed bg-white p-12 text-center">
            <div className="text-sm font-medium text-zinc-700">No tests match your filters</div>
            <div className="mt-1 text-xs text-zinc-500">Try clearing question type chips or search. IELTS Fever Test 1 is always available as first choice.</div>
            <button onClick={() => { setSearch(''); setSelectedTypes(new Set()); setActiveCategory('all'); }} className="mt-4 rounded-full border px-4 py-2 text-sm hover:bg-zinc-50">Clear filters</button>
          </div>
        ) : (
          grouped.map(([cat, catTests]) => (
            <div key={cat} className="mt-10">
              <div className="flex items-baseline justify-between border-b border-zinc-200 pb-3">
                <h2 className="font-serif text-[20px] font-bold tracking-tight text-zinc-900" style={{ fontFamily: "'Fraunces', serif" }}>
                  {CATEGORY_META[cat].label}
                  {CATEGORY_META[cat].starred && <span className="ml-2 align-middle text-sm text-amber-500">★</span>}
                  <span className="ml-2 align-middle text-xs font-medium text-zinc-500">({catTests.length})</span>
                </h2>
                <span className="hidden text-xs text-zinc-500 md:block">{CATEGORY_META[cat].desc.slice(0, 80)}…</span>
              </div>
              <p className="mt-3 max-w-3xl text-[12px] leading-relaxed text-zinc-600">{CATEGORY_META[cat].desc}</p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {catTests.map(t => {
                  const d = TEST_DETAILS[t.id] ?? { passages: '—', qCount: 40, note: '' };
                  const isFever = t.id === 'reading-ieltsfever-1';
                  const isOfficial = t.id === 'reading-official-40';
                  return (
                    <div key={t.id} className={`group relative flex flex-col rounded-xl border bg-white p-5 shadow-card transition hover:shadow-md ${isFever ? 'ring-1 ring-red-200' : ''}`} data-testid={`reading-card-${t.id}`}>
                      {isFever && <div className="absolute -top-2 left-4 rounded-full bg-red-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow">First • Your PDF • 40 Qs</div>}
                      {isOfficial && <div className="absolute -top-2 left-4 rounded-full bg-zinc-900 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white">Official • All Types</div>}
                      <div className="mt-2 flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-zinc-900 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">Full Test</span>
                            <span className="text-[11px] text-zinc-500">{d.passages} • {d.qCount} Qs • {Math.round(t.durationSec / 60)} min</span>
                          </div>
                          <h3 className="mt-2 line-clamp-2 font-serif text-[16px] font-bold leading-tight text-zinc-900 group-hover:text-red-700" style={{ fontFamily: "'Fraunces', serif" }}>
                            {t.title}
                          </h3>
                          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-600">{d.note} {isFever && '— scanned PDF Pages 2-9 with verified key.'}</p>
                          {TEST_DETAILS[t.id]?.format && <p className="mt-1 text-[10px] text-zinc-400 font-medium">{TEST_DETAILS[t.id].format}</p>}
                        </div>
                        <div className="hidden shrink-0 text-2xl opacity-20 group-hover:opacity-40">📄</div>
                      </div>
                      <div className="mt-4 flex items-center gap-2">
                        <Link to={`/reading/${t.id}`} className="flex-1 rounded-full bg-emerald-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700" data-testid={`start-reading-${t.id}`}>
                          Take Test
                        </Link>
                        <Link to={`/reading/${t.id}`} className="rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50" data-testid={`practice-reading-${t.id}`}>
                          Practice Section
                        </Link>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-400">
                        <span>{t.id}</span>
                        <span className="flex items-center gap-1">● {d.qCount} Questions • Checked ✓</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}

        {/* Footer like Engnovate */}
        <div className="mt-12 rounded-xl border bg-white p-6">
          <h3 className="font-serif text-lg font-bold" style={{ fontFamily: "'Fraunces', serif" }}>How this mirrors Engnovate</h3>
          <div className="mt-3 grid gap-4 text-xs leading-relaxed text-zinc-600 md:grid-cols-3">
            <div><span className="font-medium text-zinc-900">Filters</span> — Search + 18 question-type chips (One Choice… Short Answers) + category pills with counts, just like engnovate.com/ielts-reading-tests</div>
            <div><span className="font-medium text-zinc-900">Library</span> — Categories collapse to Cambridge/ Fever/ Official etc. with descriptions — each Full Test card has Take Test (primary) + Practice Section (secondary)</div>
            <div><span className="font-medium text-zinc-900">Local-first</span> — All tests run offline after seed (fallback JSON at <code>%APPDATA%\ielts-pro\ielts-fallback.json</code>), checked instantly with slash/multi handling.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
