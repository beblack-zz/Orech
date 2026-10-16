// @ts-nocheck — převzato z návrhu navrhy/dvojka-vykres.html, čistý JS bez typů
/**
 * Výkres hrnku Futatsu: čisté generátory SVG bez DOM (stránka /obchod/futatsu,
 * scripts/obchod2/futatsu.ts). Míry v mm, profil RIM/OUT/IN/BASE a výstupky NUBS
 * jsou odhad z fotek — až přijdou skutečné, mění se jen tady.
 *
 *   list(rozvrzeni, stav)      modrotisk: pohledy, řez, detaily, razítko, pero, káva
 *   dyn(rozvrzeni, stav)       jen části, které se otáčejí (zepředu, shora, zespodu)
 *   pauzak / pauzakDyn         rozpracovaná izometrie na pauzáku
 *   velikost(stav)             pohled zepředu v milimetrech (skutečná velikost)
 *   interier()                 pohled do hrnku ve skutečných barvách (stárnutí krakelé)
 *   V                          objem a hmotnost spočítané z profilu
 *
 * Třídy fk-… barví styles/futatsu.css podle obalu (modrotisk, papír, pauzák).
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

/* ——— Krakelé: Voronoi z rozházené mřížky, hrany lehce zvlněné ——— */
const voronoi = (seed, L, c, jit, keep) => {
  const r = rng(seed), n = Math.ceil((2 * L) / c), S = [];
  for (let i = 0; i < n; i++) { S.push([]); for (let j = 0; j < n; j++) S[i].push([-L + (i + 0.5 + (r() - 0.5) * jit) * c, -L + (j + 0.5 + (r() - 0.5) * jit) * c]); }
  const videno = new Set(), E = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const s = S[i][j];
    let poly = [[s[0] - 2 * c, s[1] - 2 * c], [s[0] + 2 * c, s[1] - 2 * c], [s[0] + 2 * c, s[1] + 2 * c], [s[0] - 2 * c, s[1] + 2 * c]];
    for (let di = -2; di <= 2 && poly.length; di++) for (let dj = -2; dj <= 2 && poly.length; dj++) {
      if (!di && !dj) continue;
      const ii = i + di, jj = j + dj;
      if (ii < 0 || jj < 0 || ii >= n || jj >= n) continue;
      const q = S[ii][jj], mx = (s[0] + q[0]) / 2, my = (s[1] + q[1]) / 2, nx = q[0] - s[0], ny = q[1] - s[1];
      const h = (p) => (p[0] - mx) * nx + (p[1] - my) * ny, out = [];
      for (let k = 0; k < poly.length; k++) {
        const P = poly[k], Q = poly[(k + 1) % poly.length], hp = h(P), hq = h(Q);
        if (hp <= 0) out.push(P);
        if ((hp <= 0) !== (hq <= 0)) { const t = hp / (hp - hq); out.push([P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t]); }
      }
      poly = out;
    }
    for (let k = 0; k < poly.length; k++) {
      const P = poly[k], Q = poly[(k + 1) % poly.length];
      const klic = [P, Q].map((p) => Math.round(p[0] * 20) + "," + Math.round(p[1] * 20)).sort().join("|");
      if (videno.has(klic)) continue;
      videno.add(klic);
      if (keep < 1 && r() > keep) continue;
      const mx = (P[0] + Q[0]) / 2, my = (P[1] + Q[1]) / 2;
      if (Math.hypot(mx, my) > L) continue;
      const len = Math.hypot(Q[0] - P[0], Q[1] - P[1]) || 1, w = (r() - 0.5) * 0.35 * len;
      E.push([P, [mx - ((Q[1] - P[1]) / len) * w, my + ((Q[0] - P[0]) / len) * w], Q]);
    }
  }
  return E;
};
const KRAK = [...voronoi(5, 38.8, 5.2, 0.95, 1), ...voronoi(9, 38.8, 2.6, 0.95, 0.3)];
const krakD = (E, X, Y) => E.map(([p, c, q]) => `M${r2(X(p[0]))} ${r2(Y(p[1]))}Q${r2(X(c[0]))} ${r2(Y(c[1]))} ${r2(X(q[0]))} ${r2(Y(q[1]))}`).join("");
const LOUZE = Array.from({ length: 40 }, (_, i) => {
  const t = (i / 40) * 2 * Math.PI, r = 13 * (1 + 0.08 * Math.sin(3 * t + 1) + 0.05 * Math.sin(5 * t + 2));
  return [1.2 + r * Math.cos(t), -0.8 + r * Math.sin(t)];
});
const R0 = rng(7);
const TAHY = Array.from({ length: 18 }, (_, i) => ({ b: (i / 18) * 360 + R0() * 14, y1: 3 + R0() * 6, y2: 40 + R0() * 18, w: 1 + R0() * 2 }));
const TECKY = Array.from({ length: 46 }, () => ({ b: R0() * 360, y: 0.2 + R0() ** 1.6 * 3.2, r: 0.25 + R0() ** 2 * 0.7, rr: R0() }));

/* ——— Kreslicí pomůcky ——— */
const sty = (o) => ({
  v: `stroke-width="${r2(1.7 * o.w)}"`,
  m: `stroke-width="${r2(1.15 * o.w)}"`,
  t: `stroke-width="${r2(0.7 * o.w)}" opacity=".5"`,
  s: `stroke-width="${r2(1.05 * o.w)}" stroke-dasharray="${r2(5 * o.w)} ${r2(3.4 * o.w)}"`,
  o: `stroke-width="${r2(0.75 * o.w)}" stroke-dasharray="${r2(18 * o.w)} ${r2(4 * o.w)} ${r2(3 * o.w)} ${r2(4 * o.w)}" opacity=".7"`,
  d: `stroke-width="${r2(0.75 * o.w)}"`,
});
const ln = (x1, y1, x2, y2, cls, st) => `<line x1="${r2(x1)}" y1="${r2(y1)}" x2="${r2(x2)}" y2="${r2(y2)}" class="${cls}" ${st}/>`;
const kr = (cx, cy, r, cls, st = "") => `<circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(r)}" class="${cls}" ${st}/>`;
const tx = (x, y, s, size, cls, extra = "") => `<text x="${r2(x)}" y="${r2(y)}" font-size="${r2(size)}" class="${cls}" ${extra}>${s}</text>`;
const sip = (x, y, ang, o) => {
  const l = 7 * o.fs, h = 2.2 * o.fs, c = Math.cos(ang), s = Math.sin(ang);
  return `<path class="fk-sip" d="M${r2(x)} ${r2(y)}L${r2(x - l * c - h * s)} ${r2(y - l * s + h * c)}L${r2(x - l * c + h * s)} ${r2(y - l * s - h * c)}Z"/>`;
};
const halo = (o) => `stroke-width="${r2(4 * o.fs)}"`;
const pomoc = (x1, y1, x2, y2, o) => ln(x1, y1, x2, y2, "fk-d", sty(o).d);
const kotaH = (y, x1, x2, txt, o, pod) =>
  ln(x1, y, x2, y, "fk-d", sty(o).d) + sip(x1, y, Math.PI, o) + sip(x2, y, 0, o) +
  tx((x1 + x2) / 2, pod ? y + 15 * o.fs : y - 4 * o.fs, txt, 13 * o.fs, "fk-dt fk-halo", `text-anchor="middle" ${halo(o)}`);
const kotaV = (x, y1, y2, txt, o, vpravo) => {
  const ty = (y1 + y2) / 2, x0 = vpravo ? x + 5 * o.fs : x - 5 * o.fs;
  return ln(x, y1, x, y2, "fk-d", sty(o).d) + sip(x, y1, -Math.PI / 2, o) + sip(x, y2, Math.PI / 2, o) +
    tx(x0, ty, txt, 13 * o.fs, "fk-dt fk-halo", `text-anchor="middle" ${halo(o)} transform="rotate(${vpravo ? 90 : -90} ${r2(x0)} ${r2(ty)})"`);
};
const NAZVY = ["", "okraj", "dva výstupky", "stěna", "glazura shino", "vnitřek a krakelé", "patka"];
const balon = (n, px, py, bx, by, o) => {
  const r = 12 * o.fs, dx = px - bx, dy = py - by, d = Math.hypot(dx, dy) || 1;
  return `<g class="balon" data-dil="${n}" tabindex="0" role="button" aria-label="${n}: ${NAZVY[n]}">` +
    ln(bx + (dx / d) * r, by + (dy / d) * r, px, py, "fk-c", `stroke-width="${r2(0.8 * o.w)}"`) +
    kr(px, py, 2.2 * o.fs, "fk-tecka") + kr(bx, by, r, "fk-c fk-bal", `stroke-width="${r2(1.2 * o.w)}"`) +
    tx(bx, by + 4.6 * o.fs, n, 13 * o.fs, "fk-bt", `text-anchor="middle"`) + `</g>`;
};
const titulek = (x, y, txt, o, sub) =>
  tx(x, y, txt, 14 * o.fs, "fk-tit", `text-anchor="middle" letter-spacing="${r2(2 * o.fs)}"`) +
  (sub ? tx(x, y + 17 * o.fs, sub, 11 * o.fs, "fk-sub", `text-anchor="middle"`) : "");
const odsad = (P, tl, ex) => P.map((p, i) => {
  const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)];
  let dx = b[0] - a[0], dy = b[1] - a[1];
  const l = Math.hypot(dx, dy) || 1;
  dx /= l; dy /= l;
  const t = tl(p[0], p[1]) * ex;
  return [p[0] + dy * t, p[1] - dx * t];
});
const vzory = (id, w) =>
  `<pattern id="${id}-srafy" width="${r2(6.5 * w)}" height="${r2(6.5 * w)}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="${r2(6.5 * w)}" class="fk-c" stroke-width="${r2(0.7 * w)}" opacity=".55"/></pattern>` +
  `<pattern id="${id}-srafy2" width="${r2(13 * w)}" height="${r2(13 * w)}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="${r2(13 * w)}" class="fk-c" stroke-width="${r2(0.8 * w)}" opacity=".5"/></pattern>` +
  `<pattern id="${id}-hlina" width="${r2(5 * w)}" height="${r2(5 * w)}" patternUnits="userSpaceOnUse"><circle cx="${r2(1.2 * w)}" cy="${r2(1.5 * w)}" r="${r2(0.55 * w)}" class="fk-tec"/><circle cx="${r2(3.7 * w)}" cy="${r2(3.9 * w)}" r="${r2(0.45 * w)}" class="fk-tec"/></pattern>`;

/* ——— Pohled zepředu (otáčí se) ——— */
function zepredu(o) {
  const S = sty(o), s = o.s, f = o.fs, a = o.a;
  const X = (x) => o.cx + x * s, Y = (y) => o.y0 + y * s, T = (p) => [X(p[0]), Y(p[1])];
  let g = "";
  let t = "";
  for (const q of TAHY) {
    const az = q.b + a, c = Math.cos(rad(az));
    if (c < 0.12) continue;
    const P = [];
    for (let i = 0; i <= 6; i++) { const y = q.y1 + ((q.y2 - q.y1) * i) / 6; P.push(T([(Rout(y) - 0.15) * Math.sin(rad(az + q.w * Math.sin(y * 0.2 + q.b))), y])); }
    t += `<path d="${D(P)}" class="fk-c" stroke-width="${r2(0.6 * o.w)}" opacity="${r2(0.1 + 0.35 * c)}"/>`;
  }
  g += `<g data-dil="3">${t}</g>`;
  let e = "";
  for (const k of TECKY) {
    const az = rad(k.b + a), c = Math.cos(az);
    if (c < 0.08) continue;
    e += `<ellipse cx="${r2(X((Rout(k.y) - 0.25) * Math.sin(az)))}" cy="${r2(Y(k.y))}" rx="${r2(k.r * s * Math.max(c, 0.35))}" ry="${r2(k.r * s * 0.85)}" class="fk-h"/>`;
  }
  g += `<g data-dil="1">${e}${ln(X(-42), Y(1.7), X(42), Y(1.7), "fk-c", S.t)}</g>`;
  g += ln(X(-40.6), Y(58), X(40.6), Y(58), "fk-c", S.t);
  g += `<g data-dil="6"><path d="${D([[36.2, 73], [35.6, 76], [-35.6, 76], [-36.2, 73]].map(T), true)}" style="fill:url(#${o.id}-hlina)"/>` +
    ln(X(-35.9), Y(73.7), X(35.9), Y(73.7), "fk-hl", `stroke-width="${r2(1.6 * o.w)}"`) + `</g>`;
  g += `<path d="${D(SIL.map(T), true)}" class="fk-c" ${S.v}/>`;
  g += `<g data-dil="4 6">${ln(X(-36.2), Y(73), X(36.2), Y(73), "fk-c", S.m)}</g>`;
  let v = "";
  for (const P of NUBS.map((nb) => nub3(nb, a)).sort((p, q) => p.ca - q.ca)) {
    const H = D(hull([...P.base, ...P.facet]).map(T), true);
    if (P.ca > -0.02) {
      v += `<path d="${H}" class="fk-c fk-bg" ${S.v}/>`;
      if (P.ca > 0.3) v += `<path d="${D(P.base.map(T), true)}" class="fk-c" ${S.t}/>`;
      if (P.ca > 0.04) {
        v += `<path d="${D(P.facet.map(T), true)}" class="fk-c fk-h" ${S.m}/>`;
        if (P.ca > 0.3) v += P.zrno.map((z) => kr(X(z[0]), Y(z[1]), z[3] * s, "fk-zrno")).join("");
      }
    } else {
      v += `<g mask="url(#${o.id}-ven)"><path d="${H}" class="fk-c fk-bg" ${S.v}/></g><g clip-path="url(#${o.id}-in)"><path d="${H}" class="fk-c" ${S.s}/></g>`;
    }
  }
  g += `<g data-dil="2">${v}</g>`;
  g += ln(X(0), Y(-5), X(0), Y(82), "fk-c", S.o);
  let k = "";
  const xh = X(-54);
  k += pomoc(X(-40.3) - 3 * f, Y(0), xh - 4 * f, Y(0), o) + pomoc(X(-35.6) - 3 * f, Y(76), xh - 4 * f, Y(76), o) + kotaV(xh, Y(0), Y(76), "76", o);
  const yr = Y(-9);
  k += pomoc(X(-42), Y(1.7) - 3 * f, X(-42), yr - 4 * f, o) + pomoc(X(42), Y(1.7) - 3 * f, X(42), yr - 4 * f, o) + kotaH(yr, X(-42), X(42), "⌀84", o);
  const yf = Y(85);
  k += pomoc(X(-35.6), Y(76) + 3 * f, X(-35.6), yf + 4 * f, o) + pomoc(X(35.6), Y(76) + 3 * f, X(35.6), yf + 4 * f, o) + kotaH(yf, X(-35.6), X(35.6), "⌀71", o);
  if (Math.sin(rad(a)) > 0.35) {
    const [P1, P2] = NUBS.map((nb) => nub3(nb, a)), x1 = X(56), x2 = X(64);
    const m1 = Math.max(...P1.facet.map((p) => p[0]), ...P1.base.map((p) => p[0]));
    const m2 = Math.max(...P2.facet.map((p) => p[0]), ...P2.base.map((p) => p[0]));
    k += pomoc(X(40.6), Y(0), x2 + 4 * f, Y(0), o) + pomoc(X(m1) + 3 * f, Y(17.5), x1 + 4 * f, Y(17.5), o) + pomoc(X(m2) + 3 * f, Y(54), x2 + 4 * f, Y(54), o);
    k += kotaV(x1, Y(0), Y(17.5), "17,5", o, true) + kotaV(x2, Y(0), Y(54), "54", o, true);
  }
  g += `<g class="kota">${k}</g>`;
  return g;
}

/* ——— Pohled shora ——— */
function shora(o) {
  const S = sty(o), s = o.s, f = o.fs, X = (x) => o.cx + x * s, Y = (z) => o.cy + z * s;
  let g = `<g data-dil="5"><g clip-path="url(#${o.id}-vn)"><path d="${krakD(KRAK, X, Y)}" class="fk-c" stroke-width="${r2(0.55 * o.w)}" opacity=".34"/></g>` +
    `<path d="${D(LOUZE.map(([x, z]) => [X(x), Y(z)]), true)}" class="fk-c fk-sklo" stroke-width="${r2(0.7 * o.w)}" stroke-opacity=".5"/></g>`;
  g += `<g data-dil="1">${kr(X(0), Y(0), 42 * s, "fk-c", S.v)}${kr(X(0), Y(0), 38.6 * s, "fk-c", S.v)}</g>`;
  g += kr(X(0), Y(0), 36.2 * s, "fk-c", S.t) + kr(X(0), Y(0), 22 * s, "fk-c", S.t);
  g += ln(X(-50), Y(0), X(50), Y(0), "fk-c", S.o) + ln(X(0), Y(-50), X(0), Y(50), "fk-c", S.o);
  const th = rad(-32), c = Math.cos(th), sn = Math.sin(th), R = 38.6;
  const x1 = X(-R * c), y1 = Y(-R * sn), x2 = X(R * c), y2 = Y(R * sn), tx0 = X(R * 0.52 * c), ty0 = Y(R * 0.52 * sn);
  g += `<g class="kota">` + ln(x1, y1, x2, y2, "fk-d", S.d) + sip(x1, y1, th + Math.PI, o) + sip(x2, y2, th, o) +
    tx(tx0, ty0 - 4 * f, "⌀77", 13 * f, "fk-dt fk-halo", `text-anchor="middle" ${halo(o)} transform="rotate(-32 ${r2(tx0)} ${r2(ty0)})"`) + `</g>`;
  const b1 = rad(210), b5 = rad(160);
  g += balon(1, X(40.3 * Math.cos(b1)), Y(40.3 * Math.sin(b1)), X(62 * Math.cos(b1)), Y(62 * Math.sin(b1)), o);
  g += balon(5, X(-17), Y(9), X(62 * Math.cos(b5)), Y(62 * Math.sin(b5)), o);
  g += titulek(o.cx, o.ty, "POHLED SHORA", o);
  return g;
}
function shoraDyn(o) {
  const S = sty(o), s = o.s, f = o.fs, a = o.a, A = rad(a), X = (x) => o.cx + x * s, Y = (z) => o.cy + z * s;
  let e = "";
  for (const k of TECKY) { const az = rad(k.b + a), r = 38.9 + k.rr * 2.9; e += kr(X(r * Math.sin(az)), Y(r * Math.cos(az)), k.r * s * 0.9, "fk-h"); }
  let g = `<g data-dil="1">${e}</g>`;
  const [P1, P2] = NUBS.map((nb) => nub3(nb, a));
  const pl = (P) => D(hull([...P.base, ...P.facet].map((p) => [X(p[0]), Y(p[2])])), true);
  const R1 = Rout(17.5) + 5.5, um = [-5.8, 5.6].map((u) => [R1 * Math.sin(A) + u * Math.cos(A), R1 * Math.cos(A) - u * Math.sin(A)]);
  g += `<g data-dil="2" mask="url(#${o.id}-okraj)"><path d="${pl(P1)}" class="fk-c fk-bg" ${S.v}/>` +
    ln(X(um[0][0]), Y(um[0][1]), X(um[1][0]), Y(um[1][1]), "fk-hl", `stroke-width="${r2(2.4 * o.w)}"`) +
    `<path d="${pl(P2)}" class="fk-c" ${S.s}/></g>`;
  const ph = A + Math.PI / 2, ux = Math.sin(ph), uz = Math.cos(ph), nx = -Math.sin(A), nz = -Math.cos(A);
  let r = ln(X(-44 * ux), Y(-44 * uz), X(44 * ux), Y(44 * uz), "fk-c", S.o);
  for (const sg of [-1, 1]) {
    const ex = sg * 49 * ux, ez = sg * 49 * uz, ix = sg * 44 * ux, iz = sg * 44 * uz, kx = ex + nx * 6.5, kz = ez + nz * 6.5;
    r += ln(X(ix), Y(iz), X(ex), Y(ez), "fk-c", `stroke-width="${r2(2.6 * o.w)}"`);
    r += ln(X(ex), Y(ez), X(kx), Y(kz), "fk-c", S.m) + sip(X(kx), Y(kz), Math.atan2(nz, nx), o);
    r += tx(X(kx + sg * 3.6 * ux), Y(kz + sg * 3.6 * uz) + 5 * f, "A", 14 * f, "fk-dt fk-halo", `text-anchor="middle" font-weight="600" ${halo(o)}`);
  }
  g += `<g class="rez-stopa">${r}</g>`;
  g += tx(o.cx + 48 * s, o.ty, "↻ " + String(Math.round(a) % 360).padStart(3, "0") + "°", 12 * f, "fk-sub", `text-anchor="end"`);
  return g;
}

/* ——— Řez A–A, vedený mimo výstupky ——— */
function rez(o) {
  const S = sty(o), s = o.s, f = o.fs, X = (x) => o.cx + x * s, Y = (y) => o.y0 + y * s, T = (p) => [X(p[0]), Y(p[1])], M = (p) => [-p[0], p[1]];
  const right = [...IN.slice().reverse(), ...RIM.slice(1), ...OUT.slice(1), ...BASE.slice(1)];
  const poly = [...right, ...right.map(M).reverse().slice(1, -1)];
  let g = `<g data-dil="3"><path d="${D(poly.map(T), true)}" class="fk-c" style="fill:url(#${o.id}-srafy)" ${S.v}/></g>`;
  const povrch = [...IN.slice().reverse(), ...RIM.slice(1), ...OUT.slice(1, -1)];
  const tl = (x, y) => (y > 60 && x < 16 ? 0.7 + 0.9 * (1 - (x / 16) ** 2) : y < 1.7 ? 0.32 + 0.38 * (y / 1.7) : 0.7);
  const pas = [...povrch, ...odsad(povrch, tl, 1.5).reverse()];
  g += `<g data-dil="4"><path d="${D(pas.map(T), true)}" class="fk-c fk-sklo" stroke-width="${r2(0.75 * o.w)}"/><path d="${D(pas.map(M).map(T), true)}" class="fk-c fk-sklo" stroke-width="${r2(0.75 * o.w)}"/></g>`;
  g += ln(X(0), Y(-5), X(0), Y(82), "fk-c", S.o);
  let k = "";
  const yr = Y(-8);
  k += pomoc(X(-38.6), Y(1.7) - 3 * f, X(-38.6), yr - 4 * f, o) + pomoc(X(38.6), Y(1.7) - 3 * f, X(38.6), yr - 4 * f, o) + kotaH(yr, X(-38.6), X(38.6), "⌀77", o);
  k += pomoc(X(39.5), Y(0), X(12), Y(0), o) + kotaV(X(16), Y(0), Y(66.3), "66", o, true);
  const yw = Y(24), xo = X(-Rout(24)), xi = X(-Rin(24)), l = 16 * f;
  k += ln(xo - l, yw, xo, yw, "fk-d", S.d) + sip(xo, yw, 0, o) + ln(xi + l, yw, xi, yw, "fk-d", S.d) + sip(xi, yw, Math.PI, o) +
    tx(xo - l - 3 * f, yw + 4.5 * f, "4", 13 * f, "fk-dt fk-halo", `text-anchor="end" ${halo(o)}`);
  k += kotaV(X(-5), Y(66.4), Y(72.8), "6,5", o);
  g += `<g class="kota">${k}</g>`;
  g += `<g data-dil="5">` + ln(X(2), Y(65.4), X(-13), Y(51.5), "fk-c", `stroke-width="${r2(0.7 * o.w)}"`) + kr(X(2), Y(65.4), 1.8 * f, "fk-tecka") +
    tx(X(-14), Y(51), "茶溜まり", 15 * f, "fk-dt fk-kanji", `text-anchor="end"`) + tx(X(-14), Y(51) + 14 * f, "chadamari", 10.5 * f, "fk-sub", `text-anchor="end"`) + `</g>`;
  g += kr(X(40.3), Y(2.4), 6.5 * s, "fk-c", S.t) + tx(X(47.5), Y(-4.5), "C", 14 * f, "fk-dt", `font-weight="600"`);
  g += balon(3, X(-Rout(46) + 1.8), Y(46), X(-57), Y(56), o) + balon(4, X(Rin(38) - 0.7), Y(38), X(27), Y(28), o);
  g += titulek(o.cx, Y(85) + 36 * f, "ŘEZ A–A", o, "vedený mimo výstupky");
  return g;
}

/* ——— Pohled zespodu ——— */
function zespodu(o) {
  const S = sty(o), s = o.s, f = o.fs, X = (x) => o.cx + x * s, Y = (z) => o.cy - z * s;
  const c = (r, st, cls = "fk-c") => kr(o.cx, o.cy, r * s, cls, st);
  let g = `<circle cx="${r2(o.cx)}" cy="${r2(o.cy)}" r="${r2(36.2 * s)}" style="fill:url(#${o.id}-hlina)"/>`;
  g += c(42, S.v) + c(40.6, S.t);
  const spir = [];
  for (let i = 0; i <= 120; i++) { const t = i / 120, r = 0.2 + t * 5.4, q = t * 2.6 * 2 * Math.PI; spir.push([X(r * Math.cos(q)), Y(r * Math.sin(q))]); }
  g += `<g data-dil="6">` + c(35.85, `stroke-width="${r2(1.8 * o.w)}"`, "fk-hl") + c(36.2, S.m) + c(35.6, S.v) + c(30.5, S.v) + c(29.2, S.m) +
    [24, 18.5, 12.5, 6.8].map((r) => c(r, S.t)).join("") + `<path d="${D(spir)}" class="fk-c" ${S.t}/></g>`;
  g += ln(X(-50), Y(0), X(50), Y(0), "fk-c", S.o) + ln(X(0), Y(-50), X(0), Y(50), "fk-c", S.o);
  const prumer = (R, deg, txt, kde) => {
    const th = rad(deg), cc = Math.cos(th), sn = Math.sin(th), x1 = o.cx - R * s * cc, y1 = o.cy - R * s * sn, x2 = o.cx + R * s * cc, y2 = o.cy + R * s * sn;
    const tx0 = o.cx + kde * R * s * cc, ty0 = o.cy + kde * R * s * sn;
    return ln(x1, y1, x2, y2, "fk-d", S.d) + sip(x1, y1, th + Math.PI, o) + sip(x2, y2, th, o) +
      tx(tx0, ty0 - 4 * f, txt, 13 * f, "fk-dt fk-halo", `text-anchor="middle" ${halo(o)} transform="rotate(${deg} ${r2(tx0)} ${r2(ty0)})"`);
  };
  g += `<g class="kota">${prumer(35.6, -28, "⌀71", 0.62)}${prumer(29.2, 28, "⌀58", -0.5)}</g>`;
  const b6 = rad(135);
  g += balon(6, X(33 * Math.cos(b6)), o.cy + 33 * s * Math.sin(b6), X(62 * Math.cos(b6)), o.cy + 62 * s * Math.sin(b6), o);
  g += titulek(o.cx, o.ty, "POHLED ZESPODU", o);
  return g;
}
function zespoduDyn(o) {
  const S = sty(o), s = o.s, X = (x) => o.cx + x * s, Y = (z) => o.cy - z * s;
  const [P1, P2] = NUBS.map((nb) => nub3(nb, o.a));
  const pl = (P) => D(hull([...P.base, ...P.facet].map((p) => [X(p[0]), Y(p[2])])), true);
  return `<g data-dil="2" mask="url(#${o.id}-spod)"><path d="${pl(P1)}" class="fk-c fk-bg" ${S.v}/><path d="${pl(P2)}" class="fk-c fk-bg" ${S.v}/></g>`;
}

/* ——— Izometrie: pohled shora pod náklonem 35°16′. U rotačního tělesa je to totéž
   co izometrie, natočení o 45° řeší jen výstupky. Obrys = sjednocení vodorovných
   kotoučů profilu, viditelnost bodu = nezakrývá ho kotouč nad ním. ——— */
const IC = Math.sqrt(2 / 3), IS = Math.sqrt(1 / 3);
const KOTOUCE = [];
for (let i = 0; i <= 152; i++) KOTOUCE.push([i * 0.5, Rout(i * 0.5)]);
const IZO = (() => {
  const horni = [], dolni = [];
  for (let i = 0; i <= 168; i++) {
    const X = -42 + i * 0.5;
    let lo = Infinity, hi = -Infinity;
    for (const [y, r] of KOTOUCE) {
      if (Math.abs(X) > r) continue;
      const h = IS * Math.sqrt(r * r - X * X);
      lo = Math.min(lo, y * IC - h);
      hi = Math.max(hi, y * IC + h);
    }
    if (lo < Infinity) { horni.push([X, lo]); dolni.push([X, hi]); }
  }
  return { horni, dolni };
})();
const vidim = (X, y, r) => {
  const Yp = y * IC + IS * Math.sqrt(Math.max(0, r * r - X * X));
  for (const [yk, rk] of KOTOUCE) {
    if (yk >= y - 0.25) break;
    if (Math.abs(X) <= rk && yk * IC + IS * Math.sqrt(rk * rk - X * X) > Yp + 0.05) return false;
  }
  return true;
};
/* Čára tužkou: dva lehce rozkolísané tahy */
const tuzka = (P, seed, o, op = 0.5) => {
  const q = rng(seed), f1 = q() * 6.3, f2 = q() * 6.3;
  const tah = (j) => P.map((p, i) => {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const w = (0.7 * Math.sin(i * 0.17 + f1 + j) + 0.45 * Math.sin(i * 0.53 + f2)) * o.w + j * 0.9 * o.w;
    return [p[0] - ((b[1] - a[1]) / l) * w, p[1] + ((b[0] - a[0]) / l) * w];
  });
  return `<path d="${D(tah(0))}" class="fk-c" stroke-width="${r2(0.75 * o.w)}" opacity="${op}"/><path d="${D(tah(1))}" class="fk-c" stroke-width="${r2(0.5 * o.w)}" opacity="${r2(op * 0.55)}"/>`;
};
const ruka = (o, x, y, txt, anchor, cil) => {
  const f = o.fs, w = txt.length * 19 * f * 0.4;
  const sx = anchor === "end" ? x - w * 0.5 : anchor === "middle" ? x : x + w * 0.5, sy = y + 7 * f;
  const mx = (sx + cil[0]) / 2 + (cil[1] - sy) * 0.18, my = (sy + cil[1]) / 2 - Math.abs(cil[0] - sx) * 0.14;
  return tx(x, y, txt, 19 * f, "fk-ruka", `text-anchor="${anchor}"`) +
    `<path d="M${r2(sx)} ${r2(sy)}Q${r2(mx)} ${r2(my)} ${r2(cil[0])} ${r2(cil[1])}" class="fk-hl" stroke-width="${r2(1.3 * o.w)}"/>` + kr(cil[0], cil[1], 2.2 * f, "fk-h");
};
const izoTvar = (o) => {
  const P = ([X, Y]) => [o.cx + X * o.s, o.y0 + Y * o.s];
  const H = IZO.horni.map(P), Dl = IZO.dolni.map(P);
  return { P, H, Dl, sil: D([...H, ...Dl.slice().reverse()], true), otvor: D(Array.from({ length: 97 }, (_, i) => { const b = (i / 96) * 2 * Math.PI; return P([38.6 * Math.sin(b), 1.7 * IC + 38.6 * Math.cos(b) * IS]); }), true) };
};
function izo(o) {
  const S = sty(o), s = o.s, f = o.fs, q = rng(91);
  const { P, H, Dl } = izoTvar(o);
  const P3 = (x, y, z) => P([x, y * IC + z * IS]);
  const elipsa = (y, r, b0 = 0, b1 = 2 * Math.PI, n = 96) => Array.from({ length: n + 1 }, (_, i) => { const b = b0 + ((b1 - b0) * i) / n; return P3(r * Math.sin(b), y, r * Math.cos(b)); });
  const tenka = `stroke-width="${r2(0.6 * o.w)}" opacity=".3"`;
  const kon = (A, B, e = 5) => { const dx = B[0] - A[0], dy = B[1] - A[1], l = Math.hypot(dx, dy) || 1; return ln(A[0] - (dx / l) * e * s, A[1] - (dy / l) * e * s, B[0] + (dx / l) * e * s, B[1] + (dy / l) * e * s, "fk-c", tenka); };
  const Rh = 59.4;
  let k = "";
  for (const y of [0, 76]) { const F = P3(0, y, Rh), R = P3(Rh, y, 0), B = P3(0, y, -Rh), L = P3(-Rh, y, 0); k += kon(F, R) + kon(R, B) + kon(B, L) + kon(L, F); }
  for (const [x, z] of [[Rh, 0], [-Rh, 0], [0, Rh], [0, -Rh]]) k += kon(P3(x, 0, z), P3(x, 76, z), 4);
  k += ln(...P3(0, -8, 0), ...P3(0, 84, 0), "fk-c", S.o);
  const F76 = P3(0, 76, Rh), ra = 14 * s, a30 = rad(30);
  k += ln(F76[0], F76[1], F76[0] + 30 * s, F76[1], "fk-c", tenka) +
    `<path d="M${r2(F76[0] + ra)} ${r2(F76[1])}A${r2(ra)} ${r2(ra)} 0 0 0 ${r2(F76[0] + ra * Math.cos(a30))} ${r2(F76[1] - ra * Math.sin(a30))}" class="fk-c" stroke-width="${r2(0.7 * o.w)}" opacity=".6"/>` +
    tx(F76[0] + (ra + 5 * f) * Math.cos(rad(13)), F76[1] - (ra + 5 * f) * Math.sin(rad(13)) + 4 * f, "30°", 11 * f, "fk-sub");
  // vygumovaný první pokus o elipsu okraje
  k += `<path d="${D(Array.from({ length: 73 }, (_, i) => { const b = (i / 72) * 2 * Math.PI; return P([2.4 + 42.5 * Math.sin(b), 3.2 + 1.7 * IC + 42.5 * Math.cos(b) * IS * 0.8]); }), true)}" class="fk-c" stroke-width="${r2(1.3 * o.w)}" opacity=".1"/>` +
    `<ellipse cx="${r2(o.cx + 26 * s)}" cy="${r2(o.y0 + 14 * s)}" rx="${r2(20 * s)}" ry="${r2(8 * s)}" fill="#FFFFFF" opacity=".04" filter="url(#${o.id}-guma)"/>`;
  let g = `<g class="izo-konstrukce">${k}</g>`;
  // vnitřek: vzdálená stěna přes otvor
  let vn = "";
  for (let i = 0; i < 24; i++) {
    const az = rad(94 + (i / 23) * 172), Q = [];
    for (let y = 1.7; y <= 62; y += 4) { const r = Rin(y); Q.push(P3(r * Math.sin(az), y, r * Math.cos(az))); }
    vn += `<path d="${D(Q)}" class="fk-c" stroke-width="${r2(0.5 * o.w)}" opacity="${r2(0.06 + 0.2 * Math.abs(Math.cos(az)))}"/>`;
  }
  for (const y of [12, 24, 36, 48]) vn += `<path d="${D(elipsa(y, Rin(y), Math.PI / 2, 1.5 * Math.PI, 48))}" class="fk-c" stroke-width="${r2(0.5 * o.w)}" opacity=".24"/>`;
  g += `<g data-dil="5" clip-path="url(#${o.id}-izootvor)">${vn}</g>`;
  // stínování vpravo, rozdělané
  let st = "", konec = null;
  for (let i = 0; i < 13; i++) {
    const t = i / 12, az = rad(86 - 40 * Math.pow(t, 1.3)), y1 = 3 + q() * 2, y2 = Math.max(y1 + 3, 56 - 46 * Math.pow(t, 1.6) - q() * 6), Q = [];
    for (let j = 0; j <= 5; j++) { const y = y1 + ((y2 - y1) * j) / 5, r = Rout(y) - 0.2; Q.push(P3(r * Math.sin(az), y, r * Math.cos(az))); }
    st += `<path d="${D(Q)}" class="fk-c" stroke-width="${r2(0.75 * o.w)}" opacity=".7"/>`;
    if (i === 10) konec = Q[Q.length - 1];
  }
  for (let i = 0; i < 4; i++) {
    const az = rad(42 - i * 5), Q = [];
    for (let j = 0; j <= 5; j++) { const y = 5 + j * 4, r = Rout(y) - 0.2; Q.push(P3(r * Math.sin(az), y, r * Math.cos(az))); }
    st += tuzka(Q, 70 + i, o, 0.28);
  }
  g += `<g data-dil="3">${st}</g>`;
  // obrys: většina tuší, vlevo dole jen tužkou
  const split = IZO.dolni.findIndex(([X]) => X >= -4);
  g += `<path d="${D([...H, ...Dl.slice(split).reverse()])}" class="fk-c" ${S.v}/>` + tuzka([...Dl.slice(0, split + 1).reverse(), H[0]], 5, o, 0.55);
  g += `<g data-dil="1"><path d="${D(elipsa(1.7, 42, -Math.PI / 2, Math.PI / 2))}" class="fk-c" ${S.m}/><path d="${D(elipsa(1.7, 38.6), true)}" class="fk-c" ${S.m}/></g>`;
  g += `<path d="${D(elipsa(58, Rout(58), -Math.PI / 2, Math.PI / 2))}" class="fk-c" ${S.t}/>`;
  // hrana glazury a proužek ohně, jen kde je vidět; levá půlka zatím chybí
  const oblouk = (y, r) => { const Q = []; for (let i = 0; i <= 80; i++) { const b = -Math.PI / 2 + (Math.PI * i) / 80, X = r * Math.sin(b); if (vidim(X, y, r)) Q.push([X, y * IC + r * Math.cos(b) * IS]); } return Q; };
  const gl = oblouk(73, 36.2), hi = oblouk(73.7, 35.9);
  const prava = (Q) => Q.filter(([X]) => X >= -4).map(P), leva = (Q) => Q.filter(([X]) => X <= -4).map(P);
  if (prava(gl).length > 1) g += `<g data-dil="4 6"><path d="${D(prava(gl))}" class="fk-c" ${S.m}/></g>`;
  if (leva(gl).length > 1) g += tuzka(leva(gl), 8, o, 0.4);
  if (prava(hi).length > 1) g += `<g data-dil="6"><path d="${D(prava(hi))}" class="fk-hl" stroke-width="${r2(1.5 * o.w)}"/></g>`;
  // popisek a poznámky červenou tužkou
  g += tx(o.lx, o.ly, "IZOMETRIE", 14 * f, "fk-tit", `text-anchor="${o.la}" letter-spacing="${r2(2 * f)}"`) + tx(o.lx, o.ly + 17 * f, "rozpracováno · náklon 35°16′", 11 * f, "fk-sub", `text-anchor="${o.la}"`);
  const cilTus = IZO.dolni.reduce((m, p) => (Math.abs(p[0] + 27) < Math.abs(m[0] + 27) ? p : m));
  g += ruka(o, o.tus[0], o.tus[1], "obtáhnout tuší", o.tus[2], P(cilTus));
  if (konec) g += ruka(o, o.stin[0], o.stin[1], "stín dodělat", o.stin[2], konec);
  return g;
}
function izoDyn(o) {
  const S = sty(o), s = o.s, a = o.a, P3 = (x, y, z) => [o.cx + x * s, o.y0 + (y * IC + z * IS) * s], pr = (p) => P3(p[0], p[1], p[2]);
  let t = "";
  for (const q of TAHY) {
    const az = q.b + a, c = Math.cos(rad(az));
    if (c < 0.15) continue;
    const y2 = Math.min(q.y2, 54), Q = [];
    for (let i = 0; i <= 6; i++) { const y = q.y1 + ((y2 - q.y1) * i) / 6, b = rad(az + q.w * Math.sin(y * 0.2 + q.b)), r = Rout(y) - 0.15; Q.push(P3(r * Math.sin(b), y, r * Math.cos(b))); }
    t += `<path d="${D(Q)}" class="fk-c" stroke-width="${r2(0.55 * o.w)}" opacity="${r2(0.08 + 0.3 * c)}"/>`;
  }
  let e = "";
  for (const k of TECKY) {
    const b = rad(k.b + a), r = 39.4 + k.rr * 2.2, [x, y] = P3(r * Math.sin(b), 0.4, r * Math.cos(b));
    e += `<ellipse cx="${r2(x)}" cy="${r2(y)}" rx="${r2(k.r * s)}" ry="${r2(k.r * s * IS)}" class="fk-h"/>`;
  }
  let v = "";
  for (const N of NUBS.map((nb) => nub3(nb, a)).sort((p, q) => p.ca - q.ca)) {
    const H = D(hull([...N.base, ...N.facet].map(pr)), true);
    if (N.ca > -0.02) {
      v += `<path d="${H}" class="fk-c fk-bg" ${S.v}/>`;
      if (N.ca > 0.04) {
        v += `<path d="${D(N.facet.map(pr), true)}" class="fk-c fk-h" ${S.m}/>`;
        if (N.ca > 0.3) v += N.zrno.map((z) => { const [x, y] = pr(z); return kr(x, y, z[3] * s, "fk-zrno"); }).join("");
      }
    } else {
      v += `<g mask="url(#${o.id}-izoven)"><path d="${H}" class="fk-c fk-bg" ${S.v}/></g><g clip-path="url(#${o.id}-izoin)"><path d="${H}" class="fk-c" ${S.s}/></g>`;
    }
  }
  return `<g data-dil="3">${t}</g><g data-dil="1">${e}</g><g data-dil="2">${v}</g>`;
}

/* ——— Na listu leží: kroužek od kávy (z patky, ⌀71) a technické pero ——— */
function kava(o, cx, cy, ax, ay, kam) {
  const R = 35.5 * o.s, q = rng(57), f = o.fs;
  const obrys = (r, amp, dx = 0, dy = 0) => {
    const f1 = q() * 6.3, f2 = q() * 6.3, f3 = q() * 6.3;
    return Array.from({ length: 121 }, (_, i) => { const t = (i / 120) * 2 * Math.PI, k = 1 + amp * (0.5 * Math.sin(3 * t + f1) + 0.3 * Math.sin(5 * t + f2) + 0.2 * Math.sin(11 * t + f3)); return [cx + dx + r * k * Math.cos(t), cy + dy + r * k * Math.sin(t)]; });
  };
  const kruh = obrys(R, 0.012);
  let g = `<g class="kava" filter="url(#${o.id}-kava)">`;
  g += `<path d="${D(kruh, true)}" fill="#8A5626" fill-opacity=".045"/>`;
  g += `<path d="${D(obrys(R - 2.4 * o.w, 0.014), true)}" fill="none" stroke="#8A5626" stroke-opacity=".16" stroke-width="${r2(4.5 * o.w)}"/>`;
  g += `<path d="${D(kruh, true)}" fill="none" stroke="#7A4618" stroke-opacity=".62" stroke-width="${r2(2.4 * o.w)}" pathLength="100" stroke-dasharray="71 3 19 7"/>`;
  g += `<path d="${D(obrys(R * 1.01, 0.02, R * 0.34, -R * 0.22), true)}" fill="none" stroke="#7A4618" stroke-opacity=".3" stroke-width="${r2(1.8 * o.w)}" pathLength="100" stroke-dasharray="0 58 24 18"/>`;
  for (let i = 0; i < 6; i++) {
    const t = rad(150 + q() * 70), d = R * (1.08 + q() * 0.35), r = (1.2 + q() * 3.4) * o.w;
    g += `<circle cx="${r2(cx + d * Math.cos(t))}" cy="${r2(cy + d * Math.sin(t))}" r="${r2(r)}" fill="#7A4618" fill-opacity="${r2(0.3 + q() * 0.25)}"/>`;
  }
  g += `</g>`;
  const t = rad(kam);
  return g + ruka(o, ax, ay, "Ø71, sedí!", "start", [cx + R * 1.02 * Math.cos(t), cy + R * 1.02 * Math.sin(t)]);
}
function pero(o, x1, y1, x2, y2) {
  const L = Math.hypot(x2 - x1, y2 - y1), ang = r2((Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI), R = L * 0.036, k = (t) => r2(t * L), w = o.w;
  let g = `<g class="pero" aria-hidden="true">`;
  g += `<g filter="url(#${o.id}-perostin)" opacity=".6"><g transform="translate(${r2(x1 + 6 * w)} ${r2(y1 + 11 * w)}) rotate(${ang})">` +
    `<rect x="0" y="${r2(-R)}" width="${k(0.86)}" height="${r2(2 * R)}" rx="${r2(R)}" fill="#030A1A"/><rect x="${k(0.86)}" y="${r2(-R * 0.18)}" width="${k(0.14)}" height="${r2(R * 0.36)}" fill="#030A1A"/></g></g>`;
  g += `<g transform="translate(${r2(x1)} ${r2(y1)}) rotate(${ang})">`;
  g += `<rect x="${k(0.87)}" y="${r2(-R * 0.12)}" width="${k(0.13)}" height="${r2(R * 0.24)}" rx="${r2(R * 0.1)}" fill="url(#${o.id}-chrom)"/>`;
  g += `<rect x="${k(0.852)}" y="${r2(-R * 0.5)}" width="${k(0.026)}" height="${r2(R)}" rx="${r2(R * 0.1)}" fill="url(#${o.id}-chrom)"/>`;
  g += `<path d="M${k(0.745)} ${r2(-R * 0.92)}L${k(0.856)} ${r2(-R * 0.55)}L${k(0.856)} ${r2(R * 0.55)}L${k(0.745)} ${r2(R * 0.92)}Z" fill="url(#${o.id}-mat)"/>`;
  for (let i = 0; i < 8; i++) { const x = 0.756 + i * 0.012, r = R * (0.92 - ((x - 0.745) / 0.111) * 0.37) * 0.92; g += ln(x * L, -r, x * L, r, "", `stroke="#000" stroke-opacity=".35" stroke-width="${r2(0.6 * w)}"`); }
  g += `<rect x="${k(0.34)}" y="${r2(-R)}" width="${k(0.4)}" height="${r2(2 * R)}" fill="url(#${o.id}-lak)"/>`;
  g += `<rect x="${k(0.72)}" y="${r2(-R * 1.01)}" width="${k(0.025)}" height="${r2(2.02 * R)}" fill="url(#${o.id}-cerv)"/>`;
  g += `<rect x="0" y="${r2(-R * 1.07)}" width="${k(0.35)}" height="${r2(2.14 * R)}" rx="${r2(R * 0.55)}" fill="url(#${o.id}-lak)"/>`;
  g += `<rect x="${k(0.345)}" y="${r2(-R * 1.07)}" width="${r2(1.2 * w)}" height="${r2(2.14 * R)}" fill="#7A808A" opacity=".7"/>`;
  g += `<rect x="${k(0.05)}" y="${r2(-R * 0.26)}" width="${k(0.25)}" height="${r2(R * 0.52)}" rx="${r2(R * 0.24)}" fill="url(#${o.id}-chrom)"/>`;
  g += `<circle cx="${k(0.29)}" cy="0" r="${r2(R * 0.34)}" fill="url(#${o.id}-chrom)"/>`;
  g += `<text x="${k(0.4)}" y="${r2(R * 0.3)}" font-size="${r2(R * 0.7)}" fill="#AEB4BD" letter-spacing="${r2(R * 0.08)}" class="fk-kanji">製図 0,35</text>`;
  return g + `</g></g>`;
}
const defsStul = (id, w) =>
  `<linearGradient id="${id}-lak" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1B1C20"/><stop offset=".22" stop-color="#4E535C"/><stop offset=".34" stop-color="#1E2025"/><stop offset=".8" stop-color="#0B0C0E"/><stop offset="1" stop-color="#222428"/></linearGradient>` +
  `<linearGradient id="${id}-mat" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A2C31"/><stop offset=".3" stop-color="#3E4148"/><stop offset=".7" stop-color="#141518"/><stop offset="1" stop-color="#26282C"/></linearGradient>` +
  `<linearGradient id="${id}-chrom" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6B7179"/><stop offset=".25" stop-color="#F1F3F5"/><stop offset=".5" stop-color="#A3AAB2"/><stop offset=".78" stop-color="#555A61"/><stop offset="1" stop-color="#8C939B"/></linearGradient>` +
  `<linearGradient id="${id}-cerv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8E2A18"/><stop offset=".3" stop-color="#E0644A"/><stop offset=".6" stop-color="#B23A24"/><stop offset="1" stop-color="#7A2314"/></linearGradient>` +
  `<filter id="${id}-perostin" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation="${r2(5 * w)}"/></filter>` +
  `<filter id="${id}-kava" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="${r2(0.7 * w)}"/></filter>` +
  `<filter id="${id}-guma" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${r2(6 * w)}"/></filter>`;

/* ——— Detail B: výstupek zepředu ——— */
function detailB(o, cx, cy, Rc, bezBalonu = false) {
  const S = sty(o), f = o.fs, k = Rc / 12, nb = NUBS[0];
  const X = (u) => cx + u * k, Y = (v) => cy - 0.6 * k + v * k, T = (p) => [X(p[0]), Y(p[1])];
  let g = `<g clip-path="url(#${o.id}-dB)">`;
  for (let u = -13; u <= 13.1; u += 2.7) {
    const P = [];
    for (let v = -13; v <= 13; v += 2) P.push([X(u + 0.35 * Math.sin(v * 0.4 + u)), Y(v)]);
    g += `<path d="${D(P)}" class="fk-c" stroke-width="${r2(0.55 * o.w)}" opacity=".22"/>`;
  }
  g += `<path d="${D(nb.base.map(T), true)}" class="fk-bg"/><path d="${D(nb.base.map(T), true)}" class="fk-c" ${S.t}/>`;
  for (const t of [0.36, 0.7]) {
    const P = [];
    for (let i = 0; i < 48; i++) { const th = (i / 48) * 2 * Math.PI, rb = rayR(nb.base, th), rf = rayR(nb.facet, th), r = rb + (rf - rb) * t; P.push(T([r * Math.cos(th), r * Math.sin(th)])); }
    g += `<path d="${D(P, true)}" class="fk-c" stroke-width="${r2(0.6 * o.w)}" opacity=".38"/>`;
  }
  g += `<g data-dil="2"><path d="${D(nb.facet.map(T), true)}" class="fk-c fk-h" ${S.v}/>` + nb.zrno.map((z) => kr(X(z[0]), Y(z[1]), z[2] * k, "fk-zrno")).join("") + `</g>`;
  g += `</g>` + kr(cx, cy, Rc, "fk-c", S.m);
  let q = pomoc(X(-5.8), Y(0.4) + 3 * f, X(-5.8), Y(9.3) + 4 * f, o) + pomoc(X(5.6), Y(1) + 3 * f, X(5.6), Y(9.3) + 4 * f, o) + kotaH(Y(9.3), X(-5.8), X(5.6), "11", o, true);
  q += pomoc(X(-1) + 3 * f, Y(-3.8), X(9.6) + 4 * f, Y(-3.8), o) + pomoc(X(3.6) + 3 * f, Y(3.9), X(9.6) + 4 * f, Y(3.9), o) + kotaV(X(9.6), Y(-3.8), Y(3.9), "8", o, true);
  g += `<g class="kota">${q}</g>`;
  const hx = cx + 0.18 * Rc, hy = cy - Rc - 16 * f;
  g += tx(hx, hy, "holá hlína, barva ohně", 19 * f, "fk-ruka", `text-anchor="middle"`);
  g += `<path d="M${r2(hx - 34 * f)} ${r2(hy + 7 * f)}Q${r2(X(-3))} ${r2(Y(-9))} ${r2(X(-2.2))} ${r2(Y(-4.6))}" class="fk-hl" stroke-width="${r2(1.3 * o.w)}"/>` + `<g class="fk-hl-sip">${sip(X(-2.2), Y(-4.6), rad(80), o).replace('class="fk-sip"', 'class="fk-h"')}</g>`;
  const b2 = rad(o.b2);
  if (!bezBalonu) g += balon(2, X(-3.6), Y(-0.6), cx + (Rc + 26 * f) * Math.cos(b2), cy + (Rc + 26 * f) * Math.sin(b2), o);
  g += titulek(cx, cy + Rc + 26 * f, `DETAIL B  ${Math.round(k / o.s)}:1`, o, "výstupek zepředu, vystupuje 5,5");
  return g;
}

/* ——— Detail C: okraj v řezu ——— */
function detailC(o, cx, cy, Rc) {
  const S = sty(o), f = o.fs, k = Rc / 4.5, X = (x) => cx + (x - 40.3) * k, Y = (y) => cy + (y - 4) * k, T = (p) => [X(p[0]), Y(p[1])];
  const yb = 10;
  const strep = [...RIM, [Rout(5), 5], [Rout(yb), yb], [Rin(yb), yb], [Rin(5), 5]];
  const povrch = [[Rin(yb), yb], [Rin(5), 5], ...RIM, [Rout(5), 5], [Rout(yb), yb]];
  const tl = (x, y) => (y < 1.7 ? 0.32 + 0.38 * (y / 1.7) : 0.7);
  const pas = [...povrch, ...odsad(povrch, tl, 1).reverse()];
  let g = `<g clip-path="url(#${o.id}-dC)">`;
  g += `<g data-dil="3"><path d="${D(strep.map(T), true)}" class="fk-c" style="fill:url(#${o.id}-srafy2)" ${S.v}/></g>`;
  g += `<g data-dil="4"><path d="${D(pas.map(T), true)}" class="fk-c fk-sklo" ${S.m}/></g>`;
  const skvrna = (deg, rx, ry) => {
    const a = rad(deg), n = [Math.cos(a), -Math.sin(a)], p = [40.3 + 1.7 * Math.cos(a), 1.7 - 1.7 * Math.sin(a)], t = 0.32 + 0.38 * (p[1] / 1.7);
    const c0 = [p[0] + n[0] * t * 0.55, p[1] + n[1] * t * 0.55];
    return ln(X(p[0] - n[0] * 0.45), Y(p[1] - n[1] * 0.45), X(c0[0]), Y(c0[1]), "fk-hl", `stroke-width="${r2(1.4 * o.w)}"`) +
      `<ellipse cx="${r2(X(c0[0]))}" cy="${r2(Y(c0[1]))}" rx="${r2(rx * k)}" ry="${r2(ry * k)}" class="fk-h" transform="rotate(${90 - deg} ${r2(X(c0[0]))} ${r2(Y(c0[1]))})"/>`;
  };
  g += `<g data-dil="1">${skvrna(52, 0.34, 0.2)}${skvrna(77, 0.2, 0.13)}</g>`;
  g += `</g>` + kr(cx, cy, Rc, "fk-c", S.m);
  const a150 = rad(150), pr = [40.3 + 1.7 * Math.cos(a150), 1.7 - 1.7 * Math.sin(a150)];
  g += `<g class="kota">` + ln(X(37.75), Y(2.55), X(pr[0]), Y(pr[1]), "fk-d", S.d) + sip(X(pr[0]), Y(pr[1]), Math.atan2(Y(pr[1]) - Y(2.55), X(pr[0]) - X(37.75)), o) +
    tx(X(37.65), Y(3.15), "R1,7", 12 * f, "fk-dt fk-halo", `text-anchor="end" ${halo(o)}`) + `</g>`;
  const a52 = rad(52), sk = [40.3 + 1.7 * Math.cos(a52) + 0.2, 1.7 - 1.7 * Math.sin(a52) - 0.2];
  const hx = cx + 0.1 * Rc, hy = cy - Rc - 16 * f;
  g += tx(hx, hy, "železo z hlíny", 19 * f, "fk-ruka", `text-anchor="middle"`);
  g += `<path d="M${r2(hx + 30 * f)} ${r2(hy + 7 * f)}Q${r2(X(sk[0]) + 18 * f)} ${r2(Y(sk[1]) - 34 * f)} ${r2(X(sk[0]) + 5 * f)} ${r2(Y(sk[1]) - 6 * f)}" class="fk-hl" stroke-width="${r2(1.3 * o.w)}"/>`;
  g += titulek(cx, cy + Rc + 26 * f, `DETAIL C  ${Math.round(k / o.s)}:1`, o, "okraj v řezu");
  return g;
}

/* ——— Poznámky a legenda ——— */
function poznamky(o, x, y, w) {
  const S = sty(o), f = o.fs, lh = 19.5 * f, fz = 12.5 * f;
  let g = tx(x, y, "POZNÁMKY", fz, "fk-tit", `letter-spacing="${r2(2 * f)}"`);
  const P = [
    "Kóty v mm, tolerance ±3 (ruční práce).",
    "Kamenina, točená. Výpal 1 280 °C.",
    `Glazura shino <tspan class="fk-kanji">志野</tspan>, uvnitř krakelé.`,
    "Výstupky seříznout, řez bez glazury.",
    "Patka obrobená, bez glazury.",
    `Objem ≈ ${V.objem} ml, hmotnost ≈ ${V.hmotnost} g.`,
  ];
  P.forEach((t, i) => { const yy = y + (i + 1.4) * lh; g += tx(x, yy, i + 1, fz, "fk-sub") + tx(x + 22 * f, yy, t, fz, "fk-dt"); });
  const y2 = y + 8.3 * lh;
  g += tx(x, y2, "LEGENDA", fz, "fk-tit", `letter-spacing="${r2(2 * f)}"`);
  const L = [
    ["v", "viditelná hrana"], ["s", "skrytá hrana"], ["o", "osa"], ["r", "střep v řezu"],
    ["g", "glazura"], ["h", "holá hlína"], ["f", `<tspan class="fk-kanji">緋色</tspan> hiiro`], ["e", "železo"],
  ];
  L.forEach(([z, t], i) => {
    const cx0 = x + (i % 2) * (w / 2), cy0 = y2 + (Math.floor(i / 2) + 1.3) * lh * 1.12, gw = 26 * f, gh = 10 * f, my = cy0 - 4.5 * f;
    let gl = "";
    if (z === "v") gl = ln(cx0, my, cx0 + gw, my, "fk-c", S.v);
    else if (z === "s") gl = ln(cx0, my, cx0 + gw, my, "fk-c", S.s);
    else if (z === "o") gl = ln(cx0, my, cx0 + gw, my, "fk-c", S.o);
    else if (z === "e") gl = kr(cx0 + gw / 2, my, 3.2 * f, "fk-h");
    else {
      const t1 = `stroke-width="${r2(0.8 * o.w)}"`;
      const st = z === "r" ? `class="fk-c" style="fill:url(#${o.id}-srafy)" ${t1}` : z === "g" ? `class="fk-c fk-sklo" ${t1}` : z === "h" ? `class="fk-c" style="fill:url(#${o.id}-hlina)" ${t1}` : `class="fk-c fk-h" ${t1}`;
      gl = `<rect x="${r2(cx0)}" y="${r2(my - gh / 2)}" width="${r2(gw)}" height="${r2(gh)}" ${st}/>`;
    }
    g += gl + tx(cx0 + gw + 10 * f, cy0, t, fz, "fk-dt");
  });
  return g;
}

/* ——— Rohové razítko ——— */
function razitko(o, x, y, w, h) {
  const S = sty(o), f = o.fs, fl = 7.8 * f, fv = 12.5 * f;
  const rows = [0.28, 0.18, 0.18, 0.18, 0.18], ys = [y];
  rows.forEach((r) => ys.push(ys[ys.length - 1] + r * h));
  let g = `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(w)}" height="${r2(h)}" class="fk-c fk-bg" ${S.v}/>`;
  for (let i = 1; i < 5; i++) g += ln(x, ys[i], x + w, ys[i], "fk-c", S.m);
  const bunka = (r, x0, x1, label, val) => {
    let q = x0 > x ? ln(x0, ys[r], x0, ys[r + 1], "fk-c", S.m) : "";
    q += tx(x0 + 6 * f, ys[r] + 9.5 * f, label, fl, "fk-sub", `letter-spacing="${r2(1.2 * f)}"`);
    if (val) q += tx(x0 + 6 * f, ys[r + 1] - 6 * f, val, fv, "fk-dt");
    return q;
  };
  const c3 = [x, x + 0.36 * w, x + 0.7 * w];
  g += tx(x + 12 * f, ys[1] - 13 * f, `<tspan class="fk-kanji" font-size="${r2(22 * f)}">二つ</tspan> FUTATSU`, 26 * f, "fk-nazev", `letter-spacing="${r2(1 * f)}"`);
  g += ln(x + 0.74 * w, ys[0], x + 0.74 * w, ys[1], "fk-c", S.m);
  const hs = 0.28 * h - 14 * f, hx = x + 0.87 * w - hs / 2, hy = ys[0] + 7 * f;
  g += `<rect x="${r2(hx)}" y="${r2(hy)}" width="${r2(hs)}" height="${r2(hs)}" rx="${r2(3 * f)}" class="fk-hanko" stroke-width="${r2(2.2 * o.w)}" transform="rotate(-5 ${r2(hx + hs / 2)} ${r2(hy + hs / 2)})"/>`;
  ["ジ", "ロ", "作"].forEach((z, i) => { g += tx(hx + hs / 2, hy + hs * (0.34 + i * 0.28), z, hs * 0.27, "fk-hanko-t", `text-anchor="middle" transform="rotate(-5 ${r2(hx + hs / 2)} ${r2(hy + hs / 2)})"`); });
  g += bunka(1, x, x + 0.62 * w, "NÁZEV", "Yunomi bez ouška") + bunka(1, x + 0.62 * w, x + w, "VÝKRES Č.", "JS-YU-002");
  g += bunka(2, c3[0], c3[1], "MATERIÁL", "kamenina") + bunka(2, c3[1], c3[2], "GLAZURA", `shino <tspan class="fk-kanji">志野</tspan>`) + bunka(2, c3[2], x + w, "VÝPAL", "1 280 °C");
  g += bunka(3, c3[0], c3[1], "MĚŘÍTKO", "1:1 (A3)") + bunka(3, c3[1], c3[2], "PROMÍTÁNÍ", "") + bunka(3, c3[2], x + w, "LIST", "1 / 1");
  const sx = c3[1] + 16 * f, sy = ys[4] - 11 * f, R1 = 5.2 * f, R2 = 2.7 * f;
  g += kr(sx, sy, R1, "fk-c", S.m) + kr(sx, sy, R2, "fk-c", S.m) + `<path d="M${r2(sx + 11 * f)} ${r2(sy - R2)}L${r2(sx + 26 * f)} ${r2(sy - R1)}L${r2(sx + 26 * f)} ${r2(sy + R1)}L${r2(sx + 11 * f)} ${r2(sy + R2)}Z" class="fk-c" ${S.m}/>` +
    tx(sx + 32 * f, sy + 4 * f, "JIS", 10.5 * f, "fk-sub");
  g += bunka(4, c3[0], c3[1], "KRESLIL", "JIRO saku") + bunka(4, c3[1], c3[2], "DATUM", "16. 10. 2026") + bunka(4, c3[2], x + w, "REVIZE", "každý kus");
  return g;
}

/* ——— Rám listu se zónami ——— */
function ram(o, W, H, nc, nr) {
  const S = sty(o), f = o.fs, fz = 9.5 * f;
  let g = `<rect x="14" y="14" width="${W - 28}" height="${H - 28}" class="fk-c" ${S.t}/><rect x="34" y="34" width="${W - 68}" height="${H - 68}" class="fk-c" ${S.v}/>`;
  for (let i = 0; i < nc; i++) {
    const x0 = 34 + (i * (W - 68)) / nc, xm = x0 + (W - 68) / nc / 2;
    if (i) g += ln(x0, 14, x0, 34, "fk-c", S.t) + ln(x0, H - 34, x0, H - 14, "fk-c", S.t);
    g += tx(xm, 24 + fz * 0.36, i + 1, fz, "fk-sub", `text-anchor="middle"`) + tx(xm, H - 24 + fz * 0.36, i + 1, fz, "fk-sub", `text-anchor="middle"`);
  }
  for (let i = 0; i < nr; i++) {
    const y0 = 34 + (i * (H - 68)) / nr, ym = y0 + (H - 68) / nr / 2, z = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[i];
    if (i) g += ln(14, y0, 34, y0, "fk-c", S.t) + ln(W - 34, y0, W - 14, y0, "fk-c", S.t);
    g += tx(24, ym + fz * 0.36, z, fz, "fk-sub", `text-anchor="middle"`) + tx(W - 24, ym + fz * 0.36, z, fz, "fk-sub", `text-anchor="middle"`);
  }
  g += ln(W / 2, 6, W / 2, 46, "fk-c", S.m) + ln(W / 2, H - 46, W / 2, H - 6, "fk-c", S.m) + ln(6, H / 2, 46, H / 2, "fk-c", S.m) + ln(W - 46, H / 2, W - 6, H / 2, "fk-c", S.m);
  return g;
}

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
const pohledy = (lay, st) => {
  const L = LAY[lay], o = { s: L.s, fs: L.fs, w: L.w, a: st.a, id: "dv", b2: L.b2 };
  return {
    L, o,
    vF: { ...o, cx: L.front[0], y0: L.front[1] },
    vT: { ...o, cx: L.top[0], cy: L.top[1], ty: L.top[2] },
    vR: { ...o, cx: L.sec[0], y0: L.sec[1] },
    vB: { ...o, cx: L.bot[0], cy: L.bot[1], ty: L.bot[2] },
  };
};
const defsTelo = (id, W, H, cx, y0, s) => {
  const sil = D(SIL.map((p) => [cx + p[0] * s, y0 + p[1] * s]), true);
  return `<clipPath id="${id}-in"><path d="${sil}"/></clipPath><mask id="${id}-ven" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#fff"/><path d="${sil}" fill="#000"/></mask>`;
};
const maska = (id, W, H, cx, cy, r) => `<mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#fff"/><circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(r)}" fill="#000"/></mask>`;

function list(lay, st) {
  const { L, o, vF, vT, vR, vB } = pohledy(lay, st), s = L.s;
  const [bx, by, bR] = L.detB, [cx, cy, cR] = L.detC;
  const grid = 10 * s;
  let svg = `<svg viewBox="0 0 ${L.W} ${L.H}" class="fk-svg" role="group" aria-label="Technický výkres hrnku Futatsu: pohled zepředu, shora a zespodu, řez A–A, detaily výstupku a okraje, rohové razítko">`;
  svg += `<defs>${defsTelo("dv", L.W, L.H, vF.cx, vF.y0, s)}${maska("dv-okraj", L.W, L.H, vT.cx, vT.cy, 42 * s)}${maska("dv-spod", L.W, L.H, vB.cx, vB.cy, 42 * s)}` + defsStul("dv", L.w) +
    `<clipPath id="dv-vn"><circle cx="${r2(vT.cx)}" cy="${r2(vT.cy)}" r="${r2(38.6 * s)}"/></clipPath>` +
    `<clipPath id="dv-dB"><circle cx="${bx}" cy="${by}" r="${bR}"/></clipPath><clipPath id="dv-dC"><circle cx="${cx}" cy="${cy}" r="${cR}"/></clipPath>` +
    `<pattern id="dv-mrizka" width="${r2(grid)}" height="${r2(grid)}" patternUnits="userSpaceOnUse" x="34" y="34"><path d="M${r2(grid)} 0V${r2(grid)}H0" class="fk-mriz" stroke-width="1"/></pattern>` +
    vzory("dv", L.w) + `</defs>`;
  svg += `<rect x="34" y="34" width="${L.W - 68}" height="${L.H - 68}" style="fill:url(#dv-mrizka)"/>`;
  svg += ram(o, L.W, L.H, L.zony[0], L.zony[1]);
  svg += `<g id="dv-front">${zepredu(vF)}</g>` + titulek(vF.cx, vF.y0 + 85 * s + 36 * L.fs, "POHLED ZEPŘEDU", o, "táhni do strany");
  svg += shora(vT) + `<g id="dv-topd">${shoraDyn(vT)}</g>`;
  svg += rez(vR);
  svg += zespodu(vB) + `<g id="dv-botd">${zespoduDyn(vB)}</g>`;
  svg += detailB(o, bx, by, bR) + detailC(o, cx, cy, cR);
  svg += poznamky(o, ...L.notes) + razitko(o, ...L.title);
  svg += kava(o, ...L.kava) + pero(o, ...L.pero);
  return svg + `</svg>`;
}
function dyn(lay, st) {
  const { vF, vT, vB } = pohledy(lay, st);
  return { front: zepredu(vF), top: shoraDyn(vT), bot: zespoduDyn(vB) };
}
const pauzOpt = (st, uzky) => { const P = PAUZ[uzky ? "uzky" : "siroky"]; return { P, o: { fs: P.fs, w: P.w, a: st.a, id: "dvp", ...P.izo } }; };
function pauzak(st, uzky) {
  const { P, o } = pauzOpt(st, uzky), iz = izoTvar(o);
  return `<svg viewBox="0 0 ${P.W} ${P.H}" class="fk-svg" role="img" aria-label="Rozpracovaná izometrie hrnku Futatsu na pauzovacím papíře"><defs>` +
    `<clipPath id="dvp-izoin"><path d="${iz.sil}"/></clipPath><clipPath id="dvp-izootvor"><path d="${iz.otvor}"/></clipPath>` +
    `<mask id="dvp-izoven" maskUnits="userSpaceOnUse" x="0" y="0" width="${P.W}" height="${P.H}"><rect width="${P.W}" height="${P.H}" fill="#fff"/><path d="${iz.sil}" fill="#000"/></mask>` +
    `<filter id="dvp-guma" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${r2(6 * o.w)}"/></filter></defs>` +
    izo(o) + `<g id="dvp-izod">${izoDyn(o)}</g></svg>`;
}
const pauzakDyn = (st, uzky) => izoDyn(pauzOpt(st, uzky).o);

/* ——— Skutečná velikost: jednotky = milimetry ——— */
const VEL = { W: 134, H: 118 };
function velikost(st) {
  const o = { s: 1, fs: 0.27, w: 0.2, a: st.a, id: "dvs", cx: 62, y0: 16 };
  let svg = `<svg viewBox="0 0 ${VEL.W} ${VEL.H}" class="fk-svg"><defs>${defsTelo("dvs", VEL.W, VEL.H, o.cx, o.y0, 1)}${vzory("dvs", 0.2)}</defs>`;
  svg += zepredu(o);
  const yR = 109;
  let r = ln(12, yR, 112, yR, "fk-c", `stroke-width="0.25"`);
  for (let i = 0; i <= 100; i++) {
    const x = 12 + i, l = i % 10 === 0 ? 3 : i % 5 === 0 ? 2 : 1.1;
    r += ln(x, yR, x, yR - l, "fk-c", `stroke-width="${i % 10 ? 0.14 : 0.25}"`);
    if (i % 10 === 0) r += tx(x, yR + 3.8, i / 10, 2.6, "fk-dt", `text-anchor="middle"`);
  }
  svg += r + tx(114, yR + 3.8, "cm", 2.2, "fk-sub");
  return svg + `</svg>`;
}

/* ——— Pohled do hrnku: skutečné barvy, krakelé se barví časem ——— */
function interier() {
  const k = 4.55, C = 200, X = (x) => C + x * k, r = rng(77);
  let sk = "";
  for (const t of TECKY) { const az = rad(t.b), rr = 38.9 + t.rr * 2.9; sk += `<circle cx="${r2(X(rr * Math.sin(az)))}" cy="${r2(X(rr * Math.cos(az)))}" r="${r2(t.r * k * 0.9)}" fill="#9A4A22" opacity="${r2(0.55 + r() * 0.4)}"/>`; }
  let ruz = "";
  for (let i = 0; i < 6; i++) { const az = r() * 360, rr = 36.6 * k; ruz += `<ellipse cx="${r2(C + rr * Math.cos(rad(az)))}" cy="${r2(C + rr * Math.sin(rad(az)))}" rx="${r2((5 + r() * 6) * k)}" ry="${r2(2.4 * k)}" transform="rotate(${r2(az + 90)} ${r2(C + rr * Math.cos(rad(az)))} ${r2(C + rr * Math.sin(rad(az)))})" fill="#D58E5C" opacity=".2"/>`; }
  let jiskry = "";
  for (let i = 0; i < 34; i++) { const t = r() * 2 * Math.PI, rr = Math.sqrt(r()) * 11; jiskry += `<circle cx="${r2(X(1.2 + rr * Math.cos(t)))}" cy="${r2(X(-0.8 + rr * Math.sin(t)))}" r="${r2(0.25 + r() * 0.55)}" fill="#FFFFFF" opacity="${r2(0.4 + r() * 0.5)}"/>`; }
  return `<svg viewBox="0 0 400 400" aria-hidden="true"><defs>` +
    `<radialGradient id="dvi-glaz" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#EEE6D6"/><stop offset=".32" stop-color="#E9DECB"/><stop offset=".56" stop-color="#DCCBAE"/><stop offset=".78" stop-color="#D4C1A2"/><stop offset=".91" stop-color="#E3D5BF"/><stop offset="1" stop-color="#EDE3D2"/></radialGradient>` +
    `<radialGradient id="dvi-okraj" cx="50%" cy="50%" r="50%"><stop offset=".9" stop-color="#F3EBDD"/><stop offset="1" stop-color="#E4D6C1"/></radialGradient>` +
    `<clipPath id="dvi-vn"><circle cx="${C}" cy="${C}" r="${r2(38.6 * k)}"/></clipPath>` +
    `<filter id="dvi-mlha" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="7"/></filter>` +
    `<filter id="dvi-mlha2" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="2"/></filter></defs>` +
    `<circle cx="${C}" cy="${C}" r="${r2(42 * k)}" fill="url(#dvi-okraj)"/>` +
    `<circle cx="${C}" cy="${C}" r="${r2(40.3 * k)}" fill="none" stroke="#FBF6EE" stroke-width="${r2(1.1 * k)}" opacity=".7"/>` +
    `<circle cx="${C}" cy="${C}" r="${r2(38.6 * k)}" fill="url(#dvi-glaz)"/>` +
    `<g clip-path="url(#dvi-vn)"><g filter="url(#dvi-mlha)">${ruz}<path d="${D(LOUZE.map(([x, z]) => [X(x), X(z)]), true)}" fill="#FFFFFF" opacity=".34"/></g>` +
    `<g id="dvi-praskliny" fill="none" stroke="#BFAE95" stroke-width=".55" opacity=".3" stroke-linecap="round"><path d="${krakD(KRAK, X, X)}"/></g>` +
    `<circle id="dvi-linka" cx="${C}" cy="${C}" r="${r2(37.7 * k)}" fill="none" stroke="#7A4A22" stroke-width="${r2(1.5 * k)}" opacity="0" filter="url(#dvi-mlha2)"/>${jiskry}</g>` +
    `<circle cx="${C}" cy="${C}" r="${r2(38.6 * k)}" fill="none" stroke="#6E5032" stroke-opacity=".28" stroke-width="1.2"/>` +
    `<circle cx="${C}" cy="${C}" r="${r2(42 * k)}" fill="none" stroke="#5A422C" stroke-opacity=".4" stroke-width="1.2"/>${sk}</svg>`;
}

/* ——— Ukázka do krámku (Podpis.astro): výřez z výkresu, celý je odkaz na stránku kusu,
   proto bez klikacích kroužků ——— */
const UKAZKA = { W: 900, H: 600 };
function ukazka(st) {
  const { W, H } = UKAZKA, o = { s: 3.7, fs: 1.25, w: 1.1, a: st.a, id: "dvu", b2: 205 }, f = o.fs, S = sty(o);
  const vF = { ...o, cx: 270, y0: 178 }, grid = 10 * o.s;
  let svg = `<svg viewBox="0 0 ${W} ${H}" class="fk-svg" aria-hidden="true">`;
  svg += `<defs>${defsTelo("dvu", W, H, vF.cx, vF.y0, o.s)}<clipPath id="dvu-dB"><circle cx="700" cy="250" r="130"/></clipPath>` +
    `<pattern id="dvu-mrizka" width="${r2(grid)}" height="${r2(grid)}" patternUnits="userSpaceOnUse" x="34" y="34"><path d="M${r2(grid)} 0V${r2(grid)}H0" class="fk-mriz" stroke-width="1"/></pattern>` +
    vzory("dvu", o.w) + defsStul("dvu", o.w) + `</defs>`;
  svg += `<rect x="34" y="34" width="${W - 68}" height="${H - 68}" style="fill:url(#dvu-mrizka)"/>` + ram(o, W, H, 6, 4);
  svg += zepredu(vF) + titulek(vF.cx, vF.y0 + 85 * o.s + 36 * f, "POHLED ZEPŘEDU", o);
  svg += detailB(o, 700, 250, 130, true);
  const x0 = 592, y0 = 474, w = 274, h = 92;
  svg += `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" class="fk-c fk-bg" ${S.v}/>` + ln(x0, y0 + 54, x0 + w, y0 + 54, "fk-c", S.m) +
    tx(x0 + 12 * f, y0 + 40, `<tspan class="fk-kanji" font-size="${r2(22 * f)}">二つ</tspan> FUTATSU`, 25 * f, "fk-nazev", `letter-spacing="${r2(f)}"`) +
    tx(x0 + 12 * f, y0 + 80, "JS-YU-002 · výřez z listu 1/1", 10.5 * f, "fk-sub");
  svg += kava(o, 36, 34, 172, 76, 28) + pero(o, 34, 584, 340, 556);
  return svg + `</svg>`;
}

export { list, dyn, pauzak, pauzakDyn, velikost, VEL, interier, ukazka, UKAZKA, V, LAY };

/* Pro další kresby téhož hrnku (podobizna.ts, tokonoma v krámku, scény stránky):
   profil v mm, výstupky, krakelé, tahy a tečky a jednotlivé části výkresu.
   Měnit jen tady — výkres, podobizna i krámek pak sedí na stejné míry. */
export {
  RIM, OUT, IN, BASE, SIL, Rout, Rin, NUBS, nub3, hull, rayR, KRAK, krakD, LOUZE, TAHY, TECKY,
  rng, rad, r2, D, bez, sty, vzory, defsTelo, defsStul, maska, titulek, balon, pohledy,
  zepredu, shora, shoraDyn, rez, zespodu, zespoduDyn, detailB, detailC, razitko, poznamky, ram, kava, pero,
  izo, izoDyn, izoTvar, PAUZ,
};
