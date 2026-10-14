/**
 * 五 Rovina — Sušárna (komnata U mistra, /zkouska). Kresba scény je
 * v components/zkouska/urovne/rovina-kresba.ts, model sušení v rovina-model.ts.
 *
 * Na regálu schne pět kusů a týden uběhne za minutu a čtvrt (slunce jde
 * oknem, v kalendáři ubývají dny, v noci svítí lampa). Kraj schne rychleji
 * než střed; když ho předběhne moc, kus se kroutí, a co se kroutí moc,
 * praskne. Nad každým kusem je vodováha: bublina utíká doprava, jak roste
 * rozdíl vlhkosti, a za čárkou se kus kroutí. Barva hlíny ukazuje vlhkost —
 * kraj a střed zvlášť.
 *
 *   klepnutí na kus   fólie: kraj skoro přestane schnout, kus se srovná
 *   ↻                 talíř, kachel a mísa se obrátí rubem nahoru
 *   okno              dvakrát za týden ho Bublinka otevře — průvan
 *   Kachlík           poradí, který kus je na tom nejhůř
 *
 * Klávesy: 1–5 vybere kus, C přikryje, F obrátí, O zavře okno.
 * Hra skončí v neděli večer, nebo dřív, když je všechno hotové.
 */
import type { Uroven, Vysledek } from "../hra";
import * as zvuk from "../../parta2/zvuk";
import { cislo, SVGNS } from "../../parta2/stav";
import { kamiInfo } from "../../../data/kami";
import { DRUHY, novyKus, krok, mezera, hodnot, PRAH, T_HRY, PRUVAN_DOBA } from "./rovina-model";
import type { Kus, KusId } from "./rovina-model";
import {
  MISTA,
  DNY,
  KALENDAR,
  START_HODINA,
  KONEC_HODINA,
  teloKusu,
  stinKusu,
  hlina,
  skvrna,
  skvrnaCesty,
  veSlunci,
  tma,
  barvyNebe,
  nebeskaTelesa,
  zaves,
} from "../../../components/zkouska/urovne/rovina-kresba";
import type { Misto } from "../../../components/zkouska/urovne/rovina-kresba";

/** Jak se o kusu mluví: „Přikryj ho“, „misku“, „srovnaná“ */
const JAK: Record<KusId, { Kdo: string; koho: string; ho: string; zensky: boolean }> = {
  talir: { Kdo: "Talíř", koho: "talíř", ho: "ho", zensky: false },
  miska: { Kdo: "Miska", koho: "misku", ho: "ji", zensky: true },
  hrnek: { Kdo: "Hrnek", koho: "hrnek", ho: "ho", zensky: false },
  kachel: { Kdo: "Kachel", koho: "kachel", ho: "ho", zensky: false },
  misa: { Kdo: "Mísa", koho: "mísu", ho: "ji", zensky: true },
};
const V_DEN = ["v pondělí", "v úterý", "ve středu", "ve čtvrtek", "v pátek", "v sobotu", "v neděli"];

/** Kdy přiletí Bublinka a otevře okno — vteřiny hry */
const PRILETY: [number, number][] = [
  [15, 27],
  [42, 56],
];
/** Bublinka doletí k oknu a za tuhle chvíli ho otevře */
const OTEVRE_ZA = 0.8;
/** Jak dlouho trvá obrácení (ms); v půlce je kus na hraně a prohodí se kresba */
const OBRAT_MS = 560;

interface Castice {
  el: SVGElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  zivot: number;
  max: number;
  druh: "list" | "strep" | "obl";
  /** Kde střep dopadne na prkénko */
  zem: number;
  faze: number;
}

interface KusHry {
  m: Misto;
  k: Kus;
  el: SVGGElement;
  telo: SVGGElement;
  stin: SVGGElement;
  vv: SVGGElement;
  bublina: SVGGElement;
  cedulka: SVGGElement;
  tl: HTMLButtonElement;
  obrat: HTMLButtonElement[];
  /** Prvky, které se přebarvují podle vlhkosti: [prvek, atribut, část, tón] */
  barvy: [Element, string, "a" | "b", number][];
  lesky: Element[];
  wKresleno: number;
  otocenyKresleno: boolean;
  prasklKresleno: boolean;
  barvaKlic: string;
  bublinaX: number;
  stav: string;
  slunce: boolean;
  /** Kdy začalo obracení (performance.now), 0 = neobrací se */
  obratOd: number;
  obratPrehozeno: boolean;
  /** Je zrovna za čárkou — kvůli varování jen při přechodu */
  zle: boolean;
  popis: string;
}

export const rovina: Uroven = (p) => {
  const k = p.koren;
  const svg = k.querySelector<SVGSVGElement>(".mr5-svg")!;
  const casticeVrstva = svg.querySelector<SVGGElement>(".mr5-castice")!;
  const tabulky = [...svg.querySelectorAll<SVGPathElement>(".mr5-tabulka")];
  const skvrnaG = svg.querySelector<SVGGElement>(".mr5-skvrna")!;
  const noc = svg.querySelector<SVGRectElement>(".mr5-noc")!;
  const nocVenku = svg.querySelector<SVGRectElement>(".mr5-noc-venku")!;
  const lampaZar = svg.querySelector<SVGCircleElement>(".mr5-lampa-zar")!;
  const zarovka = svg.querySelector<SVGCircleElement>(".mr5-zarovka")!;
  const hvezdy = svg.querySelector<SVGGElement>(".mr5-hvezdy")!;
  const slunceEl = svg.querySelector<SVGGElement>(".mr5-slunce")!;
  const mesicEl = svg.querySelector<SVGGElement>(".mr5-mesic")!;
  const nebe1 = svg.querySelector<SVGStopElement>(".mr5-nebe-1")!;
  const nebe2 = svg.querySelector<SVGStopElement>(".mr5-nebe-2")!;
  const zavesPlachta = svg.querySelector<SVGPathElement>(".mr5-zaves-plachta")!;
  const zavesZahyby = svg.querySelector<SVGPathElement>(".mr5-zaves-zahyby")!;
  const zavesLem = svg.querySelector<SVGPathElement>(".mr5-zaves-lem")!;
  const dnes = svg.querySelector<SVGGElement>(".mr5-dnes")!;
  const rucicka = svg.querySelector<SVGGElement>(".mr5-rucicka")!;
  const krizky = [...svg.querySelectorAll<SVGPathElement>(".mr5-krizek")];
  const kachlik = k.querySelector<HTMLButtonElement>(".mr5-kachlik")!;
  const bublinka = k.querySelector<HTMLElement>(".mr5-bublinka")!;
  const oknoTl = [...k.querySelectorAll<HTMLButtonElement>(".mr5-okno-tl, .mr5-zavrit-rada")];

  const kusy: KusHry[] = MISTA.map((m) => {
    const el = svg.querySelector<SVGGElement>(`.mr5-kus[data-kus="${m.id}"]`)!;
    const vv = svg.querySelector<SVGGElement>(`.mr5-vodovaha[data-kus="${m.id}"]`)!;
    return {
      m,
      k: novyKus(DRUHY.find((d) => d.id === m.id)!),
      el,
      telo: el.querySelector<SVGGElement>(".mr5-telo")!,
      stin: el.querySelector<SVGGElement>(".mr5-stin")!,
      vv,
      bublina: vv.querySelector<SVGGElement>(".mr5-bublina-g")!,
      cedulka: svg.querySelector<SVGGElement>(`.mr5-cedulka[data-kus="${m.id}"]`)!,
      tl: k.querySelector<HTMLButtonElement>(`.mr5-kus-tl[data-kus="${m.id}"]`)!,
      obrat: [...k.querySelectorAll<HTMLButtonElement>(`.mr5-obrat-tl[data-kus="${m.id}"], .mr5-obrat-rada[data-kus="${m.id}"]`)],
      barvy: [],
      lesky: [],
      wKresleno: -1,
      otocenyKresleno: false,
      prasklKresleno: false,
      barvaKlic: "",
      bublinaX: 0,
      stav: "",
      slunce: false,
      obratOd: 0,
      obratPrehozeno: false,
      zle: false,
      popis: "",
    };
  });

  const ac = new AbortController();
  let raf = 0;
  let posledni = 0;
  let bezi = false;
  let skoncila = false;
  let zastaveno = false;
  let konecCas: number | undefined;
  /** Čas hry ve vteřinách */
  let t = 0;
  let den = -1;
  let ukazatel = "";
  let posledniNebe = -1e9;
  let posledniBarvy = -1e9;
  let posledniRec = -1e9;
  let vybrany = 0;
  const castice: Castice[] = [];

  /* Průvan */
  const prilety = PRILETY.map(([od, po]) => od + Math.random() * (po - od));
  let dalsiPrilet = 0;
  let bublinkaOd = -1;
  /** Kdy Bublinka zmizí (čas hry) — pak se jí sundá třída letu */
  let bublinkaDo = -1;
  let oknoOtevrene = false;
  let pruvanDo = 0;
  let pruvanu = 0;
  let zavrenoHracem = 0;
  let zavesSila = 0;
  let zavesFaze = 0;
  /** Vlhkost vzduchu na vlhkoměru, 0–1 — jen pro oko */
  let vzduch = -1;
  let dalsiList = 0;
  let dalsiPoryv = 0;

  /* Co už Kachlík řekl */
  let varovani = 0;
  let uschlych = 0;
  let nocRekl = false;
  let nedeleRekl = false;
  let foliiRekl = false;

  const hodinaV = (cas: number) => START_HODINA + (cas / T_HRY) * (KONEC_HODINA - START_HODINA);

  /* ——— Řeč: důležité věty (průvan, prasklina, zavřené okno) zazní vždycky,
     ostatní nejdřív za pár vteřin po předchozí ——— */
  const rekni = (text: string, kotva: Element | null = kachlik, dulezite = false) => {
    const ted = performance.now();
    if (!dulezite && ted - posledniRec < 4500) return;
    posledniRec = ted;
    p.rekni(text, kotva);
  };
  const restart = (el: Element, trida: string) => {
    el.classList.remove(trida);
    void el.getBoundingClientRect();
    el.classList.add(trida);
  };
  const kachlikReaguje = (trida: "skace" | "lekne") => {
    if (p.klid) return;
    kachlik.classList.remove("skace", "lekne");
    restart(kachlik, trida);
  };

  /* ——— Kresba kusu ——— */
  const nactiBarvy = (x: KusHry) => {
    x.barvy = [];
    x.el.querySelectorAll("[data-barva], [data-vypln], [data-tah]").forEach((el) => {
      const [atr, hodnota] = el.hasAttribute("data-barva")
        ? ["stop-color", el.getAttribute("data-barva")!]
        : el.hasAttribute("data-vypln")
          ? ["fill", el.getAttribute("data-vypln")!]
          : ["stroke", el.getAttribute("data-tah")!];
      const [c, ton] = hodnota.split(" ");
      x.barvy.push([el, atr, c === "a" ? "a" : "b", Number(ton)]);
    });
    x.lesky = [...x.telo.querySelectorAll(".mr5-lesk")];
  };
  const obarvi = (x: KusHry) => {
    for (const [el, atr, c, ton] of x.barvy) el.setAttribute(atr, hlina(c === "a" ? x.k.a : x.k.b, ton));
    const mokro = Math.max(x.k.a, x.k.b);
    for (const el of x.lesky) el.setAttribute("opacity", (0.1 + 0.4 * mokro).toFixed(2));
  };
  /** Tvar kusu — při obracení se do půlky kreslí ještě původní strana */
  const vykresliTelo = (x: KusHry) => {
    const otoceny = x.obratOd && !x.obratPrehozeno ? !x.k.otoceny : x.k.otoceny;
    x.telo.innerHTML = teloKusu(x.m.id, { a: x.k.a, b: x.k.b, w: x.k.w, otoceny, prasklo: x.k.prasklo });
    x.stin.innerHTML = stinKusu(x.m.id, x.k.w);
    x.wKresleno = x.k.w;
    x.otocenyKresleno = otoceny;
    x.prasklKresleno = x.k.prasklo;
    nactiBarvy(x);
    obarvi(x);
  };

  const popisKusu = (x: KusHry) => {
    const j = JAK[x.m.id];
    const y = j.zensky ? "á" : "ý";
    const stav = x.k.prasklo
      ? `praskl${y}`
      : x.k.suchy
        ? `such${y}`
        : mezera(x.k) > PRAH
          ? "kroutí se"
          : mezera(x.k) > 0.72 * PRAH
            ? "kraj schne moc rychle"
            : "schne rovně";
    const fol = x.k.prikryty ? ", pod fólií" : "";
    const ob = x.k.otoceny ? `, obrácen${y}` : "";
    return `${x.m.cislo} – ${j.Kdo}: ${stav}${fol}${ob}. ${x.k.prikryty ? "Odkrýt" : "Přikrýt"}.`;
  };
  const aktualizujPopis = (x: KusHry) => {
    const s = popisKusu(x);
    if (s === x.popis) return;
    x.popis = s;
    x.tl.setAttribute("aria-label", s);
    x.tl.setAttribute("aria-pressed", String(x.k.prikryty));
  };

  /* ——— Výchozí stav (DOM zůstává z minulého pokusu) ——— */
  const vychozi = () => {
    castice.length = 0;
    casticeVrstva.textContent = "";
    bublinkaOd = -1;
    bublinkaDo = -1;
    k.classList.remove("mr5-otevreno", "mr5-pruvan", "mr5-konec", "mr5-klavesnice", "mr5-bezi");
    k.classList.toggle("mr5-klid", p.klid);
    kachlik.classList.remove("skace", "lekne");
    bublinka.classList.remove("leti");
    oknoTl.forEach((b) => (b.disabled = true));
    krizky.forEach((c) => c.classList.remove("je"));
    for (const x of kusy) {
      x.k = novyKus(x.k.druh);
      x.obratOd = 0;
      x.obratPrehozeno = false;
      x.zle = false;
      x.barvaKlic = "";
      x.stav = "";
      x.popis = "";
      x.el.classList.remove("prikryto", "obraci", "praskl");
      x.vv.classList.remove("v-slunci");
      x.cedulka.classList.remove("suche", "mokre", "ted");
      x.tl.classList.remove("vybrany");
      x.tl.disabled = false;
      x.obrat.forEach((b) => (b.disabled = false));
      vykresliTelo(x);
      aktualizujPopis(x);
    }
    zavesSila = 0;
    kresliZaves(true);
    vzduch = -1;
    den = -1;
    t = 0;
    kresliCas(0, -1e9, true);
    kresliKusy(0, true);
  };

  /* ——— Čas, světlo, kalendář ——— */
  const kresliCas = (cas: number, ted: number, vse = false) => {
    const h = hodinaV(cas);
    const sk = skvrna(h);
    const cesty = skvrnaCesty(sk);
    tabulky.forEach((el, i) => el.setAttribute("d", cesty[i]));
    skvrnaG.setAttribute("opacity", (0.58 * sk.sila).toFixed(3));
    if (vse || ted - posledniNebe > 120) {
      posledniNebe = ted;
      const [a, b] = barvyNebe(h);
      nebe1.setAttribute("stop-color", a);
      nebe2.setAttribute("stop-color", b);
      const m = tma(h);
      noc.setAttribute("opacity", (0.42 * m).toFixed(3));
      nocVenku.setAttribute("opacity", (0.45 * m).toFixed(3));
      hvezdy.setAttribute("opacity", m.toFixed(2));
      lampaZar.setAttribute("opacity", m.toFixed(2));
      zarovka.setAttribute("fill", m > 0.4 ? "#FFF2C2" : "#EDE4D0");
      k.style.setProperty("--mr5-noc", m.toFixed(2));
      const n = nebeskaTelesa(h);
      slunceEl.setAttribute("transform", `translate(${n.slunce[0].toFixed(1)} ${n.slunce[1].toFixed(1)})`);
      slunceEl.setAttribute("opacity", n.sDen ? "1" : "0");
      mesicEl.setAttribute("transform", `translate(${n.mesic[0].toFixed(1)} ${n.mesic[1].toFixed(1)})`);
      mesicEl.setAttribute("opacity", n.sNoc ? "1" : "0");
      /* Vlhkoměr: v noci vlhko, na slunci a v průvanu sucho */
      const cil = Math.min(1, Math.max(0, 0.5 + 0.28 * m - 0.14 * sk.sila - (oknoOtevrene ? 0.36 : 0)));
      vzduch = vse || vzduch < 0 ? cil : vzduch + (cil - vzduch) * 0.25;
      rucicka.setAttribute("transform", `rotate(${(-110 + 220 * vzduch).toFixed(1)})`);
    }
    const d = Math.min(6, Math.floor(h / 24));
    if (d !== den) {
      const prvni = den < 0;
      den = d;
      dnes.setAttribute("transform", `translate(${KALENDAR.x + 8 + KALENDAR.bunka * d + KALENDAR.bunka / 2} ${KALENDAR.y + 41})`);
      krizky.forEach((c, i) => c.classList.toggle("je", i < d));
      if (!prvni) {
        restart(dnes, "kresli");
        zvuk.papir();
      }
    }
  };

  /* ——— Vodováhy, barvy, tvary ——— */
  const kresliKusy = (ted: number, vse = false) => {
    const barvy = vse || ted - posledniBarvy > 100;
    if (barvy) posledniBarvy = ted;
    for (const x of kusy) {
      /* Obracení: v půlce se prohodí strana, na konci kus dosedne */
      if (x.obratOd) {
        const u = ted - x.obratOd;
        if (!x.obratPrehozeno && u >= OBRAT_MS * 0.48) {
          x.obratPrehozeno = true;
          vykresliTelo(x);
        }
        if (u >= OBRAT_MS) {
          x.obratOd = 0;
          x.el.classList.remove("obraci");
          zvuk.drevo(0.9);
          oblacky(x);
        }
      }
      const otoceny = x.obratOd && !x.obratPrehozeno ? !x.k.otoceny : x.k.otoceny;
      if (vse || Math.abs(x.k.w - x.wKresleno) >= 0.02 || x.k.prasklo !== x.prasklKresleno || otoceny !== x.otocenyKresleno) vykresliTelo(x);
      else if (barvy) {
        const klic = `${Math.round(x.k.a * 150)}|${Math.round(x.k.b * 150)}`;
        if (klic !== x.barvaKlic) {
          x.barvaKlic = klic;
          obarvi(x);
        }
      }
      const g = mezera(x.k);
      const bx = x.k.prasklo || x.k.suchy ? 0 : Math.max(-19, Math.min(19, (g / PRAH) * 9));
      if (Math.abs(bx - x.bublinaX) > 0.04 || vse) {
        x.bublinaX = bx;
        x.bublina.setAttribute("transform", `translate(${bx.toFixed(2)} 0)`);
      }
      const stav = x.k.prasklo ? "prasklo" : x.k.suchy ? "suche" : g > PRAH ? "zle" : g > 0.72 * PRAH ? "pozor" : "ok";
      if (stav !== x.stav) {
        x.stav = stav;
        x.vv.setAttribute("data-stav", stav);
      }
      x.vv.classList.toggle("v-slunci", x.slunce && !x.k.suchy && !x.k.prasklo);
      if (barvy) aktualizujPopis(x);
    }
  };

  /* ——— Záclona ——— */
  const kresliZaves = (vse = false) => {
    const cil = oknoOtevrene ? 1 : 0;
    if (!vse && Math.abs(zavesSila - cil) < 0.002 && cil === 0) return;
    const z = zaves(zavesSila, zavesFaze);
    zavesPlachta.setAttribute("d", z.plachta);
    zavesZahyby.setAttribute("d", z.zahyby);
    zavesLem.setAttribute("d", z.lem);
  };

  /* ——— Částice ——— */
  const pridej = (el: SVGElement, c: Omit<Castice, "el">) => {
    if (p.klid) return;
    el.setAttribute("transform", `translate(${c.x.toFixed(1)} ${c.y.toFixed(1)}) rotate(${c.rot.toFixed(0)})`);
    casticeVrstva.append(el);
    castice.push({ el, ...c });
  };
  const list = () => {
    const el = document.createElementNS(SVGNS, "g");
    const barvy = ["#D98A3A", "#C9702E", "#E2A548", "#B5562A", "#E8C35A"];
    el.innerHTML =
      `<path d="M0 0 C3 -5.4 10 -6.4 15 0 C10 6.4 3 5.4 0 0 Z" fill="${barvy[Math.floor(Math.random() * barvy.length)]}"/>` +
      `<path d="M0 0 L13 0 M-3 0 L0 0" stroke="#7A4A22" stroke-width="0.9" opacity="0.7"/>`;
    pridej(el, {
      x: 52 + Math.random() * 60,
      y: 110 + Math.random() * 170,
      vx: 150 + Math.random() * 130,
      vy: -30 + Math.random() * 50,
      rot: Math.random() * 360,
      vr: -200 + Math.random() * 400,
      zivot: 0,
      max: 2.4 + Math.random() * 1,
      druh: "list",
      zem: 0,
      faze: Math.random() * 6,
    });
  };
  const strepy = (x: KusHry) => {
    for (let i = 0; i < 6; i++) {
      const el = document.createElementNS(SVGNS, "path");
      const s = 3 + Math.random() * 3.5;
      el.setAttribute("d", `M0 ${-s} L${s * 0.9} ${s * 0.6} L${-s * 0.8} ${s * 0.5} Z`);
      el.setAttribute("fill", hlina(x.k.a, (i % 3) * 0.3 - 0.3));
      pridej(el, {
        x: x.m.x + (Math.random() - 0.5) * 50,
        y: x.m.y - 20 - Math.random() * 20,
        vx: (Math.random() - 0.5) * 140,
        vy: -110 - Math.random() * 90,
        rot: Math.random() * 360,
        vr: -500 + Math.random() * 1000,
        zivot: 0,
        max: 1.6,
        druh: "strep",
        zem: x.m.y + 6 + Math.random() * 8,
        faze: 0,
      });
    }
  };
  const oblacky = (x: KusHry) => {
    for (let i = 0; i < 4; i++) {
      const el = document.createElementNS(SVGNS, "circle");
      el.setAttribute("r", "4");
      el.setAttribute("fill", "#FFF6E8");
      pridej(el, {
        x: x.m.x + (i - 1.5) * 30 + (Math.random() - 0.5) * 10,
        y: x.m.y + 6,
        vx: (i - 1.5) * 26,
        vy: -16 - Math.random() * 10,
        rot: 0,
        vr: 0,
        zivot: 0,
        max: 0.6,
        druh: "obl",
        zem: 0,
        faze: 0,
      });
    }
  };
  const kresliCastice = (dt: number) => {
    for (let i = castice.length - 1; i >= 0; i--) {
      const c = castice[i];
      c.zivot += dt;
      if (c.druh === "list") {
        c.faze += dt * 5;
        c.vy += Math.sin(c.faze) * 60 * dt + 18 * dt;
      } else if (c.druh === "strep") {
        if (c.y < c.zem) {
          c.vy += 520 * dt;
        } else {
          c.y = c.zem;
          c.vy = Math.abs(c.vy) > 60 ? -Math.abs(c.vy) * 0.3 : 0;
          c.vx *= 0.6;
          c.vr *= 0.5;
        }
      } else {
        c.vx *= 0.94;
        c.vy *= 0.94;
      }
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.rot += c.vr * dt;
      const zbyva = c.max - c.zivot;
      if (zbyva <= 0 || c.x > 830) {
        c.el.remove();
        castice.splice(i, 1);
        continue;
      }
      if (c.druh === "obl") {
        const u = c.zivot / c.max;
        c.el.setAttribute("transform", `translate(${c.x.toFixed(1)} ${c.y.toFixed(1)}) scale(${(1 + u * 1.8).toFixed(2)})`);
        c.el.setAttribute("opacity", (0.55 * (1 - u)).toFixed(2));
      } else {
        c.el.setAttribute("transform", `translate(${c.x.toFixed(1)} ${c.y.toFixed(1)}) rotate(${c.rot.toFixed(0)})`);
        c.el.setAttribute("opacity", Math.min(1, zbyva / 0.5).toFixed(2));
      }
    }
  };

  /* ——— Okno a průvan ——— */
  const priletBublinky = () => {
    bublinkaOd = t;
    bublinkaDo = t + 2.2;
    restart(bublinka, "leti");
    zvuk.pop();
  };
  const otevriOkno = () => {
    oknoOtevrene = true;
    pruvanu++;
    pruvanDo = t + PRUVAN_DOBA;
    k.classList.add("mr5-otevreno", "mr5-pruvan");
    oknoTl.forEach((b) => (b.disabled = false));
    dalsiList = t;
    dalsiPoryv = t;
    zvuk.latka();
    rekni("Průvan! Kdo otevřel okno? Bublinko!", kachlik, true);
    if (pruvanu === 1) p.zprava("Průvan! Klepni na okno a zavři ho.");
  };
  const zavriOkno = (hrac: boolean) => {
    if (!oknoOtevrene) return;
    oknoOtevrene = false;
    k.classList.remove("mr5-otevreno", "mr5-pruvan");
    oknoTl.forEach((b) => (b.disabled = true));
    zvuk.drevo(0.7);
    if (hrac) {
      zavrenoHracem++;
      rekni(zavrenoHracem === 1 ? "Zavřeno. Zapisuji: okno, jednou." : "Zase ona. Zapisuji: okno, podruhé.", kachlik, true);
    }
  };

  /* ——— Akce hráče ——— */
  const prikryj = (x: KusHry) => {
    if (!bezi) return;
    zvuk.odemkni();
    if (x.k.prasklo) {
      p.zprava("Prasklé. To už nesrovnáš.");
      return;
    }
    x.k.prikryty = !x.k.prikryty;
    x.el.classList.toggle("prikryto", x.k.prikryty);
    x.popis = "";
    aktualizujPopis(x);
    if (x.k.prikryty) zvuk.sumik(0.25, 2600, 0.8, 0.12);
    else zvuk.sumik(0.18, 3300, 0.9, 0.08);
    if (x.k.prikryty && mezera(x.k) > 0.72 * PRAH && !foliiRekl) {
      foliiRekl = true;
      rekni("Tak. Pod fólií se to srovná.", x.tl);
    }
  };
  const obrat = (x: KusHry) => {
    if (!bezi || !x.k.druh.obracet || x.k.prasklo || x.k.suchy || x.obratOd) return;
    zvuk.odemkni();
    x.k.otoceny = !x.k.otoceny;
    x.popis = "";
    zvuk.hnet();
    if (p.klid) {
      vykresliTelo(x);
      zvuk.drevo(0.9);
      return;
    }
    x.obratOd = performance.now();
    x.obratPrehozeno = false;
    restart(x.el, "obraci");
  };
  const vyber = (i: number) => {
    vybrany = i;
    kusy.forEach((x, j) => x.tl.classList.toggle("vybrany", j === i));
    kusy[i].tl.focus({ preventScroll: true });
  };

  /** Kachlík poradí, který kus je na tom nejhůř */
  const porad = () => {
    if (!bezi) return;
    zvuk.reakce("kachlik");
    kachlikReaguje("skace");
    const ziva = kusy.filter((x) => !x.k.prasklo && !x.k.suchy);
    const nejhorsi = ziva.filter((x) => !x.k.prikryty).sort((a, b) => mezera(b.k) - mezera(a.k))[0];
    const srovnany = ziva.find((x) => x.k.prikryty && Math.abs(mezera(x.k)) < 0.05);
    let text: string;
    if (!ziva.length) text = "Hotovo. Teď už jen razítka.";
    else if (nejhorsi && mezera(nejhorsi.k) > 0.6 * PRAH) {
      const j = JAK[nejhorsi.m.id];
      text = nejhorsi.k.druh.obracet ? `${j.Kdo} se kroutí. Obrať ${j.ho}, nebo přikryj.` : `${j.Kdo} se kroutí. Přikryj ${j.ho}.`;
    } else if (srovnany) {
      const j = JAK[srovnany.m.id];
      text = `${j.Kdo} už je ${j.zensky ? "srovnaná" : "srovnaný"}. Odkryj ${j.ho}, ať schne.`;
    } else {
      const r = kamiInfo.kachlik.repliky;
      text = Math.random() < 0.5 ? "Všechno rovně. Zatím." : r[Math.floor(Math.random() * r.length)];
    }
    rekni(text, kachlik, true);
  };

  /* ——— Události sušení ——— */
  const prasklo = (x: KusHry) => {
    x.k.prikryty = false;
    x.el.classList.remove("prikryto");
    restart(x.el, "praskl");
    x.obrat.forEach((b) => (b.disabled = true));
    zvuk.tres();
    strepy(x);
    kachlikReaguje("lekne");
    rekni("Prasklo. Úředně zaznamenáno.", x.tl, true);
  };
  const uschlo = (x: KusHry) => {
    uschlych++;
    x.cedulka.classList.add("suche");
    restart(x.cedulka, "ted");
    x.obrat.forEach((b) => (b.disabled = true));
    zvuk.razitko();
    kachlikReaguje("skace");
    if (uschlych === 1) rekni(x.k.w > 0.3 ? "Suché. Rovné úplně ne, ale razítko dostane." : "Suché a rovné. Razítko: 正.", x.tl);
  };
  const varuj = (x: KusHry) => {
    varovani++;
    zvuk.ton(700, 520, 0.14, "triangle", 0.05);
    const j = JAK[x.m.id];
    if (varovani === 1) rekni(x.k.druh.obracet ? `Nakřivo! ${j.Kdo} se kroutí. Obrať ${j.ho}, nebo přikryj.` : "Nakřivo! To není rovné. Přikryj to.", x.tl, true);
    else if (!x.k.prikryty) rekni(Math.random() < 0.5 ? `${j.Kdo} je nakřivo. To není rovné.` : "Bublina utíká. To není dobré znamení.", x.tl);
  };

  /* ——— Konec ——— */
  const kdy = (h: number) => {
    const d = Math.min(6, Math.floor(h / 24));
    const hod = h - d * 24;
    const cast = hod < 10 ? "ráno" : hod < 12 ? "dopoledne" : hod < 18 ? "odpoledne" : hod < 22 ? "večer" : "v noci";
    return `${V_DEN[d]} ${cast}`;
  };
  const vysledek = (hotovo: boolean): Vysledek => {
    const h = hodnot(kusy.map((x) => x.k));
    const veta = !h.proslo
      ? h.prasklo >= 2
        ? "Tohle nepodepíšu. Ani razítkem."
        : "Mokré nepodepisuju. Razítko by se rozteklo."
      : h.body >= 85
        ? "Rovné. Všechno. Úředně správně: 正."
        : h.body >= 65
          ? "Skoro rovné. Já bych to nepodepsal, ale budiž."
          : "Trochu se to kroutí. Na kafe to stačí.";
    const udaje: [string, string][] = [
      ["Prasklo", cislo(h.prasklo)],
      ["Největší zkroucení", h.nejvic === null ? "—" : `${cislo(Math.round(h.nejvic * 100))} %`],
      ["Suché", `${h.suche} z ${kusy.length}`],
    ];
    if (hotovo && h.proslo) udaje.push(["Hotovo", kdy(hodinaV(t))]);
    return { body: h.body, proslo: h.proslo, veta, udaje };
  };
  const konci = (hotovo: boolean) => {
    if (skoncila) return;
    skoncila = true;
    bezi = false;
    zavriOkno(false);
    bublinkaOd = -1;
    bublinkaDo = -1;
    bublinka.classList.remove("leti");
    /* Listí ve vzduchu dolétne rychle, ať pod výsledkovou kartou nevisí */
    for (const c of castice) if (c.druh === "list") c.max = Math.min(c.max, c.zivot + 0.7);
    k.classList.remove("mr5-bezi");
    k.classList.add("mr5-konec");
    const mokre = kusy.filter((x) => !x.k.prasklo && !x.k.suchy);
    mokre.forEach((x) => x.cedulka.classList.add("mokre"));
    const v = vysledek(hotovo);
    if (hotovo && v.proslo) {
      zvuk.cink();
      kachlikReaguje("skace");
    } else if (mokre.length) zvuk.kapka();
    konecCas = window.setTimeout(
      () => {
        konecCas = undefined;
        if (!zastaveno) p.konec(v);
      },
      p.klid ? 500 : 1500,
    );
  };

  /* ——— Smyčka ——— */
  const simuluj = (dt: number) => {
    t = Math.min(T_HRY, t + dt);
    const h = hodinaV(t);

    /* Bublinka přiletí, otevře okno; průvan trvá, dokud se okno nezavře */
    if (dalsiPrilet < prilety.length && t >= prilety[dalsiPrilet]) {
      dalsiPrilet++;
      priletBublinky();
    }
    if (bublinkaOd >= 0 && t >= bublinkaOd + OTEVRE_ZA) {
      bublinkaOd = -1;
      otevriOkno();
    }
    if (bublinkaDo >= 0 && t >= bublinkaDo) {
      bublinkaDo = -1;
      bublinka.classList.remove("leti");
    }
    if (oknoOtevrene) {
      if (t >= pruvanDo) zavriOkno(false);
      else {
        if (t >= dalsiList) {
          dalsiList = t + 0.22 + Math.random() * 0.25;
          list();
        }
        if (t >= dalsiPoryv) {
          dalsiPoryv = t + 1.1;
          zvuk.sumik(1.4, 420 + Math.random() * 260, 0.6, 0.08);
        }
      }
    }

    const sk = skvrna(h);
    for (const x of kusy) {
      const bylo = { prasklo: x.k.prasklo, suchy: x.k.suchy };
      x.slunce = veSlunci(sk, x.m.stred[0], x.m.stred[1]);
      krok(x.k, dt, x.slunce, oknoOtevrene);
      if (!bylo.prasklo && x.k.prasklo) prasklo(x);
      else if (!bylo.suchy && x.k.suchy) uschlo(x);
      const zle = !x.k.prasklo && !x.k.suchy && !x.obratOd && mezera(x.k) > PRAH;
      if (zle && !x.zle) varuj(x);
      x.zle = zle;
    }

    /* Noc a neděle */
    if (!nocRekl && tma(h) > 0.6) {
      nocRekl = true;
      rekni("Noc. Hlína schne i potmě. Já taky nespím.");
    }
    if (!nedeleRekl && h >= 6 * 24 + 7 && kusy.some((x) => !x.k.prasklo && !x.k.suchy)) {
      nedeleRekl = true;
      rekni("Neděle. Co nebude do večera suché, nepodepíšu.", kachlik, true);
    }

    const suche = kusy.filter((x) => x.k.suchy && !x.k.prasklo).length;
    const text = `${DNY[Math.min(6, Math.floor(h / 24))]} · suché ${suche}/${kusy.length}`;
    if (text !== ukazatel) {
      ukazatel = text;
      p.ukazatel(text);
    }

    if (kusy.every((x) => x.k.suchy || x.k.prasklo)) konci(true);
    else if (t >= T_HRY) konci(false);
  };

  const kresli = (dt: number, ted: number) => {
    kresliCas(t, ted);
    kresliKusy(ted);
    const cil = oknoOtevrene ? 1 : 0;
    if (p.klid) {
      if (zavesSila !== cil) {
        zavesSila = cil;
        zavesFaze = 0;
        kresliZaves(true);
      }
    } else if (cil || zavesSila > 0.002) {
      zavesSila += (cil - zavesSila) * Math.min(1, dt * (cil ? 3.2 : 2.2));
      zavesFaze += dt * 7;
      if (!cil && zavesSila <= 0.002) zavesSila = 0;
      kresliZaves(true);
    }
    kresliCastice(dt);
  };

  const smycka = (ted: number) => {
    const dt = posledni ? Math.min(0.05, Math.max(0, (ted - posledni) / 1000)) : 0;
    posledni = ted;
    if (bezi) simuluj(dt);
    kresli(dt, ted);
    raf = requestAnimationFrame(smycka);
  };

  vychozi();

  return {
    start() {
      if (bezi || skoncila || zastaveno) return;
      bezi = true;
      k.classList.add("mr5-bezi");
      const signal = ac.signal;
      for (const x of kusy) {
        x.tl.addEventListener("click", () => prikryj(x), { signal });
        x.obrat.forEach((b) => b.addEventListener("click", () => obrat(x), { signal }));
      }
      oknoTl.forEach((b) => b.addEventListener("click", () => zavriOkno(true), { signal }));
      kachlik.addEventListener("click", porad, { signal });
      k.addEventListener("pointerdown", () => k.classList.remove("mr5-klavesnice"), { signal });
      document.addEventListener(
        "keydown",
        (e) => {
          if (!bezi || e.ctrlKey || e.metaKey || e.altKey) return;
          const cil = e.target;
          if (cil instanceof HTMLElement && (cil.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(cil.tagName))) return;
          const cifra = /^(?:Digit|Numpad)([1-5])$/.exec(e.code)?.[1] ?? (/^[1-5]$/.test(e.key) ? e.key : null);
          const klavesa = e.code.startsWith("Key") ? e.code.slice(3).toLowerCase() : e.key.toLowerCase();
          if (cifra) {
            k.classList.add("mr5-klavesnice");
            vyber(Number(cifra) - 1);
          } else if (klavesa === "c") {
            if (e.repeat) return;
            k.classList.add("mr5-klavesnice");
            prikryj(kusy[vybrany]);
          } else if (klavesa === "f") {
            if (e.repeat) return;
            k.classList.add("mr5-klavesnice");
            obrat(kusy[vybrany]);
          } else if (klavesa === "o") zavriOkno(true);
          else return;
          e.preventDefault();
        },
        { signal },
      );
      rekni("Kraje schnou dřív než střed. Hlídej bubliny.", kachlik, true);
      kusy[0].tl.focus({ preventScroll: true });
      posledni = 0;
      raf = requestAnimationFrame(smycka);
    },
    stop() {
      zastaveno = true;
      bezi = false;
      ac.abort();
      cancelAnimationFrame(raf);
      window.clearTimeout(konecCas);
      konecCas = undefined;
    },
  };
};
