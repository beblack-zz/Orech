/**
 * Model pece pro úroveň 八 Oheň (ohen.ts) — čistá fyzika a počty, bez DOM.
 *
 * Elektrická pec má setrvačnost: tlačítko Topit nezvedá teplotu hned.
 * Výkon P (0–1) se za držení pomalu rozjíždí a po puštění zase dojíždí,
 * spirály H se za ním rozžhaví se zpožděním τ a teprve ony hřejí pec:
 *
 *   dH/dh = (P − H) / τ
 *   dT/dh = R · H − C · (T − 20)
 *
 * Čas h je v hodinách výpalu od šesté ranní; při pálení je hodina šest
 * vteřin, po konci křivky se pec sama vypne a noc s chladnutím běží rychle.
 *
 * Co se hlídá (každá nehoda jednou):
 *   pára     — pod 125 °C, dokud je v hlíně voda, se topí rychleji než
 *              140 °C/h (krátké zakolísání projde, drží-li to, bouchne to);
 *              voda odchází nad 95 °C asi za 0,7 h, čím tepleji, tím rychleji
 *   křemen   — kolem 573 °C rychleji než 240 °C/h → prasklina
 *   stekla   — nad 1 310 °C se glazura rozteče až na Šamotku (krátké
 *              přešlápnutí projde, déle nebo víc už ne)
 *   brzo     — pec otevřená nad 200 °C → teplotní šok
 *
 * Žároměrky se ohýbají podle tepla v čase (heat-work): každá sčítá, o kolik
 * byla pec nad jejím začátkem ohybu, poměrně k rozsahu `od`–`do`.
 */
import { krivka, zaromerky } from "../../../data/kami";

/** Konec pálicí křivky v hodinách (11,4 h) a vrchol (1 280 °C) */
export const H_KONEC = krivka[krivka.length - 1][0];
export const T_VRCHOL = krivka[krivka.length - 1][1];
/** Kolik skutečných vteřin trvá hodina výpalu */
export const SEKUND_NA_HODINU = 6;
/** Jak rychle běží noc, když pec chladne (hodin za vteřinu) */
export const NOC_RYCHLOST = 1.35;
/** Noc se nezastaví nikdy, ale ráno v osm (h = 26) už jen stojí */
export const H_RANO = 26;
/** Polovina šířky pásu kolem křivky */
export const PAS = 35;
/** Pod touhle teplotou se smí otevřít (na displeji už je 199) */
export const T_OTEVRIT = 200;
const T_BEZPECNE = T_OTEVRIT - 0.5;

/** Fyzika pece */
export const TAU = 0.42;
export const R = 440;
export const C = 0.15;
const NAHORU = 0.6;
const DOLU = 0.8;
/** Pojistka regulátoru: nad 1 340 °C vypne topení, pod 1 320 ho zase pustí */
export const T_POJISTKA = 1340;
const T_POJISTKA_ZPET = 1320;

/** Pára a křemen */
/** Za kolik hodin nad 95 °C odejde z hlíny voda (nad stovkou rychleji) */
export const SUSENI = 0.7;
export const PARA_SKLON = 140;
export const PARA_T = 125;
export const KREMEN_OD = 540;
export const KREMEN_DO = 610;
export const KREMEN_SKLON = 240;
/** Kolik „přebytku“ (°C nad dovolený sklon, sečteno přes čas) snese pára a křemen */
export const PARA_VAROVANI = 6;
export const PARA_MEZ = 30;
export const KREMEN_VAROVANI = 6;
export const KREMEN_MEZ = 12;
export const T_STEKLA = 1310;
/** Kolik „stupňohodin“ nad 1 310 °C glazura vydrží, než steče */
export const STEKLA_MEZ = 5;
export const T_VYDRZ = 1260;
export const VYDRZ_ZRALA = 0.6;
/** Žároměrky: kolik ohybu dává hodina o celý rozsah nad začátkem */
const F_ZAR = 0.45;

export const omez = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));

/** Cílová teplota v čase h (po konci křivky drží vrchol) */
export function cil(h: number): number {
  if (h <= 0) return krivka[0][1];
  for (let i = 1; i < krivka.length; i++) {
    const [h0, t0] = krivka[i - 1];
    const [h1, t1] = krivka[i];
    if (h <= h1) return t0 + ((t1 - t0) * (h - h0)) / Math.max(1e-6, h1 - h0);
  }
  return T_VRCHOL;
}

/** Sklon křivky v čase h (°C/h) */
export function sklonCile(h: number): number {
  for (let i = 1; i < krivka.length; i++) {
    const [h0, t0] = krivka[i - 1];
    const [h1, t1] = krivka[i];
    if (h < h1) return h < h0 ? 0 : (t1 - t0) / Math.max(1e-6, h1 - h0);
  }
  return 0;
}

export interface Nehody {
  para: boolean;
  kremen: boolean;
  stekla: boolean;
  brzo: boolean;
}

export type Faze = "vypal" | "chladne" | "otevreno";

export interface Pec {
  /** Hodiny od šesté ranní */
  h: number;
  T: number;
  /** Výkon podle tlačítka, 0–1 */
  P: number;
  /** Žhavost spirál, 0–1 — jde za výkonem se zpožděním */
  H: number;
  faze: Faze;
  /** Voda v hlíně, 1 → 0 */
  vlhkost: number;
  tlakPary: number;
  tlakKremene: number;
  /** Ohnutí žároměrek 0–1 (1 = celá ohnutá) */
  zar: number[];
  /** Kolik hodin byla pec nad 1 260 °C */
  vydrz: number;
  /** ∫|T − cíl| dh během výpalu */
  odchylka: number;
  /** ∫(T − 1 310) dh nad hranicí stékání */
  preteceni: number;
  maxT: number;
  pojistka: boolean;
  nehody: Nehody;
  /** Při kolika stupních se otevřelo */
  otevrenoPri: number | null;
  varovaniPary: boolean;
  varovaniKremene: boolean;
  varovaniStekla: boolean;
  sucho: boolean;
  lzeOtevrit: boolean;
}

export type Udalost =
  | "para"
  | "kremen"
  | "stekla"
  | "pojistka"
  | "pojistkaPustila"
  | "sucho"
  | "varovaniPary"
  | "varovaniKremene"
  | "varovaniStekla"
  | "konecVypalu"
  | "lzeOtevrit";

export const novaPec = (): Pec => ({
  h: 0,
  T: 20,
  P: 0,
  H: 0,
  faze: "vypal",
  vlhkost: 1,
  tlakPary: 0,
  tlakKremene: 0,
  zar: zaromerky.map(() => 0),
  vydrz: 0,
  odchylka: 0,
  preteceni: 0,
  maxT: 20,
  pojistka: false,
  nehody: { para: false, kremen: false, stekla: false, brzo: false },
  otevrenoPri: null,
  varovaniPary: false,
  varovaniKremene: false,
  varovaniStekla: false,
  sucho: false,
  lzeOtevrit: false,
});

/** Okamžitý sklon teploty (°C/h) */
export const sklon = (p: Pec) => R * p.H - C * (p.T - 20);

/**
 * Posune pec o `dt` skutečných vteřin. `drzi` = tlačítko Topit je dole.
 * Vrací, co se během kroku stalo.
 */
export function krok(p: Pec, dt: number, drzi: boolean): Udalost[] {
  const u: Udalost[] = [];
  if (p.faze === "otevreno") return u;
  const topi = p.faze === "vypal" && drzi && !p.pojistka;
  /* Po konci programu je výkon pryč hned, ne až dojede tlačítko */
  p.P = p.faze === "vypal" ? omez(p.P + (topi ? NAHORU : -DOLU) * dt) : 0;
  let dh = p.faze === "vypal" ? dt / SEKUND_NA_HODINU : p.h < H_RANO ? dt * NOC_RYCHLOST : 0;
  if (p.faze === "vypal" && p.h + dh >= H_KONEC) dh = H_KONEC - p.h;
  const n = Math.max(1, Math.ceil(dh / 0.004));
  const d = dh / n;
  /* Po konci programu regulátor odpojí spirály úplně — dohřívají jen chvilku */
  const tau = p.faze === "vypal" ? TAU : TAU / 4;
  for (let i = 0; i < n; i++) {
    p.H += ((p.P - p.H) / tau) * d;
    const s = sklon(p);
    p.T += s * d;
    p.h += d;
    if (p.T > p.maxT) p.maxT = p.T;
    if (p.faze === "vypal") p.odchylka += Math.abs(p.T - cil(p.h)) * d;

    /* Pojistka regulátoru */
    if (!p.pojistka && p.T >= T_POJISTKA) {
      p.pojistka = true;
      p.P = 0;
      u.push("pojistka");
    } else if (p.pojistka && p.T <= T_POJISTKA_ZPET) {
      p.pojistka = false;
      u.push("pojistkaPustila");
    }

    /* Voda v hlíně */
    if (p.vlhkost > 0 && p.T >= 95) {
      p.vlhkost -= (d / SUSENI) * (1 + Math.max(0, p.T - 100) / 60);
      if (p.vlhkost <= 0) {
        p.vlhkost = 0;
        if (!p.sucho && !p.nehody.para) u.push("sucho");
        p.sucho = true;
      }
    }
    if (!p.nehody.para && p.vlhkost > 0.1) {
      if (p.T >= 60 && p.T < PARA_T) p.tlakPary += Math.max(0, s - PARA_SKLON) * d;
      p.tlakPary = Math.max(0, p.tlakPary - 25 * d);
      if (p.tlakPary > PARA_VAROVANI && !p.varovaniPary) {
        p.varovaniPary = true;
        u.push("varovaniPary");
      }
      if (p.tlakPary > PARA_MEZ || (p.vlhkost > 0.4 && p.T > 160)) {
        p.nehody.para = true;
        u.push("para");
      }
    }

    /* Křemen */
    if (!p.nehody.kremen) {
      if (p.T >= KREMEN_OD && p.T <= KREMEN_DO) p.tlakKremene += Math.max(0, s - KREMEN_SKLON) * d;
      p.tlakKremene = Math.max(0, p.tlakKremene - 25 * d);
      if (p.tlakKremene > KREMEN_VAROVANI && !p.varovaniKremene) {
        p.varovaniKremene = true;
        u.push("varovaniKremene");
      }
      if (p.tlakKremene > KREMEN_MEZ) {
        p.nehody.kremen = true;
        u.push("kremen");
      }
    }

    /* Vrchol: nad 1 310 °C glazura teče — čím víc a déle, tím spíš */
    if (p.T > T_STEKLA) {
      p.preteceni += (p.T - T_STEKLA) * d;
      if (!p.varovaniStekla) {
        p.varovaniStekla = true;
        u.push("varovaniStekla");
      }
      if (!p.nehody.stekla && p.preteceni > STEKLA_MEZ) {
        p.nehody.stekla = true;
        u.push("stekla");
      }
    }
    if (p.T >= T_VYDRZ) p.vydrz += d;
    zaromerky.forEach((z, k) => {
      if (p.T > z.od) p.zar[k] = Math.min(1, p.zar[k] + ((p.T - z.od) / (z.do - z.od)) * d * F_ZAR);
    });
  }

  if (p.faze === "vypal" && p.h >= H_KONEC - 1e-9) {
    p.faze = "chladne";
    p.h = H_KONEC;
    u.push("konecVypalu");
  }
  if (p.faze === "chladne" && !p.lzeOtevrit && p.T < T_BEZPECNE) {
    p.lzeOtevrit = true;
    u.push("lzeOtevrit");
  }
  return u;
}

/** Otevřít pec. Nad 200 °C je to teplotní šok. */
export function otevri(p: Pec) {
  if (p.faze === "otevreno") return;
  p.otevrenoPri = p.T;
  p.nehody.brzo = p.T >= T_BEZPECNE;
  p.faze = "otevreno";
  p.P = 0;
}

export const POKUTY: Record<keyof Nehody, number> = { para: 15, kremen: 15, stekla: 12, brzo: 15 };
/** Kolik bodů stojí každý stupeň průměrné odchylky nad tolerancí */
export const ZA_STUPEN = 1;
export const TOLERANCE = 6;
export const ZA_ZAROMERKY = 12;

/** Ideál podle data/kami.ts: první celá, druhá do pravého úhlu, třetí stojí */
export const chybaZaromerek = (z: number[]) => Math.abs(z[0] - 1) + 1.5 * Math.abs(z[1] - 0.5) + 2 * Math.abs(z[2]);

export interface Hodnoceni {
  body: number;
  proslo: boolean;
  /** Průměrná odchylka od křivky (°C) */
  mad: number;
  chybaZar: number;
  pokuty: number;
  zralaGlazura: boolean;
}

export function hodnot(p: Pec): Hodnoceni {
  const mad = p.odchylka / H_KONEC;
  const chybaZar = chybaZaromerek(p.zar);
  const pokuty = (Object.keys(POKUTY) as (keyof Nehody)[]).reduce((s, k) => s + (p.nehody[k] ? POKUTY[k] : 0), 0);
  const body = Math.round(omez(100 - ZA_STUPEN * Math.max(0, mad - TOLERANCE) - pokuty - ZA_ZAROMERKY * chybaZar, 0, 100));
  return { body, proslo: body >= 40, mad, chybaZar, pokuty, zralaGlazura: p.vydrz >= VYDRZ_ZRALA };
}
