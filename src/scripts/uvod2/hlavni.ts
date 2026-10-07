/**
 * Vstup pro /uvod-2. Obloha, hlavička, zvuky a klikací kami jsou společné
 * s Partou 2 a Kurzy 2; zbytek je vlastní úvodu. Nejdřív razítka (ostatní
 * je dávají), pak scény, nakonec se jednou spustí plánovač scrollu.
 */
import { stranka } from "../parta2/prechody";
import { spust } from "../parta2/stav";
import { initNebe } from "../parta2/nebe";
import { initKami } from "../parta2/kami";
import { hlavicka } from "../parta2/hlavicka";
import { initRazitka } from "./razitka";
import { initSezona } from "./sezona";
import { brana } from "./brana";
import { prohlidka } from "./prohlidka";
import { tabule } from "./tabule";
import { lide } from "./lide";
import { rok } from "./rok";
import { noc } from "./noc";

/* Celé se to spustí při každé návštěvě stránky, i po přechodu bez načtení (prechody.ts) */
stranka("uvod-2", () => {
  hlavicka();
  initKami();
  initRazitka();
  initSezona();
  initNebe();
  brana();
  prohlidka();
  tabule();
  lide();
  rok();
  noc();
  spust();
});
