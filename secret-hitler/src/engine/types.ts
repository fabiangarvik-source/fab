import type { Power } from "./config";

export type Role = "liberal" | "fascist" | "hitler";
export type Party = "liberal" | "fascist";
export type Policy = "L" | "F";
export type Winner = Party;
export type WinReason = "liberal_policies" | "hitler_executed" | "fascist_policies" | "hitler_elected";

export type Phase =
  | "night" // role reveal, waiting for everyone to confirm
  | "nominate" // President picks a Chancellor candidate
  | "vote" // everyone alive votes
  | "pres_legislate" // President discards 1 of 3
  | "chan_legislate" // Chancellor enacts 1 of 2 (or proposes veto)
  | "veto" // President answers a veto proposal
  | "investigate"
  | "investigate_result" // President looks at the result, then confirms
  | "peek"
  | "special"
  | "execute"
  | "over";

export interface Player {
  id: string;
  name: string;
  role: Role;
  alive: boolean;
  investigated: boolean;
  seenRole: boolean;
}

export type LogEntry = { round: number } & (
  | { t: "start"; seats: string[] }
  | { t: "nominate"; president: string; chancellor: string }
  | { t: "vote"; president: string; chancellor: string; votes: Record<string, boolean>; passed: boolean }
  | { t: "tracker"; value: number }
  | { t: "enact"; policy: Policy; president: string; chancellor: string }
  | { t: "chaos"; policy: Policy }
  | { t: "veto_proposed"; chancellor: string }
  | { t: "veto"; agreed: boolean; president: string }
  | { t: "reshuffle"; drawSize: number }
  | { t: "power"; power: Power; president: string; target?: string }
  | { t: "win"; winner: Winner; reason: WinReason }
  // Secret entries: only revealed after the game ends (if the room allows it).
  | { t: "draw"; secret: true; president: string; cards: Policy[] }
  | { t: "pres_discard"; secret: true; president: string; card: Policy; passed: Policy[] }
  | { t: "chan_discard"; secret: true; chancellor: string; card: Policy }
  | { t: "veto_discard"; secret: true; cards: Policy[] }
  | { t: "investigation_result"; secret: true; president: string; target: string; party: Party }
  | { t: "peek_result"; secret: true; president: string; cards: Policy[] }
);

export interface Investigation {
  president: string;
  target: string;
  party: Party;
}

export interface GameState {
  rng: number;
  players: Player[]; // seat order, clockwise
  phase: Phase;
  round: number;
  presidentIdx: number; // current Presidential Candidate / President
  chancellorIdx: number | null; // current Chancellor Candidate / Chancellor
  specialCallerIdx: number | null; // set during a Special Election round
  lastPresidentIdx: number | null; // last *elected* government (term limits)
  lastChancellorIdx: number | null;
  votes: Record<string, boolean>;
  lastVote: { president: string; chancellor: string; votes: Record<string, boolean>; passed: boolean } | null;
  electionTracker: number;
  liberalPolicies: number;
  fascistPolicies: number;
  drawPile: Policy[];
  discardPile: Policy[];
  hand: Policy[]; // the 3 (President) or 2 (Chancellor) policies in play
  vetoProposed: boolean;
  vetoRefused: boolean;
  peek: Policy[] | null;
  investigation: Investigation | null; // pending result shown to the President
  investigations: Investigation[]; // every result, private to its President
  winner: Winner | null;
  winReason: WinReason | null;
  log: LogEntry[];
}

export type Action =
  | { type: "ack_role"; player: string }
  | { type: "nominate"; player: string; target: string }
  | { type: "vote"; player: string; ja: boolean }
  | { type: "president_discard"; player: string; index: number }
  | { type: "chancellor_enact"; player: string; index: number }
  | { type: "propose_veto"; player: string }
  | { type: "veto_response"; player: string; agree: boolean }
  | { type: "investigate"; player: string; target: string }
  | { type: "ack_investigation"; player: string }
  | { type: "ack_peek"; player: string }
  | { type: "special_election"; player: string; target: string }
  | { type: "execute"; player: string; target: string };

export type ActionResult = { ok: true; state: GameState } | { ok: false; error: string };
