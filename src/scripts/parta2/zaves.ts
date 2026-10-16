/**
 * Závěs s kami pod hlavičkou (Zaves.astro): každý snímek posune fyziku
 * (zaves-fyzika.ts) a přepíše kresbu, a podle nálezů navléká kami na
 * šňůrky a rozsvěcí lístky komnat.
 *
 * Žije přes všechny stránky jako zvonkohra: hlavicka.ts ho založí jednou
 * (initZaves) a na každé stránce mu řekne, co je nalezeno (ukazZaves);
 * na Partě 2 mu to při každém nálezu hlásí sber.ts. Kliknutí na břevno
 * otevře omamori (data-zaves-dialog), které je pod hlavičkou na každé
 * stránce; odkaz na Partu 2 zbývá jen pro případ, že neběží skript.
 *
 * Fouká do něj vítr zvonkohry vedle (hlavicka.ts), takže se obě houpou
 * ve stejných nárazech. Přejede-li přes něj myš, rozhoupe ho jako ruka —
 * kresba sama na myš nereaguje, aby nepřekážela klikání na stránku pod ní,
 * takže se poloha myši počítá z celého okna.
 *
 * Když si člověk nepřeje pohyb, závěs visí rovně a jen se plní.
 */
import { zaves, zapis, MIST, SNUR, KOTVY } from "./zaves-fyzika";
import { klid } from "./stav";
import * as zvuk from "./zvuk";

/** Výřez kresby (viewBox v Zaves.astro) */
const VYREZ = { x: -34, y: -8, sirka: 68 };
/** Tón lístku, když se šňůrka zaplní — tři nejvyšší trubky zvonkohry */
const TONY = [587.33, 659.26, 880];
/** Kdo je na Partě 2 nalezený (pole id v pořadí nálezů) — zapisuje sber.ts */
export const KLIC_NALEZENI = "parta2-nalezeni";

let zivy: { ukaz: (nalezeni: string[], novy?: string) => void; rozhoupej: () => void } | null = null;
/** Navlékne nalezené na šňůrky; `novy` je ten, kdo přibyl právě teď */
export const ukazZaves = (nalezeni: string[], novy?: string) => zivy?.ukaz(nalezeni, novy);
/** Cukne postupně všemi třemi šňůrkami — když na závěs někdo ukazuje (Vázička-průvodce, parta2/pruvodce.ts) */
export const rozhoupejZaves = () => zivy?.rozhoupej();

/** Volá se jednou a jako trvalé (prechody.ts) — smyčka i posluchače mají přežít přechod mezi stránkami */
export function initZaves(vitr: () => number) {
  const odkaz = document.querySelector<HTMLAnchorElement>("[data-zaves]");
  const kresba = odkaz?.querySelector<SVGSVGElement>(":scope > svg");
  if (!odkaz || !kresba) return;
  odkaz.addEventListener("click", (e) => {
    const dialog = document.querySelector<HTMLDialogElement>("[data-zaves-dialog]");
    if (!dialog) return;
    e.preventDefault();
    dialog.showModal();
  });
  const zv = zaves();
  const prvky = new Map<string, Element>();
  kresba.querySelectorAll("[data-zv]").forEach((el) => prvky.set(el.getAttribute("data-zv")!, el));
  const nastav = (klic: string, atribut: string, hodnota: string) => prvky.get(klic)?.setAttribute(atribut, hodnota);
  const sklad = kresba.querySelector(".zv-sklad")!;
  const kami = new Map<string, Element>();
  kresba.querySelectorAll("[data-zv-kdo]").forEach((el) => kami.set(el.getAttribute("data-zv-kdo")!, el));
  const misto = (n: number) => prvky.get(`misto-${Math.floor(n / MIST)}-${n % MIST}`);
  let plnych = 0;

  let obrys = kresba.getBoundingClientRect();
  let zmereno = 0;
  const zmer = () => {
    obrys = kresba.getBoundingClientRect();
    zmereno = performance.now();
  };
  window.addEventListener("resize", zmer);

  if (!klid) {
    let predtim = 0;
    const snimek = (t: number) => {
      requestAnimationFrame(snimek);
      const dt = predtim ? (t - predtim) / 1000 : 0;
      predtim = t;
      zv.krok(dt, vitr());
      zapis(zv.poloha(), nastav);
    };
    requestAnimationFrame(snimek);

    let mx = 0, mt = 0;
    window.addEventListener(
      "pointermove",
      (e) => {
        if (e.timeStamp - zmereno > 800) zmer();
        if (!obrys.width) return;
        const k = VYREZ.sirka / obrys.width;
        const bx = (e.clientX - obrys.left) * k + VYREZ.x;
        const by = (e.clientY - obrys.top) * k + VYREZ.y;
        const dt = (e.timeStamp - mt) / 1000;
        if (dt > 0 && dt < 0.1 && bx > -32 && bx < 32 && by > 18 && by < 122) zv.postrc(bx, by, (bx - mx) / Math.max(dt, 0.008));
        mx = bx;
        mt = e.timeStamp;
      },
      { passive: true },
    );
  }

  zivy = {
    rozhoupej() {
      if (klid) return;
      for (let i = 0; i < SNUR; i++) window.setTimeout(() => zv.cukni(i, MIST - 1, 0.8), i * 140);
    },
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
        zv.cukni(i, n % MIST);
        if (ted > plnych) {
          zmer();
          const stred = (obrys.left + obrys.width / 2) / window.innerWidth - 0.5;
          window.setTimeout(() => zvuk.zvonek(TONY[i], 0.85, (KOTVY[i] / 19) * 0.2 + stred * 0.5), 320);
        }
      }
      plnych = ted;
    },
  };
}
