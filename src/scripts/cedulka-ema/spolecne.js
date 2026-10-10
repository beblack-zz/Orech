/*
 * Cedulka jako ema — společné kusy nových kreseb (./lampion.js):
 * pomocníci, destička se stříškou, tvář s výrazy, řádky „textu“ nebo
 * jméno, otáčení kolem šňůrky, červenobílá šňůrka a ručky.
 *
 * Opsané z ./kresby.js, kde je mají starší podoby (kůň na rubu, rydlo,
 * Inari) ještě u sebe.
 */

/* ——— Pomocníci ——— */
const f = (n) => Math.round(n * 100) / 100;
const rng = (a) => () => {
  a |= 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (x) => {
  x = clamp(x);
  return x * x * (3 - 2 * x);
};
const krokem = (a, b, x) => smooth((x - a) / (b - a));
const easeOut = (x) => 1 - Math.pow(1 - clamp(x), 3);
const rad = (d) => (d * Math.PI) / 180;
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgbHex = (c) => "#" + c.map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0")).join("");
const mix = (a, b, k) => {
  const A = hexRgb(a);
  const B = hexRgb(b);
  return rgbHex(A.map((v, i) => v + (B[i] - v) * clamp(k)));
};
const pt = (p) => `${f(p[0])} ${f(p[1])}`;
const cara = (body) => "M" + body.map(pt).join(" L");
/** Text do SVG: znaky, které by rozbily značky, se nahradí entitami. */
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Catmull-Rom přes body → hladká křivka z kubických Bézierů. */
const hladka = (P, zavrena = false) => {
  const n = P.length;
  const g = (i) => (zavrena ? P[(i + n) % n] : P[clamp(i, 0, n - 1)]);
  let d = `M${pt(P[0])}`;
  const m = zavrena ? n : n - 1;
  for (let i = 0; i < m; i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${pt(c1)} ${pt(c2)} ${pt(p2)}`;
  }
  return zavrena ? d + " Z" : d;
};
/** Body na Catmull-Rom křivce: n vzorků z řídké lomené čáry. */
const vzorky = (P, n) => {
  const out = [];
  const m = P.length - 1;
  for (let k = 0; k <= n; k++) {
    const u = (k / n) * m;
    const i = Math.min(m - 1, Math.floor(u));
    const s = u - i;
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(m, i + 2)];
    const s2 = s * s, s3 = s2 * s;
    out.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * s + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * s2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * s3)));
  }
  return out;
};
/** Lomená čára s proměnnou šířkou → uzavřený tvar. sirka(t) pro t 0…1. */
const pasPoBodech = (B, sirka) => {
  const L = [], Pr = [];
  const n = B.length;
  for (let i = 0; i < n; i++) {
    const a = B[Math.max(0, i - 1)], b = B[Math.min(n - 1, i + 1)];
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = -(b[1] - a[1]) / d, ny = (b[0] - a[0]) / d;
    const w = sirka(i / (n - 1)) / 2;
    L.push([B[i][0] + nx * w, B[i][1] + ny * w]);
    Pr.push([B[i][0] - nx * w, B[i][1] - ny * w]);
  }
  return `${cara(L)} L${Pr.reverse().map(pt).join(" L")} Z`;
};
/** Tah štětcem: hladká křivka přes body, na začátku přítlak, na konci špička. */
const tah = (P, sirka, { n = 18, nabeh = 0.18, spicka = 0.55 } = {}) =>
  pasPoBodech(vzorky(P, n), (s) => sirka * Math.min(1, 0.35 + s / nabeh) * Math.pow(1 - s * 0.96, spicka));
/** Nepravidelný oblý tvar kolem středu: poloměr kolísá podle seedu. */
const hrouda = (cx, cy, rx, ry, seed, { bodu = 18, kolisani = 0.14 } = {}) => {
  const r = rng(seed);
  const B = [];
  for (let i = 0; i < bodu; i++) {
    const u = (i / bodu) * Math.PI * 2;
    const k = 1 + (r() - 0.5) * 2 * kolisani;
    B.push([cx + Math.cos(u) * rx * k, cy + Math.sin(u) * ry * k]);
  }
  return hladka(B, true);
};
/** Mrkání: krátké zavření kolem každého času v seznamu, 0,17 s. */
const mrkani = (t, casy, perioda) => {
  const tt = perioda ? ((t % perioda) + perioda) % perioda : t;
  let m = 0;
  for (const c of casy) {
    const u = tt - c;
    if (u > 0 && u < 0.17) m = Math.max(m, Math.sin((Math.PI * u) / 0.17));
  }
  return m;
};
/** Čtyřcípá jiskra kolem počátku. */
const jiskraD = (r) => `M0 ${f(-r)} Q${f(r * 0.22)} ${f(-r * 0.22)} ${f(r)} 0 Q${f(r * 0.22)} ${f(r * 0.22)} 0 ${f(r)} Q${f(-r * 0.22)} ${f(r * 0.22)} ${f(-r)} 0 Q${f(-r * 0.22)} ${f(-r * 0.22)} 0 ${f(-r)} Z`;
/** Kyvadlo s útlumem: úhel a rychlost se posunou o dt pod vlivem síly. */
const kyvadlo = (k, dt, { tuhost = 20, utlum = 1.6, sila = 0 }) => {
  k.v += (-tuhost * Math.sin(k.a) - utlum * k.v + sila) * dt;
  k.a += k.v * dt;
};
/** Pružina k cíli (pro otáčení destiček kolem šňůrky). */
const pruzina = (k, cil, dt, { tuhost = 30, utlum = 7 }) => {
  k.v += (tuhost * (cil - k.a) - utlum * k.v) * dt;
  k.a += k.v * dt;
};

/* ═══════════════════════════════════════════════════════════════════
 * Cedulka: kami kresba (characters/kami/Cedulka.astro) — destička se
 * stříškou, letokruhy a červenobílou šňůrkou. Všechno v jejích
 * souřadnicích 0–180, dírka je na (90, 62), spodek desky na y 140.
 * ═══════════════════════════════════════════════════════════════════ */
const CED = {
  tvar: "M56 66 L90 46 L124 66 L124 134 Q124 140 118 140 L62 140 Q56 140 56 134 Z",
  strecha: "M52 68 L90 45 L128 68",
  letokruhy: ["M56 80 Q74 77 90 81 T124 79", "M56 100 Q70 97 86 101 T124 98", "M56 132 Q76 129 92 133 T124 130"],
  oci: [[80, 88], [100, 88]],
  tvare: [[72, 98], [108, 98]],
};
const DREVO = { svetle: "#F3E3C6", tmave: "#E2C9A0", obrys: "#8A6A48", letokruh: "#B89466", hrana: "#B48E62" };

/** Přechody desky: dřevo, ořez na tvar a ruměnec. */
const cedDefs = (id, d = DREVO) =>
  `<linearGradient id="${id}-drevo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${d.svetle}"/><stop offset="1" stop-color="${d.tmave}"/></linearGradient>` +
  `<clipPath id="${id}-orez"><path d="${CED.tvar}"/></clipPath>` +
  `<radialGradient id="${id}-tvare" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#C87E4E" stop-opacity="0.6"/><stop offset="1" stop-color="#C87E4E" stop-opacity="0"/></radialGradient>`;

/** Holá deska: dřevo, letokruhy, stříška a dírka. */
const cedDeska = (id, { d = DREVO, cara = 1.6 } = {}) =>
  `<path d="${CED.tvar}" fill="url(#${id}-drevo)" stroke="${d.obrys}" stroke-width="${cara}" stroke-linejoin="round"/>` +
  `<g clip-path="url(#${id}-orez)" stroke="${d.letokruh}" stroke-width="0.8" fill="none" opacity="0.45">${CED.letokruhy.map((p) => `<path d="${p}"/>`).join("")}</g>` +
  `<path d="${CED.strecha}" stroke="${d.obrys}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>` +
  `<circle cx="90" cy="62" r="3.6" fill="${d.obrys}" opacity="0.5"/>`;

/**
 * Tvářička. dx/dy posouvá pohled, mrk 0…1 zavírá oči.
 * oci: kulate | siroke | smich | zavrene | spi | prisne
 * usta: usmev | o | smich | rovna | smutek | kocici | fuk
 */
const cedTvar = (id, { dx = 0, dy = 0, mrk = 0, oci = "kulate", usta = "usmev", tvare = 0.4, oko = "#3A2E28", odlesk = "#FFF8EE" } = {}) => {
  let s = CED.tvare.map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="7.4" ry="4.8" fill="url(#${id}-tvare)" opacity="${f(clamp(tvare * 1.6))}"/>`).join("");
  const ox = clamp(dx, -2.2, 2.2), oy = clamp(dy, -1.8, 1.8);
  if (oci === "smich") s += `<path d="M75.4 89.4 Q80 83.4 84.6 89.4 M95.4 89.4 Q100 83.4 104.6 89.4" stroke="${oko}" stroke-width="2.4" stroke-linecap="round" fill="none"/>`;
  else if (oci === "zavrene") s += `<path d="M76 84.2 L83.8 88 L76 91.8 M104 84.2 L96.2 88 L104 91.8" stroke="${oko}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
  else if (oci === "spi") s += `<path d="M76 87.6 Q80 91.4 84 87.6 M96 87.6 Q100 91.4 104 87.6" stroke="${oko}" stroke-width="2" stroke-linecap="round" fill="none"/>`;
  else {
    const velke = oci === "siroke";
    const rx = velke ? 4 : 3.3, ry = (velke ? 5.1 : 4.2) * Math.max(0.08, 1 - mrk * 0.94);
    for (const [x, y] of CED.oci) {
      s += `<ellipse cx="${f(x + ox)}" cy="${f(y + oy)}" rx="${rx}" ry="${f(ry)}" fill="${oko}"/>`;
      if (mrk < 0.5) s += `<circle cx="${f(x + ox - (velke ? 1.2 : 1))}" cy="${f(y + oy - (velke ? 2 : 1.7))}" r="${velke ? 1.6 : 1.3}" fill="${odlesk}"/>`;
    }
    if (oci === "prisne") s += `<path d="M75 81.4 L84.6 83.4 M105 81.4 L95.4 83.4" stroke="${oko}" stroke-width="1.8" stroke-linecap="round"/>`;
  }
  if (usta === "o") s += `<ellipse cx="90" cy="101.4" rx="2.6" ry="3.2" fill="#3A1A12"/>`;
  else if (usta === "fuk") s += `<ellipse cx="90" cy="101" rx="1.8" ry="2.2" fill="#3A1A12"/>`;
  else if (usta === "smich") s += `<path d="M84.4 99.2 Q90 107.6 95.6 99.2 Z" fill="#3A1A12" stroke="#3A1A12" stroke-width="1" stroke-linejoin="round"/><path d="M87 103.2 Q90 105.2 93 103.2" stroke="#C4432B" stroke-width="1.5" stroke-linecap="round" fill="none"/>`;
  else if (usta === "rovna") s += `<path d="M86.4 101 H93.6" stroke="${oko}" stroke-width="2" stroke-linecap="round"/>`;
  else if (usta === "smutek") s += `<path d="M85.6 102.4 Q90 98.8 94.4 102.4" stroke="${oko}" stroke-width="2" stroke-linecap="round" fill="none"/>`;
  else if (usta === "kocici") s += `<path d="M84.6 100 Q87.3 103.6 90 100.4 Q92.7 103.6 95.4 100" stroke="${oko}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
  else if (usta === "jazyk") s += `<path d="M91.4 101.6 Q92.6 106.4 95.6 103.8 Q96 101.6 94 101.2 Z" fill="#D9776A" stroke="${oko}" stroke-width="0.8" stroke-linejoin="round"/><path d="M85 100 Q90 103.6 95 100" stroke="${oko}" stroke-width="2" stroke-linecap="round" fill="none"/>`;
  else s += `<path d="M85 100 Q90 104 95 100" stroke="${oko}" stroke-width="2" stroke-linecap="round" fill="none"/>`;
  return s;
};

/** Dva řádky „textu“, nebo jméno psané rukou (Caveat ze stránky). */
const cedRadky = ({ text = null, barva = "#3A2E28", sila = 1 } = {}) =>
  text
    ? `<text x="90" y="129" text-anchor="middle" font-family="Caveat, cursive" font-weight="600" font-size="${text.length > 7 ? 19 : 22}" fill="${barva}" opacity="${f(sila)}">${esc(text)}</text>`
    : `<path d="M68 118 L112 118" stroke="${barva}" stroke-width="2.6" stroke-linecap="round" opacity="${f(0.55 * sila)}"/>` +
      `<path d="M68 127 L98 127" stroke="${barva}" stroke-width="2.2" stroke-linecap="round" opacity="${f(0.35 * sila)}"/>`;

/**
 * Destička otočená o ψ kolem svislé osy (0 = líc, π = rub), v souřadnicích
 * Cedulky. Deska má tloušťku: vzdálenější stěna se posune na druhou stranu
 * a mezi nimi vykoukne hrana. lic/rub jsou funkce, které vrátí obsah.
 */
const otocena = (psi, lic, rub, { obrys = DREVO.obrys, hrana = DREVO.hrana, tloustka = 6, tvar = CED.tvar, osa = 90, jenObsah = false } = {}) => {
  const c = Math.cos(psi), s = Math.sin(psi);
  const sx = Math.max(0.025, Math.abs(c));
  const blizko = (c >= 0 ? 1 : -1) * (tloustka / 2) * s;
  const sk = (dx) => `translate(${f(osa + dx)} 0) scale(${f(sx)} 1) translate(${-osa} 0)`;
  let out = "";
  if (!jenObsah && Math.abs(s) > 0.02) out += `<g transform="${sk(-blizko)}"><path d="${tvar}" fill="${hrana}" stroke="${obrys}" stroke-width="1.6" stroke-linejoin="round"/></g>`;
  out += `<g transform="${sk(blizko)}">${c >= 0 ? lic() : rub()}`;
  if (!jenObsah && sx < 0.97) out += `<path d="${tvar}" fill="#2A1E14" opacity="${f((1 - sx) * 0.32)}"/>`;
  return out + `</g>`;
};

/** Kroucená červenobílá šňůrka; posun točí pruhy (když se destička točí). */
const snurka = (d, { sirka = 2.6, posun = 0, obrys = null } = {}) =>
  (obrys ? `<path d="${d}" stroke="${obrys}" stroke-width="${f(sirka + 1)}" fill="none" stroke-linecap="round"/>` : "") +
  `<path d="${d}" stroke="#B84A2B" stroke-width="${sirka}" fill="none" stroke-linecap="round"/>` +
  `<path d="${d}" stroke="#FBF7EE" stroke-width="${sirka}" fill="none" stroke-dasharray="${f(sirka * 1.15)} ${f(sirka * 1.15)}" stroke-dashoffset="${f(posun)}"/>`;

/**
 * Ručka jako gumová hadice (z Pecinky): z ramene k dlani oblouk, který se
 * prohne, když je ruka blízko.
 */
const rucka = (S, H, { tloustka = 5.2, barva = "#E9D3AE", obrys = "#8A6A48", ohyb = 1, dlan = true } = {}) => {
  const dx = H[0] - S[0], dy = H[1] - S[1];
  const d = Math.hypot(dx, dy) || 1;
  const prohnuti = Math.max(0, 26 - d) * 0.45 * ohyb;
  const M = [(S[0] + H[0]) / 2 - (dy / d) * prohnuti, (S[1] + H[1]) / 2 + (dx / d) * prohnuti];
  const c = `M${pt(S)} Q${pt(M)} ${pt(H)}`;
  return (
    `<path d="${c}" stroke="${obrys}" stroke-width="${f(tloustka + 1.6)}" stroke-linecap="round" fill="none"/>` +
    `<path d="${c}" stroke="${barva}" stroke-width="${tloustka}" stroke-linecap="round" fill="none"/>` +
    (dlan ? `<circle cx="${f(H[0])}" cy="${f(H[1])}" r="${f(tloustka * 0.72)}" fill="${barva}" stroke="${obrys}" stroke-width="0.8"/>` : "")
  );
};

export {
  f, rng, clamp, lerp, smooth, krokem, easeOut, rad, hexRgb, rgbHex, mix, pt, cara, esc, hladka, vzorky, pasPoBodech, tah, hrouda, mrkani, jiskraD, kyvadlo, pruzina, CED, DREVO, cedDefs, cedDeska, cedTvar, cedRadky, otocena, snurka, rucka,
};
