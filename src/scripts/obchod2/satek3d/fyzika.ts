/**
 * Fyzika šátku furoshiki ve 3D — látka jako síť N × N bodů řešená XPBD po
 * malých krocích (Macklin a spol. 2019, „Small Steps in Physics Simulation“):
 * snímek se rozdělí na 14 (N = 48) nebo 12 (N = 32) malých kroků a v každém
 * se vazby projdou jen jednou. Bez DOM a bez závislostí, ať jde zkoušet
 * v Node. Řídí ji choreografie.ts a ruka z latka.ts; kreslení čte rovnou `p`.
 *
 * Proč nová: dřívější Verlet (latka-fyzika.ts) se za cíp natáhl jako guma,
 * ohyb v něm jen táhl, takže se mačkal do plošek jako alobal, a látka
 * neznala sama sebe — přeložená chlopeň ležela v látce pod sebou. Tady:
 *
 *   tah     po hranách sítě s poddajností 0 a kotvy (long range attachments,
 *           Kim a spol. 2012): žádný bod není od pevného bodu (pin natvrdo,
 *           látka pod balíkem) dál než na rozprostřené látce — za ruku se
 *           látka natáhne nejvýš o pár procent,
 *   smyk    po obou úhlopříčkách čtverečku, měkce a jen v tahu (přehyb brzdí ohyb),
 *   ohyb    izometrický (Bergou a spol. 2006): přes každou vnitřní hranu
 *           lineární vazba čtyř bodů, energie roste s druhou mocninou ohybu
 *           jako u tkaniny — přes hranu balíku padá měkkým obloukem a sama se
 *           nemačká. (Vzdálenost protilehlých vrcholů jako v Ten Minute
 *           Physics se při srovnání lámala do hřbetů a s větší poddajností
 *           krčila: její energie roste se čtvrtou mocninou úhlu.)
 *   srážky  látky se sebou: bod proti tečné rovině nejbližšího bodu jiné
 *           vrstvy, strana ze začátku pod-kroku (kdo by vrstvou prolétl, vrátí
 *           se) — vrstvy leží TLOUSTKA od sebe a neprolnou se; s balíky
 *           (vzdálenostní pole z primitiv tvaru) a s pultem; všude se třením,
 *           klidná látka na pultu navíc drží kotvou (vrásky zůstanou ležet),
 *   vzduch  brzdí každý trojúhelník hlavně kolmo na plochu — látka plachtí a dosedá,
 *   piny    natvrdo (ruka, cípy) i měkce (stažení látky do uzlu); pin natvrdo
 *           nedojde dál, než kam ho pustí body pod balíky.
 *
 * Jednotky jsou metry, sekundy a kilogramy; svět a indexy bodů viz typy.ts.
 * Pro kreslení: líc je strana, kam míří normála trojúhelníků (k, k+1, k+N+1)
 * a (k, k+N+1, k+N) — na rozprostřeném šátku dolů. Přeložené vrstvy leží
 * TLOUSTKA (5 mm) od sebe; nos přehybu složeného šátku je řada bodů
 * i + j = N − 1 v půlce výšky mezi vrstvami (viz polohaSlozena).
 */
import { STRANA, klidovaPoloha } from "./typy";
import type { Primitivum, RozhraniSim, Teleso, TvarTelesa, V3 } from "./typy";

/* ═══ Látka a svět ═══ */

/** Plošná hmotnost bavlněného furoshiki (kg/m²) — celý šátek váží kolem 60 g */
export const PLOSNA_HMOTNOST = 0.12;
const G = -9.81;
/**
 * Malých kroků na snímek: N = 48 jich potřebuje víc (delší řetězy bodů), aby se
 * za ruku nenatáhla víc než o pár procent. Vždy sudý počet — jedna iterace
 * Gaussovy–Seidelovy metody umí v napnuté látce kmitat s periodou dvou
 * pod-kroků a na konci snímku se to tak vyruší.
 */
export const podkrokuPro = (n: number) => (n >= 40 ? 14 : 12);
/**
 * Tloušťka vrstvy (m): o tolik od sebe leží přeložená látka (střed od středu).
 * Srážka bod proti ploše (viz srazkySeSebou) nepotřebuje tloušťku podle
 * rozteče sítě; víc než 2,5 mm kvůli trubce lemu v kreslení.
 */
export const TLOUSTKA = 0.005;
/** Výška středu látky nad pultem (m) */
export const ODSTUP_PULT = 0.0015;
/** Jak daleko od povrchu balíku se látka zastaví (m) — síť balíku sedí v tvaru na pár milimetrů */
export const ODSTUP_TELESO = 0.004;
/** Tření [statické, kinetické]: bavlna na dřevě, bavlna na bavlně, bavlna na novinách */
const TRENI_PULT_S = 0.65;
const TRENI_PULT_K = 0.5;
const TRENI_LATKA_S = 0.6;
const TRENI_LATKA_K = 0.45;
const TRENI_TELESO_S = 0.55;
const TRENI_TELESO_K = 0.42;
/** Vzduch: hustota (kg/m³), tvarový odpor plochy kolmo a třecí podél (kg/(m²·s)) */
const VZDUCH = 1.2;
const ODPOR_KOLMO = 1.3;
const ODPOR_PODEL = 0.02;
/** Útlum (1/s) — vnitřní tření vláken, ať se látka uklidní */
const UTLUM = 0.6;
/** Poddajnost smyku (m/N) — nezávisí na síti */
const PODDAJNOST_SMYK = 2e-3;
/**
 * Ohybová tuhost (N·m): bavlna 5·10⁻⁶ až 2·10⁻⁵. Přes hranu balíku padá
 * v oblouku o poloměru pár centimetrů, tedy přes několik hran sítě.
 */
const TUHOST_OHYBU = 2e-5;
/** Poddajnost stlačení hrany (m/N); 0 = ve stlačení stejně tuhá jako v tahu */
const PODDAJNOST_STLACENI = 0;
/** O kolik měkčí je ohyb v přehybu složeného šátku (vyžehlený přehyb) */
const PREHYB_MEKCI = 30;
/** Statické tření s kotvou: o kolik se ležící bod smí za pod-krok posunout, než se utrhne (m), a zvednout, než se odlepí */
const LEPI = 0.0003;
const ODLEPENI = 0.001;
/**
 * Nejvyšší posun bodu za pod-krok jako díl rozteče (mřížka dvojic to unese)
 * a jako díl tloušťky vrstvy: chlopeň, která dosedá rychleji (doběh na
 * 1/30 s), by jinak v cípu prošla spodní vrstvou dřív, než si srážka
 * všimne. Při 1/60 s to dělá kolem 2 m/s — rychleji látka nikde nejde.
 */
const RYCHLOST_DIL = 0.35;
const RYCHLOST_TLOUSTKY = 0.6;
/** Balík stojí na pultu (a přitlačuje látku), když má dno níž než tohle (m) */
const STOJI = 0.002;

/** Tloušťka vrstvy látky pro síť N × N (m) */
export const tloustkaVrstvy = (n: number) => (void n, TLOUSTKA);

/**
 * Bod (i, j) na složeném šátku: přední půlka leží na pultu, zadní přes ni
 * o vrstvu výš, každý bod přesně nad svým zrcadlovým (N−1−j, N−1−i). Nos
 * přehybu je řada bodů i + j = N − 1 v půlce výšky mezi vrstvami, posunutá
 * k látce právě tak, aby hrany sítě k sousedním řadám měly klidovou délku.
 * (Kdyby nos ležel mezi řadami bodů, hrany přes něj by byly stlačené, tah by
 * je narovnal a přehyb by se nafoukl do oblouku vysokého přes centimetr.)
 * Stejné místo míří i choreografie, když šátek skládá.
 */
export function polohaSlozena(i: number, j: number, n: number, out: V3 = [0, 0, 0]): V3 {
  const [x, y] = klidovaPoloha(i, j, n);
  const t = tloustkaVrstvy(n);
  out[0] = x;
  if (i + j > n - 1) {
    out[1] = y;
    out[2] = ODSTUP_PULT;
  } else if (i + j < n - 1) {
    /* y > 0 je vzdálenost od čáry přehybu (levý–pravý cíp) */
    out[1] = -y;
    out[2] = ODSTUP_PULT + t;
  } else {
    /* Nos: sousední řady jsou napříč přehybem d1 daleko, půl vrstvy pod ním a nad ním */
    const d1 = STRANA / (n - 1) / Math.SQRT2;
    const r = t / 2;
    out[1] = y - d1 + Math.sqrt(d1 * d1 - r * r);
    out[2] = ODSTUP_PULT + r;
  }
  return out;
}

/* ═══ Tvar balíku jako vzdálenostní pole ═══ */

/** Primitiva sbalená do čísel: druh (0 válec, 1 kapsle, 2 elipsoid) a 7 čísel */
interface Zabaleny {
  druh: Uint8Array;
  cisla: Float64Array;
  /** Obalová koule v místních souřadnicích při měřítku 1 */
  obalZ: number;
  obalR: number;
}

const KROK_PRIM = 7;
const zabalene = new WeakMap<TvarTelesa, Zabaleny>();

function zabal(tvar: TvarTelesa): Zabaleny {
  const hotovy = zabalene.get(tvar);
  if (hotovy) return hotovy;
  const pr = tvar.primitiva;
  const druh = new Uint8Array(pr.length);
  const c = new Float64Array(pr.length * KROK_PRIM);
  const obalZ = tvar.vyska / 2;
  let obalR = 0;
  /** Nejdál od středu obalu: rozšíří kouli o bod a poloměr kolem něj */
  const obal = (x: number, y: number, z: number, r: number) => {
    obalR = Math.max(obalR, Math.hypot(x, y, z - obalZ) + r);
  };
  pr.forEach((p: Primitivum, k) => {
    const o = k * KROK_PRIM;
    if (p.druh === "valec") {
      druh[k] = 0;
      const zr = Math.max(0, Math.min(p.zaobleni, p.r, (p.z1 - p.z0) / 2));
      c[o] = p.r;
      c[o + 1] = p.z0;
      c[o + 2] = p.z1;
      c[o + 3] = zr;
      obal(p.r, 0, p.z0, 0);
      obal(p.r, 0, p.z1, 0);
    } else if (p.druh === "kapsle") {
      druh[k] = 1;
      c.set([p.a[0], p.a[1], p.a[2], p.b[0], p.b[1], p.b[2], p.r], o);
      obal(p.a[0], p.a[1], p.a[2], p.r);
      obal(p.b[0], p.b[1], p.b[2], p.r);
    } else {
      druh[k] = 2;
      c.set([p.stred[0], p.stred[1], p.stred[2], p.polomery[0], p.polomery[1], p.polomery[2]], o);
      obal(p.stred[0], p.stred[1], p.stred[2], Math.max(p.polomery[0], p.polomery[1], p.polomery[2]));
    }
  });
  const z = { druh, cisla: c, obalZ, obalR };
  zabalene.set(tvar, z);
  return z;
}

/** Gradient posledního vyhodnocení (jednotkový, místní souřadnice) */
const GRAD = new Float64Array(3);
const GRAD_NEJ = new Float64Array(3);

/** Vzdálenost od jednoho primitiva v místních souřadnicích; gradient do GRAD */
function sdfPrimitiva(druh: number, c: Float64Array, o: number, x: number, y: number, z: number): number {
  if (druh === 0) {
    /* Válec se zaoblenými hranami: vzdálenost v rovině (poloměr, výška) */
    const r = c[o];
    const z0 = c[o + 1];
    const z1 = c[o + 2];
    const zr = c[o + 3];
    const zc = (z0 + z1) / 2;
    const hh = (z1 - z0) / 2;
    const rho = Math.sqrt(x * x + y * y);
    const rx = rho > 1e-9 ? x / rho : 1;
    const ry = rho > 1e-9 ? y / rho : 0;
    const sz = z >= zc ? 1 : -1;
    const qx = rho - (r - zr);
    const qy = Math.abs(z - zc) - (hh - zr);
    if (qx > 0 && qy > 0) {
      const l = Math.sqrt(qx * qx + qy * qy);
      GRAD[0] = (rx * qx) / l;
      GRAD[1] = (ry * qx) / l;
      GRAD[2] = (sz * qy) / l;
      return l - zr;
    }
    if (qx > qy) {
      GRAD[0] = rx;
      GRAD[1] = ry;
      GRAD[2] = 0;
      return qx - zr;
    }
    GRAD[0] = 0;
    GRAD[1] = 0;
    GRAD[2] = sz;
    return qy - zr;
  }
  if (druh === 1) {
    /* Kapsle: vzdálenost od úsečky a–b minus poloměr */
    const ax = c[o];
    const ay = c[o + 1];
    const az = c[o + 2];
    const bx = c[o + 3] - ax;
    const by = c[o + 4] - ay;
    const bz = c[o + 5] - az;
    const px = x - ax;
    const py = y - ay;
    const pz = z - az;
    const bb = bx * bx + by * by + bz * bz;
    let t = bb > 1e-12 ? (px * bx + py * by + pz * bz) / bb : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const dx = px - bx * t;
    const dy = py - by * t;
    const dz = pz - bz * t;
    const l = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (l < 1e-9) {
      GRAD[0] = 0;
      GRAD[1] = 0;
      GRAD[2] = 1;
    } else {
      GRAD[0] = dx / l;
      GRAD[1] = dy / l;
      GRAD[2] = dz / l;
    }
    return l - c[o + 6];
  }
  /* Elipsoid: přibližná vzdálenost (Quilez) a směr gradientu tvaru */
  const ex = c[o + 3];
  const ey = c[o + 4];
  const ez = c[o + 5];
  const px = (x - c[o]) / ex;
  const py = (y - c[o + 1]) / ey;
  const pz = (z - c[o + 2]) / ez;
  const k0 = Math.sqrt(px * px + py * py + pz * pz);
  const gx = px / ex;
  const gy = py / ey;
  const gz = pz / ez;
  const k1 = Math.sqrt(gx * gx + gy * gy + gz * gz);
  if (k1 < 1e-9) {
    GRAD[0] = 0;
    GRAD[1] = 0;
    GRAD[2] = 1;
    return -Math.min(ex, ey, ez);
  }
  GRAD[0] = gx / k1;
  GRAD[1] = gy / k1;
  GRAD[2] = gz / k1;
  return (k0 * (k0 - 1)) / k1;
}

/** Vzdálenost od sjednocení primitiv (místní souřadnice, měřítko 1); gradient do GRAD_NEJ */
function sdfZabaleny(t: Zabaleny, x: number, y: number, z: number): number {
  let nej = Infinity;
  const { druh, cisla } = t;
  for (let k = 0; k < druh.length; k++) {
    const d = sdfPrimitiva(druh[k], cisla, k * KROK_PRIM, x, y, z);
    if (d < nej) {
      nej = d;
      GRAD_NEJ[0] = GRAD[0];
      GRAD_NEJ[1] = GRAD[1];
      GRAD_NEJ[2] = GRAD[2];
    }
  }
  return nej;
}

/** Vzdálenost bodu světa od povrchu tělesa (záporná uvnitř) */
export function vzdalenostOdTelesa(t: Teleso, x: number, y: number, z: number): number {
  const { poloha } = t;
  const cs = Math.cos(poloha.otoceni);
  const sn = Math.sin(poloha.otoceni);
  const dx = x - poloha.x;
  const dy = y - poloha.y;
  const im = 1 / poloha.meritko;
  return sdfZabaleny(zabal(t.tvar), (cs * dx + sn * dy) * im, (-sn * dx + cs * dy) * im, (z - poloha.z) * im) * poloha.meritko;
}

/** Nejvyšší povrch těles nad bodem (x, y) pultu, nebo 0 (pro choreografii: kam položit cíp) */
export function vyskaTeles(telesa: readonly Teleso[], x: number, y: number): number {
  let nej = 0;
  for (const t of telesa) {
    const { poloha, tvar } = t;
    const vrch = poloha.z + tvar.vyska * poloha.meritko + 0.01;
    if (Math.hypot(x - poloha.x, y - poloha.y) > tvar.polomer * poloha.meritko * 1.6 + 0.02) continue;
    /* Shora dolů po 2 mm, pak půlením na desetinu milimetru */
    let z = vrch;
    while (z > poloha.z && vzdalenostOdTelesa(t, x, y, z) > 0) z -= 0.002;
    if (z <= poloha.z) continue;
    let nad = z + 0.002;
    let pod = z;
    for (let k = 0; k < 5; k++) {
      const s = (nad + pod) / 2;
      if (vzdalenostOdTelesa(t, x, y, s) > 0) nad = s;
      else pod = s;
    }
    nej = Math.max(nej, pod);
  }
  return nej;
}

/* ═══ Simulace ═══ */

interface TelesoVnitrni {
  id: string;
  zdroj: Teleso;
  tvar: Zabaleny;
  /** Poloha na začátku a na konci snímku: x, y, z, otočení, měřítko */
  a: Float64Array;
  b: Float64Array;
  /** Poloha v tomto pod-kroku a v minulém (x, y, z, cos, sin, měřítko) */
  ted: Float64Array;
  minule: Float64Array;
  /** Stojí na pultu a přitlačuje látku pod dnem */
  lezi: boolean;
  /** Body, které na tělese můžou tento snímek přistát (úsek v this.kandidati) */
  kandOd: number;
  kandDo: number;
}

/** Vlastní buňka a 13 buněk „dopředu“ (lexikograficky po z, y, x) — polovina sousedství 3 × 3 × 3 */
const SOUSEDNI = (() => {
  const v = [0, 0, 0];
  for (let dz = -1; dz <= 1; dz++)
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) if (dz > 0 || (dz === 0 && (dy > 0 || (dy === 0 && dx > 0)))) v.push(dx, dy, dz);
  return Int32Array.from(v);
})();

/** Hash buňky mřížky; velikost tabulky je mocnina dvou, takže stačí maska místo dělení */
const hashBunky = (x: number, y: number, z: number, maska: number) => (Math.imul(x, 92837111) ^ Math.imul(y, 689287499) ^ Math.imul(z, 283923481)) & maska;

export class SimLatky implements RozhraniSim {
  readonly n: number;
  readonly pocet: number;
  readonly p: Float32Array;
  /** Rozteč sítě (m) */
  readonly roztec: number;
  /** Tloušťka vrstvy (m): o tolik od sebe leží přeložená látka */
  readonly tloustka: number;
  readonly podkroku: number;
  /** Klidová poloha bodů na rozprostřeném šátku (x, y za sebou) */
  readonly klid: Float32Array;
  private readonly mapaPinu = new Map<number, V3>();
  readonly piny: ReadonlyMap<number, V3> = this.mapaPinu;

  /** Poloha na začátku pod-kroku a rychlost */
  private readonly q: Float32Array;
  private readonly v: Float32Array;
  /** Převrácená hmotnost; 0 = bod drží (pin natvrdo nebo pod balíkem) */
  private readonly w: Float32Array;
  private readonly w0: number;
  private readonly hmotnostBodu: number;
  private readonly gi: Int16Array;
  private readonly gj: Int16Array;

  /** Vazby dvou bodů (dvojice, klidová délka, poddajnost): nejdřív úhlopříčky (smyk), tah naposled */
  private readonly va: Int32Array;
  private readonly vb: Int32Array;
  private readonly vl: Float32Array;
  private readonly valfa: Float32Array;
  private readonly oTah: number;
  /** Tahové vazby po obvodu látky (druhý průchod v každém pod-kroku) */
  private readonly vKraji: Int32Array;

  /** Trojúhelníky (pro odpor vzduchu) */
  private readonly troj: Int32Array;

  /* Piny: 0 = nic, 1 = natvrdo, 2 = měkce. Cíl chce volající, `do` je, kam pin dojde tento snímek */
  private readonly pinDruh: Uint8Array;
  private readonly pinAlfa: Float32Array;
  private readonly pinCil: Float64Array;
  private readonly pinOd: Float64Array;
  private readonly pinDo: Float64Array;
  private readonly pinSeznam: Int32Array;
  private readonly pinMisto: Int32Array;
  private pinPocet = 0;

  /** Přitlačení balíkem: 0 = ne, jinak index tělesa + 1 */
  private readonly tlak: Int16Array;
  /** Body pod balíky (pro dosah pinů natvrdo), znovu každý snímek */
  private readonly pevne: Int32Array;
  private pevnych = 0;

  /*
   * Kotvy (long range attachments, Kim, Chentanez a Müller 2012): každý bod
   * nesmí být od nejbližšího pevného bodu (pin natvrdo, látka pod balíkem)
   * dál, než je od něj na rozprostřené látce. Gauss–Seidel jinak protáhne
   * tah od ruky do látky jen o pár hran za pod-krok — látka by se u ruky
   * natáhla. Nejbližší kotva se hledá znovu, jen když se pevné body změní.
   */
  private readonly kotva: Int32Array;
  private readonly kotvaL: Float32Array;
  private readonly kotvaD: Float32Array;
  private kotvyPlati = false;
  private kotvenych = 0;

  /** Statické tření s kotvou (viz pult): leží bod, kde si to pamatuje, a smí se kotvy držet? */
  private readonly lezi: Uint8Array;
  private readonly kotvaPult: Float32Array;
  private lepit = true;
  /** Je vyžehlený přehyb (složený šátek)? */
  private prehnuto = false;
  /** Zmrazená látka se nehýbe (viz zmraz) */
  private zmrazeno = false;

  /* Srážky se sebou: prostorová mřížka (Müller) postavená jednou za snímek s rezervou na pohyb */
  private readonly velikostTabulky: number;
  /** Buňka mřížky každého bodu (při poslední stavbě) */
  private readonly bunkaX: Int32Array;
  private readonly bunkaY: Int32Array;
  private readonly bunkaZ: Int32Array;
  private readonly mStart: Int32Array;
  private readonly mBody: Int32Array;
  private readonly mKlic: Int32Array;
  private readonly videno: Int32Array;
  private dvojA: Int32Array;
  private dvojB: Int32Array;
  private dvojic = 0;
  private readonly pPriStavbe: Float32Array;
  /** Normály bodů ve dvojicích (počítají se v každém pod-kroku) a kdo ve dvojici je */
  private readonly nor: Float32Array;
  private readonly vDvojici: Uint8Array;
  /** Bod přímo v přehybu (normála neplatí) */
  private readonly zlom: Uint8Array;
  /** Krajový bod ve dvojici: směr ven z látky v její tečné rovině (vnitřní body 0) */
  private readonly ven: Float32Array;
  /** Bod se v minulém pod-kroku opřel o balík nebo o pult */
  private readonly opora: Uint8Array;
  /** Nad bodem nebo pod ním je jiná vrstva látky (dvojice s nesousedem) */
  private readonly vrstva: Uint8Array;
  private dosahMrizky = 0;
  /** Kolikrát se mřížka tento snímek stavěla znovu uprostřed */
  private prestaveb = 0;
  /** Body, které do mřížky nepatří (v jádru uzlu) */
  private readonly mimoMrizku: Uint8Array;
  private rezerva = 0;
  /** Kolik snímků po sobě by mřížce stačila mnohem menší rezerva */
  private klidMrizky = 0;
  /** Zóna bez srážek se sebou (uvnitř jádra uzlu, kde se látka stejně kříží pod sítí uzlu) */
  private zona: [number, number, number, number] | null = null;

  private telesa: TelesoVnitrni[] = [];
  private kandidati = new Int32Array(1024);

  private rychlostSnimku = 0;
  /** Poloha na začátku snímku — pohyb() měří, kam se látka za celý snímek posunula */
  private readonly pZacatek: Float32Array;
  private nahoda = 0x2545f491;

  /** Izometrický ohyb: čtveřice bodů, váha k a poddajnost každé šablony */
  private readonly iz: Int32Array;
  private readonly ik: Float32Array;
  private readonly ialfa: Float32Array;
  /** Poddajnost ohybu bez přehybu (prehyb() ji u čáry přehybu zvětší) */
  private readonly ialfa0: Float32Array;
  private readonly stlaceni: number;

  constructor(volby: { n: number; podkroku?: number; tuhost?: number; smyk?: number; stlaceni?: number }) {
    const n = Math.max(4, Math.round(volby.n));
    this.n = n;
    this.pocet = n * n;
    this.podkroku = Math.max(4, Math.round(volby.podkroku ?? podkrokuPro(n)));
    this.roztec = STRANA / (n - 1);
    this.tloustka = tloustkaVrstvy(n);
    const N = this.pocet;
    this.p = new Float32Array(N * 3);
    this.q = new Float32Array(N * 3);
    this.v = new Float32Array(N * 3);
    this.w = new Float32Array(N);
    this.hmotnostBodu = (PLOSNA_HMOTNOST * STRANA * STRANA) / N;
    this.w0 = 1 / this.hmotnostBodu;
    this.w.fill(this.w0);
    this.klid = new Float32Array(N * 2);
    this.gi = new Int16Array(N);
    this.gj = new Int16Array(N);
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        const k = j * n + i;
        const [x, y] = klidovaPoloha(i, j, n);
        this.klid[k * 2] = x;
        this.klid[k * 2 + 1] = y;
        this.gi[k] = i;
        this.gj[k] = j;
      }

    /* ——— Vazby ——— */
    const a: number[] = [];
    const b: number[] = [];
    const alfa: number[] = [];
    const id = (i: number, j: number) => j * n + i;
    const uvnitr = (i: number, j: number) => i >= 0 && j >= 0 && i < n && j < n;
    const smyk = volby.smyk ?? PODDAJNOST_SMYK;
    const pridej = (i1: number, j1: number, i2: number, j2: number, poddajnost: number) => {
      if (!uvnitr(i1, j1) || !uvnitr(i2, j2)) return;
      a.push(id(i1, j1));
      b.push(id(i2, j2));
      alfa.push(poddajnost);
    };
    /*
     * Ohyb (izometrický, Bergou a spol. 2006): přes každou vnitřní hranu
     * C = k·(x0 + x1 − x2 − x3), kde x0, x1 je hrana a x2, x3 protilehlé
     * vrcholy obou trojúhelníků. Na rovné látce je C = 0 a |C| roste s úhlem
     * přehybu lineárně, takže energie je kvadratická jako u skutečné tkaniny
     * a stejná na každé síti. Pro obě triangulace čtverečku (každá s váhou ½),
     * úhlopříčná šablona je pro obě stejná (zkroucení čtverečku), k = 2.
     */
    const iz: number[] = [];
    const ik: number[] = [];
    const ia: number[] = [];
    const B = volby.tuhost ?? TUHOST_OHYBU;
    const h2 = this.roztec * this.roztec;
    const sablona = (i0: number, j0: number, i1: number, j1: number, i2: number, j2: number, i3: number, j3: number, k: number, vaha: number) => {
      if (!uvnitr(i0, j0) || !uvnitr(i1, j1) || !uvnitr(i2, j2) || !uvnitr(i3, j3)) return;
      iz.push(id(i0, j0), id(i1, j1), id(i2, j2), id(i3, j3));
      ik.push(k);
      /* Energie (3B / 2A)·|C|², A = plocha obou trojúhelníků = h²; poddajnost α = A / (3B·váha) */
      ia.push(h2 / (3 * B * vaha));
    };
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        if (j >= 1 && j <= n - 2 && i <= n - 2) {
          sablona(i, j, i + 1, j, i + 1, j + 1, i, j - 1, 1, 0.5);
          sablona(i, j, i + 1, j, i, j + 1, i + 1, j - 1, 1, 0.5);
        }
        if (i >= 1 && i <= n - 2 && j <= n - 2) {
          sablona(i, j, i, j + 1, i + 1, j + 1, i - 1, j, 1, 0.5);
          sablona(i, j, i, j + 1, i + 1, j, i - 1, j + 1, 1, 0.5);
        }
        if (i <= n - 2 && j <= n - 2) sablona(i, j, i + 1, j + 1, i + 1, j, i, j + 1, 2, 1);
      }
    this.iz = Int32Array.from(iz);
    this.ik = Float32Array.from(ik);
    this.ialfa = Float32Array.from(ia);
    this.ialfa0 = Float32Array.from(ia);
    /*
     * Smyk po obou úhlopříčkách čtverečku, jen v tahu: při smyku se jedna
     * úhlopříčka vždycky prodlouží, takže smyk drží, ale přehyb látky
     * (úhlopříčka přes přehyb je tětiva, kratší) nebrzdí — ohyb má na
     * starosti jen izometrická vazba.
     */
    for (let j = 0; j < n - 1; j++)
      for (let i = 0; i < n - 1; i++) {
        pridej(i, j, i + 1, j + 1, smyk);
        pridej(i + 1, j, i, j + 1, smyk);
      }
    this.oTah = a.length;
    /* Tah po hranách sítě: v tahu poddajnost 0, ve stlačení `stlaceni` (výchozí také 0) */
    this.stlaceni = volby.stlaceni ?? PODDAJNOST_STLACENI;
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        pridej(i, j, i + 1, j, 0);
        pridej(i, j, i, j + 1, 0);
      }
    /* Hrany po obvodu látky: mají jen jednu stranu sousedů a tah se v nich srovnává nejpomaleji */
    const kraj: number[] = [];
    for (let c = this.oTah; c < a.length; c++) {
      const ia = a[c] % n;
      const ja = Math.floor(a[c] / n);
      const ib = b[c] % n;
      const jb = Math.floor(b[c] / n);
      if ((ja === jb && (ja === 0 || ja === n - 1)) || (ia === ib && (ia === 0 || ia === n - 1))) kraj.push(c);
    }
    this.vKraji = Int32Array.from(kraj);
    this.va = Int32Array.from(a);
    this.vb = Int32Array.from(b);
    this.valfa = Float32Array.from(alfa);
    this.vl = new Float32Array(a.length);
    for (let c = 0; c < a.length; c++) {
      const ka = a[c] * 2;
      const kb = b[c] * 2;
      this.vl[c] = Math.hypot(this.klid[kb] - this.klid[ka], this.klid[kb + 1] - this.klid[ka + 1]);
    }

    const t: number[] = [];
    for (let j = 0; j < n - 1; j++)
      for (let i = 0; i < n - 1; i++) {
        const k = j * n + i;
        t.push(k, k + 1, k + n + 1, k, k + n + 1, k + n);
      }
    this.troj = Int32Array.from(t);

    this.pinDruh = new Uint8Array(N);
    this.pinAlfa = new Float32Array(N);
    this.pinCil = new Float64Array(N * 3);
    this.pinOd = new Float64Array(N * 3);
    this.pinDo = new Float64Array(N * 3);
    this.pinSeznam = new Int32Array(N);
    this.pinMisto = new Int32Array(N).fill(-1);
    this.tlak = new Int16Array(N);
    this.pevne = new Int32Array(N);
    this.kotva = new Int32Array(N).fill(-1);
    this.kotvaL = new Float32Array(N);
    this.kotvaD = new Float32Array(N);
    this.pZacatek = new Float32Array(N * 3);
    this.lezi = new Uint8Array(N);
    this.kotvaPult = new Float32Array(N * 2);

    this.velikostTabulky = 1 << Math.ceil(Math.log2(2 * N));
    this.bunkaX = new Int32Array(N);
    this.bunkaY = new Int32Array(N);
    this.bunkaZ = new Int32Array(N);
    this.mStart = new Int32Array(this.velikostTabulky + 1);
    this.mBody = new Int32Array(N);
    this.mKlic = new Int32Array(N);
    this.videno = new Int32Array(N);
    this.dvojA = new Int32Array(N * 4);
    this.dvojB = new Int32Array(N * 4);
    this.pPriStavbe = new Float32Array(N * 3);
    this.nor = new Float32Array(N * 3);
    this.vDvojici = new Uint8Array(N);
    this.mimoMrizku = new Uint8Array(N);
    this.zlom = new Uint8Array(N);
    this.ven = new Float32Array(N * 3);
    this.opora = new Uint8Array(N);
    this.vrstva = new Uint8Array(N);

    this.rozprostri(false);
  }

  /* ═══ Stavy látky ═══ */

  /** Index bodu (i, j) */
  index(i: number, j: number) {
    return j * this.n + i;
  }

  private rand() {
    /* xorshift32 — vrásky mají vypadat pokaždé trochu jinak, ale test je musí umět zopakovat */
    let x = this.nahoda;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.nahoda = x >>> 0;
    return this.nahoda / 4294967296;
  }

  /** Všechny piny pryč, nic není přitlačené a rychlosti jsou nulové — látka začíná znovu */
  private vynuluj() {
    this.zmrazeno = false;
    this.pustVse();
    this.tlak.fill(0);
    this.w.fill(this.w0);
    this.v.fill(0);
    this.lezi.fill(0);
    for (const t of this.telesa) t.lezi = false;
    this.rychlostSnimku = 1;
    this.dosahMrizky = 0;
    this.kotvyPlati = false;
  }

  /**
   * Rozprostřený šátek. S vráskami je to šátek puštěný z ruky kousek nad
   * pultem: shrnutý do dvou tří širokých záhybů, dosedne během pár desetin
   * sekundy a záhyby v něm nechá tření (do klidu do tří až pěti sekund).
   * Piny se pustí a nic není přitlačené (balíky přitlačí znovu, až stojí).
   */
  rozprostri(vrasky: boolean): void {
    this.vynuluj();
    this.prehyb(false);
    const { p, klid } = this;
    if (!vrasky) {
      for (let k = 0; k < this.pocet; k++) {
        p[k * 3] = klid[k * 2];
        p[k * 3 + 1] = klid[k * 2 + 1];
        p[k * 3 + 2] = ODSTUP_PULT;
      }
      this.q.set(p);
      return;
    }
    /*
     * Látka puštěná z ruky je shrnutá: má o pár procent víc délky, než kolik
     * zabere na pultu, a to se na pultu nevyrovná — co dosedne, drží třením
     * (s kotvou, viz pult), a přebytek zůstane ve vlnách. Bez přebytku by se
     * každý tvar při dopadu rozložil do roviny. Proto se tvar staví přesně
     * bez natažení: dva až tři široké hřbety (profil se počítá po délce
     * látky, takže se nic nenatáhne) napříč osnovou nebo útkem — po šikmé by
     * je smyk tkaniny hned vyrovnal. Hřbet běží skoro přes celou látku, jen
     * se k okrajům pomalu snižuje, mění výšku a trochu se stáčí: hřbet, který
     * by se ztrácel rychle, se od konců rozepne jako zip. Látka se pustí pár
     * milimetrů nad pultem; z výšky by ji dopad hřbetů rozmačkal.
     */
    const smer = (this.rand() < 0.5 ? 1 : -1) * (Math.PI / 4) + (this.rand() - 0.5) * 0.08;
    const ux = Math.cos(smer);
    const uy = Math.sin(smer);
    const hrbety: number[][] = [];
    const pocetHrbetu = 2 + Math.floor(this.rand() * 2);
    for (let h = 0; h < pocetHrbetu; h++) {
      const poloha = (h + 0.5) / pocetHrbetu - 0.5 + (this.rand() - 0.5) * 0.1;
      /* poloha, výška, šířka, stočení, posun středu, fáze a vlnová délka změny výšky */
      /* Hřbety do ~2 cm: vyšší (dřív 3–3,8 cm) vypadaly na pultu jako srolovaný kraj, ne jako puštěný šátek */
      hrbety.push([poloha * 0.6, 0.016 + this.rand() * 0.005, 0.02 + this.rand() * 0.003, (this.rand() - 0.5) * 0.06, this.rand() - 0.5, this.rand() * 6.28, 4 + this.rand() * 4]);
    }
    /* Výška hřbetů v bodě látky (s napříč hřbety, t podél nich) */
    const vyskaV = (s: number, t: number) => {
      let z = 0;
      for (const [s0, a, sirka, stoceni, posun, faze, vlna] of hrbety) {
        const u = (s - s0 - stoceni * t * t) / sirka;
        const tt = t - posun * 0.15;
        const ubytek = Math.exp(-(tt * tt) / (2 * 0.4 * 0.4)) * (1 + 0.15 * Math.sin(t * vlna + faze));
        z += a * ubytek * Math.exp(-u * u);
      }
      return z;
    };
    for (let k = 0; k < this.pocet; k++) {
      const x = klid[k * 2];
      const y = klid[k * 2 + 1];
      const s = x * ux + y * uy;
      const t = -x * uy + y * ux;
      /* Vodorovná poloha X(s) = ∫₀ˢ √(ds² − dZ²): kolik z délky látky zbude do roviny */
      const kroku = Math.max(1, Math.ceil(Math.abs(s) / 0.004));
      const d = s / kroku;
      let X = 0;
      let z0 = vyskaV(0, t);
      for (let c = 1; c <= kroku; c++) {
        const z1 = vyskaV(c * d, t);
        X += Math.sign(d) * Math.sqrt(Math.max(0, d * d - (z1 - z0) * (z1 - z0)));
        z0 = z1;
      }
      p[k * 3] = X * ux - t * uy;
      p[k * 3 + 1] = X * uy + t * ux;
      p[k * 3 + 2] = ODSTUP_PULT + 0.005 + z0;
    }
    /* Zbytek nepřesnosti (hřbety se k okrajům mění) srovná tah */
    for (let it = 0; it < 100; it++) this.narovnej(it & 1);
    this.q.set(p);
  }

  /** Jedna obyčejná projekce tahu bez dynamiky (pro výchozí stav) */
  private narovnej(pozpatku: number) {
    const { p, va, vb, vl, oTah } = this;
    const delka = va.length - oTah;
    for (let c0 = 0; c0 < delka; c0++) {
      const c = pozpatku ? va.length - 1 - c0 : oTah + c0;
      const a = va[c] * 3;
      const b = vb[c] * 3;
      const dx = p[b] - p[a];
      const dy = p[b + 1] - p[a + 1];
      const dz = p[b + 2] - p[a + 2];
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d < 1e-9) continue;
      const s = (0.5 * (d - vl[c])) / d;
      p[a] += dx * s;
      p[a + 1] += dy * s;
      p[a + 2] += dz * s;
      p[b] -= dx * s;
      p[b + 1] -= dy * s;
      p[b + 2] -= dz * s;
    }
  }

  /** Okamžitě složený do trojúhelníku: zadní půlka leží přes přední o vrstvu výš, s vyžehleným přehybem */
  slozena(): void {
    this.vynuluj();
    this.prehyb(true);
    const { p, n } = this;
    const bod: V3 = [0, 0, 0];
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        const k = j * n + i;
        polohaSlozena(i, j, n, bod);
        p[k * 3] = bod[0];
        p[k * 3 + 1] = bod[1];
        p[k * 3 + 2] = bod[2];
      }
    this.q.set(p);
  }

  /**
   * Tělesa (balíky), o která se látka zastaví. Poloha se smí měnit za běhu —
   * čte se na začátku každého snímku a mezi snímky se pohyb rozdělí do
   * pod-kroků, ať padající balík látkou neproletí.
   */
  nastavTelesa(t: Teleso[]): void {
    const stara = new Map(this.telesa.map((x, i) => [x.id, { x, i }]));
    const nova: TelesoVnitrni[] = [];
    const preklad = new Int16Array(this.telesa.length + 1);
    for (const zdroj of t) {
      const s = stara.get(zdroj.id);
      if (s) {
        s.x.zdroj = zdroj;
        s.x.tvar = zabal(zdroj.tvar);
        preklad[s.i + 1] = nova.length + 1;
        nova.push(s.x);
        continue;
      }
      const a = new Float64Array([zdroj.poloha.x, zdroj.poloha.y, zdroj.poloha.z, zdroj.poloha.otoceni, zdroj.poloha.meritko]);
      nova.push({
        id: zdroj.id,
        zdroj,
        tvar: zabal(zdroj.tvar),
        a,
        b: Float64Array.from(a),
        ted: new Float64Array(6),
        minule: new Float64Array(6),
        lezi: false,
        kandOd: 0,
        kandDo: 0,
      });
    }
    /* Látka pod balíkem, který zmizel, se pustí; ostatním se přečísluje */
    for (let k = 0; k < this.pocet; k++) {
      const s = this.tlak[k];
      if (!s) continue;
      this.tlak[k] = preklad[s];
      if (!this.tlak[k]) {
        this.w[k] = this.pinDruh[k] === 1 ? 0 : this.w0;
        this.kotvyPlati = false;
      }
    }
    this.telesa = nova;
  }

  /**
   * Vyžehlený přehyb podél čáry levý–pravý cíp: ohyb přes ni je skoro
   * zadarmo. Složený šátek pak leží naplocho; bez něj by se přehyb jako
   * u nevyžehlené látky zvedl do oblouku. Rozložený šátek ho nemá.
   */
  prehyb(ano: boolean) {
    this.prehnuto = ano;
    const { iz, ialfa, ialfa0, gi, gj, n } = this;
    for (let c = 0; c < ialfa.length; c++) {
      let blizko = false;
      for (let q = 0; q < 4; q++) {
        const k = iz[c * 4 + q];
        if (Math.abs(gi[k] + gj[k] - (n - 1)) <= 2) blizko = true;
      }
      ialfa[c] = ano && blizko ? ialfa0[c] * PREHYB_MEKCI : ialfa0[c];
    }
  }

  /** Zóna bez srážek látky se sebou (koule), nebo null — choreografie ji dává do jádra uzlu */
  bezSrazek(stred: V3 | null, polomer = 0) {
    this.zona = stred ? [stred[0], stred[1], stred[2], polomer] : null;
    this.dosahMrizky = 0;
  }

  /**
   * Zmrazit látku: dál se nepočítá a pohyb() je 0, ať smyčka usne. Řešič
   * se v několika vrstvách (složený, zavázaný šátek) nikdy úplně neuklidní —
   * zbude chvění pod milimetr za snímek. Choreografie zmrazí látku, která se
   * skoro nehýbe; pin (ruka) nebo rozvlnění ji samy rozmrazí.
   */
  zmraz(ano: boolean) {
    this.zmrazeno = ano;
    if (ano) this.v.fill(0);
    this.rychlostSnimku = 0;
  }

  get zmrazena() {
    return this.zmrazeno;
  }

  /** Je bod přitlačený balíkem k pultu? */
  pritlaceny(k: number) {
    return this.tlak[k] > 0;
  }

  /* ═══ Piny ═══ */

  pripni(k: number, cil: V3, poddajnost = 0): void {
    this.pripniXYZ(k, cil[0], cil[1], cil[2], poddajnost);
  }

  /** Jako pripni(), jen bez pole (choreografie volá tisíckrát za snímek) */
  pripniXYZ(k: number, x: number, y: number, z: number, poddajnost = 0) {
    if (k < 0 || k >= this.pocet) return;
    if (this.zmrazeno) this.zmraz(false);
    const o = k * 3;
    if (!this.pinDruh[k]) {
      this.pinMisto[k] = this.pinPocet;
      this.pinSeznam[this.pinPocet++] = k;
      this.pinOd[o] = this.p[o];
      this.pinOd[o + 1] = this.p[o + 1];
      this.pinOd[o + 2] = this.p[o + 2];
      this.mapaPinu.set(k, [x, y, z]);
    } else {
      const m = this.mapaPinu.get(k)!;
      m[0] = x;
      m[1] = y;
      m[2] = z;
    }
    this.pinCil[o] = x;
    this.pinCil[o + 1] = y;
    this.pinCil[o + 2] = z;
    this.pinAlfa[k] = Math.max(0, poddajnost);
    const druh = poddajnost > 0 ? 2 : 1;
    /* Bod natvrdo se ze srážek se sebou vyřadí jen s druhým pevným — mřížku je pak potřeba postavit znovu; a je to kotva */
    if (druh !== this.pinDruh[k]) {
      this.dosahMrizky = 0;
      if (druh === 1 || this.pinDruh[k] === 1) this.kotvyPlati = false;
    }
    this.pinDruh[k] = druh;
    this.w[k] = druh === 1 || this.tlak[k] ? 0 : this.w0;
  }

  pust(k: number): void {
    if (k < 0 || k >= this.pocet || !this.pinDruh[k]) return;
    const misto = this.pinMisto[k];
    const posledni = this.pinSeznam[--this.pinPocet];
    this.pinSeznam[misto] = posledni;
    this.pinMisto[posledni] = misto;
    this.pinMisto[k] = -1;
    if (this.pinDruh[k] === 1) this.kotvyPlati = false;
    this.pinDruh[k] = 0;
    this.mapaPinu.delete(k);
    if (!this.tlak[k]) this.w[k] = this.w0;
    this.dosahMrizky = 0;
  }

  pustVse(): void {
    while (this.pinPocet) this.pust(this.pinSeznam[this.pinPocet - 1]);
  }

  /* ═══ Vnější popud ═══ */

  /**
   * Něco dopadlo nebo do látky ťukl prst: kolem (x, y) se zvedne vlna, která
   * běží od středu, a látka se trochu odhrne. Pod balíkem a v ruce nic.
   */
  rozvlni(x: number, y: number, r: number, sila: number): void {
    if (this.zmrazeno) this.zmraz(false);
    const { p, v, w } = this;
    const r0 = r * 0.7;
    const r1 = r * 3.4;
    for (let k = 0; k < this.pocet; k++) {
      if (w[k] === 0) continue;
      const o = k * 3;
      const dx = p[o] - x;
      const dy = p[o + 1] - y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < r0 || d > r1) continue;
      const u = 1 - (d - r0) / (r1 - r0);
      const f = sila * u * u;
      v[o + 2] += 0.42 * f * Math.cos(((d - r) / r) * 2.4);
      v[o] += (dx / d) * 0.16 * f;
      v[o + 1] += (dy / d) * 0.16 * f;
    }
    this.rychlostSnimku = Math.max(this.rychlostSnimku, 0.4 * sila);
  }

  pohyb(): number {
    return this.rychlostSnimku;
  }

  /* ═══ Krok ═══ */

  krok(dt: number): void {
    if (!(dt > 0)) return;
    if (this.zmrazeno) {
      this.rychlostSnimku = 0;
      return;
    }
    dt = Math.min(dt, 1 / 30);
    const S = this.podkroku;
    const h = dt / S;
    this.pZacatek.set(this.p);
    this.pripravTelesa(dt);
    if (!this.kotvyPlati) this.spocitejKotvy();
    this.pripravPiny(dt);
    this.odporVzduchu(dt);
    this.pripravMrizku(dt);
    for (let s = 0; s < S; s++) {
      const u = (s + 1) / S;
      this.polohyTeles(s / S, u);
      this.integruj(h, u);
      this.hlidejMrizku(s);
      this.mekkePiny(h, u);
      this.kotvy();
      this.vazby(h, s & 1);
      this.kraj();
      this.srazkySeSebou();
      this.opora.fill(0);
      this.srazkyTelesa();
      this.pult();
      this.rychlosti(h);
    }
    for (let c = 0; c < this.pinPocet; c++) {
      const o = this.pinSeznam[c] * 3;
      this.pinOd[o] = this.pinDo[o];
      this.pinOd[o + 1] = this.pinDo[o + 1];
      this.pinOd[o + 2] = this.pinDo[o + 2];
    }
    for (const t of this.telesa) t.a.set(t.b);
    /* Pohyb za celý snímek: kmitání uvnitř snímku (pod-kroky) se tím nepočítá */
    const { p, pZacatek, tlak } = this;
    let m = 0;
    for (let k = 0; k < this.pocet; k++) {
      if (tlak[k]) continue;
      const o = k * 3;
      const dx = p[o] - pZacatek[o];
      const dy = p[o + 1] - pZacatek[o + 1];
      const dz = p[o + 2] - pZacatek[o + 2];
      const d = dx * dx + dy * dy + dz * dz;
      if (d > m) m = d;
    }
    this.rychlostSnimku = Math.sqrt(m) / dt;
  }

  /**
   * Nejbližší kotva pro každý bod: dvouprůchodová transformace vzdálenosti
   * po mřížce, která nese index nejbližšího pevného bodu (vzdálenost se
   * počítá přesně v klidových souřadnicích). Lineární v počtu bodů.
   */
  private spocitejKotvy() {
    const { n, kotva, kotvaD, kotvaL, klid, pinDruh, tlak } = this;
    this.kotvyPlati = true;
    kotva.fill(-1);
    kotvaD.fill(Infinity);
    let pevnych = 0;
    for (let k = 0; k < this.pocet; k++)
      if (pinDruh[k] === 1 || tlak[k]) {
        kotva[k] = k;
        kotvaD[k] = 0;
        pevnych++;
      }
    this.kotvenych = 0;
    if (!pevnych) return;
    const zkus = (k: number, i: number, j: number) => {
      if (i < 0 || j < 0 || i >= n || j >= n) return;
      const a = kotva[j * n + i];
      if (a < 0) return;
      const dx = klid[k * 2] - klid[a * 2];
      const dy = klid[k * 2 + 1] - klid[a * 2 + 1];
      const d = dx * dx + dy * dy;
      if (d < kotvaD[k]) {
        kotvaD[k] = d;
        kotva[k] = a;
      }
    };
    for (let opakovani = 0; opakovani < 2; opakovani++) {
      for (let j = 0; j < n; j++)
        for (let i = 0; i < n; i++) {
          const k = j * n + i;
          zkus(k, i - 1, j);
          zkus(k, i - 1, j - 1);
          zkus(k, i, j - 1);
          zkus(k, i + 1, j - 1);
        }
      for (let j = n - 1; j >= 0; j--)
        for (let i = n - 1; i >= 0; i--) {
          const k = j * n + i;
          zkus(k, i + 1, j);
          zkus(k, i + 1, j + 1);
          zkus(k, i, j + 1);
          zkus(k, i - 1, j + 1);
        }
    }
    for (let k = 0; k < this.pocet; k++) {
      kotvaL[k] = Math.sqrt(kotvaD[k]) * 1.01;
      if (kotva[k] >= 0 && kotva[k] !== k) this.kotvenych++;
    }
  }

  /** Žádný bod nesmí být od své kotvy dál než na rozprostřené látce */
  private kotvy() {
    if (!this.kotvenych) return;
    const { p, w, kotva, kotvaL } = this;
    for (let k = 0; k < this.pocet; k++) {
      const a = kotva[k];
      if (a < 0 || a === k || w[k] === 0) continue;
      const o = k * 3;
      const oa = a * 3;
      const dx = p[o] - p[oa];
      const dy = p[o + 1] - p[oa + 1];
      const dz = p[o + 2] - p[oa + 2];
      const d2 = dx * dx + dy * dy + dz * dz;
      const L = kotvaL[k];
      if (d2 <= L * L) continue;
      const s = L / Math.sqrt(d2);
      p[o] = p[oa] + dx * s;
      p[o + 1] = p[oa + 1] + dy * s;
      p[o + 2] = p[oa + 2] + dz * s;
    }
  }

  /** Balíky: poloha pro tento snímek, kdo stojí a přitlačuje, a které body se ho můžou dotknout */
  private pripravTelesa(dt: number) {
    const { p, w, tlak } = this;
    const posun = (RYCHLOST_DIL * this.roztec * this.podkroku) / dt;
    let kand = 0;
    for (let bi = 0; bi < this.telesa.length; bi++) {
      const t = this.telesa[bi];
      const pl = t.zdroj.poloha;
      t.b[0] = pl.x;
      t.b[1] = pl.y;
      t.b[2] = pl.z;
      t.b[3] = pl.otoceni;
      t.b[4] = pl.meritko;
      const lezi = t.zdroj.pritlaci && t.b[2] <= STOJI;
      if (!lezi && t.lezi) {
        for (let k = 0; k < this.pocet; k++)
          if (tlak[k] === bi + 1) {
            tlak[k] = 0;
            w[k] = this.pinDruh[k] === 1 ? 0 : this.w0;
          }
        this.kotvyPlati = false;
      }
      /* Obalová koule přes polohu na začátku i na konci snímku */
      const ax = t.a[0];
      const ay = t.a[1];
      const az = t.a[2] + t.tvar.obalZ * t.a[4];
      const bx = t.b[0];
      const by = t.b[1];
      const bz = t.b[2] + t.tvar.obalZ * t.b[4];
      const cx = (ax + bx) / 2;
      const cy = (ay + by) / 2;
      const cz = (az + bz) / 2;
      const R =
        Math.hypot(bx - ax, by - ay, bz - az) / 2 +
        t.tvar.obalR * Math.max(t.a[4], t.b[4]) +
        ODSTUP_TELESO +
        posun * dt +
        this.tloustka;
      t.kandOd = kand;
      for (let k = 0; k < this.pocet; k++) {
        const o = k * 3;
        const dx = p[o] - cx;
        const dy = p[o + 1] - cy;
        const dz = p[o + 2] - cz;
        if (dx * dx + dy * dy + dz * dz > R * R) continue;
        if (kand >= this.kandidati.length) {
          const vetsi = new Int32Array(this.kandidati.length * 2);
          vetsi.set(this.kandidati);
          this.kandidati = vetsi;
        }
        this.kandidati[kand++] = k;
      }
      t.kandDo = kand;
      if (lezi && !t.lezi) this.pritlac(bi);
      t.lezi = lezi;
    }
    /* Pevné body pro dosah pinů natvrdo */
    this.pevnych = 0;
    for (let k = 0; k < this.pocet; k++) if (tlak[k]) this.pevne[this.pevnych++] = k;
  }

  /**
   * Balík dosedl: látka pod jeho dnem (i přeložená) se přitiskne k pultu
   * a drží. Přitlačí se i proužek těsně za okrajem dna, kam by srážka
   * s balíkem jinak tlačila — volný soused přitlačeného bodu by se tam
   * natáhl (pod zaobleným dnem leží látka na pultu, ne v balíku).
   */
  private pritlac(bi: number) {
    const t = this.telesa[bi];
    const { p, q, v, w, tlak } = this;
    const [x, y, z, rot, m] = t.b;
    const cs = Math.cos(rot);
    const sn = Math.sin(rot);
    const im = 1 / m;
    const zDna = ODSTUP_PULT * im;
    for (let c = t.kandOd; c < t.kandDo; c++) {
      const k = this.kandidati[c];
      const o = k * 3;
      if (tlak[k] || p[o + 2] > z + ODSTUP_PULT + 2.5 * this.tloustka) continue;
      const dx = p[o] - x;
      const dy = p[o + 1] - y;
      const d = sdfZabaleny(t.tvar, (cs * dx + sn * dy) * im, (-sn * dx + cs * dy) * im, zDna) * m;
      if (d > ODSTUP_TELESO + 0.001) continue;
      this.kotvyPlati = false;
      tlak[k] = bi + 1;
      w[k] = 0;
      p[o + 2] = q[o + 2] = ODSTUP_PULT;
      q[o] = p[o];
      q[o + 1] = p[o + 1];
      v[o] = v[o + 1] = v[o + 2] = 0;
    }
  }

  /** Poloha balíků v pod-kroku: lineárně mezi začátkem a koncem snímku */
  private polohyTeles(u0: number, u1: number) {
    for (let i = 0; i < this.telesa.length; i++) {
      const t = this.telesa[i];
      SimLatky.mezipoloha(t.minule, t.a, t.b, u0);
      SimLatky.mezipoloha(t.ted, t.a, t.b, u1);
    }
  }

  /** Poloha mezi a a b (x, y, z, otočení, měřítko) do cil (x, y, z, cos, sin, měřítko) */
  private static mezipoloha(cil: Float64Array, a: Float64Array, b: Float64Array, u: number) {
    cil[0] = a[0] + (b[0] - a[0]) * u;
    cil[1] = a[1] + (b[1] - a[1]) * u;
    cil[2] = a[2] + (b[2] - a[2]) * u;
    const rot = a[3] + (b[3] - a[3]) * u;
    cil[3] = Math.cos(rot);
    cil[4] = Math.sin(rot);
    cil[5] = a[4] + (b[4] - a[4]) * u;
  }

  /**
   * Piny na tento snímek: cíl se posune nejvýš rychlostí, kterou látka
   * stačí sledovat, a pin natvrdo nedojde dál, než kam ho pustí body pod
   * balíky (a ostatní piny natvrdo) — látka mezi nimi se nenatáhne, ruka
   * se o napnutou látku zastaví.
   */
  private pripravPiny(dt: number) {
    const { pinOd, pinDo, pinCil, pinDruh, klid, p } = this;
    const max = 2.2 * dt;
    let tvrdych = 0;
    for (let c = 0; c < this.pinPocet; c++) {
      const k = this.pinSeznam[c];
      const o = k * 3;
      const dx = pinCil[o] - pinOd[o];
      const dy = pinCil[o + 1] - pinOd[o + 1];
      const dz = pinCil[o + 2] - pinOd[o + 2];
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const s = d > max ? max / d : 1;
      pinDo[o] = pinOd[o] + dx * s;
      pinDo[o + 1] = pinOd[o + 1] + dy * s;
      pinDo[o + 2] = pinOd[o + 2] + dz * s;
      if (pinDruh[k] === 1 && !this.tlak[k]) tvrdych++;
    }
    /* Dokud něco tahá natvrdo (ruka, cíp), kotvy tření nedrží — látka se táhne podle Coulomba; složená je nepotřebuje */
    this.lepit = tvrdych === 0 && !this.prehnuto;
    if (!tvrdych || (!this.pevnych && tvrdych < 2)) return;
    /* Dosah: proti bodům pod balíky vždy, proti ostatním pinům natvrdo, jen když jich je pár (ruce, cípy) */
    const iPiny = tvrdych <= 8;
    for (let c = 0; c < this.pinPocet; c++) {
      const k = this.pinSeznam[c];
      if (pinDruh[k] !== 1 || this.tlak[k]) continue;
      const o = k * 3;
      const kx = klid[k * 2];
      const ky = klid[k * 2 + 1];
      for (let pruchod = 0; pruchod < 3; pruchod++) {
        let zmena = false;
        for (let f = 0; f < this.pevnych; f++) {
          const a = this.pevne[f];
          if (SimLatky.omezDosah(pinDo, o, p[a * 3], p[a * 3 + 1], p[a * 3 + 2], 1.004 * Math.hypot(klid[a * 2] - kx, klid[a * 2 + 1] - ky))) zmena = true;
        }
        if (iPiny)
          for (let c2 = 0; c2 < this.pinPocet; c2++) {
            const a = this.pinSeznam[c2];
            if (a === k || pinDruh[a] !== 1 || this.tlak[a]) continue;
            if (SimLatky.omezDosah(pinDo, o, pinDo[a * 3], pinDo[a * 3 + 1], pinDo[a * 3 + 2], 1.004 * Math.hypot(klid[a * 2] - kx, klid[a * 2 + 1] - ky))) zmena = true;
          }
        if (!zmena) break;
      }
    }
  }

  /** Bod v poli `bod` (od indexu o) přitáhne do koule o poloměru `delka` kolem (ox, oy, oz); vrací, jestli se hnul */
  private static omezDosah(bod: Float64Array, o: number, ox: number, oy: number, oz: number, delka: number) {
    const ex = bod[o] - ox;
    const ey = bod[o + 1] - oy;
    const ez = bod[o + 2] - oz;
    const e = Math.sqrt(ex * ex + ey * ey + ez * ez);
    if (e <= delka) return false;
    const s = delka / e;
    bod[o] = ox + ex * s;
    bod[o + 1] = oy + ey * s;
    bod[o + 2] = oz + ez * s;
    return true;
  }

  /**
   * Odpor vzduchu po trojúhelnících, jednou za snímek: kolmo na plochu
   * kvadraticky (tvarový odpor — látka plachtí), podél slabě (tření vzduchu).
   */
  private odporVzduchu(dt: number) {
    const { p, v, w, troj } = this;
    const kKolmo = (0.5 * VZDUCH * ODPOR_KOLMO * dt) / (3 * this.hmotnostBodu);
    const kPodel = (ODPOR_PODEL * dt) / (3 * this.hmotnostBodu);
    for (let c = 0; c < troj.length; c += 3) {
      const a = troj[c] * 3;
      const b = troj[c + 1] * 3;
      const d = troj[c + 2] * 3;
      const e1x = p[b] - p[a];
      const e1y = p[b + 1] - p[a + 1];
      const e1z = p[b + 2] - p[a + 2];
      const e2x = p[d] - p[a];
      const e2y = p[d + 1] - p[a + 1];
      const e2z = p[d + 2] - p[a + 2];
      let nx = e1y * e2z - e1z * e2y;
      let ny = e1z * e2x - e1x * e2z;
      let nz = e1x * e2y - e1y * e2x;
      const dvaA = Math.sqrt(nx * nx + ny * ny + nz * nz);
      if (dvaA < 1e-12) continue;
      nx /= dvaA;
      ny /= dvaA;
      nz /= dvaA;
      const plocha = dvaA / 2;
      const vx = (v[a] + v[b] + v[d]) / 3;
      const vy = (v[a + 1] + v[b + 1] + v[d + 1]) / 3;
      const vz = (v[a + 2] + v[b + 2] + v[d + 2]) / 3;
      const vn = vx * nx + vy * ny + vz * nz;
      /* Nejvýš šestina kolmé rychlosti na trojúhelník — bod jich má kolem sebe šest, nepřetočí se */
      const fn = Math.min(kKolmo * plocha * Math.abs(vn), 1 / 6) * vn;
      const ft = Math.min(kPodel * plocha, 1 / 6);
      const tx = vx - vn * nx;
      const ty = vy - vn * ny;
      const tz = vz - vn * nz;
      const ox = -(fn * nx + ft * tx);
      const oy = -(fn * ny + ft * ty);
      const oz = -(fn * nz + ft * tz);
      if (w[troj[c]] > 0) {
        v[a] += ox;
        v[a + 1] += oy;
        v[a + 2] += oz;
      }
      if (w[troj[c + 1]] > 0) {
        v[b] += ox;
        v[b + 1] += oy;
        v[b + 2] += oz;
      }
      if (w[troj[c + 2]] > 0) {
        v[d] += ox;
        v[d + 1] += oy;
        v[d + 2] += oz;
      }
    }
  }

  /** Pohyb bez vazeb: gravitace, útlum, omezení rychlosti; piny natvrdo jdou po své dráze */
  private integruj(h: number, u: number) {
    const { p, q, v, w, pinDruh, pinOd, pinDo } = this;
    const tlum = 1 - UTLUM * h;
    const gh = G * h;
    const vmax = Math.min(RYCHLOST_DIL * this.roztec, RYCHLOST_TLOUSTKY * this.tloustka) / h;
    const vmax2 = vmax * vmax;
    for (let k = 0; k < this.pocet; k++) {
      const o = k * 3;
      q[o] = p[o];
      q[o + 1] = p[o + 1];
      q[o + 2] = p[o + 2];
      if (w[k] === 0) {
        if (pinDruh[k] === 1 && !this.tlak[k]) {
          p[o] = pinOd[o] + (pinDo[o] - pinOd[o]) * u;
          p[o + 1] = pinOd[o + 1] + (pinDo[o + 1] - pinOd[o + 1]) * u;
          p[o + 2] = pinOd[o + 2] + (pinDo[o + 2] - pinOd[o + 2]) * u;
        }
        continue;
      }
      let vx = v[o] * tlum;
      let vy = v[o + 1] * tlum;
      let vz = (v[o + 2] + gh) * tlum;
      const v2 = vx * vx + vy * vy + vz * vz;
      if (v2 > vmax2) {
        const s = vmax / Math.sqrt(v2);
        vx *= s;
        vy *= s;
        vz *= s;
      }
      p[o] += vx * h;
      p[o + 1] += vy * h;
      p[o + 2] += vz * h;
    }
  }

  /** Měkké piny: XPBD vazba bod–cíl s poddajností (pružina, kterou ruka přitahuje) */
  private mekkePiny(h: number, u: number) {
    const { p, w, pinOd, pinDo } = this;
    const ih2 = 1 / (h * h);
    for (let c = 0; c < this.pinPocet; c++) {
      const k = this.pinSeznam[c];
      if (this.pinDruh[k] !== 2 || w[k] === 0) continue;
      const o = k * 3;
      const f = w[k] / (w[k] + this.pinAlfa[k] * ih2);
      p[o] += (pinOd[o] + (pinDo[o] - pinOd[o]) * u - p[o]) * f;
      p[o + 1] += (pinOd[o + 1] + (pinDo[o + 1] - pinOd[o + 1]) * u - p[o + 1]) * f;
      p[o + 2] += (pinOd[o + 2] + (pinDo[o + 2] - pinOd[o + 2]) * u - p[o + 2]) * f;
    }
  }

  /**
   * Všechny vazby jednou (Gauss–Seidel). Tah jde naposled, ať má poslední
   * slovo, a střídavě popředu a pozpátku, ať se látka netáhne jedním směrem.
   */
  private vazby(h: number, pozpatku: number) {
    const { p, w, va, vb, vl, valfa } = this;
    const ih2 = 1 / (h * h);
    const pocet = va.length;
    const oTah = this.oTah;
    /* Izometrický ohyb: lineární vazba čtyř bodů, gradient je stálý */
    const { iz, ik, ialfa } = this;
    for (let c = 0; c < ik.length; c++) {
      const o = c * 4;
      const k0 = iz[o];
      const k1 = iz[o + 1];
      const k2 = iz[o + 2];
      const k3 = iz[o + 3];
      const w0 = w[k0];
      const w1 = w[k1];
      const w2 = w[k2];
      const w3 = w[k3];
      const ws = w0 + w1 + w2 + w3;
      if (ws === 0) continue;
      const kk = ik[c];
      const a = k0 * 3;
      const b = k1 * 3;
      const d = k2 * 3;
      const e = k3 * 3;
      const cx = kk * (p[a] + p[b] - p[d] - p[e]);
      const cy = kk * (p[a + 1] + p[b + 1] - p[d + 1] - p[e + 1]);
      const cz = kk * (p[a + 2] + p[b + 2] - p[d + 2] - p[e + 2]);
      const s = kk / (kk * kk * ws + ialfa[c] * ih2);
      p[a] -= w0 * cx * s;
      p[a + 1] -= w0 * cy * s;
      p[a + 2] -= w0 * cz * s;
      p[b] -= w1 * cx * s;
      p[b + 1] -= w1 * cy * s;
      p[b + 2] -= w1 * cz * s;
      p[d] += w2 * cx * s;
      p[d + 1] += w2 * cy * s;
      p[d + 2] += w2 * cz * s;
      p[e] += w3 * cx * s;
      p[e + 1] += w3 * cy * s;
      p[e + 2] += w3 * cz * s;
    }
    /* Smyk: úhlopříčky jen v tahu */
    for (let c = 0; c < oTah; c++) {
      const ka = va[c];
      const kb = vb[c];
      const wa = w[ka];
      const wb = w[kb];
      const ws = wa + wb;
      if (ws === 0) continue;
      const a = ka * 3;
      const b = kb * 3;
      const dx = p[b] - p[a];
      const dy = p[b + 1] - p[a + 1];
      const dz = p[b + 2] - p[a + 2];
      const d2 = dx * dx + dy * dy + dz * dz;
      const L = vl[c];
      if (d2 <= L * L) continue;
      const d = Math.sqrt(d2);
      const s = (d - L) / ((ws + valfa[c] * ih2) * d);
      p[a] += dx * s * wa;
      p[a + 1] += dy * s * wa;
      p[a + 2] += dz * s * wa;
      p[b] -= dx * s * wb;
      p[b + 1] -= dy * s * wb;
      p[b + 2] -= dz * s * wb;
    }
    /* Tah: v tahu natvrdo, ve stlačení s poddajností `stlaceni` */
    const delka = pocet - oTah;
    const aStl = this.stlaceni * ih2;
    for (let c0 = 0; c0 < delka; c0++) {
      const c = pozpatku ? pocet - 1 - c0 : oTah + c0;
      const ka = va[c];
      const kb = vb[c];
      const wa = w[ka];
      const wb = w[kb];
      const ws = wa + wb;
      if (ws === 0) continue;
      const a = ka * 3;
      const b = kb * 3;
      const dx = p[b] - p[a];
      const dy = p[b + 1] - p[a + 1];
      const dz = p[b + 2] - p[a + 2];
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d < 1e-9) continue;
      const C = d - vl[c];
      const s = C / ((C < 0 ? ws + aStl : ws) * d);
      p[a] += dx * s * wa;
      p[a + 1] += dy * s * wa;
      p[a + 2] += dz * s * wa;
      p[b] -= dx * s * wb;
      p[b + 1] -= dy * s * wb;
      p[b + 2] -= dz * s * wb;
    }
  }

  /** Druhý průchod tahu po obvodu látky: tam se šátek za ruku natahuje nejvíc (jen 188 hran při N = 48) */
  private kraj() {
    const { p, w, va, vb, vl, vKraji } = this;
    for (let c0 = 0; c0 < vKraji.length; c0++) {
      const c = vKraji[c0];
      const ka = va[c];
      const kb = vb[c];
      const wa = w[ka];
      const wb = w[kb];
      const ws = wa + wb;
      if (ws === 0) continue;
      const a = ka * 3;
      const b = kb * 3;
      const dx = p[b] - p[a];
      const dy = p[b + 1] - p[a + 1];
      const dz = p[b + 2] - p[a + 2];
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d <= vl[c]) continue;
      const s = (d - vl[c]) / (ws * d);
      p[a] += dx * s * wa;
      p[a + 1] += dy * s * wa;
      p[a + 2] += dz * s * wa;
      p[b] -= dx * s * wb;
      p[b + 1] -= dy * s * wb;
      p[b + 2] -= dz * s * wb;
    }
  }

  /* ——— Srážky látky se sebou ——— */

  /*
   * Bod proti ploše sousední vrstvy. Srážka bod proti bodu by potřebovala
   * tloušťku aspoň 0,7 rozteče (jinak bod proklouzne středem čtverečku) —
   * přeložená látka by pak ležela centimetr nad sebou. Tady se bod drží
   * `tloustka` od tečné roviny nejbližšího bodu druhé vrstvy (rovina mezeru
   * mezi body zakryje), a to z té strany, na které byl na začátku pod-kroku:
   * kdo by vrstvou za pod-krok prolétl, vrátí se zpátky. Dvojice kandidátů
   * se hledají v prostorové mřížce (Müller) jednou za snímek s rezervou na
   * pohyb; přímí sousedé v síti se nesrážejí, ty drží vazby.
   */

  /** Mřížka na snímek: dosah pokryje bod nad středem čtverečku druhé vrstvy a rezervu na pohyb */
  private pripravMrizku(dt: number) {
    let rezerva = Math.min(0.8 * this.roztec, Math.max(0.002, 2.5 * this.rychlostSnimku * dt + 0.001));
    /* Musela-li se mřížka minulý snímek stavět znovu uprostřed, dostane víc rezervy */
    if (this.prestaveb) rezerva = Math.min(0.8 * this.roztec, Math.max(rezerva, 1.6 * this.rezerva));
    this.prestaveb = 0;
    if (this.dosahMrizky > 0 && rezerva <= this.rezerva && this.maxPosun() * 2 < this.rezerva * 0.5) {
      /*
       * Mřížka z prudkého pohybu (nebo z prvního snímku po skoku do nového
       * stavu) má velkou rezervu a s ní dvakrát víc dvojic, než je třeba —
       * po deseti klidných snímcích se postaví znovu s menší.
       */
      this.klidMrizky = rezerva < 0.4 * this.rezerva ? this.klidMrizky + 1 : 0;
      if (this.klidMrizky < 10) return;
    }
    this.klidMrizky = 0;
    this.rezerva = rezerva;
    this.postavMrizku();
  }

  /** Největší posun od stavby mřížky (body v jádru uzlu se nesrážejí, ty se nepočítají) */
  private maxPosun() {
    const { p, pPriStavbe, mimoMrizku } = this;
    let m = 0;
    for (let k = 0; k < this.pocet; k++) {
      if (mimoMrizku[k]) continue;
      const o = k * 3;
      const dx = p[o] - pPriStavbe[o];
      const dy = p[o + 1] - pPriStavbe[o + 1];
      const dz = p[o + 2] - pPriStavbe[o + 2];
      const d = dx * dx + dy * dy + dz * dz;
      if (d > m) m = d;
    }
    return Math.sqrt(m);
  }

  /**
   * V pod-kroku (každý druhý): kdyby se něco pohnulo víc, než unese
   * rezerva, mřížka se postaví znovu — nejvýš třikrát za snímek, a příští
   * snímek pak dostane větší rezervu. (Stavba stojí přes milisekundu; kmitání
   * uvnitř snímku by ji jinak spouštělo v každém pod-kroku.)
   */
  private hlidejMrizku(s: number) {
    if (this.prestaveb >= 3 || s % 2 !== 1) return;
    if (this.maxPosun() > 0.75 * this.rezerva) {
      this.prestaveb++;
      this.postavMrizku();
    }
  }

  private postavMrizku() {
    const { p, w, gi, gj, mStart, mBody, mKlic, videno, vDvojici } = this;
    const dosah = Math.sqrt(this.tloustka * this.tloustka + (0.75 * this.roztec) ** 2) + this.rezerva;
    this.dosahMrizky = dosah;
    const inv = 1 / dosah;
    const T = this.velikostTabulky;
    const maska = T - 1;
    const { mimoMrizku, bunkaX, bunkaY, bunkaZ } = this;
    const zona = this.zona;
    mStart.fill(0);
    for (let k = 0; k < this.pocet; k++) {
      const o = k * 3;
      let mimo = 0;
      if (zona) {
        const dx = p[o] - zona[0];
        const dy = p[o + 1] - zona[1];
        const dz = p[o + 2] - zona[2];
        if (dx * dx + dy * dy + dz * dz < zona[3] * zona[3]) mimo = 1;
      }
      mimoMrizku[k] = mimo;
      if (mimo) {
        mKlic[k] = -1;
        continue;
      }
      const xi = Math.floor(p[o] * inv);
      const yi = Math.floor(p[o + 1] * inv);
      const zi = Math.floor(p[o + 2] * inv);
      bunkaX[k] = xi;
      bunkaY[k] = yi;
      bunkaZ[k] = zi;
      const h = hashBunky(xi, yi, zi, maska);
      mKlic[k] = h;
      mStart[h]++;
    }
    let s = 0;
    for (let i = 0; i < T; i++) {
      s += mStart[i];
      mStart[i] = s;
    }
    mStart[T] = s;
    for (let k = 0; k < this.pocet; k++) {
      const h = mKlic[k];
      if (h < 0) continue;
      mStart[h]--;
      mBody[mStart[h]] = k;
    }
    const d2max = dosah * dosah;
    videno.fill(-1);
    vDvojici.fill(0);
    this.vrstva.fill(0);
    let pocet = 0;
    for (let a = 0; a < this.pocet; a++) {
      const o = a * 3;
      if (mimoMrizku[a]) continue;
      const xi = bunkaX[a];
      const yi = bunkaY[a];
      const zi = bunkaZ[a];
      const ia = gi[a];
      const ja = gj[a];
      /* Polovina sousedství: vlastní buňka (jen b > a) a 13 buněk „dopředu“ — každá dvojice buněk jednou */
      for (let c = 0; c < SOUSEDNI.length; c += 3) {
        const vlastni = c === 0;
        const h = hashBunky(xi + SOUSEDNI[c], yi + SOUSEDNI[c + 1], zi + SOUSEDNI[c + 2], maska);
        for (let e = mStart[h]; e < mStart[h + 1]; e++) {
          const b = mBody[e];
          if (b === a || (vlastni && b < a) || videno[b] === a) continue;
          videno[b] = a;
          const di = gi[b] - ia;
          const dj = gj[b] - ja;
          /* Přímí sousedé (sdílí hranu) ne; úhlopříční jen ve čtverečku přeloženém po úhlopříčce — tam leží nad sebou */
          const soused = di >= -1 && di <= 1 && dj >= -1 && dj <= 1;
          if (soused && (di === 0 || dj === 0)) continue;
          if (w[a] === 0 && w[b] === 0) continue;
          const ob = b * 3;
          const ex = p[ob] - p[o];
          const ey = p[ob + 1] - p[o + 1];
          const ez = p[ob + 2] - p[o + 2];
          const e2 = ex * ex + ey * ey + ez * ez;
          if (e2 > d2max || (soused && e2 > 0.5 * this.roztec * this.roztec)) continue;
          if (pocet >= this.dvojA.length) {
            const a2 = new Int32Array(this.dvojA.length * 2);
            const b2 = new Int32Array(this.dvojA.length * 2);
            a2.set(this.dvojA);
            b2.set(this.dvojB);
            this.dvojA = a2;
            this.dvojB = b2;
          }
          this.dvojA[pocet] = a;
          this.dvojB[pocet] = b;
          vDvojici[a] = 1;
          vDvojici[b] = 1;
          if (!soused) {
            this.vrstva[a] = 1;
            this.vrstva[b] = 1;
          }
          pocet++;
        }
      }
    }
    this.dvojic = pocet;
    /* Kotva tření nedrží ani o bod vedle vrstvy — na rozhraní by kotvený bod škubal sousedy */
    const { vrstva, n } = this;
    for (let k = 0; k < this.pocet; k++) {
      if (vrstva[k] !== 1) continue;
      const i = gi[k];
      const j = gj[k];
      for (let dj = -1; dj <= 1; dj++)
        for (let di = -1; di <= 1; di++) {
          const ii = i + di;
          const jj = j + dj;
          if (ii >= 0 && jj >= 0 && ii < n && jj < n && !vrstva[jj * n + ii]) vrstva[jj * n + ii] = 2;
        }
    }
    this.pPriStavbe.set(p);
  }

  /**
   * Normály bodů, které jsou v nějaké dvojici (z rozdílů sousedů v síti).
   * Bod přímo v přehybu má sousedy v obou vrstvách a jeho normála nic
   * neznamená — pozná se tak, že rozdíl dopředu a dozadu míří proti sobě;
   * takový bod se označí jako zlom (dvojice pak vezme normálu druhého bodu).
   * Krajový bod si navíc spočítá směr ven z látky (viz dvojiceVrstev).
   */
  private normaly() {
    const { p, n, nor, vDvojici, zlom, ven } = this;
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        const k = j * n + i;
        if (!vDvojici[k]) continue;
        const o = k * 3;
        const a = (j * n + (i < n - 1 ? i + 1 : i)) * 3;
        const b = (j * n + (i > 0 ? i - 1 : i)) * 3;
        const c = ((j < n - 1 ? j + 1 : j) * n + i) * 3;
        const d = ((j > 0 ? j - 1 : j) * n + i) * 3;
        const ux = p[a] - p[b];
        const uy = p[a + 1] - p[b + 1];
        const uz = p[a + 2] - p[b + 2];
        const vx = p[c] - p[d];
        const vy = p[c + 1] - p[d + 1];
        const vz = p[c + 2] - p[d + 2];
        const nx = uy * vz - uz * vy;
        const ny = uz * vx - ux * vz;
        const nz = ux * vy - uy * vx;
        const l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
        nor[o] = nx / l;
        nor[o + 1] = ny / l;
        nor[o + 2] = nz / l;
        /* Zlom: dopředu a dozadu (po i nebo po j) proti sobě */
        let z = 0;
        if (i > 0 && i < n - 1) {
          const t = (p[a] - p[o]) * (p[o] - p[b]) + (p[a + 1] - p[o + 1]) * (p[o + 1] - p[b + 1]) + (p[a + 2] - p[o + 2]) * (p[o + 2] - p[b + 2]);
          if (t < 0) z = 1;
        }
        if (j > 0 && j < n - 1) {
          const t = (p[c] - p[o]) * (p[o] - p[d]) + (p[c + 1] - p[o + 1]) * (p[o + 1] - p[d + 1]) + (p[c + 2] - p[o + 2]) * (p[o + 2] - p[d + 2]);
          if (t < 0) z = 1;
        }
        zlom[k] = z;
        if (i > 0 && j > 0 && i < n - 1 && j < n - 1) continue;
        /* Směr ven: od souseda uvnitř látky (v cípu součet obou), sražený do tečné roviny */
        const s1 = j === 0 ? c : j === n - 1 ? d : o;
        const s2 = i === 0 ? a : i === n - 1 ? b : o;
        let ox = 2 * p[o] - p[s1] - p[s2];
        let oy = 2 * p[o + 1] - p[s1 + 1] - p[s2 + 1];
        let oz = 2 * p[o + 2] - p[s1 + 2] - p[s2 + 2];
        const on = ox * nor[o] + oy * nor[o + 1] + oz * nor[o + 2];
        ox -= on * nor[o];
        oy -= on * nor[o + 1];
        oz -= on * nor[o + 2];
        const ol = Math.sqrt(ox * ox + oy * oy + oz * oz) || 1;
        ven[o] = ox / ol;
        ven[o + 1] = oy / ol;
        ven[o + 2] = oz / ol;
      }
  }

  /** Každá dvojice jednou: bod a proti bodu b podél společné normály obou vrstev */
  private srazkySeSebou() {
    if (!this.dvojic) return;
    this.normaly();
    const { dvojA, dvojB } = this;
    for (let c = 0; c < this.dvojic; c++) this.dvojiceVrstev(dvojA[c], dvojB[c]);
  }

  /**
   * Body ka a kb (každý z jiného místa látky) se drží `tloustka` od sebe
   * podél společné normály obou vrstev — průměru normál, otočených k sobě
   * tak, aby mířily stejně. Měří se jen výška nad tečnou rovinou, ne
   * vzdálenost bodů, takže mezera mezi body druhé vrstvy nepustí nic skrz.
   * Strana se bere ze začátku pod-kroku: kdo by vrstvou prolétl, vrátí se.
   * Rovina platí jen nad okolím bodu (do ¾ rozteče do strany). Jsou-li oba
   * body na kraji látky a každý leží za krajem toho druhého (ve směru ven
   * z jeho látky) víc než o třetinu rozteče, jsou to jen dva kraje vedle
   * sebe a nesrazí se. Podél kraje a nad látkou druhého ano: kraj přeložené
   * chlopně, který leží nad krajem spodní půlky posunutý o půl rozteče nebo
   * o kus dovnitř, by jinak mezi jejími body propadl.
   */
  private dvojiceVrstev(ka: number, kb: number) {
    const { p, q, w, nor, gi, gj, n, zlom, opora, ven } = this;
    /*
     * Bod opřený o balík nebo o pult je pro vrstvu nad ním skoro nehybný:
     * jinak by ho vrchní vrstva vtlačila do balíku, balík ho vrátil zpátky
     * až k ní a strana by se mohla prohodit (vrstvy by se prolnuly).
     */
    const wa = opora[ka] ? w[ka] * 0.05 : w[ka];
    const wb = opora[kb] ? w[kb] * 0.05 : w[kb];
    const ws = wa + wb;
    if (ws === 0) return;
    const a = ka * 3;
    const b = kb * 3;
    const t = this.tloustka;
    if (zlom[ka] && zlom[kb]) {
      /* Oba v přehybu: normály nic neznamenají, drží se aspoň od sebe jako body */
      const ex = p[a] - p[b];
      const ey = p[a + 1] - p[b + 1];
      const ez = p[a + 2] - p[b + 2];
      const d2 = ex * ex + ey * ey + ez * ez;
      if (d2 >= t * t || d2 < 1e-14) return;
      const d = Math.sqrt(d2);
      const s = (t - d) / d;
      const fa = wa / ws;
      const fb = wb / ws;
      p[a] += ex * s * fa;
      p[a + 1] += ey * s * fa;
      p[a + 2] += ez * s * fa;
      p[b] -= ex * s * fb;
      p[b + 1] -= ey * s * fb;
      p[b + 2] -= ez * s * fb;
      return;
    }
    /* Společná normála; bod v přehybu přebírá normálu druhého */
    let nx: number;
    let ny: number;
    let nz: number;
    if (zlom[ka]) {
      nx = nor[b];
      ny = nor[b + 1];
      nz = nor[b + 2];
    } else if (zlom[kb]) {
      nx = nor[a];
      ny = nor[a + 1];
      nz = nor[a + 2];
    } else {
      const souhlas = nor[b] * nor[a] + nor[b + 1] * nor[a + 1] + nor[b + 2] * nor[a + 2] >= 0 ? 1 : -1;
      nx = nor[b] + souhlas * nor[a];
      ny = nor[b + 1] + souhlas * nor[a + 1];
      nz = nor[b + 2] + souhlas * nor[a + 2];
      const nl = Math.sqrt(nx * nx + ny * ny + nz * nz);
      if (nl < 0.5) return;
      nx /= nl;
      ny /= nl;
      nz /= nl;
    }
    const dx = p[a] - p[b];
    const dy = p[a + 1] - p[b + 1];
    const dz = p[a + 2] - p[b + 2];
    const s = dx * nx + dy * ny + dz * nz;
    const s0 = (q[a] - q[b]) * nx + (q[a + 1] - q[b + 1]) * ny + (q[a + 2] - q[b + 2]) * nz;
    /* Daleko od sebe a na stejné straně jako na začátku pod-kroku: nic */
    if ((s >= t || s <= -t) && s0 >= 0 === s >= 0) return;
    const l2 = dx * dx + dy * dy + dz * dz - s * s;
    const dosah = 0.75 * this.roztec;
    if (l2 > dosah * dosah) return;
    /* K okraji dosahu slábne: dotyk, který by se na hranici zapínal a vypínal, by látkou cukal */
    let vahaDosahu = 1 - l2 / (dosah * dosah);
    /* Za krajem látky rovina neplatí — to rozhodne jen dvojice, kde jsou na kraji oba (bod kraje nad cizí vrstvou se srazit musí) */
    const okraj = (gi[ka] === 0 || gj[ka] === 0 || gi[ka] === n - 1 || gj[ka] === n - 1) && (gi[kb] === 0 || gj[kb] === 0 || gi[kb] === n - 1 || gj[kb] === n - 1);
    if (okraj) {
      /*
       * O kolik je b za krajem látky bodu a a naopak (dx míří od b k a).
       * Stačí, když jeden leží nad látkou druhého; vedle sebe (každý za
       * krajem toho druhého) jsou jen dva kraje, co se dotýkají bokem.
       */
      const zaA = -(dx * ven[a] + dy * ven[a + 1] + dz * ven[a + 2]);
      const zaB = dx * ven[b] + dy * ven[b + 1] + dz * ven[b + 2];
      const za = Math.min(zaA, zaB) / (0.35 * this.roztec);
      if (za >= 1) return;
      if (za > 0) vahaDosahu *= 1 - za * za;
    }
    /* Strana vždy ze začátku pod-kroku — i u vrstev stlačených skoro na sebe (napnutá chlopeň přes balík) */
    const strana = Math.abs(s0) > 1e-6 ? (s0 > 0 ? 1 : -1) : s >= 0 ? 1 : -1;
    const pen = (strana * t - s) * vahaDosahu;
    if (pen * strana <= 0) return;
    const fa = wa / ws;
    const fb = wb / ws;
    p[a] += nx * pen * fa;
    p[a + 1] += ny * pen * fa;
    p[a + 2] += nz * pen * fa;
    p[b] -= nx * pen * fb;
    p[b + 1] -= ny * pen * fb;
    p[b + 2] -= nz * pen * fb;
    /* Tření mezi vrstvami: vzájemný posun v tomto pod-kroku podél vrstvy */
    let rx = p[a] - q[a] - (p[b] - q[b]);
    let ry = p[a + 1] - q[a + 1] - (p[b + 1] - q[b + 1]);
    let rz = p[a + 2] - q[a + 2] - (p[b + 2] - q[b + 2]);
    const rn = rx * nx + ry * ny + rz * nz;
    rx -= rn * nx;
    ry -= rn * ny;
    rz -= rn * nz;
    const rl = Math.sqrt(rx * rx + ry * ry + rz * rz);
    if (rl < 1e-12) return;
    const sila = Math.abs(pen);
    const k = rl < TRENI_LATKA_S * sila ? 1 : Math.min(1, (TRENI_LATKA_K * sila) / rl);
    p[a] -= rx * k * fa;
    p[a + 1] -= ry * k * fa;
    p[a + 2] -= rz * k * fa;
    p[b] += rx * k * fb;
    p[b + 1] += ry * k * fb;
    p[b + 2] += rz * k * fb;
  }

  /* ——— Balíky a pult ——— */

  private srazkyTelesa() {
    const { p, q, w, tlak, kandidati } = this;
    for (let bi = 0; bi < this.telesa.length; bi++) {
      const t = this.telesa[bi];
      const T = t.ted;
      const M = t.minule;
      const cs = T[3];
      const sn = T[4];
      const m = T[5];
      const im = 1 / m;
      const obalZ = t.tvar.obalZ;
      const obal = t.tvar.obalR + ODSTUP_TELESO * im;
      const obal2 = obal * obal;
      for (let c = t.kandOd; c < t.kandDo; c++) {
        const k = kandidati[c];
        if (w[k] === 0 || tlak[k]) continue;
        const o = k * 3;
        const dx = p[o] - T[0];
        const dy = p[o + 1] - T[1];
        const dz = p[o + 2] - T[2];
        let lx = (cs * dx + sn * dy) * im;
        let ly = (-sn * dx + cs * dy) * im;
        let lz = dz * im;
        const oz = lz - obalZ;
        if (lx * lx + ly * ly + oz * oz > obal2) continue;
        const d = sdfZabaleny(t.tvar, lx, ly, lz) * m;
        if (d >= ODSTUP_TELESO) continue;
        const pen = ODSTUP_TELESO - d;
        this.opora[k] = 1;
        const gx = cs * GRAD_NEJ[0] - sn * GRAD_NEJ[1];
        const gy = sn * GRAD_NEJ[0] + cs * GRAD_NEJ[1];
        const gz = GRAD_NEJ[2];
        p[o] += gx * pen;
        p[o + 1] += gy * pen;
        p[o + 2] += gz * pen;
        /*
         * Tření vůči balíku: tentýž bod balíku byl minulý pod-krok v P, takže
         * posun bodu látky vůči balíku je (p − q) − (p − P) = P − q.
         */
        const ex = p[o] - T[0];
        const ey = p[o + 1] - T[1];
        const ez = p[o + 2] - T[2];
        lx = (cs * ex + sn * ey) * im;
        ly = (-sn * ex + cs * ey) * im;
        lz = ez * im;
        const pm = M[5];
        let rx = M[0] + (M[3] * lx - M[4] * ly) * pm - q[o];
        let ry = M[1] + (M[4] * lx + M[3] * ly) * pm - q[o + 1];
        let rz = M[2] + lz * pm - q[o + 2];
        const rn = rx * gx + ry * gy + rz * gz;
        rx -= rn * gx;
        ry -= rn * gy;
        rz -= rn * gz;
        const rl = Math.sqrt(rx * rx + ry * ry + rz * rz);
        if (rl < 1e-12) continue;
        const f = rl < TRENI_TELESO_S * pen ? 1 : Math.min(1, (TRENI_TELESO_K * pen) / rl);
        p[o] -= rx * f;
        p[o + 1] -= ry * f;
        p[o + 2] -= rz * f;
      }
    }
  }

  /**
   * Pult z = 0 se třením. Coulomb po pod-krocích stačí na klouzání, ale
   * klidnou látku neudrží: tah vráskou se v jedné iteraci dostane jen do
   * pár bodů u jejího úpatí, ty povolí a vráska se rozjede (ve skutečnosti
   * se napětí rozloží do celé látky a tření ji drží). Proto statické tření
   * s kotvou: bod, který na pultu stojí, si pamatuje kde, a vrátí se tam,
   * dokud ho něco nepohne o víc než LEPI za pod-krok (a drobné zvednutí ho
   * neodlepí). Ruka nebo cíp v choreografii (pin natvrdo) tahají silou, ne
   * plížením, takže kotvy se po dobu tahu vypnou — látka se pak táhne podle
   * Coulomba a nenatahuje se o kotvy. Bod v měkkém pinu kotvu nemá.
   */
  private pult() {
    const { p, q, w, lezi, kotvaPult, pinDruh, vrstva } = this;
    const lepit = this.lepit;
    for (let k = 0; k < this.pocet; k++) {
      const o = k * 3;
      if (w[k] === 0) {
        lezi[k] = 0;
        continue;
      }
      let pen = 0;
      if (p[o + 2] < ODSTUP_PULT) {
        pen = ODSTUP_PULT - p[o + 2];
        this.opora[k] = 1;
        p[o + 2] = ODSTUP_PULT;
      } else if (lepit && lezi[k] && !vrstva[k] && p[o + 2] < ODSTUP_PULT + ODLEPENI) {
        p[o + 2] = ODSTUP_PULT;
      } else {
        lezi[k] = 0;
        continue;
      }
      /* Pod jinou vrstvou látky (přeložený šátek) kotva nedrží — tam stačí Coulomb a kotva by škubala */
      if (lezi[k] && (!lepit || vrstva[k])) lezi[k] = 0;
      if (lezi[k]) {
        const ax = p[o] - kotvaPult[k * 2];
        const ay = p[o + 1] - kotvaPult[k * 2 + 1];
        if (ax * ax + ay * ay <= LEPI * LEPI) {
          p[o] = kotvaPult[k * 2];
          p[o + 1] = kotvaPult[k * 2 + 1];
          continue;
        }
        lezi[k] = 0;
      }
      const dx = p[o] - q[o];
      const dy = p[o + 1] - q[o + 1];
      const dl = Math.sqrt(dx * dx + dy * dy);
      const f = dl < 1e-12 || dl < TRENI_PULT_S * pen ? 1 : Math.min(1, (TRENI_PULT_K * pen) / dl);
      p[o] -= dx * f;
      p[o + 1] -= dy * f;
      if (lepit && f === 1 && pinDruh[k] !== 2 && !vrstva[k]) {
        lezi[k] = 1;
        kotvaPult[k * 2] = p[o];
        kotvaPult[k * 2 + 1] = p[o + 1];
      }
    }
  }

  /** Rychlost z posunu za pod-krok (XPBD: rychlost se odvodí z polohy, ne naopak) */
  private rychlosti(h: number) {
    const { p, q, v } = this;
    const ih = 1 / h;
    for (let o = 0; o < p.length; o++) v[o] = (p[o] - q[o]) * ih;
  }
}
