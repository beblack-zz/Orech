/**
 * Futatsu: výkres a skutečná velikost — modul, který stránka (futatsu.ts)
 * stahuje, až se kapitola 二 Výkres nebo 五 Origami blíží, i s kresbou
 * výkresu (components/obchod2/futatsu/kresba.ts):
 *
 *   výkres        na úzké obrazovce se list i pauzák přestaví na výšku;
 *                 jezdec, tah do strany a „Roztočit“ otáčí hrnkem ve všech
 *                 pohledech; když přijdeš z úvodu, stojí jako hrnek tam
 *   kusovník      řádek ↔ číslo na výkrese ↔ číslo na fotce se rozsvítí spolu
 *   origami       platební karta na obrazovce → kolik px má milimetr
 *                 (pamatuje si prohlížeč) a Futatsu ve skutečné velikosti
 *
 * Místo pro list, pauzák a skutečnou velikost odměřil vstup stránky hned
 * (futatsu.ts), aby se stránka nad kotvou po stažení neposunula; tady se
 * nakreslí a výměrou z obsahu se to místo zase pustí. „Roztočit“ se mimo
 * obrazovku zastaví a při návratu točí dál. Posluchače a observery uklidí
 * s obsahem prechody.ts.
 */
import { uloz, klid } from "../parta2/stav";
import { naObrazovce } from "../parta2/mimo";
import * as K from "../../components/obchod2/futatsu/kresba";
import { KLIC_MM, KARTA_MM, pxNaMm, rozvrzeniListu, uzkyPauzak } from "./futatsu-miry";

/** Natočení hrnku sdílí výkres a skutečná velikost; začíná jako hrnek v úvodu */
interface Stav {
  a: number;
  lay: string;
  pauzUzky: boolean;
}

/** Rozběhne výkres a skutečnou velikost; `uhelHrnku` je natočení hrnku z úvodu (null = nesáhl na něj) */
export function initVykres(uhelHrnku: () => number | null) {
  const st: Stav = { a: 62, lay: "", pauzUzky: false };
  const skutecna = origami(st);
  vykres(st, uhelHrnku, skutecna);
}

/* ——— Origami: skutečná velikost podle platební karty ——— */
function origami(st: Stav): () => void {
  const karta = document.querySelector<HTMLElement>("#kal-karta");
  const jezdec = document.querySelector<HTMLInputElement>("#kal-sirka");
  const kalTxt = document.querySelector<HTMLOutputElement>("#kal-txt");
  const obal = document.querySelector<HTMLElement>("#skut-obal");
  const pozn = document.querySelector<HTMLElement>("#skut-pozn");
  const souhrn = document.querySelector<HTMLElement>("[data-kal-souhrn]");
  const { ulozeno, pxmm: zKarty } = pxNaMm();
  let pxmm = zKarty;
  /* Kdo už kartu přiložil, vidí, že velikost sedí na milimetr */
  const doladeno = () => {
    if (souhrn) souhrn.textContent = "Doladěno podle karty — změnit";
  };
  if (ulozeno) doladeno();
  if (jezdec) jezdec.value = (pxmm * KARTA_MM).toFixed(1);
  const skutecna = () => {
    if (!obal) return;
    obal.innerHTML = K.velikost(st);
    const svg = obal.firstElementChild as SVGSVGElement | null;
    const w = K.VEL.W * pxmm;
    if (svg) {
      svg.style.width = `${w}px`;
      svg.style.height = `${K.VEL.H * pxmm}px`;
    }
    if (pozn) pozn.hidden = !obal.clientWidth || obal.clientWidth >= w - 1;
  };
  const kal = (ulozit: boolean) => {
    if (!jezdec) return;
    const w = Number(jezdec.value);
    pxmm = w / KARTA_MM;
    if (karta) {
      karta.style.width = `${w}px`;
      karta.style.height = `${(w * 85.6) / KARTA_MM}px`;
    }
    if (kalTxt) kalTxt.textContent = `1 mm = ${pxmm.toFixed(2).replace(".", ",")} px`;
    skutecna();
    if (ulozit) {
      uloz(KLIC_MM, pxmm);
      doladeno();
    }
  };
  jezdec?.addEventListener("input", () => kal(true));
  kal(false);
  if (obal) new ResizeObserver(() => skutecna()).observe(obal);
  return skutecna;
}

/* ——— Výkres, pauzák a kusovník ——— */
function vykres(st: Stav, uhelHrnku: () => number | null, poOtoceni: () => void) {
  const koren = document.querySelector<HTMLElement>("#vykres");
  const list = document.querySelector<HTMLElement>("#dv-list");
  const pauz = document.querySelector<HTMLElement>("#dv-pauz");
  const rozsah = document.querySelector<HTMLInputElement>("#natoceni");
  const rozsahTxt = document.querySelector<HTMLOutputElement>("#natoceni-txt");
  const tlTocit = document.querySelector<HTMLButtonElement>("#roztocit");
  if (!koren || !list || !pauz || !rozsah || !rozsahTxt || !tlTocit) return;
  st.a = Number(rozsah.value) || 62;
  st.lay = list.dataset.lay ?? "";
  st.pauzUzky = pauz.dataset.uzky === "1";
  /** Sáhl už člověk na výkres? Pak už ho úhel hrnku z úvodu nepřepisuje. */
  let dotkl = false;

  /* Zvýraznění dílu: řádek kusovníku ↔ číslo na výkrese ↔ číslo na fotce */
  let pin = "";
  let nad = "";
  const hl = () => {
    const n = nad || pin;
    list.dataset.hl = n;
    pauz.dataset.hl = n;
    koren.querySelectorAll<HTMLElement>(".ft-dil").forEach((r) => r.classList.toggle("je", r.dataset.dil === n));
    koren.querySelectorAll<HTMLElement>(".ft-fb").forEach((b) => b.classList.toggle("je", b.dataset.dil === n));
  };
  const cil = (e: Event) => ((e.target as Element | null)?.closest?.(".ft-dil, .balon, .ft-fb") as HTMLElement | SVGElement | null) ?? null;
  koren.addEventListener("pointerover", (e) => {
    const n = cil(e)?.dataset.dil ?? "";
    if (n !== nad) {
      nad = n;
      hl();
    }
  });
  koren.addEventListener("pointerleave", () => {
    nad = "";
    hl();
  });
  koren.addEventListener("focusin", (e) => {
    nad = cil(e)?.dataset.dil ?? "";
    hl();
  });
  koren.addEventListener("click", (e) => {
    const c = cil(e);
    if (!c) return;
    const n = c.dataset.dil ?? "";
    pin = pin === n ? "" : n;
    hl();
    if (pin && !c.classList.contains("ft-dil")) {
      const radek = koren.querySelector<HTMLElement>(`.ft-dil[data-dil="${n}"]`);
      radek?.scrollIntoView({ block: "nearest", behavior: klid ? "auto" : "smooth" });
    }
  });
  koren.addEventListener("keydown", (e) => {
    const b = (e.target as Element | null)?.closest?.(".balon, .ft-dil");
    if (b && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      b.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    }
  });

  /* Výkres a pauzák: rozvržení podle šířky, otáčení. Místo odměřené předem (futatsu.ts) se po nakreslení pustí. */
  const sestav = () => {
    const lay = rozvrzeniListu(list.clientWidth);
    if (lay !== st.lay) {
      st.lay = lay;
      list.innerHTML = K.list(lay, st);
      list.dataset.lay = lay;
      hl();
    }
    list.style.removeProperty("aspect-ratio");
    const u = uzkyPauzak(pauz.clientWidth);
    if (u !== st.pauzUzky) {
      st.pauzUzky = u;
      pauz.innerHTML = K.pauzak(st, u);
      pauz.dataset.uzky = u ? "1" : "0";
    }
    pauz.style.removeProperty("aspect-ratio");
  };
  let ceka = 0;
  const prekresli = () => {
    ceka = 0;
    const d = K.dyn(st.lay, st);
    const kam: [string, string][] = [["#dv-front", d.front], ["#dv-topd", d.top], ["#dv-botd", d.bot], ["#dvp-izod", K.pauzakDyn(st, st.pauzUzky)]];
    for (const [sel, html] of kam) {
      const el = koren.querySelector(sel);
      if (el) el.innerHTML = html;
    }
    poOtoceni();
  };
  const nastav = (a: number) => {
    st.a = ((a % 360) + 360) % 360;
    const t = Math.round(st.a) % 360;
    rozsah.value = String(t);
    rozsahTxt.textContent = `${String(t).padStart(3, "0")}°`;
    if (!ceka) ceka = requestAnimationFrame(prekresli);
  };
  /* „Roztočit“: smyčka běží, jen když je výkres na obrazovce; mimo ni stojí a při návratu točí dál */
  let toci = 0;
  let posl = 0;
  let tociSe = false;
  let videt = true;
  const krok = (t: number) => {
    if (!toci) return;
    if (posl) nastav(st.a + ((t - posl) / 1000) * 30);
    posl = t;
    toci = videt ? requestAnimationFrame(krok) : 0;
  };
  const stopTocit = () => {
    if (toci) cancelAnimationFrame(toci);
    toci = 0;
    posl = 0;
    tociSe = false;
    tlTocit.setAttribute("aria-pressed", "false");
    tlTocit.textContent = "Roztočit";
  };
  naObrazovce(koren, (je) => {
    videt = je;
    if (je && tociSe && !toci) {
      posl = 0;
      toci = requestAnimationFrame(krok);
    }
  });
  tlTocit.addEventListener("click", () => {
    dotkl = true;
    if (tociSe) return stopTocit();
    tociSe = true;
    tlTocit.setAttribute("aria-pressed", "true");
    tlTocit.textContent = "Zastavit";
    posl = 0;
    toci = requestAnimationFrame(krok);
  });
  rozsah.addEventListener("input", () => {
    dotkl = true;
    stopTocit();
    nastav(Number(rozsah.value));
  });
  document.querySelector<HTMLInputElement>("#koty")?.addEventListener("change", (e) => list.classList.toggle("bez-kot", !(e.target as HTMLInputElement).checked));

  /* Tah do strany otáčí hrnkem na výkrese i na pauzáku */
  const tahni = (el: HTMLElement, kolik: number) => {
    let tah: { x: number; a: number; id: number } | null = null;
    el.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || (e.target as Element).closest(".balon")) return;
      tah = { x: e.clientX, a: st.a, id: e.pointerId };
      dotkl = true;
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* starší prohlížeč: táhne se i bez zachycení */
      }
      stopTocit();
      el.classList.add("tahne");
    });
    el.addEventListener("pointermove", (e) => {
      if (!tah || e.pointerId !== tah.id) return;
      nastav(tah.a + (e.clientX - tah.x) * (kolik / Math.max(300, el.clientWidth)));
    });
    const pust = (e: PointerEvent) => {
      if (tah && e.pointerId === tah.id) {
        tah = null;
        el.classList.remove("tahne");
      }
    };
    el.addEventListener("pointerup", pust);
    el.addEventListener("pointercancel", pust);
    el.addEventListener("lostpointercapture", pust);
  };
  tahni(list, 300);
  tahni(pauz, 360);

  /* Kdo přijde z úvodu, najde výkres natočený jako hrnek, který tam nechal */
  const io = new IntersectionObserver((zaznamy) => {
    if (dotkl || !zaznamy.some((z) => z.isIntersecting)) return;
    const u = uhelHrnku();
    if (u !== null && Math.abs(((u - st.a + 540) % 360) - 180) > 0.5) nastav(u);
  });
  io.observe(koren);

  sestav();
  const ro = new ResizeObserver(() => sestav());
  ro.observe(list);
  ro.observe(pauz);
}
