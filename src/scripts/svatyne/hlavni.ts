/**
 * Vstup pro /svatyne. Obloha, hlavička se závěsem a omamori jsou společné
 * s ostatními stránkami nového vzhledu; vlastní je jen brána a losování.
 */
import { stranka } from "../parta2/prechody";
import { spust } from "../parta2/stav";
import { initNebe } from "../parta2/nebe";
import { hlavicka } from "../parta2/hlavicka";
import { initSvatyne } from "./svatyne";

/* Celé se to spustí při každé návštěvě stránky, i po přechodu bez načtení (prechody.ts) */
stranka("svatyne", () => {
  hlavicka();
  initNebe();
  initSvatyne();
  spust();
});
