"use client";

import { useEffect, useRef } from "react";
import { BOARDS, NAMES, ROLE_COUNTS } from "../engine/config";
import { Cards, Crosshair, Dove, Eye, Gavel, Podium, PowerIcon, Serpent, Skull } from "./icons";
import { cx } from "./ui";

export type RuleSection =
  | "quickstart"
  | "objective"
  | "setup"
  | "night"
  | "election"
  | "tracker"
  | "legislative"
  | "veto"
  | "powers"
  | "investigate"
  | "peek"
  | "special"
  | "execute"
  | "winning"
  | "strategy"
  | "credits";

const TOC: { id: RuleSection; title: string }[] = [
  { id: "quickstart", title: "Quick start in 60 seconds" },
  { id: "objective", title: "Objective" },
  { id: "setup", title: "Roles & setup" },
  { id: "night", title: "Night phase" },
  { id: "election", title: "Elections & term limits" },
  { id: "tracker", title: "Election tracker & chaos" },
  { id: "legislative", title: "Legislative session" },
  { id: "veto", title: "Veto power" },
  { id: "powers", title: "Presidential powers" },
  { id: "investigate", title: "Investigate Loyalty" },
  { id: "peek", title: "Policy Peek" },
  { id: "special", title: "Special Election" },
  { id: "execute", title: "Execution" },
  { id: "winning", title: "How to win" },
  { id: "strategy", title: "Strategy tips for new players" },
  { id: "credits", title: "Credits & license" },
];

function Section({ id, title, focus, children, icon }: { id: RuleSection; title: string; focus?: RuleSection; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <details id={`rule-${id}`} open={!focus || focus === id || id === "quickstart"} className="group scroll-mt-16 border-b border-line py-1">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 py-2">
        {icon && <span className="text-gold">{icon}</span>}
        <h2 className="font-display text-xl font-extrabold">{title}</h2>
        <span className="ml-auto text-muted transition group-open:rotate-90">›</span>
      </summary>
      <div className="space-y-3 pb-4 text-[15px] leading-relaxed text-ink/90 [&_b]:text-ink [&_li]:ml-5 [&_li]:list-disc">{children}</div>
    </details>
  );
}

function PowerTable() {
  const cols: [string, keyof typeof BOARDS][] = [
    ["5–6", "small"],
    ["7–8", "medium"],
    ["9–12", "large"],
  ];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-muted">
            <th className="py-1 pr-2">Fascist #</th>
            {cols.map(([l]) => (
              <th key={l} className="py-1 pr-2">
                {l} players
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <tr key={i} className="border-t border-line">
              <td className="py-1.5 pr-2 font-bold">{i + 1}</td>
              {cols.map(([l, b]) => {
                const p = BOARDS[b][i];
                return (
                  <td key={l} className="py-1.5 pr-2">
                    {i === 5 ? (
                      <span className="inline-flex items-center gap-1 text-fas-ink">
                        <Skull className="h-4 w-4" /> Fascists win
                      </span>
                    ) : p ? (
                      <span className="inline-flex items-center gap-1">
                        <PowerIcon power={p} className="h-4 w-4 text-fas-ink" />
                        {NAMES.powers[p]}
                        {i === 4 && " + Veto"}
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MiniTracker() {
  return (
    <div className="flex items-center gap-2" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className={cx("flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold", i === 3 ? "border-fas text-fas-ink" : "border-line text-muted")}>
          {i === 3 ? "!" : i}
        </span>
      ))}
      <span className="text-sm text-muted">→ 3 failed elections = chaos</span>
    </div>
  );
}

export function RulesContent({ focus }: { focus?: RuleSection }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!focus) return;
    const el = ref.current?.querySelector(`#rule-${focus}`);
    el?.scrollIntoView({ block: "start" });
  }, [focus]);

  return (
    <div ref={ref} className="relative">
      <nav aria-label="Rules contents" className="sticky top-0 z-10 -mx-4 overflow-x-auto border-b border-line bg-bg/95 px-4 py-2 backdrop-blur">
        <ul className="flex gap-2 whitespace-nowrap text-sm">
          {TOC.map((t) => (
            <li key={t.id}>
              <a
                href={`#rule-${t.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  const el = ref.current?.querySelector<HTMLDetailsElement>(`#rule-${t.id}`);
                  if (el) {
                    el.open = true;
                    el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }
                }}
                className={cx("inline-flex min-h-10 items-center rounded-full border px-3", focus === t.id ? "border-gold text-gold" : "border-line text-muted")}
              >
                {t.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <Section id="quickstart" title="Quick start in 60 seconds" focus={focus}>
        <ol className="space-y-2 [&>li]:ml-5 [&>li]:list-decimal">
          <li>
            Everyone gets a secret role. Most players are <b className="text-lib-ink">Liberals</b>. A few are <b className="text-fas-ink">Fascists</b>, and one of them is{" "}
            <b className="text-fas-ink">Hitler</b>. The Fascists know who they are; the Liberals don&apos;t.
          </li>
          <li>Each round, the President nominates a Chancellor and everyone votes Ja! or Nein.</li>
          <li>If the government is elected, the President draws 3 policies, discards 1, and the Chancellor enacts 1 of the 2 left.</li>
          <li>Fascist policies give the President powers: investigate someone, peek at the deck, pick the next President, or execute someone.</li>
          <li>
            <b className="text-lib-ink">Liberals win</b> with 5 Liberal policies or by executing Hitler. <b className="text-fas-ink">Fascists win</b> with 6 Fascist policies or by
            getting Hitler elected Chancellor once 3 Fascist policies are down.
          </li>
          <li>Talk, accuse, lie. The app keeps the secrets; the table does the rest.</li>
        </ol>
      </Section>

      <Section id="objective" title="Objective" focus={focus}>
        <p>
          The Liberals want to pass Liberal policies and find Hitler. The Fascists want to sow confusion, pass Fascist policies and quietly get Hitler into power. Nobody
          knows who to trust, and that is the whole game.
        </p>
      </Section>

      <Section id="setup" title="Roles & setup" focus={focus} icon={<Dove className="h-5 w-5" />}>
        <p>Roles are dealt at random. Hitler counts as a member of the Fascist party.</p>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-muted">
              <th className="py-1">Players</th>
              <th>Liberals</th>
              <th>Fascists</th>
              <th>Hitler</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(ROLE_COUNTS).map(([n, c]) => (
              <tr key={n} className="border-t border-line">
                <td className="py-1.5 font-bold">
                  {n}
                  {Number(n) > 10 && <sup className="text-gold">*</sup>}
                </td>
                <td className="text-lib-ink">{c.liberals}</td>
                <td className="text-fas-ink">{c.fascists}</td>
                <td className="text-fas-ink">1</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-sm text-muted">
          <sup className="text-gold">*</sup> The official game is for 5–10 players. 11 and 12 use a popular fan extension with the 9–10 player Fascist board.
        </p>
        <p>
          The policy deck has <b>17 tiles: 6 Liberal and 11 Fascist</b>. Seat order is random and shown to everyone; the presidency moves clockwise in that order. The first
          President is random.
        </p>
      </Section>

      <Section id="night" title="Night phase" focus={focus} icon={<Eye className="h-5 w-5" />}>
        <p>When the game starts, each phone shows a secret card. Hold it close, press and hold to look, and tap &quot;I&apos;ve seen it&quot;.</p>
        <ul>
          <li>
            <b>5–6 players:</b> the Fascist and Hitler know each other.
          </li>
          <li>
            <b>7–12 players:</b> the Fascists know each other and know who Hitler is. Hitler does <b>not</b> know who the Fascists are.
          </li>
          <li>Liberals learn nothing.</li>
        </ul>
      </Section>

      <Section id="election" title="Elections & term limits" focus={focus} icon={<Podium className="h-5 w-5" />}>
        <p>
          <b>1. Pass the presidency.</b> The Presidential Candidate moves clockwise to the next living player.
        </p>
        <p>
          <b>2. Nominate a Chancellor.</b> The candidate picks any eligible living player. You can never nominate yourself.
        </p>
        <p>
          <b>Term limits:</b> the last <em>elected</em> President and Chancellor can&apos;t be nominated as Chancellor. Failed nominees don&apos;t count. When only 5 players are
          left alive, only the last Chancellor is blocked. Blocked players show a &quot;term-limited&quot; label.
        </p>
        <p>
          <b>3. Vote.</b> Every living player votes Ja! or Nein in secret, including the two candidates. Votes are revealed together once everyone has voted.
        </p>
        <p>
          <b>4. Result.</b> A strict majority of Ja! is needed; a tie fails. If it fails, the presidency moves on and the Election Tracker advances. If it passes, the
          government takes office. If 3+ Fascist policies are already enacted and the new Chancellor is Hitler, the Fascists win on the spot.
        </p>
      </Section>

      <Section id="tracker" title="Election tracker & chaos" focus={focus}>
        <MiniTracker />
        <p>
          Every failed election moves the tracker one step. On the <b>third</b> failure in a row, the country is thrown into chaos: the top policy of the deck is enacted
          immediately, <b>its power is ignored</b>, the tracker resets, and <b>all term limits are cleared</b>.
        </p>
        <p>The tracker also resets whenever a government enacts a policy.</p>
      </Section>

      <Section id="legislative" title="Legislative session" focus={focus} icon={<Cards className="h-5 w-5" />}>
        <p>
          The President secretly draws the top 3 policies, discards 1 face down, and passes 2 to the Chancellor. The Chancellor discards 1 and enacts the other, which is
          revealed to everyone.
        </p>
        <p>
          <b>No talking until the policy is enacted.</b> Afterwards, anyone may claim anything about what they saw, including lies. Discards are never revealed during the
          game.
        </p>
        <p>When fewer than 3 policies remain in the draw pile, the discards are shuffled back in.</p>
      </Section>

      <Section id="veto" title="Veto power" focus={focus} icon={<Gavel className="h-5 w-5" />}>
        <p>
          Once <b>5 Fascist policies</b> are enacted, the Chancellor may propose a veto instead of enacting. If the President agrees, both policies are discarded and the
          Election Tracker advances (which can cause chaos). If the President refuses, the Chancellor must enact one. A veto can be proposed once per session.
        </p>
      </Section>

      <Section id="powers" title="Presidential powers" focus={focus} icon={<Serpent className="h-5 w-5" />}>
        <p>
          When a <b>government</b> enacts a Fascist policy, the President must use the power printed on that slot before the next round. Policies enacted by chaos grant
          nothing.
        </p>
        <PowerTable />
      </Section>

      <Section id="investigate" title="Investigate Loyalty" focus={focus} icon={<Eye className="h-5 w-5" />}>
        <p>
          The President picks a player and privately sees their <b>party</b> (Liberal or Fascist). Hitler shows as Fascist. Nobody can be investigated twice. Everyone else
          only sees who was investigated, and the President may share the result or lie about it.
        </p>
      </Section>

      <Section id="peek" title="Policy Peek" focus={focus} icon={<Cards className="h-5 w-5" />}>
        <p>The President privately looks at the top 3 policies of the deck, in order, without changing them.</p>
      </Section>

      <Section id="special" title="Special Election" focus={focus} icon={<Podium className="h-5 w-5" />}>
        <p>
          The President picks any other living player to be the next Presidential Candidate, term limits don&apos;t matter. After that round, the presidency returns to the
          player to the left of the President who called it, as if nothing happened. Picking the player who was next anyway gives them two turns in a row.
        </p>
      </Section>

      <Section id="execute" title="Execution" focus={focus} icon={<Crosshair className="h-5 w-5" />}>
        <p>
          The President picks a living player to kill. If it was Hitler, the Liberals win immediately. Otherwise the role stays secret; the executed player can no longer
          speak, vote or hold office.
        </p>
      </Section>

      <Section id="winning" title="How to win" focus={focus} icon={<Skull className="h-5 w-5" />}>
        <ul>
          <li>
            <b className="text-lib-ink">Liberals:</b> enact 5 Liberal policies, or execute Hitler.
          </li>
          <li>
            <b className="text-fas-ink">Fascists:</b> enact 6 Fascist policies, or elect Hitler as Chancellor after 3 Fascist policies are on the board.
          </li>
        </ul>
      </Section>

      <Section id="strategy" title="Strategy tips for new players" focus={focus}>
        <ul>
          <li>Liberals: conflicting claims about a hand mean someone lied. Track who was in which government.</li>
          <li>The deck is Fascist-heavy, so &quot;I only drew Fascists&quot; is often true. Often. Not always.</li>
          <li>Hitler should act exactly like a careful Liberal and avoid controversy.</li>
          <li>Fascists: you know each other, so don&apos;t defend each other too obviously.</li>
          <li>After 3 Fascist policies, every Chancellor vote matters. Only elect people you have real reasons to trust.</li>
          <li>Votes are public after the reveal. Look at who keeps voting Ja! for suspicious governments.</li>
        </ul>
      </Section>

      <Section id="credits" title="Credits & license" focus={focus}>
        <p>
          <em>Secret Hitler</em> is created by Max Temkin, Mike Boxleiter and Tommy Maranges, published by Goat, Wolf &amp; Cabbage, and licensed under{" "}
          <a className="underline" href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noreferrer">
            Creative Commons BY-NC-SA 4.0
          </a>
          . This is a free, non-commercial fan companion with original artwork. No ads, no payments.
        </p>
      </Section>
    </div>
  );
}

/** Which rule to open when "?" is tapped during a phase. */
export function sectionForPhase(phase: string | undefined): RuleSection | undefined {
  switch (phase) {
    case "night":
      return "night";
    case "nominate":
    case "vote":
      return "election";
    case "pres_legislate":
    case "chan_legislate":
      return "legislative";
    case "veto":
      return "veto";
    case "investigate":
    case "investigate_result":
      return "investigate";
    case "peek":
      return "peek";
    case "special":
      return "special";
    case "execute":
      return "execute";
    case "over":
      return "winning";
  }
  return undefined;
}
