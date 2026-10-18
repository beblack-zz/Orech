/**
 * Šátek furoshiki ve 3D — smlouva mezi moduly. Nic tu neběží, jen typy,
 * pár konstant a dvě drobné funkce, na kterých se moduly musí shodnout.
 *
 *   fyzika.ts        látka jako síť bodů (XPBD po malých krocích): nenatahuje se,
 *                    ohýbá se jako bavlna, srazí se sama se sebou, s balíky a s pultem
 *   choreografie.ts  co se s látkou a balíky děje v čase: složit, rozložit, dopad
 *                    balíku, zavázat (otsukai-tsutsumi), rozvázat
 *   balik.ts         kus zabalený v novinách podle tvaru: sítě, tvar pro srážky
 *   noviny.ts        textury novin a visačky 荷札 s fotkou a číslem (canvas 2D)
 *   uzel.ts          jádro uzlu ma-musubi jako síť
 *   kresleni.ts      WebGL2: látka, lem, balíky, uzel, lampa, stíny, tma v záhybech
 *   latka.ts         fasáda pro satek.ts: smyčka, ruka (myš), spojení všeho dohromady
 *
 * Svět je v metrech, z míří nahoru, pult je rovina z = 0. Kamera stojí vpředu
 * (na −y) a dívá se šikmo dolů. Šátek je čtverec o straně STRANA položený na
 * cíp jako kosočtverec: zadní cíp na +y, přední na −y, pravý na +x, levý na −x.
 *
 * Síť látky má N × N bodů. Bod (i, j) má index k = j·N + i a souřadnice látky
 * u = i/(N−1), v = j/(N−1). Zadní cíp je (0, 0), přední (N−1, N−1), pravý
 * (N−1, 0), levý (0, N−1). Klidovou polohu na rozprostřeném šátku dává
 * klidovaPoloha(); souřadnice textury vzoru jsou právě (u, v).
 *
 * Líc (strana se vzorem) leží na rozprostřeném šátku DOLŮ a nahoře je rub —
 * tak se furoshiki opravdu prostírá: kus se položí na rub a po zavázání je
 * venku líc. Složený prázdný šátek (zadní půlka přes přední) proto ukazuje
 * nahoře líc. Rub je tentýž vzor, jen o kus světlejší (látka je barvená skrz).
 */
import type { VzorSatku } from "../../../data/furoshiki";

export type V3 = [number, number, number];

/** Strana šátku v metrech — nishaku-haba 二尺幅, nejběžnější velikost na nošení */
export const STRANA = 0.7;
/** Nejvíc balíků na šátku najednou; další jsou jen na účtence („+N“) */
export const NEJVIC_BALIKU = 9;

export type Roh = "zadni" | "predni" | "levy" | "pravy";

/** Klidová poloha bodu (i, j) na rozprostřeném šátku (x, y v metrech) */
export function klidovaPoloha(i: number, j: number, n: number, strana = STRANA): [number, number] {
  const a = i / (n - 1) - 0.5;
  const b = j / (n - 1) - 0.5;
  return [(a - b) * strana * Math.SQRT1_2, -(a + b) * strana * Math.SQRT1_2];
}

/** Index bodu v cípu */
export function indexRohu(roh: Roh, n: number): number {
  const m = n - 1;
  return roh === "zadni" ? 0 : roh === "predni" ? m * n + m : roh === "pravy" ? m : m * n;
}

/* ═══ Kusy a balíky ═══ */

/** Jak je kus zabalený v novinách — podle tvaru (data/obchod.ts `shape`) */
export type TvarBaliku = "miska" | "hrnek" | "cajovka" | "vaza" | "talir";

export interface KusNaSatku {
  id: string;
  /** Pořadí v šátku od 1 — stejné číslo je na visačce balíku i na účtence */
  cislo: number;
  tvar: TvarBaliku;
  nazev: string;
  /** Náhled fotky (stejný původ, webp kolem 160 px), když ji kus má */
  foto?: string;
  /** Náhoda pro zmačkání papíru, sloupce novin a natočení balíku */
  seme: number;
}

/**
 * Tvar balíku pro srážky: sjednocení jednoduchých těles v místních
 * souřadnicích balíku — počátek uprostřed dna na pultu, z nahoru, líc
 * s visačkou míří na −y (ke kameře). Do sítě balíku sedí na pár milimetrů.
 */
export type Primitivum =
  /** Svislý válec se zaoblenými hranami mezi výškami z0 a z1 */
  | { druh: "valec"; r: number; z0: number; z1: number; zaobleni: number }
  /** Úsečka a–b s poloměrem r (ležící váza, smotaný konec papíru) */
  | { druh: "kapsle"; a: V3; b: V3; r: number }
  /** Elipsoid (chomáček papíru nahoře, plochá miska) */
  | { druh: "elipsoid"; stred: V3; polomery: V3 };

export interface TvarTelesa {
  primitiva: Primitivum[];
  /** Nejvyšší bod balíku nad pultem (m), při měřítku 1 */
  vyska: number;
  /** Poloměr půdorysu kolem počátku (m), při měřítku 1 — kolik místa zabere na látce */
  polomer: number;
}

/** Kde balík stojí: posun, natočení kolem svislé osy (rad) a měřítko (víc kusů = menší balíky) */
export interface Poloha {
  x: number;
  y: number;
  z: number;
  otoceni: number;
  meritko: number;
}

/** Těleso, o které se látka zastaví */
export interface Teleso {
  id: string;
  tvar: TvarTelesa;
  poloha: Poloha;
  /** Balík stojí na látce: látku pod dnem přitlačí k pultu a drží ji tam třením */
  pritlaci: boolean;
}

/* ═══ Sítě a data pro kreslení ═══ */

export interface Sit {
  /** x, y, z za sebou */
  pozice: Float32Array;
  normaly: Float32Array;
  /** u, v za sebou */
  uv: Float32Array;
  indexy: Uint16Array | Uint32Array;
}

/** papír novin, provázek, visačka 荷札 (karton) */
export type Material = "papir" | "provazek" | "visacka";

export interface CastBaliku {
  sit: Sit;
  material: Material;
  /** Textura části (noviny, visačka), nebo null — pak platí `barva` */
  textura: TexImageSource | null;
  /** Barva v sRGB 0…1, když textura není (provázek) */
  barva?: [number, number, number];
}

export interface DataBaliku {
  id: string;
  /** Sítě v místních souřadnicích balíku (viz Primitivum) */
  casti: CastBaliku[];
  tvar: TvarTelesa;
}

/** Uzel ma-musubi: kde je a jak je natočený */
export interface StavUzlu {
  /** 0…1 — jak moc je uzel uvázaný: jádro z ničeho doroste do plné velikosti (a při rozvazování zase zmizí) */
  mira: number;
  stred: V3;
  /** Jednotkový směr k pravému uchu */
  osaX: V3;
  /** Jednotkový směr nahoru, kolmo na osaX */
  osaZ: V3;
  /** Šířka jádra uzlu v metrech (síť z uzel.ts má šířku 1) */
  velikost: number;
}

/** Co balík zrovna dělá — kde je a jestli je vidět */
export interface StavBaliku {
  id: string;
  poloha: Poloha;
  /** 0…1 — 0 = není vidět (ještě nedopadl, nebo už odletěl) */
  viditelnost: number;
}

/** Jeden snímek pro kreslení */
export interface Snimek {
  /** Pozice bodů látky (x, y, z za sebou), N × N */
  latka: Float32Array;
  baliky: StavBaliku[];
  uzel: StavUzlu | null;
  /** Balík pod kurzorem (jemně se prosvětlí), nebo null */
  zvyrazneny: string | null;
}

/* ═══ Rozhraní modulů ═══ */

/** fyzika.ts — `new SimLatky({ n })` */
export interface RozhraniSim {
  readonly n: number;
  readonly pocet: number;
  /** Pozice bodů (x, y, z za sebou) — kreslení je čte přímo */
  readonly p: Float32Array;
  /** Jeden snímek (dt v sekundách, nejvýš 1/30); uvnitř se dělí na malé kroky */
  krok(dt: number): void;
  /** Rozprostřený šátek; s vráskami jako puštěný z ruky kousek nad pultem (dosedne sám) */
  rozprostri(vrasky: boolean): void;
  /** Okamžitě složený do trojúhelníku: zadní půlka leží přes přední */
  slozena(): void;
  nastavTelesa(t: Teleso[]): void;
  /** Přišpendlit bod k cíli (ruka); poddajnost 0 = natvrdo, větší = měkce (XPBD compliance) */
  pripni(k: number, cil: V3, poddajnost?: number): void;
  pust(k: number): void;
  pustVse(): void;
  readonly piny: ReadonlyMap<number, V3>;
  /** Něco dopadlo nebo do látky ťukl prst: kolem (x, y) se látka rozvlní */
  rozvlni(x: number, y: number, r: number, sila: number): void;
  /** Největší rychlost bodu (m/s) — pod 0,002 může smyčka usnout */
  pohyb(): number;
}

/** Balík, jak ho choreografie dostane od fasády (v pořadí šátku) */
export interface BalikDoChoreografie {
  id: string;
  tvar: TvarTelesa;
  /** Náhoda pro natočení */
  seme: number;
}

/** choreografie.ts — `new Choreografie(sim)`; čas je v sekundách a jde jen z tik() */
export interface RozhraniChoreografie {
  /** Posune čas: pohyby cípů, balíků a uzlu. Volá se před sim.krok(). Vrací, jestli se něco děje. */
  tik(cas: number): boolean;
  bezi(): boolean;
  readonly slozeno: boolean;
  readonly zavazano: boolean;
  /** První stav při načtení: prázdný = složený; s balíky = šátek dosedne s vráskami a pak balíky dopadnou */
  start(cas: number, baliky: BalikDoChoreografie[]): void;
  /**
   * Nový obsah šátku (v pořadí): nové balíky dopadnou (je-li šátek složený,
   * nejdřív se rozloží), vyndané odletí nahoru, zbylé se přesunou na nový
   * rozvrh. Prázdný seznam = šátek se složí. Zavázaný šátek se nejdřív rozváže.
   */
  nastavBaliky(cas: number, baliky: BalikDoChoreografie[]): void;
  /** Otsukai-tsutsumi: přední cíp přes balíky, zadní přes ně, boční nahoru do uzlu. Zavolá `hotovo`, až uzel drží. */
  zavaz(cas: number, hotovo?: () => void): void;
  /** Uzel se rozváže, cípy se vrátí a látka se uhladí. Zavolá `hotovo`, až šátek leží. */
  rozvaz(cas: number, hotovo?: () => void): void;
  /** Co nakreslit: balíky a jejich stav */
  baliky(): StavBaliku[];
  uzel(): StavUzlu | null;
  /** Smí ruka (myš) chytit látku? (ne během pohybu a ne na zavázaném šátku) */
  lzeSahat(): boolean;
  /** Omezený pohyb nebo šátek mimo obrazovku: všechno, co se má stát, hned dopočítá do klidu. Vrací nový čas. */
  dobehni(cas: number): number;
}

/** kresleni.ts — `vytvorKresleni(platno, { n, uspora, lehka? })`, bez WebGL2 null */
export interface Kresleni {
  /** Canvas změnil velikost — přepočítat (CSS px × poměr pixelů: nejvýš 2, na telefonu 1,5, lehká varianta 1) */
  zmer(): void;
  /** Vzor látky (líc, rub a lem z data/furoshiki.ts); splní se, až je textura nahraná */
  nastavVzor(v: VzorSatku): Promise<void>;
  nastavBalik(data: DataBaliku): void;
  odeberBalik(id: string): void;
  kresli(s: Snimek): void;
  /** Bod světa → CSS px v canvasu a hloubka (0 blízko … 1 daleko) */
  promitni(x: number, y: number, z: number): [number, number, number];
  /** CSS px v canvasu → paprsek ve světě (o = počátek, d = jednotkový směr) */
  paprsek(sx: number, sy: number): { o: V3; d: V3 };
  zrus(): void;
}

/* balik.ts:  export function vytvorBalik(kus: KusNaSatku): Promise<DataBaliku>
 *            export function tvarBaliku(tvar: TvarBaliku): TvarTelesa   (bez DOM, pro fyziku a testy)
 * uzel.ts:   export function sitUzlu(): Sit   (šířka jádra 1, x k pravému uchu, z nahoru, uv v souřadnicích látky)
 */
