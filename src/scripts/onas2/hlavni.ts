/**
 * Vstup pro /o-nas-2. Obloha, hlavička, zvuky a klikací kami jsou
 * společné s ostatními stránkami nového vzhledu; zlato obsluhuje obecná
 * sbírka (parta2/sbirka.ts), zbytek je vlastní O nás.
 * Rok dílny jede na stejném skriptu jako na Úvodu 2 (uvod2/rok.ts).
 */
import { stranka } from "../parta2/prechody";
import { spust } from "../parta2/stav";
import { initNebe } from "../parta2/nebe";
import { initKami } from "../parta2/kami";
import { hlavicka } from "../parta2/hlavicka";
import { initSbirka } from "../parta2/sbirka";
import { zlato } from "../../data/onas2";
import { rok } from "../uvod2/rok";
import { schovej } from "../parta2/sber";
import { pocatek } from "./pocatek";
import { rukopisy } from "./rukopisy";
import { enso } from "./enso";
import { kintsugi } from "./kintsugi";
import { foto } from "./foto";

/* Celé se to spustí při každé návštěvě stránky, i po přechodu bez načtení (prechody.ts) */
stranka("o-nas-2", () => {
  hlavicka();
  initKami();
  initNebe();
  rok();
  /* Kapka schovaná na opěradle židle v roce dílny — hra na hledání kami */
  document.querySelectorAll<HTMLElement>(".rez-rok [data-skryty]").forEach(schovej);
  const prekresliMisku = kintsugi();
  initSbirka({
    klic: "onas2-zlato",
    ids: zlato.map((z) => z.id),
    nazev: (id) => zlato.find((z) => z.id === id)?.nazev ?? "Šupinka zlata",
    popisTlacitka: (n, c) => `Zlato na kintsugi: nalezeno ${n} z ${c} šupinek`,
    oznameni: (n, c) => (n === c ? " · zlato je celé! Miska čeká dole." : ` · ${n} z ${c}`),
    celaTrida: "je-vse-zlato",
    obrazek: (_, el) => el?.querySelector("svg")?.cloneNode(true) as Element | null,
    poZmene: (mam) => {
      document.querySelectorAll<SVGPathElement>(".zlato-spara").forEach((s) => {
        const i = Number(s.dataset.spara);
        s.classList.toggle("je", mam.has(zlato[i]?.id ?? ""));
      });
      prekresliMisku(mam);
    },
    oslava: {
      nadpis: "Všech devět šupinek!",
      text: "Střípek má zlata dost. Dole u misky můžeš spáry zalít — prasklina se neschovává, stane se tou nejhezčí částí.",
    },
  });
  /* „K roku dílny“ v sešitě zlata: zavřít dialog, odkaz pak dojede sám */
  document.querySelector("[data-zlato-k-roku]")?.addEventListener("click", () => {
    document.querySelector<HTMLDialogElement>("[data-sbirka-dialog]")?.close();
  });
  pocatek();
  rukopisy();
  enso();
  foto();
  spust();
});
