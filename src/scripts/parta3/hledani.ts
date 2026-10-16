/**
 * Na schovávanou (components/parta3/Hledani.astro): pod klíčenkou kolik
 * kami má hráč doopravdy. Nálezy jsou v prohlížeči pod stejným klíčem jako
 * závěs (parta2/zaves.ts). Když se tady na stránce někdo najde (Pecinka
 * nad svitkem), počet se srovná po klepnutí.
 */
import { nacti } from "../parta2/stav";
import { KLIC_NALEZENI } from "../parta2/zaves";

export function initHledani() {
  const sekce = document.querySelector<HTMLElement>("[data-hledani]");
  if (!sekce) return;
  const vsech = Number(sekce.dataset.vsech) || 9;
  const pocet = sekce.querySelector<HTMLElement>(".hledani-pocet");
  const obnov = () => {
    if (!sekce.isConnected) return;
    const n = Math.min(vsech, nacti<string[]>(KLIC_NALEZENI, []).length);
    if (pocet) pocet.textContent = n === 0 ? "Ty zatím nemáš nikoho — hledej!" : n === vsech ? `Ty máš všech ${vsech}!` : `Ty máš ${n} z ${vsech}`;
  };
  obnov();
  /* Nález na téhle stránce: počkat, až ho sber.ts uloží */
  document.addEventListener("click", (e) => {
    if ((e.target as Element | null)?.closest?.("[data-skryty]")) window.setTimeout(obnov, 400);
  });
  /* Nález v jiné záložce */
  window.addEventListener("storage", (e) => {
    if (e.key === KLIC_NALEZENI) obnov();
  });
}
