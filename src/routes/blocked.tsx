import { createFileRoute } from '@tanstack/react-router';
import { useLivePayload } from '../lib/context';
import { Panel } from '../components/Panel';
import { request } from '../lib/api';

export const Route = createFileRoute('/blocked')({ component: BlockedPage });

export default function BlockedPage() {
  const payload = useLivePayload();
  const ips = payload?.state?.blocked_ips ?? [];
  const unblock = (ip: string) => request('/api/unblock', { method: 'POST', body: JSON.stringify({ ip }) });
  return (
    <Panel title="Blocked IPs" accent="red" right={<span className="text-[10px] text-[var(--danger)]">{ips.length} blocked</span>}>
      {ips.length===0&&<p className="text-xs text-[var(--muted-foreground)]">No blocked IPs.</p>}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {ips.map((ip: string)=>(
          <div key={ip} className="border border-[var(--border)] p-3 flex flex-col gap-2">
            <span className="text-xs font-bold text-[var(--danger)] font-mono">{ip}</span>
            <span className="text-[10px] text-[var(--muted-foreground)]">Blocked by system</span>
            <button onClick={()=>unblock(ip)} className="text-[10px] border border-[var(--warning)] text-[var(--warning)] px-2 py-1 hover:bg-[var(--warning)] hover:text-black transition-colors tracking-widest mt-1">UNBLOCK</button>
          </div>
        ))}
      </div>
    </Panel>
  );
}
