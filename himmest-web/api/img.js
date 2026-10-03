import { sql, wrap, requireUser, httpError, newId } from "./_lib.js";

const DATA_URL = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/;

export default wrap(async (req, res) => {
  const me = await requireUser(req);
  if (req.method === "GET") {
    const k = String(req.query.k || "");
    if (!/^[A-Za-z0-9_-]{4,64}$/.test(k)) throw httpError(400, "Bad picture key.");
    const rows = await sql`SELECT data FROM imgs WHERE k = ${k}`;
    if (!rows.length) throw httpError(404, "Picture not found.");
    const m = DATA_URL.exec(rows[0].data);
    if (!m) throw httpError(500, "Broken picture.");
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", "private, max-age=31536000, immutable");
    return res.status(200).send(Buffer.from(m[1], "base64"));
  }
  if (req.method === "POST") {
    const { kind, data } = req.body || {};
    if (kind !== "photo" && kind !== "avatar") throw httpError(400, "Unknown picture type.");
    if (typeof data !== "string" || !DATA_URL.test(data)) throw httpError(400, "Send a JPEG picture.");
    if (data.length > 400000) throw httpError(413, "That picture is too big.");
    const [{ n }] = await sql`SELECT count(*)::int AS n FROM imgs WHERE uid = ${me.id}`;
    if (n >= 60) throw httpError(429, "You have too many pictures. Delete some old moments first.");
    const k = (kind === "photo" ? "p_" : "a_") + newId("").slice(0, 16);
    await sql`INSERT INTO imgs (k, uid, kind, data) VALUES (${k}, ${me.id}, ${kind}, ${data})`;
    return res.status(200).json({ url: `/api/img?k=${k}` });
  }
  throw httpError(405, "Use GET or POST.");
});
