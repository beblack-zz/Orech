/**
 * Stavba jeviště kagura-den pro divadlo na /parta-3 — čelní pohled.
 * Kresba je jen dřevo kolem: střecha s prohnutým štítem, vlys, na kterém
 * visí lampiony, dva sloupy, práh a schůdky. Otvor mezi sloupy je prázdný;
 * scénu, oponu a lampiony do něj pokládá stránka (Divadlo.astro) podle
 * rozměrů níže, v procentech téhle kresby.
 *
 * viewBox 0 0 1000 1300. Střecha přesahuje přes okraje (overflow: visible) —
 * na širokém okně je vidět celá, na úzkém ji ořízne okraj stránky a jeviště
 * zůstane přes celou šířku.
 */
import { strecha, B } from "./chram";

/**
 * Otvor jeviště (čtverec), vlys a pás, kde visí lampiony — v jednotkách
 * kresby. Lampiony visí z okapu přes vlys; podle LAMPIONY je rozmísťuje
 * parta3.css (v procentech).
 */
export const OTVOR = { x: 70, y: 350, s: 860 };
export const VLYS = { y: 254, v: 96 };
export const LAMPIONY = { y: 215, v: 135 };
export const PLATNO = { s: 1000, v: 1300 };

const f = (n: number) => Math.round(n * 10) / 10;

export function jeviste() {
  const O = OTVOR;
  const dno = O.y + O.s; /* 1210: horní hrana prahu */
  let s =
    `<defs>` +
    `<linearGradient id="jv-sloup-l" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7C2A22"/><stop offset="0.55" stop-color="${B.rumelka}"/><stop offset="1" stop-color="#9A3226"/></linearGradient>` +
    `<linearGradient id="jv-sloup-p" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9A3226"/><stop offset="0.45" stop-color="${B.rumelkaSvetlo}"/><stop offset="1" stop-color="${B.rumelka}"/></linearGradient>` +
    `<linearGradient id="jv-vlys" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#241A2B"/><stop offset="1" stop-color="#3B2B38"/></linearGradient>` +
    `<linearGradient id="jv-prah" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D9B58C"/><stop offset="0.3" stop-color="#B98A62"/><stop offset="1" stop-color="#7A5644"/></linearGradient>` +
    `<linearGradient id="jv-pod" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A1F2C"/><stop offset="1" stop-color="#2A1F2C" stop-opacity="0"/></linearGradient>` +
    `<linearGradient id="jv-stit" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5961A0"/><stop offset="1" stop-color="#3A4278"/></linearGradient>` +
    `</defs>`;

  /* ——— střecha: široká, s prohnutým štítem karahafu nad středem ——— */
  /* v noci pod lampiony: střecha je světlejší než nebe za ní a okap chytá teplé světlo zespodu */
  const NOCNI = { barva: "#434C84", stin: "#262B55", svetlo: "#B9B4E4", zare: "obe" as const };
  s += strecha(500, 58, 560, 1270, 196, 46, { tasky: 25, ...NOCNI });
  /* hřebenáče na koncích hřebene: zlaté ploutve, které se zvedají ven */
  for (const k of [-1, 1]) {
    const x = 500 + k * 280;
    s += `<path d="M${x - k * 16} 58 Q${x + k * 6} 44 ${x + k * 30} 14 Q${x + k * 30} 44 ${x + k * 18} 58 Z" fill="${B.zlato}"/>`;
    s += `<path d="M${x - k * 16} 58 Q${x + k * 6} 44 ${x + k * 30} 14" fill="none" stroke="#FFF1C4" stroke-width="1.6" stroke-linecap="round" opacity="0.8"/>`;
  }
  /* štít: oblouk, který se na krajích zvedá zpátky do okapu */
  const stit = `M318 262 C352 262 380 232 420 190 C456 152 480 138 500 138 C520 138 544 152 580 190 C620 232 648 262 682 262`;
  s += `<path d="${stit} L682 278 L318 278 Z" fill="url(#jv-stit)"/>`;
  s += `<path d="${stit}" fill="none" stroke="#262B55" stroke-width="16" stroke-linecap="round"/>`;
  s += `<path d="${stit}" fill="none" stroke="${B.zlato}" stroke-width="3" stroke-linecap="round" transform="translate(0 -6)" opacity="0.9"/>`;
  /* ve štítu kruh ze značky se sakurou — erb divadla */
  s += `<circle cx="500" cy="183" r="27" fill="#241A2B"/>`;
  s += `<path d="M481 194.500 A22.500 22.500 0 1 1 517 198" fill="none" stroke="${B.zlato}" stroke-width="4.4" stroke-linecap="round"/>`;
  for (let i = 0; i < 5; i++) s += `<ellipse cx="500" cy="176" rx="3.7" ry="6.1" fill="#F2B5C4" transform="rotate(${i * 72} 500 183)"/>`;
  s += `<circle cx="500" cy="183" r="2.6" fill="${B.zlato}"/>`;

  /* ——— vlys: tmavé břevno, na kterém visí řada lampionů ——— */
  s += `<rect x="-6" y="${VLYS.y}" width="1012" height="${O.y - VLYS.y}" fill="url(#jv-vlys)"/>`;
  s += `<rect x="-16" y="${VLYS.y - 6}" width="1032" height="14" rx="3" fill="${B.drevo}"/><rect x="-16" y="${VLYS.y - 6}" width="1032" height="3" rx="1.5" fill="#8A6A72" opacity="0.8"/>`;
  /* kování na koncích trámů a tyč, na které lampiony visí */
  for (const x of [-16, 1004]) s += `<rect x="${x}" y="${VLYS.y - 6}" width="12" height="14" rx="2" fill="${B.zlato}"/>`;
  s += `<rect x="${O.x - 20}" y="${VLYS.y + 12}" width="${O.s + 40}" height="5" rx="2.5" fill="#15101A"/>`;
  /* spodní hrana vlysu: řasená látka v barvách opony */
  const pruhy = ["#2A2C5E", B.rumelka, "#D6A23A"];
  const n = 43;
  for (let i = 0; i < n; i++) {
    const x = O.x + (O.s / n) * i;
    s += `<path d="M${f(x)} ${O.y - 20} H${f(x + O.s / n + 0.4)} V${O.y + 8} Q${f(x + O.s / n / 2)} ${O.y + 20} ${f(x)} ${O.y + 8} Z" fill="${pruhy[i % 3]}"/>`;
  }
  s += `<rect x="${O.x}" y="${O.y - 24}" width="${O.s}" height="6" fill="#15101A"/>`;

  /* ——— sloupy ——— */
  for (const k of [-1, 1]) {
    const x = k < 0 ? 18 : 930;
    s += `<rect x="${x}" y="${VLYS.y + 8}" width="52" height="${dno + 26 - VLYS.y - 8}" fill="url(#jv-sloup-${k < 0 ? "l" : "p"})"/>`;
    /* objímky nahoře a dole */
    s += `<rect x="${x - 3}" y="${O.y - 2}" width="58" height="16" rx="2" fill="#15101A"/><rect x="${x - 3}" y="${O.y + 1}" width="58" height="3" fill="${B.zlato}" opacity="0.9"/>`;
    s += `<rect x="${x - 3}" y="${dno - 34}" width="58" height="34" rx="2" fill="#15101A"/><rect x="${x - 3}" y="${dno - 30}" width="58" height="3" fill="${B.zlato}" opacity="0.9"/>`;
  }

  /* ——— práh jeviště, pod ním tma, kůly a schůdky ——— */
  s += `<rect x="-22" y="${dno + 26}" width="1044" height="74" fill="url(#jv-pod)"/>`;
  for (const x of [40, 250, 750, 960]) s += `<rect x="${x - 9}" y="${dno + 24}" width="18" height="66" fill="#2A1F2C"/>`;
  let mriz = "";
  for (let x = 70; x < 380; x += 26) mriz += `M${x} ${dno + 26} V${dno + 78} `;
  for (let x = 646; x < 950; x += 26) mriz += `M${x} ${dno + 26} V${dno + 78} `;
  s += `<path d="${mriz}" stroke="#4A3340" stroke-width="5" opacity="0.8"/>`;
  s += `<rect x="-22" y="${dno}" width="1044" height="28" rx="4" fill="url(#jv-prah)"/>`;
  s += `<rect x="-22" y="${dno}" width="1044" height="4" rx="2" fill="#F1D9B4" opacity="0.9"/>`;
  /* schůdky: tři stupně, dolů širší */
  for (let i = 0; i < 3; i++) {
    const w = 210 + i * 34, y = dno + 28 + i * 22;
    s += `<rect x="${500 - w / 2}" y="${y}" width="${w}" height="22" fill="${i % 2 ? "#8E6A52" : "#A47C5E"}"/><rect x="${500 - w / 2}" y="${y}" width="${w}" height="3.4" fill="#E2C39A" opacity="0.85"/>`;
  }

  return `<svg viewBox="0 0 ${PLATNO.s} ${PLATNO.v}" aria-hidden="true" focusable="false">${s}</svg>`;
}

/** Papírový lampion čóčin pro řadu nad jevištěm; erb doprostřed pokládá stránka. viewBox 0 0 60 80. */
export function lampion(id: string) {
  return (
    `<svg class="lampion-kresba" viewBox="0 0 60 80" aria-hidden="true" focusable="false">` +
    `<defs><radialGradient id="${id}-p" cx="0.5" cy="0.46" r="0.6"><stop offset="0" class="lampion-stred"/><stop offset="1" class="lampion-kraj"/></radialGradient></defs>` +
    `<path d="M30 0 V7" stroke="#15101A" stroke-width="1.6"/>` +
    `<ellipse cx="30" cy="40" rx="25" ry="29" fill="url(#${id}-p)"/>` +
    `<path d="M7.5 28 Q30 33 52.500 28 M5.200 40 Q30 45 54.800 40 M7.500 52 Q30 57 52.500 52 M13 62 Q30 66 47 62 M13 18.500 Q30 22.500 47 18.500" fill="none" stroke="#8E5A2E" stroke-width="0.7" opacity="0.4"/>` +
    `<rect x="17" y="6.5" width="26" height="7" rx="2" fill="#15101A"/><rect x="17" y="6.5" width="26" height="1.6" rx="0.8" fill="#6B5560"/>` +
    `<rect x="17" y="66.500" width="26" height="6.500" rx="2" fill="#15101A"/>` +
    `<path d="M30 73 V79" stroke="#C4432B" stroke-width="2.4" stroke-linecap="round"/>` +
    `</svg>`
  );
}
