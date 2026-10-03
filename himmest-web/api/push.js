import { sql, wrap, requireUser, httpError } from "./_lib.js";

export default wrap(async (req, res) => {
  if (req.method === "GET") return res.status(200).json({ key: process.env.VAPID_PUBLIC_KEY || null });
  const me = await requireUser(req);
  const { sub } = req.body || {};
  if (!sub || typeof sub.endpoint !== "string" || !/^https:\/\//.test(sub.endpoint)) throw httpError(400, "Bad subscription.");
  if (req.method === "POST") {
    await sql`INSERT INTO push_subs (endpoint, uid, sub) VALUES (${sub.endpoint}, ${me.id}, ${JSON.stringify(sub)}::jsonb)
              ON CONFLICT (endpoint) DO UPDATE SET uid = EXCLUDED.uid, sub = EXCLUDED.sub`;
    return res.status(200).json({ ok: true });
  }
  if (req.method === "DELETE") {
    await sql`DELETE FROM push_subs WHERE endpoint = ${sub.endpoint} AND uid = ${me.id}`;
    return res.status(200).json({ ok: true });
  }
  throw httpError(405, "Use GET, POST or DELETE.");
});
