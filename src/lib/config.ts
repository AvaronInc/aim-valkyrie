const isDev = import.meta.env.DEV;

// In dev, Vite proxies /api/* -> https://aim.avaron.ai/api/*
// So API_BASE is empty — callers use paths like '/api/approve' directly
// In prod, prepend the full origin
export const API_BASE = isDev ? '' : 'https://aim.avaron.ai';

// WebSocket — will update once real path is confirmed
export const WS_URL = 'wss://aim.avaron.ai/oracle/ws';
