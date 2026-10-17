/**
 * Kus z krámku zabalený v novinách — balík na 3D šátku. Tak se v Japonsku
 * keramika z obchodu nosí: arch novin se zvedne po bocích, nahoře se stáhne
 * do chomáčku a převáže provázkem; na provázku visí visačka 荷札 s fotkou
 * a číslem, stejným jako na účtence. 2D kresba téhož je Zabaleno.astro.
 *
 * tvarBaliku() je tvar pro srážky — sjednocení primitiv z typy.ts, bez DOM
 * (fyzika ho potřebuje i v Node). Sítě se staví z téhož: hladký povrch je
 * hranice měkkého sjednocení stejných primitiv, takže tvar pro srážky sedí
 * do papíru na pár milimetrů. Na hladký povrch přijdou přehyby, jak se
 * papír stahuje ke krčku, řídké ostré záhyby a drobné zmačkání (hřbetový
 * šum); nad provázkem papír vykvete do chomáčku jako okvětní lístky.
 *
 * Papír má souřadnice textury podle archu: kus stojí uprostřed archu, takže
 * uv jdou od středu dna paprskovitě ven (bez švu) a cípy archu končí ve
 * špičkách lístků. Váza je arch svinutý do ruličky (šev dole na pultu),
 * talíř arch přehnutý přes okraj.
 *
 * Místní souřadnice: počátek uprostřed dna na pultu, z nahoru, visačka míří
 * na −y (ke kameře). Trojúhelníky jdou proti směru hodin při pohledu zvenku
 * (normály ven); lístky chomáčku a visačka mají rub jako zvláštní plochu.
 * Textury se nahrávají, jak jsou (bez UNPACK_FLIP_Y): uv (0, 0) je levý
 * horní roh obrázku.
 */
import type { CastBaliku, DataBaliku, KusNaSatku, Primitivum, Sit, TvarBaliku, TvarTelesa, V3 } from "./typy";
import { ARCH, VISACKA, texturaNovin, texturaVisacky } from "./noviny";

const CM = 0.01;
const MM = 0.001;
const TAU = Math.PI * 2;

/** Jutový motouz ⌀ 3,6 mm a nitka visačky ⌀ 1 mm */
const R_PROVAZKU = 1.8 * MM;
const R_NITKY = 0.5 * MM;
const BARVA_PROVAZKU: [number, number, number] = [0.69, 0.53, 0.32];
/** O kolik víc se normála papíru odkloní od hladkého povrchu, než dává síť (viz Stavba.sit) */
const OSTROST = 0.8;
/** Tloušťka papíru a kartonu — o tolik je rub lístků a visačky pod lícem */
const TLOUSTKA = 0.6 * MM;

/* ═══ Drobná matematika ═══ */

type P2 = [number, number];
type Pole = (x: number, y: number, z: number) => number;

const pricti = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const odecti = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const krat = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const tecka = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const krizem = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const jedn = (a: V3): V3 => {
  const d = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / d, a[1] / d, a[2] / d];
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const omez = (x: number, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const hladce = (a: number, b: number, x: number) => {
  const t = omez((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
/** Úhel do (−π, π] */
const zabal = (u: number) => u - TAU * Math.round(u / TAU);

/** Stejná náhoda jako parta2/tvary.ts (mulberry32) */
const nahoda = (seme: number) => {
  let s = seme | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
/** Seme z id, když kus žádné nemá — stejně jako fasáda (FNV-1a) */
const semeZId = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

/** Gradientní šum (Perlin) se zamíchanou tabulkou podle náhody, hodnoty zhruba −1…1 */
function vytvorSum(r: () => number): Pole {
  const q = new Uint8Array(256);
  for (let i = 0; i < 256; i++) q[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    const t = q[i];
    q[i] = q[j];
    q[j] = t;
  }
  const p = new Uint8Array(512);
  for (let i = 0; i < 512; i++) p[i] = q[i & 255];
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const g = (h: number, x: number, y: number, z: number) => {
    h &= 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return (h & 1 ? -u : u) + (h & 2 ? -v : v);
  };
  return (x, y, z) => {
    const fx = Math.floor(x), fy = Math.floor(y), fz = Math.floor(z);
    const X = fx & 255, Y = fy & 255, Z = fz & 255;
    x -= fx;
    y -= fy;
    z -= fz;
    const u = fade(x), v = fade(y), w = fade(z);
    const A = p[X] + Y, AA = p[A] + Z, AB = p[A + 1] + Z, B = p[X + 1] + Y, BA = p[B] + Z, BB = p[B + 1] + Z;
    return mix(
      mix(mix(g(p[AA], x, y, z), g(p[BA], x - 1, y, z), u), mix(g(p[AB], x, y - 1, z), g(p[BB], x - 1, y - 1, z), u), v),
      mix(mix(g(p[AA + 1], x, y, z - 1), g(p[BA + 1], x - 1, y, z - 1), u), mix(g(p[AB + 1], x, y - 1, z - 1), g(p[BB + 1], x - 1, y - 1, z - 1), u), v),
      w,
    );
  };
}
/** Hřbet: ostrý vrchol tam, kde šum prochází nulou — síť ostrých přehybů zmačkaného papíru */
const hrbet = (n: number) => 0.3 - Math.abs(n);
/** Přehyb jako harmonika: rovné plošky mezi ostrým hřbetem (fáze 0) a ostrým údolím (fáze π), −1…1 */
const prehyb = (f: number) => {
  const t = f / TAU - Math.floor(f / TAU);
  return 4 * Math.abs(t - 0.5) - 1;
};

/** Hladká náhodná funkce úhlu v −1…1 (pár harmonických) */
function vlna(r: () => number, od = 1, doM = 5): (u: number) => number {
  const c: [number, number, number][] = [];
  let s = 0;
  for (let m = od; m <= doM; m++) {
    const a = (0.35 + r()) / Math.pow(m, 0.6);
    c.push([m, a, r() * TAU]);
    s += a;
  }
  return (u) => {
    let v = 0;
    for (const [m, a, f] of c) v += a * Math.sin(m * u + f);
    return v / s;
  };
}

/* ═══ Vzdálenostní pole primitiv ═══ */

const smin = (a: number, b: number, k: number) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
};
/** Válec se zaoblenými hranami v polorovině (r, z): hranice leží přesně na r a z0, z1 */
const sdValecRZ = (r: number, z: number, R: number, z0: number, z1: number, k: number) => {
  const dr = r - (R - k);
  const dz = Math.abs(z - (z0 + z1) / 2) - ((z1 - z0) / 2 - k);
  return Math.min(Math.max(dr, dz), 0) + Math.hypot(Math.max(dr, 0), Math.max(dz, 0)) - k;
};
/** Elipsoid (odhad vzdálenosti, nula přesně na povrchu) */
const sdElipsoid = (x: number, y: number, z: number, a: number, b: number, c: number) => {
  const k0 = Math.hypot(x / a, y / b, z / c);
  const k1 = Math.hypot(x / (a * a), y / (b * b), z / (c * c));
  return k1 > 1e-12 ? (k0 * (k0 - 1)) / k1 : -Math.min(a, b, c);
};
const sdUsecka = (x: number, y: number, z: number, a: V3, b: V3, r: number) => {
  const px = x - a[0], py = y - a[1], pz = z - a[2];
  const bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2];
  const h = omez((px * bx + py * by + pz * bz) / (bx * bx + by * by + bz * bz));
  return Math.hypot(px - bx * h, py - by * h, pz - bz * h) - r;
};

/**
 * Vzdálenost bodu od primitiva. Válec: hranice leží přesně na poloměru r
 * a výškách z0, z1, hrany jsou zaoblené dovnitř o `zaobleni`.
 */
export function vzdalenostPrimitiva(q: Primitivum, x: number, y: number, z: number): number {
  if (q.druh === "valec") return sdValecRZ(Math.hypot(x, y), z, q.r, q.z0, q.z1, q.zaobleni);
  if (q.druh === "kapsle") return sdUsecka(x, y, z, q.a, q.b, q.r);
  return sdElipsoid(x - q.stred[0], y - q.stred[1], z - q.stred[2], q.polomery[0], q.polomery[1], q.polomery[2]);
}
/** Vzdálenost od tvaru balíku (sjednocení primitiv) v místních souřadnicích, záporná uvnitř */
export function vzdalenostKTvaru(t: TvarTelesa, x: number, y: number, z: number): number {
  let d = Infinity;
  for (const q of t.primitiva) d = Math.min(d, vzdalenostPrimitiva(q, x, y, z));
  return d;
}

function spad(f: Pole, p: V3): V3 {
  const h = 0.4 * MM;
  return jedn([
    f(p[0] + h, p[1], p[2]) - f(p[0] - h, p[1], p[2]),
    f(p[0], p[1] + h, p[2]) - f(p[0], p[1] - h, p[2]),
    f(p[0], p[1], p[2] + h) - f(p[0], p[1], p[2] - h),
  ]);
}
/** Bod přitažený na povrch pole (pár kroků po spádu) */
function napovrch(f: Pole, p: V3): V3 {
  let q = p;
  for (let k = 0; k < 5; k++) q = pricti(q, spad(f, q), -f(q[0], q[1], q[2]));
  return q;
}
/** Body cesty aspoň `odstup` nad povrchem pole — provázek leží na papíru, nezajede do něj */
function venku(f: Pole, cesta: V3[], odstup: number): V3[] {
  return cesta.map((p) => {
    let q = p;
    for (let k = 0; k < 4; k++) {
      const d = f(q[0], q[1], q[2]);
      if (d >= odstup) break;
      q = pricti(q, spad(f, q), odstup - d);
    }
    return q;
  });
}
/** Kde paprsek z bodu `o` ve směru `d` vyjde z pole ven (půlení) */
function vychod(f: Pole, o: V3, d: V3, max = 0.4): V3 {
  let lo = 0;
  let hi = 2 * MM;
  while (f(o[0] + d[0] * hi, o[1] + d[1] * hi, o[2] + d[2] * hi) < 0 && hi < max) {
    lo = hi;
    hi *= 1.4;
  }
  for (let k = 0; k < 36; k++) {
    const m = (lo + hi) / 2;
    if (f(o[0] + d[0] * m, o[1] + d[1] * m, o[2] + d[2] * m) < 0) lo = m;
    else hi = m;
  }
  return pricti(o, d, (lo + hi) / 2);
}

/**
 * Obrys tvaru v polorovině (r ≥ 0, z) paprsky z bodu (0, zs) — od středu dna
 * (−90°) přes bok po vršek (+90°). Tvary jsou hvězdicové, každý paprsek
 * protne hranici jen jednou.
 */
function obrys(f: (r: number, z: number) => number, zs: number, kroku: number, od = -Math.PI / 2, doU = Math.PI / 2): P2[] {
  const body: P2[] = [];
  for (let i = 0; i <= kroku; i++) {
    const a = mix(od, doU, i / kroku);
    const dr = Math.cos(a), dz = Math.sin(a);
    let lo = 0;
    let hi = 2 * MM;
    while (f(hi * dr, zs + hi * dz) < 0 && hi < 1) {
      lo = hi;
      hi *= 1.4;
    }
    for (let k = 0; k < 40; k++) {
      const m = (lo + hi) / 2;
      if (f(m * dr, zs + m * dz) < 0) lo = m;
      else hi = m;
    }
    const t = (lo + hi) / 2;
    body.push([Math.max(0, t * dr), zs + t * dz]);
  }
  return body;
}

const bezier2 = (a: P2, b: P2, c: P2, d: P2, t: number): P2 => {
  const s = 1 - t;
  return [s * s * s * a[0] + 3 * s * s * t * b[0] + 3 * s * t * t * c[0] + t * t * t * d[0], s * s * s * a[1] + 3 * s * s * t * b[1] + 3 * s * t * t * c[1] + t * t * t * d[1]];
};
const bezier3 = (a: V3, b: V3, c: V3, d: V3, t: number): V3 => {
  const s = 1 - t;
  const k0 = s * s * s, k1 = 3 * s * s * t, k2 = 3 * s * t * t, k3 = t * t * t;
  return [k0 * a[0] + k1 * b[0] + k2 * c[0] + k3 * d[0], k0 * a[1] + k1 * b[1] + k2 * c[1] + k3 * d[1], k0 * a[2] + k1 * b[2] + k2 * c[2] + k3 * d[2]];
};

interface BodProfilu {
  /** Poloměr (u vázy vzdálenost od osy) */
  r: number;
  /** Výška (u vázy poloha podél osy x) */
  z: number;
  /** Délka oblouku od začátku profilu — kolik archu je od středu dna */
  s: number;
}
/** Převzorkuje lomenou čáru na `pocet` bodů rovnoměrně podle vážené délky oblouku */
function prevzorkuj(body: P2[], pocet: number, vaha: (p: P2) => number, s0 = 0): BodProfilu[] {
  const s = [s0];
  const w = [0];
  for (let i = 1; i < body.length; i++) {
    const d = Math.hypot(body[i][0] - body[i - 1][0], body[i][1] - body[i - 1][1]);
    s.push(s[i - 1] + d);
    w.push(w[i - 1] + d * vaha([(body[i][0] + body[i - 1][0]) / 2, (body[i][1] + body[i - 1][1]) / 2]));
  }
  const celkem = w[w.length - 1];
  const vystup: BodProfilu[] = [];
  let k = 1;
  for (let j = 0; j < pocet; j++) {
    const cil = (celkem * j) / (pocet - 1);
    while (k < body.length - 1 && w[k] < cil) k++;
    const t = w[k] > w[k - 1] ? omez((cil - w[k - 1]) / (w[k] - w[k - 1])) : 0;
    vystup.push({ r: mix(body[k - 1][0], body[k][0], t), z: mix(body[k - 1][1], body[k][1], t), s: mix(s[k - 1], s[k], t) });
  }
  return vystup;
}

/* ═══ Stavba sítě ═══ */

class Stavba {
  readonly p: number[] = [];
  readonly t: number[] = [];
  readonly i: number[] = [];
  /** Normála hladkého povrchu pod vrcholem (nebo nuly) — podle ní se zesílí přehyby ve světle */
  readonly z: number[] = [];
  get pocet() {
    return this.p.length / 3;
  }
  bod(p: V3, u: number, v: number, hladka?: V3) {
    this.p.push(p[0], p[1], p[2]);
    this.t.push(u, v);
    if (hladka) this.z.push(hladka[0], hladka[1], hladka[2]);
    else this.z.push(0, 0, 0);
    return this.pocet - 1;
  }
  misto(k: number): V3 {
    return [this.p[k * 3], this.p[k * 3 + 1], this.p[k * 3 + 2]];
  }
  /** Trojúhelník a → b → c (proti směru hodin = líc); nulové (sešlé do bodu nebo úsečky) se vynechají */
  troj(a: number, b: number, c: number) {
    if (a === b || b === c || a === c) return;
    const p = this.p;
    const e1x = p[b * 3] - p[a * 3], e1y = p[b * 3 + 1] - p[a * 3 + 1], e1z = p[b * 3 + 2] - p[a * 3 + 2];
    const e2x = p[c * 3] - p[a * 3], e2y = p[c * 3 + 1] - p[a * 3 + 1], e2z = p[c * 3 + 2] - p[a * 3 + 2];
    if (Math.hypot(e1y * e2z - e1z * e2y, e1z * e2x - e1x * e2z, e1x * e2y - e1y * e2x) < 1e-12) return;
    this.i.push(a, b, c);
  }
  /** Normály z geometrie: součet normál trojúhelníků vážený plochou */
  normaly(): Float32Array {
    const n = new Float32Array(this.p.length);
    const p = this.p;
    for (let t = 0; t < this.i.length; t += 3) {
      const a = this.i[t] * 3, b = this.i[t + 1] * 3, c = this.i[t + 2] * 3;
      const e1x = p[b] - p[a], e1y = p[b + 1] - p[a + 1], e1z = p[b + 2] - p[a + 2];
      const e2x = p[c] - p[a], e2y = p[c + 1] - p[a + 1], e2z = p[c + 2] - p[a + 2];
      const nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
      for (const v of [a, b, c]) {
        n[v] += nx;
        n[v + 1] += ny;
        n[v + 2] += nz;
      }
    }
    for (let v = 0; v < n.length; v += 3) {
      const d = Math.hypot(n[v], n[v + 1], n[v + 2]) || 1;
      n[v] /= d;
      n[v + 1] /= d;
      n[v + 2] /= d;
    }
    return n;
  }
  /**
   * Síť pro kreslení. `ostrost` > 0 zesílí, o kolik se normála odklání od
   * hladkého povrchu: přehyby a záhyby jsou ve světle výraznější, než by
   * síť s roztečí kolem 6 mm sama unesla, a tvar zůstane v mezích tvaru pro srážky.
   */
  sit(ostrost = 0): Sit {
    const n = this.normaly();
    if (ostrost > 0)
      for (let v = 0; v < n.length; v += 3) {
        const zx = this.z[v], zy = this.z[v + 1], zz = this.z[v + 2];
        if (zx === 0 && zy === 0 && zz === 0) continue;
        const x = n[v] + ostrost * (n[v] - zx), y = n[v + 1] + ostrost * (n[v + 1] - zy), w = n[v + 2] + ostrost * (n[v + 2] - zz);
        const d = Math.hypot(x, y, w) || 1;
        n[v] = x / d;
        n[v + 1] = y / d;
        n[v + 2] = w / d;
      }
    return {
      pozice: Float32Array.from(this.p),
      normaly: n,
      uv: Float32Array.from(this.t),
      indexy: this.pocet < 65536 ? Uint16Array.from(this.i) : Uint32Array.from(this.i),
    };
  }
}

/**
 * Mřížka indexů (řádky × sloupce) na plochu: sloupce jdou kolem proti směru
 * hodin, řádky po profilu ven/nahoru — pak má líc normálu ven. `kolem` =
 * sloupec za posledním je zase první (bez švu), jinak se sloupce nespojí.
 */
function plocha(s: Stavba, m: number[][], kolem: boolean, rub = false) {
  for (let j = 0; j < m.length - 1; j++) {
    const a0 = m[j], a1 = m[j + 1];
    const n = kolem ? a0.length : a0.length - 1;
    for (let i = 0; i < n; i++) {
      const i1 = (i + 1) % a0.length;
      const A = a0[i], B = a0[i1], C = a1[i1], D = a1[i];
      if (rub) {
        s.troj(A, C, B);
        s.troj(A, D, C);
      } else {
        s.troj(A, B, C);
        s.troj(A, C, D);
      }
    }
  }
}

/** Trubka podél cesty (provázek, nitka); `vicka` zavřou konce */
function trubka(s: Stavba, cesta: V3[], r: number, strany: number, vicka = true) {
  const n = cesta.length;
  if (n < 2) return;
  const tecny = cesta.map((_, i) => jedn(odecti(cesta[Math.min(i + 1, n - 1)], cesta[Math.max(i - 1, 0)])));
  let nn: V3 = Math.abs(tecny[0][2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  const prvni = s.pocet;
  for (let i = 0; i < n; i++) {
    const t = tecny[i];
    /* Rám se nese podél cesty (promítnutí předchozí normály), ať se trubka nekroutí */
    nn = jedn(odecti(nn, krat(t, tecka(nn, t))));
    const b = krizem(t, nn);
    for (let k = 0; k < strany; k++) {
      const a = (k / strany) * TAU;
      s.bod(pricti(pricti(cesta[i], nn, r * Math.cos(a)), b, r * Math.sin(a)), i / (n - 1), k / strany);
    }
  }
  for (let i = 0; i < n - 1; i++)
    for (let k = 0; k < strany; k++) {
      const a = prvni + i * strany + k;
      const d = prvni + i * strany + ((k + 1) % strany);
      s.troj(a, d, a + strany);
      s.troj(d, d + strany, a + strany);
    }
  if (!vicka) return;
  const c0 = s.bod(cesta[0], 0, 0);
  const c1 = s.bod(cesta[n - 1], 1, 0);
  const posl = prvni + (n - 1) * strany;
  for (let k = 0; k < strany; k++) {
    s.troj(c0, prvni + ((k + 1) % strany), prvni + k);
    s.troj(c1, posl + k, posl + ((k + 1) % strany));
  }
}

/** Uzlík: malý zploštělý elipsoid kolem bodu (osy a, b, c i s délkami) */
function uzlik(s: Stavba, stred: V3, a: V3, b: V3, c: V3) {
  const prvni = s.pocet;
  const kolem = 10;
  const pasu = 6;
  for (let j = 0; j <= pasu; j++) {
    const v = (j / pasu) * Math.PI;
    for (let i = 0; i < kolem; i++) {
      const u = (i / kolem) * TAU;
      const p = pricti(pricti(pricti(stred, a, Math.sin(v) * Math.cos(u)), b, Math.sin(v) * Math.sin(u)), c, -Math.cos(v));
      s.bod(p, i / kolem, j / pasu);
    }
  }
  const m: number[][] = [];
  for (let j = 0; j <= pasu; j++) m.push(Array.from({ length: kolem }, (_, i) => prvni + j * kolem + i));
  /* Rovnoběžky jdou od −c k +c, poledníky od a k b — líc ven, když a × b míří po c */
  plocha(s, m, true, tecka(krizem(a, b), c) < 0);
}

/** Cesta jako lomená čára s rovnoměrnými body (podle délky) */
function rovnomerne(body: V3[], pocet: number): V3[] {
  const s = [0];
  for (let i = 1; i < body.length; i++) s.push(s[i - 1] + Math.hypot(...odecti(body[i], body[i - 1])));
  const vystup: V3[] = [];
  let k = 1;
  for (let j = 0; j < pocet; j++) {
    const cil = (s[s.length - 1] * j) / (pocet - 1);
    while (k < body.length - 1 && s[k] < cil) k++;
    const t = s[k] > s[k - 1] ? omez((cil - s[k - 1]) / (s[k] - s[k - 1])) : 0;
    vystup.push(pricti(body[k - 1], odecti(body[k], body[k - 1]), t));
  }
  return vystup;
}

/* ═══ Visačka 荷札 ═══ */

interface Ramec {
  /** Bod na hladkém povrchu pod středem kartičky */
  stred: V3;
  /** Normála povrchu tam (líc kartičky míří sem) */
  n: V3;
  /** Doprava a nahoru po kartičce, jak ji čte kamera */
  sirka: V3;
  nahoru: V3;
}

/** Rám kartičky z bodu na povrchu a směru „nahoru“, natočený kolem normály o `naklon` */
function ramec(f: Pole, stred: V3, nahoru: V3, naklon: number): Ramec {
  const n = spad(f, stred);
  const h0 = jedn(odecti(nahoru, krat(n, tecka(nahoru, n))));
  const h = jedn(pricti(krat(h0, Math.cos(naklon)), krizem(n, h0), Math.sin(naklon)));
  return { stred, n, nahoru: h, sirka: krizem(h, n) };
}

/** Kde na kartičce (x po šířce, y nahoru od středu) — rovinná a přiložená na povrch podle `ohyb` */
function naVisacce(f: Pole, r: Ramec, ohyb: number, odstup: number, x: number, y: number): V3 {
  const p = pricti(pricti(r.stred, r.sirka, x), r.nahoru, y);
  const rovina = pricti(p, r.n, odstup);
  const q = napovrch(f, p);
  const prilozena = pricti(q, spad(f, q), odstup);
  return [mix(rovina[0], prilozena[0], ohyb), mix(rovina[1], prilozena[1], ohyb), mix(rovina[2], prilozena[2], ohyb)];
}

/**
 * Kartička se seříznutými horními rohy: líc s texturou (uv přes celý obdélník
 * obrázku) a rub o tloušťku kartonu blíž k balíku. Vrací dírku (kam vede nitka).
 */
function postavVisacku(s: Stavba, f: Pole, r: Ramec, ohyb: number, odstup: number): V3 {
  const W = VISACKA.sirka, H = VISACKA.vyska, c = VISACKA.zkoseni * W;
  const sloupcu = 6;
  const radky: number[] = [];
  for (let k = 0; k <= 7; k++) radky.push(-H / 2 + ((H - c) * k) / 7);
  radky.push(H / 2 - c / 2, H / 2);
  for (const strana of [0, 1]) {
    const m: number[][] = radky.map((y) => {
      const pul = W / 2 - Math.max(0, y - (H / 2 - c));
      return Array.from({ length: sloupcu }, (_, i) => {
        const x = -pul + (2 * pul * i) / (sloupcu - 1);
        const p = naVisacce(f, r, ohyb, odstup - strana * TLOUSTKA, x, y);
        /* Rub: jedna barva kartonu z rohu obrázku, který obrys kartičky odřízne */
        return strana ? s.bod(p, 0.03, 0.02) : s.bod(p, (x + W / 2) / W, (H / 2 - y) / H);
      });
    });
    plocha(s, m, false, strana === 1);
  }
  return naVisacce(f, r, ohyb, odstup, 0, H / 2 - VISACKA.dirkaY * H);
}

/** Jak moc místo leží pod kartičkou (papír je tam přimáčknutý) — 0…1 */
function podVisackou(r: Ramec, p: V3) {
  const q = odecti(p, r.stred);
  const x = Math.abs(tecka(q, r.sirka)) / (VISACKA.sirka / 2);
  const y = Math.abs(tecka(q, r.nahoru)) / (VISACKA.vyska / 2);
  return (1 - hladce(0.85, 1.12, Math.max(x, y))) * (1 - hladce(1.5 * CM, 3 * CM, Math.abs(tecka(q, r.n))));
}

/* ═══ Rozměry balíků ═══ */

type Stazene = "miska" | "hrnek" | "cajovka";

/** Kus stojící na dně, papír stažený nahoře do krčku a chomáčku */
interface Stazeny {
  /** Kus v papíru: válec se zaoblenými hranami */
  valec: { r: number; z1: number; zaobleni: number };
  /** Papír přetažený přes okraj ke krčku: elipsoid (výška středu, poloměr do stran, svislá poloosa) */
  kopule: { z: number; r: number; v: number };
  /** Hrnek: ucho pod papírem jako svislá kapsle na +x */
  ucho?: { x: number; z0: number; z1: number; r: number };
  /** Svazek papíru pod provázkem */
  krk: { r: number; delka: number };
  /** Lístky chomáčku: poloměr špiček (rMax dává šířku obálky chomáčku) */
  chomacek: { rMin: number; rMax: number };
  /** Nejvyšší místo balíku — vršek zmačkaného svazku uprostřed chomáčku */
  vyska: number;
  /** Poloměr půdorysu i s papírem a visačkou — síť se na něj na konci přesně dorovná */
  polomer: number;
  /** Přehyby ke krčku: největší hloubka a kolik jich je */
  prehyby: { hloubka: number; od: number; do: number };
  /** Kolik řídkých ostrých záhybů na boku a kopuli */
  zahybu: number;
  /** O kolik je tvar pro srážky větší (tělo, kopule, chomáček, krček, ucho) — viz nafoukni() */
  nafuk: number[];
  /** Visačka: výška středu na boku a jak moc přilne k papíru (0 rovná … 1 obtiskne se) */
  visacka: { z: number; ohyb: number };
  kolem: number;
  prstencu: number;
  listku: number;
}

const STAZENE: Record<Stazene, Stazeny> = {
  miska: {
    valec: { r: 8.0 * CM, z1: 7.2 * CM, zaobleni: 2.6 * CM },
    kopule: { z: 6.1 * CM, r: 6.8 * CM, v: 1.65 * CM },
    krk: { r: 1.25 * CM, delka: 0.8 * CM },
    chomacek: { rMin: 2.5 * CM, rMax: 3.7 * CM },
    vyska: 12.0 * CM,
    polomer: 8.15 * CM,
    prehyby: { hloubka: 5.0 * MM, od: 7, do: 10 },
    zahybu: 18,
    nafuk: [8.1 * MM, 8.1 * MM, 4.6 * MM, 16.0 * MM, 0],
    visacka: { z: 6.3 * CM, ohyb: 1 },
    kolem: 80,
    prstencu: 36,
    listku: 7,
  },
  hrnek: {
    valec: { r: 5.5 * CM, z1: 10.2 * CM, zaobleni: 1.8 * CM },
    kopule: { z: 9.4 * CM, r: 4.6 * CM, v: 1.8 * CM },
    ucho: { x: 6.3 * CM, z0: 3.6 * CM, z1: 7.4 * CM, r: 2.0 * CM },
    krk: { r: 1.15 * CM, delka: 0.8 * CM },
    chomacek: { rMin: 2.2 * CM, rMax: 3.4 * CM },
    vyska: 15.0 * CM,
    polomer: 8.42 * CM,
    prehyby: { hloubka: 4.4 * MM, od: 6, do: 9 },
    zahybu: 16,
    nafuk: [9.0 * MM, 8.0 * MM, 4.3 * MM, 16.0 * MM, 8.7 * MM],
    visacka: { z: 6.0 * CM, ohyb: 1 },
    kolem: 72,
    prstencu: 38,
    listku: 7,
  },
  cajovka: {
    valec: { r: 5.0 * CM, z1: 9.4 * CM, zaobleni: 1.6 * CM },
    kopule: { z: 8.6 * CM, r: 4.2 * CM, v: 1.7 * CM },
    krk: { r: 1.1 * CM, delka: 0.8 * CM },
    chomacek: { rMin: 2.1 * CM, rMax: 3.2 * CM },
    vyska: 13.9 * CM,
    polomer: 5.15 * CM,
    prehyby: { hloubka: 4.2 * MM, od: 6, do: 8 },
    zahybu: 14,
    nafuk: [7.6 * MM, 7.6 * MM, 4.6 * MM, 17.2 * MM, 0],
    visacka: { z: 5.4 * CM, ohyb: 1 },
    kolem: 64,
    prstencu: 36,
    listku: 7,
  },
};

/** Měkkost spojů mezi primitivy hladkého povrchu (tvar pro srážky má spoje ostré) */
const MEKKOST = 0.8 * CM;
/**
 * Tvar pro srážky je o kus větší než hladký povrch papíru: celá síť (hřbety
 * přehybů, chomáček, provázek s mašličkou, visačka) leží uvnitř, a kam
 * látka dosáhne (nad 1 cm a kde povrch nemíří dolů k pultu — spodek ležící
 * vázy ani zaoblený spodní kraj misky látka nepodleze), je každý
 * vrchol aspoň 3 mm pod povrchem tvaru — látka přehozená přes balík se
 * papíru nedotkne dřív než tvaru. O kolik zvětšit které primitivum, je
 * změřené na 200 semenech (nafuk v rozměrech každého balíku).
 * Válec drží dno na pultu (z0 = 0), u ležící vázy se kvůli tomu zvedne osa.
 */
function nafoukni(q: Primitivum, d: number, drzDno = false): Primitivum {
  if (q.druh === "valec") return { ...q, r: q.r + d, z1: q.z1 + d };
  if (q.druh === "kapsle") return drzDno ? { ...q, a: [q.a[0], q.a[1], q.a[2] + d], b: [q.b[0], q.b[1], q.b[2] + d], r: q.r + d } : { ...q, r: q.r + d };
  return { ...q, polomery: [q.polomery[0] + d, q.polomery[1] + d, q.polomery[2] + d] };
}
/** Posun papíru po normále: dovnitř nejvýš o `dovnitr`, ven měkce nejvýš o `ven` (hřbety se nezploští, jen nepřerostou) */
const posunPapiru = (d: number, ven: number, dovnitr = 6 * MM) => (d < 0 ? Math.max(d, -dovnitr) : ven * (1 - Math.exp(-d / ven)));

interface OdvozenyStazeny {
  n: Stazeny;
  prstence: BodProfilu[];
  /** Kde profil opouští kopuli a stáčí se do krčku */
  zRez: number;
  zKrk0: number;
  zKrk1: number;
  sKrk: number;
  /** Výšky dvou otoček provázku */
  provazek: [number, number];
  /** Obálka chomáčku (elipsoid z tvaru pro srážky): střed z, poloměr do stran, svislá poloosa */
  obal: { z: number; a: number; c: number };
  baze: Pole;
  tvar: TvarTelesa;
}

const odvozene = new Map<string, OdvozenyStazeny>();

/** Hladký profil, krček a tvar pro srážky — z rozměrů, bez náhody (jednou na tvar) */
function odvodStazeny(tvar: Stazene): OdvozenyStazeny {
  const hotovy = odvozene.get(tvar);
  if (hotovy) return hotovy;
  const n = STAZENE[tvar];
  const { valec: v, kopule: k, krk, ucho } = n;
  const f2 = (r: number, z: number) => smin(sdValecRZ(r, z, v.r, 0, v.z1, v.zaobleni), sdElipsoid(r, 0, z - k.z, k.r, k.r, k.v), MEKKOST);
  const obr = obrys(f2, v.z1 / 2, 900);
  /* Kde se kopule nahoře zúží na krček, profil se stočí svisle vzhůru */
  let rez = obr.length - 1;
  for (let i = 0; i < obr.length; i++)
    if (obr[i][1] > v.z1 / 2 && obr[i][0] <= krk.r + 0.7 * CM) {
      rez = i;
      break;
    }
  const body = obr.slice(0, rez + 1);
  const pc = body[rez];
  const pp = body[rez - 3];
  const tc0 = [pc[0] - pp[0], pc[1] - pp[1]];
  const tl = Math.hypot(tc0[0], tc0[1]);
  const q: P2 = [krk.r, pc[1] + 0.45 * CM];
  const d = Math.hypot(q[0] - pc[0], q[1] - pc[1]);
  const b1: P2 = [pc[0] + (tc0[0] / tl) * 0.4 * d, pc[1] + (tc0[1] / tl) * 0.4 * d];
  const b2: P2 = [q[0], q[1] - 0.45 * d];
  for (let i = 1; i <= 10; i++) body.push(bezier2(pc, b1, b2, q, i / 10));
  for (let i = 1; i <= 6; i++) body.push([krk.r, q[1] + (krk.delka * i) / 6]);
  const zKrk1 = q[1] + krk.delka;
  /* Dno je pod kusem (není vidět) — tam stačí řidší prstence */
  const prstence = prevzorkuj(body, n.prstencu, (p) => (p[1] < 0.5 * MM ? 0.3 : p[1] > pc[1] ? 1.25 : 1));
  const zaklad: Pole = (x, y, z) => smin(sdValecRZ(Math.hypot(x, y), z, v.r, 0, v.z1, v.zaobleni), sdElipsoid(x, y, z - k.z, k.r, k.r, k.v), MEKKOST);
  const baze: Pole = ucho ? (x, y, z) => smin(zaklad(x, y, z), sdUsecka(x, y, z, [ucho.x, 0, ucho.z0], [ucho.x, 0, ucho.z1], ucho.r), 1.5 * CM) : zaklad;

  /* Chomáček v obálce: nahoře se jí dotkne svazek uprostřed (nejvyšší místo balíku), do stran špičky lístků */
  const oc = (n.vyska - zKrk1 + 0.35 * CM) / 2;
  const obal = { z: n.vyska - oc, a: n.chomacek.rMax + 0.15 * CM, c: oc };
  const [nTelo, nKopule, nChomacek, nKrk, nUcho] = n.nafuk;
  const primitiva: Primitivum[] = [
    nafoukni({ druh: "valec", r: v.r, z0: 0, z1: v.z1, zaobleni: v.zaobleni }, nTelo),
    nafoukni({ druh: "elipsoid", stred: [0, 0, k.z], polomery: [k.r, k.r, k.v] }, nKopule),
    nafoukni({ druh: "elipsoid", stred: [0, 0, obal.z], polomery: [obal.a, obal.a, obal.c] }, nChomacek),
    /* Krček s provázkem, uzlíkem a mašličkou pod chomáčkem */
    nafoukni({ druh: "elipsoid", stred: [0, 0, (q[1] + zKrk1) / 2 - 0.3 * CM], polomery: [krk.r + 0.9 * CM, krk.r + 0.9 * CM, krk.delka / 2 + 0.6 * CM] }, nKrk),
  ];
  if (ucho) primitiva.push(nafoukni({ druh: "kapsle", a: [ucho.x, 0, ucho.z0], b: [ucho.x, 0, ucho.z1], r: ucho.r }, nUcho));
  const o: OdvozenyStazeny = {
    n,
    prstence,
    zRez: pc[1],
    zKrk0: q[1],
    zKrk1,
    sKrk: prstence[prstence.length - 1].s,
    provazek: [q[1] + 0.2 * CM, q[1] + 0.58 * CM],
    obal,
    baze,
    tvar: { primitiva, vyska: n.vyska, polomer: n.polomer },
  };
  odvozene.set(tvar, o);
  return o;
}

/** Váza leží na boku podél osy x: rulička s konci zakroucenými jako bonbon */
const VAZA = {
  /** Osa ruličky nad pultem, poloměr, polovina rovné části */
  osa: 5.5 * CM,
  r: 5.5 * CM,
  pul: 6.0 * CM,
  /** Zakroucený krček za ramenem */
  zakrut: { r: 1.05 * CM, delka: 1.3 * CM },
  /** Rozevřený konec papíru za krčkem */
  lem: { dMin: 1.7 * CM, dMax: 2.3 * CM, rMin: 2.2 * CM, rMax: 3.2 * CM },
  vyska: 11.15 * CM,
  polomer: 15.84 * CM,
  prehyby: { hloubka: 3.0 * MM, od: 9, do: 12 },
  zahybu: 16,
  /** O kolik je tvar pro srážky větší (tělo, krčky, sukýnky) — viz nafoukni() */
  nafuk: [5.6 * MM, 3.0 * MM, 3.0 * MM],
  kolem: 56,
  prstencu: 46,
  lemu: 6,
};

interface OdvozenaVaza {
  /** Profil od levého krčku po pravý: r = vzdálenost od osy, z = poloha na ose x */
  prstence: BodProfilu[];
  xKrk0: number;
  xKrk1: number;
  sKrk1: number;
  baze: Pole;
  tvar: TvarTelesa;
}
let odvozenaVaza: OdvozenaVaza | null = null;

function odvodVazu(): OdvozenaVaza {
  if (odvozenaVaza) return odvozenaVaza;
  const { osa, r, pul, zakrut } = VAZA;
  const xa = pul + r * 0.92;
  const xb = xa + zakrut.delka + 0.6 * CM;
  const f2 = (x: number, rr: number) =>
    smin(Math.hypot(Math.max(Math.abs(x) - pul, 0), rr) - r, Math.hypot(Math.max(xa - Math.abs(x), 0, Math.abs(x) - xb), rr) - zakrut.r * 1.15, 1.0 * CM);
  /* Paprsky ze středu osy: v polorovině (x, r) od vršku ruličky k pravému konci */
  const obr = obrys((a, b) => f2(b, a), 0, 500, 0, Math.PI / 2).map(([rr, x]) => [x, rr] as P2);
  let rez = obr.length - 1;
  for (let i = 0; i < obr.length; i++)
    if (obr[i][1] <= zakrut.r + 0.35 * CM) {
      rez = i;
      break;
    }
  const pul1 = obr.slice(0, rez + 1);
  const pc = pul1[rez];
  const pp = pul1[rez - 3];
  const tc0 = [pc[0] - pp[0], pc[1] - pp[1]];
  const tl = Math.hypot(tc0[0], tc0[1]);
  const q: P2 = [pc[0] + 0.55 * CM, zakrut.r];
  const d = Math.hypot(q[0] - pc[0], q[1] - pc[1]);
  for (let i = 1; i <= 8; i++) pul1.push(bezier2(pc, [pc[0] + (tc0[0] / tl) * 0.4 * d, pc[1] + (tc0[1] / tl) * 0.4 * d], [q[0] - 0.45 * d, q[1]], q, i / 8));
  for (let i = 1; i <= 6; i++) pul1.push([q[0] + (zakrut.delka * i) / 6, zakrut.r]);
  /* Celý profil zleva doprava; z = poloha na ose, r = poloměr */
  const cely: P2[] = [...pul1.slice(1).reverse().map(([x, rr]) => [-x, rr] as P2), ...pul1];
  const prstence = prevzorkuj(
    cely.map(([x, rr]) => [rr, x] as P2),
    VAZA.prstencu,
    (p) => (Math.abs(p[1]) < pul * 0.9 ? 0.55 : Math.abs(p[1]) > q[0] ? 1.3 : 1),
  );
  const s0 = prstence[Math.floor(prstence.length / 2)].s;
  for (const p of prstence) p.s -= s0;
  const baze: Pole = (x, y, z) => f2(x, Math.hypot(y, z - osa));
  const xLem = q[0] + zakrut.delka;
  const [nTelo, nKrk, nLem] = VAZA.nafuk;
  /* Rulička drží dno na pultu: nafouknutá kapsle zvedne osu; o kousek delší, ať pokryje i spodek ramen */
  const primitiva: Primitivum[] = [nafoukni({ druh: "kapsle", a: [-pul - 0.5 * CM, 0, osa], b: [pul + 0.5 * CM, 0, osa], r }, nTelo, true)];
  for (const st of [-1, 1]) {
    /* Krček i s provázkem a uzlíkem */
    primitiva.push(nafoukni({ druh: "kapsle", a: [st * (q[0] - 0.3 * CM), 0, osa], b: [st * xLem, 0, osa], r: zakrut.r * 1.75 }, nKrk));
    /* Sukýnka je nejširší na konci (trychtýř) — elipsoid sedí víc venku a je dlouhý */
    primitiva.push(nafoukni({ druh: "elipsoid", stred: [st * (xLem + VAZA.lem.dMax * 0.55), 0, osa], polomery: [VAZA.lem.dMax * 1.05, VAZA.lem.rMax + 1.0 * CM, VAZA.lem.rMax + 1.0 * CM] }, nLem));
  }
  odvozenaVaza = { prstence, xKrk0: q[0], xKrk1: xLem, sKrk1: prstence[prstence.length - 1].s, baze, tvar: { primitiva, vyska: VAZA.vyska, polomer: VAZA.polomer } };
  return odvozenaVaza;
}

/** Talíř: plochý balíček, arch přehnutý přes okraj, nahoře okraj archu a provázek křížem */
const TALIR = {
  valec: { r: 11.5 * CM, z1: 3.1 * CM, zaobleni: 1.3 * CM },
  /** O kolik je vnitřek (pod okrajem přehnutého archu) níž */
  vrstva: 1.6 * MM,
  vyska: 3.98 * CM,
  polomer: 11.86 * CM,
  prehyby: { hloubka: 2.0 * MM, od: 22, do: 30 },
  lemy: { hloubka: 2.4 * MM, od: 22, do: 30 },
  zahybu: 16,
  /** O kolik je tvar pro srážky větší (tělo i s provázkem přes okraj, mašlička) — viz nafoukni() */
  nafuk: [7.5 * MM, 3.5 * MM],
  kolem: 112,
  prstencu: 20,
  nahore: 7,
  vnitrek: { kolem: 48, prstencu: 7 },
};

interface OdvozenyTalir {
  /** Profil od středu dna po začátek rovného vršku */
  prstence: BodProfilu[];
  rVrsek: number;
  sVrsek: number;
  baze: Pole;
  tvar: TvarTelesa;
}
let odvozenyTalir: OdvozenyTalir | null = null;

function odvodTalir(): OdvozenyTalir {
  if (odvozenyTalir) return odvozenyTalir;
  const v = TALIR.valec;
  const f2 = (r: number, z: number) => sdValecRZ(r, z, v.r, 0, v.z1, v.zaobleni);
  const obr = obrys(f2, v.z1 / 2, 700);
  const rVrsek = v.r - v.zaobleni * 1.05;
  let rez = obr.length - 1;
  for (let i = 0; i < obr.length; i++)
    if (obr[i][1] > v.z1 / 2 && obr[i][0] <= rVrsek) {
      rez = i;
      break;
    }
  const prstence = prevzorkuj(obr.slice(0, rez + 1), TALIR.prstencu, (p) => (p[1] < 0.5 * MM ? 0.25 : 1));
  const baze: Pole = (x, y, z) => f2(Math.hypot(x, y), z);
  const [nTelo, nMasle] = TALIR.nafuk;
  const primitiva: Primitivum[] = [
    nafoukni({ druh: "valec", r: v.r, z0: 0, z1: v.z1, zaobleni: v.zaobleni }, nTelo),
    /* Mašlička uprostřed vršku */
    nafoukni({ druh: "elipsoid", stred: [0, 0, v.z1 + 0.2 * CM], polomery: [2.6 * CM, 2.6 * CM, TALIR.vyska - v.z1 - 0.2 * CM] }, nMasle),
  ];
  odvozenyTalir = { prstence, rVrsek, sVrsek: prstence[prstence.length - 1].s, baze, tvar: { primitiva, vyska: TALIR.vyska, polomer: TALIR.polomer } };
  return odvozenyTalir;
}

/* ═══ Tvar pro srážky ═══ */

/**
 * Tvar balíku pro srážky — bez DOM, jednou spočítaný na tvar (volá se často,
 * výsledek neměnit). Sjednocení primitiv sedí do papíru na pár milimetrů;
 * `vyska` a `polomer` jsou přesné rozměry sítě (síť se na ně dorovná).
 */
export function tvarBaliku(tvar: TvarBaliku): TvarTelesa {
  if (tvar === "vaza") return odvodVazu().tvar;
  if (tvar === "talir") return odvodTalir().tvar;
  return odvodStazeny(stazeny(tvar)).tvar;
}
/** Neznámý tvar (třeba nový v obchod.ts) se zabalí jako miska */
const stazeny = (tvar: TvarBaliku): Stazene => (tvar in STAZENE ? (tvar as Stazene) : "miska");

/* ═══ Papír: přehyby, záhyby, zmačkání ═══ */

/** Řídký ostrý záhyb v souřadnicích povrchu (oblouk kolem × oblouk po profilu) */
interface Zahyb {
  u: number;
  s: number;
  /** Směr záhybu v rovině (kolem, po profilu) */
  cu: number;
  cs: number;
  delka: number;
  sirka: number;
  /** Kolikrát je jedna ploška záhybu strmější než druhá */
  strmost: number;
  hloubka: number;
}

/** Součet řídkých záhybů v místě (u = úhel kolem, s = oblouk po profilu, r = poloměr tam) */
function zahybyV(z: Zahyb[], u: number, s: number, r: number) {
  let d = 0;
  for (const c of z) {
    const du = zabal(u - c.u) * r;
    const ds = s - c.s;
    const podel = Math.abs(du * c.cu + ds * c.cs) / c.delka;
    if (podel >= 1) continue;
    const napric = (du * c.cs - ds * c.cu) / c.sirka;
    /* Nesouměrný stan: ostrý hřbet, z jedné strany strmá ploška, z druhé pozvolná — světlo chytí jen jednu */
    const k = napric < 0 ? -napric * c.strmost : napric / c.strmost;
    if (k >= 1) continue;
    d += c.hloubka * (1 - k) * (1 - hladce(0.5, 1, podel));
  }
  return d;
}

function nahodneZahyby(r: () => number, pocet: number, sOd: number, sDo: number, uprednost: (s: number) => number): Zahyb[] {
  return Array.from({ length: pocet }, () => {
    const s = mix(sOd, sDo, r());
    /* Většinou po profilu (jak se papír stahuje), občas napříč */
    const a = uprednost(s) + (r() - 0.5) * (r() < 0.25 ? 2.4 : 0.8);
    return {
      u: r() * TAU,
      s,
      cu: Math.sin(a),
      cs: Math.cos(a),
      delka: mix(3.0, 7.5, r()) * CM,
      sirka: mix(0.8, 1.25, r()) * CM,
      strmost: mix(1.2, 2.2, r()),
      hloubka: (r() < 0.45 ? 1 : -1) * mix(2.0, 3.6, r()) * MM,
    };
  });
}

/**
 * Zmačkání: dvě oktávy hřbetového šumu v prostoru (m). Plošky kolem 2–3 cm
 * (jemnější by síť s roztečí ~6 mm neunesla), sklon do stran silný, posun malý.
 */
const zmackani = (sum: Pole, p: V3, sila: number) =>
  sila * (4.6 * MM * hrbet(sum(p[0] / (3.2 * CM), p[1] / (3.2 * CM), p[2] / (3.2 * CM))) + 1.9 * MM * hrbet(sum(p[0] / (1.6 * CM) + 17.3, p[1] / (1.6 * CM) - 4.1, p[2] / (1.6 * CM) + 9.7)));

/** Fáze přehybů ke krčku: nepravidelně rozložené (zkřivená fáze), hloubka každého jiná */
function vytvorPrehyby(r: () => number, od: number, doP: number) {
  const pocet = od + Math.floor(r() * (doP - od + 1));
  const krivost = vlna(r, 1, 3);
  const hloubka = vlna(r, 2, 6);
  return {
    pocet,
    /* Zkřivení je dost malé, aby fáze pořád rostla — přehyby se nepřekříží, jen jsou různě daleko od sebe */
    faze: (u: number) => pocet * u + 0.19 * pocet * krivost(u),
    sila: (u: number) => 0.72 + 0.4 * hloubka(u),
  };
}

/* ═══ Balík se staženým vrškem: miska, hrnek, čajovka ═══ */

interface Casti {
  papir: Stavba;
  provazek: Stavba;
  visacka: Stavba;
}

function zabalStazeny(tvar: Stazene, seme: number): Casti {
  const D = odvodStazeny(tvar);
  const n = D.n;
  const r = nahoda(seme);
  const sum = vytvorSum(r);
  const papir = new Stavba();
  const provazek = new Stavba();
  const visacka = new Stavba();
  const N = n.kolem;
  const P = D.prstence;
  const J = P.length;
  /* Natočení archu: jiná část novin míří ke kameře, cípy archu jinde */
  const psi = r() * TAU;
  const S = ARCH;
  const pr = vytvorPrehyby(r, n.prehyby.od, n.prehyby.do);
  const zkrut = (r() - 0.5) * 1.2;

  /* ——— Hladký povrch (mřížka po prstencích), ucho hrnku vyboulí papír ——— */
  const baze: V3[][] = [];
  for (let j = 0; j < J; j++) {
    const radek: V3[] = [];
    for (let i = 0; i < N; i++) {
      const u = (i / N) * TAU;
      let p: V3 = [P[j].r * Math.cos(u), P[j].r * Math.sin(u), P[j].z];
      if (n.ucho && j > 0 && Math.abs(zabal(u)) < 1.5 && P[j].z < D.zRez) {
        const d: V3 = [Math.cos(u), Math.sin(u), 0];
        if (D.baze(p[0], p[1], p[2]) < 0) p = vychod(D.baze, p, d, 0.08);
      }
      radek.push(p);
    }
    baze.push(radek);
  }
  const normalaBaze = (j: number, i: number): V3 => {
    if (j === 0) return [0, 0, -1];
    const a = baze[j][(i + 1) % N], b = baze[j][(i + N - 1) % N];
    const c = baze[Math.min(j + 1, J - 1)][i], d = baze[j - 1][i];
    return jedn(krizem(odecti(a, b), odecti(c, d)));
  };

  /* ——— Visačka: rám na hladkém povrchu vepředu ——— */
  const uVis = -Math.PI / 2 + (r() - 0.5) * 0.5;
  const stredVis = vychod(D.baze, [0, 0, n.visacka.z], [Math.cos(uVis), Math.sin(uVis), 0]);
  const rv = ramec(D.baze, stredVis, [0, 0, 1], (r() - 0.5) * 0.28);

  /* ——— Záhyby a zmačkání ——— */
  const zahyby = nahodneZahyby(r, n.zahybu, P[2].s, D.sKrk - 1.2 * CM, () => 0);
  const vrchol = (j: number, i: number): V3 => {
    const p = baze[j][i];
    if (j === 0) return p;
    const { r: rr, z, s } = P[j];
    const u = (i / N) * TAU;
    const nb = normalaBaze(j, i);
    /* Přebytek archu: kolikrát je kruh archu delší než obvod balíku tady — tolik se papír skládá */
    const E = s / Math.max(rr, 1 * MM);
    const hl = Math.min(n.prehyby.hloubka * Math.pow(omez((E - 1.05) / 1.4), 0.8), 0.24 * rr);
    const fz = hladce(0.1 * CM, 1.5 * CM, z);
    const vKrku = hladce(D.zRez, D.zKrk0, z);
    let d = hl * pr.sila(u) * (prehyb(pr.faze(u) + zkrut * (s / D.sKrk)) - 0.3);
    d += (1 - vKrku) * (zahybyV(zahyby, u, s, rr) + zmackani(sum, p, 1));
    d = fz * posunPapiru(d, 1.6 * MM);
    /* Pod visačkou je papír přimáčknutý */
    const m = podVisackou(rv, p);
    if (m > 0) d = mix(d, 0.4 * Math.min(d, 0), m);
    return pricti(p, nb, d);
  };
  const uvArchu = (s: number, u: number): [number, number] => [0.5 + (s / S) * Math.cos(u + psi), 0.5 + (s / S) * Math.sin(u + psi)];

  const mriz: number[][] = [];
  const stred = papir.bod(baze[0][0], 0.5, 0.5);
  mriz.push(Array.from({ length: N }, () => stred));
  for (let j = 1; j < J; j++)
    mriz.push(
      Array.from({ length: N }, (_, i) => {
        const [tu, tv] = uvArchu(P[j].s, (i / N) * TAU);
        return papir.bod(vrchol(j, i), tu, tv, normalaBaze(j, i));
      }),
    );

  /*
   * ——— Chomáček: lístky z cípů archu kolem, uprostřed zmačkaný svazek ———
   * Špičky lístků leží na obálce chomáčku (nebo kousek pod ní) a z obálky
   * je nafouknutý elipsoid tvaru pro srážky, takže látka přes ně
   * nepropadne; nejvýš je svazek uprostřed.
   */
  const rk = n.krk.r;
  const zk = D.zKrk1;
  const ob = D.obal;
  const w1 = vlna(r, 2, 6), w2 = vlna(r, 2, 6), w3 = vlna(r, 1, 4);
  const z1 = r() * TAU, z2 = r() * TAU;
  const listy = Array.from({ length: N }, (_, i) => {
    const u = (i / N) * TAU;
    const roh = 1 / Math.max(Math.abs(Math.cos(u + psi)), Math.abs(Math.sin(u + psi)));
    const e = (roh - 1) / (Math.SQRT2 - 1);
    /* Kde na obálce: v rozích archu lístek vyšší a strmější, jinde se rozevře do strany */
    const beta = (34 + 44 * omez(0.55 + 0.5 * w1(u) - 0.35 * e)) * (Math.PI / 180);
    const kratsi = 1 - 0.14 * omez(0.45 + 0.7 * w2(u));
    return {
      R: ob.a * Math.sin(beta) * kratsi,
      Z: ob.z + ob.c * Math.cos(beta) * kratsi,
      /* Konec lístku míří šikmo vzhůru, delší se ke špičce převisí */
      sklon: (-50 + 62 * omez(0.35 + 0.45 * w3(u) + 0.3 * e)) * (Math.PI / 180),
      /* Roztřepený okraj: lístky různě dlouhé, ostré zářezy */
      konec: 1 - 0.16 * Math.sqrt(Math.abs(Math.sin(11 * u + z1) * Math.sin(5 * u + z2))),
      okraj: (S / 2) * 0.985 * roh,
    };
  });
  /** Bod lístku nesmí z obálky ven: poloměr se stáhne na její povrch */
  const vObalu = (rr: number, z: number) => {
    const q = (z - ob.z) / ob.c;
    const meze = ob.a * Math.sqrt(Math.max(0, 1 - q * q)) - 1 * MM;
    return Math.min(rr, Math.max(meze, 0.4 * rk));
  };
  const K = n.listku;
  const hlKrk = Math.min(n.prehyby.hloubka, 0.24 * rk);
  const chom: V3[][] = [];
  for (let k = 1; k <= K; k++) {
    const tau = k / K;
    chom.push(
      listy.map((l, i) => {
        const u = (i / N) * TAU;
        const t = tau * l.konec;
        const p0: P2 = [rk, zk];
        const p3: P2 = [l.R, l.Z];
        const dl = Math.hypot(p3[0] - p0[0], p3[1] - p0[1]);
        const b = bezier2(p0, [rk + 0.04 * dl, zk + 0.5 * dl], [p3[0] - 0.42 * dl * Math.cos(l.sklon), p3[1] + 0.42 * dl * Math.sin(l.sklon)], p3, t);
        /* Řasení: přehyby od krčku pokračují do lístků a ke špičkám se prohlubují — už jen dovnitř */
        const hl = pr.sila(u) * (hlKrk + (0.55 * CM - hlKrk) * Math.pow(t, 1.1));
        const f = prehyb(pr.faze(u) + zkrut + 0.8 * t);
        const w = hladce(0, 0.4, t);
        const rr = vObalu(b[0] + hl * ((1 - w) * f + (w * (f - 1)) / 2), b[1]);
        return [rr * Math.cos(u), rr * Math.sin(u), b[1]];
      }),
    );
  }
  /* Zmačkání lístků po normále (normály z hrubé mřížky chomáčku) */
  const chomZ: V3[][] = chom.map((radek, k) =>
    radek.map((p, i) => {
      const dolu = k === 0 ? baze[J - 1][i] : chom[k - 1][i];
      const nahoru = chom[Math.min(k + 1, K - 1)][i];
      const nn = jedn(krizem(odecti(radek[(i + 1) % N], radek[(i + N - 1) % N]), odecti(nahoru, dolu)));
      const tau = (k + 1) / K;
      return pricti(p, nn, hladce(0, 0.4, tau) * 0.9 * zmackani(sum, [p[0] * 1.3, p[1] * 1.3, p[2] * 1.3], 1));
    }),
  );
  for (let k = 0; k < K; k++)
    mriz.push(
      chomZ[k].map((p, i) => {
        const l = listy[i];
        const s = D.sKrk + ((k + 1) / K) * l.konec * (l.okraj - D.sKrk);
        const [tu, tv] = uvArchu(s, (i / N) * TAU);
        return papir.bod(p, tu, tv);
      }),
    );
  plocha(papir, mriz, true);

  /* Rub lístků: tatáž plocha o tloušťku papíru dovnitř, otočená; dole ji zavře zmačkaný svazek */
  const nLic = papir.normaly();
  const rubMriz = mriz.slice(J - 1).map((radek) =>
    radek.map((k) => {
      const p = papir.misto(k);
      return papir.bod([p[0] - nLic[k * 3] * TLOUSTKA, p[1] - nLic[k * 3 + 1] * TLOUSTKA, p[2] - nLic[k * 3 + 2] * TLOUSTKA], papir.t[k * 2], papir.t[k * 2 + 1]);
    }),
  );
  plocha(papir, rubMriz, true, true);
  /*
   * Svazek uprostřed: přebytek archu zmačkaný do chomáče — laloky stočené
   * vzhůru, hvězda přehybů, nerovný vršek. Nahoře je nejvyšší místo balíku.
   */
  const SV = 4;
  const laloky = vlna(r, 2, 4), vrsek = vlna(r, 3, 7);
  const svazek: number[][] = [rubMriz[0].map((k) => papir.bod(papir.misto(k), papir.t[k * 2], papir.t[k * 2 + 1]))];
  for (let k = 1; k <= SV; k++) {
    const t = k / (SV + 1);
    svazek.push(
      Array.from({ length: N }, (_, i) => {
        const u = (i / N) * TAU;
        const lalok = 1 + 0.55 * laloky(u + 1.4 * t);
        /* Tupý, hrbolatý vršek (ne špička): poloměr ubývá až u konce */
        const rr = 0.9 * rk * Math.sqrt(1 - t * t) * lalok + hlKrk * (1 - t) * (prehyb(pr.faze(u) + zkrut - 2.2 * t) - 0.3);
        const z = zk + (n.vyska - zk) * (1 - Math.pow(1 - t, 1.5)) * (1 + 0.14 * t * vrsek(u));
        const p: V3 = [rr * Math.cos(u), rr * Math.sin(u), z];
        const [tu, tv] = uvArchu(D.sKrk + 0.35 * t * (listy[i].okraj - D.sKrk), u);
        return papir.bod(pricti(p, [Math.cos(u), Math.sin(u), 0.6], 0.8 * zmackani(sum, [p[0] * 1.5, p[1] * 1.5, p[2] * 1.5], 1)), tu, tv);
      }),
    );
  }
  const spicka = papir.bod([0, 0, n.vyska], ...uvArchu(D.sKrk, 0));
  svazek.push(Array.from({ length: N }, () => spicka));
  plocha(papir, svazek, true);

  /* ——— Provázek: dvě otočky kolem krčku, mašlička stranou od visačky ——— */
  const [zs1, zs2] = D.provazek;
  let rKrk = 0;
  for (let j = 0; j < J; j++) {
    if (P[j].z < zs1 - 2.5 * MM || P[j].z > zs2 + 2.5 * MM) continue;
    for (const k of mriz[j]) rKrk = Math.max(rKrk, Math.hypot(papir.p[k * 3], papir.p[k * 3 + 1]));
  }
  const rs = rKrk + R_PROVAZKU * 0.55;
  const strana = r() < 0.5 ? -1 : 1;
  const uUzel = uVis + strana * (0.95 + 0.35 * r());
  const kroku = 64;
  const otocky: V3[] = Array.from({ length: kroku + 1 }, (_, i) => {
    const t = i / kroku;
    const u = uUzel + t * 2 * TAU;
    return [rs * Math.cos(u), rs * Math.sin(u), mix(zs1, zs2, t)];
  });
  trubka(provazek, otocky, R_PROVAZKU, 5);
  const ven: V3 = [Math.cos(uUzel), Math.sin(uUzel), 0];
  const tecna: V3 = [-Math.sin(uUzel), Math.cos(uUzel), 0];
  const uzel = pricti(krat(ven, rs + 1.6 * MM), [0, 0, 1], (zs1 + zs2) / 2);
  uzlik(provazek, uzel, krat(tecna, 3.6 * MM), krat(ven, 2.6 * MM), [0, 0, 3.0 * MM]);
  masle(provazek, D.baze, uzel, ven, tecna, [0, 0, 1], r);

  /* ——— Visačka a nitka od provázku ——— */
  const dirka = postavVisacku(visacka, D.baze, rv, n.visacka.ohyb, 1.3 * MM);
  const uNit = uVis + 0.12 * strana;
  const tn = zabal(uNit - uUzel) / (2 * TAU);
  const zacatek: V3 = [rs * Math.cos(uNit), rs * Math.sin(uNit), mix(zs1, zs2, tn < 0 ? tn + 0.5 : tn)];
  nitka(provazek, D.baze, zacatek, dirka, rv);

  return { papir, provazek, visacka };
}

/**
 * Mašlička: dvě smyčky převislé dolů do stran a dva konce, které leží po
 * papíru. Rám v místě uzlu: `ven` od balíku, `tecna` kolem, `nahoru`.
 */
function masle(s: Stavba, f: Pole, uzel: V3, ven: V3, tecna: V3, nahoru: V3, r: () => number) {
  for (const st of [-1, 1]) {
    const pokles = (16 + 22 * r()) * (Math.PI / 180);
    const e1 = jedn(pricti(pricti(krat(tecna, st * Math.cos(pokles)), nahoru, -Math.sin(pokles)), ven, 0.35));
    const e2 = jedn(odecti(nahoru, krat(e1, tecka(nahoru, e1))));
    const dl = mix(1.05, 1.45, r()) * CM;
    const sir = mix(0.42, 0.6, r()) * CM;
    const smycka = Array.from({ length: 17 }, (_, i) => {
      const a = (i / 16) * TAU;
      return pricti(pricti(uzel, e1, (dl / 2) * (1 - Math.cos(a))), e2, (sir / 2) * Math.sin(a) * (0.6 + 0.4 * (1 - Math.cos(a)) / 2));
    });
    trubka(s, venku(f, smycka, R_PROVAZKU + 0.6 * MM), R_PROVAZKU * 0.92, 4, false);
    /* Konec provázku: visí dolů, trochu do strany, po papíru */
    const dk = mix(1.0, 1.6, r()) * CM;
    const smer = jedn(pricti(pricti(krat(tecna, st * 0.38), nahoru, -1), ven, 0.25));
    const konec = Array.from({ length: 8 }, (_, i) => {
      const t = i / 7;
      return pricti(pricti(uzel, smer, dk * t), tecna, st * 0.25 * CM * t * t);
    });
    trubka(s, venku(f, konec, R_PROVAZKU + 0.5 * MM), R_PROVAZKU * 0.9, 4);
  }
}

/** Nitka visačky od provázku k dírce: oblouk, který leží po papíru */
function nitka(s: Stavba, f: Pole, od: V3, dirka: V3, rv: Ramec) {
  const a = pricti(od, jedn(odecti(dirka, od)), 0.6 * CM);
  const b = pricti(dirka, rv.nahoru, 0.9 * CM);
  const odstup = R_NITKY + 1.0 * MM;
  /* Uprostřed nitka leží na papíru (tíhou), u konců drží provázek a dírku */
  const cesta = Array.from({ length: 16 }, (_, i) => {
    const t = i / 15;
    const p = bezier3(od, a, b, dirka, t);
    const q = napovrch(f, p);
    const na = pricti(q, spad(f, q), odstup);
    const w = hladce(0, 0.3, t) * (1 - hladce(0.82, 1, t));
    return [mix(p[0], na[0], w), mix(p[1], na[1], w), mix(p[2], na[2], w)] as V3;
  });
  trubka(s, venku(f, cesta, odstup), R_NITKY, 4);
}

/* ═══ Váza na boku ═══ */

function zabalVazu(seme: number): Casti {
  const D = odvodVazu();
  const r = nahoda(seme);
  const sum = vytvorSum(r);
  const papir = new Stavba();
  const provazek = new Stavba();
  const visacka = new Stavba();
  const N = VAZA.kolem;
  const P = D.prstence;
  const J = P.length;
  const S = ARCH;
  const osa = VAZA.osa;
  const R0 = VAZA.r;
  /* Úhel kolem osy: 0 nahoře, π/2 vpředu (−y); šev archu je dole na pultu */
  const bod = (x: number, rr: number, th: number): V3 => [x, -rr * Math.sin(th), osa + rr * Math.cos(th)];
  const pr = vytvorPrehyby(r, VAZA.prehyby.od, VAZA.prehyby.do);
  const zkrut = [(0.8 + 0.6 * r()) * (r() < 0.5 ? -1 : 1), (0.8 + 0.6 * r()) * (r() < 0.5 ? -1 : 1)];
  /* Svinutý arch: u podél osy, v kolem; vršek ruličky je kousek od středu archu */
  const v0 = 0.5 + (r() - 0.5) * 0.08;

  /* Visačka nahoře na ruličce, nitka k jednomu z krčků */
  const strana = r() < 0.5 ? -1 : 1;
  const thVis = (18 + 12 * r()) * (Math.PI / 180);
  const xVis = strana * (2.4 + 1.4 * r()) * CM;
  const stredVis = vychod(D.baze, [xVis, 0, osa], jedn(odecti(bod(xVis, 1, thVis), [xVis, 0, osa])));
  const rv = ramec(D.baze, stredVis, [0, Math.cos(thVis), Math.sin(thVis)], (r() - 0.5) * 0.35);

  const zahyby = nahodneZahyby(r, VAZA.zahybu, P[0].s + 1 * CM, P[J - 1].s - 1 * CM, () => Math.PI / 2);
  /** Fáze šroubovice: na ramenou se přehyby stáčejí, na krčku papír kroutí naplno */
  const kroutí = (x: number) =>
    zkrut[x < 0 ? 0 : 1] * (5 * Math.pow(omez((Math.abs(x) - VAZA.pul) / (D.xKrk0 - VAZA.pul)), 2) + 6 * omez((Math.abs(x) - D.xKrk0) / (D.xKrk1 - D.xKrk0)));
  /** Sloupec i (0…N): poslední je šev — stejné místo jako první, uv o obvod dál */
  const uhel = (i: number) => Math.PI + ((i % N) / N) * TAU;
  const vSloupce = (i: number) => (i === N ? v0 + (Math.PI * R0) / S : v0 + (zabal(uhel(i)) * R0) / S);
  const mriz: number[][] = [];
  for (let j = 0; j < J; j++) {
    const { r: rr, z: x, s } = P[j];
    /* Normála z profilu: na ramenou se sklání podél osy */
    const a = P[Math.max(j - 1, 0)], b = P[Math.min(j + 1, J - 1)];
    const dx = b.z - a.z, dr = b.r - a.r, dd = Math.hypot(dx, dr) || 1;
    const radek: number[] = [];
    for (let i = 0; i <= N; i++) {
      const th = uhel(i);
      const p = bod(x, rr, th);
      const nb: V3 = [-dr / dd, (-dx / dd) * Math.sin(th), (dx / dd) * Math.cos(th)];
      /* Přebytek obvodu na ramenou: tam se papír skládá */
      const E = R0 / Math.max(rr, 1 * MM);
      const hl = Math.min(VAZA.prehyby.hloubka * Math.pow(omez((E - 1.05) / 1.2), 0.8), 0.24 * rr);
      const vKrku = hladce(D.xKrk0 - 0.8 * CM, D.xKrk0, Math.abs(x));
      let d = hl * pr.sila(th) * (prehyb(pr.faze(th) + kroutí(x)) - 0.3);
      d += (1 - vKrku) * (zahybyV(zahyby, th, s, rr) + zmackani(sum, p, 1));
      d = hladce(0.1 * CM, 1.4 * CM, p[2]) * posunPapiru(d, 1.6 * MM);
      /* Spodkem leží rulička na pultu: papír je tam přimáčknutý, ven se nevyboulí */
      d = mix(d, Math.min(d, 0), hladce(-0.05, -0.4, nb[2]));
      const m = podVisackou(rv, p);
      if (m > 0) d = mix(d, 0.4 * Math.min(d, 0), m);
      radek.push(papir.bod(pricti(p, nb, d), 0.5 + s / S, vSloupce(i), nb));
    }
    mriz.push(radek);
  }
  plocha(papir, mriz, false);

  /* Konce jako bonbon: za krčkem se papír rozevře do řasené sukýnky (oboustranné) */
  const { dMin, dMax, rMin, rMax } = VAZA.lem;
  const K = VAZA.lemu;
  for (const st of [-1, 1]) {
    const wa = vlna(r, 2, 6), wb = vlna(r, 2, 5);
    const z1 = r() * TAU;
    /* Nejdelší cíp sukýnky je vždy stejně dlouhý — balík má pokaždé stejnou délku */
    let dlNej = 0;
    for (let i = 0; i < N; i++) dlNej = Math.max(dlNej, omez(0.5 + 0.6 * wb(uhel(i))));
    const okraj = st < 0 ? mriz[0] : mriz[J - 1];
    const sKonec = st < 0 ? P[0].s : P[J - 1].s;
    const rz = VAZA.zakrut.r;
    /* Hladké prstence sukýnky (s řasením), pak zmačkání po normále */
    const hrube: V3[][] = [Array.from({ length: N }, (_, i) => papir.misto(okraj[i]))];
    for (let k = 1; k <= K; k++)
      hrube.push(
        Array.from({ length: N }, (_, i) => {
          const th = uhel(i);
          const t = (k / K) * (1 - 0.18 * Math.sqrt(Math.abs(Math.sin(9 * th + z1))));
          const dl = mix(dMin, dMax, omez(0.5 + 0.6 * wb(th)) / dlNej);
          const R = mix(rMin, rMax, omez(0.5 + 0.7 * wa(th)));
          const hl = pr.sila(th) * (0.24 * rz + 0.45 * CM * Math.pow(t, 1.1));
          const rr = rz + (R - rz) * (1 - Math.pow(1 - t, 1.7)) + hl * prehyb(pr.faze(th) + kroutí(st * D.xKrk1) + t);
          return bod(st * (D.xKrk1 + dl * t), rr, th);
        }),
      );
    const lem: number[][] = [okraj];
    for (let k = 1; k <= K; k++) {
      const radek = hrube[k].map((p, i) => {
        const nn = jedn(krizem(odecti(hrube[k][(i + 1) % N], hrube[k][(i + N - 1) % N]), odecti(hrube[Math.min(k + 1, K)][i], hrube[k - 1][i])));
        const q = pricti(p, nn, hladce(0, 0.5, k / K) * 1.3 * zmackani(sum, p, 1));
        return papir.bod(q, 0.5 + (sKonec + st * (k / K) * ((S / 2) * 0.97 - Math.abs(sKonec))) / S, vSloupce(i));
      });
      radek.push(papir.bod(papir.misto(radek[0]), papir.t[radek[0] * 2], vSloupce(N)));
      lem.push(radek);
    }
    /* Vlevo jdou prstence proti ose x — tam se líc otočí */
    plocha(papir, lem, false, st < 0);
    const nLic = papir.normaly();
    const rub = lem.map((radek) =>
      radek.map((k) => {
        const p = papir.misto(k);
        return papir.bod([p[0] - nLic[k * 3] * TLOUSTKA, p[1] - nLic[k * 3 + 1] * TLOUSTKA, p[2] - nLic[k * 3 + 2] * TLOUSTKA], papir.t[k * 2], papir.t[k * 2 + 1]);
      }),
    );
    plocha(papir, rub, false, st > 0);
    const zatka = papir.bod([st * (D.xKrk1 + 0.15 * CM), 0, osa], 0.5 + (st * (Math.abs(sKonec) + 0.5 * CM)) / S, v0);
    for (let i = 0; i < N; i++) st > 0 ? papir.troj(zatka, rub[0][i], rub[0][i + 1]) : papir.troj(zatka, rub[0][i + 1], rub[0][i]);
  }

  /* Provázek kolem obou krčků: dvě otočky a uzlík s krátkými konci */
  let rKrk = 0;
  const xm = (D.xKrk0 + D.xKrk1) / 2;
  for (let j = 0; j < J; j++) {
    if (Math.abs(Math.abs(P[j].z) - xm) > 0.45 * CM) continue;
    for (const k of mriz[j]) rKrk = Math.max(rKrk, Math.hypot(papir.p[k * 3 + 1], papir.p[k * 3 + 2] - osa));
  }
  const rs = rKrk + R_PROVAZKU * 0.55;
  const uzly: V3[] = [];
  for (const st of [-1, 1]) {
    const th0 = (25 + 30 * r()) * (Math.PI / 180);
    const kroku = 52;
    const otocky = Array.from({ length: kroku + 1 }, (_, i) => {
      const t = i / kroku;
      return bod(st * (xm - 0.19 * CM + 0.38 * CM * t), rs, th0 + t * 2 * TAU);
    });
    trubka(provazek, otocky, R_PROVAZKU, 5);
    const ven = jedn(odecti(bod(0, 1, th0), [0, 0, osa]));
    const uzel = pricti(bod(st * xm, rs + 1.5 * MM, th0), [0, 0, 0]);
    uzlik(provazek, uzel, [3.4 * MM, 0, 0], krat(ven, 2.5 * MM), krizem([1, 0, 0], krat(ven, 2.8 * MM)));
    for (const k of [-1, 1]) {
      const dk = mix(0.7, 1.2, r()) * CM;
      const smer = jedn(pricti(pricti([st * 0.5 + k * 0.35, 0, 0], ven, 0.25), [0, 0, -1], 1));
      const konec = Array.from({ length: 9 }, (_, i) => pricti(uzel, smer, (dk * i) / 8));
      trubka(provazek, venku(D.baze, konec, R_PROVAZKU + 0.5 * MM), R_PROVAZKU * 0.9, 5);
    }
    uzly.push(uzel);
  }
  const dirka = postavVisacku(visacka, D.baze, rv, 1, 1.3 * MM);
  nitka(provazek, D.baze, uzly[strana < 0 ? 0 : 1], dirka, rv);
  return { papir, provazek, visacka };
}

/* ═══ Talíř ═══ */

function zabalTalir(seme: number): Casti {
  const D = odvodTalir();
  const r = nahoda(seme);
  const sum = vytvorSum(r);
  const papir = new Stavba();
  const provazek = new Stavba();
  const visacka = new Stavba();
  const N = TALIR.kolem;
  const P = D.prstence;
  const J = P.length;
  const S = ARCH;
  const v = TALIR.valec;
  const psi = r() * TAU;
  const pr = vytvorPrehyby(r, TALIR.prehyby.od, TALIR.prehyby.do);
  const lemy = vytvorPrehyby(r, TALIR.lemy.od, TALIR.lemy.do);
  const uvArchu = (s: number, u: number): [number, number] => [0.5 + (s / S) * Math.cos(u + psi), 0.5 + (s / S) * Math.sin(u + psi)];

  /* Provázek křížem (natočený o kousek), visačka v jedné z předních čtvrtin */
  const krizU = (r() - 0.5) * 0.3;
  const strana = r() < 0.5 ? -1 : 1;
  const uVis = -Math.PI / 2 + strana * (0.72 + 0.12 * r()) + krizU;
  const pVis: V3 = [6.2 * CM * Math.cos(uVis), 6.2 * CM * Math.sin(uVis), v.z1];
  const rv = ramec(D.baze, pVis, [Math.cos(uVis + Math.PI) * 0.35, 1, 0], (r() - 0.5) * 0.3 - strana * 0.25);

  /*
   * Okraje přehnutých chlopní nahoře: čtyři rovné hrany archu (jedna od
   * každé strany), mezi nimi je vidět spodní arch. Mnohoúhelník je kolem
   * středu hvězdicový, takže ho mřížka po paprscích sleduje přesně.
   */
  const hrany = [0, 1, 2, 3].map((k) => ({ u: psi + (k * Math.PI) / 2 + (r() - 0.5) * 0.3, d: mix(2.3, 4.4, r()) * CM }));
  const rOkraj = (u: number) => {
    let m = D.rVrsek - 1.5 * CM;
    for (const h of hrany) {
      const c = Math.cos(u - h.u);
      if (c > 1e-3) m = Math.min(m, h.d / c);
    }
    return m;
  };
  const zahyby = nahodneZahyby(r, TALIR.zahybu, P[3].s, D.sVrsek + 4 * CM, () => 0);
  const posun = (p: V3, nb: V3, u: number, s: number, rr: number, z: number, horni: number) => {
    const E = s / Math.max(rr, 1 * MM);
    let d = TALIR.prehyby.hloubka * pr.sila(u) * Math.pow(omez((E - 1.2) / 2.2), 0.8) * prehyb(pr.faze(u)) * horni;
    /* Lemy: krátké ostré přehyby, kde se papír láme přes okraj */
    const lem = hladce(D.rVrsek - 2.5 * CM, D.rVrsek, rr) * hladce(0.4 * CM, 1.6 * CM, z);
    d += lem * TALIR.lemy.hloubka * lemy.sila(u) * prehyb(lemy.faze(u));
    d += zahybyV(zahyby, u, s, rr) + zmackani(sum, p, 0.8);
    d = hladce(0.1 * CM, 1.0 * CM, z) * posunPapiru(d, 1.2 * MM, 4 * MM);
    const m = podVisackou(rv, p);
    if (m > 0) d = mix(d, 0.4 * Math.min(d, 0), m);
    return pricti(p, nb, d);
  };

  const mriz: number[][] = [];
  const dno = papir.bod([0, 0, 0], 0.5, 0.5);
  mriz.push(Array.from({ length: N }, () => dno));
  for (let j = 1; j < J; j++) {
    const { r: rr, z, s } = P[j];
    const a = P[Math.max(j - 1, 0)], b = P[Math.min(j + 1, J - 1)];
    const tn = [b.r - a.r, b.z - a.z];
    const tl = Math.hypot(tn[0], tn[1]);
    mriz.push(
      Array.from({ length: N }, (_, i) => {
        const u = (i / N) * TAU;
        const nb: V3 = [(tn[1] / tl) * Math.cos(u), (tn[1] / tl) * Math.sin(u), -tn[0] / tl];
        const [tu, tv] = uvArchu(s, u);
        return papir.bod(posun([rr * Math.cos(u), rr * Math.sin(u), z], nb, u, s, rr, z, 0), tu, tv, nb);
      }),
    );
  }
  /* Vršek pod přehnutým archem: od hrany dovnitř k okraji archu */
  const K = TALIR.nahore;
  const okraje = Array.from({ length: N }, (_, i) => rOkraj((i / N) * TAU));
  for (let k = 1; k <= K; k++) {
    mriz.push(
      Array.from({ length: N }, (_, i) => {
        const u = (i / N) * TAU;
        const rr = mix(D.rVrsek, okraje[i], k / K);
        const s = D.sVrsek + (D.rVrsek - rr);
        const [tu, tv] = uvArchu(s, u);
        return papir.bod(posun([rr * Math.cos(u), rr * Math.sin(u), v.z1], [0, 0, 1], u, s, rr, v.z1, 1), tu, tv, [0, 0, 1]);
      }),
    );
  }
  plocha(papir, mriz, true);
  /* Hrana archu: svislý schodek dolů na vnitřek (zvlášť vrcholy, ať je hrana ostrá) */
  const horni = mriz[mriz.length - 1];
  const hrana = [
    horni.map((k) => papir.bod(papir.misto(k), papir.t[k * 2], papir.t[k * 2 + 1])),
    horni.map((k) => {
      const p = papir.misto(k);
      return papir.bod([p[0], p[1], v.z1 - TALIR.vrstva - 0.5 * MM], papir.t[k * 2], papir.t[k * 2 + 1]);
    }),
  ];
  plocha(papir, hrana, true);
  /* Vnitřek: rovný kus jiného místa archu (rovné sloupce textu), lehce zmačkaný */
  const Nv = TALIR.vnitrek.kolem;
  const Kv = TALIR.vnitrek.prstencu;
  const psi2 = r() * TAU;
  const vnitrek: number[][] = [];
  for (let k = 0; k <= Kv; k++) {
    const t = k / Kv;
    vnitrek.push(
      Array.from({ length: Nv }, (_, i) => {
        const u = (i / Nv) * TAU;
        const rr = rOkraj(u) * (1 - t) + 0.4 * MM;
        const x = rr * Math.cos(u), y = rr * Math.sin(u);
        const z = v.z1 - TALIR.vrstva + 0.4 * MM * t + hladce(0, 0.7, t) * 0.5 * zmackani(sum, [x, y, v.z1], 1);
        const tu = 0.5 + (x * Math.cos(psi2) - y * Math.sin(psi2)) / S + 0.18;
        const tv = 0.5 + (x * Math.sin(psi2) + y * Math.cos(psi2)) / S - 0.12;
        return papir.bod([x, y, z], tu, tv);
      }),
    );
  }
  /* Prstence jdou od okraje ke středu a kolem proti směru hodin — líc míří nahoru */
  const stredV = papir.bod([0, 0, v.z1 - TALIR.vrstva + 0.4 * MM], 0.5 + 0.18, 0.5 - 0.12);
  vnitrek.push(Array.from({ length: Nv }, () => stredV));
  plocha(papir, vnitrek, true);

  /* ——— Provázek křížem přes vršek a dolů přes okraj (pod dnem není vidět) ——— */
  const zNad = v.z1 + R_PROVAZKU + 0.4 * MM;
  const profil = obrys((rr, z) => sdValecRZ(rr, z, v.r, 0, v.z1, v.zaobleni), v.z1 / 2, 160, Math.atan2(0.45 * CM - v.z1 / 2, v.r - v.zaobleni * 0.4), Math.PI / 2);
  for (const [kus, uK] of [
    [0, krizU],
    [1, krizU + Math.PI / 2],
  ] as const) {
    const cesta: V3[] = [];
    const tam = profil;
    const cely = [...tam.map(([rr, z]) => [-rr, z] as P2), ...tam.slice().reverse()];
    for (const [rr, z] of cely) {
      const zz = z > v.z1 - 1 * MM ? zNad : z;
      const zv = Math.abs(rr) < D.rVrsek ? zNad : zz;
      /* Druhý provázek přes první uprostřed */
      const nad = kus === 1 ? 2 * R_PROVAZKU * (1 - hladce(0.3 * CM, 1.6 * CM, Math.abs(rr))) : 0;
      cesta.push([rr * Math.cos(uK), rr * Math.sin(uK), zv + nad]);
    }
    /* Konce dole u pultu: provázek nesmí pod pult */
    const hladka = venku(D.baze, rovnomerne(cesta, 84), R_PROVAZKU + 0.3 * MM).map((p) => [p[0], p[1], Math.max(p[2], R_PROVAZKU + 0.6 * MM)] as V3);
    trubka(provazek, hladka, R_PROVAZKU, 5);
  }
  /* Mašlička uprostřed: uzlík, dvě smyčky a dva konce na vršku */
  const uzel: V3 = [0, 0, zNad + 2.2 * R_PROVAZKU];
  const uM = krizU + Math.PI / 4 + (r() - 0.5) * 0.6;
  uzlik(provazek, uzel, [3.8 * MM * Math.cos(uM), 3.8 * MM * Math.sin(uM), 0], [-3.0 * MM * Math.sin(uM), 3.0 * MM * Math.cos(uM), 0], [0, 0, 2.6 * MM]);
  for (const st of [-1, 1]) {
    const a = uM + st * (0.55 + 0.3 * r());
    const e1: V3 = [Math.cos(a), Math.sin(a), 0];
    const e2: V3 = [-Math.sin(a), Math.cos(a), 0];
    const dl = mix(1.5, 2.0, r()) * CM;
    const smycka = Array.from({ length: 23 }, (_, i) => {
      const t = (i / 22) * TAU;
      const p = pricti(pricti(uzel, e1, (dl / 2) * (1 - Math.cos(t))), e2, 0.38 * CM * Math.sin(t));
      return [p[0], p[1], mix(uzel[2], zNad + 0.3 * MM, Math.pow((1 - Math.cos(t)) / 2, 0.5))] as V3;
    });
    trubka(provazek, smycka, R_PROVAZKU * 0.92, 5, false);
    const b = uM + Math.PI + st * (0.35 + 0.35 * r());
    const dk = mix(2.0, 3.0, r()) * CM;
    const konec = Array.from({ length: 12 }, (_, i) => {
      const t = i / 11;
      const ohyb = b + st * 0.5 * t * t;
      return [uzel[0] + dk * t * Math.cos(ohyb), uzel[1] + dk * t * Math.sin(ohyb), mix(uzel[2], zNad + 0.2 * MM, Math.min(1, t * 2.5))] as V3;
    });
    trubka(provazek, konec, R_PROVAZKU * 0.9, 5);
  }
  const dirka = postavVisacku(visacka, D.baze, rv, 1, 1.0 * MM);
  nitka(provazek, D.baze, uzel, dirka, rv);
  return { papir, provazek, visacka };
}

/* ═══ Dorovnání a výstup ═══ */

/**
 * Síť přesně na `vyska` a `polomer` z tvaru pro srážky: výška se natáhne
 * jen nad `zOd` (u staženého balíku chomáček), půdorys celý — o zlomky
 * procenta, zmačkání tak papír pokaždé posune o kousek jinam.
 */
function dorovnej(c: Casti, vyska: number, polomer: number, zOd: number) {
  const vse = [c.papir, c.provazek, c.visacka];
  let zMax = 0;
  let rMax = 0;
  for (const s of vse)
    for (let k = 0; k < s.p.length; k += 3) {
      zMax = Math.max(zMax, s.p[k + 2]);
      rMax = Math.max(rMax, Math.hypot(s.p[k], s.p[k + 1]));
    }
  const kz = (vyska - zOd) / (zMax - zOd);
  const kr = polomer / rMax;
  for (const s of vse)
    for (let k = 0; k < s.p.length; k += 3) {
      s.p[k] *= kr;
      s.p[k + 1] *= kr;
      if (s.p[k + 2] > zOd) s.p[k + 2] = zOd + (s.p[k + 2] - zOd) * kz;
      /* Nic nesmí pod pult (dno leží přesně na z = 0) */
      if (s.p[k + 2] < 0) s.p[k + 2] = 0;
    }
  return { kz, kr };
}

/** Sítě balíku bez textur (běží i v Node — pro testy a náhledy) */
export function sitBaliku(tvar: TvarBaliku, seme: number): { papir: Sit; provazek: Sit; visacka: Sit; dorovnani: { kz: number; kr: number } } {
  const t = tvarBaliku(tvar);
  let c: Casti;
  let zOd = 0;
  if (tvar === "vaza") c = zabalVazu(seme);
  else if (tvar === "talir") c = zabalTalir(seme);
  else {
    c = zabalStazeny(stazeny(tvar), seme);
    zOd = odvodStazeny(stazeny(tvar)).zKrk1;
  }
  const dorovnani = dorovnej(c, t.vyska, t.polomer, zOd);
  return { papir: c.papir.sit(OSTROST), provazek: c.provazek.sit(), visacka: c.visacka.sit(), dorovnani };
}

/**
 * Balík pro kreslení: sítě v místních souřadnicích (papír, provázek, visačka)
 * a textury novin a visačky. Každý balík je jiný podle `kus.seme` (bez něj
 * podle id). Splní se, až je visačka s fotkou hotová.
 */
export async function vytvorBalik(kus: KusNaSatku): Promise<DataBaliku> {
  const seme = kus.seme || semeZId(kus.id);
  const site = sitBaliku(kus.tvar, seme);
  const [noviny, stitek] = await Promise.all([texturaNovin(seme), texturaVisacky(kus)]);
  const casti: CastBaliku[] = [
    { sit: site.papir, material: "papir", textura: noviny },
    { sit: site.provazek, material: "provazek", textura: null, barva: BARVA_PROVAZKU },
    { sit: site.visacka, material: "visacka", textura: stitek },
  ];
  return { id: kus.id, casti, tvar: tvarBaliku(kus.tvar) };
}
