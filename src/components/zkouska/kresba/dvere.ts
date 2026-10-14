/**
 * Úvod komnaty U mistra: dílna u startu desky sugoroku, jen zblízka. Taková,
 * jaká stojí na desce vlevo dole (kresba/deska.ts), ráno, když se otevírá:
 * tašková střecha irimoya se štítem do ulice, nad dveřmi vývěsní štít
 * 胡桃工房 (ořechová dílna — stejně jako pečeť na mistrovském listu),
 * lampiony 修 a 業, mřížové okno, výloha s hotovými kusy, kamenná lucerna,
 * nádržka s bambusem a šlapáky k norenu. Za domem ořech a v dálce na kopci
 * kouří šplhavá pec z desky.
 *
 * Noren, provaz s lístkem 二 a parta jsou HTML nad kresbou (Dvere.astro) —
 * jejich místa jsou tady v souřadnicích kresby (viewBox 1000 × 800) a stránka
 * je přepočítá na procenta.
 *
 * Čistá funkce bez DOM, jako deska: náhoda je deterministická.
 */
import { chomac, nahoda } from "../../parta2/tvary";
import { kusSvg, profil } from "../../dilna/kus";
import type { Kus } from "../../dilna/kus";
import type { PostavaId } from "../../../data/parta";

export const STAVBA_W = 1000;
export const STAVBA_H = 800;
/** Kde končí dům a začíná tráva (v kresbě); CSS podle toho srovná pruh trávy */
export const ZEM_Y = 724;

/** Dveře: otvor, do kterého visí noren */
export const DVERE = { x0: 398, x1: 602, y0: 432, y1: 712 };

/**
 * Kde kdo z party čeká: x osa postavičky, y pata, w šířka obrázku 180 × 180
 * (kresby mají pod nohama asi osminu výšky vzduchu).
 */
export const PARTA_U_DVERI: { id: PostavaId; x: number; y: number; w: number }[] = [
  { id: "hlinka", x: 112, y: 748, w: 84 },
  { id: "stripek", x: 318, y: 634, w: 58 },
  { id: "samotka", x: 266, y: 752, w: 100 },
  { id: "cedulka", x: 392, y: 500, w: 52 },
  { id: "kachlik", x: 572, y: 792, w: 72 },
  { id: "vazicka", x: 842, y: 536, w: 62 },
  { id: "kapka", x: 914, y: 700, w: 54 },
  { id: "bublinka", x: 852, y: 716, w: 56 },
  { id: "pecinka", x: 790, y: 262, w: 68 },
];

const f = (n: number) => Math.round(n * 10) / 10;

/** Zaoblený obdélník jako cesta */
const obd = (x: number, y: number, w: number, h: number, r = 0) =>
  r <= 0
    ? `M${x} ${y} H${f(x + w)} V${f(y + h)} H${x} Z`
    : `M${f(x + r)} ${y} H${f(x + w - r)} Q${f(x + w)} ${y} ${f(x + w)} ${f(y + r)} V${f(y + h - r)} Q${f(x + w)} ${f(y + h)} ${f(x + w - r)} ${f(y + h)} H${f(x + r)} Q${x} ${f(y + h)} ${x} ${f(y + h - r)} V${f(y + r)} Q${x} ${y} ${f(x + r)} ${y} Z`;

/** Hotový kus do výlohy — vnořené SVG z kus.ts */
function kus(id: string, x: number, y: number, w: number, k: Kus) {
  const svg = kusSvg(k, "hotovy", { id: `zkd-${id}`, sirka: 200, vyska: 200 });
  return svg.replace("<svg ", `<svg x="${f(x - w / 2)}" y="${f(y - w)}" width="${w}" height="${w}" `);
}

const KUSY: Kus[] = [
  { puvod: "dilna", druh: "miska", nazev: "", r: profil((t) => 30 + 34 * Math.pow(Math.sin((t * Math.PI) / 2), 0.85)), v: 58, glazury: [{ g: "celadon", kde: "cely" }], dno: true },
  { puvod: "dilna", druh: "vaza", nazev: "", r: profil((t) => 22 + 20 * Math.sin(Math.PI * Math.min(1, t * 1.25)) + (t > 0.82 ? (t - 0.82) * 40 : 0)), v: 150, glazury: [{ g: "tenmoku", kde: "cely" }, { g: "shino", kde: "horni" }], dno: true },
  { puvod: "dilna", druh: "hrnek", nazev: "", r: profil((t) => 38 + 3 * Math.sin(Math.PI * t)), v: 92, ucho: true, glazury: [{ g: "železitá hnědá", kde: "cely" }], dno: true },
  { puvod: "dilna", druh: "miska", nazev: "", r: profil((t) => 46 + 30 * Math.pow(t, 1.3)), v: 40, glazury: [{ g: "shino", kde: "cely" }], dno: true },
  { puvod: "dilna", druh: "pohar", nazev: "", r: profil((t) => 30 - 4 * Math.sin(Math.PI * t)), v: 120, glazury: [{ g: "popelová šedá", kde: "cely" }], dno: true },
];

/** Lampion chōchin se znakem, zavěšený pod okapem */
function lampion(x: number, y: number, znak: string, id: string) {
  return (
    `<path d="M${x} ${y} V${y + 22}" stroke="#2B2420" stroke-width="2"/>` +
    `<ellipse cx="${x}" cy="${y + 64}" rx="70" ry="74" fill="url(#zkd-zare)" opacity="0.7"/>` +
    `<rect x="${x - 15}" y="${y + 20}" width="30" height="9" rx="2" fill="#2B2420"/>` +
    `<path d="M${x - 24} ${y + 30} C${x - 34} ${y + 48} ${x - 34} ${y + 86} ${x - 24} ${y + 104} H${x + 24} C${x + 34} ${y + 86} ${x + 34} ${y + 48} ${x + 24} ${y + 30} Z" fill="url(#zkd-lampion-${id})"/>` +
    [42, 54, 66, 78, 90].map((h) => `<path d="M${x - 31} ${y + h} Q${x} ${y + h + 4} ${x + 31} ${y + h}" stroke="#8E2E1F" stroke-width="1.2" fill="none" opacity="0.55"/>`).join("") +
    `<text x="${x}" y="${y + 77}" text-anchor="middle" font-size="25" fill="#2B2420" font-family="Yuji Syuku, Yu Mincho, serif">${znak}</text>` +
    `<rect x="${x - 15}" y="${y + 104}" width="30" height="9" rx="2" fill="#2B2420"/>` +
    `<path d="M${x - 5} ${y + 113} V${y + 130} M${x} ${y + 113} V${y + 134} M${x + 5} ${y + 113} V${y + 130}" stroke="#C4432B" stroke-width="2" stroke-linecap="round"/>`
  );
}

export function stavbaSvg(): string {
  const r = nahoda(2026);
  const d: string[] = [];
  const t: string[] = [];

  d.push(
    `<linearGradient id="zkd-omitka" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F2EAD8"/><stop offset="1" stop-color="#DFD0B4"/></linearGradient>`,
    `<linearGradient id="zkd-taska" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5A5C6E"/><stop offset="1" stop-color="#34343F"/></linearGradient>`,
    `<linearGradient id="zkd-trava" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#87A85C"/><stop offset="1" stop-color="#6E9A4B"/></linearGradient>`,
    `<linearGradient id="zkd-svetlo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF4D4"/><stop offset="0.55" stop-color="#FFD993"/><stop offset="1" stop-color="#E9A95A"/></linearGradient>`,
    `<linearGradient id="zkd-sklo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF6E0"/><stop offset="1" stop-color="#F3D8A8"/></linearGradient>`,
    `<linearGradient id="zkd-drevo" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4E3828"/><stop offset="0.5" stop-color="#6E5038"/><stop offset="1" stop-color="#4E3828"/></linearGradient>`,
    `<linearGradient id="zkd-spaleno" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#433A40"/><stop offset="1" stop-color="#2E272C"/></linearGradient>`,
    `<linearGradient id="zkd-kamen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B9B3A6"/><stop offset="1" stop-color="#8E887C"/></linearGradient>`,
    `<radialGradient id="zkd-zare" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#FFD58A" stop-opacity="0.75"/><stop offset="1" stop-color="#FFB45C" stop-opacity="0"/></radialGradient>`,
    `<radialGradient id="zkd-lampion-a" cx="0.42" cy="0.4" r="0.7"><stop offset="0" stop-color="#FF8A5C"/><stop offset="0.6" stop-color="#E0502E"/><stop offset="1" stop-color="#A8321E"/></radialGradient>`,
    `<radialGradient id="zkd-lampion-b" cx="0.42" cy="0.4" r="0.7"><stop offset="0" stop-color="#FF8A5C"/><stop offset="0.6" stop-color="#E0502E"/><stop offset="1" stop-color="#A8321E"/></radialGradient>`,
    `<clipPath id="zkd-vyloha"><rect x="688" y="372" width="220" height="176" rx="3"/></clipPath>`,
  );

  /* ——— Ořech za domem ——— */
  t.push(`<path d="M96 726 C92 640 104 560 94 470 C88 420 96 380 112 330 M98 520 C70 480 54 440 50 392 M104 450 C136 420 160 380 170 330" stroke="#5E4632" stroke-width="22" fill="none" stroke-linecap="round"/>`);
  t.push(`<path d="M96 726 C92 640 104 560 94 470 C88 420 96 380 112 330" stroke="#7A5C42" stroke-width="7" fill="none" stroke-linecap="round" opacity="0.6" transform="translate(-6 0)"/>`);
  t.push(`<path d="${chomac(120, 236, 190, 120, 18, 31, 0.85)}" fill="#5E7F4C"/>`);
  t.push(`<path d="${chomac(84, 210, 140, 88, 15, 32, 0.85)}" fill="#6E8F57"/>`);
  t.push(`<path d="${chomac(176, 178, 110, 66, 13, 33, 0.85)}" fill="#7FA064"/>`);
  for (let i = 0; i < 12; i++) t.push(`<circle cx="${f(20 + r() * 250)}" cy="${f(150 + r() * 150)}" r="6" fill="#B9C46E" stroke="#8E9A4E" stroke-width="1"/>`);

  /* ——— Komín pece za střechou, z něj kouř ——— */
  t.push(`<rect x="812" y="116" width="40" height="160" fill="#9C6E55"/><rect x="806" y="108" width="52" height="14" fill="#7E5440"/>`);
  t.push(`<path d="M816 140 H848 M816 168 H848 M816 196 H848 M832 122 V140 M824 140 V168 M840 168 V196" stroke="#7E5440" stroke-width="2" opacity="0.6"/>`);
  t.push(`<path class="zkd-kour" d="M832 104 C816 80 852 66 834 40 C820 18 848 4 838 -24" stroke="#E9E4EC" stroke-width="22" fill="none" stroke-linecap="round" opacity="0.55"/>`);

  /* ——— Střecha irimoya: dole valba, nahoře štít do ulice, na hřebeni onigawara ——— */
  /* štít (tsuma) — bílá omítka s dřevěnou mříží a lomenice */
  t.push(`<path d="M318 214 L500 112 L682 214 Z" fill="url(#zkd-omitka)"/>`);
  t.push(`<g stroke="#6E5038" stroke-width="3">` + [350, 400, 450, 500, 550, 600, 650].map((x) => `<path d="M${x} ${f(214 - (x < 500 ? (x - 318) : (682 - x)) * 0.56)} V214"/>`).join("") + `</g>`);
  t.push(`<path d="M300 218 L500 104 L700 218" stroke="#3A2A20" stroke-width="16" fill="none" stroke-linejoin="round"/>`);
  t.push(`<path d="M300 218 L500 104 L700 218" stroke="#5A4230" stroke-width="7" fill="none" stroke-linejoin="round"/>`);
  t.push(`<path d="M478 118 Q500 140 522 118 L516 132 Q500 148 484 132 Z" fill="#D6A23A"/>`);
  /* hřeben s onigawarou */
  t.push(`<path d="M484 104 Q500 78 516 104 Z" fill="#2E2E38"/><circle cx="500" cy="98" r="5" fill="#5A5C6E"/>`);
  /* valba */
  t.push(`<path d="M52 300 Q72 304 98 298 L248 214 L752 214 L902 298 Q928 304 948 300 L962 284 Q930 296 908 286 L760 200 L240 200 L92 286 Q70 296 38 284 Z" fill="#2E2E38"/>`);
  t.push(`<path d="M60 304 C140 300 180 262 248 220 L752 220 C820 262 860 300 940 304 L940 330 L60 330 Z" fill="url(#zkd-taska)"/>`);
  for (let i = 1; i <= 6; i++) {
    const y = 222 + i * 15;
    const sirka = 252 + i * 15 * 1.1;
    t.push(`<path d="M${f(500 - sirka - i * 9)} ${y} H${f(500 + sirka + i * 9)}" stroke="#6E7084" stroke-width="1.6" opacity="0.55"/>`);
  }
  /* okap s kulatými konci tašek (nokigawara) */
  t.push(`<path d="M36 322 Q60 336 98 334 H902 Q940 336 964 322 L966 340 Q940 352 902 350 H98 Q60 352 34 340 Z" fill="#24242C"/>`);
  for (let x = 110; x <= 890; x += 26) t.push(`<circle cx="${x}" cy="342" r="7.4" fill="#4A4C5A" stroke="#24242C" stroke-width="1.6"/>`);

  /* ——— Tělo domu ——— */
  t.push(`<rect x="150" y="350" width="800" height="210" fill="url(#zkd-omitka)"/>`);
  t.push(`<rect x="150" y="560" width="800" height="152" fill="url(#zkd-spaleno)"/>`);
  t.push(`<g stroke="#1F1A1D" stroke-width="1.4" opacity="0.6">` + Array.from({ length: 30 }, (_, i) => `<path d="M${176 + i * 26} 566 V708"/>`).join("") + `</g>`);
  t.push(`<rect x="146" y="712" width="808" height="20" fill="url(#zkd-kamen)"/>`);
  /* trámy a sloupy */
  t.push(`<rect x="150" y="350" width="800" height="16" fill="url(#zkd-drevo)"/><rect x="150" y="548" width="800" height="14" fill="url(#zkd-drevo)"/>`);
  for (const x of [150, 372, 616, 928]) t.push(`<rect x="${x}" y="350" width="22" height="362" fill="url(#zkd-drevo)"/>`);

  /* Mřížové okno vlevo — teplé světlo za laťkami */
  t.push(`<rect x="196" y="392" width="118" height="128" fill="url(#zkd-sklo)"/>`);
  t.push(`<g fill="#4E3828">` + Array.from({ length: 9 }, (_, i) => `<rect x="${198 + i * 13.6}" y="392" width="5.4" height="128"/>`).join("") + `<rect x="192" y="388" width="126" height="8"/><rect x="192" y="516" width="126" height="8"/></g>`);
  /* lavička pod oknem s miskami, co schnou */
  t.push(`<rect x="196" y="630" width="160" height="12" rx="3" fill="#8A6A48"/><path d="M212 642 V700 M340 642 V700" stroke="#6E5236" stroke-width="7" stroke-linecap="round"/>`);
  t.push(`<path d="M246 630 C246 616 256 608 268 608 C280 608 290 616 290 630 Z" fill="#C9B49C"/><path d="M206 630 L210 612 H236 L240 630 Z" fill="#BCA992"/>`);

  /* Výloha vpravo — hotové kusy na dvou policích */
  t.push(`<rect x="684" y="368" width="228" height="184" rx="4" fill="#3E2C20"/>`);
  t.push(`<g clip-path="url(#zkd-vyloha)"><rect x="688" y="372" width="220" height="176" fill="url(#zkd-sklo)"/>` +
    `<rect x="688" y="458" width="220" height="7" fill="#8A6A48"/><rect x="688" y="540" width="220" height="8" fill="#8A6A48"/>` +
    kus("k1", 722, 458, 56, KUSY[0]) + kus("k2", 790, 458, 70, KUSY[1]) + kus("k3", 870, 458, 58, KUSY[2]) +
    kus("k4", 730, 540, 60, KUSY[3]) + kus("k5", 884, 540, 62, KUSY[4]) +
    `<path d="M704 372 L664 548 M784 372 L740 548" stroke="#FFFFFF" stroke-width="18" opacity="0.16"/></g>`);
  t.push(`<rect x="684" y="368" width="228" height="184" rx="4" fill="none" stroke="#4E3828" stroke-width="6"/>`);

  /* Dveře: světlo dílny, uvnitř kruh a police */
  const { x0, x1, y0, y1 } = DVERE;
  t.push(`<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="url(#zkd-svetlo)"/>`);
  t.push(`<g opacity="0.32" fill="#8A5A30"><rect x="${x0 + 18}" y="560" width="70" height="6"/><rect x="${x0 + 18}" y="600" width="70" height="6"/>` +
    `<path d="M${x0 + 26} 560 C${x0 + 26} 548 ${x0 + 44} 548 ${x0 + 44} 560 Z M${x0 + 56} 560 L${x0 + 58} 544 H${x0 + 76} L${x0 + 78} 560 Z"/>` +
    `<path d="M${x1 - 112} 690 H${x1 - 16} L${x1 - 26} 712 H${x1 - 102} Z"/><ellipse cx="${x1 - 64}" cy="672" rx="46" ry="9"/><ellipse cx="${x1 - 64}" cy="668" rx="30" ry="6" opacity="0.6"/><path d="M${x1 - 74} 666 C${x1 - 76} 652 ${x1 - 70} 644 ${x1 - 64} 644 C${x1 - 58} 644 ${x1 - 52} 652 ${x1 - 54} 666 Z"/></g>`);
  t.push(`<rect x="${x0 - 6}" y="${y0 - 6}" width="${x1 - x0 + 12}" height="8" fill="url(#zkd-drevo)"/>`);
  t.push(`<rect x="${x0 - 10}" y="${y1}" width="${x1 - x0 + 20}" height="10" fill="#A69A88"/>`);

  /* Vývěsní štít 胡桃工房 nad dveřmi — černý lak a zlato, visí na dvou háčcích z trámu */
  t.push(`<path d="M420 366 V376 M580 366 V376" stroke="#2B2420" stroke-width="2.4"/>`);
  t.push(`<rect x="392" y="372" width="216" height="52" rx="4" fill="#1F1A1D"/><rect x="398" y="378" width="204" height="40" rx="2" fill="none" stroke="#D6A23A" stroke-width="1.6"/>`);
  t.push(`<text x="500" y="408" text-anchor="middle" font-size="27" letter-spacing="9" fill="#F3D27A" font-family="Yuji Syuku, Yu Mincho, serif">胡桃工房</text>`);

  /* Lampiony 修 業 po stranách dveří */
  t.push(lampion(350, 352, "修", "a"));
  t.push(lampion(650, 352, "業", "b"));

  /* ——— Před domem: tráva, šlapáky, kamenná lucerna, nádržka s bambusem ——— */
  t.push(`<rect x="-40" y="${ZEM_Y}" width="1080" height="${STAVBA_H - ZEM_Y + 2}" fill="url(#zkd-trava)"/>`);
  t.push(`<path d="M-40 ${ZEM_Y} H1040" stroke="#5E8A40" stroke-width="2" opacity="0.5"/>`);
  for (const [cx, cy, rx, ry] of [[500, 738, 64, 9], [514, 758, 72, 11], [492, 782, 82, 13]]) {
    t.push(`<ellipse cx="${cx}" cy="${cy + 3}" rx="${rx}" ry="${ry}" fill="#4E6B3A" opacity="0.4"/><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#zkd-kamen)"/>`);
  }
  /* kamenná lucerna tōrō */
  t.push(`<g transform="translate(-74 0)"><rect x="232" y="728" width="44" height="10" rx="2" fill="#8E887C"/><rect x="246" y="690" width="16" height="40" fill="url(#zkd-kamen)"/>` +
    `<path d="M226 692 H282 L274 678 H234 Z" fill="#9A9488"/><rect x="236" y="652" width="36" height="28" fill="#A8A296"/><rect x="246" y="658" width="16" height="16" fill="#FFD993"/>` +
    `<path d="M220 654 Q254 626 288 654 Z" fill="#8E887C"/><circle cx="254" cy="630" r="6" fill="#8E887C"/></g>`);
  /* nádržka tsukubai s bambusovou trubkou, z ní kape */
  t.push(`<g><path d="M812 ${ZEM_Y + 6} C808 700 822 690 860 690 C898 690 912 700 908 ${ZEM_Y + 6} Z" fill="url(#zkd-kamen)"/>` +
    `<ellipse cx="860" cy="694" rx="38" ry="7" fill="#7FAFC8"/><ellipse cx="852" cy="692" rx="14" ry="2.4" fill="#D8EBF2" opacity="0.8"/>` +
    `<path d="M928 ${ZEM_Y} V660 M944 ${ZEM_Y} V672" stroke="#7E9A54" stroke-width="7" stroke-linecap="round"/>` +
    `<path d="M934 668 L890 678" stroke="#9AB766" stroke-width="9" stroke-linecap="round"/><path d="M886 682 V690" stroke="#7FAFC8" stroke-width="2.4" stroke-linecap="round" class="zkd-kapka"/></g>`);
  /* trs trávy a kvítí u domu */
  for (const [x, s] of [[166, 1], [620, 0.8], [960, 1.1], [40, 0.9]]) {
    t.push(`<path d="${chomac(x, ZEM_Y - 2, 26 * s, 12 * s, 9, 700 + x, 0.5)}" fill="#6E9A4B"/>`);
  }

  return `<svg class="zk-stavba-kresba" viewBox="0 0 ${STAVBA_W} ${STAVBA_H}" aria-hidden="true"><defs>${d.join("")}</defs>${t.join("")}</svg>`;
}

/** Krajina za domem: kopce v barvách oblohy, na vzdáleném svahu šplhavá pec z desky a kouř */
export function krajinaSvg(): string {
  const casti: string[] = [];
  casti.push(`<path d="M0 260 C160 214 300 230 440 200 C600 168 760 214 900 196 C1060 176 1240 210 1400 188 C1500 176 1560 180 1600 176 L1600 420 L0 420 Z" style="fill:var(--kopec-daleko)"/>`);
  /* šplhavá pec na protějším kopci */
  const pec: string[] = [];
  [[300, 222], [328, 214], [356, 206], [384, 198], [412, 190]].forEach(([x, y]) =>
    pec.push(`<path d="M${x} ${y + 14} V${y + 4} C${x} ${y - 8} ${x + 28} ${y - 8} ${x + 28} ${y + 4} V${y + 14} Z" fill="#B9876A" opacity="0.85"/>`),
  );
  pec.push(`<rect x="442" y="156" width="10" height="44" fill="#A87A60" opacity="0.85"/>`);
  pec.push(`<path class="zkd-kour-daleko" d="M447 152 C440 134 460 124 450 106 C442 92 458 82 452 66" stroke="#F2EEF4" stroke-width="10" fill="none" stroke-linecap="round" opacity="0.5"/>`);
  casti.push(`<g>${pec.join("")}</g>`);
  casti.push(`<path d="M0 330 C200 300 380 318 560 298 C760 276 960 316 1160 300 C1340 286 1480 300 1600 292 L1600 420 L0 420 Z" style="fill:var(--kopec-blizko)" opacity="0.85"/>`);
  for (const [x, y, rx, ry] of [[120, 312, 70, 22], [380, 300, 90, 24], [700, 296, 80, 20], [1420, 290, 90, 22]]) {
    casti.push(`<path d="${chomac(x, y, rx, ry, 11, 400 + x, 0.5, 0.7)}" style="fill:var(--kopec-blizko)" opacity="0.7"/>`);
  }
  return `<svg class="zk-krajina-kresba" viewBox="0 0 1600 420" preserveAspectRatio="xMidYMax slice" aria-hidden="true">${casti.join("")}</svg>`;
}
