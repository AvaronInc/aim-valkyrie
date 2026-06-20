import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useValkyrie } from '../hooks/useValkyrie';
import { request } from '../lib/api';
import {
  Shield, Activity, AlertTriangle, Ban, Cpu, Map,
  CheckCircle, XCircle, RefreshCw, Wifi, WifiOff, Loader2,
  ChevronDown, ChevronRight, ArrowRight, Brain, Zap,
} from 'lucide-react';

// ─── Primitives ──────────────────────────────────────────────────────────────
function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={`rounded-lg border border-border bg-card/50 ${className}`}>{children}</div>;
}
function CardHeader({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={`flex flex-row items-center justify-between p-4 pb-2 ${className}`}>{children}</div>;
}
function CardTitle({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <h3 className={`text-sm font-medium text-muted-foreground ${className}`}>{children}</h3>;
}
function CardContent({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={`p-4 pt-0 ${className}`}>{children}</div>;
}
function Badge({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${className}`}>{children}</span>;
}
function Button({ onClick, disabled, children, className = '', variant = 'default' }: {
  onClick?: () => void; disabled?: boolean; children: React.ReactNode; className?: string;
  variant?: 'default' | 'outline' | 'destructive' | 'ghost';
}) {
  const base = 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none disabled:opacity-50 px-3 py-1.5';
  const variants: Record<string, string> = {
    default: 'bg-matrix text-black hover:bg-matrix/90',
    outline: 'border border-border hover:bg-accent text-foreground',
    destructive: 'bg-destructive text-white hover:bg-destructive/90',
    ghost: 'hover:bg-accent text-muted-foreground hover:text-foreground',
  };
  return <button onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${className}`}>{children}</button>;
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface HistoryEvent { ts: string; src_ip: string; event: string; risk: number; action: string; }
interface AgentData {
  agent?: string;
  description?: string;
  thinking?: string;
  upstream_from?: string[];
  confidence?: number;
  grade?: string;
  plan?: Array<{ type: string; reason: string }>;
  escalation?: { level: string; recommended_action: string; risk: number; pending_approvals: number };
  campaign?: { is_campaign: boolean; ip_spread: number; total_attempts: number; verdict: string; top_ips: Array<{ ip: string; count: number }> };
  forecast?: { projected_risk: number; horizon: string; severity: string };
  baseline?: { trend: string; drift: number; baseline_avg: number };
  subagents?: Record<string, unknown>;
  [key: string]: unknown;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
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
function gradeBadge(grade?: string) {
  if (!grade) return 'border-border text-muted-foreground';
  if (grade === 'HIGH' || grade === 'CRITICAL') return 'border-destructive/40 bg-destructive/10 text-destructive';
  if (grade === 'MEDIUM') return 'border-warning/40 bg-warning/10 text-warning';
  return 'border-matrix/40 bg-matrix/10 text-matrix';
}
function WsIndicator({ status }: { status: string }) {
  if (status === 'open') return <span className="flex items-center gap-1.5 text-xs text-matrix"><Wifi className="h-3 w-3" /> LIVE</span>;
  if (status === 'reconnecting') return <span className="flex items-center gap-1.5 text-xs text-warning"><RefreshCw className="h-3 w-3 animate-spin" /> RECONNECTING</span>;
  return <span className="flex items-center gap-1.5 text-xs text-destructive"><WifiOff className="h-3 w-3" /> DISCONNECTED</span>;
}

// ─── Agent card icons ─────────────────────────────────────────────────────────
const AGENT_ICONS: Record<string, React.ReactNode> = {
  watcher:     <Activity className="h-4 w-4 text-matrix" />,
  evaluator:   <Brain className="h-4 w-4 text-tech" />,
  predictor:   <Zap className="h-4 w-4 text-warning" />,
  defender:    <Shield className="h-4 w-4 text-destructive" />,
  governor:    <Shield className="h-4 w-4 text-warning" />,
  correlator:  <Activity className="h-4 w-4 text-tech" />,
  net_triage:  <AlertTriangle className="h-4 w-4 text-warning" />,
};
function agentIcon(key: string) {
  return AGENT_ICONS[key.toLowerCase()] ?? <Cpu className="h-4 w-4 text-muted-foreground" />;
}

// ─── Agent Card ──────────────────────────────────────────────────────────────
function AgentCard({ agentKey, data }: { agentKey: string; data: AgentData }) {
  const [expanded, setExpanded] = useState(false);
  const subagentKeys = Object.keys(data.subagents ?? {});

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            {agentIcon(agentKey)}
            <h3 className="text-sm font-semibold text-foreground capitalize">{data.agent ?? agentKey}</h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {data.grade && <Badge className={gradeBadge(data.grade)}>{data.grade}</Badge>}
            {data.escalation && (
              <Badge className={data.escalation.level === 'CRITICAL' ? 'border-destructive/40 bg-destructive/10 text-destructive' : 'border-warning/40 bg-warning/10 text-warning'}>
                {data.escalation.level}
              </Badge>
            )}
            {data.campaign?.is_campaign && (
              <Badge className="border-destructive/40 bg-destructive/10 text-destructive">CAMPAIGN</Badge>
            )}
          </div>
        </div>
        {data.description && (
          <p className="text-xs text-muted-foreground mt-1.5">{data.description}</p>
        )}
      </div>

      {/* Thinking bubble */}
      {data.thinking && (
        <div className="mx-4 mb-3 rounded-md bg-matrix/5 border border-matrix/20 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Brain className="h-3 w-3 text-matrix" />
            <span className="text-[10px] font-semibold text-matrix uppercase tracking-wider">Thinking</span>
          </div>
          <p className="text-xs text-foreground/80 leading-relaxed">{data.thinking}</p>
        </div>
      )}

      {/* Pipeline flow */}
      {data.upstream_from && data.upstream_from.length > 0 && (
        <div className="mx-4 mb-3 flex items-center gap-1.5 flex-wrap">
          {data.upstream_from.map((up, i) => (
            <span key={i} className="flex items-center gap-1">
              <span className="text-xs font-mono bg-background/60 border border-border px-2 py-0.5 rounded text-muted-foreground capitalize">{up}</span>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
            </span>
          ))}
          <span className="text-xs font-mono bg-matrix/10 border border-matrix/30 px-2 py-0.5 rounded text-matrix capitalize">{data.agent ?? agentKey}</span>
        </div>
      )}

      {/* Key metrics inline */}
      <div className="mx-4 mb-3 grid grid-cols-2 gap-2">
        {data.confidence !== undefined && (
          <div className="rounded-md bg-background/50 border border-border p-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Confidence</p>
            <p className="text-sm font-bold text-foreground">{(data.confidence * 100).toFixed(0)}%</p>
          </div>
        )}
        {data.forecast && (
          <div className="rounded-md bg-background/50 border border-border p-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Forecast ({data.forecast.horizon})</p>
            <p className={`text-sm font-bold ${data.forecast.projected_risk >= 80 ? 'text-destructive' : data.forecast.projected_risk >= 50 ? 'text-warning' : 'text-matrix'}`}>
              Risk {data.forecast.projected_risk}
            </p>
          </div>
        )}
        {data.baseline && (
          <div className="rounded-md bg-background/50 border border-border p-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Baseline Trend</p>
            <p className="text-sm font-bold text-foreground capitalize">{data.baseline.trend} (drift {data.baseline.drift})</p>
          </div>
        )}
        {data.escalation && (
          <div className="rounded-md bg-background/50 border border-border p-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Recommended</p>
            <p className="text-xs text-warning leading-tight">{data.escalation.recommended_action}</p>
          </div>
        )}
        {data.campaign && (
          <div className="rounded-md bg-background/50 border border-border p-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Campaign</p>
            <p className="text-xs text-foreground">{data.campaign.ip_spread} IPs · {data.campaign.total_attempts.toLocaleString()} attempts</p>
          </div>
        )}
        {data.plan && data.plan.length > 0 && (
          <div className="rounded-md bg-background/50 border border-border p-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Active Plan</p>
            <p className="text-xs text-foreground capitalize">{data.plan[0].type}</p>
          </div>
        )}
      </div>

      {/* Campaign top IPs */}
      {data.campaign?.top_ips && data.campaign.top_ips.length > 0 && (
        <div className="mx-4 mb-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Top Attacking IPs</p>
          <div className="space-y-1">
            {data.campaign.top_ips.slice(0, 3).map((entry, i) => (
              <div key={i} className="flex items-center justify-between text-xs font-mono">
                <span className="text-warning">{entry.ip}</span>
                <span className="text-muted-foreground">{entry.count.toLocaleString()} attempts</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subagents expandable */}
      {subagentKeys.length > 0 && (
        <div className="border-t border-border">
          <button
            onClick={() => setExpanded(e => !e)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Cpu className="h-3 w-3" />
              {subagentKeys.length} Subagent{subagentKeys.length !== 1 ? 's' : ''}
            </span>
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
          {expanded && (
            <div className="px-4 pb-4 space-y-2">
              {subagentKeys.map(subKey => (
                <div key={subKey} className="rounded-md bg-background/50 border border-border p-3">
                  <p className="text-[10px] font-semibold text-tech uppercase tracking-wider mb-1.5">{subKey}</p>
                  <pre className="text-[10px] font-mono text-muted-foreground overflow-auto max-h-32 whitespace-pre-wrap break-all leading-relaxed">
                    {JSON.stringify((data.subagents as Record<string, unknown>)[subKey], null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ─── World SVG Map with real-ish country paths ────────────────────────────────
// Simplified country outlines mapped to SVG viewBox 0 0 1000 500
const COUNTRY_CENTERS: Record<string, { cx: number; cy: number; label: string }> = {
  US:  { cx: 200,  cy: 200, label: 'United States' },
  CA:  { cx: 200,  cy: 130, label: 'Canada' },
  MX:  { cx: 210,  cy: 265, label: 'Mexico' },
  BR:  { cx: 330,  cy: 350, label: 'Brazil' },
  AR:  { cx: 305,  cy: 415, label: 'Argentina' },
  GB:  { cx: 472,  cy: 150, label: 'United Kingdom' },
  FR:  { cx: 485,  cy: 170, label: 'France' },
  DE:  { cx: 500,  cy: 157, label: 'Germany' },
  NL:  { cx: 492,  cy: 152, label: 'Netherlands' },
  RU:  { cx: 630,  cy: 130, label: 'Russia' },
  CN:  { cx: 720,  cy: 210, label: 'China' },
  IN:  { cx: 660,  cy: 255, label: 'India' },
  JP:  { cx: 790,  cy: 195, label: 'Japan' },
  KR:  { cx: 770,  cy: 205, label: 'South Korea' },
  AU:  { cx: 770,  cy: 390, label: 'Australia' },
  ZA:  { cx: 535,  cy: 390, label: 'South Africa' },
  NG:  { cx: 500,  cy: 295, label: 'Nigeria' },
  EG:  { cx: 555,  cy: 240, label: 'Egypt' },
  TR:  { cx: 575,  cy: 205, label: 'Turkey' },
  IR:  { cx: 610,  cy: 220, label: 'Iran' },
  SA:  { cx: 595,  cy: 255, label: 'Saudi Arabia' },
  VN:  { cx: 730,  cy: 270, label: 'Vietnam' },
  ID:  { cx: 750,  cy: 315, label: 'Indonesia' },
  PK:  { cx: 640,  cy: 235, label: 'Pakistan' },
  UA:  { cx: 555,  cy: 168, label: 'Ukraine' },
  PL:  { cx: 525,  cy: 157, label: 'Poland' },
  SE:  { cx: 515,  cy: 125, label: 'Sweden' },
  NO:  { cx: 500,  cy: 115, label: 'Norway' },
  ES:  { cx: 470,  cy: 190, label: 'Spain' },
  IT:  { cx: 510,  cy: 185, label: 'Italy' },
  KZ:  { cx: 635,  cy: 180, label: 'Kazakhstan' },
};

// Very simplified continent/land fill shapes as SVG polygons
const LAND_SHAPES = [
  // North America
  'M 100,100 L 280,100 L 300,130 L 290,200 L 270,280 L 240,300 L 200,310 L 180,290 L 160,250 L 120,200 L 100,150 Z',
  // South America
  'M 250,290 L 340,280 L 370,310 L 360,380 L 330,440 L 290,450 L 260,420 L 250,370 L 240,320 Z',
  // Europe
  'M 450,120 L 560,110 L 580,140 L 570,185 L 540,200 L 510,195 L 470,190 L 450,165 L 445,140 Z',
  // Africa
  'M 470,220 L 570,215 L 590,250 L 585,320 L 570,390 L 540,420 L 510,415 L 480,390 L 460,330 L 455,270 Z',
  // Asia (simplified)
  'M 570,100 L 820,95 L 850,140 L 840,220 L 800,280 L 760,310 L 720,300 L 680,280 L 640,260 L 600,240 L 575,200 L 565,160 Z',
  // Australia
  'M 720,355 L 830,350 L 845,385 L 835,420 L 800,435 L 755,430 L 725,410 L 715,385 Z',
  // Greenland
  'M 330,60 L 400,55 L 415,85 L 400,110 L 365,115 L 335,95 Z',
];

function lonLatToXY(lon: number, lat: number): { x: number; y: number } {
  return {
    x: ((lon + 180) / 360) * 1000,
    y: ((90 - lat) / 180) * 500,
  };
}

// Attempt to guess country code from IP (very rough heuristic for demo — real geo needs a DB)
function guessCountry(ip: string): string {
  const first = parseInt(ip.split('.')[0] ?? '0');
  if (first >= 1   && first <= 10)  return 'US';
  if (first >= 11  && first <= 20)  return 'CN';
  if (first >= 21  && first <= 40)  return 'RU';
  if (first >= 41  && first <= 60)  return 'IN';
  if (first >= 61  && first <= 80)  return 'BR';
  if (first >= 81  && first <= 100) return 'DE';
  if (first >= 101 && first <= 110) return 'US';
  if (first >= 111 && first <= 120) return 'CN';
  if (first >= 121 && first <= 130) return 'CN';
  if (first >= 131 && first <= 140) return 'KR';
  if (first >= 141 && first <= 150) return 'JP';
  if (first >= 151 && first <= 160) return 'US';
  if (first >= 161 && first <= 170) return 'IN';
  if (first >= 171 && first <= 180) return 'CN';
  if (first >= 181 && first <= 190) return 'BR';
  if (first >= 191 && first <= 200) return 'AR';
  if (first >= 201 && first <= 210) return 'US';
  if (first >= 211 && first <= 220) return 'CN';
  if (first >= 221 && first <= 230) return 'CN';
  if (first >= 231 && first <= 240) return 'ZA';
  return 'RU';
}

interface ThreatDot {
  ip: string;
  x: number;
  y: number;
  country: string;
  countryLabel: string;
}

function WorldThreatMap({ blockedIps }: { blockedIps: string[] }) {
  const [selected, setSelected] = useState<string | null>(null);

  // Group IPs by country
  const byCountry = blockedIps.reduce<Record<string, string[]>>((acc, ip) => {
    const cc = guessCountry(ip);
    if (!acc[cc]) acc[cc] = [];
    acc[cc].push(ip);
    return acc;
  }, {});

  // Build threat dots — one dot per country, positioned at country center
  const dots: ThreatDot[] = Object.entries(byCountry).map(([cc, ips]) => {
    const center = COUNTRY_CENTERS[cc];
    if (center) {
      return { ip: ips[0], x: center.cx, y: center.cy, country: cc, countryLabel: center.label };
    }
    // Fallback: scatter dot
    const ip = ips[0];
    return {
      ip,
      x: 50 + ((ip.charCodeAt(0) * 37) % 900),
      y: 30 + ((ip.charCodeAt(2) * 53) % 440),
      country: cc,
      countryLabel: cc,
    };
  });

  // Also scatter individual IPs not grouped (if > 1 per country)
  const extraDots: ThreatDot[] = blockedIps.slice(0, 30).map((ip, i) => {
    const cc = guessCountry(ip);
    const center = COUNTRY_CENTERS[cc];
    const jitterX = ((ip.charCodeAt(1) * 13 + i * 17) % 30) - 15;
    const jitterY = ((ip.charCodeAt(3) * 11 + i * 19) % 20) - 10;
    const baseX = center ? center.cx : 50 + ((ip.charCodeAt(0) * 37) % 900);
    const baseY = center ? center.cy : 30 + ((ip.charCodeAt(2) * 53) % 440);
    return { ip, x: baseX + jitterX, y: baseY + jitterY, country: cc, countryLabel: center?.label ?? cc };
  });

  const selectedDot = dots.find(d => d.country === selected);
  const selectedIps = selected ? (byCountry[selected] ?? []) : [];

  return (
    <div className="space-y-4">
      <div className="rounded-lg overflow-hidden border border-border relative">
        <svg viewBox="0 0 1000 500" className="w-full" style={{ background: 'oklch(0.10 0.015 240)' }}>
          {/* Grid */}
          {Array.from({ length: 19 }).map((_, i) => (
            <line key={`v${i}`} x1={(i * 1000) / 18} y1={0} x2={(i * 1000) / 18} y2={500}
              stroke="oklch(0.82 0.22 145 / 5%)" strokeWidth={0.5} />
          ))}
          {Array.from({ length: 10 }).map((_, i) => (
            <line key={`h${i}`} x1={0} y1={(i * 500) / 9} x2={1000} y2={(i * 500) / 9}
              stroke="oklch(0.82 0.22 145 / 5%)" strokeWidth={0.5} />
          ))}
          {/* Equator */}
          <line x1={0} y1={250} x2={1000} y2={250} stroke="oklch(0.82 0.22 145 / 15%)" strokeWidth={0.8} strokeDasharray="4 4" />
          {/* Land shapes */}
          {LAND_SHAPES.map((d, i) => (
            <path key={i} d={d} fill="oklch(0.22 0.02 240)" stroke="oklch(0.82 0.22 145 / 20%)" strokeWidth={0.8} />
          ))}
          {/* Country center markers */}
          {Object.entries(COUNTRY_CENTERS).map(([cc, { cx, cy }]) => (
            <circle key={cc} cx={cx} cy={cy} r={2}
              fill="oklch(0.82 0.22 145 / 25%)" stroke="none" />
          ))}
          {/* Threat dots (extra scattered) */}
          {extraDots.map((dot, i) => (
            <g key={`extra-${i}`}>
              <circle cx={dot.x} cy={dot.y} r={3}
                fill="oklch(0.65 0.28 25 / 30%)"
                stroke="oklch(0.65 0.28 25 / 50%)" strokeWidth={0.5} />
            </g>
          ))}
          {/* Main threat dots — clickable, one per country */}
          {dots.map((dot) => (
            <g
              key={dot.country}
              className="cursor-pointer"
              onClick={() => setSelected(selected === dot.country ? null : dot.country)}
            >
              {/* Pulse ring */}
              <circle cx={dot.x} cy={dot.y} r={16}
                fill="none"
                stroke={selected === dot.country ? 'oklch(0.65 0.28 25 / 60%)' : 'oklch(0.65 0.28 25 / 20%)'}
                strokeWidth={1} />
              <circle cx={dot.x} cy={dot.y} r={10}
                fill="none"
                stroke={selected === dot.country ? 'oklch(0.65 0.28 25 / 40%)' : 'oklch(0.65 0.28 25 / 15%)'}
                strokeWidth={1} />
              {/* Main dot */}
              <circle cx={dot.x} cy={dot.y} r={6}
                fill={selected === dot.country ? 'oklch(0.65 0.28 25 / 80%)' : 'oklch(0.65 0.28 25 / 50%)'}
                stroke="oklch(0.65 0.28 25)" strokeWidth={1.5} />
              {/* IP count badge */}
              {(byCountry[dot.country]?.length ?? 0) > 1 && (
                <>
                  <circle cx={dot.x + 8} cy={dot.y - 8} r={7} fill="oklch(0.15 0.02 240)" stroke="oklch(0.65 0.28 25)" strokeWidth={1} />
                  <text x={dot.x + 8} y={dot.y - 5} textAnchor="middle" fontSize={7} fontWeight="bold" fill="oklch(0.65 0.28 25)">
                    {byCountry[dot.country]?.length}
                  </text>
                </>
              )}
              {/* Country label */}
              <text x={dot.x} y={dot.y + 22} textAnchor="middle" fontSize={7}
                fill={selected === dot.country ? 'oklch(0.90 0.05 240)' : 'oklch(0.70 0.05 240)'}>
                {dot.country}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-destructive/50 border border-destructive" />
          Blocked IP origin
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: 'oklch(0.82 0.22 145 / 30%)' }} />
          Monitored region
        </span>
        <span>Click a dot to see IPs</span>
      </div>

      {/* IP Detail dropdown */}
      {selected && selectedDot && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-foreground text-sm font-semibold flex items-center gap-2">
              <Ban className="h-4 w-4 text-destructive" />
              {selectedDot.countryLabel} — {selectedIps.length} blocked IP{selectedIps.length !== 1 ? 's' : ''}
            </CardTitle>
            <button onClick={() => setSelected(null)} className="text-xs text-muted-foreground hover:text-foreground">✕ Close</button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {selectedIps.map((ip) => (
                <div key={ip} className="rounded-md bg-background/50 border border-destructive/20 px-3 py-2">
                  <span className="text-xs font-mono text-destructive">{ip}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Tab definitions ──────────────────────────────────────────────────────────
const TABS = [
  { id: 'overview',  label: 'Overview',    icon: Activity },
  { id: 'timeline',  label: 'Timeline',    icon: AlertTriangle },
  { id: 'defense',   label: 'Defense Log', icon: Shield },
  { id: 'blocked',   label: 'Blocked IPs', icon: Ban },
  { id: 'agents',    label: 'Agents',      icon: Cpu },
  { id: 'map',       label: 'Threat Map',  icon: Map },
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

  const riskScore   = state?.risk ?? 0;
  const failedAuths = state?.failed ?? 0;
  const blockedIps  = state?.blocked_ips ?? [];
  const recentEvents = state?.recent_events ?? [];
  const agentKeys   = Object.keys(agents);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Shield className="h-7 w-7 text-matrix" />
            Valkyrie
          </h1>
          <p className="text-muted-foreground">SOC Defense Dashboard</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={defenseMode === 'live'
            ? 'border-matrix/40 bg-matrix/10 text-matrix'
            : 'border-warning/40 bg-warning/10 text-warning'}>
            MODE: {defenseMode.toUpperCase()}
          </Badge>
          <WsIndicator status={wsStatus} />
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Risk Score</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${riskScore >= 80 ? 'text-destructive' : riskScore >= 50 ? 'text-warning' : 'text-matrix'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${riskScore >= 80 ? 'text-destructive' : riskScore >= 50 ? 'text-warning' : 'text-matrix'}`}>
              {payload ? riskScore : '–'}
            </div>
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
            <p className="text-xs text-muted-foreground mt-1">{failedAuths === 0 ? 'No failures' : 'Auth failures logged'}</p>
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
            <p className="text-xs text-muted-foreground mt-1">{approvalQueue.length === 0 ? 'Queue clear' : 'Awaiting review'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tab bar */}
      <div className="grid w-full grid-cols-3 gap-1 rounded-lg bg-muted p-1 sm:grid-cols-6">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}>
            <tab.icon className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.id === 'blocked' && blockedIps.length > 0 && (
              <span className="ml-0.5 rounded-full bg-warning/20 text-warning text-[10px] px-1.5 py-0.5 border border-warning/30">{blockedIps.length}</span>
            )}
            {tab.id === 'overview' && approvalQueue.length > 0 && (
              <span className="ml-0.5 rounded-full bg-destructive/20 text-destructive text-[10px] px-1.5 py-0.5 border border-destructive/30">{approvalQueue.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-foreground text-base font-semibold">Agent Status</CardTitle></CardHeader>
              <CardContent>
                {!payload && <div className="flex items-center gap-2 py-4 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /><span className="text-sm">Connecting…</span></div>}
                {payload && agentKeys.length === 0 && <div className="py-8 text-center text-muted-foreground"><Cpu className="h-10 w-10 mx-auto mb-3 opacity-40" /><p className="text-sm">Waiting for agent telemetry…</p></div>}
                {agentKeys.map(key => {
                  const agent = agents[key] as AgentData;
                  const grade = agent?.grade;
                  const isActive = !!(agent?.thinking);
                  return (
                    <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-background/50 mb-2 last:mb-0">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-matrix' : 'bg-muted-foreground'}`} />
                        <div>
                          <span className="text-sm font-mono text-foreground capitalize">{key}</span>
                          {agent?.thinking && <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">{agent.thinking.slice(0, 60)}…</p>}
                        </div>
                      </div>
                      {grade
                        ? <Badge className={gradeBadge(grade)}>{grade}</Badge>
                        : <Badge className="border-matrix/40 bg-matrix/10 text-matrix">ACTIVE</Badge>
                      }
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-foreground text-base font-semibold">Live Event Feed</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {recentEvents.length === 0 && <div className="py-8 text-center text-muted-foreground"><Activity className="h-10 w-10 mx-auto mb-3 opacity-40" /><p className="text-sm">Waiting for events…</p></div>}
                  {[...recentEvents].reverse().map((ev, i) => (
                    <div key={i} className="rounded-lg bg-background/50 p-2.5 text-xs font-mono">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground shrink-0">{ev.ts}</span>
                        <span className="text-tech shrink-0">{ev.type}</span>
                        {ev.src_ip && <span className="text-warning truncate">{ev.src_ip}</span>}
                        {ev.risk != null && <Badge className={`${riskBadge(ev.risk)} shrink-0`}>r={ev.risk}</Badge>}
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
                <Shield className="h-4 w-4 text-tech" />Approval Queue
              </CardTitle>
              <span className={`text-xs ${approvalQueue.length > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>{approvalQueue.length} pending</span>
            </CardHeader>
            <CardContent>
              {approvalQueue.length === 0 && <div className="py-8 text-center text-muted-foreground"><CheckCircle className="h-10 w-10 mx-auto mb-3 opacity-40" /><p className="text-sm">Queue clear.</p></div>}
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
                      <Button onClick={() => decide(item.req_id, 'approved')} disabled={approveLoading === item.req_id} variant="default" className="flex-1">
                        {approveLoading === item.req_id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3 mr-1" />}Approve
                      </Button>
                      <Button onClick={() => decide(item.req_id, 'denied')} disabled={approveLoading === item.req_id} variant="destructive" className="flex-1">
                        <XCircle className="h-3 w-3 mr-1" />Deny
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
            <CardTitle className="text-foreground text-base font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning" />Attack Timeline</CardTitle>
            <input className="bg-background border border-border rounded-md px-3 py-1.5 text-xs font-mono outline-none focus:border-matrix w-48"
              placeholder="Filter by IP…" value={ipFilter}
              onChange={e => { setIpFilter(e.target.value); setTimelinePage(1); }} />
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead><tr className="border-b border-border">
                  {['Timestamp','Source IP','Event','Risk','Action'].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-muted-foreground uppercase tracking-wider text-[10px]">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {timelineLoading && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />Loading events…</td></tr>}
                  {!timelineLoading && (timelineData?.events ?? []).length === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No events found.</td></tr>}
                  {(timelineData?.events ?? []).map((r, i) => (
                    <tr key={i} className="border-b border-border hover:bg-accent/40 transition-colors">
                      <td className="py-2 px-3 text-muted-foreground">{r.ts}</td>
                      <td className="py-2 px-3 text-warning">{r.src_ip}</td>
                      <td className="py-2 px-3 text-foreground">{r.event}</td>
                      <td className="py-2 px-3"><Badge className={riskBadge(r.risk)}>{r.risk}</Badge></td>
                      <td className="py-2 px-3 text-matrix">{r.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
              <Button variant="outline" onClick={() => setTimelinePage(p => Math.max(1, p - 1))} disabled={timelinePage === 1}>← Prev</Button>
              <span>Page {timelinePage}</span>
              <Button variant="outline" onClick={() => setTimelinePage(p => p + 1)}>Next →</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── DEFENSE LOG ── */}
      {activeTab === 'defense' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground text-base font-semibold flex items-center gap-2"><Shield className="h-4 w-4 text-matrix" />Defense Actions</CardTitle>
            <Badge className={defenseMode === 'live' ? 'border-matrix/40 bg-matrix/10 text-matrix' : 'border-warning/40 bg-warning/10 text-warning'}>{defenseMode.toUpperCase()}</Badge>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead><tr className="border-b border-border">
                  {['Timestamp','Action','Target IP','Executed'].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-muted-foreground uppercase tracking-wider text-[10px]">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {actionLog.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-muted-foreground"><Shield className="h-8 w-8 mx-auto mb-2 opacity-40" />No defense actions yet.</td></tr>}
                  {actionLog.map((a, i) => (
                    <tr key={i} className="border-b border-border hover:bg-accent/40 transition-colors">
                      <td className="py-2 px-3 text-muted-foreground">{a.ts}</td>
                      <td className="py-2 px-3 text-tech">{a.action}</td>
                      <td className="py-2 px-3 text-warning">{a.ip ?? '—'}</td>
                      <td className="py-2 px-3">
                        {a.executed
                          ? <span className="flex items-center gap-1 text-matrix"><CheckCircle className="h-3 w-3" />Yes</span>
                          : <span className="flex items-center gap-1 text-destructive"><XCircle className="h-3 w-3" />No</span>}
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
            <CardTitle className="text-foreground text-base font-semibold flex items-center gap-2"><Ban className="h-4 w-4 text-warning" />Blocked IPs</CardTitle>
            <span className={`text-xs ${blockedIps.length > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>{blockedIps.length} blocked</span>
          </CardHeader>
          <CardContent>
            {blockedIps.length === 0 && <div className="py-8 text-center text-muted-foreground"><Ban className="h-10 w-10 mx-auto mb-3 opacity-40" /><p className="text-sm">No blocked IPs.</p></div>}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {blockedIps.map((ip: string) => (
                <div key={ip} className="rounded-lg border border-border bg-background/50 p-4 flex flex-col gap-3">
                  <div>
                    <span className="text-sm font-bold text-destructive font-mono block">{ip}</span>
                    <span className="text-xs text-muted-foreground">Blocked by system</span>
                  </div>
                  <Button variant="outline" onClick={() => unblock(ip)} className="w-full text-warning border-warning/40 hover:bg-warning/10">Unblock</Button>
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
            <Card><CardContent>
              <div className="py-12 text-center text-muted-foreground">
                <Cpu className="h-12 w-12 mx-auto mb-4 opacity-40" />
                <p className="text-sm font-medium">Waiting for agent telemetry…</p>
              </div>
            </CardContent></Card>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {agentKeys.map(key => (
              <AgentCard key={key} agentKey={key} data={agents[key] as AgentData} />
            ))}
          </div>
        </div>
      )}

      {/* ── THREAT MAP ── */}
      {activeTab === 'map' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground text-base font-semibold flex items-center gap-2">
              <Map className="h-4 w-4 text-tech" />World Threat Map
            </CardTitle>
            <span className="text-xs text-muted-foreground">{blockedIps.length} IPs plotted — click a dot to expand</span>
          </CardHeader>
          <CardContent>
            <WorldThreatMap blockedIps={blockedIps} />
          </CardContent>
        </Card>
      )}

    </div>
  );
}
