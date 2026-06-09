import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { useLiveSocket } from '../lib/useWebSocket';
import { LivePayloadContext } from '../lib/context';

const NAV = [
  { label: 'LIVE', to: '/' },
  { label: 'TIMELINE', to: '/timeline' },
  { label: 'DEFENSE', to: '/defense' },
  { label: 'BLOCKED', to: '/blocked' },
  { label: 'AGENTS', to: '/agents' },
  { label: 'MAP', to: '/map' },
  { label: 'APPROVALS', to: '/approvals' },
];

function WsDot({ status }: { status: string }) {
  const color = status === 'open' ? 'bg-[var(--success)]' : status === 'reconnecting' ? 'bg-[var(--warning)] live-dot' : 'bg-[var(--danger)]';
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} title={status} />;
}

export function AppShell({ children }: { children: ReactNode }) {
  const { data, status } = useLiveSocket();
  const [utc, setUtc] = useState('');
  const location = useLocation();

  useEffect(() => {
    const tick = () => setUtc(new Date().toUTCString().slice(17, 25) + ' UTC');
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const logout = () => { localStorage.removeItem('auth'); window.location.href = '/login'; };

  return (
    <LivePayloadContext.Provider value={data}>
      <div className="flex flex-col h-screen">
        <header className="h-12 flex items-center justify-between px-4 border-b border-[var(--border)] bg-[var(--card)] shrink-0">
          <span className="font-bold text-sm tracking-[0.2em] glow-green text-[var(--primary)]">▌ AIM // VALKYRIE</span>
          <span className="text-xs text-[var(--muted-foreground)] tabular-nums">{utc}</span>
          <div className="flex items-center gap-3">
            <WsDot status={status} />
            <span className="text-[10px] text-[var(--muted-foreground)] uppercase">{status}</span>
            <button onClick={logout} className="text-[10px] tracking-widest border border-[var(--border)] px-2 py-1 hover:bg-[var(--destructive)] hover:text-white transition-colors">LOGOUT</button>
          </div>
        </header>
        <div className="flex flex-1 overflow-hidden">
          <nav className="w-48 shrink-0 border-r border-[var(--border)] bg-[var(--card)] flex flex-col py-4 gap-1">
            {NAV.map(n => {
              const active = location.pathname === n.to;
              return (
                <Link key={n.to} to={n.to as never}
                  className={`text-[11px] tracking-[0.2em] px-4 py-2 uppercase transition-colors border-l-2 ${
                    active
                      ? 'border-[var(--primary)] text-[var(--primary)] glow-green'
                      : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                  }`}>
                  &gt; {n.label}
                </Link>
              );
            })}
          </nav>
          <main className="flex-1 overflow-y-auto p-4">{children}</main>
        </div>
      </div>
    </LivePayloadContext.Provider>
  );
}
