/**
 * Úroveň 二 Kiku-neri — hnětení do rytmu (components/zkouska/urovne/
 * Hneteni.astro, kresba v hneteni-kresba.ts, píseň v hneteni-noty.ts).
 *
 * Hraje se jako taiko: nahoře po dráze jedou zprava noty k terči a ve
 * chvíli, kdy jsou v něm, se udeří. Rumělková s dlaní je Tlač, indigová se
 * šipkou je Otoč, velké se zlatým lemem stojí na koncích frází. Na konci
 * přijede žlutý válec — „Bublinka utíká“ — a tlačí se, co to dá.
 *
 *   ±50 ms     Výborně
 *   ±110 ms    Dobře
 *   jinak      Vedle — o 110–150 ms dřív, špatná plocha, nebo nota projede
 *              terčem o víc než 110 ms bez úderu. Úder daleko od noty se
 *              nepočítá vůbec, jen plácne do hlíny.
 *
 *   zásahy = (výborně + 0,6 · dobře) / počet not        (válec se nepočítá)
 *   body   = zásahy · 100 + za válec až 4 navíc (úder od dvanáctého dál)
 *   prošlo = zásahy aspoň 40 %
 *
 * Hodiny: když hraje zvuk, jde čas písně z hodin AudioContextu (přes
 * getOutputTimestamp, tedy to, co je právě slyšet, a vyhlazeně, ať se noty
 * neškubou) a doprovod se plánuje přesně dopředu. Bez zvuku, nebo když
 * se zvuk uprostřed ztlumí, jede čas z performance.now() a hraje se
 * potichu — noty, taktové čáry a pulzující terč stačí.
 *
 * Hrouda: tlač ji zmáčkne a pruží zpátky, otoč ji pootočí. Za zásahy na
 * čele roste květ ze čtyřiceti záhybů (dokonalá hra = celý květ), Bublinku
 * zásahy vytlačují k okraji a minutí ji vrací zpátky a nechává v hlíně
 * bublinky; každý čtvrtý zásah v řadě jednu vytlačí. Když to projde,
 * Bublinka na konci vyskočí a uletí.
 *
 * Ovládání: dvě velké plochy pod scénou (pointerdown, ne click — kvůli
 * zpoždění), z klávesnice F, J a mezerník tlačí, D, K a Enter otáčí.
 *
 * Na telefonu (kvalita.ts) prskne z hroudy a z bublin polovina hlíny.
 */
import type { Uroven, Vysledek } from "../hra";
import * as zvuk from "../../parta2/zvuk";
import { cislo, mix, omez, SVGNS } from "../../parta2/stav";
import { castic } from "../../parta2/kvalita";
import { CARY, DOBA, HUDBA, KONEC, NOTY, ODPOCET, POCET, VALEC, VALEC_DOST, ZACATKY } from "./hneteni-noty";
import type { Nota, Typ, Udalost } from "./hneteni-noty";
import {
  BUBLINKA, BUBLINY, CESTA_BUBLINKY, DRAHA, HROUDA, NAKLON_BUBLINKY, PLATKU, PONOR, RYCHLOST, TERC_X, posunyReliefu,
} from "../../../components/zkouska/urovne/hneteni-kresba";

type Soud = "vyborne" | "dobre" | "vedle";
type Stav = "ceka" | "hra" | "dohra" | "konec";

/** Okna v sekundách */
const VYBORNE = 0.05;
const DOBRE = 0.11;
const VEDLE = 0.15;
/** Od Začít do první doby odpočtu */
const PREDSTIH = 0.6;
/** Válec přijímá údery i kousek před a po */
const VALEC_REZERVA = 0.06;
/** O kolik se hrouda pootočí za trefené otoč: celá píseň dokonale = jedna otáčka */
const OTOCKA = (2 * Math.PI) / NOTY.filter((n) => n.typ === "otoc").length;
/** Jak dlouho po konci písně se ještě dohrává (Bublinka vyletí), než přijde výsledek */
const DOHRA_MS = 1900;

const KLAVESY: Record<string, Typ> = { KeyF: "tlac", KeyJ: "tlac", Space: "tlac", KeyD: "otoc", KeyK: "otoc", Enter: "otoc", NumpadEnter: "otoc" };
const ZAPIS: Record<string, Typ> = { f: "tlac", j: "tlac", " ": "tlac", d: "otoc", k: "otoc", enter: "otoc" };

const TEXT_SOUDU: Record<Soud, string> = { vyborne: "Výborně!", dobre: "Dobře", vedle: "Vedle" };

interface Hrana {
  n: Nota;
  g: SVGGElement;
  soud: Soud | null;
  /** Čas písně, kdy padl úder */
  kdy: number;
  videt: boolean;
}

interface Castice {
  el: SVGCircleElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  zivot: number;
  delka: number;
}

/** Hudba: kontext, vlastní sběrnice (ať jde po stop() hned ztišit) a šum */
interface Hudba {
  ctx: AudioContext;
  bus: GainNode;
  sum: AudioBuffer;
}

/** 1 úder, 2 údery, 5 úderů */
const udery = (n: number) => `${cislo(n)} ${n === 1 ? "úder" : n >= 2 && n <= 4 ? "údery" : "úderů"}`;

export const hneteni: Uroven = (p) => {
  const koren = p.koren;
  const $ = <T extends Element>(s: string) => koren.querySelector<T>(s)!;
  const okno = $<HTMLElement>(".mu-okno");
  const kresba = $<SVGSVGElement>(".mu-kresba");
  const draha = $<SVGSVGElement>(".mn2-draha-svg");
  const hroudaG = $<SVGGElement>(".mn2-hrouda");
  const rotor = $<SVGGElement>(".mn2-rotor");
  const platky = [...kresba.querySelectorAll<SVGGElement>(".mn2-platek")].sort((a, b) => Number(a.dataset.platek) - Number(b.dataset.platek));
  const bubliny = [...kresba.querySelectorAll<SVGGElement>(".mn2-bublina")];
  const hrube = $<SVGGElement>(".mn2-hrube");
  const casticeG = $<SVGGElement>(".mn2-castice");
  const notyG = $<SVGGElement>(".mn2-noty");
  const taktyG = $<SVGGElement>(".mn2-takty");
  const valecG = $<SVGGElement>(".mn2-valec");
  const valecTelo = $<SVGRectElement>(".mn2-valec-telo");
  const valecHlava = $<SVGGElement>(".mn2-valec-hlava");
  const valecText = $<SVGTextElement>(".mn2-valec-text");
  const tercPuls = $<SVGCircleElement>(".mn2-terc-puls");
  const tercZasah = $<SVGCircleElement>(".mn2-terc-zasah");
  const soudEl = $<SVGTextElement>(".mn2-soud");
  const odpocetEl = $<SVGTextElement>(".mn2-odpocet");
  const buben = $<SVGGElement>(".mn2-buben");
  const radaEl = $<SVGTextElement>(".mn2-rada");
  const radaPopis = $<SVGTextElement>(".mn2-rada-popis");
  const ukazka = $<SVGGElement>(".mn2-ukazka");
  const bublinka = $<HTMLElement>(".mn2-bublinka");
  const bublinkaTelo = $<HTMLElement>(".mn2-bublinka-telo");
  const lem = $<SVGSVGElement>(".mn2-lem");
  const kotva = $<HTMLElement>(".mn2-kotva");
  const pady = { tlac: $<HTMLButtonElement>('[data-mn2-pad="tlac"]'), otoc: $<HTMLButtonElement>('[data-mn2-pad="otoc"]') };

  const ac = new AbortController();
  const { signal } = ac;
  const klid = p.klid;

  /* ——— Stav ——— */
  let stav: Stav = "ceka";
  let raf = 0;
  let minulySnimek = 0;
  let konecV = 0;
  let vysledek: Vysledek | null = null;

  const pocty: Record<Soud, number> = { vyborne: 0, dobre: 0, vedle: 0 };
  let rada = 0;
  let nejdelsi = 0;
  let valecUderu = 0;
  /** Tlak na Bublinku: zásahy přidávají, minutí ubírá */
  let tlak = 0;
  let platku = 0;
  const posledniSoudy: Soud[] = [];
  let posledniVeta = -1e9;
  let vetyHa = 0;
  const rekl = new Set<string>();

  /* Hodiny písně */
  let rezim: "audio" | "cas" = "cas";
  let perfNula = 0;
  let ctxNula = 0;
  /** Vyhlazený rozdíl mezi tím, co je právě slyšet (čas kontextu), a performance.now() v sekundách */
  let posun = Number.NaN;
  let hudba: Hudba | null = null;
  let iHudby = 0;
  let iOdpocet = 0;
  let iZacatku = 0;
  let valecOhlasen = false;

  /* Animace */
  let zmack = 0;
  let zmackV = 0;
  let krouceni = 0;
  let krouceniV = 0;
  let natoceni = 0;
  let natoceniCil = 0;
  let bubP = 0;
  let ponorNavic = 0;
  let skok = 0;
  let skokV = 0;
  let pulsBubliny = 0;
  let ponor: number = PONOR.hluboko;
  /** Poslední zapsané hodnoty stylů — ať se každý snímek nepřepočítává, co se nezměnilo */
  const zapsano = new Map<string, string>();
  const nastavStyl = (el: HTMLElement | SVGElement, vlastnost: string, hodnota: string) => {
    const klic = `${el.getAttribute("class")}|${vlastnost}`;
    if (zapsano.get(klic) === hodnota) return;
    zapsano.set(klic, hodnota);
    el.style.setProperty(vlastnost, hodnota);
  };
  const castice: Castice[] = [];
  const viditelneBubliny: number[] = [];

  /* ——— Výchozí stav scény (DOM zůstává z minulého pokusu) ——— */
  okno.classList.remove("je-hra", "je-venku", "je-uvnitr");
  bublinka.classList.remove("je-venku", "je-uvnitr", "na-kraji");
  bublinka.style.removeProperty("transform");
  bublinkaTelo.style.removeProperty("transform");
  lem.style.removeProperty("filter");
  casticeG.replaceChildren();
  notyG.replaceChildren();
  taktyG.replaceChildren();
  platky.forEach((pl) => pl.classList.remove("je"));
  bubliny.forEach((b) => b.classList.remove("je", "praska"));
  hrube.style.removeProperty("opacity");
  hroudaG.removeAttribute("transform");
  rotor.removeAttribute("transform");
  soudEl.textContent = "";
  soudEl.classList.remove("je", "vyborne", "dobre", "vedle");
  odpocetEl.textContent = "";
  odpocetEl.classList.remove("je");
  radaEl.textContent = "";
  radaEl.classList.remove("je");
  radaPopis.textContent = "v řadě";
  buben.classList.remove("ma-radu", "valec");
  valecG.setAttribute("opacity", "0");
  valecText.textContent = "";
  tercPuls.setAttribute("opacity", "0");
  tercZasah.classList.remove("je", "vyborne");
  ukazka.classList.remove("pryc");
  for (const pad of Object.values(pady)) pad.classList.remove("uder");

  const f1 = (n: number) => n.toFixed(1);

  const nastavRelief = () => {
    const r = posunyReliefu(natoceni);
    rotor.style.setProperty("--mn2-sx", `${f1(r.sx)}px`);
    rotor.style.setProperty("--mn2-sy", `${f1(r.sy)}px`);
    rotor.style.setProperty("--mn2-hx", `${f1(r.hx)}px`);
    rotor.style.setProperty("--mn2-hy", `${f1(r.hy)}px`);
  };
  nastavRelief();

  /* Noty a taktové čáry — prvky jen jednou, pak se posouvají */
  const noty: Hrana[] = NOTY.map((n) => {
    const g = document.createElementNS(SVGNS, "g");
    g.setAttribute("class", `mn2-nota mn2-nota-${n.typ}`);
    g.setAttribute("display", "none");
    const u = document.createElementNS(SVGNS, "use");
    u.setAttribute("href", `#mn2-n-${n.typ === "tlac" ? "t" : "o"}${n.velka ? "v" : ""}`);
    u.setAttribute("class", "mn2-nota-tvar");
    g.append(u);
    return { n, g, soud: null, kdy: 0, videt: false };
  });
  /* Pozdější noty pod dřívějšími — ta, co je na řadě, je navrchu */
  notyG.append(...[...noty].reverse().map((h) => h.g));

  const takty = CARY.map((t) => {
    const g = document.createElementNS(SVGNS, "g");
    g.setAttribute("display", "none");
    const cara = document.createElementNS(SVGNS, "path");
    let d = `M0 ${DRAHA.y0 + 6} V${DRAHA.y1 - 6}`;
    for (let k = 1; k < 4; k++) d += ` M${f1(k * DOBA * RYCHLOST)} ${DRAHA.y1 - 15} V${DRAHA.y1 - 7}`;
    cara.setAttribute("d", d);
    cara.setAttribute("stroke-width", "1.6");
    cara.setAttribute("opacity", "0.4");
    g.append(cara);
    taktyG.append(g);
    return { t, g, videt: false };
  });

  p.ukazatel("Zásahy – · 0 v řadě");

  /* ——— Hodiny ——— */

  const casPisne = (perf: number) => (rezim === "audio" ? perf / 1000 + posun - ctxNula : (perf - perfNula) / 1000);

  /** Co je právě slyšet, v čase kontextu, minus performance.now() — pro vyhlazení */
  const zmerPosun = (ctx: AudioContext, perf: number) => {
    const ts = typeof ctx.getOutputTimestamp === "function" ? ctx.getOutputTimestamp() : null;
    const hruby = ctx.currentTime - (ctx.outputLatency || ctx.baseLatency || 0.01) - perf / 1000;
    if (ts && ts.contextTime && ts.performanceTime) {
      const presny = ts.contextTime - ts.performanceTime / 1000;
      if (Math.abs(presny - hruby) < 0.5) return presny;
    }
    return hruby;
  };

  const sladHodiny = (perf: number) => {
    const a = zvuk.audio();
    if (!a || a.ctx.state !== "running") {
      if (rezim === "audio") {
        /* Zvuk se ztlumil nebo zastavil: čas jede dál z performance.now() */
        const s = casPisne(perf);
        rezim = "cas";
        perfNula = perf - s * 1000;
      }
      posun = Number.NaN;
      return;
    }
    const m = zmerPosun(a.ctx, perf);
    if (!Number.isFinite(posun) || Math.abs(m - posun) > 0.05) posun = m;
    else posun += (m - posun) * 0.08;
  };

  /* ——— Zvuk ——— */

  const dejHudbu = (): Hudba | null => {
    const a = zvuk.audio();
    if (!a || a.ctx.state !== "running" || !Number.isFinite(posun)) return null;
    if (!hudba || hudba.ctx !== a.ctx) {
      const bus = a.ctx.createGain();
      bus.gain.value = 0.9;
      bus.connect(a.vystup);
      const sum = a.ctx.createBuffer(1, Math.floor(a.ctx.sampleRate * 0.4), a.ctx.sampleRate);
      const d = sum.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      hudba = { ctx: a.ctx, bus, sum };
    }
    return hudba;
  };

  const obalka = (g: AudioParam, T: number, utok: number, sila: number, doba: number) => {
    g.setValueAtTime(0.0001, T);
    g.exponentialRampToValueAtTime(Math.max(0.0002, sila), T + utok);
    g.exponentialRampToValueAtTime(0.0001, T + doba);
  };

  const ton = (h: Hudba, T: number, typ: OscillatorType, f0: number, f1: number, klouz: number, sila: number, doba: number, cil: AudioNode = h.bus) => {
    const o = h.ctx.createOscillator();
    o.type = typ;
    o.frequency.setValueAtTime(f0, T);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, T + klouz);
    const g = h.ctx.createGain();
    obalka(g.gain, T, 0.003, sila, doba);
    o.connect(g).connect(cil);
    o.start(T);
    o.stop(T + doba + 0.05);
  };

  const sum = (h: Hudba, T: number, typ: BiquadFilterType, frekvence: number, q: number, sila: number, doba: number) => {
    const s = h.ctx.createBufferSource();
    s.buffer = h.sum;
    const fl = h.ctx.createBiquadFilter();
    fl.type = typ;
    fl.frequency.value = frekvence;
    fl.Q.value = q;
    const g = h.ctx.createGain();
    obalka(g.gain, T, 0.002, sila, doba);
    s.connect(fl).connect(g).connect(h.bus);
    s.start(T);
    s.stop(T + doba + 0.02);
  };

  /** Koto: trojúhelník s oktávou, tón se na začátku maličko usadí a filtr se zavírá */
  const koto = (h: Hudba, T: number, f: number, sila: number) => {
    const fl = h.ctx.createBiquadFilter();
    fl.type = "lowpass";
    fl.frequency.setValueAtTime(3600, T);
    fl.frequency.exponentialRampToValueAtTime(900, T + 0.45);
    fl.connect(h.bus);
    ton(h, T, "triangle", f * 1.012, f, 0.06, 0.12 * sila, 1.1, fl);
    ton(h, T, "sine", f * 2, f * 2, 0, 0.03 * sila, 0.5, fl);
  };

  const zahraj = (h: Hudba, u: Udalost, T: number) => {
    const s = u.sila;
    switch (u.co) {
      case "don":
        ton(h, T, "sine", 118, 52, 0.22, 0.5 * s, 0.55);
        sum(h, T, "lowpass", 700, 0.7, 0.26 * s, 0.09);
        break;
      case "kara":
        ton(h, T, "triangle", 980, 820, 0.05, 0.11 * s, 0.07);
        sum(h, T, "bandpass", 2300, 6, 0.1 * s, 0.03);
        break;
      case "ki":
        sum(h, T, "bandpass", 2500, 5, 0.45 * s, 0.035);
        ton(h, T, "triangle", 1750, 1320, 0.05, 0.2 * s, 0.05);
        ton(h, T, "sine", 880, 700, 0.07, 0.1 * s, 0.07);
        break;
      case "koto":
        koto(h, T, u.f ?? 330, s);
        break;
      case "bas":
        ton(h, T, "triangle", u.f ?? 82, u.f ?? 82, 0, 0.2 * s, 1);
        break;
    }
  };

  /** Doprovod se plánuje kousek dopředu, přesně na čas kontextu */
  const planujHudbu = (s: number, perf: number) => {
    const h = dejHudbu();
    if (!h) {
      while (iHudby < HUDBA.length && HUDBA[iHudby].t < s) iHudby++;
      return;
    }
    const ted = h.ctx.currentTime;
    while (iHudby < HUDBA.length && HUDBA[iHudby].t <= s + 0.25) {
      const u = HUDBA[iHudby++];
      const T = rezim === "audio" ? ctxNula + u.t : perf / 1000 + posun + (u.t - s);
      if (T < ted - 0.01) continue;
      zahraj(h, u, Math.max(T, ted));
    }
  };

  const zvukUderu = (typ: Typ, velky: boolean) => {
    if (typ === "tlac") {
      zvuk.ton(velky ? 170 : 150, 60, 0.13, "sine", velky ? 0.42 : 0.32);
      zvuk.sumik(0.07, 480, 0.8, velky ? 0.3 : 0.22);
    } else {
      zvuk.sumik(0.16, 1300, 0.55, velky ? 0.15 : 0.1);
      zvuk.sumik(0.09, 520, 0.9, 0.08);
    }
  };

  /* ——— Efekty ——— */

  /** Spustí CSS animaci znovu od začátku */
  const znovu = (el: Element, trida: string) => {
    el.classList.remove(trida);
    void (el as HTMLElement).getBoundingClientRect();
    el.classList.add(trida);
  };

  const prskni = (x: number, y: number, pocet: number, barva: string, sila = 1) => {
    if (klid) return;
    for (let i = 0, n = castic(pocet); i < n; i++) {
      const el = document.createElementNS(SVGNS, "circle");
      el.setAttribute("r", f1(1.6 + Math.random() * 2.4 * sila));
      el.setAttribute("fill", barva);
      casticeG.append(el);
      const u = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
      const v = (120 + Math.random() * 160) * sila;
      castice.push({ el, x, y, vx: Math.cos(u) * v, vy: Math.sin(u) * v, zivot: 0, delka: 0.45 + Math.random() * 0.3 });
    }
  };

  const ukazPlatek = (k: number) => {
    const pl = platky[k];
    if (!pl) return;
    pl.classList.add("je");
    hrube.style.opacity = String(omez(1 - (k + 1) / 12));
  };

  const pridejBublinu = () => {
    const volne = bubliny.map((_, i) => i).filter((i) => !viditelneBubliny.includes(i));
    if (!volne.length) return;
    const i = volne[0];
    viditelneBubliny.push(i);
    const b = bubliny[i];
    b.classList.remove("praska");
    znovu(b, "je");
  };

  const prasknoutBublinu = () => {
    const i = viditelneBubliny.shift();
    if (i === undefined) return;
    const b = bubliny[i];
    b.classList.remove("je");
    znovu(b, "praska");
    const [x, y] = BUBLINY[i];
    prskni(x, y, 6, "#F3E6D4", 0.6);
    zvuk.ton(700, 1300, 0.05, "sine", 0.08);
  };

  const rekni = (text: string, nyni: number, uMne = false) => {
    if (nyni - posledniVeta < 4.5) return false;
    posledniVeta = nyni;
    p.rekni(text, uMne ? bublinka : kotva);
    return true;
  };

  const ukazatel = () => {
    const odsouzeno = pocty.vyborne + pocty.dobre + pocty.vedle;
    const zasahy = odsouzeno ? `${Math.round((100 * (pocty.vyborne + 0.6 * pocty.dobre)) / odsouzeno)} %` : "–";
    p.ukazatel(`Zásahy ${zasahy} · ${rada} v řadě`);
  };

  const kresliRadu = () => {
    if (buben.classList.contains("valec")) return;
    const ma = rada >= 3;
    buben.classList.toggle("ma-radu", ma);
    radaEl.textContent = ma ? String(rada) : "";
    if (ma) znovu(radaEl, "je");
  };

  /* ——— Rozhodnutí o notě ——— */

  let prvniNeodsouzena = 0;
  let prvniViditelna = 0;

  const odsud = (h: Hrana, soud: Soud, s: number, proc: "trefa" | "brzo" | "spatne" | "minuta") => {
    h.soud = soud;
    h.kdy = s;
    pocty[soud]++;
    posledniSoudy.push(soud);
    if (posledniSoudy.length > 8) posledniSoudy.shift();
    if (soud === "vedle") {
      rada = 0;
      tlak = Math.max(0, tlak - 0.7);
      h.g.classList.add("je-vedle");
      ponorNavic = 14;
      pridejBublinu();
      zvuk.ton(proc === "minuta" ? 320 : 240, proc === "minuta" ? 560 : 170, 0.08, proc === "minuta" ? "sine" : "triangle", 0.05);
    } else {
      rada++;
      nejdelsi = Math.max(nejdelsi, rada);
      tlak += soud === "vyborne" ? 1 : 0.6;
      h.g.classList.add("je-trefa");
      znovu(tercZasah, "je");
      tercZasah.classList.toggle("vyborne", soud === "vyborne");
      skokV += h.n.velka ? 3.2 : 1.6;
      if (h.n.typ === "otoc") natoceniCil += OTOCKA * (h.n.velka ? 1.5 : 1);
      if (rada % 4 === 0) prasknoutBublinu();
      if (h.n.velka) prskni(HROUDA.cx + (Math.random() - 0.5) * 120, 300, 8, "#9C7860");
    }
    /* Květ: dokonalá hra = všech čtyřicet záhybů */
    const cil = Math.min(PLATKU, Math.floor(((pocty.vyborne + 0.6 * pocty.dobre) / POCET) * PLATKU + 1e-6));
    while (platku < cil) ukazPlatek(platku++);

    soudEl.textContent = TEXT_SOUDU[soud];
    soudEl.classList.remove("vyborne", "dobre", "vedle");
    soudEl.classList.add(soud);
    znovu(soudEl, "je");
    kresliRadu();
    ukazatel();

    /* Co na to Bublinka */
    if (rada === 15 && !rekl.has("15")) {
      if (rekni("Hej! To bolí!", s)) rekl.add("15");
    } else if (rada === 30 && !rekl.has("30")) {
      if (rekni("Tohle je šikana. Hlásím to Pecince.", s)) rekl.add("30");
    } else if (soud === "vedle" && vetyHa < 2 && posledniSoudy.filter((x) => x === "vedle").length >= 5) {
      if (rekni("Ha! Pořád jsem tady.", s)) {
        vetyHa++;
        posledniSoudy.length = 0;
      }
    }
  };

  /** Noty, které projely terčem bez úderu */
  const minuteNoty = (s: number) => {
    while (prvniNeodsouzena < noty.length) {
      const h = noty[prvniNeodsouzena];
      if (!h.soud) {
        if (s - h.n.t <= DOBRE) break;
        odsud(h, "vedle", s, "minuta");
      }
      prvniNeodsouzena++;
    }
  };

  const vValci = (s: number) => s >= VALEC.od - VALEC_REZERVA && s <= VALEC.do + VALEC_REZERVA;

  const uder = (typ: Typ, perf: number) => {
    if (stav !== "hra") return;
    const s = casPisne(perf);
    minuteNoty(s);
    blikni(typ);

    if (vValci(s)) {
      reakce(typ, false);
      zvukUderu(typ, false);
      if (typ !== "tlac") return;
      valecUderu++;
      skokV += 1.2;
      radaEl.textContent = String(valecUderu);
      znovu(radaEl, "je");
      if (valecUderu === VALEC_DOST) {
        bublinka.classList.add("na-kraji");
        zvuk.ton(500, 900, 0.09, "sine", 0.1);
      }
      if (valecUderu % 3 === 0) prskni(HROUDA.cx + (Math.random() - 0.5) * 200, 290, 3, "#9C7860", 0.8);
      return;
    }

    /* Nejbližší neodsouzená nota stejného typu v okně, jinak nota jiného typu blízko terče */
    let stejna: Hrana | null = null;
    let jina: Hrana | null = null;
    for (let i = prvniNeodsouzena; i < noty.length; i++) {
      const h = noty[i];
      const d = s - h.n.t;
      if (d < -VEDLE) break;
      if (h.soud) continue;
      if (h.n.typ === typ) {
        if (!stejna || Math.abs(d) < Math.abs(s - stejna.n.t)) stejna = h;
      } else if (Math.abs(d) <= DOBRE && (!jina || Math.abs(d) < Math.abs(s - jina.n.t))) jina = h;
    }
    const velky = !!stejna?.n.velka;
    reakce(typ, velky);
    zvukUderu(typ, velky);
    if (stejna) {
      const a = Math.abs(s - stejna.n.t);
      odsud(stejna, a <= VYBORNE ? "vyborne" : a <= DOBRE ? "dobre" : "vedle", s, a <= DOBRE ? "trefa" : "brzo");
    } else if (jina) odsud(jina, "vedle", s, "spatne");
  };

  /** Hrouda pod rukama: tlač ji zmáčkne, otoč s ní zakroutí */
  const reakce = (typ: Typ, velky: boolean) => {
    if (klid) return;
    if (typ === "tlac") zmackV += velky ? 2.4 : 1.6;
    else krouceniV += velky ? 3 : 2;
  };

  const blikni = (typ: Typ) => znovu(pady[typ], "uder");

  /* ——— Kreslení snímku ——— */

  const xNoty = (t: number, s: number) => TERC_X + (t - s) * RYCHLOST;

  const kresliDrahu = (s: number) => {
    for (let i = prvniViditelna; i < noty.length; i++) {
      const h = noty[i];
      let x = xNoty(h.n.t, s);
      if (x > DRAHA.x1 + 50) break;
      let videt = true;
      if (h.soud && h.soud !== "vedle") {
        if (s - h.kdy > 0.3) videt = false;
        else x = TERC_X;
      } else if (x < DRAHA.x0 - 50) videt = false;
      if (!videt) {
        if (h.videt) {
          h.g.setAttribute("display", "none");
          h.videt = false;
        }
        if (i === prvniViditelna) prvniViditelna++;
        continue;
      }
      if (!h.videt) {
        h.g.removeAttribute("display");
        h.videt = true;
      }
      h.g.setAttribute("transform", `translate(${f1(x)} ${DRAHA.y})`);
    }
    for (const c of takty) {
      const x = xNoty(c.t, s);
      const videt = x > DRAHA.x0 - 10 && x < DRAHA.x1 + 10 + 3 * DOBA * RYCHLOST;
      if (videt !== c.videt) {
        c.videt = videt;
        if (videt) c.g.removeAttribute("display");
        else c.g.setAttribute("display", "none");
      }
      if (videt) c.g.setAttribute("transform", `translate(${f1(x)} 0)`);
    }

    /* Válec: levý konec se v terči zastaví, dokud se tlačí */
    const x1 = xNoty(VALEC.od, s);
    const x2 = xNoty(VALEC.do, s);
    const videt = x1 < DRAHA.x1 + 40 && x2 > TERC_X;
    valecG.setAttribute("opacity", videt ? "1" : "0");
    if (videt) {
      const xl = Math.max(x1, TERC_X);
      valecTelo.setAttribute("x", f1(xl - 25));
      valecTelo.setAttribute("width", f1(Math.max(50, x2 - xl + 50)));
      valecHlava.setAttribute("transform", `translate(${f1(xl)} ${DRAHA.y})`);
      valecText.setAttribute("x", f1(xl + 52));
      if (!valecText.textContent) valecText.textContent = "tlač, tlač, tlač, tlač, tlač!";
    }
    const aktivni = vValci(s);
    if (aktivni !== buben.classList.contains("valec")) {
      buben.classList.toggle("valec", aktivni);
      radaPopis.textContent = aktivni ? "úderů" : "v řadě";
      if (aktivni) {
        buben.classList.add("ma-radu");
        radaEl.textContent = String(valecUderu);
      } else kresliRadu();
    }

    /* Terč pulzuje do rytmu — i bez zvuku je vidět, kde je doba */
    if (s >= 0 && s < KONEC) {
      const faze = (s / DOBA) % 1;
      tercPuls.setAttribute("opacity", f1(0.55 * Math.exp(-faze * 6)));
    } else tercPuls.setAttribute("opacity", "0");
  };

  const odpocet = (s: number) => {
    while (iOdpocet < ODPOCET.length && s >= ODPOCET[iOdpocet].t) {
      odpocetEl.textContent = ODPOCET[iOdpocet].text;
      znovu(odpocetEl, "je");
      iOdpocet++;
    }
    if (iOdpocet === ODPOCET.length && odpocetEl.textContent && s > 8 * DOBA - 0.15) odpocetEl.textContent = "";
  };

  const zpravy = (s: number) => {
    while (iZacatku < ZACATKY.length && s >= ZACATKY[iZacatku].t) {
      const c = ZACATKY[iZacatku++].cast;
      if (c === "B") p.zprava("Teď po osminách.");
      else if (c === "C") p.zprava("Pozor, teď to skáče.");
    }
    if (!valecOhlasen && s >= VALEC.od - 2 * DOBA) {
      valecOhlasen = true;
      p.zprava("Bublinka utíká! Tlač, co to dá!");
    }
  };

  /** Kde je Bublinka: poloha na cestě 0–1 → bod a náklon */
  const naCeste = (t: number): [number, number, number] => {
    const u = omez(t) * (CESTA_BUBLINKY.length - 1);
    const i = Math.min(CESTA_BUBLINKY.length - 2, Math.floor(u));
    const k = u - i;
    const [x0, y0] = CESTA_BUBLINKY[i];
    const [x1, y1] = CESTA_BUBLINKY[i + 1];
    return [mix(x0, x1, k), mix(y0, y1, k), mix(NAKLON_BUBLINKY[i], NAKLON_BUBLINKY[i + 1], k)];
  };

  const cilBublinky = () => (stav === "dohra" && vysledek?.proslo ? 1 : 0.8 * omez(tlak / (0.82 * POCET)) + 0.2 * omez(valecUderu / VALEC_DOST));

  const animuj = (dt: number) => {
    /* Pružiny: zmáčknutí hroudy, zakrouceni, poskočení Bublinky */
    const pruz = (x: number, v: number, k: number, c: number): [number, number] => {
      const a = -k * x - c * v;
      const nv = v + a * dt;
      return [x + nv * dt, nv];
    };
    [zmack, zmackV] = pruz(zmack, zmackV, 260, 15);
    [krouceni, krouceniV] = pruz(krouceni, krouceniV, 200, 11);
    [skok, skokV] = pruz(skok, skokV, 300, 14);
    zmack = omez(zmack, -0.06, 0.2);
    krouceni = omez(krouceni, -0.12, 0.12);
    skok = omez(skok, -0.15, 0.15);

    const k = zmack;
    if (Math.abs(k) > 0.0004 || Math.abs(krouceni) > 0.0004) {
      const sx = 1 + 0.45 * k;
      const sy = 1 - k;
      hroudaG.setAttribute(
        "transform",
        `translate(${HROUDA.cx} ${HROUDA.zaklad}) skewX(${f1(krouceni * 40)}) scale(${sx.toFixed(4)} ${sy.toFixed(4)}) translate(${-HROUDA.cx} ${-HROUDA.zaklad})`,
      );
    } else hroudaG.removeAttribute("transform");

    /* Rozeta se otáčí za trefenými otoč */
    const rozdil = natoceniCil - natoceni;
    if (Math.abs(rozdil) > 0.0005) {
      natoceni = klid ? natoceniCil : natoceni + rozdil * (1 - Math.exp(-dt * 12));
      rotor.setAttribute("transform", `rotate(${((natoceni * 180) / Math.PI).toFixed(2)})`);
      nastavRelief();
    }

    /* Bublinka */
    if (!bublinka.classList.contains("je-venku")) {
      const cil = cilBublinky();
      bubP += (cil - bubP) * (1 - Math.exp(-dt * (klid ? 20 : 5)));
      ponorNavic *= Math.exp(-dt * 2.4);
      const [bx, by, uhel] = naCeste(bubP);
      /* Bublinka jede s povrchem hroudy, když se mačká */
      const x = HROUDA.cx + (bx - HROUDA.cx) * (1 + 0.45 * k) + (HROUDA.zaklad - by) * krouceni * 0.7;
      const y = HROUDA.zaklad - (HROUDA.zaklad - by) * (1 - k);
      const V = BUBLINKA.velikost;
      pulsBubliny += dt;
      const kraj = bublinka.classList.contains("na-kraji") && !klid ? Math.sin(pulsBubliny * 26) * 3 : 0;
      nastavStyl(bublinka, "transform", `translate(${f1(((x - V / 2) / V) * 100)}%, ${f1(((y - BUBLINKA.dulek) / V) * 100)}%) rotate(${f1(uhel + kraj)}deg)`);
      /* Neprošlo: zaleze hlouběji, než kdy byla */
      const zalezla = stav === "dohra" && vysledek !== null && !vysledek.proslo;
      const cilPonor = zalezla ? PONOR.hluboko + 18 : mix(PONOR.hluboko, PONOR.venku, bubP) + ponorNavic;
      ponor = dt > 0 ? ponor + (cilPonor - ponor) * (1 - Math.exp(-dt * 9)) : cilPonor;
      const j = klid ? 0 : skok;
      nastavStyl(bublinkaTelo, "transform", `translateY(${f1((ponor / 180) * 100)}%) scale(${(1 + j).toFixed(3)}, ${(1 - j).toFixed(3)})`);
      nastavStyl(lem, "filter", `brightness(${(1 - 0.16 * bubP).toFixed(2)})`);
    }

    /* Částice */
    for (let i = castice.length - 1; i >= 0; i--) {
      const c = castice[i];
      c.zivot += dt;
      c.vy += 900 * dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      if (c.zivot >= c.delka) {
        c.el.remove();
        castice.splice(i, 1);
        continue;
      }
      c.el.setAttribute("cx", f1(c.x));
      c.el.setAttribute("cy", f1(c.y));
      c.el.setAttribute("opacity", f1(1 - c.zivot / c.delka));
    }
  };

  /* ——— Konec ——— */

  const spocitej = (): Vysledek => {
    const presnost = (pocty.vyborne + 0.6 * pocty.dobre) / POCET;
    const navic = Math.min(4, Math.max(0, valecUderu - VALEC_DOST));
    const body = omez(Math.round(presnost * 100) + navic, 0, 100);
    const proslo = presnost >= 0.4;
    const veta = !proslo
      ? "Ha! Pořád jsem tady. Klidně to dej do pece."
      : body >= 85
        ? "Dobře, dobře. Jdu. Ale v příští hroudě budu zas."
        : body >= 65
          ? "Skoro mě to vyhnalo. Skoro."
          : "Pár bublinek tam zůstalo. Uvidíme se v peci.";
    return {
      body,
      proslo,
      veta,
      udaje: [
        ["Zásahy", `${cislo(Math.round(presnost * 100))} %`],
        ["Výborně / dobře / vedle", `${pocty.vyborne} / ${pocty.dobre} / ${pocty.vedle}`],
        ["Nejdelší řada", cislo(nejdelsi)],
        ["Bublinka utíká", udery(valecUderu)],
      ],
    };
  };

  const dohraj = (perf: number) => {
    stav = "dohra";
    vysledek = spocitej();
    konecV = perf + DOHRA_MS;
    valecG.setAttribute("opacity", "0");
    tercPuls.setAttribute("opacity", "0");
    okno.classList.remove("je-hra");
    if (vysledek.proslo) {
      /* Bublinka vyskočí z hroudy a uletí */
      bublinka.classList.remove("na-kraji");
      bublinka.classList.add("je-venku");
      okno.classList.add("je-venku");
      zvuk.pop();
      const [bx, by] = naCeste(bubP);
      prskni(bx, by - 20, 12, "#F3E6D4", 1.1);
      p.rekni("Dobře, dobře. Jdu.", bublinka);
    } else {
      bublinka.classList.add("je-uvnitr");
      okno.classList.add("je-uvnitr");
      zvuk.ton(620, 380, 0.18, "sine", 0.08);
      p.rekni("Ha! Pořád jsem tady.", bublinka);
    }
  };

  const snimek = (ted: number) => {
    raf = 0;
    if (stav !== "hra" && stav !== "dohra") return;
    const dt = minulySnimek ? omez((ted - minulySnimek) / 1000, 0, 0.05) : 1 / 60;
    minulySnimek = ted;
    sladHodiny(ted);
    const s = casPisne(ted);
    kresliDrahu(s);
    if (stav === "hra") {
      minuteNoty(s);
      odpocet(s);
      zpravy(s);
      planujHudbu(s, ted);
      if (s >= KONEC) dohraj(ted);
    } else if (ted >= konecV && vysledek) {
      stav = "konec";
      animuj(dt);
      p.konec(vysledek);
      return;
    }
    animuj(dt);
    raf = requestAnimationFrame(snimek);
  };

  /* ——— Vstup ——— */

  /** Kdy přesně se to stalo: časová známka události, pokud dává smysl */
  const kdy = (e: Event) => {
    const ted = performance.now();
    const t = e.timeStamp;
    return t > 0 && t <= ted + 2 && ted - t < 400 ? t : ted;
  };

  for (const typ of ["tlac", "otoc"] as const) {
    const pad = pady[typ];
    pad.addEventListener(
      "pointerdown",
      (e) => {
        if (e.button > 0) return;
        e.preventDefault();
        uder(typ, kdy(e));
      },
      { signal },
    );
    /* Klik bez ukazatele (čtečka, klávesnice na tlačítku) — detail 0 */
    pad.addEventListener(
      "click",
      (e) => {
        if (e.detail === 0) uder(typ, performance.now());
      },
      { signal },
    );
    pad.addEventListener("contextmenu", (e) => e.preventDefault(), { signal });
  }

  const typKlavesy = (e: KeyboardEvent): Typ | undefined => KLAVESY[e.code] ?? ZAPIS[e.key.toLowerCase()];

  document.addEventListener(
    "keydown",
    (e) => {
      if (stav !== "hra" || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
      const typ = typKlavesy(e);
      if (!typ) return;
      e.preventDefault();
      if (e.repeat) return;
      uder(typ, kdy(e));
    },
    { signal, capture: true },
  );
  /* Mezerník a Enter by na tlačítku v okně jinak klikly */
  document.addEventListener(
    "keyup",
    (e) => {
      if (stav === "hra" && (e.code === "Space" || e.code === "Enter" || e.code === "NumpadEnter")) e.preventDefault();
    },
    { signal, capture: true },
  );

  /* Výchozí poloha Bublinky a hroudy */
  animuj(0);

  /* ——— Start a stop ——— */

  return {
    start() {
      if (stav !== "ceka") return;
      stav = "hra";
      okno.classList.add("je-hra");
      ukazka.classList.add("pryc");
      zvuk.odemkni();
      const ted = performance.now();
      const a = zvuk.audio();
      if (a && a.ctx.state === "running") {
        rezim = "audio";
        posun = zmerPosun(a.ctx, ted);
        ctxNula = ted / 1000 + posun + PREDSTIH;
      } else {
        rezim = "cas";
        perfNula = ted + PREDSTIH * 1000;
      }
      minulySnimek = 0;
      rekni("Pšš. Hraju schovávanou.", -10);
      raf = requestAnimationFrame(snimek);
    },
    stop() {
      if (stav === "konec" && !raf && signal.aborted) return;
      stav = "konec";
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      ac.abort();
      if (hudba) {
        const t = hudba.ctx.currentTime;
        hudba.bus.gain.cancelScheduledValues(t);
        hudba.bus.gain.setValueAtTime(hudba.bus.gain.value, t);
        hudba.bus.gain.linearRampToValueAtTime(0, t + 0.06);
        hudba = null;
      }
      for (const c of castice) c.el.remove();
      castice.length = 0;
    },
  };
};
