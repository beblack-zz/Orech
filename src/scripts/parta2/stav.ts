/**
 * Společné drobnosti pro /parta-2: počty, barvy, úložiště a jeden
 * plánovač scrollu pro všechny scény.
 *
 * Scény si neměří pozici při každém snímku — to by při scrollu nutilo
 * prohlížeč přepočítávat rozvržení stránky. Pozice se změří jednou
 * (a znovu při změně velikosti nebo po načtení písma) a při scrollu
 * se počítá jen s čísly.
 */

export const omez = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export const hladce = (t: number) => t * t * (3 - 2 * t);
export const klid = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
export const SVGNS = "http://www.w3.org/2000/svg";

const hex = (h: string) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
export const mixBarva = (a: string, b: string, t: number) => {
  const A = hex(a);
  const B = hex(b);
  return `#${A.map((v, i) => Math.round(mix(v, B[i], t)).toString(16).padStart(2, "0")).join("")}`;
};

/** Česká čísla: mezera mezi tisíci a desetinná čárka */
export const cislo = (n: number, des = 0) =>
  n.toLocaleString("cs-CZ", { minimumFractionDigits: des, maximumFractionDigits: des });

export const uloz = (klic: string, hodnota: unknown) => {
  try {
    localStorage.setItem(klic, JSON.stringify(hodnota));
  } catch {}
};
export const nacti = <T>(klic: string, vychozi: T): T => {
  try {
    const s = localStorage.getItem(klic);
    return s ? (JSON.parse(s) as T) : vychozi;
  } catch {
    return vychozi;
  }
};

/** Pozice prvku na stránce, nezávisle na tom, kam je zrovna odscrollováno. */
export const pozice = (el: Element) => {
  const r = el.getBoundingClientRect();
  return { top: r.top + window.scrollY, left: r.left + window.scrollX, width: r.width, height: r.height };
};

type Uloha = (y: number, vh: number) => void;
const ulohy: Uloha[] = [];
const mereni: (() => void)[] = [];

export const priScrollu = (fn: Uloha) => ulohy.push(fn);
export const priMereni = (fn: () => void) => mereni.push(fn);

let ceka = false;
const snimek = () => {
  ceka = false;
  const y = window.scrollY;
  const vh = window.innerHeight;
  for (const u of ulohy) u(y, vh);
};
export const vyzadej = () => {
  if (ceka) return;
  ceka = true;
  requestAnimationFrame(snimek);
};
const premer = () => {
  for (const m of mereni) m();
  vyzadej();
};

export function spust() {
  window.addEventListener("scroll", vyzadej, { passive: true });
  let t: number | undefined;
  const poZmene = () => {
    window.clearTimeout(t);
    t = window.setTimeout(premer, 120);
  };
  window.addEventListener("resize", poZmene);
  new ResizeObserver(poZmene).observe(document.body);
  document.fonts?.ready.then(premer);
  window.addEventListener("load", premer);
  premer();
}

/** Spustí smyčku jen tehdy, když je prvek vidět — mimo obrazovku nic nepočítá. */
export function kdyzVidet(el: Element, krok: (t: number) => void) {
  let videt = false;
  const smycka = (t: number) => {
    if (!videt) return;
    krok(t);
    requestAnimationFrame(smycka);
  };
  new IntersectionObserver(([e]) => {
    const bylo = videt;
    videt = e.isIntersecting;
    if (videt && !bylo) requestAnimationFrame(smycka);
  }).observe(el);
}
