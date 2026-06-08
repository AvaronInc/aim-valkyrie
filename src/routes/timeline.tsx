import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { request } from '../lib/api';
import { Panel } from '../components/Panel';

export const Route = createFileRoute('/timeline')({ component: TimelinePage });

interface HistoryEvent { ts: string; src_ip: string; event: string; risk: number; action: string; }

export default function TimelinePage() {
  const [ip, setIp] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['history', ip, page],
    queryFn: () => request<{ events: HistoryEvent[]; total: number }>(`/api/history/events?page=${page}&ip=${ip}`),
  });
  const rows = data?.events ?? [];
  return (
    <Panel title="Attack Timeline" accent="amber">
      <div className="flex gap-2 mb-3">
        <input className="bg-transparent border border-[var(--border)] px-3 py-1.5 text-xs font-mono caret-[var(--primary)] outline-none focus:border-[var(--primary)] w-48" placeholder="Filter by IP..." value={ip} onChange={e => { setIp(e.target.value); setPage(1); }} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[10px] font-mono">
          <thead><tr className="border-b border-[var(--border)]">{['TS','SRC_IP','EVENT','RISK','ACTION'].map(h => <th key={h} className="text-left py-1.5 px-2 text-[var(--muted-foreground)] tracking-wider uppercase">{h}</th>)}</tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={5} className="py-4 text-center text-[var(--muted-foreground)]">Loading…</td></tr>}
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-[var(--border)] hover:bg-[var(--accent)] transition-colors">
                <td className="py-1 px-2 text-[var(--muted-foreground)]">{r.ts}</td>
                <td className="py-1 px-2 text-[var(--warning)]">{r.src_ip}</td>
                <td className="py-1 px-2">{r.event}</td>
                <td className="py-1 px-2"><span className={r.risk>=80?'text-[var(--danger)]':r.risk>=50?'text-[var(--warning)]':'text-[var(--success)]'}>{r.risk}</span></td>
                <td className="py-1 px-2 text-[var(--primary)]">{r.action}</td>
              </tr>
            ))}
            {!isLoading && rows.length === 0 && <tr><td colSpan={5} className="py-4 text-center text-[var(--muted-foreground)]">No events found.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between mt-3 text-[10px] text-[var(--muted-foreground)]">
        <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} className="border border-[var(--border)] px-3 py-1 hover:border-[var(--primary)] disabled:opacity-30">◄ PREV</button>
        <span>PAGE {page}</span>
        <button onClick={() => setPage(p => p+1)} className="border border-[var(--border)] px-3 py-1 hover:border-[var(--primary)]">NEXT ►</button>
      </div>
    </Panel>
  );
}
