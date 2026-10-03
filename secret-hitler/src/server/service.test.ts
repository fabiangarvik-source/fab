import { beforeEach, describe, expect, it } from "vitest";
import type { RoomSnapshot } from "../protocol";
import { apiCreate, apiGet, apiJoin, apiOp } from "./service";
import { MemoryStore, setStoreForTests } from "./store";

let store: MemoryStore;
beforeEach(() => {
  store = new MemoryStore();
  setStoreForTests(store);
});

function ok<T>(r: { ok: true } & T): T;
function ok<T>(r: ({ ok: true } & T) | { ok: false; error: string }): T;
function ok<T>(r: ({ ok: true } & T) | { ok: false; error: string }): T {
  if (!r.ok) throw new Error(r.error);
  return r;
}

async function room(n: number) {
  const host = ok(await apiCreate("Host"));
  const tokens = [host.token];
  for (let i = 1; i < n; i++) tokens.push(ok(await apiJoin(host.code, `P${i}`, null)).token);
  return { code: host.code, tokens };
}

const snapOf = async (code: string, token: string | null) => ok(await apiGet(code, token)).snapshot as RoomSnapshot;

describe("rooms over the API", () => {
  it("creates 4-letter codes without I or O", async () => {
    for (let i = 0; i < 30; i++) {
      const { code } = ok(await apiCreate("A"));
      expect(code).toMatch(/^[A-HJ-NP-Z]{4}$/);
    }
  });

  it("resumes a seat with the token instead of adding a player", async () => {
    const { code, tokens } = await room(3);
    const again = ok(await apiJoin(code, "Whatever", tokens[1]));
    expect(again.token).toBe(tokens[1]);
    expect((await snapOf(code, tokens[0])).members).toHaveLength(3);
  });

  it("rejects duplicate names, a 13th player and joins mid-game", async () => {
    const { code, tokens } = await room(12);
    expect((await apiJoin(code, "Late", null)).ok).toBe(false);
    expect((await apiJoin(code, "host", null)).ok).toBe(false);
    ok(await apiOp(code, tokens[0], { op: "start" }));
    const r = await apiJoin(code, "Another", null);
    expect(r.ok).toBe(false);
  });

  it("only the host starts, and only with 5-12 players", async () => {
    const { code, tokens } = await room(4);
    expect((await apiOp(code, tokens[0], { op: "start" })).ok).toBe(false);
    ok(await apiJoin(code, "P5", null));
    expect((await apiOp(code, tokens[1], { op: "start" })).ok).toBe(false);
    ok(await apiOp(code, tokens[0], { op: "start" }));
    expect((await snapOf(code, tokens[0])).view?.game.phase).toBe("night");
  });

  it("host can kick in the lobby; the kicked token stops working", async () => {
    const { code, tokens } = await room(3);
    const s = await snapOf(code, tokens[2]);
    ok(await apiOp(code, tokens[0], { op: "kick", playerId: s.meId! }));
    expect((await apiGet(code, tokens[2])).ok).toBe(false);
    expect((await snapOf(code, tokens[0])).members).toHaveLength(2);
  });

  it("host leaving hands the room to the next player", async () => {
    const { code, tokens } = await room(3);
    ok(await apiOp(code, tokens[0], { op: "leave" }));
    const s = await snapOf(code, tokens[1]);
    expect(s.hostId).toBe(s.meId);
  });

  it("never sends another player's role, hand or token", async () => {
    const { code, tokens } = await room(7);
    ok(await apiOp(code, tokens[0], { op: "start" }));
    const table = await snapOf(code, null);
    expect(table.view!.me).toBeNull();
    const raw = JSON.stringify(table);
    for (const t of tokens) expect(raw).not.toContain(t);
    expect(raw).not.toMatch(/"role"|"hitler"|"drawPile"|"hand"/);

    for (const t of tokens) {
      const s = await snapOf(code, t);
      const others = JSON.stringify({ ...s, view: { ...s.view, me: null } });
      expect(others).not.toMatch(/"role"|"hitler"/);
      for (const t2 of tokens) if (t2 !== t) expect(JSON.stringify(s)).not.toContain(t2);
    }
  });

  it("concurrent votes are all counted (compare-and-set retries)", async () => {
    const { code, tokens } = await room(9);
    ok(await apiOp(code, tokens[0], { op: "start" }));
    await Promise.all(tokens.map((t) => apiOp(code, t, { op: "action", action: { type: "ack_role" } })));
    let s = await snapOf(code, tokens[0]);
    expect(s.view!.game.phase).toBe("nominate");
    let presToken = "";
    for (const t of tokens) if ((await snapOf(code, t)).meId === s.view!.game.presidentId) presToken = t;
    const target = s.view!.game.eligibleChancellorIds[0];
    ok(await apiOp(code, presToken, { op: "action", action: { type: "nominate", target } }));
    const results = await Promise.all(tokens.map((t) => apiOp(code, t, { op: "action", action: { type: "vote", ja: true } })));
    expect(results.every((r) => r.ok)).toBe(true);
    s = await snapOf(code, tokens[0]);
    expect(s.view!.game.lastVote!.passed).toBe(true);
    expect(Object.keys(s.view!.game.lastVote!.votes)).toHaveLength(9);
  });

  it("rejects actions out of turn", async () => {
    const { code, tokens } = await room(5);
    ok(await apiOp(code, tokens[0], { op: "start" }));
    const r = await apiOp(code, tokens[0], { op: "action", action: { type: "vote", ja: true } });
    expect(r.ok).toBe(false);
    expect((await apiOp(code, "bogus", { op: "start" })).ok).toBe(false);
  });

  it("bots play a whole game when polled", async () => {
    const host = ok(await apiCreate("Host"));
    ok(await apiOp(host.code, host.token, { op: "addBots", count: 6 }));
    ok(await apiOp(host.code, host.token, { op: "start" }));
    // Drive the human with random legal choices; bots move on polls.
    const { legalActions } = await import("../engine/engine");
    for (let i = 0; i < 3000; i++) {
      const raw = (await store.get(host.code))!;
      if (raw.game!.phase === "over") break;
      raw.botDueAt = 0;
      await store.replace(raw, raw.version);
      const s = await snapOf(host.code, host.token);
      const acts = legalActions((await store.get(host.code))!.game!, s.meId!);
      if (acts.length) {
        const { player: _p, ...a } = acts[Math.floor(Math.random() * acts.length)];
        void _p;
        await apiOp(host.code, host.token, { op: "action", action: a as never });
      }
    }
    expect((await store.get(host.code))!.game!.phase).toBe("over");
  });

  it("two humans plus bots finish a game, bots post claims, nothing secret leaks", async () => {
    const { code, tokens } = await room(2);
    ok(await apiOp(code, tokens[0], { op: "addBots", count: 5 }));
    let s = await snapOf(code, tokens[0]);
    expect(s.members.filter((m) => m.isBot)).toHaveLength(5);
    ok(await apiOp(code, tokens[0], { op: "start" }));
    const { legalActions } = await import("../engine/engine");
    for (let i = 0; i < 3000; i++) {
      const raw = (await store.get(code))!;
      if (raw.game!.phase === "over") break;
      raw.botDueAt = 0;
      await store.replace(raw, raw.version);
      for (const t of tokens) {
        s = await snapOf(code, t);
        expect(JSON.stringify(s.view!.game.log)).not.toMatch(/"secret"/);
        const acts = legalActions((await store.get(code))!.game!, s.meId!);
        if (acts.length) {
          const { player: _p, ...a } = acts[Math.floor(Math.random() * acts.length)];
          void _p;
          await apiOp(code, t, { op: "action", action: a as never });
        }
      }
    }
    const game = (await store.get(code))!.game!;
    expect(game.phase).toBe("over");
    const enacts = game.log.filter((e) => e.t === "enact").length;
    if (enacts) expect(game.log.some((e) => e.t === "claim")).toBe(true);
  });
});
