/**
 * Vstup pro /papirna. Obloha, hlavička se závěsem a omamori jsou společné
 * s ostatními stránkami nového vzhledu; vlastní je jen zámek: za tři
 * nalezené kami se ukáže stažení a listy, do té doby počet a cesta k hledání.
 * Zámek je jen naoko — PDF leží v public/ a kdo zná adresu, stáhne si ho.
 */
import { stranka } from "../parta2/prechody";
import { spust, nacti, uloz } from "../parta2/stav";
import { initNebe } from "../parta2/nebe";
import { hlavicka } from "../parta2/hlavicka";
import { KLIC_NALEZENI, ukazZaves } from "../parta2/zaves";
import { SMAZANO } from "../parta2/omamori";
import { parta } from "../../data/parta";

function initPapirna() {
  const telo = document.body;
  const prah = Number(telo.dataset.prah) || 3;
  const zamceno = document.querySelector<HTMLElement>(".pa-zamceno");
  const otevreno = document.querySelector<HTMLElement>(".pa-otevreno");
  const listy = document.querySelector<HTMLElement>("#pa-listy");
  if (!zamceno || !otevreno || !listy) return;

  /* jen při vývoji: ?tri = první tři z party nalezení */
  if (new URLSearchParams(location.search).has("tri")) {
    const nalezeni = nacti<string[]>(KLIC_NALEZENI, []);
    for (const p of parta) if (nalezeni.length < prah && !nalezeni.includes(p.id)) nalezeni.push(p.id);
    uloz(KLIC_NALEZENI, nalezeni);
    ukazZaves(nalezeni);
  }

  const aktualizuj = () => {
    const n = nacti<string[]>(KLIC_NALEZENI, []).length;
    const je = n >= prah;
    zamceno.hidden = je;
    otevreno.hidden = !je;
    listy.hidden = !je;
    telo.classList.toggle("pa-je-otevreno", je);
    const pocet = zamceno.querySelector(".pa-pocet");
    if (pocet) pocet.textContent = String(Math.min(n, prah));
  };
  aktualizuj();
  document.addEventListener(SMAZANO, aktualizuj);

  zamceno.querySelector(".pa-omamori")?.addEventListener("click", () => {
    document.querySelector<HTMLDialogElement>("[data-zaves-dialog]")?.showModal();
  });
}

/* Celé se to spustí při každé návštěvě stránky, i po přechodu bez načtení (prechody.ts) */
stranka("papirna", () => {
  hlavicka();
  initNebe();
  initPapirna();
  spust();
});
