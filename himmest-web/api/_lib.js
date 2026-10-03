import { neon } from "@neondatabase/serverless";
import crypto from "node:crypto";

const DB_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
export const sql = DB_URL ? neon(DB_URL) : null;
const SECRET = process.env.SESSION_SECRET || "";
const COOKIE = "hm_s";
const MAX_AGE = 60 * 60 * 24 * 180;

export const COLS = ["profiles", "votes", "quotes", "qvotes", "vetoes", "bets", "photos", "reacts", "noms", "appeals", "verdicts", "comments", "reign"];

let ready = null;
export function init() {
  if (!sql) throw httpError(503, "The database isn't connected yet.");
  if (!SECRET) throw httpError(503, "SESSION_SECRET is missing.");
  ready ||= (async () => {
    await sql`CREATE TABLE IF NOT EXISTS users (id text PRIMARY KEY, email text UNIQUE NOT NULL, pass text NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`;
    await sql`CREATE TABLE IF NOT EXISTS docs (uid text NOT NULL, col text NOT NULL, data jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (uid, col))`;
    await sql`CREATE TABLE IF NOT EXISTS imgs (k text PRIMARY KEY, uid text NOT NULL, kind text NOT NULL, data text NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`;
    await sql`CREATE TABLE IF NOT EXISTS push_subs (endpoint text PRIMARY KEY, uid text NOT NULL, sub jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`;
    await sql`CREATE TABLE IF NOT EXISTS sent (k text PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now())`;
  })().catch((e) => { ready = null; throw e; });
  return ready;
}

export function httpError(status, message) { return Object.assign(new Error(message), { status }); }

export function wrap(fn) {
  return async (req, res) => {
    try { await init(); await fn(req, res); }
    catch (e) {
      const status = e.status || 500;
      if (status === 500) console.error(e);
      res.status(status).json({ error: status === 500 ? "Something broke on our side. Try again." : e.message });
    }
  };
}

const b64u = (b) => Buffer.from(b).toString("base64url");
const sign = (s) => crypto.createHmac("sha256", SECRET).update(s).digest("base64url");

export function setSession(res, uid) {
  const body = b64u(JSON.stringify({ u: uid, x: Date.now() + MAX_AGE * 1000 }));
  res.setHeader("Set-Cookie", `${COOKIE}=${body}.${sign(body)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE}`);
}
export function clearSession(res) {
  res.setHeader("Set-Cookie", `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
}
export function sessionUid(req) {
  const raw = (req.headers.cookie || "").split(/;\s*/).find((c) => c.startsWith(COOKIE + "="));
  if (!raw) return null;
  const [body, mac] = raw.slice(COOKIE.length + 1).split(".");
  if (!body || !mac) return null;
  const good = sign(body);
  if (good.length !== mac.length || !crypto.timingSafeEqual(Buffer.from(good), Buffer.from(mac))) return null;
  try { const { u, x } = JSON.parse(Buffer.from(body, "base64url").toString()); return x > Date.now() ? u : null; }
  catch { return null; }
}
export async function requireUser(req) {
  const uid = sessionUid(req);
  if (!uid) throw httpError(401, "Log in first.");
  const rows = await sql`SELECT id, email FROM users WHERE id = ${uid}`;
  if (!rows.length) throw httpError(401, "Log in first.");
  return rows[0];
}

export function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(pw, salt, 64);
  return `s1$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}
export function checkPassword(pw, stored) {
  const [, salt, hash] = String(stored).split("$");
  if (!salt || !hash) return false;
  const want = Buffer.from(hash, "base64url");
  const got = crypto.scryptSync(pw, Buffer.from(salt, "base64url"), want.length);
  return crypto.timingSafeEqual(want, got);
}
export const newId = (p) => p + crypto.randomBytes(12).toString("base64url");

/* Image keys referenced from a document, as "/api/img?k=KEY". */
export function imgKeys(value) {
  const out = new Set();
  JSON.stringify(value ?? null).replace(/\/api\/img\?k=([A-Za-z0-9_-]+)/g, (_, k) => out.add(k));
  return [...out];
}

/* Today's date in the arena's time zone (Eastern), as YYYY-MM-DD. */
export function etDay(d = new Date()) {
  const p = {};
  for (const x of new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(d)) p[x.type] = x.value;
  return `${p.year}-${p.month}-${p.day}`;
}
