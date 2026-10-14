/**
 * Úroveň 一 Hrouda — model bloku hlíny, ze kterého se krájí šest hrud
 * po 500 g. Čistý modul bez DOM: kreslí podle něj kresba scény
 * (hrouda-kresba.ts) a počítá s ním hra (scripts/zkouska/urovne/hrouda.ts).
 *
 * Blok leží na stole napříč scénou. Profil je výška v každém místě délky:
 * zakulacený konec vpravo, vlevo rovná stěna po drátu, mírné bříško
 * a dva až tři hladké hrboly ze součtu pomalých sinusovek. Průřez je
 * elipsa, jejíž výška jde podle profilu a hloubka s ní — hmotnost na
 * centimetr je proto úměrná čtverci výšky. Kde je blok o desetinu vyšší,
 * váží centimetr o pětinu víc; právě to se musí odhadnout okem.
 *
 * Blok je z čísla (semínka), takže ho jde kdykoli postavit znovu stejný —
 * výchozí kresba pod úvodní kartou i testy.
 */

/** Měřítko scény: jednotek viewBoxu na centimetr */
export const CM = 12.5;
/** Kde ve scéně začíná blok (levá stěna před prvním řezem) */
export const X0 = 214;
/** Výška stolu pod blokem — čára, na které blok leží */
export const ZAKLAD = 352;
/** Kolik váží jedna hrouda */
export const CIL = 500;
export const HROUD = 6;
/** Krok, po kterém se profil a hmotnost předpočítávají (cm) */
const KROK = 0.05;

export interface Blok {
  seme: number;
  /** Délka v cm */
  delka: number;
  /** Celková hmotnost v gramech */
  hmotnost: number;
  /** Výška profilu v cm po KROK od levého konce */
  vysky: Float64Array;
  /** Hmotnost od levého konce do daného místa (g), po KROK */
  kum: Float64Array;
  /** Jak dlouhá je zakulacená špička vpravo (cm) */
  cepicka: number;
  /** Důlky po prstech — [x v cm, výška 0–1 od hřbetu, velikost] */
  dulky: [number, number, number][];
}

/** mulberry32 — malý generátor, stejné semínko dá stejný blok */
export function nahoda(seme: number) {
  let a = seme >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const mezi = (r: () => number, a: number, b: number) => a + (b - a) * r();

export function novyBlok(seme: number): Blok {
  const r = nahoda(seme);
  const delka = mezi(r, 41.5, 44.5);
  const hmotnost = Math.round(mezi(r, 3300, 3800));
  const vyskaStred = mezi(r, 7.1, 7.7);
  /* Bříško a hrboly. Amplitudy jsou vyladěné tak, aby krájení na stejné
     délky dávalo 良 až 可 a na 優 bylo potřeba hlídat tloušťku. */
  const brisko = mezi(r, 0.03, 0.06);
  const pocet = r() < 0.5 ? 2 : 3;
  const hrboly: { a: number; f: number; faze: number }[] = [];
  for (let i = 0; i < pocet; i++) {
    hrboly.push({ a: mezi(r, 0.03, 0.05) * (pocet === 3 ? 0.85 : 1), f: mezi(r, 1.3, 3.0), faze: mezi(r, 0, Math.PI * 2) });
  }
  /* Pravý konec: zakulacená špička, kterou kdysi někdo uválel */
  const cepicka = mezi(r, 3.2, 4.2);

  const n = Math.ceil(delka / KROK) + 1;
  const vysky = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const x = Math.min(delka, i * KROK);
    const u = x / delka;
    let tvar = 1 + brisko * Math.sin(Math.PI * u);
    for (const h of hrboly) tvar += h.a * Math.sin(2 * Math.PI * h.f * u + h.faze);
    tvar = Math.min(1.3, Math.max(0.74, tvar));
    const k = x - (delka - cepicka);
    const konec = k > 0 ? Math.pow(Math.max(0, 1 - (k / cepicka) ** 2), 0.55) : 1;
    vysky[i] = vyskaStred * tvar * konec;
  }

  /* Hmotnost na cm ∝ výška² — pak se celé přeškáluje na hmotnost bloku */
  const kum = new Float64Array(n);
  for (let i = 1; i < n; i++) {
    const a = vysky[i - 1];
    const b = vysky[i];
    kum[i] = kum[i - 1] + ((a * a + a * b + b * b) / 3) * KROK;
  }
  const meritko = hmotnost / kum[n - 1];
  for (let i = 0; i < n; i++) kum[i] *= meritko;

  const dulky: [number, number, number][] = [];
  const pocetDulku = 3 + Math.floor(r() * 3);
  for (let i = 0; i < pocetDulku; i++) dulky.push([mezi(r, 2, delka - 6), mezi(r, 0.22, 0.55), mezi(r, 0.75, 1.2)]);

  return { seme, delka, hmotnost, vysky, kum, cepicka, dulky };
}

const index = (b: Blok, x: number) => {
  const t = Math.min(b.vysky.length - 1, Math.max(0, x / KROK));
  const i = Math.min(b.vysky.length - 2, Math.floor(t));
  return { i, f: t - i };
};

/** Výška bloku v místě x (cm od levého konce), v cm */
export function vyska(b: Blok, x: number) {
  const { i, f } = index(b, x);
  return b.vysky[i] + (b.vysky[i + 1] - b.vysky[i]) * f;
}

/** Hmotnost od levého konce do x (g) */
export function hmotnostDo(b: Blok, x: number) {
  const { i, f } = index(b, x);
  return b.kum[i] + (b.kum[i + 1] - b.kum[i]) * f;
}

/** Kolik váží kus mezi a a c (cm) */
export const hmotnostMezi = (b: Blok, a: number, c: number) => hmotnostDo(b, Math.max(a, c)) - hmotnostDo(b, Math.min(a, c));

/** Kde řezat, aby od místa `od` vyšlo `gramy` — pro roboty v testech a pro odhad, jestli hlína dojde */
export function kdeRiznout(b: Blok, od: number, gramy: number) {
  const cil = hmotnostDo(b, od) + gramy;
  if (cil >= b.kum[b.kum.length - 1]) return b.delka;
  let lo = 0;
  let hi = b.kum.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (b.kum[m] < cil) lo = m;
    else hi = m;
  }
  const f = (cil - b.kum[lo]) / Math.max(1e-9, b.kum[hi] - b.kum[lo]);
  return Math.min(b.delka, (lo + f) * KROK);
}

/** Průměrná výška bloku (cm) — pro hlášky a pro boty */
export function prumernaVyska(b: Blok, a = 0, c = b.delka) {
  const n = 40;
  let s = 0;
  for (let i = 0; i < n; i++) s += vyska(b, a + ((c - a) * (i + 0.5)) / n);
  return s / n;
}

/* ——— Hodnocení ——— */

/** Body podle průměrné odchylky (g): lomená čára 0 → 100, 13 → 85, 30 → 65, 55 → 40, 80 → 0 */
const BODY: [number, number][] = [
  [0, 100],
  [13, 85],
  [30, 65],
  [55, 40],
  [80, 0],
];
export const POKUTA_ZA_PROBUZENI = 6;
/** Do kolika gramů průměrné odchylky se prochází */
export const PROJDE_DO = 55;
/** Kolikáté probuzení hru ukončí */
export const PROBUZENI_MAX = 3;

export function bodyZOdchylky(e: number) {
  if (e <= 0) return 100;
  for (let i = 1; i < BODY.length; i++) {
    const [e1, b1] = BODY[i];
    if (e <= e1) {
      const [e0, b0] = BODY[i - 1];
      return b0 + ((b1 - b0) * (e - e0)) / (e1 - e0);
    }
  }
  return 0;
}

export interface Hodnoceni {
  /** Průměrná odchylka od 500 g */
  odchylka: number;
  body: number;
  proslo: boolean;
}

export function ohodnot(vahy: number[], probuzeni: number): Hodnoceni {
  const plne = Array.from({ length: HROUD }, (_, i) => vahy[i] ?? 0);
  const odchylka = plne.reduce((s, w) => s + Math.abs(w - CIL), 0) / HROUD;
  const body = Math.round(Math.max(0, Math.min(100, bodyZOdchylky(odchylka) - POKUTA_ZA_PROBUZENI * probuzeni)));
  return { odchylka, body, proslo: odchylka <= PROJDE_DO && probuzeni < PROBUZENI_MAX };
}
