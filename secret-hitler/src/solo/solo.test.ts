import { describe, expect, it } from "vitest";
import { legalActions } from "../engine/engine";
import type { GameState } from "../engine/types";
import { readTable } from "./bot";
import { act, createSolo, humanClaim, pendingBots, secretsFor, soloSnapshot, stepBot, type SoloState } from "./solo";

function mulberry(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Play a whole game with every seat (the human's too) run by the bot brain. */
function playOut(st: SoloState, rand: () => number) {
  for (let i = 0; i < 5000 && st.game.phase !== "over"; i++) {
    if (st.claimPrompt) st = humanClaim(st, null);
    const human = legalActions(st.game, st.humanId).length ? st.humanId : undefined;
    const next = stepBot(st, rand, human);
    if (!next) throw new Error(`Stuck in ${st.game.phase}`);
    st = next;
  }
  return st;
}

const winners = (games: GameState[]) => ({
  liberal: games.filter((g) => g.winner === "liberal").length,
  fascist: games.filter((g) => g.winner === "fascist").length,
});

describe("solo mode", () => {
  it("sets up one human and the right number of bots", () => {
    const st = createSolo("Fabian", 8, mulberry(1));
    expect(st.members).toHaveLength(8);
    expect(st.members.filter((m) => !m.isBot)).toEqual([{ id: "me", name: "Fabian", isBot: false }]);
    expect(new Set(st.members.map((m) => m.name)).size).toBe(8);
    const snap = soloSnapshot(st);
    expect(snap.solo).toBe(true);
    expect(snap.view?.me?.id).toBe("me");
    // Only the human's own role is in the snapshot until the game ends.
    expect(snap.view?.game.roles).toBeNull();
  });

  it("only lets the bots act on their own turns", () => {
    let st = createSolo("Me", 5, mulberry(2));
    // Night: every bot confirms its role, the human still has to.
    while (pendingBots(st).length) st = stepBot(st, mulberry(3))!;
    expect(st.game.phase).toBe("night");
    const r = act(st, "me", { type: "ack_role" }, mulberry(4));
    expect(r.ok).toBe(true);
  });

  it("finishes hundreds of games at every table size without an illegal move", () => {
    for (let n = 5; n <= 12; n++) {
      const done: GameState[] = [];
      for (let g = 0; g < 60; g++) {
        const rand = mulberry(n * 1000 + g);
        done.push(playOut(createSolo("Me", n, rand), rand).game);
      }
      expect(done.every((g) => g.phase === "over")).toBe(true);
      const w = winners(done);
      // Both teams should win a fair share: the bots are neither hopeless nor unbeatable.
      expect(w.liberal).toBeGreaterThan(8);
      expect(w.fascist).toBeGreaterThan(8);
    }
  }, 120_000);

  it("bots make claims, and Fascists sometimes lie in them", () => {
    let lies = 0;
    let claims = 0;
    for (let g = 0; g < 40; g++) {
      const rand = mulberry(77 + g);
      const end = playOut(createSolo("Me", 7, rand), rand).game;
      const draws = end.log.filter((e) => e.t === "draw");
      for (const c of end.log) {
        if (c.t !== "claim" || c.kind !== "draw") continue;
        claims++;
        const real = draws.findLast((d) => d.t === "draw" && d.president === c.player && d.round <= c.round);
        if (real && real.t === "draw" && real.cards.filter((x) => x === "F").length !== c.cards.filter((x) => x === "F").length) {
          lies++;
          const role = end.players.find((p) => p.id === c.player)!.role;
          expect(role).not.toBe("liberal");
        }
      }
    }
    expect(claims).toBeGreaterThan(50);
    expect(lies).toBeGreaterThan(0);
  });

  it("a bot's view of the table never includes other players' secrets", () => {
    const rand = mulberry(5);
    const st = playOut(createSolo("Me", 9, rand), rand);
    for (const m of st.members) {
      for (const e of secretsFor(st.game, m.id)) {
        if (e.t === "chan_discard") expect(e.chancellor).toBe(m.id);
        else if (e.t !== "veto_discard") expect(e.president).toBe(m.id);
      }
    }
  });

  it("a Liberal President catches a Chancellor who enacts Fascist from a mixed hand", () => {
    // Find a game where a Liberal bot President passed F+L and the Chancellor enacted F.
    for (let seed = 0; seed < 400; seed++) {
      const rand = mulberry(seed);
      let st = createSolo("Me", 7, rand);
      for (let i = 0; i < 3000 && st.game.phase !== "over"; i++) {
        if (st.claimPrompt) st = humanClaim(st, null);
        const human = legalActions(st.game, st.humanId).length ? st.humanId : undefined;
        st = stepBot(st, rand, human)!;
        const last = st.game.log.findLast((e) => e.t === "enact");
        if (!last || last.t !== "enact" || last.policy !== "F") continue;
        const pres = st.game.players.find((p) => p.id === last.president)!;
        const pass = st.game.log.findLast((e) => e.t === "pres_discard");
        if (pres.role !== "liberal" || !pass || pass.t !== "pres_discard" || !pass.passed.includes("L")) continue;
        const read = readTable({ view: soloSnapshotFor(st, pres.id), secrets: secretsFor(st.game, pres.id), received: st.received[pres.id] ?? [] });
        const top = [...read.sus.entries()].sort((a, b) => b[1] - a[1])[0][0];
        expect(top).toBe(last.chancellor);
        return;
      }
    }
    throw new Error("No such game found");
  });
});

import { viewFor } from "../engine/view";
function soloSnapshotFor(st: SoloState, id: string) {
  return viewFor(st.game, id, false);
}
