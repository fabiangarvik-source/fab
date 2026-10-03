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
      h("span",{class:"pill "+(closed?"closed":"live")}, closed ? (type==="week" ? "Closed Wednesday" : "Betting closed") : `Closes in ${fmtDur(betCloseSecs(per, td))}`),
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
  const law = reignFor(per).law, broke = done ? L.brokest(per.key) : null;
  const row = (ic, label, val) => h("div",{class:"rrow"}, h("div",{class:"ic","aria-hidden":"true"}, ic), h("div",{style:"min-width:0"}, h("div",{class:"label"},label), val));
  const empty = !st.some(s=>s.pts) && !q && !p && !mostNom;
  return h("div",{class:"card "+(done?"loud":"")+" recap"},
    h("div",{class:"head",style:"margin:0"}, h("h3",null, periodName(per)), h("span",{class:"pill "+(done?"":"live")}, done ? "Final" : "In progress")),
    empty ? h("p",{class:"muted small"},"Nothing happened this week. Suspicious.") : [
      row("👑", done ? "Him of the Week" : "Leading", winners.length ? h("strong",null, `${winners.map(nm).join(" & ")} · ${st[0].pts} pts`) : h("span",{class:"muted"},"Nobody yet")),
      law?.rule ? row("📜", "The King's rule", h("span",null, law.rule)) : null,
      law?.punishment ? row("⚖️", "Punishment", h("span",null, broke ? `${nm(broke.uid)} has to: ${law.punishment}` : law.punishment)) : null,
      broke ? row("💸", "Brokest of the Week", h("span",null, `${nm(broke.uid)} · lost ${broke.lost} HB`)) : null,
      mostNom ? row("⚖️", "Most charged", h("span",null, `${nm(mostNom)} · ${nomCount[mostNom]} charges`)) : null,
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
      h("div",{style:"min-width:0"}, h("h2",null, nm(S.uid)), p.nick ? h("div",{style:"font-weight:700"}, `"${p.nick}"`) : null, h("div",{class:"sub"}, p.archetype))),
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
  else v = ({ today:viewToday, moments:viewMoments, quotes:viewQuotes, memories:viewMemories, me:viewMe }[S.tab] || viewToday)(L);
  main.replaceChildren(v);
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
    if (!j.same) { V = j.v; for (const c of COLS) S[c] = j.cols[c] || {}; S.roasts = { ...S.roasts, ...(j.roasts||{}) }; COLS.forEach(c=>S.loaded.add(c)); scheduleRender(); }
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
