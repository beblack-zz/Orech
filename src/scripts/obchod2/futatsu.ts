/**
 * Vstup pro /obchod/futatsu. Obloha, hlavička, kami a šátek jsou společné
 * s krámkem, hrnek do ruky (futatsu-otoc.ts), výkres se skutečnou velikostí
 * (futatsu-vykres.ts) a noční kapitoly (futatsu-noc.ts) mají vlastní moduly.
 * Tady je úvod a co stránka potřebuje hned:
 *
 *   úvod          odraz hrnku v laku se překreslí s každým pootočením;
 *                 nápověda „vezmi ho do ruky“ zmizí, jakmile ho vezmeš
 *   rozvržení     místo pro výkres, pauzák a skutečnou velikost (a zkrácené
 *                 texty pece a stárnutí) hned, ať stránka pod rukama
 *                 neposkočí, až se kapitoly stáhnou
 *   líně          výkres a noční kapitoly se stáhnou a rozběhnou, až se
 *                 k nim člověk blíží (priblizeni.ts; kotva z obsahu hned)
 *
 * Kresby skládá components/obchod2/futatsu. Posluchače visí na obsahu
 * stránky, takže se s ním při přechodu jinam uklidí; co zaregistruje líně
 * stažený modul (přes zaStranku), uklidí prechody.ts stejně.
 */
import { stranka, zaStranku } from "../parta2/prechody";
import { spust } from "../parta2/stav";
import { initNebe } from "../parta2/nebe";
import { initKami } from "../parta2/kami";
import { hlavicka } from "../parta2/hlavicka";
import { initSatek } from "./satek";
import { initOtoc } from "./futatsu-otoc";
import { kdyzBlizko } from "./priblizeni";
import { pxNaMm, rozvrzeniListu, uzkyPauzak } from "./futatsu-miry";
import { podobizna, obrys } from "../../components/obchod2/futatsu/podobizna";
import { odrazObrys } from "../../components/obchod2/futatsu/uvod";
import { LAY, PAUZ, VEL } from "../../components/obchod2/futatsu/tvar";

stranka("futatsu", () => {
  hlavicka();
  initKami();
  initNebe();
  initSatek();
  /* Odraz poslouchá hrnek dřív, než se pohne — vstup z odvrácené strany už posílá úhly */
  const uhelHrnku = odraz();
  /* Do ruky hned jen hrnek v úvodu; v peci a v šátku se rozběhne s noční kapitolou */
  initOtoc(document.querySelector("#ft-uvod") ?? document);
  rozvrzeni();

  /* Výkres a skutečná velikost jsou jeden modul i s kresbou výkresu — stáhne se s tou kapitolou, ke které člověk dojede dřív */
  let vykres = false;
  const nactiVykres = () => {
    if (vykres) return;
    vykres = true;
    import("./futatsu-vykres")
      .then(zaStranku((m: typeof import("./futatsu-vykres")) => m.initVykres(uhelHrnku)))
      .catch((e) => console.warn("[futatsu] výkres se nepodařilo stáhnout", e));
  };
  kdyzBlizko(document.getElementById("vykres"), nactiVykres);
  kdyzBlizko(document.getElementById("origami"), nactiVykres);

  /* Noční kapitoly: jeden modul, každá kapitola (i její hrnek do ruky) se rozběhne, až se k ní blíží */
  const noc = [
    ["ohen", (m: typeof import("./futatsu-noc")) => m.initOhen()],
    ["cas", (m: typeof import("./futatsu-noc")) => m.initCas()],
    ["zaver", (m: typeof import("./futatsu-noc")) => m.initZaver()],
  ] as const;
  for (const [id, init] of noc) {
    const sekce = document.getElementById(id);
    kdyzBlizko(sekce, () => {
      import("./futatsu-noc")
        .then(
          zaStranku((m: typeof import("./futatsu-noc")) => {
            if (sekce) initOtoc(sekce);
            init(m);
          }),
        )
        .catch((e) => console.warn("[futatsu] noční kapitolu se nepodařilo stáhnout", e));
    });
  }
  spust();
});

/* ——— Úvod: odraz v laku a nápověda ——— */
function odraz(): () => number | null {
  const scena = document.querySelector<HTMLElement>(".ft-scena");
  const hrnek = scena?.querySelector<HTMLElement>("[data-futatsu-otoc]");
  const telo = scena?.querySelector<SVGGElement>(".ft-odraz-telo");
  let posledni: number | null = null;
  if (!scena || !hrnek || !telo) return () => posledni;
  const nadhled = Number(hrnek.dataset.nadhled ?? 12);
  const svetlo = hrnek.dataset.svetlo === "shora" ? "shora" : "vlevo";
  /* Celá podobizna je pro odraz nejhezčí; kdyby byla na plynulé točení pomalá,
     kreslí se při pohybu jen obrys a celá až v klidu */
  let pomala = false;
  let ceka = 0;
  let klidTimer = 0;
  let naposled = 0;
  const kresli = (cela: boolean) => {
    if (posledni === null) return;
    const t = performance.now();
    naposled = t;
    telo.innerHTML = cela || !pomala
      ? podobizna({ id: "fpo", uhel: posledni, nadhled, svetlo, stin: false })
      : odrazObrys(obrys({ uhel: posledni, nadhled }));
    if (cela) pomala = performance.now() - t > 9;
  };
  /* Odraz je slabý a rozmazaný do ztracena — při pohybu stačí každý třetí snímek */
  const snimek = (t: number) => {
    ceka = 0;
    if (t - naposled < 45) ceka = requestAnimationFrame(snimek);
    else kresli(false);
  };
  scena.addEventListener("futatsu-otoc", (e) => {
    const u = (e as CustomEvent<{ uhel?: number }>).detail?.uhel;
    if (typeof u !== "number" || !Number.isFinite(u)) return;
    posledni = u;
    if (!ceka) ceka = requestAnimationFrame(snimek);
    window.clearTimeout(klidTimer);
    klidTimer = window.setTimeout(() => kresli(true), 160);
  });
  /* V HTML je v laku jen obrys — celý odraz hned, ještě než se hrnek pohne */
  posledni = Number(hrnek.dataset.uhel ?? 62);
  kresli(true);
  /* Kdo ho jednou vezme do ruky, nápovědu už nepotřebuje */
  const vzal = () => scena.classList.add("vzal");
  hrnek.addEventListener("pointerdown", vzal);
  hrnek.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") vzal();
  });
  /* Snímek a časovač po odchodu ze stránky nedoběhnou — uklidí je prechody.ts */
  return () => posledni;
}

/* ——— Rozvržení hned: výkres, skutečná velikost a noční texty zaberou místo, než se stáhnou ——— */
function rozvrzeni() {
  /* List výkresu na úzké obrazovce je na výšku (skoro čtyřikrát vyšší) — místo podle rozměrů z tvar.ts, kreslí ho futatsu-vykres.ts */
  const list = document.querySelector<HTMLElement>("#dv-list");
  if (list) {
    const lay = rozvrzeniListu(list.clientWidth);
    if (lay !== list.dataset.lay) list.style.aspectRatio = `${LAY[lay].W} / ${LAY[lay].H}`;
  }
  const pauz = document.querySelector<HTMLElement>("#dv-pauz");
  if (pauz) {
    const u = uzkyPauzak(pauz.clientWidth);
    const p = PAUZ[u ? "uzky" : "siroky"];
    if (u !== (pauz.dataset.uzky === "1")) pauz.style.aspectRatio = `${p.W} / ${p.H}`;
  }
  /* Skutečná velikost: kresba v HTML je natočená stejně, jen dostane rozměr v milimetrech podle karty */
  const obal = document.querySelector<HTMLElement>("#skut-obal");
  const svg = obal?.firstElementChild as SVGSVGElement | null | undefined;
  if (obal && svg) {
    const { pxmm } = pxNaMm();
    const w = VEL.W * pxmm;
    svg.style.width = `${w}px`;
    svg.style.height = `${VEL.H * pxmm}px`;
    const pozn = document.querySelector<HTMLElement>("#skut-pozn");
    if (pozn) pozn.hidden = !obal.clientWidth || obal.clientWidth >= w - 1;
  }
  /* Pec a stárnutí se skriptem ukazují jen text zastavení, kde zrovna jsou (v HTML má .ted první) — zkrátit hned */
  document.querySelectorAll("#ohen[data-ohen], #cas[data-cas]").forEach((s) => s.classList.add("s-js"));
}
