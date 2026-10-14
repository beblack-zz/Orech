/**
 * Kresba úrovně 八 Oheň — Pálicí křivka (Ohen.astro, hraje scripts/zkouska/urovne/ohen.ts).
 *
 * Dílna od rána do rána. Vlevo elektrická pec s dvířky (ta jsou HTML nad
 * kresbou, aby se dala otevřít ve 3D), na ní sedí Pecinka a na peci visí
 * shimenawa. Ovládací panel má zelený sedmisegmentový displej a sloupec
 * výkonu. Nad pecí lupa: pohled špehýrkou dovnitř, kde se v žáru ohýbají
 * tři žároměrky. Za pecí okno — obloha jde od svítání přes den a večer do
 * noci a zase k ránu. Vpravo zapisovač: milimetrový papír s natištěným
 * pásem křivky, po kterém jezdí pero a kreslí skutečnou teplotu.
 *
 * Čisté funkce bez DOM — stejné kreslení používá Astro při buildu i hra
 * v prohlížeči (pozice grafu, barva žáru, ohyb žároměrky, segmenty
 * displeje). Všechna id začínají `mo8-`.
 */
import { krivka, zaromerky } from "../../../data/kami";

export const SIRKA = 800;
export const VYSKA = 560;
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
  const u = Math.min(1, Math.max(0, t));
  return `#${A.map((v, i) => Math.round(v + (B[i] - v) * u).toString(16).padStart(2, "0")).join("")}`;
};

/** Barva žáru podle teploty — jak ji hrnčíř vidí špehýrkou: tma, třešeň, oranž, žlutá, skoro bílá */
const ZAR: [number, string][] = [
  [0, "#2A1A14"], [400, "#2E150D"], [520, "#4A1408"], [600, "#6E1A0A"], [700, "#9A220C"], [800, "#C2300F"],
  [900, "#DE4A14"], [1000, "#F06E1C"], [1100, "#F99430"], [1200, "#FFC250"], [1260, "#FFE08A"], [1320, "#FFF6D2"],
];
export function barvaZaru(T: number) {
  let i = 0;
  while (i < ZAR.length - 2 && ZAR[i + 1][0] <= T) i++;
  const [t0, a] = ZAR[i];
  const [t1, b] = ZAR[i + 1];
  return smichej(a, b, (T - t0) / (t1 - t0));
}
/** Jak moc pec svítí: pod 450 °C nic, nahoře naplno */
export const zhava = (T: number) => Math.min(1, Math.max(0, (T - 450) / 800));

/**
 * Obloha v oknu podle hodiny (0–24): nahoře, uprostřed, u obzoru.
 * Ráno začíná v šest za svítání, výpal končí odpoledne, chladne se přes
 * noc a pec se otvírá další ráno.
 */
const NEBE: [number, string, string, string][] = [
  [0, "#0B1030", "#161C44", "#2A2A58"],
  [4.6, "#10163A", "#1E2550", "#3B3566"],
  [5.6, "#1D2558", "#4A4A86", "#A87890"],
  [6.3, "#3A4C8E", "#9C8CB8", "#F4B08C"],
  [7.3, "#5F86C6", "#B9B6D2", "#FAD2A6"],
  [9, "#6E9FD6", "#A9CBEB", "#E8EEEA"],
  [13, "#5E97D6", "#9CC6EC", "#DCEBF2"],
  [16.2, "#6E98CF", "#B5CBE2", "#F2DCC0"],
  [17.6, "#6E7FBF", "#E3B7A0", "#F7B072"],
  [18.4, "#4A4A8A", "#C9789A", "#F28C5A"],
  [19.2, "#232A62", "#4E4682", "#9A5E7E"],
  [20.5, "#0E1436", "#1A2048", "#2E2D5C"],
  [24, "#0B1030", "#161C44", "#2A2A58"],
];
export function nebe(hodina: number): [string, string, string] {
  const t = ((hodina % 24) + 24) % 24;
  let i = 0;
  while (i < NEBE.length - 2 && NEBE[i + 1][0] <= t) i++;
  const a = NEBE[i];
  const b = NEBE[i + 1];
  const u = (t - a[0]) / (b[0] - a[0]);
  return [smichej(a[1], b[1], u), smichej(a[2], b[2], u), smichej(a[3], b[3], u)];
}
/** Kolik je noc: 0 přes den, 1 v hluboké noci */
export function noc(hodina: number) {
  const t = ((hodina % 24) + 24) % 24;
  if (t >= 7.4 && t <= 17.4) return 0;
  if (t > 17.4 && t < 20.4) return (t - 17.4) / 3;
  if (t >= 20.4 || t <= 4.8) return 1;
  return 1 - (t - 4.8) / 2.6;
}

/* ——— Rozvržení ——— */

/** Zapisovač: osa času (0–12 h výpalu, pak noc sražená do úzkého pruhu) a teploty */
export const GRAF = { x0: 412, x12: 716, xNoc: 760, y0: 424, yVrch: 76, tMax: 1400, hNoc: 26 };
export const gx = (h: number) =>
  h <= 12
    ? GRAF.x0 + (Math.max(0, h) / 12) * (GRAF.x12 - GRAF.x0)
    : GRAF.x12 + ((Math.min(h, GRAF.hNoc) - 12) / (GRAF.hNoc - 12)) * (GRAF.xNoc - GRAF.x12);
export const gy = (T: number) => GRAF.y0 - (Math.max(0, Math.min(T, GRAF.tMax)) / GRAF.tMax) * (GRAF.y0 - GRAF.yVrch);
/** Pás kolem křivky a jeho strop — výš už glazura stéká */
export const PAS_KRESBA = 35;
export const STROP = 1310;

/** Pec */
export const PEC = { x: 46, y: 204, w: 288, h: 250 };
/** Dvířka (HTML vrstva nad kresbou) a špehýrka v nich */
export const DVIRKA = { x: 58, y: 216, w: 194, h: 226 };
export const SPEHYRKA = { x: 40, y: 60 };
/** Lupa — pohled špehýrkou */
export const LUPA = { cx: 94, cy: 118, r: 62 };
/** Kde sedí Pecinka (čtverec kresby 180 × 180) */
export const PECINKA = { x: 186, y: 90, s: 122 };
/** Okno (rám); sklo je o 9 dovnitř */
export const OKNO = { x: 198, y: 26, w: 142, h: 150 };

/* ——— Žároměrky ——— */

/**
 * Obrys žároměrky: patka v (x, y), stojí nakloněná o 8°, a jak se ohýbá,
 * střední čára se stáčí do oblouku. Ohyb 0 stojí, 0,5 je hrot vodorovně
 * („do pravého úhlu“), 1 je hrot dole u podložky.
 */
export function zaromerkaD(x: number, y: number, ohyb: number, delka = 36, sirka = 9) {
  const n = 12;
  const celkem = (Math.min(1, Math.max(0, ohyb)) * 172 * Math.PI) / 180;
  let uhel = ((-90 + 8) * Math.PI) / 180;
  let px = x;
  let py = y;
  const stred: [number, number, number][] = [[px, py, uhel]];
  for (let i = 0; i < n; i++) {
    uhel += celkem / n;
    px += Math.cos(uhel - celkem / n / 2) * (delka / n);
    py += Math.sin(uhel - celkem / n / 2) * (delka / n);
    stred.push([px, py, uhel]);
  }
  const L: string[] = [];
  const P: string[] = [];
  stred.forEach(([sx, sy, u], i) => {
    const w = (sirka / 2) * (1 - (i / n) * 0.78);
    const nx = Math.cos(u - Math.PI / 2);
    const ny = Math.sin(u - Math.PI / 2);
    L.push(`${f1(sx + nx * w)} ${f1(sy + ny * w)}`);
    P.push(`${f1(sx - nx * w)} ${f1(sy - ny * w)}`);
  });
  return `M${L.join(" L")} L${P.reverse().join(" L")} Z`;
}

/* ——— Displej ——— */

/** Sedm segmentů: a nahoře, b c vpravo, d dole, e f vlevo, g uprostřed */
export const SEGMENTY: Record<string, string> = {
  "0": "abcdef", "1": "bc", "2": "abged", "3": "abgcd", "4": "fgbc", "5": "afgcd", "6": "afgedc", "7": "abc", "8": "abcdefg", "9": "abcdfg", "-": "g", " ": "",
};
export const SEG_ZAP = "#9BFFB8";
export const SEG_VYP = "#1D3527";
const DISPLEJ = { x: 268, y: 232, cifra: 12.4, mezera: 1.8, vyska: 21 };

function cifra(i: number) {
  const w = DISPLEJ.cifra - 2;
  const h = DISPLEJ.vyska;
  const x = DISPLEJ.x + 3 + i * (DISPLEJ.cifra + DISPLEJ.mezera);
  const y = DISPLEJ.y + 4;
  const t = 2;
  const pul = h / 2;
  const vod = (yy: number) => `${f1(x + t)},${f1(yy)} ${f1(x + t * 1.6)},${f1(yy - t / 2)} ${f1(x + w - t * 1.6)},${f1(yy - t / 2)} ${f1(x + w - t)},${f1(yy)} ${f1(x + w - t * 1.6)},${f1(yy + t / 2)} ${f1(x + t * 1.6)},${f1(yy + t / 2)}`;
  const svis = (xx: number, y0: number, y1: number) => `${f1(xx)},${f1(y0 + t * 0.6)} ${f1(xx + t / 2)},${f1(y0 + t * 1.2)} ${f1(xx + t / 2)},${f1(y1 - t * 1.2)} ${f1(xx)},${f1(y1 - t * 0.6)} ${f1(xx - t / 2)},${f1(y1 - t * 1.2)} ${f1(xx - t / 2)},${f1(y0 + t * 1.2)}`;
  const seg: Record<string, string> = {
    a: vod(y + t / 2),
    g: vod(y + pul),
    d: vod(y + h - t / 2),
    f: svis(x + t / 2, y + t / 2, y + pul),
    b: svis(x + w - t / 2, y + t / 2, y + pul),
    e: svis(x + t / 2, y + pul, y + h - t / 2),
    c: svis(x + w - t / 2, y + pul, y + h - t / 2),
  };
  return Object.entries(seg)
    .map(([k, body]) => `<polygon class="mu-ohen-seg" data-cifra="${i}" data-seg="${k}" points="${body}" fill="${SEG_VYP}"/>`)
    .join("");
}

/* ——— Kousky kresby ——— */

const defs = () => `
<linearGradient id="mo8-zed" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F1E8D8"/><stop offset="0.7" stop-color="#E4D6BF"/><stop offset="1" stop-color="#D6C4A8"/></linearGradient>
<linearGradient id="mo8-podlaha" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9C7652"/><stop offset="1" stop-color="#7A5A3E"/></linearGradient>
<linearGradient id="mo8-nebe" x1="0" y1="0" x2="0" y2="1">
  <stop class="mu-ohen-nebe" data-i="0" offset="0" stop-color="#3A4C8E"/>
  <stop class="mu-ohen-nebe" data-i="1" offset="0.62" stop-color="#9C8CB8"/>
  <stop class="mu-ohen-nebe" data-i="2" offset="1" stop-color="#F4B08C"/>
</linearGradient>
<radialGradient id="mo8-slunce" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#FFF7E0"/><stop offset="0.35" stop-color="#FFE3A8" stop-opacity="0.9"/><stop offset="1" stop-color="#FFC27A" stop-opacity="0"/></radialGradient>
<linearGradient id="mo8-ram" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#A47C56"/><stop offset="1" stop-color="#7A5636"/></linearGradient>
<linearGradient id="mo8-sklo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="0.45" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="0.5" stop-color="#FFFFFF" stop-opacity="0.22"/><stop offset="0.6" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>
<clipPath id="mo8-okno-sklo"><rect x="${OKNO.x + 9}" y="${OKNO.y + 9}" width="${OKNO.w - 18}" height="${OKNO.h - 18}"/></clipPath>
<linearGradient id="mo8-ocel" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7C807F"/><stop offset="0.12" stop-color="#C9CCC8"/><stop offset="0.4" stop-color="#E4E5E1"/><stop offset="0.75" stop-color="#BDC0BC"/><stop offset="1" stop-color="#868A88"/></linearGradient>
<linearGradient id="mo8-ocel-v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EEEFEB"/><stop offset="1" stop-color="#A9ADA9"/></linearGradient>
<linearGradient id="mo8-panel" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#34383A"/><stop offset="0.5" stop-color="#4A4F52"/><stop offset="1" stop-color="#2E3234"/></linearGradient>
<linearGradient id="mo8-komora" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E9DCC6"/><stop offset="1" stop-color="#CDBB9E"/></linearGradient>
<linearGradient id="mo8-samot" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D9C3A0"/><stop offset="1" stop-color="#A88A64"/></linearGradient>
<linearGradient id="mo8-deska" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7A5539"/><stop offset="0.5" stop-color="#5E3F2B"/><stop offset="1" stop-color="#4A3122"/></linearGradient>
<linearGradient id="mo8-papir" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FCF8EC"/><stop offset="1" stop-color="#F3ECD9"/></linearGradient>
<linearGradient id="mo8-mosaz" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F4DB94"/><stop offset="0.45" stop-color="#C99A3E"/><stop offset="1" stop-color="#8A6424"/></linearGradient>
<linearGradient id="mo8-tyc" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8E9496"/><stop offset="0.45" stop-color="#F2F4F2"/><stop offset="1" stop-color="#7E8486"/></linearGradient>
<radialGradient id="mo8-zar-mistnost" cx="0.5" cy="0.5" r="0.5"><stop class="mu-ohen-zar-mistnost-stop" offset="0" stop-color="#FFB050" stop-opacity="0.75"/><stop class="mu-ohen-zar-mistnost-stop" offset="1" stop-color="#FFB050" stop-opacity="0"/></radialGradient>
<radialGradient id="mo8-lampa" cx="0.5" cy="0" r="1"><stop offset="0" stop-color="#FFF2C8" stop-opacity="0.65"/><stop offset="1" stop-color="#FFF2C8" stop-opacity="0"/></radialGradient>
<clipPath id="mo8-graf"><rect x="${GRAF.x0}" y="${GRAF.yVrch - 8}" width="${GRAF.xNoc - GRAF.x0}" height="${GRAF.y0 - GRAF.yVrch + 8}"/></clipPath>
`;

/** Okno: obloha, hvězdy, slunce, měsíc, kopce s ořechem a střechou vesnice */
function okno() {
  const { x, y, w, h } = OKNO;
  const ix = x + 9;
  const iy = y + 9;
  const iw = w - 18;
  const ih = h - 18;
  const hvezdy = [
    [0.12, 0.14, 1.3], [0.3, 0.08, 0.9], [0.52, 0.2, 1.1], [0.7, 0.1, 1.4], [0.88, 0.24, 0.9], [0.2, 0.34, 0.8],
    [0.42, 0.42, 1], [0.62, 0.36, 0.8], [0.8, 0.46, 1.1], [0.94, 0.06, 0.8], [0.06, 0.5, 1], [0.36, 0.24, 0.7],
  ];
  const zem = iy + ih;
  return `
<g class="mu-ohen-okno">
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="url(#mo8-ram)"/>
  <g clip-path="url(#mo8-okno-sklo)">
    <rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" fill="url(#mo8-nebe)"/>
    <g class="mu-ohen-hvezdy" opacity="0" fill="#FFF8E7">
      ${hvezdy.map(([a, b, r]) => `<circle cx="${f1(ix + a * iw)}" cy="${f1(iy + b * ih)}" r="${r}"/>`).join("")}
    </g>
    <g class="mu-ohen-slunce" transform="translate(${ix + 10} ${zem - 20})">
      <circle r="22" fill="url(#mo8-slunce)"/>
      <circle r="8" fill="#FFF3D2"/>
    </g>
    <g class="mu-ohen-mesic" transform="translate(${ix + 20} ${iy + 30})" opacity="0">
      <circle r="13" fill="#FFF6DD" opacity="0.18"/>
      <path d="M2.5 -8.4 A8.8 8.8 0 1 0 8.6 2.2 A7 7 0 1 1 2.5 -8.4 Z" fill="#FFF3D0"/>
    </g>
    <path class="mu-ohen-kopec-1" d="M${ix - 2} ${zem - 34} C${ix + 26} ${zem - 50} ${ix + 52} ${zem - 44} ${ix + 74} ${zem - 38} C${ix + 96} ${zem - 32} ${ix + 112} ${zem - 50} ${ix + iw + 2} ${zem - 42} V${zem + 2} H${ix - 2} Z" fill="#8F8FB4"/>
    <path class="mu-ohen-kopec-2" d="M${ix - 2} ${zem - 18} C${ix + 30} ${zem - 26} ${ix + 70} ${zem - 16} ${ix + iw + 2} ${zem - 24} V${zem + 2} H${ix - 2} Z" fill="#6E7298"/>
    <g class="mu-ohen-strom" fill="#56597E">
      <path d="M${ix + 92} ${zem - 18} L${ix + 92} ${zem - 34} L${ix + 95} ${zem - 34} L${ix + 95} ${zem - 18} Z"/>
      <circle cx="${ix + 93}" cy="${zem - 44}" r="15"/><circle cx="${ix + 82}" cy="${zem - 38}" r="10"/><circle cx="${ix + 105}" cy="${zem - 38}" r="11"/>
      <path d="M${ix + 14} ${zem - 18} L${ix + 14} ${zem - 30} L${ix + 26} ${zem - 39} L${ix + 38} ${zem - 30} L${ix + 38} ${zem - 18} Z"/>
    </g>
    <rect class="mu-ohen-okno-svetlo" x="${ix + 16}" y="${zem - 28}" width="5" height="5" fill="#FFD98A" opacity="0"/>
    <rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" fill="url(#mo8-sklo)"/>
  </g>
  <path d="M${x + w / 2} ${iy} V${iy + ih} M${ix} ${iy + ih * 0.46} H${ix + iw}" stroke="url(#mo8-ram)" stroke-width="6"/>
  <rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" fill="none" stroke="#5E4128" stroke-width="1.5" opacity="0.6"/>
  <rect x="${x - 8}" y="${y + h - 4}" width="${w + 16}" height="9" rx="2" fill="#9A7350"/>
  <path d="M${x - 8} ${y + h + 5} H${x + w + 8}" stroke="#6E5236" stroke-width="2"/>
</g>`;
}

/** Ofuda proti ohni (火廼要慎, „pozor na oheň“) — v japonských kuchyních visí u ohniště */
const ofuda = () => `
<g class="mu-ohen-ofuda" transform="rotate(-2 176 70)">
  <rect x="164" y="24" width="24" height="96" rx="1.5" fill="#FBF6EA" stroke="#CDBFA4" stroke-width="0.8"/>
  <rect x="167" y="27" width="18" height="90" fill="none" stroke="#C4432B" stroke-width="0.7" opacity="0.6"/>
  <g class="mu-ohen-kanji" font-size="15" fill="#2B2420" text-anchor="middle">
    <text x="176" y="47">火</text><text x="176" y="65">廼</text><text x="176" y="83">要</text><text x="176" y="101">慎</text>
  </g>
  <rect x="171" y="104" width="10" height="10" rx="1" fill="#C4432B" opacity="0.85"/>
  <circle cx="176" cy="26" r="1.6" fill="#8A7A69"/>
</g>`;

/** Komora za dvířky: šamotové cihly, spirály v drážkách, police Šamotky. Kusy přidá hra při otevření. */
function komora() {
  const { x, y, w, h } = DVIRKA;
  const cihly: string[] = [];
  for (let r = 0; r < 9; r++) {
    const yy = y + 8 + r * 25;
    cihly.push(`M${x + 6} ${yy} H${x + w - 6}`);
    for (let k = 0; k < 5; k++) {
      const xx = x + 18 + k * 40 + (r % 2 ? 20 : 0);
      if (xx < x + w - 10) cihly.push(`M${xx} ${yy} V${yy + 25}`);
    }
  }
  const spiraly: string[] = [];
  for (const yy of [y + 46, y + 120, y + 194]) {
    let d = `M${x + 8} ${yy}`;
    for (let k = 0; k < 18; k++) d += ` q5 ${k % 2 ? 4 : -4} 10 0`;
    spiraly.push(d);
  }
  return `
<g class="mu-ohen-komora">
  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#mo8-komora)"/>
  <path d="${cihly.join(" ")}" stroke="#B9A584" stroke-width="1" opacity="0.7"/>
  <g class="mu-ohen-spiraly" fill="none" stroke="#9A8A72" stroke-width="2.2" stroke-linecap="round">${spiraly.map((d) => `<path d="${d}"/>`).join("")}</g>
  <path d="M${x} ${y} L${x + 12} ${y + 10} H${x + w - 12} L${x + w} ${y} Z" fill="#000" opacity="0.12"/>
  <path d="M${x} ${y} L${x + 12} ${y + 10} V${y + h - 10} L${x} ${y + h} Z" fill="#000" opacity="0.1"/>
  <path d="M${x + w} ${y} L${x + w - 12} ${y + 10} V${y + h - 10} L${x + w} ${y + h} Z" fill="#000" opacity="0.16"/>
  <!-- Police (Šamotka) na sloupcích -->
  <g class="mu-ohen-police">
    <rect x="${x + 22}" y="${y + 120}" width="9" height="${h - 130}" fill="#BFA47C"/>
    <rect x="${x + w - 31}" y="${y + 120}" width="9" height="${h - 130}" fill="#AE9370"/>
    <rect x="${x + 14}" y="${y + 112}" width="${w - 28}" height="9" rx="1.5" fill="url(#mo8-samot)"/>
    <rect x="${x + 10}" y="${y + h - 14}" width="${w - 20}" height="9" rx="1.5" fill="url(#mo8-samot)"/>
  </g>
  <g class="mu-ohen-kusy"></g>
  <rect class="mu-ohen-komora-zar" x="${x}" y="${y}" width="${w}" height="${h}" fill="#F06E1C" opacity="0"/>
</g>`;
}

/** Ovládací panel: displej, sloupec výkonu, kontrolka, tlačítka programu, hlavní vypínač, štítek */
function panel() {
  const px = 260;
  const py = 216;
  const pw = 68;
  const ph = 226;
  const sloupec: string[] = [];
  for (let i = 0; i < 10; i++) {
    const yy = py + 150 - i * 9;
    sloupec.push(`<rect class="mu-ohen-vykon-seg" data-i="${i}" x="${px + 10}" y="${yy}" width="14" height="6.4" rx="1.2" fill="#3A3226"/>`);
  }
  return `
<g class="mu-ohen-panel">
  <rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="6" fill="url(#mo8-panel)"/>
  <rect x="${px + 1.5}" y="${py + 1.5}" width="${pw - 3}" height="${ph - 3}" rx="5" fill="none" stroke="#6A7074" stroke-width="1"/>
  <rect x="${DISPLEJ.x - 2}" y="${DISPLEJ.y - 2}" width="${4 * (DISPLEJ.cifra + DISPLEJ.mezera) + 6}" height="${DISPLEJ.vyska + 12}" rx="3" fill="#0E1E15" stroke="#1B1D1E" stroke-width="2"/>
  <g transform="skewX(-6) translate(${f1(DISPLEJ.y * 0.105)} 0)">${[0, 1, 2, 3].map(cifra).join("")}</g>
  <text x="${px + pw - 8}" y="${py + 52}" text-anchor="end" font-family="ui-monospace, Consolas, monospace" font-size="8" fill="#9DA4A6">°C</text>
  <text x="${px + 9}" y="${py + 52}" font-family="ui-monospace, Consolas, monospace" font-size="7" fill="#9DA4A6">TEPLOTA</text>
  ${sloupec.join("")}
  <text x="${px + 17}" y="${py + 170}" text-anchor="middle" font-family="ui-monospace, Consolas, monospace" font-size="6.5" fill="#9DA4A6">VÝKON</text>
  <circle class="mu-ohen-led" cx="${px + 46}" cy="${py + 76}" r="5" fill="#4A1E16" stroke="#1B1D1E" stroke-width="1.2"/>
  <text x="${px + 46}" y="${py + 92}" text-anchor="middle" font-family="ui-monospace, Consolas, monospace" font-size="6.5" fill="#9DA4A6">TOPÍ</text>
  <g fill="#5C6266" stroke="#262A2C" stroke-width="1">
    <rect x="${px + 37}" y="${py + 104}" width="18" height="10" rx="3"/>
    <rect x="${px + 37}" y="${py + 120}" width="18" height="10" rx="3"/>
    <rect x="${px + 37}" y="${py + 136}" width="18" height="10" rx="3"/>
  </g>
  <path d="M${px + 42} ${py + 109} h8 M${px + 46} ${py + 121} v8 M${px + 42} ${py + 141} h8" stroke="#C9CED0" stroke-width="1.2" stroke-linecap="round"/>
  <circle cx="${px + pw / 2}" cy="${py + 192}" r="12" fill="#2A2D2F" stroke="#8C9295" stroke-width="1.4"/>
  <circle cx="${px + pw / 2}" cy="${py + 192}" r="8.5" fill="#B83A26"/>
  <rect x="${px + pw / 2 - 2}" y="${py + 181}" width="4" height="12" rx="1.5" fill="#E8DCC8" transform="rotate(35 ${px + pw / 2} ${py + 192})"/>
  <rect x="${px + 8}" y="${py + 209}" width="${pw - 16}" height="11" rx="1.5" fill="#D9D2BE"/>
  <text x="${px + pw / 2}" y="${py + 217.4}" text-anchor="middle" font-family="ui-monospace, Consolas, monospace" font-size="6.6" fill="#2B2420">max 1320 °C</text>
</g>`;
}

/** Pec: nohy, stín, plášť, horní deska s průduchem, rám dvířek se spárou, komora, panel */
function pec() {
  const { x, y, w, h } = PEC;
  const d = DVIRKA;
  return `
<g class="mu-ohen-pec">
  <ellipse cx="${x + w / 2}" cy="${y + h + 34}" rx="${w / 2 + 26}" ry="12" fill="#2B2420" opacity="0.28"/>
  <g fill="#4B4F52">
    <rect x="${x + 14}" y="${y + h - 4}" width="12" height="38" rx="2"/>
    <rect x="${x + w - 26}" y="${y + h - 4}" width="12" height="38" rx="2"/>
    <rect x="${x + 8}" y="${y + h + 24}" width="24" height="7" rx="2"/>
    <rect x="${x + w - 32}" y="${y + h + 24}" width="24" height="7" rx="2"/>
  </g>
  <rect x="${x + 20}" y="${y + h + 4}" width="${w - 40}" height="6" fill="#5C6064"/>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="url(#mo8-ocel)"/>
  <rect x="${x - 6}" y="${y - 10}" width="${w + 12}" height="14" rx="4" fill="url(#mo8-ocel-v)"/>
  <path d="M${x - 6} ${y + 4} H${x + w + 6}" stroke="#8C908C" stroke-width="1.5"/>
  <rect x="${x + 122}" y="${y - 16}" width="18" height="7" rx="2" fill="#A6AAA6"/>
  <rect x="${x + 126}" y="${y - 20}" width="10" height="5" rx="1.5" fill="#C9CCC8"/>
  <g class="mu-ohen-horko" fill="none" stroke="#FFD9A0" stroke-width="2.4" stroke-linecap="round" opacity="0">
    <path d="M${x + 131} ${y - 26} c-6 -10 6 -16 0 -28"/><path d="M${x + 121} ${y - 30} c-5 -8 5 -13 0 -22"/><path d="M${x + 141} ${y - 30} c-5 -8 5 -13 0 -22"/>
  </g>
  <!-- Rám dvířek; spára mezi rámem a dvířky v žáru svítí -->
  <rect x="${d.x - 5}" y="${d.y - 5}" width="${d.w + 10}" height="${d.h + 10}" rx="4" fill="#5A5E5C"/>
  ${komora()}
  <rect class="mu-ohen-spara" x="${d.x - 1}" y="${d.y - 1}" width="${d.w + 2}" height="${d.h + 2}" rx="2" fill="none" stroke="#FF8A2A" stroke-width="3" opacity="0"/>
  <g fill="#6E7270">
    <rect x="${d.x - 9}" y="${d.y + 24}" width="9" height="30" rx="3"/>
    <rect x="${d.x - 9}" y="${d.y + d.h - 54}" width="9" height="30" rx="3"/>
  </g>
  <g fill="#8C908C"><circle cx="${x + 8}" cy="${y + 10}" r="2"/><circle cx="${x + w - 8}" cy="${y + 10}" r="2"/><circle cx="${x + 8}" cy="${y + h - 10}" r="2"/><circle cx="${x + w - 8}" cy="${y + h - 10}" r="2"/></g>
  ${panel()}
  <!-- Kabel do zásuvky -->
  <path d="M${x + w - 16} ${y + h - 4} C${x + w - 12} ${y + h + 22} ${x + w + 2} ${y + h + 24} ${x + w + 12} ${y + h - 4}" fill="none" stroke="#1F1F1F" stroke-width="3.4" stroke-linecap="round"/>
  <g transform="translate(${x + w + 4} ${y + h - 26})">
    <rect x="0" y="0" width="16" height="18" rx="3" fill="#C4432B"/>
    <circle cx="8" cy="9" r="5" fill="#8E2A1A"/>
    <rect x="3" y="-3" width="10" height="4" rx="1.5" fill="#A8372A"/>
  </g>
</g>`;
}

/** Hladký obrys pásu kolem křivky, se stropem 1 310 °C */
function pasCesta() {
  const body: number[] = [];
  for (let h = 0; h <= krivka[krivka.length - 1][0] + 1e-9; h += 0.05) body.push(h);
  for (const [h] of krivka) body.push(h);
  body.sort((a, b) => a - b);
  const T = (h: number) => {
    for (let i = 1; i < krivka.length; i++) {
      const [h0, t0] = krivka[i - 1];
      const [h1, t1] = krivka[i];
      if (h <= h1 + 1e-9) return t0 + ((t1 - t0) * (h - h0)) / Math.max(1e-6, h1 - h0);
    }
    return krivka[krivka.length - 1][1];
  };
  const horni = body.map((h) => `${f1(gx(h))} ${f1(gy(Math.min(T(h) + PAS_KRESBA, STROP)))}`);
  const dolni = body.map((h) => `${f1(gx(h))} ${f1(gy(Math.max(0, T(h) - PAS_KRESBA)))}`).reverse();
  const stred = krivka.map(([h, t]) => `${f1(gx(h))} ${f1(gy(t))}`);
  return { pas: `M${horni.join(" L")} L${dolni.join(" L")} Z`, stred: `M${stred.join(" L")}` };
}

/** Zapisovač: ořechová deska, milimetrový papír, pás, milníky, portál s perem, lampička */
function zapisovac() {
  const { x0, x12, xNoc, y0, yVrch } = GRAF;
  const mrizka: string[] = [];
  const hlavni: string[] = [];
  for (let h = 0; h <= 12; h += 1) (h % 3 ? mrizka : hlavni).push(`M${f1(gx(h))} ${yVrch} V${y0}`);
  for (let T = 0; T <= GRAF.tMax; T += 100) (T % 500 ? mrizka : hlavni).push(`M${x0} ${f1(gy(T))} H${xNoc}`);
  for (let h = 0.5; h < 12; h += 1) mrizka.push(`M${f1(gx(h))} ${yVrch} V${y0}`);
  const popisyT = [0, 200, 400, 600, 800, 1000, 1200, 1400]
    .map((T) => `<text x="${x0 - 6}" y="${f1(gy(T) + 4.5)}" text-anchor="end">${T >= 1000 ? `${String(T).slice(0, 1)} ${String(T).slice(1)}` : T}</text>`)
    .join("");
  /* Šest ráno stojí vpravo od tyče portálu, ať ho na začátku nezakrývá */
  const popisyH = [0, 3, 6, 9, 12]
    .map((h) => `<text x="${f1(gx(h) + (h ? 0 : 5))}" y="${y0 + 16}" text-anchor="${h ? "middle" : "start"}">${6 + h}:00</text>`)
    .join("");
  const { pas, stred } = pasCesta();
  const cara = (T: number, barva: string, text: string, xText: number, kotva: "start" | "end", nahoru = true) => `
  <g class="mu-ohen-milnik" data-t="${T}">
    <path d="M${x0} ${f1(gy(T))} H${x12}" stroke="${barva}" stroke-width="1.3" stroke-dasharray="5 4" opacity="0.8"/>
    <text x="${xText}" y="${f1(gy(T) + (nahoru ? -5 : 15))}" text-anchor="${kotva}" fill="${barva}">${text}</text>
  </g>`;
  return `
<g class="mu-ohen-zapisovac">
  <rect x="362" y="20" width="430" height="456" rx="10" fill="#2B2420" opacity="0.2"/>
  <rect x="358" y="14" width="432" height="458" rx="10" fill="url(#mo8-deska)"/>
  <rect x="364" y="20" width="420" height="446" rx="7" fill="none" stroke="#8C6646" stroke-width="1.2" opacity="0.7"/>
  <rect x="372" y="28" width="404" height="432" rx="2" fill="url(#mo8-papir)"/>
  <g fill="url(#mo8-mosaz)"><circle cx="366" cy="22" r="3.2"/><circle cx="782" cy="22" r="3.2"/><circle cx="366" cy="464" r="3.2"/><circle cx="782" cy="464" r="3.2"/></g>

  <!-- Hlídaná pásma: voda pod 125 °C, křemen kolem 573 °C; noc vpravo -->
  <rect x="${x0}" y="${f1(gy(125))}" width="${x12 - x0}" height="${f1(gy(0) - gy(125))}" fill="#CFE2EE" opacity="0.6"/>
  <rect x="${x0}" y="${f1(gy(610))}" width="${x12 - x0}" height="${f1(gy(540) - gy(610))}" fill="#F3DDB2" opacity="0.65"/>
  <rect x="${x12}" y="${yVrch}" width="${xNoc - x12}" height="${y0 - yVrch}" fill="#DCE0EC" opacity="0.7"/>

  <path d="${mrizka.join(" ")}" stroke="#A9CBA8" stroke-width="0.6" opacity="0.8"/>
  <path d="${hlavni.join(" ")}" stroke="#86B08A" stroke-width="1" opacity="0.9"/>
  <path d="M${x12} ${yVrch} V${y0}" stroke="#7A86A8" stroke-width="1.2" stroke-dasharray="3 3"/>

  <path class="mu-ohen-pas" d="${pas}" fill="#BFE0B2" opacity="0.85"/>
  <path d="${stred}" fill="none" stroke="#4E8456" stroke-width="1.4" stroke-dasharray="6 4" opacity="0.9"/>
  <path d="M${x0} ${f1(gy(STROP))} H${x12}" stroke="#C4432B" stroke-width="1.6" opacity="0.85"/>

  <g class="mu-ohen-ruka" font-family="Caveat, cursive" font-size="17">
    ${cara(100, "#3F78A8", "100 °C · voda", x12 - 8, "end")}
    ${cara(573, "#B5761E", "573 °C · křemen", x12 - 8, "end")}
    ${cara(1280, "#B23A24", "1 280 °C · vrchol", x0 + 8, "start", false)}
    <text x="${x0 + 8}" y="${f1(gy(STROP) - 5)}" fill="#C4432B">1 310 — glazura stéká</text>
    <text x="${f1(gx(1.1))}" y="${f1(gy(100) - 30)}" fill="#3F6E48">sušit</text>
    <text x="${f1(gx(5.25) + 14)}" y="${f1(gy(573) + 26)}" fill="#3F6E48">pomalu</text>
    <text x="${f1(gx(10.35))}" y="${f1(gy(1280) + 34)}" fill="#3F6E48">držet</text>
    <text x="${f1((x12 + xNoc) / 2)}" y="${y0 - 8}" text-anchor="middle" fill="#5A6488">noc</text>
  </g>
  <path d="M${f1((x12 + xNoc) / 2 + 2)} ${y0 - 42} a7 7 0 1 0 7 9 a5.6 5.6 0 1 1 -7 -9 Z" fill="#7A86A8" opacity="0.8"/>

  <g class="mu-ohen-cisla" font-family="Fraunces, Georgia, serif" font-size="12.5" fill="#6B5D4F">${popisyT}${popisyH}
    <text x="${x0 - 6}" y="${yVrch - 9}" text-anchor="end" font-size="12">°C</text>
  </g>
  <g class="mu-ohen-ruka" font-family="Caveat, cursive">
    <text x="${x0 + 10}" y="62" font-size="23" fill="#2B2420">Pálicí křivka</text>
    <text x="${x0 + 124}" y="62" font-size="16.5" fill="#8A7C70">· ostrý výpal kameniny</text>
  </g>

  <!-- Značky milníků a stopa pera -->
  <g class="mu-ohen-znacky"></g>
  <g clip-path="url(#mo8-graf)">
    <g class="mu-ohen-trend-g" opacity="0">
      <path class="mu-ohen-trend" d="M${x0} ${f1(gy(20))} L${x0} ${f1(gy(20))}" stroke="#E0582E" stroke-width="2.2" stroke-dasharray="1.5 4.5" stroke-linecap="round"/>
      <circle class="mu-ohen-trend-konec" cx="${x0}" cy="${f1(gy(20))}" r="3.4" fill="#FBF6E8" stroke="#E0582E" stroke-width="1.8"/>
    </g>
    <path class="mu-ohen-stopa" d="" fill="none" stroke="#C4432B" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
    <path class="mu-ohen-stopa-ted" d="" fill="none" stroke="#C4432B" stroke-width="3.4" stroke-linecap="round"/>
  </g>

  <!-- Portál: vodicí tyče nahoře a dole, svislá tyč s vozíkem pera -->
  <rect x="378" y="31" width="392" height="5" rx="2.5" fill="url(#mo8-tyc)"/>
  <rect x="378" y="452" width="392" height="5" rx="2.5" fill="url(#mo8-tyc)"/>
  <g class="mu-ohen-portal" transform="translate(${x0} 0)">
    <rect x="-3" y="34" width="6" height="420" rx="3" fill="url(#mo8-tyc)" opacity="0.92"/>
    <rect x="-9" y="27" width="18" height="12" rx="3" fill="#5A5048"/>
    <rect x="-9" y="449" width="18" height="12" rx="3" fill="#5A5048"/>
  </g>
  <g class="mu-ohen-pero" transform="translate(${x0} ${f1(gy(20))})">
    <rect x="-8" y="-24" width="16" height="16" rx="3" fill="#3A3330"/>
    <path d="M-4 -9 L4 -9 L1.6 -1.5 L0 0 L-1.6 -1.5 Z" fill="#C4432B"/>
    <circle cx="0" cy="-16" r="2.4" fill="#C9A24A"/>
  </g>

  <!-- Lampička na husím krku — večer se rozsvítí -->
  <g class="mu-ohen-lampa">
    <path class="mu-ohen-lampa-svetlo" d="M738 22 L640 236 L776 236 L776 44 Z" fill="url(#mo8-lampa)" opacity="0"/>
    <rect x="772" y="8" width="14" height="12" rx="2" fill="#3A3330"/>
    <path d="M779 9 C779 -2 764 -4 756 4" stroke="#3A3330" stroke-width="3" fill="none" stroke-linecap="round"/>
    <g transform="rotate(32 750 10)">
      <path d="M740 4 H760 L766 20 H734 Z" fill="#3D5A4A"/>
      <path d="M740 4 H760 L761.5 8 H738.5 Z" fill="#577A66"/>
      <ellipse class="mu-ohen-lampa-zarovka" cx="750" cy="20" rx="14" ry="3" fill="#E8DFC8"/>
    </g>
  </g>
</g>`;
}

/** Hlavní kresba scény (pod dvířky) */
export function kresba() {
  return `<svg class="mu-kresba" viewBox="0 0 ${SIRKA} ${VYSKA}" aria-hidden="true" focusable="false">
<defs>${defs()}</defs>
<rect width="${SIRKA}" height="${VYSKA}" fill="url(#mo8-zed)"/>
${okno()}
${ofuda()}
<rect x="0" y="474" width="${SIRKA}" height="14" fill="#9A7350"/>
<path d="M0 474 H${SIRKA}" stroke="#B48C64" stroke-width="2"/>
<rect x="0" y="488" width="${SIRKA}" height="${VYSKA - 488}" fill="url(#mo8-podlaha)"/>
<path d="M0 512 H${SIRKA} M0 540 H${SIRKA} M120 488 V512 M330 488 V512 M560 488 V512 M220 512 V540 M470 512 V540 M690 512 V540 M80 540 V560 M380 540 V560 M640 540 V560" stroke="#6E5038" stroke-width="1.2" opacity="0.55"/>
<path class="mu-ohen-noc" d="M0 0 H${SIRKA} V${VYSKA} H0 Z M${OKNO.x + 9} ${OKNO.y + 9} V${OKNO.y + OKNO.h - 9} H${OKNO.x + OKNO.w - 9} V${OKNO.y + 9} Z" fill="#141838" fill-rule="evenodd" opacity="0"/>
<ellipse class="mu-ohen-zar-mistnost" cx="${DVIRKA.x + DVIRKA.w / 2}" cy="${DVIRKA.y + DVIRKA.h / 2 + 30}" rx="300" ry="230" fill="url(#mo8-zar-mistnost)" opacity="0"/>
${pec()}
${zapisovac()}
</svg>`;
}

/** Dvířka pece — HTML vrstva se dvěma stranami (líc ocel, rub izolační cihla), otvírá se přes CSS 3D */
export function dvirka() {
  const { w, h } = DVIRKA;
  const s = SPEHYRKA;
  const styl = `left:${pct(DVIRKA.x, SIRKA)};top:${pct(DVIRKA.y, VYSKA)};width:${pct(w, SIRKA)};height:${pct(h, VYSKA)}`;
  const nyty: string[] = [];
  for (let i = 0; i < 6; i++) nyty.push(`<circle cx="${10}" cy="${f1(14 + i * ((h - 28) / 5))}" r="1.8"/>`, `<circle cx="${w - 10}" cy="${f1(14 + i * ((h - 28) / 5))}" r="1.8"/>`);
  return `<div class="mu-ohen-dvirka" style="${styl}" aria-hidden="true">
  <div class="mu-ohen-dvirka-list">
    <svg class="mu-ohen-dvirka-lic" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" focusable="false">
      <defs>
        <linearGradient id="mo8-dvirka" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#B9BDB9"/><stop offset="0.35" stop-color="#E8E9E5"/><stop offset="0.7" stop-color="#D2D5D1"/><stop offset="1" stop-color="#A4A8A5"/></linearGradient>
        <linearGradient id="mo8-dvirka-panel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#DADDD9"/><stop offset="1" stop-color="#C2C6C2"/></linearGradient>
      </defs>
      <rect width="${w}" height="${h}" rx="4" fill="url(#mo8-dvirka)"/>
      <rect x="22" y="80" width="${w - 52}" height="${h - 102}" rx="6" fill="url(#mo8-dvirka-panel)" stroke="#9FA39F" stroke-width="1.2"/>
      <path d="M24 82 H${w - 32}" stroke="#FFFFFF" stroke-width="1.4" opacity="0.7"/>
      <g fill="#9A9E9A">${nyty.join("")}</g>
      <!-- Štítek a znak ohně -->
      <rect x="${w / 2 - 6}" y="96" width="44" height="44" rx="4" fill="#F4EEDF" stroke="#BFB29A" stroke-width="1"/>
      <text class="mu-ohen-kanji" x="${w / 2 + 16}" y="128" text-anchor="middle" font-size="27" fill="#C4432B">火</text>
      <!-- Špehýrka se zátkou -->
      <circle cx="${s.x}" cy="${s.y}" r="13" fill="#9A9E9A"/>
      <circle cx="${s.x}" cy="${s.y}" r="9.5" fill="#E9DFCB" stroke="#8A7E68" stroke-width="1.2"/>
      <circle cx="${s.x}" cy="${s.y}" r="4.4" fill="#C9BBA0"/>
      <circle class="mu-ohen-spehyrka-zar" cx="${s.x}" cy="${s.y}" r="11" fill="none" stroke="#FF9A3A" stroke-width="2" opacity="0"/>
      <!-- Závora -->
      <rect x="${w - 22}" y="${h / 2 - 34}" width="14" height="68" rx="5" fill="#6E7270"/>
      <rect x="${w - 19}" y="${h / 2 - 28}" width="8" height="56" rx="4" fill="#3E4240"/>
      <path d="M${w - 15} ${h / 2} H${w - 40}" stroke="#2E3230" stroke-width="7" stroke-linecap="round"/>
      <circle cx="${w - 40}" cy="${h / 2}" r="6" fill="#2E3230"/>
    </svg>
    <svg class="mu-ohen-dvirka-rub" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" focusable="false">
      <rect width="${w}" height="${h}" rx="4" fill="#9A9E9A"/>
      <rect x="10" y="10" width="${w - 20}" height="${h - 20}" rx="2" fill="#EADFCB"/>
      <path d="M10 60 H${w - 10} M10 110 H${w - 10} M10 160 H${w - 10} M60 10 V60 M130 10 V60 M95 60 V110 M60 110 V160 M130 110 V160 M95 160 V${h - 10}" stroke="#C9B898" stroke-width="1.4"/>
      <circle cx="${w - s.x}" cy="${s.y}" r="6" fill="#B9A688"/>
    </svg>
  </div>
</div>`;
}

/** Vrstva nad dvířky: shimenawa na peci, lupa špehýrky se žároměrkami, efekty */
export function nad() {
  const { cx, cy, r } = LUPA;
  const sx = DVIRKA.x + SPEHYRKA.x;
  const sy = DVIRKA.y + SPEHYRKA.y;
  /* Tečny z kruhu lupy ke špehýrce */
  const dx = sx - cx;
  const dy = sy - cy;
  const vzd = Math.hypot(dx, dy);
  const zakl = Math.atan2(dy, dx);
  const odch = Math.acos(r / vzd);
  const t1 = [cx + r * Math.cos(zakl + odch), cy + r * Math.sin(zakl + odch)];
  const t2 = [cx + r * Math.cos(zakl - odch), cy + r * Math.sin(zakl - odch)];
  const cihly: string[] = [];
  for (let k = 0; k < 6; k++) cihly.push(`M${cx - r} ${cy - r + 14 + k * 22} H${cx + r}`);
  for (let k = 0; k < 6; k++) for (let j = 0; j < 5; j++) cihly.push(`M${cx - r + 6 + j * 30 + (k % 2) * 15} ${cy - r + 14 + k * 22} v22`);
  let spirala = `M${cx - r} ${cy - 30}`;
  for (let k = 0; k < 14; k++) spirala += ` q4.5 ${k % 2 ? 5 : -5} 9 0`;
  const podlozka = cy + 40;
  const kuzely = zaromerky
    .map((_, i) => `<path class="mu-ohen-kuzel" data-i="${i}" d="${zaromerkaD(cx - 30 + i * 24, podlozka - 2, 0)}" fill="#E8D7AE" stroke="#6E5236" stroke-width="0.8" stroke-linejoin="round"/>`)
    .join("");
  /* Shimenawa přes čelo pece, tři papírky shide */
  const sy0 = PEC.y + 6;
  const lx0 = PEC.x - 3;
  const lx1 = DVIRKA.x + DVIRKA.w + 8;
  const lano = `M${lx0} ${sy0} Q${(lx0 + lx1) / 2} ${sy0 + 20} ${lx1} ${sy0}`;
  const shide = (x: number, y: number, z: number) =>
    `<g transform="translate(${f1(x)} ${f1(y)})"><path class="mu-ohen-shide" style="--z:${z}s" d="M-4 0 h5 v6 h3 v6 h-3 v6 h3 v6 h-5 v-6 h-3 v-6 h3 v-6 h-3 Z" fill="#FBF7EE" stroke="#8A7A69" stroke-width="0.7" stroke-linejoin="round"/></g>`;
  const naLane = (t: number) => [lx0 + (lx1 - lx0) * t, sy0 + 2 * t * (1 - t) * 20] as const;
  const [ax, ay] = naLane(0.3);
  const [bx, by] = naLane(0.58);
  const [qx, qy] = naLane(0.86);
  return `<svg class="mu-ohen-nad" viewBox="0 0 ${SIRKA} ${VYSKA}" aria-hidden="true" focusable="false">
<defs>
  <clipPath id="mo8-lupa-orez"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>
  <radialGradient id="mo8-lupa-zar" cx="0.5" cy="0.42" r="0.62">
    <stop class="mu-ohen-lupa-stop" offset="0" stop-color="#2A1A14"/>
    <stop class="mu-ohen-lupa-stop" offset="1" stop-color="#140C09"/>
  </radialGradient>
  <linearGradient id="mo8-lano" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EFE3C2"/><stop offset="1" stop-color="#C9B186"/></linearGradient>
</defs>
<g class="mu-ohen-shimenawa">
  <path d="${lano}" stroke="#A8916A" stroke-width="7.5" fill="none" stroke-linecap="round"/>
  <path d="${lano}" stroke="url(#mo8-lano)" stroke-width="5.6" fill="none" stroke-linecap="round"/>
  <path d="${lano}" stroke="#B49C70" stroke-width="5.6" fill="none" stroke-dasharray="1.8 4.6"/>
  ${shide(ax, ay + 2, 0)}${shide(bx, by + 2, -0.9)}${shide(qx, qy + 2, -1.7)}
</g>
<g class="mu-ohen-voditka" stroke="#8A6424" stroke-width="1.2" stroke-dasharray="3 3" opacity="0.75">
  <path d="M${f1(t1[0])} ${f1(t1[1])} L${f1(sx)} ${f1(sy)} M${f1(t2[0])} ${f1(t2[1])} L${f1(sx)} ${f1(sy)}"/>
</g>
<g class="mu-ohen-lupa">
  <circle cx="${cx + 3}" cy="${cy + 5}" r="${r + 7}" fill="#2B2420" opacity="0.22"/>
  <g clip-path="url(#mo8-lupa-orez)">
    <rect x="${cx - r}" y="${cy - r}" width="${2 * r}" height="${2 * r}" fill="url(#mo8-lupa-zar)"/>
    <path class="mu-ohen-lupa-cihly" d="${cihly.join(" ")}" stroke="#5A3A2A" stroke-width="1.1" opacity="0.55"/>
    <path class="mu-ohen-lupa-spirala" d="${spirala}" fill="none" stroke="#6A4A38" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M${cx + 14} ${podlozka - 4} C${cx + 14} ${podlozka - 28} ${cx + 50} ${podlozka - 28} ${cx + 50} ${podlozka - 4} Z" class="mu-ohen-lupa-kus" fill="#3A241A"/>
    <rect class="mu-ohen-lupa-police" x="${cx - r}" y="${podlozka}" width="${2 * r}" height="${r}" fill="#2E1D15"/>
    <path d="M${cx - 42} ${podlozka + 1} C${cx - 40} ${podlozka - 7} ${cx + 22} ${podlozka - 7} ${cx + 26} ${podlozka + 1} Z" class="mu-ohen-lupa-podlozka" fill="#4A3020"/>
    ${kuzely}
    <rect class="mu-ohen-lupa-jas" x="${cx - r}" y="${cy - r}" width="${2 * r}" height="${2 * r}" fill="#FFF6D2" opacity="0"/>
  </g>
  <circle cx="${cx}" cy="${cy}" r="${r + 3}" fill="none" stroke="#C99A3E" stroke-width="7"/>
  <circle cx="${cx}" cy="${cy}" r="${r + 6.5}" fill="none" stroke="#8A6424" stroke-width="1.2"/>
  <circle cx="${cx}" cy="${cy}" r="${r - 0.5}" fill="none" stroke="#5E4416" stroke-width="1.4"/>
  <path d="M${f1(cx - r * 0.7)} ${f1(cy - r * 0.48)} A${r * 0.86} ${r * 0.86} 0 0 1 ${f1(cx + r * 0.1)} ${f1(cy - r * 0.84)}" stroke="#FFFFFF" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.35"/>
  <circle class="mu-ohen-lupa-kotva" cx="${cx}" cy="${cy}" r="${r}" fill="none"/>
</g>
<g class="mu-ohen-efekty"></g>
</svg>`;
}

/** Ovládání pod oknem: velké tlačítko Topit (drží se) a Otevřít pec, které přijde po výpalu */
export function ovladani() {
  return `<div class="mu-ovladani mu-ohen-ovladani">
  <button type="button" class="mu-ohen-topit" aria-describedby="mo8-napoveda">
    <span class="mu-ohen-topit-mira" aria-hidden="true"></span>
    <svg class="mu-ohen-topit-plamen" viewBox="0 0 24 30" aria-hidden="true" focusable="false"><path d="M12 1 C14 8 21 11 21 19 C21 25 17 29 12 29 C7 29 3 25 3 19 C3 14 6 11 8 8 C8.5 12 10 13.5 11.5 14 C11 9 10 5 12 1 Z" fill="currentColor"/><path d="M12 16 C13.5 19 16 20 16 23.5 C16 26 14.2 27.5 12 27.5 C9.8 27.5 8 26 8 23.5 C8 21.5 9.5 20 10.6 18.6 C11 20 11.6 20.6 12.3 20.8 C11.8 19 11.6 17.6 12 16 Z" fill="#FFE29A"/></svg>
    <span class="mu-ohen-topit-text">Topit</span>
    <span class="mu-ohen-topit-pod" aria-hidden="true">drž</span>
  </button>
  <button type="button" class="mu-ohen-otevrit" aria-describedby="mo8-napoveda" hidden>
    <span class="mu-ohen-otevrit-text">Otevřít pec</span>
    <span class="mu-ohen-otevrit-ted" aria-hidden="true">teď</span>
  </button>
  <p class="mu-ohen-napoveda" id="mo8-napoveda">Drž tlačítko nebo mezerník — pec topí. Pustíš — a chladne.</p>
</div>`;
}

/** Celé okno scény; `pecinka` = HTML postavičky (Astro do něj vloží <Postavicka>) */
export const okenko = (pecinka: string) =>
  `<div class="mu-okno mu-ohen-okno" role="img" aria-label="Elektrická pec s Pecinkou a zapisovač pálicí křivky">${kresba()}${dvirka()}${pecinka}${nad()}</div>`;

/** Obal Pecinky — pozice v procentech okna */
export const pecinkaStyl = () => `left:${pct(PECINKA.x, SIRKA)};top:${pct(PECINKA.y, VYSKA)};width:${pct(PECINKA.s, SIRKA)}`;

/** Celá scéna (pro náhledy a testy — Astro skládá to samé po kouscích) */
export const scena = (pecinka = `<div class="mu-ohen-pecinka" style="${pecinkaStyl()}"></div>`) => okenko(pecinka) + ovladani();

