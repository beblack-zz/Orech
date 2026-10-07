/**
 * Vstup pro /marcel. Obloha a hlavička se zvukem jsou společné s ostatními
 * stránkami nového vzhledu; Kapka s bubny hromu, Pecinka s ohněm, Cedulka jako ema,
 * Kachlík a rovina, Hlínka, kami země, i Šamotka nese se spouštějí samy
 * (scripts/kapka-bubny/beh.js, scripts/pecinka-ohen/beh.js, scripts/cedulka-ema/beh.js,
 * scripts/kachlik-rovina/beh.js, scripts/hlinka-zeme/beh.js
 * a scripts/samotka-nese/beh.js, přes své komponenty).
 */
import { stranka } from "../parta2/prechody";
import { spust } from "../parta2/stav";
import { initNebe } from "../parta2/nebe";
import { hlavicka } from "../parta2/hlavicka";

/* Celé se to spustí při každé návštěvě stránky, i po přechodu bez načtení (prechody.ts) */
stranka("marcel", () => {
  hlavicka();
  initNebe();
  spust();
});
