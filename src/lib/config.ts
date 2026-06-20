const apiBase = import.meta.env.VITE_API_BASE ?? 'https://aim-oracle.fly.dev';
const wsUrl   = import.meta.env.VITE_WS_URL   ?? 'wss://aim-oracle.fly.dev/ws';

// In dev, Vite proxies /api/* and /ws -> aim-oracle.fly.dev
// so callers use relative paths; in prod they use the full origin.
export const API_BASE = import.meta.env.DEV ? '' : apiBase;
export const WS_URL   = import.meta.env.DEV ? `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws` : wsUrl;
