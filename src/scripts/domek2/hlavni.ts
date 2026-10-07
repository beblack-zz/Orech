/**
 * Vstup pro /domek-2. Obloha, hlavička, zvuky a klikací kami jsou společné
 * s ostatními stránkami nového vzhledu, rok dílny jede na stejném skriptu
 * jako na Úvodu 2 (uvod2/rok.ts — stačí stejné třídy a data-od/data-do
 * v kresbě). Sbírka klíčů se načte dřív než scény, plánovač scrollu
 * se spustí jednou nakonec.
 */
import { stranka } from "../parta2/prechody";
import { spust } from "../parta2/stav";
import { initNebe } from "../parta2/nebe";
import { initKami } from "../parta2/kami";
import { hlavicka } from "../parta2/hlavicka";
import { rok } from "../uvod2/rok";
import { sezonaMesice } from "../../data/uvod2";
import { initKlice } from "./klice";
import { ulice } from "./ulice";
import { prohlidka } from "./prohlidka";
import { porovnani } from "./porovnani";

/** Roční období podle dneška — stránka je statická a období v ní je z buildu */
function initSezona() {
  const s = sezonaMesice(new Date().getMonth() + 1);
  document.querySelectorAll<HTMLElement>("#ulice, #prohlidka, #kudy").forEach((el) => (el.dataset.sezona = s));
  const porovnani = document.querySelector<HTMLElement>("#porovnani");
  if (porovnani) {
    const s4 = s === "predjari" ? "jaro" : s;
    porovnani.dataset.sezona = s4;
    porovnani.querySelectorAll<HTMLButtonElement>("[data-sezona-volba]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.sezonaVolba === s4)));
    const t = porovnani.querySelector<HTMLTemplateElement>(`template[data-sezona-text="${s4}"]`)?.content.textContent?.trim();
    const text = porovnani.querySelector<HTMLElement>(".sezona-text");
    if (text && t) text.textContent = t;
  }
}

/* Celé se to spustí při každé návštěvě stránky, i po přechodu bez načtení (prechody.ts) */
stranka("domek-2", () => {
  hlavicka();
  initKami();
  initKlice();
  initSezona();
  initNebe();
  ulice();
  prohlidka();
  porovnani();
  rok();
  spust();
});
