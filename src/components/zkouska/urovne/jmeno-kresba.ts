/**
 * Kresba úrovně 六 Jméno — „Čí je která“ (komnata U mistra, /zkouska).
 *
 * Dvě místa v jednom okně nad sebou, kamera mezi nimi přejede:
 *
 *   stůl     (y 0–560)   pohled shora na pracovní stůl s plstí: medový
 *            pečetní kámen ve svěráku, rydlo, porcelánová dóza s rumělkou,
 *            lístek s návrhem a list papíru se znakem 名, kam se pečeť
 *            nakonec otiskne. Na kameni je pečeť zrcadlově — tak se ryje,
 *            aby se otiskla správně.
 *   police   (y −560–0)  dlouhá police u zdi, trám, ze kterého visí
 *            Cedulka, a misky, které skript přeskládává. Všechny stejné:
 *            celadon, holá patka a v ní značka — tvoje pečeť, nebo
 *            znamení někoho z party.
 *
 * Čisté funkce bez DOM, vracejí SVG/HTML jako text. Skript úrovně
 * (scripts/zkouska/urovne/jmeno.ts) si z nich bere i kousky, které se mění
 * (čelo kamene, návrh, otisk, misky, třísky), a geometrii, podle které
 * hýbe rydlem, kamenem a miskami. Všechna id mají předponu mj6-.
 */
import { parta } from "../../../data/parta";
import type { PostavaId } from "../../../data/parta";
import { pecetSvg, rozlozeni, obrysPeceti, vychoziPecet, PISMO_LATINKA, PISMO_ZNAKY } from "../pecet";
import type { Pecet } from "../pecet";

export const VIEW_W = 800;
export const VIEW_H = 560;

/** Čelo pečetního kamene na stole: levý horní roh, strana a výška boku pod ním */
export const KAMEN = { x: 166, y: 150, s: 168, bok: 40 };
/** Kolem čeho se kámen otáčí a zvedá — střed celého kamene i s bokem */
export const KAMEN_STRED = { x: KAMEN.x + KAMEN.s / 2, y: KAMEN.y + (KAMEN.s + KAMEN.bok) / 2 };
/** Dóza s rumělkou */
export const DOZA = { x: 98, y: 446, r: 60 };
/** Rámeček na listu, kam se pečeť otiskne (střed, strana, natočení listu kolem 650/280) */
export const OTISK = { x: 652, y: 404, s: 118, uhel: -2 };
/** Kde rydlo leží, když se neryje: hrot a úhel */
export const RYDLO_KLID = { x: 300, y: 418, uhel: 26 };
export const RYDLO_DELKA = 214;
/** Cedulka leží na stole vlevo nahoře (posun obalu ve scéně, natočení, zvětšení) */
export const CEDULKA_STUL = { x: -16, y: -8, uhel: -8, meritko: 1.2 };
/** Cedulka visí z trámu: horní hrana obalu */
export const CEDULKA_Y = 24;

/** Police: patky misek stojí na y = POLICE_Y (v souřadnicích police) */
export const POLICE_Y = 464;
export const MISKA_R = 50;
/** Misky na polici jsou o kus větší, než je kresba */
export const MISKA_MERITKO = 1.15;
/** Střed misky (od patky), kolem kterého se při otočení dnem k divákovi točí */
export const MISKA_STRED = -34;
/** Trám, ze kterého visí Cedulka */
export const TRAM_Y = 24;
/** Šířka Cedulky (HTML nad kresbou) ve scéně — kresba je čtvercová */
export const CEDULKA_W = 140;

/** Kde misky stojí: pro 3, 4 a 5 misek */
export function mistaMisek(n: number): number[] {
  const rozestup = n <= 3 ? 176 : n === 4 ? 150 : 128;
  return Array.from({ length: n }, (_, i) => VIEW_W / 2 + (i - (n - 1) / 2) * rozestup);
}

const f = (n: number) => (Math.round(n * 10) / 10).toString();
export const esc = (s: string) => s.replace(/[<&>"]/g, (c) => ({ "<": "&lt;", "&": "&amp;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Pseudonáhoda se semínkem — kresba je při buildu i v prohlížeči stejná */
function nahoda(semeno: number) {
  let s = semeno % 2147483647 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** SVG pečeti (100 × 100) vnořené do obdélníku ve scéně */
const vnor = (svg: string, x: number, y: number, w: number, h: number) =>
  svg.replace("<svg ", `<svg x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" `);

/** Zrcadlo kolem svislé osy x = cx */
const zrcadlo = (cx: number, obsah: string) => `<g transform="matrix(-1 0 0 1 ${f(2 * cx)} 0)">${obsah}</g>`;

/** Stín jako filtr: rozmazání + posun + barva (bez feDropShadow, ten librsvg nezná) */
const stinFiltr = (id: string, rozmaz: number, dx: number, dy: number, barva: string, sila: number) =>
  `<filter id="${id}" x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="sRGB">` +
  `<feGaussianBlur in="SourceAlpha" stdDeviation="${rozmaz}" result="b"/>` +
  `<feOffset in="b" dx="${dx}" dy="${dy}" result="o"/>` +
  `<feFlood flood-color="${barva}" flood-opacity="${sila}"/>` +
  `<feComposite in2="o" operator="in" result="s"/>` +
  `<feMerge><feMergeNode in="s"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;

/* ═════════════════════════ Stůl ═════════════════════════ */

const PRES_CELO = { x: KAMEN.x - 14, y: KAMEN.y - 14, w: KAMEN.s + 28, h: KAMEN.s + 28 };

function defsStul() {
  const m = PRES_CELO;
  const maska = (id: string, pozadi: string, cara: string) =>
    `<mask id="${id}" maskUnits="userSpaceOnUse" x="${m.x}" y="${m.y}" width="${m.w}" height="${m.h}">` +
    `<rect x="${m.x}" y="${m.y}" width="${m.w}" height="${m.h}" fill="${pozadi}"/>` +
    `<path class="mj6-rez-draha" d="" fill="none" stroke="${cara}" stroke-linecap="round" stroke-linejoin="round"/></mask>`;
  return [
    `<linearGradient id="mj6-prkno" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C08C58"/><stop offset="1" stop-color="#A9743F"/></linearGradient>`,
    `<radialGradient id="mj6-svetlo" cx="0.16" cy="0.05" r="0.95"><stop offset="0" stop-color="#FFF4DA" stop-opacity="0.45"/><stop offset="0.5" stop-color="#FFF4DA" stop-opacity="0.1"/><stop offset="1" stop-color="#FFF4DA" stop-opacity="0"/></radialGradient>`,
    `<radialGradient id="mj6-vineta" cx="0.5" cy="0.5" r="0.75"><stop offset="0.62" stop-color="#2B1A0E" stop-opacity="0"/><stop offset="1" stop-color="#2B1A0E" stop-opacity="0.4"/></radialGradient>`,
    `<linearGradient id="mj6-plst" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="#4E648D"/><stop offset="1" stop-color="#32446A"/></linearGradient>`,
    /* Svěrák z ořechového dřeva */
    `<linearGradient id="mj6-svera" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9A6A40"/><stop offset="1" stop-color="#6E4527"/></linearGradient>`,
    `<linearGradient id="mj6-svera-celo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5E3D22"/><stop offset="1" stop-color="#442B17"/></linearGradient>`,
    /* Medový mastek: leštěné čelo, vyrytá hloubka, bok, knoflík */
    `<linearGradient id="mj6-kamen-plocha" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FAEBC9"/><stop offset="0.5" stop-color="#F0D49C"/><stop offset="1" stop-color="#DDB06E"/></linearGradient>`,
    `<linearGradient id="mj6-kamen-rez" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#C79B5C"/><stop offset="1" stop-color="#A97C42"/></linearGradient>`,
    `<linearGradient id="mj6-kamen-bok" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EBC68A"/><stop offset="0.55" stop-color="#D2A15F"/><stop offset="1" stop-color="#B27E43"/></linearGradient>`,
    `<linearGradient id="mj6-kamen-lesk" x1="0" y1="0" x2="1" y2="1"><stop offset="0.16" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="0.3" stop-color="#FFFFFF" stop-opacity="0.42"/><stop offset="0.42" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>`,
    `<radialGradient id="mj6-knofl" cx="0.38" cy="0.32" r="0.75"><stop offset="0" stop-color="#FFF4DA"/><stop offset="0.55" stop-color="#EDCB8E"/><stop offset="1" stop-color="#C8954F"/></radialGradient>`,
    `<filter id="mj6-oblak" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="11"/></filter>`,
    `<filter id="mj6-mekce" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.6"/></filter>`,
    `<filter id="mj6-rozmaz" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="7"/></filter>`,
    /* Jamka po rydle: vnitřní stín u horní a levé hrany, světlo u dolní a pravé */
    `<filter id="mj6-jamka" x="-4%" y="-4%" width="108%" height="108%" color-interpolation-filters="sRGB">` +
      `<feFlood flood-color="#000000" result="cerna"/>` +
      `<feComposite in="cerna" in2="SourceAlpha" operator="out" result="mimo"/>` +
      `<feOffset in="mimo" dx="2.2" dy="2.6" result="o1"/>` +
      `<feGaussianBlur in="o1" stdDeviation="1.3" result="b1"/>` +
      `<feFlood flood-color="#4A2E10" flood-opacity="0.8"/>` +
      `<feComposite in2="b1" operator="in" result="s1"/>` +
      `<feComposite in="s1" in2="SourceAlpha" operator="in" result="stin"/>` +
      `<feOffset in="mimo" dx="-1.3" dy="-1.5" result="o2"/>` +
      `<feGaussianBlur in="o2" stdDeviation="0.7" result="b2"/>` +
      `<feFlood flood-color="#FFF1CF" flood-opacity="0.75"/>` +
      `<feComposite in2="b2" operator="in" result="s2"/>` +
      `<feComposite in="s2" in2="SourceAlpha" operator="in" result="svetlo"/>` +
      `<feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="stin"/><feMergeNode in="svetlo"/></feMerge></filter>`,
    `<clipPath id="mj6-celo"><rect x="${KAMEN.x}" y="${KAMEN.y}" width="${KAMEN.s}" height="${KAMEN.s}" rx="9"/></clipPath>`,
    /* Rytí: černá čára za rydlem v jedné masce schová náčrt, bílá v druhé ukáže jamky */
    maska("mj6-rez-skryj", "#FFFFFF", "#000000"),
    maska("mj6-rez-ukaz", "#000000", "#FFFFFF"),
    /* Rydlo: ocel a šňůra */
    `<linearGradient id="mj6-ocel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6F7880"/><stop offset="0.38" stop-color="#E3E8EC"/><stop offset="0.62" stop-color="#A9B1B8"/><stop offset="1" stop-color="#5E666D"/></linearGradient>`,
    `<linearGradient id="mj6-snura" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8E2C1B"/><stop offset="0.4" stop-color="#D2553A"/><stop offset="1" stop-color="#7A2416"/></linearGradient>`,
    `<clipPath id="mj6-snura-orez"><rect x="72" y="-7.5" width="98" height="15" rx="3"/></clipPath>`,
    /* Dóza s rumělkou */
    `<radialGradient id="mj6-porcelan" cx="0.4" cy="0.35" r="0.7"><stop offset="0" stop-color="#FFFFFF"/><stop offset="0.75" stop-color="#EEF1F4"/><stop offset="1" stop-color="#C9D1DA"/></radialGradient>`,
    `<radialGradient id="mj6-pasta" cx="0.42" cy="0.38" r="0.7"><stop offset="0" stop-color="#E9654A"/><stop offset="0.6" stop-color="#C23C26"/><stop offset="1" stop-color="#8A2213"/></radialGradient>`,
    /* Papír */
    `<linearGradient id="mj6-papir" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stop-color="#FFFCF4"/><stop offset="1" stop-color="#F2E9D6"/></linearGradient>`,
    stinFiltr("mj6-stin-papir", 4, 3, 6, "#2B1A0E", 0.35),
    stinFiltr("mj6-stin-vec", 3, 4, 6, "#1E1810", 0.42),
  ].join("");
}

/** Prkna stolu a plst pod kamenem */
function deska() {
  const rnd = nahoda(61);
  const prkna: string[] = [];
  const odstiny = ["#BF8A55", "#B47E4A", "#C08E5B", "#B37D49", "#BC8752"];
  for (let i = 0; i < 5; i++) {
    const y = i * 112;
    prkna.push(`<rect x="0" y="${y}" width="800" height="112" fill="${odstiny[i]}"/>`);
    prkna.push(`<rect x="0" y="${y}" width="800" height="112" fill="url(#mj6-prkno)" opacity="0.35"/>`);
    let leta = "";
    for (let k = 0; k < 3; k++) {
      const yy = y + 22 + k * 30 + rnd() * 10;
      leta += `M-10 ${f(yy)} C${f(180 + rnd() * 80)} ${f(yy - 8 + rnd() * 16)} ${f(460 + rnd() * 80)} ${f(yy - 10 + rnd() * 20)} 810 ${f(yy + rnd() * 8 - 4)} `;
    }
    prkna.push(`<path d="${leta}" stroke="#7E5230" stroke-width="1.3" fill="none" opacity="0.22"/>`);
    prkna.push(`<path d="M0 ${y + 1} H800" stroke="#E2B987" stroke-width="1.4" opacity="0.4"/>`);
    prkna.push(`<path d="M0 ${y + 111} H800" stroke="#5E3B1E" stroke-width="2.2" opacity="0.5"/>`);
  }
  prkna.push(`<g opacity="0.35" fill="none" stroke="#6E4526"><ellipse cx="505" cy="290" rx="14" ry="6"/><ellipse cx="505" cy="290" rx="24" ry="10" stroke-width="0.8"/><ellipse cx="505" cy="290" rx="5" ry="2.4" fill="#6E4526"/></g>`);
  return (
    prkna.join("") +
    `<rect x="30" y="42" width="456" height="492" rx="16" fill="#1E1810" opacity="0.32" filter="url(#mj6-rozmaz)"/>` +
    `<rect x="28" y="38" width="456" height="492" rx="16" fill="url(#mj6-plst)"/>` +
    `<rect x="37" y="47" width="438" height="474" rx="10" fill="none" stroke="#A9B8D4" stroke-width="1.4" stroke-dasharray="5 4" opacity="0.5"/>`
  );
}

/** Svěrák (印床): zadní příčka a dvě čelisti, mezi nimi kámen */
function sverak() {
  const { x, y, s, bok } = KAMEN;
  const x0 = x - 46;
  const x1 = x + s + 46;
  const y0 = y - 36;
  const yd = y + s;
  const celo = (cx0: number, cx1: number) =>
    `<path d="M${cx0} ${yd} H${cx1} V${yd + bok - 4} Q${cx1} ${yd + bok} ${cx1 - 4} ${yd + bok} H${cx0 + 4} Q${cx0} ${yd + bok} ${cx0} ${yd + bok - 4} Z" fill="url(#mj6-svera-celo)"/>`;
  return (
    /* Dno svěráku — je vidět, jen když je kámen venku */
    `<rect x="${x - 2}" y="${y - 2}" width="${s + 4}" height="${s + bok + 2}" rx="4" fill="url(#mj6-svera-celo)"/>` +
    `<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="#4A3019" opacity="0.55"/>` +
    `<path d="M${x} ${y + 6} H${x + s}" stroke="#2E1D0E" stroke-width="10" opacity="0.35" filter="url(#mj6-mekce)"/>` +
    `<path d="M${x + 8} ${y + 40} C${x + 60} ${y + 34} ${x + 110} ${y + 46} ${x + s - 8} ${y + 40} M${x + 8} ${y + 96} C${x + 70} ${y + 90} ${x + 120} ${y + 102} ${x + s - 8} ${y + 94} M${x + 8} ${y + 140} C${x + 50} ${y + 146} ${x + 120} ${y + 134} ${x + s - 8} ${y + 142}" stroke="#7A5232" stroke-width="1" fill="none" opacity="0.5"/>` +
    `<g filter="url(#mj6-stin-vec)">` +
    `<path d="M${x0} ${y0 + 6} Q${x0} ${y0} ${x0 + 6} ${y0} H${x1 - 6} Q${x1} ${y0} ${x1} ${y0 + 6} V${yd} H${x + s} V${y} H${x} V${yd} H${x0} Z" fill="url(#mj6-svera)"/>` +
    celo(x0, x) +
    celo(x + s, x1) +
    `</g>` +
    `<g stroke="#B88A5C" stroke-width="1" fill="none" opacity="0.45">` +
    `<path d="M${x0 + 10} ${y0 + 12} C${x0 + 80} ${y0 + 8} ${x1 - 90} ${y0 + 20} ${x1 - 8} ${y0 + 14}"/>` +
    `<path d="M${x0 + 14} ${y0 + 26} C${x0 + 90} ${y0 + 22} ${x1 - 80} ${y0 + 30} ${x1 - 12} ${y0 + 26}"/>` +
    `<path d="M${x0 + 12} ${y + 20} C${x0 + 18} ${y + 70} ${x0 + 10} ${y + 120} ${x0 + 16} ${yd - 8}"/>` +
    `<path d="M${x0 + 30} ${y + 10} C${x0 + 26} ${y + 60} ${x0 + 34} ${y + 110} ${x0 + 28} ${yd - 6}"/>` +
    `<path d="M${x1 - 14} ${y + 16} C${x1 - 20} ${y + 70} ${x1 - 12} ${y + 120} ${x1 - 18} ${yd - 8}"/>` +
    `<path d="M${x1 - 32} ${y + 8} C${x1 - 28} ${y + 60} ${x1 - 36} ${y + 110} ${x1 - 30} ${yd - 6}"/>` +
    `</g>` +
    `<path d="M${x0 + 6} ${y0 + 1} H${x1 - 6}" stroke="#D9A672" stroke-width="1.6" opacity="0.7"/>` +
    /* Mosazné kolíky v čelistech */
    [x0 + 23, x1 - 23].map((cx) => `<circle cx="${cx}" cy="${y0 + 18}" r="4.2" fill="#C9A24A" stroke="#7A5A1E" stroke-width="1"/><circle cx="${cx - 1.2}" cy="${y0 + 16.8}" r="1.4" fill="#FFF0B8"/>`).join("")
  );
}

/** Stopy rydla v jamkách — krátké matné rýhy, ať je vidět ruční práce */
function stopyRydla() {
  const rnd = nahoda(23);
  let d = "";
  for (let i = 0; i < 34; i++) {
    const x = KAMEN.x + 6 + rnd() * (KAMEN.s - 12);
    const y = KAMEN.y + 6 + rnd() * (KAMEN.s - 12);
    const u = (rnd() < 0.5 ? -0.6 : 0.5) + rnd() * 0.3;
    const l = 5 + rnd() * 7;
    d += `M${f(x)} ${f(y)} l${f(Math.cos(u) * l)} ${f(Math.sin(u) * l)} `;
  }
  return `<path d="${d}" stroke="#EBCB91" stroke-width="1.2" stroke-linecap="round" opacity="0.55"/>`;
}

/** Text znaků přesně tak, jak je kreslí pecet.ts — kvůli náčrtu tužkou */
function pismenaPeceti(p: Pecet) {
  return rozlozeni(p)
    .map(
      (z) =>
        `<text x="${z.x}" y="${f(z.y)}" text-anchor="middle" font-size="${z.velikost}" font-family="${z.japonsky ? PISMO_ZNAKY : PISMO_LATINKA}"${z.japonsky ? "" : ` font-weight="700" style="font-variation-settings:'SOFT' 0,'WONK' 0,'opsz' 72"`}>${esc(z.znak)}</text>`,
    )
    .join("");
}

/**
 * Proměnná část čela kamene (vše zrcadlově), skript ji při změně pečeti
 * vymění celou:
 *   jamky    vyrytá hloubka — vidět jen tam, kudy už rydlo prošlo
 *   inkoust  rumělka na vyvýšených tazích — po namočení v dóze
 *   náčrt    tužkou předkreslená pečeť — za rydlem mizí
 */
export function celoKamene(p: Pecet) {
  const { x, y, s } = KAMEN;
  const m = PRES_CELO;
  const cx = x + s / 2;
  const cerne = vnor(pecetSvg(p, { id: "mj6-pk", barva: "#000000", textura: false }), x, y, s, s);
  const k = s / 100;
  return (
    `<defs><mask id="mj6-jamky" maskUnits="userSpaceOnUse" x="${m.x}" y="${m.y}" width="${m.w}" height="${m.h}">` +
    `<rect x="${m.x}" y="${m.y}" width="${m.w}" height="${m.h}" fill="#FFFFFF"/>${zrcadlo(cx, cerne)}</mask></defs>` +
    `<g class="mj6-vyryto" mask="url(#mj6-rez-ukaz)"><g filter="url(#mj6-jamka)"><g mask="url(#mj6-jamky)">` +
    `<rect x="${m.x}" y="${m.y}" width="${m.w}" height="${m.h}" fill="url(#mj6-kamen-rez)"/>${stopyRydla()}` +
    `</g></g></g>` +
    `<g class="mj6-inkoust" opacity="0">${zrcadlo(cx, vnor(pecetSvg(p, { id: "mj6-pi", barva: "#C4432B", textura: true }), x, y, s, s))}</g>` +
    `<g class="mj6-nacrt" mask="url(#mj6-rez-skryj)">${zrcadlo(
      cx,
      `<g transform="translate(${x} ${y}) scale(${f(k)})" fill="none" stroke="#3A2614" stroke-width="${f(1.1 / k)}" stroke-linejoin="round" opacity="0.62"><path d="${obrysPeceti(p.tvar)}"/>${pismenaPeceti(p)}</g>`,
    )}</g>`
  );
}

/** Leštěný medový mastek — mramorování a žilky (otočený = hlava kamene, zrcadlově) */
function plochaKamene(otoceny = false) {
  const { x, y, s } = KAMEN;
  const o = otoceny ? -1 : 1;
  const ox = (dx: number) => f(x + s / 2 + o * (dx - s / 2));
  return (
    `<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="url(#mj6-kamen-plocha)"/>` +
    `<g filter="url(#mj6-oblak)" opacity="0.8">` +
    `<ellipse cx="${ox(46)}" cy="${y + 118}" rx="48" ry="30" fill="#FBF0D6"/>` +
    `<ellipse cx="${ox(132)}" cy="${y + 46}" rx="40" ry="26" fill="#E9B979"/>` +
    `<ellipse cx="${ox(126)}" cy="${y + 140}" rx="30" ry="20" fill="#E9BFA2"/>` +
    `</g>` +
    `<path d="M${ox(-4)} ${y + 74} C${ox(40)} ${y + 62} ${ox(70)} ${y + 98} ${ox(118)} ${y + 84} S${ox(160)} ${y + 104} ${ox(s + 4)} ${y + 96}" stroke="#D39A55" stroke-width="1.3" fill="none" opacity="0.55"/>` +
    `<path d="M${ox(30)} ${y - 4} C${ox(36)} ${y + 30} ${ox(22)} ${y + 50} ${ox(42)} ${y + 82}" stroke="#FFF6E2" stroke-width="1.2" fill="none" opacity="0.8"/>`
  );
}

/** Kámen: stín, bok, čelo (plocha + proměnná část + lesk) a hlava s knoflíkem, když je otočený */
function kamen(p: Pecet) {
  const { x, y, s, bok } = KAMEN;
  const cx = KAMEN_STRED.x;
  const mrak = `M${cx - 44} ${y + 98} C${cx - 64} ${y + 92} ${cx - 60} ${y + 58} ${cx - 34} ${y + 60} C${cx - 30} ${y + 34} ${cx + 6} ${y + 28} ${cx + 18} ${y + 50} C${cx + 46} ${y + 40} ${cx + 66} ${y + 70} ${cx + 48} ${y + 92} C${cx + 64} ${y + 112} ${cx + 40} ${y + 136} ${cx + 14} ${y + 122} C${cx - 4} ${y + 142} ${cx - 44} ${y + 134} ${cx - 44} ${y + 98} Z`;
  const hrany =
    `<rect x="${x + 0.8}" y="${y + 0.8}" width="${s - 1.6}" height="${s - 1.6}" rx="8.5" fill="none" stroke="#FFF8E6" stroke-width="1.6" opacity="0.85"/>` +
    `<path d="M${x + s - 1} ${y + 10} V${y + s - 9} Q${x + s - 1} ${y + s - 1} ${x + s - 9} ${y + s - 1} H${x + 10}" stroke="#A97A3E" stroke-width="1.4" fill="none" opacity="0.8"/>`;
  const hlava =
    `<g clip-path="url(#mj6-celo)">${plochaKamene(true)}</g>` +
    `<path d="${mrak}" fill="#9A6C35" opacity="0.45" transform="translate(4 6)"/>` +
    `<path d="${mrak}" fill="url(#mj6-knofl)" stroke="#B88445" stroke-width="1.2"/>` +
    `<path d="M${cx - 30} ${y + 74} C${cx - 18} ${y + 62} ${cx - 2} ${y + 62} ${cx + 6} ${y + 72} M${cx + 20} ${y + 66} C${cx + 32} ${y + 62} ${cx + 42} ${y + 70} ${cx + 40} ${y + 82} M${cx - 24} ${y + 108} C${cx - 10} ${y + 118} ${cx + 10} ${y + 116} ${cx + 22} ${y + 106}" stroke="#A9783B" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.6"/>` +
    `<path d="M${cx - 30} ${y + 70} C${cx - 22} ${y + 58} ${cx - 6} ${y + 52} ${cx + 4} ${y + 60}" stroke="#FFFFFF" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.75"/>` +
    hrany;
  return (
    `<rect class="mj6-kamen-stin" x="${x}" y="${y}" width="${s}" height="${s + bok}" rx="12" fill="#1E1810" opacity="0.4" filter="url(#mj6-rozmaz)" transform="translate(8 10)"/>` +
    `<g class="mj6-kamen">` +
    `<path d="M${x} ${y + s - 10} H${x + s} V${y + s + bok - 8} Q${x + s} ${y + s + bok} ${x + s - 8} ${y + s + bok} H${x + 8} Q${x} ${y + s + bok} ${x} ${y + s + bok - 8} Z" fill="url(#mj6-kamen-bok)"/>` +
    `<path d="M${x + 2} ${y + s + 14} C${x + 50} ${y + s + 10} ${x + 110} ${y + s + 20} ${x + s - 2} ${y + s + 13} M${x + 2} ${y + s + 27} C${x + 60} ${y + s + 31} ${x + 120} ${y + s + 22} ${x + s - 2} ${y + s + 28}" stroke="#F3D49C" stroke-width="1.2" fill="none" opacity="0.7"/>` +
    `<path d="M${x + 6} ${y + s + 2} H${x + s - 6}" stroke="#9A6A32" stroke-width="2" opacity="0.5"/>` +
    `<g class="mj6-kamen-celo">` +
    `<g clip-path="url(#mj6-celo)">` +
    plochaKamene() +
    `<g class="mj6-celo-pecet">${celoKamene(p)}</g>` +
    `<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="url(#mj6-kamen-lesk)" opacity="0.8"/>` +
    `</g>` +
    hrany +
    `</g>` +
    `<g class="mj6-kamen-hlava" display="none">${hlava}</g>` +
    `</g>`
  );
}

/** Rydlo (印刀): ocelová tyčinka se šikmým ostřím a šňůrou na držení; hrot je v počátku */
function rydlo() {
  const L = RYDLO_DELKA;
  const tvar = `M1 -1 L15 -6 H${L - 3} Q${L} -6 ${L} -3 V3 Q${L} 6 ${L - 3} 6 H7 Z`;
  let snura = "";
  for (let xx = 70; xx < 174; xx += 5.5) snura += `M${f(xx)} -8 l5 16 `;
  return (
    `<g class="mj6-rydlo" transform="translate(${RYDLO_KLID.x} ${RYDLO_KLID.y}) rotate(${RYDLO_KLID.uhel})">` +
    `<path class="mj6-rydlo-stin" d="${tvar}" fill="#1E1810" opacity="0.32" filter="url(#mj6-mekce)" transform="translate(5 9)"/>` +
    `<path d="${tvar}" fill="url(#mj6-ocel)" stroke="#4E555B" stroke-width="0.7"/>` +
    `<path d="M1 -1 L15 -6 L19 6 H7 Z" fill="#F4F7F9" stroke="#7E868D" stroke-width="0.6"/>` +
    `<rect x="72" y="-7.5" width="98" height="15" rx="3" fill="url(#mj6-snura)"/>` +
    `<g clip-path="url(#mj6-snura-orez)"><path d="${snura}" stroke="#6E1F12" stroke-width="1.6" opacity="0.7"/><path d="${snura}" stroke="#F09A7E" stroke-width="0.7" opacity="0.5" transform="translate(1.6 0)"/></g>` +
    `<path d="M24 -3.2 H${L - 8}" stroke="#FFFFFF" stroke-width="1.1" opacity="0.55"/>` +
    `</g>`
  );
}

/** Porcelánová dóza s rumělkou (朱肉) a její víčko */
function doza() {
  const { x, y, r } = DOZA;
  const vx = x + 118;
  const vy = y + 34;
  let kvet = "";
  for (let i = 0; i < 6; i++) {
    const u = (i * Math.PI) / 3;
    kvet += `<ellipse cx="${f(vx + Math.cos(u) * 21)}" cy="${f(vy + Math.sin(u) * 21)}" rx="8.5" ry="5" transform="rotate(${f((u * 180) / Math.PI)} ${f(vx + Math.cos(u) * 21)} ${f(vy + Math.sin(u) * 21)})" fill="none" stroke="#3D5A9A" stroke-width="1.6"/>`;
  }
  return (
    `<g filter="url(#mj6-stin-vec)"><circle cx="${vx}" cy="${vy}" r="50" fill="url(#mj6-porcelan)"/></g>` +
    `<circle cx="${vx}" cy="${vy}" r="44" fill="none" stroke="#3D5A9A" stroke-width="2"/>` +
    `<circle cx="${vx}" cy="${vy}" r="40" fill="none" stroke="#3D5A9A" stroke-width="0.8"/>` +
    kvet +
    `<circle cx="${vx}" cy="${vy}" r="7" fill="#3D5A9A"/>` +
    `<path d="M${vx - 34} ${vy - 22} A40 40 0 0 1 ${vx - 8} ${vy - 38}" stroke="#FFFFFF" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.8"/>` +
    `<g filter="url(#mj6-stin-vec)"><circle cx="${x}" cy="${y}" r="${r}" fill="url(#mj6-porcelan)"/></g>` +
    `<circle cx="${x}" cy="${y}" r="${r - 5}" fill="none" stroke="#3D5A9A" stroke-width="2.2"/>` +
    `<circle cx="${x}" cy="${y}" r="${r - 9}" fill="#B9C2CC"/>` +
    `<circle cx="${x}" cy="${y + 1}" r="${r - 11}" fill="url(#mj6-pasta)"/>` +
    `<g fill="none" stroke="#F28A6C" stroke-width="1.4" opacity="0.45" stroke-linecap="round">` +
    `<path d="M${x - 30} ${y - 6} C${x - 18} ${y - 22} ${x + 8} ${y - 26} ${x + 22} ${y - 14}"/>` +
    `<path d="M${x - 24} ${y + 14} C${x - 10} ${y + 2} ${x + 14} ${y + 2} ${x + 30} ${y + 12}"/>` +
    `<path d="M${x - 12} ${y + 30} C${x} ${y + 22} ${x + 14} ${y + 24} ${x + 22} ${y + 30}"/>` +
    `</g>` +
    /* Kde kámen ťukl do pasty, zůstane čtverečný důlek */
    `<rect class="mj6-pasta-dulek" x="${x - 26}" y="${y - 25}" width="52" height="52" rx="5" fill="#7A1C10" opacity="0"/>` +
    `<ellipse cx="${x - 16}" cy="${y - 20}" rx="16" ry="8" fill="#FFFFFF" opacity="0.28" transform="rotate(-30 ${x - 16} ${y - 20})"/>` +
    `<path d="M${x - 44} ${y - 30} A${r - 2} ${r - 2} 0 0 1 ${x - 10} ${y - r + 3}" stroke="#FFFFFF" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.9"/>`
  );
}

/** Návrh pečeti na lístku — správně, ne zrcadlově (živý náhled) */
export function navrh(p: Pecet) {
  return vnor(pecetSvg(p, { id: "mj6-pn", barva: "#C4432B", textura: false }), 408, 64, 82, 82);
}
function listekNavrhu(p: Pecet) {
  return (
    `<g transform="rotate(6 449 128)">` +
    `<g filter="url(#mj6-stin-papir)"><rect x="396" y="54" width="106" height="140" rx="2" fill="url(#mj6-papir)"/></g>` +
    `<rect x="403" y="59" width="92" height="92" fill="none" stroke="#D9CDB6" stroke-width="1"/>` +
    `<g class="mj6-navrh">${navrh(p)}</g>` +
    `<text x="449" y="181" text-anchor="middle" font-family="Caveat, cursive" font-size="23" fill="#6B5D4F">návrh</text>` +
    `</g>`
  );
}

/** Poznámka křídou na plsti: proč je pečeť na kameni obráceně */
function poznamka() {
  return (
    `<g transform="rotate(-7 430 286)" fill="#E9E2D2" font-family="Caveat, cursive" text-anchor="middle" opacity="0.88">` +
    `<text x="430" y="262" font-size="22">na kameni</text>` +
    `<text x="430" y="285" font-size="22">zrcadlově</text>` +
    `</g>` +
    `<path d="M404 298 C392 312 374 314 358 306" stroke="#E9E2D2" stroke-width="1.6" fill="none" stroke-linecap="round" opacity="0.8"/>` +
    `<path d="M364 300 L357 306 L366 310" stroke="#E9E2D2" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/>`
  );
}

/** Otisk na listu (správně, s nerovným inkoustem) */
export function otisk(p: Pecet) {
  const s = OTISK.s;
  return vnor(pecetSvg(p, { id: "mj6-po", barva: "#C4432B", textura: true }), OTISK.x - s / 2, OTISK.y - s / 2, s, s);
}

/** Podpis na listu — velikost písma podle délky jména */
export function podpis(jmeno: string) {
  const t = jmeno.trim();
  const vel = Math.max(14, Math.min(32, 200 / (0.4 * Math.max(1, [...t].length))));
  return { text: t, velikost: Math.round(vel) };
}

/** List papíru: znak 名 štětcem, podpis a rámeček na pečeť */
function list(jmeno: string) {
  const pod = podpis(jmeno);
  const { x, y, s } = OTISK;
  return (
    `<g class="mj6-list" transform="rotate(${OTISK.uhel} 650 280)">` +
    `<g filter="url(#mj6-stin-papir)"><path d="M526 30 L774 26 L777 532 L529 536 Z" fill="url(#mj6-papir)"/></g>` +
    `<text x="652" y="226" text-anchor="middle" font-family="${PISMO_ZNAKY}" font-size="168" fill="#2B2420" opacity="0.93">名</text>` +
    `<text class="mj6-podpis" x="652" y="${y - s / 2 - 24}" text-anchor="middle" font-family="Caveat, cursive" font-size="${pod.velikost}" fill="#3A2E28">${esc(pod.text)}</text>` +
    `<rect class="mj6-ramecek" x="${x - s / 2}" y="${y - s / 2}" width="${s}" height="${s}" rx="3" fill="none" stroke="#B9A98F" stroke-width="1.3" stroke-dasharray="6 5"/>` +
    `<g class="mj6-otisk" opacity="0">${otisk(vychoziPecet(""))}</g>` +
    `<text class="mj6-ramecek-popis" x="${x}" y="${y + s / 2 + 30}" text-anchor="middle" font-family="Caveat, cursive" font-size="23" fill="#9A8B78">sem pečeť</text>` +
    `</g>`
  );
}

function stul(p: Pecet, jmeno: string) {
  return (
    `<g class="mj6-stul">` +
    deska() +
    sverak() +
    poznamka() +
    doza() +
    listekNavrhu(p) +
    list(jmeno) +
    kamen(p) +
    `<g class="mj6-trisky"></g>` +
    rydlo() +
    `<rect width="800" height="560" fill="url(#mj6-svetlo)" pointer-events="none"/>` +
    `<rect width="800" height="560" fill="url(#mj6-vineta)" pointer-events="none"/>` +
    `</g>`
  );
}

/** Tříska kamene od rydla — kousek kolem počátku */
export function trisk(rnd: () => number) {
  const body: string[] = [];
  const n = 4 + Math.floor(rnd() * 2);
  for (let i = 0; i < n; i++) {
    const u = (i / n) * Math.PI * 2 + rnd() * 0.6;
    const r = 1.8 + rnd() * 2.4;
    body.push(`${f(Math.cos(u) * r)} ${f(Math.sin(u) * r)}`);
  }
  return `<path d="M${body.join(" L")} Z" fill="${rnd() < 0.5 ? "#F8E6BE" : "#E3BC7C"}" stroke="#A97C42" stroke-width="0.5"/>`;
}

/**
 * Dráha rydla po čele kamene (už zrcadlově, ve scéně) a šířka stopy.
 * 白文: ryjí se znaky — řádky přes každé písmeno. 朱文: ryje se všechno
 * kolem znaků — řádky přes celé čelo. U kruhu a tykve se navíc obrobí rohy.
 */
export function drahaRyti(p: Pecet): { body: [number, number][]; sirka: number } {
  const { x, y, s } = KAMEN;
  const k = s / 100;
  const ven = (sx: number, sy: number): [number, number] => [x + (100 - sx) * k, y + sy * k];
  const body: [number, number][] = [];
  const rnd = nahoda(7 + [...p.znaky].reduce((a, c) => a + c.charCodeAt(0), 0));
  let sirka: number;
  if (p.styl === "shubun") {
    const radky = 7;
    const krok = 88 / radky;
    sirka = krok * 1.45 * k;
    for (let i = 0; i < radky; i++) {
      const yy = 6 + krok * (i + 0.5);
      const tam = i % 2 === 0;
      body.push(ven(tam ? 4 : 96, yy + (rnd() - 0.5) * 2), ven(tam ? 96 : 4, yy + (rnd() - 0.5) * 2));
    }
  } else {
    sirka = 0;
    if (p.tvar !== "ctverec") {
      for (const [sx, sy] of [[8, 8], [92, 8], [92, 92], [8, 92], [8, 8]] as const) body.push(ven(sx, sy));
    }
    for (const z of rozlozeni(p)) {
      const stred = z.y - z.velikost * (z.japonsky ? 0.36 : 0.35);
      const pw = z.velikost * (z.japonsky ? 0.5 : 0.46);
      const ph = z.velikost * (z.japonsky ? 0.5 : 0.4);
      const radky = 4;
      const krok = (2 * ph) / radky;
      sirka = Math.max(sirka, krok * 1.55 * k);
      for (let i = 0; i < radky; i++) {
        const yy = stred - ph + krok * (i + 0.5);
        const tam = i % 2 === 0;
        body.push(ven(z.x + (tam ? -pw : pw), yy + (rnd() - 0.5) * 1.5), ven(z.x + (tam ? pw : -pw), yy + (rnd() - 0.5) * 1.5));
      }
    }
    if (p.tvar !== "ctverec") sirka = Math.max(sirka, 20 * k);
  }
  return { body, sirka };
}

/* ═════════════════════════ Police ═════════════════════════ */

/** Obrys těla misky: od patky (y −10) po okraj (y −66), počátek je střed patky na polici */
const TELO = "M-22.5 -10 C-38 -11 -49.5 -28 -50 -66 L50 -66 C49.5 -28 38 -11 22.5 -10 Z";
const PATKA = "M-21 0 L-22.5 -10 L22.5 -10 L21 0 A21 3.6 0 0 1 -21 0 Z";

function defsPolice() {
  return [
    `<linearGradient id="mj6-zed" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EEE1C8"/><stop offset="1" stop-color="#D6C09C"/></linearGradient>`,
    `<linearGradient id="mj6-tram" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9A7049"/><stop offset="0.7" stop-color="#7A5535"/><stop offset="1" stop-color="#5E4026"/></linearGradient>`,
    `<linearGradient id="mj6-sloup" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6E4D31"/><stop offset="0.5" stop-color="#94693F"/><stop offset="1" stop-color="#6A4A2E"/></linearGradient>`,
    `<linearGradient id="mj6-deska" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A27146"/><stop offset="1" stop-color="#C79A6A"/></linearGradient>`,
    `<linearGradient id="mj6-hrana" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8E6441"/><stop offset="1" stop-color="#6B4A2D"/></linearGradient>`,
    `<linearGradient id="mj6-podpolici" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3A2614" stop-opacity="0.34"/><stop offset="1" stop-color="#3A2614" stop-opacity="0"/></linearGradient>`,
    `<radialGradient id="mj6-zare-zed" cx="0.3" cy="0.4" r="0.6"><stop offset="0" stop-color="#FFF6DE" stop-opacity="0.55"/><stop offset="1" stop-color="#FFF6DE" stop-opacity="0"/></radialGradient>`,
    `<filter id="mj6-zare" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="8"/></filter>`,
    /* Miska: celadon s leskem, hlína patky, tůňka glazury dole */
    `<linearGradient id="mj6-gl-bok" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3C6F60"/><stop offset="0.16" stop-color="#6FA592"/><stop offset="0.33" stop-color="#BFE2D1"/><stop offset="0.47" stop-color="#93C4AF"/><stop offset="0.78" stop-color="#5E9481"/><stop offset="1" stop-color="#2F5B4F"/></linearGradient>`,
    `<linearGradient id="mj6-gl-tune" x1="0" y1="0" x2="0" y2="1"><stop offset="0.45" stop-color="#244B40" stop-opacity="0"/><stop offset="1" stop-color="#244B40" stop-opacity="0.55"/></linearGradient>`,
    `<radialGradient id="mj6-gl-uvnitr" cx="0.5" cy="0.85" r="0.75"><stop offset="0" stop-color="#B5DACA"/><stop offset="0.55" stop-color="#78AC98"/><stop offset="1" stop-color="#3F7363"/></radialGradient>`,
    `<linearGradient id="mj6-hlina" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9C7650"/><stop offset="0.35" stop-color="#E7CBA2"/><stop offset="0.6" stop-color="#CFAE82"/><stop offset="1" stop-color="#8E6A45"/></linearGradient>`,
    `<radialGradient id="mj6-stin-misky" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#2B1A0E" stop-opacity="0.45"/><stop offset="1" stop-color="#2B1A0E" stop-opacity="0"/></radialGradient>`,
    `<radialGradient id="mj6-dno-gl" cx="0.42" cy="0.36" r="0.66"><stop offset="0" stop-color="#C8E6D8"/><stop offset="0.5" stop-color="#7DB39F"/><stop offset="1" stop-color="#2F5B4F"/></radialGradient>`,
    `<radialGradient id="mj6-dno-hlina" cx="0.45" cy="0.4" r="0.6"><stop offset="0" stop-color="#E9D1AA"/><stop offset="1" stop-color="#BE9A6E"/></radialGradient>`,
    `<radialGradient id="mj6-dno-jamka" cx="0.6" cy="0.66" r="0.62"><stop offset="0" stop-color="#E6CCA3"/><stop offset="0.75" stop-color="#D2B286"/><stop offset="1" stop-color="#AE8C60"/></radialGradient>`,
    `<clipPath id="mj6-telo-orez"><path d="${TELO}"/></clipPath>`,
    `<linearGradient id="mj6-jiskra" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF6D0"/><stop offset="1" stop-color="#F3C24A"/></linearGradient>`,
  ].join("");
}

/** Miska z boku — celadon, holá patka, lesk */
function bokMisky() {
  return (
    `<path d="${PATKA}" fill="url(#mj6-hlina)"/>` +
    `<path d="${TELO}" fill="url(#mj6-gl-bok)"/>` +
    `<g clip-path="url(#mj6-telo-orez)">` +
    `<rect x="-52" y="-66" width="104" height="58" fill="url(#mj6-gl-tune)"/>` +
    /* Glazura končí nad patkou zvlněnou hranou */
    `<path d="M-40 -14 Q-30 -17.5 -20 -14.5 T0 -15 T20 -14.2 T40 -15 V0 H-40 Z" fill="url(#mj6-hlina)"/>` +
    `<path d="M-40 -14 Q-30 -17.5 -20 -14.5 T0 -15 T20 -14.2 T40 -15" stroke="#2C584B" stroke-width="2.6" fill="none" opacity="0.85"/>` +
    `<path d="M-40 -16.8 Q-30 -20 -20 -17 T0 -17.6 T20 -16.8 T40 -17.6" stroke="#D8F0E5" stroke-width="1" fill="none" opacity="0.4"/>` +
    `</g>` +
    /* Lesk: měkký odraz okna, ostrá jiskra, tečka a odlesk na okraji */
    `<path d="M-38 -56 C-42 -42 -38 -28 -28 -20" stroke="#FFFFFF" stroke-width="7" fill="none" stroke-linecap="round" opacity="0.32" filter="url(#mj6-mekce)"/>` +
    `<path d="M-39.5 -52 C-41.5 -45 -40 -38 -36.5 -33" stroke="#FFFFFF" stroke-width="2.4" fill="none" stroke-linecap="round" opacity="0.92"/>` +
    `<path d="M33 -48 C35 -42 34 -36 31 -31" stroke="#FFFFFF" stroke-width="1.6" fill="none" stroke-linecap="round" opacity="0.38"/>` +
    `<circle cx="-30" cy="-27" r="1.6" fill="#FFFFFF" opacity="0.8"/>` +
    /* Okraj a vnitřek */
    `<ellipse cx="0" cy="-66" rx="50" ry="9.5" fill="#C9E6D9"/>` +
    `<ellipse cx="0" cy="-65.4" rx="47" ry="8" fill="url(#mj6-gl-uvnitr)"/>` +
    `<path d="M10 -72.4 Q26 -72.6 38 -69.4" stroke="#FFFFFF" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.6"/>` +
    `<path d="M-44 -61.6 Q-24 -56.4 -4 -56.6" stroke="#FFFFFF" stroke-width="1.8" fill="none" stroke-linecap="round" opacity="0.85"/>` +
    /* Ztmavení, když miska jede za ostatními */
    `<g class="mj6-zastin" opacity="0"><path d="${TELO}" fill="#2B2420"/><ellipse cx="0" cy="-66" rx="50" ry="9.5" fill="#2B2420"/><path d="${PATKA}" fill="#2B2420"/></g>`
  );
}

/** Rytá čára: hloubka + světlá hrana pod ní */
const ryti = (d: string, sila = 2.6) =>
  `<path d="${d}" stroke="#F6E6C6" stroke-width="${f(sila * 0.55)}" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.9" transform="translate(0.8 1)"/>` +
  `<path d="${d}" stroke="#6B4A2B" stroke-width="${f(sila)}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;

/** Kdo může mít misku na polici (Cedulka je ta, co si to pamatuje) */
export type Majitel = Exclude<PostavaId, "cedulka">;
export const MAJITELE: Majitel[] = ["pecinka", "kapka", "stripek", "kachlik", "vazicka", "bublinka", "hlinka", "samotka"];

/** Čí je miska — „Tahle je Pecinky.“ */
export const KOHO: Record<Majitel, string> = {
  pecinka: "Pecinky",
  kapka: "Kapky",
  stripek: "Střípka",
  kachlik: "Kachlíka",
  vazicka: "Vázičky",
  bublinka: "Bublinky",
  hlinka: "Hlínky",
  samotka: "Šamotky",
};

/** Znamení party vyrytá do patky — v krabičce 40 × 40 kolem počátku */
export const ZNACKY: Record<Majitel, string> = {
  pecinka: ryti("M0 -15 C6 -7 12 -2 10 6 C8 13 -8 13 -10 6 C-12 -1 -5 -5 0 -15 Z") + ryti("M0 -1 C3 3 4.6 6 2.6 9 C0.6 11 -3 9.6 -3 6.4 C-3 3.4 -1 1.6 0 -1 Z", 2),
  kapka: ryti("M0 -15 C5 -7 11 -1 11 5 C11 11 6 14.5 0 14.5 C-6 14.5 -11 11 -11 5 C-11 -1 -5 -7 0 -15 Z") + ryti("M-5.5 4 C-5.5 8 -3 10 0 10.5", 2),
  stripek: ryti("M-14 -13 L-4 -5 L-9 0 L3 5 L-2 9 L9 15", 2.8),
  kachlik: ryti("M-13 -13 H13 V13 H-13 Z", 2.2) + ryti("M-7 -7 H7 M0 -7 V8 M0 0.5 H6 M-5 2 V8 M-9 8 H9", 2.1),
  vazicka: (() => {
    let d = "";
    for (let i = 0; i < 5; i++) {
      const u = (i * 72 * Math.PI) / 180;
      const bod = (r: number, du: number): string => `${f(Math.sin(u + du) * r)} ${f(-Math.cos(u + du) * r)}`;
      d += `M${bod(3, 0)} C${bod(9, -0.62)} ${bod(15, -0.32)} ${bod(14.5, -0.1)} L${bod(12.5, 0)} L${bod(14.5, 0.1)} C${bod(15, 0.32)} ${bod(9, 0.62)} ${bod(3, 0)} Z `;
    }
    return ryti(d, 1.9) + `<circle r="2.2" fill="#6B4A2B"/>`;
  })(),
  bublinka: ryti("M0 -11 A11 11 0 1 1 -0.01 -11 Z") + ryti("M-6 -3 A6.5 6.5 0 0 1 -2 -7", 1.8) + ryti("M11 -14 A3.6 3.6 0 1 1 10.99 -14 Z", 1.8),
  hlinka: ryti("M0 13 C0 7 0 2 0 -3 M0 -1 C-4 -1 -11 -4 -11 -11 C-4 -11 -1 -7 0 -1 M0 -5 C3 -6 10 -8 11 -14 C5 -15 1 -11 0 -5 M-9 13 H9", 2.4),
  samotka: ryti("M-14 -9 H14 M-14 0 H14 M-14 9 H14 M-9 -9 V9 M9 -9 V9", 2.4),
};

/** Miska zespodu (otočená dnem k divákovi): celadon, holý pás, patka a v ní značka */
export function dnoMisky(znacka: string) {
  return (
    `<g transform="translate(0 ${MISKA_STRED})">` +
    `<circle r="52" fill="url(#mj6-dno-gl)"/>` +
    `<circle r="51" fill="none" stroke="#25493F" stroke-width="2.2" opacity="0.55"/>` +
    `<path d="M-40 -24 A47 47 0 0 1 -6 -46" stroke="#FFFFFF" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.55"/>` +
    `<circle r="37" fill="url(#mj6-dno-hlina)"/>` +
    `<circle r="37.5" fill="none" stroke="#2C584B" stroke-width="3.2"/>` +
    `<circle r="39.6" fill="none" stroke="#D8F0E5" stroke-width="1" opacity="0.45"/>` +
    `<circle r="31" fill="#EBD6B1" stroke="#B48F63" stroke-width="1"/>` +
    `<circle r="25.5" fill="url(#mj6-dno-jamka)"/>` +
    `<path d="M-22 -10 A24 24 0 0 1 10 -22.6" stroke="#8E6D45" stroke-width="2.8" fill="none" opacity="0.4" stroke-linecap="round"/>` +
    `<g class="mj6-znacka" transform="scale(1.14)">${znacka}</g>` +
    `</g>`
  );
}

/** Pečeť hráče do patky — malá, rumělkou */
export function pecetDoDna(p: Pecet) {
  return `<g transform="rotate(-6)">${vnor(pecetSvg(p, { id: "mj6-pd", barva: "#C4432B", textura: false }), -16, -16, 32, 32)}</g>`;
}

/** Celá miska: stín na polici a otočitelné tělo (bok / dno) */
export function miskaSvg(znacka: string) {
  return (
    `<g class="mj6-miska-obal">` +
    `<ellipse class="mj6-miska-stin" cx="0" cy="0" rx="50" ry="8" fill="url(#mj6-stin-misky)"/>` +
    `<g class="mj6-miska">` +
    `<g class="mj6-otoc">` +
    `<g class="mj6-bok">${bokMisky()}</g>` +
    `<g class="mj6-dno" display="none">${dnoMisky(znacka)}</g>` +
    `</g></g></g>`
  );
}

/** Jiskřička u správné misky — čtyřcípá hvězdička kolem počátku */
export const jiskra = () => `<path d="M0 -9 C1 -2 2 -1 9 0 C2 1 1 2 0 9 C-1 2 -2 1 -9 0 C-2 -1 -1 -2 0 -9 Z" fill="url(#mj6-jiskra)" stroke="#C99A2E" stroke-width="0.6"/>`;

/** Jména party v 1. pádě — cedulka u zvednuté misky */
export const JMENA = Object.fromEntries(parta.map((x) => [x.id, x.name])) as Record<PostavaId, string>;

/** Popisek u zvednuté misky („Pecinka“, „tvoje!“) */
export function popisek(x: number, y: number, text: string, kotva: "start" | "middle" | "end", barva = "#2B2420") {
  return `<text x="${f(x)}" y="${f(y)}" text-anchor="${kotva}" font-family="Caveat, cursive" font-size="40" font-weight="600" fill="${barva}" stroke="#FBF6EA" stroke-width="7" stroke-linejoin="round" paint-order="stroke">${esc(text)}</text>`;
}

/** Svitek (kakejiku) vpravo na zdi: ensō štětcem a malá pečeť malíře */
function svitek() {
  const x = 684;
  return (
    `<path d="M${x} 30 L${x - 22} 52 M${x} 30 L${x + 22} 52" stroke="#6B4A2D" stroke-width="1.4" fill="none"/>` +
    `<circle cx="${x}" cy="29" r="3" fill="#8A6A48"/>` +
    `<g filter="url(#mj6-stin-papir)"><rect x="${x - 44}" y="52" width="88" height="262" fill="#7A5A3A"/></g>` +
    `<rect x="${x - 36}" y="66" width="72" height="228" fill="#F6EDDA"/>` +
    `<rect x="${x - 50}" y="48" width="100" height="7" rx="3.5" fill="#5E4026"/>` +
    `<rect x="${x - 52}" y="310" width="104" height="9" rx="4.5" fill="#5E4026"/>` +
    `<circle cx="${x - 52}" cy="314.5" r="5.5" fill="#3E2A18"/><circle cx="${x + 52}" cy="314.5" r="5.5" fill="#3E2A18"/>` +
    /* ensō: jeden tah, nahoře nedotažený, na konci suchý štětec */
    `<path d="M${x + 6} 128 C${x + 34} 132 ${x + 36} 176 ${x + 14} 192 C${x - 6} 206 ${x - 34} 196 ${x - 30} 168 C${x - 27} 146 ${x - 12} 132 ${x - 4} 130" stroke="#2B2420" stroke-width="7.5" fill="none" stroke-linecap="round" opacity="0.88"/>` +
    `<path d="M${x - 4} 130 C${x} 129 ${x + 3} 128.4 ${x + 6} 128" stroke="#2B2420" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.6"/>` +
    `<rect x="${x + 14}" y="250" width="11" height="11" rx="1" fill="#C4432B" opacity="0.9"/>` +
    `<path d="M${x + 16.5} 253 h6 M${x + 16.5} 256 h6 M${x + 19.5} 253 v6" stroke="#F6EDDA" stroke-width="1.1"/>`
  );
}

/** Zeď s trámem, sloupky, světlo z okna a dlouhá police */
function police() {
  /* Světlo okna (šódži) šikmo na zdi */
  let tabulky = "";
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 3; c++) tabulky += `<rect x="${112 + c * 76}" y="${68 + r * 116}" width="68" height="108" rx="3"/>`;
  }
  /* Dole další police s miskami — dvacet misek se do jednoho záběru nevejde */
  let dole = "";
  for (let i = 0; i < 8; i++) {
    const x = 76 + i * 92 + (i % 2) * 8;
    dole +=
      `<path d="M${x - 36} 538 C${x - 35} 560 ${x + 35} 560 ${x + 36} 538 Z" fill="#4F7A6C"/>` +
      `<ellipse cx="${x}" cy="538" rx="36" ry="6.5" fill="#9CC2B2"/>` +
      `<ellipse cx="${x}" cy="538.6" rx="33" ry="5" fill="#557F71"/>`;
  }
  return (
    `<rect width="800" height="560" fill="url(#mj6-zed)"/>` +
    `<rect width="800" height="560" fill="url(#mj6-zare-zed)"/>` +
    `<g transform="matrix(1 0 -0.32 1 64 0)" fill="#FFF8E6" opacity="0.7" filter="url(#mj6-zare)">${tabulky}</g>` +
    svitek() +
    /* Spodní police s miskami */
    `<g opacity="0.75">${dole}</g>` +
    `<rect x="0" y="506" width="800" height="54" fill="#3A2614" opacity="0.18"/>` +
    /* Sloupky a trám */
    `<rect x="0" y="0" width="26" height="560" fill="url(#mj6-sloup)"/>` +
    `<rect x="774" y="0" width="26" height="560" fill="url(#mj6-sloup)"/>` +
    `<rect x="0" y="${TRAM_Y}" width="800" height="14" fill="url(#mj6-podpolici)"/>` +
    `<rect x="0" y="0" width="800" height="${TRAM_Y}" fill="url(#mj6-tram)"/>` +
    `<path d="M0 3 H800" stroke="#C49A6C" stroke-width="1.4" opacity="0.6"/>` +
    `<path class="mj6-provaz" d="M400 ${TRAM_Y - 4} V${TRAM_Y + 20}" stroke="#B84A2B" stroke-width="2.6" stroke-linecap="round" fill="none" opacity="0"/>` +
    `<circle class="mj6-krouzek" cx="400" cy="${TRAM_Y - 5}" r="6" fill="none" stroke="#C9A24A" stroke-width="2.6" opacity="0"/>` +
    /* Hlavní police */
    `<rect x="0" y="506" width="800" height="30" fill="url(#mj6-podpolici)"/>` +
    `<path d="M150 506 V548 L196 506 Z M650 506 V548 L604 506 Z" fill="#7A5535"/>` +
    `<path d="M150 506 V548" stroke="#5E4026" stroke-width="3"/><path d="M650 506 V548" stroke="#5E4026" stroke-width="3"/>` +
    `<path d="M10 440 H790 L800 482 H0 Z" fill="url(#mj6-deska)"/>` +
    `<path d="M40 452 C260 448 520 456 760 450 M20 470 C300 466 540 474 780 468" stroke="#8E6441" stroke-width="1" fill="none" opacity="0.35"/>` +
    `<rect x="0" y="482" width="800" height="24" fill="url(#mj6-hrana)"/>` +
    `<path d="M0 482.8 H800" stroke="#E2B987" stroke-width="1.6" opacity="0.8"/>` +
    `<g class="mj6-misky"></g>` +
    `<g class="mj6-popisky"></g>` +
    `<g class="mj6-jiskry"></g>`
  );
}

/* ═════════════════════════ Celé okno ═════════════════════════ */

/** Hlavní SVG scény: kamera s policí nahoře a stolem dole */
export function kresba(p: Pecet = vychoziPecet(""), jmeno = "") {
  return (
    `<svg class="mu-kresba" viewBox="0 0 ${VIEW_W} ${VIEW_H}" aria-hidden="true" focusable="false">` +
    `<defs>${defsStul()}${defsPolice()}</defs>` +
    `<g class="mj6-kamera">` +
    `<g class="mj6-police" transform="translate(0 -${VIEW_H})">${police()}</g>` +
    stul(p, jmeno) +
    `</g>` +
    `</svg>`
  );
}

/** Co se na Cedulku vejde: první slovo jména a velikost písma podle délky */
export function naCedulku(jmeno: string) {
  const prvni = jmeno.trim().split(/\s+/)[0] ?? "";
  const text = [...prvni].slice(0, 12).join("");
  const n = [...text].length;
  return { text, velikost: n > 9 ? 13 : n > 6 ? 16 : 20 };
}

/** Jméno na Cedulce — vlastní vrstva přes její kresbu (viewBox 180 jako postavička) */
export function napisCedulky(jmeno: string) {
  const c = naCedulku(jmeno);
  return (
    `<svg class="mj6-cedulka-napis" viewBox="0 0 180 180" aria-hidden="true" focusable="false">` +
    `<text x="90" y="127" text-anchor="middle" font-family="Caveat, cursive" font-size="${c.velikost}" font-weight="600" fill="#3A2E28">${esc(c.text)}</text>` +
    `</svg>`
  );
}

/** HTML nad kresbou: tlačítka na misky (skript je staví podle kola) */
export function prekryvy() {
  return `<div class="mj6-mista" role="group" tabindex="-1" aria-label="Misky na polici. Šipkami vyber misku, Enterem ji zvedni."></div>`;
}

/** Ovládání pod oknem: formulář pečeti, pak počítadlo kol */
export function ovladani() {
  const zeton = (i: number) => `<li class="mj6-zeton" data-stav="ceka"><span class="mj6-zeton-cislo">${i}</span><span class="mj6-zeton-kresba"></span></li>`;
  return (
    `<div class="mu-ovladani mj6-ovladani">` +
    `<form class="mj6-formular" autocomplete="off" novalidate>` +
    `<fieldset class="mj6-sada">` +
    `<legend class="mj6-sr">Pečeť</legend>` +
    `<div class="mj6-radek">` +
    `<label class="mj6-pole mj6-pole-jmeno"><span>Jméno</span><input class="mj6-jmeno" name="jmeno" type="text" maxlength="40" spellcheck="false" autocomplete="off" placeholder="Jak se podepíšeš"></label>` +
    `<label class="mj6-pole mj6-pole-znaky"><span>Na pečeť</span><input class="mj6-znaky" name="znaky" type="text" maxlength="4" spellcheck="false" autocomplete="off" placeholder="陶" aria-describedby="mj6-znaky-rada"></label>` +
    `</div>` +
    `<p class="mj6-sr" id="mj6-znaky-rada">Jeden nebo dva znaky — iniciály, nebo cokoli.</p>` +
    `<div class="mj6-radek">` +
    `<div class="d-prepinac mj6-tvary" role="group" aria-label="Tvar pečeti">` +
    `<button type="button" data-tvar="ctverec" aria-pressed="true">Čtverec</button>` +
    `<button type="button" data-tvar="kruh" aria-pressed="false">Kruh</button>` +
    `<button type="button" data-tvar="tykev" aria-pressed="false">Tykev</button>` +
    `</div>` +
    `<div class="d-prepinac mj6-styly" role="group" aria-label="Písmo na pečeti">` +
    `<button type="button" data-styl="shubun" aria-pressed="false" aria-label="朱文 shubun — červené znaky"><span lang="ja">朱文</span> shubun</button>` +
    `<button type="button" data-styl="hakubun" aria-pressed="true" aria-label="白文 hakubun — bílé znaky"><span lang="ja">白文</span> hakubun</button>` +
    `</div>` +
    `</div>` +
    `<div class="mj6-radek mj6-akce">` +
    `<button type="submit" class="tlacitko tlacitko-maly mj6-vyryt">Vyrýt</button>` +
    `<button type="button" class="tlacitko tlacitko-maly tlacitko-obrys mj6-ponechat" hidden>Ponechat pečeť</button>` +
    `</div>` +
    `</fieldset>` +
    `</form>` +
    `<div class="mj6-kola" hidden>` +
    `<ol class="mj6-zetony" aria-label="Kola">${zeton(1)}${zeton(2)}${zeton(3)}</ol>` +
    `<p class="mj6-stav" aria-live="polite"></p>` +
    `</div>` +
    `</div>`
  );
}

/**
 * Celá scéna jako jeden text — pro testy a náhledy. Jmeno.astro skládá
 * totéž, jen místo `cedulka` vkládá skutečnou postavičku.
 */
export function scena(cedulka = `<svg viewBox="0 0 180 180" aria-hidden="true"></svg>`) {
  return (
    `<div class="mu-okno">` +
    kresba() +
    `<div class="mj6-cedulka">${cedulka}${napisCedulky("")}</div>` +
    prekryvy() +
    `</div>` +
    ovladani()
  );
}
