/**
 * Hlavička nového vzhledu: mobilní menu, zvonkohra s nabídkou zvuků,
 * přepínač den / noc (bublina v noční modré), tah štětce po okraji
 * bubliny (tah.ts) a závěs s nalezenými kami pod pruhem (zaves.ts), který
 * otevírá omamori (omamori.ts). Sdílí
 * ji všechny stránky nového vzhledu, a proto spouští i tušový flek, který
 * je s patičkou na každé stránce (scripts/flek/flek.ts), a průvodce —
 * Vázičku v pravém dolním rohu, která poradí a ukáže (pruvodce.ts).
 *
 * Při přechodu mezi stránkami (prechody.ts) se tlačítko se zvonkohrou
 * přenáší do nové stránky (transition:persist), takže zvonkohra a zvuk se
 * nastaví jen poprvé a běží dál; stejně tak závěs. Menu a tah jsou na každé
 * stránce nové a závěs se na každé znovu naplní podle toho, co je nalezeno.
 */
import * as zvuk from "./zvuk";
import { initZvonkohra } from "./zvonkohra";
import { initTah } from "./tah";
import { initZaves, ukazZaves, KLIC_NALEZENI } from "./zaves";
import { initOmamori } from "./omamori";
import { nacti, uloz } from "./stav";
import { trvale } from "./prechody";
import { ukazMistra } from "./mistr";
import { initFlek } from "../flek/flek";
import { pruvodce } from "./pruvodce";

const KLIC_ZTLUMENO = "zvuk-ztlumeno";
/** Které skupiny zvuků host v nabídce u zvonkohry vypnul */
const KLIC_SKUPINY = "zvuk-skupiny";
/** Den, nebo noc v hlavičce — čte ho i skript hned za hlavičkou (Hlavicka.astro), ať noc neproblikne */
const KLIC_TEMA = "hlava-tema";
/** V téhle záložce už zvuk jednou hrál */
const KLIC_HRALO = "zvuk-hralo";
let zvukHotovy = false;
/** Zvonkohra žije přes všechny stránky — tah na každé nové o ni zavadí */
let zk: ReturnType<typeof initZvonkohra> | null = null;

/* Nová hlavička po přechodu dostane noc dřív, než se poprvé vykreslí */
document.addEventListener("astro:after-swap", () => {
  if (nacti(KLIC_TEMA, "den") === "noc") document.querySelector(".hlava")?.classList.add("je-noc");
  ukazMistra();
});

export function hlavicka() {
  initMenu();
  initTema();
  if (!zvukHotovy) {
    zvukHotovy = true;
    trvale(zvonkohraAZvuk);
    /* Závěs s kami se přenáší mezi stránkami stejně jako zvonkohra a fouká do něj její vítr */
    trvale(() => initZaves(() => zk?.vitrX() ?? 0));
  }
  ukazZaves(nacti<string[]>(KLIC_NALEZENI, []));
  initOmamori();
  ukazMistra();
  initTah({ zavadi: (sila) => zk?.cukni(sila) });
  initFlek();
  /* Průvodce je navíc — kdyby selhal, stránka musí běžet dál */
  try {
    pruvodce();
  } catch (e) {
    console.error("[pruvodce]", e);
  }
}

function initMenu() {
  const tlacitko = document.querySelector<HTMLButtonElement>(".hlava-menu-tlacitko");
  const menu = document.getElementById("hlava-menu");
  const nastavMenu = (otevrene: boolean) => {
    if (!menu || !tlacitko) return;
    menu.hidden = !otevrene;
    tlacitko.setAttribute("aria-expanded", String(otevrene));
    tlacitko.setAttribute("aria-label", otevrene ? "Zavřít menu" : "Otevřít menu");
  };
  tlacitko?.addEventListener("click", () => nastavMenu(!!menu?.hidden));
  menu?.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => nastavMenu(false)));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") nastavMenu(false);
  });
}

function initTema() {
  const hlava = document.querySelector<HTMLElement>(".hlava");
  const tlacitko = document.querySelector<HTMLButtonElement>(".hlava-tema");
  if (!hlava || !tlacitko) return;
  const ukaz = () => {
    const noc = hlava.classList.contains("je-noc");
    tlacitko.setAttribute("aria-pressed", String(noc));
    tlacitko.setAttribute("aria-label", noc ? "Denní hlavička" : "Noční hlavička");
    tlacitko.title = noc ? "Denní hlavička" : "Noční hlavička";
  };
  hlava.classList.toggle("je-noc", nacti(KLIC_TEMA, "den") === "noc");
  ukaz();
  tlacitko.addEventListener("click", () => {
    const noc = hlava.classList.toggle("je-noc");
    uloz(KLIC_TEMA, noc ? "noc" : "den");
    ukaz();
  });
}

function zvonkohraAZvuk() {
  /*
   * Zvuk je ve výchozím stavu zapnutý. Prohlížeč ho ale pustí až po prvním
   * gestu, takže se rozezní při prvním kliknutí nebo klávese kdekoli na
   * stránce. Kliknutí na zvonkohru otevře nabídku — vypnout jde celý zvuk
   * i jednotlivé skupiny (zvuk.ts) a web si volbu pamatuje.
   */
  const obal = document.querySelector<HTMLElement>(".zvuk");
  const zv = obal?.querySelector<HTMLButtonElement>(".zvuk-tlacitko");
  const kresba = zv?.querySelector<SVGSVGElement>(".zvonkohra svg");
  zk = kresba ? initZvonkohra(kresba) : null;
  if (!obal || !zv) return;
  const nabidka = obal.querySelector<HTMLElement>(".zvuk-nabidka")!;
  const vse = nabidka.querySelector<HTMLInputElement>("[data-zvuk-vse]")!;
  const skupinyPole = nabidka.querySelector<HTMLFieldSetElement>(".zvuk-skupiny")!;
  const volby = [...nabidka.querySelectorAll<HTMLInputElement>("[data-zvuk-skupina]")];
  let chci = !nacti(KLIC_ZTLUMENO, false);
  const ulozene = nacti<Partial<Record<zvuk.Skupina, boolean>>>(KLIC_SKUPINY, {});
  for (const s of zvuk.SKUPINY) zvuk.nastavSkupinu(s, ulozene[s] ?? true);
  const ukaz = () => {
    zv.classList.toggle("je-ticho", !chci);
    vse.checked = chci;
    skupinyPole.disabled = !chci;
    for (const v of volby) v.checked = zvuk.skupinaZapnuta(v.dataset.zvukSkupina as zvuk.Skupina);
  };
  const otevri = (ano: boolean) => {
    nabidka.hidden = !ano;
    zv.setAttribute("aria-expanded", String(ano));
  };
  const rozezni = async () => {
    if (!zvuk.jeZapnuto()) {
      await zvuk.prepni();
      // Hned po zapnutí se zvonkohra rozhoupe, ať je slyšet, že zvuk jde
      zk?.rozhoupej();
      try {
        sessionStorage.setItem(KLIC_HRALO, "1");
      } catch {}
    }
  };
  const GESTA = ["pointerup", "keydown", "touchend"] as const;
  /* Čeká se, dokud zvuk opravdu nehraje — Safari na iPhonu bere jako gesto až touchend */
  const prvniGesto = (e: Event) => {
    if (zvuk.hraje()) {
      GESTA.forEach((g) => document.removeEventListener(g, prvniGesto, true));
      return;
    }
    /* V nabídce se o zvuku teprve rozhoduje — tam ho spustí až volba */
    if (!chci || obal.contains(e.target as Node)) return;
    if (zvuk.jeZapnuto()) zvuk.odemkni();
    else rozezni();
  };
  GESTA.forEach((g) => document.addEventListener(g, prvniGesto, true));
  /* Přišel-li člověk odkazem z jiné stránky webu, kde už zvuk hrál, zkusí se
     rozeznít hned. Chrome a Edge to po kliknutí na odkaz obvykle dovolí;
     Safari a Firefox ne — tam zvuk dál čeká na první gesto. */
  let hralo = false;
  try {
    hralo = sessionStorage.getItem(KLIC_HRALO) === "1";
  } catch {}
  if (chci && hralo) rozezni();
  /* Kliknutí na zvonkohru otevře nabídku: celý zvuk, nebo jen některé skupiny */
  zv.addEventListener("click", () => otevri(nabidka.hidden));
  vse.addEventListener("change", () => {
    chci = vse.checked;
    uloz(KLIC_ZTLUMENO, !chci);
    ukaz();
    if (chci) rozezni();
    else if (zvuk.jeZapnuto()) zvuk.prepni();
  });
  for (const v of volby) {
    v.addEventListener("change", () => {
      const s = v.dataset.zvukSkupina as zvuk.Skupina;
      zvuk.nastavSkupinu(s, v.checked);
      const vsechny = Object.fromEntries(zvuk.SKUPINY.map((k) => [k, zvuk.skupinaZapnuta(k)]));
      uloz(KLIC_SKUPINY, vsechny);
      if (!chci) return;
      /* Volba je gesto — když zvuk ještě nehrál, rozezní se teď */
      if (!zvuk.jeZapnuto()) rozezni();
      else {
        zvuk.odemkni();
        // Zapnutá zvonkohra se ozve, ať je slyšet, že zase zvoní
        if (s === "zvonkohra" && v.checked) zk?.rozhoupej();
      }
    });
  }
  /* Zavře se klávesou Esc, kliknutím jinam a přechodem na jinou stránku */
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || nabidka.hidden) return;
    otevri(false);
    zv.focus();
  });
  document.addEventListener("pointerdown", (e) => {
    if (!nabidka.hidden && !obal.contains(e.target as Node)) otevri(false);
  });
  document.addEventListener("astro:before-swap", () => otevri(false));
  ukaz();
}
