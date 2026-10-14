/**
 * Úroveň 三 Voda — „Na střed“: vycentrovat hlínu na kruhu
 * (scéna components/zkouska/urovne/Voda.astro, fyzika voda-fyzika.ts).
 *
 * Hrouda leží na kruhu mimo osu a obíhá. Kdo na ni položí ruce (myš nebo
 * prst na hlíně, klávesa H) a drží je u osy v klidu, tomu se hlína stáhne
 * na střed. Voda musí být akorát: suchou hlínu ruce chytají a ta cuká ven,
 * rozmočená zvadne a sesune se. Vodu přidá tlačítko Voda, kbelík, mezerník
 * nebo W. Když hlína běží pod 1,5 mm tři vteřiny, stačí pomalu pustit.
 *
 * Body (voda-fyzika.ts): 100 − 2,2 za každou vteřinu nad 14 − 80 × podíl
 * času s vodou mimo pásmo − 25 za sesunutí; projde, kdo to stihne do 50 s
 * a sesune se mu to nejvýš jednou.
 *
 * Ukazatele: terč vpravo nahoře (tečka obíhá jako hrouda, zlatý oblouk
 * kolem se plní, jak se drží na středu), kapka vlevo (voda) a v záhlaví
 * čas a vyosení.
 */
import type { Uroven, Vysledek } from "../hra";
import { casText } from "../hra";
import * as zvuk from "../../parta2/zvuk";
import { cislo, omez, mix, hladce } from "../../parta2/stav";
import {
  SIRKA, VYSKA, STRED, R_HLAVA, R_HROUDA, MM, TERC, VLHKOMER, CIL_MM,
  obrysHroudy, hladinaVlhkomeru, yVlhkomeru, polomerNaTerci,
} from "../../../components/zkouska/urovne/voda-kresba";
import {
  P, novyStav, krok, zalij, pust, sesun, vyoseni, body, spatneVody, polohaRukou,
  type Stav, type Udalost,
} from "./voda-fyzika";

const SVGNS = "http://www.w3.org/2000/svg";
/** Otáčky kruhu při hře (otáčky za vteřinu) — jen pro oko */
const OTACKY = 1.15;
const STOPA_BODU = 40;
const OBVOD_DRZENI = 2 * Math.PI * (TERC.r + 7);
/** Jak dlouho se hrouda sesouvá, než se znovu usadí (s) */
const SESUV = 1.5;
const f1 = (n: number) => (Math.round(n * 10) / 10).toString();

type Faze = "ceka" | "hra" | "sesuv" | "dohra" | "konec";
type Nalada = "skok" | "radost" | "strach" | "varuje";

interface Castice {
  el: SVGElement;
  t: number;
  doba: number;
  krok: (k: number) => void;
}

export const voda: Uroven = (p) => {
  const koren = p.koren;
  const ac = new AbortController();
  const signal = ac.signal;
  const $ = <T extends Element>(sel: string) => koren.querySelector<T>(sel);
  const svg = $<SVGSVGElement>(".mu-voda-popredi")!;
  const dotyk = $<HTMLElement>(".mu-voda-dotyk")!;
  const kbelikCil = $<HTMLElement>(".mu-voda-kbelik-cil");
  const tlacitko = $<HTMLButtonElement>(".mu-voda-tlacitko");
  const kapka = $<HTMLElement>(".mu-voda-kapka");
  const toci = $<SVGGElement>(".mu-voda-toci");
  const hrouda = $<SVGGElement>(".mu-voda-hrouda")!;
  const obrys = $<SVGPathElement>("#mv3-obrys")!;
  const ryhy = $<SVGGElement>(".mu-voda-ryhy");
  const zahyby = $<SVGGElement>(".mu-voda-zahyby");
  const praskliny = $<SVGGElement>(".mu-voda-praskliny");
  const mokro = $<SVGElement>(".mu-voda-mokro");
  const sucho = $<SVGElement>(".mu-voda-sucho");
  const lesk = $<SVGElement>(".mu-voda-lesk");
  const jiskra = $<SVGElement>(".mu-voda-jiskra");
  const louze = $<SVGCircleElement>(".mu-voda-louze");
  const stin = $<SVGCircleElement>(".mu-voda-stin");
  const zona = $<SVGCircleElement>(".mu-voda-zona");
  const postrik = $<SVGGElement>(".mu-voda-postrik")!;
  const ruce = $<SVGGElement>(".mu-voda-ruce")!;
  const slikrNaRukou = [...koren.querySelectorAll<SVGElement>(".mu-voda-slikr-ruka")];
  const houba = $<SVGGElement>(".mu-voda-houba");
  const houbaZdimani = $<SVGGElement>(".mu-voda-houba-zdimani");
  const hladina = $<SVGPathElement>(".mu-voda-hladina");
  const hladinaLesk = $<SVGPathElement>(".mu-voda-hladina-lesk");
  const vlhkomer = $<SVGGElement>(".mu-voda-vlhkomer");
  const terc = $<SVGGElement>(".mu-voda-terc");
  const tecka = $<SVGCircleElement>(".mu-voda-tecka");
  const stopa = $<SVGPathElement>(".mu-voda-stopa");
  const drzeni = $<SVGCircleElement>(".mu-voda-drzeni");
  const tercCislo = $<SVGTextElement>(".mu-voda-terc-cislo");
  const kbelik = $<SVGSVGElement>(".mu-voda-kbelik-hladina");

  /* ——— Stav ——— */
  /* Stav vzniká hned: hrouda, jak leží pod úvodní kartou, je ta, se kterou se hraje */
  const S: Stav = novyStav();
  let faze: Faze = "ceka";
  let uhel = Math.random() * Math.PI * 2;
  let otacky = 0;
  let raf = 0;
  let minule = 0;
  const casovace = new Set<number>();
  /** Ukazatel na hlíně: id, poloha ve scéně a vzorky pro rychlost */
  let ukazatel: { id: number; x: number; y: number } | null = null;
  let vzorky: { t: number; x: number; y: number }[] = [];
  let klavesaH = false;
  let tlaciloMinule = false;
  let vodaVeFronte = false;
  let ruceVidet = 0;
  let ruceX = STRED.x;
  let ruceY = STRED.y;
  let drhneDo = 0;
  let houbaT = -1;
  let houbaX = 0;
  let houbaY = 0;
  let leskBlesk = 0;
  let zobrW = S.w;
  let vlnaFaze = 0;
  let sesuvT = 0;
  let sesuvUsazeno = false;
  let dohraT = 0;
  let stopaBody: [number, number][] = [];
  let posledniText = "";
  let posledniCislo = "";
  let posledniRekni = -99;
  const rekliKdy = new Map<string, number>();
  const epizody = new Set<string>();
  let bezRukouOd = 0;
  let mimoOsuOd = -1;
  let hotovoCas = 0;
  let varovaniCasu = false;
  const castice: Castice[] = [];

  const vyoseniMm = () => vyoseni(S);
  const cas = (fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      casovace.delete(id);
      fn();
    }, ms);
    casovace.add(id);
  };

  /* ——— Kapka mluví a hýbe se ——— */
  const rekni = (klic: string, text: string, { vzdy = false, odstup = 8 } = {}) => {
    const t = S.cas;
    if (!vzdy && t - posledniRekni < 3.5) return;
    if (!vzdy && t - (rekliKdy.get(klic) ?? -99) < odstup) return;
    posledniRekni = t;
    rekliKdy.set(klic, t);
    p.rekni(text, kapka);
  };
  const nalada = (n: Nalada) => {
    if (!kapka || p.klid) return;
    kapka.classList.remove("skok", "radost", "strach", "varuje");
    void kapka.offsetWidth;
    kapka.classList.add(n);
  };
  /** Jednou za epizodu: hláška se zopakuje, až se stav vrátí do normálu (zrus) */
  const jednou = (klic: string, plati: boolean, zrus: boolean, fn: () => void) => {
    if (plati && !epizody.has(klic)) {
      epizody.add(klic);
      fn();
    } else if (zrus) epizody.delete(klic);
  };

  /* ——— Kresba ——— */
  const stredHroudy = () => {
    const a = p.klid ? 0 : uhel;
    const c = Math.cos(a);
    const s = Math.sin(a);
    return { x: STRED.x + (S.ox * c - S.oy * s) * MM, y: STRED.y + (S.ox * s + S.oy * c) * MM };
  };

  /** Tvar hroudy: při sesouvání se rozteče a pak znovu usadí */
  const tvarHroudy = () => {
    const r = vyoseniMm();
    let R = R_HROUDA * (1 + 0.1 * S.s);
    let vlna = S.s * 1.6;
    let hrbol = Math.min(1, r / 14);
    if (faze === "sesuv") {
      if (!sesuvUsazeno) {
        const k = hladce(omez(sesuvT / (SESUV * 0.6)));
        R = mix(R_HROUDA * 1.1, R_HROUDA * 1.48, k);
        vlna = mix(1.6, 4.2, k);
      } else {
        const k = hladce(omez((sesuvT - SESUV * 0.6) / (SESUV * 0.4)));
        R = mix(R_HROUDA * 1.25, R_HROUDA, k) * (1 + 0.08 * Math.sin(k * Math.PI * 3) * (1 - k));
        vlna = mix(2.4, 0, k);
        hrbol = 1;
      }
    }
    return { R, vlna, hrbol };
  };

  const kresliHroudu = () => {
    const { x, y } = stredHroudy();
    const r = vyoseniMm();
    const { R, vlna, hrbol } = tvarHroudy();
    const a = p.klid ? 0 : uhel;
    hrouda.setAttribute("transform", `translate(${f1(x)} ${f1(y)})`);
    obrys.setAttribute("d", obrysHroudy(R, hrbol, a, vlna));
    ryhy?.setAttribute("transform", `rotate(${f1((a * 180) / Math.PI)})`);
    const suchost = omez((0.36 - S.w) / 0.16);
    const mokrost = omez((S.w - 0.45) / 0.55);
    const sesouvani = faze === "sesuv" && !sesuvUsazeno ? hladce(omez(sesuvT / (SESUV * 0.6))) : 0;
    zahyby?.setAttribute("opacity", f1(0.5 * Math.min(1, r / 9) + 0.3 * sesouvani));
    praskliny?.setAttribute("opacity", f1(0.85 * suchost));
    ryhy?.setAttribute("opacity", f1(1 - 0.85 * sesouvani));
    mokro?.setAttribute("opacity", (0.04 + 0.2 * mokrost + 0.18 * S.s + 0.15 * sesouvani).toFixed(2));
    sucho?.setAttribute("opacity", (0.55 * suchost).toFixed(2));
    lesk?.setAttribute("opacity", omez(0.1 + 0.6 * omez((S.w - 0.25) / 0.55) + 0.35 * leskBlesk + 0.3 * sesouvani).toFixed(2));
    jiskra?.setAttribute("opacity", omez((S.w - 0.5) * 2 + leskBlesk).toFixed(2));
    louze?.setAttribute("r", f1(R + 6 + 20 * S.w + 30 * sesouvani));
    louze?.setAttribute("opacity", (0.25 + 0.55 * S.w).toFixed(2));
    stin?.setAttribute("r", f1(R + 12));
    for (const el of slikrNaRukou) el.setAttribute("opacity", (0.2 + 0.4 * S.w).toFixed(2));
  };

  const kresliRuce = (tlaci: boolean) => {
    if (!ruce) return;
    const naHline = tlaci || ruceVidet > 0.01;
    if (!naHline) {
      ruce.setAttribute("opacity", "0");
      return;
    }
    /* Hlína mimo osu ruce postrkuje — v rytmu obíhání */
    let dx = 0;
    let dy = 0;
    if (!p.klid && tlaci) {
      const { x, y } = stredHroudy();
      dx = (x - STRED.x) * 0.28;
      dy = (y - STRED.y) * 0.28;
    }
    const k = 0.9 + 0.1 * hladce(ruceVidet);
    ruce.setAttribute("transform", `translate(${f1(ruceX + dx)} ${f1(ruceY + dy)}) scale(${k.toFixed(3)})`);
    ruce.setAttribute("opacity", hladce(ruceVidet).toFixed(2));
    ruce.classList.toggle("drhne", S.cas < drhneDo || (tlaci && S.w < P.sucho));
  };

  const kresliUkazatele = () => {
    const r = vyoseniMm();
    /* Vlhkoměr */
    hladina?.setAttribute("d", hladinaVlhkomeru(zobrW, vlnaFaze));
    hladinaLesk?.setAttribute("d", `M-30 ${f1(yVlhkomeru(zobrW) + 7)}H-10`);
    const voda = S.w < P.pasmo[0] ? "sucho" : S.w < 0.36 ? "malo" : S.w > P.mokro ? "moc" : S.w > P.pasmo[1] ? "hodne" : "akorat";
    if (koren.dataset.voda !== voda) koren.dataset.voda = voda;
    /* Terč: tečka obíhá s hroudou, za ní stopa */
    const a = (p.klid ? 0 : uhel) + Math.atan2(S.oy, S.ox);
    const rt = polomerNaTerci(r);
    const tx = Math.cos(a) * rt;
    const ty = Math.sin(a) * rt;
    tecka?.setAttribute("cx", f1(tx));
    tecka?.setAttribute("cy", f1(ty));
    if (!p.klid && faze !== "ceka") {
      stopaBody.push([tx, ty]);
      if (stopaBody.length > STOPA_BODU) stopaBody.shift();
      stopa?.setAttribute("d", stopaBody.length > 1 ? "M" + stopaBody.map(([x, y]) => `${f1(x)} ${f1(y)}`).join("L") : "");
    }
    const dilek = omez(S.drzi / P.drzet) * OBVOD_DRZENI;
    drzeni?.setAttribute("stroke-dasharray", `${f1(dilek)} 999`);
    drzeni?.setAttribute("opacity", S.drzi > 0.02 ? "1" : "0");
    const naStredu = r < CIL_MM ? "ano" : "ne";
    if (koren.dataset.stred !== naStredu) koren.dataset.stred = naStredu;
    const text = `${r < 3 ? cislo(r, 1) : cislo(Math.round(r))} mm`;
    if (text !== posledniCislo && tercCislo) {
      posledniCislo = text;
      tercCislo.textContent = text;
    }
  };

  const kresliHlavu = () => {
    toci?.setAttribute("transform", `rotate(${f1(((p.klid ? 0 : uhel) * 180) / Math.PI)} ${STRED.x} ${STRED.y})`);
  };

  const kresliHoubu = () => {
    if (!houba) return;
    if (houbaT < 0) {
      houba.setAttribute("opacity", "0");
      return;
    }
    const k = houbaT / 0.6;
    const op = k < 0.15 ? k / 0.15 : k > 0.8 ? (1 - k) / 0.2 : 1;
    const zmackni = k > 0.18 && k < 0.62 ? Math.sin(((k - 0.18) / 0.44) * Math.PI) : 0;
    houba.setAttribute("transform", `translate(${f1(houbaX)} ${f1(houbaY - 10 * (1 - Math.min(1, k / 0.15)))}) rotate(-12)`);
    houba.setAttribute("opacity", omez(op).toFixed(2));
    houbaZdimani?.setAttribute("transform", `scale(${(1 + 0.12 * zmackni).toFixed(3)} ${(1 - 0.36 * zmackni).toFixed(3)})`);
  };

  const kresli = (tlaci: boolean) => {
    kresliHlavu();
    kresliHroudu();
    kresliRuce(tlaci);
    kresliHoubu();
    kresliUkazatele();
    if (zona) {
      const blizko = tlaci && polohaRukou(Math.hypot(ruceX - STRED.x, ruceY - STRED.y) / R_HLAVA) > 0.5;
      zona.setAttribute("opacity", faze === "hra" || faze === "sesuv" ? (tlaci ? "0.85" : "0.4") : "0");
      zona.setAttribute("stroke", blizko ? "#F3D27A" : "#F7F1E3");
      zona.setAttribute("stroke-dasharray", blizko ? "none" : "5 7");
    }
  };

  /* ——— Voda ——— */
  const postrikni = (x: number, y: number) => {
    if (p.klid) return;
    for (let i = 0; i < 3; i++) {
      const kapicka = document.createElementNS(SVGNS, "circle");
      const sx = x + (i - 1) * 9 + (Math.random() - 0.5) * 6;
      const sy0 = y - 26;
      const sy1 = y + 4 + Math.random() * 10;
      kapicka.setAttribute("r", "3.6");
      kapicka.setAttribute("fill", "#E3F1F7");
      kapicka.setAttribute("stroke", "#7FB4D8");
      kapicka.setAttribute("stroke-width", "1");
      const zpozdeni = 0.12 + i * 0.07;
      pridejCastici(kapicka, zpozdeni + 0.16, (k) => {
        const t = omez((k * (zpozdeni + 0.16) - zpozdeni) / 0.16);
        kapicka.setAttribute("cx", f1(sx));
        kapicka.setAttribute("cy", f1(mix(sy0, sy1, t * t)));
        kapicka.setAttribute("opacity", t > 0 ? "1" : "0");
        if (k >= 0.97) cakanec(sx, sy1);
      });
    }
  };

  const cakanec = (x: number, y: number) => {
    const kruh = document.createElementNS(SVGNS, "circle");
    kruh.setAttribute("cx", f1(x));
    kruh.setAttribute("cy", f1(y));
    kruh.setAttribute("fill", "none");
    kruh.setAttribute("stroke", "#F4FBFE");
    pridejCastici(kruh, 0.4, (k) => {
      kruh.setAttribute("r", f1(3 + 15 * Math.sqrt(k)));
      kruh.setAttribute("stroke-width", f1(2.4 * (1 - k) + 0.4));
      kruh.setAttribute("opacity", (1 - k).toFixed(2));
    });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + Math.random() * 0.8;
      const d = 12 + Math.random() * 14;
      const sprsk = document.createElementNS(SVGNS, "circle");
      sprsk.setAttribute("r", f1(1.3 + Math.random() * 1.2));
      sprsk.setAttribute("fill", "#E3F1F7");
      pridejCastici(sprsk, 0.38, (k) => {
        const e = 1 - (1 - k) * (1 - k);
        sprsk.setAttribute("cx", f1(x + Math.cos(a) * d * e));
        sprsk.setAttribute("cy", f1(y + Math.sin(a) * d * e - 6 * Math.sin(k * Math.PI)));
        sprsk.setAttribute("opacity", (1 - k * k).toFixed(2));
      });
    }
  };

  const pridejCastici = (el: SVGElement, doba: number, krokCastice: (k: number) => void) => {
    postrik.append(el);
    const c: Castice = { el, t: 0, doba, krok: krokCastice };
    castice.push(c);
    krokCastice(0);
  };

  /** Lesklé! Hvězdičky odlesků nad hotovou hroudou */
  const jiskry = () => {
    if (p.klid) return;
    const { x, y } = stredHroudy();
    const mista: [number, number, number, number][] = [[-30, -36, 0, 1.2], [26, -48, 0.14, 0.8], [-52, 2, 0.26, 0.7], [38, -6, 0.34, 1], [-6, -62, 0.46, 0.6]];
    for (const [dx, dy, zpozdeni, velikost] of mista) {
      const el = document.createElementNS(SVGNS, "path");
      el.setAttribute("d", "M0 -11C1.5 -2.2 2.2 -1.5 11 0C2.2 1.5 1.5 2.2 0 11C-1.5 2.2 -2.2 1.5 -11 0C-2.2 -1.5 -1.5 -2.2 0 -11Z");
      el.setAttribute("fill", "#FFF6D8");
      el.setAttribute("stroke", "#F3D27A");
      el.setAttribute("stroke-width", "1");
      const doba = 0.8 + zpozdeni;
      pridejCastici(el, doba, (k) => {
        const t = omez((k * doba - zpozdeni) / 0.8);
        const v = Math.sin(t * Math.PI);
        el.setAttribute("transform", `translate(${f1(x + dx)} ${f1(y + dy)}) rotate(${f1(t * 80)}) scale(${(v * velikost).toFixed(3)})`);
        el.setAttribute("opacity", v.toFixed(2));
      });
    }
  };

  const vodu = () => {
    if (faze !== "hra") return;
    if (!zalij(S)) {
      vodaVeFronte = true;
      return;
    }
    zvuk.kapka();
    leskBlesk = 1;
    nalada("skok");
    const { x, y } = stredHroudy();
    houbaX = x - 34;
    houbaY = y - 58;
    if (!p.klid) houbaT = 0;
    postrikni(x - 30, y - 30);
    if (kbelik && !p.klid) {
      kbelik.classList.remove("vlni");
      void kbelik.getBoundingClientRect();
      kbelik.classList.add("vlni");
    }
    if (S.w > 0.62 && S.w <= P.pasmo[1]) jednou("lesk", true, false, () => rekni("lesk", "Lesklé! Kde? Tam!"));
  };

  /* ——— Vstup ——— */
  const bodVeScene = (e: PointerEvent) => {
    const b = svg.getBoundingClientRect();
    return { x: ((e.clientX - b.left) / (b.width || 1)) * SIRKA, y: ((e.clientY - b.top) / (b.height || 1)) * VYSKA };
  };

  /** Rychlost rukou: čistý posun za poslední čtvrtvteřinu (chvění prstu se tak vyruší) */
  const rychlostRukou = () => {
    if (vzorky.length < 2) return 0;
    const posledni = vzorky[vzorky.length - 1];
    const prvni = vzorky.find((v) => v.t >= posledni.t - 0.25) ?? vzorky[0];
    return Math.hypot(posledni.x - prvni.x, posledni.y - prvni.y) / Math.max(0.1, posledni.t - prvni.t);
  };

  const pustRuce = () => {
    if (faze !== "hra") return;
    if (pust(S)) {
      hotovo();
      return;
    }
    if (S.drzi > 0.6) rekni("brzo", "Ještě chvilku držet!", { odstup: 5 });
  };

  dotyk.addEventListener(
    "pointerdown",
    (e) => {
      void zvuk.odemkni();
      if (faze !== "hra" || ukazatel) return;
      e.preventDefault();
      try {
        dotyk.setPointerCapture(e.pointerId);
      } catch {
        /* jsdom a starší prohlížeče */
      }
      const b = bodVeScene(e);
      ukazatel = { id: e.pointerId, ...b };
      vzorky = [];
      ruceX = b.x;
      ruceY = b.y;
    },
    { signal },
  );
  dotyk.addEventListener(
    "pointermove",
    (e) => {
      if (!ukazatel || e.pointerId !== ukazatel.id) return;
      const b = bodVeScene(e);
      ukazatel.x = b.x;
      ukazatel.y = b.y;
    },
    { signal },
  );
  const konecUkazatele = (e: PointerEvent) => {
    if (!ukazatel || e.pointerId !== ukazatel.id) return;
    ukazatel = null;
    if (!klavesaH) pustRuce();
  };
  dotyk.addEventListener("pointerup", konecUkazatele, { signal });
  dotyk.addEventListener("pointercancel", konecUkazatele, { signal });
  dotyk.addEventListener("lostpointercapture", konecUkazatele, { signal });
  dotyk.addEventListener("contextmenu", (e) => e.preventDefault(), { signal });

  tlacitko?.addEventListener("click", () => vodu(), { signal });
  kbelikCil?.addEventListener(
    "pointerdown",
    (e) => {
      e.preventDefault();
      vodu();
    },
    { signal },
  );

  const hraBezi = () => (faze === "hra" || faze === "sesuv") && !koren.hidden;
  document.addEventListener(
    "keydown",
    (e) => {
      if (!hraBezi() || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.code === "Space" || e.code === "KeyW") {
        e.preventDefault();
        if (!e.repeat) vodu();
      } else if (e.code === "KeyH") {
        e.preventDefault();
        if (!klavesaH && faze === "hra") {
          klavesaH = true;
          ruceX = STRED.x;
          ruceY = STRED.y;
        }
      }
    },
    { signal },
  );
  document.addEventListener(
    "keyup",
    (e) => {
      if (e.code === "Space" && hraBezi()) e.preventDefault();
      if (e.code === "KeyH" && klavesaH) {
        klavesaH = false;
        if (!ukazatel) pustRuce();
      }
    },
    { signal },
  );
  window.addEventListener(
    "blur",
    () => {
      if (klavesaH) {
        klavesaH = false;
        if (!ukazatel) pustRuce();
      }
    },
    { signal },
  );

  /* ——— Hra ——— */
  const nastavTlaceni = (tlaci: boolean) => {
    if (tlaci === tlaciloMinule) return;
    tlaciloMinule = tlaci;
    zvuk.nastavKruh(0.7, tlaci);
    koren.classList.toggle("mu-voda-tlaci", tlaci);
  };

  const udalosti = (u: Udalost[]) => {
    for (const x of u) {
      if (x === "chyt") {
        zvuk.ton(1200, 900, 0.08, "sawtooth", 0.03);
        drhneDo = S.cas + 0.35;
        nalada("varuje");
        rekni("chyt", "Drhne to! Vodu!", { odstup: 4 });
      } else if (x === "cuk") {
        zvuk.ton(170, 80, 0.09, "sine", 0.12);
        rekni("cuk", "Pomalu! Hlína cítí každé cuknutí.", { odstup: 9 });
      } else if (x === "stred") {
        if (!epizody.has("stred")) {
          epizody.add("stred");
          zvuk.cink();
          nalada("radost");
          rekni("stred", "Na středu. Teď to běží samo.", { vzdy: true });
        }
      } else if (x === "samo") {
        zvuk.furin(1760, 0.08);
        p.zprava("Teď to běží samo — pomalu pusť");
      } else if (x === "sesuv") {
        zacniSesuv();
      }
    }
  };

  const zacniSesuv = () => {
    faze = "sesuv";
    sesuvT = 0;
    sesuvUsazeno = false;
    zvuk.zuch();
    nalada("strach");
    p.zprava("Sesunulo se to!");
    if (S.sesuvy === 0) rekni("sesuv", "Moc vody! Hlína zvadla. Znovu — a s vodou opatrně.", { vzdy: true });
  };

  const hotovo = () => {
    faze = "dohra";
    hotovoCas = S.cas;
    dohraT = 0;
    nastavTlaceni(false);
    zvuk.nalezeno();
    nalada("radost");
    leskBlesk = 1;
    jiskry();
    terc?.classList.add("zari");
    rekni("hotovo", "Lesklé! A rovné.", { vzdy: true });
    cas(() => skonci(true, "hotovo"), p.klid ? 400 : 1300);
  };

  const skonci = (proslo: boolean, duvod: "hotovo" | "cas" | "sesuvy") => {
    if (faze === "konec") return;
    faze = "konec";
    cancelAnimationFrame(raf);
    zvuk.nastavKruh(0, false);
    koren.classList.remove("mu-voda-tlaci");
    const T = proslo ? hotovoCas : S.cas;
    const b = body(S, T, proslo);
    const akorat = Math.round((1 - spatneVody(S)) * 100);
    const veta = !proslo
      ? duvod === "sesuvy"
        ? "Hlína uplavala. Zkusíme to znova?"
        : "Pořád to kmitá. Zkusíme to znova?"
      : b >= 85
        ? "Ani se nehne. Jako hladina rybníka."
        : b >= 65
          ? "Skoro na středu. Hlína to odpustí."
          : "Trochu to kmitá. Ale točit se z toho dá.";
    const udaje: [string, string][] = [
      ["Čas", casText(T * 1000, true)],
      ["Voda akorát", `${akorat} %`],
      ["Sesunutí", `${S.sesuvy}×`],
    ];
    if (!proslo && duvod === "cas") udaje.splice(1, 0, ["Ke středu chybělo", `${cislo(Math.max(0, vyoseniMm() - CIL_MM), 1)} mm`]);
    const v: Vysledek = { body: b, proslo, veta, udaje };
    p.konec(v);
  };

  const hlidej = (tlaci: boolean, odOsy: number) => {
    const w = S.w;
    jednou("sucho", w < 0.33 && faze === "hra", w > 0.45, () => {
      nalada("varuje");
      rekni("sucho", "Drhne to! Vodu!", { odstup: 4 });
    });
    jednou("mokro", w > P.mokro, w < 0.7, () => {
      nalada("strach");
      rekni("mokro", "Moc vody! Hlína už plave.", { odstup: 5 });
    });
    jednou("plave", S.s > 0.55, S.s < 0.2, () => rekni("plave", "Ještě chvíli a sesune se to!", { vzdy: true }));
    if (tlaci) bezRukouOd = S.cas;
    else if (S.cas - bezRukouOd > 5) {
      bezRukouOd = S.cas;
      rekni("bezRukou", "Sama se nevycentruje. Ruce na hlínu!", { odstup: 12 });
    }
    if (tlaci && odOsy > P.zonaDo) {
      if (mimoOsuOd < 0) mimoOsuOd = S.cas;
      else if (S.cas - mimoOsuOd > 1.2) rekni("mimo", "Víc doprostřed. Tam, kde se nic nehýbe.", { odstup: 9 });
    } else mimoOsuOd = -1;
    if (!varovaniCasu && S.cas > P.limit - 10) {
      varovaniCasu = true;
      p.zprava("Ještě deset vteřin");
    }
  };

  const ukazatelHud = () => {
    const r = vyoseniMm();
    const text = `${casText(S.cas * 1000)} · střed ${r < 3 ? cislo(r, 1) : cislo(Math.round(r))} mm`;
    if (text !== posledniText) {
      posledniText = text;
      p.ukazatel(text);
    }
  };

  const simuluj = (dt: number) => {
    /* Kde jsou ruce a jak se hýbou */
    let tlaci = false;
    let odOsy = 0;
    let rychlost = 0;
    if (klavesaH) {
      tlaci = true;
      ruceX = STRED.x;
      ruceY = STRED.y;
    } else if (ukazatel) {
      ruceX = ukazatel.x;
      ruceY = ukazatel.y;
      vzorky.push({ t: S.cas, x: ruceX, y: ruceY });
      while (vzorky.length > 2 && vzorky[1].t < S.cas - 0.3) vzorky.shift();
      odOsy = Math.hypot(ruceX - STRED.x, ruceY - STRED.y) / R_HLAVA;
      rychlost = rychlostRukou();
      tlaci = odOsy <= P.naHline;
      if (!tlaci) rekni("naHlinu", "Ruce na hlínu, ne na kruh!", { odstup: 6 });
    }
    ruceVidet = omez(ruceVidet + (klavesaH || ukazatel ? 8 : -6) * dt);
    nastavTlaceni(tlaci);
    if (vodaVeFronte && S.pauzaVody <= dt) {
      vodaVeFronte = false;
      S.pauzaVody = 0;
      vodu();
    }
    const u = krok(S, { tlaci, odOsy, rychlost }, dt);
    udalosti(u);
    if (faze !== "hra") return tlaci;
    hlidej(tlaci, odOsy);
    if (S.cas >= P.limit) {
      /* Kdo zrovna drží hotový střed, tomu se to počítá, i když nestihl pustit */
      if (pust(S)) {
        hotovo();
        return false;
      }
      nastavTlaceni(false);
      faze = "dohra";
      cas(() => skonci(false, "cas"), 500);
    }
    return tlaci;
  };

  const smycka = (ted: number) => {
    raf = requestAnimationFrame(smycka);
    const dt = Math.min(0.05, Math.max(0, (ted - minule) / 1000));
    minule = ted;
    let tlaci = false;
    if (faze === "hra") tlaci = simuluj(dt);
    else if (faze === "sesuv") {
      S.cas += dt;
      sesuvT += dt;
      ruceVidet = omez(ruceVidet - 6 * dt);
      if (!sesuvUsazeno && sesuvT >= SESUV * 0.6) {
        sesuvUsazeno = true;
        sesun(S);
        stopaBody = [];
        zvuk.hnet();
        if (S.sesuvy >= 2) {
          faze = "dohra";
          nastavTlaceni(false);
          cas(() => skonci(false, "sesuvy"), 700);
        }
      }
      if (faze === "sesuv" && sesuvT >= SESUV) {
        faze = "hra";
        epizody.delete("stred");
      }
      nastavTlaceni(false);
    } else if (faze === "dohra") {
      dohraT += dt;
      ruceVidet = omez(ruceVidet - 5 * dt);
      /* Po úspěchu hrouda doběhne na střed úplně */
      if (hotovoCas > 0) {
        S.ox *= Math.exp(-4 * dt);
        S.oy *= Math.exp(-4 * dt);
      }
    }
    if (faze !== "ceka") {
      otacky = faze === "dohra" && hotovoCas === 0 ? Math.max(0, otacky - dt) : Math.min(1, otacky + dt / 0.8);
      uhel += otacky * OTACKY * Math.PI * 2 * dt;
    }
    houbaT = houbaT < 0 ? -1 : houbaT + dt > 0.6 ? -1 : houbaT + dt;
    leskBlesk = Math.max(0, leskBlesk - dt / 0.7);
    zobrW += (S.w - zobrW) * Math.min(1, dt * 9);
    if (!p.klid) vlnaFaze += dt * 3.2;
    for (let i = castice.length - 1; i >= 0; i--) {
      const c = castice[i];
      c.t += dt;
      const k = Math.min(1, c.t / c.doba);
      c.krok(k);
      if (k >= 1) {
        c.el.remove();
        castice.splice(i, 1);
      }
    }
    kresli(tlaci);
    if (faze === "hra" || faze === "sesuv") ukazatelHud();
  };

  /* ——— Výchozí stav: scéna zůstává z minulého pokusu ——— */
  const vychozi = () => {
    postrik.replaceChildren();
    castice.length = 0;
    koren.classList.remove("mu-voda-tlaci");
    delete koren.dataset.voda;
    delete koren.dataset.stred;
    kapka?.classList.remove("skok", "radost", "strach", "varuje");
    terc?.classList.remove("zari");
    vlhkomer?.classList.remove("zari");
    kbelik?.classList.remove("vlni");
    ruce.classList.remove("drhne");
    ruce.setAttribute("opacity", "0");
    houba?.setAttribute("opacity", "0");
    zona?.setAttribute("opacity", "0");
    stopa?.setAttribute("d", "");
    drzeni?.setAttribute("opacity", "0");
    posledniCislo = "";
    kresli(false);
  };
  vychozi();

  return {
    start() {
      if (faze !== "ceka" || signal.aborted) return;
      faze = "hra";
      stopaBody = [];
      minule = performance.now();
      zvuk.nastavKruh(0.7, false);
      rekni("start", "Ruce doprostřed. A pak ani hnout.", { vzdy: true });
      ukazatelHud();
      raf = requestAnimationFrame(smycka);
    },
    stop() {
      ac.abort();
      cancelAnimationFrame(raf);
      for (const id of casovace) window.clearTimeout(id);
      casovace.clear();
      ukazatel = null;
      klavesaH = false;
      if (faze !== "ceka") zvuk.nastavKruh(0, false);
      if (faze !== "konec") faze = "konec";
    },
  };
};
