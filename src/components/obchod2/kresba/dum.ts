/**
 * Krámek — dům: dvě střechy, patro s oknem (kusy z Japonska), balkon
 * se spící kočkou a plechová stříška nad přízemím. Pravidla a rozměry
 * jsou v zaklad.ts, souřadnice jsou body světa.
 *
 *   zadni   hlavní střecha z prejzů (hřeben z planěk, oni-gawara na
 *           koncích, nároží, čela s mitsudomoe, krokve pod okapem),
 *           spodní střecha z plechu na lištách se žlabem a svodem, zeď
 *           patra s trámy a omítkou, elektroměr, větrák, zvonek fūrin,
 *           gekon (家守 — „strážce domu“, nosí štěstí)
 *   uvnitr  pokojík za oknem: zadní stěna, strop, čtyři papírové lampičky
 *           nad kusy, krabice z paulovnie za příčkami, svitky po krajích,
 *           daruma, kalendář s 大安, police (na ní stojí kusy z Japonska)
 *   predni  rám okna s příčkami a odleskem, srolovaná rohož sudare,
 *           klimatizace, zábradlí s praporem 航空便 / Z Japonska, truhlík,
 *           kytka na sloupku, kočka, plechová stříška s táhly, stín spodní
 *           střechy na štítu
 *   svetla  okno patra: lampičky, záře v horní části tabulek, světlo na
 *           hraně police, odlesk na rámu a zábradlí
 *
 * Stavba je souměrná podle X.stred: tašky, žebra, krokve, nároží, lišty
 * plechu, sloupky zábradlí, vlny stříšky i její táhla vycházejí z osy.
 * Světlo jde zleva shora — světlé hrany vlevo nahoře, stíny doprava dolů.
 */
import { P, SVIT, PISMO, PRAH, TRIDY, X, Y, OKNO, PRIZEMI, svetlo, f, obdelnik, mnohouhelnik, cara, kruh, elipsa, nahoda } from "./zaklad";
import type { Vrstvy, Obdelnik, Bod } from "./zaklad";

/*
 * Roční období (stejně jako okoli.ts, CSS v obchod2.css pod [data-sezona]):
 *   snih              zimní čepice na hřebeni, okapech, zábradlí a stříšce
 *   koruna-zem sak-*  okvětní lístky sakury (na podzim listí) od stromu
 *                     za rohem — na pravé straně střech, stříšky a na kočce
 */
const SNIH = "#FBFDFF";
const snih = (obsah: string) => `<g class="snih">${obsah}</g>`;
/** Lístek sakury (barvu bere ze sak-2 / sak-3, výplň je záloha a noční přebarvení) */
const listek = (x: number, y: number, u: number, k = 2) =>
  `<path class="koruna-zem sak-${k}" fill="${k === 2 ? "#EBA9A6" : "#F7CFCB"}" d="M0 0c1.6 -3 5.4 -3.4 7 -0.6l-1.4 0.6 1.4 0.6c-1.6 2.8 -5.4 2.4 -7 -0.6Z" transform="translate(${f(x)} ${f(y)}) rotate(${u})"/>`;

/* ——— Pomocné ——— */

/** Osa souměrnosti stavby */
const S = X.stred;
/** Zrcadlo podle osy (skupina vpravo je stejná jako vlevo) */
const ZRCADLO = `transform="matrix(-1 0 0 1 ${2 * S} 0)"`;
const zrc = (x: number) => 2 * S - x;

const bodyCesty = (p: Bod[]) => p.map(([x, y]) => `${f(x)} ${f(y)}`).join(" L");
/** Uzavřená cesta z bodů (do jedné cesty jde dát víc tvarů) */
const tvar = (p: Bod[]) => `M${bodyCesty(p)}Z`;

/** Hodně obdélníků stejné barvy jako jedna cesta */
const obdelniky = (r: [number, number, number, number][], atributy: string) =>
  r.length ? `<path d="${r.map(([x, y, w, h]) => `M${f(x)} ${f(y)}h${f(w)}v${f(h)}h${f(-w)}z`).join("")}" ${atributy}/>` : "";

/** Body křivky y = fn(x) od x0 do x1 (oběma směry) */
function krivka(x0: number, x1: number, fn: (x: number) => number, krok = 8): Bod[] {
  const n = Math.max(1, Math.ceil(Math.abs(x1 - x0) / krok));
  return Array.from({ length: n + 1 }, (_, i) => {
    const x = x0 + ((x1 - x0) * i) / n;
    return [x, fn(x)] as Bod;
  });
}

/** Pás mezi dvěma křivkami (horní fnA, spodní fnB) od x0 do x1 */
const pasMezi = (x0: number, x1: number, fnA: (x: number) => number, fnB: (x: number) => number, krok = 8) =>
  tvar([...krivka(x0, x1, fnA, krok), ...krivka(x1, x0, fnB, krok)]);

/** Svislý nápis znak pod znakem (štětcem) */
const svisle = (text: string, x: number, y: number, vel: number, krok: number, atributy: string) =>
  [...text].map((z, i) => `<text x="${f(x)}" y="${f(y + i * krok)}" font-size="${vel}" text-anchor="middle" font-family="${PISMO.kanji}" ${atributy}>${z}</text>`).join("");

/** Lísteček: špičatý list délky d a šířky s z bodu (x, y) pod úhlem (0 = nahoru) */
const list = (x: number, y: number, d: number, s: number, uhel: number, barva: string, zilka = "") =>
  `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(uhel)})"><path d="M0 0 C${f(s)} ${f(-d * 0.3)} ${f(s * 0.8)} ${f(-d * 0.72)} 0 ${f(-d)} C${f(-s * 0.8)} ${f(-d * 0.72)} ${f(-s)} ${f(-d * 0.3)} 0 0 Z" fill="${barva}"/>${zilka ? `<path d="M0 -1 V${f(-d * 0.86)}" stroke="${zilka}" stroke-width="0.9" opacity="0.7"/>` : ""}</g>`;

/* ════════════════════ HLAVNÍ STŘECHA ════════════════════ */

/** Rohy okapu se zvedají (sori) — rovně uprostřed, nahoru ke krajům */
const ROVNE1 = 300;
const ZVEDNUTI1 = 12;
const sori1 = (x: number) => {
  const t = Math.max(0, (Math.abs(x - S) - ROVNE1) / (X.okap1P - S - ROVNE1));
  return ZVEDNUTI1 * t * t;
};
/** Spodní hrana tašek na okapu */
const okap1 = (x: number) => Y.okap1 - sori1(x);
/** Rozteč prejzů — žebro je i na ose */
const ROZTEC = 28;
const ZEBRA = Array.from({ length: 37 }, (_, i) => S + (i - 18) * ROZTEC);
/** Spodek čelního prkna (pod ním krokve) */
const celo1 = (x: number) => okap1(x) + 7;
/** Vaznice (keta) na zdi pod krokvemi */
const KETA = { y: 440, h: 8 };
/** Sklon okapu v bodě x (pro natočení čel a krokví v zvednutých rozích) */
const sklon1 = (x: number) => (Math.atan2(okap1(x + 1) - okap1(x - 1), 2) * 180) / Math.PI;

/** Nároží (kudarimune): od konce hřebene k rohu okapu */
const NAROZI_A: Bod = [X.hrebenL, Y.hreben];
const NAROZI_B: Bod = [X.okap1L + 6, okap1(X.okap1L + 6) - 12];

/** Mitsudomoe — tři čárky do kruhu poloměru ~5,4 */
const TOMOE = [0, 120, 240]
  .map((u) => `<path d="M0 -4.4 A4.4 4.4 0 0 1 3.37 2.83 A3.4 3.4 0 0 0 0 -0.3 A2.05 2.05 0 0 1 0 -4.4 Z" transform="rotate(${u})"/>`)
  .join("");

function hlavniStrecha(p: string) {
  const L = X.okap1L;
  const R = X.okap1P;
  const defs: string[] = [];
  const s: string[] = [];

  /* Vzor tašek: prejzy (žebra) na korýtkových taškách, řady po 15 */
  defs.push(`<pattern id="${p}-tasky" patternUnits="userSpaceOnUse" x="${S - ROZTEC / 2}" y="${Y.hreben}" width="${ROZTEC}" height="15">
    <rect width="${ROZTEC}" height="15" fill="${P.taska}"/>
    <rect x="0" y="12.6" width="${ROZTEC}" height="2.4" fill="${P.taskaTma}"/>
    <rect x="0" y="11.6" width="${ROZTEC}" height="1" fill="#7C90AC" opacity="0.7"/>
    <rect x="20.4" y="0" width="3.2" height="15" fill="${P.taskaTma}" opacity="0.45"/>
    <path d="M7.4 0 H20.6 V12.2 Q14 15.6 7.4 12.2 Z" fill="#7489A6"/>
    <path d="M7.4 0 H13.2 V13.6 Q10 13.4 7.4 12.2 Z" fill="${P.taskaSvetla}"/>
    <path d="M7.4 12.2 Q14 15.6 20.6 12.2" stroke="${P.taskaHrana}" stroke-width="1.3" fill="none" opacity="0.8"/>
    <path d="M8.6 2.2 Q14 0.6 19.4 2.2" stroke="#B4C4D8" stroke-width="1" fill="none" opacity="0.8"/>
    <rect x="19.6" y="0" width="1.2" height="13" fill="${P.taskaHrana}" opacity="0.55"/>
  </pattern>`);

  /* Plocha tašek: lichoběžník od hřebene po okap, tašky zajedou pod čela */
  const nA = NAROZI_A;
  const nB = NAROZI_B;
  const plocha: Bod[] = [nA, [zrc(nA[0]), nA[1]], [zrc(nB[0]), nB[1]], ...krivka(zrc(nB[0]), nB[0], (x) => okap1(x) - 6)];
  s.push(mnohouhelnik(plocha, `fill="url(#${p}-tasky)"`));
  // Pár prejzů jinak vypálených (světlejší a tmavší) — střecha není z jednoho kusu
  const r = nahoda(2851);
  const svetle: [number, number, number, number][] = [];
  const tmave: [number, number, number, number][] = [];
  for (let i = 0; i < 46; i++) {
    const x = ZEBRA[Math.floor(r() * ZEBRA.length)];
    const rada = 1 + Math.floor(r() * 7);
    const y = Y.hreben + rada * 15;
    // jen uvnitř lichoběžníku (nároží jde od hřebene k rohu okapu)
    const okraj = nA[0] - ((y - nA[1]) / (nB[1] - nA[1])) * (nA[0] - nB[0]);
    if (x - 8 < okraj + 10 || x + 8 > zrc(okraj) - 10 || y + 13 > okap1(x) - 8) continue;
    (r() < 0.55 ? svetle : tmave).push([x - 6.6, y, 6, 12]);
  }
  s.push(obdelniky(svetle, `fill="${P.taskaSvetla}" opacity="0.55"`) + obdelniky(tmave, `fill="${P.taskaTma}" opacity="0.35"`));
  // Nebe se v taškách odráží: horní pás o kousek světlejší
  s.push(mnohouhelnik([nA, [zrc(nA[0]), nA[1]], [zrc(nA[0]) + 86, nA[1] + 46], [nA[0] - 86, nA[1] + 46]], `fill="${P.bila}" opacity="0.08"`));

  /* Okap: kulaté čelní tašky s mitsudomoe a mezi nimi čela korýtek s úponkou */
  defs.push(`<g id="${p}-maru">
    <circle r="8.6" fill="${P.taskaHrana}"/>
    <circle r="7.4" cx="-0.3" cy="-0.3" fill="#7D92AD"/>
    <circle r="6.3" cx="-0.3" cy="-0.3" fill="none" stroke="${P.taskaTma}" stroke-width="0.7" opacity="0.8"/>
    <g fill="${P.taskaHrana}" transform="translate(-0.3 -0.3) scale(0.98)">${TOMOE}</g>
    <path d="M-6.4 -2.6 A6.9 6.9 0 0 1 -1.8 -6.8" stroke="#C4D2E2" stroke-width="1.3" fill="none" stroke-linecap="round"/>
  </g>`);
  s.push(`<path d="${pasMezi(L, R, (x) => okap1(x) - 15, (x) => okap1(x) - 2.5, 6)}" fill="#6B809C"/>`);
  // Úponky (karakusa) na čelech korýtek
  let uponky = "";
  for (let i = 0; i < ZEBRA.length - 1; i++) {
    const a = ZEBRA[i] + 9;
    const b = ZEBRA[i + 1] - 9;
    const m = (a + b) / 2;
    const y = okap1(m) - 8.5;
    uponky += `M${f(a)} ${f(y + 1)}c${f((m - a) * 0.4)} -4 ${f((m - a) * 0.7)} 3 ${f(m - a)} 0c${f((b - m) * 0.3)} -3 ${f((b - m) * 0.6)} 4 ${f(b - m)} -0.5`;
  }
  s.push(`<path d="${uponky}" stroke="${P.taskaSvetla}" stroke-width="1.1" fill="none" opacity="0.75"/>`);
  s.push(`<path d="${pasMezi(L, R, (x) => okap1(x) - 4, (x) => okap1(x) - 1, 6)}" fill="${P.taskaHrana}" opacity="0.8"/>`);
  s.push(`<path d="${pasMezi(L, R, (x) => okap1(x) - 15, (x) => okap1(x) - 13.6, 6)}" fill="#A9BBD0" opacity="0.8"/>`);
  for (const x of ZEBRA) {
    const u = sklon1(x);
    s.push(`<use href="#${p}-maru" transform="translate(${f(x)} ${f(okap1(x) - 8.5)})${Math.abs(u) > 0.3 ? ` rotate(${f(u)})` : ""}"/>`);
  }
  // Zima: sníh na taškách s měkkým převisem nad čely
  s.push(
    snih(
      mnohouhelnik(plocha, `fill="${SNIH}" opacity="0.82"`) +
        `<path d="${pasMezi(L + 6, R - 6, (x) => okap1(x) - 21, (x) => okap1(x) - 14.5 + 2.2 * Math.abs(Math.sin((x - S) / 8.9)), 4)}" fill="${SNIH}"/>`,
    ),
  );
  // Jaro (a podzim): lístky ze sakury za pravým rohem
  s.push(([[1902, 352, 20], [1978, 381, -30], [2052, 398, 60], [2086, 366, 10], [1946, 404, -70], [2012, 340, 35]] as Bod3[]).map(([x, y, u], i) => listek(x, y, u, i % 2 ? 3 : 2)).join(""));
  return { defs: defs.join(""), telo: s.join("") };
}
type Bod3 = [number, number, number];

/** Hřeben: plaňky (noshi) na sobě, nahoře válcová taška, na koncích oni-gawara */
function hreben(p: string) {
  const L = X.hrebenL - 8;
  const R = X.hrebenP + 8;
  const s: string[] = [];
  // Bílá malta (menudo) pod plaňkami, s obloučky nad každým prejzem
  let obloucky = `M${L} ${Y.hreben - 3} H${R} V${Y.hreben + 3}`;
  for (let i = ZEBRA.length - 1; i >= 0; i--) {
    const x = ZEBRA[i];
    if (x < L + 4 || x > R - 4) continue;
    obloucky += ` L${f(x + 6.6)} ${Y.hreben + 3} A6.6 6.6 0 0 1 ${f(x - 6.6)} ${Y.hreben + 3}`;
  }
  obloucky += ` L${L} ${Y.hreben + 3} Z`;
  s.push(`<path d="${obloucky}" fill="${P.omitka}"/>`);
  s.push(obdelnik(L, Y.hreben - 3, R - L, 1.6, `fill="${P.omitkaTma}" opacity="0.8"`));
  // Plaňky: šest vrstev po 5, tmavá spára dole a světlá hrana nahoře
  const vrstvy = 6;
  for (let i = 0; i < vrstvy; i++) {
    const y = Y.hreben - 3 - (i + 1) * 5;
    const o = i % 2 ? 0 : 1.5;
    s.push(obdelnik(L + o, y, R - L - 2 * o, 5, `fill="${i % 2 ? "#687D99" : P.taska}"`));
  }
  s.push(`<path d="${Array.from({ length: vrstvy }, (_, i) => `M${L} ${Y.hreben - 3 - i * 5 - 1}h${R - L}`).join("")}" stroke="${P.taskaHrana}" stroke-width="1.2" opacity="0.75"/>`);
  s.push(`<path d="${Array.from({ length: vrstvy }, (_, i) => `M${L + 2} ${Y.hreben - 3 - (i + 1) * 5 + 0.8}h${R - L - 4}`).join("")}" stroke="${P.taskaSvetla}" stroke-width="0.9" opacity="0.6"/>`);
  // Válcová taška (kanmuri) navrchu, se spárami
  const vrch = Y.hreben - 3 - vrstvy * 5;
  s.push(obdelnik(L - 2, vrch - 12, R - L + 4, 13, `rx="6" fill="${P.taska}"`));
  s.push(obdelnik(L + 2, vrch - 10.5, R - L - 4, 3.4, `rx="1.7" fill="${P.taskaSvetla}"`));
  s.push(obdelnik(L - 2, vrch - 2.5, R - L + 4, 2.5, `fill="${P.taskaTma}" opacity="0.8"`));
  s.push(`<path d="${Array.from({ length: Math.floor((R - L) / 38) }, (_, i) => `M${f(L + 19 + i * 38)} ${f(vrch - 11)}v10`).join("")}" stroke="${P.taskaTma}" stroke-width="1.2" opacity="0.6"/>`);

  /* Oni-gawara: čelem k nám, kruh s mitsudomoe, rohy (tsuno) do stran */
  const defs = `<g id="${p}-oni">
    <path d="M-12 -50 C-18 -55 -24 -60 -27 -70 C-29 -60 -24 -50 -17 -43 Z M12 -50 C18 -55 24 -60 27 -70 C29 -60 24 -50 17 -43 Z" fill="${P.taskaTma}"/>
    <path d="M-24 -62 C-25 -66 -26 -68 -27 -70 M24 -62 C25 -66 26 -68 27 -70" stroke="${P.taskaSvetla}" stroke-width="1.4" fill="none" stroke-linecap="round" opacity="0.8"/>
    <path d="M-22 0 L-22 -31 C-22 -49 -13 -58 0 -58 C13 -58 22 -49 22 -31 L22 0 Z" fill="${P.taskaHrana}"/>
    <path d="M-18 -3 L-18 -31 C-18 -45 -10 -53 0 -53 C10 -53 18 -45 18 -31 L18 -3 Z" fill="${P.taska}"/>
    <path d="M-18 -31 C-18 -45 -10 -53 0 -53 C-6 -50 -13 -44 -15 -31 L-15 -3 L-18 -3 Z" fill="${P.taskaSvetla}" opacity="0.7"/>
    <rect x="-18" y="-11" width="36" height="3" fill="${P.taskaTma}" opacity="0.8"/>
    <rect x="-18" y="-7" width="36" height="1.6" fill="${P.taskaSvetla}" opacity="0.5"/>
    <circle cy="-30" r="11" fill="${P.taskaTma}"/>
    <circle cy="-30" r="9.2" fill="#71859F"/>
    <g fill="${P.taskaHrana}" transform="translate(0 -30) scale(1.55)">${TOMOE}</g>
    <path d="M-7.6 -34 A8.6 8.6 0 0 1 -2.4 -38.4" stroke="#C4D2E2" stroke-width="1.4" fill="none" stroke-linecap="round"/>
  </g>`;
  s.push(`<use href="#${p}-oni" transform="translate(${L + 10} ${Y.hreben + 4})"/>`);
  s.push(`<use href="#${p}-oni" transform="translate(${R - 10} ${Y.hreben + 4})"/>`);
  // Zima: čepice na válcové tašce a na oni-gawara
  s.push(snih(obdelnik(L + 12, vrch - 17, R - L - 24, 7, `rx="3.5" fill="${SNIH}"`) + [L + 10, R - 10].map((x) => elipsa(x, Y.hreben + 4 - 56, 13, 4.2, `fill="${SNIH}"`)).join("")));
  return { defs, telo: s.join("") };
}

/** Nároží: plaňky podél šikmé hrany střechy, dole malá oni-gawara nad rohem okapu */
function narozi(p: string) {
  const [ax, ay] = NAROZI_A;
  const [bx, by] = NAROZI_B;
  const delka = Math.hypot(ax - bx, ay - by);
  const uhel = (Math.atan2(ay - by, ax - bx) * 180) / Math.PI;
  // V otočené soustavě: x od rohu okapu k hřebeni, záporné y míří ven (nahoru)
  const pas = (y: number, h: number, barva: string, o = 0) => obdelnik(o, y, delka - o, h, `fill="${barva}"`);
  const telo = `
    ${pas(1, 3.4, P.omitkaStin)}
    ${pas(-4, 5, P.taska, 2)}
    ${pas(-9, 5, "#687D99")}
    ${pas(-14, 5, P.taska, 2)}
    <path d="M0 -0.4 H${f(delka)} M2 -5.4 H${f(delka)} M0 -10.4 H${f(delka)}" stroke="${P.taskaHrana}" stroke-width="1.1" opacity="0.7"/>
    ${obdelnik(-2, -24, delka + 2, 11, `rx="5.5" fill="${P.taska}"`)}
    ${obdelnik(2, -22.4, delka - 4, 3, `rx="1.5" fill="${P.taskaSvetla}"`)}
    ${obdelnik(-2, -15.4, delka + 2, 2.2, `fill="${P.taskaTma}" opacity="0.8"`)}
    <path d="${Array.from({ length: Math.floor(delka / 36) }, (_, i) => `M${f(16 + i * 36)} -23v9`).join("")}" stroke="${P.taskaTma}" stroke-width="1.1" opacity="0.6"/>
    ${snih(obdelnik(10, -29, delka - 10, 6.5, `rx="3.2" fill="${SNIH}"`))}`;
  const jeden = `<g transform="translate(${f(bx)} ${f(by)}) rotate(${f(uhel)})">${telo}</g>
    <use href="#${p}-oni" transform="translate(${f(bx + 6)} ${f(by - 4)}) rotate(-16) scale(0.62)"/>`;
  return `${jeden}<g ${ZRCADLO}>${jeden}</g>`;
}

/** Pod okapem hlavní střechy: čelní prkno, krokve, podbití a vaznice — souměrně */
function podOkapem(p: string) {
  const L = X.okap1L;
  const R = X.okap1P;
  const defs = `<g id="${p}-krokev">
    <rect x="-4.6" y="0" width="9.2" height="11.5" fill="#D6B48A"/>
    <rect x="2.4" y="0" width="2.2" height="11.5" fill="#A87F58"/>
    <rect x="-4.6" y="9.6" width="9.2" height="1.9" fill="#8C6644"/>
    <rect x="-4.6" y="0" width="1.4" height="9.6" fill="#EBD2AE"/>
  </g>`;
  const s: string[] = [];
  // Tmavé podbití až dolů na spodní střechu — mezi střechami nikde neprosvítá nebe
  s.push(`<path d="${tvar([...krivka(L, R, (x) => okap1(x) - 2, 10), [R, Y.strecha2 + 3], [L, Y.strecha2 + 3]])}" fill="${P.drevoTma2}"/>`);
  s.push(`<path d="${pasMezi(L + 4, R - 4, (x) => celo1(x) + 1, (x) => celo1(x) + 4, 10)}" fill="${P.drevoTma}" opacity="0.9"/>`);
  // Krokve (taruki) pod čelem, v ose žeber
  for (const x of ZEBRA) {
    const u = sklon1(x);
    s.push(`<use href="#${p}-krokev" transform="translate(${f(x)} ${f(celo1(x) + 1.5)})${Math.abs(u) > 0.3 ? ` rotate(${f(u)})` : ""}"/>`);
  }
  // Čelní prkno (kayaoi) pod taškami
  s.push(`<path d="${pasMezi(L - 2, R + 2, (x) => okap1(x) - 1.5, (x) => celo1(x), 6)}" fill="${P.drevoHrana}"/>`);
  s.push(`<path d="${pasMezi(L - 2, R + 2, (x) => celo1(x) - 1.6, (x) => celo1(x), 6)}" fill="${P.drevo}"/>`);
  // Vaznice (keta) na zdi, zhlaví vystrčená přes roh
  s.push(obdelnik(X.zedL - 22, KETA.y, X.zedP - X.zedL + 44, KETA.h, `fill="${P.drevoTma}"`));
  s.push(obdelnik(X.zedL - 22, KETA.y, X.zedP - X.zedL + 44, 1.6, `fill="${P.drevo}"`));
  for (const x of [X.zedL - 22, X.zedP + 12]) {
    s.push(obdelnik(x, KETA.y - 0.5, 10, KETA.h + 1, `fill="${P.drevoSvetle}"`));
    s.push(obdelnik(x + 7.5, KETA.y - 0.5, 2.5, KETA.h + 1, `fill="${P.drevo}"`));
  }
  // Úzký pruh zdi pod vaznicí (ve stínu okapu)
  s.push(obdelnik(X.zedL, KETA.y + KETA.h, X.zedP - X.zedL, Y.strecha2 - KETA.y - KETA.h + 3, `fill="${P.omitkaTma}"`));
  return { defs, telo: s.join("") };
}

/* ════════════════════ SPODNÍ STŘECHA ════════════════════ */

/* Plech na lištách (kawara-bō), okap se žlabem; nahoře na šířku hlavního okapu, dole celý okap2 */
const ROZTEC2 = 46;
const OKAP2 = Y.okap2 - 4;
const LISTY = Array.from({ length: 27 }, (_, i) => S + (i - 13) * ROZTEC2).filter((x) => x > X.okap2L + 4 && x < X.okap2P - 4);
const ZLAB = { y: OKAP2 + 2, h: 12, l: X.okap2L - 6, p: X.okap2P + 6 };
const STRECHA2_L: Bod[] = [[X.okap1L, Y.strecha2], [X.okap2L, OKAP2]];

function spodniStrecha(p: string) {
  const vyska = OKAP2 - Y.strecha2 + 20;
  const spoj = 50;
  const defs = `<pattern id="${p}-plech2" patternUnits="userSpaceOnUse" x="${S - ROZTEC2 / 2}" y="${Y.strecha2}" width="${ROZTEC2}" height="${vyska}">
    <rect width="${ROZTEC2}" height="${vyska}" fill="${P.taska}"/>
    <rect x="0" width="16" height="${vyska}" fill="${P.taskaSvetla}" opacity="0.32"/>
    <rect x="26.5" width="5" height="${vyska}" fill="${P.taskaTma}" opacity="0.45"/>
    <rect y="${spoj}" width="${ROZTEC2}" height="1.4" fill="${P.taskaSvetla}" opacity="0.7"/>
    <rect y="${spoj + 1.4}" width="${ROZTEC2}" height="1.6" fill="${P.taskaHrana}" opacity="0.45"/>
    <rect x="19" width="8" height="${vyska}" fill="#7186A2"/>
    <rect x="19" width="2.6" height="${vyska}" fill="${P.taskaSvetla}"/>
    <rect x="25.4" width="1.6" height="${vyska}" fill="${P.taskaHrana}" opacity="0.8"/>
    <rect x="19" y="${spoj - 1}" width="8" height="4" fill="${P.taskaHrana}" opacity="0.35"/>
  </pattern>`;
  const s: string[] = [];
  const [[ax, ay], [bx, by]] = STRECHA2_L;
  s.push(mnohouhelnik([[ax, ay], [zrc(ax), ay], [zrc(bx), by], [bx, by]], `fill="url(#${p}-plech2)"`));
  // Stín vlysu hlavní střechy na horním kraji plechu (doprava dolů)
  s.push(mnohouhelnik([[ax, ay], [zrc(ax), ay], [zrc(ax) + 4, ay + 16], [ax + 18, ay + 22]], `fill="${P.taskaHrana}" opacity="0.32"`));
  // Okapní hrana: konce plechů ohnuté dolů, mezi lištami obloučky
  let hrana = `M${bx} ${by - 9} H${zrc(bx)} V${by}`;
  const xs = [zrc(bx), ...[...LISTY].reverse(), bx];
  for (let i = 0; i < xs.length - 1; i++) hrana += ` Q${f((xs[i] + xs[i + 1]) / 2)} ${f(by + 4.5)} ${f(xs[i + 1])} ${by}`;
  s.push(`<path d="${hrana} Z" fill="${P.taskaTma}"/>`);
  s.push(obdelnik(bx, by - 9, zrc(bx) - bx, 2, `fill="${P.taskaSvetla}" opacity="0.7"`));
  // Konce lišt (čepičky)
  s.push(obdelniky(LISTY.map((x) => [x - 4.5, by - 11, 9, 13]), `fill="#7A8FAA"`));
  s.push(obdelniky(LISTY.map((x) => [x - 4.5, by - 11, 2.6, 13]), `fill="${P.taskaSvetla}"`));
  s.push(obdelniky(LISTY.map((x) => [x + 2.4, by - 11, 2.1, 13]), `fill="${P.taskaHrana}" opacity="0.8"`));
  // Lemování šikmých boků
  const lem = (p1: Bod, p2: Bod) => {
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const l = Math.hypot(dx, dy);
    const nx = (-dy / l) * 9;
    const ny = (dx / l) * 9;
    return tvar([p1, p2, [p2[0] + nx, p2[1] + ny], [p1[0] + nx, p1[1] + ny]]);
  };
  s.push(`<path d="${lem([bx, by + 1], [ax, ay])}" fill="${P.taskaSvetla}"/>`);
  s.push(`<path d="${lem([zrc(ax), ay], [zrc(bx), by + 1])}" fill="#7A8FAA"/>`);
  // Oplechování u zdi (kde spodní střecha dosedá pod vlys)
  s.push(obdelnik(ax - 2, ay - 2, zrc(ax) - ax + 4, 7, `fill="${P.taskaTma}"`));
  s.push(obdelnik(ax - 2, ay - 2, zrc(ax) - ax + 4, 1.6, `fill="${P.taskaSvetla}" opacity="0.6"`));
  // Zima: sníh na plechu (lišty prosvítají), převis nad okapem
  s.push(
    snih(
      mnohouhelnik([[ax + 6, ay + 5], [zrc(ax) - 6, ay + 5], [zrc(bx) - 4, by - 12], [bx + 4, by - 12]], `fill="${SNIH}" opacity="0.8"`) +
        `<path d="M${bx + 2} ${by - 16} H${zrc(bx) - 2} ${krivka(zrc(bx) - 2, bx + 2, (x) => by - 9 + 2 * Math.abs(Math.sin((x - S) / 11)), 4).map(([x, y]) => `L${f(x)} ${f(y)}`).join(" ")} Z" fill="${SNIH}"/>`,
    ),
  );
  // Jaro (a podzim): lístky ze sakury na pravé půlce plechu
  s.push(([[1958, 520, 30], [2012, 541, -20], [2060, 503, 70], [2104, 548, 10], [2146, 528, -50], [1902, 548, 80], [2038, 476, -10]] as Bod3[]).map(([x, y, u], i) => listek(x, y, u, i % 2 ? 3 : 2)).join(""));

  /* Žlab: půlkulatý, na háčcích, na koncích čela */
  const zl = ZLAB;
  const hacky = Array.from({ length: 11 }, (_, i) => zl.l + 40 + (i * (zl.p - zl.l - 80)) / 10);
  s.push(obdelniky(hacky.map((x) => [x - 1.5, by - 3, 3, zl.y - by + 6]), `fill="${P.kovTma}"`));
  s.push(obdelnik(zl.l, zl.y, zl.p - zl.l, zl.h, `rx="${zl.h / 2}" fill="${P.plech}"`));
  s.push(obdelnik(zl.l, zl.y, zl.p - zl.l, 3.4, `rx="1.7" fill="${P.plechSvetly}"`));
  s.push(obdelnik(zl.l + 4, zl.y + zl.h - 3.6, zl.p - zl.l - 8, 3, `rx="1.5" fill="${P.plechTma}"`));
  for (const x of [zl.l, zl.p]) s.push(elipsa(x, zl.y + zl.h / 2, 3.4, zl.h / 2 + 1, `fill="${P.plechTma}"`));
  s.push(obdelniky(hacky.map((x) => [x - 2, zl.y - 0.5, 4, 4]), `fill="${P.kovTma}"`));
  s.push(snih(obdelnik(zl.l + 2, zl.y - 4, zl.p - zl.l - 4, 5, `rx="2.5" fill="${SNIH}"`)));
  return { defs, telo: s.join("") };
}

/* ════════════════════ ZEĎ PATRA ════════════════════ */

const ROH = 24;
/** Překlad nad oknem (dōsashi) přes celou šířku */
const PREKLAD = { y: 748, h: Y.oknoNahore - 748 };
/** Ostění okna: sloupky po stranách otvoru */
const OSTENI = 18;
/** Panely omítky po stranách okna */
const PANEL_L = { x0: X.zedL + ROH, x1: X.oknoL - OSTENI };
const PANEL_P = { x0: X.oknoP + OSTENI, x1: X.zedP - ROH };
/** Svod ze žlabu: kolínko od žlabu ke zdi a pak dolů po rohovém sloupku */
const SVOD = { x0: X.okap2L + 34, x1: X.zedL + 9, w: 10 };
/** Elektroměr na desce (levý panel) */
const ELEKTROMER = { x: PANEL_L.x0 + 4, y: 858, w: 30, h: 52 };
/** Zvonek fūrin (pravý panel) — háček pod překladem */
const FURIN = { x: (PANEL_P.x0 + PANEL_P.x1) / 2, y: Y.oknoNahore + 2 };

function fasada() {
  const s: string[] = [];
  const zL = X.zedL;
  const zP = X.zedP;
  // Omítka celého patra
  s.push(obdelnik(zL, Y.strecha2, zP - zL, Y.striskaNahore - Y.strecha2 + 2, `fill="${P.omitka}"`));
  // Pod oknem za zábradlím: prkenné obložení (shitamiita) s lištami
  const ob = { y: Y.oknoDole, h: Y.balkonDole - Y.oknoDole };
  s.push(obdelnik(zL, ob.y, zP - zL, ob.h, `fill="${P.drevoTma}"`));
  const prkna: [number, number, number, number][] = [];
  for (let y = ob.y + 2; y < ob.y + ob.h; y += 13) prkna.push([zL, y, zP - zL, 2]);
  s.push(obdelniky(prkna, `fill="${P.drevoTma2}" opacity="0.8"`));
  const listy: [number, number, number, number][] = [];
  for (let x = S - 4 - 8 * 60; x < zP; x += 60) listy.push([x, ob.y, 8, ob.h]);
  s.push(obdelniky(listy, `fill="${P.drevo}"`));
  s.push(obdelniky(listy.map(([x, y, , h]) => [x + 6, y, 2, h]), `fill="${P.drevoTma2}" opacity="0.7"`));
  // Pod parapetem stín (okno vystupuje)
  s.push(obdelnik(X.oknoL, ob.y, X.oknoP - X.oknoL, 10, `fill="${P.drevoTma2}" opacity="0.5"`));
  // Spodní trám nad stříškou
  s.push(obdelnik(zL, Y.balkonDole - 4, zP - zL, Y.striskaNahore - Y.balkonDole + 6, `fill="${P.drevoTma2}"`));
  // Překlad nad oknem, zhlaví přes rohy
  s.push(obdelnik(zL - 8, PREKLAD.y, zP - zL + 16, PREKLAD.h, `fill="${P.drevo}"`));
  s.push(obdelnik(zL - 8, PREKLAD.y, zP - zL + 16, 3, `fill="${P.drevoSvetle}"`));
  s.push(obdelnik(zL - 8, PREKLAD.y + PREKLAD.h - 3, zP - zL + 16, 3, `fill="${P.drevoTma}"`));
  for (const x of [zL - 8, zP]) s.push(obdelnik(x, PREKLAD.y, 8, PREKLAD.h, `fill="${P.drevoSvetle}"`) + obdelnik(x + 6, PREKLAD.y, 2, PREKLAD.h, `fill="${P.drevoTma}"`));
  // Ostění okna
  const vys = Y.oknoDole - PREKLAD.y - PREKLAD.h;
  for (const x of [X.oknoL - OSTENI, X.oknoP]) {
    s.push(obdelnik(x, PREKLAD.y + PREKLAD.h, OSTENI, vys, `fill="${P.drevo}"`));
    s.push(obdelnik(x, PREKLAD.y + PREKLAD.h, 2.4, vys, `fill="${P.drevoSvetle}"`));
    s.push(obdelnik(x + OSTENI - 3, PREKLAD.y + PREKLAD.h, 3, vys, `fill="${P.drevoTma}"`));
  }
  // Rohové sloupky (hashira) přes celé patro
  for (const x of [zL, zP - ROH]) {
    s.push(obdelnik(x, Y.strecha2, ROH, Y.striskaNahore - Y.strecha2 + 2, `fill="${P.drevo}"`));
    s.push(obdelnik(x, Y.strecha2, 3, Y.striskaNahore - Y.strecha2 + 2, `fill="${P.drevoSvetle}"`));
    s.push(obdelnik(x + ROH - 4, Y.strecha2, 4, Y.striskaNahore - Y.strecha2 + 2, `fill="${P.drevoTma}"`));
  }
  // Stíny sloupků a překladu na omítce (doprava a dolů)
  s.push(obdelniky([[zL + ROH, Y.okap2 + 10, 5, PREKLAD.y - Y.okap2 - 10], [zL + ROH, Y.oknoNahore, 5, Y.oknoDole - Y.oknoNahore], [PANEL_P.x0, Y.oknoNahore, 5, Y.oknoDole - Y.oknoNahore]], `fill="${P.omitkaTma}" opacity="0.55"`));
  s.push(obdelniky([[PANEL_L.x0, Y.oknoNahore, PANEL_L.x1 - PANEL_L.x0, 7], [PANEL_P.x0, Y.oknoNahore, PANEL_P.x1 - PANEL_P.x0, 7]], `fill="${P.omitkaTma}" opacity="0.5"`));
  return s.join("");
}

/** Elektroměr, chránička kabelu, větrák, zvonek fūrin a gekon */
function technika() {
  const s: string[] = [];
  const E = ELEKTROMER;
  // Chránička od elektroměru nahoru pod žlab, s objímkami
  const xc = PANEL_L.x0 + 7;
  const yc = ZLAB.y + ZLAB.h + 8;
  s.push(obdelnik(xc + 2.5, yc, 2.5, E.y - yc, `fill="${P.omitkaTma}" opacity="0.6"`));
  s.push(obdelnik(xc - 2.5, yc, 5, E.y - yc, `fill="${P.kov}"`));
  s.push(obdelnik(xc - 2.5, yc, 1.4, E.y - yc, `fill="${P.kovSvetly}"`));
  s.push(obdelniky([660, 730, 800].map((y) => [xc - 3.6, y, 7.2, 3.2]), `fill="${P.kovTma}"`));
  s.push(obdelnik(xc - 4, yc - 6, 8, 7, `rx="2" fill="${P.kovTma}"`));
  // Elektroměr: deska, skříňka, kulaté okénko s kotoučem a číselníkem
  s.push(obdelnik(E.x + 3, E.y + 3, E.w, E.h, `fill="${P.omitkaTma}" opacity="0.6"`));
  s.push(obdelnik(E.x, E.y, E.w, E.h, `rx="1.5" fill="${P.drevoSvetle}"`));
  s.push(obdelnik(E.x, E.y, E.w, 2, `fill="${P.drevoHrana}"`));
  s.push(obdelnik(E.x + 4, E.y + 6, E.w - 8, 36, `rx="3" fill="#D7DADB"`));
  s.push(obdelnik(E.x + 4, E.y + 6, E.w - 8, 3, `rx="1.5" fill="${P.bila}" opacity="0.7"`));
  s.push(kruh(E.x + E.w / 2, E.y + 22, 8.4, `fill="${P.skloTma}"`));
  s.push(kruh(E.x + E.w / 2, E.y + 22, 7, `fill="#F1F2EE"`));
  s.push(obdelnik(E.x + E.w / 2 - 5, E.y + 17.5, 10, 3.4, `fill="${P.cerna}" opacity="0.8"`));
  s.push(cara(E.x + E.w / 2 - 4, E.y + 25, E.x + E.w / 2 + 4, E.y + 25, `stroke="${P.rumelka}" stroke-width="1.4"`));
  s.push(`<path d="M${f(E.x + E.w / 2 - 6)} ${f(E.y + 17)} A7 7 0 0 1 ${f(E.x + E.w / 2 + 1)} ${f(E.y + 15.2)}" stroke="${P.bila}" stroke-width="1.4" fill="none"/>`);
  s.push(obdelnik(E.x + 7, E.y + 44, E.w - 14, 4, `fill="${P.kovTma}"`));
  // Větrák (kulatá stříška s žaluzií)
  const v = { x: PANEL_L.x0 + 22, y: 806, r: 10.5 };
  s.push(kruh(v.x + 3, v.y + 3.5, v.r, `fill="${P.omitkaTma}" opacity="0.65"`));
  s.push(kruh(v.x, v.y, v.r, `fill="${P.kovSvetly}"`));
  s.push(`<path d="M${f(v.x - v.r)} ${f(v.y)} A${v.r} ${v.r} 0 0 1 ${f(v.x + v.r)} ${f(v.y)} Z" fill="${P.kov}"/>`);
  s.push(`<path d="M${f(v.x - 7)} ${f(v.y + 3)}h14M${f(v.x - 6)} ${f(v.y + 6)}h12M${f(v.x - 4)} ${f(v.y + 8.6)}h8" stroke="${P.kovTma}" stroke-width="1.3"/>`);
  s.push(`<path d="M${f(v.x - 8)} ${f(v.y - 3)} A8.5 8.5 0 0 1 ${f(v.x - 2)} ${f(v.y - 8.2)}" stroke="${P.bila}" stroke-width="1.4" fill="none" opacity="0.9"/>`);

  // Hnízdo vlaštovek pod okapem vpravo (u krámku nosí štěstí obchodu); mláďata jen ve dne
  const h = { x: PANEL_P.x0 + 20, y: ZLAB.y + ZLAB.h + 7 };
  s.push(`<path d="M${h.x - 14} ${h.y} C${h.x - 13} ${h.y + 11} ${h.x - 6} ${h.y + 17} ${h.x} ${h.y + 17} C${h.x + 6} ${h.y + 17} ${h.x + 13} ${h.y + 11} ${h.x + 14} ${h.y} Z" transform="translate(3 3)" fill="${P.omitkaTma}" opacity="0.6"/>`);
  s.push(`<g class="${TRIDY.jenDen} krm-dum-vlastovky">
    ${[-7, 0, 7].map((dx, i) => `${elipsa(h.x + dx, h.y - 3 + (i === 1 ? -2 : 0), 4.4, 4, `fill="#2E3046"`)}<path d="M${h.x + dx - 2.6} ${h.y - 4 + (i === 1 ? -2 : 0)} l2.6 -3.4 l2.6 3.4 Z" fill="${P.zlata}"/>`).join("")}
  </g>`);
  s.push(`<path d="M${h.x - 14} ${h.y} C${h.x - 13} ${h.y + 11} ${h.x - 6} ${h.y + 17} ${h.x} ${h.y + 17} C${h.x + 6} ${h.y + 17} ${h.x + 13} ${h.y + 11} ${h.x + 14} ${h.y} Z" fill="#9A8263"/>`);
  s.push(`<path d="M${h.x - 12} ${h.y + 4} q4 2 8 0 q4 2 8 0 q4 2 8 0 M${h.x - 9} ${h.y + 10} q3 2 6 0 q3 2 6 0 q3 2 6 0" stroke="#7E684C" stroke-width="1.2" fill="none"/>`);
  s.push(obdelnik(h.x - 15, h.y - 1, 30, 2.6, `rx="1.3" fill="#B39C7C"`));

  // Zvonek fūrin: skleněný zvon s červenou rybkou, srdíčko a papírek 涼 (chlad) ve větru
  const F = FURIN;
  s.push(`<g transform="translate(${F.x} ${F.y}) scale(1.4) translate(${-F.x} ${-F.y})">`);
  s.push(cara(F.x, F.y - 2, F.x, F.y + 9, `stroke="${P.cerna}" stroke-width="0.9"`));
  s.push(obdelnik(F.x - 2.5, F.y - 3, 5, 2.4, `fill="${P.zlata}"`));
  s.push(`<path d="M${F.x - 7.5} ${F.y + 21} C${F.x - 7.5} ${F.y + 12} ${F.x - 4} ${F.y + 8.6} ${F.x} ${F.y + 8.6} C${F.x + 4} ${F.y + 8.6} ${F.x + 7.5} ${F.y + 12} ${F.x + 7.5} ${F.y + 21} Z" fill="${P.sklo}" opacity="0.9"/>`);
  s.push(`<path d="M${F.x - 5} ${F.y + 18} C${F.x - 5} ${F.y + 13} ${F.x - 3} ${F.y + 11} ${F.x - 1} ${F.y + 10.6}" stroke="${P.bila}" stroke-width="1.3" fill="none" opacity="0.9"/>`);
  s.push(`<path d="M${F.x - 1} ${F.y + 16.5} c2 -2.4 4.6 -2 5.4 0 c-0.8 2 -3.4 2.4 -5.4 0 Z M${F.x - 1} ${F.y + 16.5} l-1.8 -1.6 v3.2 Z" fill="${P.rumelka}"/>`);
  s.push(obdelnik(F.x - 7.5, F.y + 20, 15, 1.6, `fill="${P.skloTma}"`));
  s.push(`<g class="${TRIDY.vitr} krm-dum-furin">
    ${cara(F.x, F.y + 12, F.x, F.y + 30, `stroke="${P.cerna}" stroke-width="0.8"`)}
    ${kruh(F.x, F.y + 23, 1.6, `fill="${P.zlata}"`)}
    ${obdelnik(F.x - 5.5, F.y + 30, 11, 36, `fill="${P.papir}"`)}
    ${obdelnik(F.x - 5.5, F.y + 30, 11, 3, `fill="${P.indigo}"`)}
    ${obdelnik(F.x + 3.5, F.y + 33, 2, 33, `fill="${P.papirStin}"`)}
    <text x="${F.x}" y="${F.y + 53}" font-size="9" text-anchor="middle" font-family="${PISMO.kanji}" fill="${P.indigo}">涼</text>
  </g>`);
  s.push(`</g>`);

  // Gekon (yamori) na pravém panelu — 家守, strážce domu
  const g = { x: PANEL_P.x0 + 21, y: 948 };
  s.push(`<g class="krm-dum-gekon" transform="translate(${g.x} ${g.y}) rotate(-14)">
    <path d="M0 9 C0 15 -2 19 -6 21 C-8 22 -10 21 -10 19" stroke="#8C8174" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M-1.4 -1 L-6 -4 L-7.6 -2.6 M1.4 -1 L6 -4 L7.6 -2.6 M-1.6 6.6 L-6 9.6 L-7.4 8.2 M1.6 6.6 L6 9.6 L7.2 11" stroke="#8C8174" stroke-width="1.3" fill="none" stroke-linecap="round"/>
    <ellipse cx="0" cy="3" rx="2.6" ry="6.6" fill="#9C9184"/>
    <ellipse cx="0" cy="-5" rx="2.5" ry="3.2" fill="#9C9184"/>
    <circle cx="-1.3" cy="-5.8" r="0.7" fill="${P.cerna}"/><circle cx="1.3" cy="-5.8" r="0.7" fill="${P.cerna}"/>
    <path d="M0 -1 V8" stroke="#B7AD9F" stroke-width="0.9" opacity="0.8"/>
  </g>`);
  return s.join("");
}

/** Svod ze žlabu (vlevo): sběrač, koleno ke zdi, rovně dolů, objímky */
function svod() {
  const { x0, x1, w } = SVOD;
  const yZ = ZLAB.y + ZLAB.h;
  const y1 = yZ + 22;
  const y2 = y1 + 46;
  const s: string[] = [];
  s.push(`<path d="M${x1 + 5} ${y2 + 8} V${Y.striskaNahore + 6}" stroke="${P.drevoTma2}" stroke-width="4" opacity="0.35" fill="none"/>`);
  s.push(`<path d="M${x0} ${yZ - 2} V${y1} L${x1} ${y2} V${Y.striskaNahore + 6}" stroke="${P.plechTma}" stroke-width="${w}" fill="none" stroke-linejoin="round"/>`);
  s.push(`<path d="M${x0 - 2} ${yZ - 2} V${y1 - 1} L${x1 - 2} ${y2 - 1} V${Y.striskaNahore + 6}" stroke="${P.plech}" stroke-width="${w - 4}" fill="none" stroke-linejoin="round"/>`);
  s.push(`<path d="M${x0 - 3.2} ${yZ - 2} V${y1 - 2} L${x1 - 3.2} ${y2 - 2} V${Y.striskaNahore + 6}" stroke="${P.plechSvetly}" stroke-width="1.6" fill="none" stroke-linejoin="round"/>`);
  s.push(`<path d="M${x0 - 10} ${yZ - 3} H${x0 + 10} L${x0 + 6} ${yZ + 8} H${x0 - 6} Z" fill="${P.plech}"/>`);
  s.push(obdelnik(x0 - 10, yZ - 3, 20, 2.4, `fill="${P.plechSvetly}"`));
  for (const y of [y2 + 40, 860, 1000]) s.push(obdelnik(x1 - w / 2 - 1.5, y, w + 3, 4, `fill="${P.kovTma}"`) + kruh(x1 + w / 2 + 2.5, y + 2, 1.6, `fill="${P.kovTma}"`));
  return s.join("");
}

/* ════════════════════ POKOJÍK ZA OKNEM (uvnitr) ════════════════════ */

const V = OKNO.vnitrek;
/** Lampičky visí uprostřed tabulek, nad kusy (kusy začínají na y 840) */
const LAMPICKY = OKNO.tabulky.map((t) => t.x + t.w / 2);
const LAMPICKA = { y: 818, rx: 9.5, ry: 11 };
const STROP = V.y + 14;
/** Středy příček — za nimi stojí na polici krabice z paulovnie */
const PRICKY_STRED = OKNO.pricky.map((x) => x + 7);

/** Krabice z paulovnie (tomobako): víko, plochá šňůrka (jen u spodní) a lístek */
function krabice(cx: number, dno: number, w: number, h: number, stitek = "", stitekVlevo = true, snurka = true) {
  const x = cx - w / 2;
  const y = dno - h;
  let s = obdelnik(x, y, w, h, `fill="#E8D8B8"`);
  s += obdelnik(x - 0.8, y, w + 1.6, 5, `fill="#F2E7CF"`);
  s += obdelnik(x - 0.8, y + 5, w + 1.6, 1, `fill="#D3C09B"`);
  s += obdelnik(x + w - 3, y + 6, 3, h - 6, `fill="#D8C6A2"`);
  if (snurka) s += obdelnik(x, y + h * 0.56, w, 2.4, `fill="${P.indigo}" opacity="0.85"`);
  if (stitek) {
    const sx = stitekVlevo ? x + 3 : x + w - 13;
    s += obdelnik(sx, y + 7, 10, h - 11, `fill="${P.papir}"`);
    s += svisle(stitek, sx + 5, y + 14.5, 7, 7.6, `fill="${P.inkoust}"`);
  }
  return s;
}

function vnitrek(p: string) {
  const defs = `<linearGradient id="${p}-stena" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#F8EFDC"/><stop offset="0.55" stop-color="#F1E4CA"/><stop offset="1" stop-color="#E4D2B2"/>
    </linearGradient>`;
  const s: string[] = [];
  // Zadní stěna s měkkým světlem shora
  s.push(obdelnik(V.x, V.y, V.w, V.h, `fill="url(#${p}-stena)"`));
  // Strop: tmavá prkna a trám
  s.push(obdelnik(V.x, V.y, V.w, STROP - V.y, `fill="${P.drevoTma2}"`));
  s.push(obdelnik(V.x, STROP - 4, V.w, 4, `fill="${P.drevo}"`));
  s.push(obdelnik(V.x, STROP, V.w, 3, `fill="${P.omitkaTma}" opacity="0.5"`));
  // Za příčkami krabice z paulovnie na polici (kusy stojí mezi nimi)
  const [k1, k2, k3] = PRICKY_STRED;
  s.push(krabice(k1, Y.policeOkna, 46, 30, "茶碗", true) + krabice(k1, Y.policeOkna - 30, 40, 22, "", true, false));
  s.push(krabice(k2, Y.policeOkna, 42, 46, "酒器", true));
  s.push(krabice(k3, Y.policeOkna, 46, 28, "花入", false) + krabice(k3 + 1, Y.policeOkna - 28, 38, 24, "", true, false));
  // Svitky (tanzaku) po krajích: 一期一会 vlevo, 和敬清寂 vpravo
  const svitek = (x: number, text: string) => {
    let t = cara(x + 7, STROP, x + 7, STROP + 6, `stroke="${P.cerna}" stroke-width="0.8"`);
    t += obdelnik(x, STROP + 6, 14, 112, `fill="${P.papir}"`);
    t += obdelnik(x, STROP + 6, 14, 6, `fill="${P.indigo}"`) + obdelnik(x, STROP + 112, 14, 6, `fill="${P.indigo}"`);
    t += obdelnik(x - 1.5, STROP + 117, 17, 3, `rx="1.5" fill="${P.drevoTma}"`);
    t += obdelnik(x + 11.6, STROP + 12, 2.4, 100, `fill="${P.papirStin}"`);
    t += svisle(text, x + 7, STROP + 30, 10, 21, `fill="${P.inkoust}"`);
    return t;
  };
  s.push(svitek(V.x + 3, "一期一会") + svitek(V.x + V.w - 17, "和敬清寂"));
  // Polička s darumou a svitkem (vlevo nahoře ve druhé tabulce)
  const t2 = OKNO.tabulky[1];
  const pol = { x: t2.x + 26, y: 830, w: 40 };
  s.push(obdelnik(pol.x, pol.y, pol.w, 3, `fill="${P.drevo}"`) + obdelnik(pol.x + 4, pol.y + 3, 3, 4, `fill="${P.drevoTma}"`) + obdelnik(pol.x + pol.w - 7, pol.y + 3, 3, 4, `fill="${P.drevoTma}"`));
  s.push(`<path d="M${pol.x + 6} ${pol.y} C${pol.x + 4} ${pol.y - 10} ${pol.x + 8} ${pol.y - 17} ${pol.x + 13} ${pol.y - 17} C${pol.x + 18} ${pol.y - 17} ${pol.x + 22} ${pol.y - 10} ${pol.x + 20} ${pol.y} Z" fill="${P.rumelka}"/>`);
  s.push(elipsa(pol.x + 13, pol.y - 9.5, 4.2, 3.8, `fill="#F4E6D2"`));
  s.push(`<path d="M${pol.x + 10.6} ${pol.y - 10} h1.6 M${pol.x + 13.8} ${pol.y - 10} h1.6" stroke="${P.cerna}" stroke-width="1"/>`);
  s.push(`<path d="M${pol.x + 9} ${pol.y - 3.4} q4 2.4 8 0" stroke="${P.zlata}" stroke-width="1.2" fill="none"/>`);
  s.push(obdelnik(pol.x + 24, pol.y - 6, 14, 6, `rx="3" fill="${P.papirStin}"`) + obdelnik(pol.x + 29, pol.y - 6, 2, 6, `fill="${P.rumelka}"`));
  // Odtrhávací kalendář s 大安 (šťastný den) — vlevo nahoře ve třetí tabulce
  const t3 = OKNO.tabulky[2];
  const kal = { x: t3.x + 28, y: STROP + 5, w: 24, h: 28 };
  s.push(cara(kal.x + kal.w / 2, STROP + 1, kal.x + kal.w / 2, kal.y, `stroke="${P.cerna}" stroke-width="0.8"`));
  s.push(obdelnik(kal.x + 1.5, kal.y + 1.5, kal.w, kal.h, `fill="${P.omitkaTma}" opacity="0.4"`));
  s.push(obdelnik(kal.x, kal.y, kal.w, kal.h, `fill="${P.papir}"`));
  s.push(obdelnik(kal.x, kal.y, kal.w, 4, `fill="${P.rumelka}"`));
  s.push(svisle("大安", kal.x + 8, kal.y + 13, 8, 8.5, `fill="${P.rumelka}"`));
  s.push(`<path d="M${kal.x + 15} ${kal.y + 8}v15M${kal.x + 18.5} ${kal.y + 8}v11" stroke="${P.omitkaTma}" stroke-width="1"/>`);
  // Papírové lampičky (nad každým kusem jedna — v noci mu svítí)
  for (const cx of LAMPICKY) {
    const { y, rx, ry } = LAMPICKA;
    s.push(cara(cx, STROP, cx, y - ry - 3, `stroke="${P.cerna}" stroke-width="0.9"`));
    s.push(obdelnik(cx - 6, y - ry - 3, 12, 3.6, `rx="1" fill="${P.drevoTma}"`));
    s.push(elipsa(cx, y, rx, ry, `fill="${P.papir}"`));
    s.push(`<path d="M${cx} ${y - ry} A${rx} ${ry} 0 0 1 ${cx} ${y + ry} A${rx * 0.55} ${ry} 0 0 0 ${cx} ${y - ry} Z" fill="${P.papirStin}"/>`);
    s.push(`<path d="M${f(cx - rx * 0.86)} ${f(y - 5)}Q${cx} ${f(y - 7.2)} ${f(cx + rx * 0.86)} ${f(y - 5)}M${f(cx - rx)} ${y}Q${cx} ${f(y - 2)} ${f(cx + rx)} ${y}M${f(cx - rx * 0.86)} ${f(y + 5)}Q${cx} ${f(y + 3)} ${f(cx + rx * 0.86)} ${f(y + 5)}" stroke="#D9C9A6" stroke-width="0.8" fill="none"/>`);
    s.push(obdelnik(cx - 5, y + ry - 0.6, 10, 3.2, `rx="1" fill="${P.drevoTma}"`));
    s.push(cara(cx, y + ry + 2.6, cx, y + ry + 7, `stroke="${P.rumelka}" stroke-width="1.6"`));
  }
  // Police: přední hrana (na ní leží páska se jménem a tlačítko — HTML), pod ní stín
  const ph = OKNO.hranaPolice;
  s.push(obdelnik(V.x, Y.policeOkna, V.w, ph, `fill="${P.drevoSvetle}"`));
  s.push(obdelnik(V.x, Y.policeOkna, V.w, 2.6, `fill="${P.drevoHrana}"`));
  s.push(obdelnik(V.x, Y.policeOkna + ph - 3, V.w, 3, `fill="${P.drevo}"`));
  s.push(`<path d="M${V.x} ${Y.policeOkna + 9}h${V.w}M${V.x} ${Y.policeOkna + 17}h${V.w}" stroke="${P.drevo}" stroke-width="0.7" opacity="0.35"/>`);
  s.push(obdelnik(V.x, Y.policeOkna + ph, V.w, V.y + V.h - Y.policeOkna - ph, `fill="${P.drevoTma2}"`));
  return { defs, telo: s.join("") };
}

/* ════════════════════ OKNO, BALKON, STŘÍŠKA (predni) ════════════════════ */

/** Stín spodní střechy a žlabu na zdi a na štítu (doprava dolů) */
function stinSpodniStrechy() {
  const y0 = ZLAB.y + ZLAB.h - 2;
  return mnohouhelnik([[X.zedL, y0], [X.zedP, y0], [X.zedP, y0 + 26], [X.zedL + 30, y0 + 30], [X.zedL, y0 + 18]], `fill="${P.drevoTma2}" opacity="0.2"`);
}

function okno() {
  const s: string[] = [];
  const o = { x0: X.oknoL, x1: X.oknoP, y0: Y.oknoNahore, y1: Y.oknoDole };
  // Stín rámu na skle: shora a zleva v každé tabulce (slabý, mimo kusy)
  for (const t of OKNO.tabulky) {
    s.push(obdelnik(t.x, t.y, t.w, 12, `fill="${P.drevoTma2}" opacity="0.2"`));
    s.push(obdelnik(t.x, t.y + 12, 5, t.h - 12, `fill="${P.drevoTma2}" opacity="0.14"`));
  }
  // Rám (deska 16 kolem otvoru)
  s.push(`<path d="M${o.x0} ${o.y0}H${o.x1}V${o.y1}H${o.x0}Z M${V.x} ${V.y}V${V.y + V.h}H${V.x + V.w}V${V.y}Z" fill="${P.drevoTma}" fill-rule="evenodd"/>`);
  s.push(obdelnik(o.x0, o.y0, o.x1 - o.x0, 2.4, `fill="${P.drevo}"`));
  s.push(obdelnik(o.x0, o.y0, 2.4, o.y1 - o.y0, `fill="${P.drevo}"`));
  s.push(obdelnik(o.x1 - 3, o.y0, 3, o.y1 - o.y0, `fill="${P.drevoTma2}"`));
  s.push(obdelnik(V.x + V.w, V.y, 2.4, V.h, `fill="${P.drevo}"`));
  // Spodní příčle křídel a parapet
  s.push(obdelnik(V.x, Y.policeOkna + OKNO.hranaPolice + 1, V.w, V.y + V.h - Y.policeOkna - OKNO.hranaPolice - 1, `fill="${P.drevo}"`));
  s.push(obdelnik(V.x, Y.policeOkna + OKNO.hranaPolice + 1, V.w, 1.6, `fill="${P.drevoSvetle}"`));
  s.push(obdelnik(o.x0 - 6, o.y1 - 6, o.x1 - o.x0 + 12, 7, `fill="${P.drevo}"`));
  s.push(obdelnik(o.x0 - 6, o.y1 - 6, o.x1 - o.x0 + 12, 2.2, `fill="${P.drevoHrana}"`));
  // Příčky (rámy posuvných křídel); prostřední je dvojitá — tam se křídla potkávají
  for (const [i, x] of OKNO.pricky.entries()) {
    s.push(obdelnik(x, V.y, 14, V.h, `fill="${P.drevoTma}"`));
    s.push(obdelnik(x, V.y, 2.2, V.h, `fill="${P.drevo}"`));
    s.push(obdelnik(x + 11.6, V.y, 2.4, V.h, `fill="${P.drevoTma2}"`));
    if (i === 1) {
      s.push(obdelnik(x + 6.4, V.y, 1.4, V.h, `fill="${P.drevoTma2}"`) + obdelnik(x + 7.8, V.y, 1.2, V.h, `fill="${P.drevo}"`));
      // Půlměsícová zástrčka (kuresento)
      s.push(obdelnik(x + 2.5, 900, 9, 15, `rx="1.5" fill="${P.kovSvetly}"`));
      s.push(`<path d="M${x + 3.6} 908 A3.6 3.6 0 0 1 ${x + 10.4} 908 Z" fill="${P.kov}"/>`);
      s.push(kruh(x + 7, 911.5, 1.2, `fill="${P.kovTma}"`));
    }
  }
  // Odlesk skla: dva šikmé pruhy v každé tabulce (pod 0,12, nepřekrývají se)
  OKNO.tabulky.forEach((t, i) => {
    const b = t.y + t.h;
    const pr = (a: number, w: number, op: number) =>
      mnohouhelnik([[t.x + t.w * a, b], [t.x + t.w * (a + 0.34), t.y], [t.x + t.w * (a + 0.34 + w), t.y], [t.x + t.w * (a + w), b]], `fill="${P.bila}" opacity="${op}"`);
    s.push(pr(0.08 + (i % 2) * 0.05, 0.11, 0.09) + pr(0.3 + (i % 2) * 0.05, 0.035, 0.08));
  });
  // Ve dne slunce na skle (jen nahoře, nad kusy)
  s.push(`<g class="${TRIDY.jenDen}">${[0, 2].map((i) => {
    const t = OKNO.tabulky[i];
    return mnohouhelnik([[t.x + 6, t.y + 46], [t.x + 44, t.y + 8], [t.x + 54, t.y + 8], [t.x + 16, t.y + 46]], `fill="${P.bila}" opacity="0.12"`);
  }).join("")}</g>`);
  return s.join("");
}

/** Srolovaná rákosová rohož (sudare) venku nad oknem, dvě role s vázačkami */
function sudare() {
  const s: string[] = [];
  const y = Y.oknoNahore + 3;
  const h = 18;
  const role = [[X.oknoL + 4, S - 3], [S + 3, X.oknoP - 4]];
  for (const [x0, x1] of role) {
    const w = x1 - x0;
    s.push(obdelnik(x0 + 3, y + h - 1, w, 6, `fill="${P.drevoTma2}" opacity="0.22"`));
    s.push(obdelnik(x0, y, w, h, `rx="${h / 2}" fill="#C8AC72"`));
    s.push(obdelnik(x0 + 5, y + 1.6, w - 10, 4.2, `rx="2" fill="#E2CB94"`));
    s.push(obdelnik(x0 + 5, y + h - 5, w - 10, 3.6, `rx="1.8" fill="#9E8150"`));
    s.push(`<path d="M${x0 + 6} ${y + 8}h${w - 12}M${x0 + 6} ${y + 11.4}h${w - 12}" stroke="#B0935D" stroke-width="0.8"/>`);
    const nite: string[] = [];
    for (let x = x0 + 14; x < x1 - 8; x += 26) nite.push(`M${f(x)} ${y + 1}v${h - 2}`);
    s.push(`<path d="${nite.join("")}" stroke="#7E6640" stroke-width="0.9" opacity="0.6"/>`);
    // Čela role: spirála
    for (const xc of [x0 + 5, x1 - 5]) s.push(elipsa(xc, y + h / 2, 4.4, h / 2 - 0.5, `fill="#B39258"`) + elipsa(xc, y + h / 2, 2.2, 4, `fill="none" stroke="#8C7044" stroke-width="0.9"`));
    // Háčky pod překladem a vázačky s třapci
    for (const xh of [x0 + 34, x1 - 34]) s.push(`<path d="M${xh} ${Y.oknoNahore - 1}v3.6a2 2 0 0 0 4 0" stroke="${P.zlata}" stroke-width="1.4" fill="none"/>`);
    for (const xv of [x0 + w / 6, x1 - w / 6]) {
      s.push(obdelnik(xv - 1.6, y - 0.6, 3.2, h + 1.2, `fill="${P.rumelka}"`));
      s.push(`<path d="M${f(xv)} ${y + h} q-2 6 0 11" stroke="${P.rumelka}" stroke-width="1.4" fill="none"/>`);
      s.push(`<path d="M${f(xv - 2)} ${y + h + 10} h4 l1 7 h-6 Z" fill="${P.rumelkaTma}"/>`);
    }
  }
  return s.join("");
}

/* ——— Balkon ——— */

const ZAB = { x0: X.balkonL - 6, x1: X.balkonP + 6, horni: Y.oknoDole, madlo: 12, dolni: 1099, deska: 1110 };
/** Sloupky zábradlí po 120 od osy */
const SLOUPKY = Array.from({ length: 9 }, (_, i) => S + (i - 4) * 120);
/** Prapor uprostřed zábradlí */
const PRAPOR: Obdelnik = { x: S - 122, y: ZAB.horni + 7, w: 244, h: 60 };
/** Klimatizace na balkoně vpravo (za zábradlím, pod kočkou) */
const KLIMA = { x: X.oknoP + 4, y: 1063, w: 52, h: 44 };

function klimatizace() {
  const { x, y, w, h } = KLIMA;
  const c = { x: x + 21, y: y + 22 };
  let s = obdelnik(x + 4, y + 4, w, h, `fill="${P.drevoTma2}" opacity="0.4"`);
  s += obdelnik(x + 6, y + h, 8, 3, `fill="${P.kovTma}"`) + obdelnik(x + w - 14, y + h, 8, 3, `fill="${P.kovTma}"`);
  s += obdelnik(x, y, w, h, `rx="3" fill="#E9E5DA"`);
  s += obdelnik(x, y, w, 3, `rx="1.5" fill="#F7F4EC"`);
  s += obdelnik(x + w - 5, y + 2, 5, h - 2, `fill="#CFC8B9"`);
  s += kruh(c.x, c.y, 16.5, `fill="#CDC6B6"`);
  s += kruh(c.x, c.y, 13.5, `fill="none" stroke="#B5AD9C" stroke-width="1.2"`) + kruh(c.x, c.y, 9, `fill="none" stroke="#B5AD9C" stroke-width="1"`);
  s += `<path d="M${c.x} ${c.y} c2 -8 8 -11 11 -7 c-2 4 -6 6 -11 7 Z M${c.x} ${c.y} c7 4 7 11 2 12 c-2 -4 -2 -8 -2 -12 Z M${c.x} ${c.y} c-7 4 -14 1 -12 -4 c4 -1 8 1 12 4 Z" fill="#B2AA98"/>`;
  s += kruh(c.x, c.y, 3, `fill="#9E9584"`);
  s += `<path d="${[0, 1, 2, 3, 4, 5, 6].map((i) => `M${x + 41} ${y + 9 + i * 4.4}h7`).join("")}" stroke="#C3BCAC" stroke-width="1.6"/>`;
  // Chránička trubek od jednotky do zdi
  s += obdelnik(x + w - 12, y - 9, 7, 10, `rx="2" fill="#E2DCCD"`) + elipsa(x + w - 8.5, y - 9, 5, 2.4, `fill="#CFC8B9"`);
  s += snih(obdelnik(x + 1, y - 4, w - 14, 6, `rx="3" fill="${SNIH}"`));
  return s;
}

function zabradli(p: string) {
  const { x0, x1, horni, madlo, dolni, deska } = ZAB;
  const defs = `<pattern id="${p}-pricky" patternUnits="userSpaceOnUse" x="${S - 2}" y="${horni + madlo}" width="12" height="${dolni - horni - madlo}">
    <rect x="0" width="4" height="60" fill="${P.drevoSvetle}"/>
    <rect x="0" width="1.2" height="60" fill="${P.drevoHrana}"/>
    <rect x="3" width="1" height="60" fill="${P.drevo}"/>
    <rect x="4" width="3" height="60" fill="${P.drevoTma2}" opacity="0.35"/>
  </pattern>`;
  const s: string[] = [];
  s.push(obdelnik(x0, horni + madlo, x1 - x0, dolni - horni - madlo, `fill="url(#${p}-pricky)"`));
  // Sloupky (krajní silnější)
  const sl = SLOUPKY.map((x, i): [number, number, number, number] => {
    const w = i === 0 || i === SLOUPKY.length - 1 ? 16 : 12;
    return [x - w / 2, horni, w, deska - horni];
  });
  s.push(obdelniky(sl.map(([x, y, w, h]) => [x + w, y + madlo, 4, h - madlo]), `fill="${P.drevoTma2}" opacity="0.4"`));
  s.push(obdelniky(sl, `fill="${P.drevo}"`));
  s.push(obdelniky(sl.map(([x, y, , h]) => [x, y, 2.4, h]), `fill="${P.drevoSvetle}"`));
  s.push(obdelniky(sl.map(([x, y, w, h]) => [x + w - 2.6, y, 2.6, h]), `fill="${P.drevoTma}"`));
  // Madlo (kasagi) a spodní pásnice
  s.push(obdelnik(x0, horni, x1 - x0, madlo, `fill="${P.drevo}"`));
  s.push(obdelnik(x0, horni, x1 - x0, 3, `fill="${P.drevoHrana}"`));
  s.push(obdelnik(x0, horni + madlo - 2.4, x1 - x0, 2.4, `fill="${P.drevoTma}"`));
  s.push(obdelnik(x0, horni + madlo, x1 - x0, 3, `fill="${P.drevoTma2}" opacity="0.45"`));
  s.push(obdelnik(x0, dolni, x1 - x0, deska - dolni, `fill="${P.drevo}"`));
  s.push(obdelnik(x0, dolni, x1 - x0, 2.2, `fill="${P.drevoSvetle}"`));
  // Deska balkonu: čelo a okapnička
  s.push(obdelnik(x0 - 4, deska, x1 - x0 + 8, Y.balkonDole - deska, `fill="${P.drevoTma}"`));
  s.push(obdelnik(x0 - 4, deska, x1 - x0 + 8, 2.6, `fill="${P.drevoSvetle}"`));
  s.push(obdelnik(x0 - 4, Y.balkonDole - 3, x1 - x0 + 8, 3, `fill="${P.plechTma}"`));
  // Zima: sníh na madle; jaro: pár lístků
  s.push(snih(obdelnik(x0 + 2, horni - 5, x1 - x0 - 4, 7, `rx="3.2" fill="${SNIH}"`)));
  s.push(([[1886, horni + 1, 10], [1928, horni + 2, -40], [1772, horni + 1.5, 60]] as Bod3[]).map(([x, y, u], i) => listek(x, y, u, i % 2 ? 3 : 2)).join(""));
  return { defs, telo: s.join("") };
}

/** Prapor 航空便 / Z Japonska — látka s okrajem jako letecká obálka */
function prapor(p: string) {
  const { x, y, w, h } = PRAPOR;
  const defs = `<pattern id="${p}-avia" patternUnits="userSpaceOnUse" width="16" height="16" patternTransform="rotate(45)">
    <rect width="16" height="16" fill="${P.papir}"/>
    <rect width="4" height="16" fill="${P.rumelka}"/>
    <rect x="8" width="4" height="16" fill="${P.indigo}"/>
  </pattern>`;
  const vazacky = [x + 12, x + 86, x + w - 86, x + w - 12];
  const horni = (xx: number) => y + 2.6 * Math.sin(((xx - x) / w) * Math.PI * 3) ** 2;
  const okraj = `M${x} ${y} ${krivka(x, x + w, horni, 6).map(([a, b]) => `L${f(a)} ${f(b)}`).join(" ")} L${x + w} ${y + h} Q${S} ${y + h + 3} ${x} ${y + h} Z`;
  const vnitrni = `M${x + 6} ${y + 7} V${y + h - 6} H${x + w - 6} V${y + 7} Z`;
  const s: string[] = [];
  s.push(`<path d="${okraj}" transform="translate(5 4)" fill="${P.drevoTma2}" opacity="0.28"/>`);
  s.push(`<g class="${TRIDY.vitr} krm-dum-prapor">`);
  // Vázačky přes madlo
  s.push(`<path d="${vazacky.map((v) => `M${v - 3} ${y + 3} C${v - 4} ${ZAB.horni - 2} ${v + 4} ${ZAB.horni - 2} ${v + 3} ${y + 3}`).join("")}" stroke="#B49C70" stroke-width="2.2" fill="none"/>`);
  s.push(`<path d="${okraj}" fill="url(#${p}-avia)"/>`);
  s.push(`<path d="${vnitrni}" fill="${P.papir}"/>`);
  // Záhyby látky
  s.push(obdelniky([[x + 70, y + 4, 9, h - 4], [x + w - 64, y + 4, 7, h - 4]], `fill="${P.papirStin}" opacity="0.55"`));
  s.push(`<text x="${S}" y="${y + 33}" font-size="25" letter-spacing="7" text-anchor="middle" font-family="${PISMO.kanji}" fill="${P.indigo}">航空便</text>`);
  s.push(`<text x="${S}" y="${y + 50}" font-size="15" font-weight="600" text-anchor="middle" font-family="${PISMO.ruka}" fill="${P.rumelka}">Z Japonska</text>`);
  s.push(obdelniky(vazacky.map((v) => [v - 3, y + 1, 6, 4]), `fill="#9E8862"`));
  s.push(`</g>`);
  return { defs, telo: s.join("") };
}

/** Truhlík zavěšený na zábradlí vlevo: aspidistra nahoru, břečťan dolů */
function truhlik() {
  const t = { x: ZAB.x0 + 10, y: ZAB.horni + 12, w: 52, h: 24 };
  const cx = t.x + t.w / 2;
  let s = "";
  // Listy nahoru (za truhlíkem)
  s += list(cx - 6, t.y + 2, 46, 6, -24, P.listTma, P.listSvetly);
  s += list(cx + 2, t.y + 2, 54, 6.5, -6, P.list, P.listSvetly);
  s += list(cx + 8, t.y + 2, 44, 6, 14, P.listTma, P.listSvetly);
  s += list(cx - 14, t.y + 3, 34, 5.5, -40, P.list, P.listSvetly);
  s += list(cx + 16, t.y + 3, 30, 5.5, 34, P.listSvetly, P.listZluty);
  // Truhlík a háčky přes madlo
  s += `<path d="M${t.x + 9} ${t.y + 2} V${ZAB.horni + 1} q0 -4 4 -4 h2 M${t.x + t.w - 9} ${t.y + 2} V${ZAB.horni + 1} q0 -4 -4 -4 h-2" stroke="${P.kovTma}" stroke-width="2" fill="none"/>`;
  s += obdelnik(t.x + 4, t.y + 4, t.w, t.h, `fill="${P.drevoTma2}" opacity="0.3"`);
  s += `<path d="M${t.x} ${t.y} H${t.x + t.w} L${t.x + t.w - 3} ${t.y + t.h} H${t.x + 3} Z" fill="#B86A44"/>`;
  s += obdelnik(t.x - 1.5, t.y, t.w + 3, 4.4, `fill="#CF8559"`);
  s += `<path d="M${t.x + t.w - 11} ${t.y + 4.4} H${t.x + t.w - 0.6} L${t.x + t.w - 3} ${t.y + t.h} H${t.x + t.w - 12} Z" fill="#97532F"/>`;
  s += snih(obdelnik(t.x - 1, t.y - 3.6, t.w + 2, 5, `rx="2.5" fill="${SNIH}"`));
  // Břečťan přes kraj dolů
  const vetve = [
    `M${t.x + 8} ${t.y + 3} C${t.x + 2} ${t.y + 18} ${t.x + 4} ${t.y + 34} ${t.x - 2} ${t.y + 50}`,
    `M${cx + 2} ${t.y + 3} C${cx + 8} ${t.y + 20} ${cx - 2} ${t.y + 30} ${cx + 4} ${t.y + 44}`,
  ];
  s += `<path d="${vetve.join("")}" stroke="${P.listTma}" stroke-width="1.4" fill="none"/>`;
  const lisky: [number, number, number][] = [[t.x + 4, t.y + 14, -30], [t.x + 3, t.y + 26, 20], [t.x + 2, t.y + 38, -20], [t.x - 1, t.y + 48, 30], [cx + 6, t.y + 16, 30], [cx + 1, t.y + 28, -30], [cx + 4, t.y + 41, 20]];
  s += lisky.map(([lx, ly, u], i) => `<path d="M0 0 c-4 -3 -6 2 -3 5 c1 1 2 1.4 3 2 c1 -0.6 2 -1 3 -2 c3 -3 1 -8 -3 -5 Z" transform="translate(${f(lx)} ${f(ly)}) rotate(${u})" fill="${i % 2 ? P.list : P.listSvetly}"/>`).join("");
  return s;
}

/** Kytička v misce na krajním sloupku vpravo (vedle kočky) */
function kvetinac() {
  const x = SLOUPKY[SLOUPKY.length - 1];
  const y = ZAB.horni;
  let s = `<path d="M${x - 7} ${y - 9} H${x + 7} L${x + 5} ${y} H${x - 5} Z" fill="${P.indigo}"/>`;
  s += obdelnik(x - 7.6, y - 10.4, 15.2, 2.8, `rx="1.2" fill="#4A5C9A"`);
  s += `<path d="M${x + 3} ${y - 7.6} L${x + 5} ${y} H${x + 2} Z" fill="${P.indigoTma}"/>`;
  const listky: [number, number, string][] = [[-46, 9, P.listSvetly], [46, 9, P.listSvetly], [-20, 11, P.list], [20, 11, P.list], [0, 12, P.listZluty]];
  s += listky.map(([u, d, b]) => list(x, y - 10, d, 3.2, u, b)).join("");
  return s;
}

/**
 * Spící kočka (mike-neko, tříbarevná) na madle vpravo; ocas visí přes madlo
 * a pohupuje se. Kreslí se v „přirozené“ velikosti a celá se zvětší o KOCKA_ZOOM
 * kolem bodu, kde leží na madle.
 */
const KOCKA_ZOOM = 1.15;
const KOCKA_OSA: Bod = [2030, Y.oknoDole + 1];
const vKocce = ([x, y]: Bod): Bod => [KOCKA_OSA[0] + (x - KOCKA_OSA[0]) * KOCKA_ZOOM, KOCKA_OSA[1] + (y - KOCKA_OSA[1]) * KOCKA_ZOOM];

function kocka(p: string) {
  const bila = "#F7F1E5";
  const stin = "#E4D8C3";
  const rezava = "#D98A45";
  const cerna = "#3B322B";
  const telo = "M1990 1043 C1986 1030 1994 1012 2012 1008 C2026 1005 2036 1008 2042 1014 L2056 1036 C2060 1042 2056 1047 2048 1047 L1996 1047 C1992 1047 1990 1046 1990 1043 Z";
  const [ox, oy] = KOCKA_OSA;
  const defs = `<clipPath id="${p}-kocka-telo"><path d="${telo}"/></clipPath>`;
  const kresba = `<g class="${TRIDY.kocka}" transform="translate(${ox} ${oy}) scale(${KOCKA_ZOOM}) translate(${-ox} ${-oy})">
    <path d="${telo}" transform="translate(7 4.5)" fill="${P.drevoTma2}" opacity="0.16"/>
    <path d="${telo}" fill="${bila}"/>
    <g clip-path="url(#${p}-kocka-telo)">
      <path d="M1986 1040 C1995 1044 2010 1044.5 2030 1043 C2042 1042 2050 1040 2058 1034 L2062 1050 H1984 Z" fill="${stin}"/>
      <path d="M2000 1012 C2008 1006 2022 1005 2030 1010 C2028 1018 2014 1022 2004 1020 C2000 1018 1998 1015 2000 1012 Z" fill="${rezava}"/>
      <path d="M1984 1040 C1986 1024 1992 1012 2003 1010 C2004 1022 1999 1031 1988 1042 Z" fill="${cerna}"/>
    </g>
    ${listek(2014, 1011.5, -14, 3)}
    <g class="${TRIDY.kocka}-ocas">
      <path d="M1990 1041 C1990 1057 1991 1070 1998 1080 C2005 1089 2016 1090 2019 1083" stroke="${rezava}" stroke-width="8" fill="none" stroke-linecap="round"/>
      <path d="M1990 1041 C1990 1057 1991 1070 1998 1080 C2005 1089 2016 1090 2019 1083" stroke="${cerna}" stroke-width="8.2" fill="none" stroke-dasharray="5 7" stroke-dashoffset="-6"/>
    </g>
    <path d="M2036 1018 L2037.5 1003 L2047 1012 Z" fill="${cerna}"/>
    <path d="M2050 1011 L2059.5 1002.5 L2061 1018 Z" fill="${rezava}"/>
    <path d="M2038.6 1015 L2039.4 1007 L2044 1011.6 Z M2052.6 1011.8 L2057.6 1007 L2058.4 1015 Z" fill="#E9A69C"/>
    <ellipse cx="2047.5" cy="1026.5" rx="15" ry="13.4" fill="${bila}"/>
    <path d="M2050 1013.4 C2056 1013 2061.6 1017 2062.4 1024 C2058 1022.6 2053 1020 2050 1013.4 Z" fill="${rezava}"/>
    <path d="M2044.6 1013.3 C2038 1013.6 2033.6 1018 2032.8 1023.4 C2037 1021.4 2042 1019 2044.6 1013.3 Z" fill="${cerna}"/>
    <path d="M2033 1031 C2036 1038 2042 1040.6 2047.5 1040.6 C2053 1040.6 2059 1038 2062 1031 C2058 1036.6 2052 1038.6 2047.5 1038.6 C2043 1038.6 2037 1036.6 2033 1031 Z" fill="${stin}"/>
    <path d="M2038 1026 q3.6 3 7.2 0 M2050 1026 q3.6 3 7.2 0" stroke="${cerna}" stroke-width="1.3" fill="none" stroke-linecap="round"/>
    <path d="M2046.1 1030 h2.8 l-1.4 1.7 Z" fill="#E08C82"/>
    <path d="M2045.4 1032.6 q1.05 1.2 2.1 0 q1.05 1.2 2.1 0" stroke="${cerna}" stroke-width="0.8" fill="none" opacity="0.8"/>
    <path d="M2040 1031.4 L2029 1029.6 M2040.4 1033.4 L2030 1035.4 M2055 1031.4 L2066 1029.6 M2054.6 1033.4 L2065 1035.4" stroke="#BFB5A6" stroke-width="0.7"/>
    <ellipse cx="2041" cy="1043.6" rx="5.2" ry="3.4" fill="${bila}"/>
    <ellipse cx="2052.4" cy="1044" rx="5.2" ry="3.4" fill="${bila}"/>
    <path d="M2041 1041 v4 M2052.4 1041.4 v4" stroke="${stin}" stroke-width="0.8"/>
  </g>`;
  return { defs, telo: kresba };
}

/* ——— Plechová stříška nad přízemím ——— */

const ST = { y0: Y.striskaNahore, y1: Y.striskaDole, l0: X.striskaL + 14, l1: X.striskaL };
/** Vlny plechu: perioda 16, hřbet vlny na ose; dolík (nejnižší místo hrany) o půl periody vedle */
const VLNA = 16;
const HREB_VLNY = S;
/** Táhla stříšky nad sloupy přízemí */
const TAHLA = PRIZEMI.sloupy.map((s) => s.x + s.w / 2);
/** Lampiony visí z hrany stříšky tady (kreslí je cedule.ts) */
const HACKY = Array.from({ length: 7 }, (_, i) => 1140 + (i * 920) / 6);

function striska(p: string) {
  const { y0, y1, l0, l1 } = ST;
  const hranaY = y1 - 10;
  const sloupec = (k: number) => {
    const o = k * VLNA;
    return `<rect x="${o + 1.4}" width="3" height="100" fill="#BFCEDC"/><rect x="${o + 4.4}" width="3.2" height="100" fill="#D7E2EC"/><rect x="${o + 10}" width="4" height="100" fill="#8FA4BA"/><rect x="${o + 14}" width="1.6" height="100" fill="#768BA2"/>`;
  };
  const sroub = (x: number, y: number) => `<circle cx="${x}" cy="${y}" r="1.9" fill="#E8EEF3"/><circle cx="${x}" cy="${y}" r="1" fill="${P.kovTma}"/>`;
  const defs = `<pattern id="${p}-vlna" patternUnits="userSpaceOnUse" x="${HREB_VLNY - 6}" y="${y0}" width="${VLNA * 5}" height="100">
    <rect width="${VLNA * 5}" height="100" fill="#A9BCCD"/>
    ${[0, 1, 2, 3, 4].map(sloupec).join("")}
    <rect x="${VLNA * 5 - 3}" width="1.6" height="100" fill="#62778F"/>
    <rect x="${VLNA * 5 - 1.4}" width="1.4" height="100" fill="#E4EBF1"/>
    ${[6, 6 + 2 * VLNA, 6 + 4 * VLNA].map((x) => sroub(x, 11) + sroub(x, 86)).join("")}
  </pattern>`;
  const s: string[] = [];
  // Plocha plechu (lichoběžník, souměrný)
  const plocha: Bod[] = [[l0, y0], [zrc(l0), y0], [zrc(l1), hranaY + 1], [l1, hranaY + 1]];
  s.push(mnohouhelnik(plocha, `fill="url(#${p}-vlna)"`));
  // Rez pod několika šrouby (jemně)
  s.push(`<path d="${[1280, 1680, 1984].map((x) => `M${x - 1.4} ${y0 + 87}h2.8l-0.6 12h-1.6z`).join("")}" fill="#A86B45" opacity="0.28"/>`);
  // Stín desky balkonu na horní části plechu
  s.push(mnohouhelnik([[X.balkonL - 10, y0], [X.balkonP + 10, y0], [X.balkonP + 24, y0 + 17], [X.balkonL + 4, y0 + 15]], `fill="${P.taskaHrana}" opacity="0.24"`));
  // Oplechování u zdi
  s.push(obdelnik(l0 - 4, y0 - 4, zrc(l0) - l0 + 8, 7, `fill="${P.plechTma}"`));
  s.push(obdelnik(l0 - 4, y0 - 4, zrc(l0) - l0 + 8, 1.6, `fill="${P.plechSvetly}"`));
  // Zima: sníh na plechu a převis nad hranou
  s.push(
    snih(
      mnohouhelnik([[l0 + 8, y0 + 3], [zrc(l0) - 8, y0 + 3], [zrc(l1) - 8, hranaY - 6], [l1 + 8, hranaY - 6]], `fill="${SNIH}" opacity="0.78"`) +
        `<path d="M${l1 + 6} ${hranaY - 9} H${zrc(l1) - 6} ${krivka(zrc(l1) - 6, l1 + 6, (x) => hranaY - 2 + 1.8 * Math.abs(Math.sin((x - S) / 12)), 4).map(([x, y]) => `L${f(x)} ${f(y)}`).join(" ")} Z" fill="${SNIH}"/>`,
    ),
  );
  // Jaro (a podzim): lístky ze sakury na pravé půlce stříšky
  s.push(([[1802, 1214, 20], [1870, 1168, -30], [1932, 1196, 70], [1990, 1160, 10], [2044, 1206, -60], [2098, 1180, 40], [2120, 1222, -10], [1736, 1188, 80]] as Bod3[]).map(([x, y, u], i) => listek(x, y, u, i % 2 ? 3 : 2)).join(""));
  // Přední hrana: konce vln (dolíky visí níž, hřbety výš)
  const vlnka = (x: number) => y1 - 4 + 4 * Math.cos((2 * Math.PI * (x - HREB_VLNY - VLNA / 2)) / VLNA);
  s.push(`<path d="${tvar([[l1, hranaY], [zrc(l1), hranaY], ...krivka(zrc(l1), l1, vlnka, 2)])}" fill="#56698A"/>`);
  s.push(`<path d="${tvar([[l1, hranaY + 3], [zrc(l1), hranaY + 3], ...krivka(zrc(l1), l1, (x) => Math.max(hranaY + 3, vlnka(x) - 2.4), 2)])}" fill="${P.taskaTma}"/>`);
  s.push(obdelnik(l1, hranaY - 1, zrc(l1) - l1, 1.8, `fill="#E4EBF1"`));
  s.push(obdelnik(l1, hranaY + 0.8, zrc(l1) - l1, 1.4, `fill="${P.taskaHrana}"`));
  // Čela na bocích (lemování)
  const bok: Bod[] = [[l0 - 4, y0 - 4], [l0 + 6, y0 - 4], [l1 + 8, y1 - 2], [l1 - 2, y1 - 2]];
  s.push(mnohouhelnik(bok, `fill="${P.plechSvetly}"`) + mnohouhelnik(bok.map(([x, y]): Bod => [zrc(x), y]), `fill="${P.plechTma}"`));
  s.push(mnohouhelnik([[l0 + 3, y0 - 4], [l0 + 6, y0 - 4], [l1 + 8, y1 - 2], [l1 + 5, y1 - 2]], `fill="${P.plech}"`));
  // Táhla: od zdi pod balkonem ke hraně, nad sloupy přízemí; napínák uprostřed
  for (const x of TAHLA) {
    s.push(cara(x + 4.5, y0 + 6, x + 4.5, hranaY - 6, `stroke="#5D6F86" stroke-width="3" opacity="0.35"`));
    s.push(cara(x, y0 - 2, x, hranaY - 8, `stroke="${P.kovTma}" stroke-width="3.2"`));
    s.push(cara(x - 0.8, y0 - 2, x - 0.8, hranaY - 8, `stroke="${P.kovSvetly}" stroke-width="0.9" opacity="0.8"`));
    s.push(obdelnik(x - 3.6, y0 + 30, 7.2, 18, `rx="3.6" fill="${P.kov}"`) + obdelnik(x - 1.2, y0 + 34, 2.4, 10, `rx="1.2" fill="${P.kovTma}"`));
    s.push(obdelnik(x - 6, y0 - 7, 12, 7, `rx="1.5" fill="${P.kovTma}"`));
    s.push(obdelnik(x - 6.5, hranaY - 13, 13, 9, `rx="1.5" fill="${P.kovTma}"`) + kruh(x - 3, hranaY - 8.5, 1.2, `fill="${P.kovSvetly}"`) + kruh(x + 3, hranaY - 8.5, 1.2, `fill="${P.kovSvetly}"`));
  }
  // Destičky s očky pro lampiony (šňůru a očko kreslí cedule.ts)
  s.push(obdelniky(HACKY.map((x) => [x - 3.5, hranaY - 2, 7, 5]), `fill="${P.kovTma}"`));
  return { defs, telo: s.join("") };
}

/* ════════════════════ SVĚTLA ════════════════════ */

function svetlaOkna(p: string) {
  const defs = `<defs>
    <radialGradient id="${p}-lampa"><stop offset="0" stop-color="${SVIT.zarBila}" stop-opacity="0.9"/><stop offset="0.22" stop-color="${SVIT.zar}" stop-opacity="0.55"/><stop offset="0.6" stop-color="${SVIT.zarTepla}" stop-opacity="0.16"/><stop offset="1" stop-color="${SVIT.zarTepla}" stop-opacity="0"/></radialGradient>
    <linearGradient id="${p}-shora" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${SVIT.zar}" stop-opacity="0.5"/><stop offset="1" stop-color="${SVIT.zar}" stop-opacity="0"/></linearGradient>
    <linearGradient id="${p}-police" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${SVIT.zar}" stop-opacity="0.18"/><stop offset="1" stop-color="${SVIT.zar}" stop-opacity="0"/></linearGradient>
    <radialGradient id="${p}-halo" cx="0.5" cy="0.45" r="0.5"><stop offset="0.6" stop-color="${SVIT.zarTepla}" stop-opacity="0.34"/><stop offset="0.8" stop-color="${SVIT.zarTepla}" stop-opacity="0.14"/><stop offset="1" stop-color="${SVIT.zarTepla}" stop-opacity="0"/></radialGradient>
    <radialGradient id="${p}-zabradli" cx="0.5" cy="0" r="0.5" gradientTransform="translate(0.25 0) scale(0.5 1)"><stop offset="0" stop-color="${SVIT.zar}" stop-opacity="0.3"/><stop offset="0.6" stop-color="${SVIT.zar}" stop-opacity="0.12"/><stop offset="1" stop-color="${SVIT.zar}" stop-opacity="0"/></radialGradient>
    <linearGradient id="${p}-madlo" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${SVIT.zar}" stop-opacity="0"/><stop offset="0.12" stop-color="${SVIT.zar}" stop-opacity="0.72"/><stop offset="0.86" stop-color="${SVIT.zar}" stop-opacity="0.72"/><stop offset="0.97" stop-color="${SVIT.zar}" stop-opacity="0"/></linearGradient>
  </defs>`;
  const s: string[] = [];
  // Záře kolem okna: jen na rámu a zdi, ne přes sklo (evenodd)
  const h = { x0: X.oknoL - 150, x1: X.oknoP + 150, y0: Y.oknoNahore - 70, y1: ZAB.deska };
  s.push(`<path d="M${h.x0} ${h.y0}H${h.x1}V${h.y1}H${h.x0}Z M${V.x} ${V.y}V${V.y + V.h}H${V.x + V.w}V${V.y}Z" fill="url(#${p}-halo)" fill-rule="evenodd"/>`);
  // Teplo nahoře v tabulkách (od lampiček) — ke kusům slábne
  for (const t of OKNO.tabulky) s.push(obdelnik(t.x, t.y, t.w, 66, `fill="url(#${p}-shora)"`));
  // Lampičky: záře a rozsvícený papír
  for (const cx of LAMPICKY) {
    const { y, rx, ry } = LAMPICKA;
    s.push(elipsa(cx, y, 64, 46, `fill="url(#${p}-lampa)"`));
    s.push(elipsa(cx, y, rx - 0.4, ry - 0.4, `fill="${SVIT.zar}"`));
    s.push(elipsa(cx - 1.6, y - 1, rx * 0.6, ry * 0.72, `fill="${SVIT.zarBila}"`));
    s.push(`<path d="M${f(cx - rx * 0.86)} ${f(y - 5)}Q${cx} ${f(y - 7.2)} ${f(cx + rx * 0.86)} ${f(y - 5)}M${f(cx - rx)} ${y}Q${cx} ${f(y - 2)} ${f(cx + rx)} ${y}M${f(cx - rx * 0.86)} ${f(y + 5)}Q${cx} ${f(y + 3)} ${f(cx + rx * 0.86)} ${f(y + 5)}" stroke="${SVIT.zarTepla}" stroke-width="0.9" fill="none" opacity="0.7"/>`);
  }
  // Hrana police: tenká světlá linka nahoře (nad páskou) a slabý jas na čele
  s.push(obdelnik(V.x, Y.policeOkna - 1, V.w, 2.6, `fill="${SVIT.zarBila}" opacity="0.7"`));
  s.push(obdelnik(V.x, Y.policeOkna + 1.6, V.w, OKNO.hranaPolice - 2, `fill="url(#${p}-police)"`));
  // Spodek srolované rohože a madlo zábradlí chytají světlo z okna (ke krajům slábne, kočku nechá ve tmě)
  s.push(obdelnik(X.oknoL + 8, Y.oknoNahore + 18, X.oknoP - X.oknoL - 16, 3, `fill="${SVIT.zar}" opacity="0.45"`));
  s.push(obdelnik(X.oknoL - 20, ZAB.horni, X.oknoP - X.oknoL + 40, 3.4, `fill="url(#${p}-madlo)"`));
  s.push(elipsa(S, ZAB.horni + 8, (X.oknoP - X.oknoL) / 2, 64, `fill="url(#${p}-zabradli)"`));
  // Kočka je proti oknu: jen světlý lem na hřbetě a uších
  const [ox, oy] = KOCKA_OSA;
  s.push(`<path d="M1989 1036 C1988 1022 1996 1010 2012 1007.6 C2024 1005.6 2033 1008 2038 1012.4 M2036.6 1016 L2037.6 1003 M2050.6 1010.6 L2059.6 1002.6" transform="translate(${ox} ${oy}) scale(${KOCKA_ZOOM}) translate(${-ox} ${-oy})" stroke="${SVIT.zar}" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.75"/>`);
  return defs + svetlo(PRAH.okno, s.join(""), "krm-dum-okno");
}

/* ════════════════════ SKLÁDÁNÍ ════════════════════ */

/** Místa, na která sahá stránka */
/** Obrys kočky v přirozené velikosti (uši, vousy, ocas, stín) → ve světě po zvětšení */
const KOCKA_OBRYS = (() => {
  const [x0, y0] = vKocce([1985.5, 1002]);
  const [x1, y1] = vKocce([2070, 1092]);
  return { x: Math.floor(x0), y: Math.floor(y0), w: Math.ceil(x1 - Math.floor(x0)), h: Math.ceil(y1 - Math.floor(y0)) } as Obdelnik;
})();
const OCAS = vKocce([1990, 1041]);

export const DUM = {
  /** Kočka na zábradlí — skutečný obrys kresby i s ocasem (kliknutí, bublina) */
  kocka: KOCKA_OBRYS,
  /**
   * Kořen ocasu (.krm-kocka-ocas) ve světě — osa pohybu. Ocas visí z kořene
   * dolů a stáčí se doprava, takže kořen je levý horní roh jeho fill-boxu:
   * s transform-box: fill-box stačí transform-origin 0 0 (u SVG výchozí);
   * s transform-box: view-box je to transform-origin: 1984px 1041px.
   */
  ocas: { x: f(OCAS[0]), y: f(OCAS[1]) },
  /** Prapor 航空便 / Z Japonska (.krm-dum-prapor, také .krm-vitr — kývá se kolem středu horní hrany) */
  prapor: PRAPOR,
  /** Papírek zvonku fūrin (.krm-dum-furin, .krm-vitr) — háček */
  furin: { x: FURIN.x, y: FURIN.y },
  /** Lampičky v okně patra (středy) — v noci svítí nad kusy */
  lampicky: LAMPICKY.map((x): Bod => [f(x), LAMPICKA.y]),
  /** Gekon na zdi vpravo od okna (.krm-dum-gekon) */
  gekon: { x: PANEL_P.x0 + 9, y: 938, w: 22, h: 34 } as Obdelnik,
};

export function dum(): Vrstvy {
  const pz = "kd-dum-z";
  const pu = "kd-dum-u";
  const pp = "kd-dum-p";
  const ps = "kd-dum-s";
  const strecha = hlavniStrecha(pz);
  const hreb = hreben(pz);
  const okap = podOkapem(pz);
  const strecha2 = spodniStrecha(pz);
  const zadni = `<defs>${strecha.defs}${hreb.defs}${okap.defs}${strecha2.defs}</defs>
    <g class="krm-dum-zadni">
      ${fasada()}
      ${technika()}
      ${okap.telo}
      ${strecha2.telo}
      ${svod()}
      ${strecha.telo}
      ${narozi(pz)}
      ${hreb.telo}
    </g>`;

  const vn = vnitrek(pu);
  const uvnitr = `<defs>${vn.defs}</defs><g class="krm-dum-uvnitr">${vn.telo}</g>`;

  const zab = zabradli(pp);
  const pr = prapor(pp);
  const st = striska(pp);
  const ko = kocka(pp);
  const predni = `<defs>${zab.defs}${pr.defs}${st.defs}${ko.defs}</defs>
    <g class="krm-dum-predni">
      ${stinSpodniStrechy()}
      ${okno()}
      ${sudare()}
      ${klimatizace()}
      ${zab.telo}
      ${pr.telo}
      ${truhlik()}
      ${kvetinac()}
      ${ko.telo}
      ${st.telo}
    </g>`;

  return { zadni, uvnitr, predni, svetla: svetlaOkna(ps) };
}
