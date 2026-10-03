// Redaction: builds the only data a given client is allowed to see.
// The server sends the output of these functions and never the raw GameState.

import type { Power } from "./config";
import { boardFor, hitlerKnowsFascists } from "./config";
import { aliveCount, boardPowers, isEligibleChancellor, partyOf, vetoUnlocked } from "./engine";
import type { GameState, Investigation, LogEntry, Party, Phase, Policy, Role, WinReason, Winner } from "./types";

export type PublicLogEntry = Exclude<LogEntry, { secret: true }>;
export type SecretLogEntry = Extract<LogEntry, { secret: true }>;

export interface PublicPlayer {
  id: string;
  name: string;
  seat: number;
  alive: boolean;
  investigated: boolean;
  seenRole: boolean;
}

export interface PublicGame {
  phase: Phase;
  round: number;
  playerCount: number;
  aliveCount: number;
  players: PublicPlayer[];
  presidentId: string;
  chancellorId: string | null;
  lastPresidentId: string | null;
  lastChancellorId: string | null;
  eligibleChancellorIds: string[];
  specialElection: boolean;
  votedIds: string[];
  lastVote: GameState["lastVote"];
  electionTracker: number;
  liberalPolicies: number;
  fascistPolicies: number;
  drawCount: number;
  discardCount: number;
  board: "small" | "medium" | "large";
  powers: (Power | null)[];
  vetoUnlocked: boolean;
  vetoProposed: boolean;
  vetoRefused: boolean;
  log: PublicLogEntry[];
  winner: Winner | null;
  winReason: WinReason | null;
  /** Only filled once the game is over. */
  roles: Record<string, Role> | null;
  /** Only filled once the game is over and the room shows history. */
  secretHistory: SecretLogEntry[] | null;
}

export interface PrivateInfo {
  id: string;
  role: Role;
  party: Party;
  /** Teammates this player learned about at night. */
  knownRoles: { id: string; role: Role }[];
  hand: Policy[] | null;
  myVote: boolean | null;
  peek: Policy[] | null;
  investigation: Investigation | null;
  myInvestigations: Investigation[];
}

export interface GameView {
  game: PublicGame;
  me: PrivateInfo | null;
}

function isSecret(e: LogEntry): e is SecretLogEntry {
  return "secret" in e;
}

export function publicView(s: GameState, showHistory: boolean): PublicGame {
  const over = s.phase === "over";
  return {
    phase: s.phase,
    round: s.round,
    playerCount: s.players.length,
    aliveCount: aliveCount(s),
    players: s.players.map((p, seat) => ({
      id: p.id,
      name: p.name,
      seat,
      alive: p.alive,
      investigated: p.investigated,
      seenRole: p.seenRole,
    })),
    presidentId: s.players[s.presidentIdx].id,
    chancellorId: s.chancellorIdx === null ? null : s.players[s.chancellorIdx].id,
    lastPresidentId: s.lastPresidentIdx === null ? null : s.players[s.lastPresidentIdx].id,
    lastChancellorId: s.lastChancellorIdx === null ? null : s.players[s.lastChancellorIdx].id,
    eligibleChancellorIds: s.phase === "nominate" ? s.players.filter((_, i) => isEligibleChancellor(s, i)).map((p) => p.id) : [],
    specialElection: s.specialCallerIdx !== null,
    votedIds: s.phase === "vote" ? Object.keys(s.votes) : [],
    lastVote: s.lastVote,
    electionTracker: s.electionTracker,
    liberalPolicies: s.liberalPolicies,
    fascistPolicies: s.fascistPolicies,
    drawCount: s.drawPile.length,
    discardCount: s.discardPile.length,
    board: boardFor(s.players.length),
    powers: boardPowers(s),
    vetoUnlocked: vetoUnlocked(s),
    vetoProposed: s.vetoProposed,
    vetoRefused: s.vetoRefused,
    log: s.log.filter((e): e is PublicLogEntry => !isSecret(e)),
    winner: s.winner,
    winReason: s.winReason,
    roles: over ? Object.fromEntries(s.players.map((p) => [p.id, p.role])) : null,
    secretHistory: over && showHistory ? s.log.filter(isSecret) : null,
  };
}

export function knownRolesFor(s: GameState, playerId: string): { id: string; role: Role }[] {
  const me = s.players.find((p) => p.id === playerId);
  if (!me || me.role === "liberal") return [];
  const others = s.players.filter((p) => p.id !== playerId && p.role !== "liberal");
  if (me.role === "hitler" && !hitlerKnowsFascists(s.players.length)) return [];
  return others.map((p) => ({ id: p.id, role: p.role }));
}

export function privateView(s: GameState, playerId: string): PrivateInfo | null {
  const idx = s.players.findIndex((p) => p.id === playerId);
  if (idx < 0) return null;
  const me = s.players[idx];
  const isPres = idx === s.presidentIdx;
  const isChan = idx === s.chancellorIdx;

  let hand: Policy[] | null = null;
  if (s.phase === "pres_legislate" && isPres) hand = [...s.hand];
  if ((s.phase === "chan_legislate" || s.phase === "veto") && (isChan || (s.phase === "veto" && isPres))) hand = [...s.hand];

  return {
    id: me.id,
    role: me.role,
    party: partyOf(me.role),
    knownRoles: knownRolesFor(s, playerId),
    hand,
    myVote: s.phase === "vote" && playerId in s.votes ? s.votes[playerId] : null,
    peek: s.phase === "peek" && isPres ? s.peek : null,
    investigation: s.phase === "investigate_result" && isPres ? s.investigation : null,
    myInvestigations: s.investigations.filter((i) => i.president === playerId),
  };
}

export function viewFor(s: GameState, playerId: string | null, showHistory: boolean): GameView {
  return { game: publicView(s, showHistory), me: playerId ? privateView(s, playerId) : null };
}
