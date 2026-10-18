/**
 * Co není vidět, nemá běžet — sdílené hlídání obrazovky pro animace a smyčky.
 *
 * `naObrazovce(el, fn, okraj)` zavolá fn(true), když prvek přijede na obrazovku
 * (s předstihem `okraj`), a fn(false), když z ní odjede. Vrací funkci, která
 * hlídání zruší. Smyčka (requestAnimationFrame) se má při false zastavit a při
 * true znovu rozjet. Observer zaregistrovaný kódem stránky po přechodu uklidí
 * prechody.ts.
 *
 * `hlidejSekce()` dává sekcím stránky (sekce a bloky přímo v <main>, sekce
 * o patro níž a patička) třídu `mimo-obr`, dokud jsou mimo obrazovku —
 * parta2.css v nich pozastaví CSS animace. Spouští se u každé stránky
 * v prechody.ts. Prvky s position: fixed do sekcí nepatří (zastavily by se
 * i jejich animace, i když jsou vidět) — patří přímo do <main> nebo <body>.
 */

export function naObrazovce(el: Element, fn: (videt: boolean) => void, okraj = "200px 0px"): () => void {
  if (typeof IntersectionObserver === "undefined") {
    fn(true);
    return () => {};
  }
  let posledni: boolean | null = null;
  const io = new IntersectionObserver(
    ([z]) => {
      if (z.isIntersecting === posledni) return;
      posledni = z.isIntersecting;
      fn(z.isIntersecting);
    },
    { rootMargin: okraj },
  );
  io.observe(el);
  return () => io.disconnect();
}

/** Co se hlídá jako sekce: ne <svg>, <dialog>, <script> ani plovoucí tlačítka přímo v <main> */
export const SEKCE = "main > section, main > div, main > article, main > * > section, footer.pata";

export function hlidejSekce(selektor = SEKCE, okraj = "300px 0px") {
  if (typeof IntersectionObserver === "undefined") return;
  const io = new IntersectionObserver(
    (zaznamy) => {
      for (const z of zaznamy) z.target.classList.toggle("mimo-obr", !z.isIntersecting);
    },
    { rootMargin: okraj },
  );
  document.querySelectorAll(selektor).forEach((el) => io.observe(el));
}
