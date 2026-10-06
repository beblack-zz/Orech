/**
 * Omikuji: zatřást, vytáhnout tyčku s číslem, rozbalit věštbu. Stupně
 * štěstí mají váhy jako ve skutečné svatyni — smůla padá, ale ne často.
 * Přivázané věštby visí na provaze a pamatují se v prohlížeči.
 */
import { rubriky, stupne, vestby } from "../../data/kami";
import type { Stupen } from "../../data/kami";
import { nacti, uloz } from "./stav";
import { jmeno } from "./kami";
import * as zvuk from "./zvuk";

const KLIC = "parta2-uzliky";
const JEDNOTKY = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];

const kanjiCislo = (n: number) => {
  if (n < 10) return JEDNOTKY[n];
  const desitky = Math.floor(n / 10);
  return `${desitky > 1 ? JEDNOTKY[desitky] : ""}十${JEDNOTKY[n % 10]}`;
};

const nahodne = <T>(pole: readonly T[]) => pole[Math.floor(Math.random() * pole.length)];

function losuj(): Stupen {
  const vse = Object.entries(stupne) as [Stupen, (typeof stupne)[Stupen]][];
  let zbyva = Math.random() * vse.reduce((s, [, v]) => s + v.vaha, 0);
  for (const [k, v] of vse) {
    zbyva -= v.vaha;
    if (zbyva <= 0) return k;
  }
  return "kichi";
}

const vestbaSlovy = (n: number) => (n === 1 ? "věštba" : n >= 2 && n <= 4 ? "věštby" : "věšteb");

export function initOmikuji() {
  const krabicka = document.querySelector<HTMLButtonElement>(".omikuji-krabicka");
  if (!krabicka) return;
  const tycka = krabicka.querySelector<HTMLElement>(".omikuji-tycka")!;
  const cisloEl = krabicka.querySelector<HTMLElement>(".omikuji-cislo")!;
  const vestba = document.querySelector<HTMLElement>(".vestba")!;
  const prazdno = document.querySelector<HTMLElement>(".vestba-prazdno")!;
  const uzliky = document.querySelector<HTMLElement>(".omikuji-uzliky")!;
  const pocetEl = document.querySelector<HTMLElement>(".omikuji-pocet")!;
  const privazat = vestba.querySelector<HTMLButtonElement>(".vestba-privazat")!;
  let pocet = nacti<number>(KLIC, 0);
  let losuje = false;

  const vykresli = (novy: boolean) => {
    uzliky.textContent = "";
    const n = Math.min(pocet, 48);
    for (let i = 0; i < n; i++) {
      // Zlatý řez rozhází uzlíky po provaze rovnoměrně, ale ne v řadě
      const x = 6 + ((i * 0.618034) % 1) * 88;
      const t = (x * 10 - 24) / 952;
      const yLano = 30 + 30 * 4 * t * (1 - t);
      const u = document.createElement("span");
      u.className = `uzlik${novy && i === n - 1 ? " novy" : ""}`;
      u.style.left = `${x.toFixed(2)}%`;
      u.style.top = `${(yLano - 3).toFixed(1)}px`;
      u.style.setProperty("--r", `${((i * 47) % 14) - 7}deg`);
      u.style.setProperty("--z", `${-((i * 0.37) % 4).toFixed(2)}s`);
      uzliky.append(u);
    }
    pocetEl.textContent = "";
    const s = document.createElement("span");
    s.textContent = `Na provaze u ořechu visí ${pocet} ${vestbaSlovy(pocet)}.`;
    pocetEl.append(s);
  };

  const ukaz = (c: number) => {
    const st = losuj();
    const info = stupne[st];
    const v = nahodne(vestby[st]);
    vestba.querySelector(".vestba-c")!.textContent = kanjiCislo(c);
    vestba.querySelector(".vestba-stupen")!.textContent = info.znak;
    vestba.querySelector(".vestba-romaji")!.textContent = info.romaji;
    vestba.querySelector(".vestba-cesky")!.textContent = info.cesky;
    vestba.querySelector(".vestba-text")!.textContent = v.text;
    vestba.querySelector(".vestba-podpis span")!.textContent = jmeno(v.kdo);

    const dl = vestba.querySelector(".vestba-rubriky")!;
    dl.textContent = "";
    const vybrane = [...rubriky].sort(() => Math.random() - 0.5).slice(0, 3);
    for (const r of vybrane) {
      const dobre = info.nalada === "dobre" || (info.nalada === "smisene" && Math.random() < 0.5);
      const radek = document.createElement("div");
      const dt = document.createElement("dt");
      dt.lang = "ja";
      dt.textContent = r.znak;
      const nazev = document.createElement("dd");
      nazev.className = "rubrika-nazev";
      nazev.textContent = r.nazev;
      const dd = document.createElement("dd");
      dd.textContent = nahodne(dobre ? r.dobre : r.zle);
      radek.append(dt, nazev, dd);
      dl.append(radek);
    }

    vestba.classList.toggle("je-kyo", st === "kyo");
    privazat.textContent = info.nalada === "dobre" ? "Přivázat k ořechu" : "Nechat smůlu u ořechu";
    prazdno.hidden = true;
    vestba.hidden = false;
    vestba.style.animation = "none";
    void vestba.offsetWidth;
    vestba.style.animation = "";
    zvuk.papir();
  };

  krabicka.addEventListener("click", () => {
    if (losuje) return;
    losuje = true;
    tycka.classList.remove("ven");
    krabicka.classList.add("trese");
    zvuk.tres();
    window.setTimeout(() => {
      krabicka.classList.remove("trese");
      const c = 1 + Math.floor(Math.random() * 20);
      cisloEl.textContent = kanjiCislo(c);
      tycka.classList.add("ven");
      window.setTimeout(() => {
        ukaz(c);
        losuje = false;
      }, 520);
    }, 900);
  });

  vestba.querySelector(".vestba-znovu")?.addEventListener("click", () => {
    krabicka.click();
    krabicka.focus();
  });

  privazat.addEventListener("click", () => {
    vestba.classList.add("odlet");
    zvuk.papir();
    window.setTimeout(() => {
      vestba.hidden = true;
      vestba.classList.remove("odlet");
      prazdno.hidden = false;
      tycka.classList.remove("ven");
      pocet++;
      uloz(KLIC, pocet);
      vykresli(true);
      krabicka.focus();
    }, 720);
  });

  vykresli(false);
}
