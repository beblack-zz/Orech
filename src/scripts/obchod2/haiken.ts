/**
 * Haiken — kus keramiky, který si člověk otočí v ruce. V čajovém obřadu
 * si host misku po vypití prohlédne ze všech stran i zespodu; tady se kus
 * táhne myší nebo prstem, otáčí šipkami a tlačítkem se obrátí dnem vzhůru.
 *
 * Kreslí se do <canvas> bez knihoven: profil kusu (řez od středu dna přes
 * patu, stěnu a okraj zpátky dovnitř) se roztočí kolem osy jako na kruhu,
 * z toho vznikne síť plošek, každá dostane barvu glazury a světlo z okna
 * vlevo nahoře, a kreslí se odzadu dopředu.
 *
 * Barvy glazur jsou z kurzy2.ts (glazury). K nim to, co na glazuře bývá
 * vidět: stékání, tečky, okraj prosvítající do rezava, oranžové záblesky,
 * soustružnické rýhy, pata bez glazury a na dně razítko.
 */
import { glazury } from "../../data/kurzy2";
import type { Tvar } from "../../data/obchod";
import { klid } from "../parta2/stav";

type Rgb = [number, number, number];
/** Bod profilu: poloměr, výška a jestli je to ostrá hrana (okraj, pata) */
type Bod = [number, number, boolean?];

interface Profil {
  body: Bod[];
  /** Do jaké výšky zvenku zůstává hlína bez glazury */
  glazuraOd: number;
  /** Jak moc shora se na kus díváme, než s ním člověk pohne */
  pitch: number;
  ucho?: boolean;
}

/* ——— Tvary: řez od středu dna ven, nahoru po stěně, přes okraj a dovnitř ——— */
const PROFILY: Record<Tvar, Profil> = {
  bowl: {
    glazuraOd: 0.08,
    pitch: 0.42,
    body: [
      [0, 0.03], [0.17, 0.03], [0.235, 0.03, true], [0.245, 0.002, true], [0.3, 0, true], [0.315, 0.06, true],
      [0.36, 0.085], [0.44, 0.13], [0.53, 0.2], [0.61, 0.29], [0.67, 0.39], [0.715, 0.5], [0.745, 0.6], [0.76, 0.68, true],
      [0.755, 0.705], [0.735, 0.712, true],
      [0.72, 0.695, true], [0.705, 0.6], [0.675, 0.5], [0.625, 0.39], [0.56, 0.29], [0.47, 0.205], [0.36, 0.155], [0.22, 0.13], [0, 0.12],
    ],
  },
  mug: {
    glazuraOd: 0.065,
    pitch: 0.3,
    ucho: true,
    body: [
      [0, 0.02], [0.27, 0.02], [0.3, 0.02, true], [0.31, 0, true], [0.355, 0, true], [0.37, 0.035, true],
      [0.385, 0.12], [0.395, 0.3], [0.402, 0.5], [0.408, 0.7], [0.415, 0.88], [0.42, 0.98, true],
      [0.414, 1.0], [0.4, 1.006, true],
      [0.388, 0.99, true], [0.383, 0.88], [0.377, 0.7], [0.371, 0.5], [0.364, 0.3], [0.352, 0.16], [0.3, 0.1], [0.15, 0.085], [0, 0.083],
    ],
  },
  vase: {
    glazuraOd: 0.065,
    pitch: 0.2,
    body: [
      [0, 0.02], [0.17, 0.02], [0.19, 0.02, true], [0.2, 0, true], [0.235, 0, true], [0.25, 0.03, true],
      [0.29, 0.1], [0.33, 0.2], [0.355, 0.32], [0.36, 0.42], [0.345, 0.53], [0.3, 0.64], [0.235, 0.73], [0.17, 0.81],
      [0.135, 0.9], [0.13, 0.98], [0.145, 1.05], [0.175, 1.1, true],
      [0.172, 1.12], [0.158, 1.125, true],
      [0.143, 1.11, true], [0.118, 1.05], [0.112, 0.98], [0.1, 0.94], [0, 0.93],
    ],
  },
  plate: {
    glazuraOd: 0.04,
    pitch: 0.78,
    body: [
      [0, 0.018], [0.36, 0.018], [0.39, 0.018, true], [0.4, 0, true], [0.45, 0, true], [0.47, 0.03, true],
      [0.6, 0.05], [0.74, 0.075], [0.86, 0.105], [0.94, 0.135], [0.985, 0.16, true],
      [0.982, 0.175], [0.968, 0.18, true],
      [0.952, 0.168, true], [0.9, 0.14], [0.8, 0.108], [0.66, 0.085], [0.5, 0.073], [0.25, 0.068], [0, 0.067],
    ],
  },
};

/* ——— Glazury: co se na nich děje kromě barvy ——— */
interface Povaha {
  /** Síla a ostrost odlesku */
  lesk: number;
  ostrost: number;
  /** Odraz okna — jen u lesklých */
  okno: number;
  /** Tmavé tečky (železo, popel) */
  tecky: number;
  /** Jak moc glazura stéká od okraje */
  steky: number;
  /** Barva tam, kde je glazura na okraji tenká */
  okraj?: string;
  /** Oranžové záblesky (shino) a dírky po vzduchu */
  plamen?: boolean;
}
const POVAHY: Record<string, Povaha> = {
  celadon: { lesk: 0.55, ostrost: 60, okno: 0.55, tecky: 0, steky: 0.45, okraj: "#E2EEDC" },
  tenmoku: { lesk: 0.7, ostrost: 60, okno: 0.5, tecky: 0.04, steky: 0.55, okraj: "#9A5A2C" },
  shino: { lesk: 0.16, ostrost: 12, okno: 0.06, tecky: 0.02, steky: 0.1, plamen: true },
  "matná bílá": { lesk: 0.07, ostrost: 8, okno: 0, tecky: 0, steky: 0 },
  "popelová šedá": { lesk: 0.22, ostrost: 18, okno: 0.12, tecky: 0.22, steky: 0.6 },
  "železitá hnědá": { lesk: 0.6, ostrost: 50, okno: 0.45, tecky: 0.3, steky: 0.35, okraj: "#C98A54" },
};
const HLINA: Rgb = [201, 165, 132];

const hex = (h: string): Rgb => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mixC = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const omez = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const hladce = (a: number, b: number, x: number) => {
  const t = omez((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
/** Pevná náhoda ze dvou čísel */
const hash = (a: number, b: number, s: number) => {
  let h = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(s | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
/** Hladký šum v rovině (úhel × výška) — záblesky na shinu */
const sum = (x: number, y: number, s: number) => {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const a = hash(x0, y0, s);
  const b = hash(x0 + 1, y0, s);
  const c = hash(x0, y0 + 1, s);
  const d = hash(x0 + 1, y0 + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};

interface Ploska {
  /** Indexy čtyř vrcholů v poli vrcholů */
  v: [number, number, number, number];
  /** Normála v souřadnicích kusu */
  n: [number, number, number];
  barva: Rgb;
  povrch: "venku" | "uvnitr" | "dno";
}

const SEG = 72;
const F = 5.5;
const L1 = (() => {
  const v = [-0.55, 0.62, 0.56];
  const d = Math.hypot(v[0], v[1], v[2]);
  return v.map((x) => x / d) as [number, number, number];
})();
const L2 = (() => {
  const v = [0.7, 0.12, 0.45];
  const d = Math.hypot(v[0], v[1], v[2]);
  return v.map((x) => x / d) as [number, number, number];
})();

/**
 * Zjemní profil: mezi každé dva body vloží další po Catmull-Romově křivce,
 * aby byla stěna oblá. Přes ostrou hranu se jde rovně, ať okraj zůstane okraj.
 */
function zjemni(body: Bod[], kroku: number): Bod[] {
  const out: Bod[] = [];
  for (let i = 0; i < body.length - 1; i++) {
    const p1 = body[i];
    const p2 = body[i + 1];
    out.push(p1);
    const rovne = p1[2] || p2[2];
    const p0 = body[i - 1] && !p1[2] ? body[i - 1] : p1;
    const p3 = body[i + 2] && !p2[2] ? body[i + 2] : p2;
    for (let k = 1; k < kroku; k++) {
      const t = k / kroku;
      if (rovne) {
        out.push([p1[0] + (p2[0] - p1[0]) * t, p1[1] + (p2[1] - p1[1]) * t]);
        continue;
      }
      const t2 = t * t;
      const t3 = t2 * t;
      const cr = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([Math.max(0, cr(p0[0], p1[0], p2[0], p3[0])), cr(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(body[body.length - 1]);
  return out;
}

interface Tecka {
  x: number;
  y: number;
  z: number;
  n: [number, number, number];
  r: number;
  c: string;
}

export interface KusHaiken {
  tvar: Tvar;
  glazura: string;
  /** Aby nebyly dva kusy stejné — jiné stékání a tečky */
  seme: number;
}

export class Haiken {
  private ctx: CanvasRenderingContext2D;
  private vrcholy: Float32Array = new Float32Array(0);
  private ploskyVse: Ploska[] = [];
  private tecky: Tecka[] = [];
  private stredY = 0.5;
  private polomer = 1;
  private dnoY = 0.03;
  private dnoR = 0.15;
  private vyska = 1;
  private sirka = 300;
  private vyskaPx = 300;
  private dpr = 1;
  private povaha: Povaha = POVAHY["matná bílá"];
  private razitko = true;

  yaw = -0.5;
  pitch = 0.38;
  private cilPitch: number | null = null;
  private rychlost = 0;
  private tazeno = false;
  private posledniPohyb = 0;
  private bezi = false;
  private videt = true;
  private auto: boolean;
  private vychoziPitch: number;

  /** Kde na plátně stojí pata kusu (podíl výšky) — když stojí na prkénku */
  private pata: number | null;

  constructor(readonly canvas: HTMLCanvasElement, moznosti: { auto?: boolean; pitch?: number; pata?: number } = {}) {
    this.ctx = canvas.getContext("2d")!;
    this.auto = !!moznosti.auto && !klid;
    this.pata = moznosti.pata ?? null;
    this.vychoziPitch = moznosti.pitch ?? 0.38;
    this.pitch = this.vychoziPitch;
    this.ovladani();
    new ResizeObserver(() => this.velikost()).observe(canvas);
    new IntersectionObserver(([e]) => {
      this.videt = e.isIntersecting;
      if (this.videt) this.spust();
    }).observe(canvas);
    this.velikost();
  }

  /* ——— Síť ——— */

  nastav(kus: KusHaiken, razitko = true) {
    const profil = PROFILY[kus.tvar] ?? PROFILY.bowl;
    const g = glazury.find((x) => x.nazev === kus.glazura.toLowerCase()) ?? glazury[3];
    this.povaha = POVAHY[g.nazev] ?? POVAHY["matná bílá"];
    this.razitko = razitko;
    this.vychoziPitch = profil.pitch;
    this.pitch = profil.pitch;
    this.cilPitch = null;
    this.yaw = -0.6;
    const barvy = { svetlo: hex(g.svetlo), stred: hex(g.stred), stin: hex(g.stin) };
    const body = zjemni(profil.body, 3);
    /* Hranice glazury u paty musí ležet na bodě profilu, jinak by byla zubatá */
    for (let i = 0; i < body.length - 1; i++) {
      const [r0, y0] = body[i];
      const [r1, y1] = body[i + 1];
      if (y0 < profil.glazuraOd && y1 > profil.glazuraOd && r1 > 0.05) {
        const t = (profil.glazuraOd - y0) / (y1 - y0);
        body.splice(i + 1, 0, [r0 + (r1 - r0) * t, profil.glazuraOd]);
        break;
      }
    }
    const P = body.length;
    const okrajI = body.reduce((m, b, i) => (b[1] > body[m][1] ? i : m), 0);
    const vyska = Math.max(...body.map((b) => b[1]));
    this.vyska = vyska;
    this.stredY = vyska * 0.5;
    this.dnoY = body[0][1];
    this.dnoR = Math.min(0.16, body[2][0] * 0.62);

    /* Normály v každém bodě profilu: průměr sousedních úseků, na ostré hraně každý úsek svou */
    const normalaUseku = (i: number): [number, number] => {
      const dr = body[i + 1][0] - body[i][0];
      const dy = body[i + 1][1] - body[i][1];
      const d = Math.hypot(dr, dy) || 1;
      return [dy / d, -dr / d];
    };
    const normaly: [[number, number], [number, number]][] = [];
    for (let i = 0; i < P - 1; i++) {
      const n = normalaUseku(i);
      const prumer = (j: number, vlastni: [number, number]): [number, number] => {
        if (body[j][2] || j === 0 || j === P - 1) return vlastni;
        const a = normalaUseku(j - 1);
        const b = normalaUseku(j);
        const d = Math.hypot(a[0] + b[0], a[1] + b[1]) || 1;
        return [(a[0] + b[0]) / d, (a[1] + b[1]) / d];
      };
      normaly.push([prumer(i, n), prumer(i + 1, n)]);
    }

    /* Stékání: pár pramínků od okraje dolů */
    const r = (k: number) => hash(kus.seme, k, 7);
    const steky = Array.from({ length: 11 }, (_, k) => ({
      u: r(k) * Math.PI * 2,
      w: 0.04 + r(k + 40) * 0.1,
      delka: 0.12 + r(k + 80) * 0.42,
    }));
    const tloustka = (u: number, y: number) => {
      let t = 0;
      for (const s of steky) {
        let du = Math.abs(u - s.u);
        du = Math.min(du, Math.PI * 2 - du);
        if (du > s.w) continue;
        const odOkraje = (vyska - y) / vyska;
        if (odOkraje > s.delka) continue;
        t += (1 - du / s.w) * (1 - (odOkraje / s.delka) ** 2);
      }
      return omez(t);
    };
    const paty = (u: number) => profil.glazuraOd + 0 * u;

    const barvaPlosky = (i: number, u: number, y: number, povrch: Ploska["povrch"], jj: number): Rgb => {
      const pv = this.povaha;
      const t = omez(y / vyska);
      if (povrch === "dno" || (povrch === "venku" && y < paty(u) && i < okrajI)) {
        const z = hash(i, jj, kus.seme) * 0.12 - 0.06;
        return mixC(HLINA, [140, 104, 78], 0.25 + z);
      }
      // Glazura je tlustší dole uvnitř a tam, kde stekla; na okraji tenká
      let tl = 0.35;
      if (povrch === "uvnitr") tl += (1 - t) * 0.55;
      else tl += tloustka(u, y) * pv.steky + (1 - t) * 0.12;
      let c = mixC(barvy.svetlo, barvy.stred, omez(0.25 + tl * 0.7));
      if (tl > 0.75) c = mixC(c, barvy.stin, omez((tl - 0.75) * 1.4));
      const uOkraje = vyska - y < 0.03;
      if (uOkraje && pv.okraj) c = mixC(c, hex(pv.okraj), 0.55);
      if (pv.plamen) {
        const n = sum(u * 2.2 + kus.seme, y * 6, 3);
        if (n > 0.55) c = mixC(c, [216, 138, 86], omez((n - 0.55) * 2.2) * 0.75);
      }
      // Soustružnické rýhy — kus je točený
      if (povrch !== "dno") {
        const ryha = 1 + 0.035 * Math.sin(y * 74 + kus.seme);
        c = [c[0] * ryha, c[1] * ryha, c[2] * ryha];
      }
      return c;
    };

    /* Vrcholy: body profilu × úhly */
    const V: number[] = [];
    for (let i = 0; i < P; i++) {
      for (let j = 0; j < SEG; j++) {
        const u = (j / SEG) * Math.PI * 2;
        V.push(body[i][0] * Math.cos(u), body[i][1], body[i][0] * Math.sin(u));
      }
    }
    const plosky: Ploska[] = [];
    const idx = (i: number, j: number) => i * SEG + (j % SEG);
    for (let i = 0; i < P - 1; i++) {
      const [na, nb] = normaly[i];
      const nr = (na[0] + nb[0]) / 2;
      const ny = (na[1] + nb[1]) / 2;
      const d = Math.hypot(nr, ny) || 1;
      const y = (body[i][1] + body[i + 1][1]) / 2;
      const naDne = i < okrajI && body[i][1] <= this.dnoY + 0.001 && body[i + 1][1] <= this.dnoY + 0.001;
      const povrch: Ploska["povrch"] = naDne ? "dno" : i < okrajI ? "venku" : "uvnitr";
      for (let j = 0; j < SEG; j++) {
        const u = ((j + 0.5) / SEG) * Math.PI * 2;
        plosky.push({
          v: [idx(i, j), idx(i, j + 1), idx(i + 1, j + 1), idx(i + 1, j)],
          n: [(nr / d) * Math.cos(u), ny / d, (nr / d) * Math.sin(u)],
          barva: barvaPlosky(i, u, y, povrch, j),
          povrch,
        });
      }
    }

    /* Ucho hrnku: trubka do oblouku na straně u = 0 */
    if (profil.ucho) {
      const S = 18;
      const T = 10;
      // Půlelipsa od stěny ke stěně; pásek je plochý jako tažené ucho
      const cx = 0.385;
      const cy = 0.535;
      const ax = 0.27;
      const ay = 0.285;
      const trA = 0.032;
      const trB = 0.062;
      const zac = V.length / 3;
      const stred = (s: number): [number, number] => {
        const a = -Math.PI / 2 + (s / S) * Math.PI;
        return [cx + Math.cos(a) * ax, cy + Math.sin(a) * ay];
      };
      for (let s = 0; s <= S; s++) {
        const [x, y] = stred(s);
        const [x1, y1] = stred(Math.min(S, s + 1));
        const [x0, y0] = stred(Math.max(0, s - 1));
        const tx = x1 - x0;
        const ty = y1 - y0;
        const tl = Math.hypot(tx, ty) || 1;
        // Kolmice v rovině oblouku a kolmice z roviny
        const px = -ty / tl;
        const py = tx / tl;
        for (let k = 0; k < T; k++) {
          const a = (k / T) * Math.PI * 2;
          V.push(x + px * Math.cos(a) * trA, y + py * Math.cos(a) * trA, Math.sin(a) * trB);
        }
      }
      for (let s = 0; s < S; s++) {
        for (let k = 0; k < T; k++) {
          const a = ((k + 0.5) / T) * Math.PI * 2;
          const [x, y] = stred(s + 0.5);
          const [x1, y1] = stred(Math.min(S, s + 1));
          const [x0, y0] = stred(s);
          const tl = Math.hypot(x1 - x0, y1 - y0) || 1;
          const px = -(y1 - y0) / tl;
          const py = (x1 - x0) / tl;
          void x;
          const nx = (px * Math.cos(a)) / trA;
          const ny = (py * Math.cos(a)) / trA;
          const nz = Math.sin(a) / trB;
          const nd = Math.hypot(nx, ny, nz) || 1;
          plosky.push({
            v: [zac + s * T + k, zac + s * T + ((k + 1) % T), zac + (s + 1) * T + ((k + 1) % T), zac + (s + 1) * T + k],
            n: [nx / nd, ny / nd, nz / nd],
            barva: barvaPlosky(okrajI - 2, 0, y, "venku", k + s * 3),
            povrch: "venku",
          });
        }
      }
    }

    /* Tečky v glazuře (železo, popel) a dírky po vzduchu (shino) — drobné body na povrchu */
    const tecky: Tecka[] = [];
    const direk = this.povaha.plamen ? 70 : 0;
    const pocetTecek = Math.round(this.povaha.tecky * 420) + direk;
    for (let pokus = 1; tecky.length < pocetTecek && pokus < pocetTecek * 8; pokus++) {
      const i = Math.floor(hash(pokus, 1, kus.seme) * (P - 1));
      const t = hash(pokus, 2, kus.seme);
      const r0 = body[i][0] + (body[i + 1][0] - body[i][0]) * t;
      const y0 = body[i][1] + (body[i + 1][1] - body[i][1]) * t;
      // Hustota podle plochy — u osy je jí málo, tam teček méně
      if (hash(pokus, 3, kus.seme) > r0 / 0.7) continue;
      const u = hash(pokus, 4, kus.seme) * Math.PI * 2;
      const naDne = i < okrajI && y0 <= this.dnoY + 0.001;
      if (naDne || (i < okrajI && y0 < paty(u) + 0.01)) continue;
      const [na, nb] = normaly[i];
      const nr = na[0] + (nb[0] - na[0]) * t;
      const ny = na[1] + (nb[1] - na[1]) * t;
      const nd = Math.hypot(nr, ny) || 1;
      const dirka = tecky.length >= pocetTecek - direk;
      tecky.push({
        x: r0 * Math.cos(u),
        y: y0,
        z: r0 * Math.sin(u),
        n: [(nr / nd) * Math.cos(u), ny / nd, (nr / nd) * Math.sin(u)],
        r: dirka ? 0.0065 : 0.0035 + hash(pokus, 5, kus.seme) * 0.0065,
        c: dirka ? "rgba(120, 92, 74, 0.6)" : "rgba(42, 26, 18, 0.72)",
      });
    }
    this.tecky = tecky;

    this.vrcholy = new Float32Array(V);
    this.ploskyVse = plosky;
    let R = 0;
    for (let k = 0; k < V.length; k += 3) R = Math.max(R, Math.hypot(V[k], V[k + 1] - this.stredY, V[k + 2]));
    this.polomer = R;
    this.kresli();
  }

  /* ——— Ovládání ——— */

  private ovladani() {
    const c = this.canvas;
    let x0 = 0;
    let y0 = 0;
    let t0 = 0;
    c.addEventListener("pointerdown", (e) => {
      this.tazeno = true;
      this.rychlost = 0;
      this.cilPitch = null;
      x0 = e.clientX;
      y0 = e.clientY;
      t0 = performance.now();
      c.setPointerCapture(e.pointerId);
      c.classList.add("tazeno");
    });
    c.addEventListener("pointermove", (e) => {
      if (!this.tazeno) return;
      const dx = e.clientX - x0;
      const dy = e.clientY - y0;
      const t = performance.now();
      x0 = e.clientX;
      y0 = e.clientY;
      this.yaw += dx * 0.011;
      if (e.pointerType !== "touch") this.pitch = omez(this.pitch + dy * 0.008, -1.5, 1.15);
      this.rychlost = (dx * 0.011) / Math.max(8, t - t0) * 16;
      t0 = t;
      this.posledniPohyb = t;
      this.kresli();
    });
    const pust = () => {
      if (!this.tazeno) return;
      this.tazeno = false;
      this.posledniPohyb = performance.now();
      c.classList.remove("tazeno");
      this.spust();
    };
    c.addEventListener("pointerup", pust);
    c.addEventListener("pointercancel", pust);
  }

  /** Šipky a tlačítka */
  otoc(o: number) {
    this.rychlost = 0;
    this.yaw += o;
    this.posledniPohyb = performance.now();
    this.kresli();
  }
  naklon(o: number) {
    this.cilPitch = null;
    this.pitch = omez(this.pitch + o, -1.5, 1.15);
    this.posledniPohyb = performance.now();
    this.kresli();
  }
  /** Obrátí kus dnem k divákovi, podruhé zpátky. Vrací, jestli je teď dnem nahoru. */
  dno() {
    const dnem = this.jeDnem();
    this.cilPitch = dnem ? this.vychoziPitch : -1.32;
    this.posledniPohyb = performance.now();
    this.spust();
    return !dnem;
  }
  jeDnem() {
    return (this.cilPitch ?? this.pitch) < -0.6;
  }

  private spust() {
    if (this.bezi) return;
    this.bezi = true;
    requestAnimationFrame(this.krok);
  }

  private krok = (t: number) => {
    let zmena = false;
    let dal = false;
    if (!this.tazeno) {
      if (Math.abs(this.rychlost) > 0.0004) {
        this.yaw += this.rychlost;
        this.rychlost *= 0.94;
        zmena = dal = true;
      }
      if (this.cilPitch !== null) {
        const d = this.cilPitch - this.pitch;
        if (Math.abs(d) < 0.002 || klid) {
          this.pitch = this.cilPitch;
          this.cilPitch = null;
        } else this.pitch += d * 0.12;
        zmena = dal = true;
      }
      // Sám se pomalu točí, když na něj nikdo nesahá a není otočený dnem
      if (this.auto && this.videt && this.pitch > -0.6) {
        dal = true;
        if (t - this.posledniPohyb > 2600) {
          this.yaw += 0.0045;
          zmena = true;
        }
      }
    }
    if (zmena) this.kresli();
    if (dal && this.videt) requestAnimationFrame(this.krok);
    else this.bezi = false;
  };

  private velikost() {
    const r = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.sirka = Math.max(1, Math.round(r.width * this.dpr));
    this.vyskaPx = Math.max(1, Math.round(r.height * this.dpr));
    this.canvas.width = this.sirka;
    this.canvas.height = this.vyskaPx;
    this.kresli();
    if (this.auto) this.spust();
  }

  /* ——— Kreslení ——— */

  kresli() {
    const ctx = this.ctx;
    const W = this.sirka;
    const H = this.vyskaPx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (!this.ploskyVse.length) return;

    const cy = Math.cos(this.yaw);
    const sy = Math.sin(this.yaw);
    const cp = Math.cos(this.pitch);
    const sp = Math.sin(this.pitch);
    const meritko = (Math.min(W, H) * 0.43) / this.polomer;
    const sx0 = W / 2;
    const yc = this.stredY;
    /* Stojí-li kus na prkénku, pata sedí na jeho hraně; obrácený dnem se zvedne doprostřed */
    let sy0 = H * 0.52;
    if (this.pata !== null) {
      const naPrkne = H * this.pata - yc * cp * meritko * (F / (F + yc * sp));
      sy0 = H * 0.52 + (naPrkne - H * 0.52) * hladce(-0.45, 0.1, this.pitch);
    }

    /* Otočení: nejdřív kolem svislé osy (yaw), pak náklon k divákovi (pitch) */
    const V = this.vrcholy;
    const n = V.length / 3;
    const X = new Float32Array(n);
    const Y = new Float32Array(n);
    const Z = new Float32Array(n);
    const SX = new Float32Array(n);
    const SY = new Float32Array(n);
    for (let k = 0; k < n; k++) {
      const x = V[k * 3];
      const y = V[k * 3 + 1] - yc;
      const z = V[k * 3 + 2];
      const x1 = x * cy - z * sy;
      const z1 = x * sy + z * cy;
      const y2 = y * cp - z1 * sp;
      const z2 = y * sp + z1 * cp;
      X[k] = x1;
      Y[k] = y2;
      Z[k] = z2;
      const p = F / (F - z2);
      SX[k] = sx0 + x1 * meritko * p;
      SY[k] = sy0 - y2 * meritko * p;
    }
    const otoc = (v: [number, number, number]): [number, number, number] => {
      const x1 = v[0] * cy - v[2] * sy;
      const z1 = v[0] * sy + v[2] * cy;
      return [x1, v[1] * cp - z1 * sp, v[1] * sp + z1 * cp];
    };

    /* Stín na podložce — slábne, když se kus zvedne dnem nahoru */
    const stojí = hladce(-0.4, 0.15, this.pitch);
    if (stojí > 0.01) {
      const pata = otoc([0, -yc, 0]);
      const p = F / (F - pata[2]);
      const rx = meritko * this.polomer * 0.62;
      const g = ctx.createRadialGradient(sx0 + pata[0] * meritko * p, sy0 - pata[1] * meritko * p, 0, sx0 + pata[0] * meritko * p, sy0 - pata[1] * meritko * p, rx);
      g.addColorStop(0, `rgba(43, 30, 20, ${0.32 * stojí})`);
      g.addColorStop(1, "rgba(43, 30, 20, 0)");
      ctx.save();
      ctx.translate(sx0 + pata[0] * meritko * p, sy0 - pata[1] * meritko * p);
      ctx.scale(1, Math.max(0.12, Math.abs(sp)) * 0.9 + 0.08);
      ctx.translate(-(sx0 + pata[0] * meritko * p), -(sy0 - pata[1] * meritko * p));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(sx0 + pata[0] * meritko * p, sy0 - pata[1] * meritko * p, rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    /* Viditelné plošky, osvětlení, řazení odzadu */
    const pv = this.povaha;
    const viditelne: { z: number; p: Ploska; c: string }[] = [];
    for (const pl of this.ploskyVse) {
      const [a, b, c, d] = pl.v;
      const N = otoc(pl.n);
      const mx = (X[a] + X[b] + X[c] + X[d]) / 4;
      const my = (Y[a] + Y[b] + Y[c] + Y[d]) / 4;
      const mz = (Z[a] + Z[b] + Z[c] + Z[d]) / 4;
      // Odvrácená ploška (normála míří od oka) se nekreslí
      if (N[0] * -mx + N[1] * -my + N[2] * (F - mz) < 0) continue;
      const dif = Math.max(0, N[0] * L1[0] + N[1] * L1[1] + N[2] * L1[2]) * 0.72 + Math.max(0, N[0] * L2[0] + N[1] * L2[1] + N[2] * L2[2]) * 0.2;
      let svetlo = 0.34 + dif + Math.max(0, N[1]) * 0.06;
      if (pl.povrch === "uvnitr") svetlo *= 0.82;
      let odlesk = 0;
      if (pl.povrch !== "dno") {
        const hx = L1[0];
        const hy = L1[1];
        const hz = L1[2] + 1;
        const hd = Math.hypot(hx, hy, hz);
        const nh = Math.max(0, (N[0] * hx + N[1] * hy + N[2] * hz) / hd);
        odlesk = pv.lesk * Math.pow(nh, pv.ostrost);
        if (pv.okno) {
          const k = N[0] * -0.42 + N[2] * 0.9;
          odlesk += pv.okno * hladce(0.8, 0.98, k) * (1 - hladce(0.18, 0.6, Math.abs(N[1] - 0.08)));
        }
      }
      const bv = pl.barva;
      const r = Math.min(255, bv[0] * svetlo + 255 * odlesk);
      const g = Math.min(255, bv[1] * svetlo + 250 * odlesk);
      const bb = Math.min(255, bv[2] * svetlo + 240 * odlesk);
      viditelne.push({ z: mz, p: pl, c: `rgb(${r | 0},${g | 0},${bb | 0})` });
    }
    /* Tečky jdou do stejného řazení — co je za stěnou, stěna zakryje */
    const body: { z: number; x: number; y: number; r: number; c: string }[] = [];
    for (const t of this.tecky) {
      const o = otoc([t.x, t.y - yc, t.z]);
      const N = otoc(t.n);
      if (N[0] * -o[0] + N[1] * -o[1] + N[2] * (F - o[2]) < 0.05) continue;
      const p = F / (F - o[2]);
      body.push({ z: o[2] + 0.004, x: sx0 + o[0] * meritko * p, y: sy0 - o[1] * meritko * p, r: t.r * meritko * p * (0.4 + 0.6 * Math.max(0, N[2])), c: t.c });
    }
    body.sort((p, q) => p.z - q.z);
    viditelne.sort((p, q) => p.z - q.z);
    ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(0.6, this.dpr * 0.6);
    let k = 0;
    for (const { p, c, z } of viditelne) {
      while (k < body.length && body[k].z < z) {
        const b = body[k++];
        ctx.fillStyle = b.c;
        ctx.beginPath();
        ctx.arc(b.x, b.y, Math.max(0.6, b.r), 0, Math.PI * 2);
        ctx.fill();
      }
      const [a, bb, cc, d] = p.v;
      ctx.beginPath();
      ctx.moveTo(SX[a], SY[a]);
      ctx.lineTo(SX[bb], SY[bb]);
      ctx.lineTo(SX[cc], SY[cc]);
      ctx.lineTo(SX[d], SY[d]);
      ctx.closePath();
      ctx.fillStyle = c;
      ctx.strokeStyle = c;
      ctx.fill();
      ctx.stroke();
    }
    while (k < body.length) {
      const b = body[k++];
      ctx.fillStyle = b.c;
      ctx.beginPath();
      ctx.arc(b.x, b.y, Math.max(0.6, b.r), 0, Math.PI * 2);
      ctx.fill();
    }

    /* Razítko na dně — vidět jen, když je dno k divákovi */
    const dnoN = otoc([0, -1, 0]);
    if (this.razitko && dnoN[2] > 0.25) {
      const pr = (v: [number, number, number]) => {
        const o = otoc([v[0], v[1] - yc, v[2]]);
        const p = F / (F - o[2]);
        return [sx0 + o[0] * meritko * p, sy0 - o[1] * meritko * p];
      };
      const s = pr([0, this.dnoY - 0.001, 0]);
      const u = pr([this.dnoR, this.dnoY - 0.001, 0]);
      const v = pr([0, this.dnoY - 0.001, this.dnoR]);
      ctx.save();
      ctx.globalAlpha = hladce(0.25, 0.6, dnoN[2]) * 0.8;
      ctx.setTransform((u[0] - s[0]) / 100, (u[1] - s[1]) / 100, (v[0] - s[0]) / 100, (v[1] - s[1]) / 100, s[0], s[1]);
      ctx.strokeStyle = "rgb(110, 70, 44)";
      ctx.lineWidth = 11;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(0, 0, 78, -0.15 * Math.PI, 1.62 * Math.PI);
      ctx.stroke();
      ctx.fillStyle = "rgb(110, 70, 44)";
      ctx.font = "600 34px Fraunces Variable, Fraunces, Georgia, serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("JIRO", 0, 2);
      ctx.restore();
    }
  }
}

/** Kde je ploška dna: kreslicí pomůcka pro testy */
export const tvaryHaiken = Object.keys(PROFILY) as Tvar[];
