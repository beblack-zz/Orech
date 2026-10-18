/**
 * Rok dílny. Scéna zabírá jednu obrazovku a měsíce se přepínají kliknutím
 * — tlačítky s měsíci dole, šipkami po stranách, nebo šipkami na
 * klávesnici, když je scéna na obrazovce. Scroll s ní nehýbe (dřív byla
 * sekce vysoká a měsíce se přetáčely scrollem; to bylo moc dlouhé).
 *
 * V novém měsíci se v kresbě objeví, co tehdy přibylo (data-od / data-do
 * v DilnaRez), venku se přepne roční období a kamera plynule dojede
 * k tomu, co je nového. U posledního měsíce („Teď“) se ukáže fotka.
 * Obloha jde s měsícem: kotvy data-hodina v sekci mají každá hodinu
 * jednoho měsíce a skript je při přepnutí všechny plynule přetočí na
 * hodinu vybraného (dřív je vedl scroll). S omezeným pohybem kamera
 * i obloha skočí rovnou.
 */
import { priMereni, omez, mix, hladce, klid, vyzadej } from "../parta2/stav";
import { kamera, cil, smichej } from "./kamera";
import type { Cil } from "./kamera";

/** Jak dlouho kamera jede k novému měsíci, v milisekundách */
const JIZDA = 1100;

export function rok() {
  const sekce = document.querySelector<HTMLElement>("#rok");
  if (!sekce) return;
  const scena = sekce.querySelector<HTMLElement>(".rok-scena")!;
  const ram = sekce.querySelector<HTMLElement>(".rok-ram")!;
  const svet = sekce.querySelector<HTMLElement>(".rok-svet")!;
  const rez = svet.querySelector<HTMLElement>(".rez")!;
  const kroky = [...sekce.querySelectorAll<HTMLElement>(".rok-krok")];
  const veci = [...rez.querySelectorAll<HTMLElement | SVGElement>("[data-od]")];
  const zpet = sekce.querySelector<HTMLButtonElement>(".rok-sipka-zpet");
  const dal = sekce.querySelector<HTMLButtonElement>(".rok-sipka-dal");
  const cile = kroky.map((k) => cil(k.dataset.kamera) ?? { x: 800, y: 560, w: 1680, h: 1040 });
  const n = kroky.length;
  if (!n) return;
  const k = kamera(ram, svet);
  let aktivni = -1;

  /* ——— Obloha: hodina vybraného měsíce na všech kotvách sekce ——— */
  const kotvy = [...sekce.querySelectorAll<HTMLElement>(".rok-kotva")];
  const hodiny = kotvy.map((kt) => Number(kt.dataset.hodina));
  let hodina = hodiny[0] ?? 18;
  let ramecNebe = 0;
  const nastavNebe = (h: number) => {
    hodina = h;
    for (const kt of kotvy) kt.dataset.hodina = h.toFixed(3);
    vyzadej();
  };
  const nebeNa = (cilova: number, hned: boolean) => {
    cancelAnimationFrame(ramecNebe);
    if (!Number.isFinite(cilova)) return;
    if (hned) return nastavNebe(cilova);
    const odkud = hodina;
    const start = performance.now();
    const krok = (cas: number) => {
      const t = omez((cas - start) / JIZDA);
      nastavNebe(mix(odkud, cilova, hladce(t)));
      if (t < 1) ramecNebe = requestAnimationFrame(krok);
    };
    ramecNebe = requestAnimationFrame(krok);
  };

  /* ——— Kamera: kde je teď a kam jede ——— */
  let ted: Cil = cile[0];
  let ramec = 0;
  const jedNa = (kam: Cil, hned = klid) => {
    cancelAnimationFrame(ramec);
    if (hned) {
      ted = kam;
      k.na(kam);
      return;
    }
    const odkud = ted;
    const start = performance.now();
    const krok = (cas: number) => {
      const t = omez((cas - start) / JIZDA);
      ted = smichej(odkud, kam, hladce(t));
      k.na(ted);
      if (t < 1) ramec = requestAnimationFrame(krok);
    };
    ramec = requestAnimationFrame(krok);
  };

  const mesic = (i: number, hned = false) => {
    const j = Math.max(0, Math.min(i, n - 1));
    if (j !== aktivni) {
      aktivni = j;
      const m = Number(kroky[j].dataset.m);
      for (const v of veci) {
        const od = Number(v.dataset.od);
        const doM = v.dataset.do ? Number(v.dataset.do) : Infinity;
        v.classList.toggle("je", m >= od && m < doM);
      }
      kroky.forEach((kr, x) => {
        kr.classList.toggle("je", x === j);
        kr.classList.toggle("bylo", x < j);
        const b = kr.querySelector("button");
        if (x === j) b?.setAttribute("aria-current", "step");
        else b?.removeAttribute("aria-current");
      });
      if (kroky[j].dataset.sezona) scena.dataset.sezona = kroky[j].dataset.sezona;
      // V srpnu „vypalujeme první várku“ — pec v kresbě žhne
      rez.style.setProperty("--zar", m === 8 ? "0.85" : "0");
      /* U „Teď“ fotka zvenku: kde bývala vrata, jsou okna */
      sekce.classList.toggle("foto", j === n - 1);
      if (zpet) zpet.disabled = j === 0;
      if (dal) dal.disabled = j === n - 1;
    }
    jedNa(cile[j], hned || klid);
    nebeNa(hodiny[Math.min(j, hodiny.length - 1)], hned || klid);
  };

  const okraje = () => {
    const hlava = sekce.querySelector<HTMLElement>(".rok-hlava");
    const dole = sekce.querySelector<HTMLElement>(".rok-kroky");
    const vh = scena.clientHeight;
    const nahore = hlava ? hlava.offsetTop + hlava.offsetHeight + 8 : 0;
    // Pod scénou je pruh s měsíci a nad ním lísteček s textem
    const spodek = dole ? vh - dole.offsetTop + (window.matchMedia("(max-width: 860px)").matches ? 110 : 40) : 0;
    return { nahore: Math.min(nahore, vh * 0.3), dole: Math.min(spodek, vh * 0.4) };
  };

  kroky.forEach((kr, i) => kr.querySelector("button")?.addEventListener("click", () => mesic(i)));
  zpet?.addEventListener("click", () => mesic(aktivni - 1));
  dal?.addEventListener("click", () => mesic(aktivni + 1));

  /* Šipky na klávesnici, když je scéna z větší části na obrazovce a nepíše se do pole */
  let videt = false;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => (videt = e.intersectionRatio >= 0.5), { threshold: [0, 0.5, 1] }).observe(scena);
  }
  const naKlavesy = (e: KeyboardEvent) => {
    if (!sekce.isConnected) return document.removeEventListener("keydown", naKlavesy);
    if (!videt || e.altKey || e.ctrlKey || e.metaKey) return;
    if ((e.target as Element | null)?.closest?.("input, textarea, select, [contenteditable]")) return;
    if (e.key === "ArrowLeft" && aktivni > 0) {
      e.preventDefault();
      mesic(aktivni - 1);
    } else if (e.key === "ArrowRight" && aktivni < n - 1) {
      e.preventDefault();
      mesic(aktivni + 1);
    }
  };
  document.addEventListener("keydown", naKlavesy);

  priMereni(() => {
    k.zmer(okraje());
    /* Po změně velikosti okna stojí kamera rovnou u měsíce, nejede znovu */
    cancelAnimationFrame(ramec);
    ted = cile[Math.max(0, aktivni)];
    k.na(ted);
  });

  mesic(0, true);
}
