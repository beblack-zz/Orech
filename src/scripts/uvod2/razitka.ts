/**
 * Sešit razítek. Kdo co udělá (projde norenem, roztočí kruh, otevře pec…),
 * zavolá orazitkuj(id) a razítko dopadne do políčka v kartě, do sešitu
 * v hlavičce a ukáže se dole jako oznámení. Sešit si pamatuje prohlížeč;
 * když úložiště nejde (anonymní okno), hraje se dál, jen bez paměti.
 *
 * V sešitě je vidět i to, co člověk našel jinde v novém vzhledu — omamori
 * z Party 2 a bedýnka z Kurzů 2 (jejich klíče jsou v data/uvod2.ts).
 */
import { razitka, jineSbirky } from "../../data/uvod2";
import type { RazitkoId } from "../../data/uvod2";
import { nacti, uloz, SVGNS } from "../parta2/stav";
import * as zvuk from "../parta2/zvuk";

const KLIC = "uvod2-razitka";
const VSE = razitka.length;
const nazvy = Object.fromEntries(razitka.map((r) => [r.id, r.nazev])) as Record<RazitkoId, string>;

let mam: Partial<Record<RazitkoId, number>> = {};
let oznameniCas: number | undefined;

const pocet = () => Object.keys(mam).length;
const datum = (t: number) => {
  const d = new Date(t);
  return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`;
};

function aktualizuj() {
  const n = pocet();
  document.querySelectorAll(".razitka-pocet b, .razitka-stav").forEach((b) => (b.textContent = String(n)));
  document.querySelector(".razitka-tlacitko")?.setAttribute("aria-label", `Sešit razítek: ${n} z ${VSE}`);
  document.querySelectorAll<HTMLElement>("[data-razitko]").forEach((el) => {
    el.classList.toggle("je", (el.dataset.razitko as RazitkoId) in mam);
  });
  document.querySelectorAll<HTMLElement>("[data-sesit]").forEach((li) => {
    const t = mam[li.dataset.sesit as RazitkoId];
    li.classList.toggle("je", !!t);
    const d = li.querySelector(".sesit-datum");
    if (d) d.textContent = t ? datum(t) : "";
  });
  document.documentElement.classList.toggle("je-vse-razitka", n === VSE);
}

function jinde() {
  for (const s of jineSbirky) {
    const n = nacti<string[]>(s.klic, []).length;
    document.querySelectorAll(`[data-jinde="${s.klic}"]`).forEach((b) => (b.textContent = String(Math.min(n, s.celkem))));
  }
}

const otisk = (id: RazitkoId, trida: string) => {
  const svg = document.createElementNS(SVGNS, "svg");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("class", trida);
  svg.setAttribute("aria-hidden", "true");
  const g = document.createElementNS(SVGNS, "g");
  g.setAttribute("filter", "url(#rz-inkoust)");
  const use = document.createElementNS(SVGNS, "use");
  use.setAttribute("href", `#razitko-${id}`);
  g.append(use);
  svg.append(g);
  return svg;
};

function oznam(id: RazitkoId) {
  const o = document.querySelector<HTMLElement>(".oznameni");
  if (!o) return;
  o.textContent = "";
  o.append(otisk(id, "oznameni-otisk"));
  const t = document.createElement("span");
  const b = document.createElement("b");
  b.textContent = `Razítko ${nazvy[id]}`;
  t.append(b, document.createTextNode(pocet() === VSE ? " · sešit je plný!" : ` · ${pocet()} z ${VSE}`));
  o.append(t);
  o.classList.add("je");
  window.clearTimeout(oznameniCas);
  oznameniCas = window.setTimeout(() => o.classList.remove("je"), pocet() === VSE ? 4200 : 2800);
}

function oslava() {
  zvuk.oslava();
  const vrstva = document.createElement("div");
  vrstva.className = "oslava";
  for (let i = 0; i < 64; i++) {
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
  zprava.setAttribute("aria-label", "Celý sešit razítek je plný");
  const radek = document.createElement("div");
  radek.className = "oslava-parta oslava-razitka";
  for (const r of razitka) radek.append(otisk(r.id, "oslava-otisk"));
  const nadpis = document.createElement("h2");
  nadpis.className = "nadpis-2";
  nadpis.textContent = "Celá dílna orazítkovaná.";
  const text = document.createElement("p");
  text.textContent = "Kachlík to potvrzuje úředně: 正. Teď už zbývá jen přijít doopravdy.";
  const zavrit = document.createElement("button");
  zavrit.type = "button";
  zavrit.className = "tlacitko";
  zavrit.textContent = "Arigatō";
  const pryc = () => {
    zprava.remove();
    vrstva.remove();
  };
  zavrit.addEventListener("click", pryc);
  zprava.addEventListener("keydown", (e) => {
    if (e.key === "Escape") pryc();
  });
  zprava.append(radek, nadpis, text, zavrit);
  document.body.append(zprava);
  zavrit.focus();
  window.setTimeout(() => vrstva.remove(), 9000);
}

/** Dá razítko. Vrací true, když je nové. */
export function orazitkuj(id: RazitkoId) {
  if (id in mam) return false;
  mam[id] = Date.now();
  uloz(KLIC, mam);
  aktualizuj();
  document.querySelectorAll<HTMLElement>(`[data-razitko="${id}"]`).forEach((el) => {
    el.classList.remove("ted");
    void el.offsetWidth;
    el.classList.add("ted");
  });
  zvuk.razitko();
  oznam(id);
  const t = document.querySelector<HTMLElement>(".razitka-tlacitko");
  if (t) {
    t.classList.remove("cinkne");
    void t.offsetWidth;
    t.classList.add("cinkne");
  }
  if (pocet() === VSE) window.setTimeout(oslava, 1000);
  return true;
}

export function initRazitka() {
  const ulozene = nacti<Partial<Record<RazitkoId, number>>>(KLIC, {});
  mam = {};
  for (const r of razitka) {
    const t = ulozene?.[r.id];
    if (typeof t === "number") mam[r.id] = t;
  }
  aktualizuj();
  jinde();

  const dialog = document.querySelector<HTMLDialogElement>(".razitka-dialog");
  const otevri = () => {
    jinde();
    if (dialog && !dialog.open) dialog.showModal();
  };
  document.querySelector(".razitka-tlacitko")?.addEventListener("click", otevri);
  document.querySelectorAll(".razitka-otevrit").forEach((b) => b.addEventListener("click", otevri));
  dialog?.querySelector(".omamori-zavrit")?.addEventListener("click", () => dialog.close());
  dialog?.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });
  dialog?.querySelector(".razitka-reset")?.addEventListener("click", () => {
    mam = {};
    uloz(KLIC, mam);
    aktualizuj();
  });
}
