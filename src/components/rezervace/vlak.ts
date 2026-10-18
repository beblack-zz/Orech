/**
 * Vlak po vodě — rozměry vozu a skládání vlaku z kreseb, které jsou
 * jednou na stránce ve VlakKresby.astro. Čistý modul bez `window`:
 * používá ho build (vlak na pozadí stránky) i prohlížeč (vláček na
 * jízdence má tolik vozů, kolik hodin si člověk vybral).
 *
 * Jednotky jsou „jednotky vlaku“: vůz je 520 dlouhý, y = 0 je hladina,
 * nahoru záporně. Kabina je u vozu vlevo; každý druhý vůz se otočí, takže
 * vlak má kabinu na obou koncích — jako ten dvouvozový ve filmu.
 *
 * Vedle obyčejné soupravy je tu zvláštní vlak na kurz (zvlastniVlak níž):
 * parní lokomotiva, tendr a salonní vůz.
 */

export const VUZ = 520;
export const MEZERA = 14;
/** Rám okna řidiče u kabiny a okna na zadním konci vozu */
export const KABINA = 12;
export const ZADNI = 470;
export const DVERE = [48, 424];
export const OKNA = [94, 130, 166, 202, 238, 274, 310, 346, 382];
/** Středy oken, ve kterých se sedí: šest míst na vůz, jako má dílna na hodinu */
export const SEDADLA = [0, 2, 3, 5, 6, 8].map((i) => OKNA[i] + 14);
/** Sklo oken: horní hrana a výška; dolní část skla (OPERADLA) zakrývají opěradla sedadel */
export const SKLO_Y = -103;
export const SKLO_H = 36;
export const OPERADLA = 0.37;
/** Výška vlaku nad hladinou i se sběračem */
export const VYSKA = 176;
/** Kde vlak na pozadí stránky stojí u nástupiště stanice Ořech */
export const STANICE = 280;

export type Misto = { kdo: "stin" } | { kdo: "ty"; barva: string; jmeno?: string } | null;

export interface Vuz {
  /** Nápis na cedulce vozu — na jízdence čas odjezdu */
  cislo?: string;
  /** Kdo sedí v šesti oknech, zleva doprava */
  mista?: Misto[];
  /** Kresba navíc v souřadnicích vozu, oříznutá na skla oken (Šamotka schovaná na pozadí Rezervace) */
  navic?: string;
}

export const delka = (pocet: number) => pocet * VUZ + Math.max(0, pocet - 1) * MEZERA;

const f = (n: number) => Math.round(n * 10) / 10;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* Stíny se neliší jen polohou — sedí různě hluboko a jsou různě průsvitné */
const POSAZENI = [
  { r: 0.86, dx: -3, op: 0.5 },
  { r: 1, dx: 2, op: 0.58 },
  { r: 0.92, dx: 0, op: 0.46 },
  { r: 1.05, dx: -1, op: 0.55 },
  { r: 0.9, dx: 3, op: 0.62 },
  { r: 0.97, dx: -2, op: 0.5 },
  { r: 0.88, dx: 1, op: 0.56 },
  { r: 1.02, dx: 0, op: 0.48 },
];

function cestujici(mista: Misto[], seminko: number) {
  let out = "";
  mista.forEach((m, i) => {
    if (!m) return;
    const x = SEDADLA[i];
    if (m.kdo === "stin") {
      const p = POSAZENI[(i + seminko) % POSAZENI.length];
      out += `<g transform="translate(${f(x + p.dx)} ${f(-96 + (1 - p.r) * 22)}) scale(${p.r})" opacity="${p.op}"><use href="#vl-stin" class="vl-stin"/></g>`;
    } else {
      out += `<g transform="translate(${x} -95)" class="vl-ty-obal"><use href="#vl-ty" style="fill:${esc(m.barva)}"/></g>`;
    }
  });
  return out ? `<g clip-path="url(#vl-okna-orez)">${out}</g>` : "";
}

/* ——— Zvláštní vlak ———
 *
 * Na kurz nejede obyčejná souprava, ale parní lokomotiva s tendrem plným
 * hlíny a jedním salonním vozem — v Japonsku se na parní vlak (SL) jezdí
 * právě takhle, jako na výlet. Jede doprava: salon je vzadu, lokomotiva
 * vpředu. Vůz má tolik oken, kolik je v kurzu míst, a v každém sedí jeden
 * člověk. Na usměrňovači kouře je kulatý znak s písmenem vlaku, na boku
 * vozu cedule s jeho jménem.
 *
 * Kreslí se celý tady (ne přes <defs>), protože počet oken záleží na kurzu.
 * Z VlakKresby.astro bere jen přechody, stín, postavičku a záři světla.
 * Kola jsou z půlky pod hladinou — nad y = 0 je ořízne #vl-nad-vodou-… (každý vlak svůj).
 */
export const TENDR = 150;
export const LOKO = 336;
const X_TENDR = VUZ + 12;
const X_LOKO = X_TENDR + TENDR + 8;
export const DELKA_ZVLASTNIHO = X_LOKO + LOKO;
/** Jak vysoko nad hladinu sahá kouř */
export const VYSKA_ZVLASTNIHO = 262;

/** Okna salonního vozu: mezi dveřmi je jich tolik, kolik je míst */
export const oknaSalonu = (n: number) => {
  const roztec = 396 / Math.max(1, n);
  return Array.from({ length: n }, (_, i) => ({ x: f(62 + i * roztec + 5), w: f(roztec - 10) }));
};

function salon(mista: Misto[], cedule: string, k: number) {
  const n = mista.length;
  const okna = oknaSalonu(n);
  const orez = `vl-salon-orez-${k}`;
  const DVERE_S = [14, 472];
  let lide = "";
  mista.forEach((m, i) => {
    if (!m) return;
    const x = f(okna[i].x + okna[i].w / 2);
    if (m.kdo === "stin") {
      const p = POSAZENI[(i * 3 + 1) % POSAZENI.length];
      lide += `<g transform="translate(${f(x + p.dx)} ${f(-96 + (1 - p.r) * 22)}) scale(${p.r})" opacity="${p.op}"><use href="#vl-stin" class="vl-stin"/></g>`;
    } else {
      lide += `<g transform="translate(${x} -95)" class="vl-ty-obal"><use href="#vl-ty" style="fill:${esc(m.barva)}"/></g>`;
    }
  });
  const sklo = (y: number, h: number, rx = "") => okna.map((o) => `<rect x="${f(o.x + 3)}" y="${y}" width="${f(o.w - 6)}" height="${h}"${rx}/>`).join("");
  const dvere = (extra = "") => DVERE_S.map((x) => `<rect x="${x + 6}" y="-102" width="22" height="32" rx="2"${extra}/>`).join("");
  return `<g>
  <clipPath id="${orez}">${sklo(-103, 36, ` rx="3"`)}</clipPath>
  <rect x="16" y="-18" width="488" height="18" fill="#2A2430"/>
  <rect x="56" y="-14" width="96" height="14" rx="4" fill="#1E1A24"/>
  <rect x="368" y="-14" width="96" height="14" rx="4" fill="#1E1A24"/>
  <path d="M0 -62 V-26 Q0 -16 10 -16 H510 Q520 -16 520 -26 V-62 Z" fill="#22254E"/>
  <path d="M0 -62 V-100 Q0 -118 18 -118 H502 Q520 -118 520 -100 V-62 Z" fill="url(#vl-salon-plech)"/>
  <path d="M0 -100 Q0 -118 18 -118 H502 Q520 -118 520 -100" fill="none" stroke="#5A62A8" stroke-width="2.4" opacity="0.7"/>
  <rect x="0" y="-64" width="520" height="4" fill="#E0B04A"/>
  <rect x="0" y="-58" width="520" height="1.4" fill="#E0B04A" opacity="0.7"/>
  <path d="M6 -111 H514" stroke="#E0B04A" stroke-width="1.4" opacity="0.75"/>
  <path d="M2 -118 Q260 -134 518 -118 Z" fill="#8E8FA6"/>
  <path d="M30 -121 Q260 -132 490 -121" fill="none" stroke="#C3C4D6" stroke-width="2" opacity="0.8"/>
  ${okna.map((o) => `<rect x="${o.x}" y="-106" width="${o.w}" height="42" rx="5" fill="#F3E6C8"/>`).join("")}
  ${DVERE_S.map((x) => `<rect x="${x}" y="-110" width="34" height="94" rx="3" fill="#30356E"/><rect x="${x + 1.5}" y="-108.5" width="31" height="91" rx="2.5" fill="none" stroke="#E0B04A" stroke-width="1"/>`).join("")}
  <g class="vl-zavoj" fill="#0E1230"><path d="M0 -26 V-100 Q0 -118 18 -118 H502 Q520 -118 520 -100 V-26 Q520 -16 510 -16 H10 Q0 -16 0 -26 Z"/><path d="M2 -118 Q260 -134 518 -118 Z"/></g>
  <g class="vl-sklo">${sklo(-103, 36, ` rx="3"`)}${dvere()}</g>
  <g class="vl-sedadla">${sklo(-80.3, 13.3)}</g>
  <g class="vl-svit">${sklo(-103, 22.7, ` rx="3"`)}${dvere()}</g>
  <g class="vl-svit vl-svit-dole">${sklo(-80.3, 13.3)}</g>
  <g fill="#FFFFFF" opacity="0.3">${okna.map((o) => `<path d="M${f(o.x + 5)} -103 h9 l-11 16 v-8 z"/>`).join("")}</g>
  <g clip-path="url(#${orez})">${lide}</g>
  <rect x="${f(260 - 78)}" y="-54" width="156" height="17" rx="2.5" fill="#F3E6C8" stroke="#E0B04A" stroke-width="1"/>
  <text x="260" y="-45" class="vl-cedule-zvl">${esc(cedule)}</text>
  <path d="M-24 -30 H2 V-25 H-24 Z" fill="#2A2430"/>
  <path d="M-22 -30 V-66 M-12 -30 V-66 M-2 -30 V-66 M-24 -66 H0 M-24 -48 H0" fill="none" stroke="#E0B04A" stroke-width="1.8" stroke-linecap="round"/>
  <path d="M-26 -118 Q-10 -124 6 -118 Z" fill="#8E8FA6"/>
  <rect x="-27" y="-62" width="6" height="7" rx="2" class="vl-koncove"/>
</g>`;
}

function tendr(k: number) {
  const kola = [30, 75, 120].map((x) => `<circle cx="${x}" cy="-12" r="15" fill="#1C1826" stroke="#C4432B" stroke-width="2.6"/><circle cx="${x}" cy="-12" r="4" fill="#C4432B"/>`).join("");
  return `<g>
  <g clip-path="url(#vl-nad-vodou-${k})">${kola}</g>
  <path d="M8 -92 Q18 -110 38 -105 Q52 -119 74 -110 Q92 -121 110 -108 Q130 -113 142 -92 Z" fill="#B5673F"/>
  <path d="M24 -101 Q32 -108 42 -103 M62 -109 Q72 -115 84 -109 M104 -106 Q114 -110 124 -104" fill="none" stroke="#D99468" stroke-width="2.4" stroke-linecap="round"/>
  <path d="M0 -24 V-86 Q0 -94 8 -94 H142 Q150 -94 150 -86 V-24 Z" fill="url(#vl-kotel)"/>
  <path d="M6 -86 H144" stroke="#E0B04A" stroke-width="1.6" opacity="0.85"/>
  <rect x="14" y="-76" width="122" height="38" rx="3" fill="none" stroke="#E0B04A" stroke-width="1.2" opacity="0.7"/>
  <rect x="0" y="-28" width="150" height="5" fill="#EED8A4"/>
  <g class="vl-zavoj" fill="#0E1230"><path d="M0 -24 V-86 Q0 -94 8 -94 H142 Q150 -94 150 -86 V-24 Z"/></g>
  <rect x="-12" y="-40" width="12" height="6" fill="#2A2430"/><rect x="150" y="-40" width="8" height="6" fill="#2A2430"/>
</g>`;
}

function lokomotiva(emblem: string, k: number) {
  const hnaci = [112, 180, 248];
  const paprsky = (cx: number) => Array.from({ length: 8 }, (_, k) => {
    const a = (k * Math.PI) / 4;
    return `M${cx} -14 L${f(cx + Math.cos(a) * 29)} ${f(-14 + Math.sin(a) * 29)}`;
  }).join(" ");
  const kola =
    hnaci.map((x) => `<circle cx="${x}" cy="-14" r="32" fill="#1C1826"/><path d="${paprsky(x)}" stroke="#C4432B" stroke-width="2.4"/><circle cx="${x}" cy="-14" r="30" fill="none" stroke="#C4432B" stroke-width="3.4"/><circle cx="${x}" cy="-14" r="6.5" fill="#C4432B"/>`).join("") +
    `<circle cx="40" cy="-10" r="18" fill="#1C1826" stroke="#C4432B" stroke-width="2.8"/><circle cx="40" cy="-10" r="4.5" fill="#C4432B"/>` +
    `<circle cx="296" cy="-8" r="13" fill="#1C1826" stroke="#C4432B" stroke-width="2.4"/>` +
    `<rect x="108" y="-18.5" width="144" height="7" rx="3.5" fill="#C9CED6"/>` +
    hnaci.map((x) => `<circle cx="${x}" cy="-15" r="4.4" fill="#8E949E"/>`).join("") +
    `<path d="M248 -15 L286 -29" stroke="#C9CED6" stroke-width="5" stroke-linecap="round"/>`;
  /* Kouř stoupá z komína a táhne se dozadu — nejmladší obláček je nejmenší */
  const oblacky = [
    [271, -150, 9, 0.92], [262, -168, 13, 0.82], [246, -188, 17, 0.68], [222, -206, 21, 0.52], [190, -220, 25, 0.38], [150, -230, 28, 0.24],
  ].map(([x, y, r, o], i) => `<circle cx="${x}" cy="${y}" r="${r}" opacity="${o}" style="--i:${i}"/>`).join("");
  return `<g>
  <g class="vl-para" fill="#FFFDF6">${oblacky}</g>
  <g clip-path="url(#vl-nad-vodou-${k})">${kola}</g>
  <path d="M300 -40 H322 L336 -5 V0 H296 Z" fill="#C4432B"/>
  <path d="M306 -34 L314 -2 M314 -36 L324 -2" stroke="#8E2E1E" stroke-width="2"/>
  <rect x="262" y="-41" width="42" height="21" rx="6" fill="#262231" stroke="#E0B04A" stroke-width="1.2"/>
  <path d="M262 -106 V-131 H256 V-139 H286 V-131 H280 V-106 Z" fill="#1C1826"/>
  <rect x="256" y="-139" width="30" height="3" fill="#E0B04A"/>
  <path d="M120 -106 Q120 -119 132 -119 Q144 -119 144 -106 Z" fill="#262231"/>
  <path d="M178 -106 Q178 -126 192 -126 Q206 -126 206 -106 Z" fill="#D9A93F"/>
  <path d="M183 -112 Q185 -121 192 -122" fill="none" stroke="#F6DE9A" stroke-width="2" stroke-linecap="round"/>
  <path d="M224 -106 V-116 M220 -116 H228" stroke="#D9A93F" stroke-width="3" stroke-linecap="round"/>
  <path d="M78 -106 H282 Q302 -106 302 -86 V-64 Q302 -44 282 -44 H78 Z" fill="url(#vl-kotel)"/>
  <path d="M258 -106 H282 Q302 -106 302 -86 V-64 Q302 -44 282 -44 H258 Z" fill="#1C1826"/>
  <path d="M86 -99 H256" stroke="#7A7396" stroke-width="2.2" stroke-linecap="round" opacity="0.6"/>
  <path d="M112 -106 V-44 M160 -106 V-44 M212 -106 V-44" stroke="#D9A93F" stroke-width="2.4"/>
  <rect x="78" y="-47" width="238" height="5" fill="#EED8A4"/>
  <path d="M0 -22 V-120 Q0 -128 8 -128 H84 V-22 Z" fill="url(#vl-kotel)"/>
  <rect x="-10" y="-136" width="102" height="9" rx="4.5" fill="#3A3446"/>
  <rect x="-10" y="-129.5" width="102" height="2" fill="#E0B04A" opacity="0.8"/>
  <path d="M4 -44 H84" stroke="#E0B04A" stroke-width="1.6" opacity="0.85"/>
  <rect x="20" y="-113" width="44" height="38" rx="5" fill="#F3E6C8"/>
  <g class="vl-zavoj" fill="#0E1230"><path d="M0 -22 V-120 Q0 -128 8 -128 H84 V-106 H282 Q302 -106 302 -86 V-64 Q302 -44 282 -44 H84 V-22 Z"/></g>
  <rect x="23" y="-110" width="38" height="32" rx="3" class="vl-sklo"/>
  <rect x="23" y="-110" width="38" height="32" rx="3" class="vl-svit"/>
  <g transform="translate(40 -104)" opacity="0.62"><use href="#vl-stin" class="vl-stin"/></g>
  <rect x="20" y="-78" width="44" height="3" fill="#F3E6C8"/>
  <circle cx="66" cy="-58" r="20" fill="url(#vl-zare)" class="vl-zar"/>
  <rect x="58" y="-64" width="14" height="12" rx="3" fill="#FFB45A"/>
  <rect x="250" y="-114" width="54" height="66" rx="5" fill="#262231" stroke="#E0B04A" stroke-width="1.6"/>
  <g class="vl-zavoj" fill="#0E1230"><rect x="250" y="-114" width="54" height="66" rx="5"/></g>
  <circle cx="277" cy="-81" r="19" fill="#F3E6C8" stroke="#C4432B" stroke-width="3.2"/>
  <circle cx="277" cy="-81" r="14.6" fill="none" stroke="#E0B04A" stroke-width="1"/>
  <text x="277" y="-80" class="vl-emblem">${esc(emblem)}</text>
  <rect x="293" y="-120" width="12" height="11" rx="3.5" fill="#F4E8C4"/>
  <circle cx="307" cy="-114" r="30" fill="url(#vl-zare)" class="vl-reflektor"/>
</g>`;
}

export interface Zvlastni {
  /** Kdo sedí v oknech salonu, zleva doprava — okno na každé místo kurzu */
  mista: Misto[];
  /** Jedno písmeno do kulatého znaku na lokomotivě */
  emblem?: string;
  /** Jméno kurzu na ceduli vozu */
  cedule?: string;
  trida?: string;
}

/* Každý zvláštní vlak má vlastní ořezy: na stránce jich jede víc (v řádu i v dárcích)
   a se stejnými id by si je tiše půjčovaly od prvního */
let poradiVlaku = 0;

/** Zvláštní vlak jako SVG <g> — jede doprava, lokomotiva je vpředu */
export function zvlastniVlak({ mista, emblem = "", cedule = "", trida = "" }: Zvlastni) {
  const k = ++poradiVlaku;
  return `<g class="vl-vlak vl-zvlastni ${trida}">
  <clipPath id="vl-nad-vodou-${k}"><rect x="-200" y="-600" width="${DELKA_ZVLASTNIHO + 400}" height="600"/></clipPath>
  <rect x="${VUZ - 2}" y="-58" width="18" height="8" fill="#2A2430"/>
  ${salon(mista, cedule, k)}
  <g transform="translate(${X_TENDR} 0)">${tendr(k)}</g>
  <g transform="translate(${X_LOKO} 0)">${lokomotiva(emblem, k)}</g>
  <path d="M-30 0 H${DELKA_ZVLASTNIHO + 8}" class="vl-pena"/>
</g>`;
}

/**
 * Vlak jako SVG <g>. `smer` říká, kterým koncem jede vpřed (1 = doprava):
 * tam svítí přední světlo, vzadu červené.
 */
export function vlak(vozy: Vuz[], { smer = 1, trida = "" }: { smer?: 1 | -1; trida?: string } = {}) {
  const n = vozy.length;
  const L = delka(n);
  let mezi = "";
  let telo = "";
  let cedulky = "";
  vozy.forEach((v, i) => {
    const x = i * (VUZ + MEZERA);
    const otoceny = i % 2 === 1;
    const tr = otoceny ? `translate(${x + VUZ} 0) scale(-1 1)` : `translate(${x} 0)`;
    const sberac = !otoceny && (i === 0 || i % 4 === 0) ? `<use href="#vl-pantograf"/>` : "";
    const navic = v.navic ? `<g clip-path="url(#vl-okna-orez)">${v.navic}</g>` : "";
    telo += `<g transform="${tr}"><use href="#vl-vuz"/>${sberac}${cestujici(v.mista ?? [], i * 3)}${navic}</g>`;
    if (v.cislo) {
      const cx = otoceny ? x + VUZ - 487 : x + 487;
      /* čas odjezdu (10:30) se na cedulku z kresby vozu nevejde — dostane širší */
      const dlouhy = v.cislo.length > 2;
      if (dlouhy) cedulky += `<rect x="${cx - 20}" y="-46" width="40" height="17" rx="2" fill="#EED8A4"/>`;
      cedulky += `<text x="${cx}" y="-33.5" class="vl-cedulka${dlouhy ? " dlouha" : ""}">${esc(v.cislo)}</text>`;
    }
    if (i < n - 1) {
      const gx = x + VUZ - 2;
      mezi += `<rect x="${gx}" y="-98" width="${MEZERA + 4}" height="78" rx="3" fill="#2A2430"/>`;
      for (let k = 0; k < 4; k++) mezi += `<path d="M${f(gx + 4 + k * 3.4)} -96 V-22" stroke="#3E3742" stroke-width="1.2"/>`;
    }
  });
  const predni = smer === 1 ? L + 2 : -2;
  const zadni = smer === 1 ? -2 : L + 2;
  return `<g class="vl-vlak ${trida}">
  ${mezi}${telo}${cedulky}
  <rect x="${zadni - 3}" y="-111" width="6" height="7" rx="2" class="vl-koncove"/>
  <circle cx="${predni}" cy="-107" r="30" fill="url(#vl-zare)" class="vl-reflektor"/>
  <path d="M-8 0 H${L + 8}" class="vl-pena"/>
</g>`;
}
