/**
 * Tvůj kus — to, co si člověk na stránce Dílna udělá: vyválí z plátu,
 * vytočí na kruhu, namočí do glazury a vypálí. Tady je jen model a kresba
 * do SVG (čistá funkce, bez DOM), takže ho kreslí stejně komponenty při
 * buildu (výchozí miska) i skripty v prohlížeči (vlastní kus).
 *
 * Kus je rotační těleso: obrys je řada poloměrů v milimetrech odspodu
 * nahoru, stejně daleko od sebe. Kachel je výjimka — čtverec na hraně.
 * Vzhled se mění podle toho, kde kus na své cestě je: mokrá hlína, suchá,
 * přežah, syrová glazura, vypálený.
 */
import { glazury } from "../../data/kurzy2";
import { orechova, syrova, matne } from "../../data/dilna";
import type { StavKusu } from "../../data/dilna";

export type Druh = "talir" | "miska" | "hrnek" | "pohar" | "vaza" | "tvar" | "kachel";

export interface Vrstva {
  /** Název glazury z kurzy2.ts (nebo „ořechová“) */
  g: string;
  /** Celý kus, nebo jen horní půlka — namáčí se okrajem napřed */
  kde: "cely" | "horni";
}

export interface Kus {
  puvod: "plat" | "kruh" | "dilna";
  druh: Druh;
  nazev: string;
  /** Poloměry v mm odspodu nahoru, stejně daleko od sebe */
  r: number[];
  /** Výška v mm (u kachle strana čtverce) */
  v: number;
  ucho?: boolean;
  /** Šev — hrnek slepený z plátu */
  sev?: boolean;
  glazury: Vrstva[];
  /** Dno otřené od glazury */
  dno: boolean;
  jmeno?: string;
}

export interface Volby {
  /** Předpona id — na stránce je kusů víc a gradienty se nesmějí potkat */
  id: string;
  sirka?: number;
  vyska?: number;
  /** Glazura stekla (dvě vrstvy) */
  stekla?: boolean;
  /** Dno nebylo otřené — kus se v peci přilepil k Šamotce */
  prilepeny?: boolean;
  /** Popisek pro čtečky; bez něj je obrázek skrytý */
  popis?: string;
}

/* ——— Barvy ——— */

type Trojice = { svetlo: string; stred: string; stin: string };

const HLINA: Record<"mokry" | "suchy" | "prezah" | "pálená", Trojice> = {
  mokry: { svetlo: "#C9A184", stred: "#9C7860", stin: "#4E3729" },
  suchy: { svetlo: "#DCCDBA", stred: "#BCA992", stin: "#7E6C5A" },
  prezah: { svetlo: "#F5E6D8", stred: "#E4C7B0", stin: "#B48A70" },
  "pálená": { svetlo: "#E6CFB0", stred: "#CDB08C", stin: "#8E7254" },
};

const hex = (h: string) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
export const smichej = (a: string, b: string, t: number) => {
  const A = hex(a);
  const B = hex(b);
  return `#${A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
};

const glazura = (nazev: string) => (nazev === orechova.nazev ? orechova : glazury.find((g) => g.nazev === nazev)) ?? glazury[3];

/** Syrová glazura: bledá a křídová, bez lesku */
const syrovaTrojice = (nazev: string): Trojice => {
  const c = syrova[nazev] ?? "#EEE9E0";
  return { svetlo: smichej(c, "#FFFFFF", 0.35), stred: c, stin: smichej(c, "#6E6458", 0.38) };
};

/** Kde se dvě glazury potkají, vznikne třetí barva — tmavší a teplejší */
const potkani = (spodni: Trojice, horni: Trojice): Trojice => ({
  svetlo: smichej(horni.svetlo, spodni.svetlo, 0.4),
  stred: smichej(smichej(horni.stred, spodni.stred, 0.45), "#6B3A1E", 0.18),
  stin: smichej(horni.stin, "#2A1A10", 0.25),
});

/* ——— Předlohy ——— */

const N = 24;
export const profil = (fn: (t: number) => number) => Array.from({ length: N }, (_, i) => fn(i / (N - 1)));

export const vychoziKus = (): Kus => ({
  puvod: "dilna",
  druh: "miska",
  nazev: "Miska z dílny",
  r: profil((t) => 30 + 33 * Math.pow(Math.sin((t * Math.PI) / 2), 0.85)),
  v: 56,
  glazury: [],
  dno: true,
});

/** Co je to za tvar — podle poměrů obrysu */
export function poznejDruh(r: number[], v: number, kachel = false): Druh {
  if (kachel) return "kachel";
  const rmax = Math.max(...r);
  const rmin = Math.min(...r);
  const rtop = r[r.length - 1];
  if (v < 0.42 * rmax) return "talir";
  if (rtop >= 0.85 * rmax && v < 1.05 * rmax) return "miska";
  if (rtop < 0.72 * rmax && v > 1.1 * rmax) return "vaza";
  if (rmax / rmin < 1.35 && v > 2.8 * rmax) return "pohar";
  if (rmax / rmin < 1.45 && v >= 0.9 * rmax) return "hrnek";
  return "tvar";
}

export const nazevDruhu = (d: Druh, ucho = false) =>
  ({
    talir: "Talíř",
    miska: "Miska",
    hrnek: ucho ? "Hrnek" : "Pohárek",
    pohar: "Vysoký pohár",
    vaza: "Váza",
    tvar: "Tvar, který ještě nemá jméno",
    kachel: "Kachel",
  })[d];

/* ——— Kresba ——— */

const f1 = (n: number) => (Math.round(n * 10) / 10).toString();

/** Hladká křivka bodů (Catmull-Rom jako Bézier) — bez M na začátku */
function hladce(body: [number, number][]) {
  let d = "";
  for (let i = 0; i < body.length - 1; i++) {
    const p0 = body[i - 1] ?? body[i];
    const p1 = body[i];
    const p2 = body[i + 1];
    const p3 = body[i + 2] ?? p2;
    d += ` C${f1(p1[0] + (p2[0] - p0[0]) / 6)} ${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)} ${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])} ${f1(p2[1])}`;
  }
  return d;
}

/** Pseudonáhoda se semínkem — skvrny a kapky jsou u stejného kusu pořád stejné */
function nahoda(semeno: number) {
  let s = semeno % 2147483647 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

const gradient = (id: string, t: Trojice) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${t.stin}"/><stop offset="0.28" stop-color="${t.stred}"/><stop offset="0.42" stop-color="${t.svetlo}"/><stop offset="0.62" stop-color="${t.stred}"/><stop offset="1" stop-color="${t.stin}"/></linearGradient>`;

interface Zony {
  dolni: Trojice;
  horni: Trojice;
  /** Patka — holá, když je dno otřené */
  patka: Trojice;
  /** Je kde se potkat (dvě vrstvy v horní zóně) */
  dve: boolean;
  /** Barva vnitřku */
  vnitrek: Trojice;
  lesk: boolean;
  skvrny: string | null;
}

function zony(kus: Kus, stav: StavKusu): Zony {
  if (stav === "hrouda" || stav === "mokry" || stav === "suchy" || stav === "prezah" || kus.glazury.length === 0) {
    const h = stav === "hotovy" ? HLINA["pálená"] : stav === "glazovany" ? HLINA.prezah : HLINA[stav === "hrouda" ? "mokry" : stav];
    return { dolni: h, horni: h, patka: h, dve: false, vnitrek: h, lesk: false, skvrny: null };
  }
  const vypalena = stav === "hotovy";
  const holy = vypalena ? HLINA["pálená"] : HLINA.prezah;
  const barva = (g: string) => (vypalena ? glazura(g) : syrovaTrojice(g));
  const dole = kus.glazury.filter((v) => v.kde === "cely").map((v) => v.g);
  const nahore = kus.glazury.map((v) => v.g);
  const vrstvy = (seznam: string[]): Trojice => {
    if (seznam.length === 0) return holy;
    if (seznam.length === 1 || !vypalena) return barva(seznam[seznam.length - 1]);
    return potkani(barva(seznam[0]), barva(seznam[seznam.length - 1]));
  };
  const lesk = vypalena && nahore.some((g) => !matne.has(g));
  const skvrny = vypalena && nahore.includes(orechova.nazev) ? orechova.skvrny : null;
  return {
    dolni: vrstvy(dole),
    horni: vrstvy(nahore),
    patka: kus.dno || dole.length === 0 ? holy : vrstvy(dole),
    dve: nahore.length > 1,
    vnitrek: vrstvy(nahore),
    lesk,
    skvrny,
  };
}

/** Celé SVG kusu ve stavu `stav`. Kus stojí dole uprostřed. */
export function kusSvg(kus: Kus, stav: StavKusu, o: Volby): string {
  const W = o.sirka ?? 200;
  const H = o.vyska ?? 200;
  const id = o.id;
  const aria = o.popis ? `role="img" aria-label="${o.popis.replace(/"/g, "&quot;")}"` : `aria-hidden="true"`;
  const z = zony(kus, stav);
  const defs: string[] = [];
  const telo: string[] = [];
  const dole = H - 10;

  /* Hrouda — ještě žádný tvar */
  if (stav === "hrouda") {
    const s = Math.min(W, H) / 120;
    defs.push(gradient(`${id}-h`, HLINA.mokry));
    const cx = W / 2;
    telo.push(`<ellipse cx="${f1(cx)}" cy="${f1(dole)}" rx="${f1(40 * s)}" ry="${f1(5 * s)}" fill="#2B2420" opacity="0.18"/>`);
    telo.push(
      `<path d="M${f1(cx - 38 * s)} ${f1(dole)} C${f1(cx - 41 * s)} ${f1(dole - 22 * s)} ${f1(cx - 22 * s)} ${f1(dole - 44 * s)} ${f1(cx + 2 * s)} ${f1(dole - 43 * s)} C${f1(cx + 26 * s)} ${f1(dole - 42 * s)} ${f1(cx + 41 * s)} ${f1(dole - 20 * s)} ${f1(cx + 37 * s)} ${f1(dole)} Z" fill="url(#${id}-h)" stroke="#3B2A1B" stroke-opacity="0.3"/>`,
    );
    telo.push(`<path d="M${f1(cx - 20 * s)} ${f1(dole - 30 * s)} C${f1(cx - 12 * s)} ${f1(dole - 38 * s)} ${f1(cx)} ${f1(dole - 39 * s)} ${f1(cx + 8 * s)} ${f1(dole - 37 * s)}" stroke="#E2C2A4" stroke-width="${f1(2.4 * s)}" fill="none" stroke-linecap="round" opacity="0.6"/>`);
    return `<svg viewBox="0 0 ${W} ${H}" ${aria}><defs>${defs.join("")}</defs>${telo.join("")}</svg>`;
  }

  /* Kachel — čtverec na hraně, glazura na líci */
  if (kus.druh === "kachel") {
    const S = kus.v;
    const t = 9;
    const s = Math.min((W - 30) / (S + t), (H - 26) / (S + t * 0.6));
    const x0 = W / 2 - ((S + t * 0.7) * s) / 2;
    const y1 = dole - 2;
    const y0 = y1 - S * s;
    const dx = t * 0.7 * s;
    const dy = t * 0.45 * s;
    defs.push(gradient(`${id}-d`, z.dolni), gradient(`${id}-n`, z.horni));
    const pul = y0 + (S * s) / 2;
    telo.push(`<ellipse cx="${f1(W / 2 + dx / 2)}" cy="${f1(y1 + 1)}" rx="${f1((S * s) / 1.8)}" ry="${f1(4)}" fill="#2B2420" opacity="0.18"/>`);
    telo.push(`<path d="M${f1(x0 + S * s)} ${f1(y0)} l${f1(dx)} ${f1(-dy)} V${f1(y1 - dy)} l${f1(-dx)} ${f1(dy)} Z" fill="${z.patka.stin}"/>`);
    telo.push(`<path d="M${f1(x0)} ${f1(y0)} l${f1(dx)} ${f1(-dy)} H${f1(x0 + S * s + dx)} l${f1(-dx)} ${f1(dy)} Z" fill="${z.horni.svetlo}"/>`);
    telo.push(`<rect x="${f1(x0)}" y="${f1(y0)}" width="${f1(S * s)}" height="${f1(S * s)}" fill="url(#${id}-d)"/>`);
    telo.push(`<path d="M${f1(x0)} ${f1(y0)} H${f1(x0 + S * s)} V${f1(pul + 3 * s)} C${f1(x0 + S * s * 0.7)} ${f1(pul - 2 * s)} ${f1(x0 + S * s * 0.35)} ${f1(pul + 5 * s)} ${f1(x0)} ${f1(pul)} Z" fill="url(#${id}-n)"/>`);
    telo.push(`<rect x="${f1(x0 + 6 * s)}" y="${f1(y0 + 6 * s)}" width="${f1(S * s - 12 * s)}" height="${f1(S * s - 12 * s)}" fill="none" stroke="${z.horni.stin}" stroke-width="${f1(1.2 * s)}" opacity="0.35"/>`);
    if (z.lesk) telo.push(`<path d="M${f1(x0 + 10 * s)} ${f1(y0 + 14 * s)} L${f1(x0 + 10 * s)} ${f1(y0 + S * s * 0.6)}" stroke="#FFFFFF" stroke-width="${f1(3 * s)}" stroke-linecap="round" opacity="0.4"/>`);
    if (kus.jmeno && stav !== "glazovany") {
      telo.push(`<text x="${f1(x0 + S * s - 8 * s)}" y="${f1(y1 - 7 * s)}" text-anchor="end" font-size="${f1(9 * s)}" font-family="Caveat, cursive" fill="${z.dolni.stin}" opacity="0.7">${kus.jmeno.slice(0, 14).replace(/[<&>]/g, "")}</text>`);
    }
    return `<svg viewBox="0 0 ${W} ${H}" ${aria}><defs>${defs.join("")}</defs>${telo.join("")}</svg>`;
  }

  /* Rotační těleso */
  const r = kus.r;
  const n = r.length;
  const rmax = Math.max(...r);
  const uchoX = kus.ucho ? kus.v * 0.34 : 0;
  const s = Math.min((W - 26) / (2 * rmax + uchoX), (H - 24) / (kus.v + rmax * 0.55));
  const cx = W / 2 - (uchoX * s) / 2;
  const ry0 = r[0] * s * 0.26;
  const zaklad = dole - ry0;
  const y = (i: number) => zaklad - (kus.v * s * i) / (n - 1);
  const rTop = r[n - 1] * s;
  const yTop = y(n - 1);
  const ryTop = rTop * 0.26;

  const levy: [number, number][] = r.map((ri, i) => [cx - ri * s, y(i)]);
  const pravy: [number, number][] = r.map((ri, i) => [cx + ri * s, y(i)]);
  const obrys =
    `M${f1(levy[0][0])} ${f1(levy[0][1])}` +
    hladce(levy) +
    ` L${f1(pravy[n - 1][0])} ${f1(pravy[n - 1][1])}` +
    hladce([...pravy].reverse()) +
    ` A${f1(r[0] * s)} ${f1(ry0)} 0 0 1 ${f1(levy[0][0])} ${f1(levy[0][1])} Z`;

  defs.push(gradient(`${id}-d`, z.dolni), gradient(`${id}-n`, z.horni), gradient(`${id}-p`, z.patka));
  defs.push(`<clipPath id="${id}-c"><path d="${obrys}"/></clipPath>`);
  defs.push(
    `<radialGradient id="${id}-v" cx="0.5" cy="0.3" r="0.75"><stop offset="0" stop-color="${z.vnitrek.stin}"/><stop offset="0.7" stop-color="${z.vnitrek.stred}"/><stop offset="1" stop-color="${z.vnitrek.svetlo}"/></radialGradient>`,
  );

  /* Stín pod kusem; přilepený kus stojí na kusu Šamotky v louži glazury */
  if (o.prilepeny) {
    telo.push(`<rect x="${f1(cx - rmax * s - 16)}" y="${f1(dole - 4)}" width="${f1(2 * rmax * s + 32)}" height="10" rx="2" fill="#B9AE9C"/>`);
    telo.push(`<ellipse cx="${f1(cx)}" cy="${f1(dole - 3)}" rx="${f1(r[0] * s * 1.25)}" ry="${f1(ry0 * 0.9 + 2)}" fill="${z.dolni.stred}"/>`);
  } else {
    telo.push(`<ellipse cx="${f1(cx)}" cy="${f1(dole)}" rx="${f1(r[0] * s * 1.08 + 4)}" ry="${f1(ry0 * 0.8 + 2)}" fill="#2B2420" opacity="0.2"/>`);
  }

  /* Ucho — za tělem nahoře se napojí, kreslí se dřív */
  const uchoBarva = z.horni;
  let ucho = "";
  if (kus.ucho) {
    const i1 = Math.round((n - 1) * 0.8);
    const i2 = Math.round((n - 1) * 0.3);
    const x1 = pravy[i1][0] - 2;
    const x2 = pravy[i2][0] - 2;
    const d = uchoX * s;
    const cesta = `M${f1(x1)} ${f1(y(i1))} C${f1(x1 + d * 1.15)} ${f1(y(i1) - d * 0.12)} ${f1(x2 + d * 1.1)} ${f1(y(i2) + d * 0.1)} ${f1(x2)} ${f1(y(i2))}`;
    const tl = Math.max(3, kus.v * s * 0.075);
    ucho =
      `<path d="${cesta}" stroke="${uchoBarva.stin}" stroke-width="${f1(tl + 2)}" fill="none" stroke-linecap="round"/>` +
      `<path d="${cesta}" stroke="${uchoBarva.stred}" stroke-width="${f1(tl)}" fill="none" stroke-linecap="round"/>` +
      `<path d="${cesta}" stroke="${uchoBarva.svetlo}" stroke-width="${f1(tl * 0.3)}" fill="none" stroke-linecap="round" opacity="0.6" transform="translate(${f1(-tl * 0.2)} ${f1(-tl * 0.15)})"/>`;
    telo.push(ucho);
  }

  /* Tělo: spodní zóna celá, přes ni horní zóna po čáru namáčení, dole patka */
  telo.push(`<path d="${obrys}" fill="url(#${id}-d)"/>`);
  const yNamoc = y(Math.round((n - 1) * 0.48));
  const vlna = (yy: number, a: number) => {
    const x0 = cx - rmax * s - 6;
    const x1 = cx + rmax * s + 6;
    const k = 6;
    let d = `M${f1(x0)} ${f1(yy)}`;
    for (let i = 1; i <= k; i++) {
      const xx = x0 + ((x1 - x0) * i) / k;
      d += ` Q${f1(xx - (x1 - x0) / k / 2)} ${f1(yy + (i % 2 ? a : -a))} ${f1(xx)} ${f1(yy)}`;
    }
    return d;
  };
  const glazovany = stav === "glazovany" || stav === "hotovy";
  if (glazovany && kus.glazury.length > 0) {
    telo.push(`<g clip-path="url(#${id}-c)"><path d="${vlna(yNamoc, 2.2)} V${f1(yTop - ryTop - 10)} H${f1(cx - rmax * s - 6)} Z" fill="url(#${id}-n)"/></g>`);
    if (z.dve) {
      /* Na hraně, kde se vrstvy potkají, je glazura nejtlustší */
      telo.push(`<g clip-path="url(#${id}-c)"><path d="${vlna(yNamoc, 2.2)}" stroke="${smichej(z.horni.stin, "#1A0F08", 0.3)}" stroke-width="${f1(2.6)}" fill="none" opacity="${stav === "hotovy" ? 0.75 : 0.35}"/></g>`);
    }
    const yPatka = zaklad - Math.max(3, kus.v * 0.06) * s;
    telo.push(`<g clip-path="url(#${id}-c)"><rect x="${f1(cx - rmax * s - 6)}" y="${f1(yPatka)}" width="${f1(2 * rmax * s + 12)}" height="${f1(ry0 * 2 + 20)}" fill="url(#${id}-p)"/></g>`);
  }

  /* Rýhy po točení, šev po plátu */
  if (kus.puvod === "kruh" && (stav === "mokry" || stav === "suchy" || stav === "prezah")) {
    for (let k = 1; k <= 5; k++) {
      const i = Math.round(((n - 1) * k) / 6.2);
      const ri = r[i] * s;
      telo.push(`<path d="M${f1(cx - ri)} ${f1(y(i))} Q${f1(cx)} ${f1(y(i) + ri * 0.52)} ${f1(cx + ri)} ${f1(y(i))}" stroke="${z.dolni.stin}" stroke-width="1" fill="none" opacity="0.22"/>`);
    }
  }
  if (kus.sev) {
    const i0 = 1;
    const i1 = n - 2;
    telo.push(`<path d="M${f1(cx + r[i0] * s * 0.42)} ${f1(y(i0))} C${f1(cx + r[i0] * s * 0.36)} ${f1((y(i0) + y(i1)) / 2)} ${f1(cx + r[i1] * s * 0.46)} ${f1((y(i0) + y(i1)) / 2)} ${f1(cx + r[i1] * s * 0.4)} ${f1(y(i1))}" stroke="${z.dolni.stin}" stroke-width="1.2" fill="none" opacity="0.3"/>`);
  }

  /* Skvrny ořechové glazury */
  if (z.skvrny) {
    const rnd = nahoda(Math.round(kus.v * 31 + rmax * 7));
    const tecky: string[] = [];
    for (let k = 0; k < 26; k++) {
      const i = Math.floor(rnd() * (n - 2)) + 1;
      const u = rnd() * 1.6 - 0.8;
      tecky.push(`<circle cx="${f1(cx + r[i] * s * u)}" cy="${f1(y(i) + rnd() * 3)}" r="${f1(0.6 + rnd() * 1.2)}" fill="${z.skvrny}" opacity="${f1(0.55 + rnd() * 0.4)}"/>`);
    }
    telo.push(`<g clip-path="url(#${id}-c)">${tecky.join("")}</g>`);
  }

  /* Glazura stekla — kapky pod čarou namáčení */
  if (o.stekla && stav === "hotovy") {
    const rnd = nahoda(Math.round(kus.v * 13 + rmax));
    const kapky: string[] = [];
    for (let k = 0; k < 7; k++) {
      const u = -0.75 + (1.5 * (k + rnd() * 0.6)) / 7;
      const xx = cx + rmax * s * u * 0.95;
      const dl = 6 + rnd() * 12;
      kapky.push(`<path d="M${f1(xx - 2.4)} ${f1(yNamoc)} C${f1(xx - 2.4)} ${f1(yNamoc + dl * 0.7)} ${f1(xx - 3)} ${f1(yNamoc + dl)} ${f1(xx)} ${f1(yNamoc + dl)} C${f1(xx + 3)} ${f1(yNamoc + dl)} ${f1(xx + 2.4)} ${f1(yNamoc + dl * 0.7)} ${f1(xx + 2.4)} ${f1(yNamoc)} Z" fill="${z.horni.stin}"/>`);
    }
    telo.push(`<g clip-path="url(#${id}-c)" opacity="0.85">${kapky.join("")}</g>`);
  }

  /* Lesk */
  if (z.lesk) {
    const i0 = Math.round((n - 1) * 0.18);
    const i1 = Math.round((n - 1) * 0.86);
    const bodyL: [number, number][] = [];
    for (let i = i0; i <= i1; i++) bodyL.push([cx - r[i] * s * 0.62, y(i)]);
    telo.push(`<path d="M${f1(bodyL[0][0])} ${f1(bodyL[0][1])}${hladce(bodyL)}" stroke="#FFFFFF" stroke-width="${f1(Math.max(2, rmax * s * 0.09))}" fill="none" stroke-linecap="round" opacity="0.42"/>`);
  }

  /* Okraj a vnitřek */
  telo.push(`<ellipse cx="${f1(cx)}" cy="${f1(yTop)}" rx="${f1(rTop)}" ry="${f1(ryTop)}" fill="url(#${id}-v)"/>`);
  telo.push(`<ellipse cx="${f1(cx)}" cy="${f1(yTop)}" rx="${f1(rTop)}" ry="${f1(ryTop)}" fill="none" stroke="${(glazovany && kus.glazury.length ? z.horni : z.dolni).svetlo}" stroke-width="${f1(Math.max(1.4, rTop * 0.07))}"/>`);

  /* Podpis rydlem na patce, dokud je vidět holá hlína */
  if (kus.jmeno && (stav === "mokry" || stav === "suchy" || stav === "prezah")) {
    telo.push(`<text x="${f1(cx)}" y="${f1(zaklad - 3)}" text-anchor="middle" font-size="${f1(Math.max(7, Math.min(14, r[0] * s * 0.3)))}" font-family="Caveat, cursive" fill="${z.dolni.stin}" opacity="0.65">${kus.jmeno.slice(0, 14).replace(/[<&>]/g, "")}</text>`);
  }

  return `<svg viewBox="0 0 ${W} ${H}" ${aria}><defs>${defs.join("")}</defs>${telo.join("")}</svg>`;
}

/* ——— Paměť ——— */

export const KLIC_KUS = "dilna-kus";

/** Je to kus, se kterým se dá pracovat? (localStorage může obsahovat cokoli) */
export function platnyKus(x: unknown): x is Kus {
  const k = x as Kus;
  return (
    !!k &&
    typeof k === "object" &&
    Array.isArray(k.r) &&
    k.r.length >= 4 &&
    k.r.length <= 64 &&
    k.r.every((v) => typeof v === "number" && Number.isFinite(v) && v > 0 && v < 400) &&
    typeof k.v === "number" &&
    k.v > 4 &&
    k.v < 500 &&
    Array.isArray(k.glazury) &&
    k.glazury.length <= 2
  );
}
