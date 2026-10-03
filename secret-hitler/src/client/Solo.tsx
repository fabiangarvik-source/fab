"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { MAX_PLAYERS, MIN_PLAYERS, NAMES, ROLE_COUNTS } from "../engine/config";
import type { Party, Policy } from "../engine/types";
import type { RoomOp } from "../protocol";
import { SOLO_CODE, act, botDelay, createSolo, humanClaim, newGame, pendingBots, soloSnapshot, stepBot, type SoloState } from "../solo/solo";
import { setLocalRoom, storage } from "./api";
import { GameScreen } from "./Game";
import { Button, Footer, PolicyCard, cx } from "./ui";

const SAVE_KEY = "sh:solo";

function load(): SoloState | null {
  try {
    const raw = storage(SAVE_KEY);
    const st = raw ? (JSON.parse(raw) as SoloState) : null;
    return st?.v === 1 && st.game ? st : null;
  } catch {
    return null;
  }
}

/**
 * Solo mode: the whole game runs in this tab. Bots move on timers, the save
 * lives in localStorage so a reload (or going offline) resumes the game.
 */
function useSolo() {
  const [st, setSt] = useState<SoloState | null | undefined>(undefined);
  const ref = useRef<SoloState | null>(null);
  const update = useCallback((next: SoloState | null) => {
    ref.current = next;
    setSt(next);
    storage(SAVE_KEY, next ? JSON.stringify(next) : null);
  }, []);

  useEffect(() => {
    const saved = load();
    ref.current = saved;
    setSt(saved);
  }, []);

  // Bots take turns one move at a time, with a human-ish pause.
  useEffect(() => {
    if (!st || st.game.phase === "over" || !pendingBots(st).length) return;
    const t = setTimeout(() => {
      const cur = ref.current;
      if (!cur) return;
      const next = stepBot(cur, Math.random);
      if (next) update(next);
    }, botDelay(st, Math.random));
    return () => clearTimeout(t);
  }, [st, update]);

  // GameScreen talks to rooms through op(); answer those for the solo room here.
  useEffect(() => {
    setLocalRoom(SOLO_CODE, (req: RoomOp) => {
      const cur = ref.current;
      if (!cur) return { ok: false, error: "No solo game" };
      if (req.op === "action") {
        const res = act(cur, cur.humanId, req.action, Math.random);
        if (!res.ok) return res;
        update(res.state);
        return { ok: true, snapshot: soloSnapshot(res.state) };
      }
      if (req.op === "start") {
        const next = newGame(cur, Math.random);
        update(next);
        return { ok: true, snapshot: soloSnapshot(next) };
      }
      if (req.op === "endGame") {
        update(null);
        return { ok: true, snapshot: null };
      }
      return { ok: false, error: "Not available in solo mode" };
    });
    return () => setLocalRoom(SOLO_CODE, null);
  }, [update]);

  return { st, update };
}

function Setup({ onStart }: { onStart: (name: string, n: number) => void }) {
  const [name, setName] = useState("");
  const [n, setN] = useState(7);
  useEffect(() => {
    setName(storage("sh:name") ?? "");
    const saved = Number(storage("sh:solo:n"));
    if (saved >= MIN_PLAYERS && saved <= MAX_PLAYERS) setN(saved);
  }, []);
  const counts = ROLE_COUNTS[n];
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <Link href="/" className="min-h-12 py-3 text-muted">
        ‹ Home
      </Link>
      <h1 className="font-display text-5xl font-black">Play solo</h1>
      <p className="mt-2 text-muted">
        You against computer players. Everything runs on this phone, so it works offline once the page has loaded.
      </p>
      <section className="card-surface mt-5 flex flex-col gap-4 rounded-xl p-4">
        <div>
          <label htmlFor="solo-name" className="font-display text-lg font-bold text-muted">
            Your nickname
          </label>
          <input
            id="solo-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={16}
            placeholder="e.g. Alex"
            className="mt-1 min-h-12 w-full rounded-md border border-line bg-bg px-3 text-lg outline-none focus:border-gold"
            data-testid="solo-name"
          />
        </div>
        <div>
          <div className="font-display text-lg font-bold text-muted">Players at the table</div>
          <div className="mt-1 grid grid-cols-4 gap-2" role="radiogroup">
            {Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, i) => MIN_PLAYERS + i).map((k) => (
              <button
                key={k}
                role="radio"
                aria-checked={n === k}
                onClick={() => setN(k)}
                data-testid={`solo-n-${k}`}
                className={cx("font-display min-h-12 rounded-md border text-xl font-extrabold", n === k ? "border-gold bg-gold/15 text-gold" : "border-line")}
              >
                {k}
              </button>
            ))}
          </div>
          <p className="mt-2 text-sm text-muted">
            You + {n - 1} bots · {counts.liberals} {NAMES.partiesPlural.liberal}, {counts.fascists} {counts.fascists === 1 ? NAMES.parties.fascist : NAMES.partiesPlural.fascist} + {NAMES.roles.hitler}
            {n > 10 && " (fan extension)"}
          </p>
        </div>
        <Button
          size="lg"
          onClick={() => {
            storage("sh:solo:n", String(n));
            if (name.trim()) storage("sh:name", name.trim());
            onStart(name, n);
          }}
          data-testid="solo-start"
        >
          Deal the roles
        </Button>
      </section>
      <section className="mt-5 text-sm leading-relaxed text-muted">
        <h2 className="font-display text-xl font-bold text-ink">How solo works</h2>
        <p className="mt-1">
          The bots play to win. Liberals track who enacted what and vote against shady governments. Fascists know each other, push Fascist policies and
          lie about the cards they saw to cover it.
        </p>
        <p className="mt-2">
          There&apos;s no table talk, so after every government the President and Chancellor <b>claim</b> what cards they got. Claims show up in the game log
          and the ticker. When you serve in a government you get to make a claim too, and you can lie.
        </p>
      </section>
      <div className="flex-1" />
      <Footer />
    </div>
  );
}

const DRAW_OPTIONS: Policy[][] = [
  ["F", "F", "F"],
  ["F", "F", "L"],
  ["F", "L", "L"],
  ["L", "L", "L"],
];
const RECEIVE_OPTIONS: Policy[][] = [
  ["F", "F"],
  ["F", "L"],
  ["L", "L"],
];
const fCount = (cs: Policy[]) => cs.filter((c) => c === "F").length;

function ClaimPrompt({ st, onClaim }: { st: SoloState; onClaim: (said: Policy[] | Party | null) => void }) {
  const p = st.claimPrompt!;
  const name = (id: string) => st.members.find((m) => m.id === id)?.name ?? "?";
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-xl px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]" data-testid="claim-prompt">
      <div className="card-surface anim-fade-up rounded-xl border border-gold/60 p-3 shadow-2xl">
        <div className="font-type text-xs tracking-[0.25em] text-gold">TELL THE TABLE</div>
        <p className="mt-0.5 text-sm">
          {p.kind === "investigate"
            ? `What do you say ${name(p.target)} is?`
            : p.kind === "draw"
              ? "Which three policies do you say you drew?"
              : `Which two policies do you say the President passed you?`}{" "}
          <span className="text-muted">Lying is allowed.</span>
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {p.kind === "investigate"
            ? (["liberal", "fascist"] as Party[]).map((party) => (
                <Button key={party} variant={party === "liberal" ? "lib" : "fas"} className="flex-1 text-lg" onClick={() => onClaim(party)} data-testid={`claim-${party}`}>
                  {NAMES.parties[party]}
                  {party === p.party && <span className="text-xs font-normal opacity-80">(true)</span>}
                </Button>
              ))
            : (p.kind === "draw" ? DRAW_OPTIONS : RECEIVE_OPTIONS).map((cs) => {
                const truth = fCount(cs) === fCount(p.cards);
                return (
                  <button
                    key={cs.join("")}
                    onClick={() => onClaim(cs)}
                    data-testid={`claim-${cs.join("")}`}
                    className={cx("flex flex-1 flex-col items-center gap-1 rounded-md border p-1.5", truth ? "border-gold" : "border-line")}
                  >
                    <span className="flex gap-0.5">
                      {cs.map((c, i) => (
                        <PolicyCard key={i} policy={c} small className="!h-10 !w-7 [&_svg]:!h-4 [&_svg]:!w-4 [&_span]:hidden" />
                      ))}
                    </span>
                    <span className={cx("text-[10px] uppercase tracking-wide", truth ? "text-gold" : "text-muted")}>{truth ? "the truth" : " "}</span>
                  </button>
                );
              })}
        </div>
        <button className="mt-1 min-h-10 w-full text-sm text-muted underline" onClick={() => onClaim(null)} data-testid="claim-none">
          Say nothing
        </button>
      </div>
    </div>
  );
}

export function SoloClient() {
  const { st, update } = useSolo();
  if (st === undefined)
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="font-display animate-pulse text-2xl text-muted">Setting the table…</p>
      </div>
    );
  if (!st) return <Setup onStart={(name, n) => update(createSolo(name, n, Math.random))} />;
  return (
    <>
      <GameScreen snap={soloSnapshot(st)} reconnecting={false} />
      {st.claimPrompt && st.game.phase !== "over" && <ClaimPrompt st={st} onClaim={(said) => update(humanClaim(st, said))} />}
    </>
  );
}
