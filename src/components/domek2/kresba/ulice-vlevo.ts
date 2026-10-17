/**
 * Ulice vlevo od domu — podle fotek z chodníku u branky (17. 10. 2026).
 *
 * Zprava doleva, jak jde člověk po chodníku od posuvné brány: zídka
 * s dřevěným plotem až k brance, u ní zvonek s kamerou a červená tabulka
 * 235. Branka je pozinkový rám s modřínovými plaňkami (panty vlevo,
 * klika se zámkem vpravo), za ní kus zídky se dvěma novějšími dílci plotu
 * a bílou schránkou s nálepkou proti letákům. Tady náš pozemek končí:
 * na hranici stojí bílý omítnutý pilíř se dvěma rezavě červenými dvířky
 * (elektroměr a plynoměr), popraskaný a dole od deště ostříkaný. Na něm
 * sousedovo pole z tmavých lamel v pozinkovém rámu mezi cihlovými pilíři
 * s betonovými stříškami, dál doleva sousedova zeď z bílých cihel a před
 * ní na chodníku plechová rozpojovací skříň. Za zdí tmavé dřevěné čelo
 * plochého přístřešku, nad ním hnědá střecha sousedova domu a třešeň.
 * Na hranici za pilířem hlohyně plná oranžových bobulí, za ní listnáč;
 * u domu bambus.
 *
 * Souřadnice jsou kresby ulice (pixely fotky 6670). Míry z fotek jsou
 * přepočtené přes výšku zídky — 221 bodů od chodníku po vršek stříšky.
 * Odhad: zeď dál doleva za okrajem fotky (pilíře po 2,5 m), sousedův dům
 * (z fotky je vidět jen střecha), druh stromů a délka zídky k bráně —
 * ta je delší než posuvná brána, ať má brána kam zajet.
 */
import { B, f, chomac, nahoda, mnohouhelnik, obdelnik, obdelniky, tecky, kruh, elipsa } from "./zaklad";
import type { Bod } from "./zaklad";

const ZEM = 1062;

/** Listí, keře a větve stačí v celých bodech — cesty jsou o třetinu kratší a kresba stejná */
const cele = (d: string) => d.replace(/-?\d+\.\d+/g, (n) => String(Math.round(+n)));

export const VLEVO = {
  /** Kam až doleva kresba sahá — na širokých obrazovkách je vidět i za levým okrajem výřezu */
  konec: -2000,
  /** Pilíř s elektroměrem a plynoměrem na hranici pozemku */
  pilir: { x0: -1030, x1: -722, vrch: 851 },
  /** Naše zídka se schránkou */
  zidka: { x0: -722, x1: -443 },
  /** Branka; od jejího pravého ostění vede k bráně zídka se zvonkem */
  branka: { x0: -443, x1: -307, vrch: 779 },
  /** Vršek sousedovy cihlové zdi */
  cihly: 786,
};

/* ——— Dřevěný plot na zídce (i vpravo u brány) ——— */

interface Drevo { spara: string; prkna: [string, string, string]; hrana: string; letokruhy: string; sloupek: string; sloupekSvetlo: string }
/** Zvětralé šedohnědé dílce (u brány, fotka 6670) */
export const DREVO_STARE: Drevo = { spara: B.plotSpara, prkna: [B.plotSvetly, B.plot, "#6A5C4E"], hrana: "#9A8A77", letokruhy: "#463C33", sloupek: "#4A4037", sloupekSvetlo: "#776858" };
/** Dva novější medové dílce na zídce se schránkou */
const DREVO_NOVE: Drevo = { spara: "#4A3829", prkna: ["#B08860", "#A07953", "#8D6A49"], hrana: "#D2AC82", letokruhy: "#6B4F38", sloupek: "#7E5F43", sloupekSvetlo: "#B08A63" };

/** Dílec plotu z vodorovných latí na zídce, sloupky na krajích a uprostřed */
export function plotDrevo(x0: number, x1: number, horni: number, dolni: number, seed: number, d: Drevo = DREVO_STARE) {
  const r = nahoda(seed);
  let s = obdelnik(x0, horni, x1 - x0, dolni - horni, `fill="${d.spara}"`);
  let letokruhy = "";
  const n = 6;
  const v = (dolni - horni - 4) / n;
  for (let i = 0; i < n; i++) {
    const y = horni + 2 + i * v;
    const t = r();
    s += obdelnik(x0 + 3, y, x1 - x0 - 6, v - 2.4, `fill="${t < 0.35 ? d.prkna[0] : t < 0.7 ? d.prkna[1] : d.prkna[2]}"`);
    s += obdelnik(x0 + 3, y, x1 - x0 - 6, 1.2, `fill="${d.hrana}" opacity="0.5"`);
    // Letokruhy — pár tenkých čárek po prkně
    for (let k = 0; k < 3; k++) {
      const lx = x0 + 10 + r() * (x1 - x0 - 40);
      letokruhy += `M${f(lx)} ${f(y + v * 0.45)}l${f(18 + r() * 30)} ${f((r() - 0.5) * 2)}`;
    }
  }
  s += `<path d="${letokruhy}" stroke="${d.letokruhy}" stroke-width="0.8" opacity="0.5" fill="none"/>`;
  const stred = (x0 + x1) / 2;
  for (const x of [x0 + 3, stred, x1 - 6]) s += obdelnik(x - 2, horni - 2, 7, dolni - horni + 2, `fill="${d.sloupek}"`) + obdelnik(x - 2, horni - 2, 2, dolni - horni + 2, `fill="${d.sloupekSvetlo}" opacity="0.6"`);
  s += `<g class="snih">${obdelnik(x0, horni - 5, x1 - x0, 6, `rx="3" fill="#FBFDFF"`)}</g>`;
  return s;
}

/** Úsek naší omítnuté zídky se stříškou — sníh na stříšku přidává volající až nad plot */
export function zidkaUsek(p: string, x0: number, x1: number, presahL = 3, presahP = 3) {
  const w = x1 - x0;
  return (
    obdelnik(x0, 850, w, 204, `fill="${B.zidka}"`) +
    obdelnik(x0, 850, w, 204, `fill="url(#${p}-omitka)"`) +
    obdelnik(x0, 850, w, 14, `fill="${B.zidkaStin}" opacity="0.7"`) +
    obdelnik(x0 - presahL, 841, w + presahL + presahP, 11, `fill="${B.strisku}"`) +
    obdelnik(x0 - presahL, 841, w + presahL + presahP, 3, `fill="#BDBEB7"`) +
    obdelnik(x0, 1046, w, 16, `fill="#BDB7A8"`)
  );
}

/* ——— Vzory ——— */

export function vlevoDefs(p: string) {
  // Bílé cihly ve vazbě: tři na řádek, druhý řádek posunutý o půl cihly
  const C = 44;
  const R = 14;
  const odstiny = ["#EFEBE3", "#E7E2D8", "#F3F0E9", "#EAE5DB", "#F1EDE6", "#E4DFD4"];
  const cihly: string[] = [`<rect width="${3 * C}" height="${2 * R}" fill="#BDB8AD"/>`];
  const cihla = (x: number, y: number, barva: string) =>
    `<rect x="${f(x)}" y="${f(y)}" width="${C - 1.4}" height="${R - 1.4}" fill="${barva}"/><rect x="${f(x)}" y="${f(y)}" width="${C - 1.4}" height="1" fill="#FFFFFF" opacity="0.55"/><rect x="${f(x)}" y="${f(y + R - 2.4)}" width="${C - 1.4}" height="1" fill="#C9C3B7" opacity="0.6"/>`;
  for (let i = 0; i < 3; i++) cihly.push(cihla(i * C + 0.7, 0.7, odstiny[i]));
  // Řádek pod ním: krajní cihla přetéká přes okraj dlaždice, proto je dvakrát (stejnou barvou)
  for (let i = -1; i < 3; i++) cihly.push(cihla(i * C + C / 2 + 0.7, R + 0.7, odstiny[3 + ((i + 3) % 3)]));

  // Hnědé tašky sousedovy střechy zepředu: řady obloučků, spáry vystřídané
  let tasky = `<rect width="36" height="24" fill="#5E463A"/>`;
  for (let radek = 0; radek < 2; radek++) {
    for (let i = 0; i < 3; i++) {
      const x = i * 18 - radek * 9;
      const y = radek * 12;
      tasky += `<path d="M${x} ${y + 11} Q${x + 9} ${y + 14.5} ${x + 18} ${y + 11}" stroke="#45332A" stroke-width="1.8" fill="none"/>`;
      tasky += `<path d="M${x + 3} ${y + 2.5} H${x + 15}" stroke="#7A5C4C" stroke-width="1.3" opacity="0.7"/>`;
      tasky += `<path d="M${x + 17.6} ${y + 0.5} V${y + 11}" stroke="#4B382E" stroke-width="1"/>`;
    }
  }

  return `
    <pattern id="${p}-cihly" width="${3 * C}" height="${2 * R}" patternUnits="userSpaceOnUse" y="${VLEVO.cihly}">${cihly.join("")}</pattern>
    <pattern id="${p}-cihly-pilir" href="#${p}-cihly" x="13" y="${VLEVO.cihly + 7}"/>
    <pattern id="${p}-tasky-soused" width="36" height="24" patternUnits="userSpaceOnUse" y="566">${tasky}</pattern>
    <linearGradient id="${p}-spina" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ADA697" stop-opacity="0"/><stop offset="1" stop-color="#ADA697" stop-opacity="0.6"/></linearGradient>
    <linearGradient id="${p}-planka" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6DDBC" stop-opacity="0.22"/><stop offset="0.25" stop-color="#F6DDBC" stop-opacity="0"/><stop offset="0.7" stop-color="#2B1A10" stop-opacity="0"/><stop offset="1" stop-color="#2B1A10" stop-opacity="0.34"/></linearGradient>`;
}

/* ——— Vepředu: zdi, pilíře, skříň, branka ——— */

/** Zeď z bílých cihel: nahoře řada cihel na stojato, u paty ostříkaná */
function cihlovaZed(p: string, x0: number, x1: number) {
  const vrch = VLEVO.cihly;
  const w = x1 - x0;
  let s = obdelnik(x0, vrch, w, ZEM - vrch, `fill="url(#${p}-cihly)"`);
  s += obdelnik(x0, vrch - 3, w, 8, `fill="#E3DED3"`);
  let spary = "";
  for (let x = x0 + 4; x < x1; x += 9) spary += `M${f(x)} ${vrch - 3}v8`;
  s += `<path d="${spary}" stroke="#BDB8AD" stroke-width="1"/>`;
  s += obdelnik(x0, vrch - 3, w, 1.4, `fill="#FBFAF6" opacity="0.8"`);
  s += obdelnik(x0, vrch + 5, w, 3, `fill="#8F8A7F" opacity="0.3"`);
  s += obdelnik(x0, ZEM - 34, w, 34, `fill="url(#${p}-spina)"`);
  s += `<g class="snih">${obdelnik(x0, vrch - 8, w, 6, `rx="3" fill="#FBFDFF"`)}</g>`;
  return s;
}

/** Cihlový pilíř s nízkou betonovou stříškou (jehlan s čelem) */
function cihlovyPilir(p: string, x: number, w: number, vrch: number, pata: number, seed: number) {
  const r = nahoda(seed);
  const k = 13;
  let s = obdelnik(x - 3, vrch + k - 2, w + 6, pata - vrch - k + 2, `fill="#8F8A7F" opacity="0.18"`);
  s += obdelnik(x, vrch + k - 2, w, pata - vrch - k + 2, `fill="url(#${p}-cihly-pilir)"`);
  s += obdelnik(x, vrch + k - 2, 3, pata - vrch - k + 2, `fill="#FFFFFF" opacity="0.4"`);
  s += obdelnik(x + w - 4, vrch + k - 2, 4, pata - vrch - k + 2, `fill="#9C978C" opacity="0.4"`);
  s += obdelnik(x, vrch + k, w, 4, `fill="#6F695F" opacity="0.3"`);
  s += mnohouhelnik([[x - 6, vrch + 8], [x + w / 2, vrch], [x + w + 6, vrch + 8]], `fill="#A79F92"`);
  s += mnohouhelnik([[x - 6, vrch + 8], [x + w / 2, vrch], [x + w / 2, vrch + 8]], `fill="#B9B1A4"`);
  s += obdelnik(x - 6, vrch + 8, w + 12, 5, `fill="#9A9285"`);
  s += obdelnik(x - 6, vrch + 12, w + 12, 1.6, `fill="#6B655B"`);
  // Mech a skvrny na betonu
  for (let i = 0; i < 4; i++) s += elipsa(x - 2 + r() * (w + 4), vrch + 5 + r() * 6, 2 + r() * 4, 1 + r() * 1.4, `fill="${r() < 0.5 ? "#7F8463" : "#8A8276"}" opacity="0.45"`);
  s += `<g class="snih"><path d="M${x - 7} ${vrch + 8} L${x + w / 2} ${vrch - 2} L${x + w + 7} ${vrch + 8} L${x + w + 4} ${vrch + 10} L${x + w / 2} ${vrch + 3} L${x - 4} ${vrch + 10} Z" fill="#FBFDFF"/></g>`;
  return s;
}

/** Sousedovo pole nad pilířem s elektroměrem: tmavé lamely se šrouby v rámu z pozinkované pásoviny */
function lamely(x0: number, x1: number, y0: number, y1: number) {
  let s = obdelnik(x0, y0, x1 - x0, y1 - y0, `fill="#221A15"`);
  const tmave: [number, number, number, number][] = [];
  const svetle: [number, number, number, number][] = [];
  let i = 0;
  for (let x = x0 + 5; x < x1 - 9; x += 10.4, i++) (i === 9 || i === 12 ? svetle : tmave).push([x, y0 + 4, 9, y1 - y0 - 8]);
  s += obdelniky(tmave, `fill="#45352B"`) + obdelniky(tmave.map(([x, y, , h]) => [x, y, 1.4, h]), `fill="#61503F"`);
  // Dvě lamely jsou světlé — na fotce chybí, nebo vybledly
  s += obdelniky(svetle, `fill="#D3D1C9"`);
  s += `<path d="${tecky([...tmave, ...svetle].flatMap(([x]): Bod[] => [[x + 4.5, y0 + 7.5], [x + 4.5, y1 - 7.5]]))}" stroke="#E8E5DD" stroke-width="2" stroke-linecap="round"/>`;
  s += `<path d="M${x0} ${y0}h${x1 - x0}v${y1 - y0}h${x0 - x1}Z M${x0 + 4} ${y0 + 4}v${y1 - y0 - 8}h${x1 - x0 - 8}v${y0 - y1 + 8}Z" fill="#A9B3B8" fill-rule="evenodd"/>`;
  s += obdelnik(x0, y0, x1 - x0, 1.3, `fill="#E0E6E9"`) + obdelnik(x0, y1 - 1.3, x1 - x0, 1.3, `fill="#7E888D"`);
  s += `<g class="snih">${obdelnik(x0 - 1, y0 - 5, x1 - x0 + 2, 5, `rx="2.5" fill="#FBFDFF"`)}</g>`;
  return s;
}

/** Plechová dvířka výklenku s měřákem: vybledlá rezavá červeň, dvě krátké lišty uzávěrů, rez u spodku */
function dvirka(x: number, y: number, w: number, h: number, seed: number) {
  const r = nahoda(seed);
  let s = obdelnik(x - 2, y - 2, w + 4, h + 4, `fill="#5E2B21" opacity="0.45"`);
  s += obdelnik(x, y, w, h, `fill="#974334"`);
  s += obdelnik(x, y, w, h * 0.45, `fill="#AA5641" opacity="0.32"`);
  s += obdelnik(x + 3.5, y + 3.5, w - 7, h - 7, `fill="none" stroke="#7C3428" stroke-width="1.4"`);
  s += obdelnik(x, y, w, 1.6, `fill="#C66E57" opacity="0.8"`);
  s += obdelnik(x + w - 2.4, y, 2.4, h, `fill="#682B20" opacity="0.7"`);
  s += obdelnik(x, y + h - 2, w, 2, `fill="#5C261C" opacity="0.6"`);
  for (const t of [0.22, 0.8]) {
    const yy = y + h * t;
    s += obdelnik(x + w / 2 - 14, yy - 2.2, 28, 4.4, `rx="1.2" fill="#76322A"`);
    s += obdelnik(x + w / 2 - 14, yy - 2.2, 28, 1.4, `rx="0.7" fill="#CD7E66" opacity="0.75"`);
  }
  // Rez prosakuje od spodní hrany
  let rez = "";
  for (let i = 0; i < 3; i++) {
    const rx = x + 10 + r() * (w - 20);
    rez += `M${f(rx)} ${f(y + h - 3)}q${f((r() - 0.5) * 2)} ${f(-5 - r() * 5)} ${f((r() - 0.5) * 2)} ${f(-9 - r() * 9)}`;
  }
  s += `<path d="${rez}" stroke="#652A1F" stroke-width="1.4" opacity="0.22" fill="none" stroke-linecap="round"/>`;
  return s;
}

/** Bílý pilíř s elektroměrem a plynoměrem: oplechovaný vršek, dole popraskaný a ostříkaný od deště */
function elektromer(p: string) {
  const { x0, x1, vrch } = VLEVO.pilir;
  const w = x1 - x0;
  const r = nahoda(5103);
  let s = obdelnik(x0, vrch + 4, w, ZEM - vrch - 4, `fill="#ECE9E1"`);
  s += obdelnik(x0, vrch + 4, w, ZEM - vrch - 4, `fill="url(#${p}-omitka)"`);
  s += obdelnik(x0, vrch + 6, w, 9, `fill="#A9A498" opacity="0.32"`);
  // Spodní třetina: šedá od odstřikující vody, okraj v měkkých vlnách
  let okraj = `M${x0} ${ZEM}V${f(990 + r() * 8)}`;
  for (let x = x0 + 34; x <= x1; x += 34) okraj += `Q${f(x - 17)} ${f(972 + r() * 22)} ${f(Math.min(x, x1))} ${f(984 + r() * 14)}`;
  okraj += `V${ZEM}Z`;
  s += `<path d="${okraj}" fill="#CBC6BA" opacity="0.42"/>`;
  s += obdelnik(x0, ZEM - 50, w, 50, `fill="url(#${p}-spina)"`);
  for (let i = 0; i < 6; i++) s += elipsa(x0 + 10 + r() * (w - 20), 1000 + r() * 46, 5 + r() * 10, 2 + r() * 4, `fill="#B9B3A6" opacity="${f(0.18 + r() * 0.2)}"`);
  // Jemná pavučina prasklin dole a jedna od rohu
  let praskliny = "";
  for (let i = 0; i < 7; i++) {
    let x = x0 + 14 + r() * (w - 28);
    let y = 980 + r() * 60;
    praskliny += `M${f(x)} ${f(y)}`;
    for (let k = 0; k < 3; k++) {
      x += (r() - 0.5) * 18;
      y += 3 + r() * 7;
      praskliny += `L${f(x)} ${f(y)}`;
    }
  }
  praskliny += `M${x0 + 4} ${vrch + 30}l6 8l-2 7l5 9`;
  s += `<path d="${praskliny}" stroke="#A39D91" stroke-width="0.6" fill="none" opacity="0.6"/>`;
  // Vlevo elektroměr, vpravo plynoměr
  s += dvirka(x0 + 29, 871, 109, 95, 31) + dvirka(x0 + 179, 871, 109, 95, 32);
  s += obdelnik(x0 - 3, vrch, w + 6, 6, `fill="#9EA3A0"`) + obdelnik(x0 - 3, vrch, w + 6, 1.6, `fill="#CBCFCC"`) + obdelnik(x0 - 3, vrch + 5, w + 6, 1.4, `fill="#6E7370"`);
  s += `<g class="snih">${obdelnik(x0 - 4, vrch - 5, w + 8, 6, `rx="3" fill="#FBFDFF"`)}</g>`;
  return s;
}

/** Plechová rozpojovací skříň na chodníku: zvětralý pozink, víko s přesahem, zámek na trojhranný klíč */
function skrin(x0: number, x1: number, vrch: number, pata: number) {
  const w = x1 - x0;
  const r = nahoda(7311);
  let s = mnohouhelnik([[x0, pata], [x1, pata], [x1 - 40, ZEM + 3], [x0 - 34, ZEM + 3]], `fill="#3B3630" opacity="0.16"`);
  s += obdelnik(x0, vrch + 5, w, pata - vrch - 5, `fill="#B8BDBA"`);
  for (let i = 0; i < 12; i++) {
    s += elipsa(x0 + 10 + r() * (w - 20), vrch + 24 + r() * (pata - vrch - 48), 3 + r() * 9, 2 + r() * 7, `fill="${r() < 0.65 ? "#D3D7D3" : "#A7ACA9"}" opacity="${f(0.16 + r() * 0.2)}"`);
  }
  s += obdelnik(x0, vrch + 5, 3, pata - vrch - 5, `fill="#E2E5E2" opacity="0.85"`);
  s += obdelnik(x1 - 4, vrch + 5, 4, pata - vrch - 5, `fill="#8A8F8C" opacity="0.75"`);
  s += obdelnik(x0 + 6, vrch + 14, w - 12, pata - vrch - 26, `fill="none" stroke="#979C99" stroke-width="1.2"`);
  const cx = (x0 + x1) / 2;
  s += kruh(cx, vrch + 30, 2.8, `fill="#868B88"`) + mnohouhelnik([[cx - 1.3, vrch + 31], [cx + 1.3, vrch + 31], [cx, vrch + 28.6]], `fill="#3E4240"`);
  s += obdelnik(x0, pata - 24, w, 24, `fill="#8C918C" opacity="0.28"`);
  s += obdelnik(x0 - 3, vrch, w + 6, 7, `rx="1.5" fill="#A5AAA7"`) + obdelnik(x0 - 3, vrch, w + 6, 2, `rx="1" fill="#D9DDDA"`);
  s += `<path d="${tecky([[x0 + 12, vrch + 12], [x1 - 12, vrch + 12]])}" stroke="#7B807E" stroke-width="3.4" stroke-linecap="round"/>`;
  s += `<g class="snih">${obdelnik(x0 - 4, vrch - 5, w + 8, 6, `rx="3" fill="#FBFDFF"`)}</g>`;
  return s;
}

/** Bílá schránka s obloučkovým víkem: jmenovka, nálepka „nevhazovat reklamní tisky“, zámek a vylisovaná poštovní trubka */
function schranka(x0: number, y0: number) {
  const w = 50;
  const h = 62;
  const x1 = x0 + w;
  const y1 = y0 + h;
  const o = 4.5;
  const cx = x0 + w / 2;
  let s = `<path d="M${x0 - 3} ${y1 + 3} V${y0 + o + 4} Q${cx - 3} ${y0 - o + 4} ${x1 - 3} ${y0 + o + 4} V${y1 + 3} Z" fill="#6F7C5C" opacity="0.22"/>`;
  s += `<path d="M${x0} ${y1} V${y0 + o} Q${cx} ${y0 - o} ${x1} ${y0 + o} V${y1} Z" fill="#F4F3EE"/>`;
  s += `<path d="M${x1 - 4} ${y0 + o - 0.6} Q${x1 - 2} ${y0 + o - 0.2} ${x1} ${y0 + o} V${y1} H${x1 - 4} Z" fill="#DAD9D2"/>`;
  s += obdelnik(cx - 9, y0 + 2.5, 18, 4.2, `rx="0.8" fill="#5D6367"`);
  s += obdelnik(cx - 6, y0 + 4.2, 12, 0.8, `fill="#C9CDD0"`);
  // Klapka na dopisy a pod ní štěrbina
  s += obdelnik(x0 + 1.5, y0 + 9, w - 3, 12, `fill="#EDECE6"`);
  s += obdelnik(x0 + 3, y0 + 20.6, w - 6, 1.8, `fill="#8E8D86"`);
  s += obdelnik(cx - 8.5, y0 + 11.8, 17, 5.6, `fill="#FFFFFF" stroke="#2B2B2B" stroke-width="0.6"`);
  s += `<path d="M${cx - 6.5} ${y0 + 13.8} h13 M${cx - 5} ${y0 + 15.6} h10" stroke="#2B2B2B" stroke-width="0.7" opacity="0.75"/>`;
  // Dvířka, zámek nahoře uprostřed, poštovní trubka slepě vylisovaná
  s += obdelnik(x0 + 2.5, y0 + 24, w - 5, h - 26.5, `fill="none" stroke="#D2D1CA" stroke-width="1"`);
  s += kruh(cx, y0 + 28.5, 1.8, `fill="#A6A69F"`) + kruh(cx, y0 + 28.5, 0.6, `fill="#4A4A46"`);
  const ty = y0 + 46;
  s += `<path d="M${cx - 8} ${ty} c0 -5 4 -7 8 -7 c5 0 8 3 8 6 c0 3 -2 5 -5 5 c-3 0 -5 -2 -5 -4 M${cx + 8} ${ty - 1} l4 -3 v8 z" stroke="#D9D8D1" stroke-width="1.2" fill="none" stroke-linejoin="round"/>`;
  s += obdelnik(x0, y1 - 1.6, w, 1.6, `fill="#C8C7C0"`);
  s += `<g class="snih"><path d="M${x0 - 1} ${y0 + o} Q${cx} ${y0 - o - 1} ${x1 + 1} ${y0 + o} Q${cx} ${y0 - o + 2} ${x0 - 1} ${y0 + o} Z" fill="#FBFDFF"/></g>`;
  return s;
}

/** Zvonek s kamerou: nerezový rámeček, černé čelo, objektiv, mřížka reproduktoru, jmenovka a tlačítko */
function zvonek(x0: number, y0: number) {
  const w = 20;
  const h = 28;
  const cx = x0 + w / 2;
  let s = obdelnik(x0 - 1.5, y0 + 2, w, h, `rx="2" fill="#6F7C5C" opacity="0.25"`);
  s += obdelnik(x0, y0, w, h, `rx="2" fill="#B8BDC1"`);
  s += obdelnik(x0, y0, w, 1.2, `rx="0.6" fill="#E6EAEC"`);
  s += obdelnik(x0 + 2, y0 + 2, w - 4, h - 4, `rx="1" fill="#2D3135"`);
  s += kruh(cx, y0 + 6.5, 2.4, `fill="#121417"`) + kruh(cx - 0.7, y0 + 5.8, 0.7, `fill="#7F8E9E"`);
  s += `<path d="M${cx - 4} ${y0 + 11.5}h8M${cx - 4} ${y0 + 13.5}h8M${cx - 4} ${y0 + 15.5}h8" stroke="#5A6065" stroke-width="0.8"/>`;
  s += obdelnik(cx - 6, y0 + 18.5, 12, 3.6, `fill="#E9E6DA"`);
  s += kruh(cx, y0 + 24.4, 1.5, `fill="#9AA3AA"`);
  return s;
}

/** Červená tabulka s číslem popisným — kvůli čitelnosti o kus větší, než je na zdi */
function cisloDomu(x0: number, y0: number) {
  const w = 30;
  const h = 21;
  return `<g class="u-cislo">${obdelnik(x0 - 1.5, y0 + 2, w, h, `rx="2" fill="#6F7C5C" opacity="0.25"`)}${obdelnik(x0, y0, w, h, `rx="2" fill="#B5302A"`)}${obdelnik(x0 + 2, y0 + 2, w - 4, h - 4, `rx="1.2" fill="none" stroke="#F4F1EA" stroke-width="1.2"`)}<text x="${x0 + w / 2}" y="${y0 + 15}" text-anchor="middle" font-size="12.5" font-weight="700" fill="#F4F1EA" font-family="Arial, Helvetica, sans-serif">235</text></g>`;
}

/**
 * Branka: pozinkový rám s mřížkou, zvenku přišroubované půlkulaté modřínové
 * plaňky s oblými hlavami (nad nimi je vidět mříž), panty vlevo, vpravo
 * zámková skříňka s klikou. Rám je o kus nad stříškou zídky, plot nad ní.
 */
function branka(p: string, seed: number) {
  const { x0: j0, x1: j1, vrch } = VLEVO.branka;
  const r = nahoda(seed);
  const x0 = j0 + 2;
  const x1 = j1 - 2;
  const dno = 1057;
  const t = 6;
  let s = "";
  // Průhled pod plaňkami: zastíněná pěšina za brankou
  s += obdelnik(j0, 806, j1 - j0, ZEM - 806, `fill="#55524A"`);
  s += obdelnik(j0, ZEM - 12, j1 - j0, 12, `fill="#7D776B"`);
  // Svislé pruty mříže (nahoře nad plaňkami)
  const pruty: [number, number, number, number][] = [];
  for (let k = 1; k < 10; k++) pruty.push([x0 + t + k * ((x1 - x0 - 2 * t) / 10) - 1.3, vrch + t, 2.6, dno - vrch - t]);
  s += obdelniky(pruty, `fill="${B.pozink}"`) + obdelniky(pruty.map(([x, y, , h]) => [x, y, 0.9, h]), `fill="${B.pozinkSvetlo}" opacity="0.8"`);
  // Plaňky
  const barvy = ["#8F5B3D", "#9E6747", "#7F4F35", "#A8714F", "#94603F"];
  const n = 10;
  const sirka = (x1 - x0 - 2) / n;
  let leto = "";
  let suky = "";
  let srouby: Bod[] = [];
  for (let i = 0; i < n; i++) {
    const px = x0 + 1 + i * sirka + 0.45;
    const pw = sirka - 0.9 + (r() - 0.5) * 0.6;
    const hlava = 806 + (r() - 0.5) * 3;
    const pr = pw / 2;
    const tvar = `M${f(px)} ${dno - 4} V${f(hlava + pr)} A${f(pr)} ${f(pr)} 0 0 1 ${f(px + pw)} ${f(hlava + pr)} V${dno - 4} Z`;
    s += `<path d="${tvar}" fill="${barvy[Math.floor(r() * barvy.length)]}"/>`;
    s += `<path d="${tvar}" fill="url(#${p}-planka)"/>`;
    // Půlkulatý profil: světlá hrana vlevo, stín vpravo
    s += obdelnik(px + 1, hlava + pr, 1.6, dno - 4 - hlava - pr, `fill="#C99671" opacity="0.45"`);
    s += obdelnik(px + pw - 2.2, hlava + pr, 2.2, dno - 4 - hlava - pr, `fill="#4A2C1D" opacity="0.5"`);
    // Letokruhy po délce a suky
    for (let k = 0; k < 2; k++) {
      const lx = px + 3 + r() * (pw - 6);
      leto += `M${f(lx)} ${f(hlava + 10 + r() * 30)}q${f((r() - 0.5) * 3)} ${f(60 + r() * 50)} ${f((r() - 0.5) * 2)} ${f(110 + r() * 100)}`;
    }
    if (r() < 0.55) suky += elipsa(px + pw * (0.3 + r() * 0.4), 840 + r() * 190, 1.4 + r() * 1.2, 2 + r() * 1.6, `fill="#4A2B1C" opacity="0.75"`);
    srouby.push([px + pw / 2, 888], [px + pw / 2, 1032]);
  }
  s += `<path d="${leto}" stroke="#5A3726" stroke-width="0.8" fill="none" opacity="0.45"/>`;
  s += suky;
  s += `<path d="${tecky(srouby)}" stroke="#C9CDCF" stroke-width="1.8" stroke-linecap="round"/>`;
  // Rám: stojiny, horní a spodní příčle
  s += obdelnik(x0, vrch, t, dno - vrch, `fill="${B.pozink}"`) + obdelnik(x0, vrch, 2, dno - vrch, `fill="${B.pozinkSvetlo}"`);
  s += obdelnik(x1 - t, vrch, t, dno - vrch, `fill="${B.pozink}"`) + obdelnik(x1 - 2, vrch, 2, dno - vrch, `fill="${B.pozinkTma}"`);
  s += obdelnik(x0, vrch, x1 - x0, t, `fill="${B.pozink}"`) + obdelnik(x0, vrch, x1 - x0, 1.8, `fill="${B.pozinkSvetlo}"`) + obdelnik(x0, vrch + t - 1.4, x1 - x0, 1.4, `fill="${B.pozinkTma}"`);
  s += obdelnik(x0, dno - t, x1 - x0, t, `fill="${B.pozink}"`) + obdelnik(x0, dno - 1.4, x1 - x0, 1.4, `fill="${B.pozinkTma}"`);
  // Panty vlevo
  for (const y of [800, 1030]) s += obdelnik(j0 - 1, y - 8, 4.5, 16, `rx="1.6" fill="#9DA7AC"`) + obdelnik(j0 - 1, y - 8, 1.4, 16, `fill="${B.pozinkSvetlo}"`);
  // Zámková skříňka a klika vpravo
  s += obdelnik(x1 - 9, 906, 10, 36, `rx="1.2" fill="#A3ADB2"`) + obdelnik(x1 - 9, 906, 2, 36, `fill="${B.pozinkSvetlo}"`);
  s += kruh(x1 - 4, 932, 1.3, `fill="#3E4448"`);
  s += `<path d="M${x1 - 6} 921 H${x1 - 20} q-3 0 -3 2.5" stroke="#8E989D" stroke-width="3.4" fill="none" stroke-linecap="round"/>`;
  s += `<path d="M${x1 - 6} 920.2 H${x1 - 19}" stroke="${B.pozinkSvetlo}" stroke-width="1" stroke-linecap="round"/>`;
  s += obdelnik(j0, ZEM - 3, j1 - j0, 3, `fill="#3B3630" opacity="0.35"`);
  s += `<g class="snih">${obdelnik(x0 - 1, vrch - 5, x1 - x0 + 2, 6, `rx="3" fill="#FBFDFF"`)}</g>`;
  return s;
}

/** Vepředu zleva: sousedova zeď s pilíři, pole lamel, pilíř s elektroměrem, skříň na chodníku, naše zídka s plotem a schránkou, branka, zvonek a číslo */
export function vlevoVpredu(p: string) {
  const { pilir, zidka } = VLEVO;
  let s = cihlovaZed(p, VLEVO.konec, -1040);
  s += cihlovyPilir(p, -1934, 70, VLEVO.cihly - 6, ZEM, 61) + cihlovyPilir(p, -1503, 70, VLEVO.cihly - 6, ZEM, 62);
  s += cihlovyPilir(p, -1072, 70, VLEVO.cihly - 6, ZEM, 63);
  // Druhý cihlový pilíř stojí až na pilíři s elektroměrem, pole lamel je přišroubované přes oba
  s += cihlovyPilir(p, -890, 60, VLEVO.cihly, pilir.vrch + 6, 64);
  s += lamely(-1009, -850, 806, 843);
  s += elektromer(p);
  s += skrin(-1151, -1040, 885, 1084);
  s += zidkaUsek(p, zidka.x0, zidka.x1, 3, 2);
  // Pár odloupnutých míst v omítce
  s += `<g fill="#E6EBD4" opacity="0.9">${[[-668, 1006], [-596, 1012], [-531, 1003]].map(([x, y]) => `<path d="M${x} ${y} l5 -6 l4 3 l3 -4 l2 9 l-6 6 l-7 -2 Z"/>`).join("")}</g>`;
  s += plotDrevo(zidka.x0, -598, 761, 843, 821, DREVO_NOVE) + plotDrevo(-594, -461, 761, 843, 822, DREVO_NOVE);
  s += schranka(-505, 856);
  s += branka(p, 4040);
  s += zvonek(-285, 858) + cisloDomu(-257, 861);
  s += `<g class="snih">${obdelnik(zidka.x0 - 3, 836, zidka.x1 - zidka.x0 + 5, 7, `rx="3" fill="#FBFDFF"`)}</g>`;
  return s;
}

/* ——— Vzadu: sousedův dům, stromy, přístřešek, hlohyně ——— */

/** Sousedův dům za přístřeškem: z ulice je vidět hnědá valbová střecha se střešním oknem a kus krémové zdi s okny */
function sousedDum(p: string) {
  const E = 672;
  const R = 566;
  const eL = -1730;
  const eP = -1012;
  const rL = -1622;
  const rP = -1120;
  let s = `<g class="u-soused" opacity="0.94">`;
  s += obdelnik(eL + 20, E, eP - eL - 40, 130, `fill="#EAE0CB"`);
  s += obdelnik(eL + 20, E, eP - eL - 40, 18, `fill="#B5AA94" opacity="0.45"`);
  // Okna patra, kus nad přístřeškem a zdí
  for (const ox of [-1652, -1092]) {
    s += obdelnik(ox, 690, 44, 34, `fill="#F4F2EC"`) + obdelnik(ox + 4, 694, 36, 30, `class="u-sklo" fill="${B.sklo}"`);
    s += `<path d="M${ox + 4} 714 L${ox + 22} 694 L${ox + 29} 694 L${ox + 4} 722 Z" fill="${B.odlesk}" opacity="0.3"/>`;
    s += obdelnik(ox + 21, 694, 2.4, 30, `fill="#F4F2EC"`);
  }
  // Střecha: čelní plocha z tašek, nároží a hřeben z hřebenáčů
  const plocha: Bod[] = [[eL, E], [rL, R], [rP, R], [eP, E]];
  s += mnohouhelnik(plocha, `fill="url(#${p}-tasky-soused)"`);
  s += mnohouhelnik([[eL, E], [rL, R], [rL + 60, R], [eL + 70, E]], `fill="#FFFFFF" opacity="0.06"`);
  s += `<path d="M${eL} ${E} L${rL} ${R} L${rP} ${R} L${eP} ${E}" stroke="#46342A" stroke-width="6" fill="none" stroke-linejoin="round"/>`;
  s += `<path d="M${rL} ${R - 2} H${rP}" stroke="#6E5444" stroke-width="2" opacity="0.8"/>`;
  // Střešní okno
  s += obdelnik(-1446, 604, 34, 26, `fill="#5D5E59"`) + obdelnik(-1443, 607, 28, 20, `class="u-sklo" fill="#33404D"`);
  s += `<path d="M-1443 621 L-1431 607 L-1425 607 L-1443 627 Z" fill="${B.odlesk}" opacity="0.35"/>`;
  // Okapové prkno a žlab
  s += obdelnik(eL - 4, E - 3, eP - eL + 8, 6, `fill="#3D2B21"`) + obdelnik(eL - 6, E + 3, eP - eL + 12, 4.5, `rx="2" fill="#8D8E88"`);
  s += `<g class="snih"><path d="M${eL + 4} ${E - 4} L${rL + 2} ${R + 3} L${rP - 2} ${R + 3} L${eP - 4} ${E - 4} Z" fill="#FBFDFF" opacity="0.85"/></g>`;
  s += `</g>`;
  return s;
}

/** Tmavé dřevěné čelo plochého přístřešku za sousedovou zdí, tři prkna a plechová lišta */
function celoPristresku(x0: number, x1: number, vrch: number) {
  const r = nahoda(3301);
  const w = x1 - x0;
  let s = obdelnik(x0, vrch, w, 62, `fill="#33261F"`);
  const prkna: [number, number, string][] = [[vrch + 1.5, 18, "#4E3C31"], [vrch + 21, 18, "#47372E"], [vrch + 40.5, 19, "#413229"]];
  for (const [y, h, c] of prkna) s += obdelnik(x0, y, w, h, `fill="${c}"`) + obdelnik(x0, y, w, 1.4, `fill="#6E5848" opacity="0.6"`);
  let leto = "";
  for (let i = 0; i < 26; i++) {
    const y = prkna[i % 3][0] + 5 + r() * 9;
    const x = x0 + r() * (w - 60);
    leto += `M${f(x)} ${f(y)}l${f(30 + r() * 60)} ${f((r() - 0.5) * 2)}`;
  }
  s += `<path d="${leto}" stroke="#2C211B" stroke-width="0.9" opacity="0.6" fill="none"/>`;
  s += obdelnik(x1 - 4, vrch, 4, 62, `fill="#6A5444"`) + obdelnik(x0, vrch, 4, 62, `fill="#5A4639"`);
  s += obdelnik(x0, vrch - 3, w + 2, 4, `fill="#6B6F6E"`) + obdelnik(x0, vrch - 3, w + 2, 1.2, `fill="#9EA3A1"`);
  s += `<g class="snih">${obdelnik(x0, vrch - 8, w + 3, 6, `rx="3" fill="#FBFDFF"`)}</g>`;
  return s;
}

/**
 * Listnatý strom za zdí: kmen, větve (v zimě zůstanou) a koruna z chomáčů.
 * Třešeň bere barvy sakury — na jaře rozkvete, na podzim zrudne —,
 * listnáč u hlohyně barvy ořechu, na podzim zezlátne.
 */
function strom(x: number, pata: number, cx: number, cy: number, rx: number, ry: number, druh: "tresen" | "listnac", seed: number) {
  const r = nahoda(seed);
  const [obal, t1, t2, t3] = druh === "tresen" ? ["koruna", "sak-1", "sak-2", "sak-3"] : ["koruna-orech", "ore-1", "ore-2", "ore-3"];
  const rozvetveni = cy + ry * 0.35;
  let s = `<path d="M${x - 8} ${pata} C${x - 6} ${pata - 50} ${x - 4} ${rozvetveni + 30} ${x - 3} ${rozvetveni} L${x + 4} ${rozvetveni} C${x + 5} ${rozvetveni + 30} ${x + 7} ${pata - 50} ${x + 9} ${pata} Z" fill="#5C4E44"/>`;
  // Větve: hlavní z rozvětvení, z nich boční a na koncích proutky — v zimě je to celá koruna
  let vetve = "";
  let bocni = "";
  let vetvicky = "";
  const konce: Bod[] = [];
  const proutky = (bx: number, by: number, L: number, n: number) => {
    for (let k = 0; k < n; k++) vetvicky += `M${f(bx)} ${f(by)} l${f((r() - 0.5) * L)} ${f(-L * (0.25 + r() * 0.45))}`;
  };
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i / 6 - 0.5) * 2.4 + (r() - 0.5) * 0.25;
    const ex = cx + Math.cos(a) * rx * (0.62 + r() * 0.28);
    const ey = cy + Math.sin(a) * ry * (0.62 + r() * 0.28);
    const sx = x + (r() - 0.5) * 4;
    const sy = rozvetveni + 4;
    const qx = (x + ex) / 2 + (r() - 0.5) * 24;
    const qy = (rozvetveni + ey) / 2 + 10;
    vetve += `M${f(sx)} ${f(sy)} Q${f(qx)} ${f(qy)} ${f(ex)} ${f(ey)}`;
    konce.push([ex, ey]);
    for (const t of [0.5, 0.74]) {
      const bx = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * qx + t * t * ex;
      const by = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * qy + t * t * ey;
      const ua = a + (r() < 0.5 ? -1 : 1) * (0.45 + r() * 0.4);
      const L = Math.min(rx, ry) * (0.26 + r() * 0.18);
      const vx = bx + Math.cos(ua) * L;
      const vy = by + Math.sin(ua) * L;
      bocni += `M${f(bx)} ${f(by)} L${f(vx)} ${f(vy)}`;
      proutky(vx, vy, L * 0.7, 2);
    }
    proutky(ex, ey, Math.min(rx, ry) * 0.42, 3);
  }
  s += `<path d="${cele(vetve)}" stroke="#5C4E44" stroke-width="3.4" fill="none" stroke-linecap="round"/>`;
  s += `<path d="${cele(bocni)}" stroke="#5C4E44" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  s += `<path d="${cele(vetvicky)}" stroke="#6A5B50" stroke-width="1.1" fill="none" stroke-linecap="round"/>`;
  s += `<g class="${obal}">`;
  // Koruna ze shluků: kolem konců větví a mezi nimi, každý se stínem vpravo dole a světlem vlevo nahoře
  const shluky: Bod[] = [...konce];
  for (let i = 0; i < 5; i++) shluky.push([cx + (r() - 0.5) * rx * 1.1, cy + (r() - 0.6) * ry * 0.9]);
  shluky.sort((a, b) => b[1] - a[1]);
  let stin = "";
  let stred = "";
  let svetlo = "";
  shluky.forEach(([kx, ky], i) => {
    const sr = rx * (0.3 + r() * 0.14);
    const sv = ry * (0.28 + r() * 0.12);
    stin += chomac(kx + sr * 0.12, ky + sv * 0.14, sr, sv, 9, seed + 20 + i, 0.85, 0.62);
    stred += chomac(kx - sr * 0.08, ky - sv * 0.1, sr * 0.78, sv * 0.74, 8, seed + 40 + i, 0.85, 0.62);
    if (ky < cy - ry * 0.25 && i % 2 === 0) svetlo += chomac(kx - sr * 0.28, ky - sv * 0.34, sr * 0.3, sv * 0.24, 7, seed + 60 + i, 0.85, 0.62);
  });
  s += `<path class="${t1}" d="${cele(chomac(cx, cy + ry * 0.1, rx * 0.8, ry * 0.7, 14, seed, 0.85, 0.62) + stin)}"/>`;
  s += `<path class="${t2}" d="${cele(chomac(cx - rx * 0.06, cy - ry * 0.08, rx * 0.5, ry * 0.46, 11, seed + 1, 0.85, 0.62) + stred)}"/><path class="${t3}" d="${cele(svetlo)}"/>`;
  s += `</g>`;
  return s;
}

/**
 * Hlohyně šarlatová na hranici pozemku: hustý tmavě zelený keř s dlouhými
 * šlahouny nahoře, od léta do předjaří obalený bobulemi (v létě zelené,
 * na podzim oranžové), v květnu bíle kvete. Bobule jsou tečky — na
 * obrazovce se slijí do oranžových hroznů jako na fotce.
 */
function hlohyne(x0: number, x1: number, vrch: number, pata: number, seed: number) {
  const r = nahoda(seed);
  const w = x1 - x0;
  const h = pata - vrch;
  // Šlahouny nahoře: tenké pruty s drobnými lístky, trčí nad keř hlavně vpravo
  let prutky = "";
  const listky: Bod[] = [];
  for (let i = 0; i < 9; i++) {
    const bx = x0 + w * (0.2 + r() * 0.72);
    const by = vrch + h * (0.12 + r() * 0.08);
    const ex = bx + (r() - 0.35) * 36;
    const ey = vrch - 10 - r() * 24;
    const mx = (bx + ex) / 2 + (r() - 0.5) * 10;
    const my = (by + ey) / 2;
    prutky += `M${f(bx)} ${f(by)} Q${f(mx)} ${f(my)} ${f(ex)} ${f(ey)}`;
    for (let k = 1; k <= 6; k++) {
      const t = k / 6.4;
      const lx = (1 - t) * (1 - t) * bx + 2 * (1 - t) * t * mx + t * t * ex;
      const ly = (1 - t) * (1 - t) * by + 2 * (1 - t) * t * my + t * t * ey;
      listky.push([lx + (k % 2 ? 2.2 : -2.2), ly]);
    }
  }
  let s = `<path d="${cele(prutky)}" stroke="#55603F" stroke-width="1.2" fill="none" stroke-linecap="round"/>`;
  s += `<path d="${cele(tecky(listky))}" stroke="#46623A" stroke-width="3.4" stroke-linecap="round"/>`;
  // Hmota keře: vzpřímené hrboly, vpravo vyšší
  const hrboly: [number, number, number, number, string][] = [
    [0.5, 0.6, 0.48, 0.42, "#30462A"],
    [0.27, 0.44, 0.24, 0.34, "#33492C"],
    [0.72, 0.36, 0.25, 0.34, "#32482B"],
    [0.52, 0.27, 0.17, 0.18, "#364D2F"],
    [0.36, 0.36, 0.17, 0.16, "#3E5934"],
    [0.66, 0.5, 0.2, 0.2, "#3B5532"],
    [0.24, 0.3, 0.1, 0.1, "#425D38"],
    [0.7, 0.23, 0.11, 0.1, "#425D38"],
  ];
  hrboly.forEach(([tx, ty, rx, ry, c], i) => {
    s += `<path d="${cele(chomac(x0 + w * tx, vrch + h * ty, w * rx, h * ry, 11, seed + i, 0.95, 0.5))}" fill="${c}"/>`;
  });
  // Bobule: protáhlé hrozny podél svislých větví (jak na fotce oranžové pruhy) a kolem nich drobné hroznky
  let hrozny = "";
  const bobule: Bod[][] = [[], [], []];
  const kvety: Bod[] = [];
  for (let k = 0; k < 5; k++) {
    const lx = x0 + w * (0.17 + k * 0.165) + (r() - 0.5) * 10;
    for (let y = vrch + h * (0.16 + r() * 0.08); y < pata - 40; y += 30 + r() * 16) {
      const sx = lx + (r() - 0.5) * 10;
      const ry = 9 + r() * 9;
      if (r() < 0.75) hrozny += chomac(sx, y + ry, 5.5 + r() * 3, ry, 7, seed + 100 + Math.round(y) + k, 0.9, 0.7);
      for (let j = 0; j < 9; j++) bobule[Math.floor(r() * 3)].push([sx + (r() - 0.5) * 16, y + r() * ry * 2.2]);
      kvety.push([sx, y + 4], [sx + 4, y + 7], [sx - 4, y + 8], [sx + 1, y + 13], [sx - 2, y + 18]);
    }
  }
  const barvy = ["#E2652A", "#F7A050", "#B9431B"];
  s += `<g class="u-plody"><path class="u-hrozen" d="${cele(hrozny)}" fill="#DA5F27"/>${bobule.map((b, i) => `<path class="u-bobule-${i + 1}" d="${cele(tecky(b))}" stroke="${barvy[i]}" stroke-width="4.2" stroke-linecap="round"/>`).join("")}</g>`;
  s += `<g class="u-kvet" opacity="0"><path d="${cele(tecky(kvety))}" stroke="#F6F2E4" stroke-width="4.2" stroke-linecap="round"/></g>`;
  return s;
}

/** Túje — úzký tmavý plamen, u souseda jich je pár v řadě za zdí */
function tuje(x: number, pata: number, w: number, v: number, seed: number) {
  const r = nahoda(seed);
  const d = `M${f(x - w / 2)} ${pata} C${f(x - w * 0.62)} ${f(pata - v * 0.45)} ${f(x - w * 0.3)} ${f(pata - v * 0.85)} ${f(x + (r() - 0.5) * 4)} ${f(pata - v)} C${f(x + w * 0.32)} ${f(pata - v * 0.82)} ${f(x + w * 0.6)} ${f(pata - v * 0.45)} ${f(x + w / 2)} ${pata} Z`;
  return `<path d="${cele(d)}" fill="#2C4630"/><path d="M${f(x - w * 0.12)} ${f(pata - v * 0.9)} C${f(x - w * 0.36)} ${f(pata - v * 0.6)} ${f(x - w * 0.4)} ${f(pata - v * 0.3)} ${f(x - w * 0.3)} ${pata} L${f(x - w * 0.05)} ${pata} C${f(x - w * 0.12)} ${f(pata - v * 0.4)} ${f(x - w * 0.08)} ${f(pata - v * 0.7)} ${f(x - w * 0.12)} ${f(pata - v * 0.9)} Z" fill="#3D5C3C" opacity="0.8"/>`;
}

/** Vzadu zleva: sousedův dům, túje, třešeň, listnáč, čelo přístřešku a hlohyně na hranici */
export function vlevoVzadu(p: string) {
  let s = sousedDum(p);
  s += tuje(-1902, 820, 44, 150, 71) + tuje(-1852, 820, 48, 166, 72) + tuje(-1800, 820, 44, 146, 73);
  s += `<path d="${cele(chomac(-1716, 768, 62, 44, 12, 74, 0.9, 0.6))}" fill="#3E5A35"/><path d="${cele(chomac(-1730, 756, 36, 24, 9, 75, 0.9, 0.6))}" fill="#4F6E40"/>`;
  s += strom(-1262, 790, -1255, 648, 150, 100, "tresen", 2201);
  s += strom(-905, 860, -884, 668, 78, 94, "listnac", 2301);
  s += celoPristresku(-1480, -886, 728);
  s += hlohyne(-890, -702, 586, 856, 4401);
  return s;
}

/* ——— Bambus u domu ——— */

/** Lístek jako čočka od řapíku ve směru úhlu (stupně, 0 = doprava, 90 = dolů) */
const listek = (x: number, y: number, uhel: number, l: number, w: number) => {
  const a = (uhel * Math.PI) / 180;
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  const mx = x + dx * l * 0.42;
  const my = y + dy * l * 0.42;
  return `M${f(x)} ${f(y)}Q${f(mx - dy * w)} ${f(my + dx * w)} ${f(x + dx * l)} ${f(y + dy * l)}Q${f(mx + dy * w)} ${f(my - dx * w)} ${f(x)} ${f(y)}Z`;
};

/** Bambus za plotem: tenká stébla s kolínky a převislé trsy úzkých listů */
export function bambus(x0: number, x1: number, pata: number, vrch: number, seed: number) {
  const r = nahoda(seed);
  let stebla = "";
  let kolinka = "";
  const listy = ["", "", ""];
  const n = 15;
  for (let i = 0; i < n; i++) {
    const x = x0 + ((i + 0.2 + r() * 0.6) / n) * (x1 - x0);
    const h = (pata - vrch) * (0.6 + r() * 0.4);
    const ohyb = (r() - 0.5) * 34 + (x - (x0 + x1) / 2) * 0.14;
    const kx = x + ohyb * 0.2;
    const ky = pata - h * 0.55;
    const tx = x + ohyb;
    const ty = pata - h;
    stebla += `M${f(x)} ${pata}Q${f(kx)} ${f(ky)} ${f(tx)} ${f(ty)}`;
    const bod = (t: number): Bod => [(1 - t) * (1 - t) * x + 2 * (1 - t) * t * kx + t * t * tx, (1 - t) * (1 - t) * pata + 2 * (1 - t) * t * ky + t * t * ty];
    for (let t = 0.2; t < 0.95; t += 0.16) {
      const [nx, ny] = bod(t);
      kolinka += `M${f(nx - 1.6)} ${f(ny)}h3.2`;
    }
    for (let k = 0; k < 4; k++) {
      const [px, py] = bod(0.45 + k * 0.17 + r() * 0.05);
      const strana = r() < 0.5 ? -1 : 1;
      const pocet = 2 + Math.floor(r() * 3);
      for (let j = 0; j < pocet; j++) {
        const uhel = strana > 0 ? -15 + j * 20 + r() * 14 : 195 - j * 20 - r() * 14;
        listy[Math.floor(r() * 3)] += listek(px, py, uhel, 15 + r() * 11, 2.2 + r() * 1.1);
      }
    }
    const [vx, vy] = bod(1);
    listy[2] += listek(vx, vy, -100 + r() * 30, 13 + r() * 6, 2);
  }
  return (
    `<path d="${cele(stebla)}" stroke="#7E9A4A" stroke-width="2.2" fill="none" stroke-linecap="round"/>` +
    `<path d="${cele(kolinka)}" stroke="#5E7636" stroke-width="1.4"/>` +
    `<path d="${cele(listy[0])}" fill="#47703A"/><path d="${cele(listy[1])}" fill="#5E8B44"/><path d="${cele(listy[2])}" fill="#7EA753"/>`
  );
}

/* ——— Zem a světla ——— */

/** Spadané listí třešně na chodníku a v silnici — jen na podzim */
export function vlevoListi() {
  const r = nahoda(919);
  let s = "";
  for (let i = 0; i < 9; i++) {
    const x = -1520 + r() * 640;
    const y = 1075 + r() * 220;
    const u = Math.round(r() * 180);
    s += `<path d="M${f(x)} ${f(y)} q6 -6 13 -2 q-4 7 -13 2 Z" fill="${r() < 0.5 ? "#D9773A" : "#C9562E"}" transform="rotate(${u} ${f(x + 6)} ${f(y - 1)})"/>`;
  }
  return `<g class="u-listi">${s}</g>`;
}

/** Večer: rozsvícené okno a střešní okno u souseda (za filtrem noci se kreslí vzadu) */
export const vlevoSvetlaVzadu = () =>
  obdelnik(-1088, 694, 36, 30, `fill="#FFD48A" opacity="0.75"`) + obdelnik(-1443, 607, 28, 20, `fill="#FFC870" opacity="0.6"`);

/** Večer: podsvícené tlačítko zvonku */
export const vlevoSvetlaVpredu = () =>
  `${kruh(-275, 882.4, 6, `fill="#BFE3FF" opacity="0.25"`)}${kruh(-275, 882.4, 1.8, `fill="#E4F4FF"`)}`;

