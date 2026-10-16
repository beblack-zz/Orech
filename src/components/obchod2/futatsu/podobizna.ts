/**
 * Futatsu namalovaný — podobizna hrnku v libovolném natočení.
 *
 * Stojí v tokonomě v krámku, je hlavní obraz stránky /obchod-2/futatsu
 * a hoří v peci v kapitole Oheň. Kreslí se jako rotační těleso z profilu
 * v kresba.ts (Rout, výstupky NUBS), takže výkres i podobizna sedí na
 * stejné míry. Pohled je pravoúhlý (bez perspektivy), trochu shora:
 *
 *   tělo      obrys = sjednocení elips jednotlivých kroužků profilu,
 *             válcové světlo, jádro stínu, odražené světlo na hraně
 *   glazura   stékání (TAHY), dírky, teplý nádech, kde je tenká
 *   okraj     zaoblený světlý pruh, rezavé tečky železa (TECKY)
 *   vnitřek   zadní stěna s vrženým stínem okraje, krakelé, lesk
 *   výstupky  podpis: boky v husté glazuře, řez holé hlíny v barvě
 *             ohně (hiiro) se zrnky, kolem val glazury, stín na tělo
 *   patka     proužek hiiro na hraně glazury, pod ním holá kamenina
 *
 * Všechno světlo jde z jednoho modelu (jas), takže tělo, okraj, výstupky
 * i vnitřek drží pohromadě. vypal plynule míchá syrovou glazuru (před
 * ostrým výpalem) s hotovou.
 *
 * Jednotky jsou milimetry, y dolů od horní hrany okraje; pata stojí v bodě
 * PODOBIZNA.pata pro každé natočení i nadhled. Čisté funkce bez DOM —
 * běží při buildu i v prohlížeči (otáčení tahem: scripts/obchod2/futatsu-otoc.ts).
 */
import { Rout, NUBS, hull, rayR, TAHY, TECKY, LOUZE, rng, rad, r2 } from "./kresba";

type Bod = [number, number];
type Bod3 = [number, number, number];

/** Výstupky z výkresu (kresba.ts je čistý JS bez typů): výška, o kolik vystupuje, pata a řez */
const VYSTUPKY = NUBS as unknown as { y: number; p: number; base: Bod[]; facet: Bod[] }[];

export interface PodobiznaVolby {
  /** Předpona všech id v kresbě (přechody, clipPath, mask) — jedinečná na stránce */
  id: string;
  /** Natočení ve stupních, konvence kresba.ts: kde na obvodu jsou výstupky, 0 = čelem k divákovi. Výchozí 62. */
  uhel?: number;
  /** Pohled trochu shora, ve stupních (0 = přesně z boku). Výchozí 12, rozumně 0–30. */
  nadhled?: number;
  /** Odkud svítí: „vlevo“ = svět webu (zleva shora), „shora“ = reflektor nebo okno nad kusem */
  svetlo?: "vlevo" | "shora";
  /** 0 = syrová glazura před ostrým výpalem … 1 = hotový kus (výchozí). Plynule. */
  vypal?: number;
  /** Měkký stín pod hrnkem (výchozí true) */
  stin?: boolean;
}

/** Pata: střed spodku patky na zemi — při každém natočení i nadhledu na stejném místě */
const PY = 76;

/** Rámeček kresby: stejný pro každý úhel a nadhled 0–30, hrnek se při otáčení neposouvá */
export const PODOBIZNA = { viewBox: "-64 -24 128 124", x: -64, y: -24, w: 128, h: 124, pata: [0, PY] as [number, number] };

/** Barvy kusu — krámek i stránka je berou odsud */
export const BARVY = {
  shino: "#F3ECDF",
  shinoSvetlo: "#FBF7EF",
  shinoStin: "#D6C4A8",
  stekani: "#C9B597",
  hiiro: "#D86A33",
  hiiroSvetle: "#EE8A4E",
  hiiroTma: "#A84A22",
  zelezo: "#8E4220",
  patka: "#D9C6A2",
  patkaStin: "#B39C78",
};
type Barvy = typeof BARVY;

/** Syrová glazura před ostrým výpalem: křídově bledá, šedobílá do růžova; výstupky a patka syrová hlína */
const SYROVE: Barvy = {
  shino: "#ECE6E3",
  shinoSvetlo: "#F6F2F0",
  shinoStin: "#CBC2BF",
  stekani: "#E3DCD9",
  hiiro: "#C9BBA9",
  hiiroSvetle: "#DBD0C2",
  hiiroTma: "#A59684",
  zelezo: "#C4B9B0",
  patka: "#D8D3CC",
  patkaStin: "#AFA9A1",
};

/* ——— Pomůcky ——— */
const f = r2;
/** Drobnosti (krakelé, dírky) stačí na desetiny milimetru */
const f1 = (n: number) => Math.round(n * 10) / 10;
const omez = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const hladce = (a: number, b: number, x: number) => {
  const t = omez((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
/** Úhel do (−π, π] */
const kolemDokola = (x: number) => x - 2 * Math.PI * Math.round(x / (2 * Math.PI));
const dot = (a: Bod3, b: Bod3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a: Bod3): Bod3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const D = (P: Bod[], z = true) => "M" + P.map((p) => f(p[0]) + " " + f(p[1])).join("L") + (z ? "Z" : "");
/** Uzavřená hladká křivka bodů (Catmull-Rom jako Bézier) */
const hladkaD = (P: Bod[], k = 1) => {
  const n = P.length;
  let d = `M${f(P[0][0])} ${f(P[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = P[(i - 1 + n) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n];
    d += `C${f(p1[0] + ((p2[0] - p0[0]) / 6) * k)} ${f(p1[1] + ((p2[1] - p0[1]) / 6) * k)} ${f(p2[0] - ((p3[0] - p1[0]) / 6) * k)} ${f(p2[1] - ((p3[1] - p1[1]) / 6) * k)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + "Z";
};
const plocha = (P: Bod[]) => {
  let s = 0;
  for (let i = 0; i < P.length; i++) {
    const [x0, y0] = P[i], [x1, y1] = P[(i + 1) % P.length];
    s += x0 * y1 - x1 * y0;
  }
  return s / 2;
};
const teziste = (P: Bod[]): Bod => [P.reduce((s, q) => s + q[0], 0) / P.length, P.reduce((s, q) => s + q[1], 0) / P.length];
/** Douglas–Peucker: kratší cesta, stejný tvar */
const zjednodus = (P: Bod[], tol: number): Bod[] => {
  if (P.length < 3) return P;
  const nech = new Uint8Array(P.length);
  nech[0] = nech[P.length - 1] = 1;
  const zasobnik: [number, number][] = [[0, P.length - 1]];
  while (zasobnik.length) {
    const [i, j] = zasobnik.pop()!;
    const [x1, y1] = P[i], [x2, y2] = P[j];
    const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1e-9;
    let m = -1, md = tol;
    for (let k = i + 1; k < j; k++) {
      const d = Math.abs((P[k][0] - x1) * dy - (P[k][1] - y1) * dx) / l;
      if (d > md) { md = d; m = k; }
    }
    if (m >= 0) { nech[m] = 1; zasobnik.push([i, m], [m, j]); }
  }
  return P.filter((_, k) => nech[k]);
};

/* ——— Barvy: míchání a stupnice světla ——— */
type Rgb = [number, number, number];
const RGB = new Map<string, Rgb>();
const rgb = (h: string): Rgb => {
  let c = RGB.get(h);
  if (!c) {
    const n = parseInt(h.slice(1), 16);
    c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    RGB.set(h, c);
  }
  return c;
};
const hex = (r: number, g: number, b: number) =>
  "#" + ((1 << 24) | (Math.round(omez(r, 0, 255)) << 16) | (Math.round(omez(g, 0, 255)) << 8) | Math.round(omez(b, 0, 255))).toString(16).slice(1).toUpperCase();
const mix = (a: string, b: string, t: number) => {
  const A = rgb(a), B = rgb(b);
  return hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
};
/** Stupnice: barva pro jas t (0 = nejhlubší stín … 1 = plné světlo) */
type Stupnice = [number, string][];
const ze = (S: Stupnice, t: number) => {
  if (t <= S[0][0]) return S[0][1];
  for (let i = 1; i < S.length; i++) if (t <= S[i][0]) return mix(S[i - 1][1], S[i][1], (t - S[i - 1][0]) / (S[i][0] - S[i - 1][0]));
  return S[S.length - 1][1];
};

/** Paleta pro daný stupeň výpalu — všechno, co kresba potřebuje, smíchané jednou */
interface Paleta {
  B: Barvy;
  v: number;
  /** Glazura zvenku, vnitřek a holá patka: barva podle jasu */
  glaz: Stupnice;
  vnitr: Stupnice;
  patka: Stupnice;
  /** Hustá bílá glazura (u výstupků, val) a nejhlubší stín */
  bila: string;
  hluboky: string;
  steky: string;
  krak: string;
}
const PALETY = new Map<number, Paleta>();
function paleta(vypal: number): Paleta {
  const v = Math.round(omez(vypal) * 200) / 200;
  const hit = PALETY.get(v);
  if (hit) return hit;
  const B = Object.fromEntries((Object.keys(BARVY) as (keyof Barvy)[]).map((k) => [k, mix(SYROVE[k], BARVY[k], v)])) as Barvy;
  const m = (syr: string, hot: string) => mix(syr, hot, v);
  const hluboky = m("#9C9395", "#8C7553");
  const bila = m("#FBF9F8", "#FFFCF5");
  const p: Paleta = {
    B, v, bila, hluboky,
    glaz: [[0, hluboky], [0.35, B.shinoStin], [0.62, mix(B.shinoStin, B.shino, 0.55)], [0.8, B.shino], [0.93, B.shinoSvetlo], [1, mix(B.shinoSvetlo, bila, v)]],
    vnitr: [[0, m("#9A9092", "#8A7353")], [0.35, m("#C6BDBB", "#CDB993")], [0.62, m("#DCD5D2", "#E0D1B4")], [0.8, m("#E9E4E1", "#EBE1CB")], [0.93, m("#F2EFED", "#F3ECDD")], [1, m("#F7F4F3", "#F8F2E6")]],
    patka: [[0, m("#8E8983", "#7A6446")], [0.35, B.patkaStin], [0.62, mix(B.patkaStin, B.patka, 0.6)], [0.8, B.patka], [0.93, m("#E3DFD9", "#E8DABB")], [1, m("#ECE9E4", "#F1E6CD")]],
    steky: mix(B.stekani, "#6E5638", 0.32),
    krak: m("#D9D2CF", "#B4A07E"),
  };
  if (PALETY.size > 400) PALETY.clear();
  PALETY.set(v, p);
  return p;
}

/* ——— Pohled: pravoúhlý průmět s nadhledem, pata pořád na stejném místě ——— */
interface Pohled {
  c: number;
  s: number;
  /** Směr k divákovi */
  V: Bod3;
  /** Střed kroužku v hloubce y na obrazovce */
  Yc: (y: number) => number;
  P: (x: number, y: number, z: number) => Bod;
}
const pohled = (nadhled: number): Pohled => {
  const n = rad(omez(nadhled, 0, 90)), c = Math.cos(n), s = Math.sin(n);
  return { c, s, V: [0, -s, c], Yc: (y) => PY + (y - PY) * c, P: (x, y, z) => [x, PY + (y - PY) * c + z * s] };
};

/* ——— Světlo ——— */
interface Svetlo {
  /** Směr ke světlu: x vpravo, y dolů, z k divákovi */
  L: Bod3;
  /** Tónová křivka: pod d0 je stín, nad d1 plné světlo; okolní světlo všude */
  d0: number;
  d1: number;
  okolni: number;
  /** Odražené světlo od podložky zprava zdola */
  odraz: number;
  /** Svislý spád: kolik světla ubývá dolů po těle (reflektor shora) */
  spad: number;
  /** Stín na zemi: posun doprava, šířka, síla a tma přímo pod patkou */
  stin: { dx: number; rx: number; sila: number; dotek: number };
  /** Síla vrženého stínu výstupku a stínu obruby uvnitř */
  vrzeny: number;
}
const SVETLA: Record<"vlevo" | "shora", Svetlo> = {
  vlevo: { L: norm([-0.4, -0.56, 0.72]), d0: -0.35, d1: 1.2, okolni: 0.1, odraz: 0.36, spad: 0.04, stin: { dx: 8, rx: 50, sila: 0.3, dotek: 0.36 }, vrzeny: 0.42 },
  shora: { L: norm([-0.22, -0.92, 0.32]), d0: -0.4, d1: 0.62, okolni: 0.12, odraz: 0.24, spad: 0.34, stin: { dx: 2, rx: 44, sila: 0.38, dotek: 0.46 }, vrzeny: 0.46 },
};
const ODRAZ: Bod3 = norm([1, 0.32, -0.28]);

/** Jas plošky s normálou n: 0 = nejhlubší stín, 1 = plné světlo */
const jas = (n: Bod3, sv: Svetlo, pv: Pohled) => {
  const d = dot(n, sv.L);
  let t = sv.okolni + (1 - sv.okolni) * hladce(sv.d0, sv.d1, d);
  const nv = omez(dot(n, pv.V));
  t *= 1 - 0.14 * (1 - nv) ** 2;
  t += sv.odraz * omez(dot(n, ODRAZ)) ** 8 * (1 - hladce(0, 0.4, d));
  return omez(t);
};

/* ——— Obrys těla: sjednocení elips kroužků profilu ——— */
/** Kroužky zvenku [y, R]: vnější čtvrtka obruby jemně, rovná stěna řidčeji, oblouk nad patkou hustě */
const KRUHY: [number, number][] = [];
for (let i = 0; i <= 12; i++) {
  const t = (i / 12) * (Math.PI / 2);
  KRUHY.push([1.7 - 1.7 * Math.sin(t), 40.3 + 1.7 * Math.cos(t)]);
}
for (let y = 3; y < 58; y += 1.5) KRUHY.push([y, Rout(y)]);
for (let y = 58; y < 76; y += 0.4) KRUHY.push([y, Rout(y)]);
KRUHY.push([76, Rout(76)]);

interface Telo {
  obr: Bod[];
  d: string;
  znamenko: number;
}
const TELA = new Map<number, Telo>();
function telo(pv: Pohled): Telo {
  const klic = Math.round(pv.s * 1e5);
  const hit = TELA.get(klic);
  if (hit) return hit;
  const horni: Bod[] = [];
  const dolni: Bod[] = [];
  const N = 100;
  for (let i = 0; i <= N; i++) {
    const x = -42 * Math.cos((Math.PI * i) / N);
    let lo = Infinity, hi = -Infinity;
    for (const [y, R] of KRUHY) {
      if (R < Math.abs(x)) continue;
      const h = pv.s * Math.sqrt(R * R - x * x), yc = pv.Yc(y);
      if (yc - h < lo) lo = yc - h;
      if (yc + h > hi) hi = yc + h;
    }
    if (lo < Infinity) {
      horni.push([x, lo]);
      dolni.push([x, hi]);
    }
  }
  const obr = [...zjednodus(horni, 0.012), ...zjednodus(dolni, 0.012).reverse().slice(1, -1)];
  const t: Telo = { obr, d: D(obr), znamenko: Math.sign(plocha(obr)) || 1 };
  if (TELA.size > 60) TELA.clear();
  TELA.set(klic, t);
  return t;
}

/* Elipsa kroužku v hloubce y: přední (dolní) oblouk zleva doprava a zpátky */
const predni = (pv: Pohled, y: number, R: number) => `M${f(-R)} ${f(pv.Yc(y))}A${f(R)} ${f(R * pv.s)} 0 0 0 ${f(R)} ${f(pv.Yc(y))}`;
const predniZpet = (pv: Pohled, y: number, R: number) => `L${f(R)} ${f(pv.Yc(y))}A${f(R)} ${f(R * pv.s)} 0 0 1 ${f(-R)} ${f(pv.Yc(y))}`;
const elipsa = (pv: Pohled, y: number, R: number, a: string) => `<ellipse cx="0" cy="${f(pv.Yc(y))}" rx="${f(R)}" ry="${f(Math.max(0.001, R * pv.s))}" ${a}/>`;
/** Všechno pod kroužkem y (ořez obrysu to srovná) */
const pod = (pv: Pohled, y: number) => predni(pv, y, Rout(y) + 0.6) + "L48 110L-48 110Z";
/** Pás mezi dvěma kroužky (y1 nad y2) */
const pas = (pv: Pohled, y1: number, y2: number) => predni(pv, y1, Rout(y1) + 0.6) + predniZpet(pv, y2, Rout(y2) + 0.6) + "Z";

/* ——— Přechody ——— */
const stopy = (body: [number, string][]) => body.map(([o, c]) => `<stop offset="${f(o)}" stop-color="${c}"/>`).join("");
/** Válcový přechod přes šířku 2R: nf(s, c) = normála plošky, která je na obrazovce v poměru s = x/R */
const valec = (id: string, R: number, S: Stupnice, nf: (s: number, c: number) => Bod3, sv: Svetlo, pv: Pohled, posun = 0) => {
  const b: [number, string][] = [];
  for (let i = 0; i <= 14; i++) {
    const th = -Math.PI / 2 + (Math.PI * i) / 14, s = Math.sin(th), c = ze(S, omez(jas(norm(nf(s, Math.cos(th))), sv, pv) + posun));
    if (b.length > 1 && b[b.length - 1][1] === c && b[b.length - 2][1] === c) b[b.length - 1][0] = (s + 1) / 2;
    else b.push([(s + 1) / 2, c]);
  }
  return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${f(-R)}" y1="0" x2="${f(R)}" y2="0">${stopy(b)}</linearGradient>`;
};
/** Svislý přechod jedné barvy z průhledné do plné (userSpace) */
const zavoj = (id: string, barva: string, y1: number, y2: number, o1: number, o2: number) =>
  `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="${f(y1)}" x2="0" y2="${f(y2)}"><stop offset="0" stop-color="${barva}" stop-opacity="${f(o1)}"/><stop offset="1" stop-color="${barva}" stop-opacity="${f(o2)}"/></linearGradient>`;

/* ——— Glazura: stékání, dírky, tečky železa (otáčejí se s hrnkem) ——— */
const R7 = rng(523);
/** Stékání: k tahům z výkresu šířka a síla */
const STEKY = (TAHY as { b: number; y1: number; y2: number; w: number }[])
  .map((q, i) => {
    const siroky = R7() < 0.35, nech = R7() < 0.62 || i === 0;
    return { ...q, nech, b: q.b + (R7() - 0.5) * 18, sir: siroky ? 5 + R7() * 4.5 : 1.3 + R7() * 2.6, sila: siroky ? 0.4 + R7() * 0.35 : 0.35 + R7() * 0.65, y1: 1.6, y2: q.y2 - 6 + R7() * 16 };
  })
  .filter((q) => q.nech);
/** Dírky po bublinkách — pár desítek po celém obvodu */
const DIRKY = Array.from({ length: 70 }, () => ({ b: R7() * 360, y: 5 + R7() * 64, r: 0.14 + R7() ** 2 * 0.26 }));
/** Oblaka: kde glazura zhoustla, je bělejší, kde je tenká, teplejší — pár velkých měkkých skvrn kolem dokola */
const OBLAKA = Array.from({ length: 10 }, (_, i) => ({ b: i * 36 + R7() * 26, y: 14 + R7() * 46, w: 12 + R7() * 16, h: 14 + R7() * 22, bila: R7() < 0.6, sila: 0.45 + R7() * 0.55 }));

/** Bod na vnější stěně: azimut v rad (0 = k divákovi), hloubka y */
const naStene = (az: number, y: number, R = Rout(y)): Bod3 => [R * Math.sin(az), y, R * Math.cos(az)];

/** Měkký kraj stékání: jeden přechod napříč pruhem (objectBoundingBox), sdílí ho všechny pruhy */
const mekkyPruh = (id: string, barva: string) =>
  `<linearGradient id="${id}"><stop offset="0" stop-color="${barva}" stop-opacity="0"/><stop offset=".3" stop-color="${barva}" stop-opacity=".55"/><stop offset=".5" stop-color="${barva}"/><stop offset=".7" stop-color="${barva}" stop-opacity=".55"/><stop offset="1" stop-color="${barva}" stop-opacity="0"/></linearGradient>`;

/** Stékání na přivrácené straně: skoro rovné měkké pruhy od obruby dolů, ke kraji se zužují perspektivou */
function stekani(a: number, p: Paleta, P3: (b: Bod3) => Bod, id: string, sila = 1) {
  if (p.v < 0.02) return "";
  let s = "";
  const K = 8;
  for (const q of STEKY) {
    const vid = hladce(0.02, 0.35, Math.cos(rad(q.b + a)));
    if (vid <= 0) continue;
    const L: Bod[] = [], Pr: Bod[] = [];
    for (let i = 0; i <= K; i++) {
      const t = i / K, y = q.y1 + (q.y2 - q.y1) * t;
      const sir = (q.sir * (t < 0.5 ? 1 : 1 - 0.55 * ((t - 0.5) / 0.5) ** 1.4)) / 2;
      const R = Rout(y), az = kolemDokola(rad(q.b + a + 0.3 * q.w * Math.sin(y * 0.11 + q.b))), d = sir / R;
      L.push(P3(naStene(omez(az - d, -1.56, 1.56), y, R)));
      Pr.push(P3(naStene(omez(az + d, -1.56, 1.56), y, R)));
    }
    s += `<path d="${D([...L, ...Pr.reverse()])}" fill="url(#${id}-sk)" opacity="${f(0.6 * q.sila * vid * p.v * sila)}"/>`;
  }
  return s ? `<g mask="url(#${id}-skm)">${s}</g>` : "";
}
/** Stékání slábne dolů: maska od obruby (plné) k y2 (nic) */
const maskaSteku = (id: string, y1: number, y2: number) =>
  `<linearGradient id="${id}-skg" gradientUnits="userSpaceOnUse" x1="0" y1="${f(y1)}" x2="0" y2="${f(y2)}"><stop offset="0" stop-color="#FFF"/><stop offset=".45" stop-color="#AAA"/><stop offset="1" stop-color="#000"/></linearGradient>` +
  `<mask id="${id}-skm" maskUnits="userSpaceOnUse" x="-60" y="-30" width="120" height="140"><rect x="-60" y="-30" width="120" height="140" fill="url(#${id}-skg)"/></mask>`;

/** Oblaka glazury na přivrácené straně, měkké elipsy (přechod do ztracena) */
function oblaka(a: number, pv: Pohled, p: Paleta, P3: (b: Bod3) => Bod, id: string) {
  if (p.v < 0.05) return "";
  let s = `<defs><radialGradient id="${id}-ob"><stop offset="0" stop-color="${p.bila}" stop-opacity=".42"/><stop offset="1" stop-color="${p.bila}" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="${id}-ot"><stop offset="0" stop-color="${mix(p.B.hiiroSvetle, p.B.shino, 0.45)}" stop-opacity=".13"/><stop offset="1" stop-color="${p.B.hiiroSvetle}" stop-opacity="0"/></radialGradient></defs>`;
  for (const o of OBLAKA) {
    const az = kolemDokola(rad(o.b + a)), c = Math.cos(az), vid = hladce(0.05, 0.4, c);
    if (vid <= 0) continue;
    const [x, y] = P3(naStene(az, o.y));
    s += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f((o.w / 2) * c)}" ry="${f((o.h / 2) * pv.c)}" fill="url(#${id}-${o.bila ? "ob" : "ot"})" opacity="${f(o.sila * vid * p.v)}"/>`;
  }
  return s;
}

/** Dírky: tmavý důlek, pod ním světlý okraj */
function dirky(a: number, pv: Pohled, p: Paleta, P3: (b: Bod3) => Bod, kolik = 1) {
  if (p.v < 0.05) return "";
  let s = "";
  const tma = mix(p.B.shinoStin, "#4E3C28", 0.55);
  for (const d of DIRKY) {
    const az = rad(d.b + a), c = Math.cos(az);
    if (c < 0.18) continue;
    const vid = hladce(0.18, 0.45, c) * p.v * kolik;
    const [x, y] = P3(naStene(az, d.y));
    const rx = d.r * c, ry = d.r * pv.c;
    s += `<ellipse cx="${f1(x + rx * 0.22)}" cy="${f1(y + ry * 0.3)}" rx="${f(rx)}" ry="${f(ry)}" fill="${p.bila}" opacity="${f1(0.8 * vid)}"/>` +
      `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f(rx)}" ry="${f(ry)}" fill="${tma}" opacity="${f(0.45 * vid)}"/>`;
  }
  return s;
}

/** Tečky železa na obrubě: kde na zaoblení leží (rr z výkresu), tam se otáčejí a schovávají */
function tecky(a: number, pv: Pohled, p: Paleta, id: string) {
  if (p.v < 0.05) return "";
  let s = `<defs><radialGradient id="${id}-ze"><stop offset="0" stop-color="${mix(p.B.zelezo, p.B.hiiro, 0.5)}" stop-opacity=".5"/><stop offset="1" stop-color="${p.B.hiiro}" stop-opacity="0"/></radialGradient></defs>`;
  (TECKY as { b: number; y: number; r: number; rr: number }[]).forEach((k, i) => {
    const az = rad(k.b + a), sa = Math.sin(az), ca = Math.cos(az);
    let X: Bod3, n: Bod3, t2: Bod3;
    if (k.y > 2.4) {
      // pod obrubou na stěně
      X = naStene(az, k.y - 0.6);
      n = [sa, 0, ca];
      t2 = [0, 1, 0];
    } else {
      // na zaoblení: rr 0 = vnitřní hrana, 1 = vnější
      const fi = rad(150 - k.rr * 128);
      const R = 40.3 + 1.7 * Math.cos(fi), y = 1.7 - 1.7 * Math.sin(fi);
      X = [R * sa, y, R * ca];
      n = [Math.cos(fi) * sa, -Math.sin(fi), Math.cos(fi) * ca];
      t2 = [-Math.sin(fi) * sa, -Math.cos(fi), -Math.sin(fi) * ca];
    }
    const nv = dot(n, pv.V);
    if (nv < 0.03) return;
    const vid = hladce(0.03, 0.22, nv) * p.v;
    const [x, y] = pv.P(...X);
    const t1: Bod3 = [ca, 0, -sa];
    const u = [t1[0], t1[1] * pv.c + t1[2] * pv.s], w = [t2[0], t2[1] * pv.c + t2[2] * pv.s];
    // drobná nepravidelná skvrna: protažená podél obvodu nebo napříč
    const r = 0.12 + k.r * 0.34, e = i % 3 === 0 ? 1.8 : i % 3 === 1 ? 0.8 : 1.2;
    const m = (k1: number, k2: number) => `matrix(${f(u[0] * k1)} ${f(u[1] * k1)} ${f(w[0] * k2)} ${f(w[1] * k2)} ${f(x)} ${f(y)})`;
    if (k.r > 0.45) s += `<circle r="1" transform="${m(r * e * 2.6, r * 2.6)}" fill="url(#${id}-ze)" opacity="${f(vid)}"/>`;
    s += `<circle r="1" transform="${m(r * e, r)}" fill="${p.B.zelezo}" opacity="${f((0.55 + 0.4 * k.rr) * vid)}"/>`;
  });
  return s;
}

/* ——— Výstupky: podpis ——— */
interface Vystupek {
  defs: string;
  /** Na těle (v ořezu těla): vržený stín */
  naTele: string;
  /** Hrouda, řez a zrnka — kreslí se po těle, co je za ním, schová maska */
  predni: string;
}

/** Bod v rovině řezu: u po obvodu, v dolů */
const naRezu = (nb: { y: number; p: number }, A: number, u: number, v: number): Bod3 => {
  const Rp = Rout(nb.y) + nb.p, sa = Math.sin(A), ca = Math.cos(A);
  return [Rp * sa + u * ca, nb.y + v, Rp * ca - u * sa];
};

/** Mnohoúhelník se zaoblenými rohy: řez je rovný od nože, val glazury mu rohy zakulatí */
const zaoblit = (P: Bod[], r: number, n = 4): Bod[] => {
  const o: Bod[] = [];
  for (let i = 0; i < P.length; i++) {
    const a = P[(i - 1 + P.length) % P.length], b = P[i], c = P[(i + 1) % P.length];
    const ka = Math.min(0.45, r / Math.hypot(a[0] - b[0], a[1] - b[1])), kc = Math.min(0.45, r / Math.hypot(c[0] - b[0], c[1] - b[1]));
    const A: Bod = [b[0] + (a[0] - b[0]) * ka, b[1] + (a[1] - b[1]) * ka], C: Bod = [b[0] + (c[0] - b[0]) * kc, b[1] + (c[1] - b[1]) * kc];
    for (let j = 0; j < n; j++) {
      const t = j / n, u = 1 - t;
      o.push([u * u * A[0] + 2 * u * t * b[0] + t * t * C[0], u * u * A[1] + 2 * u * t * b[1] + t * t * C[1]]);
    }
  }
  return o;
};

/** Hrouda výstupku v místních souřadnicích (u po obvodu, v dolů): polární úhly, poloměr paty a řezu */
const hroudy = (K: number) =>
  VYSTUPKY.map((nb) => {
    const rez = zaoblit(nb.facet, 1.1);
    const phi = Array.from({ length: K }, (_, k) => (k / K) * 2 * Math.PI);
    return { phi, rb: phi.map((t) => rayR(nb.base, t) as number), rf: phi.map((t) => rayR(rez, t) as number) };
  });
const HROUDY = hroudy(28), HROUDY_MAKRO = hroudy(72);

/** Prstence hroudy od paty k řezu: [směs pata → řez, měřítko, výška 0–1, bělost glazury] */
const PRSTENCE: [number, number, number, number][] = [
  // pata se rozlévá do stěny, v žlábku glazura zhoustne
  [0, 1.12, 0, 0.03],
  [0, 1.03, 0.07, 0.12],
  [0, 0.96, 0.22, 0.1],
  // strmý bok
  [0.8, 1, 0.86, 0.04],
  // val: glazura se zakulatí přes hranu řezu
  [1, 1.04, 0.97, 0.42],
  [1, 1, 1, 0.55],
];

/** Body hroudy ve 3D, [prstenec][úhel]; pata leží přesně na válci */
function hrouda(i: number, a: number, H = HROUDY[i]): Bod3[][] {
  const nb = VYSTUPKY[i], A = rad(a), sa = Math.sin(A), ca = Math.cos(A), R0 = Rout(nb.y);
  return PRSTENCE.map(([z, sc, h]) =>
    H.phi.map((t, k) => {
      const r = (H.rb[k] * (1 - z) + H.rf[k] * z) * sc, u = r * Math.cos(t), v = r * Math.sin(t);
      if (h === 0) {
        const R = Rout(nb.y + v), g = A + u / R;
        return [R * Math.sin(g), nb.y + v, R * Math.cos(g)] as Bod3;
      }
      const w = R0 + h * nb.p + (1 - h) * (R0 * Math.cos(u / R0) - R0);
      return [w * sa + u * ca, nb.y + v, w * ca - u * sa] as Bod3;
    }),
  );
}

/** Zrnka v řezu: [u, v, r, světlé] — v podobizně pár, v makru víc a různě velká */
const zrnka = (i: number, kolik: number, seed: number) => {
  const r = rng(seed), P = zaoblit(VYSTUPKY[i].facet, 1.1);
  const xs = P.map((q) => q[0]), ys = P.map((q) => q[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), o: [number, number, number, number][] = [];
  const uvnitr = (x: number, y: number) => {
    let c = false;
    for (let a = 0, b = P.length - 1; a < P.length; b = a++) {
      const [xa, ya] = P[a], [xb, yb] = P[b];
      if (ya > y !== yb > y && x < ((xb - xa) * (y - ya)) / (yb - ya) + xa) c = !c;
    }
    return c;
  };
  for (let g = 0; o.length < kolik && g < kolik * 60; g++) {
    const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0);
    if (uvnitr(x * 1.15, y * 1.15)) o.push([x, y, 0.06 + r() ** 2 * 0.16, r() < 0.35 ? 1 : 0]);
  }
  return o;
};
const ZRNKA = [zrnka(0, 18, 41), zrnka(1, 11, 42)];
const ZRNKA_MAKRO = [zrnka(0, 64, 741), zrnka(1, 36, 742)];

function vystupek(i: number, a: number, pv: Pohled, sv: Svetlo, p: Paleta, id: string, P3: (b: Bod3) => Bod, makro = false): Vystupek {
  const nb = VYSTUPKY[i], A = rad(a), sa = Math.sin(A), ca = Math.cos(A);
  const Nn: Bod3 = [sa, 0, ca];
  const H = makro ? HROUDY_MAKRO[i] : HROUDY[i], K = H.phi.length, J = PRSTENCE.length;
  const B3 = hrouda(i, a, H), B2 = B3.map((r) => r.map(P3));
  let defs = "";

  /* Směr světla napříč výstupkem (kolmo na jeho osu), na obrazovce */
  const Ln = dot(sv.L, Nn), Lp = norm([sv.L[0] - Ln * sa, sv.L[1], sv.L[2] - Ln * ca]);
  const g0 = P3([0, 0, 0]), g1 = P3(Lp);
  let gx = g1[0] - g0[0], gy = g1[1] - g0[1];
  const gl = Math.hypot(gx, gy);
  if (gl < 0.05) { gx = -0.6; gy = -0.8; } else { gx /= gl; gy /= gl; }
  const osa = (P: Bod[]) => {
    const pr = P.map((q) => q[0] * gx + q[1] * gy);
    return [Math.min(...pr), Math.max(...pr)];
  };
  /* Přechod podél osy světla, zastávky z barev přivrácených plošek */
  const prechod = (gid: string, q0: number, q1: number, vz: [number, string][]) => {
    vz.sort((x, y) => x[0] - y[0]);
    const st = [0, 0.2, 0.4, 0.6, 0.8, 1].map((o) => {
      let b = vz[0];
      for (const v of vz) if (Math.abs(v[0] - o) < Math.abs(b[0] - o)) b = v;
      return [o, b[1]] as [number, string];
    });
    return `<linearGradient id="${gid}" gradientUnits="userSpaceOnUse" x1="${f(gx * q0)}" y1="${f(gy * q0)}" x2="${f(gx * q1)}" y2="${f(gy * q1)}">${stopy(st)}</linearGradient>`;
  };

  /* Boky: pás mezi dvěma prstenci je jeden tvar s přechodem ve směru světla — na prstenci
     jde jas jako kosinus úhlu ke světlu, a to přímka přes obrazovku umí přesně. Pásy jdou
     od paty k řezu (u odvráceného výstupku obráceně), každý další zakryje vnitřek toho před ním. */
  const pasy: string[] = [];
  /* Matná glazura: boky drží blíž jasu stěny kolem, ať výstupek nesvítí jako porcelán */
  const tStena = jas(Nn, sv, pv);
  for (let j = 0; j < J - 1; j++) {
    const bel = (PRSTENCE[j][3] + PRSTENCE[j + 1][3]) / 2;
    const obr = hull([...B2[j], ...B2[j + 1]]) as Bod[];
    const [q0, q1] = osa(obr), dq = q1 - q0 || 1;
    const vz: [number, string][] = [];
    for (let k = 0; k < K; k++) {
      const k2 = (k + 1) % K, a1 = B3[j][k], b1 = B3[j + 1][k], c1 = B3[j + 1][k2], d1 = B3[j][k2];
      const e1: Bod3 = [c1[0] - a1[0], c1[1] - a1[1], c1[2] - a1[2]], e2: Bod3 = [d1[0] - b1[0], d1[1] - b1[1], d1[2] - b1[2]];
      let n = norm([e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]);
      if (dot(n, Nn) < 0) n = [-n[0], -n[1], -n[2]];
      const m = P3([(a1[0] + c1[0]) / 2, (a1[1] + c1[1]) / 2, (a1[2] + c1[2]) / 2]);
      vz.push([(m[0] * gx + m[1] * gy - q0) / dq, mix(ze(p.glaz, tStena + (jas(n, sv, pv) - tStena) * 0.55), p.bila, bel)]);
    }
    if (!vz.length || obr.length < 3) continue;
    defs += prechod(`${id}-n${i}p${j}`, q0, q1, vz);
    if (j === 0) {
      /* Krajní pás paty se do stěny ztrácí: maska slábne od prstence k okraji */
      const k0 = PRSTENCE[1][1] / PRSTENCE[0][1];
      defs += `<radialGradient id="${id}-n${i}f"><stop offset="${f(k0 - 0.06)}" stop-color="#FFF"/><stop offset="1" stop-color="#000"/></radialGradient><mask id="${id}-n${i}fm"><path d="${D(obr)}" fill="url(#${id}-n${i}f)"/></mask>`;
      pasy.push(`<path d="${D(obr)}" fill="url(#${id}-n${i}p${j})" mask="url(#${id}-n${i}fm)"/>`);
    } else pasy.push(`<path d="${D(obr)}" fill="url(#${id}-n${i}p${j})"/>`);
  }
  if (ca * pv.c < 0) pasy.reverse();
  let predni = pasy.join("");

  /* Řez: holá hlína v barvě ohně se zrnky; světlo jde přes rovinu jemným přechodem */
  const fv = ca * pv.c;
  if (fv > 0.002) {
    /* Holá hlína je sytá i ve stínu — nikdy nespadne do hnědé */
    const tF = 0.3 + 0.7 * jas(Nn, sv, pv);
    const hS = tF > 0.62 ? mix(p.B.hiiro, p.B.hiiroSvetle, (tF - 0.62) / 0.38) : mix(p.B.hiiroTma, p.B.hiiro, (tF - 0.3) / 0.32);
    const fP = B2[J - 1];
    const [q0, q1] = osa(fP);
    defs += prechod(`${id}-r${i}`, q0, q1, [[1, mix(hS, p.B.hiiroSvetle, 0.45)], [0.55, hS], [0, mix(hS, p.B.hiiroTma, 0.45)]]);
    predni += `<path d="${D(fP)}" fill="url(#${id}-r${i})"/>`;
    if (fv > 0.05) {
      /* Oheň hlínu nezbarví stejně: tmavší pálená skvrna a světlejší místo, kde plamen olízl hranu */
      const u: Bod = [ca, -sa * pv.s], w: Bod = [0, pv.c], vid = hladce(0.05, 0.25, fv);
      const mekka = (k: string, barva: string) => `<radialGradient id="${id}-rs${i}${k}"><stop offset="0" stop-color="${barva}"/><stop offset="1" stop-color="${barva}" stop-opacity="0"/></radialGradient>`;
      defs += `<clipPath id="${id}-rc${i}"><path d="${D(fP)}"/></clipPath>` + mekka("t", mix(p.B.hiiroTma, "#7A2E10", 0.4)) + mekka("s", mix(p.B.hiiroSvetle, "#F6B27A", 0.5));
      const skvrna = (zu: number, zv: number, rx: number, ry: number, k: string, op: number) => {
        const [x, y] = P3(naRezu(nb, A, zu, zv));
        return `<circle r="1" transform="matrix(${f(u[0] * rx)} ${f(u[1] * rx)} ${f(w[0] * ry)} ${f(w[1] * ry)} ${f(x)} ${f(y)})" fill="url(#${id}-rs${i}${k})" opacity="${f(op * vid * p.v)}"/>`;
      };
      predni += `<g clip-path="url(#${id}-rc${i})">` + (i === 0 ? skvrna(2.4, 1.2, 3.6, 2.6, "t", 0.5) + skvrna(-3, -1.2, 2.6, 1.8, "s", 0.55) : skvrna(1.2, 1, 2.6, 2, "t", 0.5) + skvrna(-1.4, -1, 1.8, 1.4, "s", 0.55)) + `</g>`;
    }
    if (fv > 0.08) {
      const vid = hladce(0.08, 0.3, fv);
      const u: Bod = [ca, -sa * pv.s], w: Bod = [0, pv.c];
      const tma = mix(p.B.hiiroTma, "#4A1C08", 0.45 * p.v), sv2 = mix(p.B.hiiroSvetle, "#FFE4C6", 0.45 * p.v);
      for (const [zu, zv, r0, svetle] of makro ? ZRNKA_MAKRO[i] : ZRNKA[i]) {
        const [x, y] = P3(naRezu(nb, A, zu, zv)), r = makro ? r0 * 0.8 : r0;
        predni += `<circle r="1" transform="matrix(${f(u[0] * r)} ${f(u[1] * r)} ${f(w[0] * r)} ${f(w[1] * r)} ${f(x)} ${f(y)})" fill="${svetle ? sv2 : tma}" opacity="${f((svetle ? 0.6 : 0.62) * vid)}"/>`;
      }
    }
  }

  /* Co je za rovinou obrysu (z < 0) a v obrysu těla, to tělo schová: maska = mimo tělo
     plus průmět přední části výstupku (body a průsečíky hran s rovinou z = 0) */
  if (!makro && B3.some((r) => r.some((q) => q[2] < 0))) {
    const vpredu: Bod3[] = [];
    for (let j = 0; j < J; j++)
      for (let k = 0; k < K; k++) {
        const q = B3[j][k];
        if (q[2] >= 0) vpredu.push(q);
        for (const r of [B3[j][(k + 1) % K], j + 1 < J ? B3[j + 1][k] : null]) {
          if (!r || q[2] >= 0 === r[2] >= 0) continue;
          const t = q[2] / (q[2] - r[2]);
          vpredu.push([q[0] + (r[0] - q[0]) * t, q[1] + (r[1] - q[1]) * t, 0]);
        }
      }
    const pr = vpredu.length > 2 ? `<path d="${D(hull(vpredu.map(P3)) as Bod[])}" fill="#FFF"/>` : "";
    defs += `<mask id="${id}-m${i}" maskUnits="userSpaceOnUse" x="-64" y="-24" width="128" height="124"><rect x="-64" y="-24" width="128" height="124" fill="#FFF"/><use href="#${id}-o" fill="#000"/>${pr}</mask>`;
    predni = `<g mask="url(#${id}-m${i})">${predni}</g>`;
  }

  /* Vržený stín na tělo: hrana řezu promítnutá po paprscích světla na válec */
  let naTele = "";
  const vidTelo = hladce(-0.3, 0.2, ca);
  if (vidTelo > 0) {
    const R = Rout(nb.y), L = sv.L, AA = L[0] * L[0] + L[2] * L[2];
    const stin: Bod3[] = [];
    for (const F of [...B3[J - 1], ...B3[J - 3], ...B3[3], ...B3[2]]) {
      const B = -2 * (F[0] * L[0] + F[2] * L[2]), C = F[0] * F[0] + F[2] * F[2] - R * R, Dd = B * B - 4 * AA * C;
      if (Dd < 0 || AA < 1e-6) continue;
      const t = (-B - Math.sqrt(Dd)) / (2 * AA);
      if (t <= 0) continue;
      const S: Bod3 = [F[0] - t * L[0], F[1] - t * L[1], F[2] - t * L[2]];
      const g = omez(Math.atan2(S[0], S[2]), -Math.PI / 2, Math.PI / 2);
      stin.push([R * Math.sin(g), S[1], R * Math.cos(g)]);
    }
    if (stin.length > 2) {
      const telo = jas(Nn, sv, pv);
      const sila = sv.vrzeny * vidTelo * omez(telo * 1.3 - 0.1) * (0.3 + 0.7 * p.v);
      const sp = hull(stin.map(P3)) as Bod[];
      const c = teziste(sp);
      const roztec = (k: number) => sp.map(([x, y]) => [c[0] + (x - c[0]) * k, c[1] + (y - c[1]) * k] as Bod);
      const barva = mix(p.hluboky, "#4A3018", 0.4);
      /* Stín s délkou měkne a slábne: přechod od paty výstupku k nejvzdálenějšímu bodu stínu */
      const [ox, oy] = P3([Rout(nb.y) * sa, nb.y, Rout(nb.y) * ca]);
      const kon = stin.map(P3).reduce((m, q) => (Math.hypot(q[0] - ox, q[1] - oy) > Math.hypot(m[0] - ox, m[1] - oy) ? q : m), [ox, oy] as Bod);
      defs += `<linearGradient id="${id}-s${i}" gradientUnits="userSpaceOnUse" x1="${f(ox)}" y1="${f(oy)}" x2="${f(kon[0])}" y2="${f(kon[1])}"><stop offset=".3" stop-color="${barva}"/><stop offset=".62" stop-color="${barva}" stop-opacity=".45"/><stop offset=".92" stop-color="${barva}" stop-opacity="0"/></linearGradient>`;
      const vypln = `fill="url(#${id}-s${i})"`;
      naTele += `<path d="${hladkaD(roztec(1.2), 0.7)}" ${vypln} opacity="${f(sila * 0.22)}"/><path d="${hladkaD(roztec(1.08), 0.7)}" ${vypln} opacity="${f(sila * 0.32)}"/><path d="${hladkaD(sp, 0.7)}" ${vypln} opacity="${f(sila * 0.5)}"/>`;
    }
  }
  return { defs, naTele, predni };
}

/* ——— Vnitřek: zadní stěna, vržený stín obruby, krakelé ——— */
/** Krakelé na válci vnitřku: Voronoi na pásu kolem dokola (u = délka po obvodu, y = hloubka) */
const RI = 38.6;
const sitKrakele = (seed: number, nu: number, nv: number, nech: number): number[][] => {
  const r = rng(seed), obvod = 2 * Math.PI * RI, cu = obvod / nu, cv = 64 / nv;
  const S: Bod[][] = [];
  for (let i = 0; i < nu; i++) {
    S.push([]);
    for (let j = 0; j < nv; j++) S[i].push([(i + 0.5 + (r() - 0.5) * 0.95) * cu, 2 + (j + 0.5 + (r() - 0.5) * 0.95) * cv]);
  }
  const E: number[][] = [];
  const videno = new Set<string>();
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    const s = S[i][j];
    let poly: Bod[] = [[s[0] - 2 * cu, s[1] - 2 * cv], [s[0] + 2 * cu, s[1] - 2 * cv], [s[0] + 2 * cu, s[1] + 2 * cv], [s[0] - 2 * cu, s[1] + 2 * cv]];
    for (let di = -2; di <= 2; di++) for (let dj = -2; dj <= 2; dj++) {
      const jj = j + dj;
      if ((!di && !dj) || !poly.length || jj < 0 || jj >= nv) continue;
      const q0 = S[(i + di + nu) % nu][jj], q: Bod = [q0[0] + (i + di < 0 ? -obvod : i + di >= nu ? obvod : 0), q0[1]];
      const mx = (s[0] + q[0]) / 2, my = (s[1] + q[1]) / 2, nx = q[0] - s[0], ny = q[1] - s[1];
      const h = (P: Bod) => (P[0] - mx) * nx + (P[1] - my) * ny, out: Bod[] = [];
      for (let k = 0; k < poly.length; k++) {
        const P = poly[k], Q = poly[(k + 1) % poly.length], hp = h(P), hq = h(Q);
        if (hp <= 0) out.push(P);
        if ((hp <= 0) !== (hq <= 0)) { const t = hp / (hp - hq); out.push([P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t]); }
      }
      poly = out;
    }
    for (let k = 0; k < poly.length; k++) {
      const P = poly[k], Q = poly[(k + 1) % poly.length];
      const klic = [P, Q].map((p) => Math.round((((p[0] % obvod) + obvod) % obvod) * 10) + "," + Math.round(p[1] * 10)).sort().join("|");
      if (videno.has(klic)) continue;
      videno.add(klic);
      if (r() > nech || Math.max(P[1], Q[1]) < 1.7 || Math.min(P[1], Q[1]) > 66) continue;
      const l = Math.hypot(Q[0] - P[0], Q[1] - P[1]) || 1, w = (r() - 0.5) * 0.3 * l;
      E.push([P[0], P[1], (P[0] + Q[0]) / 2 - ((Q[1] - P[1]) / l) * w, (P[1] + Q[1]) / 2 + ((Q[0] - P[0]) / l) * w, Q[0], Q[1]]);
    }
  }
  return E;
};
/** Velká pole a mezi nimi jemné praskliny — jako na fotce zevnitř */
const KRAKELE = [sitKrakele(61, 34, 9, 0.85), sitKrakele(62, 70, 19, 0.22)];

function vnitrek(a: number, pv: Pohled, sv: Svetlo, p: Paleta, id: string) {
  const s = pv.s;
  if (s < 0.01) return { defs: "", kresba: "" };
  const Rk = 40.3;
  let defs = valec(`${id}-ri`, Rk, p.glaz, (x, c) => [-0.62 * x, -0.72, 0.62 * c], sv, pv, 0.04);
  defs += valec(`${id}-v`, RI, p.vnitr, (x, c) => [-x, 0, c], sv, pv);
  /* Hloubka: čím níž v otvoru, tím hlouběji ve stěně */
  const yHore = pv.Yc(1.7) - RI * s, yDole = pv.Yc(0) + Rk * s;
  defs += zavoj(`${id}-vh`, p.hluboky, yHore + (yDole - yHore) * 0.35, yDole, 0, 0.16);
  /* Krakelé je vidět hlavně hlouběji, kde je glazura tlustší */
  defs += `<linearGradient id="${id}-kg" gradientUnits="userSpaceOnUse" x1="0" y1="${f(yHore)}" x2="0" y2="${f(yDole)}"><stop offset=".15" stop-color="#000"/><stop offset=".7" stop-color="#FFF"/></linearGradient>` +
    `<mask id="${id}-km" maskUnits="userSpaceOnUse" x="-45" y="${f(yHore - 2)}" width="90" height="${f(yDole - yHore + 4)}"><rect x="-45" y="${f(yHore - 2)}" width="90" height="${f(yDole - yHore + 4)}" fill="url(#${id}-kg)"/></mask>`;
  defs += `<clipPath id="${id}-k"><ellipse cx="0" cy="${f(pv.Yc(0))}" rx="${Rk}" ry="${f(Rk * s)}"/></clipPath>`;
  defs += `<clipPath id="${id}-ki"><ellipse cx="0" cy="${f(pv.Yc(1.7))}" rx="${RI}" ry="${f(RI * s)}"/></clipPath>`;
  let k = elipsa(pv, 0, Rk, `fill="url(#${id}-ri)"`);
  let st = elipsa(pv, 1.7, RI, `fill="url(#${id}-v)"`) + elipsa(pv, 1.7, RI, `fill="url(#${id}-vh)"`);
  /* Krakelé na zadní stěně, otáčí se s hrnkem */
  if (p.v > 0.4) {
    const A = rad(a), dole = yDole + 1;
    const bod = (u: number, y: number): Bod | null => {
      const th = u / RI + A + Math.PI;
      if (Math.cos(th) > 0.02) return null;
      const R = Math.min(RI, Rout(y) - 3.4);
      return pv.P(R * Math.sin(th), y, R * Math.cos(th));
    };
    KRAKELE.forEach((sit, uroven) => {
      let d = "";
      for (const [u1, y1, uc, yc, u2, y2] of sit) {
        const P = bod(u1, y1), C = bod(uc, yc), Q = bod(u2, y2);
        if (!P || !C || !Q || Math.min(P[1], Q[1]) > dole) continue;
        d += `M${f1(P[0])} ${f1(P[1])}Q${f1(C[0])} ${f1(C[1])} ${f1(Q[0])} ${f1(Q[1])}`;
      }
      if (d) st += `<path d="${d}" fill="none" stroke="${p.krak}" stroke-width="${uroven ? 0.07 : 0.1}" stroke-linecap="round" opacity="${f((uroven ? 0.16 : 0.24) * hladce(0.4, 1, p.v))}" mask="url(#${id}-km)"/>`;
    });
  }
  /* Lesk: lesklejší glazura uvnitř odráží světlo — měkký svislý pruh tam, kde normála
     stěny míří mezi světlo a oko */
  const hx = sv.L[0] + pv.V[0], hz = sv.L[2] + pv.V[2], lx = omez(-hx / (Math.hypot(hx, hz) || 1), -0.8, 0.8) * RI;
  defs += `<radialGradient id="${id}-vl"><stop offset="0" stop-color="${p.bila}" stop-opacity=".5"/><stop offset=".55" stop-color="${p.bila}" stop-opacity=".2"/><stop offset="1" stop-color="${p.bila}" stop-opacity="0"/></radialGradient>`;
  st += `<ellipse cx="${f(lx)}" cy="${f(yHore + (yDole - yHore) * 0.42)}" rx="${f(3.2 * Math.sqrt(1 - (lx / RI) ** 2))}" ry="${f((yDole - yHore) * 0.5)}" fill="url(#${id}-vl)" opacity="${f(0.7 * p.v)}"/>`;
  /* Vržený stín obruby na vnitřní stěně: paprsek ke světlu musí vylézt otvorem */
  const L = sv.L, Lh = Math.hypot(L[0], L[2]), dx = L[0] / Lh, dz = L[2] / Lh, strmost = -L[1] / Lh;
  const hrana = (posun: number) => {
    const o: Bod[] = [];
    for (let i = 0; i <= 40; i++) {
      const th = Math.PI / 2 + (Math.PI * i) / 40;
      const px = RI * Math.sin(th), pz = RI * Math.cos(th), pd = px * dx + pz * dz;
      const y = pd >= 0 ? 1.7 : 1.7 - 2 * pd * strmost + posun;
      o.push(pv.P(px, Math.min(y, 72), pz));
    }
    /* hrana jde zprava doleva; stín je všechno pod ní */
    const pr = o[0], le = o[o.length - 1];
    return D([...o, [le[0] - 20, le[1]], [le[0] - 20, 140], [pr[0] + 20, 140], [pr[0] + 20, pr[1]]]);
  };
  const tma = mix(p.hluboky, "#3A2814", 0.4);
  st += `<path d="${hrana(-1.6)}" fill="${tma}" opacity="${f(sv.vrzeny * 0.2)}"/><path d="${hrana(0)}" fill="${tma}" opacity="${f(sv.vrzeny * 0.35)}"/>`;
  k += `<g clip-path="url(#${id}-ki)">${st}</g>`;
  /* Jezírko na dně — vidět až při velkém nadhledu */
  if (s > 0.68) {
    const A = rad(a), ca = Math.cos(A), sa = Math.sin(A);
    const dno = (LOUZE as Bod[]).map(([x, z]) => pv.P(x * ca + z * sa, 66.2, -x * sa + z * ca));
    k += elipsa(pv, 66.3, 31, `fill="${ze(p.vnitr, 0.62)}"`) + `<path d="${hladkaD(dno)}" fill="${p.bila}" opacity="${f(0.32 * p.v)}"/>`;
  }
  return { defs, kresba: `<g clip-path="url(#${id}-k)">${k}</g>` };
}

/* ——— Obrys pro ořez, záři a odraz ——— */
export function obrys(v: { uhel?: number; nadhled?: number } = {}): string {
  const pv = pohled(v.nadhled ?? 12), a = v.uhel ?? 62, T = telo(pv);
  const P3 = (b: Bod3) => pv.P(b[0], b[1], b[2]);
  let d = T.d;
  for (let i = 0; i < VYSTUPKY.length; i++) {
    let h = hull(hrouda(i, a).slice(1).flat().map(P3)) as Bod[];
    if (h.length < 3) continue;
    if (Math.sign(plocha(h)) !== T.znamenko) h = h.reverse();
    d += D(h);
  }
  return d;
}

/* ——— Podobizna ——— */
export function podobizna(v: PodobiznaVolby): string {
  const id = v.id, a = v.uhel ?? 62, pv = pohled(v.nadhled ?? 12), sv = SVETLA[v.svetlo ?? "vlevo"], p = paleta(v.vypal ?? 1);
  const T = telo(pv), s = pv.s, B = p.B;
  const P3 = (b: Bod3) => pv.P(b[0], b[1], b[2]);
  const defs: string[] = [];
  const out: string[] = [];

  /* Tělo, patka a obruba: válcové přechody z jednoho světla */
  defs.push(`<path id="${id}-o" d="${T.d}"/><clipPath id="${id}-c"><use href="#${id}-o"/></clipPath>`);
  defs.push(valec(`${id}-t`, 42, p.glaz, (x, c) => [x, 0, c], sv, pv));
  defs.push(valec(`${id}-p`, 36.2, p.patka, (x, c) => [x, 0.2, c], sv, pv));
  defs.push(valec(`${id}-r`, 42, p.glaz, (x, c) => [0.7 * x, -0.66, 0.7 * c], sv, pv, 0.03));

  /* Stín na zemi: měkký do ztracena a tmavší přímo pod patkou */
  if (v.stin !== false) {
    const st = sv.stin;
    defs.push(`<radialGradient id="${id}-s"><stop offset="0" stop-color="#2B2420" stop-opacity="${st.sila}"/><stop offset=".5" stop-color="#2B2420" stop-opacity="${f(st.sila * 0.5)}"/><stop offset="1" stop-color="#2B2420" stop-opacity="0"/></radialGradient>`);
    defs.push(`<radialGradient id="${id}-sd"><stop offset=".8" stop-color="#1E1712" stop-opacity="${st.dotek}"/><stop offset="1" stop-color="#1E1712" stop-opacity="0"/></radialGradient>`);
    out.push(`<ellipse cx="${st.dx}" cy="${f(PY + 0.8)}" rx="${st.rx}" ry="${f(Math.max(3, st.rx * s * 0.82 + 2.2))}" fill="url(#${id}-s)"/>`);
    out.push(`<ellipse cx="${f(st.dx * 0.12)}" cy="${f(PY + 0.35)}" rx="${f(38.4)}" ry="${f(35.6 * s + 1.3)}" fill="url(#${id}-sd)"/>`);
  }

  /* Výstupky: zadní části před tělem, ostatní po něm */
  const V = [0, 1].map((i) => vystupek(i, a, pv, sv, p, id, P3));
  for (const x of V) defs.push(x.defs);

  out.push(`<use href="#${id}-o" fill="url(#${id}-t)"/>`);

  /* Na těle, v ořezu obrysu */
  const g: string[] = [];
  /* Tenká glazura pod obrubou se probarví do oranžova */
  defs.push(zavoj(`${id}-oh`, mix(B.hiiroSvetle, B.stekani, 0.62), pv.Yc(1.7) + 40 * s, pv.Yc(9) + 40 * s, 0.15 * p.v, 0));
  g.push(`<path d="${pas(pv, 1.7, 11)}" fill="url(#${id}-oh)"/>`);
  g.push(oblaka(a, pv, p, P3, id));
  /* Glazura stekla dolů a nad patkou zhoustla: bělejší pás */
  defs.push(`<linearGradient id="${id}-hu" gradientUnits="userSpaceOnUse" x1="0" y1="${f(pv.Yc(44) + 40 * s)}" x2="0" y2="${f(pv.Yc(72) + 37 * s)}"><stop offset="0" stop-color="${p.bila}" stop-opacity="0"/><stop offset=".72" stop-color="${p.bila}" stop-opacity="${f(0.22 * p.v)}"/><stop offset="1" stop-color="${p.bila}" stop-opacity="0"/></linearGradient>`);
  g.push(`<path d="${pas(pv, 44, 72.6)}" fill="url(#${id}-hu)"/>`);
  defs.push(mekkyPruh(`${id}-sk`, p.steky), maskaSteku(id, pv.Yc(8) + 40 * s, pv.Yc(66) + 40 * s));
  g.push(stekani(a, p, P3, id));
  g.push(dirky(a, pv, p, P3));
  /* Oblouk nad patkou se stáčí dolů od světla, u země tma; reflektor shora tmavne dolů celý */
  const tma = (y1: number, y2: number, o1: number, o2: number, k: string) => {
    defs.push(zavoj(`${id}-${k}`, mix(p.hluboky, "#6A4A2A", 0.4), pv.Yc(y1) + 40 * s, pv.Yc(y2) + 38 * s, o1, o2));
    g.push(`<path d="${pod(pv, y1)}" fill="url(#${id}-${k})"/>`);
  };
  const ref = jas([0, 0, 1], sv, pv), dole = jas(norm([0, 0.75, 1]), sv, pv);
  tma(62, 73.5, 0, omez((ref - dole) * 0.5 + 0.05), "ao");
  if (sv.spad > 0.1) {
    /* Reflektor shora: vršek se rozsvítí, tělo dolů tmavne */
    tma(10, 74, 0, sv.spad, "sp");
    defs.push(zavoj(`${id}-sv`, p.bila, pv.Yc(1.7) + 40 * s, pv.Yc(26) + 40 * s, sv.spad * 0.9, 0));
    g.push(`<path d="${pas(pv, 1.7, 30)}" fill="url(#${id}-sv)"/>`);
  }
  for (const x of V) g.push(x.naTele);
  /* Patka: holá kamenina pod hranou glazury, oranžový proužek hiiro a zaoblená hrana glazury */
  g.push(`<path d="${pod(pv, 73)}" fill="url(#${id}-p)"/>`);
  defs.push(zavoj(`${id}-pt`, p.hluboky, pv.Yc(73.6) + 36 * s, pv.Yc(76) + 35.6 * s, 0, 0.3));
  g.push(`<path d="${pod(pv, 73.6)}" fill="url(#${id}-pt)"/>`);
  g.push(`<path d="${predni(pv, 73.5, Rout(73.5) + 0.3)}" fill="none" stroke="${mix(B.hiiro, B.hiiroTma, 0.55)}" stroke-width=".62" opacity="${f(0.8 * p.v)}"/>`);
  g.push(`<path d="${predni(pv, 73.3, Rout(73.3) + 0.3)}" fill="none" stroke="${B.hiiro}" stroke-width=".26" opacity="${f(0.5 * p.v)}"/>`);
  g.push(`<path d="${predni(pv, 72.75, Rout(72.75) + 0.3)}" fill="none" stroke="${p.bila}" stroke-width=".45" opacity=".55"/>`);
  out.push(`<g clip-path="url(#${id}-c)">${g.join("")}</g>`);

  /* Obruba vpředu: zaoblený pás mezi hřbetem a vnější hranou */
  if (s > 0.004) out.push(`<path d="${predni(pv, 0, 40.3)}${predniZpet(pv, 1.7, 42)}Z" fill="url(#${id}-r)"/>`);
  else out.push(`<path d="M-42 ${f(pv.Yc(0))}H42V${f(pv.Yc(1.7))}H-42Z" fill="url(#${id}-r)" clip-path="url(#${id}-c)"/>`);
  const vn = vnitrek(a, pv, sv, p, id);
  defs.push(vn.defs);
  out.push(vn.kresba);
  /* Hřbet obruby chytá světlo */
  defs.push(`<linearGradient id="${id}-h" gradientUnits="userSpaceOnUse" x1="-40.3" y1="0" x2="40.3" y2="0"><stop offset="0" stop-color="${p.bila}" stop-opacity=".85"/><stop offset=".4" stop-color="${p.bila}" stop-opacity=".95"/><stop offset="1" stop-color="${p.bila}" stop-opacity=".25"/></linearGradient>`);
  if (s > 0.004) out.push(`<path d="${predni(pv, 0.15, 40.3)}" fill="none" stroke="url(#${id}-h)" stroke-width=".5"/><path d="M40.3 ${f(pv.Yc(0.1))}A40.3 ${f(40.3 * s)} 0 0 0 -40.3 ${f(pv.Yc(0.1))}" fill="none" stroke="url(#${id}-h)" stroke-width=".35" opacity=".65"/>`);
  else out.push(`<path d="M-40.3 ${f(pv.Yc(0.15))}H40.3" stroke="url(#${id}-h)" stroke-width=".45"/>`);
  out.push(tecky(a, pv, p, id));

  for (const x of V) out.push(x.predni);

  return `<defs>${defs.join("")}</defs>${out.join("")}`;
}

/* ——— Výstupek zblízka: makro pro kapitolu Podpis ——— */
export const VYSTUPEK = { viewBox: "-21 -14 42 28", w: 42, h: 28 };

/** Dírky a oblaka kolem výstupku v makru: [u po obvodu, v dolů, velikost] v mm od středu paty */
const R9 = rng(907);
const DIRKY_MAKRO = Array.from({ length: 60 }, () => [(R9() - 0.5) * 46, (R9() - 0.5) * 32, 0.08 + R9() ** 2.4 * 0.18])
  .filter(([u, v]) => Math.hypot(u / 1.25, v) > 9.5)
  .slice(0, 17);
const OBLAKA_MAKRO: [number, number, number, number, number][] = [
  [-14, -7, 13, 9, 1],
  [13, 10, 15, 8, 1],
  [-12, 8, 14, 9, 0],
];

export function vystupekZblizka(v: { id: string; vypal?: number }): string {
  const id = v.id, p = paleta(v.vypal ?? 1), sv = SVETLA.vlevo, a = 18, pv = pohled(8), nb = VYSTUPKY[0];
  const A = rad(a), R0 = Rout(nb.y), R = R0 + nb.p * 0.45;
  const [sx, sy] = pv.P(R * Math.sin(A), nb.y, R * Math.cos(A));
  const P3 = (b: Bod3): Bod => {
    const q = pv.P(b[0], b[1], b[2]);
    return [q[0] - sx, q[1] - sy];
  };
  /** Bod stěny kolem výstupku: u po obvodu, v dolů od středu paty */
  const naStenu = (u: number, v2: number) => P3(naStene(A + u / R0, nb.y + v2));
  const defs: string[] = [];
  const out: string[] = [];

  /* Stěna: kus válce přes celý rámeček, světlo zleva — vpravo se stáčí do stínu */
  const b: [number, string][] = [];
  for (let i = 0; i <= 12; i++) {
    const x = -21 + (42 * i) / 12, q = omez((x + sx) / R0, -1, 1);
    b.push([i / 12, ze(p.glaz, jas([q, 0, Math.sqrt(1 - q * q)], sv, pv))]);
  }
  defs.push(`<linearGradient id="${id}-t" gradientUnits="userSpaceOnUse" x1="-21" y1="0" x2="21" y2="0">${stopy(b)}</linearGradient>`);
  out.push(`<rect x="-21" y="-14" width="42" height="28" fill="url(#${id}-t)"/>`);

  /* Glazura: oblaka, stékání, dírky — zblízka jich je vidět víc */
  if (p.v > 0.05) {
    defs.push(`<radialGradient id="${id}-ob"><stop offset="0" stop-color="${p.bila}" stop-opacity=".5"/><stop offset="1" stop-color="${p.bila}" stop-opacity="0"/></radialGradient>` +
      `<radialGradient id="${id}-ot"><stop offset="0" stop-color="${mix(p.B.hiiroSvetle, p.B.shino, 0.45)}" stop-opacity=".2"/><stop offset="1" stop-color="${p.B.hiiroSvetle}" stop-opacity="0"/></radialGradient>`);
    for (const [u, v2, w, h, bila] of OBLAKA_MAKRO) {
      const [x, y] = naStenu(u, v2);
      out.push(`<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(w / 2)}" ry="${f(h / 2)}" fill="url(#${id}-${bila ? "ob" : "ot"})" opacity="${f((bila ? 0.6 : 0.45) * p.v)}"/>`);
    }
  }
  defs.push(mekkyPruh(`${id}-sk`, p.steky), maskaSteku(id, -60, 60));
  out.push(stekani(a - 6, p, P3, id, 1.2));
  if (p.v > 0.05) {
    const tma = mix(p.B.shinoStin, "#4E3C28", 0.55);
    for (const [u, v2, r] of DIRKY_MAKRO) {
      const [x, y] = naStenu(u, v2), rx = r * Math.cos(A + u / R0), ry = r * pv.c;
      out.push(`<ellipse cx="${f(x + rx * 0.22)}" cy="${f(y + ry * 0.3)}" rx="${f(rx)}" ry="${f(ry)}" fill="${p.bila}" opacity="${f(0.85 * p.v)}"/>` +
        `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" fill="${tma}" opacity="${f(0.34 * p.v)}"/>`);
    }
  }

  /* Výstupek; stín zblízka měkne rozostřením (makro je statické, filtr nic nestojí) */
  const x = vystupek(0, a, pv, sv, p, id, P3, true);
  defs.push(x.defs, `<filter id="${id}-sf" x="-25%" y="-25%" width="150%" height="150%"><feGaussianBlur stdDeviation=".42"/></filter>`);
  out.push(`<g filter="url(#${id}-sf)">${x.naTele}</g>`, x.predni);
  return `<defs>${defs.join("")}</defs>${out.join("")}`;
}

/** Všechny kanji a kana, které kresby píšou — stránky je přidají do písma */
export const ZNAKY_PODOBIZNY = "";
