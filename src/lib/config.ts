// Read from .env.local (VITE_ prefix required for Vite to expose to browser)
// Fallback to aim.avaron.ai if not set
const apiBase = import.meta.env.VITE_API_BASE ?? 'https://aim.avaron.ai';
const wsUrl = import.meta.env.VITE_WS_URL ?? 'wss://aim.avaron.ai/ws';

export const API_BASE = import.meta.env.DEV ? '' : apiBase;
export const WS_URL = wsUrl;
