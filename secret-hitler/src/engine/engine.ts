// Pure, deterministic Secret Hitler rules engine: (state, action) -> new state.
// No I/O, no clocks, no Math.random. All randomness comes from the seeded RNG
// stored inside the state, so the same seed + actions always replay the same game.

import {
  BOARDS,
  CHAOS_AT,
  DECK,
  FASCIST_TO_WIN,
  HITLER_ZONE,
  LIBERAL_TO_WIN,
  MAX_PLAYERS,
  MIN_PLAYERS,
  ROLE_COUNTS,
  VETO_UNLOCK,
  boardFor,
  type Power,
} from "./config";
import type { Action, ActionResult, GameState, LogEntry, Party, Policy, Role } from "./types";

// ---------------------------------------------------------------- RNG

/** mulberry32: advances state.rng and returns a float in [0, 1). */
function rand(s: GameState): number {
  s.rng = (s.rng + 0x6d2b79f5) | 0;
  let t = s.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function shuffle<T>(s: GameState, arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand(s) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ---------------------------------------------------------------- setup

export function createGame(players: { id: string; name: string }[], seed: number): GameState {
  const n = players.length;
  if (n < MIN_PLAYERS || n > MAX_PLAYERS) throw new Error(`Need ${MIN_PLAYERS}-${MAX_PLAYERS} players`);
  if (new Set(players.map((p) => p.id)).size !== n) throw new Error("Duplicate player ids");

  const s: GameState = {
    rng: seed | 0,
    players: [],
    phase: "night",
    round: 0,
    presidentIdx: 0,
    chancellorIdx: null,
    specialCallerIdx: null,
    lastPresidentIdx: null,
    lastChancellorIdx: null,
    votes: {},
    lastVote: null,
    electionTracker: 0,
    liberalPolicies: 0,
    fascistPolicies: 0,
    drawPile: [],
    discardPile: [],
    hand: [],
    vetoProposed: false,
    vetoRefused: false,
    peek: null,
    investigation: null,
    investigations: [],
    winner: null,
    winReason: null,
    log: [],
  };

  const { liberals, fascists } = ROLE_COUNTS[n];
  const roles: Role[] = shuffle(s, [
    ...Array<Role>(liberals).fill("liberal"),
    ...Array<Role>(fascists).fill("fascist"),
    "hitler",
  ]);
  const seats = shuffle(s, [...players]);
  s.players = seats.map((p, i) => ({
    id: p.id,
    name: p.name,
    role: roles[i],
    alive: true,
    investigated: false,
    seenRole: false,
  }));
  s.drawPile = shuffle(s, [
    ...Array<Policy>(DECK.liberal).fill("L"),
    ...Array<Policy>(DECK.fascist).fill("F"),
  ]);
  s.presidentIdx = Math.floor(rand(s) * n);
  log(s, { t: "start", seats: s.players.map((p) => p.id) });
  return s;
}

// ---------------------------------------------------------------- helpers

export function partyOf(role: Role): Party {
  return role === "liberal" ? "liberal" : "fascist";
}

export function aliveCount(s: GameState) {
  return s.players.filter((p) => p.alive).length;
}

export function boardPowers(s: GameState): (Power | null)[] {
  return BOARDS[boardFor(s.players.length)];
}

export function vetoUnlocked(s: GameState) {
  return s.fascistPolicies >= VETO_UNLOCK;
}

/** Next living seat clockwise after `idx`. */
export function nextAlive(s: GameState, idx: number): number {
  const n = s.players.length;
  for (let k = 1; k <= n; k++) {
    const j = (idx + k) % n;
    if (s.players[j].alive) return j;
  }
  throw new Error("No living players");
}

/** Can the current Presidential Candidate nominate seat `idx` as Chancellor? */
export function isEligibleChancellor(s: GameState, idx: number): boolean {
  const p = s.players[idx];
  if (!p || !p.alive) return false;
  if (idx === s.presidentIdx) return false;
  if (idx === s.lastChancellorIdx) return false;
  // With 5 or fewer alive, only the last Chancellor is term-limited.
  if (idx === s.lastPresidentIdx && aliveCount(s) > 5) return false;
  return true;
}

function idxOf(s: GameState, id: string) {
  return s.players.findIndex((p) => p.id === id);
}

function log(s: GameState, e: DistributiveOmit<LogEntry, "round">) {
  s.log.push({ ...e, round: s.round } as LogEntry);
}
type DistributiveOmit<T, K extends keyof never> = T extends unknown ? Omit<T, K> : never;

function reshuffleIfNeeded(s: GameState) {
  if (s.drawPile.length >= 3) return;
  s.drawPile = shuffle(s, [...s.drawPile, ...s.discardPile]);
  s.discardPile = [];
  log(s, { t: "reshuffle", drawSize: s.drawPile.length });
}

function win(s: GameState, winner: Party, reason: GameState["winReason"] & string) {
  s.winner = winner;
  s.winReason = reason;
  s.phase = "over";
  s.hand = [];
  s.peek = null;
  s.investigation = null;
  log(s, { t: "win", winner, reason });
}

/** Returns true if placing the policy ended the game. */
function placePolicy(s: GameState, policy: Policy): boolean {
  if (policy === "L") s.liberalPolicies++;
  else s.fascistPolicies++;
  if (s.liberalPolicies >= LIBERAL_TO_WIN) {
    win(s, "liberal", "liberal_policies");
    return true;
  }
  if (s.fascistPolicies >= FASCIST_TO_WIN) {
    win(s, "fascist", "fascist_policies");
    return true;
  }
  return false;
}

/** Start the next round with the next Presidential Candidate. */
function nextRound(s: GameState) {
  if (s.specialCallerIdx !== null) {
    // The special round is over: continue from the left of the caller.
    s.presidentIdx = nextAlive(s, s.specialCallerIdx);
    s.specialCallerIdx = null;
  } else {
    s.presidentIdx = nextAlive(s, s.presidentIdx);
  }
  beginRound(s);
}

function beginRound(s: GameState) {
  s.round++;
  s.chancellorIdx = null;
  s.votes = {};
  s.hand = [];
  s.vetoProposed = false;
  s.vetoRefused = false;
  s.peek = null;
  s.investigation = null;
  s.phase = "nominate";
}

/** Advance the Election Tracker; at 3, enact the top policy (chaos). */
function advanceTracker(s: GameState) {
  s.electionTracker++;
  log(s, { t: "tracker", value: s.electionTracker });
  if (s.electionTracker < CHAOS_AT) return nextRound(s);

  reshuffleIfNeeded(s);
  const policy = s.drawPile.shift()!;
  s.electionTracker = 0;
  s.lastPresidentIdx = null; // chaos clears all term limits
  s.lastChancellorIdx = null;
  log(s, { t: "chaos", policy });
  if (placePolicy(s, policy)) return; // any power on the slot is ignored
  reshuffleIfNeeded(s);
  nextRound(s);
}

// ---------------------------------------------------------------- reducer

export function applyAction(prev: GameState, action: Action): ActionResult {
  const s: GameState = structuredClone(prev);
  const err = (error: string): ActionResult => ({ ok: false, error });
  const me = idxOf(s, action.player);
  if (me < 0) return err("Unknown player");
  const player = s.players[me];
  if (s.phase === "over") return err("The game is over");

  const isPresident = me === s.presidentIdx;
  const isChancellor = me === s.chancellorIdx;
  const target = "target" in action ? idxOf(s, action.target) : -1;

  switch (action.type) {
    case "ack_role": {
      if (s.phase !== "night") return err("Not the night phase");
      player.seenRole = true;
      if (s.players.every((p) => p.seenRole)) {
        s.round = 0;
        beginRound(s);
      }
      return { ok: true, state: s };
    }

    case "nominate": {
      if (s.phase !== "nominate") return err("Not time to nominate");
      if (!isPresident) return err("Only the Presidential Candidate nominates");
      if (target < 0 || !isEligibleChancellor(s, target)) return err("That player is not eligible");
      s.chancellorIdx = target;
      s.votes = {};
      s.phase = "vote";
      log(s, { t: "nominate", president: player.id, chancellor: s.players[target].id });
      return { ok: true, state: s };
    }

    case "vote": {
      if (s.phase !== "vote") return err("Not time to vote");
      if (!player.alive) return err("Executed players cannot vote");
      if (player.id in s.votes) return err("You already voted");
      s.votes[player.id] = action.ja;
      const voters = s.players.filter((p) => p.alive);
      if (Object.keys(s.votes).length < voters.length) return { ok: true, state: s };

      const ja = Object.values(s.votes).filter(Boolean).length;
      const passed = ja * 2 > voters.length; // strict majority; ties fail
      const pres = s.players[s.presidentIdx];
      const chan = s.players[s.chancellorIdx!];
      s.lastVote = { president: pres.id, chancellor: chan.id, votes: { ...s.votes }, passed };
      log(s, { t: "vote", ...s.lastVote });

      if (!passed) {
        advanceTracker(s);
        return { ok: true, state: s };
      }
      s.lastPresidentIdx = s.presidentIdx;
      s.lastChancellorIdx = s.chancellorIdx;
      if (s.fascistPolicies >= HITLER_ZONE && chan.role === "hitler") {
        win(s, "fascist", "hitler_elected");
        return { ok: true, state: s };
      }
      reshuffleIfNeeded(s);
      s.hand = s.drawPile.splice(0, 3);
      log(s, { t: "draw", secret: true, president: pres.id, cards: [...s.hand] });
      s.phase = "pres_legislate";
      return { ok: true, state: s };
    }

    case "president_discard": {
      if (s.phase !== "pres_legislate") return err("Not the President's legislative turn");
      if (!isPresident) return err("Only the President discards now");
      if (!Number.isInteger(action.index) || action.index < 0 || action.index >= s.hand.length) return err("Bad card");
      const [card] = s.hand.splice(action.index, 1);
      s.discardPile.push(card);
      log(s, { t: "pres_discard", secret: true, president: player.id, card, passed: [...s.hand] });
      s.phase = "chan_legislate";
      return { ok: true, state: s };
    }

    case "chancellor_enact": {
      if (s.phase !== "chan_legislate") return err("Not the Chancellor's legislative turn");
      if (!isChancellor) return err("Only the Chancellor enacts");
      if (!Number.isInteger(action.index) || action.index < 0 || action.index >= s.hand.length) return err("Bad card");
      const policy = s.hand[action.index];
      const discarded = s.hand[1 - action.index];
      s.discardPile.push(discarded);
      s.hand = [];
      log(s, { t: "chan_discard", secret: true, chancellor: player.id, card: discarded });
      log(s, { t: "enact", policy, president: s.players[s.presidentIdx].id, chancellor: player.id });
      s.electionTracker = 0;
      if (placePolicy(s, policy)) return { ok: true, state: s };
      reshuffleIfNeeded(s);

      const power = policy === "F" ? boardPowers(s)[s.fascistPolicies - 1] : null;
      if (!power) {
        nextRound(s);
      } else if (power === "peek") {
        reshuffleIfNeeded(s);
        s.peek = s.drawPile.slice(0, 3);
        log(s, { t: "peek_result", secret: true, president: s.players[s.presidentIdx].id, cards: [...s.peek] });
        s.phase = "peek";
      } else {
        s.phase = power;
      }
      return { ok: true, state: s };
    }

    case "propose_veto": {
      if (s.phase !== "chan_legislate") return err("Not the Chancellor's legislative turn");
      if (!isChancellor) return err("Only the Chancellor can propose a veto");
      if (!vetoUnlocked(s)) return err("Veto is not unlocked yet");
      if (s.vetoProposed) return err("Veto was already proposed this session");
      s.vetoProposed = true;
      s.phase = "veto";
      log(s, { t: "veto_proposed", chancellor: player.id });
      return { ok: true, state: s };
    }

    case "veto_response": {
      if (s.phase !== "veto") return err("No veto to answer");
      if (!isPresident) return err("Only the President answers a veto");
      log(s, { t: "veto", agreed: action.agree, president: player.id });
      if (!action.agree) {
        s.vetoRefused = true;
        s.phase = "chan_legislate";
        return { ok: true, state: s };
      }
      log(s, { t: "veto_discard", secret: true, cards: [...s.hand] });
      s.discardPile.push(...s.hand);
      s.hand = [];
      reshuffleIfNeeded(s);
      advanceTracker(s);
      return { ok: true, state: s };
    }

    case "investigate": {
      if (s.phase !== "investigate") return err("Not time to investigate");
      if (!isPresident) return err("Only the President investigates");
      const t = s.players[target];
      if (!t || target === me || !t.alive) return err("Choose another living player");
      if (t.investigated) return err("That player was already investigated");
      t.investigated = true;
      const inv = { president: player.id, target: t.id, party: partyOf(t.role) };
      s.investigation = inv;
      s.investigations.push(inv);
      log(s, { t: "power", power: "investigate", president: player.id, target: t.id });
      log(s, { t: "investigation_result", secret: true, ...inv });
      s.phase = "investigate_result";
      return { ok: true, state: s };
    }

    case "ack_investigation": {
      if (s.phase !== "investigate_result") return err("Nothing to confirm");
      if (!isPresident) return err("Only the President confirms");
      nextRound(s);
      return { ok: true, state: s };
    }

    case "ack_peek": {
      if (s.phase !== "peek") return err("Nothing to confirm");
      if (!isPresident) return err("Only the President confirms");
      log(s, { t: "power", power: "peek", president: player.id });
      nextRound(s);
      return { ok: true, state: s };
    }

    case "special_election": {
      if (s.phase !== "special") return err("Not time for a Special Election");
      if (!isPresident) return err("Only the President calls a Special Election");
      const t = s.players[target];
      if (!t || target === me || !t.alive) return err("Choose another living player");
      log(s, { t: "power", power: "special", president: player.id, target: t.id });
      s.specialCallerIdx = me;
      s.presidentIdx = target;
      beginRound(s);
      return { ok: true, state: s };
    }

    case "execute": {
      if (s.phase !== "execute") return err("Not time for an execution");
      if (!isPresident) return err("Only the President executes");
      const t = s.players[target];
      if (!t || target === me || !t.alive) return err("Choose another living player");
      t.alive = false;
      log(s, { t: "power", power: "execute", president: player.id, target: t.id });
      if (t.role === "hitler") {
        win(s, "liberal", "hitler_executed");
        return { ok: true, state: s };
      }
      nextRound(s);
      return { ok: true, state: s };
    }
  }
  return err("Unknown action");
}

// ---------------------------------------------------------------- legal actions

/** Every action `playerId` may take right now. Used by bots, tests and the UI. */
export function legalActions(s: GameState, playerId: string): Action[] {
  const me = idxOf(s, playerId);
  if (me < 0 || s.phase === "over") return [];
  const p = s.players[me];
  const player = playerId;
  const others = s.players.filter((o, i) => i !== me && o.alive).map((o) => o.id);
  const isPres = me === s.presidentIdx;

  switch (s.phase) {
    case "night":
      return p.seenRole ? [] : [{ type: "ack_role", player }];
    case "nominate":
      return isPres
        ? s.players.flatMap((o, i) => (isEligibleChancellor(s, i) ? [{ type: "nominate", player, target: o.id } as Action] : []))
        : [];
    case "vote":
      return p.alive && !(playerId in s.votes)
        ? [
            { type: "vote", player, ja: true },
            { type: "vote", player, ja: false },
          ]
        : [];
    case "pres_legislate":
      return isPres ? s.hand.map((_, index) => ({ type: "president_discard", player, index }) as Action) : [];
    case "chan_legislate": {
      if (me !== s.chancellorIdx) return [];
      const acts: Action[] = s.hand.map((_, index) => ({ type: "chancellor_enact", player, index }));
      if (vetoUnlocked(s) && !s.vetoProposed) acts.push({ type: "propose_veto", player });
      return acts;
    }
    case "veto":
      return isPres
        ? [
            { type: "veto_response", player, agree: true },
            { type: "veto_response", player, agree: false },
          ]
        : [];
    case "investigate":
      return isPres
        ? others.filter((id) => !s.players[idxOf(s, id)].investigated).map((target) => ({ type: "investigate", player, target }))
        : [];
    case "investigate_result":
      return isPres ? [{ type: "ack_investigation", player }] : [];
    case "peek":
      return isPres ? [{ type: "ack_peek", player }] : [];
    case "special":
      return isPres ? others.map((target) => ({ type: "special_election", player, target })) : [];
    case "execute":
      return isPres ? others.map((target) => ({ type: "execute", player, target })) : [];
  }
  return [];
}

/** Id of every player who currently has something to do. */
export function playersToAct(s: GameState): string[] {
  return s.players.filter((p) => legalActions(s, p.id).length > 0).map((p) => p.id);
}
