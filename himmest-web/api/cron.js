import { sql, wrap, httpError, etDay, etHour, VOTE_OPEN_HOUR } from "./_lib.js";
import { pushTo } from "./_push.js";

/* Daily reminders. Vercel calls these on the schedule in vercel.json. */
const CLOSE = [
  ["⏰ Polls close at midnight", "Somebody did something dumb today. Nominate them before it's too late."],
  ["⏰ Last call, hims", "The crown doesn't hand itself out. Go vote."],
  ["⏰ Voting closes tonight", "If you don't vote, you basically voted for yourself."],
];
const OPEN = [
  ["🗳️ Voting is open", "Who was the Himmest today? You've got until midnight."],
  ["🗳️ Polls are open", "Somebody did something dumb today. Make it official."],
  ["🗳️ It's 5 PM. You know what to do.", "Vote for today's Himmest before midnight."],
];
const RESULTS = [
  ["👑 The results are in", "Someone just got crowned the Himmest. Open up and see who."],
  ["👑 We have a Himmest", "The people have spoken. They were not kind."],
];

export default wrap(async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) throw httpError(401, "Nope.");
  const kind = ["results", "open"].includes(req.query.kind) ? req.query.kind : "close";
  /* Two "open" schedules cover summer and winter time; only the one that lands after 5 PM Eastern sends. */
  if (kind === "open" && etHour() < VOTE_OPEN_HOUR) return res.status(200).json({ skipped: "too early" });
  const day = etDay(new Date(Date.now() - (kind === "results" ? 3 * 3600e3 : 0)));
  const key = `${kind}:${day}`;
  const ins = await sql`INSERT INTO sent (k) VALUES (${key}) ON CONFLICT DO NOTHING RETURNING k`;
  if (!ins.length) return res.status(200).json({ skipped: true });
  const pool = kind === "close" ? CLOSE : kind === "open" ? OPEN : RESULTS;
  let [title, body] = pool[Math.floor(Math.random() * pool.length)];
  const weekday = new Date(`${etDay()}T12:00:00Z`).getUTCDay();
  if (kind === "results" && weekday === 1) { title = "👑 A new King of the Week has been crowned"; body = "Long live the King. Go see who it is and what punishment he picked."; }
  const n = await pushTo(null, { title, body, url: "/" });
  res.status(200).json({ sent: n });
});
