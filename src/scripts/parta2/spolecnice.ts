/**
 * Vázička jako společnice (01 Kami z /marcel bez kruhu, podoba `let`): létá
 * po celé stránce ve vlastní vrstvě nad obsahem a schovává se za papírové
 * karty (.papir) — vykukuje přes jejich horní hranu nebo zpoza boku. Jednou
 * za návštěvu webu (localStorage, při vývoji pokaždé) po deseti vteřinách
 * ukáže na jízdenku vpravo dole a pak na Rezervaci v hlavičce (pod 1400 px
 * je schovaná v menu, ukáže tedy na tlačítko menu). Zatím jen na stránkách
 * v STRANKY; spouští ji hlavicka.ts, takže stránka sama nic nevkládá.
 *
 * Schovávání je ořez, ne pořadí vrstev: postava je pořád nad stránkou, ale
 * ořízne se podél hrany karty (clip-path), takže to vypadá, že je za ní.
 * Pozice se drží vůči kotvě — kartě, jízdence, odkazu, nebo oknu — takže při
 * scrollu jede s kartou. Když jí karta odjede z obrazu, přiletí jinam.
 * Úvod (domek2/let-kami.ts) to má jinak: tam se schovává mezi vrstvy kresby.
 *
 * Kresbu a její běh (natočení, protivítr, pohled, otočka po klepnutí) má
 * scripts/vazicka-gejsa; prvek se tu vyrobí a beh.js ho rozběhne
 * (spustVse). Kdo na ni ve schovce klepne, ten ji našel.
 */
import { rekni } from "./kami";
import { spustVse } from "../vazicka-gejsa/beh.js";

/** Na kterých stránkách (data-stranka na <body>) létá */
const STRANKY = ["dilna"];

type Bod = { x: number; y: number };
type Obdelnik = { l: number; t: number; r: number; b: number };
type Drzeni = { naklon: number; otoc: number; pohled: [number, number] } | null;
/** Ořez podél hrany kotvy: `nad` = vidět je jen nad horní hranou, `bok` = jen vně boku (st −1 vlevo, 1 vpravo) */
type Orez = { kotva: Element; druh: "nad" | "bok"; st: -1 | 1 };
interface Vykuk { bod: Bod; naklon: number; otoc: number; pohled: [number, number] }
/** Schovka za kartou — všechny body jsou v souřadnicích karty (od jejího levého horního rohu) */
interface Schovka { kotva: Element; orez: Orez; pristup: Bod; skryta: Bod; vykuky: Vykuk[] }
interface Akce { delka: number; krok: (q: number) => void; start?: () => void }

/** Kde je postava v rámečku 180 × 180, v násobcích jeho strany od středu (jako v let-kami.ts) */
const POSTAVA = { l: -0.21, r: 0.22, t: -0.24, oci: 0.15, b: 0.43 };
/** Zaoblení rohů karty (.papir v parta2.css) — do rohu se nestoupne */
const ROH = 26;

const REZERVACE = {
  po: 10,
  klic: "vazicka-ukazala-rezervaci",
  jizdenka: "Tahle jízdenka vpravo dole tě vždycky doveze k rezervaci. Klepni a vyber si termín.",
  hlavicka: "A když ji zrovna nevidíš, Rezervace je i tady nahoře v hlavičce.",
  menu: "A když ji zrovna nevidíš, Rezervace je i tady v menu.",
};
const HLASKY = ["Ach! Tak tady jsem.", "Prozrazená!", "Zkusím to jinde…", "To bylo rychlé!", "Hledej dál!"];

const nahodne = (a: number, b: number) => a + Math.random() * (b - a);
const omez = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const hladce = (q: number) => q * q * (3 - 2 * q);
const kCili = (v: number, cil: number, dt: number, tau: number) => v + (cil - v) * (1 - Math.exp(-dt / tau));
const prekryva = (a: Obdelnik, b: Obdelnik) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;
const obdelnik = (r: DOMRect): Obdelnik => ({ l: r.left, t: r.top, r: r.right, b: r.bottom });
/** Jak dlouho visí bublina (rekni v kami.ts ji zavře za 3,6 s + 30 ms na znak) */
const delkaBubliny = (text: string) => 3.9 + text.length * 0.03;
const VYVOJ = !!import.meta.env?.DEV;
/** Rozsvítí prvek, na který ukazuje (animace v parta2.css doběhne sama) */
const rozzar = (el: Element | null) => {
  if (!el) return;
  el.classList.remove("spolecnice-ukazuje");
  void (el as HTMLElement).offsetWidth;
  el.classList.add("spolecnice-ukazuje");
};

export function spolecnice() {
  const stranka = document.body.dataset.stranka;
  if (!stranka || !STRANKY.includes(stranka) || document.querySelector(".spolecnice")) return;
  const klidne = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

  /* ——— Prvek: obal se jen posouvá (a ořezává), tělo se natáčí a zmenšuje ——— */
  const O = document.createElement("div");
  O.className = "spolecnice";
  const T = document.createElement("div");
  T.className = "spolecnice-telo";
  const VG = document.createElement("div");
  VG.className = "vazicka-gejsa";
  VG.dataset.vazickaGejsa = "let";
  VG.tabIndex = 0;
  VG.setAttribute("role", "img");
  VG.setAttribute("aria-label", "Vázička jako gejša, bílá váza s černým hrdlem místo účesu a s květy ve vlasech, létá po stránce a schovává se za karty");
  T.append(VG);
  O.append(T);
  document.body.append(O);
  spustVse();
  /* Klepnout jde jen na postavu, ne na průhledný rámeček kolem — ten by překážel klikání na stránku.
     Plocha je uvnitř kresby (beh.js ji při stavbě vyprázdní, proto až po spustVse), takže myš i klepnutí dostane kresba. */
  const dotyk = document.createElement("span");
  dotyk.className = "spolecnice-dotyk";
  VG.append(dotyk);

  /* Bublina je v okně a každý snímek se posune za ní — při scrollu se neztratí; barvu bere podle pozadí */
  let bublina: (() => boolean) | null = null;
  const rekniTu = (text: string) => {
    bublina = rekni(VG, "vazicka", text, { pevne: true, kontrast: true });
  };

  /* ═══ Rozměry a kotvy ═══ */
  let B = 80, W = 0, H = 0;
  const zmer = () => {
    W = document.documentElement.clientWidth;
    H = window.innerHeight;
    B = Math.round(omez(Math.min(W * 0.06, H * 0.1), 56, 96));
    O.style.width = O.style.height = `${B}px`;
  };
  zmer();

  /** Kotva, vůči které se drží poloha: prvek (jede s ním při scrollu), nebo okno */
  let kotva: Element | null = null;
  const puvod = (k: Element | null = kotva): Bod => {
    if (!k) return { x: 0, y: 0 };
    const r = k.getBoundingClientRect();
    return { x: r.left, y: r.top };
  };
  const poz = { x: W * 0.8, y: H * 0.35, m: 1 };
  const naObrazovce = (): Bod => {
    const p = puvod();
    return { x: p.x + poz.x, y: p.y + poz.y };
  };
  /** Přepne kotvu a přepočítá polohu, aby se postava nehnula */
  const prekotvi = (nova: Element | null) => {
    const s = naObrazovce();
    kotva = nova;
    const p = puvod();
    poz.x = s.x - p.x;
    poz.y = s.y - p.y;
    predX = poz.x;
    predY = poz.y;
  };
  const obrys = (s: Bod, m = 1): Obdelnik => ({
    l: s.x + POSTAVA.l * B * m, r: s.x + POSTAVA.r * B * m, t: s.y + POSTAVA.t * B * m, b: s.y + POSTAVA.b * B * m,
  });
  const hlavaDole = () => document.querySelector(".hlava")?.getBoundingClientRect().bottom ?? 0;
  const prekazky = (): Obdelnik[] => {
    const o: Obdelnik[] = [];
    for (const s of [".hlava", "[data-kal]"]) {
      const r = document.querySelector(s)?.getBoundingClientRect();
      if (r && r.width) o.push(obdelnik(r));
    }
    return o;
  };

  /* ═══ Schovky za kartami, které jsou zrovna vidět ═══ */
  const schovky = (): Schovka[] => {
    const vysledek: Schovka[] = [];
    const bm = B;
    const nahore = hlavaDole() + 10;
    const vidno = (s: Bod) => s.x > 0 && s.x < W && s.y > nahore && s.y < H;
    const jinde = prekazky();
    const volno = (s: Bod) => !jinde.some((p) => prekryva(obrys(s), p));
    for (const karta of document.querySelectorAll<HTMLElement>("main .papir")) {
      const r = karta.getBoundingClientRect();
      if (r.bottom < nahore || r.top > H || r.width < 2 * ROH + 1.2 * bm) continue;
      /* přes horní hranu: celá se vejde pod ni a vykoukne hlava */
      if (r.top > nahore + 0.5 * bm && r.top < H * 0.82) {
        const x = nahodne(ROH + 0.3 * bm, r.width - ROH - 0.3 * bm);
        const vykuk = { bod: { x, y: -(POSTAVA.oci + 0.08) * bm }, naklon: 0, otoc: 0, pohled: [0, 0.9] as [number, number] };
        const s = { x: r.left + x, y: r.top + vykuk.bod.y };
        if (vidno(s) && volno(s))
          vysledek.push({
            kotva: karta,
            orez: { kotva: karta, druh: "nad", st: 1 },
            pristup: { x, y: -POSTAVA.b * bm - 8 },
            skryta: { x, y: -POSTAVA.t * bm + 6 },
            vykuky: [vykuk],
          });
      }
      /* zpoza boku: karta musí být vyšší než ona a vedle ní musí být místo */
      const od = Math.max(ROH - POSTAVA.t * bm, nahore - r.top - POSTAVA.t * bm + 4);
      const po = Math.min(r.height - ROH - POSTAVA.b * bm, H - r.top - POSTAVA.b * bm - 8);
      if (po <= od) continue;
      for (const st of [-1, 1] as const) {
        const hrana = st < 0 ? 0 : r.width;
        const venku = st < 0 ? r.left : W - r.right;
        if (venku < 0.32 * bm) continue;
        const y = nahodne(od, po);
        const kandidati: Vykuk[] = [
          { bod: { x: hrana + st * 0.1 * bm, y }, naklon: st * 10, otoc: st * 28, pohled: [st * 1.6, 0.3] },
          { bod: { x: hrana + st * 0.08 * bm, y: Math.max(od, y - 0.14 * bm) }, naklon: st * 14, otoc: st * 18, pohled: [st * 1.2, -0.6] },
        ];
        const vykuky = kandidati.filter((v) => {
          const s = { x: r.left + v.bod.x, y: r.top + v.bod.y };
          return vidno(s) && volno(s);
        });
        if (!vykuky.length) continue;
        vysledek.push({
          kotva: karta,
          orez: { kotva: karta, druh: "bok", st },
          pristup: { x: hrana + st * (Math.max(-POSTAVA.l, POSTAVA.r) * bm + 8), y },
          skryta: { x: hrana - st * (Math.max(-POSTAVA.l, POSTAVA.r) * bm + 6), y },
          vykuky,
        });
      }
    }
    return vysledek;
  };

  /** Volné místo v okně: mimo karty, hlavičku a jízdenku */
  const volneMisto = (): Bod => {
    const jinde = [...prekazky(), ...[...document.querySelectorAll("main .papir")].map((k) => obdelnik(k.getBoundingClientRect()))];
    const nahore = hlavaDole() + B * 0.5;
    for (let i = 0; i < 40; i++) {
      const p = { x: nahodne(B * 0.6, W - B * 0.6), y: nahodne(nahore, H * 0.8) };
      if (!jinde.some((o) => prekryva(obrys(p), o))) return p;
    }
    return { x: nahodne(B * 0.6, W - B * 0.6), y: nahodne(nahore, H * 0.7) };
  };

  /* ═══ Stav ═══ */
  let predX = poz.x, predY = poz.y;
  let orez: Orez | null = null;
  let schovka: Schovka | null = null;
  let drzi: Drzeni = null;
  const vid = { otoc: 0, naklon: 0, vitr: 0, pohled: [0, 0] as [number, number], vx: 0, vy: 0 };
  let cas = 0;
  let fronta: Akce[] = [];
  let akce: Akce | null = null;
  let akceCas = 0;
  let mluvi = false;

  /* ═══ Akce ═══ */
  /** Přelet obloukem na bod v souřadnicích kotvy; s omezeným pohybem se jen přenese */
  const let_ = (cil: () => Bod, m = 1): Akce => {
    let a: Bod = poz, b: Bod = poz, c: Bod = poz, m0 = 1;
    return {
      delka: 1,
      start() {
        a = { x: poz.x, y: poz.y };
        b = cil();
        m0 = poz.m;
        const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        this.delka = klidne ? 0.01 : omez(d / Math.max(240, W * 0.2), 0.6, 3.2);
        const o = (Math.random() < 0.5 ? -1 : 1) * nahodne(0.15, 0.35) * d;
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
  const posun = (cil: () => Bod, delka: number, d: Drzeni | (() => Drzeni)): Akce => {
    let a: Bod = poz, b: Bod = poz;
    return {
      delka: klidne ? 0.01 : delka,
      start() {
        a = { x: poz.x, y: poz.y };
        b = cil();
        drzi = typeof d === "function" ? d() : d;
      },
      krok(q) {
        const t = hladce(q);
        poz.x = a.x + (b.x - a.x) * t;
        poz.y = a.y + (b.y - a.y) * t;
      },
    };
  };
  const cekej = (delka: number, d?: Drzeni): Akce => ({ delka, start: () => { if (d !== undefined) drzi = d; }, krok: () => {} });
  const hned = (fn: () => void): Akce => ({ delka: 0.01, start: fn, krok: () => {} });
  const kotvi = (k: () => Element | null) => hned(() => prekotvi(k()));
  const PRED: Drzeni = { naklon: 0, otoc: 0, pohled: [0, 0] };

  /** Ven ze schovky stejnou cestou, jakou do ní zalezla, a zpátky ke kotvě okna */
  const ven = (rychle = false): Akce[] => [
    ...(schovka ? [posun(() => schovka?.pristup ?? { x: poz.x, y: poz.y }, rychle ? 0.45 : 0.75, null)] : []),
    hned(() => {
      orez = null;
      schovka = null;
    }),
    kotvi(() => null),
  ];

  /** Další kolo: možná kousek volně, pak za kartu, jedno až dvě vykouknutí, ven */
  let posledni: Element | null = null;
  const dalsiKolo = () => {
    zmer();
    const vse = schovky();
    const moznosti = vse.filter((s) => s.kotva !== posledni);
    const s = (moznosti.length ? moznosti : vse)[Math.floor(Math.random() * (moznosti.length || vse.length))];
    if (!s) {
      fronta.push(kotvi(() => null), let_(volneMisto), cekej(nahodne(1.5, 3), null));
      return;
    }
    posledni = s.kotva;
    if (!klidne && Math.random() < 0.3) fronta.push(kotvi(() => null), let_(volneMisto), cekej(nahodne(0.4, 1)));
    fronta.push(
      kotvi(() => s.kotva),
      let_(() => s.pristup),
      cekej(0.12),
      hned(() => {
        schovka = s;
        orez = s.orez;
      }),
      posun(() => s.skryta, 0.85, PRED),
      cekej(klidne ? nahodne(8, 12) : nahodne(1.2, 2.4)),
    );
    const kolik = klidne ? 1 : Math.random() < 0.55 ? 2 : 1;
    const poradi = [...s.vykuky.keys()].sort(() => Math.random() - 0.5);
    for (let i = 0; i < kolik; i++) {
      const v = s.vykuky[poradi[i % poradi.length]];
      fronta.push(
        posun(() => v.bod, nahodne(0.45, 0.7), { naklon: v.naklon, otoc: v.otoc, pohled: v.pohled }),
        cekej(klidne ? nahodne(14, 20) : nahodne(1.3, 2.4)),
        posun(() => s.skryta, 0.45, PRED),
        cekej(nahodne(0.7, 1.5)),
      );
    }
    fronta.push(...ven());
  };

  /* ═══ Jednou za návštěvu: jízdenka a Rezervace v hlavičce ═══ */
  const uzUkazala = () => {
    if (VYVOJ) return false;
    try {
      return localStorage.getItem(REZERVACE.klic) === "1";
    } catch {
      return false;
    }
  };
  const zapamatuj = () => {
    if (VYVOJ) return;
    try {
      localStorage.setItem(REZERVACE.klic, "1");
    } catch {
      /* bez úložiště to ukáže při každé návštěvě — nevadí */
    }
  };
  /** Na co v hlavičce ukáže: odkaz v navigaci, nebo (když je navigace schovaná) tlačítko menu */
  const vHlavicce = (): { el: HTMLElement; menu: boolean } | null => {
    const odkaz = document.querySelector<HTMLElement>('.hlava-nav a[href="/rezervace"]');
    if (odkaz && odkaz.getBoundingClientRect().width) return { el: odkaz, menu: false };
    const menu = document.querySelector<HTMLElement>(".hlava-menu-tlacitko");
    if (menu && menu.getBoundingClientRect().width) return { el: menu, menu: true };
    return null;
  };
  let ukazala = uzUkazala();
  const ukazRezervaci = () => {
    ukazala = true;
    const jizdenka = document.querySelector<HTMLElement>("[data-kal]");
    const nahore = vHlavicce();
    if (!jizdenka && !nahore) return;
    zapamatuj();
    mluvi = true;
    O.style.opacity = "";
    const k: Akce[] = [...ven(true)];
    if (jizdenka && jizdenka.getBoundingClientRect().width) {
      /* vlevo vedle jízdenky, natočená k ní */
      const veta = REZERVACE.jizdenka;
      k.push(
        kotvi(() => jizdenka),
        let_(() => ({ x: -POSTAVA.r * B - 12, y: jizdenka.getBoundingClientRect().height * 0.4 })),
        posun(() => ({ x: poz.x, y: poz.y }), 0.4, { naklon: 7, otoc: 34, pohled: [1.9, 0.3] }),
        hned(() => {
          rozzar(jizdenka);
          rekniTu(veta);
        }),
        cekej(delkaBubliny(veta)),
      );
    }
    if (nahore) {
      /* pod hlavičkou, pod odkazem nebo kousek vlevo pod tlačítkem menu, a kouká nahoru */
      const veta = nahore.menu ? REZERVACE.menu : REZERVACE.hlavicka;
      k.push(
        kotvi(() => nahore.el),
        let_(() => {
          const r = nahore.el.getBoundingClientRect();
          return { x: nahore.menu ? -POSTAVA.r * B : r.width / 2, y: hlavaDole() - r.top + 10 - POSTAVA.t * B };
        }),
        posun(() => ({ x: poz.x, y: poz.y }), 0.4, nahore.menu ? { naklon: 5, otoc: 24, pohled: [1.4, -1.3] } : { naklon: 0, otoc: 0, pohled: [0, -1.3] }),
        hned(() => {
          rozzar(nahore.el);
          rekniTu(veta);
        }),
        cekej(delkaBubliny(veta)),
      );
    }
    k.push(
      kotvi(() => null),
      hned(() => (mluvi = false)),
    );
    fronta = k;
    akce = null;
  };

  /* ═══ Klepnutí ve schovce: našla se ═══ */
  let hlaska = 0;
  VG.addEventListener("pointerdown", () => {
    if (!schovka || mluvi) return;
    rekniTu(HLASKY[hlaska++ % HLASKY.length]);
    fronta = [cekej(1.3, PRED), ...ven(true), let_(volneMisto)];
    akce = null;
  });

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
    const vlna = klidne ? 0 : Math.sin(cas * 2.3) * (schovka ? 1.5 : 4);
    const x0 = s.x - B / 2, y0 = s.y - B / 2 + vlna;
    O.style.transform = `translate3d(${x0.toFixed(1)}px, ${y0.toFixed(1)}px, 0)`;
    T.style.transform = `rotate(${vid.naklon.toFixed(2)}deg) scale(${poz.m.toFixed(3)})`;
    /* ořez podél hrany karty, v souřadnicích obalu */
    if (orez) {
      const r = orez.kotva.getBoundingClientRect();
      if (orez.druh === "nad") {
        const ly = (r.top - y0).toFixed(1);
        O.style.clipPath = `polygon(-300% -300%, 400% -300%, 400% ${ly}px, -300% ${ly}px)`;
      } else {
        const lx = ((orez.st < 0 ? r.left : r.right) - x0).toFixed(1);
        O.style.clipPath = orez.st < 0
          ? `polygon(-300% -300%, ${lx}px -300%, ${lx}px 400%, -300% 400%)`
          : `polygon(${lx}px -300%, 400% -300%, 400% 400%, ${lx}px 400%)`;
      }
    } else if (O.style.clipPath) O.style.clipPath = "";
    if (bublina && !bublina()) bublina = null;

    const sc = (VG as HTMLElement & { __scena?: { stav: () => { dyn: { otoc?: number }; vstup: { vitr?: number; pohled?: [number, number] } } } }).__scena;
    if (sc) {
      const { dyn, vstup } = sc.stav();
      dyn.otoc = vid.otoc;
      vstup.vitr = vid.vitr;
      vstup.pohled = vid.pohled;
    }
  };

  /* začíná volně v okně */
  const p0 = volneMisto();
  poz.x = predX = p0.x;
  poz.y = predY = p0.y;
  vykresli(0);
  O.classList.add("pripravena");

  /* ═══ Smyčka ═══ */
  let minule: number | null = null;
  let mimoObraz = 0;
  const smycka = (ted: number) => {
    requestAnimationFrame(smycka);
    const dt = minule == null ? 0 : Math.min(0.05, (ted - minule) / 1000);
    minule = ted;
    cas += dt;
    if (!ukazala && cas >= REZERVACE.po) ukazRezervaci();
    /* karta s ní odjela z obrazu: postaví se těsně za okraj okna a přiletí odtamtud jinam */
    const s = naObrazovce();
    const venku = s.x < -B || s.x > W + B || s.y < -B || s.y > H + B;
    mimoObraz = venku && kotva && !mluvi ? mimoObraz + dt : 0;
    if (mimoObraz > 0.5) {
      mimoObraz = 0;
      orez = null;
      schovka = null;
      prekotvi(null);
      poz.x = predX = omez(poz.x, -B * 0.6, W + B * 0.6);
      poz.y = predY = omez(poz.y, -B * 0.6, H + B * 0.6);
      fronta = [];
      akce = null;
    }
    if (!akce) {
      if (!fronta.length) dalsiKolo();
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
  window.addEventListener("resize", zmer);
}
