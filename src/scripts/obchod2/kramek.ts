/**
 * Krámek: kliknutím na přihrádku (nebo bednu) se kus otevře v detailu.
 * Obsah detailu je předem vyrenderovaný v <template data-detail="id">
 * (components/obchod2/DetailKusu.astro) — tady se jen naklonuje dovnitř
 * dialogu. V detailu se listuje v pořadí, v jakém kusy stojí v krámku
 * (šipkami nebo odkazy dole), a přepínají se pohledy na fotky.
 *
 * Tlačítka „Do šátku“ obsluhuje šátek (satek.ts) přes data-satek-pridat;
 * po naklonování se jim jen srovná nápis.
 */
import type { Satek } from "./satek";
import * as zvuk from "../parta2/zvuk";

export function kramek(satek: Satek) {
  const dialog = document.querySelector<HTMLDialogElement>(".o2k-dialog");
  const obsah = dialog?.querySelector<HTMLElement>("[data-detail-obsah]");
  if (!dialog || !obsah) return;
  const ids = [...document.querySelectorAll<HTMLElement>("[data-kramek-kus]")].map((el) => el.dataset.kramekKus ?? "");
  const poradi = dialog.querySelector<HTMLElement>(".o2k-poradi");
  let i = 0;

  const ukaz = (k: number) => {
    i = (k + ids.length) % ids.length;
    const sablona = document.querySelector<HTMLTemplateElement>(`template[data-detail="${ids[i]}"]`);
    if (!sablona) return;
    obsah.replaceChildren(sablona.content.cloneNode(true));
    obsah.dataset.kus = ids[i];
    if (poradi) poradi.textContent = `${i + 1} / ${ids.length}`;
    satek.obnovTlacitka();
  };

  const prepniSnimek = (tlacitko: HTMLElement) => {
    const n = tlacitko.dataset.ukazSnimek;
    obsah.querySelectorAll<HTMLElement>("[data-snimek]").forEach((s) => s.classList.toggle("je", s.dataset.snimek === n));
    obsah.querySelectorAll("[data-ukaz-snimek]").forEach((b) => b.setAttribute("aria-pressed", String(b === tlacitko)));
    zvuk.cink();
  };

  document.addEventListener("click", (e) => {
    const b = (e.target as Element).closest<HTMLElement>("[data-otevri-kus]");
    if (!b) return;
    const k = ids.indexOf(b.dataset.otevriKus ?? "");
    if (k < 0) return;
    ukaz(k);
    zvuk.papir();
    dialog.showModal();
  });

  dialog.addEventListener("click", (e) => {
    const t = e.target as Element;
    /* Klik na tmavé pozadí kolem dialogu zavírá */
    if (t === dialog || t.closest(".omamori-zavrit")) {
      dialog.close();
      return;
    }
    const snimek = t.closest<HTMLElement>("[data-ukaz-snimek]");
    if (snimek) prepniSnimek(snimek);
    else if (t.closest("[data-detail-predchozi]")) ukaz(i - 1);
    else if (t.closest("[data-detail-dalsi]")) ukaz(i + 1);
  });

  dialog.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") ukaz(i - 1);
    else if (e.key === "ArrowRight") ukaz(i + 1);
    else return;
    e.preventDefault();
    zvuk.papir();
  });
}
