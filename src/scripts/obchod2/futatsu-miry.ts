/**
 * Míry výkresu a skutečné velikosti na stránce Futatsu, které potřebuje vstup
 * stránky (futatsu.ts — rozvržení hned, než se výkres stáhne) i líně stažený
 * výkres (futatsu-vykres.ts): kolik px má milimetr podle platební karty
 * a které rozvržení listu a pauzáku sedí na šířku obalu.
 */
import { nacti } from "../parta2/stav";

/** Kolik px má milimetr, jak ho člověk doladil kartou (pamatuje si prohlížeč) */
export const KLIC_MM = "futatsu-pxmm";
/** Kratší strana platební karty (ISO/IEC 7810 ID-1) */
export const KARTA_MM = 53.98;
/** Bez karty: 96 dpi, jak je CSS pixel myšlený */
const VYCHOZI_PXMM = 96 / 25.4;

/** Uložená hodnota z karty (null = ještě nedoladěno) a px na mm, které se použijí */
export function pxNaMm(): { ulozeno: number | null; pxmm: number } {
  const ulozeno = nacti<number | null>(KLIC_MM, null);
  const pxmm = ulozeno ?? VYCHOZI_PXMM;
  return { ulozeno, pxmm: pxmm > 2 && pxmm < 12 ? pxmm : VYCHOZI_PXMM };
}

/** List výkresu na výšku pod 700 px šířky obalu (kresba.ts LAY.uzky), jinak na šířku */
export const rozvrzeniListu = (sirka: number) => (sirka && sirka < 700 ? "uzky" : "siroky");
/** Pauzák na výšku pod 460 px šířky obalu (PAUZ.uzky) */
export const uzkyPauzak = (sirka: number) => !!sirka && sirka < 460;
