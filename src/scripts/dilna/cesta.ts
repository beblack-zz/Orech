/**
 * Jak to chodí — kus na poličce se mění podle kroku, který je zrovna
 * u čtecí výšky obrazovky: hrouda, mokrá hlína, suchý, po přežahu,
 * v syrové glazuře, hotový. Je to tvůj kus (i se jménem na cedulce),
 * nebo naše miska, dokud si žádný neuděláš. Když je tvůj kus už
 * vypálený, má na cestě i svou glazuru.
 */
import { priMereni, priScrollu, pozice } from "../parta2/stav";
import { kusSvg, vychoziKus } from "../../components/dilna/kus";
import type { Kus } from "../../components/dilna/kus";
import type { StavKusu } from "../../data/dilna";
import { tvujKus, priZmeneKusu } from "./stav-kusu";
import type { Ulozeny } from "./stav-kusu";

const NAZVY: Record<StavKusu, string> = {
  hrouda: "hrouda",
  mokry: "mokrá hlína",
  suchy: "suchý",
  prezah: "po přežahu",
  glazovany: "syrová glazura",
  hotovy: "hotovo",
};

/** Naše miska dostane na cestě celadon, ať je vidět, co dělá pec */
const ukazkovy = (): Kus => ({ ...vychoziKus(), glazury: [{ g: "celadon", kde: "cely" }], dno: true });

export function cesta() {
  const polic = document.querySelector<HTMLElement>("[data-cesta-kus]");
  if (!polic) return;
  const obr = polic.querySelector<HTMLElement>(".d-cesta-kus")!;
  const jmeno = polic.querySelector<HTMLElement>(".d-cesta-jmeno")!;
  const stavEl = polic.querySelector<HTMLElement>(".d-cesta-stav")!;
  const kroky = [...document.querySelectorAll<HTMLElement>(".d-krok")];
  let tops: number[] = [];
  let aktivni = -1;
  let kus: Kus = ukazkovy();
  let stekla = false;

  const nacti = (u: Ulozeny | null) => {
    if (u) {
      kus = JSON.parse(JSON.stringify(u.kus)) as Kus;
      /* Ještě neglazovaný kus dostane na cestě aspoň ukázkovou glazuru */
      if (u.stav !== "hotovy" || !kus.glazury.length) {
        kus.glazury = [{ g: "celadon", kde: "cely" }];
        kus.dno = true;
      }
      stekla = !!u.stekla;
      jmeno.textContent = u.kus.jmeno ? u.kus.jmeno : "tvůj kus";
    } else {
      kus = ukazkovy();
      stekla = false;
      jmeno.textContent = "naše miska";
    }
    polic.classList.toggle("tvuj", !!u);
    const a = aktivni;
    aktivni = -1;
    ukaz(Math.max(0, a));
  };

  const ukaz = (i: number) => {
    if (i === aktivni) return;
    aktivni = i;
    kroky.forEach((k, j) => {
      k.classList.toggle("je", j <= i);
      k.classList.toggle("ted", j === i);
    });
    const s = (kroky[i]?.dataset.stav ?? "hrouda") as StavKusu;
    obr.innerHTML = kusSvg(kus, s, { id: "cesta-kus", stekla: s === "hotovy" && stekla });
    stavEl.textContent = NAZVY[s];
    polic.dataset.stav = s;
  };

  priMereni(() => {
    tops = kroky.map((k) => pozice(k).top);
  });
  priScrollu((y, vh) => {
    if (!tops.length) return;
    const cteni = y + vh * 0.55;
    let i = 0;
    while (i < tops.length - 1 && tops[i + 1] <= cteni) i++;
    ukaz(i);
  });

  priZmeneKusu(nacti);
  nacti(tvujKus());
}
