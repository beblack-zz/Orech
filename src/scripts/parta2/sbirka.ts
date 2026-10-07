/**
 * Sbírka pro novější stránky nového vzhledu — O nás 2 (zlato na kintsugi)
 * a Rezervace (přání party). Co se najde, uloží se v prohlížeči, ukáže
 * v hlavičce, v dialogu a dole jako oznámení.
 *
 * Parta 2, Kurzy 2 a Úvod 2 mají každá vlastní (sber.ts, naradi.ts,
 * razitka.ts) — vznikly dřív a každá umí něco navíc. Tahle je obecná:
 * stránka jen označí, co se dá najít, a pošle texty.
 *
 *   data-sbirka-tlacitko   tlačítko v hlavičce (Hlavicka.astro)
 *   data-sbirka-pocet      kde se píše, kolik je nalezeno
 *   data-sbirka-dialog     dialog se seznamem
 *   data-sbirka-polozka    položka v seznamu (hodnota = id)
 *   data-sbirka-cil        to, na co se kliká (hodnota = id)
 *   data-sbirka-otevrit    cokoli dalšího, co otevře dialog
 *   data-sbirka-reset      „začít znovu“ v dialogu
 *
 * Když úložiště nejde (anonymní okno), hraje se dál, jen bez paměti.
 */
import { nacti, uloz } from "./stav";
import * as zvuk from "./zvuk";

export interface SbirkaNastaveni {
  /** Klíč v localStorage — stejný zná Úvod 2 (data/uvod2.ts, jineSbirky) */
  klic: string;
  ids: string[];
  nazev: (id: string) => string;
  /** Popis tlačítka v hlavičce pro čtečky */
  popisTlacitka: (n: number, celkem: number) => string;
  /** Co stojí v oznámení za jménem nálezu */
  oznameni?: (n: number, celkem: number) => string;
  /** Třída na <html>, když je sbírka celá */
  celaTrida: string;
  /** Obrázek do oznámení (klon kresby) */
  obrazek?: (id: string, el?: Element) => Element | null;
  /** Zavolá se po každé změně — stránka si podle toho překreslí, co potřebuje */
  poZmene?: (mam: ReadonlySet<string>) => void;
  oslava?: { nadpis: string; text: string; tlacitko?: string; obrazky?: () => Element[] };
}

export interface Sbirka {
  najdi: (id: string, el?: Element) => boolean;
  ma: (id: string) => boolean;
  pocet: () => number;
  otevri: () => void;
}

/** Plátky sakury přes celou obrazovku a papírek se zprávou */
export function oslava(nadpis: string, text: string, tlacitko = "Arigatō", obrazky: Element[] = []) {
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
  zprava.setAttribute("aria-label", nadpis);
  if (obrazky.length) {
    const rada = document.createElement("div");
    rada.className = "oslava-parta";
    rada.append(...obrazky);
    zprava.append(rada);
  }
  const h = document.createElement("h2");
  h.className = "nadpis-2";
  h.textContent = nadpis;
  const p = document.createElement("p");
  p.textContent = text;
  const zavrit = document.createElement("button");
  zavrit.type = "button";
  zavrit.className = "tlacitko";
  zavrit.textContent = tlacitko;
  const pryc = () => {
    zprava.remove();
    vrstva.remove();
  };
  zavrit.addEventListener("click", pryc);
  zprava.addEventListener("keydown", (e) => {
    if (e.key === "Escape") pryc();
  });
  zprava.append(h, p, zavrit);
  document.body.append(zprava);
  zavrit.focus();
  window.setTimeout(() => vrstva.remove(), 9000);
}

export function initSbirka(n: SbirkaNastaveni): Sbirka {
  const celkem = n.ids.length;
  const mam = new Set<string>(nacti<string[]>(n.klic, []).filter((id) => n.ids.includes(id)));
  const tlacitko = document.querySelector<HTMLElement>("[data-sbirka-tlacitko]");
  const dialog = document.querySelector<HTMLDialogElement>("[data-sbirka-dialog]");
  const oznameni = document.querySelector<HTMLElement>(".oznameni");
  let casovac: number | undefined;

  const aktualizuj = () => {
    const pocet = mam.size;
    document.querySelectorAll("[data-sbirka-pocet]").forEach((b) => (b.textContent = String(pocet)));
    tlacitko?.setAttribute("aria-label", n.popisTlacitka(pocet, celkem));
    tlacitko?.style.setProperty("--plno", (pocet / celkem).toFixed(3));
    document.querySelectorAll<HTMLElement>("[data-sbirka-polozka]").forEach((li) => {
      li.classList.toggle("je", mam.has(li.dataset.sbirkaPolozka!));
    });
    document.querySelectorAll<HTMLElement>("[data-sbirka-cil]").forEach((el) => {
      el.classList.toggle("nalezen", mam.has(el.dataset.sbirkaCil!));
    });
    document.documentElement.classList.toggle(n.celaTrida, pocet === celkem);
    n.poZmene?.(mam);
  };

  const oznam = (id: string, el?: Element) => {
    if (!oznameni) return;
    oznameni.textContent = "";
    const obr = n.obrazek?.(id, el) ?? el?.querySelector("svg")?.cloneNode(true);
    if (obr) oznameni.append(obr as Node);
    const t = document.createElement("span");
    const b = document.createElement("b");
    b.textContent = n.nazev(id);
    t.append(b, document.createTextNode(n.oznameni?.(mam.size, celkem) ?? ` · nalezeno ${mam.size} z ${celkem}`));
    oznameni.append(t);
    oznameni.classList.add("je");
    window.clearTimeout(casovac);
    casovac = window.setTimeout(() => oznameni.classList.remove("je"), mam.size === celkem ? 4200 : 2800);
  };

  const najdi = (id: string, el?: Element) => {
    if (!n.ids.includes(id) || mam.has(id)) return false;
    mam.add(id);
    uloz(n.klic, [...mam]);
    if (el) {
      el.classList.remove("nalezen-ted");
      void (el as HTMLElement).offsetWidth;
      el.classList.add("nalezen-ted");
      window.setTimeout(() => el.classList.remove("nalezen-ted"), 800);
    }
    aktualizuj();
    // Znělku při celé sbírce hraje až oslava(), pokud ji stránka má
    if (mam.size === celkem && !n.oslava) zvuk.oslava();
    else zvuk.nalezeno();
    oznam(id, el);
    if (tlacitko) {
      tlacitko.classList.remove("cinkne");
      void tlacitko.offsetWidth;
      tlacitko.classList.add("cinkne");
    }
    if (mam.size === celkem && n.oslava) {
      const o = n.oslava;
      window.setTimeout(() => oslava(o.nadpis, o.text, o.tlacitko, o.obrazky?.() ?? []), 1000);
    }
    return true;
  };

  const otevri = () => {
    if (dialog && !dialog.open) dialog.showModal();
  };

  document.addEventListener("click", (e) => {
    const cil = (e.target as Element).closest<HTMLElement>("[data-sbirka-cil]");
    if (cil) najdi(cil.dataset.sbirkaCil!, cil);
    if ((e.target as Element).closest("[data-sbirka-otevrit]")) otevri();
  });
  tlacitko?.addEventListener("click", otevri);
  dialog?.querySelector(".omamori-zavrit")?.addEventListener("click", () => dialog.close());
  dialog?.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });
  dialog?.querySelector("[data-sbirka-reset]")?.addEventListener("click", () => {
    mam.clear();
    uloz(n.klic, []);
    aktualizuj();
  });

  aktualizuj();
  return { najdi, ma: (id) => mam.has(id), pocet: () => mam.size, otevri };
}
