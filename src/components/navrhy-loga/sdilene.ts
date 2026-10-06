/**
 * Sdílené kousky pro návrhy značky na /logo-navrhy.
 *
 * Každý návrh je samostatná komponenta se stejným rozhraním — velikost,
 * téma (světlé / tmavé / jednobarevné), animace a jestli s názvem.
 * Díky tomu jdou všechny poskládat do stejných ukázek a porovnat vedle sebe.
 */

export type Tema = "svetle" | "tmave" | "mono";
export type Nazev = "zadny" | "pod" | "vedle";

export interface LogoProps {
  /** Šířka značky (bez názvu) v pixelech. */
  size?: number;
  tema?: Tema;
  /** Barva jednobarevné verze — razítko, ražba, výšivka. */
  mono?: string;
  /** Úvodní animace a pohyb. Jen na velké scéně, v ukázkách značka stojí. */
  anim?: boolean;
  nazev?: Nazev;
  /** Zjednodušená kresba pro malé velikosti — bez textur a jemných linek. */
  maly?: boolean;
  /**
   * Soumrak (jen ensō): tah štětce přechází z rumělky do fialové noci jako
   * obloha webu mezi dnem a nocí, květ svítí jako měsíc.
   */
  soumrak?: boolean;
  class?: string;
}

export const BARVY = {
  espresso: "#3A2E28",
  /** Tuš — o kousek tmavší než espresso, aby tah štětce měl hloubku. */
  tus: "#261F1B",
  krem: "#F4EBDD",
  sakura: "#B84A2B",
  /** Sakura pro tmavý podklad — základní by na espressu zhasla. */
  sakuraSvetla: "#D8653F",
  ocel: "#8C949B",
  ocelTmava: "#49535A",
  mustard: "#E8B440",
};

/** Plátek sakury ze značky: pata v 0,0, špička nahoře v −12,6. */
export const PLATEK =
  "M0 0 C-2.5 -1.5 -4.1 -3.9 -4.2 -6.6 C-4.3 -9.4 -3.1 -11.5 -1.9 -12.6 L0 -9.5 L1.9 -12.6 C3.1 -11.5 4.3 -9.4 4.2 -6.6 C4.1 -3.9 2.5 -1.5 0 0 Z";

export const UHLY_KVETU = [0, 72, 144, 216, 288];
/** O kolik plátek odstupuje od středu květu — tím vzniknou mezery. */
export const ODSUN = 1.7;

/** Zesvětlení (kladná míra) nebo ztmavení (záporná) barvy — stejně jako v Logo.astro. */
export const posun = (hex: string, mira: number) => {
  const cislo = parseInt(hex.slice(1), 16);
  const kanaly = [(cislo >> 16) & 255, (cislo >> 8) & 255, cislo & 255];
  const cil = mira > 0 ? 255 : 0;
  const k = Math.abs(mira);
  return `#${kanaly
    .map((c) => Math.round(c + (cil - c) * k).toString(16).padStart(2, "0"))
    .join("")}`;
};

/** Značka bývá na stránce mnohokrát — id gradientů a masek se nesmí srazit. */
export const noveId = (predpona: string) => `${predpona}-${Math.random().toString(36).slice(2, 8)}`;

export const rad = (stupne: number) => (stupne * Math.PI) / 180;

export type Bod = [number, number];

const bod = (b: Bod) => `${b[0].toFixed(2)} ${b[1].toFixed(2)}`;

/** Lomená čára přes body — na masky, které tah odkrývají. */
export const cara = (body: Bod[]) => `M${body.map(bod).join(" L")}`;

export const bezier = (p0: Bod, p1: Bod, p2: Bod, p3: Bod, t: number): Bod => {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
};

/**
 * Tah s proměnnou šířkou, jako od štětce: střední čára je funkce t → bod,
 * šířka funkce t → px. Vrací uzavřený tvar — jedna hrana tam, druhá zpátky.
 */
export function tah(stred: (t: number) => Bod, sirka: (t: number) => number, kroku = 80): string {
  const levy: Bod[] = [];
  const pravy: Bod[] = [];
  for (let i = 0; i <= kroku; i++) {
    const t = i / kroku;
    const [x, y] = stred(t);
    const [xa, ya] = stred(Math.max(0, t - 0.002));
    const [xb, yb] = stred(Math.min(1, t + 0.002));
    const d = Math.hypot(xb - xa, yb - ya) || 1;
    const nx = -(yb - ya) / d;
    const ny = (xb - xa) / d;
    const w = sirka(t) / 2;
    levy.push([x + nx * w, y + ny * w]);
    pravy.push([x - nx * w, y - ny * w]);
  }
  return `${cara(levy)} L${pravy.reverse().map(bod).join(" L")} Z`;
}

/**
 * Definice květu do <defs>: stínovaný plátek (`#id-platek`) a pětice
 * plátků (`#id-kvet`). Stínování je v soustavě plátku, takže se otáčí s ním —
 * stejný princip jako ve značce.
 *
 * `obrys: null` lem vypne, řetězec ho přebarví (třeba na zlato).
 */
export function kvetDefs(
  id: string,
  {
    barva = BARVY.sakura,
    mono = null,
    obrys,
    sirkaObrysu = 0.42,
  }: { barva?: string; mono?: string | null; obrys?: string | null; sirkaObrysu?: number } = {},
) {
  const kvet = `<g id="${id}-kvet">${UHLY_KVETU.map(
    (u) => `<use href="#${id}-platek" transform="rotate(${u}) translate(0 -${ODSUN})"/>`,
  ).join("")}</g>`;
  if (mono) return `<path id="${id}-platek" d="${PLATEK}" fill="${mono}"/>${kvet}`;

  const prechod = (gid: string, a: string, b: string, c: string) =>
    `<linearGradient id="${gid}" gradientUnits="userSpaceOnUse" x1="0" y1="0.5" x2="0" y2="-12.6">` +
    `<stop offset="0" stop-color="${a}"/><stop offset="0.45" stop-color="${b}"/><stop offset="1" stop-color="${c}"/>` +
    `</linearGradient>`;
  const lem = obrys === undefined ? `url(#${id}-po)` : obrys;
  return (
    prechod(`${id}-pt`, posun(barva, -0.14), barva, posun(barva, 0.32)) +
    prechod(`${id}-po`, posun(barva, -0.34), posun(barva, -0.22), posun(barva, 0.12)) +
    `<path id="${id}-platek" d="${PLATEK}" fill="url(#${id}-pt)"` +
    (lem ? ` stroke="${lem}" stroke-width="${sirkaObrysu}" stroke-linejoin="round"` : "") +
    `/>` +
    kvet
  );
}
