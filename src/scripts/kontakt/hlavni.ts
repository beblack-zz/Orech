/**
 * Vstup pro /kontakt. Obloha, hlavička a klikací kami jsou společné
 * s ostatními stránkami nového vzhledu; provázkový telefon a ústředna
 * uvnitř dílny jsou v scena.ts a uvnitr.ts, táhlo kresby a fotky domu
 * v sekci Kudy k nám v kudy.ts.
 */
import { stranka } from "../parta2/prechody";
import { spust } from "../parta2/stav";
import { initNebe } from "../parta2/nebe";
import { initKami } from "../parta2/kami";
import { hlavicka } from "../parta2/hlavicka";
import { scena } from "./scena";
import { kudyKNam } from "./kudy";

stranka("kontakt", () => {
  hlavicka();
  initKami();
  initNebe();
  scena();
  kudyKNam();
  spust();
});
