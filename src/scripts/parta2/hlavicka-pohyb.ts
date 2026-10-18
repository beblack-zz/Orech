/**
 * Pohyb hlavičky v jednom kuse: zvonkohra ve větru, pohyb závěsu s kami
 * a tah štětce po okraji bubliny. Při prvním načtení stránky ho hlavicka.ts
 * stahuje až po prvním vykreslení, až má prohlížeč klid — do té doby visí
 * zvonkohra i závěs v klidové poloze z buildu a tah na první stránce stejně
 * čeká, až se namaluje kruh. Jeden modul, ať je to jedno stažení.
 */
export { initZvonkohra } from "./zvonkohra";
export { rozhybejZaves } from "./zaves-pohyb";
export { initTah } from "./tah";
