// Builds the Assumption Finance Club seal (dark + light variants) as PNG.
const sharp = require('sharp');


function arcText(str, C, r, size, fill, top, family, stepDeg) {
  // top: letters read left-to-right along upper arc; bottom: along lower arc, upright
  const n = str.length, span = stepDeg * (n - 1);
  let out = '';
  for (let i = 0; i < n; i++) {
    const ch = str[i];
    if (ch === ' ') continue;
    const a = top ? (-90 - span / 2 + i * stepDeg) : (90 + span / 2 - i * stepDeg);
    const rad = a * Math.PI / 180;
    const rr = top ? r - size * 0.35 : r + size * 0.35;
    const x = C + rr * Math.cos(rad), y = C + rr * Math.sin(rad);
    const rot = top ? a + 90 : a - 90;
    out += `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-family="${family}" font-size="${size}" font-weight="${top ? 'bold' : 'normal'}" fill="${fill}" text-anchor="middle" dominant-baseline="central" transform="rotate(${rot.toFixed(2)} ${x.toFixed(1)} ${y.toFixed(1)})">${ch}</text>`;
  }
  return out;
}

function seal({ bg, ring, text, bars, sub }) {
  const R = 480, C = 512;
  const ringText = 'ASSUMPTION FINANCE CLUB';
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <path id="top" d="M ${C - 385} ${C} A 385 385 0 0 1 ${C + 385} ${C}"/>
    <path id="bot" d="M ${C - 415} ${C} A 415 415 0 0 0 ${C + 415} ${C}"/>
  </defs>
  <circle cx="${C}" cy="${C}" r="${R}" fill="${bg}"/>
  <circle cx="${C}" cy="${C}" r="${R - 22}" fill="none" stroke="${ring}" stroke-width="6"/>
  <circle cx="${C}" cy="${C}" r="${R - 150}" fill="none" stroke="${ring}" stroke-width="3"/>
  ${arcText(ringText, C, 402, 52, text, true, "DejaVu Serif, serif", 6.9)}
  ${arcText("WORCESTER · EST. 2026", C, 398, 38, sub, false, "DejaVu Sans, sans-serif", 4.4)}
  <circle cx="${C - 400}" cy="${C + 8}" r="10" fill="${ring}"/>
  <circle cx="${C + 400}" cy="${C + 8}" r="10" fill="${ring}"/>
  <!-- ascending bars -->
  <rect x="${C - 150}" y="${C + 10}" width="60" height="90" rx="6" fill="${bars}" opacity="0.55"/>
  <rect x="${C - 70}"  y="${C - 50}" width="60" height="150" rx="6" fill="${bars}" opacity="0.75"/>
  <rect x="${C + 10}"  y="${C - 110}" width="60" height="210" rx="6" fill="${bars}" opacity="0.9"/>
  <rect x="${C + 90}"  y="${C - 180}" width="60" height="280" rx="6" fill="${bars}"/>
  <polyline points="${C - 170},${C - 20} ${C - 40},${C - 100} ${C + 40},${C - 150} ${C + 170},${C - 250}" fill="none" stroke="${text}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
  <polygon points="${C + 195},${C - 272} ${C + 130},${C - 262} ${C + 180},${C - 210}" fill="${text}"/>
  <text x="${C}" y="${C + 205}" font-family="DejaVu Serif, serif" font-size="120" font-weight="bold" fill="${text}" text-anchor="middle" letter-spacing="18">AFC</text>
</svg>`;
}

(async () => {
  const dark = seal({ bg: '#0B1F3A', ring: '#B6BFC5', text: '#FFFFFF', bars: '#2F8FD8', sub: '#B6BFC5' });
  const light = seal({ bg: '#FFFFFF', ring: '#005B99', text: '#0B1F3A', bars: '#005B99', sub: '#005B99' });
  await sharp(Buffer.from(dark)).png().toFile('logo_dark.png');
  await sharp(Buffer.from(light)).png().toFile('logo_light.png');
  require('fs').writeFileSync('logo_dark.svg', dark);
  console.log('done');
})();
