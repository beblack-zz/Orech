/**
 * Deska zkoušek glazur — sbírka Dílny přes obecný parta2/sbirka.ts.
 * Nalezené střípky se v hlavičce obarví glazurou; za celou desku se
 * v koutě s glazurami odkryje ořechová (stránka se dozví událostí
 * dilna:zkousky).
 */
import { initSbirka } from "../parta2/sbirka";
import type { Sbirka } from "../parta2/sbirka";
import { zkousky, glazuraPodleNazvu } from "../../data/dilna";

let sbirka: Sbirka | null = null;

export function initZkousky() {
  sbirka = initSbirka({
    klic: "dilna-zkousky",
    ids: zkousky.map((z) => z.id),
    nazev: (id) => `Zkouška glazury ${id}`,
    popisTlacitka: (n, c) => `Deska zkoušek glazur: nalezeno ${n} z ${c}`,
    oznameni: (n, c) => (n === c ? " · deska je celá! V koutě s glazurami se něco odkrylo." : ` · ${n} z ${c}`),
    celaTrida: "je-vse-zkousky",
    obrazek: (_, el) => (el?.querySelector("svg")?.cloneNode(true) as Element | null) ?? null,
    poZmene: (mam) => {
      document.querySelectorAll<SVGPathElement>(".zkousky-dlazdice").forEach((d) => {
        const id = d.dataset.zkouska ?? "";
        const g = glazuraPodleNazvu(id);
        d.style.fill = mam.has(id) && g ? g.stred : "";
        d.classList.toggle("je", mam.has(id));
      });
      document.dispatchEvent(new CustomEvent("dilna:zkousky", { detail: { cela: mam.size === zkousky.length } }));
    },
    oslava: {
      nadpis: "Celá deska zkoušek!",
      text: "Všech šest glazur pohromadě. V koutě s glazurami se odkryl kbelík, který jinde nemáme — ořechová glazura se zlatými tečkami.",
      tlacitko: "Jdu glazovat",
    },
  });
}

export const celaDeska = () => !!sbirka && sbirka.pocet() === zkousky.length;
