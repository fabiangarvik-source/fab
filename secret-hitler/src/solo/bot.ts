// Bot brain for solo mode. A bot only ever sees what a human in its seat would
// see: the redacted GameView (public board + its own private info) and the
// secret log entries about its own hands. It never reads the raw GameState.
//
// Liberals keep a suspicion score per player built from enacted policies,
// votes and claims, and vote, nominate and shoot by it. Fascists know their
// team, push Fascist policies, lie in their claims to cover for it and try to
// get Hitler elected once three Fascist policies are down. Hitler (in 7+
// player games he doesn't know his team) plays Liberal to earn trust.

import { HITLER_ZONE, LIBERAL_TO_WIN, FASCIST_TO_WIN } from "../engine/config";
import type { LogEntry, Party, Policy } from "../engine/types";
import type { GameView, SecretLogEntry } from "../engine/view";
import type { ClientAction } from "../protocol";

export type Claim = Extract<LogEntry, { t: "claim" }>;
export type ClaimInput = Claim extends infer C ? (C extends unknown ? Omit<C, "round"> : never) : never;
type Rand = () => number;

export interface BotInput {
  view: GameView;
  /** Secret log entries this bot legitimately knows (its own draws, discards, investigations). */
  secrets: SecretLogEntry[];
  /** Hands this bot was passed as Chancellor, by round. */
  received: { round: number; cards: Policy[] }[];
  rand: Rand;
}

// ---------------------------------------------------------------- reading the table

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

const countF = (cs: Policy[]) => cs.filter((c) => c === "F").length;
const sameCards = (a: Policy[], b: Policy[]) => countF(a) === countF(b) && a.length === b.length;

/** What an honest President passes on from a draw: discard a Fascist if there is one. */
function honestPass(draw: Policy[]): Policy[] {
  const out = [...draw];
  const i = out.indexOf("F");
  out.splice(i >= 0 ? i : 0, 1);
  return out;
}

interface Gov {
  round: number;
  president: string;
  chancellor: string;
  policy: Policy;
  presClaim?: Policy[];
  chanClaim?: Policy[];
  jaVoters: string[];
}

export interface Read {
  /** Higher = more likely Fascist, from this bot's point of view. */
  sus: Map<string, number>;
  /** Players proven not to be Hitler (elected Chancellor in the Hitler zone and the game went on). */
  notHitler: Set<string>;
}

/**
 * Suspicion as a Liberal in this seat would reason. `useKnown` also folds in
 * the bot's secret team knowledge (true for real decisions; Fascists pass
 * false to see how the table sees everyone).
 */
export function readTable({ view, secrets, received }: Pick<BotInput, "view" | "secrets" | "received">, useKnown = true): Read {
  const { game, me } = view;
  const myId = me!.id;
  const sus = new Map<string, number>();
  const add = (id: string, v: number) => sus.set(id, (sus.get(id) ?? 0) + v);
  for (const p of game.players) sus.set(p.id, (hash(myId + p.id) - 0.5) * 0.5);

  const notHitler = new Set<string>();
  const govs: Gov[] = [];
  let fascists = 0;
  let lastVote: { president: string; chancellor: string; ja: string[] } | null = null;
  for (const e of game.log) {
    if (e.t === "vote") {
      lastVote = e.passed ? { president: e.president, chancellor: e.chancellor, ja: Object.keys(e.votes).filter((k) => e.votes[k]) } : null;
      if (e.passed && fascists >= HITLER_ZONE) notHitler.add(e.chancellor);
    } else if (e.t === "enact") {
      govs.push({ round: e.round, president: e.president, chancellor: e.chancellor, policy: e.policy, jaVoters: lastVote?.ja ?? [] });
      if (e.policy === "F") fascists++;
    } else if (e.t === "chaos") {
      if (e.policy === "F") fascists++;
    } else if (e.t === "claim") {
      if (e.kind === "investigate") {
        if (e.target === myId) add(e.player, e.party === "fascist" && me!.party === "liberal" ? 12 : -0.5);
        else add(e.target, e.party === "fascist" ? 2.5 : -1.5);
        continue;
      }
      const g = govs.findLast((x) => (e.kind === "draw" ? x.president : x.chancellor) === e.player);
      if (g && e.kind === "draw") g.presClaim = e.cards;
      if (g && e.kind === "receive") g.chanClaim = e.cards;
    }
  }

  // What this bot itself saw while legislating.
  const myPasses = secrets.filter((s): s is Extract<SecretLogEntry, { t: "pres_discard" }> => s.t === "pres_discard" && s.president === myId);

  for (const g of govs) {
    const iWasPres = g.president === myId;
    const iWasChan = g.chancellor === myId;
    if (g.policy === "F") {
      add(g.president, 1);
      add(g.chancellor, 1.2);
      for (const v of g.jaVoters) add(v, 0.25);
    } else {
      add(g.president, -0.8);
      add(g.chancellor, -0.8);
      for (const v of g.jaVoters) add(v, -0.15);
    }

    if (iWasPres) {
      const mine = myPasses.find((d) => d.round === g.round);
      if (mine) {
        if (g.policy === "F" && mine.passed.includes("L")) add(g.chancellor, 9);
        if (g.chanClaim && !sameCards(g.chanClaim, mine.passed)) add(g.chancellor, 9);
      }
      continue;
    }
    if (iWasChan) {
      const got = received.find((r) => r.round === g.round)?.cards;
      if (got && g.presClaim && !sameCards(honestPass(g.presClaim), got)) add(g.president, 9);
      else if (got && countF(got) === 2) add(g.president, 1.5);
      continue;
    }

    // Someone else's government: compare the two stories.
    if (g.presClaim && g.chanClaim) {
      if (!sameCards(honestPass(g.presClaim), g.chanClaim)) {
        add(g.president, 1.8);
        add(g.chancellor, 1.8);
      }
    }
    if (g.chanClaim) {
      if (g.policy === "F" && g.chanClaim.includes("L") && g.chanClaim.length === 2) add(g.chancellor, 3); // chose F over L
      if (g.policy === "L" && countF(g.chanClaim) === 2) add(g.chancellor, 1); // impossible story
    }
    if (g.presClaim && countF(g.presClaim) === 3) {
      add(g.president, 0.3);
    }
  }

  for (const inv of me!.myInvestigations) add(inv.target, inv.party === "fascist" ? 25 : -25);
  if (useKnown) for (const k of me!.knownRoles) sus.set(k.id, 100);
  sus.set(myId, me!.party === "liberal" || !useKnown ? -100 : 100);
  return { sus, notHitler };
}

// ---------------------------------------------------------------- helpers

function pick<T>(rand: Rand, xs: T[]): T {
  return xs[Math.floor(rand() * xs.length)];
}

function by<T>(xs: T[], score: (x: T) => number): T[] {
  return [...xs].sort((a, b) => score(a) - score(b));
}

interface Ctx extends BotInput {
  myId: string;
  team: Set<string>; // known Fascists incl. Hitler, excluding me
  hitlerId: string | null;
  isLiberal: boolean;
  isHitler: boolean;
  /** A Fascist who knows the team (every Fascist; Hitler only in 5-6 player games). */
  plotting: boolean;
  read: Read;
  publicRead: Read;
  alive: string[];
}

function context(input: BotInput): Ctx {
  const me = input.view.me!;
  const team = new Set(me.knownRoles.map((k) => k.id));
  const isHitler = me.role === "hitler";
  return {
    ...input,
    myId: me.id,
    team,
    hitlerId: isHitler ? me.id : (me.knownRoles.find((k) => k.role === "hitler")?.id ?? null),
    isLiberal: me.role === "liberal",
    isHitler,
    plotting: me.role === "fascist" || (isHitler && team.size > 0),
    read: readTable(input, true),
    publicRead: readTable(input, false),
    alive: input.view.game.players.filter((p) => p.alive).map((p) => p.id),
  };
}

const s = (c: Ctx, id: string) => c.read.sus.get(id) ?? 0;
const ps = (c: Ctx, id: string) => c.publicRead.sus.get(id) ?? 0;

// ---------------------------------------------------------------- decisions

function vote(c: Ctx): boolean {
  const g = c.view.game;
  const pres = g.presidentId;
  const chan = g.chancellorId!;
  const zone = g.fascistPolicies >= HITLER_ZONE;
  if (pres === c.myId || chan === c.myId) return true;

  if (c.plotting) {
    if (zone && chan === c.hitlerId) return true;
    if (g.fascistPolicies === FASCIST_TO_WIN - 1 && (c.team.has(pres) || c.team.has(chan))) return true;
    if (c.team.has(pres) || c.team.has(chan)) return c.rand() < 0.85;
    // An all-Liberal government: block it now and then, but don't stand out.
    if (g.liberalPolicies === LIBERAL_TO_WIN - 1) return false;
    if (g.electionTracker < 2 && c.rand() < 0.35) return false;
  }

  // Liberal reasoning (also Hitler in 7+, and Fascists blending in).
  const risk = Math.max(s(c, pres), s(c, chan));
  let threshold = 1.1 + (c.rand() - 0.5) * 0.6;
  if (g.electionTracker === 2) threshold += 1.2;
  if (zone && !c.read.notHitler.has(chan)) threshold -= 0.6 + 0.15 * g.fascistPolicies;
  if (c.plotting) threshold += 0.5; // a Fascist doesn't mind a bit of risk
  return risk < threshold;
}

function nominate(c: Ctx): string {
  const g = c.view.game;
  const eligible = g.eligibleChancellorIds;
  const zone = g.fascistPolicies >= HITLER_ZONE;
  if (c.plotting) {
    if (zone && c.hitlerId && eligible.includes(c.hitlerId) && c.rand() < 0.85) return c.hitlerId;
    const mates = eligible.filter((id) => c.team.has(id) && ps(c, id) < 2);
    if (mates.length && c.rand() < 0.45) return pick(c.rand, mates);
    return by(eligible.filter((id) => !c.team.has(id)).length ? eligible.filter((id) => !c.team.has(id)) : eligible, (id) => ps(c, id) + c.rand() * 0.6)[0];
  }
  const safe = zone ? eligible.filter((id) => c.read.notHitler.has(id) && s(c, id) < 1) : [];
  if (safe.length) return by(safe, (id) => s(c, id))[0];
  return by(eligible, (id) => s(c, id) + c.rand() * 0.4 + (zone && !c.read.notHitler.has(id) ? 0.4 : 0))[0];
}

/** Index of the card the President discards. */
function presidentDiscard(c: Ctx, hand: Policy[]): number {
  const g = c.view.game;
  const chan = g.chancellorId!;
  const iF = hand.indexOf("F");
  const iL = hand.indexOf("L");
  if (iF < 0 || iL < 0) return 0;
  if (c.isLiberal) return iF;
  if (c.plotting) {
    const chanIsMate = c.team.has(chan);
    if (g.fascistPolicies === FASCIST_TO_WIN - 1) return iL;
    if (g.liberalPolicies === LIBERAL_TO_WIN - 1) return iL;
    if (chanIsMate) return iL;
    // Earn some trust early with a Liberal chancellor.
    return g.fascistPolicies <= 1 && c.rand() < 0.4 ? iF : iL;
  }
  // Hitler without a team: mostly play Liberal, slip a Fascist through to a suspicious chancellor.
  return s(c, chan) > 2 && c.rand() < 0.6 ? iL : iF;
}

function chancellorChoice(c: Ctx, hand: Policy[]): ClientAction {
  const g = c.view.game;
  const iF = hand.indexOf("F");
  const iL = hand.indexOf("L");
  if (g.vetoUnlocked && !g.vetoProposed) {
    if (c.isLiberal && iL < 0) return { type: "propose_veto" };
    if (!c.isLiberal && iF < 0 && g.liberalPolicies === LIBERAL_TO_WIN - 1) return { type: "propose_veto" };
  }
  if (iF < 0 || iL < 0) return { type: "chancellor_enact", index: 0 };
  if (c.isLiberal) return { type: "chancellor_enact", index: iL };
  if (g.fascistPolicies === FASCIST_TO_WIN - 1 || g.liberalPolicies === LIBERAL_TO_WIN - 1) return { type: "chancellor_enact", index: iF };
  const presIsMate = c.team.has(g.presidentId);
  if (c.isHitler) {
    // Hitler wants to look clean so he gets elected later.
    const cautious = g.fascistPolicies < HITLER_ZONE ? 0.7 : 0.4;
    return { type: "chancellor_enact", index: presIsMate || c.rand() >= cautious ? iF : iL };
  }
  return { type: "chancellor_enact", index: presIsMate || c.rand() < 0.8 ? iF : iL };
}

function vetoResponse(c: Ctx): boolean {
  const passed = c.secrets.filter((x): x is Extract<SecretLogEntry, { t: "pres_discard" }> => x.t === "pres_discard" && x.president === c.myId).at(-1)?.passed ?? [];
  const fs = countF(passed);
  if (c.isLiberal) return fs === 2;
  if (c.plotting) return fs === 0;
  return fs === 2;
}

function target(c: Ctx, kind: "investigate" | "execute" | "special"): string {
  const g = c.view.game;
  let pool = c.alive.filter((id) => id !== c.myId);
  if (kind === "investigate") pool = pool.filter((id) => !g.players.find((p) => p.id === id)!.investigated);
  const known = new Set(c.view.me!.myInvestigations.map((i) => i.target));
  if (c.plotting) {
    const libs = pool.filter((id) => !c.team.has(id));
    if (kind === "execute") return by(libs.length ? libs : pool, (id) => ps(c, id) + c.rand() * 0.8)[0];
    if (kind === "special") {
      const mates = pool.filter((id) => c.team.has(id));
      return mates.length ? pick(c.rand, mates) : by(pool, (id) => ps(c, id))[0];
    }
    return pick(c.rand, pool);
  }
  if (kind === "execute") return by(pool, (id) => -s(c, id) - c.rand() * 0.3)[0];
  if (kind === "special") return by(pool, (id) => s(c, id) + c.rand() * 0.3)[0];
  // Investigate the most suspicious player we don't already know about.
  const unknown = pool.filter((id) => !known.has(id));
  return by(unknown.length ? unknown : pool, (id) => -s(c, id) - c.rand() * 0.5)[0];
}

/** The bot's move, or null if it has nothing to do. */
export function botAct(input: BotInput): ClientAction | null {
  const { view } = input;
  const me = view.me;
  if (!me) return null;
  const g = view.game;
  const p = g.players.find((x) => x.id === me.id)!;
  if (g.phase === "night") return p.seenRole ? null : { type: "ack_role" };
  if (!p.alive || g.phase === "over") return null;
  const isPres = me.id === g.presidentId;
  const isChan = me.id === g.chancellorId;

  if (g.phase === "vote") return g.votedIds.includes(me.id) ? null : { type: "vote", ja: vote(context(input)) };
  if (g.phase === "chan_legislate") return isChan && me.hand ? chancellorChoice(context(input), me.hand) : null;
  if (!isPres) return null;
  switch (g.phase) {
    case "nominate":
      return { type: "nominate", target: nominate(context(input)) };
    case "pres_legislate":
      return me.hand ? { type: "president_discard", index: presidentDiscard(context(input), me.hand) } : null;
    case "veto":
      return { type: "veto_response", agree: vetoResponse(context(input)) };
    case "investigate":
      return { type: "investigate", target: target(context(input), "investigate") };
    case "investigate_result":
      return { type: "ack_investigation" };
    case "peek":
      return { type: "ack_peek" };
    case "special":
      return { type: "special_election", target: target(context(input), "special") };
    case "execute":
      return { type: "execute", target: target(context(input), "execute") };
  }
  return null;
}

// ---------------------------------------------------------------- claims

/**
 * What this bot tells the table about the government it just served in.
 * `presClaim` is the President's story when the Chancellor speaks second.
 */
export function botLegislativeClaim(input: BotInput, role: "president" | "chancellor", enacted: Policy, presClaim: Policy[] | null): ClaimInput | null {
  const c = context(input);
  if (role === "president") {
    const d = c.secrets.filter((x): x is Extract<SecretLogEntry, { t: "pres_discard" }> => x.t === "pres_discard" && x.president === c.myId).at(-1);
    const draw = c.secrets.filter((x): x is Extract<SecretLogEntry, { t: "draw" }> => x.t === "draw" && x.president === c.myId).at(-1);
    if (!d || !draw) return null;
    let cards = draw.cards;
    if (!c.isLiberal && d.card === "L") {
      // Hide the Liberal we threw away: pretend we discarded a Fascist.
      cards = [...d.passed, "F"];
      if (c.team.has(c.view.game.chancellorId ?? "") && enacted === "F") cards = ["F", "F", "F"];
    }
    return { t: "claim", player: c.myId, kind: "draw", cards: sortCards(cards) };
  }
  const got = c.received.at(-1);
  if (!got) return null;
  let cards = got.cards;
  if (!c.isLiberal && enacted === "F" && cards.includes("L")) {
    // Blame the President: "they only gave me Fascists".
    cards = ["F", "F"];
    if (presClaim && c.team.has(c.view.game.presidentId) && !sameCards(honestPass(presClaim), cards)) cards = honestPass(presClaim);
  }
  return { t: "claim", player: c.myId, kind: "receive", cards: sortCards(cards) };
}

export function botInvestigationClaim(input: BotInput): ClaimInput | null {
  const c = context(input);
  const inv = c.view.me!.myInvestigations.at(-1);
  if (!inv) return null;
  let party: Party = inv.party;
  if (c.plotting) {
    if (c.team.has(inv.target)) party = "liberal";
    else if (c.rand() < 0.45) party = "fascist";
  }
  return { t: "claim", player: c.myId, kind: "investigate", target: inv.target, party };
}

export function sortCards(cs: Policy[]): Policy[] {
  return [...cs].sort((a, b) => (a === b ? 0 : a === "F" ? -1 : 1));
}
