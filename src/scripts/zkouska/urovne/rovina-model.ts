/**
 * Sušárna (五 Rovina) — model sušení, bez DOM. Hru kolem něj staví
 * scripts/zkouska/urovne/rovina.ts, kresbu components/zkouska/urovne/rovina-kresba.ts.
 *
 * Každý kus má dvě části: rychlou (kraj, rohy, ucho — schne dřív) a pomalou
 * (střed, tělo, dno). Vlhkost obou jde od 1 (čerstvě vytočené) k 0. Když
 * rychlá část předběhne pomalou o víc než PRAH, kus se kroutí: zkroucení
 * `w` roste s tím, o kolik je rozdíl nad prahem. Při w = 1 kus praskne.
 *
 * Co s tím jde dělat:
 *   fólie   rychlá část skoro přestane schnout, pomalá schne dál a vlhkost
 *           se pod fólií vyrovnává — rozdíl se zmenšuje k nule, ale nepřeběhne
 *   obrátit (talíř, kachel, mísa) kus se otočí rubem nahoru: nahoře je teď
 *           ta mokřejší strana, takže si rychlá a pomalá část vymění role
 *   slunce  paprsek z okna sušení zrychlí (obě části stejně)
 *   průvan  otevřené okno: rychlá část schne dvaapůlkrát rychleji
 *
 * Hotový je kus, který má obě části pod SUCHO. Body: 100 − 22 za každý
 * prasklý − 60 × průměrné zkroucení − 15 za každý nedosušený. Projde, kdo
 * má nanejvýš jeden prasklý a nanejvýš jeden nedosušený.
 *
 * Kalibrace (roboti nad modelem, 100 her): pečlivý 100, snaživý ≈ 96,
 * průměrný ≈ 85, ledabylý ≈ 67, kdo jen obrací 32 (neprojde), kdo nic
 * nedělá 0, kdo všechno přikryje 25 (nic nedoschne). Pečlivá hra skončí
 * v sobotu, obracené kusy doschnou už ve středu až čtvrtek.
 */

export type KusId = "talir" | "miska" | "hrnek" | "kachel" | "misa";

export interface DruhKusu {
  id: KusId;
  /** Jak se jmenuje na cedulce */
  nazev: string;
  /** Násobek rychlosti rychlé části — tenký kraj talíře nebo ucho schnou nejrychleji */
  kf: number;
  /** Násobek rychlosti pomalé části — tlustá mísa schne nejpomaleji */
  ks: number;
  /** Jak snadno se kus kroutí */
  citlivost: number;
  /** Dá se obrátit */
  obracet: boolean;
}

/** Pořadí je pořadí na polici: nahoře zleva 1–3, dole 4–5 */
export const DRUHY: readonly DruhKusu[] = [
  { id: "talir", nazev: "talíř", kf: 1.12, ks: 1, citlivost: 1.1, obracet: true },
  { id: "miska", nazev: "miska", kf: 0.95, ks: 1, citlivost: 0.9, obracet: false },
  { id: "hrnek", nazev: "hrnek", kf: 1.25, ks: 0.95, citlivost: 1, obracet: false },
  { id: "kachel", nazev: "kachel", kf: 1, ks: 0.9, citlivost: 1, obracet: true },
  { id: "misa", nazev: "mísa", kf: 1.05, ks: 0.84, citlivost: 1.1, obracet: true },
];

/** Vlhkost za vteřinu: rychlá a pomalá část */
export const K_F = 0.039;
export const K_S = 0.017;
export const SLUNCE = 1.6;
export const PRUVAN_F = 2.5;
export const PRUVAN_S = 1.4;
export const FOLIE_F = 0.1;
export const FOLIE_S = 0.8;
/** Rozdíl vlhkosti, který hlína ještě snese */
export const PRAH = 0.18;
export const KROUCENI = 0.6;
/** Pod tímhle je část suchá */
export const SUCHO = 0.08;
/** Jak dlouho trvá týden — vteřiny hry */
export const T_HRY = 75;
/** Jak dlouho fouká, když se okno nezavře */
export const PRUVAN_DOBA = 5;

export interface Kus {
  druh: DruhKusu;
  /** Vlhkost kraje (u hrnku ucha a horního okraje), 0–1 */
  a: number;
  /** Vlhkost středu (u hrnku těla a dna), 0–1 */
  b: number;
  /** Zkroucení 0–1; při 1 kus praskne */
  w: number;
  prikryty: boolean;
  otoceny: boolean;
  prasklo: boolean;
  suchy: boolean;
}

export const novyKus = (druh: DruhKusu): Kus => ({ druh, a: 1, b: 1, w: 0, prikryty: false, otoceny: false, prasklo: false, suchy: false });

/** Kolik má pomalá část navíc proti rychlé — nad PRAH se kus kroutí. Obrácený kus má role prohozené. */
export const mezera = (k: Kus) => (k.otoceny ? k.a - k.b : k.b - k.a);

/** Jak moc je kus mokrý — horší z obou částí */
export const vlhkost = (k: Kus) => Math.max(k.a, k.b);

/** Posune kus o dt vteřin. `slunce` = stojí v paprsku z okna, `pruvan` = okno je otevřené. */
export function krok(k: Kus, dt: number, slunce: boolean, pruvan: boolean) {
  if (k.prasklo) return;
  const s = slunce ? SLUNCE : 1;
  let rf = K_F * k.druh.kf * s * (pruvan ? PRUVAN_F : 1);
  let rs = K_S * k.druh.ks * s * (pruvan ? PRUVAN_S : 1);
  let f = k.otoceny ? k.b : k.a;
  let p = k.otoceny ? k.a : k.b;
  if (k.prikryty) {
    /* Pod fólií schne kus jako celek a vlhkost se v něm vyrovnává —
       rozdíl se zmenšuje k nule z kterékoli strany, ale nepřeběhne */
    rf *= FOLIE_F;
    rs *= FOLIE_S;
    const prumer = (f + p) / 2 - ((rf + rs) / 2) * dt;
    const g = p - f;
    const g2 = Math.sign(g) * Math.max(0, Math.abs(g) - Math.abs(rs - rf) * dt);
    f = prumer - g2 / 2;
    p = prumer + g2 / 2;
  } else {
    f -= rf * dt;
    p -= rs * dt;
  }
  f = Math.max(0, f);
  p = Math.max(0, p);
  if (k.otoceny) {
    k.b = f;
    k.a = p;
  } else {
    k.a = f;
    k.b = p;
  }
  const napeti = Math.max(0, p - f - PRAH);
  k.w += napeti * KROUCENI * k.druh.citlivost * dt;
  if (k.w >= 1) {
    k.w = 1;
    k.prasklo = true;
    return;
  }
  if (!k.suchy && f <= SUCHO && p <= SUCHO) k.suchy = true;
}

export interface Hodnoceni {
  body: number;
  proslo: boolean;
  prasklo: number;
  nedosusene: number;
  suche: number;
  /** Průměrné zkroucení 0–1 (prasklý kus se počítá jako 1) */
  prumer: number;
  /** Největší zkroucení mezi kusy, které nepraskly (0–1), nebo null, když praskly všechny */
  nejvic: number | null;
}

export function hodnot(kusy: readonly Kus[]): Hodnoceni {
  const prasklo = kusy.filter((k) => k.prasklo).length;
  const suche = kusy.filter((k) => !k.prasklo && k.suchy).length;
  const nedosusene = kusy.length - prasklo - suche;
  const prumer = kusy.reduce((s, k) => s + Math.min(1, k.w), 0) / kusy.length;
  const cele = kusy.filter((k) => !k.prasklo);
  const nejvic = cele.length ? Math.max(...cele.map((k) => k.w)) : null;
  const body = Math.round(Math.min(100, Math.max(0, 100 - 22 * prasklo - 60 * prumer - 15 * nedosusene)));
  return { body, proslo: prasklo <= 1 && nedosusene <= 1, prasklo, nedosusene, suche, prumer, nejvic };
}
