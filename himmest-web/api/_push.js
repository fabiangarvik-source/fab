import webpush from "web-push";
import { sql } from "./_lib.js";

const PUB = process.env.VAPID_PUBLIC_KEY, PRIV = process.env.VAPID_PRIVATE_KEY;
export const pushReady = !!(PUB && PRIV);
if (pushReady) webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:himmest@example.com", PUB, PRIV);

/* Send one notification to these people (or everyone when uids is null). */
export async function pushTo(uids, payload) {
  if (!pushReady) return 0;
  const subs = uids ? await sql`SELECT endpoint, sub FROM push_subs WHERE uid = ANY(${uids})`
                    : await sql`SELECT endpoint, sub FROM push_subs`;
  const body = JSON.stringify(payload);
  let sentCount = 0;
  await Promise.all(subs.map(async (s) => {
    try { await webpush.sendNotification(s.sub, body, { TTL: 60 * 60 * 12 }); sentCount++; }
    catch (e) { if (e.statusCode === 404 || e.statusCode === 410) await sql`DELETE FROM push_subs WHERE endpoint = ${s.endpoint}`; }
  }));
  return sentCount;
}

async function firstName(uid) {
  const r = await sql`SELECT data->>'first' AS f FROM docs WHERE uid = ${uid} AND col = 'profiles'`;
  return r[0]?.f || "Someone";
}

/* New items aimed at someone else get them a notification. */
export async function notifyChanges(uid, col, before, after) {
  const field = { photos: "items", noms: "items", quotes: "items", comments: "items" }[col];
  if (!field || !pushReady) return;
  const old = new Set((before?.[field] || []).map((x) => x && x.k));
  const fresh = (after?.[field] || []).filter((x) => x && x.k && !old.has(x.k)).slice(-3);
  if (!fresh.length) return;
  const who = await firstName(uid);
  for (const item of fresh) {
    if (col === "comments") continue;
    const tagged = [...new Set(Array.isArray(item.with) && item.with.length ? item.with : [item.about])].filter(u => u && u !== uid).slice(0, 5);
    if (!tagged.length) continue;
    const msg = {
      photos: { title: `👀 ${who} just posted a moment of you`, body: item.caption || "Go see how bad it is." },
      noms: { title: `⚖️ ${who} nominated you for Himmest`, body: `Charge: ${item.reason || "being you"}` },
      quotes: { title: `🗣️ ${who} put you on the record`, body: `"${String(item.text || "").slice(0, 120)}"` },
    }[col];
    await pushTo(tagged, { ...msg, url: "/" });
  }
}

/* People with a profile who haven't cast a counted vote today (votes only count from 5 PM Eastern). */
export async function nonVoters(today) {
  const { etDay, etHour, VOTE_OPEN_HOUR } = await import("./_lib.js");
  const rows = await sql`SELECT p.uid, p.data->>'first' AS first, v.data AS votes
    FROM docs p LEFT JOIN docs v ON v.uid = p.uid AND v.col = 'votes' WHERE p.col = 'profiles'`;
  return rows.filter(r => {
    const at = r.votes?.at?.[today];
    const ok = r.votes?.days?.[today] && at && etDay(new Date(at)) === today && etHour(new Date(at)) >= VOTE_OPEN_HOUR;
    return !ok;
  }).map(r => ({ uid:r.uid, first:r.first || "Hey" }));
}
const NUDGES = [
  ["{name}, why haven't you voted, bitchass? 🗳️", "{done} of the boys already voted. You're holding up democracy."],
  ["{name}, why haven't you voted, bitchass? 🗳️", "Polls close at midnight. Stop being useless."],
  ["{name}, why haven't you voted, bitchass? 🗳️", "Even the Himmest voted. Think about that."],
];
/* One personal nudge to everyone who hasn't voted. Returns how many people it went to. */
export async function nudgeNonVoters(today, totalMembers) {
  const slackers = await nonVoters(today);
  const done = Math.max(0, totalMembers - slackers.length);
  let n = 0;
  for (const s of slackers) {
    const [t, b] = NUDGES[Math.floor(Math.random() * NUDGES.length)];
    const sent = await pushTo([s.uid], { title: t.replace("{name}", s.first), body: b.replace("{done}", done), url: "/" });
    if (sent) n++;
  }
  return { slackers: slackers.length, reached: n };
}
