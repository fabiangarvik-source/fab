"use strict";
/* ============ constants ============ */
const TZ = "America/New_York";
const START_HB = 1000, ALLOW_HB = 25, FLOOR_HB = 100;
const PTS_VOTE = 1, PTS_DAY = 3, PTS_QUOTE = 2, PTS_MOMENT = 2;
const MAX_ITEMS = 1000, NOMS_PER_DAY = 3;
const COLS = ["profiles","votes","quotes","qvotes","vetoes","bets","photos","reacts","noms","appeals","verdicts","comments","reign"];

const ARCHETYPES = [
  "Golden Retriever In Human Form","Gym Rat With A Heart Of Gold","Uses \"bro\" As Punctuation",
  "Thinks Protein Is A Personality","Got Lost Inside The Library","Main Character Of The Dining Hall",
  "Emotionally Available Himbo","Confidently Wrong, Spiritually Right","Just Happy To Be Here",
  "Would Fight A Goose For You","Owns One Pan And It's For Eggs"
];
const PROMPTS = [
  "Who said the most beautiful thing with the fewest brain cells?",
  "Who asked if the moon counts as a planet?",
  "Who held the door for someone 200 feet away?",
  "Who tried to pay with something that was not money?",
  "Who explained something wrong with total confidence?",
  "Who got genuinely emotional about a dog today?",
  "Who did a gym set mid-conversation without being asked?",
  "Who walked into the wrong class and stayed anyway?",
  "Who asked a question that was answered 30 seconds earlier?",
  "Who forgot where they live, briefly?",
  "Whose plan today was 100% vibes and 0% plan?",
  "Who pushed a pull door and blamed the door?",
  "Who put something in the microwave that should never go in a microwave?"
];
const TITLES = [[0,"Has At Least Three Thoughts"],[1,"Certified Himbo"],[3,"Golden Retriever Energy"],[7,"Protein Shake Philosopher"],[15,"Himbo Emeritus"],[30,"Too Pure For This World"]];
const REACTS = { dead:["💀","Dead"], zero:["🧠","0 brain cells"], dog:["🐶","Golden retriever"], iconic:["👑","Iconic"] };
const PERIODS = { week:"Him of the Week", month:"Him of the Month", year:"Him of the Year" };
const FILLER = [
  "Weather update: 0% chance of a thought, 100% chance of good intentions",
  "Reminder: the Himmest is an honor. Mostly.",
  "Himbucks are not real money. Stop trying to Venmo them.",
  "Polls close at midnight. Brains closed years ago.",
  "Scientists confirm: being the Himmest burns zero calories",
  "Local man nominated, files appeal, loses appeal, nominated again"
];
const ICONS = {
  today:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/></svg>',
  moments:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 7h3l2-3h6l2 3h3v13H4z"/><circle cx="12" cy="13" r="4"/></svg>',
  quotes:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4z"/></svg>',
  bets:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1.3" fill="currentColor"/><circle cx="15" cy="15" r="1.3" fill="currentColor"/><circle cx="15" cy="9" r="1.3" fill="currentColor"/><circle cx="9" cy="15" r="1.3" fill="currentColor"/></svg>',
  memories:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 15l5-5 4 4 3-3 6 6"/><circle cx="16" cy="9" r="1.5"/></svg>'
};

/* ============ time ============ */
function etParts(d = new Date()){
  const f = new Intl.DateTimeFormat("en-CA",{timeZone:TZ,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false});
  const p = {}; for (const x of f.formatToParts(d)) p[x.type] = x.value;
  return { day:`${p.year}-${p.month}-${p.day}`, h:(+p.hour)%24, m:+p.minute, s:+p.second };
}
const today = () => etParts().day;
function secsToMidnight(){ const p = etParts(); return 86400 - (p.h*3600+p.m*60+p.s); }
function fmtDur(s){ s=Math.max(0,s|0); const d=Math.floor(s/86400), h=Math.floor(s%86400/3600), m=Math.floor(s%3600/60); return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m ${s%60}s`; }
function dayIndex(k){ const [y,m,d]=k.split("-").map(Number); return Math.floor(Date.UTC(y,m-1,d)/864e5); }
function keyOf(i){ return new Date(i*864e5).toISOString().slice(0,10); }
const addDays = (k, n) => keyOf(dayIndex(k) + n);
const asDate = k => new Date(dayIndex(k)*864e5+432e5);
function fmtDay(k){ return asDate(k).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",timeZone:"UTC"}); }
function fmtMonth(k){ return asDate(k).toLocaleDateString("en-US",{month:"long",year:"numeric",timeZone:"UTC"}); }
function periodOf(type, day){
  const i = dayIndex(day);
  if (type === "week") { const s = i - ((i+3)%7); return { type, key:"w"+keyOf(s), start:keyOf(s), end:keyOf(s+6) }; }
  const [y,m] = day.split("-").map(Number);
  if (type === "month") return { type, key:"m"+day.slice(0,7), start:keyOf(Date.UTC(y,m-1,1)/864e5), end:keyOf(Date.UTC(y,m,1)/864e5-1) };
  if (type === "season") {
    if (m <= 5) return { type, key:`s${y}-spring`, start:`${y}-01-01`, end:`${y}-05-31`, name:`Spring ${y}` };
    if (m <= 7) return { type, key:`s${y}-summer`, start:`${y}-06-01`, end:`${y}-07-31`, name:`Summer ${y}` };
    return { type, key:`s${y}-fall`, start:`${y}-08-01`, end:`${y}-12-31`, name:`Fall ${y}` };
  }
  return { type, key:"y"+y, start:`${y}-01-01`, end:`${y}-12-31` };
}
function periodName(per){
  if (per.name) return per.name;
  if (per.type === "week") return `Week of ${asDate(per.start).toLocaleDateString("en-US",{month:"short",day:"numeric",timeZone:"UTC"})}`;
  if (per.type === "month") return fmtMonth(per.start);
  return per.start.slice(0,4);
}
/* Week bets close at midnight on Wednesday; month and year bets close when the last day starts. */
/* Launch week (the app's first week): week bets stay open through Saturday, and there is an interim King. */
const LAUNCH_WEEK = "w2026-09-28";
const lastBetDay = per => per.type === "week" ? addDays(per.start, per.key === LAUNCH_WEEK ? 5 : 2) : addDays(per.end, -1);
function betOpenOn(per, day){ return day <= lastBetDay(per); }
function betCloseSecs(per, td){ return (dayIndex(lastBetDay(per)) - dayIndex(td)) * 86400 + secsToMidnight(); }

/* ============ dom ============ */
function h(tag, attrs, ...kids){
  const el = document.createElement(tag);
  if (attrs) for (const [k,v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "class") el.className = v;
    else if (k === "style") el.style.cssText = v;
    else if (k === "value") el.value = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of kids.flat(Infinity)) if (c != null && c !== false) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return el;
}
function icon(name){ const s = h("span",{"aria-hidden":"true",style:"display:inline-flex"}); s.innerHTML = ICONS[name]; return s; }
let toastT;
function toast(msg){ const t=document.getElementById("toast"); t.textContent=msg; t.hidden=false; clearTimeout(toastT); toastT=setTimeout(()=>t.hidden=true,3200); }
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
function confetti(){
  if (reduced()) return;
  const c = h("canvas",{class:"confetti","aria-hidden":"true"}); document.body.append(c);
  const W = c.width = innerWidth, H = c.height = innerHeight, g = c.getContext("2d");
  const cs = getComputedStyle(document.documentElement), cols = ["--hi","--pop","--accent","--good"].map(v=>cs.getPropertyValue(v).trim()||"#fc0");
  const ps = Array.from({length:90},()=>({x:W/2,y:H*0.45,vx:(Math.random()-.5)*14,vy:-Math.random()*13-4,r:Math.random()*6+4,a:Math.random()*6,c:cols[Math.random()*cols.length|0]}));
  let t = 0;
  (function f(){ g.clearRect(0,0,W,H); for (const p of ps){ p.vy+=.45; p.x+=p.vx; p.y+=p.vy; p.a+=.2; g.save(); g.translate(p.x,p.y); g.rotate(p.a); g.fillStyle=p.c; g.fillRect(-p.r/2,-p.r/4,p.r,p.r/2); g.restore(); }
    if (++t < 90) requestAnimationFrame(f); else c.remove(); })();
}
function lightbox(src, caption){
  const box = h("div",{class:"lightbox",role:"dialog","aria-label":"Photo",tabindex:"-1",onclick:()=>box.remove(),onkeydown:e=>{ if (e.key==="Escape") box.remove(); }},
    h("img",{src,alt:caption||"Photo"}), caption ? h("p",null,caption) : null, h("span",{class:"small",style:"color:#cfcde6"},"Tap anywhere to close"));
  document.body.append(box); box.focus();
}
const okImg = u => typeof u === "string" && /^\/api\/img\?k=[A-Za-z0-9_-]{4,64}$/.test(u);
const imgKey = u => okImg(u) ? u.split("k=")[1] : null;
function loadImage(file){
  return new Promise((res, rej) => {
    if (!file || !/^image\//.test(file.type)) return rej(new Error("That file isn't a picture."));
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("Couldn't read that picture. Try a JPG or PNG.")); };
    img.src = url;
  });
}
/* Shrink a picture before it is uploaded. */
async function compress(file, { max, square, budget }){
  const img = await loadImage(file);
  let sw = img.naturalWidth, sh = img.naturalHeight, sx = 0, sy = 0;
  if (square) { const m = Math.min(sw, sh); sx = (sw-m)/2; sy = (sh-m)/2; sw = sh = m; }
  let scale = Math.min(1, max / Math.max(sw, sh));
  for (let tries = 0; tries < 8; tries++) {
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(sw*scale)); c.height = Math.max(1, Math.round(sh*scale));
    const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0,0,c.width,c.height);
    g.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
    for (const q of [0.8, 0.68, 0.56, 0.45]) { const d = c.toDataURL("image/jpeg", q); if (d.length <= budget) return d; }
    scale *= 0.75;
  }
  throw new Error("That picture is too big even after shrinking.");
}
const rid = () => Math.random().toString(36).slice(2,10);
const cap1 = s => s ? s[0].toUpperCase()+s.slice(1) : "";
const pick = (arr, seed) => { let x = 0; for (const c of String(seed)) x = (x*31 + c.charCodeAt(0)) >>> 0; return arr[x % arr.length]; };

/* ============ state + network ============ */
const S = { uid:null, email:"", tab:"today", rankTab:"week", memTab:"roll", loaded:new Set(), push:"unknown",
  openComments:new Set(), cdraft:{}, reasonFor:null, kingOpen:false, showAppeal:false };
for (const c of COLS) S[c] = {};
const draft = { moment:{ img:null, about:"", caption:"" }, quote:{ about:"", text:"" }, nom:{ about:"", reason:"" }, reign:{ for:"", reward:"", punishment:"", photo:null },
  bets:{ week:{on:"",amt:""}, month:{on:"",amt:""}, year:{on:"",amt:""} } };
try { const t = localStorage.getItem("himmest.tab"); if (t && t !== "bets") S.tab = t; } catch {}
let D = null, V = "", authed = null;

async function api(path, opts = {}){
  let r;
  try { r = await fetch(path, { credentials:"same-origin", ...opts, headers:{ "content-type":"application/json", ...(opts.headers||{}) } }); }
  catch { throw Object.assign(new Error("No connection. Check your internet and try again."), { status:0 }); }
  let j = null; try { j = await r.json(); } catch {}
  if (!r.ok) throw Object.assign(new Error(j?.error || "Something went wrong. Try again."), { status:r.status });
  return j;
}
async function uploadImg(kind, data){ return (await api("/api/img", { method:"POST", body:JSON.stringify({ kind, data }) })).url; }
async function write(col, data){
  if (!S.uid) return false;
  try { await api("/api/doc", { method:"POST", body:JSON.stringify({ col, data }) }); S[col] = { ...S[col], [S.uid]:data }; return true; }
  catch(e){ if (e.status === 401) { authed = false; render(); } toast(e.message); return false; }
}
const mine = col => S[col][S.uid] || {};
const isMember = uid => !!S.profiles[uid];
const members = () => Object.keys(S.profiles);
const nm = uid => { const p=S.profiles[uid]; return p ? `${p.first||""} ${p.last||""}`.trim() || "Mystery Him" : "A former himbo"; };
const firstNm = uid => S.profiles[uid]?.first || "Someone";
function hue(s){ let x=0; for (const c of s) x=(x*31+c.charCodeAt(0))>>>0; return x%360; }
function avatar(uid, size){
  const p = S.profiles[uid], cls = "av" + (size ? " "+size : "");
  const style = `background:hsl(${hue(uid)} 62% 42%)`;
  if (p && okImg(p.photo)) return h("div",{class:cls,"aria-hidden":"true",style}, h("img",{src:p.photo,alt:""}));
  const ini = p ? (((p.first||"?")[0]||"")+((p.last||"")[0]||"")).toUpperCase() : "?";
  return h("div",{class:cls,"aria-hidden":"true",style}, ini);
}
function titleFor(n){ let t=TITLES[0][1]; for (const [k,s] of TITLES) if (n>=k) t=s; return t; }
function emptyBox(t, s){ return h("div",{class:"empty"}, h("strong",null,t), s); }
const items = (doc, max = MAX_ITEMS) => (doc?.items || []).slice(-max);

/* ============ derived data (rebuilt every render) ============ */
function derive(){
  const td = today();
  const vetoed = (about, key) => (S.vetoes[about]?.keys||[]).includes(key);
  const quotes = [], photos = [], noms = [];
  for (const [author, doc] of Object.entries(S.quotes)) {
    if (!isMember(author)) continue;
    for (const q of items(doc)) {
      if (!q || typeof q.text !== "string" || !isMember(q.about) || typeof q.day !== "string") continue;
      const key = `${author}:${q.k}`;
      if (!vetoed(q.about, key)) quotes.push({ ...q, text:q.text.slice(0,240), author, key });
    }
  }
  for (const [author, doc] of Object.entries(S.photos)) {
    if (!isMember(author)) continue;
    for (const p of items(doc)) {
      if (!p || !okImg(p.img) || !isMember(p.about) || typeof p.day !== "string") continue;
      const key = `p:${author}:${p.k}`;
      if (!vetoed(p.about, key)) photos.push({ ...p, caption:String(p.caption||"").slice(0,140), author, key });
    }
  }
  for (const [author, doc] of Object.entries(S.noms)) {
    if (!isMember(author)) continue;
    for (const n of items(doc)) {
      if (!n || !isMember(n.about) || n.about === author || typeof n.day !== "string" || n.day > td) continue;
      noms.push({ ...n, reason:String(n.reason||"").slice(0,140), author, key:`n:${author}:${n.k}` });
    }
  }
  quotes.sort((a,b)=>(b.ts||0)-(a.ts||0)); photos.sort((a,b)=>(b.ts||0)-(a.ts||0)); noms.sort((a,b)=>(a.ts||0)-(b.ts||0));

  const nominated = {};                     // day -> uid -> [noms]
  for (const n of noms) ((nominated[n.day] ||= {})[n.about] ||= []).push(n);
  const accused = {};                       // day -> uid -> true (charged or voted for)
  for (const [d, m] of Object.entries(nominated)) for (const u of Object.keys(m)) (accused[d] ||= {})[u] = true;
  for (const [voter, v] of Object.entries(S.votes)) if (isMember(voter)) for (const [d, t] of Object.entries(v?.days||{})) if (isMember(t) && t !== voter) (accused[d] ||= {})[t] = true;
  const appeals = {};                       // day -> uid -> {text, ts}
  for (const [uid, doc] of Object.entries(S.appeals)) {
    if (!isMember(uid)) continue;
    for (const [d, a] of Object.entries(doc?.days||{})) if (a && typeof a.text === "string" && accused[d]?.[uid]) (appeals[d] ||= {})[uid] = { text:a.text.slice(0,200), ts:a.ts };
  }
  const verdicts = {};                      // day -> uid -> {guilty, innocent, mine}
  for (const [voter, doc] of Object.entries(S.verdicts)) {
    if (!isMember(voter)) continue;
    for (const [d, m] of Object.entries(doc?.days||{})) for (const [u, v] of Object.entries(m||{})) {
      if (u === voter || !appeals[d]?.[u] || (v !== "guilty" && v !== "innocent")) continue;
      const t = ((verdicts[d] ||= {})[u] ||= { guilty:0, innocent:0 }); t[v]++;
    }
  }
  const acquitted = (d, u) => { const t = verdicts[d]?.[u]; return !!(t && t.innocent > t.guilty); };

  const qByKey = new Map(quotes.map(q=>[q.key,q])), pByKey = new Map(photos.map(p=>[p.key,p]));
  /* Him Points: 1 per vote you get, +3 for winning the day, +2 for the day's best quote, +2 for the day's best moment. */
  const pts = {}, br = {};
  const add = (d,u,n,kind) => { (pts[d] ||= {}); pts[d][u] = (pts[d][u]||0) + n; const b = ((br[d] ||= {})[u] ||= { votes:0, wins:0, quotes:0, moments:0 }); b[kind]++; };
  const dv = {}, receipts = {};
  for (const [voter, v] of Object.entries(S.votes)) {
    if (!isMember(voter)) continue;
    for (const [d, t] of Object.entries(v?.days||{})) {
      if (!isMember(t) || t === voter || d > td) continue;
      (receipts[d] ||= []).push({ voter, target:t });
      if (acquitted(d, t)) continue;
      (dv[d] ||= {}); dv[d][t] = (dv[d][t]||0) + 1; add(d, t, PTS_VOTE, "votes");
    }
  }
  const dw = {};
  for (const [d, t] of Object.entries(dv)) {
    const max = Math.max(0, ...Object.values(t));
    dw[d] = max > 0 ? new Set(Object.keys(t).filter(k=>t[k]===max)) : new Set();
    if (d < td) for (const w of dw[d]) add(d, w, PTS_DAY, "wins");
  }
  const qv = {};
  for (const [voter, v] of Object.entries(S.qvotes)) {
    if (!isMember(voter)) continue;
    for (const [d, k] of Object.entries(v?.days||{})) {
      const q = qByKey.get(k);
      if (!q || q.day !== d || voter === q.author || voter === q.about) continue;
      qv[k] = (qv[k]||0) + 1;
    }
  }
  const rc = {};
  for (const [who, doc] of Object.entries(S.reacts)) {
    if (!isMember(who)) continue;
    for (const [k, type] of Object.entries(doc?.map||{})) {
      const p = pByKey.get(k);
      if (!p || !REACTS[type] || who === p.about) continue;
      const r = (rc[k] ||= { total:0 }); r[type] = (r[type]||0) + 1; r.total++;
    }
  }
  /* Best quote and best moment of each finished day earn a bonus (ties all win). */
  const bestOf = (list, score, kind, bonus) => {
    const byDay = {}; for (const x of list) if (x.day < td) (byDay[x.day] ||= []).push(x);
    for (const [d, xs] of Object.entries(byDay)) {
      const max = Math.max(0, ...xs.map(score)); if (!max) continue;
      const winners = new Set(xs.filter(x=>score(x)===max).map(x=>x.about));
      for (const u of winners) add(d, u, bonus, kind);
    }
  };
  bestOf(quotes, q=>qv[q.key]||0, "quotes", PTS_QUOTE);
  bestOf(photos, p=>rc[p.key]?.total||0, "moments", PTS_MOMENT);
  const comments = {};
  for (const [author, doc] of Object.entries(S.comments)) {
    if (!isMember(author)) continue;
    for (const c of items(doc, 600)) if (c && typeof c.text === "string" && typeof c.on === "string") (comments[c.on] ||= []).push({ ...c, text:c.text.slice(0,200), author });
  }
  for (const list of Object.values(comments)) list.sort((a,b)=>(a.ts||0)-(b.ts||0));
  return { td, quotes, photos, noms, nominated, accused, appeals, verdicts, acquitted, pts, br, dv, dw, receipts, qv, rc, comments };
}
function standings(start, end){
  const tot = {}, b = {}; for (const u of members()) { tot[u] = 0; b[u] = { votes:0, wins:0, quotes:0, moments:0 }; }
  for (const [d, m] of Object.entries(D.pts)) if (d >= start && d <= end) for (const [u,n] of Object.entries(m)) if (u in tot) {
    tot[u] += n; const x = D.br[d][u]; for (const k in x) b[u][k] += x[k];
  }
  return members().sort((a,c)=>tot[c]-tot[a] || b[c].votes-b[a].votes || nm(a).localeCompare(nm(c))).map(u=>({ uid:u, pts:tot[u], br:b[u] }));
}
/* "9 votes · 1 day win · 1 best quote" */
function whyText(br){
  const parts = [];
  if (br.votes) parts.push(`${br.votes} vote${br.votes===1?"":"s"}`);
  if (br.wins) parts.push(`${br.wins} day win${br.wins===1?"":"s"}`);
  if (br.quotes) parts.push(`${br.quotes} best quote${br.quotes===1?"":"s"}`);
  if (br.moments) parts.push(`${br.moments} best moment${br.moments===1?"":"s"}`);
  return parts.join(" · ") || "nothing yet";
}
/* Activity in a date range: votes cast, charges filed, moments posted, quotes logged. Used to break ties. */
function activity(uid, start, end){
  const inR = d => d >= start && d <= end;
  let n = Object.entries(S.votes[uid]?.days || {}).filter(([d, t]) => inR(d) && isMember(t) && t !== uid).length;
  n += D.noms.filter(x=>x.author===uid && inR(x.day)).length;
  n += D.photos.filter(x=>x.author===uid && inR(x.day)).length;
  n += D.quotes.filter(x=>x.author===uid && inR(x.day)).length;
  return n;
}
function coin(seed){ let x = 2166136261; for (const c of String(seed)) { x ^= c.charCodeAt(0); x = Math.imul(x, 16777619) >>> 0; } return x; }
/* Exactly one winner: most Him Points, then most active, then most votes received, then a coin flip. */
function winnerOf(per){
  const st = standings(per.start, per.end), max = st[0]?.pts || 0;
  if (!max) return null;
  let tied = st.filter(s=>s.pts===max);
  if (tied.length === 1) return { uid:tied[0].uid, how:"points" };
  const act = Object.fromEntries(tied.map(s=>[s.uid, activity(s.uid, per.start, per.end)]));
  const topAct = Math.max(...Object.values(act)); tied = tied.filter(s=>act[s.uid]===topAct);
  if (tied.length === 1) return { uid:tied[0].uid, how:"activity" };
  const topV = Math.max(...tied.map(s=>s.br.votes)); tied = tied.filter(s=>s.br.votes===topV);
  if (tied.length === 1) return { uid:tied[0].uid, how:"votes" };
  tied.sort((a,b)=>coin(per.start+a.uid) - coin(per.start+b.uid));
  return { uid:tied[0].uid, how:"coin" };
}
const HOW = { points:"Most Him Points", activity:"Tie broken: most active", votes:"Tie broken: most votes", coin:"Tie broken: coin flip 🪙", interim:"Launch week: interim pick" };
function winnersOfPeriod(per){ const w = winnerOf(per); return w ? [w.uid] : []; }
function brainCells(uid){
  const wk = periodOf("week", D.td); const s = standings(wk.start, wk.end).find(x=>x.uid===uid);
  return Math.max(0, 100 - (s?.pts||0) * 2);
}
function pastPeriods(type){
  const td = D.td, seen = new Map();
  for (const d of Object.keys(D.pts)) { const per = periodOf(type, d); if (per.end < td && !seen.has(per.key)) seen.set(per.key, per); }
  return [...seen.values()].sort((a,b)=>b.end.localeCompare(a.end));
}
function pastWinners(type){ return pastPeriods(type).map(per=>({ per, winners:winnersOfPeriod(per) })).filter(x=>x.winners.length); }
function trophies(uid){
  const out = { day:0, week:0, month:0, year:0 };
  for (const [d, w] of Object.entries(D.dw)) if (d < D.td && w.has(uid)) out.day++;
  for (const type of ["week","month","year"]) for (const x of pastWinners(type)) if (x.winners.includes(uid)) out[type]++;
  return out;
}
/* The Himmest who reigns during a week is the winner of the week before. */
function reignFor(per){
  const prev = periodOf("week", addDays(per.start, -1));
  let w = prev.end < D.td ? winnerOf(prev) : null;
  if (per.key === LAUNCH_WEEK && !w) {
    /* Launch week: the latest finished day's Himmest this week, else whoever leads the week right now. */
    for (let d = addDays(D.td, -1); d >= per.start && !w; d = addDays(d, -1)) { const x = winnerOf({ start:d, end:d }); if (x) w = { uid:x.uid, how:"interim" }; }
    if (!w) { const x = winnerOf({ start:per.start, end:D.td }); if (x) w = { uid:x.uid, how:"interim" }; }
  }
  const kings = w ? [w.uid] : [];
  const r = w ? S.reign[w.uid]?.weeks?.[per.key] : null;
  const law = r && (r.reward || r.punishment || r.photo || r.rule) ? { ...r, by:w.uid } : null;
  return { kings, how:w?.how, law, prev };
}
const himmestNow = () => reignFor(periodOf("week", D.td)).kings[0] || null;
function himBadge(uid){ return uid && uid === himmestNow() ? h("span",{class:"himbadge"},"👑 THE HIMMEST") : null; }
function ledger(){
  const td = D.td, bal = {}, hist = {};
  for (const u of members()) {
    const days = S.votes[u]?.days || {};
    const voted = Object.keys(days).filter(d => d < td && isMember(days[d]) && days[d] !== u).length;
    bal[u] = START_HB + ALLOW_HB * voted; hist[u] = [];
  }
  const groups = {};
  for (const [u, doc] of Object.entries(S.bets)) {
    if (!isMember(u)) continue;
    for (const b of items(doc)) {
      if (!b || !PERIODS[b.type] || typeof b.day !== "string" || b.day > td || !isMember(b.on)) continue;
      const amt = Math.floor(+b.amt || 0); if (amt < 1) continue;
      const per = periodOf(b.type, b.day); if (!betOpenOn(per, b.day)) continue;
      (groups[per.key] ||= { per, list:[] }).list.push({ uid:u, on:b.on, amt, type:b.type, k:b.k });
    }
  }
  const clamp = list => {
    const tot = {}; for (const b of list) tot[b.uid] = (tot[b.uid]||0) + b.amt;
    return list.map(b => { const av = Math.max(0, bal[b.uid]||0); return tot[b.uid] > av ? { ...b, amt:Math.floor(b.amt*av/tot[b.uid]) } : b; }).filter(b=>b.amt>0);
  };
  const floor = () => { for (const u in bal) if (bal[u] < FLOOR_HB) bal[u] = FLOOR_HB; };
  const weekNet = {};
  for (const g of Object.values(groups).filter(g=>g.per.end < td).sort((a,b)=>a.per.end.localeCompare(b.per.end))) {
    floor();
    const list = clamp(g.list), pool = list.reduce((a,b)=>a+b.amt,0), win = new Set(winnersOfPeriod(g.per));
    const W = list.filter(b=>win.has(b.on)).reduce((a,b)=>a+b.amt,0);
    for (const b of list) {
      const pay = W === 0 ? b.amt : (win.has(b.on) ? Math.round(b.amt/W*pool) : 0);
      bal[b.uid] += pay - b.amt;
      hist[b.uid].push({ per:g.per, on:b.on, amt:b.amt, pay, refund:W===0 });
      if (g.per.type === "week") { const m = (weekNet[g.per.key] ||= {}); m[b.uid] = (m[b.uid]||0) + pay - b.amt; }
    }
  }
  floor();
  const open = clamp(Object.values(groups).filter(g=>g.per.end >= td).flatMap(g=>g.list.map(b=>({ ...b, per:g.per }))));
  const escrow = {}; for (const b of open) escrow[b.uid] = (escrow[b.uid]||0) + b.amt;
  /* Who gets the punishment for a finished week: the biggest loser on that week's King bet.
     Not betting counts as the biggest loss. Ties go to whoever was least active that week. */
  const brokest = per => {
    if (!per || per.end >= td) return null;
    const m = weekNet[per.key] || {};
    const pool = members().filter(u => (S.profiles[u].joined || "") <= per.end);
    if (!pool.length) return null;
    const loss = u => u in m ? -m[u] : Infinity;
    const worst = Math.max(...pool.map(loss));
    if (worst <= 0) return null;
    const tied = pool.filter(u => loss(u) === worst).sort((a,b)=>activity(a, per.start, per.end) - activity(b, per.start, per.end) || coin(per.key+a) - coin(per.key+b));
    const u = tied[0];
    return { uid:u, lost: worst === Infinity ? 0 : worst, why: worst === Infinity ? "didn't bet" : `lost ${worst} HB`, tie: tied.length > 1 };
  };
  return { bal, hist, open, brokest, avail:u=>Math.max(0,(bal[u]||0)-(escrow[u]||0)) };
}
