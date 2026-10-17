/**
 * Šátek furoshiki ve 3D — fasáda pro satek.ts. Spojuje fyziku (fyzika.ts),
 * choreografii (choreografie.ts), balíky v novinách (balik.ts) a kreslení
 * (kresleni.ts); smlouvu mezi nimi drží typy.ts.
 *
 * Co tu žije:
 *   smyčka   — běží, jen když se něco hýbe a šátek je vidět; jinak spí.
 *              Mimo obrazovku a při omezeném pohybu se každá změna dopočítá
 *              rovnou do klidu (choreografie.dobehni).
 *   ruka     — myší (i perem) jde chytit kterékoli místo látky a zvednout ho;
 *              prstem se do látky jen ťukne a rozvlní se — tah prstem patří
 *              posouvání stránky. Najetí na balík ho prosvětlí a řekne to
 *              účtence (priNajeti), a naopak (zvyrazni).
 *   obsah    — kusy z šátku jako balíky: tvar pro srážky je hned (tvarBaliku),
 *              sítě a textury (noviny, visačka s fotkou) se dopečou a teprve
 *              pak balík dopadne, ať nepřistane neviditelný.
 *
 * Bez WebGL2 vrátí vytvorLatku() null a v Satek.astro zůstane SVG kresba.
 */
import { SimLatky } from "./fyzika";
import { Choreografie } from "./choreografie";
import { vytvorBalik, tvarBaliku } from "./balik";
import { vytvorKresleni } from "./kresleni";
import { NEJVIC_BALIKU } from "./typy";
import type { BalikDoChoreografie, DataBaliku, KusNaSatku, StavBaliku, V3 } from "./typy";
import type { VzorSatku } from "../../../data/furoshiki";

export type { KusNaSatku };

export interface Latka {
  /** První stav podle obsahu šátku (prázdný leží složený); splní se, až šátek leží */
  start(kusy: KusNaSatku[]): Promise<void>;
  nastavVzor(v: VzorSatku): Promise<void>;
  /** Nový obsah šátku v pořadí: nové balíky dopadnou, vyndané odletí, prázdný šátek se složí */
  nastavKusy(kusy: KusNaSatku[]): void;
  /** Otsukai-tsutsumi; splní se, až uzel drží */
  zavaz(): Promise<void>;
  /** Splní se, až šátek zase leží rozprostřený */
  rozvaz(): Promise<void>;
  readonly zavazano: boolean;
  /** Prosvětlit balík (najetí na řádek účtenky), nebo null */
  zvyrazni(id: string | null): void;
  /** Kurzor najel na balík (nebo z něj sjel) */
  priNajeti(fn: (id: string | null) => void): void;
}

/** Krok simulace a nejvíc kroků na jeden snímek — pomalý stroj raději zpomalí, než aby se zahltil */
const KROK = 1 / 60;
const NEJVIC_KROKU = 3;
/** Pod touhle rychlostí (m/s) se šátek počítá za klidný; smyčka usne po `USNE` klidných snímcích */
const KLID = 0.002;
const USNE = 20;
/** Jak daleko od bodu látky (CSS px) ho myš ještě chytí */
const DOSAH = 26;
/** Do jaké výšky (m) se chycené místo zvedne, když s ním ruka hýbe */
const ZVEDNE = 0.09;
/** Jak dlouho (ms) nejvýš čekat na sítě a textury balíku, než stejně dopadne */
const CEKA_NA_BALIK = 900;

const seme = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

export function vytvorLatku(platno: HTMLCanvasElement, volby: { klid: boolean; maly: boolean }): Latka | null {
  const n = volby.maly ? 32 : 48;
  let kresleni: ReturnType<typeof vytvorKresleni>;
  try {
    kresleni = vytvorKresleni(platno, { n, uspora: volby.maly });
  } catch (e) {
    console.warn("[šátek] WebGL2 se nepodařilo rozjet, zůstává kresba", e);
    return null;
  }
  if (!kresleni) return null;
  const k3 = kresleni;
  const sim = new SimLatky({ n });
  const ch = new Choreografie(sim);

  /* ——— Balíky: data pro kreslení se pečou zvlášť, tvar pro fyziku je hned ——— */
  const data = new Map<string, Promise<DataBaliku | null>>();
  const nahrane = new Set<string>();
  const pripravBalik = (kus: KusNaSatku) => {
    let d = data.get(kus.id);
    if (!d) {
      d = vytvorBalik(kus)
        .then((b) => {
          k3.nastavBalik(b);
          nahrane.add(kus.id);
          vzbud();
          return b;
        })
        .catch((e) => {
          console.warn("[šátek] balík se nepodařilo zabalit", kus.id, e);
          return null;
        });
      data.set(kus.id, d);
    }
    return d;
  };
  const doChoreografie = (kusy: KusNaSatku[]): BalikDoChoreografie[] =>
    kusy.slice(0, NEJVIC_BALIKU).map((k) => ({ id: k.id, tvar: tvarBaliku(k.tvar), seme: k.seme || seme(k.id) }));
  /** Až jsou sítě a textury hotové (nebo vypršel čas), pustí se to do choreografie */
  const pockejNaBaliky = (kusy: KusNaSatku[]) =>
    Promise.race([Promise.all(kusy.slice(0, NEJVIC_BALIKU).map(pripravBalik)), new Promise((r) => window.setTimeout(r, CEKA_NA_BALIK))]);
  /** Co je v šátku teď (v pořadí) — balíky mimo něj, které už choreografie nekreslí, kreslení zapomene */
  let posledniKusy: KusNaSatku[] = [];
  let vSatku = new Set<string>();
  const uklid = (stav: StavBaliku[]) => {
    if (nahrane.size <= stav.length) return;
    const zije = new Set(stav.map((b) => b.id));
    for (const id of [...nahrane]) {
      if (zije.has(id) || vSatku.has(id)) continue;
      k3.odeberBalik(id);
      nahrane.delete(id);
      data.delete(id);
    }
  };
  /* Pořadí příkazů: každý počká na balíky toho předchozího, ať se nepředběhnou */
  let fronta: Promise<unknown> = Promise.resolve();
  const zaradit = <T>(fn: () => Promise<T> | T): Promise<T> => {
    const p = fronta.then(fn);
    fronta = p.catch(() => {});
    return p;
  };

  /* ——— Kreslení ——— */
  let zvyrazneny: string | null = null;
  let zvyraznenyZvenku: string | null = null;
  const kresli = () => {
    const baliky = ch.baliky();
    k3.kresli({ latka: sim.p, baliky, uzel: ch.uzel(), zvyrazneny: zvyrazneny ?? zvyraznenyZvenku });
    uklid(baliky);
  };

  /* ——— Smyčka: běží, jen když se něco hýbe a šátek je vidět ——— */
  let hodiny = 0;
  let bezi = false;
  let videt = true;
  let posledni = -1;
  let zbytek = 0;
  let klidnych = 0;
  let tazeny = -1;
  const snimek = (t: number) => {
    if (!platno.isConnected) {
      bezi = false;
      k3.zrus();
      return;
    }
    /* Čas se měří jen mezi snímky — hodiny snímku a performance.now() se můžou rozcházet */
    if (posledni < 0) posledni = t;
    zbytek += Math.max(0, Math.min(0.05, (t - posledni) / 1000));
    posledni = t;
    let kroku = 0;
    while (zbytek >= KROK && kroku < NEJVIC_KROKU) {
      hodiny += KROK;
      ch.tik(hodiny);
      sim.krok(KROK);
      zbytek -= KROK;
      kroku++;
    }
    if (kroku === NEJVIC_KROKU) zbytek = Math.min(zbytek, KROK);
    kresli();
    klidnych = !ch.bezi() && tazeny < 0 && sim.pohyb() < KLID ? klidnych + 1 : 0;
    if (klidnych > USNE || !videt) {
      bezi = false;
      return;
    }
    requestAnimationFrame(snimek);
  };
  function vzbud() {
    /* Při omezeném pohybu rovnou do klidu */
    if (volby.klid) {
      hodiny = ch.dobehni(hodiny);
      kresli();
      return;
    }
    /* Mimo obrazovku (kus přidaný nahoře v krámku) se nic nepočítá — dohraje se, až host k šátku dojede,
       a uvidí, jak balíky dopadnou; dopočítat to hned by krámek při každém „Do šátku“ zadrhlo */
    if (!videt || bezi) return;
    bezi = true;
    klidnych = 0;
    posledni = -1;
    zbytek = KROK;
    requestAnimationFrame(snimek);
  }

  new IntersectionObserver(([e]) => {
    videt = e.isIntersecting;
    if (videt) vzbud();
  }).observe(platno);
  new ResizeObserver(() => {
    k3.zmer();
    kresli();
  }).observe(platno);

  /** Splní se, až choreografie doběhne (a látka se uklidní) */
  const doKlidu = () =>
    new Promise<void>((hotovo) => {
      const konec = performance.now() + 8000;
      const cekej = () => (ch.bezi() && performance.now() < konec ? window.setTimeout(cekej, 80) : hotovo());
      window.setTimeout(cekej, 60);
    });

  /* ——— Ruka: chytit látku a zvednout ji ——— */
  const kdeNaPlatne = (e: PointerEvent): [number, number] => {
    const r = platno.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };
  /**
   * Bod látky pod kurzorem: paprsek od kamery, a z bodů blízko něj ten, na který narazí první —
   * na složeném šátku a přes chlopně tak ruka chytí horní vrstvu, ne skrytou pod ní. Když paprsek
   * látku mine, vezme se bod nejblíž paprsku, pokud je na obrazovce v dosahu `max` px.
   */
  const nejblizsi = (sx: number, sy: number, max: number) => {
    const { o, d } = k3.paprsek(sx, sy);
    const p = sim.p;
    const zasah = sim.roztec * 0.75;
    let kZasah = -1;
    let tZasah = Infinity;
    let kBlizko = -1;
    let rBlizko = Infinity;
    for (let i = 0; i < sim.pocet; i++) {
      const vx = p[i * 3] - o[0];
      const vy = p[i * 3 + 1] - o[1];
      const vz = p[i * 3 + 2] - o[2];
      const t = vx * d[0] + vy * d[1] + vz * d[2];
      const r = Math.hypot(vx - t * d[0], vy - t * d[1], vz - t * d[2]);
      if (r < zasah && t < tZasah) {
        tZasah = t;
        kZasah = i;
      }
      if (r < rBlizko) {
        rBlizko = r;
        kBlizko = i;
      }
    }
    if (kZasah >= 0) return kZasah;
    if (kBlizko < 0) return -1;
    const [x, y] = k3.promitni(p[kBlizko * 3], p[kBlizko * 3 + 1], p[kBlizko * 3 + 2]);
    return Math.hypot(x - sx, y - sy) <= max ? kBlizko : -1;
  };
  /** Kde paprsek od kurzoru protne vodorovnou rovinu ve výšce z */
  const naRovine = (sx: number, sy: number, z: number): V3 | null => {
    const { o, d } = k3.paprsek(sx, sy);
    if (Math.abs(d[2]) < 1e-5) return null;
    const t = (z - o[2]) / d[2];
    return t > 0 ? [o[0] + d[0] * t, o[1] + d[1] * t, z] : null;
  };
  /** Balík pod kurzorem: nejbližší střed balíku na obrazovce v dosahu jeho velikosti */
  const balikPod = (sx: number, sy: number) => {
    let nej: string | null = null;
    let d = Infinity;
    for (const b of ch.baliky()) {
      if (b.viditelnost < 0.5) continue;
      const kus = posledniKusy.find((k) => k.id === b.id);
      if (!kus) continue;
      const tvar = tvarBaliku(kus.tvar);
      const { x, y, z, meritko } = b.poloha;
      const [cx, cy] = k3.promitni(x, y, z + tvar.vyska * meritko * 0.5);
      const [ox] = k3.promitni(x + tvar.polomer * meritko, y, z + tvar.vyska * meritko * 0.5);
      const r = Math.abs(ox - cx) * 1.05;
      const dd = Math.hypot(sx - cx, sy - cy);
      if (dd < r && dd < d) {
        d = dd;
        nej = b.id;
      }
    }
    return nej;
  };
  const posluchaciNajeti: ((id: string | null) => void)[] = [];
  const najel = (id: string | null) => {
    if (id === zvyrazneny) return;
    zvyrazneny = id;
    posluchaciNajeti.forEach((fn) => fn(id));
    kresli();
  };

  let zdvih = 0;
  platno.addEventListener("pointerdown", (e) => {
    if (!ch.lzeSahat()) return;
    const [sx, sy] = kdeNaPlatne(e);
    if (e.pointerType === "touch") {
      /* Prstem jen ťuknout: látka se kolem rozvlní */
      const bod = naRovine(sx, sy, 0);
      if (bod && nejblizsi(sx, sy, DOSAH) >= 0) {
        sim.rozvlni(bod[0], bod[1], 0.05, 0.9);
        vzbud();
      }
      return;
    }
    const k = nejblizsi(sx, sy, DOSAH);
    if (k < 0) return;
    tazeny = k;
    zdvih = sim.p[k * 3 + 2];
    platno.setPointerCapture(e.pointerId);
    platno.classList.add("tahne");
    e.preventDefault();
    vzbud();
  });
  platno.addEventListener("pointermove", (e) => {
    const [sx, sy] = kdeNaPlatne(e);
    if (tazeny < 0) {
      if (e.pointerType === "touch") return;
      const muze = ch.lzeSahat();
      platno.classList.toggle("lze", muze && nejblizsi(sx, sy, DOSAH) >= 0);
      najel(balikPod(sx, sy));
      return;
    }
    /* Chycené místo se zvedá k ruce a jde za ní */
    zdvih = Math.min(ZVEDNE, zdvih + 0.012);
    const cil = naRovine(sx, sy, zdvih);
    if (cil) sim.pripni(tazeny, cil);
    vzbud();
  });
  const pustit = () => {
    if (tazeny < 0) return;
    sim.pust(tazeny);
    tazeny = -1;
    platno.classList.remove("tahne");
    vzbud();
  };
  platno.addEventListener("pointerup", pustit);
  platno.addEventListener("pointercancel", pustit);
  platno.addEventListener("pointerleave", () => {
    if (tazeny < 0) najel(null);
  });

  k3.zmer();
  /* Pro zkoušky v prohlížeči (headless Edge): stav fyziky, choreografie a obsahu šátku */
  (platno as HTMLCanvasElement & { __ladeni?: unknown }).__ladeni = { sim, ch, kusy: () => posledniKusy, nahrane };

  return {
    start(kusy) {
      posledniKusy = kusy;
      vSatku = new Set(kusy.map((k) => k.id));
      return zaradit(async () => {
        if (kusy.length) await pockejNaBaliky(kusy);
        ch.start(hodiny, doChoreografie(kusy));
        vzbud();
        await doKlidu();
      });
    },
    nastavVzor(v) {
      return k3.nastavVzor(v).then(() => {
        kresli();
        vzbud();
      });
    },
    nastavKusy(kusy) {
      posledniKusy = kusy;
      vSatku = new Set(kusy.map((k) => k.id));
      pustit();
      void zaradit(async () => {
        if (kusy.length) await pockejNaBaliky(kusy);
        ch.nastavBaliky(hodiny, doChoreografie(kusy));
        vzbud();
      });
    },
    zavaz() {
      pustit();
      return zaradit(
        () =>
          new Promise<void>((hotovo) => {
            ch.zavaz(hodiny, hotovo);
            vzbud();
            /* S omezeným pohybem vzbud() dopočítal všechno hned */
            if (volby.klid) hotovo();
          }),
      );
    },
    rozvaz() {
      pustit();
      return zaradit(
        () =>
          new Promise<void>((hotovo) => {
            ch.rozvaz(hodiny, hotovo);
            vzbud();
            if (volby.klid) hotovo();
          }),
      );
    },
    get zavazano() {
      return ch.zavazano;
    },
    zvyrazni(id) {
      zvyraznenyZvenku = id;
      kresli();
    },
    priNajeti(fn) {
      posluchaciNajeti.push(fn);
    },
  };
}
