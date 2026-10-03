"use client";

import { io, type Socket } from "socket.io-client";
import type { ClientToServer, ServerToClient } from "../protocol";

export type GameSocket = Socket<ServerToClient, ClientToServer>;

let socket: GameSocket | null = null;

export function getSocket(): GameSocket {
  if (!socket) {
    socket = io({ transports: ["websocket", "polling"], reconnectionDelay: 500, reconnectionDelayMax: 3000 });
    // Phones suspend sockets when locked; reconnect as soon as we're visible again.
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && socket && !socket.connected) socket.connect();
    });
  }
  return socket;
}

type AckRes<T> = ({ ok: true } & T) | { ok: false; error: string };

/** Emit an event and resolve with the server's ack. */
export function request<T = object>(event: keyof ClientToServer, ...args: unknown[]): Promise<AckRes<T>> {
  const s = getSocket();
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ ok: false, error: "The server didn't answer. Check your connection." }), 8000);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (s.emit as any)(event, ...args, (res: AckRes<T>) => {
      clearTimeout(timer);
      resolve(res);
    });
  });
}

export const tokenKey = (code: string) => `sh:token:${code.toUpperCase()}`;

export function storage(key: string, value?: string | null): string | null {
  try {
    if (value === undefined) return localStorage.getItem(key);
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {}
  return null;
}
