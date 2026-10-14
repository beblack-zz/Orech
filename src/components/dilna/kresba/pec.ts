/**
 * Pec dílny — kresby pro stránku Dílna:
 *
 *   pecRez(rezim, p)      elektrická nerezová pec plněná shora v řezu. Přední
 *                         čtvrtina (plášť, víko i dno) je vyříznutá, takže je
 *                         vidět vyzdívka z izolačních cihel s drážkami, spirály
 *                         topného drátu, tři patra šamotových desek na sloupcích
 *                         a kusy: v přežahu naskládané v sobě, v ostrém výpalu
 *                         od sebe a u průhledového otvoru žároměrky
 *   zaromerky(ohnuti, p)  tři žároměrky v hliněné podložce
 *   ranoSvg(p)            ráno po výpalu: tatáž pec s odklopeným víkem, okno se
 *                         svítáním, na stole právě vyndané kusy a miska se zlatem
 *
 * Pec je všude tatáž: rozmery() dá z poloměru pláště všechny míry, plášť,
 * obruče, přezky, svorkovnici, regulátor a stojan kreslí společné funkce.
 * Díváme se trochu shora jako na nádoby (ELIPSA), světlo jde zleva shora.
 *
 * Všechno, co svítí horkem, leží ve vrstvách `${p}-zar` (záře kolem pece,
 * žár na stěnách a spirálách, tónování kusů, horký líc řezu). Stránka přes
 * jejich opacity pec rozpaluje a nechává chladnout: 0 = studená pec, 1 =
 * vrchol výpalu. Bez CSS je vidět vrchol.
 */
import { f, HLINA, smichej, mekkyStin, valcovy, svisly, omez, mix, hladce, jeMatna } from "./zaklad";
import type { Bod, Trojice } from "./zaklad";
import { nadoba, geometrie, ELIPSA, SMRST, OBRYSY } from "./nadoba";
import type { Stav, Tvar } from "./nadoba";

const E = ELIPSA;
const S45 = Math.SQRT1_2;
const RAD = Math.PI / 180;

/* ═══════════════ Drobní pomocníci ═══════════════ */

const xy = (b: Bod) => `${f(b[0])} ${f(b[1])}`;
const mnohouhelnik = (body: Bod[]) => `M${body.map(xy).join(" L")} Z`;
const hladka = (body: Bod[]) => `M${xy(body[0])}${hladce(body)}`;
/** Uzavřená hladká křivka (Catmull-Rom dokola, bez rohu na začátku) */
function uzavrena(body: Bod[]): string {
  const n = body.length;
  let d = `M${xy(body[0])}`;
  for (let i = 0; i < n; i++) {
    const p0 = body[(i - 1 + n) % n];
    const p1 = body[i];
    const p2 = body[(i + 1) % n];
    const p3 = body[(i + 2) % n];
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${xy(p2)}`;
  }
  return `${d} Z`;
}
const plynule = (a: number, b: number, t: number) => {
  const u = omez((t - a) / (b - a));
  return u * u * (3 - 2 * u);
};
/** Offsety přechodů potřebují víc než desetiny */
const o3 = (n: number) => (Math.round(n * 1000) / 1000).toString();

type Zastavka = [number, string, number?];
const stopy = (z: Zastavka[]) =>
  z.map(([o, c, a]) => `<stop offset="${o3(o)}" stop-color="${c}"${a === undefined ? "" : ` stop-opacity="${o3(a)}"`}/>`).join("");
/** Vodorovný přechod v souřadnicích kresby (plášť válce: x0 = levý kraj, x1 = pravý) */
const vodorovny = (id: string, x0: number, x1: number, z: Zastavka[]) =>
  `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${f(x0)}" y1="0" x2="${f(x1)}" y2="0">${stopy(z)}</linearGradient>`;
/** Přechod mezi dvěma body kresby */
const primka = (id: string, a: Bod, b: Bod, z: Zastavka[]) =>
  `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}">${stopy(z)}</linearGradient>`;
/** Kruhový přechod v souřadnicích kresby, sy protáhne svisle */
const kruhovy = (id: string, cx: number, cy: number, r: number, z: Zastavka[], sy = 1) =>
  `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}"${
    sy !== 1 ? ` gradientTransform="translate(${f(cx)} ${f(cy)}) scale(1 ${o3(sy)}) translate(${f(-cx)} ${f(-cy)})"` : ""
  }>${stopy(z)}</radialGradient>`;

/* ═══════════════ Rozměry pece ═══════════════ */

interface Pec {
  cx: number;
  /** Obrazové y dna komory na ose pece */
  y0: number;
  /** Poloměr pláště a měřítko drobností (1 = pec v řezu) */
  R: number;
  m: number;
  /** Líc vyzdívky, plech, izolační deska a cihla za ní */
  ri: number;
  plech: number;
  deska: number;
  cihla: number;
  /** Výška komory, tloušťka víka a dna, stojan */
  Hc: number;
  vik: number;
  dno: number;
  stojan: number;
  /** Šamotové desky: poloměr, tloušťka, spodky pater od dna komory */
  rs: number;
  tl: number;
  patra: number[];
  /** Drážky se spirálami: výšky, rozměr drážky, poloměr spirály */
  drazky: number[];
  vyskaDrazky: number;
  hloubkaDrazky: number;
  rSpiraly: number;
  /** Průhledový otvor (v řezu vpravo, zepředu na 45°) a termočlánek (vlevo) */
  pruhled: number;
  termoclanek: number;
}

function rozmery(cx: number, y0: number, R: number): Pec {
  const m = R / 255;
  const plech = 4 * m;
  const deska = 10 * m;
  const ri = R * 0.702;
  const Hc = R * 1.725;
  const rs = ri * 0.92;
  return {
    cx,
    y0,
    R,
    m,
    ri,
    plech,
    deska,
    cihla: R - plech - deska - ri,
    Hc,
    vik: R * 0.212,
    dno: R * 0.188,
    stojan: R * 0.2,
    rs,
    tl: 10 * m,
    /* Spodní deska tak vysoko, aby její přední hrana nevisela přes řez dnem */
    patra: [rs * E + 3 * m, Hc * 0.4227, Hc * 0.75],
    drazky: [0.041, 0.1727, 0.3364, 0.5, 0.6636, 0.8273].map((t) => t * Hc),
    vyskaDrazky: 20 * m,
    hloubkaDrazky: 17 * m,
    rSpiraly: 6.4 * m,
    pruhled: Hc * 0.58,
    termoclanek: Hc * 0.745,
  };
}

/** 3D bod pece (x doprava, h nahoru ode dna komory, z k nám) v obraze */
const bod = (k: Pec, x: number, h: number, z: number): Bod => [k.cx + x, k.y0 - h + z * E];
/** Bod na válci o poloměru r v úhlu t (stupně: 0 = k nám, 90 = vpravo, 180 = vzadu) */
const naValci = (k: Pec, t: number, h: number, r = k.R): Bod => bod(k, r * Math.sin(t * RAD), h, r * Math.cos(t * RAD));
/** Bod v rovině řezu: sg = −1 levá stěna řezu (−45°), +1 pravá (+45°), rho od osy */
const vRezu = (k: Pec, sg: number, rho: number, h: number): Bod => bod(k, sg * rho * S45, h, rho * S45);

/** Kus pláště mezi úhly t0 < t1 (přední polovina) a výškami h0 < h1 */
function plast(k: Pec, t0: number, t1: number, h0: number, h1: number, r = k.R) {
  const ry = r * E;
  return (
    `M${xy(naValci(k, t0, h1, r))} A${f(r)} ${f(ry)} 0 0 0 ${xy(naValci(k, t1, h1, r))}` +
    ` L${xy(naValci(k, t1, h0, r))} A${f(r)} ${f(ry)} 0 0 1 ${xy(naValci(k, t0, h0, r))} Z`
  );
}
/** Oblouk po válci ve výšce h od úhlu t0 k t1 (t0 < t1, rozpětí do 180°) */
const oblouk = (k: Pec, t0: number, t1: number, h: number, r = k.R) =>
  `M${xy(naValci(k, t0, h, r))} A${f(r)} ${f(r * E)} 0 0 0 ${xy(naValci(k, t1, h, r))}`;

/* ═══════════════ Barvy ═══════════════ */

interface Uvnitr {
  stena: string;
  stenaOkraj: string;
  spara: string;
  drazka: string;
  dno: string;
  deska: string;
  deskaStin: string;
  hrana: string;
  hranaStin: string;
  sloupek: Trojice;
  spirala: string;
  spiralaSvetlo: string;
}

interface Barvy {
  /** Přechod přes celý plášť zleva doprava */
  ocel: Zastavka[];
  ocelHrana: string;
  ocelSvetlo: string;
  ocelDetail: string;
  /** Řez: cihla na levé (ve stínu) a pravé (na světle) stěně, spáry, drážky */
  cihlaL: string;
  cihlaP: string;
  spara: string;
  drazka: string;
  deskaL: string;
  deskaP: string;
  plechL: string;
  plechP: string;
  /** Horní plocha víka */
  vikoVrch: string;
  vikoVrchStin: string;
  vikoSpara: string;
  stojan: string;
  stojanSvetlo: string;
  /** Skříňka regulátoru: světlo, střed, stín */
  krabice: [string, string, string];
  tlacitko: string;
  kabel: string;
  stin: string;
  stinSila: number;
  in: Uvnitr;
}

/** Přežah — den, pec na papíře */
const DEN: Barvy = {
  ocel: [
    [0, "#7E868C"], [0.022, "#A9B0B5"], [0.05, "#E6EAEC"], [0.07, "#FAFCFC"], [0.092, "#D2D7DA"], [0.118, "#AEB5BA"], [0.146, "#C2C8CC"],
    [0.854, "#98A0A6"], [0.885, "#B6BDC1"], [0.915, "#D3D8DB"], [0.945, "#A2A9AE"], [0.975, "#858D93"], [1, "#6B7379"],
  ],
  ocelHrana: "#5E666C",
  ocelSvetlo: "#F2F5F6",
  ocelDetail: "#C9CFD3",
  cihlaL: "#D3BD9B",
  cihlaP: "#EEDDC1",
  spara: "#BDA27C",
  drazka: "#A88D69",
  deskaL: "#D8D3C9",
  deskaP: "#F6F3EC",
  plechL: "#9AA2A8",
  plechP: "#E0E5E8",
  vikoVrch: "#F1E9DA",
  vikoVrchStin: "#DCCFB8",
  vikoSpara: "#CDBDA2",
  stojan: "#2E2D2C",
  stojanSvetlo: "#6A6662",
  krabice: ["#E8EBED", "#CDD2D5", "#A2A9AE"],
  tlacitko: "#AEB5BA",
  kabel: "#2A2A2C",
  stin: "#2B2420",
  stinSila: 0.3,
  in: {
    stena: "#DCC7A6",
    stenaOkraj: "#BBA17B",
    spara: "#A88D69",
    drazka: "#937A59",
    dno: "#CDB692",
    deska: "#F2EADC",
    deskaStin: "#E0D2BA",
    hrana: "#DCC39D",
    hranaStin: "#B39974",
    sloupek: { svetlo: "#EEDDC0", stred: "#D8C19D", stin: "#A88E6A" },
    spirala: "#7E7873",
    spiralaSvetlo: "#D2CBC2",
  },
};

/** Ostrý výpal — noc, kolem tma, ocel chladná */
const NOC: Barvy = {
  ocel: [
    [0, "#1B1F2C"], [0.022, "#2B3142"], [0.05, "#66728E"], [0.07, "#8995B0"], [0.092, "#56617B"], [0.118, "#343B4E"], [0.146, "#3C4356"],
    [0.854, "#5E4848"], [0.882, "#3A3F50"], [0.915, "#4C5469"], [0.945, "#323849"], [0.975, "#24283A"], [1, "#191C28"],
  ],
  ocelHrana: "#101219",
  ocelSvetlo: "#8E99B2",
  ocelDetail: "#4E566A",
  cihlaL: "#5A4A42",
  cihlaP: "#76645A",
  spara: "#4A3C34",
  drazka: "#3E322C",
  deskaL: "#6A6664",
  deskaP: "#8C8884",
  plechL: "#3A4052",
  plechP: "#6E7994",
  vikoVrch: "#4C4C5A",
  vikoVrchStin: "#383846",
  vikoSpara: "#2E2E3A",
  stojan: "#13141A",
  stojanSvetlo: "#3E4250",
  krabice: ["#4C5260", "#3A3F4C", "#262A34"],
  tlacitko: "#5A6070",
  kabel: "#0E0F12",
  stin: "#05040A",
  stinSila: 0.5,
  in: {
    stena: "#A08A72",
    stenaOkraj: "#7A6856",
    spara: "#6C5A48",
    drazka: "#5C4C3E",
    dno: "#907C66",
    deska: "#D2C6B0",
    deskaStin: "#B8AA92",
    hrana: "#B09E82",
    hranaStin: "#8A7A62",
    sloupek: { svetlo: "#C9B79B", stred: "#AE9C80", stin: "#7C6C58" },
    spirala: "#6C6662",
    spiralaSvetlo: "#ABA39A",
  },
};

/** Ráno — růžovozlaté světlo zleva, stíny do fialova */
const RANO: Barvy = {
  ocel: [
    [0, "#8A8494"], [0.03, "#C8B8C0"], [0.07, "#F6E2DA"], [0.1, "#FFF1EA"], [0.14, "#E2D6D8"], [0.24, "#A8A6B3"], [0.36, "#C3C3CD"],
    [0.5, "#B2B3BE"], [0.64, "#9B9CAA"], [0.78, "#B7B7C2"], [0.86, "#CECBD4"], [0.93, "#9394A2"], [1, "#6C6D7C"],
  ],
  ocelHrana: "#5A5B68",
  ocelSvetlo: "#F7EEEB",
  ocelDetail: "#CAC6CE",
  cihlaL: "#D3BD9B",
  cihlaP: "#EBD9BE",
  spara: "#BDA27C",
  drazka: "#A88D69",
  deskaL: "#D8D3C9",
  deskaP: "#F6F3EC",
  plechL: "#9A9AA8",
  plechP: "#E2DFE4",
  vikoVrch: "#E6D9C6",
  vikoVrchStin: "#B9A898",
  vikoSpara: "#A8968A",
  stojan: "#2C2A2F",
  stojanSvetlo: "#6E6873",
  krabice: ["#ECE9EC", "#D2CFD6", "#A09DAA"],
  tlacitko: "#B4B1BB",
  kabel: "#2A282D",
  stin: "#3B2E3E",
  stinSila: 0.34,
  in: {
    stena: "#B7A38E",
    stenaOkraj: "#8E7C6E",
    spara: "#93806C",
    drazka: "#6F5F52",
    dno: "#A8937C",
    deska: "#E8E0D2",
    deskaStin: "#D2C6B4",
    hrana: "#C9B394",
    hranaStin: "#A48E72",
    sloupek: { svetlo: "#E2D2B8", stred: "#C8B496", stin: "#98846A" },
    spirala: "#6E6866",
    spiralaSvetlo: "#B9B1AC",
  },
};

/** Žár: přežah kolem 950 °C do oranžovočervena, ostrý výpal 1 280 °C do žlutobíla */
const ZAR = {
  prezah: {
    stena: "#F09A5C",
    stenaOkraj: "#C4532C",
    stenaSila: 0.66,
    jadro: "#FFC27E",
    svit: "#FF6A30",
    svitSila: 0.46,
    tonovani: "#FF9550",
    tonovaniSila: 0.3,
    horko: "#FFB878",
    horko2: "#EC6A34",
    vineta: "#D2502A",
    vinetaSila: 0.3,
    halo: "#F39A5C",
    haloSila: 0.16,
  },
  ostry: {
    stena: "#FFE29A",
    stenaOkraj: "#F59A3E",
    stenaSila: 0.84,
    jadro: "#FFFFF0",
    svit: "#FFD66A",
    svitSila: 0.62,
    tonovani: "#FFE3A2",
    tonovaniSila: 0.37,
    horko: "#FFF4C6",
    horko2: "#FFB040",
    vineta: "#FF8A2E",
    vinetaSila: 0.42,
    halo: "#FF9E3C",
    haloSila: 0.5,
  },
};
type Zar = (typeof ZAR)["prezah"];

/* ═══════════════ Spirála topného drátu ═══════════════ */

/**
 * Spirála v drážce na zadní stěně komory: smyčky (trochoida) po oblouku
 * ve výšce h, od úhlu t0 do t1. Na krajích se smyčky samy zkrátí, jak se
 * stěna stáčí od nás.
 */
function spirala(k: Pec, h: number, t0: number, t1: number): string {
  const r = k.ri;
  const krok = 8.5 * k.m;
  const a = 3.6 * k.m;
  const kb = (4 / 3) * k.rSpiraly;
  const kk = Math.PI / 3;
  const dth = krok / r;
  const th0 = t0 * RAD;
  const n = Math.floor(((t1 - t0) * RAD) / dth) * 2;
  const th = (i: number) => th0 + (i * dth) / 2;
  const T = (u: number): Bod => [Math.cos(u), -E * Math.sin(u)];
  const P = (i: number): Bod => {
    const [cx, cy] = bod(k, r * Math.sin(th(i)), h, r * Math.cos(th(i)));
    const [tx, ty] = T(th(i));
    const sg = i % 2 === 0 ? 1 : -1;
    return [cx + a * sg * tx, cy + a * sg * ty];
  };
  const V = (i: number): Bod => {
    const [tx, ty] = T(th(i));
    return [(tx * krok) / (2 * Math.PI), (ty * krok) / (2 * Math.PI)];
  };
  let d = `M${xy(P(0))}`;
  for (let i = 1; i <= n; i++) {
    const p0 = P(i - 1);
    const p1 = P(i);
    const v0 = V(i - 1);
    const v1 = V(i);
    /* Půlzávit nad drátem jde dozadu (smyčka), pod ním dopředu */
    const smer = (i - 1) % 2 === 0 ? -1 : 1;
    d += ` C${f(p0[0] + kk * v0[0])} ${f(p0[1] + kk * v0[1] + smer * kb)} ${f(p1[0] - kk * v1[0])} ${f(p1[1] - kk * v1[1] + smer * kb)} ${xy(p1)}`;
  }
  return d;
}

/* ═══════════════ Sedmisegmentový displej ═══════════════ */

const SEGMENTY: Record<string, string> = {
  "0": "abcdef", "1": "bc", "2": "abdeg", "3": "abcdg", "4": "bcfg", "5": "acdfg", "6": "acdefg", "7": "abc", "8": "abcdefg", "9": "abcdfg", C: "adef", "°": "abfg", " ": "",
};

/** Jeden segment: šestiúhelník s ostrými konci podél úsečky a→b */
function segment(a: Bod, b: Bod, t: number): string {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const L = Math.hypot(dx, dy);
  const ux = dx / L;
  const uy = dy / L;
  const nx = -uy;
  const ny = ux;
  const g = t * 0.36;
  const h = t / 2;
  const A: Bod = [a[0] + ux * g, a[1] + uy * g];
  const Bb: Bod = [b[0] - ux * g, b[1] - uy * g];
  return mnohouhelnik([
    A,
    [A[0] + (ux + nx) * h, A[1] + (uy + ny) * h],
    [Bb[0] + (-ux + nx) * h, Bb[1] + (-uy + ny) * h],
    Bb,
    [Bb[0] + (-ux - nx) * h, Bb[1] + (-uy - ny) * h],
    [A[0] + (ux - nx) * h, A[1] + (uy - ny) * h],
  ]);
}

/** Znak na displeji: rozsvícené a zhasnuté segmenty zvlášť */
function znak(z: string, x: number, y: number, w: number, h: number, t: number) {
  const S: Record<string, [Bod, Bod]> = {
    a: [[x, y], [x + w, y]],
    b: [[x + w, y], [x + w, y + h / 2]],
    c: [[x + w, y + h / 2], [x + w, y + h]],
    d: [[x, y + h], [x + w, y + h]],
    e: [[x, y + h / 2], [x, y + h]],
    f: [[x, y], [x, y + h / 2]],
    g: [[x, y + h / 2], [x + w, y + h / 2]],
  };
  const sviti = SEGMENTY[z] ?? "";
  let zap = "";
  let vyp = "";
  for (const key of "abcdefg") {
    const d = segment(S[key][0], S[key][1], t);
    if (sviti.includes(key)) zap += d;
    else vyp += d;
  }
  return { zap, vyp };
}

/* ═══════════════ Společné díly pece ═══════════════ */

/** Regulátor na boku: skříňka s displejem (zelené číslice °C), tlačítky a vypínačem */
function regulator(id: string, x: number, y: number, s: number, cislo: string, B: Barvy, noc: boolean): string {
  const w = 150 * s;
  const h = 104 * s;
  const vrch = 9 * s;
  const [sv, st, ti] = B.krabice;
  const defs: string[] = [];
  let o = "";
  defs.push(svisly(`${id}-k`, sv, st));
  defs.push(vodorovny(`${id}-kl`, x, x + w, [[0, "#FFFFFF", noc ? 0.08 : 0.32], [0.35, "#FFFFFF", 0], [0.8, ti, 0], [1, ti, noc ? 0.5 : 0.4]]));
  /* Stín na plášti a pod skříňkou */
  o += `<rect x="${f(x + 4 * s)}" y="${f(y + 6 * s)}" width="${f(w)}" height="${f(h)}" rx="${f(8 * s)}" fill="${B.stin}" opacity="${noc ? 0.45 : 0.16}"/>`;
  /* Horní plocha a čelo */
  o += `<rect x="${f(x + 4 * s)}" y="${f(y - vrch)}" width="${f(w - 8 * s)}" height="${f(vrch + 8 * s)}" rx="${f(5 * s)}" fill="${smichej(sv, "#FFFFFF", noc ? 0.08 : 0.4)}"/>`;
  o += `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(8 * s)}" fill="url(#${id}-k)"/>`;
  o += `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(8 * s)}" fill="url(#${id}-kl)"/>`;
  o += `<path d="M${f(x + 8 * s)} ${f(y + 1.2 * s)} H${f(x + w - 8 * s)}" stroke="#FFFFFF" stroke-width="${f(1.4 * s)}" opacity="${noc ? 0.18 : 0.75}" stroke-linecap="round"/>`;
  o += `<path d="M${f(x + 8 * s)} ${f(y + h - 0.8 * s)} H${f(x + w - 8 * s)}" stroke="${ti}" stroke-width="${f(1.6 * s)}" opacity="0.8" stroke-linecap="round"/>`;
  /* Displej */
  const dx = x + 12 * s;
  const dy = y + 13 * s;
  const dw = 126 * s;
  const dh = 46 * s;
  o += `<rect x="${f(dx - 1.5 * s)}" y="${f(dy - 1.5 * s)}" width="${f(dw + 3 * s)}" height="${f(dh + 3 * s)}" rx="${f(5 * s)}" fill="${ti}"/>`;
  o += `<rect x="${f(dx)}" y="${f(dy)}" width="${f(dw)}" height="${f(dh)}" rx="${f(4 * s)}" fill="#0C1712"/>`;
  defs.push(kruhovy(`${id}-d`, dx + dw * 0.5, dy + dh * 0.5, dw * 0.55, [[0, "#3CFF88", 0.22], [1, "#3CFF88", 0]], 0.45));
  o += `<rect x="${f(dx)}" y="${f(dy)}" width="${f(dw)}" height="${f(dh)}" rx="${f(4 * s)}" fill="url(#${id}-d)"/>`;
  /* Číslice zarovnané doprava, za nimi °C */
  const text = cislo.padStart(4, " ").slice(-4);
  let zap = "";
  let vyp = "";
  for (let i = 0; i < 4; i++) {
    const z = znak(text[i], dx + 9 * s + i * 22 * s, dy + 8 * s, 15 * s, 29 * s, 4.4 * s);
    zap += z.zap;
    vyp += z.vyp;
  }
  for (const [i, c] of ["°", "C"].entries()) {
    const z = znak(c, dx + 98 * s + i * 13 * s, dy + 8 * s, 8 * s, 15 * s, 2.6 * s);
    zap += z.zap;
    vyp += z.vyp;
  }
  const ox = dx + dw / 2;
  const oy = dy + dh / 2;
  o += `<g class="${id}-cisla" transform="translate(${f(ox)} ${f(oy)}) skewX(-7) translate(${f(-ox)} ${f(-oy)})">`;
  o += `<path d="${vyp}" fill="#163324"/>`;
  o += `<path d="${zap}" fill="#43FF8E" stroke="#43FF8E" stroke-width="${f(2.6 * s)}" stroke-opacity="0.22" stroke-linejoin="round"/>`;
  o += `<path d="${zap}" fill="#B8FFD2" transform="translate(0 ${f(-0.2 * s)})" opacity="0.55"/>`;
  o += `</g>`;
  /* Odlesk na skle displeje */
  o += `<path d="M${f(dx + 4 * s)} ${f(dy + 4 * s)} H${f(dx + dw * 0.55)} L${f(dx + dw * 0.42)} ${f(dy + dh * 0.42)} H${f(dx + 4 * s)} Z" fill="#FFFFFF" opacity="${noc ? 0.04 : 0.07}"/>`;
  /* Tlačítka, kontrolka, vypínač */
  const by = y + 72 * s;
  for (let i = 0; i < 3; i++) {
    const bx = x + 16 * s + i * 22 * s;
    o += `<rect x="${f(bx)}" y="${f(by)}" width="${f(15 * s)}" height="${f(11 * s)}" rx="${f(3 * s)}" fill="${ti}"/>`;
    o += `<rect x="${f(bx)}" y="${f(by - 1 * s)}" width="${f(15 * s)}" height="${f(10 * s)}" rx="${f(3 * s)}" fill="${B.tlacitko}"/>`;
    o += `<path d="M${f(bx + 3 * s)} ${f(by + 0.6 * s)} H${f(bx + 12 * s)}" stroke="#FFFFFF" stroke-width="${f(1 * s)}" opacity="${noc ? 0.2 : 0.6}" stroke-linecap="round"/>`;
  }
  o += `<circle cx="${f(x + 92 * s)}" cy="${f(by + 4.5 * s)}" r="${f(3.4 * s)}" fill="#43FF8E"/>`;
  o += `<circle cx="${f(x + 92 * s)}" cy="${f(by + 4.5 * s)}" r="${f(7 * s)}" fill="#43FF8E" opacity="0.18"/>`;
  o += `<circle cx="${f(x + 122 * s)}" cy="${f(by + 6 * s)}" r="${f(10 * s)}" fill="${ti}"/>`;
  o += `<circle cx="${f(x + 122 * s)}" cy="${f(by + 5 * s)}" r="${f(8.4 * s)}" fill="#C4432B"/>`;
  o += `<path d="M${f(x + 116.5 * s)} ${f(by + 2.6 * s)} Q${f(x + 120 * s)} ${f(by - 0.6 * s)} ${f(x + 125 * s)} ${f(by + 0.4 * s)}" stroke="#FFFFFF" stroke-width="${f(1.6 * s)}" fill="none" opacity="0.5" stroke-linecap="round"/>`;
  return `<g><defs>${defs.join("")}</defs>${o}</g>`;
}

/** Obruče na plášti: vyvýšené pásy s horní hranou na světle a stínem pod sebou */
function obruce(k: Pec, id: string, B: Barvy, useky: [number, number][]): string {
  let o = "";
  for (const hb of [k.Hc * 0.27, k.Hc * 0.7]) {
    const v = 3.6 * k.m;
    const r = k.R + 1.4 * k.m;
    for (const [t0, t1] of useky) {
      o += `<path d="${plast(k, t0, t1, hb - v, hb + v, r)}" fill="url(#${id})"/>`;
      o += `<path d="${oblouk(k, t0, t1, hb + v - 0.6 * k.m, r)}" stroke="${B.ocelSvetlo}" stroke-width="${f(1.2 * k.m)}" fill="none" opacity="0.85"/>`;
      o += `<path d="${oblouk(k, t0, t1, hb - v, r)}" stroke="${B.ocelHrana}" stroke-width="${f(1.3 * k.m)}" fill="none" opacity="0.55"/>`;
      o += `<path d="${oblouk(k, t0, t1, hb - v - 1.6 * k.m, k.R)}" stroke="${B.ocelHrana}" stroke-width="${f(2.4 * k.m)}" fill="none" opacity="0.14"/>`;
    }
  }
  return o;
}

/** Přezka na spoji víka a těla: plech, páka a hák (u otevřeného víka páka visí) */
function prezka(k: Pec, B: Barvy, t: number, otevrena: boolean): string {
  const m = k.m;
  const [x, y] = naValci(k, t, k.Hc, k.R + 1.5 * m);
  const zuz = 0.55 + 0.45 * Math.cos(t * RAD);
  const w = 12 * m * zuz;
  let o = "";
  o += `<rect x="${f(x - w / 2 + 1.2 * m)}" y="${f(y + 4 * m)}" width="${f(w)}" height="${f(24 * m)}" rx="${f(2.4 * m)}" fill="${B.ocelHrana}" opacity="0.35"/>`;
  o += `<rect x="${f(x - w / 2)}" y="${f(y + 3 * m)}" width="${f(w)}" height="${f(23 * m)}" rx="${f(2.4 * m)}" fill="${B.ocelDetail}"/>`;
  o += `<path d="M${f(x - w / 2 + 1.2 * m)} ${f(y + 5 * m)} V${f(y + 24 * m)}" stroke="${B.ocelSvetlo}" stroke-width="${f(1.1 * m)}" opacity="0.8" stroke-linecap="round"/>`;
  if (otevrena) {
    /* Páka spadlá dolů, třmen visí */
    o += `<path d="M${f(x)} ${f(y + 22 * m)} L${f(x + 2 * m)} ${f(y + 38 * m)}" stroke="${B.ocelHrana}" stroke-width="${f(4.6 * m * zuz + 1)}" stroke-linecap="round"/>`;
    o += `<path d="M${f(x - 3 * m * zuz)} ${f(y + 24 * m)} Q${f(x)} ${f(y + 44 * m)} ${f(x + 3 * m * zuz)} ${f(y + 24 * m)}" stroke="${B.ocelDetail}" stroke-width="${f(1.4 * m)}" fill="none"/>`;
  } else {
    o += `<path d="M${f(x)} ${f(y + 22 * m)} L${f(x)} ${f(y + 8 * m)}" stroke="${B.ocelHrana}" stroke-width="${f(4.6 * m * zuz + 1)}" stroke-linecap="round"/>`;
    o += `<path d="M${f(x - 3 * m * zuz)} ${f(y + 9 * m)} L${f(x - 3 * m * zuz)} ${f(y - 10 * m)} H${f(x + 3 * m * zuz)} L${f(x + 3 * m * zuz)} ${f(y + 9 * m)}" stroke="${B.ocelDetail}" stroke-width="${f(1.4 * m)}" fill="none"/>`;
    o += `<rect x="${f(x - (w / 2) * 0.8)}" y="${f(y - 14 * m)}" width="${f(w * 0.8)}" height="${f(7 * m)}" rx="${f(1.6 * m)}" fill="${B.ocelDetail}"/>`;
  }
  return o;
}

/** Svorkovnice dole na boku, kam vede kabel od regulátoru */
function svorkovnice(k: Pec, B: Barvy): { svg: string; vstup: Bod } {
  const m = k.m;
  const [x, y] = naValci(k, 76, k.Hc * 0.11, k.R + 2 * m);
  const w = 20 * m;
  const h = 32 * m;
  let o = "";
  o += `<rect x="${f(x - w / 2 + 2 * m)}" y="${f(y - h / 2 + 3 * m)}" width="${f(w)}" height="${f(h)}" rx="${f(3 * m)}" fill="${B.ocelHrana}" opacity="0.3"/>`;
  o += `<rect x="${f(x - w / 2)}" y="${f(y - h / 2)}" width="${f(w)}" height="${f(h)}" rx="${f(3 * m)}" fill="${B.ocelDetail}"/>`;
  o += `<path d="M${f(x - w / 2 + 2 * m)} ${f(y - h / 2 + 3 * m)} V${f(y + h / 2 - 3 * m)}" stroke="${B.ocelSvetlo}" stroke-width="${f(1.2 * m)}" opacity="0.8" stroke-linecap="round"/>`;
  o += `<rect x="${f(x - 4.5 * m)}" y="${f(y + h / 2 - 1 * m)}" width="${f(9 * m)}" height="${f(7 * m)}" rx="${f(1.5 * m)}" fill="${B.kabel}"/>`;
  return { svg: o, vstup: [x, y + h / 2 + 6 * m] };
}

/** Stojan: černý rám pod pecí a nohy v předních rozích */
function stojan(k: Pec, B: Barvy): string {
  const m = k.m;
  const h0 = -k.dno;
  const h1 = -k.dno - 9 * m;
  const hz = -k.dno - k.stojan;
  const r = k.R * 0.95;
  let o = `<path d="${plast(k, -90, 90, h1, h0, r)}" fill="${B.stojan}"/>`;
  o += `<path d="${oblouk(k, -90, 90, h1 + 1.2 * m, r)}" stroke="${B.stojanSvetlo}" stroke-width="${f(1.4 * m)}" fill="none" opacity="0.55"/>`;
  for (const t of [-45, 45]) {
    const [x, yA] = naValci(k, t, h1, k.R * 0.86);
    const yB = naValci(k, t, hz, k.R * 0.86)[1];
    o += `<rect x="${f(x - 6 * m)}" y="${f(yA - 2)}" width="${f(12 * m)}" height="${f(yB - yA + 2)}" fill="${B.stojan}"/>`;
    o += `<rect x="${f(x - 6 * m)}" y="${f(yA)}" width="${f(3 * m)}" height="${f(yB - yA - 4 * m)}" fill="${B.stojanSvetlo}" opacity="0.7"/>`;
    o += `<rect x="${f(x - 10 * m)}" y="${f(yB - 4 * m)}" width="${f(20 * m)}" height="${f(5.5 * m)}" rx="${f(2 * m)}" fill="${B.stojan}"/>`;
  }
  return o;
}

/** Zátka průhledového otvoru zvenku (na plášti v úhlu 45°) */
function zatka(k: Pec, x: number, y: number, sm: number): string {
  const m = k.m;
  let o = "";
  o += `<rect x="${f(sm > 0 ? x - 1 : x - 9 * m)}" y="${f(y - 5 * m)}" width="${f(10 * m)}" height="${f(10 * m)}" rx="${f(2 * m)}" fill="#CDBB9E"/>`;
  o += `<ellipse cx="${f(x + sm * 10 * m)}" cy="${f(y + 1.5 * m)}" rx="${f(6 * m)}" ry="${f(10.5 * m)}" fill="#B9A688"/>`;
  o += `<ellipse cx="${f(x + sm * 9 * m)}" cy="${f(y)}" rx="${f(5.6 * m)}" ry="${f(10 * m)}" fill="#EDE2CE"/>`;
  o += `<ellipse cx="${f(x + sm * 8 * m)}" cy="${f(y - 3 * m)}" rx="${f(2 * m)}" ry="${f(4.2 * m)}" fill="#FFFFFF" opacity="0.55"/>`;
  return o;
}

/** Hlavice termočlánku zvenku; kabel od ní vede po plášti za pec k regulátoru */
function hlavice(k: Pec, x: number, y: number, B: Barvy): string {
  const m = k.m;
  const [ex, ey] = naValci(k, -88, k.termoclanek - 34 * m);
  let o = "";
  o += `<path d="M${f(x - 6 * m)} ${f(y + 8 * m)} C${f(x - 8 * m)} ${f(y + 26 * m)} ${f(ex + 18 * m)} ${f(ey - 4 * m)} ${f(ex + 1.5 * m)} ${f(ey)}" stroke="${B.kabel}" stroke-width="${f(2.6 * m)}" fill="none" stroke-linecap="round"/>`;
  o += `<rect x="${f(x - 13 * m)}" y="${f(y - 8 * m)}" width="${f(15 * m)}" height="${f(16 * m)}" rx="${f(2.5 * m)}" fill="#3E3E44"/>`;
  o += `<rect x="${f(x - 13 * m)}" y="${f(y - 8 * m)}" width="${f(15 * m)}" height="${f(4 * m)}" rx="${f(2 * m)}" fill="#66666E"/>`;
  return o;
}

/** Kabel: tmavá šňůra s jemným leskem */
const kabel = (d: string, B: Barvy, m: number, noc = false) =>
  `<path d="${d}" stroke="${B.kabel}" stroke-width="${f(4.6 * m)}" fill="none" stroke-linecap="round"/>` +
  `<path d="${d}" stroke="#FFFFFF" stroke-width="${f(1.1 * m)}" fill="none" stroke-linecap="round" opacity="${noc ? 0.1 : 0.22}" transform="translate(${f(-0.8 * m)} ${f(-1 * m)})"/>`;

/* ═══════════════ Kusy v peci ═══════════════ */

/** Obrazové y paty kusu, který stojí na ploše ve výšce h, hloubce z */
function pataNa(k: Pec, tvar: Tvar, stav: Stav, vyska: number, h: number, z: number) {
  const H = vyska * SMRST[stav];
  return k.y0 - h + z * E + OBRYSY[tvar](0) * H * E;
}

/** Ořez „nad předním okrajem“ kusu: co je v něm, zakryje jeho přední stěna */
const nadOkrajem = (x: number, g: { rx: number; ry: number; yTop: number }) =>
  `M${f(x - g.rx)} ${f(g.yTop)} V${f(g.yTop - 400)} H${f(x + g.rx)} V${f(g.yTop)} A${f(g.rx)} ${f(g.ry)} 0 0 1 ${f(x - g.rx)} ${f(g.yTop)} Z`;

/** Hrnek dnem vzhůru — v přežahu stojí okrajem na okraji jiného */
function obraceny(o: { id: string; tvar: Tvar; stav: Stav; x: number; y: number; vyska: number; zrcadlo?: boolean }): string {
  const r = OBRYSY[o.tvar];
  const H = o.vyska * SMRST[o.stav];
  const t = o.stav === "prezah" ? HLINA.prezah : HLINA.suchy;
  const { x, y, id } = o;
  const N = 16;
  const yAt = (tt: number) => y - (1 - tt) * H;
  const levy: Bod[] = [];
  const pravy: Bod[] = [];
  for (let i = 0; i < N; i++) {
    const tt = 1 - i / (N - 1);
    levy.push([x - r(tt) * H, yAt(tt)]);
    pravy.push([x + r(tt) * H, yAt(tt)]);
  }
  const rOk = r(1) * H;
  const rDno = r(0) * H;
  const obrys =
    `M${xy(levy[0])} A${f(rOk)} ${f(rOk * E)} 0 0 0 ${xy(pravy[0])}${hladce(pravy)}` +
    ` A${f(rDno)} ${f(rDno * E)} 0 0 0 ${xy(levy[N - 1])}${hladce([...levy].reverse())} Z`;
  const defs = [valcovy(`${id}-t`, t, 0.34), `<clipPath id="${id}-c"><path d="${obrys}"/></clipPath>`];
  let s = "";
  if (o.tvar === "hrnek") {
    /* Ucho jako u nádoby, jen převrácené */
    const sm = o.zrcadlo ? -1 : 1;
    const [x1, y1] = [x + sm * (r(0.8) * H - 2), yAt(0.8)];
    const [x0, y0] = [x + sm * (r(0.26) * H - 2), yAt(0.26)];
    const d = 0.34 * H;
    const c = `M${f(x1)} ${f(y1)} C${f(x1 + sm * d * 1.05)} ${f(y1 + d * 0.18)} ${f(x0 + sm * d)} ${f(y0 - d * 0.06)} ${f(x0)} ${f(y0)}`;
    const tl = Math.max(2.4, H * 0.082);
    s += `<path d="${c}" stroke="${t.stin}" stroke-width="${f(tl + 1.6)}" fill="none" stroke-linecap="round"/>`;
    s += `<path d="${c}" stroke="${t.stred}" stroke-width="${f(tl)}" fill="none" stroke-linecap="round"/>`;
    s += `<path d="${c}" stroke="${t.svetlo}" stroke-width="${f(tl * 0.32)}" fill="none" stroke-linecap="round" opacity="0.45" transform="translate(${f(-tl * 0.18 * sm)} ${f(-tl * 0.2)})"/>`;
  }
  s += `<path d="${obrys}" fill="url(#${id}-t)"/>`;
  /* Rýhy po prstech, tma u spoje s dolním hrnkem */
  let vnitrni = "";
  for (let i = 1; i <= 6; i++) {
    const tt = 0.16 + i * 0.12;
    const ri = r(tt) * H;
    const yy = yAt(tt);
    vnitrni += `<path d="M${f(x - ri)} ${f(yy)} Q${f(x)} ${f(yy + ri * E * 1.85)} ${f(x + ri)} ${f(yy)}" stroke="${t.stin}" stroke-width="${f(Math.max(0.8, H * 0.009))}" fill="none" opacity="0.09"/>`;
  }
  vnitrni += `<path d="M${f(x - rOk)} ${f(y)} A${f(rOk)} ${f(rOk * E)} 0 0 0 ${f(x + rOk)} ${f(y)}" stroke="#1E140E" stroke-width="${f(H * 0.08)}" fill="none" opacity="0.14"/>`;
  s += `<g clip-path="url(#${id}-c)">${vnitrni}</g>`;
  /* Dno nahoře: plná placka s obrobeným prstencem, žádný otvor */
  const yD = y - H;
  s += `<ellipse cx="${f(x)}" cy="${f(yD)}" rx="${f(rDno)}" ry="${f(rDno * E)}" fill="${smichej(t.svetlo, "#FFFFFF", 0.3)}"/>`;
  s += `<ellipse cx="${f(x + rDno * 0.06)}" cy="${f(yD + rDno * E * 0.1)}" rx="${f(rDno * 0.74)}" ry="${f(rDno * 0.74 * E)}" fill="${t.svetlo}"/>`;
  s += `<path d="M${f(x - rDno * 0.74)} ${f(yD + rDno * E * 0.1)} A${f(rDno * 0.74)} ${f(rDno * 0.74 * E)} 0 0 1 ${f(x + rDno * 0.74)} ${f(yD + rDno * E * 0.1)}" stroke="${t.stin}" stroke-width="0.9" fill="none" opacity="0.28"/>`;
  s += `<path d="M${f(x - rDno * 0.9)} ${f(yD + 0.4)} A${f(rDno)} ${f(rDno * E)} 0 0 0 ${f(x + rDno * 0.4)} ${f(yD + rDno * E * 0.9)}" stroke="#FFFFFF" stroke-width="1" fill="none" opacity="0.5"/>`;
  return `<g><defs>${defs.join("")}</defs>${s}</g>`;
}

/** Misky jedna v druhé — vnitřní jsou vidět jen nad předním okrajem té pod nimi */
function miskyVSobe(id: string, stav: Stav, x: number, y: number, vysky: number[], glazura?: string): string {
  let s = "";
  let defs = "";
  let pred: ReturnType<typeof geometrie> | null = null;
  let yP = y;
  for (let j = 0; j < vysky.length; j++) {
    const H = vysky[j] * SMRST[stav];
    if (pred) {
      const Hp = vysky[j - 1] * SMRST[stav];
      yP = pred.zaklad - 0.26 * Hp + OBRYSY.miska(0) * H * E;
      defs += `<clipPath id="${id}-o${j}"><path d="${nadOkrajem(x, pred)}"/></clipPath>`;
      s += `<g clip-path="url(#${id}-o${j})">${nadoba({ id: `${id}-${j}`, tvar: "miska", stav, glazura, x, y: yP, vyska: vysky[j], stin: false })}</g>`;
    } else {
      s += nadoba({ id: `${id}-${j}`, tvar: "miska", stav, glazura, x, y: yP, vyska: vysky[j] });
    }
    pred = geometrie("miska", x, yP, H);
  }
  return `<g><defs>${defs}</defs>${s}</g>`;
}

/** Hrnek na hrnku, okrajem na okraj */
function hrnkyNaSobe(id: string, stav: Stav, x: number, y: number, vyska: number): string {
  const g = geometrie("hrnek", x, y, vyska * SMRST[stav]);
  return nadoba({ id: `${id}-a`, tvar: "hrnek", stav, x, y, vyska }) + obraceny({ id: `${id}-b`, tvar: "hrnek", stav, x, y: g.yTop, vyska, zrcadlo: true });
}

/** Malý kus uvnitř velké misky */
function vMisce(id: string, stav: Stav, x: number, y: number, vyskaMisky: number, tvar: Tvar, vyska: number): string {
  const Hm = vyskaMisky * SMRST[stav];
  const g = geometrie("miska", x, y, Hm);
  const yP = g.zaklad - 0.1 * Hm + OBRYSY[tvar](0) * vyska * SMRST[stav] * E;
  return (
    nadoba({ id: `${id}-a`, tvar: "miska", stav, x, y, vyska: vyskaMisky }) +
    `<g><defs><clipPath id="${id}-o"><path d="${nadOkrajem(x, g)}"/></clipPath></defs><g clip-path="url(#${id}-o)">${nadoba({ id: `${id}-b`, tvar, stav, x: x + 2, y: yP, vyska, stin: false })}</g></g>`
  );
}

/* ═══════════════ Žároměrky ═══════════════ */

interface Kuzely {
  id: string;
  /** Střed spodku podložky */
  x: number;
  y: number;
  /** Měřítko (1 = samostatná kresba 300 × 220) */
  s: number;
  ohnuti: number;
  /** Jak moc shora se díváme */
  e: number;
}

/**
 * Tři žároměrky zapíchnuté šikmo v hliněné podložce. Řada jde šikmo do
 * hloubky: levá (nejměkčí, vodicí) vpředu, prostřední (cílová) uprostřed,
 * pravá (hlídací) vzadu — ohnuté kužely se tak nepřekrývají se sousedy.
 */
function kuzely(o: Kuzely): string {
  const { id, x, y, s, e } = o;
  const ohn = omez(o.ohnuti);
  const defs: string[] = [];
  const out: string[] = [];
  const L = 252 * s;
  const Hp = 26 * s;
  const D = 66 * s;
  const sklon = -0.2 * e;
  const T = (u: number, v: number): Bod => [x + u, y + v + u * sklon];
  const horni = -Hp - D * e;

  /* Stín a podložka: placka hlíny, oblá na koncích */
  defs.push(`<radialGradient id="${id}-s"><stop offset="0" stop-color="#1E140E" stop-opacity="0.42"/><stop offset="0.6" stop-color="#1E140E" stop-opacity="0.18"/><stop offset="1" stop-color="#1E140E" stop-opacity="0"/></radialGradient>`);
  out.push(`<ellipse cx="${f(x + 10 * s)}" cy="${f(y + 1 * s)}" rx="${f(L / 2 + 22 * s)}" ry="${f(12 * s)}" fill="url(#${id}-s)"/>`);
  const silueta: Bod[] = [
    T(-L / 2 + 16 * s, 0), T(-L / 4, 1.8 * s), T(0, 2.3 * s), T(L / 4, 1.8 * s), T(L / 2 - 16 * s, 0),
    T(L / 2 + 1 * s, -Hp * 0.5), T(L / 2 - 10 * s, horni + 4 * s), T(L / 4, horni - 1 * s), T(0, horni - 2 * s), T(-L / 4, horni - 1 * s),
    T(-L / 2 + 10 * s, horni + 4 * s), T(-L / 2 - 1 * s, -Hp * 0.5),
  ];
  defs.push(`<linearGradient id="${id}-p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F4D2A2"/><stop offset="0.5" stop-color="#DDA572"/><stop offset="1" stop-color="#A4683F"/></linearGradient>`);
  defs.push(`<linearGradient id="${id}-pl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFF0D6" stop-opacity="0.45"/><stop offset="0.4" stop-color="#FFF0D6" stop-opacity="0"/><stop offset="0.85" stop-color="#6E3A20" stop-opacity="0"/><stop offset="1" stop-color="#6E3A20" stop-opacity="0.3"/></linearGradient>`);
  const pad = uzavrena(silueta);
  out.push(`<path d="${pad}" fill="url(#${id}-p)"/>`);
  out.push(`<path d="${pad}" fill="url(#${id}-pl)"/>`);
  /* Ramínko podložky — přední horní hrana na světle */
  out.push(`<path d="${hladka([T(-L / 2 + 8 * s, -Hp * 0.84), T(-L / 4, -Hp * 1.02), T(0, -Hp * 1.05), T(L / 4, -Hp * 1.02), T(L / 2 - 8 * s, -Hp * 0.84)])}" stroke="#FFE7C2" stroke-width="${f(2.4 * s)}" fill="none" stroke-linecap="round" opacity="0.7"/>`);
  /* Otisky prstů v hlíně — dva mělké důlky */
  out.push(`<ellipse cx="${f(T(-L * 0.17, -Hp * 0.45)[0])}" cy="${f(T(-L * 0.17, -Hp * 0.45)[1])}" rx="${f(9 * s)}" ry="${f(5 * s)}" fill="#8A5634" opacity="0.18"/>`);
  out.push(`<ellipse cx="${f(T(L * 0.2, -Hp * 0.4)[0])}" cy="${f(T(L * 0.2, -Hp * 0.4)[1])}" rx="${f(8 * s)}" ry="${f(4.4 * s)}" fill="#8A5634" opacity="0.15"/>`);

  /* Kužely: zpředu dozadu se kreslí od pravého (vzadu) k levému (vpředu) */
  const Lc = 106 * s;
  const w0 = 22 * s;
  const lean = 8 * RAD;
  const vPovrch = -Hp - D * e * 0.5;
  const pozice = [-0.34 * L, 0, 0.34 * L];
  const hw = (t: number) => (w0 / 2) * Math.pow(1 - t, 0.92) + 1.3 * s;
  const osa = (Theta: number, stred: number, sirka: number, zaklad: Bod, podlaha: (px: number) => number) => {
    const n = 36;
    const w = (t: number) => Math.exp(-(((t - stred) / sirka) ** 2));
    let sum = 0;
    for (let i = 0; i < n; i++) sum += w((i + 0.5) / n) / n;
    let phi = lean;
    let [px, py] = zaklad;
    const body: { b: Bod; phi: number }[] = [{ b: [px, py], phi }];
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      phi += (Theta * w(t)) / sum / n;
      px += (Math.sin(phi) * Lc) / n;
      py -= (Math.cos(phi) * Lc) / n;
      /* Složený kužel si lehne na podložku (pata zůstává zapíchnutá v hlíně) */
      const strop = t > 0.22 ? podlaha(px) - hw((i + 1) / n) * 0.8 : Infinity;
      body.push({ b: [px, Math.min(py, strop)], phi });
    }
    return body;
  };
  const kresliKuzel = (j: number, Theta: number, stred: number, sirka: number) => {
    const [bx, by] = T(pozice[j], vPovrch);
    const zaklad: Bod = [bx, by + 9 * s];
    const podlaha = (px: number) => T(px - x, vPovrch)[1];
    const body = osa(Theta, stred, sirka, zaklad, podlaha);
    const n = body.length - 1;
    const okraj = (sg: number, kk: number) =>
      body.map(({ b, phi }, i) => {
        const h = hw(i / n) * kk;
        return [b[0] - sg * Math.cos(phi) * h, b[1] - sg * Math.sin(phi) * h] as Bod;
      });
    const levy = okraj(1, 1);
    const pravy = okraj(-1, 1);
    const hreben = okraj(1, 0.12);
    const k = `${id}-k${j}`;
    /* Kužel vylézá z díry v límci: pod předním obloukem díry ho schová hlína */
    const rC = w0 * 0.84;
    const ryC = rC * e * 1.25;
    const rH = w0 * 0.54;
    const ryH = rH * e * 1.25;
    defs.push(
      `<clipPath id="${k}"><path d="M${f(x - L)} ${f(by - 400 * s)} H${f(x + L)} V${f(by)} H${f(bx + rH)} A${f(rH)} ${f(ryH)} 0 0 1 ${f(bx - rH)} ${f(by)} H${f(x - L)} Z"/></clipPath>`,
    );
    let g = "";
    /* Límec hlíny kolem paty a díra v něm */
    g += `<ellipse cx="${f(bx + 0.6 * s)}" cy="${f(by + 0.4 * s)}" rx="${f(rC)}" ry="${f(ryC)}" fill="#E7B884"/>`;
    g += `<path d="M${f(bx - rC)} ${f(by + 0.4 * s)} A${f(rC)} ${f(ryC)} 0 0 1 ${f(bx + rC)} ${f(by + 0.4 * s)}" stroke="#FFE6C0" stroke-width="${f(1.4 * s)}" fill="none" opacity="0.7"/>`;
    g += `<ellipse cx="${f(bx)}" cy="${f(by)}" rx="${f(rH)}" ry="${f(ryH)}" fill="#8C5434" opacity="0.6"/>`;
    const lic = `${hladka(levy)} L${xy(hreben[n])}${hladce([...hreben].reverse())} Z`;
    const bok = `${hladka(hreben)} L${xy(pravy[n])}${hladce([...pravy].reverse())} Z`;
    let kz = "";
    kz += `<path d="${bok}" fill="url(#${id}-b)"/>`;
    kz += `<path d="${lic}" fill="url(#${id}-l)"/>`;
    kz += `<path d="${hladka(hreben.slice(3, n - 2))}" stroke="#FFF7E6" stroke-width="${f(0.9 * s)}" fill="none" opacity="0.6" stroke-linecap="round"/>`;
    if (Theta > 0.2) {
      /* Kde se kužel ohnul, roztavil se do skla a leskne se */
      const a0 = Math.floor(n * Math.max(0.12, stred - sirka * 1.3));
      const a1 = Math.ceil(n * Math.min(0.97, stred + sirka * 1.9));
      const lesk = okraj(1, 0.62).slice(a0, a1);
      kz += `<path d="${hladka(lesk)}" stroke="#FFFCEE" stroke-width="${f(1.3 * s)}" fill="none" stroke-linecap="round" opacity="${o3(0.25 + 0.5 * Math.min(1, Theta / Math.PI))}"/>`;
      kz += `<circle cx="${f(body[n].b[0])}" cy="${f(body[n].b[1])}" r="${f(1.9 * s)}" fill="#F6C892" opacity="${o3(Math.min(1, Theta / Math.PI) * 0.9)}"/>`;
    }
    g += `<g clip-path="url(#${k})">${kz}</g>`;
    /* Přední okraj díry, kde kužel mizí v hlíně, a světlá hrana límce */
    g += `<path d="M${f(bx - rH)} ${f(by)} A${f(rH)} ${f(ryH)} 0 0 0 ${f(bx + rH)} ${f(by)}" stroke="#7A4628" stroke-width="${f(1.2 * s)}" fill="none" opacity="0.45"/>`;
    g += `<path d="M${f(bx - rC * 0.92)} ${f(by + ryC * 0.5)} A${f(rC)} ${f(ryC)} 0 0 0 ${f(bx + rC * 0.92)} ${f(by + ryC * 0.5)}" stroke="#F8DCB4" stroke-width="${f(1.5 * s)}" fill="none" stroke-linecap="round" opacity="0.8"/>`;
    return g;
  };
  defs.push(`<linearGradient id="${id}-l" x1="0" y1="1" x2="0.3" y2="0"><stop offset="0" stop-color="#F1C38E"/><stop offset="0.55" stop-color="#FCE2B8"/><stop offset="1" stop-color="#FFF1D8"/></linearGradient>`);
  defs.push(`<linearGradient id="${id}-b" x1="0" y1="1" x2="0.3" y2="0"><stop offset="0" stop-color="#B9774A"/><stop offset="0.6" stop-color="#D99C68"/><stop offset="1" stop-color="#EAB886"/></linearGradient>`);

  /* Cílový kužel: najdi ohyb, při kterém se špička dotkne podložky */
  const spicka = (Theta: number) => {
    const [bx, by] = T(pozice[1], vPovrch);
    const b = osa(Theta, 0.5, 0.2, [bx, by + 9 * s], () => 1e9);
    return b[b.length - 1].b[1] - by;
  };
  let lo = 0;
  let hi = Math.PI;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (spicka(mid) < -1.6 * s) lo = mid;
    else hi = mid;
  }
  const dotyk = lo;
  const thL = 178 * RAD * plynule(0.08, 0.92, ohn);
  const stredL = mix(0.45, 0.3, plynule(0.5, 1, ohn));
  const thM = dotyk * plynule(0.45, 1, ohn);
  out.push(kresliKuzel(2, 0, 0.5, 0.2));
  out.push(kresliKuzel(1, thM, 0.5, 0.2));
  out.push(kresliKuzel(0, thL, stredL, 0.2));
  return `<g><defs>${defs.join("")}</defs>${out.join("")}</g>`;
}

/**
 * Žároměrky: tři štíhlé trojboké kužely zapíchnuté šikmo v hliněné podložce.
 * `ohnuti` 0 = všechny rovné, 0.5 = levá (nejměkčí) se ohýbá, 1 = levá úplně
 * složená, prostřední ohnutá špičkou k podložce (dopáleno), pravá (hlídací)
 * rovná. Průhledné pozadí, teplá záře ve vrstvě `${p}-zar`.
 */
export function zaromerky(ohnuti: number, p = "dpe"): string {
  const id = `${p}-zm`;
  const zare =
    `<radialGradient id="${id}-z" cx="0.5" cy="0.55" r="0.5"><stop offset="0" stop-color="#FFA040" stop-opacity="0.46"/><stop offset="0.5" stop-color="#FF8A30" stop-opacity="0.18"/><stop offset="1" stop-color="#FF8A30" stop-opacity="0"/></radialGradient>`;
  return (
    `<svg viewBox="0 0 300 220" aria-hidden="true"><defs>${zare}</defs>` +
    `<g class="${p}-zar"><ellipse cx="150" cy="126" rx="150" ry="104" fill="url(#${id}-z)"/></g>` +
    kuzely({ id, x: 150, y: 196, s: 1, ohnuti, e: 0.3 }) +
    `</svg>`
  );
}

/* ═══════════════ Pec v řezu ═══════════════ */

const PEC_REZ = rozmery(300, 594, 255);

/** Místo pro Šamotku: vpředu na spodní desce, kde nic nestojí */
export const MISTA_PEC = {
  samotka: {
    x: Math.round(PEC_REZ.cx - 6),
    y: Math.round(PEC_REZ.y0 - (PEC_REZ.patra[0] + PEC_REZ.tl) + 128 * E),
    w: 112,
  },
};

/** Kus nebo sloupek na jedné úrovni, seřadí se odzadu dopředu */
interface Polozka {
  z: number;
  svg: string;
}

/**
 * Pec v řezu, viewBox 800 × 760. `prezah`: suché kusy naskládané v sobě,
 * spirály žhnou oranžovočerveně, regulátor ukazuje 950. `ostry`: glazované
 * kusy od sebe, žár do žlutobíla, u průhledového otvoru žároměrky,
 * regulátor 1280 — kolem tmavá noc.
 */
export function pecRez(rezim: "prezah" | "ostry", p = "dpe"): string {
  const noc = rezim === "ostry";
  const B = noc ? NOC : DEN;
  const U = B.in;
  const Z: Zar = ZAR[rezim];
  const k = PEC_REZ;
  const { cx, R, ri, Hc, m } = k;
  const hV = Hc + k.vik;
  const defs: string[] = [];
  const s: string[] = [];

  /* ——— Záře kolem pece a odlesk žáru na podlaze ——— */
  const [hx, hy] = bod(k, 0, Hc * 0.48, ri * 0.5);
  defs.push(kruhovy(`${p}-ha`, hx, hy, 440, [[0, Z.halo, Z.haloSila], [0.5, Z.halo, Z.haloSila * 0.42], [1, Z.halo, 0]], 1.05));
  let zare = `<ellipse cx="${f(hx)}" cy="${f(hy)}" rx="440" ry="${f(440 * 1.05)}" fill="url(#${p}-ha)"/>`;
  const yZem = k.y0 + k.dno + k.stojan;
  if (noc) {
    defs.push(kruhovy(`${p}-hz`, cx, yZem + 26, 280, [[0, Z.horko2, 0.34], [0.5, Z.horko2, 0.12], [1, Z.horko2, 0]], 0.22));
    zare += `<ellipse cx="${f(cx)}" cy="${f(yZem + 26)}" rx="280" ry="${f(280 * 0.22)}" fill="url(#${p}-hz)"/>`;
  }
  s.push(`<g class="${p}-zar">${zare}</g>`);

  /* ——— Stín na podlaze a šero pod pecí ——— */
  defs.push(mekkyStin(`${p}-sz`, B.stin, B.stinSila));
  s.push(`<ellipse cx="${f(cx + 40 * m)}" cy="${f(yZem + 2)}" rx="${f(R * 1.3)}" ry="${f(R * 1.3 * E)}" fill="url(#${p}-sz)"/>`);
  defs.push(kruhovy(`${p}-tp`, cx + 10 * m, yZem, R * 0.9, [[0, B.stin, noc ? 0.62 : 0.36], [0.65, B.stin, noc ? 0.36 : 0.16], [1, B.stin, 0]], E));
  s.push(`<ellipse cx="${f(cx + 10 * m)}" cy="${f(yZem)}" rx="${f(R * 0.9)}" ry="${f(R * 0.9 * E)}" fill="url(#${p}-tp)"/>`);
  s.push(stojan(k, B));

  /* ——— Vnitřek komory, vidět jen štěrbinou mezi stěnami řezu ——— */
  const sterbina = mnohouhelnik([vRezu(k, -1, ri, Hc), bod(k, 0, Hc, 0), vRezu(k, 1, ri, Hc), vRezu(k, 1, ri, 0), bod(k, 0, 0, 0), vRezu(k, -1, ri, 0)]);
  defs.push(`<clipPath id="${p}-in"><path d="${sterbina}"/></clipPath>`);
  const xL = cx - ri * S45 - 2;
  const xP = cx + ri * S45 + 2;
  const yH = k.y0 - Hc - ri * E - 6;
  const yD = k.y0 + ri * S45 * E + 4;
  const ramec = `x="${f(xL)}" y="${f(yH)}" width="${f(xP - xL)}" height="${f(yD - yH)}"`;
  let vn = "";
  defs.push(vodorovny(`${p}-zd`, xL, xP, [[0, U.stenaOkraj], [0.5, U.stena], [1, smichej(U.stenaOkraj, "#2B2420", 0.08)]]));
  vn += `<rect ${ramec} fill="url(#${p}-zd)"/>`;

  /* Zadní stěna: řady cihel, v každé drážka se spirálou */
  const t0 = 126;
  const t1 = 234;
  const vrsta = 36 * m;
  let spary = "";
  let svisle = "";
  k.drazky.forEach((hg, i) => {
    spary += oblouk(k, t0, t1, hg - vrsta, ri);
    for (let j = -3; j <= 3; j++) {
      const t = 180 + (j + (i % 2) * 0.5) * 22;
      if (Math.abs(t - 180) > 52) continue;
      svisle += `M${xy(naValci(k, t, hg - vrsta + 2 * m, ri))} L${xy(naValci(k, t, hg - 12 * m, ri))}`;
      svisle += `M${xy(naValci(k, t, hg + 12 * m, ri))} L${xy(naValci(k, t, hg + vrsta - 2 * m, ri))}`;
    }
  });
  spary += oblouk(k, t0, t1, k.drazky[k.drazky.length - 1] + vrsta, ri);
  vn += `<path d="${spary}" stroke="${U.spara}" stroke-width="${f(1.1 * m)}" fill="none" opacity="0.5"/>`;
  vn += `<path d="${svisle}" stroke="${U.spara}" stroke-width="${f(1 * m)}" fill="none" opacity="0.38"/>`;
  let drazky = "";
  let studene = "";
  let zhave = "";
  /* Drážky, které na zadní stěně úplně zakryje deska, se nekreslí (v řezu jsou všechny) */
  const zakryta = (hg: number) =>
    k.patra.some((hb) => {
      const y = k.y0 - hg - ri * E;
      return y > k.y0 - hb - k.tl - k.rs * E + 12 * m && y < k.y0 - hb + k.rs * E - 12 * m;
    });
  k.drazky.forEach((hg, i) => {
    if (zakryta(hg)) return;
    const sid = `${p}-sp${i}`;
    defs.push(`<path id="${sid}" d="${spirala(k, hg, 131, 229)}"/>`);
    drazky += `<path d="${oblouk(k, t0, t1, hg, ri)}" stroke="${U.drazka}" stroke-width="${f(k.vyskaDrazky)}" fill="none" opacity="0.5"/>`;
    drazky += `<path d="${oblouk(k, t0, t1, hg + 7.5 * m, ri)}" stroke="#2B1A10" stroke-width="${f(3.4 * m)}" fill="none" opacity="0.2"/>`;
    drazky += `<path d="${oblouk(k, t0, t1, hg - 10.5 * m, ri)}" stroke="#FFFFFF" stroke-width="${f(1.3 * m)}" fill="none" opacity="0.22"/>`;
    studene += `<use href="#${sid}" stroke="${U.spirala}" stroke-width="${f(2.3 * m)}" fill="none"/>`;
    studene += `<use href="#${sid}" stroke="${U.spiralaSvetlo}" stroke-width="${f(0.8 * m)}" fill="none" opacity="0.7" transform="translate(${f(-0.5 * m)} ${f(-0.6 * m)})"/>`;
    zhave += `<path d="${oblouk(k, t0, t1, hg, ri)}" stroke="${Z.svit}" stroke-width="${f(26 * m)}" fill="none" opacity="${o3(Z.svitSila * 0.42)}"/>`;
    zhave += `<path d="${oblouk(k, t0, t1, hg, ri)}" stroke="${Z.svit}" stroke-width="${f(12 * m)}" fill="none" opacity="${o3(Z.svitSila * 0.75)}"/>`;
    zhave += `<use href="#${sid}" stroke="${Z.jadro}" stroke-width="${f(2.3 * m)}" fill="none"/>`;
  });
  vn += drazky + studene;

  /* Dno komory */
  vn += `<ellipse cx="${f(cx)}" cy="${f(k.y0)}" rx="${f(ri)}" ry="${f(ri * E)}" fill="${U.dno}"/>`;
  vn += `<ellipse cx="${f(cx)}" cy="${f(k.y0)}" rx="${f(ri)}" ry="${f(ri * E)}" fill="none" stroke="#2B1A10" stroke-width="${f(5 * m)}" opacity="0.12"/>`;

  /* Žár na stěně a spirálách — pod deskami a kusy */
  defs.push(kruhovy(`${p}-zs`, cx, k.y0 - Hc * 0.5, ri * 1.08, [[0, Z.stena, Z.stenaSila], [0.6, Z.stena, Z.stenaSila * 0.92], [1, Z.stenaOkraj, Z.stenaSila * 0.9]], 2.1));
  vn += `<g class="${p}-zar"><rect ${ramec} fill="url(#${p}-zs)"/><g class="${p}-spirala">${zhave}</g></g>`;

  /* Patra: sloupky, desky a kusy, každé patro odzadu dopředu */
  defs.push(valcovy(`${p}-sl`, U.sloupek, 0.32));
  defs.push(vodorovny(`${p}-dh`, cx - k.rs, cx + k.rs, [[0, U.hranaStin], [0.12, U.hrana], [0.35, smichej(U.hrana, "#FFFFFF", 0.25)], [0.7, U.hrana], [1, U.hranaStin]]));
  defs.push(vodorovny(`${p}-dv`, cx - k.rs, cx + k.rs, [[0, smichej(U.deska, "#FFFFFF", 0.3)], [0.45, U.deska], [1, U.deskaStin]]));
  const rSloupku = 8.5 * m;
  const sloupky = [60, 180, 300].map((t) => ({ x: k.rs * 0.8 * Math.sin(t * RAD), z: k.rs * 0.8 * Math.cos(t * RAD) }));
  const sloupek = (x: number, z: number, h0: number, h1: number): Polozka => {
    const [sx, yb] = bod(k, x, h0, z);
    const yt = bod(k, x, h1, z)[1];
    const r = rSloupku;
    return {
      z,
      svg:
        `<path d="M${f(sx - r)} ${f(yt)} V${f(yb)} A${f(r)} ${f(r * E)} 0 0 0 ${f(sx + r)} ${f(yb)} V${f(yt)} Z" fill="url(#${p}-sl)"/>` +
        `<path d="M${f(sx - r)} ${f(yb)} A${f(r)} ${f(r * E)} 0 0 0 ${f(sx + r)} ${f(yb)}" stroke="#2B1A10" stroke-width="${f(1.4 * m)}" fill="none" opacity="0.2"/>`,
    };
  };
  const deska = (hb: number, ht: number) => {
    const yT = k.y0 - ht;
    const yB = k.y0 - hb;
    const rx = k.rs;
    const ry = k.rs * E;
    return (
      `<ellipse cx="${f(cx + 3 * m)}" cy="${f(yB + 5 * m)}" rx="${f(rx)}" ry="${f(ry)}" fill="#2B1A10" opacity="0.12"/>` +
      `<path d="M${f(cx - rx)} ${f(yT)} A${f(rx)} ${f(ry)} 0 0 0 ${f(cx + rx)} ${f(yT)} V${f(yB)} A${f(rx)} ${f(ry)} 0 0 1 ${f(cx - rx)} ${f(yB)} Z" fill="url(#${p}-dh)"/>` +
      `<ellipse cx="${f(cx)}" cy="${f(yT)}" rx="${f(rx)}" ry="${f(ry)}" fill="url(#${p}-dv)"/>` +
      `<path d="M${f(cx - rx)} ${f(yT)} A${f(rx)} ${f(ry)} 0 0 0 ${f(cx + rx)} ${f(yT)}" stroke="#FFFFFF" stroke-width="${f(1.3 * m)}" fill="none" opacity="0.45"/>`
    );
  };

  /* Kusy podle výpalu: x, z vůči ose pece, h = plocha patra. Výšky tak, ať se
     kus vejde pod přední hranu desky nad sebou. */
  const glazovany = (n: number, tvar: Tvar, glazura: string, vyska: number, x: number, z: number, h: number): Polozka => ({
    z,
    svg: nadoba({ id: `${p}-n${n}`, tvar, stav: "hotovy", glazura, x: cx + x, y: pataNa(k, tvar, "hotovy", vyska, h, z), vyska }),
  });
  const suchy = (n: number, tvar: Tvar, vyska: number, x: number, z: number, h: number): Polozka => ({
    z,
    svg: nadoba({ id: `${p}-n${n}`, tvar, stav: "suchy", x: cx + x, y: pataNa(k, tvar, "suchy", vyska, h, z), vyska }),
  });
  const kusy: ((h: number) => Polozka[])[] = noc
    ? [
        (h) => [glazovany(1, "miska", "tenmoku", 50, -52, -30, h), glazovany(2, "hrnek", "celadon", 90, 48, -20, h)],
        (h) => [
          glazovany(3, "vaza", "matná bílá", 106, -64, 0, h),
          glazovany(4, "yunomi", "shino", 82, 4, -50, h),
          { z: 96, svg: kuzely({ id: `${p}-zk`, x: cx + 70, y: k.y0 - h + 96 * E, s: 0.4, ohnuti: 1, e: E }) },
        ],
        (h) => [glazovany(5, "miska", "popelová šedá", 48, -50, -14, h), glazovany(6, "hrnek", "železitá hnědá", 84, 46, -24, h)],
      ]
    : [
        (h) => [
          { z: -34, svg: miskyVSobe(`${p}-n1`, "suchy", cx - 50, pataNa(k, "miska", "suchy", 56, h, -34), [56, 48, 41]) },
          { z: 24, svg: hrnkyNaSobe(`${p}-n2`, "suchy", cx + 54, pataNa(k, "hrnek", "suchy", 50, h, 24), 50) },
        ],
        (h) => [
          suchy(3, "vaza", 96, -62, 0, h),
          { z: -14, svg: vMisce(`${p}-n4`, "suchy", cx + 28, pataNa(k, "miska", "suchy", 52, h, -14), 52, "yunomi", 62) },
          suchy(5, "valec", 70, 96, -46, h),
        ],
        (h) => [
          { z: 10, svg: hrnkyNaSobe(`${p}-n6`, "suchy", cx - 44, pataNa(k, "hrnek", "suchy", 46, h, 10), 46) },
          { z: -18, svg: miskyVSobe(`${p}-n7`, "suchy", cx + 46, pataNa(k, "miska", "suchy", 46, h, -18), [46, 40]) },
        ],
      ];

  let pod = 0;
  for (let i = 0; i <= 3; i++) {
    const polozky: Polozka[] = i === 0 ? [] : kusy[i - 1](pod);
    if (i < 3) for (const sl of sloupky) polozky.push(sloupek(sl.x, sl.z, pod, k.patra[i] + 1));
    polozky.sort((a, b) => a.z - b.z);
    vn += polozky.map((q) => q.svg).join("");
    if (i < 3) {
      vn += deska(k.patra[i], k.patra[i] + k.tl);
      pod = k.patra[i] + k.tl;
    }
  }

  /* Žár přes kusy: tónování, kus musí zůstat poznat; ke stěnám se spirálami žhavější */
  defs.push(kruhovy(`${p}-zt`, cx, k.y0 - Hc * 0.47, ri * 1.02, [[0, Z.tonovani, Z.tonovaniSila], [0.7, Z.tonovani, Z.tonovaniSila * 0.86], [1, Z.horko2, Z.tonovaniSila * 0.82]], 2.2));
  defs.push(vodorovny(`${p}-zv`, xL, xP, [[0, Z.vineta, Z.vinetaSila], [0.2, Z.vineta, 0], [0.8, Z.vineta, 0], [1, Z.vineta, Z.vinetaSila]]));
  vn += `<g class="${p}-zar"><rect ${ramec} fill="url(#${p}-zt)"/><rect ${ramec} fill="url(#${p}-zv)"/></g>`;
  s.push(`<g clip-path="url(#${p}-in)">${vn}</g>`);

  /* ——— Stěny řezu: plech, izolační deska, cihla s drážkami ——— */
  const bc = k.R - k.plech - k.deska;
  const rez: string[] = [];
  const horke: string[] = [];
  for (const sg of [-1, 1]) {
    const P = (rho: number, h: number) => vRezu(k, sg, rho, h);
    const svetla = sg > 0;
    let o = "";
    const obrys = mnohouhelnik([P(0, hV), P(R, hV), P(R, -k.dno), P(0, -k.dno)]);
    const dira = mnohouhelnik([P(0, Hc), P(ri, Hc), P(ri, 0), P(0, 0)]);
    o += `<path d="${obrys} ${dira}" fill-rule="evenodd" fill="${svetla ? B.cihlaP : B.cihlaL}"/>`;
    /* Izolační deska za cihlami a pod dnem */
    o += `<path d="${mnohouhelnik([P(bc, Hc), P(R - k.plech, Hc), P(R - k.plech, -k.dno + k.plech * 1.5), P(bc, -k.dno + k.plech * 1.5)])}" fill="${svetla ? B.deskaP : B.deskaL}"/>`;
    o += `<path d="${mnohouhelnik([P(0, -k.dno + k.plech * 1.5 + k.deska * 0.8), P(bc, -k.dno + k.plech * 1.5 + k.deska * 0.8), P(bc, -k.dno + k.plech * 1.5), P(0, -k.dno + k.plech * 1.5)])}" fill="${svetla ? B.deskaP : B.deskaL}"/>`;
    /* Plech pláště, lem víka a dno */
    const plech = svetla ? B.plechP : B.plechL;
    o += `<path d="${mnohouhelnik([P(R - k.plech, Hc - 0.8), P(R, Hc - 0.8), P(R, -k.dno), P(R - k.plech, -k.dno)])}" fill="${plech}"/>`;
    o += `<path d="${mnohouhelnik([P(R - k.plech, hV), P(R + 0.6, hV), P(R + 0.6, Hc + 0.8), P(R - k.plech, Hc + 0.8)])}" fill="${plech}"/>`;
    o += `<path d="${mnohouhelnik([P(0, -k.dno + k.plech * 1.5), P(R, -k.dno + k.plech * 1.5), P(R, -k.dno), P(0, -k.dno)])}" fill="${plech}"/>`;
    for (const hb of [Hc * 0.27, Hc * 0.7]) {
      o += `<path d="${mnohouhelnik([P(R, hb + 3.6 * m), P(R + 1.4 * m, hb + 3.6 * m), P(R + 1.4 * m, hb - 3.6 * m), P(R, hb - 3.6 * m)])}" fill="${plech}"/>`;
    }
    /* Spáry: řady cihel ve stěně, cihly ve víku a ve dně, spoj víka s tělem */
    let sp = "";
    const vrsta2 = 36 * m;
    for (const hg of k.drazky) sp += `M${xy(P(ri, hg - vrsta2))} L${xy(P(bc, hg - vrsta2))}`;
    sp += `M${xy(P(ri, k.drazky[k.drazky.length - 1] + vrsta2))} L${xy(P(bc, k.drazky[k.drazky.length - 1] + vrsta2))}`;
    sp += `M${xy(P(0, -k.dno * 0.42))} L${xy(P(bc, -k.dno * 0.42))}`;
    for (const r of [0.34, 0.7]) sp += `M${xy(P(R * r, Hc))} L${xy(P(R * r, hV))}`;
    for (const r of [0.22, 0.55, 0.86]) sp += `M${xy(P(R * r, 0))} L${xy(P(R * r, -k.dno * 0.42))}`;
    o += `<path d="${sp}" stroke="${B.spara}" stroke-width="${f(1.2 * m)}" fill="none" opacity="0.75"/>`;
    o += `<path d="M${xy(P(ri, Hc))} L${xy(P(R, Hc))}" stroke="${B.ocelHrana}" stroke-width="${f(1.6 * m)}" opacity="0.5"/>`;
    /* Drážky s průřezem spirály */
    for (const hg of k.drazky) {
      const gh = k.vyskaDrazky / 2;
      const gd = k.hloubkaDrazky;
      o += `<path d="${mnohouhelnik([P(ri, hg + gh), P(ri + gd, hg + gh - 2 * m), P(ri + gd, hg - gh), P(ri, hg - gh)])}" fill="${B.drazka}"/>`;
      const [ex, ey] = P(ri + gd * 0.5, hg);
      o += `<ellipse cx="${f(ex)}" cy="${f(ey)}" rx="${f(k.rSpiraly * S45)}" ry="${f(k.rSpiraly)}" fill="none" stroke="${U.spirala}" stroke-width="${f(2.3 * m)}"/>`;
    }
    if (svetla) {
      /* Průhledový otvor: tunel stěnou, zvenku zasunutá šamotová zátka */
      const hp = k.pruhled;
      o += `<path d="${mnohouhelnik([P(ri, hp + 10 * m), P(R + 0.6, hp + 10 * m), P(R + 0.6, hp - 10 * m), P(ri, hp - 10 * m)])}" fill="${noc ? "#1A1210" : "#3A2A22"}"/>`;
      o += `<path d="${mnohouhelnik([P(R - 26 * m, hp + 7.5 * m), P(R + 0.6, hp + 7.5 * m), P(R + 0.6, hp - 7.5 * m), P(R - 26 * m, hp - 7.5 * m)])}" fill="#E9DCC6"/>`;
      o += `<path d="M${xy(P(R - 25 * m, hp + 6 * m))} L${xy(P(R, hp + 6 * m))}" stroke="#FFFFFF" stroke-width="${f(1.4 * m)}" opacity="0.6"/>`;
      o += `<path d="${mnohouhelnik([P(R - 1, hp + 14 * m), P(R + 2.4 * m, hp + 14 * m), P(R + 2.4 * m, hp - 14 * m), P(R - 1, hp - 14 * m)])}" fill="${plech}"/>`;
    } else {
      /* Termočlánek: keramická trubička stěnou, špička vyčnívá do komory */
      const ht = k.termoclanek;
      o += `<path d="${mnohouhelnik([P(ri - 22 * m, ht + 3.8 * m), P(R + 2 * m, ht + 3.8 * m), P(R + 2 * m, ht - 3.8 * m), P(ri - 22 * m, ht - 3.8 * m)])}" fill="#F2EBDD"/>`;
      o += `<path d="M${xy(P(ri - 20 * m, ht))} L${xy(P(R + 2 * m, ht))}" stroke="#8C8478" stroke-width="${f(1.2 * m)}" opacity="0.8"/>`;
      o += `<path d="M${xy(P(ri - 22 * m, ht + 3.8 * m))} L${xy(P(bc, ht + 3.8 * m))}" stroke="#FFFFFF" stroke-width="${f(1 * m)}" opacity="0.5"/>`;
    }
    /* Hrana řezu na plechu se blýskne */
    o += `<path d="M${xy(P(R + 0.3, hV))} L${xy(P(R + 0.3, -k.dno))}" stroke="${svetla ? "#FFFFFF" : B.ocelSvetlo}" stroke-width="${f(1 * m)}" opacity="${svetla ? 0.7 : 0.3}"/>`;
    rez.push(o);

    /* Horký líc: cihla u komory žhne a do hloubky stěny chladne */
    let hk = "";
    const gid = `${p}-hs${sg > 0 ? "p" : "l"}`;
    const hloubka = ri + k.cihla * 0.62;
    defs.push(vodorovny(gid, cx + sg * ri * S45, cx + sg * hloubka * S45, [[0, Z.horko, 0.96], [0.22, Z.horko2, 0.62], [0.6, Z.horko2, 0.18], [1, Z.horko2, 0]]));
    hk += `<path d="${mnohouhelnik([P(ri, Hc), P(hloubka, Hc), P(hloubka, 0), P(ri, 0)])}" fill="url(#${gid})"/>`;
    const hVid = `${gid}v`;
    const z0 = P(R * 0.5, Hc);
    const dv = (0.62 * k.vik) / (1 + E * E);
    defs.push(primka(hVid, z0, [z0[0] + sg * E * dv, z0[1] - dv], [[0, Z.horko, 0.9], [0.3, Z.horko2, 0.5], [1, Z.horko2, 0]]));
    hk += `<path d="${mnohouhelnik([P(0, Hc), P(bc, Hc), P(bc, Hc + 0.62 * k.vik), P(0, Hc + 0.62 * k.vik)])}" fill="url(#${hVid})"/>`;
    const hDid = `${gid}d`;
    const d0 = P(R * 0.5, 0);
    const dd = (0.62 * k.dno) / (1 + E * E);
    defs.push(primka(hDid, d0, [d0[0] - sg * E * dd, d0[1] + dd], [[0, Z.horko, 0.9], [0.3, Z.horko2, 0.5], [1, Z.horko2, 0]]));
    hk += `<path d="${mnohouhelnik([P(0, 0), P(bc, 0), P(bc, -0.62 * k.dno), P(0, -0.62 * k.dno)])}" fill="url(#${hDid})"/>`;
    let spr = "";
    for (const hg of k.drazky) {
      const gh = k.vyskaDrazky / 2;
      const gd = k.hloubkaDrazky;
      hk += `<path d="${mnohouhelnik([P(ri, hg + gh), P(ri + gd, hg + gh - 2 * m), P(ri + gd, hg - gh), P(ri, hg - gh)])}" fill="${Z.stenaOkraj}" opacity="0.5"/>`;
      const [ex, ey] = P(ri + gd * 0.5, hg);
      spr += `<ellipse cx="${f(ex)}" cy="${f(ey)}" rx="${f(k.rSpiraly * 1.7 * S45)}" ry="${f(k.rSpiraly * 1.7)}" fill="${Z.svit}" opacity="${o3(Z.svitSila)}"/>`;
      spr += `<ellipse cx="${f(ex)}" cy="${f(ey)}" rx="${f(k.rSpiraly * S45)}" ry="${f(k.rSpiraly)}" fill="none" stroke="${Z.jadro}" stroke-width="${f(2.3 * m)}"/>`;
    }
    hk += `<g class="${p}-spirala">${spr}</g>`;
    if (svetla) {
      const hp = k.pruhled;
      const tid = `${p}-pr`;
      defs.push(vodorovny(tid, cx + ri * S45, cx + (R - 26 * m) * S45, [[0, Z.horko, 0.95], [1, Z.horko2, 0.12]]));
      hk += `<path d="${mnohouhelnik([P(ri, hp + 10 * m), P(R - 26 * m, hp + 10 * m), P(R - 26 * m, hp - 10 * m), P(ri, hp - 10 * m)])}" fill="url(#${tid})"/>`;
    } else {
      const ht = k.termoclanek;
      hk += `<path d="${mnohouhelnik([P(ri - 22 * m, ht + 3.8 * m), P(ri + 6 * m, ht + 3.8 * m), P(ri + 6 * m, ht - 3.8 * m), P(ri - 22 * m, ht - 3.8 * m)])}" fill="${Z.horko}" opacity="0.55"/>`;
    }
    horke.push(hk);
  }
  s.push(rez.join(""));
  s.push(`<g class="${p}-zar">${horke.join("")}</g>`);

  /* ——— Víko shora: nerezový lem a cihlová deska se spárami, vpředu výřez ——— */
  const vrch = (r: number) =>
    `M${xy(bod(k, 0, hV, 0))} L${xy(naValci(k, 45, hV, r))} A${f(r)} ${f(r * E)} 0 1 0 ${xy(naValci(k, -45, hV, r))} Z`;
  s.push(`<path d="${vrch(R + 0.6)}" fill="${B.ocelSvetlo}"/>`);
  const rc = R - 7 * m;
  defs.push(`<clipPath id="${p}-vv"><path d="${vrch(rc)}"/></clipPath>`);
  defs.push(primka(`${p}-vb`, [cx - R, k.y0 - hV - R * E], [cx + R, k.y0 - hV + R * E], [[0, smichej(B.vikoVrch, "#FFFFFF", noc ? 0.08 : 0.4)], [0.5, B.vikoVrch], [1, B.vikoVrchStin]]));
  s.push(`<path d="${vrch(rc)}" fill="url(#${p}-vb)"/>`);
  let mriz = "";
  const [, yv] = bod(k, 0, hV, 0);
  for (const xx of [-0.56, -0.19, 0.18, 0.55]) mriz += `M${f(cx + xx * R)} ${f(yv - R * E)} V${f(yv + R * E)}`;
  for (const zz of [-0.62, -0.24, 0.14]) mriz += `M${f(cx - R)} ${f(yv + zz * R * E)} H${f(cx + R)}`;
  s.push(`<g clip-path="url(#${p}-vv)"><path d="${mriz}" stroke="${B.vikoSpara}" stroke-width="${f(1.3 * m)}" fill="none"/><path d="${mriz}" stroke="#FFFFFF" stroke-width="${f(0.8 * m)}" fill="none" opacity="${noc ? 0.05 : 0.35}" transform="translate(${f(1 * m)} ${f(1 * m)})"/></g>`);
  s.push(`<path d="M${xy(naValci(k, -45, hV, rc))} L${xy(bod(k, 0, hV, 0))} L${xy(naValci(k, 45, hV, rc))}" stroke="#FFFFFF" stroke-width="${f(1.2 * m)}" fill="none" opacity="${noc ? 0.15 : 0.6}"/>`);

  /* ——— Plášť po stranách výřezu ——— */
  defs.push(vodorovny(`${p}-oc`, cx - R, cx + R, B.ocel));
  const pasy: [number, number][] = [[-90, -45], [45, 90]];
  for (const [a, b] of pasy) {
    s.push(`<path d="${plast(k, a, b, -k.dno, Hc - 0.8)}" fill="url(#${p}-oc)"/>`);
    s.push(`<path d="${plast(k, a, b, Hc + 0.8, hV, R + 0.6)}" fill="url(#${p}-oc)"/>`);
    s.push(`<path d="${oblouk(k, a, b, Hc, R + 0.6)}" stroke="${B.ocelHrana}" stroke-width="${f(1.8 * m)}" fill="none"/>`);
    s.push(`<path d="${oblouk(k, a, b, Hc - 2 * m, R)}" stroke="#FFFFFF" stroke-width="${f(1 * m)}" fill="none" opacity="${noc ? 0.12 : 0.45}"/>`);
    s.push(`<path d="${oblouk(k, a, b, hV - 0.6, R + 0.6)}" stroke="${B.ocelSvetlo}" stroke-width="${f(1.2 * m)}" fill="none" opacity="0.8"/>`);
  }
  s.push(obruce(k, `${p}-oc`, B, pasy));
  /* Svislé pruhy světla v nerezu */
  for (const [t, w, o] of [[-80, 2.4, 0.5], [-73, 1.2, 0.35], [83, 1.6, 0.25]] as [number, number, number][]) {
    const [x1, y1] = naValci(k, t, Hc - 6 * m);
    const [, y2] = naValci(k, t, -k.dno + 8 * m);
    s.push(`<path d="M${f(x1)} ${f(y1)} V${f(y2)}" stroke="#FFFFFF" stroke-width="${f(w * m)}" opacity="${o3(noc ? o * 0.3 : o)}" stroke-linecap="round"/>`);
  }
  for (const t of [-60, 60]) s.push(prezka(k, B, t, false));
  /* Držadlo víka na levém boku */
  {
    const [x, y] = naValci(k, -76, Hc + k.vik * 0.5, R);
    s.push(`<rect x="${f(x - 17 * m)}" y="${f(y - 4.5 * m)}" width="${f(22 * m)}" height="${f(9 * m)}" rx="${f(4 * m)}" fill="#2A2A2C"/>`);
    s.push(`<path d="M${f(x - 14 * m)} ${f(y - 2.4 * m)} H${f(x + 2 * m)}" stroke="#7A7A80" stroke-width="${f(1.2 * m)}" stroke-linecap="round" opacity="0.8"/>`);
  }
  const sv = svorkovnice(k, B);
  s.push(sv.svg);
  /* Zátka průhledu a hlavice termočlánku zvenku */
  {
    const [zx, zy] = vRezu(k, 1, R + 2 * m, k.pruhled);
    s.push(zatka(k, zx, zy, 1));
    const [tx, ty] = vRezu(k, -1, R + 2 * m, k.termoclanek);
    s.push(hlavice(k, tx, ty, B));
  }

  /* ——— Regulátor na boku, kabely ——— */
  const rs = 1;
  const rx = cx + R + 32;
  const ry = k.y0 - Hc * 0.56 - 52;
  {
    const [bx, by] = [cx + R - 2, ry + 52];
    s.push(`<rect x="${f(bx)}" y="${f(by - 5)}" width="${f(rx - bx + 4)}" height="10" rx="2" fill="${B.ocelDetail}"/>`);
    s.push(`<rect x="${f(bx)}" y="${f(by - 5)}" width="${f(rx - bx + 4)}" height="3" rx="1.5" fill="${B.ocelSvetlo}" opacity="0.7"/>`);
    s.push(`<rect x="${f(bx - 3)}" y="${f(by - 16)}" width="7" height="32" rx="2" fill="${B.ocelDetail}"/>`);
  }
  s.push(kabel(`M${f(rx + 22)} ${f(ry + 104)} C${f(rx + 20)} ${f(ry + 190)} ${f(sv.vstup[0] + 30)} ${f(sv.vstup[1] + 50)} ${f(sv.vstup[0])} ${f(sv.vstup[1])}`, B, 1, noc));
  s.push(kabel(`M${f(rx + 128)} ${f(ry + 104)} C${f(rx + 132)} ${f(yZem - 40)} ${f(rx + 120)} ${f(yZem + 18)} ${f(800)} ${f(yZem + 26)}`, B, 1, noc));
  s.push(regulator(`${p}-rg`, rx, ry, rs, noc ? "1280" : "950", B, noc));

  return `<svg viewBox="0 0 800 760" aria-hidden="true"><defs>${defs.join("")}</defs>${s.join("")}</svg>`;
}

/* ═══════════════ Ráno po výpalu ═══════════════ */

/** Podlaha pod osou pece (z = 0); hloubka z posouvá bod o z · ELIPSA dolů */
const RANO_ZEM = 600;
const PEC_RANO = rozmery(930, RANO_ZEM - 124 * 0.2 - 124 * 0.188, 124);
/** Stůl před pecí: od x0 do x1, hloubka z0 (vzadu) až z1 (vpředu), výška desky */
const STUL = { x0: 28, x1: 992, z0: 175, z1: 400, h: 130, tl: 24 };
const yPodlahy = (z: number) => RANO_ZEM + z * E;
const yStolu = (z: number) => yPodlahy(z) - STUL.h;
const RADA_Z = 280;
/** Miska se zlatem kousek stranou, pod oknem */
const KINTSUGI = { x: 124, z: 326 };

/** Pecinka stojí na podlaze vpravo vedle pece, Střípek sedí na stole u misky se zlatem */
export const MISTA_RANO = {
  pecinka: { x: 1130, y: Math.round(yPodlahy(262)), w: 132 },
  stripek: { x: KINTSUGI.x + 76, y: Math.round(yStolu(KINTSUGI.z - 6)), w: 96 },
};

/** Obrys těla kusu (jako v nadoba()) — pro ořez světla a lesku */
function obrysKusu(tvar: Tvar, x: number, y: number, H: number) {
  const g = geometrie(tvar, x, y, H);
  const N = g.levy.length;
  return {
    g,
    d:
      `M${xy(g.levy[0])}${hladce(g.levy)} A${f(g.rx)} ${f(g.ry)} 0 0 1 ${xy(g.pravy[N - 1])}` +
      `${hladce([...g.pravy].reverse())} A${f(g.r(0) * H)} ${f(g.ry0)} 0 0 1 ${xy(g.levy[0])} Z`,
  };
}

/**
 * Ráno po výpalu, viewBox 1200 × 700. Okno vlevo se svítáním, šikmý
 * růžovozlatý paprsek na stůl s právě vyndanými kusy, za stolem tatáž pec
 * s odklopeným víkem, z níž stoupá teplo (`${p}-para`). Lesky ranního
 * světla na glazurách mají třídu `${p}-lesk`.
 */
export function ranoSvg(p = "dpr"): string {
  const k = PEC_RANO;
  const B = RANO;
  const U = B.in;
  const { cx, R, ri, Hc, m } = k;
  const defs: string[] = [];
  const s: string[] = [];
  const yStena = yPodlahy(-175);

  /* ——— Zeď a podlaha: u okna teplé světlo, dál do pokoje ranní šero ——— */
  defs.push(vodorovny(`${p}-ze`, 0, 1200, [[0, "#EBDCD0"], [0.28, "#E8D9CE"], [0.55, "#D8CBC6"], [1, "#BDB1B6"]]));
  s.push(`<rect width="1200" height="${f(yStena)}" fill="url(#${p}-ze)"/>`);
  defs.push(svisly(`${p}-zs`, "#6E5A6A", "#6E5A6A", 0.26, 0));
  s.push(`<rect width="1200" height="170" fill="url(#${p}-zs)"/>`);
  defs.push(svisly(`${p}-po`, "#B5AAA8", "#D4CAC2"));
  s.push(`<rect y="${f(yStena)}" width="1200" height="${f(700 - yStena)}" fill="url(#${p}-po)"/>`);
  s.push(`<rect y="${f(yStena - 9)}" width="1200" height="9" fill="#C8BBB2"/>`);
  s.push(`<rect y="${f(yStena - 9)}" width="1200" height="1.6" fill="#FFFFFF" opacity="0.4"/>`);
  s.push(`<rect y="${f(yStena)}" width="1200" height="5" fill="#6E5E66" opacity="0.18"/>`);

  /* ——— Okno se svítáním ——— */
  const O = { x0: 64, x1: 330, y0: 66, y1: 378 };
  const sx0 = O.x0 + 12;
  const sx1 = O.x1 - 12;
  const sy0 = O.y0 + 12;
  const sy1 = O.y1 - 14;
  const sredX = (sx0 + sx1) / 2;
  /* Záře oblohy na zdi kolem okna */
  defs.push(kruhovy(`${p}-oz`, (O.x0 + O.x1) / 2, (O.y0 + O.y1) / 2 + 20, 300, [[0, "#FFE2C8", 0.55], [1, "#FFE2C8", 0]], 1.05));
  s.push(`<ellipse cx="${f((O.x0 + O.x1) / 2)}" cy="${f((O.y0 + O.y1) / 2 + 20)}" rx="300" ry="315" fill="url(#${p}-oz)"/>`);
  defs.push(`<clipPath id="${p}-sk"><rect x="${sx0}" y="${sy0}" width="${sx1 - sx0}" height="${sy1 - sy0}"/></clipPath>`);
  defs.push(svisly(`${p}-ob`, "#9AA2C8", "#FBE4B4"));
  defs.push(`<linearGradient id="${p}-ob2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#97A0C8"/><stop offset="0.36" stop-color="#D3AAC0"/><stop offset="0.62" stop-color="#F3B79E"/><stop offset="0.84" stop-color="#F9D39A"/><stop offset="1" stop-color="#FCE6B6"/></linearGradient>`);
  let nebe = `<rect x="${sx0}" y="${sy0}" width="${sx1 - sx0}" height="${sy1 - sy0}" fill="url(#${p}-ob2)"/>`;
  defs.push(kruhovy(`${p}-sl`, 128, 318, 150, [[0, "#FFF6DC", 0.95], [0.18, "#FFE8B8", 0.7], [0.5, "#FFD6A0", 0.25], [1, "#FFD6A0", 0]]));
  nebe += `<circle cx="128" cy="318" r="150" fill="url(#${p}-sl)"/>`;
  nebe += `<circle cx="128" cy="320" r="17" fill="#FFF8E6"/>`;
  /* Obláčky */
  nebe += `<path d="M92 150 Q118 132 152 142 Q178 128 214 140 Q236 140 244 152 Q190 160 92 150 Z" fill="#F7D3D0" opacity="0.75"/>`;
  nebe += `<path d="M206 206 Q232 192 262 200 Q288 190 314 202 L314 212 Q262 218 206 206 Z" fill="#F9DCCF" opacity="0.65"/>`;
  nebe += `<path d="M96 151 Q150 156 240 152" stroke="#FFF2EA" stroke-width="2" fill="none" opacity="0.6"/>`;
  /* Kopce a ořech za oknem */
  nebe += `<path d="M${sx0} 322 C120 304 168 300 214 312 C252 322 288 300 ${sx1} 304 V${sy1} H${sx0} Z" fill="#B59AB0"/>`;
  nebe += `<path d="M${sx0} 346 C110 336 170 332 222 340 C262 346 292 334 ${sx1} 338 V${sy1} H${sx0} Z" fill="#8E7690"/>`;
  nebe += `<path d="M268 364 C268 338 272 318 268 296" stroke="#6E5874" stroke-width="7" fill="none" stroke-linecap="round"/>`;
  nebe += `<path d="M268 312 C256 302 246 300 238 290 M270 304 C282 296 292 290 300 278" stroke="#6E5874" stroke-width="3.4" fill="none" stroke-linecap="round"/>`;
  nebe += `<path d="M226 292 C214 268 236 244 258 252 C266 230 300 226 312 248 C330 252 334 280 318 292 C314 306 290 308 280 300 C266 310 244 308 238 300 C228 302 222 298 226 292 Z" fill="#7C6886"/>`;
  nebe += `<path d="M236 262 C246 250 262 248 270 254" stroke="#A68FA6" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.7"/>`;
  /* Odlesk na skle */
  nebe += `<path d="M${sx0 + 18} ${sy0} L${sx0 + 70} ${sy0} L${sx0 + 10} ${sy0 + 120} L${sx0} ${sy0 + 120} L${sx0} ${sy0 + 36} Z" fill="#FFFFFF" opacity="0.13"/>`;
  nebe += `<path d="M${sredX + 30} ${sy0} L${sredX + 52} ${sy0} L${sredX + 4} ${sy0 + 96} L${sredX + 4} ${sy0 + 52} Z" fill="#FFFFFF" opacity="0.1"/>`;
  /* Ostění, rám, sklo, příčka */
  s.push(`<rect x="${O.x0 - 6}" y="${O.y0 - 6}" width="${O.x1 - O.x0 + 12}" height="${O.y1 - O.y0 + 10}" fill="#CDBFB6"/>`);
  s.push(`<rect x="${O.x0}" y="${O.y0}" width="${O.x1 - O.x0}" height="${O.y1 - O.y0}" rx="2" fill="#F6F2EC"/>`);
  s.push(`<g clip-path="url(#${p}-sk)">${nebe}</g>`);
  s.push(`<rect x="${sx0}" y="${sy0}" width="${sx1 - sx0}" height="${sy1 - sy0}" fill="none" stroke="#D9D0C6" stroke-width="2"/>`);
  s.push(`<rect x="${f(sredX - 5)}" y="${sy0}" width="10" height="${sy1 - sy0}" fill="#F6F2EC"/>`);
  s.push(`<rect x="${f(sredX + 2)}" y="${sy0}" width="3" height="${sy1 - sy0}" fill="#D9D0C6"/>`);
  s.push(`<rect x="${f(sredX - 2)}" y="${f((sy0 + sy1) / 2 - 18)}" width="4" height="26" rx="2" fill="#B8B0A8"/>`);
  /* Parapet */
  s.push(`<path d="M${O.x0 - 16} ${O.y1} H${O.x1 + 16} L${O.x1 + 22} ${O.y1 + 9} H${O.x0 - 22} Z" fill="#FBF8F3"/>`);
  s.push(`<rect x="${O.x0 - 22}" y="${O.y1 + 9}" width="${O.x1 - O.x0 + 44}" height="9" fill="#E6DED4"/>`);
  s.push(`<rect x="${O.x0 - 22}" y="${O.y1 + 18}" width="${O.x1 - O.x0 + 44}" height="12" fill="#6E5E66" opacity="0.08"/>`);

  /* ——— Bílý plech za pecí ——— */
  const PL = { x0: cx - 168, x1: cx + 172, y0: 112 };
  defs.push(vodorovny(`${p}-pl`, PL.x0, PL.x1, [[0, "#FFFBF8"], [0.4, "#F3EFEE"], [1, "#DAD5D8"]]));
  s.push(`<rect x="${f(PL.x0 + 6)}" y="${f(PL.y0 + 6)}" width="${f(PL.x1 - PL.x0)}" height="${f(yStena - PL.y0 - 6)}" rx="6" fill="#6E5E66" opacity="0.12"/>`);
  s.push(`<rect x="${f(PL.x0)}" y="${f(PL.y0)}" width="${f(PL.x1 - PL.x0)}" height="${f(yStena - PL.y0 - 4)}" rx="5" fill="url(#${p}-pl)"/>`);
  s.push(`<path d="M${f(PL.x0 + 5)} ${f(PL.y0 + 2)} H${f(PL.x1 - 5)}" stroke="#FFFFFF" stroke-width="2" opacity="0.8"/>`);
  for (const [sxx, syy] of [[PL.x0 + 12, PL.y0 + 12], [PL.x1 - 12, PL.y0 + 12], [PL.x0 + 12, yStena - 18], [PL.x1 - 12, yStena - 18]]) {
    s.push(`<circle cx="${f(sxx)}" cy="${f(syy)}" r="3.2" fill="#C9C3C6"/><circle cx="${f(sxx - 0.8)}" cy="${f(syy - 0.8)}" r="1.4" fill="#FFFFFF" opacity="0.8"/>`);
  }

  /* ——— Víko odklopené dozadu nahoru: horký líc k nám ——— */
  const hO = Hc + 4 * m;
  const zV = -R - 4 * m;
  const [vx, vy] = bod(k, 0, hO + R, zV);
  const tlV = k.vik * E;
  defs.push(vodorovny(`${p}-vk`, cx - R, cx + R, B.ocel));
  s.push(`<circle cx="${f(vx + 6)}" cy="${f(vy + 8)}" r="${f(R + 2)}" fill="#6E5E66" opacity="0.12"/>`);
  s.push(`<circle cx="${f(vx)}" cy="${f(vy - tlV)}" r="${f(R + 0.6)}" fill="url(#${p}-vk)"/>`);
  s.push(`<circle cx="${f(vx)}" cy="${f(vy)}" r="${f(R + 0.6)}" fill="url(#${p}-vk)"/>`);
  s.push(`<circle cx="${f(vx)}" cy="${f(vy)}" r="${f(R - 6 * m)}" fill="${B.ocelHrana}" opacity="0.5"/>`);
  /* Líc víka je obrácený od okna, je ve stínu; po výpalu do růžova */
  defs.push(primka(`${p}-vl`, [vx - R, vy - R], [vx + R * 0.7, vy + R], [[0, "#D8C6B6"], [0.45, "#BBA79A"], [1, "#9A8882"]]));
  defs.push(`<clipPath id="${p}-vc"><circle cx="${f(vx)}" cy="${f(vy)}" r="${f(R - 7.5 * m)}"/></clipPath>`);
  let lic = `<circle cx="${f(vx)}" cy="${f(vy)}" r="${f(R - 7.5 * m)}" fill="url(#${p}-vl)"/>`;
  let mr = "";
  for (const xx of [-0.56, -0.19, 0.18, 0.55]) mr += `M${f(vx + xx * R)} ${f(vy - R)} V${f(vy + R)}`;
  for (const yy of [-0.5, -0.02, 0.46]) mr += `M${f(vx - R)} ${f(vy + yy * R)} H${f(vx + R)}`;
  lic += `<path d="${mr}" stroke="#8C7A72" stroke-width="1.3" fill="none" opacity="0.5"/>`;
  lic += `<path d="${mr}" stroke="#F2E6DC" stroke-width="0.8" fill="none" opacity="0.3" transform="translate(1.2 1.2)"/>`;
  lic += `<circle cx="${f(vx - 6)}" cy="${f(vy + 8)}" r="${f(R * 0.6)}" fill="#E8C2B4" opacity="0.26"/>`;
  /* Okraj víka chytá světlo z okna zleva */
  lic += `<path d="M${f(vx - R * 0.86)} ${f(vy + R * 0.3)} A${f(R * 0.9)} ${f(R * 0.9)} 0 0 1 ${f(vx - R * 0.1)} ${f(vy - R * 0.89)}" stroke="#FFE4D4" stroke-width="5" fill="none" opacity="0.4" stroke-linecap="round"/>`;
  s.push(`<g clip-path="url(#${p}-vc)">${lic}</g>`);
  s.push(`<circle cx="${f(vx)}" cy="${f(vy)}" r="${f(R - 7.5 * m)}" fill="none" stroke="#5A4C48" stroke-width="1.2" opacity="0.35"/>`);
  /* Držadlo víka vlevo (kde bylo u zavřeného víka) */
  {
    const hx2 = vx - R * 0.966;
    const hy2 = vy - R * 0.26;
    s.push(`<rect x="${f(hx2 - 9)}" y="${f(hy2 - 10)}" width="8" height="20" rx="3.5" fill="#2A2A2C"/>`);
  }
  /* Panty vzadu */
  for (const dx of [-0.42, 0.42]) {
    const [px, py] = bod(k, dx * R, Hc - 6 * m, -R);
    const [, py2] = bod(k, dx * R, hO + 10 * m, zV);
    s.push(`<rect x="${f(px - 6)}" y="${f(py2)}" width="12" height="${f(py - py2)}" rx="2" fill="${B.ocelDetail}"/>`);
    s.push(`<rect x="${f(px - 6)}" y="${f(py2)}" width="4" height="${f(py - py2)}" rx="2" fill="#FFFFFF" opacity="0.5"/>`);
    s.push(`<circle cx="${f(px)}" cy="${f(py2 + 4)}" r="4.5" fill="${B.ocelHrana}"/>`);
  }

  /* ——— Stín pece na podlaze: ranní světlo zleva ho táhne doprava ——— */
  const yZem = RANO_ZEM;
  defs.push(mekkyStin(`${p}-ps`, B.stin, 0.3));
  s.push(`<ellipse cx="${f(cx + 120)}" cy="${f(yZem + 16)}" rx="${f(R * 1.9)}" ry="${f(R * 0.36)}" fill="url(#${p}-ps)" transform="rotate(6 ${f(cx + 120)} ${f(yZem + 16)})"/>`);
  s.push(`<ellipse cx="${f(cx + 8)}" cy="${f(yZem)}" rx="${f(R * 1.02)}" ry="${f(R * 1.02 * E)}" fill="${B.stin}" opacity="0.32"/>`);
  s.push(stojan(k, B));

  /* ——— Tělo pece celé zepředu ——— */
  defs.push(vodorovny(`${p}-oc`, cx - R, cx + R, B.ocel));
  s.push(`<path d="${plast(k, -90, 90, -k.dno, Hc)}" fill="url(#${p}-oc)"/>`);
  s.push(obruce(k, `${p}-oc`, B, [[-90, 90]]));
  for (const [t, w, o] of [[-80, 2.4, 0.55], [-73, 1.2, 0.35], [-24, 1.6, 0.18], [62, 1.4, 0.2]] as [number, number, number][]) {
    const [x1, y1] = naValci(k, t, Hc - 6 * m);
    const [, y2] = naValci(k, t, -k.dno + 8 * m);
    s.push(`<path d="M${f(x1)} ${f(y1)} V${f(y2)}" stroke="#FFFFFF" stroke-width="${f(w * m * 1.6)}" opacity="${o3(o)}" stroke-linecap="round"/>`);
  }
  /* Ranní světlo z okna po levém boku */
  defs.push(vodorovny(`${p}-ps2`, cx - R, cx - R * 0.4, [[0, "#FFC9A8", 0.5], [1, "#FFC9A8", 0]]));
  s.push(`<path d="${plast(k, -90, -20, -k.dno, Hc)}" fill="url(#${p}-ps2)"/>`);
  for (const t of [-60, 60]) s.push(prezka(k, B, t, true));
  const sv = svorkovnice(k, B);
  s.push(sv.svg);
  {
    const [zx, zy] = naValci(k, 45, k.pruhled, R + 1);
    s.push(zatka(k, zx - 3, zy, 1));
    const [tx, ty] = naValci(k, -45, k.termoclanek, R + 1);
    s.push(hlavice(k, tx + 6, ty, B));
  }
  s.push(`<path d="${oblouk(k, -90, 90, Hc - 0.6, R)}" stroke="${B.ocelSvetlo}" stroke-width="1.6" fill="none"/>`);

  /* ——— Otevřená pec shora: lem, cihly horní řady a pohled dovnitř ——— */
  const [ox, oy] = bod(k, 0, Hc, 0);
  s.push(`<ellipse cx="${f(ox)}" cy="${f(oy)}" rx="${f(R)}" ry="${f(R * E)}" fill="${B.ocelSvetlo}"/>`);
  defs.push(vodorovny(`${p}-ok`, cx - R, cx + R, [[0, "#F1E4D2"], [0.5, "#E1D2BE"], [1, "#BFAE9C"]]));
  s.push(`<ellipse cx="${f(ox)}" cy="${f(oy)}" rx="${f(R - k.plech)}" ry="${f((R - k.plech) * E)}" fill="url(#${p}-ok)"/>`);
  let okr = "";
  for (let i = 0; i < 16; i++) {
    const t = i * 22.5 + 11;
    okr += `M${xy(naValci(k, t, Hc, ri))} L${xy(naValci(k, t, Hc, R - k.plech - k.deska))}`;
  }
  s.push(`<path d="${okr}" stroke="${B.vikoSpara}" stroke-width="1" fill="none" opacity="0.6"/>`);
  s.push(`<ellipse cx="${f(ox)}" cy="${f(oy)}" rx="${f(R - k.plech - k.deska * 0.5)}" ry="${f((R - k.plech - k.deska * 0.5) * E)}" fill="none" stroke="#F8F4EE" stroke-width="${f(k.deska * 0.8)}" opacity="0.5"/>`);
  defs.push(`<clipPath id="${p}-ot"><ellipse cx="${f(ox)}" cy="${f(oy)}" rx="${f(ri)}" ry="${f(ri * E)}"/></clipPath>`);
  defs.push(svisly(`${p}-in`, U.stena, "#3E3436"));
  let dov = `<rect x="${f(cx - ri)}" y="${f(oy - ri * E)}" width="${f(2 * ri)}" height="${f(2 * ri * E)}" fill="url(#${p}-in)"/>`;
  for (const hg of k.drazky.slice(-2)) {
    const sid = `${p}-sp${hg.toFixed(0)}`;
    defs.push(`<path id="${sid}" d="${spirala(k, hg, 110, 250)}"/>`);
    dov += `<path d="${oblouk(k, 104, 256, hg, ri)}" stroke="#2E2426" stroke-width="${f(k.vyskaDrazky)}" fill="none" opacity="0.35"/>`;
    dov += `<use href="#${sid}" stroke="${U.spirala}" stroke-width="1.4" fill="none"/>`;
    dov += `<use href="#${sid}" stroke="${U.spiralaSvetlo}" stroke-width="0.6" fill="none" opacity="0.6" transform="translate(-0.4 -0.4)"/>`;
  }
  dov += `<path d="${oblouk(k, 104, 256, Hc - 1.5, ri)}" stroke="#FFFFFF" stroke-width="2" fill="none" opacity="0.35"/>`;
  s.push(`<g clip-path="url(#${p}-ot)">${dov}</g>`);

  /* ——— Teplo stoupá z otevřené pece ——— */
  defs.push(`<filter id="${p}-ml" x="-50%" y="-20%" width="200%" height="140%"><feGaussianBlur stdDeviation="3.2"/></filter>`);
  const pary: [number, number, number][] = [[-48, 0, 1], [-8, 26, 1.15], [34, 12, 0.95], [64, 40, 0.8]];
  for (const [dx, zp, sk] of pary) {
    const x0 = ox + dx;
    const y0 = oy - 4 + zp * 0.1;
    const vyska = 190 * sk;
    const d = `M${f(x0)} ${f(y0)} C${f(x0 - 16)} ${f(y0 - vyska * 0.2)} ${f(x0 + 20)} ${f(y0 - vyska * 0.36)} ${f(x0 + 4)} ${f(y0 - vyska * 0.55)} S${f(x0 - 18)} ${f(y0 - vyska * 0.82)} ${f(x0 + 6)} ${f(y0 - vyska)}`;
    s.push(
      `<g class="${p}-para" filter="url(#${p}-ml)">` +
        `<path d="${d}" stroke="#FFF6EE" stroke-width="${f(16 * sk)}" fill="none" stroke-linecap="round" opacity="0.26"/>` +
        `<path d="${d}" stroke="#FFFFFF" stroke-width="${f(4.5 * sk)}" fill="none" stroke-linecap="round" opacity="0.42"/>` +
        `</g>`,
    );
  }

  /* ——— Regulátor a kabely ——— */
  const rsk = 0.5;
  const rx = cx + R + 16;
  const ry = k.y0 - Hc * 0.56 - 52 * rsk;
  s.push(`<rect x="${f(cx + R - 1)}" y="${f(ry + 22 * rsk)}" width="${f(rx - cx - R + 3)}" height="6" rx="1.5" fill="${B.ocelDetail}"/>`);
  s.push(kabel(`M${f(rx + 11)} ${f(ry + 104 * rsk)} C${f(rx + 10)} ${f(ry + 110)} ${f(sv.vstup[0] + 16)} ${f(sv.vstup[1] + 30)} ${f(sv.vstup[0])} ${f(sv.vstup[1])}`, B, 0.6));
  s.push(kabel(`M${f(rx + 64)} ${f(ry + 104 * rsk)} C${f(rx + 70)} ${f(yZem - 30)} ${f(rx + 64)} ${f(yZem + 2)} ${f(1200)} ${f(yZem + 10)}`, B, 0.6));
  s.push(regulator(`${p}-rg`, rx, ry, rsk, "58", B, false));

  /* ——— Paprsek z okna ——— */
  defs.push(`<filter id="${p}-rz" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9"/></filter>`);
  const zS = STUL;
  const [yb, yf] = [yStolu(zS.z0), yStolu(zS.z1)];
  defs.push(primka(`${p}-pa`, [190, 110], [430, yf], [[0, "#FFE6C8", 0.62], [0.5, "#FFD4B4", 0.32], [1, "#FFC6A6", 0.12]]));
  s.push(
    `<g class="${p}-paprsek"><path d="M${sx0 + 6} ${sy0 + 24} L${sx1 - 4} ${sy0 + 6} L664 ${f(yb)} L630 ${f(yf)} L92 ${f(yf)} L${sx0 + 2} ${sy1 - 16} Z" fill="url(#${p}-pa)" filter="url(#${p}-rz)"/></g>`,
  );

  /* ——— Stůl před pecí ——— */
  const nohy = [zS.x0 + 26, zS.x1 - 26];
  /* Stín pod stolem a zadní nohy */
  s.push(`<path d="M${zS.x0 + 30} ${f(yPodlahy(zS.z0) + 2)} H${zS.x1 + 40} L${zS.x1 + 70} ${f(yPodlahy(zS.z1) + 4)} H${zS.x0 + 40} Z" fill="${B.stin}" opacity="0.16" filter="url(#${p}-ml)"/>`);
  for (const nx of nohy) s.push(`<rect x="${f(nx - 8)}" y="${f(yb)}" width="16" height="${f(yPodlahy(zS.z0 + 18) - yb)}" fill="#4A4246"/>`);
  defs.push(primka(`${p}-st`, [zS.x0, yb], [zS.x1, yf], [[0, "#E2C39A"], [0.5, "#D2AE80"], [1, "#BE966A"]]));
  const deskaStolu = `M${zS.x0} ${f(yb)} H${zS.x1} V${f(yf)} H${zS.x0} Z`;
  defs.push(`<clipPath id="${p}-sd"><path d="${deskaStolu}"/></clipPath>`);
  s.push(`<path d="${deskaStolu}" fill="url(#${p}-st)"/>`);
  let leta = "";
  for (const [yy, o] of [[0.22, 0.25], [0.48, 0.18], [0.7, 0.22]] as [number, number][]) {
    const y = mix(yb, yf, yy);
    leta += `<path d="M${zS.x0} ${f(y)} C${zS.x0 + 200} ${f(y - 2)} ${zS.x0 + 420} ${f(y + 3)} ${zS.x1} ${f(y)}" stroke="#A47A50" stroke-width="1.2" fill="none" opacity="${o}"/>`;
  }
  s.push(leta);
  /* Světlo z okna na desce */
  s.push(`<g clip-path="url(#${p}-sd)"><path d="M126 ${f(yb + 4)} L664 ${f(yb + 4)} L628 ${f(yf - 3)} L96 ${f(yf - 3)} Z" fill="#FFDCC0" opacity="0.72" filter="url(#${p}-rz)" class="${p}-paprsek"/></g>`);
  s.push(`<path d="M${zS.x0} ${f(yb)} H${zS.x1}" stroke="#F4DFC4" stroke-width="1.2" opacity="0.6"/>`);
  defs.push(svisly(`${p}-sh`, "#A57B52", "#7A5636"));
  s.push(`<rect x="${zS.x0}" y="${f(yf)}" width="${zS.x1 - zS.x0}" height="${zS.tl}" fill="url(#${p}-sh)"/>`);
  s.push(`<path d="M${zS.x0} ${f(yf + 0.8)} H${zS.x1}" stroke="#F0D2AC" stroke-width="1.6" opacity="0.8"/>`);
  for (const nx of nohy) {
    const hn = yPodlahy(zS.z1 - 16) - yf - zS.tl;
    s.push(`<rect x="${f(nx - 9)}" y="${f(yf + zS.tl)}" width="18" height="${f(hn)}" fill="#3A3438"/>`);
    s.push(`<rect x="${f(nx - 9)}" y="${f(yf + zS.tl)}" width="5" height="${f(hn)}" fill="#7A6E72"/>`);
    s.push(`<rect x="${f(nx - 9)}" y="${f(yf + zS.tl)}" width="18" height="8" fill="#1E1A1C" opacity="0.35"/>`);
  }

  /* ——— Kusy na stole: jeden vedle druhého, každý v jiné glazuře ——— */
  const rada: { tvar: Tvar; glazura: string; vyska: number }[] = [
    { tvar: "hrnek", glazura: "celadon", vyska: 99 },
    { tvar: "miska", glazura: "tenmoku", vyska: 52 },
    { tvar: "yunomi", glazura: "shino", vyska: 98 },
    { tvar: "vaza", glazura: "matná bílá", vyska: 140 },
    { tvar: "miska", glazura: "popelová šedá", vyska: 49 },
    { tvar: "hrnek", glazura: "železitá hnědá", vyska: 98 },
  ];
  const kusy: string[] = [];
  const kus = (id: string, tvar: Tvar, glazura: string, vyska: number, x: number, z: number) => {
    const H = vyska * SMRST.hotovy;
    const y = yStolu(z) + OBRYSY[tvar](0) * H * E;
    const { g, d } = obrysKusu(tvar, x, y, H);
    let o = "";
    /* Dlouhý měkký stín doprava */
    const sw = g.rMax;
    o += `<ellipse cx="${f(x + sw * 0.5 + H * 0.36)}" cy="${f(y - g.ry0 * 0.4 + 2)}" rx="${f(sw * 0.8 + H * 0.42)}" ry="${f(sw * E * 0.9 + 3)}" fill="url(#${p}-ds)" transform="rotate(4 ${f(x)} ${f(y)})"/>`;
    o += nadoba({ id, tvar, stav: "hotovy", glazura, x, y, vyska });
    /* Ranní světlo zleva na glazuře: teplý lem a lesk */
    const matna = jeMatna(glazura);
    defs.push(`<clipPath id="${id}-r"><path d="${d}"/></clipPath>`);
    defs.push(vodorovny(`${id}-rl`, x - sw, x + sw * 0.2, [[0, "#FFCDAE", matna ? 0.6 : 0.72], [0.38, "#FFCDAE", 0.24], [1, "#FFCDAE", 0]]));
    o += `<g clip-path="url(#${id}-r)"><rect x="${f(x - sw - 2)}" y="${f(g.yTop - g.ry - 2)}" width="${f(sw * 1.2)}" height="${f(H + g.ry + g.ry0 + 6)}" fill="url(#${id}-rl)"/></g>`;
    if (!matna) {
      const tt = tvar === "miska" ? 0.6 : 0.7;
      const lx = x - g.r(tt) * H * 0.62;
      const ly = g.zaklad - tt * H;
      o += `<g class="${p}-lesk"><ellipse cx="${f(lx)}" cy="${f(ly)}" rx="${f(Math.max(1.6, sw * 0.06))}" ry="${f(H * (tvar === "miska" ? 0.12 : 0.1))}" fill="#FFF6EE" opacity="0.9"/><circle cx="${f(lx)}" cy="${f(ly - H * 0.05)}" r="${f(Math.max(3, sw * 0.12))}" fill="#FFE6D2" opacity="0.35"/></g>`;
      o += `<path d="M${f(x - g.rx * 0.82)} ${f(g.yTop - g.ry * 0.3)} Q${f(x - g.rx * 0.5)} ${f(g.yTop - g.ry * 0.95)} ${f(x - g.rx * 0.05)} ${f(g.yTop - g.ry * 1)}" stroke="#FFE2CC" stroke-width="${f(Math.max(1.2, g.rx * 0.05))}" fill="none" stroke-linecap="round" opacity="0.75"/>`;
    }
    return { svg: o, g, y };
  };
  defs.push(`<radialGradient id="${p}-ds"><stop offset="0" stop-color="#4A3446" stop-opacity="0.3"/><stop offset="0.6" stop-color="#4A3446" stop-opacity="0.12"/><stop offset="1" stop-color="#4A3446" stop-opacity="0"/></radialGradient>`);
  let xd = 252;
  rada.forEach((r, i) => {
    const H = r.vyska * SMRST.hotovy;
    const g = geometrie(r.tvar, 0, 0, H);
    const levo = Math.max(g.rMax, g.rx);
    const pravo = levo + (r.tvar === "hrnek" ? H * 0.36 : 0);
    const x = xd + levo;
    kusy.push(kus(`${p}-k${i}`, r.tvar, r.glazura, r.vyska, x, RADA_Z + (i % 2 ? 10 : -4)).svg);
    xd = x + pravo + 14;
  });

  /* Miska slepená zlatem — kousek stranou, pod oknem */
  {
    const vyska = 46;
    const H = vyska * SMRST.hotovy;
    const kk = kus(`${p}-ki`, "miska", "matná bílá", vyska, KINTSUGI.x, KINTSUGI.z);
    let o = kk.svg;
    const g = kk.g;
    const naMisce = (t: number, uhel: number): Bod => {
      const rr = g.r(t) * H;
      return [KINTSUGI.x + rr * Math.sin(uhel * RAD), g.zaklad - t * H + rr * E * Math.cos(uhel * RAD)];
    };
    /* Prasklina jde lomeně jako opravdová: od okraje dolů, v půli se rozdvojí */
    const kmen: Bod[] = [naMisce(1, -16), naMisce(0.9, -12), naMisce(0.8, -15.5), naMisce(0.7, -9.5), naMisce(0.6, -11)];
    const vetevA: Bod[] = [naMisce(0.6, -11), naMisce(0.48, -17), naMisce(0.37, -13.5), naMisce(0.25, -19), naMisce(0.14, -16)];
    const vetevB: Bod[] = [naMisce(0.6, -11), naMisce(0.56, 0), naMisce(0.6, 10), naMisce(0.54, 23), naMisce(0.58, 35), naMisce(0.52, 47)];
    const lom = (b: Bod[]) => `M${b.map(xy).join(" L")}`;
    const zlato = [kmen, vetevA, vetevB].map(lom).join(" ");
    const tah = `fill="none" stroke-linecap="round" stroke-linejoin="round"`;
    o += `<path d="${zlato}" stroke="#7A520F" stroke-width="3.1" ${tah} opacity="0.32"/>`;
    o += `<path d="${zlato}" stroke="#C8922C" stroke-width="2.2" ${tah}/>`;
    o += `<path d="${zlato}" stroke="#ECC862" stroke-width="1.25" ${tah}/>`;
    o += `<path d="${[kmen, vetevA.slice(0, 3)].map(lom).join(" ")}" stroke="#FFF6D2" stroke-width="0.6" ${tah} opacity="0.95" transform="translate(-0.5 -0.4)"/>`;
    /* Spára přechází přes okraj */
    const [kx, ky] = naMisce(1, -16);
    o += `<ellipse cx="${f(kx)}" cy="${f(ky - 0.6)}" rx="1.7" ry="1.2" fill="#E2B64C"/>`;
    const [lx, ly] = naMisce(0.7, -9.5);
    o += `<g class="${p}-lesk"><circle cx="${f(lx - 0.5)}" cy="${f(ly)}" r="4.6" fill="#FFF0C0" opacity="0.45"/><circle cx="${f(lx - 0.5)}" cy="${f(ly)}" r="1.4" fill="#FFFFFF"/></g>`;
    kusy.unshift(o);
  }
  s.push(kusy.join(""));

  return `<svg viewBox="0 0 1200 700" aria-hidden="true"><defs>${defs.join("")}</defs>${s.join("")}</svg>`;
}
