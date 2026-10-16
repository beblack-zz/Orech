/**
 * Uvnitř krámku — dvě stěny interiéru pod průčelím, každá s vitrínou.
 * Kreslené stejnou rukou a paletou jako průčelí (zaklad.ts): plochy bez
 * obrysů, světlo zleva shora, měkké přechody jen pro světlo, žádné
 * textury — „overkill“ je v množství dobře nakreslených věcí.
 *
 *   dilna     Vlastní tvorba: omítnutá stěna, sloupky, dvě smaltované
 *             lampy, světlá vitrína se stříškou z tašek a štítem,
 *             lampion a fúrin pod okapem, papírová stěna shōji, police,
 *             dvě posuvná skla, šuplíky. Kolem bambus v seladonovém
 *             květináči, stolička s novinami a provázkem na balení,
 *             kalendář; na širokém monitoru i dveře do dílny s kruhem
 *             a regál s přežahy.
 *   japonsko  Japonská keramika: hliněná stěna, papírová lucerna,
 *             tmavá lakovaná vitrína s mosazí, římsa s krabicemi
 *             z paulovnie a bonsají, štítek letecké pošty, nasvícené
 *             výklenky s obloukem. Kolem krabice na zemi, bedna, v níž
 *             kusy přiletěly, svitek 一期一会; na širokém monitoru
 *             paraván a kulaté okno.
 *
 * Svět jedné stěny je W × H jednotek a kreslí se i kus za oba kraje
 * (ext), aby na širokém monitoru stěna pokračovala. Stránka (Vitrina.astro)
 * dá SVG přes celou šířku a zboží, cedulky, štít a lístky položí jako HTML
 * na obdélníky z geometrie — v procentech jádra W × H.
 *
 * Vrstvy: `zadni` (pokoj, vitrína, věci kolem) → HTML kusy → `predni`
 * (sklo, rámy výklenků, provázky cedulek, lampion, noren) → HTML cedulky.
 * Rozvržení `siroka` má 4 kusy na polici, `uzka` (telefon) 2.
 */
import { f, obdelnik, cara, kruh, elipsa, mnohouhelnik, nahoda, P, PISMO } from "./zaklad";
import type { Obdelnik, Bod } from "./zaklad";

export type Cast = "dilna" | "japonsko";
export type Rozvrzeni = "siroka" | "uzka";

/* ——— Barvy interiéru (rodina z P) ——— */
export const U = {
  strop: "#4A3020",
  stropLista: "#5E3D28",
  zed: P.omitka,
  zedStin: P.omitkaStin,
  zedJ: "#DCC6A0",
  zedJStin: "#C7AE84",
  obklad: "#A87A50",
  obkladJ: "#5E4030",
  podlaha: "#B98C62",
  podlahaSvetla: "#C99D70",
  podlahaSpara: "#97693F",
  podlahaJ: "#6E4A30",
  podlahaJSvetla: "#80583A",
  podlahaJSpara: "#4E331F",
  vitrina: "#B48456",
  vitrinaSvetla: "#CC9C6A",
  vitrinaTma: "#86603F",
  vitrinaHrana: "#E2BC8C",
  shoji: "#F6EEDC",
  zadStena: "#C99F70",
  zadStenaSpara: "#B58A5C",
  zadStenaSvetla: "#DDB98C",
  kumiko: "#C9A57A",
  policeVrch: "#E6C394",
  policeCelo: "#B98A5A",
  ramSkla: "#B3845A",
  lak: "#2E1F17",
  lakSvetly: "#45301F",
  lakTma: "#1A110D",
  lakHrana: "#6B4A33",
  lakVnitrek: "#1C1310",
  mosaz: "#C9A24A",
  mosazSvetla: "#EED9A0",
  mosazTma: "#8A6A24",
  paulownie: "#E6D1A6",
  paulownieSvetla: "#F2E4C4",
  paulownieStin: "#C9B184",
  snura: "#6E3B5E",
  snura2: "#3F6B57",
  seladon: "#93B39B",
  seladonTma: "#5E7C68",
  seladonSvetly: "#C6DCC4",
  bambus: "#8DAA5E",
  bambusTma: "#6B8A45",
  bambusSvetly: "#B3C98A",
  sklivec: "#E9DCC6",
  sklivecStin: "#D3C2A6",
  juta: "#B89A68",
  jutaTma: "#957848",
  noviny: "#ECE8DD",
  tisk: "#8F897D",
  smalt: "#3F6B57",
  smaltSvetly: "#6E9A84",
  sklo: "#FFFFFF",
};

/* ——— Pomocníci ——— */
export type Obd = [number, number, number, number];
export const obdelniky = (r: Obd[], atributy: string) =>
  r.length ? `<path d="${r.map(([x, y, w, h]) => `M${f(x)} ${f(y)}h${f(w)}v${f(h)}h${f(-w)}z`).join("")}" ${atributy}/>` : "";
export const kruhy = (k: [number, number, number][], atributy: string) =>
  k.length ? `<path d="${k.map(([x, y, r]) => `M${f(x + r)} ${f(y)}a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0z`).join("")}" ${atributy}/>` : "";
export const otoc = (uhel: number, cx: number, cy: number, obsah: string) => `<g transform="rotate(${f(uhel)} ${f(cx)} ${f(cy)})">${obsah}</g>`;
export const napis = (x: number, y: number, obsah: string, velikost: number, pismo: string, atributy = "") =>
  `<text x="${f(x)}" y="${f(y)}" font-size="${f(velikost)}" font-family="${pismo}" ${atributy}>${obsah}</text>`;
export const svisle = (x: number, y: number, znaky: string, velikost: number, krok: number, atributy = "") =>
  `<text font-size="${f(velikost)}" font-family="${PISMO.kanji}" text-anchor="middle" ${atributy}>${[...znaky]
    .map((z, i) => `<tspan x="${f(x)}" y="${f(y + i * krok)}">${z}</tspan>`)
    .join("")}</text>`;
const pripinacek = (x: number, y: number, barva: string, r = 4) =>
  kruh(x + 1.2, y + 1.5, r, `fill="${P.inkoust}" opacity="0.25"`) + kruh(x, y, r, `fill="${barva}"`) + kruh(x - r * 0.32, y - r * 0.32, r * 0.36, `fill="${P.bila}" opacity="0.75"`);
export const hrebik = (x: number, y: number) => kruh(x, y, 2.2, `fill="${P.kovTma}"`) + kruh(x - 0.6, y - 0.6, 0.8, `fill="${P.kovSvetly}"`);
/** Oblouk výklenku: nahoře půlelipsa (jako border-radius 50 % / 24 % na stránce) */
export const OBLOUK = 0.24;
const oblouk = (r: Obdelnik) => {
  const ry = r.h * OBLOUK;
  return `M${f(r.x)} ${f(r.y + r.h)} V${f(r.y + ry)} A${f(r.w / 2)} ${f(ry)} 0 0 1 ${f(r.x + r.w)} ${f(r.y + ry)} V${f(r.y + r.h)} Z`;
};

/* ════════════════════ Geometrie ════════════════════ */

interface Parametry {
  W: number;
  ext: number;
  sloupce: number;
  slot: number;
  kusW: number;
  kusH: number;
  /** Výška jedné řady (kus, police, cedulka) */
  rada: number;
  cedulkaH: number;
  /** Pás nahoře ve vitríně pro lístky */
  pasek: number;
  ram: number;
  stitW: number;
  /** Sloupky ve zdi (x levé hrany) */
  sloupky: number[];
  /** Lampy (x středu) */
  lampy: number[];
}

const PARAMETRY: Record<Cast, Record<Rozvrzeni, Parametry>> = {
  dilna: {
    siroka: { W: 1400, ext: 640, sloupce: 4, slot: 240, kusW: 200, kusH: 190, rada: 362, cedulkaH: 118, pasek: 136, ram: 28, stitW: 520, sloupky: [-560, 0, 1368, 1928], lampy: [420, 980] },
    uzka: { W: 560, ext: 260, sloupce: 2, slot: 236, kusW: 200, kusH: 190, rada: 404, cedulkaH: 158, pasek: 330, ram: 22, stitW: 470, sloupky: [-150, 678], lampy: [280] },
  },
  japonsko: {
    siroka: { W: 1400, ext: 640, sloupce: 4, slot: 240, kusW: 188, kusH: 236, rada: 474, cedulkaH: 178, pasek: 150, ram: 30, stitW: 560, sloupky: [-560, 0, 1368, 1928], lampy: [700] },
    uzka: { W: 560, ext: 260, sloupce: 2, slot: 236, kusW: 184, kusH: 230, rada: 538, cedulkaH: 240, pasek: 300, ram: 24, stitW: 480, sloupky: [-150, 678], lampy: [280] },
  },
};

export interface Geometrie extends Parametry {
  cast: Cast;
  rozvrzeni: Rozvrzeni;
  H: number;
  n: number;
  rady: number;
  /** Vnějšek vitríny (od horní hrany rámu po paty nožiček) */
  vitrina: Obdelnik;
  /** Prostor za sklem */
  vnitrek: Obdelnik;
  /** Pás s lístky nahoře za sklem */
  listky: Obdelnik;
  /** Štít nad vitrínou (HTML nadpis) */
  stit: Obdelnik;
  /** Kusy (HTML) — spodní hrana stojí na polici */
  kusy: Obdelnik[];
  /** Cedulky s cenou / mosazné jmenovky (HTML) */
  cedulky: Obdelnik[];
  /** Horní plocha polic po řadách */
  police: number[];
  /** Kde se stěna potká s podlahou */
  podlaha: number;
  /** Paty nožiček vitríny */
  pata: number;
  /** Horní hrana rámu, spodek vnitřku, horní hrana spodku se šuplíky */
  ramNahore: number;
  spodek: number;
  spodekH: number;
}

export function geometrie(cast: Cast, rozvrzeni: Rozvrzeni, n: number): Geometrie {
  const p = PARAMETRY[cast][rozvrzeni];
  const jp = cast === "japonsko";
  const rady = Math.max(1, Math.ceil(n / p.sloupce));
  const ramNahore = 252;
  const listkyY = ramNahore + (jp ? 38 : 34);
  const vnitrekW = p.sloupce * p.slot;
  const vx = (p.W - vnitrekW) / 2;
  const radyY = listkyY + p.pasek;
  const vnitrekDole = radyY + rady * p.rada + 6;
  const spodek = vnitrekDole + 26;
  const spodekH = jp ? 74 : 88;
  const pata = spodek + spodekH + 26;
  const podlaha = pata - 56;
  const kusy: Obdelnik[] = [];
  const cedulky: Obdelnik[] = [];
  const police: number[] = [];
  for (let r = 0; r < rady; r++) {
    const kusY = radyY + r * p.rada + 14;
    police.push(kusY + p.kusH);
    for (let c = 0; c < p.sloupce; c++) {
      const sx = vx + c * p.slot;
      kusy.push({ x: sx + (p.slot - p.kusW) / 2, y: kusY, w: p.kusW, h: p.kusH });
      cedulky.push({ x: sx + 8, y: kusY + p.kusH + (jp ? 34 : 36), w: p.slot - 16, h: p.cedulkaH });
    }
  }
  return {
    ...p,
    cast,
    rozvrzeni,
    n,
    rady,
    H: pata + 100,
    vitrina: { x: vx - p.ram, y: ramNahore, w: vnitrekW + 2 * p.ram, h: pata - ramNahore },
    vnitrek: { x: vx, y: listkyY, w: vnitrekW, h: vnitrekDole - listkyY },
    listky: { x: vx + 18, y: listkyY + 14, w: vnitrekW - 36, h: p.pasek - 24 },
    stit: { x: (p.W - p.stitW) / 2, y: jp ? 222 : 226, w: p.stitW, h: jp ? 100 : 94 },
    kusy: kusy.slice(0, Math.max(n, 0)),
    cedulky: cedulky.slice(0, Math.max(n, 0)),
    police,
    podlaha,
    pata,
    ramNahore,
    spodek,
    spodekH,
  };
}

/* ════════════════════ Pokoj: strop, trám, stěna, podlaha ════════════════════ */

function pokoj(g: Geometrie, id: string) {
  const jp = g.cast === "japonsko";
  const x0 = -g.ext;
  const w = g.W + 2 * g.ext;
  const zed = jp ? U.zedJ : U.zed;
  const zedStin = jp ? U.zedJStin : U.zedStin;
  let defs = `<linearGradient id="${id}-stin-tramu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.inkoust}" stop-opacity="0.2"/><stop offset="1" stop-color="${P.inkoust}" stop-opacity="0"/></linearGradient>`;
  defs += `<radialGradient id="${id}-zar"><stop offset="0" stop-color="#FFE4A8" stop-opacity="0.55"/><stop offset="0.55" stop-color="#FFE4A8" stop-opacity="0.18"/><stop offset="1" stop-color="#FFE4A8" stop-opacity="0"/></radialGradient>`;
  let s = "";
  // stěna a světlo lamp na ní
  s += obdelnik(x0, 76, w, g.podlaha - 76, `fill="${zed}"`);
  for (const lx of g.lampy) s += elipsa(lx, 250, 420, 300, `fill="url(#${id}-zar)"`);
  s += obdelnik(x0, 76, w, 70, `fill="url(#${id}-stin-tramu)"`);
  // lišta nageshi
  s += obdelnik(x0, 150, w, 14, `fill="${jp ? U.lakSvetly : P.drevo}"`) + obdelnik(x0, 150, w, 2.4, `fill="${jp ? U.lakHrana : P.drevoHrana}"`);
  s += obdelnik(x0, 164, w, 7, `fill="${P.inkoust}" opacity="0.1"`);
  // obklad dole (koshi-ita): svislá prkna a horní lišta
  const ob = g.podlaha - 124;
  s += obdelnik(x0, ob, w, 124, `fill="${jp ? U.obkladJ : U.obklad}"`);
  let spary = "";
  for (let x = x0 + 14; x < x0 + w; x += 31) spary += `M${f(x)} ${f(ob + 8)}V${f(g.podlaha)}`;
  s += `<path d="${spary}" stroke="${jp ? U.lakTma : P.drevo}" stroke-width="1.6" opacity="0.45"/>`;
  s += obdelnik(x0, ob - 2, w, 10, `fill="${jp ? U.lakHrana : P.drevoHrana}"`) + obdelnik(x0, ob + 8, w, 4, `fill="${P.inkoust}" opacity="0.14"`);
  s += obdelnik(x0, g.podlaha - 10, w, 10, `fill="${jp ? U.lakTma : P.drevoTma}"`);
  // sloupky ve zdi: světlá hrana vlevo, stín vpravo
  for (const sx of g.sloupky) {
    s += obdelnik(sx, 76, 32, g.podlaha - 76, `fill="${jp ? U.lakSvetly : P.drevoSvetle}"`);
    s += obdelnik(sx, 76, 4, g.podlaha - 76, `fill="${jp ? U.lakHrana : P.drevoHrana}"`);
    s += obdelnik(sx + 25, 76, 7, g.podlaha - 76, `fill="${jp ? U.lakTma : P.drevo}"`);
    s += obdelnik(sx + 32, 76, 10, g.podlaha - 76, `fill="${zedStin}" opacity="0.6"`);
  }
  // podlaha: prkna se zužují dozadu, spáry přesazené
  s += obdelnik(x0, g.podlaha, w, g.H - g.podlaha, `fill="${jp ? U.podlahaJ : U.podlaha}"`);
  const pasy = [0, 12, 28, 50, 80, 120].map((d) => g.podlaha + d).filter((y) => y < g.H);
  const r = nahoda(jp ? 31 : 17);
  let cary = "";
  let svetle = "";
  pasy.forEach((y, i) => {
    cary += `M${f(x0)} ${f(y)}H${f(x0 + w)}`;
    const dalsi = pasy[i + 1] ?? g.H;
    const krok = 160 + i * 70;
    for (let x = x0 + r() * krok; x < x0 + w; x += krok + r() * 90) cary += `M${f(x)} ${f(y)}V${f(dalsi)}`;
    if (i % 2) svetle += `M${f(x0)} ${f(y + 1)}h${f(w)}v${f(dalsi - y - 1)}h${f(-w)}z`;
  });
  s += `<path d="${svetle}" fill="${jp ? U.podlahaJSvetla : U.podlahaSvetla}" opacity="0.5"/>`;
  s += `<path d="${cary}" stroke="${jp ? U.podlahaJSpara : U.podlahaSpara}" stroke-width="1.6" opacity="0.6"/>`;
  s += obdelnik(x0, g.podlaha, w, 14, `fill="${P.inkoust}" opacity="0.12"`);
  // strop s lištami a trám
  s += obdelnik(x0, 0, w, 38, `fill="${U.strop}"`);
  s += obdelniky([[x0, 11, w, 2], [x0, 24, w, 2]], `fill="${U.stropLista}"`);
  s += obdelnik(x0, 36, w, 40, `fill="${jp ? U.lakSvetly : P.drevo}"`);
  s += obdelnik(x0, 36, w, 4, `fill="${jp ? U.lakHrana : P.drevoHrana}" opacity="0.8"`);
  s += obdelnik(x0, 70, w, 6, `fill="${P.drevoTma2}" opacity="0.55"`);
  // kramle trámu nad sloupky
  for (const sx of g.sloupky) s += obdelnik(sx + 6, 52, 20, 10, `rx="2" fill="${P.kovTma}"`) + kruhy([[sx + 11, 57, 1.6], [sx + 21, 57, 1.6]], `fill="${P.kovSvetly}"`);
  return { defs, s };
}

/** Smaltovaná lampa (jako nad pultem v krámku), světlo v ní */
function lampa(cx: number) {
  let s = cara(cx, 76, cx, 132, `stroke="${P.inkoust}" stroke-width="2.2"`);
  s += obdelnik(cx - 7, 128, 14, 12, `rx="2" fill="${P.inkoust}"`);
  s += `<path d="M${cx - 16} 140 L${cx + 16} 140 L${cx + 62} 180 Q${cx} 189 ${cx - 62} 180 Z" fill="${U.smalt}"/>`;
  s += `<path d="M${cx - 16} 140 L${cx - 7} 140 L${cx - 42} 182 L${cx - 55} 181 Z" fill="${U.smaltSvetly}" opacity="0.85"/>`;
  s += elipsa(cx, 180.5, 62, 7.4, `fill="#F1EADB"`);
  s += elipsa(cx, 181.6, 55, 5, `fill="#FFF3D6"`);
  s += elipsa(cx, 186, 11, 8, `fill="#FFF6DD"`);
  return s;
}

/** Papírová lucerna (chōchin) s ražbou 器 */
function lucerna(cx: number) {
  let s = cara(cx, 76, cx, 104, `stroke="${P.inkoust}" stroke-width="2"`);
  s += obdelnik(cx - 22, 104, 44, 10, `rx="3" fill="${P.inkoust}"`);
  s += `<path d="M${cx - 22} 114 C${cx - 50} 126 ${cx - 50} 184 ${cx - 22} 196 H${cx + 22} C${cx + 50} 184 ${cx + 50} 126 ${cx + 22} 114 Z" fill="#FFF4DA"/>`;
  s += `<path d="M${cx - 22} 114 C${cx - 50} 126 ${cx - 50} 184 ${cx - 22} 196 C${cx - 38} 180 ${cx - 38} 130 ${cx - 16} 114 Z" fill="#F4DFB4"/>`;
  let zebra = "";
  for (let i = 1; i < 7; i++) {
    const y = 114 + i * 11.7;
    const t = Math.sin((i / 7) * Math.PI);
    zebra += `M${f(cx - 22 - 26 * t)} ${f(y)} Q${cx} ${f(y + 4)} ${f(cx + 22 + 26 * t)} ${f(y)}`;
  }
  s += `<path d="${zebra}" stroke="#D9BF8C" stroke-width="1.2" fill="none"/>`;
  s += napis(cx, 168, "器", 34, PISMO.kanji, `text-anchor="middle" fill="${P.rumelka}"`);
  s += obdelnik(cx - 22, 196, 44, 9, `rx="3" fill="${P.inkoust}"`);
  s += cara(cx, 205, cx, 222, `stroke="${P.rumelka}" stroke-width="3" stroke-linecap="round"`);
  return s;
}

/* ════════════════════ Věci kolem (tvorba) ════════════════════ */

/** Bambus v seladonovém květináči */
function bambus(cx: number, pata: number, vyska: number) {
  let s = elipsa(cx + 6, pata, 62, 9, `fill="${P.inkoust}" opacity="0.22"`);
  // stébla s kolénky
  const stebla: [number, number, number][] = [[-18, vyska, -2], [6, vyska * 0.86, 3], [24, vyska * 0.7, 6]];
  for (const [dx, h, u] of stebla) {
    const x = cx + dx;
    let t = obdelnik(x - 5, pata - 80 - h, 10, h, `rx="4" fill="${U.bambus}"`);
    t += obdelnik(x - 5, pata - 80 - h, 3, h, `fill="${U.bambusSvetly}" opacity="0.8"`);
    t += obdelnik(x + 2, pata - 80 - h, 3, h, `fill="${U.bambusTma}" opacity="0.7"`);
    for (let y = pata - 80 - h + 40; y < pata - 90; y += 52) t += obdelnik(x - 6, y, 12, 4, `rx="2" fill="${U.bambusTma}"`);
    s += otoc(u, x, pata - 80, t);
  }
  // listy po trsech
  const r = nahoda(Math.round(cx));
  const listy: string[] = [];
  for (let i = 0; i < 22; i++) {
    const k = stebla[i % 3];
    const y = pata - 80 - k[1] * (0.25 + r() * 0.75);
    const x = cx + k[0] + k[2] * ((pata - 80 - y) / 100);
    const smer = r() < 0.5 ? -1 : 1;
    const u = smer * (20 + r() * 35);
    const barva = r() < 0.3 ? P.listSvetly : r() < 0.6 ? P.list : P.listTma;
    listy.push(elipsa(x + smer * 22, y, 26, 5.5, `fill="${barva}" transform="rotate(${f(u)} ${f(x + smer * 22)} ${f(y)})"`));
  }
  s += listy.join("");
  // květináč: tělo, okraj, odlesk glazury
  s += `<path d="M${cx - 52} ${pata - 84} H${cx + 52} L${cx + 42} ${pata - 4} Q${cx} ${pata + 2} ${cx - 42} ${pata - 4} Z" fill="${U.seladon}"/>`;
  s += `<path d="M${cx - 52} ${pata - 84} H${cx - 30} L${cx - 26} ${pata - 2} Q${cx - 36} ${pata - 2} ${cx - 42} ${pata - 4} Z" fill="${U.seladonSvetly}" opacity="0.7"/>`;
  s += `<path d="M${cx + 26} ${pata - 84} H${cx + 52} L${cx + 42} ${pata - 4} Q${cx + 34} ${pata - 1} ${cx + 22} ${pata - 1} Z" fill="${U.seladonTma}" opacity="0.6"/>`;
  s += obdelnik(cx - 58, pata - 94, 116, 12, `rx="4" fill="${U.seladonTma}"`) + obdelnik(cx - 58, pata - 94, 116, 4, `rx="2" fill="${U.seladonSvetly}" opacity="0.8"`);
  s += elipsa(cx, pata - 94, 52, 4, `fill="#4A3828"`);
  return s;
}

/** Stolička s balením: noviny, klubko provázku, nůžky */
function stolicka(cx: number, pata: number) {
  const vrch = pata - 118;
  let s = elipsa(cx + 6, pata, 70, 8, `fill="${P.inkoust}" opacity="0.2"`);
  // nohy (zadní tmavší)
  s += obdelniky([[cx - 40, vrch + 10, 10, pata - vrch - 18], [cx + 30, vrch + 10, 10, pata - vrch - 18]], `fill="${P.drevoTma}"`);
  s += obdelniky([[cx - 56, vrch + 12, 12, pata - vrch - 12], [cx + 44, vrch + 12, 12, pata - vrch - 12]], `fill="${P.drevo}"`);
  s += obdelniky([[cx - 56, vrch + 12, 3, pata - vrch - 12], [cx + 44, vrch + 12, 3, pata - vrch - 12]], `fill="${P.drevoHrana}" opacity="0.7"`);
  s += obdelnik(cx - 54, pata - 46, 108, 8, `fill="${P.drevoTma}"`);
  s += obdelnik(cx - 64, vrch, 128, 14, `rx="3" fill="${P.drevoSvetle}"`) + obdelnik(cx - 64, vrch, 128, 4, `rx="2" fill="${P.drevoHrana}"`);
  // štos novin
  const nx = cx - 54;
  for (let i = 0; i < 4; i++) {
    const y = vrch - 7 - i * 7;
    const d = (i % 2 ? 3 : -2);
    s += obdelnik(nx + d, y, 74, 7, `fill="${i % 2 ? U.noviny : "#E2DDCF"}"`);
    s += obdelnik(nx + d + 4, y + 3, 30, 1.2, `fill="${U.tisk}" opacity="0.6"`);
  }
  s += obdelnik(nx + 2, vrch - 46, 70, 17, `fill="${U.noviny}"`);
  s += obdelnik(nx + 8, vrch - 42, 26, 3, `fill="#6E6A62"`);
  s += `<path d="M${nx + 8} ${vrch - 36}h56M${nx + 8} ${vrch - 33}h40" stroke="${U.tisk}" stroke-width="1.2" opacity="0.7"/>`;
  // klubko juty
  const kx = cx + 38;
  const ky = vrch - 16;
  s += kruh(kx, ky, 16, `fill="${U.juta}"`);
  s += `<path d="M${kx - 14} ${ky - 6} Q${kx} ${ky - 14} ${kx + 14} ${ky - 4} M${kx - 15} ${ky + 2} Q${kx} ${ky - 6} ${kx + 15} ${ky + 4} M${kx - 12} ${ky + 9} Q${kx} ${ky + 2} ${kx + 13} ${ky + 10}" stroke="${U.jutaTma}" stroke-width="1.6" fill="none"/>`;
  s += `<path d="M${kx + 12} ${ky + 10} Q${kx + 26} ${ky + 18} ${kx + 18} ${vrch + 2} T${kx + 30} ${vrch + 30}" stroke="${U.juta}" stroke-width="2" fill="none"/>`;
  // nůžky
  const sx = cx - 6;
  const sy = vrch - 4;
  s += otoc(-14, sx, sy, `<path d="M${sx} ${sy} l38 -4 l-38 -2 z" fill="${P.kovSvetly}"/><path d="M${sx} ${sy - 2} l36 6 l-36 -1 z" fill="${P.kov}"/>` + kruh(sx - 8, sy - 6, 6, `fill="none" stroke="${P.rumelka}" stroke-width="3.4"`) + kruh(sx - 8, sy + 5, 6, `fill="none" stroke="${P.rumelka}" stroke-width="3.4"`));
  return s;
}

/** Kalendář na připínáčku: říjen s kočkou */
function kalendar(x: number, y: number) {
  const w = 104;
  const h = 150;
  let s = obdelnik(x + 4, y + 5, w, h, `fill="${P.inkoust}" opacity="0.16"`);
  s += obdelnik(x, y, w, h, `fill="${P.papir}"`);
  s += obdelnik(x, y, w, 58, `fill="#E9D7B6"`);
  // kočka spí na obrázku
  s += `<path d="M${x + 30} ${y + 46} C${x + 28} ${y + 30} ${x + 74} ${y + 30} ${x + 76} ${y + 46} Z" fill="#F4F1EA"/>`;
  s += mnohouhelnik([[x + 34, y + 37], [x + 36, y + 27], [x + 42, y + 33]], `fill="#F4F1EA"`) + mnohouhelnik([[x + 48, y + 33], [x + 52, y + 26], [x + 55, y + 34]], `fill="#F4F1EA"`);
  s += elipsa(x + 62, y + 38, 8, 6, `fill="#D9A441"`) + elipsa(x + 40, y + 42, 6, 4, `fill="#3E2A1D"`);
  s += `<path d="M${x + 38} ${y + 38} q2 1.6 4 0 M${x + 46} ${y + 38} q2 1.6 4 0" stroke="${P.inkoust}" stroke-width="1.2" fill="none"/>`;
  s += napis(x + 14, y + 92, "10", 30, PISMO.nadpis, `font-weight="600" fill="${P.rumelka}"`) + napis(x + 54, y + 90, "月", 18, PISMO.kanji, `fill="${P.inkoust}"`);
  const dny: Obd[] = [];
  for (let i = 0; i < 28; i++) dny.push([x + 10 + (i % 7) * 12.6, y + 102 + Math.floor(i / 7) * 11, 6, 4]);
  s += obdelniky(dny, `fill="${P.inkoust}" opacity="0.35"`);
  s += obdelnik(x + 10 + 2 * 12.6 - 2, y + 102 + 2 * 11 - 2, 10, 8, `fill="none" stroke="${P.rumelka}" stroke-width="1.4"`);
  s += pripinacek(x + w / 2, y + 6, P.rumelka);
  return s;
}

/** Dveře do dílny (posuvné shōji, pootevřené) — v otvoru hrnčířský kruh, police s přežahy a vědro */
function dvereDilna(x: number, g: Geometrie) {
  const w = 380;
  const otvor = 230;
  const y = 196;
  const dole = g.podlaha - 10;
  const h = dole - y;
  let s = "";
  // dílna za dveřmi: hlína na stěně, světlo z okna zleva
  s += obdelnik(x, y, otvor, h, `fill="#D2BC96"`);
  s += mnohouhelnik([[x, y + 40], [x + 90, y + 40], [x + otvor, dole], [x, dole]], `fill="#E2CFAA" opacity="0.6"`);
  s += obdelnik(x, y, otvor, 50, `fill="${P.inkoust}" opacity="0.18"`);
  // police s přežahy (dvě desky)
  const desky: [number, number[][]][] = [
    [y + 170, [[16, 30, 26], [52, 24, 34], [82, 38, 18], [126, 30, 28], [164, 44, 20]]],
    [y + 290, [[18, 40, 22], [64, 28, 36], [98, 34, 26], [140, 46, 18], [190, 24, 30]]],
  ];
  for (const [py, kusy] of desky) {
    s += obdelnik(x + 6, py, otvor - 12, 9, `fill="${P.drevo}"`) + obdelnik(x + 6, py, otvor - 12, 2.4, `fill="${P.drevoHrana}"`);
    for (const [px, pw, ph] of kusy) {
      s += `<path d="M${f(x + px)} ${f(py - ph)} h${f(pw)} l-4 ${f(ph)} h${f(-pw + 8)} z" fill="#E8C2A6"/>`;
      s += obdelnik(x + px, py - ph, pw, 3, `fill="#F2D6C0"`);
    }
  }
  // hrnčířský kruh s rozdělanou vázou
  const kx = x + 86;
  const ky = dole - 44;
  s += elipsa(kx + 6, dole - 2, 60, 6, `fill="${P.inkoust}" opacity="0.2"`);
  s += obdelnik(kx - 38, ky - 2, 76, 46, `rx="6" fill="#8E979E"`) + obdelnik(kx - 38, ky - 2, 76, 6, `rx="3" fill="#B8C0C6"`);
  s += elipsa(kx, ky - 8, 52, 10, `fill="#5E666C"`) + elipsa(kx, ky - 12, 52, 10, `fill="#9AA3AA"`) + elipsa(kx, ky - 13, 30, 5, `fill="#B8C0C6"`);
  s += `<path d="M${kx - 20} ${ky - 14} C${kx - 26} ${ky - 44} ${kx - 10} ${ky - 50} ${kx - 13} ${ky - 66} H${kx + 13} C${kx + 10} ${ky - 50} ${kx + 26} ${ky - 44} ${kx + 20} ${ky - 14} Z" fill="#B8875A"/>`;
  s += `<path d="M${kx - 20} ${ky - 14} C${kx - 26} ${ky - 44} ${kx - 10} ${ky - 50} ${kx - 13} ${ky - 66} H${kx - 6} C${kx - 4} ${ky - 50} ${kx - 18} ${ky - 44} ${kx - 12} ${ky - 14} Z" fill="#CFA27A"/>`;
  s += elipsa(kx, ky - 66, 13, 3.4, `fill="#8E6440"`);
  // vědro s vodou, houba a stolička hrnčíře
  s += obdelnik(kx + 62, dole - 40, 34, 40, `rx="3" fill="#7088A2"`) + elipsa(kx + 79, dole - 40, 17, 3.4, `fill="#9DB1C6"`) + elipsa(kx + 74, dole - 42, 7, 3, `fill="#E2C46A"`);
  s += obdelnik(x + 8, dole - 30, 40, 8, `rx="2" fill="${P.drevoSvetle}"`) + obdelniky([[x + 12, dole - 22, 6, 22], [x + 38, dole - 22, 6, 22]], `fill="${P.drevo}"`);
  // odsunuté křídlo shōji
  const kr = x + otvor - 10;
  s += obdelnik(kr, y, w - otvor + 10, h, `fill="${U.shoji}"`);
  let mriz = "";
  for (let i = 1; i < 3; i++) mriz += `M${f(kr + (i * (w - otvor + 10)) / 3)} ${f(y)}V${f(dole)}`;
  for (let yy = y + 64; yy < dole; yy += 64) mriz += `M${f(kr)} ${f(yy)}H${f(x + w)}`;
  s += `<path d="${mriz}" stroke="${U.kumiko}" stroke-width="3.4"/>`;
  s += obdelnik(kr, y, 12, h, `fill="${P.drevoSvetle}"`) + obdelnik(x + w - 12, y, 12, h, `fill="${P.drevoSvetle}"`) + obdelnik(kr, dole - 70, w - otvor + 10, 70, `fill="${P.drevoSvetle}"`);
  s += kruh(kr + 26, y + h * 0.52, 8, `fill="${P.drevoTma}"`) + kruh(kr + 26, y + h * 0.52, 4, `fill="${P.drevoTma2}"`);
  // rám dveří a cedulka 工房
  s += obdelnik(x - 14, y - 16, w + 28, 16, `fill="${P.drevo}"`) + obdelnik(x - 14, y, 14, h + 10, `fill="${P.drevo}"`) + obdelnik(x + w, y, 14, h + 10, `fill="${P.drevoTma}"`);
  s += obdelnik(x - 14, y - 16, w + 28, 3, `fill="${P.drevoHrana}"`);
  const cx = x + otvor / 2;
  s += cara(cx - 30, y - 62, cx - 20, y - 80, `stroke="${P.inkoust}" stroke-width="1.4"`) + cara(cx + 30, y - 62, cx + 20, y - 80, `stroke="${P.inkoust}" stroke-width="1.4"`) + hrebik(cx - 20, y - 80) + hrebik(cx + 20, y - 80);
  s += obdelnik(cx - 46, y - 64, 92, 42, `rx="4" fill="${P.drevoTma}"`) + obdelnik(cx - 42, y - 60, 84, 34, `rx="3" fill="#E9D7B6"`);
  s += napis(cx, y - 34, "工房", 24, PISMO.kanji, `text-anchor="middle" fill="${P.inkoust}"`);
  return s;
}

/** Polička na zdi s darumou a malou vázičkou */
function policka(x: number, y: number) {
  let s = mnohouhelnik([[x + 10, y + 6], [x + 22, y + 6], [x + 10, y + 26]], `fill="${P.drevoTma}"`) + mnohouhelnik([[x + 110, y + 6], [x + 98, y + 6], [x + 110, y + 26]], `fill="${P.drevoTma}"`);
  s += obdelnik(x, y, 120, 8, `fill="${P.drevoSvetle}"`) + obdelnik(x, y, 120, 2.4, `fill="${P.drevoHrana}"`) + obdelnik(x, y + 8, 120, 5, `fill="${P.inkoust}" opacity="0.12"`);
  // daruma: červené tělo, bílý obličej, jedno oko domalované
  const dx = x + 38;
  s += elipsa(dx + 2, y - 1, 22, 3, `fill="${P.inkoust}" opacity="0.2"`);
  s += `<path d="M${dx - 22} ${y - 2} C${dx - 26} ${y - 30} ${dx - 14} ${y - 50} ${dx} ${y - 50} C${dx + 14} ${y - 50} ${dx + 26} ${y - 30} ${dx + 22} ${y - 2} Z" fill="${P.rumelka}"/>`;
  s += `<path d="M${dx - 22} ${y - 2} C${dx - 26} ${y - 30} ${dx - 14} ${y - 50} ${dx} ${y - 50} C${dx - 10} ${y - 44} ${dx - 16} ${y - 26} ${dx - 14} ${y - 2} Z" fill="${P.rumelkaTma}" opacity="0.6"/>`;
  s += elipsa(dx, y - 32, 12, 10, `fill="#F6EEDC"`);
  s += kruh(dx - 5, y - 33, 3.4, `fill="${P.inkoust}"`) + kruh(dx + 5, y - 33, 3.4, `fill="none" stroke="${P.inkoust}" stroke-width="1"`);
  s += `<path d="M${dx - 4} ${y - 26} q4 2 8 0" stroke="${P.inkoust}" stroke-width="1.2" fill="none"/>`;
  s += `<path d="M${dx - 10} ${y - 14} q10 6 20 0" stroke="${U.mosaz}" stroke-width="2.4" fill="none"/>`;
  // vázička s větvičkou
  const vx = x + 88;
  s += `<path d="M${vx - 8} ${y} C${vx - 12} ${y - 12} ${vx - 6} ${y - 20} ${vx - 3} ${y - 28} H${vx + 3} C${vx + 6} ${y - 20} ${vx + 12} ${y - 12} ${vx + 8} ${y} Z" fill="${U.seladon}"/>`;
  s += `<path d="M${vx} ${y - 28} C${vx - 4} ${y - 44} ${vx + 6} ${y - 52} ${vx + 2} ${y - 66}" stroke="#4A3326" stroke-width="2" fill="none"/>`;
  s += kruhy([[vx - 3, y - 44, 4], [vx + 5, y - 52, 3.6], [vx + 1, y - 64, 4.2]], `fill="#F2B5C4"`);
  return s;
}

/** Vysoký regál s přežahy a koště opřené o zeď */
function regalPrezahy(x: number, g: Geometrie) {
  const w = 230;
  const nahore = 220;
  const pata = g.podlaha + 30;
  const desky = [380, 540, 700, pata - 40];
  let s = elipsa(x + w / 2 + 8, pata, w / 2 + 16, 8, `fill="${P.inkoust}" opacity="0.2"`);
  s += obdelnik(x, nahore, w, pata - nahore, `fill="${P.drevoTma}"`);
  s += obdelnik(x + 10, nahore + 10, w - 20, pata - nahore - 20, `fill="#5E3D28"`);
  const r = nahoda(77);
  for (const d of desky) {
    s += obdelnik(x + 10, d, w - 20, 10, `fill="${P.drevoSvetle}"`) + obdelnik(x + 10, d, w - 20, 2.4, `fill="${P.drevoHrana}"`);
    if (d > pata - 60) continue;
    for (let px = x + 18; px < x + w - 50; px += 34 + r() * 16) {
      const ph = 22 + r() * 36;
      const pw = 26 + r() * 14;
      const sirsi = r() < 0.5;
      s += sirsi
        ? `<path d="M${f(px)} ${f(d - ph * 0.6)} Q${f(px + pw / 2)} ${f(d + 4)} ${f(px + pw + 8)} ${f(d - ph * 0.6)} Z" fill="#E8C2A6"/>` + elipsa(px + (pw + 8) / 2, d - ph * 0.6, (pw + 8) / 2, 3, `fill="#F2D6C0"`)
        : `<path d="M${f(px)} ${f(d - ph)} h${f(pw)} l-3 ${f(ph)} h${f(-pw + 6)} z" fill="#E3BC9E"/>` + obdelnik(px, d - ph, pw, 3, `fill="#F2D6C0"`);
    }
  }
  s += obdelnik(x, nahore, 6, pata - nahore, `fill="${P.drevo}"`) + obdelnik(x + w - 6, nahore, 6, pata - nahore, `fill="${P.drevoTma2}"`);
  // koště z rýžové slámy
  const kx = x + w + 40;
  s += otoc(8, kx, pata, obdelnik(kx - 3, pata - 300, 6, 230, `fill="${P.drevoSvetle}"`) + `<path d="M${kx - 6} ${pata - 74} C${kx - 34} ${pata - 40} ${kx - 30} ${pata - 6} ${kx - 26} ${pata} H${kx + 26} C${kx + 30} ${pata - 6} ${kx + 34} ${pata - 40} ${kx + 6} ${pata - 74} Z" fill="#D9B86A"/>` + `<path d="M${kx - 6} ${pata - 74} h12 v8 h-12 z M${kx - 14} ${pata - 52} h28" stroke="${P.rumelka}" stroke-width="3" fill="none"/>`);
  return s;
}

/* ════════════════════ Věci kolem (Japonsko) ════════════════════ */

/** Krabice z paulovnie převázaná šňůrou sanada-himo */
function krabicka(x: number, pata: number, w: number, h: number, snura: string, napisZnaky = "") {
  let s = obdelnik(x, pata - h, w, h, `rx="2" fill="${U.paulownie}"`);
  s += obdelnik(x, pata - h, w, Math.min(10, h * 0.28), `fill="${U.paulownieSvetla}"`);
  s += obdelnik(x, pata - h + Math.min(10, h * 0.28), w, 1.6, `fill="${U.paulownieStin}"`);
  s += obdelnik(x + w - 6, pata - h, 6, h, `fill="${U.paulownieStin}" opacity="0.6"`);
  s += obdelnik(x + w * 0.46, pata - h, 3.6, h, `fill="${snura}"`) + obdelnik(x, pata - h * 0.5, w, 3.6, `fill="${snura}"`);
  if (napisZnaky) s += obdelnik(x + w * 0.62, pata - h + 14, 14, h - 24, `fill="${P.papir}"`) + svisle(x + w * 0.62 + 7, pata - h + 28, napisZnaky, 11, 12, `fill="${P.inkoust}"`);
  return s;
}
function masle(x: number, y: number, snura: string) {
  return `<path d="M${x} ${y} c-14 -12 -22 -2 -10 3 M${x} ${y} c14 -12 22 -2 10 3 M${x} ${y} l-7 14 M${x} ${y} l7 14" stroke="${snura}" stroke-width="3.2" fill="none" stroke-linecap="round"/>`;
}

function krabiceNaZemi(cx: number, pata: number) {
  let s = elipsa(cx + 8, pata, 84, 9, `fill="${P.inkoust}" opacity="0.22"`);
  s += krabicka(cx - 76, pata, 152, 70, U.snura, "萬古");
  s += krabicka(cx - 60, pata - 70, 116, 56, U.snura2);
  s += krabicka(cx - 42, pata - 126, 82, 44, U.snura, "萩焼");
  s += masle(cx - 42 + 82 * 0.46 + 1.8, pata - 170, U.snura);
  return s;
}

/** Bedna, ve které kusy přiletěly: prkna, sláma, nálepky letecké pošty a „křehké“ */
function bedna(cx: number, pata: number, id: string) {
  const w = 170;
  const h = 128;
  const x = cx - w / 2;
  const y = pata - h;
  let s = elipsa(cx + 8, pata, w / 2 + 14, 9, `fill="${P.inkoust}" opacity="0.22"`);
  // sláma přes okraj
  const r = nahoda(404);
  let slama = "";
  for (let i = 0; i < 26; i++) {
    const sx = x + 8 + r() * (w - 16);
    const u = -60 + r() * 120;
    const d = 18 + r() * 24;
    slama += `M${f(sx)} ${f(y + 6)}l${f(Math.sin((u * Math.PI) / 180) * d)} ${f(-Math.cos((u * Math.PI) / 180) * d)}`;
  }
  s += `<path d="${slama}" stroke="#D9B86A" stroke-width="2.2" stroke-linecap="round"/>`;
  s += obdelnik(x, y, w, h, `fill="#C9A06A"`);
  s += obdelniky([0, 1, 2, 3].map((i): Obd => [x, y + i * 32 + 30, w, 2.4]), `fill="#9C7646"`);
  s += obdelniky([[x, y, 14, h], [x + w - 14, y, 14, h]], `fill="#B08652"`);
  s += obdelnik(x, y, w, 4, `fill="#DDBA84"`);
  s += kruhy([[x + 7, y + 12, 1.8], [x + 7, y + h - 12, 1.8], [x + w - 7, y + 12, 1.8], [x + w - 7, y + h - 12, 1.8]], `fill="${P.kovTma}"`);
  // nálepka letecké pošty
  s += otoc(-5, x + 56, y + 40, `<rect x="${f(x + 20)}" y="${f(y + 24)}" width="76" height="36" fill="url(#${id}-pruhy)"/>` + obdelnik(x + 25, y + 29, 66, 26, `fill="${P.papir}"`) + napis(x + 58, y + 47, "航空便", 15, PISMO.kanji, `text-anchor="middle" fill="#2E4A78"`));
  // křehké: rumělková nálepka s prasklou miskou
  s += otoc(4, x + 128, y + 86, obdelnik(x + 104, y + 66, 46, 42, `fill="${P.papir}"`) + obdelnik(x + 106, y + 68, 42, 38, `fill="none" stroke="${P.rumelka}" stroke-width="1.6"`) + `<path d="M${x + 114} ${y + 76} h26 q-2 13 -13 13 q-11 0 -13 -13 z" fill="${P.rumelka}"/>` + `<path d="M${x + 127} ${y + 76} l3 5 l-4 4 l3 4" stroke="#FFFFFF" stroke-width="1.4" fill="none"/>` + napis(x + 127, y + 101, "ワレモノ", 8, PISMO.kanji, `text-anchor="middle" fill="${P.rumelka}"`));
  // celní lístek na provázku
  s += cara(x + 30, y + 92, x + 22, y + 104, `stroke="${U.juta}" stroke-width="1.4"`) + otoc(-12, x + 22, y + 114, obdelnik(x + 8, y + 104, 30, 20, `rx="2" fill="#E6DCC6"`) + obdelnik(x + 12, y + 110, 18, 1.4, `fill="${P.inkoust}" opacity="0.5"`) + obdelnik(x + 12, y + 115, 12, 1.4, `fill="${P.inkoust}" opacity="0.5"`));
  return s;
}

/** Závěsný svitek s 一期一会 („jedno setkání, jednou“) */
function svitekJ(cx: number, y: number, h: number) {
  const w = 86;
  let s = cara(cx, y - 40, cx - 26, y, `stroke="${P.inkoust}" stroke-width="1.4"`) + cara(cx, y - 40, cx + 26, y, `stroke="${P.inkoust}" stroke-width="1.4"`) + hrebik(cx, y - 40);
  s += obdelnik(cx - w / 2 - 4, y, w + 8, 8, `rx="3" fill="${P.drevoTma2}"`);
  s += obdelnik(cx - w / 2 + 4, y + 8, w + 6, h, `fill="${P.inkoust}" opacity="0.15"`);
  s += obdelnik(cx - w / 2, y + 8, w, h, `fill="#7A6A52"`);
  s += obdelnik(cx - w / 2 + 10, y + 26, w - 20, h - 44, `fill="#F4EAD2"`);
  s += svisle(cx, y + 62, "一期一会", 26, 34, `fill="${P.inkoust}"`);
  s += obdelnik(cx - 7, y + h - 34, 14, 14, `fill="none" stroke="${P.rumelka}" stroke-width="1.6"`);
  s += obdelnik(cx - w / 2 - 6, y + 8 + h, w + 12, 12, `rx="5" fill="${P.drevoTma2}"`);
  return s;
}

/** Pohlednice s Fudži na připínáčku */
function pohlednice(x: number, y: number) {
  let s = obdelnik(x + 4, y + 5, 104, 70, `fill="${P.inkoust}" opacity="0.16"`);
  s += otoc(-4, x + 52, y + 35, obdelnik(x, y, 104, 70, `fill="${P.papir}"`) + obdelnik(x + 6, y + 6, 92, 58, `fill="#BFD6E6"`) + kruh(x + 76, y + 22, 9, `fill="${P.rumelka}"`) + `<path d="M${x + 6} ${y + 64} L${x + 40} ${y + 26} Q${x + 52} ${y + 16} ${x + 64} ${y + 26} L${x + 98} ${y + 60} V${y + 64} Z" fill="#5F738F"/>` + `<path d="M${x + 40} ${y + 26} Q${x + 52} ${y + 16} ${x + 64} ${y + 26} L${x + 58} ${y + 32} L${x + 54} ${y + 28} L${x + 49} ${y + 34} L${x + 45} ${y + 30} Z" fill="${P.papir}"/>` + pripinacek(x + 52, y + 4, "#2E4A78"));
  return s;
}

/** Paraván (byōbu) se zlatými poli a borovicí */
function paravan(x: number, g: Geometrie) {
  const w = 380;
  const pata = g.podlaha + 26;
  const y = 330;
  let s = elipsa(x + w / 2, pata, w / 2 + 10, 8, `fill="${P.inkoust}" opacity="0.2"`);
  const dily = 4;
  for (let i = 0; i < dily; i++) {
    const dx = x + (i * w) / dily;
    const svetly = i % 2 === 0;
    s += obdelnik(dx, y + (svetly ? 0 : 8), w / dily, pata - y - (svetly ? 0 : 8), `fill="${svetly ? "#E2C27A" : "#C9A85E"}"`);
    s += obdelnik(dx, y + (svetly ? 0 : 8), w / dily, pata - y - (svetly ? 0 : 8), `fill="none" stroke="${U.lakTma}" stroke-width="6"`);
  }
  // borovice přes pole a měsíc
  s += kruh(x + w * 0.74, y + 90, 34, `fill="#F4EAD2"`);
  s += `<path d="M${x + 40} ${pata - 40} C${x + 90} ${pata - 160} ${x + 130} ${y + 180} ${x + 230} ${y + 130}" stroke="#4A3326" stroke-width="10" fill="none" stroke-linecap="round"/>`;
  for (const [bx, by, rx] of [[x + 120, y + 190, 44], [x + 200, y + 140, 50], [x + 260, y + 120, 36], [x + 90, y + 250, 34]] as [number, number, number][]) {
    s += elipsa(bx, by, rx, rx * 0.42, `fill="#3F6B57"`) + elipsa(bx - 6, by - 4, rx * 0.66, rx * 0.24, `fill="#6E9A84"`);
  }
  return s;
}

/** Kulaté okno (marumado) s bambusovou mřížkou a větví sakury */
function kulateOkno(cx: number, id: string) {
  const cy = 420;
  const r = 130;
  let s = kruh(cx, cy, r + 16, `fill="${U.lakSvetly}"`) + kruh(cx, cy, r, `fill="#CFE0EE"`);
  s += `<clipPath id="${id}-opar"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath><path clip-path="url(#${id}-opar)" d="M${cx - r} ${cy + 40} Q${cx} ${cy + 10} ${cx + r} ${cy + 50} V${cy + r} H${cx - r} Z" fill="#E8EEF2" opacity="0.7"/>`;
  s += `<path d="M${cx - r + 10} ${cy - 70} C${cx - 40} ${cy - 50} ${cx} ${cy - 90} ${cx + 60} ${cy - 60}" stroke="#4A3326" stroke-width="7" fill="none" stroke-linecap="round"/>`;
  const r2 = nahoda(55);
  for (let i = 0; i < 14; i++) {
    const t = r2();
    const bx = cx - r + 20 + t * 170;
    const by = cy - 70 - Math.sin(t * Math.PI) * 18 + (r2() - 0.5) * 30;
    s += kruh(bx, by, 7 + r2() * 4, `fill="${r2() < 0.5 ? "#F2B5C4" : "#FBD3DC"}"`);
  }
  let mriz = "";
  for (let i = -2; i <= 2; i++) mriz += `M${f(cx + i * 50)} ${f(cy - r)}V${f(cy + r)}`;
  mriz += `M${f(cx - r)} ${f(cy)}H${f(cx + r)}`;
  s += `<clipPath id="${id}-okno"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath><g clip-path="url(#${id}-okno)"><path d="${mriz}" stroke="#B7A76C" stroke-width="5"/></g>`;
  s += kruh(cx, cy, r, `fill="none" stroke="${U.lakTma}" stroke-width="5"`);
  return s;
}

/* ════════════════════ Vitrína: tvorba ════════════════════ */

/** Stříška z tašek nad vitrínou (jako střecha krámku, jen malá) */
function striska(g: Geometrie, id: string) {
  const v = g.vitrina;
  const dole = g.ramNahore + 2;
  const nahore = dole - 62;
  const x0 = v.x - 34;
  const x1 = v.x + v.w + 34;
  let defs = `<pattern id="${id}-tasky" patternUnits="userSpaceOnUse" x="${f(x0)}" y="${f(nahore)}" width="28" height="14">
    <rect width="28" height="14" fill="${P.taska}"/>
    <rect y="11.6" width="28" height="2.4" fill="${P.taskaTma}"/>
    <path d="M7 0 H20 V11 Q13.5 14.4 7 11 Z" fill="#7489A6"/>
    <path d="M7 0 H12.6 V12.6 Q9.6 12.4 7 11 Z" fill="${P.taskaSvetla}"/>
    <rect x="19.6" width="1.2" height="12" fill="${P.taskaHrana}" opacity="0.55"/>
  </pattern>`;
  let s = mnohouhelnik([[x0 + 18, nahore], [x1 - 18, nahore], [x1, dole], [x0, dole]], `fill="url(#${id}-tasky)"`);
  s += obdelnik(x0 + 10, nahore - 8, x1 - x0 - 20, 10, `rx="4" fill="${P.taskaTma}"`) + obdelnik(x0 + 10, nahore - 8, x1 - x0 - 20, 3, `rx="2" fill="${P.taskaSvetla}" opacity="0.7"`);
  s += mnohouhelnik([[x0 + 18, nahore], [x1 - 18, nahore], [x1 - 4, nahore + 14], [x0 + 4, nahore + 14]], `fill="${P.bila}" opacity="0.08"`);
  // čela tašek podél okapu
  let cela = "";
  for (let x = x0 + 10; x <= x1 - 10; x += 22) cela += `<circle cx="${f(x)}" cy="${f(dole)}" r="8"/>`;
  s += `<g fill="${P.taskaHrana}">${cela}</g>`;
  let cela2 = "";
  for (let x = x0 + 10; x <= x1 - 10; x += 22) cela2 += `<circle cx="${f(x - 0.4)}" cy="${f(dole - 0.4)}" r="6"/>`;
  s += `<g fill="#7D92AD">${cela2}</g>`;
  // krokve pod okapem
  let krokve = "";
  for (let x = v.x + 16; x < v.x + v.w - 16; x += 46) krokve += `M${f(x)} ${f(dole + 8)}h12v10h-12z`;
  s += `<path d="${krokve}" fill="${P.drevoTma}"/>`;
  return { defs, s };
}

function vitrinaDilna(g: Geometrie, id: string) {
  const v = g.vitrina;
  const vn = g.vnitrek;
  const ram = g.ram;
  let defs = `<linearGradient id="${id}-svetlo-shora" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE8C0" stop-opacity="0.75"/><stop offset="0.4" stop-color="#FFE8C0" stop-opacity="0.15"/><stop offset="1" stop-color="${P.drevoTma2}" stop-opacity="0.12"/></linearGradient>`;
  defs += `<linearGradient id="${id}-stin-police" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.drevoTma2}" stop-opacity="0.22"/><stop offset="1" stop-color="${P.drevoTma2}" stop-opacity="0"/></linearGradient>`;
  let s = "";
  // stín na podlaze a nožičky (zadní tmavší a výš)
  s += elipsa(v.x + v.w / 2 + 14, g.pata - 2, v.w / 2 + 30, 16, `fill="${P.inkoust}" opacity="0.24"`);
  s += obdelniky([[v.x + 46, g.pata - 40, 20, 26], [v.x + v.w - 66, g.pata - 40, 20, 26]], `fill="${P.drevoTma2}"`);
  s += obdelniky([[v.x + 12, g.pata - 26, 26, 26], [v.x + v.w - 38, g.pata - 26, 26, 26]], `fill="${U.vitrinaTma}"`);
  s += obdelniky([[v.x + 12, g.pata - 26, 5, 26], [v.x + v.w - 38, g.pata - 26, 5, 26]], `fill="${U.vitrinaSvetla}"`);
  // spodek se šuplíky
  const sp = g.spodek;
  s += obdelnik(v.x + 4, sp, v.w - 8, g.spodekH, `fill="${U.vitrina}"`);
  s += obdelnik(v.x + 4, sp + g.spodekH - 6, v.w - 8, 6, `fill="${U.vitrinaTma}"`);
  const supliku = g.rozvrzeni === "siroka" ? 3 : 2;
  const sw = (v.w - 8 - 2 * 16 - (supliku - 1) * 12) / supliku;
  const stitky = ["釉", "土", "筆"];
  for (let i = 0; i < supliku; i++) {
    const sx = v.x + 20 + i * (sw + 12);
    const sy = sp + 12;
    const sh = g.spodekH - 28;
    s += obdelnik(sx, sy, sw, sh, `rx="3" fill="${U.vitrinaSvetla}"`);
    s += obdelnik(sx, sy + sh - 4, sw, 4, `fill="${U.vitrinaTma}" opacity="0.7"`) + obdelnik(sx, sy, sw, 2.4, `fill="${U.vitrinaHrana}"`);
    // železná úchytka do půlkruhu
    const ux = sx + sw / 2;
    const uy = sy + sh / 2;
    s += obdelnik(ux - 30, uy - 7, 60, 10, `rx="3" fill="${P.drevoTma2}"`) + `<path d="M${f(ux - 22)} ${f(uy + 2)} Q${f(ux)} ${f(uy + 16)} ${f(ux + 22)} ${f(uy + 2)}" stroke="${P.inkoust}" stroke-width="3.6" fill="none"/>`;
    // papírový štítek
    s += obdelnik(sx + 14, uy - 13, 26, 26, `fill="${P.papir}"`) + napis(sx + 27, uy + 7, stitky[i], 18, PISMO.kanji, `text-anchor="middle" fill="${P.inkoust}"`);
  }
  // rám (bočnice a horní/dolní příčka)
  s += obdelnik(v.x, g.ramNahore, v.w, sp - g.ramNahore, `fill="${U.vitrina}"`);
  s += obdelnik(v.x, g.ramNahore, 6, sp - g.ramNahore + g.spodekH, `fill="${U.vitrinaHrana}" opacity="0.8"`);
  s += obdelnik(v.x + v.w - 8, g.ramNahore, 8, sp - g.ramNahore + g.spodekH, `fill="${U.vitrinaTma}"`);
  s += obdelnik(v.x, sp - 4, v.w, 6, `fill="${U.vitrinaTma}"`);
  // vnitřek: zadní stěna ze svislých prken, mezi kusy světlejší lišty, světlo lampy shora
  s += obdelnik(vn.x, vn.y, vn.w, vn.h, `fill="${U.zadStena}"`);
  let prkna = "";
  for (let x = vn.x + 40; x < vn.x + vn.w - 10; x += 40) prkna += `M${f(x)} ${f(vn.y)}V${f(vn.y + vn.h)}`;
  s += `<path d="${prkna}" stroke="${U.zadStenaSpara}" stroke-width="1.6" opacity="0.7"/>`;
  let listy = "";
  for (let c = 1; c < g.sloupce; c++) listy += `M${f(vn.x + c * g.slot - 4)} ${f(vn.y)}h8v${f(vn.h)}h-8z`;
  s += `<path d="${listy}" fill="${U.zadStenaSvetla}"/>`;
  s += obdelnik(vn.x, vn.y, vn.w, vn.h, `fill="url(#${id}-svetlo-shora)"`);
  s += obdelnik(vn.x, vn.y, vn.w, 22, `fill="${P.drevoTma2}" opacity="0.18"`);
  s += obdelnik(vn.x, vn.y, 10, vn.h, `fill="${P.drevoTma2}" opacity="0.12"`) + obdelnik(vn.x + vn.w - 10, vn.y, 10, vn.h, `fill="${P.drevoTma2}" opacity="0.12"`);
  // police: stín na stěně pod nimi, horní plocha, přední hrana
  for (const y of g.police) {
    s += obdelnik(vn.x, y + 18, vn.w, 30, `fill="url(#${id}-stin-police)"`);
    s += obdelnik(vn.x, y - 7, vn.w, 7, `fill="${U.policeVrch}"`);
    s += obdelnik(vn.x, y, vn.w, 18, `fill="${U.policeCelo}"`) + obdelnik(vn.x, y, vn.w, 2, `fill="#F0D2A6"`) + obdelnik(vn.x, y + 15, vn.w, 3, `fill="${U.vitrinaTma}"`);
  }
  // stříška a štít
  const st = striska(g, id);
  defs += st.defs;
  s += st.s;
  const t = g.stit;
  s += obdelnik(t.x + 5, t.y + 7, t.w, t.h, `rx="7" fill="${P.inkoust}" opacity="0.3"`);
  s += obdelnik(t.x, t.y, t.w, t.h, `rx="7" fill="#5E3D26"`);
  s += obdelnik(t.x + 5, t.y + 5, t.w - 10, t.h - 10, `rx="4" fill="#4A2F1D"`);
  s += obdelnik(t.x + 5, t.y + 5, t.w - 10, 3, `rx="2" fill="${P.drevo}"`);
  s += kruhy([[t.x + 14, t.y + 14, 3], [t.x + t.w - 14, t.y + 14, 3], [t.x + 14, t.y + t.h - 14, 3], [t.x + t.w - 14, t.y + t.h - 14, 3]], `fill="${U.mosaz}"`);
  return { defs, s };
}

/** Lampion pod okapem stříšky */
function lampionMaly(cx: number, y: number) {
  let s = cara(cx, y, cx, y + 12, `stroke="${P.inkoust}" stroke-width="2"`);
  s += obdelnik(cx - 12, y + 12, 24, 9, `rx="3" fill="${P.inkoust}"`);
  s += `<path d="M${cx - 12} ${y + 21} C${cx - 34} ${y + 30} ${cx - 34} ${y + 82} ${cx - 12} ${y + 92} H${cx + 12} C${cx + 34} ${y + 82} ${cx + 34} ${y + 30} ${cx + 12} ${y + 21} Z" fill="${P.lampion}"/>`;
  s += `<path d="M${cx - 12} ${y + 21} C${cx - 26} ${y + 34} ${cx - 26} ${y + 80} ${cx - 12} ${y + 92} C${cx - 18} ${y + 78} ${cx - 18} ${y + 36} ${cx - 8} ${y + 21} Z" fill="${P.lampionTma}"/>`;
  s += `<path d="M${cx + 16} ${y + 28} C${cx + 24} ${y + 40} ${cx + 25} ${y + 70} ${cx + 18} ${y + 84}" stroke="${P.lampionSvetly}" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.7"/>`;
  let zebra = "";
  for (let i = 1; i < 6; i++) {
    const yy = y + 21 + i * 11.8;
    const t = Math.sin((i / 6) * Math.PI);
    zebra += `M${f(cx - 12 - 20 * t)} ${f(yy)} Q${cx} ${f(yy + 4)} ${f(cx + 12 + 20 * t)} ${f(yy)}`;
  }
  s += `<path d="${zebra}" stroke="${P.rumelkaTma}" stroke-width="1.2" fill="none" opacity="0.55"/>`;
  s += napis(cx, y + 66, "手", 24, PISMO.kanji, `text-anchor="middle" fill="${P.inkoust}"`);
  s += obdelnik(cx - 12, y + 92, 24, 8, `rx="3" fill="${P.inkoust}"`);
  s += cara(cx, y + 100, cx, y + 116, `stroke="${U.mosaz}" stroke-width="3.4" stroke-linecap="round"`);
  return `<g class="uv-houpe">${s}</g>`;
}

/** Skleněný zvonek fúrin s papírkem 涼 */
function furin(cx: number, y: number) {
  let s = cara(cx, y, cx, y + 10, `stroke="${P.inkoust}" stroke-width="1.6"`);
  s += `<path d="M${cx - 17} ${y + 42} C${cx - 17} ${y + 20} ${cx - 9} ${y + 10} ${cx} ${y + 10} C${cx + 9} ${y + 10} ${cx + 17} ${y + 20} ${cx + 17} ${y + 42} Z" fill="#D7ECF2"/>`;
  s += `<path d="M${cx - 15} ${y + 33} Q${cx} ${y + 27} ${cx + 15} ${y + 33}" stroke="${P.rumelka}" stroke-width="3" fill="none"/>`;
  s += `<path d="M${cx - 11} ${y + 38} C${cx - 11} ${y + 25} ${cx - 7} ${y + 17} ${cx - 3} ${y + 15}" stroke="#FFFFFF" stroke-width="2.4" fill="none" stroke-linecap="round" opacity="0.9"/>`;
  s += cara(cx, y + 42, cx, y + 66, `stroke="${P.inkoust}" stroke-width="1.2"`);
  s += obdelnik(cx - 10, y + 66, 20, 54, `rx="1.5" fill="${P.papir}"`) + napis(cx, y + 100, "涼", 15, PISMO.kanji, `text-anchor="middle" fill="#2E4A78"`);
  return `<g class="uv-houpe uv-houpe-rychle">${s}</g>`;
}

/** Noren u vchodu — dva kraje vpředu, jako by člověk zrovna prošel dovnitř */
function norenVpredu(x: number, w: number, znak: string) {
  const dole = 300;
  let s = obdelnik(x, 76, w, dole - 76, `fill="${P.indigo}"`);
  s += obdelnik(x + 10, 90, 12, dole - 100, `fill="#3B4E8E" opacity="0.8"`) + obdelnik(x + w - 14, 90, 14, dole - 100, `fill="${P.indigoTma}"`);
  s += obdelnik(x, dole - 20, w, 3, `fill="#F4F1EA" opacity="0.9"`);
  s += napis(x + w / 2, dole - 46, znak, 62, PISMO.kanji, `text-anchor="middle" fill="#F4F1EA"`);
  return `<g class="uv-noren">${s}</g>`;
}

function skloDilna(g: Geometrie, id: string) {
  const vn = g.vnitrek;
  const pul = vn.x + vn.w / 2;
  const tabule: Obdelnik[] = [
    { x: vn.x, y: vn.y, w: pul + 7 - vn.x, h: vn.h },
    { x: pul - 7, y: vn.y, w: vn.x + vn.w - pul + 7, h: vn.h },
  ];
  let defs = "";
  let s = "";
  tabule.forEach((t, i) => {
    defs += `<clipPath id="${id}-sklo-${i}"><rect x="${f(t.x)}" y="${f(t.y)}" width="${f(t.w)}" height="${f(t.h)}"/></clipPath>`;
    // odlesky: šikmé pruhy
    const a = t.x + t.w * (i ? 0.55 : 0.68);
    const sklon = t.h * 0.42;
    s += `<g clip-path="url(#${id}-sklo-${i})">`;
    s += mnohouhelnik([[a, t.y], [a + 46, t.y], [a + 46 - sklon, t.y + t.h], [a - sklon, t.y + t.h]], `fill="${U.sklo}" opacity="0.16"`);
    s += mnohouhelnik([[a + 66, t.y], [a + 76, t.y], [a + 76 - sklon, t.y + t.h], [a + 66 - sklon, t.y + t.h]], `fill="${U.sklo}" opacity="0.12"`);
    s += mnohouhelnik([[t.x, t.y + t.h * 0.82], [t.x + t.w * 0.3, t.y + t.h], [t.x, t.y + t.h]], `fill="${U.sklo}" opacity="0.06"`);
    s += `</g>`;
    // rámeček křídla
    s += `<path d="M${f(t.x)} ${f(t.y)}h${f(t.w)}v${f(t.h)}h${f(-t.w)}z M${f(t.x + 12)} ${f(t.y + 12)}v${f(t.h - 24)}h${f(t.w - 24)}v${f(-t.h + 24)}z" fill="${U.ramSkla}" fill-rule="evenodd"/>`;
    s += obdelnik(t.x, t.y, t.w, 2, `fill="${U.vitrinaHrana}"`) + obdelnik(t.x + 12, t.y + t.h - 12, t.w - 24, 2, `fill="${U.vitrinaTma}" opacity="0.6"`);
  });
  // úchytky hikite na střední příčce
  for (const ux of [pul - 14, pul + 14]) s += kruh(ux, vn.y + vn.h * 0.5, 7, `fill="${U.mosaz}"`) + kruh(ux, vn.y + vn.h * 0.5, 4, `fill="${P.drevoTma2}"`);
  return { defs, s };
}

/* ════════════════════ Vitrína: Japonsko ════════════════════ */

function vitrinaJaponsko(g: Geometrie, id: string) {
  const v = g.vitrina;
  const vn = g.vnitrek;
  let defs = `<pattern id="${id}-pruhy" patternUnits="userSpaceOnUse" width="28" height="28" patternTransform="rotate(45)"><rect width="28" height="28" fill="${P.papir}"/><rect width="10" height="28" fill="${P.rumelka}"/><rect x="14" width="10" height="28" fill="#2E4A78"/></pattern>`;
  defs += `<radialGradient id="${id}-reflektor" cx="0.5" cy="0" r="0.9"><stop offset="0" stop-color="#FFE7B8" stop-opacity="0.34"/><stop offset="0.6" stop-color="#FFE7B8" stop-opacity="0.06"/><stop offset="1" stop-color="#FFE7B8" stop-opacity="0"/></radialGradient>`;
  let s = "";
  // stín, kočičí nožky
  s += elipsa(v.x + v.w / 2 + 14, g.pata - 2, v.w / 2 + 30, 16, `fill="${P.inkoust}" opacity="0.3"`);
  for (const [nx, smer] of [[v.x + 30, -1], [v.x + v.w - 30, 1]] as [number, number][]) {
    s += `<path d="M${f(nx - 14)} ${f(g.pata - 28)} H${f(nx + 14)} C${f(nx + 12)} ${f(g.pata - 14)} ${f(nx + 8 + smer * 10)} ${f(g.pata - 6)} ${f(nx + smer * 18)} ${f(g.pata)} H${f(nx - smer * 6)} C${f(nx - 6)} ${f(g.pata - 10)} ${f(nx - 12)} ${f(g.pata - 18)} ${f(nx - 14)} ${f(g.pata - 28)} Z" fill="${U.lakSvetly}"/>`;
    s += kruh(nx + smer * 14, g.pata - 3, 4, `fill="${U.mosaz}"`);
  }
  // spodek se šuplíkem a mosazným držadlem
  const sp = g.spodek;
  s += obdelnik(v.x + 4, sp, v.w - 8, g.spodekH, `fill="${U.lak}"`);
  s += obdelnik(v.x + 22, sp + 12, v.w - 44, g.spodekH - 26, `rx="3" fill="${U.lakSvetly}"`);
  s += obdelnik(v.x + 22, sp + 12, v.w - 44, 2, `fill="${U.lakHrana}"`);
  const ux = v.x + v.w / 2;
  const uy = sp + g.spodekH / 2 - 1;
  s += obdelniky([[ux - 46, uy - 9, 14, 18], [ux + 32, uy - 9, 14, 18]], `rx="3" fill="${U.mosazTma}"`);
  s += obdelnik(ux - 40, uy - 3, 80, 7, `rx="3.5" fill="${U.mosaz}"`) + obdelnik(ux - 38, uy - 3, 76, 2, `rx="1" fill="${U.mosazSvetla}"`);
  // korpus a zlatá linka
  s += obdelnik(v.x, g.ramNahore, v.w, sp - g.ramNahore + 4, `fill="${U.lak}"`);
  s += obdelnik(v.x, g.ramNahore, 6, sp - g.ramNahore + g.spodekH, `fill="${U.lakHrana}" opacity="0.9"`);
  s += obdelnik(v.x + v.w - 8, g.ramNahore, 8, sp - g.ramNahore + g.spodekH, `fill="${U.lakTma}"`);
  s += `<rect x="${f(v.x + 10)}" y="${f(g.ramNahore + 10)}" width="${f(v.w - 20)}" height="${f(sp - g.ramNahore - 14)}" fill="none" stroke="${U.mosaz}" stroke-width="1.6" opacity="0.8"/>`;
  // vnitřek: tmavý lak a reflektor nad každým výklenkem
  s += obdelnik(vn.x, vn.y, vn.w, vn.h, `fill="${U.lakVnitrek}"`);
  s += obdelnik(vn.x, vn.y, vn.w, 26, `fill="#000000" opacity="0.3"`);
  for (const k of g.kusy) s += elipsa(k.x + k.w / 2, k.y - 10, g.slot * 0.62, k.h * 0.9, `fill="url(#${id}-reflektor)"`);
  // výklenky (fotka je přes ně) a římsičky pod nimi
  for (const k of g.kusy) s += `<path d="${oblouk(k)}" fill="#0F0A08"/>`;
  for (const y of g.police) {
    s += obdelnik(vn.x, y - 5, vn.w, 5, `fill="${U.lakHrana}"`);
    s += obdelnik(vn.x, y, vn.w, 16, `fill="${U.lakSvetly}"`) + obdelnik(vn.x, y + 2, vn.w, 1.8, `fill="${U.mosaz}"`) + obdelnik(vn.x, y + 16, vn.w, 22, `fill="#000000" opacity="0.25"`);
  }
  // římsa nahoře s rozetami
  const rx0 = v.x - 26;
  const rw = v.w + 52;
  const ry = g.ramNahore - 36;
  s += obdelnik(rx0, ry, rw, 38, `rx="6" fill="${U.lakSvetly}"`);
  s += obdelnik(rx0, ry, rw, 3, `rx="2" fill="${U.lakHrana}"`) + obdelnik(rx0, ry + 30, rw, 4, `fill="${U.mosaz}"`) + obdelnik(rx0, ry + 34, rw, 4, `fill="${U.lakTma}"`);
  for (const rx of [rx0 + 18, rx0 + rw - 18]) s += kruh(rx, ry + 15, 8, `fill="${U.mosaz}"`) + kruh(rx, ry + 15, 5, `fill="${U.mosazSvetla}"`) + kruh(rx, ry + 15, 2.4, `fill="${U.mosazTma}"`);
  // na římse: krabice z paulovnie a bonsaj
  const kx = v.x + (g.rozvrzeni === "siroka" ? 70 : 34);
  s += krabicka(kx, ry, 120, 40, U.snura) + krabicka(kx + 16, ry - 40, 88, 34, U.snura2, "萩焼") + masle(kx + 16 + 88 * 0.46 + 1.8, ry - 74, U.snura2);
  const bx = v.x + v.w - (g.rozvrzeni === "siroka" ? 130 : 96);
  s += bonsaj(bx, ry);
  // štítek letecké pošty
  const t = g.stit;
  s += obdelnik(t.x + 5, t.y + 7, t.w, t.h, `rx="5" fill="${P.inkoust}" opacity="0.35"`);
  s += obdelnik(t.x, t.y, t.w, t.h, `rx="5" fill="url(#${id}-pruhy)"`);
  s += obdelnik(t.x + 9, t.y + 9, t.w - 18, t.h - 18, `rx="2" fill="${P.papir}"`);
  return { defs, s };
}

function bonsaj(cx: number, pata: number) {
  let s = `<path d="M${cx - 50} ${pata - 26} H${cx + 50} L${cx + 42} ${pata} H${cx - 42} Z" fill="${U.seladonTma}"/>`;
  s += obdelnik(cx - 54, pata - 32, 108, 8, `rx="3" fill="${U.seladon}"`) + obdelnik(cx - 54, pata - 32, 108, 2.4, `fill="${U.seladonSvetly}"`);
  s += `<path d="M${cx - 4} ${pata - 32} C${cx - 8} ${pata - 52} ${cx - 26} ${pata - 58} ${cx - 18} ${pata - 76} C${cx - 12} ${pata - 88} ${cx + 2} ${pata - 90} ${cx + 4} ${pata - 104} M${cx - 16} ${pata - 70} C${cx - 30} ${pata - 74} ${cx - 40} ${pata - 70} ${cx - 48} ${pata - 78} M${cx + 2} ${pata - 92} C${cx + 14} ${pata - 96} ${cx + 26} ${pata - 92} ${cx + 34} ${pata - 98}" stroke="#4A3326" stroke-width="6" fill="none" stroke-linecap="round"/>`;
  for (const [x, y, r] of [[cx + 4, pata - 112, 26], [cx - 50, pata - 84, 22], [cx + 38, pata - 104, 20]] as [number, number, number][]) {
    s += elipsa(x, y, r, r * 0.5, `fill="#5E7C4F"`) + elipsa(x - 3, y - 4, r * 0.66, r * 0.28, `fill="#7FA06A"`);
  }
  return s;
}

function skloJaponsko(g: Geometrie, id: string) {
  const vn = g.vnitrek;
  let defs = `<clipPath id="${id}-sklo"><rect x="${f(vn.x)}" y="${f(vn.y)}" width="${f(vn.w)}" height="${f(vn.h)}"/></clipPath>`;
  let s = "";
  // rámy výklenků: lak a zlatý proužek kolem oblouku
  for (const k of g.kusy) {
    s += `<path d="${oblouk(k)}" fill="none" stroke="${U.lakSvetly}" stroke-width="9"/>`;
    s += `<path d="${oblouk({ x: k.x - 5, y: k.y - 5, w: k.w + 10, h: k.h + 5 })}" fill="none" stroke="${U.mosaz}" stroke-width="2.4"/>`;
  }
  // odlesky na skle
  const sklon = vn.h * 0.5;
  const a = vn.x + vn.w * 0.3;
  s += `<g clip-path="url(#${id}-sklo)">`;
  s += mnohouhelnik([[a, vn.y], [a + 60, vn.y], [a + 60 - sklon, vn.y + vn.h], [a - sklon, vn.y + vn.h]], `fill="${U.sklo}" opacity="0.1"`);
  s += mnohouhelnik([[a + 86, vn.y], [a + 98, vn.y], [a + 98 - sklon, vn.y + vn.h], [a + 86 - sklon, vn.y + vn.h]], `fill="${U.sklo}" opacity="0.08"`);
  const b = vn.x + vn.w * 0.86;
  s += mnohouhelnik([[b, vn.y], [b + 40, vn.y], [b + 40 - sklon, vn.y + vn.h], [b - sklon, vn.y + vn.h]], `fill="${U.sklo}" opacity="0.07"`);
  s += `</g>`;
  s += `<rect x="${f(vn.x + 1)}" y="${f(vn.y + 1)}" width="${f(vn.w - 2)}" height="${f(vn.h - 2)}" fill="none" stroke="${U.mosaz}" stroke-width="2.4"/>`;
  // mosazné rohy na korpusu
  const v = g.vitrina;
  const rohy: [number, number, number, number][] = [
    [v.x + 6, g.ramNahore + 6, 1, 1],
    [v.x + v.w - 6, g.ramNahore + 6, -1, 1],
    [v.x + 6, g.spodek - 2, 1, -1],
    [v.x + v.w - 6, g.spodek - 2, -1, -1],
  ];
  for (const [x, y, sx, sy] of rohy) {
    s += `<path d="M${f(x)} ${f(y)} h${f(sx * 40)} v${f(sy * 8)} h${f(-sx * 32)} v${f(sy * 32)} h${f(-sx * 8)} z" fill="${U.mosaz}"/>`;
    s += `<path d="M${f(x)} ${f(y)} h${f(sx * 40)} v${f(sy * 2)} h${f(-sx * 38)} v${f(sy * 38)} h${f(-sx * 2)} z" fill="${U.mosazSvetla}" opacity="0.7"/>`;
    s += kruhy([[x + sx * 30, y + sy * 4, 1.8], [x + sx * 4, y + sy * 30, 1.8], [x + sx * 4, y + sy * 4, 1.8]], `fill="${U.mosazTma}"`);
  }
  return { defs, s };
}

/* ════════════════════ Složení ════════════════════ */

export interface Stena {
  g: Geometrie;
  /** viewBox celé kresby (i s kusy za kraji jádra) */
  viewBox: string;
  zadni: string;
  predni: string;
}

export function stena(cast: Cast, rozvrzeni: Rozvrzeni, n: number): Stena {
  const g = geometrie(cast, rozvrzeni, n);
  const id = `uv-${cast === "dilna" ? "d" : "j"}${rozvrzeni === "siroka" ? "s" : "u"}`;
  const siroka = rozvrzeni === "siroka";
  const pk = pokoj(g, id);
  let defs = pk.defs;
  let zadni = pk.s;
  let predni = "";

  if (cast === "dilna") {
    // věci kolem: na širokém monitoru i za kraji jádra
    if (siroka) {
      zadni += dvereDilna(-500, g);
      zadni += regalPrezahy(1560, g);
      zadni += kalendar(1252, 372);
      zadni += policka(46, 430);
      zadni += bambus(112, g.podlaha + 34, 480);
      zadni += stolicka(1290, g.podlaha + 30);
    } else {
      zadni += bambus(-120, g.podlaha + 34, 520);
      zadni += stolicka(690, g.podlaha + 30);
    }
    for (const lx of g.lampy) zadni += lampa(lx);
    const v = vitrinaDilna(g, id);
    defs += v.defs;
    zadni += v.s;
    // před kusy: sklo, provázky cedulek, lampion a fúrin pod okapem, noren u vchodu
    const sk = skloDilna(g, id);
    defs += sk.defs;
    let provazky = "";
    g.cedulky.forEach((c, i) => {
      const police = g.police[Math.floor(i / g.sloupce)];
      for (const x of [c.x + c.w * 0.26, c.x + c.w * 0.74]) provazky += `M${f(x)} ${f(police + 16)}V${f(c.y + 8)}`;
    });
    predni += `<path d="${provazky}" stroke="${P.drevoTma2}" stroke-width="1.6" opacity="0.6"/>`;
    predni += sk.s;
    predni += lampionMaly(g.vitrina.x - 18, g.ramNahore + 8) + furin(g.vitrina.x + g.vitrina.w + 18, g.ramNahore + 8);
    if (siroka) predni += norenVpredu(-40, 170, "ジ") + norenVpredu(g.W - 130, 170, "作");
  } else {
    if (siroka) {
      zadni += paravan(-520, g);
      zadni += kulateOkno(1700, id);
      zadni += svitekJ(1300, 236, 360);
      zadni += pohlednice(46, 320);
      zadni += krabiceNaZemi(110, g.podlaha + 34);
      zadni += bedna(1290, g.podlaha + 32, id);
    } else {
      zadni += krabiceNaZemi(-130, g.podlaha + 34);
      zadni += bedna(690, g.podlaha + 32, id);
    }
    for (const lx of g.lampy) zadni += lucerna(lx);
    const v = vitrinaJaponsko(g, id);
    defs += v.defs;
    zadni += v.s;
    const sk = skloJaponsko(g, id);
    defs += sk.defs;
    predni += sk.s;
  }

  return {
    g,
    viewBox: `${-g.ext} 0 ${g.W + 2 * g.ext} ${g.H}`,
    zadni: `<defs>${defs}</defs>${zadni}`,
    predni,
  };
}

/** Pro náhledy a písmo: všechny znaky, které kresba píše */
export const ZNAKY_KRESBY = "工房月一期一会萬古萩焼航空便ワレモノ器手涼釉土筆ジ作";
export type { Bod };
