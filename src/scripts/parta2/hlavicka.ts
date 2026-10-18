/**
 * Hlavička nového vzhledu: mobilní menu, nabídka zvuků u zvonkohry,
 * přepínač den / noc (bublina v noční modré) a závěs s nalezenými kami pod
 * pruhem (zaves.ts), který otevírá omamori (omamori.ts). To všechno je
 * vidět od prvního vykreslení a musí hned reagovat, proto se to načítá se
 * stránkou.
 *
 * Ostatní, co hlavička spouští, se při prvním načtení stránky stahuje až po
 * prvním vykreslení, když má prohlížeč klid (requestIdleCallback, kde není,
 * časovač) — jedno po druhém:
 *
 *   hlavicka-pohyb.ts  zvonkohra ve větru, pohyb závěsu a tah štětce po
 *                      okraji bubliny (tah.ts); do té doby visí zvonkohra
 *                      i závěs v klidové poloze z buildu
 *   pruvodce.ts        průvodce — Vázička v pravém dolním rohu, která
 *                      poradí a ukáže; s kresbou je to největší kus
 *   flek/flek.ts       tušový flek, který je s patičkou na každé stránce
 *
 * Při přechodu na jinou stránku bez načtení (prechody.ts) už je všechno
 * v paměti a spustí se hned jako dřív. Tlačítko se zvonkohrou se přenáší
 * do nové stránky (transition:persist), takže zvonkohra a zvuk se nastaví
 * jen poprvé a běží dál; stejně tak závěs. Menu a tah jsou na každé stránce
 * nové a závěs se na každé znovu naplní podle toho, co je nalezeno.
 */
import * as zvuk from "./zvuk";
import { initZaves, ukazZaves, KLIC_NALEZENI } from "./zaves";
import { initOmamori } from "./omamori";
import { nacti, uloz } from "./stav";
import { trvale, zaStranku } from "./prechody";
import { ukazMistra } from "./mistr";

type Pohyb = typeof import("./hlavicka-pohyb");
type Pruvodce = typeof import("./pruvodce");
type Flek = typeof import("../flek/flek");

const KLIC_ZTLUMENO = "zvuk-ztlumeno";
/** Které skupiny zvuků host v nabídce u zvonkohry vypnul */
const KLIC_SKUPINY = "zvuk-skupiny";
/** Den, nebo noc v hlavičce — čte ho i skript hned za hlavičkou (Hlavicka.astro), ať noc neproblikne */
const KLIC_TEMA = "hlava-tema";
/** V téhle záložce už zvuk jednou hrál */
const KLIC_HRALO = "zvuk-hralo";
let zvukHotovy = false;
/** Zvonkohra žije přes všechny stránky — tah na každé nové o ni zavadí. Dokud se pohyb hlavičky nestáhne, je null. */
let zk: ReturnType<Pohyb["initZvonkohra"]> | null = null;
/** Zvuk se zapnul dřív, než se zvonkohra stáhla — rozhoupe se, jakmile bude */
let rozhoupat = false;
const rozhoupejZvonkohru = () => {
  if (zk) zk.rozhoupej();
  else rozhoupat = true;
};

/* Nová hlavička po přechodu dostane noc dřív, než se poprvé vykreslí, a je
   už namalovaná — úvodní kreslení kruhu (HlavickaEnso.astro) se nespustí */
document.addEventListener("astro:after-swap", () => {
  const hlava = document.querySelector(".hlava");
  if (nacti<string>(KLIC_TEMA, "den") === "noc") hlava?.classList.add("je-noc");
  hlava?.classList.add("je-namalovana");
  ukazMistra();
});

/* ——— Co se stahuje až po prvním vykreslení ——— */

/** Stažené moduly — při přechodu mezi stránkami se už jen spouštějí */
let pohyb: Pohyb | null = null;
let pruvodceModul: Pruvodce | null = null;
let flekModul: Flek | null = null;
/** Každý se stahuje jednou; když stažení selže (výpadek sítě), zkusí se znovu na další stránce */
let slibPohybu: Promise<Pohyb> | null = null;
let slibPruvodce: Promise<Pruvodce> | null = null;
let slibFleku: Promise<Flek> | null = null;

/** Zvonkohra a pohyb závěsu se po stažení rozhýbou jednou a jako trvalé — přežijí přechod mezi stránkami */
const nactiPohyb = () =>
  (slibPohybu ??= import("./hlavicka-pohyb").then(
    (m) => {
      pohyb = m;
      trvale(() => {
        const kresba = document.querySelector<SVGSVGElement>(".zvuk-tlacitko .zvonkohra svg");
        zk = kresba ? m.initZvonkohra(kresba) : null;
        if (zk && rozhoupat) zk.rozhoupej();
        rozhoupat = false;
        m.rozhybejZaves(() => zk?.vitrX() ?? 0);
      });
      return m;
    },
    (e) => {
      slibPohybu = null;
      throw e;
    },
  ));
const nactiPruvodce = () =>
  (slibPruvodce ??= import("./pruvodce").then(
    (m) => (pruvodceModul = m),
    (e) => {
      slibPruvodce = null;
      throw e;
    },
  ));
const nactiFlek = () =>
  (slibFleku ??= import("../flek/flek").then(
    (m) => (flekModul = m),
    (e) => {
      slibFleku = null;
      throw e;
    },
  ));

/**
 * Zavolá fn, až bude po vykreslení klid: po příštím snímku, a pak, až má
 * prohlížeč volnou chvíli (requestIdleCallback), nejpozději za `nejdele` ms.
 * Kde requestIdleCallback není (Safari), stačí časovač.
 */
const vKlidu = (fn: () => void, nejdele: number) =>
  requestAnimationFrame(() =>
    window.setTimeout(() => {
      if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(() => fn(), { timeout: nejdele });
      else window.setTimeout(fn, Math.round(nejdele / 3));
    }, 0),
  );

/** Jeden kus po druhém: počká na klid, stáhne ho a spustí; chyba jednoho kusu ostatní nezastaví */
const poKlidu = <M>(retez: Promise<unknown>, nejdele: number, stahni: () => Promise<M>, spust: (m: M) => void) =>
  retez
    .then(() => new Promise<void>((hotovo) => vKlidu(hotovo, nejdele)))
    .then(stahni)
    .then(spust)
    .catch((e) => console.error("[hlavicka]", e));

export function hlavicka() {
  /* Kdy se hlavička spustila — tah podle toho na první stránce počká, až se namaluje kruh */
  const od = performance.now();
  initMenu();
  initTema();
  if (!zvukHotovy) {
    zvukHotovy = true;
    trvale(nabidkaZvuku);
    /* Závěs s kami se přenáší mezi stránkami stejně jako zvonkohra a fouká do něj její vítr (zaves-pohyb.ts) */
    trvale(initZaves);
  }
  ukazZaves(nacti<string[]>(KLIC_NALEZENI, []));
  initOmamori();
  ukazMistra();

  const tah = (m: Pohyb, pozde: boolean) => m.initTah({ zavadi: (sila) => zk?.cukni(sila), od, pozde });
  /* Průvodce je navíc — kdyby selhal, stránka musí běžet dál */
  const pruvodce = (m: Pruvodce) => {
    try {
      m.pruvodce();
    } catch (e) {
      console.error("[pruvodce]", e);
    }
  };
  const flek = (m: Flek, pozde: boolean) => m.initFlek(pozde);

  /* Po přechodu mezi stránkami je všechno v paměti — spustí se hned */
  if (pohyb) tah(pohyb, false);
  if (flekModul) flek(flekModul, false);
  if (pruvodceModul) pruvodce(pruvodceModul);
  if (pohyb && pruvodceModul && flekModul) return;

  /* Při prvním načtení jedno po druhém, každé v klidu po vykreslení — a jen dokud tahle stránka trvá */
  let retez: Promise<unknown> = Promise.resolve();
  if (!pohyb) retez = poKlidu(retez, 1000, nactiPohyb, zaStranku((m: Pohyb) => tah(m, true)));
  if (!pruvodceModul) retez = poKlidu(retez, 2500, nactiPruvodce, zaStranku(pruvodce));
  if (!flekModul) poKlidu(retez, 4000, nactiFlek, zaStranku((m: Flek) => flek(m, true)));
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
  hlava.classList.toggle("je-noc", nacti<string>(KLIC_TEMA, "den") === "noc");
  ukaz();
  tlacitko.addEventListener("click", () => {
    const noc = hlava.classList.toggle("je-noc");
    uloz(KLIC_TEMA, noc ? "noc" : "den");
    ukaz();
  });
}

function nabidkaZvuku() {
  /*
   * Zvuk je ve výchozím stavu zapnutý. Prohlížeč ho ale pustí až po prvním
   * gestu, takže se rozezní při prvním kliknutí nebo klávese kdekoli na
   * stránce. Kliknutí na zvonkohru otevře nabídku — vypnout jde celý zvuk
   * i jednotlivé skupiny (zvuk.ts) a web si volbu pamatuje. Zvonkohru samu
   * (její pohyb a údery) rozhýbe až stažený pohyb hlavičky.
   */
  const obal = document.querySelector<HTMLElement>(".zvuk");
  const zv = obal?.querySelector<HTMLButtonElement>(".zvuk-tlacitko");
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
      rozhoupejZvonkohru();
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
        if (s === "zvonkohra" && v.checked) rozhoupejZvonkohru();
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
