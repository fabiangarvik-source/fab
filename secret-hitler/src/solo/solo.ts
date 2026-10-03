// Solo mode: one human against bots, entirely in the browser. This module is
// pure (state in, state out) so it can be unit-tested and replayed; the React
// hook in client/useSolo.ts owns the timers and localStorage.

import { MAX_PLAYERS, MIN_PLAYERS } from "../engine/config";
import { createGame, legalActions } from "../engine/engine";
import type { Action, GameState, Party, Policy } from "../engine/types";
import { viewFor } from "../engine/view";
import type { ClientAction, RoomSnapshot } from "../protocol";
import { sortCards } from "./bot";
import { applyWithClaims, botMove, pushClaim, type Rand } from "./runner";

export { secretsFor } from "./runner";

export const SOLO_CODE = "SOLO";
const BOT_NAMES = ["Ada", "Bruno", "Clara", "Dmitri", "Edith", "Felix", "Greta", "Hugo", "Ilse", "Jonas", "Kurt", "Lotte", "Magda", "Otto"];

export interface SoloMember {
  id: string;
  name: string;
  isBot: boolean;
}

/** A claim the human may make about the government they just served in. */
export type HumanClaimPrompt =
  | { kind: "draw" | "receive"; round: number; cards: Policy[] }
  | { kind: "investigate"; round: number; target: string; party: Party };

export interface SoloState {
  v: 1;
  humanId: string;
  members: SoloMember[];
  game: GameState;
  gameNumber: number;
  claimPrompt: HumanClaimPrompt | null;
}


function seedFrom(rand: Rand) {
  return Math.floor(rand() * 2 ** 31);
}

export function createSolo(humanName: string, playerCount: number, rand: Rand): SoloState {
  const n = Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, playerCount | 0));
  const name = humanName.trim().slice(0, 16) || "You";
  const pool = BOT_NAMES.filter((b) => b.toLowerCase() !== name.toLowerCase());
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const members: SoloMember[] = [{ id: "me", name, isBot: false }, ...pool.slice(0, n - 1).map((b, i) => ({ id: `bot${i + 1}`, name: b, isBot: true }))];
  return newGame({ v: 1, humanId: "me", members, game: null as unknown as GameState, gameNumber: 0, claimPrompt: null }, rand);
}

export function newGame(st: SoloState, rand: Rand): SoloState {
  return {
    ...st,
    game: createGame(st.members.map(({ id, name }) => ({ id, name })), seedFrom(rand)),
    gameNumber: st.gameNumber + 1,
    claimPrompt: null,
  };
}

/** Apply `action` for `playerId`, then let bots in the government say their piece. */
export function act(st: SoloState, playerId: string, action: ClientAction, rand: Rand): { ok: true; state: SoloState } | { ok: false; error: string } {
  const isBot = (id: string) => st.members.find((m) => m.id === id)?.isBot ?? false;
  const res = applyWithClaims(st.game, { ...action, player: playerId } as Action, isBot, rand);
  if (!res.ok) return res;
  let claimPrompt = st.claimPrompt;
  if (res.human.some((h) => h.kind !== "investigate") && claimPrompt?.kind !== "investigate") claimPrompt = null;
  for (const h of res.human) {
    if (h.player !== st.humanId) continue;
    claimPrompt = h.kind === "investigate" ? { kind: h.kind, round: h.round, target: h.target, party: h.party } : { kind: h.kind, round: h.round, cards: sortCards(h.cards) };
  }
  if (res.state.phase === "over") claimPrompt = null;
  return { ok: true, state: { ...st, game: res.state, claimPrompt } };
}

/** The human's public statement (true or not). `null` = say nothing. */
export function humanClaim(st: SoloState, said: Policy[] | Party | null): SoloState {
  const p = st.claimPrompt;
  if (!p) return st;
  const game = structuredClone(st.game);
  if (said !== null) {
    if (p.kind === "investigate") pushClaim(game, { t: "claim", player: st.humanId, kind: "investigate", target: p.target, party: said as Party }, p.round);
    else pushClaim(game, { t: "claim", player: st.humanId, kind: p.kind, cards: sortCards(said as Policy[]) }, p.round);
  }
  return { ...st, game, claimPrompt: null };
}

/** Bots that have something to do right now. */
export function pendingBots(st: SoloState): string[] {
  return st.members.filter((m) => m.isBot && legalActions(st.game, m.id).length > 0).map((m) => m.id);
}

/** Let one bot (or the given seat, for tests) make its move. Returns null if nobody is due. */
export function stepBot(st: SoloState, rand: Rand, seat?: string): SoloState | null {
  const ids = seat ? [seat] : pendingBots(st);
  if (!ids.length) return null;
  const id = ids[Math.floor(rand() * ids.length)];
  const action = botMove(st.game, id, rand);
  if (!action) return null;
  const res = act(st, id, action, rand);
  if (!res.ok) throw new Error(`Bot ${id} made an illegal move ${JSON.stringify(action)}: ${res.error}`);
  return res.state;
}

/** How long a bot "thinks" before its next move, in ms. */
export function botDelay(st: SoloState, rand: Rand) {
  const phase = st.game.phase;
  if (phase === "night") return 150 + rand() * 250;
  if (phase === "vote") return 250 + rand() * 450;
  return 1100 + rand() * 1100;
}

export function soloSnapshot(st: SoloState): RoomSnapshot {
  return {
    code: SOLO_CODE,
    version: 0,
    hostId: st.humanId,
    meId: st.humanId,
    members: st.members.map((m) => ({ ...m, connected: true })),
    settings: { showHistory: true },
    view: viewFor(st.game, st.humanId, true),
    botsAllowed: false,
    gameNumber: st.gameNumber,
    solo: true,
  };
}
