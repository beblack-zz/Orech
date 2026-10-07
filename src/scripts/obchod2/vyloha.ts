/**
 * Výloha: jeden kus z regálu na prkénku, dá se vzít do ruky (haiken.ts).
 * Šipkami se přepíná na další kusy, cenovka a „Do šátku“ jdou s ním.
 */
import { Haiken } from "./haiken";
import type { Satek } from "./satek";
import * as zvuk from "../parta2/zvuk";

export interface KusNaPrani {
  i: number;
  nazev: string;
  cena: string;
  tvar: "bowl" | "vase" | "mug" | "plate";
  glazura: string;
  autor: string;
  novinka: boolean;
  seme: number;
}

/** Klávesy na plátně: šipky otáčí a naklání, PageUp/PageDown přepínají */
export function klavesy(obal: HTMLElement, h: Haiken, predchozi?: () => void, dalsi?: () => void) {
  obal.addEventListener("keydown", (e) => {
    const k = e.key;
    if (k === "ArrowLeft") h.otoc(-0.26);
    else if (k === "ArrowRight") h.otoc(0.26);
    else if (k === "ArrowUp") h.naklon(0.15);
    else if (k === "ArrowDown") h.naklon(-0.15);
    else if (k === "PageUp" && predchozi) predchozi();
    else if (k === "PageDown" && dalsi) dalsi();
    else return;
    e.preventDefault();
  });
}

/** Popisek tlačítka podle toho, jestli je kus dnem nahoru */
export const popisDna = (b: HTMLButtonElement | null, dnem: boolean) => {
  if (b) b.textContent = dnem ? "Postavit zpátky" : "Ukázat dno";
};

/** Tlačítko „Ukázat dno“ — obrátí kus a podruhé ho postaví zpátky */
export function dnoTlacitko(b: HTMLButtonElement | null, h: Haiken) {
  b?.addEventListener("click", () => {
    const dnem = h.dno();
    popisDna(b, dnem);
    zvuk.drevo(dnem ? 0.75 : 0.95);
  });
  // Kdo kus obrátí rukou, tomu se popisek srovná po puštění
  h.canvas.addEventListener("pointerup", () => popisDna(b, h.jeDnem()));
}

export function vyloha(satek: Satek) {
  const stojan = document.querySelector<HTMLElement>("[data-haiken-stojan]");
  if (!stojan) return;
  const kusy: KusNaPrani[] = JSON.parse(document.getElementById("o2-na-prani")?.textContent ?? "[]");
  if (!kusy.length) return;
  const canvas = stojan.querySelector<HTMLCanvasElement>("[data-haiken-platno]")!;
  const obal = stojan.querySelector<HTMLElement>("[data-haiken-obal]")!;
  const nazev = stojan.querySelector<HTMLElement>(".o2-cenovka-nazev")!;
  const glazura = stojan.querySelector<HTMLElement>(".o2-cenovka-glazura")!;
  const cena = stojan.querySelector<HTMLElement>(".o2-cenovka-cena")!;
  const novinka = stojan.querySelector<HTMLElement>(".o2-cenovka-novinka");
  const cenovka = stojan.querySelector<HTMLElement>(".o2-cenovka")!;
  const pridat = stojan.querySelector<HTMLButtonElement>("[data-satek-pridat]")!;
  const dnoB = stojan.querySelector<HTMLButtonElement>("[data-haiken-dno]");
  const pocitadlo = stojan.querySelector<HTMLElement>(".o2-pocitadlo b");

  stojan.classList.add("ma-3d");
  const h = new Haiken(canvas, { auto: true, pata: 0.9 });
  // Začíná se lesklou glazurou — na ní je nejlíp vidět, že se kus točí
  let i = Math.max(0, kusy.findIndex((k) => ["celadon", "tenmoku"].includes(k.glazura.toLowerCase())));

  const ukaz = (k: number, smer = 0) => {
    i = (k + kusy.length) % kusy.length;
    const kus = kusy[i];
    h.nastav({ tvar: kus.tvar, glazura: kus.glazura, seme: kus.seme });
    nazev.textContent = kus.nazev;
    glazura.textContent = kus.glazura;
    cena.textContent = kus.cena;
    if (novinka) novinka.hidden = !kus.novinka;
    pridat.dataset.satekId = `na-prani-${kus.i}`;
    satek.obnovTlacitka();
    obal.setAttribute("aria-label", `${kus.nazev}, ${kus.glazura.toLowerCase()}, ${kus.cena}. Táhni myší nebo prstem, nebo použij šipky.`);
    popisDna(dnoB, false);
    if (pocitadlo) pocitadlo.textContent = String(i + 1);
    if (smer) {
      cenovka.classList.remove("houpe");
      void cenovka.offsetWidth;
      cenovka.classList.add("houpe");
      zvuk.drevo(1.2);
    }
  };

  stojan.querySelector("[data-haiken-predchozi]")?.addEventListener("click", () => ukaz(i - 1, -1));
  stojan.querySelector("[data-haiken-dalsi]")?.addEventListener("click", () => ukaz(i + 1, 1));
  dnoTlacitko(dnoB, h);
  klavesy(obal, h, () => ukaz(i - 1, -1), () => ukaz(i + 1, 1));
  ukaz(i);
}
