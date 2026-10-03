/* ============ TODAY ============ */
function commentary(){
  const t = D.dv[D.td] || {}, ids = Object.keys(t).sort((a,b)=>t[b]-t[a]);
  const charged = Object.keys(D.nominated[D.td] || {}).length;
  if (!charged) return "Zero nominations. Either you all got smarter overnight, or you're cowards. It's the second one.";
  if (!ids.length) return `${charged} ${charged===1?"suspect":"suspects"} charged and nobody has voted. Do your civic duty.`;
  const [a, b] = ids;
  if (b && t[a] === t[b]) return `Dead heat between ${firstNm(a)} and ${firstNm(b)}. Nobody has thought this hard all semester.`;
  return pick([
    `${firstNm(a)} leads with ${t[a]}. Analysts are calling it "deeply earned."`,
    `${firstNm(a)} is out front with ${t[a]}. His brain cells have filed a missing persons report.`,
    `${firstNm(a)} has ${t[a]} and the momentum of a golden retriever chasing a tennis ball.`,
    `Breaking: ${firstNm(a)} surges to ${t[a]}. Experts baffled. ${firstNm(a)} also baffled.`
  ], D.td + t[a]);
}

function kingCard(L){
  const per = periodOf("week", D.td), { kings, law } = reignFor(per);
  const lastWeek = periodOf("week", addDays(per.start, -1));
  const lastLaw = reignFor(lastWeek).law, broke = L.brokest(lastWeek.key);
  const payUp = lastLaw?.punishment && broke ? h("div",{class:"law"}, h("div",{class:"label"},"🧾 Pay up from last week"),
    h("p",null, `${nm(broke.uid)} lost ${broke.lost} HB and has to: ${lastLaw.punishment}`)) : null;
  if (!kings.length) return h("div",{class:"king"},
    h("div",{class:"label",style:"color:var(--hi-ink)"},"👑 King of the Week"),
    h("h2",null,"The throne is empty"),
    h("p",{style:"font-weight:700"},"Win the week and you get the crown. The King makes one rule for the week and picks the punishment."),
    payUp);
  const isKing = kings.includes(S.uid), names = kings.map(nm).join(" & ");
  const rule = h("input",{id:"k-rule",maxlength:"120",value:law?.by===S.uid?law.rule||"":"",placeholder:"Everyone has to call me Your Majesty"});
  const pun = h("input",{id:"k-pun",maxlength:"120",value:law?.by===S.uid?law.punishment||"":"",placeholder:"Buys the whole group kebab"});
  let crownPic = law?.by===S.uid && okImg(law.photo) ? law.photo : null;
  const onPic = async e => {
    pickUntil = 0; const f = e.target.files && e.target.files[0]; e.target.value = ""; if (!f) return;
    try { toast("Uploading your royal portrait…"); crownPic = await uploadImg("photo", await compress(f,{max:1080,square:false,budget:300000})); toast("Looking regal. Now save it."); }
    catch(x){ toast(x.message); }
  };
  return h("div",{class:"king"},
    h("div",{class:"label",style:"color:var(--hi-ink)"},`👑 King of the Week · ${periodName(per)}`),
    h("div",{style:"display:flex;align-items:center;gap:12px"}, avatar(kings[0],"lg"), h("h2",null, names)),
    law?.photo && okImg(law.photo) ? h("img",{src:law.photo,alt:"The King with his crown",style:"width:100%;max-height:280px;object-fit:cover;border-radius:10px;border:2px solid var(--hi-ink);cursor:zoom-in",onclick:()=>lightbox(law.photo,`${names} wearing the crown`)}) : null,
    h("div",{class:"law"}, h("div",{class:"label"},"📜 Rule of the week"), h("p",null, law?.rule || "The King hasn't made a rule yet. Weak leadership.")),
    h("div",{class:"law"}, h("div",{class:"label"},"⚖️ Punishment"), h("p",null, law?.punishment || "No punishment picked yet."),
      h("div",{class:"small",style:"margin-top:4px"},"Goes to whoever loses the most Himbucks betting this week.")),
    payUp,
    isKing ? h("form",{onsubmit:async e=>{
      e.preventDefault();
      const weeks = { ...(mine("reign").weeks||{}) };
      weeks[per.key] = { rule:rule.value.trim().slice(0,120), punishment:pun.value.trim().slice(0,120), photo:crownPic||undefined, ts:Date.now() };
      const keep = {}; for (const k of Object.keys(weeks).sort().slice(-200)) keep[k] = weeks[k];
      if (await write("reign",{ weeks:keep })) { toast("Royal decree published. Abuse your power responsibly."); confetti(); render(); }
    }},
      h("div",{class:"label",style:"color:var(--hi-ink)"},"You're the King. Make it count."),
      h("div",{class:"field"}, h("label",{class:"label",for:"k-rule",style:"color:var(--hi-ink)"},"Your rule"), rule),
      h("div",{class:"field"}, h("label",{class:"label",for:"k-pun",style:"color:var(--hi-ink)"},"Your punishment"), pun),
      h("div",{class:"btnrow"},
        h("label",{class:"btn",for:"k-cam"},"📸 Crown selfie"),
        h("input",{id:"k-cam",class:"vh",type:"file",accept:"image/*",capture:"user",onclick:picking,onchange:onPic}),
        h("button",{class:"btn primary",type:"submit"},"Publish decree"))) : null,
    !isKing && !law ? h("p",{class:"small muted"},`Waiting on ${firstNm(kings[0])} to decree something. Any day now, Your Majesty.`) : null);
}

function nominateCard(){
  const dn = draft.nom, td = D.td;
  const mineToday = D.noms.filter(n=>n.author===S.uid && n.day===td).length;
  if (!S.showNom) return h("button",{class:"btn huge pop",onclick:()=>{ S.showNom = true; render(); }},"⚖️ Nominate a him");
  const err = h("div",{class:"err",hidden:true});
  return h("div",{class:"card loud"},
    h("div",{class:"head"}, h("h2",null,"Who did something dumb?"), h("button",{class:"btn ghost",onclick:()=>{ S.showNom=false; render(); }},"Close")),
    h("form",{onsubmit:async e=>{
      e.preventDefault(); err.hidden = true;
      if (mineToday >= NOMS_PER_DAY) { err.textContent = `You've used your ${NOMS_PER_DAY} nominations today. Calm down, prosecutor.`; err.hidden = false; return; }
      if (!dn.about) { err.textContent = "Tap who you're accusing."; err.hidden = false; return; }
      const reason = dn.reason.trim();
      if (reason.length < 4) { err.textContent = "Say what he did. \"Being dumb\" is not a charge, it's a lifestyle."; err.hidden = false; return; }
      const list = items(mine("noms"), MAX_ITEMS-1); list.push({ k:rid(), day:td, about:dn.about, reason:reason.slice(0,140), ts:Date.now() });
      const who = dn.about;
      if (await write("noms",{ items:list })) { draft.nom = { about:"", reason:"" }; S.showNom = false; toast(`${firstNm(who)} has been charged. Let the people decide.`); confetti(); render(); }
    }},
      h("div",{class:"field"}, h("span",{class:"label"},"The accused"), personPicker(dn.about, u=>{ dn.about=u; render(); }, "Who are you nominating")),
      h("div",{class:"field"}, h("label",{class:"label",for:"n-reason"},"The charge"),
        h("input",{id:"n-reason",maxlength:"140",value:dn.reason,placeholder:"Tried to pay for kebab with his student ID",oninput:e=>dn.reason=e.target.value})),
      err, h("button",{class:"btn primary",type:"submit"},"File the charge"),
      h("p",{class:"small muted"},`${NOMS_PER_DAY - mineToday} nominations left today.`)));
}

function nomCard(uid, t, top, myVote){
  const td = D.td, charges = D.nominated[td][uid], n = t[uid]||0, self = uid===S.uid, picked = myVote===uid;
  const appeal = D.appeals[td]?.[uid], verdict = D.verdicts[td]?.[uid] || { guilty:0, innocent:0 };
  const acquitted = D.acquitted(td, uid), myVerdict = mine("verdicts").days?.[td]?.[uid];
  const first = charges[0];
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
      h("div",{style:"min-width:0"}, h("div",{class:"nm",style:"font-size:1.1rem"}, nm(uid), self ? " (you)" : ""),
        h("div",{class:"sub"}, `${charges.length} charge${charges.length===1?"":"s"}`), brainMeter(uid)),
      h("div",{class:"count"}, h("div",{class:"votes"}, acquitted ? "–" : n), h("div",{class:"label"}, n===1?"vote":"votes"))),
    h("div",{class:"charges"}, charges.map(c=>h("div",{class:"charge"}, h("q",null,c.reason), h("div",{class:"by"},`filed by ${firstNm(c.author)}`)))),
    roast(`nom:${first.key}`, "nom", { name:firstNm(uid), text:charges.map(c=>c.reason).join(" | ") }, { day:td }),
    trial,
    h("div",{class:"btnrow"},
      self ? (appeal ? null : h("button",{class:"btn",onclick:()=>{ S.showAppeal = !S.showAppeal; render(); }},"🧑‍⚖️ Appeal")) :
        h("button",{class:"btn "+(picked?"hi":"primary"),disabled:acquitted,onclick:()=>vote(uid)}, picked ? "Your pick" : acquitted ? "Acquitted" : "Vote Himmest")),
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
  const td = D.td, days = { ...(mine("votes").days||{}) };
  if (days[td] === uid) return;
  const first = !days[td]; days[td] = uid;
  const keep = {}; for (const k of Object.keys(days).sort().slice(-1000)) keep[k] = days[k];
  if (await write("votes",{days:keep})) { toast(first ? `Vote locked in for ${firstNm(uid)}. +${ALLOW_HB} HB tomorrow for voting.` : `Switched to ${firstNm(uid)}. Flip-flopper.`); confetti(); }
}
function receiptsCard(day){
  const r = D.receipts[day] || [];
  if (!r.length) return null;
  return h("details",{class:"card receipts"},
    h("summary",{style:"cursor:pointer"}, h("strong",null,`🧾 Receipts for ${fmtDay(day)}`), h("span",{class:"small muted"}," · who voted for who")),
    h("div",{style:"margin-top:8px"}, r.map(x=>h("div",{class:"r"}, avatar(x.voter,"sm"), h("b",null,firstNm(x.voter)), " voted ", avatar(x.target,"sm"), h("b",null,firstNm(x.target))))));
}
function viewToday(L){
  const td = D.td, t = D.dv[td] || {}, myVote = mine("votes").days?.[td];
  const nominees = Object.keys(D.nominated[td] || {}).sort((a,b)=>(t[b]||0)-(t[a]||0) || nm(a).localeCompare(nm(b)));
  const top = Math.max(0, ...Object.values(t));
  const hero = h("div",{class:"hero"},
    h("div",{class:"head",style:"margin:0"}, h("span",{class:"label"}, fmtDay(td)), h("span",{class:"pill live"}, `Polls close in ${fmtDur(secsToMidnight())}`)),
    h("h1",null,"Who was the Himmest today?"),
    h("p",{class:"q"}, PROMPTS[dayIndex(td) % PROMPTS.length]),
    h("div",{class:"commentary"}, h("b",null,"ON AIR"), h("span",null, commentary())));
  const how = h("details",{class:"card how"}, h("summary",null,"How it works (for the slow ones)"),
    h("ul",null,
      h("li",null,"Nominate someone who did something dumb. Say what he did."),
      h("li",null,"Everyone votes once a day. Most votes at midnight = the Himmest."),
      h("li",null,"Nominated? You can appeal once. Win the trial and your votes don't count."),
      h("li",null,"Most points by Sunday = King of the Week. The King makes a rule and picks the punishment."),
      h("li",null,"The punishment goes to whoever loses the most Himbucks betting that week.")));
  return h("div",{class:"stack"},
    pushCard(), kingCard(L), hero, nominateCard(),
    nominees.length ? h("div",{class:"stack"}, h("div",{class:"head",style:"margin:0"}, h("h2",null,"Today's suspects"), h("span",{class:"small muted"}, myVote ? `You voted ${firstNm(myVote)}.` : "One vote. Choose wisely, or don't.")),
      nominees.map(u=>nomCard(u, t, top, myVote))) :
      h("div",{class:"card"}, emptyBox("No suspects yet.","Somebody did something dumb today. You know who. Nominate him.")),
    receiptsCard(addDays(td,-1)), how);
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
        let url; try { url = await uploadImg("photo", dm.img); } catch(x) { err.textContent = x.message; err.hidden = false; if (sb) sb.disabled = false; return; }
        const list = items(mine("photos"), MAX_ITEMS-1).filter(x=>okImg(x.img));
        list.push({ k:rid(), about:dm.about, caption:dm.caption.trim().slice(0,140), day:td, ts:Date.now(), img:url });
        const who = dm.about;
        if (await write("photos",{items:list})) { draft.moment = { img:null, about:"", caption:"" }; toast(`Posted. ${firstNm(who)} will never live this down.`); confetti(); render(); }
        else if (sb) sb.disabled = false;
      }},
      h("img",{class:"preview",src:dm.img,alt:"Your photo"}),
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
