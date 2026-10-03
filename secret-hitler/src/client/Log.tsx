"use client";

import { NAMES } from "../engine/config";
import type { Policy } from "../engine/types";
import type { PublicGame, PublicLogEntry, SecretLogEntry } from "../engine/view";
import { cx } from "./ui";

const pol = (p: Policy) => NAMES.policies[p];
const cards = (cs: Policy[]) => cs.map((c) => (c === "L" ? "L" : "F")).join(" ");

export function describe(e: PublicLogEntry | SecretLogEntry, name: (id: string) => string): { text: string; tone?: "lib" | "fas" | "muted" } {
  switch (e.t) {
    case "start":
      return { text: `Seat order: ${e.seats.map(name).join(", ")}.` };
    case "nominate":
      return { text: `${name(e.president)} nominated ${name(e.chancellor)} for ${NAMES.chancellor}.` };
    case "vote": {
      const ja = Object.entries(e.votes).filter(([, v]) => v).map(([k]) => name(k));
      const nein = Object.entries(e.votes).filter(([, v]) => !v).map(([k]) => name(k));
      return {
        text: `Vote ${e.passed ? "PASSED" : "FAILED"} (${ja.length}–${nein.length}). ${NAMES.ja}: ${ja.join(", ") || "nobody"}. ${NAMES.nein}: ${nein.join(", ") || "nobody"}.`,
      };
    }
    case "tracker":
      return { text: `Election tracker moves to ${e.value}.`, tone: "muted" };
    case "enact":
      return { text: `${name(e.president)} and ${name(e.chancellor)} enacted a ${pol(e.policy)} policy.`, tone: e.policy === "L" ? "lib" : "fas" };
    case "chaos":
      return { text: `Chaos! The top policy was enacted: ${pol(e.policy)}. Term limits cleared.`, tone: e.policy === "L" ? "lib" : "fas" };
    case "veto_proposed":
      return { text: `${name(e.chancellor)} proposed a veto.` };
    case "veto":
      return { text: `${name(e.president)} ${e.agreed ? "agreed to" : "refused"} the veto.` };
    case "reshuffle":
      return { text: `The discard pile was shuffled into the deck (${e.drawSize} cards).`, tone: "muted" };
    case "power":
      if (e.power === "investigate") return { text: `${name(e.president)} investigated ${name(e.target!)}.` };
      if (e.power === "peek") return { text: `${name(e.president)} peeked at the top 3 policies.` };
      if (e.power === "special") return { text: `${name(e.president)} called a Special Election: ${name(e.target!)} is next.` };
      return { text: `${name(e.president)} executed ${name(e.target!)}.`, tone: "fas" };
    case "win":
      return { text: `${NAMES.partiesPlural[e.winner]} win.` };
    case "draw":
      return { text: `${name(e.president)} drew ${cards(e.cards)}.`, tone: "muted" };
    case "pres_discard":
      return { text: `${name(e.president)} discarded ${pol(e.card)}, passed ${cards(e.passed)}.`, tone: "muted" };
    case "chan_discard":
      return { text: `${name(e.chancellor)} discarded ${pol(e.card)}.`, tone: "muted" };
    case "veto_discard":
      return { text: `Vetoed policies: ${cards(e.cards)}.`, tone: "muted" };
    case "investigation_result":
      return { text: `${name(e.president)} saw ${name(e.target)} is ${NAMES.parties[e.party]}.`, tone: "muted" };
    case "peek_result":
      return { text: `Peek showed ${cards(e.cards)}.`, tone: "muted" };
  }
}

export function LogList({ game, entries }: { game: PublicGame; entries?: (PublicLogEntry | SecretLogEntry)[] }) {
  const names = new Map(game.players.map((p) => [p.id, p.name]));
  const name = (id: string) => names.get(id) ?? "?";
  const list = entries ?? game.log;
  const rows: React.ReactNode[] = [];
  let round = -1;
  list.forEach((e, i) => {
    if (e.t === "tracker") return;
    if (e.round !== round) {
      round = e.round;
      rows.push(
        <li key={`r${i}`} className="font-display mt-3 text-sm font-bold text-gold">
          {round === 0 ? "Setup" : `Round ${round}`}
        </li>,
      );
    }
    const d = describe(e, name);
    rows.push(
      <li
        key={i}
        className={cx(
          "border-l-2 py-0.5 pl-2 text-sm",
          d.tone === "lib" ? "border-lib text-lib-ink" : d.tone === "fas" ? "border-fas text-fas-ink" : d.tone === "muted" ? "border-line text-muted" : "border-line",
        )}
      >
        {d.text}
      </li>,
    );
  });
  return <ol className="px-4 pb-6">{rows.length ? rows : <li className="py-4 text-muted">Nothing yet.</li>}</ol>;
}
