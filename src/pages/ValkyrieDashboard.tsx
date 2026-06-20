import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useValkyrie } from '../hooks/useValkyrie';
import { request } from '../lib/api';
import {
  Shield, Activity, AlertTriangle, Ban, Cpu, Map,
  CheckCircle, XCircle, RefreshCw, Wifi, WifiOff, Loader2,
} from 'lucide-react';

// ─── shadcn-style primitives (inline, no import needed from aimdashboard yet) ──
function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={`rounded-lg border border-border bg-card/50 ${className}`}>{children}</div>;
}
function CardHeader({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={`flex flex-row items-center justify-between space-y-0 p-4 pb-2 ${className}`}>{children}</div>;
}
function CardTitle({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <h3 className={`text-sm font-medium text-muted-foreground ${className}`}>{children}</h3>;
}
function CardContent({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={`p-4 pt-0 ${children ? '' : 'hidden'} ${className}`}>{children}</div>;
}
function Badge({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${className}`}>{children}</span>;
}
function Button({ onClick, disabled, children, className = '', variant = 'default' }: {
  onClick?: () => void; disabled?: boolean; children: React.ReactNode; className?: string; variant?: 'default' | 'outline' | 'destructive';
}) {
  const base = 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none disabled:opacity-50 px-3 py-1.5';
  const variants: Record<string, string> = {
    default: 'bg-matrix text-black hover:bg-matrix/90',
    outline: 'border border-border hover:bg-accent text-foreground',
    destructive: 'bg-destructive text-white hover:bg-destructive/90',
  };
  return <button onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${className}`}>{children}</button>;
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface HistoryEvent { ts: string; src_ip: string; event: string; risk: number; action: string; }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function riskBadge(risk: number) {
  if (risk >= 80) return 'border-destructive/40 bg-destructive/10 text-destructive';
  if (risk >= 50) return 'border-warning/40 bg-warning/10 text-warning';
  return 'border-matrix/40 bg-matrix/10 text-matrix';
}
function riskLabel(risk: number) {
  if (risk >= 80) return 'CRITICAL';
  if (risk >= 50) return 'MEDIUM';
  return 'LOW';
}
function WsIndicator({ status }: { status: string }) {
  if (status === 'open') return <span className="flex items-center gap-1.5 text-xs text-matrix"><Wifi className="h-3 w-3" /> LIVE</span>;
  if (status === 'reconnecting') return <span className="flex items-center gap-1.5 text-xs text-warning"><RefreshCw className="h-3 w-3 animate-spin" /> RECONNECTING</span>;
  return <span className="flex items-center gap-1.5 text-xs text-destructive"><WifiOff className="h-3 w-3" /> DISCONNECTED</span>;
}

const GEO: Record<string, [number, number]> = {
  CN: [104.2, 35.9], RU: [37.6, 55.8], US: [-95.7, 37.1], IN: [79.0, 20.6],
  BR: [-51.9, -14.2], DE: [10.5, 51.2], NL: [4.9, 52.4], IR: [53.7, 32.4], VN: [108.3, 14.1],
};
function lonLatToSvg(lon: number, lat: number) {
  return { x: ((lon + 180) / 360) * 800, y: ((90 - lat) / 180) * 400 };
}

// ─── Tab definitions ──────────────────────────────────────────────────────────
const TABS = [
  { id: 'overview',   label: 'Overview',    icon: Activity },
  { id: 'timeline',   label: 'Timeline',    icon: AlertTriangle },
  { id: 'defense',    label: 'Defense Log', icon: Shield },
  { id: 'blocked',    label: 'Blocked IPs', icon: Ban },
  { id: 'agents',     label: 'Agents',      icon: Cpu },
  { id: 'map',        label: 'Threat Map',  icon: Map },
] as const;

type TabId = typeof TABS[number]['id'];

// ═══════════════════════════════════════════════════════════════════════════════
export default function ValkyrieDashboard() {
  const { payload, wsStatus, state, agents, approvalQueue, actionLog, defenseMode } = useValkyrie();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [ipFilter, setIpFilter] = useState('');
  const [timelinePage, setTimelinePage] = useState(1);
  const [approveLoading, setApproveLoading] = useState<string | null>(null);

  const { data: timelineData, isLoading: timelineLoading } = useQuery({
    queryKey: ['valk-history', ipFilter, timelinePage],
    queryFn: () => request<{ events: HistoryEvent[]; total: number }>(`/api/history/events?page=${timelinePage}&ip=${ipFilter}`),
    enabled: activeTab === 'timeline',
  });

  const decide = async (req_id: string, decision: string) => {
    setApproveLoading(req_id);
    await request('/api/approve', { method: 'POST', body: JSON.stringify({ req_id, decision }) });
    setApproveLoading(null);
  };

  const unblock = (ip: string) =>
    request('/api/unblock', { method: 'POST', body: JSON.stringify({ ip }) });

  const riskScore = state?.risk ?? 0;
  const failedAuths = state?.failed ?? 0;
  const blockedIps = state?.blocked_ips ?? [];
  const recentEvents = state?.recent_events ?? [];
  const agentKeys = Object.keys(agents);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">

      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Shield className="h-7 w-7 text-matrix" />
            Valkyrie
          </h1>
          <p className="text-muted-foreground">SOC Defense Dashboard</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={defenseMode === 'live' ? 'border-matrix/40 bg-matrix/10 text-matrix' : 'border-warning/40 bg-warning/10 text-warning'}>
            MODE: {defenseMode.toUpperCase()}
          </Badge>
          <WsIndicator status={wsStatus} />
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Risk Score</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${riskScore >= 80 ? 'text-destructive' : riskScore >= 50 ? 'text-warning' : 'text-matrix'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              riskScore >= 80 ? 'text-destructive' : riskScore >= 50 ? 'text-warning' : 'text-matrix'
            }`}>{payload ? riskScore : '–'}</div>
            <p className="text-xs text-muted-foreground mt-1">{riskLabel(riskScore)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Failed Auths</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{payload ? failedAuths : '–'}</div>
            <p className="text-xs text-muted-foreground mt-1">{failedAuths === 0 ? 'No failures detected' : 'Auth failures logged'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Blocked IPs</CardTitle>
            <Ban className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{payload ? blockedIps.length : '–'}</div>
            <p className="text-xs text-muted-foreground mt-1">{blockedIps.length === 0 ? 'No IPs blocked' : 'Active blocks'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending Approvals</CardTitle>
            <Shield className="h-4 w-4 text-tech" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${approvalQueue.length > 0 ? 'text-warning' : 'text-foreground'}`}>
              {payload ? approvalQueue.length : '–'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{approvalQueue.length === 0 ? 'Queue clear' : 'Actions awaiting review'}</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Tabs ── */}
      <div className="space-y-4">
        {/* Tab bar */}
        <div className="grid w-full grid-cols-3 gap-1 rounded-lg bg-muted p-1 sm:grid-cols-6">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.id === 'blocked' && blockedIps.length > 0 && (
                <span className="ml-0.5 rounded-full bg-warning/20 text-warning text-[10px] px-1.5 py-0.5 border border-warning/30">
                  {blockedIps.length}
                </span>
              )}
              {tab.id === 'overview' && approvalQueue.length > 0 && (
                <span className="ml-0.5 rounded-full bg-destructive/20 text-destructive text-[10px] px-1.5 py-0.5 border border-destructive/30">
                  {approvalQueue.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Agent Status */}
              <Card>
                <CardHeader><CardTitle className="text-foreground text-base font-semibold">Agent Status</CardTitle></CardHeader>
                <CardContent>
                  {!payload && (
                    <div className="flex items-center gap-2 py-4 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Connecting to Oracle…</span>
                    </div>
                  )}
                  {payload && agentKeys.length === 0 && (
                    <div className="py-8 text-center text-muted-foreground">
                      <Cpu className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      <p className="text-sm">Waiting for agent telemetry…</p>
                    </div>
                  )}
                  {agentKeys.map(key => {
                    const agent = agents[key] as { status?: string };
                    const isOnline = agent?.status === 'active' || agent?.status === 'running';
                    return (
                      <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-background/50 mb-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-matrix' : 'bg-muted-foreground'}`} />
                          <span className="text-sm font-mono text-foreground capitalize">{key}</span>
                        </div>
                        <Badge className={isOnline ? 'border-matrix/40 bg-matrix/10 text-matrix' : 'border-muted-foreground/40 bg-muted/10 text-muted-foreground'}>
                          {agent?.status ?? 'waiting'}
                        </Badge>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Live Event Feed */}
              <Card>
                <CardHeader><CardTitle className="text-foreground text-base font-semibold">Live Event Feed</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {recentEvents.length === 0 && (
                      <div className="py-8 text-center text-muted-foreground">
                        <Activity className="h-10 w-10 mx-auto mb-3 opacity-40" />
                        <p className="text-sm">Waiting for events…</p>
                      </div>
                    )}
                    {[...recentEvents].reverse().map((ev, i) => (
                      <div key={i} className="rounded-lg bg-background/50 p-2.5 text-xs font-mono">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground shrink-0">{ev.ts}</span>
                          <span className="text-tech shrink-0">{ev.type}</span>
                          {ev.src_ip && <span className="text-warning truncate">{ev.src_ip}</span>}
                          {ev.risk != null && (
                            <Badge className={`${riskBadge(ev.risk)} shrink-0`}>r={ev.risk}</Badge>
                          )}
                        </div>
                        {ev.action && <p className="mt-1 text-matrix">{ev.action}</p>}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Approval Queue */}
            <Card>
              <CardHeader>
                <CardTitle className="text-foreground text-base font-semibold flex items-center gap-2">
                  <Shield className="h-4 w-4 text-tech" />
                  Approval Queue
                </CardTitle>
                <span className={`text-xs ${approvalQueue.length > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {approvalQueue.length} pending
                </span>
              </CardHeader>
              <CardContent>
                {approvalQueue.length === 0 && (
                  <div className="py-8 text-center text-muted-foreground">
                    <CheckCircle className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">Queue clear. No actions require approval.</p>
                  </div>
                )}
                <div className="space-y-3">
                  {approvalQueue.map(item => (
                    <div key={item.req_id} className="rounded-lg border border-border bg-background/50 p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                        <div>
                          <span className="text-sm font-bold text-destructive font-mono">{item.action}</span>
                          <span className="text-xs text-muted-foreground ml-2">#{item.req_id}</span>
                          <p className="text-xs text-warning font-mono mt-0.5">{item.ip}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Agent: {item.agent ?? 'system'}</p>
                        </div>
                        <Badge className={riskBadge(item.risk)}>risk={item.risk}</Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => decide(item.req_id, 'approved')}
                          disabled={approveLoading === item.req_id}
                          variant="default"
                          className="flex-1"
                        >
                          {approveLoading === item.req_id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3 mr-1" />}
                          Approve
                        </Button>
                        <Button
                          onClick={() => decide(item.req_id, 'denied')}
                          disabled={approveLoading === item.req_id}
                          variant="destructive"
                          className="flex-1"
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Deny
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── TIMELINE ── */}
        {activeTab === 'timeline' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground text-base font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Attack Timeline
              </CardTitle>
              <input
                className="bg-background border border-border rounded-md px-3 py-1.5 text-xs font-mono outline-none focus:border-matrix w-48"
                placeholder="Filter by IP…"
                value={ipFilter}
                onChange={e => { setIpFilter(e.target.value); setTimelinePage(1); }}
              />
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="border-b border-border">
                      {['Timestamp', 'Source IP', 'Event', 'Risk', 'Action'].map(h => (
                        <th key={h} className="text-left py-2 px-3 text-muted-foreground uppercase tracking-wider text-[10px]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {timelineLoading && (
                      <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                        Loading events…
                      </td></tr>
                    )}
                    {!timelineLoading && (timelineData?.events ?? []).length === 0 && (
                      <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No events found.</td></tr>
                    )}
                    {(timelineData?.events ?? []).map((r, i) => (
                      <tr key={i} className="border-b border-border hover:bg-accent/40 transition-colors">
                        <td className="py-2 px-3 text-muted-foreground">{r.ts}</td>
                        <td className="py-2 px-3 text-warning">{r.src_ip}</td>
                        <td className="py-2 px-3 text-foreground">{r.event}</td>
                        <td className="py-2 px-3">
                          <Badge className={riskBadge(r.risk)}>{r.risk}</Badge>
                        </td>
                        <td className="py-2 px-3 text-matrix">{r.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
                <Button variant="outline" onClick={() => setTimelinePage(p => Math.max(1, p - 1))} disabled={timelinePage === 1}>
                  ← Prev
                </Button>
                <span>Page {timelinePage}</span>
                <Button variant="outline" onClick={() => setTimelinePage(p => p + 1)}>
                  Next →
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── DEFENSE LOG ── */}
        {activeTab === 'defense' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground text-base font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-matrix" />
                Defense Actions
              </CardTitle>
              <Badge className={defenseMode === 'live' ? 'border-matrix/40 bg-matrix/10 text-matrix' : 'border-warning/40 bg-warning/10 text-warning'}>
                {defenseMode.toUpperCase()}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="border-b border-border">
                      {['Timestamp', 'Action', 'Target IP', 'Executed'].map(h => (
                        <th key={h} className="text-left py-2 px-3 text-muted-foreground uppercase tracking-wider text-[10px]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {actionLog.length === 0 && (
                      <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">
                        <Shield className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        No defense actions yet.
                      </td></tr>
                    )}
                    {actionLog.map((a, i) => (
                      <tr key={i} className="border-b border-border hover:bg-accent/40 transition-colors">
                        <td className="py-2 px-3 text-muted-foreground">{a.ts}</td>
                        <td className="py-2 px-3 text-tech">{a.action}</td>
                        <td className="py-2 px-3 text-warning">{a.ip ?? '—'}</td>
                        <td className="py-2 px-3">
                          {a.executed
                            ? <span className="flex items-center gap-1 text-matrix"><CheckCircle className="h-3 w-3" /> Yes</span>
                            : <span className="flex items-center gap-1 text-destructive"><XCircle className="h-3 w-3" /> No</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── BLOCKED IPs ── */}
        {activeTab === 'blocked' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground text-base font-semibold flex items-center gap-2">
                <Ban className="h-4 w-4 text-warning" />
                Blocked IPs
              </CardTitle>
              <span className={`text-xs ${blockedIps.length > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                {blockedIps.length} blocked
              </span>
            </CardHeader>
            <CardContent>
              {blockedIps.length === 0 && (
                <div className="py-8 text-center text-muted-foreground">
                  <Ban className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No blocked IPs.</p>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {blockedIps.map((ip: string) => (
                  <div key={ip} className="rounded-lg border border-border bg-background/50 p-4 flex flex-col gap-3">
                    <div>
                      <span className="text-sm font-bold text-destructive font-mono block">{ip}</span>
                      <span className="text-xs text-muted-foreground">Blocked by system</span>
                    </div>
                    <Button variant="outline" onClick={() => unblock(ip)} className="w-full text-warning border-warning/40 hover:bg-warning/10">
                      Unblock
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── AGENTS ── */}
        {activeTab === 'agents' && (
          <div className="space-y-4">
            {agentKeys.length === 0 && (
              <Card>
                <CardContent>
                  <div className="py-12 text-center text-muted-foreground">
                    <Cpu className="h-12 w-12 mx-auto mb-4 opacity-40" />
                    <p className="text-sm font-medium">Waiting for agent telemetry…</p>
                    <p className="text-xs mt-1">Agents will appear here once connected.</p>
                  </div>
                </CardContent>
              </Card>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {agentKeys.map(key => (
                <Card key={key}>
                  <CardHeader>
                    <CardTitle className="text-foreground text-base font-semibold capitalize flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-matrix" />
                      {key}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs font-mono text-muted-foreground overflow-auto max-h-64 whitespace-pre-wrap break-all bg-background/50 rounded-md p-3">
                      {JSON.stringify(agents[key], null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ── THREAT MAP ── */}
        {activeTab === 'map' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground text-base font-semibold flex items-center gap-2">
                <Map className="h-4 w-4 text-tech" />
                World Threat Map
              </CardTitle>
              <span className="text-xs text-muted-foreground">{blockedIps.length} IPs plotted</span>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg overflow-hidden border border-border">
                <svg viewBox="0 0 800 400" className="w-full" style={{ background: 'oklch(0.14 0.02 240)' }}>
                  {/* Grid lines */}
                  {Array.from({ length: 13 }).map((_, i) => (
                    <line key={`v${i}`} x1={i * 800 / 12} y1={0} x2={i * 800 / 12} y2={400}
                      stroke="oklch(0.82 0.22 145 / 8%)" strokeWidth={1} />
                  ))}
                  {Array.from({ length: 7 }).map((_, i) => (
                    <line key={`h${i}`} x1={0} y1={i * 400 / 6} x2={800} y2={i * 400 / 6}
                      stroke="oklch(0.82 0.22 145 / 8%)" strokeWidth={1} />
                  ))}
                  {/* Country dots */}
                  {Object.entries(GEO).map(([cc, [lon, lat]]) => {
                    const { x, y } = lonLatToSvg(lon, lat);
                    return (
                      <g key={cc}>
                        <circle cx={x} cy={y} r={4}
                          fill="oklch(0.82 0.22 145 / 30%)"
                          stroke="oklch(0.82 0.22 145 / 50%)" strokeWidth={1} />
                        <text x={x + 6} y={y + 4} fontSize={8}
                          fill="oklch(0.82 0.22 145 / 60%)">{cc}</text>
                      </g>
                    );
                  })}
                  {/* Blocked IP threat dots */}
                  {blockedIps.slice(0, 20).map((ip: string, i: number) => {
                    const x = 50 + ((ip.charCodeAt(0) * 37 + i * 97) % 700);
                    const y = 30 + ((ip.charCodeAt(2) * 53 + i * 61) % 340);
                    return (
                      <g key={ip}>
                        <circle cx={x} cy={y} r={6}
                          fill="oklch(0.65 0.28 25 / 40%)"
                          stroke="oklch(0.65 0.28 25)" strokeWidth={1} />
                        <circle cx={x} cy={y} r={12}
                          fill="none"
                          stroke="oklch(0.65 0.28 25 / 20%)" strokeWidth={1} />
                      </g>
                    );
                  })}
                </svg>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Red pulsing dots = blocked IPs · Green dots = monitored regions
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
