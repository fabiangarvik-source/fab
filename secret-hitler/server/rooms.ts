// Room bookkeeping: lobby membership, host controls, tokens, bots and expiry.
// The full GameState lives only here; clients get viewFor() snapshots.

import { randomBytes, randomInt } from "node:crypto";
import { MAX_PLAYERS, MIN_PLAYERS } from "../src/engine/config";
import { applyAction, createGame, legalActions } from "../src/engine/engine";
import type { Action, GameState } from "../src/engine/types";
import { viewFor } from "../src/engine/view";
import { CODE_ALPHABET, type ClientAction, type RoomSettings, type RoomSnapshot } from "../src/protocol";

export interface Member {
  id: string;
  token: string;
  name: string;
  isBot: boolean;
  sockets: number;
}

export interface Room {
  code: string;
  hostId: string;
  members: Member[];
  settings: RoomSettings;
  game: GameState | null;
  gameNumber: number;
  lastActivity: number;
  botTimer: ReturnType<typeof setTimeout> | null;
}

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };
const fail = (error: string) => ({ ok: false as const, error });

const ROOM_TTL_MS = 4 * 60 * 60 * 1000;
const BOT_NAMES = ["Ada", "Bruno", "Clara", "Dmitri", "Edith", "Felix", "Greta", "Hugo", "Ilse", "Jonas", "Kurt", "Lotte"];

export class RoomManager {
  rooms = new Map<string, Room>();

  constructor(
    private notify: (room: Room) => void,
    readonly botsAllowed: boolean,
    private botDelay: () => number = () => 700 + Math.random() * 900,
  ) {}

  get(code: string) {
    return this.rooms.get(code.toUpperCase());
  }

  private newCode() {
    for (;;) {
      let code = "";
      for (let i = 0; i < 4; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
      if (!this.rooms.has(code)) return code;
    }
  }

  private touch(room: Room) {
    room.lastActivity = Date.now();
  }

  private addMember(room: Room, name: string, isBot: boolean): Member {
    const m: Member = {
      id: randomBytes(6).toString("hex"),
      token: randomBytes(18).toString("base64url"),
      name,
      isBot,
      sockets: 0,
    };
    room.members.push(m);
    return m;
  }

  create(rawName: string): Result<{ room: Room; member: Member }> {
    const name = cleanName(rawName);
    if (!name) return fail("Pick a nickname");
    const room: Room = {
      code: this.newCode(),
      hostId: "",
      members: [],
      settings: { showHistory: true },
      game: null,
      gameNumber: 0,
      lastActivity: Date.now(),
      botTimer: null,
    };
    const member = this.addMember(room, name, false);
    room.hostId = member.id;
    this.rooms.set(room.code, room);
    return { ok: true, room, member };
  }

  /** Join with a nickname, or resume a seat with a token. */
  join(code: string, rawName: string | undefined, token: string | undefined): Result<{ room: Room; member: Member }> {
    const room = this.get(code);
    if (!room) return fail("No room with that code");
    if (token) {
      const member = room.members.find((m) => m.token === token);
      if (member) {
        this.touch(room);
        return { ok: true, room, member };
      }
      if (!rawName) return fail("Your seat in this room is gone");
    }
    const name = cleanName(rawName ?? "");
    if (!name) return fail("Pick a nickname");
    if (room.game) return fail("A game is already running in this room");
    if (room.members.length >= MAX_PLAYERS) return fail(`Room is full (${MAX_PLAYERS} players max)`);
    if (room.members.some((m) => m.name.toLowerCase() === name.toLowerCase())) return fail("That nickname is taken");
    const member = this.addMember(room, name, false);
    this.touch(room);
    this.notify(room);
    return { ok: true, room, member };
  }

  leave(room: Room, memberId: string): Result {
    if (room.game) return fail("You can't leave during a game");
    this.removeMember(room, memberId);
    return { ok: true };
  }

  kick(room: Room, byId: string, targetId: string): Result {
    if (room.hostId !== byId) return fail("Only the host can kick");
    if (room.game) return fail("You can only kick in the lobby");
    if (targetId === byId) return fail("You can't kick yourself");
    if (!room.members.some((m) => m.id === targetId)) return fail("No such player");
    this.removeMember(room, targetId);
    return { ok: true };
  }

  private removeMember(room: Room, id: string) {
    room.members = room.members.filter((m) => m.id !== id);
    if (!room.members.some((m) => !m.isBot)) {
      this.destroy(room);
      return;
    }
    if (room.hostId === id) room.hostId = room.members.find((m) => !m.isBot)!.id;
    this.touch(room);
    this.notify(room);
  }

  settings(room: Room, byId: string, patch: Partial<RoomSettings>): Result {
    if (room.hostId !== byId) return fail("Only the host can change settings");
    if (typeof patch.showHistory === "boolean") room.settings.showHistory = patch.showHistory;
    this.touch(room);
    this.notify(room);
    return { ok: true };
  }

  addBots(room: Room, byId: string, count: number): Result {
    if (!this.botsAllowed) return fail("Bots are only available in development");
    if (room.hostId !== byId) return fail("Only the host can add bots");
    if (room.game) return fail("Bots can only join in the lobby");
    const n = Math.max(0, Math.min(count | 0, MAX_PLAYERS - room.members.length));
    const taken = new Set(room.members.map((m) => m.name));
    for (let i = 0; i < n; i++) {
      const name = BOT_NAMES.find((b) => !taken.has(`${b} (bot)`)) ?? `Bot ${i}`;
      taken.add(`${name} (bot)`);
      this.addMember(room, `${name} (bot)`, true);
    }
    this.touch(room);
    this.notify(room);
    return { ok: true };
  }

  start(room: Room, byId: string): Result {
    if (room.hostId !== byId) return fail("Only the host can start");
    if (room.game && room.game.phase !== "over") return fail("A game is already running");
    const n = room.members.length;
    if (n < MIN_PLAYERS || n > MAX_PLAYERS) return fail(`Need ${MIN_PLAYERS}-${MAX_PLAYERS} players`);
    room.game = createGame(
      room.members.map((m) => ({ id: m.id, name: m.name })),
      randomInt(2 ** 31),
    );
    room.gameNumber++;
    this.touch(room);
    this.notify(room);
    this.scheduleBots(room);
    return { ok: true };
  }

  /** Host: abandon or finish the game and go back to the lobby. */
  endGame(room: Room, byId: string): Result {
    if (room.hostId !== byId) return fail("Only the host can end the game");
    room.game = null;
    this.touch(room);
    this.notify(room);
    return { ok: true };
  }

  action(room: Room, memberId: string, a: ClientAction): Result {
    if (!room.game) return fail("No game running");
    if (!a || typeof a !== "object" || typeof (a as { type?: unknown }).type !== "string") return fail("Bad action");
    const res = applyAction(room.game, { ...a, player: memberId } as Action);
    if (!res.ok) return res;
    room.game = res.state;
    this.touch(room);
    this.notify(room);
    this.scheduleBots(room);
    return { ok: true };
  }

  /** Bots take one random legal action at a time, with a human-ish delay. */
  scheduleBots(room: Room) {
    if (room.botTimer || !room.game) return;
    const game = room.game;
    const pending = room.members.filter((m) => m.isBot && legalActions(game, m.id).length > 0);
    if (!pending.length) return;
    room.botTimer = setTimeout(() => {
      room.botTimer = null;
      if (!room.game || !this.rooms.has(room.code)) return;
      const bot = pending[Math.floor(Math.random() * pending.length)];
      const acts = legalActions(room.game, bot.id);
      if (acts.length) {
        const a = acts[Math.floor(Math.random() * acts.length)];
        const res = applyAction(room.game, a);
        if (res.ok) {
          room.game = res.state;
          this.notify(room);
        }
      }
      this.scheduleBots(room);
    }, this.botDelay());
  }

  snapshot(room: Room, meId: string | null): RoomSnapshot {
    return {
      code: room.code,
      hostId: room.hostId,
      meId,
      members: room.members.map((m) => ({ id: m.id, name: m.name, connected: m.isBot || m.sockets > 0, isBot: m.isBot })),
      settings: room.settings,
      view: room.game ? viewFor(room.game, meId, room.settings.showHistory) : null,
      botsAllowed: this.botsAllowed,
      gameNumber: room.gameNumber,
    };
  }

  destroy(room: Room) {
    if (room.botTimer) clearTimeout(room.botTimer);
    this.rooms.delete(room.code);
  }

  sweep(now = Date.now()) {
    for (const room of this.rooms.values()) if (now - room.lastActivity > ROOM_TTL_MS) this.destroy(room);
  }
}

function cleanName(raw: string) {
  return String(raw ?? "")
    .replace(/[\u0000-\u001f]/g, "")
    .trim()
    .slice(0, 16);
}
