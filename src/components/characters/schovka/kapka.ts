/**
 * Kapka na schovávanou — zjednodušená kresba pro hry na hledání po webu,
 * sestra Pecinky z ./pecinka.ts, Bublinky z ./bublinka.ts, Střípka ze
 * ./stripek.ts, Hlínky z ./hlinka.ts, Cedulky z ./cedulka.ts, Kachlíka
 * z ./kachlik.ts, Šamotky ze ./samotka.ts a Vázičky z ./vazicka.ts (stejné
 * barvy, pózy i volby, takže je hra může střídat). Kapka vody jako bůh hromu
 * Raidžin: oči má magatamy, pusu dvojitou vlnku, stojí na geta a za zády
 * nosí kruh s bubny hromu, na každém mitsudomoe. Bubny ji při schovávané
 * prozradí — trčí z úkrytu kolem špičky a nedají pokoj.
 *
 * Je vždycky malá (16–64 px), a proto má dvě optické velikosti: kresbu na
 * mřížce 32 pro velikost od 22 px nahoru a zvlášť kreslenou na mřížce 16
 * pro úplně malou — tam zbyde jen kapka, dva bubny u ramen s obloukem kruhu
 * mezi nimi (z tomoe jsou na nich tři tečky), oči a geta.
 *
 * Čtyři barvy, každá řešená zvlášť (ne jen přebarvená):
 *   cerna      silueta jako vyřezaný erb: oči, pusa a tomoe na bubnech jsou
 *              díry; kruh jde za zády, takže ho od těla dělí spára, a geta
 *              a ručky taky
 *   pruhledna  opravdová kapka vody: bílá linka s tmavým vláskem, lesk
 *              a odraz světla na druhé straně; bubny jsou ze skla, jen na
 *              obrubě zůstal nádech rumělky a tomoe z kouřového skla —
 *              nejtěžší k nalezení, a právě ty ji prozradí
 *   zlata      celá ze zlata: kov s hranou, na kterou padá světlo, obruby
 *              bubnů a geta z tmavšího, kůže ze světlého a jiskra, co občas
 *              blikne
 *   logo       soumrak ze značky (rumělka zdola, noc ve špičce) a bubny
 *              z laku: černá obruč se zlatou linkou, rumělková obruba se
 *              zlatými cvočky, krémová kůže a černé tomoe
 *
 * Dvě pózy: `stoji` (na geta, ručky po stranách) a `vykukuje` — kouká
 * zpoza hrany, o kterou se drží ručkama. Nad hranou je špička, oči a celý
 * kruh s bubny. Vykukující kresba je nižší (spodek je hrana, za kterou se
 * schovává), hra ji staví spodkem na horní okraj čehokoli.
 *
 * Tomoe na bubnech se pomalu točí a boční bubny občas dostanou ránu, levý
 * a hned po něm pravý, a rozejde se od nich vlna. Když vykukuje, sjede
 * vedle ní blesk do krajního bubnu a hrom se po kruhu rozběhne od bubnu
 * k bubnu. Pohyb je v styles/schovka.css; bez něj zůstane hezký nehybný
 * obrázek (vlny ani blesk v něm nejsou vidět).
 *
 * Generátor vrací SVG jako text, takže jde použít při sestavení stránky
 * (Kapka.astro) i za běhu ve hře.
 */
import { VELKA_OD } from "./pecinka";
import type { SchovkaBarva, SchovkaVolby } from "./pecinka";

type Bod = [number, number];
/** střed a poloměr */
type Kruh = [number, number, number];
/** střed a poloosy */
type Oval = [number, number, number, number];
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
  /** obrys kapky: špička nahoře, nejširší dole (vykukující sahá pod hranu) */
  telo: string;
  /** kruh za zády a jeho tloušťka; spodek schová tělo (na malé mřížce je z něj jen oblouk mezi bubny) */
  obruc: string;
  obrucS: number;
  /** bubny na kruhu, zleva */
  bubny: Kruh[];
  /** které bubny se občas ozvou (pořadí v `bubny`), jeden po druhém, a od kolika prvních se rozejde vlna */
  udery: number[];
  vln: number;
  /** mitsudomoe na kůži: tři čárky s ocasem, na malé mřížce z nich zbyly jen tři hlavičky */
  ocasy: boolean;
  /** oči magatamy: středy hlaviček a měřítko */
  oci: Bod[];
  oko: number;
  /** odlesk v oku, na malé mřížce není */
  odlesk: boolean;
  /** pusa: dvojitá vlnka (jen když stojí na velké mřížce) */
  usta: string | null;
  tvare: Bod[];
  /** lesk podél levého boku a odraz světla vpravo dole (ten jen kapka ze skla) */
  lesk: string;
  odraz: string | null;
  /** ručky po stranách, když stojí */
  rucky: Oval[];
  /** ručky na hraně, když vykukuje */
  ruce: Obd[];
  /** geta: levý okraj a šířka desky, na velké mřížce se dvěma zuby */
  geta: { x: number; w: number }[];
  getaY: number;
  zuby: boolean;
  /** chodidla na geta a pásky hanao přes ně */
  nohy: Oval[];
  pasky: string | null;
  /** blesk, který sjede do krajního bubnu (jen když vykukuje) */
  blesk: string | null;
  /** kam se dívá (posun očí) */
  pohled: Bod;
  /** kde na zlaté blikne jiskra */
  jiskra: Bod;
}

/* ——— Mřížka 32: stojí na geta, za zády kruh se čtyřmi bubny kolem špičky ——— */
const S32: Predloha = {
  w: 32, h: 32, k: 1,
  telo: "M16 4.4 Q8.4 13.8 7.4 18.4 Q6.4 23.2 11.45 26 Q14 27.2 16 27.2 Q18 27.2 20.55 26 Q25.6 23.2 24.6 18.4 Q23.6 13.8 16 4.4 Z",
  obruc: "M5.5 12.5 A10.5 10.5 0 1 1 26.5 12.5 A10.5 10.5 0 1 1 5.5 12.5 Z", obrucS: 1.1,
  bubny: [[5.5, 12.5, 3.3], [10.75, 3.4, 3.3], [21.25, 3.4, 3.3], [26.5, 12.5, 3.3]],
  udery: [0, 3], vln: 2,
  ocasy: true,
  oci: [[12.7, 18.3], [19.3, 18.3]], oko: 0.3, odlesk: true,
  usta: "M14.1 21.5 Q15.05 22.8 16 21.9 Q16.95 22.8 17.9 21.5",
  tvare: [[10.6, 21.1], [21.4, 21.1]],
  lesk: "M13.5 10 Q11.1 13.4 10 16.4",
  odraz: "M22.9 20 Q23.4 22.9 20.4 24.6",
  rucky: [[6.7, 21.1, 1.9, 1.4], [25.3, 21.1, 1.9, 1.4]],
  ruce: [],
  geta: [{ x: 9.4, w: 5.8 }, { x: 16.8, w: 5.8 }], getaY: 27.3, zuby: true,
  nohy: [[12.3, 27, 2.3, 1.1], [19.7, 27, 2.3, 1.1]],
  pasky: "M10.6 27.9 Q12.3 25.7 14 27.9 M18 27.9 Q19.7 25.7 21.4 27.9",
  blesk: null,
  pohled: [0, 0],
  jiskra: [11.2, 13.4],
};
/* ——— Mřížka 32: vykukuje zpoza hrany (spodek kresby je hrana); pusa, ručky po stranách i geta zůstaly za ní. Hrom jde po kruhu zprava doleva. ——— */
const V32: Predloha = {
  w: 32, h: 21.5, k: 1,
  telo: S32.telo,
  obruc: S32.obruc, obrucS: S32.obrucS,
  bubny: S32.bubny,
  udery: [3, 2, 1, 0], vln: 1,
  ocasy: true,
  oci: [[12.7, 17.7], [19.3, 17.7]], oko: 0.3, odlesk: true,
  usta: null,
  tvare: [],
  lesk: S32.lesk,
  odraz: null,
  rucky: [],
  ruce: [{ x: 4.6, y: 18.1, w: 4.8, h: 3.4, rx: 1.6 }, { x: 22.6, y: 18.1, w: 4.8, h: 3.4, rx: 1.6 }],
  geta: [], getaY: 0, zuby: false,
  nohy: [],
  pasky: null,
  blesk: "M30.4 0.6 L27.3 4.2 H29.8 L27 8",
  pohled: [-0.45, 0.1],
  jiskra: [11.2, 13.4],
};
/* ——— Mřížka 16: stojí. Dva bubny u ramen a z kruhu jen oblouk mezi nimi, bez pusy, tvářiček, ruček a pásků; geta jsou dvě destičky. ——— */
const S16: Predloha = {
  w: 16, h: 16, k: 0.5,
  telo: "M8 1.3 Q3.9 6.3 3.3 8.8 Q2.7 11.4 5.5 12.9 Q6.9 13.5 8 13.5 Q9.1 13.5 10.5 12.9 Q13.3 11.4 12.7 8.8 Q12.1 6.3 8 1.3 Z",
  obruc: "M3 4.8 A5.2 5.2 0 0 1 13 4.8", obrucS: 0.9,
  bubny: [[3, 4.8, 2.1], [13, 4.8, 2.1]],
  udery: [0, 1], vln: 2,
  ocasy: false,
  oci: [[6, 9.3], [10, 9.3]], oko: 0.2, odlesk: false,
  usta: null,
  tvare: [],
  lesk: "M6.9 4.5 Q5.8 6 5.3 7.5",
  odraz: "M11.4 10.2 Q11.6 11.5 10.2 12.3",
  rucky: [],
  ruce: [],
  geta: [{ x: 4.5, w: 3 }, { x: 8.5, w: 3 }], getaY: 13.6, zuby: false,
  nohy: [],
  pasky: null,
  blesk: null,
  pohled: [0, 0],
  jiskra: [5.8, 6.2],
};
const V16: Predloha = {
  w: 16, h: 10.5, k: 0.5,
  telo: S16.telo,
  obruc: S16.obruc, obrucS: S16.obrucS,
  bubny: S16.bubny,
  udery: [1, 0], vln: 1,
  ocasy: false,
  oci: [[6.2, 8.4], [9.8, 8.4]], oko: 0.2, odlesk: false,
  usta: null,
  tvare: [],
  lesk: S16.lesk,
  odraz: null,
  rucky: [],
  ruce: [{ x: 2, y: 8.8, w: 2.6, h: 1.7, rx: 0.8 }, { x: 11.4, y: 8.8, w: 2.6, h: 1.7, rx: 0.8 }],
  geta: [], getaY: 0, zuby: false,
  nohy: [],
  pasky: null,
  blesk: "M15.4 0.3 L14 1.5 H15.1 L13.9 2.6",
  pohled: [-0.3, 0],
  jiskra: [5.8, 6.2],
};

/** oko: kulatá hlavička a ocásek, který z ní stéká — stejný tvar jako čárky tomoe na bubnech */
const MAGATAMA = "M0 -4.2 C3.2 -4.2 4.8 -1.6 4.4 1.4 C4 4.6 0.8 6.8 -1.8 7.8 C-0.4 5.8 -0.8 4.6 -2.3 3.7 C-4.6 2.5 -4.8 -0.8 -3.1 -2.7 C-2.3 -3.7 -1.2 -4.2 0 -4.2 Z";
/** jedna čárka tomoe o poloměru 8,4: ocas po obvodu, hlavička je kolečko zvlášť */
const CARKA = "M0 -8.4 A8.4 8.4 0 0 1 8.11 -2.17 A6 6 0 0 0 0 -2.4 Z";
const HVEZDA = "M0 -1 Q0.18 -0.18 1 0 Q0.18 0.18 0 1 Q-0.18 0.18 -1 0 Q-0.18 -0.18 0 -1 Z";

const c = (n: number) => String(Math.round(n * 100) / 100);
const obd = ({ x, y, w, h, rx }: Obd, atributy = "") => `<rect x="${c(x)}" y="${c(y)}" width="${c(w)}" height="${c(h)}" rx="${c(rx)}"${atributy}/>`;
const cesta = (d: string | null, atributy = "") => (d ? `<path d="${d}"${atributy}/>` : "");
const ovaly = (o: Oval[], atributy = "") => o.map(([x, y, rx, ry]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"${atributy}/>`).join("");
const ruce = (m: Predloha, atributy = "") => m.ruce.map((r) => obd(r, atributy)).join("");
const obruc = (m: Predloha, atributy: string) => `<path d="${m.obruc}" fill="none"${atributy}/>`;
/** Geta: deska a pod ní dva zuby, na malé mřížce jen destička */
const geta = (m: Predloha, atributy = "") =>
  m.geta
    .map(({ x, w }) => {
      if (!m.zuby) return obd({ x, y: m.getaY, w, h: 1.6, rx: 0.5 }, atributy);
      return (
        obd({ x: x + 0.7, y: m.getaY + 1.2, w: 1.4, h: 2.3, rx: 0.3 }, atributy) +
        obd({ x: x + w - 2.1, y: m.getaY + 1.2, w: 1.4, h: 2.3, rx: 0.3 }, atributy) +
        obd({ x, y: m.getaY, w, h: 1.5, rx: 0.5 }, atributy)
      );
    })
    .join("");
/**
 * Mitsudomoe o poloměru 8,4 jako kus, na který se bubny odkazují (je jich
 * víc a čárky jsou v každém tři). Na malé mřížce z čárek zbyly jen hlavičky,
 * o něco větší a dál od sebe. Barvu dostane až tam, kde se použije.
 */
const tomoeDefs = (m: Predloha, id: string) =>
  `<g id="${id}-t">${[0, 120, 240].map((u) => (m.ocasy ? `<g transform="rotate(${u})"><path d="${CARKA}"/><circle cy="-5.4" r="3"/></g>` : `<circle cy="-5.2" r="3.4" transform="rotate(${u})"/>`)).join("")}</g>`;
/**
 * Bubny na kruhu. Každý má počátek ve svém středu, takže se tomoe točí
 * a buben po ráně poskočí kolem něj bez dalšího nastavování (hýbe se, když
 * je styles/schovka.css; --skp-i je pořadí bubnu, --skp-u pořadí rány).
 * `telo` dostane poloměr a vrátí obrubu s kůží, `znak` jsou atributy tomoe.
 */
const bubny = (m: Predloha, id: string, telo: (r: number) => string, znak: string) =>
  m.bubny
    .map(([x, y, r], i) => {
      const u = m.udery.indexOf(i);
      return (
        `<g transform="translate(${x} ${y})"><g${u < 0 ? "" : ` class="skp-uder" style="--skp-u:${u}"`}>${telo(r)}` +
        `<g class="skp-tomoe" style="--skp-i:${i}"><use href="#${id}-t" transform="scale(${c((r * 0.64) / 8.4)})"${znak}/></g>` +
        `</g></g>`
      );
    })
    .join("");
/** Vlna, která se od bubnu rozejde po ráně: v klidu není vidět, objeví se jen s pohybem */
const vlny = (m: Predloha, atributy: string) =>
  m.udery
    .slice(0, m.vln)
    .map((b, u) => {
      const [x, y, r] = m.bubny[b];
      return `<g transform="translate(${x} ${y})"><circle class="skp-vlna" r="${c(r + 0.5 * m.k)}" fill="none"${atributy} opacity="0" style="--skp-u:${u}"/></g>`;
    })
    .join("");
/** Oči magatamy: levá je zrcadlově, ocásky stékají ke středu; mrkají přes sp-oci */
const oci = (m: Predloha, barva: string, odlesk: string | null) =>
  `<g class="sp-oci">` +
  m.oci
    .map(([x, y], i) => {
      const ox = x + m.pohled[0], oy = y + m.pohled[1], s = m.oko;
      return (
        `<path d="${MAGATAMA}" transform="translate(${c(ox)} ${c(oy)}) scale(${i ? s : -s} ${s})" fill="${barva}"/>` +
        (odlesk && m.odlesk ? `<circle cx="${c(ox + (i ? -0.9 : 0.9) * s)}" cy="${c(oy - 1.5 * s)}" r="${c(1.35 * s)}" fill="${odlesk}"/>` : "")
      );
    })
    .join("") +
  `</g>`;
const usta = (m: Predloha, barva: string, s = 0.85, atributy = "") =>
  m.usta ? `<path d="${m.usta}" stroke="${barva}" stroke-width="${c(s * m.k)}" stroke-linecap="round" stroke-linejoin="round" fill="none"${atributy}/>` : "";
const tvare = (m: Predloha, barva: string, op: number) => m.tvare.map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1.4" ry="0.9" fill="${barva}" opacity="${op}"/>`).join("");
/**
 * Blesk vedle ní: v klidu není vidět, problikne jen s pohybem (když
 * vykukuje). `lem` jsou atributy tmavšího tahu pod ním, ať se světlý blesk
 * na papíře neztratí. Na malé mřížce je o něco tlustší, jinak by z něj
 * nezbylo nic.
 */
const blesk = (m: Predloha, barva: string, lem = "") => {
  if (!m.blesk) return "";
  const s = m.k === 1 ? 0.8 : 0.55;
  return (
    `<g class="skp-blesk" opacity="0" fill="none" stroke-linecap="round" stroke-linejoin="round">` +
    (lem ? cesta(m.blesk, `${lem} stroke-width="${c(s + 0.7 * m.k)}"`) : "") +
    cesta(m.blesk, ` stroke="${barva}" stroke-width="${s}"`) +
    `</g>`
  );
};
/** Výřez na tvar kapky: světlo na hraně nesmí přetéct přes okraj */
const vyrez = (m: Predloha, id: string) => `<clipPath id="${id}-c"><path d="${m.telo}"/></clipPath>`;

/* ═══ Černá: silueta jako vyřezaný erb, oči, pusa a tomoe jsou díry ═══ */
const cerna = (m: Predloha, id: string) => {
  const k = m.k;
  const tus = "#1E1A18";
  const plocha = `x="-4" y="-4" width="${m.w + 8}" height="${m.h + 8}"`;
  const spara = ` stroke="#000" stroke-width="${c(0.9 * k)}"`;
  let maska = obruc(m, ` stroke="#fff" stroke-width="${c(m.obrucS)}"`);
  maska += bubny(m, id, (r) => `<circle r="${r}" fill="#fff"/>`, ` fill="#000"`);
  /* kruh jde za zády: kolem těla zůstane spára, ať je vidět, že je vzadu */
  maska += cesta(m.telo, ` fill="none" stroke="#000" stroke-width="${c(2 * k)}" stroke-linejoin="round"`) + cesta(m.telo, ` fill="#fff"`);
  /* geta a ručky se od těla oddělí spárou taky: pod tělem jde vodorovně, ať z tenkých desek něco zbyde */
  maska += geta(m, ` fill="#fff"`);
  if (m.geta.length) maska += `<path d="M${c(m.geta[0].x - 1)} ${c(m.getaY - 0.1 * k)} H${c(m.geta[m.geta.length - 1].x + m.geta[m.geta.length - 1].w + 1)}"${spara} fill="none"/>`;
  maska += ovaly(m.rucky, ` fill="#fff"${spara}`);
  maska += oci(m, "#000", "#fff");
  maska += usta(m, "#000");
  maska += ruce(m, ` fill="#fff"${spara}`);
  return (
    `<defs>${tomoeDefs(m, id)}<mask id="${id}-m" maskUnits="userSpaceOnUse" ${plocha}>${maska}</mask></defs>` +
    vlny(m, ` stroke="${tus}" stroke-width="${c(0.6 * k)}"`) +
    `<rect ${plocha} fill="${tus}" mask="url(#${id}-m)"/>` +
    blesk(m, tus)
  );
};

/* ═══ Průhledná: opravdová kapka vody, bubny ze skla ═══ */
const pruhledna = (m: Predloha, id: string) => {
  const k = m.k;
  const vlasek = `stroke="#2B2420" stroke-opacity="0.42" stroke-width="${c(1.6 * k)}"`;
  const bila = `stroke="#FFFFFF" stroke-opacity="0.95" stroke-width="${c(0.75 * k)}"`;
  const plocha = `x="-4" y="-4" width="${m.w + 8}" height="${m.h + 8}"`;
  let s =
    `<defs><linearGradient id="${id}-l" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="#FFFFFF" stop-opacity="0.5"/><stop offset="0.42" stop-color="#FFFFFF" stop-opacity="0.1"/><stop offset="0.8" stop-color="#D8E8F4" stop-opacity="0.16"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0.3"/></linearGradient>` +
    /* voda: totéž sklo, jen dole nadechnuté do modra */
    `<linearGradient id="${id}-v" x1="0.2" y1="0" x2="0.8" y2="1">` +
    `<stop offset="0" stop-color="#FFFFFF" stop-opacity="0.5"/><stop offset="0.4" stop-color="#DCEEF9" stop-opacity="0.14"/><stop offset="0.8" stop-color="#9CC8E6" stop-opacity="0.3"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0.34"/></linearGradient>` +
    tomoeDefs(m, id) +
    /* voda je vidět skrz, takže kruh se za tělem a za bubny musí vyříznout */
    `<mask id="${id}-p" maskUnits="userSpaceOnUse" ${plocha}><rect ${plocha} fill="#fff"/><path d="${m.telo}" fill="#000" stroke="#000" stroke-width="${c(1.6 * k)}"/>` +
    m.bubny.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${c(r + 0.8 * k)}" fill="#000"/>`).join("") +
    `</mask></defs>`;
  s += `<g mask="url(#${id}-p)">` + obruc(m, ` stroke="#2B2420" stroke-opacity="0.42" stroke-width="${c(m.obrucS + 0.7 * k)}"`) + obruc(m, ` stroke="#FFFFFF" stroke-opacity="0.95" stroke-width="${c(m.obrucS - 0.35 * k)}"`) + `</g>`;
  /* bubny: sklo, na obrubě nádech rumělky a tomoe z kouřového skla — jediné místo, kde zůstala barva */
  s += vlny(m, ` stroke="#FFFFFF" stroke-width="${c(0.6 * k)}"`);
  s += bubny(
    m,
    id,
    (r) =>
      `<circle r="${r}" fill="url(#${id}-l)" ${vlasek}/>` +
      `<circle r="${c(r * 0.82)}" fill="none" stroke="#C4432B" stroke-opacity="0.36" stroke-width="${c(r * 0.3)}"/>` +
      `<circle r="${r}" fill="none" ${bila}/>`,
    ` fill="#2B2420" fill-opacity="0.5"`,
  );
  s += geta(m, ` fill="url(#${id}-l)" ${vlasek}`) + geta(m, ` fill="none" ${bila}`);
  s += cesta(m.telo, ` fill="url(#${id}-v)" ${vlasek} stroke-linejoin="round"`);
  /* odraz světla na opačné straně, než je lesk — podle něj se pozná kapka od skla */
  s += cesta(m.odraz, ` stroke="#FFFFFF" stroke-opacity="0.6" stroke-width="${c(1.5 * k)}" stroke-linecap="round" fill="none"`);
  s += cesta(m.telo, ` fill="none" ${bila} stroke-linejoin="round"`);
  s += cesta(m.pasky, ` stroke="#E79A8C" stroke-opacity="0.85" stroke-width="0.7" stroke-linecap="round" fill="none"`);
  s += ovaly(m.rucky, ` fill="url(#${id}-l)" ${vlasek}`) + ovaly(m.rucky, ` fill="none" ${bila}`);
  s += ruce(m, ` fill="url(#${id}-l)" ${vlasek}`) + ruce(m, ` fill="none" ${bila}`);
  s += oci(m, "#2B2420", "#FFFFFF").replace('<g class="sp-oci">', '<g class="sp-oci" fill-opacity="0.62">');
  s += usta(m, "#2B2420", 1.4, ` stroke-opacity="0.5"`) + usta(m, "#FFFFFF", 0.7);
  /* lesk: pruh podél levého boku */
  s += `<path d="${m.lesk}" stroke="#FFFFFF" stroke-width="${c(1.2 * k)}" fill="none" stroke-linecap="round"/>`;
  s += blesk(m, "#FFFFFF", ` stroke="#2B2420" stroke-opacity="0.42"`);
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
    tomoeDefs(m, id) +
    vyrez(m, id) +
    `</defs>`;
  s += obruc(m, ` stroke="#6E4A12" stroke-width="${c(m.obrucS + 0.6 * k)}"`) + obruc(m, ` stroke="#E2B552" stroke-width="${c(m.obrucS - 0.3 * k)}"`);
  /* bubny: obruba z tmavšího zlata, kůže ze světlého, tomoe vyryté */
  s += vlny(m, ` stroke="#F2C95E" stroke-width="${c(0.6 * k)}"`);
  s += bubny(m, id, (r) => `<circle r="${r}" fill="url(#${id}-k)" stroke="#6E4A12" stroke-width="${c(0.6 * k)}"/><circle r="${c(r * 0.72)}" fill="#FFF2BC"/>`, ` fill="#6E4A12"`);
  s += geta(m, ` fill="url(#${id}-k)" stroke="#5E3E0C" stroke-width="${c(0.7 * k)}"`);
  s += cesta(m.telo, ` fill="url(#${id}-z)"`);
  /* hrana, na kterou padá světlo */
  s += `<g clip-path="url(#${id}-c)">${cesta(m.telo, ` fill="none" stroke="url(#${id}-h)" stroke-width="${c(2.7 * k)}" stroke-linejoin="round"`)}</g>`;
  s += cesta(m.telo, ` fill="none" stroke="#6E4A12" stroke-width="${c(0.95 * k)}" stroke-linejoin="round"`);
  s += ovaly(m.nohy, ` fill="#A9781E" stroke="#6E4A12" stroke-width="0.5"`);
  s += cesta(m.pasky, ` stroke="#FFF2BC" stroke-width="0.7" stroke-linecap="round" fill="none"`);
  s += tvare(m, "#F2B25E", 0.7);
  s += ovaly(m.rucky, ` fill="url(#${id}-z)" stroke="#6E4A12" stroke-width="${c(0.8 * k)}"`);
  s += ruce(m, ` fill="url(#${id}-z)" stroke="#6E4A12" stroke-width="${c(0.95 * k)}"`);
  s += oci(m, "#3E2606", "#FFF8DC");
  s += usta(m, "#3E2606");
  s += blesk(m, "#FFF2BC", ` stroke="#6E4A12"`);
  /* jiskra: čtyřcípá hvězdička na rameni, občas blikne */
  s += `<g transform="translate(${m.jiskra[0]} ${m.jiskra[1]}) scale(${c(2.6 * k)})"><path class="sp-jiskra" d="${HVEZDA}" fill="#FFFFFF"/></g>`;
  return s;
};

/* ═══ Barvy loga: soumrak ze značky a bubny z laku ═══ */
const logo = (m: Predloha, id: string) => {
  const k = m.k, w = m.w;
  let s =
    /* tah ensó jde z rumělky zleva dole do noci vpravo nahoře, stejně jako stín na velké kresbě */
    `<defs><linearGradient id="${id}-s" gradientUnits="userSpaceOnUse" x1="${c(w * 0.24)}" y1="${c(w * 0.86)}" x2="${c(w * 0.7)}" y2="${c(w * 0.22)}">` +
    `<stop offset="0" stop-color="#C4432B"/><stop offset="0.36" stop-color="#C0708A"/><stop offset="0.7" stop-color="#7A5E8E"/><stop offset="1" stop-color="#3E3C78"/></linearGradient>` +
    (m.geta.length ? `<linearGradient id="${id}-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF6DC"/><stop offset="0.55" stop-color="#FBE9B7"/><stop offset="1" stop-color="#E2B95A"/></linearGradient>` : "") +
    tomoeDefs(m, id) +
    `</defs>`;
  /* černá obruč se zlatou linkou */
  s += obruc(m, ` stroke="#1F1A17" stroke-width="${c(m.obrucS + 0.3 * k)}"`) + obruc(m, ` stroke="#D9B25E" stroke-width="${c(0.4 * k)}" stroke-dasharray="${c(2.4 * k)} ${c(0.7 * k)}"`);
  /* bubny: černý okraj, rumělkový lak se zlatými cvočky, krémová kůže a černé tomoe */
  s += vlny(m, ` stroke="#C4432B" stroke-width="${c(0.6 * k)}"`);
  s += bubny(
    m,
    id,
    (r) =>
      `<circle r="${r}" fill="#D24A2E" stroke="#171310" stroke-width="${c(0.6 * k)}"/>` +
      (k === 1 ? `<circle r="${c(r * 0.82)}" fill="none" stroke="#E9C46E" stroke-width="0.42" stroke-linecap="round" stroke-dasharray="0 ${c((r * 0.82 * Math.PI * 2) / 9)}"/>` : "") +
      `<circle r="${c(r * 0.68)}" fill="#F6EBD0" stroke="#B5361F" stroke-width="${c(0.35 * k)}"/>`,
    ` fill="#1B1714"`,
  );
  /* geta ze světlého dřeva */
  s += geta(m, ` fill="url(#${id}-b)" stroke="#B8862A" stroke-width="${c(0.6 * k)}"`);
  s += cesta(m.telo, ` fill="url(#${id}-s)" stroke="#2A2C5E" stroke-opacity="0.9" stroke-width="${c(0.95 * k)}" stroke-linejoin="round"`);
  /* lesk podél levého boku */
  s += `<path d="${m.lesk}" stroke="#FBE9B7" stroke-width="${c(0.9 * k)}" stroke-linecap="round" fill="none" opacity="0.55"/>`;
  s += ovaly(m.nohy, ` fill="#3E3C78" stroke="#2A2C5E" stroke-width="0.4"`);
  s += cesta(m.pasky, ` stroke="#E2553A" stroke-width="0.8" stroke-linecap="round" fill="none"`);
  s += tvare(m, "#F7CFCB", 0.55);
  s += ovaly(m.rucky, ` fill="url(#${id}-s)" stroke="#2A2C5E" stroke-opacity="0.9" stroke-width="${c(0.8 * k)}"`);
  s += ruce(m, ` fill="url(#${id}-s)" stroke="#2A2C5E" stroke-opacity="0.9" stroke-width="${c(0.95 * k)}"`);
  s += oci(m, "#2A2C5E", "#FBE9B7");
  s += usta(m, "#2A2C5E");
  s += blesk(m, "#F2C95E", ` stroke="#2A2C5E" stroke-opacity="0.9"`);
  return s;
};

const KRESBY: Record<SchovkaBarva, (m: Predloha, id: string) => string> = { cerna, pruhledna, zlata, logo };

let citac = 0;

/** Kapka na schovávanou jako SVG text */
export function kapkaSchovka({ barva = "logo", velikost = 32, poza = "stoji", id, trida = "", zpozdeni }: SchovkaVolby = {}) {
  const velka = velikost >= VELKA_OD;
  const m = poza === "vykukuje" ? (velka ? V32 : V16) : velka ? S32 : S16;
  const pid = id ?? `skp${(citac++).toString(36)}`;
  /* posun animací podle id, ať dvě Kapky na stránce nebubnují naráz */
  const z = zpozdeni ?? -([...pid].reduce((a, znak) => (a * 31 + znak.charCodeAt(0)) % 997, 7) % 53) / 10;
  const vyska = Math.round((velikost * m.h) / m.w * 100) / 100;
  const kresba = KRESBY[barva](m, pid);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" class="schovka schovka-kapka schovka-${barva} schovka-${poza} ${trida}" viewBox="0 0 ${m.w} ${m.h}" width="${velikost}" height="${vyska}" style="--sp-z:${c(z)}s" fill="none" aria-hidden="true" focusable="false">` +
    /* vykukující se o hranu ořízne, ať pod ní kapka nepřečuhuje */
    (poza === "vykukuje" ? `<clipPath id="${pid}-o"><rect x="-4" y="-4" width="${m.w + 8}" height="${m.h + 4}"/></clipPath><g clip-path="url(#${pid}-o)">${kresba}</g>` : kresba) +
    `</svg>`
  );
}
