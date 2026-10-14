/**
 * Křivky pro kresby úvodu (ořech a krajina): hladké cesty skrz body,
 * vzorkování Catmull-Rom a drobné počty. Kresby jsou text, takže se tu
 * vše zaokrouhluje na desetiny — kratší cesty a stejné číslo při každém
 * buildu.
 */
export type Bod = [number, number];

export const f = (n: number) => Math.round(n * 10) / 10;
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const omez = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const hladce = (t: number) => {
  const q = omez(t);
  return q * q * (3 - 2 * q);
};
export const vzdal = (a: Bod, b: Bod) => Math.hypot(b[0] - a[0], b[1] - a[1]);

const crBod = (p0: Bod, p1: Bod, p2: Bod, p3: Bod, t: number): Bod => {
  const t2 = t * t, t3 = t2 * t;
  const k = (a: number, b: number, c: number, d: number) =>
    0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  return [k(p0[0], p1[0], p2[0], p3[0]), k(p0[1], p1[1], p2[1], p3[1])];
};

/** Catmull-Rom skrz body, zhruba po `krok` jednotkách */
export function vzorkuj(P: Bod[], krok: number): Bod[] {
  const out: Bod[] = [];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    const n = Math.max(1, Math.round(vzdal(p1, p2) / krok));
    for (let k = 0; k < n; k++) out.push(crBod(p0, p1, p2, p3, k / n));
  }
  out.push(P[P.length - 1]);
  return out;
}

/** Hladká cesta skrz body (Catmull-Rom převedený na Bézierovy křivky) */
export function hladka(P: Bod[], zavrit = true): string {
  const n = P.length;
  const g = (i: number) => (zavrit ? P[(i + n) % n] : P[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${f(P[0][0])} ${f(P[0][1])}`;
  const konec = zavrit ? n : n - 1;
  for (let i = 0; i < konec; i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + (zavrit ? " Z" : "");
}

/** Lomená uzavřená cesta — na drobnosti, kde hladkost není vidět */
export const lomena = (P: Bod[]) => `M${P.map(([x, y]) => `${f(x)} ${f(y)}`).join(" L")} Z`;

/** Výška křivky (body seřazené podle x) v místě x, lineárně mezi vzorky */
export function vyskaNa(B: Bod[], x: number): number {
  if (x <= B[0][0]) return B[0][1];
  for (let i = 0; i < B.length - 1; i++) {
    if (x <= B[i + 1][0]) return lerp(B[i][1], B[i + 1][1], (x - B[i][0]) / (B[i + 1][0] - B[i][0] || 1));
  }
  return B[B.length - 1][1];
}

/**
 * Celá čísla v cestách (atribut d) a v posunech `translate(…)`. Plátna kreseb
 * úvodu mají tisíce jednotek a jednotka je na obrazovce kolem pixelu, takže
 * desetiny jsou jen bajty navíc. Měřítka, průhlednost ani tloušťky čar se
 * nemění.
 */
export const celaCisla = (svg: string) =>
  svg
    .replace(/ d="([^"]*)"/g, (_, d: string) => ` d="${d.replace(/-?\d+\.\d+/g, (n) => String(Math.round(Number(n))))}"`)
    .replace(/translate\((-?[\d.]+) (-?[\d.]+)\)/g, (_, x: string, y: string) => `translate(${Math.round(Number(x))} ${Math.round(Number(y))})`);
