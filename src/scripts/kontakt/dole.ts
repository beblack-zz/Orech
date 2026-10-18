/**
 * Louka pod první obrazovkou Kontaktu jako samostatný kousek skriptu:
 * hlavni.ts ho načte, až se k louce blíží scroll, a hned, když odkaz skočí
 * na kotvu v ní (#kudy, #otazky). Stojan ema s otázkami (ema.ts), vývěska
 * s mapou a táhlem (kudy.ts), pásy trávy (louka.ts) a šňůra přes louku
 * (snura.ts). První obrazovka (scena.ts) v tu chvíli už stojí — roční
 * období, soumrak i sestup provázku (data-sestup-x) má .ko-dole od ní
 * nastavené a další změny ohlásí sama.
 */
import { emaStojan } from "./ema";
import { kudyKNam } from "./kudy";
import { loukaPod } from "./louka";
import { snuraLouky } from "./snura";

export function dole() {
  emaStojan();
  kudyKNam();
  loukaPod();
  snuraLouky();
}
