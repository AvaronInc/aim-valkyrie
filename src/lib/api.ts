import { API_BASE } from "./config";
import { toast } from "sonner";

export async function request<T>(path: string, options?: RequestInit): Promise<T | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    const isLocalDevError =
      msg.includes('Failed to fetch') ||
      msg.includes('Load failed') ||
      msg.includes('aborted') ||
      msg.includes('NetworkError');
    if (!isLocalDevError) {
      toast.error(`API error: ${msg}`);
    }
    // Return null instead of throwing so callers don't need try/catch
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
