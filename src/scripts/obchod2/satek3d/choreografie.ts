/**
 * Choreografie šátku furoshiki ve 3D — co se s látkou a balíky děje v čase.
 * Bez DOM; čas jde jen z tik(cas) v sekundách, takže se dá v testu přetočit.
 * Volá se před každým sim.krok(): posune piny (ruce, které vedou cípy)
 * a polohy balíků, fyzika pak dopočítá látku.
 *
 * Příkazy (start, nastavBaliky, zavaz, rozvaz) se řadí do fronty: když se
 * něco děje, další počká, až doběhne — nic se netrhne ani neskočí. Každý
 * příkaz je sekvence dějů s časem začátku a konce (let cípu, dopad balíku,
 * přeskok, odlet, růst uzlu); sekvence skončí, až doběhne poslední děj.
 *
 *   rozvrh       balíky v řadách odzadu dopředu, nejvýš tři v řadě, uprostřed
 *                šátku; nevejdou-li se do plochy pro zavázání, všechny se zmenší
 *   dopad        z 22 cm volným pádem, malé odskočení, látka se rozvlní
 *   složení      zadní půlka přes přední, vedená celým okrajem (kraje se
 *                nepodvinou), dosedne přesně nad ni; složený šátek má
 *                vyžehlený přehyb s nosem v řadě bodů (polohaSlozena)
 *   usínání      nic se neděje a látka stojí (nebo se jen chvěje na místě):
 *                zmrazí se, ať smyčka v latka.ts usne
 *   zavázání     otsukai-tsutsumi: přední cíp přes balíky dozadu, zadní přes
 *                ně dopředu, boční nahoru; řada bodů napříč každým bočním cípem
 *                se stáhne na kroužek pod jádrem uzlu (paprskovité záhyby),
 *                cípy se dvakrát obtočí (ma-musubi), druhá řada se stáhne do
 *                ústí jádra a špičky zůstanou jako uši. Když host látku předtím
 *                přeházel rukou, šátek se nejdřív uhladí do původní podoby
 *                (uhlad) — vázat zmuchlanou látku by vypadalo špatně
 *   rozvázání    obráceně, nakonec se celá látka uhladí (cípy první)
 */
import { NEJVIC_BALIKU, STRANA, indexRohu } from "./typy";
import type { BalikDoChoreografie, Poloha, RozhraniChoreografie, StavBaliku, StavUzlu, Teleso, TvarTelesa, V3 } from "./typy";
import { ODSTUP_PULT, ODSTUP_TELESO, polohaSlozena, vyskaTeles } from "./fyzika";
import type { SimLatky } from "./fyzika";

/* ═══ Míry a časy ═══ */

/** Polovina úhlopříčky šátku: jak daleko je cíp od středu */
const R = STRANA * Math.SQRT1_2;
/** Bezpečná plocha pro zavázání (m) a mezera mezi balíky */
const PLOCHA = 0.3;
const MEZERA = 0.015;
/** Nejméně látky za kroužkem uzlu (na ucho a na to, co spotřebuje uzel) */
const UCHO_NEJMENE = 0.085;
/** Šířka jádra uzlu — stejná jako výchozí síť z uzel.ts (SIRKA_JADRA) */
const VELIKOST_UZLU = 0.07;
/** Z jaké výšky balík padá */
const VYSKA_PADU = 0.22;
const G = 9.81;
/** Rozestup dopadů, když jich padá víc */
const ROZESTUP = 0.09;
/** Jak vysoko nad povrchem balíků vede ruka cíp, když ho přenáší */
const NAD_BALIKY = 0.07;
/** O kolik rychleji běží choreografie v dobehni() */
const DOBEH_ZRYCHLENI = 1.5;
/** Pod touto rychlostí (m/s) se nečinná látka zmrazí — zbytkové chvění řešiče je pod ní */
const USNOUT = 0.008;
/** Pod touto rychlostí látky (m/s) je klid (stejně jako latka.ts) */
const KLID = 0.002;
/** Volný bod dál než tohle (m) od své polohy na rozprostřeném šátku: před zavázáním se látka uhladí */
const UHLADIT_OD = 0.015;
/** Jak vysoko nad balíkem vede uhlazení látku, která na něm leží, než ji položí vedle (m) */
const UHLAZENI_NAD = 0.012;

const hladce = (u: number) => {
  const t = u < 0 ? 0 : u > 1 ? 1 : u;
  return t * t * (3 - 2 * t);
};
const hladce5 = (u: number) => {
  const t = u < 0 ? 0 : u > 1 ? 1 : u;
  return t * t * t * (t * (t * 6 - 15) + 10);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const omez = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);

/** Kvadratická Bézierova křivka do `out` */
function bezier(a: V3, b: V3, c: V3, u: number, out: V3) {
  const v = 1 - u;
  for (let i = 0; i < 3; i++) out[i] = v * v * a[i] + 2 * v * u * b[i] + u * u * c[i];
  return out;
}

/** Pevná náhoda podle semene (0…1) */
function nahoda(seme: number, k: number) {
  let t = (seme ^ Math.imul(k + 1, 0x9e3779b1)) >>> 0;
  t = Math.imul(t ^ (t >>> 15), 0x2c1b3c6d);
  t = Math.imul(t ^ (t >>> 12), 0x297a2d39);
  return ((t ^ (t >>> 15)) >>> 0) / 4294967296;
}

/* ═══ Rozvrh balíků ═══ */

/** Půdorys tvaru otočeného o `rot`: poloviční rozměr podél x a y (z primitiv, ne jen z poloměru) */
function pudorys(tvar: TvarTelesa, rot: number): [number, number] {
  const cs = Math.abs(Math.cos(rot));
  const sn = Math.abs(Math.sin(rot));
  let hx = 0;
  let hy = 0;
  const bod = (x: number, y: number, r: number) => {
    hx = Math.max(hx, Math.abs(x * Math.cos(rot) - y * Math.sin(rot)) + r);
    hy = Math.max(hy, Math.abs(x * Math.sin(rot) + y * Math.cos(rot)) + r);
  };
  for (const p of tvar.primitiva) {
    if (p.druh === "valec") bod(0, 0, p.r);
    else if (p.druh === "kapsle") {
      bod(p.a[0], p.a[1], p.r);
      bod(p.b[0], p.b[1], p.r);
    } else {
      /* Elipsoid otočený: obal z poloos */
      const ex = p.polomery[0] * cs + p.polomery[1] * sn;
      const ey = p.polomery[0] * sn + p.polomery[1] * cs;
      hx = Math.max(hx, Math.abs(p.stred[0]) + ex);
      hy = Math.max(hy, Math.abs(p.stred[1]) + ey);
    }
  }
  if (!tvar.primitiva.length) hx = hy = tvar.polomer;
  return [hx, hy];
}

/**
 * Kolik látky zbude za kroužkem uzlu na ucho, když je blok balíků široký
 * `w` a vysoký `v`: cesta od kraje bloku po pultu nahoru po boku a šikmo
 * k uzlu nad středem (střed uzlu 3 cm nad vrškem). Přibližné — přesně to
 * spočítá geometrieUzlu() podle tvaru balíků.
 */
function zbudeNaUcho(w: number, v: number) {
  const k = Math.max(0, w / 2 - 0.02);
  return R - w / 2 - v - Math.hypot(k, 0.03);
}

/**
 * Rozvrh: řady odzadu (+y) dopředu, nejvýš tři v řadě, celý blok uprostřed
 * šátku; mírné natočení podle semene. Rozměry z primitiv tvaru (ne jen
 * z poloměru), ať ležící váza nezabere čtverec podle své délky.
 * Když se blok nevejde do PLOCHA × PLOCHA, nebo by boční cípy nedosáhly
 * na uzel s ušima, všechno se stejně zmenší.
 */
export function rozvrh(baliky: readonly BalikDoChoreografie[]): Poloha[] {
  const kusy = baliky.slice(0, NEJVIC_BALIKU).map((b) => {
    const rot = (nahoda(b.seme, 1) - 0.5) * 0.34;
    const [hx, hy] = pudorys(b.tvar, rot);
    return { b, rot, hx, hy, posun: [(nahoda(b.seme, 2) - 0.5) * 0.008, (nahoda(b.seme, 3) - 0.5) * 0.008] };
  });
  if (!kusy.length) return [];
  const vyska = Math.max(...kusy.map((k) => k.b.tvar.vyska));
  /*
   * Kolik řad: zkusí se každý počet od nejmenšího možného (po třech v řadě);
   * další řada vyhraje, jen když se balíky díky ní zmenší aspoň o 5 % míň.
   * Kusy jdou do řad v pořadí šátku, vyrovnaně, vzadu víc.
   */
  type Rady = (typeof kusy)[];
  let nej: { rady: Rady; m: number; sirky: number[]; hloubky: number[]; hloubka: number } | null = null;
  for (let rad = Math.ceil(kusy.length / 3); rad <= Math.min(kusy.length, 5); rad++) {
    const rady: Rady = [];
    let i = 0;
    for (let r = 0; r < rad; r++) {
      const kolik = Math.ceil((kusy.length - i) / (rad - r));
      rady.push(kusy.slice(i, i + kolik));
      i += kolik;
    }
    if (rady.some((r) => r.length > 3)) continue;
    const hloubky = rady.map((r) => Math.max(...r.map((k) => 2 * k.hy)));
    const sirky = rady.map((r) => r.reduce((s, k) => s + 2 * k.hx, 0) + MEZERA * (r.length - 1));
    const hloubka = hloubky.reduce((s, h) => s + h, 0) + MEZERA * (rady.length - 1);
    const sirka = Math.max(...sirky);
    /* Měřítko: plocha, pak výška — boční cípy musí dosáhnout na uzel s ušima */
    let m = Math.min(1, PLOCHA / sirka, PLOCHA / hloubka);
    while (m > 0.3 && zbudeNaUcho(sirka * m, vyska * m) < UCHO_NEJMENE) m -= 0.01;
    /* Víc řad, jen když se balíky díky nim zmenší znatelně míň — širší uzlík vypadá líp než vysoký */
    if (!nej || m > nej.m * 1.05) nej = { rady, m, sirky, hloubky, hloubka };
  }
  const { rady, m, sirky, hloubky, hloubka } = nej!;
  const vysledek: Poloha[] = [];
  let y = (hloubka * m) / 2;
  rady.forEach((rada, r) => {
    const hl = hloubky[r] * m;
    let x = (-sirky[r] * m) / 2;
    for (const k of rada) {
      vysledek[kusy.indexOf(k)] = {
        x: x + k.hx * m + k.posun[0],
        y: y - hl / 2 + k.posun[1],
        z: 0,
        otoceni: k.rot,
        meritko: m,
      };
      x += 2 * k.hx * m + MEZERA * m;
    }
    y -= hl + MEZERA * m;
  });
  return vysledek;
}

/* ═══ Geometrie zavázání ═══ */

/** Délka napnuté látky přes profil: horní konvexní obal bodů (s, z) od prvního k poslednímu */
function delkaPresProfil(body: [number, number][]) {
  const obal: [number, number][] = [];
  for (const b of body) {
    while (obal.length >= 2) {
      const [ax, az] = obal[obal.length - 2];
      const [bx, bz] = obal[obal.length - 1];
      /* Horní obal: vyhodit prostřední bod, který leží pod spojnicí */
      if ((bx - ax) * (b[1] - az) - (bz - az) * (b[0] - ax) >= 0) obal.pop();
      else break;
    }
    obal.push(b);
  }
  let d = 0;
  for (let i = 1; i < obal.length; i++) d += Math.hypot(obal[i][0] - obal[i - 1][0], obal[i][1] - obal[i - 1][1]);
  return { delka: d, obal };
}

/** Bod ve vzdálenosti `l` podél lomené čáry (s, z) */
function bodNaObalu(obal: [number, number][], l: number): [number, number] {
  for (let i = 1; i < obal.length; i++) {
    const d = Math.hypot(obal[i][0] - obal[i - 1][0], obal[i][1] - obal[i - 1][1]);
    if (l <= d) {
      const t = d > 0 ? l / d : 0;
      return [mix(obal[i - 1][0], obal[i][0], t), mix(obal[i - 1][1], obal[i][1], t)];
    }
    l -= d;
  }
  return obal[obal.length - 1];
}

export interface GeometrieUzlu {
  /** Střed jádra uzlu */
  stred: V3;
  /** Kam dosedne špička předního a zadního cípu (přehozená přes balíky) */
  predni: V3;
  zadni: V3;
  /** Nejvyšší bod balíků (pro oblouky) */
  vrch: number;
  /** Kolik látky zbude za vstupním kroužkem (od špičky bočního cípu), vlevo a vpravo */
  dLevy: number;
  dPravy: number;
  /** Kde látka opouští blok balíků nahoře po stranách (pro směr pramene do uzlu) */
  bokLevy: V3;
  bokPravy: V3;
}

/**
 * Kam položit cípy a kde je uzel — podle skutečného tvaru balíků (výška
 * povrchu z jejich vzdálenostního pole). Délka látky se měří od kraje
 * bloku balíků (tam látka opouští pult) přes napnutý obal profilu.
 */
export function geometrieUzlu(telesa: readonly Teleso[], tloustka: number): GeometrieUzlu {
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  let vrch = 0;
  for (const t of telesa) {
    const [hx, hy] = pudorys(t.tvar, t.poloha.otoceni);
    x0 = Math.min(x0, t.poloha.x - hx * t.poloha.meritko);
    x1 = Math.max(x1, t.poloha.x + hx * t.poloha.meritko);
    y0 = Math.min(y0, t.poloha.y - hy * t.poloha.meritko);
    y1 = Math.max(y1, t.poloha.y + hy * t.poloha.meritko);
    vrch = Math.max(vrch, t.poloha.z + t.tvar.vyska * t.poloha.meritko);
  }
  if (!telesa.length) {
    x0 = y0 = -0.05;
    x1 = y1 = 0.05;
  }
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const nad = ODSTUP_TELESO + 0.002;
  const profil = (fn: (s: number) => [number, number], od: number, po: number, vrstvy: number) => {
    const body: [number, number][] = [];
    const kroku = Math.max(8, Math.ceil(Math.abs(po - od) / 0.005));
    for (let k = 0; k <= kroku; k++) {
      const s = mix(od, po, k / kroku);
      const [x, y] = fn(s);
      const v = vyskaTeles(telesa, x, y);
      body.push([s, v > 0 ? v + nad + vrstvy * tloustka : ODSTUP_PULT]);
    }
    return body;
  };
  /* Přední cíp: od předního kraje bloku přes balíky dozadu; látky má R − |y0| */
  const kus = 0.012;
  const pr = profil((s) => [cx, s], y0 - kus, y1 + kus, 0);
  const prP = delkaPresProfil(pr);
  const maPredni = R + y0 - 0.01;
  let predni: V3;
  /*
   * Špička přední chlopně zůstane na zadní straně balíků kousek nad pultem,
   * nikdy na látce za nimi: tam by ležela přes zadní půlku a zadní cíp by
   * pak musel vyjít zpod ní skrz ni. (Jako u skutečného otsukai-tsutsumi,
   * kde se dlouhá chlopeň zastrčí k předmětu.) Co látky přebývá, zůstane
   * volně na balících.
   */
  {
    const [s, z] = bodNaObalu(prP.obal, Math.min(maPredni, prP.delka - 0.025));
    predni = [cx, s, z + tloustka];
  }
  /* Zadní cíp: od zadního kraje dopředu, navrch přes přední chlopeň */
  const zr = profil((s) => [cx, -s], -(y1 + kus), -(y0 - kus), 1);
  const zrP = delkaPresProfil(zr);
  const maZadni = R - y1 - 0.01;
  let zadni: V3;
  if (maZadni > zrP.delka) zadni = [cx, y0 - kus - (maZadni - zrP.delka) * 0.85, ODSTUP_PULT + 2 * tloustka];
  else {
    const [s, z] = bodNaObalu(zrP.obal, maZadni);
    zadni = [cx, -s, z + 2 * tloustka];
  }
  /*
   * Uzel 3 cm nad vrškem (jádro ~ 3,5 cm vysoké leží na chlopních); zbyde-li
   * na boční cípy moc látky, uzel se zvedne (krček), ať uši nejsou dlouhé.
   */
  const bok = (smer: 1 | -1, zUzlu: number) => {
    /* Souřadnice s roste od kraje bloku k uzlu (vpravo zrcadlově), ať obal jde zleva doprava */
    const xk = smer < 0 ? x0 - kus : x1 + kus;
    const xVstup = cx + smer * 0.02;
    const body = profil((s) => [-smer * s, cy], -smer * xk, -smer * xVstup, 2);
    body.push([-smer * xVstup, zUzlu - 0.006]);
    const p = delkaPresProfil(body);
    /* Kde obal opouští balíky nahoře: předposlední bod obalu (poslední je kroužek u uzlu) */
    const o = p.obal;
    const posl = o.length >= 2 ? o[o.length - 2] : o[0];
    /* Látky je od kraje bloku ke špičce cípu tolik, kolik je to na rozprostřeném šátku */
    const kSpicce = Math.hypot(smer * R - xk, cy);
    return { zbude: kSpicce - p.delka, bod: [-smer * posl[0], cy, posl[1]] as V3 };
  };
  let zUzlu = vrch + 2 * tloustka + 0.028;
  let levy = bok(-1, zUzlu);
  let pravy = bok(1, zUzlu);
  for (let k = 0; k < 8 && Math.min(levy.zbude, pravy.zbude) > 0.17; k++) {
    zUzlu += 0.006;
    levy = bok(-1, zUzlu);
    pravy = bok(1, zUzlu);
  }
  return {
    stred: [cx, cy, zUzlu],
    predni,
    zadni,
    vrch,
    dLevy: levy.zbude,
    dPravy: pravy.zbude,
    bokLevy: levy.bod,
    bokPravy: pravy.bod,
  };
}

/* ═══ Choreografie ═══ */

interface Kus {
  id: string;
  tvar: TvarTelesa;
  seme: number;
  /** Poloha, kterou čte fyzika i kreslení (mění se na místě) */
  poloha: Poloha;
  teleso: Teleso;
  viditelnost: number;
  /** Je už ve fyzice (padá, stojí, odlétá)? */
  vSimulaci: boolean;
}

interface Dej {
  od: number;
  do: number;
  zacal?: boolean;
  zacni?: (cas: number) => void;
  krok?: (u: number, cas: number) => void;
  konec?: (cas: number) => void;
}

type Prikaz =
  | { druh: "baliky"; baliky: BalikDoChoreografie[] }
  | { druh: "zavaz"; hotovo?: () => void }
  | { druh: "rozvaz"; hotovo?: () => void };

/** Co drží zavázaný šátek (aby šlo rozvázat obráceně) */
interface Uvazani {
  geo: GeometrieUzlu;
  /** Řady bodů bočních cípů stažené na kroužky pod jádrem */
  vstupL: number[];
  vstupP: number[];
  /** Látka v uzlu a kolem něj, přišpendlená, ať se nehoupe */
  vJadru: number[];
}

export class Choreografie implements RozhraniChoreografie {
  private readonly sim: SimLatky;
  private _slozeno = false;
  private _zavazano = false;
  private kusy: Kus[] = [];
  private odletajici: Kus[] = [];
  private deje: Dej[] = [];
  private fronta: Prikaz[] = [];
  /** Běží sekvence (příkaz)? Až doběhne poslední děj, zavolají se `konce` */
  private sekvence = false;
  private konce: (() => void)[] = [];
  private cas = 0;
  private stavUzlu: StavUzlu | null = null;
  private uvazani: Uvazani | null = null;
  /** Body řad stažených do uzlu (při zmrazení se přepnou na místo, kde jsou) */
  private radyUzlu = new Set<number>();
  /** Kdy zavázaný šátek zmrazit (až se uzel usadí), nebo 0 */
  private zmrazitV = 0;
  /** Kolik tiků za sebou se nic neděje a látka se skoro nehýbe */
  private klidnych = 0;
  /** Poloha látky na začátku okna nečinnosti a kolik tiků okno trvá (chvění na místě, viz chveniNaMiste) */
  private oknoP: Float32Array | null = null;
  private oknoTiku = 0;

  constructor(sim: SimLatky) {
    this.sim = sim;
  }

  get slozeno() {
    return this._slozeno;
  }

  get zavazano() {
    return this._zavazano;
  }

  bezi(): boolean {
    return this.sekvence || this.fronta.length > 0;
  }

  lzeSahat(): boolean {
    return !this.bezi() && !this._zavazano;
  }

  baliky(): StavBaliku[] {
    const vys: StavBaliku[] = [];
    for (const k of this.kusy) vys.push({ id: k.id, poloha: { ...k.poloha }, viditelnost: k.viditelnost });
    for (const k of this.odletajici) vys.push({ id: k.id, poloha: { ...k.poloha }, viditelnost: k.viditelnost });
    return vys;
  }

  uzel(): StavUzlu | null {
    return this.stavUzlu && this.stavUzlu.mira > 0 ? { ...this.stavUzlu, stred: [...this.stavUzlu.stred] as V3 } : null;
  }

  /* ═══ Čas ═══ */

  tik(cas: number): boolean {
    this.cas = cas;
    if (!this.sekvence && this.fronta.length) this.dalsi(cas);
    if (this.zmrazitV && cas >= this.zmrazitV && !this.sekvence) {
      this.zmrazitV = 0;
      if (this._zavazano) this.sim.zmraz(true);
    }
    /* Nic se neděje, nic se nedrží a látka se skoro nehýbe (nebo se jen chvěje na místě): usnout (viz SimLatky.zmraz) */
    if (!this.sekvence && !this.fronta.length && !this.sim.piny.size && !this.sim.zmrazena) {
      this.klidnych = this.sim.pohyb() < USNOUT ? this.klidnych + 1 : 0;
      if (this.klidnych > 30 || this.chveniNaMiste()) this.sim.zmraz(true);
    } else {
      this.klidnych = 0;
      this.oknoTiku = 0;
    }
    this.prehraj(cas);
    if (this.sekvence && !this.deje.length) {
      this.sekvence = false;
      const k = this.konce;
      this.konce = [];
      k.forEach((fn) => fn());
      if (this.fronta.length) {
        this.dalsi(cas);
        this.prehraj(cas);
      }
    }
    return this.bezi();
  }

  /**
   * Chvění na místě: látka se za snímek hne víc, než je klid (řešič se
   * v přeložené látce, kterou ruka shrnula, nikdy úplně neuklidní), ale za
   * 40 tiků se nikam neposune — žádný bod víc než o 1,5 mm. Pak je to jen
   * šum řešiče a smyčka může usnout.
   */
  private chveniNaMiste() {
    const p = this.sim.p;
    if (!this.oknoP) this.oknoP = new Float32Array(p.length);
    if (this.oknoTiku === 0) {
      this.oknoP.set(p);
      this.oknoTiku = 1;
      return false;
    }
    if (++this.oknoTiku < 40) return false;
    this.oknoTiku = 0;
    const o = this.oknoP;
    let m = 0;
    for (let i = 0; i < p.length; i += 3) {
      const dx = p[i] - o[i];
      const dy = p[i + 1] - o[i + 1];
      const dz = p[i + 2] - o[i + 2];
      const d = dx * dx + dy * dy + dz * dz;
      if (d > m) m = d;
    }
    return m < 0.0015 * 0.0015;
  }

  private prehraj(cas: number) {
    for (const d of [...this.deje]) {
      if (cas < d.od) continue;
      if (!d.zacal) {
        d.zacal = true;
        d.zacni?.(cas);
      }
      const u = d.do > d.od ? Math.min(1, (cas - d.od) / (d.do - d.od)) : 1;
      d.krok?.(u, cas);
      if (cas >= d.do) {
        d.konec?.(cas);
        this.deje.splice(this.deje.indexOf(d), 1);
      }
    }
  }

  private pridej(d: Dej) {
    this.deje.push(d);
  }

  /** Začne sekvenci; `hotovo` se zavolá, až doběhne */
  private zacniSekvenci(hotovo?: () => void) {
    this.sekvence = true;
    this.zmrazitV = 0;
    this.sim.zmraz(false);
    if (hotovo) this.konce.push(hotovo);
    /* Prázdná sekvence by se neukončila — jeden prázdný děj ji podrží do příštího tiku */
    this.pridej({ od: this.cas, do: this.cas });
  }

  /**
   * Všechno, co se má stát, hned do klidu: fyzika po 1/30 s a choreografie
   * o polovinu rychleji (víc by látka nestačila sledovat — složení se pak
   * rozpadne). Nečinná látka se zmrazí hned, jak se skoro nehýbe. Zavázání
   * je nejdelší: kolem 90 kroků (při N = 48 necelá sekunda výpočtu).
   */
  dobehni(cas: number): number {
    let t = cas;
    for (let i = 0; i < 420; i++) {
      t += DOBEH_ZRYCHLENI / 30;
      this.tik(t);
      this.sim.krok(1 / 30);
      if (!this.bezi()) {
        if (this.zmrazitV) this.zmrazitV = Math.min(this.zmrazitV, t + 0.2);
        if (!this.sim.zmrazena && !this.sim.piny.size && this.sim.pohyb() < USNOUT) this.sim.zmraz(true);
        if (this.sim.zmrazena || this.sim.pohyb() < KLID) break;
      }
    }
    return t;
  }

  /* ═══ Příkazy ═══ */

  start(cas: number, baliky: BalikDoChoreografie[]): void {
    this.cas = cas;
    this.deje = [];
    this.fronta = [];
    this.konce = [];
    this.sekvence = false;
    this.stavUzlu = null;
    this.uvazani = null;
    this._zavazano = false;
    this.zmrazitV = 0;
    this.odletajici = [];
    this.sim.zmraz(false);
    this.sim.pustVse();
    this.sim.bezSrazek(null);
    const seznam = baliky.slice(0, NEJVIC_BALIKU);
    this.kusy = [];
    this.obnovTelesa();
    if (!seznam.length) {
      this.sim.slozena();
      this._slozeno = true;
      return;
    }
    this.sim.rozprostri(true);
    this._slozeno = false;
    this.zacniSekvenci();
    /* Šátek nejdřív dosedne, pak balíky padají jeden po druhém */
    this.kusy = this.noveKusy(seznam);
    const pol = rozvrh(seznam);
    this.kusy.forEach((k, i) => this.dopad(k, pol[i], cas + 0.4 + i * ROZESTUP));
  }

  nastavBaliky(cas: number, baliky: BalikDoChoreografie[]): void {
    this.cas = cas;
    const posledni = this.fronta[this.fronta.length - 1];
    if (posledni && posledni.druh === "baliky") posledni.baliky = baliky;
    else this.fronta.push({ druh: "baliky", baliky });
  }

  zavaz(cas: number, hotovo?: () => void): void {
    this.cas = cas;
    this.fronta.push({ druh: "zavaz", hotovo });
  }

  rozvaz(cas: number, hotovo?: () => void): void {
    this.cas = cas;
    this.fronta.push({ druh: "rozvaz", hotovo });
  }

  private dalsi(cas: number) {
    const p = this.fronta.shift();
    if (!p) return;
    if (p.druh === "baliky") {
      if (this._zavazano) {
        /* Zavázaný šátek se nejdřív rozváže, pak se teprve mění obsah */
        this.fronta.unshift(p);
        this.sekvenceRozvaz(cas);
        return;
      }
      this.sekvenceBaliky(cas, p.baliky.slice(0, NEJVIC_BALIKU));
    } else if (p.druh === "zavaz") {
      if (this._zavazano || !this.kusy.length) {
        p.hotovo?.();
        return;
      }
      this.sekvenceZavaz(cas, p.hotovo);
    } else {
      if (!this._zavazano) {
        p.hotovo?.();
        return;
      }
      this.sekvenceRozvaz(cas, p.hotovo);
    }
  }

  /* ═══ Balíky ═══ */

  private noveKusy(seznam: readonly BalikDoChoreografie[]): Kus[] {
    return seznam.map((b) => {
      const poloha: Poloha = { x: 0, y: 0, z: VYSKA_PADU, otoceni: 0, meritko: 1 };
      return {
        id: b.id,
        tvar: b.tvar,
        seme: b.seme,
        poloha,
        teleso: { id: b.id, tvar: b.tvar, poloha, pritlaci: true },
        viditelnost: 0,
        vSimulaci: false,
      };
    });
  }

  /** Fyzika dostane balíky, které padají, stojí nebo odlétají */
  private obnovTelesa() {
    const t: Teleso[] = [];
    for (const k of this.kusy) if (k.vSimulaci) t.push(k.teleso);
    for (const k of this.odletajici) t.push(k.teleso);
    this.sim.nastavTelesa(t);
  }

  /** Balík spadne z VYSKA_PADU na své místo, malé odskočení, látka se rozvlní */
  private dopad(kus: Kus, cil: Poloha, od: number) {
    const tPad = Math.sqrt((2 * VYSKA_PADU) / G);
    const tOdskok = 0.1;
    let dopadl = false;
    kus.viditelnost = 0;
    this.pridej({
      od,
      do: od + tPad + tOdskok + 0.04,
      zacni: () => {
        Object.assign(kus.poloha, cil, { z: VYSKA_PADU });
        kus.vSimulaci = true;
        this.obnovTelesa();
      },
      krok: (_u, cas) => {
        const t = cas - od;
        kus.viditelnost = Math.min(1, t / 0.06);
        if (t < tPad) kus.poloha.z = VYSKA_PADU - 0.5 * G * t * t;
        else {
          if (!dopadl) {
            dopadl = true;
            const r = kus.tvar.polomer * cil.meritko;
            this.sim.rozvlni(cil.x, cil.y, Math.max(0.05, r), 0.9 + 3 * r);
          }
          const t2 = t - tPad;
          kus.poloha.z = t2 < tOdskok ? 0.006 * Math.sin((Math.PI * t2) / tOdskok) : 0;
        }
      },
      konec: () => {
        kus.poloha.z = 0;
        kus.viditelnost = 1;
      },
    });
  }

  /** Balík, který v šátku zůstal, přeskočí krátkým poskokem na nové místo */
  private preskok(kus: Kus, cil: Poloha, od: number, trvani = 0.4) {
    const z = { ...kus.poloha };
    this.pridej({
      od,
      do: od + trvani,
      zacni: () => Object.assign(z, kus.poloha),
      krok: (u) => {
        const s = hladce(u);
        kus.poloha.x = mix(z.x, cil.x, s);
        kus.poloha.y = mix(z.y, cil.y, s);
        kus.poloha.otoceni = mix(z.otoceni, cil.otoceni, s);
        kus.poloha.meritko = mix(z.meritko, cil.meritko, s);
        kus.poloha.z = 0.035 * Math.sin(Math.PI * u);
      },
      konec: () => {
        Object.assign(kus.poloha, cil, { z: 0 });
      },
    });
  }

  /** Vyndaný balík odletí nahoru a zmizí */
  private odlet(kus: Kus, od: number, trvani = 0.36) {
    const z0 = kus.poloha.z;
    this.pridej({
      od,
      do: od + trvani,
      krok: (u) => {
        kus.poloha.z = z0 + 0.3 * u * u + 0.04 * u;
        kus.viditelnost = 1 - hladce((u - 0.25) / 0.75);
      },
      konec: () => {
        this.odletajici = this.odletajici.filter((k) => k !== kus);
        this.obnovTelesa();
      },
    });
  }

  private sekvenceBaliky(cas: number, seznam: BalikDoChoreografie[]) {
    this.zacniSekvenci();
    const nova = new Map(seznam.map((b) => [b.id, b]));
    const zustava = this.kusy.filter((k) => nova.has(k.id));
    const pryc = this.kusy.filter((k) => !nova.has(k.id));
    const stare = new Set(this.kusy.map((k) => k.id));
    const pribude = this.noveKusy(seznam.filter((b) => !stare.has(b.id)));
    /* Vyndané odletí */
    for (const k of pryc) {
      this.odletajici.push(k);
      this.odlet(k, cas);
    }
    const poradi = seznam.map((b) => zustava.find((k) => k.id === b.id) ?? pribude.find((k) => k.id === b.id)!);
    this.kusy = poradi;
    this.obnovTelesa();
    if (!seznam.length) {
      /* Prázdný šátek se složí, až balíky odletí */
      if (!this._slozeno) this.sloz(cas + (pryc.length ? 0.3 : 0));
      return;
    }
    const pol = rozvrh(seznam);
    let t = cas;
    if (this._slozeno) {
      /* Složený se nejdřív rozloží */
      t = this.rozloz(cas) + 0.15;
    } else if (pryc.length || zustava.length) t = cas + 0.1;
    /* Zbylé přeskočí na nový rozvrh (jen když se jejich místo změnilo) */
    let preskoceno = false;
    poradi.forEach((k, i) => {
      if (!zustava.includes(k)) return;
      const c = pol[i];
      const p = k.poloha;
      if (Math.hypot(p.x - c.x, p.y - c.y) < 0.004 && Math.abs(p.meritko - c.meritko) < 0.01 && Math.abs(p.otoceni - c.otoceni) < 0.02) return;
      this.preskok(k, c, t);
      preskoceno = true;
    });
    const tDopad = t + (preskoceno ? 0.42 : 0);
    let n = 0;
    poradi.forEach((k, i) => {
      if (zustava.includes(k)) return;
      this.dopad(k, pol[i], tDopad + n * ROZESTUP);
      n++;
    });
  }

  /* ═══ Piny ═══ */

  private poloha(k: number): V3 {
    const p = this.sim.p;
    return [p[k * 3], p[k * 3 + 1], p[k * 3 + 2]];
  }

  /**
   * Cíp (bod k) letí z místa, kde zrovna je, po dráze `draha(start, u)`;
   * piny jdou natvrdo (ruka), nebo s poddajností. Na konci pin zůstane,
   * nebo se pustí.
   */
  private let_(k: number, od: number, trvani: number, draha: (start: V3, u: number, out: V3) => void, poddajnost = 0, pustit = false) {
    let start: V3 = [0, 0, 0];
    const out: V3 = [0, 0, 0];
    this.pridej({
      od,
      do: od + trvani,
      zacni: () => {
        start = this.poloha(k);
      },
      krok: (u) => {
        draha(start, u, out);
        this.sim.pripniXYZ(k, out[0], out[1], out[2], poddajnost);
      },
      konec: () => {
        if (pustit) this.sim.pust(k);
      },
    });
  }

  /** Let obloukem: Bézierova křivka přes bod nad balíky */
  /**
   * Let obloukem: Bézierova křivka přes bod nad balíky. Ruka přitom nikdy
   * nejde níž než NAD_BALIKY nad povrchem balíků pod sebou — jinak by
   * cíp v sestupu prošel látkou, která už na balících leží.
   */
  private oblouk(k: number, od: number, trvani: number, cil: V3, vrchol: (start: V3) => V3, poddajnost = 0, pustit = false) {
    this.let_(
      k,
      od,
      trvani,
      (start, u, out) => {
        bezier(start, vrchol(start), cil, hladce5(u), out);
        /* Na začátku a na konci dráhy (cíp leží) se nezvedá */
        const okraj = Math.min(1, Math.min(u, 1 - u) * 8);
        if (okraj > 0) {
          const nad = vyskaTeles(this.telesaKusu(), out[0], out[1]);
          if (nad > 0) out[2] = Math.max(out[2], mix(out[2], nad + NAD_BALIKY, okraj));
        }
      },
      poddajnost,
      pustit,
    );
  }

  private telesaKusu(): Teleso[] {
    return this.kusy.filter((k) => k.vSimulaci).map((k) => k.teleso);
  }

  /* ═══ Složení a rozložení ═══ */

  /** Body okraje zadní půlky (i = 0 nebo j = 0, i + j < N − 1) a jejich vzdálenost od čáry přehybu */
  private okrajZadni(): { k: number; d: number }[] {
    const { n, klid } = this.sim;
    const v: { k: number; d: number }[] = [];
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        if (i !== 0 && j !== 0) continue;
        if (i + j >= n - 1) continue;
        const k = j * n + i;
        v.push({ k, d: klid[k * 2 + 1] });
      }
    return v;
  }

  /**
   * Bod okraje zadní půlky při přehybu o úhel φ (0 = rozložený, π = složený):
   * otáčí se kolem čáry levý–pravý cíp a na konci dosedne o vrstvu výš nad
   * zrcadlový bod (jako polohaSlozena). Daleko od čáry po zploštělém oblouku
   * (cíp nevyletí půl metru nad pult), u ní skoro po kružnici — jinak by se
   * látka u čáry přehybu stlačila a cípy na jejích koncích by ujížděly.
   */
  private poPrehybu(k: number, phi: number, out: V3) {
    const { klid, tloustka, n } = this.sim;
    const d = klid[k * 2 + 1];
    const c = Math.cos(phi);
    out[0] = klid[k * 2];
    out[1] = d * c;
    out[2] = ODSTUP_PULT + d * (0.62 + 0.38 * Math.exp(-d / 0.05)) * Math.sin(phi) + (tloustka * (1 - c)) / 2;
    if (phi >= Math.PI - 1e-9) polohaSlozena(k % n, Math.floor(k / n), n, out);
    return out;
  }

  /** Prázdný šátek se složí: celý okraj zadní půlky přes přední. Vrací čas konce. */
  private sloz(od: number) {
    const okraj = this.okrajZadni();
    const tr = 1.0;
    const cilova: V3 = [0, 0, 0];
    const { p, klid, n } = this.sim;
    for (const { k, d } of okraj) {
      const zpozdeni = 0.08 * (1 - d / R);
      /* Zrcadlový bod v přední půlce — nad ním chlopeň dosedne */
      const kz = (n - 1 - (k % n)) * n + (n - 1 - Math.floor(k / n));
      this.let_(
        k,
        od + zpozdeni,
        tr,
        (start, u, out) => {
          const s = hladce(u);
          this.poPrehybu(k, Math.PI * s, out);
          this.poPrehybu(k, 0, cilova);
          /* Odkud skutečně vyšel (vrásky): rozdíl se cestou vytratí */
          const z = 1 - hladce(u * 1.4);
          for (let c = 0; c < 3; c++) out[c] += (start[c] - cilova[c]) * z;
          /*
           * Ke konci míří nad skutečné místo zrcadlového bodu: přední půlku
           * přehyb trochu potáhne a kraj chlopně by jinak dosedl vedle jejího
           * kraje (o centimetr podél něj).
           */
          const w = hladce((u - 0.55) / 0.45);
          if (w > 0) {
            out[0] += (p[kz * 3] - klid[kz * 2]) * w;
            out[1] += (p[kz * 3 + 1] - klid[kz * 2 + 1]) * w;
            out[2] += Math.max(0, p[kz * 3 + 2] - ODSTUP_PULT) * w;
          }
        },
        0,
        true,
      );
    }
    const konec = od + 0.08 + tr;
    this.pridej({
      od: konec,
      do: konec + 0.35,
      zacni: () => {
        this.sim.prehyb(true);
        this._slozeno = true;
      },
    });
    return konec + 0.35;
  }

  /** Složený šátek se rozloží: okraj zadní půlky se vrátí přes čáru přehybu. Vrací čas konce. */
  private rozloz(od: number) {
    const okraj = this.okrajZadni();
    const tr = 0.95;
    const slozena: V3 = [0, 0, 0];
    this._slozeno = false;
    this.pridej({ od, do: od, zacni: () => this.sim.prehyb(false) });
    for (const { k, d } of okraj) {
      const zpozdeni = 0.08 * (d / R);
      this.let_(
        k,
        od + zpozdeni,
        tr,
        (start, u, out) => {
          const s = hladce(u);
          this.poPrehybu(k, Math.PI * (1 - s), out);
          this.poPrehybu(k, Math.PI, slozena);
          const z = 1 - hladce(u * 1.4);
          for (let c = 0; c < 3; c++) out[c] += (start[c] - slozena[c]) * z;
        },
        0,
        true,
      );
    }
    return od + 0.08 + tr + 0.2;
  }

  /* ═══ Zavázání ═══ */

  /** Body látky v Manhattanské vzdálenosti `s` od cípu (řada napříč cípem), od jednoho kraje k druhému */
  private radaCipu(roh: "levy" | "pravy", s: number): number[] {
    const { n } = this.sim;
    const m = n - 1;
    /* Levý cíp je (0, m), pravý (m, 0); řada jsou body o s kroků od něj (po i a po j dohromady) */
    const v: number[] = [];
    for (let a = 0; a <= s; a++) {
      const i = roh === "levy" ? a : m - a;
      const j = roh === "levy" ? m - (s - a) : s - a;
      if (i < 0 || j < 0 || i > m || j > m) continue;
      v.push(j * n + i);
    }
    return v;
  }

  /**
   * Kroužek, na který se stáhne řada bodů cípu: střed `stred`, poloměr r,
   * v rovině kolmé na směr pramene `smer`. Bod řady s příčnou souřadnicí
   * σ ∈ ⟨−1, 1⟩ (−1 vpředu, +1 vzadu) sedí na úhlu σ·150° od spodu kroužku —
   * pramen tak do uzlu vchází zespodu jako svinutý kornout.
   */
  private naKrouzku(stred: V3, smer: V3, r: number, sigma: number, out: V3) {
    /* Základna roviny: ex podél y (vpředu–vzadu), ey „nahoru“ kolmo na pramen */
    let ax = 0;
    let ay = 1;
    let az = 0;
    const d = ax * smer[0] + ay * smer[1] + az * smer[2];
    ax -= d * smer[0];
    ay -= d * smer[1];
    az -= d * smer[2];
    const la = Math.hypot(ax, ay, az) || 1;
    ax /= la;
    ay /= la;
    az /= la;
    let bx = smer[1] * az - smer[2] * ay;
    let by = smer[2] * ax - smer[0] * az;
    let bz = smer[0] * ay - smer[1] * ax;
    if (bz < 0) {
      bx = -bx;
      by = -by;
      bz = -bz;
    }
    const f = sigma * ((150 * Math.PI) / 180);
    const cb = -Math.cos(f);
    const ca = Math.sin(f);
    out[0] = stred[0] + r * (cb * bx + ca * ax);
    out[1] = stred[1] + r * (cb * by + ca * ay);
    out[2] = stred[2] + r * (cb * bz + ca * az);
    return out;
  }

  /** Řada bodů se měkce stáhne na kroužek: piny jdou z místa, kde body jsou, s klesající poddajností */
  private stahni(rada: number[], od: number, trvani: number, stred: V3, smer: V3, r: number, poddajnost: [number, number], dPol: number) {
    const sim = this.sim;
    const starty = rada.map(() => [0, 0, 0] as V3);
    const cil: V3 = [0, 0, 0];
    this.pridej({
      od,
      do: od + trvani,
      zacni: () => rada.forEach((k, i) => (starty[i] = this.poloha(k))),
      krok: (u) => {
        const s = hladce(u);
        const alfa = Math.exp(mix(Math.log(poddajnost[0]), Math.log(poddajnost[1]), s));
        rada.forEach((k, i) => {
          const sigma = omez(sim.klid[k * 2 + 1] / dPol, -1, 1);
          this.naKrouzku(stred, smer, r, sigma, cil);
          sim.pripniXYZ(k, mix(starty[i][0], cil[0], s), mix(starty[i][1], cil[1], s), mix(starty[i][2], cil[2], s), alfa);
        });
      },
    });
  }

  private sekvenceZavaz(cas: number, hotovo?: () => void) {
    const sim = this.sim;
    const n = sim.n;
    const telesa = this.kusy.map((k) => k.teleso);
    const geo = geometrieUzlu(telesa, sim.tloustka);
    const c = geo.stred;
    const vrch = geo.vrch;
    this.zacniSekvenci(() => {
      this._zavazano = true;
      /* Až se uzel usadí, látka se zmrazí (viz SimLatky.zmraz) */
      this.zmrazitV = this.cas + 0.7;
      hotovo?.();
    });
    const kPredni = indexRohu("predni", n);
    const kZadni = indexRohu("zadni", n);
    const kLevy = indexRohu("levy", n);
    const kPravy = indexRohu("pravy", n);
    const nadBaliky = (start: V3, cil: V3): V3 => [mix(start[0], cil[0], 0.5), mix(start[1], cil[1], 0.45), Math.max(start[2], cil[2]) + (vrch + 0.16 - Math.max(start[2], cil[2])) * 1.6];

    /*
     * 0) Přeházenou látku (host s ní hýbal rukou) nejdřív uhladit do původní
     * podoby — vázat zmuchlaný šátek vypadá špatně. Rovná látka čekat nemusí.
     *
     * 1) Přední cíp obloukem přes balíky dozadu; pak ho drží měkký pin.
     * Ruka je i za letu trochu měkká: když se chlopeň přes balík napne, raději
     * povolí, než aby látku vtlačila do vrstvy pod ní.
     */
    const t1 = this.potrebujeUhladit() ? this.uhlad(cas) + 0.05 : cas;
    this.oblouk(kPredni, t1, 0.85, geo.predni, (s) => nadBaliky(s, geo.predni), 3e-4);
    this.drz(kPredni, t1 + 0.85, geo.predni);
    /* 2) Zadní cíp obloukem dopředu, navrch */
    const t2 = t1 + 0.75;
    this.oblouk(kZadni, t2, 0.85, geo.zadni, (s) => nadBaliky(s, geo.zadni), 3e-4);
    this.drz(kZadni, t2 + 0.85, geo.zadni);

    /* 3) Boční cípy nahoru nad uzel; řady napříč cípy se stáhnou na kroužky pod jádrem */
    const t3 = t2 + 0.8;
    const h = sim.roztec;
    const osa: V3 = [1, 0, 0];
    const nadUzlem = (strana: -1 | 1): V3 => [c[0] + strana * 0.03, c[1] + strana * 0.006, c[2] + 0.1];
    this.oblouk(kLevy, t3, 0.8, nadUzlem(-1), (s) => [mix(s[0], c[0], 0.35) - 0.05, s[1], c[2] + 0.12]);
    this.oblouk(kPravy, t3, 0.8, nadUzlem(1), (s) => [mix(s[0], c[0], 0.35) + 0.05, s[1], c[2] + 0.12]);
    const dL = Math.max(UCHO_NEJMENE, geo.dLevy);
    const dP = Math.max(UCHO_NEJMENE, geo.dPravy);
    const sL = omez(Math.round((dL * Math.SQRT2) / h), 2, n - 2);
    const sP = omez(Math.round((dP * Math.SQRT2) / h), 2, n - 2);
    const vstupL = this.radaCipu("levy", sL);
    const vstupP = this.radaCipu("pravy", sP);
    const krL: V3 = [c[0] - 0.02, c[1], c[2] - 0.006];
    const krP: V3 = [c[0] + 0.02, c[1], c[2] - 0.006];
    const smer = (od: V3, k: V3): V3 => {
      const d: V3 = [k[0] - od[0], k[1] - od[1], k[2] - od[2]];
      const l = Math.hypot(d[0], d[1], d[2]) || 1;
      return [d[0] / l, d[1] / l, d[2] / l];
    };
    const smerL = smer(geo.bokLevy, krL);
    const smerP = smer(geo.bokPravy, krP);
    this.stahni(vstupL, t3 + 0.35, 0.65, krL, smerL, 0.011, [0.08, 0.003], (sL * h) / Math.SQRT2);
    this.stahni(vstupP, t3 + 0.35, 0.65, krP, smerP, 0.011, [0.08, 0.003], (sP * h) / Math.SQRT2);
    /* Dokud jsou piny řad aktivní, drží je na kroužku i po stažení */
    this.drzRadu(vstupL, t3 + 1.0, krL, smerL, 0.011, 0.003, (sL * h) / Math.SQRT2);
    this.drzRadu(vstupP, t3 + 1.0, krP, smerP, 0.011, 0.003, (sP * h) / Math.SQRT2);

    /* 4) Dvě poloviny ma-musubi: špičky se obtočí kolem uzlu, jádro doroste */
    const t4 = t3 + 0.8;
    const tToc = 1.0;
    /* Uvnitř jádra se látka kříží a stlačuje — srážky se sebou tam nejsou (jádro je zakryje), ústí už ano */
    this.pridej({ od: t4, do: t4, zacni: () => sim.bezSrazek(c, 0.028) });
    for (const strana of [-1, 1] as const) {
      const k = strana < 0 ? kLevy : kPravy;
      const sredOtoceni: V3 = [c[0], c[1] + strana * 0.012, c[2] + 0.035];
      this.let_(k, t4, tToc, (start, u, out) => {
        /* Kruh kolem středu v rovině x–z, dvakrát; levá špička jedním směrem, pravá druhým */
        const a0 = Math.atan2(start[2] - sredOtoceni[2], start[0] - sredOtoceni[0]);
        const a = a0 - strana * 2 * Math.PI * 2 * hladce(u);
        const r = mix(Math.hypot(start[0] - sredOtoceni[0], start[2] - sredOtoceni[2]), 0.05, hladce(u * 3));
        out[0] = sredOtoceni[0] + r * Math.cos(a);
        out[1] = mix(start[1], sredOtoceni[1], hladce(u * 2));
        out[2] = sredOtoceni[2] + r * Math.sin(a);
      });
    }
    this.stavUzlu = { mira: 0, stred: [c[0], c[1], c[2]], osaX: osa, osaZ: [0, 0, 1], velikost: VELIKOST_UZLU };
    this.pridej({
      od: t4 + 0.1,
      do: t4 + tToc - 0.05,
      krok: (u) => {
        if (this.stavUzlu) this.stavUzlu.mira = hladce(u);
      },
    });

    /*
     * 5) Špičky šikmo nahoru a do stran jako uši: vycházejí z ústí jádra
     * (±3,4 cm od středu), uchu zbude, co cípu nespotřeboval uzel.
     */
    const t5 = t4 + tToc;
    const ustiL: V3 = [c[0] - 0.034, c[1], c[2] + 0.005];
    const ustiP: V3 = [c[0] + 0.034, c[1], c[2] + 0.005];
    const delkaUcha = (d: number) => omez((d - 0.035) * 0.7, 0.03, 0.1);
    const uchoL: V3 = [ustiL[0] - delkaUcha(dL) * Math.cos(0.5), c[1] - 0.008, ustiL[2] + delkaUcha(dL) * Math.sin(0.5)];
    const uchoP: V3 = [ustiP[0] + delkaUcha(dP) * Math.cos(0.5), c[1] + 0.008, ustiP[2] + delkaUcha(dP) * Math.sin(0.5)];
    this.oblouk(kLevy, t5, 0.5, uchoL, (s) => [mix(s[0], uchoL[0], 0.5), mix(s[1], uchoL[1], 0.5), Math.max(s[2], uchoL[2]) + 0.02], 0);
    this.oblouk(kPravy, t5, 0.5, uchoP, (s) => [mix(s[0], uchoP[0], 0.5), mix(s[1], uchoP[1], 0.5), Math.max(s[2], uchoP[2]) + 0.02], 0);
    this.drz(kLevy, t5 + 0.5, uchoL, 4e-4);
    this.drz(kPravy, t5 + 0.5, uchoP, 4e-4);
    /*
     * Ucho je cíp svinutý v ústí jádra: řada napříč uchem (uchu zbyde od ní
     * ke špičce, co neschová uzel) se měkce stáhne na malý kroužek v ústí.
     * Měkce — pak se stejně zmrazí tam, kde se usadí, ať se piny nepřou.
     */
    const eL = omez(dL - 0.035, 0.04, 0.16);
    const eP = omez(dP - 0.035, 0.04, 0.16);
    const sUchaL = omez(Math.round((eL * Math.SQRT2) / h), 1, sL - 1);
    const sUchaP = omez(Math.round((eP * Math.SQRT2) / h), 1, sP - 1);
    const smerUcha = (strana: -1 | 1): V3 => [strana * Math.cos(0.5), 0, Math.sin(0.5)];
    this.stahni(this.radaCipu("levy", sUchaL), t5, 0.5, ustiL, smerUcha(-1), 0.009, [0.08, 0.01], eL);
    this.stahni(this.radaCipu("pravy", sUchaP), t5, 0.5, ustiP, smerUcha(1), 0.009, [0.08, 0.01], eP);
    /*
     * Látka v uzlu a kolem něj nemá o co se opřít — uvnitř jádra se kříží
     * bez srážek se sebou — a bez opory by se houpala, takže by šátek nikdy
     * nebyl v klidu. Jakmile uši sedí, zůstane měkce přišpendlená tam, kde
     * zrovna je: všechny cíle pinů pak popisují jednu skutečnou polohu látky
     * a nic se nepře. (Stáhnout ji celou dovnitř jádra nejde: u malého
     * balíku jsou to stovky cm² nenatažitelné látky.)
     */
    const vJadru: number[] = [];
    const vstupyL = new Set([...vstupL, ...vstupP]);
    this.radyUzlu = new Set([...vstupL, ...vstupP, ...this.radaCipu("levy", sUchaL), ...this.radaCipu("pravy", sUchaP)]);
    this.pridej({
      od: t5 + 0.55,
      do: t5 + 0.55,
      zacni: () => {
        const spicky = new Set([kLevy, kPravy, kPredni, kZadni]);
        for (let k = 0; k < sim.pocet; k++) {
          if (spicky.has(k) || sim.pritlaceny(k)) continue;
          const p = this.poloha(k);
          if (Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]) > 0.05) continue;
          if (sim.piny.has(k) && !this.radyUzlu.has(k)) continue;
          sim.pripniXYZ(k, p[0], p[1], p[2], 2e-3);
          /* Vstupní řady se pouštějí až s kroužky (rozvázání, krok B) */
          if (!vstupyL.has(k)) vJadru.push(k);
        }
      },
    });
    /* Chvilka na dosednutí, pak hotovo */
    this.pridej({ od: t5 + 0.5, do: t5 + 0.85 });
    this.uvazani = { geo, vstupL, vstupP, vJadru };
  }

  /** Bod zůstane měkce přišpendlený tam, kam doletěl (na začátku děje se jen přepne pin) */
  private drz(k: number, od: number, kde: V3, poddajnost = 1e-3) {
    this.pridej({ od, do: od, zacni: () => this.sim.pripniXYZ(k, kde[0], kde[1], kde[2], poddajnost) });
  }

  /** Řada bodů zůstane na kroužku s danou poddajností */
  private drzRadu(rada: number[], od: number, stred: V3, smer: V3, r: number, poddajnost: number, dPol: number) {
    const cil: V3 = [0, 0, 0];
    this.pridej({
      od,
      do: od,
      zacni: () =>
        rada.forEach((k) => {
          this.naKrouzku(stred, smer, r, omez(this.sim.klid[k * 2 + 1] / dPol, -1, 1), cil);
          this.sim.pripniXYZ(k, cil[0], cil[1], cil[2], poddajnost);
        }),
    });
  }

  /* ═══ Rozvázání ═══ */

  private sekvenceRozvaz(cas: number, hotovo?: () => void) {
    const sim = this.sim;
    const n = sim.n;
    const u = this.uvazani;
    this.zacniSekvenci(hotovo);
    this._zavazano = false;
    const kPredni = indexRohu("predni", n);
    const kZadni = indexRohu("zadni", n);
    const kLevy = indexRohu("levy", n);
    const kPravy = indexRohu("pravy", n);
    const vrch = u ? u.geo.vrch : 0.12;
    const c: V3 = u ? u.geo.stred : [0, 0, vrch + 0.03];
    const klid = (k: number): V3 => [sim.klid[k * 2], sim.klid[k * 2 + 1], ODSTUP_PULT];

    /* A) Uši se uvolní, špičky se obtočí zpátky, jádro zmizí */
    const tA = cas;
    this.pridej({
      od: tA,
      do: tA,
      zacni: () => {
        if (u) for (const k of u.vJadru) sim.pust(k);
        for (const k of this.radyUzlu) if (!u || (!u.vstupL.includes(k) && !u.vstupP.includes(k))) sim.pust(k);
      },
    });
    for (const strana of [-1, 1] as const) {
      const k = strana < 0 ? kLevy : kPravy;
      const sredOtoceni: V3 = [c[0], c[1] + strana * 0.012, c[2] + 0.035];
      this.let_(k, tA, 0.55, (start, uu, out) => {
        const a0 = Math.atan2(start[2] - sredOtoceni[2], start[0] - sredOtoceni[0]);
        const a = a0 + strana * 2 * Math.PI * hladce(uu);
        const r = mix(Math.hypot(start[0] - sredOtoceni[0], start[2] - sredOtoceni[2]), 0.06, hladce(uu));
        out[0] = sredOtoceni[0] + r * Math.cos(a);
        out[1] = start[1];
        out[2] = sredOtoceni[2] + r * Math.sin(a);
      });
    }
    this.pridej({
      od: tA,
      do: tA + 0.85,
      krok: (v) => {
        if (this.stavUzlu) this.stavUzlu.mira = 1 - hladce(v);
      },
      konec: () => {
        this.stavUzlu = null;
      },
    });

    /* B) Kroužky se pustí, boční cípy obloukem dolů na své místo */
    const tB = tA + 0.5;
    this.pridej({
      od: tB,
      do: tB,
      zacni: () => {
        if (u) for (const k of [...u.vstupL, ...u.vstupP]) sim.pust(k);
        /* Látka, která se v jádře křížila, se rozplétá: kolem uzlu zatím bez srážek se sebou */
        sim.bezSrazek(c, 0.08);
      },
    });
    this.oblouk(kLevy, tB, 0.7, klid(kLevy), (s) => [mix(s[0], klid(kLevy)[0], 0.4), s[1], Math.max(s[2], 0.05) + 0.05]);
    this.oblouk(kPravy, tB, 0.7, klid(kPravy), (s) => [mix(s[0], klid(kPravy)[0], 0.4), s[1], Math.max(s[2], 0.05) + 0.05]);

    /* C) Zadní cíp přes balíky zpátky dozadu, D) přední dopředu */
    const nadBaliky = (start: V3, cil: V3): V3 => [mix(start[0], cil[0], 0.5), mix(start[1], cil[1], 0.55), vrch + 0.2];
    const tC = tB + 0.55;
    this.oblouk(kZadni, tC, 0.7, klid(kZadni), (s) => nadBaliky(s, klid(kZadni)));
    const tD = tC + 0.5;
    this.oblouk(kPredni, tD, 0.7, klid(kPredni), (s) => nadBaliky(s, klid(kPredni)));

    /* E) Celá látka se uhladí: měkké piny ke klidové poloze, cípy první, pak se pustí */
    this.uhlad(tD + 0.6);
    this.uvazani = null;
  }

  /** Leží látka jinak než rozprostřená (host ji přeházel rukou, zůstaly vrásky)? */
  private potrebujeUhladit() {
    const { sim } = this;
    let m = 0;
    for (let k = 0; k < sim.pocet; k++) {
      if (sim.pritlaceny(k)) continue;
      const dx = sim.p[k * 3] - sim.klid[k * 2];
      const dy = sim.p[k * 3 + 1] - sim.klid[k * 2 + 1];
      const dz = sim.p[k * 3 + 2] - ODSTUP_PULT;
      m = Math.max(m, dx * dx + dy * dy + dz * dz);
    }
    return m > UHLADIT_OD * UHLADIT_OD;
  }

  /**
   * Látka se uhladí do rozprostřeného šátku: měkké piny ke klidové poloze, cípy
   * první, pak se pustí. Vrací čas, kdy látka leží a srážky se sebou zase platí.
   *
   * Uhlazuje se do jedné rovné vrstvy — tam se nic nekříží, takže srážky se
   * sebou nejsou potřeba, a kdyby zůstaly, držely by zapletené kusy (z uzlu,
   * nebo co host přehodil přes sebe) na špatné straně (strana se bere
   * z minulého pod-kroku). Zapnou se zase, až látka leží. Klidová poloha se
   * posune o to, o kolik leží látka pod balíky jinde než na rozprostřeném
   * šátku, ať se uhlazení nepere s body, které balíky drží. Co leží na balíku,
   * ruka přenese nad ním a položí vedle.
   */
  private uhlad(od: number): number {
    const { sim } = this;
    const n = sim.n;
    const m = n - 1;
    let sx = 0;
    let sy = 0;
    let pod = 0;
    for (let k = 0; k < sim.pocet; k++) {
      if (!sim.pritlaceny(k)) continue;
      sx += sim.p[k * 3] - sim.klid[k * 2];
      sy += sim.p[k * 3 + 1] - sim.klid[k * 2 + 1];
      pod++;
    }
    const posunX = pod ? sx / pod : 0;
    const posunY = pod ? sy / pod : 0;
    this.pridej({ od, do: od, zacni: () => sim.bezSrazek([0, 0, 0], 10) });
    for (let k = 0; k < sim.pocet; k++) {
      if (sim.pritlaceny(k)) continue;
      const i = k % n;
      const j = Math.floor(k / n);
      const odCipu = Math.min(Math.hypot(i, j), Math.hypot(m - i, j), Math.hypot(i, m - j), Math.hypot(m - i, m - j)) / m;
      const cil: V3 = [sim.klid[k * 2] + posunX, sim.klid[k * 2 + 1] + posunY, ODSTUP_PULT];
      this.let_(
        k,
        od + odCipu * 0.3,
        0.55,
        (start, uu, out) => {
          const s = hladce(uu);
          out[0] = mix(start[0], cil[0], s);
          out[1] = mix(start[1], cil[1], s);
          out[2] = mix(start[2], cil[2], s) + 0.025 * Math.sin(Math.PI * uu) * (1 - odCipu);
          /* Nad balíkem ruka látku drží nad ním; ke konci ji pustí na místo (srážka s balíkem ji zastaví vedle) */
          const nad = vyskaTeles(this.telesaKusu(), out[0], out[1]);
          if (nad > 0) out[2] = Math.max(out[2], mix(nad + UHLAZENI_NAD, out[2], hladce((uu - 0.75) / 0.25)));
        },
        2e-3,
        true,
      );
    }
    this.pridej({ od: od + 0.85, do: od + 1.0, konec: () => sim.bezSrazek(null) });
    return od + 1.0;
  }
}
