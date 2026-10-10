/**
 * Střípek na schovávanou — zjednodušená kresba pro hry na hledání po webu,
 * sourozenec Pecinky z ./pecinka.ts a Bublinky z ./bublinka.ts (stejné
 * barvy, pózy i volby, takže je hra může střídat). Velký střep slepený
 * zlatem, který se zavřenýma očima medituje na obláčku; dva kusy má
 * z cizího nádobí — vpravo nahoře vlnky, vlevo dole kus s květem — a vedle
 * hlavy mu poletuje malý střípek.
 *
 * Je vždycky malý (16–64 px), a proto má dvě optické velikosti: kresbu na
 * mřížce 32 pro velikost od 22 px nahoru a zvlášť kreslenou na mřížce 16
 * pro úplně malou — tam zbyde jen střep, jedna lomená spára, dvě čárky očí
 * a obláček.
 *
 * Čtyři barvy, každá řešená zvlášť (ne jen přebarvená):
 *   cerna      silueta jako vyřezaný erb: spáry, oči, ústa a spára mezi
 *              střepem a obláčkem jsou díry, takže je vidět, že je složený
 *              z kusů
 *   pruhledna  střep skla: bílá linka s tmavým vláskem, lesk a spáry jako
 *              světlé linky — nejtěžší k nalezení
 *   zlata      celý ze zlata: kov s hranou, na kterou padá světlo, spáry
 *              světlejší a jiskra, co občas blikne
 *   logo       soumrak ze značky, spáry zlaté, dolní kus v barvě noci
 *              s květem sakury z loga, horní krémový a krémový obláček
 *
 * Dvě pózy: `stoji` (Střípek nestojí, sedí na obláčku a vznáší se) a
 * `vykukuje` — kouká zpoza hrany, o kterou se drží ručkama, a to už má oči
 * otevřené. Vykukující kresba je nižší (spodek je hrana, za kterou se
 * schovává), hra ji staví spodkem na horní okraj čehokoli.
 *
 * Generátor vrací SVG jako text, takže jde použít při sestavení stránky
 * (Stripek.astro) i za běhu ve hře. Pohyb (vznášení, mrkání, poletující
 * střípek, jiskra) je v styles/schovka.css; bez něj zůstane hezký nehybný
 * obrázek.
 */
import { VELKA_OD } from "./pecinka";
import type { SchovkaBarva, SchovkaVolby } from "./pecinka";

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
  /** obrys velkého střepu */
  strep: string;
  /** spáry slepené zlatem: lomené čáry od hrany k hraně nebo k jiné spáře */
  spary: string;
  /** kus z cizího nádobí vpravo nahoře (vlnky) a vlevo dole (ten s květem) */
  kusVlny: string | null;
  kusKvet: string | null;
  /** vlnky seigaiha na horním kusu (jen na velké mřížce) */
  vlnky: string | null;
  /** kam na dolní kus patří květ z loga */
  kvet: [number, number] | null;
  /** zavřené oči, když medituje (obloučky, na malé mřížce čárky), a jejich tloušťka */
  vicka: string | null;
  vickaS: number;
  /** otevřené oči, když vykukuje: středy, poloosy a odlesk (posun a poloměr) */
  oci: [number, number][];
  oko: [number, number];
  odlesk: [number, number, number] | null;
  usta: string | null;
  tvare: [number, number][];
  /** lesk na glazuře podél levé hrany */
  lesk: string;
  /** obláček, do kterého sedá (kreslí se přes spodní hranu střepu) */
  oblak: string | null;
  /** poletující střípek vedle hlavy */
  kus: string | null;
  ruce: Obd[];
  /** kam se dívá (posun očí) */
  pohled: [number, number];
  /** kde na zlatém blikne jiskra */
  jiskra: [number, number];
}

/* ——— Mřížka 32: sedí na obláčku a vznáší se ——— */
const S32: Predloha = {
  w: 32, h: 32, k: 1,
  strep: "M7.5 4.5 Q16 1.5 24 3 L25.5 8.5 L23.5 12 L26.5 17 L23 21.5 H9 L5.5 17 L7.5 13 L5 9 Z",
  spary: "M18.2 2.4 L19.2 6.5 L21.7 9.5 L25.5 8.5 M21.7 9.5 L22.5 13.2 L21.3 16.8 L23 21.5 M7.5 13 L11.7 15.5 L13.2 21.5",
  kusVlny: "M18.2 1.5 L24.5 2 L26.5 8.2 L21.7 9.5 L19.2 6.5 Z",
  kusKvet: "M7.5 13 L11.7 15.5 L13.2 21.5 H9 L5.5 17 Z",
  vlnky: "M19 5.3 a1.4 1.4 0 0 1 2.8 0 a1.4 1.4 0 0 1 2.8 0 M20.4 7.7 a1.4 1.4 0 0 1 2.8 0 a1.4 1.4 0 0 1 2.8 0",
  kvet: [9.5, 17.4],
  vicka: "M11.9 10.9 Q13.3 12.3 14.7 10.9 M17 10.8 Q18.4 12.2 19.8 10.8", vickaS: 0.95,
  oci: [], oko: [0, 0], odlesk: null,
  usta: "M15 13.9 Q15.85 14.7 16.7 13.9",
  tvare: [[11.9, 13.4], [19.9, 13.3]],
  lesk: "M8.6 6.4 Q9.6 9 9.3 11.8",
  oblak: "M7 26.4 A3.3 3.3 0 1 1 8.4 21.1 A5.5 5.5 0 0 1 16 20.5 A5.5 5.5 0 0 1 23.6 21.1 A3.3 3.3 0 1 1 25 26.4 A7 7 0 0 1 16 26.4 A7 7 0 0 1 7 26.4 Z",
  kus: "M27.7 3.9 L30.4 3.2 L31 5.9 L28.5 6.8 Z",
  ruce: [],
  pohled: [0, 0],
  jiskra: [9.6, 6.6],
};
/* ——— Mřížka 32: vykukuje zpoza hrany (spodek kresby je hrana), oči má otevřené ——— */
const V32: Predloha = {
  w: 32, h: 19, k: 1,
  strep: "M7.5 5.5 Q16 2.5 24 4 L25.5 9.5 L23.5 13 L26.5 18 L23 22.5 H9 L5.5 18 L7.5 14 L5 10 Z",
  spary: "M18.2 3.4 L19.2 7.5 L21.7 10.5 L25.5 9.5 M21.7 10.5 L22.5 14.2 L21.3 17.8 L23 22.5 M7.5 14 L11.7 16.5 L13.2 22.5",
  kusVlny: "M18.2 2.5 L24.5 3 L26.5 9.2 L21.7 10.5 L19.2 7.5 Z",
  kusKvet: "M7.5 14 L11.7 16.5 L13.2 22.5 H9 L5.5 18 Z",
  vlnky: "M19 6.3 a1.4 1.4 0 0 1 2.8 0 a1.4 1.4 0 0 1 2.8 0 M20.4 8.7 a1.4 1.4 0 0 1 2.8 0 a1.4 1.4 0 0 1 2.8 0",
  kvet: null,
  vicka: null, vickaS: 0,
  oci: [[13.3, 12.6], [18.6, 12.5]], oko: [1.15, 1.4], odlesk: [-0.4, -0.5, 0.45],
  usta: null,
  tvare: [],
  lesk: "M8.6 7.4 Q9.6 10 9.3 12.8",
  oblak: null,
  kus: null,
  ruce: [{ x: 4.6, y: 15.7, w: 4.8, h: 3.4, rx: 1.6 }, { x: 22.4, y: 15.7, w: 4.8, h: 3.4, rx: 1.6 }],
  pohled: [-0.45, 0.1],
  jiskra: [9.6, 7.6],
};
/* ——— Mřížka 16: sedí na obláčku. Jedna spára, oči dvě čárky, bez úst a bez poletujícího střípku. ——— */
const S16: Predloha = {
  w: 16, h: 16, k: 0.5,
  strep: "M3.5 2.5 Q8 1 12 1.5 L13 4.5 L12 6 L13.5 8.5 L11.5 11 H4.5 L2.5 8.5 L3.5 6.5 L2.5 4.5 Z",
  spary: "M9 1.3 L9.6 3.4 L11 4.9 L13 4.5",
  kusVlny: "M9 0.8 L12.4 1 L13.6 4.4 L11 4.9 L9.6 3.4 Z",
  kusKvet: "M3.5 6.5 L5.8 7.8 L6.5 11 H4.5 L2.5 8.5 Z",
  vlnky: null,
  kvet: [4.6, 8.7],
  vicka: "M5 6.5 h2 M9 6.5 h2", vickaS: 1,
  oci: [], oko: [0, 0], odlesk: null,
  usta: null,
  tvare: [],
  lesk: "M4.3 3.4 Q4.8 4.6 4.6 5.8",
  oblak: "M3.6 13.3 A1.9 1.9 0 1 1 4.4 10.4 A2.2 2.2 0 0 1 8 10.2 A2.2 2.2 0 0 1 11.6 10.4 A1.9 1.9 0 1 1 12.4 13.3 A3.6 3.6 0 0 1 8 13.3 A3.6 3.6 0 0 1 3.6 13.3 Z",
  kus: null,
  ruce: [],
  pohled: [0, 0],
  jiskra: [4.8, 3.4],
};
const V16: Predloha = {
  w: 16, h: 9.5, k: 0.5,
  strep: "M3.5 3 Q8 1.5 12 2 L13 5 L12 6.5 L13.5 9 L11.5 11.5 H4.5 L2.5 9 L3.5 7 L2.5 5 Z",
  spary: "M9 1.8 L9.6 3.9 L11 5.4 L13 5",
  kusVlny: "M9 1.3 L12.4 1.5 L13.6 4.9 L11 5.4 L9.6 3.9 Z",
  kusKvet: "M3.5 7 L5.8 8.3 L6.5 11.5 H4.5 L2.5 9 Z",
  vlnky: null,
  kvet: null,
  vicka: null, vickaS: 0,
  oci: [[6.3, 6.5], [9.3, 6.5]], oko: [0.75, 0.95], odlesk: null,
  usta: null,
  tvare: [],
  lesk: "M4.3 3.9 Q4.8 5.1 4.6 6.3",
  oblak: null,
  kus: null,
  ruce: [{ x: 2.2, y: 7.8, w: 2.6, h: 1.7, rx: 0.8 }, { x: 11.2, y: 7.8, w: 2.6, h: 1.7, rx: 0.8 }],
  pohled: [-0.3, 0],
  jiskra: [4.8, 3.9],
};

const PLATEK = "M0 0 C-2.5 -1.5 -4.1 -3.9 -4.2 -6.6 C-4.3 -9.4 -3.1 -11.5 -1.9 -12.6 L0 -9.5 L1.9 -12.6 C3.1 -11.5 4.3 -9.4 4.2 -6.6 C4.1 -3.9 2.5 -1.5 0 0 Z";
const HVEZDA = "M0 -1 Q0.18 -0.18 1 0 Q0.18 0.18 0 1 Q-0.18 0.18 -1 0 Q-0.18 -0.18 0 -1 Z";

const c = (n: number) => String(Math.round(n * 100) / 100);
const obd = ({ x, y, w, h, rx }: Obd, atributy = "") => `<rect x="${c(x)}" y="${c(y)}" width="${c(w)}" height="${c(h)}" rx="${c(rx)}"${atributy}/>`;
const cesta = (d: string | null, atributy = "") => (d ? `<path d="${d}"${atributy}/>` : "");
const ruce = (m: Predloha, atributy = "") => m.ruce.map((r) => obd(r, atributy)).join("");
/** Oči: zavřené obloučky, když medituje; otevřené tečky, které mrkají, když vykukuje. */
const oci = (m: Predloha, barva: string, odlesk: string | null) =>
  m.vicka
    ? `<path d="${m.vicka}" stroke="${barva}" stroke-width="${c(m.vickaS)}"${m.k === 1 ? ` stroke-linecap="round"` : ""} fill="none"/>`
    : `<g class="sp-oci">` +
      m.oci.map(([x, y]) => `<ellipse cx="${c(x + m.pohled[0])}" cy="${c(y + m.pohled[1])}" rx="${m.oko[0]}" ry="${m.oko[1]}" fill="${barva}"/>`).join("") +
      (odlesk && m.odlesk ? m.oci.map(([x, y]) => `<circle cx="${c(x + m.pohled[0] + m.odlesk![0])}" cy="${c(y + m.pohled[1] + m.odlesk![1])}" r="${m.odlesk![2]}" fill="${odlesk}"/>`).join("") : "") +
      `</g>`;
const usta = (m: Predloha, barva: string) => (m.usta ? `<path d="${m.usta}" stroke="${barva}" stroke-width="${c(0.85 * m.k)}" stroke-linecap="round" fill="none"/>` : "");
const tvare = (m: Predloha, barva: string, op: number) => m.tvare.map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1.4" ry="0.85" fill="${barva}" opacity="${op}"/>`).join("");
/** Poletující střípek vedle hlavy: hýbe se, když je styles/schovka.css */
const kus = (m: Predloha, atributy: string) => (m.kus ? `<path class="ss-kus" d="${m.kus}"${atributy} stroke-linejoin="round"/>` : "");
/** Květ z loga na dolním kusu: pět plátků, na malé mřížce jen tečka */
const kvet = (m: Predloha, vypln: string, lem: string | null, stred: string | null) => {
  if (!m.kvet) return "";
  const [x, y] = m.kvet;
  if (m.k !== 1) return `<circle cx="${x}" cy="${y}" r="0.8" fill="${vypln}"/>`;
  return (
    `<g transform="translate(${x} ${y}) scale(0.14)" fill="${vypln}"${lem ? ` stroke="${lem}" stroke-width="1.6" stroke-linejoin="round"` : ""}>` +
    [0, 72, 144, 216, 288].map((u) => `<path d="${PLATEK}" transform="rotate(${u + 14}) translate(0 -1.7)"/>`).join("") +
    `</g>` +
    (stred ? `<circle cx="${x}" cy="${y}" r="0.45" fill="${stred}"/>` : "")
  );
};
/** Výřez na tvar střepu: kusy z cizího nádobí, spáry a světlo na hraně nesmí přetéct přes okraj */
const vyrez = (m: Predloha, id: string) => `<clipPath id="${id}-c"><path d="${m.strep}"/></clipPath>`;
/** Spára: na malé mřížce je o něco tlustší než ostatní čáry, jinak by z ní nezbylo nic. Kulaté konce dojdou až přes hranu. */
const spara = (m: Predloha, barva: string, s: number, atributy = "") =>
  cesta(m.spary, ` stroke="${barva}" stroke-width="${c(s * (m.k === 1 ? 1 : 0.75))}" stroke-linejoin="round" stroke-linecap="round" fill="none"${atributy}`);

/* ═══ Černá: silueta jako vyřezaný erb, spáry jsou mezery mezi kusy ═══ */
const cerna = (m: Predloha, id: string) => {
  const k = m.k;
  let maska = `<g fill="#fff">${cesta(m.strep)}</g>`;
  /* spáry: tudy je slepený, takže střep vypadá složený z kusů */
  maska += spara(m, "#000", k === 1 ? 1 : 1.3);
  /* květ na dolním kusu je taky díra; na malé mřížce by vypadal jako třetí oko, tam není */
  if (k === 1) maska += kvet(m, "#000", null, null);
  maska += oci(m, "#000", "#fff");
  maska += usta(m, "#000");
  /* obláček se od střepu oddělí mezerou, ručky taky, ať je vidět, že se drží hrany */
  maska += cesta(m.oblak, ` fill="#fff" stroke="#000" stroke-width="${c(0.95 * k)}"`);
  maska += ruce(m, ` fill="#fff" stroke="#000" stroke-width="${c(0.9 * k)}"`);
  return (
    `<defs><mask id="${id}-m" maskUnits="userSpaceOnUse" x="-2" y="-2" width="${m.w + 4}" height="${m.h + 6}">${maska}</mask></defs>` +
    kus(m, ` fill="#1E1A18"`) +
    `<rect x="-2" y="-2" width="${m.w + 4}" height="${m.h + 6}" fill="#1E1A18" mask="url(#${id}-m)"/>`
  );
};

/* ═══ Průhledná: střep skla ═══ */
const pruhledna = (m: Predloha, id: string) => {
  const k = m.k;
  const vlasek = `stroke="#2B2420" stroke-opacity="0.42" stroke-width="${c(1.6 * k)}"`;
  const bila = `stroke="#FFFFFF" stroke-opacity="0.95" stroke-width="${c(0.75 * k)}"`;
  let s =
    `<defs><linearGradient id="${id}-l" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="#FFFFFF" stop-opacity="0.5"/><stop offset="0.42" stop-color="#FFFFFF" stop-opacity="0.1"/><stop offset="0.8" stop-color="#D8E8F4" stop-opacity="0.16"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0.3"/></linearGradient>` +
    vyrez(m, id) +
    /* sklo je vidět skrz, takže spodek střepu se za obláčkem musí vyříznout */
    (m.oblak ? `<mask id="${id}-p" maskUnits="userSpaceOnUse" x="-2" y="-2" width="${m.w + 4}" height="${m.h + 6}"><rect x="-2" y="-2" width="${m.w + 4}" height="${m.h + 6}" fill="#fff"/><path d="${m.oblak}" fill="#000"/></mask>` : "") +
    `</defs>`;
  s += kus(m, ` fill="url(#${id}-l)" ${vlasek}`) + kus(m, ` fill="none" ${bila}`);
  s += m.oblak ? `<g mask="url(#${id}-p)">` : `<g>`;
  s += cesta(m.strep, ` fill="url(#${id}-l)" ${vlasek} stroke-linejoin="round"`);
  /* kusy z cizího skla: horní do modra, dolní mléčný */
  s += `<g clip-path="url(#${id}-c)">${cesta(m.kusVlny, ` fill="#BFD9EE" fill-opacity="0.4"`)}${cesta(m.kusKvet, ` fill="#FFFFFF" fill-opacity="0.34"`)}`;
  if (m.vlnky) s += cesta(m.vlnky, ` stroke="#FFFFFF" stroke-opacity="0.9" stroke-width="0.5" fill="none"`);
  if (k === 1) s += kvet(m, "#FFFFFF", null, null).replace("<g ", '<g fill-opacity="0.85" ');
  /* spáry jako světlé linky */
  s += spara(m, "#2B2420", 1.4, ` stroke-opacity="0.3"`) + spara(m, "#FFFFFF", 0.7);
  s += `</g>`;
  s += cesta(m.strep, ` fill="none" ${bila} stroke-linejoin="round"`);
  s += `</g>`;
  s += ruce(m, ` fill="url(#${id}-l)" ${vlasek}`) + ruce(m, ` fill="none" ${bila}`);
  s += oci(m, "#2B2420", "#FFFFFF").replace("<path ", '<path stroke-opacity="0.62" ').replace('<g class="sp-oci">', '<g class="sp-oci" fill-opacity="0.62">');
  if (m.usta) s += `<path d="${m.usta}" stroke="#2B2420" stroke-opacity="0.5" stroke-width="${c(1.4 * k)}" fill="none" stroke-linecap="round"/><path d="${m.usta}" stroke="#FFFFFF" stroke-width="${c(0.7 * k)}" fill="none" stroke-linecap="round"/>`;
  /* lesk na skle: pruh podél levé hrany */
  s += `<path d="${m.lesk}" stroke="#FFFFFF" stroke-width="${c(1.1 * k)}" fill="none" stroke-linecap="round"/>`;
  /* obláček je jen pára: mléčná výplň a tatáž linka */
  s += cesta(m.oblak, ` fill="#FFFFFF" fill-opacity="0.3" ${vlasek}`) + cesta(m.oblak, ` fill="none" ${bila}`);
  return s;
};

/* ═══ Zlatá: celý z kovu, s hranou a jiskrou ═══ */
const zlata = (m: Predloha, id: string) => {
  const k = m.k;
  let s =
    `<defs><linearGradient id="${id}-z" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="#FFF2BC"/><stop offset="0.32" stop-color="#F2C95E"/><stop offset="0.68" stop-color="#C9922E"/><stop offset="1" stop-color="#8E6418"/></linearGradient>` +
    `<linearGradient id="${id}-k" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E2B552"/><stop offset="0.5" stop-color="#A9781E"/><stop offset="1" stop-color="#6E4A12"/></linearGradient>` +
    `<linearGradient id="${id}-h" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFBEA"/><stop offset="0.5" stop-color="#FFFBEA" stop-opacity="0"/></linearGradient>` +
    `<linearGradient id="${id}-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF6D2"/><stop offset="0.5" stop-color="#F2CF74"/><stop offset="1" stop-color="#C9922E"/></linearGradient>` +
    vyrez(m, id) +
    `</defs>`;
  s += kus(m, ` fill="url(#${id}-z)" stroke="#6E4A12" stroke-width="${c(0.7 * k)}"`);
  s += cesta(m.strep, ` fill="url(#${id}-z)"`);
  s += `<g clip-path="url(#${id}-c)">`;
  /* kusy z cizího nádobí: horní světlé zlato s vlnkami, dolní tmavší s květem */
  s += cesta(m.kusVlny, ` fill="#FFF2BC" fill-opacity="0.75"`) + cesta(m.kusKvet, ` fill="url(#${id}-k)"`);
  if (m.vlnky) s += cesta(m.vlnky, ` stroke="#A9781E" stroke-width="0.5" fill="none"`);
  /* hrana, na kterou padá světlo */
  s += cesta(m.strep, ` fill="none" stroke="url(#${id}-h)" stroke-width="${c(2.7 * k)}" stroke-linejoin="round"`);
  s += kvet(m, "#FFF2BC", null, "#A9781E");
  s += `</g>`;
  s += cesta(m.strep, ` fill="none" stroke="#6E4A12" stroke-width="${c(0.95 * k)}" stroke-linejoin="round"`);
  /* spáry: světlejší zlato s tmavým okrajem */
  s += `<g clip-path="url(#${id}-c)">${spara(m, "#6E4A12", 1.5)}${spara(m, "#FFF2BC", 0.75)}</g>`;
  s += tvare(m, "#FFE29A", 0.75);
  s += ruce(m, ` fill="url(#${id}-z)" stroke="#6E4A12" stroke-width="${c(0.95 * k)}"`);
  s += oci(m, "#3E2606", "#FFF8DC");
  s += usta(m, "#3E2606");
  s += cesta(m.oblak, ` fill="url(#${id}-b)" stroke="#B8862A" stroke-width="${c(0.5 * k)}"`);
  /* jiskra: čtyřcípá hvězdička na rameni, občas blikne */
  s += `<g transform="translate(${m.jiskra[0]} ${m.jiskra[1]}) scale(${c(2.6 * k)})"><path class="sp-jiskra" d="${HVEZDA}" fill="#FFFFFF"/></g>`;
  return s;
};

/* ═══ Barvy loga: soumrak ze značky, zlaté spáry, kus noci s květem sakury ═══ */
const logo = (m: Predloha, id: string) => {
  const k = m.k;
  let s =
    `<defs><linearGradient id="${id}-s" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="#C4432B"/><stop offset="0.36" stop-color="#C0708A"/><stop offset="0.7" stop-color="#7A5E8E"/><stop offset="1" stop-color="#3E3C78"/></linearGradient>` +
    `<linearGradient id="${id}-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF6DC"/><stop offset="0.55" stop-color="#FBE9B7"/><stop offset="1" stop-color="#E2B95A"/></linearGradient>` +
    vyrez(m, id) +
    `</defs>`;
  s += kus(m, ` fill="#FBE9B7" stroke="#B8862A" stroke-width="${c(0.6 * k)}"`);
  s += cesta(m.strep, ` fill="url(#${id}-s)"`);
  s += `<g clip-path="url(#${id}-c)">`;
  s += cesta(m.kusVlny, ` fill="#FBE9B7"`) + cesta(m.kusKvet, ` fill="#2A2C5E"`);
  if (m.vlnky) s += cesta(m.vlnky, ` stroke="#3E3C78" stroke-opacity="0.75" stroke-width="0.5" fill="none"`);
  /* květ z loga na kusu noci: pět plátků se zlatým lemem, uprostřed rumělka */
  s += kvet(m, "#FBE9B7", "#E2B95A", "#C4432B");
  /* lesk glazury podél levé hrany */
  s += `<path d="${m.lesk}" stroke="#FBE9B7" stroke-width="${c(0.8 * k)}" stroke-linecap="round" fill="none" opacity="0.5"/>`;
  s += `</g>`;
  s += cesta(m.strep, ` fill="none" stroke="#2A2C5E" stroke-opacity="0.9" stroke-width="${c(0.95 * k)}" stroke-linejoin="round"`);
  /* spáry zlaté se světlým středem; přes obrys jdou až na hranu */
  s += `<g clip-path="url(#${id}-c)">${spara(m, "#E2B95A", 1.3)}${spara(m, "#FBE9B7", 0.45)}</g>`;
  s += tvare(m, "#F7CFCB", 0.55);
  s += ruce(m, ` fill="#C0708A" stroke="#2A2C5E" stroke-opacity="0.9" stroke-width="${c(0.95 * k)}"`);
  s += oci(m, "#2A2C5E", "#FBE9B7");
  s += usta(m, "#FBE9B7");
  /* obláček bez obrysu, jen se zlatým vláskem, ať se na papíře neztratí */
  s += cesta(m.oblak, ` fill="url(#${id}-b)" stroke="#E2B95A" stroke-width="${c(0.5 * k)}"`);
  return s;
};

const KRESBY: Record<SchovkaBarva, (m: Predloha, id: string) => string> = { cerna, pruhledna, zlata, logo };

let citac = 0;

/** Střípek na schovávanou jako SVG text */
export function stripekSchovka({ barva = "logo", velikost = 32, poza = "stoji", id, trida = "", zpozdeni }: SchovkaVolby = {}) {
  const velka = velikost >= VELKA_OD;
  const m = poza === "vykukuje" ? (velka ? V32 : V16) : velka ? S32 : S16;
  const pid = id ?? `ss${(citac++).toString(36)}`;
  /* posun animací podle id, ať dva Střípci na stránce nemrkají naráz */
  const z = zpozdeni ?? -([...pid].reduce((a, znak) => (a * 31 + znak.charCodeAt(0)) % 997, 7) % 53) / 10;
  const vyska = Math.round((velikost * m.h) / m.w * 100) / 100;
  const kresba = KRESBY[barva](m, pid);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" class="schovka schovka-stripek schovka-${barva} schovka-${poza} ${trida}" viewBox="0 0 ${m.w} ${m.h}" width="${velikost}" height="${vyska}" style="--sp-z:${c(z)}s" fill="none" aria-hidden="true" focusable="false">` +
    /* vznáší se jen ten, co se nedrží hrany; vykukující se o hranu ořízne, ať pod ní střep nepřečuhuje */
    (poza === "vykukuje"
      ? `<clipPath id="${pid}-o"><rect x="-4" y="-4" width="${m.w + 8}" height="${m.h + 4}"/></clipPath><g clip-path="url(#${pid}-o)">${kresba}</g>`
      : `<g class="sb-let">${kresba}</g>`) +
    `</svg>`
  );
}
