// Game configuration: player counts, boards and every user-facing name for
// roles, parties and policies. Swap names here to re-theme the game.

export const MIN_PLAYERS = 5;
export const MAX_PLAYERS = 12;

export const LIBERAL_TO_WIN = 5;
export const FASCIST_TO_WIN = 6;
export const HITLER_ZONE = 3; // Fascist policies after which electing Hitler wins
export const VETO_UNLOCK = 5;
export const CHAOS_AT = 3;

export const DECK = { liberal: 6, fascist: 11 } as const;

/** Liberals / Fascists (excluding Hitler) per player count.
 *  5-10 follow the official game. 11-12 are a fan extension. */
export const ROLE_COUNTS: Record<number, { liberals: number; fascists: number }> = {
  5: { liberals: 3, fascists: 1 },
  6: { liberals: 4, fascists: 1 },
  7: { liberals: 4, fascists: 2 },
  8: { liberals: 5, fascists: 2 },
  9: { liberals: 5, fascists: 3 },
  10: { liberals: 6, fascists: 3 },
  11: { liberals: 6, fascists: 4 },
  12: { liberals: 7, fascists: 4 },
};

export type Power = "investigate" | "peek" | "special" | "execute";

/** Power granted by the Nth Fascist policy (index 0 = 1st policy). */
export const BOARDS: Record<"small" | "medium" | "large", (Power | null)[]> = {
  small: [null, null, "peek", "execute", "execute", null],
  medium: [null, "investigate", "special", "execute", "execute", null],
  large: ["investigate", "investigate", "special", "execute", "execute", null],
};

export function boardFor(playerCount: number): "small" | "medium" | "large" {
  if (playerCount <= 6) return "small";
  if (playerCount <= 8) return "medium";
  return "large"; // 9-12
}

/** In 5-6 player games Hitler knows the Fascist; from 7 up Hitler knows nobody. */
export function hitlerKnowsFascists(playerCount: number) {
  return playerCount <= 6;
}

export const NAMES = {
  game: "Secret Hitler",
  roles: { liberal: "Liberal", fascist: "Fascist", hitler: "Hitler" },
  parties: { liberal: "Liberal", fascist: "Fascist" },
  partiesPlural: { liberal: "Liberals", fascist: "Fascists" },
  policies: { L: "Liberal", F: "Fascist" },
  president: "President",
  chancellor: "Chancellor",
  ja: "Ja!",
  nein: "Nein",
  powers: {
    investigate: "Investigate Loyalty",
    peek: "Policy Peek",
    special: "Special Election",
    execute: "Execution",
  } satisfies Record<Power, string>,
} as const;
