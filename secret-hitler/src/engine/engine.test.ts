import { describe, expect, it } from "vitest";
import { BOARDS, ROLE_COUNTS } from "./config";
import { applyAction, createGame, isEligibleChancellor, legalActions, nextAlive, playersToAct } from "./engine";
import type { Action, GameState, Policy, Role } from "./types";
import { knownRolesFor, privateView, publicView } from "./view";

// ------------------------------------------------------------ helpers

const ids = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}` }));

function act(s: GameState, a: Action): GameState {
  const r = applyAction(s, a);
  if (!r.ok) throw new Error(`${a.type} by ${a.player}: ${r.error}`);
  return r.state;
}

function rejects(s: GameState, a: Action) {
  const r = applyAction(s, a);
  expect(r.ok).toBe(false);
}

/** A game past the night phase, with seats p0..p(n-1) in order, p0 President,
 *  given roles (default: p0..pk fascist-free liberals, last seat Hitler). */
function game(n: number, opts: { roles?: Role[]; deck?: Policy[]; president?: number } = {}): GameState {
  let s = createGame(ids(n), 42);
  // Put seats back in id order so tests can reason about positions.
  s.players.sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1)));
  const { fascists } = ROLE_COUNTS[n];
  const roles: Role[] =
    opts.roles ??
    Array.from({ length: n }, (_, i) => (i === n - 1 ? "hitler" : i >= n - 1 - fascists ? "fascist" : "liberal"));
  s.players.forEach((p, i) => (p.role = roles[i]));
  if (opts.deck) s.drawPile = [...opts.deck];
  s.presidentIdx = opts.president ?? 0;
  for (const p of s.players) s = act(s, { type: "ack_role", player: p.id });
  return s;
}

const pid = (s: GameState, i: number) => s.players[i].id;

function voteAll(s: GameState, ja: boolean | ((id: string) => boolean)) {
  for (const p of s.players.filter((p) => p.alive)) {
    s = act(s, { type: "vote", player: p.id, ja: typeof ja === "function" ? ja(p.id) : ja });
  }
  return s;
}

function elect(s: GameState, chancellorIdx: number) {
  s = act(s, { type: "nominate", player: pid(s, s.presidentIdx), target: pid(s, chancellorIdx) });
  return voteAll(s, true);
}

function failElection(s: GameState) {
  const c = s.players.findIndex((_, i) => isEligibleChancellor(s, i));
  s = act(s, { type: "nominate", player: pid(s, s.presidentIdx), target: pid(s, c) });
  return voteAll(s, false);
}

/** Elect `chancellorIdx` and enact the given policy (deck should be rigged). */
function legislate(s: GameState, chancellorIdx: number, enact: Policy) {
  s = elect(s, chancellorIdx);
  const pres = pid(s, s.presidentIdx);
  let i = s.hand.findIndex((c) => c !== enact);
  if (i < 0) i = 0;
  s = act(s, { type: "president_discard", player: pres, index: i });
  const j = s.hand.indexOf(enact);
  return act(s, { type: "chancellor_enact", player: pid(s, chancellorIdx), index: j });
}

const F3: Policy[] = ["F", "F", "F"];
const L3: Policy[] = ["L", "L", "L"];
const deck = (...hands: Policy[][]) => hands.flat();

// ------------------------------------------------------------ setup

describe("setup", () => {
  it.each([5, 6, 7, 8, 9, 10, 11, 12])("deals the right roles for %i players", (n) => {
    const s = createGame(ids(n), n * 7);
    const count = (r: Role) => s.players.filter((p) => p.role === r).length;
    expect(count("liberal")).toBe(ROLE_COUNTS[n].liberals);
    expect(count("fascist")).toBe(ROLE_COUNTS[n].fascists);
    expect(count("hitler")).toBe(1);
    expect(s.drawPile.filter((c) => c === "L")).toHaveLength(6);
    expect(s.drawPile.filter((c) => c === "F")).toHaveLength(11);
    expect(s.phase).toBe("night");
  });

  it("uses the fan extension for 11 and 12", () => {
    expect(ROLE_COUNTS[11]).toEqual({ liberals: 6, fascists: 4 });
    expect(ROLE_COUNTS[12]).toEqual({ liberals: 7, fascists: 4 });
    expect(publicView(createGame(ids(12), 1), false).board).toBe("large");
  });

  it("rejects fewer than 5 or more than 12 players", () => {
    expect(() => createGame(ids(4), 1)).toThrow();
    expect(() => createGame(ids(13), 1)).toThrow();
  });

  it("is deterministic for a seed", () => {
    expect(createGame(ids(8), 99)).toEqual(createGame(ids(8), 99));
    expect(createGame(ids(8), 99)).not.toEqual(createGame(ids(8), 100));
  });

  it("starts once everyone has seen their role", () => {
    let s = createGame(ids(5), 3);
    for (const p of s.players.slice(0, 4)) s = act(s, { type: "ack_role", player: p.id });
    expect(s.phase).toBe("night");
    s = act(s, { type: "ack_role", player: s.players[4].id });
    expect(s.phase).toBe("nominate");
  });
});

// ------------------------------------------------------------ night phase

describe("night phase knowledge", () => {
  it("5-6 players: Fascist and Hitler know each other", () => {
    for (const n of [5, 6]) {
      const s = game(n);
      const hitler = s.players.find((p) => p.role === "hitler")!;
      const fascist = s.players.find((p) => p.role === "fascist")!;
      expect(knownRolesFor(s, hitler.id)).toEqual([{ id: fascist.id, role: "fascist" }]);
      expect(knownRolesFor(s, fascist.id)).toEqual([{ id: hitler.id, role: "hitler" }]);
    }
  });

  it.each([7, 8, 9, 10, 11, 12])("%i players: Hitler's reveal does not list the Fascists", (n) => {
    const s = game(n);
    const hitler = s.players.find((p) => p.role === "hitler")!;
    expect(knownRolesFor(s, hitler.id)).toEqual([]);
    expect(privateView(s, hitler.id)!.knownRoles).toEqual([]);
    for (const f of s.players.filter((p) => p.role === "fascist")) {
      const known = knownRolesFor(s, f.id);
      expect(known).toHaveLength(ROLE_COUNTS[n].fascists); // other fascists + Hitler
      expect(known.some((k) => k.role === "hitler")).toBe(true);
    }
  });

  it("Liberals learn nothing", () => {
    const s = game(9);
    expect(knownRolesFor(s, "p0")).toEqual([]);
  });
});

// ------------------------------------------------------------ elections

describe("elections", () => {
  it("President cannot nominate themselves", () => {
    const s = game(7);
    rejects(s, { type: "nominate", player: "p0", target: "p0" });
  });

  it("only the Presidential Candidate can nominate", () => {
    rejects(game(7), { type: "nominate", player: "p1", target: "p2" });
  });

  it("term limits apply to the last elected government", () => {
    let s = game(7, { deck: deck(L3, L3, L3, L3) });
    s = legislate(s, 3, "L"); // government p0 + p3
    expect(s.presidentIdx).toBe(1);
    expect(isEligibleChancellor(s, 0)).toBe(false); // last President
    expect(isEligibleChancellor(s, 3)).toBe(false); // last Chancellor
    expect(isEligibleChancellor(s, 1)).toBe(false); // self
    expect(isEligibleChancellor(s, 2)).toBe(true);
    rejects(s, { type: "nominate", player: "p1", target: "p0" });
  });

  it("failed nominees are not term-limited", () => {
    let s = game(7, { deck: deck(L3, L3) });
    s = legislate(s, 3, "L"); // p0+p3 elected
    s = act(s, { type: "nominate", player: "p1", target: "p2" });
    s = voteAll(s, false); // p1+p2 fail
    expect(s.presidentIdx).toBe(2);
    expect(isEligibleChancellor(s, 1)).toBe(true);
    expect(isEligibleChancellor(s, 3)).toBe(false); // still the last elected Chancellor
  });

  it("a tie fails, a strict majority passes", () => {
    let s = game(6);
    s = act(s, { type: "nominate", player: "p0", target: "p1" });
    s = voteAll(s, (id) => ["p0", "p1", "p2"].includes(id));
    expect(s.lastVote!.passed).toBe(false);
    expect(s.electionTracker).toBe(1);
    expect(s.presidentIdx).toBe(1);

    s = act(s, { type: "nominate", player: "p1", target: "p2" });
    s = voteAll(s, (id) => ["p0", "p1", "p2", "p3"].includes(id));
    expect(s.lastVote!.passed).toBe(true);
    expect(s.phase).toBe("pres_legislate");
  });

  it("no double votes, dead players cannot vote", () => {
    let s = game(7);
    s.players[4].alive = false;
    s = act(s, { type: "nominate", player: "p0", target: "p1" });
    s = act(s, { type: "vote", player: "p0", ja: true });
    rejects(s, { type: "vote", player: "p0", ja: false });
    rejects(s, { type: "vote", player: "p4", ja: true });
  });

  it("votes stay hidden until everyone has voted", () => {
    let s = game(5);
    s = act(s, { type: "nominate", player: "p0", target: "p1" });
    s = act(s, { type: "vote", player: "p2", ja: false });
    const pub = publicView(s, false);
    expect(pub.votedIds).toEqual(["p2"]);
    expect(JSON.stringify(pub)).not.toContain('"p2":false');
    expect(privateView(s, "p3")!.myVote).toBeNull();
    expect(privateView(s, "p2")!.myVote).toBe(false);
  });

  it("Hitler elected Chancellor with 3 Fascist policies wins", () => {
    let s = game(7);
    s.fascistPolicies = 3;
    s = elect(s, 6); // p6 is Hitler
    expect(s.winner).toBe("fascist");
    expect(s.winReason).toBe("hitler_elected");
  });

  it("Hitler elected Chancellor with 2 Fascist policies does not win", () => {
    let s = game(7);
    s.fascistPolicies = 2;
    s = elect(s, 6);
    expect(s.winner).toBeNull();
    expect(s.phase).toBe("pres_legislate");
  });
});

// ------------------------------------------------------------ chaos

describe("election tracker and chaos", () => {
  it("3 failed elections enact the top policy and reset the tracker", () => {
    let s = game(7, { deck: ["L", ...F3, ...F3, ...F3] });
    s = failElection(s);
    s = failElection(s);
    expect(s.electionTracker).toBe(2);
    s = failElection(s);
    expect(s.liberalPolicies).toBe(1);
    expect(s.electionTracker).toBe(0);
    expect(s.drawPile).toHaveLength(9);
  });

  it("chaos clears all term limits", () => {
    let s = game(7, { deck: deck(L3, L3, ["F"], F3, F3) });
    s = legislate(s, 3, "L"); // p0 + p3 elected, p1 next
    expect(s.lastPresidentIdx).toBe(0);
    s = failElection(s);
    s = failElection(s);
    s = failElection(s);
    expect(s.lastPresidentIdx).toBeNull();
    expect(s.lastChancellorIdx).toBeNull();
    expect(s.players.every((_, i) => i === s.presidentIdx || isEligibleChancellor(s, i))).toBe(true);
  });

  it("chaos on a power slot skips the power", () => {
    // 5-6 players: 3rd Fascist policy is Policy Peek.
    let s = game(5, { deck: deck(["F"], F3, F3, F3, F3) });
    s.fascistPolicies = 2;
    s = failElection(s);
    s = failElection(s);
    s = failElection(s);
    expect(s.fascistPolicies).toBe(3);
    expect(s.phase).toBe("nominate");
    expect(s.peek).toBeNull();
  });

  it("chaos can win the game", () => {
    let s = game(5, { deck: deck(["L"], F3, F3) });
    s.liberalPolicies = 4;
    s = failElection(s);
    s = failElection(s);
    s = failElection(s);
    expect(s.winner).toBe("liberal");
  });

  it("tracker resets when a government enacts a policy", () => {
    let s = game(7, { deck: deck(L3, L3) });
    s = failElection(s);
    expect(s.electionTracker).toBe(1);
    s = legislate(s, 3, "L");
    expect(s.electionTracker).toBe(0);
  });

  it("reshuffles after chaos when fewer than 3 cards remain", () => {
    let s = game(5);
    s.drawPile = ["L", "F", "F"];
    s.discardPile = ["F", "F", "L"];
    s = failElection(s);
    s = failElection(s);
    s = failElection(s);
    expect(s.drawPile.length + s.discardPile.length).toBe(5);
    expect(s.discardPile).toHaveLength(0);
    expect(s.drawPile).toHaveLength(5);
  });
});

// ------------------------------------------------------------ legislative session

describe("legislative session", () => {
  it("President discards 1, Chancellor discards 1 and enacts 1", () => {
    let s = game(5, { deck: deck(["F", "L", "F"], L3, L3, L3) });
    s = elect(s, 1);
    expect(s.hand).toEqual(["F", "L", "F"]);
    expect(privateView(s, "p0")!.hand).toEqual(["F", "L", "F"]);
    expect(privateView(s, "p1")!.hand).toBeNull();
    rejects(s, { type: "president_discard", player: "p1", index: 0 });
    s = act(s, { type: "president_discard", player: "p0", index: 0 });
    expect(privateView(s, "p0")!.hand).toBeNull();
    expect(privateView(s, "p1")!.hand).toEqual(["L", "F"]);
    rejects(s, { type: "chancellor_enact", player: "p0", index: 0 });
    s = act(s, { type: "chancellor_enact", player: "p1", index: 0 });
    expect(s.liberalPolicies).toBe(1);
    expect(s.discardPile).toEqual(["F", "F"]);
    expect(s.drawPile).toHaveLength(9);
  });

  it("discards are never in the public view", () => {
    let s = game(5, { deck: deck(["F", "L", "F"], L3, L3, L3) });
    s = legislate(s, 1, "L");
    const pub = publicView(s, true);
    expect(pub.discardCount).toBe(2);
    expect(pub.secretHistory).toBeNull();
    expect(pub.log.some((e) => "secret" in e)).toBe(false);
  });

  it("reshuffles discard + draw when fewer than 3 remain after a session", () => {
    let s = game(5);
    s.drawPile = ["L", "L", "L", "F", "F"];
    s.discardPile = ["F", "F", "F", "F", "F", "F", "F", "F", "F", "L", "L", "L"];
    s = legislate(s, 1, "L");
    expect(s.drawPile).toHaveLength(16);
    expect(s.discardPile).toHaveLength(0);
  });

  it("Liberals win with 5 Liberal policies", () => {
    let s = game(5, { deck: deck(L3, L3) });
    s.liberalPolicies = 4;
    s = legislate(s, 1, "L");
    expect(s.winner).toBe("liberal");
    expect(s.winReason).toBe("liberal_policies");
    expect(s.phase).toBe("over");
  });

  it("Fascists win with 6 Fascist policies", () => {
    let s = game(5, { deck: deck(F3, F3) });
    s.fascistPolicies = 5;
    s = legislate(s, 1, "F");
    expect(s.winner).toBe("fascist");
    expect(s.winReason).toBe("fascist_policies");
  });
});

// ------------------------------------------------------------ veto

describe("veto", () => {
  it("is locked before 5 Fascist policies", () => {
    let s = game(7, { deck: deck(F3, F3) });
    s.fascistPolicies = 4;
    s = elect(s, 1);
    s = act(s, { type: "president_discard", player: "p0", index: 0 });
    rejects(s, { type: "propose_veto", player: "p1" });
  });

  it("agreed veto discards both and advances the tracker", () => {
    let s = game(7, { deck: deck(F3, F3, F3) });
    s.fascistPolicies = 5;
    s = elect(s, 1);
    s = act(s, { type: "president_discard", player: "p0", index: 0 });
    s = act(s, { type: "propose_veto", player: "p1" });
    expect(s.phase).toBe("veto");
    s = act(s, { type: "veto_response", player: "p0", agree: true });
    expect(s.fascistPolicies).toBe(5);
    expect(s.discardPile).toHaveLength(3);
    expect(s.electionTracker).toBe(1);
    expect(s.presidentIdx).toBe(1);
    expect(s.phase).toBe("nominate");
  });

  it("agreed veto with the tracker at 2 triggers chaos", () => {
    let s = game(7, { deck: deck(F3, ["L"], F3) });
    s.fascistPolicies = 5;
    s.electionTracker = 2;
    s = elect(s, 1);
    s = act(s, { type: "president_discard", player: "p0", index: 0 });
    s = act(s, { type: "propose_veto", player: "p1" });
    s = act(s, { type: "veto_response", player: "p0", agree: true });
    expect(s.liberalPolicies).toBe(1);
    expect(s.electionTracker).toBe(0);
    expect(s.lastPresidentIdx).toBeNull();
    expect(s.lastChancellorIdx).toBeNull();
  });

  it("refused veto forces the Chancellor to enact; only one veto per session", () => {
    let s = game(7, { deck: deck(["F", "L", "F"], F3, F3) });
    s.fascistPolicies = 5;
    s = elect(s, 1);
    s = act(s, { type: "president_discard", player: "p0", index: 1 });
    s = act(s, { type: "propose_veto", player: "p1" });
    s = act(s, { type: "veto_response", player: "p0", agree: false });
    expect(s.phase).toBe("chan_legislate");
    rejects(s, { type: "propose_veto", player: "p1" });
    expect(legalActions(s, "p1").some((a) => a.type === "propose_veto")).toBe(false);
    s = act(s, { type: "chancellor_enact", player: "p1", index: 0 });
    expect(s.winner).toBe("fascist");
  });
});

// ------------------------------------------------------------ presidential powers

describe("boards", () => {
  it("has the right powers per player count", () => {
    const pw = (n: number) => publicView(game(n), false).powers;
    expect(pw(5)).toEqual(BOARDS.small);
    expect(pw(6)).toEqual(BOARDS.small);
    expect(pw(7)).toEqual(BOARDS.medium);
    expect(pw(8)).toEqual(BOARDS.medium);
    for (const n of [9, 10, 11, 12]) expect(pw(n)).toEqual(BOARDS.large);
  });

  it("first Fascist policy grants Investigate only for 9+", () => {
    expect(legislate(game(8, { deck: deck(F3, F3) }), 1, "F").phase).toBe("nominate");
    expect(legislate(game(9, { deck: deck(F3, F3) }), 1, "F").phase).toBe("investigate");
    expect(legislate(game(12, { deck: deck(F3, F3) }), 1, "F").phase).toBe("investigate");
  });
});

describe("investigate loyalty", () => {
  it("shows party only to the President; Hitler shows as Fascist; once per player", () => {
    let s = game(9, { deck: deck(F3, F3, F3, F3) });
    s = legislate(s, 1, "F");
    rejects(s, { type: "investigate", player: "p0", target: "p0" });
    s = act(s, { type: "investigate", player: "p0", target: "p8" }); // Hitler
    expect(privateView(s, "p0")!.investigation).toEqual({ president: "p0", target: "p8", party: "fascist" });
    expect(privateView(s, "p1")!.investigation).toBeNull();
    const pub = publicView(s, false);
    expect(JSON.stringify(pub)).not.toContain('"party"');
    expect(pub.players[8].investigated).toBe(true);
    s = act(s, { type: "ack_investigation", player: "p0" });

    s = legislate(s, 2, "F"); // President p1, second investigate
    rejects(s, { type: "investigate", player: "p1", target: "p8" });
    expect(legalActions(s, "p1").some((a) => "target" in a && a.target === "p8")).toBe(false);
    s = act(s, { type: "investigate", player: "p1", target: "p3" });
    expect(s.investigation!.party).toBe("liberal");
  });
});

describe("policy peek", () => {
  it("shows the top 3 without changing the deck", () => {
    let s = game(5, { deck: deck(F3, ["L", "F", "L"], L3, L3) });
    s.fascistPolicies = 2;
    s = legislate(s, 1, "F");
    expect(s.phase).toBe("peek");
    expect(privateView(s, "p0")!.peek).toEqual(["L", "F", "L"]);
    expect(privateView(s, "p1")!.peek).toBeNull();
    s = act(s, { type: "ack_peek", player: "p0" });
    expect(s.drawPile.slice(0, 3)).toEqual(["L", "F", "L"]);
  });

  it("reshuffles right before a peek when fewer than 3 remain", () => {
    let s = game(5);
    s.fascistPolicies = 2;
    s.drawPile = ["F", "F", "F", "L"];
    s.discardPile = ["L", "L", "F", "F"];
    s = legislate(s, 1, "F");
    expect(s.phase).toBe("peek");
    expect(s.drawPile).toHaveLength(7); // 1 left + 6 from discard
    expect(s.peek).toEqual(s.drawPile.slice(0, 3));
    expect(s.log.some((e) => e.t === "reshuffle")).toBe(true);
  });
});

describe("special election", () => {
  it("returns the presidency to the left of the caller afterwards", () => {
    let s = game(7, { deck: deck(F3, L3, L3, L3) });
    s.fascistPolicies = 2;
    s = legislate(s, 3, "F"); // p0 President, 3rd F -> special election
    expect(s.phase).toBe("special");
    s = act(s, { type: "special_election", player: "p0", target: "p4" });
    expect(s.presidentIdx).toBe(4);
    s = legislate(s, 2, "L");
    expect(s.presidentIdx).toBe(1); // back to the left of p0
  });

  it("picking the player who would have been next anyway gives them two turns", () => {
    let s = game(7, { deck: deck(F3, F3, L3, L3, L3) });
    s.fascistPolicies = 2;
    s = legislate(s, 3, "F");
    s = act(s, { type: "special_election", player: "p0", target: "p1" });
    expect(s.presidentIdx).toBe(1);
    s = failElection(s);
    expect(s.presidentIdx).toBe(1); // regular order resumes at p1
    s = failElection(s);
    expect(s.presidentIdx).toBe(2);
  });

  it("ignores term limits for the choice, but not self", () => {
    let s = game(7, { deck: deck(F3, F3, L3) });
    s.fascistPolicies = 2;
    s = legislate(s, 3, "F");
    rejects(s, { type: "special_election", player: "p0", target: "p0" });
    s = act(s, { type: "special_election", player: "p0", target: "p3" }); // last Chancellor
    expect(s.presidentIdx).toBe(3);
  });
});

describe("execution", () => {
  it("kills a non-Hitler player without revealing the role", () => {
    let s = game(7, { deck: deck(F3, F3, L3) });
    s.fascistPolicies = 3;
    s = legislate(s, 1, "F");
    expect(s.phase).toBe("execute");
    s = act(s, { type: "execute", player: "p0", target: "p2" });
    expect(s.players[2].alive).toBe(false);
    expect(publicView(s, false).roles).toBeNull();
    expect(s.winner).toBeNull();
    rejects(s, { type: "nominate", player: pid(s, s.presidentIdx), target: "p2" });
  });

  it("executing Hitler wins for the Liberals", () => {
    let s = game(7, { deck: deck(F3, F3) });
    s.fascistPolicies = 3;
    s = legislate(s, 1, "F");
    s = act(s, { type: "execute", player: "p0", target: "p6" });
    expect(s.winner).toBe("liberal");
    expect(s.winReason).toBe("hitler_executed");
    expect(publicView(s, false).roles!.p6).toBe("hitler");
  });

  it("executing the next Presidential Candidate skips them", () => {
    let s = game(7, { deck: deck(F3, F3, L3) });
    s.fascistPolicies = 3;
    s = legislate(s, 2, "F");
    s = act(s, { type: "execute", player: "p0", target: "p1" });
    expect(s.presidentIdx).toBe(2);
    expect(nextAlive(s, 0)).toBe(2);
  });

  it("term limits with exactly 5 players alive after an execution", () => {
    let s = game(6, { deck: deck(F3, F3, L3, L3) });
    s.fascistPolicies = 3;
    s = legislate(s, 2, "F"); // government p0 + p2; 4th F -> execution
    s = act(s, { type: "execute", player: "p0", target: "p4" });
    expect(s.players.filter((p) => p.alive)).toHaveLength(5);
    expect(s.presidentIdx).toBe(1);
    expect(isEligibleChancellor(s, 0)).toBe(true); // last President is OK with 5 alive
    expect(isEligibleChancellor(s, 2)).toBe(false); // last Chancellor still blocked
    expect(isEligibleChancellor(s, 4)).toBe(false); // dead
  });

  it("with 6 alive the last President is still term-limited", () => {
    let s = game(7, { deck: deck(F3, F3, L3, L3) });
    s.fascistPolicies = 3;
    s = legislate(s, 2, "F");
    s = act(s, { type: "execute", player: "p0", target: "p4" });
    expect(isEligibleChancellor(s, 0)).toBe(false);
  });
});

// ------------------------------------------------------------ redaction

describe("redaction", () => {
  it("never exposes roles before the game ends", () => {
    const s = game(10);
    const pub = JSON.stringify(publicView(s, true));
    expect(pub).not.toMatch(/hitler|fascist"|liberal"/i);
    expect(privateView(s, "p0")!.role).toBe("liberal");
  });

  it("shows secret history at the end only if enabled", () => {
    let s = game(5, { deck: deck(L3, L3) });
    s.liberalPolicies = 4;
    s = legislate(s, 1, "L");
    expect(publicView(s, true).secretHistory!.length).toBeGreaterThan(0);
    expect(publicView(s, false).secretHistory).toBeNull();
  });
});

// ------------------------------------------------------------ random playthroughs

describe("random full games", () => {
  it.each([5, 6, 7, 8, 9, 10, 11, 12])("%i players: 200 random games end legally", (n) => {
    const outcomes = new Set<string>();
    for (let seed = 1; seed <= 200; seed++) {
      let s = createGame(ids(n), seed * 1000 + n);
      let r = seed;
      const pick = <T,>(xs: T[]) => xs[(r = (r * 1103515245 + 12345) & 0x7fffffff) % xs.length];
      let steps = 0;
      while (s.phase !== "over") {
        const actors = playersToAct(s);
        expect(actors.length).toBeGreaterThan(0);
        const a = pick(legalActions(s, pick(actors)));
        s = act(s, a);
        // Invariants
        const cards = s.drawPile.length + s.discardPile.length + s.hand.length + s.liberalPolicies + s.fascistPolicies;
        expect(cards).toBe(17);
        expect(s.electionTracker).toBeLessThan(3);
        if (s.phase === "nominate") expect(s.drawPile.length).toBeGreaterThanOrEqual(3);
        expect(s.players[s.presidentIdx].alive).toBe(true);
        expect(++steps).toBeLessThan(2000);
      }
      outcomes.add(s.winReason!);
    }
    expect(outcomes.size).toBeGreaterThanOrEqual(3);
  });
});
