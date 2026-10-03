"use client";

import { useCallback, useEffect, useState } from "react";
import type { RoomSnapshot } from "../protocol";
import { getSocket, request, storage, tokenKey } from "./socket";

export type ConnStatus = "connecting" | "connected" | "reconnecting";

/**
 * Keeps this tab attached to a room. Players resume their seat with the token
 * stored in localStorage; the table screen just watches.
 */
export function useRoom(code: string, mode: "player" | "table") {
  const [snap, setSnap] = useState<RoomSnapshot | null>(null);
  const [status, setStatus] = useState<ConnStatus>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [needsName, setNeedsName] = useState(false);
  const [kicked, setKicked] = useState(false);

  const attach = useCallback(async () => {
    if (mode === "table") {
      const r = await request("watch", { code });
      if (!r.ok) setError(r.error);
      return;
    }
    const token = storage(tokenKey(code));
    if (!token) {
      setNeedsName(true);
      return;
    }
    const r = await request<{ token: string; playerId: string }>("join", { code, token });
    if (!r.ok) {
      storage(tokenKey(code), null);
      if (r.error.startsWith("No room")) setError(r.error);
      else setNeedsName(true);
    } else {
      setNeedsName(false);
      setError(null);
    }
  }, [code, mode]);

  useEffect(() => {
    const s = getSocket();
    const onRoom = (r: RoomSnapshot) => {
      if (r.code === code.toUpperCase()) setSnap(r);
    };
    const onConnect = () => {
      setStatus("connected");
      void attach();
    };
    const onDisconnect = () => setStatus("reconnecting");
    const onKicked = () => {
      storage(tokenKey(code), null);
      setKicked(true);
      setSnap(null);
    };
    s.on("room", onRoom);
    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.on("kicked", onKicked);
    s.io.on("reconnect_attempt", () => setStatus("reconnecting"));
    if (s.connected) onConnect();
    else s.connect();
    return () => {
      s.off("room", onRoom);
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.off("kicked", onKicked);
    };
  }, [code, attach]);

  const joinWithName = useCallback(
    async (name: string) => {
      const r = await request<{ token: string; playerId: string }>("join", { code, name });
      if (!r.ok) return r.error;
      storage(tokenKey(code), r.token);
      storage("sh:name", name);
      setNeedsName(false);
      setError(null);
      return null;
    },
    [code],
  );

  return { snap, status, error, needsName, kicked, joinWithName };
}
