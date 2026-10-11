/*
 * Vázička jako gejša — společné kusy kreseb (./kami-kvety.js, ./lem-tycinka.js,
 * ./lem-destnik.js a ./lampion.js): pomocníci, váza jako rotační tělo, které
 * se umí otočit, líčení a výrazy, kimono, obi s mašlí, ozdoby do vlasů,
 * větvička, rukávy, okobo, vějíř, květy dvanácti měsíců a tušový lem.
 *
 * Vázička je tsukumogami: nejstarší kus v dílně, přes sto let, a proto má
 * duši. Jako gejša je pořád váza. Hrdlo je černá glazura a zároveň účes,
 * tělo bílý porcelán jako oshiroi, kimono a obi jsou namalované na břiše
 * jako dekor pod glazurou. Z hrdla jí pořád roste větvička a do vlasů má
 * zapíchnutou kanzashi se stejnými květy: maiko je mění každý měsíc.
 *
 * Tělo je rotační, takže se dá natočit (`yaw` ve stupních, kladný = dívá se
 * z pohledu diváka doprava). Všechno, co je na povrchu namalované, se
 * promítá přes `pruh` a `naTele`: límec kimona, obi, vzor na něm i lístky
 * u lemu putují po břiše, když se točí, a zezadu je vidět mašle a holý
 * zátylek. Díváme se na ni maličko shora (`E`), proto jsou vodorovné pásy
 * vepředu prohnuté dolů.
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
export const deg = (r) => (r * 180) / Math.PI;
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
/** Úhel do rozsahu −180…180. */
export const uhel180 = (a) => ((((a + 180) % 360) + 360) % 360) - 180;
/** Dosednutí s překmitem: 0 → 1, cestou kousek přes. */
export const dosed = (x) => {
  x = clamp(x);
  return 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2);
};

/**
 * Kyvadlo na pohyblivém závěsu: `q` je { a, w, px, vx } (úhel od svislice
 * a úhlová rychlost v radiánech, poslední poloha a rychlost závěsu), `px`
 * je kde je závěs teď. Když se závěs pohne, kyvadlo zůstane pozadu.
 * `g` je tíha dělená délkou (čím větší, tím rychleji kmitá), `c` tlumení,
 * `L` délka, `vitr` úhlové zrychlení navíc.
 */
export const kyvadlo = (q, px, dt, { g = 60, c = 2.2, L = 20, vitr = 0, mez = 1.35 } = {}) => {
  if (!(dt > 0)) {
    q.px = px;
    return q;
  }
  const vx = q.px == null ? 0 : clamp((px - q.px) / dt, -600, 600);
  const ax = clamp((vx - q.vx) / dt, -5000, 5000);
  q.px = px;
  q.vx = vx;
  q.w += (-g * Math.sin(q.a) - c * q.w - (ax / L) * Math.cos(q.a) + vitr) * dt;
  q.a += q.w * dt;
  if (Math.abs(q.a) > mez) {
    q.a = Math.sign(q.a) * mez;
    q.w *= -0.3;
  }
  return q;
};
export const noveKyvadlo = () => ({ a: 0, w: 0, px: null, vx: 0 });

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
/** Totéž bez úvodního M — pokračování rozdělané cesty. */
const hladkaDal = (P) => hladka(P).replace(/^M[^C]*/, "");
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
export const delky = (B) => {
  const D = [0];
  for (let i = 1; i < B.length; i++) D.push(D[i - 1] + Math.hypot(B[i][0] - B[i - 1][0], B[i][1] - B[i - 1][1]));
  return D;
};
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
/** Lomenou čáru převzorkuje na n bodů stejně daleko od sebe. */
export const prevzorkuj = (B, n) => {
  const D = delky(B);
  return Array.from({ length: n }, (_, i) => bodNaCare(B, D, (D[D.length - 1] * i) / (n - 1)));
};

/* ═══════════════════════════════════════════════════════════════════
 * Barvy
 * ═══════════════════════════════════════════════════════════════════ */
export const OBRYS = "#6B5D4F";
export const TUZ = "#2B2420";
export const RUMELKA = "#C4432B";
/** Čím se svítí v tušovém lemu: bledá žlutá jako srpek měsíce v hlavičce webu, žádný kov. */
export const ZLUTA = { jadro: "#FFF6DA", svetla: "#FFE7A3", zaklad: "#FBE3A0", okraj: "#D9B968" };
/** Den: bílý porcelán, kimono v barvách noci ze značky, obi rumělka. */
export const DEN = {
  bila: ["#FFFFFF", "#FAF5EC", "#E6DBCB"],
  vlasy: ["#3A3442", "#211C22", "#141114"],
  kimono: ["#2A2C5E", "#3E3C78", "#6A5A92"],
  obi: ["#D4573C", "#B63A25"],
  zlato: "#E8B440",
  zlatoSv: "#F6DA8C",
  limec: "#D2452C",
  kuze: "#E9C7A6",
  drevo: ["#D9B07C", "#B88A58", "#8C6444"],
  obrys: OBRYS,
  ret: RUMELKA,
  tvare: "#F2A9A9",
  oko: TUZ,
  stonek: "#5E4A3C",
};
/** Noc v tuši: bílý porcelán je v ní modravý stín, ať nepřesvítí to, co v tuši svítí doopravdy. */
export const NOC = {
  bila: ["#E2E4F4", "#C2C6E2", "#9498C2"],
  vlasy: ["#23223A", "#0E0E1A", "#06060C"],
  kimono: ["#161838", "#22234C", "#383562"],
  obi: ["#8E3A3A", "#6E2A2E"],
  zlato: "#B79A5E",
  zlatoSv: "#D2C08E",
  limec: "#9C3A34",
  kuze: "#B9A29A",
  drevo: ["#8A7A72", "#6A5C58", "#4A4040"],
  obrys: "#0C0C18",
  ret: "#A83A30",
  tvare: "#B88A9E",
  oko: "#0E0C14",
  stonek: "#5E5A80",
};

/* ═══════════════════════════════════════════════════════════════════
 * Tělo: rotační váza z profilu
 * ═══════════════════════════════════════════════════════════════════ */
export const VAZ = { cx: 90, hrdlo: 57, zakl: 148, zem: 158.6, c: [90, 106] };
/** Jak moc se na ni díváme shora: o kolik (× poloměr) je předek vodorovného pásu níž než boky. */
export const E = 0.12;
/* výška → poloměr: okraj hrdla, krk, ramena, břicho, pata */
const PROFIL = [[57, 15.4], [59.4, 16.2], [62, 13.8], [66, 11.4], [70.5, 10.6], [75, 11.8], [80, 16], [86.5, 23], [95, 29.6], [106, 33.4], [117, 32.6], [128, 29], [137.5, 23.4], [144, 18], [148, 15.2]];
const TECNY = PROFIL.map((_, i) => {
  const a = PROFIL[Math.max(0, i - 1)], b = PROFIL[Math.min(PROFIL.length - 1, i + 1)];
  return (b[1] - a[1]) / (b[0] - a[0]);
});
/** Poloměr vázy ve výšce y. */
export const polomer = (y) => {
  y = clamp(y, PROFIL[0][0], PROFIL[PROFIL.length - 1][0]);
  let i = 0;
  while (i < PROFIL.length - 2 && PROFIL[i + 1][0] < y) i++;
  const [y0, r0] = PROFIL[i], [y1, r1] = PROFIL[i + 1];
  const h = y1 - y0, t = (y - y0) / h;
  const t2 = t * t, t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * r0 + (t3 - 2 * t2 + t) * h * TECNY[i] + (-2 * t3 + 3 * t2) * r1 + (t3 - t2) * h * TECNY[i + 1];
};
const BOK = (() => {
  const B = [];
  for (let y = VAZ.hrdlo; y <= VAZ.zakl + 0.01; y += 3.5) B.push([polomer(y), y]);
  return B;
})();
const R_HRDLA = polomer(VAZ.hrdlo), R_PATY = polomer(VAZ.zakl);
/** Obrys těla: okraj hrdla je elipsa (díváme se shora), boky jsou profil, dno je zase elipsa. */
export const TELO_D =
  `M${f(VAZ.cx - R_HRDLA)} ${VAZ.hrdlo} A${f(R_HRDLA)} ${f(R_HRDLA * E + 0.9)} 0 0 1 ${f(VAZ.cx + R_HRDLA)} ${VAZ.hrdlo}` +
  hladkaDal(BOK.map(([r, y]) => [VAZ.cx + r, y])) +
  ` A${f(R_PATY)} ${f(R_PATY * E + 0.6)} 0 0 1 ${f(VAZ.cx - R_PATY)} ${VAZ.zakl}` +
  hladkaDal(BOK.slice().reverse().map(([r, y]) => [VAZ.cx - r, y])) +
  " Z";

/**
 * Bod na povrchu vázy. `az` je azimut od její přední strany (kladný k jejímu
 * levému boku, tedy pro diváka vpravo), `y` výška na boku. Vrací [x, y, k],
 * kde k je kosinus natočení k divákovi: záporné je za vázou.
 */
export const naTele = (az, y, yaw = 0, ven = 0) => {
  const w = rad(az + yaw);
  const r = polomer(y) + ven;
  return [VAZ.cx + r * Math.sin(w), y + r * E * Math.cos(w), Math.cos(w)];
};
/**
 * Pás namalovaný na váze mezi dvěma výškami (funkce azimutu), jen jeho
 * viditelná půlka. `a1`…`a2` omezí pás na výseč azimutů.
 */
export const pruh = (horni, dolni, yaw = 0, a1 = -180, a2 = 180) => {
  let d = "";
  for (const k of [-1, 0, 1]) {
    const w1 = Math.max(-90, a1 + yaw + 360 * k), w2 = Math.min(90, a2 + yaw + 360 * k);
    if (w2 - w1 < 0.4) continue;
    const n = Math.max(2, Math.ceil((w2 - w1) / 4));
    const H = [], D = [];
    for (let i = 0; i <= n; i++) {
      const w = lerp(w1, w2, i / n);
      const az = uhel180(w - yaw), s = Math.sin(rad(w)), c = Math.cos(rad(w));
      const yh = horni(az), yd = dolni(az);
      H.push([VAZ.cx + polomer(yh) * s, yh + polomer(yh) * E * c]);
      D.push([VAZ.cx + polomer(yd) * s, yd + polomer(yd) * E * c]);
    }
    d += `M${H.map(pt).join(" L")} L${D.reverse().map(pt).join(" L")} Z `;
  }
  return d;
};
/** Čára namalovaná na váze ve výšce y(az), jen viditelná půlka. */
export const linka = (vyska, yaw = 0, a1 = -180, a2 = 180) => {
  let d = "";
  for (const k of [-1, 0, 1]) {
    const w1 = Math.max(-90, a1 + yaw + 360 * k), w2 = Math.min(90, a2 + yaw + 360 * k);
    if (w2 - w1 < 0.4) continue;
    const n = Math.max(2, Math.ceil((w2 - w1) / 4));
    const B = [];
    for (let i = 0; i <= n; i++) {
      const w = lerp(w1, w2, i / n);
      const y = vyska(uhel180(w - yaw));
      B.push([VAZ.cx + polomer(y) * Math.sin(rad(w)), y + polomer(y) * E * Math.cos(rad(w))]);
    }
    d += cara(B) + " ";
  }
  return d;
};
/**
 * Co je nakreslené zepředu (tvář, zátylek, spona), posadí na povrch v azimutu
 * `az`: posune do strany a zúží, jak se váza otáčí. Za vázou nevrací nic.
 */
export const naPovrch = (obsah, az, yaw, r, y = VAZ.c[1], { min = 0.02 } = {}) => {
  const w = rad(az + yaw), c = Math.cos(w);
  if (c < min) return "";
  return `<g transform="translate(${f(VAZ.cx + r * Math.sin(w))} ${f(-r * E * (1 - c))}) scale(${f(c)} 1) translate(${-VAZ.cx} 0)">${obsah}</g>`;
};

/* ——— Kde co na těle je (výšky na boku; vepředu to vychází o poloměr × E níž) ——— */
/** Hranice vlasů: vepředu vysoké čelo, na spáncích níž, vzadu ještě níž. */
const yVlasy = (az) => {
  const a = Math.abs(az);
  return a <= 78 ? 76.4 + 7.4 * smooth(a / 78) : 83.8 + 2.2 * smooth((a - 78) / 102);
};
/* kimono se zavírá levou stranou přes pravou: divák vidí písmeno y */
const PREKRYV = 5.8;
const yVzadu = (az) => 101 + 5 * smooth((Math.abs(az) - 105) / 75);
/** Horní okraj svrchního dílu (z pohledu diváka zprava nahoře doleva dolů). */
const yLimecP = (az) => (az > 105 ? yVzadu(az) : 118.5 - (az + 12) * 0.1496);
/** Horní okraj spodního dílu (zleva nahoře ke křížení). */
const yLimecL = (az) => (az < -105 ? yVzadu(az) : 101 + (az + 105) * 0.1339);
const yKimono = (az) => (az >= PREKRYV ? yLimecP(az) : yLimecL(az));
export const OBI = { od: 117.6, po: 135.4, snura: 126.6 };
const DNO = () => 160;

/** Kosočtvercový kvítek na obi (hanabishi), kolem počátku. */
const HANABISHI = "M0 -2.5 Q0.8 -0.8 2.5 0 Q0.8 0.8 0 2.5 Q-0.8 0.8 -2.5 0 Q-0.8 -0.8 0 -2.5 Z";
/** Plátek sakury ze značky: pata v 0,0, špička nahoře v −12,6. */
export const PLATEK = "M0 0 C-2.5 -1.5 -4.1 -3.9 -4.2 -6.6 C-4.3 -9.4 -3.1 -11.5 -1.9 -12.6 L0 -9.5 L1.9 -12.6 C3.1 -11.5 4.3 -9.4 4.2 -6.6 C4.1 -3.9 2.5 -1.5 0 0 Z";
/* lístky rozsypané u lemu kimona: azimut, výška, natočení, velikost */
const LEM_LISTKY = (() => {
  const r = rng(418);
  return Array.from({ length: 13 }, (_, i) => ({ az: -180 + i * 27.7 + (r() - 0.5) * 12, y: 138.4 + r() * 6.4, rot: r() * 360, s: 0.2 + r() * 0.13, svetly: r() < 0.5 }));
})();

/** Přechody a ořez Vázičky. `P` je paleta (DEN nebo NOC). */
export const vazDefs = (id, P = DEN) =>
  `<linearGradient id="${id}-bila" gradientUnits="userSpaceOnUse" x1="58" y1="0" x2="124" y2="0"><stop offset="0" stop-color="${P.bila[1]}"/><stop offset="0.3" stop-color="${P.bila[0]}"/><stop offset="0.62" stop-color="${P.bila[1]}"/><stop offset="1" stop-color="${P.bila[2]}"/></linearGradient>` +
  `<linearGradient id="${id}-vlasy" gradientUnits="userSpaceOnUse" x1="72" y1="0" x2="108" y2="0"><stop offset="0" stop-color="${P.vlasy[1]}"/><stop offset="0.3" stop-color="${P.vlasy[0]}"/><stop offset="0.55" stop-color="${P.vlasy[1]}"/><stop offset="1" stop-color="${P.vlasy[2]}"/></linearGradient>` +
  `<linearGradient id="${id}-kimono" gradientUnits="userSpaceOnUse" x1="0" y1="98" x2="0" y2="150"><stop offset="0" stop-color="${P.kimono[0]}"/><stop offset="0.55" stop-color="${P.kimono[1]}"/><stop offset="1" stop-color="${P.kimono[2]}"/></linearGradient>` +
  `<linearGradient id="${id}-obi" gradientUnits="userSpaceOnUse" x1="0" y1="116" x2="0" y2="142"><stop offset="0" stop-color="${P.obi[0]}"/><stop offset="1" stop-color="${P.obi[1]}"/></linearGradient>` +
  /* objem: světlo zleva, stín vpravo a u paty; leží přes všechno, co je na váze namalované */
  `<linearGradient id="${id}-objem" gradientUnits="userSpaceOnUse" x1="56" y1="0" x2="124" y2="0"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="0.24" stop-color="#FFFFFF" stop-opacity="0.2"/><stop offset="0.5" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="0.74" stop-color="#1E1626" stop-opacity="0.05"/><stop offset="1" stop-color="#1E1626" stop-opacity="0.3"/></linearGradient>` +
  `<linearGradient id="${id}-pata" gradientUnits="userSpaceOnUse" x1="0" y1="128" x2="0" y2="150"><stop offset="0" stop-color="#1E1626" stop-opacity="0"/><stop offset="1" stop-color="#1E1626" stop-opacity="0.22"/></linearGradient>` +
  `<linearGradient id="${id}-drevo" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${P.drevo[0]}"/><stop offset="0.6" stop-color="${P.drevo[1]}"/><stop offset="1" stop-color="${P.drevo[2]}"/></linearGradient>` +
  `<linearGradient id="${id}-rukav" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.kimono[0]}"/><stop offset="0.6" stop-color="${P.kimono[1]}"/><stop offset="1" stop-color="${P.kimono[2]}"/></linearGradient>` +
  `<linearGradient id="${id}-masle" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.obi[0]}"/><stop offset="1" stop-color="${P.obi[1]}"/></linearGradient>` +
  `<clipPath id="${id}-telo"><path d="${TELO_D}"/></clipPath>`;

/**
 * Váza se vším, co je na ní namalované: vlasy, kimono se zkříženým límcem,
 * obi se šňůrou, vzor a lístky u lemu. Kreslí se znovu, jen když se otočí.
 */
export const vazTelo = (id, { yaw = 0, P = DEN, listky = "#FBE9B7", listky2 = "#F2B8C0" } = {}) => {
  let s = `<path d="${TELO_D}" fill="url(#${id}-bila)"/>`;
  s += `<g clip-path="url(#${id}-telo)">`;
  /* vlasy: černá glazura přes hrdlo a ramena */
  s += `<path d="${pruh(() => 40, yVlasy, yaw)}" fill="url(#${id}-vlasy)"/>`;
  s += `<path d="${linka((az) => yVlasy(az) + 0.5, yaw)}" stroke="${P.vlasy[2]}" stroke-width="0.5" fill="none" opacity="0.5"/>`;
  /* červený spodní límec, kimono, šev svrchního límce */
  s += `<path d="${pruh((az) => yLimecL(az) - 3, yLimecL, yaw, -180, PREKRYV + 2)}" fill="${P.limec}"/>`;
  s += `<path d="${pruh(yKimono, DNO, yaw)}" fill="url(#${id}-kimono)"/>`;
  s += `<path d="${pruh((az) => yLimecP(az) - 3, yLimecP, yaw, -12, 180)}" fill="${P.limec}"/>`;
  s += `<path d="${linka((az) => yLimecP(az) + 3.4, yaw, -12, 180)} ${linka((az) => yLimecL(az) + 3.4, yaw, -180, PREKRYV - 4)}" stroke="${P.kimono[2]}" stroke-width="0.55" fill="none" opacity="0.85"/>`;
  /* kimono se pod obi překrývá: hrana svrchního dílu běží šikmo dolů */
  const hrana = [];
  for (let q = 0; q <= 1.001; q += 0.25) hrana.push(naTele(lerp(-8, -20, q), lerp(OBI.po, VAZ.zakl + 2, q), yaw));
  if (hrana[0][2] > 0.1) s += `<path d="${cara(hrana)}" stroke="${P.kimono[2]}" stroke-width="0.6" fill="none" opacity="0.8"/>`;
  /* červená podšívka vykukuje u lemu */
  s += `<path d="${pruh(() => 145.6, DNO, yaw)}" fill="${P.limec}" opacity="0.9"/>`;
  for (const l of LEM_LISTKY) {
    const [x, y, k] = naTele(l.az, l.y, yaw);
    if (k > 0.12) s += `<path d="${PLATEK}" transform="translate(${f(x)} ${f(y)}) scale(${f(l.s * k)} ${l.s}) rotate(${f(l.rot)})" fill="${l.svetly ? listky : listky2}" opacity="${f(0.55 + 0.4 * k)}"/>`;
  }
  /* obi: široký pás, na něm kvítky ve dvou řadách, šňůra obijime */
  s += `<path d="${pruh(() => OBI.od, () => OBI.po, yaw)}" fill="url(#${id}-obi)"/>`;
  for (let i = 0; i < 20; i++) {
    const [x, y, k] = naTele(-180 + i * 18, i % 2 ? 122 : 131.2, yaw);
    if (k > 0.12) s += `<path d="${HANABISHI}" transform="translate(${f(x)} ${f(y)}) scale(${f(0.86 * k)} 0.86)" fill="${P.zlato}" opacity="${f(0.5 + 0.5 * k)}"/>`;
  }
  s += `<path d="${linka(() => OBI.od + 0.6, yaw)}" stroke="#FFF4E6" stroke-width="0.9" fill="none" opacity="0.4"/>`;
  s += `<path d="${linka(() => OBI.od, yaw)} ${linka(() => OBI.po, yaw)}" stroke="${P.obrys}" stroke-width="0.9" fill="none"/>`;
  s += `<path d="${pruh(() => OBI.snura - 1.1, () => OBI.snura + 1.1, yaw)}" fill="${P.zlatoSv}" stroke="${P.obrys}" stroke-width="0.4"/>`;
  /* objem a stín u paty přes všechno */
  s += `<path d="${TELO_D}" fill="url(#${id}-objem)"/><path d="${TELO_D}" fill="url(#${id}-pata)"/>`;
  /* lesk na glazuře: dlouhý na břiše, krátký na hrdle */
  s += `<path d="M66.4 97 C63.4 106 63.4 118 66.8 127" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round" fill="none" opacity="0.3"/>`;
  s += `<path d="M82.4 62.6 C81 66 81 71 82.2 75.4" stroke="#FFFFFF" stroke-width="1.7" stroke-linecap="round" fill="none" opacity="0.3"/>`;
  s += `</g>`;
  s += `<path d="${TELO_D}" fill="none" stroke="${P.obrys}" stroke-width="1.5" stroke-linejoin="round"/>`;
  /* hrdlo: tmavý otvor, do kterého mizí stonek */
  s += `<ellipse cx="${VAZ.cx}" cy="${VAZ.hrdlo}" rx="${f(R_HRDLA - 2.6)}" ry="${f((R_HRDLA - 2.6) * E + 0.5)}" fill="#0E0C10"/>`;
  s += `<path d="M${f(VAZ.cx - R_HRDLA + 1.6)} ${VAZ.hrdlo - 0.6} A${f(R_HRDLA - 1.6)} ${f(R_HRDLA * E + 0.5)} 0 0 1 ${f(VAZ.cx + 2)} ${f(VAZ.hrdlo - R_HRDLA * E - 1)}" stroke="#FFFFFF" stroke-width="0.7" stroke-linecap="round" fill="none" opacity="0.35"/>`;
  return s;
};
/** Celá postava jednou barvou — stín, kterým ji přikryje noc (vrstva se násobí). */
export const vazSilueta = (barva) => `<path d="${TELO_D}" fill="${barva}"/>`;

/* ——— Spona na šňůře obi (pocchiri) a hřeben ve vlasech: sedí vepředu ——— */
export const vazSpona = (id, { yaw = 0, P = DEN } = {}) => {
  const y = OBI.snura + polomer(OBI.snura) * E;
  const spona =
    `<ellipse cx="90" cy="${f(y)}" rx="4.6" ry="3.5" fill="${P.zlatoSv}" stroke="${P.obrys}" stroke-width="0.7"/>` +
    `<ellipse cx="90" cy="${f(y)}" rx="2.9" ry="2.1" fill="#5FA89A" stroke="${P.obrys}" stroke-width="0.4"/>` +
    `<ellipse cx="89" cy="${f(y - 0.7)}" rx="1" ry="0.6" fill="#FFFFFF" opacity="0.8"/>`;
  const yh = 68.4;
  const hreben =
    `<path d="M83.4 ${yh + 2.6} Q90 ${yh - 2} 96.6 ${yh + 2.6} L95.8 ${yh + 5.4} Q90 ${yh + 1.6} 84.2 ${yh + 5.4} Z" fill="${P.zlatoSv}" stroke="${P.obrys}" stroke-width="0.6" stroke-linejoin="round"/>` +
    `<path d="M86 ${yh + 2.2} L86.6 ${yh + 4} M88.6 ${yh + 1.4} L88.9 ${yh + 3.2} M91.4 ${yh + 1.4} L91.1 ${yh + 3.2} M94 ${yh + 2.2} L93.4 ${yh + 4}" stroke="${P.zlato}" stroke-width="0.5" fill="none"/>`;
  return naPovrch(spona, 0, yaw, polomer(OBI.snura)) + naPovrch(hreben, 0, yaw, polomer(70));
};

/**
 * Tvář gejši v souřadnicích pohledu zepředu. dx/dy posouvá pohled, mrk 0…1
 * zavírá oči (jen u otevřených).
 * vyraz: klid | kouka | usmev | uzas | prisna | mrk | stydi
 */
export const vazTvar = ({ dx = 0, dy = 0, mrk = 0, vyraz = "klid", P = DEN, tvare = 0.5 } = {}) => {
  const ox = clamp(dx, -2, 2), oy = clamp(dy, -1.4, 1.4);
  const S = `stroke="${P.oko}" stroke-linecap="round" stroke-linejoin="round" fill="none"`;
  const C = `stroke="${P.ret}" stroke-linecap="round" stroke-linejoin="round" fill="none"`;
  const L = [80.4, 97], Pr = [99.6, 97];
  const tv = vyraz === "stydi" ? 1.7 : vyraz === "usmev" ? 1.25 : 1;
  let s = `<ellipse cx="76.6" cy="103.4" rx="${f(5 * Math.min(tv, 1.3))}" ry="${f(3 * Math.min(tv, 1.3))}" fill="${P.tvare}" opacity="${f(clamp(tvare * tv))}"/><ellipse cx="103.4" cy="103.4" rx="${f(5 * Math.min(tv, 1.3))}" ry="${f(3 * Math.min(tv, 1.3))}" fill="${P.tvare}" opacity="${f(clamp(tvare * tv))}"/>`;
  /* krátké vysoké obočí; zved ho zvedne, sklon stáhne ke kořeni nosu */
  const oboci = (zved = 0, sklon = 0) =>
    `<path d="M76.8 ${f(90.4 - zved - sklon)} Q80.4 ${f(88.3 - zved)} 84 ${f(89.4 - zved + sklon)} M96 ${f(89.4 - zved + sklon)} Q99.6 ${f(88.3 - zved)} 103.2 ${f(90.4 - zved - sklon)}" ${S} stroke-width="1.5" opacity="0.82"/>`;
  /* rumělka ve vnějších koutcích */
  const koutky = `<path d="M75.6 97.2 Q74.2 96.4 73.6 94.6 M104.4 97.2 Q105.8 96.4 106.4 94.6" ${C} stroke-width="1.3"/>`;
  const sklopena = (kde) =>
    (kde <= 0 ? `<path d="M76.6 96.2 Q80.4 99.6 84.2 96.2" ${S} stroke-width="1.9"/>` : "") +
    (kde >= 0 ? `<path d="M95.8 96.2 Q99.6 99.6 103.4 96.2" ${S} stroke-width="1.9"/>` : "");
  const stastna = (kde) =>
    (kde <= 0 ? `<path d="M76.6 98.4 Q80.4 94 84.2 98.4" ${S} stroke-width="1.9"/>` : "") +
    (kde >= 0 ? `<path d="M95.8 98.4 Q99.6 94 103.4 98.4" ${S} stroke-width="1.9"/>` : "");
  const otevrene = ([x, y], rx, ry) =>
    `<ellipse cx="${f(x + ox)}" cy="${f(y + oy)}" rx="${rx}" ry="${f(Math.max(0.3, ry))}" fill="${P.oko}"/>` +
    (ry > 1.4 ? `<circle cx="${f(x + ox - rx * 0.34)}" cy="${f(y + oy - ry * 0.36)}" r="${f(rx * 0.36)}" fill="#FFF8EC"/>` : "") +
    `<path d="M${f(x - 3.9)} ${f(y - 1.9)} Q${x} ${f(y - 4.5 + 2.4 * (1 - clamp(ry / 3)))} ${f(x + 3.9)} ${f(y - 1.9)}" ${S} stroke-width="1"/>`;
  /* ústa jako poupě: horní ret dva obloučky, spodní plný */
  const poupe = `<path d="M87.6 107.6 Q88.9 106.4 90 107.3 Q91.1 106.4 92.4 107.6 Q90 111.2 87.6 107.6 Z" fill="${P.ret}"/>`;
  const usmev = `<path d="M86.6 107.2 Q88.6 106.2 90 107.1 Q91.4 106.2 93.4 107.2 Q90 112 86.6 107.2 Z" fill="${P.ret}"/>`;
  const ry = 3.1 * (1 - mrk * 0.94);
  if (vyraz === "kouka") s += oboci(0.6) + koutky + otevrene(L, 2.5, ry) + otevrene(Pr, 2.5, ry) + poupe;
  else if (vyraz === "usmev") s += oboci(0.9) + koutky + stastna(0) + usmev;
  else if (vyraz === "stydi") s += oboci(1.2, -0.5) + koutky + stastna(0) + poupe;
  else if (vyraz === "uzas") s += oboci(2.6) + koutky + otevrene(L, 3, 3.3) + otevrene(Pr, 3, 3.3) + `<ellipse cx="90" cy="108.6" rx="1.7" ry="2.1" fill="${P.ret}"/>`;
  else if (vyraz === "mrk") s += oboci(0.7) + koutky + otevrene(L, 2.5, ry) + stastna(1) + usmev;
  else if (vyraz === "prisna") {
    /* sensei, když se hrbíš: obočí dolů, víčka napůl, ústa rovně */
    for (const [x, y] of [L, Pr]) s += `<path d="M${f(x + ox * 0.6 - 2.7)} ${f(y - 0.8)} h5.4 a2.7 2.6 0 0 1 -5.4 0 Z" fill="${P.oko}"/><path d="M${f(x - 3.9)} ${f(y - 0.9)} H${f(x + 3.9)}" ${S} stroke-width="1.5"/>`;
    s += oboci(-0.6, 1.1) + koutky + `<path d="M87.4 108.4 H92.6" ${C} stroke-width="1.7"/>`;
  } else s += oboci(0) + koutky + sklopena(0) + poupe;
  return s;
};
/** Tvář posazená na břicho natočené vázy. */
export const vazTvarNa = (id, yaw, volby) => {
  const tvar = naPovrch(vazTvar(volby), 0, yaw, 30.5, 100, { min: 0.16 });
  return tvar ? `<g clip-path="url(#${id}-telo)">${tvar}</g>` : "";
};

/** Zátylek: pod vlasy zůstávají v bílém líčení dva nenalíčené hroty (eri-ashi). Je vidět jen zezadu. */
export const vazZatylek = (id, { yaw = 0, P = DEN } = {}) =>
  naPovrch(
    `<path d="M84.6 88.4 C85 93.4 86 97.6 87.4 101 C88.2 97.6 88.6 93.6 88.6 88.6 Z M91.4 88.6 C91.4 93.6 91.8 97.6 92.6 101 C94 97.6 95 93.4 95.4 88.4 Z" fill="${P.kuze}" stroke="${P.obrys}" stroke-width="0.35" stroke-linejoin="round" opacity="0.95"/>`,
    180, yaw, 26, 94, { min: 0.2 },
  );

/* ═══════════════════════════════════════════════════════════════════
 * Mašle obi na zádech (darari): dvě smyčky a dva dlouhé volné konce
 * ═══════════════════════════════════════════════════════════════════ */
const zrcadli = (d) => {
  let x = true;
  return d.replace(/-?\d+(\.\d+)?/g, (n) => {
    const v = x ? String(f(-Number(n))) : n;
    x = !x;
    return v;
  });
};
const MASLE_L = {
  smycka: "M-2 118.6 C-12 109.4 -30 105.6 -38.6 110.8 C-43.6 114.2 -42.4 123 -36.6 126.2 C-26 130.6 -12 128.2 -2 124.6 Z",
  vnitrek: "M-6 119.6 C-14 113.6 -27 111.2 -33.4 114.4 C-36.6 116.4 -35.8 121.4 -32 123 C-24 125.6 -14 124 -6 121.6 Z",
  sklady: "M-3 120.4 C-13 115.4 -25 113 -35 114.4 M-3 123 C-13 123.4 -24 124.6 -34.6 123.4",
};
const MASLE_P = Object.fromEntries(Object.entries(MASLE_L).map(([k, d]) => [k, zrcadli(d)]));
/** Jeden volný konec: pruh látky od uzlu skoro k zemi, dole šikmo střižený, s kvítkem domu. */
const konecObi = (id, x0, strana, kyv, P) => {
  const B = [];
  for (let q = 0; q <= 1.001; q += 0.2) B.push([x0 + strana * 2.2 * q + kyv * 9 * q * q, 123 + 30.4 * q]);
  const d = pasPoBodech(B, (q) => lerp(11, 13.4, q));
  const [kx, ky] = B[4];
  return (
    `<path d="${d}" fill="url(#${id}-masle)" stroke="${P.obrys}" stroke-width="0.9" stroke-linejoin="round"/>` +
    `<path d="${cara(B.slice(1))}" stroke="#FFF4E6" stroke-width="0.6" fill="none" opacity="0.25" transform="translate(${-strana * 3} 0)"/>` +
    `<g transform="translate(${f(kx)} ${f(ky)}) scale(0.26)" fill="${P.zlatoSv}">${[0, 72, 144, 216, 288].map((u) => `<path d="${PLATEK}" transform="rotate(${u}) translate(0 -1.7)"/>`).join("")}</g>` +
    `<path d="M${f(B[5][0] - 6.6)} ${f(B[5][1] - 3.4)} L${f(B[5][0] + 6.6)} ${f(B[5][1] - 3.4)}" stroke="${P.zlato}" stroke-width="1.1" opacity="0.9"/>`
  );
};
/**
 * Mašle v rovině zad. `kyv` −1…1 rozhoupe volné konce. Vrací { za, pred }:
 * zepředu je mašle za vázou (vykukují jen smyčky), zezadu před ní.
 */
export const vazMasle = (id, { yaw = 0, P = DEN, kyv = 0 } = {}) => {
  const w = rad(180 + yaw), c = Math.cos(w);
  const d = polomer(122) + 1.5;
  const sirka = Math.sign(c || 1) * Math.max(0.2, Math.abs(c));
  let s = `<g transform="translate(${f(VAZ.cx + d * Math.sin(w))} ${f(d * E * c)}) scale(${f(sirka)} 1)">`;
  s += konecObi(id, -7.4, -1, kyv, P) + konecObi(id, 7.4, 1, kyv * 0.8, P);
  /* smyčky jsou užší než břicho, takže zepředu za vázou nejsou vidět */
  s += `<g transform="scale(0.8 1)">`;
  for (const m of [MASLE_L, MASLE_P])
    s += `<path d="${m.smycka}" fill="url(#${id}-masle)" stroke="${P.obrys}" stroke-width="1" stroke-linejoin="round"/><path d="${m.vnitrek}" fill="#2B2420" opacity="0.2"/><path d="${m.sklady}" stroke="#2B2420" stroke-width="0.6" fill="none" opacity="0.28"/>`;
  s += `</g>`;
  s += `<rect x="-5.4" y="115" width="10.8" height="13" rx="3.4" fill="url(#${id}-masle)" stroke="${P.obrys}" stroke-width="1"/><path d="M-5.4 121.4 H5.4" stroke="${P.zlatoSv}" stroke-width="1.6"/>`;
  s += `</g>`;
  return c > 0 ? { za: "", pred: s } : { za: s, pred: "" };
};

/* ═══════════════════════════════════════════════════════════════════
 * Květy dvanácti měsíců: maiko mění kanzashi každý měsíc
 * ═══════════════════════════════════════════════════════════════════ */
const dokola = (n, d, atributy = "", odsun = 0, pootoc = 0) =>
  Array.from({ length: n }, (_, i) => `<path d="${d}" transform="rotate(${f((i * 360) / n + pootoc)}) translate(0 ${-odsun})"${atributy}/>`).join("");
const KULATY = "M0 0 C-3.4 -0.6 -4 -5 0 -5.6 C4 -5 3.4 -0.6 0 0 Z";
const SPICATY = "M0 0 C-2.6 -1.4 -2.8 -3.8 0 -6.2 C2.8 -3.8 2.6 -1.4 0 0 Z";
const UZKY = "M0 0 C-1.1 -1.6 -1.1 -4.2 0 -5.8 C1.1 -4.2 1.1 -1.6 0 0 Z";
const tycinky = (n, r, barva) => Array.from({ length: n }, (_, i) => `<circle cx="${f(Math.cos((i / n) * 6.283) * r)}" cy="${f(Math.sin((i / n) * 6.283) * r)}" r="0.45" fill="${barva}"/>`).join("");
/** List javoru: sedm laloků kolem řapíku. */
const JAVOR = (() => {
  const L = [[-90, 6.4], [-52, 5.6], [-128, 5.6], [-14, 4.6], [-166, 4.6], [24, 3], [156, 3]].sort((a, b) => a[0] - b[0]);
  let d = "";
  L.forEach(([a, l], i) => {
    const dal = L[(i + 1) % L.length];
    const mezi = (a + (i === L.length - 1 ? dal[0] + 360 : dal[0])) / 2;
    d += `${i ? "L" : "M"}${f(Math.cos(rad(a)) * l)} ${f(Math.sin(rad(a)) * l)} L${f(Math.cos(rad(mezi)) * 1.9)} ${f(Math.sin(rad(mezi)) * 1.9)} `;
  });
  return d + "Z";
})();
/**
 * Dvanáct měsíců. `kvet` je květ kolem počátku (poloměr asi 6), `visi` říká,
 * že nesedí na větvi, ale visí z ní; `list` je to, co z něj opadává.
 */
export const MESICE = [
  { id: "matsu", nazev: "borovice", barva: "#3E7A5A", list: UZKY, listB: ["#3E7A5A", "#6FA27C"],
    kvet: `<g stroke="#3E7A5A" stroke-width="0.9" stroke-linecap="round" fill="none">${Array.from({ length: 11 }, (_, i) => `<path d="M0 1 L${f(Math.cos(rad(-170 + i * 16)) * 6.4)} ${f(1 + Math.sin(rad(-170 + i * 16)) * 6.4)}"/>`).join("")}</g><circle cx="0" cy="1" r="1.7" fill="#C4432B"/><circle cx="0" cy="1" r="0.7" fill="#F6DA8C"/>` },
  { id: "ume", nazev: "švestka", barva: "#D9506A", list: KULATY, listB: ["#D9506A", "#F2A0AE"],
    kvet: dokola(5, KULATY, ` fill="#D9506A"`, 0.4) + dokola(5, "M0 0 L0 -3.2", ` stroke="#FBE9B7" stroke-width="0.4"`, 0, 36) + tycinky(7, 2.5, "#FBE9B7") + `<circle r="1" fill="#F6DA8C"/>` },
  { id: "nanohana", nazev: "řepka", barva: "#EDC23C", list: KULATY, listB: ["#EDC23C", "#F8E08A"],
    kvet: dokola(4, KULATY, ` fill="#EDC23C"`, 0.2, 45) + dokola(4, "M0 0 C-1.4 -0.4 -1.8 -2.4 0 -2.8 C1.8 -2.4 1.4 -0.4 0 0 Z", ` fill="#F8E08A"`) + `<circle r="1" fill="#7FA35A"/>` },
  { id: "sakura", nazev: "sakura", barva: "#F2A9B8", list: PLATEK, listB: ["#F2A9B8", "#FBD9DE"], meritko: 0.46,
    kvet: `<g transform="scale(0.46)">${dokola(5, PLATEK, ` fill="#F2A9B8"`, 1.7)}</g>` + dokola(5, "M0 0 L0 -2.4", ` stroke="#C4432B" stroke-width="0.35"`, 0, 36) + `<circle r="0.9" fill="#C4432B"/>` },
  { id: "fuji", nazev: "vistárie", barva: "#8E78C8", list: KULATY, listB: ["#8E78C8", "#C3B4E6"], visi: true,
    kvet: [[0, 1.6, 2.6], [-2.2, 3.6, 2.4], [2.2, 4, 2.4], [-1, 6.4, 2.2], [1.8, 7.6, 2], [-0.4, 9.6, 1.8], [0.6, 11.8, 1.4], [0.2, 13.6, 1]].map(([x, y, r], i) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${f(r * 0.86)}" fill="${mix("#C3B4E6", "#6E58B0", i / 7)}"/>`).join("") + `<path d="M0 0 V2" stroke="#6FA27C" stroke-width="0.6"/>` },
  { id: "ajisai", nazev: "hortenzie", barva: "#6F8FD8", list: KULATY, listB: ["#6F8FD8", "#A9B8EC"],
    kvet: [[0, 0, "#8FA6E6"], [-3.2, -1.6, "#6F8FD8"], [3.2, -1.4, "#9A8CDC"], [-1.8, 3, "#9A8CDC"], [2, 3, "#6F8FD8"], [0, -3.8, "#A9B8EC"]].map(([x, y, b]) => `<g transform="translate(${x} ${y}) scale(0.5)">${dokola(4, KULATY, ` fill="${b}"`, 0, 45)}<circle r="0.9" fill="#F4F1FF"/></g>`).join("") },
  { id: "uchiwa", nazev: "vějířky", barva: "#5FA8C8", list: KULATY, listB: ["#5FA8C8", "#CFE6EE"],
    kvet: `<path d="M0 3 V8" stroke="#B88A58" stroke-width="1.1" stroke-linecap="round"/><ellipse cx="0" cy="-1" rx="5" ry="4.8" fill="#F6F1E4" stroke="#B88A58" stroke-width="0.5"/><path d="M-4.2 0.6 Q-2 -1.6 0 0.4 Q2 2.4 4.2 0.2 M-3.4 2.6 Q-1.6 0.8 0 2.4 Q1.6 4 3.4 2.2" stroke="#5FA8C8" stroke-width="0.7" fill="none"/><circle cx="1.6" cy="-3" r="1.3" fill="#C4432B"/>` },
  { id: "asagao", nazev: "svlačec", barva: "#6A62C8", list: SPICATY, listB: ["#6A62C8", "#B4AEEA"],
    kvet: `<circle r="5.6" fill="#6A62C8"/><circle r="5.6" fill="none" stroke="#8E88DC" stroke-width="0.8"/>` + dokola(5, "M0 0 L-0.7 -5.2 L0.7 -5.2 Z", ` fill="#F4F1FF"`) + `<circle r="1.1" fill="#F6DA8C"/>` },
  { id: "kikyo", nazev: "zvonek", barva: "#7C6CC4", list: SPICATY, listB: ["#7C6CC4", "#B9AEE2"],
    kvet: dokola(5, "M0 0 C-3.4 -1.2 -2.8 -4 0 -6.6 C2.8 -4 3.4 -1.2 0 0 Z", ` fill="#7C6CC4"`) + dokola(5, "M0 0 L0 -4.4", ` stroke="#5A4AA8" stroke-width="0.35"`) + `<circle r="1.1" fill="#F4F1FF"/>` },
  { id: "kiku", nazev: "chryzantéma", barva: "#E8B440", list: UZKY, listB: ["#E8B440", "#F6DA8C"],
    kvet: dokola(12, UZKY, ` fill="#D99A2E"`, 0.6) + dokola(12, UZKY, ` fill="#F0C452"`, 0, 15).replace(/translate\(0 -?0\)/g, "scale(0.78)") + `<circle r="1.4" fill="#C4432B"/>` },
  { id: "momiji", nazev: "javor", barva: "#D4522E", list: JAVOR, listB: ["#D4522E", "#E8943C"], meritko: 0.62,
    kvet: `<path d="${JAVOR}" fill="#D4522E" stroke="#A8381E" stroke-width="0.3" stroke-linejoin="round"/><path d="M0 0 V-5.6 M0 0 L-3.2 -3.6 M0 0 L3.2 -3.6 M0 0 V3.4" stroke="#A8381E" stroke-width="0.35" fill="none"/>` },
  { id: "mochibana", nazev: "mochibana", barva: "#FFFFFF", list: "M0 -2 A2 2 0 1 1 0 2 A2 2 0 1 1 0 -2 Z", listB: ["#FFFFFF", "#F6C8D2"], meritko: 0.7,
    kvet: `<path d="M-5 3.4 Q0 0 5 -3.4" stroke="#8C6444" stroke-width="0.7" fill="none"/>` + [[-4, 2.6, "#FFFFFF"], [-1.4, 1, "#F6C8D2"], [1.4, -1, "#FFFFFF"], [4, -2.6, "#F6C8D2"]].map(([x, y, b]) => `<circle cx="${x}" cy="${y}" r="2.1" fill="${b}" stroke="#D8B8B0" stroke-width="0.3"/>`).join("") },
];
/** Květy jako znovupoužitelné kusy: `${id}-m3` je květ, `${id}-l3` lístek, co opadává. */
export const kvetyDefs = (id, mesice = MESICE.map((_, i) => i), kryti = 1) =>
  mesice.map((m) => `<g id="${id}-m${m}"${kryti < 1 ? ` opacity="${kryti}"` : ""}>${MESICE[m].kvet}</g>`).join("");
export const kvet = (id, m, [x, y], { s = 1, rot = 0, op = 1 } = {}) =>
  `<use href="#${id}-m${m}" transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(${f(s)})"${op < 1 ? ` opacity="${f(op)}"` : ""}/>`;
/** Lístek, který opadává (malý, jednou barvou). */
export const listek = (m, [x, y], { s = 1, rot = 0, op = 1, svetly = false } = {}) => {
  const M = MESICE[m];
  return `<path d="${M.list}" transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(${f(s * (M.meritko || 0.9))})" fill="${M.listB[svetly ? 1 : 0]}" opacity="${f(op)}"/>`;
};

/* ═══════════════════════════════════════════════════════════════════
 * Větvička z hrdla a ozdoby ve vlasech
 * ═══════════════════════════════════════════════════════════════════ */
/* hlavní stonek a dvě odbočky; květy sedí na koncích a v paždí */
const STONEK = [[90, 57.6], [90.6, 49], [93.4, 40], [98.6, 31.4], [105.4, 24.6]];
const ODBOCKY = [[[92, 44.4], [88.4, 38.6], [84.6, 34.6]], [[96.4, 34.6], [102, 34], [107.4, 36]]];
export const KVETY_VETVE = [[105.8, 23.4, 1.25, 14], [84, 33.4, 1.02, -22], [108.2, 36.6, 0.86, 38], [96, 29.6, 0.72, 4], [90.8, 45.6, 0.62, -8]];
/**
 * Větvička: `kyv` ji nakloní (stupně, kolem hrdla), `rust` 0…1 nechá květy
 * vyrašit (každý o kousek později).
 */
export const vazVetvicka = (id, m, { kyv = 0, rust = 1, P = DEN } = {}) => {
  let s = `<g transform="rotate(${f(kyv)} ${VAZ.cx} ${VAZ.hrdlo})">`;
  s += `<path d="${pasPoBodech(prevzorkuj(STONEK, 12), (q) => lerp(2.2, 0.8, q))}" fill="${P.stonek}"/>`;
  for (const O of ODBOCKY) s += `<path d="${hladka(O)}" stroke="${P.stonek}" stroke-width="0.95" stroke-linecap="round" fill="none"/>`;
  KVETY_VETVE.forEach(([x, y, vel, rot], i) => {
    const k = dosed((rust - i * 0.12) / 0.5);
    if (k > 0.02) s += kvet(id, m, [x, y], { s: vel * k, rot: rot + (1 - k) * -60 });
  });
  return s + `</g>`;
};

/** Kde ve vlasech sedí kytice kanzashi (azimut, výška) a odkud visí šňůry. */
const KANZASHI = { az: -62, y: 67.4, ven: 6.4 };
export const SNURY = [{ dx: -3.6, delka: 17, n: 5 }, { dx: 0, delka: 21, n: 6 }, { dx: 3.4, delka: 14.5, n: 4 }];
/** Střed kytice na plátně a jak je k divákovi natočená. */
export const kanzashiStred = (yaw = 0) => naTele(KANZASHI.az, KANZASHI.y, yaw, KANZASHI.ven);
/**
 * Ozdoby do vlasů: jehlice kōgai s korálky napříč drdolem a kytice květů
 * měsíce (hana-kanzashi). Vrací { za, pred } podle toho, co je za hrdlem.
 */
export const vazOzdoby = (id, m, { yaw = 0, P = DEN, rust = 1 } = {}) => {
  let za = "", pred = "";
  /* jehlice: konce koukají na obě strany, prostředek je schovaný ve vlasech */
  const yj = 64.6;
  const konec = (az) => naTele(az, yj, yaw, 9.4);
  const A = konec(-90), B = konec(90);
  const jehlice = `<path d="M${pt(A)} L${pt(B)}" stroke="${P.obrys}" stroke-width="2.2" stroke-linecap="round"/><path d="M${pt(A)} L${pt(B)}" stroke="${P.zlatoSv}" stroke-width="1.2" stroke-linecap="round"/>`;
  za += jehlice;
  for (const K of [A, B]) {
    const kulicka = `<circle cx="${f(K[0])}" cy="${f(K[1])}" r="2.5" fill="${P.ret}" stroke="${P.obrys}" stroke-width="0.6"/><circle cx="${f(K[0] - 0.8)}" cy="${f(K[1] - 0.8)}" r="0.7" fill="#FFFFFF" opacity="0.7"/>`;
    if (K[2] >= -0.05) pred += kulicka;
    else za += kulicka;
  }
  /* kytice: jeden velký květ a kolem něj věnec menších */
  const [x, y, k] = kanzashiStred(yaw);
  const sx = lerp(0.5, 1, Math.abs(k));
  let kytice = `<g transform="translate(${f(x)} ${f(y)}) scale(${f(sx)} 1)">`;
  const M = MESICE[m];
  if (M.visi) {
    kytice += `<path d="M-7 -1 Q0 -5 7 -1" stroke="${P.stonek}" stroke-width="1" fill="none"/>`;
    [[-6, -1, 0.9], [-2, -3, 1.05], [2.4, -3, 1], [6.4, -1, 0.85]].forEach(([dx, dy, vel], i) => (kytice += kvet(id, m, [dx, dy], { s: vel * dosed((rust - i * 0.1) / 0.5) })));
  } else {
    for (let i = 0; i < 6; i++) {
      const a = rad(i * 60 + 20), kk = dosed((rust - 0.1 - i * 0.07) / 0.5);
      if (kk > 0.02) kytice += kvet(id, m, [Math.cos(a) * 5.6, Math.sin(a) * 5], { s: 0.6 * kk, rot: i * 47 });
    }
    kytice += kvet(id, m, [0, 0], { s: 0.98 * dosed(rust / 0.5), rot: -10 });
  }
  kytice += `</g>`;
  if (k > -0.4) pred += kytice;
  else za += kytice;
  return { za, pred };
};
/**
 * Šňůry s lístky (shidare), co visí z kytice. `kyv` jsou tři úhly ve
 * stupních — každá šňůra se houpe zvlášť.
 */
export const vazSnury = (id, m, { yaw = 0, kyv = [0, 0, 0], P = DEN, rust = 1 } = {}) => {
  const [x, y, k] = kanzashiStred(yaw);
  if (k < -0.4) return "";
  const sx = lerp(0.5, 1, Math.abs(k));
  const M = MESICE[m];
  let s = "";
  SNURY.forEach((S, i) => {
    const x0 = x + S.dx * sx, y0 = y + 5.4;
    let cesta = `M${f(x0)} ${f(y0)}`, kusy = "";
    for (let j = 1; j <= S.n; j++) {
      /* čím níž, tím víc se vychýlí: šňůra se prohne jako bič */
      const q = j / S.n, a = rad(kyv[i] * (0.4 + 0.6 * q));
      const px = x0 + Math.sin(a) * S.delka * q, py = y0 + Math.cos(a) * S.delka * q;
      cesta += ` L${f(px)} ${f(py)}`;
      const kk = dosed((rust - 0.25 - j * 0.06) / 0.4);
      if (kk > 0.02) kusy += `<path d="${M.list}" transform="translate(${f(px)} ${f(py)}) rotate(${f(180 - kyv[i] * (0.4 + 0.6 * q))}) scale(${f(0.42 * kk * (M.meritko ? M.meritko / 0.46 * 0.5 : 1))})" fill="${M.listB[j % 2]}"/>`;
    }
    s += `<path d="${cesta}" stroke="${P.zlato}" stroke-width="0.35" fill="none" opacity="0.8"/>${kusy}`;
  });
  return s;
};
/** Konec nejdelší šňůry na plátně — tam cinkají plíšky. */
export const snuraKonec = (yaw, kyv) => {
  const [x, y] = kanzashiStred(yaw);
  return [x + Math.sin(rad(kyv)) * 21, y + 5.4 + Math.cos(rad(kyv)) * 21];
};

/* ═══════════════════════════════════════════════════════════════════
 * Ruce a rukávy, okobo, vějíř
 * ═══════════════════════════════════════════════════════════════════ */
/** Kde na boku vázy začíná rukáv (pro stranu −1 vlevo, 1 vpravo z pohledu diváka). */
export const rameno = (strana, yaw = 0) => {
  const [x, y, k] = naTele(strana * 90, 102, yaw);
  return [x, y - 1, k];
};
/** Ručka: bílý oblázek. Paži nemá, je schovaná v rukávu. */
export const vazRuka = (id, [x, y], { uhel = 0, P = DEN, r = 1 } = {}) =>
  `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(4.3 * r)}" ry="${f(3.5 * r)}"${uhel ? ` transform="rotate(${f(uhel)} ${f(x)} ${f(y)})"` : ""} fill="${P.bila[0]}" stroke="${P.obrys}" stroke-width="1"/>`;
/**
 * Rukáv furisode: látka od ramene `A` k zápěstí `H` a pod zápěstím dlouhý
 * vak, který visí a houpe se (`kyv` ve stupních od svislice). Na straně
 * u zápěstí je otevřený, a tak tam svítí červená podšívka.
 */
export const vazRukav = (id, A, H, { kyv = 0, delka = 29, sirka = 15.5, P = DEN, strana = 1, listky = "#FBE9B7" } = {}) => {
  const a = rad(kyv);
  const dolu = [Math.sin(a), Math.cos(a)];
  /* osa paže a kolmice k ní směrem dolů */
  const dx = H[0] - A[0], dy = H[1] - A[1];
  const d = Math.hypot(dx, dy) || 1;
  const u = [dx / d, dy / d];
  /* horní hrana se nad paží trochu vzdouvá */
  const vrch = [A[0] + dx * 0.5 - u[1] * strana * -2.4, A[1] + dy * 0.5 - Math.abs(u[0]) * 2.6 - 1];
  /* vak: dva dolní rohy visí pod zápěstím */
  const R1 = [H[0] + dolu[0] * delka, H[1] + dolu[1] * delka];
  const zpet = [-strana * sirka * Math.cos(a), strana * sirka * Math.sin(a)];
  const R2 = [R1[0] + zpet[0], R1[1] + zpet[1] - 1.5];
  const podpazi = [A[0] + strana * 1.5, A[1] + 12];
  const telo =
    `M${pt(A)} Q${pt(vrch)} ${pt(H)}` +
    ` L${f(R1[0] - dolu[0] * 3)} ${f(R1[1] - dolu[1] * 3)} Q${pt(R1)} ${f(R1[0] + zpet[0] * 0.24)} ${f(R1[1] + zpet[1] * 0.24)}` +
    ` L${f(R2[0] - zpet[0] * 0.24)} ${f(R2[1] - zpet[1] * 0.24)} Q${pt(R2)} ${f(lerp(R2[0], podpazi[0], 0.2))} ${f(lerp(R2[1], podpazi[1], 0.2))}` +
    ` L${pt(podpazi)} Z`;
  let s = `<path d="${telo}" fill="url(#${id}-rukav)" stroke="${P.obrys}" stroke-width="1" stroke-linejoin="round"/>`;
  /* podšívka podél otevřené hrany */
  s += `<path d="M${f(H[0] + dolu[0] * 3)} ${f(H[1] + dolu[1] * 3)} L${f(R1[0] - dolu[0] * 3.4)} ${f(R1[1] - dolu[1] * 3.4)}" stroke="${P.limec}" stroke-width="1.7" stroke-linecap="round" transform="translate(${f(-strana * 1.3 * Math.cos(a))} ${f(strana * 1.3 * Math.sin(a))})"/>`;
  /* pár lístků u dolního rohu */
  const roh = [lerp(R1[0], R2[0], 0.45), lerp(R1[1], R2[1], 0.45)];
  for (const [ox, oy, rot, vel] of [[0, -4.4, 20, 0.26], [-strana * 3.4, -8.6, 150, 0.2], [strana * 2.4, -10.4, 260, 0.18]])
    s += `<path d="${PLATEK}" transform="translate(${f(roh[0] + ox)} ${f(roh[1] + oy * dolu[1])}) rotate(${f(rot + kyv)}) scale(${vel})" fill="${listky}" opacity="0.85"/>`;
  return s;
};

/**
 * Okobo: vysoký dřevák maiko, špalek s červenými pásky. `bok` −1…1 ho natočí
 * bokem (špička je na té straně) a ukáže seříznutou špičku; `zvih` je zvedne.
 */
export const vazOkobo = (id, [x, yZem], { bok = 0, zvih = 0, uhel = 0, P = DEN, vyska = 9.6 } = {}) => {
  const b = Math.abs(bok), kde = Math.sign(bok) || 1;
  const a = 5.6 + 2.4 * b;
  /* nahoře deska, dole užší; špička je u země seříznutá dozadu */
  const spicka = kde * (a - 0.8 - 4.2 * b), pata = -kde * (a - 0.9);
  const d = `M${f(-a)} ${-vyska} H${f(a)} L${f(Math.max(spicka, pata))} 0 H${f(Math.min(spicka, pata))} Z`;
  return (
    `<g transform="translate(${f(x)} ${f(yZem - zvih)}) rotate(${f(uhel)})">` +
    `<path d="${d}" fill="url(#${id}-drevo)" stroke="${P.obrys}" stroke-width="0.95" stroke-linejoin="round"/>` +
    `<path d="M${f(-a + 1.2)} ${f(-vyska + 2)} H${f(a - 1.2)}" stroke="#FFF4E6" stroke-width="0.7" stroke-linecap="round" opacity="0.5"/>` +
    /* bílá ponožka tabi a červený pásek přes ni */
    `<ellipse cx="${f(kde * b * 1.2)}" cy="${f(-vyska - 0.9)}" rx="${f(4.4 + b)}" ry="2.3" fill="${P.bila[0]}" stroke="${P.obrys}" stroke-width="0.7"/>` +
    `<path d="M${f(kde * b * 1.2 - 3.6)} ${f(-vyska - 0.2)} Q${f(kde * b * 3)} ${f(-vyska - 4.6)} ${f(kde * b * 1.2 + 3.6)} ${f(-vyska - 0.2)}" stroke="${P.limec}" stroke-width="1.5" stroke-linecap="round" fill="none"/>` +
    `</g>`
  );
};

/**
 * Tančící vějíř (mai-ōgi). `P0` je čep v dlani, `smer` kam míří střed
 * (stupně, 0 = doprava, −90 = nahoru), `otevreni` 0…1. Papír je krémový
 * s pruhem v barvách soumraku a pár lístky; `tuz` ho přeladí do noci.
 */
export const vazVejir = (id, P0, smer, otevreni = 1, { r = 25, P = DEN, papir = ["#FFFDF6", "#F4E6C2"], pruh: pruhB = ["#C4432B", "#C0708A", "#7A5E8E"], zeber = 9, rozsah = 140 } = {}) => {
  const o = clamp(otevreni, 0.03, 1);
  const pul = (rozsah * o) / 2;
  const na = (a, q) => [P0[0] + Math.cos(rad(smer + a)) * r * q, P0[1] + Math.sin(rad(smer + a)) * r * q];
  const oblouk = (q, a1, a2) => `A${f(r * q)} ${f(r * q)} 0 0 ${a2 > a1 ? 1 : 0} ${pt(na(a2, q))}`;
  let s = "";
  /* žebra z bambusu až k čepu */
  for (let i = 0; i <= zeber; i++) {
    const a = lerp(-pul, pul, i / zeber);
    s += `<path d="M${pt(P0)} L${pt(na(a, 0.5))}" stroke="${P.drevo[1]}" stroke-width="0.8" stroke-linecap="round"/>`;
  }
  /* papír: výseč mezi 0,42 a 1 poloměru, sklad vedle skladu střídá světlo */
  const list = `M${pt(na(-pul, 0.42))} L${pt(na(-pul, 1))} ${oblouk(1, -pul, pul)} L${pt(na(pul, 0.42))} ${oblouk(0.42, pul, -pul)} Z`;
  s += `<path d="${list}" fill="${papir[0]}"/>`;
  for (let i = 0; i < zeber; i++) {
    const a1 = lerp(-pul, pul, i / zeber), a2 = lerp(-pul, pul, (i + 1) / zeber);
    if (i % 2) s += `<path d="M${pt(na(a1, 0.42))} L${pt(na(a1, 1))} ${oblouk(1, a1, a2)} L${pt(na(a2, 0.42))} ${oblouk(0.42, a2, a1)} Z" fill="${papir[1]}"/>`;
  }
  /* pruh soumraku napříč papírem */
  pruhB.forEach((b, i) => {
    const q1 = 0.62 + i * 0.075, q2 = q1 + 0.075;
    s += `<path d="M${pt(na(-pul, q1))} L${pt(na(-pul, q2))} ${oblouk(q2, -pul, pul)} L${pt(na(pul, q1))} ${oblouk(q1, pul, -pul)} Z" fill="${b}" opacity="0.92"/>`;
  });
  s += `<path d="${list}" fill="none" stroke="${P.obrys}" stroke-width="0.8" stroke-linejoin="round"/>`;
  /* krajní lakované dýhy a čep */
  for (const a of [-pul, pul]) s += `<path d="M${pt(P0)} L${pt(na(a, 1.02))}" stroke="${P.vlasy[1]}" stroke-width="1.5" stroke-linecap="round"/>`;
  s += `<circle cx="${f(P0[0])}" cy="${f(P0[1])}" r="1.2" fill="${P.zlatoSv}" stroke="${P.obrys}" stroke-width="0.4"/>`;
  return s;
};

/*
 * Postava po kusech, jak jdou za sebou: scény si je rozdělí do vrstev, aby se
 * překreslovalo jen to, co se změnilo. `o` je póza:
 *   { yaw, m, P, rust, kyv: { masle, snury: [a, b, c], vetev },
 *     ruce: { L: { H, kyv, za }, P: { H, kyv, za } }, vejir: { smer, otevreni } | null, kroky: { L, P } }
 * `H` je zápěstí v souřadnicích postavy, `za` říká, že je ruka za tělem.
 */
/** Co je za vázou: mašle (při pohledu zepředu) a ozdoby na odvrácené straně hrdla. */
export const vazZa = (id, o) => vazMasle(id, { yaw: o.yaw, P: o.P, kyv: o.kyv?.masle || 0 }).za + vazOzdoby(id, o.m ?? 3, { yaw: o.yaw, P: o.P, rust: o.rust ?? 1 }).za;
/** Co je před vázou: spona obi, zátylek, mašle (při pohledu zezadu) a ozdoby na přivrácené straně. */
export const vazPred = (id, o) =>
  vazSpona(id, { yaw: o.yaw, P: o.P }) + vazZatylek(id, { yaw: o.yaw, P: o.P }) +
  vazMasle(id, { yaw: o.yaw, P: o.P, kyv: o.kyv?.masle || 0 }).pred + vazOzdoby(id, o.m ?? 3, { yaw: o.yaw, P: o.P, rust: o.rust ?? 1 }).pred;
/** Dvě okobo pod patou; při natočení se sunou k sobě a vzdálenější je o kousek výš. `kroky` je zvednou. */
export const vazBoty = (id, o) => {
  const c = Math.cos(rad(o.yaw || 0)), s = Math.sin(rad(o.yaw || 0));
  const bota = (str) => vazOkobo(id, [VAZ.cx + str * 8.6 * c, VAZ.zem - (str * s < 0 ? 0.9 : 0)], { bok: s * 0.9, zvih: o.kroky ? o.kroky[str < 0 ? "L" : "P"] : 0, P: o.P });
  return s >= 0 ? bota(-1) + bota(1) : bota(1) + bota(-1);
};
/** Rukávy s ručkami, a ve které je vějíř, ta ho drží. `za` vybere ty za tělem, nebo ty před ním. */
export const vazRukavy = (id, o, za, { listky } = {}) => {
  let s = "";
  for (const kdo of ["L", "P"]) {
    const r = o.ruce[kdo];
    if (!!r.za !== za) continue;
    const A = rameno(kdo === "L" ? -1 : 1, o.yaw);
    s += vazRukav(id, A, r.H, { kyv: r.kyv || 0, strana: clamp((r.H[0] - VAZ.cx) / 14, -1, 1) || 0.01, P: o.P, listky });
    if (kdo === "P" && o.vejir) s += vazVejir(id, r.H, o.vejir.smer, o.vejir.otevreni, { P: o.P, ...(o.vejir.barvy || {}) });
    s += vazRuka(id, r.H, { P: o.P });
  }
  return s;
};
/** Klíč pro vrstvu s rukávy: změní se, jen když se něco z toho pohne. */
export const klicRukavu = (o) =>
  ["L", "P"].map((k) => `${Math.round(o.ruce[k].H[0] * 3)},${Math.round(o.ruce[k].H[1] * 3)},${Math.round((o.ruce[k].kyv || 0) * 2)},${o.ruce[k].za ? 1 : 0}`).join(";") +
  (o.vejir ? `;${Math.round(o.vejir.smer)},${Math.round(o.vejir.otevreni * 40)}` : "") + `;${Math.round((o.yaw || 0) / 2)}`;

/** Stín pod postavou. */
export const vazStin = (x, { rx = 30, op = 0.2, y = VAZ.zem + 0.6 } = {}) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(rx * 0.14)}" fill="#3A2E3A" opacity="${op}"/>`;

/**
 * Tušový lem jako u Pecinčina raku: skvrna rozpité tuše, v ní celá scéna.
 * Vrací cestu skvrny, vrstvu pod scénu a definice filtrů a ořezu
 * (`${id}-tus-orez`), kterým se scéna ořízne.
 */
export const tusLem = (id, { seed = 4, barva = "#241E29", lem = "#3A3240", stred = [90, 92], polomer: pol = [86, 85], skvrny = [0.09, 0.09, 0.15], silaSkvrn = 1.5 } = {}) => {
  const D = hrouda(stred[0], stred[1], pol[0], pol[1], seed, { bodu: 30, kolisani: 0.05 });
  return {
    D,
    skvrna:
      `<path d="${hrouda(stred[0], stred[1], pol[0] + 4, pol[1] + 4, seed + 5, { bodu: 30, kolisani: 0.06 })}" fill="${lem}" opacity="0.55" filter="url(#${id}-tus-lem)"/>` +
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
