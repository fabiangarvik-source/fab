// Solo mode: one human against bots, entirely in the browser. This module is
// pure (state in, state out) so it can be unit-tested and replayed; the React
// hook in client/useSolo.ts owns the timers and localStorage.

import { MAX_PLAYERS, MIN_PLAYERS } from "../engine/config";
import { applyAction, createGame, legalActions } from "../engine/engine";
import type { Action, GameState, Party, Policy } from "../engine/types";
import { viewFor, type SecretLogEntry } from "../engine/view";
import type { ClientAction, RoomSnapshot } from "../protocol";
import { botAct, botInvestigationClaim, botLegislativeClaim, sortCards, type ClaimInput } from "./bot";

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
  /** Hands each player was passed as Chancellor (what they legitimately saw). */
  received: Record<string, { round: number; cards: Policy[] }[]>;
  claimPrompt: HumanClaimPrompt | null;
}

export type Rand = () => number;

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
  return newGame({ v: 1, humanId: "me", members, game: null as unknown as GameState, gameNumber: 0, received: {}, claimPrompt: null }, rand);
}

export function newGame(st: SoloState, rand: Rand): SoloState {
  return {
    ...st,
    game: createGame(st.members.map(({ id, name }) => ({ id, name })), seedFrom(rand)),
    gameNumber: st.gameNumber + 1,
    received: {},
    claimPrompt: null,
  };
}

/** Secret log entries `id` saw with their own eyes. */
export function secretsFor(game: GameState, id: string): SecretLogEntry[] {
  return game.log.filter((e): e is SecretLogEntry => {
    if (!("secret" in e)) return false;
    if (e.t === "chan_discard") return e.chancellor === id;
    if (e.t === "veto_discard") return false;
    return e.president === id;
  });
}

function botInput(st: SoloState, id: string, rand: Rand) {
  return { view: viewFor(st.game, id, false), secrets: secretsFor(st.game, id), received: st.received[id] ?? [], rand };
}

/** Claims are filed under the round the government served in, not the one that follows. */
function pushClaim(game: GameState, c: ClaimInput, round: number) {
  // Late claims (the human answers whenever they like) go after the last entry of their round.
  const after = game.log.findLastIndex((e) => e.round <= round);
  game.log.splice(after + 1, 0, { ...c, round } as GameState["log"][number]);
}

/** Apply `action` for `playerId`, then let bots in the government say their piece. */
export function act(st: SoloState, playerId: string, action: ClientAction, rand: Rand): { ok: true; state: SoloState } | { ok: false; error: string } {
  const prev = st.game;
  const res = applyAction(prev, { ...action, player: playerId } as Action);
  if (!res.ok) return res;
  const game = res.state;
  const next: SoloState = { ...st, game, received: { ...st.received } };

  // The Chancellor now holds two cards: remember what they were handed.
  if (prev.phase === "pres_legislate" && game.phase === "chan_legislate" && game.chancellorIdx !== null) {
    const chan = game.players[game.chancellorIdx].id;
    next.received[chan] = [...(next.received[chan] ?? []), { round: game.log.findLast((e) => e.t === "draw")!.round, cards: [...game.hand] }];
  }

  // A policy was enacted by a government: claims, President first.
  const newEntries = game.log.slice(prev.log.length);
  const enact = newEntries.find((e) => e.t === "enact");
  if (enact && enact.t === "enact") {
    if (next.claimPrompt?.kind !== "investigate") next.claimPrompt = null;
    let presClaim: Policy[] | null = null;
    for (const [role, id] of [
      ["president", enact.president],
      ["chancellor", enact.chancellor],
    ] as const) {
      const member = st.members.find((m) => m.id === id);
      if (!member) continue;
      if (!member.isBot) {
        const cards =
          role === "president"
            ? (secretsFor(game, id).findLast((e) => e.t === "draw") as Extract<SecretLogEntry, { t: "draw" }> | undefined)?.cards
            : next.received[id]?.at(-1)?.cards;
        if (cards) next.claimPrompt = { kind: role === "president" ? "draw" : "receive", round: enact.round, cards: sortCards(cards) };
        continue;
      }
      // Bots read the log as of now, which already holds the President's claim.
      const claim = botLegislativeClaim({ ...botInput(next, id, rand), view: viewFor(game, id, false) }, role, enact.policy, presClaim);
      if (claim) {
        pushClaim(game, claim, enact.round);
        if (claim.kind === "draw") presClaim = claim.cards;
      }
    }
  }

  // A loyalty investigation finished.
  if (action.type === "ack_investigation") {
    const inv = prev.investigation;
    const member = st.members.find((m) => m.id === playerId);
    if (inv && member?.isBot) {
      const claim = botInvestigationClaim({ ...botInput(next, playerId, rand), view: viewFor(prev, playerId, false) });
      if (claim) pushClaim(game, claim, prev.round);
    } else if (inv) {
      next.claimPrompt = { kind: "investigate", round: prev.round, target: inv.target, party: inv.party };
    }
  }
  if (game.phase === "over") next.claimPrompt = null;
  return { ok: true, state: next };
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
  const action = botAct(botInput(st, id, rand));
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
