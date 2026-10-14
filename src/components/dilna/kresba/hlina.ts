/**
 * Hlína, než jde na kruh. Na desce s plátnem leží vlevo kvádr hlíny
 * napůl vytažený z igelitu (vršek čerstvě uříznutý drátem) a drát na
 * řezání, uprostřed hrouda vyhnětená kiku-neri — sklady se na čele
 * stáčejí do jednoho bodu jako lístky chryzantémy — a vpravo hrouda
 * rozříznutá drátem, v jejíž půlce se schovala bublina vzduchu.
 *
 * Světlo jde zleva shora (okno dílny), stíny padají doprava dolů.
 */
import { P, HLINA, f, hladce, nahoda, smichej, mekkyStin } from "./zaklad";
import type { Bod } from "./zaklad";

/* ——— Pomocníci ——— */

/** Uzavřená hladká cesta (Catmull-Rom dokola) */
function uzavrena(b: Bod[]) {
  const n = b.length;
  let d = `M${f(b[0][0])} ${f(b[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = b[(i - 1 + n) % n];
    const p1 = b[i];
    const p2 = b[(i + 1) % n];
    const p3 = b[(i + 2) % n];
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + " Z";
}

/** Body na uzavřené Catmull-Rom křivce — pro hledání okraje */
function vzorkuj(b: Bod[], k = 12): Bod[] {
  const n = b.length;
  const ven: Bod[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = b[(i - 1 + n) % n];
    const p1 = b[i];
    const p2 = b[(i + 1) % n];
    const p3 = b[(i + 2) % n];
    for (let j = 0; j < k; j++) {
      const t = j / k;
      const t2 = t * t;
      const t3 = t2 * t;
      const s = (q: number) =>
        0.5 * (2 * p1[q] + (-p0[q] + p2[q]) * t + (2 * p0[q] - 5 * p1[q] + 4 * p2[q] - p3[q]) * t2 + (-p0[q] + 3 * p1[q] - 3 * p2[q] + p3[q]) * t3);
      ven.push([s(0), s(1)]);
    }
  }
  return ven;
}

/** Vzdálenost od bodu c k okraji mnohoúhelníku ve směru a */
function kOkraji(poly: Bod[], c: Bod, a: number) {
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  let nej = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    const ex = q[0] - p[0];
    const ey = q[1] - p[1];
    const den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-9) continue;
    const t = ((p[0] - c[0]) * ey - (p[1] - c[1]) * ex) / den;
    const u = ((p[0] - c[0]) * dy - (p[1] - c[1]) * dx) / den;
    if (t > 0 && u >= 0 && u <= 1) nej = Math.min(nej, t);
  }
  return nej;
}

/**
 * Stuha podél čáry — zúžený tah štětce bez obrysu. `vl` a `vp` jsou
 * šířky na levou a pravou stranu (ve směru čáry) v každém bodě.
 */
function stuha(c: Bod[], vl: number[], vp: number[]) {
  const n = c.length;
  const L: Bod[] = [];
  const R: Bod[] = [];
  for (let i = 0; i < n; i++) {
    const a = c[Math.max(0, i - 1)];
    const b = c[Math.min(n - 1, i + 1)];
    let tx = b[0] - a[0];
    let ty = b[1] - a[1];
    const l = Math.hypot(tx, ty) || 1;
    tx /= l;
    ty /= l;
    /* Levá strana ve směru čáry (osa y míří dolů) */
    const nx = ty;
    const ny = -tx;
    L.push([c[i][0] + nx * vl[i], c[i][1] + ny * vl[i]]);
    R.push([c[i][0] - nx * vp[i], c[i][1] - ny * vp[i]]);
  }
  return `M${f(L[0][0])} ${f(L[0][1])}${hladce(L)} L${f(R[n - 1][0])} ${f(R[n - 1][1])}${hladce([...R].reverse())} Z`;
}

/** Lomená uzavřená cesta s celými čísly — na rozmazané vrstvy stačí a je krátká */
const lomena = (b: Bod[]) => `M${b.map((q) => `${Math.round(q[0])} ${Math.round(q[1])}`).join(" ")}Z`;

/** Stuha jako lomená cesta (pro rozmazané vrstvy) */
function stuhaL(c: Bod[], vl: number[], vp: number[]) {
  const n = c.length;
  const L: Bod[] = [];
  const R: Bod[] = [];
  for (let i = 0; i < n; i++) {
    const a = c[Math.max(0, i - 1)];
    const b = c[Math.min(n - 1, i + 1)];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = (b[1] - a[1]) / l;
    const ny = -(b[0] - a[0]) / l;
    L.push([c[i][0] + nx * vl[i], c[i][1] + ny * vl[i]]);
    R.push([c[i][0] - nx * vp[i], c[i][1] - ny * vp[i]]);
  }
  return lomena([...L, ...R.reverse()]);
}

const rozmaz = (id: string, s: number) =>
  `<filter id="${id}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${s}"/></filter>`;

type V3 = [number, number, number];
const norm = (v: V3): V3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
/** Světlo z okna: zleva shora a trochu zepředu (osa y míří dolů, z k divákovi) */
const SVETLO = norm([-0.58, -0.72, 0.55]);

/* ——— Deska s plátnem ——— */

/** Horní plocha desky a její tloušťka */
const DESKA = { x0: 26, x1: 874, yZad: 252, yPred: 560, tl: 24 };

function deska(p: string, defs: string[]) {
  const { x0, x1, yZad, yPred, tl } = DESKA;
  defs.push(
    `<linearGradient id="${p}-dv" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${P.drevoSvetlo}"/><stop offset="0.55" stop-color="${smichej(P.drevoSvetlo, P.drevo, 0.5)}"/><stop offset="1" stop-color="${P.drevo}"/></linearGradient>`,
    `<linearGradient id="${p}-dh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.drevo}"/><stop offset="1" stop-color="${P.drevoStin}"/></linearGradient>`,
    `<linearGradient id="${p}-pl" x1="0" y1="0" x2="1" y2="0.3"><stop offset="0" stop-color="#F3ECDE"/><stop offset="0.5" stop-color="#E9DFCC"/><stop offset="1" stop-color="#DACDB5"/></linearGradient>`,
    `<linearGradient id="${p}-plh" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#DDD1BA"/><stop offset="1" stop-color="#C8B797"/></linearGradient>`,
    mekkyStin(`${p}-ds`, P.inkoust, 0.2),
    rozmaz(`${p}-b8`, 8),
  );
  const s: string[] = [];
  /* Stín desky na papíře */
  s.push(`<ellipse cx="${f((x0 + x1) / 2 + 30)}" cy="${f(yPred + tl + 4)}" rx="${f((x1 - x0) * 0.56)}" ry="20" fill="url(#${p}-ds)"/>`);
  /* Horní plocha a čelo desky */
  s.push(`<path d="M${x0 + 6} ${yZad} H${x1 - 6} Q${x1} ${yZad} ${x1} ${yZad + 6} V${yPred} H${x0} V${yZad + 6} Q${x0} ${yZad} ${x0 + 6} ${yZad} Z" fill="url(#${p}-dv)"/>`);
  s.push(`<path d="M${x0} ${yPred} H${x1} V${yPred + tl - 4} Q${x1} ${yPred + tl} ${x1 - 4} ${yPred + tl} H${x0 + 4} Q${x0} ${yPred + tl} ${x0} ${yPred + tl - 4} Z" fill="url(#${p}-dh)"/>`);
  s.push(`<path d="M${x0 + 3} ${yPred + 1} H${x1 - 3}" stroke="${P.drevoSvetlo}" stroke-width="1.6" opacity="0.6"/>`);
  /* Plátno: leží trochu nakřivo, vpředu přepadá přes hranu desky */
  const hem = `C700 ${yPred + 15} 560 ${yPred + 17} 420 ${yPred + 15} S150 ${yPred + 13} 46 ${yPred + 15}`;
  s.push(
    `<path d="M56 ${yZad + 13} Q60 ${yZad + 11} 66 ${yZad + 11} L842 ${yZad + 6} Q850 ${yZad + 6} 851 ${yZad + 12} L858 ${yPred} L860 ${yPred + 14} ${hem} L44 ${yPred} Z" fill="url(#${p}-pl)"/>`,
  );
  /* Přepadlá část — svislá, světlo na ni padá míň */
  s.push(`<path d="M44 ${yPred} L858 ${yPred} L860 ${yPred + 14} ${hem} Z" fill="url(#${p}-plh)"/>`);
  s.push(`<path d="M46 ${yPred + 0.5} L858 ${yPred - 0.5}" stroke="#FBF7EE" stroke-width="2" opacity="0.8"/>`);
  /* Stará skvrna od hlíny — vzadu vpravo, velká a měkká */
  s.push(`<g filter="url(#${p}-b8)" opacity="0.45"><path d="M630 300 C690 288 762 298 770 322 C776 346 716 352 676 344 C630 334 586 312 630 300 Z" fill="#CDB89D"/></g>`);
  return s.join("");
}

/* ——— Kiku-neri: hrouda jako chryzantéma ——— */

/** Střed chryzantémy (bod, kam se stáčejí sklady) a obrys hroudy */
const KIKU_C: Bod = [430, 440];
const KIKU_OBRYS: Bod[] = [
  [284, 494], [266, 444], [274, 384], [314, 326], [388, 288], [472, 276], [548, 284],
  [608, 306], [648, 346], [665, 404], [656, 458], [626, 492], [556, 514], [456, 524], [352, 518],
];

function kiku(p: string, defs: string[]) {
  const h = HLINA.mokry;
  const C = KIKU_C;
  const okraj = vzorkuj(KIKU_OBRYS, 10);
  const N = 18;
  const rnd = nahoda(4111);
  const zkrut = 0.72;
  const M = 10;
  /* Počáteční úhly skladů s trochou nepravidelnosti */
  const uhly = Array.from({ length: N }, (_, i) => (i / N) * Math.PI * 2 - 2.2 + (rnd() - 0.5) * 0.12);
  const delka = (a: number) => 1 - 0.3 * Math.max(0, Math.cos(a)) ** 1.6;

  /* Rýhy skladů: spirála od středu k okraji, u okraje se klenutím stlačí */
  const ryhy: Bod[][] = uhly.map((u0) => {
    const tw = zkrut * (0.92 + rnd() * 0.16);
    const dl = delka(u0 + tw * 0.7) * (0.98 + rnd() * 0.04);
    const pts: Bod[] = [];
    for (let j = 0; j <= M; j++) {
      const t = j / M;
      const a = u0 + tw * Math.pow(t, 0.8);
      const R = kOkraji(okraj, C, a) * dl * 1.02;
      const r = (R * Math.sin(t * 1.2)) / Math.sin(1.2);
      pts.push([C[0] + Math.cos(a) * r, C[1] + Math.sin(a) * r]);
    }
    return pts;
  });
  const konce = ryhy.map((r) => Math.atan2(r[M][1] - C[1], r[M][0] - C[0]));

  /* Obrys hroudy s vlnkami, kde sklady vycházejí na okraj */
  const obrys: Bod[] = [];
  const K = 200;
  for (let k = 0; k < K; k++) {
    const a = (k / K) * Math.PI * 2;
    let r = kOkraji(okraj, C, a);
    const cela = Math.min(1, Math.max(0, 0.4 - Math.cos(a) * 0.9));
    let zarez = 0;
    for (const e of konce) {
      const d = Math.atan2(Math.sin(a - e), Math.cos(a - e));
      zarez = Math.max(zarez, Math.exp(-((d / 0.05) ** 2)));
    }
    r -= zarez * 5 * cela;
    obrys.push([C[0] + Math.cos(a) * r, C[1] + Math.sin(a) * r]);
  }
  const telo = `M${obrys.map((q) => `${f(q[0])} ${f(q[1])}`).join(" ")}Z`;

  defs.push(
    `<clipPath id="${p}-kc"><path d="${telo}"/></clipPath>`,
    `<radialGradient id="${p}-kt" gradientUnits="userSpaceOnUse" cx="360" cy="330" r="330"><stop offset="0" stop-color="${smichej(h.svetlo, "#D8B596", 0.3)}"/><stop offset="0.35" stop-color="${h.svetlo}"/><stop offset="0.72" stop-color="${h.stred}"/><stop offset="1" stop-color="${smichej(h.stin, h.stred, 0.25)}"/></radialGradient>`,
    `<linearGradient id="${p}-kz" gradientUnits="userSpaceOnUse" x1="480" y1="0" x2="670" y2="0"><stop offset="0" stop-color="${h.stin}" stop-opacity="0"/><stop offset="1" stop-color="${h.stin}" stop-opacity="0.6"/></linearGradient>`,
    `<linearGradient id="${p}-kd" gradientUnits="userSpaceOnUse" x1="0" y1="430" x2="0" y2="524"><stop offset="0" stop-color="#24170F" stop-opacity="0"/><stop offset="1" stop-color="#24170F" stop-opacity="0.5"/></linearGradient>`,
    /* Sklady vpravo vyznívají do hladkého hřbetu */
    `<radialGradient id="${p}-kmg" gradientUnits="userSpaceOnUse" cx="380" cy="440" r="290" gradientTransform="translate(380 440) scale(1 1.15) translate(-380 -440)"><stop offset="0.45" stop-color="#FFFFFF"/><stop offset="0.92" stop-color="#000000"/></radialGradient>`,
    `<mask id="${p}-km" maskUnits="userSpaceOnUse" x="240" y="250" width="450" height="300"><rect x="240" y="250" width="450" height="300" fill="url(#${p}-kmg)"/></mask>`,
    mekkyStin(`${p}-ks`, P.inkoust, 0.45),
    rozmaz(`${p}-b2`, 2),
    rozmaz(`${p}-b14`, 1.4),
    rozmaz(`${p}-b06`, 0.6),
  );

  const s: string[] = [];
  /* Stín na plátně doprava dolů */
  s.push(`<ellipse cx="${C[0] + 74}" cy="${C[1] + 78}" rx="240" ry="38" fill="url(#${p}-ks)"/>`);
  s.push(`<path d="${telo}" fill="url(#${p}-kt)"/>`);

  /* Lístky: každý je oblý hřbet mezi dvěma rýhami, hřeben má blíž k rýze B
     (tam je ret, pod ním sráz). Plochu skládám z pruhů, které jdou po
     lístku i s jeho prohnutím; rozmazání je slije dohromady. */
  const pruhy: string[] = [];
  const stiny: string[] = [];
  const rty: string[] = [];
  /* [od, do, náklon]: záporný náklon = plocha se dívá k rýze A */
  const profil: [number, number, number][] = [
    [0, 0.22, -0.95],
    [0.22, 0.46, -0.5],
    [0.46, 0.68, -0.12],
    [0.68, 0.86, 0.45],
    [0.86, 1, 1.15],
  ];
  const mezi = (A: Bod[], B: Bod[], q: number): Bod[] => A.map((a, j) => [a[0] + (B[j][0] - a[0]) * q, a[1] + (B[j][1] - a[1]) * q]);
  for (let i = 0; i < N; i++) {
    const A = ryhy[i];
    const B = ryhy[(i + 1) % N];
    const t = Math.round(M * 0.55);
    const a = A[t];
    const b = B[t];
    const ul = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const ux = (b[0] - a[0]) / ul;
    const uy = (b[1] - a[1]) / ul;
    /* Klenutí čela v tom místě */
    const mx = (a[0] + b[0]) / 2;
    const my = (a[1] + b[1]) / 2;
    const nd = norm([(mx - C[0]) / 200 - 0.2, (my - C[1]) / 200 - 0.15, 1]);
    const zaklad = dot(nd, SVETLO);
    for (const [q0, q1, k] of profil) {
      const n = norm([nd[0] + ux * k, nd[1] + uy * k, nd[2]]);
      const d = dot(n, SVETLO) - zaklad;
      const op = Math.min(0.62, Math.abs(d) * (d > 0 ? 1.0 : 1.1));
      if (op < 0.03) continue;
      const L0 = mezi(A, B, q0);
      const L1 = mezi(A, B, q1);
      pruhy.push(`<path d="${lomena([...L0, ...L1.reverse()])}" fill="${d > 0 ? "#F4DCC0" : "#2C1409"}" opacity="${f(op)}"/>`);
    }
    /* Ret nad rýhou B: jak moc míří ke světlu */
    const nRet = norm([nd[0] + ux, nd[1] + uy, nd[2]]);
    const kSvetlu = dot(nRet, SVETLO);
    const sir = B.map((_, j) => {
      const tt = j / M;
      return Math.pow(Math.sin(Math.PI * Math.min(1, tt)), 0.6) * Math.min(1, tt * 4);
    });
    /* Rýha a stín, který ret vrhá na začátek dalšího lístku */
    stiny.push(`<path d="${stuhaL(B, sir.map((w) => w * 1.3), sir.map((w) => w * 5.5))}" fill="#27110A" opacity="${f(0.45 + 0.3 * Math.max(0, 1 - kSvetlu))}"/>`);
    /* Mokrý lesk na hraně rtu — jen tam, kam svítí okno */
    if (kSvetlu > 0.5) {
      const kus = B.slice(2, M - 1).map((q): Bod => [q[0] - ux * 3, q[1] - uy * 3]);
      const ws = kus.map((_, j) => 1.3 * Math.sin((Math.PI * (j + 0.5)) / kus.length));
      rty.push(`<path d="${stuha(kus, ws, ws)}" fill="#FFF6EA" opacity="${f(Math.min(0.5, (kSvetlu - 0.45) * 1.1))}"/>`);
    }
  }

  s.push(`<g clip-path="url(#${p}-kc)">`);
  s.push(`<g mask="url(#${p}-km)">`);
  s.push(`<g filter="url(#${p}-b14)">${pruhy.join("")}</g>`);
  s.push(`<g filter="url(#${p}-b2)">${stiny.join("")}</g>`);
  s.push(`<g filter="url(#${p}-b06)">${rty.join("")}</g>`);
  s.push(`</g>`);
  /* Zadní strana vpravo se odvrací od světla, dole tma u plátna */
  s.push(`<rect x="250" y="260" width="430" height="280" fill="url(#${p}-kz)"/>`);
  s.push(`<rect x="250" y="260" width="430" height="280" fill="url(#${p}-kd)"/>`);
  s.push(`</g>`);
  /* Střed: sklady se zavinou do malého důlku */
  s.push(`<ellipse cx="${C[0] + 1.5}" cy="${C[1] + 1.5}" rx="4.5" ry="3.6" fill="#1E120B" opacity="0.4" filter="url(#${p}-b14)"/>`);
  return s.join("");
}

/* ——— Prostor: deska je vidět trochu shora ——— */

/** Pixelů na centimetr */
const MER = 10.5;
/** Jak moc shora se díváme: hloubka se zkrátí na 0,4 */
const SKLON = 0.4;
const SKLON_C = Math.sqrt(1 - SKLON * SKLON);
/** Bod v prostoru v cm: X doprava od středu desky, Y nahoru od plátna, Z dozadu od přední hrany */
const pr = (X: number, Y: number, Z: number): Bod => [450 + X * MER, DESKA.yPred - (Y * SKLON_C + Z * SKLON) * MER];
/** Světlo z okna v prostoru (X doprava, Y nahoru, Z dozadu — k divákovi je −Z) */
const SVETLO3 = norm([-0.62, 0.72, -0.32]);
const svit = (n: V3) => Math.max(0, dot(norm(n), SVETLO3));

/** Konvexní obal bodů (monotónní řetězec) — obrys oblého tělesa */
function obal(body: Bod[]): Bod[] {
  const b = [...body].sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  const x = (o: Bod, a: Bod, c: Bod) => (a[0] - o[0]) * (c[1] - o[1]) - (a[1] - o[1]) * (c[0] - o[0]);
  const dol: Bod[] = [];
  for (const q of b) {
    while (dol.length >= 2 && x(dol[dol.length - 2], dol[dol.length - 1], q) <= 0) dol.pop();
    dol.push(q);
  }
  const hor: Bod[] = [];
  for (let i = b.length - 1; i >= 0; i--) {
    const q = b[i];
    while (hor.length >= 2 && x(hor[hor.length - 2], hor[hor.length - 1], q) <= 0) hor.pop();
    hor.push(q);
  }
  return [...dol.slice(0, -1), ...hor.slice(0, -1)];
}

const presne = (b: Bod[]) => `M${b.map((q) => `${f(q[0])} ${f(q[1])}`).join(" ")}Z`;

/* ——— Kvádr hlíny v igelitu ——— */

/** Kvádr: střed (cm), natočení, šířka, hloubka, výška */
const KVADR = { X: -28.5, Z: 37, psi: -0.36, a: 17, b: 11.5, c: 25.5 };

function kvadr(p: string, defs: string[]) {
  const h = HLINA.mokry;
  const { X: Bx, Z: Bz, psi, a, b, c } = KVADR;
  const cs = Math.cos(psi);
  const sn = Math.sin(psi);
  const roh = (lx: number, y: number, lz: number) => pr(Bx + lx * cs - lz * sn, y, Bz + lx * sn + lz * cs);
  /* Hrany jsou oblé: plochy jsou o kousek menší a mezi nimi je zaoblení */
  const o = 0.55;
  const FL0 = roh(-a / 2, 0, -b / 2);
  const FR0 = roh(a / 2 - o, 0, -b / 2);
  const FRb0 = roh(a / 2, 0, -b / 2 + o);
  const BR0 = roh(a / 2, 0, b / 2);
  const FL1 = roh(-a / 2, c - o, -b / 2);
  const FR1 = roh(a / 2 - o, c - o, -b / 2);
  const FRb1 = roh(a / 2, c - o, -b / 2 + o);
  const BR1 = roh(a / 2, c - o, b / 2);
  /* Vršek */
  const T = [roh(-a / 2 + o * 0.4, c, -b / 2 + o), roh(a / 2 - o, c, -b / 2 + o), roh(a / 2 - o, c, b / 2 - o * 0.3), roh(-a / 2 + o * 0.4, c, b / 2 - o * 0.3)];

  /* Světlo na stěnách: líc míří doleva dopředu, bok doprava dopředu */
  const lic = svit([sn, 0, -cs]);
  const bok = svit([cs, 0, sn]);
  const tonem = (k: number) => (k > 0.5 ? smichej(h.stred, h.svetlo, Math.min(1, (k - 0.5) * 2.2)) : smichej(h.stin, h.stred, k * 2));
  const licT = tonem(lic);
  const bokT = tonem(bok + 0.1);
  defs.push(
    `<linearGradient id="${p}-ql" gradientUnits="userSpaceOnUse" x1="${f(FL1[0])}" y1="${f(FL1[1])}" x2="${f(FR0[0])}" y2="${f(FR0[1])}"><stop offset="0" stop-color="${smichej(licT, "#FFFFFF", 0.08)}"/><stop offset="0.6" stop-color="${licT}"/><stop offset="1" stop-color="${smichej(licT, h.stin, 0.3)}"/></linearGradient>`,
    `<linearGradient id="${p}-qb" gradientUnits="userSpaceOnUse" x1="0" y1="${f(FRb1[1])}" x2="0" y2="${f(BR0[1])}"><stop offset="0" stop-color="${bokT}"/><stop offset="1" stop-color="${smichej(bokT, "#1E120B", 0.28)}"/></linearGradient>`,
    `<linearGradient id="${p}-qv" gradientUnits="userSpaceOnUse" x1="${f(T[0][0])}" y1="${f(T[0][1])}" x2="${f(T[2][0])}" y2="${f(T[2][1])}"><stop offset="0" stop-color="${smichej(h.svetlo, "#E6C9AC", 0.4)}"/><stop offset="1" stop-color="${smichej(h.svetlo, h.stred, 0.3)}"/></linearGradient>`,
    `<linearGradient id="${p}-qr" gradientUnits="userSpaceOnUse" x1="${f(FR1[0])}" y1="0" x2="${f(FRb1[0])}" y2="0"><stop offset="0" stop-color="${smichej(licT, h.stin, 0.2)}"/><stop offset="1" stop-color="${bokT}"/></linearGradient>`,
    `<linearGradient id="${p}-ig" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.34"/><stop offset="0.6" stop-color="#F2F5F6" stop-opacity="0.24"/><stop offset="1" stop-color="#E6ECEE" stop-opacity="0.4"/></linearGradient>`,
    mekkyStin(`${p}-qs`, P.inkoust, 0.4),
    rozmaz(`${p}-qb1`, 1.1),
    rozmaz(`${p}-qb3`, 2.6),
  );

  const s: string[] = [];
  /* Stín kvádru doprava dozadu po plátně */
  const st = pr(Bx + 6, 0, Bz + 2);
  s.push(`<ellipse cx="${f(st[0])}" cy="${f(st[1])}" rx="140" ry="32" fill="url(#${p}-qs)"/>`);
  /* Celý obrys jedním tahem — kulaté rohy dělá tah se zaoblenými spoji */
  const obrys = presne([FL0, FR0, FRb0, BR0, BR1, T[2], T[3], T[0], FL1]);
  s.push(`<path d="${obrys}" fill="${licT}" stroke="${licT}" stroke-width="3" stroke-linejoin="round"/>`);
  /* Líc, zaoblená svislá hrana, bok */
  s.push(`<path d="${presne([FL0, FR0, FR1, FL1])}" fill="url(#${p}-ql)" stroke="url(#${p}-ql)" stroke-width="2" stroke-linejoin="round"/>`);
  s.push(`<path d="${presne([FR0, FRb0, FRb1, FR1])}" fill="url(#${p}-qr)"/>`);
  s.push(`<path d="${presne([FRb0, BR0, BR1, FRb1])}" fill="url(#${p}-qb)" stroke="url(#${p}-qb)" stroke-width="2" stroke-linejoin="round"/>`);
  /* Zaoblená horní hrana: pruh mezi lícem a vrškem chytá světlo */
  s.push(`<path d="${presne([FL1, FR1, FRb1, BR1, T[2], T[1], T[0]])}" fill="${smichej(h.svetlo, "#E9CDB0", 0.5)}" stroke="${smichej(h.svetlo, "#E9CDB0", 0.5)}" stroke-width="2" stroke-linejoin="round"/>`);
  s.push(`<path d="${presne(T)}" fill="url(#${p}-qv)"/>`);
  /* Měkké světlo na levé svislé hraně a stín na pravé */
  s.push(`<path d="M${f(FL1[0] + 2)} ${f(FL1[1] + 4)} L${f(FL0[0] + 2)} ${f(FL0[1] - 4)}" stroke="#F3DBC2" stroke-width="3" stroke-linecap="round" opacity="0.4" filter="url(#${p}-qb1)"/>`);

  /* Stopy po drátu na vršku: drát šel zezadu dopředu a prohnul se,
     takže zanechal řadu jemných obloučků napříč */
  const rnd = nahoda(707);
  for (let i = 0; i < 8; i++) {
    const lz0 = -b / 2 + 1.6 + i * ((b - 3) / 7) + (rnd() - 0.5) * 0.4;
    /* Oblouček je parabola — v rovnoběžném promítání zůstane parabolou,
       takže stačí jedna kvadratická Bézierova křivka */
    const lx = a / 2 - 0.9;
    const kraj = 0.8 * (1 - ((2 * lx) / a) ** 2);
    const A = roh(-lx, c, lz0 + kraj);
    const B = roh(lx, c, lz0 + kraj);
    const S = roh(0, c, lz0 + 0.8);
    const d = `M${f(A[0])} ${f(A[1])} Q${f(2 * S[0] - (A[0] + B[0]) / 2)} ${f(2 * S[1] - (A[1] + B[1]) / 2)} ${f(B[0])} ${f(B[1])}`;
    s.push(`<path d="${d}" stroke="${h.stin}" stroke-width="0.9" fill="none" opacity="${f(0.15 + rnd() * 0.08)}"/>`);
    s.push(`<path d="${d}" stroke="#FFF1E0" stroke-width="0.8" fill="none" opacity="${f(0.26 + rnd() * 0.12)}" transform="translate(0 1.1)"/>`);
  }
  /* Saténový lesk čerstvého řezu */
  s.push(`<path d="M${f(T[0][0] + 14)} ${f(T[0][1] + 4)} L${f(T[1][0] - 30)} ${f(T[1][1] + 3)}" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" opacity="0.16" filter="url(#${p}-qb3)"/>`);

  /* ——— Igelit: shrnutý dolů a srolovaný do měkkého valu ——— */
  const val: Bod[] = [];
  const pata: Bod[] = [];
  const kolem = (t: number): [number, number, number, number] => {
    /* t 0..1: z levého předního rohu přes pravý přední roh k pravému zadnímu */
    if (t < 0.6) {
      const k = t / 0.6;
      return [-a / 2 + k * a, -b / 2, 0, -1];
    }
    const k = (t - 0.6) / 0.4;
    return [a / 2, -b / 2 + k * b, 1, 0];
  };
  const M = 20;
  for (let i = 0; i <= M; i++) {
    const t = i / M;
    const [lx, lz, nx, nz] = kolem(t);
    /* Roh kvádru: val se kolem něj ohne */
    const rohem = Math.exp(-(((t - 0.6) / 0.06) ** 2));
    const y = 7.6 + 0.9 * Math.sin(t * 7 + 0.4) + 0.4 * Math.sin(t * 17);
    const vol = 1.1 + 0.35 * Math.sin(t * 9) + rohem * 0.5;
    const ox = nx * vol + (rohem * 0.6) - (t < 0.03 ? 0.4 : 0);
    const oz = nz * vol - rohem * 0.6;
    val.push(roh(lx + ox, y, lz + oz));
    const vol2 = 1.9 + 0.7 * Math.sin(t * 8 + 1.1) + rohem * 0.8;
    pata.push(roh(lx + nx * vol2 + rohem * 0.8 - (t < 0.03 ? 1.4 : 0), 0.1, lz + nz * vol2 - rohem * 0.8));
  }
  const valD = `M${f(val[0][0])} ${f(val[0][1])}${hladce(val)}`;
  const igelit = `${valD} L${f(pata[M][0])} ${f(pata[M][1])}${hladce([...pata].reverse())} Z`;
  s.push(`<path d="${igelit}" fill="url(#${p}-ig)"/>`);
  /* Záhyby spodní části: od valu k patě, mírně šikmo */
  const rz = nahoda(919);
  const zStin: string[] = [];
  const zLesk: string[] = [];
  for (let i = 0; i < 8; i++) {
    const iu = Math.min(M, Math.max(0, Math.round((0.06 + i * 0.12 + (rz() - 0.5) * 0.04) * M)));
    const hor = val[iu];
    const dol = pata[Math.min(M, Math.max(0, iu + (rz() > 0.5 ? 1 : -1)))];
    const str: Bod = [(hor[0] + dol[0]) / 2 + (i % 2 ? 7 : -7) + (rz() - 0.5) * 4, (hor[1] + dol[1]) / 2];
    const d = `M${f(hor[0])} ${f(hor[1] + 6)} Q${f(str[0])} ${f(str[1])} ${f(dol[0])} ${f(dol[1] - 2)}`;
    zStin.push(`<path d="${d}" stroke="#6F7C84" stroke-width="${f(3 + rz() * 2)}" fill="none" opacity="0.12" transform="translate(3 0)"/>`);
    if (i % 2 === 0) zLesk.push(`<path d="${d}" stroke="#FFFFFF" stroke-width="${f(0.9 + rz() * 0.8)}" fill="none" opacity="${f(0.4 + rz() * 0.25)}" stroke-linecap="round"/>`);
  }
  s.push(`<g filter="url(#${p}-qb1)">${zStin.join("")}</g>`, zLesk.join(""));
  /* Pata pytle na plátně */
  s.push(`<path d="M${f(pata[0][0])} ${f(pata[0][1])}${hladce(pata)}" stroke="#FFFFFF" stroke-width="1.3" fill="none" opacity="0.7"/>`);
  /* Srolovaný val: zmačkaná fólie v několika vrstvách — průsvitné laloky
     přes sebe, nahoře lesk, dole chladný stín */
  s.push(`<path d="${valD}" stroke="#55626A" stroke-width="8" fill="none" opacity="0.13" stroke-linecap="round" transform="translate(1 7)" filter="url(#${p}-qb3)"/>`);
  const laloky: string[] = [];
  const lesky: string[] = [];
  for (let i = 0; i < M * 2; i++) {
    const q0 = val[i >> 1];
    const q1 = val[(i >> 1) + 1];
    const k = (i % 2) * 0.5 + 0.25;
    const mx = q0[0] + (q1[0] - q0[0]) * k + (rz() - 0.5) * 3;
    const my = q0[1] + (q1[1] - q0[1]) * k + (rz() - 0.5) * 3 + 1;
    const uhel = (Math.atan2(q1[1] - q0[1], q1[0] - q0[0]) * 180) / Math.PI + (rz() - 0.5) * 22;
    const dl = Math.min(17, Math.hypot(q1[0] - q0[0], q1[1] - q0[1]) * (0.6 + rz() * 0.45));
    const vy = 5 + rz() * 3.6;
    laloky.push(`<ellipse cx="${f(mx)}" cy="${f(my)}" rx="${f(dl)}" ry="${f(vy)}" transform="rotate(${f(uhel)} ${f(mx)} ${f(my)})" fill="#FFFFFF" opacity="${f(0.2 + rz() * 0.14)}"/>`);
    if (rz() > 0.35) {
      const r = (uhel * Math.PI) / 180;
      const ax = Math.cos(r) * dl * 0.7;
      const ay = Math.sin(r) * dl * 0.7;
      lesky.push(`<path d="M${f(mx - ax)} ${f(my - ay - vy * 0.55)} Q${f(mx)} ${f(my - vy * 1.05)} ${f(mx + ax)} ${f(my + ay - vy * 0.5)}" stroke="#FFFFFF" stroke-width="${f(1 + rz() * 0.8)}" fill="none" opacity="${f(0.6 + rz() * 0.35)}" stroke-linecap="round"/>`);
    }
    if (rz() > 0.55) {
      lesky.push(`<path d="M${f(mx - dl * 0.5)} ${f(my + vy * 0.7)} Q${f(mx)} ${f(my + vy * 1.1)} ${f(mx + dl * 0.6)} ${f(my + vy * 0.6)}" stroke="#7F8C93" stroke-width="1.1" fill="none" opacity="0.3" stroke-linecap="round"/>`);
    }
  }
  s.push(laloky.join(""), lesky.join(""));
  return s.join("");
}

/* ——— Drát na řezání hlíny se dvěma kolíky ——— */

function drat(p: string, defs: string[]) {
  /* Drát leží na plátně ve volné smyčce */
  const draha: Bod[] = [
    [-39.5, 7.5], [-34.5, 4], [-28, 2.8], [-22.5, 4.4], [-20.6, 8.4], [-23, 11.6], [-26.6, 10.2], [-25.4, 6.6], [-21, 4.3], [-16.5, 3.4],
  ].map(([X, Z]) => pr(X, 0.12, Z));
  const d = `M${f(draha[0][0])} ${f(draha[0][1])}${hladce(draha)}`;
  const s: string[] = [];
  s.push(`<path d="${d}" stroke="#2B2420" stroke-width="2.2" fill="none" opacity="0.14" transform="translate(2 2.5)"/>`);
  s.push(`<path d="${d}" stroke="${P.ocelStin}" stroke-width="1.6" fill="none"/>`);
  s.push(`<path d="${d}" stroke="${P.ocelSvetlo}" stroke-width="0.6" fill="none" transform="translate(-0.4 -0.5)"/>`);

  /* Kolíky: soustružené dřevo, leží napříč, drát vede středem */
  const koliky = [
    { X: -39.5, Z: 7.5, u: 1.25 },
    { X: -16.5, Z: 3.4, u: 1.95 },
  ];
  koliky.forEach((k, i) => {
    const r = 1;
    const dl = 3.6;
    const A = pr(k.X - Math.cos(k.u) * dl, r, k.Z - Math.sin(k.u) * dl);
    const B = pr(k.X + Math.cos(k.u) * dl, r, k.Z + Math.sin(k.u) * dl);
    const ax = B[0] - A[0];
    const ay = B[1] - A[1];
    const al = Math.hypot(ax, ay);
    /* Kolmice v obraze, nahoru doleva ke světlu */
    let nx = -ay / al;
    let ny = ax / al;
    if (nx + ny > 0) {
      nx = -nx;
      ny = -ny;
    }
    const tl = r * MER;
    const sx = (A[0] + B[0]) / 2;
    const sy = (A[1] + B[1]) / 2;
    defs.push(
      `<linearGradient id="${p}-kol${i}" gradientUnits="userSpaceOnUse" x1="${f(sx + nx * tl)}" y1="${f(sy + ny * tl)}" x2="${f(sx - nx * tl)}" y2="${f(sy - ny * tl)}"><stop offset="0" stop-color="${P.drevoStin}"/><stop offset="0.12" stop-color="${P.drevoSvetlo}"/><stop offset="0.35" stop-color="#DDB78A"/><stop offset="0.7" stop-color="${P.drevo}"/><stop offset="1" stop-color="${P.drevoStin}"/></linearGradient>`,
    );
    s.push(`<path d="M${f(A[0])} ${f(A[1])} L${f(B[0])} ${f(B[1])}" stroke="#2B2420" stroke-width="${f(tl * 2)}" stroke-linecap="round" opacity="0.16" transform="translate(4 5)" filter="url(#${p}-qb1)"/>`);
    s.push(`<path d="M${f(A[0])} ${f(A[1])} L${f(B[0])} ${f(B[1])}" stroke="url(#${p}-kol${i})" stroke-width="${f(tl * 2)}" stroke-linecap="round"/>`);
    /* Čelo kolíku blíž k divákovi — letokruhy naznačené jedním kroužkem */
    const E = A[1] > B[1] ? A : B;
    const ang = (Math.atan2(ay, ax) * 180) / Math.PI;
    s.push(`<ellipse cx="${f(E[0])}" cy="${f(E[1])}" rx="${f(tl * 0.36)}" ry="${f(tl * 0.98)}" transform="rotate(${f(ang)} ${f(E[0])} ${f(E[1])})" fill="#E2C49C"/>`);
    s.push(`<ellipse cx="${f(E[0])}" cy="${f(E[1])}" rx="${f(tl * 0.16)}" ry="${f(tl * 0.45)}" transform="rotate(${f(ang)} ${f(E[0])} ${f(E[1])})" fill="none" stroke="${P.drevo}" stroke-width="0.8" opacity="0.5"/>`);
    /* Drát se kolem kolíku jednou otočí */
    const ov = `M${f(sx - ax * 0.07 + nx * tl)} ${f(sy - ay * 0.07 + ny * tl)} L${f(sx + ax * 0.07 - nx * tl)} ${f(sy + ay * 0.07 - ny * tl)}`;
    s.push(`<path d="${ov}" stroke="${P.ocelStin}" stroke-width="1.5"/>`);
    s.push(`<path d="${ov}" stroke="${P.ocelSvetlo}" stroke-width="0.6" transform="translate(-0.4 -0.4)"/>`);
  });
  return s.join("");
}

/* ——— Hrouda rozříznutá drátem — v jedné půlce bublina ——— */

/**
 * Hrouda (poloměr a výška v cm) a její dvě půlky: úhel, o který je řez
 * natočený k divákovi, a kde leží střed rovné hrany řezu. Pravá půlka
 * (s bublinou) ukazuje řez skoro zpředu, levá leží za ní bokem.
 */
const PULKY = { a: 6.8, c: 8.6, L: { gam: 0.6, X: 25.6, Z: 43 }, R: { gam: 1.1, X: 31.6, Z: 35 } };

/** Půlka hroudy: −1 levá, 1 pravá. Řez leží v rovině x = 0 jejích souřadnic. */
function pulka(strana: -1 | 1) {
  const q = strana < 0 ? PULKY.L : PULKY.R;
  const th = strana * q.gam;
  const ct = Math.cos(th);
  const st = Math.sin(th);
  const bod = (x: number, y: number, z: number) => pr(q.X + x * ct - z * st, y, q.Z + x * st + z * ct);
  return { ct, st, bod };
}

/** Bublina v řezu pravé půlky (u — vodorovně v řezu, v — výška v cm) */
const BUB = { u: -0.5, v: 3.5, ru: 1.6, rv: 1.1 };
const bublinaObrys = (): Bod[] => {
  const { bod } = pulka(1);
  return Array.from({ length: 28 }, (_, j) => {
    const w = (j / 28) * Math.PI * 2;
    return bod(0, BUB.v + Math.sin(w) * BUB.rv, BUB.u + Math.cos(w) * BUB.ru);
  });
};
const BUBLINA = (() => {
  const d = bublinaObrys();
  const xs = d.map((b) => b[0]);
  const ys = d.map((b) => b[1]);
  return {
    x: (Math.min(...xs) + Math.max(...xs)) / 2,
    y: (Math.min(...ys) + Math.max(...ys)) / 2,
    rx: (Math.max(...xs) - Math.min(...xs)) / 2,
    ry: (Math.max(...ys) - Math.min(...ys)) / 2,
  };
})();

function pulky(p: string, defs: string[]) {
  const h = HLINA.mokry;
  const { a, c } = PULKY;
  const s: string[] = [];
  defs.push(mekkyStin(`${p}-ps`, P.inkoust, 0.42));
  /* Stín obou půlek po plátně */
  for (const q of [PULKY.L, PULKY.R]) {
    const st = pr(q.X + 1.2, 0, q.Z + 1.5);
    s.push(`<ellipse cx="${f(st[0])}" cy="${f(st[1])}" rx="74" ry="19" fill="url(#${p}-ps)"/>`);
  }

  ([-1, 1] as const).forEach((strana, i) => {
    const q = pulka(strana);
    /* Kopule: jen polovina na své straně */
    const body: Bod[] = [];
    for (let k = 0; k <= 10; k++) {
      const ps = (k / 10) * (Math.PI / 2);
      for (let j = 0; j <= 16; j++) {
        const om = (strana < 0 ? Math.PI / 2 : -Math.PI / 2) + (j / 16) * Math.PI;
        body.push(q.bod(a * Math.sin(ps) * Math.cos(om), c * Math.cos(ps), a * Math.sin(ps) * Math.sin(om)));
      }
    }
    const obrys = obal(body);
    /* Řez: půlelipsa v rovině x = 0 */
    const rez: Bod[] = [];
    for (let j = 0; j <= 24; j++) {
      const u = -a + (j / 24) * 2 * a;
      rez.push(q.bod(0, c * Math.sqrt(Math.max(0, 1 - (u / a) ** 2)), u));
    }
    /* Normála řezu ve světě */
    const sv = svit([-strana * q.ct, 0, -strana * q.st]);
    const id = `${p}-p${i}`;
    const tonem = sv > 0.4 ? smichej(h.stred, "#CDA586", Math.min(1, (sv - 0.4) * 1.6)) : smichej(h.stin, h.stred, 0.45 + sv);
    defs.push(
      `<radialGradient id="${id}k" cx="${i === 0 ? 0.32 : 0.2}" cy="0.22" r="0.95"><stop offset="0" stop-color="${smichej(h.svetlo, "#D8B596", 0.25)}"/><stop offset="0.45" stop-color="${h.svetlo}"/><stop offset="0.8" stop-color="${h.stred}"/><stop offset="1" stop-color="${h.stin}"/></radialGradient>`,
      `<linearGradient id="${id}r" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="${smichej(tonem, "#FFFFFF", 0.08)}"/><stop offset="1" stop-color="${smichej(tonem, h.stin, 0.25)}"/></linearGradient>`,
    );
    s.push(`<path d="${presne(obrys)}" fill="url(#${id}k)"/>`);
    s.push(`<path d="${presne(rez)}" fill="url(#${id}r)"/>`);
    /* Stopy po drátu: vodorovné obloučky přes řez */
    const rnd = nahoda(300 + i * 17);
    for (let k = 1; k <= 6; k++) {
      const y0 = (k / 7) * c * 0.95;
      const sir = a * Math.sqrt(Math.max(0, 1 - (y0 / c) ** 2)) * 0.92;
      const A = q.bod(0, y0, -sir);
      const B = q.bod(0, y0, sir);
      const S = q.bod(0, y0 + 0.25, 0);
      const d = `M${f(A[0])} ${f(A[1])} Q${f(2 * S[0] - (A[0] + B[0]) / 2)} ${f(2 * S[1] - (A[1] + B[1]) / 2)} ${f(B[0])} ${f(B[1])}`;
      s.push(`<path d="${d}" stroke="${h.stin}" stroke-width="0.8" fill="none" opacity="${f(0.18 + rnd() * 0.08)}"/>`);
      s.push(`<path d="${d}" stroke="#FFF1E0" stroke-width="0.7" fill="none" opacity="${f(0.2 + rnd() * 0.1)}" transform="translate(0 1)"/>`);
    }
    /* Hrana řezu — tenké světlo nahoře */
    const hor = rez.slice(3, 22);
    s.push(`<path d="M${f(hor[0][0])} ${f(hor[0][1])}${hladce(hor)}" stroke="#F3D9BE" stroke-width="1.6" fill="none" opacity="${f(0.25 + sv * 0.5)}"/>`);
    if (strana === 1) {
      /* Bublina: oválná dutina v řezu, uvnitř tma, spodní hrana chytá světlo */
      defs.push(
        `<radialGradient id="${p}-bub" cx="0.62" cy="0.7" r="0.75"><stop offset="0" stop-color="#7A5B47"/><stop offset="0.5" stop-color="#3A271C"/><stop offset="1" stop-color="#1B100A"/></radialGradient>`,
      );
      s.push(`<path d="${uzavrena(bublinaObrys())}" fill="url(#${p}-bub)"/>`);
      const B = BUBLINA;
      s.push(`<path d="M${f(B.x - B.rx * 0.75)} ${f(B.y + B.ry * 0.62)} Q${f(B.x)} ${f(B.y + B.ry * 1.18)} ${f(B.x + B.rx * 0.85)} ${f(B.y + B.ry * 0.5)}" stroke="#F6DDC2" stroke-width="1.6" fill="none" opacity="0.75" stroke-linecap="round"/>`);
      s.push(`<ellipse cx="${f(B.x + B.rx * 0.3)}" cy="${f(B.y + B.ry * 0.38)}" rx="${f(B.rx * 0.22)}" ry="${f(B.ry * 0.14)}" fill="#FFFFFF" opacity="0.35"/>`);
    }
  });
  /* Rumělkový čárkovaný kroužek kolem bubliny */
  const B = BUBLINA;
  s.push(`<circle class="${p}-kruh" cx="${f(B.x)}" cy="${f(B.y)}" r="${f(Math.max(B.rx, B.ry) + 15)}" fill="none" stroke="${P.rumelka}" stroke-width="2.4" stroke-dasharray="7 6" stroke-linecap="round"/>`);
  return s.join("");
}

/* ——— Celá kresba ——— */

/** Kiku-neri je v kresbě trochu zmenšená kolem paty, ať se vejde mezi kvádr a půlky */
const KIKU_MER = 1;
/** Pata hroudy v jejím vlastním výkresu a kam ji v kresbě posadit */
const KIKU_PATA: Bod = [462, 522];
const KIKU_KAM: Bod = [450, 516];

export function hlinaSvg(p = "dhl"): string {
  const defs: string[] = [];
  const telo: string[] = [];
  telo.push(deska(p, defs));
  telo.push(kvadr(p, defs));
  telo.push(drat(p, defs));
  telo.push(pulky(p, defs));
  telo.push(
    `<g transform="translate(${KIKU_KAM[0]} ${KIKU_KAM[1]}) scale(${KIKU_MER}) translate(${-KIKU_PATA[0]} ${-KIKU_PATA[1]})">${kiku(p, defs)}</g>`,
  );
  return `<svg viewBox="0 0 900 620" aria-hidden="true"><defs>${defs.join("")}</defs>${telo.join("")}</svg>`;
}

/**
 * Místo pro Bublinku: vykukuje z bubliny v řezu pravé půlky. x je střed
 * bubliny, y její spodní okraj (tam Bublinka „stojí“), w šířka plátna.
 */
export const MISTA_HLINA = {
  bublinka: { x: Math.round(BUBLINA.x), y: Math.round(BUBLINA.y + BUBLINA.ry), w: 80 },
};

/* ——— Tři druhy hlíny po výpalu ——— */

interface Desticka {
  /** Střed destičky — po třetinách šířky, ať pod ni stránka dá popisek */
  x: number;
  /** Velikost proti hrnčířské hlíně: hutnější hmoty se v peci smrsknou víc */
  mer: number;
  /** Tloušťka v px — porcelán je nejtenčí */
  tl: number;
  svetlo: string;
  stred: string;
  stin: string;
  /** Hrana a stěny dírky */
  hrana: string;
  hranaStin: string;
  /** 0 = matná, 1 = pololesk */
  lesk: number;
}

const DESTICKY: Desticka[] = [
  /* Hrnčířská hlína: cihlová, matná, pórovitá */
  { x: 150, mer: 1, tl: 11, svetlo: "#D9895A", stred: "#C2683C", stin: "#94461F", hrana: "#CF7748", hranaStin: "#8A3F1B", lesk: 0 },
  /* Kamenina: teplá šedohnědá, hutná, nepatrně pololesklá */
  { x: 450, mer: 0.955, tl: 8, svetlo: "#B9A893", stred: "#9C8A76", stin: "#6C5D4E", hrana: "#A8967F", hranaStin: "#5E5044", lesk: 0.45 },
  /* Porcelán: bílý, tenký — na hraně prosvítá teplým světlem */
  { x: 750, mer: 0.93, tl: 5, svetlo: "#FFFFFF", stred: "#F1EFEA", stin: "#CFCAC0", hrana: "#FFF4E2", hranaStin: "#EFD3A6", lesk: 0.3 },
];

export function hlinyDruhy(p = "dhl"): string {
  const zem = 246;
  const defs: string[] = [rozmaz(`${p}-db2`, 2), rozmaz(`${p}-db5`, 5)];
  const s: string[] = [];
  DESTICKY.forEach((d, i) => {
    const id = `${p}-d${i}`;
    const w = 138 * d.mer;
    const h = 196 * d.mer;
    /* Tloušťka jde šikmo dozadu doprava — vidíme horní a pravou hranu */
    const ox = d.tl * 0.8;
    const oy = -d.tl * 0.55;
    const x0 = d.x - w / 2 - ox / 2;
    const y0 = zem - h;
    const r = 10 * d.mer;
    const dx = d.x - ox / 2;
    const dy = y0 + 25 * d.mer;
    const dr = 7.5 * d.mer;
    /* Líc s dírkou na pověšení (evenodd — dírkou je vidět papír) */
    const tvar = (sx: number, sy: number) =>
      `M${f(x0 + sx + r)} ${f(y0 + sy)} H${f(x0 + sx + w - r)} A${f(r)} ${f(r)} 0 0 1 ${f(x0 + sx + w)} ${f(y0 + sy + r)} V${f(y0 + sy + h - r)} A${f(r)} ${f(r)} 0 0 1 ${f(x0 + sx + w - r)} ${f(y0 + sy + h)} H${f(x0 + sx + r)} A${f(r)} ${f(r)} 0 0 1 ${f(x0 + sx)} ${f(y0 + sy + h - r)} V${f(y0 + sy + r)} A${f(r)} ${f(r)} 0 0 1 ${f(x0 + sx + r)} ${f(y0 + sy)} Z` +
      ` M${f(dx + sx + dr)} ${f(dy + sy)} A${f(dr)} ${f(dr)} 0 1 0 ${f(dx + sx - dr)} ${f(dy + sy)} A${f(dr)} ${f(dr)} 0 1 0 ${f(dx + sx + dr)} ${f(dy + sy)} Z`;

    defs.push(
      `<linearGradient id="${id}l" x1="0" y1="0" x2="0.9" y2="1"><stop offset="0" stop-color="${d.svetlo}"/><stop offset="0.55" stop-color="${d.stred}"/><stop offset="1" stop-color="${smichej(d.stred, d.stin, 0.6)}"/></linearGradient>`,
      `<linearGradient id="${id}h" gradientUnits="userSpaceOnUse" x1="${f(x0)}" y1="${f(y0)}" x2="${f(x0 + w + ox)}" y2="${f(zem)}"><stop offset="0" stop-color="${d.hrana}"/><stop offset="0.45" stop-color="${smichej(d.hrana, d.hranaStin, 0.4)}"/><stop offset="1" stop-color="${d.hranaStin}"/></linearGradient>`,
      mekkyStin(`${id}s`, P.inkoust, 0.3),
    );
    /* Stín doprava po zemi */
    s.push(`<ellipse cx="${f(x0 + w * 0.78 + ox)}" cy="${f(zem - 1)}" rx="${f(w * 0.72)}" ry="${f(11 + d.tl * 0.3)}" fill="url(#${id}s)"/>`);
    s.push(`<ellipse cx="${f(x0 + w * 0.55 + ox * 0.5)}" cy="${f(zem - 0.5)}" rx="${f(w * 0.56)}" ry="3.2" fill="${P.inkoust}" opacity="0.22" filter="url(#${p}-db2)"/>`);
    /* Tloušťka: kopie tvaru odzadu dopředu */
    const kroky = Math.ceil(d.tl * 1.2);
    for (let k = kroky; k >= 1; k--) {
      const t = k / kroky;
      s.push(`<path d="${tvar(ox * t, oy * t)}" fill="url(#${id}h)" fill-rule="evenodd"/>`);
    }
    /* Líc */
    s.push(`<path d="${tvar(0, 0)}" fill="url(#${id}l)" fill-rule="evenodd"/>`);
    /* Hrana líce chytá světlo nahoře a vlevo */
    s.push(`<path d="M${f(x0 + 1.2)} ${f(y0 + h - r)} V${f(y0 + r)} A${f(r - 1.2)} ${f(r - 1.2)} 0 0 1 ${f(x0 + r)} ${f(y0 + 1.2)} H${f(x0 + w - r)}" stroke="#FFFFFF" stroke-width="1.6" fill="none" opacity="${f(0.22 + d.lesk * 0.4)}"/>`);
    /* Dírka: horní okraj ve stínu */
    s.push(`<path d="M${f(dx - dr * 0.85)} ${f(dy - dr * 0.5)} A${f(dr)} ${f(dr)} 0 0 1 ${f(dx + dr * 0.85)} ${f(dy - dr * 0.5)}" stroke="${d.stin}" stroke-width="1.4" fill="none" opacity="0.55"/>`);
    if (i === 0) {
      /* Póry — pár drobných důlků, žádná zrnitost */
      const rnd = nahoda(51);
      for (let k = 0; k < 11; k++) {
        const px = x0 + 14 + rnd() * (w - 28);
        const py = y0 + 46 + rnd() * (h - 62);
        s.push(`<circle cx="${f(px)}" cy="${f(py)}" r="${f(0.9 + rnd() * 0.7)}" fill="${d.stin}" opacity="0.35"/><circle cx="${f(px + 0.6)}" cy="${f(py + 0.7)}" r="0.7" fill="${d.svetlo}" opacity="0.4"/>`);
      }
    }
    if (i === 1) {
      /* Kamenina: pár železitých teček a měkký pololesk */
      const rnd = nahoda(77);
      for (let k = 0; k < 9; k++) {
        s.push(`<circle cx="${f(x0 + 12 + rnd() * (w - 24))}" cy="${f(y0 + 44 + rnd() * (h - 58))}" r="${f(0.8 + rnd() * 1)}" fill="#4A3426" opacity="${f(0.45 + rnd() * 0.25)}"/>`);
      }
      s.push(`<path d="M${f(x0 + w * 0.2)} ${f(y0 + h * 0.86)} L${f(x0 + w * 0.62)} ${f(y0 + h * 0.18)}" stroke="#FFFFFF" stroke-width="${f(w * 0.3)}" stroke-linecap="round" opacity="0.07" filter="url(#${p}-db5)"/>`);
    }
    if (i === 2) {
      /* Porcelán: tenká hrana prosvítá — teplá záře podél horní a pravé hrany a kolem dírky */
      s.push(`<path d="M${f(x0 + r)} ${f(y0 + 2.5)} H${f(x0 + w - r)} A${f(r - 2.5)} ${f(r - 2.5)} 0 0 1 ${f(x0 + w - 2.5)} ${f(y0 + r)} V${f(y0 + h - r)}" stroke="#FFE2B8" stroke-width="4" fill="none" opacity="0.4" filter="url(#${p}-db2)"/>`);
      s.push(`<circle cx="${f(dx)}" cy="${f(dy)}" r="${f(dr + 2.5)}" stroke="#FFE2B8" stroke-width="3" fill="none" opacity="0.45" filter="url(#${p}-db2)"/>`);
      s.push(`<path d="M${f(x0 + w * 0.18)} ${f(y0 + h * 0.8)} L${f(x0 + w * 0.56)} ${f(y0 + h * 0.22)}" stroke="#FFFFFF" stroke-width="${f(w * 0.26)}" stroke-linecap="round" opacity="0.3" filter="url(#${p}-db5)"/>`);
    }
  });
  return `<svg viewBox="0 0 900 260" aria-hidden="true"><defs>${defs.join("")}</defs>${s.join("")}</svg>`;
}
