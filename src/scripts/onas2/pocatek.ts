/**
 * Začátek: z prasklé trubky ukápne kapka, po dopadu se rozejdou kruhy
 * a z posledního se postaví ensō — tah štětce se přitom dokreslí
 * (jeho animaci má komponenta Enso, tady se jen pustí ve správnou chvíli).
 * Další kapky už jen kapou a kruhy jdou dokola (CSS).
 */
import { klid } from "../parta2/stav";
import * as zvuk from "../parta2/zvuk";

export function pocatek() {
  const s = document.querySelector<HTMLElement>("[data-pocatek]");
  if (!s) return;
  if (klid) {
    s.classList.add("stoji");
    return;
  }
  s.classList.add("bezi");
  window.setTimeout(() => {
    s.classList.add("dopad");
    zvuk.kapka();
  }, 1360);
  window.setTimeout(() => s.classList.add("stoji"), 1500);
}
