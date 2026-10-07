/**
 * Noc — na poličce pod lucernou tvůj kus s cedulkou. Dokud žádný nemáš,
 * je tam volné místo a nadpis tě na něj zve.
 */
import { kusSvg } from "../../components/dilna/kus";
import { tvujKus, priZmeneKusu } from "./stav-kusu";
import type { Ulozeny } from "./stav-kusu";

export function noc() {
  const polic = document.querySelector<HTMLElement>("[data-noc-kus]");
  if (!polic) return;
  const obr = polic.querySelector<HTMLElement>(".d-noc-kus")!;
  const jmeno = polic.querySelector<HTMLElement>(".d-noc-jmeno")!;
  const nadpis = document.querySelector<HTMLElement>("#noc-nadpis");

  const ukaz = (u: Ulozeny | null) => {
    polic.classList.toggle("tvuj", !!u);
    if (!u) {
      obr.innerHTML = "";
      jmeno.textContent = "volné místo";
      if (nadpis) nadpis.textContent = "Na polici je pro tebe místo.";
      return;
    }
    obr.innerHTML = kusSvg(u.kus, u.stav === "hotovy" ? "hotovy" : "suchy", { id: "noc-kus", stekla: u.stekla });
    jmeno.textContent = u.kus.jmeno || u.kus.nazev;
    if (nadpis) nadpis.textContent = u.stav === "hotovy" ? "Tvůj kus počká do rána." : "Tvůj kus schne. Počká na glazuru.";
  };
  priZmeneKusu(ukaz);
  ukaz(tvujKus());
}
