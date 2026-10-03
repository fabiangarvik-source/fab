(() => {
/* ---- 0-roasts.js ---- */
/* Hand-written roast lines. Each thing gets one line picked by its key, so it stays the same on every screen. */
const ROASTS = {
  any: [
    "{name} has the survival instincts of a moth at a bonfire.",
    "Somewhere a golden retriever just felt smarter than {name}.",
    "{name} had one brain cell today and it called in sick.",
    "{name}'s brain is running on airplane mode.",
    "If confidence was IQ, {name} would be a genius. Tragic.",
    "Scientists are studying {name}. Not in a good way.",
    "{name} is the reason shampoo has instructions.",
    "Even autocorrect couldn't fix {name}'s decisions today.",
    "{name} out here playing life on easy mode and still losing.",
    "{name} is not the main character. {name} is the tutorial.",
    "{name}'s last thought left a voicemail. Nobody called back.",
    "{name} has the energy of a dog that just saw a door open.",
    "NASA called. They want to study the empty space in {name}'s head.",
    "{name} would lose a staring contest to a parked car.",
    "{name}'s brain has two tabs open and both are loading.",
    "{name} is proof that evolution takes breaks.",
    "If {name} was a spice, it would be flour.",
    "{name} brings nothing to the table and still asks for seconds.",
    "Somebody unplug {name} and plug him back in.",
    "{name} has the strategic mind of a Roomba.",
    "{name}'s search history is just \"how\".",
    "{name} could get lost in a hallway with one door.",
    "{name} is built different. Specifically, worse.",
    "Loading {name}'s common sense… 2%… error.",
    "{name} is running on vibes and a single granola bar.",
    "{name} peaked in kindergarten and it's been downhill since nap time.",
    "{name}'s guardian angel just requested a transfer.",
    "{name} reads the terms and conditions and still doesn't get it.",
    "Respectfully, {name} is a walking group chat screenshot.",
    "{name} thinks critical thinking is a type of workout.",
  ],
  nom: [
    "{name} is not on trial. {name} is the evidence.",
    "Honestly? {name} looked at this charge and said \"fair.\"",
    "The prosecution rests. So does {name}'s last thought.",
    "{name} didn't just do it. {name} committed to the bit with zero awareness.",
    "Charges filed. {name}'s lawyer already blocked his number.",
    "Nobody had to make this up. {name} just did it.",
    "This charge sheet is longer than {name}'s attention span.",
    "{name} pleads not guilty. The evidence pleads otherwise.",
    "Judge took one look at {name} and closed the case.",
    "{name} woke up and chose to be a headline.",
  ],
  moment: [
    "This photo should be in a museum. The Museum of Bad Decisions.",
    "Frame this. Show it at {name}'s wedding.",
    "Zoom in. You can see the thought leaving {name}'s head.",
    "{name} woke up and chose chaos. Chaos said \"no thanks.\"",
    "Caught in 4K. No lawyer can save {name} now.",
    "{name}'s mom is getting this one printed.",
    "This is {name}'s villain origin story, but dumber.",
    "Evidence exhibit A. And B. And C. It's all {name}.",
    "Somebody check on {name}. Actually, don't. This is funnier.",
    "This picture has more going on than {name}'s brain.",
    "National Geographic would pay for this {name} footage.",
    "{name} looks like he's buffering.",
  ],
  quote: [
    "{name} said this out loud. On purpose.",
    "Put it on a t-shirt. Make {name} pay for the first one.",
    "Philosophers wept. Not because it was deep.",
    "{name} speaks fluent nonsense and we're all bilingual now.",
    "That's not a quote, that's a cry for help from {name}'s last brain cell.",
    "Socrates who? We have {name}.",
    "{name} thought about this for zero seconds and it shows.",
    "The words are English. The logic is not.",
    "Every teacher {name} ever had just felt a chill.",
    "{name} should be legally required to think before speaking.",
    "Quote of the century. Unfortunately.",
  ],
  appeal: [
    "{name} is appealing? Bold move for someone with no defense.",
    "Objection: {name}'s whole personality.",
    "{name}'s lawyer just quit. Not even mad.",
    "This defense has the structural integrity of wet cardboard.",
    "{name} pleading innocent is the himmest thing {name} did today.",
    "The jury is laughing. That's not a good sign, {name}.",
    "{name} brought a spoon to a sword fight and called it a defense.",
    "Even {name} doesn't believe this one.",
  ],
  crown: [
    "All hail {name}, ruler of nothing, champion of vibes.",
    "{name} earned this crown the only way he knows how: by accident.",
    "The people have spoken, and they said {name}. Loudly.",
    "{name} is the Himmest. Nobody is surprised.",
    "Crown fits perfectly. It's the only thing in {name}'s head.",
    "History will remember this day. {name} will forget it by lunch.",
    "Long live King {name}. Short live his brain cells.",
    "{name} finally won something. It's this.",
  ],
  week: [
    "Another week, another collective IQ drop. Proud of you, boys.",
    "This week's highlights would get you all banned from a library.",
    "Seven days. Zero thoughts. Incredible consistency.",
    "If this group was a company, it would be bankrupt and somehow on fire.",
    "Scientists say brains peak at 25. You all peaked early.",
    "Somehow this week was dumber than last week. Growth.",
    "Not one of you thought before acting this week. Legendary.",
  ],
};
function roastLine(kind, name, key){
  let x = 2166136261;
  for (const c of String(key)) { x ^= c.charCodeAt(0); x = Math.imul(x, 16777619) >>> 0; }
  const own = ROASTS[kind] || [], pool = (x & 1) && own.length ? own : own.concat(ROASTS.any);
  return pool[(x >>> 1) % pool.length].replaceAll("{name}", name || "This guy");
}

/* ---- 1-core.js ---- */
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
  reels:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="3"/><path d="M10 9l5 3-5 3z" fill="currentColor"/></svg>',
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
/* Voting is open 5:00 PM – 11:59 PM Eastern. From VOTE_RULE_FROM on, votes cast outside that window don't count. */
const VOTE_OPEN_HOUR = 17, VOTE_RULE_FROM = "2026-10-03";
const votingOpen = () => etParts().h >= VOTE_OPEN_HOUR;
function secsToOpen(){ const p = etParts(); return VOTE_OPEN_HOUR*3600 - (p.h*3600+p.m*60+p.s); }
function voteCounts(voter, d){
  if (d < VOTE_RULE_FROM) return true;
  const at = S.votes[voter]?.at?.[d]; if (!at) return false;
  const p = etParts(new Date(at)); return p.day === d && p.h >= VOTE_OPEN_HOUR;
}
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
  openComments:new Set(), cdraft:{}, reelShuffle:"", reasonFor:null, kingOpen:false, showAppeal:false };
for (const c of COLS) S[c] = {};
const draft = { moment:{ img:null, about:"", caption:"", top:"", bottom:"" }, quote:{ about:"", text:"" }, nom:{ about:"", reason:"" }, reign:{ for:"", reward:"", punishment:"", photo:null },
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
      if (!isMember(t) || t === voter || d > td || !voteCounts(voter, d)) continue;
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
  let n = Object.entries(S.votes[uid]?.days || {}).filter(([d, t]) => inR(d) && isMember(t) && t !== uid && voteCounts(uid, d)).length;
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
    const voted = Object.keys(days).filter(d => d < td && isMember(days[d]) && days[d] !== u && voteCounts(u, d)).length;
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

/* ---- 2-parts.js ---- */
/* ============ roasts ============ */
/* One roast line per thing, picked from the hand-written bank (0-roasts.js). */
function roast(k, kind, ctx){
  return h("div",{class:"roast"}, h("b",null,"🎙️ ROAST"), h("span",null, roastLine(kind, ctx && ctx.name, k)));
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
const TABS = [["today","Today"],["moments","Moments"],["reels","Reels"],["quotes","Quotes"],["memories","Memories"]];
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
  const title = c.week ? "The Himmest of the Week" : "The Himmest";
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
      c.week ? h("p",{style:"max-width:28rem"}, isMe ? "You're The Himmest. Put on the Him T-shirt, pick your reward and pick the punishment." : `${firstNm(u)} wears the Him T-shirt all week, picks his reward and picks the punishment. Pray.`) : null,
      roast(`crown:${c.key}`, "crown", { name:firstNm(u), text: charge ? charge.reason : "won the whole week" }),
      h("div",{class:"btnrow"},
        h("button",{class:"btn hi",onclick:()=>shareStory({ title, when, uid:u, names, line: charge ? `"${charge.reason}"` : roastLine("crown", firstNm(u), `crown:${c.key}`) })},"📲 Share to Story"),
        h("button",{class:"btn",onclick:()=>{ close(); if (c.week && isMe) go("today"); }}, c.week && isMe ? "Pick reward + punishment" : "Continue"))));
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

/* ---- 3-today.js ---- */
/* ============ TODAY ============ */
function commentary(){
  const t = D.dv[D.td] || {}, ids = Object.keys(t).sort((a,b)=>t[b]-t[a]);
  const charged = Object.keys(D.nominated[D.td] || {}).length;
  if (!votingOpen()) return charged ? `${charged} ${charged===1?"suspect":"suspects"} charged so far. Voting opens at 5 PM. Build your case.` : "Voting opens at 5 PM. Plenty of time for someone to do something dumb.";
  if (!ids.length) return charged ? `${charged} ${charged===1?"suspect":"suspects"} charged and nobody has voted. Do your civic duty.` : "Zero votes. Either you all got smarter overnight, or you're cowards. It's the second one.";
  const [a, b] = ids;
  if (b && t[a] === t[b]) return `Dead heat between ${firstNm(a)} and ${firstNm(b)}. Nobody has thought this hard all semester.`;
  return pick([
    `${firstNm(a)} leads with ${t[a]}. Analysts are calling it "deeply earned."`,
    `${firstNm(a)} is out front with ${t[a]}. His brain cells have filed a missing persons report.`,
    `${firstNm(a)} has ${t[a]} and the momentum of a golden retriever chasing a tennis ball.`,
    `Breaking: ${firstNm(a)} surges to ${t[a]}. Experts baffled. ${firstNm(a)} also baffled.`
  ], D.td + t[a]);
}

const REWARD_IDEAS = ["Front seat all week","Picks the music at every pregame","One free veto on group plans","Someone buys his first drink","Gives one guy a nickname for the week"];
const PUNISH_IDEAS = ["Buys kebab for the whole group","Cooks dinner for the boys","50 push-ups in public","Designated driver for one night","Talks in third person for a whole day","Wears a costume to class"];

/* Who has to do last week's punishment, as a line of text. */
function owesLine(L, per){
  const last = periodOf("week", addDays(per.start, -1)), law = reignFor(last).law, b = L.brokest(last);
  if (!law?.punishment || !b) return null;
  return { uid:b.uid, text:`${firstNm(b.uid)} has to: ${law.punishment}`, why:`${b.why}${b.tie ? ", least active in a tie" : ""}` };
}
function kingCard(L){
  const per = periodOf("week", D.td), { kings, how, law } = reignFor(per);
  const owes = owesLine(L, per);
  const payUp = owes ? h("div",{class:"law"}, h("div",{class:"label"},"🧾 Pay up from last week"), h("p",null, owes.text), h("div",{class:"small"}, `(${owes.why})`)) : null;
  if (!kings.length) return h("div",{class:"king"},
    h("div",{class:"label",style:"color:var(--hi-ink)"},"👑 The Himmest of the Week"),
    h("h2",null,"Nobody has earned it yet"),
    h("p",{style:"font-weight:700"},"Most Him Points by Sunday wins. The winner wears the Him T-shirt all week, picks a reward and picks the punishment."),
    payUp);
  const u = kings[0], isKing = u === S.uid, rd = draft.reign;
  if (rd.for !== per.key) Object.assign(rd, { for:per.key, reward: law?.reward || "", punishment: law?.punishment || "", photo: law?.photo || null });
  const onPic = async e => {
    pickUntil = 0; const f = e.target.files && e.target.files[0]; e.target.value = ""; if (!f) return;
    try { toast("Uploading your royal portrait…"); rd.photo = await uploadImg("photo", await compress(f,{max:1080,square:false,budget:300000})); toast("Looking regal. Now save it."); }
    catch(x){ toast(x.message); }
  };
  const ideaChips = (list, field) => h("div",{class:"chips"}, list.map(t=>h("button",{type:"button",class:"chip"+(rd[field]===t?" on":""),onclick:()=>{ rd[field] = t; render(); }}, t)));
  return h("div",{class:"king"},
    h("div",{class:"label",style:"color:var(--hi-ink)"},`👑 The Himmest of the Week · ${periodName(per)}`),
    h("div",{style:"display:flex;align-items:center;gap:12px"}, avatar(u,"lg"), h("div",null, h("h2",null, nm(u)), h("div",{class:"small"}, HOW[how] || ""))),
    law?.photo && okImg(law.photo) ? h("img",{src:law.photo,alt:"The Himmest in his crown",style:"width:100%;max-height:280px;object-fit:cover;border-radius:10px;border:2px solid var(--hi-ink);cursor:zoom-in",onclick:()=>lightbox(law.photo,`${nm(u)}, The Himmest`)}) : null,
    h("div",{class:"law"}, h("div",{class:"label"},"👕 All week"), h("p",null, `Wears the Him T-shirt and must be called "The Himmest".`)),
    h("div",{class:"law"}, h("div",{class:"label"},"🎁 His reward"), h("p",null, law?.reward || "Not picked yet.")),
    h("div",{class:"law"}, h("div",{class:"label"},"⚖️ The punishment"), h("p",null, law?.punishment || "Not picked yet."),
      h("div",{class:"small",style:"margin-top:4px"},"Goes to whoever loses the most Himbucks on this week's bet. Didn't bet? Then it's you.")),
    payUp,
    isKing ? h("form",{onsubmit:async e=>{
      e.preventDefault();
      if (!rd.reward.trim() || !rd.punishment.trim()) { toast("Pick both a reward and a punishment, Your Highness."); return; }
      const weeks = { ...(mine("reign").weeks||{}) };
      weeks[per.key] = { reward:rd.reward.trim().slice(0,120), punishment:rd.punishment.trim().slice(0,120), photo:rd.photo||undefined, ts:Date.now() };
      const keep = {}; for (const k of Object.keys(weeks).sort().slice(-200)) keep[k] = weeks[k];
      if (await write("reign",{ weeks:keep })) { toast("Decree published. Abuse your power responsibly."); confetti(); S.kingOpen = false; render(); }
    }},
      h("div",{class:"label",style:"color:var(--hi-ink)"},"You're The Himmest. Make it count."),
      h("div",{class:"field"}, h("label",{class:"label",for:"k-rew",style:"color:var(--hi-ink)"},"🎁 Pick your reward"), ideaChips(REWARD_IDEAS,"reward"),
        h("input",{id:"k-rew",maxlength:"120",value:rd.reward,placeholder:"Or write your own",oninput:e=>rd.reward=e.target.value})),
      h("div",{class:"field"}, h("label",{class:"label",for:"k-pun",style:"color:var(--hi-ink)"},"⚖️ Pick the punishment"), ideaChips(PUNISH_IDEAS,"punishment"),
        h("input",{id:"k-pun",maxlength:"120",value:rd.punishment,placeholder:"Or write your own",oninput:e=>rd.punishment=e.target.value})),
      h("div",{class:"btnrow"},
        h("label",{class:"btn",for:"k-cam"},"📸 Him T-shirt selfie"),
        h("input",{id:"k-cam",class:"vh",type:"file",accept:"image/*",capture:"user",onclick:picking,onchange:onPic}),
        h("button",{class:"btn primary",type:"submit"}, law ? "Update decree" : "Publish decree"))) : null,
    !isKing && !law ? h("p",{class:"small muted"},`Waiting on ${firstNm(u)} to pick. Any day now, Your Highness.`) : null);
}

/* The Himmest as a one-line strip; tap to open the full card. The Himmest himself sees the full card until he picks. */
function kingStrip(L){
  const per = periodOf("week", D.td), { kings, law } = reignFor(per), owes = owesLine(L, per);
  const mustOpen = kings[0] === S.uid && !law;
  if (S.kingOpen || mustOpen) return h("div",{class:"stack",style:"gap:8px"}, kingCard(L),
    mustOpen ? null : h("button",{class:"linkbtn",onclick:()=>{ S.kingOpen = false; render(); }},"Hide"));
  return h("button",{class:"kingstrip",onclick:()=>{ S.kingOpen = true; render(); }},
    kings.length ? avatar(kings[0],"sm") : h("span",{"aria-hidden":"true",style:"font-size:1.3rem"},"👑"),
    h("span",{class:"ks-text"},
      h("b",null, kings.length ? `👕 ${firstNm(kings[0])} is The Himmest` : "No Himmest of the Week yet"),
      h("span",null, law ? `🎁 ${law.reward || "—"} · ⚖️ Loser: ${law.punishment || "—"}` : kings.length ? "Hasn't picked a reward or punishment yet." : "Most Him Points by Sunday takes it"),
      owes ? h("span",null, `🧾 ${owes.text}`) : null),
    h("span",{class:"ks-more","aria-hidden":"true"},"›"));
}

const CHARGE_IDEAS = ["Pushed a pull door","Said something unhinged","Got lost on campus","Microwave crime","Lost his phone while holding it"];

/* After you vote: "What did he do?" Skippable, but only charges get roasted and saved in Memories. */
function reasonCard(){
  const uid = S.reasonFor; if (!uid || !isMember(uid)) return null;
  const dn = draft.nom, err = h("div",{class:"err",hidden:true});
  const inp = h("input",{id:"n-reason",maxlength:"140",value:dn.reason,placeholder:"Tried to pay for kebab with his student ID",oninput:e=>dn.reason=e.target.value});
  const save = async reason => {
    reason = (reason || "").trim();
    if (reason.length < 3) { err.textContent = "Say what he did, or skip."; err.hidden = false; return; }
    const mineToday = D.noms.filter(n=>n.author===S.uid && n.day===D.td).length;
    if (mineToday >= NOMS_PER_DAY) { toast(`You've filed ${NOMS_PER_DAY} charges today. Calm down, prosecutor.`); S.reasonFor = null; render(); return; }
    const list = items(mine("noms"), MAX_ITEMS-1); list.push({ k:rid(), day:D.td, about:uid, reason:reason.slice(0,140), ts:Date.now() });
    if (await write("noms",{ items:list })) { draft.nom = { about:"", reason:"" }; S.reasonFor = null; toast(`Charge filed against ${firstNm(uid)}. It's on the record forever.`); render(); }
  };
  return h("div",{class:"card pink reason"},
    h("div",{style:"display:flex;align-items:center;gap:10px"}, avatar(uid), h("h3",null,`What did ${firstNm(uid)} do?`)),
    h("div",{class:"chips"}, CHARGE_IDEAS.map(c=>h("button",{type:"button",class:"chip",onclick:()=>save(c)}, c))),
    h("form",{class:"cform",onsubmit:e=>{ e.preventDefault(); save(dn.reason); }}, inp, h("button",{class:"btn primary",type:"submit"},"File it")),
    err,
    h("div",{class:"btnrow",style:"justify-content:space-between"},
      h("span",{class:"small muted"},"Charges get roasted and saved in Memories."),
      h("button",{class:"btn ghost",onclick:()=>{ S.reasonFor = null; draft.nom = { about:"", reason:"" }; render(); }},"Skip")));
}

function suspectCard(uid, t, top, myVote){
  const td = D.td, charges = D.nominated[td]?.[uid] || [], n = t[uid]||0, self = uid===S.uid, picked = myVote===uid;
  const appeal = D.appeals[td]?.[uid], verdict = D.verdicts[td]?.[uid] || { guilty:0, innocent:0 };
  const acquitted = D.acquitted(td, uid), myVerdict = mine("verdicts").days?.[td]?.[uid];
  const trial = appeal ? h("div",{class:"trialbox"},
    h("div",{class:"head",style:"margin:0"}, h("span",{class:"stamp "+(acquitted?"free":"trial")}, acquitted ? "ACQUITTED (for now)" : "ON TRIAL"), h("span",{class:"mono small"}, `${verdict.guilty} guilty · ${verdict.innocent} innocent`)),
    h("div",{class:"defense"}, `His defense: "${appeal.text}"`),
    roast(`appeal:${td}:${uid}`, "appeal", { name:firstNm(uid), text:appeal.text }, { day:td }),
    self ? h("p",{class:"small muted"},"Ties go to guilty. The court has no patience.") :
    h("div",{class:"btnrow"},
      h("button",{class:"btn"+(myVerdict==="guilty"?" pop":""),onclick:()=>verdictVote(uid,"guilty")},"🔨 Guilty"),
      h("button",{class:"btn"+(myVerdict==="innocent"?" hi":""),onclick:()=>verdictVote(uid,"innocent")},"😇 Innocent"))) : null;
  return h("div",{class:"nom"+(picked?" picked":"")},
    picked ? h("span",{class:"sticker"},"YOUR PICK") : null,
    n && n===top && !acquitted ? h("span",{class:"sticker lead"},"LEADING") : null,
    h("div",{class:"top"}, avatar(uid,"lg"),
      h("div",{style:"min-width:0"}, himBadge(uid), h("div",{class:"nm",style:"font-size:1.1rem"}, nm(uid), self ? " (you)" : ""),
        h("div",{class:"sub"}, charges.length ? `${charges.length} charge${charges.length===1?"":"s"}` : "No charges filed"), brainMeter(uid)),
      h("div",{class:"count"}, h("div",{class:"votes"}, acquitted ? "–" : n), h("div",{class:"label"}, n===1?"vote":"votes"))),
    charges.length ? h("div",{class:"charges"}, charges.map(c=>h("div",{class:"charge"}, h("q",null,c.reason), h("div",{class:"by"},`filed by ${firstNm(c.author)}`)))) : null,
    charges.length ? roast(`nom:${charges[0].key}`, "nom", { name:firstNm(uid), text:charges.map(c=>c.reason).join(" | ") }, { day:td }) : null,
    trial,
    h("div",{class:"btnrow"},
      self ? (appeal ? null : h("button",{class:"btn",onclick:()=>{ S.showAppeal = !S.showAppeal; render(); }},"🧑‍⚖️ Appeal")) :
        h("button",{class:"btn "+(picked?"hi":"primary"),disabled:acquitted||!votingOpen(),onclick:()=>vote(uid)}, picked ? "Your pick" : acquitted ? "Acquitted" : votingOpen() ? "Vote Himmest" : "🔒 Opens 5 PM"),
      self ? null : h("button",{class:"btn ghost",onclick:()=>{ S.reasonFor = uid; render(); scrollTo({top:0,behavior:"smooth"}); }},"+ Add charge")),
    self && !appeal && S.showAppeal ? appealForm() : null,
    commentsBox(`nc:${td}:${uid}`));
}
function appealForm(){
  const inp = h("input",{id:"a-def",maxlength:"200",placeholder:"I was holding the door to be polite, actually"});
  return h("form",{class:"trialbox",onsubmit:async e=>{
    e.preventDefault(); const text = inp.value.trim();
    if (text.length < 4) { toast("You need an actual defense. \"Nuh uh\" doesn't count."); return; }
    const days = { ...(mine("appeals").days||{}) }; days[D.td] = { text:text.slice(0,200), ts:Date.now() };
    const keep = {}; for (const k of Object.keys(days).sort().slice(-300)) keep[k] = days[k];
    if (await write("appeals",{ days:keep })) { S.showAppeal = false; toast("Appeal filed. The jury is laughing already."); render(); }
  }},
    h("label",{class:"label",for:"a-def"},"Your defense (one shot, make it good)"), inp,
    h("p",{class:"small muted"},"If more people vote innocent than guilty by midnight, your votes today don't count."),
    h("button",{class:"btn primary",type:"submit"},"File appeal"));
}
async function verdictVote(uid, v){
  const days = { ...(mine("verdicts").days||{}) }; days[D.td] = { ...(days[D.td]||{}), [uid]:v };
  const keep = {}; for (const k of Object.keys(days).sort().slice(-300)) keep[k] = days[k];
  if (await write("verdicts",{ days:keep })) toast(v === "guilty" ? "🔨 Guilty. Justice is served." : "😇 Innocent. Soft.");
}
async function vote(uid){
  const td = D.td;
  if (!votingOpen()) {
    S.reasonFor = uid; draft.nom = { about:uid, reason:"" };
    toast(`Voting opens at 5 PM. File a charge against ${firstNm(uid)} for now.`); render(); scrollTo({top:0,behavior:"smooth"}); return;
  }
  const days = { ...(mine("votes").days||{}) }, at = { ...(mine("votes").at||{}) };
  if (days[td] === uid && voteCounts(S.uid, td)) return;
  const first = !voteCounts(S.uid, td); days[td] = uid; at[td] = Date.now();
  const keep = {}, keepAt = {}; for (const k of Object.keys(days).sort().slice(-1000)) { keep[k] = days[k]; if (at[k]) keepAt[k] = at[k]; }
  if (await write("votes",{days:keep, at:keepAt})) {
    toast(first ? `Vote locked in for ${firstNm(uid)}. +${ALLOW_HB} HB tomorrow for voting.` : `Switched to ${firstNm(uid)}. Flip-flopper.`); confetti();
    const charged = D.noms.some(n=>n.author===S.uid && n.day===td && n.about===uid);
    if (!charged) { S.reasonFor = uid; draft.nom = { about:uid, reason:"" }; }
    render(); scrollTo({top:0,behavior:"smooth"});
  }
}
function receiptsCard(day){
  const r = D.receipts[day] || [];
  if (!r.length) return null;
  return h("details",{class:"card receipts"},
    h("summary",{style:"cursor:pointer"}, h("strong",null,`🧾 Receipts for ${fmtDay(day)}`), h("span",{class:"small muted"}," · who voted for who")),
    h("div",{style:"margin-top:8px"}, r.map(x=>h("div",{class:"r"}, avatar(x.voter,"sm"), h("b",null,firstNm(x.voter)), " voted ", avatar(x.target,"sm"), h("b",null,firstNm(x.target))))));
}
function viewToday(L){
  const td = D.td, t = D.dv[td] || {}, rawVote = mine("votes").days?.[td], myVote = rawVote && voteCounts(S.uid, td) ? rawVote : null, open = votingOpen();
  const inPlay = new Set([...Object.keys(D.nominated[td] || {}), ...Object.keys(t), ...Object.keys(D.accused[td] || {})].filter(isMember));
  const suspects = [...inPlay].sort((a,b)=>(t[b]||0)-(t[a]||0) || nm(a).localeCompare(nm(b)));
  const rest = members().filter(u=>!inPlay.has(u)).sort((a,b)=>nm(a).localeCompare(nm(b)));
  const top = Math.max(0, ...Object.values(t));
  const hero = h("div",{class:"hero"},
    h("div",{class:"head",style:"margin:0"}, h("span",{class:"label"}, fmtDay(td)),
      open ? h("span",{class:"pill live"}, `Voting open · closes in ${fmtDur(secsToMidnight())}`) : h("span",{class:"pill closed"}, `🔒 Voting opens 5 PM · in ${fmtDur(secsToOpen())}`)),
    h("h1",null,"Who was the Himmest today?"),
    open ? null : h("p",{style:"font-weight:700"}, "Voting is open 5 PM – 11:59 PM. Until then, tap a face to file a charge and build your case."),
    rawVote && !myVote ? h("p",{class:"err"}, `Your vote for ${firstNm(rawVote)} was cast before 5 PM and doesn't count. Vote again ${open ? "now" : "after 5 PM"}.`) : null,
    h("p",{class:"q"}, PROMPTS[dayIndex(td) % PROMPTS.length]),
    h("div",{class:"commentary"}, h("b",null,"ON AIR"), h("span",null, commentary())));
  const picker = rest.length ? h("div",{class:"stack",style:"gap:8px"},
    h("div",{class:"label"}, open ? (suspects.length ? "Or vote someone new" : "Tap a face to vote") : (suspects.length ? "Or charge someone new" : "Tap a face to file a charge")),
    h("div",{class:"voters"}, rest.map(u=>{
      const self = u===S.uid;
      return h("button",{class:"vcard",disabled:self,"aria-label":self?`${nm(u)} (you can't vote for yourself)`:`Vote ${nm(u)} Himmest`,onclick:()=>vote(u)},
        himBadge(u), avatar(u,"lg"), h("div",{class:"nmv"}, nm(u), self ? " (you)" : ""), self ? h("div",{class:"small muted"},"Can't vote yourself") : h("div",{class:"label"}, votingOpen() ? "Tap to vote" : "Tap to charge"));
    }))) : null;
  const how = h("details",{class:"card how"}, h("summary",null,"How it works (for the slow ones)"),
    h("ul",null,
      h("li",null,"Voting is open 5 PM – 11:59 PM. Votes before 5 PM don't count. You can switch until midnight."),
      h("li",null,"Before 5 PM, tap a face to file a charge. After 5 PM, tap a face to vote. Say what he did if you want it roasted."),
      h("li",null,"Most votes at midnight wins the day."),
      h("li",null,"Him Points: 1 per vote you get, +3 for winning a day, +2 for the day's best quote, +2 for the day's best moment."),
      h("li",null,"Most Him Points Monday to Sunday = The Himmest of the Week. Tie? Most active wins, then most votes, then a coin flip."),
      h("li",null,"The Himmest wears the Him T-shirt all next week, gets called The Himmest, and picks a reward and a punishment."),
      h("li",null,"Bet on who wins before Wednesday midnight (launch week: Saturday). Whoever loses the most Himbucks does the punishment. Didn't bet? Then it's you."),
      h("li",null,"Got votes? You can appeal once. Win the trial and your votes don't count.")));
  return h("div",{class:"stack"},
    pushCard(), kingStrip(L), reasonCard(), hero,
    suspects.length ? h("div",{class:"stack"}, h("div",{class:"head",style:"margin:0"}, h("h2",null,"Today's suspects"), h("span",{class:"small muted"}, myVote ? `You voted ${firstNm(myVote)}.` : "One vote a day.")),
      suspects.map(u=>suspectCard(u, t, top, myVote))) : null,
    members().length < 2 ? h("div",{class:"card"}, emptyBox("You're alone in here.","Send the link to the boys. You can't vote for yourself, sadly.")) : picker,
    betsSection(L), receiptsCard(addDays(td,-1)), how);
}

/* ============ MOMENTS ============ */
function viewMoments(){
  const dm = draft.moment, td = D.td;
  const err = h("div",{class:"err",hidden:true});
  const onFile = async e => {
    pickUntil = 0; const f = e.target.files && e.target.files[0]; e.target.value = ""; if (!f) return;
    toast("Shrinking photo…");
    try { dm.img = await compress(f,{max:1280,square:false,budget:300000}); render(); } catch(x){ toast(x.message); }
  };
  const composer = h("div",{class:"card loud"},
    h("h2",{style:"margin-bottom:6px"},"Snap the Himmest moment"),
    h("p",{class:"muted small",style:"margin-bottom:12px"},"Caught someone mid-himbo? Evidence or it didn't happen."),
    dm.img ? h("form",{onsubmit:async e=>{
        e.preventDefault(); err.hidden = true;
        if (!dm.about) { err.textContent = "Tap who's in the photo."; err.hidden = false; return; }
        const sb = e.submitter; if (sb) sb.disabled = true;
        let url; try { url = await uploadImg("photo", await memeify(dm.img, dm.top, dm.bottom)); } catch(x) { err.textContent = x.message; err.hidden = false; if (sb) sb.disabled = false; return; }
        const list = items(mine("photos"), MAX_ITEMS-1).filter(x=>okImg(x.img));
        list.push({ k:rid(), about:dm.about, caption:dm.caption.trim().slice(0,140), day:td, ts:Date.now(), img:url, meme:!!((dm.top||"").trim() || (dm.bottom||"").trim()) || undefined });
        const who = dm.about;
        if (await write("photos",{items:list})) { draft.moment = { img:null, about:"", caption:"", top:"", bottom:"" }; toast(`Posted. ${firstNm(who)} will never live this down.`); confetti(); render(); }
        else if (sb) sb.disabled = false;
      }},
      memePreview(dm),
      h("div",{class:"field"}, h("span",{class:"label"},"Who's the him?"), personPicker(dm.about, u=>{ dm.about=u; render(); }, "Who's in the photo", true)),
      h("div",{class:"field"}, h("label",{class:"label",for:"m-cap"},"Caption"),
        h("input",{id:"m-cap",maxlength:"140",value:dm.caption,placeholder:"pushed a pull door for two full minutes",oninput:e=>dm.caption=e.target.value})),
      err,
      h("div",{class:"btnrow"}, h("button",{class:"btn pop",type:"submit"},"Post moment"), h("button",{class:"btn",type:"button",onclick:()=>{ dm.img=null; render(); }},"Retake"))) :
    h("div",{class:"btnrow"},
      h("label",{class:"btn huge pop",for:"m-cam"},"📸 Take a photo"),
      h("label",{class:"btn huge",for:"m-lib"},"Upload"),
      h("input",{id:"m-cam",class:"vh",type:"file",accept:"image/*",capture:"environment",onclick:picking,onchange:onFile}),
      h("input",{id:"m-lib",class:"vh",type:"file",accept:"image/*",onclick:picking,onchange:onFile})),
    h("p",{class:"small muted",style:"margin-top:10px"},"Every moment is saved forever in Memories. Anyone in a photo can strike it."));
  const todays = D.photos.filter(p=>p.day===td);
  const recent = D.photos.filter(p=>p.day!==td && p.day >= addDays(td,-6));
  return h("div",{class:"stack"}, composer,
    h("div",{class:"head",style:"margin:8px 0 0"}, h("h2",null,"Today's moments"), h("span",{class:"label"}, `${todays.length} posted`)),
    todays.length ? h("div",{class:"feed"}, todays.map(momentCard)) : h("div",{class:"card"}, emptyBox("No moments yet today.","Be the first paparazzo. Your friends are not that careful.")),
    recent.length ? [h("h2",{style:"margin-top:8px"},"This week"), h("div",{class:"feed"}, recent.map(momentCard))] : null,
    h("button",{class:"btn",onclick:()=>{ S.memTab="roll"; go("memories"); }},"See every moment ever in Memories →"));
}
function reactBar(p){
  const r = D.rc[p.key] || {}, mineR = mine("reacts").map?.[p.key], self = p.about === S.uid;
  return h("div",{class:"reacts"}, Object.entries(REACTS).map(([k,[e,label]]) =>
    h("button",{class:"react","aria-pressed":String(mineR===k),disabled:self,title:self?"You can't react to yourself":label,"aria-label":`${label}: ${r[k]||0}`,onclick:()=>react(p,k)}, e, h("span",{class:"mono small"}, r[k]||0))));
}
function momentCard(p){
  const isMine = p.author===S.uid, aboutMe = p.about===S.uid;
  return h("div",{class:"moment"},
    h("button",{class:"pic",type:"button","aria-label":`Open photo of ${nm(p.about)}`,onclick:()=>lightbox(p.img, p.caption ? `${nm(p.about)}: ${p.caption}` : nm(p.about))}, h("img",{src:p.img,alt:p.caption||`Photo of ${nm(p.about)}`,loading:"lazy"})),
    h("div",{class:"byline"}, avatar(p.about,"sm"), h("strong",null,nm(p.about)), h("span",{class:"sp"}), h("span",null, p.day===D.td ? "today" : fmtDay(p.day))),
    p.caption ? h("div",{class:"cap"}, p.caption) : null,
    roast(`moment:${p.key}`, "moment", { name:firstNm(p.about), text:p.caption || "a photo" }, { day:p.day, img:imgKey(p.img) }),
    reactBar(p),
    h("div",{class:"byline"}, h("span",null,`snapped by ${firstNm(p.author)}`), h("span",{class:"sp"}),
      isMine ? h("button",{class:"btn ghost",onclick:()=>deletePhoto(p)},"Delete") : null,
      aboutMe && !isMine ? h("button",{class:"btn ghost",onclick:()=>veto(p.key,"Moment struck from the record. Coward.")},"Strike it") : null),
    commentsBox(`pc:${p.key}`));
}
async function react(p, type){
  const map = { ...(mine("reacts").map||{}) };
  if (map[p.key] === type) delete map[p.key]; else map[p.key] = type;
  const keys = Object.keys(map); if (keys.length > 1500) for (const k of keys.slice(0, keys.length-1500)) delete map[k];
  await write("reacts",{map}); render();
}
async function deletePhoto(p){ if (await write("photos",{items:items(mine("photos")).filter(x=>x.k!==p.k)})) toast("Moment deleted. The memory remains."); }

/* ============ QUOTES ============ */
function viewQuotes(){
  const dq = draft.quote, td = D.td, myQv = mine("qvotes").days?.[td];
  const err = h("div",{class:"err",hidden:true});
  const composer = h("div",{class:"card loud"},
    h("h2",{style:"margin-bottom:12px"},"Him quote of the day"),
    h("form",{onsubmit:async e=>{
      e.preventDefault(); err.hidden = true;
      const text = dq.text.trim().replace(/^["“]+|["”]+$/g,"");
      if (!dq.about) { err.textContent = "Tap who said it."; err.hidden = false; return; }
      if (text.length < 3) { err.textContent = "Too short. Even he says more than that."; err.hidden = false; return; }
      const list = items(mine("quotes"), MAX_ITEMS-1); list.push({ k:rid(), about:dq.about, text:text.slice(0,240), day:td, ts:Date.now() });
      const who = dq.about;
      if (await write("quotes",{items:list})) { draft.quote = { about:"", text:"" }; toast(`${firstNm(who)} is now on the record. Forever.`); confetti(); render(); }
    }},
      h("div",{class:"field"}, h("span",{class:"label"},"Who said it?"), personPicker(dq.about, u=>{ dq.about=u; render(); }, "Who said it")),
      h("div",{class:"field"}, h("label",{class:"label",for:"q-text"},"Word for word"),
        h("textarea",{id:"q-text",maxlength:"240",value:dq.text,placeholder:"If plants are so smart why don't they just walk to the sun",oninput:e=>dq.text=e.target.value})),
      err, h("button",{class:"btn primary",type:"submit"},"Put it on the record")));
  const todays = D.quotes.filter(q=>q.day===td).sort((a,b)=>(D.qv[b.key]||0)-(D.qv[a.key]||0) || (b.ts||0)-(a.ts||0));
  const lead = todays[0] && (D.qv[todays[0].key]||0) > 0 ? todays[0] : null;
  const spot = lead ? h("div",{class:"card pink"}, h("div",{class:"head"}, h("span",{class:"label"},"Leading for quote of the day"), h("span",{class:"pill live"},`${fmtDur(secsToMidnight())} left`)),
    h("div",{class:"bubble gold"}, `"${lead.text}"`), h("div",{class:"byline",style:"margin-top:18px"}, avatar(lead.about), h("strong",{style:"font-size:1.05rem"}, nm(lead.about)), h("span",null,`· ${D.qv[lead.key]} vote${D.qv[lead.key]===1?"":"s"}`))) : null;
  const list = h("div",{class:"card"}, h("div",{class:"head"}, h("h2",null,"Today's quotes"), h("span",{class:"small muted"}, "One vote a day")),
    todays.length ? todays.map(q=>quoteItem(q, myQv)) : emptyBox("Nobody said anything dumb yet.","Give it an hour."));
  return h("div",{class:"grid"}, h("div",{class:"stack"}, spot, list), h("div",{class:"stack"}, composer,
    h("button",{class:"btn",onclick:()=>{ S.memTab="weeks"; go("memories"); }},"Best quotes of every week →")));
}
function quoteItem(q, myQv){
  const n = D.qv[q.key]||0, picked = myQv===q.key, isMine = q.author===S.uid, aboutMe = q.about===S.uid, live = q.day === D.td;
  return h("div",{class:"qitem"}, h("div",{class:"bubble"}, `"${q.text}"`),
    h("div",{class:"byline"}, avatar(q.about,"sm"), h("strong",null,nm(q.about)), h("span",null,`logged by ${firstNm(q.author)}`), h("span",{class:"sp"}),
      h("span",{class:"mono"}, `${n} vote${n===1?"":"s"}`),
      isMine ? h("button",{class:"btn ghost",onclick:()=>deleteQuote(q)},"Delete") : null,
      aboutMe && !isMine ? h("button",{class:"btn ghost",onclick:()=>veto(q.key,"Struck from the record. We all still remember.")},"Strike it") : null,
      isMine || aboutMe || !live ? null : h("button",{class:"btn"+(picked?" hi":""),onclick:()=>voteQuote(q)}, picked ? "Your pick" : "Vote")),
    roast(`quote:${q.key}`, "quote", { name:firstNm(q.about), text:q.text }, { day:q.day }),
    commentsBox(`qc:${q.key}`));
}
async function voteQuote(q){
  const days = { ...(mine("qvotes").days||{}) }; days[D.td] = q.key;
  const keep = {}; for (const k of Object.keys(days).sort().slice(-1000)) keep[k] = days[k];
  if (await write("qvotes",{days:keep})) toast("Quote vote counted.");
}
async function deleteQuote(q){ if (await write("quotes",{items:items(mine("quotes")).filter(x=>x.k!==q.k)})) toast("Quote deleted."); }

/* ---- 4-more.js ---- */
/* ============ BETS ============ */
/* Betting lives on Today: the weekly King bet up front, month and year folded away. */
function betsSection(L){
  const avail = L.avail(S.uid);
  const myOpen = L.open.filter(b=>b.uid===S.uid);
  const hist = (L.hist[S.uid]||[]).slice().reverse().slice(0,10);
  return h("div",{class:"stack"},
    h("div",{class:"head",style:"margin:8px 0 0"}, h("h2",null,"🎲 Bet on the King"), h("span",{class:"pill"},`${avail.toLocaleString()} HB to bet`)),
    futureCard("week", L, avail),
    h("details",{class:"card how"}, h("summary",null,"More bets: Him of the Month and Him of the Year"),
      h("div",{class:"stack",style:"margin-top:12px"}, futureCard("month", L, avail), futureCard("year", L, avail))),
    h("details",{class:"card how"}, h("summary",null,`Your bets${myOpen.length ? ` (${myOpen.length} open)` : ""}`),
      h("div",{class:"stack",style:"gap:8px;margin-top:10px"},
        myOpen.length ? myOpen.map(b=>h("div",{class:"slip"}, h("span",null,`${b.amt} HB on ${firstNm(b.on)}`), h("span",null, PERIODS[b.type]))) : h("p",{class:"muted small"},"No open bets. Scared?"),
        hist.length ? [h("div",{class:"label",style:"margin-top:6px"},"Settled"), hist.map(r=>h("div",{class:"stat"},
          h("span",{class:"small"}, `${PERIODS[r.per.type]} · ${periodName(r.per)} · ${r.amt} on ${firstNm(r.on)}`),
          h("span",{class:"mono "+(r.refund?"muted":r.pay>r.amt?"won":"lost")}, r.refund?"refund":r.pay>0?`+${r.pay-r.amt}`:`−${r.amt}`)))] : null,
        h("p",{class:"small muted"},`Fake money, real consequences. Everyone who picked right splits the pot. You get ${ALLOW_HB} HB for every day you vote, and never drop below ${FLOOR_HB}.`))));
}
function futureCard(type, L, avail){
  const td = D.td, per = periodOf(type, td), bd = draft.bets[type];
  const closed = !betOpenOn(per, td);
  const open = L.open.filter(b=>b.per.key===per.key), pool = open.reduce((a,b)=>a+b.amt,0);
  const on = {}; for (const b of open) on[b.on] = (on[b.on]||0) + b.amt;
  const st = standings(per.start, per.end).slice(0,5);
  const err = h("div",{class:"err",hidden:true});
  const amt = h("input",{id:`b-${type}`,type:"number",min:"1",step:"1",inputmode:"numeric",placeholder:"HB",value:bd.amt,oninput:e=>bd.amt=e.target.value});
  return h("div",{class:"card loud"},
    h("div",{class:"label"}, periodName(per)),
    h("h2",{style:"margin:4px 0 8px"}, PERIODS[type]),
    h("div",{class:"btnrow",style:"gap:6px;margin-bottom:10px"},
      h("span",{class:"pill "+(closed?"closed":"live")}, closed ? (type==="week" ? "Closed for this week" : "Betting closed") : `Closes in ${fmtDur(betCloseSecs(per, td))}`),
      h("span",{class:"pill"}, `Pool ${pool.toLocaleString()} HB`)),
    st.some(s=>s.pts>0) ? st.map((s,i)=>h("div",{class:"row"},
      h("div",{class:"rank"+(i===0?" gold":"")}, i+1), avatar(s.uid,"sm"),
      h("div",{style:"min-width:0"}, h("div",{class:"nm"}, nm(s.uid)), h("div",{class:"sub"}, whyText(s.br)), on[s.uid] ? h("div",{class:"sub"}, `${on[s.uid]} HB on him · pays ~${(pool/on[s.uid]).toFixed(1)}×`) : null),
      h("div",{class:"pts"}, `${s.pts} pts`))) : h("p",{class:"muted small"},"No points yet. Pure speculation. The best kind."),
    closed ? null : h("form",{style:"margin-top:12px",onsubmit:async e=>{
      e.preventDefault(); err.hidden = true;
      const a = Math.floor(+bd.amt);
      if (!betOpenOn(per, today())) { err.textContent = "Betting just closed."; err.hidden = false; return; }
      if (!bd.on) { err.textContent = "Pick who you're backing."; err.hidden = false; return; }
      if (!(a >= 1)) { err.textContent = "Bet at least 1 HB, cheapskate."; err.hidden = false; return; }
      if (a > avail) { err.textContent = `You only have ${avail} HB. Broke behavior.`; err.hidden = false; return; }
      const list = items(mine("bets"), MAX_ITEMS-1).filter(x=>x && x.type); list.push({ k:rid(), type, day:td, on:bd.on, amt:a, ts:Date.now() });
      const who = bd.on;
      if (await write("bets",{items:list})) { draft.bets[type] = { on:"", amt:"" }; toast(`${a} HB on ${firstNm(who)}. Bold.`); confetti(); render(); }
    }},
      h("div",{class:"field"}, h("label",{class:"label",for:`bo-${type}`},"Back a him"),
        h("select",{id:`bo-${type}`,onchange:e=>bd.on=e.target.value}, h("option",{value:""},"Choose…"),
          members().sort((a,b)=>nm(a).localeCompare(nm(b))).map(u=>h("option",{value:u,selected:bd.on===u}, u===S.uid ? `${nm(u)} (yourself, brave)` : nm(u))))),
      h("div",{class:"field"}, h("label",{class:"label",for:`b-${type}`},"Stake"), amt),
      h("div",{class:"chips"}, [25,100,250].map(v=>h("button",{type:"button",class:"chip",onclick:()=>{ bd.amt = String(Math.min(v,avail)); amt.value = bd.amt; }}, v)),
        h("button",{type:"button",class:"chip",onclick:()=>{ bd.amt = String(avail); amt.value = bd.amt; }},"All in")),
      err, h("button",{class:"btn primary",type:"submit",disabled:avail<1},"Place bet")));
}

/* ============ MEMORIES ============ */
function viewMemories(L){
  const tabs = [["roll","Camera roll"],["weeks","Weeks"],["seasons","Seasons"],["ranks","Rankings"]];
  const seg = h("div",{class:"seg",role:"group","aria-label":"Memories"}, tabs.map(([k,l])=>h("button",{"aria-pressed":String(S.memTab===k),onclick:()=>{ S.memTab=k; render(); }}, l)));
  const body = { roll:memRoll, weeks:()=>memWeeks(L), seasons:memSeasons, ranks:memRanks }[S.memTab] || memRoll;
  return h("div",{class:"stack"}, seg, body());
}
function memRoll(){
  if (!D.photos.length) return h("div",{class:"card"}, emptyBox("The camera roll is empty.","Every moment you post lands here forever. Go embarrass someone."));
  const byMonth = {};
  for (const p of D.photos) (byMonth[p.day.slice(0,7)] ||= []).push(p);
  const td = D.td, onThisDay = D.photos.filter(p=>p.day !== td && p.day.slice(5) === td.slice(5));
  return h("div",{class:"stack"},
    onThisDay.length ? h("div",{class:"card pink month"}, h("h3",null,"📅 On this day"), h("div",{class:"thumbs"}, onThisDay.map(thumb))) : null,
    Object.keys(byMonth).sort().reverse().map(m=>h("div",{class:"card month"},
      h("div",{class:"head",style:"margin:0"}, h("h3",null, fmtMonth(m+"-01")), h("span",{class:"label"},`${byMonth[m].length} moments`)),
      h("div",{class:"thumbs"}, byMonth[m].map(thumb)))));
}
function thumb(p){
  return h("button",{type:"button","aria-label":`${nm(p.about)} on ${fmtDay(p.day)}`,onclick:()=>lightbox(p.img, `${nm(p.about)} · ${fmtDay(p.day)}${p.caption ? " · " + p.caption : ""}`)},
    h("img",{src:p.img,alt:p.caption||`Photo of ${nm(p.about)}`,loading:"lazy"}));
}
function weekRecap(per, L){
  const inWeek = d => d >= per.start && d <= per.end, done = per.end < D.td;
  const st = standings(per.start, per.end), winners = winnersOfPeriod(per);
  const q = D.quotes.filter(x=>inWeek(x.day)).sort((a,b)=>(D.qv[b.key]||0)-(D.qv[a.key]||0))[0];
  const p = D.photos.filter(x=>inWeek(x.day)).sort((a,b)=>(D.rc[b.key]?.total||0)-(D.rc[a.key]?.total||0))[0];
  const nomCount = {}; for (const n of D.noms) if (inWeek(n.day)) nomCount[n.about] = (nomCount[n.about]||0) + 1;
  const mostNom = Object.keys(nomCount).sort((a,b)=>nomCount[b]-nomCount[a])[0];
  let acq = 0; for (const [d, m] of Object.entries(D.appeals)) if (inWeek(d)) for (const u of Object.keys(m)) if (D.acquitted(d,u)) acq++;
  const law = reignFor(per).law, broke = done ? L.brokest(per) : null, win = winnerOf(per);
  const row = (ic, label, val) => h("div",{class:"rrow"}, h("div",{class:"ic","aria-hidden":"true"}, ic), h("div",{style:"min-width:0"}, h("div",{class:"label"},label), val));
  const empty = !st.some(s=>s.pts) && !q && !p && !mostNom;
  return h("div",{class:"card "+(done?"loud":"")+" recap"},
    h("div",{class:"head",style:"margin:0"}, h("h3",null, periodName(per)), h("span",{class:"pill "+(done?"":"live")}, done ? "Final" : "In progress")),
    empty ? h("p",{class:"muted small"},"Nothing happened this week. Suspicious.") : [
      row("👑", done ? "The Himmest of the Week" : "Leading", winners.length ? h("strong",null, `${winners.map(nm).join(" & ")} · ${st.find(x=>x.uid===winners[0]).pts} pts`) : h("span",{class:"muted"},"Nobody yet")),
      win && win.how !== "points" ? row("🪙", "Tiebreak", h("span",null, HOW[win.how])) : null,
      law?.reward ? row("🎁", "Reward of the reigning Himmest", h("span",null, law.reward)) : null,
      law?.punishment ? row("⚖️", "Punishment", h("span",null, broke ? `${nm(broke.uid)} has to: ${law.punishment} (${broke.why})` : law.punishment)) : null,
      broke ? row("💸", "Brokest of the Week", h("span",null, `${nm(broke.uid)} · ${broke.why}`)) : null,
      mostNom ? row("⚖️", "Most charged", h("span",null, `${nm(mostNom)} · ${nomCount[mostNom]} charge${nomCount[mostNom]===1?"":"s"}`)) : null,
      q ? row("🗣️", "Quote of the week", h("span",null, h("strong",null,`"${q.text}"`), ` — ${firstNm(q.about)}`)) : null,
      p ? row("📸", "Moment of the week", h("button",{class:"linkbtn",onclick:()=>lightbox(p.img, `${nm(p.about)}: ${p.caption}`)}, `${firstNm(p.about)}: ${p.caption || "view photo"}`)) : null,
      acq ? row("😇", "Got away with it", h("span",null, `${acq} acquittal${acq===1?"":"s"}`)) : null,
      done && winners.length ? roast(`week:${per.key}`, "week", { name:firstNm(winners[0]), text:[q && q.text, mostNom && `${firstNm(mostNom)} was charged ${nomCount[mostNom]} times`].filter(Boolean).join(" | ") }, { day:per.end >= addDays(D.td,-8) ? D.td : per.end }) : null,
      done && winners.length ? h("button",{class:"btn",onclick:()=>shareStory({ title:"Him of the Week", when:periodName(per), uid:winners[0], names:winners.map(nm).join(" & "), line: q ? `"${q.text}"` : "" })},"📲 Share to Story") : null]);
}
function memWeeks(L){
  const cur = periodOf("week", D.td);
  return h("div",{class:"stack"}, h("p",{class:"small muted"},"The Sunday recap. Every week saved, so you can relive it when you're 40 and boring."),
    weekRecap(cur, L), pastPeriods("week").map(per=>weekRecap(per, L)));
}
function memSeasons(){
  const cur = periodOf("season", D.td), st = standings(cur.start, cur.end).slice(0,10);
  const past = pastWinners("season");
  return h("div",{class:"stack"},
    h("div",{class:"card loud"}, h("div",{class:"head"}, h("h2",null, cur.name), h("span",{class:"pill live"},`Ends ${fmtDay(cur.end)}`)),
      h("p",{class:"small muted",style:"margin-bottom:8px"},"Seasons: Spring (Jan–May), Summer (Jun–Jul), Fall (Aug–Dec). Most Him Points wins the season."),
      st.some(s=>s.pts) ? st.map((s,i)=>h("div",{class:"row"}, h("div",{class:"rank"+(i===0?" gold":"")}, i+1), avatar(s.uid),
        h("div",{style:"min-width:0"}, h("div",{class:"nm"}, nm(s.uid)), h("div",{class:"sub"}, titleFor(trophies(s.uid).day))), h("div",{class:"pts"},`${s.pts} pts`))) :
        emptyBox("Season just started.","Everyone's at zero. Equally dumb, for now.")),
    h("div",{class:"card pink"}, h("h3",{style:"margin-bottom:8px"},"🏆 Season champions"),
      past.length ? past.map(x=>h("div",{class:"stat"}, h("span",null, x.per.name), h("strong",null, x.winners.map(nm).join(" & ")))) : h("p",{class:"muted small"},"No season finished yet. History is being written. Badly.")));
}
function memRanks(){
  const td = D.td, rt = S.rankTab;
  const per = rt === "day" ? { start:td, end:td } : periodOf(rt, td);
  const st = standings(per.start, per.end);
  const seg = h("div",{class:"seg",role:"group","aria-label":"Time range"}, [["day","Today"],["week","Week"],["month","Month"],["year","Year"]].map(([k,l])=>
    h("button",{"aria-pressed":String(rt===k),onclick:()=>{ S.rankTab=k; render(); }}, l)));
  const board = h("div",{class:"card loud"}, seg,
    h("div",{class:"head"}, h("h2",null, rt==="day" ? "Today's standings" : `${PERIODS[rt]} race`), h("span",{class:"label"}, rt==="day" ? fmtDay(td) : periodName(per))),
    st.map((s,i)=>h("div",{class:"row"},
      h("div",{class:"rank"+(i===0&&s.pts?" gold":"")}, s.pts ? i+1 : "–"), avatar(s.uid),
      h("div",{style:"min-width:0"}, h("div",{class:"nm"}, nm(s.uid), s.uid===S.uid ? h("span",{class:"sub"}," (you)") : null), h("div",{class:"sub"}, whyText(s.br))),
      h("div",{class:"pts"}, `${s.pts} pts`))));
  const cabinet = h("div",{class:"card pink"}, h("h3",{style:"margin-bottom:8px"},"Trophy cabinet"),
    ["year","month","week"].map(type => {
      const w = pastWinners(type).slice(0, type==="week"?8:4);
      return h("div",{style:"margin-bottom:10px"}, h("div",{class:"label"}, PERIODS[type]),
        w.length ? w.map(x=>h("div",{class:"stat"}, h("span",{class:"small"}, periodName(x.per)), h("strong",{class:"small"}, x.winners.map(nm).join(" & ")))) : h("p",{class:"muted small"},"Not awarded yet."));
    }));
  const points = h("div",{class:"card"}, h("h3",{style:"margin-bottom:6px"},"How Him Points work"),
    [[`+${PTS_VOTE}`,"each vote you get"],[`+${PTS_DAY}`,"winning the day"],[`+${PTS_QUOTE}`,"the day's best quote is yours"],[`+${PTS_MOMENT}`,"the day's best moment is of you"]].map(([a,b])=>h("div",{class:"stat"}, h("span",null,b), h("span",{class:"mono"},a))));
  return h("div",{class:"grid"}, h("div",{class:"stack"}, board, points), h("div",{class:"stack"}, cabinet));
}

/* ============ PROFILE ============ */
function profileForm(existing){
  const p = existing || {};
  const err = h("div",{class:"err",hidden:true});
  let photo = okImg(p.photo) ? p.photo : null;
  const pv = h("div",{class:"av xl","aria-hidden":"true",style:"background:var(--line);color:var(--muted)"}, photo ? h("img",{src:photo,alt:""}) : "?");
  const rm = h("button",{type:"button",class:"btn ghost",hidden:!photo,onclick:()=>{ photo=null; pv.replaceChildren("?"); rm.hidden=true; }},"Remove");
  const onPic = async e => {
    pickUntil = 0; const f = e.target.files && e.target.files[0]; e.target.value = ""; if (!f) return; err.hidden = true;
    try { photo = await compress(f,{max:360,square:true,budget:60000}); pv.replaceChildren(h("img",{src:photo,alt:""})); rm.hidden=false; }
    catch(x){ err.textContent = x.message; err.hidden = false; }
  };
  const first = h("input",{id:"p-first",value:p.first||"",placeholder:"First name",autocomplete:"given-name",maxlength:"30"});
  const last = h("input",{id:"p-last",value:p.last||"",placeholder:"Last name",autocomplete:"family-name",maxlength:"30"});
  const nick = h("input",{id:"p-nick",value:p.nick||"",placeholder:"The Protein Prophet",maxlength:"40"});
  const arch = h("select",{id:"p-arch"}, ARCHETYPES.map(a=>h("option",{value:a,selected:a===p.archetype},a)));
  if (!existing) { const parts = (S.email||"").split("@")[0].split(/[._-]+/).filter(Boolean); if (parts.length >= 2) { first.value = cap1(parts[0]); last.value = cap1(parts[parts.length-1]); } }
  return h("form",{onsubmit:async e=>{
    e.preventDefault(); err.hidden = true;
    const f = first.value.trim(), l = last.value.trim();
    if (!f) { err.textContent = "Add at least your first name."; err.hidden = false; return; }
    const body = { first:cap1(f).slice(0,30), last:cap1(l).slice(0,30), nick:nick.value.trim().slice(0,40), archetype:arch.value, joined:p.joined||today() };
    if (photo && photo.startsWith("data:")) { try { photo = await uploadImg("avatar", photo); } catch(x) { err.textContent = x.message; err.hidden = false; return; } }
    if (photo) body.photo = photo;
    if (await write("profiles", body)) { toast(existing ? "Profile saved." : `Welcome to the arena, ${body.first}. It's all downhill from here.`); if (!existing) { confetti(); S.tab = "today"; } render(); }
  }},
    h("div",{style:"display:flex;align-items:center;gap:14px;flex-wrap:wrap"}, pv,
      h("div",{class:"btnrow",style:"gap:8px"},
        h("label",{class:"btn pop",for:"p-cam"},"📸 Selfie"), h("label",{class:"btn",for:"p-lib"},"Upload"), rm,
        h("input",{id:"p-cam",class:"vh",type:"file",accept:"image/*",capture:"user",onclick:picking,onchange:onPic}),
        h("input",{id:"p-lib",class:"vh",type:"file",accept:"image/*",onclick:picking,onchange:onPic}))),
    h("div",{class:"two"}, h("div",{class:"field"}, h("label",{class:"label",for:"p-first"},"First name"), first), h("div",{class:"field"}, h("label",{class:"label",for:"p-last"},"Last name"), last)),
    h("div",{class:"field"}, h("label",{class:"label",for:"p-nick"},"Him name (optional)"), nick),
    h("div",{class:"field"}, h("label",{class:"label",for:"p-arch"},"Himbo archetype"), arch),
    err, h("button",{class:"btn primary",type:"submit"}, existing ? "Save profile" : "Enter the arena"));
}
function viewMe(L){
  const p = S.profiles[S.uid], tr = trophies(S.uid), wk = periodOf("week", D.td);
  const myWeek = standings(wk.start, wk.end).find(s=>s.uid===S.uid)?.pts || 0;
  const card = h("div",{class:"card loud"},
    h("div",{style:"display:flex;align-items:center;gap:14px"}, avatar(S.uid,"xl"),
      h("div",{style:"min-width:0"}, himBadge(S.uid), h("h2",null, nm(S.uid)), p.nick ? h("div",{style:"font-weight:700"}, `"${p.nick}"`) : null, h("div",{class:"sub"}, p.archetype))),
    h("div",{style:"margin-block:14px"}, brainMeter(S.uid)),
    h("div",{class:"trophies"}, [["day","Days"],["week","Weeks"],["month","Months"],["year","Years"]].map(([k,l])=>h("div",null, h("div",{class:"big"}, tr[k]), h("div",{class:"label"}, l)))),
    h("div",{style:"margin-top:12px"},
      h("div",{class:"stat"}, h("span",null,"Title"), h("strong",null, titleFor(tr.day))),
      h("div",{class:"stat"}, h("span",null,"Him Points this week"), h("span",{class:"mono"}, myWeek)),
      h("div",{class:"stat"}, h("span",null,"Times charged"), h("span",{class:"mono"}, D.noms.filter(n=>n.about===S.uid).length)),
      h("div",{class:"stat"}, h("span",null,"Times quoted"), h("span",{class:"mono"}, D.quotes.filter(q=>q.about===S.uid).length)),
      h("div",{class:"stat"}, h("span",null,"Moments of you"), h("span",{class:"mono"}, D.photos.filter(x=>x.about===S.uid).length)),
      h("div",{class:"stat"}, h("span",null,"Himbucks"), h("span",{class:"mono"}, (L.bal[S.uid]||0).toLocaleString())),
      h("div",{class:"stat"}, h("span",null,"Member since"), h("span",{class:"mono"}, fmtDay(p.joined||D.td)))));
  const notif = h("div",{class:"card"}, h("h3",{style:"margin-bottom:8px"},"Notifications"),
    S.push === "on" ? h("div",{class:"btnrow"}, h("span",{class:"pill live"},"On"), h("button",{class:"btn ghost",onclick:disablePush},"Turn off")) :
    S.push === "off" ? h("button",{class:"btn primary",onclick:enablePush},"Turn on notifications") :
    S.push === "install" ? h("p",{class:"small"},"Add the Himmest to your Home Screen first (Safari → Share → Add to Home Screen), then open it from there.") :
    S.push === "denied" ? h("p",{class:"small"},"You blocked notifications. Turn them back on in your phone's Settings for this app.") :
    h("p",{class:"small muted"},"This browser can't do notifications."));
  const account = h("div",{class:"card"}, h("h3",{style:"margin-bottom:8px"},"Account"),
    h("div",{class:"stat"}, h("span",null,"Logged in as"), h("span",{class:"mono small",style:"overflow-wrap:anywhere"}, S.email)),
    h("div",{class:"btnrow",style:"margin-top:10px"}, h("button",{class:"btn",onclick:logout},"Log out")));
  return h("div",{class:"grid"}, h("div",{class:"stack"}, card, notif, account), h("div",{class:"stack"}, h("div",{class:"card"}, h("h2",{style:"margin-bottom:12px"},"Edit profile"), profileForm(p))));
}

/* ============ auth ============ */
function viewAuth(){
  let mode = "signup";
  const err = h("div",{class:"err",hidden:true});
  const email = h("input",{id:"a-email",type:"email",placeholder:"you@example.com",autocomplete:"email",inputmode:"email",autocapitalize:"off"});
  const pw = h("input",{id:"a-pw",type:"password",placeholder:"At least 6 characters",autocomplete:"new-password"});
  const btn = h("button",{class:"btn primary huge",type:"submit"},"Join the arena");
  const tabs = h("div",{class:"authtabs",role:"group","aria-label":"Sign up or log in"});
  const setMode = m => {
    mode = m;
    tabs.replaceChildren(
      h("button",{type:"button","aria-pressed":String(m==="signup"),onclick:()=>setMode("signup")},"Sign up"),
      h("button",{type:"button","aria-pressed":String(m==="login"),onclick:()=>setMode("login")},"Log in"));
    btn.textContent = m === "signup" ? "Join the arena" : "Log in";
    pw.setAttribute("autocomplete", m === "signup" ? "new-password" : "current-password");
    err.hidden = true;
  };
  setMode("signup");
  return h("div",{class:"gate stack"}, pushCard(), h("div",{class:"card loud"},
    h("h2",{style:"margin-bottom:6px"},"Who's the Himmest?"),
    h("p",{class:"muted",style:"margin-bottom:14px"},"Nominate your friends for the dumbest thing they did today, vote, roast, and crown a King every week. Any email works."),
    tabs,
    h("form",{onsubmit:async e=>{
      e.preventDefault(); err.hidden = true; btn.disabled = true;
      try {
        await api("/api/auth",{ method:"POST", body:JSON.stringify({ action:mode, email:email.value, password:pw.value }) });
        const wasSignup = mode === "signup";
        await load(true);
        if (wasSignup) confetti();
      } catch(x) { err.textContent = x.message; err.hidden = false; }
      btn.disabled = false;
    }},
      h("div",{class:"field"}, h("label",{class:"label",for:"a-email"},"Email"), email),
      h("div",{class:"field"}, h("label",{class:"label",for:"a-pw"},"Password"), pw),
      err, btn)));
}
async function logout(){
  await disablePush();
  try { await api("/api/logout",{ method:"POST" }); } catch {}
  authed = false; S.uid = null; S.email = ""; V = ""; S.loaded = new Set(); render();
}

/* ============ render + boot ============ */
function render(){
  const main = document.getElementById("main");
  if (!(authed && S.tab === "reels")) document.body.classList.remove("reels-mode");
  if (authed === false) {
    document.getElementById("tabs").hidden = true; document.getElementById("who").replaceChildren();
    D = { td:today(), quotes:[], photos:[], noms:[], dv:{} }; renderTicker();
    main.replaceChildren(viewAuth()); return;
  }
  if (authed === null || COLS.some(c=>!S.loaded.has(c))) {
    document.getElementById("tabs").hidden = true;
    main.replaceChildren(loadErr ?
      h("div",{class:"card loud gate"}, h("h2",{style:"margin-bottom:8px"},"Can't reach the arena"), h("p",{class:"muted",style:"margin-bottom:12px"}, loadErr), h("button",{class:"btn primary",onclick:()=>load(true)},"Try again")) :
      h("div",{class:"card empty"}, h("strong",null,"Warming up the jumbotron…"),"Loading today's chaos."));
    return;
  }
  D = derive(); const L = ledger();
  renderTicker(); renderTabs(); renderWho(L);
  let v;
  if (!isMember(S.uid)) v = h("div",{class:"gate stack"}, pushCard(), h("div",{class:"card loud"},
      h("h2",{style:"margin-bottom:6px"},"Make your profile"),
      h("p",{class:"muted",style:"margin-bottom:14px"},"Name and a selfie, so your friends know who to roast."),
      profileForm(null)));
  else v = ({ today:viewToday, moments:viewMoments, reels:viewReels, quotes:viewQuotes, memories:viewMemories, me:viewMe }[S.tab] || viewToday)(L);
  /* Keep your place in Reels when new data arrives. */
  const oldReels = document.getElementById("reels"), reelTop = oldReels ? oldReels.scrollTop : 0;
  document.body.classList.toggle("reels-mode", S.tab === "reels" && isMember(S.uid));
  main.replaceChildren(v);
  const newReels = document.getElementById("reels"); if (newReels && reelTop) newReels.scrollTop = reelTop;
  if (isMember(S.uid)) maybeCeremony();
}
function typing(){ const a = document.activeElement; return a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.type !== "file" && document.getElementById("main").contains(a); }
let deferred = false, pickUntil = 0, pickT, loadErr = "", loading = false;
function picking(){ pickUntil = Date.now() + 120000; }
function scheduleRender(){
  if (Date.now() < pickUntil) { clearTimeout(pickT); pickT = setTimeout(scheduleRender, 3000); return; }
  if (typing()) { if (!deferred) { deferred = true; document.activeElement.addEventListener("blur", ()=>{ deferred = false; setTimeout(render,0); }, { once:true }); } return; }
  render();
}
async function load(force){
  if (loading && !force) return;
  loading = true;
  try {
    const j = await api(`/api/state?v=${force ? "" : encodeURIComponent(V)}`);
    loadErr = ""; const was = authed; authed = true; S.uid = j.me.id; S.email = j.me.email;
    if (!j.same) { V = j.v; for (const c of COLS) S[c] = j.cols[c] || {}; COLS.forEach(c=>S.loaded.add(c)); scheduleRender(); }
    else if (was !== true) scheduleRender();
  } catch(e) {
    if (e.status === 401) { if (authed !== false) { authed = false; render(); } }
    else if (authed !== true) { loadErr = e.message; render(); }
  } finally { loading = false; }
}
function start(){
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").then(()=>checkPush().then(render)).catch(()=>{ S.push = "unsupported"; });
  else S.push = "unsupported";
  render(); load(true);
  setInterval(() => { if (authed && document.visibilityState === "visible") load(false); }, 8000);
  setInterval(() => { if (authed && Date.now() >= pickUntil && !typing() && !document.querySelector(".lightbox,.ceremony")) render(); }, 30000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && authed) load(false); });
}
start();

/* ---- 5-reels.js ---- */
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
  const who = (uid, sub) => h("div",{class:"rwho"}, avatar(uid,"sm"), h("b",null, nm(uid)), sub ? h("span",null, sub) : null);
  if (it.type === "moment") {
    const p = it.p;
    return h("section",{class:"reel"},
      h("img",{class:"bg",src:p.img,alt:p.caption||`Photo of ${nm(p.about)}`,loading:"lazy"}), h("div",{class:"shade"}),
      h("div",{class:"info"}, h("span",{class:"rtag"},"📸 MOMENT"), who(p.about, fmtDay(p.day)),
        p.caption ? h("p",{class:"rcap"}, p.caption) : null,
        roast(`moment:${p.key}`, "moment", { name:firstNm(p.about) }), reactBar(p),
        h("span",{class:"rsmall"}, `snapped by ${firstNm(p.author)}${(D.comments[`pc:${p.key}`]||[]).length ? ` · 💬 ${(D.comments[`pc:${p.key}`]).length}` : ""}`)));
  }
  const bg = `background:${REEL_COLORS[coin(it.key) % REEL_COLORS.length]}`;
  if (it.type === "quote") {
    const q = it.q;
    return h("section",{class:"reel",style:bg},
      h("div",{class:"bigq"}, `"${q.text}"`),
      h("div",{class:"info"}, h("span",{class:"rtag"},"🗣️ QUOTE"), who(q.about, fmtDay(q.day)), roast(`quote:${q.key}`, "quote", { name:firstNm(q.about) }),
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

})();
