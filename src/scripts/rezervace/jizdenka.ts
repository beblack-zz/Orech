/**
 * Jízdenka (components/rezervace/Jizdenka.astro): údaje, obrázek s vláčkem
 * a označení.
 *
 * Vláček má vůz na každou vybranou hodinu, na cedulce vozu je ta hodina
 * a v oknech sedí tvoje skupina — hodina se zamlouvá celá, takže nikdo
 * cizí s vámi nejede. Obloha obrázku je obloha první vybrané hodiny. Když se
 * vybere první hodina, vláček přijede; s další hodinou se připojí vůz
 * a vláček sebou trhne. Výřez obrázku se přizpůsobí délce vlaku, ať je
 * vidět celý.
 *
 * Kde vláček je, říká proměnná --l-x na obrázku; dědí ji vlak i jeho
 * odraz (<use>), takže jedou spolu.
 */
import { vlak, delka } from "../../components/rezervace/vlak";
import type { Misto } from "../../components/rezervace/vlak";
import { paleta } from "../parta2/paleta";
import { klid, omez, mix, mixBarva } from "../parta2/stav";
import * as zvuk from "../parta2/zvuk";
import type { Den } from "./simulace";

export const BARVY_LIDI = ["#9C7860", "#D79A94", "#93B39B", "#E8B440"];
const DNY = ["neděle", "pondělí", "úterý", "středa", "čtvrtek", "pátek", "sobota"];
const MESICE_2 = ["ledna", "února", "března", "dubna", "května", "června", "července", "srpna", "září", "října", "listopadu", "prosince"];
const dvoj = (n: number) => String(n).padStart(2, "0");
const kc = (n: number) => `${n.toLocaleString("cs-CZ")} Kč`;
const lidi = (n: number) => (n === 1 ? "1 člověk" : `${n} lidi`);
const hodin = (n: number) => (n === 1 ? "1 hodina" : n >= 2 && n <= 4 ? `${n} hodiny` : `${n} hodin`);

/** Poměr stran obrázku — stejný jako aspect-ratio v rezervace.css */
const POMER = 2.5;
const naJaro = (t: number) => 1 - Math.pow(1 - t, 3);
const rozjezd = (t: number) => t * t;

/** Hodiny po sobě se slijí do jednoho úseku: 9:00–11:00, 14:00–15:00 */
export const useky = (hodiny: number[]) => {
  const out: [number, number][] = [];
  for (const x of [...hodiny].sort((a, b) => a - b)) {
    const p = out[out.length - 1];
    if (p && p[1] === x) p[1] = x + 1;
    else out.push([x, x + 1]);
  }
  return out.map(([a, b]) => `${a}:00–${b}:00`).join(", ");
};

/** Odjezdová melodie (発車メロディ) — japonská nádraží hrají před odjezdem krátkou znělku */
const melodie = () =>
  [1318.5, 1568, 1760, 2349.3, 1975.5, 1760, 1568, 1975.5].forEach((f, i) => window.setTimeout(() => zvuk.furin(f, 0.09), i * 150));

export interface UdajeJizdenky {
  den?: Den;
  hodiny: number[];
  osob: number;
  cena: number;
}

export function initJizdenka() {
  const koren = document.querySelector<HTMLElement>(".rz-listek");
  const scena = koren?.querySelector<SVGSVGElement>(".rz-listek-scena");
  const vlakG = scena?.querySelector<SVGGElement>(".rz-l-vlak");
  if (!koren || !scena || !vlakG) return null;
  const obraz = koren.querySelector<HTMLElement>(".rz-listek-obraz")!;
  const prazdno = koren.querySelector<HTMLElement>(".rz-listek-prazdno")!;
  const slunce = scena.querySelector<SVGCircleElement>(".rz-l-slunce")!;
  const nebeG = scena.querySelector<SVGLinearGradientElement>("#rz-l-nebe");
  const moreG = scena.querySelector<SVGLinearGradientElement>("#rz-l-more");
  const cislo = koren.querySelector<HTMLElement>(".rz-listek-cislo b")!;
  const lDen = koren.querySelector<HTMLElement>(".rz-l-den")!;
  const lHodiny = koren.querySelector<HTMLElement>(".rz-l-hodiny")!;
  const lLide = koren.querySelector<HTMLElement>(".rz-l-lide")!;
  const lCena = koren.querySelector<HTMLElement>(".rz-l-cena")!;

  let pocet = 0;
  let W = 960;
  let x = 0;
  let animace = 0;
  let cekaPrijezd = false;
  let videt = false;

  const posun = (nove: number) => {
    x = nove;
    scena.style.setProperty("--l-x", x.toFixed(1));
  };
  /**
   * Plynule z jednoho místa na druhé; s omezeným pohybem rovnou. Zpětné
   * volání, ne Promise — kód po await už by po přechodu na jinou stránku
   * nepatřil téhle (parta2/prechody.ts) a nevypnul by se.
   */
  const jed = (od: number, kam: number, doba: number, prubeh: (t: number) => number, potom?: () => void) => {
    cancelAnimationFrame(animace);
    if (klid || doba <= 0) {
      posun(kam);
      potom?.();
      return;
    }
    const start = performance.now();
    const krok = (t: number) => {
      const p = omez((t - start) / doba);
      posun(mix(od, kam, prubeh(p)));
      if (p < 1) animace = requestAnimationFrame(krok);
      else potom?.();
    };
    animace = requestAnimationFrame(krok);
  };

  const prijed = () => {
    cekaPrijezd = false;
    if (!pocet) return;
    jed(-W, 0, 1500, naJaro, () => zvuk.drevo(0.6));
  };

  new IntersectionObserver(([e]) => {
    videt = e.isIntersecting;
    if (videt && cekaPrijezd) prijed();
  }, { threshold: 0.35 }).observe(obraz);

  /** Obloha obrázku podle hodiny */
  const nebe = (h: number) => {
    const p = paleta(h + 0.5);
    const [a, b, c] = p.barvy;
    scena.style.setProperty("--l-nebe-a", a);
    scena.style.setProperty("--l-nebe-b", b);
    scena.style.setProperty("--l-nebe-c", c);
    scena.style.setProperty("--vl-sklo", mixBarva(c, "#EFE4E4", 0.42));
    scena.style.setProperty("--vl-sedadla", mixBarva(b, "#5E4A56", 0.62));
    scena.style.setProperty("--vl-noc", p.hvezdy.toFixed(2));
    return h;
  };

  const vyrez = (n: number) => {
    const L = delka(Math.max(1, n));
    let w = L + 440;
    let hgt = w / POMER;
    if (hgt < 440) {
      hgt = 440;
      w = hgt * POMER;
    }
    W = w;
    const y0 = -hgt * 0.64;
    scena.setAttribute("viewBox", `${((L - w) / 2).toFixed(1)} ${y0.toFixed(1)} ${w.toFixed(1)} ${hgt.toFixed(1)}`);
    scena.style.setProperty("--l-w", w.toFixed(1));
    /* Přechod oblohy od horního okraje výřezu k obzoru, moře od obzoru dolů — nad a pod tím barva pokračuje */
    nebeG?.setAttribute("y1", y0.toFixed(1));
    nebeG?.setAttribute("y2", "-14");
    moreG?.setAttribute("y1", "-14");
    moreG?.setAttribute("y2", (y0 + hgt).toFixed(1));
    return { L, w, hgt };
  };

  return {
    obnov(u: UdajeJizdenky, zmenaVybrane: boolean) {
      const hodiny = [...u.hodiny].sort((a, b) => a - b);
      const n = hodiny.length;
      const d = u.den;

      /* Údaje */
      lDen.textContent = d ? `${DNY[d.datum.getDay()]} ${d.datum.getDate()}. ${MESICE_2[d.datum.getMonth()]} ${d.datum.getFullYear()}` : "ještě nevybraný";
      lHodiny.textContent = n ? `${useky(hodiny)} · ${hodin(n)}` : "ještě nevybraný";
      lLide.textContent = lidi(u.osob);
      lCena.textContent = n ? `${kc(n * u.osob * u.cena)} · ${hodin(n)} × ${lidi(u.osob)} × ${kc(u.cena)}` : `${kc(u.cena)} za člověka a hodinu`;
      cislo.textContent = d && n ? `${dvoj(d.datum.getDate())}${dvoj(d.datum.getMonth() + 1)}·${dvoj(hodiny[0])}·${u.osob}` : "—";
      koren.classList.toggle("je-vyplnena", !!d && n > 0);

      /* Obrázek */
      const { L, w, hgt } = vyrez(n);
      const h0 = nebe(hodiny[0] ?? 10);
      const t = omez((h0 + 0.5 - 5.3) / (20.4 - 5.3));
      slunce.setAttribute("cx", ((L - w) / 2 + w * (0.12 + 0.76 * t)).toFixed(1));
      slunce.setAttribute("cy", (-hgt * 0.64 * Math.sin(Math.PI * t) * 0.78 - 8).toFixed(1));
      slunce.setAttribute("r", (hgt * 0.2).toFixed(1));

      /* Vůz je celý váš — skupina sedí uprostřed, zbytek oken je prázdný */
      const mista: Misto[] = Array(6).fill(null);
      [2, 3, 1, 4].slice(0, u.osob).forEach((m, k) => (mista[m] = { kdo: "ty", barva: BARVY_LIDI[k] }));
      const vozy = hodiny.map((h) => ({ cislo: `${h}`, mista }));
      vlakG.innerHTML = n ? vlak(vozy, { smer: 1 }) : "";
      prazdno.hidden = n > 0;

      const bylo = pocet;
      pocet = n;
      koren.classList.remove("oznacena");
      if (!n) {
        cancelAnimationFrame(animace);
        posun(0);
        return;
      }
      if (!zmenaVybrane) return;
      if (bylo === 0) {
        if (klid) return posun(0);
        posun(-W);
        if (videt) prijed();
        else cekaPrijezd = true;
      } else if (bylo !== n && videt) {
        /* Připojil se nebo odpojil vůz — vláček sebou trhne */
        jed(bylo < n ? -26 : 18, 0, 420, naJaro);
        zvuk.drevo(bylo < n ? 0.7 : 0.55);
      }
    },

    /** Průvodčí označí jízdenku: cvak, razítko, melodie a vláček odjede */
    oznac() {
      koren.classList.remove("oznacena");
      void koren.offsetWidth;
      koren.classList.add("oznacena");
      zvuk.spoust();
      window.setTimeout(() => zvuk.razitko(), 260);
      window.setTimeout(melodie, 480);
      if (klid) return;
      window.setTimeout(() => {
        jed(0, W * 1.1, 1500, rozjezd, () => {
          /* Za chvíli přijede další — jízdenka zůstane označená */
          window.setTimeout(() => {
            if (!pocet) return;
            posun(-W);
            prijed();
          }, 1400);
        });
      }, 520);
    },
  };
}

export type Jizdenka = NonNullable<ReturnType<typeof initJizdenka>>;
