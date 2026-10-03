"use client";

import { NAMES } from "../engine/config";
import { Boards, Seats } from "./Board";
import { GameOver, VoteReveal, useVoteReveal } from "./Game";
import { LogList } from "./Log";
import { useRoom } from "./useRoom";
import { Banner, Footer } from "./ui";

const PHASE_TEXT: Record<string, (p: string, c: string) => string> = {
  night: () => "Night falls. Everyone is checking their role…",
  nominate: (p) => `President ${p} is choosing a Chancellor`,
  vote: (p, c) => `Vote on ${p} as President and ${c} as Chancellor`,
  pres_legislate: (p) => `President ${p} is legislating. No talking!`,
  chan_legislate: (_, c) => `Chancellor ${c} is legislating. No talking!`,
  veto: (p, c) => `${c} proposed a veto. ${p} decides`,
  investigate: (p) => `President ${p} will investigate someone`,
  investigate_result: (p) => `President ${p} is reading the loyalty report`,
  peek: (p) => `President ${p} is peeking at the deck`,
  special: (p) => `President ${p} is calling a Special Election`,
  execute: (p) => `President ${p} must execute a player`,
  over: () => "Game over",
};

export function TableClient({ code }: { code: string }) {
  const { snap, offline, error } = useRoom(code, "table");
  const game = snap?.view?.game;
  const [revealVote, closeVote] = useVoteReveal(game);

  if (error && !snap) return <p className="font-display p-10 text-center text-4xl">{error}</p>;
  if (!snap) return <p className="font-display p-10 text-center text-3xl text-muted">Loading room {code}…</p>;

  const name = (id: string | null) => game?.players.find((p) => p.id === id)?.name ?? "—";
  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col p-4 lg:p-8">
      {offline && <Banner tone="warn">Reconnecting…</Banner>}
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="font-type text-sm tracking-[0.3em] text-muted">TABLE SCREEN · PUBLIC INFORMATION ONLY</div>
          <h1 className="font-display text-5xl font-black">{NAMES.game}</h1>
        </div>
        <div className="text-right">
          <div className="font-type text-xs tracking-[0.3em] text-muted">JOIN AT /join · ROOM</div>
          <div className="font-display text-6xl font-black tracking-[0.2em] text-gold">{snap.code}</div>
        </div>
      </header>
      {!game ? (
        <div className="mt-10 text-center">
          <p className="font-display text-4xl font-bold">Lobby · {snap.members.length} player{snap.members.length === 1 ? "" : "s"}</p>
          <ul className="mt-6 flex flex-wrap justify-center gap-3 text-2xl">
            {snap.members.map((m) => (
              <li key={m.id} className="card-surface rounded-md px-4 py-2">
                {m.name}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="flex flex-col gap-6">
            <div className="card-surface rounded-xl p-4 text-center">
              <div className="font-type text-xs tracking-[0.3em] text-gold">{game.phase === "night" ? "NIGHT" : `ROUND ${game.round}`}</div>
              <p className="font-display text-3xl font-extrabold lg:text-4xl" data-testid="table-phase">
                {PHASE_TEXT[game.phase]?.(name(game.presidentId), name(game.chancellorId))}
              </p>
              {game.phase === "vote" && (
                <p className="mt-1 text-xl text-muted">
                  {game.aliveCount - game.votedIds.length} vote{game.aliveCount - game.votedIds.length === 1 ? "" : "s"} still to come
                </p>
              )}
            </div>
            <Boards game={game} />
            <Seats game={game} members={snap.members} meId={null} big />
          </div>
          <div className="card-surface max-h-[80dvh] overflow-y-auto rounded-xl">
            <h2 className="font-display border-b border-line px-4 py-3 text-2xl font-extrabold">Log</h2>
            <LogList game={game} />
          </div>
        </div>
      )}
      {game && revealVote && <VoteReveal game={game} onClose={closeVote} />}
      {game?.phase === "over" && !revealVote && <GameOver snap={snap} />}
      <div className="flex-1" />
      <Footer />
    </div>
  );
}
