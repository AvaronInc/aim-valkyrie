const isDev = import.meta.env.DEV;

// HTTP API proxied through Vite in dev to avoid CORS
export const API_BASE = isDev ? '/api' : 'https://aim.avaron.ai/api';

// WebSocket — Oracle sits behind nginx at /oracle/ws
export const WS_URL = 'wss://aim.avaron.ai/oracle/ws';
