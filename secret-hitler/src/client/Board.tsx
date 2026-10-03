"use client";

import { useEffect, useState } from "react";
import { CHAOS_AT, FASCIST_TO_WIN, LIBERAL_TO_WIN, NAMES } from "../engine/config";
import type { PublicGame } from "../engine/view";
import type { MemberInfo } from "../protocol";
import { Crown, Dove, Eye, Gavel, PowerIcon, Serpent, Skull } from "./icons";
import { playStamp } from "./sound";
import { cx } from "./ui";

/** The previous value, held for a moment so "just changed" animations can run. */
export function usePrevious<T>(value: T, holdMs = 1500) {
  const [prev, setPrev] = useState(value);
  useEffect(() => {
    if (prev === value) return;
    const t = setTimeout(() => setPrev(value), holdMs);
    return () => clearTimeout(t);
  }, [value, prev, holdMs]);
  return prev;
}

function Slot({ filled, fresh, tone, children, label }: { filled: boolean; fresh: boolean; tone: "lib" | "fas"; children?: React.ReactNode; label: string }) {
  return (
    <div
      aria-label={label}
      className={cx(
        "relative flex aspect-[5/7] flex-1 flex-col items-center justify-center rounded-[4px] border text-center",
        filled
          ? tone === "lib"
            ? "border-[#9cc3ec] bg-lib text-white"
            : "border-[#f2a08f] bg-fas text-white"
          : tone === "lib"
            ? "border-lib/50 bg-lib/10 text-lib-ink"
            : "border-fas/50 bg-fas/10 text-fas-ink",
        filled && fresh && "anim-slide",
      )}
    >
      {children}
    </div>
  );
}

export function Boards({ game, compact }: { game: PublicGame; compact?: boolean }) {
  const prevL = usePrevious(game.liberalPolicies);
  const prevF = usePrevious(game.fascistPolicies);
  const prevT = usePrevious(game.electionTracker);
  useEffect(() => {
    if (game.liberalPolicies > prevL || game.fascistPolicies > prevF) playStamp();
  }, [game.liberalPolicies, game.fascistPolicies, prevL, prevF]);

  const icon = compact ? "h-4 w-4" : "h-7 w-7";
  const txt = compact ? "text-[8px] leading-none" : "text-[11px] leading-tight";

  return (
    <div className={cx("flex flex-col", compact ? "gap-2" : "gap-4")}>
      {/* Liberal board */}
      <section aria-label="Liberal board" className={cx("rounded-lg border border-lib/40 bg-lib/5", compact ? "p-2" : "p-4")}>
        <header className="mb-1.5 flex items-center gap-1.5 text-lib-ink">
          <Dove className={compact ? "h-4 w-4" : "h-6 w-6"} />
          <h3 className={cx("font-display font-extrabold", compact ? "text-sm" : "text-xl")}>{NAMES.parties.liberal} Board</h3>
          <span className="ml-auto text-xs font-semibold" data-testid="lib-count">
            {game.liberalPolicies}/{LIBERAL_TO_WIN}
          </span>
        </header>
        <div className="flex gap-1.5">
          {Array.from({ length: LIBERAL_TO_WIN }, (_, i) => {
            const filled = i < game.liberalPolicies;
            return (
              <Slot key={i} tone="lib" filled={filled} fresh={i >= prevL} label={`Liberal slot ${i + 1}${filled ? " filled" : ""}`}>
                {filled ? (
                  <Dove className={icon} />
                ) : i === LIBERAL_TO_WIN - 1 ? (
                  <span className={cx("font-display font-extrabold", txt)}>WIN</span>
                ) : null}
              </Slot>
            );
          })}
        </div>
      </section>

      {/* Fascist board */}
      <section aria-label="Fascist board" className={cx("rounded-lg border border-fas/40 bg-fas/5", compact ? "p-2" : "p-4")}>
        <header className="mb-1.5 flex items-center gap-1.5 text-fas-ink">
          <Serpent className={compact ? "h-4 w-4" : "h-6 w-6"} />
          <h3 className={cx("font-display font-extrabold", compact ? "text-sm" : "text-xl")}>{NAMES.parties.fascist} Board</h3>
          <span className="ml-auto text-xs font-semibold" data-testid="fas-count">
            {game.fascistPolicies}/{FASCIST_TO_WIN}
          </span>
        </header>
        <div className="flex gap-1.5">
          {game.powers.map((power, i) => {
            const filled = i < game.fascistPolicies;
            return (
              <Slot
                key={i}
                tone="fas"
                filled={filled}
                fresh={i >= prevF}
                label={`Fascist slot ${i + 1}: ${power ? NAMES.powers[power] : i === 5 ? "Fascists win" : "no power"}${filled ? " filled" : ""}`}
              >
                {filled ? (
                  <Serpent className={icon} />
                ) : (
                  <>
                    {i === FASCIST_TO_WIN - 1 ? <Skull className={icon} /> : <PowerIcon power={power} className={icon} />}
                    {!compact && (
                      <span className={cx("mt-1 px-0.5", txt)}>
                        {i === FASCIST_TO_WIN - 1 ? "Win" : power ? NAMES.powers[power] : ""}
                      </span>
                    )}
                    {i === 4 && <Gavel className={cx("absolute right-0.5 top-0.5 opacity-70", compact ? "h-2.5 w-2.5" : "h-4 w-4")} title="Veto unlocked" />}
                  </>
                )}
              </Slot>
            );
          })}
        </div>
        <div className={cx("mt-1.5 flex justify-between text-fas-ink/90", compact ? "text-[9px]" : "text-xs")}>
          <span>From 3: electing Hitler Chancellor wins</span>
          <span className={cx(game.vetoUnlocked && "font-bold text-gold")}>{game.vetoUnlocked ? "Veto unlocked" : "Veto at 5"}</span>
        </div>
      </section>

      {/* Tracker + piles */}
      <section aria-label="Election tracker and decks" className="flex items-center gap-3 px-1">
        <div className="flex items-center gap-1.5" aria-label={`Election tracker ${game.electionTracker} of ${CHAOS_AT}`} data-testid="tracker">
          <span className={cx("font-display font-bold text-muted", compact ? "text-xs" : "text-sm")}>Tracker</span>
          {Array.from({ length: CHAOS_AT + 1 }, (_, i) => (
            <span
              key={i}
              className={cx(
                "flex items-center justify-center rounded-full border font-bold",
                compact ? "h-5 w-5 text-[9px]" : "h-8 w-8 text-xs",
                i === game.electionTracker ? "border-gold bg-gold text-[#15120e]" : "border-line text-muted",
                i === game.electionTracker && game.electionTracker !== prevT && "anim-thud",
              )}
            >
              {i === CHAOS_AT ? "!" : i}
            </span>
          ))}
        </div>
        <div className={cx("ml-auto flex gap-3 text-muted", compact ? "text-xs" : "text-sm")}>
          <span data-testid="draw-count">
            Draw <b className="text-ink">{game.drawCount}</b>
          </span>
          <span data-testid="discard-count">
            Discard <b className="text-ink">{game.discardCount}</b>
          </span>
        </div>
      </section>
    </div>
  );
}

/** Seat order with offices, term limits and status. */
export function Seats({ game, members, meId, big }: { game: PublicGame; members: MemberInfo[]; meId: string | null; big?: boolean }) {
  const conn = new Map(members.map((m) => [m.id, m.connected]));
  return (
    <ol className={cx("grid gap-1.5", big ? "grid-cols-3 sm:grid-cols-4 lg:grid-cols-6" : "grid-cols-3")} aria-label="Seat order">
      {game.players.map((p) => {
        const pres = p.id === game.presidentId;
        const chan = p.id === game.chancellorId;
        const limited = p.id === game.lastPresidentId || p.id === game.lastChancellorId;
        return (
          <li
            key={p.id}
            className={cx(
              "relative flex min-h-11 items-center gap-1.5 rounded-md border px-2 py-1",
              big ? "text-base" : "text-xs",
              pres ? "border-gold bg-gold/15" : chan ? "border-ink/60 bg-surface-2" : "border-line bg-surface",
              !p.alive && "opacity-45",
            )}
          >
            <span className="text-[10px] text-muted">{p.seat + 1}</span>
            <span className={cx("min-w-0 flex-1 truncate font-semibold", !p.alive && "line-through")}>
              {p.name}
              {p.id === meId && <span className="text-muted"> (you)</span>}
            </span>
            {pres && <Crown className="h-4 w-4 shrink-0 text-gold" title={NAMES.president} />}
            {chan && <Gavel className="h-4 w-4 shrink-0" title={NAMES.chancellor} />}
            {!p.alive && <Skull className="h-4 w-4 shrink-0" title="Executed" />}
            {p.investigated && <Eye className="h-3.5 w-3.5 shrink-0 text-muted" title="Investigated" />}
            {limited && p.alive && !pres && !chan && (
              <span className="shrink-0 rounded bg-surface-2 px-1 text-[9px] uppercase text-muted" title="Term-limited (last elected government)">
                {p.id === game.lastPresidentId ? "ex-P" : "ex-C"}
              </span>
            )}
            {conn.get(p.id) === false && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-fas" title="Disconnected" />}
          </li>
        );
      })}
    </ol>
  );
}
