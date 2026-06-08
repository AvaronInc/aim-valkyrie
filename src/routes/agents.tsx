import { createFileRoute } from '@tanstack/react-router';
import { useLivePayload } from '../lib/context';
import { Panel } from '../components/Panel';

export const Route = createFileRoute('/agents')({ component: AgentsPage });

export default function AgentsPage() {
  const payload = useLivePayload();
  const agents = payload?.agents ?? {};
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {Object.entries(agents).map(([key,val])=>(
        <Panel key={key} title={key} accent="green">
          <pre className="text-[10px] font-mono text-[var(--muted-foreground)] overflow-auto max-h-64 whitespace-pre-wrap break-all">{JSON.stringify(val,null,2)}</pre>
        </Panel>
      ))}
      {Object.keys(agents).length===0&&<Panel title="Agents" accent="green"><p className="text-xs text-[var(--muted-foreground)]">Waiting for agent telemetry…</p></Panel>}
    </div>
  );
}
