// @ts-nocheck — převzato z návrhu navrhy/dvojka-vykres.html, čistý JS bez typů
/**
 * Tvar hrnku Futatsu: profil v mm (RIM/OUT/IN/BASE), objem, výstupky NUBS,
 * louže a tahy glazury, tečky a rozměry listů výkresu. Míry jsou odhad
 * z fotek — až přijdou skutečné, mění se jen tady a výkres (kresba.ts),
 * podobizna i tokonoma v krámku pak sedí na stejné míry.
 *
 * Zvlášť od výkresu proto, že tvar potřebuje i podobizna na první obrazovce
 * stránky Futatsu — výkres (a s ním krakelé počítané Voronoiem) se tak
 * stahuje až s kapitolou výkresu. Rozměry listů LAY, PAUZ a VEL odtud bere
 * i scripts/obchod2/futatsu.ts, aby výkres zabral správné místo, než se nakreslí.
 */
const r2 = (n) => Math.round(n * 100) / 100;
const D = (a, z) => "M" + a.map((p) => r2(p[0]) + " " + r2(p[1])).join("L") + (z ? "Z" : "");
const rad = (d) => (d * Math.PI) / 180;
const rng = (seed) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const bez = (p0, p1, p2, p3, n) => {
  const o = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
    o.push([a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]]);
  }
  return o;
};

/* ——— Tvar: pravá polovina profilu, y dolů od horní hrany okraje ——— */
const RIM = [];
for (let i = 0; i <= 14; i++) { const a = Math.PI * (1 - i / 14); RIM.push([40.3 + 1.7 * Math.cos(a), 1.7 - 1.7 * Math.sin(a)]); }
const OUT = [[42, 1.7], [40.6, 58], ...bez([40.6, 58], [40.4, 65.5], [39, 71.4], [36.2, 73], 12).slice(1), [35.6, 76]];
const BASE = [[35.6, 76], [30.5, 76], [29.2, 73.4]];
for (let i = 1; i <= 8; i++) { const r = 29.2 * (1 - i / 8); BASE.push([r, 72.8 + 0.6 * (r / 29.2) ** 2]); }
const IN = [[38.6, 1.7], [36.2, 54], ...bez([36.2, 54], [35.9, 61.5], [31.4, 65.8], [22, 66.1], 12).slice(1), [0, 66.4]];
const SIL = (() => { const p = [...RIM.slice(7), ...OUT.slice(1)]; return [...p, ...p.map(([x, y]) => [-x, y]).reverse()]; })();
const naY = (poly, y) => {
  for (let i = 1; i < poly.length; i++) {
    const [x0, y0] = poly[i - 1], [x1, y1] = poly[i];
    if (y <= y1) return y1 === y0 ? x1 : x0 + ((x1 - x0) * Math.max(0, y - y0)) / (y1 - y0);
  }
  return poly[poly.length - 1][0];
};
const Rout = (y) => (y < 1.7 ? 40.3 + Math.sqrt(Math.max(0, 2.89 - (1.7 - y) ** 2)) : naY(OUT, y));
const Rin = (y) => (y < 1.7 ? 38.6 : naY(IN, y));

/* Objem rotačního tělesa z profilu: 2π · ∫∫ r dA */
const moment = (P) => {
  let s = 0;
  for (let i = 0; i < P.length; i++) { const [x0, y0] = P[i], [x1, y1] = P[(i + 1) % P.length]; s += (x0 + x1) * (x0 * y1 - x1 * y0); }
  return Math.abs(s) / 6;
};
const V = (() => {
  const dutina = (y) => (2 * Math.PI * moment([[0, y], [Rin(y), y], ...IN.filter((p) => p[1] > y)])) / 1000;
  const strep = (2 * Math.PI * moment([...IN.slice().reverse(), ...RIM.slice(1), ...OUT.slice(1), ...BASE.slice(1)]) + 900) / 1000;
  return { objem: Math.round(dutina(0) / 10) * 10, napln: Math.round(dutina(10) / 10) * 10, hmotnost: Math.round((strep * 2.35) / 10) * 10 };
})();

/* ——— Výstupky: u po obvodu, v dolů, p = kolik vystupují ——— */
const blob = (a, b, seed) => {
  const r = rng(seed), f1 = r() * 6.28, f2 = r() * 6.28, o = [];
  for (let i = 0; i < 28; i++) { const t = (i / 28) * 2 * Math.PI, k = 1 + 0.06 * Math.sin(2 * t + f1) + 0.04 * Math.sin(3 * t + f2); o.push([a * k * Math.cos(t), b * k * Math.sin(t)]); }
  return o;
};
const vPolygonu = (P, x, y) => {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [xi, yi] = P[i], [xj, yj] = P[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};
const zrno = (P, n, seed) => {
  const r = rng(seed), xs = P.map((p) => p[0]), ys = P.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), o = [];
  for (let g = 0; o.length < n && g < n * 30; g++) { const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0); if (vPolygonu(P, x, y)) o.push([x, y, 0.12 + r() * 0.2]); }
  return o;
};
const NUBS = [
  { y: 17.5, p: 5.5, base: blob(7.6, 6.6, 11), facet: [[-5.4, -3], [-1, -3.8], [4.9, -3.4], [5.6, 1], [3.6, 3.9], [-4.2, 3], [-5.8, 0.4]] },
  { y: 54, p: 4, base: blob(5.6, 5, 23), facet: [[-3.6, -2.2], [0.4, -3.4], [3.6, -1.6], [3.2, 2.4], [-0.4, 3.4], [-3.6, 1.8]] },
];
NUBS.forEach((nb, i) => (nb.zrno = zrno(nb.facet, 30, 40 + i)));
/* 3D: x vpravo, y dolů, z k divákovi. a = kde na obvodu výstupky jsou, 0° = čelem k divákovi. */
const nub3 = (nb, a) => {
  const R = Rout(nb.y), A = rad(a), sa = Math.sin(A), ca = Math.cos(A), Rp = R + nb.p;
  const loc = ([u, v]) => [Rp * sa + u * ca, nb.y + v, Rp * ca - u * sa];
  return {
    ca, sa,
    base: nb.base.map(([u, v]) => { const g = A + u / R; return [R * Math.sin(g), nb.y + v, R * Math.cos(g)]; }),
    facet: nb.facet.map(loc),
    zrno: nb.zrno.map((z) => [...loc(z), z[2]]),
  };
};
const hull = (P) => {
  const p = P.map((q) => [q[0], q[1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  up.pop(); lo.pop();
  return lo.concat(up);
};
const rayR = (poly, t) => {
  const dx = Math.cos(t), dy = Math.sin(t);
  let best = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % poly.length], ex = x2 - x1, ey = y2 - y1, den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-9) continue;
    const tt = (x1 * ey - y1 * ex) / den, uu = (x1 * dy - y1 * dx) / den;
    if (tt > 0 && uu >= 0 && uu <= 1) best = Math.max(best, tt);
  }
  return best;
};

const LOUZE = Array.from({ length: 40 }, (_, i) => {
  const t = (i / 40) * 2 * Math.PI, r = 13 * (1 + 0.08 * Math.sin(3 * t + 1) + 0.05 * Math.sin(5 * t + 2));
  return [1.2 + r * Math.cos(t), -0.8 + r * Math.sin(t)];
});
const R0 = rng(7);
const TAHY = Array.from({ length: 18 }, (_, i) => ({ b: (i / 18) * 360 + R0() * 14, y1: 3 + R0() * 6, y2: 40 + R0() * 18, w: 1 + R0() * 2 }));
const TECKY = Array.from({ length: 46 }, () => ({ b: R0() * 360, y: 0.2 + R0() ** 1.6 * 3.2, r: 0.25 + R0() ** 2 * 0.7, rr: R0() }));

/* ——— Rozvržení listu: na šířku a na výšku (telefon) ——— */
const LAY = {
  siroky: { W: 1400, H: 1060, s: 10 / 3, fs: 1.12, w: 1, zony: [8, 6], b2: 215,
    front: [290, 498], top: [290, 262, 60], sec: [740, 498], bot: [740, 262, 60],
    detB: [1040, 262, 118], detC: [1262, 262, 88], notes: [944, 462, 420], title: [944, 830, 420, 196],
    kava: [150, 1000, 292, 902, -20], pero: [330, 1000, 770, 935] },
  uzky: { W: 760, H: 4110, s: 4.4, fs: 1.75, w: 1.55, zony: [4, 20], b2: 200,
    front: [380, 150], top: [380, 930, 680], sec: [380, 1240], bot: [380, 2000, 1760],
    detB: [380, 2465, 170], detC: [380, 2918, 130], notes: [60, 3290, 640], title: [56, 3826, 648, 250],
    kava: [600, 3860, 320, 3794, 200], pero: [60, 3238, 650, 3166] },
};
/* Pauzák s izometrií: samostatný list vedle výkresu */
const PAUZ = {
  siroky: { W: 700, H: 720, fs: 1.12, w: 1, izo: { cx: 350, y0: 232, s: 4.4, lx: 40, ly: 56, la: "start", tus: [36, 692, "start"], stin: [664, 642, "end"] } },
  uzky: { W: 700, H: 770, fs: 1.9, w: 1.7, izo: { cx: 350, y0: 280, s: 4.2, lx: 350, ly: 50, la: "middle", tus: [30, 748, "start"], stin: [676, 748, "end"] } },
};
/* Skutečná velikost: jednotky = milimetry */
const VEL = { W: 134, H: 118 };

export { r2, D, rad, rng, bez, RIM, OUT, BASE, IN, SIL, naY, Rout, Rin, moment, V, blob, vPolygonu, zrno, NUBS, nub3, hull, rayR, LOUZE, TAHY, TECKY, LAY, PAUZ, VEL };
