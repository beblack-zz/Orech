/**
 * Cedulka na schovávanou — zjednodušená kresba pro hry na hledání po webu,
 * sestra Pecinky z ./pecinka.ts, Bublinky z ./bublinka.ts, Střípka ze
 * ./stripek.ts a Hlínky z ./hlinka.ts (stejné barvy, pózy i volby, takže je
 * hra může střídat). Dřevěná jmenovka se stříškou jako domeček: trám
 * stříšky přesahuje přes boky, ve štítě je dírka a z ní jde přes hřeben
 * nahoru kroucená šňůrka, pod stříškou dvě kulatá očka a úsměv, dole dva
 * řádky „textu“. Vedle ní se vznáší tužka, kterou si zapisuje, čí je která
 * miska. Šňůrka ji při schovávané prozradí: vlaje nad úkrytem jako první.
 *
 * Je vždycky malá (16–64 px), a proto má dvě optické velikosti: kresbu na
 * mřížce 32 pro velikost od 22 px nahoru a zvlášť kreslenou na mřížce 16
 * pro úplně malou — tam zbyde domeček se stříškou, dírka, rovná šňůrka
 * z jednobodových dílků, dvě tečky očí, úsměv a jediný řádek textu (pod
 * očima by dva řádky bez úsměvu vypadaly jako pusa robota).
 *
 * Čtyři barvy, každá řešená zvlášť (ne jen přebarvená):
 *   cerna      silueta jako vyřezaný erb: oči, úsměv, dírka, řádky a spára
 *              pod stříškou jsou díry, šňůrka je z dílků tuše a od štítu ji
 *              dělí mezera
 *   pruhledna  skleněná destička: bílá linka s tmavým vláskem, stříška
 *              z mléčného skla, řádky vyleptané a v tužce je vidět tuha;
 *              šňůrka zůstala červenobílá — nejtěžší k nalezení, a právě ta
 *              ji prozradí
 *   zlata      zlatý štítek: kov s hranou, na kterou padá světlo, řádky
 *              vyryté, šňůrka ze zlatého dracounu a jiskra, co občas blikne
 *   logo       soumrak ze značky, stříška v barvě noci, šňůrka rumělková
 *              s krémovou a zlatým lemem, řádky krémové a za druhým místo
 *              podpisu razítko: květ sakury z loga
 *
 * Dvě pózy: `stoji` (Cedulka nestojí, visí na šňůrce a houpe se) a
 * `vykukuje` — kouká zpoza hrany zvědavě, s pusou do „ó“ a očima stranou,
 * jednou rukou se drží a v druhé má tužku. Vykukující kresba je nižší (spodek je hrana, za
 * kterou se schovává), hra ji staví spodkem na horní okraj čehokoli; kvůli
 * šňůrce je o tři body velké mřížky vyšší než vykukující Pecinka (22 místo 19).
 *
 * Generátor vrací SVG jako text, takže jde použít při sestavení stránky
 * (Cedulka.astro) i za běhu ve hře. Pohyb (houpání, vlající šňůrka, mrkání,
 * rozhlížení, tužka a řádek, který se píše) je v styles/schovka.css; bez
 * něj zůstane hezký nehybný obrázek.
 */
import { VELKA_OD } from "./pecinka";
import type { SchovkaBarva, SchovkaVolby } from "./pecinka";

type Bod = [number, number];
interface Obd {
  x: number;
  y: number;
  w: number;
  h: number;
  rx: number;
}
interface Predloha {
  /** šířka a výška mřížky */
  w: number;
  h: number;
  /** tloušťka čáry v jednotkách mřížky (na 32 je to 1, na 16 půlka) */
  k: number;
  /** destička: obrys domečku se štítem, dole oblé rohy (vykukující sahá pod hranu) */
  deska: string;
  /** stříška: trám přes štít, který na obou stranách přesahuje přes boky, a jeho tloušťka */
  strecha: string;
  strechaS: number;
  /** dírka na šňůrku ve štítě: střed a poloměr */
  dirka: [number, number, number];
  /** šňůrka, dva oblouky za sebou: dírka, ohyb, kloub nad hřebenem, ohyb, konec. Kolem dírky se kýve celá, kolem kloubu její cíp. */
  snurka: [Bod, Bod, Bod, Bod, Bod];
  snurkaS: number;
  /** délka jednoho dílku šňůrky (červený, bílý, červený…) a kolik takových délek má ten poslední, na konci */
  dilek: number;
  spicka: number;
  /** oči: středy, poloosy a odlesk (posun a poloměr), na malé mřížce není */
  oci: Bod[];
  oko: [number, number];
  odlesk: [number, number, number] | null;
  usta: string | null;
  /** pusa do „ó“, když vykukuje: střed a poloosy */
  pusa: [number, number, number, number] | null;
  tvare: Bod[];
  /** řádky „textu“ a jejich tloušťka: na velké mřížce dva (první delší), na malé jeden */
  radky: string[];
  radkyS: number;
  /** kam za poslední řádek patří razítko s květem z loga */
  kvet: Bod | null;
  /** tužka: patka s gumou, hrot a tloušťka (na malé mřížce není) */
  tuzka: { pata: Bod; hrot: Bod; s: number } | null;
  /** ručky, když vykukuje; poslední drží tužku */
  ruce: Obd[];
  /** kam se dívá (posun očí) */
  pohled: Bod;
  /** lesk na skle: šikmé čárky jako na okenní tabulce */
  lesk: string;
  /** kde na zlaté blikne jiskra */
  jiskra: Bod;
}

/* ——— Mřížka 32: visí na šňůrce, vedle ní se vznáší tužka hrotem dolů ——— */
const S32: Predloha = {
  w: 32, h: 32, k: 1,
  deska: "M4.5 12 L13.5 6.4 L22.5 12 V28.8 Q22.5 30.4 20.9 30.4 H6.1 Q4.5 30.4 4.5 28.8 Z",
  strecha: "M2.4 13.1 L13.5 6.1 L24.6 13.1", strechaS: 1.7,
  dirka: [13.5, 10.3, 1.2],
  snurka: [[13.5, 10.3], [13.9, 6.6], [13.1, 4], [12.4, 1.9], [14.2, 0.9]], snurkaS: 1.5, dilek: 1.5, spicka: 0.9,
  oci: [[10.6, 17.2], [16.4, 17.2]], oko: [1.2, 1.5], odlesk: [-0.4, -0.55, 0.46],
  usta: "M12 20.3 Q13.5 21.7 15 20.3",
  pusa: null,
  tvare: [[8.3, 19.9], [18.7, 19.9]],
  radky: ["M7.6 24.7 H19.4", "M7.6 27.5 H15.2"], radkyS: 1.1,
  kvet: [19.2, 27.4],
  tuzka: { pata: [30.3, 16.4], hrot: [24.6, 29.8], s: 2.2 },
  ruce: [],
  pohled: [0, 0],
  lesk: "M18.9 16 L20.9 13.6 M20.5 16.4 L21.3 15.4",
  jiskra: [5.6, 12.4],
};
/* ——— Mřížka 32: vykukuje zpoza hrany (spodek kresby je hrana). Šňůrka vlaje, kouká stranou a pusu má do „ó“. ——— */
const V32: Predloha = {
  w: 32, h: 22, k: 1,
  deska: "M4.5 12.1 L13.5 6.5 L22.5 12.1 V26 H4.5 Z",
  strecha: "M2.4 13.2 L13.5 6.2 L24.6 13.2", strechaS: 1.7,
  dirka: [13.5, 10.4, 1.2],
  snurka: [[13.5, 10.4], [13.1, 6.6], [13.4, 4], [13.7, 1.2], [17, 1.5]], snurkaS: 1.5, dilek: 1.5, spicka: 0.9,
  oci: [[10.5, 16.1], [16.5, 16.1]], oko: [1.3, 1.6], odlesk: [-0.45, -0.6, 0.5],
  usta: null,
  pusa: [13.5, 19.7, 0.8, 0.95],
  tvare: [],
  radky: [], radkyS: 0,
  kvet: null,
  tuzka: { pata: [25.6, 24], hrot: [30, 8.4], s: 2.2 },
  ruce: [{ x: 2.2, y: 18.6, w: 5, h: 3.4, rx: 1.6 }, { x: 24, y: 18.6, w: 5.2, h: 3.4, rx: 1.6 }],
  pohled: [-0.5, 0.1],
  lesk: "M18.9 16.1 L20.9 13.7 M20.5 16.5 L21.3 15.5",
  jiskra: [5.6, 12.5],
};
/* ——— Mřížka 16: visí na šňůrce. Bez tužky a tvářiček, řádek textu jen jeden. Střed je na půlce bodu a šňůrka rovná, ať z ní v 16 px zbyde ostrý sloupec. ——— */
const S16: Predloha = {
  w: 16, h: 16, k: 0.5,
  deska: "M2.5 6.6 L7.5 3.6 L12.5 6.6 V14.5 Q12.5 15.5 11.5 15.5 H3.5 Q2.5 15.5 2.5 14.5 Z",
  strecha: "M1.2 7.3 L7.5 3.4 L13.8 7.3", strechaS: 1.3,
  dirka: [7.5, 5.9, 0.75],
  snurka: [[7.5, 5.9], [7.5, 4.5], [7.5, 3], [7.5, 1.8], [7.5, 0.6]], snurkaS: 1, dilek: 1, spicka: 1.4,
  oci: [[5.5, 8], [9.5, 8]], oko: [0.8, 0.95], odlesk: null,
  usta: "M5.6 10.4 Q7.5 12.7 9.4 10.4",
  pusa: null,
  tvare: [],
  radky: ["M4.6 13.5 H8.4"], radkyS: 1,
  kvet: [10.4, 13.5],
  tuzka: null,
  ruce: [],
  pohled: [0, 0],
  lesk: "M10.8 9.6 L11.6 8.6",
  jiskra: [3.2, 6.9],
};
const V16: Predloha = {
  w: 16, h: 11, k: 0.5,
  deska: "M2.5 6.3 L7.5 3.3 L12.5 6.3 V13 H2.5 Z",
  strecha: "M1.2 7 L7.5 3.1 L13.8 7", strechaS: 1.3,
  dirka: [7.5, 5.6, 0.75],
  snurka: [[7.5, 5.6], [7.5, 4.3], [7.5, 3], [7.5, 1.8], [7.5, 0.6]], snurkaS: 1, dilek: 1, spicka: 1.4,
  oci: [[5.5, 8], [9.5, 8]], oko: [0.8, 0.95], odlesk: null,
  usta: null,
  pusa: null,
  tvare: [],
  radky: [], radkyS: 0,
  kvet: null,
  tuzka: null,
  ruce: [{ x: 1.2, y: 9.3, w: 2.6, h: 1.7, rx: 0.8 }, { x: 11.2, y: 9.3, w: 2.6, h: 1.7, rx: 0.8 }],
  pohled: [-0.3, 0],
  lesk: "M10.8 8.6 L11.6 7.6",
  jiskra: [3.2, 6.6],
};

const PLATEK = "M0 0 C-2.5 -1.5 -4.1 -3.9 -4.2 -6.6 C-4.3 -9.4 -3.1 -11.5 -1.9 -12.6 L0 -9.5 L1.9 -12.6 C3.1 -11.5 4.3 -9.4 4.2 -6.6 C4.1 -3.9 2.5 -1.5 0 0 Z";
const HVEZDA = "M0 -1 Q0.18 -0.18 1 0 Q0.18 0.18 0 1 Q-0.18 0.18 -1 0 Q-0.18 -0.18 0 -1 Z";

const c = (n: number) => String(Math.round(n * 100) / 100);
const bod = ([x, y]: Bod) => `${c(x)} ${c(y)}`;
const obd = ({ x, y, w, h, rx }: Obd, atributy = "") => `<rect x="${c(x)}" y="${c(y)}" width="${c(w)}" height="${c(h)}" rx="${c(rx)}"${atributy}/>`;
const cesta = (d: string | null, atributy = "") => (d ? `<path d="${d}"${atributy}/>` : "");
const deska = (m: Predloha, atributy = "") => cesta(m.deska, `${atributy} stroke-linejoin="round"`);
/** Trám stříšky je tah, ne plocha: s je, o kolik je tlustší nebo tenčí než v předloze */
const strecha = (m: Predloha, barva: string, s = 0, atributy = "") =>
  cesta(m.strecha, ` stroke="${barva}" stroke-width="${c(m.strechaS + s)}" stroke-linecap="round" stroke-linejoin="round" fill="none"${atributy}`);
const dirka = (m: Predloha, atributy = "") => `<circle cx="${m.dirka[0]}" cy="${m.dirka[1]}" r="${m.dirka[2]}"${atributy}/>`;
const ruce = (m: Predloha, atributy = "") => m.ruce.map((r) => obd(r, atributy)).join("");
/**
 * Oči: dvě kulaté tečky, které mrkají (třída sp-oci jako u Pecinky); když
 * vykukuje, ještě se rozhlížejí ze strany na stranu (sc-kouk).
 */
const oci = (m: Predloha, barva: string, odlesk: string | null, atributy = "") =>
  `<g class="sc-kouk"${atributy}><g class="sp-oci">` +
  m.oci.map(([x, y]) => `<ellipse cx="${c(x + m.pohled[0])}" cy="${c(y + m.pohled[1])}" rx="${m.oko[0]}" ry="${m.oko[1]}" fill="${barva}"/>`).join("") +
  (odlesk && m.odlesk ? m.oci.map(([x, y]) => `<circle cx="${c(x + m.pohled[0] + m.odlesk![0])}" cy="${c(y + m.pohled[1] + m.odlesk![1])}" r="${m.odlesk![2]}" fill="${odlesk}"/>`).join("") : "") +
  `</g></g>`;
/** Úsměv: na malé mřížce je o něco tlustší než ostatní čáry, jinak by z něj nezbylo nic */
const usta = (m: Predloha, barva: string, s = 0.9, atributy = "") =>
  m.usta ? `<path d="${m.usta}" stroke="${barva}" stroke-width="${c(s * (m.k === 1 ? 1 : 0.8))}" stroke-linecap="round" fill="none"${atributy}/>` : "";
const pusa = (m: Predloha, atributy: string) => (m.pusa ? `<ellipse cx="${m.pusa[0]}" cy="${m.pusa[1]}" rx="${m.pusa[2]}" ry="${m.pusa[3]}"${atributy}/>` : "");
const tvare = (m: Predloha, barva: string, op: number) => m.tvare.map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1.5" ry="0.95" fill="${barva}" opacity="${op}"/>`).join("");
/**
 * Řádky „textu“: každý zvlášť, druhý je o něco tenčí a umí se smazat a
 * napsat znovu (sc-pise ve styles/schovka.css; kvůli tomu má délku jedna).
 * tah dostane pořadí řádku a vrátí barvu, s je, o kolik je tah tlustší.
 */
const radky = (m: Predloha, tah: (i: number) => string, s = 0) =>
  m.radky.map((d, i) => `<path${i ? ` class="sc-pise" pathLength="1"` : ""} d="${d}" stroke-width="${c(m.radkyS * (i ? 0.9 : 1) + s)}" stroke-linecap="round" fill="none"${tah(i)}/>`).join("");

/** délka oblouku šňůrky, ať dílky na cípu navazují na ty pod kloubem */
const delka = (a: Bod, o: Bod, z: Bod) => {
  let l = 0;
  let p = a;
  for (let i = 1; i <= 12; i++) {
    const t = i / 12, u = 1 - t;
    const q: Bod = [u * u * a[0] + 2 * u * t * o[0] + t * t * z[0], u * u * a[1] + 2 * u * t * o[1] + t * t * z[1]];
    l += Math.hypot(q[0] - p[0], q[1] - p[1]);
    p = q;
  }
  return l;
};
/**
 * Šňůrka: vychází z dírky, jde přes hřeben a nad ním se vlní. Dva oblouky,
 * každý ve své skupině — celá se kýve kolem dírky a cíp ještě kolem kloubu.
 * Středy si nesou s sebou v jednotkách kresby; hýbe se, když je
 * styles/schovka.css. Vrstvy (lem, barva, dílky) se kreslí každá přes obě
 * části, jinak by kulatý začátek cípu přikryl to, co je pod kloubem. Vrstva
 * dostane cestu, posun dílků (spočítaný od konce, ať šňůrka končí celým
 * červeným dílkem a na malé mřížce padnou dílky přesně na body)
 * a zakončení: u dírky je rovné, ať je pod šňůrkou dírka vidět, cíp je
 * kulatý. Průhlednost patří celé vrstvě (pruhlednost), ne tahům — ty se
 * v kloubu překrývají a ztmavly by tam.
 */
type Vrstva = (d: string, posun: number, konec: string) => string;
const snurka = (m: Predloha, vrstvy: Vrstva[], pruhlednost: (number | null)[] = []) => {
  const [a, o1, kloub, o2, z] = m.snurka;
  const l1 = delka(a, o1, kloub);
  const faze = (1 + m.spicka) * m.dilek - l1 - delka(kloub, o2, z);
  return vrstvy
    .map(
      (v, i) =>
        `<g class="sc-snurka" style="transform-origin:${a[0]}px ${a[1]}px"${pruhlednost[i] ? ` opacity="${pruhlednost[i]}"` : ""}>${v(`M${bod(a)} Q${bod(o1)} ${bod(kloub)}`, faze, "")}` +
        `<g class="sc-cip" style="transform-origin:${kloub[0]}px ${kloub[1]}px">${v(`M${bod(kloub)} Q${bod(o2)} ${bod(z)}`, faze + l1, ` stroke-linecap="round"`)}</g></g>`,
    )
    .join("");
};
/** Barva šňůrky (s je, o kolik je tah tlustší — na lem) a přes ni dílky druhé barvy: z toho je kroucená */
const snura = (m: Predloha, barva: string, s = 0): Vrstva => (d, _, konec) => `<path d="${d}" stroke="${barva}" stroke-width="${c(m.snurkaS + s)}" fill="none"${konec}/>`;
const dilky = (m: Predloha, barva: string, delsi = 1, posunout = 0): Vrstva => (d, posun) =>
  `<path d="${d}" stroke="${barva}" stroke-width="${c(m.snurkaS)}" stroke-dasharray="${c(m.dilek * delsi)} ${c(m.dilek * (2 - delsi))}" stroke-dashoffset="${c(posun + m.dilek * posunout)}" fill="none"/>`;

interface TuzkaCasti {
  /** celý obrys od gumy po hrot */
  obrys: string;
  guma: string;
  objimka: string;
  telo: string;
  kuzel: string;
  tuha: string;
  /** tuha uvnitř, od hrotu k objímce (je vidět jen ve skle) */
  osa: string;
}
/**
 * Tužka: kreslí se nastojato od patky (v nule) k hrotu a pak se posune
 * a nakloní. Občas zakmitá, jako když píše (sc-tuzka ve
 * styles/schovka.css) — kolem ruky, která ji drží, a když se vznáší sama,
 * kolem místa, kde by ji ruka držela.
 */
const tuzka = (m: Predloha, kresli: (t: TuzkaCasti, s: number) => string) => {
  if (!m.tuzka) return "";
  const { pata, hrot, s } = m.tuzka;
  const dx = hrot[0] - pata[0], dy = hrot[1] - pata[1];
  const l = Math.hypot(dx, dy), a = s / 2, r = a * 0.7;
  /* guma, objímka a kužel ořezaného dřeva */
  const g = s * 0.75, o = s * 0.36, k = s * 1.35;
  const t: TuzkaCasti = {
    obrys: `M${c(-a)} ${c(k - l)} L0 ${c(-l)} L${c(a)} ${c(k - l)} V${c(-r)} Q${c(a)} 0 ${c(a - r)} 0 H${c(r - a)} Q${c(-a)} 0 ${c(-a)} ${c(-r)} Z`,
    guma: `M${c(-a)} ${c(-g)} V${c(-r)} Q${c(-a)} 0 ${c(r - a)} 0 H${c(a - r)} Q${c(a)} 0 ${c(a)} ${c(-r)} V${c(-g)} Z`,
    objimka: `M${c(-a)} ${c(-g - o)} H${c(a)} V${c(-g)} H${c(-a)} Z`,
    telo: `M${c(-a)} ${c(k - l)} H${c(a)} V${c(-g - o)} H${c(-a)} Z`,
    kuzel: `M${c(-a)} ${c(k - l)} L0 ${c(-l)} L${c(a)} ${c(k - l)} Z`,
    tuha: `M${c(-a * 0.5)} ${c(k * 0.5 - l)} L0 ${c(-l)} L${c(a * 0.5)} ${c(k * 0.5 - l)} Z`,
    osa: `M0 ${c(k * 0.5 - l)} V${c(-g - o)}`,
  };
  const ruka = m.ruce[m.ruce.length - 1];
  const stred = ruka ? `${c(ruka.x + ruka.w / 2)}px ${c(ruka.y + ruka.h / 2)}px` : `${c(hrot[0] - dx * 0.4)}px ${c(hrot[1] - dy * 0.4)}px`;
  return `<g class="sc-tuzka" style="transform-origin:${stred}"><g transform="translate(${bod(pata)}) rotate(${c((Math.atan2(dx, -dy) * 180) / Math.PI)})">${kresli(t, s)}</g></g>`;
};
/** Květ z loga jako razítko za druhým řádkem: pět plátků, na malé mřížce jen tečka se středem */
const kvet = (m: Predloha, vypln: string, okraj: string, stred: string) => {
  if (!m.kvet) return "";
  const [x, y] = m.kvet;
  if (m.k !== 1) return `<circle cx="${x}" cy="${y}" r="0.85" fill="${vypln}"/><circle cx="${x}" cy="${y}" r="0.36" fill="${stred}"/>`;
  return (
    `<g transform="translate(${x} ${y}) scale(0.13)" fill="${vypln}" stroke="${okraj}" stroke-width="1.6" stroke-linejoin="round">` +
    [0, 72, 144, 216, 288].map((u) => `<path d="${PLATEK}" transform="rotate(${u + 14}) translate(0 -1.7)"/>`).join("") +
    `</g><circle cx="${x}" cy="${y}" r="0.45" fill="${stred}"/>`
  );
};
/** Výřez na tvar destičky: světlo na hraně nesmí přetéct přes okraj */
const vyrez = (m: Predloha, id: string) => `<clipPath id="${id}-c"><path d="${m.deska}"/></clipPath>`;
/** O kolik níž než trám leží čára těsně pod ním (trám je šikmý, proto víc než půlka tloušťky) */
const podTramem = (m: Predloha, o: number) => c((m.strechaS / 2 + o) * 1.18);

/* ═══ Černá: silueta jako vyřezaný erb, detaily jsou díry ═══ */
const cerna = (m: Predloha, id: string) => {
  const k = m.k;
  const tus = "#1E1A18";
  const plocha = `x="-2" y="-2" width="${m.w + 4}" height="${m.h + 6}"`;
  /* maska je celá bílá, černé jsou jen díry */
  let maska = `<rect ${plocha} fill="#fff"/>`;
  /* spára pod trámem oddělí stříšku od štítu */
  maska += cesta(m.strecha, ` stroke="#000" stroke-width="${c(0.8 * k)}" stroke-linejoin="round" fill="none" transform="translate(0 ${podTramem(m, 0.4 * k)})"`);
  maska += dirka(m, ` fill="#000"`);
  maska += oci(m, "#000", "#fff");
  maska += usta(m, "#000");
  maska += pusa(m, ` fill="#000"`);
  maska += radky(m, () => ` stroke="#000"`);
  /* šňůrka se od štítu a trámu oddělí mezerou po obou stranách (hýbe se s ní) */
  maska += snurka(m, [snura(m, "#000", 1.3 * k)]);
  /* ručky se od destičky i od tužky oddělí mezerou, ať je vidět, že se drží */
  maska += ruce(m, ` fill="#fff" stroke="#000" stroke-width="${c(0.9 * k)}"`);
  return (
    `<defs><mask id="${id}-m" maskUnits="userSpaceOnUse" ${plocha}>${maska}</mask></defs>` +
    `<g fill="${tus}" mask="url(#${id}-m)">` +
    /* tužka z kusů: guma, tělo a hrot, mezi nimi mezery */
    tuzka(m, (t, s) => cesta(t.guma) + cesta(t.telo) + `<g transform="translate(0 ${c(-s * 0.2)})">${cesta(t.kuzel)}</g>`) +
    deska(m) +
    strecha(m, tus) +
    ruce(m) +
    `</g>` +
    /* šňůrka z dílků tuše: mezery mezi nimi jsou to kroucení, poslední dílek je celý */
    snurka(m, [dilky(m, tus, 1.5, 0.5 - m.spicka)])
  );
};

/* ═══ Průhledná: skleněná destička, jen šňůrka zůstala barevná ═══ */
const pruhledna = (m: Predloha, id: string) => {
  const k = m.k;
  const vlasek = `stroke="#2B2420" stroke-opacity="0.42" stroke-width="${c(1.6 * k)}"`;
  const bila = `stroke="#FFFFFF" stroke-opacity="0.95" stroke-width="${c(0.75 * k)}"`;
  let s =
    `<defs><linearGradient id="${id}-l" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="#FFFFFF" stop-opacity="0.5"/><stop offset="0.42" stop-color="#FFFFFF" stop-opacity="0.1"/><stop offset="0.8" stop-color="#D8E8F4" stop-opacity="0.16"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0.3"/></linearGradient></defs>`;
  s += tuzka(
    m,
    (t) =>
      cesta(t.obrys, ` fill="url(#${id}-l)" ${vlasek} stroke-linejoin="round"`) +
      cesta(t.obrys, ` fill="none" ${bila} stroke-linejoin="round"`) +
      /* tuha je vidět skrz */
      cesta(t.osa, ` stroke="#2B2420" stroke-opacity="0.5" stroke-width="0.5" fill="none"`) +
      cesta(t.tuha, ` fill="#2B2420" fill-opacity="0.62"`),
  );
  s += deska(m, ` fill="url(#${id}-l)" ${vlasek}`) + deska(m, ` fill="none" ${bila}`);
  /* dírka je vidět skrz naskrz */
  s += dirka(m, ` fill="none" ${vlasek}`) + dirka(m, ` fill="none" ${bila}`);
  /* řádky vyleptané do skla */
  s += radky(m, () => ` stroke="#2B2420" stroke-opacity="0.42"`, 0.7 * k) + radky(m, () => ` stroke="#FFFFFF"`, -0.25 * k);
  s += oci(m, "#2B2420", "#FFFFFF", ` fill-opacity="0.62"`);
  s += usta(m, "#2B2420", 1.4, ` stroke-opacity="0.5"`) + usta(m, "#FFFFFF", 0.7);
  s += pusa(m, ` fill="#2B2420" fill-opacity="0.5" stroke="#FFFFFF" stroke-width="0.45"`);
  /* stříška z mléčného skla */
  s += strecha(m, "#2B2420", 1 * k, ` stroke-opacity="0.42"`) + strecha(m, "#FFFFFF", -0.3 * k, ` stroke-opacity="0.9"`);
  /* šňůrka: jediné místo, kde ve skle zůstala barva */
  s += snurka(m, [snura(m, "#2B2420", 0.9 * k), snura(m, "#C4553A"), dilky(m, "#FBF7EE")], [0.42]);
  /* lesk: dvě šikmé čárky jako na okenní tabulce */
  s += `<path d="${m.lesk}" stroke="#FFFFFF" stroke-width="${c(1 * k)}" fill="none" stroke-linecap="round"/>`;
  s += ruce(m, ` fill="url(#${id}-l)" ${vlasek}`) + ruce(m, ` fill="none" ${bila}`);
  return s;
};

/* ═══ Zlatá: zlatý štítek s hranou, vyrytými řádky a jiskrou ═══ */
const zlata = (m: Predloha, id: string) => {
  const k = m.k;
  let s =
    `<defs><linearGradient id="${id}-z" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="#FFF2BC"/><stop offset="0.32" stop-color="#F2C95E"/><stop offset="0.68" stop-color="#C9922E"/><stop offset="1" stop-color="#8E6418"/></linearGradient>` +
    `<linearGradient id="${id}-k" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E2B552"/><stop offset="0.5" stop-color="#A9781E"/><stop offset="1" stop-color="#6E4A12"/></linearGradient>` +
    `<linearGradient id="${id}-h" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFBEA"/><stop offset="0.5" stop-color="#FFFBEA" stop-opacity="0"/></linearGradient>` +
    vyrez(m, id) +
    `</defs>`;
  s += tuzka(
    m,
    (t) =>
      cesta(t.obrys, ` fill="url(#${id}-z)" stroke="#6E4A12" stroke-width="${c(0.8 * k)}" stroke-linejoin="round"`) +
      cesta(t.guma, ` fill="#A9781E"`) +
      cesta(t.objimka, ` fill="#FFF2BC"`) +
      cesta(t.kuzel, ` fill="#FFF2BC"`) +
      cesta(t.tuha, ` fill="#3E2606"`) +
      cesta(t.obrys, ` fill="none" stroke="#6E4A12" stroke-width="${c(0.8 * k)}" stroke-linejoin="round"`),
  );
  s += deska(m, ` fill="url(#${id}-z)" stroke="#6E4A12" stroke-width="${c(0.95 * k)}"`);
  /* hrana, na kterou padá světlo */
  s += `<g clip-path="url(#${id}-c)">${deska(m, ` fill="none" stroke="url(#${id}-h)" stroke-width="${c(3.4 * k)}"`)}</g>`;
  s += dirka(m, ` fill="#5E3E0C"`);
  /* řádky vyryté do kovu: tmavá rýha a pod ní světlá hrana */
  s += `<g transform="translate(0 ${c(0.4 * k)})" opacity="0.55">${radky(m, () => ` stroke="#FFF8DC"`)}</g>` + radky(m, (i) => ` stroke="#7A5214" opacity="${i ? 0.7 : 0.9}"`);
  s += tvare(m, "#FFE29A", 0.75);
  s += oci(m, "#3E2606", "#FFF8DC");
  s += usta(m, "#3E2606");
  s += pusa(m, ` fill="#3E2606"`);
  /* stříška z tmavšího zlata, nahoře světlá hrana */
  s += strecha(m, "#5E3E0C", 0.9 * k) + strecha(m, `url(#${id}-k)`);
  s += strecha(m, "#FFF2BC", 0.45 * k - m.strechaS, ` opacity="0.8" transform="translate(0 ${c(-0.3 * k)})"`);
  /* šňůrka ze zlatého dracounu */
  s += snurka(m, [snura(m, "#7A5214", 0.9 * k), snura(m, "#FFF2C4"), dilky(m, "#C99A3E")]);
  s += ruce(m, ` fill="url(#${id}-z)" stroke="#6E4A12" stroke-width="${c(0.95 * k)}"`);
  /* jiskra: čtyřcípá hvězdička na okapu, občas blikne */
  s += `<g transform="translate(${m.jiskra[0]} ${m.jiskra[1]}) scale(${c(2.6 * k)})"><path class="sp-jiskra" d="${HVEZDA}" fill="#FFFFFF"/></g>`;
  return s;
};

/* ═══ Barvy loga: soumrak ze značky, stříška v barvě noci a místo podpisu sakura ═══ */
const logo = (m: Predloha, id: string) => {
  const k = m.k;
  let s =
    `<defs><linearGradient id="${id}-s" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="#C4432B"/><stop offset="0.36" stop-color="#C0708A"/><stop offset="0.7" stop-color="#7A5E8E"/><stop offset="1" stop-color="#3E3C78"/></linearGradient>` +
    /* krémová na tužku (na malé mřížce tužka není) */
    (m.tuzka ? `<linearGradient id="${id}-b" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFF6DC"/><stop offset="0.55" stop-color="#FBE9B7"/><stop offset="1" stop-color="#E2B95A"/></linearGradient>` : "") +
    `</defs>`;
  /* tužka krémová se zlatým lemem, píše rumělkou */
  s += tuzka(
    m,
    (t) =>
      cesta(t.obrys, ` fill="url(#${id}-b)"`) +
      cesta(t.guma, ` fill="#C0708A"`) +
      cesta(t.objimka, ` fill="#E2B95A"`) +
      cesta(t.kuzel, ` fill="#FFF6DC"`) +
      cesta(t.tuha, ` fill="#C4432B"`) +
      cesta(t.obrys, ` fill="none" stroke="#B8862A" stroke-width="${c(0.7 * k)}" stroke-linejoin="round"`),
  );
  s += deska(m, ` fill="url(#${id}-s)" stroke="#2A2C5E" stroke-opacity="0.9" stroke-width="${c(0.95 * k)}"`);
  s += dirka(m, ` fill="#2A2C5E"`);
  s += radky(m, (i) => ` stroke="#FBE9B7" opacity="${i ? 0.7 : 0.95}"`);
  /* razítko za podpisem: květ z loga, pět plátků se zlatým lemem, uprostřed rumělka */
  s += kvet(m, "#FBE9B7", "#E2B95A", "#C4432B");
  s += tvare(m, "#F7CFCB", 0.55);
  s += oci(m, "#2A2C5E", "#FBE9B7");
  s += usta(m, "#FBE9B7");
  s += pusa(m, ` fill="#2A2C5E" stroke="#FBE9B7" stroke-width="0.45"`);
  /* stříška v barvě noci, nahoře krémová hrana */
  s += strecha(m, "#1E2048", 0.9 * k) + strecha(m, "#2A2C5E");
  s += strecha(m, "#FBE9B7", 0.45 * k - m.strechaS, ` opacity="0.85" transform="translate(0 ${c(-0.3 * k)})"`);
  /* šňůrka je červenobílá odjakživa: rumělka a krémová ze značky, k tomu zlatý lem */
  s += snurka(m, [snura(m, "#B8862A", 0.9 * k), snura(m, "#C4432B"), dilky(m, "#FBE9B7")]);
  s += ruce(m, ` fill="#C0708A" stroke="#2A2C5E" stroke-opacity="0.9" stroke-width="${c(0.95 * k)}"`);
  return s;
};

const KRESBY: Record<SchovkaBarva, (m: Predloha, id: string) => string> = { cerna, pruhledna, zlata, logo };

let citac = 0;

/** Cedulka na schovávanou jako SVG text */
export function cedulkaSchovka({ barva = "logo", velikost = 32, poza = "stoji", id, trida = "", zpozdeni }: SchovkaVolby = {}) {
  const velka = velikost >= VELKA_OD;
  const m = poza === "vykukuje" ? (velka ? V32 : V16) : velka ? S32 : S16;
  const pid = id ?? `sc${(citac++).toString(36)}`;
  /* posun animací podle id, ať se dvě Cedulky na stránce nehoupou naráz */
  const z = zpozdeni ?? -([...pid].reduce((a, znak) => (a * 31 + znak.charCodeAt(0)) % 997, 7) % 53) / 10;
  const vyska = Math.round((velikost * m.h) / m.w * 100) / 100;
  const kresba = KRESBY[barva](m, pid);
  const [zx, zy] = m.snurka[4];
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" class="schovka schovka-cedulka schovka-${barva} schovka-${poza} ${trida}" viewBox="0 0 ${m.w} ${m.h}" width="${velikost}" height="${vyska}" style="--sp-z:${c(z)}s" fill="none" aria-hidden="true" focusable="false">` +
    /* houpe se jen ta, co visí — z konce šňůrky, jako kyvadlo; vykukující se o hranu ořízne, ať pod ní destička nepřečuhuje */
    (poza === "vykukuje"
      ? `<clipPath id="${pid}-o"><rect x="-4" y="-4" width="${m.w + 8}" height="${m.h + 4}"/></clipPath><g clip-path="url(#${pid}-o)">${kresba}</g>`
      : `<g class="sc-houpe" style="transform-origin:${zx}px ${zy}px">${kresba}</g>`) +
    `</svg>`
  );
}
