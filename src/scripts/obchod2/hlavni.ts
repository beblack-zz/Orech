/**
 * Vstup pro /obchod. Obloha, hlavička, zvuky a klikací kami jsou
 * společné s ostatními stránkami nového vzhledu, zbytek je vlastní
 * obchodu: krámek s kamerou a stmíváním, detail kusu a šátek.
 *
 * Hned se spouští jen to, co je vidět nahoře a co musí fungovat odkudkoli
 * (krámek, detail kusu, košík šátku). Futatsu do ruky v zadní místnosti
 * a látka šátku ve 3D se stáhnou, až se k nim člověk blíží (priblizeni.ts).
 */
import { stranka, zaStranku } from "../parta2/prechody";
import { spust } from "../parta2/stav";
import { initNebe } from "../parta2/nebe";
import { initKami } from "../parta2/kami";
import { hlavicka } from "../parta2/hlavicka";
import { sezonaMesice } from "../../data/uvod2";
import { initSatek } from "./satek";
import { kramek } from "./kramek";
import { scena } from "./scena";
import { initPodpis } from "./podpis";
import { kdyzBlizko } from "./priblizeni";
import { schovej } from "../parta2/sber";

/* Celé se to spustí při každé návštěvě stránky, i po přechodu bez načtení (prechody.ts) */
stranka("obchod-2", () => {
  hlavicka();
  initKami();
  /* Scéna dřív než obloha: měří výšku sekce a přepisuje její data-hodina,
     obloha pak v témže snímku čte už novou hodinu */
  scena();
  initNebe();
  /* Strom za domem má období podle dneška — do statické stránky se zapsalo při buildu */
  document.querySelectorAll<HTMLElement>(".krm-scena").forEach((el) => (el.dataset.sezona = sezonaMesice(new Date().getMonth() + 1)));
  const satek = initSatek();
  kramek(satek);
  /* Zadní místnost: Futatsu v tokonomě jde vzít do ruky — kresba hrnku a otáčení se stáhnou,
     až se místnost blíží; kdo na hrnek už kouká (skok na #podpis), tomu se neotočí zády */
  const podpis = document.getElementById("podpis");
  kdyzBlizko(podpis, () => {
    import("./futatsu-otoc")
      .then(zaStranku((m: typeof import("./futatsu-otoc")) => m.initOtoc(podpis ?? document, { vstupJenMimo: true })))
      .catch((e) => console.warn("[obchod] hrnek do ruky se nepodařilo stáhnout", e));
  });
  initPodpis();
  /* Střípek schovaný v hodinách krámku — hra na hledání kami */
  document.querySelectorAll<HTMLElement>(".o2k-hodiny [data-skryty]").forEach(schovej);
  spust();
});
