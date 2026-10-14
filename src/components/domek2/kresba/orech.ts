/**
 * Ořech na úvodu webu — starý ořešák královský, který stojí vpravo jako
 * rám obrazu. Kmen je krátký a mohutný, u země se rozbíhá do kořenů,
 * kůra je stříbřitá a rozbrázděná a v dutině bydlí veverka. Jedna dlouhá
 * větev se natahuje doleva přes nebe, nízká větev se sklání k domku.
 *
 * Kostra koruny se nekreslí ručně, ale roste: šest hlavních větví je
 * pevných a zbytek dorůstá algoritmem kolonizace prostoru (Runions a spol.,
 * 2007) do obrysu koruny — větvičky se natahují k bodům rozházeným
 * v obrysu, dokud je všechny nepohltí. Tloušťky jdou od konců ke kmeni
 * jako trubky (součet průřezů dětí). V zimě je tak strom holý a pořád
 * hezký a listí v létě sedí na koncích větviček, které ho nesou.
 *
 * Listí je stínované jako kupovitý mrak: na každém konci větvičky tmavý
 * kotouč, přes něj světlejší posunutý doleva nahoru a nakonec světlo —
 * dohromady dají hrbolatou hmotu s tmavým spodkem. Lístky (opravdové
 * lichozpeřené listy ořešáku) jsou jen na okrajích, kde lámou obrys.
 *
 * Světlo je ranní: slunce vychází vlevo nízko nad kopci, takže levé hrany
 * kmene, větví i koruny dostávají teplý lem a pravé strany jsou ve
 * fialovém stínu.
 *
 * Náhoda je deterministická (nahoda ze seedu), aby se strom při každém
 * buildu nakreslil stejně.
 *
 * Vrstvy (každá ve vlastním <svg>, kvůli schovávání Vázičky, let-kami.ts):
 *   zadni   tmavé listí vzadu
 *   kmen    kmen, kořeny, všechny větve, dutina s veverkou, sníh
 *   predni  světlé listí vpředu, ořechy, jehnědy, mladé lístky
 *
 * Roční období řeší jen CSS (orechStyly): barvy podle tříd a skupiny, které
 * se v daném období ukazují (data-sezona na sekci).
 */
import { nahoda } from "./zaklad";
import { type Bod, f, lerp, omez, hladce, vzdal, vzorkuj, hladka, lomena, celaCisla } from "./krivky";

export type Sezona = "zima" | "predjari" | "jaro" | "leto" | "podzim";

/** Plátno stromu; CSS podle něj staví poměr stran a posun k ose kmene */
export const ORECH = { sirka: 1800, vyska: 1400, zem: 1300, osa: 1170, vidlice: 930 } as const;

const c0 = (n: number) => Math.round(n);
const stupne = (r: number) => (r * 180) / Math.PI;

/* ═══ Pás podél osy — větve, kořeny i sníh na nich ═══ */

interface Osa { b: Bod[]; w: number[] }

/** Normála v každém bodě osy */
function normaly(b: Bod[]): Bod[] {
  return b.map((_, i) => {
    const a = b[Math.max(0, i - 1)], c = b[Math.min(b.length - 1, i + 1)];
    const dx = c[0] - a[0], dy = c[1] - a[1], l = Math.hypot(dx, dy) || 1;
    return [-dy / l, dx / l];
  });
}

/**
 * Obrys pásu mezi dvěma posuny od osy (v násobcích půlky tloušťky; −1 je
 * jedna hrana a 1 druhá). Plný obrys větve je pas(osa, −1, 1) se zakulacenou
 * špičkou; světlo a stín jsou užší pásy u jedné hrany. `nabeh` je část
 * délky, na které pás nabíhá z nuly — světlo větve tak nezačíná rovnou
 * čarou uprostřed vidlice.
 */
function pas(o: Osa, od: number, po: number, spicka = false, nabeh = 0): Bod[] {
  const n = normaly(o.b);
  const A: Bod[] = [], B: Bod[] = [];
  const N = o.b.length - 1;
  for (let i = 0; i <= N; i++) {
    const [x, y] = o.b[i], h = o.w[i] / 2;
    const k = nabeh > 0 ? hladce(i / N / nabeh) : 1;
    const vnitrni = od + (po - od) * k;
    A.push([x + n[i][0] * od * h, y + n[i][1] * od * h]);
    B.push([x + n[i][0] * vnitrni * h, y + n[i][1] * vnitrni * h]);
  }
  if (spicka) {
    const p = o.b[N], q = o.b[Math.max(0, N - 1)];
    const l = vzdal(p, q) || 1;
    A.push([p[0] + ((p[0] - q[0]) / l) * o.w[N] * 0.45, p[1] + ((p[1] - q[1]) / l) * o.w[N] * 0.45]);
  }
  return [...A, ...B.reverse()];
}

/** Směr ke slunci (vlevo, nízko): která strana osy na něj kouká, +1 nebo −1 */
const SLUNCE: Bod = [-0.94, 0.34];
function stranaSlunce(o: Osa): number {
  let s = 0;
  normaly(o.b).forEach((v) => (s += v[0] * SLUNCE[0] + v[1] * SLUNCE[1]));
  return s >= 0 ? 1 : -1;
}

/* ═══ Kostra: pevné hlavní větve a růst do obrysu koruny ═══ */

/** Hlavní větve od vidlice ven: řídicí body, tloušťka na začátku a na konci, odkud raší */
const KONCETINY: { P: Bod[]; w: [number, number]; od: number }[] = [
  /* dlouhá levá — rám přes nebe; nad nadpisem jde vysoko */
  { P: [[1150, 960], [1090, 820], [1012, 690], [920, 552], [820, 452], [702, 382], [566, 338], [430, 314], [314, 306], [226, 310]], w: [104, 12], od: 0.34 },
  /* šikmo vzhůru vlevo */
  { P: [[1160, 950], [1122, 808], [1076, 650], [1028, 478], [996, 306], [988, 150]], w: [94, 14], od: 0.3 },
  /* vůdčí výhon */
  { P: [[1190, 945], [1200, 790], [1214, 610], [1230, 428], [1250, 246], [1272, 84]], w: [104, 14], od: 0.28 },
  /* šikmo vzhůru vpravo */
  { P: [[1218, 950], [1292, 826], [1384, 684], [1474, 544], [1562, 404], [1644, 272]], w: [92, 14], od: 0.3 },
  /* nízká pravá, skoro vodorovná — odchází za okraj */
  { P: [[1240, 985], [1344, 916], [1464, 864], [1594, 826], [1724, 802], [1830, 796]], w: [80, 22], od: 0.3 },
  /* nízká levá, sklání se k domku */
  { P: [[1110, 1010], [1052, 962], [976, 914], [896, 884], [826, 874]], w: [64, 12], od: 0.4 },
];

/**
 * Obrys koruny jako sjednocení elips, s pár okny, kterými jsou vidět větve
 * a nebe. Vlevo (x < 820) koruna nesmí pod y 432 — tam na užších
 * obrazovkách začíná nadpis.
 */
const OBRYS: [number, number, number, number][] = [
  [1270, 300, 470, 300], [1600, 520, 250, 220], [1100, 150, 280, 170], [1500, 170, 300, 190],
  [1080, 620, 210, 130], [1400, 650, 240, 140], [930, 420, 170, 130], [880, 800, 120, 74],
  [700, 320, 160, 100], [500, 268, 150, 86], [320, 262, 110, 66], [1720, 720, 140, 90],
];
const OKNA: [number, number, number][] = [[968, 566, 62], [1338, 548, 56], [1152, 352, 44], [1530, 356, 46], [800, 300, 34]];
const vObrysu = (x: number, y: number) =>
  OBRYS.some(([cx, cy, rx, ry]) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1) &&
  !OKNA.some(([cx, cy, r]) => (x - cx) ** 2 + (y - cy) ** 2 < r * r) &&
  !(x < 820 && y > 432);

interface Uzel { x: number; y: number; r: number; d: number[]; w: number; pevny: boolean; muze: boolean }

function kostra() {
  const R = nahoda(4207);
  const uzly: Uzel[] = [];

  /*
   * Pevné hlavní větve — uzly po 18 jednotkách, řídicí body trochu
   * pokroucené. Rašit smí jen pupen zhruba po čtyřech uzlech (a konec),
   * jinak by z každého uzlu vyrostla větvička a podél větve stál hřeben.
   */
  const zacatky: number[] = [];
  KONCETINY.forEach((k) => {
    const P = k.P.map(([x, y], i): Bod => (i ? [x + (R() - 0.5) * 16, y + (R() - 0.5) * 16] : [x, y]));
    const b = vzorkuj(P, 18);
    zacatky.push(uzly.length);
    const posun = Math.floor(R() * 4);
    b.forEach(([x, y], i) => {
      const t = i / (b.length - 1);
      const pupen = t >= k.od && ((i + posun) % 4 === 0 || i === b.length - 1);
      uzly.push({ x, y, r: i ? uzly.length - 1 : -1, d: [], w: lerp(k.w[0], k.w[1], Math.pow(t, 0.8)), pevny: true, muze: pupen });
      if (i) uzly[uzly.length - 2].d.push(uzly.length - 1);
    });
  });

  /* body, ke kterým se roste */
  const cile: Bod[] = [];
  while (cile.length < 3600) {
    const x = 160 + R() * 1700, y = -60 + R() * 960;
    if (vObrysu(x, y)) cile.push([x, y]);
  }

  /* mřížka všech uzlů pro rychlé hledání nejbližšího */
  const D = 14, DI = 160, DK = 19, BUNKA = DI;
  const mrizka = new Map<string, number[]>();
  const vloz = (i: number) => {
    const k = `${Math.floor(uzly[i].x / BUNKA)},${Math.floor(uzly[i].y / BUNKA)}`;
    (mrizka.get(k) ?? mrizka.set(k, []).get(k)!).push(i);
  };
  uzly.forEach((_, i) => vloz(i));
  /** Nejbližší uzel vůbec (podle něj bod zaniká) a nejbližší, který smí růst */
  const nejblizsi = (x: number, y: number) => {
    const cx = Math.floor(x / BUNKA), cy = Math.floor(y / BUNKA);
    let vse = Infinity, best = -1, bd = DI;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
      for (const i of mrizka.get(`${cx + a},${cy + b}`) ?? []) {
        const d = Math.hypot(uzly[i].x - x, uzly[i].y - y);
        if (d < vse) vse = d;
        if (uzly[i].muze && d < bd) { bd = d; best = i; }
      }
    }
    return { vse, i: best, d: bd };
  };

  let zbyva = cile;
  for (let kolo = 0; kolo < 320 && zbyva.length; kolo++) {
    const smery = new Map<number, [number, number, number]>();
    const dal: Bod[] = [];
    for (const c of zbyva) {
      const { vse, i, d } = nejblizsi(c[0], c[1]);
      if (vse < DK) continue;
      dal.push(c);
      /* bod u větve, která rašit nesmí, nikoho netahá — počká, až k němu doroste jiná */
      if (i < 0 || d > vse + 40) continue;
      const s = smery.get(i) ?? [0, 0, 0];
      s[0] += (c[0] - uzly[i].x) / d;
      s[1] += (c[1] - uzly[i].y) / d;
      s[2]++;
      smery.set(i, s);
    }
    zbyva = dal;
    if (!smery.size) break;
    for (const [i, s] of smery) {
      const u = uzly[i];
      if (u.d.length >= 3) continue;
      let dx = s[0] / s[2], dy = s[1] / s[2];
      const l0 = Math.hypot(dx, dy);
      if (l0 < 0.15) continue;
      /* ořešák má konce větví mírně zdvižené a koruna se rozkládá do stran */
      dx = dx / l0 + (u.x - ORECH.osa) * 0.00016 + (R() - 0.5) * 0.24;
      dy = dy / l0 - 0.14 + (R() - 0.5) * 0.24;
      const l = Math.hypot(dx, dy);
      const x = u.x + (dx / l) * D, y = u.y + (dy / l) * D;
      if (x < 820 && y > 440) continue;
      if (u.d.some((c) => Math.hypot(uzly[c].x - x, uzly[c].y - y) < D * 0.45)) continue;
      uzly.push({ x, y, r: i, d: [], w: 0, pevny: false, muze: true });
      u.d.push(uzly.length - 1);
      vloz(uzly.length - 1);
    }
  }

  /* tloušťky od konců jako trubky */
  const KONEC_W = 2.6, EXP = 2.25;
  const poradi: number[] = [];
  const zasobnik = [...zacatky];
  while (zasobnik.length) {
    const i = zasobnik.pop()!;
    poradi.push(i);
    zasobnik.push(...uzly[i].d);
  }
  const listu = new Array(uzly.length).fill(0);
  for (let j = poradi.length - 1; j >= 0; j--) {
    const u = uzly[poradi[j]];
    if (!u.d.length) {
      listu[poradi[j]] = 1;
      if (!u.pevny) u.w = KONEC_W;
      continue;
    }
    listu[poradi[j]] = u.d.reduce((s, c) => s + listu[c], 0);
    const w = Math.pow(u.d.reduce((s, c) => s + Math.pow(uzly[c].w, EXP), 0), 1 / EXP);
    u.w = u.pevny ? Math.max(u.w, w) : Math.min(w * 1.05, 34);
  }

  /* vyhlazení dorostlých uzlů — mřížka růstu dělá zuby */
  for (let it = 0; it < 4; it++) {
    for (const u of uzly) {
      if (u.pevny || u.r < 0 || !u.d.length) continue;
      const p = uzly[u.r];
      const c = uzly[u.d.reduce((a, b) => (listu[a] >= listu[b] ? a : b))];
      u.x = u.x * 0.5 + (p.x + c.x) * 0.25;
      u.y = u.y * 0.5 + (p.y + c.y) * 0.25;
    }
  }

  /* řetězy: větev pokračuje dítětem s nejvíc konci, ostatní děti začínají nové */
  const retezy: { u: number[]; hlavni: boolean }[] = [];
  /*
   * Řetěz končí i tam, kde pevná hlavní větev přechází v dorostlou nebo kde
   * větev ostře zatočí — obrys jednoho pásu by se v takovém lomu sám
   * překřížil. Pokračování pak začne jako nový řetěz od lomu.
   */
  const ostre = (a: number, b: number, c: number) => {
    const ux = uzly[b].x - uzly[a].x, uy = uzly[b].y - uzly[a].y, vx = uzly[c].x - uzly[b].x, vy = uzly[c].y - uzly[b].y;
    return (ux * vx + uy * vy) / ((Math.hypot(ux, uy) * Math.hypot(vx, vy)) || 1) < 0.45;
  };
  const zacni = (start: number, rodic: number, hlavni: boolean) => {
    const r: number[] = rodic >= 0 ? [rodic, start] : [start];
    let i = start;
    for (;;) {
      const d = uzly[i].d;
      if (!d.length) break;
      const dal = d.reduce((a, b) => (listu[a] >= listu[b] ? a : b));
      d.forEach((c) => c !== dal && zacni(c, i, false));
      const lom = (uzly[i].pevny && !uzly[dal].pevny) || (r.length > 1 && ostre(r[r.length - 2], i, dal));
      if (lom) {
        zacni(dal, i, false);
        break;
      }
      r.push(dal);
      i = dal;
    }
    retezy.push({ u: r, hlavni });
  };
  zacatky.forEach((z) => zacni(z, -1, true));

  const konce = uzly.map((_, i) => i).filter((i) => !uzly[i].d.length);
  return { uzly, retezy, konce };
}

/* ═══ Kmen a kořeny ═══ */

/** Hrany kmene od země až do vidlice, kde se schovají pod hlavní větve */
const KMEN_L: Bod[] = [[1004, 1312], [1048, 1268], [1066, 1206], [1070, 1136], [1066, 1066], [1060, 1004], [1068, 952], [1090, 900]];
const KMEN_P: Bod[] = [[1368, 1312], [1304, 1272], [1278, 1208], [1270, 1138], [1274, 1068], [1286, 1008], [1304, 962], [1322, 920]];
const KORENY: { P: Bod[]; w: [number, number] }[] = [
  { P: [[1086, 1250], [1028, 1282], [962, 1306], [888, 1324]], w: [84, 9] },
  { P: [[1130, 1286], [1080, 1316], [1030, 1338]], w: [44, 8] },
  { P: [[1256, 1252], [1330, 1284], [1410, 1306], [1490, 1318]], w: [76, 9] },
  { P: [[1220, 1290], [1276, 1320], [1322, 1340]], w: [38, 7] },
  { P: [[1168, 1292], [1174, 1326], [1188, 1350]], w: [46, 9] },
];
/** Dutina, ve které bydlí veverka */
export const DUTINA = { x: 1126, y: 1086, rx: 24, ry: 35 };
/** Kde je kmen nejužší — schovka za kmenem (let-kami.ts): hrany a rozsah výšky */
export const KMEN_SCHOVKA = { l: 1068, r: 1272, y0: 1000, y1: 1230 };

/** Okraje kmene ve výšce y (lineárně mezi body hran) */
function kmenX(y: number): [number, number] {
  const hrana = (H: Bod[]) => {
    for (let i = 0; i < H.length - 1; i++) {
      const [x0, y0] = H[i], [x1, y1] = H[i + 1];
      if ((y <= y0 && y >= y1) || (y >= y0 && y <= y1)) return lerp(x0, x1, (y - y0) / (y1 - y0 || 1));
    }
    return H[y > H[0][1] ? 0 : H.length - 1][0];
  };
  return [hrana(KMEN_L), hrana(KMEN_P)];
}

/** Pás po výšce kmene mezi dvěma poměry šířky (0 levá hrana, 1 pravá), nahoře vyběhne do hrany */
function pasKmene(od: number, po: number, vrch = 990): Bod[] {
  const A: Bod[] = [], B: Bod[] = [];
  for (let y = 1306; y >= 920; y -= 12) {
    const [xl, xr] = kmenX(y);
    const k = hladce((y - 930) / (vrch - 930));
    const hrana = od < 0.5 ? 0 : 1;
    A.push([lerp(xl, xr, lerp(hrana, od, k)), y]);
    B.push([lerp(xl, xr, lerp(hrana, po, k)), y]);
  }
  return [...A, ...B.reverse()];
}

/* ═══ Listí ═══ */

/** Lístek (čočka) se základnou v [ox, oy], natočený o úhel (0 = vzhůru) */
function listek(ox: number, oy: number, uhel: number, delka: number, sirka: number): string {
  const a = (uhel * Math.PI) / 180, s = Math.sin(a), c = Math.cos(a);
  const t = (x: number, y: number) => `${f(ox + x * c - y * s)} ${f(oy + x * s + y * c)}`;
  const w = sirka / 2;
  return `M${t(0, 0)} C${t(w * 1.1, -delka * 0.18)} ${t(w * 1.05, -delka * 0.72)} ${t(0, -delka)} C${t(-w * 1.05, -delka * 0.72)} ${t(-w * 1.1, -delka * 0.18)} ${t(0, 0)} Z`;
}

/**
 * Lichozpeřený list ořešáku: vřeteno a páry lístků, koncový největší.
 * `zuzit` < 1 ho ukáže z boku (lístky zkrácené).
 */
function zperenyList(delka: number, pary: number, zuzit = 1, rozevreni = 1): string {
  let d = listek(0, -delka * 0.7, 0, delka * 0.36, delka * 0.21 * Math.max(zuzit, 0.55));
  for (let i = 0; i < pary; i++) {
    const q = (i + 1) / (pary + 1);
    const y = -delka * (0.7 - q * 0.62);
    const u = (44 + q * 20) * rozevreni;
    const l = delka * (0.36 - q * 0.1) * (0.55 + zuzit * 0.45);
    const s = delka * (0.18 - q * 0.04) * zuzit;
    d += " " + listek(0, y, u, l, s) + " " + listek(0, y, -u, l, s);
  }
  return d;
}

function symboly(): string {
  const vreteno = (l: number) => `<path d="M0 0 L0 ${f(-l * 0.6)}" stroke="#1E2A12" stroke-opacity="0.16" stroke-width="1.3" fill="none"/>`;
  const sym = (id: string, d: string, l: number) => `<symbol id="${id}" overflow="visible"><path d="${d}"/>${vreteno(l)}</symbol>`;
  return [
    sym("ou-la", zperenyList(58, 3), 58),
    sym("ou-lb", zperenyList(46, 2), 46),
    sym("ou-lc", zperenyList(54, 3, 0.5, 0.7), 54),
    /* jeden lístek — padá z koruny (život stromu) */
    `<symbol id="ou-ld" overflow="visible"><path d="${listek(0, 14, 0, 30, 15)}"/><path d="M0 14 L0 -12" stroke="#1E2A12" stroke-opacity="0.3" stroke-width="1.2"/></symbol>`,
    /* mladé listy na jaře: menší, lístky ještě složené; po třech v trsu na konci větvičky */
    ...[0, 1, 2].map((v) => {
      const R = nahoda(7400 + v);
      const listy = [-0.62, 0, 0.62].map((u, j) => {
        const a = u + (R() - 0.5) * 0.5, zpet = j === 1 ? 0 : 10 + R() * 10, m = 0.85 + R() * 0.3;
        return `<path transform="translate(0 ${f(zpet)}) rotate(${f((a * 180) / Math.PI)}) scale(${f(m)})" d="${zperenyList(34, 2, 0.6, 0.6)}"/>`;
      });
      return `<symbol id="ou-trs${v}" overflow="visible">${listy.join("")}</symbol>`;
    }),
    /* ořech v zelené slupce a na podzim puklý */
    `<symbol id="ou-oa" overflow="visible"><path d="M0 -7 L1.4 -15" stroke="#4E5E2A" stroke-width="2.2" stroke-linecap="round"/><ellipse rx="8.4" ry="9"/><path d="M-8 2.6 A8.4 9 0 0 0 8 2.6 A9.6 9.6 0 0 1 -8 2.6 Z" fill="#1E2A10" fill-opacity="0.22"/><circle cx="-2.8" cy="-3.2" r="3.2" fill="#FFFFFF" fill-opacity="0.3"/><circle cx="3" cy="1.4" r="0.9" fill="#FFFFFF" fill-opacity="0.4"/><circle cx="-1.2" cy="4.2" r="0.8" fill="#FFFFFF" fill-opacity="0.4"/></symbol>`,
    `<symbol id="ou-ob" overflow="visible"><path d="M0 -6 L1.4 -15" stroke="#3B3324" stroke-width="2.2" stroke-linecap="round"/><ellipse cx="0" cy="-1" rx="7" ry="8.2" fill="#C9A274"/><ellipse cx="-2.2" cy="-3.4" rx="2.6" ry="3" fill="#E2C496"/><path d="M0 -9 L0 7" stroke="#8C6A44" stroke-width="1.2"/><path d="M-4.4 -4 C-2.4 -3 -2.6 1 -4.6 2.4 M4.4 -4 C2.4 -3 2.6 1 4.6 2.4" stroke="#A37E52" stroke-width="0.9" fill="none"/><path d="M-9.6 0 C-11 8 -4 12 0 11 C4 12 11 8 9.6 0 C7 4 4 2 3 6 C1 3 -1 3 -3 6 C-4 2 -7 4 -9.6 0 Z"/></symbol>`,
  ].join("");
}

/* ═══ Celý strom ═══ */

/** Schovka v koruně: odkud se k ní letí, kde je schovaná za předními listy a kde vykoukne */
export interface KorunaSchovka { venku: Bod; skryta: Bod; vykuk: Bod; smer: Bod }
export interface OrechMista {
  /** obdélníky [x0, y0, x1, y1] přední a zadní koruny */
  predni: [number, number, number, number];
  zadni: [number, number, number, number];
  kmen: typeof KMEN_SCHOVKA;
  dutina: typeof DUTINA;
  /** odkud můžou padat ořechy a listí */
  orechy: Bod[];
  listi: Bod[];
  /** schovky v přední koruně; `smer` je kudy vykukuje (ven z koruny) */
  koruna: KorunaSchovka[];
}
export interface OrechKresba { defs: string; zadni: string; kmen: string; predni: string; mista: OrechMista }

/** Hladký šum pro rozdělení listí dopředu a dozadu — sousední shluky jdou spolu */
const hloubka = (x: number, y: number) =>
  Math.sin(x / 150 + 1.3) * Math.cos(y / 130 - 0.7) + 0.6 * Math.sin((x + 0.7 * y) / 240 + 2.1);

export function orech(): OrechKresba {
  const { uzly, retezy, konce } = kostra();
  const R = nahoda(5113);

  /* ——— Větve ——— */
  const osy = retezy
    .map((r) => {
      let b: Bod[] = r.u.map((i) => [uzly[i].x, uzly[i].y]);
      let w = r.u.map((i, j) => (j === 0 && r.u.length > 1 && !r.hlavni ? uzly[r.u[1]].w * 1.08 : uzly[i].w));
      const tl = Math.max(...w);
      /* tenčí větve stačí kreslit přes každý druhý uzel — rovné úseky, poloviční cesta */
      if (!r.hlavni && tl < 24 && b.length > 3) {
        const nech = (_: unknown, j: number) => j % 2 === 0 || j === b.length - 1;
        b = b.filter(nech);
        w = w.filter(nech);
      }
      return { b, w, tl, hlavni: r.hlavni };
    })
    .filter((o) => o.b.length > 1)
    .sort((a, b) => a.tl - b.tl);

  const drevo: string[] = [], stin: string[] = [], svetlo: string[] = [], snih: string[] = [], vetvicky: string[] = [];
  for (const o of osy) {
    if (o.tl < 5) {
      /* nejtenčí větvičky jen čarou */
      vetvicky.push(`<path d="M${o.b.map(([x, y]) => `${f(x)} ${f(y)}`).join(" L")}" stroke-width="${f(Math.max(2.4, o.tl * 0.95))}"/>`);
    } else {
      const obrys = pas(o, -1, 1, true);
      drevo.push(`<path d="${o.tl > 34 ? hladka(obrys) : lomena(obrys)}"/>`);
    }
    /* světlo a stín jen na větvích, které jsou delší než široké — na pahýlu by z nich byla skvrna */
    const delka = o.b.reduce((d, p, i) => (i ? d + vzdal(o.b[i - 1], p) : 0), 0);
    if (o.tl >= 9 && delka > o.tl * 3) {
      const s = stranaSlunce(o);
      const nabeh = o.hlavni ? 0.16 : 0.08;
      stin.push(`<path d="${lomena(pas(o, -s, -s * 0.12, false, nabeh))}"/>`);
      svetlo.push(`<path d="${lomena(pas(o, s, s * 0.5, false, nabeh))}"/>`);
    }
    /* sníh leží na horní hraně skoro vodorovných úseků */
    if (o.tl >= 9) {
      const n = normaly(o.b);
      let usek: number[] = [];
      const uzavri = () => {
        if (usek.length > 4) {
          const A: Bod[] = [], B: Bod[] = [];
          usek.forEach((i) => {
            const nahoru = n[i][1] < 0 ? 1 : -1, h = o.w[i] / 2, tl = Math.min(9, o.w[i] * 0.42);
            A.push([o.b[i][0] + n[i][0] * nahoru * (h - 1.5), o.b[i][1] + n[i][1] * nahoru * (h - 1.5)]);
            B.push([o.b[i][0] + n[i][0] * nahoru * (h + tl), o.b[i][1] + n[i][1] * nahoru * (h + tl)]);
          });
          snih.push(`<path d="${hladka([...A, ...B.reverse()])}"/>`);
        }
        usek = [];
      };
      n.forEach((v, i) => (Math.abs(v[1]) > 0.62 && o.w[i] >= 7 ? usek.push(i) : uzavri()));
      uzavri();
    }
  }

  /* výhonky: na každém konci dvě až tři krátké pruty — holá koruna má krajkový okraj */
  const vyhonky: string[] = [];
  konce.forEach((i) => {
    const u = uzly[i], p = uzly[u.r];
    const smer = Math.atan2(u.y - p.y, u.x - p.x);
    const n = 2;
    for (let j = 0; j < n; j++) {
      const a = smer + (j - (n - 1) / 2) * 0.7 + (R() - 0.5) * 0.4 - 0.12;
      const l = 18 + R() * 20, ohyb = (R() - 0.5) * 8;
      const mx = u.x + Math.cos(a) * l * 0.5 - Math.sin(a) * ohyb, my = u.y + Math.sin(a) * l * 0.5 + Math.cos(a) * ohyb;
      vyhonky.push(`M${c0(u.x)} ${c0(u.y)} Q${c0(mx)} ${c0(my)} ${c0(u.x + Math.cos(a) * l)} ${c0(u.y + Math.sin(a) * l)}`);
    }
  });

  /* ——— Kmen ——— */
  const obrysKmene: Bod[] = [...vzorkuj(KMEN_L, 14), [1150, 872], [1210, 868], [1270, 884], ...vzorkuj(KMEN_P, 14).reverse()];
  const koreny: Osa[] = KORENY.map((k) => {
    const b = vzorkuj(k.P, 10);
    return { b, w: b.map((_, i) => lerp(k.w[0], k.w[1], Math.pow(i / (b.length - 1), 0.8))) };
  });

  /* brázdy kůry: pár dlouhých, vlnitých a přerušovaných — kůra, ne síť */
  const brazdy: string[] = [], hrbety: string[] = [];
  [-0.62, -0.34, -0.08, 0.16, 0.38, 0.6, 0.8].forEach((u0, j) => {
    const faze = R() * Math.PI * 2, frekv = 2.2 + R() * 0.8;
    const zlom = 1000 + R() * 220, mezera = 26 + R() * 30;
    const kusy: Bod[][] = [[], []];
    for (let y = 1296; y >= 930; y -= 10) {
      const v = (1296 - y) / 366;
      const [xl, xr] = kmenX(y);
      const u = omez(u0 + 0.06 * Math.sin(v * frekv * Math.PI * 2 + faze), -0.95, 0.95);
      if (Math.abs(y - zlom) < mezera / 2) continue;
      kusy[y > zlom ? 0 : 1].push([lerp(xl, xr, (u + 1) / 2), y]);
    }
    const sirka = u0 > 0 ? 4.2 : 3;
    kusy.forEach((k) => k.length > 3 && brazdy.push(`<path d="${hladka(k, false)}" stroke-width="${sirka}"/>`));
    /* světlý hřbet vedle brázdy na straně ke slunci */
    if (u0 < 0.2) {
      const h = kusy[j % 2].map(([x, y]): Bod => [x - 7, y]);
      if (h.length > 3) hrbety.push(`<path d="${hladka(h, false)}"/>`);
    }
  });
  /* pár šikmých spojek mezi brázdami — kosočtverce kůry ořešáku */
  for (let k = 0; k < 12; k++) {
    const y = 960 + R() * 300, [xl, xr] = kmenX(y), u = -0.6 + R() * 1.3, x = lerp(xl, xr, (u + 1) / 2), s = R() < 0.5 ? 1 : -1;
    brazdy.push(`<path d="M${f(x)} ${f(y)} q${f(s * 9)} ${f(-14)} ${f(s * 13)} ${f(-34)}" stroke-width="2.6"/>`);
  }
  /* brázdy na kořenech a na hlavních větvích u vidlice */
  const kurovina: string[] = [];
  [...koreny, ...osy.filter((o) => o.hlavni)].forEach((o) => {
    const n = normaly(o.b);
    [-0.4, 0.15, 0.55].forEach((u, j) => {
      const b = o.b
        .map((p, i): Bod => [p[0] + n[i][0] * u * o.w[i] * 0.5, p[1] + n[i][1] * u * o.w[i] * 0.5])
        .filter((_, i) => o.w[i] > 22 && i > 2 && i < o.b.length * (0.45 + j * 0.1) && i % 3 === 0);
      if (b.length > 3) kurovina.push(`<path d="${hladka(b, false)}"/>`);
    });
  });

  const d = DUTINA;
  const kmen = `
  <defs>
    <radialGradient id="ou-stin-zem" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#1E2A2E" stop-opacity="0.4"/>
      <stop offset="1" stop-color="#1E2A2E" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="ou-dutina-vyrez"><ellipse cx="${d.x}" cy="${d.y}" rx="${d.rx - 3}" ry="${d.ry - 3}"/></clipPath>
  </defs>
  <ellipse cx="1440" cy="1314" rx="440" ry="40" fill="url(#ou-stin-zem)"/>
  <ellipse cx="1190" cy="1306" rx="260" ry="26" fill="url(#ou-stin-zem)"/>
  <path class="ou-vyhonky" d="${vyhonky.join(" ")}"/>
  <g class="ou-vetvicky" fill="none" stroke-linecap="round" stroke-linejoin="round">${vetvicky.join("")}</g>
  <g class="ou-drevo">${drevo.join("")}${koreny.map((k) => `<path d="${hladka(pas(k, -1, 1, true))}"/>`).join("")}<path d="${hladka(obrysKmene)}"/></g>
  <g class="ou-drevo-stin">${stin.join("")}${koreny.map((k) => `<path d="${lomena(pas(k, 1, 0.1))}"/>`).join("")}<path d="${hladka(pasKmene(0.56, 1.02))}"/></g>
  <g class="ou-drevo-tma"><path d="${hladka(pasKmene(0.84, 1.02, 1020))}"/></g>
  <g class="ou-drevo-svetlo">${svetlo.join("")}${koreny.map((k) => `<path d="${lomena(pas(k, -1, -0.5))}"/>`).join("")}<path d="${hladka(pasKmene(-0.02, 0.2))}"/></g>
  <g class="ou-brazdy" fill="none" stroke-linecap="round">${brazdy.join("")}</g>
  <g class="ou-hrbety" fill="none" stroke-linecap="round" stroke-width="2.2">${hrbety.join("")}</g>
  <g class="ou-kurovina" fill="none" stroke-linecap="round" stroke-width="2.6">${kurovina.join("")}</g>
  <path class="ou-lem" d="${hladka(vzorkuj(KMEN_L, 14).slice(2, -3), false)}" fill="none" stroke-width="5" stroke-linecap="round"/>
  <!-- boule po staré větvi -->
  <g transform="translate(1262 1172)">
    <ellipse rx="30" ry="40" class="ou-boule"/>
    <ellipse rx="22" ry="31" cx="-4" cy="-3" class="ou-boule-svetlo"/>
    <path d="M-14 -22 C-4 -30 10 -24 12 -10 M-10 -10 C-4 -14 4 -12 5 -4" class="ou-boule-cary" fill="none" stroke-width="2.4" stroke-linecap="round"/>
  </g>
  <!-- dutina s napuchlým okrajem, uvnitř veverka -->
  <ellipse cx="${d.x + 3}" cy="${d.y + 2}" rx="${d.rx + 10}" ry="${d.ry + 11}" class="ou-dutina-val"/>
  <path d="M${d.x - d.rx - 9} ${d.y + 8} C${d.x - d.rx - 10} ${d.y - d.ry - 4} ${d.x + d.rx - 6} ${d.y - d.ry - 14} ${d.x + d.rx + 6} ${d.y - 10}" class="ou-dutina-lem" fill="none" stroke-width="6" stroke-linecap="round"/>
  <ellipse cx="${d.x}" cy="${d.y}" rx="${d.rx}" ry="${d.ry}" fill="#251B1A"/>
  <ellipse cx="${d.x + 4}" cy="${d.y + 6}" rx="${d.rx - 8}" ry="${d.ry - 10}" fill="#120C0C"/>
  <g clip-path="url(#ou-dutina-vyrez)"><g class="ou-veverka">${veverkaHlava()}</g></g>
  <g class="ou-snih">${snih.join("")}${snihKmen()}</g>
  ${travaUKmene(R)}`;

  /* ——— Listí ——— */
  type Konec = { x: number; y: number; smer: number; vpredu: boolean; ven: Bod | null };
  const K: Konec[] = konce.map((i) => {
    const u = uzly[i], p = uzly[u.r];
    const h = hloubka(u.x, u.y) + (u.y - 430) / 520 + (u.x < 900 ? 0.55 : 0) - (u.x > 1660 ? 0.3 : 0);
    return { x: u.x, y: u.y, smer: Math.atan2(u.y - p.y, u.x - p.x), vpredu: h > 0.05, ven: null };
  });
  /*
   * Okraj: sousedé (ve stejné vrstvě) jsou hlavně na jedné straně — ven je
   * opačně. Světlo: kdo nemá souseda vlevo nahoře (odkud svítí obloha a
   * slunce), ten je na osvětleném okraji a dostane světlou čepičku.
   */
  const SVIT: Bod = [-0.55, -0.83];
  const svetly = new Set<Konec>(), slunecny = new Set<Konec>();
  K.forEach((a) => {
    let sx = 0, sy = 0, n = 0, zakryt = 0;
    K.forEach((b) => {
      if (a === b || a.vpredu !== b.vpredu) return;
      const dx = b.x - a.x, dy = b.y - a.y, dd = Math.hypot(dx, dy);
      if (dd > 0 && dd < 96) { sx += dx / dd; sy += dy / dd; n++; }
      if (dd > 0 && dd < 74 && (dx * SVIT[0] + dy * SVIT[1]) / dd > 0.45) zakryt++;
    });
    const m = n ? Math.hypot(sx, sy) / n : 1;
    if (!n) a.ven = [Math.cos(a.smer), Math.sin(a.smer)];
    else if (m > 0.32) a.ven = [-sx / (m * n), -sy / (m * n)];
    if (!zakryt) svetly.add(a);
    /* na koho dosvítí nízké slunce zleva: směrem k němu nestojí žádný jiný konec */
    if (!K.some((b) => {
      const dx = b.x - a.x, dy = b.y - a.y, dd = Math.hypot(dx, dy);
      return dd > 0 && dd < 190 && (dx * SLUNCE[0] + dy * SLUNCE[1]) / dd > 0.72;
    })) slunecny.add(a);
  });

  const prazdne = () => ({
    m0: [] as string[], m0z: [] as string[], mt: [] as string[], m1: [] as string[], m1z: [] as string[], m2: [] as string[],
    z0: [] as string[], zt: [] as string[], z1: [] as string[], z2: [] as string[],
  });
  const kruhy = prazdne(), kruhyPozde = prazdne();
  /* listy po skupinách podle tónu (třída na skupině, ne na každém listu — kratší HTML) */
  const listi = new Map<string, string[]>();
  const doSkupiny = (klic: string, el: string) => (listi.get(klic) ?? listi.set(klic, []).get(klic)!).push(el);
  const mlade = new Map<string, string[]>();
  const jehnedy: string[] = [], orechy: string[] = [], pukle: string[] = [];
  const mistaOrechu: Bod[] = [], mistaListi: Bod[] = [];
  const B = { p: [Infinity, Infinity, -Infinity, -Infinity], z: [Infinity, Infinity, -Infinity, -Infinity] };
  const RS = nahoda(6021);
  const kruh = (x: number, y: number, r: number) => `<circle cx="${c0(x)}" cy="${c0(y)}" r="${c0(r)}"/>`;
  const list = (sym: string, x: number, y: number, a: number, m: number) =>
    `<use href="#${sym}" transform="translate(${c0(x)} ${c0(y)}) rotate(${c0(stupne(a) + 90)})${Math.abs(m - 1) > 0.04 ? ` scale(${f(m)})` : ""}"/>`;

  /* kotouče přední koruny i s tím, jestli na podzim opadají — podle nich se hledají schovky */
  const predniKruhy: { x: number; y: number; r: number; pozde: boolean }[] = [];
  /* konce, které na podzim ještě zelenají — po shlucích, ne po jednom */
  const zelene = new Set(K.filter((k) => Math.sin(k.x / 97 + 0.4) * Math.cos(k.y / 83 - 1.1) > 0.55));
  K.forEach((k) => {
    const pozde = RS() < 0.3;
    const cil = pozde ? kruhyPozde : kruhy;
    const bb = k.vpredu ? B.p : B.z;
    /* tmavý kotouč, přes něj skoro stejně velký střední tón posunutý ke světlu — tma zbude jen na spodním okraji hmoty */
    if (k.vpredu) {
      const r = 34 + RS() * 15;
      const z = zelene.has(k);
      (z ? cil.m0z : cil.m0).push(kruh(k.x, k.y - 8, r));
      predniKruhy.push({ x: k.x, y: k.y - 8, r, pozde });
      /* teplý srpek od slunce: kotouč posunutý k němu, střední tón ho překryje až na levý spodní okraj */
      if (slunecny.has(k)) cil.mt.push(kruh(k.x - 7, k.y - 5, r * 0.94));
      (z ? cil.m1z : cil.m1).push(kruh(k.x - 5, k.y - 16, r * 0.9));
      if (svetly.has(k)) cil.m2.push(kruh(k.x - 11, k.y - 24, r * 0.56));
      bb[0] = Math.min(bb[0], k.x - r); bb[1] = Math.min(bb[1], k.y - 8 - r); bb[2] = Math.max(bb[2], k.x + r); bb[3] = Math.max(bb[3], k.y - 8 + r);
    } else {
      const r = 40 + RS() * 17;
      cil.z0.push(kruh(k.x, k.y - 6, r));
      if (slunecny.has(k)) cil.zt.push(kruh(k.x - 7, k.y - 3, r * 0.94));
      cil.z1.push(kruh(k.x - 5, k.y - 13, r * 0.9));
      if (svetly.has(k)) cil.z2.push(kruh(k.x - 10, k.y - 20, r * 0.54));
      bb[0] = Math.min(bb[0], k.x - r); bb[1] = Math.min(bb[1], k.y - 6 - r); bb[2] = Math.max(bb[2], k.x + r); bb[3] = Math.max(bb[3], k.y - 6 + r);
    }

    /* lístky na okraji: ven a trochu svěšené, barva podle toho, kam koukají */
    if (k.ven) {
      const [vx, vy] = k.ven;
      const pocet = k.vpredu ? 3 + Math.floor(RS() * 2) : 2 + Math.floor(RS() * 2);
      for (let j = 0; j < pocet; j++) {
        let dx = vx * 0.75 + Math.cos(k.smer) * 0.25, dy = vy * 0.75 + Math.sin(k.smer) * 0.25 + 0.3;
        const a = Math.atan2(dy, dx) + (j - (pocet - 1) / 2) * 0.6 + (RS() - 0.5) * 0.4;
        dx = Math.cos(a); dy = Math.sin(a);
        const sym = RS() < 0.5 ? "ou-la" : RS() < 0.6 ? "ou-lb" : "ou-lc";
        const m = 0.8 + RS() * 0.38;
        let tr: string;
        if (k.vpredu) {
          tr = slunecny.has(k) && vx < 0.2 ? "ou-l3" : vy < -0.45 ? "ou-l2" : vy > 0.4 ? "ou-l0" : RS() < 0.5 ? "ou-l1" : "ou-l2";
          /* na podzim část listů ještě drží zelenou (tón -z je v létě stejný jako bez -z) */
          if (zelene.has(k) && (tr === "ou-l1" || tr === "ou-l2")) tr += "z";
        } else tr = slunecny.has(k) && vx < 0.2 ? "ou-y3" : vy < -0.45 ? "ou-y2" : vy > 0.4 ? "ou-y0" : "ou-y1";
        doSkupiny(`${k.vpredu ? "p" : "z"}|${pozde ? 1 : 0}|${tr}`, list(sym, k.x - vx * 6, k.y - vy * 6, a, m));
        if (k.vpredu && j === 0 && RS() < 0.5) mistaListi.push([c0(k.x), c0(k.y)]);
      }
    } else if (k.vpredu && RS() < 0.3) {
      /* uvnitř jen občas světlý list navrch — kresba, ne šum */
      const sym = RS() < 0.5 ? "ou-lb" : "ou-lc";
      doSkupiny(`p|${pozde ? 1 : 0}|${RS() < 0.6 ? "ou-l2" : "ou-l1"}`, list(sym, k.x - 10, k.y - 18, k.smer - 0.5, 0.78));
    }

    /* jaro: mladé lístky a jehnědy na každém konci */
    {
      const tr = `ou-j${Math.floor(RS() * 3)}`;
      const el = list(`ou-trs${Math.floor(RS() * 3)}`, k.x, k.y, k.smer - 0.15 + (RS() - 0.5) * 0.4, 1.05 + RS() * 0.4);
      (mlade.get(tr) ?? mlade.set(tr, []).get(tr)!).push(el);
    }
    if (RS() < 0.5) {
      const l = 24 + RS() * 22, ohyb = (RS() - 0.5) * 16;
      jehnedy.push(`<path d="M${c0(k.x - Math.cos(k.smer) * 8)} ${c0(k.y - Math.sin(k.smer) * 8)} q${f(ohyb)} ${f(l * 0.5)} ${f(ohyb * 0.4)} ${f(l)}"/>`);
    }

    /* ořechy po dvou až třech, hlavně na spodním okraji přední koruny */
    if (k.vpredu && RS() < (k.ven && k.ven[1] > 0.2 ? 0.42 : 0.07)) {
      const n = RS() < 0.55 ? 2 : 3;
      const ox = k.x + (RS() - 0.5) * 10, oy = k.y + 10;
      mistaOrechu.push([c0(ox), c0(oy)]);
      for (let j = 0; j < n; j++) {
        const x = ox + (j - (n - 1) / 2) * 15 + (RS() - 0.5) * 4, y = oy + (j % 2) * 8 + RS() * 4;
        const el = `transform="translate(${c0(x)} ${c0(y)}) rotate(${c0((RS() - 0.5) * 40)}) scale(${f(0.92 + RS() * 0.22)})"`;
        if (RS() < 0.4) pukle.push(`<use href="#ou-ob" class="ou-pukly" ${el}/>`);
        else orechy.push(`<use href="#ou-oa" class="ou-orech" ${el}/>`);
      }
    }
  });

  const g = (trida: string, obsah: string[]) => `<g class="${trida}">${obsah.join("")}</g>`;
  /** listy jedné vrstvy: skupina na tón, pozdní (na podzim už opadané) zvlášť */
  const listyVrstvy = (v: "p" | "z") => [0, 1].map((pozde) => {
    const tony = [...listi.entries()].filter(([k]) => k.startsWith(`${v}|${pozde}|`)).sort(([a], [b]) => (a < b ? -1 : 1));
    return `<g class="ou-listi${pozde ? " ou-listi-pozde" : ""}">${tony.map(([k, el]) => g(k.split("|")[2], el)).join("")}</g>`;
  }).join("");
  const zadni =
    `<g class="ou-hmota">${g("ou-z0", kruhy.z0)}${g("ou-zt", kruhy.zt)}${g("ou-z1", kruhy.z1)}${g("ou-z2", kruhy.z2)}</g>` +
    `<g class="ou-hmota ou-hmota-pozde">${g("ou-z0", kruhyPozde.z0)}${g("ou-zt", kruhyPozde.zt)}${g("ou-z1", kruhyPozde.z1)}${g("ou-z2", kruhyPozde.z2)}</g>` +
    listyVrstvy("z");
  const predni =
    `<g class="ou-hmota">${g("ou-m0", kruhy.m0)}${g("ou-m0z", kruhy.m0z)}${g("ou-mt", kruhy.mt)}${g("ou-m1", kruhy.m1)}${g("ou-m1z", kruhy.m1z)}${g("ou-m2", kruhy.m2)}</g>` +
    `<g class="ou-hmota ou-hmota-pozde">${g("ou-m0", kruhyPozde.m0)}${g("ou-m0z", kruhyPozde.m0z)}${g("ou-mt", kruhyPozde.mt)}${g("ou-m1", kruhyPozde.m1)}${g("ou-m1z", kruhyPozde.m1z)}${g("ou-m2", kruhyPozde.m2)}</g>` +
    listyVrstvy("p") +
    `<g class="ou-mlade">${[...mlade.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, el]) => g(k, el)).join("")}</g>` +
    `<g class="ou-jehnedy" fill="none" stroke-linecap="round">${jehnedy.join("")}</g>` +
    `<g class="ou-orechy">${orechy.join("")}</g><g class="ou-orechy-pukle">${pukle.join("")}</g>`;

  const bb = (b: number[]) => b.map(c0) as [number, number, number, number];

  /*
   * Schovky v koruně: okraj přední koruny, kde listy koukají ven daným
   * směrem — vlevo dole u nízké větve, vlevo uprostřed a zespodu pod
   * korunou nad kmenem. Vykukuje se kousek za okrajem, schovává se hlouběji.
   */
  /*
   * Schovaná musí být celá za listím, které vydrží i podzim: obdélník
   * postavy (76 × 112 jednotek, na telefonu je postava v jednotkách stromu
   * největší) se navzorkuje a každý bod musí ležet v kotouči přední koruny,
   * který na podzim neopadá. Z několika krajních konců se vezme ten, za
   * kterým je hustě nejblíž k okraji.
   */
  const kryto = (x: number, y: number) => {
    let ano = 0, vse = 0;
    for (let i = 0; i <= 6; i++) for (let j = 0; j <= 8; j++) {
      const px = x - 38 + (76 * i) / 6, py = y - 42 + (114 * j) / 8;
      vse++;
      if (predniKruhy.some((c) => !c.pozde && (px - c.x) ** 2 + (py - c.y) ** 2 < (c.r - 4) ** 2)) ano++;
    }
    return ano / vse;
  };
  /* odkud se přilétá: obdélník postavy nesmí zasahovat do žádného předního kotouče (ani letního), jinak by přechod do koruny problikl */
  const volno = (x: number, y: number) => {
    for (let i = 0; i <= 6; i++) for (let j = 0; j <= 8; j++) {
      const px = x - 38 + (76 * i) / 6, py = y - 42 + (114 * j) / 8;
      if (predniKruhy.some((c) => (px - c.x) ** 2 + (py - c.y) ** 2 < (c.r + 6) ** 2)) return false;
    }
    return true;
  };
  const schovky: KorunaSchovka[] = [];
  const pridejSchovku = (podminka: (k: Konec) => boolean, mira: (k: Konec) => number) => {
    const kandidati = K.filter((k) => k.vpredu && k.ven && podminka(k)).sort((a, b) => mira(a) - mira(b)).slice(0, 8);
    let nej: { k: Konec; d: number; q: number } | null = null;
    for (const k of kandidati) {
      const [vx, vy] = k.ven!;
      const l = Math.hypot(vx, vy) || 1;
      for (let d = 50; d <= 320; d += 10) {
        const q = kryto(k.x - (vx / l) * d, k.y - (vy / l) * d);
        if (q >= 0.97) {
          if (!nej || nej.q < 0.97 || d < nej.d) nej = { k, d, q };
          break;
        }
        if (!nej || (nej.q < 0.97 && q > nej.q)) nej = { k, d, q };
      }
    }
    if (!nej || nej.q < 0.9) return;
    const { k, d } = nej;
    const [vx, vy] = k.ven!;
    const l = Math.hypot(vx, vy) || 1, sx = vx / l, sy = vy / l;
    let ven = 100;
    while (ven < 420 && !volno(k.x + sx * ven, k.y + sy * ven)) ven += 10;
    if (ven >= 420) return;
    schovky.push({
      venku: [c0(k.x + sx * ven), c0(k.y + sy * ven)],
      skryta: [c0(k.x - sx * d), c0(k.y - sy * d)],
      vykuk: [c0(k.x + sx * 8), c0(k.y + sy * 8)],
      smer: [f(sx), f(sy)],
    });
  };
  pridejSchovku((k) => k.ven![0] < -0.45 && k.y > 640 && k.y < 880, (k) => k.x);
  pridejSchovku((k) => k.ven![0] < -0.5 && k.y > 430 && k.y < 640 && k.x > 820, (k) => k.x);
  pridejSchovku((k) => k.ven![1] > 0.5 && k.x > 1240 && k.x < 1520, (k) => -k.y);
  return {
    defs: symboly(),
    zadni,
    kmen: celaCisla(kmen),
    predni,
    mista: { predni: bb(B.p), zadni: bb(B.z), kmen: KMEN_SCHOVKA, dutina: DUTINA, orechy: mistaOrechu, listi: mistaListi, koruna: schovky },
  };
}

/* ═══ Drobnosti u kmene ═══ */

/** Hlava veverky — vykukuje z dutiny (animace v domek2.css) */
function veverkaHlava(): string {
  const { x, y } = DUTINA;
  return `<g transform="translate(${x} ${y + 14})">
    <path d="M-15 30 C-17 8 -12 -8 0 -10 C12 -8 17 8 15 30 Z" class="ou-vev-telo"/>
    <path d="M-11 -6 L-14 -24 L-5 -12 Z M11 -6 L14 -24 L5 -12 Z" class="ou-vev-telo"/>
    <path d="M-12.5 -21 L-13.5 -27 M12.5 -21 L13.5 -27" class="ou-vev-stetka" stroke-width="2.4" stroke-linecap="round"/>
    <ellipse cx="0" cy="2" rx="9" ry="7.5" class="ou-vev-bricho"/>
    <circle cx="-5.5" cy="-3" r="2.6" fill="#1A1210"/><circle cx="5.5" cy="-3" r="2.6" fill="#1A1210"/>
    <circle cx="-4.7" cy="-3.8" r="0.9" fill="#FFF"/><circle cx="6.3" cy="-3.8" r="0.9" fill="#FFF"/>
    <ellipse cx="0" cy="3" rx="2" ry="1.4" fill="#3A2420"/>
    <path d="M-7 14 C-4 10 4 10 7 14 C6 20 -6 20 -7 14 Z" class="ou-vev-orech"/>
  </g>`;
}

/** Sníh na kořenech */
function snihKmen(): string {
  return `<path d="M884 1320 C934 1304 994 1288 1054 1252 C1046 1272 1004 1292 964 1306 C934 1316 904 1324 884 1320 Z"/>
  <path d="M1262 1250 C1324 1272 1400 1292 1488 1312 C1440 1314 1380 1306 1330 1294 C1300 1286 1276 1266 1262 1250 Z"/>`;
}

/** Trs trávy u paty kmene — ať kmen nestojí na rovné hraně */
function travaUKmene(R: () => number): string {
  const stebla: string[] = [];
  for (let i = 0; i < 80; i++) {
    const x = 900 + R() * 680;
    const zem = 1302 + Math.abs(x - 1180) * 0.035 + R() * 14;
    const h = 18 + R() * 32, l = (R() - 0.5) * 22, w = 3 + R() * 4;
    stebla.push(`M${f(x - w / 2)} ${f(zem)} Q${f(x + l * 0.3)} ${f(zem - h * 0.6)} ${f(x + l)} ${f(zem - h)} Q${f(x + l * 0.45)} ${f(zem - h * 0.5)} ${f(x + w / 2)} ${f(zem)} Z`);
  }
  return `<path class="ou-trava" d="${stebla.join(" ")}"/>`;
}

/* ═══ Barvy podle ročního období ═══ */

type Paleta = Record<string, string>;

/** Barvy výplní podle tříd v jednotlivých obdobích */
export const ORECH_BARVY: Record<Sezona, Paleta> = {
  leto: {
    "ou-l0": "#3B5C36", "ou-l1": "#58834A", "ou-l1z": "#58834A", "ou-l2": "#80AA58", "ou-l2z": "#80AA58", "ou-l3": "#C9CF78",
    "ou-y0": "#284232", "ou-y1": "#365640", "ou-y2": "#4D7148", "ou-y3": "#8E9A5A",
    "ou-m0": "#3A5C38", "ou-m0z": "#3A5C38", "ou-mt": "#A7B565", "ou-m1": "#4F7A43", "ou-m1z": "#4F7A43", "ou-m2": "#6E9A50",
    "ou-z0": "#26402F", "ou-zt": "#6E7E4E", "ou-z1": "#33533A", "ou-z2": "#466B45",
    "ou-orech": "#A8C25C", "ou-trava": "#4F7A3A",
  },
  podzim: {
    "ou-l0": "#8E6428", "ou-l1": "#C38D2C", "ou-l1z": "#A29C42", "ou-l2": "#E3B23E", "ou-l2z": "#C2B656", "ou-l3": "#F7D67A",
    "ou-y0": "#583F26", "ou-y1": "#74552C", "ou-y2": "#987434", "ou-y3": "#C69A48",
    "ou-m0": "#84602A", "ou-m0z": "#76682C", "ou-mt": "#F0C460", "ou-m1": "#BC892E", "ou-m1z": "#A69434", "ou-m2": "#DDAA3E",
    "ou-z0": "#4E3A26", "ou-zt": "#A4823E", "ou-z1": "#6C4E2A", "ou-z2": "#8E6C32",
    "ou-orech": "#77703A", "ou-pukly": "#3A2E22", "ou-trava": "#6E7A3A",
  },
  jaro: { "ou-j0": "#A0704A", "ou-j1": "#B79558", "ou-j2": "#97AE5E", "ou-trava": "#5E9440" },
  predjari: { "ou-trava": "#7A8E4E" },
  zima: { "ou-trava": "#B8A57E" },
};

/** Co se ve kterém období ukazuje */
const SKUPINY: Record<Sezona, string[]> = {
  leto: ["ou-hmota", "ou-listi", "ou-orechy"],
  podzim: ["ou-hmota", "ou-listi", "ou-orechy", "ou-orechy-pukle"],
  jaro: ["ou-mlade", "ou-jehnedy"],
  predjari: [],
  zima: ["ou-snih"],
};
const VSECHNY = ["ou-hmota", "ou-listi", "ou-orechy", "ou-orechy-pukle", "ou-mlade", "ou-jehnedy", "ou-snih"];

/**
 * CSS stromu. `koren` je selektor sekce (na stránce `.dm-uvod`), období se
 * pozná z jejího data-sezona. Bez `sezona` vrátí pravidla pro všechna
 * období, se `sezona` jen pro jedno a bez podmínky (náhled mimo stránku).
 */
export function orechStyly(koren: string, sezona?: Sezona): string {
  const pravidla: string[] = [];
  const pro = (s: Sezona) => (sezona ? koren : `${koren}[data-sezona="${s}"]`);
  const pevne = (sel: string, telo: string) => pravidla.push(`${koren} ${sel}{${telo}}`);

  pevne(".ou-drevo", "fill:#8C827F");
  pevne(".ou-vetvicky", "stroke:#675F69");
  pevne(".ou-vyhonky", "stroke:#675F69;stroke-width:2.1;fill:none;stroke-linecap:round");
  pevne(".ou-drevo-stin", "fill:#5B5468;opacity:.5");
  pevne(".ou-drevo-tma", "fill:#433E50;opacity:.42");
  pevne(".ou-drevo-svetlo", "fill:#E2BE9C;opacity:.62");
  pevne(".ou-brazdy", "stroke:#3C363E;opacity:.42");
  pevne(".ou-hrbety", "stroke:#F1D6BC;opacity:.4");
  pevne(".ou-kurovina", "stroke:#4A4448;opacity:.28");
  pevne(".ou-lem", "stroke:#F6D6B0;opacity:.75");
  pevne(".ou-boule", "fill:#7D7474");
  pevne(".ou-boule-svetlo", "fill:#958B88");
  pevne(".ou-boule-cary", "stroke:#4A4448;opacity:.55");
  pevne(".ou-dutina-val", "fill:#9C8F88");
  pevne(".ou-dutina-lem", "stroke:#ECCDAE;opacity:.85");
  pevne(".ou-vev-telo", "fill:#B5592A");
  pevne(".ou-vev-stetka", "stroke:#8E4120");
  pevne(".ou-vev-bricho", "fill:#F1D9B8");
  pevne(".ou-vev-orech", "fill:#C49B6A");
  pevne(".ou-snih", "fill:#F5F8FB");
  pevne(".ou-jehnedy", "stroke:#B3A24E;stroke-width:7");

  const seznam: Sezona[] = sezona ? [sezona] : ["leto", "podzim", "jaro", "predjari", "zima"];
  for (const s of seznam) {
    const ukaz = SKUPINY[s];
    VSECHNY.forEach((gr) => pravidla.push(`${pro(s)} .${gr}{display:${ukaz.includes(gr) ? "inline" : "none"}}`));
    Object.entries(ORECH_BARVY[s]).forEach(([k, v]) => pravidla.push(`${pro(s)} .${k}{fill:${v}}`));
  }
  /* podzim: koruna řídne — část listí už spadla */
  if (!sezona || sezona === "podzim") pravidla.push(`${pro("podzim")} .ou-listi-pozde,${pro("podzim")} .ou-hmota-pozde{display:none}`);
  return pravidla.join("\n");
}
