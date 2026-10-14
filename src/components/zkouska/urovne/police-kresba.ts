/**
 * Kresba úrovně 七 Police — Skládání pece. Čistý generátor bez DOM: vrací
 * SVG a HTML jako text, takže ho skládá komponenta Police.astro a stejné
 * kousky (kusy, Šamotčina tvářička) si bere i hra (scripts/zkouska/urovne/police.ts).
 *
 * Scéna 800 × 560: vlevo dřevěný regál se syrovými kusy (zmenšenými, ať se
 * vejdou) a stolička s miskou vody a houbičkou na otírání den, vpravo
 * elektrická pec v řezu. Šamotové cihly se spárami, ve drážkách topné
 * spirály, dole leží Šamotka — ona je dnem pece a drží všechno ostatní —
 * a nad ní dvě kordieritové police na sloupcích. Víko je otevřené a opřené
 * dozadu; nahoře na zdi visí regulátor pece.
 *
 * Měřítko v peci: 1 mm = 0,75 jednotky (1 cm = 7,5). Vnitřek pece je
 * 48 × 54 cm, povrch Šamotky je na y = 492, spodek víka na y = 87.
 * Všechna id začínají „mp7-“.
 */
import { kusSvg, profil } from "../../dilna/kus";
import type { Kus, Vrstva } from "../../dilna/kus";
import { samotkaTvar } from "../../../scripts/samotka-nese/zaklad.js";
import { KUSY, PEC, VYCHOZI_SLOUPKY, NOSNOST, povrch, svetlost, kg } from "../../../scripts/zkouska/urovne/police-pravidla";
import type { Patro, Sloupky } from "../../../scripts/zkouska/urovne/police-pravidla";

/* ——— Geometrie scény ——— */

export const G = {
  W: 800,
  H: 560,
  /** Jednotek scény na milimetr v peci */
  k: 0.75,
  /** Vnitřek pece */
  ix0: 386,
  ix1: 746,
  /** Povrch Šamotky = dno vnitřku */
  y0: 492,
  /** Spodek víka = strop vnitřku */
  yViko: 87,
  /** Tloušťka stěny (šamot) a plechu */
  stena: 37.5,
  plech: 3.5,
  /** Šamotka: přední hrana od povrchu dolů */
  samotkaX0: 393.5,
  samotkaX1: 738.5,
  samotkaTl: 38,
  /** Police: horní plocha v perspektivě nad hranou, hrana = 1,5 cm */
  plocha: 7,
  /** Regál: zmenšení kusů */
  regal: 0.6,
  /** Sloupky stojí vzadu u stěn */
  sloupekX: [408.5, 708.5] as [number, number],
  sloupekW: 15,
};

/** x ve scéně z mm od levé stěny pece */
export const xPec = (mm: number) => G.ix0 + mm * G.k;
/** y ve scéně z mm nad Šamotkou */
export const yPec = (mm: number) => G.y0 - mm * G.k;
/** Kde je povrch patra ve scéně */
export const yPatra = (s: Sloupky, p: Patro) => yPec(povrch(s, p));

/** Desky regálu (horní plocha) a místa kusů: střed x, deska */
export const REGAL = {
  x0: 16,
  x1: 322,
  desky: [210, 322, 432],
  houba: { x: 252, y: 518, w: 92, h: 40 },
};
export const MISTA_REGAL: Record<string, { x: number; deska: number }> = {
  vaza: { x: 62, deska: 0 },
  "mala-vaza": { x: 128, deska: 0 },
  "hrnek-a": { x: 190, deska: 0 },
  "hrnek-b": { x: 263, deska: 0 },
  misa: { x: 112, deska: 1 },
  cajova: { x: 252, deska: 1 },
  talir: { x: 90, deska: 2 },
  "miska-a": { x: 196, deska: 2 },
  "miska-b": { x: 273, deska: 2 },
};

const f = (n: number) => (Math.round(n * 100) / 100).toString();
const pct = (n: number, z: number) => `${((n / z) * 100).toFixed(3)}%`;

/* ——— Kusy ——— */

/** Catmull-Rom přes body [t, r] — obrys vázy */
const pres = (body: [number, number][]) => (t: number) => {
  let i = 0;
  while (i < body.length - 2 && t > body[i + 1][0]) i++;
  const p0 = body[Math.max(0, i - 1)];
  const p1 = body[i];
  const p2 = body[i + 1];
  const p3 = body[Math.min(body.length - 1, i + 2)];
  const u = Math.min(1, Math.max(0, (t - p1[0]) / Math.max(1e-6, p2[0] - p1[0])));
  const u2 = u * u;
  const u3 = u2 * u;
  return 0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * u + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * u3);
};
const misa = (r0: number, r1: number, e: number) => (t: number) => r0 + (r1 - r0) * Math.pow(Math.sin((t * Math.PI) / 2), e);

interface Podoba {
  /** Poloměry odspodu nahoru */
  r: (t: number) => number;
  /** Jak moc se kresba svisle stlačí — ploché kusy se kreslí víc z boku */
  sy: number;
  ucho?: boolean;
  glazury: Vrstva[];
}

/** Jak kusy vypadají: obrys a syrová glazura (data/dilna.ts → syrova) */
const PODOBY: Record<string, Podoba> = {
  vaza: { r: pres([[0, 34], [0.15, 48], [0.36, 60], [0.6, 46], [0.8, 22], [0.9, 19], [1, 27]]), sy: 1, glazury: [{ g: "tenmoku", kde: "cely" }, { g: "celadon", kde: "horni" }] },
  "hrnek-a": { r: (t) => 30 + 2.6 * Math.sin(Math.PI * t), sy: 1, ucho: true, glazury: [{ g: "popelová šedá", kde: "cely" }] },
  "hrnek-b": { r: (t) => 31.5 - 1.6 * t, sy: 1, ucho: true, glazury: [{ g: "tenmoku", kde: "cely" }] },
  misa: { r: misa(55, 150, 0.75), sy: 0.8, glazury: [{ g: "celadon", kde: "cely" }] },
  talir: { r: misa(52, 120, 0.6), sy: 0.6, glazury: [{ g: "shino", kde: "cely" }] },
  "miska-a": { r: misa(28, 65, 0.85), sy: 1, glazury: [{ g: "tenmoku", kde: "horni" }] },
  "miska-b": { r: misa(27, 65, 0.7), sy: 1, glazury: [{ g: "popelová šedá", kde: "horni" }] },
  "mala-vaza": { r: pres([[0, 22], [0.3, 40], [0.62, 28], [0.85, 13], [1, 16]]), sy: 1, glazury: [{ g: "celadon", kde: "horni" }] },
  cajova: { r: misa(24, 50, 0.6), sy: 1, glazury: [{ g: "železitá hnědá", kde: "cely" }] },
};

/**
 * Kus jako vnořené SVG, které přesně vyplní obdélník šířka × výška kusu
 * (v jednotkách scény, při měřítku 1). Počátek je uprostřed dole.
 * Rozměry kresby z kusSvg se počítají stejně jako v kus.ts — kus se tam
 * kreslí v měřítku 1 mm = 1 a pak se jen ořízne na svůj obrys.
 */
export function kusKresba(id: string, otreno: boolean) {
  const def = KUSY.find((k) => k.id === id)!;
  const p = PODOBY[id];
  const r = profil(p.r);
  const n = r.length;
  const rmax = Math.max(...r);
  const v = def.vyska / p.sy - 0.26 * (r[0] + r[n - 1]);
  const kus: Kus = { puvod: "dilna", druh: "miska", nazev: def.nazev, r, v, ucho: p.ucho, glazury: p.glazury, dno: otreno };
  const uchoX = p.ucho ? v * 0.34 : 0;
  const W = 2 * rmax + uchoX + 26;
  const H = v + rmax * 0.55 + 30;
  const s = Math.min((W - 26) / (2 * rmax + uchoX), (H - 24) / (v + rmax * 0.55));
  const cx = W / 2 - (uchoX * s) / 2;
  const dole = H - 10;
  const zaklad = dole - r[0] * s * 0.26;
  const y = (i: number) => zaklad - (v * s * i) / (n - 1);
  const nahore = y(n - 1) - r[n - 1] * s * 0.26;
  const leva = cx - rmax * s;
  let prava = cx + rmax * s;
  if (p.ucho) {
    const i1 = Math.round((n - 1) * 0.8);
    const i2 = Math.round((n - 1) * 0.3);
    const x1 = cx + r[i1] * s - 2;
    const x2 = cx + r[i2] * s - 2;
    const d = uchoX * s;
    const tl = Math.max(3, v * s * 0.075);
    for (let k = 0; k <= 40; k++) {
      const t = k / 40;
      const bx = (1 - t) ** 3 * x1 + 3 * t * (1 - t) ** 2 * (x1 + 1.15 * d) + 3 * t * t * (1 - t) * (x2 + 1.1 * d) + t ** 3 * x2;
      prava = Math.max(prava, bx + (tl + 2) / 2);
    }
  }
  const w = def.sirka * G.k;
  const h = def.vyska * G.k;
  const svg = kusSvg(kus, "glazovany", { id: `mp7-k-${id}`, sirka: W, vyska: H });
  return svg.replace(
    /^<svg viewBox="[^"]*"/,
    `<svg class="mp7-kus-svg" x="${f(-w / 2)}" y="${f(-h)}" width="${f(w)}" height="${f(h)}" viewBox="${f(leva)} ${f(nahore)} ${f(prava - leva)} ${f(dole - nahore)}" preserveAspectRatio="none"`,
  );
}

/** Obrysový obdélník kusu kolem počátku — na rámeček zvýraznění */
const obrysKusu = (id: string) => {
  const def = KUSY.find((k) => k.id === id)!;
  const w = def.sirka * G.k;
  const h = def.vyska * G.k;
  return `<rect class="mp7-kus-ram" x="${f(-w / 2 - 3)}" y="${f(-h - 3)}" width="${f(w + 6)}" height="${f(h + 5)}" rx="6"/>`;
};

/** Celá skupina kusu: stín, kresba, rámeček. Pozici dává skript přes transform. */
export function kusSkupina(id: string, otreno: boolean, transform: string) {
  const def = KUSY.find((k) => k.id === id)!;
  const w = def.sirka * G.k;
  return (
    `<g class="mp7-kus" data-kus="${id}" transform="${transform}">` +
    `<ellipse class="mp7-kus-stin" cx="0" cy="0" rx="${f(w * 0.5 + 2)}" ry="${f(Math.min(6, 2 + w * 0.025))}"/>` +
    `<g class="mp7-kus-telo">${kusKresba(id, otreno)}</g>` +
    obrysKusu(id) +
    `</g>`
  );
}

export const transformRegal = (id: string) => {
  const m = MISTA_REGAL[id];
  return `translate(${f(m.x)} ${f(REGAL.desky[m.deska])}) scale(${G.regal})`;
};

/* ——— Šamotka ——— */

export type Nalada = "klid" | "rada" | "napeti" | "uf" | "strach" | "au" | "blaho" | "smutek";

/** Šamotčina tvářička podle nálady — tvář je ta z její kresby (samotka-nese/zaklad.js) */
export function tvarSamotky(n: Nalada) {
  const o =
    n === "rada" ? { oci: "blaho", usta: "velky", tvare: 0.55 }
      : n === "napeti" ? { oci: "klid", usta: "rovna", tvare: 0.35 }
        : n === "uf" ? { oci: "au", usta: "vlnka", tvare: 0.6 }
          : n === "au" ? { oci: "au", usta: "au", tvare: 0.75 }
            : n === "strach" ? { oci: "otevrene", usta: "o", tvare: 0.25, pohled: [0, -1.2] }
              : n === "blaho" ? { oci: "blaho", usta: "velky", tvare: 0.7 }
                : n === "smutek" ? { oci: "spi", usta: "rovna", tvare: 0.15 }
                  : { oci: "klid", usta: "usmev", tvare: 0.35 };
  return `<g transform="translate(566 509) scale(1.75) translate(-90 -99)">${samotkaTvar("mp7", o)}</g>`;
}

/* ——— Kousky kresby ——— */

const defs = () => `<defs>
  <linearGradient id="mp7-zed" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F0E8D9"/><stop offset="1" stop-color="#D8CAB0"/></linearGradient>
  <linearGradient id="mp7-paprsek" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF6DA" stop-opacity="0.85"/><stop offset="1" stop-color="#FFF6DA" stop-opacity="0"/></linearGradient>
  <linearGradient id="mp7-podlaha" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C9BCA4"/><stop offset="1" stop-color="#B3A68F"/></linearGradient>
  <linearGradient id="mp7-cihla" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ECDDB4"/><stop offset="1" stop-color="#DECB9C"/></linearGradient>
  <linearGradient id="mp7-cihla-2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E8D7AA"/><stop offset="1" stop-color="#D9C493"/></linearGradient>
  <linearGradient id="mp7-rez" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FBF3DC"/><stop offset="1" stop-color="#EEDFB8"/></linearGradient>
  <pattern id="mp7-cihly" width="172.5" height="101.25" patternUnits="userSpaceOnUse" x="386" y="87">
    <rect width="172.5" height="101.25" fill="#C4AE7E"/>
    <rect x="1.4" y="1.4" width="169.7" height="47.8" rx="2.5" fill="url(#mp7-cihla)"/>
    <rect x="-84.85" y="52" width="169.7" height="47.8" rx="2.5" fill="url(#mp7-cihla-2)"/>
    <rect x="87.65" y="52" width="169.7" height="47.8" rx="2.5" fill="url(#mp7-cihla)"/>
  </pattern>
  <pattern id="mp7-spirala" width="10" height="16" patternUnits="userSpaceOnUse">
    <path d="M5 2.2 C1.4 2.6 1.6 13.6 5 13.8" fill="none" stroke="#6F7679" stroke-width="1.3"/>
    <path d="M5 2.2 C8.8 2.4 8.6 13.4 5 13.8" fill="none" stroke="#9AA1A4" stroke-width="1.5"/>
    <path d="M6.2 3.6 C7.6 4.6 7.6 7 7.2 8.6" fill="none" stroke="#E4E8E9" stroke-width="0.8" stroke-linecap="round"/>
  </pattern>
  <pattern id="mp7-spirala-zar" width="10" height="16" patternUnits="userSpaceOnUse">
    <path d="M5 2.2 C1.4 2.6 1.6 13.6 5 13.8 C8.8 13.4 8.8 2.4 5 2.2" fill="none" stroke="#FFB45A" stroke-width="1.7"/>
  </pattern>
  <linearGradient id="mp7-drazka" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B9A578"/><stop offset="0.5" stop-color="#D6C496"/><stop offset="1" stop-color="#E6D6AA"/></linearGradient>
  <linearGradient id="mp7-svetlo-shora" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF8E6" stop-opacity="0.6"/><stop offset="0.3" stop-color="#FFF8E6" stop-opacity="0.08"/><stop offset="0.62" stop-color="#6B4E2E" stop-opacity="0.06"/><stop offset="1" stop-color="#6B4E2E" stop-opacity="0.3"/></linearGradient>
  <linearGradient id="mp7-paprsek-pec" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFBEF" stop-opacity="0.5"/><stop offset="1" stop-color="#FFFBEF" stop-opacity="0"/></linearGradient>
  <linearGradient id="mp7-kraje" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5A4128" stop-opacity="0.26"/><stop offset="0.12" stop-color="#5A4128" stop-opacity="0"/><stop offset="0.88" stop-color="#5A4128" stop-opacity="0"/><stop offset="1" stop-color="#5A4128" stop-opacity="0.3"/></linearGradient>
  <linearGradient id="mp7-plech" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6B7278"/><stop offset="0.45" stop-color="#C9CFD4"/><stop offset="1" stop-color="#7E858C"/></linearGradient>
  <linearGradient id="mp7-plech-v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D9DFE2"/><stop offset="0.5" stop-color="#A3AAB0"/><stop offset="1" stop-color="#6B7278"/></linearGradient>
  <linearGradient id="mp7-viko" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E9DCB6"/><stop offset="1" stop-color="#E2D2A6"/></linearGradient>
  <linearGradient id="mp7-viko-stin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5A4128" stop-opacity="0"/><stop offset="0.7" stop-color="#5A4128" stop-opacity="0.08"/><stop offset="1" stop-color="#5A4128" stop-opacity="0.26"/></linearGradient>
  <linearGradient id="mp7-deska" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F5EBD6"/><stop offset="0.55" stop-color="#E9DAC0"/><stop offset="1" stop-color="#D6C3A2"/></linearGradient>
  <linearGradient id="mp7-deska-spodek" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C9B79C"/><stop offset="1" stop-color="#B3A083"/></linearGradient>
  <radialGradient id="mp7-tvare" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#E9846A" stop-opacity="0.85"/><stop offset="0.6" stop-color="#E9846A" stop-opacity="0.35"/><stop offset="1" stop-color="#E9846A" stop-opacity="0"/></radialGradient>
  <radialGradient id="mp7-zar-dole" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#F3C25A" stop-opacity="0.75"/><stop offset="1" stop-color="#E8B440" stop-opacity="0"/></radialGradient>
  <linearGradient id="mp7-police-hrana" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#DCD7CD"/><stop offset="1" stop-color="#BDB6A9"/></linearGradient>
  <linearGradient id="mp7-police-plocha" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#DAD5CA"/><stop offset="1" stop-color="#EEEAE2"/></linearGradient>
  <linearGradient id="mp7-sloupek" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#C9C1B1"/><stop offset="0.4" stop-color="#F3EFE6"/><stop offset="1" stop-color="#B5AD9C"/></linearGradient>
  <linearGradient id="mp7-stin-police" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4A3420" stop-opacity="0.24"/><stop offset="1" stop-color="#4A3420" stop-opacity="0"/></linearGradient>
  <linearGradient id="mp7-drevo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#BE946A"/><stop offset="1" stop-color="#A57D57"/></linearGradient>
  <linearGradient id="mp7-drevo-bok" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8E6A47"/><stop offset="0.5" stop-color="#A88058"/><stop offset="1" stop-color="#7E5E40"/></linearGradient>
  <linearGradient id="mp7-voda" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8FA9B6"/><stop offset="0.45" stop-color="#C6DAE2"/><stop offset="1" stop-color="#86A0AD"/></linearGradient>
  <linearGradient id="mp7-miska-vody" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7E8C96"/><stop offset="0.4" stop-color="#B9C6CD"/><stop offset="1" stop-color="#6F7D86"/></linearGradient>
  <pattern id="mp7-srafa" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="9" height="9" fill="#C4432B" opacity="0.08"/><path d="M0 0 V9" stroke="#C4432B" stroke-width="2" opacity="0.32"/></pattern>
  <radialGradient id="mp7-zar-pec" cx="0.5" cy="0.6" r="0.6"><stop offset="0" stop-color="#FFD58A" stop-opacity="0.9"/><stop offset="0.55" stop-color="#FF9A3C" stop-opacity="0.55"/><stop offset="1" stop-color="#C4432B" stop-opacity="0"/></radialGradient>
  <filter id="mp7-mekce" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3"/></filter>
</defs>`;

/** Místnost: zeď se světlem z okna a podlaha */
const mistnost = () =>
  `<rect width="800" height="560" fill="url(#mp7-zed)"/>` +
  `<path d="M22 0 H196 L360 560 H150 Z" fill="url(#mp7-paprsek)" opacity="0.42"/>` +
  `<g stroke="#C9B99B" stroke-width="1" opacity="0.5"><path d="M0 132 H800"/><path d="M0 268 H332"/></g>` +
  `<rect y="532" width="800" height="28" fill="url(#mp7-podlaha)"/>` +
  `<path d="M0 532 H800" stroke="#A39680" stroke-width="1.5"/>`;

/** Regulátor na zdi a kabel k peci — na konci ukáže teplotu */
const regulator = () =>
  `<path d="M150 50 C238 50 270 58 300 74 C324 88 334 104 338 132 V178" fill="none" stroke="#3A3330" stroke-width="3.4" stroke-linecap="round"/>` +
  `<path d="M150 50 C238 50 270 58 300 74 C324 88 334 104 338 132 V178" fill="none" stroke="#6E6460" stroke-width="1" stroke-linecap="round" opacity="0.7" transform="translate(-0.8 -0.8)"/>` +
  `<rect x="338" y="170" width="9" height="16" rx="2" fill="#4A4340"/>` +
  `<g class="mp7-regulator">` +
  `<rect x="44" y="16" width="108" height="66" rx="9" fill="#2B2420" opacity="0.14" transform="translate(3 4)"/>` +
  `<rect x="44" y="16" width="108" height="66" rx="9" fill="#DADFE1" stroke="#9AA3A8" stroke-width="1.6"/>` +
  `<rect x="52" y="24" width="64" height="30" rx="4" fill="#1E2A22"/>` +
  `<text class="mp7-displej" x="111" y="45" text-anchor="end" font-size="17" fill="#7CFFA0" font-family="ui-monospace, Consolas, monospace">20°</text>` +
  `<circle cx="134" cy="34" r="9" fill="#C9CFD4" stroke="#8C949B" stroke-width="1.4"/><path d="M134 34 L134 27" stroke="#4A4340" stroke-width="2" stroke-linecap="round"/>` +
  `<circle class="mp7-kontrolka" cx="134" cy="62" r="4" fill="#5C5047"/>` +
  `<g fill="#9AA3A8"><rect x="54" y="62" width="14" height="8" rx="2"/><rect x="72" y="62" width="14" height="8" rx="2"/><rect x="90" y="62" width="14" height="8" rx="2"/></g>` +
  `</g>`;

/** Regál se třemi deskami, stolička s miskou vody a houbičkou */
const regal = () => {
  const [a, b, c] = REGAL.desky;
  const deska = (y: number) =>
    `<rect x="${REGAL.x0 + 4}" y="${y - 4}" width="${REGAL.x1 - REGAL.x0 - 8}" height="5" fill="#C9A47C"/>` +
    `<rect x="${REGAL.x0}" y="${y}" width="${REGAL.x1 - REGAL.x0}" height="10" rx="2" fill="url(#mp7-drevo)"/>` +
    `<path d="M${REGAL.x0 + 2} ${y + 10} H${REGAL.x1 - 2}" stroke="#6E5236" stroke-width="2"/>` +
    `<rect x="${REGAL.x0 + 6}" y="${y + 12}" width="${REGAL.x1 - REGAL.x0 - 12}" height="16" fill="#2B2420" opacity="0.06"/>`;
  const h = REGAL.houba;
  return (
    `<g class="mp7-regal">` +
    `<rect x="${REGAL.x0 + 2}" y="88" width="10" height="446" rx="3" fill="url(#mp7-drevo-bok)"/>` +
    `<rect x="${REGAL.x1 - 12}" y="88" width="10" height="446" rx="3" fill="url(#mp7-drevo-bok)"/>` +
    `<path d="M${REGAL.x0 + 12} 104 L${REGAL.x1 - 12} ${a - 2} M${REGAL.x0 + 12} ${a + 12} L${REGAL.x1 - 12} ${b - 2}" stroke="#8E6A47" stroke-width="2.4" opacity="0.35"/>` +
    deska(a) + deska(b) + deska(c) +
    `<rect x="${REGAL.x0 - 2}" y="82" width="${REGAL.x1 - REGAL.x0 + 4}" height="8" rx="3" fill="#A57D57"/>` +
    `</g>` +
    /* Stolička a miska s vodou */
    `<g class="mp7-houba-misto">` +
    `<ellipse cx="${h.x}" cy="534" rx="58" ry="5" fill="#2B2420" opacity="0.13"/>` +
    `<path d="M${h.x - 40} ${h.y + 4} L${h.x - 46} 534 M${h.x + 40} ${h.y + 4} L${h.x + 46} 534" stroke="#7E5E40" stroke-width="6" stroke-linecap="round"/>` +
    `<rect x="${h.x - 52}" y="${h.y}" width="104" height="9" rx="3" fill="url(#mp7-drevo)"/>` +
    `<path d="M${h.x - 50} ${h.y + 9} H${h.x + 50}" stroke="#6E5236" stroke-width="1.6"/>` +
    `<path d="M${h.x - 46} ${h.y - 16} Q${h.x - 44} ${h.y} ${h.x - 30} ${h.y} H${h.x + 30} Q${h.x + 44} ${h.y} ${h.x + 46} ${h.y - 16} Z" fill="url(#mp7-miska-vody)"/>` +
    `<ellipse cx="${h.x}" cy="${h.y - 16}" rx="46" ry="7" fill="#C9D3D8" stroke="#7E8C96" stroke-width="1.4"/>` +
    `<ellipse cx="${h.x}" cy="${h.y - 15.4}" rx="41" ry="5.2" fill="url(#mp7-voda)"/>` +
    `<path d="M${h.x - 26} ${h.y - 17} Q${h.x - 10} ${h.y - 19.5} ${h.x + 4} ${h.y - 18}" stroke="#EEF6F8" stroke-width="1.6" fill="none" opacity="0.8" stroke-linecap="round"/>` +
    `<g class="mp7-houba"><g class="mp7-houba-telo">` +
    `<rect x="${h.x - 30}" y="${h.y - 36}" width="60" height="22" rx="9" fill="#D9A93A"/>` +
    `<rect x="${h.x - 30}" y="${h.y - 38}" width="60" height="14" rx="7" fill="#F3D27A"/>` +
    `<g fill="#C99A2E" opacity="0.55"><circle cx="${h.x - 18}" cy="${h.y - 21}" r="1.8"/><circle cx="${h.x - 4}" cy="${h.y - 19}" r="1.4"/><circle cx="${h.x + 10}" cy="${h.y - 22}" r="1.6"/><circle cx="${h.x + 21}" cy="${h.y - 19}" r="1.2"/></g>` +
    `</g></g>` +
    `</g>`
  );
};

/**
 * Víko je otevřené a opřené dozadu: je vidět jeho spodek z šamotu
 * v plechové obruči, zkrácený perspektivou — nahoru se zužuje a řady
 * cihel jsou čím výš, tím nižší.
 */
const vikoOtevrene = () => {
  const dole = 83;
  const nahore = -40;
  const kraj = (y: number, vnitrni: boolean) => {
    const t = (dole - y) / (dole - nahore);
    const l = 350 + t * 30 + (vnitrni ? 9 : 0);
    const r = 782 - t * 30 - (vnitrni ? 9 : 0);
    return [l, r];
  };
  const radky = [dole - 4, 48, 20, -2, -20, -34, nahore];
  const spary: string[] = [];
  for (let i = 1; i < radky.length - 1; i++) {
    const [l, r] = kraj(radky[i], true);
    spary.push(`M${f(l)} ${f(radky[i])} H${f(r)}`);
  }
  for (let i = 0; i < radky.length - 1; i++) {
    const ya = radky[i];
    const yb = radky[i + 1];
    const posun = i % 2 ? [0.25, 0.75] : [0.5];
    for (const u of posun) {
      const [la, ra] = kraj(ya, true);
      const [lb, rb] = kraj(yb, true);
      spary.push(`M${f(la + u * (ra - la))} ${f(ya)} L${f(lb + u * (rb - lb))} ${f(yb)}`);
    }
  }
  const [vl, vr] = kraj(nahore, false);
  const [il, ir] = kraj(nahore, true);
  return (
    `<g class="mp7-viko-otevrene">` +
    `<path d="M${f(vl)} ${nahore} H${f(vr)} L782 ${dole + 2} H350 Z" fill="url(#mp7-plech)"/>` +
    `<path d="M${f(il)} ${nahore} H${f(ir)} L773 ${dole - 4} H359 Z" fill="url(#mp7-viko)"/>` +
    `<path d="${spary.join(" ")}" stroke="#C3AD7E" stroke-width="2" fill="none"/>` +
    `<path d="M${f(il)} ${nahore} H${f(ir)} L773 ${dole - 4} H359 Z" fill="url(#mp7-viko-stin)"/>` +
    `<path d="M359 ${dole - 4} H773" stroke="#6B7278" stroke-width="2.4"/>` +
    `<g fill="#5E656B"><rect x="396" y="${dole - 8}" width="26" height="14" rx="2.5"/><rect x="710" y="${dole - 8}" width="26" height="14" rx="2.5"/></g>` +
    `<g fill="#A3AAB0"><circle cx="402" cy="${dole - 1}" r="2"/><circle cx="416" cy="${dole - 1}" r="2"/><circle cx="716" cy="${dole - 1}" r="2"/><circle cx="730" cy="${dole - 1}" r="2"/></g>` +
    `<rect x="346" y="${dole + 1}" width="440" height="4" fill="#2B2420" opacity="0.28"/>` +
    `</g>`
  );
};

/** Víko zavřené — sjede dolů, až se pec zavírá */
const vikoZavrene = () =>
  `<g class="mp7-viko" transform="translate(0 -120)" opacity="0">` +
  `<rect x="343" y="44" width="446" height="44" rx="5" fill="url(#mp7-plech-v)"/>` +
  `<rect x="343" y="44" width="446" height="7" rx="3" fill="#E6EBED"/>` +
  `<rect x="351" y="76" width="430" height="5" fill="#5E656B" opacity="0.45"/>` +
  `<rect x="540" y="30" width="52" height="16" rx="6" fill="#3F4448"/>` +
  `<rect x="548" y="33" width="36" height="5" rx="2" fill="#6B7278"/>` +
  `</g>`;

/** Zadní stěna pece: cihly, drážky se spirálami, světlo shora */
const zadniStena = () => {
  const drazky = [2, 4, 6].map((c) => {
    const y = G.y0 - c * 50.625 + 17;
    return (
      `<rect x="${G.ix0}" y="${f(y)}" width="${G.ix1 - G.ix0}" height="16" rx="7" fill="url(#mp7-drazka)"/>` +
      `<rect class="mp7-spirala" x="${G.ix0 + 2}" y="${f(y)}" width="${G.ix1 - G.ix0 - 4}" height="16" fill="url(#mp7-spirala)"/>` +
      `<rect class="mp7-spirala-zar" x="${G.ix0 + 2}" y="${f(y)}" width="${G.ix1 - G.ix0 - 4}" height="16" fill="url(#mp7-spirala-zar)" opacity="0"/>`
    );
  });
  return (
    `<g class="mp7-zadni">` +
    `<rect x="${G.ix0}" y="${G.yViko}" width="${G.ix1 - G.ix0}" height="${G.y0 - G.yViko + 40}" fill="url(#mp7-cihly)"/>` +
    drazky.join("") +
    `<rect x="${G.ix0}" y="${G.yViko}" width="${G.ix1 - G.ix0}" height="${G.y0 - G.yViko + 40}" fill="url(#mp7-svetlo-shora)"/>` +
    `<rect x="${G.ix0}" y="${G.yViko}" width="${G.ix1 - G.ix0}" height="${G.y0 - G.yViko + 40}" fill="url(#mp7-kraje)"/>` +
    `<path d="M${G.ix0 + 40} ${G.yViko} H${G.ix1 - 40} L${G.ix1 - 120} ${G.yViko + 250} H${G.ix0 + 120} Z" fill="url(#mp7-paprsek-pec)"/>` +
    /* Termočlánek: keramická trubička ze zadní stěny vpravo nahoře */
    `<rect x="${G.ix1 - 13}" y="${G.yViko + 36}" width="9" height="7" rx="2" fill="#B9A578"/>` +
    `<rect x="${G.ix1 - 11}" y="${G.yViko + 38}" width="7" height="3" rx="1.5" fill="#F7F3EA" stroke="#B5AD9C" stroke-width="0.6"/>` +
    `</g>`
  );
};

/** Stěny v řezu: šamot, plech, zářezy drážek. Vpředu přes všechno, co je uvnitř. */
const stenyVRezu = () => {
  const strana = (x0: number, vlevo: boolean) => {
    const xi = vlevo ? x0 + G.stena : x0;
    const casti: string[] = [];
    casti.push(`<rect x="${x0}" y="${G.yViko}" width="${G.stena}" height="${548 - G.yViko}" fill="url(#mp7-rez)"/>`);
    for (let c = 0; c < 9; c++) {
      const y = G.y0 + 40 - c * 50.625;
      if (y - 50.625 > 548) continue;
      if (y < 548) casti.push(`<path d="M${x0} ${f(y)} H${x0 + G.stena}" stroke="#D3C095" stroke-width="2.4"/>`);
      if (c % 2 === 0) casti.push(`<path d="M${x0 + G.stena / 2} ${f(Math.max(G.yViko, y - 50.625))} V${f(Math.min(548, y))}" stroke="#D3C095" stroke-width="2"/>`);
    }
    for (const c of [2, 4, 6]) {
      const y = G.y0 - c * 50.625 + 17;
      const d = vlevo
        ? `M${xi} ${f(y)} H${xi - 7} Q${xi - 12} ${f(y)} ${xi - 12} ${f(y + 8)} Q${xi - 12} ${f(y + 16)} ${xi - 7} ${f(y + 16)} H${xi} Z`
        : `M${xi} ${f(y)} H${xi + 7} Q${xi + 12} ${f(y)} ${xi + 12} ${f(y + 8)} Q${xi + 12} ${f(y + 16)} ${xi + 7} ${f(y + 16)} H${xi} Z`;
      const sx = vlevo ? xi - 6 : xi + 6;
      casti.push(`<path d="${d}" fill="#B9A578"/>`);
      casti.push(`<circle cx="${sx}" cy="${f(y + 8)}" r="4.2" fill="none" stroke="#7F8689" stroke-width="1.6"/><circle class="mp7-spirala-tecka" cx="${sx}" cy="${f(y + 8)}" r="4.2" fill="none" stroke="#FFB45A" stroke-width="1.8" opacity="0"/>`);
    }
    const xp = vlevo ? x0 - G.plech : x0 + G.stena;
    casti.push(`<rect x="${xp}" y="${G.yViko - 3}" width="${G.plech}" height="${551 - G.yViko + 3}" fill="url(#mp7-plech)"/>`);
    for (const y of [150, 300, 450]) casti.push(`<rect x="${vlevo ? xp - 2 : xp}" y="${y}" width="${G.plech + 2}" height="9" rx="1.5" fill="#8C949B"/>`);
    casti.push(`<rect x="${vlevo ? xp : x0}" y="${G.yViko - 4}" width="${G.stena + G.plech}" height="6" rx="3" fill="#C9CFD4" stroke="#7E858C" stroke-width="1"/>`);
    return casti.join("");
  };
  return `<g class="mp7-steny">${strana(G.ix0 - G.stena, true)}${strana(G.ix1, false)}</g>`;
};

/** Dno pece pod Šamotkou, plechové dno a nožičky */
const DNO = G.y0 + G.samotkaTl + 4;
const dnoPece = () =>
  `<g class="mp7-dno-pece">` +
  `<rect x="${G.ix0 - G.stena}" y="${DNO}" width="${G.ix1 - G.ix0 + 2 * G.stena}" height="${548 - DNO}" fill="url(#mp7-rez)"/>` +
  `<g stroke="#D3C095" stroke-width="2"><path d="M${G.ix0 - G.stena} ${DNO + 0.5} H${G.ix1 + G.stena}"/><path d="M420 ${DNO + 1} V548 M520 ${DNO + 1} V548 M620 ${DNO + 1} V548 M720 ${DNO + 1} V548"/></g>` +
  `<rect x="${G.ix0 - G.stena - G.plech}" y="547" width="${G.ix1 - G.ix0 + 2 * (G.stena + G.plech)}" height="5" rx="2" fill="#7E858C"/>` +
  `<path d="M372 552 L366 560 M760 552 L766 560 M566 552 V560" stroke="#3F4448" stroke-width="7" stroke-linecap="round"/>` +
  `</g>`;

/** Šamotka: deska přes celé dno, tvářička vpředu, žár pod ní */
const samotka = () => {
  const x0 = G.samotkaX0;
  const x1 = G.samotkaX1;
  const y = G.y0;
  const tl = G.samotkaTl;
  return (
    `<g class="mp7-samotka">` +
    `<ellipse class="mp7-samotka-zar" cx="566" cy="${y + tl + 2}" rx="200" ry="15" fill="url(#mp7-zar-dole)"/>` +
    `<path d="M${x0 + 8} ${y - G.plocha} H${x1 - 8} L${x1} ${y} H${x0} Z" fill="#F7EFDD"/>` +
    `<path d="M${x0 + 12} ${y - G.plocha + 1.4} H${x1 - 12}" stroke="#FFFFFF" stroke-width="1.2" opacity="0.6"/>` +
    `<g class="mp7-samotka-telo">` +
    `<rect x="${x0}" y="${y}" width="${x1 - x0}" height="${tl}" rx="6" fill="url(#mp7-deska)" stroke="#6B5D4F" stroke-width="1.5"/>` +
    `<rect x="${x0}" y="${y + tl - 8}" width="${x1 - x0}" height="12" rx="5" fill="url(#mp7-deska-spodek)"/>` +
    `<path d="M${x0 + 3} ${y + tl - 7.4} H${x1 - 3}" stroke="#6B5D4F" stroke-width="0.6" opacity="0.35"/>` +
    `<path d="M${x0 + 4} ${y + 1.8} H${x1 - 4}" stroke="#FBF7EE" stroke-width="2.2" stroke-linecap="round" opacity="0.75"/>` +
    `<g fill="#6B5D4F"><ellipse cx="${x0 + 52}" cy="${y + 13}" rx="20" ry="6" opacity="0.18"/><ellipse cx="${x1 - 60}" cy="${y + 19}" rx="15" ry="5" opacity="0.15"/><ellipse cx="${x0 + 118}" cy="${y + 22}" rx="7" ry="3" opacity="0.12"/><ellipse cx="${x1 - 120}" cy="${y + 10}" rx="9" ry="3.4" opacity="0.1"/></g>` +
    `<g class="mp7-tvar">${tvarSamotky("klid")}</g>` +
    `</g>` +
    `</g>`
  );
};

/** Police: horní plocha v perspektivě a hrana 1,5 cm. Kreslí se kolem nuly, posouvá ji skript. */
const police = (i: 1 | 2, y: number) => {
  const x0 = G.ix0 + 3.75;
  const x1 = G.ix1 - 3.75;
  const tl = PEC.deska * G.k;
  return (
    `<g class="mp7-police" data-police="${i}" transform="translate(0 ${f(y)})">` +
    `<path d="M${x0 + 7} ${-G.plocha} H${x1 - 7} L${x1} 0 H${x0} Z" fill="url(#mp7-police-plocha)"/>` +
    `<rect x="${x0}" y="0" width="${x1 - x0}" height="${f(tl)}" rx="2.5" fill="url(#mp7-police-hrana)"/>` +
    `<path d="M${x0 + 2} 0.8 H${x1 - 2}" stroke="#F8F6F1" stroke-width="1.4" stroke-linecap="round"/>` +
    `<path d="M${x0 + 2} ${f(tl - 0.6)} H${x1 - 2}" stroke="#8F887B" stroke-width="1" opacity="0.6"/>` +
    `</g>`
  );
};

/** Stín police na zadní stěně — jede s policí */
const stinPolice = (i: 1 | 2, y: number) =>
  `<rect class="mp7-stin-police" data-police="${i}" x="${G.ix0}" y="0" width="${G.ix1 - G.ix0}" height="46" fill="url(#mp7-stin-police)" transform="translate(0 ${f(y + PEC.deska * G.k - 4)})"/>`;

/** Sloupky patra: dva vzadu u stěn, stojí na povrchu patra a nesou polici nad ním */
const sloupky = (p: 0 | 1, s: Sloupky) => {
  const y = yPatra(s, p);
  const v = s[p] * G.k;
  return (
    `<g class="mp7-sloupky" data-patro="${p}" transform="translate(0 ${f(y)})">` +
    G.sloupekX.map((x) => `<rect class="mp7-sloupek" x="${x}" y="${f(-v - 4)}" width="${G.sloupekW}" height="${f(v - 1)}" rx="3" fill="url(#mp7-sloupek)"/>` + `<rect class="mp7-sloupek-pata" x="${x - 1}" y="-6" width="${G.sloupekW + 2}" height="5" rx="2" fill="#2B2420" opacity="0.12"/>`).join("") +
    `</g>`
  );
};

/** Hranice, kam se nesmí: u stěn a pod policemi. Ukáže se jen při skládání. */
const vodidla = (s: Sloupky) => {
  const okraj = PEC.okraj * G.k;
  const pas = PEC.nad * G.k;
  const pod = (y: number, data: string) => `<rect class="mp7-vodidlo-pas" data-pod="${data}" x="${G.ix0}" y="${f(y)}" width="${G.ix1 - G.ix0}" height="${f(pas)}" fill="url(#mp7-srafa)"/>`;
  const spodek1 = yPatra(s, 1) + PEC.deska * G.k;
  const spodek2 = yPatra(s, 2) + PEC.deska * G.k;
  return (
    `<g class="mp7-vodidla" aria-hidden="true">` +
    `<rect x="${G.ix0}" y="${G.yViko}" width="${f(okraj)}" height="${G.y0 - G.yViko}" fill="url(#mp7-srafa)"/>` +
    `<rect x="${f(G.ix1 - okraj)}" y="${G.yViko}" width="${f(okraj)}" height="${G.y0 - G.yViko}" fill="url(#mp7-srafa)"/>` +
    pod(G.yViko, "viko") +
    pod(spodek1, "1") +
    pod(spodek2, "2") +
    `</g>`
  );
};

/** Čára víka uvnitř pece */
const caraViko = () =>
  `<g class="mp7-cara-viko"><path d="M${G.ix0 + 4} ${G.yViko + 0.5} H${G.ix1 - 4}" stroke="#8A7C70" stroke-width="1.4" stroke-dasharray="5 6" opacity="0.7"/></g>`;

/* ——— Celá scéna ——— */

/** SVG scény ve výchozím stavu: sloupky 9 + 9 cm, všechny kusy na regálu */
export function kresbaSvg(s: Sloupky = [...VYCHOZI_SLOUPKY]) {
  const kusyNaRegalu = KUSY.map((k) => kusSkupina(k.id, !k.glazovaneDno, transformRegal(k.id))).join("");
  return (
    `<svg class="mu-kresba mp7-kresba" viewBox="0 0 800 560" aria-hidden="true" focusable="false">` +
    defs() +
    mistnost() +
    regulator() +
    vikoOtevrene() +
    `<g class="mp7-pec">` +
    zadniStena() +
    `<g class="mp7-stiny-polic">${stinPolice(1, yPatra(s, 1))}${stinPolice(2, yPatra(s, 2))}</g>` +
    dnoPece() +
    samotka() +
    vodidla(s) +
    sloupky(0, s) +
    `<g class="mp7-vrstva" data-patro="0"></g>` +
    police(1, yPatra(s, 1)) +
    sloupky(1, s) +
    `<g class="mp7-vrstva" data-patro="1"></g>` +
    police(2, yPatra(s, 2)) +
    `<g class="mp7-vrstva" data-patro="2"></g>` +
    caraViko() +
    stenyVRezu() +
    `<g class="mp7-zar-pec" opacity="0"><rect x="${G.ix0}" y="${G.yViko}" width="${G.ix1 - G.ix0}" height="${G.y0 - G.yViko + 40}" fill="url(#mp7-zar-pec)"/></g>` +
    vikoZavrene() +
    `</g>` +
    regal() +
    `<g class="mp7-vrstva-regal">${kusyNaRegalu}</g>` +
    `<g class="mp7-nahled" opacity="0"><ellipse class="mp7-nahled-stin" cx="0" cy="0" rx="40" ry="5"/></g>` +
    `<g class="mp7-tazeny"></g>` +
    `</svg>`
  );
}

/* ——— HTML nad kresbou ——— */

const procenta = (x: number, y: number, w: number, h: number) => `left:${pct(x, G.W)};top:${pct(y, G.H)};width:${pct(w, G.W)};height:${pct(h, G.H)}`;

const cmText = (mm: number) => (mm / 10).toLocaleString("cs-CZ", { maximumFractionDigits: 1 });
export const popisKusu = (id: string) => {
  const k = KUSY.find((x) => x.id === id)!;
  return `${k.nazev}, ${cmText(k.sirka)} × ${cmText(k.vyska)} cm, ${kg(k.vaha)}${k.navic ? ", navíc" : ""}`;
};

/** Obdélník kusu na regálu (ve scéně) — kam patří tlačítko */
export const obdelnikRegal = (id: string) => {
  const k = KUSY.find((x) => x.id === id)!;
  const m = MISTA_REGAL[id];
  const w = k.sirka * G.k * G.regal;
  const h = k.vyska * G.k * G.regal;
  return { x: m.x - w / 2, y: REGAL.desky[m.deska] - h, w, h };
};

export function prekryv(s: Sloupky = [...VYCHOZI_SLOUPKY]) {
  const tlacitka = KUSY.map((k) => {
    const o = obdelnikRegal(k.id);
    return (
      `<button type="button" class="mp7-kus-tl${k.navic ? " navic" : ""}" data-kus="${k.id}" style="${procenta(o.x - 6, o.y - 6, o.w + 12, o.h + 10)}" aria-label="${popisKusu(k.id)}. Na regálu.">` +
      `<span class="mp7-stitek" aria-hidden="true"><b>${cmText(k.sirka)} × ${cmText(k.vyska)} cm</b><span>${kg(k.vaha)}</span></span>` +
      (k.navic ? `<span class="mp7-navic" aria-hidden="true">navíc</span>` : "") +
      `<span class="mp7-dno" aria-hidden="true"${k.glazovaneDno ? "" : " hidden"}></span>` +
      `</button>`
    );
  }).join("");
  const sloupkyTl = ([0, 1] as const)
    .map((p) => {
      const yd = yPatra(s, p);
      const yh = yPatra(s, p) - s[p] * G.k;
      return (
        `<button type="button" class="mp7-sloupky-tl" data-patro="${p}" style="${procenta(G.ix0 - G.stena - 6, yh, G.stena + 40, yd - yh)}" aria-label="Sloupky ${p === 0 ? "na Šamotce" : "na první polici"}: ${cmText(s[p])} cm. Další výška kliknutím."><span class="mp7-vyska">${cmText(s[p])} cm</span></button>` +
        `<span class="mp7-sloupky-pravy" data-patro="${p}" style="${procenta(G.sloupekX[1] - 6, yh, G.ix1 - G.sloupekX[1] + G.stena + 6, yd - yh)}" aria-hidden="true"></span>`
      );
    })
    .join("");
  const zateze = ([0, 1, 2] as const)
    .map((p) => {
      const y = p === 0 ? G.y0 + 9 : yPatra(s, p) + 1;
      return `<p class="mp7-zatez${p === 0 ? " mp7-zatez-samotka" : ""}" data-patro="${p}" style="left:${pct(p === 0 ? G.samotkaX1 - 10 : G.ix1 - 12, G.W)};top:${pct(y, G.H)}"><span class="mp7-zatez-cislo">0,0</span><span class="mp7-zatez-z"> / ${NOSNOST[p] / 1000}</span> kg</p>`;
    })
    .join("");
  const h = REGAL.houba;
  return (
    `<div class="mp7-plocha" role="application" aria-roledescription="pec na skládání" aria-label="Pec v řezu a regál se syrovými kusy. Kus vezmeš tabulátorem a Enterem, šipkami vybereš polici a místo, Enterem položíš, Escape vrátí. Sloupky police přepneš Enterem."></div>` +
    `<div class="mp7-tlacitka">${tlacitka}${sloupkyTl}` +
    `<button type="button" class="mp7-houba-tl" style="${procenta(h.x - h.w / 2, h.y - 44, h.w, h.h + 6)}" aria-label="Miska s vodou a houbičkou. Kus s glazurou na dně sem přetáhni a dno se otře."></button>` +
    `</div>` +
    zateze +
    `<span class="mp7-kotva" style="${procenta(530, 486, 72, 40)}" aria-hidden="true"></span>` +
    `<span class="mp7-uf" style="left:${pct(632, G.W)};top:${pct(494, G.H)}" aria-hidden="true">Uf…</span>` +
    `<div class="mp7-duvody" aria-hidden="true"></div>`
  );
}

/** Celá scéna: okno s kresbou a překryvem, pod ním řádek ovládání */
export const scena = () =>
  `<div class="mu-okno mp7-okno">${kresbaSvg()}${prekryv()}</div>` +
  `<div class="mu-ovladani mp7-ovladani">` +
  `<p class="mp7-info" aria-live="polite">Přetahuj kusy do pece. Sedm jich musí dovnitř, dva se zlatou cedulkou jsou navíc.</p>` +
  `<button type="button" class="tlacitko tlacitko-maly mp7-zavrit" disabled>Zavřít víko</button>` +
  `</div>`;

/** Pro skript: výška sloupků v textu */
export const vyskaText = (mm: number) => `${cmText(mm)} cm`;
export { svetlost };
