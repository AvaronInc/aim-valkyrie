const isDev = import.meta.env.DEV;

export const API_BASE = isDev ? '/oracle' : 'https://aim.avaron.ai/oracle';
export const WS_URL = isDev
  ? `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/oracle/ws`
  : 'wss://aim.avaron.ai/oracle/ws';
