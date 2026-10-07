/**
 * Klíče — sbírka Domku 2 přes obecný parta2/sbirka.ts. Každý nalezený
 * klíč se pověsí na háček v klíčovnici a v hlavičce přibude na kroužku.
 */
import { initSbirka } from "../parta2/sbirka";
import * as zvuk from "../parta2/zvuk";
import { klice } from "../../data/domek2";

export function initKlice() {
  initSbirka({
    klic: "domek2-klice",
    ids: klice.map((k) => k.id),
    nazev: (id) => `Klíč ${klice.find((k) => k.id === id)?.nazev.toLowerCase() ?? id}`,
    popisTlacitka: (n, c) => `Klíčovnice: na háčku ${n} z ${c} klíčů`,
    oznameni: (n, c) => (n === c ? " · všechny klíče visí na háčku!" : ` · na háčku ${n} z ${c}`),
    celaTrida: "je-vse-klice",
    obrazek: (_, el) => (el?.querySelector("svg")?.cloneNode(true) as Element | null) ?? null,
    poZmene: (mam) => {
      document.querySelectorAll<SVGElement>("[data-krouzek-klic]").forEach((k) => k.classList.toggle("je", mam.has(k.dataset.krouzekKlic ?? "")));
    },
    oslava: {
      nadpis: "Všechny klíče na háčku!",
      text: "Brána, lodžie, dílna, pec, glazury, dům i stará garáž. Dílna je odemčená — tak přijď.",
      tlacitko: "Jdu dovnitř",
    },
  });
  // Klíče cinknou, i když se jen klikne na už nalezený
  document.addEventListener("click", (e) => {
    if ((e.target as Element).closest(".dm-klic")) zvuk.klice();
  });
}
