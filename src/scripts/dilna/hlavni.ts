/**
 * Vstup pro /dilna. Obloha, hlavička, zvuky a klikací kami jsou společné
 * s ostatními stránkami nového vzhledu. Tvůj kus se načte dřív než sekce,
 * které ho kreslí. Nakonec se jednou spustí plánovač scrollu.
 */
import { stranka } from "../parta2/prechody";
import { spust } from "../parta2/stav";
import { initNebe } from "../parta2/nebe";
import { initKami } from "../parta2/kami";
import { hlavicka } from "../parta2/hlavicka";
import { initKus } from "./stav-kusu";
import { uvod } from "./uvod";
import { placat } from "./placat";
import { tocit } from "./tocit";
import { glazovat } from "./glazovat";
import { lektor } from "./lektor";
import { cesta } from "./cesta";
import { kafe } from "./kafe";
import { noc } from "./noc";

/* Celé se to spustí při každé návštěvě stránky, i po přechodu bez načtení (prechody.ts) */
stranka("dilna", () => {
  hlavicka();
  initKami();
  initKus();
  initNebe();
  uvod();
  placat();
  tocit();
  glazovat();
  lektor();
  cesta();
  kafe();
  noc();
  spust();
});
