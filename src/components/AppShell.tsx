import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useLiveSocket } from '../lib/useWebSocket';
import { LivePayloadContext } from '../lib/context';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

function WsDot({ status }: { status: string }) {
  if (status === 'open')
    return <span className="flex items-center gap-1.5 text-xs text-matrix"><Wifi className="h-3 w-3" /> LIVE</span>;
  if (status === 'reconnecting')
    return <span className="flex items-center gap-1.5 text-xs text-warning"><RefreshCw className="h-3 w-3 animate-spin" /> RECONNECTING</span>;
  return <span className="flex items-center gap-1.5 text-xs text-destructive"><WifiOff className="h-3 w-3" /> DISCONNECTED</span>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const { data, status } = useLiveSocket();
  const [utc, setUtc] = useState('');

  useEffect(() => {
    const tick = () => setUtc(new Date().toUTCString().slice(17, 25) + ' UTC');
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const logout = () => { localStorage.removeItem('auth'); window.location.href = '/login'; };

  return (
    <LivePayloadContext.Provider value={data}>
      <div className="flex flex-col h-screen bg-background text-foreground">
        {/* Top bar */}
        <header className="h-12 flex items-center justify-between px-4 border-b border-border bg-card/95 shrink-0">
          <span className="font-bold text-sm tracking-[0.2em] text-matrix">▌ AIM // VALKYRIE</span>
          <span className="text-xs text-muted-foreground tabular-nums">{utc}</span>
          <div className="flex items-center gap-3">
            <WsDot status={status} />
            <button
              onClick={logout}
              className="text-xs border border-border px-3 py-1 rounded-md hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </header>
        {/* Main content — no sidebar, full width, ValkyrieDashboard owns its own layout */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </LivePayloadContext.Provider>
  );
}
