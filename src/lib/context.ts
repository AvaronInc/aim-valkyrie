import { createContext, useContext } from 'react';
import type { LivePayload } from './useWebSocket';

export const LivePayloadContext = createContext<LivePayload | null>(null);
export const useLivePayload = () => useContext(LivePayloadContext);
