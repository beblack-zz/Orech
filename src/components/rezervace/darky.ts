/**
 * Dárkové jízdenky — kresby pro sekci Daruj jízdenku (Darky.astro).
 * Čistý modul bez `window` jako vlak.ts: kreslí z něj build a prohlížeč
 * (scripts/rezervace/darky.ts) si odsud bere vláček zvláštního vlaku,
 * když se změní kurz.
 *
 * Všechny tři jsou tentýž luxusní lístek na výletní vlak, na výšku: zlatá
 * jízdenka zasunutá rohy do lakované desky — v Japonsku se takhle prodávají
 * pamětní jízdenky a lístky na luxusní vlaky. Liší se lakem desky a tím,
 * co je za perforací na ústřižku:
 *
 *   hodiny  zelená   dva kupony po hodině a půl, dopolední vlak
 *   pas     červená  políčko na každý týden a ranní a večerní spoj
 *                    (stejná červená jako permanentka v pokladně a v řádu)
 *   kurz    modrá    znak a program dne, parní vlak se salonem za soumraku
 *
 * Shora dolů: na desce jméno druhu, na jízdence pruh s číslem, okno salonu
 * se sametovými závěsy a výhledem na vlak po moři (obloha podle hodiny),
 * medaile s nominálem (3 h, 3 měs., 1 den), trasa Ořech → Dílna, řádek
 * údajů, linka na jméno a za perforací ústřižek. Pod jízdenkou je na desce
 * místo na věnování zlatem.
 *
 * Jméno, vzkaz a podpis se píšou rovnou na jízdenku — jsou to HTML pole
 * nad kresbou (Darky.astro je klade podle PERO). Razítko a páska s mašlí
 * jsou ve třetí vrstvě nad nimi (obal), aby je při zabalení překryly.
 *
 * Tištěné jsou jako cenina: podtisk z vlnek, gilošová rozeta, mikrotext
 * podél okrajů, hologram na rohu okna a pod UV lampou skrytý tisk — svítí
 * jen v kruhu lampy, se kterým hýbe skript. Deska má lak se zlatým vzorem
 * šippó (kruhy, které se překrývají), zlatý rám a vějíře v rozích.
 *
 * Souřadnice: deska má viewBox 400 × 720 a jízdenka v ní leží na LISTEK
 * (uvnitř má vlastní souřadnice od svého levého horního rohu). Na stránce
 * je deska zhruba 300–380 px široká.
 *
 * Rub (rub níž) je deska zezadu: jak jízdenku uplatnit, kdy se jezdí
 * a čárový kód.
 *
 * Co dopisuje skript, má data-rzd: cislo, cislo-kupon, datum, vlak,
 * radek, emblem, kurz, lektor; rub zvláštního vlaku má programy kurzů
 * v data-program. Id mají prefix rzd- (sdílené kresby) a rzd1-, rzd2-,
 * rzd3- (líc), rzd1r-… (rub), rzd1o-… (obal) — na stránce se nesmí potkat
 * s ničím jiným.
 */
import { vlak, zvlastniVlak, delka, DELKA_ZVLASTNIHO } from "./vlak";
import type { Misto } from "./vlak";
import { paleta } from "../../scripts/parta2/paleta";
import { hlavni as ensoTah, kapka as ensoKapka, ryha as ensoRyha, kvet as ensoKvet, W as ENSO_W } from "../navrhy-loga/enso-tvar";
import { PLATEK, UHLY_KVETU, ODSUN } from "../navrhy-loga/sdilene";
import { STETEC, VIEWBOX as ZNACKA } from "../znacka/stetec-kresba";

export const SIRKA = 400;
export const VYSKA = 720;
export const VIEWBOX = `0 0 ${SIRKA} ${VYSKA}`;

/** Jízdenka v desce; `perforace` je od jejího horního okraje */
export const LISTEK = { x: 30, y: 76, w: 340, h: 500, perforace: 420 };

/** Kam se píše rukou — HTML pole nad kresbou, v jednotkách desky (Darky.astro je převádí na procenta) */
export const PERO = {
  pro: { x: LISTEK.x + 50, y: LISTEK.y + 374, w: 274, h: 42 },
  vzkaz: { x: 40, y: 590, w: 320, h: 66 },
  od: { x: 40, y: 656, w: 320, h: 34 },
};

export type Druh = "hodiny" | "pas" | "kurz";

/** Lak desky (světlý, střed, tmavý) a inkoust, kterým je tištěná zlatá jízdenka */
interface Lak {
  svetly: string;
  stred: string;
  tmavy: string;
  inkoust: string;
}
export const LAKY: Record<Druh, Lak> = {
  hodiny: { svetly: "#2F6656", stred: "#1E4A40", tmavy: "#112C25", inkoust: "#173D34" },
  pas: { svetly: "#A8362A", stred: "#7E271D", tmavy: "#4C130E", inkoust: "#661D14" },
  kurz: { svetly: "#363D82", stred: "#262B5E", tmavy: "#161939", inkoust: "#1E2148" },
};
const ID: Record<Druh, string> = { hodiny: "rzd1", pas: "rzd2", kurz: "rzd3" };

/** Stejná barva jako první postavička ve volbě „kolik vás pojede“ v pokladně */
const TY = "#9C7860";

const RUMELKA = "#C4432B";
const ZLATO = "#E0B04A";
const ZLATO_SVETLE = "#F3D27A";
const ZLATO_TMAVE = "#8A6418";
const SLONOVINA = "#FBF1D6";
/** Krémová, kterou se píše na laku rubu */
const KREM = "#F4EAD0";

const f = (n: number) => Math.round(n * 10) / 10;
const omez = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const hex = (h: string) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mixB = (a: string, b: string, t: number) => {
  const B = hex(b);
  return `#${hex(a).map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
};

/** Text do kresby; `extra` jsou další atributy (text-anchor, data-rzd…) */
const txt = (x: number, y: number, text: string, trida: string, extra = "") =>
  `<text x="${f(x)}" y="${f(y)}" class="${trida}"${extra ? ` ${extra}` : ""}>${esc(text)}</text>`;

/* ——— Sdílené kresby: jednou na stránce, v každé jízdence přes <use> ——— */

/** Ořech — stejný tvar, jaký vystřihují kleště průvodčího (rezervace.css). 22 × 25, střed zhruba v 11, 12.5. */
export const ORECH = "M11 0.8 C13.5 2.8 15 3.8 17 4.7 C20 6 21.4 9.4 21.1 13.2 C20.7 19.4 16.4 24.1 11 24.1 C5.6 24.1 1.3 19.4 0.9 13.2 C0.6 9.4 2 6 5 4.7 C7 3.8 8.5 2.8 11 0.8 Z";

/**
 * Gilošová rozeta: elipsy otočené kolem středu, jak je kreslí stroj na
 * ceniny. Vnější prstenec z protáhlých elips, vnitřní z kroužků posunutých
 * od středu. Barvu a tloušťku čáry dědí z <use>.
 */
const rozeta = () => {
  let out = "";
  for (let i = 0; i < 30; i++) out += `<ellipse rx="100" ry="34" transform="rotate(${i * 6})"/>`;
  for (let i = 0; i < 24; i++) out += `<ellipse cx="34" rx="30" ry="15" transform="rotate(${i * 15})"/>`;
  return `<g id="rzd-rozeta" fill="none">${out}<circle r="100"/><circle r="96"/></g>`;
};

/** Výpravčí Kachlík razí přesně do čtverce — stejné razítko jako pod jízdním řádem */
const kachlik = `<g id="rzd-kachlik" fill="none" stroke-linecap="round">
  <rect x="3" y="3" width="34" height="34" rx="5" stroke-width="2.6"/>
  <rect x="8" y="8" width="24" height="24" rx="3" stroke-width="1.2"/>
  <path d="M12.5 16.5 h5 M22.5 16.5 h5" stroke-width="1.6"/>
  <circle cx="15" cy="20.5" r="1.4" stroke-width="1"/><circle cx="25" cy="20.5" r="1.4" stroke-width="1"/>
  <path d="M17 26.5 H23" stroke-width="1.8"/>
</g>`;

/** Podtisk z vlnek jako na hodinové jízdence (Jizdenka.astro), tady v jednotkách kresby */
const vlnky = (id: string, barva: string, op: number) =>
  `<pattern id="${id}" width="22" height="9" patternUnits="userSpaceOnUse"><path d="M0 4.5 Q5.5 0.6 11 4.5 T22 4.5" fill="none" stroke="${barva}" stroke-width="0.6" opacity="${op}"/></pattern>`;

/** Mizuhiki — šňůra z pěti pramenů: kreslí se tou samou cestou pětkrát, od nejširšího tahu k nejužšímu */
const PRAMENY: [string, number][] = [["#5E1B10", 12.5], [RUMELKA, 11], ["#FBF1DE", 8.2], [RUMELKA, 5.6], ["#FBF1DE", 3], ["#E8846C", 1]];
const snura = (d: string) => PRAMENY.map(([barva, w]) => `<path d="${d}" fill="none" stroke="${barva}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`).join("");
/** Mašle mizuhiki se dvěma oky a dvěma konci; střed v 0, 0 */
const masle = () =>
  snura("M0 0 C-8 18 -16 42 -22 70") +
  snura("M0 0 C8 18 16 42 22 70") +
  snura("M0 0 C-12 -26 -50 -38 -60 -16 C-68 2 -36 16 0 0") +
  snura("M0 0 C12 -26 50 -38 60 -16 C68 2 36 16 0 0") +
  snura("M-10 -5 C-4 -8 4 -8 10 -5 M-10 5 C-4 8 4 8 10 5") +
  `<rect x="-11" y="-9" width="22" height="18" rx="6" fill="${RUMELKA}" stroke="#5E1B10" stroke-width="1.5"/><path d="M-6 -9 V9 M0 -9 V9 M6 -9 V9" stroke="#FBF1DE" stroke-width="1.6"/>`;

/**
 * Šippó — kruhy, které se překrývají, tradiční japonský vzor „sedmi pokladů“.
 * Na laku desky zlatem, skoro neviditelně, jako by byl vtlačený.
 */
const shippo = `<pattern id="rzd-shippo" width="28" height="28" patternUnits="userSpaceOnUse">
  <g fill="none" stroke="${ZLATO_SVETLE}" stroke-width="0.7" opacity="0.1">
    <circle cx="0" cy="0" r="14"/><circle cx="28" cy="0" r="14"/><circle cx="0" cy="28" r="14"/><circle cx="28" cy="28" r="14"/><circle cx="14" cy="14" r="14"/>
  </g>
</pattern>`;

/** Všechno sdílené do jednoho skrytého <svg> na stránce */
export const SPRITE = `<defs>
  ${rozeta()}
  ${kachlik}
  ${shippo}
  <path id="rzd-orech" d="${ORECH}"/>
  ${vlnky("rzd-vlnky-zelene", "#3E8C84", 0.3)}
  ${vlnky("rzd-vlnky-zlate", "#7A4E0E", 0.22)}
  <radialGradient id="rzd-uv-svetlo"><stop offset="0" stop-color="#fff"/><stop offset="0.62" stop-color="#fff" stop-opacity="0.85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <filter id="rzd-uv-zar" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.6"/></filter>
  <linearGradient id="rzd-hologram" gradientUnits="objectBoundingBox" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#FF9AD5"/><stop offset="0.2" stop-color="#FFE29A"/><stop offset="0.4" stop-color="#A8FFC2"/>
    <stop offset="0.6" stop-color="#9AD8FF"/><stop offset="0.8" stop-color="#C7A8FF"/><stop offset="1" stop-color="#FF9AD5"/>
  </linearGradient>
  <g id="rzd-masle">${masle()}</g>
  <linearGradient id="rzd-folie" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#C39434"/><stop offset="0.28" stop-color="#E8C66C"/><stop offset="0.5" stop-color="#F8E6AA"/>
    <stop offset="0.68" stop-color="#E4B854"/><stop offset="1" stop-color="#AD7E26"/>
  </linearGradient>
  <linearGradient id="rzd-zlato" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#9E7424"/><stop offset="0.32" stop-color="${ZLATO_SVETLE}"/><stop offset="0.5" stop-color="#FFF1C4"/>
    <stop offset="0.66" stop-color="${ZLATO}"/><stop offset="1" stop-color="#A27420"/>
  </linearGradient>
  <linearGradient id="rzd-odlesk" x1="0" y1="0" x2="1" y2="0.62">
    <stop offset="0" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="0.16" stop-color="#FFFFFF" stop-opacity="0.1"/>
    <stop offset="0.25" stop-color="#FFFFFF" stop-opacity="0.02"/><stop offset="0.6" stop-color="#FFFFFF" stop-opacity="0"/>
    <stop offset="0.74" stop-color="#FFFFFF" stop-opacity="0.06"/><stop offset="0.84" stop-color="#FFFFFF" stop-opacity="0"/>
  </linearGradient>
  <linearGradient id="rzd-zahyby" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#000" stop-opacity="0.38"/><stop offset="0.16" stop-color="#FFF" stop-opacity="0.1"/>
    <stop offset="0.32" stop-color="#000" stop-opacity="0.24"/><stop offset="0.5" stop-color="#FFF" stop-opacity="0.16"/>
    <stop offset="0.66" stop-color="#000" stop-opacity="0.2"/><stop offset="0.82" stop-color="#FFF" stop-opacity="0.12"/>
    <stop offset="1" stop-color="#000" stop-opacity="0.32"/>
  </linearGradient>
  <filter id="rzd-rytina" x="-3%" y="-8%" width="106%" height="116%" color-interpolation-filters="sRGB">
    <feMorphology in="SourceAlpha" operator="dilate" radius="5" result="sire"/>
    <feComposite in="sire" in2="SourceAlpha" operator="out" result="obrys"/>
    <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.2 2.4 0.4 0 -3" result="svetla"/>
    <feMerge result="kresba"><feMergeNode in="obrys"/><feMergeNode in="svetla"/></feMerge>
    <feFlood flood-color="${ZLATO_SVETLE}"/><feComposite in2="kresba" operator="in"/>
  </filter>
  <filter id="rzd-stin" x="-8%" y="-6%" width="116%" height="116%">
    <feGaussianBlur in="SourceAlpha" stdDeviation="4"/><feOffset dy="4" result="posun"/>
    <feFlood flood-color="#05040C" flood-opacity="0.5"/><feComposite in2="posun" operator="in"/>
    <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
</defs>`;

/* ——— Deska: lak, zlatý rám, vějíře v rozích a jméno nahoře ——— */

/** Art deco vějíř v rohu — kreslí se pro levý horní roh, ostatní jsou zrcadla */
const VEJIR = (() => {
  const paprsky = [18, 34, 50, 66, 82]
    .map((a) => {
      const r = (a * Math.PI) / 180;
      return `M${f(15 + Math.cos(r) * 8)} ${f(15 + Math.sin(r) * 8)} L${f(15 + Math.cos(r) * 18)} ${f(15 + Math.sin(r) * 18)}`;
    })
    .join(" ");
  return `<path d="M5 26 V5 H26" fill="none" stroke="${ZLATO_SVETLE}" stroke-width="2"/>
    <path d="M37 15 A22 22 0 0 1 15 37" fill="none" stroke="${ZLATO_SVETLE}" stroke-width="1.2"/>
    <path d="M42 15 A27 27 0 0 1 15 42" fill="none" stroke="${ZLATO_SVETLE}" stroke-width="0.6" opacity="0.7"/>
    <path d="${paprsky}" fill="none" stroke="${ZLATO_SVETLE}" stroke-width="1" stroke-linecap="round"/>
    <circle cx="15" cy="15" r="2.4" fill="${ZLATO_SVETLE}"/>`;
})();

function deska(id: string, lak: Lak) {
  const rohy = [[0, 0, 1, 1], [SIRKA, 0, -1, 1], [0, VYSKA, 1, -1], [SIRKA, VYSKA, -1, -1]]
    .map(([x, y, sx, sy]) => `<g transform="translate(${x} ${y}) scale(${sx} ${sy})">${VEJIR}</g>`)
    .join("");
  return `<defs>
    <linearGradient id="${id}-lak" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${SIRKA * 0.4}" y2="${VYSKA}">
      <stop offset="0" stop-color="${lak.svetly}"/><stop offset="0.48" stop-color="${lak.stred}"/><stop offset="1" stop-color="${lak.tmavy}"/>
    </linearGradient>
  </defs>
  <rect width="${SIRKA}" height="${VYSKA}" rx="18" fill="url(#${id}-lak)"/>
  <rect width="${SIRKA}" height="${VYSKA}" rx="18" fill="url(#rzd-shippo)"/>
  <rect width="${SIRKA}" height="${VYSKA}" rx="18" fill="url(#rzd-odlesk)"/>
  <rect x="1" y="1" width="${SIRKA - 2}" height="${VYSKA - 2}" rx="17" fill="none" stroke="url(#rzd-zlato)" stroke-width="1.4" opacity="0.8"/>
  <rect x="9" y="9" width="${SIRKA - 18}" height="${VYSKA - 18}" rx="10" fill="none" stroke="url(#rzd-zlato)" stroke-width="2"/>
  <rect x="15" y="15" width="${SIRKA - 30}" height="${VYSKA - 30}" rx="6" fill="none" stroke="${ZLATO}" stroke-width="0.8" opacity="0.6"/>
  ${rohy}`;
}

/** Jméno nahoře na desce verzálkami mezi zlatými linkami; šířka je pevná (textLength), ať linky sedí */
function hlavaDesky(titul: string, y = 62) {
  const n = [...titul].length;
  const sirka = n * 11.4 + (n - 1) * 6.4;
  const a = SIRKA / 2 - sirka / 2 - 14;
  const b = SIRKA / 2 + sirka / 2 + 14;
  const kosoctverec = (x: number) => `<path d="M${x} ${y - 9.5} l3.5 3.5 l-3.5 3.5 l-3.5 -3.5 z" fill="${ZLATO_SVETLE}"/>`;
  return `${txt(SIRKA / 2, 35, "JIRO SAKU · OŘECH", "rzd-t-znacka", `text-anchor="middle"`)}
    <path d="M52 ${y - 6} H${f(a)} M${f(b)} ${y - 6} H${SIRKA - 52}" stroke="${ZLATO}" stroke-width="1" opacity="0.8"/>
    <circle cx="${f(a + 5)}" cy="${y - 6}" r="2.1" fill="${ZLATO}"/><circle cx="${f(b - 5)}" cy="${y - 6}" r="2.1" fill="${ZLATO}"/>
    ${kosoctverec(46)}${kosoctverec(SIRKA - 46)}
    <text x="${SIRKA / 2}" y="${y}" class="rzd-t-deska" text-anchor="middle" textLength="${f(sirka)}" lengthAdjust="spacing">${esc(titul)}</text>`;
}

/** Fotorůžky, do kterých je jízdenka zasunutá — trojúhelníky laku se zlatou hranou */
function rohyListku(lak: Lak) {
  const L = LISTEK;
  const r = 27;
  const roh = (x: number, y: number, sx: number, sy: number) => {
    const d = `M${x} ${y} h${r * sx} l${-r * sx} ${r * sy} z`;
    return `<path d="${d}" fill="${lak.stred}"/><path d="${d}" fill="url(#rzd-odlesk)"/>
      <path d="M${x + r * sx} ${y} l${-r * sx} ${r * sy}" stroke="#000" stroke-opacity="0.35" stroke-width="2.4" transform="translate(${sx * 0.8} ${sy * 0.8})"/>
      <path d="M${x + r * sx} ${y} l${-r * sx} ${r * sy}" stroke="${ZLATO_SVETLE}" stroke-width="1.2" opacity="0.75"/>`;
  };
  return roh(L.x, L.y, 1, 1) + roh(L.x + L.w, L.y, -1, 1) + roh(L.x, L.y + L.h, 1, -1) + roh(L.x + L.w, L.y + L.h, -1, -1);
}

/* ——— Okno salonu: vlak na moři pod oblohou dané hodiny ——— */

interface Okno {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Obrys okna — nahoře oblouky, dole malé zaoblení */
  d: string;
}

const tvarOkna = (x: number, y: number, w: number, h: number, R = 34, r = 8) =>
  `M${x} ${y + h - r} V${y + R} A${R} ${R} 0 0 1 ${x + R} ${y} H${x + w - R} A${R} ${R} 0 0 1 ${x + w} ${y + R} V${y + h - r} Q${x + w} ${y + h} ${x + w - r} ${y + h} H${x + r} Q${x} ${y + h} ${x} ${y + h - r} Z`;

/**
 * Výhled jako na velké jízdence (jizdenka.ts): obloha a slunce podle
 * hodiny, moře, které ji zrcadlí, odraz vlaku a vlnky. `okraj` je, kolik
 * moře je kolem vlaku (čím víc, tím je vlak menší), `posun` ho posune
 * doleva (záporně doprava), ať slunce nesvítí zpoza něj.
 * Vlak má id `${id}-vlak`, aby ho odraz bral přes <use> i po překreslení.
 */
function scena(id: string, o: Okno, h: number, L: number, obsah: string, { okraj = 420, posun = 0 } = {}) {
  const w = L + okraj;
  const hgt = w / (o.w / o.h);
  const y0 = -hgt * 0.62;
  const x0 = (L - w) / 2 - posun;
  const p = paleta(h);
  const [a, b, c] = p.barvy;
  const t = omez((h - 5.3) / (20.4 - 5.3));
  const sx = x0 + w * (0.12 + 0.76 * t);
  const sy = -hgt * 0.62 * Math.sin(Math.PI * t) * 0.74 - 8;
  const promenne = `--vl-sklo:${mixB(c, "#EFE4E4", 0.42)};--vl-sedadla:${mixB(b, "#5E4A56", 0.62)};--vl-noc:${p.hvezdy.toFixed(2)}`;
  const vlny = [6, 13, 22, 34, 50, 72, 100, 136, 180]
    .map((y, i) => `<path d="M${f(x0)} ${y} H${f(x0 + w)}" stroke="${i % 3 ? "#FFFFFF" : "#2E3466"}" stroke-opacity="${i % 3 ? 0.16 : 0.2}" stroke-width="${f(2 + i * 0.8)}" stroke-dasharray="${60 + i * 23} ${18 + i * 7}"/>`)
    .join("");
  return `<defs>
    <clipPath id="${id}-okno"><path d="${o.d}"/></clipPath>
    <linearGradient id="${id}-nebe" gradientUnits="userSpaceOnUse" x1="0" y1="${f(y0)}" x2="0" y2="-14"><stop offset="0" stop-color="${a}"/><stop offset="0.62" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient>
    <linearGradient id="${id}-more" gradientUnits="userSpaceOnUse" x1="0" y1="-14" x2="0" y2="${f(y0 + hgt)}"><stop offset="0" stop-color="${mixB(c, "#1B2350", 0.16)}"/><stop offset="0.45" stop-color="${mixB(b, "#1B2350", 0.2)}"/><stop offset="1" stop-color="${mixB(a, "#0B1030", 0.24)}"/></linearGradient>
    <radialGradient id="${id}-slunce"><stop offset="0" stop-color="#FFF8E2"/><stop offset="0.3" stop-color="#FFF1C8" stop-opacity="0.9"/><stop offset="0.55" stop-color="#FFD9A0" stop-opacity="0.35"/><stop offset="1" stop-color="#FFC890" stop-opacity="0"/></radialGradient>
    <linearGradient id="${id}-odraz-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.6"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <mask id="${id}-odraz" maskUnits="userSpaceOnUse" x="${f(x0)}" y="0" width="${f(w)}" height="${f(hgt)}"><rect x="${f(x0)}" y="0" width="${f(w)}" height="230" fill="url(#${id}-odraz-g)"/></mask>
  </defs>
  <g clip-path="url(#${id}-okno)">
    <svg x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" viewBox="${f(x0)} ${f(y0)} ${f(w)} ${f(hgt)}" preserveAspectRatio="xMidYMid slice" class="rzd-scena" style="${promenne}">
      <rect x="${f(x0)}" y="${f(y0)}" width="${f(w)}" height="${f(-y0)}" fill="url(#${id}-nebe)"/>
      <circle cx="${f(sx)}" cy="${f(sy)}" r="${f(hgt * 0.11)}" fill="url(#${id}-slunce)"/>
      <rect x="${f(x0)}" y="-14" width="${f(w)}" height="${f(hgt)}" fill="url(#${id}-more)"/>
      <path d="M${f(x0)} -14 H${f(x0 + w)}" stroke="#FFF1DE" stroke-width="2" opacity="0.6"/>
      <g mask="url(#${id}-odraz)" opacity="0.85"><use href="#${id}-vlak" transform="scale(1 -1)"/></g>
      <g>${vlny}</g>
      <g id="${id}-vlak" class="rzd-vlak" data-rzd="vlak">${obsah}</g>
    </svg>
  </g>`;
}

/**
 * Sametové závěsy po stranách okna, stažené zlatou šňůrou se střapcem,
 * a nahoře lambrekýn s třásněmi. Kreslí se levé křídlo, pravé je zrcadlo.
 */
function zaves(id: string, o: Okno, lak: Lak) {
  const H = o.h;
  const vaz = H * 0.6;
  const obrys = `M-2 -2 H42 C37 ${f(H * 0.22)} 23 ${f(H * 0.46)} 12 ${f(vaz)} C16 ${f(vaz + 18)} 24 ${f(vaz + 40)} 31 ${H + 2} H-2 Z`;
  const kridlo = `<path d="${obrys}" fill="${lak.stred}"/>
    <path d="${obrys}" fill="url(#rzd-zahyby)"/>
    <path d="M10 0 C9 ${f(H * 0.22)} 6 ${f(H * 0.44)} 5 ${f(vaz)} M22 0 C20 ${f(H * 0.22)} 13 ${f(H * 0.46)} 8.5 ${f(vaz)} M33 0 C30 ${f(H * 0.22)} 18 ${f(H * 0.47)} 11 ${f(vaz)} M7 ${f(vaz + 3)} C9 ${f(vaz + 22)} 12 ${f(vaz + 44)} 14 ${H} M11 ${f(vaz + 4)} C15 ${f(vaz + 24)} 20 ${f(vaz + 46)} 23 ${H}" fill="none" stroke="#000" stroke-opacity="0.24" stroke-width="1.1"/>
    <path d="M42 -2 C37 ${f(H * 0.22)} 23 ${f(H * 0.46)} 12 ${f(vaz)} C16 ${f(vaz + 18)} 24 ${f(vaz + 40)} 31 ${H + 2}" fill="none" stroke="${mixB(lak.svetly, "#FFFFFF", 0.18)}" stroke-width="1.3" opacity="0.85"/>
    <g transform="translate(0 ${f(vaz)})">
      <path d="M1 -2.5 Q12 -7 23 -1.5 Q12 6 1 2 Z" fill="${ZLATO}" stroke="${ZLATO_TMAVE}" stroke-width="0.6"/>
      <path d="M4 -1.5 Q12 -4.6 20 -0.8" fill="none" stroke="#FFF1C4" stroke-width="0.8" opacity="0.8"/>
      <path d="M19 1 Q23 6 22 11" fill="none" stroke="${ZLATO}" stroke-width="1.3"/>
      <circle cx="22" cy="13.2" r="2.9" fill="${ZLATO_SVETLE}" stroke="${ZLATO_TMAVE}" stroke-width="0.5"/>
      <path d="M19.4 15.4 Q22 14.2 24.6 15.4 L26.4 29.5 Q22 32 17.6 29.5 Z" fill="${ZLATO}"/>
      <path d="M20 17 L19.2 29.8 M22 17 V30.6 M24 17 L24.8 29.8" stroke="${ZLATO_TMAVE}" stroke-width="0.5"/>
    </g>`;
  /* Lambrekýn: pět oblouků, pod nimi zlatá třásňová lemovka a mezi oblouky korálky */
  const n = 5;
  const s = o.w / n;
  const oblouky = (y: number, hloubka: number) => {
    let d = "";
    for (let i = n; i > 0; i--) d += ` Q${f(s * i - s / 2)} ${y + hloubka} ${f(s * (i - 1))} ${y}`;
    return d;
  };
  const korale = Array.from({ length: n - 1 }, (_, k) => `<circle cx="${f(s * (k + 1))}" cy="10" r="2.2" fill="${ZLATO_SVETLE}"/><path d="M${f(s * (k + 1))} 12 l-1.8 6 h3.6 z" fill="${ZLATO}"/>`).join("");
  const lambrekyn = `<path d="M-2 -2 H${o.w + 2} V9${oblouky(9, 16)} H-2 Z" fill="${lak.stred}"/>
    <path d="M-2 -2 H${o.w + 2} V9${oblouky(9, 16)} H-2 Z" fill="url(#rzd-odlesk)"/>
    <path d="M${o.w} 9${oblouky(9, 16)}" fill="none" stroke="${ZLATO}" stroke-width="1.8"/>
    <path d="M${o.w} 11.5${oblouky(11.5, 16)}" fill="none" stroke="${ZLATO_SVETLE}" stroke-width="1.6" stroke-dasharray="0.8 1.6" opacity="0.9"/>
    <path d="M0 4 H${o.w}" stroke="${ZLATO}" stroke-width="1" opacity="0.7"/>
    ${korale}`;
  /* Křídlo je ve vlastní skupině, ať s ním může CSS hýbat (při najetí myší se závěsy pootevřou) */
  return `<g clip-path="url(#${id}-okno)">
    <g transform="translate(${o.x} ${o.y})"><g class="rzd-kridlo">${kridlo}</g></g>
    <g transform="translate(${o.x + o.w} ${o.y}) scale(-1 1)"><g class="rzd-kridlo">${kridlo}</g></g>
    <g transform="translate(${o.x} ${o.y})">${lambrekyn}</g>
  </g>`;
}

/* ——— Vláčky do okna ——— */

/** Kolik odjezdů je na jízdence „tři hodiny“ — tolik kuponů i vozů */
export const vozuHodiny = (odjezdu: number) => Math.max(1, odjezdu);
/** Kam si obdarovaný ve voze sedne — doprostřed, jako na jízdence */
const SEDADLO = 2;
const sedi = (): Misto[] => Array.from({ length: 6 }, (_, i) => (i === SEDADLO ? { kdo: "ty", barva: TY } : null));

/** Hodinový vlak: vůz na každý kupon, na cedulce číslo kuponu; obdarovaný sedí v prvním voze */
export function vlakHodiny(odjezdu: number) {
  return vlak(Array.from({ length: vozuHodiny(odjezdu) }, (_, i) => ({ cislo: String(i + 1), mista: i === 0 ? sedi() : [] })), { smer: 1 });
}

/** Permanentka: jeden vůz a v něm pořád stejné místo — obdarovaný a pár stálých tváří kolem */
export function vlakPas() {
  const mista = sedi();
  mista[0] = { kdo: "stin" };
  mista[4] = { kdo: "stin" };
  return vlak([{ mista }], { smer: 1 });
}

/** Na kterýkoli kurz: znak lokomotivy je značka zvláštního vlaku z jízdního řádu (Rad.astro) */
export const ZNAK_KTERYKOLI = "Zv";

/**
 * Zvláštní vlak: salon má okno na každé místo kurzu. Uprostřed sedí
 * obdarovaný, kolem pár stínů — kurz se jede se skupinou.
 * `mist` je pro kterýkoli kurz největší počet míst ze všech.
 */
export function vlakKurz(kurz: { mist: number; emblem: string; nazev: string } | null, mist: number) {
  const n = kurz?.mist ?? mist;
  const mista: Misto[] = Array(n).fill(null);
  const stred = Math.floor((n - 1) / 2);
  mista[stred] = { kdo: "ty", barva: TY };
  /* ostatní cestující: zhruba každé druhé okno, ať je vidět, že se jede ve skupině */
  for (let i = 0; i < n; i++) if (i !== stred && (i + stred) % 2 === 1) mista[i] = { kdo: "stin" };
  const emblem = kurz?.emblem ?? ZNAK_KTERYKOLI;
  return zvlastniVlak({ mista, emblem, cedule: kurz?.nazev ?? "Zvláštní vlak", trida: emblem.length > 1 ? "rzd-znaky-dva" : "" });
}

/* ——— Kousky, které mají všechny tři ——— */

/** Razítko Dárek — dopadne při zabalení. Kolem dokola mikrotext, uprostřed datum, kdy se balilo. */
function razitko(id: string, x: number, y: number) {
  const r = 46;
  return `<g class="rzd-razitko" transform="translate(${x} ${y}) rotate(-11)">
    <g class="rzd-razitko-telo">
      <path id="${id}-razitko-kruh" d="M0 ${-r + 6.5} A${r - 6.5} ${r - 6.5} 0 1 1 -0.1 ${-r + 6.5}" fill="none"/>
      <circle r="${r}" fill="none" stroke="${RUMELKA}" stroke-width="3.6"/>
      <circle r="${r - 13}" fill="none" stroke="${RUMELKA}" stroke-width="1.3"/>
      <text class="rzd-t-razitko-kruh"><textPath href="#${id}-razitko-kruh">JIRO SAKU · OŘECH · DÁRKOVÁ JÍZDENKA ·</textPath></text>
      <text x="0" y="5" class="rzd-t-razitko" text-anchor="middle">DÁREK</text>
      <text x="0" y="21" class="rzd-t-razitko-datum" text-anchor="middle" data-rzd="datum">—</text>
    </g>
  </g>`;
}

/**
 * Páska s mašlí mizuhiki, jakou se v Japonsku převazují dárky: při
 * zabalení přijede zleva a obtočí desku napříč přes řádek údajů — jméno,
 * okno ani věnování nezakryje. Konce jdou za okraj desky, jako by ji
 * obtáčela.
 */
function paska(y: number, h: number, masleX: number) {
  return `<g class="rzd-paska">
    <g class="rzd-paska-pruh">
      <rect x="-8" y="${y}" width="${SIRKA + 16}" height="${h}" fill="#FBF6EC"/>
      <rect x="-8" y="${y}" width="${SIRKA + 16}" height="${h}" fill="url(#rzd-vlnky-zelene)" opacity="0.5"/>
      <path d="M-8 ${y + 4} H${SIRKA + 8} M-8 ${y + h - 4} H${SIRKA + 8}" stroke="${RUMELKA}" stroke-width="2.2"/>
      <path d="M-8 ${y + 8} H${SIRKA + 8} M-8 ${y + h - 8} H${SIRKA + 8}" stroke="${ZLATO}" stroke-width="0.9"/>
      <rect x="0" y="${y}" width="6" height="${h}" fill="#000" opacity="0.13"/>
      <rect x="${SIRKA - 6}" y="${y}" width="6" height="${h}" fill="#000" opacity="0.13"/>
      ${txt(150, y + h / 2 + 7, "DÁREK", "rzd-t-paska", `text-anchor="middle"`)}
      ${txt(46, y + h / 2 + 3.5, "OŘECH", "rzd-t-paska-male", `text-anchor="middle"`)}
    </g>
    <g transform="translate(${masleX} ${y + h / 2})"><g class="rzd-masle"><use href="#rzd-masle" transform="scale(0.9)"/></g></g>
  </g>`;
}

/**
 * Skrytý tisk pod UV lampou: svítí jen v kruhu lampy (maska s kruhem,
 * se kterým hýbe skript). Pod kruhem je fialové světlo lampy, v něm
 * svítí logo dílny, mikrotext a razítko výpravčího. Kruh je v souřadnicích
 * jízdenky — data-dx/dy říkají skriptu, kde v desce jízdenka leží.
 */
function uv(id: string, tvar: string, obsah: string) {
  const L = LISTEK;
  return `<mask id="${id}-uv" maskUnits="userSpaceOnUse" x="-20" y="-20" width="${L.w + 40}" height="${L.h + 40}">
      <circle class="rzd-uv-kruh" data-dx="${L.x}" data-dy="${L.y}" cx="-999" cy="-999" r="150" fill="url(#rzd-uv-svetlo)"/>
    </mask>
    <g class="rzd-uv" mask="url(#${id}-uv)">
      <g ${tvar}><rect x="0" y="0" width="${L.w}" height="${L.h}" fill="#1E0A5C" opacity="0.8"/></g>
      <g filter="url(#rzd-uv-zar)" opacity="0.9">${obsah}</g>
      ${obsah}
    </g>`;
}

/**
 * Logo dílny barvou, která svítí jen pod UV: ensō ze značky (tvar je
 * z navrhy-loga/enso-tvar.ts, tentýž jako v logu), květ sakury v mezeře
 * a pod kruhem nápis JIRO saku štětcem (znacka/stetec-kresba.ts).
 * `cx`, `cy` je střed kruhu, `s` měřítko rámečku 200 × 200.
 */
function uvLogo(cx: number, cy: number, s: number) {
  const [zx, zy, zw] = ZNACKA;
  const sz = (s * 200 * 0.92) / zw; // nápis široký skoro jako kruh
  const kvet = UHLY_KVETU.map((u) => `<path d="${PLATEK}" transform="rotate(${u}) translate(0 -${ODSUN})"/>`).join("");
  return `<g transform="translate(${f(cx - 100 * s)} ${f(cy - 100 * s)}) scale(${s})">
      <g fill="#7CFFB0"><path d="${ensoTah}"/><ellipse cx="${ensoKapka.x}" cy="${ensoKapka.y}" rx="${f(ENSO_W * 0.6)}" ry="${f(ENSO_W * 0.53)}" transform="rotate(${ensoKapka.uhel} ${ensoKapka.x} ${ensoKapka.y})"/><path d="${ensoRyha}" opacity="0.8"/></g>
      <g fill="#FF8AE8" transform="translate(${f(ensoKvet.x)} ${f(ensoKvet.y)}) rotate(14) scale(1.3)">${kvet}</g>
    </g>
    <g transform="translate(${f(cx - (zx + zw / 2) * sz)} ${f(cy + 100 * s * 0.92 - zy * sz)}) scale(${f(sz)})">
      <g fill="#6FE7FF">${STETEC.jiro}</g><g fill="#FF8AE8">${STETEC.saku}</g>
    </g>`;
}

/** Co svítí pod UV: rozeta, logo dílny, mikrotext a Kachlíkovo razítko */
function uvObsah(ox: number, oy: number, kx: number, ky: number, radky: number[]) {
  const text = "PRAVÁ JÍZDENKA · OVĚŘIL KACHLÍK, VÝPRAVČÍ · ".repeat(3);
  return `<use href="#rzd-rozeta" transform="translate(${ox} ${oy}) scale(0.95)" stroke="#6FE7FF" stroke-width="0.9" opacity="0.55"/>
    ${uvLogo(ox, oy - 18, 0.62)}
    ${radky.map((y) => `<text x="12" y="${y}" class="rzd-t-uv">${text}</text>`).join("")}
    <use href="#rzd-kachlik" transform="translate(${kx} ${ky}) scale(1.4)" stroke="#9AF0FF"/>`;
}

/** Ořech, kam cvakne průvodčí — jen tečkovaný obrys, dokud se jízdenka nepoužije */
const kontrola = (x: number, y: number, barva: string, s = 1.2) =>
  `<use href="#rzd-orech" transform="translate(${f(x - 11 * s)} ${f(y - 12.5 * s)}) scale(${s})" fill="none" stroke="${barva}" stroke-width="${f(1.3 / s)}" stroke-dasharray="${f(2.2 / s)} ${f(1.8 / s)}" opacity="0.75"/>`;

/** Šipka trasy; `obe` = tam i zpátky (permanentka) */
const sipka = (x1: number, x2: number, y: number, barva: string, obe = false) =>
  `<path d="M${obe ? x1 + 10 : x1} ${y} H${x2 - 10}" stroke="${barva}" stroke-width="2.6"/>` +
  `<path d="M${x2} ${y} l-12 -6.5 v13 z" fill="${barva}"/>` +
  (obe ? `<path d="M${x1} ${y} l12 -6.5 v13 z" fill="${barva}"/>` : "");

/** Tečkovaná linka, na kterou se píše jméno */
const linka = (x1: number, x2: number, y: number, barva: string) =>
  `<path d="M${x1} ${y} H${x2}" stroke="${barva}" stroke-width="2" stroke-dasharray="0.1 6" stroke-linecap="round" opacity="0.5"/>`;

/** Okénko s oblohou spoje — jako na odjezdové tabuli (Odjezdy.astro), slunce tam, kde v tu dobu stojí */
function nebeSpoje(id: string, x: number, y: number, w: number, h: number, hodina: number, ram: string) {
  const [a, b, c] = paleta(hodina).barvy;
  const ts = (hodina - 5.3) / (20.4 - 5.3);
  const t = omez(ts);
  const sx = x + w * (0.1 + 0.8 * t);
  const sy = y + h * (0.88 - Math.sin(Math.PI * t) * 0.66);
  return `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="0.6" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="url(#${id})"/>
    ${ts > 0 && ts < 1 ? `<circle cx="${f(sx)}" cy="${f(sy)}" r="${f(h * 0.16)}" fill="#FFF6DC"/><circle cx="${f(sx)}" cy="${f(sy)}" r="${f(h * 0.28)}" fill="#FFF6DC" opacity="0.3"/>` : ""}
    <path d="M${x} ${f(y + h * 0.78)} H${x + w}" stroke="#FFFFFF" stroke-width="0.8" opacity="0.5"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="none" stroke="${ram}" stroke-width="1.2"/>`;
}

/** Medaile s nominálem: zlatý peníz s korálkovým okrajem, rozeta a uprostřed slonovinový štít */
export interface Nominal {
  cislo: string;
  /** „h“ vedle čísla, nebo verzálky pod ním (MĚS., DEN) */
  jednotka: string;
  vedle?: boolean;
}

function medaile(cx: number, cy: number, n: Nominal, ink: string) {
  const korale = Array.from({ length: 40 }, (_, k) => {
    const a = (k / 40) * 2 * Math.PI;
    return `<circle cx="${f(Math.cos(a) * 41.6)}" cy="${f(Math.sin(a) * 41.6)}" r="1.45"/>`;
  }).join("");
  const napis = n.vedle
    ? `<text x="-5" y="10.5" class="rzd-t-nominal" text-anchor="middle" fill="${ink}">${esc(n.cislo)}</text><text x="11.5" y="10.5" class="rzd-t-nominal-h" text-anchor="middle" fill="${ink}">${esc(n.jednotka)}</text>`
    : `<text y="5" class="rzd-t-nominal" text-anchor="middle" fill="${ink}">${esc(n.cislo)}</text><text y="17" class="rzd-t-nominal-j" text-anchor="middle" fill="${ink}">${esc(n.jednotka)}</text>`;
  return `<g transform="translate(${cx} ${cy})">
    <circle r="45" fill="#000" opacity="0.2" transform="translate(0 2.5)"/>
    <circle r="45" fill="url(#rzd-folie)"/>
    <circle r="45" fill="none" stroke="${ZLATO_TMAVE}" stroke-width="1"/>
    <g fill="${ZLATO_SVETLE}" stroke="${ZLATO_TMAVE}" stroke-width="0.45">${korale}</g>
    <circle r="38.5" fill="none" stroke="${ink}" stroke-width="2.2"/>
    <use href="#rzd-rozeta" transform="scale(0.37)" stroke="${ink}" stroke-width="2" opacity="0.4"/>
    <circle r="26" fill="${SLONOVINA}"/>
    <circle r="26" fill="none" stroke="${ink}" stroke-width="1.3"/>
    <circle r="23.2" fill="none" stroke="${ZLATO}" stroke-width="0.9"/>
    ${napis}
  </g>`;
}

/* ——— Líc ——— */

export interface Udaj {
  co: string;
  hodnota: string;
  /** data-rzd, když hodnotu přepisuje skript */
  rzd?: string;
}

export type Ustrizek =
  /** Kupony po odjezdech — průvodčí pokaždé cvakne jeden */
  | { druh: "kupony"; kuponu: number; delka: string }
  /** Políčko na každý týden a spoje, na které platí */
  | { druh: "tydny"; tydnu: number; spoje: { h: number; nazev: string; cas: string }[] }
  /** Znak kurzu a program dne jako trať se zastávkami */
  | { druh: "program"; emblem: string; kurz: string; zastavek: number; od: string; do: string };

export interface Lic {
  druh: Druh;
  /** Jméno druhu nahoře na desce, verzálkami */
  titul: string;
  cislo: string;
  /** Hodina oblohy v okně salonu */
  hodina: number;
  /** Vlak do okna (SVG <g>), jeho délka a kolik moře je kolem něj */
  vlak: { obsah: string; delka: number; okraj: number; posun?: number };
  nominal: Nominal;
  /** Trasa tam i zpět (permanentka) */
  obeStrany?: boolean;
  /** Pod trasou verzálkami */
  radek: string;
  /** Tři políčka s údaji */
  udaje: Udaj[];
  ustrizek: Ustrizek;
}

/** Ústřižek za perforací — v souřadnicích jízdenky, od y = perforace dolů */
function ustrizek(o: Lic, id: string, ink: string) {
  const L = LISTEK;
  const y0 = L.perforace;
  const u = o.ustrizek;
  const serie = (x: number, y: number) => `<text class="rzd-t-serie" fill="${ink}" transform="translate(${f(x)} ${f(y)}) rotate(90)" text-anchor="middle" data-rzd="cislo-kupon">${esc(o.cislo)}</text>`;
  if (u.druh === "kupony") {
    const n = Math.max(1, u.kuponu);
    const s = L.w / n;
    return Array.from({ length: n }, (_, k) => {
      const x0 = k * s;
      return (
        txt(x0 + 22, y0 + 23, `ODJEZD ${k + 1}`, "rzd-t-kupon-cap", `fill="${ink}"`) +
        txt(x0 + 22, y0 + 54, u.delka, "rzd-t-kupon", `fill="${ink}"`) +
        kontrola(x0 + s - 42, y0 + 40, RUMELKA, 1.1) +
        txt(x0 + 22, y0 + 70, "cvakne průvodčí", "rzd-t-nebo", `fill="${ink}" opacity="0.8"`) +
        serie(x0 + s - 12, y0 + 40)
      );
    }).join("");
  }
  if (u.druh === "tydny") {
    const krok = 20.4;
    const policka = Array.from({ length: u.tydnu }, (_, k) => `<circle cx="${f(24 + k * krok)}" cy="${y0 + 40}" r="6.6" fill="#FFFFFF" fill-opacity="0.5" stroke="${RUMELKA}" stroke-width="1.3"/>`).join("");
    let x = 26;
    const spoje = u.spoje
      .map((s, i) => {
        let kus = "";
        if (i) {
          kus = txt(x + 2, y0 + 69, "nebo", "rzd-t-nebo", `fill="${ink}"`);
          x += 30;
        }
        kus += nebeSpoje(`${id}-spoj-${i}`, x, y0 + 58, 28, 15, s.h, ink) + txt(x + 34, y0 + 69, `${s.nazev} ${s.cas}`, "rzd-t-spoj", `fill="${ink}"`);
        x += 34 + (s.nazev.length + s.cas.length + 1) * 6.3 + 6;
        return kus;
      })
      .join("");
    return `${txt(18, y0 + 22, `${u.tydnu} TÝDNŮ · KAŽDÝ TÝDEN JEDNA JÍZDA`, "rzd-t-kupon-cap", `fill="${ink}"`)}
      ${policka}${spoje}${serie(L.w - 12, y0 + 40)}`;
  }
  /* Program: znak, kurz a trať dne se zastávkami po hodině a půl, na konci cíl */
  const x1 = 74;
  const x2 = L.w - 36;
  const ty = y0 + 56;
  const zastavky = Array.from({ length: u.zastavek + 1 }, (_, k) => {
    const x = x1 + ((x2 - x1) * k) / u.zastavek;
    return k === u.zastavek
      ? `<rect x="${f(x - 4.5)}" y="${ty - 4.5}" width="9" height="9" rx="2" fill="${ink}"/>`
      : `<circle cx="${f(x)}" cy="${ty}" r="3.8" fill="${SLONOVINA}" stroke="${ink}" stroke-width="2"/>`;
  }).join("");
  return `<g transform="translate(38 ${y0 + 40})">
      <circle r="21" fill="${SLONOVINA}" stroke="${RUMELKA}" stroke-width="3.4"/>
      <circle r="16.4" fill="none" stroke="${ZLATO}" stroke-width="1.1"/>
      <text y="0.5" class="rzd-t-emblem${u.emblem.length > 1 ? " rzd-t-emblem-dva" : ""}" text-anchor="middle" dominant-baseline="central" data-rzd="emblem">${esc(u.emblem)}</text>
    </g>
    ${txt(x1, y0 + 22, "KURZ", "rzd-t-kupon-cap", `fill="${ink}"`)}
    ${txt(x1 + 40, y0 + 23, u.kurz, "rzd-t-kurz", `fill="${ink}" data-rzd="kurz" data-sirka="${x2 - x1 - 40}"`)}
    <path d="M${x1} ${ty} H${x2}" stroke="${ink}" stroke-width="2.6"/>
    ${zastavky}
    ${txt(x1, ty + 17, u.od, "rzd-t-caps-male", `fill="${ink}" text-anchor="middle"`)}
    ${txt(x2, ty + 17, u.do, "rzd-t-caps-male", `fill="${ink}" text-anchor="middle"`)}
    ${serie(L.w - 12, y0 + 40)}`;
}

/** Tělo zlaté jízdenky v jejích souřadnicích (0, 0 je levý horní roh) */
function telo(o: Lic, id: string, lak: Lak) {
  const L = LISTEK;
  const ink = lak.inkoust;
  const P = L.perforace;
  const okno: Okno = { x: 16, y: 46, w: 308, h: 178, d: tvarOkna(16, 46, 308, 178) };
  const stred = L.w / 2;
  let diry = "";
  for (let x = 13; x <= L.w - 13; x += 9) diry += `<circle cx="${x}" cy="${P}" r="1.9"/>`;
  if (o.ustrizek.druh === "kupony")
    for (let k = 1; k < o.ustrizek.kuponu; k++) for (let y = P + 10; y <= L.h - 8; y += 9) diry += `<circle cx="${f((k * L.w) / o.ustrizek.kuponu)}" cy="${y}" r="1.7"/>`;
  /* Údaje: tři políčka mezi linkami */
  const U = { x: 16, y: 336, w: 308, h: 44 };
  const b = U.w / o.udaje.length;
  const udaje =
    `<path d="M${U.x} ${U.y} H${U.x + U.w} M${U.x} ${U.y + U.h} H${U.x + U.w}" stroke="${ink}" stroke-width="0.9" opacity="0.4"/>` +
    o.udaje.slice(1).map((_, k) => `<path d="M${f(U.x + (k + 1) * b)} ${U.y + 7} V${U.y + U.h - 7}" stroke="${ink}" stroke-width="0.9" opacity="0.32"/>`).join("") +
    o.udaje
      .map((u, k) => {
        const cx = U.x + b * (k + 0.5);
        return txt(cx, U.y + 16, u.co, "rzd-t-udaj", `text-anchor="middle" fill="${ink}"`) + txt(cx, U.y + 36.5, u.hodnota, "rzd-t-hodnota", `text-anchor="middle" fill="${ink}"${u.rzd ? ` data-rzd="${u.rzd}"` : ""}`);
      })
      .join("");
  const hologram = `<g transform="translate(${okno.x + okno.w - 13} ${okno.y + 13})">
      <circle r="15.5" fill="${SLONOVINA}"/>
      <g class="rzd-hologram"><circle r="14" fill="url(#rzd-hologram)"/></g>
      <circle r="14" fill="none" stroke="#FFFFFF" stroke-width="1.2" opacity="0.85"/>
      <circle r="10.5" fill="none" stroke="#FFFFFF" stroke-width="0.6" opacity="0.7"/>
      <use href="#rzd-orech" transform="translate(-6.6 -7.5) scale(0.6)" fill="#FFFFFF" fill-opacity="0.6" stroke="${ink}" stroke-opacity="0.35" stroke-width="1.2"/>
    </g>`;
  const mikro = "JIRO SAKU · OŘECH · DÁRKOVÁ JÍZDENKA · ";

  return `<defs>
    <mask id="${id}-tvar" maskUnits="userSpaceOnUse" x="-10" y="-10" width="${L.w + 20}" height="${L.h + 20}">
      <rect width="${L.w}" height="${L.h}" rx="10" fill="#fff"/>
      <g fill="#000"><circle cx="0" cy="${P}" r="9"/><circle cx="${L.w}" cy="${P}" r="9"/>${diry}</g>
    </mask>
  </defs>
  <g mask="url(#${id}-tvar)">
    <rect width="${L.w}" height="${L.h}" fill="url(#rzd-folie)"/>
    <rect width="${L.w}" height="${L.h}" fill="url(#rzd-vlnky-zlate)"/>
    <use href="#rzd-rozeta" transform="translate(${stred} 300) scale(1.25)" stroke="${ink}" stroke-width="0.6" opacity="0.13"/>
    <rect y="${P}" width="${L.w}" height="${L.h - P}" fill="#FFF6D6" opacity="0.22"/>
    <rect x="6" y="40" width="${L.w - 12}" height="${P - 46}" rx="4" fill="none" stroke="${ink}" stroke-width="0.8" opacity="0.4"/>
    <rect x="9" y="43" width="${L.w - 18}" height="${P - 52}" rx="3" fill="none" stroke="${ZLATO_TMAVE}" stroke-width="0.6" opacity="0.5"/>

    <path d="M0 10 Q0 0 10 0 H${L.w - 10} Q${L.w} 0 ${L.w} 10 V34 H0 Z" fill="${lak.stred}"/>
    <path d="M0 34 H${L.w}" stroke="${ZLATO_SVETLE}" stroke-width="1.4"/>
    ${txt(16, 22, "DÁRKOVÁ JÍZDENKA", "rzd-t-hlavicka", `fill="${ZLATO_SVETLE}"`)}
    ${txt(L.w - 16, 22, o.cislo, "rzd-t-cislo", `text-anchor="end" fill="#FFD9A0" data-rzd="cislo"`)}

    ${scena(id, okno, o.hodina, o.vlak.delka, o.vlak.obsah, { okraj: o.vlak.okraj, posun: o.vlak.posun ?? 0 })}
    ${zaves(id, okno, lak)}
    <path d="${okno.d}" fill="none" stroke="${ink}" stroke-width="5.6" opacity="0.55"/>
    <path d="${okno.d}" fill="none" stroke="url(#rzd-zlato)" stroke-width="3.2"/>
    ${hologram}
    ${medaile(stred, okno.y + okno.h + 4, o.nominal, ink)}

    ${txt(stred - 22, 302, "Ořech", "rzd-t-trasa", `text-anchor="end" fill="${ink}"`)}
    ${sipka(stred - 15, stred + 15, 293, ink, o.obeStrany)}
    ${txt(stred + 22, 302, "Dílna", "rzd-t-trasa", `fill="${ink}"`)}
    ${txt(stred, 324, o.radek, "rzd-t-radek", `text-anchor="middle" fill="${ink}"${o.druh === "kurz" ? ` data-rzd="radek"` : ""}`)}
    ${udaje}

    ${txt(18, 406, "PRO", "rzd-t-caps", `fill="${ink}"`)}
    ${linka(52, L.w - 18, 409, ink)}
    <text class="rzd-t-mikro" fill="${ink}" transform="translate(13.2 ${P - 10}) rotate(-90)" textLength="${P - 56}" lengthAdjust="spacing">${esc(mikro.repeat(4))}</text>
    <text class="rzd-t-mikro" fill="${ink}" transform="translate(${L.w - 13.2} 46) rotate(90)" textLength="${P - 56}" lengthAdjust="spacing">${esc(mikro.repeat(4))}</text>

    ${ustrizek(o, id, ink)}
  </g>`;
}

/** Líc: lakovaná deska, v ní zlatá jízdenka a pod ní místo na věnování (to píše HTML nad kresbou) */
export function lic(o: Lic) {
  const id = ID[o.druh];
  const lak = LAKY[o.druh];
  const L = LISTEK;
  const mistoUv = uvObsah(L.w / 2, 300, 236, L.perforace + 14, [124, 166]);
  return `${deska(id, lak)}
  ${hlavaDesky(o.titul)}
  <!-- Stín se vrhá jen z obrysu jízdenky, ne z celé kresby: filtr s rozmazáním by se jinak počítal
       znovu s každým snímkem hologramu, kouře, závěsů i lampy — na slabším stroji to sekalo -->
  <g transform="translate(${L.x} ${L.y})">
    <g filter="url(#rzd-stin)"><rect width="${L.w}" height="${L.h}" fill="#C39434" mask="url(#${id}-tvar)"/></g>
    ${telo(o, id, lak)}
  </g>
  <!-- UV je zvlášť nad jízdenkou, ať se při pohybu lampy nepřekresluje víc, než musí -->
  <g transform="translate(${L.x} ${L.y})">
    <g mask="url(#${id}-tvar)">
      ${uv(id, `mask="url(#${id}-tvar)"`, mistoUv)}
    </g>
  </g>
  ${rohyListku(lak)}`;
}

/** Třetí vrstva nad poli na psaní: razítko Dárek a páska s mašlí — ukáže se až při zabalení */
export function obal(druh: Druh) {
  const L = LISTEK;
  return `${razitko(`${ID[druh]}o`, L.x + 252, L.y + 238)}${paska(L.y + 332, 52, 318)}`;
}

/* ——— Rub: deska zezadu ———
 *
 * Každá se dá otočit (Darky.astro, tlačítko otočit) a vzadu je zlatem, jak
 * ji uplatnit — oslovuje obdarovaného, tak jako jízdenka mluví
 * s cestujícím. Pod kroky je, kdy se jezdí (odjezdy, spoje, nebo program
 * kurzu), štítek s čárovým kódem a dole platnost a kontakt.
 */

export type Panel =
  | { druh: "odjezdy"; titul: string; casy: string[]; pozn: string }
  | { druh: "spoje"; titul: string; spoje: { h: number; nazev: string; cas: string }[]; tydnu: number; pozn: string }
  | { druh: "program"; titul: string; kurzy: { id: string; nazev: string; emblem: string; zastavky: { cas: string; nazev: string }[] }[] };

export interface Rub {
  druh: Druh;
  cislo: string;
  /** Délka vlaku z okna na líci — když na rubu zbude místo, je pod štítkem zlatem jako rytina */
  vlak: number;
  /** Jak ji uplatnit — krátké kroky, na rubu očíslované */
  kroky: string[];
  panel: Panel;
  /** Drobně dole: platnost a kontakt, po řádcích */
  pata: string[];
}

/** Text do řádků po slovech, aby se vešel; poslední řádek se utne trojtečkou */
export function zalom(text: string, znaku: number, radku: number) {
  const slova = text.split(/[ \t\r\n]+/).filter(Boolean);
  const out: string[] = [];
  let r = "";
  for (const s of slova) {
    if (!r) r = s;
    else if ((r + " " + s).length <= znaku) r += " " + s;
    else {
      out.push(r);
      r = s;
    }
  }
  if (r) out.push(r);
  if (out.length > radku) {
    out.length = radku;
    out[radku - 1] = out[radku - 1].replace(/[\s,.;:!?-]*$/, "") + "…";
  }
  return out;
}

/** Čárový kód — jen kresba ze semínka, nic se z něj nečte */
function carovyKod(x: number, y: number, w: number, h: number, seminko: number, barva: string) {
  let n = seminko;
  const r = () => (n = (n * 1103515245 + 12345) % 2147483648) / 2147483648;
  let out = "";
  for (let cx = x; ; ) {
    const sirka = 1 + Math.floor(r() * 3) * 1.25;
    if (cx + sirka > x + w) break;
    out += `<rect x="${f(cx)}" y="${y}" width="${f(sirka)}" height="${h}"/>`;
    cx += sirka + 1.2 + Math.floor(r() * 3) * 1.1;
  }
  return `<g fill="${barva}">${out}</g>`;
}

/** Očíslované kroky: číslo v kroužku a text zalomený na řádky; vrátí kresbu a kde skončila */
function krokyKresba(x: number, y: number, sirka: number, kroky: string[], { velikost = 15.5, radek = 21, mezera = 9 } = {}) {
  let out = "";
  let yy = y;
  const znaku = Math.floor((sirka - 32) / (velikost * 0.46));
  kroky.forEach((k, i) => {
    const radky = zalom(k, znaku, 3);
    out += `<circle cx="${x + 11}" cy="${f(yy - velikost * 0.34)}" r="11" fill="none" stroke="${ZLATO_SVETLE}" stroke-width="1.6"/>`;
    out += txt(x + 11, yy - velikost * 0.34 + 4.3, String(i + 1), "rzd-t-krok-cislo", `text-anchor="middle" fill="${ZLATO_SVETLE}"`);
    out += `<text class="rzd-t-krok" fill="${KREM}" style="font-size:${velikost}px">${radky.map((r, j) => `<tspan x="${x + 32}" y="${f(yy + j * radek)}">${esc(r)}</tspan>`).join("")}</text>`;
    yy += radky.length * radek + mezera;
  });
  return { out, y: yy };
}

/** Nadpis oddílu na rubu: verzálky zlatem na lince */
const titulRubu = (y: number, text: string) =>
  `<path d="M44 ${y - 4} H${f(SIRKA / 2 - text.length * 4.4 - 12)} M${f(SIRKA / 2 + text.length * 4.4 + 12)} ${y - 4} H${SIRKA - 44}" stroke="${ZLATO}" stroke-width="0.8" opacity="0.55"/>` +
  txt(SIRKA / 2, y, text, "rzd-t-rub-titul", `text-anchor="middle"`);

function panelRubu(id: string, p: Panel, y: number) {
  if (p.druh === "odjezdy") {
    /* Odjezdy dne jako malý jízdní řád: časy ve zlatých rámečcích po třech */
    const sl = 3;
    const w = 92;
    const h = 30;
    const x0 = SIRKA / 2 - (sl * w + (sl - 1) * 10) / 2;
    const casy = p.casy
      .map((c, i) => {
        const x = x0 + (i % sl) * (w + 10);
        const yy = y + 18 + Math.floor(i / sl) * (h + 9);
        return `<rect x="${f(x)}" y="${yy}" width="${w}" height="${h}" rx="4" fill="#000" fill-opacity="0.16" stroke="${ZLATO}" stroke-width="1"/>` + txt(x + w / 2, yy + 21, c, "rzd-t-rub-cas", `text-anchor="middle"`);
      })
      .join("");
    const radku = Math.ceil(p.casy.length / sl);
    const konec = y + 18 + radku * (h + 9);
    return { out: titulRubu(y, p.titul) + casy + txt(SIRKA / 2, konec + 14, p.pozn, "rzd-t-rub-pozn", `text-anchor="middle"`), y: konec + 22 };
  }
  if (p.druh === "spoje") {
    const w = 132;
    const x0 = SIRKA / 2 - (p.spoje.length * w + (p.spoje.length - 1) * 16) / 2;
    const spoje = p.spoje
      .map((s, i) => {
        const x = x0 + i * (w + 16);
        return nebeSpoje(`${id}-spoj-${i}`, x, y + 16, w, 40, s.h, ZLATO) + `<text x="${x + w / 2}" y="${y + 77}" text-anchor="middle"><tspan class="rzd-t-rub-cas">${esc(s.cas)}</tspan><tspan class="rzd-t-rub-zastavka" dx="6">${esc(s.nazev)}</tspan></text>`;
      })
      .join("");
    const krok = Math.min(22, 300 / p.tydnu);
    const tx = SIRKA / 2 - ((p.tydnu - 1) * krok) / 2;
    const tydny = Array.from({ length: p.tydnu }, (_, k) => `<circle cx="${f(tx + k * krok)}" cy="${y + 102}" r="6.4" fill="none" stroke="${ZLATO_SVETLE}" stroke-width="1.2"/>`).join("");
    return { out: titulRubu(y, p.titul) + spoje + tydny + txt(SIRKA / 2, y + 128, p.pozn, "rzd-t-rub-pozn", `text-anchor="middle"`), y: y + 136 };
  }
  /* Program obou kurzů vedle sebe — vybraný svítí, na kterýkoli svítí oba (skript) */
  const sloupec = (SIRKA - 88) / Math.max(1, p.kurzy.length);
  const programy = p.kurzy
    .map((kurz, i) => {
      const x0 = 44 + i * sloupec + 6;
      return `<g data-program="${esc(kurz.id)}">
        <circle cx="${x0 + 13}" cy="${y + 26}" r="13" fill="${SLONOVINA}" stroke="${RUMELKA}" stroke-width="2.6"/>
        <text x="${x0 + 13}" y="${y + 27}" class="rzd-t-emblem-maly" text-anchor="middle" dominant-baseline="central">${esc(kurz.emblem)}</text>
        ${txt(x0 + 33, y + 32, kurz.nazev, "rzd-t-rub-kurz")}
        ${kurz.zastavky.map((z, j) => txt(x0, y + 62 + j * 20, z.cas, "rzd-t-rub-cas") + txt(x0 + 48, y + 62 + j * 20, z.nazev, "rzd-t-rub-zastavka")).join("")}
      </g>`;
    })
    .join("");
  const nejvic = Math.max(...p.kurzy.map((k) => k.zastavky.length));
  const konec = y + 62 + (nejvic - 1) * 20;
  const cara = p.kurzy.length > 1 ? `<path d="M${SIRKA / 2} ${y + 14} V${konec + 4}" stroke="${ZLATO}" stroke-width="0.8" opacity="0.5"/>` : "";
  return { out: titulRubu(y, p.titul) + programy + cara, y: konec + 14 };
}

/**
 * Vlak z okna na líci jako zlatá rytina: <use> na tentýž vláček (i když se
 * u zvláštního vlaku změní kurz) a filtr z něj nechá jen zlatý obrys
 * a světlá místa — okna a krémové pásy. Pod ním hladina.
 */
function rytina(druh: Druh, delkaVlaku: number, y: number, vyska: number) {
  const s = Math.min(250 / delkaVlaku, (vyska - 18) / 186);
  const w = delkaVlaku * s;
  const dole = y + vyska / 2 + (176 * s) / 2;
  const vlny = [0, 1, 2].map((k) => `<path d="M${f(SIRKA / 2 - w / 2 - 18 + k * 30)} ${f(dole + 7 + k * 5)} h${f(w + 36 - k * 60)}" stroke="${ZLATO}" stroke-width="0.8" stroke-dasharray="${18 - k * 4} ${7 + k * 3}" opacity="${0.55 - k * 0.15}"/>`).join("");
  return `<g opacity="0.85"><g filter="url(#rzd-rytina)" transform="translate(${f(SIRKA / 2 - w / 2)} ${f(dole)}) scale(${f(s * 1000) / 1000})"><use href="#${ID[druh]}-vlak"/></g></g>
    <path d="M${f(SIRKA / 2 - w / 2 - 24)} ${f(dole + 1)} H${f(SIRKA / 2 + w / 2 + 24)}" stroke="${ZLATO}" stroke-width="1.2" opacity="0.7"/>${vlny}`;
}

export function rub(o: Rub) {
  const id = `${ID[o.druh]}r`;
  const lak = LAKY[o.druh];
  const k = krokyKresba(48, 170, SIRKA - 96, o.kroky);
  const panel = panelRubu(id, o.panel, Math.max(k.y + 22, 330));
  const ys = panel.y + 20;
  const pata = VYSKA - 58;
  /* Místo mezi štítkem a patou — vejde-li se tam vlak, bude tam zlatem */
  const volno = pata - 22 - (ys + 62 + 14);
  return `${deska(id, lak)}
  ${hlavaDesky("JAK JI UPLATNIT")}
  <g transform="translate(${SIRKA / 2} 112)">
    <circle r="27" fill="none" stroke="${ZLATO}" stroke-width="1.4"/>
    <circle r="22.5" fill="none" stroke="${ZLATO}" stroke-width="0.6" opacity="0.7"/>
    <use href="#rzd-orech" transform="translate(-15.4 -17.5) scale(1.4)" fill="url(#rzd-zlato)"/>
  </g>
  ${k.out}
  ${panel.out}
  <g transform="translate(${SIRKA / 2 - 98} ${ys})">
    <rect width="196" height="62" rx="5" fill="${SLONOVINA}"/>
    <rect width="196" height="62" rx="5" fill="url(#rzd-vlnky-zlate)"/>
    <rect x="3" y="3" width="190" height="56" rx="3" fill="none" stroke="${lak.inkoust}" stroke-width="0.8" opacity="0.4"/>
    ${carovyKod(18, 10, 160, 28, o.druh === "hodiny" ? 31 : o.druh === "pas" ? 77 : 113, "#2B2420")}
    ${txt(98, 53, o.cislo, "rzd-t-cislo", `text-anchor="middle" fill="#2B2420" data-rzd="cislo-kupon"`)}
  </g>
  ${volno >= 60 ? rytina(o.druh, o.vlak, ys + 62 + 14, volno) : ""}
  <text class="rzd-t-rub-pata" text-anchor="middle">${o.pata.map((r, i) => `<tspan x="${SIRKA / 2}" y="${f(Math.max(ys + 92, pata) + i * 17)}">${esc(r)}</tspan>`).join("")}</text>`;
}

/* Délky vlaků do okna — ať komponenta nemusí znát vlak.ts */
export const delkaHodin = (odjezdu: number) => delka(vozuHodiny(odjezdu));
export const DELKA_PASU = delka(1);
export { DELKA_ZVLASTNIHO };
