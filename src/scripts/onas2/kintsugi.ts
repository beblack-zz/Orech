/**
 * Kintsugi: každá nalezená šupinka zalije jednu prasklinu misky. Když je
 * zlato celé, dá se miska dozlatit — přejede po ní lesk a Střípek se
 * ozve. Stav bere ze sbírky (parta2/sbirka.ts), volá se při každé změně.
 */
import { rekni } from "../parta2/kami";
import * as zvuk from "../parta2/zvuk";

export function kintsugi() {
  const miska = document.querySelector<HTMLElement>("[data-kintsugi]");
  const zalit = document.querySelector<HTMLButtonElement>("[data-kintsugi-zalit]");
  const veta = document.querySelector<HTMLElement>(".kintsugi-stav-veta");
  const stripek = miska?.querySelector<HTMLElement>(".kintsugi-stripek");
  let celkem = 0;

  zalit?.addEventListener("click", () => {
    if (!miska) return;
    miska.classList.remove("zalito");
    void miska.offsetWidth;
    miska.classList.add("zalito");
    zvuk.zlato();
    if (stripek) {
      stripek.classList.remove("reaguje");
      void stripek.offsetWidth;
      stripek.classList.add("reaguje");
      window.setTimeout(() => {
        stripek.classList.remove("reaguje");
        rekni(stripek, "stripek", "Zlato! Teď jsem nejhezčí miska v dílně. Teda já jsem hrnek. Ale i tak.");
      }, 900);
    }
  });

  /** Překreslí spáry podle toho, co je nalezeno */
  return (mam: ReadonlySet<string>) => {
    celkem = document.querySelectorAll(".ks-spara").length;
    document.querySelectorAll<SVGGElement>(".ks-spara").forEach((g) => g.classList.toggle("je", mam.has(g.dataset.spara ?? "")));
    const vse = mam.size >= celkem && celkem > 0;
    if (zalit) zalit.disabled = !vse;
    if (veta) veta.textContent = vse ? "Zlato je celé — můžeš spáry zalít." : "Šupinky jsou schované ve svitku — v každém měsíci jedna.";
    miska?.classList.toggle("cela", vse);
  };
}
