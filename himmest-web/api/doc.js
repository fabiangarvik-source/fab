import { sql, wrap, requireUser, httpError, COLS, imgKeys } from "./_lib.js";

/* Each person can only write their own document in each collection. */
export default wrap(async (req, res) => {
  if (req.method !== "POST") throw httpError(405, "Use POST.");
  const me = await requireUser(req);
  const { col, data } = req.body || {};
  if (!COLS.includes(col)) throw httpError(400, "Unknown collection.");
  if (!data || typeof data !== "object" || Array.isArray(data)) throw httpError(400, "Data must be an object.");
  const json = JSON.stringify(data);
  if (json.length > 200000) throw httpError(413, "That's too much data in one go.");
  await sql`INSERT INTO docs (uid, col, data, updated_at) VALUES (${me.id}, ${col}, ${json}::jsonb, now())
            ON CONFLICT (uid, col) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`;
  // Drop pictures that this person's documents no longer point to.
  if (col === "photos" || col === "profiles") {
    const kind = col === "photos" ? "photo" : "avatar";
    const keep = imgKeys(data);
    await sql`DELETE FROM imgs WHERE uid = ${me.id} AND kind = ${kind} AND created_at < now() - interval '10 minutes' AND NOT (k = ANY(${keep}))`;
  }
  res.status(200).json({ ok: true });
});
