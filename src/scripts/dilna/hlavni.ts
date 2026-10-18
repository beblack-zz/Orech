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
import { pozdeji, nekreslitMimo } from "../parta2/pozdeji";

/* Celé se to spustí při každé návštěvě stránky, i po přechodu bez načtení (prechody.ts) */
stranka("dilna", () => {
  hlavicka();
  initKami();
  initNebe();
  vypal();
  /* Kresby kapitol až cestou k nim — regál v úvodu je vidět hned — a co už
     bylo vidět, se mimo obrazovku znovu nevykresluje */
  pozdeji();
  nekreslitMimo(".d-kresba");
  spust();
});
