import { API_BASE } from "./config";
import { toast } from "sonner";

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
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
    toast.error(`API error: ${msg}`);
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}
