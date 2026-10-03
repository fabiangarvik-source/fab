"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { NAMES } from "../engine/config";
import type { PrivateInfo, PublicGame } from "../engine/view";
import type { ClientAction, RoomSnapshot } from "../protocol";
import { ActionPanel } from "./ActionPanel";
import { Boards, Seats } from "./Board";
import { Question, Scroll } from "./icons";
import { LogList, describe } from "./Log";
import { usePref, useTheme, vibrate } from "./prefs";
import { RulesContent, sectionForPhase } from "./Rules";
import { op } from "./api";
import { playDrumroll, setSoundEnabled } from "./sound";
import { Button, PartyIcon, Sheet, cx } from "./ui";

export function isMyTurn(game: PublicGame, me: PrivateInfo | null) {
  if (!me) return false;
  const p = game.players.find((x) => x.id === me.id);
  if (!p) return false;
  if (game.phase === "night") return !p.seenRole;
  if (!p.alive) return false;
  const isPres = me.id === game.presidentId;
  switch (game.phase) {
    case "nominate":
    case "pres_legislate":
    case "veto":
    case "investigate":
    case "investigate_result":
    case "peek":
    case "special":
    case "execute":
      return isPres;
    case "vote":
      return !game.votedIds.includes(me.id);
    case "chan_legislate":
      return me.id === game.chancellorId;
  }
  return false;
}

export function useVoteReveal(game: PublicGame | undefined) {
  const voteCount = game ? game.log.filter((e) => e.t === "vote").length : 0;
  const seen = useRef<number | null>(null);
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (seen.current === null) {
      seen.current = voteCount;
      return;
    }
    if (voteCount > seen.current) {
      seen.current = voteCount;
      setShow(true);
      playDrumroll(0.9);
      const t = setTimeout(() => setShow(false), 7000);
      return () => clearTimeout(t);
    }
    seen.current = voteCount;
  }, [voteCount]);
  return [show && !!game?.lastVote, () => setShow(false)] as const;
}

export function VoteReveal({ game, onClose }: { game: PublicGame; onClose: () => void }) {
  const v = game.lastVote!;
  const name = (id: string) => game.players.find((p) => p.id === id)?.name ?? "?";
  const ja = Object.values(v.votes).filter(Boolean).length;
  return (
    <div className="fixed inset-0 z-30 flex flex-col items-center justify-center bg-black/80 p-4" onClick={onClose} data-testid="vote-reveal">
      <div className="font-type text-xs tracking-[0.3em] text-gold">THE VOTES ARE IN</div>
      <h2 className="font-display mt-1 text-center text-2xl font-extrabold text-[#f0e7d3]">
        {name(v.president)} &amp; {name(v.chancellor)}
      </h2>
      <div className="mt-4 grid w-full max-w-md grid-cols-3 gap-2 sm:grid-cols-4">
        {Object.entries(v.votes).map(([id, yes], i) => (
          <div
            key={id}
            className={cx(
              "anim-flip flex flex-col items-center rounded-md border-2 py-2",
              yes ? "border-[#e9dfc6] bg-[#f3ead3] text-[#1f1a14]" : "border-[#555] bg-[#1d1a17] text-[#f3ead3]",
            )}
            style={{ animationDelay: `${0.9 + i * 0.02}s` }}
          >
            <span className="font-display text-2xl font-black">{yes ? NAMES.ja : NAMES.nein}</span>
            <span className="max-w-full truncate px-1 text-xs">{name(id)}</span>
          </div>
        ))}
      </div>
      <div
        className={cx("anim-stamp font-display mt-6 rounded border-4 px-4 py-1 text-4xl font-black", v.passed ? "border-gold text-gold" : "border-fas text-fas-ink")}
        style={{ animationDelay: "1.4s" }}
      >
        {v.passed ? "Elected" : "Rejected"} {ja}–{Object.keys(v.votes).length - ja}
      </div>
      <p className="mt-4 text-sm text-[#a99d86]">Tap anywhere to continue</p>
    </div>
  );
}

const WIN_TEXT: Record<string, string> = {
  liberal_policies: "Five Liberal policies were enacted.",
  hitler_executed: "Hitler was executed.",
  fascist_policies: "Six Fascist policies were enacted.",
  hitler_elected: "Hitler was elected Chancellor.",
};

export function GameOver({ snap, onHide }: { snap: RoomSnapshot; onHide?: () => void }) {
  const game = snap.view!.game;
  const lib = game.winner === "liberal";
  const isHost = snap.meId === snap.hostId;
  const [history, setHistory] = useState(false);
  const all = useMemo(
    () => (game.secretHistory ? [...game.log, ...game.secretHistory] : game.log),
    [game.log, game.secretHistory],
  );
  // Interleave secret and public entries in the order they happened.
  const ordered = useMemo(() => {
    if (!game.secretHistory) return game.log;
    return all.slice().sort((a, b) => a.round - b.round);
  }, [all, game.log, game.secretHistory]);
  return (
    <div className="fixed inset-0 z-30 overflow-y-auto bg-bg" data-testid="game-over">
      <div className={cx("anim-curtain flex flex-col items-center px-4 pb-6 pt-10 text-center", lib ? "bg-lib/25" : "bg-fas/25")}>
        <PartyIcon party={lib ? "liberal" : "fascist"} className={cx("h-20 w-20", lib ? "text-lib-ink" : "text-fas-ink")} />
        <h1 className={cx("anim-stamp font-display text-6xl font-black", lib ? "text-lib-ink" : "text-fas-ink")} data-testid="winner">
          {NAMES.partiesPlural[game.winner!]} win
        </h1>
        <p className="mt-2 text-lg">{WIN_TEXT[game.winReason!]}</p>
      </div>
      <div className="mx-auto max-w-lg px-4">
        <h2 className="font-display mt-4 text-2xl font-extrabold">Every role, revealed</h2>
        <ul className="mt-2 grid grid-cols-2 gap-2" data-testid="all-roles">
          {game.players.map((p, i) => {
            const role = game.roles![p.id];
            return (
              <li
                key={p.id}
                className={cx("anim-flip flex items-center gap-2 rounded-md border px-3 py-2", role === "liberal" ? "border-lib/60 bg-lib/10" : "border-fas/60 bg-fas/10")}
                style={{ animationDelay: `${0.6 + i * 0.12}s` }}
              >
                <PartyIcon party={role} className={cx("h-6 w-6 shrink-0", role === "liberal" ? "text-lib-ink" : "text-fas-ink")} />
                <span className="min-w-0 flex-1 truncate text-left">
                  <b>{p.name}</b>
                  <br />
                  <span className="text-xs text-muted">
                    {NAMES.roles[role]}
                    {!p.alive && " · executed"}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
        {game.secretHistory && (
          <div className="mt-4">
            <Button variant="ghost" className="w-full" onClick={() => setHistory((h) => !h)}>
              {history ? "Hide" : "Show"} full history
            </Button>
            {history && (
              <div className="card-surface -mx-4 mt-2 rounded-lg">
                <LogList game={game} entries={ordered} />
              </div>
            )}
          </div>
        )}
        <div className="mt-6 flex flex-col gap-2 pb-10">
          {isHost ? (
            <>
              <Button size="lg" onClick={() => op(snap.code, { op: "start" })} data-testid="play-again">
                Play again
              </Button>
              <Button variant="ghost" onClick={() => op(snap.code, { op: "endGame" })} data-testid="back-to-lobby">
                Back to lobby
              </Button>
            </>
          ) : snap.meId ? (
            <p className="text-center text-muted">Waiting for the host to start another game…</p>
          ) : null}
          {onHide && (
            <Button variant="ghost" onClick={onHide}>
              View the final board
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function GameScreen({ snap, reconnecting }: { snap: RoomSnapshot; reconnecting: boolean }) {
  const game = snap.view!.game;
  const me = snap.view!.me;
  const [rules, setRules] = useState(false);
  const [log, setLog] = useState(false);
  const [menu, setMenu] = useState(false);
  const [hideOver, setHideOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sound, setSound] = usePref("sh:sound", false);
  const [light, setLight] = useTheme();
  const [revealVote, closeVote] = useVoteReveal(game);
  const isHost = snap.meId === snap.hostId;

  useEffect(() => setSoundEnabled(sound), [sound]);
  useEffect(() => setHideOver(false), [snap.gameNumber]);

  const myTurn = isMyTurn(game, me);
  useEffect(() => {
    if (myTurn) vibrate([60, 40, 60]);
  }, [myTurn, game.phase]);

  const send = async (a: ClientAction) => {
    const r = await op(snap.code, { op: "action", action: a });
    if (!r.ok) {
      setError(r.error);
      setTimeout(() => setError(null), 3500);
      return r.error;
    }
    return null;
  };

  const names = new Map(game.players.map((p) => [p.id, p.name]));
  const lastEvent = [...game.log].reverse().find((e) => e.t !== "tracker" && e.t !== "start");
  const ticker = lastEvent ? describe(lastEvent, (id) => names.get(id) ?? "?").text : "The game has begun.";

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col pb-[env(safe-area-inset-bottom)]">
      {reconnecting && <div className="sticky top-0 z-20 bg-gold px-4 py-1.5 text-center text-sm font-bold text-[#15120e]">Reconnecting…</div>}
      <header className="flex items-center gap-2 border-b border-line px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="min-w-0 flex-1">
          <div className="font-display text-lg font-extrabold leading-none">
            Room {snap.code} · {game.phase === "night" ? "Night" : `Round ${game.round}`}
          </div>
          <div className="truncate text-xs text-muted" aria-live="polite" data-testid="ticker">
            {ticker}
          </div>
        </div>
        <button className="flex min-h-12 min-w-12 items-center justify-center rounded-md border border-line" onClick={() => setLog(true)} aria-label="Game log" data-testid="open-log">
          <Scroll className="h-6 w-6" />
        </button>
        <button className="flex min-h-12 min-w-12 items-center justify-center rounded-md border border-line" onClick={() => setRules(true)} aria-label="Rules" data-testid="open-rules">
          <Question className="h-6 w-6" />
        </button>
        <button className="min-h-12 min-w-12 rounded-md border border-line text-2xl leading-none" onClick={() => setMenu(true)} aria-label="Menu">
          ⋯
        </button>
      </header>

      {error && <div className="anim-shake bg-fas px-4 py-2 text-center text-sm font-semibold text-white">{error}</div>}

      <main className="flex flex-1 flex-col">
        <section
          className={cx("flex min-h-[46dvh] flex-col justify-center px-4 py-4", myTurn && "bg-gold/5")}
          aria-label="Your action"
          data-testid="action-panel"
          data-phase={game.phase}
          data-my-turn={myTurn ? "1" : "0"}
        >
          {me && <ActionPanel game={game} me={me} send={send} />}
        </section>
        <section className="border-t border-line bg-surface/40 px-3 py-3" aria-label="Public boards">
          <Boards game={game} compact />
          <div className="mt-3">
            <Seats game={game} members={snap.members} meId={snap.meId} />
          </div>
        </section>
      </main>

      {revealVote && <VoteReveal game={game} onClose={closeVote} />}
      {game.phase === "over" && !hideOver && !revealVote && <GameOver snap={snap} onHide={() => setHideOver(true)} />}
      {game.phase === "over" && hideOver && (
        <button className="fixed bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full bg-gold px-5 py-3 font-bold text-[#15120e] shadow-lg" onClick={() => setHideOver(false)}>
          Show results
        </button>
      )}

      <Sheet open={rules} onClose={() => setRules(false)} title="Rules">
        <div className="px-4">
          <RulesContent focus={sectionForPhase(game.phase)} />
        </div>
      </Sheet>
      <Sheet open={log} onClose={() => setLog(false)} title="Game log">
        <LogList game={game} />
      </Sheet>
      <Sheet open={menu} onClose={() => setMenu(false)} title="Settings">
        <div className="flex flex-col gap-3 p-4">
          <label className="flex min-h-12 items-center justify-between">
            <span>Sound effects</span>
            <input type="checkbox" className="h-6 w-6 accent-[var(--gold)]" checked={sound} onChange={(e) => setSound(e.target.checked)} />
          </label>
          <label className="flex min-h-12 items-center justify-between">
            <span>Light &ldquo;paper&rdquo; mode</span>
            <input type="checkbox" className="h-6 w-6 accent-[var(--gold)]" checked={light} onChange={(e) => setLight(e.target.checked)} />
          </label>
          <a className="flex min-h-12 items-center text-gold underline" href={`/table/${snap.code}`} target="_blank" rel="noreferrer">
            Open the table screen (for a TV or laptop)
          </a>
          {isHost && (
            <Button
              variant="danger"
              onClick={() => {
                if (confirm("End this game for everyone and return to the lobby?")) {
                  void op(snap.code, { op: "endGame" });
                  setMenu(false);
                }
              }}
            >
              End game for everyone
            </Button>
          )}
        </div>
      </Sheet>
    </div>
  );
}
