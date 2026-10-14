/**
 * Úroveň 四 Tvar „Podle předlohy“ — tři předlohy a geometrie scény.
 *
 * Čisté funkce bez DOM a bez window: podle nich kreslí výchozí stav scény
 * kresba (tvar-kresba.ts, při buildu) i skript úrovně za běhu
 * (scripts/zkouska/urovne/tvar.ts), takže se obrázek po spuštění nezmění.
 *
 * Kus je rotační těleso jako v components/dilna/kus.ts:
 * 24 poloměrů v mm odspodu nahoru, stejně daleko od sebe, a výška v mm.
 * Ve scéně je 1 mm = 2,25 jednotky (víc než v Dílně, ať se i na telefonu
 * dá trefit), osa kruhu je na x = 540 a hlava kruhu na y = 470.
 */
import { profil, kusSvg } from "../../dilna/kus";
import type { Kus, Vrstva } from "../../dilna/kus";

export const SIRKA = 800;
export const VYSKA = 560;
/** Jednotek scény na milimetr */
export const S = 2.25;
/** Osa kruhu */
export const CX = 540;
/** Hlava kruhu — tady stojí patka */
export const ZAKLAD = 470;
/** Počet poloměrů v obrysu */
export const N = 24;

const omez = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const f1 = (n: number) => (Math.round(n * 10) / 10).toString();

export interface Profil {
  r: number[];
  v: number;
}

export type PredlohaId = "miska" | "hrnek" | "vaza";

export interface Predloha extends Profil {
  id: PredlohaId;
  nazev: string;
  /** Váha kola ve výsledku — váza je nejtěžší a počítá se víc */
  vaha: number;
  /** Glazura mistrova kusu na polici — každé kolo jiná */
  glazury: Vrstva[];
  ucho?: boolean;
  /** Co řekne Vázička, když kolo začne */
  uvod: string;
  /** Do výsledku, když kus spadne: miska spadla, hrnek spadl */
  spadlo: string;
}

/** Hladká interpolace přes body [t, r] (Catmull-Rom) — stejná jako u předloh v tocit.ts */
const pres = (body: [number, number][]) => (t: number) => {
  let i = 0;
  while (i < body.length - 2 && t > body[i + 1][0]) i++;
  const p0 = body[Math.max(0, i - 1)];
  const p1 = body[i];
  const p2 = body[i + 1];
  const p3 = body[Math.min(body.length - 1, i + 2)];
  const u = omez((t - p1[0]) / Math.max(1e-6, p2[0] - p1[0]));
  const u2 = u * u;
  const u3 = u2 * u;
  return 0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * u + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * u3);
};

/* Obrysy jsou stejné jako předlohy miska, hrnek a váza na kruhu v Dílně */
export const PREDLOHY: Predloha[] = [
  {
    id: "miska",
    nazev: "Miska",
    vaha: 1,
    v: 62,
    r: profil((t) => 30 + 34 * Math.pow(Math.sin((t * Math.PI) / 2), 0.85)),
    glazury: [{ g: "celadon", kde: "cely" }],
    uvod: "Miska. Nejlepší první kus. A druhý taky.",
    spadlo: "spadla",
  },
  {
    id: "hrnek",
    nazev: "Hrnek",
    vaha: 1,
    v: 96,
    r: profil((t) => 39 + 3 * Math.sin(Math.PI * t)),
    glazury: [{ g: "matná bílá", kde: "cely" }, { g: "tenmoku", kde: "horni" }],
    ucho: true,
    uvod: "Hrnek. Rovné stěny, klidné ruce.",
    spadlo: "spadl",
  },
  {
    id: "vaza",
    nazev: "Váza",
    vaha: 1.2,
    v: 180,
    r: profil(pres([[0, 34], [0.18, 46], [0.38, 54], [0.6, 44], [0.8, 22], [0.9, 18], [1, 23]])),
    glazury: [{ g: "tenmoku", kde: "cely" }, { g: "železitá hnědá", kde: "horni" }],
    uvod: "Váza. Krk se zužuje pomalu, jinak se hlína zkroutí.",
    spadlo: "spadla",
  },
];

/** Čerstvá hrouda na kruhu — jako v Dílně */
export const HROUDA: Profil = { v: 72, r: profil((t) => 54 * Math.sqrt(Math.max(0.03, 1 - Math.pow(t, 2) * 0.97))) };

/** Mistrův kus na polici: vypálený, v glazuře svého kola */
export const kusPredlohy = (p: Predloha): Kus => ({
  puvod: "kruh",
  druh: p.id,
  nazev: p.nazev,
  r: p.r,
  v: p.v,
  ucho: p.ucho,
  glazury: p.glazury,
  dno: true,
});

/* ——— Křivky ——— */

type Bod = [number, number];

/** Hladká křivka přes body (Catmull-Rom jako Bézier) — bez M na začátku */
export function hladkaCesta(body: Bod[]) {
  return useky(body).join("");
}

/** Tatáž křivka po úsecích: i-tý úsek vede z bodu i do bodu i + 1 */
export function useky(body: Bod[]) {
  const d: string[] = [];
  for (let i = 0; i < body.length - 1; i++) {
    const p0 = body[i - 1] ?? body[i];
    const p1 = body[i];
    const p2 = body[i + 1];
    const p3 = body[i + 2] ?? p2;
    d.push(
      ` C${f1(p1[0] + (p2[0] - p0[0]) / 6)} ${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)} ${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])} ${f1(p2[1])}`,
    );
  }
  return d;
}

/** Výška i-tého poloměru ve scéně */
export const yPasu = (p: Profil, i: number) => ZAKLAD - (p.v * S * i) / (p.r.length - 1);

const strana = (p: Profil, smer: 1 | -1): Bod[] => p.r.map((ri, i) => [CX + smer * ri * S, yPasu(p, i)]);

/** Obrys hlíny: levá strana nahoru, okraj, pravá dolů a obloukem po patce zpátky */
export function obrysHliny(p: Profil) {
  const n = p.r.length;
  const levy = strana(p, -1);
  const pravy = strana(p, 1);
  const ry0 = p.r[0] * S * 0.2;
  return (
    `M${f1(levy[0][0])} ${f1(levy[0][1])}` +
    hladkaCesta(levy) +
    ` L${f1(pravy[n - 1][0])} ${f1(pravy[n - 1][1])}` +
    hladkaCesta([...pravy].reverse()) +
    ` A${f1(p.r[0] * S)} ${f1(ry0)} 0 0 1 ${f1(levy[0][0])} ${f1(levy[0][1])} Z`
  );
}

/** Rýhy po prstech — oblouky zepředu kolem dokola */
export function ryhyHliny(p: Profil) {
  const n = p.r.length;
  let d = "";
  for (let k = 1; k <= 6; k++) {
    const i = Math.round(((n - 1) * k) / 7.2);
    const ri = p.r[i] * S;
    const y = yPasu(p, i);
    d += `M${f1(CX - ri)} ${f1(y)} Q${f1(CX)} ${f1(y + ri * 0.46)} ${f1(CX + ri)} ${f1(y)} `;
  }
  return d.trim();
}

/** Mokrý lesk vlevo od středu — hlína na kruhu se leskne */
export function leskHliny(p: Profil) {
  const n = p.r.length;
  const i0 = Math.max(1, Math.round((n - 1) * 0.1));
  const i1 = Math.min(n - 2, Math.round((n - 1) * 0.86));
  const body: Bod[] = [];
  for (let i = i0; i <= i1; i++) body.push([CX - p.r[i] * S * 0.56, yPasu(p, i)]);
  return `M${f1(body[0][0])} ${f1(body[0][1])}` + hladkaCesta(body);
}

/** Okraj nahoře — elipsa, pod kterou je vidět dovnitř */
export function okrajHliny(p: Profil) {
  const rt = p.r[p.r.length - 1] * S;
  return { cx: CX, cy: yPasu(p, p.r.length - 1), rx: rt, ry: rt * 0.24 };
}

/** Stín hlíny na hlavě kruhu */
export function stinHliny(p: Profil) {
  const r0 = p.r[0] * S;
  return { cx: CX + r0 * 0.08, cy: ZAKLAD + r0 * 0.12, rx: r0 * 1.16, ry: r0 * 0.3 };
}

/** Kde se hlína potká s hlavou — tenký proužek šlikru zepředu */
export function patkaHliny(p: Profil) {
  const r0 = p.r[0] * S;
  return `M${f1(CX - r0)} ${f1(ZAKLAD)} A${f1(r0)} ${f1(r0 * 0.2)} 0 0 0 ${f1(CX + r0)} ${f1(ZAKLAD)}`;
}

/* ——— Předloha jako zlatá čára na kruhu ——— */

/** Pravá strana předlohy po úsecích — rozsvítí se, kde čára sedí */
export const duchUseky = (p: Profil) => {
  const pravy = strana(p, 1);
  return useky(pravy).map((c, i) => `M${f1(pravy[i][0])} ${f1(pravy[i][1])}${c}`);
};

/** Levá strana předlohy (zrcadlo) celá */
export const duchLevy = (p: Profil) => {
  const levy = strana(p, -1);
  return `M${f1(levy[0][0])} ${f1(levy[0][1])}` + hladkaCesta(levy);
};

/** Patka předlohy vpravo — odsud se začíná kreslit */
export const startBod = (p: Profil) => ({ x: CX + p.r[0] * S, y: ZAKLAD });

/* ——— Police s předlohou a prkno se sušícími kusy ——— */

/** Rámeček kusu na polici (kusSvg ho postaví patkou 10 jednotek nad spodní hranu) */
export const POLICE = { x: 30, y: 58, w: 190, h: 202, deska: 250 };
/** Prkno na lavici: tři místa pro vytočené kusy */
export const PRKNO = { y: 444, w: 92, h: 112, x: [64, 156, 248] };

/** SVG z kusSvg vnořené do scény na dané místo */
export const vnor = (svg: string, x: number, y: number, w: number, h: number) =>
  svg.replace("<svg ", `<svg x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" `);

export const predlohaSvg = (p: Predloha) =>
  vnor(
    kusSvg(kusPredlohy(p), "hotovy", { id: "mt4-p", sirka: POLICE.w, vyska: POLICE.h }),
    POLICE.x,
    POLICE.y,
    POLICE.w,
    POLICE.h,
  );

/**
 * Kde a jak velký bude kus na prkně — kusSvg si ho do rámečku zmenší sám,
 * tady se to samé spočítá dopředu, aby hlína odletěla z kruhu přesně tam.
 * Vrací bod patky ve scéně a měřítko vůči kruhu.
 */
export function naPrkne(p: Profil, i: number) {
  const { w, h } = PRKNO;
  const rmax = Math.max(...p.r);
  const s = Math.min((w - 26) / (2 * rmax), (h - 24) / (p.v + rmax * 0.55));
  return { x: PRKNO.x[i], y: PRKNO.y - p.r[0] * s * 0.26, k: s / S };
}
