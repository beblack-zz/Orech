/**
 * Jádro uzlu ma-musubi 真結び na 3D šátku: dva cípy látky zaklesnuté do
 * sebe. Zepředu je to stažený váleček s páskem přes střed — pásek je cíp
 * ovinutý kolem druhého, po stranách nabírané laloky s vráskami, které se
 * sbíhají k pásku. Uši (konce cípů) síť nemá: jsou to simulované cípy
 * látky a vycházejí z „ústí“ na obou koncích. Ústí je dovnitř zahnuté
 * a uvnitř zavřené, ať do uzlu není vidět.
 *
 * Síť má šířku 1 podél osy x (k pravému uchu), z nahoru, střed v počátku;
 * kreslení ji zvětší na StavUzlu.velikost. Souřadnice textury jsou
 * souřadnice látky (vzor přes celý šátek o straně STRANA) kolem (0,5; 0,5)
 * a pokrývají tolik látky, kolik má síť plochy (rozvinuté podél osy
 * a kolem průřezu) — vzor má na uzlu stejnou velikost jako na šátku, když
 * se jádro kreslí široké `sirka` metrů (výchozí 7 cm). Kreslí-li se jinak
 * velké, stačí síť postavit pro tu velikost: sitUzlu(velikost).
 * Pásek je látka otočená napříč, vzor na něm leží pootočený.
 *
 * Trojúhelníky jdou proti směru hodin při pohledu zvenku (normály ven).
 */
import { STRANA } from "./typy";
import type { Sit } from "./typy";

/** Výchozí šířka jádra (m), pro kterou sedí měřítko vzoru */
export const SIRKA_JADRA = 0.07;
const TAU = Math.PI * 2;

const hladce = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Prstenec trubky: poloha na ose, poloosy průřezu (do hloubky y, do výšky z), výška osy a náklon ústí */
interface Prstenec {
  x: number;
  b: number;
  c: number;
  z: number;
  naklon: number;
  /** Vrásky: hloubka (díl poloměru) */
  vrasky: number;
}

/** Průřez laloku podle polohy od středu (0 … 0,5): u pásku stažený, uprostřed laloku nejširší, k ústí užší */
function lalok(x: number): Prstenec {
  const a = Math.abs(x);
  const s1 = hladce(0.07, 0.26, a);
  const s2 = hladce(0.3, 0.5, a);
  return {
    x,
    b: 0.175 + 0.075 * s1 - 0.08 * s2,
    c: 0.21 + 0.08 * s1 - 0.085 * s2,
    /* Konce se zvedají — uši míří šikmo vzhůru */
    z: 0.055 * hladce(0.12, 0.5, a),
    naklon: Math.sign(x) * 0.38 * hladce(0.3, 0.5, a),
    /* Vrásky jsou nejhlubší hned za páskem, kde se látka nabírá, k ústí se vyrovnají */
    vrasky: 0.075 * hladce(0.1, 0.16, a) * (1 - hladce(0.18, 0.46, a)),
  };
}

/** Jednoduchá pevná náhoda: síť uzlu je pokaždé stejná */
function nahoda(seme: number) {
  let s = seme | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Síť jádra uzlu;  = jak široké (m) ho kreslení nakreslí — podle toho měřítko vzoru v uv */
export function sitUzlu(sirka = SIRKA_JADRA): Sit {
  /** Kolik uv látky připadá na jednotku sítě */
  const UV = sirka / STRANA;
  const r = nahoda(12);
  const p: number[] = [];
  const t: number[] = [];
  const ix: number[] = [];
  const bod = (x: number, y: number, z: number, u: number, v: number) => {
    p.push(x, y, z);
    t.push(u, v);
    return p.length / 3 - 1;
  };
  const troj = (a: number, b: number, c: number) => ix.push(a, b, c);
  const N = 48;

  /*
   * Vrásky látky: měkké hřbety kolem dokola (látka nabraná do pásku), každý
   * jinak hluboký a lehce stočený, aby laloky nebyly jako dýně.
   */
  const VRASEK = 7;
  const vrasky = Array.from({ length: VRASEK }, (_, k) => ({ u: ((k + 0.25 + 0.5 * r()) / VRASEK) * TAU, h: 0.6 + 0.6 * r(), sirka: 0.36 + 0.22 * r(), stoceni: (r() - 0.5) * 1.6 }));
  const vraska = (u: number, x: number) => {
    let d = 0;
    for (const w of vrasky) {
      let du = u - w.u - w.stoceni * Math.abs(x);
      du -= TAU * Math.round(du / TAU);
      const q = Math.abs(du) / w.sirka;
      /* Hřbet s ostřejším vrcholem, mezi hřbety mělké údolí */
      if (q < 1) d += w.h * Math.pow(1 - q * q, 1.4);
    }
    return d - 0.35;
  };
  /* Pomalé boulení látky, ať laloky nejsou souměrné */
  const boule = (u: number, x: number) => 0.05 * Math.sin(2 * u + 1.3 + 3 * x) + 0.035 * Math.sin(3 * u - 0.7 - 5 * x);

  /* Úhel kolem osy x: 0 nahoře, π/2 vpředu (−y); šev je dole, kde uzel sedí na balíku */
  const misto = (q: Prstenec, u: number, dr: number): [number, number, number] => {
    const y = -q.b * (1 + dr) * Math.sin(u);
    const z = q.c * (1 + dr) * Math.cos(u);
    /* Ústí se naklání: průřez se pootočí kolem osy y */
    const cn = Math.cos(q.naklon), sn = Math.sin(q.naklon);
    return [q.x - z * sn, y, q.z + z * cn];
  };
  const uhel = (i: number) => Math.PI + ((i % N) / N) * TAU;

  /* ——— Laloky s ústím: profil od levého ústí přes stažený střed k pravému ——— */
  const radky: Prstenec[] = [];
  const RAD = 40;
  for (let j = 0; j <= RAD; j++) radky.push(lalok(-0.5 + j / RAD));
  /* Ústí: látka se na konci zahne dovnitř (lem), za ním je zavřeno */
  const lem = (q: Prstenec, krok: number): Prstenec => {
    const s = Math.sign(q.x);
    const tvar = [
      [0.012, 0.94],
      [0.015, 0.84],
      [0.0, 0.74],
      [-0.03, 0.69],
    ][krok];
    return { ...q, x: q.x + s * tvar[0], b: q.b * tvar[1], c: q.c * tvar[1], vrasky: q.vrasky * 0.5 };
  };
  const profil: Prstenec[] = [];
  for (let k = 3; k >= 0; k--) profil.push(lem(radky[0], k));
  profil.push(...radky);
  for (let k = 0; k < 4; k++) profil.push(lem(radky[RAD], k));

  const mriz: number[][] = profil.map((q) =>
    Array.from({ length: N + 1 }, (_, i) => {
      const u = uhel(i);
      const dr = q.vrasky * vraska(u, q.x) + boule(u, q.x) * (1 - hladce(0.38, 0.5, Math.abs(q.x)));
      const [x, y, z] = misto(q, u, dr);
      return bod(x, y, z, 0.5, 0.5);
    }),
  );
  for (let j = 0; j < mriz.length - 1; j++)
    for (let i = 0; i < N; i++) {
      const A = mriz[j][i], B = mriz[j][i + 1], C = mriz[j + 1][i + 1], D = mriz[j + 1][i];
      troj(A, B, C);
      troj(A, C, D);
    }
  /* Zavřené dno ústí: vějíř hluboko za lemem, líc míří ven z ústí */
  const dna: [number, number[]][] = [];
  for (const [radek, s] of [
    [mriz[0], -1],
    [mriz[mriz.length - 1], 1],
  ] as const) {
    const q = s < 0 ? profil[0] : profil[profil.length - 1];
    const c = bod(q.x - s * 0.01, 0, q.z, 0.5, 0.5);
    for (let i = 0; i < N; i++) (s > 0 ? troj(c, radek[i], radek[i + 1]) : troj(c, radek[i + 1], radek[i]));
    dna.push([c, radek]);
  }

  /* ——— Pásek přes střed: látka ovinutá kolem, o tloušťku nad laloky, hrany podvinuté ——— */
  const PAS = 10;
  const pul = 0.115;
  const pasek: number[][] = [];
  for (let j = 0; j <= PAS; j++) {
    const x = -pul + (2 * pul * j) / PAS;
    const q = lalok(x);
    /* Průřez pásku: rovný hřbet, ke hranám se stáčí dolů k lalokům */
    const okraj = Math.pow(Math.abs(x) / pul, 6);
    const nad = 0.075 * (1 - okraj) - 0.035 * okraj;
    const zvlneni = 0.012 * Math.sin(x * 40 + 0.6);
    pasek.push(
      Array.from({ length: N + 1 }, (_, i) => {
        const u = uhel(i);
        const pr = { ...q, b: Math.max(q.b, 0.19), c: Math.max(q.c, 0.225) };
        const [px, py, pz] = misto(pr, u, nad + zvlneni * Math.cos(2 * u));
        return bod(px, py, pz, 0.5, 0.5);
      }),
    );
  }
  for (let j = 0; j < PAS; j++)
    for (let i = 0; i < N; i++) {
      const A = pasek[j][i], B = pasek[j][i + 1], C = pasek[j + 1][i + 1], D = pasek[j + 1][i];
      troj(A, B, C);
      troj(A, C, D);
    }

  /* Šířka přesně 1: nakloněná ústí přečnívají přes ±0,5, celé se to zmenší */
  let sir = 0;
  for (let k = 0; k < p.length; k += 3) sir = Math.max(sir, Math.abs(p[k]));
  const m = 0.5 / sir;
  for (let k = 0; k < p.length; k++) p[k] *= m;

  /*
   * Souřadnice látky podle skutečných vzdáleností na síti (i s vráskami):
   * kolem průřezu od vršku a podél sloupce od středu — uv pokryjí tolik
   * látky, kolik má síť plochy, a vzor nikde nenatáhnou
   */
  const vzd = (a: number, b: number) => Math.hypot(p[a * 3] - p[b * 3], p[a * 3 + 1] - p[b * 3 + 1], p[a * 3 + 2] - p[b * 3 + 2]);
  const rozvin = (mr: number[][], stredRadek: number, kolemNaU: boolean, posun: number) => {
    const kolem = mr.map((radek) => {
      const s = [0];
      for (let i = 1; i < radek.length; i++) s.push(s[i - 1] + vzd(radek[i], radek[i - 1]));
      return s.map((x) => x - s[N / 2]);
    });
    const podel = mr.map(() => new Array<number>(N + 1).fill(0));
    for (let i = 0; i <= N; i++) {
      for (let j = stredRadek + 1; j < mr.length; j++) podel[j][i] = podel[j - 1][i] + vzd(mr[j][i], mr[j - 1][i]);
      for (let j = stredRadek - 1; j >= 0; j--) podel[j][i] = podel[j + 1][i] - vzd(mr[j][i], mr[j + 1][i]);
    }
    mr.forEach((radek, j) =>
      radek.forEach((k, i) => {
        t[k * 2] = 0.5 + posun + (kolemNaU ? kolem[j][i] : podel[j][i]) * UV;
        t[k * 2 + 1] = 0.5 + (kolemNaU ? podel[j][i] : kolem[j][i]) * UV;
      }),
    );
  };
  rozvin(mriz, 4 + RAD / 2, false, 0);
  /* Pásek: vzor pootočený (u kolem pásku, v podél osy) a z jiného místa látky */
  rozvin(pasek, PAS / 2, true, 0.21);
  /* Dno ústí: střed má průměr prstence, ať se vzor neroztáhne */
  for (const [c, radek] of dna) {
    let su = 0, sv = 0;
    for (let i = 0; i < N; i++) {
      su += t[radek[i] * 2];
      sv += t[radek[i] * 2 + 1];
    }
    t[c * 2] = su / N;
    t[c * 2 + 1] = sv / N;
  }

  /* ——— Normály z geometrie (vážené plochou); šev dole má stejná místa, normály se sečtou ——— */
  const n = new Float32Array(p.length);
  for (let k = 0; k < ix.length; k += 3) {
    const a = ix[k] * 3, b = ix[k + 1] * 3, c = ix[k + 2] * 3;
    const e1 = [p[b] - p[a], p[b + 1] - p[a + 1], p[b + 2] - p[a + 2]];
    const e2 = [p[c] - p[a], p[c + 1] - p[a + 1], p[c + 2] - p[a + 2]];
    const nx = e1[1] * e2[2] - e1[2] * e2[1], ny = e1[2] * e2[0] - e1[0] * e2[2], nz = e1[0] * e2[1] - e1[1] * e2[0];
    for (const v of [a, b, c]) {
      n[v] += nx;
      n[v + 1] += ny;
      n[v + 2] += nz;
    }
  }
  /* Šev (sloupec 0 a N) — stejná místa, sdílet součet, ať je spoj hladký */
  for (const m of [mriz, pasek])
    for (const radek of m) {
      const a = radek[0] * 3, b = radek[N] * 3;
      for (let k = 0; k < 3; k++) {
        const s = n[a + k] + n[b + k];
        n[a + k] = s;
        n[b + k] = s;
      }
    }
  for (let v = 0; v < n.length; v += 3) {
    const d = Math.hypot(n[v], n[v + 1], n[v + 2]) || 1;
    n[v] /= d;
    n[v + 1] /= d;
    n[v + 2] /= d;
  }
  return { pozice: Float32Array.from(p), normaly: n, uv: Float32Array.from(t), indexy: Uint16Array.from(ix) };
}
