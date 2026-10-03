// End-to-end check: N real browser tabs (separate storage, phone-sized) play a
// full game through the UI. Usage: BASE=http://localhost:3000 PLAYERS=7 npm run e2e
//
// Each tab acts only on what its own screen shows. Along the way we check that
// secrets stay where they belong.

import { mkdirSync } from "node:fs";
import { chromium, type Browser, type Page } from "playwright-core";

const BASE = process.env.BASE ?? "http://localhost:3000";
const N = Number(process.env.PLAYERS ?? 7);
const SHOTS = process.env.SHOTS ?? "e2e-screens";
const EXE = process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const MAX_STEPS = 4000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rnd = <T>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

function fail(msg: string): never {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

async function hold(page: Page, testId: string, ms = 250) {
  const el = page.getByTestId(testId);
  const box = await el.boundingBox();
  if (!box) return;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await sleep(ms);
}

async function release(page: Page) {
  await page.mouse.up();
}

/** Wait until this tab's action panel shows something new after an action. */
async function settle(page: Page) {
  const before = await page.getByTestId("action-panel").innerText().catch(() => "");
  await page
    .waitForFunction(
      (b) => {
        const el = document.querySelector('[data-testid="action-panel"]') as HTMLElement | null;
        return !el || el.innerText !== b || !!document.querySelector('[data-testid="vote-reveal"],[data-testid="game-over"]');
      },
      before,
      { timeout: 6000 },
    )
    .catch(() => {});
}

async function visible(page: Page, testId: string) {
  return page.getByTestId(testId).first().isVisible().catch(() => false);
}

async function main() {
  mkdirSync(SHOTS, { recursive: true });
  const browser: Browser = await chromium.launch({ executablePath: EXE });
  const pages: Page[] = [];
  const names = Array.from({ length: N }, (_, i) => ["Alex", "Blair", "Casey", "Drew", "Eden", "Finn", "Gray", "Harper", "Indy", "Jules", "Kai", "Lane"][i]);
  for (let i = 0; i < N; i++) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: false });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => fail(`page error in ${names[i]}: ${e.message}`));
    pages.push(page);
  }

  // Host creates a room
  const host = pages[0];
  await host.goto(BASE);
  await host.getByTestId("home-name").fill(names[0]);
  await host.getByTestId("create-room").click();
  await host.getByTestId("room-code").waitFor();
  const code = (await host.getByTestId("room-code").textContent())!.trim();
  console.log(`room ${code}`);

  // Everyone else joins through /join?code=...
  for (let i = 1; i < N; i++) {
    const p = pages[i];
    await p.goto(`${BASE}/join?code=${code}`);
    await p.getByTestId("join-name").fill(names[i]);
    await p.getByTestId("join-room").click();
    await p.getByTestId("room-code").waitFor();
  }
  await host.waitForFunction((n) => document.querySelectorAll('[data-testid="lobby-players"] li').length === n, N);
  await host.screenshot({ path: `${SHOTS}/lobby.png`, fullPage: true });

  // Reload one player mid-lobby: they must keep their seat.
  await pages[1].reload();
  await pages[1].getByTestId("room-code").waitFor();

  await host.getByTestId("start-game").click();

  const roles = new Map<string, string>();
  const known = new Map<string, string[]>();
  let shotPhases = new Set<string>();
  let steps = 0;
  let reloaded = false;

  for (;;) {
    if (++steps > MAX_STEPS) fail("game did not finish");
    let acted = false;

    for (let i = 0; i < N; i++) {
      const p = pages[i];
      const me = names[i];

      if (await visible(p, "game-over")) continue;
      if (await visible(p, "vote-reveal")) {
        if (!shotPhases.has("vote-reveal")) {
          shotPhases.add("vote-reveal");
          await sleep(1800);
          await p.screenshot({ path: `${SHOTS}/vote-reveal.png` });
        }
        await p.getByTestId("vote-reveal").click();
        acted = true;
        continue;
      }

      const panel = p.getByTestId("action-panel");
      if (!(await panel.isVisible().catch(() => false))) continue;
      const phase = await panel.getAttribute("data-phase");
      const myTurn = (await panel.getAttribute("data-my-turn")) === "1";
      if (!myTurn) continue;

      if (phase && !shotPhases.has(phase)) {
        shotPhases.add(phase);
        await p.screenshot({ path: `${SHOTS}/${phase}.png` });
      }

      if (await visible(p, "ack-role")) {
        await hold(p, "reveal-role");
        const role = (await p.getByTestId("role-name").textContent())!.trim();
        const allies = (await visible(p, "known-roles")) ? await p.getByTestId("known-roles").locator("li").allTextContents() : [];
        if (!shotPhases.has("role-held")) {
          shotPhases.add("role-held");
          await p.screenshot({ path: `${SHOTS}/role-held.png` });
        }
        await release(p);
        if (await visible(p, "role-name")) fail("role still visible after releasing the hold");
        roles.set(me, role);
        known.set(me, allies);
        await p.getByTestId("ack-role").click();
        acted = true;
        await settle(p);
        continue;
      }
      if (await visible(p, "cast-vote")) {
        await p.getByTestId(Math.random() < 0.62 ? "vote-ja" : "vote-nein").click();
        await p.getByTestId("cast-vote").click();
        acted = true;
        await settle(p);
        continue;
      }
      if (await visible(p, "reveal-hand")) {
        await hold(p, "reveal-hand");
        const hand = await p.getByTestId("hand").locator(".font-display.font-extrabold").allTextContents().catch(() => []);
        if (!shotPhases.has(`hand-${phase}`)) {
          shotPhases.add(`hand-${phase}`);
          await p.screenshot({ path: `${SHOTS}/hand-${phase}.png` });
        }
        await release(p);
        void hand;
        if ((await visible(p, "propose-veto")) && Math.random() < 0.5) {
          await p.getByTestId("propose-veto").click();
        } else {
          const n = phase === "pres_legislate" ? 3 : 2;
          await p.getByTestId(`card-${1 + Math.floor(Math.random() * n)}`).click();
          await p.getByTestId("confirm").click();
        }
        acted = true;
        await settle(p);
        continue;
      }
      if (await visible(p, "veto-agree")) {
        await p.getByTestId(Math.random() < 0.5 ? "veto-agree" : "veto-refuse").click();
        acted = true;
        await settle(p);
        continue;
      }
      for (const id of ["reveal-investigation", "reveal-peek"]) {
        if (await visible(p, id)) {
          await hold(p, id);
          if (!shotPhases.has(id)) {
            shotPhases.add(id);
            await p.screenshot({ path: `${SHOTS}/${id}.png` });
          }
          await release(p);
        }
      }
      if (await visible(p, "ack")) {
        await p.getByTestId("ack").click();
        acted = true;
        await settle(p);
        continue;
      }
      if (await visible(p, "confirm")) {
        const options = await p.locator('[data-testid^="pick-"]:not([disabled])').all();
        if (!options.length) fail(`${me}: nothing to pick in ${phase}`);
        await rnd(options).click();
        await p.getByTestId("confirm").click();
        acted = true;
        await settle(p);
        continue;
      }
    }

    if (await visible(host, "game-over")) break;

    // Mid-game: simulate a phone that slept and reloaded.
    if (!reloaded && steps > 20) {
      reloaded = true;
      await pages[2].reload();
      await pages[2].getByTestId("action-panel").waitFor({ timeout: 10_000 });
      console.log(`${names[2]} reloaded mid-game and kept their seat`);
    }
    if (!acted) await sleep(350);
  }

  await sleep(2500);
  await host.screenshot({ path: `${SHOTS}/game-over.png`, fullPage: true });
  const winner = (await host.getByTestId("winner").textContent())!.trim();
  const final = await host.getByTestId("all-roles").locator("li").allTextContents();
  console.log(`✓ ${winner} — ${N} players, ${steps} UI passes`);

  // Every role seen at night must match the final reveal.
  for (const [n, r] of roles) {
    const row = final.find((t) => t.startsWith(n));
    if (!row || !row.includes(r)) fail(`role mismatch for ${n}: night=${r}, final=${row}`);
  }
  // Night knowledge
  for (const [n, r] of roles) {
    const allies = known.get(n) ?? [];
    if (r === "Liberal" && allies.length) fail(`Liberal ${n} saw allies`);
    if (r === "Hitler" && N >= 7 && allies.length) fail(`Hitler ${n} saw Fascists in a ${N}-player game`);
    if (r === "Hitler" && N <= 6 && allies.length !== 1) fail(`Hitler ${n} should know the Fascist in a ${N}-player game`);
    if (r === "Fascist" && !allies.some((a) => a.includes("Hitler"))) fail(`Fascist ${n} doesn't know Hitler`);
  }
  console.log("✓ night knowledge and final roles consistent");

  // Table screen shows the public result without secrets mid-game is covered by unit tests; check it renders.
  const table = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await table.goto(`${BASE}/table/${code}`);
  await table.getByTestId("game-over").waitFor();
  await table.screenshot({ path: `${SHOTS}/table-over.png` });

  // Play again with the same group
  await host.getByTestId("play-again").click();
  await pages[N - 1].getByTestId("reveal-role").waitFor({ timeout: 10_000 });
  console.log("✓ play again started a new game for everyone");

  await browser.close();
}

main().catch((e) => fail(e.stack ?? String(e)));
