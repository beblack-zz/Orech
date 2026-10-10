/**
 * Pecinka na schovávanou — zjednodušená kresba pro hry na hledání po webu.
 * Je vždycky malá (16–64 px), a proto má dvě optické velikosti: kresbu na
 * mřížce 32 pro velikost od 22 px nahoru a zvlášť kreslenou na mřížce 16
 * pro úplně malou, kde už se nevejde provaz s papírky ani úsměv. Hrany
 * leží na celých nebo půlkách bodu mřížky, ať se nerozmazávají.
 *
 * Čtyři barvy, každá řešená zvlášť (ne jen přebarvená):
 *   cerna      silueta jako vyřezaný erb: oči, dvířka a provaz jsou díry,
 *              takže ve tmě splyne úplně
 *   pruhledna  skleněná figurka: jen bílá linka s tmavým vláskem, lesk
 *              a v dvířkách prosvítá oheň — nejtěžší k nalezení
 *   zlata      kov s hranou, na kterou padá světlo, a jiskrou, co občas blikne
 *   logo       soumrak ze značky (rumělka, růžová, fialová, noc) a ve
 *              dvířkách svítí květ sakury z loga
 *
 * Dvě pózy: `stoji` a `vykukuje` — kouká zpoza hrany, o kterou se drží
 * ručkama. Vykukující kresba je nižší (spodek je hrana, za kterou se
 * schovává), hra ji staví spodkem na horní okraj čehokoli.
 *
 * Generátor vrací SVG jako text, takže jde použít při sestavení stránky
 * (Pecinka.astro) i za běhu ve hře. Pohyb (mrkání, plamínek, kouř, jiskra)
 * je v styles/schovka.css; bez něj zůstane hezký nehybný obrázek.
 */

export type SchovkaBarva = "cerna" | "pruhledna" | "zlata" | "logo";
export type SchovkaPoza = "stoji" | "vykukuje";

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
  komin: Obd;
  telo: Obd;
  provaz: string;
  provazS: number;
  /** pruhy na provazu (jen na velké mřížce) */
  provazCarky: boolean;
  shide: [number, number][];
  shideM: number;
  oci: [number, number][];
  oko: [number, number];
  /** odlesk v oku (posun a poloměr), na malé mřížce není */
  odlesk: [number, number, number] | null;
  usta: string | null;
  tvare: [number, number][];
  dvirka: Obd | null;
  plameny: [number, number, number][];
  geta: { x: number; w: number }[];
  getaY: number;
  zuby: boolean;
  ruce: Obd[];
  /** kam se dívá (posun očí) */
  pohled: [number, number];
}

/* ——— Mřížka 32: stojí ——— */
const S32: Predloha = {
  w: 32, h: 32, k: 1,
  komin: { x: 20, y: 2.5, w: 4.5, h: 7, rx: 1.4 },
  telo: { x: 4, y: 6.5, w: 24, h: 19.5, rx: 5.2 },
  provaz: "M3.3 9.2 Q16 12.2 28.7 9.2", provazS: 2.1, provazCarky: true,
  shide: [[7, 10.4], [25, 10.4]], shideM: 0.21,
  oci: [[12.3, 13.4], [19.7, 13.4]], oko: [1.2, 1.5], odlesk: [-0.4, -0.55, 0.48],
  usta: "M14.5 16.2 Q16 17.5 17.5 16.2",
  tvare: [[9.8, 15.4], [22.2, 15.4]],
  dvirka: { x: 9, y: 18.4, w: 14, h: 6.2, rx: 2 },
  plameny: [[13, 24.4, 2.4], [16, 24.4, 3.3], [19, 24.4, 2.2]],
  geta: [{ x: 6.5, w: 7 }, { x: 18.5, w: 7 }], getaY: 26.2, zuby: true,
  ruce: [],
  pohled: [0, 0],
};
/* ——— Mřížka 32: vykukuje zpoza hrany (spodek kresby je hrana) ——— */
const V32: Predloha = {
  w: 32, h: 19, k: 1,
  komin: { x: 20, y: 0.6, w: 4.5, h: 7, rx: 1.4 },
  telo: { x: 4, y: 4.6, w: 24, h: 19.5, rx: 5.2 },
  provaz: "M3.3 7.3 Q16 10.3 28.7 7.3", provazS: 2.1, provazCarky: true,
  shide: [[7, 8.5], [25, 8.5]], shideM: 0.21,
  oci: [[12.3, 12.9], [19.7, 12.9]], oko: [1.2, 1.5], odlesk: [-0.6, -0.55, 0.48],
  usta: null,
  tvare: [],
  dvirka: null,
  plameny: [],
  geta: [], getaY: 0, zuby: false,
  ruce: [{ x: 5.5, y: 15.6, w: 5, h: 3.4, rx: 1.6 }, { x: 21.5, y: 15.6, w: 5, h: 3.4, rx: 1.6 }],
  pohled: [-0.45, 0.15],
};
/* ——— Mřížka 16: stojí. Bez papírků a bez úsměvu, oči jsou dvě tečky. ——— */
const S16: Predloha = {
  w: 16, h: 16, k: 0.5,
  komin: { x: 10, y: 1, w: 2.4, h: 4, rx: 0.7 },
  telo: { x: 2, y: 3.2, w: 12, h: 10, rx: 2.6 },
  provaz: "M1.6 5.1 Q8 6.4 14.4 5.1", provazS: 1.2, provazCarky: false,
  shide: [], shideM: 0,
  oci: [[6.1, 7.6], [9.9, 7.6]], oko: [0.75, 0.95], odlesk: null,
  usta: null,
  tvare: [],
  dvirka: { x: 4.6, y: 9.6, w: 6.8, h: 2.8, rx: 0.9 },
  plameny: [[8, 12.2, 1.6]],
  geta: [{ x: 3.5, w: 3 }, { x: 9.5, w: 3 }], getaY: 13.4, zuby: false,
  ruce: [],
  pohled: [0, 0],
};
const V16: Predloha = {
  w: 16, h: 9.5, k: 0.5,
  komin: { x: 10, y: 0.4, w: 2.4, h: 4, rx: 0.7 },
  telo: { x: 2, y: 2.4, w: 12, h: 10, rx: 2.6 },
  provaz: "M1.6 4.3 Q8 5.6 14.4 4.3", provazS: 1.2, provazCarky: false,
  shide: [], shideM: 0,
  oci: [[6.1, 6.6], [9.9, 6.6]], oko: [0.75, 0.95], odlesk: null,
  usta: null,
  tvare: [],
  dvirka: null,
  plameny: [],
  geta: [], getaY: 0, zuby: false,
  ruce: [{ x: 2.6, y: 7.8, w: 2.6, h: 1.7, rx: 0.8 }, { x: 10.8, y: 7.8, w: 2.6, h: 1.7, rx: 0.8 }],
  pohled: [-0.3, 0],
};

/** Od jaké velikosti v pixelech se kreslí podle mřížky 32 */
export const VELKA_OD = 22;

const SHIDE_D = "M-4 0 h5 v6 h3 v6 h-3 v6 h3 v6 h-5 v-6 h-3 v-6 h3 v-6 h-3 Z";
const PLATEK = "M0 0 C-2.5 -1.5 -4.1 -3.9 -4.2 -6.6 C-4.3 -9.4 -3.1 -11.5 -1.9 -12.6 L0 -9.5 L1.9 -12.6 C3.1 -11.5 4.3 -9.4 4.2 -6.6 C4.1 -3.9 2.5 -1.5 0 0 Z";
const HVEZDA = "M0 -1 Q0.18 -0.18 1 0 Q0.18 0.18 0 1 Q-0.18 0.18 -1 0 Q-0.18 -0.18 0 -1 Z";

const c = (n: number) => String(Math.round(n * 100) / 100);
const obd = ({ x, y, w, h, rx }: Obd, atributy = "") => `<rect x="${c(x)}" y="${c(y)}" width="${c(w)}" height="${c(h)}" rx="${c(rx)}"${atributy}/>`;

/** Obrys celé postavy: komín, tělo, geta a ručky — jedna barva, jeden obrys */
const geta = (m: Predloha) =>
  m.geta
    .map(({ x, w }) => {
      const deska = obd({ x, y: m.getaY, w, h: m.k * 1.6, rx: m.k * 0.5 });
      if (!m.zuby) return obd({ x, y: m.getaY, w, h: 1.6, rx: 0.5 });
      return deska + obd({ x: x + 0.6, y: m.getaY + 1.5, w: 1.5, h: 2.3, rx: 0.3 }) + obd({ x: x + w - 2.1, y: m.getaY + 1.5, w: 1.5, h: 2.3, rx: 0.3 });
    })
    .join("");
const silueta = (m: Predloha) => obd(m.komin) + obd(m.telo) + geta(m) + m.ruce.map((r) => obd(r)).join("");
const shideTvar = (m: Predloha, atributy = "") =>
  m.shide.map(([x, y]) => `<path d="${SHIDE_D}" transform="translate(${c(x)} ${c(y)}) scale(${m.shideM})"${atributy}/>`).join("");
const oci = (m: Predloha, barva: string, odlesk: string | null) =>
  `<g class="sp-oci">` +
  m.oci.map(([x, y]) => `<ellipse cx="${c(x + m.pohled[0])}" cy="${c(y + m.pohled[1])}" rx="${m.oko[0]}" ry="${m.oko[1]}" fill="${barva}"/>`).join("") +
  (odlesk && m.odlesk ? m.oci.map(([x, y]) => `<circle cx="${c(x + m.pohled[0] + m.odlesk![0])}" cy="${c(y + m.pohled[1] + m.odlesk![1])}" r="${m.odlesk![2]}" fill="${odlesk}"/>`).join("") : "") +
  `</g>`;
const plamenD = ([x, y, h]: [number, number, number]) => `M${c(x)} ${c(y)} Q${c(x - h * 0.42)} ${c(y - h * 0.4)} ${c(x)} ${c(y - h)} Q${c(x + h * 0.42)} ${c(y - h * 0.4)} ${c(x)} ${c(y)} Z`;
const plameny = (m: Predloha, barva: string, jadro: string | null) =>
  m.plameny.length
    ? `<g class="sp-plamen"><path d="${m.plameny.map(plamenD).join(" ")}" fill="${barva}"/>` +
      (jadro ? `<path d="${m.plameny.map(([x, y, h]) => plamenD([x, y, h * 0.55])).join(" ")}" fill="${jadro}"/>` : "") +
      `</g>`
    : "";
/** Obláček kouře nad komínem (jen se hýbe, když je styles/schovka.css) */
const kour = (m: Predloha, barva: string) =>
  m.k === 1 ? `<circle class="sp-kour" cx="${c(m.komin.x + m.komin.w / 2)}" cy="${c(m.komin.y - 1.2)}" r="1.3" fill="${barva}" opacity="0"/>` : "";

/* ═══ Černá: silueta jako vyřezaný erb, detaily jsou díry ═══ */
const cerna = (m: Predloha, id: string) => {
  const k = m.k;
  let maska = `<g fill="#fff">${silueta(m)}</g>`;
  /* provaz: oddělený od těla úzkou mezerou nad i pod ním */
  maska += `<path d="${m.provaz}" stroke="#000" stroke-width="${c(m.provazS + 1.6 * k)}" fill="none" stroke-linecap="round"/>`;
  maska += `<path d="${m.provaz}" stroke="#fff" stroke-width="${c(m.provazS)}" fill="none" stroke-linecap="round"/>`;
  if (m.provazCarky) maska += `<path d="${m.provaz}" stroke="#000" stroke-width="${c(m.provazS)}" stroke-dasharray="0.55 1.45" fill="none"/>`;
  if (m.shide.length) maska += shideTvar(m, ` fill="#fff" stroke="#000" stroke-width="${c(0.7 / m.shideM)}" stroke-linejoin="round"`);
  maska += oci(m, "#000", "#fff");
  if (m.usta) maska += `<path d="${m.usta}" stroke="#000" stroke-width="${c(0.95 * k)}" fill="none" stroke-linecap="round"/>`;
  if (m.dvirka) maska += obd(m.dvirka, ` fill="none" stroke="#000" stroke-width="${c(1 * k)}"`);
  maska += plameny(m, "#000", null);
  /* ručky se od těla oddělí mezerou, ať je vidět, že se drží hrany */
  maska += m.ruce.map((r) => obd(r, ` fill="#fff" stroke="#000" stroke-width="${c(0.9 * k)}"`)).join("");
  return (
    `<defs><mask id="${id}-m" maskUnits="userSpaceOnUse" x="-2" y="-2" width="${m.w + 4}" height="${m.h + 4}">${maska}</mask></defs>` +
    kour(m, "#1E1A18") +
    `<rect x="-2" y="-2" width="${m.w + 4}" height="${m.h + 4}" fill="#1E1A18" mask="url(#${id}-m)"/>`
  );
};

/* ═══ Průhledná: skleněná figurka ═══ */
const pruhledna = (m: Predloha, id: string) => {
  const k = m.k;
  const vlasek = `stroke="#2B2420" stroke-opacity="0.42" stroke-width="${c(1.6 * k)}"`;
  const bila = `stroke="#FFFFFF" stroke-opacity="0.95" stroke-width="${c(0.75 * k)}"`;
  let s =
    `<defs><linearGradient id="${id}-l" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="#FFFFFF" stop-opacity="0.5"/><stop offset="0.42" stop-color="#FFFFFF" stop-opacity="0.1"/><stop offset="0.8" stop-color="#D8E8F4" stop-opacity="0.16"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0.3"/></linearGradient>` +
    `<radialGradient id="${id}-o" cx="0.5" cy="0.9" r="0.7"><stop offset="0" stop-color="#FF9A4A" stop-opacity="0.55"/><stop offset="1" stop-color="#FF9A4A" stop-opacity="0"/></radialGradient></defs>`;
  s += kour(m, "#FFFFFF");
  s += `<g fill="url(#${id}-l)" ${vlasek}>${silueta(m)}</g>`;
  s += `<g fill="none" ${bila}>${silueta(m)}</g>`;
  /* v dvířkách prosvítá oheň */
  if (m.dvirka) s += obd(m.dvirka, ` fill="url(#${id}-o)" ${vlasek}`) + obd(m.dvirka, ` fill="none" ${bila}`);
  s += plameny(m, "#FFB45A", "#FFF4D6").replace('<g class="sp-plamen">', '<g class="sp-plamen" opacity="0.75">');
  s += `<path d="${m.provaz}" fill="none" stroke="#2B2420" stroke-opacity="0.42" stroke-width="${c(m.provazS + 1 * k)}" stroke-linecap="round"/>`;
  s += `<path d="${m.provaz}" fill="none" stroke="#FFFFFF" stroke-opacity="0.9" stroke-width="${c(m.provazS - 0.3 * k)}" stroke-linecap="round"/>`;
  if (m.provazCarky) s += `<path d="${m.provaz}" fill="none" stroke="#2B2420" stroke-opacity="0.25" stroke-width="${c(m.provazS - 0.3 * k)}" stroke-dasharray="0.55 1.45"/>`;
  if (m.shide.length) s += shideTvar(m, ` fill="#FFFFFF" fill-opacity="0.55" stroke="#2B2420" stroke-opacity="0.45" stroke-width="${c(0.6 / m.shideM)}" stroke-linejoin="round"`);
  s += oci(m, "#2B2420", "#FFFFFF").replace('<g class="sp-oci">', '<g class="sp-oci" fill-opacity="0.62">');
  if (m.usta) s += `<path d="${m.usta}" stroke="#2B2420" stroke-opacity="0.5" stroke-width="${c(1.4 * k)}" fill="none" stroke-linecap="round"/><path d="${m.usta}" stroke="#FFFFFF" stroke-width="${c(0.7 * k)}" fill="none" stroke-linecap="round"/>`;
  /* lesk na skle: oblouk vlevo nahoře a tečka na komíně */
  const t = m.telo;
  s += `<path d="M${c(t.x + 2.1 * (t.w / 24))} ${c(t.y + t.h * 0.52)} Q${c(t.x + 2.1 * (t.w / 24))} ${c(t.y + 2.4 * (t.h / 19.5))} ${c(t.x + 5.4 * (t.w / 24))} ${c(t.y + 2 * (t.h / 19.5))}" stroke="#FFFFFF" stroke-width="${c(1.1 * k)}" fill="none" stroke-linecap="round"/>`;
  s += `<circle cx="${c(m.komin.x + m.komin.w * 0.32)}" cy="${c(m.komin.y + 1.6 * k)}" r="${c(0.55 * k)}" fill="#FFFFFF"/>`;
  return s;
};

/* ═══ Zlatá: kov s hranou a jiskrou ═══ */
const zlata = (m: Predloha, id: string) => {
  const k = m.k, t = m.telo;
  let s =
    `<defs><linearGradient id="${id}-z" gradientUnits="userSpaceOnUse" x1="${c(t.x)}" y1="${c(m.komin.y)}" x2="${c(t.x + t.w)}" y2="${c(m.h)}">` +
    `<stop offset="0" stop-color="#FFF2BC"/><stop offset="0.32" stop-color="#F2C95E"/><stop offset="0.68" stop-color="#C9922E"/><stop offset="1" stop-color="#8E6418"/></linearGradient>` +
    `<linearGradient id="${id}-h" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFBEA"/><stop offset="0.5" stop-color="#FFFBEA" stop-opacity="0"/></linearGradient></defs>`;
  s += kour(m, "#F2C95E");
  s += `<g fill="url(#${id}-z)" stroke="#6E4A12" stroke-width="${c(0.95 * k)}" stroke-linejoin="round">${silueta(m)}</g>`;
  /* hrana, na kterou padá světlo */
  s += obd({ x: t.x + 0.95 * k, y: t.y + 0.95 * k, w: t.w - 1.9 * k, h: t.h - 1.9 * k, rx: Math.max(0.5, t.rx - 0.9 * k) }, ` fill="none" stroke="url(#${id}-h)" stroke-width="${c(0.8 * k)}"`);
  if (m.tvare.length) s += m.tvare.map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1.5" ry="0.95" fill="#FFE29A" opacity="0.75"/>`).join("");
  if (m.dvirka) s += obd(m.dvirka, ` fill="#7A5214" stroke="#5E3E0C" stroke-width="${c(0.8 * k)}"`);
  s += plameny(m, "#FFE08A", "#FFFBEA");
  s += `<path d="${m.provaz}" fill="none" stroke="#7A5214" stroke-width="${c(m.provazS + 0.9 * k)}" stroke-linecap="round"/>`;
  s += `<path d="${m.provaz}" fill="none" stroke="#FFF2C4" stroke-width="${c(m.provazS)}" stroke-linecap="round"/>`;
  if (m.provazCarky) s += `<path d="${m.provaz}" fill="none" stroke="#C99A3E" stroke-width="${c(m.provazS)}" stroke-dasharray="0.55 1.45"/>`;
  if (m.shide.length) s += shideTvar(m, ` fill="#FFF8E2" stroke="#7A5214" stroke-width="${c(0.75 / m.shideM)}" stroke-linejoin="round"`);
  s += oci(m, "#3E2606", "#FFF8DC");
  if (m.usta) s += `<path d="${m.usta}" stroke="#3E2606" stroke-width="${c(0.95 * k)}" fill="none" stroke-linecap="round"/>`;
  /* jiskra: čtyřcípá hvězdička na rameni, občas blikne */
  s += `<g transform="translate(${c(t.x + 2.6 * (t.w / 24))} ${c(t.y + 2.2 * (t.h / 19.5))}) scale(${c(2.6 * (t.w / 24))})"><path class="sp-jiskra" d="${HVEZDA}" fill="#FFFFFF"/></g>`;
  return s;
};

/* ═══ Barvy loga: soumrak ze značky a ve dvířkách sakura ═══ */
const logo = (m: Predloha, id: string) => {
  const k = m.k, t = m.telo;
  let s =
    `<defs><linearGradient id="${id}-s" gradientUnits="userSpaceOnUse" x1="${c(t.x)}" y1="${c(m.komin.y)}" x2="${c(t.x + t.w)}" y2="${c(m.h)}">` +
    `<stop offset="0" stop-color="#C4432B"/><stop offset="0.36" stop-color="#C0708A"/><stop offset="0.7" stop-color="#7A5E8E"/><stop offset="1" stop-color="#3E3C78"/></linearGradient></defs>`;
  s += kour(m, "#C0708A");
  s += `<g fill="url(#${id}-s)" stroke="#2A2C5E" stroke-opacity="0.9" stroke-width="${c(0.95 * k)}" stroke-linejoin="round">${silueta(m)}</g>`;
  if (m.tvare.length) s += m.tvare.map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1.5" ry="0.95" fill="#F7CFCB" opacity="0.55"/>`).join("");
  if (m.dvirka) {
    const d = m.dvirka;
    s += obd(d, ` fill="#2A2C5E" stroke="#1E2048" stroke-width="${c(0.8 * k)}"`);
    const cx = d.x + d.w / 2, cy = d.y + d.h * 0.52;
    s += `<g class="sp-plamen"><ellipse cx="${c(cx)}" cy="${c(cy)}" rx="${c(d.h * 0.62)}" ry="${c(d.h * 0.42)}" fill="#FBE9B7" opacity="0.28"/>`;
    if (k === 1) {
      /* květ z loga: pět plátků se zlatým lemem, uprostřed rumělka */
      s += `<g transform="translate(${c(cx)} ${c(cy + 0.2)}) scale(0.2)" fill="#FBE9B7" stroke="#E2B95A" stroke-width="1.6" stroke-linejoin="round">${[0, 72, 144, 216, 288].map((u) => `<path d="${PLATEK}" transform="rotate(${u + 14}) translate(0 -1.7)"/>`).join("")}</g>`;
      s += `<circle cx="${c(cx)}" cy="${c(cy + 0.2)}" r="0.55" fill="#C4432B"/>`;
    } else s += `<circle cx="${c(cx)}" cy="${c(cy)}" r="1" fill="#FBE9B7"/><circle cx="${c(cx)}" cy="${c(cy)}" r="0.42" fill="#C4432B"/>`;
    s += `</g>`;
  }
  s += `<path d="${m.provaz}" fill="none" stroke="#B8862A" stroke-width="${c(m.provazS + 0.9 * k)}" stroke-linecap="round"/>`;
  s += `<path d="${m.provaz}" fill="none" stroke="#FBE9B7" stroke-width="${c(m.provazS)}" stroke-linecap="round"/>`;
  if (m.provazCarky) s += `<path d="${m.provaz}" fill="none" stroke="#E2B95A" stroke-width="${c(m.provazS)}" stroke-dasharray="0.55 1.45"/>`;
  if (m.shide.length) s += shideTvar(m, ` fill="#FFF8E8" stroke="#B8862A" stroke-width="${c(0.75 / m.shideM)}" stroke-linejoin="round"`);
  s += oci(m, "#2A2C5E", "#FBE9B7");
  if (m.usta) s += `<path d="${m.usta}" stroke="#FBE9B7" stroke-width="${c(0.95 * k)}" fill="none" stroke-linecap="round"/>`;
  return s;
};

const KRESBY = { cerna, pruhledna, zlata, logo };

export const NAZVY: Record<SchovkaBarva, string> = { cerna: "Černá", pruhledna: "Průhledná", zlata: "Zlatá", logo: "Barvy loga" };

let citac = 0;
export interface SchovkaVolby {
  barva?: SchovkaBarva;
  /** šířka v pixelech; výška se dopočítá (vykukující je nižší) */
  velikost?: number;
  poza?: SchovkaPoza;
  /** prefix id uvnitř kresby; bez něj se vezme z počítadla */
  id?: string;
  /** třídy navíc na <svg> */
  trida?: string;
  /** posun animací v sekundách, ať víc Pecinek nemrká naráz */
  zpozdeni?: number;
}

/** Pecinka na schovávanou jako SVG text */
export function pecinkaSchovka({ barva = "logo", velikost = 32, poza = "stoji", id, trida = "", zpozdeni }: SchovkaVolby = {}) {
  const velka = velikost >= VELKA_OD;
  const m = poza === "vykukuje" ? (velka ? V32 : V16) : velka ? S32 : S16;
  const pid = id ?? `sp${(citac++).toString(36)}`;
  /* posun animací podle id, ať se dvě Pecinky na stránce nemrkají naráz */
  const z = zpozdeni ?? -([...pid].reduce((a, znak) => (a * 31 + znak.charCodeAt(0)) % 997, 7) % 53) / 10;
  const vyska = Math.round((velikost * m.h) / m.w * 100) / 100;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" class="schovka schovka-${barva} schovka-${poza} ${trida}" viewBox="0 0 ${m.w} ${m.h}" width="${velikost}" height="${vyska}" style="--sp-z:${c(z)}s" fill="none" aria-hidden="true" focusable="false">` +
    KRESBY[barva](m, pid) +
    `</svg>`
  );
}
