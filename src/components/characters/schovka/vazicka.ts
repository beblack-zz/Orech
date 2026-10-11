/**
 * Vázička na schovávanou — zjednodušená kresba pro hry na hledání po webu,
 * sestra Pecinky z ./pecinka.ts, Bublinky z ./bublinka.ts, Střípka ze
 * ./stripek.ts, Hlínky z ./hlinka.ts a Cedulky z ./cedulka.ts (stejné barvy,
 * pózy i volby, takže je hra může střídat). Váza jako gejša: úzké hrdlo je
 * černá glazura a zároveň účes, baňaté tělo bílý porcelán s tváří, spodní
 * půlka kimono se zkříženým límcem a širokým pásem obi. Ve vlasech má
 * kanzashi — květ sakury, ze kterého visí šňůrka s lístky — a napříč hrdlem
 * jehlici s korálky, z hrdla jí roste větvička sakury a stojí na okobo.
 * Větvička ji při schovávané prozradí: trčí z úkrytu jako první.
 *
 * Je vždycky malá (16–64 px), a proto má dvě optické velikosti: kresbu na
 * mřížce 32 pro velikost od 22 px nahoru a zvlášť kreslenou na mřížce 16
 * pro úplně malou — tam zbyde jen váza s černým hrdlem, dvě čárky očí, pás
 * obi, okobo a jediný květ.
 *
 * Čtyři barvy, každá řešená zvlášť (ne jen přebarvená):
 *   cerna      silueta jako vyřezaný erb: tvář a pás obi jsou díry, v tváři
 *              zůstaly oči a ústa a přes ni visí šňůrka kanzashi; květ ve
 *              vlasech a okobo dělí od vázy spára
 *   pruhledna  skleněná váza: bílá linka s tmavým vláskem a lesk, hrdlo
 *              z kouřového skla, kimono jen nadechnuté; květy zůstaly do
 *              růžova — nejtěžší k nalezení, a právě ty ji prozradí
 *   zlata      celá ze zlata: kov s hranou, na kterou padá světlo, vlasy
 *              a obi z tmavšího, tvář ze světlého a jiskra, co občas blikne
 *   logo       barvy značky: černé hrdlo, bílá tvář, kimono v barvě noci,
 *              rumělkový límec a obi se zlatou šňůrkou, ve vlasech květ
 *              sakury z loga
 *
 * Dvě pózy: `stoji` (stojí na okobo, víčka sklopená) a `vykukuje` — kouká
 * zpoza hrany, o kterou se drží ručkama, a to už má oči otevřené. Nad hranou
 * je hlavně hrdlo s květy a půl tváře. Vykukující kresba je nižší (spodek je
 * hrana, za kterou se schovává), hra ji staví spodkem na horní okraj čehokoli.
 *
 * Generátor vrací SVG jako text, takže jde použít při sestavení stránky
 * (Vazicka.astro) i za běhu ve hře. Pohyb (kývání větvičky, houpání šňůrky,
 * mrkání, jiskra) je v styles/schovka.css; bez něj zůstane hezký nehybný
 * obrázek.
 */
import { VELKA_OD } from "./pecinka";
import type { SchovkaBarva, SchovkaVolby } from "./pecinka";

/** květ: střed a měřítko plátku */
type Kvet = [number, number, number];
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
  /** obrys vázy: rozšířený okraj hrdla, úzký krk, baňaté tělo a pata */
  vaza: string;
  /** vlasy: černá glazura přes hrdlo a kousek na ramena, vepředu výš, na spáncích níž (ořezává se obrysem vázy) */
  vlasy: string;
  /** kimono: všechno pod zkříženým límcem (vykukující ho má za hranou) */
  kimono: string | null;
  /** límec do písmene y: spodní díl zleva a svrchní zprava, který ho překrývá a dojde až k obi (jen na velké mřížce) */
  limec: [string, string] | null;
  /** široký pás obi a šňůrka přes něj */
  obi: string | null;
  snura: string | null;
  /** okobo: dva špalíčky pod patou a červené pásky přes ně */
  okobo: string | null;
  pasky: string | null;
  /** spodní hrana paty, kterou váza na okobo dosedá (na černé je tam spára) */
  pata: string | null;
  /** větvička: odkud z hrdla roste (kolem toho se kývá), stonek s odbočkami a jeho tloušťka */
  hrdlo: [number, number];
  stonek: string;
  stonekS: number;
  /** květy na větvičce (první je ten velký na konci) a poupě: střed a poloměr */
  kvety: Kvet[];
  poupe: [number, number, number] | null;
  /** kanzashi ve vlasech: květ a šňůrka s lístky — úchyt, kolem kterého se houpe, a délka (jen na velké mřížce) */
  kanzashi: Kvet | null;
  snurka: [number, number, number] | null;
  /** jehlice napříč hrdlem: výška, levý a pravý konec a poloměr korálku */
  jehlice: [number, number, number, number] | null;
  /** sklopená víčka, když stojí (obloučky, na malé mřížce čárky), a jejich tloušťka */
  vicka: string | null;
  vickaS: number;
  /** otevřené oči, když vykukuje: středy, poloosy a odlesk (posun a poloměr) */
  oci: [number, number][];
  oko: [number, number];
  odlesk: [number, number, number] | null;
  /** rumělka ve vnějších koutcích očí */
  koutky: string | null;
  /** ústa jako poupě (plný tvar, ne tah) */
  usta: string | null;
  tvare: [number, number][];
  /** lesk na glazuře podél levého boku */
  lesk: string;
  ruce: Obd[];
  /** kam se dívá (posun očí) */
  pohled: [number, number];
  /** kde na zlatém blikne jiskra */
  jiskra: [number, number];
}

/* ——— Mřížka 32: stojí na okobo, víčka sklopená ——— */
const S32: Predloha = {
  w: 32, h: 32, k: 1,
  vaza: "M11.4 7.7 Q16 6.8 20.6 7.7 C20.6 8.7 19 8.9 19 10 C19 11.6 20.6 11.9 22.4 12.9 C24.4 14 25.8 16.6 25.8 19.6 C25.8 23.6 22.6 25.2 21.2 27.2 H10.8 C9.4 25.2 6.2 23.6 6.2 19.6 C6.2 16.6 7.6 14 9.6 12.9 C11.4 11.9 13 11.6 13 10 C13 8.9 11.4 8.7 11.4 7.7 Z",
  vlasy: "M3 16.4 Q16 9.8 29 16.4 V5 H3 Z",
  kimono: "M3 15.1 L15.6 20.7 L29 15.3 V30 H3 Z",
  limec: ["M3 15.1 L15.6 20.7", "M29 15.3 L13 21.75"],
  obi: "M3 20.6 Q16 22.8 29 20.6 V24.2 Q16 26.4 3 24.2 Z",
  snura: "M3 22.4 Q16 24.6 29 22.4",
  okobo: "M10.6 27.2 H15.3 L14.7 31.2 H11.2 Z M16.7 27.2 H21.4 L20.8 31.2 H17.3 Z",
  pasky: "M11.1 28.6 H14.9 M17.1 28.6 H20.9",
  pata: "M10.4 27.2 H21.6",
  hrdlo: [16, 7.4],
  stonek: "M16 7.6 C16 5.6 17.4 3.8 19.8 3 M16.5 5.3 Q15.8 4.6 15 4.3 M17.3 4.5 Q18.6 4.8 19.3 5.7", stonekS: 0.8,
  kvety: [[20.5, 2.7, 0.17], [14.5, 3.9, 0.125]],
  poupe: [19.6, 6.1, 0.75],
  kanzashi: [11.4, 11, 0.15],
  snurka: [9.6, 12.8, 2.9],
  jehlice: [9.2, 9.7, 22.3, 0.9],
  vicka: "M12.1 15.9 Q13.4 17.2 14.7 15.9 M17.3 15.9 Q18.6 17.2 19.9 15.9", vickaS: 0.95,
  oci: [], oko: [0, 0], odlesk: null,
  koutky: "M11.4 15.7 L10.9 15 M20.6 15.7 L21.1 15",
  usta: "M15.2 18.4 Q16 17.9 16.8 18.4 Q16 19.8 15.2 18.4 Z",
  tvare: [[12.1, 17.6], [19.9, 17.6]],
  lesk: "M8.9 17.9 Q8.3 19.8 8.9 21.7",
  ruce: [],
  pohled: [0, 0],
  jiskra: [9.9, 14.5],
};
/* ——— Mřížka 32: vykukuje zpoza hrany (spodek kresby je hrana), oči má otevřené; kimono, obi i okobo zůstaly za hranou ——— */
const V32: Predloha = {
  w: 32, h: 20, k: 1,
  vaza: S32.vaza,
  vlasy: S32.vlasy,
  kimono: null,
  limec: null,
  obi: null,
  snura: null,
  okobo: null,
  pasky: null,
  pata: null,
  hrdlo: S32.hrdlo,
  stonek: S32.stonek, stonekS: S32.stonekS,
  kvety: S32.kvety,
  poupe: S32.poupe,
  kanzashi: S32.kanzashi,
  snurka: S32.snurka,
  jehlice: S32.jehlice,
  vicka: null, vickaS: 0,
  oci: [[13.3, 16.4], [18.7, 16.4]], oko: [1.15, 1.4], odlesk: [-0.4, -0.5, 0.45],
  koutky: "M11.3 16 L10.7 15.2 M19.8 16 L20.4 15.2",
  usta: null,
  tvare: [],
  lesk: "M8.9 17.4 Q8.6 18.4 8.7 19.4",
  ruce: [{ x: 4.6, y: 16.7, w: 4.8, h: 3.4, rx: 1.6 }, { x: 22.6, y: 16.7, w: 4.8, h: 3.4, rx: 1.6 }],
  pohled: [-0.45, 0.1],
  jiskra: [9.9, 14.5],
};
/* ——— Mřížka 16: stojí. Bez límce, šňůrky, jehlice i kanzashi; oči dvě čárky, květ jediný. ——— */
const S16: Predloha = {
  w: 16, h: 16, k: 0.5,
  vaza: "M5.5 3.9 Q8 3.4 10.5 3.9 C10.5 4.5 9.8 4.5 9.8 5.1 C9.8 5.9 10.6 6 11.5 6.5 C12.6 7.1 13.2 8.4 13.2 9.9 C13.2 11.9 11.5 12.7 10.8 13.7 H5.2 C4.5 12.7 2.8 11.9 2.8 9.9 C2.8 8.4 3.4 7.1 4.5 6.5 C5.4 6 6.2 5.9 6.2 5.1 C6.2 4.5 5.5 4.5 5.5 3.9 Z",
  vlasy: "M1 8.2 Q8 5.2 15 8.2 V2 H1 Z",
  kimono: "M1 8.8 L8 10.8 L15 8.8 V15 H1 Z",
  limec: null,
  obi: "M1 10.2 Q8 11.2 15 10.2 V12 Q8 13 1 12 Z",
  snura: null,
  okobo: "M5.4 13.7 H7.6 L7.4 15.6 H5.6 Z M8.4 13.7 H10.6 L10.4 15.6 H8.6 Z",
  pasky: null,
  pata: "M5 13.7 H11",
  hrdlo: [8, 3.8],
  stonek: "M8 3.9 Q8.1 2.9 9.2 2.3", stonekS: 0.7,
  kvety: [[9.9, 1.9, 0.125]],
  poupe: null,
  kanzashi: null,
  snurka: null,
  jehlice: null,
  vicka: "M5 8.5 h2 M9 8.5 h2", vickaS: 1,
  oci: [], oko: [0, 0], odlesk: null,
  koutky: null,
  usta: null,
  tvare: [],
  lesk: "M4.2 9.1 Q3.9 10 4.2 10.9",
  ruce: [],
  pohled: [0, 0],
  jiskra: [5, 7.3],
};
const V16: Predloha = {
  w: 16, h: 10, k: 0.5,
  vaza: S16.vaza,
  vlasy: S16.vlasy,
  kimono: null,
  limec: null,
  obi: null,
  snura: null,
  okobo: null,
  pasky: null,
  pata: null,
  hrdlo: S16.hrdlo,
  stonek: S16.stonek, stonekS: S16.stonekS,
  kvety: S16.kvety,
  poupe: null,
  kanzashi: null,
  snurka: null,
  jehlice: null,
  vicka: null, vickaS: 0,
  oci: [[6.3, 8.4], [9.7, 8.4]], oko: [0.75, 0.95], odlesk: null,
  koutky: null,
  usta: null,
  tvare: [],
  lesk: "M4.3 8.4 Q4.2 9 4.2 9.6",
  ruce: [{ x: 1.9, y: 8.3, w: 2.6, h: 1.7, rx: 0.8 }, { x: 11.5, y: 8.3, w: 2.6, h: 1.7, rx: 0.8 }],
  pohled: [-0.3, 0],
  jiskra: [5, 7.3],
};

const PLATEK = "M0 0 C-2.5 -1.5 -4.1 -3.9 -4.2 -6.6 C-4.3 -9.4 -3.1 -11.5 -1.9 -12.6 L0 -9.5 L1.9 -12.6 C3.1 -11.5 4.3 -9.4 4.2 -6.6 C4.1 -3.9 2.5 -1.5 0 0 Z";
const HVEZDA = "M0 -1 Q0.18 -0.18 1 0 Q0.18 0.18 0 1 Q-0.18 0.18 -1 0 Q-0.18 -0.18 0 -1 Z";

const c = (n: number) => String(Math.round(n * 100) / 100);
const obd = ({ x, y, w, h, rx }: Obd, atributy = "") => `<rect x="${c(x)}" y="${c(y)}" width="${c(w)}" height="${c(h)}" rx="${c(rx)}"${atributy}/>`;
const cesta = (d: string | null, atributy = "") => (d ? `<path d="${d}"${atributy}/>` : "");
const ruce = (m: Predloha, atributy = "") => m.ruce.map((r) => obd(r, atributy)).join("");
/**
 * Plátek a květ sakury ze značky (pět plátků kolem středu) jako kusy, na
 * které se kresba odkazuje: květů je v ní víc, lístky na šňůrce jsou tytéž
 * plátky a cesta plátku je dlouhá. Barvu dostanou až tam, kde se použijí.
 */
const kvetDefs = (id: string) =>
  `<path id="${id}-q" d="${PLATEK}"/><g id="${id}-f">` +
  [0, 72, 144, 216, 288].map((u) => `<use href="#${id}-q" transform="rotate(${u + 14}) translate(0 -1.7)"/>`).join("") +
  `</g>`;
/** Obrys plátků: tloušťka je v jednotkách mřížky, i když je květ zmenšený */
const lem = ([, , s]: Kvet, barva: string, t: number) => ` stroke="${barva}" stroke-width="${c(t / s)}" stroke-linejoin="round"`;
/** Květ: střed a měřítko, uprostřed tečka */
const kvet = (id: string, [x, y, s]: Kvet, atributy: string, stred: string | null = null) =>
  `<use href="#${id}-f" transform="translate(${x} ${y}) scale(${s})"${atributy}/>` + (stred ? `<circle cx="${x}" cy="${y}" r="${c(s * 3.3)}" fill="${stred}"/>` : "");
const kvety = (m: Predloha, id: string, atributy: (k: Kvet) => string, stred: string | null = null) => m.kvety.map((k) => kvet(id, k, atributy(k), stred)).join("");
const poupe = (m: Predloha, atributy: string) => (m.poupe ? `<circle cx="${m.poupe[0]}" cy="${m.poupe[1]}" r="${m.poupe[2]}"${atributy}/>` : "");
const stonek = (m: Predloha, barva: string, s = 1, atributy = "") => cesta(m.stonek, ` stroke="${barva}" stroke-width="${c(m.stonekS * s)}" stroke-linecap="round" fill="none"${atributy}`);
/**
 * Větvička z hrdla se kývá kolem místa, kde z něj roste. Střed otáčení si
 * nese s sebou v jednotkách kresby (ne v procentech obrysu — hrdlo neleží
 * v jeho rohu ani uprostřed); hýbe se, když je styles/schovka.css.
 */
const vetvicka = (m: Predloha, obsah: string, atributy = "") => `<g class="sv-vetvicka" style="transform-origin:${m.hrdlo[0]}px ${m.hrdlo[1]}px"${atributy}>${obsah}</g>`;
/**
 * Šňůrka s lístky, co visí z kanzashi: houpe se kolem úchytu, jiným tempem
 * než větvička. nit jsou atributy tahu, listek dostane pořadí a vrátí
 * atributy lístku (ten je plátek květu špičkou dolů).
 */
const snurka = (m: Predloha, id: string, nit: string, listek: (i: number) => string) => {
  if (!m.snurka) return "";
  const [x, y, d] = m.snurka;
  return (
    `<g class="sv-snurka" style="transform-origin:${x}px ${y}px"><path d="M${x} ${y} v${d}"${nit} fill="none"/>` +
    [0.5, 1].map((q, i) => `<use href="#${id}-q" transform="translate(${x} ${c(y + d * q - 0.55)}) scale(0.095) rotate(180)"${listek(i)}/>`).join("") +
    `</g>`
  );
};
/** Jehlice napříč hrdlem: tyčka je schovaná za ním, ven koukají jen konce s korálky */
const jehlice = (m: Predloha, tyc: string, koralek: string) => {
  if (!m.jehlice) return "";
  const [y, x1, x2, r] = m.jehlice;
  return `<path d="M${x1} ${y} H${x2}"${tyc} fill="none"/>` + [x1, x2].map((x) => `<circle cx="${x}" cy="${y}" r="${r}"${koralek}/>`).join("");
};
/** Oči: sklopená víčka, když stojí; otevřené tečky, které mrkají, když vykukuje. */
const oci = (m: Predloha, barva: string, odlesk: string | null) =>
  m.vicka
    ? `<path d="${m.vicka}" stroke="${barva}" stroke-width="${c(m.vickaS)}"${m.k === 1 ? ` stroke-linecap="round"` : ""} fill="none"/>`
    : `<g class="sp-oci">` +
      m.oci.map(([x, y]) => `<ellipse cx="${c(x + m.pohled[0])}" cy="${c(y + m.pohled[1])}" rx="${m.oko[0]}" ry="${m.oko[1]}" fill="${barva}"/>`).join("") +
      (odlesk && m.odlesk ? m.oci.map(([x, y]) => `<circle cx="${c(x + m.pohled[0] + m.odlesk![0])}" cy="${c(y + m.pohled[1] + m.odlesk![1])}" r="${m.odlesk![2]}" fill="${odlesk}"/>`).join("") : "") +
      `</g>`;
const koutky = (m: Predloha, barva: string) => cesta(m.koutky, ` stroke="${barva}" stroke-width="0.7" stroke-linecap="round" fill="none"`);
const tvare = (m: Predloha, barva: string, op: number) => m.tvare.map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1.4" ry="0.85" fill="${barva}" opacity="${op}"/>`).join("");
/** Výřez na tvar vázy: vlasy, kimono, obi a světlo na hraně nesmí přetéct přes okraj */
const vyrez = (m: Predloha, id: string) => `<clipPath id="${id}-c"><path d="${m.vaza}"/></clipPath>`;
/** Límec do y: nejdřív spodní díl zleva, přes něj svrchní zprava */
const limec = (m: Predloha, atributy: string) => (m.limec ? m.limec.map((d) => cesta(d, ` fill="none"${atributy}`)).join("") : "");

/* ═══ Černá: silueta jako vyřezaný erb, tvář a obi jsou díry ═══ */
const cerna = (m: Predloha, id: string) => {
  const k = m.k;
  const tus = "#1E1A18";
  const plocha = `x="-2" y="-2" width="${m.w + 4}" height="${m.h + 6}"`;
  /* maska je celá bílá, černé jsou jen díry; kreslí se pod ní rovnou tvary, ať se má větvička při kývání o co opřít */
  let maska = `<rect ${plocha} fill="#fff"/>`;
  /* tvář: díra mezi vlasy a límcem, po obvodu zůstane proužek vázy */
  maska += `<g clip-path="url(#${id}-c)"><rect ${plocha} fill="#000"/>${cesta(m.vlasy, ` fill="#fff"`)}${cesta(m.kimono, ` fill="#fff"`)}`;
  /* obi je druhá díra (šňůrka by z ní udělala dva proužky); na malé mřížce by pod očima vypadala jako pusa, tam není */
  if (k === 1) maska += cesta(m.obi, ` fill="#000"`);
  maska += cesta(m.vaza, ` fill="none" stroke="#fff" stroke-width="${k === 1 ? 1.9 : 1.5}"`) + `</g>`;
  /* v díře zůstaly oči a ústa */
  maska += oci(m, "#fff", "#000");
  maska += cesta(m.usta, ` fill="#fff"`);
  /* středy květů jsou dírky; kanzashi dělí od hrdla spára */
  maska += m.kvety.map(([x, y, s]) => `<circle cx="${x}" cy="${y}" r="${c(s * 3.6)}" fill="#000"/>`).join("");
  if (m.kanzashi) maska += kvet(id, m.kanzashi, ` fill="none"` + lem(m.kanzashi, "#000", 0.7)) + `<circle cx="${m.kanzashi[0]}" cy="${m.kanzashi[1]}" r="${c(m.kanzashi[2] * 3.6)}" fill="#000"/>`;
  /* okobo se od paty oddělí spárou (jde pod patou i mezi špalíčky), ručky taky, ať je vidět, že se drží hrany */
  maska += cesta(m.okobo, ` fill="#fff" stroke="#000" stroke-width="${c(0.9 * k)}"`) + cesta(m.pata, ` stroke="#000" stroke-width="${c(0.9 * k)}" fill="none"`);
  maska += ruce(m, ` fill="#fff" stroke="#000" stroke-width="${c(0.9 * k)}"`);
  const pod = ` mask="url(#${id}-m)"`;
  return (
    `<defs>${kvetDefs(id)}${vyrez(m, id)}<mask id="${id}-m" maskUnits="userSpaceOnUse" ${plocha}>${maska}</mask></defs>` +
    jehlice(m, ` stroke="${tus}" stroke-width="0.7"`, ` fill="${tus}"`) +
    /* větvička má masku s sebou, takže se dírky v květech kývou s ní */
    vetvicka(m, stonek(m, tus) + kvety(m, id, () => ` fill="${tus}"`) + poupe(m, ` fill="${tus}"`), pod) +
    `<g fill="${tus}"${pod}>${cesta(m.vaza)}${cesta(m.okobo)}${ruce(m)}${m.kanzashi ? kvet(id, m.kanzashi, "") : ""}</g>` +
    /* šňůrka je vidět, až když visí přes díru tváře */
    snurka(m, id, ` stroke="${tus}" stroke-width="0.4"`, () => ` fill="${tus}"`)
  );
};

/* ═══ Průhledná: skleněná váza, květy zůstaly do růžova ═══ */
const pruhledna = (m: Predloha, id: string) => {
  const k = m.k;
  const vlasek = `stroke="#2B2420" stroke-opacity="0.42" stroke-width="${c(1.6 * k)}"`;
  const bila = `stroke="#FFFFFF" stroke-opacity="0.95" stroke-width="${c(0.75 * k)}"`;
  let s =
    `<defs><linearGradient id="${id}-l" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="#FFFFFF" stop-opacity="0.5"/><stop offset="0.42" stop-color="#FFFFFF" stop-opacity="0.1"/><stop offset="0.8" stop-color="#D8E8F4" stop-opacity="0.16"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0.3"/></linearGradient>` +
    kvetDefs(id) +
    vyrez(m, id) +
    `</defs>`;
  s += jehlice(m, ` stroke="#FFFFFF" stroke-opacity="0.9" stroke-width="0.6"`, ` fill="#E79A8C" fill-opacity="0.7" stroke="#FFFFFF" stroke-width="0.35"`);
  /* větvička: jediné místo, kde ve skle zůstala barva */
  s += vetvicka(
    m,
    stonek(m, "#2B2420", 1.9, ` stroke-opacity="0.42"`) + stonek(m, "#FFFFFF", 0.85, ` stroke-opacity="0.95"`) +
      kvety(m, id, (q) => ` fill="none"` + lem(q, "#2B2420", 0.9 * k) + ` stroke-opacity="0.3"`) +
      kvety(m, id, (q) => ` fill="#F2A9B8" fill-opacity="0.85"` + lem(q, "#FFFFFF", 0.3 * k), "#FFFFFF") +
      poupe(m, ` fill="#F2A9B8" fill-opacity="0.7" stroke="#FFFFFF" stroke-width="0.35"`),
  );
  s += cesta(m.okobo, ` fill="url(#${id}-l)" ${vlasek} stroke-linejoin="round"`) + cesta(m.okobo, ` fill="none" ${bila} stroke-linejoin="round"`);
  s += cesta(m.vaza, ` fill="url(#${id}-l)" ${vlasek} stroke-linejoin="round"`);
  s += `<g clip-path="url(#${id}-c)">`;
  /* hrdlo z kouřového skla, kimono jen nadechnuté do modra, obi do červena */
  s += cesta(m.vlasy, ` fill="#2B2420" fill-opacity="0.4"`);
  s += cesta(m.kimono, ` fill="#3E3C78" fill-opacity="0.2"`);
  s += limec(m, ` stroke="#FFFFFF" stroke-opacity="0.85" stroke-width="0.6"`);
  s += cesta(m.obi, ` fill="#C4432B" fill-opacity="0.34" stroke="#FFFFFF" stroke-opacity="0.9" stroke-width="${c(0.6 * k)}"`);
  s += cesta(m.snura, ` stroke="#FFFFFF" stroke-opacity="0.9" stroke-width="${c(0.6 * k)}" fill="none"`);
  s += `</g>`;
  s += cesta(m.vaza, ` fill="none" ${bila} stroke-linejoin="round"`);
  s += cesta(m.pasky, ` stroke="#E79A8C" stroke-opacity="0.8" stroke-width="0.7" fill="none"`);
  s += ruce(m, ` fill="url(#${id}-l)" ${vlasek}`) + ruce(m, ` fill="none" ${bila}`);
  s += oci(m, "#2B2420", "#FFFFFF").replace("<path ", '<path stroke-opacity="0.62" ').replace('<g class="sp-oci">', '<g class="sp-oci" fill-opacity="0.62">');
  s += cesta(m.usta, ` fill="#C4432B" fill-opacity="0.6"`);
  /* lesk na skle: pruh podél levého boku */
  s += `<path d="${m.lesk}" stroke="#FFFFFF" stroke-width="${c(1.1 * k)}" fill="none" stroke-linecap="round"/>`;
  if (m.kanzashi) s += kvet(id, m.kanzashi, ` fill="#F2A9B8" fill-opacity="0.85"` + lem(m.kanzashi, "#FFFFFF", 0.3), "#FFFFFF");
  s += snurka(m, id, ` stroke="#FFFFFF" stroke-opacity="0.9" stroke-width="0.35"`, () => ` fill="#F2A9B8" fill-opacity="0.85"`);
  return s;
};

/* ═══ Zlatá: celá z kovu, s hranou a jiskrou ═══ */
const zlata = (m: Predloha, id: string) => {
  const k = m.k;
  let s =
    `<defs><linearGradient id="${id}-z" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="#FFF2BC"/><stop offset="0.32" stop-color="#F2C95E"/><stop offset="0.68" stop-color="#C9922E"/><stop offset="1" stop-color="#8E6418"/></linearGradient>` +
    `<linearGradient id="${id}-k" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E2B552"/><stop offset="0.5" stop-color="#A9781E"/><stop offset="1" stop-color="#6E4A12"/></linearGradient>` +
    `<linearGradient id="${id}-h" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFBEA"/><stop offset="0.5" stop-color="#FFFBEA" stop-opacity="0"/></linearGradient>` +
    `<linearGradient id="${id}-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF6D2"/><stop offset="0.5" stop-color="#F2CF74"/><stop offset="1" stop-color="#C9922E"/></linearGradient>` +
    kvetDefs(id) +
    vyrez(m, id) +
    `</defs>`;
  s += jehlice(m, ` stroke="#6E4A12" stroke-width="0.8"`, ` fill="#FFF2BC" stroke="#6E4A12" stroke-width="0.45"`);
  /* větvička: stonek s tmavým okrajem, květy ze světlejšího zlata */
  s += vetvicka(
    m,
    stonek(m, "#6E4A12", 1.6) + stonek(m, "#E2B552", 0.7) +
      kvety(m, id, (q) => ` fill="url(#${id}-b)"` + lem(q, "#6E4A12", 0.5 * k), "#8E6418") +
      poupe(m, ` fill="#FFF2BC" stroke="#6E4A12" stroke-width="0.4"`),
  );
  s += cesta(m.okobo, ` fill="url(#${id}-k)" stroke="#5E3E0C" stroke-width="${c(0.8 * k)}" stroke-linejoin="round"`);
  s += cesta(m.pasky, ` stroke="#FFF2BC" stroke-width="0.6" fill="none" opacity="0.85"`);
  s += cesta(m.vaza, ` fill="url(#${id}-z)"`);
  s += `<g clip-path="url(#${id}-c)">`;
  /* vlasy a obi z tmavšího zlata, tvář ze světlého; límec a šňůrka jsou vyleštěné linky */
  s += `<rect x="0" y="0" width="${m.w}" height="${m.h + 2}" fill="#FFF6D2" opacity="0.8"/>`;
  s += cesta(m.vlasy, ` fill="url(#${id}-k)"`);
  s += cesta(m.kimono, ` fill="url(#${id}-z)"`);
  s += limec(m, ` stroke="#6E4A12" stroke-width="1.5"`) + limec(m, ` stroke="#FFF2BC" stroke-width="0.7"`);
  s += cesta(m.obi, ` fill="url(#${id}-k)" stroke="#6E4A12" stroke-width="${c(0.6 * k)}"`);
  s += cesta(m.snura, ` stroke="#FFF2BC" stroke-width="${c(0.75 * k)}" fill="none"`);
  /* hrana, na kterou padá světlo */
  s += cesta(m.vaza, ` fill="none" stroke="url(#${id}-h)" stroke-width="${c(2.7 * k)}" stroke-linejoin="round"`);
  s += `</g>`;
  s += cesta(m.vaza, ` fill="none" stroke="#6E4A12" stroke-width="${c(0.95 * k)}" stroke-linejoin="round"`);
  s += tvare(m, "#F2B25E", 0.7);
  s += ruce(m, ` fill="url(#${id}-z)" stroke="#6E4A12" stroke-width="${c(0.95 * k)}"`);
  s += koutky(m, "#8E6418");
  s += oci(m, "#3E2606", "#FFF8DC");
  s += cesta(m.usta, ` fill="#3E2606"`);
  if (m.kanzashi) s += kvet(id, m.kanzashi, ` fill="url(#${id}-b)"` + lem(m.kanzashi, "#6E4A12", 0.45), "#8E6418");
  s += snurka(m, id, ` stroke="#6E4A12" stroke-width="0.4"`, () => ` fill="#FFF2BC" stroke="#6E4A12" stroke-width="2.6"`);
  /* jiskra: čtyřcípá hvězdička na rameni, občas blikne */
  s += `<g transform="translate(${m.jiskra[0]} ${m.jiskra[1]}) scale(${c(2.6 * k)})"><path class="sp-jiskra" d="${HVEZDA}" fill="#FFFFFF"/></g>`;
  return s;
};

/* ═══ Barvy loga: černé hrdlo, bílá tvář, kimono v barvě noci a rumělkové obi ═══ */
const logo = (m: Predloha, id: string) => {
  const k = m.k;
  let s =
    `<defs><linearGradient id="${id}-p" x1="0" y1="0" x2="1" y2="0">` +
    `<stop offset="0" stop-color="#FFFDF6"/><stop offset="0.3" stop-color="#FFFFFF"/><stop offset="0.7" stop-color="#FFFDF6"/><stop offset="1" stop-color="#F0E4CE"/></linearGradient>` +
    /* kimono, obi a okobo má jen ta, co stojí; vykukující je nechala za hranou */
    (m.kimono ? `<linearGradient id="${id}-n" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A2C5E"/><stop offset="0.5" stop-color="#3E3C78"/><stop offset="1" stop-color="#6A5A92"/></linearGradient>` : "") +
    (m.obi ? `<linearGradient id="${id}-r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D4573C"/><stop offset="1" stop-color="#C4432B"/></linearGradient>` : "") +
    (m.okobo ? `<linearGradient id="${id}-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF6DC"/><stop offset="0.55" stop-color="#FBE9B7"/><stop offset="1" stop-color="#E2B95A"/></linearGradient>` : "") +
    kvetDefs(id) +
    vyrez(m, id) +
    `</defs>`;
  /* jehlice zlatá, korálky rumělkové */
  s += jehlice(m, ` stroke="#B8862A" stroke-width="0.8"`, ` fill="#C4432B" stroke="#2A2C5E" stroke-opacity="0.9" stroke-width="0.4"`);
  /* větvička sakury: růžové květy s rumělkou uprostřed */
  s += vetvicka(
    m,
    stonek(m, "#5E4A3C") +
      kvety(m, id, (q) => ` fill="#F4B4C2"` + lem(q, "#C0708A", 0.5 * k), "#C4432B") +
      poupe(m, ` fill="#C0708A"`),
  );
  /* okobo ze světlého dřeva s rumělkovými pásky */
  s += cesta(m.okobo, ` fill="url(#${id}-b)" stroke="#B8862A" stroke-width="${c(0.6 * k)}" stroke-linejoin="round"`);
  s += cesta(m.pasky, ` stroke="#C4432B" stroke-width="0.8" fill="none"`);
  s += cesta(m.vaza, ` fill="url(#${id}-p)"`);
  s += `<g clip-path="url(#${id}-c)">`;
  s += cesta(m.vlasy, ` fill="#211C22"`);
  s += cesta(m.kimono, ` fill="url(#${id}-n)"`);
  s += limec(m, ` stroke="#C4432B" stroke-width="1.1"`);
  s += cesta(m.obi, ` fill="url(#${id}-r)"`);
  s += cesta(m.snura, ` stroke="#E2B95A" stroke-width="${c(0.8 * k)}" fill="none"`);
  /* lesk glazury podél levého boku */
  s += `<path d="${m.lesk}" stroke="#FFFFFF" stroke-width="${c(0.8 * k)}" stroke-linecap="round" fill="none" opacity="0.45"/>`;
  s += `</g>`;
  s += cesta(m.vaza, ` fill="none" stroke="#2A2C5E" stroke-opacity="0.9" stroke-width="${c(0.95 * k)}" stroke-linejoin="round"`);
  s += tvare(m, "#F2A9A9", 0.7);
  s += ruce(m, ` fill="#FFFDF6" stroke="#2A2C5E" stroke-opacity="0.9" stroke-width="${c(0.95 * k)}"`);
  s += koutky(m, "#C4432B");
  s += oci(m, "#211C22", "#FFFDF6");
  s += cesta(m.usta, ` fill="#C4432B"`);
  /* kanzashi: květ z loga — pět krémových plátků se zlatým lemem, uprostřed rumělka — a zlatá šňůrka s lístky */
  if (m.kanzashi) s += kvet(id, m.kanzashi, ` fill="#FBE9B7"` + lem(m.kanzashi, "#E2B95A", 0.3), "#C4432B");
  s += snurka(m, id, ` stroke="#E2B95A" stroke-width="0.35"`, (i) => ` fill="${i ? "#F4B4C2" : "#FBE9B7"}"`);
  return s;
};

const KRESBY: Record<SchovkaBarva, (m: Predloha, id: string) => string> = { cerna, pruhledna, zlata, logo };

let citac = 0;

/** Vázička na schovávanou jako SVG text */
export function vazickaSchovka({ barva = "logo", velikost = 32, poza = "stoji", id, trida = "", zpozdeni }: SchovkaVolby = {}) {
  const velka = velikost >= VELKA_OD;
  const m = poza === "vykukuje" ? (velka ? V32 : V16) : velka ? S32 : S16;
  const pid = id ?? `sv${(citac++).toString(36)}`;
  /* posun animací podle id, ať se dvěma Vázičkám na stránce nekývá větvička naráz */
  const z = zpozdeni ?? -([...pid].reduce((a, znak) => (a * 31 + znak.charCodeAt(0)) % 997, 7) % 53) / 10;
  const vyska = Math.round((velikost * m.h) / m.w * 100) / 100;
  const kresba = KRESBY[barva](m, pid);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" class="schovka schovka-vazicka schovka-${barva} schovka-${poza} ${trida}" viewBox="0 0 ${m.w} ${m.h}" width="${velikost}" height="${vyska}" style="--sp-z:${c(z)}s" fill="none" aria-hidden="true" focusable="false">` +
    /* vykukující se o hranu ořízne, ať pod ní váza nepřečuhuje */
    (poza === "vykukuje" ? `<clipPath id="${pid}-o"><rect x="-4" y="-4" width="${m.w + 8}" height="${m.h + 4}"/></clipPath><g clip-path="url(#${pid}-o)">${kresba}</g>` : kresba) +
    `</svg>`
  );
}
