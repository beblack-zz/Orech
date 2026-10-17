/**
 * Na co se lidi ptají (components/kontakt/Otazky.astro): když otázka poprvé
 * vjede do obrazovky, visačka se zhoupne, v bublině chvíli ťuká „…“ a pak
 * se ukáže odpověď — v řádku po sobě zleva doprava. Kliknutí na kami ho
 * nechá poskočit (s ťuknutím, když je zapnutý zvuk). Tlačítko u poslední
 * otázky otevře dopis z první obrazovky; bez dialogu zůstane obyčejný mailto.
 *
 * Bez skriptu i s omezeným pohybem je všechno vidět rovnou.
 */
import * as zvuk from "../parta2/zvuk";

export function otazkyParta() {
  const sekce = document.querySelector<HTMLElement>(".ko-ot");
  if (!sekce) return;
  const klidne = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const polozky = [...sekce.querySelectorAll<HTMLElement>(".ko-ot-polozka")];

  /* skok kami po kliknutí */
  sekce.querySelectorAll<HTMLButtonElement>(".ko-ot-kami").forEach((tl) => {
    tl.addEventListener("click", () => {
      if (klidne) return;
      tl.classList.remove("skok");
      void tl.offsetWidth;
      tl.classList.add("skok");
      zvuk.pop();
      window.setTimeout(() => tl.classList.remove("skok"), 700);
    });
  });

  /* vlastní otázka: dopis z první obrazovky */
  sekce.querySelector<HTMLAnchorElement>(".ko-ot-psat")?.addEventListener("click", (e) => {
    const dlg = document.querySelector<HTMLDialogElement>(".ko-dopis");
    if (!dlg?.showModal) return;
    e.preventDefault();
    dlg.showModal();
    dlg.querySelector("textarea")?.focus();
  });

  if (klidne || !("IntersectionObserver" in window)) return;
  sekce.classList.add("ceka");
  const pozorovatel = new IntersectionObserver(
    (zaznamy) => {
      /* co vjelo naráz, ožívá po sobě: v řádku zleva doprava */
      const nove = zaznamy.filter((z) => z.isIntersecting).map((z) => z.target as HTMLElement);
      nove.sort((a, b) => a.offsetTop - b.offsetTop || a.offsetLeft - b.offsetLeft);
      nove.forEach((el, k) => {
        pozorovatel.unobserve(el);
        window.setTimeout(() => el.classList.add("je"), k * 220);
      });
    },
    { threshold: 0.35, rootMargin: "0px 0px -6% 0px" },
  );
  polozky.forEach((p) => pozorovatel.observe(p));
}
