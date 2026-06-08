import { createContext, useContext } from 'react';
import { LivePayload } from './useWebSocket';

export const LivePayloadContext = createContext<LivePayload | null>(null);
export const useLivePayload = () => useContext(LivePayloadContext);
