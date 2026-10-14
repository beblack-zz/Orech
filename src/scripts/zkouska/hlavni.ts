/**
 * Vstup pro /zkouska — druhou komnatu hry, U mistra. Obloha, hlavička se
 * závěsem a omamori jsou společné s ostatními stránkami nového vzhledu;
 * vlastní jsou dveře (dvere.ts), deska sugoroku (deska.ts), okno úrovně
 * s devíti hrami (uroven.ts, urovne/*), sešit razítek (sesit.ts) a síň
 * mistra s listem (sin.ts).
 */
import { stranka } from "../parta2/prechody";
import { spust } from "../parta2/stav";
import { initNebe } from "../parta2/nebe";
import { initKami } from "../parta2/kami";
import { hlavicka } from "../parta2/hlavicka";
import { naZkousku } from "./postup";
import { initDvere } from "./dvere";
import { initUrovne } from "./uroven";
import { initDeska } from "./deska";
import { initSesit } from "./sesit";
import { initSin } from "./sin";

/* Celé se to spustí při každé návštěvě stránky, i po přechodu bez načtení (prechody.ts) */
stranka("zkouska", () => {
  /* jen při vývoji: ?vse = všech devět úrovní prošlých, ať jde vidět síň mistra */
  if (import.meta.env.DEV && new URLSearchParams(location.search).has("vse")) naZkousku();
  hlavicka();
  initKami();
  initNebe();
  initDvere();
  initUrovne();
  initSesit();
  initDeska();
  initSin();
  spust();
});
