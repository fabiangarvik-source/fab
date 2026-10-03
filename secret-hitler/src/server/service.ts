// Loads rooms, applies changes with optimistic concurrency, and returns
// per-player snapshots. Used by the API route handlers.

import { randomBytes, randomInt } from "node:crypto";
import type { ApiResult, RoomOp, RoomSnapshot } from "../protocol";
import { ROOM_TTL_MS, applyOp, createRoom, joinRoom, newCode, snapshot, tickBots, type Rand, type StoredRoom } from "./rooms";
import { getStore } from "./store";

const rand: Rand = {
  int: (max) => randomInt(max),
  id: (bytes) => randomBytes(bytes).toString("base64url"),
};

export const botsAllowed = () => process.env.NODE_ENV !== "production" || process.env.ENABLE_BOTS === "1";
const PRESENCE_WRITE_MS = 5_000;

type Mutator<T> = (room: StoredRoom) => ({ ok: true; room: StoredRoom | null } & T) | { ok: false; error: string } | "skip";

/** Read-modify-write with compare-and-set; retries when another request won. */
async function mutate<T extends object>(code: string, fn: Mutator<T>): Promise<({ ok: true; room: StoredRoom | null } & T) | { ok: false; error: string }> {
  const store = getStore();
  for (let attempt = 0; attempt < 8; attempt++) {
    const cur = await store.get(code);
    if (!cur) return { ok: false, error: "No room with that code" };
    const res = fn(structuredClone(cur));
    if (res === "skip") return { ok: true, room: cur } as { ok: true; room: StoredRoom } & T;
    if (!res.ok) return res;
    if (res.room === null) {
      await store.delete(code);
      return res;
    }
    res.room.version = cur.version + 1;
    if (await store.replace(res.room, cur.version)) return res;
    await new Promise((r) => setTimeout(r, 15 + Math.random() * 40));
  }
  return { ok: false, error: "The room is busy, try again" };
}

const findByToken = (room: StoredRoom, token: string | null) => (token ? room.members.find((m) => m.token === token) : undefined);

export async function apiCreate(name: unknown): Promise<ApiResult<{ code: string; token: string; snapshot: RoomSnapshot }>> {
  const store = getStore();
  if (Math.random() < 0.05) await store.sweep(ROOM_TTL_MS).catch(() => {});
  for (let i = 0; i < 20; i++) {
    const res = createRoom(newCode(rand), name, rand, Date.now());
    if (!res.ok) return res;
    if (await store.insert(res.room!)) {
      return { ok: true, code: res.room!.code, token: res.member.token, snapshot: snapshot(res.room!, res.member.id, Date.now(), botsAllowed()) };
    }
  }
  return { ok: false, error: "Couldn't find a free room code, try again" };
}

export async function apiJoin(code: string, name: unknown, token: string | null): Promise<ApiResult<{ token: string; snapshot: RoomSnapshot }>> {
  const store = getStore();
  const room = await store.get(code);
  if (!room) return { ok: false, error: "No room with that code" };
  const existing = findByToken(room, token);
  if (existing) return { ok: true, token: existing.token, snapshot: snapshot(room, existing.id, Date.now(), botsAllowed()) };
  let token2 = "";
  let memberId = "";
  const res = await mutate(code, (r) => {
    const j = joinRoom(r, name, rand, Date.now());
    if (j.ok) {
      token2 = j.member.token;
      memberId = j.member.id;
    }
    return j;
  });
  if (!res.ok) return res;
  return { ok: true, token: token2, snapshot: snapshot(res.room!, memberId, Date.now(), botsAllowed()) };
}

/** Poll: returns the snapshot, recording presence and letting due bots move. */
export async function apiGet(code: string, token: string | null): Promise<ApiResult<{ snapshot: RoomSnapshot }>> {
  const store = getStore();
  const room = await store.get(code);
  if (!room) return { ok: false, error: "No room with that code" };
  const me = findByToken(room, token);
  if (token && !me) return { ok: false, error: "Your seat in this room is gone" };
  const now = Date.now();
  const needsPresence = !!me && now - me.lastSeen > PRESENCE_WRITE_MS;
  const bots = botsAllowed();
  const needsBots = bots && !!room.game && room.game.phase !== "over" && room.members.some((m) => m.isBot) && (room.botDueAt ?? 0) <= now;
  if (!needsPresence && !needsBots) return { ok: true, snapshot: snapshot(room, me?.id ?? null, now, bots) };

  const res = await mutate(code, (r) => {
    let changed = false;
    const m = me && r.members.find((x) => x.id === me.id);
    if (m && now - m.lastSeen > PRESENCE_WRITE_MS) {
      m.lastSeen = now;
      changed = true;
    }
    if (bots && tickBots(r, rand, now)) changed = true;
    return changed ? { ok: true, room: r } : "skip";
  });
  if (!res.ok) return { ok: true, snapshot: snapshot(room, me?.id ?? null, now, bots) };
  return { ok: true, snapshot: snapshot(res.room!, me?.id ?? null, now, bots) };
}

export async function apiOp(code: string, token: string | null, req: RoomOp): Promise<ApiResult<{ snapshot: RoomSnapshot | null }>> {
  if (!token) return { ok: false, error: "You are not in this room" };
  let meId = "";
  const res = await mutate(code, (r) => {
    const me = findByToken(r, token);
    if (!me) return { ok: false, error: "You are not in this room" };
    meId = me.id;
    me.lastSeen = Date.now();
    return applyOp(r, me.id, req, rand, Date.now(), botsAllowed());
  });
  if (!res.ok) return res;
  const room = res.room;
  const stillIn = room?.members.some((m) => m.id === meId);
  return { ok: true, snapshot: room && stillIn ? snapshot(room, meId, Date.now(), botsAllowed()) : null };
}
