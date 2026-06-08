import { createFileRoute } from '@tanstack/react-router';
import { useLivePayload } from '../lib/context';
import { Panel } from '../components/Panel';
import { request } from '../lib/api';
import { useState } from 'react';

export const Route = createFileRoute('/approvals')({ component: ApprovalsPage });

export default function ApprovalsPage() {
  const payload = useLivePayload();
  const queue = payload?.approval_queue ?? [];
  const [loading, setLoading] = useState<string|null>(null);
  const decide = async (req_id: string, decision: string) => {
    setLoading(req_id);
    await request('/api/approve', { method: 'POST', body: JSON.stringify({ req_id, decision }) });
    setLoading(null);
  };
  return (
    <Panel title="Approval Queue" accent="red" right={<span className="text-[10px] text-[var(--danger)]">{queue.length} pending</span>}>
      {queue.length===0&&<p className="text-xs text-[var(--muted-foreground)]">Queue clear. No actions require approval.</p>}
      <div className="flex flex-col gap-3">
        {queue.map(item=>(
          <div key={item.req_id} className="border border-[var(--border)] p-3">
            <div className="flex justify-between items-start mb-2">
              <div><span className="text-sm font-bold text-[var(--danger)] font-mono">{item.action}</span><span className="text-xs text-[var(--muted-foreground)] ml-2">#{item.req_id}</span></div>
              <span className={`text-xs border px-2 py-0.5 ${item.risk>=80?'border-[var(--danger)] text-[var(--danger)]':item.risk>=50?'border-[var(--warning)] text-[var(--warning)]':'border-[var(--success)] text-[var(--success)]'}`}>risk={item.risk}</span>
            </div>
            <p className="text-xs text-[var(--warning)] font-mono mb-3">{item.ip}</p>
            <p className="text-[10px] text-[var(--muted-foreground)] mb-3">Agent: {item.agent??'system'}</p>
            <div className="flex gap-2">
              <button onClick={()=>decide(item.req_id,'approved')} disabled={loading===item.req_id} className="flex-1 text-xs border border-[var(--success)] text-[var(--success)] py-1.5 hover:bg-[var(--success)] hover:text-black transition-colors tracking-widest disabled:opacity-50">[ APPROVE ]</button>
              <button onClick={()=>decide(item.req_id,'denied')} disabled={loading===item.req_id} className="flex-1 text-xs border border-[var(--danger)] text-[var(--danger)] py-1.5 hover:bg-[var(--danger)] hover:text-white transition-colors tracking-widest disabled:opacity-50">[ DENY ]</button>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
