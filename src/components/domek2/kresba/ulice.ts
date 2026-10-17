/**
 * Dům z ulice — obkreslený z fotky images/Dilna/6670.jpg. Souřadnice
 * kresby jsou pixely té fotky (1200 × 1600), takže kresba sedí na fotku
 * a dá se s ní porovnat posuvníkem. Do stran pokračuje ulice dál, aby
 * kresba vyplnila širokou obrazovku.
 *
 * Co na fotce je a v kresbě taky: štít do ulice s terakotovými taškami
 * a tmavým podbitím s vaznicemi, šalvějová fasáda s lizénou až pod
 * hřeben, dva balkony nad sebou s mátovým zábradlím (nahoře venkovní
 * jednotka klimatizace a židle, dole dva květináče), klimatizace na zdi,
 * pod balkonem okna dílny na konci rampy, posuvná pozinkovaná brána,
 * zídka s dřevěným plotem, lampa s obecním rozhlasem, zámková dlažba,
 * obrubník a asfalt. Za domem borovice, vlevo bambus.
 *
 * Vlevo od domu (branka, schránka, zvonek s číslem, sousedův pilíř
 * s měřáky a cihlová zeď) je podle dalších fotek — viz ulice-vlevo.ts.
 * Vstupní přístavek s rourou od žlabu je podle fotky z chodníku u schránky
 * (fotka 6670 ho schovává) — viz pristavek() níž.
 *
 * Vymyšlené je jen to, co fotky nemají: soused napravo, cedulka dílny
 * na bráně a večerní světla.
 */
import { B, f, chomac, nahoda, mnohouhelnik, obdelnik, obdelniky, cara, kruh, elipsa, mezi, kolmo, plus, pas } from "./zaklad";
import type { Bod } from "./zaklad";
import { VLEVO, bambus, plotDrevo, vlevoDefs, vlevoListi, vlevoSvetlaVpredu, vlevoSvetlaVzadu, vlevoVpredu, vlevoVzadu, zidkaUsek } from "./ulice-vlevo";

export interface UliceVolby {
  /** Předpona id v <defs> — na stránce smí být kresba víckrát */
  id?: string;
  /** Večer: ztlumí se do modra a rozsvítí okna a lampa */
  noc?: boolean;
  /** Nebe jako na fotce (pro porovnání) — jinak je za kresbou nebe stránky */
  nebe?: boolean;
  /** Brána: posuvná křídla ve vlastní skupině, aby s nimi mohl hýbat skript */
  brana?: boolean;
  /**
   * Vstupní přístavek vlevo od domu a roura od žlabu po nároží. Z fotky
   * 6670 nejsou vidět (přístavek schovává dům), takže kresba přes fotku
   * (táhlo na Kontaktu) je nemá; Úvod ano.
   */
  pristavek?: boolean;
  /**
   * Jen jedna vrstva (ve dne): „vzadu“ je dům, dílna a zem i s <defs>,
   * „vpredu“ brána, zídka a lampa — mezi ně jde vložit HTML (noren ve dveřích).
   * Druhá vrstva sahá na <defs> té první, musí být na stejné stránce.
   */
  vrstva?: "vzadu" | "vpredu";
}

/** Výřezy: hero je široký, „foto“ přesně rám fotky */
export const ULICE = {
  hero: { x: -1400, y: -90, w: 3100, h: 1390 },
  foto: { x: 0, y: 0, w: 1200, h: 1600 },
};

/** Body, ke kterým jezdí kamera a kde stojí kami (souřadnice kresby) */
export const ULICE_MISTA = {
  brana: { x: 772, y: 915 },
  dvere: { x: 591, y: 954, h: 168 },
  rozhlas: { x: 372, y: 28, w: 84, h: 70 },
  // Kami jsou větší, než by „měli“ — kresba je široká a na obrazovce by zanikli
  kapka: { x: 900, pata: 1056, w: 84 },
  bublinka: { x: 812, pata: 722, w: 62 },
  kachlik: { x: 1163, pata: 850, w: 80 },
};

/*
 * ——— Střecha: linie tašek na štítu a hrana zdi pod podbitím ———
 * Štít je souměrný kolem hřebenu nad lizénou: podbití je vlevo i vpravo
 * stejně hluboké, na každé straně jsou dvě zhlaví vaznic (střední a nad
 * rohem domu) a stejný roh u okapu. Na fotce je levé podbití kvůli
 * perspektivě jiné než pravé — souměrnost má přednost před fotkou.
 */
const HREBEN: Bod = [518, 92];
const LEVY: Bod = [25, 388];
const PRAVY: Bod = [1097, 412];
/** Hloubka podbití kolmo od hrany tašek (čelní prkno končí na 12) */
const PODBITI = 58;
/** Jak daleko pod rohem zdi končí podhled okapu, který ubíhá podél boku domu */
const OKAP = 112;
/** Lizéna pod hřebenem */
const LIZENA = { x0: 493, x1: 543 };

/** Bod ve svislici x na rovnoběžce s hranou a→b posunuté o d pod ni (a leží vlevo od b) */
function podHranou(a: Bod, b: Bod, d: number, x: number): Bod {
  const k = kolmo(a, b, d);
  const t = (x - a[0] - k[0]) / (b[0] - a[0]);
  return [x, a[1] + k[1] + (b[1] - a[1]) * t];
}

/**
 * Polovina štítu: `a`→`b` je hrana tašek zleva doprava, `konec` konec
 * okapu, `roh` vnější hrana domu pod ním (levá zeď, vpravo sloupek
 * balkonu), `lizena` hrana lizény a `ven` směr od hřebenu.
 */
interface Pulka { id: "l" | "p"; a: Bod; b: Bod; konec: Bod; roh: number; lizena: number; ven: 1 | -1 }
const PULKY: Pulka[] = [
  { id: "l", a: LEVY, b: HREBEN, konec: LEVY, roh: 150, lizena: LIZENA.x0, ven: -1 },
  { id: "p", a: HREBEN, b: PRAVY, konec: PRAVY, roh: 975, lizena: LIZENA.x1, ven: 1 },
];

/** Body poloviny štítu: hrana zdi pod podbitím, roh u okapu a kde sedí zhlaví vaznic */
function pulka(h: Pulka) {
  const zedLizena = podHranou(h.a, h.b, PODBITI, h.lizena);
  const zedRoh = podHranou(h.a, h.b, PODBITI, h.roh);
  const spodekKonce = plus(h.konec, kolmo(h.a, h.b, 14));
  const dno: Bod = [h.roh, zedRoh[1] + OKAP];
  // Podbití a podhled okapu zajedou o kus pod zeď, ať mezi nimi a zdí neprosvítá nebe
  const podZed = (x: number) => podHranou(h.a, h.b, PODBITI + 4, x);
  const pas: Bod[] = [HREBEN, h.konec, spodekKonce, podZed(h.roh - h.ven * 4), podZed(h.lizena), [HREBEN[0], podZed(h.lizena)[1]]];
  const okap: Bod[] = [spodekKonce, [h.roh - h.ven * 4, dno[1]], [h.roh - h.ven * 4, zedRoh[1]]];
  // Střední vaznice v 45 % hrany od hřebenu, krajní nad rohem domu
  const xStredni = HREBEN[0] + (h.konec[0] - HREBEN[0]) * 0.45;
  return {
    ...h, zedLizena, zedRoh, spodekKonce, dno, pas, okap,
    vaznice: [plus(podHranou(h.a, h.b, PODBITI, xStredni), [0, 4]), plus(zedRoh, [0, 4])],
  };
}
const STIT = PULKY.map(pulka);
const [STIT_L, STIT_P] = STIT;

/** Obrys lizény: vršek kopíruje spodek střechy (čelní prkno přes něj přejde), ať mezi nimi neprosvítá nebe */
const LIZENA_OBRYS: Bod[] = [
  [LIZENA.x0, 1060],
  podHranou(LEVY, HREBEN, 8, LIZENA.x0),
  [HREBEN[0], Math.max(podHranou(LEVY, HREBEN, 8, HREBEN[0])[1], podHranou(HREBEN, PRAVY, 8, HREBEN[0])[1])],
  podHranou(HREBEN, PRAVY, 8, LIZENA.x1 + 2),
  [LIZENA.x1 + 2, 1060],
];

/**
 * Řada tašek podél hrany štítu. Kreslí se zleva doprava (a je vlevo od b),
 * pak „nahoru“ v otočených souřadnicích míří opravdu nahoru a kladný
 * posun u pásů vede pod hranu.
 */
function tasky(a: Bod, b: Bod, p: string) {
  const delka = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const uhel = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
  const krok = 23.5;
  const n = Math.floor(delka / krok);
  const r = nahoda(Math.round(a[0] * 7 + b[0]));
  let s = "";
  // Čelní prkno pod taškami a jeho světlá hrana
  s += pas(a, b, 10, `fill="${B.drevoSvetlo}"`, 2);
  s += pas(a, b, 2, `fill="#8E6A4C"`, 2);
  for (let i = 0; i < n; i++) {
    const [x, y] = mezi(a, b, (i * krok + 3) / delka);
    const t = r();
    const odstin = t < 0.3 ? B.taskySvetlo : t < 0.55 ? "#C2654A" : B.tasky;
    // Taška je „hrb“ položený na hranu; tvar je v <defs> (taskaTvar), tady jen poloha a barva
    s += `<use href="#${p}-taska" transform="translate(${f(x)} ${f(y)}) rotate(${f(uhel)})" fill="${odstin}"/>`;
  }
  // Spodní lem tašek
  s += pas(a, b, 3, `fill="${B.taskyTma}"`, 0.5);
  s += `<g class="snih">${pas(a, b, 8, `fill="#FBFDFF"`, -19)}</g>`;
  return s;
}

/** Tvar jedné tašky do <defs> — výplň dostane od <use> */
const taskaTvar = (p: string) =>
  `<g id="${p}-taska"><path d="M0 3 L0 -8 Q0 -12.5 4.5 -12.5 L17 -12.5 Q21 -12.5 21 -8 L21 3 Z"/><path d="M1.5 -9 Q2 -11 5 -11 L16 -11" stroke="#E79B7E" stroke-width="1.6" fill="none" opacity="0.55"/><path d="M21 -8 L21 3" stroke="${B.taskyTma}" stroke-width="2"/></g>`;

/**
 * Konec vaznice pod podbitím: trámek prostrčený štítem (na slunci světlejší
 * než podbití), u střední vaznice i vzpěra šikmo ke zdi — na fotce jsou dva
 * na každé straně. `pata` je střed spodní hrany čela, sedí na hraně zdi;
 * zrcadlené (pravé) mají bok i vzpěru k hřebenu stejně jako levé.
 */
function vaznice(pata: Bod, s: number, zrcadlo: boolean, vzpera: boolean) {
  const m = zrcadlo ? -1 : 1;
  return `<g transform="translate(${f(pata[0] - m * 9 * s)} ${f(pata[1] - 18 * s)}) scale(${m * s} ${s})">
    ${vzpera ? `<path d="M6 18 L40 58 L52 50 L18 10 Z" fill="#5A4130"/><path d="M9 17 L41 54" stroke="#8A6848" stroke-width="2" opacity="0.7"/>` : ""}
    <path d="M-6 -12 L24 -12 L24 18 L-6 18 Z" fill="#7A5638"/>
    <path d="M-6 -12 L24 -12 L19 -19 L-11 -19 Z" fill="#9C7650"/>
    <path d="M24 -12 L24 18 L29 13 L29 -17 Z" fill="#4A3527"/>
    <path d="M-2 -6 H20 M-2 4 H20" stroke="#5E4330" stroke-width="1" opacity="0.6"/>
  </g>`;
}

/** Hřebenová vaznice: čelo trámku přímo pod hřebenem, na vršku lizény — z čela, tedy souměrné */
function vazniceHrebene(x: number, spodek: number) {
  const w = 24;
  const h = 32;
  return `<path d="M${f(x - w / 2)} ${f(spodek - h)} H${f(x + w / 2)} V${f(spodek)} H${f(x - w / 2)} Z" fill="#7A5638"/>
    <path d="M${f(x - w / 2 + 3)} ${f(spodek - h + 12)} H${f(x + w / 2 - 3)} M${f(x - w / 2 + 3)} ${f(spodek - h + 22)} H${f(x + w / 2 - 3)}" stroke="#5E4330" stroke-width="1" opacity="0.6"/>
    <path d="M${f(x - w / 2)} ${f(spodek)} H${f(x + w / 2)}" stroke="#4A3527" stroke-width="2"/>`;
}

/*
 * ——— Vstupní přístavek vlevo od domu ———
 * Na fotce 6670 ho schovává dům (vidět je jen roh jeho střechy pod
 * okapem), z úhlu kresby by ale vidět byl. Podle fotky z chodníku
 * u schránky: pultová střecha začíná pod čelem žlabu domu a ve stejném
 * sklonu jde dolů doleva, na štítu šedá závětrná lišta, světlé čelní
 * prkno a tmavé podbití se zhlavími vaznic. Šalvějová zeď s lampičkou
 * stojí kus za průčelím domu (proto je o tón tmavší), vlevo je ustoupené
 * zádveří se vchodovými dveřmi a nad ním přesah střechy s okapem — roh
 * stejně jako u domu. Roura od žlabu domu jde svisle po nároží.
 * Odhad: šířka přístavku a dveře (z fotky je za plotem jen kus rámu).
 */
const PR = {
  /** Hloubky pod hranou tašek domu: vršek lišty (zajede pod čelo žlabu), spodek lišty, spodek čelního prkna, vršek zdi */
  lista: 13,
  prkno: 21,
  podbiti: 33,
  zed: 61,
  /** Nároží zdi s lampičkou, levý konec zádveří a roh střechy nad ním */
  narozi: -95,
  konec: -190,
  roh: -285,
  /** Jak daleko pod vrškem zdi končí podhled okapu nad zádveřím */
  okap: 74,
  /** Pata zdí — schová ji plot na zídce */
  dole: 850,
  /** Roura od žlabu domu: kde na šikmém žlabu začíná koleno a kudy jde dolů */
  roura: 141,
  lampicka: { x: 18, y: 584 },
  dvere: { x0: -176, x1: -110, vrch: 612 },
};
/** Bod ve svislici x na rovnoběžce s hranou levé půlky štítu, d pod ní */
const podDomem = (d: number, x: number) => podHranou(LEVY, HREBEN, d, x);

/** Lišta přístavku od rohu k domu a body rohu u okapu — souřadnice stejně jako u poloviny štítu */
const PR_LISTA: [Bod, Bod] = [podDomem(PR.lista, PR.roh), podDomem(PR.lista, STIT_L.roh)];
const PR_SPODEK_KONCE = plus(PR_LISTA[0], kolmo(LEVY, HREBEN, PR.podbiti - PR.lista));
const PR_ZED_ROH = podDomem(PR.zed, PR.konec);
const PR_DNO: Bod = [PR.konec, PR_ZED_ROH[1] + PR.okap];
const PR_PODBITI: Bod[] = [PR_LISTA[1], PR_LISTA[0], PR_SPODEK_KONCE, podDomem(PR.zed + 4, PR.konec + 4), podDomem(PR.zed + 4, STIT_L.roh)];
const PR_OKAP: Bod[] = [PR_SPODEK_KONCE, [PR.konec + 4, PR_DNO[1]], [PR.konec + 4, PR_ZED_ROH[1]]];

/** Šikmý žlab levé půlky štítu od čela okapu k boku domu (stejné body jako ve štítu) */
const ZLAB_L: [Bod, Bod] = [
  [STIT_L.spodekKonce[0] + 8, STIT_L.spodekKonce[1] + 2],
  [STIT_L.dno[0] - 2, STIT_L.dno[1] - 4],
];

/** Přístavek: podbití a okap, zdi se zádveřím a dveřmi, lampička, vaznice a lišta navrch */
function pristavek(p: string) {
  const [a, b] = PR_LISTA;
  const zed = (x: number) => podDomem(PR.zed, x);
  const { x0, x1, vrch } = PR.dvere;
  const dw = x1 - x0;
  const { x: lx, y: ly } = PR.lampicka;
  return `
    <g class="u-pristavek">
      <!-- podbití pod lištou a na rohu podhled okapu, krokve ubíhají podél boku -->
      ${mnohouhelnik(PR_PODBITI, `fill="#3F2D21"`)}
      <g stroke="#57412F" stroke-width="2.4" opacity="0.9" clip-path="url(#${p}-pr-podbiti)">
        ${[43, 53].map((d) => {
          const u = podDomem(d, PR.roh - 30);
          const v = podDomem(d, STIT_L.roh + 10);
          return cara(u[0], u[1], v[0], v[1]);
        }).join("")}
      </g>
      ${mnohouhelnik(PR_OKAP, `fill="#33251B"`)}
      <g stroke="${B.drevo}" stroke-width="5" clip-path="url(#${p}-pr-okap)">
        ${[0.2, 0.42, 0.64, 0.86].map((t) => {
          const u = mezi(PR_ZED_ROH, PR_DNO, t);
          const o = mezi(PR_SPODEK_KONCE, PR_DNO, t);
          return cara(u[0] + 4, u[1], o[0], o[1]);
        }).join("")}
      </g>
      <g stroke-linecap="round">
        ${cara(PR_SPODEK_KONCE[0] - 5, PR_SPODEK_KONCE[1] - 3, PR_SPODEK_KONCE[0] + 17, PR_SPODEK_KONCE[1] - 1.5, `stroke="${B.svod}" stroke-width="10"`)}
        ${cara(PR_SPODEK_KONCE[0] + 7, PR_SPODEK_KONCE[1] + 2, PR_DNO[0] - 2, PR_DNO[1] - 4, `stroke="${B.svod}" stroke-width="8"`)}
        ${cara(PR_SPODEK_KONCE[0] + 5, PR_SPODEK_KONCE[1] - 1, PR_DNO[0], PR_DNO[1] - 7, `stroke="${B.pozinkSvetlo}" stroke-width="1.8" opacity="0.7"`)}
      </g>
      <!-- zeď s lampičkou a ustoupené zádveří -->
      ${mnohouhelnik([[STIT_L.roh, PR.dole], zed(STIT_L.roh), zed(PR.narozi), [PR.narozi, PR.dole]], `fill="#C1CDAE"`)}
      ${mnohouhelnik([[PR.narozi, PR.dole], zed(PR.narozi), zed(PR.konec), [PR.konec, PR.dole]], `fill="#AEBC9C"`)}
      ${mnohouhelnik([[STIT_L.roh, PR.dole], zed(STIT_L.roh), zed(PR.konec), [PR.konec, PR.dole]], `fill="url(#${p}-omitka)"`)}
      <!-- vchodové dveře: bílá zárubeň, modřínové palubky jako na brance, prosklený pruh a madlo -->
      ${obdelnik(x0 - 6, vrch - 6, dw + 12, PR.dole - vrch + 6, `fill="${B.ram}"`)}
      ${obdelnik(x1 + 3, vrch - 6, 3, PR.dole - vrch + 6, `fill="${B.ramStin}"`)}
      ${obdelnik(x0, vrch, dw, PR.dole - vrch, `fill="#8F5B3D"`)}
      <path d="${Array.from({ length: 5 }, (_, i) => `M${f(x0 + (dw * (i + 1)) / 6)} ${vrch}V${PR.dole}`).join("")}" stroke="#6E4330" stroke-width="1.2" opacity="0.7"/>
      ${obdelnik(x0, vrch, dw, PR.dole - vrch, `fill="url(#${p}-planka)"`)}
      ${obdelnik(x0 + dw * 0.18, vrch + 14, dw * 0.2, 150, `class="u-sklo" fill="${B.sklo}"`)}
      <path d="M${f(x0 + dw * 0.18)} ${vrch + 70} L${f(x0 + dw * 0.38)} ${vrch + 30} L${f(x0 + dw * 0.38)} ${vrch + 52} L${f(x0 + dw * 0.18)} ${vrch + 96} Z" fill="${B.odlesk}" opacity="0.3"/>
      ${obdelnik(x1 - 13, vrch + 60, 4, 72, `rx="2" fill="${B.nerez}"`)}
      ${obdelnik(x1 - 13, vrch + 60, 1.5, 72, `fill="${B.nerezSvetly}"`)}
      <!-- stín pod podbitím; v zádveří je pod střechou hlubší a padá i na dveře -->
      ${mnohouhelnik([zed(PR.konec), zed(STIT_L.roh), plus(zed(STIT_L.roh), [0, 36]), plus(zed(PR.konec), [0, 36])], `fill="#7E8E6E" opacity="0.26"`)}
      ${mnohouhelnik([zed(PR.konec), zed(PR.narozi), plus(zed(PR.narozi), [0, 70]), plus(zed(PR.konec), [0, 70])], `fill="#6F7F60" opacity="0.22"`)}
      ${obdelnik(PR.narozi, zed(PR.narozi)[1], 3, PR.dole - zed(PR.narozi)[1], `fill="#E2EAD5" opacity="0.7"`)}
      ${obdelnik(PR.narozi - 7, zed(PR.narozi)[1], 7, PR.dole - zed(PR.narozi)[1], `fill="#6F7F60" opacity="0.18"`)}
      <!-- lampička u vchodu: mosazný válec s mléčným sklem na podložce -->
      ${obdelnik(lx - 7, ly - 17, 14, 34, `rx="2" fill="#8A7A60" opacity="0.55"`)}
      ${obdelnik(lx - 5.5, ly - 15, 11, 30, `rx="3.5" fill="#C9AC72"`)}
      ${obdelnik(lx - 5.5, ly - 6, 11, 12, `class="u-lampicka" fill="#F2EAD2"`)}
      ${obdelnik(lx - 5.5, ly - 15, 3, 30, `rx="1.5" fill="#E8D4A0" opacity="0.8"`)}
      ${obdelnik(lx + 2.5, ly - 15, 3, 30, `rx="1.5" fill="#9C8152" opacity="0.6"`)}
      <!-- zhlaví vaznic: nad rohem zádveří a uprostřed zdi s lampičkou -->
      ${[PR.konec, -42].map((x) => vaznice(plus(zed(x), [0, 4]), 0.88, false, false)).join("")}
      <!-- čelní prkno a šedá závětrná lišta -->
      ${pas(a, b, 12, `fill="#86664A"`, PR.prkno - PR.lista)}
      ${pas(a, b, 1.6, `fill="#A88868"`, PR.prkno - PR.lista)}
      ${pas(a, b, 8, `fill="${B.svod}"`)}
      ${pas(a, b, 1.8, `fill="${B.pozinkSvetlo}"`, 0.3)}
      ${pas(a, b, 1.4, `fill="${B.pozinkTma}"`, 6.6)}
      <g class="snih">${pas(a, b, 7, `fill="#FBFDFF"`, -6)}</g>
    </g>`;
}

/**
 * Roura od žlabu domu: šikmý žlab se nad nárožím zlomí kolenem a jde
 * svisle dolů po nároží, dvě objímky, za plotem zmizí. Kreslí se místo
 * šikmého žlabu levé půlky štítu.
 */
function roura() {
  const [a, b] = ZLAB_L;
  const x = PR.roura;
  const [kx, ky] = mezi(a, b, (x - a[0]) / (b[0] - a[0]));
  const ohyb = mezi(a, [kx, ky], 0.86);
  return `
    <path d="M${f(x + 6)} ${f(ky + 16)} V${PR.dole}" stroke="#7E8E6E" stroke-width="3" opacity="0.3"/>
    <path d="M${f(a[0])} ${f(a[1])} L${f(ohyb[0])} ${f(ohyb[1])} Q${f(x)} ${f(ky)} ${f(x)} ${f(ky + 14)} V${PR.dole}" stroke="${B.svod}" stroke-width="9" fill="none"/>
    ${cara(a[0] - 2, a[1] - 3, ohyb[0] + 1, ohyb[1] - 3.5, `stroke="${B.pozinkSvetlo}" stroke-width="2" opacity="0.7"`)}
    <path d="M${f(x - 2.4)} ${f(ky + 12)} V${PR.dole}" stroke="${B.pozinkSvetlo}" stroke-width="2" opacity="0.7"/>
    ${[600, 712].map((y) => obdelnik(x - 6, y, 12, 5, `rx="1.5" fill="${B.pozinkTma}"`)).join("")}`;
}

/** Večer: rozsvícená lampička u vchodu a světlo za skleněným pruhem dveří */
function pristavekSvetla(p: string) {
  const { x, y } = PR.lampicka;
  const { x0, x1, vrch } = PR.dvere;
  const dw = x1 - x0;
  return `<radialGradient id="${p}-lampicka-zar" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#FFE3A0" stop-opacity="0.75"/><stop offset="0.45" stop-color="#FFC56E" stop-opacity="0.25"/><stop offset="1" stop-color="#FFB25A" stop-opacity="0"/></radialGradient>
    ${elipsa(x, y + 6, 92, 120, `fill="url(#${p}-lampicka-zar)" style="mix-blend-mode:screen"`)}
    ${obdelnik(x - 5.5, y - 6, 11, 12, `fill="#FFF3C8"`)}
    ${obdelnik(x0 + dw * 0.18, vrch + 14, dw * 0.2, 150, `fill="#FFD48A" opacity="0.55"`)}`;
}

/** Okno s bílým plastovým rámem: dvě křídla, odlesk, parapet */
function okno(x: number, y: number, w: number, h: number, volby: { krid?: number; zaves?: boolean; parapet?: boolean; nadsvetlik?: number; noc?: string } = {}) {
  const { krid = 2, zaves = false, parapet = true, nadsvetlik = 0 } = volby;
  const r = 6;
  let s = obdelnik(x, y, w, h, `fill="${B.ram}"`);
  s += obdelnik(x + w - 3, y, 3, h, `fill="${B.ramStin}"`);
  const vnitrek = { x: x + r, y: y + r, w: w - 2 * r, h: h - 2 * r };
  const sirka = (vnitrek.w - (krid - 1) * 6) / krid;
  for (let i = 0; i < krid; i++) {
    const sx = vnitrek.x + i * (sirka + 6);
    const sy = vnitrek.y + (nadsvetlik ? nadsvetlik + 6 : 0);
    const sh = vnitrek.h - (nadsvetlik ? nadsvetlik + 6 : 0);
    s += obdelnik(sx, sy, sirka, sh, `class="u-sklo" fill="${B.sklo}"`);
    s += `<path d="M${f(sx)} ${f(sy + sh * 0.55)} L${f(sx + sirka * 0.55)} ${f(sy)} L${f(sx + sirka * 0.8)} ${f(sy)} L${f(sx)} ${f(sy + sh * 0.85)} Z" fill="${B.odlesk}" opacity="0.28"/>`;
    if (nadsvetlik) {
      s += obdelnik(sx, vnitrek.y, sirka, nadsvetlik, `class="u-sklo" fill="${B.odlesk}" opacity="0.85"`);
      s += obdelnik(sx, vnitrek.y + nadsvetlik * 0.55, sirka, nadsvetlik * 0.45, `fill="#5F86B8" opacity="0.6"`);
    }
    if (zaves && i === 0) {
      s += `<path d="M${f(sx + 1)} ${f(sy)} H${f(sx + sirka - 1)} V${f(sy + sh)} H${f(sx + 1)} Z" fill="#F2F0EA"/>`;
      for (let k = 1; k < 6; k++) {
        s += cara(sx + (sirka * k) / 6, sy, sx + (sirka * k) / 6 + (k % 2 ? 2 : -2), sy + sh, `stroke="#D6D3CA" stroke-width="1.6"`);
      }
    }
  }
  if (parapet) s += obdelnik(x - 5, y + h, w + 10, 6, `fill="#E4E3DD"`) + obdelnik(x - 5, y + h + 6, w + 10, 2, `fill="#9EA49A" opacity="0.6"`);
  return s;
}

/** Zábradlí: madlo, spodní pásnice, svislé pruty po kroku */
function zabradli(x0: number, x1: number, horni: number, dolni: number, krok: number, sloupky: number[] = []) {
  let s = "";
  const pruty: [number, number, number, number][] = [];
  const stiny: [number, number, number, number][] = [];
  for (let x = x0 + krok * 0.6; x < x1 - 2; x += krok) {
    pruty.push([x - 1.8, horni, 3.6, dolni - horni]);
    stiny.push([x + 0.6, horni, 1.2, dolni - horni]);
  }
  s += obdelniky(pruty, `fill="${B.mata}"`) + obdelniky(stiny, `fill="${B.mataStin}" opacity="0.7"`);
  for (const x of sloupky) s += obdelnik(x - 3, horni, 6, dolni - horni + 4, `fill="${B.mata}"`) + obdelnik(x + 1, horni, 2, dolni - horni + 4, `fill="${B.mataStin}"`);
  s += obdelnik(x0, horni - 3, x1 - x0, 7, `fill="${B.mata}"`) + obdelnik(x0, horni - 3, x1 - x0, 2, `fill="${B.mataSvetlo}"`);
  s += obdelnik(x0, dolni - 2, x1 - x0, 5, `fill="${B.mata}"`) + obdelnik(x0, dolni + 2, x1 - x0, 1.5, `fill="${B.mataStin}"`);
  return s;
}

/** Pletený plot souseda — šedé dřevo, prkna proplétaná mezi sloupky */
function plotPleteny(x0: number, x1: number, horni: number, dolni: number, seed: number) {
  const r = nahoda(seed);
  let s = obdelnik(x0, horni, x1 - x0, dolni - horni, `fill="${B.pletenyTma}"`);
  const n = 14;
  const v = (dolni - horni) / n;
  for (let i = 0; i < n; i++) {
    const y = horni + i * v;
    const faze = i % 2;
    for (let x = x0; x < x1; x += 46) {
      const w = Math.min(46, x1 - x);
      const sv = (Math.floor((x - x0) / 46) + faze) % 2 === 0;
      s += `<path d="M${f(x)} ${f(y + 1)} Q${f(x + w / 2)} ${f(y + (sv ? -1.5 : 2.5))} ${f(x + w)} ${f(y + 1)} L${f(x + w)} ${f(y + v - 0.5)} Q${f(x + w / 2)} ${f(y + v + (sv ? -1.5 : 2.5))} ${f(x)} ${f(y + v - 0.5)} Z" fill="${sv ? B.pleteny : "#7C766C"}"/>`;
    }
    if (r() < 0.5) s += cara(x0 + r() * (x1 - x0), y + v * 0.5, x0 + r() * (x1 - x0), y + v * 0.5, `stroke="#A39C90" stroke-width="0.8" opacity="0.6"`);
  }
  for (let x = x0; x <= x1; x += 210) s += obdelnik(x - 4, horni - 6, 9, dolni - horni + 6, `fill="#5E584F"`) + obdelnik(x - 4, horni - 6, 3, dolni - horni + 6, `fill="#8E877C"`);
  return s;
}

/** Borovice: tmavé patrovité chomáče na tenkém kmeni */
function borovice(x: number, pata: number, v: number, seed: number) {
  let s = cara(x, pata, x + 3, pata - v * 0.75, `stroke="#4B3A2E" stroke-width="${f(v * 0.04)}"`);
  const patra = 5;
  for (let i = 0; i < patra; i++) {
    const t = i / (patra - 1);
    const cy = pata - v * (0.22 + t * 0.7);
    const rx = v * (0.34 - t * 0.22);
    s += `<path d="${chomac(x + (i % 2 ? 6 : -6), cy, rx, v * 0.11, 12, seed + i, 0.6, 0.7)}" fill="${B.borovice}"/>`;
    s += `<path d="${chomac(x - rx * 0.25, cy - v * 0.03, rx * 0.6, v * 0.06, 10, seed + 20 + i, 0.6, 0.7)}" fill="${B.boroviceSvetla}"/>`;
  }
  return s;
}

/** Zámková dlažba, asfaltová zrnitost a šrafa — vzory do <defs> */
function vzory(p: string) {
  const r = nahoda(4471);
  let asfalt = "";
  for (let i = 0; i < 46; i++) {
    const t = r();
    asfalt += `<circle cx="${f(r() * 60)}" cy="${f(r() * 60)}" r="${f(0.6 + r() * 1.3)}" fill="${t < 0.5 ? "#8E8C88" : t < 0.8 ? "#5B5956" : "#A3A09A"}"/>`;
  }
  return `
    <pattern id="${p}-dlazba" width="44" height="20" patternUnits="userSpaceOnUse" patternTransform="scale(1 0.78)">
      <rect width="44" height="20" fill="${B.dlazba}"/>
      <g stroke="${B.dlazbaSpara}" stroke-width="1.3" fill="none">
        <path d="M0 0.5 H44 M0 10.5 H44"/>
        <path d="M0.5 0.5 V3 L2.5 5.5 L0.5 8 V10.5 M22.5 0.5 V3 L24.5 5.5 L22.5 8 V10.5"/>
        <path d="M11.5 10.5 V13 L13.5 15.5 L11.5 18 V20.5 M33.5 10.5 V13 L35.5 15.5 L33.5 18 V20.5"/>
      </g>
      <path d="M3 2 H20 M14 12 H31" stroke="#DDD5C3" stroke-width="1" opacity="0.6"/>
    </pattern>
    <pattern id="${p}-asfalt" width="60" height="60" patternUnits="userSpaceOnUse">
      <rect width="60" height="60" fill="${B.asfalt}"/>${asfalt}
    </pattern>
    <pattern id="${p}-omitka" width="18" height="18" patternUnits="userSpaceOnUse">
      <circle cx="3" cy="4" r="0.8" fill="#000" opacity="0.05"/><circle cx="12" cy="9" r="0.7" fill="#fff" opacity="0.12"/><circle cx="7" cy="15" r="0.8" fill="#000" opacity="0.04"/>
    </pattern>`;
}

export function ulice(v: UliceVolby = {}) {
  const p = v.id ?? "ul";
  const noc = !!v.noc;
  const sPristavkem = !!v.pristavek;

  /* ——— Pozadí: vlevo soused za hranicí pozemku, bambus u domu (s přístavkem za jeho rohem), vpravo soused, borovice a pletený plot za bránou ——— */
  const pozadi = `
    ${vlevoVzadu(p)}
    <g class="u-sousede" opacity="0.92">
      <!-- vpravo: bílý dům s šedou střechou -->
      <path d="M1290 860 V540 L1470 410 L1650 540 V860 Z" fill="#EEEBE4"/>
      <path d="M1268 548 L1470 396 L1672 548 L1660 558 L1470 414 L1280 558 Z" fill="#5E6266"/>
      ${okno(1420, 560, 76, 86, {})}
    </g>
    ${sPristavkem ? bambus(-372, -196, 852, 586, 77) : bambus(-70, 150, 852, 598, 77)}
    ${borovice(1052, 866, 330, 611)}
    ${borovice(1215, 866, 290, 631)}
    ${borovice(1580, 870, 250, 651)}
    ${plotPleteny(1000, 1700, 650, 858, 5151)}`;

  /* ——— Střecha a štít: obě poloviny stejně, jen zrcadlově ——— */
  const stit = STIT.map((h) => `
    <!-- podbití: tmavá prkna pod přesahem střechy -->
    ${mnohouhelnik(h.pas, `fill="#3F2D21"`)}
    <g stroke="#57412F" stroke-width="2.4" opacity="0.9" clip-path="url(#${p}-podbiti-${h.id})">
      ${[23, 34, 45].map((d) => {
        const k = kolmo(h.a, h.b, d);
        const a = plus(mezi(h.a, h.b, -0.1), k);
        const b = plus(mezi(h.a, h.b, 1.1), k);
        return cara(a[0], a[1], b[0], b[1]);
      }).join("")}
    </g>
    <!-- na rohu podhled okapu: krokve ubíhají dozadu podél boku domu -->
    ${mnohouhelnik(h.okap, `fill="#33251B"`)}
    <g stroke="${B.drevo}" stroke-width="6" clip-path="url(#${p}-okap-${h.id})">
      ${[0.18, 0.38, 0.58, 0.78].map((t) => {
        const u = mezi(h.zedRoh, h.dno, t);
        const o = mezi(h.spodekKonce, h.dno, t);
        return cara(u[0] - h.ven * 4, u[1], o[0], o[1]);
      }).join("")}
    </g>
    <!-- žlab: čelo na konci okapu a dál podél boku domu (s přístavkem vlevo končí v rouře) -->
    <g stroke-linecap="round">
      ${cara(h.spodekKonce[0] + h.ven * 6, h.spodekKonce[1] - 4, h.spodekKonce[0] - h.ven * 20, h.spodekKonce[1] - 2, `stroke="${B.svod}" stroke-width="12"`)}
      ${sPristavkem && h.id === "l" ? roura() : `
        ${cara(h.spodekKonce[0] - h.ven * 8, h.spodekKonce[1] + 2, h.dno[0] + h.ven * 2, h.dno[1] - 4, `stroke="${B.svod}" stroke-width="9"`)}
        ${cara(h.spodekKonce[0] - h.ven * 6, h.spodekKonce[1] - 1, h.dno[0], h.dno[1] - 8, `stroke="${B.pozinkSvetlo}" stroke-width="2" opacity="0.7"`)}`}
    </g>`).join("");

  /* ——— Fasáda ——— */
  const zedLeva: Bod[] = [[STIT_L.roh, 1060], STIT_L.zedRoh, STIT_L.zedLizena, [LIZENA.x0, 1060]];
  const zedPrava: Bod[] = [[LIZENA.x1, 1060], STIT_P.zedLizena, STIT_P.zedRoh, [STIT_P.roh, 1060]];
  const fasada = `
    ${mnohouhelnik(zedLeva, `fill="${B.zed}"`)}
    ${mnohouhelnik(zedLeva, `fill="url(#${p}-omitka)"`)}
    ${mnohouhelnik(zedPrava, `fill="${B.zed}"`)}
    ${mnohouhelnik(zedPrava, `fill="url(#${p}-omitka)"`)}
    <!-- stín pod podbitím, na obou stranách stejně široký -->
    ${STIT.map((h) => mnohouhelnik([h.zedRoh, h.zedLizena, plus(h.zedLizena, [0, 36]), plus(h.zedRoh, [0, 36])], `fill="#7E8E6E" opacity="0.26"`)).join("")}
    <!-- lizéna až pod hřeben: vršek dosedá na spodek střechy -->
    <g clip-path="url(#${p}-lizena)">
      ${obdelnik(LIZENA.x0, 90, 52, 970, `fill="${B.pilastr}"`)}
      ${obdelnik(LIZENA.x0, 90, 52, 970, `fill="url(#${p}-omitka)"`)}
      ${obdelnik(536, 90, 9, 970, `fill="${B.zedStin}"`)}
      ${obdelnik(LIZENA.x0, 90, 3, 970, `fill="#E6EDDB" opacity="0.8"`)}
      ${mnohouhelnik([...LIZENA_OBRYS.slice(1, 4), ...LIZENA_OBRYS.slice(1, 4).reverse().map(([x, y]): Bod => [x, y + 36])], `fill="#7E8E6E" opacity="0.26"`)}
    </g>
    <!-- okna levé části -->
    ${okno(292, 395, 120, 110, { zaves: true })}
    ${okno(290, 630, 120, 105, {})}
    <!-- klimatizace na zdi, trubka nahoru a kabel dolů -->
    ${obdelnik(549, 318, 7, 36, `fill="#E9E8E2"`)}
    ${obdelnik(547, 352, 32, 44, `rx="2" fill="#F4F3EE"`)}
    <g stroke="#C9C8C1" stroke-width="1.3">${[0, 1, 2, 3, 4, 5].map((i) => cara(552, 360 + i * 5.5, 574, 360 + i * 5.5)).join("")}</g>
    ${obdelnik(544, 397, 37, 7, `fill="#E2E1DA"`)}
    <path d="M552 404 C548 470 552 560 547 640" stroke="#4A4A4A" stroke-width="1.6" fill="none" opacity="0.7"/>
    <!-- podkroví: balkonové dveře a okno -->
    ${okno(598, 397, 78, 152, { krid: 1, parapet: false })}
    ${okno(676, 397, 80, 152, { krid: 1, parapet: false })}
    <!-- na horním balkoně: plastová židle a venkovní jednotka klimatizace -->
    <g opacity="0.95">
      <path d="M692 470 H732 V500 H692 Z M690 500 H736 V508 H690 Z" fill="#F2F1EC"/>
      <path d="M694 508 L690 546 M730 508 L736 546" stroke="#E2E1DA" stroke-width="4"/>
      ${obdelnik(846, 474, 96, 72, `rx="4" fill="#ECEBE5"`)}
      ${kruh(884, 510, 27, `fill="#CFCDC5"`)}
      ${kruh(884, 510, 21, `fill="none" stroke="#B5B3AA" stroke-width="3"`)}
      <path d="M864 510 H904 M884 490 V530 M870 496 L898 524 M898 496 L870 524" stroke="#B5B3AA" stroke-width="1.6"/>
    </g>
    <!-- sloupek z balkonu pod přesah střechy -->
    ${obdelnik(969, 392, 12, 160, `fill="${B.mata}"`)}
    ${obdelnik(976, 392, 5, 160, `fill="${B.mataStin}"`)}
    ${zabradli(541, 976, 455, 541, 17.2, [755])}
    <!-- deska horního balkonu -->
    ${obdelnik(522, 548, 482, 22, `fill="${B.deska}"`)}
    ${obdelnik(522, 566, 482, 6, `fill="${B.deskaSpodek}"`)}
    <!-- lodžie v přízemí: zadní stěna ve stínu desky -->
    ${obdelnik(545, 572, 420, 244, `fill="${B.lodzie}"`)}
    ${obdelnik(545, 572, 420, 244, `fill="url(#${p}-omitka)"`)}
    ${mnohouhelnik([[545, 572], [965, 572], [965, 712], [905, 704], [575, 596], [545, 596]], `fill="#8C9C7C" opacity="0.32"`)}
    ${okno(635, 635, 84, 104, { krid: 1 })}
    <path d="M647 647 H707 V727 H647 Z" fill="none" stroke="#5B4B3E" stroke-width="1" opacity="0.5" stroke-dasharray="2 3"/>
    <!-- spodní zábradlí s květináči -->
    ${zabradli(535, 963, 723, 812, 15.2, [740])}
    <g class="u-kvetinac">
      <path d="M628 703 L662 703 L657 736 L633 736 Z" fill="#4A4642"/>
      ${obdelnik(626, 700, 38, 6, `rx="2" fill="#5A5550"`)}
      <path d="M645 702 C640 690 628 686 622 690 M645 702 C648 688 656 680 666 682 M645 702 C644 690 648 680 645 672 M645 702 C636 694 630 694 626 700" stroke="#5E8A3E" stroke-width="3" stroke-linecap="round" fill="none"/>
      <g fill="#7FAE52">${[[622, 689], [666, 681], [645, 671], [631, 683], [657, 676]].map(([x, y]) => elipsa(x, y, 6, 3.4, `transform="rotate(-25 ${x} ${y})"`)).join("")}</g>
    </g>
    <g class="u-kvetinac u-kvetinac-velky">
      <path d="M780 714 L840 714 L834 738 L786 738 Z" fill="#5A524B"/>
      ${obdelnik(777, 710, 66, 7, `rx="3" fill="#6B625A"`)}
      <path d="M786 712 C790 700 798 698 804 704 C808 694 818 694 822 704 C828 698 836 700 838 710" fill="#B9A06A"/>
      <path d="M792 710 L788 696 M806 708 L810 694 M824 708 L828 697" stroke="#9C8656" stroke-width="2"/>
    </g>
    <!-- deska nad dílnou -->
    ${obdelnik(522, 814, 448, 22, `fill="${B.deska}"`)}
    ${obdelnik(522, 836, 448, 20, `fill="${B.deskaSeda}"`)}
    ${obdelnik(522, 852, 448, 4, `fill="#8E9293"`)}
    <!-- sloup napravo -->
    ${obdelnik(963, 548, 37, 512, `fill="${B.zed}"`)}
    ${obdelnik(963, 548, 8, 512, `fill="${B.zedStin}"`)}
    <g class="snih">
      ${obdelnik(520, 543, 486, 8, `rx="4" fill="#FBFDFF"`)}
      ${obdelnik(520, 808, 452, 8, `rx="4" fill="#FBFDFF"`)}
    </g>`;

  /* ——— Dílna pod balkonem, rampa a boky ——— */
  const dilna = `
    <!-- strop výklenku a boční stěny -->
    ${obdelnik(545, 856, 418, 16, `fill="#D9DAD6"`)}
    ${obdelnik(545, 856, 14, 204, `fill="#9EAA90"`)}
    ${obdelnik(920, 856, 45, 204, `fill="${B.sedaStin}"`)}
    <!-- okna dílny: dveře a dvě pole s nadsvětlíky -->
    <g class="u-dilna-okna">
      ${okno(557, 870, 70, 168, { krid: 1, parapet: false })}
      ${obdelnik(613, 950, 4, 18, `rx="1.5" fill="#B9BCB6"`)}
      ${okno(640, 870, 132, 168, { krid: 1, parapet: false, nadsvetlik: 40 })}
      ${okno(776, 870, 145, 168, { krid: 1, parapet: false, nadsvetlik: 40 })}
      <g class="u-dilna-svetlo" opacity="0">
        ${obdelnik(563, 876, 58, 156, `fill="#FFDFA0"`)}
        ${obdelnik(646, 922, 120, 110, `fill="#FFDFA0"`)}
        ${obdelnik(782, 922, 133, 110, `fill="#FFDFA0"`)}
      </g>
    </g>
    <!-- rampa: dlažba mezi okny a bránou, odvodňovací žlab -->
    ${mnohouhelnik([[545, 1038], [965, 1038], [1000, 1062], [420, 1062]], `fill="url(#${p}-dlazba)"`)}
    ${mnohouhelnik([[545, 1038], [965, 1038], [1000, 1062], [420, 1062]], `fill="#4A4A48" opacity="0.32"`)}
    ${obdelnik(553, 1038, 370, 5, `fill="#3B3A37"`)}
    <!-- vlevo u rampy: trávník, obrubník se šikmou deskou a truhlík -->
    ${mnohouhelnik([[422, 952], [545, 968], [545, 1040], [422, 1046]], `fill="#E8E7E1"`)}
    ${mnohouhelnik([[422, 940], [545, 962], [545, 972], [422, 954]], `fill="${B.trava}"`)}
    ${mnohouhelnik([[422, 950], [545, 966], [545, 975], [422, 962]], `fill="${B.kryt}"`)}
    <g transform="translate(470 960) rotate(8)">
      ${obdelnik(-14, -16, 34, 18, `fill="#7B5B3F"`)}
      ${obdelnik(-14, -16, 34, 3, `fill="#9A7752"`)}
      <path d="M-12 -16 C-10 -26 -4 -24 -2 -18 C0 -28 8 -26 8 -18 C12 -24 18 -22 18 -16 Z" fill="#B96A48"/>
    </g>
    <!-- vpravo: šedá opěrná zeď rampy se šikmým vrškem, madlo a keře za ní -->
    <path d="${chomac(1060, 860, 80, 70, 16, 1201, 0.8, 0.7)}" fill="#55803B"/>
    <path d="${chomac(1040, 830, 52, 46, 14, 1202, 0.8, 0.7)}" fill="#7AA24C"/>
    <path d="M1080 800 L1086 760 M1060 806 L1052 768 M1100 812 L1112 776" stroke="#7A8E48" stroke-width="2"/>
    ${mnohouhelnik([[965, 872], [1126, 958], [1126, 1062], [965, 1062]], `fill="${B.seda}"`)}
    ${mnohouhelnik([[965, 864], [1126, 950], [1126, 960], [965, 874]], `fill="#DCDDD9"`)}
    ${obdelnik(996, 959, 126, 7, `rx="3" fill="#F2F2EE"`)}
    ${obdelnik(980, 944, 18, 14, `rx="2" fill="#F2F2EE"`)}`;

  /* ——— Zídka s plotem, pilíř, sousedův plot ——— */
  const zidka = `
    ${obdelnik(1128, 742, 72, 112, `fill="#B79466"`)}
    <g stroke="#9C7A50" stroke-width="2">${[0, 1, 2, 3, 4, 5, 6].map((i) => cara(1128, 752 + i * 15, 1200, 752 + i * 15)).join("")}</g>
    ${obdelnik(1200, 852, 500, 210, `fill="#D9D2C2"`)}
    ${obdelnik(1200, 846, 500, 10, `fill="#B8B1A2"`)}
    <!-- pilíř u brány -->
    ${obdelnik(1126, 852, 76, 210, `fill="${B.zidka}"`)}
    ${obdelnik(1126, 852, 10, 210, `fill="${B.zidkaStin}"`)}
    ${obdelnik(1120, 844, 88, 12, `fill="${B.strisku}"`)}
    ${obdelnik(1120, 844, 88, 3, `fill="#BDBEB7"`)}
    <!-- zídka s dřevěným plotem od branky k bráně (zvonek a číslo domu jsou u branky) -->
    ${zidkaUsek(p, VLEVO.branka.x1, 422, 2, 2)}
    <g fill="#E6EBD4" opacity="0.9">
      ${[[45, 1003], [125, 1006], [285, 1002], [362, 1004], [-240, 990], [-118, 1010]].map(([x, y]) => `<path d="M${x} ${y} l5 -6 l4 3 l3 -4 l2 9 l-6 6 l-7 -2 Z"/>`).join("")}
    </g>
    <!-- vlevo: soused za hranicí pozemku, naše zídka se schránkou, branka, zvonek a číslo -->
    ${vlevoVpredu(p)}
    ${plotDrevo(VLEVO.branka.x1 + 2, -157, 768, 843, 812)}
    ${plotDrevo(-155, -3, 768, 843, 813)}
    ${plotDrevo(0, 262, 768, 843, 814)}
    ${plotDrevo(265, 398, 752, 843, 815)}
    <!-- oleandr za plotem pod oknem -->
    <path d="M298 752 C292 736 280 730 270 732 M298 752 C300 732 310 722 322 720 M298 752 C296 738 300 726 296 714" stroke="#5E8A3E" stroke-width="2.6" stroke-linecap="round" fill="none"/>
    <g fill="#6E9A4B">${[[270, 731], [322, 719], [296, 713], [284, 724], [312, 730]].map(([x, y]) => elipsa(x, y, 7, 2.6, `transform="rotate(${(x * 7) % 60 - 30} ${x} ${y})"`)).join("")}</g>
    <g class="snih">
      ${obdelnik(VLEVO.branka.x1 - 2, 836, 426 - VLEVO.branka.x1, 7, `rx="3" fill="#FBFDFF"`)}
      ${obdelnik(1118, 839, 92, 7, `rx="3" fill="#FBFDFF"`)}
    </g>`;

  /* ——— Brána: posuvná, pozinkovaná, dvě pole na jednom pojezdu ——— */
  const pruty = (x0: number, x1: number) => {
    const xs: number[] = [];
    for (let x = x0; x <= x1; x += 22) xs.push(x);
    return (
      obdelniky(xs.map((x) => [x - 3, 776, 6, 278]), `fill="${B.pozink}"`) +
      obdelniky(xs.map((x) => [x - 1.5, 776, 1.6, 278]), `fill="${B.pozinkSvetlo}" opacity="0.85"`) +
      obdelniky(xs.map((x) => [x + 1.6, 776, 1.4, 278]), `fill="${B.pozinkTma}"`)
    );
  };
  const trubka = (x: number, y: number, w: number, h: number) =>
    obdelnik(x, y, w, h, `fill="${B.pozink}"`) + obdelnik(x, y + 1, w, Math.max(1.5, h * 0.25), `fill="${B.pozinkSvetlo}" opacity="0.9"`) + obdelnik(x, y + h - 2, w, 2, `fill="${B.pozinkTma}"`);
  const kridla = `
    ${pruty(437, 745)}
    ${pruty(780, 1110)}
    ${trubka(420, 768, 705, 10)}
    ${trubka(420, 854, 705, 13)}
    ${trubka(420, 1048, 705, 11)}
    ${obdelnik(420, 766, 8, 294, `fill="${B.pozinkTma}"`)}
    ${obdelnik(1117, 766, 8, 294, `fill="${B.pozinkTma}"`)}
    ${obdelnik(756, 766, 12, 312, `fill="${B.pozink}"`)}
    ${obdelnik(758, 766, 3, 312, `fill="${B.pozinkSvetlo}"`)}
    ${kruh(762, 1074, 7, `fill="#5B6266"`)}
    ${kruh(762, 1074, 2.5, `fill="${B.pozinkSvetlo}"`)}
    <!-- cedulka dílny na bráně -->
    <g class="u-cedule" transform="rotate(-2 1000 905)">
      <path d="M984 862 L1000 852 L1016 862" stroke="#4A4037" stroke-width="1.6" fill="none"/>
      ${kruh(1000, 852, 2.4, `fill="#5C5047"`)}
      ${obdelnik(964, 862, 74, 50, `rx="4" fill="#F2E8D2" stroke="#8A6A48" stroke-width="2"`)}
      <text x="1001" y="882" text-anchor="middle" font-size="13" font-weight="600" fill="#2B2420" font-family="Fraunces Variable, Fraunces, Georgia, serif">JIRO <tspan fill="#C4432B" font-style="italic" font-weight="400">saku</tspan></text>
      <text x="1001" y="896" text-anchor="middle" font-size="7.6" letter-spacing="0.8" fill="#5C5047" font-family="Fraunces Variable, Fraunces, Georgia, serif">KERAMICKÁ DÍLNA</text>
      <path d="M993 902 L1001 908 L1009 902" stroke="#C4432B" stroke-width="2" fill="none" stroke-linecap="round"/>
    </g>`;
  const brana = `
    ${obdelnik(420, 1058, 712, 6, `fill="#7D8387"`)}
    <g class="u-brana" clip-path="url(#${p}-brana-orez)">
      <g class="u-brana-kridla">${kridla}</g>
    </g>
    ${obdelnik(1124, 760, 11, 302, `fill="${B.pozinkTma}"`)}
    ${obdelnik(1126, 760, 3, 302, `fill="${B.pozinkSvetlo}" opacity="0.7"`)}
    ${obdelnik(1128, 870, 12, 26, `rx="2" fill="#4E5458"`)}
    ${kruh(1134, 878, 2.4, `fill="#C9CFD3"`)}`;

  /* ——— Lampa s obecním rozhlasem ——— */
  const lampa = `
    <g class="u-lampa">
      <path d="M405 -40 C405 -70 395 -78 370 -80" stroke="${B.pozinkTma}" stroke-width="7" fill="none" stroke-linecap="round"/>
      <path d="M318 -86 L372 -88 L378 -78 L314 -74 Z" fill="#6E767B"/>
      <path class="u-lampa-sklo" d="M322 -76 L374 -79 L370 -72 L326 -70 Z" fill="#E9EDEF"/>
      ${obdelnik(397, -60, 17, 968, `fill="${B.pozink}"`)}
      ${obdelnik(400, -60, 4, 968, `fill="${B.pozinkSvetlo}" opacity="0.8"`)}
      ${obdelnik(409, -60, 5, 968, `fill="${B.pozinkTma}"`)}
      <path d="M402 300 C401 420 405 600 403 900" stroke="#9C7A5A" stroke-width="2" opacity="0.35" fill="none"/>
      ${obdelnik(392, 905, 26, 226, `fill="${B.pozink}"`)}
      ${obdelnik(396, 905, 5, 226, `fill="${B.pozinkSvetlo}" opacity="0.8"`)}
      ${obdelnik(411, 905, 7, 226, `fill="${B.pozinkTma}"`)}
      ${obdelnik(389, 900, 32, 12, `rx="3" fill="${B.pozinkTma}"`)}
      ${obdelnik(390, 936, 30, 7, `rx="2" fill="#9AA5AA"`)}
    </g>
    <g class="u-rozhlas">
      <path d="M338 30 C326 60 346 96 372 92 C388 90 396 86 400 92" stroke="#2B2B2B" stroke-width="2" fill="none"/>
      <path d="M378 44 L384 72 L398 80" stroke="#55534F" stroke-width="4" fill="none" stroke-linejoin="round"/>
      ${obdelnik(395, 74, 22, 12, `rx="3" fill="#55534F"`)}
      <path d="M354 14 L402 0 L408 58 L354 42 Z" fill="#D9D3C2"/>
      <path d="M354 14 L402 0 L404 10 L356 22 Z" fill="#EEE8D8"/>
      <path d="M402 0 L410 -2 L416 60 L408 58 Z" fill="#B9B3A2"/>
      <path d="M404 4 L411 3 L415 54 L409 54 Z" fill="#3E3C38"/>
      ${obdelnik(336, 16, 20, 26, `rx="5" fill="#BDB7A6"`)}
      ${obdelnik(330, 21, 8, 16, `rx="3" fill="#A49E8E"`)}
      <g class="u-rozhlas-vlny" fill="none" stroke="#F3D27A" stroke-width="3" stroke-linecap="round" opacity="0">
        <path d="M426 10 C436 20 436 40 426 50"/>
        <path d="M440 0 C456 18 456 42 440 60"/>
        <path d="M454 -10 C476 16 476 44 454 70"/>
      </g>
    </g>`;

  /* ——— Chodník, obrubník, silnice — doleva až za okraj výřezu ——— */
  const K = VLEVO.konec;
  const zem = `
    ${obdelnik(K, 1062, 1700 - K, 86, `fill="url(#${p}-dlazba)"`)}
    ${obdelnik(K, 1062, 1700 - K, 8, `fill="#8C8577" opacity="0.35"`)}
    <path d="M400 1130 L-260 1064 L-210 1062 L414 1124 Z" fill="#3B3630" opacity="0.18"/>
    ${obdelnik(K, 1145, 1700 - K, 24, `fill="${B.obrubnik}"`)}
    ${obdelnik(K, 1145, 1700 - K, 4, `fill="#E6E0D3"`)}
    <g stroke="#A79F90" stroke-width="2">${Array.from({ length: 33 }, (_, i) => cara(-1932 + i * 112, 1146, -1934 + i * 112, 1169)).join("")}</g>
    ${obdelnik(K, 1169, 1700 - K, 460, `fill="url(#${p}-asfalt)"`)}
    ${obdelnik(K, 1169, 1700 - K, 10, `fill="#4E4C49" opacity="0.5"`)}
    <g fill="#C27A3E" opacity="0.85">
      <path d="M770 1262 c6 -6 14 -5 18 0 c4 -4 10 0 6 5 c-6 6 -18 6 -24 -5 Z"/>
      <path d="M1036 1346 c8 -8 20 -6 26 0 c6 -4 14 2 8 8 c-10 8 -26 6 -34 -8 Z"/>
    </g>
    ${vlevoListi()}
    <path class="snih" d="M${K} 1062 H1700 V1072 C1200 1080 400 1076 ${K} 1070 Z" fill="#FBFDFF"/>`;

  /* ——— Večer: světla ——— */
  /* Večer: okna svítí za bránou a zídkou, lampa a její kužel jsou vepředu */
  const svetlaVzadu = noc
    ? `<g class="u-svetla">
        ${obdelnik(304, 407, 44, 86, `fill="#FFD48A" opacity="0.85"`)}
        ${obdelnik(354, 407, 46, 86, `fill="#FFC56E" opacity="0.7"`)}
        ${obdelnik(608, 407, 58, 132, `fill="#FFCF80" opacity="0.6"`)}
        ${obdelnik(647, 647, 60, 80, `fill="#FFD48A" opacity="0.5"`)}
        ${obdelnik(563, 876, 58, 156, `fill="#FFD996" opacity="0.88"`)}
        ${obdelnik(646, 916, 120, 116, `fill="#FFD996" opacity="0.88"`)}
        ${obdelnik(782, 916, 133, 116, `fill="#FFD996" opacity="0.88"`)}
        ${mnohouhelnik([[553, 1040], [925, 1040], [1010, 1062], [450, 1062]], `fill="#FFD27A" opacity="0.3"`)}
        ${vlevoSvetlaVzadu()}
        ${sPristavkem ? pristavekSvetla(p) : ""}
      </g>`
    : "";
  const svetlaVpredu = noc
    ? `<g class="u-svetla">
        <radialGradient id="${p}-lampa-zar" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#FFE7A3" stop-opacity="0.9"/><stop offset="0.4" stop-color="#FFC66E" stop-opacity="0.35"/><stop offset="1" stop-color="#FFB25A" stop-opacity="0"/></radialGradient>
        <linearGradient id="${p}-kuzel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE7A3" stop-opacity="0.45"/><stop offset="1" stop-color="#FFE7A3" stop-opacity="0.05"/></linearGradient>
        <path d="M322 -72 L372 -76 L560 1140 L120 1140 Z" fill="url(#${p}-kuzel)" style="mix-blend-mode:screen"/>
        ${elipsa(346, -76, 140, 120, `fill="url(#${p}-lampa-zar)" style="mix-blend-mode:screen"`)}
        <path d="M322 -76 L374 -79 L370 -72 L326 -70 Z" fill="#FFF3C8"/>
        ${elipsa(340, 1120, 260, 34, `fill="#FFD27A" opacity="0.22"`)}
        ${vlevoSvetlaVpredu()}
      </g>`
    : "";

  const filtrNoci = noc
    ? `<filter id="${p}-noc" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0.2 0.03 0.04 0 0  0.03 0.22 0.08 0 0.005  0.07 0.09 0.44 0 0.03  0 0 0 1 0"/></filter>`
    : "";

  const nebe = v.nebe
    ? `<linearGradient id="${p}-nebe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3E7FD9"/><stop offset="0.55" stop-color="#6FA6EA"/><stop offset="1" stop-color="#A9DBFA"/></linearGradient>
       <rect x="${VLEVO.konec}" y="-90" width="${1700 - VLEVO.konec}" height="980" fill="url(#${p}-nebe)"/>`
    : "";

  const defs = `<defs>${vzory(p)}${vlevoDefs(p)}${filtrNoci}${taskaTvar(p)}
    <clipPath id="${p}-brana-orez"><rect x="420" y="740" width="720" height="360"/></clipPath>
    ${STIT.map((h) => `<clipPath id="${p}-podbiti-${h.id}">${mnohouhelnik(h.pas)}</clipPath><clipPath id="${p}-okap-${h.id}">${mnohouhelnik(h.okap)}</clipPath>`).join("")}
    <clipPath id="${p}-lizena">${mnohouhelnik(LIZENA_OBRYS)}</clipPath>
    ${sPristavkem ? `<clipPath id="${p}-pr-podbiti">${mnohouhelnik(PR_PODBITI)}</clipPath><clipPath id="${p}-pr-okap">${mnohouhelnik(PR_OKAP)}</clipPath>` : ""}
  </defs>`;
  // Vaznice a tašky jdou přes podbití i přes horní hranu zdi; vpravo zrcadlově, ať je štít souměrný
  const strecha = `
    ${STIT.map((h) => h.vaznice.map((pata, i) => vaznice(pata, 1.1, h.ven === 1, i === 0)).join("")).join("")}
    ${vazniceHrebene(HREBEN[0], 140)}
    ${tasky(LEVY, HREBEN, p)}
    ${tasky(HREBEN, PRAVY, p)}
    ${elipsa(HREBEN[0], HREBEN[1], 9, 7, `fill="${B.taskyTma}"`)}
    ${elipsa(HREBEN[0] - 1, HREBEN[1] - 2, 5, 3.5, `fill="${B.taskySvetlo}" opacity="0.7"`)}`;

  /*
   * Pořadí vrstev: pozadí, přístavek (střecha domu ho překryje), štít,
   * fasáda, střecha, rampa, chodník, brána, zídka (brána za ní zajede),
   * lampa úplně vepředu.
   */
  const vzadu = `${pozadi}${sPristavkem ? pristavek(p) : ""}${stit}${fasada}${strecha}${dilna}${zem}`;
  const vpredu = `${brana}${zidka}${lampa}`;
  if (!noc && v.vrstva === "vzadu") return `${defs}${nebe}${vzadu}`;
  if (!noc && v.vrstva === "vpredu") return vpredu;
  if (!noc) return `${defs}${nebe}${vzadu}${vpredu}`;
  return `${defs}${nebe}<g filter="url(#${p}-noc)">${vzadu}</g>${svetlaVzadu}<g filter="url(#${p}-noc)">${vpredu}</g>${svetlaVpredu}`;
}
