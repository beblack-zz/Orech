/**
 * Kontakt uvnitř — ústředna 交換台 v dílně. Kamera vjela po provázku oknem
 * dovnitř: provázky od všech linek vedou pod stropem na kladky na římse
 * dubové skříně s kolíky (cord switchboard) na oválném stole z kanceláře.
 *
 * Skříň má devět okének katōmado po třech řadách — v každém sedí jeden
 * z party a nad ním visí na niti jeho hrneček. Pod okénkem jmenovka,
 * kontrolka, mosazná zdířka a smaltované číslo linky 一 až 九. Dole šikmá
 * police s devíti kolíky kōhaku (červené a bílé) a pod ní zástěra
 * s průzory, ve kterých na šňůrách visí mosazná závaží — když se kolík
 * vytáhne, závaží v průzoru vyjede nahoru.
 *
 * Linka 二 je telefon dílny: v okénku sedí ten, kdo má službu. Vlevo
 * u ústředny kniha rezervací s háčkem pro Cedulku, vpravo psací stroj pro
 * Kachlíka — z okének 四 a 六 k nim při hovoru skočí.
 *
 * Když je zavřeno, je v dílně potmě, kami spí u svých hrnečků (Bublinka
 * se schovává za svým) a přes štít ústředny visí cedulka 準備中 s příští
 * otevírací dobou. Kontrolky a okénka spojených linek svítí do tmy.
 *
 * Kresba je rozdělená na pozadí (stěna, stůl, fíkus, hodiny — přes celou
 * šířku), jádro (ústředna, kniha, stroj) a ústřednu samotnou, která se
 * kreslí ve vlastních souřadnicích (U) a do jádra se posune a zmenší.
 * Co se hýbe (kolíky, šňůry, závaží, hrnečky, pózy party, Cedulka,
 * Kachlík, klávesy, listy), má třídu a data-l / data-p a skript
 * scripts/kontakt/uvnitr.ts to po snímcích přepisuje.
 */
import type { PostavaId } from "../../../data/parta";
import { CISLA } from "../../../data/ustredna";
import { type Bod, f, nahoda, provazek, prohnuty, provazekSvg } from "./zaklad";

/** Měřítko na čtyři místa — f() zaokrouhluje na desetiny, což by měřítko jádra i kami posunulo */
const f4 = (n: number) => Math.round(n * 10000) / 10000;
/**
 * Kami ze spritu stránky (#ko-k-<id>, rám 180 × 180) — jako kami() ze zaklad.ts,
 * jen s přesným měřítkem, ať postavička sedí přesně v okénku i v bodech pro bubliny.
 */
const kami = (id: PostavaId, x: number, y: number, velikost: number, trida = "") =>
  `<g class="ko-kami ${trida}" data-kami="${id}" transform="translate(${f(x)} ${f(y)}) scale(${f4(velikost / 180)})"><use href="#ko-k-${id}"/></g>`;
import type { Rezim } from "./venku";

export interface UvnitrVolby {
  W: number;
  H: number;
  rezim: Rezim;
  panel: { prava: number; dolni: number };
  kdo: PostavaId;
  /** Zavřeno: potmě, kami spí a na ústředně visí cedulka */
  otevreno: boolean;
  /** Řádky cedulky, když je zavřeno (např. „otevíráme v úterý v 9:00“) */
  cedulka?: string[];
  /** Kdo sedí na které lince (0 = 一) a jméno na jmenovku */
  linky: { id: PostavaId; jmeno: string }[];
}

/** Jedna linka: zdířka, okénko, kami v něm a jeho hrneček */
export interface LinkaBody {
  k: number;
  id: PostavaId;
  /** Ve scéně: střed zdířky, buňka (okénko až zdířka), hlava kami, kontrolka, střed okénka */
  jack: Bod;
  bunka: [number, number, number, number];
  hlava: Bod;
  lampa: Bod;
  nika: Bod;
  /** V souřadnicích ústředny (U): očko nitě, kde drží hrnek u ucha, délka nitě, chodidla (osa pózy) */
  oko: Bod;
  ucho: Bod;
  delka: number;
  nohy: Bod;
  /** Kami v jádře (pro výskok z okénka): levý horní roh rámu a velikost */
  kamiJ: { x: number; y: number; v: number };
}

export interface KolikBody {
  i: number;
  /** Díra v polici (scéna) */
  dira: Bod;
  bily: boolean;
}

export interface UvnitrBody {
  zavreno: boolean;
  /** Posun a měřítko jádra ve scéně */
  jadro: { ox: number; oy: number; k: number };
  /** Posun a měřítko ústředny (U) v jádře */
  us: { ox: number; oy: number; m: number };
  /** Kolik jednotek scény je jedna jednotka ústředny */
  m: number;
  linky: LinkaBody[];
  koliky: KolikBody[];
  /** Kde jde chytit kolík v polici (scéna) */
  police: [number, number, number, number];
  /** Linka 二: kde vchází pod stropem a kladka na římse (scéna) */
  vstup: Bod;
  kladka: Bod;
  /** Kam kamera při příletu míří (scéna) */
  ohnisko: Bod;
  /** Cedulka: hák (jádro) — null, když se na stůl nevešla */
  cedulka: { hak: Bod; velikost: number } | null;
  kniha: { hrbet: Bod; sirka: number; zdvih: number } | null;
  /** Kachlík u stroje (jádro) */
  kachlik: { x: number; y: number; velikost: number };
  /** Středy kláves v jádře (pro skoky) */
  klavesy: Bod[];
  /** Šířka provázků a šňůr kolíků */
  w0: number;
  w1: number;
  sn: number;
}

const GLAZURY = [
  { svetlo: "#C6DCC4", stred: "#93B39B", stin: "#5E7C68" },
  { svetlo: "#8A5A34", stred: "#3A2A22", stin: "#1E1612" },
  { svetlo: "#F6EEE2", stred: "#E9D5C0", stin: "#C98E6A" },
  { svetlo: "#FFFDF8", stred: "#EFEAE0", stin: "#B9B0A2" },
  { svetlo: "#D8D6CC", stred: "#A9A79C", stin: "#6E6C64" },
  { svetlo: "#C27A4A", stred: "#8A4A2A", stin: "#4E2A18" },
];
const DUB = { svetlo: "#E2C597", stred: "#C9A472", stin: "#9C7A4C", tma: "#6E5232" };
export const AKTIVNI = 1;

/** Text, který Kachlík ťuká — skript ho odkrývá po písmenech */
export const PAPIR = ["Ahoj!", "Tady je tvůj odkaz", "na rezervace:", "jirosaku.cz/rezervace", "Vyber si hodinu. Kachlík"];

/* ═══ Ústředna ve vlastních souřadnicích (U) ═══
   skříň 0…540 × 0…790, nad ní štít do −46, vpravo klika do 572 */
const U = {
  w: 540,
  /** vnitřní lakovaný panel s okénky */
  px0: 22,
  py0: 42,
  sloupec: 496 / 3,
  radek: 185.3,
  /** police s kolíky: zadní a přední hrana, díry */
  policeZ: 612,
  policeP: 662,
  diraY: 636,
  /** zástěra s průzory a závažím */
  zasteraY: 676,
  sterbinaY0: 686,
  sterbinaY1: 770,
  dno: 790,
};
/** Kam až závaží vyjede (U) */
export const ZAVAZI_ZDVIH = 52;
/** Rozteč kolíků v polici (U) */
const DIRY = Array.from({ length: 9 }, (_, i) => 30 + i * 60);

/** Kde v rámu 180 × 180 je každá postavička (x0, y0, x1, y1) — pro okénka, uši a bubliny */
const RAM: Record<PostavaId, [number, number, number, number]> = {
  kapka: [30, 22, 149, 166],
  pecinka: [40, 14, 140, 155],
  bublinka: [22, 22, 158, 160],
  cedulka: [50, 20, 130, 141],
  kachlik: [42, 30, 137, 156],
  hlinka: [39, 24, 141, 149],
  samotka: [0, 58, 180, 164],
  stripek: [34, 52, 150, 155],
  vazicka: [39, 19, 144, 156],
};

/** Póza kami v okénku: náklon kolem chodidel a posun dolů */
export interface Poza {
  rot: number;
  dy: number;
}
export const POZA_SPI: Poza = { rot: 7, dy: 3 };
/** Bublinka v noci: schovaná za svým hrnečkem, kouká jí jen klobouk */
export const POZA_SCHOVANA: Poza = { rot: 0, dy: 50 };
export const pozaTransform = (p: Poza, nohy: Bod) => `rotate(${f(p.rot)} ${f(nohy[0])} ${f(nohy[1])}) translate(0 ${f(p.dy)})`;

/** Hrneček visí za dno na niti: chodidlo v 0,0, tělo míří po +y */
export function hrnekTransform(oko: Bod, ucho: Bod, delka: number, theta: number, u: number) {
  const visi: Bod = [oko[0] - delka * Math.sin(theta), oko[1] + delka * Math.cos(theta)];
  const uUcha: Bod = [ucho[0] + 31, ucho[1]];
  const x = visi[0] + (uUcha[0] - visi[0]) * u, y = visi[1] + (uUcha[1] - visi[1]) * u;
  const fi = (theta * 180) / Math.PI * (1 - u) + 90 * u;
  return { pata: [x, y] as Bod, transform: `translate(${f(x)} ${f(y)}) rotate(${f(fi)})` };
}
/** Nit od očka k patě hrnečku — s průvěsem, když je volná */
export function nitD(oko: Bod, pata: Bod, delka: number) {
  const d = Math.hypot(pata[0] - oko[0], pata[1] - oko[1]);
  const vole = Math.max(0, delka * 1.4 - d) * 0.5;
  const mx = (oko[0] + pata[0]) / 2, my = (oko[1] + pata[1]) / 2 + vole;
  return `M${f(oko[0])} ${f(oko[1])} Q${f(mx)} ${f(my)} ${f(pata[0])} ${f(pata[1])}`;
}

/** Okénko katōmado: rovné boky, nahoře zvonový oblouk do špičky */
function katomado(cx: number, yb: number, w: number, h: number) {
  const t = yb - h;
  return `M${f(cx - w)} ${f(yb)} L${f(cx - w)} ${f(yb - h * 0.46)} C${f(cx - w)} ${f(yb - h * 0.76)} ${f(cx - w * 0.66)} ${f(yb - h * 0.84)} ${f(cx - w * 0.34)} ${f(yb - h * 0.87)} C${f(cx - w * 0.12)} ${f(yb - h * 0.89)} ${f(cx - w * 0.05)} ${f(t + h * 0.07)} ${f(cx)} ${f(t)} C${f(cx + w * 0.05)} ${f(t + h * 0.07)} ${f(cx + w * 0.12)} ${f(yb - h * 0.89)} ${f(cx + w * 0.34)} ${f(yb - h * 0.87)} C${f(cx + w * 0.66)} ${f(yb - h * 0.84)} ${f(cx + w)} ${f(yb - h * 0.76)} ${f(cx + w)} ${f(yb - h * 0.46)} L${f(cx + w)} ${f(yb)} Z`;
}

/** Hrneček (yunomi) zavěšený dnem vzhůru — kreslí se kolem paty v 0,0 */
function hrnecek(k: number) {
  return `<rect x="-7.5" y="-1.5" width="15" height="5.5" rx="1.6" fill="#C9A27A"/>
    <rect x="-7.5" y="-1.5" width="15" height="1.6" rx="0.8" fill="#E6CFA8"/>
    <path d="M-11 4 L11 4 L13.6 28.4 Q0 31.6 -13.6 28.4 Z" fill="url(#ko-us-h${k})"/>
    <path d="M-13.6 28.4 Q0 31.6 13.6 28.4 Q0 34.6 -13.6 28.4 Z" fill="#2B2420" opacity="0.5"/>
    <path d="M-7.6 8 C-8.6 14 -8.8 20 -8.4 25.6" stroke="#FFFFFF" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.5"/>`;
}

/** Jedno okénko s kami, hrnečkem a nití (U) */
function nika(k: number, cx: number, top: number, id: PostavaId, zavreno: boolean, sluzba: boolean) {
  const w = 64, h = 104;
  const yb = top + 12 + h;
  const d = katomado(cx, yb, w, h);
  const v = id === "samotka" ? 88 : 92;
  const [x0, y0, x1, y1] = RAM[id];
  const stred = cx - (id === "samotka" ? 12 : 18);
  const fx = stred - (v * (x0 + x1)) / 360;
  const fy = yb - 7 - (v * y1) / 180;
  const nohy: Bod = [stred, yb - 7];
  const hlava: Bod = [stred, fy + (v * y0) / 180];
  const ucho: Bod = [fx + (v * (x1 - (x1 - x0) * 0.08)) / 180, fy + (v * (y0 + (y1 - y0) * 0.36)) / 180];
  const oko: Bod = [cx + 37, yb - h * 0.8];
  const delka = 12;
  const pocatek = zavreno ? (id === "bublinka" ? POZA_SCHOVANA : POZA_SPI) : { rot: 0, dy: 0 };
  const hr = hrnekTransform(oko, ucho, delka, 0, 0);
  let s = `<defs><clipPath id="ko-us-nika-${k}"><path d="${d}"/></clipPath></defs>`;
  s += `<path d="${d}" fill="url(#ko-us-nika)"/>`;
  s += `<g clip-path="url(#ko-us-nika-${k})">`;
  /* papírová stěna s jemným světlem shora, podlaha z tatami */
  s += `<ellipse cx="${f(cx)}" cy="${f(top + 30)}" rx="${f(w * 0.9)}" ry="${f(h * 0.5)}" fill="#FFF6E2" opacity="0.6"/>`;
  s += `<rect x="${f(cx - w)}" y="${f(yb - 9)}" width="${f(w * 2)}" height="9" fill="#C7A777"/>`;
  s += `<rect x="${f(cx - w)}" y="${f(yb - 9)}" width="${f(w * 2)}" height="1.6" fill="#E3CDA2"/>`;
  s += `<ellipse cx="${f(stred)}" cy="${f(yb - 6)}" rx="${f(v * 0.3)}" ry="3" fill="#6E5232" opacity="0.25"/>`;
  s += `<g class="ko-us-obyv" data-l="${k}">`;
  s += `<g class="ko-us-poza" data-l="${k}" transform="${pozaTransform(pocatek, nohy)}">${kami(id, fx, fy, v, "ko-us-kami")}</g>`;
  s += `<path class="ko-us-nit" data-l="${k}" d="${nitD(oko, hr.pata, delka)}" stroke="#B84A2B" stroke-width="1.7" fill="none"/>`;
  s += `<path class="ko-us-nit2" data-l="${k}" d="${nitD(oko, hr.pata, delka)}" stroke="#FBF7EE" stroke-width="1.7" stroke-dasharray="2 2.6" fill="none"/>`;
  s += `<g class="ko-us-hrnek" data-l="${k}" transform="${hr.transform}">${hrnecek(k)}</g>`;
  s += `</g></g>`;
  /* zavřeno: okénko je potmě, dokud se linka nespojí (pak ho CSS rozsvítí) */
  if (zavreno) s += `<path class="ko-us-tma-niky" d="${d}" fill="#0B1030" opacity="0.5"/>`;
  /* očko a rám okénka: tmavé dřevo se zlatou linkou */
  s += `<circle cx="${f(oko[0])}" cy="${f(oko[1])}" r="2.6" fill="none" stroke="#C9A04A" stroke-width="1.4"/>`;
  s += `<path d="${d}" fill="none" stroke="#3A271B" stroke-width="7"/>`;
  s += `<path d="${d}" fill="none" stroke="#C9A04A" stroke-width="1.3" opacity="0.9"/>`;
  /* linka 二 je telefon dílny: nad okénkem uzel mizuhiki */
  if (sluzba) s += mizuhiki(cx, top + 12);
  return { svg: s, oko, ucho, delka, nohy, hlava, kami: { x: fx, y: fy, v }, stred: [cx, yb - h * 0.45] as Bod };
}

/** Červenobílý uzel mizuhiki se dvěma konci */
function mizuhiki(cx: number, y: number) {
  return `<g>
    <path d="M${f(cx - 22)} ${f(y + 2)} C${f(cx - 14)} ${f(y - 8)} ${f(cx - 4)} ${f(y - 6)} ${f(cx)} ${f(y)} C${f(cx + 4)} ${f(y - 6)} ${f(cx + 14)} ${f(y - 8)} ${f(cx + 22)} ${f(y + 2)}" stroke="#C4432B" stroke-width="3.4" fill="none" stroke-linecap="round"/>
    <path d="M${f(cx - 20)} ${f(y + 5)} C${f(cx - 13)} ${f(y - 3)} ${f(cx - 4)} ${f(y - 1)} ${f(cx)} ${f(y + 4)} C${f(cx + 4)} ${f(y - 1)} ${f(cx + 13)} ${f(y - 3)} ${f(cx + 20)} ${f(y + 5)}" stroke="#FBF7EE" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <circle cx="${f(cx)}" cy="${f(y + 2)}" r="3.6" fill="#C4432B"/>
    <path d="M${f(cx - 2)} ${f(y + 5)} L${f(cx - 5)} ${f(y + 15)} M${f(cx + 2)} ${f(y + 5)} L${f(cx + 5)} ${f(y + 15)}" stroke="#C4432B" stroke-width="2" stroke-linecap="round"/>
  </g>`;
}

/** Kontrolka: skleněná čočka v mosazné objímce (sklo přebarví CSS podle stavu) */
function lampa(cx: number, cy: number) {
  return `<circle cx="${f(cx)}" cy="${f(cy)}" r="11.5" fill="url(#ko-us-mosaz-r)" stroke="#5E4520" stroke-width="1"/>
    <circle cx="${f(cx)}" cy="${f(cy)}" r="8.4" fill="#3A2614"/>
    <circle class="ko-us-sklo" cx="${f(cx)}" cy="${f(cy)}" r="7.4" fill="url(#ko-us-sklo-vyp)"/>
    <ellipse cx="${f(cx - 2.4)}" cy="${f(cy - 2.8)}" rx="2.6" ry="1.8" fill="#FFFFFF" opacity="0.6"/>`;
}

/** Mosazná zdířka v rozetě */
function zdirka(cx: number, cy: number) {
  return `<circle cx="${f(cx + 1.4)}" cy="${f(cy + 2)}" r="16" fill="#120C08" opacity="0.35"/>
    <circle class="ko-us-zdirka" cx="${f(cx)}" cy="${f(cy)}" r="15" fill="url(#ko-us-mosaz-r)" stroke="#5E4520" stroke-width="1"/>
    <circle cx="${f(cx)}" cy="${f(cy)}" r="10.6" fill="#8C6A2C"/>
    <circle cx="${f(cx)}" cy="${f(cy)}" r="7.6" fill="#140E0B"/>
    <path d="M${f(cx - 6.4)} ${f(cy - 3.6)} A7.4 7.4 0 0 1 ${f(cx + 2.6)} ${f(cy - 7)}" stroke="#F8E3A0" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.75"/>`;
}

/** Smaltovaný štítek s číslem linky */
function cislo(cx: number, cy: number, k: number) {
  return `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="12.4" ry="10" fill="#FBF8F0" stroke="#3B4A6E" stroke-width="1.5"/>
    <text class="ko-kanji" x="${f(cx)}" y="${f(cy + 4.6)}" text-anchor="middle" font-size="13" fill="#26324F">${CISLA[k]}</text>`;
}

/** Jmenovka: papírový proužek v mosazném rámečku, jméno štětcem */
function jmenovka(cx: number, cy: number, jmeno: string) {
  return `<rect x="${f(cx - 58)}" y="${f(cy - 12.5)}" width="116" height="25" rx="4" fill="url(#ko-us-mosaz)" stroke="#5E4520" stroke-width="0.8"/>
    <rect x="${f(cx - 53)}" y="${f(cy - 9)}" width="106" height="18" rx="1.6" fill="#F6EEDC"/>
    <circle cx="${f(cx - 55.4)}" cy="${f(cy)}" r="1.3" fill="#5E4520"/><circle cx="${f(cx + 55.4)}" cy="${f(cy)}" r="1.3" fill="#5E4520"/>
    <text class="ko-ruka-tucne" x="${f(cx)}" y="${f(cy + 6)}" text-anchor="middle" font-size="18" fill="#2B2420">${jmeno}</text>`;
}

/** Dvojitý zvonek na římse (zvoní, když volá linka) */
function zvonky(x: number, y: number) {
  const zvon = (cx: number) => `<path d="M${f(cx - 11)} ${f(y)} A11 11 0 0 1 ${f(cx + 11)} ${f(y)} Z" fill="url(#ko-us-mosaz-r)" stroke="#5E4520" stroke-width="1"/>
    <path d="M${f(cx - 6)} ${f(y - 6)} A7 7 0 0 1 ${f(cx + 1)} ${f(y - 9.4)}" stroke="#FBEFC4" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
  return `<g class="ko-us-zvonky"><path d="M${f(x)} ${f(y + 1)} L${f(x)} ${f(y - 16)} M${f(x - 14)} ${f(y - 16)} L${f(x + 14)} ${f(y - 16)}" stroke="#5E4520" stroke-width="2.4" stroke-linecap="round"/>
    <g class="ko-us-zvon">${zvon(x - 14)}</g><g class="ko-us-zvon ko-us-zvon-2">${zvon(x + 14)}</g>
    <circle cx="${f(x)}" cy="${f(y - 7)}" r="2.6" fill="#3A2614"/></g>`;
}

/** Cedulka 準備中 přes štít, když je zavřeno (U) */
function cedulkaZavreno(cx: number, y: number, radky: string[]) {
  const w = 236, h = 30 + radky.length * 22;
  return `<g class="ko-u-cedulka-zavreno">
    <path d="M${f(cx - 70)} ${f(y - 22)} L${f(cx - 80)} ${f(y + 4)} M${f(cx + 70)} ${f(y - 22)} L${f(cx + 80)} ${f(y + 4)}" stroke="#5E160B" stroke-width="2.4"/>
    <path d="M${f(cx - 70)} ${f(y - 22)} L${f(cx - 80)} ${f(y + 4)} M${f(cx + 70)} ${f(y - 22)} L${f(cx + 80)} ${f(y + 4)}" stroke="#FBF7EE" stroke-width="1.6" stroke-dasharray="2 2.4"/>
    <circle cx="${f(cx - 70)}" cy="${f(y - 22)}" r="3" fill="#C9A04A"/><circle cx="${f(cx + 70)}" cy="${f(y - 22)}" r="3" fill="#C9A04A"/>
    <rect x="${f(cx - w / 2 + 3)}" y="${f(y + 4)}" width="${w}" height="${h}" rx="6" fill="#2B2420" opacity="0.22"/>
    <rect x="${f(cx - w / 2)}" y="${f(y)}" width="${w}" height="${h}" rx="6" fill="#D9CCB4" stroke="#8A6A48" stroke-width="1.6"/>
    <rect x="${f(cx - w / 2 + 5)}" y="${f(y + 5)}" width="${w - 10}" height="${h - 10}" rx="4" fill="none" stroke="#B48E5E" stroke-width="0.8"/>
    <text class="ko-kanji" x="${f(cx)}" y="${f(y + 27)}" text-anchor="middle" font-size="19" letter-spacing="3" fill="#2B2420">準備中</text>
    ${radky.map((r, i) => `<text class="ko-ruka-tucne" x="${f(cx)}" y="${f(y + 50 + i * 22)}" text-anchor="middle" font-size="${i ? 18 : 20}" fill="${i ? "#5C5047" : "#C4432B"}">${r}</text>`).join("")}
  </g>`;
}

/** Linka v souřadnicích ústředny (U) — kresba ji pak přepočte do scény */
type LinkaU = Pick<LinkaBody, "k" | "id" | "oko" | "ucho" | "delka" | "nohy"> & {
  jackU: Bod;
  bunkaU: [number, number, number, number];
  hlavaU: Bod;
  lampaU: Bod;
  nikaU: Bod;
  kamiU: { x: number; y: number; v: number };
};

/** Celá ústředna (U): skříň, okénka, zdířky, police s dírami a zástěra se závažím */
function ustredna(linky: { id: PostavaId; jmeno: string }[], zavreno: boolean, cedulka: string[]) {
  const { w, px0, py0, sloupec, radek } = U;
  let s = "";
  /* stín na stěně a na stole */
  s += `<rect x="18" y="14" width="${w}" height="${U.dno - 10}" rx="12" fill="#4A3A2A" opacity="0.13"/>`;
  s += `<ellipse cx="${f(w / 2 + 24)}" cy="${f(U.dno + 4)}" rx="${f(w * 0.62)}" ry="14" fill="#3A2A1E" opacity="0.24"/>`;
  /* kladky na římse — přes ně vedou provázky z okna do skříně */
  const kladky: Bod[] = DIRY.map((x) => [x, -6]);
  kladky.forEach(([x, y]) => {
    s += `<path d="M${f(x - 5)} ${f(y + 8)} L${f(x)} ${f(y)} L${f(x + 5)} ${f(y + 8)}" stroke="#5E4520" stroke-width="2" fill="none"/>`;
    s += `<circle cx="${f(x)}" cy="${f(y)}" r="7" fill="url(#ko-us-mosaz-r)" stroke="#5E4520" stroke-width="1"/><circle cx="${f(x)}" cy="${f(y)}" r="2.2" fill="#5E4520"/>`;
  });
  /* skříň: dubový rám, římsa, lakovaný panel */
  s += `<rect x="0" y="22" width="${w}" height="${U.policeZ - 10}" rx="8" fill="url(#ko-u-dub)" stroke="${DUB.tma}" stroke-width="1.6"/>`;
  s += `<rect x="-12" y="0" width="${w + 24}" height="30" rx="6" fill="url(#ko-us-rimsa)" stroke="${DUB.tma}" stroke-width="1.4"/>`;
  s += `<rect x="-12" y="0" width="${w + 24}" height="4" rx="2" fill="#F0DDBA" opacity="0.8"/>`;
  s += `<rect x="-6" y="26" width="${w + 12}" height="8" fill="${DUB.stin}" opacity="0.55"/>`;
  s += `<rect x="${px0}" y="${py0}" width="${f(w - px0 * 2)}" height="${f(radek * 3)}" rx="6" fill="url(#ko-us-lak)" stroke="#1E140E" stroke-width="1.4"/>`;
  s += `<rect x="${px0 + 4}" y="${py0 + 3}" width="${f(w - px0 * 2 - 8)}" height="2" rx="1" fill="#FFFFFF" opacity="0.08"/>`;
  /* mosazné rohy */
  for (const [x, y, sx, sy] of [[px0, py0, 1, 1], [w - px0, py0, -1, 1], [px0, py0 + radek * 3, 1, -1], [w - px0, py0 + radek * 3, -1, -1]] as const) {
    s += `<path d="M${f(x)} ${f(y + sy * 26)} L${f(x)} ${f(y)} L${f(x + sx * 26)} ${f(y)} Q${f(x + sx * 9)} ${f(y + sy * 9)} ${f(x)} ${f(y + sy * 26)} Z" fill="url(#ko-us-mosaz)" stroke="#5E4520" stroke-width="0.8"/>`;
  }
  /* štít 交換台 */
  s += `<g><path d="M${f(w / 2 - 124)} -6 L${f(w / 2 - 112)} -48 L${f(w / 2 + 112)} -48 L${f(w / 2 + 124)} -6 Z" fill="#2E211A" stroke="#1E140E" stroke-width="1"/>
    <rect x="${f(w / 2 - 104)}" y="-43" width="208" height="31" rx="3" fill="none" stroke="#C9A04A" stroke-width="0.9"/>
    <text class="ko-kanji" x="${f(w / 2 - 36)}" y="-20" text-anchor="middle" font-size="20" fill="#F3E3C0" letter-spacing="2">交換台</text>
    <text class="ko-pismo-soft" x="${f(w / 2 + 50)}" y="-22.5" text-anchor="middle" font-size="11.5" letter-spacing="2.4" fill="#F3E3C0">ÚSTŘEDNA</text></g>`;
  s += zvonky(w - 52, -2);
  /* klika induktoru na boku */
  const ky = 330;
  s += `<g><circle cx="${f(w + 3)}" cy="${ky}" r="10" fill="#2B2420"/><circle cx="${f(w + 3)}" cy="${ky}" r="4" fill="url(#ko-us-mosaz-r)"/><path d="M${f(w + 3)} ${ky} L${f(w + 26)} ${ky - 18}" stroke="#2B2420" stroke-width="5.4" stroke-linecap="round"/><rect x="${f(w + 21)}" y="${ky - 34}" width="10.4" height="19" rx="5.2" fill="#8A4A2A"/></g>`;

  /* okénka a linky */
  const out: LinkaU[] = [];
  linky.forEach((l, k) => {
    const r = Math.floor(k / 3), c = k % 3;
    const cx = px0 + sloupec * (c + 0.5);
    const top = py0 + radek * r;
    const n = nika(k, cx, top, l.id, zavreno, k === AKTIVNI);
    const jy = top + 160;
    let b = `<g class="ko-us-bunka" data-l="${k}">`;
    b += n.svg;
    b += jmenovka(cx, top + 133, l.jmeno);
    b += lampa(cx - 46, jy);
    b += zdirka(cx, jy);
    b += cislo(cx + 46, jy, k);
    b += `</g>`;
    s += b;
    out.push({
      k,
      id: l.id,
      oko: n.oko,
      ucho: n.ucho,
      delka: n.delka,
      nohy: n.nohy,
      jackU: [cx, jy],
      bunkaU: [cx - sloupec / 2 + 3, top + 6, cx + sloupec / 2 - 3, top + radek - 4],
      hlavaU: n.hlava,
      lampaU: [cx - 46, jy],
      nikaU: n.stred,
      kamiU: n.kami,
    });
  });

  /* police s kolíky: šikmá deska, díry s mosaznými kroužky */
  const { policeZ: pz, policeP: pp } = U;
  s += `<path d="M-8 ${pz} L${w + 8} ${pz} L${w + 18} ${pp} L-18 ${pp} Z" fill="url(#ko-us-police)" stroke="${DUB.tma}" stroke-width="1.4" stroke-linejoin="round"/>`;
  s += `<path d="M-8 ${pz} L${w + 8} ${pz}" stroke="#F0DDBA" stroke-width="2"/>`;
  s += `<path d="M-18 ${pp} L${w + 18} ${pp} L${w + 18} ${pp + 14} L-18 ${pp + 14} Z" fill="${DUB.stin}" stroke="${DUB.tma}" stroke-width="1.2"/>`;
  s += `<path d="M-18 ${pp + 1.4} L${w + 18} ${pp + 1.4}" stroke="#E7CFA6" stroke-width="1.4" opacity="0.8"/>`;
  DIRY.forEach((x) => {
    s += `<ellipse cx="${x}" cy="${U.diraY}" rx="12.6" ry="5.6" fill="url(#ko-us-mosaz-r)" stroke="#5E4520" stroke-width="0.8"/><ellipse cx="${x}" cy="${U.diraY + 0.6}" rx="8.4" ry="3.4" fill="#140E0B"/>`;
  });
  /* zástěra s průzory: v každém visí na šňůře závaží */
  const { zasteraY: zy, sterbinaY0: s0, sterbinaY1: s1 } = U;
  s += `<rect x="4" y="${zy}" width="${w - 8}" height="${U.dno - zy - 10}" fill="url(#ko-u-dub)" stroke="${DUB.tma}" stroke-width="1.4"/>`;
  s += `<rect x="-2" y="${U.dno - 12}" width="${w + 4}" height="12" rx="3" fill="${DUB.tma}"/>`;
  s += `<defs><clipPath id="ko-us-sterbiny">${DIRY.map((x) => `<rect x="${x - 9}" y="${s0}" width="18" height="${s1 - s0}" rx="9"/>`).join("")}</clipPath></defs>`;
  DIRY.forEach((x) => {
    s += `<rect x="${x - 11}" y="${s0 - 2}" width="22" height="${s1 - s0 + 4}" rx="11" fill="url(#ko-us-mosaz)" stroke="#5E4520" stroke-width="0.8"/>`;
    s += `<rect x="${x - 9}" y="${s0}" width="18" height="${s1 - s0}" rx="9" fill="url(#ko-us-sterbina)"/>`;
  });
  s += `<g clip-path="url(#ko-us-sterbiny)">`;
  DIRY.forEach((x, i) => {
    const vz = s1 - 30;
    s += `<g class="ko-us-zavazi" data-p="${i}">
      <path d="M${x} ${s0 - 120} L${x} ${vz}" stroke="#B84A2B" stroke-width="2"/>
      <path d="M${x} ${s0 - 120} L${x} ${vz}" stroke="#FBF7EE" stroke-width="2" stroke-dasharray="2 2.6"/>
      <rect x="${x - 6.6}" y="${vz}" width="13.2" height="24" rx="4.4" fill="url(#ko-us-zavazi)" stroke="#5E4520" stroke-width="0.8"/>
      <rect x="${x - 6.6}" y="${vz + 5}" width="13.2" height="1.6" fill="#5E4520" opacity="0.5"/>
    </g>`;
  });
  s += `</g>`;
  /* zavřeno: přes štít visí cedulka s příští otevírací dobou */
  if (zavreno) s += cedulkaZavreno(w / 2, -44, cedulka);
  return { svg: s, linky: out, kladky };
}

/** Kolík kōhaku: stojící v díře (pěšák) a zastrčený ve zdířce (čepička zepředu); kreslí skript */
export function kolikSvg(bily: boolean) {
  const g = bily ? "b" : "c";
  return `<g class="ko-us-kolik-telo">
    <g class="ko-us-kolik-stoji">
      <ellipse cx="0" cy="1" rx="8" ry="2.6" fill="#140E0B" opacity="0.5"/>
      <rect x="-6" y="-9" width="12" height="9.6" rx="1.6" fill="url(#ko-us-mosaz)" stroke="#5E4520" stroke-width="0.7"/>
      <path d="M-7.6 -8.6 C-9.6 -18 -6.4 -27 -5.2 -31 L5.2 -31 C6.4 -27 9.6 -18 7.6 -8.6 Z" fill="url(#ko-us-kolik-${g})" stroke="${bily ? "#A89A84" : "#5E160B"}" stroke-width="0.8"/>
      <circle cx="0" cy="-36" r="7.8" fill="url(#ko-us-kolik-${g})" stroke="${bily ? "#A89A84" : "#5E160B"}" stroke-width="0.8"/>
      <ellipse cx="-2.6" cy="-38.4" rx="2.4" ry="1.7" fill="#FFFFFF" opacity="0.65"/>
      <path d="M-3.8 -26 C-4.6 -20 -4.6 -14 -4 -10" stroke="#FFFFFF" stroke-width="1.6" fill="none" stroke-linecap="round" opacity="0.35"/>
    </g>
    <g class="ko-us-kolik-cepicka">
      <circle cx="1.6" cy="3" r="15.4" fill="#120C08" opacity="0.35"/>
      <circle cx="0" cy="0" r="14.6" fill="url(#ko-us-mosaz-r)" stroke="#5E4520" stroke-width="0.8"/>
      <circle cx="0" cy="0" r="11.4" fill="url(#ko-us-cepicka-${g})" stroke="${bily ? "#A89A84" : "#5E160B"}" stroke-width="0.8"/>
      <ellipse cx="-3.6" cy="-4.2" rx="3.6" ry="2.4" fill="#FFFFFF" opacity="0.6"/>
    </g>
  </g>`;
}

/** Psací stroj: mátový, kulaté klávesy jako kameny přes potok (jádro) */
function psaciStroj(x: number, y: number, m: number) {
  const T = (px: number, py: number) => `${f(x + px * m)} ${f(y + py * m)}`;
  let s = `<g class="ko-u-stroj">`;
  s += `<ellipse cx="${f(x + 150 * m)}" cy="${f(y + 196 * m)}" rx="${f(176 * m)}" ry="${f(16 * m)}" fill="#3A2A1E" opacity="0.22"/>`;
  s += `<path d="M${T(70, 34)} L${T(60, -112)} Q${T(150, -124)} ${T(240, -112)} L${T(230, 34)} Z" fill="#FFFDF6" stroke="#D2C6B0" stroke-width="1"/>`;
  PAPIR.forEach((r, i) => {
    s += `<text class="ko-u-radek ko-psaci" data-radek="${i}" data-text="${r}" x="${f(x + 76 * m)}" y="${f(y + (-86 + i * 15) * m)}" font-size="${f(10.4 * m)}" fill="#2B2420"${i === 3 ? ` text-decoration="underline"` : ""}>${r}</text>`;
  });
  s += `<rect x="${f(x + 18 * m)}" y="${f(y + 26 * m)}" width="${f(264 * m)}" height="${f(26 * m)}" rx="${f(13 * m)}" fill="#2B2420"/>`;
  s += `<rect x="${f(x + 24 * m)}" y="${f(y + 30 * m)}" width="${f(252 * m)}" height="${f(6 * m)}" rx="${f(3 * m)}" fill="#4A403A"/>`;
  s += `<circle cx="${f(x + 10 * m)}" cy="${f(y + 39 * m)}" r="${f(13 * m)}" fill="#C9CDD0" stroke="#7E8488" stroke-width="1"/><circle cx="${f(x + 290 * m)}" cy="${f(y + 39 * m)}" r="${f(13 * m)}" fill="#C9CDD0" stroke="#7E8488" stroke-width="1"/>`;
  s += `<path d="M${T(-6, 30)} L${T(-34, 6)} L${T(-38, 12)}" stroke="#C9CDD0" stroke-width="${f(5 * m)}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  s += `<path d="M${T(14, 52)} L${T(286, 52)} L${T(306, 150)} Q${T(308, 180)} ${T(280, 182)} L${T(20, 182)} Q${T(-8, 180)} ${T(-6, 150)} Z" fill="url(#ko-u-stroj)" stroke="#5E8C74" stroke-width="1.2"/>`;
  s += `<path d="M${T(40, 52)} L${T(260, 52)} L${T(250, 72)} L${T(50, 72)} Z" fill="#2B2420" opacity="0.85"/>`;
  s += `<path d="M${T(70, 56)} Q${T(150, 44)} ${T(230, 56)}" stroke="#C9CDD0" stroke-width="${f(3 * m)}" fill="none"/>`;
  s += `<text class="ko-kanji" x="${f(x + 150 * m)}" y="${f(y + 92 * m)}" text-anchor="middle" font-size="${f(12 * m)}" letter-spacing="${f(3 * m)}" fill="#F3ECDF">ジロ</text>`;
  const rady: [number, number, number][] = [[11, 102, 22], [11, 122, 18], [10, 141, 14], [9, 160, 10]];
  const klavesy: Bod[] = [];
  let i = 0;
  rady.forEach(([n, ry, odsaz]) => {
    for (let kk = 0; kk < n; kk++) {
      const kx = 30 + odsaz + kk * ((240 - odsaz * 2) / (n - 1));
      const cx = x + kx * m, cy = y + ry * m;
      klavesy.push([cx, cy]);
      s += `<g class="ko-u-klavesa" data-i="${i++}"><ellipse cx="${f(cx)}" cy="${f(cy + 3 * m)}" rx="${f(8.6 * m)}" ry="${f(3.6 * m)}" fill="#3A4A40" opacity="0.5"/>
        <g class="ko-u-hlava"><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(8 * m)}" fill="#2B2420" stroke="#C9CDD0" stroke-width="${f(1.4 * m)}"/>
        <circle cx="${f(cx - 2 * m)}" cy="${f(cy - 2 * m)}" r="${f(2.4 * m)}" fill="#F3ECDF" opacity="0.5"/></g></g>`;
    }
  });
  s += `<rect x="${f(x + 80 * m)}" y="${f(y + 168 * m)}" width="${f(140 * m)}" height="${f(9 * m)}" rx="${f(4.5 * m)}" fill="#2B2420" stroke="#C9CDD0" stroke-width="${f(1.2 * m)}"/>`;
  s += `<g><circle cx="${f(x + 292 * m)}" cy="${f(y + 4 * m)}" r="${f(7 * m)}" fill="#D2A64A" stroke="#8C6A24" stroke-width="1"/>
    <g class="ko-u-cink"><path d="M${T(304, -6)} q${f(6 * m)} ${f(4 * m)} 0 ${f(10 * m)} M${T(310, -12)} q${f(9 * m)} ${f(8 * m)} 0 ${f(20 * m)}" stroke="#C4432B" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <text class="ko-ruka-tucne" x="${f(x + 318 * m)}" y="${f(y - 14 * m)}" font-size="${f(22 * m)}" fill="#C4432B">cink!</text></g></g>`;
  s += `</g>`;
  return { svg: s, klavesy };
}

/** Kniha odjezdů na pultíku; listy v letu přepisuje skript (jádro) */
function kniha(x: number, y: number, m: number) {
  const T = (px: number, py: number) => `${f(x + px * m)} ${f(y + py * m)}`;
  let s = `<g class="ko-u-kniha">`;
  s += `<ellipse cx="${f(x + 120 * m)}" cy="${f(y + 150 * m)}" rx="${f(150 * m)}" ry="${f(13 * m)}" fill="#3A2A1E" opacity="0.2"/>`;
  s += `<path d="M${T(40, 60)} L${T(56, 146)} M${T(200, 60)} L${T(184, 146)}" stroke="${DUB.tma}" stroke-width="${f(7 * m)}" stroke-linecap="round"/>`;
  s += `<path d="M${T(-6, 74)} L${T(246, 74)} L${T(232, 34)} L${T(8, 34)} Z" fill="${DUB.stred}" stroke="${DUB.tma}" stroke-width="1.2"/>`;
  s += `<path d="M${T(2, 66)} L${T(238, 66)} L${T(226, 20)} L${T(14, 20)} Z" fill="#7A2E22"/>`;
  s += `<path d="M${T(10, 62)} Q${T(62, 54)} ${T(118, 62)} L${T(116, 18)} Q${T(64, 8)} ${T(20, 16)} Z" fill="#FBF6EA" stroke="#D2C6B0" stroke-width="0.8"/>`;
  s += `<path d="M${T(122, 62)} Q${T(178, 54)} ${T(230, 62)} L${T(220, 16)} Q${T(176, 8)} ${T(124, 18)} Z" fill="#F7F0E2" stroke="#D2C6B0" stroke-width="0.8"/>`;
  for (let i = 0; i < 5; i++) {
    s += `<path d="M${T(26, 26 + i * 7.4)} Q${T(66, 21 + i * 7.4)} ${T(108, 27 + i * 7.4)}" stroke="#8A7C70" stroke-width="0.7" fill="none" opacity="0.7"/>`;
    s += `<path d="M${T(132, 27 + i * 7.4)} Q${T(172, 21 + i * 7.4)} ${T(212, 26 + i * 7.4)}" stroke="#8A7C70" stroke-width="0.7" fill="none" opacity="0.7"/>`;
  }
  s += `<text class="ko-ruka-tucne" x="${f(x + 64 * m)}" y="${f(y + 18 * m)}" text-anchor="middle" font-size="${f(10 * m)}" fill="#C4432B">odjezdy · pá</text>`;
  ["9:00 Hlínka", "10:00 ✓ 2 místa", "11:00 Šamotka"].forEach((t, i) => {
    const tx = x + 28 * m, ty = y + (31 + i * 9.6) * m;
    s += `<text class="ko-ruka" x="${f(tx)}" y="${f(ty)}" font-size="${f(9 * m)}" fill="#3B322A" transform="rotate(-3 ${f(tx)} ${f(ty)})">${t}</text>`;
  });
  s += `<path d="M${T(118, 18)} L${T(120, 64)}" stroke="#B8AE9A" stroke-width="1"/>`;
  s += `<path d="M${T(150, 60)} L${T(146, 92)} L${T(152, 86)} L${T(156, 93)} L${T(156, 60)} Z" fill="#C4432B"/>`;
  s += `<path class="ko-u-list" data-list="0" d="" fill="#FFFCF4" stroke="#D2C6B0" stroke-width="0.8"/>`;
  s += `<path class="ko-u-list" data-list="1" d="" fill="#FBF6EA" stroke="#D2C6B0" stroke-width="0.8"/>`;
  s += `</g>`;
  return { svg: s, hrbet: [x + 119 * m, y + 40 * m] as Bod, sirka: 104 * m, zdvih: 70 * m };
}

function kafe(x: number, y: number, m: number, para = true) {
  return `<g transform="translate(${f(x)} ${f(y)}) scale(${f(m)})">
    <ellipse cx="0" cy="4" rx="34" ry="8" fill="#3A2A1E" opacity="0.18"/>
    <ellipse cx="0" cy="0" rx="32" ry="8" fill="#EFEAE0" stroke="#B9B0A2" stroke-width="1"/>
    <path d="M-20 -30 L-17 -3 Q0 4 17 -3 L20 -30 Z" fill="#93B39B"/>
    <ellipse cx="0" cy="-30" rx="20" ry="5" fill="#C6DCC4"/>
    <ellipse cx="0" cy="-29.4" rx="16.4" ry="3.6" fill="#4A2E1E"/>
    <path d="M-14 -18 C-15 -10 -13 -6 -10 -4" stroke="#C6DCC4" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.7"/>
    ${para ? `<path class="ko-u-para" d="M-6 -40 C-12 -50 0 -56 -6 -66 M6 -42 C0 -52 12 -58 6 -70" stroke="#FFFFFF" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.65"/>` : ""}
  </g>`;
}

function fikus(x: number, y: number, m: number) {
  const R = nahoda(6601);
  let listy = "";
  const vetve: Bod[] = [[-40, -250], [10, -300], [50, -220], [-10, -180], [70, -290], [-60, -320]];
  vetve.forEach(([vx, vy]) => (listy += `<path d="M0 -40 Q${f(vx * 0.4)} ${f(vy * 0.5)} ${vx} ${vy}" stroke="#6E5A44" stroke-width="3" fill="none"/>`));
  for (let i = 0; i < 46; i++) {
    const v = vetve[i % vetve.length];
    const t = 0.45 + R() * 0.6;
    const lx = v[0] * t + (R() - 0.5) * 50, ly = v[1] * t + (R() - 0.5) * 40;
    const u = (R() - 0.5) * 160, d = 30 + R() * 16;
    const bar = R() < 0.5 ? "#3E6B3A" : R() < 0.5 ? "#4F7E44" : "#5E8E4A";
    listy += `<g transform="translate(${f(lx)} ${f(ly)}) rotate(${f(u)})"><path d="M0 0 C${f(d * 0.3)} ${f(-d * 0.42)} ${f(d * 0.8)} ${f(-d * 0.36)} ${f(d)} 0 C${f(d * 0.8)} ${f(d * 0.36)} ${f(d * 0.3)} ${f(d * 0.42)} 0 0 Z" fill="${bar}"/><path d="M2 0 L${f(d - 3)} 0" stroke="#2E4E2A" stroke-width="1" opacity="0.5"/></g>`;
  }
  return `<g transform="translate(${f(x)} ${f(y)}) scale(${f(m)})"><ellipse cx="6" cy="2" rx="70" ry="12" fill="#3A3A30" opacity="0.2"/>${listy}<path d="M-50 -60 L50 -60 L40 0 L-40 0 Z" fill="#4B5054"/><path d="M-54 -66 L54 -66 L52 -56 L-52 -56 Z" fill="#5D6266"/></g>`;
}

/** Nádražní hodiny: bílý ciferník, černé čárky; ručičky nastaví skript podle času */
function hodiny(x: number, y: number, r: number) {
  let carky = "";
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    const r1 = r * (i % 5 === 0 ? 0.7 : 0.82), r2 = r * 0.9;
    carky += `M${f(x + Math.sin(a) * r1)} ${f(y - Math.cos(a) * r1)}L${f(x + Math.sin(a) * r2)} ${f(y - Math.cos(a) * r2)}`;
  }
  return `<g class="ko-u-hodiny" data-x="${f(x)}" data-y="${f(y)}" data-r="${f(r)}">
    <circle cx="${f(x + 4)}" cy="${f(y + 5)}" r="${f(r + 4)}" fill="#3A2A1E" opacity="0.12"/>
    <circle cx="${f(x)}" cy="${f(y)}" r="${f(r + 4)}" fill="#3B3F42"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="#FBFAF6"/>
    <path d="${carky}" stroke="#1C1714" stroke-width="${f(Math.max(0.8, r / 36))}"/>
    <path class="ko-u-hodinova" d="M${f(x)} ${f(y + r * 0.14)} L${f(x)} ${f(y - r * 0.5)}" stroke="#1C1714" stroke-width="${f(r / 11)}"/>
    <path class="ko-u-minutova" d="M${f(x)} ${f(y + r * 0.14)} L${f(x)} ${f(y - r * 0.78)}" stroke="#1C1714" stroke-width="${f(r / 16)}"/>
    <circle cx="${f(x)}" cy="${f(y)}" r="${f(r / 19)}" fill="#1C1714"/>
  </g>`;
}

/** Zelená podložka s hroudou, ve které se Bublinka jinak schovává, a váleček */
function podlozka(x: number, y: number, m: number) {
  const T = (px: number, py: number) => `${f(x + px * m)} ${f(y + py * m)}`;
  return `<g>
    <path d="M${T(0, 18)} L${T(228, 0)} L${T(250, 122)} L${T(-14, 144)} Z" fill="#2E6B4E"/>
    <path d="M${T(0, 18)} L${T(228, 0)} L${T(230, 8)} L${T(1, 26)} Z" fill="#3F8462"/>
    <path d="M${T(46, 15)} L${T(36, 140)} M${T(92, 11)} L${T(86, 136)} M${T(138, 7)} L${T(136, 132)} M${T(184, 4)} L${T(186, 128)}" stroke="#4F8A6A" stroke-width="1.6"/>
    <ellipse cx="${f(x + 120 * m)}" cy="${f(y + 82 * m)}" rx="${f(70 * m)}" ry="${f(13 * m)}" fill="#1E3A2A" opacity="0.35"/>
    <path d="M${T(52, 84)} C${T(48, 46)} ${T(80, 24)} ${T(116, 24)} C${T(156, 24)} ${T(186, 46)} ${T(184, 84)} Z" fill="#9C7860"/>
    <path d="M${T(70, 66)} C${T(72, 46)} ${T(92, 34)} ${T(114, 34)}" stroke="#C9A184" stroke-width="${f(7 * m)}" fill="none" stroke-linecap="round" opacity="0.8"/>
    <path d="M${T(106, 82)} C${T(104, 64)} ${T(112, 56)} ${T(122, 56)} C${T(132, 56)} ${T(140, 64)} ${T(138, 82)} Z" fill="#5E4334"/>
    <path d="M${T(270, 118)} L${T(428, 76)}" stroke="#E1C79C" stroke-width="${f(15 * m)}" stroke-linecap="round"/>
  </g>`;
}

export function uvnitr(o: UvnitrVolby) {
  const { W, H, rezim, panel, otevreno } = o;
  const siroka = rezim === "siroka";
  const zavreno = !otevreno;

  /* ——— jádro: posun a měřítko; ústředna v jádře ——— */
  let jx: number, jy: number, jk: number;
  let UO: Bod, UM: number;
  /* široké, ale úzké okno (4:3): jádro je malé a nad ním zbývá zeď — ústředna se zvětší
     a vyroste do ní, kniha a stroj se rozestoupí */
  let roz = 0;
  if (siroka) {
    jk = Math.max(0.55, Math.min(1, (W - panel.prava - 30) / 1000));
    jx = W - 1640 * jk;
    jy = H - 900 * jk;
    roz = Math.max(0, 0.85 - jk);
    UM = 0.9 + roz * 0.6;
    UO = [1078 + roz * 60 - (U.w / 2) * UM, 760 - U.dno * UM];
  } else {
    /* úzké: jádro je rovnou scéna, ústředna zabere pás pod panelem vlevo */
    jk = 1;
    jx = 0;
    jy = 0;
    const st = panel.dolni;
    const pas = H - st;
    UM = Math.max(0.2, Math.min((pas - 14) / 846, (W * 0.6) / 590));
    UO = [10 + 18 * UM, H - 8 - U.dno * UM];
  }
  const S = (p: Bod): Bod => [jx + p[0] * jk, jy + p[1] * jk];
  const naUs = (p: Bod): Bod => [UO[0] + p[0] * UM, UO[1] + p[1] * UM];
  const SU = (p: Bod) => S(naUs(p));
  const m = UM * jk;

  /* ——— pozadí přes celou šířku ——— */
  let pz = "";
  const stulY = siroka ? 0 : naUs([0, U.dno - 40])[1];
  const zedDole = siroka ? 700 : stulY;
  pz += `<rect width="${f(W)}" height="${f(zedDole)}" fill="url(#ko-u-zed)"/>`;
  if (siroka) {
    pz += `<rect x="${f(W - 300 * jk)}" y="${f(H - 570 * jk)}" width="${f(300 * jk + 2)}" height="${f(zedDole - (H - 570 * jk))}" fill="#A9937D"/>`;
    pz += `<path d="M30 70 L760 40 L800 660 L60 690 Z" fill="url(#ko-u-okno)"/>`;
    pz += `<path d="M300 60 L320 680 M560 50 L584 676" stroke="#BFB7A6" stroke-width="16" opacity="0.1"/>`;
  } else {
    pz += `<path d="M0 60 L${f(W * 0.8)} 50 L${f(W * 0.82)} ${f(zedDole)} L0 ${f(zedDole)} Z" fill="url(#ko-u-okno)"/>`;
    const sx = naUs([U.w + 40, 0])[0];
    pz += `<rect x="${f(sx)}" y="${f(panel.dolni + (H - panel.dolni) * 0.12)}" width="${f(W - sx + 2)}" height="${f(zedDole)}" fill="#A9937D"/>`;
  }
  pz += `<rect y="${f(zedDole - 12)}" width="${f(W)}" height="12" fill="#D9D3C6"/>`;
  pz += `<rect y="${f(zedDole)}" width="${f(W)}" height="${f(H - zedDole + 2)}" fill="#B9BCB2"/>`;
  if (siroka) {
    pz += hodiny(W - 148 * jk, H - 686 * jk, 50 * jk);
    pz += fikus(30, H + 14, 0.74);
  } else if (H - panel.dolni > 230) {
    pz += hodiny(W - 30, panel.dolni + 38, 20);
  }

  /* stůl: oválný z kanceláře, levý konec zakulacený */
  if (siroka) {
    const [sx0, sy0] = S([722, 582]);
    const leva = S([480, 890])[0];
    pz += `<path d="M${f(sx0)} ${f(sy0 + 8 * jk)} L${f(W + 20)} ${f(sy0 + 8 * jk)} L${f(W + 20)} ${f(H + 20)} L${f(leva - 10)} ${f(H + 20)} C${f(leva - 50 * jk)} ${f(sy0 + 220 * jk)} ${f(sx0 - 220 * jk)} ${f(sy0 + 50 * jk)} ${f(sx0)} ${f(sy0 + 8 * jk)} Z" fill="#A9844F"/>`;
    pz += `<path d="M${f(sx0)} ${f(sy0)} L${f(W + 20)} ${f(sy0)} L${f(W + 20)} ${f(H + 10)} L${f(leva)} ${f(H + 10)} C${f(leva - 50 * jk)} ${f(sy0 + 214 * jk)} ${f(sx0 - 214 * jk)} ${f(sy0 + 50 * jk)} ${f(sx0)} ${f(sy0)} Z" fill="url(#ko-u-stul)"/>`;
    pz += `<path d="M${f(sx0)} ${f(sy0)} L${f(W + 20)} ${f(sy0)}" stroke="#F0DDBA" stroke-width="${f(2.4 * jk)}"/>`;
  } else {
    const sx0 = 2;
    pz += `<path d="M${f(sx0 + 18)} ${f(stulY)} L${f(W + 20)} ${f(stulY)} L${f(W + 20)} ${f(H + 10)} L${f(sx0 - 6)} ${f(H + 10)} C${f(sx0 - 10)} ${f(stulY + 30)} ${f(sx0)} ${f(stulY + 4)} ${f(sx0 + 18)} ${f(stulY)} Z" fill="url(#ko-u-stul)"/>`;
    pz += `<path d="M${f(sx0 + 18)} ${f(stulY)} L${f(W + 20)} ${f(stulY)}" stroke="#F0DDBA" stroke-width="2"/>`;
  }

  /* ——— jádro ——— */
  let j = "";
  const us = ustredna(o.linky, zavreno, o.cedulka ?? ["zavřeno"]);
  let stroj: ReturnType<typeof psaciStroj>;
  let kn: ReturnType<typeof kniha> | null = null;
  let ced: { hak: Bod; velikost: number } | null = null;
  let kach: { x: number; y: number; velikost: number };
  if (siroka) {
    const knX = 560 - roz * 160, stX = 1372 + roz * 200;
    j += podlozka(440 - roz * 160, 750, 0.9);
    kn = kniha(knX, 716, 0.98);
    /* Cedulka stojí na hřbetu knihy a kolébá se, zatímco listuje */
    ced = { hak: [knX + 119 * 0.98, 716 + 22 * 0.98], velikost: 96 };
    stroj = psaciStroj(stX, 700, 0.86);
    kach = { x: stX + 112 * 0.86, y: 700 - 46, velikost: 98 };
  } else {
    const xr = naUs([U.w + 34, 0])[0];
    const sm = Math.max(0.26, Math.min((W - xr - 4) / 340, ((H - panel.dolni) * 0.5) / 300));
    const sx = xr + 38 * sm, sy = H - 6 - 186 * sm;
    stroj = psaciStroj(sx, sy, sm);
    kach = { x: sx + 112 * sm, y: sy - 52 * sm, velikost: 112 * sm };
  }
  j += `<g class="ko-us-deska" transform="translate(${f(UO[0])} ${f(UO[1])}) scale(${f4(UM)})">${us.svg}</g>`;
  if (kn && ced) {
    j += kn.svg;
    /* Cedulka sem při hovoru skočí z okénka 四 — do té doby je skrytá; nohy má v bodě háku */
    j += `<g class="ko-u-cedulka" style="display:none" transform="translate(${f(ced.hak[0])} ${f(ced.hak[1])})">${kami("cedulka", -ced.velikost / 2, -ced.velikost * (141 / 180), ced.velikost)}</g>`;
  }
  if (siroka) j += kafe(1290, 878, 0.82, otevreno);
  j += stroj.svg;
  /* Kachlík u stroje — skočí sem z okénka 六 */
  j += `<g class="ko-u-kachlik" style="display:none" transform="translate(${f(kach.x)} ${f(kach.y)})">${kami("kachlik", 0, 0, kach.velikost)}</g>`;

  const jadro = `<g class="ko-u-jadro" transform="translate(${f(jx)} ${f(jy)}) scale(${f4(jk)})">${j}</g>`;

  /* ——— provázky od okna pod stropem ke kladkám na římse (ve scéně, za ústřednou) ——— */
  let prov = "";
  let vstup: Bod = [0, 0];
  const w0 = siroka ? 5.6 : 2.6, w1 = siroka ? 1.6 : 1.2;
  us.kladky.forEach((kl, i) => {
    const cil = SU([kl[0], kl[1] - 7]);
    /* úzké: provázky přicházejí shora zpod panelu, vějířem */
    const start: Bod = siroka
      ? [W - 1600 * jk + (520 + i * 122) * jk, -14]
      : [cil[0] + (i - 4) * 9, panel.dolni - 8];
    if (i === AKTIVNI) vstup = start;
    const p = provazek(prohnuty(start, cil, siroka ? 10 : 3), w0, w1, siroka ? 1.9 : 1.4);
    prov += provazekSvg(p, i === AKTIVNI ? "ko-u-aktivni" : "", w0);
  });

  /* ——— linky a kolíky ve scéně ——— */
  const linky: LinkaBody[] = us.linky.map((l) => {
    const [a, b] = SU([l.bunkaU[0], l.bunkaU[1]]);
    const [c, d] = SU([l.bunkaU[2], l.bunkaU[3]]);
    return {
      k: l.k,
      id: l.id,
      jack: SU(l.jackU),
      bunka: [a, b, c, d],
      hlava: SU(l.hlavaU),
      lampa: SU(l.lampaU),
      nika: SU(l.nikaU),
      oko: l.oko,
      ucho: l.ucho,
      delka: l.delka,
      nohy: l.nohy,
      kamiJ: { x: UO[0] + l.kamiU.x * UM, y: UO[1] + l.kamiU.y * UM, v: l.kamiU.v * UM },
    };
  });
  const koliky: KolikBody[] = DIRY.map((x, i) => ({ i, dira: SU([x, U.diraY]), bily: i % 2 === 1 }));
  const [p0x, p0y] = SU([-18, U.policeZ - 52]);
  const [p1x, p1y] = SU([U.w + 18, U.dno]);

  /* ——— zavřeno: tma, světlo oknem (den/měsíc) ——— */
  let tma = "";
  if (zavreno) {
    /* u okna (vlevo, za zády) zůstává světleji, ať se čte text; k ústředně tmavne */
    tma += `<rect class="ko-u-tma" x="-10" y="-10" width="${f(W + 20)}" height="${f(H + 20)}" fill="url(#ko-u-tma-g)"/>`;
    tma += `<rect class="ko-u-tma-noc" x="-10" y="-10" width="${f(W + 20)}" height="${f(H + 20)}"/>`;
    tma += `<path class="ko-u-paprsek ko-u-paprsek-den" d="M0 0 L${f(W * 0.46)} 0 L${f(W * 0.62)} ${f(H)} L0 ${f(H)} Z"/>`;
    tma += `<path class="ko-u-paprsek ko-u-paprsek-noc" d="M0 0 L${f(W * 0.46)} 0 L${f(W * 0.62)} ${f(H)} L0 ${f(H)} Z"/>`;
  }
  /* ——— světla nad tmou: okénka a kontrolky spojených linek, zzz ——— */
  let svetla = "";
  linky.forEach((l) => {
    svetla += `<ellipse class="ko-us-zare-nika" data-l="${l.k}" cx="${f(l.nika[0])}" cy="${f(l.nika[1])}" rx="${f(78 * m)}" ry="${f(70 * m)}" fill="url(#ko-us-zare-nika)"/>`;
    svetla += `<circle class="ko-us-zare" data-l="${l.k}" cx="${f(l.lampa[0])}" cy="${f(l.lampa[1])}" r="${f(30 * m)}" fill="url(#ko-us-zare)"/>`;
  });
  if (zavreno) {
    const sl = linky[AKTIVNI];
    const [zx, zy] = [sl.hlava[0] - 36 * m, sl.hlava[1] + 30 * m];
    const zz = Math.max(9, 17 * m);
    svetla += `<g class="ko-zzz ko-u-zzz ko-ruka-tucne" font-size="${f(zz)}"><text x="${f(zx)}" y="${f(zy)}">z</text><text x="${f(zx + zz * 0.7)}" y="${f(zy - zz * 0.9)}" font-size="${f(zz * 1.25)}">z</text><text x="${f(zx + zz * 1.5)}" y="${f(zy - zz * 2.1)}" font-size="${f(zz * 1.55)}">Z</text></g>`;
  }

  const body: UvnitrBody = {
    zavreno,
    jadro: { ox: jx, oy: jy, k: jk },
    us: { ox: UO[0], oy: UO[1], m: UM },
    m,
    linky,
    koliky,
    police: [p0x, p0y, p1x, p1y],
    vstup,
    kladka: SU([us.kladky[AKTIVNI][0], us.kladky[AKTIVNI][1] - 7]),
    ohnisko: linky[AKTIVNI].nika,
    cedulka: ced,
    kniha: kn ? { hrbet: kn.hrbet, sirka: kn.sirka, zdvih: kn.zdvih } : null,
    kachlik: kach,
    klavesy: stroj.klavesy,
    w0,
    w1,
    sn: Math.max(2.2, 5.4 * m),
  };
  /* Pozadí, provázky (z okna ke kladkám, ústředna je zakryje), jádro; kolíky a šňůry
     přidá skript do .ko-us-dyn, pak tma a světla, která svítí i do tmy */
  return {
    svg: `${pz}<g class="ko-u-provazky">${prov}</g>${jadro}<g class="ko-us-dyn"></g>${tma}<g class="ko-us-svetla">${svetla}</g>`,
    body,
  };
}

/** Přechody: dub, mosaz, lak, glazury hrnečků (podle linky), sklo kontrolek, záře */
export function uvnitrDefs() {
  let s = UVNITR_DEFS;
  for (let k = 0; k < 9; k++) {
    const gl = GLAZURY[(k * 5 + 2) % GLAZURY.length];
    s += `<linearGradient id="ko-us-h${k}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${gl.svetlo}"/><stop offset="0.45" stop-color="${gl.stred}"/><stop offset="1" stop-color="${gl.stin}"/></linearGradient>`;
  }
  return s;
}

export const UVNITR_DEFS = `
  <linearGradient id="ko-u-zed" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F5F3EE"/><stop offset="1" stop-color="#E4E0D6"/></linearGradient>
  <linearGradient id="ko-u-dub" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${DUB.svetlo}"/><stop offset="0.55" stop-color="${DUB.stred}"/><stop offset="1" stop-color="${DUB.stin}"/></linearGradient>
  <linearGradient id="ko-us-rimsa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${DUB.svetlo}"/><stop offset="1" stop-color="${DUB.stin}"/></linearGradient>
  <linearGradient id="ko-us-police" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${DUB.stred}"/><stop offset="1" stop-color="${DUB.svetlo}"/></linearGradient>
  <linearGradient id="ko-us-lak" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4A3426"/><stop offset="0.5" stop-color="#33241A"/><stop offset="1" stop-color="#241812"/></linearGradient>
  <linearGradient id="ko-us-nika" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FBEBCB"/><stop offset="0.7" stop-color="#EFD3A4"/><stop offset="1" stop-color="#D9B784"/></linearGradient>
  <linearGradient id="ko-us-mosaz" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6DE94"/><stop offset="0.5" stop-color="#C99E48"/><stop offset="1" stop-color="#8C6A28"/></linearGradient>
  <radialGradient id="ko-us-mosaz-r" cx="0.38" cy="0.32" r="0.72"><stop offset="0" stop-color="#FBEBB0"/><stop offset="0.45" stop-color="#D2A64A"/><stop offset="1" stop-color="#7E5E22"/></radialGradient>
  <linearGradient id="ko-us-zavazi" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8C6A28"/><stop offset="0.35" stop-color="#F6DE94"/><stop offset="1" stop-color="#7E5E22"/></linearGradient>
  <linearGradient id="ko-us-sterbina" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#140E0B"/><stop offset="0.5" stop-color="#2E211A"/><stop offset="1" stop-color="#140E0B"/></linearGradient>
  <linearGradient id="ko-us-kolik-c" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#E07A5C"/><stop offset="0.45" stop-color="#B84A2B"/><stop offset="1" stop-color="#6E2412"/></linearGradient>
  <linearGradient id="ko-us-kolik-b" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFFFFF"/><stop offset="0.5" stop-color="#F1E9DA"/><stop offset="1" stop-color="#BFB29C"/></linearGradient>
  <radialGradient id="ko-us-cepicka-c" cx="0.38" cy="0.34" r="0.75"><stop offset="0" stop-color="#E88A6A"/><stop offset="0.55" stop-color="#B84A2B"/><stop offset="1" stop-color="#6E2412"/></radialGradient>
  <radialGradient id="ko-us-cepicka-b" cx="0.38" cy="0.34" r="0.75"><stop offset="0" stop-color="#FFFFFF"/><stop offset="0.6" stop-color="#EFE6D4"/><stop offset="1" stop-color="#B4A68E"/></radialGradient>
  <radialGradient id="ko-us-sklo-vyp" cx="0.4" cy="0.36" r="0.7"><stop offset="0" stop-color="#9A6A3A"/><stop offset="1" stop-color="#4A2C14"/></radialGradient>
  <radialGradient id="ko-us-sklo-zap" cx="0.4" cy="0.36" r="0.7"><stop offset="0" stop-color="#FFF6D2"/><stop offset="0.45" stop-color="#FFC45E"/><stop offset="1" stop-color="#E5761E"/></radialGradient>
  <radialGradient id="ko-us-zare"><stop offset="0" stop-color="#FFD58A" stop-opacity="0.95"/><stop offset="0.3" stop-color="#FFB14A" stop-opacity="0.45"/><stop offset="1" stop-color="#FF9F2E" stop-opacity="0"/></radialGradient>
  <radialGradient id="ko-us-zare-nika"><stop offset="0" stop-color="#FFE2A8" stop-opacity="0.75"/><stop offset="0.55" stop-color="#FFC878" stop-opacity="0.32"/><stop offset="1" stop-color="#FFB45A" stop-opacity="0"/></radialGradient>
  <linearGradient id="ko-u-stul" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#CFAE82"/><stop offset="0.35" stop-color="#DDBE92"/><stop offset="1" stop-color="#E6CBA2"/></linearGradient>
  <linearGradient id="ko-u-stroj" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B9DCC6"/><stop offset="1" stop-color="#86B49C"/></linearGradient>
  <radialGradient id="ko-u-okno" cx="0.45" cy="0.4" r="0.7"><stop offset="0" stop-color="#FFF1CC" stop-opacity="0.75"/><stop offset="1" stop-color="#FFF1CC" stop-opacity="0"/></radialGradient>
  <linearGradient id="ko-u-paprsek-den" x1="0" y1="0" x2="1" y2="0.6"><stop offset="0" stop-color="#FFF1CC" stop-opacity="0.5"/><stop offset="1" stop-color="#FFF1CC" stop-opacity="0"/></linearGradient>
  <linearGradient id="ko-u-paprsek-noc" x1="0" y1="0" x2="1" y2="0.6"><stop offset="0" stop-color="#C9D8FF" stop-opacity="0.42"/><stop offset="1" stop-color="#C9D8FF" stop-opacity="0"/></linearGradient>
  <linearGradient id="ko-u-tma-g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0B1030" stop-opacity="0.1"/><stop offset="0.4" stop-color="#0B1030" stop-opacity="0.18"/><stop offset="0.62" stop-color="#0B1030" stop-opacity="0.5"/><stop offset="1" stop-color="#0B1030" stop-opacity="0.62"/></linearGradient>`;
