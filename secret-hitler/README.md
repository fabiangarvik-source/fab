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
src/solo/         solo mode: bot brain (bot.ts) and the in-browser game loop (solo.ts)
src/client/       React UI (game screen, boards, rules, lobby, table, solo)
scripts/e2e.ts    plays full games in N separate browser tabs
scripts/e2e-solo.ts  plays a solo game through the UI, incl. an offline reload
```

## Run locally

```bash
cd secret-hitler
npm install
npm run dev            # http://localhost:3000
```

No database is needed locally: without `DATABASE_URL` rooms live in memory. To play from phones on your Wi-Fi, open `http://<your-computer's-LAN-IP>:3000` (the QR code uses whatever address the host opened).

**Bots in rooms**: in the lobby the host can fill empty seats with bots ("+1 / →5 / →7 / →10"), so two people can play a 7-player game. Bots run on the server with the same brain as solo mode, see only their own seat's information, move when someone polls, all vote at once, and post claims after each government. Set `DISABLE_BOTS=1` to turn them off.

## Solo mode

`/solo` ("Play solo vs bots" on the home screen) is one human against 4–11 bots. It never touches the server: the engine runs in the browser, the save lives in `localStorage` (a reload resumes the game) and the service worker caches the page, so it works offline once it has been opened online.

Bots only see what a person in their seat would see (the redacted view plus their own hands). Liberals score suspicion from enacted policies, votes and claims; Fascists know their team, push Fascist policies and lie in their claims; Hitler plays Liberal to look clean. Since there's no table talk, every President and Chancellor posts a claim of the cards they saw, and the human can claim (or lie) too. In all-bot play Liberals win roughly 50–65% of games depending on table size.

Note: the full game state sits in the player's own browser, so a determined player could read the other roles in dev tools. That only spoils their own game.

## Tests

```bash
npm test               # 84 unit tests: every rule in the brief incl. all edge cases,
                       # API redaction, concurrency, and 1,600 random full games (5–12 players)
npm run typecheck
npm run dev & BASE=http://localhost:3000 PLAYERS=7 npm run e2e
                       # 7 real browser tabs play a full game through the UI,
                       # including a mid-game reload, then "Play again"
                       # (add BOTS=5 with PLAYERS=2 for a mixed humans + bots room)
npm run start -- -H 127.0.0.1 & BASE=http://127.0.0.1:3000 PLAYERS=7 npm run e2e:solo
                       # one tab plays solo vs bots, goes offline mid-game and reloads
```

## Environment variables

| Variable | Where | Purpose |
| --- | --- | --- |
| `DATABASE_URL` (or `POSTGRES_URL`) | Vercel (required) | Postgres connection string. Neon via the Vercel Marketplace sets it for you. The `sh_rooms` table is created automatically. |
| `DISABLE_BOTS` | optional | `1` hides the "fill with bots" buttons. |

## Deploy to Vercel

The Vercel project **`secret-hitler`** already exists (root directory `secret-hitler`, Next.js, Node 22, public URL `https://secret-hitler-ten.vercel.app`). What it still needs:

1. **Database:** Vercel → Storage → your Neon database → **Connect Project** → `secret-hitler` (production + preview). That adds `DATABASE_URL`. Reusing the Himmest database is fine; this app only touches its own `sh_rooms` table, created automatically. Then **Redeploy** the latest deployment.
2. **Auto-deploy on push (optional):** Project → Settings → Git → connect `fabiangarvik-source/fab`. Vercel will ask to install its GitHub app on the repo first.

Rooms expire after 4 hours without activity.

## Decisions made

- **11–12 players** use a fan extension (the official game stops at 10): 11 = 6 Liberals + 4 Fascists + Hitler, 12 = 7 Liberals + 4 Fascists + Hitler, using the 9–10 Fascist board, and Hitler does not know the Fascists (as for 7–10). The deck stays 17 policies.
- **Reshuffle** combines the discard pile with the remaining draw pile (the official rule), checked after every legislative session, after chaos, and before a peek.
- **Votes**: everyone sees *who* has voted (not how) while voting is open, plus "waiting for N more votes".
- **Policy choice**: secret cards are only drawn while you press and hold; you then pick by number (card 1/2/3) so nothing secret stays on screen.
- **Full history at game end** (every hand, discard, peek and investigation) is on by default; the host can turn it off in the lobby.
- **Reconnection** works per device (token in `localStorage`). A player who switches to a different phone mid-game can't reclaim their seat; the host can end the game and start a new one.

## Credits

*Secret Hitler* is created by Max Temkin, Mike Boxleiter and Tommy Maranges, published by Goat, Wolf & Cabbage, and licensed under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). This is a free, non-commercial fan companion with original artwork (no ads, no payments).
