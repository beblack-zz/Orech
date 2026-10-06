/**
 * Roční období podle dneška. Stránka je statická a období se do ní zapíše
 * při buildu — tady se srovná s tím, kdy ji kdo opravdu otevřel. Rok dílny
 * má období vlastní (podle měsíce v kresbě), toho se to netýká.
 */
import { sezonaMesice } from "../../data/uvod2";

export function initSezona() {
  const s = sezonaMesice(new Date().getMonth() + 1);
  document.querySelectorAll<HTMLElement>("#brana, #prohlidka, #kontakt").forEach((el) => (el.dataset.sezona = s));
}
