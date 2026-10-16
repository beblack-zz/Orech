/**
 * Trubka na úvodu O nás 2 — „Svět v kapce“. Stará natřená vodovodní
 * trubka pod stropem garáže v noci, makrozáběr. Vede přes horní okraj
 * jeviště od x −2600 do 3600 (CSS ji podle šířky obrazovky ořízne) a na
 * jejím spodku na ose OSA_X je prasklina, ze které visí kapka se světem.
 *
 *   zadni  za kapkou: spodek stropu, tenčí trubka vzadu (výš, tmavší,
 *          s menším kontrastem), její spojky, odbočky do stropu a závěsy
 *   svg    hlavní trubka před kapkou. Kapka zastrčí krk pod její spodní
 *          hranu, proto je hrana mezi x 455 a 545 čistá a prasklina na
 *          ní jen sedí. Šoupě, příruby, spojky, opravné objímky, závěsy
 *          na tyčích, odprýsklý nátěr, rez, vodní kámen, kapičky
 *          kondenzátu a hlavně prasklina s mokrou skvrnou.
 *   defs   přechody, ořez a díly, které se opakují (<use>)
 *
 * Světlo: měsíc zleva shora a trochu zezadu — jasný lem na horní hraně
 * (nejjasnější tam, kde stojí Kapka) a na levých hranách tvarovek, svislé
 * díly svítí zleva. Zespodu svítí kapka: teplá záře na spodku trubky,
 * nejsilnější na ose a do ztracena asi 250 jednotek na každou stranu;
 * mokrý spodek kolem praskliny ji odráží. Nahoře nad x 300–410 nic není,
 * stojí tam Kapka (KAPKA_KAMI_X).
 */
import { f, OSA_X, TRUBKA_Y, TRUBKA_R, PRASKLINA_Y, KAPKA_KAMI_X } from "./miry";
import type { Bod } from "./miry";
import { nahoda } from "../../parta2/tvary";
import { smichej } from "../../dilna/kresba/zaklad";

/* ═══════════════ Míry ═══════════════ */

/** Kudy trubka vede — dost daleko, aby přešla každou obrazovku */
const OD = -2600;
const DO = 3600;
const DELKA = DO - OD;
const HORE = TRUBKA_Y - TRUBKA_R;
const DOLE = PRASKLINA_Y;
const PRUMER = 2 * TRUBKA_R;
/** Spodní hrana stropu — do ní vedou tyče závěsů */
const STROP = 26;
/** Zadní trubka: osa a poloměr */
const ZY = 88;
const ZR = 15;
/** Šoupě s ručním kolem */
const SOUPE = 20;
/** Závěsy hlavní trubky po 640 (jeden vlevo od Kapky na 190, další vpravo na 830), zadní po 600 jinak posazené */
const ZAVESY = Array.from({ length: 10 }, (_, i) => 190 + (i - 4) * 640);
const ZAVESY_VZADU = Array.from({ length: 10 }, (_, i) => 700 + (i - 5) * 600);
const PRIRUBY = [-300, -1420, 1720, 2980];
const SPOJKY = [680, 1260, -760, -2060, 2440];
const OBJIMKY = [1010, -1890, 3200];
const SPOJKY_VZADU = [-380, 980, 2000, -1500, 2800, -2500];
const ODBOCKY = [1180, -900];

/* ═══════════════ Barvy ═══════════════ */

interface Kov {
  lem: string;
  svetlo: string;
  stred: string;
  tma: string;
  stin: string;
  odraz: string;
  hrana: string;
}
const NOC = "#141B42";
/** Nátěr hlavní trubky — břidlicová modrošedá v měsíci, dole odlesk modré vody */
const NATER: Kov = { lem: "#C4D2E6", svetlo: "#7B8CA9", stred: "#3E4C68", tma: "#283149", stin: "#161C2E", odraz: "#24304D", hrana: "#0F1424" };
/** Pozinkovaná ocel závěsů, objímek a šroubů */
const OCEL: Kov = { lem: "#D6DFEC", svetlo: "#929FB3", stred: "#545F72", tma: "#323A4B", stin: "#1B202D", odraz: "#29324A", hrana: "#10141F" };
/** Mosaz šoupěte, v noci ztlumená */
const MOSAZ: Kov = { lem: "#D9C391", svetlo: "#9C875F", stred: "#5F4F37", tma: "#3D3225", stin: "#231D15", odraz: "#30291F", hrana: "#16120D" };
const doNoci = (k: Kov, t: number) => Object.fromEntries(Object.entries(k).map(([n, c]) => [n, smichej(c, NOC, t)])) as unknown as Kov;
/** Zadní trubka je dál ve tmě — skoro půl cesty k noci, poloviční kontrast */
const NATER_VZADU = doNoci(NATER, 0.45);
const OCEL_VZADU = doNoci(OCEL, 0.5);

const MESIC = "#E6EEF9";
const ZAR = "#FFB06A";
const ZAR_SYTA = "#FF8442";
const ZAR_BILA = "#FFDDB0";
const REZ = "#7A4A36";
const VAPNO = "#B7C3CF";
const PUKLINA = "#03050B";

/* ═══════════════ Pomocníci ═══════════════ */

type Zastavka = [number, string, number?];
/** Offsety přechodů potřebují víc než desetiny */
const o3 = (n: number) => (Math.round(n * 1000) / 1000).toString().replace(/^0\./, ".");
const stopy = (z: Zastavka[]) =>
  z.map(([o, c, a]) => `<stop offset="${o3(o)}" stop-color="${c}"${a === undefined ? "" : ` stop-opacity="${o3(a)}"`}/>`).join("");
/** Přechod přes celý tvar: svisle přes vodorovný válec, napříč (zleva doprava) přes svislý */
const pres = (id: string, z: Zastavka[], napric = false) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${napric ? 1 : 0}" y2="${napric ? 0 : 1}">${stopy(z)}</linearGradient>`;
/** Přechod v souřadnicích jeviště mezi dvěma body */
const primka = (id: string, a: Bod, b: Bod, z: Zastavka[]) =>
  `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}">${stopy(z)}</linearGradient>`;
/** Eliptická záře v souřadnicích jeviště (rx do stran, ry svisle) */
const zare = (id: string, cx: number, cy: number, rx: number, ry: number, z: Zastavka[]) =>
  `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${f(cx)}" cy="${f(cy)}" r="${f(ry)}" gradientTransform="translate(${f(cx)} ${f(cy)}) scale(${o3(rx / ry)} 1) translate(${f(-cx)} ${f(-cy)})">${stopy(z)}</radialGradient>`;

/**
 * Vodorovný válec shora dolů: ostrý lem od měsíce na hraně, pod ním
 * široký matný lesk nátěru, tělo do stínu a dole slabý odlesk od vody.
 */
const valec = (k: Kov): Zastavka[] => [
  [0, k.svetlo],
  [0.02, smichej(k.svetlo, k.lem, 0.6)],
  [0.055, k.svetlo],
  [0.12, smichej(k.svetlo, k.stred, 0.62)],
  [0.21, smichej(k.svetlo, k.stred, 0.45)],
  [0.36, k.stred],
  [0.55, smichej(k.stred, k.tma, 0.6)],
  [0.72, k.tma],
  [0.85, k.stin],
  [0.94, k.odraz],
  [1, k.hrana],
];
/** Svislý válec zleva doprava: lem vlevo, stín vpravo */
const sloup = (k: Kov): Zastavka[] => [
  [0, k.svetlo],
  [0.08, k.lem],
  [0.2, k.svetlo],
  [0.42, k.stred],
  [0.66, k.tma],
  [0.86, k.stin],
  [0.95, k.odraz],
  [1, k.hrana],
];

const xy = (b: Bod) => `${f(b[0])} ${f(b[1])}`;
/** Zubatá lomená čára — praskliny, odprýsknutý nátěr */
const lomena = (body: Bod[]) => `M${body.map(xy).join("L")}`;
/** Hladké pokračování přes body (Catmull-Rom jako Bézier), bez M */
function dal(body: Bod[]): string {
  let d = "";
  for (let i = 0; i < body.length - 1; i++) {
    const p0 = body[i - 1] ?? body[i];
    const p1 = body[i];
    const p2 = body[i + 1];
    const p3 = body[i + 2] ?? p2;
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${xy(p2)}`;
  }
  return d;
}
const hladka = (body: Bod[]) => `M${xy(body[0])}${dal(body)}`;
/** Pruh mezi dvěma hladkými okraji, oba vedou od začátku ke konci */
const pruh = (L: Bod[], P: Bod[]) => {
  const zpet = [...P].reverse();
  return `${hladka(L)}L${xy(zpet[0])}${dal(zpet)}Z`;
};
/** Uzavřený mnohoúhelník relativními kroky — krátký zápis drobností (odprýsknutí, stružky) */
function rel(body: Bod[]): string {
  const zaokr = (n: number) => Math.round(n * 10) / 10;
  let [px, py] = body[0].map(zaokr);
  const kroky: string[] = [];
  for (const [x, y] of body.slice(1)) {
    const dx = zaokr(x - px);
    const dy = zaokr(y - py);
    px += dx;
    py += dy;
    kroky.push(f(dx), f(dy));
  }
  return `M${xy(body[0])}l${kroky.map((t, i) => (i && !t.startsWith("-") ? " " : "") + t).join("")}z`;
}
const posun = (body: Bod[], dx: number, dy: number): Bod[] => body.map(([x, y]) => [x + dx, y + dy]);
const obd = (x: number, y: number, w: number, h: number, a: string) =>
  `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" ${a}/>`;
/** Body od praskliny: [o kolik vpravo od osy, jak vysoko nad spodní hranou] → jeviště */
const odOsy = (body: [number, number][]): Bod[] => body.map(([dx, v]) => [OSA_X + dx, DOLE - v]);
/** Jak daleko dolů po plášti trubky (0 nahoře, 1 dole) — podle toho tmavnou drobnosti */
const hloubka = (y: number) => Math.min(1, Math.max(0, (y - HORE) / PRUMER));
/** Jak moc sem dosvítí kapka (1 na ose, 0 dál než 260) */
const teplo = (x: number) => Math.max(0, 1 - Math.abs(x - OSA_X) / 260);

/** Šestihranná matice z boku, osa vodorovně: tři plošky nad sebou, horní na měsíci */
const maticeLezi = (x: number, cy: number, w: number, h: number, k: Kov) =>
  obd(x, cy - h / 2, w, h / 4, `fill="${k.svetlo}"`) +
  obd(x, cy - h / 4, w, h / 2, `fill="${k.stred}"`) +
  obd(x, cy + h / 4, w, h / 4, `fill="${k.stin}"`) +
  obd(x, cy - h / 2, 0.7, h, `fill="${k.lem}" opacity=".55"`);
/** Šestihranná matice z boku, osa svisle: tři plošky vedle sebe, levá na měsíci */
const maticeStoji = (cx: number, y: number, w: number, h: number, k: Kov) =>
  obd(cx - w / 2, y, w / 4, h, `fill="${k.svetlo}"`) +
  obd(cx - w / 4, y, w / 2, h, `fill="${k.stred}"`) +
  obd(cx + w / 4, y, w / 4, h, `fill="${k.stin}"`) +
  obd(cx - w / 2, y, w, 0.7, `fill="${k.lem}" opacity=".55"`);
/** Matice čelem k nám — šestiúhelník s konečkem šroubu, plošky vlevo nahoře na měsíci */
function sestihran(cx: number, cy: number, r: number, k: Kov): string {
  const v = (r * Math.sqrt(3)) / 2;
  const B: Bod[] = [
    [cx + r, cy],
    [cx + r / 2, cy + v],
    [cx - r / 2, cy + v],
    [cx - r, cy],
    [cx - r / 2, cy - v],
    [cx + r / 2, cy - v],
  ];
  return (
    `<path d="${lomena(B)}Z" fill="${k.stred}"/>` +
    `<path d="${lomena([B[3], B[4], B[5], [cx, cy]])}Z" fill="${k.svetlo}"/>` +
    `<path d="${lomena([B[0], B[1], B[2], [cx, cy]])}Z" fill="${k.stin}" opacity=".7"/>` +
    `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r * 0.46)}" fill="${k.tma}"/>` +
    `<circle cx="${f(cx - r * 0.1)}" cy="${f(cy - r * 0.1)}" r="${f(r * 0.3)}" fill="${k.svetlo}"/>`
  );
}

/* ═══════════════ Stáří: odprýsklý nátěr, rez, zaschlé stéky, vodní kámen ═══════════════ */

/**
 * Odprýsklý nátěr: pod modrou barvou vykoukne červenohnědá suřík, ve
 * středu rez, a spodní hrana důlku (stěna nátěru) chytá světlo.
 */
function odprysk(p: string, x: number, y: number, w: number, h: number, R: () => number): string {
  const B: Bod[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + (R() - 0.5) * 0.5;
    const k = 0.62 + R() * 0.5;
    B.push([x + Math.cos(a) * (w / 2) * k, y + Math.sin(a) * (h / 2) * k]);
  }
  const t = hloubka(y);
  const jadro = B.map(([bx, by]): Bod => [x + (bx - x) * 0.5 + 0.4, y + (by - y) * 0.42 + 0.3]);
  return (
    `<ellipse cx="${f(x)}" cy="${f(y + h * 0.35)}" rx="${f(w * 0.8)}" ry="${f(h * 1.05)}" fill="url(#${p}-rs)"/>` +
    `<path d="${rel(posun(B, 0.2, 0.8))}" fill="${smichej("#AEBDD4", "#4A5674", t)}" opacity=".5"/>` +
    `<path d="${rel(B)}" fill="${smichej("#7E4838", "#482822", t)}" opacity=".85"/>` +
    `<path d="${rel(jadro)}" fill="#2E1A17" opacity=".55"/>`
  );
}

/**
 * Rezavé stružky po plášti dolů: pár tenkých pramínků různé délky, které
 * se zužují a ztrácejí (plne = všechny až na spodní hranu).
 */
function stekRzi(p: string, x: number, y0: number, y1: number, w: number, n: number, R: () => number, plne = false): string {
  let d = "";
  for (let i = 0; i < n; i++) {
    const sx = x + (i - (n - 1) / 2) * (w / n) + (R() - 0.5) * 1.2;
    const delka = (y1 - y0) * (plne ? 1 : 0.55 + R() * 0.45);
    const s = 0.8 + R() * 0.7;
    const L: Bod[] = [];
    const P: Bod[] = [];
    let dx = 0;
    for (let k = 0; k <= 3; k++) {
      const t = k / 3;
      dx += (R() - 0.5) * 0.8;
      const y = y0 + delka * t;
      const ss = s * (1 - 0.6 * t);
      L.push([sx + dx - ss, y]);
      P.unshift([sx + dx + ss, y]);
    }
    d += rel([...L, ...P]);
  }
  return `<path d="${d}" fill="url(#${p}-r)"/>`;
}

/** Zaschlá rezavá kapka: slabá stružka po boku dolů a ztvrdlý krápníček na spodní hraně */
function zaschla(p: string, x: number, y: number, R: () => number): string {
  return (
    stekRzi(p, x, y, DOLE, 1, 1, R, true) +
    `<path d="M${f(x - 1.7)} ${DOLE - 0.6}C${f(x - 1.6)} ${f(DOLE + 1.6)} ${f(x - 0.9)} ${f(DOLE + 2.9)} ${f(x + 0.1)} ${f(DOLE + 3.6)}C${f(x + 1)} ${f(DOLE + 2.7)} ${f(x + 1.6)} ${f(DOLE + 1.5)} ${f(x + 1.7)} ${DOLE - 0.6}Z" fill="#5A3328"/>` +
    `<circle cx="${f(x - 0.6)}" cy="${f(DOLE + 1.2)}" r=".55" fill="#C99A80" opacity=".6"/>`
  );
}

/** Vodní kámen pod netěsným spojem — bledý pruh, dole se rozšíří a visí z něj zaoblená krusta */
function vapnik(p: string, x: number, y0: number, y1: number, w: number, tep: number): string {
  const L: Bod[] = [
    [x - w * 0.22, y0],
    [x - w * 0.36, y0 + (y1 - y0) * 0.45],
    [x - w * 0.5, y1],
  ];
  const P: Bod[] = [
    [x + w * 0.12, y0],
    [x + w * 0.3, y0 + (y1 - y0) * 0.5],
    [x + w * 0.5, y1],
  ];
  const kura = smichej("#C3CEDA", ZAR_BILA, tep);
  return (
    `<path d="${pruh(L, P)}" fill="url(#${p}-vk)"/>` +
    `<path d="M${f(x - w * 0.5)} ${f(y1 - 0.5)}C${f(x - w * 0.55)} ${f(y1 + 2.2)} ${f(x - w * 0.25)} ${f(y1 + 3.4)} ${f(x)} ${f(y1 + 3.4)}C${f(x + w * 0.3)} ${f(y1 + 3.4)} ${f(x + w * 0.55)} ${f(y1 + 2)} ${f(x + w * 0.5)} ${f(y1 - 0.5)}Z" fill="${kura}" opacity=".6"/>` +
    `<circle cx="${f(x - w * 0.2)}" cy="${f(y1 + 1)}" r=".7" fill="#F1F5FA" opacity=".5"/>`
  );
}

/** Kapička kondenzátu visící ze spodní hrany — tmavé průhledné tělo, dole světlo prošlé kapkou, nahoře odlesk */
function kapicka(p: string, x: number, y0: number, r: number, tep: number): string {
  const a = r * 0.5;
  const cy = y0 + r * 1.05;
  const d =
    `M${f(x - a)} ${f(y0 - 0.4)}C${f(x - a)} ${f(y0 + r * 0.25)} ${f(x - r)} ${f(cy - r * 0.55)} ${f(x - r)} ${f(cy)}` +
    `A${f(r)} ${f(r)} 0 0 0 ${f(x + r)} ${f(cy)}C${f(x + r)} ${f(cy - r * 0.55)} ${f(x + a)} ${f(y0 + r * 0.25)} ${f(x + a)} ${f(y0 - 0.4)}Z`;
  return (
    `<path d="${d}" fill="url(#${p}-kp)"/>` +
    `<ellipse cx="${f(x + r * 0.1)}" cy="${f(cy + r * 0.58)}" rx="${f(r * 0.42)}" ry="${f(r * 0.2)}" fill="${smichej("#7FA2D4", ZAR_BILA, tep)}" opacity="${o3(0.5 + 0.4 * tep)}"/>` +
    `<circle cx="${f(x - r * 0.38)}" cy="${f(cy - r * 0.32)}" r="${f(r * 0.2)}" fill="#F3F8FF"/>`
  );
}

/** Perlička vody přilepená na plášti u praskliny — zespodu prosvícená kapkou */
const perlicka = (p: string, x: number, y: number, r: number) =>
  `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="url(#${p}-kp)" opacity=".9"/>` +
  `<ellipse cx="${f(x + r * 0.08)}" cy="${f(y + r * 0.56)}" rx="${f(r * 0.4)}" ry="${f(r * 0.19)}" fill="${ZAR_BILA}" opacity=".85"/>` +
  `<circle cx="${f(x - r * 0.38)}" cy="${f(y - r * 0.38)}" r="${f(r * 0.19)}" fill="#F3F8FF"/>`;

/* ═══════════════ Díly (do defs, kreslí se přes <use>) ═══════════════ */

/** Závěs hlavní trubky: kotva ve stropě, závitová tyč, matice, pásek kolem trubky */
function zaves(p: string): string {
  const u = (id: string) => `fill="url(#${p}-${id})"`;
  const zavit = (y0: number, n: number) => Array.from({ length: n }, (_, i) => `M-3.3 ${f(y0 + i * 2.6)}l6.6 -1.3`).join("");
  return (
    `<g id="${p}-zav">` +
    obd(-8, STROP - 2.5, 16, 5, u("os")) +
    maticeStoji(0, STROP + 2.5, 11, 6, OCEL) +
    obd(-3.3, STROP + 8.5, 6.6, 82, u("os")) +
    `<path d="${zavit(STROP + 11, 4)}${zavit(96.6, 4)}" stroke="${OCEL.lem}" stroke-width=".55" opacity=".35"/>` +
    maticeStoji(0, 107.5, 12, 7, OCEL) +
    obd(-7.6, 114.5, 15.2, 2.2, u("os")) +
    `<path d="M-7.5 166V125.5Q-7.5 116.7 0 116.7Q7.5 116.7 7.5 125.5V166Z" ${u("os")}/>` +
    sestihran(0, 137, 4.6, OCEL) +
    obd(-9, HORE - 3, 18, PRUMER + 6, u("o")) +
    obd(-9, HORE - 2.5, 0.8, PRUMER + 5, `fill="${OCEL.lem}" opacity=".5"`) +
    obd(8.2, HORE - 2.5, 0.8, PRUMER + 5, `fill="${OCEL.hrana}" opacity=".6"`) +
    obd(9, HORE, 12, PRUMER, u("st")) +
    `</g>`
  );
}

/** Závitová spojka: objímka se sraženými hranami, uprostřed žebro, po stranách obnažený rezavý závit */
const R_SPOJKY = TRUBKA_R + 6;
const obrysSpojky = (x: number) => {
  const a = TRUBKA_Y - R_SPOJKY;
  const b = TRUBKA_Y + R_SPOJKY;
  return `M${f(x - 23)} ${a + 3}L${f(x - 20)} ${a}H${f(x + 20)}L${f(x + 23)} ${a + 3}V${b - 3}L${f(x + 20)} ${b}H${f(x - 20)}L${f(x - 23)} ${b - 3}Z`;
};
function spojka(p: string): string {
  const u = (id: string) => `fill="url(#${p}-${id})"`;
  const a = TRUBKA_Y - R_SPOJKY;
  const b = TRUBKA_Y + R_SPOJKY;
  return (
    `<g id="${p}-sp">` +
    obd(-31, HORE, 8, PRUMER, `fill="${REZ}" opacity=".3"`) +
    obd(23, HORE, 8, PRUMER, `fill="${REZ}" opacity=".3"`) +
    `<path d="${[-30, -28, -26, -24, 24, 26, 28, 30].map((x) => `M${x} ${HORE + 0.6}V${DOLE - 0.6}`).join("")}" stroke="${NATER.lem}" stroke-width=".55" opacity=".3"/>` +
    `<path d="${obrysSpojky(0)}" ${u("v")}/>` +
    `<path d="M-23 ${a + 3}L-20 ${a}V${b}L-23 ${b - 3}Z" fill="${NATER.lem}" opacity=".35"/>` +
    `<path d="M23 ${a + 3}L20 ${a}V${b}L23 ${b - 3}Z" fill="${NATER.hrana}" opacity=".5"/>` +
    obd(-3, a - 1, 6, 2 * R_SPOJKY + 2, u("v")) +
    obd(-3, a - 0.5, 0.7, 2 * R_SPOJKY + 1, `fill="${NATER.lem}" opacity=".45"`) +
    obd(2.3, a - 0.5, 0.7, 2 * R_SPOJKY + 1, `fill="${NATER.hrana}" opacity=".5"`) +
    obd(23, HORE, 14, PRUMER, u("st")) +
    `</g>`
  );
}

/** Přírubový spoj: dva náboje, dvě příruby s těsněním, šest šroubů (z boku tři řady matic) */
function priruba(p: string): string {
  const u = (id: string) => `fill="url(#${p}-${id})"`;
  const RP = 56;
  const RN = 40;
  const RB = 47;
  const Y = TRUBKA_Y;
  return (
    `<g id="${p}-pr">` +
    `<path d="M-27 ${Y - 33.5}L-12 ${Y - RN}V${Y + RN}L-27 ${Y + 33.5}ZM27 ${Y - 33.5}L12 ${Y - RN}V${Y + RN}L27 ${Y + 33.5}Z" ${u("v")}/>` +
    `<rect x="-12" y="${Y - RP}" width="11" height="${2 * RP}" rx="1.8" ${u("v")}/>` +
    `<rect x="1" y="${Y - RP}" width="11" height="${2 * RP}" rx="1.8" ${u("v")}/>` +
    obd(-1, Y - RP + 2, 2, 2 * RP - 4, `fill="#2B1517"`) +
    obd(-12, Y - RP + 1.5, 0.8, 2 * RP - 3, `fill="${NATER.lem}" opacity=".5"`) +
    obd(1, Y - RP + 1.5, 0.8, 2 * RP - 3, `fill="${NATER.lem}" opacity=".35"`) +
    obd(12, Y - RN, 7, 2 * RN, `${u("st")} opacity=".8"`) +
    [Y - RB * 0.866, Y, Y + RB * 0.866]
      .map((yb) => maticeLezi(-19, yb, 7, 12, OCEL) + maticeLezi(12, yb, 7, 12, OCEL) + obd(19, yb - 2.8, 3.6, 5.6, u("o")))
      .join("") +
    obd(27, HORE, 14, PRUMER, u("st")) +
    `</g>`
  );
}

/** Opravná objímka — kdysi už tu teklo: pás z oceli, dole uši se dvěma šrouby a kapička */
function objimka(p: string): string {
  const u = (id: string) => `fill="url(#${p}-${id})"`;
  return (
    `<g id="${p}-obj">` +
    `<rect x="-25" y="${HORE - 4}" width="50" height="${PRUMER + 8}" rx="1.2" ${u("o")}/>` +
    obd(-25, HORE - 3.4, 0.8, PRUMER + 6.8, `fill="${OCEL.lem}" opacity=".55"`) +
    obd(-21.6, HORE - 3.4, 0.6, PRUMER + 6.8, `fill="${OCEL.hrana}" opacity=".4"`) +
    obd(21, HORE - 3.4, 0.6, PRUMER + 6.8, `fill="${OCEL.lem}" opacity=".3"`) +
    obd(24.2, HORE - 3.4, 0.8, PRUMER + 6.8, `fill="${OCEL.hrana}" opacity=".55"`) +
    `<rect x="-21" y="${DOLE + 1}" width="42" height="18" rx="2.2" ${u("o")}/>` +
    sestihran(-10, DOLE + 10.4, 5.4, OCEL) +
    sestihran(10, DOLE + 10.4, 5.4, OCEL) +
    kapicka(p, 4, DOLE + 19, 2.8, 0) +
    obd(25, HORE, 14, PRUMER, u("st")) +
    `</g>`
  );
}

/** Zadní trubka: závěs, spojka a odbočka nahoru do stropu */
function dilyVzadu(p: string): string {
  const u = (id: string) => `fill="url(#${p}-${id})"`;
  const a = ZY - ZR;
  return (
    `<g id="${p}-zav2">` +
    obd(-2, STROP, 4, a - STROP - 6, u("ozs")) +
    `<rect x="-5" y="${a - 10}" width="10" height="11" rx="1.5" ${u("ozs")}/>` +
    `<circle cy="${a - 5}" r="1.7" fill="${OCEL_VZADU.svetlo}"/>` +
    obd(-6, a - 1.8, 12, 2 * ZR + 3.6, u("oz")) +
    obd(-6, a - 1.4, 0.6, 2 * ZR + 2.8, `fill="${OCEL_VZADU.lem}" opacity=".45"`) +
    obd(6, a, 8, 2 * ZR, `${u("st")} opacity=".6"`) +
    `</g>` +
    `<g id="${p}-sp2">` +
    `<rect x="-13" y="${a - 3}" width="26" height="${2 * ZR + 6}" rx="1.5" ${u("vz")}/>` +
    obd(-13, a - 2.4, 0.7, 2 * ZR + 4.8, `fill="${NATER_VZADU.lem}" opacity=".5"`) +
    obd(13, a, 9, 2 * ZR, `${u("st")} opacity=".6"`) +
    `</g>` +
    `<g id="${p}-odb">` +
    obd(-10, STROP, 20, a - STROP, u("vzs")) +
    obd(-13, STROP, 26, 7, u("ozs")) +
    `<rect x="-13" y="${a - 13}" width="26" height="12" rx="1.5" ${u("vzs")}/>` +
    `<rect x="-17" y="${a - 4}" width="34" height="${2 * ZR + 8}" rx="2" ${u("vz")}/>` +
    obd(-17, a - 3.4, 0.7, 2 * ZR + 6.8, `fill="${NATER_VZADU.lem}" opacity=".5"`) +
    obd(17, a, 9, 2 * ZR, `${u("st")} opacity=".6"`) +
    `</g>`
  );
}

/* ═══════════════ Šoupě s ručním kolem ═══════════════ */

function soupe(p: string): string {
  const u = (id: string) => `fill="url(#${p}-${id})"`;
  const X = SOUPE;
  const o: string[] = [];
  /* Šestihranné konce: hrot nahoře, takže z boku tři plošky 1 : 2 : 1 */
  for (const a of [X - 31, X + 17]) {
    o.push(
      `<rect x="${a}" y="${TRUBKA_Y - 39}" width="14" height="78" rx="1.2" fill="${MOSAZ.stred}"/>`,
      obd(a, TRUBKA_Y - 39, 14, 19.5, `fill="${MOSAZ.svetlo}"`),
      obd(a, TRUBKA_Y + 19.5, 14, 19.5, `fill="${MOSAZ.stin}"`),
      obd(a, TRUBKA_Y - 38.5, 0.8, 77, `fill="${MOSAZ.lem}" opacity=".5"`),
    );
  }
  /* Baňaté tělo klínu, víko s přírubou a dvěma šrouby, krk, ucpávka */
  o.push(
    `<path d="M${X - 19} 166C${X - 19} 155 ${X - 14} 151 ${X - 11} 151H${X + 11}C${X + 14} 151 ${X + 19} 155 ${X + 19} 166V223C${X + 19} 236 ${X + 10} 243 ${X} 243C${X - 10} 243 ${X - 19} 236 ${X - 19} 223Z" ${u("mb")}/>`,
    `<path d="M${X - 11} 145L${X - 8} 132H${X + 8}L${X + 11} 145Z" ${u("ms")}/>`,
    `<rect x="${X - 17}" y="144" width="34" height="7" rx="1.2" ${u("ms")}/>`,
    maticeStoji(X - 13, 139.5, 6, 4.5, MOSAZ),
    maticeStoji(X + 13, 139.5, 6, 4.5, MOSAZ),
    maticeStoji(X, 124, 20, 8, MOSAZ),
  );
  /* Ruční kolo zespodu: věnec, zadní loukotě, vřeteno, náboj a přední půlka věnce přes vřeteno */
  const KY = 113;
  const RX = 30;
  const RY = 6.4;
  const rx = 24.5;
  const ry = 4;
  o.push(
    `<path d="M${X - RX} ${KY}A${RX} ${RY} 0 1 0 ${X + RX} ${KY}A${RX} ${RY} 0 1 0 ${X - RX} ${KY}ZM${X - rx} ${KY}A${rx} ${ry} 0 1 1 ${X + rx} ${KY}A${rx} ${ry} 0 1 1 ${X - rx} ${KY}Z" fill-rule="evenodd" ${u("k")}/>`,
    `<path d="M${X} ${KY}L${f(X - 21.2)} ${KY + 2}M${X} ${KY}L${f(X + 21.2)} ${KY + 2}" stroke="#521B1B" stroke-width="2.4" stroke-linecap="round"/>`,
    obd(X - 2.4, 101, 4.8, 23, u("ms")),
    `<ellipse cx="${X}" cy="${KY}" rx="5" ry="2.7" fill="#7E2E2B"/>`,
    `<path d="M${X - RX} ${KY}A${RX} ${RY} 0 0 1 ${X + RX} ${KY}L${X + rx} ${KY}A${rx} ${ry} 0 0 0 ${X - rx} ${KY}Z" ${u("k")}/>`,
    `<path d="M${X - RX + 1} ${KY - 0.8}A${RX} ${RY} 0 0 1 ${X + RX - 1} ${KY - 0.8}" fill="none" stroke="#DA8676" stroke-width=".9" opacity=".55"/>`,
    obd(X - 3.2, 98.5, 6.4, 4, u("ms")),
    obd(X + 31, HORE, 14, PRUMER, u("st")),
  );
  return o.join("");
}

/* ═══════════════ Prasklina — nejpodrobnější místo ═══════════════ */

/**
 * Pod září (záře kapky je pak svítí stejně jako okolí): mokrá skvrna,
 * kterou voda tmavne podél spodku trubky, a odprýsklé šupinky nátěru
 * podél trhliny.
 */
function mokro(): string {
  const skvrna = odOsy([
    [-112, 0], [-103, 1.2], [-95, 1.4], [-86, 2.9], [-77, 3.1], [-69, 4.6], [-60, 5.2], [-51, 7.4], [-42, 8.1], [-33, 10.2], [-24, 11.1], [-14, 12.6], [-5, 12.9],
    [5, 13.4], [15, 12.4], [24, 12.8], [33, 10.6], [42, 9.9], [51, 7.6], [60, 7.1], [69, 5.2], [78, 4.6], [88, 2.8], [97, 2.4], [106, 1.1], [116, 0],
  ]);
  const jadro = odOsy([
    [-64, 0], [-52, 2.6], [-40, 5.4], [-27, 7.6], [-13, 9.2], [0, 9.6], [14, 9], [28, 7.4], [41, 5.1], [54, 2.4], [66, 0],
  ]);
  /* šupinky holého kovu u obou pysků trhliny */
  const supinky = [
    odOsy([[-27.5, 0], [-26.4, 2.6], [-23.1, 3.4], [-20.8, 5.1], [-16.2, 4.6], [-13.9, 6.4], [-9.4, 6.1], [-7.2, 7.4], [-3.1, 6.6], [-2.4, 4.2]]),
    odOsy([[3.6, 4.4], [5.2, 7.1], [9.6, 6.6], [12.1, 7.6], [15.8, 5.9], [19.4, 6.2], [22.1, 4.1], [25.6, 3.3], [27.4, 0]]),
  ];
  return (
    `<path d="${hladka(skvrna)}Z" fill="#070B18" opacity=".45"/>` +
    `<path d="${hladka(jadro)}Z" fill="#05080F" opacity=".35"/>` +
    `<path d="${supinky.map((s) => lomena(s) + "Z").join("")}" fill="#3B231E" opacity=".75"/>` +
    `<path d="${supinky.map((s) => lomena(posun(s.slice(1, -1), 0, -0.45))).join("")}" fill="none" stroke="#8496B3" stroke-width=".45" stroke-linejoin="round" opacity=".4"/>`
  );
}

/** Nad září: odraz kapky v mokrém filmu, trhlina, vlásečnice, perličky a pramínek */
function prasklina(p: string): string {
  const X = OSA_X;
  const Y = DOLE;
  const o: string[] = [];

  /* Studené jiskry na kraji mokré vody (teplý odraz kapky je v září) */
  o.push(
    `<path d="${hladka(odOsy([[-77, 3.6], [-69, 5.1], [-61, 5.7]]))}${hladka(odOsy([[61, 7.6], [69, 5.7], [77, 5.1]]))}" fill="none" stroke="#A9C0DE" stroke-width=".45" stroke-linecap="round" opacity=".32"/>`,
  );

  /* Vlásečnice: od konců trhliny dál podél trubky, jedna odbočka */
  const vlas = [
    odOsy([[-20, 1.9], [-23.6, 2.5], [-27.2, 2.1], [-30.4, 2.9], [-34.6, 2.6], [-37.8, 3.6]]),
    odOsy([[-27.2, 2.1], [-29.5, 4.4], [-31.2, 5.1]]),
    odOsy([[20.4, 1.7], [23.9, 2.4], [27.5, 2], [31.2, 2.8], [35.4, 2.5]]),
  ];
  o.push(
    `<path d="${vlas.map((v) => lomena(v.slice(0, 3))).join("")}" fill="none" stroke="${PUKLINA}" stroke-width=".7" stroke-linejoin="round" stroke-linecap="round" opacity=".85"/>`,
    `<path d="${vlas.map((v) => lomena(v)).join("")}" fill="none" stroke="${PUKLINA}" stroke-width=".38" stroke-linejoin="round" stroke-linecap="round" opacity=".75"/>`,
  );

  /* Trhlina: zubatá štěrbina podél trubky, uprostřed sedí přímo na hraně — tudy jde krk kapky */
  const horni = odOsy([
    [-20, 1.9], [-17.2, 2.9], [-15.1, 2.6], [-12.4, 3.9], [-9.6, 4.1], [-8.1, 5], [-5.2, 5.2], [-3.3, 6.1], [-0.4, 5.8],
    [2.3, 6.4], [4.9, 5.6], [7.2, 5.9], [9.6, 4.8], [12.5, 4.6], [14.4, 3.5], [17.3, 3.1], [20.4, 1.7],
  ]);
  const dolni = odOsy([[17.6, 0.9], [14.2, 1.2], [11.3, 0.6], [8.4, 0.5], [5, 0], [-4.6, 0], [-7.9, 0.4], [-11.1, 0.7], [-14.6, 1.1], [-17.8, 0.8]]);
  o.push(
    `<path d="${lomena([...horni, ...dolni])}Z" fill="${PUKLINA}"/>`,
    /* spodek horního pysku svítí od kapky, ohnutý plech nad ním chytá trochu měsíce */
    `<path d="${hladka(posun(horni.slice(4, -4), 0, 0.6))}" fill="none" stroke="${ZAR_BILA}" stroke-width=".45" stroke-linecap="round" opacity=".6"/>`,
    `<path d="${hladka(posun(horni.slice(6, -6), 0, -0.8))}" fill="none" stroke="#B4C6DE" stroke-width=".4" stroke-linecap="round" opacity=".35"/>`,
  );

  /* Perličky vody kolem trhliny */
  for (const [dx, v, r] of [
    [-42, 6.4, 2.1],
    [-25.5, 9.8, 1.4],
    [33, 7.4, 1.8],
    [45, 3.6, 2.4],
    [12, 10.8, 1.1],
  ] as const)
    o.push(perlicka(p, X + dx, Y - v, r));

  /* Pramínek: voda teče po spodku doleva k nejnižšímu místu a tam visí kapička (už mimo krk kapky) */
  const praminek = odOsy([
    [-21, 1.2],
    [-28, 1.7],
    [-35, 1.4],
    [-42, 1.9],
    [-48.6, 1.5],
    [-51, 0.6],
  ]);
  o.push(`<path d="${hladka(praminek)}" fill="none" stroke="url(#${p}-sk)" stroke-width=".6" stroke-linecap="round"/>`, kapicka(p, X - 51, Y, 2.4, 0.9));
  return o.join("");
}

/* ═══════════════ Trubka ═══════════════ */

/** Odprýsknutý nátěr na viditelném kuse: x, y, šířka, výška, délka rezavého stéku (0 = bez) */
const ODPRYSKY: [number, number, number, number, number][] = [
  [-560, 186, 12, 6, 30],
  [-190, 208, 9, 4.5, 0],
  [96, 178, 13, 7, 32],
  [262, 207, 10, 5, 0],
  [606, 190, 12, 6, 30],
  [762, 214, 8, 4.5, 0],
  [924, 179, 14, 7, 36],
  [1150, 203, 10, 5, 20],
  [1380, 184, 9, 4.5, 0],
];
/** Zaschlé rezavé kapky: x a odkud stružka začíná */
const ZASCHLE: [number, number][] = [
  [150, 204],
  [736, 207],
  [-84, 201],
];
/** Kapičky kondenzátu pod trubkou: x, poloměr (pod krkem kapky mezi 455 a 545 nic) */
const KAPICKY: [number, number][] = [
  [-880, 3.4],
  [-612, 3],
  [-395, 4],
  [108, 3.3],
  [283, 4.4],
  [598, 3.8],
  [764, 3.1],
  [921, 4.1],
  [1185, 3.4],
  [1398, 3.8],
];

/** Skvrny špíny na spodní půlce: x a délka (poloosa) */
const SPINA: [number, number][] = [
  [-1700, 150],
  [-980, 120],
  [-610, 90],
  [-150, 110],
  [240, 70],
  [760, 100],
  [1150, 130],
  [1900, 140],
  [2650, 120],
  [3300, 150],
];

/** Kde už něco je (tvarovky, závěsy) — sem náhodné odprýsknutí nepatří */
const obsazeno = (x: number) =>
  ZAVESY.some((z) => Math.abs(x - z) < 26) ||
  PRIRUBY.some((z) => Math.abs(x - z) < 48) ||
  SPOJKY.some((z) => Math.abs(x - z) < 46) ||
  OBJIMKY.some((z) => Math.abs(x - z) < 44);

/** Měsíční lem po délce trubky: nejjasnější u Kapky, do stran slábne */
const lemPoDelce = (k: number): Zastavka[] =>
  (
    [
      [OD, 0.22],
      [-1300, 0.34],
      [-400, 0.6],
      [KAPKA_KAMI_X - 220, 0.9],
      [KAPKA_KAMI_X, 1],
      [OSA_X + 150, 0.8],
      [1000, 0.52],
      [1800, 0.32],
      [DO, 0.2],
    ] as const
  ).map(([x, a]): Zastavka => [(x - OD) / DELKA, MESIC, a * k]);

export function trubka(p = "pkt"): { defs: string; zadni: string; svg: string } {
  const R = nahoda(196);
  const use = (id: string, x: number) => `<use href="#${p}-${id}" x="${f(x)}"/>`;

  /* ——— defs ——— */
  const defs = [
    pres(`${p}-v`, valec(NATER)),
    pres(`${p}-o`, valec(OCEL)),
    pres(`${p}-os`, sloup(OCEL), true),
    pres(`${p}-vz`, valec(NATER_VZADU)),
    pres(`${p}-vzs`, sloup(NATER_VZADU), true),
    pres(`${p}-oz`, valec(OCEL_VZADU)),
    pres(`${p}-ozs`, sloup(OCEL_VZADU), true),
    pres(`${p}-ms`, sloup(MOSAZ), true),
    `<radialGradient id="${p}-mb" cx=".34" cy=".3" r=".8">${stopy([
      [0, MOSAZ.lem],
      [0.2, MOSAZ.svetlo],
      [0.52, MOSAZ.stred],
      [0.8, MOSAZ.stin],
      [1, MOSAZ.hrana],
    ])}</radialGradient>`,
    pres(`${p}-k`, [
      [0, "#C86A5D"],
      [0.22, "#923832"],
      [0.6, "#652222"],
      [1, "#290E10"],
    ]),
    pres(
      `${p}-st`,
      [
        [0, "#060914", 0.5],
        [1, "#060914", 0],
      ],
      true,
    ),
    pres(`${p}-r`, [
      [0, REZ, 0.42],
      [0.5, "#6A3E2E", 0.2],
      [1, "#5A3328", 0],
    ]),
    pres(`${p}-vk`, [
      [0, VAPNO, 0.05],
      [0.5, VAPNO, 0.26],
      [1, "#CBD5DF", 0.42],
    ]),
    `<radialGradient id="${p}-rs">${stopy([
      [0, REZ, 0.4],
      [0.6, REZ, 0.15],
      [1, REZ, 0],
    ])}</radialGradient>`,
    `<radialGradient id="${p}-sn">${stopy([
      [0, "#0A0E1D", 0.26],
      [0.6, "#0A0E1D", 0.1],
      [1, "#0A0E1D", 0],
    ])}</radialGradient>`,
    `<radialGradient id="${p}-kp" cx=".5" cy=".62" r=".62">${stopy([
      [0, "#3F5781"],
      [0.55, "#1F2C49"],
      [1, "#0D1325"],
    ])}</radialGradient>`,
    primka(`${p}-lx`, [OD, 0], [DO, 0], lemPoDelce(1)),
    primka(`${p}-lxz`, [OD, 0], [DO, 0], lemPoDelce(0.45)),
    /* záře kapky na spodku trubky, horké jádro u praskliny, teplý lem po spodní hraně a odraz v mokrém */
    zare(`${p}-z`, OSA_X, DOLE + 6, 262, 36, [
      [0, "#FFD29A", 0.95],
      [0.28, "#FFAC5E", 0.7],
      [0.6, "#FF7A36", 0.3],
      [1, "#F0602A", 0],
    ]),
    zare(`${p}-z2`, OSA_X, DOLE + 2, 74, 18, [
      [0, "#FFE4BC", 0.75],
      [0.5, "#FFB878", 0.32],
      [1, "#FF9A5A", 0],
    ]),
    primka(`${p}-zl`, [OSA_X - 230, 0], [OSA_X + 230, 0], [
      [0, ZAR, 0],
      [0.3, ZAR, 0.4],
      [0.5, ZAR_BILA, 0.95],
      [0.7, ZAR, 0.4],
      [1, ZAR, 0],
    ]),
    primka(`${p}-zo`, [OSA_X - 68, 0], [OSA_X + 70, 0], [
      [0, ZAR, 0],
      [0.22, ZAR_BILA, 0.7],
      [0.5, "#FFF2DC", 1],
      [0.78, ZAR_BILA, 0.7],
      [1, ZAR, 0],
    ]),
    zare(`${p}-zz`, OSA_X, ZY + ZR + 10, 380, 34, [
      [0, "#FFB878", 0.3],
      [0.5, ZAR_SYTA, 0.1],
      [1, ZAR_SYTA, 0],
    ]),
    zare(`${p}-zs`, OSA_X, STROP + 24, 470, 60, [
      [0, ZAR, 0.14],
      [0.6, ZAR_SYTA, 0.04],
      [1, ZAR_SYTA, 0],
    ]),
    primka(`${p}-strop`, [0, -700], [0, STROP], [
      [0, "#090D24"],
      [0.9, "#0C112E"],
      [0.975, "#141A3B"],
      [1, "#1D2446"],
    ]),
    primka(`${p}-sk`, [OSA_X - 52, 0], [OSA_X - 20, 0], [
      [0, "#DCD6CC", 0.5],
      [1, ZAR_BILA, 0.95],
    ]),
    /* záře kapky smí jen na trubku a na spojku vedle praskliny */
    `<clipPath id="${p}-ob">${obd(OSA_X - 280, HORE, 560, PRUMER, "")}<path d="${obrysSpojky(SPOJKY[0])}"/></clipPath>`,
    zaves(p),
    spojka(p),
    priruba(p),
    objimka(p),
    dilyVzadu(p),
  ].join("");

  /* ——— zadni: strop, zadní trubka ——— */
  const zadni = [
    obd(OD, -700, DELKA, 700 + STROP, `fill="url(#${p}-strop)"`),
    obd(OD, STROP - 1.4, DELKA, 1.4, `fill="#283258" opacity=".8"`),
    obd(OSA_X - 500, 0, 1000, STROP, `class="${p}-zar" fill="url(#${p}-zs)"`),
    obd(OD, ZY - ZR, DELKA, 2 * ZR, `fill="url(#${p}-vz)"`),
    obd(OD, ZY - ZR, DELKA, 1, `fill="url(#${p}-lxz)"`),
    obd(OSA_X - 400, ZY - ZR, 800, 2 * ZR, `class="${p}-zar" fill="url(#${p}-zz)"`),
    ...SPOJKY_VZADU.map((x) => use("sp2", x)),
    ...ODBOCKY.map((x) => use("odb", x)),
    ...ZAVESY_VZADU.map((x) => use("zav2", x)),
  ].join("");

  /* ——— svg: hlavní trubka ——— */
  const s: string[] = [obd(OD, HORE, DELKA, PRUMER, `fill="url(#${p}-v)"`), obd(OD, HORE, DELKA, 1.2, `fill="url(#${p}-lx)"`)];

  /* Špína: pár dlouhých měkkých skvrn na spodní půlce, kam léta kape kondenzát */
  for (const [x, rx] of SPINA) s.push(`<ellipse cx="${x}" cy="${TRUBKA_Y + 13}" rx="${rx}" ry="17" fill="url(#${p}-sn)"/>`);

  /* Stáří: ručně rozmístěné na viditelném kuse, dál do stran náhodou */
  const odprysky = [...ODPRYSKY];
  for (const [od, po] of [
    [OD + 60, -950],
    [1520, DO - 60],
  ]) {
    for (let x = od; x < po; x += 300 + R() * 120) {
      const y = HORE + 12 + R() * 40;
      const w = 8 + R() * 6;
      const h = 4.5 + R() * 2.5;
      const rez = R() < 0.5 ? 0 : 20 + R() * 16;
      if (!obsazeno(x)) odprysky.push([x, y, w, h, rez]);
    }
  }
  for (const [x, y, w, h, rez] of odprysky) {
    if (rez) s.push(stekRzi(p, x + 0.4, y + h * 0.15, Math.min(DOLE - 1.5, y + rez), w * 0.75, w > 11 ? 3 : 2, R));
    s.push(odprysk(p, x, y, w, h, R));
  }
  for (const [x, y] of ZASCHLE) s.push(zaschla(p, x, y, R));

  /* Tvarovky */
  s.push(soupe(p), ...PRIRUBY.map((x) => use("pr", x)), ...SPOJKY.map((x) => use("sp", x)), ...OBJIMKY.map((x) => use("obj", x)));

  /*
   * Záře kapky zespodu (přes mokrou skvrnu), teplý lem po spodní hraně
   * a odraz kapky v mokrém filmu. Všechno, co svítí od kapky, má třídu
   * `${p}-zar` (tady i v zadni) — stránka ji může přes opacity tlumit,
   * když kapka spadne a teprve znovu roste.
   */
  s.push(
    mokro(),
    `<g class="${p}-zar"><g clip-path="url(#${p}-ob)">` +
      obd(OSA_X - 270, HORE - 8, 540, PRUMER + 16, `fill="url(#${p}-z)"`) +
      obd(OSA_X - 80, TRUBKA_Y + 8, 160, TRUBKA_R, `fill="url(#${p}-z2)"`) +
      `</g>` +
      `<path d="M${OSA_X - 230} ${DOLE}Q${OSA_X} ${DOLE - 3.6} ${OSA_X + 230} ${DOLE}Z" fill="url(#${p}-zl)"/>` +
      `<path d="M${OSA_X - 68} ${DOLE - 0.4}Q${OSA_X} ${DOLE - 5.8} ${OSA_X + 70} ${DOLE - 0.4}Q${OSA_X} ${DOLE - 1.5} ${OSA_X - 68} ${DOLE - 0.4}Z" fill="url(#${p}-zo)"/>` +
      `</g>`,
  );

  /* Vodní kámen pod netěsnou přírubou a pod spojkou u praskliny */
  s.push(vapnik(p, PRIRUBY[0], DOLE - 6, TRUBKA_Y + 56, 6, 0), vapnik(p, SPOJKY[0] - 27, DOLE - 15, DOLE, 5, teplo(SPOJKY[0] - 27)));

  s.push(prasklina(p), ...ZAVESY.map((x) => use("zav", x)));
  for (const [x, r] of KAPICKY) s.push(kapicka(p, x, DOLE, r, teplo(x)));

  return { defs, zadni, svg: s.join("") };
}
