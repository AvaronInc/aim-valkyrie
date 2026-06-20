const isDev = import.meta.env.DEV;

// HTTP API proxied through Vite in dev to avoid CORS
export const API_BASE = isDev ? '/api' : 'https://aim.avaron.ai/api';

// WebSocket connects directly — CORS doesn't apply to WS
export const WS_URL = 'wss://aim.avaron.ai/ws';
