import Anthropic from "@anthropic-ai/sdk";
import { sql, wrap, requireUser, httpError } from "./_lib.js";
import { templateRoast } from "./_roasts.js";

const KINDS = ["nom", "moment", "quote", "appeal", "crown", "week"];
const SYSTEM = `You are the resident roast commentator inside "The Himmest", an app where a group of college guy friends vote on who did the dumbest-but-lovable ("himbo") thing each day.
Write ONE roast line in English, at most 25 words. Be cheeky, savage and funny, like a friend talking trash in the group chat, with real affection underneath.
Roast what they did or said. Never mock appearance, body, race, ethnicity, religion, sexuality, gender, disability, mental health, money, family or anything sensitive. No slurs, no sexual content.
If a photo is included, roast what is happening in it, not how anyone looks.
Output only the roast line, no quotes around it, at most one emoji.`;

const client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;

async function aiRoast(kind, ctx, img) {
  const text = `Kind: ${kind}\nPerson: ${ctx.name || "unknown"}\nDetails: ${String(ctx.text || "").slice(0, 400)}`;
  const content = img ? [{ type: "image", source: { type: "base64", media_type: "image/jpeg", data: img } }, { type: "text", text }] : text;
  const response = await client.beta.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 2000,
    output_config: { effort: "low" },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM,
    messages: [{ role: "user", content }],
  });
  if (response.stop_reason === "refusal") return null;
  const out = response.content.filter((b) => b.type === "text").map((b) => b.text).join(" ").trim();
  return out ? out.replace(/^["“]|["”]$/g, "").slice(0, 220) : null;
}

export default wrap(async (req, res) => {
  if (req.method !== "POST") throw httpError(405, "Use POST.");
  const me = await requireUser(req);
  const { k, kind, ctx = {}, img } = req.body || {};
  if (typeof k !== "string" || !/^[A-Za-z0-9:_.\-]{3,160}$/.test(k)) throw httpError(400, "Bad roast key.");
  if (!KINDS.includes(kind)) throw httpError(400, "Unknown roast type.");
  const have = await sql`SELECT text FROM roasts WHERE k = ${k}`;
  if (have.length) return res.status(200).json({ text: have[0].text });

  let text = null, ai = false;
  if (client) {
    const [{ n }] = await sql`SELECT count(*)::int AS n FROM roasts WHERE uid = ${me.id} AND ai AND created_at > now() - interval '1 day'`;
    if (n < 60) {
      let imgData = null;
      if (kind === "moment" && typeof img === "string" && /^[A-Za-z0-9_-]{4,64}$/.test(img)) {
        const r = await sql`SELECT data FROM imgs WHERE k = ${img}`;
        imgData = r[0]?.data?.split(",")[1] || null;
      }
      try { text = await aiRoast(kind, ctx, imgData); ai = !!text; }
      catch (e) {
        if (e instanceof Anthropic.RateLimitError) console.warn("roast rate limited");
        else if (e instanceof Anthropic.APIError) console.error(`roast API error ${e.status}:`, e.message);
        else console.error("roast failed", e);
      }
    }
  }
  if (!text) text = templateRoast(kind, ctx, k);
  const ins = await sql`INSERT INTO roasts (k, text, ai, uid) VALUES (${k}, ${text}, ${ai}, ${me.id}) ON CONFLICT (k) DO NOTHING RETURNING text`;
  if (!ins.length) { const r = await sql`SELECT text FROM roasts WHERE k = ${k}`; text = r[0]?.text || text; }
  res.status(200).json({ text });
});
