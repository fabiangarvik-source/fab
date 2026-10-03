# Secret Hitler · Table Companion

A phone-first web app for playing *Secret Hitler* in one room with 5–12 people. Every phone becomes that player's role card, ballot and policy hand; the boards, tracker, deck and rules are handled by the server. People still talk face to face.

- **Create a room** → 4-letter code (no I/O) + QR code. Others scan or type the code.
- **Night phase**: press-and-hold to see your role (and your allies, per the rules).
- **Elections, legislative sessions, veto, every presidential power**, chaos, term limits, reshuffles, all enforced server-side.
- **Table screen** at `/table/CODE` for a TV or laptop: public information only.
- **Rules page** at `/rules`, also available in-game via **?**, opening at the rule for the current phase.
- Dark mode by default, light "paper" mode, optional sound (off by default), haptics on your turn, reduced-motion support, installable as a PWA.

## Stack, and why

Next.js 15 (App Router) + TypeScript + Tailwind CSS 4, deployed on **Vercel**.

**Realtime is short polling (1 s) against Vercel functions, with room state in Postgres (Neon).** Vercel functions can't hold WebSocket connections, and a hosted realtime service (Pusher/Ably/Supabase) would add a second account and still need a server to keep the hidden state. Polling keeps a single deploy target and a single source of truth:

- Every request hits a route handler that loads the room, applies the change through the pure rules engine, and writes it back with **compare-and-set on a version number**, so 12 simultaneous votes are all counted.
- The response is a **personalised, redacted snapshot**. The full `GameState` (roles, deck order, discards) never leaves the server; see `src/engine/view.ts`.
- About 1 request per player per second while the tab is visible; hidden tabs back off. For a party game that is a fine trade for ~1 s latency.

## Project layout

```
src/engine/       pure rules engine (no I/O), seeded RNG, redaction, tests
  config.ts       player counts, boards, and every role/policy name (re-theme here)
  engine.ts       (state, action) -> new state; legalActions() for bots/tests
  view.ts         what each player (or the table screen) is allowed to see
src/server/       room logic (lobby, host, bots, presence) + Postgres/memory store
app/api/rooms/    route handlers: create, join/resume, poll, act
src/client/       React UI (game screen, boards, rules, lobby, table)
scripts/e2e.ts    plays full games in N separate browser tabs
```

## Run locally

```bash
cd secret-hitler
npm install
npm run dev            # http://localhost:3000
```

No database is needed locally: without `DATABASE_URL` rooms live in memory. To play from phones on your Wi-Fi, open `http://<your-computer's-LAN-IP>:3000` (the QR code uses whatever address the host opened).

**Dev mode bots**: in the lobby the host sees "+1 / →5 / →10 / →12" buttons that add bot players who take random legal actions, so you can test any player count alone. Bots are off in production unless `ENABLE_BOTS=1`.

## Tests

```bash
npm test               # 77 unit tests: every rule in the brief incl. all edge cases,
                       # API redaction, concurrency, and 1,600 random full games (5–12 players)
npm run typecheck
npm run dev & BASE=http://localhost:3000 PLAYERS=7 npm run e2e
                       # 7 real browser tabs play a full game through the UI,
                       # including a mid-game reload, then "Play again"
```

## Environment variables

| Variable | Where | Purpose |
| --- | --- | --- |
| `DATABASE_URL` (or `POSTGRES_URL`) | Vercel (required) | Postgres connection string. Neon via the Vercel Marketplace sets it for you. The `sh_rooms` table is created automatically. |
| `ENABLE_BOTS` | optional | `1` shows the bot buttons outside development. |

## Deploy to Vercel

1. In Vercel, **Add New → Project → import `fabiangarvik-source/fab`**, set **Root Directory** to `secret-hitler` (framework: Next.js). If Vercel asks, install the Vercel GitHub app for the repo so pushes auto-deploy.
2. **Storage → your Neon database → Connect Project →** pick this project (production + preview). That adds `DATABASE_URL`. You can reuse the database the Himmest app already uses; this app only touches its own `sh_rooms` table.
3. Redeploy. Rooms expire after 4 hours without activity.

## Decisions made

- **11–12 players** use a fan extension (the official game stops at 10): 11 = 6 Liberals + 4 Fascists + Hitler, 12 = 7 Liberals + 4 Fascists + Hitler, using the 9–10 Fascist board, and Hitler does not know the Fascists (as for 7–10). The deck stays 17 policies.
- **Reshuffle** combines the discard pile with the remaining draw pile (the official rule), checked after every legislative session, after chaos, and before a peek.
- **Votes**: everyone sees *who* has voted (not how) while voting is open, plus "waiting for N more votes".
- **Policy choice**: secret cards are only drawn while you press and hold; you then pick by number (card 1/2/3) so nothing secret stays on screen.
- **Full history at game end** (every hand, discard, peek and investigation) is on by default; the host can turn it off in the lobby.
- **Reconnection** works per device (token in `localStorage`). A player who switches to a different phone mid-game can't reclaim their seat; the host can end the game and start a new one.

## Credits

*Secret Hitler* is created by Max Temkin, Mike Boxleiter and Tommy Maranges, published by Goat, Wolf & Cabbage, and licensed under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). This is a free, non-commercial fan companion with original artwork (no ads, no payments).
