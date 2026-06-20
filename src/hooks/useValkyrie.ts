import { useLiveSocket } from '../lib/useWebSocket';

export function useValkyrie() {
  const { data, status } = useLiveSocket();
  return {
    payload: data,
    wsStatus: status,
    state: data?.state,
    agents: data?.agents ?? {},
    approvalQueue: data?.approval_queue ?? [],
    actionLog: data?.action_log ?? [],
    defenseMode: data?.defense_mode ?? 'live',
  };
}
