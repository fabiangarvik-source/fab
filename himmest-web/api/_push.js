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
    if (!item.about || item.about === uid) continue;
    const msg = {
      photos: { title: `👀 ${who} just posted a moment of you`, body: item.caption || "Go see how bad it is." },
      noms: { title: `⚖️ ${who} nominated you for Himmest`, body: `Charge: ${item.reason || "being you"}` },
      quotes: { title: `🗣️ ${who} put you on the record`, body: `"${String(item.text || "").slice(0, 120)}"` },
    }[col];
    await pushTo([item.about], { ...msg, url: "/" });
  }
}
