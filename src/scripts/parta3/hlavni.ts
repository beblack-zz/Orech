/**
 * Vstup pro /parta-3. Obloha a hlavička se zvukem jsou společné s ostatními
 * stránkami nového vzhledu; scény na jevišti i lampiony v průvodu se spouštějí
 * samy přes své komponenty (scripts/<postava>-<téma>/beh.js) a divadlo nad
 * nimi řídí režisér.
 */
import { stranka } from "../parta2/prechody";
import { spust } from "../parta2/stav";
import { initNebe } from "../parta2/nebe";
import { hlavicka } from "../parta2/hlavicka";
import { initDivadlo } from "./reziser";
import { initPruvod, initZaver } from "./pruvod";

/* Celé se to spustí při každé návštěvě stránky, i po přechodu bez načtení (prechody.ts) */
stranka("parta-3", () => {
  hlavicka();
  initNebe();
  initPruvod();
  initDivadlo();
  initZaver();
  spust();
});
