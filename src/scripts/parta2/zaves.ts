/**
 * Závěs s kami pod hlavičkou (Zaves.astro), jeho lehká část: podle nálezů
 * navléká kami na šňůrky a rozsvěcí lístky komnat a kliknutí na břevno
 * otevře omamori. Načítá se hned se stránkou, takže kdo je nalezený, visí
 * na šňůrce od prvního vykreslení. Pohyb (vítr zvonkohry, myš, cuknutí,
 * když někdo přibude) je v zaves-pohyb.ts — hlavička ho dotáhne až po
 * prvním vykreslení a on se sem připojí (pripojPohyb); co se mezitím mělo
 * houpat, si počká a dožene se.
 *
 * Žije přes všechny stránky jako zvonkohra: hlavicka.ts ho založí jednou
 * (initZaves) a na každé stránce mu řekne, co je nalezeno (ukazZaves);
 * na Partě 2 mu to při každém nálezu hlásí sber.ts. Kliknutí na břevno
 * otevře omamori (data-zaves-dialog), které je pod hlavičkou na každé
 * stránce; odkaz na Partu 2 zbývá jen pro případ, že neběží skript.
 *
 * Když si člověk nepřeje pohyb, závěs visí rovně a jen se plní.
 */
import { MIST, SNUR, KOTVY } from "./zaves-miry";
import { klid } from "./stav";
import * as zvuk from "./zvuk";

/** Tón lístku, když se šňůrka zaplní — tři nejvyšší trubky zvonkohry */
const TONY = [587.33, 659.26, 880];
/** Kdo je na Partě 2 nalezený (pole id v pořadí nálezů) — zapisuje sber.ts */
export const KLIC_NALEZENI = "parta2-nalezeni";

/** Co umí pohyb závěsu (zaves-pohyb.ts) */
export interface PohybZavesu {
  /** Na šňůrku někdo přibyl: cukne sebou od toho místa dolů */
  cukni: (snura: number, misto?: number, sila?: number) => void;
}
type Cuknuti = Parameters<PohybZavesu["cukni"]>;

let zivy: { ukaz: (nalezeni: string[], novy?: string) => void } | null = null;
let pohyb: PohybZavesu | null = null;
/** Cuknutí z doby, kdy se pohyb ještě nenačetl — provedou se, jakmile se připojí */
const cekajici: Cuknuti[] = [];
const cukni = (...a: Cuknuti) => {
  if (klid) return;
  if (pohyb) pohyb.cukni(...a);
  else if (cekajici.length < SNUR * MIST) cekajici.push(a);
};

/** Navlékne nalezené na šňůrky; `novy` je ten, kdo přibyl právě teď */
export const ukazZaves = (nalezeni: string[], novy?: string) => zivy?.ukaz(nalezeni, novy);
/** Cukne postupně všemi třemi šňůrkami — když na závěs někdo ukazuje (Vázička-průvodce, parta2/pruvodce.ts) */
export const rozhoupejZaves = () => {
  if (klid) return;
  for (let i = 0; i < SNUR; i++) window.setTimeout(() => cukni(i, MIST - 1, 0.8), i * 140);
};
/** Pohyb závěsu se načetl (zaves-pohyb.ts): od teď cuká on a co čekalo, se dožene */
export function pripojPohyb(p: PohybZavesu) {
  pohyb = p;
  for (const a of cekajici.splice(0)) p.cukni(...a);
}

/** Volá se jednou a jako trvalé (prechody.ts) — závěs se přenáší mezi stránkami (transition:persist) a posluchač s ním */
export function initZaves() {
  const odkaz = document.querySelector<HTMLAnchorElement>("[data-zaves]");
  const kresba = odkaz?.querySelector<SVGSVGElement>(":scope > svg");
  if (!odkaz || !kresba) return;
  odkaz.addEventListener("click", (e) => {
    const dialog = document.querySelector<HTMLDialogElement>("[data-zaves-dialog]");
    if (!dialog) return;
    e.preventDefault();
    dialog.showModal();
  });
  const prvky = new Map<string, Element>();
  kresba.querySelectorAll("[data-zv]").forEach((el) => prvky.set(el.getAttribute("data-zv")!, el));
  const sklad = kresba.querySelector(".zv-sklad")!;
  const kami = new Map<string, Element>();
  kresba.querySelectorAll("[data-zv-kdo]").forEach((el) => kami.set(el.getAttribute("data-zv-kdo")!, el));
  const misto = (n: number) => prvky.get(`misto-${Math.floor(n / MIST)}-${n % MIST}`);
  let plnych = 0;

  zivy = {
    /**
     * Navlékne nalezené na šňůrky v pořadí, v jakém je člověk našel, a ostatní
     * vrátí do skladu. `novy` je ten, kdo přibyl právě teď: přiskočí, šňůrka
     * sebou cukne, a zaplnil-li ji, lístek zazvoní.
     */
    ukaz(nalezeni: string[], novy?: string) {
      const mam = nalezeni.filter((id) => kami.has(id)).slice(0, SNUR * MIST);
      odkaz.setAttribute("aria-label", `Schovaní kami: nalezeno ${mam.length} z ${SNUR * MIST}, hledají se na Partě`);
      for (const [id, el] of kami) {
        if (mam.includes(id)) continue;
        el.classList.remove("zv-prisel");
        sklad.append(el);
      }
      for (let n = 0; n < SNUR * MIST; n++) {
        const m = misto(n);
        if (!m) continue;
        m.classList.toggle("je", n < mam.length);
        if (n >= mam.length) continue;
        const el = kami.get(mam[n])!;
        if (el.parentNode !== m) m.append(el);
        el.classList.toggle("zv-prisel", mam[n] === novy);
      }
      const ted = Math.floor(mam.length / MIST);
      for (let i = 0; i < SNUR; i++) prvky.get(`listek-${i}`)?.classList.toggle("je", i < ted);
      if (novy && mam.includes(novy)) {
        const n = mam.indexOf(novy);
        const i = Math.floor(n / MIST);
        cukni(i, n % MIST);
        if (ted > plnych) {
          const obrys = kresba.getBoundingClientRect();
          const stred = (obrys.left + obrys.width / 2) / window.innerWidth - 0.5;
          window.setTimeout(() => zvuk.zvonek(TONY[i], 0.85, (KOTVY[i] / 19) * 0.2 + stred * 0.5), 320);
        }
      }
      plnych = ted;
    },
  };
}
