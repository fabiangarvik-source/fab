import { sql, wrap, httpError, setSession, hashPassword, checkPassword, newId } from "./_lib.js";

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

export default wrap(async (req, res) => {
  if (req.method !== "POST") throw httpError(405, "Use POST.");
  const { action, email, password } = req.body || {};
  const em = String(email || "").trim().toLowerCase();
  const pw = String(password || "");
  if (!EMAIL.test(em)) throw httpError(400, "Enter a real email address, like you@example.com.");
  if (pw.length < 6) throw httpError(400, "Your password needs at least 6 characters.");
  if (pw.length > 200) throw httpError(400, "That password is too long.");

  if (action === "signup") {
    const id = newId("u_");
    const rows = await sql`INSERT INTO users (id, email, pass) VALUES (${id}, ${em}, ${hashPassword(pw)}) ON CONFLICT (email) DO NOTHING RETURNING id`;
    if (!rows.length) throw httpError(409, "That email already has an account. Log in instead.");
    setSession(res, id);
    return res.status(200).json({ ok: true });
  }
  if (action === "login") {
    const rows = await sql`SELECT id, pass FROM users WHERE email = ${em}`;
    if (!rows.length || !checkPassword(pw, rows[0].pass)) throw httpError(401, "Wrong email or password.");
    setSession(res, rows[0].id);
    return res.status(200).json({ ok: true });
  }
  throw httpError(400, "Unknown action.");
});
