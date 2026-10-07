/**
 * Tokonoma: na prkně stojí jeden kus naší tvorby a pomalu se otáčí, na
 * svitku je jeho jméno znakem. Šipkami a tečkami se střídají kusy.
 */
import { Haiken } from "./haiken";
import { klavesy, dnoTlacitko, popisDna } from "./vyloha";
import * as zvuk from "../parta2/zvuk";

interface KusTvorba {
  i: number;
  nazev: string;
  tvar: "bowl" | "vase" | "mug" | "plate";
  glazura: string;
  autor: string;
  mei: { znak: string; cteni: string } | null;
  seme: number;
}

export function tokonoma() {
  const koren = document.querySelector<HTMLElement>(".o2-tokonoma-sekce");
  const kusy: KusTvorba[] = JSON.parse(document.getElementById("o2-tvorba")?.textContent ?? "[]");
  if (!koren || !kusy.length) return;
  const canvas = koren.querySelector<HTMLCanvasElement>("[data-tokonoma-platno]")!;
  const obal = koren.querySelector<HTMLElement>("[data-tokonoma-obal]")!;
  const svitek = koren.querySelector<HTMLElement>(".o2-kakejiku")!;
  const znak = koren.querySelector<HTMLElement>(".o2-mei")!;
  const cteni = koren.querySelector<HTMLElement>(".o2-mei-cteni")!;
  const nazev = koren.querySelector<HTMLElement>(".o2-mei-nazev")!;
  const meta = koren.querySelector<HTMLElement>(".o2-mei-meta")!;
  const tecky = [...koren.querySelectorAll<HTMLButtonElement>("[data-tokonoma-kus]")];
  const dnoB = koren.querySelector<HTMLButtonElement>("[data-tokonoma-dno]");

  koren.classList.add("ma-3d");
  const h = new Haiken(canvas, { auto: true, pata: 0.92 });
  let i = 0;

  const ukaz = (k: number, zvukem = false) => {
    i = (k + kusy.length) % kusy.length;
    const kus = kusy[i];
    h.nastav({ tvar: kus.tvar, glazura: kus.glazura, seme: kus.seme });
    svitek.classList.remove("meni");
    void svitek.offsetWidth;
    svitek.classList.add("meni");
    znak.textContent = kus.mei?.znak ?? "";
    cteni.textContent = kus.mei?.cteni ?? "";
    nazev.textContent = kus.nazev;
    meta.textContent = "";
    meta.append(`${kus.autor} · ${kus.glazura}`);
    if (kus.mei) {
      meta.append(" · jméno na svitku ");
      const s = document.createElement("span");
      s.lang = "ja";
      s.textContent = kus.mei.znak;
      meta.append(s, ` ${kus.mei.cteni}`);
    }
    tecky.forEach((t, j) => (j === i ? t.setAttribute("aria-current", "true") : t.removeAttribute("aria-current")));
    obal.setAttribute("aria-label", `${kus.nazev}, ${kus.glazura.toLowerCase()}. Táhni myší nebo prstem, nebo použij šipky.`);
    popisDna(dnoB, false);
    if (zvukem) zvuk.papir();
  };

  koren.querySelector("[data-tokonoma-predchozi]")?.addEventListener("click", () => ukaz(i - 1, true));
  koren.querySelector("[data-tokonoma-dalsi]")?.addEventListener("click", () => ukaz(i + 1, true));
  tecky.forEach((t) => t.addEventListener("click", () => ukaz(Number(t.dataset.tokonomaKus), true)));
  dnoTlacitko(dnoB, h);
  klavesy(obal, h, () => ukaz(i - 1, true), () => ukaz(i + 1, true));
  ukaz(0);
}
