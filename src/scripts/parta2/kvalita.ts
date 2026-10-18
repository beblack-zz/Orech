/**
 * Telefon dostane lehčí verzi: menší rozlišení plátna, méně částic.
 *
 * `telefon()` — hlavní vstup je dotyk; stejný dotaz jako
 * @media (hover: none) and (pointer: coarse) v CSS.
 * `dprPlatna(max)` — poměr pixelů pro canvas: na telefonu nejvýš 1,5.
 * `castic(n, podil)` — kolik částic, lístků, světlušek: na telefonu podíl z n.
 *
 * `varianta(klic, povolene, vychozi)` — volba k porovnání: ?klic=hodnota
 * v adrese, pak si ji web pamatuje i na dalších stránkách (localStorage
 * `varianta-<klic>`), stejně jako ?uzlik= u průvodce. Změny vzhledu a chování,
 * o kterých rozhoduje klientka, jdou nejdřív takhle — výchozí zůstává dosavadní.
 */

const DOTYK = "(hover: none) and (pointer: coarse)";

export const telefon = (): boolean => typeof matchMedia === "function" && matchMedia(DOTYK).matches;

export const dprPlatna = (max = 2): number => Math.min(window.devicePixelRatio || 1, telefon() ? Math.min(1.5, max) : max);

export const castic = (n: number, podil = 0.5): number => (telefon() ? Math.max(1, Math.round(n * podil)) : n);

export function varianta<T extends string>(klic: string, povolene: readonly T[], vychozi: T): T {
  const ulozeni = `varianta-${klic}`;
  const zAdresy = new URLSearchParams(window.location.search).get(klic);
  const platna = (v: string | null): v is T => v !== null && (povolene as readonly string[]).includes(v);
  try {
    if (platna(zAdresy)) localStorage.setItem(ulozeni, zAdresy);
    const ulozena = localStorage.getItem(ulozeni);
    if (platna(ulozena)) return ulozena;
  } catch {
    /* bez úložiště platí jen to, co je v adrese */
  }
  return platna(zAdresy) ? zAdresy : vychozi;
}
