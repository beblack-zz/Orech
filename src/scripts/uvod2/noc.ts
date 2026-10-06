/**
 * Noc: kdo dojede až ke kontaktu, dostane poslední razítko (夜).
 */
import { priMereni, priScrollu, pozice } from "../parta2/stav";
import { orazitkuj } from "./razitka";

export function noc() {
  const karta = document.querySelector<HTMLElement>(".noc-karta");
  if (!karta) return;
  let horni = 0;
  priMereni(() => {
    horni = pozice(karta).top;
  });
  priScrollu((y, vh) => {
    if (horni && y + vh * 0.6 > horni) orazitkuj("noc");
  });
}
