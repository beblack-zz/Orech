/**
 * Vstup pro /o-nas. Obloha, hlavička, zvuky a klikací kami jsou
 * společné s ostatními stránkami nového vzhledu, zbytek je vlastní O nás.
 * Rok dílny jede na stejném skriptu jako na Úvodu 2 (uvod2/rok.ts).
 */
import { stranka } from "../parta2/prechody";
import { spust } from "../parta2/stav";
import { initNebe } from "../parta2/nebe";
import { initKami } from "../parta2/kami";
import { hlavicka } from "../parta2/hlavicka";
import { rok } from "../uvod2/rok";
import { schovej } from "../parta2/sber";
import { pocatek } from "./pocatek";
import { rukopisy } from "./rukopisy";
import { enso } from "./enso";
import { kintsugi } from "./kintsugi";
import { spolu } from "./spolu";
import { foto } from "./foto";

/* Celé se to spustí při každé návštěvě stránky, i po přechodu bez načtení (prechody.ts) */
stranka("o-nas-2", () => {
  hlavicka();
  initKami();
  initNebe();
  rok();
  /* Kapka schovaná na opěradle židle v roce dílny — hra na hledání kami */
  document.querySelectorAll<HTMLElement>(".rez-rok [data-skryty]").forEach(schovej);
  pocatek();
  rukopisy();
  enso();
  kintsugi();
  spolu();
  foto();
  spust();
});
