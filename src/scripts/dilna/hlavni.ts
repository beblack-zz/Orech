/**
 * Vstup pro /dilna. Obloha, hlavička, zvuky a klikací kami jsou společné
 * s ostatními stránkami nového vzhledu. Dílna je informační stránka —
 * jediné, co má navíc, je ostrý výpal, který se rozpaluje, jak se čte.
 * Nakonec se jednou spustí plánovač scrollu.
 */
import { stranka } from "../parta2/prechody";
import { spust } from "../parta2/stav";
import { initNebe } from "../parta2/nebe";
import { initKami } from "../parta2/kami";
import { hlavicka } from "../parta2/hlavicka";
import { vypal } from "./vypal";

/* Celé se to spustí při každé návštěvě stránky, i po přechodu bez načtení (prechody.ts) */
stranka("dilna", () => {
  hlavicka();
  initKami();
  initNebe();
  vypal();
  spust();
});
