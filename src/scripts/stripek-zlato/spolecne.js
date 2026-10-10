/*
 * Střípek a zlato — společné kusy kreseb (./kami-prstenec.js, ./lem-noc.js
 * a ./lampion.js): pomocníci, střep se zlatými spárami, tvář s výrazy,
 * ručky, obláček, poletující střípky, štětec na zlato a tušový lem.
 *
 * Střípek je tsukumogami: hrnek, který spadl ze stolu a dostal duši.
 * Kresba je jeho podoba z characters/kami-buh/StripekKintsugi.astro — velký
 * bílý střep slepený zlatem, dva kusy z cizího nádobí (vlnky seigaiha
 * a modrotisk v barvách loga), obláček v barvách svítání — jen rozebraná
 * na kusy, se kterými jde hýbat. Střep, spáry i obláček zůstaly, jak byly.
 * Přibyly výrazy (původně jen meditoval), jemné krakelování v glazuře
 * a ručky umějí něco držet: jsou to pořád jen dva oblázky bez paží, takže
 * se k věci prostě přesunou.
 *
 * Zlato je dvojí. Hotová spára je kov: filtr s reliéfem, zrnem prášku
 * a odleskem (`-kov`), kreslí se jednou a pak se s ní jen hýbe. Co se
 * právě maluje nebo letí, je zlato ploché (přechod `-zl` a světlá linka),
 * protože filtr by se třicetkrát za sekundu nestíhal.
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
export const rad = (d) => (d * Math.PI) / 180;
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgbHex = (c) => "#" + c.map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0")).join("");
export const mix = (a, b, k) => {
  const A = hexRgb(a);
  const B = hexRgb(b);
  return rgbHex(A.map((v, i) => v + (B[i] - v) * clamp(k)));
};
export const pt = (p) => `${f(p[0])} ${f(p[1])}`;
export const cara = (body) => "M" + body.map(pt).join(" L");
/** Pružina k cíli, nezávislá na snímkovce: k je časová konstanta v sekundách. */
export const kCili = (v, cil, dt, k) => v + (cil - v) * (1 - Math.exp(-dt / k));
/** Překročil čas mezi dvěma snímky hranici x? */
export const pres = (a, b, x) => a < x && b >= x;

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
/** Normály lomené čáry (jednotkové, vlevo od směru). */
export const normaly = (B) =>
  B.map((_, i) => {
    const a = B[Math.max(0, i - 1)], b = B[Math.min(B.length - 1, i + 1)];
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [-(b[1] - a[1]) / d, (b[0] - a[0]) / d];
  });
/** Lomená čára s proměnnou šířkou → uzavřený tvar. sirka(t) pro t 0…1. */
export const pasPoBodech = (B, sirka) => {
  const L = [], Pr = [];
  const N = normaly(B);
  const n = B.length;
  for (let i = 0; i < n; i++) {
    const w = sirka(i / (n - 1)) / 2;
    L.push([B[i][0] + N[i][0] * w, B[i][1] + N[i][1] * w]);
    Pr.push([B[i][0] - N[i][0] * w, B[i][1] - N[i][1] * w]);
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
/** Mrkání: krátké zavření kolem každého času v seznamu, 0,17 s. */
export const mrkani = (t, casy, perioda) => {
  const tt = perioda ? ((t % perioda) + perioda) % perioda : t;
  let m = 0;
  for (const c of casy) {
    const u = tt - c;
    if (u > 0 && u < 0.17) m = Math.max(m, Math.sin((Math.PI * u) / 0.17));
  }
  return m;
};
/** Čtyřcípá jiskra kolem počátku. */
export const jiskraD = (r) => `M0 ${f(-r)} Q${f(r * 0.22)} ${f(-r * 0.22)} ${f(r)} 0 Q${f(r * 0.22)} ${f(r * 0.22)} 0 ${f(r)} Q${f(-r * 0.22)} ${f(r * 0.22)} ${f(-r)} 0 Q${f(-r * 0.22)} ${f(-r * 0.22)} 0 ${f(-r)} Z`;
/** Bod na lomené čáře v délce s od začátku (D jsou délky od začátku ke každému bodu). */
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
export const delky = (B) => {
  const D = [0];
  for (let i = 1; i < B.length; i++) D.push(D[i - 1] + Math.hypot(B[i][0] - B[i - 1][0], B[i][1] - B[i - 1][1]));
  return D;
};

/**
 * Chomáč — vroubkovaná elipsa z obloučků, stejná jako v components/parta2/tvary.ts
 * (mraky na obloze webu). Tady je zvlášť, ať kresby běží i v holém Node.
 * `dno` < 1 zploští spodní polovinu, mraky mají rovné břicho.
 */
export const chomac = (cx, cy, rx, ry, pocet, seed, dno = 1, hrbol = 0.62) => {
  const r = rng(seed);
  const z = (n) => Math.round(n * 10) / 10;
  const body = [];
  for (let i = 0; i < pocet; i++) {
    const a = (i / pocet) * Math.PI * 2 + (r() - 0.5) * (Math.PI / pocet) * 0.6;
    const k = 0.88 + r() * 0.2;
    const x = cx + Math.cos(a) * rx * k;
    let y = cy + Math.sin(a) * ry * k;
    if (dno < 1 && y > cy) y = cy + (y - cy) * dno;
    body.push([x, y]);
  }
  let d = `M${z(body[0][0])} ${z(body[0][1])}`;
  for (let i = 0; i < pocet; i++) {
    const [x1, y1] = body[i];
    const [x2, y2] = body[(i + 1) % pocet];
    const rb = Math.hypot(x2 - x1, y2 - y1) * hrbol;
    d += ` A${z(rb)} ${z(rb)} 0 0 1 ${z(x2)} ${z(y2)}`;
  }
  return d + " Z";
};

/* ═══════════════════════════════════════════════════════════════════
 * Zlato
 * ═══════════════════════════════════════════════════════════════════ */
export const ZLATO = { tmave: "#8E6414", zaklad: "#C99430", jasne: "#F2C95E", lesk: "#FFF0B8" };

/**
 * Spára jako tvar: lomená čára s plynule kolísající šířkou, jako tažená
 * štětcem. Vrací vzorky (bod, šířka, délka od začátku), ze kterých jde
 * nakreslit celá i jen kus — to když se teprve maluje.
 */
export const sparaVzorky = (body, seed, zaklad = 1.6, { min = 0.75, max = 2.3, kolis = 0.38, krok = 1.6 } = {}) => {
  const r = rng(seed);
  const P = [];
  for (let i = 0; i < body.length - 1; i++) {
    const [ax, ay] = body[i];
    const [bx, by] = body[i + 1];
    const kroku = Math.max(4, Math.round(Math.hypot(bx - ax, by - ay) / krok));
    for (let k = 0; k < kroku; k++) P.push([ax + ((bx - ax) * k) / kroku, ay + ((by - ay) * k) / kroku]);
  }
  P.push(body[body.length - 1]);
  let w = zaklad;
  const W = P.map(() => (w = Math.min(max, Math.max(min, w + (r() - 0.5) * kolis))));
  const D = delky(P);
  return { P, W, D, delka: D[D.length - 1] };
};
/** Tvar spáry ze vzorků, od délky `od` po délku `po` (bez nich celá). Konce jsou zúžené. */
export const sparaTvar = (V, od = 0, po = V.delka) => {
  od = clamp(od, 0, V.delka);
  po = clamp(po, 0, V.delka);
  if (po - od < 0.05) return "";
  const sirka = (s) => {
    let i = 1;
    while (i < V.D.length - 1 && V.D[i] < s) i++;
    return lerp(V.W[i - 1], V.W[i], clamp((s - V.D[i - 1]) / (V.D[i] - V.D[i - 1] || 1)));
  };
  /* krajní body přesně v `od` a `po`, mezi nimi původní vzorky */
  const S = [od, ...V.D.filter((s) => s > od + 0.01 && s < po - 0.01), po];
  const P = S.map((s) => bodNaCare(V.P, V.D, s));
  const N = normaly(P);
  const L = [], Pr = [];
  P.forEach((p, i) => {
    const w = sirka(S[i]) * (i === 0 || i === P.length - 1 ? 0.55 : 1);
    L.push([p[0] + N[i][0] * w, p[1] + N[i][1] * w]);
    Pr.push([p[0] - N[i][0] * w, p[1] - N[i][1] * w]);
  });
  return `M${L.map(pt).join(" L")} L${Pr.reverse().map(pt).join(" L")} Z`;
};
export const spara = (body, seed, zaklad = 1.6, volby) => sparaTvar(sparaVzorky(body, seed, zaklad, volby));
/** Elipsa jako cesta (loužička zlata) — ať jde přidat k ostatním spárám do jednoho `d`. */
export const elipsaD = (x, y, rx, ry) => `M${f(x - rx)} ${f(y)} a${rx} ${ry} 0 1 0 ${f(2 * rx)} 0 a${rx} ${ry} 0 1 0 ${f(-2 * rx)} 0 Z`;

/** Zlato jako kov: stín pod lakem a spára s reliéfem. `d` je jedna cesta se vším zlatem. */
export const zlatoKov = (id, d, { stin = true } = {}) =>
  (stin ? `<path d="${d}" fill="#2A1608" opacity="0.35" filter="url(#${id}-stin-kovu)" transform="translate(0.6 0.9)"/>` : "") +
  `<path d="${d}" fill="${ZLATO.zaklad}" filter="url(#${id}-kov)"/>`;
/** Zlato ploché, pro všechno, co se hýbe: přechod, tmavý vlásek a světlá linka středem. */
export const zlatoPlose = (id, d, stred = "") =>
  `<path d="${d}" fill="url(#${id}-zl)" stroke="#7A5412" stroke-width="0.25" stroke-linejoin="round"/>` +
  (stred ? `<path d="${stred}" stroke="${ZLATO.lesk}" stroke-width="0.45" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.8"/>` : "");

/* ═══════════════════════════════════════════════════════════════════
 * Střípek: původní kresba (characters/kami-buh/StripekKintsugi.astro).
 * Všechno v jejích souřadnicích 0–180, střed postavy je zhruba 91 90.
 * ═══════════════════════════════════════════════════════════════════ */
export const STR = { c: [91, 90] };
export const STREP = "M58 62 Q92 50 124 56 L130 78 L122 92 L134 112 L120 130 H62 L50 112 L57 96 L48 80 Z";
const KUS_VLNY = "M100 52.6 Q112 53.4 124 56 L130 78 L114 82 L104 70 Z";
const KUS_MODROTISK = "M57 96 L74 106 L80 130 H62 L50 112 Z";
/* tři spáry: kolem kusu s vlnkami, kolem modrotisku a jedna dolů přes břicho */
const SPARY_BODY = [
  [[[100, 52.6], [101.4, 61], [104, 70], [109, 76.4], [114, 82], [122, 80.4], [130, 78]], 3],
  [[[57, 96], [65.6, 101], [74, 106], [76.4, 118], [80, 130]], 8],
  [[[114, 82], [117.4, 97], [112.4, 111], [116, 121], [119, 130]], 13],
];
export const SPARY = SPARY_BODY.map(([body, seed]) => spara(body, seed));
/* loužičky zlata, kde se spáry potkávají */
const LOUZICKY = [[104, 70, 2.5, 2], [114, 82, 2.7, 2.2], [74, 106, 2.4, 1.9]];
/** Všechno zlato na těle jako jedna cesta. */
export const ZLATO_TELA = SPARY.join(" ") + " " + LOUZICKY.map((l) => elipsaD(...l)).join(" ");

export const MRAK = { svetlo: "#F2C8C2", stin: "#9083AF", zare: "#FFE6DD", pred: "#B49BBE", pod: "#7A6A9E" };

/**
 * Přechody, vzory a filtry Střípka. Barvy jdou přeladit (v noci je glazura
 * studenější a obláček tmavší), `azimut` říká, odkud na zlato svítí.
 */
export const strDefs = (id, { glazura = ["#FFFFFF", "#F4F0E8", "#DED6C8"], hrana = ["#E9DECD", "#C9B9A2"], kobalt = "#2F4E9C", porcelan = "#FBF8F2", mrak = MRAK, azimut = 235, zlato = "#DDA93E" } = {}) =>
  `<radialGradient id="${id}-glazura" cx="0.36" cy="0.32" r="0.85"><stop offset="0" stop-color="${glazura[0]}"/><stop offset="0.6" stop-color="${glazura[1]}"/><stop offset="1" stop-color="${glazura[2]}"/></radialGradient>` +
  `<linearGradient id="${id}-hrana" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${hrana[0]}"/><stop offset="1" stop-color="${hrana[1]}"/></linearGradient>` +
  `<pattern id="${id}-seigaiha" width="8" height="4" patternUnits="userSpaceOnUse"><rect width="8" height="4" fill="${porcelan}"/>` +
  [[0, 2], [8, 2], [4, 4]].map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="4" fill="${porcelan}" stroke="${kobalt}" stroke-width="0.55"/><circle cx="${cx}" cy="${cy}" r="2.8" fill="none" stroke="${kobalt}" stroke-width="0.55"/><circle cx="${cx}" cy="${cy}" r="1.6" fill="none" stroke="${kobalt}" stroke-width="0.55"/>`).join("") +
  `</pattern>` +
  /* modrotisk v barvách loga: tečky na přechodu z rumělky do noci */
  `<linearGradient id="${id}-modrotisk-pud" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#C4432B"/><stop offset="0.35" stop-color="#C0708A"/><stop offset="0.7" stop-color="#7A5E8E"/><stop offset="1" stop-color="#4E4A84"/></linearGradient>` +
  `<pattern id="${id}-modrotisk" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="1.25" cy="1.25" r="0.7" fill="#F4F1EA"/><circle cx="3.75" cy="3.75" r="0.7" fill="#F4F1EA"/></pattern>` +
  /* zlato jako kov: reliéf z rozmazaného obrysu se zrnem prášku, rozptýlené světlo tónuje zlatou, ostrý odlesk se přičte navrch */
  `<filter id="${id}-kov" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">` +
  `<feGaussianBlur in="SourceAlpha" stdDeviation="0.85" result="vyska"/>` +
  `<feTurbulence type="fractalNoise" baseFrequency="1.8" numOctaves="2" seed="7" result="zrno"/>` +
  `<feComposite in="zrno" in2="vyska" operator="arithmetic" k1="0" k2="0.1" k3="1" k4="0" result="povrch"/>` +
  `<feDiffuseLighting in="povrch" surfaceScale="3.2" diffuseConstant="1.05" lighting-color="#FFFFFF" result="svetlo"><feDistantLight azimuth="${azimut}" elevation="46"/></feDiffuseLighting>` +
  `<feSpecularLighting in="povrch" surfaceScale="3.2" specularConstant="1.6" specularExponent="20" lighting-color="#FFF5D8" result="lesk"><feDistantLight azimuth="${azimut}" elevation="46"/></feSpecularLighting>` +
  `<feFlood flood-color="${zlato}" result="barva"/>` +
  `<feComposite in="barva" in2="svetlo" operator="arithmetic" k1="1.18" k2="0" k3="0" k4="0" result="tonovana"/>` +
  `<feComposite in="lesk" in2="SourceAlpha" operator="in" result="leskUvnitr"/>` +
  `<feComposite in="tonovana" in2="leskUvnitr" operator="arithmetic" k1="0" k2="1" k3="0.9" k4="0" result="kov"/>` +
  `<feComposite in="kov" in2="SourceAlpha" operator="in"/></filter>` +
  `<filter id="${id}-stin-kovu" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="0.7"/></filter>` +
  `<linearGradient id="${id}-zl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${ZLATO.lesk}"/><stop offset="0.34" stop-color="${ZLATO.jasne}"/><stop offset="0.72" stop-color="${ZLATO.zaklad}"/><stop offset="1" stop-color="${ZLATO.tmave}"/></linearGradient>` +
  /* obláček jako mraky na obloze webu: světlo nahoře, stín dole */
  `<linearGradient id="${id}-oblak" gradientUnits="userSpaceOnUse" x1="0" y1="20" x2="0" y2="260"><stop offset="0" stop-color="${mrak.svetlo}"/><stop offset="0.5" stop-color="${mrak.svetlo}"/><stop offset="1" stop-color="${mrak.stin}"/></linearGradient>` +
  `<linearGradient id="${id}-oblak-pred" gradientUnits="userSpaceOnUse" x1="0" y1="119" x2="0" y2="158"><stop offset="0" stop-color="${mrak.svetlo}"/><stop offset="0.45" stop-color="${mrak.svetlo}"/><stop offset="1" stop-color="${mrak.pred}"/></linearGradient>` +
  `<filter id="${id}-mekce" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.2"/></filter>` +
  `<clipPath id="${id}-strep"><path d="${STREP}"/></clipPath>`;

/* krakelování: vlasové prasklinky v glazuře, skoro nejsou vidět */
const KRAKEL = (() => {
  const r = rng(91);
  let d = "";
  for (const [x0, y0] of [[70, 70], [88, 64], [96, 108], [70, 86], [106, 120], [86, 122], [124, 100]]) {
    let x = x0, y = y0, a = r() * 6.28;
    d += `M${f(x)} ${f(y)}`;
    for (let i = 0; i < 3; i++) {
      a += (r() - 0.5) * 1.8;
      x += Math.cos(a) * (3 + r() * 4);
      y += Math.sin(a) * (3 + r() * 4);
      d += ` L${f(x)} ${f(y)}`;
    }
    d += " ";
  }
  return d;
})();

/** Velký střep: tloušťka, glazura, dva cizí kusy a obrys. Kreslí se jednou, hýbe s ním běh. */
export const strTelo = (id, { obrys = "#6B5D4F" } = {}) =>
  `<path d="${STREP}" transform="translate(2.6 4.4)" fill="url(#${id}-hrana)" stroke="${obrys}" stroke-width="1.3" stroke-linejoin="round"/>` +
  `<path d="${STREP}" fill="url(#${id}-glazura)"/>` +
  `<g clip-path="url(#${id}-strep)">` +
  `<path d="${KRAKEL}" stroke="#B9AC98" stroke-width="0.3" fill="none" opacity="0.5"/>` +
  `<path d="${KUS_VLNY}" fill="url(#${id}-seigaiha)"/>` +
  `<path d="${KUS_MODROTISK}" fill="url(#${id}-modrotisk-pud)"/><path d="${KUS_MODROTISK}" fill="url(#${id}-modrotisk)"/>` +
  /* kvítek na modrotisku */
  `<g transform="translate(64 116)" fill="#F4F1EA"><path d="M0 6 V-1" stroke="#F4F1EA" stroke-width="0.9"/>` +
  `<path d="M-3.2 -1 C-3.4 -4.6 -1.6 -6.6 0 -7.4 C1.6 -6.6 3.4 -4.6 3.2 -1 C2 -0.2 1 0 0 -1.6 C-1 0 -2 -0.2 -3.2 -1 Z"/>` +
  `<path d="M0 3 C-2 1.6 -3.8 1.8 -4.6 3 C-3.4 4 -1.6 4 0 3 Z M0 3 C2 1.6 3.8 1.8 4.6 3 C3.4 4 1.6 4 0 3 Z"/></g>` +
  `<path d="M63 68 Q67.6 80 66.6 93" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" opacity="0.7" fill="none"/>` +
  `<path d="M59 63.6 Q92 52 123 57.8" stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round" opacity="0.9" fill="none"/>` +
  `</g>` +
  `<path d="${STREP}" stroke="${obrys}" stroke-width="1.5" stroke-linejoin="round" fill="none"/>`;
/** Kintsugi na těle: stín pod lakem a kovové zlato. */
export const strZlato = (id) => zlatoKov(id, ZLATO_TELA);

/**
 * Tvářička v souřadnicích původní kresby. dx/dy posouvá pohled, mrk 0…1
 * zavírá oči (jen u otevřených).
 * vyraz: medituje | kouka | kouk1 | uzas | leknuti | smich | pysny | soustredeni
 * `strana` ±1 říká, které oko u kouk1 pootevře (to blíž k tomu, co ho ruší).
 */
export const strTvar = ({ dx = 0, dy = 0, mrk = 0, vyraz = "medituje", tvare = 0.5, oko = "#3A2E28", cervanky = "#F2B2A2", lesk = "#FFF8E6", jazyk = "#E58A86", strana = 1 } = {}) => {
  const ox = clamp(dx, -2, 2), oy = clamp(dy, -1.4, 1.4);
  const S = `stroke="${oko}" stroke-linecap="round" stroke-linejoin="round" fill="none"`;
  const L = [84, 88.4], P = [101.2, 87.8];
  const tv = vyraz === "smich" || vyraz === "pysny" ? 1.3 : 1;
  let s = `<ellipse cx="80" cy="97" rx="${f(4.4 * tv)}" ry="${f(2.6 * tv)}" fill="${cervanky}" opacity="${f(clamp(tvare * tv))}"/><ellipse cx="106" cy="96.4" rx="${f(4.4 * tv)}" ry="${f(2.6 * tv)}" fill="${cervanky}" opacity="${f(clamp(tvare * tv))}"/>`;
  /* zved zvedne obočí, sklon ho stáhne ke kořeni nosu */
  const oboci = (zved = 0, sklon = 0) =>
    `<path d="M79 ${f(80.4 - zved - sklon)} Q84 ${f(78.4 - zved)} 88.6 ${f(79.8 - zved + sklon)} M96.4 ${f(79.4 - zved + sklon)} Q101 ${f(78 - zved)} 105.8 ${f(79.6 - zved - sklon)}" ${S} stroke-width="1.3" opacity="0.85"/>`;
  const zavrene = (kde) =>
    (kde <= 0 ? `<path d="M79.4 88.2 Q84 92 88.6 88.2" ${S} stroke-width="1.9"/><path d="M79.4 88.2 L78 87.4" ${S} stroke-width="1.1"/>` : "") +
    (kde >= 0 ? `<path d="M96.6 87.6 Q101.2 91.4 105.8 87.6" ${S} stroke-width="1.9"/><path d="M105.8 87.6 L107.2 86.8" ${S} stroke-width="1.1"/>` : "");
  const stastne = `<path d="M79.4 89.8 Q84 85.4 88.6 89.8 M96.6 89.2 Q101.2 84.8 105.8 89.2" ${S} stroke-width="1.9"/>`;
  const kulate = ([x, y], rx, ry) =>
    `<ellipse cx="${f(x + ox)}" cy="${f(y + oy)}" rx="${rx}" ry="${f(Math.max(0.3, ry))}" fill="${oko}"/>` +
    (ry > 1.4 ? `<circle cx="${f(x + ox - rx * 0.34)}" cy="${f(y + oy - ry * 0.36)}" r="${f(rx * 0.38)}" fill="${lesk}"/>` : "");
  const usmev = `<path d="M89.6 99.6 Q93 101.8 96.4 99.6" ${S} stroke-width="1.7"/>`;
  if (vyraz === "kouka") s += oboci(0.8) + kulate(L, 2.5, 3.3 * (1 - mrk * 0.94)) + kulate(P, 2.5, 3.3 * (1 - mrk * 0.94)) + usmev;
  else if (vyraz === "kouk1") s += oboci(0.5) + zavrene(strana > 0 ? -1 : 1) + kulate(strana > 0 ? P : L, 2.4, 3 * (1 - mrk * 0.94)) + usmev;
  else if (vyraz === "uzas") s += oboci(2.4) + kulate(L, 3, 3.2) + kulate(P, 3, 3.2) + `<ellipse cx="93" cy="100.8" rx="1.8" ry="2.3" fill="${oko}"/>`;
  else if (vyraz === "leknuti") s += oboci(3.2) + kulate(L, 3.4, 3.6) + kulate(P, 3.4, 3.6) + `<path d="M88.4 100.6 Q90.7 98.4 93 100.6 Q95.3 102.8 97.6 100.6" ${S} stroke-width="1.6"/>`;
  else if (vyraz === "smich")
    s += oboci(1) + stastne +
      `<path d="M88.2 98.4 Q93 97.2 97.8 98.2 Q97 104.6 93 104.8 Q89 104.6 88.2 98.4 Z" fill="${oko}"/>` +
      `<path d="M90.4 102.6 Q93 100.8 95.6 102.6 Q94.4 104.2 93 104.3 Q91.6 104.2 90.4 102.6 Z" fill="${jazyk}"/>`;
  else if (vyraz === "pysny") s += oboci(0.4) + stastne + `<path d="M88.2 98.8 Q93 103.2 97.8 98.8" ${S} stroke-width="1.8"/>`;
  else if (vyraz === "soustredeni") {
    /* víčka napůl, obočí stažené, špička jazyka v koutku */
    const ry = 2.9 * (1 - mrk * 0.94);
    for (const [x, y] of [L, P]) s += `<path d="M${f(x + ox - 2.6)} ${f(y + oy - 0.8)} h5.2 a2.6 ${f(Math.max(0.3, ry))} 0 0 1 -5.2 0 Z" fill="${oko}"/>` + (ry > 1.4 ? `<circle cx="${f(x + ox + 0.9)}" cy="${f(y + oy + 0.4)}" r="0.85" fill="${lesk}"/>` : "");
    s += oboci(-0.4, 0.9) + `<path d="M89.8 100 Q92.4 101.3 95 100.2" ${S} stroke-width="1.6"/>`;
    s += `<path d="M94.4 99.7 Q97.2 99 97.6 101 Q96.2 102.9 94.4 101.6 Z" fill="${jazyk}" stroke="${oko}" stroke-width="0.5" stroke-linejoin="round"/>`;
  } else s += oboci(0) + zavrene(0) + usmev;
  return s;
};

/** Ručka nebo chodidlo: oblázek z glazury. Paže nemá, k věci se prostě přesune. */
export const strRuka = (id, [x, y], { rx = 6.4, ry = 4.8, uhel = 0, obrys = "#6B5D4F" } = {}) =>
  `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${rx}" ry="${ry}"${uhel ? ` transform="rotate(${f(uhel)} ${f(x)} ${f(y)})"` : ""} fill="url(#${id}-glazura)" stroke="${obrys}" stroke-width="1.1"/>`;
export const RUCE = { leva: [47, 114], prava: [137, 113] };
export const strNohy = (id, { obrys = "#6B5D4F", kyv = 0 } = {}) =>
  strRuka(id, [80, 137 + kyv], { rx: 7, ry: 4.2, obrys }) + strRuka(id, [102, 137 - kyv], { rx: 7, ry: 4.2, obrys });

/*
 * Obláček stejně jako mraky na obloze webu (parta2/Nebe.astro): bez obrysu,
 * chomáče s rovným dnem, nahoře růžový, dole do levandulové, se světlými
 * odlesky. Zadní kupa je tvarem přímo mrak z oblohy, zmenšený; přední řada
 * je nižší val, do kterého se střep zaboří.
 */
const OBLAK_ZADNI = {
  telo: [chomac(300, 192, 282, 70, 22, 5, 0.25, 0.66), chomac(118, 146, 112, 86, 14, 6, 0.4, 0.7), chomac(300, 118, 160, 104, 16, 7, 0.4, 0.7), chomac(482, 146, 112, 86, 14, 8, 0.4, 0.7)],
  svetlo: [chomac(96, 110, 56, 38, 10, 9, 1, 0.7), chomac(270, 72, 80, 48, 12, 10, 1, 0.7), chomac(460, 110, 56, 38, 10, 11, 1, 0.7)],
};
const OBLAK_PREDNI = {
  telo: [chomac(90, 148, 58, 10, 16, 21, 0.3, 0.66), chomac(61, 139, 20, 13, 11, 22, 0.4, 0.7), chomac(90, 135, 25, 15, 12, 23, 0.4, 0.7), chomac(119, 139, 20, 13, 11, 24, 0.4, 0.7)],
  svetlo: [chomac(56, 133.5, 8, 4.6, 8, 25, 1, 0.7), chomac(84, 128, 10.5, 5.4, 9, 26, 1, 0.7), chomac(114, 133.5, 8, 4.6, 8, 27, 1, 0.7)],
};
const cesty = (D) => D.map((d) => `<path d="${d}"/>`).join("");
/** Zadní kupa obláčku: patří pod střep. */
export const oblakZadni = (id, mrak = MRAK) =>
  `<g transform="translate(14 92) scale(0.255)"><g fill="url(#${id}-oblak)">${cesty(OBLAK_ZADNI.telo)}</g><g fill="${mrak.zare}" opacity="0.55">${cesty(OBLAK_ZADNI.svetlo)}</g></g>`;
/** Přední val: střep do něj sedá. Měkký stín ho odliší od zadní kupy. */
export const oblakPredni = (id, mrak = MRAK) =>
  `<g fill="${mrak.pod}" opacity="0.28" filter="url(#${id}-mekce)" transform="translate(0 2.5)">${cesty(OBLAK_PREDNI.telo)}</g>` +
  `<g fill="url(#${id}-oblak-pred)">${cesty(OBLAK_PREDNI.telo)}</g><g fill="${mrak.zare}" opacity="0.7">${cesty(OBLAK_PREDNI.svetlo)}</g>`;

/** Celá postava i s obláčkem jednou barvou — stín, kterým ji přikryje noc (vrstva se násobí). */
export const strSilueta = (barva) =>
  `<g fill="${barva}"><g transform="translate(14 92) scale(0.255)">${cesty(OBLAK_ZADNI.telo)}</g><path d="${STREP}" transform="translate(2.6 4.4)"/><path d="${STREP}"/>${cesty(OBLAK_PREDNI.telo)}` +
  `<ellipse cx="80" cy="137" rx="7.5" ry="4.7"/><ellipse cx="102" cy="137" rx="7.5" ry="4.7"/><ellipse cx="47" cy="114" rx="6.9" ry="5.3"/><ellipse cx="137" cy="113" rx="6.9" ry="5.3"/></g>`;

/*
 * Poletující střípky: tvar kolem počátku, výplň a kde mají zlatou hranu.
 * Kreslí se v počátku, na místo je posadí ten, kdo je kreslí.
 */
export const KUSY = [
  { d: "M-8 -6 L6 -9 L9 3 L-3 8 Z", vypln: "bila", zlato: [[6, -9], [9, 3]], r: -12 },
  { d: "M-7 -7 L8 -4 L5 8 L-6 5 Z", vypln: "vlny", r: 10 },
  { d: "M-6 -5 L7 -6 L5 6 L-7 4 Z", vypln: "modrotisk", r: 8 },
  { d: "M-7 -4 L5 -8 L8 5 L-4 7 Z", vypln: "bila", zlato: [[-7, -4], [5, -8]], r: -6 },
  { d: "M-9 2 Q0 -4 9 -1 L7 4 Q0 0.6 -7 6 Z", vypln: "bila", zlato: [[9, -1], [7, 4]], r: 4 },
  { d: "M-5 -5 L6 -4 L4 5 L-6 3 Z", vypln: "vlny", r: -14 },
  { d: "M-7 -3 L4 -7 L7 4 L-3 6 Z", vypln: "bila", zlato: [[4, -7], [7, 4]], r: 12 },
].map((k, i) => ({ ...k, zlatoD: k.zlato ? spara(k.zlato, 20 + i, 1.1) : "", zlatoStred: k.zlato ? cara(k.zlato) : "" }));
export const kusSvg = (id, k, { obrys = "#6B5D4F", kov = false } = {}) =>
  `<path d="${k.d}" transform="translate(1.2 2.2)" fill="url(#${id}-hrana)" stroke="${obrys}" stroke-width="0.8" stroke-linejoin="round"/>` +
  `<path d="${k.d}" fill="url(#${id}-${k.vypln === "bila" ? "glazura" : k.vypln === "vlny" ? "seigaiha" : "modrotisk-pud"})" stroke="${obrys}" stroke-width="0.9" stroke-linejoin="round"/>` +
  (k.vypln === "modrotisk" ? `<path d="${k.d}" fill="url(#${id}-modrotisk)"/>` : "") +
  (k.zlato ? (kov ? `<path d="${k.zlatoD}" fill="${ZLATO.zaklad}" filter="url(#${id}-kov)"/>` : zlatoPlose(id, k.zlatoD, k.zlatoStred)) : "");

/**
 * Štětec na zlato (makie-fude): bambusová násadka, tmavá objímka a štětiny.
 * H je konec násadky v dlani, T špička. `zlato` 0…1 říká, kolik ho na štětci je;
 * barvy jdou přeladit (v tušovém lemu nemaluje kovem, ale světlem).
 */
export const stetecSvg = (H, T, { zlato = 1, tl = 1.3, barva = ZLATO.jasne, okraj = ZLATO.tmave, jadro = "#FFFBEA" } = {}) => {
  const dx = T[0] - H[0], dy = T[1] - H[1];
  const d = Math.hypot(dx, dy) || 1;
  const u = [dx / d, dy / d], n = [-u[1], u[0]];
  const na = (q, o = 0) => [H[0] + u[0] * d * q + n[0] * o, H[1] + u[1] * d * q + n[1] * o];
  const A = na(0.6), B = na(0.7);
  let s = `<path d="M${pt(na(-0.12))} L${pt(A)}" stroke="#4E4226" stroke-width="${f(tl + 0.8)}" stroke-linecap="round"/><path d="M${pt(na(-0.12))} L${pt(A)}" stroke="#C9B27A" stroke-width="${tl}" stroke-linecap="round"/>`;
  s += `<path d="M${pt(na(-0.1, tl * 0.2))} L${pt(na(0.58, tl * 0.2))}" stroke="#E9DBB0" stroke-width="${f(tl * 0.3)}" stroke-linecap="round" opacity="0.8"/>`;
  for (const q of [0.14, 0.42]) s += `<path d="M${pt(na(q, -tl * 0.6))} L${pt(na(q, tl * 0.6))}" stroke="#4E4226" stroke-width="0.4"/>`;
  s += `<path d="M${pt(A)} L${pt(B)}" stroke="#2A2422" stroke-width="${f(tl + 1)}"/>`;
  const stetiny = (od, w) => `M${pt(na(od, -w))} Q${pt(na(lerp(od, 1, 0.6), -w * 0.9))} ${pt(T)} Q${pt(na(lerp(od, 1, 0.6), w * 0.9))} ${pt(na(od, w))} Z`;
  s += `<path d="${stetiny(0.7, tl * 0.85)}" fill="#F1E7D7" stroke="#5E4F44" stroke-width="0.35" stroke-linejoin="round"/>`;
  if (zlato > 0.03) {
    const od = lerp(0.97, 0.78, clamp(zlato));
    s += `<path d="${stetiny(od, tl * 0.85 * lerp(0.2, 0.75, clamp(zlato)))}" fill="${barva}" stroke="${okraj}" stroke-width="0.3" stroke-linejoin="round"/>`;
    s += `<circle cx="${f(T[0] - u[0] * 0.9)}" cy="${f(T[1] - u[1] * 0.9)}" r="${f(0.45 * clamp(zlato + 0.3))}" fill="${jadro}"/>`;
  }
  return s;
};

/**
 * Tušový lem jako u Pecinčina raku: skvrna rozpité tuše, v ní celá scéna.
 * Vrací cestu skvrny, vrstvu pod scénu a definice filtrů a ořezu
 * (`${id}-tus-orez`), kterým se scéna ořízne. `skvrny` je barva mapy
 * v tuši (tři složky 0…1) — světlá tuš svítání má mapy světlé.
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
