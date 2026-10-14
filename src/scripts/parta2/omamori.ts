/**
 * Omamori (Omamori.astro) — je pod hlavičkou na každé stránce a otevírá ho
 * břevno závěsu (zaves.ts). Ukazuje, kdo je nalezený a které komnaty jsou
 * otevřené. Hledá se zatím jen na Partě 2 (sber.ts), ta mu každý nález hlásí.
 */
import { nacti, uloz } from "./stav";
import { ukazZaves, KLIC_NALEZENI } from "./zaves";

/** Vyprázdnění omamori — sber.ts si nálezy drží v paměti, tak se mu to musí říct */
export const SMAZANO = "omamori-smazano";

/** Třídu .omamori-dialog sdílejí i dialogy ostatních sbírek (vzhled), proto se hledá podle závěsu */
const najdi = () => document.querySelector<HTMLDialogElement>("[data-zaves-dialog]");

export function ukazOmamori(nalezeni: string[]) {
  const dialog = najdi();
  if (!dialog) return;
  const n = nalezeni.length;
  for (const b of dialog.querySelectorAll(".omamori-stav b")) b.textContent = String(n);
  for (const li of dialog.querySelectorAll<HTMLElement>(".omamori-polozka")) {
    li.classList.toggle("je", nalezeni.includes(li.dataset.omamori!));
  }
  for (const k of dialog.querySelectorAll<HTMLElement>(".omamori-komnata")) {
    const chybi = Number(k.dataset.prah) - n;
    k.classList.toggle("je", chybi <= 0);
    const kam = chybi <= 0 ? k.dataset.kam : undefined;
    if (kam) k.setAttribute("href", kam);
    else k.removeAttribute("href");
    k.querySelector(".omamori-komnata-stav")!.textContent = kam ? "vstoupit →" : chybi <= 0 ? "otevřeno" : `chybí ${chybi}`;
  }
}

export function initOmamori() {
  const dialog = najdi();
  if (!dialog) return;
  ukazOmamori(nacti<string[]>(KLIC_NALEZENI, []));
  dialog.querySelector(".omamori-zavrit")?.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });
  dialog.querySelector(".omamori-reset")?.addEventListener("click", () => {
    uloz(KLIC_NALEZENI, []);
    ukazOmamori([]);
    ukazZaves([]);
    document.dispatchEvent(new Event(SMAZANO));
  });
}
