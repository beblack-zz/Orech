/**
 * Svět v kapce — úvod O nás 2. V obří kapce visící z prasklé trubky je
 * vzhůru nohama a prohnutý jako rybím okem celý budoucí svět dílny za
 * svítání: obloha od indiga přes růžovou po broskvovou záři, nad hřebeny
 * v oparu vychází slunce, na kopcích pole a vesnička v ranní mlze, na
 * pahorku zelený dům z Luční (dílna ve sklepě už svítí), vpravo jako rám
 * starý ořech a vpředu louka s pěšinou, tůňkou a řadou papírových lampionů.
 *
 * Svět se kreslí vzpřímeně v normovaných souřadnicích (u, w) jednotkového
 * kruhu — u doprava, w dolů — a každý bod pak projde čočkou kapky:
 *   ρ = |(u, w)|,  g(ρ) = 0,7·sin(ρ·π/2) + 0,3·ρ,  obraz = −SVET_R·g(ρ)·(u, w)/ρ
 * Střed je zvětšený, okraj stlačený a minus svět otočí o 180° (kapka obraz
 * převrací): obloha je dole, louka nahoře, co je ve světě vpravo, je
 * v kapce vlevo. Rovné čáry se proto musí ohnout — velké tvary se před
 * promítnutím zhustí (krok ≤ 0,02), promítnou bod po bodu, zjednoduší
 * (Douglas–Peucker) a zapíšou jako cesty. Drobnosti (chomáče listí, trsy
 * trávy, lampiony, lidé, ptáci) se kreslí jednou v místních jednotkách
 * a na místo je posadí afinní obraz čočky v daném bodě (Jacobiho matice).
 *
 * Přechody se čočkou neohnou: obloha je proto složená z pruhů — každý je
 * oblast nad promítnutou vodorovnou čarou — a každý pruh má kruhový
 * přechod se středem tam, kde leží střed jeho prohnuté čáry, takže barva
 * teče po obloukech jako v kapce. Jinak přechody jen na záři (slunce, okna
 * dílny, lampiony), na světlo hřebenů a na tmavší okraj. Žádné filtry ani
 * textury.
 *
 * Výstup je v souřadnicích kapky: kruh o poloměru SVET_R se středem v (0, 0)
 * a všechno uvnitř ořezu `${p}-disk`. Třídy pro stránku: `${p}-slunce`
 * (skupina slunce), `${p}-svit` (záře oken dílny a lampionů), `${p}-lampiony`,
 * `${p}-ptaci`, `${p}-mraky`. Čistá funkce, náhoda ze seedu — při každém
 * buildu stejný výsledek.
 */
import { SVET_R, f, type Bod } from "./miry";
import { nahoda } from "../../parta2/tvary";

/* ═══ Čočka kapky ═══ */

/** Obraz bodu světa (u, w) v kapce */
export function cocka(u: number, w: number): Bod {
  const r = Math.hypot(u, w);
  if (r < 1e-9) return [0, 0];
  const m = Math.min(r, 1);
  const k = (-SVET_R * (0.7 * Math.sin((m * Math.PI) / 2) + 0.3 * m)) / r;
  return [k * u, k * w];
}
const C = (b: Bod) => cocka(b[0], b[1]);

/** Jacobiho matice čočky v bodě (sloupce: obraz kroku po u a po w) */
function jakobi(u: number, w: number): [number, number, number, number] {
  const h = 1e-4;
  const a = cocka(u + h, w), b = cocka(u - h, w), c = cocka(u, w + h), d = cocka(u, w - h);
  return [(a[0] - b[0]) / (2 * h), (a[1] - b[1]) / (2 * h), (c[0] - d[0]) / (2 * h), (c[1] - d[1]) / (2 * h)];
}

/**
 * Afinní obraz čočky kolem bodu (u, w) jako SVG matice. Drobnost nakreslená
 * v místních jednotkách (x doprava, y dolů) se zvětší na `mx` × `my`
 * jednotek světa, otočí o `uhel` a čočka ji pak zmenší, nakloní a převrátí
 * přesně jako svět kolem ní. Záporné `mx` ji zrcadlí.
 */
function matice(u: number, w: number, mx: number, my = mx, uhel = 0): string {
  const [j00, j10, j01, j11] = jakobi(u, w);
  const [x, y] = cocka(u, w);
  const cs = Math.cos(uhel), sn = Math.sin(uhel);
  const q = (n: number) => (Math.round(n * 1e4) / 1e4).toString().replace(/^(-?)0\./, "$1.");
  return `matrix(${q((j00 * cs + j01 * sn) * mx)} ${q((j10 * cs + j11 * sn) * mx)} ${q((-j00 * sn + j01 * cs) * my)} ${q((-j10 * sn + j11 * cs) * my)} ${f(x)} ${f(y)})`;
}

/** Kolik jednotek kapky dělá jednotka světa v bodě (průměr obou směrů) */
function meritko(u: number, w: number): number {
  const [a, b, c, d] = jakobi(u, w);
  return Math.sqrt(Math.abs(a * d - b * c));
}

/* ═══ Počty a barvy ═══ */

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const omez = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const hladko = (a: number, b: number, x: number) => {
  const t = omez((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const vzdal = (a: Bod, b: Bod) => Math.hypot(b[0] - a[0], b[1] - a[1]);

const rgb = (h: string) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const hex = (c: number[]) =>
  "#" + c.map((v) => Math.round(omez(v, 0, 255)).toString(16).padStart(2, "0")).join("").toUpperCase();
/** Smíchá dvě barvy #RRGGBB v poměru t */
const smichej = (a: string, b: string, t: number) => {
  const A = rgb(a), B = rgb(b);
  return hex(A.map((v, i) => v + (B[i] - v) * t));
};
/** Barva na stupnici [poloha, barva] (polohy vzestupně) */
function stupnice(s: [number, string][], x: number): string {
  if (x <= s[0][0]) return s[0][1];
  for (let i = 0; i < s.length - 1; i++) {
    if (x <= s[i + 1][0]) return smichej(s[i][1], s[i + 1][1], (x - s[i][0]) / (s[i + 1][0] - s[i][0]));
  }
  return s[s.length - 1][1];
}

/* ═══ Body: vzorkování, zhuštění, zjednodušení ═══ */

/** Catmull-Rom skrz body světa, vzorkovaný zhruba po `krok` */
function krivka(P: Bod[], uzavrit = false, krok = 0.02): Bod[] {
  const n = P.length;
  const g = (i: number) => (uzavrit ? P[(i + n) % n] : P[Math.max(0, Math.min(n - 1, i))]);
  const out: Bod[] = [];
  for (let i = 0; i < (uzavrit ? n : n - 1); i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
    const k = Math.max(1, Math.ceil(vzdal(p1, p2) / krok));
    for (let j = 0; j < k; j++) {
      const t = j / k, t2 = t * t, t3 = t2 * t;
      const s = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([s(p0[0], p1[0], p2[0], p3[0]), s(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  if (!uzavrit) out.push(P[n - 1]);
  return out;
}

/** Rovné hrany rozdělit na kroky ≤ `krok`, aby se v čočce ohnuly */
function zhusti(P: Bod[], uzavrit = true, krok = 0.02): Bod[] {
  const n = P.length;
  const out: Bod[] = [];
  for (let i = 0; i < (uzavrit ? n : n - 1); i++) {
    const a = P[i], b = P[(i + 1) % n];
    const k = Math.max(1, Math.ceil(vzdal(a, b) / krok));
    for (let j = 0; j < k; j++) out.push([lerp(a[0], b[0], j / k), lerp(a[1], b[1], j / k)]);
  }
  if (!uzavrit) out.push(P[n - 1]);
  return out;
}

/** Douglas–Peucker: vynechá body, které od lomené čáry neodbočí víc než eps */
function zjednodus(b: Bod[], eps: number): Bod[] {
  if (b.length < 3) return b.slice();
  const nech = new Uint8Array(b.length);
  nech[0] = nech[b.length - 1] = 1;
  const zasobnik: [number, number][] = [[0, b.length - 1]];
  while (zasobnik.length) {
    const [i, j] = zasobnik.pop()!;
    const [ax, ay] = b[i];
    const dx = b[j][0] - ax, dy = b[j][1] - ay, l = Math.hypot(dx, dy);
    let max = -1, idx = -1;
    for (let k = i + 1; k < j; k++) {
      const d = l < 1e-9 ? Math.hypot(b[k][0] - ax, b[k][1] - ay) : Math.abs((b[k][0] - ax) * dy - (b[k][1] - ay) * dx) / l;
      if (d > max) { max = d; idx = k; }
    }
    if (max > eps) {
      nech[idx] = 1;
      zasobnik.push([i, idx], [idx, j]);
    }
  }
  return b.filter((_, k) => nech[k]);
}
/** Uzavřený tvar zjednodušit ve dvou půlkách (od prvního bodu k nejvzdálenějšímu a zpět) */
function zjednodusDokola(b: Bod[], eps: number): Bod[] {
  let dal = 0, md = -1;
  b.forEach((q, i) => {
    const d = vzdal(q, b[0]);
    if (d > md) { md = d; dal = i; }
  });
  const a = zjednodus(b.slice(0, dal + 1), eps);
  const c = zjednodus([...b.slice(dal), b[0]], eps);
  return [...a, ...c.slice(1, -1)];
}

/* ═══ Zápis cest (relativně, v desetinách — krátké a bez driftu) ═══ */

const d10 = (b: Bod): [number, number] => [Math.round(b[0] * 10), Math.round(b[1] * 10)];
const cis = (n10: number) => (n10 / 10).toString().replace(/^(-?)0\./, "$1.");
/** Řada čísel do cesty — mezera jen tam, kde ji neudělá minus */
const rada = (c: number[]) => c.map((n, i) => (i && n >= 0 ? " " : "") + cis(n)).join("");

/** Lomená cesta skrz body v kapce */
function lomena(b: Bod[], uzavrit = true): string {
  const P = b.map(d10).filter((q, i, a) => !i || q[0] !== a[i - 1][0] || q[1] !== a[i - 1][1]);
  const r: number[] = [];
  for (let i = 1; i < P.length; i++) r.push(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
  return `M${rada(P[0])}${r.length ? "l" + rada(r) : ""}${uzavrit ? "z" : ""}`;
}

/** Hladká cesta skrz body v kapce (Catmull-Rom jako Bézier) */
function hladka(b: Bod[], uzavrit = true): string {
  const n = b.length;
  if (n < 3) return lomena(b, uzavrit);
  const g = (i: number) => (uzavrit ? b[(i + n) % n] : b[Math.max(0, Math.min(n - 1, i))]);
  let [px, py] = d10(b[0]);
  const zac = `M${rada([px, py])}c`;
  const r: number[] = [];
  for (let i = 0; i < (uzavrit ? n : n - 1); i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
    const c1 = d10([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]);
    const c2 = d10([p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]);
    const e = d10(p2);
    r.push(c1[0] - px, c1[1] - py, c2[0] - px, c2[1] - py, e[0] - px, e[1] - py);
    [px, py] = e;
  }
  return zac + rada(r) + (uzavrit ? "z" : "");
}

interface Volby { uzavrit?: boolean; hladce?: boolean; eps?: number; krok?: number }
/** Tvar světa s rovnými hranami → cesta v kapce: zhustit, promítnout, zjednodušit, zapsat */
function tvar(svet: Bod[], o: Volby = {}): string {
  const uz = o.uzavrit ?? true;
  const b = zhusti(svet, uz, o.krok ?? 0.02).map(C);
  const z = uz ? zjednodusDokola(b, o.eps ?? 0.12) : zjednodus(b, o.eps ?? 0.12);
  return (o.hladce ? hladka : lomena)(z, uz);
}

/** Body už husté (z krivky nebo pasu) — jen promítnout a zapsat */
function obraz(svet: Bod[], o: Volby = {}): string {
  const uz = o.uzavrit ?? true;
  const b = svet.map(C);
  const z = uz ? zjednodusDokola(b, o.eps ?? 0.14) : zjednodus(b, o.eps ?? 0.14);
  return (o.hladce ? hladka : lomena)(z, uz);
}

/* ═══ Oblasti krajiny ═══ */

/** Body mimo kapku — za okraj, kde je ořez schová */
const VEN = 1.75;
const ven = (b: Bod): Bod => [b[0] * VEN, b[1] * VEN];
/** Profil krajiny (body seřazené podle u) navzorkovaný po 0,02 přes celou šířku */
const profil = (P: Bod[]) => krivka(P, false, 0.02);
/** Profil posunutý o kus dolů (opar, mlha) */
const posun = (P: Bod[], o: number) => P.map(([u, w]): Bod => [u, w + o]);
/** Výška profilu v místě u */
function vyskaNa(B: Bod[], u: number): number {
  if (u <= B[0][0]) return B[0][1];
  for (let i = 0; i < B.length - 1; i++) {
    if (u <= B[i + 1][0]) return lerp(B[i][1], B[i + 1][1], (u - B[i][0]) / (B[i + 1][0] - B[i][0] || 1));
  }
  return B[B.length - 1][1];
}
/** Oblast světa pod profilem (blíž k divákovi) — v kapce je nahoře */
function podProfilem(B: Bod[], eps = 0.15): string {
  const b = zjednodus(B.map(C), eps);
  return lomena([...b, ven(b[b.length - 1]), [-240, -240], [240, -240], ven(b[0])]);
}
/** Oblast světa nad profilem (obloha) — v kapce je dole */
function nadProfilem(B: Bod[], eps = 0.15): string {
  const b = zjednodus(B.map(C), eps);
  return lomena([...b, ven(b[b.length - 1]), [-240, 240], [240, 240], ven(b[0])]);
}
/** Pás mezi dvěma profily přes celou šířku */
function pasMezi(horni: Bod[], dolni: Bod[], eps = 0.15): string {
  const a = zjednodus(horni.map(C), eps);
  const b = zjednodus(dolni.map(C), eps).reverse();
  return lomena([...a, ven(a[a.length - 1]), ven(b[0]), ...b, ven(b[b.length - 1]), ven(a[0])]);
}
/** Čára po profilu (otevřená) — světlý lem hřebenů */
const poProfilu = (B: Bod[], od = -2, po = 2, eps = 0.12) =>
  lomena(zjednodus(B.filter(([u, w]) => u >= od && u <= po && Math.hypot(u, w) < 0.995).map(C), eps), false);

/* ═══ Chomáč (vroubkovaná elipsa) bod po bodu ═══ */

/**
 * Chomáč jako u parta2/tvary, ale každý obloučkový hrbol je kvadratická
 * křivka, jejíž krajní i řídicí body projdou čočkou — hrboly jsou malé,
 * takže je čočka kolem nich skoro afinní a křivka sedí.
 */
function chomac(cx: number, cy: number, rx: number, ry: number, pocet: number, seed: number, dno = 1, hrbol = 0.5): string {
  const R = nahoda(seed);
  const body: Bod[] = [];
  for (let i = 0; i < pocet; i++) {
    const a = (i / pocet) * Math.PI * 2 + (R() - 0.5) * (Math.PI / pocet) * 0.6;
    const k = 0.88 + R() * 0.2;
    let y = cy + Math.sin(a) * ry * k;
    if (dno < 1 && y > cy) y = cy + (y - cy) * dno;
    body.push([cx + Math.cos(a) * rx * k, y]);
  }
  const P = body.map((b) => d10(C(b)));
  const r: number[] = [];
  for (let i = 0; i < pocet; i++) {
    const a = body[i], b = body[(i + 1) % pocet];
    const ctl = d10(C([(a[0] + b[0]) / 2 + (b[1] - a[1]) * hrbol, (a[1] + b[1]) / 2 - (b[0] - a[0]) * hrbol]));
    const p = P[i], q = P[(i + 1) % pocet];
    r.push(ctl[0] - p[0], ctl[1] - p[1], q[0] - p[0], q[1] - p[1]);
  }
  return `M${rada(P[0])}q${rada(r)}z`;
}

/** Chomáč v místních jednotkách (poloměr 100) z obloučků — vzor pro <use> */
function chomacVzor(pocet: number, seed: number, dno = 1, hrbol = 0.62): string {
  const R = nahoda(seed);
  const body: Bod[] = [];
  for (let i = 0; i < pocet; i++) {
    const a = (i / pocet) * Math.PI * 2 + (R() - 0.5) * (Math.PI / pocet) * 0.6;
    const k = 0.9 + R() * 0.18;
    let y = Math.sin(a) * 100 * k;
    if (dno < 1 && y > 0) y *= dno;
    body.push([Math.cos(a) * 100 * k, y]);
  }
  let d = `M${Math.round(body[0][0])} ${Math.round(body[0][1])}`;
  for (let i = 0; i < pocet; i++) {
    const [x1, y1] = body[i], [x2, y2] = body[(i + 1) % pocet];
    const r = Math.round(Math.hypot(x2 - x1, y2 - y1) * hrbol);
    d += `A${r} ${r} 0 0 1 ${Math.round(x2)} ${Math.round(y2)}`;
  }
  return d + "Z";
}

/* ═══ Pás podél osy — kmen, větve, pěšina ═══ */

interface Osa { b: Bod[]; s: number[] }
/** Osa (Catmull-Rom po 0,015) a tloušťka podle délky nebo podle funkce bodu */
function osa(P: Bod[], s: [number, number] | ((b: Bod, t: number) => number), exp = 0.9): Osa {
  const b = krivka(P, false, 0.015);
  const L = [0];
  for (let i = 1; i < b.length; i++) L.push(L[i - 1] + vzdal(b[i - 1], b[i]));
  const t = (i: number) => L[i] / L[L.length - 1];
  return { b, s: b.map((q, i) => (typeof s === "function" ? s(q, t(i)) : lerp(s[0], s[1], Math.pow(t(i), exp)))) };
}
function normaly(b: Bod[]): Bod[] {
  return b.map((_, i) => {
    const a = b[Math.max(0, i - 1)], c = b[Math.min(b.length - 1, i + 1)];
    const dx = c[0] - a[0], dy = c[1] - a[1], l = Math.hypot(dx, dy) || 1;
    return [-dy / l, dx / l];
  });
}
/** Obrys pásu mezi posuny od a po (v půlkách tloušťky, −1 a 1 jsou hrany) */
function pas(o: Osa, od: number, po: number, spicka = false, nabeh = 0): Bod[] {
  const n = normaly(o.b);
  const A: Bod[] = [], B: Bod[] = [];
  const N = o.b.length - 1;
  o.b.forEach(([x, y], i) => {
    const h = o.s[i] / 2, k = nabeh > 0 ? hladko(0, 1, i / N / nabeh) : 1;
    const p2 = od + (po - od) * k;
    A.push([x + n[i][0] * od * h, y + n[i][1] * od * h]);
    B.push([x + n[i][0] * p2 * h, y + n[i][1] * p2 * h]);
  });
  if (spicka) {
    const p = o.b[N], q = o.b[N - 1], l = vzdal(p, q) || 1;
    A.push([p[0] + ((p[0] - q[0]) / l) * o.s[N] * 0.5, p[1] + ((p[1] - q[1]) / l) * o.s[N] * 0.5]);
  }
  return [...A, ...B.reverse()];
}
/** Která strana osy kouká k bodu (+1 / −1) */
function stranaKe(o: Osa, cil: Bod): number {
  let s = 0;
  normaly(o.b).forEach((v, i) => {
    const dx = cil[0] - o.b[i][0], dy = cil[1] - o.b[i][1], l = Math.hypot(dx, dy) || 1;
    s += (v[0] * dx + v[1] * dy) / l;
  });
  return s >= 0 ? 1 : -1;
}

/* ═══ Svět ═══ */

/** Slunce na obzoru a jeho poloměr (souřadnice světa) */
const SLUNCE: Bod = [0.2, 0.052];
const SLUNCE_R = 0.058;

/** Obloha od temene k obzoru (w → barva) */
const NEBE: [number, string][] = [
  [-1.0, "#1C2055"], [-0.86, "#262C6B"], [-0.72, "#343A80"], [-0.58, "#4A4C92"], [-0.46, "#655DA0"],
  [-0.35, "#8569A6"], [-0.25, "#A774A7"], [-0.16, "#C784A4"], [-0.08, "#E1969E"], [-0.02, "#F2AA96"],
  [0.03, "#FBC096"], [0.07, "#FFD39E"], [0.115, "#FFE6B2"],
];

/* hřebeny, kopce a louka — body profilů (u, w), zleva doprava */
const HREBEN_1: Bod[] = [[-1.1, 0.03], [-0.92, -0.008], [-0.78, 0.014], [-0.6, -0.036], [-0.44, 0.0], [-0.3, 0.02], [-0.14, 0.044], [0.04, 0.058], [0.2, 0.066], [0.36, 0.05], [0.52, 0.018], [0.66, 0.034], [0.84, 0.004], [1.1, 0.03]];
const HREBEN_2: Bod[] = [[-1.1, 0.086], [-0.86, 0.06], [-0.66, 0.078], [-0.46, 0.054], [-0.24, 0.075], [-0.02, 0.09], [0.18, 0.088], [0.38, 0.07], [0.6, 0.082], [0.84, 0.06], [1.1, 0.08]];
const KOPCE: Bod[] = [[-1.1, 0.15], [-0.84, 0.128], [-0.6, 0.142], [-0.38, 0.122], [-0.14, 0.136], [0.1, 0.126], [0.34, 0.14], [0.58, 0.128], [0.84, 0.144], [1.1, 0.132]];
const BLIZKO: Bod[] = [[-1.1, 0.252], [-0.82, 0.228], [-0.58, 0.244], [-0.32, 0.262], [0.0, 0.258], [0.3, 0.236], [0.56, 0.226], [0.84, 0.24], [1.1, 0.23]];
const LOUKA: Bod[] = [[-1.1, 0.4], [-0.8, 0.386], [-0.55, 0.404], [-0.32, 0.43], [-0.08, 0.44], [0.18, 0.42], [0.44, 0.4], [0.7, 0.41], [1.1, 0.396]];
/** Pahorek s domkem: rovný vršek pod celým domem, pak svahy do louky */
const pahorekW = (u: number) => 0.296 + 0.17 * (1 - Math.exp(-Math.pow(Math.max(0, Math.abs(u + 0.19) - 0.15) / 0.3, 2)));

/** Domek: bod kresby z Domku 2 (480 × 320, pata y 300) → svět */
const DUM = { u: -0.2, w: 0.297, s: 0.00092 };
const naDum = ([x, y]: Bod): Bod => [DUM.u + (x - 250) * DUM.s, DUM.w + (y - 300) * DUM.s];

/* ——— Obloha ——— */

function obloha(p: string): { defs: string; svg: string } {
  /*
   * Pruhy po stejných krocích v kapce (podle středové svislice); každý je
   * oblast nad čarou w = c. Prohnutá čára je skoro kruhový oblouk se
   * středem na svislici — přechod pruhu je kruhový s tímtéž středem.
   */
  const ys = (c: number) => cocka(0, c)[1];
  const najdi = (y: number) => {
    let lo = -1, hi = 0.3;
    for (let i = 0; i < 44; i++) {
      const m = (lo + hi) / 2;
      if (ys(m) > y) lo = m; else hi = m;
    }
    return (lo + hi) / 2;
  };
  /** Střed kružnice (0, Y) proložené obrazem čáry w = c (střed a bod ve ¾ šířky) */
  const stredOblouku = (c: number) => {
    const a = 0.75 * Math.sqrt(Math.max(0, 1 - c * c));
    const [x1, y1] = cocka(a, c);
    const y0 = ys(c);
    const jm = 2 * (y0 - y1);
    return Math.abs(jm) < 1e-3 ? null : (y0 * y0 - x1 * x1 - y1 * y1) / jm;
  };
  const N = 16;
  const ya = ys(0.115), yb = ys(-0.995);
  const c = Array.from({ length: N + 1 }, (_, i) => najdi(lerp(ya, yb, Math.pow(i / N, 0.9))));
  const defs: string[] = [];
  const pruhy: string[] = [`<circle r="${SVET_R + 2}" fill="${stupnice(NEBE, 0.115)}"/>`];
  for (let i = 0; i < N; i++) {
    const a = c[i], b = c[i + 1];
    const ca = stupnice(NEBE, a), cb = stupnice(NEBE, b);
    const Y = stredOblouku((a + b) / 2);
    const id = `${p}-n${i}`;
    if (Y === null || Math.abs(Y) > 3000) {
      defs.push(`<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="${f(ys(a))}" x2="0" y2="${f(ys(b))}"><stop offset="0" stop-color="${ca}"/><stop offset="1" stop-color="${cb}"/></linearGradient>`);
    } else {
      const ra = Math.abs(ys(a) - Y), rb = Math.abs(ys(b) - Y), R = Math.max(ra, rb);
      const zast = [[ra / R, ca], [rb / R, cb]].sort((x, y) => (x[0] as number) - (y[0] as number));
      defs.push(`<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="0" cy="${f(Y)}" r="${f(R)}">${zast.map(([o, col]) => `<stop offset="${(Math.round((o as number) * 1e4) / 1e4)}" stop-color="${col}"/>`).join("")}</radialGradient>`);
    }
    pruhy.push(`<path d="${nadProfilem(zhusti([[-1.1, a], [1.1, a]], false, 0.02), 0.22)}" fill="url(#${id})"/>`);
  }
  return { defs: defs.join(""), svg: pruhy.join("") };
}

/* ——— Slunce ——— */

function slunce(p: string): string {
  const [sx, sy] = C(SLUNCE);
  const R = nahoda(611);
  /* paprsky: úzké klíny od slunce přes oblohu, v kapce se prohnou */
  const uhly = [-168, -150, -133, -117, -101, -86, -70, -54, -37, -20];
  const klin = uhly.map((deg) => {
    const a = (deg * Math.PI) / 180, s = ((1.1 + R() * 1.3) * Math.PI) / 180, l = 0.75 + R() * 0.5;
    const A: Bod = [SLUNCE[0] + Math.cos(a - s) * l, SLUNCE[1] + Math.sin(a - s) * l];
    const B: Bod = [SLUNCE[0] + Math.cos(a + s) * l, SLUNCE[1] + Math.sin(a + s) * l];
    return tvar([SLUNCE, A, B], { eps: 0.25 });
  });
  const r = SLUNCE_R * meritko(SLUNCE[0], SLUNCE[1]);
  return `<g class="${p}-slunce">
    <circle cx="${f(sx)}" cy="${f(sy)}" r="150" fill="url(#${p}-halo)"/>
    <path d="${klin.join("")}" fill="url(#${p}-paprsek)"/>
    <circle cx="${f(sx)}" cy="${f(sy)}" r="${f(r * 2.2)}" fill="url(#${p}-korona)"/>
    <circle cx="${f(sx)}" cy="${f(sy)}" r="${f(r)}" fill="#FFE7B4"/>
    <circle cx="${f(sx)}" cy="${f(sy)}" r="${f(r * 0.84)}" fill="#FFF4D8"/>
    <circle cx="${f(sx)}" cy="${f(sy)}" r="${f(r * 0.58)}" fill="#FFFCF0"/>
  </g>`;
}

/* ——— Mraky: tenké růžové pruhy, spodek od slunce zlatý ——— */

function mraky(p: string): string {
  const MRAKY: { u: [number, number]; w: number; t: number; sklon: number; seed: number }[] = [
    { u: [-0.8, 0.02], w: -0.21, t: 0.036, sklon: 0.03, seed: 31 },
    { u: [-0.24, 0.6], w: -0.41, t: 0.04, sklon: -0.04, seed: 32 },
    { u: [0.36, 0.86], w: -0.115, t: 0.02, sklon: 0.02, seed: 33 },
    { u: [-0.7, -0.14], w: -0.57, t: 0.03, sklon: 0.03, seed: 34 },
    { u: [-0.44, 0.04], w: -0.075, t: 0.013, sklon: 0.0, seed: 35 },
  ];
  const telo: string[] = [], stin: string[] = [], zlato: string[] = [];
  for (const m of MRAKY) {
    const R = nahoda(m.seed);
    const n = Math.ceil((m.u[1] - m.u[0]) / 0.015);
    const v = [R() * 6, R() * 6, R() * 6];
    const horni: Bod[] = [], dolni: Bod[] = [], svet: Bod[] = [], tma: Bod[] = [];
    for (let i = 0; i <= n; i++) {
      const s = i / n;
      const u = lerp(m.u[0], m.u[1], s);
      const obal = Math.pow(Math.sin(Math.PI * s), 0.55) * (0.72 + 0.28 * Math.sin(s * 9 + v[0]));
      const w = m.w + m.sklon * (s - 0.5) + 0.006 * Math.sin(s * 7 + v[1]);
      /* hřbet z několika měkkých kup */
      const hrb = 0.62 + 0.38 * Math.abs(Math.sin(s * 11 + v[2]));
      horni.push([u, w - m.t * obal * hrb]);
      dolni.push([u, w + m.t * 0.38 * obal]);
      svet.push([u, w + m.t * 0.02 * obal]);
      tma.push([u, w - m.t * obal * hrb * 0.5]);
    }
    const k = (a: Bod[], b: Bod[]) => obraz([...a, ...b.reverse()], { eps: 0.12 });
    telo.push(k(horni.slice(), dolni.slice()));
    stin.push(k(horni.slice(), tma.slice()));
    zlato.push(k(svet.slice(), dolni.slice()));
  }
  return `<g class="${p}-mraky"><path d="${telo.join("")}" fill="#DD98A7"/><path d="${stin.join("")}" fill="#A07BA9" opacity="0.5"/><path d="${zlato.join("")}" fill="#FFD3AE"/></g>`;
}

/**
 * Kupy za levými horami: měkké oblaky s rovným spodkem. Strana od slunce
 * je fialová, ke slunci lososová a obrys ke slunci žhne — stejný trik jako
 * u koruny ořechu (žhavý lem posunutý ke slunci pod hlavní barvou).
 */
function kupy(p: string): string {
  /* spodky kup leží za vzdáleným hřebenem */
  const K: Bod3[] = [
    [-0.95, 0.0, 0.09], [-0.83, -0.035, 0.115], [-0.7, -0.03, 0.1], [-0.6, -0.065, 0.105], [-0.49, -0.02, 0.085],
    [-0.4, 0.008, 0.065], [-0.74, -0.125, 0.08], [-0.32, 0.03, 0.05],
  ];
  const R = nahoda(5521);
  const zar: string[] = [], tma: string[] = [], svetlo: string[] = [];
  K.forEach(([u, w, r], i) => {
    const dx = SLUNCE[0] - u, dy = SLUNCE[1] - w, l = Math.hypot(dx, dy);
    const sx = dx / l, sy = dy / l;
    const t = `${p}-m${i % 2}`, a = (R() - 0.5) * 0.2;
    zar.push(`<use href="#${t}" transform="${matice(u + sx * r * 0.26, w + sy * r * 0.26, (r * 0.94) / 100, (r * 0.94) / 100, a)}"/>`);
    tma.push(`<use href="#${t}" transform="${matice(u, w, r / 100, r / 100, a)}"/>`);
    svetlo.push(`<use href="#${t}" transform="${matice(u + sx * r * 0.14, w + sy * r * 0.14 + r * 0.06, (r * 0.9) / 100, (r * 0.82) / 100, a)}"/>`);
  });
  return `<g fill="#FFE2C0">${zar.join("")}</g><g fill="#B888A8">${tma.join("")}</g><g fill="#EFAFA4">${svetlo.join("")}</g>`;
}

/** Měsíc ubývá nad západem, jitřenka a pár posledních hvězd u temene */
function nocniNebe(p: string): string {
  const M: Bod = [-0.5, -0.665];
  const [mx, my] = C(M);
  const a = Math.atan2(SLUNCE[1] - M[1], SLUNCE[0] - M[0]);
  const H: [number, number, number][] = [[-0.66, -0.69, 0.8], [-0.35, -0.875, 0.65], [-0.84, -0.47, 0.6], [-0.12, -0.965, 0.55], [-0.24, -0.6, 0.5]];
  return `<circle cx="${f(mx)}" cy="${f(my)}" r="${f(0.09 * meritko(M[0], M[1]))}" fill="url(#${p}-mesicni)"/>
    <use href="#${p}-mesic" fill="#FBF1DE" transform="${matice(M[0], M[1], 0.00034, 0.00034, a)}"/>
    <g fill="#FFF6E4">${H.map(([u, w, s]) => `<use href="#${p}-hvezda" opacity="${f(s)}" transform="${matice(u, w, 0.0011 * s, 0.0011 * s)}"/>`).join("")}</g>
    <circle cx="${f(C([-0.06, -0.44])[0])}" cy="${f(C([-0.06, -0.44])[1])}" r="5" fill="url(#${p}-mesicni)"/>
    <use href="#${p}-hvezda" fill="#FFFBF0" transform="${matice(-0.06, -0.44, 0.0017, 0.0017, 0.1)}"/>`;
}

/* ——— Ptáci ——— */

function ptaci(p: string): string {
  const P: [number, number, number, number][] = [
    [-0.06, -0.3, 1.1, -0.1], [0.0, -0.335, 0.9, 0.12], [0.07, -0.29, 1.0, 0.05], [0.125, -0.36, 0.75, -0.15], [-0.13, -0.258, 0.8, 0.2],
  ];
  return `<g class="${p}-ptaci" fill="#3E3456" opacity="0.85">${P.map(([u, w, m, a]) => `<use href="#${p}-ptak" transform="${matice(u, w, 0.001 * m, 0.001 * m, a)}"/>`).join("")}</g>`;
}

/* ——— Hřebeny v oparu ——— */

function hrebeny(p: string): string {
  const H1 = profil(HREBEN_1), H2 = profil(HREBEN_2);
  /* les na bližším hřebeni: vroubky sedí na hraně */
  const R = nahoda(77);
  const vrch: Bod[] = [];
  let u = -1.1;
  while (u < 1.1) {
    const r = 0.008 + R() * 0.009;
    vrch.push([u, vyskaNa(H2, u) - r * (0.5 + R() * 0.7)]);
    u += r * (1.4 + R() * 0.8);
  }
  const les = krivka(vrch, false, 0.01);
  return `
    <path d="${podProfilem(H1)}" fill="#BF9FBF"/>
    <path d="${poProfilu(H1, -1, 1)}" fill="none" stroke="url(#${p}-lem)" stroke-width="0.9" stroke-linejoin="round"/>
    <path d="${pasMezi(profil(posun(HREBEN_1, 0.014)), profil(posun(HREBEN_2, 0.004)))}" fill="#F4C4AC" opacity="0.5"/>
    <path d="${podProfilem(H2)}" fill="#9B88B5"/>
    <path d="${podProfilem(les, 0.1)}" fill="#8676A8"/>
    <path d="${poProfilu(les, -1, 1, 0.1)}" fill="none" stroke="url(#${p}-lem)" stroke-width="0.6" opacity="0.8"/>
    <path d="${pasMezi(profil(posun(HREBEN_2, 0.012)), profil(posun(KOPCE, 0.012)))}" fill="#F6C6A8" opacity="0.5"/>`;
}

/* ——— Kopce s poli, vesnice, mlha ——— */

function kopce(p: string): string {
  const K = profil(KOPCE);
  const hranice = [-1.12, -0.86, -0.62, -0.4, -0.17, 0.06, 0.28, 0.5, 0.74, 1.12];
  const barvy = ["#D9B872", "#9FB468", "#CDA676", "#8FAE62", "#E2C273", "#A7B86A", "#C79F72", "#94B064", "#DCBC70"];
  const dolu = (u: number) => u * 1.55;
  const DOLE = 0.42;
  const pole: string[] = [], meze: string[] = [], brazdy: string[] = [];
  for (let i = 0; i < hranice.length - 1; i++) {
    const a = hranice[i], b = hranice[i + 1];
    const obrys: Bod[] = [[a, vyskaNa(K, a)], ...K.filter(([u]) => u > a && u < b), [b, vyskaNa(K, b)], [dolu(b), DOLE], [dolu(a), DOLE]];
    pole.push(`<path d="${tvar(obrys, { eps: 0.15 })}" fill="${barvy[i]}"/>`);
    /* pár řádků po spádnici na každém druhém poli */
    if (i % 2 === 0) {
      for (let k = 1; k < 4; k++) {
        const x = lerp(a, b, k / 4);
        brazdy.push(tvar([[x, vyskaNa(K, x) + 0.004], [dolu(x), DOLE]], { uzavrit: false, eps: 0.12 }));
      }
    }
    /* mez s keři mezi poli: pás, který se k divákovi rozšiřuje */
    if (i > 0) meze.push(obraz(pas(osa([[a, vyskaNa(K, a) + 0.002], [dolu(a), DOLE]], [0.008, 0.03]), -1, 1), { eps: 0.12 }));
  }
  return `<path d="${podProfilem(K)}" fill="#A9B172"/>
    ${pole.join("")}
    <path d="${brazdy.join("")}" fill="none" stroke="#6E6040" stroke-width="0.35" opacity="0.25"/>
    <path d="${meze.join("")}" fill="#5D7C46"/>
    <path d="${poProfilu(K, -1, 1)}" fill="none" stroke="url(#${p}-lem)" stroke-width="0.8" opacity="0.85"/>`;
}

/** Stromy na kopcích — kulaté koruny, ke slunci světlejší, stín od slunce */
function stromky(seznam: [number, number, number][], seed: number): string {
  const tmave: string[] = [], svetle: string[] = [], kmeny: string[] = [], stiny: string[] = [];
  seznam.forEach(([u, w, r], i) => {
    const k = u < SLUNCE[0] ? 1 : -1;
    stiny.push(obraz(krivka(Array.from({ length: 8 }, (_, j): Bod => {
      const a = (j / 8) * Math.PI * 2;
      return [u - k * r * 0.5 + Math.cos(a) * r * 1.1, w + r * 0.12 + Math.sin(a) * r * 0.2];
    }), true, 0.01), { eps: 0.08 }));
    kmeny.push(tvar([[u - r * 0.08, w], [u + r * 0.08, w], [u + r * 0.06, w - r * 1.1], [u - r * 0.06, w - r * 1.1]], { eps: 0.1 }));
    tmave.push(chomac(u, w - r * 1.35, r * 0.8, r * 0.9, 8, seed + i, 0.85, 0.5));
    svetle.push(chomac(u + k * r * 0.22, w - r * 1.42, r * 0.5, r * 0.6, 7, seed + 40 + i, 1, 0.5));
  });
  return `<path d="${stiny.join("")}" fill="#3D5A33" opacity="0.25"/><path d="${kmeny.join("")}" fill="#4A3F3C"/><path d="${tmave.join("")}" fill="#3F6142"/><path d="${svetle.join("")}" fill="#7E9A55"/>`;
}

function vesnice(): string {
  const K = profil(KOPCE);
  const DOMY: [number, number, number, number, boolean][] = [
    /* u, hloubka pod hřebenem, šířka, výška, štít (jinak valba) */
    [-0.79, 0.034, 0.05, 0.026, true], [-0.735, 0.046, 0.044, 0.024, false], [-0.68, 0.03, 0.046, 0.026, true],
    [-0.565, 0.044, 0.05, 0.024, false], [-0.51, 0.03, 0.042, 0.024, true], [-0.455, 0.046, 0.048, 0.026, true],
  ];
  const zdi: string[] = [], stiny: string[] = [], strechy: string[] = [], okna: string[] = [];
  const dum = (u: number, w: number, s: number, v: number, stit: boolean) => {
    zdi.push(tvar([[u - s / 2, w], [u + s / 2, w], [u + s / 2, w - v], [u - s / 2, w - v]], { eps: 0.08 }));
    /* strana od slunce ve stínu (slunce je vpravo) */
    stiny.push(tvar([[u - s / 2, w], [u - s * 0.12, w], [u - s * 0.12, w - v], [u - s / 2, w - v]], { eps: 0.08 }));
    const t = s * 0.08;
    strechy.push(stit
      ? tvar([[u - s / 2 - t, w - v], [u, w - v - s * 0.5], [u + s / 2 + t, w - v]], { eps: 0.08 })
      : tvar([[u - s / 2 - t, w - v], [u - s * 0.22, w - v - s * 0.36], [u + s * 0.22, w - v - s * 0.36], [u + s / 2 + t, w - v]], { eps: 0.08 }));
    okna.push(tvar([[u + s * 0.1, w - v * 0.3], [u + s * 0.26, w - v * 0.3], [u + s * 0.26, w - v * 0.62], [u + s * 0.1, w - v * 0.62]], { eps: 0.06 }));
  };
  for (const [u, h, s, v, stit] of DOMY) dum(u, vyskaNa(K, u) + h, s, v, stit);
  /* kostelík s věží */
  const ku = -0.615, kw = vyskaNa(K, ku) + 0.05;
  dum(ku, kw, 0.07, 0.03, true);
  const vu = ku + 0.042;
  zdi.push(tvar([[vu - 0.012, kw], [vu + 0.012, kw], [vu + 0.012, kw - 0.075], [vu - 0.012, kw - 0.075]], { eps: 0.06 }));
  stiny.push(tvar([[vu - 0.012, kw], [vu - 0.002, kw], [vu - 0.002, kw - 0.075], [vu - 0.012, kw - 0.075]], { eps: 0.06 }));
  const vez = tvar([[vu - 0.015, kw - 0.075], [vu, kw - 0.118], [vu + 0.015, kw - 0.075]], { eps: 0.06 });
  okna.push(tvar([[vu - 0.004, kw - 0.05], [vu + 0.004, kw - 0.05], [vu + 0.004, kw - 0.06], [vu - 0.004, kw - 0.06]], { eps: 0.05 }));
  /* ranní kouř ze dvou komínů, vítr ho bere doprava */
  const kour = [-0.735, -0.565].map((u, i) => {
    const w = vyskaNa(K, u) + DOMY[i ? 3 : 1][1] - DOMY[i ? 3 : 1][3] - 0.012;
    const o = osa([[u + 0.008, w], [u + 0.01, w - 0.024], [u + 0.022, w - 0.048], [u + 0.046, w - 0.066], [u + 0.08, w - 0.078]], [0.003, 0.012], 0.8);
    return obraz(pas(o, -1, 1, true), { eps: 0.06 });
  });
  return `<path d="${kour.join("")}" fill="#F7E6E6" opacity="0.32"/><path d="${zdi.join("")}" fill="#F7EBDD"/><path d="${stiny.join("")}" fill="#CDB9C4"/><path d="${strechy.join("")}" fill="#C45A40"/><path d="${vez}" fill="#6F7090"/><path d="${okna.join("")}" fill="#FFCB72"/>`;
}

/** Mlha: měkký pás ze tří vrstev nad sebou, okraje se vlní a ke koncům řídnou */
function mlha(u0: number, u1: number, w: number, v: number, barva: string, sila: number, seed: number): string {
  const R = nahoda(seed);
  const out: string[] = [];
  const f1 = R() * 6, f2 = R() * 6;
  const n = Math.ceil((u1 - u0) / 0.02);
  for (let k = 0; k < 3; k++) {
    const q = 1 - k / 3;
    const horni: Bod[] = [], dolni: Bod[] = [];
    for (let i = 0; i <= n; i++) {
      const s = i / n, u = lerp(u0, u1, s);
      const konce = Math.pow(Math.sin(Math.PI * s), 0.5);
      horni.push([u, w - v * q * konce * (0.7 + 0.3 * Math.sin(s * 11 + f1 + k))]);
      dolni.push([u, w + v * 0.55 * q * konce * (0.75 + 0.25 * Math.sin(s * 8 + f2 - k))]);
    }
    out.push(obraz([...horni, ...dolni.reverse()], { eps: 0.2 }));
  }
  return `<path d="${out.join("")}" fill="${barva}" opacity="${f(sila * 0.36)}"/>`;
}

function blizkeKopce(p: string): string {
  const B = profil(BLIZKO);
  return `<path d="${podProfilem(B)}" fill="#8DAA5E"/>
    <path d="${poProfilu(B, -1, 1)}" fill="none" stroke="url(#${p}-lem)" stroke-width="1" opacity="0.8"/>`;
}

/* ——— Pahorek, domek a lidé ——— */

function pahorek(p: string): string {
  const P: Bod[] = [];
  for (let u = -1.1; u <= 1.1001; u += 0.02) P.push([u, pahorekW(u)]);
  return `<path d="${podProfilem(P)}" fill="url(#${p}-pahorek)"/>
    <path d="${poProfilu(P, -0.62, 0.3)}" fill="none" stroke="url(#${p}-lem)" stroke-width="1.1"/>`;
}

function domek(p: string): string {
  const T = (b: Bod[], o: Volby = {}) => tvar(b.map(naDum), { eps: 0.07, ...o });
  const obd = (x: number, y: number, w: number, h: number) => T([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);
  const cara = (b: Bod[]) => tvar(b.map(naDum), { uzavrit: false, eps: 0.06 });
  /* borovice za domem */
  const bor = [[420, 150, 44, 30], [410, 200, 56, 34], [426, 250, 50, 30]].map(([x, y, rx, ry], i) => {
    const [u, w] = naDum([x, y]);
    return chomac(u, w, rx * DUM.s, ry * DUM.s, 10, 7101 + i, 0.6, 0.45);
  });
  const borSvetlo = [[440, 156, 26, 18], [436, 206, 30, 18], [446, 254, 26, 16]].map(([x, y, rx, ry], i) => {
    const [u, w] = naDum([x, y]);
    return chomac(u, w, rx * DUM.s, ry * DUM.s, 8, 7111 + i, 0.7, 0.45);
  });
  /* sakura na trávníku */
  const [su, sw] = naDum([61, 264]);
  const sakura = chomac(su, sw, 26 * DUM.s, 16 * DUM.s, 10, 7104, 1, 0.45);
  const sakura2 = chomac(su + 4 * DUM.s, sw - 4 * DUM.s, 15 * DUM.s, 9 * DUM.s, 8, 7105, 1, 0.45);
  const tasky = [0.28, 0.52, 0.76].map((t) => cara([[198 + 74 * t, 110 + 72 * t], [326 + 76 * t, 100 + 74 * t]])).join("");
  const [lu, lw] = naDum([84, 189]);
  const [du, dw] = naDum([232, 276]);
  const [dx, dy] = C([du, dw]), [lx, ly] = C([lu, lw]);
  /* stín domu po ránu k divákovi doleva */
  const stin = T([[118, 302], [400, 302], [330, 336], [40, 340]]);
  return `<g>
    <path d="${stin}" fill="#4F6A3C" opacity="0.28"/>
    <path d="${cara([[418, 300], [420, 130]])}" stroke="#4B3A2E" stroke-width="1.1" fill="none"/>
    <path d="${bor.join("")}" fill="#2E4E3C"/>
    <path d="${borSvetlo.join("")}" fill="#5C7E50"/>
    <path d="${T([[196, 106], [270, 184], [404, 176], [328, 98]])}" fill="#D86B48"/>
    <path d="${T([[236, 148], [270, 184], [404, 176], [368, 140]])}" fill="#E8835C" opacity="0.7"/>
    <path d="${tasky}" fill="none" stroke="#9A4430" stroke-width="0.35" opacity="0.7"/>
    <path d="${cara([[196, 104], [328, 96]])}" stroke="#7A3424" stroke-width="0.9" fill="none" stroke-linecap="round"/>
    <path d="${T([[270, 304], [270, 186], [400, 178], [400, 304]])}" fill="#DCDCB0"/>
    <path d="${T([[270, 186], [400, 178], [400, 192], [270, 200]])}" fill="#A8AC86" opacity="0.6"/>
    <path d="${cara([[270, 186], [404, 178]])}" stroke="#4D3626" stroke-width="0.7" fill="none"/>
    <path d="${obd(300, 208, 26, 30)}${obd(350, 206, 26, 30)}" fill="#F4C08C" stroke="#F7F7F2" stroke-width="0.45"/>
    <path d="${obd(300, 252, 26, 28)}" fill="#6E6A8E" stroke="#F7F7F2" stroke-width="0.45"/>
    <path d="${T([[118, 304], [118, 182], [196, 110], [270, 182], [270, 304]])}" fill="url(#${p}-stit)"/>
    <path d="${obd(190, 116, 11, 188)}" fill="#C3CDB1"/>
    <path d="${obd(140, 186, 30, 28)}" fill="#FFD48A" stroke="#F7F7F2" stroke-width="0.45"/>
    <path d="${obd(140, 234, 30, 26)}" fill="#6A6990" stroke="#F7F7F2" stroke-width="0.45"/>
    <path d="${obd(201, 209, 69, 44)}" fill="#7D8C74"/>
    <path d="${obd(212, 170, 38, 34)}${obd(222, 216, 18, 20)}" fill="#6E6C93" stroke="#F7F7F2" stroke-width="0.4"/>
    <path d="${obd(203, 186, 65, 16)}${obd(203, 236, 65, 14)}" fill="#A6CFA2"/>
    <path d="${obd(201, 202, 69, 6)}${obd(201, 250, 69, 7)}" fill="#E6E6DE"/>
    <path d="${cara([[110, 190], [196, 104], [278, 190]])}" stroke="#4D3626" stroke-width="1.5" fill="none" stroke-linejoin="round"/>
    <path d="${cara([[108, 187], [196, 100], [280, 187]])}" stroke="#B6583B" stroke-width="0.7" fill="none" stroke-linejoin="round"/>
    <path d="${cara([[196, 100], [280, 187]])}" stroke="#FFB27A" stroke-width="0.45" fill="none" opacity="0.9"/>
    <circle class="${p}-svit" cx="${f(dx)}" cy="${f(dy)}" r="${f(meritko(du, dw) * 0.075)}" fill="url(#${p}-zare)"/>
    <path d="${obd(203, 258, 58, 34)}" fill="#FFC870"/>
    <path d="${obd(207, 261, 22, 13)}${obd(233, 261, 24, 13)}" fill="#FFEBBE"/>
    <path d="${cara([[216, 258], [216, 292]])}${cara([[238, 258], [238, 292]])}${cara([[203, 268], [261, 268]])}" stroke="#F7F7F2" stroke-width="0.4" fill="none"/>
    <path d="${obd(100, 286, 100, 18)}" fill="#C7D0AE"/>
    <path d="${obd(100, 276, 96, 10)}" fill="#5E5245"/>
    <path d="${cara([[200, 278], [264, 278]])}${cara([[200, 290], [264, 290]])}" stroke="#B5C0C5" stroke-width="0.5" fill="none"/>
    <path d="${obd(264, 282, 10, 22)}" fill="#C7D0AE"/>
    <path d="${cara([[96, 304], [96, 196], [92, 189], [84, 188]])}" stroke="#7E8A90" stroke-width="0.55" fill="none"/>
    <circle class="${p}-svit" cx="${f(lx)}" cy="${f(ly)}" r="${f(meritko(lu, lw) * 0.03)}" fill="url(#${p}-zare)"/>
    <path d="${cara([[60, 304], [61, 262]])}" stroke="#7A4E3C" stroke-width="0.6" fill="none"/>
    <path d="${sakura}" fill="#EFB0C0"/>
    <path d="${sakura2}" fill="#F8D3DC"/>
  </g>`;
}

function lide(p: string): string {
  const L: [string, number, number, number][] = [
    ["clovek", -0.238, 0.327, 1.05], ["dite", -0.215, 0.331, 0.95], ["kami", -0.193, 0.334, 1.0],
  ];
  return `<g fill="#3E3550">${L.map(([s, u, w, m]) => `<use href="#${p}-${s}" transform="${matice(u, w, 0.001 * m)}"/>`).join("")}</g>`;
}

/* ——— Louka, tůňka a pěšina ——— */

function louka(p: string): string {
  const B = profil(LOUKA);
  return `<path d="${podProfilem(B)}" fill="url(#${p}-louka)"/>
    <path d="${poProfilu(B, -1, 1)}" fill="none" stroke="url(#${p}-lem)" stroke-width="1.2" opacity="0.7"/>`;
}

function pesina(): string {
  const o = osa(
    [[-0.222, 0.3], [-0.2, 0.33], [-0.14, 0.37], [-0.07, 0.41], [-0.03, 0.47], [-0.06, 0.56], [-0.13, 0.67], [-0.11, 0.8], [-0.01, 0.94], [0.08, 1.06]],
    (b) => lerp(0.014, 0.26, Math.pow(omez((b[1] - 0.3) / 0.76), 1.25)),
  );
  return `<path d="${obraz(pas(o, -1, 1), { eps: 0.14 })}" fill="#E7D2A6"/>
    <path d="${obraz(pas(o, -0.35, 0.15), { eps: 0.14 })}" fill="#FFF0CC" opacity="0.65"/>`;
}

/* ——— Ořech ——— */

/** Hlavní větve od vidlice: osa a tloušťka na začátku a na konci */
const KONCETINY: { P: Bod[]; s: [number, number] }[] = [
  /* dlouhá levá — rám přes nebe */
  { P: [[0.69, -0.15], [0.6, -0.29], [0.47, -0.44], [0.31, -0.56], [0.13, -0.66], [-0.07, -0.73], [-0.27, -0.78], [-0.46, -0.8]], s: [0.08, 0.012] },
  /* šikmo vzhůru vlevo */
  { P: [[0.7, -0.17], [0.65, -0.37], [0.6, -0.58], [0.57, -0.8], [0.56, -1.02]], s: [0.075, 0.018] },
  /* vzhůru */
  { P: [[0.745, -0.19], [0.77, -0.41], [0.8, -0.63], [0.84, -0.86]], s: [0.07, 0.018] },
  /* doprava */
  { P: [[0.77, -0.15], [0.87, -0.27], [0.97, -0.37], [1.08, -0.45]], s: [0.064, 0.024] },
  /* nízká, sklání se k domku */
  { P: [[0.67, -0.07], [0.57, -0.13], [0.47, -0.17], [0.38, -0.19], [0.3, -0.2]], s: [0.042, 0.008] },
];
/** Větvičky z dlouhé větve — nesou listí nad oblohou */
const VETVICKY: { P: Bod[]; s: [number, number] }[] = [
  { P: [[0.2, -0.63], [0.16, -0.72], [0.1, -0.8]], s: [0.014, 0.005] },
  { P: [[0.02, -0.7], [-0.04, -0.79], [-0.1, -0.86]], s: [0.012, 0.004] },
  { P: [[-0.17, -0.76], [-0.25, -0.83], [-0.31, -0.88]], s: [0.01, 0.004] },
  { P: [[0.36, -0.53], [0.33, -0.62], [0.28, -0.7]], s: [0.016, 0.005] },
  { P: [[-0.36, -0.79], [-0.42, -0.76], [-0.5, -0.75]], s: [0.008, 0.003] },
];

/**
 * Koruna ve třech plánech z velkých hmot [u, w, rx, ry]: vzadu tmavá,
 * uprostřed hlavní, vpředu menší hmoty na spodním okraji, který kouká ke
 * slunci. Podél dlouhé větve jen tři trsy kousek nad ní, ať je vidět větev
 * i nebe mezi nimi.
 */
type Bod3 = [number, number, number];
type Hmota = [number, number, number, number];
const KORUNA_ZADNI: Hmota[] = [
  [0.64, -0.66, 0.25, 0.2], [0.9, -0.36, 0.15, 0.14], [0.38, -0.85, 0.15, 0.1], [0.1, -0.92, 0.12, 0.07],
  [-0.2, -0.95, 0.1, 0.06], [0.98, -0.12, 0.08, 0.08], [0.52, -0.44, 0.15, 0.12],
];
const KORUNA_STRED: Hmota[] = [
  [0.55, -0.5, 0.15, 0.13], [0.79, -0.41, 0.14, 0.12], [0.68, -0.75, 0.14, 0.11], [0.42, -0.73, 0.11, 0.085],
  [0.19, -0.81, 0.09, 0.06], [-0.06, -0.87, 0.08, 0.05], [-0.31, -0.9, 0.06, 0.04], [0.93, -0.21, 0.09, 0.08],
  [0.37, -0.53, 0.1, 0.08], [0.67, -0.32, 0.12, 0.09],
];
const KORUNA_PREDNI: Hmota[] = [
  [0.46, -0.355, 0.09, 0.075], [0.645, -0.255, 0.1, 0.075], [0.84, -0.185, 0.085, 0.07], [0.3, -0.645, 0.07, 0.05],
  [0.05, -0.765, 0.065, 0.045], [-0.21, -0.83, 0.055, 0.037], [0.345, -0.228, 0.052, 0.036], [-0.43, -0.85, 0.035, 0.025],
];

function orech(p: string): { zadni: string; kmen: string; predni: string } {
  const R = nahoda(5113);
  /* ——— kmen a větve ——— */
  const kmenOsa = osa(
    [[0.716, 0.62], [0.712, 0.5], [0.708, 0.36], [0.71, 0.2], [0.716, 0.04], [0.724, -0.1], [0.73, -0.2]],
    (b) => 0.15 + 0.13 * hladko(0.42, 0.62, b[1]) - 0.012 * hladko(0, -0.2, b[1]),
  );
  const ke = stranaKe(kmenOsa, SLUNCE);
  const vsechny = [...KONCETINY, ...VETVICKY].map((k) => osa(k.P, k.s, 0.85));
  const drevo: string[] = [], svetlo: string[] = [], stin: string[] = [];
  for (const o of vsechny) {
    drevo.push(obraz(pas(o, -1, 1, true), { eps: 0.1 }));
    if (o.s[0] > 0.02) {
      const s = stranaKe(o, SLUNCE);
      svetlo.push(obraz(pas(o, s, s * 0.4, false, 0.12), { eps: 0.1 }));
      stin.push(obraz(pas(o, -s, -s * 0.25, false, 0.12), { eps: 0.1 }));
    }
  }
  /* kořeny do louky */
  [osa([[0.66, 0.54], [0.6, 0.585], [0.53, 0.605]], [0.06, 0.012]), osa([[0.77, 0.54], [0.83, 0.58], [0.91, 0.6]], [0.066, 0.014])]
    .forEach((o) => drevo.push(obraz(pas(o, -1, 1, true), { eps: 0.1 })));
  drevo.push(obraz(pas(kmenOsa, -1, 1), { eps: 0.1 }));
  stin.push(obraz(pas(kmenOsa, -ke, -ke * 0.2), { eps: 0.1 }));
  svetlo.push(obraz(pas(kmenOsa, ke, ke * 0.42), { eps: 0.1 }));
  const kmenLem = obraz(pas(kmenOsa, ke, ke * 0.84), { eps: 0.08 });
  /* brázdy kůry: tři dlouhé vlnité čáry */
  const n = normaly(kmenOsa.b);
  const brazdy = [-0.45, 0.05, 0.5].map((q, j) => obraz(
    kmenOsa.b
      .map((c, i): Bod => {
        const v = q + 0.08 * Math.sin(i * 0.5 + j * 2);
        return [c[0] + n[i][0] * v * kmenOsa.s[i] * 0.5, c[1] + n[i][1] * v * kmenOsa.s[i] * 0.5];
      })
      .filter(([, w]) => w < 0.52 && w > -0.12),
    { uzavrit: false, eps: 0.12 },
  ));
  /* stín stromu přes louku — slunce je za ním, stín jde k divákovi */
  const stinLouka = tvar([[0.62, 0.6], [0.82, 0.6], [1.1, 0.98], [0.84, 1.02]], { eps: 0.15 });

  /* ——— koruna ——— */
  const smer = (u: number, w: number): Bod => {
    const dx = SLUNCE[0] - u, dy = SLUNCE[1] - w, l = Math.hypot(dx, dy);
    return [dx / l, dy / l];
  };
  /*
   * Plán koruny je jedna hmota: nejdřív teplý lem (tytéž hmoty posunuté ke
   * slunci), přes něj hlavní barva — sousední hmoty lem schovají a zbude jen
   * na obrysu, který kouká ke slunci. Uvnitř světlejší kupy jako u mraku.
   * Hmoty jsou velké, a tak se promítají bod po bodu (chomac), ne maticí.
   */
  const plan = (H: Hmota[], seed: number, barvy: { lem: string; tma: string; kupa?: string }, kupy = 0) => {
    const lem: string[] = [], tma: string[] = [], kupa: string[] = [];
    H.forEach(([u, w, rx, ry], i) => {
      const [dx, dy] = smer(u, w);
      const n = Math.round(7 + Math.max(rx, ry) * 46), s = seed + i * 11;
      lem.push(chomac(u + dx * rx * 0.15, w + dy * ry * 0.15, rx * 0.98, ry * 0.98, n, s));
      tma.push(chomac(u, w, rx, ry, n, s));
      for (let k = 0; k < kupy; k++) {
        const q = k ? 0.34 : 0.5, o = k ? -0.25 : 0.12;
        kupa.push(chomac(u + dx * rx * 0.32 + o * rx, w + dy * ry * 0.26 - ry * (0.18 + k * 0.1), rx * q, ry * q * 0.9, Math.max(7, Math.round(n * q * 1.1)), s + 5 + k));
      }
    });
    return `<path d="${lem.join("")}" fill="${barvy.lem}"/><path d="${tma.join("")}" fill="${barvy.tma}"/>${kupa.length ? `<path d="${kupa.join("")}" fill="${barvy.kupa}"/>` : ""}`;
  };
  const vElipse = (u: number, w: number, [cu, cw, rx, ry]: Hmota) => ((u - cu) / rx) ** 2 + ((w - cw) / ry) ** 2 < 1;
  const blizsi = [...KORUNA_STRED, ...KORUNA_PREDNI];
  /* listy ořešáku visí jen z volného okraje přední koruny ke slunci */
  const listy: string[] = [], listySvetle: string[] = [];
  KORUNA_PREDNI.forEach((h, i) => {
    const [u0, w0, rx, ry] = h;
    const [dx, dy] = smer(u0, w0);
    const zaklad = Math.atan2(dy * rx, dx * ry);
    [-0.75, -0.1, 0.55].forEach((d, j) => {
      const a = zaklad + d + (R() - 0.5) * 0.3;
      const u = u0 + Math.cos(a) * rx * 0.9, w = w0 + Math.sin(a) * ry * 0.9;
      const ven = [u + Math.cos(a) * rx * 0.25, w + Math.sin(a) * ry * 0.25] as Bod;
      if (blizsi.some((b) => b !== h && vElipse(ven[0], ven[1], b))) return;
      const smerListu = Math.atan2(Math.sin(a) * ry, Math.cos(a) * rx) + Math.PI / 2 + 0.3;
      const el = `<use href="#${p}-list" transform="${matice(u, w, 0.00056, 0.00056, smerListu)}"/>`;
      ((i + j) % 2 ? listySvetle : listy).push(el);
    });
  });
  return {
    zadni: plan(KORUNA_ZADNI, 300, { lem: "#46553D", tma: "#1A2E2B" }),
    kmen: `<path d="${stinLouka}" fill="#2C4A2C" opacity="0.22"/>
      <path d="${drevo.join("")}" fill="#5E5568"/>
      <path d="${stin.join("")}" fill="#3D3650" opacity="0.6"/>
      <path d="${svetlo.join("")}" fill="#C08E80" opacity="0.8"/>
      <path d="${kmenLem}" fill="#FFD3A4" opacity="0.85"/>
      <path d="${brazdy.join("")}" fill="none" stroke="#3B3446" stroke-width="0.7" opacity="0.45" stroke-linecap="round"/>`,
    predni:
      plan(KORUNA_STRED, 400, { lem: "#8E9052", tma: "#2C4937", kupa: "#34543E" }, 1) +
      plan(KORUNA_PREDNI, 500, { lem: "#CBBB69", tma: "#3B5F41", kupa: "#4A7148" }, 2) +
      `<g fill="#3E6443">${listy.join("")}</g><g fill="#C2B566">${listySvetle.join("")}</g>`,
  };
}

/* ——— Tráva v popředí ——— */

function trava(p: string): string {
  const R = nahoda(9612);
  const trsy: string[] = [];
  const pesinaU = (w: number) => lerp(-0.05, -0.1, (w - 0.45) / 0.5);
  const misto = (u: number, w: number, v: number) => {
    const druh = Math.floor(R() * 3);
    const zrcadlo = R() < 0.5 ? -1 : 1;
    trsy.push(`<use href="#${p}-t${druh}" transform="${matice(u, w, (v / 100) * zrcadlo, v / 100, (R() - 0.5) * 0.2)}"/>`);
  };
  for (let i = 0; i < 40; i++) {
    const w = 0.47 + Math.pow(R(), 0.75) * 0.5;
    let u = -0.98 + R() * 1.96;
    const vedle = 0.07 + (w - 0.45) * 0.28;
    if (Math.abs(u - pesinaU(w)) < vedle) u += u < pesinaU(w) ? -vedle : vedle;
    if (Math.hypot(u, w) > 1.0 || (u > 0.1 && u < 0.4 && Math.abs(w - 0.478) < 0.04)) continue;
    misto(u, w, 0.045 + (w - 0.45) * 0.13);
  }
  /* u paty ořechu */
  for (let i = 0; i < 6; i++) misto(0.52 + i * 0.07 + R() * 0.02, 0.6 + R() * 0.025, 0.055);
  /* pár květin v trávě: vlčí máky a kopretiny po dvou třech */
  const kvety: string[] = [];
  const KVETY: [number, number][] = [[-0.5, 0.6], [0.2, 0.63], [-0.36, 0.76], [0.34, 0.76]];
  KVETY.forEach(([u0, w0], i) => {
    for (let j = 0; j < 3; j++) {
      const u = u0 + (j - 1) * 0.045 + (R() - 0.5) * 0.02, w = w0 + (R() - 0.5) * 0.03;
      const v = 0.06 + (w - 0.45) * 0.14;
      kvety.push(`<use href="#${p}-${(i + j) % 3 ? "mak" : "kopretina"}" transform="${matice(u, w, v / 100, v / 100, (R() - 0.5) * 0.3)}"/>`);
    }
  });
  return `<g>${trsy.join("")}${kvety.join("")}</g>`;
}

/* ——— Lampiony ——— */

function lampiony(p: string): string {
  const A: Bod = [-1.08, 0.282], B: Bod = [0.645, 0.272];
  const prohnuti = 0.205;
  const lano = (t: number): Bod => [lerp(A[0], B[0], t), lerp(A[1], B[1], t) + prohnuti * 4 * t * (1 - t)];
  const body: Bod[] = [];
  for (let t = 0; t <= 1.0001; t += 0.01) {
    const q = lano(t);
    if (Math.hypot(q[0], q[1]) < 0.995) body.push(q);
  }
  const T = [0.165, 0.258, 0.35, 0.44, 0.53, 0.62, 0.71, 0.8, 0.885, 0.955];
  const zare: string[] = [], kusy: string[] = [];
  T.forEach((t, i) => {
    const [u, w] = lano(t);
    const m = 0.0014 + 0.00045 * Math.sin(t * Math.PI);
    const druh = i % 3 === 1 ? "b" : "c";
    /* záře kolem těla lampionu (střed těla je 27 místních jednotek pod lanem) */
    const [x, y] = C([u, w + 27 * m]);
    zare.push(`<circle class="${p}-svit" cx="${f(x)}" cy="${f(y)}" r="${f(64 * m * meritko(u, w + 27 * m))}" fill="url(#${p}-zare)"/>`);
    kusy.push(`<use href="#${p}-lampion-${druh}" transform="${matice(u, w, m, m, Math.sin(i * 1.7) * 0.06)}"/>`);
  });
  return `<g class="${p}-lampiony">${zare.join("")}<path d="${obraz(body, { uzavrit: false, hladce: true, eps: 0.08 })}" fill="none" stroke="#3B2E30" stroke-width="0.6"/>${kusy.join("")}</g>`;
}

/* ═══ Celek ═══ */

function definice(p: string): string {
  const [sx, sy] = C(SLUNCE);
  /* trs trávy (místní jednotky, pata v 0 0, výška 100): tmavá stébla, světlá a teplý lem od slunce */
  const steblo = (bx: number, sir: number, tx: number, ty: number) =>
    `M${bx - sir / 2} 0Q${Math.round(bx + (tx - bx) * 0.2)} ${Math.round(ty * 0.55)} ${tx} ${ty}Q${Math.round(bx + (tx - bx) * 0.38 + sir * 0.3)} ${Math.round(ty * 0.5)} ${bx + sir / 2} 0Z`;
  const TRSY: [number, number, number, number][][] = [
    [[-22, 10, -48, -60], [-10, 11, -20, -100], [2, 11, 6, -84], [12, 10, 32, -94], [22, 9, 50, -56]],
    [[-18, 10, -40, -78], [-6, 11, -4, -100], [6, 10, 22, -80], [16, 9, 44, -62]],
    [[-24, 9, -52, -50], [-12, 10, -26, -88], [0, 11, -2, -70], [10, 10, 18, -100], [22, 9, 46, -74], [-4, 8, 30, -44]],
  ];
  const trsy = TRSY.map((s, k) =>
    `<g id="${p}-t${k}"><path d="${s.filter((_, i) => i % 2 === 0).map((b) => steblo(...b)).join("")}" fill="#3F6B37"/><path d="${s.filter((_, i) => i % 2 === 1).map((b) => steblo(...b)).join("")}" fill="#78A04B"/><path d="${s.slice(1, 3).map(([bx, sir, tx, ty]) => steblo(bx + sir * 0.2, sir * 0.35, tx + 1, ty)).join("")}" fill="#E6D990" opacity="0.8"/></g>`,
  ).join("");
  return [
    `<clipPath id="${p}-disk"><circle r="${SVET_R}"/></clipPath>`,
    `<radialGradient id="${p}-halo" gradientUnits="userSpaceOnUse" cx="${f(sx)}" cy="${f(sy)}" r="150"><stop offset="0" stop-color="#FFF6DE" stop-opacity="0.9"/><stop offset="0.12" stop-color="#FFE2B0" stop-opacity="0.6"/><stop offset="0.35" stop-color="#FDC39C" stop-opacity="0.26"/><stop offset="0.7" stop-color="#F0A0A0" stop-opacity="0.08"/><stop offset="1" stop-color="#E890A0" stop-opacity="0"/></radialGradient>`,
    `<radialGradient id="${p}-korona"><stop offset="0.4" stop-color="#FFF2CF" stop-opacity="0.9"/><stop offset="0.6" stop-color="#FFE0A6" stop-opacity="0.45"/><stop offset="1" stop-color="#FFD08C" stop-opacity="0"/></radialGradient>`,
    `<radialGradient id="${p}-paprsek" gradientUnits="userSpaceOnUse" cx="${f(sx)}" cy="${f(sy)}" r="140"><stop offset="0" stop-color="#FFF1D2" stop-opacity="0.5"/><stop offset="0.45" stop-color="#FFE4C0" stop-opacity="0.16"/><stop offset="1" stop-color="#FFE4C0" stop-opacity="0"/></radialGradient>`,
    `<radialGradient id="${p}-lem" gradientUnits="userSpaceOnUse" cx="${f(sx)}" cy="${f(sy)}" r="160"><stop offset="0" stop-color="#FFF2CE"/><stop offset="0.4" stop-color="#FFDDA8" stop-opacity="0.75"/><stop offset="1" stop-color="#FFD0A0" stop-opacity="0.12"/></radialGradient>`,
    `<radialGradient id="${p}-jas" gradientUnits="userSpaceOnUse" cx="${f(sx)}" cy="${f(sy)}" r="85"><stop offset="0" stop-color="#FFE7BE" stop-opacity="0.55"/><stop offset="0.5" stop-color="#FFD7AA" stop-opacity="0.18"/><stop offset="1" stop-color="#FFD0A0" stop-opacity="0"/></radialGradient>`,
    `<radialGradient id="${p}-zare"><stop offset="0" stop-color="#FFE3A0" stop-opacity="0.95"/><stop offset="0.3" stop-color="#FFB966" stop-opacity="0.5"/><stop offset="0.65" stop-color="#FF9A50" stop-opacity="0.16"/><stop offset="1" stop-color="#FF8A48" stop-opacity="0"/></radialGradient>`,
    `<radialGradient id="${p}-louka" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="${SVET_R}"><stop offset="0.5" stop-color="#B3C46C"/><stop offset="0.66" stop-color="#8DAD58"/><stop offset="0.82" stop-color="#628F47"/><stop offset="1" stop-color="#3F6B38"/></radialGradient>`,
    `<linearGradient id="${p}-pahorek" gradientUnits="userSpaceOnUse" x1="-50" y1="0" x2="100" y2="0"><stop offset="0" stop-color="#C3C979"/><stop offset="0.45" stop-color="#A0B867"/><stop offset="1" stop-color="#789950"/></linearGradient>`,
    `<linearGradient id="${p}-stit" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#B9C5A4"/><stop offset="1" stop-color="#9FAF92"/></linearGradient>`,
    `<radialGradient id="${p}-vineta" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="${SVET_R}"><stop offset="0.72" stop-color="#1A1C4A" stop-opacity="0"/><stop offset="0.9" stop-color="#1A1C4A" stop-opacity="0.14"/><stop offset="1" stop-color="#1A1C4A" stop-opacity="0.42"/></radialGradient>`,
    /* oblaky s rovným spodkem (poloměr 100) */
    ...[0, 1].map((k) => `<path id="${p}-m${k}" d="${chomacVzor(8 + k, 8200 + k, 0.3, 0.64)}"/>`),
    /* srpek měsíce (poloměr 100, svítí doprava) a čtyřcípá hvězda */
    `<path id="${p}-mesic" d="M0 -100A100 100 0 0 1 0 100A46 100 0 0 0 0 -100Z"/>`,
    `<path id="${p}-hvezda" d="M0 -10Q1.2 -1.2 10 0Q1.2 1.2 0 10Q-1.2 1.2 -10 0Q-1.2 -1.2 0 -10Z"/>`,
    `<radialGradient id="${p}-mesicni"><stop offset="0" stop-color="#FFF4DE" stop-opacity="0.5"/><stop offset="0.45" stop-color="#F4E4F0" stop-opacity="0.16"/><stop offset="1" stop-color="#E8DCF0" stop-opacity="0"/></radialGradient>`,
    /* list ořešáku: vřeteno a dva páry lístků, koncový největší (místní jednotky, řapík v 0 0, špička nahoře) */
    `<path id="${p}-list" d="M-1.5 0L1.5 0L1 -70L-1 -70ZM0 -62C10 -66 12 -84 0 -100C-12 -84 -10 -66 0 -62ZM0 -44C8 -54 22 -58 34 -54C26 -42 12 -40 0 -44ZM0 -44C-8 -54 -22 -58 -34 -54C-26 -42 -12 -40 0 -44ZM0 -22C8 -32 20 -36 30 -32C22 -20 10 -18 0 -22ZM0 -22C-8 -32 -20 -36 -30 -32C-22 -20 -10 -18 0 -22Z"/>`,
    trsy,
    /* papírový lampion (místní jednotky, závěs v 0 0, y dolů): červený a krémový */
    ...[["c", "#DD4F35", "#FF8C5C", "#A93A27"], ["b", "#FFE7BE", "#FFF8E4", "#D8A36C"]].map(([k, telo, svit, zebra]) =>
      `<g id="${p}-lampion-${k}"><path d="M0 0V7" stroke="#3A2A2A" stroke-width="1.6"/><rect x="-9" y="6" width="18" height="5" rx="1.5" fill="#3A2A2A"/><ellipse cx="0" cy="27" rx="17" ry="18.5" fill="${telo}"/><ellipse cx="-3" cy="25" rx="10" ry="12.5" fill="${svit}"/><path d="M-15.5 19Q0 22 15.5 19M-17 27Q0 30 17 27M-15.5 35Q0 38 15.5 35" stroke="${zebra}" stroke-width="1.3" fill="none" opacity="0.6"/><rect x="-8" y="43" width="16" height="5" rx="1.5" fill="#3A2A2A"/></g>`),
    /* vlčí mák a kopretina (místní jednotky, pata v 0 0, výška ~100) */
    `<g id="${p}-mak"><path d="M-2 0Q4 -50 -1 -78L2 -78Q8 -50 2 0Z" fill="#4F7A3A"/><circle cx="-7" cy="-84" r="13" fill="#D9452E"/><circle cx="7" cy="-84" r="13" fill="#E55A3C"/><circle cx="0" cy="-92" r="10" fill="#F07050"/><circle cx="0" cy="-83" r="4" fill="#2B2420"/></g>`,
    `<g id="${p}-kopretina"><path d="M-2 0Q-6 -50 -1 -80L2 -80Q-2 -50 2 0Z" fill="#4F7A3A"/><g fill="#FFF9EE"><ellipse cx="0" cy="-86" rx="17" ry="6"/><ellipse cx="0" cy="-86" rx="6" ry="15"/><ellipse cx="0" cy="-86" rx="14" ry="5.5" transform="rotate(45 0 -86)"/><ellipse cx="0" cy="-86" rx="14" ry="5.5" transform="rotate(-45 0 -86)"/></g><circle cx="0" cy="-86" r="5.5" fill="#EDB63A"/></g>`,
    /* pták (rozpětí ~30) */
    `<path id="${p}-ptak" d="M-15 -1Q-8 -9 0 1Q8 -9 15 -1Q8 -4.5 0 4Q-8 -4.5 -15 -1Z"/>`,
    /* lidé a kami (místní jednotky, chodidla v 0 0) */
    `<g id="${p}-clovek"><circle cx="0" cy="-35" r="5"/><path d="M-6 -29Q0 -31.5 6 -29L8.5 -11H4.5L3.5 0H-3.5L-4.5 -11H-8.5Z"/><circle cx="12" cy="-12" r="3.4" fill="#FFC86E"/></g>`,
    `<g id="${p}-dite"><circle cx="0" cy="-23" r="4"/><path d="M-4.5 -18.5Q0 -20 4.5 -18.5L6 -7H3L2.5 0H-2.5L-3 -7H-6Z"/></g>`,
    `<path id="${p}-kami" d="M0 -17C-5 -17 -8 -12 -8 -6C-8 -1 -5 0 0 0C5 0 8 -1 8 -6C8 -12 5 -17 0 -17Z"/>`,
  ].join("");
}

export function svetVKapce(p = "pkw"): { defs: string; svg: string } {
  const nebe = obloha(p);
  const strom = orech(p);
  const [sx, sy] = C(SLUNCE);
  const vrstvy = [
    nebe.svg,
    nocniNebe(p),
    slunce(p),
    kupy(p),
    mraky(p),
    ptaci(p),
    hrebeny(p),
    mlha(-1.1, 1.1, 0.11, 0.022, "#FBD3B6", 0.8, 401),
    kopce(p),
    vesnice(),
    stromky([[-0.9, 0.2, 0.02], [-0.35, 0.165, 0.016], [0.06, 0.17, 0.018], [0.42, 0.18, 0.02], [0.47, 0.19, 0.014]], 7600),
    mlha(-1.1, -0.2, 0.2, 0.024, "#FCE2D4", 1, 402),
    mlha(-1.1, 1.1, 0.236, 0.02, "#FBDCCB", 0.7, 403),
    blizkeKopce(p),
    stromky([[-0.66, 0.29, 0.03], [0.4, 0.268, 0.026], [0.93, 0.29, 0.03], [-0.86, 0.3, 0.024]], 7700),
    `<circle cx="${f(sx)}" cy="${f(sy)}" r="85" fill="url(#${p}-jas)"/>`,
    pahorek(p),
    domek(p),
    lide(p),
    louka(p),
    pesina(),
    strom.zadni,
    strom.kmen,
    strom.predni,
    trava(p),
    lampiony(p),
    `<circle r="${SVET_R + 1}" fill="url(#${p}-vineta)"/>`,
  ];
  return { defs: definice(p) + nebe.defs, svg: `<g clip-path="url(#${p}-disk)">${vrstvy.join("")}</g>` };
}
