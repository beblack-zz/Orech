/**
 * Cedule a světla krámku na /obchod-2 — všechno napsané a všechno, co svítí.
 *
 *   zadni   velký štít うつわ屋 pod spodní střechou: tmavý dřevěný rám
 *           s mosaznými rohovníky, krémová tvář, vlevo JIRO saku, vpravo
 *           胡桃 (Ořech) a pečeť ジロ作, nad ním tři lampičky na krku
 *   zem     denní stíny sloupků na chodníku (jen ve dne)
 *   predni  sedm lampionů pod stříškou — cesta hrnku od hlíny k čaji:
 *           土 hlína, 水 voda, 火 oheň, 釉 glazura, 窯 pec, 器 nádoba, 茶 čaj;
 *           svislá cedule やきもの s neonovou trubicí a ensó vlevo; velká
 *           lucerna 器 na dřevěném sloupku vpravo; cedulka 営業中 / 準備中
 *           na sloupku u dveří; pouliční lampa s cedulkou ulice 胡桃通り
 *           (胡桃 je Ořech jako na Rezervaci a ve Svatyni)
 *   svetla  rozsvícené podoby, každá ve svém svetlo(prah, …)
 *
 * Noční barvy zhasnutých věcí udělá scena.ts sama — tady se kreslí jen
 * den a rozsvícení. Záře jsou jen přechody s průhledností: kolem zdroje
 * hustší, ven rychle řídnou, žádné tvrdé hrany. Skupiny, se kterými hýbe
 * stránka (lampiony, lucerna, cedulka, můry), nemají atribut transform —
 * CSS transformace by ho přepsala.
 */
import { P, SVIT, PISMO, PRAH, TRIDY, X, Y, PRIZEMI, MISTA, svetlo, f, nahoda, obdelnik, kruh, elipsa, cara, mnohouhelnik } from "./zaklad";
import type { Vrstvy, Obdelnik, Bod } from "./zaklad";

const p = "kd-ce";

/* ——— Pomůcky ——— */

/** Japonský znak se středem v (cx, cy) — střed znaku leží asi 0,36 em nad účařím */
const znak = (z: string, cx: number, cy: number, vel: number, atr = "") =>
  `<text x="${f(cx)}" y="${f(cy + vel * 0.36)}" font-family="${PISMO.kanji}" font-size="${f(vel)}" text-anchor="middle" ${atr}>${z}</text>`;

/** Svislý nápis (tategaki): znaky pod sebou, první střed v cy0, mezi středy krok */
const svisle = (s: string, cx: number, cy0: number, vel: number, krok: number, atr = "") =>
  `<text font-family="${PISMO.kanji}" font-size="${f(vel)}" text-anchor="middle" ${atr}>${[...s]
    .map((z, i) => `<tspan x="${f(cx)}" y="${f(cy0 + i * krok + vel * 0.36)}">${z}</tspan>`)
    .join("")}</text>`;

/** Hodně obdélníků stejné barvy jako jedna cesta */
const obdelniky = (r: [number, number, number, number][], atr: string) =>
  r.length ? `<path d="${r.map(([x, y, w, h]) => `M${f(x)} ${f(y)}h${f(w)}v${f(h)}h${f(-w)}z`).join("")}" ${atr}/>` : "";

type Stop = [number, string, number];
const stopy = (s: Stop[]) => s.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join("");
/** Radiální přechod (výchozí: přes obdélník tvaru, střed uprostřed) */
const kruhovy = (id: string, s: Stop[], atr = "") => `<radialGradient id="${id}" ${atr}>${stopy(s)}</radialGradient>`;
/** Lineární přechod (výchozí: shora dolů) */
const primy = (id: string, s: Stop[], atr = 'x1="0" y1="0" x2="0" y2="1"') => `<linearGradient id="${id}" ${atr}>${stopy(s)}</linearGradient>`;

/** Bod na kubické Bézierově křivce */
const bezier = (a: Bod, b: Bod, c: Bod, d: Bod, t: number): Bod => {
  const u = 1 - t;
  return [
    u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0],
    u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1],
  ];
};
const krivka = (a: Bod, b: Bod, c: Bod, d: Bod) => `M${f(a[0])} ${f(a[1])} C${f(b[0])} ${f(b[1])} ${f(c[0])} ${f(c[1])} ${f(d[0])} ${f(d[1])}`;

/** Zaoblený obdélník jako cesta (pro trubice) */
const ramD = (r: Obdelnik, rx: number) =>
  `M${f(r.x + rx)} ${f(r.y)} H${f(r.x + r.w - rx)} Q${f(r.x + r.w)} ${f(r.y)} ${f(r.x + r.w)} ${f(r.y + rx)} V${f(r.y + r.h - rx)} Q${f(r.x + r.w)} ${f(r.y + r.h)} ${f(r.x + r.w - rx)} ${f(r.y + r.h)} H${f(r.x + rx)} Q${f(r.x)} ${f(r.y + r.h)} ${f(r.x)} ${f(r.y + r.h - rx)} V${f(r.y + rx)} Q${f(r.x)} ${f(r.y)} ${f(r.x + rx)} ${f(r.y)} Z`;

/** Pečeť (hanko) s nepravidelným okrajem jako vyřezaná z kamene */
function pecet(x: number, y: number, w: number, h: number, seed: number, barva: string) {
  const r = nahoda(seed);
  const body: Bod[] = [];
  const hrana = (a: Bod, b: Bod, n: number) => {
    for (let i = 0; i < n; i++) {
      const t = i / n;
      body.push([a[0] + (b[0] - a[0]) * t + (r() - 0.5) * 1.3, a[1] + (b[1] - a[1]) * t + (r() - 0.5) * 1.3]);
    }
  };
  hrana([x, y], [x + w, y], 5);
  hrana([x + w, y], [x + w, y + h], 7);
  hrana([x + w, y + h], [x, y + h], 5);
  hrana([x, y + h], [x, y], 7);
  return mnohouhelnik(body, `fill="${barva}"`);
}

/* ——— Papírový lampion (chóčin) ———
 * Papír je protáhlá elipsa (poloosy pul × b) uříznutá nahoře a dole
 * víčky tam, kde je široká jako ústí.
 */
interface Sud {
  cx: number;
  /** Horní a dolní ústí (kde papír končí pod víčky) */
  y0: number;
  y1: number;
  /** Polovina šířky ústí a v půlce výšky */
  ust: number;
  pul: number;
}

/** Svislá poloosa elipsy, ze které je papír uříznutý */
const poloosa = ({ y0, y1, ust, pul }: Sud) => (y1 - y0) / 2 / Math.sqrt(1 - (ust / pul) ** 2);

const obrysSudu = (s: Sud) => {
  const b = poloosa(s);
  return `M${f(s.cx - s.ust)} ${f(s.y0)} A${f(s.pul)} ${f(b)} 0 0 0 ${f(s.cx - s.ust)} ${f(s.y1)} H${f(s.cx + s.ust)} A${f(s.pul)} ${f(b)} 0 0 0 ${f(s.cx + s.ust)} ${f(s.y0)} Z`;
};

/** Polovina šířky papíru ve výšce y */
const sirkaSudu = (s: Sud, y: number) => {
  const t = (y - (s.y0 + s.y1) / 2) / poloosa(s);
  return s.pul * Math.sqrt(Math.max(0, 1 - t * t));
};

/** Bambusové obruče jako jedna cesta — prohnuté dolů, nejvíc v půlce (kulatost); ořízne je obrys */
function obruce(s: Sud, krok: number, prohnuti: number) {
  let d = "";
  const h = s.y1 - s.y0;
  const n = Math.round(h / krok);
  for (let i = 1; i < n; i++) {
    const y = s.y0 + (h * i) / n;
    const w = sirkaSudu(s, y);
    const b = prohnuti * (w / s.pul);
    d += `M${f(s.cx - w - 1)} ${f(y - b * 0.15)} Q${f(s.cx)} ${f(y + b * 1.85)} ${f(s.cx + w + 1)} ${f(y - b * 0.15)}`;
  }
  return d;
}

/** Černá lakovaná víčka nahoře a dole (odlesk na horní hraně, rozsvícený: teplý lem u papíru) */
function vicka(s: Sud, w: number, h: number, svit = false) {
  const nahore = s.y0 - h * 0.6;
  const dole = s.y1 - h * 0.4;
  const ram = (y: number) =>
    obdelnik(s.cx - w / 2, y, w, h, `rx="${f(h * 0.3)}" fill="${P.cerna}"`) +
    obdelnik(s.cx - w / 2 + 2, y + 1, w - 4, Math.max(1.2, h * 0.16), `fill="#6E6058" opacity="0.9"`) +
    obdelnik(s.cx - w / 2 + 1, y + h * 0.62, w - 2, h * 0.14, `fill="#140F0C" opacity="0.6"`);
  const lem = svit
    ? obdelnik(s.cx - w / 2 + 1.5, nahore + h - 1.8, w - 3, 1.8, `fill="${SVIT.zarTepla}"`) + obdelnik(s.cx - w / 2 + 1.5, dole, w - 3, 1.8, `fill="${SVIT.zarTepla}"`)
    : "";
  return ram(nahore) + ram(dole) + lem;
}

/** Zhasnutý lampion ve dne: červený papír, stín vpravo, měkký odlesk vlevo, obruče */
function lampionDen(s: Sud, orez: string, vicko: [number, number], krok: number) {
  const { cx, y0, y1, pul } = s;
  const h = y1 - y0;
  const ys = (y0 + y1) / 2;
  return `<path d="${obrysSudu(s)}" fill="${P.lampion}"/>
    <g clip-path="url(#${orez})">
      ${elipsa(cx + pul * 1.02, ys + h * 0.05, pul * 0.7, h * 0.7, `fill="${P.lampionTma}" opacity="0.75"`)}
      ${elipsa(cx, y0 - h * 0.04, pul * 1.2, h * 0.15, `fill="${P.lampionTma}" opacity="0.45"`)}
      ${elipsa(cx, y1 + h * 0.04, pul * 1.2, h * 0.17, `fill="${P.lampionTma}" opacity="0.55"`)}
      ${elipsa(cx - pul * 0.44, ys - h * 0.08, pul * 0.24, h * 0.3, `fill="${P.lampionSvetly}" opacity="0.7"`)}
      ${elipsa(cx - pul * 0.5, ys - h * 0.14, pul * 0.08, h * 0.13, `fill="${P.bila}" opacity="0.22"`)}
      <path d="${obruce(s, krok, 1.5)}" stroke="${P.lampionTma}" stroke-width="1" fill="none" opacity="0.45"/>
    </g>
    ${vicka(s, vicko[0], vicko[1])}`;
}

/** Rozsvícený lampion: papír svítí zevnitř, obruče se světle prokreslí u krajů, víčka chytí lem */
function lampionSvit(s: Sud, orez: string, vicko: [number, number], krok: number) {
  const { cx, y0, y1, pul } = s;
  const h = y1 - y0;
  return `<path d="${obrysSudu(s)}" fill="url(#${p}-s-papir)"/>
    <g clip-path="url(#${orez})">
      ${elipsa(cx, y0 - h * 0.03, pul * 1.2, h * 0.12, `fill="${P.lampionTma}" opacity="0.45"`)}
      ${elipsa(cx, y1 + h * 0.03, pul * 1.2, h * 0.13, `fill="${P.lampionTma}" opacity="0.5"`)}
      <path d="${obruce(s, krok, 1.5)}" stroke="url(#${p}-s-obruc)" stroke-width="1.1" fill="none"/>
    </g>
    ${vicka(s, vicko[0], vicko[1], true)}`;
}

/* ——— Sedm lampionů pod stříškou ——— */

/** Středy lampionů — souměrně kolem X.stred */
const LAMPIONY = Array.from({ length: 7 }, (_, i) => 1140 + (i * 920) / 6);
/** Cesta hrnku: hlína, voda, oheň, glazura, pec, nádoba, čaj */
const ZNAKY_LAMPIONU = ["土", "水", "火", "釉", "窯", "器", "茶"];
/** Lampion v místních souřadnicích: (0, 0) je horní konec šňůry na hraně stříšky */
const LAMPION: Sud = { cx: 0, y0: Y.lampionNahore - Y.striskaDole + 2, y1: Y.lampionDole - Y.striskaDole - 2, ust: 15, pul: 29 };
const LAMPION_VICKO: [number, number] = [33, 8];
const LAMPION_KROK = 7;
/** Kanji na lampionu: střed a velikost (místně) */
const LAMPION_ZNAK = { y: 51, vel: 34 };

/** Kabel k žárovkám: prověšený pod hranou stříšky od lampionu k lampionu, na koncích ke krajním sloupům */
function kabel() {
  const y = Y.striskaDole - 1;
  const body = [X.zedL - 4, ...LAMPIONY, X.zedP + 4];
  let d = `M${f(body[0])} ${y - 5}`;
  for (let i = 1; i < body.length; i++) {
    const a = body[i - 1];
    const b = body[i];
    d += ` Q${f((a + b) / 2)} ${f(y + 15)} ${f(b)} ${i === body.length - 1 ? y - 5 : y}`;
  }
  return `<path d="${d}" stroke="${P.cerna}" stroke-width="1.4" fill="none" opacity="0.9"/>`;
}

/**
 * Šňůra s očkem — začíná kousek nad hranou stříšky, ať je vidět, že visí z ní.
 * Ve vrstvě svetla (noc = true) má očko noční barvu: ta vrstva se nepřebarvuje.
 */
const snura = (x: number, y0: number, y1: number, noc = false) =>
  `${cara(x, y0, x, y1, `stroke="${P.cerna}" stroke-width="1.6"`)}${kruh(x, y0, 2.2, `fill="none" stroke="${noc ? "#2C3157" : P.kovTma}" stroke-width="1.3"`)}`;

/* ——— Velký štít ——— */

const S: Obdelnik = { x: X.stitL, y: Y.stitNahore, w: X.stitP - X.stitL, h: Y.stitDole - Y.stitNahore };
const RAM = 14;
/** Krémová tvář uvnitř rámu */
const TVAR: Obdelnik = { x: S.x + RAM, y: S.y + RAM, w: S.w - 2 * RAM, h: S.h - 2 * RAM };
const STRED_Y = TVAR.y + TVAR.h / 2 + 2;
/** うつわ屋: kana o kus menší než kanji, celé na ose domu */
const NAPIS = [
  { z: "う", x: 1451, vel: 84 },
  { z: "つ", x: 1545, vel: 84 },
  { z: "わ", x: 1639, vel: 84 },
  { z: "屋", x: 1741, vel: 100 },
];
/** Levý blok (JIRO saku) a pravý (胡桃 a pečeť) — zrcadlově kolem osy */
const BLOK_L = 1282;
const BLOK_P = 1918;
/** Lampičky nad štítem: x středu stínidla, spodní hrana stínidla */
const LAMPICKY = [BLOK_L, X.stred, BLOK_P];
const LAMPICKA_Y = S.y - 6;

/** Obsah tváře štítu — stejný ve dne i rozsvícený (písmo zůstane ostré) */
function tvarStitu() {
  const t = TVAR;
  let s = "";
  // Dvojitá červená linka kolem tváře
  s += obdelnik(t.x + 7, t.y + 7, t.w - 14, t.h - 14, `fill="none" stroke="${P.rumelka}" stroke-width="1.6" opacity="0.85"`);
  s += obdelnik(t.x + 11, t.y + 11, t.w - 22, t.h - 22, `fill="none" stroke="${P.rumelka}" stroke-width="0.8" opacity="0.6"`);
  // うつわ屋 — tah přidá písmu váhu, ať je ze silnice čitelné
  s += `<g fill="${P.rumelka}" stroke="${P.rumelka}" stroke-width="1.8" stroke-linejoin="round">${NAPIS.map((n) => znak(n.z, n.x, STRED_Y, n.vel)).join("")}</g>`;
  // Vlevo: JIRO saku, linka s kosočtvercem, KERAMIKA · OŘECH
  s += `<text x="${BLOK_L}" y="${STRED_Y - 9}" text-anchor="middle" font-family="${PISMO.nadpis}" font-size="30" fill="${P.inkoust}"><tspan font-weight="600">JIRO</tspan> <tspan font-style="italic" fill="${P.rumelka}">saku</tspan></text>`;
  s += cara(BLOK_L - 56, STRED_Y + 3, BLOK_L - 9, STRED_Y + 3, `stroke="${P.rumelka}" stroke-width="1.2"`);
  s += cara(BLOK_L + 9, STRED_Y + 3, BLOK_L + 56, STRED_Y + 3, `stroke="${P.rumelka}" stroke-width="1.2"`);
  s += mnohouhelnik([[BLOK_L, STRED_Y - 2], [BLOK_L + 5, STRED_Y + 3], [BLOK_L, STRED_Y + 8], [BLOK_L - 5, STRED_Y + 3]], `fill="${P.rumelka}"`);
  s += `<text x="${BLOK_L + 1}" y="${STRED_Y + 27}" text-anchor="middle" font-family="${PISMO.nadpis}" font-size="12" letter-spacing="2.4" fill="${P.inkoust}" opacity="0.82">KERAMIKA · OŘECH</text>`;
  // Vpravo: 胡桃 (Ořech) svisle a pečeť ジロ作 — světlé znaky v rumělce
  s += svisle("胡桃", BLOK_P - 33, STRED_Y - 15, 26, 30, `fill="${P.inkoust}" stroke="${P.inkoust}" stroke-width="0.6"`);
  s += pecet(BLOK_P - 7, STRED_Y - 41, 52, 82, 3101, P.rumelka);
  s += obdelnik(BLOK_P - 3, STRED_Y - 37, 44, 74, `fill="none" stroke="${P.stit}" stroke-width="1.2" opacity="0.9"`);
  s += svisle("ジロ作", BLOK_P + 19, STRED_Y - 22, 20, 22, `fill="${P.stit}"`);
  return s;
}

/** Mosazný rohovník (kanagu) pro levý horní roh rámu; ostatní rohy zrcadlově */
const kanaguTvar = () => `<g id="${p}-kanagu">
    <path d="M1 1 H35 Q43 8 35 15 H15 V35 Q8 43 1 35 Z" fill="#A8823A"/>
    <path d="M0 0 H34 Q42 7 34 14 H14 V34 Q7 42 0 34 Z" fill="${P.zlata}"/>
    <path d="M1.5 12 V1.5 H32" stroke="#F6DE9A" stroke-width="1.4" fill="none" opacity="0.9"/>
    ${[[7, 7], [25, 7], [7, 25]].map(([x, y]) => kruh(x, y, 1.9, `fill="#7E5E26"`) + kruh(x - 0.5, y - 0.5, 0.7, `fill="#F6DE9A"`)).join("")}
  </g>`;

/** Lampička na krku: patka na rámu, krk do oblouku dopředu, stínidlo otevřené dolů na tvář */
function lampicka(sx: number) {
  const mx = sx - 30;
  const y = LAMPICKA_Y;
  const krk: [Bod, Bod, Bod, Bod] = [[mx, S.y - 1], [mx - 2, y - 58], [sx - 4, y - 66], [sx, y - 24]];
  return `${obdelnik(mx - 7, S.y - 4, 14, 6, `rx="1.5" fill="${P.cerna}"`)}${obdelnik(mx - 5, S.y - 3.4, 10, 1.4, `fill="#6E6058"`)}
    <path d="${krivka(...krk)}" stroke="${P.cerna}" stroke-width="3.4" fill="none" stroke-linecap="round"/>
    <path d="${krivka(...krk)}" stroke="#6E6058" stroke-width="1" fill="none" stroke-linecap="round" opacity="0.7" transform="translate(-1.2 -0.6)"/>
    ${elipsa(sx, y - 24, 6, 3, `fill="${P.cerna}"`)}
    <path d="M${sx - 6} ${y - 23} H${sx + 6} C${sx + 9} ${y - 14} ${sx + 15} ${y - 6} ${sx + 19} ${y} H${sx - 19} C${sx - 15} ${y - 6} ${sx - 9} ${y - 14} ${sx - 6} ${y - 23} Z" fill="${P.indigoTma}"/>
    <path d="M${sx - 6} ${y - 23} H${sx - 2} C${sx - 4} ${y - 14} ${sx - 8} ${y - 6} ${sx - 10} ${y} H${sx - 19} C${sx - 15} ${y - 6} ${sx - 9} ${y - 14} ${sx - 6} ${y - 23} Z" fill="#5464A0" opacity="0.75"/>
    ${elipsa(sx, y, 19, 3.6, `fill="${P.papirStin}"`)}${elipsa(sx, y + 0.6, 9, 1.8, `fill="${P.kovSvetly}"`)}`;
}

function stitDen() {
  const { x, y, w, h } = S;
  const t = TVAR;
  let s = "";
  // Stín štítu na zdi doprava dolů (jen ve dne)
  s += `<g class="${TRIDY.jenDen}">${mnohouhelnik(
    [[x + w, y + 16], [x + w + 14, y + 16], [x + w + 14, y + h + 16], [x + 14, y + h + 16], [x + 14, y + h], [x + w, y + h]],
    `fill="${P.drevoTma2}" opacity="0.22"`,
  )}</g>`;
  // Závěsné tyče od okapu k rámu, s maticemi
  for (const tx of [x + 74, x + w - 74]) {
    s += obdelnik(tx - 1.6, Y.okap2 - 8, 3.2, y - Y.okap2 + 10, `fill="${P.kovTma}"`);
    s += obdelnik(tx - 0.6, Y.okap2 - 8, 1, y - Y.okap2 + 10, `fill="${P.kovSvetly}" opacity="0.7"`);
    s += elipsa(tx, y - 1, 5.5, 3, `fill="${P.kovTma}"`);
  }
  // Rám: tmavé dřevo, horní a levá hrana na světle, spodní a pravá ve stínu
  s += obdelnik(x, y, w, h, `rx="3" fill="${P.stitRam}"`);
  s += obdelnik(x + 3, y + 1.5, w - 6, 3, `fill="${P.drevo}" opacity="0.9"`);
  s += obdelnik(x + 1.5, y + 3, 3, h - 6, `fill="${P.drevo}" opacity="0.6"`);
  s += obdelnik(x + 3, y + h - 4, w - 6, 2.5, `fill="#24170F"`);
  s += obdelnik(x + w - 4, y + 3, 2.5, h - 6, `fill="#24170F" opacity="0.8"`);
  // Lišta kolem tváře
  s += obdelnik(t.x - 4, t.y - 4, t.w + 8, t.h + 8, `fill="${P.drevoTma}"`);
  s += obdelnik(t.x - 4, t.y + t.h + 2, t.w + 8, 2, `fill="${P.drevoHrana}" opacity="0.55"`);
  // Tvář, stín lišty (světlo zleva shora) a úzký stín okapu pod horní hranou
  s += obdelnik(t.x, t.y, t.w, t.h, `fill="${P.stit}"`);
  s += mnohouhelnik([[t.x, t.y], [t.x + t.w, t.y], [t.x + t.w, t.y + 5], [t.x + 5, t.y + 5], [t.x + 5, t.y + t.h], [t.x, t.y + t.h]], `fill="${P.omitkaTma}" opacity="0.5"`);
  s += obdelnik(t.x, t.y, t.w, 11, `fill="${P.omitkaStin}" opacity="0.35"`);
  s += tvarStitu();
  // Rohovníky
  s += [`translate(${x} ${y})`, `translate(${x + w} ${y}) scale(-1 1)`, `translate(${x} ${y + h}) scale(1 -1)`, `translate(${x + w} ${y + h}) scale(-1 -1)`]
    .map((tr) => `<use href="#${p}-kanagu" transform="${tr}"/>`)
    .join("");
  s += LAMPICKY.map(lampicka).join("");
  return s;
}

/* ——— Svislá cedule s neonem ——— */

const N = MISTA.neon;
const NX = N.x + N.w / 2;
/** Tvář cedule a neonová trubice kolem ní */
const N_TVAR: Obdelnik = { x: N.x + 8, y: N.y + 12, w: N.w - 16, h: N.h - 22 };
const N_TRUBICE: Obdelnik = { x: N_TVAR.x + 7, y: N_TVAR.y + 7, w: N_TVAR.w - 14, h: N_TVAR.h - 14 };
const N_ZNAKY = { s: "やきもの", y0: 852, krok: 92, vel: 66 };
const ENSO = { cx: NX, cy: 1214, r: 24 };
/** Ensó: kruh jedním tahem štětce, mezera vpravo nahoře */
const ensoD = () => {
  const { cx, cy, r } = ENSO;
  const bod = (u: number, rr: number): Bod => [cx + Math.cos((u * Math.PI) / 180) * rr, cy + Math.sin((u * Math.PI) / 180) * rr];
  const [x0, y0] = bod(-58, r * 1.05);
  const [x1, y1] = bod(-28, r * 0.95);
  return `M${f(x0)} ${f(y0)} A${f(r)} ${f(r)} 0 1 0 ${f(x1)} ${f(y1)}`;
};
const N_PECET = { x: NX - 19, y: 1262, w: 38, h: 84 };
/** Konzoly ke zdi domu */
const KONZOLY = [N.y + 30, 1360];

function konzola(y: number) {
  const k = "#34383D";
  return `${obdelnik(N.x + N.w - 2, y - 9, 8, 18, `rx="1.5" fill="#24272B"`)}
    ${obdelnik(N.x + N.w, y - 4, X.zedL - N.x - N.w + 2, 8, `fill="${k}"`)}
    ${obdelnik(N.x + N.w, y - 4, X.zedL - N.x - N.w + 2, 2, `fill="#7A8086"`)}
    <path d="M${N.x + N.w + 2} ${y + 30} L${N.x + N.w + 34} ${y + 4}" stroke="${k}" stroke-width="4" stroke-linecap="round"/>
    ${obdelnik(X.zedL - 2, y - 15, 11, 34, `rx="2" fill="${k}"`)}
    ${kruh(X.zedL + 3.5, y - 9, 1.8, `fill="${P.kovSvetly}"`)}${kruh(X.zedL + 3.5, y + 13, 1.8, `fill="${P.kovSvetly}"`)}`;
}

/** Trubice ve dne: bledé sklo s odleskem */
const trubiceDen = (d: string) =>
  `<path d="${d}" fill="none" stroke="#E2C4CA" stroke-width="3.4" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${P.bila}" stroke-width="1" stroke-linecap="round" opacity="0.8"/>`;

/** Písmo a pečeť svislé cedule — ve dne i rozsvícené */
function tvarNeonu(barvaPisma: string, tah: number) {
  let s = svisle(N_ZNAKY.s, NX, N_ZNAKY.y0, N_ZNAKY.vel, N_ZNAKY.krok, `fill="${barvaPisma}" stroke="${barvaPisma}" stroke-width="${tah}" stroke-linejoin="round"`);
  s += pecet(N_PECET.x, N_PECET.y, N_PECET.w, N_PECET.h, 3203, P.rumelka);
  s += svisle("ジロ作", NX, N_PECET.y + 20, 20, 22, `fill="${P.stit}"`);
  return s;
}

function neonDen() {
  const t = N_TVAR;
  const tr = N_TRUBICE;
  const T = MISTA.neonTyc;
  let s = "";
  // Stín cedule na zdi souseda (jen ve dne)
  s += `<g class="${TRIDY.jenDen}">${mnohouhelnik(
    [[N.x + N.w, N.y + 20], [N.x + N.w + 16, N.y + 20], [N.x + N.w + 16, N.y + N.h + 18], [N.x + 16, N.y + N.h + 18], [N.x + 16, N.y + N.h], [N.x + N.w, N.y + N.h]],
    `fill="${P.drevoTma2}" opacity="0.2"`,
  )}</g>`;
  // Kabel od stříšky cedule ke zdi
  s += `<path d="M${N.x + N.w - 6} ${N.y - 4} C${N.x + N.w + 16} ${N.y - 2} ${N.x + N.w + 30} ${N.y - 24} ${X.zedL + 2} ${N.y - 28}" stroke="${P.cerna}" stroke-width="2.2" fill="none"/>`;
  s += KONZOLY.map(konzola).join("");
  // Sloup pod cedulí až na chodník
  s += obdelnik(T.x, T.y, T.w, T.h, `fill="${P.kov}"`);
  s += obdelnik(T.x + 2, T.y, 3, T.h, `fill="${P.kovSvetly}" opacity="0.85"`);
  s += obdelnik(T.x + T.w - 4, T.y, 4, T.h, `fill="${P.kovTma}"`);
  s += obdelnik(T.x - 6, T.y, T.w + 12, 12, `rx="2" fill="${P.kovTma}"`);
  s += obdelnik(T.x - 10, Y.chodnikPata - 10, T.w + 20, 10, `rx="2" fill="${P.kovTma}"`);
  s += obdelnik(T.x - 10, Y.chodnikPata - 10, T.w + 20, 2, `fill="${P.kovSvetly}" opacity="0.6"`);
  // Rozvodná skříňka na sloupu a kabel nahoru
  s += cara(T.x + T.w + 1, 1400, T.x + T.w + 1, 1486, `stroke="${P.cerna}" stroke-width="2"`);
  s += obdelnik(T.x - 12, 1486, 38, 56, `rx="3" fill="#CFCBBF"`);
  s += obdelnik(T.x - 12, 1486, 38, 4, `rx="2" fill="#E6E3DA"`);
  s += obdelnik(T.x + 22, 1490, 4, 52, `fill="#A9A498"`);
  s += obdelnik(T.x - 6, 1502, 22, 12, `fill="${P.papir}"`);
  s += mnohouhelnik([[T.x + 5, 1520], [T.x + 1, 1530], [T.x + 5, 1530], [T.x + 2, 1538], [T.x + 9, 1526], [T.x + 5, 1526], [T.x + 8, 1520]], `fill="${P.zlata}"`);
  // Stříška cedule a hřebínek
  s += `<path d="M${N.x + 12} ${N.y - 4} Q${NX} ${N.y - 26} ${N.x + N.w - 12} ${N.y - 4} Z" fill="${P.kovTma}"/>`;
  s += obdelnik(N.x - 8, N.y - 8, N.w + 16, 16, `rx="5" fill="${P.kovTma}"`);
  s += obdelnik(N.x - 6, N.y - 7, N.w + 12, 3, `rx="1.5" fill="${P.kovSvetly}" opacity="0.75"`);
  // Skříň: rám, tvář, stín rámu na tváři
  s += obdelnik(N.x, N.y + 4, N.w, N.h - 6, `rx="3" fill="#34383D"`);
  s += obdelnik(N.x + 1.5, N.y + 6, 2.5, N.h - 10, `fill="#6E757C" opacity="0.8"`);
  s += obdelnik(t.x, t.y, t.w, t.h, `fill="#FAF0EA"`);
  s += mnohouhelnik([[t.x, t.y], [t.x + t.w, t.y], [t.x + t.w, t.y + 5], [t.x + 5, t.y + 5], [t.x + 5, t.y + t.h], [t.x, t.y + t.h]], `fill="${P.omitkaTma}" opacity="0.45"`);
  // Neonová trubice kolem tváře a ensó — ve dne bledé sklo s držáky
  s += trubiceDen(ramD(tr, 10)) + trubiceDen(ensoD());
  const drzaky: [number, number, number, number][] = [];
  for (const y of [860, 990, 1120, 1250]) drzaky.push([tr.x - 1.5, y, 3, 7], [tr.x + tr.w - 1.5, y, 3, 7]);
  drzaky.push([NX - 4, tr.y - 1.5, 8, 3], [NX - 4, tr.y + tr.h - 1.5, 8, 3]);
  s += obdelniky(drzaky, `fill="#5A5F66"`);
  s += tvarNeonu(P.rumelka, 1.4);
  // Spodní lišta
  s += obdelnik(N.x - 5, N.y + N.h - 4, N.w + 10, 12, `rx="4" fill="${P.kovTma}"`);
  s += obdelnik(N.x - 4, N.y + N.h - 3, N.w + 8, 2.5, `fill="${P.kovSvetly}" opacity="0.6"`);
  return s;
}

/* ——— Lucerna na sloupku vpravo ——— */

const L = MISTA.lucerna;
const LT = MISTA.lucernaTyc;
const LX = LT.x + LT.w / 2;
const LUCERNA: Sud = { cx: L.x + L.w / 2, y0: L.y + 9, y1: L.y + L.h - 9, ust: 33, pul: 50 };
const LUCERNA_VICKO: [number, number] = [74, 14];
const LUCERNA_KROK = 9;
/** Příčka pod stříškou sloupku, háček uprostřed (HACEK_Y = dno oblouku háčku) */
const PRICKA_Y = 1206;
const HACEK_Y = PRICKA_Y + 16;
const LUCERNA_ZNAK = { y: (LUCERNA.y0 + LUCERNA.y1) / 2 + 2, vel: 72 };

function lucernaDen() {
  const spodek = Y.chodnikPata - 24;
  let s = "";
  // Stín sloupku na zdi souseda (jen ve dne)
  s += `<g class="${TRIDY.jenDen}">${obdelnik(LT.x + LT.w, LT.y + 20, 9, spodek - LT.y - 20, `fill="${P.drevoTma2}" opacity="0.16"`)}</g>`;
  // Kamenná patka
  s += obdelnik(LX - 20, spodek - 2, 40, Y.chodnikPata - spodek + 2, `rx="3" fill="${P.kamen}"`);
  s += obdelnik(LX - 20, spodek - 2, 40, 5, `rx="2" fill="#D3CAB9"`);
  s += obdelnik(LX + 12, spodek + 2, 8, Y.chodnikPata - spodek - 2, `fill="${P.kamenTma}" opacity="0.8"`);
  // Dřevěný sloupek s letokruhy
  s += obdelnik(LT.x, LT.y, LT.w, spodek - LT.y, `fill="${P.drevo}"`);
  s += obdelnik(LT.x, LT.y, 4, spodek - LT.y, `fill="${P.drevoSvetle}"`);
  s += obdelnik(LT.x + LT.w - 4, LT.y, 4, spodek - LT.y, `fill="${P.drevoTma}"`);
  s += `<path d="M${LT.x + 7} 1440 C${LT.x + 8} 1520 ${LT.x + 6} 1600 ${LT.x + 7.5} 1700 M${LT.x + 10} 1250 C${LT.x + 11} 1300 ${LT.x + 9} 1340 ${LT.x + 10} 1420" stroke="${P.drevoTma}" stroke-width="1" fill="none" opacity="0.6"/>`;
  // Stříška na sloupku s hřebínkem
  s += `<path d="M${LX - 30} ${LT.y + 4} Q${LX - 14} ${LT.y - 4} ${LX} ${LT.y - 16} Q${LX + 14} ${LT.y - 4} ${LX + 30} ${LT.y + 4} L${LX + 27} ${LT.y + 8} L${LX - 27} ${LT.y + 8} Z" fill="${P.taskaTma}"/>`;
  s += `<path d="M${LX - 30} ${LT.y + 4} Q${LX - 14} ${LT.y - 4} ${LX} ${LT.y - 16} L${LX} ${LT.y - 10} Q${LX - 13} ${LT.y} ${LX - 26} ${LT.y + 5} Z" fill="${P.taskaSvetla}" opacity="0.7"/>`;
  s += obdelnik(LX - 22, LT.y + 8, 44, 5, `fill="${P.drevoTma}"`);
  s += kruh(LX, LT.y - 18, 3.4, `fill="${P.taskaHrana}"`);
  // Příčka s háčkem
  s += obdelnik(LX - 36, PRICKA_Y - 6, 72, 11, `rx="2" fill="${P.drevo}"`);
  s += obdelnik(LX - 36, PRICKA_Y - 6, 72, 3, `rx="1.5" fill="${P.drevoSvetle}"`);
  s += obdelnik(LX - 36, PRICKA_Y + 2, 72, 3, `fill="${P.drevoTma}"`);
  s += obdelnik(LX - 40, PRICKA_Y - 7, 6, 13, `rx="1.5" fill="${P.drevoTma}"`) + obdelnik(LX + 34, PRICKA_Y - 7, 6, 13, `rx="1.5" fill="${P.drevoTma}"`);
  // Háček (J), v jeho oblouku visí šňůra lucerny
  s += `<path d="M${LX + 4} ${PRICKA_Y + 4} V${HACEK_Y - 4} A4 4 0 0 1 ${LX - 4} ${HACEK_Y - 4} V${HACEK_Y - 8}" stroke="${P.kovTma}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  return s;
}
/** Lucerna i se šňůrou od háčku — skupina, která se může houpat */
const lucernaTelo = (svit: boolean) =>
  `${cara(LX, HACEK_Y - 1, LX, LUCERNA.y0 - 8, `stroke="${P.cerna}" stroke-width="2"`)}${kruh(LX, HACEK_Y - 1, 2.4, `fill="none" stroke="${P.cerna}" stroke-width="1.4"`)}${
    svit ? lampionSvit(LUCERNA, `${p}-s-lucerna-orez`, LUCERNA_VICKO, LUCERNA_KROK) : lampionDen(LUCERNA, `${p}-lucerna-orez`, LUCERNA_VICKO, LUCERNA_KROK)
  }${znak("器", LUCERNA.cx, LUCERNA_ZNAK.y, LUCERNA_ZNAK.vel, svit ? `fill="#4A160C" opacity="0.88"` : `fill="${P.cerna}"`)}`;

/* ——— Cedulka na dveřích (na sloupku 1) ——— */

/**
 * Hřebík na sloupku 1 (mezi levou výlohou a dveřmi), ze kterého visí cedulka
 * přímo pod lampionem 2 — ten na ni večer svítí. Cedulka se počítá od hřebíku:
 * kdyby měla viset jinde, stačí posunout HREBIK.
 */
const SL = PRIZEMI.sloupy[1];
const HREBIK: Bod = [SL.x + SL.w / 2, 1352];
const CX = HREBIK[0];
const CEDULKA: Obdelnik = { x: CX - 22, y: HREBIK[1] + 26, w: 44, h: 70 };
/** Lampion, který visí nad cedulkou (jeho světlo na ni padá) */
const NAD_CEDULKOU = LAMPIONY.findIndex((cx) => Math.abs(cx - CX) < 40);

/**
 * Strana cedulky: líc 営業中 tuší na světlém dřevě, rub 準備中 rumělkou na
 * tmavším dřevě — v noci při zavírání na ni svítí lampion 2, tak ať je čitelná.
 */
function cedulkaStrana(otevreno: boolean) {
  const c = CEDULKA;
  const drevo = otevreno ? "#E4CDA4" : "#CDA878";
  const hrana = otevreno ? P.drevoHrana : P.drevo;
  const pismo = otevreno ? P.inkoust : P.rumelkaTma;
  return `${obdelnik(c.x, c.y, c.w, c.h, `rx="4" fill="${hrana}"`)}
    ${obdelnik(c.x + 2, c.y + 2, c.w - 4, c.h - 4, `rx="3" fill="${drevo}"`)}
    ${obdelnik(c.x + 2, c.y + 2, c.w - 4, 2, `fill="${P.bila}" opacity="${otevreno ? 0.45 : 0.3}"`)}
    ${otevreno ? "" : obdelnik(c.x + 5, c.y + 12, c.w - 10, c.h - 17, `rx="2" fill="none" stroke="${P.rumelkaTma}" stroke-width="1" opacity="0.6"`)}
    ${kruh(c.x + 7, c.y + 6, 1.8, `fill="${P.drevoTma2}"`)}${kruh(c.x + c.w - 7, c.y + 6, 1.8, `fill="${P.drevoTma2}"`)}
    ${svisle(otevreno ? "営業中" : "準備中", CX, c.y + 23, 15.5, 18, `fill="${pismo}" stroke="${pismo}" stroke-width="0.4"`)}`;
}

function cedulka() {
  const c = CEDULKA;
  const [hx, hy] = HREBIK;
  return `<g class="${TRIDY.jenDen}">${obdelnik(c.x + 5, c.y + 6, c.w, c.h, `rx="4" fill="${P.drevoTma2}" opacity="0.2"`)}</g>
    <path d="M${c.x + 7} ${c.y + 6} L${hx} ${hy} L${c.x + c.w - 7} ${c.y + 6}" stroke="${P.rumelkaTma}" stroke-width="1.4" fill="none" stroke-linejoin="round"/>
    ${kruh(hx, hy, 2.6, `fill="${P.kovTma}"`)}${kruh(hx - 0.6, hy - 0.6, 0.9, `fill="${P.kovSvetly}"`)}
    <g class="${TRIDY.otevreno}">${cedulkaStrana(true)}</g>
    <g class="${TRIDY.zavreno}">${cedulkaStrana(false)}</g>`;
}

/* ——— Pouliční lampa ——— */

const LS = MISTA.lampaSloup;
const LH = MISTA.lampaHlava;
const LSX = LS.x + LS.w / 2;
const LHX = LH.x + LH.w / 2;
const LAMPA = { kov: "#3E4448", svetly: "#7E888D", tmavy: "#2A2F33", sklo: "#E9EEF0", skloStin: "#C6D0D5" };
/** Labutí krk od hlavice sloupu k závěsu lampy */
const RAMENO: [Bod, Bod, Bod, Bod] = [[LS.x + LS.w - 1, LS.y + 18], [LS.x + 31, LS.y - 14], [LHX - 28, LH.y - 46], [LHX, LH.y - 7]];
/** Ozdobná spirála mezi sloupem a krkem: od sloupu oblouk dovnitř do závitu */
const spiralaD = () => {
  const c: Bod = [LS.x + 55, LS.y + 20];
  const r0 = 23;
  const r1 = 5;
  let d = `M${LS.x + LS.w - 1} ${LS.y + 84} C${LS.x + 34} ${LS.y + 82} ${c[0] - 12} ${c[1] + r0} ${c[0]} ${c[1] + r0}`;
  const n = 34;
  for (let k = 1; k <= n; k++) {
    const t = k / n;
    const u = ((90 - t * 500) * Math.PI) / 180;
    const r = r0 - (r0 - r1) * t;
    d += ` L${f(c[0] + Math.cos(u) * r)} ${f(c[1] + Math.sin(u) * r)}`;
  }
  return d;
};
/** Spodek skla — odsud padá světlo */
const SKLO_DOLE = LH.y + 57;
/** Zvon skla pod kloboukem */
const skloD = () =>
  `M${LHX - 29} ${LH.y + 24} H${LHX + 29} C${LHX + 32} ${LH.y + 36} ${LHX + 28} ${LH.y + 50} ${LHX + 14} ${LH.y + 54} Q${LHX} ${SKLO_DOLE + 1} ${LHX - 14} ${LH.y + 54} C${LHX - 28} ${LH.y + 50} ${LHX - 32} ${LH.y + 36} ${LHX - 29} ${LH.y + 24} Z`;

function lampaDen() {
  const { kov, svetly, tmavy } = LAMPA;
  const pata = LS.y + LS.h;
  let s = "";
  // Litinová patka
  s += `<path d="M${LSX - 23} ${pata} L${LSX + 23} ${pata} L${LSX + 19} ${pata - 14} C${LSX + 16} ${pata - 22} ${LSX + 11} ${pata - 26} ${LSX + 10} ${pata - 34} L${LSX - 10} ${pata - 34} C${LSX - 11} ${pata - 26} ${LSX - 16} ${pata - 22} ${LSX - 19} ${pata - 14} Z" fill="${kov}"/>`;
  s += `<path d="M${LSX - 19} ${pata - 14} C${LSX - 16} ${pata - 22} ${LSX - 11} ${pata - 26} ${LSX - 10} ${pata - 34} L${LSX - 6} ${pata - 34} C${LSX - 7} ${pata - 26} ${LSX - 11} ${pata - 20} ${LSX - 13} ${pata - 14} Z" fill="${svetly}" opacity="0.7"/>`;
  s += obdelnik(LSX - 25, pata - 6, 50, 6, `rx="2" fill="${tmavy}"`);
  // Dřík: světlo zleva, stín vpravo; prstence
  s += obdelnik(LS.x + 1, LS.y, LS.w - 2, LS.h - 34, `fill="${kov}"`);
  s += obdelnik(LS.x + 3, LS.y, 3, LS.h - 34, `fill="${svetly}" opacity="0.85"`);
  s += obdelnik(LS.x + LS.w - 6, LS.y, 5, LS.h - 34, `fill="${tmavy}"`);
  for (const y of [1395, 1640]) {
    s += obdelnik(LS.x - 3, y, LS.w + 6, 9, `rx="2" fill="${kov}"`) + obdelnik(LS.x - 2, y + 1, LS.w + 4, 2, `fill="${svetly}" opacity="0.8"`);
  }
  // Cedulka ulice: 胡桃通り (Ořechová) na modrém plechu
  const c = { x: LSX - 16, y: 1150, w: 32, h: 124 };
  s += `<g class="${TRIDY.jenDen}">${obdelnik(c.x + 4, c.y + 5, c.w, c.h, `rx="3" fill="${P.drevoTma2}" opacity="0.18"`)}</g>`;
  s += obdelnik(c.x, c.y, c.w, c.h, `rx="3" fill="${P.indigo}"`);
  s += obdelnik(c.x + 3, c.y + 3, c.w - 6, c.h - 6, `rx="2" fill="none" stroke="#E9E2CF" stroke-width="1"`);
  s += svisle("胡桃通り", LSX, c.y + 22, 19, 26, `fill="#F4EEDF"`);
  s += kruh(LSX, c.y - 5, 2.2, `fill="${svetly}"`) + kruh(LSX, c.y + c.h + 5, 2.2, `fill="${svetly}"`);
  // Hlavice sloupu a vrcholek
  s += obdelnik(LS.x - 2, LS.y - 4, LS.w + 4, 10, `rx="2" fill="${kov}"`);
  s += kruh(LSX, LS.y - 12, 6.5, `fill="${kov}"`) + kruh(LSX - 2, LS.y - 14, 2, `fill="${svetly}"`);
  s += cara(LSX, LS.y - 18, LSX, LS.y - 28, `stroke="${kov}" stroke-width="2.4" stroke-linecap="round"`);
  // Labutí krk se spirálou pod ním, kulička na konci spirály
  s += `<path d="${spiralaD()}" stroke="${kov}" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  s += `<path d="${krivka(...RAMENO)}" stroke="${kov}" stroke-width="5.5" fill="none" stroke-linecap="round"/>`;
  s += `<path d="${krivka(...RAMENO)}" stroke="${svetly}" stroke-width="1.4" fill="none" stroke-linecap="round" opacity="0.65" transform="translate(-0.6 -2)"/>`;
  const [kx, ky] = bezier(...RAMENO, 0.42);
  s += obdelnik(kx - 4, ky - 2, 8, 6, `rx="1.5" fill="${tmavy}"`);
  // Hlava: závěs, klobouk, sklo, špička
  s += cara(LHX, LH.y - 8, LHX, LH.y + 6, `stroke="${kov}" stroke-width="3"`);
  s += `<path d="M${LHX - 40} ${LH.y + 22} Q${LHX - 30} ${LH.y + 4} ${LHX} ${LH.y + 2} Q${LHX + 30} ${LH.y + 4} ${LHX + 40} ${LH.y + 22} Z" fill="${kov}"/>`;
  s += `<path d="M${LHX - 40} ${LH.y + 22} Q${LHX - 30} ${LH.y + 4} ${LHX} ${LH.y + 2} L${LHX} ${LH.y + 7} Q${LHX - 24} ${LH.y + 9} ${LHX - 32} ${LH.y + 22} Z" fill="${svetly}" opacity="0.55"/>`;
  s += kruh(LHX, LH.y + 1, 3.5, `fill="${kov}"`);
  s += obdelnik(LHX - 42, LH.y + 20, 84, 5, `rx="2" fill="${tmavy}"`);
  s += `<path d="${skloD()}" fill="${LAMPA.sklo}"/>`;
  s += `<path d="M${LHX + 8} ${LH.y + 25} H${LHX + 29} C${LHX + 32} ${LH.y + 36} ${LHX + 28} ${LH.y + 50} ${LHX + 14} ${LH.y + 54} Q${LHX + 7} ${LH.y + 57} ${LHX + 3} ${LH.y + 57.5} C${LHX + 13} ${LH.y + 47} ${LHX + 14} ${LH.y + 36} ${LHX + 8} ${LH.y + 25} Z" fill="${LAMPA.skloStin}"/>`;
  s += elipsa(LHX - 17, LH.y + 35, 3.4, 8, `fill="${P.bila}" opacity="0.9"`);
  s += kruh(LHX, SKLO_DOLE + 3, 3, `fill="${kov}"`) + cara(LHX, SKLO_DOLE + 5, LHX, SKLO_DOLE + 10, `stroke="${kov}" stroke-width="1.6" stroke-linecap="round"`);
  return s;
}

/* ——— Vrstvy ——— */

function zadni() {
  return `<defs>${kanaguTvar()}</defs><g class="krm-ce-stit">${stitDen()}</g>`;
}

/** Denní stíny sloupků na chodníku — padají doprava dolů (jen ve dne) */
function zem() {
  const stin = (x: number, w: number, pata: number, delka: number) =>
    mnohouhelnik([[x, pata], [x + w, pata], [x + w + delka, pata + delka * 0.7], [x + delka, pata + delka * 0.7]], `fill="${P.drevoTma2}" opacity="0.16"`);
  return `<g class="${TRIDY.jenDen}">
    ${stin(LS.x - 6, LS.w + 12, LS.y + LS.h - 2, 46)}
    ${stin(MISTA.neonTyc.x - 6, MISTA.neonTyc.w + 12, Y.chodnikPata - 2, 60)}
    ${stin(LT.x - 8, LT.w + 16, Y.chodnikPata - 2, 60)}
  </g>`;
}

function predni() {
  const defs = `<defs>
    <clipPath id="${p}-lampion-orez"><path d="${obrysSudu(LAMPION)}"/></clipPath>
    <clipPath id="${p}-lucerna-orez"><path d="${obrysSudu(LUCERNA)}"/></clipPath>
    <g id="${p}-lampion">${snura(0, -3, 7)}${lampionDen(LAMPION, `${p}-lampion-orez`, LAMPION_VICKO, LAMPION_KROK)}</g>
  </defs>`;
  const lampiony = LAMPIONY.map(
    (cx, i) =>
      `<g class="${TRIDY.lampion}" data-i="${i}"><use href="#${p}-lampion" x="${f(cx)}" y="${Y.striskaDole}"/>${znak(ZNAKY_LAMPIONU[i], cx, Y.striskaDole + LAMPION_ZNAK.y, LAMPION_ZNAK.vel, `fill="${P.cerna}"`)}</g>`,
  ).join("");
  return `${defs}
    <g class="krm-ce-lampa">${lampaDen()}</g>
    <g class="krm-ce-neon">${neonDen()}</g>
    <g class="krm-ce-lucerna">${lucernaDen()}<g class="krm-ce-lucerna-telo">${lucernaTelo(false)}</g></g>
    <g class="krm-ce-cedulka">${cedulka()}</g>
    ${kabel()}
    ${lampiony}`;
}

/* ——— Světla ——— */

function svetlaDefs() {
  return `<defs>
    <clipPath id="${p}-s-lampion-orez"><path d="${obrysSudu(LAMPION)}"/></clipPath>
    <clipPath id="${p}-s-lucerna-orez"><path d="${obrysSudu(LUCERNA)}"/></clipPath>
    <clipPath id="${p}-s-tvar"><rect x="${TVAR.x}" y="${TVAR.y}" width="${TVAR.w}" height="${TVAR.h}"/></clipPath>
    ${kruhovy(`${p}-s-papir`, [[0, "#FFFBEC", 1], [0.2, SVIT.zarBila, 1], [0.42, SVIT.zar, 1], [0.62, SVIT.zarTepla, 1], [0.8, SVIT.plamen, 1], [1, "#D64A2A", 1]], 'cx="0.5" cy="0.5" r="0.54" fx="0.5" fy="0.45"')}
    ${primy(`${p}-s-obruc`, [[0, "#FFE7B0", 0.8], [0.26, "#FFE7B0", 0.25], [0.4, "#FFE7B0", 0], [0.6, "#FFE7B0", 0], [0.74, "#FFE7B0", 0.25], [1, "#FFE7B0", 0.8]], 'x1="0" y1="0" x2="1" y2="0"')}
    ${kruhovy(`${p}-s-halo`, [[0, SVIT.zarTepla, 0.9], [0.3, SVIT.zarTepla, 0.56], [0.46, SVIT.plamen, 0.3], [0.72, SVIT.plamen, 0.1], [1, SVIT.plamen, 0]])}
    ${kruhovy(`${p}-s-skvrna`, [[0, SVIT.zarBila, 0.8], [0.45, SVIT.zar, 0.35], [1, SVIT.zar, 0]])}
    ${kruhovy(`${p}-s-pas`, [[0, SVIT.zarTepla, 0.14], [0.7, SVIT.zarTepla, 0.07], [1, SVIT.zarTepla, 0]])}
    ${kruhovy(`${p}-s-hrana`, [[0, SVIT.zar, 0.3], [0.7, SVIT.zar, 0.14], [1, SVIT.zar, 0]])}
    ${kruhovy(`${p}-s-kvet`, [[0, SVIT.zarTepla, 0.6], [0.55, SVIT.zarTepla, 0.5], [0.75, SVIT.plamen, 0.22], [1, SVIT.plamen, 0]])}
    ${kruhovy(`${p}-s-plocha`, [[0, SVIT.zarTepla, 0.44], [0.5, SVIT.zarTepla, 0.2], [1, SVIT.zarTepla, 0]])}
    ${kruhovy(`${p}-s-stit-halo`, [[0, SVIT.zar, 0.4], [0.5, SVIT.zarTepla, 0.16], [1, SVIT.zarTepla, 0]])}
    ${primy(`${p}-s-stit-tvar`, [[0, "#FFF4D8", 1], [1, "#FFE2AC", 1]])}
    ${kruhovy(`${p}-s-neon-halo`, [[0, SVIT.neon, 0.45], [0.45, SVIT.neon, 0.16], [1, SVIT.neon, 0]])}
    ${primy(`${p}-s-neon-tvar`, [[0, "#FFC3CF", 1], [0.22, SVIT.neonBily, 1], [0.5, "#FFF4F5", 1], [0.78, SVIT.neonBily, 1], [1, "#FFC3CF", 1]], 'x1="0" y1="0" x2="1" y2="0"')}
    ${primy(`${p}-s-neon-dolu`, [[0, SVIT.neon, 0.55], [1, SVIT.neon, 0]])}
    ${kruhovy(`${p}-s-lampa-halo`, [[0, SVIT.zarBila, 0.8], [0.2, SVIT.zar, 0.42], [0.55, SVIT.zar, 0.12], [1, SVIT.zar, 0]])}
    ${kruhovy(`${p}-s-lampa-kuzel`, [[0, SVIT.zarBila, 0.5], [0.3, SVIT.zar, 0.2], [0.75, SVIT.zar, 0.06], [1, SVIT.zar, 0]], 'cx="0.5" cy="0.5" r="0.5" fx="0.5" fy="0.02"')}
    ${kruhovy(`${p}-s-lampa-sklo`, [[0, P.bila, 1], [0.5, SVIT.zarBila, 1], [1, SVIT.zar, 1]], 'cx="0.5" cy="0.3" r="0.65"')}
    ${kruhovy(`${p}-s-tune`, [[0, SVIT.zar, 0.42], [0.6, SVIT.zar, 0.16], [1, SVIT.zar, 0]])}
    ${primy(`${p}-s-dolu`, [[0, SVIT.zarTepla, 0.6], [1, SVIT.zarTepla, 0]])}
    <g id="${p}-s-lampion">${snura(0, -3, 7, true)}${lampionSvit(LAMPION, `${p}-s-lampion-orez`, LAMPION_VICKO, LAMPION_KROK)}</g>
  </defs>`;
}

/** Rozsvícená lampa: kužel, kaluž na chodníku, záře, žhnoucí sklo, můry */
function lampaSvit() {
  const dole = Y.chodnikPata + 40;
  let s = elipsa(LHX, (SKLO_DOLE - 12 + dole) / 2, 175, (dole - SKLO_DOLE + 12) / 2, `fill="url(#${p}-s-lampa-kuzel)"`);
  s += elipsa(LHX, Y.chodnikPata + 26, 190, 30, `fill="url(#${p}-s-tune)"`);
  s += elipsa(LHX, LH.y + 34, 150, 140, `fill="url(#${p}-s-lampa-halo)"`);
  // Teplé lemy na krku a dříku, kam dosvítí
  s += `<path d="${krivka(...RAMENO)}" stroke="${SVIT.zar}" stroke-width="1.4" fill="none" opacity="0.5" transform="translate(0 2.2)"/>`;
  s += `<path d="${skloD()}" fill="url(#${p}-s-lampa-sklo)"/>`;
  s += obdelnik(LHX - 41, LH.y + 24, 82, 1.8, `fill="${SVIT.zarTepla}"`);
  // Můry — každá zvlášť, souřadnice přímo (bez transform na skupině), ať s nimi stránka může třepetat
  const mury: [number, number, number][] = [
    [LHX - 46, LH.y + 72, -20],
    [LHX + 40, LH.y + 66, 25],
    [LHX + 64, LH.y + 20, -35],
    [LHX - 66, LH.y + 32, 15],
  ];
  s += `<g class="${TRIDY.mury}">${mury
    .map(
      ([x, y, u]) =>
        `<g class="krm-ce-mura">${elipsa(x - 2.6, y, 3.4, 2, `fill="#F6EEDC" opacity="0.92" transform="rotate(${u - 25} ${x - 2.6} ${y})"`)}${elipsa(x + 2.6, y, 3.4, 2, `fill="#F6EEDC" opacity="0.92" transform="rotate(${u + 25} ${x + 2.6} ${y})"`)}${elipsa(x, y + 0.5, 0.9, 2.2, `fill="#8E7A62"`)}</g>`,
    )
    .join("")}</g>`;
  return s;
}

/** Rozsvícený štít: záře kolem, tvář svítí, pod lampičkami světlejší skvrny, písmo zůstane ostré */
function stitSvit() {
  const t = TVAR;
  let s = elipsa(X.stred, STRED_Y, 560, 165, `fill="url(#${p}-s-stit-halo)"`);
  s += obdelnik(t.x - 4, t.y - 4, t.w + 8, t.h + 8, `fill="none" stroke="${SVIT.zarTepla}" stroke-width="2" opacity="0.6"`);
  s += obdelnik(t.x, t.y, t.w, t.h, `fill="url(#${p}-s-stit-tvar)"`);
  s += `<g clip-path="url(#${p}-s-tvar)">${LAMPICKY.map((x) => elipsa(x, t.y + 6, 130, 52, `fill="url(#${p}-s-skvrna)"`)).join("")}</g>`;
  s += tvarStitu();
  for (const x of LAMPICKY) {
    s += elipsa(x, S.y + 3, 46, 7, `fill="url(#${p}-s-skvrna)"`);
    s += elipsa(x, LAMPICKA_Y, 34, 16, `fill="url(#${p}-s-skvrna)"`);
    s += elipsa(x, LAMPICKA_Y, 18, 3.4, `fill="${SVIT.zarBila}"`);
  }
  return s;
}

/** Rozsvícená svislá cedule: růžová záře, svítící tvář, neonová trubice s bílým jádrem */
function neonSvit() {
  const t = N_TVAR;
  const T = MISTA.neonTyc;
  const trubice = (d: string) =>
    `<path d="${d}" fill="none" stroke="${SVIT.neon}" stroke-width="13" stroke-linecap="round" opacity="0.16"/>
     <path d="${d}" fill="none" stroke="${SVIT.neon}" stroke-width="7" stroke-linecap="round" opacity="0.4"/>
     <path d="${d}" fill="none" stroke="${SVIT.neon}" stroke-width="3.6" stroke-linecap="round"/>
     <path d="${d}" fill="none" stroke="${SVIT.neonBily}" stroke-width="1.4" stroke-linecap="round"/>`;
  const obrys = ramD({ x: N.x - 2, y: N.y + 2, w: N.w + 4, h: N.h - 2 }, 6);
  // Růžový odraz na chodníku pod cedulí a záře kolem
  let s = elipsa(NX, Y.chodnikPata + 28, 130, 24, `fill="url(#${p}-s-neon-halo)" opacity="0.7"`);
  s += elipsa(NX, N.y + N.h / 2, 200, 430, `fill="url(#${p}-s-neon-halo)"`);
  // Záře těsně kolem skříně
  s += `<path d="${obrys}" fill="none" stroke="${SVIT.neon}" stroke-width="30" opacity="0.12"/><path d="${obrys}" fill="none" stroke="${SVIT.neon}" stroke-width="14" opacity="0.2"/>`;
  // Růžové lemy na konzolách a sloupu pod cedulí
  s += KONZOLY.map((y) => obdelnik(N.x + N.w, y - 4, X.zedL - N.x - N.w, 1.8, `fill="${SVIT.neon}" opacity="0.8"`)).join("");
  s += obdelnik(T.x, T.y + 12, T.w, 120, `fill="url(#${p}-s-neon-dolu)"`);
  s += obdelnik(N.x - 1, N.y + 3, N.w + 2, N.h - 4, `rx="3" fill="none" stroke="${SVIT.neon}" stroke-width="1.6" opacity="0.6"`);
  s += obdelnik(t.x, t.y, t.w, t.h, `fill="url(#${p}-s-neon-tvar)"`);
  s += trubice(ramD(N_TRUBICE, 10)) + trubice(ensoD());
  s += svisle(N_ZNAKY.s, NX, N_ZNAKY.y0, N_ZNAKY.vel, N_ZNAKY.krok, `fill="none" stroke="${SVIT.neon}" stroke-width="7" stroke-linejoin="round" opacity="0.35"`);
  s += tvarNeonu("#D8283F", 1.4);
  return s;
}

/** Rozsvícená lucerna: velká záře, papír, 器 jako tmavý stín, teplo na sloupku a příčce */
function lucernaSvit() {
  const { cx, y0, y1 } = LUCERNA;
  const ys = (y0 + y1) / 2;
  // Teplá kaluž světla na chodníku pod sloupkem a velká záře kolem
  let s = elipsa(LX, Y.chodnikPata + 24, 140, 24, `fill="url(#${p}-s-tune)" opacity="0.75"`);
  s += elipsa(cx, ys, 175, 165, `fill="url(#${p}-s-halo)"`);
  s += obdelnik(LT.x, y1 + 6, LT.w, 110, `fill="url(#${p}-s-dolu)"`);
  s += obdelnik(LX - 36, PRICKA_Y + 3, 72, 2, `fill="${SVIT.zarTepla}" opacity="0.7"`);
  s += `<g class="krm-ce-lucerna-telo">${lucernaTelo(true)}</g>`;
  return s;
}

function svetlaVrstva() {
  let s = svetlaDefs();
  s += svetlo(PRAH.lampa, lampaSvit(), "krm-ce-lampa");
  // Rozlité světlo lampionů na schránce rolety a na hraně stříšky
  s += svetlo(
    PRAH.rozliti,
    `${elipsa(X.stred, Y.striskaDole + 42, 560, 72, `fill="url(#${p}-s-pas)"`)}${elipsa(X.stred, Y.striskaDole - 4, 560, 7, `fill="url(#${p}-s-hrana)"`)}`,
    "krm-ce-zar",
  );
  s += svetlo(PRAH.neon, neonSvit(), TRIDY.neon);
  s += svetlo(PRAH.stit, stitSvit(), "krm-ce-stit");
  // Lampiony: záře zvlášť (nehoupe se), tělo s krm-lampion (houpe se s denním dvojníkem)
  LAMPIONY.forEach((cx, i) => {
    const prah = PRAH.lampionOd + i * PRAH.lampionKrok;
    // Světlo na schránce rolety za lampionem, záře kolem, květ těsně u papíru, skvrna na hraně stříšky
    const zar =
      elipsa(cx, Y.striskaDole + 46, 120, 58, `fill="url(#${p}-s-plocha)"`) +
      elipsa(cx, Y.striskaDole + 52, 104, 92, `fill="url(#${p}-s-halo)"`) +
      elipsa(cx, Y.striskaDole + 50, LAMPION.pul + 13, 52, `fill="url(#${p}-s-kvet)"`) +
      elipsa(cx, Y.striskaDole - 3, 62, 10, `fill="url(#${p}-s-skvrna)"`) +
      // lampion nad cedulkou na dveřích jí posvítí na horní půlku (obě strany mají stejný tvar)
      (i === NAD_CEDULKOU ? elipsa(CX, CEDULKA.y + 14, 48, 62, `fill="url(#${p}-s-plocha)"`) : "");
    s += svetlo(prah, zar, "krm-ce-lampion-zar", `data-i="${i}"`);
  });
  LAMPIONY.forEach((cx, i) => {
    const prah = PRAH.lampionOd + i * PRAH.lampionKrok;
    const telo = `<use href="#${p}-s-lampion" x="${f(cx)}" y="${Y.striskaDole}"/>${znak(ZNAKY_LAMPIONU[i], cx, Y.striskaDole + LAMPION_ZNAK.y, LAMPION_ZNAK.vel, `fill="#4A160C" opacity="0.88"`)}`;
    s += svetlo(prah, telo, TRIDY.lampion, `data-i="${i}"`);
  });
  s += svetlo(PRAH.lucerna, lucernaSvit(), "krm-ce-lucerna");
  return s;
}

/* ——— Export ——— */

export function cedule(): Vrstvy {
  return {
    zadni: zadni(),
    zem: zem(),
    predni: predni(),
    svetla: svetlaVrstva(),
  };
}

/** Plochy pro najetí myší a body, kolem kterých se věci hýbou (souřadnice světa) */
export const CEDULE = {
  /** Sedm lampionů i se šňůrou (zleva, i = 0–6) */
  lampiony: LAMPIONY.map((cx): Obdelnik => ({ x: f(cx - LAMPION.pul), y: Y.striskaDole - 5, w: LAMPION.pul * 2, h: Y.lampionDole + 5 - (Y.striskaDole - 5) })),
  /** Svislá cedule (skříň se stříškou, bez sloupu) */
  neon: { x: N.x - 8, y: N.y - 26, w: N.w + 16, h: N.h + 34 } as Obdelnik,
  /** Lucerna na sloupku (i se šňůrou od háčku) */
  lucerna: { x: L.x, y: PRICKA_Y + 5, w: L.w, h: L.y + L.h + 4 - PRICKA_Y - 5 } as Obdelnik,
  /** Hlava pouliční lampy s krkem */
  lampa: { x: LS.x, y: LH.y - 30, w: LH.x + LH.w + 4 - LS.x, h: LH.h + 34 } as Obdelnik,
  /** Cedulka na dveřích (deštička, bez šňůrky) */
  cedulka: CEDULKA,
  /** Lampiony se houpou kolem horního konce šňůry */
  osyLampionu: LAMPIONY.map((cx): Bod => [f(cx), Y.striskaDole]),
  /** Lucerna se houpe kolem háčku na příčce */
  osaLucerny: [LX, HACEK_Y - 1] as Bod,
  /** Cedulka se otáčí kolem svislé osy uprostřed (x), šňůrka visí z hřebíku */
  osaCedulky: [CX, CEDULKA.y + CEDULKA.h / 2] as Bod,
  hrebik: HREBIK,
};

/** Japonské znaky v kresbě (stránka je stejně sbírá ze scény — tohle je pro kontrolu) */
export const CEDULE_ZNAKY = [...new Set([...NAPIS.map((n) => n.z), ...ZNAKY_LAMPIONU, ..."器胡桃ジロ作", ...N_ZNAKY.s, ..."営業中準備中", ..."胡桃通り"])].join("");
