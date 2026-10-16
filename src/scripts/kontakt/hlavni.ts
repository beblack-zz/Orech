/**
 * Vstup pro /kontakt. Obloha, hlavička a klikací kami jsou společné
 * s ostatními stránkami nového vzhledu. Kresba a fotka přes sebe (táhla
 * a sakura během roku) má svůj skript z Domku 2; krajině Kudy k nám se
 * tu srovná roční období podle dneška.
 */
import { stranka } from "../parta2/prechody";
import { spust } from "../parta2/stav";
import { initNebe } from "../parta2/nebe";
import { initKami } from "../parta2/kami";
import { hlavicka } from "../parta2/hlavicka";
import { sezonaMesice } from "../../data/uvod2";
import { porovnani } from "../domek2/porovnani";

stranka("kontakt", () => {
  hlavicka();
  initKami();
  const kudy = document.querySelector<HTMLElement>("#kudy");
  if (kudy) kudy.dataset.sezona = sezonaMesice(new Date().getMonth() + 1);
  initNebe();
  porovnani();
  spust();
});
