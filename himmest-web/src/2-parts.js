/* ============ roasts ============ */
const roastAsked = new Set(), roastQueue = [];
let roastBusy = 0;
function pumpRoasts(){
  while (roastBusy < 2 && roastQueue.length) {
    const job = roastQueue.shift(); roastBusy++;
    api("/api/roast",{ method:"POST", body:JSON.stringify(job) })
      .then(r => { if (r?.text) { S.roasts[job.k] = r.text; scheduleRender(); } })
      .catch(() => {})
      .finally(() => { roastBusy--; pumpRoasts(); });
  }
}
/* A roast line for one thing. New things get a roast written once; old things only show what exists. */
function roast(k, kind, ctx, opts = {}){
  k = String(k).replace(/[^A-Za-z0-9:_.\-]/g, "").slice(0,160);
  const text = S.roasts[k];
  const fresh = opts.day ? opts.day >= addDays(D.td, -2) : true;
  if (!text && fresh && !roastAsked.has(k)) { roastAsked.add(k); roastQueue.push({ k, kind, ctx, img:opts.img }); pumpRoasts(); }
  if (!text && !fresh) return null;
  return h("div",{class:"roast"+(text?"":" wait")}, h("b",null,"🎙️ CLAUDE"), h("span",null, text || "Cooking up a roast…"));
}

/* ============ comments ============ */
function commentsBox(target, label = "Talk trash"){
  const list = D.comments[target] || [], open = S.openComments.has(target);
  const shown = open ? list : list.slice(-2);
  const id = "c-" + target.replace(/[^A-Za-z0-9_-]/g,"_").slice(0,60);
  const input = h("input",{id,maxlength:"200",placeholder:label+"…",value:S.cdraft[target]||"",oninput:e=>S.cdraft[target]=e.target.value,"aria-label":label});
  return h("div",{class:"comments"},
    list.length > 2 && !open ? h("button",{class:"linkbtn",onclick:()=>{ S.openComments.add(target); render(); }},`View all ${list.length} comments`) : null,
    shown.map(c=>h("div",{class:"cmt"}, h("b",null, firstNm(c.author)), c.text,
      c.author === S.uid ? h("button",{class:"x",onclick:()=>delComment(c),"aria-label":"Delete comment"},"✕") : null)),
    h("form",{class:"cform",onsubmit:async e=>{
      e.preventDefault(); const text = (S.cdraft[target]||"").trim(); if (!text) return;
      const list2 = items(mine("comments"), 599); list2.push({ k:rid(), on:target, text:text.slice(0,200), ts:Date.now() });
      if (await write("comments",{ items:list2 })) { S.cdraft[target] = ""; S.openComments.add(target); render(); }
    }}, input, h("button",{class:"btn ghost",type:"submit"},"Send")));
}
async function delComment(c){ await write("comments",{ items:items(mine("comments")).filter(x=>x.k!==c.k) }); render(); }

function personPicker(selected, onPick, label, includeSelf){
  const list = members().filter(u=>includeSelf || u!==S.uid).sort((a,b)=>nm(a).localeCompare(nm(b)));
  if (!list.length) return h("p",{class:"muted small"},"Nobody else has joined yet. Send them the link.");
  return h("div",{class:"people",role:"group","aria-label":label}, list.map(u=>h("button",{type:"button",class:"person","aria-pressed":String(selected===u),onclick:()=>onPick(u)}, avatar(u), firstNm(u))));
}
async function veto(key, msg){ const keys = [...(mine("vetoes").keys||[]), key].slice(-1000); if (await write("vetoes",{keys})) toast(msg); }

/* ============ chrome ============ */
const TABS = [["today","Today"],["moments","Moments"],["quotes","Quotes"],["bets","Bets"],["memories","Memories"]];
function go(tab){ S.tab = tab; try { localStorage.setItem("himmest.tab", tab); } catch {} render(); scrollTo({top:0}); }
function renderTabs(){
  const nav = document.getElementById("tabs"); nav.replaceChildren();
  nav.hidden = !(S.uid && isMember(S.uid));
  if (nav.hidden) return;
  for (const [k,l] of TABS) nav.append(h("button",{role:"tab","aria-selected":String(S.tab===k),onclick:()=>go(k)}, icon(k), h("span",null,l)));
}
function renderWho(L){
  const w = document.getElementById("who"); w.replaceChildren();
  if (S.uid && isMember(S.uid)) w.append(h("button",{class:"mebtn",onclick:()=>go("me"),"aria-label":"My profile"}, avatar(S.uid,"sm"),
    h("span",{style:"display:flex;flex-direction:column;align-items:flex-start;min-width:0"}, h("span",{class:"nmx"},firstNm(S.uid)), h("span",{class:"hb"},`${L.avail(S.uid).toLocaleString()} HB`))));
}
function renderTicker(){
  const lines = [];
  for (const n of (D.noms||[]).filter(n=>n.day===D.td).slice(-5)) lines.push(["CHARGED", `${firstNm(n.about)}: ${n.reason}`]);
  for (const q of (D.quotes||[]).filter(q=>q.day===D.td).slice(0,5)) lines.push([firstNm(q.about).toUpperCase()+" SAYS", `"${q.text}"`]);
  const t = D.dv?.[D.td] || {}; const lead = Object.keys(t).sort((a,b)=>t[b]-t[a])[0];
  if (lead) lines.push(["LIVE", `${nm(lead)} leads today's race with ${t[lead]} vote${t[lead]===1?"":"s"}`]);
  for (const f of FILLER) lines.push(["HIMBO NEWS", f]);
  const run = document.getElementById("ticker"); run.replaceChildren();
  for (let i=0;i<2;i++) for (const [a,b] of lines) run.append(h("b",null,a), b);
}
function brainMeter(uid){
  const b = brainCells(uid);
  return h("div",{class:"brain",title:"Brain cells left this week"}, h("div",{class:"meter"}, h("i",{style:`width:${b}%`})), h("div",{class:"t"}, `🧠 ${b}/100 brain cells`));
}

/* ============ crowning ceremony + story card ============ */
function seen(key){ try { return localStorage.getItem("himmest.seen."+key) === "1"; } catch { return true; } }
function markSeen(key){ try { localStorage.setItem("himmest.seen."+key, "1"); } catch {} }
let ceremonyOpen = false;
function maybeCeremony(){
  if (ceremonyOpen || !isMember(S.uid)) return;
  const td = D.td, wk = periodOf("week", addDays(td, -1));
  if (wk.end < td) {
    const kings = winnersOfPeriod(wk);
    if (kings.length && !seen("w"+wk.key)) return ceremony({ key:"w"+wk.key, week:true, per:wk, winners:kings });
  }
  const y = addDays(td, -1), w = [...(D.dw[y]||[])];
  if (w.length && !seen("d"+y)) ceremony({ key:"d"+y, week:false, day:y, winners:w });
}
function ceremony(c){
  ceremonyOpen = true;
  const box = h("div",{class:"ceremony",role:"dialog","aria-label":"Crowning ceremony"});
  const close = () => { markSeen(c.key); box.remove(); ceremonyOpen = false; render(); };
  const title = c.week ? "King of the Week" : "The Himmest";
  const when = c.week ? periodName(c.per) : fmtDay(c.day);
  const reveal = () => {
    const u = c.winners[0], names = c.winners.map(nm).join(" & ");
    const charge = c.week ? null : (D.nominated[c.day]?.[u] || [])[0];
    const isMe = c.winners.includes(S.uid);
    box.replaceChildren(h("div",{class:"reveal"},
      h("div",{class:"pre"}, `${title} · ${when}`),
      h("div",{class:"crownav"}, avatar(u,"xl")),
      h("h1",null, names),
      charge ? h("p",{style:"font-weight:700;max-width:28rem"}, `Charge: "${charge.reason}"`) : null,
      c.week ? h("p",{style:"max-width:28rem"}, isMe ? "You're the King. You make the rule and pick the punishment for this week." : `${firstNm(u)} now makes the rule and picks this week's punishment. God help us.`) : null,
      roast(`crown:${c.key}`, "crown", { name:firstNm(u), text: charge ? charge.reason : "won the whole week" }),
      h("div",{class:"btnrow"},
        h("button",{class:"btn hi",onclick:()=>shareStory({ title, when, uid:u, names, line: charge ? `"${charge.reason}"` : (S.roasts[`crown:${c.key}`]||"") })},"📲 Share to Story"),
        h("button",{class:"btn",onclick:()=>{ close(); if (c.week && isMe) go("today"); }}, c.week && isMe ? "Set the rules" : "Continue"))));
    confetti();
  };
  document.body.append(box);
  if (reduced()) return reveal();
  const steps = [c.week ? "This week's King is…" : "Yesterday's Himmest is…", "3", "2", "1"];
  let i = 0;
  const tick = () => {
    if (i >= steps.length) return reveal();
    box.replaceChildren(h("div",{class:"pre"}, `${title} · ${when}`), i === 0 ? h("h1",null,steps[0]) : h("div",{class:"drum"}, steps[i]));
    i++; setTimeout(tick, i === 1 ? 1300 : 700);
  };
  tick();
}
function loadImg(src){ return new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }); }
function wrapText(g, text, x, y, maxW, lh, maxLines){
  const words = String(text).split(/\s+/); let line = "", lines = [];
  for (const w of words) { const t = line ? line + " " + w : w; if (g.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line);
  lines = lines.slice(0, maxLines);
  lines.forEach((l, i) => g.fillText(l, x, y + i*lh));
  return lines.length * lh;
}
/* Draw a 9:16 story image and hand it to the share sheet (or show it to save). */
async function shareStory({ title, when, uid, names, line }){
  const W = 1080, H = 1920, c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d");
  await (document.fonts?.ready || Promise.resolve());
  g.fillStyle = "#16142e"; g.fillRect(0,0,W,H);
  g.strokeStyle = "rgba(255,225,77,.18)"; g.lineWidth = 6;
  for (let i = -H; i < W; i += 60) { g.beginPath(); g.moveTo(i,0); g.lineTo(i+H,H); g.stroke(); }
  g.textAlign = "center";
  g.fillStyle = "#ffe14d"; g.save(); g.translate(W/2, 260); g.rotate(-0.04);
  g.fillRect(-330,-90,660,150); g.fillStyle = "#16142e"; g.font = "100px Bungee, Impact, sans-serif"; g.fillText("HIMMEST", 0, 30); g.restore();
  g.fillStyle = "#ff3d8b"; g.font = "56px Bungee, Impact, sans-serif"; g.fillText(title.toUpperCase(), W/2, 470);
  g.fillStyle = "#cfcde6"; g.font = "44px 'DM Mono', monospace"; g.fillText(when, W/2, 540);
  const cx = W/2, cy = 900, r = 260;
  g.save(); g.beginPath(); g.arc(cx, cy, r, 0, Math.PI*2); g.closePath();
  const p = S.profiles[uid], img = p && okImg(p.photo) ? await loadImg(p.photo) : null;
  if (img) { g.clip(); g.drawImage(img, cx-r, cy-r, r*2, r*2); }
  else { g.fillStyle = `hsl(${hue(uid)} 62% 42%)`; g.fill(); g.fillStyle = "#fff"; g.font = "200px Bungee, Impact, sans-serif"; g.fillText(((p?.first||"?")[0]+(p?.last||"")[0]).toUpperCase(), cx, cy+70); }
  g.restore();
  g.lineWidth = 16; g.strokeStyle = "#ffe14d"; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI*2); g.stroke();
  g.font = "200px serif"; g.fillText("👑", cx, cy - r + 10);
  g.fillStyle = "#ffffff"; g.font = "92px Bungee, Impact, sans-serif";
  const hName = wrapText(g, names, W/2, 1300, 940, 100, 2);
  if (line) { g.fillStyle = "#ffe14d"; g.font = "bold 54px 'Familjen Grotesk', sans-serif"; wrapText(g, line, W/2, 1330 + hName, 900, 70, 5); }
  g.fillStyle = "#a6a2cc"; g.font = "40px 'DM Mono', monospace"; g.fillText("himmest.vercel.app", W/2, H-120);
  const blob = await new Promise(res => c.toBlob(res, "image/png"));
  const file = new File([blob], "himmest.png", { type:"image/png" });
  try {
    if (navigator.canShare && navigator.canShare({ files:[file] })) { await navigator.share({ files:[file], title:"The Himmest" }); return; }
  } catch (e) { if (e && e.name === "AbortError") return; }
  const url = URL.createObjectURL(blob);
  const box = h("div",{class:"lightbox",role:"dialog","aria-label":"Story image",onclick:()=>{ box.remove(); URL.revokeObjectURL(url); }},
    h("img",{src:url,class:"storyimg",alt:"Story image"}), h("p",null,"Press and hold the image to save it, then post it to your story."));
  document.body.append(box);
}

/* ============ push notifications ============ */
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
async function checkPush(){
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) { S.push = isIOS && !standalone ? "install" : "unsupported"; return; }
    if (Notification.permission === "denied") { S.push = "denied"; return; }
    const reg = await navigator.serviceWorker.ready;
    S.push = (await reg.pushManager.getSubscription()) ? "on" : "off";
  } catch { S.push = "unsupported"; }
}
function b64ToBytes(s){ const p = "=".repeat((4 - s.length % 4) % 4), b = atob((s + p).replace(/-/g,"+").replace(/_/g,"/")); return Uint8Array.from(b, c => c.charCodeAt(0)); }
async function enablePush(){
  try {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") { toast("No notifications? Your loss. You'll miss getting roasted live."); S.push = perm === "denied" ? "denied" : "off"; render(); return; }
    const { key } = await api("/api/push");
    if (!key) { toast("Notifications aren't switched on for the arena yet."); return; }
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey:b64ToBytes(key) });
    await api("/api/push",{ method:"POST", body:JSON.stringify({ sub:sub.toJSON() }) });
    S.push = "on"; toast("Notifications on. You'll know the second someone exposes you."); render();
  } catch (e) { toast(e.message || "Couldn't turn on notifications."); }
}
async function disablePush(){
  try {
    const reg = await navigator.serviceWorker.ready, sub = await reg.pushManager.getSubscription();
    if (sub) { await api("/api/push",{ method:"DELETE", body:JSON.stringify({ sub:sub.toJSON() }) }).catch(()=>{}); await sub.unsubscribe(); }
    S.push = "off"; render();
  } catch {}
}
function pushCard(){
  if (S.push === "on" || S.push === "unsupported" || S.push === "denied" || S.push === "unknown") return null;
  let hidden = false; try { hidden = localStorage.getItem("himmest.pushcard") === "no"; } catch {}
  if (hidden) return null;
  if (S.push === "install") return h("div",{class:"install"},
    h("div",{style:"flex:1"}, h("b",null,"Put the Himmest on your iPhone"),
      h("p",{class:"small",style:"margin-top:4px"},"In Safari, tap Share (the square with an arrow), then Add to Home Screen. Then open it from there to get notifications when someone exposes you.")),
    h("button",{class:"btn ghost",style:"border-color:var(--hi-ink);color:var(--hi-ink)",onclick:()=>{ try{localStorage.setItem("himmest.pushcard","no")}catch{} render(); }},"Hide"));
  return h("div",{class:"card pink pushcard"},
    h("div",{style:"flex:1;min-width:12rem"}, h("h3",null,"Turn on notifications"), h("p",{class:"small muted",style:"margin-top:4px"},"Get pinged when someone nominates you, quotes you or posts a moment of you. Plus the nightly crowning.")),
    h("div",{class:"btnrow"}, h("button",{class:"btn primary",onclick:enablePush},"Turn on"), h("button",{class:"btn ghost",onclick:()=>{ try{localStorage.setItem("himmest.pushcard","no")}catch{} render(); }},"Later")));
}
