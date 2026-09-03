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
