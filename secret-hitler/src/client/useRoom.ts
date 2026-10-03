"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { POLL_MS, type RoomSnapshot } from "../protocol";
import { joinRoom, onSnapshot, pollRoom, storage, tokenKey } from "./api";

/**
 * Keeps this tab in sync with a room by polling the API (Vercel functions can't
 * hold WebSockets). Players resume their seat with the token in localStorage.
 */
export function useRoom(code: string, mode: "player" | "table") {
  const [snap, setSnap] = useState<RoomSnapshot | null>(null);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsName, setNeedsName] = useState(false);
  const [left, setLeft] = useState(false);
  const last = useRef<string>("");

  const accept = useCallback((s: RoomSnapshot | null) => {
    if (s === null) {
      setLeft(true);
      setSnap(null);
      return;
    }
    const key = JSON.stringify(s);
    if (key !== last.current) {
      last.current = key;
      setSnap(s);
    }
  }, []);

  useEffect(() => onSnapshot(accept), [accept]);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const token = () => (mode === "player" ? storage(tokenKey(code)) : null);

    let busy = false;
    const tick = async () => {
      if (stopped || busy) return;
      if (document.visibilityState === "hidden") {
        timer = setTimeout(tick, POLL_MS * 3);
        return;
      }
      const t = token();
      if (mode === "player" && !t) {
        setNeedsName(true);
        timer = setTimeout(tick, POLL_MS);
        return;
      }
      busy = true;
      const res = await pollRoom(code, t);
      busy = false;
      if (stopped) return;
      if (res.ok) {
        setOffline(false);
        setError(null);
        setNeedsName(false);
        accept(res.snapshot);
      } else if (res.error === "offline" || res.error.startsWith("Server error")) {
        setOffline(true);
      } else if (res.error === "Your seat in this room is gone") {
        storage(tokenKey(code), null);
        setLeft(true);
        setSnap(null);
      } else {
        setError(res.error);
      }
      timer = setTimeout(tick, POLL_MS);
    };
    const wake = () => {
      if (document.visibilityState === "visible") {
        clearTimeout(timer);
        void tick();
      }
    };
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("online", wake);
    void tick();
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("online", wake);
    };
  }, [code, mode, accept]);

  const joinWithName = useCallback(
    async (name: string) => {
      const res = await joinRoom(code, name, null);
      if (!res.ok) return res.error === "offline" ? "You're offline. Check your connection." : res.error;
      storage(tokenKey(code), res.token);
      storage("sh:name", name);
      setNeedsName(false);
      setLeft(false);
      accept(res.snapshot);
      return null;
    },
    [code, accept],
  );

  return { snap, offline, error, needsName, left, joinWithName };
}
