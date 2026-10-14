/**
 * Razítka komnaty U mistra jako data — jedno za každou úroveň. Stejný střih
 * jako nádražní razítka na Úvodu 2 (uvod2/Razitka.astro): kulatá, dva
 * kruhy, nahoře do oblouku, dole znak. Jen nahoře není jméno dílny, ale
 * jméno zastavení i se čtením, jako má japonské nádraží jméno stanice.
 *
 * Obrázek uprostřed je jen z cest (žádné kruhy ani obdélníky), aby ho šlo
 * nakreslit stejně do SVG na stránce (Razitka.astro) i na plátno, když se
 * mistrovský list stahuje jako obrázek (scripts/zkouska/list-obrazek.ts).
 * Kreslí se jednou barvou (inkoust) a „papírem“ — vyříznutými místy.
 */
import { urovne } from "../../data/mistr";
import type { UrovenId } from "../../data/mistr";

export interface Tah {
  d: string;
  /** Inkoust, nebo papír (vyříznuté místo) */
  papir?: boolean;
  /** Šířka čáry; bez ní se plocha vyplní */
  tl?: number;
  /** Přerušovaná čára */
  carky?: [number, number];
}

const f = (n: number) => +n.toFixed(2);
const kruh = (cx: number, cy: number, r: number) =>
  `M${f(cx - r)} ${f(cy)} A${r} ${r} 0 1 0 ${f(cx + r)} ${f(cy)} A${r} ${r} 0 1 0 ${f(cx - r)} ${f(cy)} Z`;
const elipsa = (cx: number, cy: number, rx: number, ry: number) =>
  `M${f(cx - rx)} ${f(cy)} A${rx} ${ry} 0 1 0 ${f(cx + rx)} ${f(cy)} A${rx} ${ry} 0 1 0 ${f(cx - rx)} ${f(cy)} Z`;
const obdelnik = (x: number, y: number, w: number, h: number, r = 0) =>
  r <= 0
    ? `M${x} ${y} H${f(x + w)} V${f(y + h)} H${x} Z`
    : `M${f(x + r)} ${y} H${f(x + w - r)} Q${f(x + w)} ${y} ${f(x + w)} ${f(y + r)} V${f(y + h - r)} Q${f(x + w)} ${f(y + h)} ${f(x + w - r)} ${f(y + h)} H${f(x + r)} Q${x} ${f(y + h)} ${x} ${f(y + h - r)} V${f(y + r)} Q${x} ${y} ${f(x + r)} ${y} Z`;

/** Okvětí chryzantémy z hnětení — stejný vzorec jako záhyby na Partě 2, jen zmenšený */
const kiku = Array.from({ length: 7 }, (_, i) => {
  const a = -2.4 + i * 0.62;
  const bod = (r: number, u: number) => `${f(57 + Math.cos(u) * r)} ${f(50 + Math.sin(u) * r * 0.72)}`;
  return `M${bod(3, a)} Q${bod(9.5, a + 0.42)} ${bod(15, a + 0.12)}`;
}).join(" ");

export const motivy: Record<UrovenId, Tah[]> = {
  /* Bochník hlíny a drát, který ho právě krojí; Hlínka na něm spí */
  hrouda: [
    { d: "M27 61 C26 51 32 44 41 42 C47 40.5 55 40.5 61 42 C68 44.5 74 51 73 61 Z" },
    { d: "M35 48 C39 45 45 44 49 44", papir: true, tl: 1.8 },
    { d: "M57 41.6 V61", papir: true, tl: 2.4 },
    { d: "M57 28.6 V41.6 M57 61 V63.4", tl: 1.2 },
    { d: obdelnik(52, 25, 10, 3.6, 1.6) },
    { d: obdelnik(52, 63.4, 10, 3.6, 1.6) },
    { d: "M32.6 32.6 H37.4 L32.6 37.4 H37.8", tl: 1.3 },
    { d: "M38.8 27.6 H42.2 L38.8 31.2 H42.4", tl: 1.1 },
  ],
  /* Hrouda prohnětená do chryzantémy, z ní utíká bublinka */
  hneteni: [
    { d: "M26 59 C24 47 34 38 49 38 C64 38 75 46 74 58 C73 63.5 27.5 64 26 59 Z" },
    { d: kiku, papir: true, tl: 1.5 },
    { d: "M33 46 C35 43 39 41.5 43 41", papir: true, tl: 1.6 },
    { d: kruh(67, 32, 4.2), tl: 1.5 },
    { d: kruh(65.6, 30.6, 1) },
    { d: kruh(73.6, 38.4, 1.9), tl: 1.1 },
  ],
  /* Kapka nad hroudou, která běží přesně na středu hlavy kruhu */
  voda: [
    { d: "M50 23.5 C53.2 28.4 55.4 31 55.4 33.8 A5.4 5.4 0 0 1 44.6 33.8 C44.6 31 46.8 28.4 50 23.5 Z" },
    { d: "M47.6 33.4 C47.6 32 48.4 30.8 49.2 30", papir: true, tl: 1.2 },
    { d: elipsa(50, 59.5, 22, 5.2) },
    { d: elipsa(50, 59.3, 15, 3), papir: true, tl: 0.9 },
    { d: "M38.5 57.6 C37.5 49.5 43 43 50 43 C57 43 62.5 49.5 61.5 57.6 Z" },
    { d: "M39.6 57.4 C43 58.8 57 58.8 60.4 57.4", papir: true, tl: 1.4 },
    { d: "M42 50.5 C46 52 54 52 58 50.5 M44 46 C47 47.2 53 47.2 56 46", papir: true, tl: 1.1 },
    { d: "M28.5 51 H34 M66 51 H71.5", tl: 1.6 },
  ],
  /* Váza na kruhu, osa a prstence od točení, vedle žebro */
  tvar: [
    { d: "M50 23 V28.6 M50 66.4 V68", tl: 1, carky: [1.6, 1.6] },
    { d: "M43.6 29.6 C45.6 30.4 45.6 32 45 34 C44 37.5 37.6 41.5 37.6 50.5 C37.6 57.4 42 61.6 44 62.6 L56 62.6 C58 61.6 62.4 57.4 62.4 50.5 C62.4 41.5 56 37.5 55 34 C54.4 32 54.4 30.4 56.4 29.6 Z" },
    { d: "M40.4 46 C45 47.6 55 47.6 59.6 46 M39.2 52.6 C44.6 54.4 55.4 54.4 60.8 52.6 M41.2 58.6 C45.6 60 54.4 60 58.8 58.6", papir: true, tl: 1.1 },
    { d: "M42.2 41.6 C43.6 39.6 45 38.6 46.4 38", papir: true, tl: 1.5 },
    { d: elipsa(50, 64.4, 17, 3.2) },
    { d: "M66.5 40 C70.5 41 72 46 70.5 50.5 C69.6 53 67.6 53.6 66.6 52 C68.4 48.4 68 44 66.5 40 Z" },
  ],
  /* Kachel naplocho a na něm vodováha s bublinkou přesně uprostřed */
  rovina: [
    { d: "M29 51 L61 51 L71 43.4 L39 43.4 Z" },
    { d: "M29 51 L61 51 L61 56.4 L29 56.4 Z" },
    { d: "M61 51 L71 43.4 L71 48.8 L61 56.4 Z" },
    { d: "M29 51.1 H61 L71 43.5", papir: true, tl: 1.1 },
    { d: "M37.6 49.4 L43.4 45 M45.6 49.4 L51.4 45 M53.6 49.4 L59.4 45", papir: true, tl: 0.9 },
    { d: obdelnik(38.4, 34.6, 31, 7.8, 3.9) },
    { d: obdelnik(47, 36.3, 14, 4.4, 2.2), papir: true },
    { d: kruh(54, 38.5, 1.6) },
    { d: "M50.4 36.5 V40.5 M57.6 36.5 V40.5", tl: 0.7 },
  ],
  /* Destička ema s pečetí, na šňůrce */
  jmeno: [
    { d: "M50 30.4 Q46 26 50 21.6", tl: 1.4 },
    { d: "M31 45 L50 32.4 L69 45 V61 Q69 63.4 66.6 63.4 H33.4 Q31 63.4 31 61 Z" },
    { d: "M28.6 45.6 L50 31 L71.4 45.6", tl: 2.6 },
    { d: "M31.6 47.6 L50 35.2 L68.4 47.6", papir: true, tl: 1 },
    { d: obdelnik(43.4, 45.6, 13.2, 13.2, 1.4), papir: true },
    { d: obdelnik(45.4, 47.6, 9.2, 9.2, 0.8) },
    { d: "M48.4 49.4 V55 M51.6 49.4 V55 M47.2 52.2 H52.8", papir: true, tl: 1.1 },
    { d: kruh(50, 35.4, 1.3), papir: true },
  ],
  /* Police v peci na sloupcích, mezi nimi kusy; spodní je Šamotka a usmívá se */
  police: [
    { d: obdelnik(28.6, 31, 42.8, 2.8, 0.8) },
    { d: obdelnik(28.6, 45.4, 42.8, 2.8, 0.8) },
    { d: obdelnik(27.6, 59.4, 44.8, 5.4, 1.4) },
    { d: obdelnik(30.4, 33.8, 2.4, 11.6) + " " + obdelnik(67.2, 33.8, 2.4, 11.6) },
    { d: obdelnik(30.4, 48.2, 2.4, 11.2) + " " + obdelnik(67.2, 48.2, 2.4, 11.2) },
    { d: "M37 38.6 C37 43 40 45.4 43.4 45.4 C46.8 45.4 49.8 43 49.8 38.6 Z" },
    { d: "M54.4 45.4 L53.6 36.6 H62.6 L61.8 45.4 Z" },
    { d: "M62.6 38.6 C65.4 38.6 65.4 42.8 62.4 42.8", tl: 1.3 },
    { d: "M41.6 59.4 C38.6 57 38.6 52.4 40.8 50.6 C41.6 50 41.6 49 41 48.2 H46.2 C45.6 49 45.6 50 46.4 50.6 C48.6 52.4 48.6 57 45.6 59.4 Z" },
    { d: "M52.6 53.4 C52.6 57.4 55.4 59.4 58.6 59.4 C61.8 59.4 64.6 57.4 64.6 53.4 Z" },
    { d: kruh(46, 62, 0.9) + " " + kruh(54, 62, 0.9), papir: true },
    { d: "M48.4 63 Q50 63.9 51.6 63", papir: true, tl: 0.7 },
  ],
  /* Plamen Pecinky a pod ním shimenawa se dvěma shide */
  ohen: [
    { d: "M50 22.4 C54.6 28.6 62 33.6 62 43.6 C62 51.6 56.6 56.4 50 56.4 C43.4 56.4 38 51.6 38 43.6 C38 38.4 41 35 43.4 30.6 C44.4 34.6 46.2 36.6 48.4 37 C47.4 32 47.8 27 50 22.4 Z" },
    { d: "M50 38.6 C53 42.4 55.2 45.4 55.2 48.6 C55.2 52 52.8 54 50 54 C47.2 54 44.8 52 44.8 48.6 C44.8 45.6 47.2 43 50 38.6 Z", papir: true },
    { d: "M30.6 58.4 Q50 64.6 69.4 58.4", tl: 3.4 },
    { d: "M35 58.6 L37.4 61.4 M40.6 60.2 L43 62.8 M46.6 61.2 L49 63.6 M52.6 61.2 L55 63.4 M58.4 60.4 L60.8 62.6 M64 59 L66.2 61.2", papir: true, tl: 0.9 },
    { d: "M40.6 62 L42.6 64.2 L40.4 65.4 L42.4 67.4 M59.4 62 L57.4 64.2 L59.6 65.4 L57.6 67.4", tl: 1.3 },
  ],
  /* Miska slepená zlatem — v razítku jsou spáry papírové; nad ní jiskra */
  strep: [
    { d: "M27.6 41.6 H72.4 C72.4 54 63.4 61.6 50 61.6 C36.6 61.6 27.6 54 27.6 41.6 Z" },
    { d: obdelnik(43.4, 61, 13.2, 3.4, 1) },
    { d: "M30.4 44.2 H69.6", papir: true, tl: 0.9 },
    { d: "M41.4 41.6 L44.4 47.6 L41.8 52.6 L45.6 58.4 M58.6 41.6 L56.4 46.6 L60.4 50.8 L57.6 55.6 L59.4 60.2", papir: true, tl: 1.7 },
    { d: "M44.4 47.6 L50.6 49.4", papir: true, tl: 1.3 },
    { d: "M66 28.4 L67.2 32 L70.8 33.2 L67.2 34.4 L66 38 L64.8 34.4 L61.2 33.2 L64.8 32 Z" },
    { d: kruh(58, 31, 1) },
  ],
};

/** Nápis do oblouku: jméno zastavení a čtení, verzálkami */
export const napisRazitka = (id: UrovenId) => {
  const u = urovne.find((x) => x.id === id)!;
  return `${u.stanice} · ${u.cteni}`.toLocaleUpperCase("cs-CZ");
};
export const znakRazitka = (id: UrovenId) => urovne.find((x) => x.id === id)!.znak;

/** Barva inkoustu podle pásu desky: učeň rumělka, tovaryš indigo, zkouška na mistra murasaki */
export const INKOUSTY = ["#C4432B", "#2F4C8E", "#6B3E8C"] as const;
export const inkoustRazitka = (id: UrovenId) => INKOUSTY[Math.floor(urovne.findIndex((u) => u.id === id) / 3)] ?? INKOUSTY[0];

/** Oblouk nápisu (horní půlkruh) a kruhy rámečku */
export const OBLOUK = "M17.5 50 A32.5 32.5 0 0 1 82.5 50";
export const KRUHY: Tah[] = [
  { d: kruh(50, 50, 46), tl: 3.6 },
  { d: kruh(50, 50, 40.5), tl: 1.1 },
  { d: kruh(13.6, 60, 1.5) + " " + kruh(86.4, 60, 1.5) },
];

const papirCSS = "var(--mrz-papir, #F7F1E3)";

/** Tahy jako SVG — inkoust je currentColor, papír proměnná --mrz-papir */
export function tahySvg(tahy: Tah[]) {
  return tahy
    .map((t) => {
      const barva = t.papir ? papirCSS : "currentColor";
      if (t.tl === undefined) return `<path d="${t.d}" fill="${barva}"/>`;
      const carky = t.carky ? ` stroke-dasharray="${t.carky.join(" ")}"` : "";
      return `<path d="${t.d}" fill="none" stroke="${barva}" stroke-width="${t.tl}" stroke-linecap="round" stroke-linejoin="round"${carky}/>`;
    })
    .join("");
}

/** Vnitřek <symbol> razítka: rámeček, nápis do oblouku (odkaz na cestu #mrz-oblouk), obrázek a znak */
export function razitkoObsah(id: UrovenId) {
  const napis = napisRazitka(id);
  return (
    tahySvg(KRUHY) +
    `<text font-size="${napis.length > 15 ? 6.4 : 7.2}" letter-spacing="1.1" fill="currentColor" font-family="Fraunces Variable, Fraunces, Georgia, serif" font-weight="700"><textPath href="#mrz-oblouk" startOffset="50%" text-anchor="middle">${napis}</textPath></text>` +
    `<text x="50" y="81" text-anchor="middle" font-size="15" fill="currentColor" font-family="Yuji Syuku, Yu Mincho, serif">${znakRazitka(id)}</text>` +
    tahySvg(motivy[id])
  );
}
