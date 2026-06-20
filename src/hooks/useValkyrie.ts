import { useMemo } from 'react';
import { useLiveSocket } from '../lib/useWebSocket';

interface ActionEntry { ts: string; action: string; ip?: string; executed?: boolean; }

function dedupeActions(log: ActionEntry[]): ActionEntry[] {
  const seen = new Set<string>();
  const result: ActionEntry[] = [];
  for (const entry of log) {
    const key = `${entry.ts}|${entry.action}|${entry.ip ?? ''}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(entry);
    }
  }
  // Most recent first
  return result.reverse();
}

export function useValkyrie() {
  const { data, status } = useLiveSocket();

  const actionLog = useMemo(
    () => dedupeActions((data?.action_log ?? []) as ActionEntry[]),
    [data?.action_log],
  );

  return {
    payload: data,
    wsStatus: status,
    state: data?.state,
    agents: data?.agents ?? {},
    approvalQueue: data?.approval_queue ?? [],
    actionLog,
    defenseMode: data?.defense_mode ?? 'live',
  };
}
