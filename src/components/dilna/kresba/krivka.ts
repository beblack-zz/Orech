/**
 * Pálicí křivka ostrého výpalu — kapitola Ostrý výpal na Dílně.
 *
 * Stoupání je tatáž křivka jako na Partě 2 (kami.ts — krivka): rampy
 * a výdrže, nahoře 1 280 °C. K ní přibylo chladnutí přes noc — čárkovaně
 * a bez čísel, protože jak rychle pec chladne, záleží na peci i na tom,
 * co v ní je. Vodorovně jsou hodiny od zapnutí.
 *
 * Čára má barvu žáru podle teploty: do pěti set stupňů tma, pak třešňová,
 * oranžová a nahoře do žlutobíla — tak doopravdy vypadá vnitřek pece
 * průhledovým otvorem. Stejnou barvu (barvaZaru) bere skript pro žár
 * v kresbě pece, aby oboje svítilo stejně.
 *
 * Kurzor (třída `<p>-kurzor`) posouvá scripts/dilna/vypal.ts podle toho,
 * u které proměny člověk čte. Bez skriptu stojí nahoře na vrcholu.
 */
import { krivka, milniky } from "../../../data/kami";
import { f, smichej, omez } from "./zaklad";

export const KRIVKA_W = 1000;
export const KRIVKA_H = 560;

/* Plocha grafu */
const X0 = 86;
const X1 = 968;
const Y0 = 488;
/** Spodní hrana grafu — kam vede čára od kurzoru */
export const KRIVKA_Y0 = Y0;
const Y1 = 96;
const T_MAX = 1300;
/** Konec stoupání (h) a konec chladnutí — ráno */
export const T_TOP = krivka[krivka.length - 1][0];
export const T_KONEC = 24;

export const kx = (h: number) => X0 + (h / T_KONEC) * (X1 - X0);
export const ky = (T: number) => Y0 - (T / T_MAX) * (Y0 - Y1);

/** Teplota v čase h — stoupání podle dat, chladnutí exponenciálně */
export function teplotaV(h: number): number {
  if (h >= T_TOP) return 20 + 1260 * Math.exp(-(h - T_TOP) / 4.4);
  for (let i = 1; i < krivka.length; i++) {
    const [t0, T0] = krivka[i - 1];
    const [t1, T1] = krivka[i];
    if (h <= t1) return T0 + ((h - t0) / Math.max(0.001, t1 - t0)) * (T1 - T0);
  }
  return krivka[krivka.length - 1][1];
}

/** Kdy stoupání poprvé dojde na teplotu T */
export function casPro(T: number): number {
  for (let i = 1; i < krivka.length; i++) {
    const [t0, T0] = krivka[i - 1];
    const [t1, T1] = krivka[i];
    if (T1 !== T0 && T >= T0 && T <= T1) return t0 + ((T - T0) / (T1 - T0)) * (t1 - t0);
  }
  return T_TOP;
}

/** Barva žáru podle teploty — do 500 °C pec nesvítí */
const ZAR: [number, string][] = [
  [0, "#4A3F3A"],
  [480, "#5C3A2C"],
  [600, "#7E1D10"],
  [750, "#B4290F"],
  [900, "#E2541A"],
  [1020, "#F4852A"],
  [1150, "#FFB443"],
  [1230, "#FFD976"],
  [1290, "#FFF3CF"],
];
export function barvaZaru(T: number): string {
  if (T <= ZAR[0][0]) return ZAR[0][1];
  for (let i = 1; i < ZAR.length; i++) {
    const [a, ca] = ZAR[i - 1];
    const [b, cb] = ZAR[i];
    if (T <= b) return smichej(ca, cb, (T - a) / (b - a));
  }
  return ZAR[ZAR.length - 1][1];
}
/** Jak moc pec svítí: 0 pod 500 °C, 1 nahoře */
export const silaZaru = (T: number) => omez((T - 480) / 800);

/** Body křivky po čtvrthodinách — pro čáru i pro kurzor */
export function bodyKrivky(krok = 0.25): { h: number; T: number; x: number; y: number }[] {
  const body: { h: number; T: number; x: number; y: number }[] = [];
  for (let h = 0; h <= T_KONEC + 1e-6; h += krok) {
    const T = teplotaV(h);
    body.push({ h, T, x: kx(h), y: ky(T) });
  }
  /* Zlomy stoupání přesně, ať jsou rohy ostré tam, kde mají být */
  krivka.forEach(([h]) => {
    if (!body.some((b) => Math.abs(b.h - h) < 1e-6)) {
      const T = teplotaV(h);
      body.push({ h, T, x: kx(h), y: ky(T) });
    }
  });
  return body.sort((a, b) => a.h - b.h);
}

export function krivkaSvg(p = "dkr"): string {
  const defs: string[] = [];
  const s: string[] = [];
  const body = bodyKrivky();
  const nahoru = body.filter((b) => b.h <= T_TOP + 1e-6);
  const dolu = body.filter((b) => b.h >= T_TOP - 1e-6);
  const cara = (bb: typeof body) => bb.map((b, i) => `${i ? "L" : "M"}${f(b.x)} ${f(b.y)}`).join(" ");

  /* Přechod barvy žáru podél osy x — teplota roste s časem a pak klesá */
  const zastavky: string[] = [];
  for (let h = 0; h <= T_KONEC; h += 0.5) {
    zastavky.push(`<stop offset="${f((kx(h) - X0) / (X1 - X0))}" stop-color="${barvaZaru(teplotaV(h))}"/>`);
  }
  defs.push(`<linearGradient id="${p}-zar" gradientUnits="userSpaceOnUse" x1="${X0}" y1="0" x2="${X1}" y2="0">${zastavky.join("")}</linearGradient>`);
  defs.push(`<radialGradient id="${p}-vrchol"><stop offset="0" stop-color="#FFD976" stop-opacity="0.32"/><stop offset="0.5" stop-color="#F4852A" stop-opacity="0.12"/><stop offset="1" stop-color="#7E1D10" stop-opacity="0"/></radialGradient>`);
  defs.push(`<filter id="${p}-zare" x="-10%" y="-30%" width="120%" height="160%"><feGaussianBlur stdDeviation="9"/></filter>`);

  /* Noc — chladnutí za pásem, kde pec dopálila */
  s.push(`<rect x="${f(kx(T_TOP))}" y="${Y1 - 30}" width="${f(X1 - kx(T_TOP))}" height="${Y0 - Y1 + 30}" fill="#0E0C1E" opacity="0.35" rx="10"/>`);

  /* Mřížka a osy */
  for (let T = 200; T <= 1200; T += 200) {
    s.push(`<path d="M${X0} ${f(ky(T))} H${X1}" stroke="#FFFFFF" stroke-width="1" opacity="0.08"/>`);
    s.push(`<text x="${X0 - 14}" y="${f(ky(T) + 7)}" text-anchor="end" font-family="Newsreader, Georgia, serif" font-size="20" fill="#E8DCCB" opacity="0.62">${T}</text>`);
  }
  s.push(`<text x="${X0 - 14}" y="${Y1 - 22}" text-anchor="end" font-family="Newsreader, Georgia, serif" font-size="20" fill="#E8DCCB" opacity="0.62">°C</text>`);
  for (let h = 0; h <= T_KONEC; h += 4) {
    s.push(`<path d="M${f(kx(h))} ${Y0} v8" stroke="#E8DCCB" stroke-width="1.5" opacity="0.4"/>`);
    s.push(`<text x="${f(kx(h))}" y="${Y0 + 34}" text-anchor="middle" font-family="Newsreader, Georgia, serif" font-size="20" fill="#E8DCCB" opacity="0.62">${h} h</text>`);
  }
  s.push(`<path d="M${X0} ${Y0} H${X1}" stroke="#E8DCCB" stroke-width="1.5" opacity="0.35"/>`);

  /* Kde by skončil přežah */
  s.push(`<path d="M${X0} ${f(ky(950))} H${f(kx(casPro(950)))}" stroke="#E8DCCB" stroke-width="1.5" stroke-dasharray="5 7" opacity="0.4"/>`);
  s.push(`<text x="${X0 + 10}" y="${f(ky(950) - 10)}" font-family="Caveat, cursive" font-size="25" fill="#E8DCCB" opacity="0.75">tady by skončil přežah</text>`);

  /* Záře kolem vrcholu — pec je nejjasnější nahoře */
  s.push(`<ellipse cx="${f(kx(T_TOP - 1.2))}" cy="${f(ky(1150))}" rx="230" ry="190" fill="url(#${p}-vrchol)"/>`);
  s.push(`<path d="${cara(nahoru)}" stroke="url(#${p}-zar)" stroke-width="14" fill="none" stroke-linejoin="round" opacity="0.55" filter="url(#${p}-zare)"/>`);
  /* Čára: stoupání plně, chladnutí čárkovaně */
  s.push(`<path d="${cara(nahoru)}" stroke="url(#${p}-zar)" stroke-width="5" fill="none" stroke-linejoin="round" stroke-linecap="round"/>`);
  s.push(`<path d="${cara(dolu)}" stroke="url(#${p}-zar)" stroke-width="4" fill="none" stroke-dasharray="2 10" stroke-linecap="round"/>`);

  /* Popisky fází */
  s.push(`<path d="M${X0} 42 H${f(kx(T_TOP) - 14)}" stroke="#FFE2B8" stroke-width="1.5" opacity="0.4"/><path d="M${f(kx(T_TOP) + 14)} 42 H${X1}" stroke="#C9C2E8" stroke-width="1.5" opacity="0.4"/>`);
  s.push(`<text x="${f((X0 + kx(T_TOP)) / 2)}" y="34" text-anchor="middle" font-family="Caveat, cursive" font-size="32" fill="#FFE2B8">nahoru — skoro celý den</text>`);
  s.push(`<text x="${f((kx(T_TOP) + X1) / 2)}" y="34" text-anchor="middle" font-family="Caveat, cursive" font-size="32" fill="#C9C2E8">dolů — celou noc</text>`);
  /* Výdrž nahoře */
  s.push(`<text x="${f(kx(10.55))}" y="${f(ky(1280) - 22)}" text-anchor="middle" font-family="Caveat, cursive" font-size="24" fill="#FFF3CF">drží se</text>`);
  /* Měsíc nad nocí */
  const mx = kx(19.5);
  const my = Y1 + 46;
  s.push(`<circle cx="${f(mx)}" cy="${f(my)}" r="16" fill="#F4EBC8" opacity="0.9"/><circle cx="${f(mx + 7)}" cy="${f(my - 5)}" r="14" fill="#2A2442"/>`);

  /* Proměny na křivce */
  milniky.forEach((m, i) => {
    const h = casPro(m.teplota);
    const x = kx(h);
    const y = ky(m.teplota);
    s.push(`<g class="${p}-milnik" data-i="${i}">`);
    s.push(`<circle cx="${f(x)}" cy="${f(y)}" r="13" fill="${barvaZaru(m.teplota)}" opacity="0.25"/>`);
    s.push(`<circle cx="${f(x)}" cy="${f(y)}" r="6.5" fill="#1C1830" stroke="${smichej(barvaZaru(m.teplota), "#FFFFFF", 0.3)}" stroke-width="3"/>`);
    s.push(`</g>`);
  });

  /* Kurzor — teď je tady */
  const hk = T_TOP - 0.3;
  s.push(`<g class="${p}-kurzor" transform="translate(${f(kx(hk))} ${f(ky(teplotaV(hk)))})">`);
  s.push(`<path class="${p}-kurzor-cara" d="M0 0 V${f(Y0 - ky(teplotaV(hk)))}" stroke="#FFF3CF" stroke-width="1.5" stroke-dasharray="3 5" opacity="0.6"/>`);
  s.push(`<circle r="22" fill="#FFF3CF" opacity="0.18"/><circle r="10" fill="#FFF8E6"/>`);
  s.push(`</g>`);

  return `<svg viewBox="0 0 ${KRIVKA_W} ${KRIVKA_H}" aria-hidden="true" focusable="false"><defs>${defs.join("")}</defs>${s.join("")}</svg>`;
}
