/**
 * Svitky kakejiku s Jiříkem a Renčou se rozvinou, když na ně člověk
 * dojede — jeden po druhém. Bez skriptu jsou rozvinuté rovnou.
 */
import { klid } from "../parta2/stav";
import * as zvuk from "../parta2/zvuk";

export function rukopisy() {
  const svitky = [...document.querySelectorAll<HTMLElement>("[data-kakejiku]")];
  if (!svitky.length || klid) return;
  document.querySelector(".rukopisy")?.classList.add("ceka");
  const pozorovatel = new IntersectionObserver(
    (zaznamy) => {
      for (const z of zaznamy) {
        if (!z.isIntersecting) continue;
        const el = z.target as HTMLElement;
        const i = svitky.indexOf(el);
        window.setTimeout(() => {
          el.classList.add("rozvinuto");
          zvuk.papir();
        }, i * 380);
        pozorovatel.unobserve(el);
      }
    },
    { threshold: 0.3 },
  );
  svitky.forEach((s) => pozorovatel.observe(s));
}
