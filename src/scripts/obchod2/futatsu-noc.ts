/**
 * Futatsu: noční kapitoly stránky.
 *
 *   initOhen   三 Oheň — pálicí křivka je jezdec (tah, klávesy, zastavení,
 *              „Zapálit pec“). S hodinou výpalu se mění žár v komoře,
 *              hrnek v zavřené peci ztmavne a pak se rozpálí, glazura
 *              roztaje (futatsu-nastav { vypal }), žároměrky se ohnou
 *              a při chladnutí praská krakelé: jiskřička, a když je na
 *              webu zapnutý zvuk, tiché cinknutí. Pec k tomu hučí podle žáru.
 *   initCas    四 Čas — jezdec a malé pohledy: krakelé tmavne čajem
 *   initZaver  závěr — šátek se kolem hrnku zaváže, když Futatsu leží
 *              v šátku (třída v-satku od satek.ts), a rozváže, když ho vyndáš
 *
 * Každá je bezpečná, když její sekce na stránce není. Posluchače visí
 * na prvcích sekce, takže se s obsahem při přechodu stránky uklidí.
 * Barvy a tvary počítají kresby (ohen.ts, cas.ts, furoshiki.ts) — skript
 * je jen přepisuje prvkům s data-z, data-c a data-f.
 *
 * Modul se stahuje, až se kapitola blíží (futatsu.ts, priblizeni.ts), a každá
 * kapitola se rozběhne zvlášť. Přehrávaný výpal se mimo obrazovku zastaví
 * a při návratu pokračuje, kde byl; šátek v závěru se mimo obrazovku
 * nezavazuje pomalu, ale rovnou.
 */
import { klid, omez } from "../parta2/stav";
import * as zvuk from "../parta2/zvuk";
import { naObrazovce } from "../parta2/mimo";
import { obrys } from "../../components/obchod2/futatsu/podobizna";
import { stavVypalu, barvyVypalu, kuzely, fazeVypalu, stinZarD, CINKNUTI, PASKY, kxPasek, kyPasek, hodinaZ, NADHLED_OHEN } from "../../components/obchod2/futatsu/ohen";
import type { Pasek } from "../../components/obchod2/futatsu/ohen";
import { barvaZaru, silaZaru, teplotaV, T_KONEC } from "../../components/dilna/kresba/krivka";
import { barvyStari, stariZ } from "../../components/obchod2/futatsu/cas";
import { satekTvary, NADHLED_SATEK } from "../../components/obchod2/futatsu/furoshiki";

type Atributy = Record<string, string>;
const zapis = (el: Element, a: Atributy | undefined) => {
  if (a) for (const k in a) el.setAttribute(k, a[k]);
};
const cislo = (n: number) => Math.round(n).toLocaleString("cs-CZ");

/** Otočený hrnek: obrys pro záři nebo masku se musí otočit s ním (s předponou, je-li dána) */
function priOtoceni(hrnek: HTMLElement | null, nadhled: number, obrysy: Element[], sPredponou: [Element[], (d: string) => string] = [[], (d) => d]) {
  hrnek?.addEventListener("futatsu-otoc", (e) => {
    const u = (e as CustomEvent<{ uhel?: number }>).detail?.uhel;
    if (typeof u !== "number" || !Number.isFinite(u)) return;
    const d = obrys({ uhel: u, nadhled });
    for (const p of obrysy) p.setAttribute("d", d);
    const [prvky, sloz] = sPredponou;
    for (const p of prvky) p.setAttribute("d", sloz(d));
  });
}

/* ═══════════════ 三 Oheň ═══════════════ */

/** Tiché „ting“: krátký sinus s alikvótou, jen když zvuk webu hraje */
function cink() {
  const a = zvuk.audio();
  if (!a || a.ctx.state !== "running") return;
  const { ctx, vystup } = a;
  const t = ctx.currentTime + 0.01;
  const f0 = 2500 + Math.random() * 2300;
  for (const [k, g, doba] of [[1, 0.045, 0.55], [2.71, 0.014, 0.22]] as [number, number, number][]) {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = f0 * k;
    const e = ctx.createGain();
    e.gain.setValueAtTime(0.0001, t);
    e.gain.exponentialRampToValueAtTime(g, t + 0.004);
    e.gain.exponentialRampToValueAtTime(0.0001, t + doba);
    o.connect(e).connect(vystup);
    o.start(t);
    o.stop(t + doba + 0.05);
  }
}

export function initOhen() {
  const sekce = document.querySelector<HTMLElement>("#ohen[data-ohen]");
  if (!sekce) return;
  const pec = sekce.querySelector<HTMLElement>(".ftn-pec");
  const krivka = sekce.querySelector<HTMLElement>("[data-krivka]");
  if (!pec || !krivka) return;
  const hrnek = sekce.querySelector<HTMLElement>(".ftn-pec-hrnek");
  const kuzelyG = sekce.querySelector<SVGGElement>(".fto-kuzely");
  const teplota = sekce.querySelector<HTMLElement>("[data-teplota]");
  const faze = sekce.querySelector<HTMLElement>("[data-faze]");
  const oznam = sekce.querySelector<HTMLElement>("[data-oznam]");
  const tlHrat = sekce.querySelector<HTMLButtonElement>("[data-hrat]");
  const pecinka = sekce.querySelector<HTMLElement>("[data-pecinka]");
  let repliky: string[] = [];
  try {
    repliky = JSON.parse(sekce.querySelector("[data-pecinka-repliky]")?.textContent ?? "[]");
  } catch {
    repliky = [];
  }
  const zastavky = [...sekce.querySelectorAll<HTMLElement>(".ftn-zastavka")];
  const tlZastavek = zastavky.map((z) => z.querySelector<HTMLButtonElement>("button"));
  const hodiny = tlZastavek.map((b) => Number(b?.dataset.h ?? 0));
  const jiskry = [...sekce.querySelectorAll<SVGGElement>(".fto-k-jiskra")];
  const kurzory: [Pasek, SVGGElement | null, SVGPathElement | null][] = [
    [PASKY.siroky, sekce.querySelector<SVGGElement>(".fto-kr-kurzor"), sekce.querySelector<SVGPathElement>(".fto-kr-kurzor-cara")],
    [PASKY.uzky, sekce.querySelector<SVGGElement>(".fto-ku-kurzor"), sekce.querySelector<SVGPathElement>(".fto-ku-kurzor-cara")],
  ];
  const uzky = window.matchMedia("(max-width: 640px)");
  sekce.classList.add("s-js");

  /* Prvky, které se mění s teplotou; žároměrky se při ohýbání překreslí celé */
  let dyn = [...sekce.querySelectorAll<Element>("[data-z]")];
  let h = 0;
  let cil = 0;
  let posledniVypal = -1;
  let posledniOhnuti = -1;
  let aktivni = -1;
  let videt = false;
  /** Je kapitola na obrazovce? Jen tehdy běží smyčka (přehrávání i dojezd) */
  let naDosah = true;
  let hraje = false;
  let pauza = 0;
  let smycka = 0;
  let cas = 0;

  const kresli = (hh: number, predtim: number) => {
    const s = stavVypalu(hh);
    const Z = barvyVypalu(s);
    if (kuzelyG && Math.abs(s.ohnuti - posledniOhnuti) > 0.012) {
      kuzelyG.innerHTML = kuzely(s);
      posledniOhnuti = s.ohnuti;
      dyn = [...sekce.querySelectorAll<Element>("[data-z]")];
    }
    for (const el of dyn) zapis(el, Z[el.getAttribute("data-z") ?? ""]);
    const g = silaZaru(s.T);
    pec.style.setProperty("--fto-jas", (1 - s.tma).toFixed(3));
    sekce.style.setProperty("--zar", g.toFixed(3));
    sekce.style.setProperty("--zar-barva", barvaZaru(Math.max(s.T, 560)));
    if (teplota) teplota.textContent = cislo(s.T);
    const nazevFaze = fazeVypalu(hh);
    if (faze && faze.textContent !== nazevFaze) faze.textContent = nazevFaze;
    krivka.setAttribute("aria-valuenow", hh.toFixed(2));
    krivka.setAttribute("aria-valuetext", `${cislo(s.T)} °C, ${nazevFaze}`);
    for (const [L, k, cara] of kurzory) {
      const x = kxPasek(L, hh);
      const y = kyPasek(L, teplotaV(hh));
      k?.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
      cara?.setAttribute("d", `M0 0 V${(L.y0 - y).toFixed(1)}`);
    }
    /* Glazura se taví: podobizna se překreslí, jen když se opravdu změní */
    if (hrnek && (Math.abs(s.vypal - posledniVypal) >= 0.02 || ((s.vypal === 0 || s.vypal === 1) && s.vypal !== posledniVypal))) {
      posledniVypal = s.vypal;
      hrnek.dataset.vypal = s.vypal.toFixed(2);
      hrnek.dispatchEvent(new CustomEvent("futatsu-nastav", { detail: { vypal: s.vypal } }));
    }
    /* Krakelé praská, když čas jde dopředu přes chvíli cinknutí */
    if (hh > predtim) {
      CINKNUTI.forEach((c, i) => {
        if (predtim < c && hh >= c) {
          const j = jiskry[i % Math.max(1, jiskry.length)];
          if (j && !klid) {
            j.classList.remove("cinkne");
            void j.getBoundingClientRect();
            j.classList.add("cinkne");
          }
          cink();
        }
      });
    }
    /* Zastavení, u kterého pec zrovna je */
    let i = 0;
    for (let k = 0; k < hodiny.length; k++) if (hodiny[k] <= hh + 0.02) i = k;
    if (i !== aktivni) {
      aktivni = i;
      zastavky.forEach((z, k) => z.classList.toggle("ted", k === i));
      tlZastavek.forEach((b, k) => b?.setAttribute("aria-pressed", k === i ? "true" : "false"));
      if (pecinka && repliky[i]) pecinka.textContent = repliky[i];
      const b = tlZastavek[i];
      if (oznam && b) oznam.textContent = `${b.querySelector("span")?.textContent ?? ""}, ${cislo(teplotaV(hodiny[i]))} °C`;
    }
    if (videt) zvuk.nastavPec(g * 0.6);
  };

  const stopHrat = () => {
    hraje = false;
    pauza = 0;
    if (tlHrat) {
      tlHrat.setAttribute("aria-pressed", "false");
      tlHrat.innerHTML = h >= T_KONEC - 0.01 ? `<span aria-hidden="true">↺</span> Znovu` : `<span aria-hidden="true">▶</span> Zapálit pec`;
    }
  };

  /* Jedna smyčka pro přejezd k zastavení i pro přehrávání celého výpalu */
  const krok = (t: number) => {
    const dt = Math.min(0.05, cas ? (t - cas) / 1000 : 0.016);
    cas = t;
    const predtim = h;
    if (hraje) {
      if (pauza > 0) pauza -= dt;
      else {
        h = Math.min(T_KONEC, h + 1.15 * dt);
        const dalsi = hodiny.find((x) => x > predtim + 1e-6 && x <= h);
        if (dalsi !== undefined && dalsi < T_KONEC) {
          h = dalsi;
          pauza = 1.8;
        }
      }
      cil = h;
      kresli(h, predtim);
      if (h >= T_KONEC) stopHrat();
    } else {
      const d = cil - h;
      if (Math.abs(d) < 0.004) h = cil;
      else {
        let o = d * Math.min(1, dt * 3.4);
        const max = 9 * dt;
        if (Math.abs(o) > max) o = Math.sign(o) * max;
        h += o;
      }
      kresli(h, predtim);
    }
    if ((hraje || h !== cil) && naDosah) smycka = requestAnimationFrame(krok);
    else {
      smycka = 0;
      cas = 0;
    }
  };
  const rozjed = () => {
    if (!smycka) {
      cas = 0;
      smycka = requestAnimationFrame(krok);
    }
  };
  /** Přejede (nebo při omezeném pohybu skočí) na hodinu hh */
  const jedNa = (hh: number) => {
    cil = omez(hh, 0, T_KONEC);
    if (klid) {
      const predtim = h;
      h = cil;
      kresli(h, predtim);
      return;
    }
    rozjed();
  };
  /** Rovnou na hodinu — tah a klávesy */
  const hned = (hh: number) => {
    const predtim = h;
    h = cil = omez(hh, 0, T_KONEC);
    kresli(h, predtim);
  };

  tlZastavek.forEach((b, i) =>
    b?.addEventListener("click", () => {
      stopHrat();
      jedNa(hodiny[i]);
    }),
  );
  if (tlHrat) tlHrat.addEventListener("click", () => {
    if (hraje) return stopHrat();
    if (h >= T_KONEC - 0.01) hned(0);
    if (klid) {
      /* Bez pohybu: o zastavení dál */
      const dalsi = hodiny.find((x) => x > h + 0.02);
      jedNa(dalsi ?? T_KONEC);
      tlHrat.innerHTML = dalsi === undefined || dalsi >= T_KONEC ? `<span aria-hidden="true">↺</span> Znovu` : `<span aria-hidden="true">▶</span> Dál`;
      return;
    }
    hraje = true;
    pauza = 0;
    tlHrat.setAttribute("aria-pressed", "true");
    tlHrat.innerHTML = `<span aria-hidden="true">❚❚</span> Zastavit`;
    rozjed();
  });

  /* Tah po křivce */
  let tah: number | null = null;
  const zPolohy = (e: PointerEvent) => {
    const r = krivka.getBoundingClientRect();
    if (!r.width) return h;
    return hodinaZ(uzky.matches ? PASKY.uzky : PASKY.siroky, (e.clientX - r.left) / r.width);
  };
  krivka.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    tah = e.pointerId;
    try {
      krivka.setPointerCapture(e.pointerId);
    } catch {
      /* starší prohlížeč: táhne se i bez zachycení */
    }
    krivka.classList.add("tahne");
    stopHrat();
    hned(zPolohy(e));
  });
  krivka.addEventListener("pointermove", (e) => {
    if (tah === e.pointerId) hned(zPolohy(e));
  });
  const pust = (e: PointerEvent) => {
    if (tah !== e.pointerId) return;
    tah = null;
    krivka.classList.remove("tahne");
  };
  krivka.addEventListener("pointerup", pust);
  krivka.addEventListener("pointercancel", pust);
  krivka.addEventListener("lostpointercapture", pust);
  krivka.addEventListener("keydown", (e) => {
    const krokH = e.shiftKey ? 1 : 0.25;
    const kam: Record<string, number> = {
      ArrowRight: h + krokH,
      ArrowUp: h + krokH,
      ArrowLeft: h - krokH,
      ArrowDown: h - krokH,
      PageUp: h + 2,
      PageDown: h - 2,
      Home: 0,
      End: T_KONEC,
    };
    if (!(e.key in kam)) return;
    e.preventDefault();
    stopHrat();
    hned(kam[e.key]);
  });

  priOtoceni(hrnek, NADHLED_OHEN, [...sekce.querySelectorAll(".fto-k-obrys")], [[...sekce.querySelectorAll(".fto-k-stinzar")], stinZarD]);

  /* Pec hučí jen, když je na ni vidět */
  new IntersectionObserver(([e]) => {
    videt = e.isIntersecting;
    zvuk.nastavPec(videt ? silaZaru(teplotaV(h)) * 0.6 : 0);
  }).observe(pec);
  /* Mimo obrazovku se výpal zastaví (smyčka v krok), při návratu jede dál, kde byl */
  naObrazovce(sekce, (je) => {
    naDosah = je;
    if (je && (hraje || h !== cil)) rozjed();
  });

  kresli(h, h);
}

/* ═══════════════ 四 Čas ═══════════════ */

export function initCas() {
  const sekce = document.querySelector<HTMLElement>("#cas[data-cas]");
  if (!sekce) return;
  const jezdec = sekce.querySelector<HTMLInputElement>("[data-stari]");
  if (!jezdec) return;
  const popis = sekce.querySelector<HTMLOutputElement>("[data-stari-popis]");
  const tlacitka = [...sekce.querySelectorAll<HTMLButtonElement>(".ftn-stari-z")];
  const texty = [...sekce.querySelectorAll<HTMLElement>(".ftn-stari-text")];
  const dyn = [...sekce.querySelectorAll<Element>(".ftn-shora [data-c]")];
  const hodnoty = tlacitka.map((b) => Number(b.dataset.v));
  sekce.classList.add("s-js");

  let aktivni = -1;
  const kresli = () => {
    const v = Number(jezdec.value);
    const st = stariZ(v);
    const C = barvyStari(st.stari, st.caj);
    for (const el of dyn) zapis(el, C[el.getAttribute("data-c") ?? ""]);
    if (popis) popis.textContent = st.popis;
    jezdec.setAttribute("aria-valuetext", st.popis);
    let i = 0;
    for (let k = 0; k < hodnoty.length; k++) if (hodnoty[k] <= v + 0.5) i = k;
    if (i !== aktivni) {
      aktivni = i;
      tlacitka.forEach((b, k) => {
        b.classList.toggle("ted", k === i);
        b.setAttribute("aria-pressed", k === i ? "true" : "false");
      });
      texty.forEach((t, k) => t.classList.toggle("ted", k === i));
    }
  };

  /* Klik na malý pohled: jezdec dojede plynule */
  let smycka = 0;
  let od = 0;
  let kam = 0;
  let start = 0;
  const DOBA = 650;
  const krok = (t: number) => {
    if (!start) start = t;
    const u = omez((t - start) / DOBA);
    const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
    jezdec.value = String(Math.round(od + (kam - od) * e));
    kresli();
    smycka = u < 1 ? requestAnimationFrame(krok) : 0;
  };
  tlacitka.forEach((b) =>
    b.addEventListener("click", () => {
      kam = Number(b.dataset.v);
      if (klid) {
        jezdec.value = String(kam);
        kresli();
        return;
      }
      od = Number(jezdec.value);
      start = 0;
      if (!smycka) smycka = requestAnimationFrame(krok);
    }),
  );
  jezdec.addEventListener("input", () => {
    if (smycka) cancelAnimationFrame(smycka);
    smycka = 0;
    kresli();
  });
  kresli();
}

/* ═══════════════ 結 Závěr ═══════════════ */

export function initZaver() {
  const sekce = document.querySelector<HTMLElement>("#zaver[data-zaver]");
  if (!sekce) return;
  const satek = sekce.querySelector<HTMLElement>(".ftn-satek");
  if (!satek) return;
  const kus = sekce.querySelector<HTMLElement>("[data-kus]");
  const hrnek = sekce.querySelector<HTMLElement>(".ftn-satek-hrnek");
  const prazdny = sekce.querySelector<HTMLElement>("[data-zaver-prazdny]");
  const plny = sekce.querySelector<HTMLElement>("[data-zaver-plny]");
  const dyn = [...sekce.querySelectorAll<Element>("[data-f]")];

  let t = 0;
  let cil = 0;
  let od = 0;
  let start = 0;
  let doba = 1;
  let smycka = 0;
  /** Je závěr na obrazovce? Mimo ni se šátek nezavazuje pomalu, ale rovnou */
  let videt = false;
  naObrazovce(sekce, (je) => (videt = je));

  const kresli = (tt: number) => {
    const A = satekTvary(tt);
    for (const el of dyn) zapis(el, A[el.getAttribute("data-f") ?? ""]);
    if (kus) kus.style.opacity = A.kus.opacity;
  };
  const krok = (cas: number) => {
    if (!start) start = cas;
    const u = omez((cas - start) / doba);
    t = od + (cil - od) * u;
    kresli(t);
    smycka = u < 1 ? requestAnimationFrame(krok) : 0;
  };
  /** Šátek podle toho, jestli Futatsu leží v šátku — stejně jako satek.ts (třída v-satku) */
  const podleSatku = (animovat: boolean) => {
    const je = satek.classList.contains("v-satku");
    if (prazdny) prazdny.hidden = je;
    if (plny) plny.hidden = !je;
    /* Zavázaný hrnek je schovaný v šátku: neotáčí se a klávesnice na něj nejde */
    if (hrnek) {
      hrnek.tabIndex = je ? -1 : 0;
      if (je) hrnek.setAttribute("aria-hidden", "true");
      else hrnek.removeAttribute("aria-hidden");
    }
    const novy = je ? 1 : 0;
    if (novy === cil && (smycka || t === cil)) return;
    cil = novy;
    if (!animovat || klid || !videt) {
      if (smycka) cancelAnimationFrame(smycka);
      smycka = 0;
      t = cil;
      kresli(t);
      return;
    }
    od = t;
    start = 0;
    /* Zavázat trvá chvilku, rozvázat je rychlejší */
    doba = (cil ? 1500 : 1100) * Math.max(0.35, Math.abs(cil - od));
    if (!smycka) smycka = requestAnimationFrame(krok);
  };
  new MutationObserver(() => podleSatku(true)).observe(satek, { attributes: true, attributeFilter: ["class"] });
  priOtoceni(hrnek, NADHLED_SATEK, [...sekce.querySelectorAll(".ftz-obrys")]);

  cil = -1;
  podleSatku(false);
}
