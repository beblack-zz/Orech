/**
 * Vstup pro /parta-3. Obloha a hlavička se zvukem jsou společné s ostatními
 * stránkami nového vzhledu; lampiony v průvodu se spouštějí samy přes své
 * komponenty (scripts/<postava>-<téma>/beh.js). Lampiony pod střechou chrámu
 * přepínají obsazení a malé kami v něm jsou klikací stejně jako na Partě 2.
 */
import { stranka } from "../parta2/prechody";
import { spust } from "../parta2/stav";
import { initNebe } from "../parta2/nebe";
import { initKami } from "../parta2/kami";
import { hlavicka } from "../parta2/hlavicka";
import { initObsazeni } from "./obsazeni";
import { initPruvod, initZaver } from "./pruvod";
import { schovej } from "../parta2/sber";

/* Celé se to spustí při každé návštěvě stránky, i po přechodu bez načtení (prechody.ts) */
stranka("parta-3", () => {
  hlavicka();
  initKami();
  initNebe();
  initPruvod();
  initObsazeni();
  initZaver();
  /* Pecinka vykukuje nad svitkem průvodu — hra na hledání kami */
  document.querySelectorAll<HTMLElement>(".svitek [data-skryty]").forEach(schovej);
  spust();
});
