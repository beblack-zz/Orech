/**
 * Kamera nad dílnou v řezu (viewBox 1600 × 1000). Cíl je střed a kolik
 * ze scény má být vidět; kamera spočítá posun a zvětšení tak, aby se to
 * vešlo do rámu. Mezi dvěma cíli se zvětšení míchá v logaritmu — oko to
 * pak vnímá jako plynulý nájezd, ne jako zoom, který se rozjíždí.
 *
 * Při pohybu dostane svět will-change (jede plynule, i když trochu
 * rozmazaně) a po chvíli klidu se mu sundá, aby ho prohlížeč překreslil
 * v novém zvětšení načisto.
 */
import { mix } from "../parta2/stav";

export interface Cil {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** „x,y,w,h“ z atributu data-kamera */
export const cil = (s: string | undefined): Cil | null => {
  const c = (s ?? "").split(",").map(Number);
  return c.length === 4 && c.every(Number.isFinite) ? { x: c[0], y: c[1], w: c[2], h: c[3] } : null;
};

export interface Okraje {
  nahore: number;
  dole: number;
}

export function kamera(ram: HTMLElement, svet: HTMLElement, sirka = 1600) {
  let W = 0;
  let H = 0;
  let s0 = 1;
  let okraje: Okraje = { nahore: 0, dole: 0 };
  let posledni = "";
  let klidCas: number | undefined;

  const zmer = (o: Okraje = { nahore: 0, dole: 0 }) => {
    W = ram.clientWidth;
    H = ram.clientHeight;
    s0 = svet.offsetWidth / sirka || 1;
    okraje = o;
    posledni = "";
  };

  const zoom = (c: Cil) => {
    const vyska = Math.max(1, H - okraje.nahore - okraje.dole);
    return Math.max(0.2, Math.min(W / (c.w * s0), vyska / (c.h * s0)));
  };

  const nastav = (x: number, y: number, z: number) => {
    const vyska = H - okraje.nahore - okraje.dole;
    const tx = W / 2 - z * x * s0;
    const ty = okraje.nahore + vyska / 2 - z * y * s0;
    const t = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${z.toFixed(4)})`;
    if (t === posledni) return;
    posledni = t;
    svet.style.transform = t;
    svet.classList.add("jede");
    window.clearTimeout(klidCas);
    klidCas = window.setTimeout(() => svet.classList.remove("jede"), 180);
  };

  const mezi = (a: Cil, b: Cil, t: number) => {
    const za = Math.log(zoom(a));
    const zb = Math.log(zoom(b));
    nastav(mix(a.x, b.x, t), mix(a.y, b.y, t), Math.exp(mix(za, zb, t)));
  };

  return { zmer, mezi, na: (c: Cil) => mezi(c, c, 0) };
}
