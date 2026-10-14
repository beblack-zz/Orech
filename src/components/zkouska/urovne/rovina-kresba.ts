/**
 * Sušárna — kresba úrovně 五 Rovina (komnata U mistra, /zkouska).
 *
 * Kout sušárny: vlevo boční stěna s oknem (za ním se střídá den a noc
 * a padá jím sluneční skvrna, která přes den přejede po zadní stěně
 * a po polici), nahoře kalendář na týden, uprostřed velký regál o dvou
 * patrech a na něm pět čerstvých kusů — talíř, miska a hrnek nahoře,
 * kachel a mísa dole. Nad každým kusem malá vodováha: bublina utíká
 * doprava, když kraj schne rychleji než střed. Vlevo dole dohlíží Kachlík
 * (skutečná kresba přes Postavicka v Rovina.astro).
 *
 * Čisté funkce bez DOM: kreslí se tu jednou při buildu (scena, kresba)
 * a za běhu znovu (teloKusu při zkroucení a obrácení, zaves v průvanu,
 * barvy hlíny podle vlhkosti) — scripts/zkouska/urovne/rovina.ts.
 *
 * Souřadnice: viewBox 800 × 560. Kus se kreslí kolem středu své
 * základny; kruh o poloměru r je při pohledu shora elipsa r × r·Q.
 */
import { DRUHY } from "../../../scripts/zkouska/urovne/rovina-model";
import type { KusId } from "../../../scripts/zkouska/urovne/rovina-model";

export const SIRKA = 800;
export const VYSKA = 560;
const Q = 0.3;

type Bod = [number, number];
const f1 = (n: number) => (Math.round(n * 10) / 10).toString();
const pct = (n: number, z: number) => `${((n / z) * 100).toFixed(3)}%`;

/* ——— Barvy ——— */

const hex = (h: string) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
export const smichej = (a: string, b: string, t: number) => {
  const A = hex(a);
  const B = hex(b);
  return `#${A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
};

/** Tři tóny hlíny: světlo, střed, stín — mokrá a suchá */
const MOKRA = { l: "#C9A184", m: "#9C7860", d: "#4E3729" };
const SUCHA = { l: "#F4EADA", m: "#DCCBB4", d: "#A48D75" };

/**
 * Barva hlíny podle vlhkosti m (1 mokrá … 0 suchá) a tónu t (−1 stín … 0 … 1 světlo).
 * Vlhkost jde přes hladký schod: uprostřed sušení, kde se kraj a střed
 * rozcházejí, je rozdíl barev větší, než by byl po přímce.
 */
export function hlina(m: number, t: number): string {
  const x = Math.min(1, Math.max(0, m));
  const v = x * x * (3 - 2 * x);
  const stred = smichej(SUCHA.m, MOKRA.m, v);
  const kraj = t < 0 ? smichej(SUCHA.d, MOKRA.d, v) : smichej(SUCHA.l, MOKRA.l, v);
  return smichej(stred, kraj, Math.min(1, Math.abs(t)));
}

type Cast = "a" | "b";
/** Vlhkosti kusu: a = kraj (rychlá část), b = střed (pomalá) */
export interface Vlhkost {
  a: number;
  b: number;
}
const vl = (v: Vlhkost, c: Cast) => (c === "a" ? v.a : v.b);

/* Prvky, které skript přebarvuje podle vlhkosti, nesou „část tón“:
   data-barva u zastávek přechodu, data-vypln a data-tah u tvarů */
const zast = (o: number, c: Cast, t: number, v: Vlhkost) => `<stop offset="${o}" stop-color="${hlina(vl(v, c), t)}" data-barva="${c} ${t}"/>`;
const vypln = (c: Cast, t: number, v: Vlhkost) => `fill="${hlina(vl(v, c), t)}" data-vypln="${c} ${t}"`;
const tah = (c: Cast, t: number, v: Vlhkost) => `stroke="${hlina(vl(v, c), t)}" data-tah="${c} ${t}"`;

/* ——— Křivky ——— */

/** Otevřená hladká křivka (Catmull-Rom jako Bézier), začíná M */
function cara(b: Bod[]): string {
  let d = `M${f1(b[0][0])} ${f1(b[0][1])}`;
  for (let i = 0; i < b.length - 1; i++) {
    const p0 = b[i - 1] ?? b[i];
    const p1 = b[i];
    const p2 = b[i + 1];
    const p3 = b[i + 2] ?? p2;
    d += ` C${f1(p1[0] + (p2[0] - p0[0]) / 6)} ${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)} ${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])} ${f1(p2[1])}`;
  }
  return d;
}
/** Pokračování křivky bez M (napojí se na předchozí bod) */
const dal = (b: Bod[]) => cara(b).replace(/^M[^C]*/, "");

/** Uzavřená hladká smyčka */
function smycka(b: Bod[]): string {
  const n = b.length;
  let d = `M${f1(b[0][0])} ${f1(b[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = b[(i - 1 + n) % n];
    const p1 = b[i];
    const p2 = b[(i + 1) % n];
    const p3 = b[(i + 2) % n];
    d += ` C${f1(p1[0] + (p2[0] - p0[0]) / 6)} ${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)} ${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])} ${f1(p2[1])}`;
  }
  return d + " Z";
}

type Zdvih = (th: number) => number;
const nic: Zdvih = () => 0;
/** Body elipsy od úhlu `od` do `po` (θ = π/2 je vpředu); zdvih kraje zvedá body nahoru */
function oblouk(cy: number, rx: number, z: Zdvih, n: number, od: number, po: number): Bod[] {
  const b: Bod[] = [];
  for (let i = 0; i <= n; i++) {
    const th = od + ((po - od) * i) / n;
    b.push([rx * Math.cos(th), cy + rx * Q * Math.sin(th) - z(th)]);
  }
  return b;
}
/** Celá elipsa jako uzavřená smyčka */
const elipsa = (cy: number, rx: number, z: Zdvih, n = 32) => smycka(oblouk(cy, rx, z, n, 0, 2 * Math.PI).slice(0, n));

/* ——— Rozmístění ——— */

export interface Misto {
  id: KusId;
  cislo: number;
  /** Střed základny kusu na polici */
  x: number;
  y: number;
  /** Plocha tlačítka kusu: x0, y0, x1, y1 */
  box: [number, number, number, number];
  /** Střed vodováhy */
  vodovaha: Bod;
  /** Střed kulatého tlačítka „obrátit“ (jen talíř, kachel, mísa) */
  obrat?: Bod;
  /** Kde je kus „uprostřed“ — podle toho se pozná, jestli stojí ve slunci */
  stred: Bod;
  /** Šířka prkénka pod kusem */
  prkno: number;
  /** Cedulka na hraně police */
  cedulka: Bod;
}

/** Horní police: plocha 214–262, hrana 262–276. Dolní: plocha 414–462, hrana 462–476. */
const HORNI = 240;
const DOLNI = 440;
export const POLICE = { x0: 246, x1: 790, horni: HORNI, dolni: DOLNI };

export const MISTA: Misto[] = [
  { id: "talir", cislo: 1, x: 344, y: HORNI, box: [262, 100, 422, 262], vodovaha: [352, 114], obrat: [430, 254], stred: [344, 232], prkno: 168, cedulka: [344, 270] },
  { id: "miska", cislo: 2, x: 520, y: HORNI, box: [440, 100, 602, 262], vodovaha: [520, 114], stred: [520, 205], prkno: 128, cedulka: [520, 270] },
  { id: "hrnek", cislo: 3, x: 682, y: HORNI, box: [610, 100, 774, 262], vodovaha: [690, 114], stred: [690, 196], prkno: 118, cedulka: [690, 270] },
  { id: "kachel", cislo: 4, x: 400, y: DOLNI, box: [262, 300, 486, 462], vodovaha: [404, 330], obrat: [496, 454], stred: [400, 430], prkno: 166, cedulka: [400, 470] },
  { id: "misa", cislo: 5, x: 636, y: DOLNI, box: [514, 300, 774, 462], vodovaha: [636, 330], obrat: [768, 454], stred: [636, 424], prkno: 236, cedulka: [636, 470] },
];

/* ——— Čas a světlo ——— */

/** Týden začíná v pondělí v 8:00 a končí v neděli v 18:00 */
export const START_HODINA = 8;
export const KONEC_HODINA = 6 * 24 + 18;
export const DNY = ["Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota", "Neděle"];
export const DNY_KRATCE = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];

const hladce = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};

/** Jak moc je tma: 0 ve dne, 1 v noci */
export function tma(hodina: number) {
  const h = ((hodina % 24) + 24) % 24;
  if (h >= 7 && h <= 17) return 0;
  if (h > 17 && h < 20.5) return hladce((h - 17) / 3.5);
  if (h >= 4 && h < 7) return 1 - hladce((h - 4) / 3);
  return 1;
}

export interface Skvrna {
  /** Levý okraj skvrny a horní roh na něm */
  x: number;
  y: number;
  /** Jak klesá horní a dolní hrana doprava */
  sklon: number;
  /** 0–1: ráno a večer slábne */
  sila: number;
}
export const SKVRNA_SIRKA = 250;
export const SKVRNA_VYSKA = 330;

/** Sluneční skvrna z okna na zadní stěně: ráno vpravo, večer vlevo */
export function skvrna(hodina: number): Skvrna {
  const h = ((hodina % 24) + 24) % 24;
  const p = (h - 6) / 12;
  const sila = h < 6 || h > 18 ? 0 : hladce((h - 6.2) / 1) * (1 - hladce((h - 16.8) / 1));
  const v = Math.sin(Math.PI * Math.min(1, Math.max(0, p)));
  return { x: 800 - p * 680, y: 36 + 74 * v, sklon: 0.32 + 0.3 * v, sila };
}

/** Stojí bod (x, y) ve slunci? */
export function veSlunci(s: Skvrna, x: number, y: number) {
  if (s.sila < 0.5) return false;
  const dx = x - s.x;
  if (dx < 0 || dx > SKVRNA_SIRKA) return false;
  const horni = s.y + s.sklon * dx;
  return y >= horni && y <= horni + SKVRNA_VYSKA;
}

/** Obloha za oknem podle hodiny: [nahoře, u obzoru] */
const NEBE: [number, string, string][] = [
  [0, "#121834", "#262C58"],
  [4.5, "#1C2248", "#3E3A68"],
  [6, "#4A5C9A", "#E7A48A"],
  [7.5, "#78A6D8", "#F4D2B0"],
  [10, "#7DB0E0", "#D6EAF3"],
  [15, "#76A8DA", "#DCEBF2"],
  [17, "#6E8CC6", "#F3C496"],
  [18.5, "#4B4F8C", "#E0907A"],
  [20.5, "#1A2042", "#3A3866"],
  [24, "#121834", "#262C58"],
];
export function barvyNebe(hodina: number): [string, string] {
  const h = ((hodina % 24) + 24) % 24;
  let i = 0;
  while (i < NEBE.length - 2 && h > NEBE[i + 1][0]) i++;
  const [h0, a0, b0] = NEBE[i];
  const [h1, a1, b1] = NEBE[i + 1];
  const t = (h - h0) / (h1 - h0);
  return [smichej(a0, a1, t), smichej(b0, b1, t)];
}

/* Okno v boční stěně (v perspektivě): bližší hrana x = 22, vzdálenější x = 122 */
const OKNO: Bod[] = [
  [22, 56],
  [122, 92],
  [122, 300],
  [22, 311],
];
/** Bod v okně: u ∈ 0–1 zleva doprava, v ∈ 0–1 shora dolů */
function vOkne(u: number, v: number): Bod {
  const [a, b, c, d] = OKNO;
  const x = a[0] + (b[0] - a[0]) * u;
  const yh = a[1] + (b[1] - a[1]) * u;
  const yd = d[1] + (c[1] - d[1]) * u;
  return [x, yh + (yd - yh) * v];
}
const quad = (b: Bod[]) => `M${b.map((p) => `${f1(p[0])} ${f1(p[1])}`).join(" L")} Z`;
/** Výřez okna: u0–u1 × v0–v1 */
const vyrez = (u0: number, u1: number, v0: number, v1: number) => quad([vOkne(u0, v0), vOkne(u1, v0), vOkne(u1, v1), vOkne(u0, v1)]);

/** Slunce a měsíc v okně podle hodiny */
export function nebeskaTelesa(hodina: number) {
  const h = ((hodina % 24) + 24) % 24;
  const p = (h - 6) / 12;
  const slunce = vOkne(0.18 + 0.64 * p, 0.86 - 0.62 * Math.sin(Math.PI * Math.min(1, Math.max(0, p))));
  const pn = (((h - 18 + 24) % 24) / 12);
  const mesic = vOkne(0.25 + 0.5 * pn, 0.72 - 0.5 * Math.sin(Math.PI * Math.min(1, Math.max(0, pn))));
  return { slunce, mesic, sDen: h > 5.6 && h < 18.4, sNoc: h > 18.6 || h < 5.4 };
}

/** Záclona: `sila` 0–1 je průvan, `faze` vlnění v radiánech */
export function zaves(sila: number, faze: number) {
  const n = 9;
  const vrch: Bod = [48, 66];
  const okraj: Bod[] = [];
  for (let i = 0; i <= n; i++) {
    const s = i / n;
    const klid = 6 * Math.sin(s * 2.4 + 0.6) * (0.4 + 0.6 * s);
    const vitr = sila * (66 * Math.pow(s, 1.4) + 10 * Math.sin(faze + s * 5.2) * s);
    okraj.push([vrch[0] + klid + vitr, vrch[1] + s * 262 - sila * 22 * s * s]);
  }
  const dole = okraj[n];
  const plachta =
    `M4 44 L${f1(vrch[0])} ${f1(vrch[1])}` +
    dal(okraj) +
    ` Q${f1((dole[0] + 4) / 2)} ${f1(dole[1] + 8 + sila * 6)} 4 ${f1(330 - sila * 4)} Z`;
  /* Záhyby jdou od garnýže k lemu a průvan je ohne stejně jako okraj */
  const zahyby = [0.28, 0.55, 0.8]
    .map((k) => {
      const b: Bod[] = [];
      for (let i = 1; i <= n; i++) {
        const s = i / n;
        const x0 = 4 + (vrch[0] - 4) * k;
        b.push([x0 + (okraj[i][0] - vrch[0]) * k * 0.9, 48 + (vrch[1] - 48) * k + s * 262 * (0.94 + 0.06 * k) - sila * 18 * s * s * k]);
      }
      return cara(b);
    })
    .join(" ");
  const lem = `M4 ${f1(318 - sila * 4)} Q${f1((dole[0] + 4) / 2)} ${f1(dole[1] - 4 + sila * 6)} ${f1(dole[0])} ${f1(dole[1] - 12)}`;
  return { plachta, zahyby, lem };
}

/* ——— Kusy ——— */

export interface StavKresby extends Vlhkost {
  /** Zkroucení 0–1 */
  w: number;
  otoceny: boolean;
  prasklo: boolean;
}

interface Plocha {
  R: number;
  /** Výška okraje nad prkénkem */
  H: number;
  /** Šířka rovného okraje (praporu) */
  prapor: number;
  /** Poloměr dna studny a o kolik je níž */
  rs: number;
  hl: number;
  /** Poloměr patky */
  rp: number;
  /** O kolik se při zkroucení zvednou kraje */
  z: number;
  /** Výška kopule dna, když je kus obrácený */
  kopule: number;
}
const TALIR: Plocha = { R: 68, H: 12, prapor: 18, rs: 42, hl: 3, rp: 40, z: 18, kopule: 10 };
const MISA: Plocha = { R: 100, H: 24, prapor: 12, rs: 64, hl: 8, rp: 58, z: 22, kopule: 18 };

/** Prasklina: lomená čára, nejdřív tenká vlasová, při prasknutí celá */
function prasklina(b: Bod[], w: number, prasklo: boolean, id: string) {
  if (!prasklo && w < 0.55) return "";
  const k = prasklo ? b.length : Math.max(2, Math.ceil(((w - 0.55) / 0.45) * (b.length - 1)) + 1);
  const cast = b.slice(0, Math.min(b.length, k));
  const d = `M${cast.map((p) => `${f1(p[0])} ${f1(p[1])}`).join(" L")}`;
  if (!prasklo) return `<path class="mr5-vlas" d="${d}" stroke="#3B2A1B" stroke-width="0.9" fill="none" stroke-linejoin="round" opacity="${f1(0.3 + (w - 0.55))}"/>`;
  return (
    `<g class="mr5-prasklina" data-pro="${id}">` +
    `<path d="${d}" stroke="#FFF6E8" stroke-width="3.2" fill="none" stroke-linejoin="round" opacity="0.5" transform="translate(0.8 0.8)"/>` +
    `<path d="${d}" stroke="#2E1F16" stroke-width="2" fill="none" stroke-linejoin="round" stroke-linecap="round"/>` +
    `</g>`
  );
}

function plochyKus(id: KusId, p: Plocha, s: StavKresby): string {
  const { R, H, rp, z } = p;
  const L: Zdvih = (th) => s.w * z * Math.cos(th) ** 2;
  const Lv: Zdvih = (th) => 0.45 * L(th);
  const v: Vlhkost = s;
  const o: string[] = [];
  if (!s.otoceny) {
    /* Bok: mezi předním obloukem okraje a patkou */
    const predni = oblouk(-H, R, L, 18, 0, Math.PI);
    const patka = oblouk(0, rp, nic, 12, 0, Math.PI);
    const bok =
      `M${f1(R)} ${f1(-H - L(0))}` +
      ` C${f1(R + 1)} ${f1(-H * 0.35)} ${f1(rp + (R - rp) * 0.35)} ${f1(-1)} ${f1(rp)} 0` +
      dal(patka) +
      ` C${f1(-rp - (R - rp) * 0.35)} ${f1(-1)} ${f1(-R - 1)} ${f1(-H * 0.35)} ${f1(-R)} ${f1(-H - L(Math.PI))}` +
      dal([...predni].reverse()) +
      " Z";
    o.push(`<path d="${bok}" fill="url(#mr5-${id}-bok)"/>`);
    o.push(`<path d="${bok}" fill="url(#mr5-stin-plochy)"/>`);
    /* Líc: celý okraj, uvnitř přechod od kraje ke středu */
    o.push(`<path d="${elipsa(-H, R, L, 36)}" fill="url(#mr5-${id}-lic)"/>`);
    if (id === "misa") {
      const rv = R - p.prapor;
      o.push(`<path d="${elipsa(-H + 1, rv, (th) => 0.75 * L(th), 32)}" fill="url(#mr5-${id}-stena)"/>`);
      o.push(`<path d="${elipsa(-H + p.hl, p.rs, Lv, 28)}" fill="url(#mr5-${id}-dno)"/>`);
      o.push(`<path d="${cara(oblouk(-H + 1, rv, (th) => 0.75 * L(th), 14, Math.PI * 1.05, Math.PI * 1.95))}" ${tah("a", 0.55, v)} stroke-width="1.6" fill="none" opacity="0.7"/>`);
    } else {
      o.push(`<path d="${elipsa(-H + 1.6, p.rs, Lv, 28)}" fill="none" ${tah("a", -0.55, v)} stroke-width="1.3" opacity="0.38"/>`);
      o.push(`<path d="${cara(oblouk(-H + 2.8, p.rs, Lv, 12, Math.PI * 0.15, Math.PI * 0.85))}" fill="none" ${tah("b", 0.6, v)} stroke-width="1.2" opacity="0.45"/>`);
    }
    /* Přední hrana okraje chytá světlo, mokrá hlína se leskne vzadu vlevo */
    o.push(`<path d="${cara(oblouk(-H, R, L, 14, Math.PI * 0.12, Math.PI * 0.88))}" fill="none" ${tah("a", 0.7, v)} stroke-width="1.6" opacity="0.8"/>`);
    o.push(`<path class="mr5-lesk" d="${cara(oblouk(-H, R - 5, L, 10, Math.PI * 1.08, Math.PI * 1.42))}" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" opacity="${f1(0.12 + 0.4 * Math.max(v.a, v.b))}"/>`);
    o.push(prasklina(id === "misa"
      ? [[58, -2], [44, -8], [38, -17], [24, -21], [16, -30], [2, -33], [-6, -42]]
      : [[30, 6], [24, 0], [22, -7], [12, -10], [8, -16], [-2, -18]], s.w, s.prasklo, id));
  } else {
    /* Rubem nahoru: okraj leží na prkénku, nahoře je patka */
    const y0 = -3;
    const yf = y0 - p.kopule;
    const predni = oblouk(y0, R, L, 18, 0, Math.PI);
    const hrana = `M${f1(R)} ${f1(y0 - L(0))}` + dal(predni) + ` L${f1(-R)} ${f1(-L(Math.PI))}` + dal(oblouk(0, R, L, 18, Math.PI, 0)) + " Z";
    o.push(`<path d="${hrana}" ${vypln("a", -0.55, v)}/>`);
    o.push(`<path d="${elipsa(y0, R, L, 36)}" fill="url(#mr5-${id}-rub)"/>`);
    o.push(`<path d="${elipsa(y0, R, L, 36)}" fill="url(#mr5-stin-kopule)"/>`);
    const pp = oblouk(yf, rp, nic, 12, 0, Math.PI);
    const prstenec = `M${f1(rp)} ${f1(yf - 5)} L${f1(rp)} ${f1(yf)}` + dal(pp) + ` L${f1(-rp)} ${f1(yf - 5)}` + dal(oblouk(yf - 5, rp, nic, 12, Math.PI, 0)) + " Z";
    o.push(`<path d="${prstenec}" ${vypln("b", -0.45, v)}/>`);
    o.push(`<path d="${elipsa(yf - 5, rp, nic, 28)}" ${vypln("b", 0.35, v)}/>`);
    o.push(`<path d="${elipsa(yf - 3.5, rp - 6, nic, 24)}" ${vypln("b", -0.12, v)}/>`);
    o.push(`<path d="${cara(oblouk(yf - 5, rp, nic, 10, Math.PI * 1.1, Math.PI * 1.6))}" fill="none" stroke="#FFFFFF" stroke-width="1.4" opacity="0.4"/>`);
    /* Značka dílny vtlačená do dna */
    o.push(`<circle cx="0" cy="${f1(yf - 3.5)}" r="${p.R > 80 ? 7 : 5}" fill="none" ${tah("b", -0.6, v)} stroke-width="1.2" opacity="0.5"/>`);
    o.push(`<path d="M-2 ${f1(yf - 5.5)} V${f1(yf - 1.5)} M2 ${f1(yf - 5.5)} V${f1(yf - 1.5)}" ${tah("b", -0.6, v)} stroke-width="1" opacity="0.5"/>`);
    o.push(`<path class="mr5-lesk" d="${cara(oblouk(y0, R - 8, L, 10, Math.PI * 1.1, Math.PI * 1.45))}" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" opacity="${f1(0.1 + 0.35 * Math.max(v.a, v.b))}"/>`);
    o.push(prasklina(id === "misa"
      ? [[70, 8], [52, 0], [44, -8], [30, -12], [20, -20], [6, -22]]
      : [[44, 6], [34, 2], [26, -4], [18, -6], [10, -12]], s.w, s.prasklo, id));
  }
  return o.join("");
}

function kachel(s: StavKresby): string {
  const T = 10;
  const xf = 66;
  const xb = 58;
  const yfd = 20;
  const ybd = -20;
  const L = (x: number) => s.w * 16 * (x / xf) ** 2;
  const v: Vlhkost = s;
  const n = 8;
  const predniH: Bod[] = [];
  const predniD: Bod[] = [];
  const zadniH: Bod[] = [];
  for (let i = 0; i <= n; i++) {
    const x = -xf + (2 * xf * i) / n;
    predniH.push([x, yfd - T - L(x)]);
    predniD.push([x, yfd - L(x)]);
    const xz = xb - (2 * xb * i) / n;
    zadniH.push([xz, ybd - T - L((xz * xf) / xb)]);
  }
  const lic = cara(predniH) + ` L${f1(zadniH[0][0])} ${f1(zadniH[0][1])}` + dal(zadniH) + " Z";
  const cel = cara(predniH) + ` L${f1(xf)} ${f1(yfd - L(xf))}` + dal([...predniD].reverse()) + " Z";
  const Lk = L(xf);
  const bok = `M${f1(xf)} ${f1(yfd - T - Lk)} L${f1(xb)} ${f1(ybd - T - Lk)} L${f1(xb)} ${f1(ybd - Lk)} L${f1(xf)} ${f1(yfd - Lk)} Z`;
  const o: string[] = [];
  o.push(`<path d="${bok}" ${vypln("a", -0.7, v)}/>`);
  o.push(`<path d="${cel}" fill="url(#mr5-kachel-bok)"/>`);
  o.push(`<path d="${lic}" fill="url(#mr5-kachel-lic)"/>`);
  o.push(`<path d="${lic}" fill="url(#mr5-stin-lic)"/>`);
  /* Líc má vnitřní rámeček jako Kachlík, rub rýhy pro maltu */
  if (!s.otoceny) {
    const r: Bod[] = [];
    const k = 0.84;
    for (let i = 0; i <= n; i++) {
      const x = (-xf + (2 * xf * i) / n) * k;
      r.push([x, yfd - T - 6 - L(x)]);
    }
    const rz: Bod[] = [];
    for (let i = 0; i <= n; i++) {
      const x = (xb - (2 * xb * i) / n) * k;
      rz.push([x, ybd - T + 5 - L((x * xf) / xb)]);
    }
    const ram = cara(r) + ` L${f1(rz[0][0])} ${f1(rz[0][1])}` + dal(rz) + " Z";
    o.push(`<path d="${ram}" fill="none" ${tah("a", -0.6, v)} stroke-width="1.4" opacity="0.4"/>`);
    o.push(`<path d="${cara(r)}" fill="none" ${tah("b", 0.6, v)} stroke-width="1" opacity="0.5" transform="translate(0 1.2)"/>`);
  } else {
    for (const u of [-0.62, -0.21, 0.21, 0.62]) {
      const x1 = u * xf * 0.92;
      const x2 = u * xb * 0.92;
      const d = `M${f1(x1)} ${f1(yfd - T - 3 - L(x1))} L${f1(x2)} ${f1(ybd - T + 3 - L((x2 * xf) / xb))}`;
      o.push(`<path d="${d}" fill="none" ${tah("b", -0.65, v)} stroke-width="3.4" stroke-linecap="round" opacity="0.5"/>`);
      o.push(`<path d="${d}" fill="none" ${tah("b", 0.6, v)} stroke-width="1" stroke-linecap="round" opacity="0.55" transform="translate(1.6 0.4)"/>`);
    }
  }
  o.push(`<path d="${cara(predniH)}" fill="none" ${tah("a", 0.7, v)} stroke-width="1.4" opacity="0.75"/>`);
  o.push(`<path class="mr5-lesk" d="M${f1(-xb + 8)} ${f1(ybd - T + 3 - L(-xf + 8))} L${f1(-xb + 40)} ${f1(ybd - T + 3 - L(-xf + 40) * 0.5)}" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" opacity="${f1(0.1 + 0.4 * Math.max(v.a, v.b))}"/>`);
  o.push(prasklina([[66, 0], [54, -2], [46, -9], [38, -11], [30, -18], [20, -20], [12, -27]], s.w, s.prasklo, "kachel"));
  return o.join("");
}

function miska(s: StavKresby): string {
  const R = 52;
  const yR = -60;
  const F = 24;
  const hf = 5;
  const L: Zdvih = (th) => s.w * 9 * Math.cos(2 * th);
  const v: Vlhkost = s;
  const pravyKraj: Bod = [R, yR - L(0)];
  const levyKraj: Bod = [-R, yR - L(Math.PI)];
  const telo =
    `M${f1(pravyKraj[0])} ${f1(pravyKraj[1])}` +
    ` C${f1(R + 1)} ${f1(yR + 30)} ${f1(F + 16)} ${f1(-hf - 3)} ${f1(F)} ${f1(-hf)}` +
    ` L${f1(F)} 0` +
    dal(oblouk(0, F, nic, 10, 0, Math.PI)) +
    ` L${f1(-F)} ${f1(-hf)}` +
    ` C${f1(-F - 16)} ${f1(-hf - 3)} ${f1(-R - 1)} ${f1(yR + 30)} ${f1(levyKraj[0])} ${f1(levyKraj[1])}` +
    dal(oblouk(yR, R, L, 18, Math.PI, 0)) +
    " Z";
  const o: string[] = [];
  o.push(`<path d="${telo}" fill="url(#mr5-miska-telo)"/>`);
  o.push(`<path d="${telo}" fill="url(#mr5-stin-valec)"/>`);
  /* Rýhy po točení */
  for (const [y, r] of [[-22, 40], [-38, 48]] as const) {
    o.push(`<path d="M${-r} ${y} Q0 ${f1(y + r * 0.5)} ${r} ${y}" fill="none" ${tah("b", -0.7, v)} stroke-width="1" opacity="0.2"/>`);
  }
  /* Patka */
  o.push(`<path d="${cara(oblouk(-hf, F, nic, 8, 0.1, Math.PI - 0.1))}" fill="none" ${tah("b", -0.6, v)} stroke-width="1" opacity="0.4"/>`);
  /* Vnitřek */
  o.push(`<path d="${elipsa(yR, R, L, 36)}" fill="url(#mr5-miska-uvnitr)"/>`);
  o.push(`<path d="${cara(oblouk(yR + 2.5, R - 3, L, 14, Math.PI * 0.08, Math.PI * 0.92))}" fill="none" stroke="#2B1D14" stroke-width="5" stroke-linecap="round" opacity="0.16"/>`);
  o.push(`<path d="${elipsa(yR, R, L, 36)}" fill="none" ${tah("a", 0.5, v)} stroke-width="2.4"/>`);
  o.push(`<path class="mr5-lesk" d="${cara(oblouk(yR, R - 4, L, 10, Math.PI * 1.12, Math.PI * 1.45))}" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" opacity="${f1(0.12 + 0.4 * Math.max(v.a, v.b))}"/>`);
  o.push(`<path class="mr5-lesk" d="M${-R + 10} ${yR + 20} C${-R + 8} ${yR + 38} ${-R + 20} ${yR + 52} ${-F - 6} ${-hf - 6}" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity="${f1(0.08 + 0.28 * Math.max(v.a, v.b))}"/>`);
  o.push(prasklina([[20, -48 - L(Math.PI * 0.38)], [22, -40], [16, -33], [19, -24], [13, -16], [15, -9]], s.w, s.prasklo, "miska"));
  return o.join("");
}

function hrnek(s: StavKresby): string {
  const rT = 35;
  const yT = -86;
  const rB = 33;
  const yB = -8;
  const L: Zdvih = (th) => s.w * 6 * Math.cos(2 * th);
  const v: Vlhkost = s;
  const telo =
    `M${f1(-rT)} ${f1(yT - L(Math.PI))} L${f1(-rB)} ${f1(yB)}` +
    dal(oblouk(yB, rB, nic, 12, Math.PI, 0)) +
    ` L${f1(rT)} ${f1(yT - L(0))}` +
    dal(oblouk(yT, rT, L, 16, 0, Math.PI)) +
    " Z";
  /* Ucho: za horní spoj se při kroucení objeví vlasová prasklina, při prasknutí se odlomí */
  const uchoD = `M${rT - 2} -70 C${rT + 30} -76 ${rT + 36} -30 ${rB - 1} -24`;
  const o: string[] = [];
  const naklon = s.w * -4;
  o.push(`<g transform="skewX(${f1(naklon)})">`);
  o.push(`<path d="${telo}" fill="url(#mr5-hrnek-telo)"/>`);
  o.push(`<path d="${telo}" fill="url(#mr5-stin-valec)"/>`);
  for (const y of [-28, -46, -64]) {
    const r = rB + ((rT - rB) * (y - yB)) / (yT - yB);
    o.push(`<path d="M${f1(-r)} ${y} Q0 ${f1(y + r * 0.42)} ${f1(r)} ${y}" fill="none" ${tah("b", -0.7, v)} stroke-width="1" opacity="0.18"/>`);
  }
  o.push(`<path d="${elipsa(yT, rT, L, 32)}" fill="url(#mr5-hrnek-uvnitr)"/>`);
  o.push(`<path d="${cara(oblouk(yT + 2, rT - 3, L, 12, Math.PI * 0.1, Math.PI * 0.9))}" fill="none" stroke="#2B1D14" stroke-width="4" stroke-linecap="round" opacity="0.18"/>`);
  o.push(`<path d="${elipsa(yT, rT, L, 32)}" fill="none" ${tah("a", 0.5, v)} stroke-width="2.4"/>`);
  o.push(`<path class="mr5-lesk" d="M${-rT + 9} ${yT + 14} L${-rB + 9} ${yB - 10}" fill="none" stroke="#FFFFFF" stroke-width="3.2" stroke-linecap="round" opacity="${f1(0.08 + 0.3 * Math.max(v.a, v.b))}"/>`);
  const odlom = s.prasklo ? ` transform="rotate(9 ${rB - 1} -24) translate(3 1)"` : "";
  o.push(`<g${odlom}>`);
  o.push(`<path d="${uchoD}" fill="none" ${tah("a", -0.75, v)} stroke-width="12.5" stroke-linecap="round"/>`);
  o.push(`<path d="${uchoD}" fill="none" stroke="url(#mr5-hrnek-ucho)" stroke-width="10" stroke-linecap="round"/>`);
  o.push(`<path d="${uchoD}" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" opacity="0.25" transform="translate(1.4 -1.6)"/>`);
  o.push(`</g>`);
  if (s.w > 0.25 && !s.prasklo) {
    const k = Math.min(1, (s.w - 0.25) / 0.6);
    o.push(`<path class="mr5-vlas" d="M${rT - 1} -77 l2.6 3.4 l-1.8 2.6 l3 3.2" fill="none" stroke="#2E1F16" stroke-width="${f1(0.8 + 0.6 * k)}" stroke-linejoin="round" opacity="${f1(0.35 + 0.6 * k)}"/>`);
  }
  if (s.prasklo) {
    o.push(`<path d="M${rT - 3} -78 l4 5 l-3 3 l5 5" fill="none" stroke="#2E1F16" stroke-width="2.4" stroke-linejoin="round"/>`);
  }
  o.push(prasklina([[-6, yT + 10], [-9, -68], [-4, -58], [-8, -47], [-3, -36], [-6, -26]], s.w, s.prasklo, "hrnek"));
  o.push(`</g>`);
  return o.join("");
}

/** Vnitřek skupiny .mr5-telo kusu: tvar podle zkroucení, strany a prasknutí */
export function teloKusu(id: KusId, s: StavKresby): string {
  if (id === "talir") return plochyKus(id, TALIR, s);
  if (id === "misa") return plochyKus(id, MISA, s);
  if (id === "kachel") return kachel(s);
  if (id === "miska") return miska(s);
  return hrnek(s);
}

/** Stín pod kusem — zkroucený kus se o prkénko opírá míň */
export function stinKusu(id: KusId, w: number): string {
  const rozmery: Record<KusId, [number, number, number]> = {
    talir: [62, 13, 4],
    misa: [94, 19, 6],
    kachel: [70, 22, 2],
    miska: [34, 9, 3],
    hrnek: [40, 11, 1],
  };
  const [rx, ry, dy] = rozmery[id];
  const k = id === "miska" || id === "hrnek" ? 1 : 1 - 0.28 * w;
  return `<ellipse cx="3" cy="${dy}" rx="${f1(rx * k)}" ry="${f1(ry)}" fill="#2B2420" opacity="0.22"/>`;
}

/** Přechody hlíny jednoho kusu — skript jim mění barvy podle vlhkosti */
function barvyKusu(id: KusId, v: Vlhkost): string {
  const z = (o: number, c: Cast, t: number) => zast(o, c, t, v);
  const g: string[] = [];
  const bok = (gid: string, c: Cast) =>
    `<linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="0">${z(0, c, -0.75)}${z(0.22, c, -0.1)}${z(0.38, c, 0.35)}${z(0.62, c, -0.05)}${z(1, c, -0.85)}</linearGradient>`;
  if (id === "talir" || id === "misa") {
    g.push(bok(`mr5-${id}-bok`, "a"));
    const vnitrek = id === "misa" ? 0.82 : 0.6;
    g.push(
      `<radialGradient id="mr5-${id}-lic" cx="0.5" cy="0.5" r="0.5">${z(0, "b", 0.2)}${z(vnitrek - 0.12, "b", 0)}${z(vnitrek, "a", 0.3)}${z(0.9, "a", 0.15)}${z(1, "a", -0.2)}</radialGradient>`,
      `<radialGradient id="mr5-${id}-rub" cx="0.5" cy="0.42" r="0.55">${z(0, "b", 0.25)}${z(0.45, "b", 0)}${z(0.78, "a", 0.05)}${z(1, "a", -0.35)}</radialGradient>`,
    );
    if (id === "misa") {
      g.push(
        `<linearGradient id="mr5-misa-stena" x1="0" y1="0" x2="0" y2="1">${z(0, "a", -0.55)}${z(0.45, "b", -0.35)}${z(1, "b", 0)}</linearGradient>`,
        `<radialGradient id="mr5-misa-dno" cx="0.45" cy="0.4" r="0.6">${z(0, "b", 0.2)}${z(1, "b", -0.15)}</radialGradient>`,
      );
    }
  } else if (id === "kachel") {
    g.push(bok("mr5-kachel-bok", "a"));
    g.push(`<radialGradient id="mr5-kachel-lic" cx="0.5" cy="0.5" r="0.62">${z(0, "b", 0.15)}${z(0.48, "b", 0)}${z(0.78, "a", 0.15)}${z(1, "a", -0.1)}</radialGradient>`);
  } else {
    g.push(
      `<linearGradient id="mr5-${id}-telo" x1="0" y1="0" x2="0" y2="1">${z(0, "a", 0.15)}${z(id === "miska" ? 0.24 : 0.16, "a", 0)}${z(id === "miska" ? 0.5 : 0.34, "b", 0)}${z(1, "b", -0.2)}</linearGradient>`,
      `<radialGradient id="mr5-${id}-uvnitr" cx="0.5" cy="0.62" r="0.72">${z(0, "b", -0.75)}${z(0.55, "b", -0.45)}${z(0.82, "a", -0.15)}${z(1, "a", 0.25)}</radialGradient>`,
    );
    if (id === "hrnek") {
      g.push(`<linearGradient id="mr5-hrnek-ucho" gradientUnits="userSpaceOnUse" x1="30" y1="0" x2="72" y2="0">${z(0, "a", -0.4)}${z(0.45, "a", 0.05)}${z(0.75, "a", 0.4)}${z(1, "a", -0.3)}</linearGradient>`);
    }
  }
  return `<defs>${g.join("")}</defs>`;
}

/** Fólie přes kus: obrys zvonu a jeho lem na prkénku */
const FOLIE: Record<KusId, { x0: number; x1: number; vrch: number; dole: number; bok: number }> = {
  talir: { x0: -82, x1: 82, vrch: -44, dole: 18, bok: 0.5 },
  misa: { x0: -116, x1: 116, vrch: -70, dole: 24, bok: 0.5 },
  kachel: { x0: -80, x1: 80, vrch: -54, dole: 26, bok: 0.5 },
  miska: { x0: -66, x1: 66, vrch: -94, dole: 14, bok: 0.36 },
  hrnek: { x0: -48, x1: 80, vrch: -112, dole: 9, bok: 0.32 },
};

export function folie(id: KusId): string {
  const f = FOLIE[id];
  const sir = f.x1 - f.x0;
  const cx = (f.x0 + f.x1) / 2;
  const v = f.vrch;
  const ramena = v + (f.dole - v) * f.bok;
  /* Zvon: rovné boky dolů, oblé ramena, lem v drobných vlnkách */
  const vlnky: string[] = [];
  const n = Math.max(4, Math.round(sir / 26));
  for (let i = n - 1; i >= 0; i--) {
    const x = f.x0 + (sir * i) / n;
    const xm = x + sir / n / 2;
    vlnky.push(`Q${f1(xm)} ${f1(f.dole + (i % 2 ? 4 : -2))} ${f1(x)} ${f1(f.dole)}`);
  }
  const obrys =
    `M${f1(f.x0)} ${f1(f.dole)}` +
    ` C${f1(f.x0 - 2)} ${f1(ramena)} ${f1(f.x0 + sir * 0.08)} ${f1(v)} ${f1(cx - sir * 0.18)} ${f1(v)}` +
    ` L${f1(cx + sir * 0.18)} ${f1(v)}` +
    ` C${f1(f.x1 - sir * 0.08)} ${f1(v)} ${f1(f.x1 + 2)} ${f1(ramena)} ${f1(f.x1)} ${f1(f.dole)}` +
    ` ${vlnky.join(" ")} Z`;
  const zahyby = [0.22, 0.47, 0.71]
    .map((k, i) => {
      const x = f.x0 + sir * k;
      const y0 = v + (i === 1 ? 1 : 6);
      return `M${f1(x)} ${f1(y0)} C${f1(x + 5)} ${f1(y0 + (f.dole - y0) * 0.35)} ${f1(x - 6)} ${f1(y0 + (f.dole - y0) * 0.65)} ${f1(x + 2)} ${f1(f.dole - 1)}`;
    })
    .join(" ");
  const lesk1 = `M${f1(f.x0 + sir * 0.1)} ${f1(ramena + 8)} C${f1(f.x0 + sir * 0.1)} ${f1(v + 10)} ${f1(f.x0 + sir * 0.18)} ${f1(v + 4)} ${f1(cx - sir * 0.12)} ${f1(v + 3)}`;
  const lesk2 = `M${f1(f.x0 + sir * 0.18)} ${f1(ramena + 14)} C${f1(f.x0 + sir * 0.18)} ${f1(ramena)} ${f1(f.x0 + sir * 0.22)} ${f1(v + 14)} ${f1(f.x0 + sir * 0.3)} ${f1(v + 10)}`;
  return (
    `<g class="mr5-folie-tvar">` +
    `<path class="mr5-folie-plachta" d="${obrys}" fill="#E4F0F3" fill-opacity="0.34" stroke="#FFFFFF" stroke-opacity="0.85" stroke-width="1.5" stroke-linejoin="round"/>` +
    `<path d="${zahyby}" fill="none" stroke="#9DB4BD" stroke-width="1.1" opacity="0.5"/>` +
    `<path d="${lesk1}" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity="0.85"/>` +
    `<path d="${lesk2}" fill="none" stroke="#FFFFFF" stroke-width="1.4" stroke-linecap="round" opacity="0.7"/>` +
    `<path d="M${f1(f.x1 - sir * 0.16)} ${f1(v + 6)} q${f1(sir * 0.08)} 2 ${f1(sir * 0.1)} 12" fill="none" stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round" opacity="0.55"/>` +
    `</g>`
  );
}

/** Vodováha nad kusem; bublina se posouvá skriptem (transform skupiny .mr5-bublina-g) */
function vodovaha(m: Misto): string {
  const [x, y] = m.vodovaha;
  return (
    `<g class="mr5-vodovaha" data-kus="${m.id}" data-stav="ok" transform="translate(${x} ${y}) scale(1.25)">` +
    `<g class="mr5-vv-slunce" opacity="0"><circle cx="-60" cy="0" r="5.2" fill="#FFD25A"/>` +
    `<path d="M-60 -11 V-8 M-60 8 V11 M-71 0 H-68 M-52 0 H-49 M-67.8 -7.8 L-65.7 -5.7 M-54.3 5.7 L-52.2 7.8 M-67.8 7.8 L-65.7 5.7 M-54.3 -5.7 L-52.2 -7.8" stroke="#F0A830" stroke-width="2" stroke-linecap="round"/></g>` +
    `<g class="mr5-vv-telo">` +
    `<rect x="-46" y="-11" width="92" height="22" rx="5" fill="#E8B440"/>` +
    `<rect x="-46" y="1" width="92" height="10" rx="5" fill="#C9962E"/>` +
    `<rect x="-46" y="-1" width="92" height="4" fill="#D9A538"/>` +
    `<path d="M-42 -8.6 H42" stroke="#FFF0BE" stroke-width="1.4" stroke-linecap="round" opacity="0.75"/>` +
    `<circle cx="-38" cy="0" r="2.6" fill="#B07E22"/><circle cx="38" cy="0" r="2.6" fill="#B07E22"/>` +
    `<path d="M-39.4 -1.4 L-36.6 1.4 M36.6 -1.4 L39.4 1.4" stroke="#E8B440" stroke-width="0.9"/>` +
    `<rect x="-28" y="-7.4" width="56" height="14.8" rx="7.4" fill="#2E3A2C"/>` +
    `<rect class="mr5-tekutina" x="-25.6" y="-5" width="51.2" height="10" rx="5" fill="#BCE07A"/>` +
    `<path d="M-23 -3.4 H23" stroke="#FFFFFF" stroke-width="1.2" stroke-linecap="round" opacity="0.35"/>` +
    `<path d="M-9 -5 V5" stroke="#2E3A2C" stroke-width="1.5"/>` +
    `<path class="mr5-ryska" d="M9 -5 V5" stroke="#2E3A2C" stroke-width="1.5"/>` +
    `<g class="mr5-bublina-g"><ellipse rx="6.4" ry="3.7" fill="#F6FFE6"/><ellipse cx="-1.8" cy="-1.3" rx="2.6" ry="1.1" fill="#FFFFFF"/></g>` +
    `<path class="mr5-vv-strep" d="M-14 -5 L-8 0 L-12 3 L-4 5 M6 -5 L3 -1 L8 2" stroke="#FFFFFF" stroke-width="1.1" fill="none" opacity="0"/>` +
    `</g>` +
    `</g>`
  );
}

/** Razítko 正 — čtvercová pečeť jako Kachlíkova, znak z rovných tahů */
const razitkoTahy = (s: number) =>
  `<rect x="${-s / 2}" y="${-s / 2}" width="${s}" height="${s}" rx="${f1(s * 0.12)}" fill="#C4432B"/>` +
  `<path d="M${f1(-s * 0.32)} ${f1(-s * 0.3)} H${f1(s * 0.32)} M0 ${f1(-s * 0.3)} V${f1(s * 0.3)} M0 ${f1(-s * 0.02)} H${f1(s * 0.24)} M${f1(-s * 0.2)} ${f1(s * 0.02)} V${f1(s * 0.3)} M${f1(-s * 0.36)} ${f1(s * 0.3)} H${f1(s * 0.36)}" stroke="#FFF4E4" stroke-width="${f1(s * 0.09)}" stroke-linecap="square" fill="none"/>`;

function cedulka(m: Misto): string {
  const [x, y] = m.cedulka;
  const naklon = m.cislo % 2 ? -2 : 1.6;
  const nazev = DRUHY.find((d) => d.id === m.id)!.nazev;
  return (
    `<g class="mr5-cedulka" data-kus="${m.id}" transform="translate(${x} ${y}) rotate(${naklon})">` +
    `<rect x="-36" y="-11" width="72" height="22" rx="2" fill="#FBF7EC" stroke="#C9B48A" stroke-width="0.8"/>` +
    `<circle cx="-30" cy="-4" r="1.6" fill="#8A7C70"/>` +
    `<text x="3" y="5.5" text-anchor="middle" class="mr5-ruka" font-size="17" fill="#3A2E28">${m.cislo} · ${nazev}</text>` +
    `<g class="mr5-razitko" opacity="0" transform="translate(40 -4) rotate(-10)"><g class="mr5-razitko-obr">${razitkoTahy(17)}</g></g>` +
    `<g class="mr5-mokre" opacity="0" transform="translate(-43 -2)"><g class="mr5-mokre-obr"><path d="M0 -9 C4 -3 6 0 6 3 A6 6 0 0 1 -6 3 C-6 0 -4 -3 0 -9 Z" fill="#6F9CC4" stroke="#3E6A92" stroke-width="1"/><path d="M-2.5 2 A2.6 2.6 0 0 0 0 5" stroke="#FFFFFF" stroke-width="1.2" fill="none"/></g></g>` +
    `</g>`
  );
}

/** Prkénko, na kterém kus schne */
function prkenko(m: Misto): string {
  const sir = m.prkno;
  const x0 = m.x - sir / 2;
  const hl = m.y >= DOLNI ? 46 : 40;
  const vz = m.y - hl * 0.55;
  const pr = m.y + hl * 0.45;
  return (
    `<path d="M${f1(x0 + 6)} ${f1(vz)} H${f1(x0 + sir - 6)} L${f1(x0 + sir)} ${f1(pr)} H${f1(x0)} Z" fill="url(#mr5-prkenko)"/>` +
    `<rect x="${f1(x0)}" y="${f1(pr)}" width="${sir}" height="5" fill="#B8956A"/>` +
    `<path d="M${f1(x0 + 1)} ${f1(pr + 0.6)} H${f1(x0 + sir - 1)}" stroke="#F0DDB8" stroke-width="1" opacity="0.8"/>`
  );
}

function kusSkupina(m: Misto, v: Vlhkost): string {
  const s: StavKresby = { ...v, w: 0, otoceny: false, prasklo: false };
  return (
    `<g class="mr5-kus" data-kus="${m.id}" transform="translate(${m.x} ${m.y})">` +
    barvyKusu(m.id, v) +
    `<g class="mr5-stin">${stinKusu(m.id, 0)}</g>` +
    `<g class="mr5-telo">${teloKusu(m.id, s)}</g>` +
    `<g class="mr5-folie" opacity="0">${folie(m.id)}</g>` +
    `</g>`
  );
}

/* ——— Pozadí ——— */

function defs(): string {
  return (
    `<defs>` +
    `<linearGradient id="mr5-zed" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F3EBDC"/><stop offset="1" stop-color="#E0D2BA"/></linearGradient>` +
    `<linearGradient id="mr5-roh" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6E5A44" stop-opacity="0.22"/><stop offset="1" stop-color="#6E5A44" stop-opacity="0"/></linearGradient>` +
    `<linearGradient id="mr5-bocni" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#D9C9AC"/><stop offset="1" stop-color="#E6D8BF"/></linearGradient>` +
    `<linearGradient id="mr5-podlaha" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B99A74"/><stop offset="1" stop-color="#CDB18A"/></linearGradient>` +
    `<linearGradient id="mr5-nebe" x1="0" y1="0" x2="0" y2="1"><stop class="mr5-nebe-1" offset="0" stop-color="#78A6D8"/><stop class="mr5-nebe-2" offset="1" stop-color="#F4D2B0"/></linearGradient>` +
    `<radialGradient id="mr5-slunce-zar" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#FFF8DC"/><stop offset="0.35" stop-color="#FFE4A0" stop-opacity="0.85"/><stop offset="1" stop-color="#FFD080" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="mr5-sklo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.32"/><stop offset="0.5" stop-color="#FFFFFF" stop-opacity="0.04"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0.2"/></linearGradient>` +
    `<linearGradient id="mr5-drevo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B98A5A"/><stop offset="1" stop-color="#8E6440"/></linearGradient>` +
    `<linearGradient id="mr5-deska" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C79B6C"/><stop offset="1" stop-color="#D9B184"/></linearGradient>` +
    `<linearGradient id="mr5-hrana-police" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A9784A"/><stop offset="0.5" stop-color="#93653E"/><stop offset="1" stop-color="#7A5233"/></linearGradient>` +
    `<linearGradient id="mr5-sloupek" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8E6440"/><stop offset="0.35" stop-color="#B98A5A"/><stop offset="1" stop-color="#7A5233"/></linearGradient>` +
    `<linearGradient id="mr5-prkenko" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D2B48A"/><stop offset="1" stop-color="#E4CCA4"/></linearGradient>` +
    `<linearGradient id="mr5-stin-valec" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1E140E" stop-opacity="0.38"/><stop offset="0.22" stop-color="#1E140E" stop-opacity="0.04"/><stop offset="0.36" stop-color="#FFFFFF" stop-opacity="0.16"/><stop offset="0.55" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="1" stop-color="#1E140E" stop-opacity="0.45"/></linearGradient>` +
    `<linearGradient id="mr5-stin-plochy" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1E140E" stop-opacity="0"/><stop offset="1" stop-color="#1E140E" stop-opacity="0.3"/></linearGradient>` +
    `<linearGradient id="mr5-stin-kopule" x1="0" y1="0" x2="1" y2="0.4"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.16"/><stop offset="0.5" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="1" stop-color="#1E140E" stop-opacity="0.24"/></linearGradient>` +
    `<linearGradient id="mr5-stin-lic" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.12"/><stop offset="0.6" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="1" stop-color="#1E140E" stop-opacity="0.16"/></linearGradient>` +
    `<radialGradient id="mr5-lampa-zar" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#FFE6A8" stop-opacity="0.75"/><stop offset="0.4" stop-color="#FFD58A" stop-opacity="0.3"/><stop offset="1" stop-color="#FFC870" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="mr5-zaves" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#E9DFCB"/><stop offset="0.6" stop-color="#F7F1E4"/><stop offset="1" stop-color="#EDE3CF"/></linearGradient>` +
    `<linearGradient id="mr5-svetlo" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFEFC0" stop-opacity="0"/><stop offset="0.14" stop-color="#FFEFC0" stop-opacity="1"/><stop offset="0.86" stop-color="#FFF6D8" stop-opacity="1"/><stop offset="1" stop-color="#FFF6D8" stop-opacity="0"/></linearGradient>` +
    `<clipPath id="mr5-okno-orez"><path d="${quad(OKNO)}"/></clipPath>` +
    `</defs>`
  );
}

/** Zadní a boční stěna, podlaha */
function mistnost(): string {
  const o: string[] = [];
  o.push(`<rect width="800" height="560" fill="url(#mr5-zed)"/>`);
  /* Podlaha: prkna se sbíhají k úběžníku */
  o.push(`<path d="M150 500 H800 V560 H52 Z" fill="url(#mr5-podlaha)"/>`);
  const ub: Bod = [560, 250];
  const prkna: string[] = [];
  for (const x of [210, 290, 370, 450, 530, 610, 690, 770]) {
    const k = (560 - 500) / (500 - ub[1]);
    const x2 = x + (x - ub[0]) * k;
    prkna.push(`M${x} 500 L${f1(x2)} 560`);
  }
  o.push(`<path d="${prkna.join(" ")}" stroke="#A3845F" stroke-width="1.4" opacity="0.6"/>`);
  o.push(`<path d="M150 512 H800 M120 534 H800" stroke="#A3845F" stroke-width="1" opacity="0.25"/>`);
  /* Sokl */
  o.push(`<rect x="150" y="490" width="650" height="10" fill="#C2AD8C"/><path d="M150 490 H800" stroke="#D8C7A8" stroke-width="1.2"/>`);
  /* Roh: stín u boční stěny */
  o.push(`<rect x="150" y="0" width="70" height="500" fill="url(#mr5-roh)"/>`);
  /* Boční stěna s oknem */
  o.push(`<path d="M0 0 H150 V500 L52 560 H0 Z" fill="url(#mr5-bocni)"/>`);
  o.push(`<path d="M150 0 V500" stroke="#C8B596" stroke-width="1.5"/>`);
  o.push(`<path d="M150 490 L52 550 L52 560 L150 500 Z" fill="#BCA684"/>`);
  return o.join("");
}

/** Okno: venku obloha s krajinou, rám, sklo (křídlo se otevírá), parapet, záclona */
function okno(): string {
  const o: string[] = [];
  o.push(`<g clip-path="url(#mr5-okno-orez)">`);
  o.push(`<rect x="0" y="40" width="140" height="280" fill="url(#mr5-nebe)"/>`);
  o.push(`<g class="mr5-hvezdy" opacity="0">` +
    [[50, 110], [88, 140], [40, 170], [104, 118], [70, 96]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i % 2 ? 1.1 : 1.6}" fill="#FFF6D8"/>`).join("") + `</g>`);
  o.push(`<g class="mr5-slunce" transform="translate(70 200)"><circle r="30" fill="url(#mr5-slunce-zar)"/><circle r="10" fill="#FFF3C4"/></g>`);
  o.push(`<g class="mr5-mesic" transform="translate(60 160)" opacity="0"><circle r="9" fill="#F4EBD0"/><circle cx="4" cy="-2.5" r="8" fill="#262C58" opacity="0.9"/></g>`);
  /* Krajina: kopec, strom v podzimním listí, plot */
  o.push(`<path d="M0 262 C30 246 70 250 100 238 C114 233 128 236 140 232 V320 H0 Z" fill="#8FA27A"/>`);
  o.push(`<path d="M0 286 C40 274 90 280 140 266 V320 H0 Z" fill="#7A8E68"/>`);
  o.push(`<path d="M30 300 V246" stroke="#5E4632" stroke-width="5"/>`);
  o.push(`<circle cx="22" cy="232" r="18" fill="#D98A3A"/><circle cx="40" cy="222" r="16" fill="#E2A548"/><circle cx="30" cy="206" r="14" fill="#C9702E"/>`);
  o.push(`<circle cx="36" cy="214" r="5" fill="#F0C060" opacity="0.6"/>`);
  o.push(`<rect class="mr5-noc-venku" x="0" y="40" width="140" height="280" fill="#0E1430" opacity="0"/>`);
  o.push(`</g>`);
  /* Ostění */
  const [a, b, c, d] = OKNO;
  o.push(`<path d="M${a[0] - 8} ${a[1] - 6} L${b[0] + 4} ${b[1] - 3} L${b[0] + 4} ${c[1] + 3} L${d[0] - 8} ${d[1] + 6} Z M${quad(OKNO).slice(1)}" fill="#EFE5D2" fill-rule="evenodd"/>`);
  o.push(`<path d="M${b[0]} ${b[1]} L${b[0] + 4} ${b[1] - 3} L${b[0] + 4} ${c[1] + 3} L${c[0]} ${c[1]} Z" fill="#CDB997"/>`);
  /* Křídlo okna: rám, sklo a příčky — při průvanu se otočí ven (skript) */
  const sklo = (u0: number, u1: number, v0: number, v1: number) => `<path d="${vyrez(u0, u1, v0, v1)}" fill="url(#mr5-sklo)"/>`;
  o.push(`<g class="mr5-kridlo">`);
  o.push(sklo(0.06, 0.47, 0.05, 0.47), sklo(0.53, 0.94, 0.05, 0.47), sklo(0.06, 0.47, 0.53, 0.95), sklo(0.53, 0.94, 0.53, 0.95));
  o.push(`<path d="${quad(OKNO)} M${vyrez(0.06, 0.47, 0.05, 0.47).slice(1)} M${vyrez(0.53, 0.94, 0.05, 0.47).slice(1)} M${vyrez(0.06, 0.47, 0.53, 0.95).slice(1)} M${vyrez(0.53, 0.94, 0.53, 0.95).slice(1)}" fill="#F6F0E4" fill-rule="evenodd" stroke="#C9B48A" stroke-width="0.8"/>`);
  const odraz = (u: number, v: number, du: number, dv: number) => {
    const p1 = vOkne(u, v);
    const p2 = vOkne(u + du, v + dv);
    return `M${f1(p1[0])} ${f1(p1[1])} L${f1(p2[0])} ${f1(p2[1])}`;
  };
  o.push(`<path d="${odraz(0.12, 0.3, 0.16, -0.18)} ${odraz(0.14, 0.4, 0.22, -0.26)} ${odraz(0.6, 0.82, 0.2, -0.22)}" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" opacity="0.45"/>`);
  o.push(`<circle cx="${f1(vOkne(0.96, 0.5)[0] - 2)}" cy="${f1(vOkne(0.96, 0.5)[1])}" r="2.4" fill="#B08455"/>`);
  o.push(`</g>`);
  /* Parapet */
  o.push(`<path d="M${d[0] - 12} ${d[1] + 4} L${c[0] + 6} ${c[1] + 1} L${c[0] + 6} ${c[1] + 8} L${d[0] - 16} ${d[1] + 16} Z" fill="#D6C3A0"/>`);
  o.push(`<path d="M${d[0] - 16} ${d[1] + 16} L${c[0] + 6} ${c[1] + 8} L${c[0] + 6} ${c[1] + 12} L${d[0] - 16} ${d[1] + 21} Z" fill="#B49B76"/>`);
  /* Květináč s muškátem na parapetu — kus z dílny */
  o.push(`<path d="M86 300 L90 284 H108 L111 300 Z" fill="#B2643A"/><path d="M88 284 H110" stroke="#C97A4C" stroke-width="3" stroke-linecap="round"/>`);
  o.push(`<path d="M99 284 C98 274 92 270 88 266 M99 284 C101 272 106 268 112 266" stroke="#5E7A44" stroke-width="2" fill="none"/>`);
  o.push(`<circle cx="88" cy="264" r="5" fill="#D9473A"/><circle cx="112" cy="264" r="5" fill="#E05A44"/><circle cx="100" cy="258" r="5.5" fill="#C93A30"/>`);
  o.push(`<ellipse cx="94" cy="276" rx="5" ry="2.6" fill="#6E8C50" transform="rotate(-24 94 276)"/><ellipse cx="106" cy="275" rx="5" ry="2.6" fill="#6E8C50" transform="rotate(20 106 275)"/>`);
  /* Garnýž a záclona */
  o.push(`<path d="M0 42 L134 84" stroke="#6E5236" stroke-width="3.2" stroke-linecap="round"/><circle cx="134" cy="84" r="3.6" fill="#6E5236"/>`);
  const z = zaves(0, 0);
  o.push(`<g class="mr5-zaves">`);
  o.push(`<path class="mr5-zaves-plachta" d="${z.plachta}" fill="url(#mr5-zaves)" stroke="#D8CCB4" stroke-width="1"/>`);
  o.push(`<path class="mr5-zaves-zahyby" d="${z.zahyby}" fill="none" stroke="#D3C5AA" stroke-width="1.6" opacity="0.8"/>`);
  o.push(`<path class="mr5-zaves-lem" d="${z.lem}" fill="none" stroke="#3E5A8A" stroke-width="3" opacity="0.8"/>`);
  o.push(`</g>`);
  return o.join("");
}

/** Kalendář na týden: dny, dnešek v červeném kroužku, minulé dny přeškrtnuté */
export const KALENDAR = { x: 318, y: 12, bunka: 46 };
function kalendar(): string {
  const { x, y, bunka } = KALENDAR;
  const sir = bunka * 7 + 16;
  const o: string[] = [];
  o.push(`<g class="mr5-kalendar">`);
  o.push(`<rect x="${x + 3}" y="${y + 4}" width="${sir}" height="64" rx="3" fill="#6E5A44" opacity="0.14"/>`);
  o.push(`<rect x="${x}" y="${y}" width="${sir}" height="64" rx="3" fill="#FBF7EC"/>`);
  o.push(`<rect x="${x}" y="${y}" width="${sir}" height="17" rx="3" fill="#C4432B"/><rect x="${x}" y="${y + 12}" width="${sir}" height="5" fill="#C4432B"/>`);
  o.push(`<text x="${x + 10}" y="${y + 13}" class="mr5-ruka" font-size="14" fill="#FFF4E4">sušení · týden</text>`);
  o.push(`<circle cx="${x + sir / 2}" cy="${y - 2}" r="3" fill="#8A7C70"/>`);
  for (let i = 0; i < 7; i++) {
    const cx = x + 8 + bunka * i + bunka / 2;
    if (i) o.push(`<path d="M${x + 8 + bunka * i} ${y + 24} V${y + 58}" stroke="#E2D4B9" stroke-width="1"/>`);
    o.push(`<text x="${cx}" y="${y + 47}" text-anchor="middle" class="mr5-ruka" font-size="21" fill="${i >= 5 ? "#C4432B" : "#3A2E28"}">${DNY_KRATCE[i]}</text>`);
    o.push(`<path class="mr5-krizek" data-den="${i}" d="M${cx - 14} ${y + 28} L${cx + 13} ${y + 55} M${cx + 12} ${y + 27} L${cx - 13} ${y + 56}" stroke="#5C5047" stroke-width="1.6" stroke-linecap="round" fill="none" opacity="0"/>`);
  }
  o.push(`<g class="mr5-dnes" transform="translate(${x + 8 + bunka / 2} ${y + 41})"><path d="M-17 1 C-18 -11 -4 -16 6 -14 C16 -12 20 -3 17 6 C14 14 0 17 -10 13 C-16 10 -18 5 -16 0" stroke="#C4432B" stroke-width="2.2" fill="none" stroke-linecap="round"/></g>`);
  o.push(`</g>`);
  return o.join("");
}

/** Lampa v rohu nad Kachlíkem — v noci svítí */
export const LAMPA: Bod = [204, 150];
function lampa(): string {
  const [x, y] = LAMPA;
  return (
    `<g class="mr5-lampa">` +
    `<path d="M${x} 0 V${y - 22}" stroke="#3B2A1B" stroke-width="1.6"/>` +
    `<path d="M${x - 6} ${y - 22} H${x + 6} L${x + 7} ${y - 16} H${x - 7} Z" fill="#2C4C40"/>` +
    `<path d="M${x - 7} ${y - 16} H${x + 7} L${x + 24} ${y + 2} H${x - 24} Z" fill="#3E6A5A"/>` +
    `<path d="M${x - 24} ${y + 2} H${x + 24}" stroke="#E9E2D3" stroke-width="2.4" stroke-linecap="round"/>` +
    `<path d="M${x - 4} ${y - 14} L${x - 16} ${y}" stroke="#7FAE9A" stroke-width="2.2" stroke-linecap="round" opacity="0.6"/>` +
    `<circle class="mr5-zarovka" cx="${x}" cy="${y + 7}" r="6.5" fill="#EDE4D0"/>` +
    `</g>`
  );
}

/** Regál: sloupky, dvě police, nahoře role fólie a rozprašovač */
function regal(): string {
  const o: string[] = [];
  /* Stín regálu na zdi */
  o.push(`<path d="M262 92 H800 V500 H262 Z" fill="#5A4636" opacity="0.08"/>`);
  /* Zadní sloupky */
  o.push(`<rect x="262" y="96" width="10" height="404" fill="#7A5233"/><rect x="766" y="96" width="10" height="404" fill="#6E4A2E"/>`);
  for (const [y0, plocha, hrana] of [[POLICE.horni - 26, POLICE.horni + 22, POLICE.horni + 36], [POLICE.dolni - 26, POLICE.dolni + 22, POLICE.dolni + 36]]) {
    o.push(`<path d="M260 ${y0} H776 L790 ${plocha} H246 Z" fill="url(#mr5-deska)"/>`);
    o.push(`<path d="M268 ${y0 + 9} H770 M262 ${y0 + 27} H780" stroke="#B48A5C" stroke-width="1" opacity="0.5"/>`);
    o.push(`<rect x="246" y="${plocha}" width="544" height="${hrana - plocha}" fill="url(#mr5-hrana-police)"/>`);
    o.push(`<path d="M246 ${plocha + 0.8} H790" stroke="#E2BF8E" stroke-width="1.4" opacity="0.8"/>`);
    o.push(`<rect x="246" y="${hrana}" width="544" height="8" fill="#3B2A1B" opacity="0.12"/>`);
  }
  /* Horní deska */
  o.push(`<path d="M260 84 H776 L790 96 H246 Z" fill="#C59A6A"/><rect x="246" y="96" width="544" height="12" fill="url(#mr5-hrana-police)"/>`);
  o.push(`<path d="M246 96.8 H790" stroke="#E2BF8E" stroke-width="1.4" opacity="0.8"/>`);
  /* Přední sloupky */
  o.push(`<rect x="246" y="90" width="15" height="414" rx="2" fill="url(#mr5-sloupek)"/><rect x="775" y="90" width="15" height="414" rx="2" fill="url(#mr5-sloupek)"/>`);
  o.push(`<ellipse cx="253.5" cy="504" rx="10" ry="3" fill="#3B2A1B" opacity="0.25"/><ellipse cx="782.5" cy="504" rx="10" ry="3" fill="#3B2A1B" opacity="0.25"/>`);
  /* Role fólie a rozprašovač na horní desce */
  o.push(`<g>`);
  o.push(`<rect x="666" y="66" width="84" height="22" rx="11" fill="#DDEBEF" opacity="0.92"/>`);
  o.push(`<rect x="666" y="66" width="84" height="22" rx="11" fill="none" stroke="#FFFFFF" stroke-width="1.2" opacity="0.9"/>`);
  o.push(`<path d="M672 72 H744" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" opacity="0.8"/><path d="M676 82 H740" stroke="#A9C0C8" stroke-width="1" opacity="0.6"/>`);
  o.push(`<ellipse cx="750" cy="77" rx="5" ry="11" fill="#C9DCE2"/><ellipse cx="750" cy="77" rx="2.4" ry="5.2" fill="#8A7056"/>`);
  o.push(`<path d="M748 86 C744 92 736 92 724 90" stroke="#E4F0F3" stroke-width="5" fill="none" opacity="0.85"/>`);
  o.push(`<path d="M270 88 V62 Q270 54 278 54 H284 Q292 54 292 62 V88 Z" fill="#7FA8C4"/><rect x="273" y="43" width="14" height="11" rx="2" fill="#E9E2D3"/><path d="M287 46 H298 L296 51 H287" fill="#E9E2D3"/><path d="M274 66 V83" stroke="#FFFFFF" stroke-width="2" opacity="0.5" stroke-linecap="round"/>`);
  o.push(`</g>`);
  return o.join("");
}

/** Vlhkoměr na zdi u rohu: ručička jde podle vzduchu v sušárně (skript) */
export const VLHKOMER: Bod = [200, 296];
function vlhkomer(): string {
  const [x, y] = VLHKOMER;
  const ryska = (i: number) => {
    const u = ((-120 + i * 20) * Math.PI) / 180;
    const r1 = i % 3 === 0 ? 13.5 : 15.5;
    return `M${f1(Math.sin(u) * r1)} ${f1(-Math.cos(u) * r1)} L${f1(Math.sin(u) * 18)} ${f1(-Math.cos(u) * 18)}`;
  };
  const oblouk = (od: number, po: number) => {
    const a = (od * Math.PI) / 180;
    const b = (po * Math.PI) / 180;
    return `M${f1(Math.sin(a) * 16.5)} ${f1(-Math.cos(a) * 16.5)} A16.5 16.5 0 0 1 ${f1(Math.sin(b) * 16.5)} ${f1(-Math.cos(b) * 16.5)}`;
  };
  return (
    `<g class="mr5-vlhkomer" transform="translate(${x} ${y})">` +
    `<circle cx="2" cy="3" r="25" fill="#5A4636" opacity="0.14"/>` +
    `<circle r="25" fill="#C9A050"/><circle r="25" fill="none" stroke="#8A6A2A" stroke-width="1.4"/>` +
    `<path d="M-17 -17 A24 24 0 0 1 17 -17" stroke="#F3D58A" stroke-width="2" fill="none" opacity="0.8"/>` +
    `<circle r="20.5" fill="#FBF7EC"/>` +
    `<path d="${oblouk(-120, -40)}" stroke="#E2B060" stroke-width="3" fill="none"/>` +
    `<path d="${oblouk(-40, 40)}" stroke="#A9C77E" stroke-width="3" fill="none"/>` +
    `<path d="${oblouk(40, 120)}" stroke="#7FA8C4" stroke-width="3" fill="none"/>` +
    `<path d="${Array.from({ length: 13 }, (_, i) => ryska(i)).join(" ")}" stroke="#5C5047" stroke-width="0.9"/>` +
    `<path d="M0 6 C2 9 3 10.5 3 12 A3 3 0 0 1 -3 12 C-3 10.5 -2 9 0 6 Z" fill="#7FA8C4"/>` +
    `<g class="mr5-rucicka" transform="rotate(20)"><path d="M0 3 L-1.4 0 L0 -16 L1.4 0 Z" fill="#C4432B"/></g>` +
    `<circle r="2.6" fill="#3B2A1B"/>` +
    `</g>`
  );
}

/** Ručník tenugui přehozený přes kraj dolní police a drát na řezání hlíny na sloupku */
function drobnosti(): string {
  const yp = POLICE.dolni + 22;
  return (
    `<g class="mr5-tenugui">` +
    `<path d="M262 ${yp - 18} L304 ${yp - 18} L306 ${yp} L264 ${yp} Z" fill="#2F4C8E"/>` +
    `<path d="M264 ${yp} L306 ${yp} C307 ${yp + 18} 305 ${yp + 34} 308 ${yp + 46} Q296 ${yp + 50} 286 ${yp + 46} Q275 ${yp + 50} 266 ${yp + 45} C268 ${yp + 32} 262 ${yp + 16} 264 ${yp} Z" fill="#3A5A9C"/>` +
    `<path d="M266 ${yp + 36} Q286 ${yp + 40} 307 ${yp + 36} M266 ${yp + 40} Q286 ${yp + 44} 307 ${yp + 40}" stroke="#F4EEE2" stroke-width="1.6" fill="none"/>` +
    `<path d="M280 ${yp + 2} C281 ${yp + 18} 278 ${yp + 30} 281 ${yp + 46} M294 ${yp + 2} C296 ${yp + 16} 293 ${yp + 30} 296 ${yp + 46}" stroke="#24407A" stroke-width="2" fill="none" opacity="0.7"/>` +
    `<path d="M265 ${yp + 1} H305" stroke="#6E8BC4" stroke-width="1.4" opacity="0.8"/>` +
    `<circle cx="276" cy="${yp + 14}" r="3" fill="#F4EEE2" opacity="0.9"/><circle cx="292" cy="${yp + 24}" r="3" fill="#F4EEE2" opacity="0.9"/>` +
    `</g>` +
    `<g class="mr5-drat-hlina">` +
    `<circle cx="783" cy="300" r="2.2" fill="#5C5047"/>` +
    `<path d="M783 300 C770 318 772 344 777 356 M783 300 C796 318 794 344 789 356" stroke="#9AA3A8" stroke-width="1.2" fill="none"/>` +
    `<rect x="770" y="354" width="10" height="17" rx="4" fill="#9C7246" transform="rotate(8 775 362)"/>` +
    `<rect x="786" y="354" width="10" height="17" rx="4" fill="#8A6038" transform="rotate(-6 791 362)"/>` +
    `</g>`
  );
}

/** Sluneční skvrna: rovnoběžník s měkkými kraji a se stínem příček okna; skript ji posouvá */
function skvrnaSvetla(): string {
  const w = SKVRNA_SIRKA;
  const h = SKVRNA_VYSKA;
  /* Skvrnu tvoří čtyři tabulky — mezi nimi zůstává stín příček */
  const tabulka = (x0: number, x1: number, y0: number, y1: number) =>
    `<path class="mr5-tabulka" data-x0="${x0}" data-x1="${x1}" data-y0="${y0}" data-y1="${y1}" d="M${x0} ${y0} L${x1} ${y0} L${x1} ${y1} L${x0} ${y1} Z"/>`;
  const p = 0.03;
  return (
    `<g class="mr5-skvrna" opacity="0">` +
    `<g class="mr5-skvrna-tvar" fill="url(#mr5-svetlo)">` +
    tabulka(0, w * (0.5 - p), 0, h * (0.5 - p)) +
    tabulka(w * (0.5 + p), w, 0, h * (0.5 - p)) +
    tabulka(0, w * (0.5 - p), h * (0.5 + p), h) +
    tabulka(w * (0.5 + p), w, h * (0.5 + p), h) +
    `</g></g>`
  );
}

/** Tvar skvrny pro daný okamžik: čtyři tabulky jako cesty (skript je přepisuje) */
export function skvrnaCesty(s: Skvrna): string[] {
  const w = SKVRNA_SIRKA;
  const h = SKVRNA_VYSKA;
  const p = 0.03;
  const t = (x0: number, x1: number, y0: number, y1: number) => {
    const b = (x: number, y: number): Bod => [s.x + x, s.y + y + s.sklon * x];
    return quad([b(x0, y0), b(x1, y0), b(x1, y1), b(x0, y1)]);
  };
  return [
    t(0, w * (0.5 - p), 0, h * (0.5 - p)),
    t(w * (0.5 + p), w, 0, h * (0.5 - p)),
    t(0, w * (0.5 - p), h * (0.5 + p), h),
    t(w * (0.5 + p), w, h * (0.5 + p), h),
  ];
}

/* ——— Celá scéna ——— */

const MOKRE: Vlhkost = { a: 1, b: 1 };

/** SVG scény ve výchozím stavu: pondělí ráno, všechno mokré */
export function kresba(): string {
  const o: string[] = [];
  o.push(`<svg class="mu-kresba mr5-svg" viewBox="0 0 ${SIRKA} ${VYSKA}" aria-hidden="true">`);
  o.push(defs());
  o.push(mistnost());
  o.push(okno());
  o.push(kalendar());
  o.push(lampa());
  o.push(vlhkomer());
  o.push(regal());
  o.push(drobnosti());
  for (const m of MISTA) o.push(prkenko(m));
  for (const m of MISTA) o.push(kusSkupina(m, MOKRE));
  o.push(skvrnaSvetla());
  o.push(`<rect class="mr5-noc" width="800" height="560" fill="#1B2246" opacity="0"/>`);
  o.push(`<circle class="mr5-lampa-zar" cx="${LAMPA[0]}" cy="${LAMPA[1] + 40}" r="230" fill="url(#mr5-lampa-zar)" opacity="0"/>`);
  for (const m of MISTA) o.push(cedulka(m));
  for (const m of MISTA) o.push(vodovaha(m));
  o.push(`<g class="mr5-castice"></g>`);
  o.push(`</svg>`);
  return o.join("");
}

/* ——— HTML nad kresbou ——— */

const boxStyl = (b: [number, number, number, number]) =>
  `left:${pct(b[0], SIRKA)};top:${pct(b[1], VYSKA)};width:${pct(b[2] - b[0], SIRKA)};height:${pct(b[3] - b[1], VYSKA)}`;

/** Ikona obrácení: kruhová šipka */
const IKONA_OBRAT =
  `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12 A7 7 0 1 1 15.6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M13.4 2.6 L17.4 6.2 L12.6 8.6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/** Kachlík stojí vlevo dole, Bublinka se objeví u okna — obal pro postavičky (Rovina.astro je do něj vloží) */
export const KACHLIK_BOX: [number, number, number, number] = [120, 368, 296, 544];
export const BUBLINKA_BOX: [number, number, number, number] = [44, 150, 134, 240];

export function tlacitka(): string {
  const o: string[] = [];
  for (const m of MISTA) {
    const nazev = DRUHY.find((d) => d.id === m.id)!.nazev;
    o.push(
      `<button type="button" class="mr5-kus-tl" data-kus="${m.id}" aria-pressed="false" aria-label="${m.cislo} – ${nazev}: přikrýt fólií" style="${boxStyl(m.box)}"></button>`,
    );
    if (m.obrat) {
      const [x, y] = m.obrat;
      o.push(
        `<button type="button" class="mr5-obrat-tl" data-kus="${m.id}" aria-label="Obrátit ${nazev === "mísa" ? "mísu" : nazev}" style="left:${pct(x, SIRKA)};top:${pct(y, VYSKA)}">${IKONA_OBRAT}</button>`,
      );
    }
  }
  const xs = OKNO.map((p) => p[0]);
  const ys = OKNO.map((p) => p[1]);
  o.push(
    `<button type="button" class="mr5-okno-tl" aria-label="Zavřít okno" disabled style="${boxStyl([Math.min(...xs) - 10, Math.min(...ys) - 6, Math.max(...xs) + 6, Math.max(...ys) + 14])}"><span class="mr5-okno-cedulka" aria-hidden="true">zavřít!</span></button>`,
  );
  return o.join("");
}

export const obalStyl = (b: [number, number, number, number]) => `left:${pct(b[0], SIRKA)};top:${pct(b[1], VYSKA)};width:${pct(b[2] - b[0], SIRKA)}`;

export function ovladani(): string {
  const tl = MISTA.filter((m) => m.obrat)
    .map((m) => {
      const nazev = DRUHY.find((d) => d.id === m.id)!.nazev;
      return `<button type="button" class="tlacitko tlacitko-maly tlacitko-obrys mr5-obrat-rada" data-kus="${m.id}"><span class="mr5-ikona" aria-hidden="true">${IKONA_OBRAT}</span>Obrátit ${nazev === "mísa" ? "mísu" : nazev}</button>`;
    })
    .join("");
  return (
    `<div class="mu-ovladani mr5-ovladani">` +
    `<p class="mr5-napoveda">Klepnutím na kus ho přikryješ fólií. <span class="mr5-klavesy">Klávesy 1–5, C, F, O.</span></p>` +
    `<div class="mr5-rada" role="group" aria-label="Obracení">${tl}` +
    `<button type="button" class="tlacitko tlacitko-maly mr5-zavrit-rada" disabled>Zavřít okno</button></div>` +
    `</div>`
  );
}

/** Popis hrací plochy pro čtečky */
export const POPIS_OKNA =
  "Sušárna. Klepnutím na kus ho přikryješ fólií nebo odkryješ, talíř, kachel a mísu jde obrátit. Klávesy 1 až 5 vyberou kus, C přikryje, F obrátí, O zavře okno.";
export const POPIS_KACHLIKA = "Kachlík — poradí, který kus je na tom nejhůř";

/** Celá scéna pro testy a náhledy — v Rovina.astro se mezi části vkládají skutečné postavičky */
export function scena(postavy = { kachlik: "", bublinka: "" }): string {
  return (
    `<div class="mu-okno mr5-okno" role="application" aria-label="${POPIS_OKNA}">` +
    kresba() +
    `<div class="mr5-bublinka" style="${obalStyl(BUBLINKA_BOX)}" aria-hidden="true">${postavy.bublinka}</div>` +
    `<button type="button" class="mr5-kachlik" style="${obalStyl(KACHLIK_BOX)}" aria-label="${POPIS_KACHLIKA}">${postavy.kachlik}</button>` +
    tlacitka() +
    `</div>` +
    ovladani()
  );
}
