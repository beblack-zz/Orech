/**
 * Generátory tvarů pro /parta-2. Běží při buildu, takže náhoda musí být
 * deterministická — jinak by se koruna ořechu při každém sestavení
 * překreslila jinak a v gitu by to vypadalo jako změna.
 */

export const nahoda = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const f = (n: number) => Math.round(n * 10) / 10;

/**
 * Chomáč — vroubkovaná elipsa poskládaná z obloučků. Z toho je koruna
 * ořechu, keře i mraky. Body jdou po směru hodin a oblouky mají
 * sweep 1, takže se vyboulí ven, ne dovnitř.
 *
 * `dno` < 1 zploští spodní polovinu — mraky mají rovné břicho, listí ne.
 */
export function chomac(
  cx: number, cy: number, rx: number, ry: number,
  pocet: number, seed: number, dno = 1, hrbol = 0.62,
) {
  const r = nahoda(seed);
  const body: [number, number][] = [];
  for (let i = 0; i < pocet; i++) {
    const a = (i / pocet) * Math.PI * 2 + (r() - 0.5) * (Math.PI / pocet) * 0.6;
    const k = 0.88 + r() * 0.2;
    const x = cx + Math.cos(a) * rx * k;
    let y = cy + Math.sin(a) * ry * k;
    if (dno < 1 && y > cy) y = cy + (y - cy) * dno;
    body.push([x, y]);
  }
  let d = `M${f(body[0][0])} ${f(body[0][1])}`;
  for (let i = 0; i < pocet; i++) {
    const [x1, y1] = body[i];
    const [x2, y2] = body[(i + 1) % pocet];
    const rb = Math.hypot(x2 - x1, y2 - y1) * hrbol;
    d += ` A${f(rb)} ${f(rb)} 0 0 1 ${f(x2)} ${f(y2)}`;
  }
  return d + " Z";
}

/** Stébla trávy jako úzké zahnuté trojúhelníky, rozházená po šířce. */
export function trava(sirka: number, zem: number, vyska: number, pocet: number, seed: number) {
  const r = nahoda(seed);
  const stebla: string[] = [];
  for (let i = 0; i < pocet; i++) {
    const x = (i / pocet) * sirka + r() * (sirka / pocet) * 1.6 - 4;
    const w = 3 + r() * 5;
    const h = vyska * (0.45 + r() * 0.55);
    const l = (r() - 0.5) * 30;
    stebla.push(
      `M${f(x - w / 2)} ${zem} Q${f(x + l * 0.35)} ${f(zem - h * 0.6)} ${f(x + l)} ${f(zem - h)} Q${f(x + l * 0.45)} ${f(zem - h * 0.55)} ${f(x + w / 2)} ${zem} Z`,
    );
  }
  return stebla;
}

/** Rozházené body v obdélníku — hvězdy, světlušky, jiskry. */
export function body(pocet: number, seed: number, sirka = 100, vyska = 100) {
  const r = nahoda(seed);
  return Array.from({ length: pocet }, () => ({
    x: f(r() * sirka),
    y: f(r() * vyska),
    s: r(),
    t: r(),
  }));
}
