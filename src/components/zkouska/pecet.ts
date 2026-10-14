/**
 * Pečeť (hanko) — tou se člověk v komnatě U mistra podepisuje. Vyryje si ji
 * v šesté úrovni (Jméno) a pak je na miskách, na obalu sešitu i na
 * mistrovském listu vedle jména.
 *
 * Čistá funkce bez DOM, jako kus.ts: kreslí ji stejně scéna úrovně, síň
 * mistra i obrázek listu ke stažení (ten si ji přes Path2D obkreslí sám).
 *
 * Dva druhy jako u skutečných pečetí: 朱文 shubun — červené znaky na
 * papíře, a 白文 hakubun — znaky vyryté, takže zůstanou bílé v červeném.
 * Tvar čtverec, kruh, nebo tykev (hyōtan), kde má každý znak svou baňku.
 */

export type TvarPeceti = "ctverec" | "kruh" | "tykev";
export type StylPeceti = "shubun" | "hakubun";

export interface Pecet {
  /** Jeden nebo dva znaky — iniciály, nebo cokoli, co si člověk vyryje */
  znaky: string;
  tvar: TvarPeceti;
  styl: StylPeceti;
}

export const tvaryPeceti: Record<TvarPeceti, string> = { ctverec: "Čtverec", kruh: "Kruh", tykev: "Tykev" };
export const stylyPeceti: Record<StylPeceti, { znak: string; nazev: string; popis: string }> = {
  shubun: { znak: "朱文", nazev: "shubun", popis: "červené znaky" },
  hakubun: { znak: "白文", nazev: "hakubun", popis: "bílé znaky" },
};

/** Iniciály ze jména: „Jana Nováková“ → „JN“, jedno slovo → první písmeno */
export function inicialy(jmeno: string) {
  const slova = jmeno.trim().split(/\s+/).filter(Boolean);
  if (!slova.length) return "";
  const prvni = [...slova[0]][0] ?? "";
  const posledni = slova.length > 1 ? ([...slova[slova.length - 1]][0] ?? "") : "";
  return (prvni + posledni).toLocaleUpperCase("cs-CZ");
}

/** Nanejvýš dva znaky, bez mezer a bez znaků, které by rozbily SVG */
export const cistaZnaky = (s: string) => [...s.replace(/[\s<>&"']/g, "")].slice(0, 2).join("").toLocaleUpperCase("cs-CZ");

export const vychoziPecet = (jmeno = ""): Pecet => ({ znaky: inicialy(jmeno) || "陶", tvar: "ctverec", styl: "hakubun" });

export function platnaPecet(x: unknown): x is Pecet {
  if (!x || typeof x !== "object") return false;
  const p = x as Record<string, unknown>;
  return typeof p.znaky === "string" && p.znaky.length > 0 && p.tvar !== undefined && (p.tvar as string) in tvaryPeceti && (p.styl as string) in stylyPeceti;
}

const jeZnakJaponsky = (ch: string) => /[　-ヿ一-鿿]/.test(ch);

/* ——— Geometrie ve viewBoxu 100 × 100 ——— */

/** Obrys tykve: horní baňka r 21 se středem 31, dolní r 30 se středem 67; protínají se na y 42,6 */
const TYKEV = "M32.5 42.6 A21 21 0 1 1 67.5 42.6 A30 30 0 1 1 32.5 42.6 Z";

/** Obrys pečeti jako cesta — pro SVG i pro Path2D na plátně */
export function obrysPeceti(tvar: TvarPeceti) {
  if (tvar === "kruh") return "M50 6 A44 44 0 1 1 49.99 6 Z";
  if (tvar === "tykev") return TYKEV;
  return "M10 7 H90 Q93 7 93 10 V90 Q93 93 90 93 H10 Q7 93 7 90 V10 Q7 7 10 7 Z";
}

export interface ZnakNaPeceti {
  znak: string;
  x: number;
  /** Účaří */
  y: number;
  velikost: number;
  japonsky: boolean;
}

/** Kde které písmeno stojí: jedno uprostřed, dvě vedle sebe (latinka), pod sebou (znaky), u tykve každé ve své baňce */
export function rozlozeni(p: Pecet): ZnakNaPeceti[] {
  const z = [...p.znaky].slice(0, 2);
  const pis = (znak: string, x: number, stred: number, velikost: number): ZnakNaPeceti => {
    const japonsky = jeZnakJaponsky(znak);
    /* Účaří tak, aby písmeno sedělo opticky uprostřed: verzálky latinky mají výšku asi 0,7 em, znaky skoro celý em */
    return { znak, x, y: stred + velikost * (japonsky ? 0.36 : 0.35), velikost, japonsky };
  };
  if (z.length === 1) {
    if (p.tvar === "tykev") return [pis(z[0], 50, 64, 40)];
    return [pis(z[0], 50, 50, p.tvar === "kruh" ? 54 : 62)];
  }
  if (p.tvar === "tykev") return [pis(z[0], 50, 31, 24), pis(z[1], 50, 67, 36)];
  const japonske = z.every(jeZnakJaponsky);
  if (japonske) {
    const v = p.tvar === "kruh" ? 34 : 38;
    return [pis(z[0], 50, 30, v), pis(z[1], 50, 70, v)];
  }
  const v = p.tvar === "kruh" ? 38 : 44;
  return [pis(z[0], 30, 50, v), pis(z[1], 70, 50, v)];
}

export const PISMO_LATINKA = "Fraunces Variable, Fraunces, Georgia, serif";
export const PISMO_ZNAKY = "Yuji Syuku, Yu Mincho, Hiragino Mincho ProN, serif";

export interface VolbyPeceti {
  /** Předpona id — na stránce je pečetí víc */
  id: string;
  /** Barva inkoustu */
  barva?: string;
  /** Nerovný inkoust (filtr) — v drobných velikostech je zbytečný */
  textura?: boolean;
  /** Popisek pro čtečky; bez něj je obrázek skrytý */
  popis?: string;
}

const esc = (s: string) => s.replace(/[<&>"]/g, (c) => ({ "<": "&lt;", "&": "&amp;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Celé SVG pečeti 100 × 100 */
export function pecetSvg(p: Pecet, o: VolbyPeceti): string {
  const barva = o.barva ?? "#C4432B";
  const id = o.id;
  const aria = o.popis ? `role="img" aria-label="${esc(o.popis)}"` : `aria-hidden="true"`;
  const obrys = obrysPeceti(p.tvar);
  const pismena = rozlozeni(p)
    .map(
      (z) =>
        `<text x="${z.x}" y="${z.y.toFixed(1)}" text-anchor="middle" font-size="${z.velikost}" font-family="${z.japonsky ? PISMO_ZNAKY : PISMO_LATINKA}"${z.japonsky ? "" : ` font-weight="700" style="font-variation-settings:'SOFT' 0,'WONK' 0,'opsz' 72"`}>${esc(z.znak)}</text>`,
    )
    .join("");
  const filtr = o.textura === false ? "" : ` filter="url(#${id}-ink)"`;
  const defs = [
    o.textura === false
      ? ""
      : `<filter id="${id}-ink" x="-8%" y="-8%" width="116%" height="116%" color-interpolation-filters="sRGB">` +
        `<feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="7" result="v"/>` +
        `<feDisplacementMap in="SourceGraphic" in2="v" scale="2.2" xChannelSelector="R" yChannelSelector="G" result="t"/>` +
        `<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="z"/>` +
        `<feColorMatrix in="z" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -10 0 0 0 6.6" result="d"/>` +
        `<feComposite in="t" in2="d" operator="in"/></filter>`,
  ];
  let telo: string;
  if (p.styl === "hakubun") {
    /* Bílé znaky: červená plocha, ze které jsou znaky vyryté (maska) */
    defs.push(`<mask id="${id}-m" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100"><path d="${obrys}" fill="#fff"/><g fill="#000">${pismena}</g></mask>`);
    telo = `<path d="${obrys}" fill="${barva}" mask="url(#${id}-m)"/>`;
  } else {
    /* Červené znaky: tenčí vnitřní linka jako na skutečných shubun pečetích */
    telo = `<path d="${obrys}" fill="none" stroke="${barva}" stroke-width="5.4"/><g fill="${barva}">${pismena}</g>`;
  }
  return `<svg viewBox="0 0 100 100" ${aria}><defs>${defs.join("")}</defs><g${filtr}>${telo}</g></svg>`;
}
