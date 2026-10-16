/**
 * Schovaní kami a omamori. Nálezy se pamatují v prohlížeči — když se
 * úložiště nedá použít (anonymní okno), hra jede dál, jen si nic nezapamatuje.
 */
import type { PostavaId } from "../../data/parta";
import { nacti, uloz } from "./stav";
import { jmeno, rekni } from "./kami";
import * as zvuk from "./zvuk";
import { ukazZaves, KLIC_NALEZENI } from "./zaves";
import { ukazOmamori, SMAZANO } from "./omamori";

const KLIC = KLIC_NALEZENI;
const VSICHNI = 9;
/** Pošle se na document, když host najde nového kami (detail = jeho id) — Vázička-průvodce na to řekne svou */
export const NALEZEN = "kami:nalezen";
const nalezeni = new Set<string>(nacti<string[]>(KLIC, []));

/** Nalezení kami ve skrýších svítí — na Partě 2 i mimo ni (schovej níž) */
function ukazNalezene() {
  for (const s of document.querySelectorAll<HTMLElement | SVGElement>("[data-skryty]")) {
    s.classList.toggle("nalezen", nalezeni.has(s.dataset.skryty!));
  }
}

/* Kdo vyprázdní omamori, tomu zhasnou skrýše na kterékoli stránce. Registruje se
   jednou při načtení modulu, ne za stránku — platí pro celou návštěvu. */
document.addEventListener(SMAZANO, () => {
  nalezeni.clear();
  ukazNalezene();
});

let oznameniCas: number | undefined;

/** `novy` je ten, koho člověk našel právě teď — na závěs pod hlavičkou (Zaves.astro) přiskočí */
function aktualizuj(novy?: string) {
  const n = nalezeni.size;
  ukazZaves([...nalezeni], novy);
  ukazOmamori([...nalezeni]);
  for (const b of document.querySelectorAll(".omamori-pocet b, .sber-stav b")) b.textContent = String(n);
  ukazNalezene();
  document.documentElement.classList.toggle("je-vse", n === VSICHNI);
}

/** Proužek s nálezem má v sobě jen Parta 2 — jinde (patička) se přidá, až je potřeba */
function prouzek() {
  const o = document.createElement("div");
  o.className = "oznameni";
  o.setAttribute("role", "status");
  o.setAttribute("aria-live", "polite");
  document.body.append(o);
  return o;
}

function oznam(s: Element, id: PostavaId) {
  const o = document.querySelector<HTMLElement>(".oznameni") ?? prouzek();
  o.textContent = "";
  const obr = s.querySelector("svg")?.cloneNode(true);
  if (obr) o.append(obr);
  const t = document.createElement("span");
  const b = document.createElement("b");
  b.textContent = jmeno(id);
  t.append(b, document.createTextNode(` · nalezeno ${nalezeni.size} z ${VSICHNI}`));
  o.append(t);
  o.classList.add("je");
  window.clearTimeout(oznameniCas);
  oznameniCas = window.setTimeout(() => o.classList.remove("je"), 2800);
}

function oslava() {
  zvuk.oslava();
  const vrstva = document.createElement("div");
  vrstva.className = "oslava";
  for (let i = 0; i < 70; i++) {
    const p = document.createElement("span");
    p.className = "oslava-platek";
    p.style.left = `${Math.random() * 100}%`;
    p.style.setProperty("--d", `${4 + Math.random() * 4}s`);
    p.style.setProperty("--z", `${Math.random() * 2.5}s`);
    p.style.setProperty("--dx", `${(Math.random() - 0.5) * 300}px`);
    p.style.setProperty("--r", `${Math.random() * 720 - 360}deg`);
    p.style.background = ["#F2B8B4", "#EBA9A6", "#F7CFCB", "#F3D27A"][i % 4];
    vrstva.append(p);
  }
  document.body.append(vrstva);

  const zprava = document.createElement("div");
  zprava.className = "oslava-zprava";
  zprava.setAttribute("role", "dialog");
  zprava.setAttribute("aria-label", "Všech devět kami nalezeno");
  const parta = document.createElement("div");
  parta.className = "oslava-parta";
  for (const s of document.querySelectorAll("[data-zaves-dialog] .omamori-obr svg")) parta.append(s.cloneNode(true));
  const nadpis = document.createElement("h2");
  nadpis.className = "nadpis-2";
  nadpis.textContent = "Všech devět!";
  const text = document.createElement("p");
  text.textContent = "Omamori je plné a všechny tři lístky na závěsu svítí. Provaz z brány svatyně spadl — čeká tam na tebe omikuji s pokladem.";
  const svatyne = document.createElement("a");
  svatyne.className = "tlacitko";
  svatyne.href = "/svatyne";
  svatyne.textContent = "Do svatyně";
  const zavrit = document.createElement("button");
  zavrit.type = "button";
  zavrit.className = "tlacitko tlacitko-obrys";
  zavrit.textContent = "Arigatō";
  zavrit.addEventListener("click", () => {
    zprava.remove();
    vrstva.remove();
  });
  const akce = document.createElement("div");
  akce.className = "oslava-akce";
  akce.append(svatyne, zavrit);
  zprava.append(parta, nadpis, text, akce);
  document.body.append(zprava);
  zavrit.focus();
  window.setTimeout(() => vrstva.remove(), 9000);
}

export function initSber() {
  /* modul žije přes přechody mezi stránkami — omamori mezitím mohl někdo vyprázdnit jinde */
  nalezeni.clear();
  for (const id of nacti<string[]>(KLIC, [])) nalezeni.add(id);
  aktualizuj();

  /* omamori obsluhuje omamori.ts z hlavičky — tady jen zapomenout, když ho někdo vyprázdní */
  document.addEventListener(SMAZANO, () => {
    nalezeni.clear();
    aktualizuj();
  });

  document.addEventListener("click", (e) => {
    const s = (e.target as Element).closest<HTMLElement>(".skryty");
    if (s) najdi(s);
  });
}

/**
 * Klik na schovaného kami (.skryty s data-skryty). Volá ji Parta 2 a schovej()
 * pro skrýše jinde po webu,
 * proto si nálezy pokaždé znovu přečte — mezitím mohly přibýt jinde.
 */
export function najdi(s: HTMLElement | SVGElement) {
  nalezeni.clear();
  for (const id of nacti<string[]>(KLIC, [])) nalezeni.add(id);
  const id = s.dataset.skryty as PostavaId;
  if (nalezeni.has(id)) {
    rekni(s, id, "Mě už máš. Hledej dál!");
    return;
  }
  nalezeni.add(id);
  uloz(KLIC, [...nalezeni]);
  document.dispatchEvent(new CustomEvent(NALEZEN, { detail: id }));
  s.classList.add("nalezen-ted");
  window.setTimeout(() => s.classList.remove("nalezen-ted"), 800);
  aktualizuj(id);
  zvuk.nalezeno();
  oznam(s, id);
  if (nalezeni.size === VSICHNI) window.setTimeout(oslava, 900);
}

/**
 * Skrýš mimo Partu 2: Hlínka za trilobitem v patičce (paticka.ts), na Rezervaci
 * Šamotka v okně vlaku a Kachlík v tabuli příštího odjezdu (rezervace/hlavni.ts).
 * Ukáže, jestli už je nalezený, a klik ho najde. Dál ho nepustí — ani
 * k dokumentu (Parta 2 by ho počítala podruhé), ani k tlačítku, ve kterém sedí.
 */
export function schovej(el: HTMLElement | SVGElement) {
  el.classList.toggle("nalezen", nacti<string[]>(KLIC, []).includes(el.dataset.skryty!));
  el.addEventListener("click", (e) => {
    e.stopPropagation();
    najdi(el);
  });
}
