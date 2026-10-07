/**
 * Tvůj kus napříč stránkou Dílna. Kdo si ho vyválí nebo vytočí, má ho
 * uložený v prohlížeči (klíč dilna-kus) a ostatní sekce se o změně dozví:
 * glazování si ho vezme, cesta ho ukazuje krok po kroku, v noci stojí na
 * polici a v dílně v řezu na regálu.
 *
 * Stav je „mokry“ (právě udělaný), nebo „hotovy“ (vypálený i s glazurou).
 * Mezikroky (suchý, přežah, syrová glazura) se jen kreslí cestou.
 */
import { nacti, uloz } from "../parta2/stav";
import { KLIC_KUS, platnyKus, kusSvg } from "../../components/dilna/kus";
import type { Kus } from "../../components/dilna/kus";

export interface Ulozeny {
  kus: Kus;
  stav: "mokry" | "hotovy";
  /** Glazura po výpalu stekla (dvě vrstvy) */
  stekla?: boolean;
}

let ulozeny: Ulozeny | null = null;
const posluchaci: ((u: Ulozeny | null) => void)[] = [];

export function initKus() {
  /* Po přechodu mezi stránkami jsou staré sekce pryč — posluchače znovu */
  posluchaci.length = 0;
  const x = nacti<Ulozeny | null>(KLIC_KUS, null);
  ulozeny = x && typeof x === "object" && platnyKus(x.kus) && (x.stav === "mokry" || x.stav === "hotovy") ? x : null;
}

export const tvujKus = () => ulozeny;

export function ulozKus(u: Ulozeny | null) {
  ulozeny = u;
  uloz(KLIC_KUS, u);
  posluchaci.forEach((f) => f(u));
}

export const priZmeneKusu = (f: (u: Ulozeny | null) => void) => {
  posluchaci.push(f);
};

/** Podpis si stránka pamatuje i pro další kus — podepisuješ se pořád stejně */
const KLIC_JMENO = "dilna-jmeno";

/**
 * Výsledek ve scéně (placat, točit): kus, jméno a podpis rydlem. Podpis
 * se rovnou ukládá ke kusu a kresba se překreslí — jméno je vidět na patce.
 */
export function ukazVysledek(el: HTMLElement, u: Ulozeny, id: string) {
  const obr = el.querySelector<HTMLElement>(".d-vysledek-kus");
  const nazev = el.querySelector<HTMLElement>(".d-vysledek-nazev");
  const vstup = el.querySelector<HTMLInputElement>(".d-podpis input");
  const prekresli = () => {
    if (obr) obr.innerHTML = kusSvg(u.kus, "mokry", { id, popis: u.kus.nazev });
  };
  if (nazev) nazev.textContent = u.kus.nazev;
  if (vstup) {
    const jmeno = u.kus.jmeno ?? nacti<string>(KLIC_JMENO, "");
    vstup.value = jmeno;
    if (jmeno && !u.kus.jmeno) {
      u.kus.jmeno = jmeno;
      ulozKus(u);
    }
    vstup.oninput = () => {
      const j = vstup.value.trim().slice(0, 14);
      u.kus.jmeno = j || undefined;
      uloz(KLIC_JMENO, j);
      prekresli();
      ulozKus(u);
    };
  }
  prekresli();
  el.hidden = false;
  el.classList.remove("ukazuje");
  void el.offsetWidth;
  el.classList.add("ukazuje");
}
