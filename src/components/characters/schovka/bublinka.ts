/**
 * Bublinka na schovávanou — zjednodušená kresba pro hry na hledání po webu,
 * sestra Pecinky z ./pecinka.ts (stejné barvy, pózy i volby, takže je hra
 * může střídat). Koule v černém slaměném klobouku, přivřená očka a u boku
 * bludička.
 *
 * Je vždycky malá (16–64 px), a proto má dvě optické velikosti: kresbu na
 * mřížce 32 pro velikost od 22 px nahoru a zvlášť kreslenou na mřížce 16
 * pro úplně malou — tam zbyde jen klobouk, koule a dvě čárky očí.
 *
 * Čtyři barvy, každá řešená zvlášť (ne jen přebarvená):
 *   cerna      silueta jako vyřezaný erb: oči, úsměv a spára pod kloboukem
 *              jsou díry, takže ve tmě splyne úplně
 *   pruhledna  mýdlová bublina: bílá linka s tmavým vláskem, lesk a po
 *              okraji duha — nejtěžší k nalezení (a je to vlastně ona)
 *   zlata      kov s hranou, na kterou padá světlo, a jiskrou, co občas blikne
 *   logo       soumrak ze značky, klobouk v barvě noci se zlatým pletením
 *              a na něm květ sakury z loga
 *
 * Dvě pózy: `stoji` (Bublinka nestojí nikdy, vznáší se) a `vykukuje` —
 * kouká zpoza hrany, o kterou se drží ručkama. Vykukující kresba je nižší
 * (spodek je hrana, za kterou se schovává), hra ji staví spodkem na horní
 * okraj čehokoli.
 *
 * Generátor vrací SVG jako text, takže jde použít při sestavení stránky
 * (Bublinka.astro) i za běhu ve hře. Pohyb (mrkání, vznášení, bludička,
 * jiskra) je v styles/schovka.css; bez něj zůstane hezký nehybný obrázek.
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
  telo: [number, number, number];
  /** obrys klobouku a oblouk krempy přes čelo (zvlášť, na spáru mezi kloboukem a tělem) */
  klobouk: string;
  krempa: string;
  /** pletené pásy a roztřepené cípy (jen na velké mřížce) */
  pasy: string | null;
  trepeni: string | null;
  /** kam na klobouk patří květ z loga */
  kvet: [number, number];
  /** levý horní roh přivřeného oka, jeho šířka a hloubka */
  oci: [number, number][];
  oko: [number, number];
  odlesk: number;
  oboci: string | null;
  usta: string | null;
  tvare: [number, number][];
  lesk: string;
  leskTecka: [number, number] | null;
  masle: string | null;
  /** bludička u boku: spodek plamínku a jeho výška */
  bludicka: [number, number, number] | null;
  ruce: Obd[];
  /** kam se dívá (posun očí) */
  pohled: [number, number];
}

/* ——— Mřížka 32: vznáší se ——— */
const S32: Predloha = {
  w: 32, h: 32, k: 1,
  telo: [15, 20.4, 9.8],
  klobouk: "M0.6 11.4 Q8.7 8.7 13.5 4.3 Q15 2.9 16.5 4.3 Q21.3 8.7 29.4 11.4 Q15 15.6 0.6 11.4 Z",
  krempa: "M0.6 11.4 Q15 15.6 29.4 11.4",
  pasy: "M7 9.5 Q15 12 23 9.5 M10.6 7 Q15 8.5 19.4 7",
  trepeni: "M1.6 11.7 l-1.7 1.3 l2.5 -0.3 Z M28.4 11.7 l1.7 1.3 l-2.5 -0.3 Z M6.4 12.9 l-0.7 1.5 l1.5 -1 Z M23.6 12.9 l0.7 1.5 l-1.5 -1 Z",
  kvet: [15, 9.4],
  oci: [[10.2, 19.4], [16.8, 19.4]], oko: [3, 1.65], odlesk: 0.42,
  oboci: "M9.8 18.1 L13.4 18.7 M16.6 18.7 L20.2 18.1",
  usta: "M12.4 24.3 Q13.7 25.6 15 24.3 Q16.3 23 17.6 24.3",
  tvare: [[9.9, 23.2], [20.1, 23.2]],
  lesk: "M22.6 22.8 A8 8 0 0 1 18.4 27.6", leskTecka: [8.6, 17.1],
  masle: "M15 28 l-1.5 -1 v2 Z M15 28 l1.5 -1 v2 Z",
  bludicka: [28.7, 23.6, 5.2],
  ruce: [],
  pohled: [0, 0],
};
/* ——— Mřížka 32: vykukuje zpoza hrany (spodek kresby je hrana) ——— */
const V32: Predloha = {
  w: 32, h: 19, k: 1,
  telo: [16, 18.6, 9.8],
  klobouk: "M1.6 9 Q9.7 6.3 14.5 1.9 Q16 0.5 17.5 1.9 Q22.3 6.3 30.4 9 Q16 13.2 1.6 9 Z",
  krempa: "M1.6 9 Q16 13.2 30.4 9",
  pasy: "M8 7.1 Q16 9.6 24 7.1 M11.6 4.6 Q16 6.1 20.4 4.6",
  trepeni: "M2.6 9.3 l-1.7 1.3 l2.5 -0.3 Z M29.4 9.3 l1.7 1.3 l-2.5 -0.3 Z",
  kvet: [16, 7],
  oci: [[11.2, 13.5], [17.8, 13.5]], oko: [3, 1.65], odlesk: 0.42,
  oboci: null,
  usta: null,
  tvare: [],
  lesk: "M24.4 14.4 A9 9 0 0 1 25.4 17.6", leskTecka: null,
  masle: null,
  bludicka: null,
  ruce: [{ x: 5.2, y: 15.7, w: 5, h: 3.4, rx: 1.6 }, { x: 21.8, y: 15.7, w: 5, h: 3.4, rx: 1.6 }],
  pohled: [-0.5, 0.1],
};
/* ——— Mřížka 16: vznáší se. Bez úsměvu a bez pletení, oči jsou dvě čárky. ——— */
const S16: Predloha = {
  w: 16, h: 16, k: 0.5,
  telo: [8, 10.3, 4.9],
  klobouk: "M0.6 5.8 Q4.8 4.5 7.2 2.3 Q8 1.6 8.8 2.3 Q11.2 4.5 15.4 5.8 Q8 7.9 0.6 5.8 Z",
  krempa: "M0.6 5.8 Q8 7.9 15.4 5.8",
  pasy: null,
  trepeni: null,
  kvet: [8, 4.8],
  oci: [[5.3, 9.7], [8.9, 9.7]], oko: [1.8, 1.05], odlesk: 0,
  oboci: null,
  usta: null,
  tvare: [],
  lesk: "M11.8 11.4 A4 4 0 0 1 9.7 13.8", leskTecka: null,
  masle: null,
  bludicka: null,
  ruce: [],
  pohled: [0, 0],
};
const V16: Predloha = {
  w: 16, h: 9.5, k: 0.5,
  telo: [8, 9.4, 4.9],
  klobouk: "M0.6 4.6 Q4.8 3.3 7.2 1.1 Q8 0.4 8.8 1.1 Q11.2 3.3 15.4 4.6 Q8 6.7 0.6 4.6 Z",
  krempa: "M0.6 4.6 Q8 6.7 15.4 4.6",
  pasy: null,
  trepeni: null,
  kvet: [8, 3.6],
  oci: [[5.3, 6.8], [8.9, 6.8]], oko: [1.8, 1.05], odlesk: 0,
  oboci: null,
  usta: null,
  tvare: [],
  lesk: "M12.2 7.2 A4.4 4.4 0 0 1 12.6 8.8", leskTecka: null,
  masle: null,
  bludicka: null,
  ruce: [{ x: 2.5, y: 7.8, w: 2.6, h: 1.7, rx: 0.8 }, { x: 10.9, y: 7.8, w: 2.6, h: 1.7, rx: 0.8 }],
  pohled: [-0.3, 0],
};

const PLATEK = "M0 0 C-2.5 -1.5 -4.1 -3.9 -4.2 -6.6 C-4.3 -9.4 -3.1 -11.5 -1.9 -12.6 L0 -9.5 L1.9 -12.6 C3.1 -11.5 4.3 -9.4 4.2 -6.6 C4.1 -3.9 2.5 -1.5 0 0 Z";
const HVEZDA = "M0 -1 Q0.18 -0.18 1 0 Q0.18 0.18 0 1 Q-0.18 0.18 -1 0 Q-0.18 -0.18 0 -1 Z";

const c = (n: number) => String(Math.round(n * 100) / 100);
const obd = ({ x, y, w, h, rx }: Obd, atributy = "") => `<rect x="${c(x)}" y="${c(y)}" width="${c(w)}" height="${c(h)}" rx="${c(rx)}"${atributy}/>`;
const koule = (m: Predloha, atributy = "", o = 0) => `<circle cx="${m.telo[0]}" cy="${m.telo[1]}" r="${c(m.telo[2] - o)}"${atributy}/>`;
const klobouk = (m: Predloha, atributy = "") => `<path d="${m.klobouk}"${atributy}/>` + (m.trepeni ? `<path d="${m.trepeni}"${atributy}/>` : "");
const ruce = (m: Predloha, atributy = "") => m.ruce.map((r) => obd(r, atributy)).join("");
/** Přivřené oko: nahoře rovné víčko, dole oblouk. */
const okoD = (m: Predloha, [x, y]: [number, number]) => {
  const [w, h] = m.oko;
  const [px, py] = m.pohled;
  return `M${c(x + px)} ${c(y + py)} h${w} a${c(w / 2)} ${h} 0 0 1 ${-w} 0 Z`;
};
const oci = (m: Predloha, barva: string, odlesk: string | null) =>
  `<g class="sp-oci"><path d="${m.oci.map((o) => okoD(m, o)).join(" ")}" fill="${barva}"/>` +
  (odlesk && m.odlesk ? m.oci.map(([x, y]) => `<circle cx="${c(x + m.pohled[0] + m.oko[0] * 0.72)}" cy="${c(y + m.pohled[1] + m.oko[1] * 0.42)}" r="${m.odlesk}" fill="${odlesk}"/>`).join("") : "") +
  `</g>`;
const plamenD = ([x, y, h]: [number, number, number]) => `M${c(x)} ${c(y)} Q${c(x - h * 0.46)} ${c(y - h * 0.36)} ${c(x + h * 0.08)} ${c(y - h)} Q${c(x + h * 0.5)} ${c(y - h * 0.4)} ${c(x)} ${c(y)} Z`;
/** Bludička u boku: plamínek, který se hýbe, když je styles/schovka.css */
const bludicka = (m: Predloha, barva: string, jadro: string | null, obrys: string | null = null) =>
  m.bludicka
    ? `<g class="sp-plamen"><path d="${plamenD(m.bludicka)}" fill="${barva}"${obrys ? ` stroke="${obrys}" stroke-width="${c(0.5 * m.k)}" stroke-linejoin="round"` : ""}/>` +
      (jadro ? `<path d="${plamenD([m.bludicka[0], m.bludicka[1] - 0.5, m.bludicka[2] * 0.5])}" fill="${jadro}"/>` : "") +
      `</g>`
    : "";
/** Tvář, která je ve všech barvách stejná, jen jinak vybarvená. */
const tvar = (m: Predloha, cara: string, k: number) =>
  (m.oboci ? `<path d="${m.oboci}" stroke="${cara}" stroke-width="${c(0.6 * k)}" stroke-linecap="round" fill="none"/>` : "") +
  (m.usta ? `<path d="${m.usta}" stroke="${cara}" stroke-width="${c(0.9 * k)}" stroke-linecap="round" fill="none"/>` : "");
const tvare = (m: Predloha, barva: string, op: number) => m.tvare.map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1.5" ry="0.95" fill="${barva}" opacity="${op}"/>`).join("");

/* ═══ Černá: silueta jako vyřezaný erb, detaily jsou díry ═══ */
const cerna = (m: Predloha, id: string) => {
  const k = m.k;
  let maska = `<g fill="#fff">${koule(m)}${klobouk(m)}${ruce(m)}</g>`;
  /* spára pod krempou oddělí klobouk od koule */
  maska += `<path d="${m.krempa}" stroke="#000" stroke-width="${c(0.9 * k)}" fill="none" transform="translate(0 ${c(0.75 * k)})"/>`;
  if (m.pasy) maska += `<path d="${m.pasy}" stroke="#000" stroke-width="0.55" stroke-dasharray="1.5 0.8" fill="none"/>`;
  maska += oci(m, "#000", "#fff");
  maska += tvar(m, "#000", k);
  maska += `<path d="${m.lesk}" stroke="#000" stroke-width="${c(0.9 * k)}" stroke-linecap="round" fill="none"/>`;
  if (m.masle) maska += `<path d="${m.masle}" fill="#000"/>`;
  /* ručky se od těla oddělí mezerou, ať je vidět, že se drží hrany */
  maska += ruce(m, ` fill="#fff" stroke="#000" stroke-width="${c(0.9 * k)}"`);
  return (
    `<defs><mask id="${id}-m" maskUnits="userSpaceOnUse" x="-2" y="-2" width="${m.w + 4}" height="${m.h + 6}">${maska}</mask></defs>` +
    bludicka(m, "#1E1A18", null) +
    `<rect x="-2" y="-2" width="${m.w + 4}" height="${m.h + 6}" fill="#1E1A18" mask="url(#${id}-m)"/>`
  );
};

/* ═══ Průhledná: mýdlová bublina ═══ */
const pruhledna = (m: Predloha, id: string) => {
  const k = m.k;
  const vlasek = `stroke="#2B2420" stroke-opacity="0.42" stroke-width="${c(1.6 * k)}"`;
  const bila = `stroke="#FFFFFF" stroke-opacity="0.95" stroke-width="${c(0.75 * k)}"`;
  let s =
    `<defs><linearGradient id="${id}-l" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="#FFFFFF" stop-opacity="0.5"/><stop offset="0.42" stop-color="#FFFFFF" stop-opacity="0.1"/><stop offset="0.8" stop-color="#D8E8F4" stop-opacity="0.16"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0.3"/></linearGradient>` +
    /* duha po okraji bubliny: růžová, žlutá, zelená, modrá */
    `<linearGradient id="${id}-d" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F2A9C8"/><stop offset="0.35" stop-color="#F6E3A0"/><stop offset="0.65" stop-color="#A6E3C4"/><stop offset="1" stop-color="#9CC6F0"/></linearGradient></defs>`;
  s += bludicka(m, "#DDF2FA", "#FFFFFF", "#7FAFC8").replace('<g class="sp-plamen">', '<g class="sp-plamen" opacity="0.8">');
  s += koule(m, ` fill="url(#${id}-l)" ${vlasek}`);
  s += koule(m, ` fill="none" stroke="url(#${id}-d)" stroke-width="${c(1.5 * k)}" stroke-opacity="0.7"`, 1.2 * k);
  s += koule(m, ` fill="none" ${bila}`);
  s += `<g fill="url(#${id}-l)" ${vlasek} stroke-linejoin="round">${klobouk(m)}${ruce(m)}</g>`;
  s += `<g fill="none" ${bila} stroke-linejoin="round">${klobouk(m)}${ruce(m)}</g>`;
  if (m.pasy) s += `<path d="${m.pasy}" stroke="#2B2420" stroke-opacity="0.34" stroke-width="0.5" stroke-dasharray="1.5 0.8" fill="none"/>`;
  s += oci(m, "#2B2420", "#FFFFFF").replace('<g class="sp-oci">', '<g class="sp-oci" fill-opacity="0.62">');
  if (m.oboci) s += `<path d="${m.oboci}" stroke="#2B2420" stroke-opacity="0.5" stroke-width="${c(0.6 * k)}" stroke-linecap="round" fill="none"/>`;
  if (m.usta) s += `<path d="${m.usta}" stroke="#2B2420" stroke-opacity="0.5" stroke-width="${c(1.4 * k)}" fill="none" stroke-linecap="round"/><path d="${m.usta}" stroke="#FFFFFF" stroke-width="${c(0.7 * k)}" fill="none" stroke-linecap="round"/>`;
  /* lesk: oblouk vpravo dole a tečka vlevo pod krempou */
  s += `<path d="${m.lesk}" stroke="#FFFFFF" stroke-width="${c(1.1 * k)}" fill="none" stroke-linecap="round"/>`;
  if (m.leskTecka) s += `<ellipse cx="${m.leskTecka[0]}" cy="${m.leskTecka[1]}" rx="1.5" ry="0.9" fill="#FFFFFF" transform="rotate(-35 ${m.leskTecka[0]} ${m.leskTecka[1]})"/>`;
  return s;
};

/* ═══ Zlatá: kov s hranou a jiskrou ═══ */
const zlata = (m: Predloha, id: string) => {
  const k = m.k;
  const [cx, cy, r] = m.telo;
  let s =
    `<defs><linearGradient id="${id}-z" gradientUnits="userSpaceOnUse" x1="${c(cx - r)}" y1="${c(cy - r)}" x2="${c(cx + r)}" y2="${c(cy + r)}">` +
    `<stop offset="0" stop-color="#FFF2BC"/><stop offset="0.32" stop-color="#F2C95E"/><stop offset="0.68" stop-color="#C9922E"/><stop offset="1" stop-color="#8E6418"/></linearGradient>` +
    `<linearGradient id="${id}-k" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E2B552"/><stop offset="0.5" stop-color="#A9781E"/><stop offset="1" stop-color="#6E4A12"/></linearGradient>` +
    `<linearGradient id="${id}-h" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFBEA"/><stop offset="0.5" stop-color="#FFFBEA" stop-opacity="0"/></linearGradient></defs>`;
  s += bludicka(m, "#FFE08A", "#FFFBEA", "#8E6418");
  s += koule(m, ` fill="url(#${id}-z)" stroke="#6E4A12" stroke-width="${c(0.95 * k)}"`);
  /* hrana, na kterou padá světlo */
  s += koule(m, ` fill="none" stroke="url(#${id}-h)" stroke-width="${c(0.8 * k)}"`, 0.95 * k);
  s += tvare(m, "#FFE29A", 0.75);
  s += `<g fill="url(#${id}-k)" stroke="#5E3E0C" stroke-width="${c(0.95 * k)}" stroke-linejoin="round">${klobouk(m)}</g>`;
  if (m.pasy) s += `<path d="${m.pasy}" stroke="#FFF2BC" stroke-width="0.5" stroke-dasharray="1.5 0.8" fill="none"/>`;
  s += `<path d="${m.krempa}" stroke="#FFF2BC" stroke-width="${c(0.5 * k)}" fill="none" opacity="0.8" transform="translate(0 ${c(-0.5 * k)})"/>`;
  s += ruce(m, ` fill="url(#${id}-z)" stroke="#6E4A12" stroke-width="${c(0.95 * k)}"`);
  s += oci(m, "#3E2606", "#FFF8DC");
  s += tvar(m, "#3E2606", k);
  s += `<path d="${m.lesk}" stroke="#FFFBEA" stroke-width="${c(0.9 * k)}" stroke-linecap="round" fill="none" opacity="0.9"/>`;
  if (m.masle) s += `<path d="${m.masle}" fill="#5E3E0C"/>`;
  /* jiskra: čtyřcípá hvězdička na rameni, občas blikne */
  s += `<g transform="translate(${c(cx - r * 0.66)} ${c(cy - r * 0.24)}) scale(${c(2.6 * (r / 9.8))})"><path class="sp-jiskra" d="${HVEZDA}" fill="#FFFFFF"/></g>`;
  return s;
};

/* ═══ Barvy loga: soumrak ze značky, klobouk v barvě noci a na něm sakura ═══ */
const logo = (m: Predloha, id: string) => {
  const k = m.k;
  const [cx, cy, r] = m.telo;
  let s =
    `<defs><linearGradient id="${id}-s" gradientUnits="userSpaceOnUse" x1="${c(cx - r)}" y1="${c(cy - r)}" x2="${c(cx + r)}" y2="${c(cy + r)}">` +
    `<stop offset="0" stop-color="#C4432B"/><stop offset="0.36" stop-color="#C0708A"/><stop offset="0.7" stop-color="#7A5E8E"/><stop offset="1" stop-color="#3E3C78"/></linearGradient></defs>`;
  s += bludicka(m, "#FBE9B7", "#FFFFFF", "#B8862A");
  s += koule(m, ` fill="url(#${id}-s)" stroke="#2A2C5E" stroke-opacity="0.9" stroke-width="${c(0.95 * k)}"`);
  s += tvare(m, "#F7CFCB", 0.55);
  s += `<g fill="#2A2C5E" stroke="#1E2048" stroke-width="${c(0.95 * k)}" stroke-linejoin="round">${klobouk(m)}</g>`;
  if (m.pasy) s += `<path d="${m.pasy}" stroke="#E2B95A" stroke-width="0.5" stroke-dasharray="1.5 0.8" fill="none"/>`;
  s += `<path d="${m.krempa}" stroke="#FBE9B7" stroke-width="${c(0.5 * k)}" fill="none" opacity="0.85" transform="translate(0 ${c(-0.5 * k)})"/>`;
  /* květ z loga na klobouku: pět plátků se zlatým lemem, uprostřed rumělka */
  const [kx, ky] = m.kvet;
  if (k === 1) {
    s += `<g transform="translate(${kx} ${ky}) scale(0.15)" fill="#FBE9B7" stroke="#E2B95A" stroke-width="1.6" stroke-linejoin="round">${[0, 72, 144, 216, 288].map((u) => `<path d="${PLATEK}" transform="rotate(${u + 14}) translate(0 -1.7)"/>`).join("")}</g>`;
    s += `<circle cx="${kx}" cy="${ky}" r="0.5" fill="#C4432B"/>`;
  } else s += `<circle cx="${kx}" cy="${ky}" r="0.85" fill="#FBE9B7"/><circle cx="${kx}" cy="${ky}" r="0.36" fill="#C4432B"/>`;
  s += ruce(m, ` fill="#C0708A" stroke="#2A2C5E" stroke-opacity="0.9" stroke-width="${c(0.95 * k)}"`);
  s += oci(m, "#2A2C5E", "#FBE9B7");
  if (m.oboci) s += `<path d="${m.oboci}" stroke="#2A2C5E" stroke-width="${c(0.6 * k)}" stroke-linecap="round" fill="none"/>`;
  if (m.usta) s += `<path d="${m.usta}" stroke="#FBE9B7" stroke-width="${c(0.9 * k)}" stroke-linecap="round" fill="none"/>`;
  s += `<path d="${m.lesk}" stroke="#FBE9B7" stroke-width="${c(0.9 * k)}" stroke-linecap="round" fill="none" opacity="0.7"/>`;
  if (m.masle) s += `<path d="${m.masle}" fill="#FBE9B7"/>`;
  return s;
};

const KRESBY: Record<SchovkaBarva, (m: Predloha, id: string) => string> = { cerna, pruhledna, zlata, logo };

let citac = 0;

/** Bublinka na schovávanou jako SVG text */
export function bublinkaSchovka({ barva = "logo", velikost = 32, poza = "stoji", id, trida = "", zpozdeni }: SchovkaVolby = {}) {
  const velka = velikost >= VELKA_OD;
  const m = poza === "vykukuje" ? (velka ? V32 : V16) : velka ? S32 : S16;
  const pid = id ?? `sb${(citac++).toString(36)}`;
  /* posun animací podle id, ať se dvě Bublinky na stránce nemrkají naráz */
  const z = zpozdeni ?? -([...pid].reduce((a, znak) => (a * 31 + znak.charCodeAt(0)) % 997, 7) % 53) / 10;
  const vyska = Math.round((velikost * m.h) / m.w * 100) / 100;
  const kresba = KRESBY[barva](m, pid);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" class="schovka schovka-bublinka schovka-${barva} schovka-${poza} ${trida}" viewBox="0 0 ${m.w} ${m.h}" width="${velikost}" height="${vyska}" style="--sp-z:${c(z)}s" fill="none" aria-hidden="true" focusable="false">` +
    /* vznáší se jen ta, co se nedrží hrany; vykukující se o hranu ořízne, ať pod ní koule nepřečuhuje */
    (poza === "vykukuje"
      ? `<clipPath id="${pid}-o"><rect x="-4" y="-4" width="${m.w + 8}" height="${m.h + 4}"/></clipPath><g clip-path="url(#${pid}-o)">${kresba}</g>`
      : `<g class="sb-let">${kresba}</g>`) +
    `</svg>`
  );
}
