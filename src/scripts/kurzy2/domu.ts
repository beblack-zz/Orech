/**
 * Cesta domů: miska jede po trati podle toho, kolik ze sekce je vidět,
 * a cestou se mění — mokrá hlína, suchá, přežah, glazura, hotovo.
 */
import { omez, pozice, priMereni, priScrollu } from "../parta2/stav";

/** Barva misky v jednotlivých krocích: [tělo, okraj] */
const BARVY: [string, string][] = [
  ["#9C7860", "#7E5E4A"],
  ["#C9B49C", "#A8927A"],
  ["#E3C9B0", "#C9A88A"],
  ["#93B39B", "#5E7C68"],
  ["#7FA08A", "#4E6A58"],
  ["#7FA08A", "#4E6A58"],
];

export function domu() {
  const koren = document.querySelector<HTMLElement>("[data-domu]");
  if (!koren) return;
  const kroky = [...koren.querySelectorAll<HTMLElement>(".domu-krok")];
  let top = 0;
  let vyska = 0;
  let minule = -1;
  priMereni(() => {
    const p = pozice(koren);
    top = p.top;
    vyska = p.height;
  });
  priScrollu((y, vh) => {
    if (!vyska) return;
    const p = omez((y + vh * 0.7 - top) / (vyska + vh * 0.15));
    koren.style.setProperty("--domu", p.toFixed(3));
    const k = Math.min(kroky.length - 1, Math.floor(p * kroky.length));
    if (k === minule) return;
    minule = k;
    kroky.forEach((el, i) => el.classList.toggle("je", i <= k));
    koren.style.setProperty("--miska-telo", BARVY[k][0]);
    koren.style.setProperty("--miska-okraj", BARVY[k][1]);
  });
}
