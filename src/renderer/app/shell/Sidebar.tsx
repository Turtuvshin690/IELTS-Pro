import { NavLink } from 'react-router-dom';

const nav = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/reading/demo-reading', label: 'Reading' },
  { to: '/listening/demo-listening', label: 'Listening' },
  { to: '/writing/demo-writing', label: 'Writing' },
  { to: '/speaking/demo-speaking', label: 'Speaking' },
  { to: '/import', label: 'Import' },
  { to: '/settings', label: 'Settings' },
];

export default function Sidebar(): JSX.Element {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r bg-white" data-testid="sidebar">
      <div className="border-b px-4 py-4">
        <div className="text-sm font-bold tracking-tight">IELTS Pro</div>
        <div className="mt-0.5 text-xs text-gray-500">Local-Only • BYOK</div>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive ? 'bg-black text-white' : 'text-gray-700 hover:bg-gray-100'
              }`
            }
            data-testid={`nav-${item.label.toLowerCase()}`}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t p-3">
        <div className="rounded bg-gray-50 p-2 text-xs leading-relaxed text-gray-600">
          <div className="font-medium text-gray-800">Offline-first</div>
          <div>All attempts stored locally in SQLite WAL. No cloud DB.</div>
        </div>
        <div className="mt-2 text-[10px] tracking-wide text-gray-400">v1.0.0 • Electron 30</div>
      </div>
    </aside>
  );
}
