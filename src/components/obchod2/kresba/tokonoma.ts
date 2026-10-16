/**
 * Zadní místnost krámku — 奥の間, třetí část interiéru pod vitrínami.
 *
 * Po dvou teplých, plných stěnách (uvnitr.ts) přijde ticho: šero, jedno
 * světlo a jeden kus. Místnost navazuje na stěny nad ní (stejný strop
 * s trámem, lišta nageshi, sloupky na stejných místech), jen je tmavší:
 * hliněná stěna tsuchikabe v rezavém okru a místo prken zvýšená podlaha
 * z rohoží tatami. Kreslená stejnou rukou: plochy bez obrysů, světlo
 * zleva shora, měkké přechody jen pro světlo a záři.
 *
 *   výklenek  tokonoma uprostřed: překlad otoshigake, přírodní kmen
 *             tokobashira se závěsnou bambusovou vázou a kamélií,
 *             leštěná deska tokoita s lakovanou hranou toko-gamachi.
 *             Visí v něm svitek, kde je místo kaligrafie modrotisk
 *             Futatsu (části výkresu z futatsu/kresba.ts), na desce
 *             stojí na lakovaném podstavci Futatsu (HTML, podobizna.ts)
 *             a vedle něj krabice z paulovnie s víkem opřeným o ni.
 *   štít      deska hengaku s vyřezanými zlacenými znaky 逸品 nad
 *             výklenkem; HTML nadpis leží v ní jako na štítech stěn.
 *   světlo    šikmý paprsek z mřížkového okénka shitaji-mado vlevo
 *             nahoře, v něm prášinky (pohyb dělá CSS), a papírová lampa
 *             andon na druhé straně.
 *   podlaha   tatami s lemy heri, polštář zabuton před výklenkem, vedle
 *             něj stojí lístek 折紙 (HTML), leštěná hrana agari-kamachi
 *             a pod ní kámen na zouvání s párem geta.
 *   kraje     na širokém monitoru posuvné stěny fusuma se zlatými mraky;
 *             vpředu nahoře kraje norenu 奥 / の間, kterým se sem prošlo.
 *
 * Smlouva jako stena() v uvnitr.ts: geometrie v jednotkách jádra W × H,
 * kresba i kus za oba kraje (ext), vrstvy `zadni` → HTML hrnek →
 * `predni` (paprsek, prášinky, noren) → HTML štít, lístek a poznámka.
 * Rozvržení `siroka` (jádro 1400) a `uzka` (telefon, 560): na telefonu
 * jde pod sebou štít → svitek → hrnek s krabicí → lístek přes celou šířku,
 * okénko a lampa zůstanou za krajem jádra (paprsek přijde zpoza okraje).
 *
 * Id začínají o2ts- / o2tu-, barvy jen #RRGGBB.
 */
import { f, obdelnik, cara, kruh, elipsa, mnohouhelnik, nahoda, P, PISMO } from "./zaklad";
import type { Obdelnik, Bod } from "./zaklad";
import { U, obdelniky, kruhy, otoc, napis, svisle, hrebik } from "./uvnitr";
import { PODOBIZNA, BARVY, obrys } from "../futatsu/podobizna";
import { zepredu, detailB, razitko, ram, vzory, defsTelo, titulek } from "../futatsu/kresba";

export type Rozvrzeni = "siroka" | "uzka";

/* ——— Barvy zadní místnosti (rodina z P a U, jen v šeru) ——— */
const T = {
  /* hliněná stěna: rezavý okr */
  zed: "#6B432C",
  zedSvetla: "#8A5A3B",
  zedTma: "#4E3020",
  /* zadní stěna výklenku je hlouběji ve stínu */
  nika: "#55341F",
  nikaTma: "#3E2616",
  /* staré cedrové dřevo místnosti */
  drevo: "#5E3D28",
  drevoSvetle: "#7A5236",
  drevoTma: "#432B1B",
  drevoHrana: "#9C7048",
  /* tokobashira: oloupaný kmen */
  kmen: "#A37650",
  kmenSvetly: "#C99D70",
  kmenStin: "#76522F",
  suk: "#553722",
  sukKruh: "#8E6642",
  /* lak (černý s hnědým nádechem) */
  lak: "#1A110D",
  lakSvetly: "#2E1F17",
  lakOdlesk: "#6A5545",
  /* tokoita: leštěná deska */
  deska: "#5A3A24",
  deskaSvetla: "#7A5236",
  deskaTma: "#3E2716",
  /* tatami v šeru */
  tatami: "#9A8F58",
  tatamiSvetle: "#B3A86C",
  tatamiStin: "#7C7246",
  heri: "#2A2620",
  heriSvetle: "#4A4436",
  /* hliněná podlaha doma a kámen */
  doma: "#3A2E25",
  domaTma: "#251C16",
  kamen: "#8A857A",
  kamenSvetly: "#ABA698",
  kamenTma: "#615D55",
  /* deska hengaku a zlacení */
  hengaku: "#33200F",
  hengakuRam: "#553722",
  hengakuHrana: "#8A603E",
  zlato: "#D9B45A",
  zlatoSvetle: "#F4DE9C",
  zlatoTma: "#7A5A1E",
  /* fusuma se zlatými mraky (zlato v šeru) */
  fusuma: "#7E6538",
  fusumaMrak: "#977B45",
  fusumaMrakSvetly: "#B39456",
  fusumaRam: "#1F1510",
  /* světlo okénka a lampy */
  svetlo: "#FFF3DA",
  papirOkna: "#F1E6CC",
  andon: "#FFE7B4",
  andonZar: "#FFD58A",
  /* kamélie a bambus */
  kvet: "#B42A2C",
  kvetSvetly: "#D8483C",
  kvetTma: "#7E1A1E",
  tycinky: "#E9C44E",
  list: "#2C4931",
  listSvetly: "#4D704C",
  listZila: "#82A27C",
  stonek: "#4A3322",
  bambus: "#B49A62",
  bambusSvetly: "#D0B880",
  bambusTma: "#7E6A40",
  /* zabuton a geta */
  zabuton: "#2A3760",
  zabutonSvetly: "#3B4A7C",
  zabutonTma: "#1B2444",
  strapec: "#C9A24A",
  geta: "#D2B482",
  getaTma: "#A3865A",
  hanao: "#C4432B",
  /* svitek: krémové hedvábí, rezavý brokát, zlatá ichimonji */
  ten: "#E6DAC0",
  tenStin: "#CDBF9F",
  naka: "#7A4A30",
  nakaSvetla: "#94603F",
  ichimonji: "#C9A24A",
  ichimonjiTma: "#9C7A2E",
  jiku: "#2E1F17",
  modrotisk: "#284472",
  modrotiskTma: "#1D3358",
};

/* ════════════════════ Geometrie ════════════════════ */

interface Parametry {
  W: number;
  ext: number;
  H: number;
  /** Sloupky ve zdi (x levé hrany, šířka 32) — na stejných místech jako stěny nad tím */
  sloupky: number[];
  /** Deska hengaku; vlevo v ní pole se znaky široké znakyW, vpravo HTML nadpis */
  hengaku: Obdelnik;
  znakyW: number;
  znakyVel: number;
  /** Výklenek: kraje otvoru mezi sloupky, spodek překladu, zadní a přední hrana desky tokoita */
  tokoL: number;
  tokoP: number;
  preklad: number;
  zadDesky: number;
  tokoita: number;
  /** Šířka sloupků výklenku */
  sloupek: number;
  /** Svitek: střed, šířka, horní tyčka, výška horního pole, papír */
  svitek: { cx: number; w: number; y: number; ten: number; honshiW: number; honshiH: number };
  /** Hrnek: jednotek kresby na milimetr a střed patky (na podstavci) */
  k: number;
  pata: Bod;
  podstavec: { rx: number; ry: number };
  /** Krabice z paulovnie (čelo bez víka), víko se opírá o její pravý bok */
  krabice: Obdelnik;
  /** Hřebík s vázou na tokobashiře */
  vaza: Bod;
  /** Okénko shitaji-mado (otvor ve zdi) */
  okno: Obdelnik;
  /** Andon: střed a paty nohou */
  andon: Bod;
  /** Horní hrana agari-kamachi */
  kamachi: number;
  /** Lístek 折紙 (HTML), poznámka „vezmi ho do ruky“ (HTML) */
  listek: Obdelnik;
  rada: Obdelnik;
  /** Zabuton před výklenkem (střed, zadní hrana, šířka) — na telefonu není */
  zabuton: { cx: number; y: number; w: number } | null;
  noren: { w: number; dole: number; velikost: number };
  fusuma: boolean;
}

const PARAMETRY: Record<Rozvrzeni, Parametry> = {
  siroka: {
    W: 1400,
    ext: 640,
    H: 1384,
    sloupky: [-560, 0, 1368, 1928],
    hengaku: { x: 404, y: 84, w: 592, h: 120 },
    znakyW: 178,
    znakyVel: 64,
    tokoL: 300,
    tokoP: 1100,
    preklad: 246,
    zadDesky: 962,
    tokoita: 1120,
    sloupek: 38,
    svitek: { cx: 700, w: 344, y: 272, ten: 54, honshiW: 300, honshiH: 380 },
    k: 1.8,
    pata: [690, 1048],
    podstavec: { rx: 98, ry: 24 },
    krabice: { x: 776, y: 870, w: 158, h: 136 },
    vaza: [1119, 448],
    okno: { x: 92, y: 300, w: 140, h: 150 },
    andon: [1250, 1214],
    kamachi: 1278,
    listek: { x: 44, y: 806, w: 470, h: 458 },
    rada: { x: 800, y: 806, w: 210, h: 52 },
    zabuton: { cx: 700, y: 1174, w: 250 },
    noren: { w: 170, dole: 250, velikost: 62 },
    fusuma: true,
  },
  uzka: {
    W: 560,
    ext: 260,
    H: 1990,
    sloupky: [-150, 678],
    hengaku: { x: 30, y: 230, w: 500, h: 112 },
    znakyW: 134,
    znakyVel: 50,
    tokoL: 46,
    tokoP: 514,
    preklad: 382,
    zadDesky: 1004,
    tokoita: 1156,
    sloupek: 30,
    svitek: { cx: 276, w: 282, y: 404, ten: 50, honshiW: 244, honshiH: 312 },
    k: 1.6,
    pata: [244, 1088],
    podstavec: { rx: 88, ry: 22 },
    krabice: { x: 298, y: 952, w: 112, h: 96 },
    vaza: [529, 500],
    okno: { x: -116, y: 330, w: 100, h: 124 },
    andon: [652, 1300],
    kamachi: 1900,
    listek: { x: 22, y: 1238, w: 516, h: 540 },
    rada: { x: 120, y: 1192, w: 300, h: 40 },
    zabuton: null,
    noren: { w: 132, dole: 216, velikost: 50 },
    fusuma: false,
  },
};

export interface Geometrie extends Parametry {
  rozvrzeni: Rozvrzeni;
  /** Kde se stěna potká s tatami (spodek toko-gamachi) */
  tatami: number;
  /** HTML nadpis v desce hengaku */
  stit: Obdelnik;
  /** Svitek po papír (HTML odkaz na výkres) a papír s modrotiskem */
  svitekObd: Obdelnik;
  honshi: Obdelnik;
  /** Rámeček podobizny (HTML hrnek): PODOBIZNA.viewBox v jednotkách kresby */
  hrnek: Obdelnik;
  /** Kam paprsek míří */
  cil: Bod;
}

export function geometrie(rozvrzeni: Rozvrzeni): Geometrie {
  const p = PARAMETRY[rozvrzeni];
  const sv = p.svitek;
  // svitek odshora: tyčka 8, horní pole ten, lem 12, ichimonji 10, papír, ichimonji 10, lem 12, spodní pole, váleček
  const honshiY = sv.y + 8 + sv.ten + 12 + 10;
  const honshi = { x: sv.cx - sv.honshiW / 2, y: honshiY, w: sv.honshiW, h: sv.honshiH };
  const h = p.hengaku;
  const okraj = 14;
  return {
    ...p,
    rozvrzeni,
    tatami: p.tokoita + 32,
    stit: { x: h.x + okraj + p.znakyW, y: h.y + okraj, w: h.w - 2 * okraj - p.znakyW, h: h.h - 2 * okraj },
    // odkaz kryje svitek jen po spodní ichimonji — níž už stojí hrnek, který se chytá
    svitekObd: { x: sv.cx - sv.w / 2 - 6, y: sv.y - 30, w: sv.w + 12, h: honshiY + sv.honshiH + 12 - (sv.y - 30) },
    honshi,
    hrnek: {
      x: p.pata[0] + (PODOBIZNA.x - PODOBIZNA.pata[0]) * p.k,
      y: p.pata[1] + (PODOBIZNA.y - PODOBIZNA.pata[1]) * p.k,
      w: PODOBIZNA.w * p.k,
      h: PODOBIZNA.h * p.k,
    },
    cil: [p.pata[0] - 10, p.pata[1] - 150 * (p.k / 3.5)],
  };
}

/* ——— Pomocníci ——— */
const zaoblene = (x: number, y: number, w: number, h: number, r: number, atributy: string) =>
  obdelnik(x, y, w, h, `rx="${f(Math.min(r, h / 2, w / 2))}" ${atributy}`);
/** Měkká záře: radiální přechod do ztracena */
const zare = (id: string, barva: string, silne: number, stred = 0.45) =>
  `<radialGradient id="${id}"><stop offset="0" stop-color="${barva}" stop-opacity="${silne}"/><stop offset="${stred}" stop-color="${barva}" stop-opacity="${f(silne * 0.35 * 100) / 100}"/><stop offset="1" stop-color="${barva}" stop-opacity="0"/></radialGradient>`;
const svisly = (id: string, a: string, b: string, oa = 1, ob = 1) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}" stop-opacity="${oa}"/><stop offset="1" stop-color="${b}" stop-opacity="${ob}"/></linearGradient>`;
const vodorovny = (id: string, zastavky: [number, string, number?][]) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0">${zastavky.map(([o, c, op]) => `<stop offset="${o}" stop-color="${c}"${op === undefined ? "" : ` stop-opacity="${op}"`}/>`).join("")}</linearGradient>`;

/* ════════════════════ Pokoj: strop, trám, stěna, sloupky ════════════════════ */

function pokoj(g: Geometrie, id: string) {
  const x0 = -g.ext;
  const w = g.W + 2 * g.ext;
  let defs = `<linearGradient id="${id}-stin-tramu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.inkoust}" stop-opacity="0.32"/><stop offset="1" stop-color="${P.inkoust}" stop-opacity="0"/></linearGradient>`;
  defs += zare(`${id}-zar-okna`, T.svetlo, 0.3);
  defs += zare(`${id}-zar-andonu`, T.andonZar, 0.42, 0.4);
  defs += svisly(`${id}-stena`, T.zedTma, T.zed);
  let s = "";
  // stěna: nahoře v šeru, dolů se lehce rozjasní
  s += obdelnik(x0, 76, w, 304, `fill="url(#${id}-stena)"`);
  s += obdelnik(x0, 379, w, g.tatami - 379, `fill="${T.zed}"`);
  // světlo okénka kolem otvoru a záře lampy na stěně
  const o = g.okno;
  s += elipsa(o.x + o.w / 2 + 30, o.y + o.h / 2 + 40, o.w * 1.9, o.h * 1.9, `fill="url(#${id}-zar-okna)"`);
  s += `<g class="o2t-zar">${elipsa(g.andon[0], g.andon[1] - 150, 360, 330, `fill="url(#${id}-zar-andonu)"`)}</g>`;
  s += obdelnik(x0, 76, w, 90, `fill="url(#${id}-stin-tramu)"`);
  // lišta nageshi
  s += obdelnik(x0, 150, w, 14, `fill="${T.drevo}"`) + obdelnik(x0, 150, w, 2.4, `fill="${T.drevoHrana}"`);
  s += obdelnik(x0, 164, w, 8, `fill="${P.inkoust}" opacity="0.18"`);
  // lišta u tatami (tatami-yose)
  s += obdelnik(x0, g.tatami - 8, w, 8, `fill="${T.drevoTma}"`);
  // sloupky ve zdi: světlá hrana vlevo, stín vpravo
  for (const sx of g.sloupky) {
    s += obdelnik(sx, 76, 32, g.tatami - 76, `fill="${T.drevo}"`);
    s += obdelnik(sx, 76, 4, g.tatami - 76, `fill="${T.drevoHrana}" opacity="0.8"`);
    s += obdelnik(sx + 25, 76, 7, g.tatami - 76, `fill="${T.drevoTma}"`);
    s += obdelnik(sx + 32, 76, 10, g.tatami - 76, `fill="${T.zedTma}" opacity="0.7"`);
  }
  // strop s lištami a trám — stejné jako na stěnách nad tím
  s += obdelnik(x0, 0, w, 38, `fill="${U.strop}"`);
  s += obdelniky([[x0, 11, w, 2], [x0, 24, w, 2]], `fill="${U.stropLista}"`);
  s += obdelnik(x0, 36, w, 40, `fill="${T.drevo}"`);
  s += obdelnik(x0, 36, w, 4, `fill="${T.drevoHrana}" opacity="0.7"`);
  s += obdelnik(x0, 70, w, 6, `fill="${P.drevoTma2}" opacity="0.6"`);
  for (const sx of g.sloupky) s += obdelnik(sx + 6, 52, 20, 10, `rx="2" fill="${P.kovTma}"`) + kruhy([[sx + 11, 57, 1.6], [sx + 21, 57, 1.6]], `fill="${P.kovSvetly}"`);
  return { defs, s };
}

/* ════════════════════ Kraje (široký monitor): fusuma se zlatými mraky ════════════════════ */

/** Pás mraku suyari-gasumi: zaoblený pruh se schodkem na konci */
function mrak(x: number, y: number, w: number, h: number, barva: string) {
  const r = h / 2;
  return `<path d="M${f(x + r)} ${f(y)}H${f(x + w - r)}A${f(r)} ${f(r)} 0 0 1 ${f(x + w - r)} ${f(y + h)}H${f(x + w * 0.62)}V${f(y + h + h * 0.55)}H${f(x + w * 0.18 + r)}A${f(r * 0.55)} ${f(r * 0.55)} 0 0 1 ${f(x + w * 0.18 + r)} ${f(y + h)}H${f(x + r)}A${f(r)} ${f(r)} 0 0 1 ${f(x + r)} ${f(y)}Z" fill="${barva}"/>`;
}

function fusumy(x: number, w: number, g: Geometrie, zrcadlo: boolean) {
  const nahore = g.preklad;
  const dole = g.tatami - 8;
  let s = "";
  // horní práh kamoi a pás stěny nad ním je už nakreslený
  s += obdelnik(x, nahore - 26, w, 26, `fill="${T.drevo}"`) + obdelnik(x, nahore - 26, w, 3, `fill="${T.drevoHrana}"`) + obdelnik(x, nahore - 4, w, 4, `fill="${T.drevoTma}"`);
  const pw = w / 2;
  for (let i = 0; i < 2; i++) {
    const px = x + i * pw;
    s += obdelnik(px, nahore, pw, dole - nahore, `fill="${T.fusuma}"`);
  }
  // mraky jdou přes obě křídla
  const mraky: [number, number, number, number][] = [
    [0.08, 0.1, 0.62, 0.05],
    [0.34, 0.16, 0.6, 0.045],
    [0.0, 0.46, 0.5, 0.05],
    [0.42, 0.52, 0.58, 0.04],
    [0.14, 0.78, 0.72, 0.05],
  ];
  const vyska = dole - nahore;
  for (const [mx, my, mw, mh] of mraky) {
    const xx = zrcadlo ? x + w - (mx + mw) * w : x + mx * w;
    s += mrak(xx, nahore + my * vyska, mw * w, mh * vyska, T.fusumaMrak);
    s += obdelnik(xx + mh * vyska * 0.5, nahore + my * vyska, mw * w - mh * vyska, 3, `fill="${T.fusumaMrakSvetly}" opacity="0.8"`);
  }
  // rámy křídel a úchytky hikite u krajů
  for (let i = 0; i < 2; i++) {
    const px = x + i * pw;
    s += `<path d="M${f(px)} ${f(nahore)}h${f(pw)}v${f(dole - nahore)}h${f(-pw)}z M${f(px + 10)} ${f(nahore + 10)}v${f(dole - nahore - 20)}h${f(pw - 20)}v${f(-(dole - nahore - 20))}z" fill="${T.fusumaRam}" fill-rule="evenodd"/>`;
    s += obdelnik(px + 2, nahore, 2, dole - nahore, `fill="${T.lakOdlesk}" opacity="0.6"`);
    const hx = i === 0 ? px + 34 : px + pw - 34;
    const hy = nahore + vyska * 0.5;
    s += elipsa(hx, hy, 13, 15, `fill="${T.zlatoTma}"`) + elipsa(hx, hy, 10, 12, `fill="${T.lak}"`) + elipsa(hx - 2, hy - 3, 4, 3, `fill="${T.lakOdlesk}" opacity="0.7"`);
  }
  // stín, který křídla vrhají na sebe, a spodní práh
  s += obdelnik(x + pw - 3, nahore, 6, dole - nahore, `fill="${P.inkoust}" opacity="0.35"`);
  s += obdelnik(x, nahore, w, 16, `fill="${P.inkoust}" opacity="0.18"`);
  return s;
}

/* ════════════════════ Okénko shitaji-mado ════════════════════ */

function okenko(g: Geometrie, id: string) {
  const o = g.okno;
  const r = Math.min(o.w, o.h) * 0.22;
  const d = `M${f(o.x + r)} ${f(o.y)}H${f(o.x + o.w - r * 0.8)}Q${f(o.x + o.w)} ${f(o.y)} ${f(o.x + o.w)} ${f(o.y + r * 0.8)}V${f(o.y + o.h - r)}Q${f(o.x + o.w)} ${f(o.y + o.h)} ${f(o.x + o.w - r)} ${f(o.y + o.h)}H${f(o.x + r * 0.7)}Q${f(o.x)} ${f(o.y + o.h)} ${f(o.x)} ${f(o.y + o.h - r * 0.7)}V${f(o.y + r)}Q${f(o.x)} ${f(o.y)} ${f(o.x + r)} ${f(o.y)}Z`;
  let defs = `<clipPath id="${id}-okno"><path d="${d}"/></clipPath>`;
  defs += zare(`${id}-papir-okna`, "#FFFFFF", 0.75, 0.5);
  let s = "";
  // zaoblené ostění: nahoře a vlevo ve stínu, dole a vpravo chytá světlo
  s += `<path d="${d}" fill="${T.zedTma}" transform="translate(-5 -6)"/>`;
  s += `<path d="${d}" fill="${T.zedSvetla}" transform="translate(5 6)"/>`;
  // papír zezadu prosvícený
  s += `<path d="${d}" fill="${T.papirOkna}"/>`;
  s += `<g clip-path="url(#${id}-okno)">`;
  s += elipsa(o.x + o.w * 0.55, o.y + o.h * 0.45, o.w * 0.7, o.h * 0.7, `fill="url(#${id}-papir-okna)"`);
  // příčky papírové stěny za mřížkou (tenké, světlejší)
  let pricky = "";
  for (let i = 1; i < 3; i++) pricky += `M${f(o.x + (i * o.w) / 3)} ${f(o.y)}V${f(o.y + o.h)}`;
  pricky += `M${f(o.x)} ${f(o.y + o.h * 0.5)}H${f(o.x + o.w)}`;
  s += `<path d="${pricky}" stroke="#D9C9A6" stroke-width="2" opacity="0.7"/>`;
  // mřížka z rákosu a bambusu: svisle hustěji a nepravidelně, vodorovně jen pár prutů,
  // na některých křížích ovinutá vistárie
  const r1 = nahoda(Math.round(o.x * 7 + o.y));
  const svisle: [number, number][] = [];
  for (let x = o.x + 8 + r1() * 6; x < o.x + o.w - 6; x += 11 + r1() * 15) svisle.push([x, r1() < 0.28 ? 5.6 : 2.2 + r1() * 1.6]);
  const vodorovne = [0.24, 0.52, 0.8].map((t) => o.y + o.h * (t + (r1() - 0.5) * 0.08));
  for (const y of vodorovne) s += obdelnik(o.x - 4, y - 1.4, o.w + 8, 2.8, `fill="${T.bambusTma}"`) + obdelnik(o.x - 4, y - 1.4, o.w + 8, 1, `fill="${T.bambusSvetly}" opacity="0.7"`);
  for (const [x, sw] of svisle) {
    const tlusty = sw > 5;
    s += obdelnik(x - sw / 2, o.y - 4, sw, o.h + 8, `fill="${tlusty ? T.bambus : T.bambusTma}"`);
    if (tlusty) {
      s += obdelnik(x - sw / 2, o.y - 4, 1.8, o.h + 8, `fill="${T.bambusSvetly}"`);
      s += obdelnik(x - 3.4, o.y + o.h * (0.36 + r1() * 0.2), 6.8, 2.4, `fill="${T.bambusTma}"`);
    }
  }
  let uzly = "";
  vodorovne.forEach((y) =>
    svisle.forEach(([x], i) => {
      if (r1() > 0.32 || i === 0) return;
      for (const d of [-1.8, 1.2]) uzly += `M${f(x - 3.2)} ${f(y + d - 1.6)}l6.4 3.2`;
    }),
  );
  s += `<path d="${uzly}" stroke="${T.stonek}" stroke-width="1.5" stroke-linecap="round"/>`;
  s += `</g>`;
  return { defs, s };
}

/* ════════════════════ Deska hengaku se zlacenými znaky 逸品 ════════════════════ */

function hengaku(g: Geometrie, id: string) {
  const b = g.hengaku;
  let defs = svisly(`${id}-hengaku`, "#40281A", T.hengaku);
  let s = "";
  // šňůry ke dvěma hákům v trámu (níž zavěšená deska visí z lišty nageshi)
  const hakY = b.y > 200 ? 157 : 64;
  for (const [hx, kx] of [[b.x + b.w * 0.22, b.x + b.w * 0.12], [b.x + b.w * 0.78, b.x + b.w * 0.88]] as [number, number][]) {
    s += cara(hx, hakY, kx, b.y + 4, `stroke="${P.inkoust}" stroke-width="2"`) + hrebik(hx, hakY);
  }
  // stín na zdi (deska je nahoře nakloněná dopředu: dole víc)
  s += obdelnik(b.x + 7, b.y + 10, b.w, b.h, `rx="4" fill="${P.inkoust}" opacity="0.45"`);
  // rám a vybrané pole
  s += obdelnik(b.x, b.y, b.w, b.h, `rx="4" fill="${T.hengakuRam}"`);
  s += obdelnik(b.x, b.y, b.w, 3, `rx="2" fill="${T.hengakuHrana}"`) + obdelnik(b.x, b.y, 3, b.h, `fill="${T.hengakuHrana}" opacity="0.6"`);
  s += obdelnik(b.x, b.y + b.h - 6, b.w, 6, `fill="${P.inkoust}" opacity="0.4"`);
  const v = 12;
  s += obdelnik(b.x + v, b.y + v, b.w - 2 * v, b.h - 2 * v, `fill="url(#${id}-hengaku)"`);
  // zkosení pole: nahoře a vlevo stín, dole a vpravo světlo
  s += obdelnik(b.x + v, b.y + v, b.w - 2 * v, 3, `fill="#000000" opacity="0.35"`) + obdelnik(b.x + v, b.y + v, 3, b.h - 2 * v, `fill="#000000" opacity="0.3"`);
  s += obdelnik(b.x + v, b.y + b.h - v - 2, b.w - 2 * v, 2, `fill="${T.hengakuHrana}" opacity="0.6"`);
  // přepážka mezi znaky a nadpisem
  const px = b.x + v + g.znakyW;
  s += obdelnik(px - 2, b.y + v + 10, 2, b.h - 2 * v - 20, `fill="#000000" opacity="0.35"`) + obdelnik(px, b.y + v + 10, 1.4, b.h - 2 * v - 20, `fill="${T.hengakuHrana}" opacity="0.5"`);
  // vyřezané zlacené znaky: stín výřezu, odlesk hrany, zlato
  const zx = b.x + v + g.znakyW / 2;
  const zy = b.y + b.h / 2 + g.znakyVel * 0.36;
  const znaky = (dx: number, dy: number, barva: string, op = 1) =>
    napis(zx + dx, zy + dy, "逸品", g.znakyVel, PISMO.kanji, `text-anchor="middle" letter-spacing="${f(g.znakyVel * 0.06)}" fill="${barva}"${op < 1 ? ` opacity="${op}"` : ""}`);
  s += znaky(1.6, 2, "#000000", 0.6) + znaky(-1, -1, T.zlatoSvetle, 0.85) + znaky(0, 0, T.zlato);
  // kování v rozích
  for (const [rx, ry, sx, sy] of [[b.x + 4, b.y + 4, 1, 1], [b.x + b.w - 4, b.y + 4, -1, 1], [b.x + 4, b.y + b.h - 4, 1, -1], [b.x + b.w - 4, b.y + b.h - 4, -1, -1]] as [number, number, number, number][]) {
    s += `<path d="M${f(rx)} ${f(ry)}h${f(sx * 26)}l${f(-sx * 6)} ${f(sy * 6)}h${f(-sx * 14)}v${f(sy * 14)}l${f(-sx * 6)} ${f(sy * 6)}z" fill="${T.zlatoTma}"/>`;
    s += `<path d="M${f(rx)} ${f(ry)}h${f(sx * 26)}l${f(-sx * 2)} ${f(sy * 2)}h${f(-sx * 22)}v${f(sy * 22)}l${f(-sx * 2)} ${f(sy * 2)}z" fill="${T.zlato}" opacity="0.8"/>`;
    s += kruh(rx + sx * 8, ry + sy * 8, 1.8, `fill="${T.zlatoSvetle}"`);
  }
  return { defs, s };
}

/* ════════════════════ Výklenek tokonoma ════════════════════ */

function vyklenek(g: Geometrie, id: string) {
  const L = g.tokoL;
  const R = g.tokoP;
  const w = R - L;
  const yT = g.preklad;
  let defs = svisly(`${id}-nika`, T.nikaTma, T.nika);
  defs += zare(`${id}-svatozar`, T.svetlo, 0.34, 0.42);
  defs += svisly(`${id}-deska`, T.deskaTma, T.deska);
  defs += vodorovny(`${id}-gamachi`, [[0, T.lakSvetly], [0.3, T.lak], [0.55, "#3A2A20"], [0.7, T.lak], [1, T.lak]]);
  defs += zare(`${id}-louze`, T.svetlo, 0.3, 0.5);
  let s = "";
  // zadní stěna výklenku: v šeru, za hrnkem světlo z okénka
  s += obdelnik(L, yT, w, g.zadDesky - yT, `fill="url(#${id}-nika)"`);
  s += elipsa(g.pata[0] - 30, g.pata[1] - 230, w * 0.36, (g.zadDesky - yT) * 0.42, `fill="url(#${id}-svatozar)"`);
  // stín pod překladem a v koutech
  s += obdelnik(L, yT, w, 60, `fill="#000000" opacity="0.22"`) + obdelnik(L, yT, w, 22, `fill="#000000" opacity="0.18"`);
  s += obdelnik(R - 34, yT, 34, g.zadDesky - yT, `fill="#000000" opacity="0.2"`) + obdelnik(L, yT, 16, g.zadDesky - yT, `fill="#000000" opacity="0.12"`);
  // deska tokoita: leštěná, odráží světlo okénka
  const dh = g.tokoita - g.zadDesky;
  s += obdelnik(L, g.zadDesky, w, dh, `fill="url(#${id}-deska)"`);
  s += obdelnik(L, g.zadDesky, w, 3, `fill="#000000" opacity="0.4"`);
  const r = nahoda(Math.round(L + dh));
  let lesk = "";
  for (let i = 0; i < 5; i++) {
    const y = g.zadDesky + 10 + r() * (dh - 20);
    const x = L + r() * w * 0.5;
    lesk += `M${f(x)} ${f(y)}h${f(80 + r() * w * 0.4)}`;
  }
  s += `<path d="${lesk}" stroke="${T.deskaSvetla}" stroke-width="2.2" opacity="0.45" stroke-linecap="round"/>`;
  s += elipsa(g.pata[0] - 40, g.pata[1] + 6, g.podstavec.rx * 1.7, dh * 0.62, `fill="url(#${id}-louze)"`);
  // přední hrana toko-gamachi: černý lak s pruhem odlesku
  s += obdelnik(L - g.sloupek, g.tokoita, w + 2 * g.sloupek, 32, `fill="url(#${id}-gamachi)"`);
  s += obdelnik(L - g.sloupek, g.tokoita, w + 2 * g.sloupek, 2.4, `fill="${T.lakOdlesk}"`);
  s += obdelnik(L - g.sloupek + 30, g.tokoita + 9, w * 0.42, 2, `fill="${T.lakOdlesk}" opacity="0.5"`);
  // překlad otoshigake
  s += obdelnik(L, yT - 26, w, 26, `fill="${T.drevo}"`) + obdelnik(L, yT - 26, w, 3, `fill="${T.drevoHrana}"`) + obdelnik(L, yT - 5, w, 5, `fill="${T.drevoTma}"`);
  // levý sloupek: hraněný
  const sl = g.sloupek;
  s += obdelnik(L - sl, yT - 30, sl, g.tatami - yT + 30, `fill="${T.drevo}"`);
  s += obdelnik(L - sl, yT - 30, 4, g.tatami - yT + 30, `fill="${T.drevoHrana}"`) + obdelnik(L - 8, yT - 30, 8, g.tatami - yT + 30, `fill="${T.drevoTma}"`);
  return { defs, s };
}

/** Tokobashira: oloupaný kmen, pár suků, světlo zleva */
function tokobashira(g: Geometrie, id: string) {
  const x = g.tokoP;
  const w = g.sloupek;
  const y0 = g.preklad - 30;
  const y1 = g.tatami;
  const defs = vodorovny(`${id}-kmen`, [[0, T.kmenSvetly], [0.3, T.kmen], [0.75, T.kmenStin], [1, "#5E3F26"]]);
  // obrys kmene lehce zvlněný
  const r = nahoda(Math.round(x));
  const kroky = 9;
  const leva: Bod[] = [];
  const prava: Bod[] = [];
  for (let i = 0; i <= kroky; i++) {
    const y = y0 + ((y1 - y0) * i) / kroky;
    const v = (r() - 0.5) * 2.4;
    leva.push([x + v, y]);
    prava.push([x + w + v * 0.6 + (r() - 0.5) * 1.6, y]);
  }
  let s = `<path d="M${leva.map(([a, b]) => `${f(a)} ${f(b)}`).join("L")}L${prava.reverse().map(([a, b]) => `${f(a)} ${f(b)}`).join("L")}Z" fill="url(#${id}-kmen)"/>`;
  // lesk zleva a pár dlouhých zvlněných vrásek po lisování kmene (shibori), ne textura
  s += obdelnik(x + w * 0.12, y0, w * 0.14, y1 - y0, `fill="${T.kmenSvetly}" opacity="0.55"`);
  let vrasky = "";
  for (const [vx, a, b, faze] of [[0.36, 0.06, 0.62, 0], [0.58, 0.3, 0.94, 1.7], [0.74, 0.1, 0.5, 3.1]] as [number, number, number, number][]) {
    const body: string[] = [];
    for (let i = 0; i <= 24; i++) {
      const y = y0 + (y1 - y0) * (a + ((b - a) * i) / 24);
      body.push(`${f(x + w * vx + Math.sin(i * 0.9 + faze) * 1.6)} ${f(y)}`);
    }
    vrasky += `M${body.join("L")}`;
  }
  s += `<path d="${vrasky}" stroke="${T.kmenStin}" stroke-width="1.4" fill="none" opacity="0.55"/>`;
  // suky
  const suky: [number, number, number][] = [[0.42, 0.34, 1], [0.66, 0.6, 0.8], [0.3, 0.82, 0.7]];
  for (const [sx, sy, vel] of suky) {
    const cx = x + w * sx;
    const cy = y0 + (y1 - y0) * sy;
    s += elipsa(cx, cy, 6.5 * vel, 9 * vel, `fill="${T.sukKruh}"`) + elipsa(cx + 0.6, cy + 0.8, 3.4 * vel, 5.2 * vel, `fill="${T.suk}"`) + elipsa(cx - 1.6, cy - 2.4, 1.6 * vel, 2.2 * vel, `fill="${T.kmenSvetly}" opacity="0.6"`);
  }
  // stín kmene na zdi
  s += obdelnik(x + w, y0, 9, y1 - y0, `fill="${T.zedTma}" opacity="0.65"`);
  return { defs, s };
}

/* ════════════════════ Svitek kakejiku s modrotiskem ════════════════════ */

/** Modrotisk Futatsu složený na výšku z částí výkresu (futatsu/kresba.ts) */
function vykres(h: Obdelnik, id: string) {
  const BW = 640;
  const BH = Math.round((BW * h.h) / h.w);
  const vid = `${id}-v`;
  const o = { s: 3.2, fs: 1.25, w: 1.7, a: 62, id: vid, b2: 205 };
  const vF = { ...o, cx: 320, y0: 140 };
  const grid = 10 * o.s;
  const dB: [number, number, number] = [158, BH - 214, 80];
  let defs = defsTelo(vid, BW, BH, vF.cx, vF.y0, o.s) + vzory(vid, o.w);
  defs += `<clipPath id="${vid}-dB"><circle cx="${dB[0]}" cy="${dB[1]}" r="${dB[2]}"/></clipPath>`;
  defs += `<pattern id="${vid}-mrizka" width="${f(grid)}" height="${f(grid)}" patternUnits="userSpaceOnUse" x="34" y="34"><path d="M${f(grid)} 0V${f(grid)}H0" class="fk-mriz" stroke-width="1.4"/></pattern>`;
  defs += `<radialGradient id="${vid}-papir" cx="0.5" cy="0.42" r="0.75"><stop offset="0.55" stop-color="${T.modrotisk}"/><stop offset="1" stop-color="${T.modrotiskTma}"/></radialGradient>`;
  let s = `<rect width="${BW}" height="${BH}" fill="url(#${vid}-papir)"/>`;
  s += `<rect x="34" y="34" width="${BW - 68}" height="${BH - 68}" style="fill:url(#${vid}-mrizka)"/>`;
  s += ram(o, BW, BH, 4, 5);
  s += zepredu(vF) + titulek(vF.cx, vF.y0 + 85 * o.s + 36 * o.fs, "POHLED ZEPŘEDU", o, "");
  s += detailB(o, dB[0], dB[1], dB[2], true);
  // razítko o chlup menším písmem, ať se datum a podpis vejdou do políček
  s += razitko({ ...o, fs: 1.1 }, 300, BH - 266, 304, 186);
  return `<svg x="${f(h.x)}" y="${f(h.y)}" width="${f(h.w)}" height="${f(h.h)}" viewBox="0 0 ${BW} ${BH}" preserveAspectRatio="none" class="fk-svg"><defs>${defs}</defs>${s}</svg>`;
}

function svitek(g: Geometrie, id: string) {
  const sv = g.svitek;
  const cx = sv.cx;
  const x = cx - sv.w / 2;
  const hn = g.honshi;
  const chi = Math.round(sv.ten * 0.85);
  const yTen = sv.y + 8;
  const yNaka = yTen + sv.ten;
  const yNakaKonec = hn.y + hn.h + 10 + 12;
  const yChi = yNakaKonec;
  const yJiku = yChi + chi;
  let defs = vodorovny(`${id}-ten`, [[0, T.ten], [0.7, T.ten], [1, T.tenStin]]);
  defs += vodorovny(`${id}-jiku`, [[0, "#5E4A3C"], [0.25, T.jiku], [1, "#0E0907"]]);
  let s = "";
  // háček a šňůra kakehimo
  s += cara(cx, sv.y - 22, x + sv.w * 0.18, sv.y + 2, `stroke="${T.ichimonjiTma}" stroke-width="2"`) + cara(cx, sv.y - 22, x + sv.w * 0.82, sv.y + 2, `stroke="${T.ichimonjiTma}" stroke-width="2"`) + hrebik(cx, sv.y - 22);
  // stín na zadní stěně (světlo zleva)
  s += obdelnik(x + 9, yTen + 6, sv.w, yJiku - yTen, `fill="#000000" opacity="0.32"`);
  // horní tyčka hasso
  s += zaoblene(x - 4, sv.y, sv.w + 8, 9, 3, `fill="${T.jiku}"`) + obdelnik(x - 2, sv.y + 1, sv.w + 4, 1.6, `fill="#5E4A3C"`);
  // horní a spodní pole (ten, chi), krémové hedvábí
  s += obdelnik(x, yTen, sv.w, sv.ten, `fill="url(#${id}-ten)"`) + obdelnik(x, yChi, sv.w, chi, `fill="url(#${id}-ten)"`);
  // lem kolem papíru (nakamawashi): rezavý brokát s jemnou zlatou nitkou
  s += obdelnik(x, yNaka, sv.w, yNakaKonec - yNaka, `fill="${T.naka}"`);
  s += obdelnik(x, yNaka, sv.w, 2, `fill="${T.nakaSvetla}"`) + obdelnik(x, yNaka, 3, yNakaKonec - yNaka, `fill="${T.nakaSvetla}" opacity="0.7"`);
  s += `<rect x="${f(x + 7)}" y="${f(yNaka + 5)}" width="${f(sv.w - 14)}" height="${f(yNakaKonec - yNaka - 10)}" fill="none" stroke="${T.ichimonji}" stroke-width="0.9" opacity="0.55"/>`;
  // proužky ichimonji nad a pod papírem
  s += obdelnik(hn.x, hn.y - 10, hn.w, 10, `fill="${T.ichimonji}"`) + obdelnik(hn.x, hn.y + hn.h, hn.w, 10, `fill="${T.ichimonji}"`);
  s += obdelniky([[hn.x, hn.y - 10, hn.w, 1.6], [hn.x, hn.y + hn.h + 8.4, hn.w, 1.6]], `fill="${T.ichimonjiTma}"`);
  // papír: modrotisk
  s += vykres(hn, id);
  s += obdelnik(hn.x, hn.y, hn.w, 3, `fill="#000000" opacity="0.25"`);
  // stuhy futai visí z tyčky přes horní pole
  for (const fx of [x + sv.w * 0.27, x + sv.w * 0.73]) {
    s += obdelnik(fx - 8 + 3, yTen + 2, 16, sv.ten - 4, `fill="#000000" opacity="0.18"`);
    s += obdelnik(fx - 8, yTen, 16, sv.ten - 6, `fill="${T.ichimonji}"`) + obdelnik(fx - 8, yTen, 3, sv.ten - 6, `fill="${T.zlatoSvetle}" opacity="0.5"`);
    s += obdelnik(fx - 8, yTen + sv.ten - 9, 16, 3, `fill="${T.ichimonjiTma}"`);
  }
  // spodní váleček jiku s koncovkami
  s += zaoblene(x - 2, yJiku, sv.w + 4, 14, 6, `fill="url(#${id}-jiku)"`);
  for (const kx of [x - 16, x + sv.w + 2]) s += zaoblene(kx, yJiku - 2, 14, 18, 6, `fill="${T.jiku}"`) + obdelnik(kx + 3, yJiku + 1, 3, 10, `rx="1.5" fill="#6A5545"`);
  // pod myší na svitek padne trochu světla (stránka mění opacity)
  s += obdelnik(x, yTen, sv.w, yJiku - yTen, `class="o2t-svitek-svetlo" fill="${T.svetlo}" opacity="0"`);
  return { defs, s: `<g class="o2t-svitek-kresba">${s}</g>` };
}

/* ════════════════════ Závěsná bambusová váza s kamélií ════════════════════ */

function list(cx: number, cy: number, delka: number, uhel: number) {
  const sirka = delka * 0.42;
  const tvar = `M${f(cx)} ${f(cy)} C${f(cx + delka * 0.3)} ${f(cy - sirka)} ${f(cx + delka * 0.8)} ${f(cy - sirka * 0.7)} ${f(cx + delka)} ${f(cy)} C${f(cx + delka * 0.8)} ${f(cy + sirka * 0.7)} ${f(cx + delka * 0.3)} ${f(cy + sirka)} ${f(cx)} ${f(cy)}Z`;
  const horni = `M${f(cx)} ${f(cy)} C${f(cx + delka * 0.3)} ${f(cy - sirka)} ${f(cx + delka * 0.8)} ${f(cy - sirka * 0.7)} ${f(cx + delka)} ${f(cy)} C${f(cx + delka * 0.7)} ${f(cy - sirka * 0.12)} ${f(cx + delka * 0.3)} ${f(cy - sirka * 0.1)} ${f(cx)} ${f(cy)}Z`;
  const s = `<path d="${tvar}" fill="${T.list}"/><path d="${horni}" fill="${T.listSvetly}"/>` + `<path d="M${f(cx + 2)} ${f(cy)} Q${f(cx + delka * 0.5)} ${f(cy - sirka * 0.08)} ${f(cx + delka * 0.94)} ${f(cy)}" stroke="${T.listZila}" stroke-width="1.3" fill="none" opacity="0.7"/>`;
  return otoc(uhel, cx, cy, s);
}

/** Okvětní lístek: zaoblený vějíř od báze (bx, by) směrem uhel, délka d, šířka š */
function lupen(bx: number, by: number, uhel: number, d: number, sir: number, barva: string, atributy = "") {
  const t = `M0 0 C${f(-sir * 0.5)} ${f(-d * 0.1)} ${f(-sir * 0.62)} ${f(-d * 0.72)} ${f(-sir * 0.3)} ${f(-d * 0.96)} Q0 ${f(-d * 1.08)} ${f(sir * 0.3)} ${f(-d * 0.96)} C${f(sir * 0.62)} ${f(-d * 0.72)} ${f(sir * 0.5)} ${f(-d * 0.1)} 0 0Z`;
  return `<path d="${t}" fill="${barva}" ${atributy} transform="translate(${f(bx)} ${f(by)}) rotate(${f(uhel)})"/>`;
}

/** Kamélie tsubaki napůl rozvitá: zadní lístky do kalichu, vysoký sloupek srostlých tyčinek,
 *  dva boční lístky rozevřené ven a malý přední — sloupek zůstane vidět */
function kamelie(cx: number, cy: number, r: number) {
  // zadní lístky (ve stínu)
  let s = lupen(cx, cy + r * 0.3, -64, r * 1.06, r * 1.0, T.kvetTma);
  s += lupen(cx, cy + r * 0.3, 60, r * 1.02, r * 1.0, T.kvetTma);
  s += lupen(cx, cy + r * 0.3, -4, r * 1.16, r * 0.98, "#9A2026");
  s += lupen(cx - r * 0.02, cy + r * 0.28, -8, r * 0.9, r * 0.5, "#A8252B", `opacity="0.7"`);
  // sloupek srostlých tyčinek, nahoře věnec prašníků
  s += `<path d="M${f(cx - r * 0.13)} ${f(cy + r * 0.16)} L${f(cx - r * 0.27)} ${f(cy - r * 0.66)} Q${f(cx)} ${f(cy - r * 0.8)} ${f(cx + r * 0.27)} ${f(cy - r * 0.66)} L${f(cx + r * 0.13)} ${f(cy + r * 0.16)} Z" fill="#EFDCA0"/>`;
  s += `<path d="M${f(cx - r * 0.13)} ${f(cy + r * 0.16)} L${f(cx - r * 0.27)} ${f(cy - r * 0.66)} L${f(cx - r * 0.1)} ${f(cy - r * 0.72)} L${f(cx - r * 0.03)} ${f(cy + r * 0.16)} Z" fill="#FFF6D6" opacity="0.85"/>`;
  s += elipsa(cx, cy - r * 0.68, r * 0.28, r * 0.1, `fill="${T.tycinky}"`);
  s += kruhy([-0.2, -0.1, 0, 0.1, 0.2].map((t, i): [number, number, number] => [cx + t * r, cy - r * (0.7 + (i % 2) * 0.04), r * 0.05]), `fill="#C99A2E"`);
  // boční lístky rozevřené ven, světlo zleva
  s += lupen(cx - r * 0.1, cy + r * 0.38, -50, r * 0.94, r * 0.9, T.kvet);
  s += lupen(cx - r * 0.14, cy + r * 0.36, -54, r * 0.64, r * 0.44, T.kvetSvetly, `opacity="0.75"`);
  s += lupen(cx + r * 0.1, cy + r * 0.4, 46, r * 0.9, r * 0.9, "#A82428");
  // malý přední lístek kryje jen patu sloupku
  s += lupen(cx, cy + r * 0.46, 0, r * 0.4, r * 0.92, T.kvet);
  s += lupen(cx - r * 0.06, cy + r * 0.44, -4, r * 0.26, r * 0.42, T.kvetSvetly, `opacity="0.6"`);
  // kalich
  s += elipsa(cx, cy + r * 0.5, r * 0.22, r * 0.11, `fill="#4A5A30"`);
  return s;
}

function kakehanaire(g: Geometrie) {
  const [hx, hy] = g.vaza;
  const w = g.rozvrzeni === "siroka" ? 40 : 32;
  const vyska = g.rozvrzeni === "siroka" ? 196 : 156;
  const x = hx - w / 2;
  const y = hy + 14;
  let s = "";
  // hřebík a krátké poutko
  s += hrebik(hx, hy) + `<path d="M${f(hx - 5)} ${f(y + 4)} Q${f(hx)} ${f(hy - 6)} ${f(hx + 5)} ${f(y + 4)}" stroke="${T.stonek}" stroke-width="2" fill="none"/>`;
  // stín vázy na kmeni
  s += obdelnik(x + 6, y + 6, w, vyska, `rx="5" fill="#000000" opacity="0.3"`);
  // tělo z bambusu: světlo zleva, kolénko ve třetině
  s += obdelnik(x, y, w, vyska, `rx="5" fill="${T.bambus}"`);
  s += obdelnik(x, y, w * 0.32, vyska, `rx="4" fill="${T.bambusSvetly}" opacity="0.85"`);
  s += obdelnik(x + w * 0.74, y, w * 0.26, vyska, `rx="4" fill="${T.bambusTma}" opacity="0.8"`);
  const uzel = y + vyska * 0.66;
  s += obdelnik(x - 1.5, uzel, w + 3, 5, `rx="2.5" fill="${T.bambusTma}"`) + obdelnik(x - 1.5, uzel, w * 0.4, 2, `fill="${T.bambusSvetly}"`);
  // výřez okna (ichijū-giri) a tma uvnitř
  const oy = y + vyska * 0.2;
  s += `<path d="M${f(x + 4)} ${f(oy + 30)} V${f(oy + 6)} Q${f(x + w / 2)} ${f(oy - 4)} ${f(x + w - 4)} ${f(oy + 6)} V${f(oy + 30)} Z" fill="#2A1C10"/>`;
  s += obdelnik(x + 4, oy + 28, w - 8, 3, `fill="${T.bambusSvetly}" opacity="0.8"`);
  s += obdelnik(x, y + vyska - 4, w, 4, `rx="2" fill="${T.bambusTma}"`);
  // větvička kamélie: z okna se obloukem sklání doleva ke světlu, na konci květ, výš poupě
  const sx = x + w * 0.42;
  const sy = oy + 16;
  const dl = g.rozvrzeni === "siroka" ? 1.22 : 0.8;
  const p = (dx: number, dy: number): Bod => [sx + dx * dl, sy + dy * dl];
  const [kx, ky] = p(-92, 4);
  const vetev = `M${f(sx)} ${f(sy)} C${f(p(-24, -22)[0])} ${f(p(-24, -22)[1])} ${f(p(-62, -26)[0])} ${f(p(-62, -26)[1])} ${f(kx + 8)} ${f(ky - 14)}`;
  const vetvicka = `M${f(p(-30, -16)[0])} ${f(p(-30, -16)[1])} C${f(p(-36, -48)[0])} ${f(p(-36, -48)[1])} ${f(p(-24, -78)[0])} ${f(p(-24, -78)[1])} ${f(p(-10, -104)[0])} ${f(p(-10, -104)[1])}`;
  s += `<path d="${vetev}" stroke="${T.stonek}" stroke-width="${f(4.4 * dl)}" fill="none" stroke-linecap="round"/>`;
  s += `<path d="${vetvicka}" stroke="${T.stonek}" stroke-width="${f(3 * dl)}" fill="none" stroke-linecap="round"/>`;
  // listy střídavě podél větve (lesklé, horní polovina chytá světlo)
  s += list(...p(-14, -10), 54 * dl, 168) + list(...p(-40, -24), 60 * dl, 214) + list(...p(-58, -24), 50 * dl, 128);
  s += list(...p(-34, -50), 50 * dl, 196) + list(...p(-28, -80), 44 * dl, -40) + list(...p(-18, -92), 40 * dl, 222);
  // poupě na konci větvičky
  const [bx, by] = p(-10, -104);
  s += elipsa(bx, by - 6 * dl, 8 * dl, 11 * dl, `fill="${T.list}"`) + elipsa(bx + 0.5, by - 12 * dl, 5 * dl, 6.4 * dl, `fill="${T.kvet}"`) + elipsa(bx - 1.6 * dl, by - 14 * dl, 1.8 * dl, 2.6 * dl, `fill="${T.kvetSvetly}"`);
  s += kamelie(kx, ky, 38 * dl);
  return s;
}

/* ════════════════════ Hrnek: lakovaný podstavec, odraz, krabice ════════════════════ */

function podstavec(g: Geometrie, id: string) {
  const [cx, cy] = g.pata;
  const { rx, ry } = g.podstavec;
  const hrana = 11;
  let defs = vodorovny(`${id}-podstavec`, [[0, "#3A2A20"], [0.2, T.lakSvetly], [0.5, T.lak], [1, "#0B0705"]]);
  defs += `<clipPath id="${id}-vrch"><ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx - 2)}" ry="${f(ry - 1)}"/></clipPath>`;
  defs += `<linearGradient id="${id}-odraz" gradientUnits="userSpaceOnUse" x1="0" y1="${f(cy)}" x2="0" y2="${f(cy + ry)}"><stop offset="0" stop-color="${BARVY.shinoStin}" stop-opacity="0.62"/><stop offset="0.5" stop-color="${BARVY.shinoStin}" stop-opacity="0.26"/><stop offset="1" stop-color="${BARVY.shinoStin}" stop-opacity="0"/></linearGradient>`;
  defs += zare(`${id}-lesk`, T.svetlo, 0.3, 0.5);
  let s = "";
  // stín podstavce na desce (světlo zleva: doprava)
  s += elipsa(cx + 26, cy + ry + hrana + 8, rx * 0.98, ry * 0.42, `fill="#000000" opacity="0.4"`);
  // nízký sokl
  s += `<path d="M${f(cx - rx * 0.86)} ${f(cy + hrana)} L${f(cx - rx * 0.8)} ${f(cy + ry + hrana + 12)} H${f(cx + rx * 0.8)} L${f(cx + rx * 0.86)} ${f(cy + hrana)} Z" fill="${T.lak}"/>`;
  s += obdelnik(cx - rx * 0.8, cy + ry + hrana + 8, rx * 1.6, 4, `fill="${T.lakOdlesk}" opacity="0.4"`);
  // bok desky: spodní půlka elipsy posunutá o tloušťku
  s += `<path d="M${f(cx - rx)} ${f(cy)} A${f(rx)} ${f(ry)} 0 0 0 ${f(cx + rx)} ${f(cy)} V${f(cy + hrana)} A${f(rx)} ${f(ry)} 0 0 1 ${f(cx - rx)} ${f(cy + hrana)} Z" fill="url(#${id}-podstavec)"/>`;
  // vrch: lesklý černý lak, odlesk okénka vzadu
  s += elipsa(cx, cy, rx, ry, `fill="${T.lakSvetly}"`);
  s += elipsa(cx, cy, rx - 3, ry - 2, `fill="${T.lak}"`);
  s += `<g clip-path="url(#${id}-vrch)">`;
  s += elipsa(cx - rx * 0.28, cy - ry * 0.5, rx * 0.7, ry * 0.75, `fill="url(#${id}-lesk)"`);
  // odraz hrnku v laku
  s += `<path d="${obrys({ uhel: 62, nadhled: 14 })}" fill="url(#${id}-odraz)" transform="translate(${f(cx)} ${f(cy)}) scale(${g.k} ${-g.k}) translate(${-PODOBIZNA.pata[0]} ${-PODOBIZNA.pata[1]})"/>`;
  // stín hrnku ke světlu odvrácený (doprava dozadu)
  s += elipsa(cx + 92 * (g.k / 3.5), cy - 8 * (g.k / 3.5), 130 * (g.k / 3.5), ry * 0.42, `fill="#000000" opacity="0.32"`);
  s += `</g>`;
  // zlatá linka na hraně
  s += `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx - 1.5)}" ry="${f(ry - 1)}" fill="none" stroke="${T.zlato}" stroke-width="1.4" opacity="0.7"/>`;
  s += `<path d="M${f(cx - rx)} ${f(cy)} A${f(rx)} ${f(ry)} 0 0 0 ${f(cx + rx)} ${f(cy)}" fill="none" stroke="${T.lakOdlesk}" stroke-width="1.6" opacity="0.6"/>`;
  return { defs, s };
}

/** Krabice z paulovnie bez víka (tomobako) a víko s nápisem 二つ a pečetí, opřené o její pravý bok.
 *  Krabice stojí v šeru za hrnkem — je kulisa, světlo patří hrnku. */
function tomobako(g: Geometrie, id: string) {
  const b = g.krabice;
  const pata = b.y + b.h;
  const vrch = Math.round(b.h * 0.15);
  const hloubka = Math.round(b.w * 0.1);
  let defs = vodorovny(`${id}-kiri`, [[0, "#D3BE93"], [0.4, "#BFA87C"], [1, "#9C855E"]]);
  defs += vodorovny(`${id}-viko`, [[0, "#E2CFA6"], [0.55, "#CDB68A"], [1, "#B39B70"]]);
  let s = "";
  // stín krabice na desce (doprava od světla)
  s += mnohouhelnik([[b.x + 8, pata], [b.x + b.w + 30, pata - 4], [b.x + b.w + 54, pata + 10], [b.x + 18, pata + 12]], `fill="#000000" opacity="0.34"`);
  // čelo, bok a horní hrany stěn; krabice je otevřená, shora je vidět tma uvnitř
  s += obdelnik(b.x, b.y, b.w, b.h, `fill="url(#${id}-kiri)"`);
  s += mnohouhelnik([[b.x + b.w, b.y], [b.x + b.w + hloubka, b.y - vrch], [b.x + b.w + hloubka, pata - vrch], [b.x + b.w, pata]], `fill="#8A7452"`);
  s += mnohouhelnik([[b.x, b.y], [b.x + hloubka, b.y - vrch], [b.x + b.w + hloubka, b.y - vrch], [b.x + b.w, b.y]], `fill="#DCC9A0"`);
  s += mnohouhelnik([[b.x + 5, b.y - 1.5], [b.x + hloubka + 3, b.y - vrch + 4], [b.x + b.w + hloubka - 4, b.y - vrch + 4], [b.x + b.w - 5, b.y - 1.5]], `fill="#3E2E1E"`);
  s += mnohouhelnik([[b.x + 5, b.y - 1.5], [b.x + hloubka + 3, b.y - vrch + 4], [b.x + hloubka + 3, b.y - vrch + 12], [b.x + 5, b.y + 6]], `fill="#5A4630"`);
  // dřevo naznačené dvěma čárkami
  s += `<path d="M${f(b.x + b.w * 0.3)} ${f(b.y + 8)}v${f(b.h - 16)}M${f(b.x + b.w * 0.66)} ${f(b.y + 14)}v${f(b.h - 30)}" stroke="#9C855E" stroke-width="1.2" opacity="0.7"/>`;
  // víko: stojí na desce, horní hranou opřené o bok krabice, nápis k divákovi
  const vw = b.w * 0.86;
  const vh = b.w * 0.86;
  const uhel = 8;
  const vx = b.x + b.w + hloubka * 0.5 + vh * Math.sin((uhel * Math.PI) / 180);
  const vp = pata + 12;
  const vy = vp - vh;
  let v = obdelnik(vx + 7, vy + 7, vw, vh, `fill="#000000" opacity="0.34"`);
  v += obdelnik(vx - 8, vy + 2, 8, vh - 2, `fill="#9C855E"`);
  v += obdelnik(vx, vy, vw, vh, `fill="url(#${id}-viko)"`);
  v += obdelnik(vx, vy, vw, 3, `fill="#EDDDB8"`) + obdelnik(vx, vy + vh - 4, vw, 4, `fill="#9C855E"`);
  // hakogaki: jméno kusu štětcem a pečeť dílny
  const nx = vx + vw * 0.56;
  const vel = vw * 0.25;
  v += svisle(nx, vy + vh * 0.12 + vel * 0.86, "二つ", vel, vel * 1.12, `fill="${P.inkoust}"`);
  const ps = vw * 0.19;
  const py = vy + vh * 0.12 + vel * 2.42;
  v += obdelnik(nx - ps / 2, py, ps, ps, `rx="2" fill="none" stroke="${P.rumelka}" stroke-width="1.8"`);
  v += svisle(nx, py + ps * 0.33, "ジロ作", ps * 0.27, ps * 0.29, `fill="${P.rumelka}"`);
  s += otoc(-uhel, vx, vp, v);
  return { defs, s };
}

/** Rozvázaná šňůra sanada-himo: leží na desce v obloucích od krabice dopředu */
function himo(g: Geometrie) {
  const b = g.krabice;
  const pata = b.y + b.h;
  const m = b.w / 146;
  const x = b.x + b.w * 0.6;
  // deska je zkrácená pohledem shora: oblouky šňůry jsou placaté
  const q = (dx: number, dy: number) => `${f(x + dx * m)} ${f(pata + dy * m * 0.62)}`;
  const d = `M${q(0, -1)} C${q(6, 30)} ${q(30, 46)} ${q(64, 44)} C${q(100, 42)} ${q(130, 70)} ${q(96, 84)} C${q(60, 98)} ${q(10, 84)} ${q(-8, 100)}`;
  let s = `<path d="${d}" stroke="#000000" stroke-width="6" fill="none" opacity="0.32" transform="translate(3 3)" stroke-linecap="round"/>`;
  s += `<path d="${d}" stroke="${U.snura}" stroke-width="5.4" fill="none" stroke-linecap="round"/>`;
  s += `<path d="${d}" stroke="#9A6A8C" stroke-width="1.6" fill="none" stroke-dasharray="5 4" opacity="0.8" stroke-linecap="round" transform="translate(-0.5 -1.3)"/>`;
  // roztřepený konec
  const [kx, ky] = [x - 8 * m, pata + 100 * m * 0.62];
  s += `<path d="M${f(kx)} ${f(ky)}l-7 -2M${f(kx)} ${f(ky)}l-8 2M${f(kx)} ${f(ky)}l-5 5" stroke="${U.snura}" stroke-width="1.6" stroke-linecap="round"/>`;
  return s;
}

/* ════════════════════ Podlaha: tatami, zabuton, agari-kamachi, doma, kámen a geta ════════════════════ */

function tatami(g: Geometrie, id: string) {
  const x0 = -g.ext;
  const w = g.W + 2 * g.ext;
  const y0 = g.tatami;
  const y1 = g.kamachi;
  const stred = y0 + (y1 - y0) * 0.36;
  let defs = svisly(`${id}-tatami`, T.tatamiStin, T.tatami);
  let s = obdelnik(x0, y0, w, y1 - y0, `fill="url(#${id}-tatami)"`);
  // lesk rákosu: pár světlejších pruhů v každé řadě
  for (const [a, b] of [[y0, stred], [stred, y1]] as [number, number][]) {
    const h = b - a;
    s += obdelniky([[x0, a + h * 0.3, w, h * 0.12], [x0, a + h * 0.62, w, h * 0.08]], `fill="${T.tatamiSvetle}" opacity="0.35"`);
  }
  // lemy heri podél dlouhých stran a spáry kratších stran, řady přesazené
  s += obdelniky([[x0, y0, w, 5], [x0, stred - 4, w, 8], [x0, y1 - 8, w, 8]], `fill="${T.heri}"`);
  s += obdelniky([[x0, stred - 4, w, 1.6], [x0, y1 - 8, w, 1.6]], `fill="${T.heriSvetle}"`);
  let spary = "";
  const krok = g.rozvrzeni === "siroka" ? 560 : 420;
  for (let x = g.W / 2 - krok * 3; x < g.W + g.ext; x += krok) spary += `M${f(x)} ${f(y0 + 5)}V${f(stred - 4)}`;
  for (let x = g.W / 2 - krok * 3.5; x < g.W + g.ext; x += krok) spary += `M${f(x)} ${f(stred + 4)}V${f(y1 - 8)}`;
  s += `<path d="${spary}" stroke="${T.tatamiStin}" stroke-width="2.4"/>`;
  s += obdelnik(x0, y0, w, 18, `fill="#000000" opacity="0.18"`);
  // záře lampy a světlo z okénka na rohožích
  defs += zare(`${id}-zar-tatami`, T.andonZar, 0.36, 0.4);
  s += `<g class="o2t-zar">${elipsa(g.andon[0], g.andon[1] - 10, 360, (y1 - y0) * 0.8, `fill="url(#${id}-zar-tatami)"`)}</g>`;
  return { defs, s };
}

/** Zabuton: plochý polštář, okraje vyboulené, uprostřed prošití, v rozích střapce */
function zabuton(g: Geometrie) {
  if (!g.zabuton) return "";
  const { cx, y, w } = g.zabuton;
  const hl = 56;
  const tl = 15;
  const zw = w * 0.9;
  const BL: Bod = [cx - zw / 2, y];
  const BR: Bod = [cx + zw / 2, y];
  const FR: Bod = [cx + w / 2, y + hl];
  const FL: Bod = [cx - w / 2, y + hl];
  const bok = (w + zw) / 4 + 12;
  const vrch = `M${f(BL[0])} ${f(BL[1])} Q${f(cx)} ${f(y - 9)} ${f(BR[0])} ${f(BR[1])} Q${f(cx + bok)} ${f(y + hl / 2)} ${f(FR[0])} ${f(FR[1])} Q${f(cx)} ${f(y + hl + 12)} ${f(FL[0])} ${f(FL[1])} Q${f(cx - bok)} ${f(y + hl / 2)} ${f(BL[0])} ${f(BL[1])} Z`;
  let s = elipsa(cx + 20, y + hl + tl + 2, w * 0.58, 12, `fill="#000000" opacity="0.36"`);
  // bok: přední oblá hrana, dole posunutá o tloušťku
  s += `<path d="M${f(FL[0])} ${f(FL[1])} Q${f(cx)} ${f(y + hl + 12)} ${f(FR[0])} ${f(FR[1])} Q${f(FR[0] + 4)} ${f(FR[1] + tl * 0.6)} ${f(FR[0] - 4)} ${f(FR[1] + tl)} Q${f(cx)} ${f(y + hl + tl + 12)} ${f(FL[0] + 4)} ${f(FL[1] + tl)} Q${f(FL[0] - 4)} ${f(FL[1] + tl * 0.6)} ${f(FL[0])} ${f(FL[1])} Z" fill="${T.zabutonTma}"/>`;
  s += `<path d="${vrch}" fill="${T.zabuton}"/>`;
  // světlo zleva: levá polovina vrchu světlejší, k prošití se plocha lehce propadá
  s += `<path d="M${f(BL[0] + 8)} ${f(BL[1] + 2)} Q${f(cx - w * 0.2)} ${f(y - 3)} ${f(cx - w * 0.04)} ${f(y - 1)} Q${f(cx - w * 0.16)} ${f(y + hl * 0.5)} ${f(cx - w * 0.08)} ${f(y + hl + 2)} Q${f(cx - w * 0.3)} ${f(y + hl + 6)} ${f(FL[0] + 8)} ${f(FL[1] - 2)} Q${f(cx - bok + 10)} ${f(y + hl / 2)} ${f(BL[0] + 8)} ${f(BL[1] + 2)} Z" fill="${T.zabutonSvetly}" opacity="0.5"/>`;
  s += elipsa(cx + 3, y + hl * 0.52 + 2, 22, 7, `fill="${T.zabutonTma}" opacity="0.6"`);
  s += `<path d="M${f(cx - 7)} ${f(y + hl * 0.52 - 4)}l14 8M${f(cx + 7)} ${f(y + hl * 0.52 - 4)}l-14 8" stroke="${T.strapec}" stroke-width="2.4" stroke-linecap="round"/>`;
  // střapce v rozích
  for (const [tx, ty] of [BL, BR, FL, FR]) {
    const sm = tx < cx ? -1 : 1;
    s += `<path d="M${f(tx)} ${f(ty)}l${f(sm * 9)} 3M${f(tx)} ${f(ty)}l${f(sm * 8)} 7M${f(tx)} ${f(ty)}l${f(sm * 5)} 9" stroke="${T.strapec}" stroke-width="2" stroke-linecap="round"/>`;
    s += kruh(tx, ty, 2.6, `fill="${T.strapec}"`);
  }
  return s;
}

/** Geta z boku: deska na dvou zubech, řemínek hanao obloukem od špičky; smer 1 = špička vpravo */
function geta(cx: number, pata: number, smer: number) {
  const L = 112;
  const tl = 10;
  const zub = 19;
  const yb = pata - zub - tl;
  const x = (t: number) => cx + smer * L * t;
  let s = elipsa(cx + 8, pata, L * 0.6, 5, `fill="#000000" opacity="0.4"`);
  // zuby: příčné špalíky pod špičkou a pod patou
  for (const t of [-0.3, 0.26]) s += obdelnik(x(t) - 4, yb + tl, 8, zub, `fill="${T.getaTma}"`) + obdelnik(x(t) - 4, yb + tl, 8, 3, `fill="#000000" opacity="0.4"`);
  // deska: bok se zaoblenými konci a světlá hrana vrchu
  s += obdelnik(cx - L / 2, yb, L, tl, `rx="3" fill="${T.geta}"`);
  s += obdelnik(cx - L / 2 + 2, yb, L - 4, 2, `rx="1" fill="#EAD6AE"`) + obdelnik(cx - L / 2, yb + tl - 2, L, 2, `fill="${T.getaTma}"`);
  // hanao: od předního uzlíku u špičky obloukem k zadním otvorům
  const remen = `M${f(x(0.36))} ${f(yb)} C${f(x(0.33))} ${f(yb - 13)} ${f(x(0.04))} ${f(yb - 15)} ${f(x(-0.1))} ${f(yb + 1)}`;
  s += `<path d="${remen}" stroke="${P.rumelkaTma}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  s += `<path d="${remen}" stroke="${T.hanao}" stroke-width="2.6" fill="none" stroke-linecap="round" transform="translate(0 -1)"/>`;
  s += kruh(x(0.36), yb - 1, 2.4, `fill="${P.rumelkaTma}"`);
  return s;
}

function prah(g: Geometrie, id: string) {
  const x0 = -g.ext;
  const w = g.W + 2 * g.ext;
  const k = g.kamachi;
  let defs = svisly(`${id}-doma`, T.doma, T.domaTma);
  defs += vodorovny(`${id}-kamachi`, [[0, "#2A1A10"], [0.35, "#4A2F1C"], [0.5, "#5E3D28"], [0.65, "#4A2F1C"], [1, "#2A1A10"]]);
  let s = "";
  // hliněná podlaha doma, k dolnímu kraji tmavne
  s += obdelnik(x0, k + 28, w, g.H - k - 28, `fill="url(#${id}-doma)"`);
  // agari-kamachi: leštěná hrana s odleskem
  s += obdelnik(x0, k, w, 28, `fill="url(#${id}-kamachi)"`);
  s += obdelnik(x0, k, w, 3, `fill="${T.drevoHrana}"`) + obdelnik(x0, k + 3, w, 1.4, `fill="#C9A276" opacity="0.5"`);
  s += obdelnik(x0, k + 28, w, 10, `fill="#000000" opacity="0.4"`);
  // kámen na zouvání a geta
  const cx = g.zabuton ? g.zabuton.cx : g.W / 2;
  const sw = g.rozvrzeni === "siroka" ? 300 : 260;
  const ky = k + 22;
  s += elipsa(cx + 14, ky + 44, sw * 0.56, 12, `fill="#000000" opacity="0.4"`);
  s += `<path d="M${f(cx - sw / 2 + 18)} ${f(ky)} Q${f(cx)} ${f(ky - 6)} ${f(cx + sw / 2 - 14)} ${f(ky + 2)} Q${f(cx + sw / 2 + 8)} ${f(ky + 14)} ${f(cx + sw / 2 - 4)} ${f(ky + 22)} L${f(cx - sw / 2 + 4)} ${f(ky + 24)} Q${f(cx - sw / 2 - 10)} ${f(ky + 12)} ${f(cx - sw / 2 + 18)} ${f(ky)} Z" fill="${T.kamenSvetly}"/>`;
  s += `<path d="M${f(cx - sw / 2 + 4)} ${f(ky + 24)} L${f(cx + sw / 2 - 4)} ${f(ky + 22)} Q${f(cx + sw / 2 + 2)} ${f(ky + 34)} ${f(cx + sw / 2 - 16)} ${f(ky + 44)} H${f(cx - sw / 2 + 14)} Q${f(cx - sw / 2 - 4)} ${f(ky + 36)} ${f(cx - sw / 2 + 4)} ${f(ky + 24)} Z" fill="${T.kamenTma}"/>`;
  s += `<path d="M${f(cx - sw / 2 + 30)} ${f(ky + 4)} Q${f(cx - sw * 0.1)} ${f(ky)} ${f(cx + sw * 0.05)} ${f(ky + 4)}" stroke="#C4BFB0" stroke-width="2.4" fill="none" opacity="0.7" stroke-linecap="round"/>`;
  // pár geta z boku, zadní o kousek dál
  s += geta(cx + 22, ky + 8, 1) + geta(cx - 16, ky + 17, 1);
  return { defs, s };
}

/* ════════════════════ Andon ════════════════════ */

function andon(g: Geometrie, id: string) {
  const [cx, pata] = g.andon;
  const w = g.rozvrzeni === "siroka" ? 116 : 100;
  const h = g.rozvrzeni === "siroka" ? 250 : 220;
  const x = cx - w / 2;
  const top = pata - h;
  const nohy = 22;
  const telo = top + 30;
  const teloDole = pata - nohy - 14;
  let defs = zare(`${id}-papir-andonu`, "#FFFFFF", 0.7, 0.45);
  let s = elipsa(cx + 10, pata + 2, w * 0.7, 9, `fill="#000000" opacity="0.35"`);
  // nohy a podstava
  s += obdelniky([[x + 2, pata - nohy, 10, nohy], [x + w - 12, pata - nohy, 10, nohy]], `fill="${T.drevoTma}"`);
  s += obdelnik(x - 4, pata - nohy - 14, w + 8, 14, `rx="2" fill="${T.drevo}"`) + obdelnik(x - 4, pata - nohy - 14, w + 8, 3, `fill="${T.drevoHrana}"`);
  // papír: rozsvícený, uprostřed nejjasnější
  s += obdelnik(x + 4, telo, w - 8, teloDole - telo, `fill="${T.andon}"`);
  s += elipsa(cx - 4, telo + (teloDole - telo) * 0.58, w * 0.42, (teloDole - telo) * 0.48, `fill="url(#${id}-papir-andonu)"`);
  s += obdelnik(x + w * 0.62, telo, w * 0.34, teloDole - telo, `fill="#E8B870" opacity="0.35"`);
  // rám: sloupky, příčky a polička na misku s olejem
  s += obdelniky([[x, telo - 6, 8, teloDole - telo + 6], [x + w - 8, telo - 6, 8, teloDole - telo + 6]], `fill="${T.drevoTma}"`);
  s += obdelniky([[x, telo - 8, w, 8], [x, telo + (teloDole - telo) * 0.62, w, 5]], `fill="${T.drevo}"`);
  s += obdelnik(x + w / 2 - 1.2, telo, 2.4, teloDole - telo, `fill="${T.drevo}" opacity="0.55"`);
  // ucho nahoře
  s += `<path d="M${f(x + 10)} ${f(telo - 8)} V${f(top + 10)} Q${f(cx)} ${f(top - 10)} ${f(x + w - 10)} ${f(top + 10)} V${f(telo - 8)}" stroke="${T.drevoTma}" stroke-width="7" fill="none"/>`;
  s += obdelnik(cx - 16, top - 2, 32, 8, `rx="3" fill="${T.drevo}"`);
  return { defs, s: `<g class="o2t-andon">${s}</g>` };
}

/* ════════════════════ Vpředu: paprsek, prášinky, noren ════════════════════ */

function paprsek(g: Geometrie, id: string) {
  const o = g.okno;
  const start: Bod = [o.x + o.w / 2, o.y + o.h / 2];
  const [tx, ty] = g.cil;
  const dx = tx - start[0];
  const dy = ty - start[1];
  const d = Math.hypot(dx, dy);
  const ux = dx / d;
  const uy = dy / d;
  const nx = -uy;
  const ny = ux;
  const delka = d * 1.32;
  const sirka0 = Math.min(o.w, o.h) * 0.5;
  const sirka1 = g.rozvrzeni === "siroka" ? 180 : 150;
  const bod = (t: number, sx: number): Bod => {
    const half = sirka0 + (sirka1 - sirka0) * t;
    return [start[0] + ux * delka * t + nx * half * sx, start[1] + uy * delka * t + ny * half * sx];
  };
  const tvar = [bod(0, -1), bod(0, 1), bod(1, 1), bod(1, -1)];
  const jadro = [bod(0, -0.45), bod(0, 0.5), bod(1, 0.42), bod(1, -0.35)];
  const konec: Bod = [start[0] + ux * delka, start[1] + uy * delka];
  let defs = `<linearGradient id="${id}-paprsek" gradientUnits="userSpaceOnUse" x1="${f(start[0])}" y1="${f(start[1])}" x2="${f(konec[0])}" y2="${f(konec[1])}"><stop offset="0" stop-color="${T.svetlo}" stop-opacity="0.34"/><stop offset="0.6" stop-color="${T.svetlo}" stop-opacity="0.16"/><stop offset="0.82" stop-color="${T.svetlo}" stop-opacity="0.07"/><stop offset="1" stop-color="${T.svetlo}" stop-opacity="0"/></linearGradient>`;
  defs += `<filter id="${id}-mekce" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${g.rozvrzeni === "siroka" ? 9 : 7}"/></filter>`;
  defs += `<clipPath id="${id}-v-paprsku"><path d="M${tvar.map(([a, b]) => `${f(a)} ${f(b)}`).join("L")}Z"/></clipPath>`;
  defs += zare(`${id}-na-hrnku`, T.svetlo, 0.22, 0.5);
  let s = `<g class="o2t-paprsek">`;
  s += `<path d="M${tvar.map(([a, b]) => `${f(a)} ${f(b)}`).join("L")}Z" fill="url(#${id}-paprsek)" filter="url(#${id}-mekce)"/>`;
  s += `<path d="M${jadro.map(([a, b]) => `${f(a)} ${f(b)}`).join("L")}Z" fill="url(#${id}-paprsek)" opacity="0.7" filter="url(#${id}-mekce)"/>`;
  // kde paprsek dopadá: hrnek a podstavec se rozjasní
  s += elipsa(g.pata[0] - 50 * g.k / 3.5, g.pata[1] - 170 * g.k / 3.5, 180 * g.k / 3.5, 170 * g.k / 3.5, `fill="url(#${id}-na-hrnku)"`);
  s += `</g>`;
  // prášinky: pár desítek teček, které v paprsku pomalu plují (CSS)
  const r = nahoda(g.rozvrzeni === "siroka" ? 811 : 377);
  const pocet = g.rozvrzeni === "siroka" ? 34 : 24;
  let prach = "";
  for (let i = 0; i < pocet; i++) {
    const t = 0.08 + r() * 0.78;
    const [px, py] = bod(t, (r() - 0.5) * 1.7);
    const vel = 1.1 + r() * r() * 2.6;
    const styl = `--t:${f(9 + r() * 12)}s;--z:${f(-r() * 20)}s;--x:${f((r() - 0.3) * 30)}px;--y:${f((r() - 0.6) * 26)}px;--o:${f(0.45 + r() * 0.5)}`;
    prach += `<circle class="o2t-prach" cx="${f(px)}" cy="${f(py)}" r="${f(vel)}" style="${styl}"/>`;
  }
  s += `<g clip-path="url(#${id}-v-paprsku)" fill="${T.svetlo}">${prach}</g>`;
  return { defs, s };
}

/** Kraj norenu vpředu nahoře — sem se prošlo do zadní místnosti */
function norenRoh(x: number, w: number, g: Geometrie, znaky: string) {
  const dole = g.noren.dole;
  let s = obdelnik(x, 76, w, dole - 76, `fill="${P.indigo}"`);
  s += obdelnik(x + 10, 90, 12, dole - 100, `fill="#3B4E8E" opacity="0.8"`) + obdelnik(x + w - 14, 90, 14, dole - 100, `fill="${P.indigoTma}"`);
  s += obdelnik(x, dole - 18, w, 3, `fill="#F4F1EA" opacity="0.9"`);
  const vel = g.noren.velikost;
  if (znaky.length === 1) s += napis(x + w / 2, dole - 40, znaky, vel, PISMO.kanji, `text-anchor="middle" fill="#F4F1EA"`);
  else s += svisle(x + w / 2, dole - 34 - vel * 0.72 * (znaky.length - 1) - 6, znaky, vel * 0.72, vel * 0.76, `fill="#F4F1EA"`);
  return `<g class="o2t-noren">${s}</g>`;
}

/* ════════════════════ Složení ════════════════════ */

export interface Mistnost {
  g: Geometrie;
  /** viewBox celé kresby (i s kusy za kraji jádra) */
  viewBox: string;
  zadni: string;
  predni: string;
}

export function tokonoma(rozvrzeni: Rozvrzeni): Mistnost {
  const g = geometrie(rozvrzeni);
  const id = rozvrzeni === "siroka" ? "o2ts" : "o2tu";
  let defs = "";
  let zadni = "";
  const pridej = (c: { defs: string; s: string }) => {
    defs += c.defs;
    zadni += c.s;
  };
  // odzadu: pokoj, kraje, okénko, štít, výklenek se svitkem a kmenem, podlaha, lampa,
  // krabice se šňůrou a nakonec podstavec, na který stránka postaví hrnek
  pridej(pokoj(g, id));
  // fusuma mezi sloupky za kraji jádra (jen na širokém monitoru)
  if (g.fusuma) zadni += fusumy(g.sloupky[0] + 32, -g.sloupky[0] - 32, g, false) + fusumy(g.W, g.sloupky[3] - g.W, g, true);
  pridej(okenko(g, id));
  pridej(hengaku(g, id));
  pridej(vyklenek(g, id));
  pridej(svitek(g, id));
  pridej(tokobashira(g, id));
  zadni += kakehanaire(g);
  pridej(tatami(g, id));
  zadni += zabuton(g);
  pridej(prah(g, id));
  pridej(andon(g, id));
  pridej(tomobako(g, id));
  zadni += himo(g);
  pridej(podstavec(g, id));

  // vpředu přes hrnek: paprsek s prášinkami a kraje norenu, kterým se sem prošlo
  const pp = paprsek(g, id);
  let predni = `<defs>${pp.defs}</defs>${pp.s}`;
  predni += norenRoh(-40, g.noren.w, g, "奥") + norenRoh(g.W + 40 - g.noren.w, g.noren.w, g, "の間");

  return {
    g,
    viewBox: `${-g.ext} 0 ${g.W + 2 * g.ext} ${g.H}`,
    zadni: `<defs>${defs}</defs>${zadni}`,
    predni,
  };
}

/** Pro náhledy a písmo: všechny znaky, které kresba píše (i modrotisk ve svitku).
 *  Stránka obchod-2.astro je má v pridej(…) spolu se znaky lístku 折紙. */
export const ZNAKY_TOKONOMY = "逸品奥の間二つジロ作志野";
