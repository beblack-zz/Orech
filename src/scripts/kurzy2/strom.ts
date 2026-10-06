/**
 * Strom dovedností: kliknutí na ořech ukáže kurzy, které ho učí,
 * a rozsvítí cestu od kořene — vidět je, co všechno je pod tím.
 */
import * as zvuk from "../parta2/zvuk";

export function strom() {
  const koren = document.querySelector<HTMLElement>("[data-strom]");
  if (!koren) return;
  const uzly = [...koren.querySelectorAll<HTMLButtonElement>(".strom-uzel")];
  const podle = new Map(uzly.map((u) => [u.dataset.uzel!, u]));
  const vetve = new Map([...koren.querySelectorAll<SVGGElement>("[data-vetev]")].map((g) => [g.dataset.vetev!, g]));

  const zavri = () => {
    uzly.forEach((u) => {
      u.setAttribute("aria-expanded", "false");
      u.classList.remove("na-ceste");
      (u.nextElementSibling as HTMLElement).hidden = true;
    });
    vetve.forEach((g) => g.classList.remove("sviti"));
  };

  for (const u of uzly) {
    u.addEventListener("click", (e) => {
      e.stopPropagation();
      const bylo = u.getAttribute("aria-expanded") === "true";
      zavri();
      if (bylo) return;
      u.setAttribute("aria-expanded", "true");
      (u.nextElementSibling as HTMLElement).hidden = false;
      // Cesta ke kořeni
      let id: string | undefined = u.dataset.uzel;
      while (id) {
        const uzel = podle.get(id);
        vetve.get(id)?.classList.add("sviti");
        if (uzel && uzel !== u) uzel.classList.add("na-ceste");
        id = uzel?.dataset.rodic || undefined;
      }
      zvuk.cink();
    });
  }
  document.addEventListener("click", (e) => {
    if (!koren.contains(e.target as Node)) zavri();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") zavri();
  });
}
