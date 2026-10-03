import { sql, wrap, requireUser, COLS } from "./_lib.js";

export default wrap(async (req, res) => {
  const me = await requireUser(req);
  res.setHeader("Cache-Control", "no-store");
  const [{ v }] = await sql`SELECT (coalesce(floor(extract(epoch FROM (SELECT max(updated_at) FROM docs)) * 1000), 0)
    + coalesce(floor(extract(epoch FROM (SELECT max(created_at) FROM roasts)) * 1000), 0))::text AS v`;
  if (req.query.v && req.query.v === v) return res.status(200).json({ v, same: true, me });
  const rows = await sql`SELECT uid, col, data FROM docs`;
  const cols = Object.fromEntries(COLS.map((c) => [c, {}]));
  for (const r of rows) if (cols[r.col]) cols[r.col][r.uid] = r.data;
  const rr = await sql`SELECT k, text FROM roasts ORDER BY created_at DESC LIMIT 4000`;
  const roasts = Object.fromEntries(rr.map((r) => [r.k, r.text]));
  res.status(200).json({ v, me, cols, roasts });
});
