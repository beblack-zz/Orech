/**
 * Drobnosti na /parta: svitek s průvodem a parta na louce
 * v závěru. Postavičky v průvodu jsou živé scény a hýbou se samy (běh mají
 * ve svých komponentách), tady se jen srovná svitek a rozmluví malé podoby.
 */
import { ucinkujici } from "../../data/parta3";
import type { PostavaId } from "../../data/parta";
import { rekni } from "../parta2/kami";
import * as zvuk from "../parta2/zvuk";

export function initPruvod() {
  /* na úzkém okně se svitek posouvá do stran — začne u čela průvodu, tedy vpravo */
  const svitek = document.querySelector<HTMLElement>("[data-svitek]");
  if (svitek && svitek.scrollWidth > svitek.clientWidth + 4) svitek.scrollLeft = svitek.scrollWidth;
}

export function initZaver() {
  const repliky = Object.fromEntries(ucinkujici.map((u) => [u.id, u.replika])) as Record<PostavaId, string>;
  document.querySelectorAll<HTMLButtonElement>("[data-mala]").forEach((b) =>
    b.addEventListener("click", () => {
      const id = b.dataset.mala as PostavaId;
      b.classList.remove("schovka-nalezena");
      void b.offsetWidth;
      b.classList.add("schovka-nalezena");
      window.setTimeout(() => b.classList.remove("schovka-nalezena"), 700);
      rekni(b, id, repliky[id]);
      zvuk.reakce(id);
    }),
  );
}
