const isDev = import.meta.env.DEV;

export const API_BASE = isDev ? '/api' : 'https://aim.avaron.ai/api';
export const WS_URL = isDev
  ? `ws://${window.location.host}/ws`
  : 'wss://aim.avaron.ai/ws';
