/**
 * Svatyně (/svatyne): brána je zavřená, dokud v omamori není všech devět
 * kami. Pak provaz spadne, parta se na schodech rozsvítí a otevře se
 * losování. Lístek se tahá jednou a pamatuje se v prohlížeči — kdo ho má,
 * tomu zůstane brána otevřená, i kdyby si kami potom schoval znovu.
 */
import type { PostavaId } from "../../data/parta";
import { cesta, rubriky } from "../../data/kami";
import { vestbyPokladu } from "../../data/svatyne";
import { nacti, uloz } from "../parta2/stav";
import { jmeno } from "../parta2/kami";
import { KLIC_NALEZENI, ukazZaves } from "../parta2/zaves";
import { SMAZANO, ukazOmamori } from "../parta2/omamori";
import * as zvuk from "../parta2/zvuk";

const KLIC_LISTEK = "svatyne-listek";
/** Provaz už jednou spadl — pak se brána otevírá bez podívané */
const KLIC_PROVAZ = "svatyne-provaz";
const VSICHNI = 9;

interface Listek {
  kdo: PostavaId;
  /** Tři rubriky jako [rubrika, věta z jejích dobrých] — indexy do kami.ts */
  rubriky: [number, number][];
  /** Kdy se lístek vytáhl, ISO */
  datum: string;
}

const nahodne = (n: number) => Math.floor(Math.random() * n);
const chybiSlovy = (n: number) => (n === 1 ? "Chybí ještě jeden." : `Chybí ještě ${n}.`);

function vytahni(): Listek {
  const v = vestbyPokladu[nahodne(vestbyPokladu.length)];
  const poradi = rubriky.map((_, i) => i).sort(() => Math.random() - 0.5).slice(0, 3);
  return {
    kdo: v.kdo,
    rubriky: poradi.map((i) => [i, nahodne(rubriky[i].dobre.length)]),
    datum: new Date().toISOString(),
  };
}

function vyplnListek(el: HTMLElement, l: Listek) {
  const v = vestbyPokladu.find((x) => x.kdo === l.kdo) ?? vestbyPokladu[0];
  el.querySelector(".vestba-text")!.textContent = v.text;
  el.querySelector(".vestba-podpis span")!.textContent = `${jmeno(v.kdo)} za celou partu`;
  const dl = el.querySelector(".sv-rubriky")!;
  dl.textContent = "";
  for (const [i, j] of l.rubriky) {
    const r = rubriky[i];
    if (!r) continue;
    const radek = document.createElement("div");
    const dt = document.createElement("dt");
    dt.lang = "ja";
    dt.textContent = r.znak;
    const dd = document.createElement("dd");
    const nazev = document.createElement("b");
    nazev.textContent = r.nazev;
    dd.append(nazev, document.createTextNode(` ${r.dobre[j] ?? r.dobre[0]}`));
    radek.append(dt, dd);
    dl.append(radek);
  }
  /* heslo je stanoviště podepsaného z cesty hlíny: znak a jeho čtení */
  const st = cesta.find((c) => c.id === v.kdo);
  el.querySelector(".sv-heslo-znak")!.textContent = st?.znak ?? "";
  el.querySelector(".sv-heslo-cteni")!.textContent = st?.cteni ?? "";
  const d = new Date(l.datum);
  el.querySelector(".sv-datum")!.textContent = `Vytaženo ${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`;
}

export function initSvatyne() {
  const brana = document.querySelector<HTMLElement>(".sv-brana");
  const losovani = document.querySelector<HTMLElement>(".sv-losovani");
  if (!brana || !losovani) return;
  const krabicka = losovani.querySelector<HTMLButtonElement>(".sv-krabicka")!;
  const tycka = krabicka.querySelector<HTMLElement>(".omikuji-tycka")!;
  const pokyn = losovani.querySelector<HTMLElement>(".sv-pokyn")!;
  const listekEl = losovani.querySelector<HTMLElement>(".sv-listek")!;
  const prazdno = losovani.querySelector<HTMLElement>(".vestba-prazdno")!;
  /* jen při vývoji: ?devet = všech devět nalezeno, ?bez-listku = lístek se dá vytáhnout znovu */
  if (import.meta.env.DEV) {
    const p = new URLSearchParams(location.search);
    if (p.has("devet")) {
      const vsichni = vestbyPokladu.map((v) => v.kdo);
      uloz(KLIC_NALEZENI, vsichni);
      ukazZaves(vsichni);
      ukazOmamori(vsichni);
    }
    if (p.has("bez-listku")) uloz(KLIC_LISTEK, null);
  }
  let listek = nacti<Listek | null>(KLIC_LISTEK, null);
  let losuje = false;

  const ukazListek = (l: Listek, novy: boolean) => {
    vyplnListek(listekEl, l);
    prazdno.hidden = true;
    listekEl.hidden = false;
    tycka.classList.add("ven");
    krabicka.classList.add("je-vytazeno");
    krabicka.setAttribute("aria-label", "Krabička je prázdná, lístek už máš");
    pokyn.textContent = "Tenhle lístek je tvůj.";
    /* nový lístek se rozvine, dopadne razítko a vyjede ústřižek (svatyne.css) */
    if (novy) {
      listekEl.classList.add("je-novy");
      window.setTimeout(() => listekEl.classList.remove("je-novy"), 4200);
    }
  };

  /*
   * `prichod` — po načtení stránky. Jak spadne provaz a rozsvítí se lampiony,
   * je vidět jen poprvé (klíč svatyne-provaz); při dalších návštěvách je
   * brána rovnou otevřená, bez celé podívané.
   */
  const aktualizuj = (prichod = false) => {
    const nalezeni = nacti<string[]>(KLIC_NALEZENI, []);
    const otevreno = nalezeni.length >= VSICHNI || !!listek;
    const nastav = () => {
      brana.classList.toggle("je-otevreno", otevreno);
      if (otevreno) uloz(KLIC_PROVAZ, true);
    };
    if (prichod && otevreno && nacti(KLIC_PROVAZ, false)) {
      brana.classList.add("hned");
      nastav();
    } else if (prichod && otevreno) requestAnimationFrame(() => requestAnimationFrame(nastav));
    else {
      brana.classList.remove("hned");
      nastav();
    }
    brana.querySelector<HTMLElement>(".sv-zamceno")!.hidden = otevreno;
    brana.querySelector<HTMLElement>(".sv-otevreno")!.hidden = !otevreno;
    losovani.hidden = !otevreno;
    for (const k of brana.querySelectorAll<HTMLElement>(".sv-kami")) {
      k.classList.toggle("je", otevreno || nalezeni.includes(k.dataset.svKami!));
    }
    const n = Math.min(nalezeni.length, VSICHNI);
    brana.querySelector(".sv-pocet")!.textContent = String(n);
    brana.querySelector(".sv-chybi")!.textContent = n ? ` ${chybiSlovy(VSICHNI - n)}` : " Hledat se začíná na Partě 2.";
  };

  aktualizuj(true);
  if (listek) ukazListek(listek, false);

  /* omamori se dá vyprázdnit i odsud — brána se pak zase zavře (pokud už nemáš lístek) */
  document.addEventListener(SMAZANO, () => aktualizuj());

  brana.querySelector(".sv-omamori")?.addEventListener("click", () => {
    document.querySelector<HTMLDialogElement>("[data-zaves-dialog]")?.showModal();
  });

  krabicka.addEventListener("click", () => {
    if (losuje) return;
    if (listek) {
      krabicka.classList.remove("trese-malo");
      void krabicka.offsetWidth;
      krabicka.classList.add("trese-malo");
      pokyn.textContent = "Poklad se tahá jen jednou.";
      return;
    }
    losuje = true;
    krabicka.classList.add("trese");
    zvuk.tres();
    window.setTimeout(() => {
      krabicka.classList.remove("trese");
      tycka.classList.add("ven");
      window.setTimeout(() => {
        listek = vytahni();
        uloz(KLIC_LISTEK, listek);
        ukazListek(listek, true);
        zvuk.papir();
        window.setTimeout(() => zvuk.oslava(), 1100);
        losuje = false;
      }, 520);
    }, 900);
  });
}
