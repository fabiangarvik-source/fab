// Messages exchanged between the browser and the game server over socket.io.

import type { Action } from "./engine/types";
import type { GameView } from "./engine/view";

export interface RoomSettings {
  showHistory: boolean;
}

export interface MemberInfo {
  id: string;
  name: string;
  connected: boolean;
  isBot: boolean;
}

/** Personalised snapshot pushed to each socket after every change. */
export interface RoomSnapshot {
  code: string;
  hostId: string;
  /** This socket's player id, or null for the table screen. */
  meId: string | null;
  members: MemberInfo[];
  settings: RoomSettings;
  view: GameView | null;
  botsAllowed: boolean;
  gameNumber: number;
}

export type ClientAction = DistributiveOmit<Action, "player">;
type DistributiveOmit<T, K extends keyof never> = T extends unknown ? Omit<T, K> : never;

export type Ack<T = object> = (res: ({ ok: true } & T) | { ok: false; error: string }) => void;

export interface ClientToServer {
  create: (p: { name: string }, ack: Ack<{ code: string; token: string; playerId: string }>) => void;
  join: (p: { code: string; name?: string; token?: string }, ack: Ack<{ token: string; playerId: string }>) => void;
  watch: (p: { code: string }, ack: Ack) => void;
  leave: (ack: Ack) => void;
  kick: (p: { playerId: string }, ack: Ack) => void;
  settings: (p: Partial<RoomSettings>, ack: Ack) => void;
  start: (ack: Ack) => void;
  action: (a: ClientAction, ack: Ack) => void;
  endGame: (ack: Ack) => void;
  playAgain: (ack: Ack) => void;
  addBots: (p: { count: number }, ack: Ack) => void;
}

export interface ServerToClient {
  room: (snap: RoomSnapshot) => void;
  kicked: () => void;
}

export const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I or O
