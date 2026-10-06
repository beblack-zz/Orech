/**
 * Jiřík a Renča: fotky se „vyvolají“ a podpis se dopíše, když na ně
 * člověk poprvé dojede. Hlídá se scrollem, ne IntersectionObserverem —
 * stejný plánovač jako zbytek stránky.
 */
import { priMereni, priScrollu, pozice } from "../parta2/stav";

export function lide() {
  const sekce = document.querySelector<HTMLElement>("#lide");
  if (!sekce) return;
  let horni = 0;
  priMereni(() => {
    horni = pozice(sekce.querySelector(".lide-fotky") ?? sekce).top;
  });
  priScrollu((y, vh) => {
    if (horni && y + vh * 0.7 > horni) sekce.classList.add("vyvolano");
  });
}
