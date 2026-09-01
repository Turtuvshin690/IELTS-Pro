import { useMemo, useState } from 'react';
import { RESOURCES, filterResources, type ResourceCategory, type StudyResource } from '../../../lib/resources/catalog';
import { generatePlan, planSummary, type PlanDay } from '../../../lib/resources/studyPlan';

const CATS: (ResourceCategory | 'all')[] = ['all', 'general', 'reading', 'listening', 'writing', 'speaking'];

function openExternal(url: string): void {
  // Electron: use shell via window.open fallback (preload exposes shell:openExternal if available)
  const w = window as unknown as { electronAPI?: { openExternal?: (u: string) => void }; shell?: { openExternal: (u: string) => void } };
  if (w.electronAPI?.openExternal) w.electronAPI.openExternal(url);
  else if ((w as any).shell?.openExternal) (w as any).shell.openExternal(url);
  else window.open(url, '_blank', 'noopener,noreferrer');
}

export default function ResourcesPage(): JSX.Element {
  const [cat, setCat] = useState<ResourceCategory | 'all'>('all');
  const [q, setQ] = useState('');
  const [testDate, setTestDate] = useState<string>(() => {
    const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().slice(0, 10);
  });
  const [hours, setHours] = useState(2);
  const [target, setTarget] = useState(7.0);

  const filtered = useMemo(() => filterResources(cat, q), [cat, q]);
  const plan = useMemo(() => generatePlan({ targetBand: target, testDate, hoursPerDay: hours }), [target, testDate, hours]);

  return (
    <div className="mx-auto max-w-6xl p-6" data-testid="resources-page">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Study Resources</h1>
        <p className="mt-1 text-sm text-gray-600">
          Curated from <span className="font-medium">ielts.org</span>, <span className="font-medium">British Council</span>, <span className="font-medium">Cambridge</span> & <span className="font-medium">IDP</span>. All practice tests verified 2026-09-01. Open in your browser — nothing is scraped.
        </p>
      </div>

      {/* Category + search */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-lg border bg-white p-1" role="tablist">
          {CATS.map(c => (
            <button
              key={c}
              role="tab"
              aria-selected={cat === c}
              onClick={() => setCat(c)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition ${cat === c ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              data-testid={`cat-${c}`}
            >
              {c} {c !== 'all' && <span className="ml-1 text-xs opacity-60">({RESOURCES.filter(r => r.category === c).length})</span>}
            </button>
          ))}
        </div>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search — e.g. TFNG, map, Task 2"
          className="ml-auto w-full max-w-xs rounded-md border bg-white px-3 py-1.5 text-sm outline-none focus:border-black sm:w-64"
          data-testid="resources-search"
        />
      </div>

      {/* Grid */}
      <div className="grid gap-3 md:grid-cols-2" data-testid="resources-grid">
        {filtered.map((r: StudyResource) => (
          <div key={r.id} className="flex flex-col rounded-lg border bg-white p-4 shadow-sm transition hover:shadow" data-testid={`resource-${r.id}`}>
            <div className="mb-1 flex items-center gap-2">
              <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${r.category === 'general' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'}`}>{r.category}</span>
              <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">{r.type}</span>
              {r.free ? <span className="rounded bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">Free</span> : <span className="rounded bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">Paid</span>}
              <span className="ml-auto text-xs text-gray-500">{r.provider}</span>
            </div>
            <div className="text-sm font-semibold leading-tight">{r.title}</div>
            <div className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-600">{r.description}</div>
            <div className="mt-2 flex flex-wrap gap-1">
              {r.tags.slice(0, 4).map((t: string) => <span key={t} className="rounded bg-gray-50 px-1.5 py-0.5 text-[10px] text-gray-600">#{t}</span>)}
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => openExternal(r.url)} className="rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800" data-testid={`open-${r.id}`}>Open</button>
              <span className="truncate py-1.5 text-[10px] text-gray-400">{new URL(r.url).hostname}</span>
            </div>
          </div>
        ))}
      </div>
      {filtered.length === 0 && <div className="mt-8 rounded border border-dashed bg-white p-8 text-center text-sm text-gray-500" data-testid="resources-empty">No resources match “{q}” in {cat}.</div>}

      {/* Study plan generator — uses date-fns */}
      <div className="mt-8 rounded-lg border bg-white p-5" data-testid="study-plan">
        <h2 className="text-sm font-bold">Personal Study Plan — <span className="font-normal text-gray-600">uses <code>date-fns</code> scheduling</span></h2>
        <p className="mt-1 text-xs text-gray-600">{planSummary(plan)} • weak-area days get +15m.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <label className="text-xs font-medium">Target band <input type="number" min={5} max={9} step={0.5} value={target} onChange={e => setTarget(parseFloat(e.target.value) || 7)} className="mt-1 w-full rounded border px-2 py-1 text-sm" data-testid="plan-target" /></label>
          <label className="text-xs font-medium">Test date <input type="date" value={testDate} onChange={e => setTestDate(e.target.value)} className="mt-1 w-full rounded border px-2 py-1 text-sm" data-testid="plan-date" /></label>
          <label className="text-xs font-medium">Hours/day <input type="range" min={1} max={6} value={hours} onChange={e => setHours(parseInt(e.target.value, 10))} className="mt-1 w-full" data-testid="plan-hours" /><span className="text-[11px] text-gray-500">{hours}h / {hours * 60}min</span></label>
          <div className="rounded bg-gray-50 p-2 text-xs leading-relaxed text-gray-600" data-testid="plan-summary"><div className="font-medium text-gray-800">How it’s built</div>Rotates Reading/Listening/Writing/Speaking + Mock every 7 days. Uses <code>date-fns</code> <code>addDays</code>/<code>format</code>.</div>
        </div>
        <div className="mt-4 max-h-[320px] overflow-auto rounded border" data-testid="plan-list">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500"><tr><th className="px-3 py-2">Date</th><th className="px-3 py-2">Focus</th><th className="px-3 py-2">Tasks</th><th className="px-3 py-2 text-right">Min</th></tr></thead>
            <tbody>
              {plan.slice(0, 21).map((d: PlanDay) => (
                <tr key={d.date} className="border-t hover:bg-gray-50"><td className="whitespace-nowrap px-3 py-2 font-medium">{d.dayLabel}</td><td className="px-3 py-2">{d.focus}</td><td className="px-3 py-2 text-gray-600">{d.tasks.join(' • ')}</td><td className="px-3 py-2 text-right">{d.minutes}</td></tr>
              ))}
            </tbody>
          </table>
          {plan.length > 21 && <div className="bg-gray-50 px-3 py-2 text-center text-[11px] text-gray-500">+ {plan.length - 21} more days — extends to {plan[plan.length - 1].dayLabel}</div>}
        </div>
      </div>

      <div className="mt-4 rounded bg-blue-50 p-3 text-xs leading-relaxed text-blue-900" data-testid="resources-attribution">
        <span className="font-medium">Attribution:</span> Links point to official sources — no scraping. To update the catalog, edit <code>src/lib/resources/catalog.ts:1</code> (add <code>StudyResource</code> entries). For live fetch, use <code>axios</code> (`npm i axios`) inside `src/lib/resources/catalog.ts` — example in comments.
      </div>
    </div>
  );
}
