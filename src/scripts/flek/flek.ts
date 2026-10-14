/**
 * Tušový flek (components/flek/Flek.astro): kaňka na náhodném místě
 * stránky. Po kliknutí se rozlije, vylosuje jeden kus v tuši, přehraje ho
 * a zmizí — na jednu návštěvu stránky jednou. Losuje se z kusů, které
 * člověk ještě neviděl (pamatuje si je prohlížeč); až je viděl všechny,
 * losuje se ze všech.
 *
 *   čeká   malý flek sedí na stránce a jede s ní
 *   roste  rozlévá se do velikosti scény a mezitím se stahuje, co bude hrát
 *   hraje  scéna je vidět a herec (parta3/herec.js) jí posílá události
 *          jako myš — stejně jako režisér na /parta-3; křížek, klepnutí
 *          do scény nebo Esc ji ukončí dřív
 *   mizí   kaňka se stáhne do tečky a vrstva se ze stránky odebere
 *
 * Místo se losuje tak, aby flek neležel na ničem, na co se kliká nebo co
 * se čte, ani v noční sekci, kde by ho na tmavém nebi nebylo vidět. Pamatuje si ho vůči sekci, ve které je, takže jede s obsahem,
 * a když mu pod sebe po změně stránky něco vjede, vylosuje si nové.
 *
 * Scény se nestahují se stránkou: každá postavička má svůj běh
 * (scripts/<postava>-<téma>/beh.js) a choreografii, obojí se načte až po
 * kliknutí. Načtení je jediné místo s čekáním na slib — a protože kód po
 * něm už nepatří stránce (parta2/prechody.ts), slib jen uloží výsledek
 * a dál se pokračuje z časovače.
 */
import { novyHerec } from "../parta3/herec.js";
import { klid, omez, pozice, priMereni, nacti, uloz } from "../parta2/stav";
import { paleta } from "../parta2/paleta";

type Stav = "ceka" | "roste" | "hraje" | "mizi";
interface Kus { kdo: string; kus: string; jmeno: string; nazev: string }
interface Zapis { delka: number; hraj: (h: unknown) => Generator }
interface Scena {
  V: { zacatek?: number };
  stav: () => { t: number; dyn: unknown; vstup: { mys: unknown } };
  znovu: (bdi?: number) => number;
  stuj: (ano: boolean) => void;
}
type SPrvkem = HTMLElement & { __scena?: Scena };
interface Beh { spustVse: () => void; odemkni: () => void }
interface Hra { default: Record<string, Zapis> }
interface Obdelnik { l: number; t: number; r: number; b: number }

/** Kde která postavička hraje: značka scény (třída i data-atribut), její běh a choreografie */
const DILNY: Record<string, { znacka: string; beh: () => Promise<Beh>; hra: () => Promise<Hra> }> = {
  hlinka: { znacka: "hlinka-zeme", beh: () => import("../hlinka-zeme/beh.js"), hra: () => import("../parta3/vystoupeni/hlinka.js") },
  bublinka: { znacka: "bublinka-strasidlo", beh: () => import("../bublinka-strasidlo/beh.js"), hra: () => import("../parta3/vystoupeni/bublinka.js") },
  kapka: { znacka: "kapka-hrom", beh: () => import("../kapka-hrom/beh.js"), hra: () => import("../parta3/vystoupeni/kapka.js") },
  vazicka: { znacka: "vazicka-gejsa", beh: () => import("../vazicka-gejsa/beh.js"), hra: () => import("../parta3/vystoupeni/vazicka.js") },
  cedulka: { znacka: "cedulka-ema", beh: () => import("../cedulka-ema/beh.js"), hra: () => import("../parta3/vystoupeni/cedulka.js") },
  pecinka: { znacka: "pecinka-ohen", beh: () => import("../pecinka-ohen/beh.js"), hra: () => import("../parta3/vystoupeni/pecinka.js") },
  stripek: { znacka: "stripek-zlato", beh: () => import("../stripek-zlato/beh.js"), hra: () => import("../parta3/vystoupeni/stripek.js") },
};

/** Na co se kliká a co se čte — na tom flek neleží */
const PREKAZKY = 'a, button, input, select, textarea, label, summary, [role="button"], [tabindex]:not([tabindex="-1"]), h1, h2, h3, h4, p, li, dt, dd, figure, table, blockquote';
/** Které kusy už člověk viděl (kdo/kus, naposledy puštěný na konci) — pamatuje si prohlížeč */
const KLIC_VIDENO = "flek-videno";
/** Mezera kolem překážek a od kraje stránky */
const ODSTUP = 14;
const KRAJ = 14;
/** Pevná hlavička nahoře a místo na titulek pod scénou */
const HLAVICKA = 84;
const POD = 70;
const POKUSU = 160;
/** Mizení musí sedět s přechodem ve Flek.astro */
const CAS = { rust: 850, nabeh: 600, dozneni: 1800, mizeni: 900 };
/** Kolik snímků smí scéna stát, než se představení vzdá (asi dvě vteřiny) */
const STOJI_NEJDELE = 120;

const nahodne = <T>(pole: T[]) => pole[Math.floor(Math.random() * pole.length)];
/** Sekce, ve které je za ní noční nebe (podle data-hodina jako obloha v parta2/nebe.ts) */
const vNoci = (el: HTMLElement) => {
  const h = Number(el.dataset.hodina);
  return Number.isFinite(h) && paleta(h).noc > 0.3;
};

export function initFlek() {
  const vrstva = document.querySelector<HTMLElement>("[data-flek]");
  const zona = document.querySelector<HTMLElement>("main");
  if (!vrstva || !zona) return;
  const flek = vrstva.querySelector<HTMLElement>(".flek")!;
  const dech = vrstva.querySelector<HTMLElement>(".flek-dech")!;
  const plocha = vrstva.querySelector<HTMLElement>(".flek-plocha")!;
  const tlacitko = vrstva.querySelector<HTMLButtonElement>(".flek-tlacitko")!;
  const krizek = vrstva.querySelector<HTMLButtonElement>(".flek-krizek")!;
  const titulekEl = vrstva.querySelector<HTMLElement>(".flek-titulek")!;
  /* kus, jehož scéna už na stránce je (na /marcel), by se s ní popral o pevná id — ten flek nehraje */
  const kusy = (JSON.parse(vrstva.dataset.kusy || "[]") as Kus[]).filter((k) => DILNY[k.kdo] && !document.querySelector(`[data-${DILNY[k.kdo].znacka}="${k.kus}"]`));
  if (!kusy.length) return;
  const zakazano = [PREKAZKY, vrstva.dataset.mimo].filter(Boolean).join(", ");

  let stav: Stav = "ceka";
  let velikost = 56;
  /** Kde flek sedí: sekce, podíl šířky stránky a kolik pixelů pod jejím horním okrajem */
  let misto: { kotva: Element; fx: number; dy: number } | null = null;
  let herec: ReturnType<typeof novyHerec> | null = null;

  const nastavStav = (s: Stav) => {
    stav = s;
    flek.dataset.stav = s;
  };
  const titulek = (text: string) => {
    const misto = titulekEl.querySelector(".flek-titulek-text");
    if (text && misto) misto.textContent = text;
    titulekEl.classList.toggle("je-videt", !!text);
  };

  /* ——— Místo ——— */

  const sirkaStranky = () => document.documentElement.clientWidth;
  const prekazky = () => {
    const P: Obdelnik[] = [];
    const noc = [...zona.querySelectorAll<HTMLElement>("[data-hodina]")].filter(vNoci);
    for (const el of [...zona.querySelectorAll(zakazano), ...noc]) {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      P.push({ l: r.left + window.scrollX - ODSTUP, t: r.top + window.scrollY - ODSTUP, r: r.right + window.scrollX + ODSTUP, b: r.bottom + window.scrollY + ODSTUP });
    }
    return P;
  };
  const volno = (P: Obdelnik[], x: number, y: number) => !P.some((p) => x < p.r && x + velikost > p.l && y < p.b && y + velikost > p.t);

  const losuj = (P: Obdelnik[]) => {
    const z = pozice(zona);
    const sirka = sirkaStranky();
    const sekce = [...zona.children].map((el) => ({ el, ...pozice(el) }));
    for (let i = 0; i < POKUSU; i++) {
      const x = KRAJ + Math.random() * (sirka - 2 * KRAJ - velikost);
      const y = z.top + HLAVICKA + Math.random() * (z.height - HLAVICKA - velikost - KRAJ);
      if (!volno(P, x, y)) continue;
      const k = sekce.find((s) => y >= s.top && y < s.top + s.height);
      return { kotva: k?.el ?? zona, fx: x / sirka, dy: y - (k?.top ?? z.top) };
    }
    return null;
  };

  /** Posadí flek na jeho místo; když na něm mezitím něco vyrostlo (nebo ještě žádné nemá), vylosuje nové. */
  const umisti = () => {
    if (stav !== "ceka") return;
    velikost = Math.round(omez(window.innerWidth * 0.045, 46, 64));
    const P = prekazky();
    const kde = () => (misto ? { x: misto.fx * sirkaStranky(), y: pozice(misto.kotva).top + misto.dy } : null);
    let m = misto?.kotva.isConnected ? kde() : null;
    if (!m || !volno(P, m.x, m.y)) {
      misto = losuj(P);
      m = kde();
    }
    flek.hidden = !m;
    if (!m) return;
    flek.style.left = `${m.x.toFixed(1)}px`;
    flek.style.top = `${m.y.toFixed(1)}px`;
    flek.style.width = flek.style.height = `${velikost}px`;
  };

  /* ——— Představení ——— */

  const klic = (k: Kus) => `${k.kdo}/${k.kus}`;
  /** Vylosuje kus, který člověk ještě neviděl. Až uvidí všechny, losuje se ze všech — jen ne ten samý dvakrát po sobě. */
  const vylosuj = () => {
    const videno = nacti<string[]>(KLIC_VIDENO, []);
    const nove = kusy.filter((k) => !videno.includes(klic(k)));
    const jine = kusy.filter((k) => klic(k) !== videno[videno.length - 1]);
    return nahodne(nove.length ? nove : jine.length ? jine : kusy);
  };
  /** Zapíše kus mezi viděné, naposledy puštěný na konec. */
  const zapamatuj = (k: Kus) => uloz(KLIC_VIDENO, [...nacti<string[]>(KLIC_VIDENO, []).filter((v) => v !== klic(k)), klic(k)]);

  const zmiz = () => {
    if (stav === "ceka" || stav === "mizi") return;
    herec?.zastav();
    herec = null;
    (plocha.firstElementChild as SPrvkem | null)?.__scena?.stuj(true);
    titulek("");
    nastavStav("mizi");
    window.setTimeout(() => vrstva.remove(), klid ? 0 : CAS.mizeni);
  };

  const hraj = (el: SPrvkem, scena: Scena, zapis: Zapis) => {
    if (stav !== "hraje") return;
    /* událost ukazatele v jednotkách kresby (0–180) rovnou na scénu; nebublá, ať si jí nevšimne zbytek stránky */
    const posli = (typ: string, x: number, y: number) => {
      const r = el.getBoundingClientRect();
      el.dispatchEvent(new PointerEvent(typ, { bubbles: false, cancelable: true, pointerId: 1, pointerType: "mouse", isPrimary: true, clientX: r.left + (x / 180) * r.width, clientY: r.top + (y / 180) * r.height }));
    };
    const ven = {
      ukaz: (x: number, y: number) => posli("pointermove", x, y),
      stiskni: (x: number, y: number) => posli("pointerdown", x, y),
      /* pouští se přes pointercancel jako na /parta-3: scény ho berou stejně jako pointerup */
      pust: (x: number, y: number) => posli("pointercancel", x, y),
      pryc: () => posli("pointerleave", -20, -20),
      titulek,
      /* hlediště tu není */
      ohlas: () => {},
    };
    const t0 = scena.znovu(zapis.delka + 14);
    scena.stuj(false);
    const h = novyHerec(zapis, { V: scena.V, stav: () => ({ ...scena.stav(), t: scena.stav().t - t0 }) }, ven);
    herec = h;
    let minule = -1;
    let stoji = 0;
    const tik = () => {
      if (herec !== h) return;
      if (h.kurzor && !scena.stav().vstup.mys) ven.ukaz(h.kurzor.x, h.kurzor.y);
      const t = scena.stav().t - t0;
      /* scéna stojí, když ji člověk odscrolluje z očí (a při omezeném pohybu, když jí dojde bdění) — pak se nečeká a flek zmizí */
      stoji = t > minule ? 0 : stoji + 1;
      minule = t;
      if (stoji < STOJI_NEJDELE && h.krok(t)) {
        requestAnimationFrame(tik);
        return;
      }
      h.zastav();
      herec = null;
      titulek("");
      window.setTimeout(zmiz, klid ? 600 : CAS.dozneni);
    };
    requestAnimationFrame(tik);
  };

  /** Postaví scénu do rozlité kaňky; za ní čeká na prvním snímku, než se ukáže. */
  const postav = (k: Kus, znacka: string, beh: Beh, zapis: Zapis | undefined) => {
    const el = document.createElement("div") as SPrvkem;
    el.className = `${znacka} flek-scena`;
    el.setAttribute(`data-${znacka}`, k.kus);
    plocha.replaceChildren(el);
    beh.spustVse();
    beh.odemkni();
    const scena = el.__scena;
    if (!scena || !zapis) {
      zmiz();
      return;
    }
    scena.znovu(0);
    scena.stuj(true);
    nastavStav("hraje");
    /* viděný je kus od chvíle, kdy je na scéně — co se nestáhlo, se nepočítá */
    zapamatuj(k);
    window.setTimeout(() => hraj(el, scena, zapis), klid ? 0 : CAS.nabeh);
  };

  const rozlij = () => {
    const k = vylosuj();
    const d = DILNY[k.kdo];
    /* kam se rozlije: kolem místa, kde sedí, ale celý do okna — pod hlavičku a s místem na titulek */
    const r = pozice(flek);
    const sirka = sirkaStranky();
    const v = Math.round(Math.max(220, Math.min(460, sirka - 2 * KRAJ, window.innerHeight - HLAVICKA - POD - KRAJ)));
    const nahore = window.scrollY + HLAVICKA;
    const dole = window.scrollY + window.innerHeight - POD - v;
    const x = omez(r.left + r.width / 2 - v / 2, KRAJ, Math.max(KRAJ, sirka - v - KRAJ));
    const y = Math.max(nahore, Math.min(r.top + r.height / 2 - v / 2, dole));
    nastavStav("roste");
    flek.style.left = `${x.toFixed(1)}px`;
    flek.style.top = `${y.toFixed(1)}px`;
    flek.style.width = flek.style.height = `${v}px`;
    /* Rám skočí na místo hned a kaňka do něj doroste jen transformací: prohlížeč ji s filtry vykreslí jednou
       ve velké velikosti a pak ji už jen zvětšuje. Měnit šířku by filtr počítalo znovu v každém snímku a trhalo se to. */
    if (!klid && dech.animate) {
      const odkud = `translate(${(r.left + r.width / 2 - (x + v / 2)).toFixed(1)}px, ${(r.top + r.height / 2 - (y + v / 2)).toFixed(1)}px) scale(${(r.width / v).toFixed(4)})`;
      dech.animate([{ transform: odkud }, { transform: "translate(0px, 0px) scale(1)" }], { duration: CAS.rust, easing: "cubic-bezier(0.22, 0.9, 0.24, 1)" });
    }
    /* od teď se zavírá: křížkem, a pro myš i klepnutím kamkoli do scény */
    const mel = document.activeElement === tlacitko;
    tlacitko.tabIndex = -1;
    tlacitko.setAttribute("aria-label", `${k.jmeno}: ${k.nazev}`);
    krizek.hidden = false;
    if (mel) krizek.focus({ preventScroll: true });
    titulek(`${k.jmeno}: ${k.nazev}`);

    let nacteno: [Beh, Hra] | null = null;
    let chyba = false;
    Promise.all([d.beh(), d.hra()]).then(
      (m) => (nacteno = m),
      () => (chyba = true),
    );
    const cekej = () => {
      if (stav !== "roste") return;
      if (chyba) zmiz();
      else if (!nacteno) window.setTimeout(cekej, 80);
      else postav(k, d.znacka, nacteno[0], nacteno[1].default[k.kus]);
    };
    window.setTimeout(cekej, klid ? 0 : CAS.rust);
  };

  /* ——— Začátek ——— */

  flek.style.setProperty("--flek-uhel", `${Math.floor(Math.random() * 360)}deg`);
  tlacitko.addEventListener("click", () => (stav === "ceka" ? rozlij() : zmiz()));
  krizek.addEventListener("click", zmiz);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") zmiz();
  });
  priMereni(umisti);
}
