const pptxgen = require('pptxgenjs');
const fs = require('fs');
const React = require('react');
const ReactDOMServer = require('react-dom/server');
const sharp = require('sharp');
const fa = require('react-icons/fa');
const md = require('react-icons/md');

// Palette: Assumption royal blue + silver, with a deep navy to dominate.
const NAVY = '0B1F3A', ROYAL = '005B99', BRIGHT = '2F8FD8', SILVER = 'B6BFC5',
  ICE = 'EAF2F9', LIGHT = 'F4F6F8', INK = '1A2433', MUTED = '5B6776', WHITE = 'FFFFFF';
const HEAD = 'Cambria', BODY = 'Calibri';

async function icon(Comp, color = '#FFFFFF') {
  const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(Comp, { color, size: 256 }));
  const buf = await sharp(Buffer.from(svg)).resize(256, 256).png().toBuffer();
  return 'image/png;base64,' + buf.toString('base64');
}
const b64 = (p) => 'image/png;base64,' + fs.readFileSync(p).toString('base64');

(async () => {
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_WIDE'; // 13.333 x 7.5
  pres.title = 'Assumption Finance Club — Proposal';
  pres.author = 'Fabian Garvik';
  const W = 13.333, H = 7.5, M = 0.6;
  const LOGO_D = b64('logo_dark.png'), LOGO_L = b64('logo_light.png');
  const TOTAL = 12;

  const I = {
    learn: await icon(fa.FaGraduationCap), connect: await icon(fa.FaHandshake),
    compete: await icon(fa.FaTrophy), launch: await icon(fa.FaRocket),
    tennis: await icon(md.MdSportsTennis, '#005B99'), globe: await icon(fa.FaGlobeEurope, '#005B99'),
    brief: await icon(fa.FaBriefcase, '#005B99'), chart: await icon(fa.FaChartLine, '#005B99'),
    user: await icon(fa.FaUserTie, '#B6BFC5'), check: await icon(fa.FaCheck),
    warn: await icon(fa.FaExclamationTriangle, '#005B99'), shield: await icon(fa.FaShieldAlt, '#005B99'),
  };

  // Standard content-slide chrome: action title, small tracker, page number, source line.
  function content(title, section, n, source) {
    const s = pres.addSlide();
    s.background = { color: WHITE };
    s.addText(section.toUpperCase(), { x: M, y: 0.35, w: 8, h: 0.3, fontFace: BODY, fontSize: 10, bold: true, color: ROYAL, charSpacing: 3, margin: 0, isTextBox: true });
    s.addText(title, { x: M, y: 0.65, w: W - 2 * M - 0.9, h: 1.0, fontFace: HEAD, fontSize: 26, bold: true, color: NAVY, margin: 0, valign: 'top', isTextBox: true });
    s.addImage({ data: LOGO_L, x: W - M - 0.6, y: 0.35, w: 0.6, h: 0.6 });
    s.addText(`${n}`, { x: W - M - 0.5, y: H - 0.45, w: 0.5, h: 0.25, fontFace: BODY, fontSize: 9, color: MUTED, align: 'right', margin: 0, isTextBox: true });
    s.addText('Assumption Finance Club  |  Proposal  |  Confidential draft', { x: M, y: H - 0.45, w: 6, h: 0.25, fontFace: BODY, fontSize: 9, color: MUTED, margin: 0, isTextBox: true });
    if (source) s.addText('Source: ' + source, { x: M, y: H - 0.78, w: W - 2 * M, h: 0.25, fontFace: BODY, fontSize: 9, italic: true, color: MUTED, margin: 0, isTextBox: true });
    return s;
  }
  const card = (s, x, y, w, h, fill = LIGHT) =>
    s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: fill }, line: { color: fill } });

  // ---------- 1. Cover ----------
  {
    const s = pres.addSlide();
    s.background = { color: NAVY };
    s.addShape(pres.shapes.OVAL, { x: 7.9, y: -1.6, w: 7.6, h: 7.6, fill: { color: '10294B' }, line: { color: '10294B' } });
    s.addShape(pres.shapes.OVAL, { x: 9.6, y: 3.6, w: 5.2, h: 5.2, fill: { color: '0E2545' }, line: { color: '0E2545' } });
    s.addImage({ data: LOGO_D, x: 8.75, y: 1.35, w: 4.2, h: 4.2 });
    s.addText('PROPOSAL  ·  FALL 2026', { x: M + 0.2, y: 1.5, w: 7, h: 0.35, fontFace: BODY, fontSize: 12, bold: true, color: SILVER, charSpacing: 4, margin: 0, isTextBox: true });
    s.addText('Assumption\nFinance Club', { x: M + 0.2, y: 1.95, w: 7.5, h: 2.2, fontFace: HEAD, fontSize: 54, bold: true, color: WHITE, margin: 0, valign: 'top', isTextBox: true });
    s.addText('Building Assumption’s front door to careers in finance', { x: M + 0.2, y: 4.25, w: 7.3, h: 0.6, fontFace: HEAD, fontSize: 20, italic: true, color: 'BFD7EC', margin: 0, isTextBox: true });
    s.addText([
      { text: 'Prepared by Fabian Garvik', options: { bold: true, color: WHITE, breakLine: true } },
      { text: 'fabian.garvik@assumption.edu', options: { color: SILVER } },
    ], { x: M + 0.2, y: 5.55, w: 7, h: 0.7, fontFace: BODY, fontSize: 13, margin: 0, isTextBox: true });
    s.addNotes('Open confidently. One sentence: "I want to start a student-run finance club that gives every Assumption student — regardless of major or year — a path into finance careers, and I would like your help to do it." Then go straight to who you are.');
  }

  // ---------- 2. About me ----------
  {
    const s = content('A Norwegian student-athlete who brings discipline, an international lens and hands-on consulting experience', 'Who I am', 2);
    // Photo placeholder
    s.addShape(pres.shapes.OVAL, { x: M, y: 2.0, w: 2.6, h: 2.6, fill: { color: NAVY }, line: { color: SILVER, width: 3 } });
    s.addImage({ data: I.user, x: M + 0.75, y: 2.7, w: 1.1, h: 1.1 });
    s.addText('Fabian Garvik', { x: M, y: 4.8, w: 2.6, h: 0.4, fontFace: HEAD, fontSize: 18, bold: true, color: NAVY, align: 'center', margin: 0, isTextBox: true });
    s.addText('Høvik (Oslo), Norway\n[Major]  ·  Class of [20XX]', { x: M, y: 5.2, w: 2.6, h: 0.7, fontFace: BODY, fontSize: 12, color: MUTED, align: 'center', margin: 0, isTextBox: true });

    const items = [
      [I.tennis, 'Student-athlete', 'Men’s Tennis at Assumption. Trained at Norges Toppidrettsgymnas (NTG), Norway’s elite sports high school — 10+ years of competing under pressure.'],
      [I.globe, 'International perspective', 'Grew up in Norway, home of the world’s largest sovereign wealth fund. Wrote a research paper on how oil wealth built the Norwegian Government Pension Fund.'],
      [I.brief, 'Consulting experience', 'At Saint Louis University, co-led an RFP response for a mid-sized distributor: ERP, network and ROI recommendation. I owned the executive summary.'],
      [I.chart, 'Why finance', 'I follow markets daily and want a career in finance. I transferred to Assumption this fall — and found no open place for students like me to build those skills.'],
    ];
    const x0 = 3.9, cw = 4.25, ch = 1.95;
    items.forEach(([ic, h, t], i) => {
      const x = x0 + (i % 2) * (cw + 0.3), y = 1.95 + Math.floor(i / 2) * (ch + 0.3);
      card(s, x, y, cw, ch);
      s.addShape(pres.shapes.OVAL, { x: x + 0.25, y: y + 0.25, w: 0.6, h: 0.6, fill: { color: ICE }, line: { color: ICE } });
      s.addImage({ data: ic, x: x + 0.39, y: y + 0.39, w: 0.32, h: 0.32 });
      s.addText(h, { x: x + 1.0, y: y + 0.28, w: cw - 1.2, h: 0.5, fontFace: HEAD, fontSize: 15, bold: true, color: NAVY, margin: 0, valign: 'middle', isTextBox: true });
      s.addText(t, { x: x + 0.25, y: y + 0.95, w: cw - 0.5, h: ch - 1.05, fontFace: BODY, fontSize: 11.5, color: INK, margin: 0, valign: 'top', isTextBox: true });
    });
    s.addNotes('Keep this to 60 seconds. Replace the icon circle with a professional headshot and fill in your major and class year. The point of this slide: I am disciplined (athlete), I think globally (Norway / oil fund), and I have already done consulting-style work (SLU RFP). Do not read the boxes — tell one short story, e.g. the oil fund paper.');
  }

  // ---------- 3. Executive summary ----------
  {
    const s = content('Executive summary: an open, career-focused finance club that feeds — not competes with — the Greyhound Investment Club', 'Executive summary', 3);
    const rows = [
      ['Situation', 'Finance is one of the most popular career goals for business students, and Assumption already runs a strong, selective Greyhound Investment Club inside the Grenon School of Business.'],
      ['Complication', 'The Investment Club requires FIN 325 and ECO 115 first — so most first- and second-year students, and non-finance majors, have no structured way in. Yet internship recruiting in finance starts as early as sophomore year.'],
      ['Proposal', 'Launch the Assumption Finance Club (AFC): open to all majors and years, focused on skills, networking and recruiting — Learn, Connect, Compete, Launch.'],
      ['Ask', 'A faculty advisor, support through club recognition, and an introduction to the Investment Club and CareerSuccess so AFC can act as their pipeline.'],
    ];
    rows.forEach(([k, v], i) => {
      const y = 1.95 + i * 1.18;
      const fill = i === 3 ? NAVY : LIGHT;
      card(s, M, y, 2.4, 1.0, i === 3 ? ROYAL : NAVY);
      s.addText(k, { x: M, y, w: 2.4, h: 1.0, fontFace: HEAD, fontSize: 16, bold: true, color: WHITE, align: 'center', valign: 'middle', margin: 0, isTextBox: true });
      card(s, M + 2.55, y, W - 2 * M - 2.55, 1.0, fill);
      s.addText(v, { x: M + 2.8, y, w: W - 2 * M - 3.0, h: 1.0, fontFace: BODY, fontSize: 13, color: i === 3 ? WHITE : INK, valign: 'middle', margin: 0, isTextBox: true });
    });
    s.addNotes('This is the whole pitch on one page — consultants call it "answer first". If the professor only remembers one slide, it should be this one. Say the ask out loud here, then say "let me show you why".');
  }

  // ---------- 4. The gap ----------
  {
    const s = content('Today, students interested in finance have no open entry point until their junior year', 'The opportunity', 4,
      'Assumption University CareerSuccess, Greyhound Investment Club page; public bank recruiting calendars (timing varies by firm).');
    // Left: student journey with the gap
    s.addText('A typical finance-minded student’s path today', { x: M, y: 1.85, w: 6.4, h: 0.35, fontFace: HEAD, fontSize: 15, bold: true, color: NAVY, margin: 0, isTextBox: true });
    const steps = [
      ['Year 1', 'Interested in finance', 'No club, no community, no guidance', false],
      ['Year 2', 'Recruiting starts', 'Still no structured prep or network', false],
      ['Year 3', 'Eligible for GIC', 'After FIN 325 + ECO 115', true],
      ['Year 4', 'Full-time offers', 'Driven by junior-year internship', true],
    ];
    steps.forEach(([yr, h, t, ok], i) => {
      const y = 2.35 + i * 1.02;
      s.addShape(pres.shapes.OVAL, { x: M, y: y + 0.08, w: 0.7, h: 0.7, fill: { color: ok ? ROYAL : 'D9DEE3' }, line: { color: ok ? ROYAL : 'D9DEE3' } });
      s.addText(yr.replace('Year ', 'Y'), { x: M, y: y + 0.08, w: 0.7, h: 0.7, fontFace: BODY, fontSize: 13, bold: true, color: ok ? WHITE : NAVY, align: 'center', valign: 'middle', margin: 0, isTextBox: true });
      if (i < 3) s.addShape(pres.shapes.LINE, { x: M + 0.35, y: y + 0.8, w: 0, h: 0.3, line: { color: SILVER, width: 2 } });
      s.addText([{ text: h, options: { bold: true, color: NAVY, breakLine: true } }, { text: t, options: { color: MUTED } }],
        { x: M + 0.95, y: y + 0.05, w: 4.2, h: 0.8, fontFace: BODY, fontSize: 13, valign: 'middle', margin: 0, isTextBox: true });
    });
    // Gap bracket
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 5.3, y: 2.4, w: 1.6, h: 1.9, fill: { color: ICE }, line: { color: ROYAL, width: 1.5, dashType: 'dash' }, rectRadius: 0.1 });
    s.addText('THE GAP\nAFC fills\nyears 1–2', { x: 5.3, y: 2.4, w: 1.6, h: 1.9, fontFace: BODY, fontSize: 13, bold: true, color: ROYAL, align: 'center', valign: 'middle', margin: 0, isTextBox: true });

    // Right: big stat callouts
    const rx = 7.6, rw = W - M - rx;
    card(s, rx, 1.85, rw, 4.6, NAVY);
    const stats = [
      ['2', 'courses required before a student can join the Investment Club today'],
      ['Year 2', 'when many finance internship processes open for junior-year roles'],
      ['0', 'open, all-major finance clubs on campus today'],
    ];
    stats.forEach(([big, t], i) => {
      const y = 2.1 + i * 1.42;
      s.addText(big, { x: rx + 0.35, y, w: 1.9, h: 1.0, fontFace: HEAD, fontSize: 40, bold: true, color: BRIGHT, margin: 0, valign: 'middle', isTextBox: true });
      s.addText(t, { x: rx + 2.3, y, w: rw - 2.6, h: 1.0, fontFace: BODY, fontSize: 13, color: WHITE, margin: 0, valign: 'middle', isTextBox: true });
    });
    s.addNotes('This is the "why now". Be precise and respectful: the Investment Club is good — it is just gated. VERIFY before Monday: (1) that there really is no other open finance or business club recognized on campus (check the SGA / Student Activities club list), (2) roughly how many finance majors/minors Assumption has — ask the professor; if you can get that number it is a much stronger stat. Do not claim numbers you cannot back up.');
  }

  // ---------- 5. Positioning ----------
  {
    const s = content('AFC is the on-ramp to the Greyhound Investment Club — together they form a complete finance pathway', 'Positioning', 5);
    const cols = [M + 2.6, M + 7.3];
    const cw = 4.1;
    [['Assumption Finance Club', 'NEW  ·  Student-run', ROYAL], ['Greyhound Investment Club', 'EXISTING  ·  Grenon School of Business', NAVY]].forEach(([h, sub, c], i) => {
      card(s, cols[i], 1.85, cw, 0.95, c);
      s.addText([{ text: h, options: { bold: true, fontSize: 16, fontFace: HEAD, breakLine: true } }, { text: sub, options: { fontSize: 10, color: 'D5E3F0' } }],
        { x: cols[i] + 0.2, y: 1.85, w: cw - 0.4, h: 0.95, color: WHITE, fontFace: BODY, valign: 'middle', margin: 0, isTextBox: true });
    });
    const rows = [
      ['Who', 'Any major, any year', 'Students who completed FIN 325 + ECO 115'],
      ['Focus', 'Careers: skills, networking, recruiting', 'Managing a real portfolio'],
      ['Format', 'Workshops, speakers, treks, competitions', 'Trading room, stock analysis, Bloomberg'],
      ['Outcome', 'Internship-ready students — and GIC applicants', 'Hands-on investment track record'],
    ];
    rows.forEach(([k, a, b], i) => {
      const y = 2.95 + i * 0.82;
      const fill = i % 2 === 0 ? LIGHT : WHITE;
      card(s, M, y, W - 2 * M - 0.13, 0.72, fill);
      s.addText(k, { x: M + 0.2, y, w: 2.2, h: 0.72, fontFace: BODY, fontSize: 13, bold: true, color: NAVY, valign: 'middle', margin: 0, isTextBox: true });
      s.addText(a, { x: cols[0] + 0.2, y, w: cw - 0.4, h: 0.72, fontFace: BODY, fontSize: 13, color: INK, valign: 'middle', margin: 0, isTextBox: true });
      s.addText(b, { x: cols[1] + 0.2, y, w: cw - 0.4, h: 0.72, fontFace: BODY, fontSize: 13, color: INK, valign: 'middle', margin: 0, isTextBox: true });
    });
    s.addShape(pres.shapes.RIGHT_ARROW, { x: cols[0] + cw + 0.13, y: 2.07, w: 0.35, h: 0.5, fill: { color: SILVER }, line: { color: SILVER } });
    s.addText('Pipeline: AFC members take FIN 325 / ECO 115, then apply to GIC as stronger candidates.', { x: M, y: 6.3, w: W - 2 * M, h: 0.35, fontFace: HEAD, fontSize: 13, italic: true, color: ROYAL, margin: 0, isTextBox: true });
    s.addNotes('This is the most important slide for a finance professor, because the first objection will be "we already have the Investment Club". Say it before they do: "The Investment Club is great, and I want AFC to feed it — not compete with it." Offer a joint event per semester with GIC.');
  }

  // ---------- 6. Four pillars ----------
  {
    const s = content('Four pillars turn interest into offers: Learn, Connect, Compete, Launch', 'What we will do', 6);
    const P = [
      [I.learn, 'Learn', ['Excel & financial modeling basics', 'Accounting & valuation 101', 'Markets briefing every meeting']],
      [I.connect, 'Connect', ['Alumni & industry speakers', 'Boston / Worcester firm visits', 'LinkedIn & networking workshops']],
      [I.compete, 'Compete', ['Internal stock-pitch competition', 'Intercollegiate case competitions', 'Teams mix majors & years']],
      [I.launch, 'Launch', ['Resume & cover letter reviews', 'Technical & behavioral mock interviews', 'Internship tracker with CareerSuccess']],
    ];
    const cw = (W - 2 * M - 3 * 0.3) / 4;
    P.forEach(([ic, h, bl], i) => {
      const x = M + i * (cw + 0.3), y = 1.95;
      card(s, x, y, cw, 4.5, i === 0 ? NAVY : LIGHT);
      const dark = i === 0;
      s.addShape(pres.shapes.OVAL, { x: x + 0.3, y: y + 0.35, w: 0.9, h: 0.9, fill: { color: dark ? BRIGHT : ROYAL }, line: { color: dark ? BRIGHT : ROYAL } });
      s.addImage({ data: ic, x: x + 0.52, y: y + 0.57, w: 0.46, h: 0.46 });
      s.addText(`0${i + 1}`, { x: x + cw - 1.0, y: y + 0.35, w: 0.7, h: 0.5, fontFace: HEAD, fontSize: 20, bold: true, color: dark ? '4A6A92' : SILVER, align: 'right', margin: 0, isTextBox: true });
      s.addText(h, { x: x + 0.3, y: y + 1.45, w: cw - 0.6, h: 0.55, fontFace: HEAD, fontSize: 22, bold: true, color: dark ? WHITE : NAVY, margin: 0, isTextBox: true });
      s.addText(bl.map((t, j) => ({ text: t, options: { bullet: true, breakLine: j < bl.length - 1 } })),
        { x: x + 0.3, y: y + 2.15, w: cw - 0.5, h: 2.1, fontFace: BODY, fontSize: 13, color: dark ? 'DCE6F2' : INK, paraSpaceAfter: 8, valign: 'top', margin: 0, isTextBox: true });
    });
    s.addNotes('Walk through the pillars quickly — 15 seconds each. Emphasize that this is practical and career-focused, which is exactly what the Investment Club is not designed to do for younger students.');
  }

  // ---------- 7. Roadmap ----------
  {
    const s = content('Year-one roadmap: launch this semester, prove traction by spring, hand over to a new board in April', 'Roadmap', 7);
    const ms = [
      ['Oct', 'Recognition & e-board', 'Advisor secured, constitution filed, founding board of 5'],
      ['Nov', 'Kick-off + first speaker', 'Launch event, Excel workshop, alumni talk'],
      ['Dec', 'Stock-pitch night', 'Teams pitch one stock; joint judging with GIC'],
      ['Jan–Feb', 'Modeling bootcamp', '4-week valuation series; Boston firm trek'],
      ['Mar', 'Case competition', 'Send first team to an intercollegiate competition'],
      ['Apr', 'Showcase & handover', 'Year-in-review, elect successors, plan year 2'],
    ];
    const lineY = 3.55, x0 = M + 0.3, x1 = W - M - 0.3;
    s.addShape(pres.shapes.LINE, { x: x0, y: lineY, w: x1 - x0, h: 0, line: { color: SILVER, width: 3 } });
    s.addText('FALL 2026', { x: x0, y: 1.95, w: 5, h: 0.3, fontFace: BODY, fontSize: 11, bold: true, color: ROYAL, charSpacing: 3, margin: 0, isTextBox: true });
    s.addText('SPRING 2027', { x: x0 + (x1 - x0) / 2 + 0.2, y: 1.95, w: 5, h: 0.3, fontFace: BODY, fontSize: 11, bold: true, color: ROYAL, charSpacing: 3, margin: 0, isTextBox: true });
    s.addShape(pres.shapes.LINE, { x: x0 + (x1 - x0) / 2, y: 1.95, w: 0, h: 4.5, line: { color: 'D9DEE3', width: 1, dashType: 'dash' } });
    const step = (x1 - x0) / ms.length;
    ms.forEach(([m, h, t], i) => {
      const cx = x0 + step * (i + 0.5);
      const first = i === 0;
      s.addShape(pres.shapes.OVAL, { x: cx - 0.2, y: lineY - 0.2, w: 0.4, h: 0.4, fill: { color: first ? BRIGHT : NAVY }, line: { color: WHITE, width: 2 } });
      s.addText(m, { x: cx - 0.9, y: 2.55, w: 1.8, h: 0.6, fontFace: HEAD, fontSize: 20, bold: true, color: NAVY, align: 'center', valign: 'bottom', margin: 0, isTextBox: true });
      card(s, cx - step / 2 + 0.1, 4.0, step - 0.2, 2.3, first ? ICE : LIGHT);
      s.addText(h, { x: cx - step / 2 + 0.25, y: 4.15, w: step - 0.5, h: 0.75, fontFace: BODY, fontSize: 13, bold: true, color: NAVY, valign: 'top', margin: 0, isTextBox: true });
      s.addText(t, { x: cx - step / 2 + 0.25, y: 4.9, w: step - 0.5, h: 1.3, fontFace: BODY, fontSize: 11.5, color: INK, valign: 'top', margin: 0, isTextBox: true });
    });
    s.addNotes('Show that you have thought about execution, not just the idea. The April handover is deliberate: it answers "what happens when you graduate?" before they ask. Adjust months around your tennis schedule.');
  }

  // ---------- 8. Structure ----------
  {
    const s = content('A lean five-person board with a faculty advisor keeps AFC accountable and sustainable', 'Organization', 8);
    const box = (x, y, w, h, title, sub, fill, fc) => {
      card(s, x, y, w, h, fill);
      s.addText([{ text: title, options: { bold: true, fontSize: 14, breakLine: true } }, { text: sub, options: { fontSize: 11 } }],
        { x: x + 0.1, y, w: w - 0.2, h, fontFace: BODY, color: fc, align: 'center', valign: 'middle', margin: 0, isTextBox: true });
    };
    const cx = W / 2;
    box(cx - 1.75, 1.9, 3.5, 0.85, 'Faculty Advisor', '[Professor — to be confirmed]', ROYAL, WHITE);
    s.addShape(pres.shapes.LINE, { x: cx, y: 2.75, w: 0, h: 0.35, line: { color: SILVER, width: 2 } });
    box(cx - 1.75, 3.1, 3.5, 0.85, 'President', 'Fabian Garvik (founder)', NAVY, WHITE);
    s.addShape(pres.shapes.LINE, { x: cx, y: 3.95, w: 0, h: 0.3, line: { color: SILVER, width: 2 } });
    const roles = [
      ['VP Education', 'Workshops & bootcamps'], ['VP Careers', 'Speakers, treks, alumni'],
      ['VP Markets', 'Stock pitch & GIC link'], ['Treasurer', 'Budget & SGA reporting'], ['Marketing', 'Social, recruiting members'],
    ];
    const bw = 2.15, gap = 0.2, tot = roles.length * bw + (roles.length - 1) * gap, sx = (W - tot) / 2;
    s.addShape(pres.shapes.LINE, { x: sx + bw / 2, y: 4.25, w: tot - bw, h: 0, line: { color: SILVER, width: 2 } });
    roles.forEach(([t, d], i) => {
      const x = sx + i * (bw + gap);
      s.addShape(pres.shapes.LINE, { x: x + bw / 2, y: 4.25, w: 0, h: 0.3, line: { color: SILVER, width: 2 } });
      box(x, 4.55, bw, 1.0, t, d, LIGHT, NAVY);
    });
    s.addText('Membership: open to all undergraduates  ·  Target of ~30 active members in year one  ·  Board elected each April', { x: M, y: 5.95, w: W - 2 * M, h: 0.4, fontFace: BODY, fontSize: 13, italic: true, color: ROYAL, align: 'center', margin: 0, isTextBox: true });
    s.addNotes('If you already have co-founders, put their names in the boxes — names make it real. Ideally recruit at least 2–3 people (ideally not all athletes, and at least one underclassman) before or right after this meeting.');
  }

  // ---------- 9. Budget & KPIs ----------
  {
    const s = content('A modest first-year budget, measured against clear targets', 'Budget & success metrics', 9,
      'Estimates for planning only; to be refined with the advisor and SGA budget guidelines.');
    const budget = [['Speaker events', 400], ['Workshops & food', 600], ['Boston trek transport', 800], ['Competition fees', 300], ['Marketing', 200]];
    s.addText('Estimated year-one budget (USD)', { x: M, y: 1.85, w: 6.2, h: 0.35, fontFace: HEAD, fontSize: 15, bold: true, color: NAVY, margin: 0, isTextBox: true });
    s.addChart(pres.charts.BAR, [{ name: 'USD', labels: budget.map(b => b[0]), values: budget.map(b => b[1]) }], {
      x: M, y: 2.25, w: 6.3, h: 3.6, barDir: 'bar', chartColors: [ROYAL],
      showValue: true, dataLabelPosition: 'outEnd', dataLabelColor: NAVY, dataLabelFontSize: 11, dataLabelFormatCode: '$#,##0',
      catAxisLabelColor: INK, catAxisLabelFontSize: 11, catAxisLabelFontFace: BODY, catAxisOrientation: 'maxMin',
      valAxisHidden: true, valGridLine: { style: 'none' }, catGridLine: { style: 'none' }, showLegend: false, barGapWidthPct: 60,
      valAxisMaxVal: 1000,
    });
    s.addText([{ text: 'Total  ', options: { color: MUTED } }, { text: '≈ $2,300', options: { bold: true, color: NAVY } }], { x: M, y: 5.9, w: 6.2, h: 0.4, fontFace: HEAD, fontSize: 16, margin: 0, isTextBox: true });

    const rx = 7.4, rw = W - M - rx;
    s.addText('Year-one targets', { x: rx, y: 1.85, w: rw, h: 0.35, fontFace: HEAD, fontSize: 15, bold: true, color: NAVY, margin: 0, isTextBox: true });
    const k = [['30', 'active members'], ['8+', 'events per year'], ['4', 'alumni / industry speakers'], ['5', 'members join GIC or land a finance internship']];
    k.forEach(([n, t], i) => {
      const x = rx + (i % 2) * (rw / 2 + 0.05), y = 2.3 + Math.floor(i / 2) * 1.95;
      card(s, x, y, rw / 2 - 0.1, 1.75, i === 0 ? NAVY : ICE);
      s.addText(n, { x: x + 0.2, y: y + 0.15, w: rw / 2 - 0.5, h: 0.85, fontFace: HEAD, fontSize: 38, bold: true, color: i === 0 ? WHITE : ROYAL, margin: 0, isTextBox: true });
      s.addText(t, { x: x + 0.2, y: y + 1.0, w: rw / 2 - 0.5, h: 0.65, fontFace: BODY, fontSize: 12, color: i === 0 ? 'DCE6F2' : INK, margin: 0, valign: 'top', isTextBox: true });
    });
    s.addNotes('Numbers are estimates — say so. Ask the professor what a realistic SGA allocation for a new club is; many new clubs get a small starter budget and grow once they show attendance. Being modest here builds credibility.');
  }

  // ---------- 10. Risks ----------
  {
    const s = content('We have anticipated the main risks — and how to mitigate each one', 'Risks & mitigations', 10);
    const R = [
      ['Overlap with the Investment Club', 'Clear scope split (careers vs. portfolio); joint event each semester; GIC member on AFC advisory seat.'],
      ['Club fades after the founder leaves', 'Mixed-year board, written playbook, elections every April, faculty advisor for continuity.'],
      ['Low turnout after launch', 'Open to all majors; practical, résumé-worthy sessions; food at events; consistent schedule.'],
      ['Founder capacity (in-season athlete)', 'Responsibilities split across five VPs; calendar built around the tennis season.'],
    ];
    const cw = (W - 2 * M - 0.3) / 2, ch = 2.0;
    R.forEach(([r, m], i) => {
      const x = M + (i % 2) * (cw + 0.3), y = 1.95 + Math.floor(i / 2) * (ch + 0.3);
      card(s, x, y, cw, ch);
      s.addImage({ data: I.warn, x: x + 0.3, y: y + 0.3, w: 0.38, h: 0.38 });
      s.addText(r, { x: x + 0.85, y: y + 0.22, w: cw - 1.1, h: 0.55, fontFace: HEAD, fontSize: 15, bold: true, color: NAVY, valign: 'middle', margin: 0, isTextBox: true });
      s.addImage({ data: I.shield, x: x + 0.3, y: y + 1.0, w: 0.38, h: 0.38 });
      s.addText(m, { x: x + 0.85, y: y + 0.88, w: cw - 1.1, h: 0.95, fontFace: BODY, fontSize: 13, color: INK, valign: 'top', margin: 0, isTextBox: true });
    });
    s.addNotes('Consultants always show risks — it signals maturity. Raising "I am an athlete with limited time" yourself is much stronger than having the professor raise it.');
  }

  // ---------- 11. The ask ----------
  {
    const s = content('What I am asking for today — and the next steps', 'The ask', 11);
    const asks = [
      ['Serve as faculty advisor', 'Or recommend a colleague in the Grenon School who would.'],
      ['Guide us through recognition', 'Point us to the right office and process for a new student organization.'],
      ['Connect us', 'Introductions to the Greyhound Investment Club leadership and CareerSuccess.'],
    ];
    asks.forEach(([h, t], i) => {
      const y = 1.95 + i * 1.4;
      s.addShape(pres.shapes.OVAL, { x: M, y: y + 0.1, w: 0.9, h: 0.9, fill: { color: NAVY }, line: { color: NAVY } });
      s.addText(`${i + 1}`, { x: M, y: y + 0.1, w: 0.9, h: 0.9, fontFace: HEAD, fontSize: 26, bold: true, color: WHITE, align: 'center', valign: 'middle', margin: 0, isTextBox: true });
      s.addText([{ text: h, options: { bold: true, fontFace: HEAD, fontSize: 18, color: NAVY, breakLine: true } }, { text: t, options: { fontSize: 13, color: INK } }],
        { x: M + 1.15, y: y + 0.05, w: 5.6, h: 1.05, fontFace: BODY, valign: 'middle', margin: 0, isTextBox: true });
    });
    const rx = 7.7, rw = W - M - rx;
    card(s, rx, 1.95, rw, 4.3, NAVY);
    s.addText('NEXT STEPS', { x: rx + 0.35, y: 2.15, w: rw - 0.7, h: 0.35, fontFace: BODY, fontSize: 11, bold: true, color: SILVER, charSpacing: 3, margin: 0, isTextBox: true });
    const ns = [['This week', 'Confirm advisor; get recognition paperwork'], ['Within 2 weeks', 'Recruit founding board; draft constitution'], ['By end of Oct.', 'Submit for recognition; meet GIC leadership'], ['November', 'Kick-off event']];
    ns.forEach(([w, t], i) => {
      const y = 2.65 + i * 0.85;
      s.addImage({ data: I.check, x: rx + 0.35, y: y + 0.08, w: 0.28, h: 0.28 });
      s.addText([{ text: w, options: { bold: true, color: WHITE, breakLine: true } }, { text: t, options: { color: 'C9D6E5' } }],
        { x: rx + 0.8, y, w: rw - 1.1, h: 0.75, fontFace: BODY, fontSize: 12.5, valign: 'top', margin: 0, isTextBox: true });
    });
    s.addNotes('Stop talking after the ask and let them respond. Write down every name, office, and requirement they mention. Before you leave, agree on one concrete follow-up (e.g., "I will send you a draft constitution by Friday").');
  }

  // ---------- 12. Close ----------
  {
    const s = pres.addSlide();
    s.background = { color: NAVY };
    s.addShape(pres.shapes.OVAL, { x: -2.2, y: 2.4, w: 7.2, h: 7.2, fill: { color: '10294B' }, line: { color: '10294B' } });
    s.addImage({ data: LOGO_D, x: 1.2, y: 1.5, w: 4.3, h: 4.3 });
    s.addText('Thank you', { x: 6.6, y: 2.2, w: 6, h: 1.0, fontFace: HEAD, fontSize: 48, bold: true, color: WHITE, margin: 0, isTextBox: true });
    s.addText('Questions & discussion', { x: 6.6, y: 3.2, w: 6, h: 0.6, fontFace: HEAD, fontSize: 22, italic: true, color: 'BFD7EC', margin: 0, isTextBox: true });
    s.addText([
      { text: 'Fabian Garvik', options: { bold: true, color: WHITE, breakLine: true } },
      { text: 'Founder, Assumption Finance Club', options: { color: SILVER, breakLine: true } },
      { text: 'fabian.garvik@assumption.edu', options: { color: SILVER } },
    ], { x: 6.6, y: 4.3, w: 6, h: 1.1, fontFace: BODY, fontSize: 14, margin: 0, isTextBox: true });
  }

  await pres.writeFile({ fileName: 'Assumption_Finance_Club_Pitch.pptx' });
  console.log('written');
})();
