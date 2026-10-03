"use client";

import { useEffect, useState } from "react";
import { NAMES } from "../engine/config";
import type { PrivateInfo, PublicGame } from "../engine/view";
import type { ClientAction } from "../protocol";
import { Crosshair, Eye, Gavel, Podium } from "./icons";
import { Button, HoldToReveal, PartyIcon, PolicyCard, cx } from "./ui";

type Send = (a: ClientAction) => Promise<string | null>;

interface Props {
  game: PublicGame;
  me: PrivateInfo;
  send: Send;
}

const roleTone = (r: string) => (r === "liberal" ? "text-lib-ink" : "text-fas-ink");

function Title({ kicker, children }: { kicker?: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 text-center">
      {kicker && <div className="font-type text-xs tracking-[0.25em] text-gold">{kicker}</div>}
      <h2 className="font-display text-3xl font-extrabold leading-tight">{children}</h2>
    </div>
  );
}

function Waiting({ children, sub }: { children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-6 text-center" data-testid="waiting">
      <div className="mb-3 flex gap-1.5" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-2 w-2 animate-pulse rounded-full bg-gold" style={{ animationDelay: `${i * 0.2}s` }} />
        ))}
      </div>
      <p className="font-display text-2xl font-bold">{children}</p>
      {sub && <p className="mt-2 max-w-xs text-sm text-muted">{sub}</p>}
    </div>
  );
}

/** Pick a player, then confirm. */
function PlayerPicker({
  game,
  me,
  allowed,
  reason,
  confirmLabel,
  variant = "primary",
  onConfirm,
}: {
  game: PublicGame;
  me: PrivateInfo;
  allowed: (id: string) => boolean;
  reason: (id: string) => string | null;
  confirmLabel: (name: string) => string;
  variant?: "primary" | "danger";
  onConfirm: (id: string) => Promise<unknown>;
}) {
  const [sel, setSel] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const selName = game.players.find((p) => p.id === sel)?.name;
  return (
    <div className="flex flex-col gap-3">
      <ul className="grid grid-cols-2 gap-2">
        {game.players.map((p) => {
          const ok = allowed(p.id);
          const why = ok ? null : reason(p.id);
          return (
            <li key={p.id}>
              <button
                disabled={!ok}
                onClick={() => setSel(p.id)}
                data-testid={`pick-${p.name}`}
                className={cx(
                  "flex min-h-14 w-full flex-col items-start justify-center rounded-md border px-3 py-1.5 text-left transition",
                  sel === p.id ? "border-gold bg-gold/15 ring-2 ring-gold" : "border-line bg-surface",
                  !ok && "opacity-40",
                )}
              >
                <span className="truncate font-semibold">
                  {p.name}
                  {p.id === me.id && " (you)"}
                </span>
                {why && <span className="text-[11px] uppercase tracking-wide text-muted">{why}</span>}
              </button>
            </li>
          );
        })}
      </ul>
      <Button
        size="lg"
        variant={variant}
        disabled={!sel || busy}
        data-testid="confirm"
        onClick={async () => {
          if (!sel) return;
          setBusy(true);
          await onConfirm(sel);
          setBusy(false);
          setSel(null);
        }}
      >
        {selName ? confirmLabel(selName) : "Choose a player"}
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------- night

function RoleReveal({ game, me, send }: Props) {
  const [seen, setSeen] = useState(false);
  const names = new Map(game.players.map((p) => [p.id, p.name]));
  const confirmed = game.players.find((p) => p.id === me.id)?.seenRole;
  const remaining = game.players.filter((p) => !p.seenRole).length;
  if (confirmed) return <Waiting sub="The game starts once everyone has looked at their role.">Waiting for {remaining} more to confirm…</Waiting>;
  return (
    <div className="flex flex-col gap-3">
      <Title kicker="NIGHT FALLS">Your secret role</Title>
      <HoldToReveal prompt="Hold to reveal your role" hint="Hold your phone close." onReveal={() => setSeen(true)} testId="reveal-role">
        <div className="anim-flip flex flex-col items-center" data-testid="role-card">
          <PartyIcon party={me.role} className={cx("h-16 w-16", roleTone(me.role))} />
          <div className={cx("font-display mt-1 text-4xl font-black", roleTone(me.role))} data-testid="role-name">
            {NAMES.roles[me.role]}
          </div>
          <div className="text-sm text-muted">Party: {NAMES.parties[me.party]}</div>
          {me.role === "liberal" && <p className="mt-2 text-sm">You know nothing about anyone. Find Hitler.</p>}
          {me.knownRoles.length > 0 && (
            <div className="mt-3 w-full max-w-xs text-left text-sm">
              <div className="font-type text-xs tracking-widest text-gold">YOUR ALLIES</div>
              <ul data-testid="known-roles">
                {me.knownRoles.map((k) => (
                  <li key={k.id} className="flex items-center gap-2 py-0.5">
                    <PartyIcon party={k.role} className="h-4 w-4 text-fas-ink" />
                    <b>{names.get(k.id)}</b> is {NAMES.roles[k.role]}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {me.role === "hitler" && me.knownRoles.length === 0 && (
            <p className="mt-2 max-w-xs text-sm">You don&apos;t know who the Fascists are, but they know you. Act Liberal.</p>
          )}
          {me.role === "fascist" && <p className="mt-2 max-w-xs text-sm">Help Hitler get elected. Don&apos;t blow your cover.</p>}
        </div>
      </HoldToReveal>
      <Button size="lg" disabled={!seen} onClick={() => send({ type: "ack_role" })} data-testid="ack-role">
        I&apos;ve seen it
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------- legislative

function HandPicker({
  cards,
  verb,
  title,
  kicker,
  onPick,
  extra,
}: {
  cards: ("L" | "F")[];
  verb: string;
  title: string;
  kicker: string;
  onPick: (i: number) => Promise<unknown>;
  extra?: React.ReactNode;
}) {
  const [sel, setSel] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => setSel(null), [cards.length]);
  return (
    <div className="flex flex-col gap-3">
      <Title kicker={kicker}>{title}</Title>
      <HoldToReveal prompt="Hold to look at your policies" hint="Then tap a numbered card below." testId="reveal-hand">
        <div className="flex gap-2" data-testid="hand">
          {cards.map((c, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <PolicyCard policy={c} />
              <span className="font-display text-lg">{i + 1}</span>
            </div>
          ))}
        </div>
      </HoldToReveal>
      <div className="flex justify-center gap-3">
        {cards.map((_, i) => (
          <PolicyCard key={i} faceDown small label={String(i + 1)} selected={sel === i} onClick={() => setSel(i)} />
        ))}
      </div>
      <Button
        size="lg"
        disabled={sel === null || busy}
        data-testid="confirm"
        onClick={async () => {
          if (sel === null) return;
          setBusy(true);
          await onPick(sel);
          setBusy(false);
        }}
      >
        {sel === null ? `Choose a card to ${verb}` : `${verb[0].toUpperCase()}${verb.slice(1)} card ${sel + 1}`}
      </Button>
      {extra}
    </div>
  );
}

// ---------------------------------------------------------------- main

export function ActionPanel({ game, me, send }: Props) {
  const name = (id: string | null) => game.players.find((p) => p.id === id)?.name ?? "?";
  const pres = name(game.presidentId);
  const chan = name(game.chancellorId);
  const isPres = me.id === game.presidentId;
  const isChan = me.id === game.chancellorId;
  const alive = game.players.find((p) => p.id === me.id)?.alive ?? false;

  if (game.phase === "night") return <RoleReveal game={game} me={me} send={send} />;

  if (!alive) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-6 text-center" data-testid="executed">
        <PartyIcon party="hitler" className="h-14 w-14 text-muted" />
        <h2 className="font-display mt-2 text-3xl font-black">You have been executed</h2>
        <p className="mt-1 text-lg">Stay silent. No talking, no hints.</p>
      </div>
    );
  }

  switch (game.phase) {
    case "nominate":
      if (!isPres)
        return (
          <Waiting sub={game.specialElection ? "Special Election round." : undefined}>
            Waiting for President {pres} to nominate a {NAMES.chancellor}…
          </Waiting>
        );
      return (
        <div>
          <Title kicker={game.specialElection ? "SPECIAL ELECTION" : "YOU ARE THE PRESIDENTIAL CANDIDATE"}>Nominate a {NAMES.chancellor}</Title>
          <PlayerPicker
            game={game}
            me={me}
            allowed={(id) => game.eligibleChancellorIds.includes(id)}
            reason={(id) => {
              const p = game.players.find((x) => x.id === id)!;
              if (!p.alive) return "executed";
              if (id === me.id) return "you";
              return "term-limited";
            }}
            confirmLabel={(n) => `Nominate ${n}`}
            onConfirm={(target) => send({ type: "nominate", target })}
          />
        </div>
      );

    case "vote": {
      const missing = game.aliveCount - game.votedIds.length;
      if (game.votedIds.includes(me.id))
        return (
          <Waiting sub={me.myVote !== null ? `You voted ${me.myVote ? NAMES.ja : NAMES.nein}.` : undefined}>
            Waiting for {missing} more vote{missing === 1 ? "" : "s"}…
          </Waiting>
        );
      return <Ballot pres={pres} chan={chan} missing={missing} send={send} />;
    }

    case "pres_legislate":
      if (!isPres || !me.hand) return <Waiting sub="No talking until the policy is enacted.">President {pres} is choosing a policy to discard…</Waiting>;
      return (
        <HandPicker
          kicker="NO TALKING UNTIL A POLICY IS ENACTED"
          title="Discard one policy"
          verb="discard"
          cards={me.hand}
          onPick={(index) => send({ type: "president_discard", index })}
        />
      );

    case "chan_legislate":
      if (!isChan || !me.hand)
        return <Waiting sub="No talking until the policy is enacted.">{NAMES.chancellor} {chan} is choosing a policy to enact…</Waiting>;
      return (
        <HandPicker
          kicker={game.vetoRefused ? "THE PRESIDENT REFUSED THE VETO" : "NO TALKING UNTIL A POLICY IS ENACTED"}
          title="Enact one policy"
          verb="enact"
          cards={me.hand}
          onPick={(index) => send({ type: "chancellor_enact", index })}
          extra={
            game.vetoUnlocked && !game.vetoProposed ? (
              <Button variant="ghost" onClick={() => send({ type: "propose_veto" })} data-testid="propose-veto">
                <Gavel className="h-5 w-5" /> Propose veto
              </Button>
            ) : null
          }
        />
      );

    case "veto":
      if (!isPres) return <Waiting>{NAMES.chancellor} {chan} proposed a veto. President {pres} decides…</Waiting>;
      return (
        <div className="flex flex-col gap-3">
          <Title kicker="VETO PROPOSED">{chan} wants to veto both policies</Title>
          <p className="text-center text-sm text-muted">If you agree, nothing is enacted and the election tracker advances.</p>
          <div className="grid grid-cols-2 gap-3">
            <Button size="lg" onClick={() => send({ type: "veto_response", agree: true })} data-testid="veto-agree">
              Agree
            </Button>
            <Button size="lg" variant="ghost" onClick={() => send({ type: "veto_response", agree: false })} data-testid="veto-refuse">
              Refuse
            </Button>
          </div>
        </div>
      );

    case "investigate":
      if (!isPres) return <Waiting>President {pres} is choosing someone to investigate…</Waiting>;
      return (
        <div>
          <Title kicker={NAMES.powers.investigate.toUpperCase()}>
            <Eye className="mr-1 inline h-7 w-7" />
            Investigate a player
          </Title>
          <PlayerPicker
            game={game}
            me={me}
            allowed={(id) => {
              const p = game.players.find((x) => x.id === id)!;
              return id !== me.id && p.alive && !p.investigated;
            }}
            reason={(id) => {
              const p = game.players.find((x) => x.id === id)!;
              return id === me.id ? "you" : !p.alive ? "executed" : "already investigated";
            }}
            confirmLabel={(n) => `Investigate ${n}`}
            onConfirm={(target) => send({ type: "investigate", target })}
          />
        </div>
      );

    case "investigate_result":
      if (!isPres || !me.investigation) return <Waiting>President {pres} is reading the loyalty report…</Waiting>;
      return (
        <div className="flex flex-col gap-3">
          <Title kicker="LOYALTY REPORT">{name(me.investigation.target)}</Title>
          <HoldToReveal prompt="Hold to read the report" testId="reveal-investigation">
            <div className="anim-flip flex flex-col items-center" data-testid="investigation-result">
              <PartyIcon party={me.investigation.party} className={cx("h-16 w-16", roleTone(me.investigation.party))} />
              <div className={cx("font-display text-4xl font-black", roleTone(me.investigation.party))}>{NAMES.parties[me.investigation.party]}</div>
              <div className="text-sm text-muted">party membership</div>
            </div>
          </HoldToReveal>
          <p className="text-center text-sm text-muted">You may tell the truth about this. Or not.</p>
          <Button size="lg" onClick={() => send({ type: "ack_investigation" })} data-testid="ack">
            Done
          </Button>
        </div>
      );

    case "peek":
      if (!isPres || !me.peek) return <Waiting>President {pres} is peeking at the top of the deck…</Waiting>;
      return (
        <div className="flex flex-col gap-3">
          <Title kicker={NAMES.powers.peek.toUpperCase()}>Top 3 policies</Title>
          <HoldToReveal prompt="Hold to peek" hint="Left is the top of the deck." testId="reveal-peek">
            <div className="flex gap-2" data-testid="peek">
              {me.peek.map((c, i) => (
                <PolicyCard key={i} policy={c} />
              ))}
            </div>
          </HoldToReveal>
          <Button size="lg" onClick={() => send({ type: "ack_peek" })} data-testid="ack">
            Done
          </Button>
        </div>
      );

    case "special":
      if (!isPres) return <Waiting>President {pres} is choosing the next Presidential Candidate…</Waiting>;
      return (
        <div>
          <Title kicker={NAMES.powers.special.toUpperCase()}>
            <Podium className="mr-1 inline h-7 w-7" />
            Choose the next President
          </Title>
          <PlayerPicker
            game={game}
            me={me}
            allowed={(id) => id !== me.id && !!game.players.find((x) => x.id === id)?.alive}
            reason={(id) => (id === me.id ? "you" : "executed")}
            confirmLabel={(n) => `Make ${n} President`}
            onConfirm={(target) => send({ type: "special_election", target })}
          />
        </div>
      );

    case "execute":
      if (!isPres) return <Waiting>President {pres} is choosing someone to execute…</Waiting>;
      return (
        <div>
          <Title kicker={NAMES.powers.execute.toUpperCase()}>
            <Crosshair className="mr-1 inline h-7 w-7" />
            Execute a player
          </Title>
          <PlayerPicker
            game={game}
            me={me}
            variant="danger"
            allowed={(id) => id !== me.id && !!game.players.find((x) => x.id === id)?.alive}
            reason={(id) => (id === me.id ? "you" : "executed")}
            confirmLabel={(n) => `Execute ${n}`}
            onConfirm={(target) => send({ type: "execute", target })}
          />
        </div>
      );
  }
  return null;
}

function Ballot({ pres, chan, missing, send }: { pres: string; chan: string; missing: number; send: Send }) {
  const [sel, setSel] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <Title kicker="CAST YOUR SECRET BALLOT">
        {pres} <span className="text-muted">as President</span>
        <br />
        {chan} <span className="text-muted">as {NAMES.chancellor}</span>
      </Title>
      <div className="grid grid-cols-2 gap-3">
        {[true, false].map((ja) => (
          <button
            key={String(ja)}
            onClick={() => setSel(ja)}
            data-testid={ja ? "vote-ja" : "vote-nein"}
            className={cx(
              "no-select flex h-36 flex-col items-center justify-center rounded-lg border-2 transition",
              ja ? "border-[#e9dfc6] bg-[#f3ead3] text-[#1f1a14]" : "border-[#444] bg-[#1d1a17] text-[#f3ead3]",
              sel === ja && "ring-4 ring-gold ring-offset-2 ring-offset-bg -translate-y-1",
              sel !== null && sel !== ja && "opacity-50",
            )}
          >
            <span className="font-display text-5xl font-black">{ja ? NAMES.ja : NAMES.nein}</span>
            <span className="text-xs tracking-widest opacity-70">{ja ? "YES" : "NO"}</span>
          </button>
        ))}
      </div>
      <Button
        size="lg"
        disabled={sel === null || busy}
        data-testid="cast-vote"
        onClick={async () => {
          if (sel === null) return;
          setBusy(true);
          await send({ type: "vote", ja: sel });
          setBusy(false);
        }}
      >
        {sel === null ? "Pick a ballot" : `Cast ${sel ? NAMES.ja : NAMES.nein}`}
      </Button>
      <p className="text-center text-xs text-muted">
        {missing} vote{missing === 1 ? "" : "s"} still to come. Votes are revealed all at once.
      </p>
    </div>
  );
}
