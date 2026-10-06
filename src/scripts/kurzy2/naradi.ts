/**
 * Ztracené nářadí na /kurzy-2: šest kusů rozházených po stránce. Co se
 * najde, jde do bedýnky v hlavičce a pamatuje se v prohlížeči.
 */
import { naradi } from "../../data/kurzy2";
import { nacti, uloz } from "../parta2/stav";
import * as zvuk from "../parta2/zvuk";

const KLIC = "kurzy2-naradi";
const VSE = naradi.length;
const nazvy = Object.fromEntries(naradi.map((n) => [n.id, n.nazev]));

export function initNaradi() {
  const nalezeno = new Set<string>(nacti<string[]>(KLIC, []));
  const dialog = document.querySelector<HTMLDialogElement>(".naradi-dialog");
  const tlacitko = document.querySelector<HTMLElement>(".naradi-tlacitko");
  const oznameni = document.querySelector<HTMLElement>(".oznameni");
  let casovac: number | undefined;

  const aktualizuj = () => {
    const n = nalezeno.size;
    document.querySelectorAll(".naradi-pocet b, .naradi-stav b").forEach((b) => (b.textContent = String(n)));
    tlacitko?.setAttribute("aria-label", `Bedýnka: nalezeno ${n} z ${VSE} kusů nářadí`);
    document.querySelectorAll<HTMLElement>("[data-bedna]").forEach((li) => li.classList.toggle("je", nalezeno.has(li.dataset.bedna!)));
    document.querySelectorAll<HTMLElement>("[data-naradi]").forEach((b) => b.classList.toggle("nalezen", nalezeno.has(b.dataset.naradi!)));
    document.documentElement.classList.toggle("je-plna", n === VSE);
  };

  const oznam = (b: HTMLElement, id: string) => {
    if (!oznameni) return;
    oznameni.textContent = "";
    const obr = b.querySelector("svg")?.cloneNode(true);
    if (obr) oznameni.append(obr);
    const t = document.createElement("span");
    const jmeno = document.createElement("b");
    jmeno.textContent = nazvy[id] ?? id;
    t.append(jmeno, document.createTextNode(nalezeno.size === VSE ? " · bedýnka je plná. Stačí přijít." : ` · nalezeno ${nalezeno.size} z ${VSE}`));
    oznameni.append(t);
    oznameni.classList.add("je");
    window.clearTimeout(casovac);
    casovac = window.setTimeout(() => oznameni.classList.remove("je"), nalezeno.size === VSE ? 4200 : 2600);
  };

  document.addEventListener("click", (e) => {
    const b = (e.target as Element).closest<HTMLElement>("[data-naradi]");
    if (!b) return;
    const id = b.dataset.naradi!;
    if (nalezeno.has(id)) return;
    nalezeno.add(id);
    uloz(KLIC, [...nalezeno]);
    b.classList.add("nalezen-ted");
    window.setTimeout(() => b.classList.remove("nalezen-ted"), 800);
    aktualizuj();
    if (nalezeno.size === VSE) zvuk.oslava();
    else zvuk.nalezeno();
    oznam(b, id);
    if (tlacitko) {
      tlacitko.classList.remove("cinkne");
      void tlacitko.offsetWidth;
      tlacitko.classList.add("cinkne");
    }
  });

  tlacitko?.addEventListener("click", () => dialog?.showModal());
  dialog?.querySelector(".omamori-zavrit")?.addEventListener("click", () => dialog.close());
  dialog?.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });
  dialog?.querySelector(".omamori-reset")?.addEventListener("click", () => {
    nalezeno.clear();
    uloz(KLIC, []);
    aktualizuj();
  });
  aktualizuj();
}
