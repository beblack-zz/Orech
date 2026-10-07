/**
 * Kávovar v kuchyňce. Postavit na kafe: mele, teče, hrnek se plní a kouří
 * se z něj. Kafe je samozřejmost — a druhé taky.
 */
import { klid } from "../parta2/stav";
import * as zvuk from "../parta2/zvuk";
import { rekni } from "../parta2/kami";

export function kafe() {
  const box = document.querySelector<HTMLElement>("[data-kafe]");
  if (!box) return;
  const tlacitko = box.querySelector<HTMLButtonElement>(".d-kafe-tlacitko")!;
  const displej = box.querySelector<SVGTextElement>(".d-kafe-displej")!;
  const text = box.querySelector<HTMLElement>(".d-kafe-text")!;
  const kapka = box.querySelector<HTMLElement>(".d-kafe-kami");
  let kolik = 0;
  let vari = false;

  const nastav = (stav: "" | "mele" | "tece" | "plny") => {
    box.dataset.kafe = stav;
  };

  tlacitko.addEventListener("click", () => {
    if (vari) return;
    vari = true;
    tlacitko.disabled = true;
    const znovu = kolik > 0;
    nastav("");
    displej.textContent = "MELU…";
    text.textContent = znovu ? "Ještě jedno? Samozřejmě." : "Melu…";
    zvuk.klapky(10);
    const tece = () => {
      nastav("tece");
      displej.textContent = "TEČE";
      text.textContent = "Teče…";
      zvuk.para();
    };
    const hotovo = () => {
      nastav("plny");
      displej.textContent = "NA ZDRAVÍ";
      kolik++;
      text.textContent = kolik === 1 ? "Hotovo. Kafe je samozřejmost." : `Hotovo. ${kolik}. kafe — pořád samozřejmost.`;
      vari = false;
      tlacitko.disabled = false;
      tlacitko.textContent = "Ještě jedno";
      if (kolik === 1 && kapka) rekni(kapka, "kapka", "Bez vody se na kruhu netočí. A bez kafe taky ne.");
    };
    if (klid) {
      hotovo();
      return;
    }
    window.setTimeout(tece, 900);
    window.setTimeout(hotovo, 3300);
  });
}
