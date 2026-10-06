/**
 * Otázky jako rozhovor: když se otázka rozklikne, kami chvíli „píše“
 * a teprve pak odpoví. Bez skriptu se odpověď ukáže hned.
 */
import { klid } from "../parta2/stav";
import * as zvuk from "../parta2/zvuk";

export function otazky() {
  for (const d of document.querySelectorAll<HTMLDetailsElement>(".chat-vlakno")) {
    d.addEventListener("toggle", () => {
      if (!d.open || klid) return;
      d.classList.add("pise");
      window.setTimeout(() => {
        d.classList.remove("pise");
        zvuk.cink();
      }, 650 + Math.random() * 450);
    });
  }
}
