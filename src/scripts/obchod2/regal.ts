/**
 * Regál: filtry podle tvaru a glazury zhasínají přihrádky, které nesedí,
 * a kliknutím se kus vezme do ruky v dialogu (stejné plátno jako ve
 * výloze). V dialogu se listuje jen mezi kusy, které svítí.
 */
import { Haiken } from "./haiken";
import { klavesy, dnoTlacitko, popisDna } from "./vyloha";
import type { KusNaPrani } from "./vyloha";
import type { Satek } from "./satek";
import { glazury } from "../../data/kurzy2";
import { glazuraPopis } from "../../data/obchod2";
import { pocetKusu } from "../../data/pocty";
import * as zvuk from "../parta2/zvuk";

const NAZVY_TVARU: Record<KusNaPrani["tvar"], string> = { bowl: "Miska", mug: "Hrnek", vase: "Váza", plate: "Talíř" };

export function regal(satek: Satek) {
  const kusy: KusNaPrani[] = JSON.parse(document.getElementById("o2-na-prani")?.textContent ?? "[]");
  const prihradky = [...document.querySelectorAll<HTMLElement>("[data-prihradka]")];
  if (!prihradky.length) return;
  const stav = document.querySelector<HTMLElement>(".o2-filtr-stav");
  let tvar = "vse";
  let glaz = "vse";

  const svitici = () => prihradky.filter((p) => !p.classList.contains("zhasnuto")).map((p) => Number(p.dataset.prihradka));

  const filtruj = () => {
    for (const p of prihradky) {
      const sedi = (tvar === "vse" || p.dataset.tvar === tvar) && (glaz === "vse" || p.dataset.glazura === glaz);
      p.classList.toggle("zhasnuto", !sedi);
      p.querySelector<HTMLButtonElement>(".o2-kus")!.tabIndex = sedi ? 0 : -1;
    }
    const n = svitici().length;
    if (stav) {
      stav.textContent =
        n === kusy.length ? `Svítí všech ${pocetKusu(n)}.` : n === 0 ? "Takový kus v regálu zrovna není. Zkus jinou glazuru." : `Svítí ${pocetKusu(n)} z ${kusy.length}.`;
    }
  };

  document.querySelectorAll<HTMLButtonElement>("[data-filtr-tvar]").forEach((b) =>
    b.addEventListener("click", () => {
      tvar = b.dataset.filtrTvar!;
      document.querySelectorAll("[data-filtr-tvar]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      zvuk.cink();
      filtruj();
    }),
  );
  document.querySelectorAll<HTMLButtonElement>("[data-filtr-glazura]").forEach((b) =>
    b.addEventListener("click", () => {
      glaz = b.dataset.filtrGlazura!;
      document.querySelectorAll("[data-filtr-glazura]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      zvuk.cink();
      filtruj();
    }),
  );

  /* ——— Dialog s kusem v ruce ——— */
  const dialog = document.querySelector<HTMLDialogElement>(".haiken-dialog");
  if (!dialog) return;
  const canvas = dialog.querySelector<HTMLCanvasElement>("[data-haiken-platno]")!;
  const obal = dialog.querySelector<HTMLElement>("[data-haiken-obal]")!;
  const stitek = dialog.querySelector<HTMLElement>(".haiken-stitek")!;
  const nazev = dialog.querySelector<HTMLElement>(".haiken-nazev")!;
  const autor = dialog.querySelector<HTMLElement>(".haiken-autor")!;
  const vzorek = dialog.querySelector<HTMLElement>(".haiken-vzorek")!;
  const glNazev = dialog.querySelector<HTMLElement>(".haiken-glazura-nazev")!;
  const glPopis = dialog.querySelector<HTMLElement>(".haiken-glazura-popis")!;
  const novinka = dialog.querySelector<HTMLElement>(".haiken-novinka")!;
  const cena = dialog.querySelector<HTMLElement>(".haiken-cena")!;
  const pridat = dialog.querySelector<HTMLButtonElement>("[data-satek-pridat]")!;
  const dnoB = dialog.querySelector<HTMLButtonElement>("[data-haiken-dno]");
  const poradi = dialog.querySelector<HTMLElement>(".haiken-poradi")!;
  let h: Haiken | null = null;
  let i = 0;

  const ukaz = (k: number) => {
    i = k;
    const kus = kusy[i];
    if (!kus || !h) return;
    h.nastav({ tvar: kus.tvar, glazura: kus.glazura, seme: kus.seme });
    const g = glazury.find((x) => x.nazev === kus.glazura.toLowerCase());
    stitek.textContent = `${NAZVY_TVARU[kus.tvar]} · na přání`;
    nazev.textContent = kus.nazev;
    autor.textContent = kus.autor;
    if (g) vzorek.style.cssText = `--g1:${g.svetlo};--g2:${g.stred};--g3:${g.stin}`;
    glNazev.textContent = kus.glazura;
    glPopis.textContent = glazuraPopis[kus.glazura.toLowerCase()] ?? "";
    novinka.hidden = !kus.novinka;
    cena.textContent = kus.cena;
    pridat.dataset.satekId = `na-prani-${kus.i}`;
    satek.obnovTlacitka();
    obal.setAttribute("aria-label", `${kus.nazev}, ${kus.glazura.toLowerCase()}. Táhni myší nebo prstem, nebo použij šipky.`);
    popisDna(dnoB, false);
    const s = svitici();
    const pos = s.indexOf(i);
    poradi.textContent = pos >= 0 ? `${pos + 1} / ${s.length}` : "";
  };
  const posun = (o: number) => {
    const s = svitici();
    if (!s.length) return;
    const pos = s.indexOf(i);
    // Otevřený kus může být zhasnutý filtrem — pak se jde na první nebo poslední svítící
    ukaz(pos < 0 ? s[o > 0 ? 0 : s.length - 1] : s[(pos + o + s.length) % s.length]);
    zvuk.drevo(1.2);
  };

  document.querySelectorAll<HTMLButtonElement>(".o2-kus").forEach((b) =>
    b.addEventListener("click", () => {
      if (!dialog.open) dialog.showModal();
      if (!h) {
        h = new Haiken(canvas, {});
        klavesy(obal, h, () => posun(-1), () => posun(1));
        dnoTlacitko(dnoB, h);
      }
      ukaz(Number(b.dataset.kus));
      zvuk.drevo();
    }),
  );
  dialog.querySelector("[data-haiken-predchozi]")?.addEventListener("click", () => posun(-1));
  dialog.querySelector("[data-haiken-dalsi]")?.addEventListener("click", () => posun(1));
  dialog.querySelectorAll<HTMLButtonElement>("[data-otoc]").forEach((b) => b.addEventListener("click", () => h?.otoc(Number(b.dataset.otoc) * 0.5)));
  dialog.querySelector(".omamori-zavrit")?.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });
  filtruj();
}
