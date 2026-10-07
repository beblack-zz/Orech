/*
 * Šamotka nese — společný základ všech tří podob: pomocníci, Šamotka
 * sama (tělo a tvářička) a pár kusů, které se opakují (shide, slaměný
 * provaz, plamínek). Podoby jsou v kamidana.js, vypal.js a snih.js,
 * dohromady je skládá kresby.js, běh je v beh.js.
 *
 * Pomocníci jsou stejní jako u Pecinky a Kapky (scripts/pecinka-ohen,
 * scripts/kapka-bubny) — každá postavička má svoje, ať se navzájem nehlídají.
 */

/* ——— Pomocníci ——— */
export const f = (n) => Math.round(n * 100) / 100;
export const rng = (a) => () => {
  a |= 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const smooth = (x) => {
  x = clamp(x);
  return x * x * (3 - 2 * x);
};
export const krokem = (a, b, x) => smooth((x - a) / (b - a));
export const easeInOut = (x) => {
  x = clamp(x);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
export const rad = (d) => (d * Math.PI) / 180;
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgbHex = (c) => "#" + c.map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0")).join("");
export const mix = (a, b, k) => {
  const A = hexRgb(a);
  const B = hexRgb(b);
  return rgbHex(A.map((v, i) => v + (B[i] - v) * clamp(k)));
};
/** Barva na stupnici [[poloha, barva], …] */
export const stupnice = (S, x) => {
  const k = clamp(x, S[0][0], S[S.length - 1][0]);
  let i = 0;
  while (i < S.length - 2 && S[i + 1][0] <= k) i++;
  return mix(S[i][1], S[i + 1][1], (k - S[i][0]) / (S[i + 1][0] - S[i][0]));
};
export const pt = (p) => `${f(p[0])} ${f(p[1])}`;
export const cara = (body) => "M" + body.map(pt).join(" L");

/** Catmull-Rom přes body → hladká křivka z kubických Bézierů. */
export const hladka = (P, zavrena = false) => {
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
/** Lomená čára s proměnnou šířkou → uzavřený tvar. sirka(t) pro t 0…1. */
export const pasPoBodech = (B, sirka) => {
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
/** Nepravidelný oblý tvar kolem středu: poloměr kolísá podle seedu. */
export const hrouda = (cx, cy, rx, ry, seed, { bodu = 18, kolisani = 0.14 } = {}) => {
  const r = rng(seed);
  const B = [];
  for (let i = 0; i < bodu; i++) {
    const u = (i / bodu) * Math.PI * 2;
    const k = 1 + (r() - 0.5) * 2 * kolisani;
    B.push([cx + Math.cos(u) * rx * k, cy + Math.sin(u) * ry * k]);
  }
  return hladka(B, true);
};
/** Obdélník se zaoblenými rohy jako cesta (kvůli ořezům a obrysům). */
export const zaobleny = (x, y, w, h, r) =>
  `M${f(x + r)} ${f(y)} H${f(x + w - r)} A${r} ${r} 0 0 1 ${f(x + w)} ${f(y + r)} V${f(y + h - r)} A${r} ${r} 0 0 1 ${f(x + w - r)} ${f(y + h)} H${f(x + r)} A${r} ${r} 0 0 1 ${f(x)} ${f(y + h - r)} V${f(y + r)} A${r} ${r} 0 0 1 ${f(x + r)} ${f(y)} Z`;

/**
 * Jeden jazyk plamene (stejný jako u Pecinky): vyrazí ze základny B ve
 * směru th0, stáčí se vzhůru a na konci do háčku. Vrací obrys i střední čáru.
 */
export const jazyk = ({ B, th0, L, W, c = 1, stoupani = 0.8, stoc = 2.1, vitr = 0, vlna = 0.24, t = 0, w = 3, fz = 0, N = 18, zuzeni = 0.55 }) => {
  let dUp = -Math.PI / 2 - th0;
  while (dUp > Math.PI) dUp -= Math.PI * 2;
  while (dUp < -Math.PI) dUp += Math.PI * 2;
  const body = [];
  let x = B[0], y = B[1];
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    body.push([x, y]);
    const th =
      th0 +
      dUp * stoupani * smooth(s * 1.15) +
      c * stoc * Math.pow(krokem(0.5, 1, s), 1.5) +
      vitr * Math.pow(s, 1.25) +
      vlna * s * Math.sin(t * w + fz - s * 3.4);
    x += (Math.cos(th) * L) / N;
    y += (Math.sin(th) * L) / N;
  }
  const d = pasPoBodech(body, (s) => W * (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, s * 0.95))) * Math.pow(1 - s, zuzeni));
  return { d, body };
};

/** Čtyřcípá jiskra kolem počátku. */
export const jiskraD = (r) => `M0 ${f(-r)} Q${f(r * 0.22)} ${f(-r * 0.22)} ${f(r)} 0 Q${f(r * 0.22)} ${f(r * 0.22)} 0 ${f(r)} Q${f(-r * 0.22)} ${f(r * 0.22)} ${f(-r)} 0 Q${f(-r * 0.22)} ${f(-r * 0.22)} 0 ${f(-r)} Z`;

/** Žár podle teploty 0…1: tmavě rudá, třešňová, oranžová, žlutá, skoro bílá. */
const ZAR = [[0, "#4A120A"], [0.2, "#8E1E10"], [0.4, "#D2401A"], [0.6, "#FF7F24"], [0.8, "#FFBE55"], [1, "#FFF0C2"]];
export const zar = (T) => stupnice(ZAR, T);

/* ═══════════════════════════════════════════════════════════════════
 * ŠAMOTKA
 * Původní kresba (characters/Samotka.astro): deska 132 × 34 na plátně
 * 180 × 180, pod ní tmavší pruh spodku, dvě skvrny po hrncích a zavřená
 * očka. Všechno se kreslí v jejích souřadnicích a do scény se posadí přes
 * vSamotce(FIG): bod (90, 102) — střed desky — padne na FIG.x, FIG.y.
 *
 * Je z šamotu, tedy z pálené hlíny rozdrcené na zrno a vypálené znovu.
 * Každé zrnko v ní kdysi bývalo hrnkem — proto má v těle vidět zrno.
 * Nahoře nese tenký bílý nátěr, který chrání desku před stékající glazurou.
 * ═══════════════════════════════════════════════════════════════════ */
export const SAM = {
  telo: { x: 24, y: 82, w: 132, h: 34, rx: 5 },
  spodek: { x: 24, y: 110, w: 132, h: 12, rx: 4 },
  vrch: 82,
  dno: 122,
  levy: 24,
  pravy: 156,
  oci: [[80, 93], [100, 93]],
  usta: [90, 105],
  tvare: [[71.5, 101.4], [108.5, 101.4]],
};
export const TELO_D = zaobleny(24, 82, 132, 34, 5);
const SPODEK_D = zaobleny(24, 110, 132, 12, 4);
/** Celý obrys včetně spodního pruhu — na ořez a na žár. */
export const OBRYS_D = `M29 82 H151 A5 5 0 0 1 156 87 V118 A4 4 0 0 1 152 122 H28 A4 4 0 0 1 24 118 V87 A5 5 0 0 1 29 82 Z`;

export const vSamotce = (FIG) => (s) => `<g transform="translate(${f(FIG.x)} ${f(FIG.y)}) scale(${FIG.s}) translate(-90 -102)">${s}</g>`;
/** Bod v jejích souřadnicích → bod ve scéně. */
export const naScenu = (FIG) => ([x, y]) => [FIG.x + (x - 90) * FIG.s, FIG.y + (y - 102) * FIG.s];

/** Přechody a filtr těla. Id dostávají prefix podoby (sn1, sn2, sn3). */
export const samotkaDefs = (id, { svetla = "#F5EBD6", stred = "#E6D5B8", tmava = "#D0BC9A", tah = 2 } = {}) =>
  `<linearGradient id="${id}-deska" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${svetla}"/><stop offset="0.55" stop-color="${stred}"/><stop offset="1" stop-color="${tmava}"/></linearGradient>` +
  `<linearGradient id="${id}-spodek" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C9B79C"/><stop offset="1" stop-color="#B3A083"/></linearGradient>` +
  `<radialGradient id="${id}-tvare" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#E9846A" stop-opacity="0.85"/><stop offset="0.6" stop-color="#E9846A" stop-opacity="0.35"/><stop offset="1" stop-color="#E9846A" stop-opacity="0"/></radialGradient>` +
  `<clipPath id="${id}-sam-orez"><path d="${OBRYS_D}"/></clipPath>` +
  `<filter id="${id}-tah" x="-8%" y="-8%" width="116%" height="116%" color-interpolation-filters="sRGB">` +
  `<feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="4" result="vlna"/>` +
  `<feDisplacementMap in="SourceGraphic" in2="vlna" scale="${tah}" xChannelSelector="R" yChannelSelector="G" result="tah"/>` +
  `<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="11" result="zrno"/>` +
  `<feColorMatrix in="zrno" type="matrix" values="0 0 0 0 0.23  0 0 0 0 0.18  0 0 0 0 0.16  0.6 0 0 0 -0.26" result="skvrny"/>` +
  `<feComposite in="skvrny" in2="tah" operator="in" result="zrnoVTvaru"/>` +
  `<feMerge><feMergeNode in="tah"/><feMergeNode in="zrnoVTvaru"/></feMerge></filter>`;

/* Zrno šamotu: rezavé, hnědé a šedé tečky, kolem tvářičky řidší */
const ZRNO = (() => {
  const r = rng(5203);
  const Z = [];
  let pokusu = 0;
  while (Z.length < 74 && pokusu++ < 2000) {
    const x = 27 + r() * 126, y = 85 + r() * 34;
    const uTvare = x > 68 && x < 112 && y > 86 && y < 110;
    if (uTvare && r() < 0.85) continue;
    const barva = ["#A0805E", "#8A6A52", "#B5764E", "#7E7468", "#C9A27E"][Math.floor(r() * 5)];
    Z.push([x, y, 0.35 + r() * 0.6, barva, 0.35 + r() * 0.45]);
  }
  return Z;
})();

/**
 * Tělo Šamotky v jejích souřadnicích. Bez tvářičky — ta je zvlášť, aby se
 * dala překreslovat. skvrny: [[x, y, rx, ry, barva, průhlednost], …]
 */
export const samotkaTelo = (id, { obrys = "#6B5D4F", skvrny = null, filtr = true, zrno = true, natery = true } = {}) => {
  const sk = skvrny || [
    [50, 94, 13, 6, "#6B5D4F", 0.2],
    [134, 100, 10, 5, "#6B5D4F", 0.16],
  ];
  const vnitrek =
    (zrno ? `<g>${ZRNO.map(([x, y, r, b, o]) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${b}" opacity="${f(o)}"/>`).join("")}</g>` : "") +
    sk.map(([x, y, rx, ry, b, o]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${b}" opacity="${o}"/>`).join("") +
    (natery ? `<path d="M27 83.4 H153" stroke="#FBF7EE" stroke-width="2.2" stroke-linecap="round" opacity="0.7"/><path d="M30 85.4 H150" stroke="#FBF7EE" stroke-width="0.6" opacity="0.4" stroke-dasharray="7 3 2 4"/>` : "");
  return (
    `<g${filtr ? ` filter="url(#${id}-tah)"` : ""}>` +
    `<path d="${TELO_D}" fill="url(#${id}-deska)" stroke="${obrys}" stroke-width="1.5"/>` +
    `<path d="${SPODEK_D}" fill="url(#${id}-spodek)"/>` +
    `<g clip-path="url(#${id}-sam-orez)">${vnitrek}</g>` +
    `<path d="M26 110.6 H154" stroke="${obrys}" stroke-width="0.6" opacity="0.35"/>` +
    `</g>`
  );
};

/**
 * Tvářička Šamotky v jejích souřadnicích.
 *   oci:  klid (zavřená do úsměvu) | spi | blaho | au | pokuk | otevrene
 *   usta: usmev | velky | o | vlnka | rovna | spi | au
 * tvare 0…1 je ruměnec, pohled [dx, dy] posouvá otevřená očka.
 */
export const samotkaTvar = (id, { oci = "klid", usta = "usmev", tvare = 0.3, pohled = [0, 0], mrk = 0, barva = "#3A2E28", odlesk = "#FFF6E4" } = {}) => {
  let s = "";
  if (tvare > 0.01) s += SAM.tvare.map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="6.2" ry="3.6" fill="url(#${id}-tvare)" opacity="${f(clamp(tvare))}"/>`).join("");
  const [L, P] = SAM.oci;
  const dx = clamp(pohled[0], -1.8, 1.8), dy = clamp(pohled[1], -1.4, 1.4);
  const otevreneOko = ([x, y], velke) => {
    const rx = velke ? 3 : 2.6, ry = (velke ? 3.8 : 3.2) * Math.max(0.1, 1 - mrk * 0.92);
    let o = `<ellipse cx="${f(x + dx)}" cy="${f(y + dy)}" rx="${rx}" ry="${f(ry)}" fill="${barva}"/>`;
    if (mrk < 0.5) o += `<circle cx="${f(x + dx - 0.9)}" cy="${f(y + dy - 1.4)}" r="${velke ? 1.25 : 1.05}" fill="${odlesk}"/>`;
    if (velke && mrk < 0.5) o += `<circle cx="${f(x + dx + 1)}" cy="${f(y + dy + 1.3)}" r="0.55" fill="${odlesk}" opacity="0.8"/>`;
    return o;
  };
  const oblouk = ([x, y], k = 1) => `M${f(x - 4)} ${f(y + 1)} Q${x} ${f(y + 1 - 5 * k)} ${f(x + 4)} ${f(y + 1)}`;
  if (oci === "klid") s += `<path d="${oblouk(L)} ${oblouk(P)}" stroke="${barva}" stroke-width="2.5" stroke-linecap="round" fill="none"/>`;
  else if (oci === "blaho") s += `<path d="${oblouk(L, 1.25)} ${oblouk(P, 1.25)}" stroke="${barva}" stroke-width="2.6" stroke-linecap="round" fill="none"/><path d="M${L[0] - 5.4} ${L[1] - 0.6} l-1.4 -1.2 M${P[0] + 5.4} ${P[1] - 0.6} l1.4 -1.2" stroke="${barva}" stroke-width="1" stroke-linecap="round"/>`;
  else if (oci === "spi") s += `<path d="M${L[0] - 4} ${L[1] - 0.6} Q${L[0]} ${L[1] + 3.4} ${L[0] + 4} ${L[1] - 0.6} M${P[0] - 4} ${P[1] - 0.6} Q${P[0]} ${P[1] + 3.4} ${P[0] + 4} ${P[1] - 0.6}" stroke="${barva}" stroke-width="2.2" stroke-linecap="round" fill="none"/>`;
  else if (oci === "au") s += `<path d="M${L[0] - 3.6} ${L[1] - 3} L${L[0] + 3.2} ${L[1]} L${L[0] - 3.6} ${L[1] + 3} M${P[0] + 3.6} ${P[1] - 3} L${P[0] - 3.2} ${P[1]} L${P[0] + 3.6} ${P[1] + 3}" stroke="${barva}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
  else if (oci === "pokuk") s += `<path d="${oblouk(L)}" stroke="${barva}" stroke-width="2.5" stroke-linecap="round" fill="none"/>` + otevreneOko(P, false);
  else if (oci === "otevrene") s += otevreneOko(L, true) + otevreneOko(P, true);
  const [ux, uy] = SAM.usta;
  if (usta === "velky") s += `<path d="M${ux - 7.4} ${uy - 2} Q${ux} ${uy + 7.6} ${ux + 7.4} ${uy - 2} Z" fill="${barva}" stroke="${barva}" stroke-width="1" stroke-linejoin="round"/><path d="M${ux - 3.6} ${uy + 2.3} Q${ux} ${uy + 4.6} ${ux + 3.6} ${uy + 2.3}" stroke="#C4432B" stroke-width="1.7" stroke-linecap="round" fill="none"/>`;
  else if (usta === "o") s += `<ellipse cx="${ux}" cy="${uy + 0.4}" rx="2.4" ry="3" fill="${barva}"/>`;
  else if (usta === "spi") s += `<ellipse cx="${ux}" cy="${uy + 0.6}" rx="1.5" ry="1.8" fill="${barva}" opacity="0.85"/>`;
  else if (usta === "vlnka") s += `<path d="M${ux - 6.4} ${uy + 0.4} q1.6 -2 3.2 0 t3.2 0 t3.2 0 t3.2 0" stroke="${barva}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
  else if (usta === "rovna") s += `<path d="M${ux - 5} ${uy} H${ux + 5}" stroke="${barva}" stroke-width="2" stroke-linecap="round"/>`;
  else if (usta === "au") s += `<path d="M${ux - 5} ${uy + 1.4} L${ux - 2.5} ${uy - 0.6} L${ux} ${uy + 1.4} L${ux + 2.5} ${uy - 0.6} L${ux + 5} ${uy + 1.4}" stroke="${barva}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
  else s += `<path d="M${ux - 7} ${uy - 1} Q${ux} ${uy + 4} ${ux + 7} ${uy - 1}" stroke="${barva}" stroke-width="2" stroke-linecap="round" fill="none"/>`;
  return s;
};

/* ——— Shimenawa a shide (jako na kami podobách party) ——— */
export const SHIDE_D = "M-4 0 h5 v6 h3 v6 h-3 v6 h3 v6 h-5 v-6 h-3 v-6 h3 v-6 h-3 Z";
export const shide = (x, y, uhel = 0, { papir = "#FBF7EE", obrys = "#8A7A69", meritko = 1 } = {}) =>
  `<path d="${SHIDE_D}" transform="translate(${f(x)} ${f(y)}) rotate(${f(uhel)}) scale(${meritko})" fill="${papir}" stroke="${obrys}" stroke-width="${f(0.7 / meritko)}" stroke-linejoin="round"/>`;
/** Slaměný provaz po cestě d: tmavší okraj, světlá sláma, přes ni zákrut. */
export const provaz = (d, { sirka = 5, tmava = "#C9B186", svetla = "#EBDDB8" } = {}) =>
  `<path d="${d}" stroke="${tmava}" stroke-width="${f(sirka * 1.3)}" stroke-linecap="round" fill="none"/>` +
  `<path d="${d}" stroke="${svetla}" stroke-width="${sirka}" stroke-linecap="round" fill="none"/>` +
  `<path d="${d}" stroke="${tmava}" stroke-width="${sirka}" stroke-dasharray="${f(sirka * 0.32)} ${f(sirka * 0.88)}" fill="none"/>`;

/** Ruční linka (jen vlnění, bez zrna) — na věci kolem postavy. */
export const filtrLinka = (id, { posun = 2.2, seed = 4 } = {}) =>
  `<filter id="${id}" x="-8%" y="-8%" width="116%" height="116%"><feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="${seed}" result="vlna"/><feDisplacementMap in="SourceGraphic" in2="vlna" scale="${posun}" xChannelSelector="R" yChannelSelector="G"/></filter>`;
