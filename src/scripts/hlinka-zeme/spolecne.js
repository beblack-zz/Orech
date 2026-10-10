/*
 * Hlínka, kami země — společné kusy nových kreseb (./lem-ruce.js
 * a ./lampion.js): pomocníci, hrouda s výhonkem, tvář
 * s výrazy, zetka, tušový lem a Hlínka jako nádoba, kterou jde vytočit
 * do jiného tvaru.
 *
 * Pomocníci a původní kresba jsou opsaní z ./kresby.js, kde je mají starší
 * tři podoby (sakura, drak, suikinkutsu) ještě u sebe.
 */

/* ——— Pomocníci (stejní jako u Pecinky) ——— */
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
/** Kruh jako podcesta — hodně kruhů v jedné <path> je levnější než stejně <circle>. */
const f1 = (n) => Math.round(n * 10) / 10;
const kruhD = (x, y, r) => `M${f1(x - r)} ${f1(y)}a${f1(r)} ${f1(r)} 0 1 0 ${f1(2 * r)} 0a${f1(r)} ${f1(r)} 0 1 0 ${f1(-2 * r)} 0`;
/** Bod p otočený o úhel a (radiány, kladný po směru hodinek jako v SVG) kolem bodu o. */
const otoc = (p, a, o) => {
  const c = Math.cos(a), s = Math.sin(a);
  const x = p[0] - o[0], y = p[1] - o[1];
  return [o[0] + x * c - y * s, o[1] + x * s + y * c];
};

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
/** Body na téže křivce (Catmull-Rom), n na úsek — pro pásy s proměnnou šířkou. */
const vzorkuj = (P, n = 8) => {
  const N = P.length;
  const g = (i) => P[clamp(i, 0, N - 1)];
  const out = [];
  for (let i = 0; i < N - 1; i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    for (let k = 0; k < n; k++) {
      const t = k / n, u = 1 - t;
      out.push([
        u * u * u * p1[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p2[0],
        u * u * u * p1[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p2[1],
      ]);
    }
  }
  out.push(P[N - 1]);
  return out;
};
/** Bod a směr ve zlomku s délky lomené čáry. */
const naCare = (B, s) => {
  const D = [0];
  for (let i = 1; i < B.length; i++) D.push(D[i - 1] + Math.hypot(B[i][0] - B[i - 1][0], B[i][1] - B[i - 1][1]));
  const cil = clamp(s) * D[D.length - 1];
  let i = 1;
  while (i < B.length - 1 && D[i] < cil) i++;
  const k = (cil - D[i - 1]) / (D[i] - D[i - 1] || 1);
  const a = B[i - 1], b = B[i];
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  return { p: [lerp(a[0], b[0], k), lerp(a[1], b[1], k)], smer: [(b[0] - a[0]) / d, (b[1] - a[1]) / d] };
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
/**
 * Jeden jazyk plamene (z Pecinky s ohněm): vyrazí ze základny B ve směru
 * th0, stáčí se vzhůru a na konci do háčku. Tady z něj je ohnivá aura perly.
 */
const jazyk = ({ B, th0, L, W, c = 1, stoupani = 0.8, stoc = 2.1, vitr = 0, vlna = 0.24, t = 0, w = 3, fz = 0, N = 14, zuzeni = 0.55 }) => {
  let dUp = -Math.PI / 2 - th0;
  while (dUp > Math.PI) dUp -= Math.PI * 2;
  while (dUp < -Math.PI) dUp += Math.PI * 2;
  const body = [];
  let x = B[0], y = B[1];
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    body.push([x, y]);
    const th = th0 + dUp * stoupani * smooth(s * 1.15) + c * stoc * Math.pow(krokem(0.5, 1, s), 1.5) + vitr * Math.pow(s, 1.25) + vlna * s * Math.sin(t * w + fz - s * 3.4);
    x += (Math.cos(th) * L) / N;
    y += (Math.sin(th) * L) / N;
  }
  return pasPoBodech(body, (s) => W * (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, s * 0.95))) * Math.pow(1 - s, zuzeni));
};
/** Rozdíl úhlů zkrácený do −π…π. */
const uhelRozdil = (a, b) => {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
};
/** Tlumená pružina: kam se dostane hodnota x s rychlostí v za dt, když ji táhne k cíli. */
const pruzina = (x, v, cil, dt, tuhost, tlumeni) => {
  const a = -tuhost * (x - cil) - tlumeni * v;
  v += a * dt;
  return [x + v * dt, v];
};

/** Pětilistý kvítek sakury se zoubkem na každém plátku; r je délka plátku, a natočení. */
const kvetD = (cx, cy, r, a = 0) => {
  let d = "";
  for (let i = 0; i < 5; i++) {
    const u = a + (i * 2 * Math.PI) / 5;
    const c = Math.cos(u), sn = Math.sin(u);
    const P = (x, y) => pt([cx + x * c - y * sn, cy + x * sn + y * c]);
    d += `M${P(0, 0)} C${P(-0.55 * r, -0.2 * r)} ${P(-0.64 * r, -0.86 * r)} ${P(-0.2 * r, -r)} L${P(0, -0.82 * r)} L${P(0.2 * r, -r)} C${P(0.64 * r, -0.86 * r)} ${P(0.55 * r, -0.2 * r)} ${P(0, 0)} Z`;
  }
  return d;
};
/** Okvětní lístek sakury se zoubkem na špičce, kolem počátku. */
const LISTEK = "M0 -2.2 C1.4 -1.9 1.7 0.6 0 2.2 C-1.7 0.6 -1.4 -1.9 0 -2.2 Z M0 -2.2 L0.5 -1.5 L0 -1.7 L-0.5 -1.5 Z";

/* ═══════════════════════════════════════════════════════════════════
 * Hlínka: původní kresba (characters/kami/Hlinka.astro). Hrouda r 48
 * kolem (90, 98), nožky na y 144 (spodek 149), výhonek od temene (y 54)
 * do y 28. Všechno v jejích souřadnicích 0–180, na místo ji posadí
 * transform jako u Pecinky.
 * ═══════════════════════════════════════════════════════════════════ */
const HL = { oci: [[78, 93], [102, 93]], spodek: 149 };

const hlDefs = (id, { svetla = "#8A7A69", stred = "#6B5D4F", tmava = "#52463B", tvare = "#C87E4E" } = {}) =>
  `<radialGradient id="${id}-telo" cx="0.36" cy="0.3" r="0.8"><stop offset="0" stop-color="${svetla}"/><stop offset="0.55" stop-color="${stred}"/><stop offset="1" stop-color="${tmava}"/></radialGradient>` +
  `<radialGradient id="${id}-tvare"><stop offset="0" stop-color="${tvare}" stop-opacity="0.85"/><stop offset="1" stop-color="${tvare}" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="${id}-svetylko"><stop offset="0" stop-color="#FFF6D2" stop-opacity="0.95"/><stop offset="0.3" stop-color="#F2DC94" stop-opacity="0.5"/><stop offset="1" stop-color="#F2DC94" stop-opacity="0"/></radialGradient>`;

/** Hrouda se skvrnami, jak je na původní kresbě. */
const hlTelo = (id, { obrys = "#4A3F35" } = {}) =>
  `<circle cx="90" cy="98" r="48" fill="url(#${id}-telo)" stroke="${obrys}" stroke-width="1.6"/>` +
  `<circle cx="70" cy="80" r="8" fill="#9A8A78" opacity="0.4"/><circle cx="108" cy="112" r="6" fill="#7D6E5F" opacity="0.4"/><circle cx="82" cy="120" r="5" fill="#5A4E42" opacity="0.3"/>`;
const hlNohy = (barva = "#4F443A") => `<ellipse cx="76" cy="144" rx="11" ry="5" fill="${barva}"/><ellipse cx="104" cy="144" rx="11" ry="5" fill="${barva}"/>`;

/** Výhonek na temeni. kyv ve stupních kolem kořínku (90, 54). */
const hlVyhonek = ({ kyv = 0, stonek = "#6E7A4E", list1 = "#8A9466", list2 = "#9AA375", zilka = "#C7CC9E" } = {}) =>
  `<g transform="rotate(${f(kyv)} 90 54)">` +
  `<path d="M90 54 C89 44 91 38 95 32" stroke="${stonek}" stroke-width="2.2" stroke-linecap="round" fill="none"/>` +
  `<path d="M94 36 C100 28 110 28 114 31 C108 37 100 39 94 36 Z" fill="${list1}" stroke="${stonek}" stroke-width="1"/>` +
  `<path d="M92 42 C86 35 78 35 74 38 C79 43 87 45 92 42 Z" fill="${list2}" stroke="${stonek}" stroke-width="1"/>` +
  `<path d="M95.5 35.2 Q104 31.6 112 31.2 M90.6 41 Q83 37.6 76.4 38.2" stroke="${zilka}" stroke-width="0.7" stroke-linecap="round" fill="none" opacity="0.8"/>` +
  `</g>`;

/** „z“ jako tah, ne písmo — písma webu se do kresby nedostanou. */
const zetko = (x, y, s, op, barva = "#6B5D4F") =>
  `<path d="M${f(x)} ${f(y)} h${f(5 * s)} l${f(-5 * s)} ${f(6 * s)} h${f(5 * s)}" stroke="${barva}" stroke-width="${f(1.6 * s)}" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="${f(op)}"/>`;
/** Tři zetka stoupají z hrdla a mizí, perioda 3,6 s. */
const zzz = (t, x, y, { barva = "#6B5D4F", meritko = 1, sila = 1 } = {}) => {
  let s = "";
  for (let i = 0; i < 3; i++) {
    const u = (((t / 3.6 + i / 3) % 1) + 1) % 1;
    const op = Math.sin(Math.PI * u) * sila;
    if (op < 0.03) continue;
    s += zetko(x + u * 10 * meritko + Math.sin(u * 6 + i) * 2 * meritko, y - u * 22 * meritko, (0.7 + u * 0.6) * meritko, op, barva);
  }
  return s;
};
/** Světýlko, které kolem Hlínky plave, dokud spí. */
const svetylko = (id, x, y, r = 2.2, op = 1) =>
  `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 4.6)}" fill="url(#${id}-svetylko)" opacity="${f(op)}"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 0.48)}" fill="#FFFBEA" opacity="${f(op)}"/>`;

/**
 * Tvářička v souřadnicích původní kresby.
 * oci: spi (zavřená do úsměvu, jako na původní kresbě) | tvrde (hluboký
 *      spánek) | ospale | otevrene | siroke | smich | kych (přimhouřená)
 * usta: usmev | o | zev | vlnka | ach | kych | spanek
 */
const hlTvar = (id, { oci = "spi", usta = "usmev", mrk = 0, dx = 0, dy = 0, tvare = 0.45, linka = "#F4EBDD", zrenicka = "#2B2420", odlesk = null } = {}) => {
  let s = `<g fill="url(#${id}-tvare)" opacity="${f(clamp(tvare))}"><ellipse cx="68" cy="104" rx="9" ry="6"/><ellipse cx="112" cy="104" rx="9" ry="6"/></g>`;
  const ox = clamp(dx, -2.2, 2.2), oy = clamp(dy, -1.8, 1.8);
  const tah = (d, w = 2.5) => `<path d="${d}" stroke="${linka}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
  if (oci === "spi") s += tah("M72 94 Q78 90 84 94 M96 94 Q102 90 108 94");
  else if (oci === "tvrde") s += tah("M72 92.4 Q78 96.6 84 92.4 M96 92.4 Q102 96.6 108 92.4");
  else if (oci === "smich") s += tah("M71.6 95.4 Q78 88 84.4 95.4 M95.6 95.4 Q102 88 108.4 95.4", 2.8);
  else if (oci === "kych") s += tah("M72.6 89.6 L81.4 93.4 L72.6 97.2 M107.4 89.6 L98.6 93.4 L107.4 97.2", 2.4);
  else if (oci === "ospale") {
    for (const [x, y] of HL.oci) {
      s += `<path d="M${x - 5.4} ${y} Q${x} ${y + 5.4} ${x + 5.4} ${y} Z" fill="${linka}"/>`;
      s += `<circle cx="${f(x + ox * 0.6)}" cy="${f(y + 1.6)}" r="2" fill="${zrenicka}"/>`;
      s += tah(`M${x - 6} ${y - 0.4} Q${x} ${y - 1.6} ${x + 6} ${y - 0.4}`, 1.8);
    }
  } else {
    const velke = oci === "siroke";
    const rx = velke ? 5 : 4.3, ry = (velke ? 5.8 : 5) * Math.max(0.06, 1 - mrk * 0.95);
    for (const [x, y] of HL.oci) {
      s += `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${f(ry)}" fill="${linka}"/>`;
      if (mrk < 0.6) {
        const pr = velke ? 2.3 : 2.6;
        s += `<circle cx="${f(x + ox)}" cy="${f(y + oy * Math.max(0.2, 1 - mrk))}" r="${f(pr * Math.max(0.3, 1 - mrk))}" fill="${zrenicka}"/>`;
        s += `<circle cx="${f(x + ox - 1.1)}" cy="${f(y + oy - 1.4)}" r="1.05" fill="#FFFFFF"/>`;
        if (odlesk) s += `<circle cx="${f(x + ox * 1.3 + 0.8)}" cy="${f(y + oy * 1.3 + 1)}" r="0.8" fill="${odlesk.barva}" opacity="${f(odlesk.sila)}"/>`;
      }
    }
  }
  const pusa = "#3A2A22";
  if (usta === "o") s += `<ellipse cx="90" cy="109.6" rx="2.8" ry="3.3" fill="${pusa}" stroke="${linka}" stroke-width="1.3"/>`;
  else if (usta === "spanek") s += `<ellipse cx="90" cy="109.4" rx="1.9" ry="2.1" fill="${pusa}" stroke="${linka}" stroke-width="1.1"/>`;
  else if (usta === "zev") s += `<ellipse cx="90" cy="110.4" rx="4.4" ry="5.6" fill="${pusa}" stroke="${linka}" stroke-width="1.4"/><ellipse cx="90" cy="113.6" rx="2.6" ry="1.6" fill="#C46A5A"/>`;
  else if (usta === "vlnka") s += tah("M84.4 109.4 Q86.6 107.2 88.8 109.2 Q91 111.2 93.2 109.2 Q94.6 108 95.8 108.8", 1.8);
  else if (usta === "ach") s += `<path d="M84.2 107.2 Q90 116.4 95.8 107.2 Z" fill="${pusa}" stroke="${linka}" stroke-width="1.4" stroke-linejoin="round"/><path d="M87 111.6 Q90 113.6 93 111.6" stroke="#C46A5A" stroke-width="1.6" stroke-linecap="round" fill="none"/>`;
  else if (usta === "kych") s += `<ellipse cx="90" cy="110" rx="4.6" ry="4.2" fill="${pusa}" stroke="${linka}" stroke-width="1.4"/>` + tah("M62 112 L55 115 M60 104 L52 104 M118 112 L125 115 M120 104 L128 104", 1.6);
  else s += tah("M85 108 Q90 112 95 108", 1.8);
  return s;
};

/* ——— Co přibylo s novými podobami ——— */
/** Pružina k cíli, nezávislá na snímkovce: k je časová konstanta v sekundách. */
export const kCili = (v, cil, dt, k) => v + (cil - v) * (1 - Math.exp(-dt / k));
/** Překročil čas mezi dvěma snímky hranici x? */
export const pres = (a, b, x) => a < x && b >= x;
/** Délky od začátku lomené čáry ke každému jejímu bodu. */
export const delky = (B) => {
  const D = [0];
  for (let i = 1; i < B.length; i++) D.push(D[i - 1] + Math.hypot(B[i][0] - B[i - 1][0], B[i][1] - B[i - 1][1]));
  return D;
};
/** Bod na lomené čáře v délce s od začátku (D jsou délky z `delky`). */
export const bodNaCare = (B, D, s) => {
  if (s <= 0) return B[0];
  for (let i = 1; i < B.length; i++) {
    if (D[i] >= s) {
      const k = (s - D[i - 1]) / (D[i] - D[i - 1] || 1);
      return [lerp(B[i - 1][0], B[i][0], k), lerp(B[i - 1][1], B[i][1], k)];
    }
  }
  return B[B.length - 1];
};

/**
 * Tušový lem jako u Pecinčina raku a Střípkovy prasklé noci: skvrna rozpité
 * tuše, v ní celá scéna. Vrací cestu skvrny, vrstvu pod scénu a definice
 * filtrů a ořezu (`${id}-tus-orez`), kterým se scéna ořízne.
 */
export const tusLem = (id, { seed = 4, barva = "#241E29", lem = "#3A3240", stred = [90, 92], polomer = [86, 85], skvrny = [0.09, 0.09, 0.15], silaSkvrn = 1.5 } = {}) => {
  const D = hrouda(stred[0], stred[1], polomer[0], polomer[1], seed, { bodu: 30, kolisani: 0.05 });
  return {
    D,
    skvrna:
      `<path d="${hrouda(stred[0], stred[1], polomer[0] + 4, polomer[1] + 4, seed + 5, { bodu: 30, kolisani: 0.06 })}" fill="${lem}" opacity="0.55" filter="url(#${id}-tus-lem)"/>` +
      `<path d="${D}" fill="${barva}" filter="url(#${id}-tus)"/>`,
    defs:
      `<filter id="${id}-tus" x="-12%" y="-12%" width="124%" height="124%" color-interpolation-filters="sRGB">` +
      `<feTurbulence type="fractalNoise" baseFrequency="0.055" numOctaves="4" seed="${seed + 4}" result="n"/>` +
      `<feDisplacementMap in="SourceGraphic" in2="n" scale="13" xChannelSelector="R" yChannelSelector="G" result="d"/>` +
      `<feGaussianBlur in="d" stdDeviation="0.55" result="b"/>` +
      `<feTurbulence type="fractalNoise" baseFrequency="0.018 0.05" numOctaves="2" seed="3" result="m"/>` +
      `<feColorMatrix in="m" type="matrix" values="0 0 0 0 ${skvrny[0]}  0 0 0 0 ${skvrny[1]}  0 0 0 0 ${skvrny[2]}  0 0 0 ${silaSkvrn} -0.62" result="skvrny"/>` +
      `<feComposite in="skvrny" in2="b" operator="in" result="sk"/>` +
      `<feMerge><feMergeNode in="b"/><feMergeNode in="sk"/></feMerge></filter>` +
      `<filter id="${id}-tus-lem" x="-15%" y="-15%" width="130%" height="130%"><feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="${seed + 17}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="16" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation="2.4"/></filter>` +
      `<clipPath id="${id}-tus-orez"><path d="${D}"/></clipPath>`,
  };
};

/* ═══════════════════════════════════════════════════════════════════
 * Hlínka jako nádoba. Hrouda je rotační těleso: profil říká, jak je
 * široká v jedenácti výškách odspodu nahoru, a z něj se kreslí obrys,
 * otvor, víčko i místo pro tvář. Dva profily jdou smíchat, takže ji jde
 * na kruhu vytočit z hroudy do misky a zase nechat splasknout.
 * Souřadnice jsou rovnou v jednotkách scény: `dno` je místo, kde sedí,
 * hrouda má poloměr 22 (původní kresba v měřítku 0,46).
 * ═══════════════════════════════════════════════════════════════════ */
/** Jak moc se díváme shora: poměr os elips okraje, dna a hlavy kruhu. */
export const SKLON = 0.2;
const NADOBA0 = { otvor: 0, vicko: 0, hubicka: 0, ucho: 0, tvarU: 0.5, tvarSy: 1 };
/**
 * H výška, r poloměry odspodu nahoru, otvor 0…1 (je nahoře díra?), vicko,
 * hubicka a ucho 0…1 (jak moc jsou vytažené), tvarU výška tváře, tvarSy
 * její zploštění.
 */
export const NADOBY = Object.fromEntries(
  Object.entries({
    hrouda: { H: 42, r: [10, 15.5, 19, 20.8, 21.8, 22, 21.6, 20.2, 17.6, 12.6, 0] },
    /* středění: kužel nahoru a bochník dolů */
    kuzel: { H: 49, r: [15.4, 18.2, 19, 18.6, 17.6, 16.2, 14.6, 12.6, 10.2, 7, 0], tvarU: 0.4 },
    bochnik: { H: 33, r: [17.6, 22, 24.2, 25, 25, 24.4, 23.2, 21, 17.6, 12, 0], tvarU: 0.52 },
    cawan: { H: 25, r: [8.6, 9.4, 15.5, 19.4, 21.2, 22, 22.4, 22.7, 22.9, 23.1, 23.3], otvor: 1, tvarU: 0.56 },
    junomi: { H: 32, r: [9.6, 10.6, 13.4, 14.2, 14.6, 14.8, 15, 15.2, 15.4, 15.6, 15.8], otvor: 1, tvarU: 0.5 },
    konvicka: { H: 30, r: [11, 16.5, 19.8, 21.6, 22.4, 22.4, 21.4, 19.2, 15.6, 11.6, 9.4], vicko: 1, hubicka: 1, ucho: 1, tvarU: 0.47 },
    tsubo: { H: 45, r: [11, 15, 19.2, 22.2, 24, 24.6, 23.4, 19.8, 14.4, 11.4, 12.8], otvor: 1, tvarU: 0.45 },
    vaza: { H: 58, r: [10, 14.4, 17.6, 19, 18.6, 16, 12, 8.4, 6.2, 5.8, 8.2], otvor: 1, tvarU: 0.3 },
    /* když se to nepovede: placka, tvář se dívá nahoru */
    placka: { H: 8, r: [29, 32, 33.4, 34, 34, 34, 34, 33.8, 33.4, 32.6, 31], tvarU: 1, tvarSy: 0.72 },
  }).map(([k, v]) => [k, { ...NADOBA0, ...v }]),
);
export const michej = (A, B, k) => {
  const T = { r: A.r.map((v, i) => lerp(v, B.r[i], k)) };
  for (const c of ["H", "otvor", "vicko", "hubicka", "ucho", "tvarU", "tvarSy"]) T[c] = lerp(A[c], B[c], k);
  return T;
};
/** Poloměr ve výšce u (0 dno, 1 okraj). */
export const polomer = (T, u) => {
  const x = clamp(u) * (T.r.length - 1);
  const i = Math.min(T.r.length - 2, Math.floor(x));
  return lerp(T.r[i], T.r[i + 1], x - i);
};
/** Obrys nádoby: levý bok nahoru, zadní půlka okraje, pravý bok dolů, přední půlka dna. `osa(u)` vychýlí střed. */
export const obrysNadoby = (T, cx, dno, osa = () => 0) => {
  const n = T.r.length;
  const L = [], P = [];
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1), c = cx + osa(u), y = dno - u * T.H;
    L.push([c - T.r[i], y]);
    P.push([c + T.r[i], y]);
  }
  const rT = T.r[n - 1], cT = cx + osa(1), yT = dno - T.H;
  let vrch;
  if (rT < 0.5) {
    L.pop();
    P.pop();
    vrch = [[cT, yT]];
  } else vrch = [135, 90, 45].map((a) => [cT + rT * Math.cos(rad(a)), yT - rT * SKLON * Math.sin(rad(a))]);
  const spodek = [45, 90, 135].map((a) => [cx + T.r[0] * Math.cos(rad(a)), dno + T.r[0] * SKLON * Math.sin(rad(a))]);
  return hladka([...L, ...vrch, ...P.reverse(), ...spodek], true);
};
/**
 * Nádoba jen jako kresba linkou kolem počátku (dno na y 0): obrys a linky
 * navíc — lístky výhonku, okraj, víčko, hubička, ucho. Pro vzpomínky na
 * polici.
 */
export const konturaNadoby = (T) => {
  const rT = T.r[T.r.length - 1];
  let d = obrysNadoby(T, 0, 0);
  let linky = `M-3 ${-T.H - 2} Q-9 ${-T.H - 12} -1 ${-T.H - 10} M1 ${-T.H - 2} Q9 ${-T.H - 15} 0 ${-T.H - 12}`;
  if (T.otvor) linky += ` M${f(-rT + 1.4)} ${-T.H} A${f(rT - 1.4)} ${f((rT - 1.4) * SKLON)} 0 0 0 ${f(rT - 1.4)} ${-T.H}`;
  if (T.vicko) d += ` M${f(-rT * 0.92)} ${-T.H} Q0 ${f(-T.H - rT * 1.1)} ${f(rT * 0.92)} ${-T.H}`;
  if (T.hubicka) {
    const x = polomer(T, 0.58), y = -0.58 * T.H;
    linky += ` M${f(x - 1)} ${f(y + 3)} Q${f(x + 9)} ${f(y + 2)} ${f(x + 13)} ${f(y - 11)} M${f(x - 2)} ${f(y - 5)} Q${f(x + 6)} ${f(y - 4)} ${f(x + 10.6)} ${f(y - 12)}`;
  }
  if (T.ucho) linky += ` M${f(-polomer(T, 0.74))} ${f(-0.74 * T.H)} C${f(-polomer(T, 0.74) - 13)} ${f(-0.74 * T.H - 2)} ${f(-polomer(T, 0.3) - 13)} ${f(-0.3 * T.H + 1)} ${f(-polomer(T, 0.3))} ${f(-0.3 * T.H)}`;
  return { d, linky };
};
export const nadobaDefs = (id, barvy) =>
  hlDefs(id, barvy) +
  `<radialGradient id="${id}-nitro" cx="0.5" cy="0.15" r="0.9"><stop offset="0" stop-color="#40342C"/><stop offset="1" stop-color="#1C1612"/></radialGradient>`;
/* skvrny na hroudě: úhel kolem osy, výška, velikost — první tři sedí tam, kde je má původní kresba */
const SKVRNY = [
  { th: -0.5, u: 0.68, r: 3.8, barva: "#9A8A78", op: 0.4 },
  { th: 0.45, u: 0.36, r: 2.9, barva: "#7D6E5F", op: 0.4 },
  { th: -0.2, u: 0.26, r: 2.4, barva: "#5A4E42", op: 0.3 },
  { th: 2.3, u: 0.6, r: 3.2, barva: "#9A8A78", op: 0.36 },
  { th: 3.5, u: 0.4, r: 2.6, barva: "#5A4E42", op: 0.3 },
  { th: 4.6, u: 0.72, r: 2.3, barva: "#7D6E5F", op: 0.36 },
];
/**
 * Hlínka v daném profilu. `faze` je natočení kolem osy (skvrny jedou
 * dokola a mizí za bokem), `mokro` 0…1 přidá lesk a kroužky po prstech.
 * Vrací kusy, které si scéna poskládá do vrstev: tělo, kam patří tvář
 * (`tvarT` je transform pro hlTvar) a kde je temeno pro výhonek.
 */
export const hlNadoba = (id, T, { cx = 90, dno = 149, faze = 0, mokro = 0, osa = () => 0, obrys = "#4A3F35", meritko = 0.46, hlina = "#64574A" } = {}) => {
  const n = T.r.length;
  const y = (u) => dno - u * T.H;
  const rT = T.r[n - 1], cT = cx + osa(1), yT = y(1), ryT = rT * SKLON;
  let s = "";
  /* ucho a hubička jsou přilepené zezadu, spoj schová tělo */
  if (T.ucho > 0.03) {
    const A = [cx + osa(0.74) - polomer(T, 0.74) + 1.5, y(0.74)], B = [cx + osa(0.3) - polomer(T, 0.3) + 1.5, y(0.3)];
    const ven = 13 * T.ucho;
    const d = `M${pt(A)} C${f(A[0] - ven)} ${f(A[1] - 2)} ${f(B[0] - ven)} ${f(B[1] + 1)} ${pt(B)}`;
    s += `<path d="${d}" stroke="${obrys}" stroke-width="4.6" stroke-linecap="round" fill="none"/><path d="${d}" stroke="${hlina}" stroke-width="2.7" stroke-linecap="round" fill="none"/>`;
  }
  if (T.hubicka > 0.03) {
    const k = T.hubicka;
    const A = [cx + osa(0.58) + polomer(T, 0.58) - 2, y(0.58)];
    const B = vzorkuj([A, [A[0] + 6 * k, A[1] - 1 * k], [A[0] + 11 * k, A[1] - 5.5 * k], [A[0] + 14 * k, A[1] - 11.5 * k]], 4);
    s += `<path d="${pasPoBodech(B, (q) => lerp(9.4, 3.4, q) * lerp(0.6, 1, k))}" fill="${hlina}" stroke="${obrys}" stroke-width="1" stroke-linejoin="round"/>`;
    s += `<ellipse cx="${f(A[0] + 14 * k)}" cy="${f(A[1] - 11.5 * k)}" rx="${f(1.5 * k)}" ry="${f(0.8 * k)}" transform="rotate(28 ${f(A[0] + 14 * k)} ${f(A[1] - 11.5 * k)})" fill="#1C1612"/>`;
  }
  s += `<path d="${obrysNadoby(T, cx, dno, osa)}" fill="url(#${id}-telo)" stroke="${obrys}" stroke-width="1" stroke-linejoin="round"/>`;
  const plochost = Math.min(1, T.H / 30);
  for (const k of SKVRNY) {
    const a = k.th + faze, c = Math.cos(a);
    if (c < 0.06) continue;
    const r = polomer(T, k.u);
    if (r < 4) continue;
    s += `<ellipse cx="${f(cx + osa(k.u) + r * 0.9 * Math.sin(a))}" cy="${f(y(k.u))}" rx="${f(Math.max(0.3, k.r * c))}" ry="${f(k.r * plochost)}" fill="${k.barva}" opacity="${f(k.op * smooth(c * 3))}"/>`;
  }
  if (mokro > 0.02) {
    /* kroužky po prstech: čárkované, čárky ujíždějí s otáčením */
    for (const u of [0.18, 0.34, 0.5, 0.66, 0.82]) {
      const r = polomer(T, u) - 0.7;
      if (r < 4) continue;
      const c = cx + osa(u);
      s += `<path d="M${f(c - r)} ${f(y(u))} A${f(r)} ${f(r * SKLON)} 0 0 0 ${f(c + r)} ${f(y(u))}" stroke="#D4C4AE" stroke-width="0.45" stroke-dasharray="${f(r * 0.5)} ${f(r * 0.22)}" stroke-dashoffset="${f(-faze * r)}" fill="none" opacity="${f(0.5 * mokro)}"/>`;
    }
    const lesk = [0.16, 0.34, 0.52, 0.7, 0.86].map((u) => [cx + osa(u) - polomer(T, u) * 0.7, y(u)]).filter((_, i) => polomer(T, [0.16, 0.34, 0.52, 0.7, 0.86][i]) > 4);
    if (lesk.length > 1) s += `<path d="${hladka(lesk)}" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" fill="none" opacity="${f(0.17 * mokro)}"/>`;
  }
  if (rT > 1) {
    /* zavřený vršek je vidět shora jako světlejší plocha, otevřený jako tma s proužkem stěny kolem */
    if (T.otvor < 0.98) s += `<ellipse cx="${f(cT)}" cy="${f(yT)}" rx="${f(rT * 0.95)}" ry="${f(ryT * 0.95)}" fill="#8A7A69" opacity="${f(0.55 * (1 - T.otvor))}"/>`;
    if (T.otvor > 0.02) {
      const w = Math.min(1.7, rT * 0.3);
      s += `<ellipse cx="${f(cT)}" cy="${f(yT)}" rx="${f(rT - w)}" ry="${f((rT - w) * SKLON)}" fill="url(#${id}-nitro)" stroke="${obrys}" stroke-width="0.6" opacity="${f(T.otvor)}"/>`;
      s += `<path d="M${f(cT - rT + w * 0.5)} ${f(yT)} A${f(rT - w * 0.5)} ${f((rT - w * 0.5) * SKLON)} 0 0 0 ${f(cT + rT - w * 0.5)} ${f(yT)}" stroke="#B5A592" stroke-width="0.5" fill="none" opacity="${f(0.7 * T.otvor)}"/>`;
    }
    if (T.vicko > 0.03)
      s += `<path d="M${f(cT - rT * 0.92)} ${f(yT)} Q${f(cT)} ${f(yT - rT * 1.1 * T.vicko)} ${f(cT + rT * 0.92)} ${f(yT)} A${f(rT * 0.92)} ${f(ryT * 0.92)} 0 0 1 ${f(cT - rT * 0.92)} ${f(yT)} Z" fill="#7C6E60" stroke="${obrys}" stroke-width="0.9" stroke-linejoin="round"/>` +
        `<path d="M${f(cT - rT * 0.5)} ${f(yT - rT * 0.3 * T.vicko)} Q${f(cT - rT * 0.2)} ${f(yT - rT * 0.5 * T.vicko)} ${f(cT)} ${f(yT - rT * 0.5 * T.vicko)}" stroke="#A89782" stroke-width="0.6" stroke-linecap="round" fill="none" opacity="0.7"/>`;
  }
  const nx = Math.min(T.r[0] * 0.5, 9);
  s += `<ellipse cx="${f(cx - nx)}" cy="${f(dno + T.r[0] * SKLON * 0.5)}" rx="5" ry="2.3" fill="#4F443A"/><ellipse cx="${f(cx + nx)}" cy="${f(dno + T.r[0] * SKLON * 0.5)}" rx="5" ry="2.3" fill="#4F443A"/>`;
  const kx = meritko * clamp(polomer(T, T.tvarU) / 22, 0.5, 1.5);
  const ky = meritko * T.tvarSy * clamp(lerp(1, T.H / 42, 0.5), 0.55, 1.2);
  return {
    telo: s,
    tvarT: `translate(${f(cx + osa(T.tvarU))} ${f(y(T.tvarU))}) scale(${f(kx)} ${f(ky)}) translate(-90 -100)`,
    stredTvare: [cx + osa(T.tvarU), y(T.tvarU)],
    /* temeno: v otevřené nádobě stojí výhonek uvnitř, na víčku je jako úchytka */
    vrch: [cT, yT + ryT * 0.3 * T.otvor - rT * 0.55 * T.vicko],
    rT,
  };
};

export {
  f, rng, clamp, lerp, smooth, krokem, easeOut, rad, hexRgb, rgbHex, mix, pt, cara, f1, kruhD, otoc, hladka, vzorkuj, naCare, pasPoBodech, hrouda, mrkani, jiskraD, jazyk, uhelRozdil, pruzina, kvetD, LISTEK, HL, hlDefs, hlTelo, hlNohy, hlVyhonek, zetko, zzz, svetylko, hlTvar,
};
