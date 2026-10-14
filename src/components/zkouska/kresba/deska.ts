/**
 * Deska sugoroku — malovaná desková hra, po které se jde k mistrovi.
 * Japonské e-sugoroku bývaly cesty: od 振出し (start) přes stanice až
 * k 上がり (cíl). Tahle vede z dílny v Ořechu přes devět zastavení cesty
 * hlíny nahoru do síně mistra.
 *
 *   dole      vesnice ráno: dílna, ořech, stůl pod stříškou, potok   一 二 三
 *   uprostřed kopce v poledne: altán s kruhem, sušák, svatyňka s ema  四 五 六
 *   nahoře    hora navečer: šplhavá pec noborigama, čajovna           七 八 九
 *   vrchol    síň mistra v mracích                                    上がり
 *
 * Pásy dělí zlaté pruhy mlhy (suyari-gasumi), na nich jsou stupně.
 * Kresba je čistá funkce: vrací SVG jako text (Deska.astro ho vkládá
 * přes set:html) a souřadnice políček, podle kterých se nad kresbu
 * kladou tlačítka. Náhoda je deterministická, ať se deska při každém
 * buildu nepřekreslí jinak.
 */
import { chomac, nahoda } from "../../parta2/tvary";
import { urovne, stupne } from "../../../data/mistr";
import type { UrovenId } from "../../../data/mistr";

export const DESKA_W = 1200;
export const DESKA_H = 1400;

/** Středy políček ve viewBoxu 1200 × 1400 */
export const POLICKA: Record<UrovenId, [number, number]> = {
  hrouda: [330, 1200],
  hneteni: [610, 1222],
  voda: [905, 1168],
  tvar: [925, 878],
  rovina: [615, 905],
  jmeno: [305, 872],
  police: [295, 575],
  ohen: [595, 602],
  strep: [905, 568],
};
export const START: [number, number] = [148, 1318];
export const SIN: [number, number] = [600, 250];

const f = (n: number) => Math.round(n * 10) / 10;

/** Hladká cesta přes body (Catmull-Rom převedený na kubické Bézierovy křivky) */
function hladce(body: [number, number][]) {
  let d = `M${f(body[0][0])} ${f(body[0][1])}`;
  for (let i = 0; i < body.length - 1; i++) {
    const p0 = body[i - 1] ?? body[i];
    const p1 = body[i];
    const p2 = body[i + 1];
    const p3 = body[i + 2] ?? p2;
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

const p = (id: UrovenId) => POLICKA[id];
/** Kudy vede cesta: od dveří dílny přes políčka a zatáčky až do síně */
const CESTA: [number, number][] = [
  [147, 1336], [214, 1300], p("hrouda"), p("hneteni"), p("voda"), [1085, 1030], p("tvar"), p("rovina"), p("jmeno"),
  [118, 728], p("police"), p("ohen"), p("strep"), [1072, 430], [860, 318], SIN,
];
export const cestaD = hladce(CESTA);

/** Pruh mlhy: protáhlý ovál se zlatým lemem, jako na japonských malbách */
function mlha(x: number, y: number, w: number, h: number) {
  const r = h / 2;
  return `M${f(x + r)} ${f(y)} H${f(x + w - r)} A${f(r)} ${f(r)} 0 0 1 ${f(x + w - r)} ${f(y + h)} H${f(x + r)} A${f(r)} ${f(r)} 0 0 1 ${f(x + r)} ${f(y)} Z`;
}

/** Borovice — patra jehličí jako chomáče */
function borovice(x: number, y: number, s: number, seed: number) {
  const r = nahoda(seed);
  const patra = [0, 1, 2].map((i) => chomac(x + (r() - 0.5) * 10 * s, y - (18 + i * 22) * s, (34 - i * 8) * s, (12 - i * 1.5) * s, 9, seed + i, 0.6, 0.7));
  return (
    `<path d="M${f(x)} ${f(y)} C${f(x - 3 * s)} ${f(y - 30 * s)} ${f(x + 4 * s)} ${f(y - 50 * s)} ${f(x + 1 * s)} ${f(y - 70 * s)}" stroke="#6B4E36" stroke-width="${f(5 * s)}" fill="none" stroke-linecap="round"/>` +
    patra.map((d, i) => `<path d="${d}" fill="${["#4E6B4C", "#5A7A55", "#678A5E"][i]}"/>`).join("")
  );
}

/** Střecha s prohnutými konci (irimoya z boku zjednodušeně) */
function strecha(x: number, y: number, w: number, h: number, barva: string) {
  const previs = w * 0.12;
  return `<path d="M${f(x - previs)} ${f(y + h)} Q${f(x + w * 0.08)} ${f(y + h * 0.82)} ${f(x + w * 0.2)} ${f(y + h * 0.35)} L${f(x + w * 0.8)} ${f(y + h * 0.35)} Q${f(x + w * 0.92)} ${f(y + h * 0.82)} ${f(x + w + previs)} ${f(y + h)} Z" fill="${barva}"/>` +
    `<path d="M${f(x + w * 0.18)} ${f(y + h * 0.36)} Q${f(x + w * 0.5)} ${f(y - h * 0.05)} ${f(x + w * 0.82)} ${f(y + h * 0.36)} Z" fill="${barva}"/>` +
    `<path d="M${f(x - previs)} ${f(y + h)} Q${f(x + w * 0.08)} ${f(y + h * 0.82)} ${f(x + w * 0.2)} ${f(y + h * 0.35)} L${f(x + w * 0.8)} ${f(y + h * 0.35)} Q${f(x + w * 0.92)} ${f(y + h * 0.82)} ${f(x + w + previs)} ${f(y + h)}" fill="none" stroke="#2B2420" stroke-opacity="0.35" stroke-width="2"/>`;
}

export function deskaSvg(): string {
  const r = nahoda(4242);
  const casti: string[] = [];
  const defs: string[] = [];

  defs.push(
    `<linearGradient id="msd-papir" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F3E6CB"/><stop offset="1" stop-color="#F6ECD8"/></linearGradient>`,
    `<linearGradient id="msd-nebe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E7C9A8"/><stop offset="0.55" stop-color="#F1DDC0"/><stop offset="1" stop-color="#F3E6CB" stop-opacity="0"/></linearGradient>`,
    `<linearGradient id="msd-hora-1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8C8FB8"/><stop offset="1" stop-color="#B4B4CC"/></linearGradient>`,
    `<linearGradient id="msd-hora-2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7A88A6"/><stop offset="1" stop-color="#A3AFB9"/></linearGradient>`,
    `<linearGradient id="msd-svah" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#93A98A"/><stop offset="1" stop-color="#A9BD8F"/></linearGradient>`,
    `<linearGradient id="msd-kopce" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A7BE88"/><stop offset="1" stop-color="#BACB94"/></linearGradient>`,
    `<linearGradient id="msd-pole" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C2D09A"/><stop offset="1" stop-color="#D3DBAE"/></linearGradient>`,
    `<linearGradient id="msd-voda" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7FAFC8"/><stop offset="0.5" stop-color="#A9CEDD"/><stop offset="1" stop-color="#7FAFC8"/></linearGradient>`,
    `<radialGradient id="msd-zare" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#FFF4CC"/><stop offset="0.5" stop-color="#F7D98C" stop-opacity="0.55"/><stop offset="1" stop-color="#F3D27A" stop-opacity="0"/></radialGradient>`,
    `<radialGradient id="msd-ohen" cx="0.5" cy="0.6" r="0.6"><stop offset="0" stop-color="#FFE6A0"/><stop offset="0.5" stop-color="#F08A3C"/><stop offset="1" stop-color="#C4432B" stop-opacity="0"/></radialGradient>`,
    `<linearGradient id="msd-mlha" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFBF0"/><stop offset="1" stop-color="#F6EBD2"/></linearGradient>`,
    `<clipPath id="msd-orez"><rect x="40" y="40" width="1120" height="1320" rx="6"/></clipPath>`,
  );

  /* ——— Papír a rám ——— */
  casti.push(`<rect width="${DESKA_W}" height="${DESKA_H}" rx="18" fill="url(#msd-papir)"/>`);

  const krajina: string[] = [];
  krajina.push(`<rect x="40" y="40" width="1120" height="520" fill="url(#msd-nebe)"/>`);

  /* Slunce v zádech síně a zlaté mraky */
  krajina.push(`<circle cx="600" cy="190" r="190" fill="url(#msd-zare)"/>`);
  krajina.push(`<circle cx="600" cy="186" r="62" fill="#F3C978" opacity="0.55"/>`);

  /* ——— Hory ——— */
  krajina.push(`<path d="M40 470 L170 330 L250 380 L380 230 L470 300 L600 150 L730 300 L820 240 L960 390 L1050 320 L1160 420 L1160 640 L40 640 Z" fill="url(#msd-hora-1)" opacity="0.75"/>`);
  krajina.push(`<path d="M600 150 L640 196 L622 206 L604 188 L586 210 L566 198 Z" fill="#F8F2E6" opacity="0.9"/>`);
  krajina.push(`<path d="M380 230 L410 262 L396 268 L382 252 L366 266 L356 258 Z" fill="#F8F2E6" opacity="0.85"/>`);
  krajina.push(`<path d="M40 560 C150 470 260 520 360 450 C450 390 520 430 600 400 C690 368 760 420 860 400 C960 380 1060 430 1160 400 L1160 720 L40 720 Z" fill="url(#msd-hora-2)" opacity="0.8"/>`);

  /* ——— Svah zkoušky na mistra ——— */
  krajina.push(`<path d="M40 640 C200 560 340 600 470 540 C600 482 720 520 860 500 C980 484 1080 520 1160 500 L1160 760 L40 760 Z" fill="url(#msd-svah)"/>`);

  /* Šplhavá pec noborigama: komory po svahu nahoru, nahoře komín s kouřem */
  const komory = [[96, 520], [176, 500], [256, 480], [336, 460], [416, 440], [496, 420]];
  const pec: string[] = [];
  komory.forEach(([x, y], i) => {
    pec.push(`<path d="M${x} ${y + 40} V${y + 8} C${x} ${y - 26} ${x + 84} ${y - 26} ${x + 84} ${y + 8} V${y + 40} Z" fill="${i % 2 ? "#B9876A" : "#C4957A"}" stroke="#6E4A36" stroke-width="2" stroke-opacity="0.55"/>`);
    pec.push(`<path d="M${x + 6} ${y - 2} C${x + 22} ${y - 16} ${x + 62} ${y - 16} ${x + 78} ${y - 2}" stroke="#E2B99A" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.7"/>`);
    pec.push(`<path d="M${x + 29} ${y + 40} V${y + 22} A13 13 0 0 1 ${x + 55} ${y + 22} V${y + 40} Z" fill="#3A2A22"/>`);
    if (i === 4) pec.push(`<path d="M${x + 31} ${y + 40} V${y + 24} A11 11 0 0 1 ${x + 53} ${y + 24} V${y + 40} Z" fill="url(#msd-ohen)"/>`);
  });
  pec.push(`<rect x="592" y="352" width="28" height="108" fill="#A87A60" stroke="#6E4A36" stroke-opacity="0.5" stroke-width="2"/><rect x="588" y="346" width="36" height="10" fill="#8E6450"/>`);
  pec.push(`<path d="M606 342 C594 316 624 304 610 276 C600 254 626 240 614 216" stroke="#C9C2CF" stroke-width="18" fill="none" stroke-linecap="round" opacity="0.5"/>`);
  krajina.push(`<g>${pec.join("")}</g>`);

  /* Čajovna se zlatem a lampiony */
  krajina.push(`<g transform="translate(26 0)"><rect x="940" y="470" width="150" height="70" fill="#EADBC0" stroke="#6E5236" stroke-opacity="0.5" stroke-width="2"/>` +
    `<path d="M962 540 V478 M1010 540 V478 M1058 540 V478" stroke="#8A6A48" stroke-width="3"/>` +
    `<rect x="968" y="490" width="34" height="38" fill="#F7EEDC"/><rect x="1016" y="490" width="34" height="38" fill="#F3D27A" opacity="0.85"/>` +
    strecha(930, 432, 170, 48, "#4A4A56") +
    `<path d="M944 482 V500 M1086 482 V500" stroke="#5C5047" stroke-width="1.5"/>` +
    `<ellipse cx="944" cy="508" rx="8" ry="10" fill="#E2643A"/><ellipse cx="1086" cy="508" rx="8" ry="10" fill="#E2643A"/></g>`);

  /* Borovice na svahu */
  [[110, 700, 0.9], [700, 560, 0.8], [800, 548, 1], [1110, 560, 0.9], [1000, 640, 0.7]].forEach(([x, y, s], i) => krajina.push(borovice(x, y, s, 300 + i * 7)));

  /* ——— Kopce tovaryše ——— */
  krajina.push(`<path d="M40 760 C180 700 320 730 460 700 C600 670 740 720 880 700 C1000 684 1090 700 1160 690 L1160 1060 L40 1060 Z" fill="url(#msd-kopce)"/>`);

  /* Altán s kruhem (四 Tvar) */
  krajina.push(`<g><path d="M960 800 V872 M1100 800 V872" stroke="#6E5236" stroke-width="6"/>` +
    strecha(944, 752, 172, 56, "#B4523A") +
    `<ellipse cx="1030" cy="860" rx="34" ry="9" fill="#7E858C"/><path d="M1016 856 C1014 840 1022 830 1030 830 C1038 830 1046 840 1044 856 Z" fill="#9C7860"/>` +
    `<rect x="1020" y="866" width="20" height="18" fill="#5E656B"/></g>`);

  /* Sušák s talíři na slunci (五 Rovina) */
  krajina.push(`<g><path d="M650 760 V850 M760 760 V850" stroke="#8A6A48" stroke-width="5"/>` +
    [778, 808, 838].map((y) => `<rect x="640" y="${y}" width="130" height="5" fill="#8A6A48"/>`).join("") +
    [[664, 776], [700, 776], [736, 776], [670, 806], [712, 806], [748, 806]].map(([x, y]) => `<ellipse cx="${x}" cy="${y - 3}" rx="15" ry="4" fill="#DCCDBA" stroke="#9C8670" stroke-width="1"/>`).join("") +
    `<rect x="686" y="820" width="22" height="18" fill="#C9A184"/><rect x="718" y="822" width="16" height="16" fill="#E2D2BC"/></g>`);

  /* Svatyňka se stojanem ema (六 Jméno) */
  krajina.push(`<g><rect x="150" y="770" width="70" height="56" fill="#C4432B"/>` + strecha(140, 738, 90, 36, "#3E3A44") +
    `<path d="M160 826 V790 M210 826 V790" stroke="#8E2E1F" stroke-width="4"/>` +
    `<rect x="236" y="790" width="96" height="6" fill="#8A6A48"/><path d="M240 796 V836 M328 796 V836" stroke="#8A6A48" stroke-width="5"/>` +
    [248, 268, 288, 308].map((x, i) => `<path d="M${x} ${800 + (i % 2) * 6} l8 -5 l8 5 v14 h-16 Z" fill="#E8C99A" stroke="#8A6A48" stroke-width="1"/>`).join("") + `</g>`);

  [[80, 980, 0.8], [520, 760, 0.7], [1140, 960, 0.8], [420, 1000, 0.6]].forEach(([x, y, s], i) => krajina.push(borovice(x, y, s, 500 + i * 11)));

  /* ——— Vesnice učně ——— */
  krajina.push(`<path d="M40 1060 C200 1020 360 1050 520 1030 C700 1008 860 1050 1000 1030 C1080 1020 1130 1030 1160 1026 L1160 1360 L40 1360 Z" fill="url(#msd-pole)"/>`);
  /* Políčka a meze */
  krajina.push(`<g stroke="#A9B97C" stroke-width="2" fill="none" opacity="0.7"><path d="M60 1110 C200 1100 300 1120 420 1108"/><path d="M700 1090 C780 1084 860 1094 940 1086"/><path d="M460 1300 C560 1290 680 1306 780 1296"/></g>`);

  /* Potok od hory přes celou desku dolů, most u 三 */
  const potok = "M1150 640 C1090 700 1110 760 1060 820 C1010 880 1090 950 1060 1010 C1030 1070 960 1090 990 1160 C1015 1220 1080 1260 1100 1360";
  krajina.push(`<path d="${potok}" stroke="#7FAFC8" stroke-width="40" fill="none" stroke-linecap="round"/>`);
  krajina.push(`<path d="${potok}" stroke="#B9DCE8" stroke-width="10" fill="none" stroke-linecap="round" stroke-dasharray="26 34" opacity="0.8"/>`);

  /* Ořech nad 一 (pod ním spí Hlínka) */
  krajina.push(`<path d="M352 1176 C350 1140 356 1110 348 1080 M348 1100 C330 1090 318 1080 312 1060 M352 1094 C372 1084 386 1070 392 1052" stroke="#5E4632" stroke-width="12" fill="none" stroke-linecap="round"/>`);
  krajina.push(`<path d="${chomac(350, 1010, 120, 74, 16, 77, 0.8)}" fill="#6E8F57"/>`);
  krajina.push(`<path d="${chomac(332, 998, 88, 52, 13, 78, 0.8)}" fill="#7FA064" opacity="0.9"/>`);
  for (let i = 0; i < 9; i++) krajina.push(`<circle cx="${f(270 + r() * 170)}" cy="${f(975 + r() * 70)}" r="4.5" fill="#B9C46E" opacity="0.9"/>`);

  /* Stříška se stolem na hnětení (二) */
  krajina.push(`<g><path d="M548 1150 V1104 M672 1150 V1104" stroke="#6E5236" stroke-width="5"/>` + strecha(536, 1074, 148, 40, "#4A4A56") +
    `<rect x="560" y="1128" width="100" height="10" fill="#A79F92"/><path d="M590 1128 C588 1116 600 1108 612 1110 C624 1112 630 1120 628 1128 Z" fill="#9C7860"/></g>`);

  /* Studna u potoka (三) */
  krajina.push(`<g transform="translate(-64 52)"><rect x="800" y="1060" width="56" height="30" rx="4" fill="#9A9488"/><path d="M806 1060 V1024 M850 1060 V1024" stroke="#6E5236" stroke-width="4"/>` +
    `<path d="M796 1026 L828 1008 L860 1026 Z" fill="#4A4A56"/><path d="M828 1030 V1046" stroke="#5C5047" stroke-width="1.5"/><rect x="822" y="1046" width="12" height="10" fill="#8A6A48"/></g>`);

  /* Dílna u startu — dům s norenem, odsud se vychází */
  krajina.push(`<g><rect x="58" y="1238" width="176" height="96" fill="#EFE6D2" stroke="#6E5236" stroke-opacity="0.45" stroke-width="2"/>` +
    strecha(50, 1188, 192, 60, "#4A4A56") +
    `<rect x="122" y="1268" width="50" height="66" fill="#FFE2A8"/>` +
    `<path d="M122 1268 H172 V1298 H148 V1290 H146 V1298 H122 Z" fill="#C4432B"/><path d="M147 1268 V1298" stroke="#F6F1E6" stroke-width="1.2"/>` +
    `<rect x="72" y="1256" width="36" height="30" fill="#BFD3DC" stroke="#8A6A48" stroke-width="2"/><rect x="186" y="1256" width="36" height="30" fill="#BFD3DC" stroke="#8A6A48" stroke-width="2"/>` +
    `<rect x="98" y="1214" width="92" height="20" rx="3" fill="#2B2420"/><text x="144" y="1230" text-anchor="middle" font-size="15" fill="#F3D27A" font-family="Yuji Syuku, Yu Mincho, serif" letter-spacing="6">工房</text></g>`);

  /* Keříky a kvítí po vesnici */
  [[470, 1140], [760, 1140], [1010, 1250], [520, 1330], [880, 1320], [250, 1080]].forEach(([x, y], i) => {
    krajina.push(`<path d="${chomac(x, y, 30, 15, 9, 900 + i, 0.6)}" fill="#7FA064" opacity="0.85"/>`);
  });

  /* ——— Cesta ——— */
  krajina.push(`<path d="${cestaD}" stroke="#B89A6A" stroke-width="54" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.55"/>`);
  krajina.push(`<path d="${cestaD}" stroke="#EBDAB2" stroke-width="44" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`);
  krajina.push(`<path class="msd-stopa" d="${cestaD}" stroke="#C9AD7C" stroke-width="3" fill="none" stroke-dasharray="2 14" stroke-linecap="round"/>`);
  /* Most přes potok mezi 三 a zatáčkou */
  krajina.push(`<g><path d="M1012 1102 C1040 1086 1080 1078 1110 1080" stroke="#8A6A48" stroke-width="8" fill="none"/><path d="M1006 1124 C1036 1106 1078 1098 1114 1100" stroke="#C4432B" stroke-width="6" fill="none"/>` +
    `<path d="M1016 1102 V1122 M1046 1090 V1110 M1076 1082 V1102 M1106 1080 V1100" stroke="#8E2E1F" stroke-width="4"/></g>`);

  /* ——— Mlha mezi pásy a stupně ——— */
  const pasy: { y: number; x: number; w: number; stupen: number }[] = [
    { y: 1028, x: 420, w: 560, stupen: 0 },
    { y: 712, x: 200, w: 640, stupen: 1 },
    { y: 376, x: 300, w: 520, stupen: 2 },
  ];
  for (const pas of pasy) {
    const s = stupne[pas.stupen];
    krajina.push(`<path d="${mlha(pas.x - 140, pas.y + 18, pas.w * 0.55, 22)}" fill="url(#msd-mlha)" opacity="0.85"/>`);
    krajina.push(`<path d="${mlha(pas.x, pas.y - 18, pas.w, 40)}" fill="url(#msd-mlha)" stroke="#D9B66A" stroke-width="2"/>`);
    krajina.push(`<path d="${mlha(pas.x + pas.w * 0.55, pas.y + 26, pas.w * 0.5, 20)}" fill="url(#msd-mlha)" stroke="#D9B66A" stroke-width="1.4" opacity="0.9"/>`);
    krajina.push(`<text x="${pas.x + pas.w / 2}" y="${pas.y + 10}" text-anchor="middle" font-size="25" fill="#2B2420"><tspan font-family="Yuji Syuku, Yu Mincho, serif" fill="#C4432B" font-size="27">${s.znak}</tspan><tspan font-family="Fraunces Variable, Fraunces, Georgia, serif" font-weight="600" letter-spacing="2" dx="14" font-size="18">${s.pas.toLocaleUpperCase("cs-CZ")}</tspan></text>`);
  }

  /* ——— Síň mistra na vrcholu ——— */
  krajina.push(`<g><path d="${chomac(600, 312, 230, 40, 18, 61, 0.5)}" fill="#FBF6EA" stroke="#D9B66A" stroke-width="2"/>` +
    `<rect x="520" y="230" width="160" height="70" fill="#F4E7CC" stroke="#6E5236" stroke-opacity="0.5" stroke-width="2"/>` +
    `<path d="M536 300 V236 M600 300 V236 M664 300 V236" stroke="#8E2E1F" stroke-width="5"/>` +
    strecha(502, 168, 196, 66, "#3E3A44") +
    `<path d="M596 168 V150 M604 168 V150" stroke="#D6A23A" stroke-width="3"/><circle cx="600" cy="146" r="6" fill="#D6A23A"/>` +
    `<rect x="548" y="248" width="104" height="38" fill="#FFF4D6"/><text x="600" y="276" text-anchor="middle" font-size="24" fill="#6B3E8C" font-family="Yuji Syuku, Yu Mincho, serif" letter-spacing="4">名人</text></g>`);

  casti.push(`<g clip-path="url(#msd-orez)">${krajina.join("")}</g>`);

  /* Rám: dvojitá linka a rohy s květem */
  casti.push(`<rect x="22" y="22" width="${DESKA_W - 44}" height="${DESKA_H - 44}" rx="10" fill="none" stroke="#2B2420" stroke-width="3"/>`);
  casti.push(`<rect x="34" y="34" width="${DESKA_W - 68}" height="${DESKA_H - 68}" rx="6" fill="none" stroke="#C4432B" stroke-width="2"/>`);
  for (const [x, y] of [[34, 34], [DESKA_W - 34, 34], [34, DESKA_H - 34], [DESKA_W - 34, DESKA_H - 34]]) {
    casti.push(`<g transform="translate(${x} ${y})"><rect x="-13" y="-13" width="26" height="26" fill="#F5EAD3" stroke="#C4432B" stroke-width="2" transform="rotate(45)"/><circle r="5" fill="#C4432B"/></g>`);
  }

  /* Titulek do svislé kartuše vlevo nahoře: 修業双六 */
  casti.push(`<g><rect x="62" y="62" width="74" height="250" rx="4" fill="#C4432B"/><rect x="70" y="70" width="58" height="234" rx="2" fill="none" stroke="#F6E7C8" stroke-width="1.5"/>` +
    ["修", "業", "双", "六"].map((z, i) => `<text x="99" y="${118 + i * 52}" text-anchor="middle" font-size="40" fill="#FFF8EA" font-family="Yuji Syuku, Yu Mincho, serif">${z}</text>`).join("") + `</g>`);

  /* Start: rozcestník 振出し */
  casti.push(`<g><path d="M250 1350 V1288" stroke="#6E5236" stroke-width="5"/><rect x="226" y="1262" width="48" height="34" rx="3" fill="#F7EEDC" stroke="#6E5236" stroke-width="2"/>` +
    `<text x="250" y="1286" text-anchor="middle" font-size="17" fill="#2B2420" font-family="Yuji Syuku, Yu Mincho, serif">振出</text></g>`);

  return `<svg class="msd-kresba" viewBox="0 0 ${DESKA_W} ${DESKA_H}" aria-hidden="true"><defs>${defs.join("")}</defs>${casti.join("")}</svg>`;
}

/** Pořadí úrovní na desce, jak jdou po cestě */
export const poradi = urovne.map((u) => u.id);
