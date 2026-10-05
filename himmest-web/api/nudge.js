import { sql, wrap, requireUser, httpError, etDay, etHour, VOTE_OPEN_HOUR } from "./_lib.js";
import { nudgeNonVoters } from "./_push.js";

/* "Nudge the slackers": anyone can fire it while voting is open, once per day for the whole group. */
export default wrap(async (req, res) => {
  if (req.method !== "POST") throw httpError(405, "Use POST.");
  const me = await requireUser(req);
  if (etHour() < VOTE_OPEN_HOUR) throw httpError(400, "Voting isn't open yet. Nudge them after 5 PM.");
  const today = etDay();
  const ins = await sql`INSERT INTO sent (k) VALUES (${"nudge:" + today}) ON CONFLICT DO NOTHING RETURNING k`;
  if (!ins.length) throw httpError(429, "Someone already nudged the slackers today. One shame per day.");
  const [{ n }] = await sql`SELECT count(*)::int AS n FROM docs WHERE col = 'profiles'`;
  const r = await nudgeNonVoters(today, n);
  console.log("nudge by", me.id, r);
  res.status(200).json(r);
});
