/**
 * Vstup pro /kontakt. Obloha, hlavička a klikací kami jsou společné
 * s ostatními stránkami nového vzhledu; provázkový telefon a ústředna
 * uvnitř dílny jsou v scena.ts a uvnitr.ts; pod první obrazovkou louka
 * po pásech (louka.ts), stojan ema s otázkami (ema.ts) a vývěska s mapou
 * a táhlem kresby a fotky domu (kudy.ts).
 */
import { stranka } from "../parta2/prechody";
import { spust } from "../parta2/stav";
import { initNebe } from "../parta2/nebe";
import { initKami } from "../parta2/kami";
import { hlavicka } from "../parta2/hlavicka";
import { scena } from "./scena";
import { kudyKNam } from "./kudy";
import { loukaPod } from "./louka";
import { emaStojan } from "./ema";
import { snuraLouky } from "./snura";

stranka("kontakt", () => {
  hlavicka();
  initKami();
  initNebe();
  scena();
  emaStojan();
  kudyKNam();
  loukaPod();
  snuraLouky();
  spust();
});
