import { createFileRoute } from '@tanstack/react-router';
import { useLivePayload } from '../lib/context';
import { Panel } from '../components/Panel';
import { request } from '../lib/api';

export const Route = createFileRoute('/')({ component: LiveDashboard });

function riskColor(risk: number) {
  if (risk >= 80) return 'text-[var(--danger)] glow-red';
  if (risk >= 50) return 'text-[var(--warning)] glow-amber';
  return 'text-[var(--success)] glow-green';
}

function StatPanel({ title, value, accent }: { title: string; value: string | number; accent?: 'green' | 'red' | 'amber' }) {
  return (
    <Panel title={title} accent={accent ?? 'green'}>
      <div className={`text-5xl font-bold tabular-nums font-mono mt-1 ${
        accent === 'red' ? 'text-[var(--danger)] glow-red' :
        accent === 'amber' ? 'text-[var(--warning)] glow-amber' :
        'text-[var(--primary)] glow-green'
      }`}>{value}</div>
    </Panel>
  );
}

export default function LiveDashboard() {
  const payload = useLivePayload();
  const state = payload?.state;
  const agents = payload?.agents as Record<string, { status?: string }> | undefined;
  const queue = payload?.approval_queue ?? [];
  const feed = state?.recent_events ?? [];

  const approve = (req_id: string, decision: string) =>
    request('/api/approve', { method: 'POST', body: JSON.stringify({ req_id, decision }) });

  return (
    <div className="grid grid-cols-12 gap-3">
      <div className="col-span-3"><StatPanel title="Risk Score" value={state?.risk ?? 0} accent={state?.risk && state.risk >= 80 ? 'red' : state?.risk && state.risk >= 50 ? 'amber' : 'green'} /></div>
      <div className="col-span-3"><StatPanel title="Failed Auths" value={state?.failed ?? 0} accent="red" /></div>
      <div className="col-span-3"><StatPanel title="Blocked IPs" value={state?.blocked_ips?.length ?? 0} accent="amber" /></div>
      <div className="col-span-3"><Panel title="Top Threat" accent="amber"><div className="text-sm font-mono mt-1 text-[var(--warning)] truncate">{state?.blocked_ips?.[0] ?? '—'}</div></Panel></div>

      <div className="col-span-4">
        <Panel title="Agent Status">
          {['watcher','evaluator','defender'].map(key => (
            <div key={key} className="flex items-center justify-between py-1.5 border-b border-[var(--border)] last:border-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--primary)] live-dot inline-block" />
                <span className="text-xs uppercase tracking-wider">{key}</span>
              </div>
              <span className="text-[10px] text-[var(--muted-foreground)]">{(agents?.[key] as {status?:string})?.status ?? 'waiting'}</span>
            </div>
          ))}
        </Panel>
      </div>

      <div className="col-span-8">
        <Panel title="Live Event Feed">
          <div className="max-h-48 overflow-y-auto flex flex-col gap-0.5">
            {feed.length === 0 && <p className="text-xs text-[var(--muted-foreground)]">Waiting for events…</p>}
            {[...feed].reverse().map((ev, i) => (
              <div key={i} className="feed-item-new flex gap-3 text-[10px] font-mono py-0.5 border-b border-[var(--border)] last:border-0">
                <span className="text-[var(--muted-foreground)] w-16 shrink-0">{ev.ts}</span>
                <span className="text-[var(--primary)] w-24 shrink-0">{ev.type}</span>
                <span className="text-[var(--warning)]">{ev.src_ip ?? ''}</span>
                {ev.risk != null && <span className={riskColor(ev.risk)}>risk={ev.risk}</span>}
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="col-span-12">
        <Panel title="Approval Queue" accent="red" right={<span className="text-[10px] text-[var(--danger)]">{queue.length} pending</span>}>
          {queue.length === 0 && <p className="text-xs text-[var(--muted-foreground)]">No pending approvals.</p>}
          <div className="flex flex-col gap-2">
            {queue.map(item => (
              <div key={item.req_id} className="flex items-center justify-between border border-[var(--border)] px-3 py-2">
                <div className="flex gap-4 text-xs font-mono">
                  <span className="text-[var(--danger)] font-bold">{item.action}</span>
                  <span className="text-[var(--warning)]">{item.ip}</span>
                  <span className="text-[var(--muted-foreground)]">risk={item.risk}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => approve(item.req_id, 'approved')} className="text-[10px] border border-[var(--success)] text-[var(--success)] px-3 py-1 hover:bg-[var(--success)] hover:text-black transition-colors tracking-widest">APPROVE</button>
                  <button onClick={() => approve(item.req_id, 'denied')} className="text-[10px] border border-[var(--danger)] text-[var(--danger)] px-3 py-1 hover:bg-[var(--danger)] hover:text-white transition-colors tracking-widest">DENY</button>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
