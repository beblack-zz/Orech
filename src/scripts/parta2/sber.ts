/**
 * Schovaní kami a omamori. Nálezy se pamatují v prohlížeči — když se
 * úložiště nedá použít (anonymní okno), hra jede dál, jen si nic nezapamatuje.
 */
import type { PostavaId } from "../../data/parta";
import { nacti, uloz } from "./stav";
import { jmeno, rekni } from "./kami";
import * as zvuk from "./zvuk";

const KLIC = "parta2-nalezeni";
const VSICHNI = 9;
const nalezeni = new Set<string>(nacti<string[]>(KLIC, []));

let oznameniCas: number | undefined;

function aktualizuj() {
  const n = nalezeni.size;
  for (const b of document.querySelectorAll(".omamori-pocet b, .omamori-stav b, .sber-stav b")) b.textContent = String(n);
  document.querySelector(".omamori-tlacitko")?.setAttribute("aria-label", `Omamori: nalezeno ${n} z ${VSICHNI} kami`);
  for (const li of document.querySelectorAll<HTMLElement>(".omamori-polozka")) {
    li.classList.toggle("je", nalezeni.has(li.dataset.omamori!));
  }
  for (const s of document.querySelectorAll<HTMLElement>(".skryty")) {
    s.classList.toggle("nalezen", nalezeni.has(s.dataset.skryty!));
  }
  document.documentElement.classList.toggle("je-vse", n === VSICHNI);
}

function oznam(s: HTMLElement, id: PostavaId) {
  const o = document.querySelector<HTMLElement>(".oznameni");
  if (!o) return;
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
  for (const s of document.querySelectorAll(".omamori-obr svg")) parta.append(s.cloneNode(true));
  const nadpis = document.createElement("h2");
  nadpis.className = "nadpis-2";
  nadpis.textContent = "Všech devět!";
  const text = document.createElement("p");
  text.textContent = "Omamori je plné a zezlátlo. Teď zbývá najít je v dílně — tam jsou z hlíny a schovávají se líp.";
  const zavrit = document.createElement("button");
  zavrit.type = "button";
  zavrit.className = "tlacitko";
  zavrit.textContent = "Arigatō";
  zavrit.addEventListener("click", () => {
    zprava.remove();
    vrstva.remove();
  });
  zprava.append(parta, nadpis, text, zavrit);
  document.body.append(zprava);
  zavrit.focus();
  window.setTimeout(() => vrstva.remove(), 9000);
}

export function initSber() {
  const dialog = document.querySelector<HTMLDialogElement>(".omamori-dialog");
  const tlacitko = document.querySelector<HTMLElement>(".omamori-tlacitko");
  aktualizuj();

  document.addEventListener("click", (e) => {
    const s = (e.target as Element).closest<HTMLElement>(".skryty");
    if (!s) return;
    const id = s.dataset.skryty as PostavaId;
    if (nalezeni.has(id)) {
      rekni(s, id, "Mě už máš. Hledej dál!");
      return;
    }
    nalezeni.add(id);
    uloz(KLIC, [...nalezeni]);
    s.classList.add("nalezen-ted");
    window.setTimeout(() => s.classList.remove("nalezen-ted"), 800);
    aktualizuj();
    zvuk.nalezeno();
    oznam(s, id);
    if (tlacitko) {
      tlacitko.classList.remove("cinkne");
      void tlacitko.offsetWidth;
      tlacitko.classList.add("cinkne");
    }
    if (nalezeni.size === VSICHNI) window.setTimeout(oslava, 900);
  });

  tlacitko?.addEventListener("click", () => dialog?.showModal());
  dialog?.querySelector(".omamori-zavrit")?.addEventListener("click", () => dialog.close());
  dialog?.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });
  dialog?.querySelector(".omamori-reset")?.addEventListener("click", () => {
    nalezeni.clear();
    uloz(KLIC, []);
    aktualizuj();
  });
}
