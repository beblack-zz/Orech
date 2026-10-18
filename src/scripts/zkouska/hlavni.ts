/**
 * Vstup pro /zkouska — druhou komnatu hry, U mistra. Obloha, hlavička se
 * závěsem a omamori jsou společné s ostatními stránkami nového vzhledu;
 * vlastní jsou dveře (dvere.ts), deska sugoroku (deska.ts), okno úrovně
 * s devíti hrami (uroven.ts, urovne/*), sešit razítek (sesit.ts) a síň
 * mistra s listem (sin.ts).
 *
 * Hned se načte jen to, co je vidět: dveře. Deska, okno úrovně, sešit
 * a síň jsou za nimi (vnitrek.ts) a stáhnou se, až jsou dveře otevřené;
 * každá hra až při otevření své úrovně.
 */
import { stranka, zaStranku } from "../parta2/prechody";
import { spust } from "../parta2/stav";
import { initNebe } from "../parta2/nebe";
import { initKami } from "../parta2/kami";
import { hlavicka } from "../parta2/hlavicka";
import { naZkousku } from "./postup";
import { initDvere } from "./dvere";

/* Celé se to spustí při každé návštěvě stránky, i po přechodu bez načtení (prechody.ts) */
stranka("zkouska", () => {
  /* jen při vývoji: ?vse = všech devět úrovní prošlých, ať jde vidět síň mistra */
  if (import.meta.env.DEV && new URLSearchParams(location.search).has("vse")) naZkousku();
  hlavicka();
  initKami();
  initNebe();
  /* Za dveřmi: stáhne se poprvé, když jsou otevřené (hned, nebo až se najde šestý kami);
     modul se vyhodnotí jednou, init běží při každé návštěvě */
  let vnitrek = false;
  initDvere(() => {
    if (vnitrek) return;
    vnitrek = true;
    import("./vnitrek").then(
      zaStranku((m) => m.initVnitrek()),
      (e: unknown) => {
        /* Nestáhlo se (bez sítě): zkusí se znovu, až se dveře zkontrolují příště */
        vnitrek = false;
        console.error(e);
      },
    );
  });
  spust();
});
