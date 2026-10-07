/**
 * Hlavička nového vzhledu: mobilní menu a zvonkohra, kterou se zvuk ztlumí.
 * Sdílí ji všechny stránky nového vzhledu.
 *
 * Při přechodu mezi stránkami (prechody.ts) se tlačítko se zvonkohrou
 * přenáší do nové stránky (transition:persist), takže zvonkohra a zvuk se
 * nastaví jen poprvé a běží dál. Menu je na každé stránce nové.
 */
import * as zvuk from "./zvuk";
import { initZvonkohra } from "./zvonkohra";
import { nacti, uloz } from "./stav";
import { trvale } from "./prechody";

const KLIC_ZTLUMENO = "zvuk-ztlumeno";
/** V téhle záložce už zvuk jednou hrál */
const KLIC_HRALO = "zvuk-hralo";
let zvukHotovy = false;

export function hlavicka() {
  initMenu();
  if (!zvukHotovy) {
    zvukHotovy = true;
    trvale(zvonkohraAZvuk);
  }
}

function initMenu() {
  const tlacitko = document.querySelector<HTMLButtonElement>(".hlava-menu-tlacitko");
  const menu = document.getElementById("hlava-menu");
  const nastavMenu = (otevrene: boolean) => {
    if (!menu || !tlacitko) return;
    menu.hidden = !otevrene;
    tlacitko.setAttribute("aria-expanded", String(otevrene));
    tlacitko.setAttribute("aria-label", otevrene ? "Zavřít menu" : "Otevřít menu");
  };
  tlacitko?.addEventListener("click", () => nastavMenu(!!menu?.hidden));
  menu?.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => nastavMenu(false)));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") nastavMenu(false);
  });
}

function zvonkohraAZvuk() {
  /*
   * Zvuk je ve výchozím stavu zapnutý. Prohlížeč ho ale pustí až po prvním
   * gestu, takže se rozezní při prvním kliknutí nebo klávese kdekoli na
   * stránce. Kliknutí na zvonkohru zvuk ztlumí a ztlumení si web pamatuje.
   */
  const zv = document.querySelector<HTMLButtonElement>(".zvuk-tlacitko");
  const kresba = zv?.querySelector<SVGSVGElement>(".zvonkohra svg");
  const zk = kresba ? initZvonkohra(kresba) : null;
  if (!zv) return;
  let chci = !nacti(KLIC_ZTLUMENO, false);
  const ukaz = () => {
    zv.setAttribute("aria-pressed", String(chci));
    zv.setAttribute("aria-label", chci ? "Ztlumit zvuk" : "Zapnout zvuk");
    zv.title = chci ? "Ztlumit zvuk" : "Zapnout zvuk";
  };
  const rozezni = async () => {
    if (!zvuk.jeZapnuto()) {
      await zvuk.prepni();
      // Hned po zapnutí se zvonkohra rozhoupe, ať je slyšet, že zvuk jde
      zk?.rozhoupej();
      try {
        sessionStorage.setItem(KLIC_HRALO, "1");
      } catch {}
    }
  };
  const GESTA = ["pointerup", "keydown", "touchend"] as const;
  /* Čeká se, dokud zvuk opravdu nehraje — Safari na iPhonu bere jako gesto až touchend */
  const prvniGesto = (e: Event) => {
    if (zvuk.hraje()) {
      GESTA.forEach((g) => document.removeEventListener(g, prvniGesto, true));
      return;
    }
    if (!chci || zv.contains(e.target as Node)) return;
    if (zvuk.jeZapnuto()) zvuk.odemkni();
    else rozezni();
  };
  GESTA.forEach((g) => document.addEventListener(g, prvniGesto, true));
  /* Přišel-li člověk odkazem z jiné stránky webu, kde už zvuk hrál, zkusí se
     rozeznít hned. Chrome a Edge to po kliknutí na odkaz obvykle dovolí;
     Safari a Firefox ne — tam zvuk dál čeká na první gesto. */
  let hralo = false;
  try {
    hralo = sessionStorage.getItem(KLIC_HRALO) === "1";
  } catch {}
  if (chci && hralo) rozezni();
  zv.addEventListener("click", () => {
    chci = !chci;
    uloz(KLIC_ZTLUMENO, !chci);
    ukaz();
    if (chci) rozezni();
    else if (zvuk.jeZapnuto()) zvuk.prepni();
  });
  ukaz();
}
