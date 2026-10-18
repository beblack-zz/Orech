/**
 * Vstup pro /kontakt. Obloha, hlavička a klikací kami jsou společné
 * s ostatními stránkami nového vzhledu; provázkový telefon je v scena.ts,
 * ústředna uvnitř dílny v uvnitr.ts (samostatný kousek, načítá ho scena.ts).
 *
 * Hned běží jen první obrazovka. Louka pod ní — pásy trávy (louka.ts),
 * stojan ema s otázkami (ema.ts), vývěska s mapou a táhlem kresby a fotky
 * domu (kudy.ts) a šňůra (snura.ts) — je samostatný kousek dole.ts:
 * načte se, až se k louce blíží scroll, a hned, když odkaz skočí na kotvu
 * v ní (#kudy, #otazky — z adresy i z tlačítek na první obrazovce).
 */
import { stranka, zaStranku } from "../parta2/prechody";
import { naObrazovce } from "../parta2/mimo";
import { spust } from "../parta2/stav";
import { initNebe } from "../parta2/nebe";
import { initKami } from "../parta2/kami";
import { hlavicka } from "../parta2/hlavicka";
import { scena } from "./scena";

/**
 * O kolik dřív než louka vjede do obrazovky se má načíst — ať je hotová, než
 * na ni člověk dojede. Louka začíná hned pod první obrazovkou, takže se s tímhle
 * předstihem v praxi načte hned po ní: v dalším kroku, ne v počátečním skriptu.
 */
const PREDSTIH = "1200px 0px";

/** Hlídá louku a vrací funkci, která ji načte hned; načte se jednou za návštěvu stránky */
function louka(): () => void {
  const dole = document.querySelector<HTMLElement>(".ko-dole");
  if (!dole) return () => {};
  let nacteno = false;
  let nehlidej = () => {};
  const nacti = () => {
    if (nacteno) return;
    nacteno = true;
    nehlidej();
    /* po importu už kód stránce nepatří — zaStranku vrátí posluchače a observery louky stránce;
       když se nenačte (bez sítě), zůstane louka bez her a zkusí se znovu při skoku na kotvu */
    void import("./dole").then(
      zaStranku((m: typeof import("./dole")) => m.dole()),
      () => {
        nacteno = false;
      },
    );
  };
  nehlidej = naObrazovce(dole, (videt) => videt && nacti(), PREDSTIH);
  /* kotva v adrese: příchod na /kontakt#kudy, nebo odkaz na stránce */
  const kotva = () => {
    let id = window.location.hash.slice(1);
    try {
      id = decodeURIComponent(id);
    } catch {
      /* rozbitá kotva — zkusí se, jak je */
    }
    if (id && dole.contains(document.getElementById(id))) nacti();
  };
  kotva();
  window.addEventListener("hashchange", kotva);
  return nacti;
}

stranka("kontakt", () => {
  hlavicka();
  initKami();
  initNebe();
  const naLouku = louka();
  scena({ naLouku });
  spust();
});
