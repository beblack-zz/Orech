/**
 * Vstup pro /obchod-2. Obloha, hlavička, zvuky a klikací kami jsou
 * společné s ostatními stránkami nového vzhledu, zbytek je vlastní
 * obchodu: krámek s detailem kusu a šátek.
 */
import { stranka } from "../parta2/prechody";
import { spust } from "../parta2/stav";
import { initNebe } from "../parta2/nebe";
import { initKami } from "../parta2/kami";
import { hlavicka } from "../parta2/hlavicka";
import { sezonaMesice } from "../../data/uvod2";
import { initSatek } from "./satek";
import { kramek } from "./kramek";

/* Celé se to spustí při každé návštěvě stránky, i po přechodu bez načtení (prechody.ts) */
stranka("obchod-2", () => {
  hlavicka();
  initKami();
  initNebe();
  /* Noční ulice má období podle dneška — do statické stránky se zapsalo při buildu */
  document.querySelectorAll<HTMLElement>(".o2-noc-scena").forEach((el) => (el.dataset.sezona = sezonaMesice(new Date().getMonth() + 1)));
  const satek = initSatek();
  kramek(satek);
  spust();
});
