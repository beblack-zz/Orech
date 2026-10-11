/**
 * Kachlík na schovávanou — zjednodušená kresba pro hry na hledání po webu,
 * bratr Pecinky z ./pecinka.ts, Bublinky z ./bublinka.ts, Střípka ze
 * ./stripek.ts, Hlínky z ./hlinka.ts a Cedulky z ./cedulka.ts (stejné barvy,
 * pózy i volby, takže je hra může střídat). Čtvercový kachel s vnitřním
 * rámečkem na dvou nožkách: rovné obočí, kulatá očka, rovná pusa a v rohu
 * razítko 正 („správný“), které má jako jedinou věc nakřivo. Na hlavě nosí
 * vodováhu jako na Svatozáři pravého úhlu (scripts/kachlik-rovina) — a ta
 * ho při schovávané prozradí: trčí z úkrytu jako první.
 *
 * Je vždycky malý (16–64 px), a proto má dvě optické velikosti: kresbu na
 * mřížce 32 pro velikost od 22 px nahoru a zvlášť kreslenou na mřížce 16
 * pro úplně malou — tam zbyde deska, nožky, vodováha s okénkem, obočí, dvě
 * tečky očí a z razítka čtvereček (rámeček a pusa by se v 16 px slily).
 *
 * Čtyři barvy, každá řešená zvlášť (ne jen přebarvená):
 *   cerna      silueta jako vyřezaný erb: rámeček, obočí, oči, pusa, razítko
 *              a okénko vodováhy jsou díry, bublina v okénku je kapka tuše
 *   pruhledna  skleněná dlaždice: bílá linka s tmavým vláskem, rámeček
 *              a razítko vyleptané; kapalina ve vodováze zůstala zelená —
 *              nejtěžší k nalezení, a právě ta ho prozradí
 *   zlata      zlatá cihlička: kov s hranou, na kterou padá světlo, rámeček
 *              vyrytý, razítko z tmavšího zlata a jiskra, co občas blikne
 *   logo       soumrak ze značky, nožky a vodováha v barvě noci, bublina
 *              rumělková a místo razítka 正 květ sakury z loga
 *
 * Dvě pózy: `stoji` a `vykukuje` — kouká zpoza hrany, o kterou se drží
 * ručkama. Vykukující kresba je nižší (spodek je hrana, za kterou se
 * schovává), hra ji staví spodkem na horní okraj čehokoli.
 *
 * Kachlík se nikdy nenakloní, takže se na rozdíl od ostatních nehoupe ani
 * nedýchá: stojí jako přibitý. Hýbe se jen bublina ve vodováze — občas
 * ujede, on po ní střelí očima a ona se vrátí na střed; když vykukuje,
 * třese se mu a rozhlíží se. Pohyb je v styles/schovka.css; bez něj
 * zůstane hezký nehybný obrázek.
 *
 * Generátor vrací SVG jako text, takže jde použít při sestavení stránky
 * (Kachlik.astro) i za běhu ve hře.
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
  /** deska těla (vykukující sahá pod hranu) */
  telo: Obd;
  /** vnitřní rámeček kachle (na malé mřížce není) */
  ram: Obd | null;
  /** vodováha na hlavě, trubička v ní a poloosy bubliny */
  vaha: Obd;
  trubka: Obd;
  bublina: [number, number];
  /** nožky: středy a poloosy; horní půlka je schovaná za deskou (vykukující je má za hranou) */
  nohy: Bod[];
  noha: [number, number];
  /** obočí je rovné vždycky */
  oboci: string;
  obociS: number;
  oci: Bod[];
  oko: [number, number];
  /** odlesk v oku (posun a poloměr), na malé mřížce není */
  odlesk: [number, number, number] | null;
  usta: string | null;
  tvare: Bod[];
  /** razítko: levý horní roh, strana a o kolik stupňů je nakřivo */
  hanko: [number, number, number, number] | null;
  ruce: Obd[];
  /** kam se dívá (posun očí) */
  pohled: Bod;
  /** lesk na skle: šikmé čárky jako na okenní tabulce */
  lesk: string;
  /** kde na zlatém blikne jiskra */
  jiskra: Bod;
}

/* ——— Mřížka 32: stojí ——— */
const S32: Predloha = {
  w: 32, h: 32, k: 1,
  telo: { x: 5.5, y: 6.5, w: 21, h: 21, rx: 1.7 },
  ram: { x: 7.7, y: 8.7, w: 16.6, h: 16.6, rx: 0.9 },
  vaha: { x: 9, y: 2.3, w: 14, h: 3.4, rx: 0.9 },
  trubka: { x: 13.2, y: 3, w: 5.6, h: 2, rx: 1 },
  bublina: [1.05, 0.62],
  nohy: [[11.6, 28.4], [20.4, 28.4]], noha: [2.7, 1.7],
  oboci: "M10.8 13.3 H14.4 M17.6 13.3 H21.2", obociS: 0.95,
  oci: [[12.6, 16.4], [19.4, 16.4]], oko: [1.15, 1.45], odlesk: [-0.4, -0.55, 0.46],
  usta: "M14 20.4 H18",
  tvare: [[10.3, 19], [21.7, 19]],
  /* na velkých kresbách má razítko nakřivo o čtyři stupně; v téhle velikosti by to nebylo vidět, tak je to dvakrát tolik */
  hanko: [19.7, 21, 3.5, -8],
  ruce: [],
  pohled: [0, 0],
  lesk: "M9.3 24 L11.7 21.4 M11.1 24.2 L12.1 23.1",
  jiskra: [6.7, 7.7],
};
/* ——— Mřížka 32: vykukuje zpoza hrany (spodek kresby je hrana). Kouká stranou, pusu i razítko má za hranou. ——— */
const V32: Predloha = {
  w: 32, h: 19, k: 1,
  telo: { x: 5.5, y: 4.7, w: 21, h: 21, rx: 1.7 },
  ram: { x: 7.7, y: 6.9, w: 16.6, h: 16.6, rx: 0.9 },
  vaha: { x: 9, y: 0.5, w: 14, h: 3.4, rx: 0.9 },
  trubka: { x: 13.2, y: 1.2, w: 5.6, h: 2, rx: 1 },
  bublina: [1.05, 0.62],
  nohy: [], noha: [0, 0],
  oboci: "M10.8 10.2 H14.4 M17.6 10.2 H21.2", obociS: 0.95,
  oci: [[12.6, 13.2], [19.4, 13.2]], oko: [1.2, 1.5], odlesk: [-0.6, -0.55, 0.48],
  usta: null,
  tvare: [],
  hanko: null,
  ruce: [{ x: 6.4, y: 15.6, w: 5, h: 3.4, rx: 1.6 }, { x: 20.6, y: 15.6, w: 5, h: 3.4, rx: 1.6 }],
  pohled: [-0.45, 0.1],
  lesk: "M21.2 9.6 L23 7.6",
  jiskra: [6.7, 5.9],
};
/* ——— Mřížka 16: stojí. Bez rámečku, pusy a tvářiček, z razítka je čtvereček a stojí rovně, ať v 16 px padne na body. ——— */
const S16: Predloha = {
  w: 16, h: 16, k: 0.5,
  telo: { x: 3, y: 3.5, w: 10, h: 10, rx: 1 },
  ram: null,
  vaha: { x: 4.5, y: 1, w: 7, h: 2, rx: 0.5 },
  trubka: { x: 6.5, y: 1.5, w: 3, h: 1, rx: 0.5 },
  bublina: [0.62, 0.36],
  nohy: [[5.6, 13.9], [10.4, 13.9]], noha: [1.5, 1.1],
  oboci: "M5.2 6 H7.2 M8.8 6 H10.8", obociS: 0.7,
  oci: [[6.2, 8.3], [9.8, 8.3]], oko: [0.75, 0.95], odlesk: null,
  usta: null,
  tvare: [],
  hanko: [9.5, 10.5, 2, 0],
  ruce: [],
  pohled: [0, 0],
  lesk: "M4.6 11.8 L5.6 10.6",
  jiskra: [3.6, 4.1],
};
const V16: Predloha = {
  w: 16, h: 9.5, k: 0.5,
  telo: { x: 3, y: 2.75, w: 10, h: 10, rx: 1 },
  ram: null,
  vaha: { x: 4.5, y: 0.25, w: 7, h: 2, rx: 0.5 },
  trubka: { x: 6.5, y: 0.75, w: 3, h: 1, rx: 0.5 },
  bublina: [0.62, 0.36],
  nohy: [], noha: [0, 0],
  oboci: "M5.2 4.6 H7.2 M8.8 4.6 H10.8", obociS: 0.7,
  oci: [[6.2, 6.5], [9.8, 6.5]], oko: [0.75, 0.95], odlesk: null,
  usta: null,
  tvare: [],
  hanko: null,
  ruce: [{ x: 3.4, y: 7.8, w: 2.6, h: 1.7, rx: 0.8 }, { x: 10, y: 7.8, w: 2.6, h: 1.7, rx: 0.8 }],
  pohled: [-0.3, 0],
  lesk: "M10.6 5 L11.4 4",
  jiskra: [3.6, 3.3],
};

const PLATEK = "M0 0 C-2.5 -1.5 -4.1 -3.9 -4.2 -6.6 C-4.3 -9.4 -3.1 -11.5 -1.9 -12.6 L0 -9.5 L1.9 -12.6 C3.1 -11.5 4.3 -9.4 4.2 -6.6 C4.1 -3.9 2.5 -1.5 0 0 Z";
const HVEZDA = "M0 -1 Q0.18 -0.18 1 0 Q0.18 0.18 0 1 Q-0.18 0.18 -1 0 Q-0.18 -0.18 0 -1 Z";

const c = (n: number) => String(Math.round(n * 100) / 100);
const obd = ({ x, y, w, h, rx }: Obd, atributy = "") => `<rect x="${c(x)}" y="${c(y)}" width="${c(w)}" height="${c(h)}" rx="${c(rx)}"${atributy}/>`;
const telo = (m: Predloha, atributy = "") => obd(m.telo, atributy);
const ram = (m: Predloha, atributy: string) => (m.ram ? obd(m.ram, ` fill="none"${atributy}`) : "");
const nohy = (m: Predloha, atributy = "") => m.nohy.map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="${m.noha[0]}" ry="${m.noha[1]}"${atributy}/>`).join("");
const ruce = (m: Predloha, atributy = "") => m.ruce.map((r) => obd(r, atributy)).join("");
const vaha = (m: Predloha, atributy = "") => obd(m.vaha, atributy);
const trubka = (m: Predloha, atributy = "") => obd(m.trubka, atributy);
/** Světlá hrana na horní straně vodováhy */
const vahaLesk = (m: Predloha, barva: string, op: number) => {
  const v = m.vaha;
  return `<path d="M${c(v.x + v.rx)} ${c(v.y + 0.75 * m.k)} H${c(v.x + v.w - v.rx)}" stroke="${barva}" stroke-width="${c(0.5 * m.k)}" stroke-linecap="round" opacity="${op}"/>`;
};
/** Rysky po stranách bubliny, mezi kterými má stát (jen na velké mřížce) */
const rysky = (m: Predloha, barva: string, op: number) => {
  if (m.k !== 1) return "";
  const t = m.trubka, s = t.x + t.w / 2, o = m.bublina[0] + 0.45;
  return `<path d="M${c(s - o)} ${c(t.y)} V${c(t.y + t.h)} M${c(s + o)} ${c(t.y)} V${c(t.y + t.h)}" stroke="${barva}" stroke-width="0.32" opacity="${op}"/>`;
};
/**
 * Bublina ve vodováze: stojí přesně uprostřed a občas ujede (sk-bublina ve
 * styles/schovka.css). O kolik smí, si nese s sebou v jednotkách kresby —
 * trubička je na malé mřížce jinak dlouhá než na velké.
 */
const bublina = (m: Predloha, atributy: string) => {
  const t = m.trubka;
  const posun = (t.w / 2 - m.bublina[0]) * 0.72;
  return `<g class="sk-bublina" style="--sk-b:${c(posun)}px"><ellipse cx="${c(t.x + t.w / 2)}" cy="${c(t.y + t.h / 2)}" rx="${m.bublina[0]}" ry="${m.bublina[1]}"${atributy}/></g>`;
};
const oboci = (m: Predloha, barva: string, atributy = "") => `<path d="${m.oboci}" stroke="${barva}" stroke-width="${c(m.obociS)}" stroke-linecap="round" fill="none"${atributy}/>`;
/**
 * Oči: dvě kulaté tečky, které mrkají (třída sp-oci jako u Pecinky). Občas
 * po bublině střelí pohledem nahoru, a když vykukuje, rozhlížejí se ze
 * strany na stranu (sk-kouk).
 */
const oci = (m: Predloha, barva: string, odlesk: string | null, atributy = "") =>
  `<g class="sk-kouk"${atributy}><g class="sp-oci">` +
  m.oci.map(([x, y]) => `<ellipse cx="${c(x + m.pohled[0])}" cy="${c(y + m.pohled[1])}" rx="${m.oko[0]}" ry="${m.oko[1]}" fill="${barva}"/>`).join("") +
  (odlesk && m.odlesk ? m.oci.map(([x, y]) => `<circle cx="${c(x + m.pohled[0] + m.odlesk![0])}" cy="${c(y + m.pohled[1] + m.odlesk![1])}" r="${m.odlesk![2]}" fill="${odlesk}"/>`).join("") : "") +
  `</g></g>`;
const usta = (m: Predloha, barva: string, s = 0.95, atributy = "") => (m.usta ? `<path d="${m.usta}" stroke="${barva}" stroke-width="${c(s * m.k)}" stroke-linecap="round" fill="none"${atributy}/>` : "");
const tvare = (m: Predloha, barva: string, op: number) => m.tvare.map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1.5" ry="0.95" fill="${barva}" opacity="${op}"/>`).join("");
/**
 * Razítko 正: čtverec pootočený kolem svého středu a v něm tahy znaku
 * (z razítka na kami podobě, characters/kami/Kachlik.astro). Znak se kreslí
 * jen na velké mřížce a jen když dostane barvu.
 */
const hanko = (m: Predloha, plocha: string, tah: string | null = null) => {
  if (!m.hanko) return "";
  const [x, y, s, uhel] = m.hanko;
  const q = s / 14;
  const X = (a: number) => c(x + a * q), Y = (b: number) => c(y + b * q);
  const znak = `M${X(2.8)} ${Y(3.2)} H${X(11.2)} M${X(7)} ${Y(3.2)} V${Y(11)} M${X(7)} ${Y(7)} H${X(10.4)} M${X(4.2)} ${Y(7.4)} V${Y(11)} M${X(2.4)} ${Y(11)} H${X(11.6)}`;
  return (
    `<g${uhel ? ` transform="rotate(${uhel} ${c(x + s / 2)} ${c(y + s / 2)})"` : ""}>` +
    obd({ x, y, w: s, h: s, rx: s * 0.11 }, plocha) +
    (tah && m.k === 1 ? `<path d="${znak}" fill="none" stroke-width="${c(1.5 * q)}" stroke-linecap="square"${tah}/>` : "") +
    `</g>`
  );
};
/** Květ z loga místo razítka: pět plátků, na malé mřížce jen tečka se středem */
const kvet = (m: Predloha, vypln: string, lem: string, stred: string) => {
  if (!m.hanko) return "";
  const x = m.hanko[0] + m.hanko[2] / 2, y = m.hanko[1] + m.hanko[2] / 2;
  if (m.k !== 1) return `<circle cx="${c(x)}" cy="${c(y)}" r="0.95" fill="${vypln}"/><circle cx="${c(x)}" cy="${c(y)}" r="0.4" fill="${stred}"/>`;
  return (
    `<g transform="translate(${c(x)} ${c(y)}) scale(0.16)" fill="${vypln}" stroke="${lem}" stroke-width="1.6" stroke-linejoin="round">` +
    [0, 72, 144, 216, 288].map((u) => `<path d="${PLATEK}" transform="rotate(${u + 14}) translate(0 -1.7)"/>`).join("") +
    `</g><circle cx="${c(x)}" cy="${c(y)}" r="0.5" fill="${stred}"/>`
  );
};

/* ═══ Černá: silueta jako vyřezaný erb, detaily jsou díry ═══ */
const cerna = (m: Predloha, id: string) => {
  const k = m.k, t = m.telo;
  const tus = "#1E1A18";
  const plocha = `x="-2" y="-2" width="${m.w + 4}" height="${m.h + 6}"`;
  /* maska je celá bílá, černé jsou jen díry */
  let maska = `<rect ${plocha} fill="#fff"/>`;
  maska += ram(m, ` stroke="#000" stroke-width="${c(0.62 * k)}"`);
  /* okénko vodováhy; bublina v něm je kapka tuše a kreslí se až přes masku */
  maska += trubka(m, ` fill="#000"`);
  maska += oboci(m, "#000");
  maska += oci(m, "#000", "#fff");
  maska += usta(m, "#000");
  /* razítko je vyříznuté okénko, znak v něm zůstal z tuše */
  maska += hanko(m, ` fill="#000"`, ` stroke="#fff"`);
  /* nožky se od desky oddělí rovnou spárou, ručky mezerou kolem, ať je vidět, že se drží hrany */
  if (m.nohy.length) maska += `<path d="M${c(t.x - 1)} ${c(t.y + t.h + 0.42 * k)} H${c(t.x + t.w + 1)}" stroke="#000" stroke-width="${c(0.84 * k)}"/>`;
  maska += ruce(m, ` fill="#fff" stroke="#000" stroke-width="${c(0.9 * k)}"`);
  return (
    `<defs><mask id="${id}-m" maskUnits="userSpaceOnUse" ${plocha}>${maska}</mask></defs>` +
    `<g fill="${tus}" mask="url(#${id}-m)">${nohy(m)}${telo(m)}${vaha(m)}${ruce(m)}</g>` +
    bublina(m, ` fill="${tus}"`)
  );
};

/* ═══ Průhledná: skleněná dlaždice, jen kapalina ve vodováze zůstala zelená ═══ */
const pruhledna = (m: Predloha, id: string) => {
  const k = m.k, t = m.telo;
  const vlasek = `stroke="#2B2420" stroke-opacity="0.42" stroke-width="${c(1.6 * k)}"`;
  const bila = `stroke="#FFFFFF" stroke-opacity="0.95" stroke-width="${c(0.75 * k)}"`;
  let s =
    `<defs><linearGradient id="${id}-l" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="#FFFFFF" stop-opacity="0.5"/><stop offset="0.42" stop-color="#FFFFFF" stop-opacity="0.1"/><stop offset="0.8" stop-color="#D8E8F4" stop-opacity="0.16"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0.3"/></linearGradient>` +
    /* sklo je vidět skrz, takže z nožek smí být vidět jen to, co kouká zpod desky */
    (m.nohy.length ? `<clipPath id="${id}-n"><rect x="-2" y="${c(t.y + t.h + 0.8 * k)}" width="${m.w + 4}" height="${m.h}"/></clipPath>` : "") +
    `</defs>`;
  if (m.nohy.length) s += `<g clip-path="url(#${id}-n)">${nohy(m, ` fill="url(#${id}-l)" ${vlasek}`)}${nohy(m, ` fill="none" ${bila}`)}</g>`;
  s += telo(m, ` fill="url(#${id}-l)" ${vlasek}`) + telo(m, ` fill="none" ${bila}`);
  /* rámeček a razítko vyleptané do skla */
  s += ram(m, ` stroke="#FFFFFF" stroke-opacity="0.75" stroke-width="${c(0.5 * k)}"`);
  s += hanko(m, ` fill="#FFFFFF" fill-opacity="0.24" stroke="#FFFFFF" stroke-opacity="0.9" stroke-width="${c(0.42 * k)}"`, ` stroke="#FFFFFF" stroke-opacity="0.9"`);
  s += oboci(m, "#2B2420", ` stroke-opacity="0.62"`);
  s += oci(m, "#2B2420", "#FFFFFF", ` fill-opacity="0.62"`);
  s += usta(m, "#2B2420", 1.4, ` stroke-opacity="0.5"`) + usta(m, "#FFFFFF", 0.7);
  s += `<path d="${m.lesk}" stroke="#FFFFFF" stroke-width="${c(1 * k)}" fill="none" stroke-linecap="round"/>`;
  /* vodováha: tělo ze skla, ale kapalina v trubičce je jediné místo, kde zůstala barva */
  s += vaha(m, ` fill="url(#${id}-l)" ${vlasek}`) + vaha(m, ` fill="none" ${bila}`);
  s += trubka(m, ` fill="#BCE07A" stroke="#2B2420" stroke-opacity="0.5" stroke-width="${c(0.5 * k)}"`);
  s += rysky(m, "#2E3A2C", 0.7);
  s += bublina(m, ` fill="#FFFFFF"`);
  s += ruce(m, ` fill="url(#${id}-l)" ${vlasek}`) + ruce(m, ` fill="none" ${bila}`);
  return s;
};

/* ═══ Zlatá: zlatá cihlička s hranou, vyrytým rámečkem a jiskrou ═══ */
const zlata = (m: Predloha, id: string) => {
  const k = m.k, t = m.telo;
  let s =
    `<defs><linearGradient id="${id}-z" gradientUnits="userSpaceOnUse" x1="${c(t.x)}" y1="${c(m.vaha.y)}" x2="${c(t.x + t.w)}" y2="${c(m.h)}">` +
    `<stop offset="0" stop-color="#FFF2BC"/><stop offset="0.32" stop-color="#F2C95E"/><stop offset="0.68" stop-color="#C9922E"/><stop offset="1" stop-color="#8E6418"/></linearGradient>` +
    `<linearGradient id="${id}-k" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E2B552"/><stop offset="0.5" stop-color="#A9781E"/><stop offset="1" stop-color="#6E4A12"/></linearGradient>` +
    `<linearGradient id="${id}-h" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFBEA"/><stop offset="0.5" stop-color="#FFFBEA" stop-opacity="0"/></linearGradient></defs>`;
  s += nohy(m, ` fill="url(#${id}-k)" stroke="#5E3E0C" stroke-width="${c(0.8 * k)}"`);
  s += telo(m, ` fill="url(#${id}-z)" stroke="#6E4A12" stroke-width="${c(0.95 * k)}"`);
  /* hrana, na kterou padá světlo */
  s += obd({ x: t.x + 0.95 * k, y: t.y + 0.95 * k, w: t.w - 1.9 * k, h: t.h - 1.9 * k, rx: Math.max(0.4, t.rx - 0.9 * k) }, ` fill="none" stroke="url(#${id}-h)" stroke-width="${c(0.8 * k)}"`);
  /* rámeček vyrytý do kovu: tmavá rýha a pod ní světlá hrana */
  if (m.ram) s += `<g transform="translate(${c(0.36 * k)} ${c(0.36 * k)})" opacity="0.5">${ram(m, ` stroke="#FFF8DC" stroke-width="${c(0.45 * k)}"`)}</g>` + ram(m, ` stroke="#8E6418" stroke-width="${c(0.55 * k)}" opacity="0.75"`);
  s += tvare(m, "#FFE29A", 0.75);
  /* razítko z tmavšího zlata, znak světlý */
  s += hanko(m, ` fill="#8A5C16" stroke="#5E3E0C" stroke-width="${c(0.4 * k)}"`, ` stroke="#FFF2BC"`);
  s += oboci(m, "#3E2606");
  s += oci(m, "#3E2606", "#FFF8DC");
  s += usta(m, "#3E2606");
  /* vodováha z tmavšího zlata, v okénku světlá bublina */
  s += vaha(m, ` fill="url(#${id}-k)" stroke="#5E3E0C" stroke-width="${c(0.8 * k)}"`) + vahaLesk(m, "#FFF2BC", 0.8);
  s += trubka(m, ` fill="#4A3008"`);
  s += rysky(m, "#C99A3E", 0.9);
  s += bublina(m, ` fill="#FFF2BC"`);
  s += ruce(m, ` fill="url(#${id}-z)" stroke="#6E4A12" stroke-width="${c(0.95 * k)}"`);
  /* jiskra: čtyřcípá hvězdička na rohu, občas blikne */
  s += `<g transform="translate(${m.jiskra[0]} ${m.jiskra[1]}) scale(${c(2.6 * k)})"><path class="sp-jiskra" d="${HVEZDA}" fill="#FFFFFF"/></g>`;
  return s;
};

/* ═══ Barvy loga: soumrak ze značky, vodováha v barvě noci a místo razítka sakura ═══ */
const logo = (m: Predloha, id: string) => {
  const k = m.k, t = m.telo;
  let s =
    `<defs><linearGradient id="${id}-s" gradientUnits="userSpaceOnUse" x1="${c(t.x)}" y1="${c(t.y)}" x2="${c(t.x + t.w)}" y2="${c(Math.min(m.h, t.y + t.h))}">` +
    `<stop offset="0" stop-color="#C4432B"/><stop offset="0.36" stop-color="#C0708A"/><stop offset="0.7" stop-color="#7A5E8E"/><stop offset="1" stop-color="#3E3C78"/></linearGradient></defs>`;
  s += nohy(m, ` fill="#2A2C5E" stroke="#1E2048" stroke-width="${c(0.8 * k)}"`);
  s += telo(m, ` fill="url(#${id}-s)" stroke="#2A2C5E" stroke-opacity="0.9" stroke-width="${c(0.95 * k)}"`);
  s += ram(m, ` stroke="#FBE9B7" stroke-opacity="0.55" stroke-width="${c(0.5 * k)}"`);
  s += tvare(m, "#F7CFCB", 0.55);
  /* místo razítka 正 květ z loga: pět plátků se zlatým lemem, uprostřed rumělka */
  s += kvet(m, "#FBE9B7", "#E2B95A", "#C4432B");
  s += oboci(m, "#2A2C5E");
  s += oci(m, "#2A2C5E", "#FBE9B7");
  s += usta(m, "#FBE9B7");
  /* vodováha v barvě noci, okénko krémové a bublina rumělková */
  s += vaha(m, ` fill="#2A2C5E" stroke="#1E2048" stroke-width="${c(0.8 * k)}"`) + vahaLesk(m, "#E2B95A", 0.85);
  s += trubka(m, ` fill="#FBE9B7"`);
  s += rysky(m, "#B8862A", 0.9);
  s += bublina(m, ` fill="#C4432B"`);
  s += ruce(m, ` fill="#C0708A" stroke="#2A2C5E" stroke-opacity="0.9" stroke-width="${c(0.95 * k)}"`);
  return s;
};

const KRESBY: Record<SchovkaBarva, (m: Predloha, id: string) => string> = { cerna, pruhledna, zlata, logo };

let citac = 0;

/** Kachlík na schovávanou jako SVG text */
export function kachlikSchovka({ barva = "logo", velikost = 32, poza = "stoji", id, trida = "", zpozdeni }: SchovkaVolby = {}) {
  const velka = velikost >= VELKA_OD;
  const m = poza === "vykukuje" ? (velka ? V32 : V16) : velka ? S32 : S16;
  const pid = id ?? `sk${(citac++).toString(36)}`;
  /* posun animací podle id, ať dvěma Kachlíkům na stránce neujíždí bublina naráz */
  const z = zpozdeni ?? -([...pid].reduce((a, znak) => (a * 31 + znak.charCodeAt(0)) % 997, 7) % 53) / 10;
  const vyska = Math.round((velikost * m.h) / m.w * 100) / 100;
  const kresba = KRESBY[barva](m, pid);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" class="schovka schovka-kachlik schovka-${barva} schovka-${poza} ${trida}" viewBox="0 0 ${m.w} ${m.h}" width="${velikost}" height="${vyska}" style="--sp-z:${c(z)}s" fill="none" aria-hidden="true" focusable="false">` +
    /* vykukující se o hranu ořízne, ať pod ní deska nepřečuhuje */
    (poza === "vykukuje" ? `<clipPath id="${pid}-o"><rect x="-4" y="-4" width="${m.w + 8}" height="${m.h + 4}"/></clipPath><g clip-path="url(#${pid}-o)">${kresba}</g>` : kresba) +
    `</svg>`
  );
}
