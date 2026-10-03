// Room logic: lobby membership, host controls, tokens, bots and presence.
// Every function here is a pure transformation of a StoredRoom; persistence and
// retries live in service.ts. The full GameState never leaves the server: clients
// only ever receive snapshot(), which goes through the engine's redaction.

import { MAX_PLAYERS, MIN_PLAYERS } from "../engine/config";
import { createGame, legalActions } from "../engine/engine";
import type { Action, GameState } from "../engine/types";
import { viewFor } from "../engine/view";
import { CODE_ALPHABET, type RoomOp, type RoomSettings, type RoomSnapshot } from "../protocol";
import { applyWithClaims, botMove } from "../solo/runner";

export interface StoredMember {
  id: string;
  token: string;
  name: string;
  isBot: boolean;
  lastSeen: number;
}

export interface StoredRoom {
  code: string;
  version: number;
  hostId: string;
  members: StoredMember[];
  settings: RoomSettings;
  game: GameState | null;
  gameNumber: number;
  lastActivity: number;
  botDueAt: number | null;
}

export type OpResult<T = object> = ({ ok: true; room: StoredRoom | null } & T) | { ok: false; error: string };
const fail = (error: string) => ({ ok: false as const, error });

export const ROOM_TTL_MS = 4 * 60 * 60 * 1000;
export const PRESENCE_MS = 12_000;
const BOT_NAMES = ["Ada", "Bruno", "Clara", "Dmitri", "Edith", "Felix", "Greta", "Hugo", "Ilse", "Jonas", "Kurt", "Lotte"];

export interface Rand {
  int(max: number): number;
  id(bytes: number): string;
}

export function newCode(rand: Rand) {
  let code = "";
  for (let i = 0; i < 4; i++) code += CODE_ALPHABET[rand.int(CODE_ALPHABET.length)];
  return code;
}

export function cleanName(raw: unknown) {
  return String(raw ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 16);
}

function newMember(rand: Rand, name: string, isBot: boolean, now: number): StoredMember {
  return { id: rand.id(6), token: rand.id(18), name, isBot, lastSeen: now };
}

export function createRoom(code: string, rawName: unknown, rand: Rand, now: number): OpResult<{ member: StoredMember }> {
  const name = cleanName(rawName);
  if (!name) return fail("Pick a nickname");
  const member = newMember(rand, name, false, now);
  const room: StoredRoom = {
    code,
    version: 1,
    hostId: member.id,
    members: [member],
    settings: { showHistory: true },
    game: null,
    gameNumber: 0,
    lastActivity: now,
    botDueAt: null,
  };
  return { ok: true, room, member };
}

export function joinRoom(room: StoredRoom, rawName: unknown, rand: Rand, now: number): OpResult<{ member: StoredMember }> {
  const name = cleanName(rawName);
  if (!name) return fail("Pick a nickname");
  if (room.game) return fail("A game is already running in this room");
  if (room.members.length >= MAX_PLAYERS) return fail(`This room is full (${MAX_PLAYERS} players max)`);
  if (room.members.some((m) => m.name.toLowerCase() === name.toLowerCase())) return fail("That nickname is taken in this room");
  const member = newMember(rand, name, false, now);
  room.members.push(member);
  room.lastActivity = now;
  return { ok: true, room, member };
}

function removeMember(room: StoredRoom, id: string): StoredRoom | null {
  room.members = room.members.filter((m) => m.id !== id);
  if (!room.members.some((m) => !m.isBot)) return null; // last human left: room is gone
  if (room.hostId === id) room.hostId = room.members.find((m) => !m.isBot)!.id;
  return room;
}

const BOT_DELAY = (rand: Rand) => 600 + rand.int(900);

function pendingBots(room: StoredRoom) {
  const game = room.game;
  if (!game) return [];
  return room.members.filter((m) => m.isBot && legalActions(game, m.id).length > 0);
}

/** Apply a player's request. Returns the new room (null = room deleted). */
export function applyOp(room: StoredRoom, memberId: string, req: RoomOp, rand: Rand, now: number, botsAllowed: boolean): OpResult {
  const isHost = room.hostId === memberId;
  room.lastActivity = now;
  switch (req.op) {
    case "leave":
      if (room.game && room.game.phase !== "over") return fail("You can't leave during a game");
      return { ok: true, room: removeMember(room, memberId) };

    case "kick":
      if (!isHost) return fail("Only the host can remove players");
      if (room.game && room.game.phase !== "over") return fail("You can only remove players in the lobby");
      if (req.playerId === memberId) return fail("You can't remove yourself");
      if (!room.members.some((m) => m.id === req.playerId)) return fail("No such player");
      room.game = null;
      return { ok: true, room: removeMember(room, req.playerId) };

    case "settings":
      if (!isHost) return fail("Only the host can change settings");
      if (typeof req.settings?.showHistory === "boolean") room.settings.showHistory = req.settings.showHistory;
      return { ok: true, room };

    case "addBots": {
      if (!botsAllowed) return fail("Bots are turned off on this server");
      if (!isHost) return fail("Only the host can add bots");
      if (room.game) return fail("Bots can only join in the lobby");
      const n = Math.max(0, Math.min(Number(req.count) | 0, MAX_PLAYERS - room.members.length));
      const taken = new Set(room.members.map((m) => m.name));
      for (let i = 0; i < n; i++) {
        const base = BOT_NAMES.find((b) => !taken.has(`${b} (bot)`)) ?? `Bot${room.members.length}`;
        taken.add(`${base} (bot)`);
        room.members.push(newMember(rand, `${base} (bot)`, true, now));
      }
      return { ok: true, room };
    }

    case "start": {
      if (!isHost) return fail("Only the host can start the game");
      if (room.game && room.game.phase !== "over") return fail("A game is already running");
      const n = room.members.length;
      if (n < MIN_PLAYERS || n > MAX_PLAYERS) return fail(`Need ${MIN_PLAYERS}–${MAX_PLAYERS} players to start`);
      room.game = createGame(
        room.members.map((m) => ({ id: m.id, name: m.name })),
        rand.int(2 ** 31),
      );
      room.gameNumber++;
      room.botDueAt = now + BOT_DELAY(rand);
      return { ok: true, room };
    }

    case "endGame":
      if (!isHost) return fail("Only the host can end the game");
      room.game = null;
      room.botDueAt = null;
      return { ok: true, room };

    case "action": {
      if (!room.game) return fail("No game is running");
      const a = req.action as { type?: unknown } | undefined;
      if (!a || typeof a !== "object" || typeof a.type !== "string") return fail("Bad action");
      const res = applyWithClaims(room.game, { ...(req.action as object), player: memberId } as Action, isBotIn(room), unit(rand));
      if (!res.ok) return res;
      room.game = res.state;
      room.botDueAt = now + BOT_DELAY(rand);
      return { ok: true, room };
    }
  }
  return fail("Unknown request");
}

const isBotIn = (room: StoredRoom) => (id: string) => room.members.find((m) => m.id === id)?.isBot ?? false;
const unit = (rand: Rand) => () => rand.int(1_000_000) / 1_000_000;

/**
 * Lets due bots move: every pending bot votes at once (ballots are secret and
 * simultaneous anyway), otherwise one bot takes its turn. Returns true if the room changed.
 */
export function tickBots(room: StoredRoom, rand: Rand, now: number): boolean {
  let bots = pendingBots(room);
  if (!bots.length || !room.game) return false;
  if (room.botDueAt !== null && room.botDueAt > now) return false;
  if (room.game.phase !== "vote") bots = [bots[rand.int(bots.length)]];
  let changed = false;
  for (const bot of bots) {
    const game: GameState = room.game;
    const action = botMove(game, bot.id, unit(rand));
    const res = action && applyWithClaims(game, { ...action, player: bot.id } as Action, isBotIn(room), unit(rand));
    if (!res || !res.ok) {
      // Never let a bot stall the room: fall back to any legal move.
      const acts = legalActions(game, bot.id);
      if (!acts.length) continue;
      const fb = applyWithClaims(game, acts[rand.int(acts.length)], isBotIn(room), unit(rand));
      if (!fb.ok) continue;
      room.game = fb.state;
    } else room.game = res.state;
    changed = true;
  }
  if (!changed) return false;
  room.botDueAt = now + BOT_DELAY(rand);
  room.lastActivity = now;
  return true;
}

export function snapshot(room: StoredRoom, meId: string | null, now: number, botsAllowed: boolean): RoomSnapshot {
  return {
    code: room.code,
    version: room.version,
    hostId: room.hostId,
    meId,
    members: room.members.map((m) => ({ id: m.id, name: m.name, isBot: m.isBot, connected: m.isBot || now - m.lastSeen < PRESENCE_MS })),
    settings: room.settings,
    view: room.game ? viewFor(room.game, meId, room.settings.showHistory) : null,
    botsAllowed,
    gameNumber: room.gameNumber,
  };
}
