/**
 * Průvodce: Vázička v pravém dolním rohu (místo dřívější jízdenky
 * k rezervaci). Sedí tam jako stín — tatáž kresba, jen černá. Po klepnutí
 * nabídne tři otázky podle stránky (data/pruvodce.ts); po výběru ožije,
 * stránka sjede k cíli, Vázička k němu doletí, cíl se rozzáří a ona řekne
 * větu v bublině — přitom se zatočí a vymění si květy za další měsíc.
 * Pak se vrátí do rohu a zase zčerná.
 *
 * Mluví jako hostitelka — nabízí, že uvede, ukáže, doprovodí (texty
 * v data/pruvodce.ts). Čárkou nad ní se dá schovat: zmizí a v rohu
 * zůstane jen malá čárka (pamatuje si to localStorage). Aby úplně
 * nezanikla, kolem čárky se každých 30 vteřin štětcem vykreslí a protočí
 * ensō z loga. Klepnutí na čárku ji vrátí.
 *
 * Na úvodu se jednou za návštěvu webu (localStorage, při vývoji pokaždé)
 * představí: přiletí doprostřed obrazovky, větší, řekne, kdo je, a odletí
 * do rohu, kde zčerná. Kdo na roh mezitím klepne, pošle ji tam hned.
 * Schovanou do čárky nevyruší.
 *
 * Pohyb (oblouky letu, natáčení podle rychlosti, protivítr, pohled) je
 * převzatý ze společnice, která dřív létala po Dílně a schovávala se za
 * karty. Kresbu a její běh má scripts/vazicka-gejsa; prvek se tu vyrobí
 * a beh.js ho rozběhne (spustVse). Klepnout jde na tlačítko v rohu, ne na
 * kresbu — ta klikání na stránku nepřekáží.
 *
 * Spouští ji hlavicka.ts na každé stránce s hlavičkou nového vzhledu.
 */
import { rekni } from "./kami";
import { rozhoupejZaves } from "./zaves";
import { spustVse } from "../vazicka-gejsa/beh.js";
import { rady, hlasky } from "../../data/pruvodce";
import { hlavni as ensoTah, kapka as ensoKapka, W as ENSO_W } from "../../components/navrhy-loga/enso-tvar";
import type { Rada } from "../../data/pruvodce";

type Bod = { x: number; y: number };
type Drzeni = { naklon: number; otoc: number; pohled: [number, number] } | null;
interface Akce { delka: number; krok: (q: number) => void; start?: () => void }

/** Kde je postava v rámečku 180 × 180, v násobcích jeho strany od středu (změřeno z kresby) */
const POSTAVA = { l: -0.21, r: 0.22, t: -0.24, b: 0.43 };
/** Jak daleko od pravého a dolního okraje okna sedí */
const OKRAJ = { r: 14, b: 10 };
/** Jak často se kolem čárky protočí ensō, v milisekundách */
const ENSO_KAZDYCH = 30_000;
/** Na kterých stránkách (data-stranka) se jednou za návštěvu webu představí, a jak si to pamatuje */
const PREDSTAVENI = { stranky: ["domek-2"], klic: "pruvodce-predstavena" };
const VYVOJ = !!import.meta.env?.DEV;
/** Pamatuje si, že je schovaná do čárky */
const KLIC_SCHOVANA = "pruvodce-schovana";
const nactiSchovanou = () => {
  try {
    return localStorage.getItem(KLIC_SCHOVANA) === "1";
  } catch {
    return false;
  }
};
const ulozSchovanou = (ano: boolean) => {
  try {
    if (ano) localStorage.setItem(KLIC_SCHOVANA, "1");
    else localStorage.removeItem(KLIC_SCHOVANA);
  } catch {
    /* bez úložiště se po načtení zase ukáže — nevadí */
  }
};
/** Ensō z loga (tah štětce, kapka na začátku) v soumrakových barvách loga; maska ho kreslí po směru tahu */
const ensoSvg = () => `<svg class="pruvodce-enso" viewBox="0 0 200 200" aria-hidden="true">
  <defs>
    <linearGradient id="pruvodce-enso-barva" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#C4432B"/><stop offset="0.4" stop-color="#A0527A"/><stop offset="0.75" stop-color="#5E4E86"/><stop offset="1" stop-color="#2A2C5E"/>
    </linearGradient>
    <mask id="pruvodce-enso-maska" maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200">
      <circle class="pruvodce-enso-odhal" cx="100" cy="100" r="68" pathLength="1" fill="none" stroke="#fff" stroke-width="46" transform="rotate(-30 100 100)"/>
    </mask>
  </defs>
  <g mask="url(#pruvodce-enso-maska)" fill="url(#pruvodce-enso-barva)">
    <path d="${ensoTah}"/>
    <ellipse cx="${ensoKapka.x}" cy="${ensoKapka.y}" rx="${(ENSO_W * 0.6).toFixed(2)}" ry="${(ENSO_W * 0.53).toFixed(2)}" transform="rotate(${ensoKapka.uhel} ${ensoKapka.x} ${ensoKapka.y})"/>
  </g>
</svg>`;

const omez = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const hladce = (q: number) => q * q * (3 - 2 * q);
const nahodne = (a: number, b: number) => a + Math.random() * (b - a);
const kCili = (v: number, cil: number, dt: number, tau: number) => v + (cil - v) * (1 - Math.exp(-dt / tau));
/** Jak dlouho visí bublina (rekni v kami.ts ji zavře za 3,6 s + 30 ms na znak) */
const delkaBubliny = (text: string) => 3.9 + text.length * 0.03;
/** Rozzáří závěs s kami a rozhoupe ho (animace zaves-zari v parta2.css doběhne sama) */
const rozzarZaves = () => {
  const z = document.querySelector<HTMLElement>("[data-zaves]");
  if (!z) return;
  z.classList.remove("zaves-zari");
  void z.offsetWidth;
  z.classList.add("zaves-zari");
  rozhoupejZaves();
};
/** Rozsvítí prvek, na který ukazuje (animace v parta2.css doběhne sama) */
const rozzar = (el: Element) => {
  el.classList.remove("pruvodce-ukazuje");
  void (el as HTMLElement).offsetWidth;
  el.classList.add("pruvodce-ukazuje");
};
/** Je prvek opravdu vidět — má rozměr a není ve schovaném rodiči */
const viditelny = (el: Element | null): el is HTMLElement => {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && !el.closest("[hidden]");
};

export function pruvodce() {
  if (document.querySelector(".pruvodce")) return;
  const stranka = document.body.dataset.stranka ?? "";
  const klidne = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

  /* ——— Prvky: létající Vázička, tlačítko v rohu a nabídka ——— */
  const O = document.createElement("div");
  O.className = "pruvodce stin";
  O.setAttribute("aria-hidden", "true");
  const T = document.createElement("div");
  T.className = "pruvodce-telo";
  const VG = document.createElement("div");
  VG.className = "vazicka-gejsa";
  /* Vlastní id (vgp-), ať se nepotká s jinou Vázičkou na stránce — viz kamiPruvodce */
  VG.dataset.vazickaGejsa = "pruvodce";
  T.append(VG);
  O.append(T);

  const tlacitko = document.createElement("button");
  tlacitko.type = "button";
  tlacitko.className = "pruvodce-tlacitko";
  tlacitko.setAttribute("aria-label", "Vázička — smí ti poradit?");
  tlacitko.setAttribute("aria-expanded", "false");
  tlacitko.setAttribute("aria-controls", "pruvodce-nabidka");
  const napoveda = document.createElement("span");
  napoveda.className = "pruvodce-napoveda";
  napoveda.setAttribute("aria-hidden", "true");
  napoveda.textContent = hlasky.napoveda;
  tlacitko.append(napoveda);

  const nabidka = document.createElement("div");
  nabidka.className = "pruvodce-nabidka";
  nabidka.id = "pruvodce-nabidka";
  nabidka.setAttribute("role", "dialog");
  nabidka.setAttribute("aria-labelledby", "pruvodce-titul");
  nabidka.hidden = true;
  const titul = document.createElement("p");
  titul.className = "pruvodce-titul";
  titul.id = "pruvodce-titul";
  titul.textContent = hlasky.titul;
  const seznam = document.createElement("div");
  seznam.className = "pruvodce-volby";
  nabidka.append(titul, seznam);

  /* Čárkou nad ní se schová; v rohu pak zůstane jen malá čárka, kolem které se občas protočí ensō */
  const zmensit = document.createElement("button");
  zmensit.type = "button";
  zmensit.className = "pruvodce-zmensit";
  zmensit.setAttribute("aria-label", "Schovat Vázičku do čárky");
  zmensit.title = "Schovat";
  const carka = document.createElement("button");
  carka.type = "button";
  carka.className = "pruvodce-carka";
  carka.setAttribute("aria-label", "Zavolat Vázičku zpátky");
  carka.title = hlasky.carka;
  carka.innerHTML = `${ensoSvg()}<i class="pruvodce-carka-tah" aria-hidden="true"></i>`;
  carka.hidden = true;

  /* Co řekne, slyší i čtečka */
  const hlas = document.createElement("p");
  hlas.className = "pruvodce-hlas";
  hlas.setAttribute("aria-live", "polite");

  document.body.append(O, tlacitko, zmensit, carka, nabidka, hlas);
  spustVse();

  /* Po každé radě se zatočí a vymění si květy za další měsíc — umí to sama na klepnutí (beh.js, kami-kvety.js), tak se jí klepnutí jen pošle */
  const vymenKvety = () => {
    (VG as HTMLElement & { __scena?: { stav: () => { vstup: { kliky: { x: number; y: number }[] } } } }).__scena?.stav().vstup.kliky.push({ x: 90, y: 90 });
  };

  let bublina: (() => boolean) | null = null;
  const rekniTu = (text: string) => {
    bublina = rekni(VG, "vazicka", text, { pevne: true, cerna: true });
    hlas.textContent = `Vázička: ${text}`;
  };

  /* ═══ Rozměry, kotva a klidové místo ═══ */
  let B = 80, W = 0, H = 0;
  const zmer = () => {
    W = document.documentElement.clientWidth;
    H = window.innerHeight;
    B = Math.round(omez(Math.min(W * 0.078, H * 0.13), 84, 124));
    O.style.width = O.style.height = `${B}px`;
    tlacitko.style.setProperty("--b", `${B}px`);
    nabidka.style.setProperty("--b", `${B}px`);
    zmensit.style.setProperty("--b", `${B}px`);
  };
  zmer();
  /** Kde v rohu sedí — střed rámečku tak, aby spodek postavy byl kousek nad okrajem okna */
  const doma = (): Bod => ({ x: W - OKRAJ.r - POSTAVA.r * B - 4, y: H - OKRAJ.b - POSTAVA.b * B });
  const DOMA_POZA: Drzeni = { naklon: -3, otoc: -22, pohled: [-0.9, 0.2] };

  /** Kotva, vůči které se drží poloha: prvek (jede s ním při scrollu), nebo okno */
  let kotva: Element | null = null;
  const puvod = (k: Element | null = kotva): Bod => {
    if (!k) return { x: 0, y: 0 };
    const r = k.getBoundingClientRect();
    return { x: r.left, y: r.top };
  };
  const poz = { ...doma(), m: 1 };
  let predX = poz.x, predY = poz.y;
  const naObrazovce = (): Bod => {
    const p = puvod();
    return { x: p.x + poz.x, y: p.y + poz.y };
  };
  const prekotvi = (nova: Element | null) => {
    const s = naObrazovce();
    kotva = nova;
    const p = puvod();
    poz.x = s.x - p.x;
    poz.y = s.y - p.y;
    predX = poz.x;
    predY = poz.y;
  };
  const hlavaDole = () => document.querySelector(".hlava")?.getBoundingClientRect().bottom ?? 0;

  /* ═══ Stav a akce ═══ */
  let drzi: Drzeni = DOMA_POZA;
  const vid = { otoc: -22, naklon: -3, vitr: 0, pohled: [-0.9, 0.2] as [number, number], vx: 0, vy: 0 };
  let cas = 0;
  let fronta: Akce[] = [];
  let akce: Akce | null = null;
  let akceCas = 0;
  /** Je pryč z rohu (letí, ukazuje, vrací se) */
  let venku = false;

  /** Přelet obloukem na bod v souřadnicích kotvy (a s velikostí `m`); s omezeným pohybem se jen přenese */
  const let_ = (cil: () => Bod, m = 1): Akce => {
    let a: Bod = poz, b: Bod = poz, c: Bod = poz, m0 = 1;
    return {
      delka: 1,
      start() {
        a = { x: poz.x, y: poz.y };
        b = cil();
        m0 = poz.m;
        const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        this.delka = klidne ? 0.01 : omez(d / Math.max(300, W * 0.26), 0.7, 2.6);
        const o = (Math.random() < 0.5 ? -1 : 1) * nahodne(0.12, 0.28) * d;
        c = { x: (a.x + b.x) / 2 - ((b.y - a.y) / d) * o, y: Math.min((a.y + b.y) / 2 + ((b.x - a.x) / d) * o, Math.min(a.y, b.y) - 0.1 * d) };
        drzi = null;
      },
      krok(q) {
        const t = hladce(q);
        poz.x = (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * c.x + t * t * b.x;
        poz.y = (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * c.y + t * t * b.y;
        poz.m = m0 + (m - m0) * t;
      },
    };
  };
  const cekej = (delka: number, d?: Drzeni): Akce => ({ delka, start: () => { if (d !== undefined) drzi = d; }, krok: () => {} });
  const hned = (fn: () => void): Akce => ({ delka: 0.01, start: fn, krok: () => {} });
  const kotvi = (k: () => Element | null) => hned(() => prekotvi(k()));

  /** Zpátky do rohu a zčernat */
  const domu = (): Akce[] => [
    kotvi(() => null),
    let_(doma),
    cekej(0.25, DOMA_POZA),
    hned(() => {
      O.classList.add("stin");
      venku = false;
      tlacitko.classList.remove("prazdno");
      zmensit.hidden = false;
    }),
  ];

  /* ═══ Cíl rady: kam letí a jak se tváří ═══ */
  const najdi = (r: Rada): { el: HTMLElement; vHlavicce: boolean; menu: boolean } | null => {
    if (r.cil.startsWith("nav:")) {
      const odkaz = document.querySelector<HTMLElement>(`.hlava-nav a[href="${r.cil.slice(4)}"]`);
      if (viditelny(odkaz)) return { el: odkaz, vHlavicce: true, menu: false };
      const menu = document.querySelector<HTMLElement>(".hlava-menu-tlacitko");
      if (viditelny(menu)) return { el: menu, vHlavicce: true, menu: true };
      return null;
    }
    const el = document.querySelector<HTMLElement>(r.cil);
    return viditelny(el) ? { el, vHlavicce: false, menu: false } : null;
  };

  const ukaz = (r: Rada) => {
    const c = najdi(r);
    if (!c) return;
    const { el } = c;
    const veta = c.menu && r.vMenu ? r.vMenu : r.veta;
    /* Cíl mimo obraz: stránka k němu sjede; Vázička je ukotvená k němu, takže jede s ním */
    /* Hlavička i závěs pod ní stojí, i když se roluje — k nim se nesjíždí */
    if (!c.vHlavicce && !el.closest(".hlava, [data-zaves]")) {
      const rr = el.getBoundingClientRect();
      if (rr.top < hlavaDole() + 20 || rr.bottom > H - 40) el.scrollIntoView({ block: "center", behavior: klidne ? "auto" : "smooth" });
    }
    venku = true;
    O.classList.remove("stin");
    tlacitko.classList.add("prazdno");
    zmensit.hidden = true;
    const k: Akce[] = [cekej(klidne ? 0.01 : 0.35, { naklon: 0, otoc: -10, pohled: [-0.6, -0.8] }), kotvi(() => el)];
    let poza: Drzeni;
    if (c.vHlavicce) {
      /* pod hlavičkou, pod odkazem nebo kousek vlevo pod tlačítkem menu, a kouká nahoru */
      k.push(
        let_(() => {
          const rr = el.getBoundingClientRect();
          return { x: c.menu ? -POSTAVA.r * B : rr.width / 2, y: hlavaDole() - rr.top + 10 - POSTAVA.t * B };
        }),
      );
      poza = c.menu ? { naklon: 5, otoc: 24, pohled: [1.4, -1.3] } : { naklon: 0, otoc: 0, pohled: [0, -1.3] };
    } else {
      /* vedle nadpisu nebo tlačítka: vlevo, když je tam místo, jinak vpravo; natočená k němu */
      const rr = el.getBoundingClientRect();
      const vlevo = rr.left > (POSTAVA.r - POSTAVA.l) * B + 24;
      k.push(
        let_(() => {
          const r2 = el.getBoundingClientRect();
          const y = Math.min(r2.height / 2, 34);
          return vlevo ? { x: -POSTAVA.r * B - 10, y } : { x: r2.width - POSTAVA.l * B + 10, y };
        }),
      );
      poza = vlevo ? { naklon: 7, otoc: 34, pohled: [1.9, 0.2] } : { naklon: -7, otoc: -34, pohled: [-1.9, 0.2] };
    }
    k.push(
      cekej(klidne ? 0.01 : 0.35, poza),
      hned(() => {
        if (r.efekt === "zaves") rozzarZaves();
        else rozzar(el);
        vymenKvety();
        rekniTu(veta);
      }),
      cekej(delkaBubliny(veta)),
      ...domu(),
    );
    fronta = k;
    akce = null;
  };

  /* ═══ Nabídka ═══ */
  const nabidni = () => {
    const moje = rady[stranka] ?? rady.vychozi;
    seznam.textContent = "";
    for (const r of moje) {
      if (!najdi(r)) continue;
      const b = document.createElement("button");
      b.type = "button";
      b.className = "pruvodce-volba";
      b.textContent = r.otazka;
      b.addEventListener("click", () => {
        zavri(false);
        ukaz(r);
      });
      seznam.append(b);
    }
    if (!seznam.childElementCount) {
      const nic = document.createElement("p");
      nic.className = "pruvodce-nic";
      nic.textContent = hlasky.nic;
      seznam.append(nic);
    }
  };
  const otevri = () => {
    nabidni();
    nabidka.hidden = false;
    tlacitko.setAttribute("aria-expanded", "true");
    O.classList.add("posloucha");
    drzi = { naklon: -2, otoc: -12, pohled: [-0.6, -0.9] };
    nabidka.querySelector<HTMLElement>("button")?.focus({ preventScroll: true });
  };
  function zavri(vratitFokus = true) {
    if (nabidka.hidden) return;
    nabidka.hidden = true;
    tlacitko.setAttribute("aria-expanded", "false");
    O.classList.remove("posloucha");
    if (!venku) drzi = DOMA_POZA;
    if (vratitFokus) tlacitko.focus({ preventScroll: true });
  }

  tlacitko.addEventListener("click", () => {
    /* Když je zrovna pryč, klepnutí ji zavolá zpátky */
    if (venku) {
      fronta = domu();
      akce = null;
      return;
    }
    if (nabidka.hidden) otevri();
    else zavri();
  });
  /* ═══ Čárka ═══ */
  let schovana = false;
  let enso = 0;
  const protoc = () => {
    if (!schovana || document.hidden) return;
    carka.classList.remove("toci");
    void carka.offsetWidth;
    carka.classList.add("toci");
  };
  const schovej = (hned = false) => {
    zavri(false);
    schovana = true;
    ulozSchovanou(true);
    zmensit.hidden = true;
    const dorekni = () => {
      O.classList.add("schovana");
      tlacitko.hidden = true;
      carka.hidden = false;
      window.clearInterval(enso);
      enso = window.setInterval(protoc, ENSO_KAZDYCH);
      /* poprvé hned, ať je vidět, kam se schovala */
      if (!hned) window.setTimeout(protoc, 600);
    };
    if (hned || klidne) return dorekni();
    rekniTu(hlasky.schovat);
    window.setTimeout(dorekni, 1600);
  };
  const ukazSe = () => {
    schovana = false;
    ulozSchovanou(false);
    window.clearInterval(enso);
    carka.hidden = true;
    carka.classList.remove("toci");
    O.classList.remove("schovana");
    tlacitko.hidden = false;
    zmensit.hidden = false;
    rekniTu(hlasky.zpatky);
    tlacitko.focus({ preventScroll: true });
  };
  zmensit.addEventListener("click", () => schovej());
  carka.addEventListener("click", ukazSe);

  const naKlavesu = (e: KeyboardEvent) => {
    if (e.key === "Escape" && !nabidka.hidden) zavri();
  };
  const naKlik = (e: PointerEvent) => {
    if (nabidka.hidden) return;
    const t = e.target as Node;
    if (!nabidka.contains(t) && !tlacitko.contains(t)) zavri(false);
  };
  document.addEventListener("keydown", naKlavesu);
  document.addEventListener("pointerdown", naKlik);

  /* ═══ Vykreslení ═══ */
  const vykresli = (dt: number) => {
    if (dt > 0) {
      /* rychlost z polohy vůči kotvě — scroll ji nenatáčí */
      vid.vx = kCili(vid.vx, (poz.x - predX) / dt, dt, 0.15);
      vid.vy = kCili(vid.vy, (poz.y - predY) / dt, dt, 0.15);
      const k = omez(vid.vx / 260, -1, 1);
      const cil = drzi ?? { naklon: k * 9, otoc: k * 42, pohled: [k * 1.9, omez(vid.vy / 300, -1, 1) * 1.1] };
      vid.naklon = kCili(vid.naklon, cil.naklon, dt, 0.25);
      vid.otoc = kCili(vid.otoc, cil.otoc, dt, 0.3);
      vid.pohled = [kCili(vid.pohled[0], cil.pohled[0], dt, 0.2), kCili(vid.pohled[1], cil.pohled[1], dt, 0.2)];
      vid.vitr = kCili(vid.vitr, -omez(vid.vx / 200, -2.5, 2.5), dt, 0.2);
    }
    predX = poz.x;
    predY = poz.y;
    const s = naObrazovce();
    const vlna = klidne ? 0 : Math.sin(cas * 2.3) * (venku ? 4 : 1.6);
    const x0 = s.x - B / 2, y0 = s.y - B / 2 + vlna;
    O.style.transform = `translate3d(${x0.toFixed(1)}px, ${y0.toFixed(1)}px, 0)`;
    T.style.transform = `rotate(${vid.naklon.toFixed(2)}deg) scale(${poz.m.toFixed(3)})`;
    if (bublina && !bublina()) bublina = null;

    const sc = (VG as HTMLElement & { __scena?: { stav: () => { dyn: { otoc?: number }; vstup: { vitr?: number; pohled?: [number, number] } } } }).__scena;
    if (sc) {
      const { dyn, vstup } = sc.stav();
      dyn.otoc = vid.otoc;
      vstup.vitr = vid.vitr;
      vstup.pohled = vid.pohled;
    }
  };
  vykresli(0);
  O.classList.add("pripravena");
  /* Schovaná zůstane schovaná i na další stránce */
  if (nactiSchovanou()) schovej(true);
  else predstavSe();

  /* ═══ Představení na úvodu ═══ */
  function predstavSe() {
    if (!PREDSTAVENI.stranky.includes(stranka)) return;
    if (!VYVOJ) {
      try {
        if (localStorage.getItem(PREDSTAVENI.klic) === "1") return;
        localStorage.setItem(PREDSTAVENI.klic, "1");
      } catch {
        /* bez úložiště se představí při každé návštěvě úvodu — nevadí */
      }
    }
    const [prvni, druha] = hlasky.predstaveni;
    venku = true;
    O.classList.remove("stin");
    tlacitko.classList.add("prazdno");
    zmensit.hidden = true;
    /* přiletí shora zprava, zpoza okraje okna */
    poz.x = predX = W + B;
    poz.y = predY = H * 0.12;
    poz.m = 1.5;
    const CELEM: Drzeni = { naklon: 0, otoc: 0, pohled: [0, 0.25] };
    fronta = [
      cekej(klidne ? 0.01 : 1.2),
      let_(() => ({ x: W * 0.5, y: H * 0.46 }), 1.6),
      cekej(klidne ? 0.01 : 0.4, CELEM),
      hned(() => rekniTu(prvni)),
      cekej(delkaBubliny(prvni)),
      let_(doma, 1),
      cekej(0.3, DOMA_POZA),
      hned(() => rekniTu(druha)),
      cekej(delkaBubliny(druha)),
      ...domu().slice(-1),
    ];
    akce = null;
  }

  /* ═══ Smyčka — skončí, když stránka odejde (přechod bez načtení ji vymění) ═══ */
  let minule: number | null = null;
  const smycka = (ted: number) => {
    if (!O.isConnected) {
      window.clearInterval(enso);
      document.removeEventListener("keydown", naKlavesu);
      document.removeEventListener("pointerdown", naKlik);
      window.removeEventListener("resize", naZmenu);
      return;
    }
    requestAnimationFrame(smycka);
    const dt = minule == null ? 0 : Math.min(0.05, (ted - minule) / 1000);
    minule = ted;
    cas += dt;
    if (!akce && fronta.length) {
      akce = fronta.shift() ?? null;
      akceCas = 0;
      akce?.start?.();
    }
    if (akce) {
      akceCas += dt;
      const q = Math.min(1, akceCas / akce.delka);
      akce.krok(q);
      if (q >= 1) akce = null;
    }
    vykresli(dt);
  };
  requestAnimationFrame(smycka);
  /* Po změně velikosti okna se doma přesune do nového rohu */
  const naZmenu = () => {
    zmer();
    if (!venku && !kotva) {
      const d = doma();
      poz.x = predX = d.x;
      poz.y = predY = d.y;
    }
  };
  window.addEventListener("resize", naZmenu);
}
