// Runs bots on a GameState: picks a bot's move from what that seat may know,
// and after each action lets bots in the government post their claims.
// Shared by solo mode (in the browser) and multiplayer rooms (on the server).

import { applyAction } from "../engine/engine";
import type { Action, GameState, Policy } from "../engine/types";
import { viewFor, type SecretLogEntry } from "../engine/view";
import type { ClientAction } from "../protocol";
import { botAct, botInvestigationClaim, botLegislativeClaim, type ClaimInput } from "./bot";

export type Rand = () => number;

/** Secret log entries `id` saw with their own eyes as President or Chancellor. */
export function secretsFor(game: GameState, id: string): SecretLogEntry[] {
  return game.log.filter((e): e is SecretLogEntry => {
    if (!("secret" in e)) return false;
    if (e.t === "chan_discard") return e.chancellor === id;
    if (e.t === "veto_discard") return false;
    return e.president === id;
  });
}

/** The hands `id` was passed as Chancellor, by round. */
export function receivedFor(game: GameState, id: string): { round: number; cards: Policy[] }[] {
  const chancellorOf = new Map<number, string>();
  const out: { round: number; cards: Policy[] }[] = [];
  for (const e of game.log) {
    if (e.t === "nominate") chancellorOf.set(e.round, e.chancellor);
    else if (e.t === "pres_discard" && chancellorOf.get(e.round) === id) out.push({ round: e.round, cards: [...e.passed] });
  }
  return out;
}

function inputFor(game: GameState, id: string, rand: Rand) {
  return { view: viewFor(game, id, false), secrets: secretsFor(game, id), received: receivedFor(game, id), rand };
}

export function botMove(game: GameState, id: string, rand: Rand): ClientAction | null {
  return botAct(inputFor(game, id, rand));
}

/** Claims are filed under the round they're about; late ones go after that round's last entry. */
export function pushClaim(game: GameState, c: ClaimInput, round: number) {
  const after = game.log.findLastIndex((e) => e.round <= round);
  game.log.splice(after + 1, 0, { ...c, round } as GameState["log"][number]);
}

/** A government member who isn't a bot and might want to make a claim. */
export type HumanClaimDue =
  | { kind: "draw" | "receive"; player: string; round: number; cards: Policy[] }
  | { kind: "investigate"; player: string; round: number; target: string; party: "liberal" | "fascist" };

/**
 * After `action` turned `prev` into `game`, let bots that just served say
 * what they saw (mutates `game.log`). Returns the claims humans could make.
 */
export function afterAction(prev: GameState, game: GameState, action: Action, isBot: (id: string) => boolean, rand: Rand): HumanClaimDue[] {
  const human: HumanClaimDue[] = [];
  const enact = game.log.slice(prev.log.length).find((e) => e.t === "enact");
  if (enact && enact.t === "enact") {
    let presClaim: Policy[] | null = null;
    for (const [role, id] of [
      ["president", enact.president],
      ["chancellor", enact.chancellor],
    ] as const) {
      if (!isBot(id)) {
        const cards =
          role === "president"
            ? (secretsFor(game, id).findLast((e) => e.t === "draw") as Extract<SecretLogEntry, { t: "draw" }> | undefined)?.cards
            : receivedFor(game, id).at(-1)?.cards;
        if (cards) human.push({ kind: role === "president" ? "draw" : "receive", player: id, round: enact.round, cards });
        continue;
      }
      const claim = botLegislativeClaim(inputFor(game, id, rand), role, enact.policy, presClaim);
      if (claim) {
        pushClaim(game, claim, enact.round);
        if (claim.kind === "draw") presClaim = claim.cards;
      }
    }
  }
  if (action.type === "ack_investigation" && prev.investigation) {
    const inv = prev.investigation;
    if (isBot(action.player)) {
      const claim = botInvestigationClaim(inputFor(prev, action.player, rand));
      if (claim) pushClaim(game, claim, prev.round);
    } else human.push({ kind: "investigate", player: action.player, round: prev.round, target: inv.target, party: inv.party });
  }
  return human;
}

/** Apply an action and the bot claims that follow it. */
export function applyWithClaims(prev: GameState, action: Action, isBot: (id: string) => boolean, rand: Rand) {
  const res = applyAction(prev, action);
  if (!res.ok) return res;
  const human = afterAction(prev, res.state, action, isBot, rand);
  return { ok: true as const, state: res.state, human };
}
