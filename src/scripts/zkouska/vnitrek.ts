/**
 * Co je v komnatě U mistra za dveřmi: okno úrovně (uroven.ts), sešit
 * razítek (sesit.ts), deska sugoroku (deska.ts) a síň mistra s listem
 * (sin.ts). Je to samostatný kus skriptu — hlavni.ts ho stáhne, až jsou
 * dveře otevřené, takže kdo kami ještě nemá, tohle vůbec nestahuje.
 * Devět her se stahuje až při otevření své úrovně (uroven.ts).
 *
 * Volá se po importu přes zaStranku (prechody.ts) — posluchače a smyčky,
 * které se tu založí, patří stránce a po přechodu se uklidí.
 */
import { initUrovne } from "./uroven";
import { initSesit } from "./sesit";
import { initDeska } from "./deska";
import { initSin } from "./sin";

export function initVnitrek() {
  initUrovne();
  initSesit();
  initDeska();
  initSin();
}
