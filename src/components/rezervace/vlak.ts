/**
 * Vlak po vodě — rozměry vozu a skládání vlaku z kreseb, které jsou
 * jednou na stránce ve VlakKresby.astro. Čistý modul bez `window`:
 * používá ho build (vlak na pozadí stránky) i prohlížeč (vláček na
 * jízdence má tolik vozů, kolik hodin si člověk vybral).
 *
 * Jednotky jsou „jednotky vlaku“: vůz je 520 dlouhý, y = 0 je hladina,
 * nahoru záporně. Kabina je u vozu vlevo; každý druhý vůz se otočí, takže
 * vlak má kabinu na obou koncích — jako ten dvouvozový ve filmu.
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
/** Výška vlaku nad hladinou i se sběračem */
export const VYSKA = 176;
/** Kde vlak na pozadí stránky stojí u nástupiště stanice Ořech */
export const STANICE = 280;

export type Misto = { kdo: "stin" } | { kdo: "ty"; barva: string; jmeno?: string } | null;

export interface Vuz {
  /** Nápis na cedulce vozu — na jízdence hodina odjezdu */
  cislo?: string;
  /** Kdo sedí v šesti oknech, zleva doprava */
  mista?: Misto[];
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
    telo += `<g transform="${tr}"><use href="#vl-vuz"/>${sberac}${cestujici(v.mista ?? [], i * 3)}</g>`;
    if (v.cislo) {
      const cx = otoceny ? x + VUZ - 487 : x + 487;
      cedulky += `<text x="${cx}" y="-33.5" class="vl-cedulka">${esc(v.cislo)}</text>`;
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
