// End-to-end check for solo mode: one phone-sized tab plays a whole game
// against the bots through the UI, then the same tab goes offline, reloads
// and keeps playing. Usage: BASE=http://127.0.0.1:3000 PLAYERS=7 npm run e2e:solo
//
// Use 127.0.0.1 rather than localhost: the service worker is not registered on localhost.

import { mkdirSync } from "node:fs";
import { chromium, type Page } from "playwright-core";

const BASE = process.env.BASE ?? "http://127.0.0.1:3000";
const N = Number(process.env.PLAYERS ?? 7);
const SHOTS = process.env.SHOTS ?? "e2e-screens/solo";
const EXE = process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rnd = <T>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
function fail(msg: string): never {
  console.error(`✗ ${msg}`);
  process.exit(1);
}
const visible = (p: Page, id: string) => p.getByTestId(id).first().isVisible().catch(() => false);

async function hold(p: Page, id: string) {
  const box = await p.getByTestId(id).boundingBox();
  if (!box) return;
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await p.mouse.down();
  await sleep(250);
  await p.mouse.up();
}

/** Take one human step if there is one. Returns "over" when the game has ended. */
async function step(p: Page, shots: Set<string>): Promise<"over" | "acted" | "idle"> {
  if (await visible(p, "game-over")) return "over";
  if (await visible(p, "vote-reveal")) {
    await p.getByTestId("vote-reveal").click();
    return "acted";
  }
  if (await visible(p, "claim-prompt")) {
    if (!shots.has("claim")) {
      shots.add("claim");
      await p.screenshot({ path: `${SHOTS}/claim.png` });
    }
    const opts = await p.locator('[data-testid^="claim-"]:not([data-testid="claim-prompt"])').all();
    await rnd(opts).click();
    return "acted";
  }
  const panel = p.getByTestId("action-panel");
  if ((await panel.getAttribute("data-my-turn").catch(() => "0")) !== "1") return "idle";
  const phase = (await panel.getAttribute("data-phase")) ?? "?";
  if (!shots.has(phase)) {
    shots.add(phase);
    await p.screenshot({ path: `${SHOTS}/${phase}.png` });
  }
  if (await visible(p, "ack-role")) {
    await hold(p, "reveal-role");
    await p.getByTestId("ack-role").click();
  } else if (await visible(p, "cast-vote")) {
    await p.getByTestId(Math.random() < 0.6 ? "vote-ja" : "vote-nein").click();
    await p.getByTestId("cast-vote").click();
  } else if (await visible(p, "reveal-hand")) {
    await hold(p, "reveal-hand");
    const n = phase === "pres_legislate" ? 3 : 2;
    await p.getByTestId(`card-${1 + Math.floor(Math.random() * n)}`).click();
    await p.getByTestId("confirm").click();
  } else if (await visible(p, "veto-agree")) {
    await p.getByTestId(rnd(["veto-agree", "veto-refuse"])).click();
  } else if (await visible(p, "ack")) {
    for (const id of ["reveal-investigation", "reveal-peek"]) if (await visible(p, id)) await hold(p, id);
    await p.getByTestId("ack").click();
  } else if (await visible(p, "confirm")) {
    const options = await p.locator('[data-testid^="pick-"]:not([disabled])').all();
    if (!options.length) fail(`nothing to pick in ${phase}`);
    await rnd(options).click();
    await p.getByTestId("confirm").click();
  } else return "idle";
  await sleep(150);
  return "acted";
}

async function playUntil(p: Page, shots: Set<string>, stop: () => Promise<boolean>) {
  const t0 = Date.now();
  while (!(await stop())) {
    if (Date.now() - t0 > 8 * 60_000) fail("game took too long");
    const r = await step(p, shots);
    if (r === "over") return;
    if (r === "idle") await sleep(250);
  }
}

async function main() {
  mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch({ executablePath: EXE });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => fail(`page error: ${e.message}`));
  const apiCalls: string[] = [];
  p.on("request", (r) => {
    if (new URL(r.url()).pathname.startsWith("/api/")) apiCalls.push(r.url());
  });

  await p.goto(BASE);
  await p.getByTestId("play-solo").click();
  await p.getByTestId("solo-name").fill("Tester");
  await p.getByTestId(`solo-n-${N}`).click();
  await p.screenshot({ path: `${SHOTS}/setup.png`, fullPage: true });
  await p.getByTestId("solo-start").click();
  await p.getByTestId("action-panel").waitFor();

  const shots = new Set<string>();
  // Play a few rounds online, then cut the network and reload mid-game.
  await playUntil(p, shots, async () => {
    const t = (await p.getByTestId("ticker").textContent().catch(() => "")) ?? "";
    return /enacted/.test(t) || (await visible(p, "game-over"));
  });
  const swReady = await p.evaluate(async () => !!(await navigator.serviceWorker?.getRegistration()));
  console.log(`service worker registered: ${swReady}`);
  await sleep(1500); // let precache finish
  await ctx.setOffline(true);
  await p.reload();
  await p.getByTestId("action-panel").waitFor({ timeout: 10_000 }).catch(() => fail("solo game did not load offline"));
  console.log("reloaded offline, game resumed");

  await playUntil(p, shots, () => visible(p, "game-over"));
  const winner = await p.getByTestId("winner").textContent();
  await sleep(2500);
  await p.screenshot({ path: `${SHOTS}/game-over.png`, fullPage: true });
  console.log(`${N} players: ${winner}`);

  // Claims made it into the log.
  await p.getByRole("button", { name: "View the final board" }).click();
  await p.getByTestId("open-log").click();
  const log = await p.locator("ol").last().innerText();
  const claims = (log.match(/ says/g) ?? []).length;
  console.log(`claims in log: ${claims}`);
  if (!claims) fail("no claims in the log");
  await p.screenshot({ path: `${SHOTS}/log.png` });
  await p.keyboard.press("Escape");

  // Play again works offline too.
  await p.getByRole("button", { name: "Show results" }).click().catch(() => {});
  await p.getByTestId("play-again").click();
  await p.getByTestId("ack-role").waitFor();
  if (apiCalls.length) fail(`solo mode called the API: ${apiCalls[0]}`);
  console.log("✓ solo game played through the UI, offline reload and replay work, no API calls");
  await browser.close();
}

main().catch((e) => fail(String(e)));
