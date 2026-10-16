/**
 * Obsazení na /parta (components/parta3/Obsazeni.astro): lampiony pod
 * střechou chrámu přepínají, čí list visí pod vlysem. Rozsvícený lampion se
 * zhoupne a jeho kami řekne svou repliku z jeviště. Šipky mezi lampiony
 * přeskakují jako u záložek.
 */
import { ucinkujici } from "../../data/parta3";
import type { PostavaId } from "../../data/parta";
import { rekni } from "../parta2/kami";
import * as zvuk from "../parta2/zvuk";
import { nactiSceny } from "../parta2/lina-scena";

export function initObsazeni() {
  const koren = document.querySelector<HTMLElement>("[data-obsazeni]");
  if (!koren) return;
  const lampiony = [...koren.querySelectorAll<HTMLButtonElement>(".lampion")];
  const listy = [...koren.querySelectorAll<HTMLElement>("[data-kdo-list]")];

  const zhoupni = (l: HTMLElement) => {
    l.classList.remove("houpne");
    void l.offsetWidth;
    l.classList.add("houpne");
    /* po zhoupnutí se vrátí k pomalému kývání ve větru */
    window.setTimeout(() => l.classList.remove("houpne"), 980);
  };

  const ukaz = (l: HTMLButtonElement) => {
    const id = l.dataset.kdo as PostavaId;
    for (const x of lampiony) x.setAttribute("aria-pressed", String(x === l));
    for (const list of listy) list.hidden = list.dataset.kdoList !== id;
    zhoupni(l);
    zvuk.reakce(id);
    const u = ucinkujici.find((x) => x.id === id);
    if (u) rekni(l, id, u.replika);
  };

  /* Motor scény se stáhne, až se list ukáže (parta2/lina-scena.ts); kdo na lampion najede nebo na něj sáhne, má ho o chvilku dřív */
  const predem = (l: HTMLButtonElement) => {
    const list = listy.find((x) => x.dataset.kdoList === l.dataset.kdo);
    if (list) nactiSceny(list);
  };

  lampiony.forEach((l, i) => {
    for (const typ of ["pointerenter", "pointerdown", "focus"]) l.addEventListener(typ, () => predem(l));
    l.addEventListener("click", () => ukaz(l));
    l.addEventListener("keydown", (e) => {
      const krok = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (!krok) return;
      e.preventDefault();
      const dalsi = lampiony[(i + krok + lampiony.length) % lampiony.length];
      dalsi.focus();
      ukaz(dalsi);
    });
  });
}
