/**
 * Těžké části obchodu (šátek ve 3D, hrnek do ruky, výkres, noční kapitoly
 * Futatsu) se stahují, až se k nim člověk blíží — telefon tak při příchodu
 * na stránku nestahuje a nespouští, co je o pět obrazovek níž.
 *
 * `kdyzBlizko(sekce, fn, okraj)` zavolá fn jednou: když sekce dojede
 * k obrazovce s předstihem `okraj` (rootMargin, výchozí 1000 px nad i pod),
 * nebo hned, když na ni míří kotva — adresa s #… při příchodu, odkaz #… na
 * stránce (plovoucí šátek, kapitoly v úvodu Futatsu), změna hashe. Bez
 * IntersectionObserveru a při tisku hned.
 *
 * fn běží za stránku (observer i posluchače zakládá kód stránky), takže
 * v ní stačí `import("./x").then(zaStranku((m) => …))` a všechno, co modul
 * zaregistruje, po přechodu jinam uklidí prechody.ts.
 */
import { naObrazovce } from "../parta2/mimo";

export function kdyzBlizko(sekce: Element | null, fn: () => void, okraj = "1000px 0px"): void {
  if (!sekce) return;
  let hotovo = false;
  const zrus: (() => void)[] = [];
  const jednou = () => {
    if (hotovo) return;
    hotovo = true;
    zrus.forEach((z) => z());
    fn();
  };
  /** Míří kotva do sekce (na ni samotnou nebo na něco v ní)? */
  const miri = (hash: string) => {
    if (hash.length < 2) return false;
    let cil: HTMLElement | null = null;
    try {
      cil = document.getElementById(decodeURIComponent(hash.slice(1)));
    } catch {
      return false;
    }
    return !!cil && sekce.contains(cil);
  };
  if (miri(location.hash) || typeof IntersectionObserver === "undefined" || window.matchMedia?.("print").matches) {
    jednou();
    return;
  }
  zrus.push(naObrazovce(sekce, (videt) => videt && jednou(), okraj));
  const naKlik = (e: Event) => {
    const a = (e.target as Element | null)?.closest?.<HTMLAnchorElement>('a[href*="#"]');
    if (a && a.pathname === location.pathname && miri(a.hash)) jednou();
  };
  const naHash = () => {
    if (miri(location.hash)) jednou();
  };
  document.addEventListener("click", naKlik);
  window.addEventListener("hashchange", naHash);
  window.addEventListener("beforeprint", jednou);
  zrus.push(() => {
    document.removeEventListener("click", naKlik);
    window.removeEventListener("hashchange", naHash);
    window.removeEventListener("beforeprint", jednou);
  });
}
