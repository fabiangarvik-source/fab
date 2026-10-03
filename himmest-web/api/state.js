import { sql, wrap, requireUser, COLS } from "./_lib.js";

export default wrap(async (req, res) => {
  const me = await requireUser(req);
  res.setHeader("Cache-Control", "no-store");
  const [{ v }] = await sql`SELECT coalesce(floor(extract(epoch FROM max(updated_at)) * 1000), 0)::text AS v FROM docs`;
  if (req.query.v && req.query.v === v) return res.status(200).json({ v, same: true, me });
  const rows = await sql`SELECT uid, col, data FROM docs`;
  const cols = Object.fromEntries(COLS.map((c) => [c, {}]));
  for (const r of rows) if (cols[r.col]) cols[r.col][r.uid] = r.data;
  res.status(200).json({ v, me, cols });
});
