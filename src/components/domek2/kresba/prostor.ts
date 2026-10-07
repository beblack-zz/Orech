/**
 * Prostor dílny v metrech a jeho průmět do kresby. Dílna se kreslí jako
 * skutečná místnost (5,4 × 7,8 m, strop 2,6 m — odhad podle fotek) a do
 * kresby se promítá jednobodovou perspektivou z dvorku před okny. Věci
 * pak stojí tam, kde stojí doopravdy, a kamera prohlídky k nim může
 * dojet stejně jako v dílně v řezu na Úvodu 2.
 *
 * Osy: x od západu (−) na východ (+), y od podlahy nahoru, z od oken
 * (0) dozadu k severní stěně. Oko stojí na dvorku v ose místnosti.
 */
import { f, mnohouhelnik } from "./zaklad";
import type { Bod } from "./zaklad";

export type B3 = [number, number, number];

export interface Kamera {
  /** Kde stojí oko (x a výška v metrech) a jak daleko před okny */
  cx: number;
  cy: number;
  d: number;
  /** Ohnisková vzdálenost v pixelech kresby */
  f: number;
  /** Úběžník v kresbě */
  vx: number;
  vy: number;
}

export const KAMERA: Kamera = { cx: 0, cy: 1.65, d: 7, f: 1685, vx: 800, vy: 398 };

/** Rozměry místnosti */
export const MISTNOST = { x0: -2.7, x1: 2.7, hloubka: 7.8, strop: 2.6, stropU: 2.42, preklad: 1.2 };

export interface Barvy {
  celo?: string;
  vrch?: string;
  bok?: string;
  spodek?: string;
}

export function prostor(k: Kamera = KAMERA) {
  const P = (x: number, y: number, z: number): Bod => [k.vx + (k.f * (x - k.cx)) / (z + k.d), k.vy - (k.f * (y - k.cy)) / (z + k.d)];
  /** Pixelů na metr v hloubce z */
  const m = (z: number) => k.f / (z + k.d);
  const body = (b: B3[]) => b.map(([x, y, z]) => P(x, y, z));
  const plocha = (b: B3[], atributy = "") => mnohouhelnik(body(b), atributy);
  const cesta = (b: B3[], atributy = "", zavrit = false) => {
    const p = body(b);
    return `<path d="M${p.map(([x, y]) => `${f(x)} ${f(y)}`).join(" L")}${zavrit ? " Z" : ""}" ${atributy}/>`;
  };
  /** Úsečka v prostoru; tloušťka v metrech se přepočte podle hloubky */
  const cara3 = (a: B3, b: B3, barva: string, sirka = 0.02, extra = "") => {
    const [x1, y1] = P(...a);
    const [x2, y2] = P(...b);
    const w = sirka * m((a[2] + b[2]) / 2);
    return `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${barva}" stroke-width="${f(Math.max(0.6, w))}" ${extra}/>`;
  };

  /**
   * Kvádr: nakreslí jen stěny, které jsou od oka vidět (zadní nikdy).
   * Čelo je stěna k oknům (z0), bok ta, kterou oko vidí ze strany.
   */
  const kvadr = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, b: Barvy, extra = "") => {
    let s = "";
    if (k.cx < x0 && b.bok) s += plocha([[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], `fill="${b.bok}" ${extra}`);
    if (k.cx > x1 && b.bok) s += plocha([[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]], `fill="${b.bok}" ${extra}`);
    if (k.cy > y1 && b.vrch) s += plocha([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], `fill="${b.vrch}" ${extra}`);
    if (k.cy < y0 && b.spodek) s += plocha([[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], `fill="${b.spodek}" ${extra}`);
    if (b.celo) s += plocha([[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]], `fill="${b.celo}" ${extra}`);
    return s;
  };

  /**
   * Hodně čar stejné barvy jako jedna cesta (spáry dlažby, mřížky) —
   * stovky <line> by kresbu zbytečně nafoukly. Tloušťka podle průměrné hloubky.
   */
  const cary3 = (useky: [B3, B3][], barva: string, sirka = 0.01, extra = "") => {
    if (!useky.length) return "";
    let d = "";
    let z = 0;
    for (const [a, b] of useky) {
      const [x1, y1] = P(...a);
      const [x2, y2] = P(...b);
      d += `M${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}`;
      z += (a[2] + b[2]) / 2;
    }
    const w = sirka * m(z / useky.length);
    return `<path d="${d}" stroke="${barva}" stroke-width="${f(Math.max(0.6, w))}" fill="none" ${extra}/>`;
  };

  /** Body vodorovné kružnice (elipsy) ve výšce y */
  const kruznice = (cx: number, y: number, cz: number, rx: number, rz = rx, n = 30): B3[] =>
    Array.from({ length: n }, (_, i) => {
      const t = (i / n) * Math.PI * 2;
      return [cx + Math.cos(t) * rx, y, cz + Math.sin(t) * rz] as B3;
    });

  /** Ovál se zakulacenými konci (stůl z kanceláře) — délka podél x */
  const stadion = (cx: number, y: number, cz: number, delka: number, sirka: number, n = 20): B3[] => {
    const r = sirka / 2;
    const a = delka / 2 - r;
    const pts: B3[] = [];
    for (let i = 0; i <= n; i++) {
      const t = -Math.PI / 2 + (i / n) * Math.PI;
      pts.push([cx + a + Math.cos(t) * r, y, cz + Math.sin(t) * r]);
    }
    for (let i = 0; i <= n; i++) {
      const t = Math.PI / 2 + (i / n) * Math.PI;
      pts.push([cx - a + Math.cos(t) * r, y, cz + Math.sin(t) * r]);
    }
    return pts;
  };

  /** Konvexní obal bodů v kresbě — obrys válce je obal jeho dvou podstav */
  const obal = (pts: Bod[]): Bod[] => {
    const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const krizek = (o: Bod, a: Bod, b: Bod) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const dolni: Bod[] = [];
    for (const q of p) {
      while (dolni.length >= 2 && krizek(dolni[dolni.length - 2], dolni[dolni.length - 1], q) <= 0) dolni.pop();
      dolni.push(q);
    }
    const horni: Bod[] = [];
    for (let i = p.length - 1; i >= 0; i--) {
      const q = p[i];
      while (horni.length >= 2 && krizek(horni[horni.length - 2], horni[horni.length - 1], q) <= 0) horni.pop();
      horni.push(q);
    }
    return dolni.slice(0, -1).concat(horni.slice(0, -1));
  };

  /**
   * Svislý válec (pec, kbelík, kruh). Plášť je obal obou podstav a vybarví
   * se svislými pruhy podle šířky v kresbě — `plast` je seznam zastávek
   * přechodu zleva doprava. Vršek se kreslí, když je pod okem.
   */
  const valec = (cx: number, cz: number, r: number, y0: number, y1: number, plast: string[] | string, vrch?: string, id?: string, extra = "") => {
    const dole = body(kruznice(cx, y0, cz, r));
    const nahore = body(kruznice(cx, y1, cz, r));
    const o = obal([...dole, ...nahore]);
    let s = "";
    let vypln = typeof plast === "string" ? plast : "";
    if (Array.isArray(plast) && id) {
      const xs = o.map((b) => b[0]);
      const a = Math.min(...xs);
      const bb = Math.max(...xs);
      s += `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${f(a)}" y1="0" x2="${f(bb)}" y2="0">${plast
        .map((c, i) => `<stop offset="${f((i / (plast.length - 1)) * 100) / 100}" stop-color="${c}"/>`)
        .join("")}</linearGradient>`;
      vypln = `url(#${id})`;
    }
    s += mnohouhelnik(o, `fill="${vypln}" ${extra}`);
    if (vrch && k.cy > y1) s += mnohouhelnik(nahore, `fill="${vrch}"`);
    return s;
  };

  /** Vodorovný kotouč s tloušťkou (deska stolu, hlava kruhu, víko) */
  const kotouc = (obrys: (y: number) => B3[], y: number, t: number, vrch: string, hrana: string, extra = "") =>
    mnohouhelnik(body(obrys(y - t)), `fill="${hrana}" ${extra}`) + mnohouhelnik(body(obrys(y)), `fill="${vrch}" ${extra}`);

  return { P, m, body, plocha, cesta, cara3, cary3, kvadr, kruznice, stadion, obal, valec, kotouc };
}

export type Prostor = ReturnType<typeof prostor>;
