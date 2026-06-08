import { createFileRoute } from '@tanstack/react-router';
import { useLivePayload } from '../lib/context';
import { Panel } from '../components/Panel';

export const Route = createFileRoute('/defense')({ component: DefensePage });

export default function DefensePage() {
  const payload = useLivePayload();
  const log = payload?.action_log ?? [];
  const mode = payload?.defense_mode ?? 'live';
  return (
    <Panel title="Defense Actions" accent="red" right={
      <span className={`text-[10px] border px-2 py-0.5 tracking-widest ${mode==='live'?'border-[var(--success)] text-[var(--success)]':'border-[var(--warning)] text-[var(--warning)]'}`}>MODE: {mode.toUpperCase()}</span>
    }>
      <table className="w-full text-[10px] font-mono">
        <thead><tr className="border-b border-[var(--border)]">{['TS','ACTION','TARGET','EXECUTED'].map(h=><th key={h} className="text-left py-1.5 px-2 text-[var(--muted-foreground)] tracking-wider uppercase">{h}</th>)}</tr></thead>
        <tbody>
          {log.length===0&&<tr><td colSpan={4} className="py-4 text-center text-[var(--muted-foreground)]">No actions yet.</td></tr>}
          {log.map((a,i)=>(
            <tr key={i} className="border-b border-[var(--border)] hover:bg-[var(--accent)] transition-colors">
              <td className="py-1 px-2 text-[var(--muted-foreground)]">{a.ts}</td>
              <td className="py-1 px-2 text-[var(--primary)]">{a.action}</td>
              <td className="py-1 px-2 text-[var(--warning)]">{a.ip??'—'}</td>
              <td className="py-1 px-2">{a.executed?<span className="text-[var(--success)] glow-green">✓</span>:<span className="text-[var(--danger)] glow-red">✗</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}
