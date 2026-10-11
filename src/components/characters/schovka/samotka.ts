/**
 * Šamotka na schovávanou — zjednodušená kresba pro hry na hledání po webu,
 * sestra Pecinky z ./pecinka.ts, Bublinky z ./bublinka.ts, Střípka ze
 * ./stripek.ts, Hlínky z ./hlinka.ts, Cedulky z ./cedulka.ts a Kachlíka
 * z ./kachlik.ts (stejné barvy, pózy i volby, takže je hra může střídat).
 * Police z pece: dlouhá deska se spodním pruhem, očka zavřená do úsměvu,
 * pod ní žár a na zádech cizí miska, kterou nese. Ta ji při schovávané
 * prozradí — z úkrytu kouká jako první a ještě se jí na zádech třese.
 *
 * Je jediná z party na šířku, takže i když leží, je kresba nižší než širší
 * (24,5 bodu na 32). Je vždycky malá (16–64 px), a proto má dvě optické
 * velikosti: kresbu na mřížce 32 pro velikost od 22 px nahoru a zvlášť
 * kreslenou na mřížce 16 pro úplně malou — tam zbyde deska s pruhem, miska,
 * žár a dva obloučky očí.
 *
 * Čtyři barvy, každá řešená zvlášť (ne jen přebarvená):
 *   cerna      silueta jako vyřezaný erb: oči, úsměv, spára nad spodním
 *              pruhem a linka glazury na misce jsou díry; miska se nad
 *              deskou vznáší o vlásek a žár je louže tuše
 *   pruhledna  skleněná police: bílá linka s tmavým vláskem, zespodu jí
 *              prosvítá žár — a miska na ní zůstala opravdová, takže to
 *              vypadá, že se vznáší. Nejtěžší k nalezení, a právě ta ji prozradí
 *   zlata      zlatá cihla: kov s hranou, na kterou padá světlo, spodek
 *              z tmavšího zlata, miska ze světlého a na jejím okraji jiskra
 *   logo       soumrak ze značky, spodní pruh a miska v barvě noci, okraj
 *              misky zlatý a na ní květ sakury z loga
 *
 * Dvě pózy: `stoji` (Šamotka nestojí, leží) a `vykukuje` — kouká zpoza
 * hrany, o kterou se drží ručkama, ale jen jedním okem; druhé nechala
 * zavřené. Vykukující kresba je nižší (spodek je hrana, za kterou se
 * schovává), hra ji staví spodkem na horní okraj čehokoli.
 *
 * Šamotka se sama nehýbe — je jediná z party, která to nedělá. Pulzuje jen
 * žár pod ní a stoupají z něj jiskry; jednou za čas pootevře oko, podívá
 * se, kdo jde, a zase ho zavře. Když vykukuje, cinká jí miska na zádech.
 * Pohyb je v styles/schovka.css; bez něj zůstane hezký nehybný obrázek.
 *
 * Generátor vrací SVG jako text, takže jde použít při sestavení stránky
 * (Samotka.astro) i za běhu ve hře.
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
  /** deska (vykukující sahá pod hranu) a spodní pruh, který je o tón tmavší */
  telo: Obd;
  spodek: Obd | null;
  /** bílý nátěr na horní hraně, co chrání desku před glazurou (jen na velké mřížce) */
  nater: string | null;
  /** kroužek, který na desce zůstal po hrnku: střed a poloosy (silueta ho nemá, vypadal by jako díra na pověšení) */
  krouzek: [number, number, number, number] | null;
  /** miska na zádech: střed okraje, horní hrana, šířka a výška i s nožkou */
  miska: [number, number, number, number];
  /** očka zavřená do úsměvu, zleva; vykukující má zavřené jen levé */
  vicka: string[];
  vickaS: number;
  /** pravé oko otevřené: střed a poloosy */
  oko: [number, number, number, number] | null;
  /** když leží, je otevřené oko vidět jen na chvilku (střídá se s pravým víčkem) */
  pokuk: boolean;
  usta: string | null;
  tvare: Bod[];
  /** žár pod deskou: střed a poloosy (vykukující ho má za hranou) */
  zar: [number, number, number, number] | null;
  /** jiskry v žáru: střed a poloměr */
  jiskry: [number, number, number][];
  ruce: Obd[];
  /** lesk na skle: šikmé čárky jako na okenní tabulce */
  lesk: string;
}

/* ——— Mřížka 32: leží, pod ní žár ——— */
const S32: Predloha = {
  w: 32, h: 24.5, k: 1,
  telo: { x: 1.5, y: 8.5, w: 29, h: 10, rx: 1.5 },
  spodek: { x: 1.5, y: 16.5, w: 29, h: 4, rx: 1.2 },
  nater: "M3.4 9.7 H28.6",
  krouzek: [26, 12.6, 2.2, 1.1],
  miska: [8.6, 2.1, 10, 6.4],
  vicka: ["M11.6 12.3 Q13.1 10.3 14.6 12.3", "M17.4 12.3 Q18.9 10.3 20.4 12.3"], vickaS: 0.95,
  oko: [18.9, 11.6, 1.15, 1.35], pokuk: true,
  usta: "M14.7 14.2 Q16 15.4 17.3 14.2",
  tvare: [[10.1, 13.9], [21.9, 13.9]],
  zar: [16, 21.5, 11.5, 2.2],
  jiskry: [[7.6, 21.6, 0.55], [16.6, 22.1, 0.45], [24.4, 21.5, 0.55]],
  ruce: [],
  lesk: "M3.8 14 L6 11.3 M5.6 14.4 L6.5 13.3",
};
/* ——— Mřížka 32: vykukuje zpoza hrany (spodek kresby je hrana). Jedno oko nechala zavřené, druhým kouká. ——— */
const V32: Predloha = {
  w: 32, h: 14, k: 1,
  telo: { x: 1.5, y: 7, w: 29, h: 9, rx: 1.5 },
  spodek: null,
  nater: "M3.4 8.2 H28.6",
  krouzek: null,
  miska: [8.6, 0.6, 10, 6.4],
  vicka: ["M11.9 10.9 Q13.4 9 14.9 10.9"], vickaS: 0.95,
  oko: [18.5, 10.3, 1.2, 1.45], pokuk: false,
  usta: null,
  tvare: [],
  zar: null,
  jiskry: [],
  ruce: [{ x: 2.6, y: 10.6, w: 5, h: 3.4, rx: 1.6 }, { x: 24.4, y: 10.6, w: 5, h: 3.4, rx: 1.6 }],
  lesk: "M21.6 11.2 L23.2 9.2",
};
/* ——— Mřížka 16: leží. Bez úsměvu, tvářiček, nátěru a jisker; oko neotvírá. ——— */
const S16: Predloha = {
  w: 16, h: 12.25, k: 0.5,
  telo: { x: 0.75, y: 4.25, w: 14.5, h: 5, rx: 0.8 },
  spodek: { x: 0.75, y: 8.25, w: 14.5, h: 2, rx: 0.6 },
  nater: null,
  krouzek: null,
  miska: [4.4, 0.95, 5.2, 3.3],
  vicka: ["M5.4 7 Q6.3 5.4 7.2 7", "M8.8 7 Q9.7 5.4 10.6 7"], vickaS: 0.7,
  oko: null, pokuk: false,
  usta: null,
  tvare: [],
  zar: [8, 10.9, 5.6, 1.1],
  jiskry: [],
  ruce: [],
  lesk: "M12.4 7.1 L13.3 6",
};
const V16: Predloha = {
  w: 16, h: 7.5, k: 0.5,
  telo: { x: 0.75, y: 3.6, w: 14.5, h: 6, rx: 0.8 },
  spodek: null,
  nater: null,
  krouzek: null,
  miska: [4.4, 0.3, 5.2, 3.3],
  vicka: ["M5.5 6 Q6.4 4.5 7.3 6"], vickaS: 0.7,
  oko: [9.6, 5.5, 0.75, 0.95], pokuk: false,
  usta: null,
  tvare: [],
  zar: null,
  jiskry: [],
  ruce: [{ x: 1.2, y: 5.8, w: 2.6, h: 1.7, rx: 0.8 }, { x: 12.2, y: 5.8, w: 2.6, h: 1.7, rx: 0.8 }],
  lesk: "M11.4 5.4 L12.2 4.4",
};

const PLATEK = "M0 0 C-2.5 -1.5 -4.1 -3.9 -4.2 -6.6 C-4.3 -9.4 -3.1 -11.5 -1.9 -12.6 L0 -9.5 L1.9 -12.6 C3.1 -11.5 4.3 -9.4 4.2 -6.6 C4.1 -3.9 2.5 -1.5 0 0 Z";
const HVEZDA = "M0 -1 Q0.18 -0.18 1 0 Q0.18 0.18 0 1 Q-0.18 0.18 -1 0 Q-0.18 -0.18 0 -1 Z";
/* jiskry stoupají soumrakem: rumělka, růžová, fialová */
const SOUMRAK = ["#C4432B", "#C0708A", "#7A5E8E"];

const c = (n: number) => String(Math.round(n * 100) / 100);
const obd = ({ x, y, w, h, rx }: Obd, atributy = "") => `<rect x="${c(x)}" y="${c(y)}" width="${c(w)}" height="${c(h)}" rx="${c(rx)}"${atributy}/>`;
const cesta = (d: string | null, atributy = "") => (d ? `<path d="${d}"${atributy}/>` : "");
const telo = (m: Predloha, atributy = "") => obd(m.telo, atributy);
const spodek = (m: Predloha, atributy = "") => (m.spodek ? obd(m.spodek, atributy) : "");
/** Celý obrys i se spodním pruhem — na sklo, kde by se dva obdélníky přes sebe zdvojily */
const obrys = (m: Predloha, atributy = "") => {
  const t = m.telo, s = m.spodek;
  return obd({ x: t.x, y: t.y, w: t.w, h: s ? s.y + s.h - t.y : t.h, rx: t.rx }, atributy);
};
/** Linka, kde začíná spodní pruh; do krajů nedojde, ať deska drží pohromadě */
const spara = (m: Predloha, atributy: string) => (m.spodek ? `<path d="M${c(m.spodek.x + 1.5 * m.k)} ${c(m.spodek.y)} H${c(m.spodek.x + m.spodek.w - 1.5 * m.k)}" stroke-linecap="round" fill="none"${atributy}/>` : "");
const nater = (m: Predloha, barva: string, op: number) => cesta(m.nater, ` stroke="${barva}" stroke-width="0.6" stroke-linecap="round" fill="none" opacity="${op}"`);
const krouzek = (m: Predloha, atributy: string) => (m.krouzek ? `<ellipse cx="${m.krouzek[0]}" cy="${m.krouzek[1]}" rx="${m.krouzek[2]}" ry="${m.krouzek[3]}"${atributy}/>` : "");
const ruce = (m: Predloha, atributy = "") => m.ruce.map((r) => obd(r, atributy)).join("");

/* ——— Miska: čajová miska s nožkou, u okraje pruh glazury a z něj stékají kapky ——— */
const miskaD = ([x, y, w, h]: [number, number, number, number]) => {
  const a = w / 2, p = w * 0.21, n = h * 0.16, d = y + h - n;
  return `M${c(x - a)} ${c(y)} H${c(x + a)} Q${c(x + a - w * 0.02)} ${c(y + (h - n) * 0.82)} ${c(x + p)} ${c(d)} V${c(y + h)} H${c(x - p)} V${c(d)} Q${c(x - a + w * 0.02)} ${c(y + (h - n) * 0.82)} ${c(x - a)} ${c(y)} Z`;
};
const miskaPruh = ([x, y, w, h]: [number, number, number, number]) => {
  const a = w / 2;
  return `M${c(x - a)} ${c(y)} H${c(x + a)} L${c(x + a - w * 0.035)} ${c(y + h * 0.22)} Q${c(x)} ${c(y + h * 0.36)} ${c(x - a + w * 0.035)} ${c(y + h * 0.22)} Z`;
};
/** spodní hrana pruhu jako tah (na díru v siluetě) */
const miskaLinka = ([x, y, w, h]: [number, number, number, number]) => {
  const a = w / 2;
  return `M${c(x - a + w * 0.1)} ${c(y + h * 0.25)} Q${c(x)} ${c(y + h * 0.37)} ${c(x + a - w * 0.1)} ${c(y + h * 0.25)}`;
};
const miskaKapky = ([x, y, w, h]: [number, number, number, number]) =>
  `M${c(x - w * 0.24)} ${c(y + h * 0.27)} v${c(h * 0.17)} M${c(x + w * 0.03)} ${c(y + h * 0.3)} v${c(h * 0.26)} M${c(x + w * 0.25)} ${c(y + h * 0.27)} v${c(h * 0.12)}`;
/**
 * Miska stojí na desce a umí se zachvět (sm-miska ve styles/schovka.css):
 * kolébá se kolem středu svého dna. Střed si nese s sebou v jednotkách
 * kresby; o `nad` bodů se dá nadzvednout (silueta ji od desky dělí mezerou).
 */
const miska = (m: Predloha, obsah: string, nad = 0) => {
  const [x, y, , h] = m.miska;
  return `<g class="sm-miska" style="transform-origin:${c(x)}px ${c(y + h)}px">${nad ? `<g transform="translate(0 ${c(-nad)})">${obsah}</g>` : obsah}</g>`;
};
/** Květ z loga na boku misky: pět plátků, na malé mřížce jen tečka se středem */
const kvet = (m: Predloha, vypln: string, lem: string, stred: string) => {
  const [x, y0, , h] = m.miska;
  const y = y0 + h * 0.54;
  if (m.k !== 1) return `<circle cx="${c(x)}" cy="${c(y)}" r="0.8" fill="${vypln}"/><circle cx="${c(x)}" cy="${c(y)}" r="0.34" fill="${stred}"/>`;
  return (
    `<g transform="translate(${c(x)} ${c(y + 0.15)}) scale(0.125)" fill="${vypln}" stroke="${lem}" stroke-width="1.6" stroke-linejoin="round">` +
    [0, 72, 144, 216, 288].map((u) => `<path d="${PLATEK}" transform="rotate(${u + 14}) translate(0 -1.7)"/>`).join("") +
    `</g><circle cx="${c(x)}" cy="${c(y + 0.15)}" r="0.42" fill="${stred}"/>`
  );
};

/**
 * Oči: zavřené obloučky do úsměvu. Pravé umí otevřít — když vykukuje, má
 * ho otevřené pořád (a mrká jím, sp-oci jako u Pecinky), když leží, jen na
 * chvilku: víčko a oko se vystřídají (sm-vicko a sm-oko ve
 * styles/schovka.css). Bez stylů zůstane oko zavřené. Tečka v něm je buď
 * zornička (na světlém oku), nebo odlesk (na tmavém); pruhl je průhlednost
 * tahů na skle — jako vlastnost tahu, ne celé kresby, tu si bere animace.
 */
const oci = (m: Predloha, linka: string, tecka: string | null, zornicka = false, pruhl = 1) => {
  const tah = pruhl < 1 ? ` stroke-opacity="${pruhl}"` : "";
  let s = m.vicka
    .map((d, i) => `<path${m.pokuk && i === m.vicka.length - 1 ? ` class="sm-vicko"` : ""} d="${d}" stroke="${linka}" stroke-width="${c(m.vickaS)}" stroke-linecap="round" fill="none"${tah}/>`)
    .join("");
  if (!m.oko) return s;
  const [x, y, rx, ry] = m.oko;
  let o = `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${linka}"${pruhl < 1 ? ` fill-opacity="${pruhl}"` : ""}/>`;
  if (tecka && m.k === 1) o += zornicka ? `<circle cx="${c(x - 0.1)}" cy="${c(y + 0.1)}" r="${c(rx * 0.56)}" fill="${tecka}"/>` : `<circle cx="${c(x - 0.4)}" cy="${c(y - 0.5)}" r="0.46" fill="${tecka}"/>`;
  s += m.pokuk ? `<g class="sm-oko" opacity="0">${o}</g>` : `<g class="sp-oci">${o}</g>`;
  return s;
};
const usta = (m: Predloha, barva: string, s = 0.85, atributy = "") => (m.usta ? `<path d="${m.usta}" stroke="${barva}" stroke-width="${c(s * m.k)}" stroke-linecap="round" fill="none"${atributy}/>` : "");
const tvare = (m: Predloha, barva: string, op: number) => m.tvare.map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1.5" ry="0.95" fill="${barva}" opacity="${op}"/>`).join("");
/** Žár pod deskou pulzuje (sm-zar); průhlednost má až tvar uvnitř, skupinu si bere animace */
const zar = (m: Predloha, atributy: string, vyska = 1, posun = 0) =>
  m.zar ? `<g class="sm-zar"><ellipse cx="${m.zar[0]}" cy="${c(m.zar[1] - posun)}" rx="${m.zar[2]}" ry="${c(m.zar[3] * vyska)}"${atributy}/></g>` : "";
/** Jiskry: každá zvlášť, ať můžou jedna po druhé stoupat a hasnout (--sm-i je pořadí). barva dostane pořadí. */
const jiskry = (m: Predloha, barva: (i: number) => string) =>
  m.jiskry.map(([x, y, r], i) => `<g class="sm-jiskra" style="--sm-i:${i}"><circle cx="${x}" cy="${y}" r="${r}" fill="${barva(i)}"/></g>`).join("");

/* ═══ Černá: silueta jako vyřezaný erb, detaily jsou díry ═══ */
const cerna = (m: Predloha, id: string) => {
  const k = m.k;
  const tus = "#1E1A18";
  const plocha = `x="-2" y="-2" width="${m.w + 4}" height="${m.h + 6}"`;
  /* miska se nad deskou vznáší o vlásek, ať je vidět, že je to jiný kus */
  const nad = 0.8 * k;
  /* maska je celá bílá, černé jsou jen díry */
  let maska = `<rect ${plocha} fill="#fff"/>`;
  maska += spara(m, ` stroke="#000" stroke-width="${c(0.7 * k)}"`);
  maska += oci(m, "#000", "#fff");
  maska += usta(m, "#000");
  /* linka glazury pod okrajem misky (hýbe se s ní) */
  maska += miska(m, cesta(miskaLinka(m.miska), ` stroke="#000" stroke-width="${c(0.6 * k)}" stroke-linecap="round" fill="none"`), nad);
  /* ručky se od desky oddělí mezerou, ať je vidět, že se drží hrany */
  maska += ruce(m, ` fill="#fff" stroke="#000" stroke-width="${c(0.9 * k)}"`);
  return (
    `<defs><mask id="${id}-m" maskUnits="userSpaceOnUse" ${plocha}>${maska}</mask></defs>` +
    /* žár je louže tuše pod deskou; mezi ní a deskou zůstane mezera */
    zar(m, ` fill="${tus}"`, 0.62, -0.7 * k) +
    `<g fill="${tus}" mask="url(#${id}-m)">${telo(m)}${spodek(m)}${miska(m, cesta(miskaD(m.miska)), nad)}${ruce(m)}</g>`
  );
};

/* ═══ Průhledná: skleněná police, zespodu prosvítá žár a miska na ní zůstala opravdová ═══ */
const pruhledna = (m: Predloha, id: string) => {
  const k = m.k;
  const vlasek = `stroke="#2B2420" stroke-opacity="0.42" stroke-width="${c(1.6 * k)}"`;
  const bila = `stroke="#FFFFFF" stroke-opacity="0.95" stroke-width="${c(0.75 * k)}"`;
  let s =
    `<defs><linearGradient id="${id}-l" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="#FFFFFF" stop-opacity="0.5"/><stop offset="0.42" stop-color="#FFFFFF" stop-opacity="0.1"/><stop offset="0.8" stop-color="#D8E8F4" stop-opacity="0.16"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0.3"/></linearGradient>` +
    (m.zar ? `<radialGradient id="${id}-g" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#FF9A4A" stop-opacity="0.6"/><stop offset="0.55" stop-color="#FF9A4A" stop-opacity="0.28"/><stop offset="1" stop-color="#FF9A4A" stop-opacity="0"/></radialGradient>` : "") +
    `</defs>`;
  /* žár je vyšší než u ostatních a sahá za desku: sklem prosvítá */
  s += zar(m, ` fill="url(#${id}-g)"`, 1.9, 1.3 * k);
  s += obrys(m, ` fill="url(#${id}-l)" ${vlasek}`) + obrys(m, ` fill="none" ${bila}`);
  s += spara(m, ` stroke="#FFFFFF" stroke-opacity="0.7" stroke-width="${c(0.5 * k)}"`);
  s += nater(m, "#FFFFFF", 0.75);
  /* kroužek po hrnku jako bublinka zatavená ve skle */
  s += krouzek(m, ` fill="#FFFFFF" fill-opacity="0.18" stroke="#FFFFFF" stroke-opacity="0.8" stroke-width="0.4"`);
  s += oci(m, "#2B2420", "#FFFFFF", false, 0.62);
  s += usta(m, "#2B2420", 1.4, ` stroke-opacity="0.5"`) + usta(m, "#FFFFFF", 0.7);
  s += `<path d="${m.lesk}" stroke="#FFFFFF" stroke-width="${c(1 * k)}" fill="none" stroke-linecap="round"/>`;
  s += jiskry(m, () => "#FFB45A");
  /* miska: tenmoku s rezavou glazurou u okraje, jediné místo, kde zůstala barva */
  s += miska(
    m,
    cesta(miskaD(m.miska), ` fill="#3A2E28"`) +
      cesta(miskaPruh(m.miska), ` fill="#9A6236"`) +
      (k === 1 ? cesta(miskaKapky(m.miska), ` stroke="#9A6236" stroke-width="0.7" stroke-linecap="round" fill="none"`) : "") +
      cesta(miskaD(m.miska), ` fill="none" stroke="#2A211C" stroke-width="${c(0.5 * k)}" stroke-linejoin="round"`) +
      `<path d="M${c(m.miska[0] - m.miska[2] * 0.36)} ${c(m.miska[1] + m.miska[3] * 0.12)} h${c(m.miska[2] * 0.2)}" stroke="#FFFFFF" stroke-opacity="0.7" stroke-width="${c(0.5 * k)}" stroke-linecap="round"/>`,
  );
  s += ruce(m, ` fill="url(#${id}-l)" ${vlasek}`) + ruce(m, ` fill="none" ${bila}`);
  return s;
};

/* ═══ Zlatá: zlatá cihla s hranou, miska ze světlého zlata a jiskra ═══ */
const zlata = (m: Predloha, id: string) => {
  const k = m.k, t = m.telo;
  const dole = m.spodek ? m.spodek.y + m.spodek.h : Math.min(m.h, t.y + t.h);
  const [mx, my, mw] = m.miska;
  let s =
    `<defs><linearGradient id="${id}-z" gradientUnits="userSpaceOnUse" x1="${c(t.x + t.w * 0.2)}" y1="${c(t.y)}" x2="${c(t.x + t.w * 0.8)}" y2="${c(dole)}">` +
    `<stop offset="0" stop-color="#FFF2BC"/><stop offset="0.32" stop-color="#F2C95E"/><stop offset="0.68" stop-color="#C9922E"/><stop offset="1" stop-color="#8E6418"/></linearGradient>` +
    `<linearGradient id="${id}-k" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E2B552"/><stop offset="0.5" stop-color="#A9781E"/><stop offset="1" stop-color="#6E4A12"/></linearGradient>` +
    `<linearGradient id="${id}-h" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFBEA"/><stop offset="0.5" stop-color="#FFFBEA" stop-opacity="0"/></linearGradient>` +
    `<linearGradient id="${id}-b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF6D2"/><stop offset="0.5" stop-color="#F2CF74"/><stop offset="1" stop-color="#C9922E"/></linearGradient></defs>`;
  s += zar(m, ` fill="#F2C95E" opacity="0.42"`);
  s += telo(m, ` fill="url(#${id}-z)" stroke="#6E4A12" stroke-width="${c(0.95 * k)}"`);
  /* hrana, na kterou padá světlo */
  s += obd({ x: t.x + 0.95 * k, y: t.y + 0.95 * k, w: t.w - 1.9 * k, h: t.h - 1.9 * k, rx: Math.max(0.4, t.rx - 0.9 * k) }, ` fill="none" stroke="url(#${id}-h)" stroke-width="${c(0.8 * k)}"`);
  s += spodek(m, ` fill="url(#${id}-k)" stroke="#5E3E0C" stroke-width="${c(0.8 * k)}"`);
  /* kroužek po hrnku jako mělký důlek */
  s += krouzek(m, ` fill="#8E6418" opacity="0.3"`);
  s += tvare(m, "#FFE29A", 0.75);
  s += oci(m, "#3E2606", "#FFF8DC");
  s += usta(m, "#3E2606");
  s += jiskry(m, () => "#FFE08A");
  s += miska(
    m,
    cesta(miskaD(m.miska), ` fill="url(#${id}-b)" stroke="#6E4A12" stroke-width="${c(0.8 * k)}" stroke-linejoin="round"`) +
      cesta(miskaLinka(m.miska), ` stroke="#A9781E" stroke-width="${c(0.5 * k)}" stroke-linecap="round" fill="none"`) +
      (k === 1 ? cesta(miskaKapky(m.miska), ` stroke="#A9781E" stroke-width="0.5" stroke-linecap="round" fill="none"`) : ""),
  );
  s += ruce(m, ` fill="url(#${id}-z)" stroke="#6E4A12" stroke-width="${c(0.95 * k)}"`);
  /* jiskra: čtyřcípá hvězdička na okraji misky, občas blikne */
  s += `<g transform="translate(${c(mx + mw / 2 - 0.5 * k)} ${c(my + 0.3 * k)}) scale(${c(2.5 * k)})"><path class="sp-jiskra" d="${HVEZDA}" fill="#FFFFFF"/></g>`;
  return s;
};

/* ═══ Barvy loga: soumrak ze značky, spodek a miska v barvě noci a na misce sakura ═══ */
const logo = (m: Predloha, id: string) => {
  const k = m.k, t = m.telo;
  const dole = m.spodek ? m.spodek.y + m.spodek.h : Math.min(m.h, t.y + t.h);
  let s =
    `<defs><linearGradient id="${id}-s" gradientUnits="userSpaceOnUse" x1="${c(t.x + t.w * 0.15)}" y1="${c(t.y)}" x2="${c(t.x + t.w * 0.85)}" y2="${c(dole)}">` +
    `<stop offset="0" stop-color="#C4432B"/><stop offset="0.36" stop-color="#C0708A"/><stop offset="0.7" stop-color="#7A5E8E"/><stop offset="1" stop-color="#3E3C78"/></linearGradient></defs>`;
  /* žár ve zlaté ze značky, ať je vidět na papíře i v noci */
  s += zar(m, ` fill="#E2B95A" opacity="0.5"`);
  s += telo(m, ` fill="url(#${id}-s)" stroke="#2A2C5E" stroke-opacity="0.9" stroke-width="${c(0.95 * k)}"`);
  s += spodek(m, ` fill="#2A2C5E" stroke="#1E2048" stroke-width="${c(0.8 * k)}"`);
  s += nater(m, "#FBE9B7", 0.8);
  s += krouzek(m, ` fill="#2A2C5E" opacity="0.24"`);
  s += tvare(m, "#F7CFCB", 0.55);
  s += oci(m, "#FBE9B7", "#2A2C5E", true);
  s += usta(m, "#FBE9B7");
  s += jiskry(m, (i) => SOUMRAK[i % SOUMRAK.length]);
  /* miska v barvě noci se zlatým okrajem a na boku květ z loga: pět plátků se zlatým lemem, uprostřed rumělka */
  s += miska(
    m,
    cesta(miskaD(m.miska), ` fill="#2A2C5E" stroke="#1E2048" stroke-width="${c(0.8 * k)}" stroke-linejoin="round"`) +
      `<path d="M${c(m.miska[0] - m.miska[2] / 2 + 0.5 * k)} ${c(m.miska[1] + 0.7 * k)} H${c(m.miska[0] + m.miska[2] / 2 - 0.5 * k)}" stroke="#E2B95A" stroke-width="${c(0.8 * k)}" stroke-linecap="round"/>` +
      kvet(m, "#FBE9B7", "#E2B95A", "#C4432B"),
  );
  s += ruce(m, ` fill="#C0708A" stroke="#2A2C5E" stroke-opacity="0.9" stroke-width="${c(0.95 * k)}"`);
  return s;
};

const KRESBY: Record<SchovkaBarva, (m: Predloha, id: string) => string> = { cerna, pruhledna, zlata, logo };

let citac = 0;

/** Šamotka na schovávanou jako SVG text */
export function samotkaSchovka({ barva = "logo", velikost = 32, poza = "stoji", id, trida = "", zpozdeni }: SchovkaVolby = {}) {
  const velka = velikost >= VELKA_OD;
  const m = poza === "vykukuje" ? (velka ? V32 : V16) : velka ? S32 : S16;
  const pid = id ?? `sm${(citac++).toString(36)}`;
  /* posun animací podle id, ať dvěma Šamotkám na stránce nepulzuje žár naráz */
  const z = zpozdeni ?? -([...pid].reduce((a, znak) => (a * 31 + znak.charCodeAt(0)) % 997, 7) % 53) / 10;
  const vyska = Math.round((velikost * m.h) / m.w * 100) / 100;
  const kresba = KRESBY[barva](m, pid);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" class="schovka schovka-samotka schovka-${barva} schovka-${poza} ${trida}" viewBox="0 0 ${m.w} ${m.h}" width="${velikost}" height="${vyska}" style="--sp-z:${c(z)}s" fill="none" aria-hidden="true" focusable="false">` +
    /* vykukující se o hranu ořízne, ať pod ní deska nepřečuhuje */
    (poza === "vykukuje" ? `<clipPath id="${pid}-o"><rect x="-4" y="-4" width="${m.w + 8}" height="${m.h + 4}"/></clipPath><g clip-path="url(#${pid}-o)">${kresba}</g>` : kresba) +
    `</svg>`
  );
}
