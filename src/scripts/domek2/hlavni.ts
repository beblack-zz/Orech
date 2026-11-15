/**
 * Vstup pro /domek-2. Obloha, hlavička, zvuky a klikací kami jsou společné
 * s ostatními stránkami nového vzhledu. Plánovač scrollu se spustí jednou
 * nakonec.
 */
import { stranka } from "../parta2/prechody";
import { spust } from "../parta2/stav";
import { initNebe } from "../parta2/nebe";
import { initKami } from "../parta2/kami";
import { hlavicka } from "../parta2/hlavicka";
import { sezonaMesice } from "../../data/uvod2";
import { ulice } from "./ulice";
import { uvodZivot } from "./uvod-zivot";
import { souboj } from "./souboj";
import { pozdeji } from "../parta2/pozdeji";

/** Roční období podle dneška — stránka je statická a období v ní je z buildu */
function initSezona() {
  const s = sezonaMesice(new Date().getMonth() + 1);
  document.querySelectorAll<HTMLElement>("#uvod, #ulice, #fotky, #kramek, #kami-parta, #kontakt").forEach((el) => (el.dataset.sezona = s));
}

/* Celé se to spustí při každé návštěvě stránky, i po přechodu bez načtení (prechody.ts) */
stranka("domek-2", () => {
  hlavicka();
  initKami();
  initSezona();
  initNebe();
  uvodZivot();
  ulice();
  souboj();
  /* Velké kresby níž na stránce až cestou k nim */
  pozdeji();
  spust();
});
