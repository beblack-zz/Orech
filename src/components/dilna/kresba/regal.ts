/**
 * Regál v dílně — úvod stránky Dílna. Na zdi dvě černé lišty a prkna
 * z překližky (jako doopravdy: prkna jdou přendat do jakékoli výšky)
 * a na nich jeden a tentýž hrnek ve všech stavech, od hroudy po
 * vypálený kus. Čte se zleva doprava a shora dolů. Je vidět, jak hlína
 * cestou mění barvu a lesk — a že se zmenšuje.
 *
 * Ráno, světlo z okna mimo obraz zleva shora: na zdi leží světlý
 * kosodélník s křížem rámu a jde přes spodní prkno, takže hotový hrnek
 * se leskne. Stín každého kusu padá na zeď doprava.
 *
 * Štítky pod kusy (odkazy na kapitoly) a postavičky jsou HTML nad
 * kresbou — jejich místa jsou tu v souřadnicích viewBoxu (KUSY, MISTA).
 */
import { nadoba, hrouda, SMRST, OBRYSY, ELIPSA } from "./nadoba";
import type { Stav, Tvar } from "./nadoba";
import { P, f, svisly, mekkyStin, smichej, nahoda } from "./zaklad";

export const REGAL_W = 1000;
export const REGAL_H = 900;

/** Horní hrana čela prkna; kusy stojí kousek za ní */
const PRKNA = [420, 780];
const HLOUBKA = 30;
const CELO = 22;
const STOJI = (b: number) => b - 11;

export interface KusNaRegalu {
  stav: Stav | "hrouda";
  tvar: Tvar;
  x: number;
  prkno: 0 | 1;
  /** Štítek: jak se stavu říká a kam vede */
  nazev: string;
  kam: string;
  /** Kdy — jen slovně, délky kroků dílna neslibuje */
  pozn: string;
}

export const KUSY: KusNaRegalu[] = [
  { stav: "hrouda", tvar: "hrnek", x: 228, prkno: 0, nazev: "hrouda", kam: "#hlina", pozn: "vyhnětená, bez bublin" },
  { stav: "mokry", tvar: "valec", x: 420, prkno: 0, nazev: "mokrý", kam: "#tvar", pozn: "právě z kruhu" },
  { stav: "kozeny", tvar: "hrnek", x: 610, prkno: 0, nazev: "kožený", kam: "#suseni", pozn: "obrobený, s uchem" },
  { stav: "suchy", tvar: "hrnek", x: 806, prkno: 0, nazev: "suchý", kam: "#suseni", pozn: "připravený do pece" },
  { stav: "prezah", tvar: "hrnek", x: 236, prkno: 1, nazev: "přežah", kam: "#prezah", pozn: "po prvním výpalu" },
  { stav: "syrova", tvar: "hrnek", x: 448, prkno: 1, nazev: "v glazuře", kam: "#glazura", pozn: "glazura je zatím křída" },
  { stav: "hotovy", tvar: "hrnek", x: 660, prkno: 1, nazev: "hotový", kam: "#vypal", pozn: "po ostrém výpalu" },
];

/** Výška mokrého hrnku */
const VYSKA = 168;

/** Kde visí štítek — pod čelem prkna, pod kusem */
export const stitek = (k: KusNaRegalu) => ({ x: k.x, y: PRKNA[k.prkno] + CELO + 6 });

/** Postavičky: x osa, y kde stojí, w šířka plátna 180 × 180 */
export const MISTA_REGAL = {
  hlinka: { x: 92, y: STOJI(PRKNA[0]) + 14, w: 128 },
  vazicka: { x: 862, y: STOJI(PRKNA[1]) + 18, w: 168 },
};

/** Obrys kusu jako hrubý tvar pro stín na zdi */
function stinNaZdi(k: KusNaRegalu, dx: number) {
  const y = STOJI(PRKNA[k.prkno]);
  if (k.stav === "hrouda") {
    return `<ellipse cx="${f(k.x + dx)}" cy="${f(y - 46)}" rx="62" ry="48"/>`;
  }
  const H = VYSKA * SMRST[k.stav];
  const r = OBRYSY[k.tvar];
  const w = r(0.5) * H;
  const ucho = k.tvar === "hrnek" ? H * 0.3 : 0;
  return `<rect x="${f(k.x - w + dx)}" y="${f(y - H - w * ELIPSA)}" width="${f(w * 2 + ucho)}" height="${f(H + w * ELIPSA)}" rx="${f(w * 0.4)}"/>`;
}

function prkno(b: number, p: string, i: number) {
  const x0 = 34;
  const x1 = 966;
  const s: string[] = [];
  /* Stín prkna na zdi */
  s.push(`<rect x="${x0}" y="${b + CELO - 4}" width="${x1 - x0}" height="56" fill="url(#${p}-stin-prkna)"/>`);
  /* Konzole pod prknem u lišt */
  for (const lx of [150, 850]) {
    s.push(`<path d="M${lx - 9} ${b + CELO} h18 v36 l-18 -12 Z" fill="${P.lista}"/>`);
  }
  /* Vršek prkna — vidíme ho trochu shora */
  s.push(`<rect x="${x0}" y="${b - HLOUBKA}" width="${x1 - x0}" height="${HLOUBKA}" fill="url(#${p}-vrsek)"/>`);
  s.push(`<path d="M${x0} ${b - HLOUBKA + 0.5} H${x1}" stroke="${P.preklizkaStin}" stroke-width="1" opacity="0.5"/>`);
  /* Čelo s vrstvami překližky */
  s.push(`<rect x="${x0}" y="${b}" width="${x1 - x0}" height="${CELO}" fill="${P.preklizkaHrana}"/>`);
  for (let k = 1; k < 6; k++) {
    const yy = b + (CELO * k) / 6;
    s.push(`<path d="M${x0} ${f(yy)} H${x1}" stroke="${k % 2 ? P.preklizkaSvetlo : P.preklizkaStin}" stroke-width="${k % 2 ? 1.2 : 0.9}" opacity="${k % 2 ? 0.75 : 0.5}"/>`);
  }
  s.push(`<path d="M${x0} ${b + 0.6} H${x1}" stroke="#FFF4E0" stroke-width="1.2" opacity="0.7"/>`);
  s.push(`<rect x="${x0}" y="${b + CELO - 3}" width="${x1 - x0}" height="3" fill="${P.preklizkaStin}" opacity="0.6"/>`);
  /* Hřebíčky na štítky */
  KUSY.filter((k) => k.prkno === i).forEach((k) => {
    s.push(`<circle cx="${k.x}" cy="${b + CELO - 6}" r="2.4" fill="#8A8F94"/><circle cx="${k.x - 0.6}" cy="${b + CELO - 6.6}" r="0.9" fill="#E6EAEC"/>`);
  });
  return s.join("");
}

/* ——— Konec stránky: prkno s hotovými kusy a jedno místo volné ——— */

export const POLICKA_W = 1000;
export const POLICKA_H = 330;
const POLICKA_B = 236;
/** Volné místo — tady bude stát tvůj kus; štítek visí pod ním */
export const VOLNE = { x: 640, y: POLICKA_B + CELO + 6 };

export function polickaSvg(p = "dpk"): string {
  const defs: string[] = [];
  const s: string[] = [];
  defs.push(
    svisly(`${p}-vrsek`, smichej(P.preklizkaSvetlo, P.preklizka, 0.4), P.preklizka),
    svisly(`${p}-stin-prkna`, "#3A2A1C", "#3A2A1C", 0.2, 0),
    `<radialGradient id="${p}-svetlo" cx="0.42" cy="0.55" r="0.6"><stop offset="0" stop-color="#FFE3B0" stop-opacity="0.6"/><stop offset="1" stop-color="#FFE3B0" stop-opacity="0"/></radialGradient>`,
  );
  /* Ranní světlo zezadu — prkno leží na papíře */
  s.push(`<ellipse cx="460" cy="170" rx="520" ry="190" fill="url(#${p}-svetlo)"/>`);
  const b = POLICKA_B;
  const x0 = 60;
  const x1 = 940;
  s.push(`<rect x="${x0}" y="${b + CELO - 4}" width="${x1 - x0}" height="40" fill="url(#${p}-stin-prkna)"/>`);
  for (const lx of [170, 830]) s.push(`<path d="M${lx - 9} ${b + CELO} h18 v34 l-18 -12 Z" fill="${P.lista}"/>`);
  s.push(`<rect x="${x0}" y="${b - HLOUBKA}" width="${x1 - x0}" height="${HLOUBKA}" fill="url(#${p}-vrsek)"/>`);
  s.push(`<rect x="${x0}" y="${b}" width="${x1 - x0}" height="${CELO}" fill="${P.preklizkaHrana}"/>`);
  for (let k = 1; k < 6; k++) {
    const yy = b + (CELO * k) / 6;
    s.push(`<path d="M${x0} ${f(yy)} H${x1}" stroke="${k % 2 ? P.preklizkaSvetlo : P.preklizkaStin}" stroke-width="${k % 2 ? 1.2 : 0.9}" opacity="${k % 2 ? 0.75 : 0.5}"/>`);
  }
  s.push(`<path d="M${x0} ${b + 0.6} H${x1}" stroke="#FFF4E0" stroke-width="1.2" opacity="0.7"/>`);
  const y = STOJI(b);
  s.push(nadoba({ id: `${p}-1`, tvar: "miska", stav: "hotovy", glazura: "tenmoku", x: 190, y, vyska: 74 }));
  s.push(nadoba({ id: `${p}-2`, tvar: "yunomi", stav: "hotovy", glazura: "shino", x: 335, y, vyska: 150 }));
  s.push(nadoba({ id: `${p}-3`, tvar: "hrnek", stav: "hotovy", glazura: "železitá hnědá", x: 470, y, vyska: 150 }));
  s.push(nadoba({ id: `${p}-4`, tvar: "vaza", stav: "hotovy", glazura: "popelová šedá", x: 810, y, vyska: 168 }));
  /* Volné místo: čárkovaný obrys hrnku — boky, celý okraj, přední oblouk dna a ucho */
  const H = 150 * SMRST.hotovy;
  const r = OBRYSY.hrnek;
  const vx = VOLNE.x;
  const r0 = r(0) * H;
  const rt = r(1) * H;
  const ry0 = r0 * ELIPSA;
  const yDno = y - ry0;
  const yTop = yDno - H;
  const cara = `stroke="${P.rumelka}" stroke-width="2.4" stroke-dasharray="7 8" stroke-linecap="round" fill="none" opacity="0.75"`;
  s.push(`<ellipse cx="${vx}" cy="${f(yDno)}" rx="${f(r0)}" ry="${f(ry0)}" fill="${P.preklizkaStin}" opacity="0.3"/>`);
  s.push(`<path d="M${f(vx - r0)} ${f(yDno)} L${f(vx - rt)} ${f(yTop)} M${f(vx + r0)} ${f(yDno)} L${f(vx + rt)} ${f(yTop)}" ${cara}/>`);
  s.push(`<ellipse cx="${vx}" cy="${f(yTop)}" rx="${f(rt)}" ry="${f(rt * ELIPSA)}" ${cara}/>`);
  s.push(`<path d="M${f(vx - r0)} ${f(yDno)} A${f(r0)} ${f(ry0)} 0 0 0 ${f(vx + r0)} ${f(yDno)}" ${cara}/>`);
  s.push(`<path d="M${f(vx + rt - 2)} ${f(yTop + H * 0.2)} C${f(vx + rt + H * 0.36)} ${f(yTop + H * 0.17)} ${f(vx + rt + H * 0.34)} ${f(yTop + H * 0.72)} ${f(vx + rt - 2)} ${f(yTop + H * 0.74)}" ${cara}/>`);
  s.push(`<circle cx="${vx}" cy="${b + CELO - 6}" r="2.4" fill="#8A8F94"/>`);
  return `<svg viewBox="0 0 ${POLICKA_W} ${POLICKA_H}" aria-hidden="true" focusable="false"><defs>${defs.join("")}</defs>${s.join("")}</svg>`;
}

export function regalSvg(p = "drg"): string {
  const defs: string[] = [];
  const s: string[] = [];

  defs.push(
    `<linearGradient id="${p}-zed" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#EADFCB"/><stop offset="0.5" stop-color="#E2D4BC"/><stop offset="1" stop-color="#CDBB9C"/></linearGradient>`,
    svisly(`${p}-vrsek`, smichej(P.preklizkaSvetlo, P.preklizka, 0.4), P.preklizka),
    svisly(`${p}-stin-prkna`, "#3A2A1C", "#3A2A1C", 0.22, 0),
    `<linearGradient id="${p}-svetlo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFBEF" stop-opacity="0.95"/><stop offset="0.6" stop-color="#FFF1D2" stop-opacity="0.8"/><stop offset="1" stop-color="#FFE6B8" stop-opacity="0.55"/></linearGradient>`,
    `<linearGradient id="${p}-paprsek" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF6DE" stop-opacity="0.55"/><stop offset="0.7" stop-color="#FFF6DE" stop-opacity="0.12"/><stop offset="1" stop-color="#FFF6DE" stop-opacity="0"/></linearGradient>`,
    `<linearGradient id="${p}-lista" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${P.lista}"/><stop offset="0.35" stop-color="${P.listaSvetlo}"/><stop offset="1" stop-color="${P.lista}"/></linearGradient>`,
    `<filter id="${p}-rozmaz" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="9"/></filter>`,
    `<filter id="${p}-mekce" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="7"/></filter>`,
    mekkyStin(`${p}-podlozka`, "#2B2420", 0.3),
    `<linearGradient id="${p}-podl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${P.drevoStin}"/><stop offset="0.35" stop-color="${P.drevoSvetlo}"/><stop offset="1" stop-color="${P.drevoStin}"/></linearGradient>`,
  );

  /* Zeď */
  s.push(`<rect width="${REGAL_W}" height="${REGAL_H}" fill="url(#${p}-zed)"/>`);

  /*
   * Světlo z okna: kosodélník na zdi s křížem rámu. Jde šikmo přes horní
   * i spodní prkno, nejjasnější je kolem hotového hrnku.
   */
  const okno = (dx: number, dy: number, w: number, h: number) => {
    const sk = 0.42;
    return `M${dx} ${dy} l${w} ${f(w * sk)} l0 ${h} l${-w} ${f(-w * sk)} Z`;
  };
  s.push(`<g class="${p}-okno" filter="url(#${p}-mekce)">`);
  s.push(`<path d="${okno(330, 168, 470, 470)}" fill="url(#${p}-svetlo)"/>`);
  /* Kříž rámu — svislá a vodorovná příčka ve stínu */
  s.push(`<path d="M${330 + 235 - 12} ${f(168 + 235 * 0.42 - 6)} l24 ${f(24 * 0.42)} l0 470 l-24 ${f(-24 * 0.42)} Z" fill="#E2D4BC"/>`);
  s.push(`<path d="M330 ${168 + 235 - 10} l470 ${f(470 * 0.42)} l0 22 l-470 ${f(-470 * 0.42)} Z" fill="#E2D4BC"/>`);
  s.push(`</g>`);
  /* Paprsek ve vzduchu — od levého horního rohu */
  s.push(`<path class="${p}-paprsek" d="M0 0 L240 0 L900 ${REGAL_H} L380 ${REGAL_H} Z" fill="url(#${p}-paprsek)" opacity="0.55"/>`);

  /* Lišty regálu s dírkami na konzole */
  for (const lx of [150, 850]) {
    s.push(`<rect x="${lx - 8}" y="0" width="16" height="${REGAL_H}" fill="url(#${p}-lista)"/>`);
    for (let y = 18; y < REGAL_H; y += 26) s.push(`<rect x="${lx - 2.5}" y="${y}" width="5" height="12" rx="2" fill="#141210" opacity="0.85"/>`);
  }

  /* Stíny kusů na zdi — padají doprava */
  s.push(`<g fill="#3A2A1C" opacity="0.13" filter="url(#${p}-rozmaz)">${KUSY.map((k) => stinNaZdi(k, 26)).join("")}</g>`);

  /* Prkna */
  PRKNA.forEach((b, i) => s.push(prkno(b, p, i)));

  /* Kusy */
  KUSY.forEach((k, i) => {
    const y = STOJI(PRKNA[k.prkno]);
    if (k.stav === "hrouda") {
      s.push(hrouda({ id: `${p}-h`, x: k.x, y, s: 96, druh: "homole" }));
      return;
    }
    if (k.stav === "mokry") {
      /* Čerstvý kus stojí na dřevěné podložce, na které se točil */
      s.push(`<ellipse cx="${k.x + 8}" cy="${y + 2}" rx="96" ry="16" fill="url(#${p}-podlozka)"/>`);
      s.push(`<path d="M${k.x - 82} ${y - 4} A82 15 0 0 0 ${k.x + 82} ${y - 4} L${k.x + 82} ${y - 11} A82 15 0 0 1 ${k.x - 82} ${y - 11} Z" fill="url(#${p}-podl)"/>`);
      s.push(`<ellipse cx="${k.x}" cy="${y - 11}" rx="82" ry="15" fill="${P.drevoSvetlo}"/>`);
      s.push(`<ellipse cx="${k.x}" cy="${y - 11}" rx="60" ry="10.5" fill="none" stroke="${P.drevo}" stroke-width="1" opacity="0.4"/>`);
      s.push(nadoba({ id: `${p}-k${i}`, tvar: k.tvar, stav: k.stav, x: k.x, y: y - 13, vyska: VYSKA, stin: false }));
      return;
    }
    s.push(nadoba({ id: `${p}-k${i}`, tvar: k.tvar, stav: k.stav, glazura: "celadon", x: k.x, y, vyska: VYSKA }));
  });

  /* Na horním prkně leží obráběcí očko — kožený kus se obráběl */
  const ox = 700;
  const oy = STOJI(PRKNA[0]) + 4;
  s.push(`<g transform="rotate(-8 ${ox} ${oy})">`);
  s.push(`<rect x="${ox}" y="${oy - 5}" width="62" height="10" rx="5" fill="${P.drevo}"/>`);
  s.push(`<rect x="${ox}" y="${oy - 5}" width="62" height="4" rx="2" fill="${P.drevoSvetlo}" opacity="0.7"/>`);
  s.push(`<path d="M${ox + 60} ${oy - 2} h10 a9 7 0 1 1 0 6 h-10" fill="none" stroke="#9AA3A8" stroke-width="2.2"/>`);
  s.push(`</g>`);
  /* Hotový hrnek chytá světlo */
  const hk = KUSY[6];
  const hy = STOJI(PRKNA[1]) - VYSKA * SMRST.hotovy * 0.78;
  s.push(`<g class="${p}-jiskra" transform="translate(${hk.x - 34} ${f(hy)})"><path d="M0 -11 L2.2 -2.2 L11 0 L2.2 2.2 L0 11 L-2.2 2.2 L-11 0 L-2.2 -2.2 Z" fill="#FFFFFF" opacity="0.9"/></g>`);

  /* Prach v paprsku — pár zrnek, ne mlha */
  const rnd = nahoda(23);
  const zrnka: string[] = [];
  for (let i = 0; i < 14; i++) {
    const t = rnd();
    const x = 120 + t * 560 + (rnd() - 0.5) * 120;
    const y = t * 640 + 40 + (rnd() - 0.5) * 60;
    zrnka.push(`<circle class="${p}-zrnko" style="--z:${i}" cx="${f(x)}" cy="${f(y)}" r="${f(1 + rnd() * 1.6)}" fill="#FFFFFF" opacity="${f(0.35 + rnd() * 0.4)}"/>`);
  }
  s.push(`<g class="${p}-prach">${zrnka.join("")}</g>`);

  return `<svg viewBox="0 0 ${REGAL_W} ${REGAL_H}" aria-hidden="true" focusable="false"><defs>${defs.join("")}</defs>${s.join("")}</svg>`;
}
