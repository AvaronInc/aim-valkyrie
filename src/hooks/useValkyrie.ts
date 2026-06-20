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
  return result.reverse();
}

export function useValkyrie() {
  const { data, status } = useLiveSocket();

  const actionLog = useMemo(
    () => dedupeActions((data?.action_log ?? []) as ActionEntry[]),
    [data?.action_log],
  );

  // Oracle may use recent_events or events at state level — check both
  const recentEvents = useMemo(() => {
    const s = data?.state as Record<string, unknown> | undefined;
    return (
      (s?.recent_events as unknown[]) ??
      (s?.events as unknown[]) ??
      (data?.recent_events as unknown[]) ??
      []
    );
  }, [data]);

  return {
    payload: data,
    wsStatus: status,
    state: data?.state,
    agents: data?.agents ?? {},
    approvalQueue: data?.approval_queue ?? [],
    actionLog,
    recentEvents,
    defenseMode: (data?.defense_mode as string) ?? 'live',
  };
}
