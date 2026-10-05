/* ============ MEMES ============ */
/* Burn classic meme text (white, black outline) into a photo before it's uploaded. */
async function memeify(src, top, bottom){
  top = (top||"").trim().toUpperCase(); bottom = (bottom||"").trim().toUpperCase();
  if (!top && !bottom) return src;
  try { await document.fonts.load("80px Anton"); } catch {}
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  const W = img.naturalWidth, H = img.naturalHeight, c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d"); g.drawImage(img, 0, 0);
  const pad = W * 0.04, maxW = W * 0.92;
  const draw = (text, fromTop) => {
    if (!text) return;
    let size = Math.round(W * 0.12), lines;
    for (;;) {
      g.font = `${size}px Anton, Impact, "Arial Black", sans-serif`;
      lines = []; let line = "";
      for (const w of text.split(/\s+/)) { const t = line ? line + " " + w : w; if (g.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
      if (line) lines.push(line);
      if ((lines.length <= 3 && lines.every(l => g.measureText(l).width <= maxW)) || size < 18) break;
      size = Math.round(size * 0.9);
    }
    g.textAlign = "center"; g.lineJoin = "round"; g.lineWidth = Math.max(3, size * 0.14); g.strokeStyle = "#000"; g.fillStyle = "#fff";
    const lh = size * 1.08;
    lines.forEach((l, i) => {
      const y = fromTop ? pad + size + i * lh : H - pad - (lines.length - 1 - i) * lh;
      g.strokeText(l, W/2, y); g.fillText(l, W/2, y);
    });
  };
  draw(top, true); draw(bottom, false);
  for (const q of [0.85, 0.75, 0.62, 0.5]) { const d = c.toDataURL("image/jpeg", q); if (d.length <= 380000) return d; }
  return c.toDataURL("image/jpeg", 0.4);
}
function memePreview(dm){
  const t = h("div",{class:"memetxt top"}, (dm.top||"").toUpperCase()), b = h("div",{class:"memetxt bottom"}, (dm.bottom||"").toUpperCase());
  const wrap = h("div",{class:"memewrap"}, h("img",{class:"preview",src:dm.img,alt:"Your photo"}), t, b);
  const field = (id, key, label, ph, el) => h("div",{class:"field"}, h("label",{class:"label",for:id},label),
    h("input",{id,maxlength:"80",value:dm[key]||"",placeholder:ph,oninput:e=>{ dm[key] = e.target.value; el.textContent = e.target.value.toUpperCase(); }}));
  return [wrap, h("div",{class:"two"}, field("m-top","top","Meme text top (optional)","When the door says pull", t), field("m-bot","bottom","Meme text bottom (optional)","But you're built different", b))];
}

/* ============ REELS ============ */
const REEL_COLORS = ["#2f45ff","#ff3d8b","#11894a","#8a3ffc","#e85d04","#0f766e"];
function reelItems(){
  const out = [], td = D.td, endOf = d => (dayIndex(d) + 1) * 864e5;
  for (const p of D.photos) out.push({ type:"moment", ts:p.ts||endOf(p.day), key:p.key, p });
  for (const q of D.quotes) out.push({ type:"quote", ts:q.ts||endOf(q.day), key:q.key, q });
  for (const n of D.noms) out.push({ type:"charge", ts:n.ts||endOf(n.day), key:n.key, n });
  for (const [d, w] of Object.entries(D.dw)) if (d < td) for (const u of w) out.push({ type:"crown", ts:endOf(d), key:`c:${d}:${u}`, uid:u, day:d });
  for (const x of pastWinners("week")) out.push({ type:"week", ts:endOf(x.per.end)+1, key:`w:${x.per.key}`, uid:x.winners[0], per:x.per });
  if (S.reelShuffle) out.sort((a,b)=>coin(S.reelShuffle+a.key) - coin(S.reelShuffle+b.key));
  else out.sort((a,b)=>b.ts-a.ts);
  return out.slice(0, 300);
}
function reelCard(it){
  const who = (x, sub) => h("div",{class:"rwho"}, typeof x === "string" ? avatar(x,"sm") : avatarStack(x,"sm"), h("b",null, typeof x === "string" ? nm(x) : tagFull(x)), sub ? h("span",null, sub) : null);
  if (it.type === "moment") {
    const p = it.p;
    return h("section",{class:"reel"},
      h("img",{class:"bg",src:p.img,alt:p.caption||`Photo of ${tagFull(p)}`,loading:"lazy"}), h("div",{class:"shade"}),
      h("div",{class:"info"}, h("span",{class:"rtag"},"📸 MOMENT"), who(p, fmtDay(p.day)),
        p.caption ? h("p",{class:"rcap"}, p.caption) : null,
        roast(`moment:${p.key}`, "moment", { name:tagFirst(p) }), reactBar(p),
        h("span",{class:"rsmall"}, `snapped by ${firstNm(p.author)}${(D.comments[`pc:${p.key}`]||[]).length ? ` · 💬 ${(D.comments[`pc:${p.key}`]).length}` : ""}`)));
  }
  const bg = `background:${REEL_COLORS[coin(it.key) % REEL_COLORS.length]}`;
  if (it.type === "quote") {
    const q = it.q;
    return h("section",{class:"reel",style:bg},
      h("div",{class:"bigq"}, `"${q.text}"`),
      h("div",{class:"info"}, h("span",{class:"rtag"},"🗣️ QUOTE"), who(q, fmtDay(q.day)), roast(`quote:${q.key}`, "quote", { name:tagFirst(q) }),
        h("span",{class:"rsmall"}, `${D.qv[q.key]||0} vote${(D.qv[q.key]||0)===1?"":"s"} · logged by ${firstNm(q.author)}`)));
  }
  if (it.type === "charge") {
    const n = it.n;
    return h("section",{class:"reel",style:"background:#16142e"},
      h("div",{class:"bigq"}, h("div",{class:"crownbig"}, avatar(n.about,"xl")), h("div",null, `"${n.reason}"`)),
      h("div",{class:"info"}, h("span",{class:"rtag"},"⚖️ CHARGED"), who(n.about, fmtDay(n.day)), roast(`nom:${n.key}`, "nom", { name:firstNm(n.about) }),
        h("span",{class:"rsmall"}, `filed by ${firstNm(n.author)}`)));
  }
  const week = it.type === "week";
  return h("section",{class:"reel",style:"background:linear-gradient(160deg,#ffe14d,#ff3d8b)"},
    h("div",{class:"bigq",style:"color:#16142e"}, h("div",{class:"crownbig"}, avatar(it.uid,"xl")),
      h("div",{style:"font-family:var(--display);font-weight:400"}, week ? "HIMMEST OF THE WEEK" : "HIMMEST OF THE DAY"), h("div",null, nm(it.uid))),
    h("div",{class:"info"}, h("span",{class:"rtag"}, week ? `👑 ${periodName(it.per)}` : `👑 ${fmtDay(it.day)}`),
      roast(`crown:${it.key}`, week ? "week" : "crown", { name:firstNm(it.uid) })));
}
function viewReels(){
  const list = reelItems();
  return h("div",{class:"reels",id:"reels"},
    h("div",{class:"reels-ctrl"},
      h("span",{class:"rtag"}, `🎞️ ${list.length} memories`),
      h("button",{class:"rtag rbtn",onclick:()=>{ S.reelShuffle = S.reelShuffle ? "" : rid(); S.reelTop = 0; render(); }}, S.reelShuffle ? "🕒 Newest first" : "🔀 Shuffle")),
    list.length ? list.map(reelCard) :
      h("section",{class:"reel",style:"background:#16142e"}, h("div",{class:"bigq"}, "No memories yet. Post a moment, log a quote or file a charge and it shows up here.")));
}
