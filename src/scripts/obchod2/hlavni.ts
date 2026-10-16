/**
 * Vstup pro /obchod-2. Obloha, hlavička, zvuky a klikací kami jsou
 * společné s ostatními stránkami nového vzhledu, zbytek je vlastní
 * obchodu: krámek s kamerou a stmíváním, detail kusu a šátek.
 */
import { stranka } from "../parta2/prechody";
import { spust } from "../parta2/stav";
import { initNebe } from "../parta2/nebe";
import { initKami } from "../parta2/kami";
import { hlavicka } from "../parta2/hlavicka";
import { sezonaMesice } from "../../data/uvod2";
import { initSatek } from "./satek";
import { kramek } from "./kramek";
import { scena } from "./scena";
import { initOtoc } from "./futatsu-otoc";
import { initPodpis } from "./podpis";
import { schovej } from "../parta2/sber";

/* Celé se to spustí při každé návštěvě stránky, i po přechodu bez načtení (prechody.ts) */
stranka("obchod-2", () => {
  hlavicka();
  initKami();
  /* Scéna dřív než obloha: měří výšku sekce a přepisuje její data-hodina,
     obloha pak v témže snímku čte už novou hodinu */
  scena();
  initNebe();
  /* Strom za domem má období podle dneška — do statické stránky se zapsalo při buildu */
  document.querySelectorAll<HTMLElement>(".krm-scena").forEach((el) => (el.dataset.sezona = sezonaMesice(new Date().getMonth() + 1)));
  const satek = initSatek();
  kramek(satek);
  /* Zadní místnost: Futatsu v tokonomě jde vzít do ruky */
  initOtoc();
  initPodpis();
  /* Střípek schovaný v hodinách krámku — hra na hledání kami */
  document.querySelectorAll<HTMLElement>(".o2k-hodiny [data-skryty]").forEach(schovej);
  spust();
});
