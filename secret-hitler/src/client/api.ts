"use client";

import type { ApiResult, ClientAction, RoomOp, RoomSnapshot } from "../protocol";

export const tokenKey = (code: string) => `sh:token:${code.toUpperCase()}`;

export function storage(key: string, value?: string | null): string | null {
  try {
    if (value === undefined) return localStorage.getItem(key);
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {}
  return null;
}

async function call<T>(url: string, init: RequestInit & { token?: string | null } = {}): Promise<ApiResult<T>> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (init.token) headers["x-player-token"] = init.token;
  try {
    const res = await fetch(url, { ...init, headers, cache: "no-store" });
    const json = (await res.json().catch(() => null)) as ApiResult<T> | null;
    return json ?? { ok: false, error: `Server error (${res.status})` };
  } catch {
    return { ok: false, error: "offline" };
  }
}

export function createRoom(name: string) {
  return call<{ code: string; token: string; snapshot: RoomSnapshot }>("/api/rooms", { method: "POST", body: JSON.stringify({ name }) });
}

export function joinRoom(code: string, name: string | null, token: string | null) {
  return call<{ token: string; snapshot: RoomSnapshot }>(`/api/rooms/${code}/join`, { method: "POST", body: JSON.stringify({ name }), token });
}

export function pollRoom(code: string, token: string | null) {
  return call<{ snapshot: RoomSnapshot }>(`/api/rooms/${code}`, { token });
}

export function roomOp(code: string, req: RoomOp) {
  return call<{ snapshot: RoomSnapshot | null }>(`/api/rooms/${code}`, { method: "POST", body: JSON.stringify(req), token: storage(tokenKey(code)) });
}

export const sendAction = (code: string, action: ClientAction) => roomOp(code, { op: "action", action });

/** Lets components push a fresh snapshot (from an op response) into useRoom. */
type Listener = (s: RoomSnapshot | null) => void;
const listeners = new Set<Listener>();
export function onSnapshot(fn: Listener) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}
export async function op(code: string, req: RoomOp) {
  const res = await roomOp(code, req);
  if (res.ok) listeners.forEach((l) => l(res.snapshot));
  return res;
}
