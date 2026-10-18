/**
 * Fyzika úvodu O nás 2 („Svět v kapce“). Kapka nateče z praskliny,
 * krk se zaškrtí, utrhne se a padá; na hladině vyhodí korunku s perlami
 * na cípech, z prostředka vystřelí sloupek a po vodě se rozejdou kruhy.
 * Perly, které dopadnou, udělají svoje malé kruhy. Klepnutím na hladinu
 * spadne malá kapka i jinam.
 *
 * Čistý modul bez DOM: pocatek.ts mu posílá čas a klepnutí a každý snímek
 * si přečte, co a kde nakreslit (Snimek). Stejný výpočet jde pustit v Node
 * a vykreslit z něj snímky na náhled.
 *
 * Kapka a její pád žijí v jednotkách jeviště (1000 × 1000), všechno na
 * hladině ve světě perspektivy z miry.ts (x do stran, z do hloubky,
 * h nad vodou) — korunka i kruhy se k obzoru samy zmenšují.
 */
import {
  f,
  OSA_X,
  DOPAD_Y,
  DOPAD_Z,
  OBZOR_Y,
  tvarKapky,
  volnaKapka,
  promitni,
  meritko,
  naHladinu,
  kruhNaHladine,
  type Bod,
} from "../../components/onas2/kresba/miry";

const omez = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const hladko = (t: number) => {
  const x = omez(t);
  return x * x * (3 - 2 * x);
};

/** Časy v sekundách */
export const CAS = {
  /** Od prvního zúžení krku po utržení — krátce, ať nit nevisí dlouho */
  skrceni: 0.85,
  /** Nová kapka nateče z čepičky do plné */
  rust: 5.4,
  /** Jak dlouho plná kapka poprvé visí, než spadne sama */
  prvni: 1.8,
  /** Pak už jen tak často, když se nikdo nedotkne */
  dalsi: 9,
};

/** Pád kapky v jednotkách jeviště za s² */
const ZRYCHLENI = 1500;
/** Tíže pro perly ve světě (zpomalený záznam) */
const TIZE = 7.2;

export type Faze = "visi" | "skrti" | "roste";

interface Visici {
  v: number;
  p: number;
  k: number;
  kv: number;
}
interface Padajici {
  cy: number;
  vy: number;
  r: number;
  k: number;
  kv: number;
  dopadla: boolean;
  /** Jak dlouho už se po dopadu noří — kapka splyne s hladinou skoro hned */
  ponor: number;
}
interface Satelit {
  y: number;
  vy: number;
  r: number;
}
interface Perla {
  x: number;
  z: number;
  h: number;
  vx: number;
  vz: number;
  vh: number;
  r: number;
}
interface Kruh {
  x: number;
  z: number;
  r: number;
  v: number;
  vek: number;
  zivot: number;
  sila: number;
  teply: boolean;
}
interface Tryska {
  u: number;
  delka: number;
  perla: number;
  odlet: number;
  pryc: boolean;
}
interface Sprsk {
  x: number;
  z: number;
  r0: number;
  vek: number;
  velka: boolean;
  faze: number;
  trysky: Tryska[];
  sloupPerla: boolean;
  pozde: boolean;
}
interface Mala {
  x: number;
  z: number;
  sy: number;
  vy: number;
  r: number;
}

export interface Kolecko {
  x: number;
  y: number;
  r: number;
}
export interface Snimek {
  /** Hlavní kapka — visící (s krkem), nebo padající kulička */
  kapka: { d: string; cx: number; cy: number; r: number; rx: number; ry: number; visi: boolean; krk: boolean; o: number } | null;
  /** Čepička v prasklině, zatímco velká kapka padá */
  cepicka: string | null;
  satelit: Kolecko | null;
  /** Stopy pádu nad padající kapkou */
  stopy: { x: number; y0: number; y1: number; o: number } | null;
  /** Zář pod kapkou na hladině (0–1.6) */
  zare: number;
  /** Teplé světlo kapky na trubce a stropě (0–1) — zhasne, jakmile kapka odpadne */
  zarTrubky: number;
  zablesky: (Kolecko & { o: number })[];
  kruhy: { d: string; dol: string; o: number; w: number; teply: boolean }[];
  koruny: { zad: string; pred: string; hranaZad: string; hranaPred: string; trnyZad: string; trnyPred: string; odlesky: string; o: number }[];
  sloupy: { d: string; o: number }[];
  perlyZad: Kolecko[];
  perlyPred: Kolecko[];
  male: Kolecko[];
}

const T_KORUNA = 1.15;
const T_SLOUP = 1.3;
/** Za jak dlouho po dopadu padající kapka zmizí v korunce */
const PONOR = 0.16;

/** Hladká otevřená cesta bodů (Catmull-Rom jako Bézier) bez M */
function hladce(body: Bod[]) {
  let d = "";
  for (let i = 0; i < body.length - 1; i++) {
    const p0 = body[i - 1] ?? body[i];
    const p1 = body[i];
    const p2 = body[i + 1];
    const p3 = body[i + 2] ?? p2;
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}
const bod = (b: Bod) => `${f(b[0])} ${f(b[1])}`;

export class Divadlo {
  faze: Faze = "visi";
  private vis: Visici = { v: 1, p: 0, k: 0, kv: 0 };
  private pad: Padajici | null = null;
  private sat: Satelit | null = null;
  private sprsky: Sprsk[] = [];
  private perly: Perla[] = [];
  private kruhy: Kruh[] = [];
  private male: Mala[] = [];
  private cas = 0;
  private tSkrt = 0;
  private odpocet: number;
  private spech = false;
  private dopadu = 0;
  private zablesky: { x: number; z: number; r: number; o: number }[] = [];
  private r: () => number;
  /** Co se stalo — pocatek.ts podle toho hraje zvuky a kreslí ensō */
  udalosti: {
    utrzeni?: () => void;
    dopad?: (velka: boolean, kolikaty: number) => void;
    perla?: (r: number) => void;
  } = {};

  constructor(nahoda: () => number = Math.random, prvni = CAS.prvni) {
    this.r = nahoda;
    this.odpocet = prvni;
  }

  /** Klepnutí na kapku: visící spadne hned, rostoucí si pospíší */
  pust(): boolean {
    if (this.faze === "visi") {
      this.faze = "skrti";
      this.tSkrt = 0;
      return true;
    }
    if (this.faze === "roste" && this.vis.v > 0.4 && !this.spech) {
      this.spech = true;
      return true;
    }
    return false;
  }

  /** Klepnutí na hladinu (souřadnice jeviště): odněkud shora tam spadne malá kapka */
  kapni(sx: number, sy: number): boolean {
    if (sy < OBZOR_Y + 6) return false;
    const { x, z } = naHladinu(sx, sy);
    if (z > 40 || z < 1.8) return false;
    this.male.push({ x, z, sy: -120, vy: 900, r: 0.075 + this.r() * 0.03 });
    return true;
  }

  krok(dt: number) {
    dt = Math.min(Math.max(dt, 0), 1 / 24);
    this.cas += dt;
    this.krokVisici(dt);
    this.krokPadu(dt);
    this.krokSprsku(dt);
    this.krokPerel(dt);
    this.krokKruhu(dt);
    for (const z of this.zablesky) z.o *= Math.exp(-dt / 0.15);
    this.zablesky = this.zablesky.filter((z) => z.o > 0.01);
  }

  private pruzina(k: number, kv: number, dt: number, hz: number, tlum: number, cil = 0): [number, number] {
    const w = 2 * Math.PI * hz;
    const a = -w * w * (k - cil) - 2 * tlum * w * kv;
    kv += a * dt;
    k += kv * dt;
    return [k, kv];
  }

  private krokVisici(dt: number) {
    const v = this.vis;
    /* Plná kapka se po natečení ještě chvíli přelévá; pak dýchá v CSS (pocatek.ts) */
    [v.k, v.kv] = this.pruzina(v.k, v.kv, dt, 2.1, 0.16);

    if (this.faze === "visi") {
      this.odpocet -= dt;
      if (this.odpocet <= 0) {
        this.faze = "skrti";
        this.tSkrt = 0;
      }
    } else if (this.faze === "skrti") {
      this.tSkrt += dt;
      v.p = Math.pow(omez(this.tSkrt / CAS.skrceni), 1.7);
      if (this.tSkrt >= CAS.skrceni) this.utrhni();
    } else {
      v.v = Math.min(1, v.v + (dt / CAS.rust) * (this.spech ? 4.5 : 1) * (0.55 + 0.9 * v.v));
      if (v.v >= 1) {
        v.kv += 1.8;
        if (this.spech) {
          this.spech = false;
          this.faze = "skrti";
          this.tSkrt = 0;
        } else {
          this.faze = "visi";
          this.odpocet = CAS.dalsi;
        }
      }
    }
  }

  private utrhni() {
    const t = tvarKapky(1, 1, this.vis.k);
    this.pad = { cy: t.stred[1], vy: 120, r: t.r, k: -1, kv: 0, dopadla: false, ponor: 0 };
    this.sat = { y: t.krk[1] + 10, vy: 30, r: 7.5 };
    /* Zbytek krku cvrnkne zpátky do praskliny a začne natékat znovu */
    this.vis = { v: 0.004, p: 0, k: 2.2, kv: 0 };
    this.faze = "roste";
    this.spech = false;
    this.udalosti.utrzeni?.();
  }

  private krokPadu(dt: number) {
    const p = this.pad;
    if (p) {
      if (!p.dopadla) p.vy += ZRYCHLENI * dt;
      p.cy += p.vy * dt;
      [p.k, p.kv] = this.pruzina(p.k, p.kv, dt, 3.3, 0.09);
      if (!p.dopadla && p.cy + p.r * (1 - 0.09 * p.k) >= DOPAD_Y) {
        p.dopadla = true;
        this.cakni(0, DOPAD_Z, p.r / meritko(DOPAD_Z), true);
      }
      if (p.dopadla) {
        p.ponor += dt;
        if (p.ponor >= PONOR) this.pad = null;
      }
    }
    const s = this.sat;
    if (s) {
      s.vy += ZRYCHLENI * dt;
      s.y += s.vy * dt;
      if (s.y + s.r >= DOPAD_Y) {
        this.sat = null;
        this.kruhy.push({ x: 0.04, z: DOPAD_Z, r: 0.05, v: 0.7, vek: 0, zivot: 1.2, sila: 0.5, teply: false });
        this.udalosti.perla?.(0.06);
      }
    }
    for (const m of this.male) {
      m.vy += ZRYCHLENI * 0.85 * dt;
      m.sy += m.vy * dt;
      const [, cil] = promitni(m.x, m.z, m.r);
      if (m.sy >= cil) {
        m.vy = -1;
        this.cakni(m.x, m.z, m.r, false);
      }
    }
    this.male = this.male.filter((m) => m.vy > 0);
  }

  /** Dopad kapky na hladinu: korunka s tryskami, záblesk a kruhy */
  private cakni(x: number, z: number, r0: number, velka: boolean) {
    const n = velka ? 22 : 9;
    const faze = this.r() * Math.PI * 2;
    const trysky: Tryska[] = Array.from({ length: n }, (_, i) => ({
      u: (Math.PI * 2 * i - faze) / n + (this.r() - 0.5) * 0.12,
      delka: r0 * (0.4 + this.r() * 0.75),
      perla: r0 * (0.08 + this.r() * 0.07),
      odlet: (velka ? 0.36 : 0.24) + this.r() * (velka ? 0.3 : 0.18),
      pryc: false,
    }));
    this.sprsky.push({ x, z, r0, vek: 0, velka, faze, trysky, sloupPerla: false, pozde: false });
    this.zablesky.push({ x, z, r: r0, o: velka ? 1 : 0.7 });
    const rychlosti = velka ? [0.5, 0.72, 0.98, 1.28, 1.62, 2.05] : [0.35, 0.55, 0.8];
    rychlosti.forEach((v, i) =>
      this.kruhy.push({
        x,
        z,
        r: r0 * 1.02,
        v,
        vek: 0,
        zivot: (velka ? 5.2 : 2.6) + i * 0.3,
        sila: (velka ? 1.25 : 0.8) * (1 - i * 0.12),
        teply: velka && i === 0,
      }),
    );
    if (velka) this.dopadu++;
    this.udalosti.dopad?.(velka, this.dopadu);
  }

  private krokSprsku(dt: number) {
    for (const s of this.sprsky) {
      s.vek += dt * (s.velka ? 1 : 1.6);
      const t = s.vek;
      const rc = this.polomerKoruny(s, t);
      const H = this.vyskaKoruny(s, t);
      const lean = s.r0 * 0.5 * (t / T_KORUNA);
      for (const tr of s.trysky) {
        if (tr.pryc || t < tr.odlet) continue;
        tr.pryc = true;
        const R = rc + lean + tr.delka * 0.3;
        const c = Math.cos(tr.u);
        const sn = Math.sin(tr.u);
        const ven = (s.velka ? 1.05 : 0.6) * (0.6 + this.r() * 0.8);
        this.perly.push({
          x: s.x + R * c,
          z: s.z + R * sn,
          h: H + tr.delka,
          vx: c * ven,
          vz: sn * ven,
          vh: (s.velka ? 1.6 : 0.9) * (0.6 + this.r() * 0.7),
          r: tr.perla,
        });
      }
      const t0 = T_KORUNA * 0.78;
      if (!s.sloupPerla && t >= t0 + T_SLOUP * 0.5) {
        s.sloupPerla = true;
        this.perly.push({ x: s.x, z: s.z, h: s.r0 * (s.velka ? 2.4 : 1.5) + s.r0 * 0.24, vx: 0, vz: 0, vh: s.velka ? 0.9 : 0.4, r: s.r0 * 0.22 });
      }
      if (!s.pozde && t >= t0 + T_SLOUP) {
        s.pozde = true;
        for (const [v, sila] of [
          [0.42, 0.6],
          [0.66, 0.42],
        ])
          this.kruhy.push({ x: s.x, z: s.z, r: s.r0 * 0.3, v: v * (s.velka ? 1 : 0.6), vek: 0, zivot: 2.6, sila, teply: false });
      }
    }
    this.sprsky = this.sprsky.filter((s) => s.vek < T_KORUNA * 0.78 + T_SLOUP + 0.1);
  }

  private krokPerel(dt: number) {
    for (const p of this.perly) {
      p.vh -= TIZE * dt;
      p.x += p.vx * dt;
      p.z += p.vz * dt;
      p.h += p.vh * dt;
      if (p.h <= 0) {
        p.h = -1;
        this.kruhy.push({ x: p.x, z: p.z, r: p.r * 1.5, v: 0.3 + p.r * 2.6, vek: 0, zivot: 1.4, sila: 0.55, teply: false });
        this.udalosti.perla?.(p.r);
      }
    }
    this.perly = this.perly.filter((p) => p.h > -1 && p.z > 1.4);
  }

  private krokKruhu(dt: number) {
    for (const k of this.kruhy) {
      k.vek += dt;
      k.r += k.v * dt * (1 - 0.35 * (k.vek / k.zivot));
    }
    this.kruhy = this.kruhy.filter((k) => k.vek < k.zivot);
  }

  private polomerKoruny(s: Sprsk, t: number) {
    return s.r0 * (1 + (s.velka ? 0.78 : 0.7) * (1 - Math.exp(-t / (0.26 * T_KORUNA))));
  }
  private vyskaKoruny(s: Sprsk, t: number) {
    const q = t / T_KORUNA;
    if (q >= 1) return 0;
    return s.r0 * (s.velka ? 1.5 : 1.05) * Math.pow(Math.sin(Math.PI * Math.min(1, q * 1.06)), 0.7);
  }

  /** Plná kapka visí, nic nepadá ani se nevlní — skript nemusí nic přepisovat */
  klidna(): boolean {
    const v = this.vis;
    return (
      this.faze === "visi" &&
      !this.pad &&
      !this.sat &&
      !this.sprsky.length &&
      !this.perly.length &&
      !this.kruhy.length &&
      !this.male.length &&
      !this.zablesky.length &&
      Math.abs(v.k) < 0.015 &&
      Math.abs(v.kv) < 0.05
    );
  }

  /** Jak dlouho ještě do samovolného pádu (pro skript: první pád po zobrazení) */
  nastavOdpocet(s: number) {
    if (this.faze === "visi") this.odpocet = s;
  }

  /** Za kolik vteřin visící kapka spadne sama — skript podle toho nastaví budík, když smyčka v tichu stojí */
  zbyva(): number | null {
    return this.faze === "visi" ? Math.max(0, this.odpocet) : null;
  }

  snimek(): Snimek {
    const sn: Snimek = {
      kapka: null,
      cepicka: null,
      satelit: null,
      stopy: null,
      zare: 0,
      zarTrubky: 0,
      zablesky: [],
      kruhy: [],
      koruny: [],
      sloupy: [],
      perlyZad: [],
      perlyPred: [],
      male: [],
    };
    const v = this.vis;
    const p = this.pad;
    if (p) {
      const rx = p.r * (1 + 0.09 * p.k);
      const ry = p.r * (1 - 0.09 * p.k);
      sn.kapka = { d: volnaKapka(OSA_X, p.cy, p.r, p.k), cx: OSA_X, cy: p.cy, r: p.r, rx, ry, visi: false, krk: false, o: 1 - omez(p.ponor / PONOR) };
      sn.cepicka = tvarKapky(v.v, 0, v.k).d;
      if (!p.dopadla) {
        const delka = Math.min(260, p.vy * 0.2);
        sn.stopy = { x: OSA_X, y0: p.cy - p.r * 0.7 - delka, y1: p.cy - p.r * 0.7, o: omez(p.vy / 700) * 0.55 };
        sn.zare = 1 + 0.6 * omez((p.cy - 560) / 200);
      }
      sn.zarTrubky = Math.max(Math.pow(v.v, 1.6), 1 - omez((p.cy - 600) / 150));
    } else {
      const t = tvarKapky(v.v, v.p, v.k);
      sn.kapka = { d: t.d, cx: t.stred[0], cy: t.stred[1], r: t.r, rx: t.rx, ry: t.ry, visi: true, krk: v.v > 0.5, o: 1 };
      sn.zare = Math.pow(v.v, 1.6) * (1 + 0.25 * v.p);
      sn.zarTrubky = Math.pow(v.v, 1.6);
    }
    if (this.sat) sn.satelit = { x: OSA_X, y: this.sat.y, r: this.sat.r };

    for (const z of this.zablesky) {
      const [x, y] = promitni(z.x, z.z, z.r * 0.6);
      sn.zablesky.push({ x, y, r: z.r * meritko(z.z) * 2.4, o: z.o });
    }

    for (const k of this.kruhy) {
      const q = k.vek / k.zivot;
      const o = Math.min(1, k.sila * Math.pow(1 - q, 1.4) * omez(k.vek / 0.08) / (1 + 0.12 * k.r));
      if (o < 0.015) continue;
      const kroku = Math.round(omez(18 + k.r * 18, 18, 72));
      sn.kruhy.push({
        d: kruhNaHladine(k.x, k.z, k.r, kroku),
        dol: kruhNaHladine(k.x, k.z, k.r * 0.93 - 0.008, kroku),
        o,
        w: 3 * (1 - 0.5 * q),
        teply: k.teply,
      });
    }

    for (const s of this.sprsky) {
      const kor = this.koruna(s);
      if (kor) sn.koruny.push(kor.cesty), sn.perlyZad.push(...kor.perlyZad), sn.perlyPred.push(...kor.perlyPred);
      const sl = this.sloup(s);
      if (sl) {
        sn.sloupy.push({ d: sl.d, o: sl.o });
        if (sl.perla) sn.perlyPred.push(sl.perla);
      }
    }
    for (const pr of this.perly) {
      const [x, y] = promitni(pr.x, pr.z, pr.h);
      sn.perlyPred.push({ x, y, r: pr.r * meritko(pr.z) });
    }
    for (const m of this.male) {
      const [x] = promitni(m.x, m.z);
      sn.male.push({ x, y: m.sy, r: m.r * meritko(m.z) });
    }
    return sn;
  }

  /** Korunka: zadní a přední půlka stěny, trny trysek a perly na nich */
  private koruna(s: Sprsk) {
    const t = s.vek;
    if (t >= T_KORUNA) return null;
    const q = t / T_KORUNA;
    const rc = this.polomerKoruny(s, t);
    const H = this.vyskaKoruny(s, t);
    const lean = s.r0 * 0.5 * q;
    const o = q < 0.78 ? 1 : 1 - (q - 0.78) / 0.22;
    const n = s.trysky.length;
    const vyskaOkraje = (u: number) => H * (0.95 + 0.05 * Math.cos(n * u + s.faze));
    /* Stěna se nahoru rozevírá jako tulipán */
    const naStene = (u: number, a: number) => {
      const rr = rc + lean * a * a;
      return promitni(s.x + rr * Math.cos(u), s.z + rr * Math.sin(u), vyskaOkraje(u) * a);
    };
    const VYSKY = [0.2, 0.4, 0.6, 0.8, 1];

    const pul = (u0: number, u1: number) => {
      const N = 72;
      const dole: Bod[] = [];
      const nahore: Bod[] = [];
      for (let i = 0; i <= N; i++) {
        const u = mix(u0, u1, i / N);
        dole.push(naStene(u, 0));
        nahore.push(naStene(u, 1));
      }
      const zpet = [...nahore].reverse();
      const bokNahoru = [dole[N], ...VYSKY.map((a) => naStene(u1, a))];
      const bokDolu = [...VYSKY.map((a) => naStene(u0, a)).reverse(), dole[0]];
      return {
        stena: `M${bod(dole[0])}${hladce(dole)}${hladce(bokNahoru)}${hladce(zpet)}${hladce(bokDolu)}Z`,
        hrana: `M${bod(nahore[0])}${hladce(nahore)}`,
      };
    };
    const zad = pul(0, Math.PI);
    const pred = pul(Math.PI, Math.PI * 2);
    let odlesky = "";
    for (const u of [1.2, 1.38, 1.62, 1.82]) {
      const cara = [0, 0.25, 0.5, 0.75, 0.96].map((a) => naStene(u * Math.PI, a));
      odlesky += `M${bod(cara[0])}${hladce(cara)}`;
    }

    let trnyZad = "";
    let trnyPred = "";
    const perlyZad: Kolecko[] = [];
    const perlyPred: Kolecko[] = [];
    for (const tr of s.trysky) {
      /* Tryska roste s korunkou; po odletu perly se rychle stáhne */
      const rust = hladko(t / (T_KORUNA * 0.45));
      const j = tr.delka * rust * (tr.pryc ? Math.max(0, 1 - (t - tr.odlet) / 0.18) : 1);
      if (j < 0.004) continue;
      const R = rc + lean;
      const c = Math.cos(tr.u);
      const sn = Math.sin(tr.u);
      const h0 = vyskaOkraje(tr.u);
      const sirka = 0.11;
      const [lx, ly] = promitni(s.x + R * Math.cos(tr.u - sirka), s.z + R * Math.sin(tr.u - sirka), vyskaOkraje(tr.u - sirka) * 0.985);
      const [px, py] = promitni(s.x + R * Math.cos(tr.u + sirka), s.z + R * Math.sin(tr.u + sirka), vyskaOkraje(tr.u + sirka) * 0.985);
      const Rt = R + j * 0.3;
      const zt = s.z + Rt * sn;
      const [tx, ty] = promitni(s.x + Rt * c, zt, h0 + j);
      /* Prst: od okraje se zužuje do tenkého vlákna, na kterém visí perla */
      const vl = Math.max(0.5, tr.perla * meritko(zt) * 0.32);
      const trn =
        `M${f(lx)} ${f(ly)}C${f(mix(lx, tx, 0.55))} ${f(mix(ly, ty, 0.35))} ${f(tx - vl)} ${f(mix(ly, ty, 0.7))} ${f(tx - vl)} ${f(ty)}` +
        `L${f(tx + vl)} ${f(ty)}C${f(tx + vl)} ${f(mix(py, ty, 0.7))} ${f(mix(px, tx, 0.55))} ${f(mix(py, ty, 0.35))} ${f(px)} ${f(py)}Z`;
      const vzadu = sn > 0;
      if (vzadu) trnyZad += trn;
      else trnyPred += trn;
      if (!tr.pryc) (vzadu ? perlyZad : perlyPred).push({ x: tx, y: ty, r: tr.perla * meritko(zt) * hladko(t / 0.3) });
    }
    return {
      cesty: { zad: zad.stena, pred: pred.stena, hranaZad: zad.hrana, hranaPred: pred.hrana, trnyZad, trnyPred, odlesky, o },
      perlyZad,
      perlyPred,
    };
  }

  /** Sloupek (Worthingtonův výtrysk) z prostředka, když korunka spadne */
  private sloup(s: Sprsk) {
    const t0 = T_KORUNA * 0.78;
    const q = (s.vek - t0) / T_SLOUP;
    if (q <= 0 || q >= 1) return null;
    const vyska = s.r0 * (s.velka ? 2.4 : 1.5) * Math.sin(Math.PI * q);
    if (vyska < 0.01) return null;
    const wb = s.r0 * 0.46;
    const wt = s.r0 * 0.17;
    const levy: Bod[] = [];
    const pravy: Bod[] = [];
    for (let i = 0; i <= 6; i++) {
      const a = i / 6;
      const w = mix(wb, wt, Math.pow(a, 0.55)) * (a > 0.82 && q < 0.5 ? 0.82 : 1);
      levy.push(promitni(s.x - w / 2, s.z, vyska * a));
      pravy.push(promitni(s.x + w / 2, s.z, vyska * a));
    }
    const vrch = promitni(s.x, s.z, vyska + wt * 0.5);
    const zpet = [...pravy].reverse();
    const d = `M${bod(levy[0])}${hladce(levy)}Q${bod(vrch)} ${bod(zpet[0])}${hladce(zpet)}Z`;
    const rt = s.r0 * 0.22;
    const perla = !s.sloupPerla ? (() => {
      const [x, y] = promitni(s.x, s.z, vyska + rt * 0.9);
      return { x, y, r: rt * meritko(s.z) };
    })() : null;
    return { d, o: q < 0.85 ? 1 : 1 - (q - 0.85) / 0.15, perla };
  }
}
