// Shapes exchanged between the browser and the API routes.

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

/** Personalised snapshot: everything this client may know, nothing more. */
export interface RoomSnapshot {
  code: string;
  version: number;
  hostId: string;
  /** This client's player id, or null for the table screen. */
  meId: string | null;
  members: MemberInfo[];
  settings: RoomSettings;
  view: GameView | null;
  botsAllowed: boolean;
  gameNumber: number;
}

type DistributiveOmit<T, K extends keyof never> = T extends unknown ? Omit<T, K> : never;
export type ClientAction = DistributiveOmit<Action, "player">;

/** Requests a seated player can make (POST /api/rooms/:code with x-player-token). */
export type RoomOp =
  | { op: "leave" }
  | { op: "kick"; playerId: string }
  | { op: "settings"; settings: Partial<RoomSettings> }
  | { op: "start" }
  | { op: "endGame" }
  | { op: "action"; action: ClientAction }
  | { op: "addBots"; count: number };

export type ApiResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

export const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I or O
export const POLL_MS = 1000;
