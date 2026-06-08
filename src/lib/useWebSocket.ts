import { useEffect, useRef, useState, useCallback } from "react";
import { WS_URL } from "./config";

export type WsStatus = "connecting" | "open" | "reconnecting" | "closed";

export interface LivePayload {
  state: {
    risk: number;
    failed: number;
    blocked_ips: string[];
    seen_ports: Record<string, number>;
    recent_events: Event[];
  };
  agents: Record<string, unknown>;
  approval_queue: ApprovalItem[];
  action_log: ActionItem[];
  defense_mode: "live" | "simulate";
}

export interface ApprovalItem {
  req_id: string;
  action: string;
  ip: string;
  risk: number;
  agent?: string;
}

export interface ActionItem {
  ts: string;
  action: string;
  ip?: string;
  port?: number;
  executed: boolean;
  mode?: string;
  auto?: boolean;
}

export interface Event {
  ts: string;
  type: string;
  src_ip?: string;
  risk?: number;
  action?: string;
}

export function useLiveSocket() {
  const [data, setData] = useState<LivePayload | null>(null);
  const [status, setStatus] = useState<WsStatus>("connecting");
  const wsRef = useRef<WebSocket | null>(null);
  const retryDelay = useRef(1000);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmounted = useRef(false);

  const connect = useCallback(() => {
    if (unmounted.current) return;
    setStatus(wsRef.current ? "reconnecting" : "connecting");
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    ws.onopen = () => {
      retryDelay.current = 1000;
      setStatus("open");
    };
    ws.onmessage = (e) => {
      try { setData(JSON.parse(e.data)); } catch {}
    };
    ws.onclose = () => {
      if (unmounted.current) return;
      setStatus("reconnecting");
      retryTimer.current = setTimeout(() => {
        retryDelay.current = Math.min(retryDelay.current * 2, 30000);
        connect();
      }, retryDelay.current);
    };
    ws.onerror = () => ws.close();
  }, []);

  useEffect(() => {
    unmounted.current = false;
    connect();
    return () => {
      unmounted.current = true;
      if (retryTimer.current) clearTimeout(retryTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { data, status };
}
