/**
 * Lektor, nebo open studio. Bez skriptu jsou vidět oba seznamy; se
 * skriptem přepínač a vždy jen jeden. V open studiu přistane přes fotky
 * lísteček, že lektoři jsou u kafe.
 */
import * as zvuk from "../parta2/zvuk";

export function lektor() {
  const papir = document.querySelector<HTMLElement>("[data-lektor]");
  if (!papir) return;
  const prepinac = papir.querySelector<HTMLElement>(".d-lektor-prepinac");
  const tlacitka = [...papir.querySelectorAll<HTMLButtonElement>("[data-rezim]")];
  const rezimy = [...papir.querySelectorAll<HTMLElement>(".d-lektor-rezim")];
  const hlaseni = papir.querySelector<HTMLElement>(".d-lektor-nikdo");
  if (!prepinac) return;
  prepinac.hidden = false;
  papir.classList.add("s-prepinacem");

  const nastav = (rezim: string, ozvat = true) => {
    papir.dataset.rezim = rezim;
    tlacitka.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.rezim === rezim)));
    rezimy.forEach((r) => (r.hidden = r.dataset.pro !== rezim));
    if (hlaseni) hlaseni.textContent = rezim === "bez" ? "Open studio: dílna je tvoje, lektoři jsou u kafe." : "S lektorem: Jiřík nebo Renča jsou u tebe.";
    if (ozvat) zvuk.papir();
  };
  tlacitka.forEach((b) => b.addEventListener("click", () => nastav(b.dataset.rezim ?? "s")));
  nastav("s", false);
}
