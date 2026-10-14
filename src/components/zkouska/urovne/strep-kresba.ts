/**
 * Kresba úrovně 九 Kintsugi (komnata U mistra, /zkouska). Ráno po výpalu:
 * nízký stolek, na něm rozvázaný indigový šátek furoshiki, ve kterém
 * přišla prasklá miska, a šest jejích střepů. Vedle mistička s černým
 * lakem urushi, mistička se zlatým práškem a jemný štětec. Zleva svítí
 * papírová lucerna, na stěně visí svitek se znakem 金.
 *
 * Čisté funkce bez DOM — kreslí stejně komponenta při buildu
 * (Strep.astro) i hra v prohlížeči (scripts/zkouska/urovne/strep.ts),
 * která při každém pokusu vylosuje jeden ze tří vzorů lomu a střepy
 * rozhází po šátku.
 *
 * Miska má vlastní souřadnice: okraj je elipsa se středem (0, −70)
 * a poloosami 150 × 30, patka končí na y ≈ 106. Ve scéně (viewBox
 * 800 × 560) stojí slepená miska v bodě MISKA.
 *
 * Vzor lomu je graf: uzly (kde se praskliny potkávají, nebo kde odcházejí
 * z rámečku kolem misky), hrany (praskliny — ručně rozmístěné ohyby a mezi
 * nimi drobné zuby) a díly (obvod střepu jako sled uzlů a hran). Střep je
 * celá miska oříznutá na svůj díl, takže sousední střepy do sebe zapadnou
 * přesně. Spáry pro zlato jsou tytéž hrany, jen oříznuté na obrys misky.
 */

export const VIEW_W = 800;
export const VIEW_H = 560;
/** Kde na šátku stojí slepená miska — počátek souřadnic misky ve scéně */
export const MISKA = { x: 400, y: 330 };
/** Kam smí střed střepu (aby zůstal na stole a šel chytit) */
export const MEZE = { x0: 18, x1: 782, y0: 176, y1: 548 };

export type Bod = [number, number];

const f = (n: number) => (Math.round(n * 10) / 10).toString();
const f2 = (n: number) => (Math.round(n * 100) / 100).toString();

/* ——— Obrys misky ——— */

const OKRAJ = { cy: -70, rx: 150, ry: 30 };
/** Silueta: zadní půlka okraje nahoře, tělo, patka */
export const SILUETA_D =
  "M-150 -70 A150 30 0 0 1 150 -70 C150 2 118 62 52 82 L46 86 L46 100 A46 6 0 0 1 -46 100 L-46 86 L-52 82 C-118 62 -150 2 -150 -70 Z";

const kubika = (a: Bod, b: Bod, c: Bod, d: Bod, t: number): Bod => {
  const u = 1 - t;
  return [
    u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0],
    u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1],
  ];
};

/** Silueta jako mnohoúhelník — na zásahy a vzorky */
export const SILUETA: Bod[] = (() => {
  const b: Bod[] = [];
  for (let i = 0; i <= 48; i++) {
    const th = Math.PI + (Math.PI * i) / 48;
    b.push([OKRAJ.rx * Math.cos(th), OKRAJ.cy + OKRAJ.ry * Math.sin(th)]);
  }
  for (let i = 1; i <= 24; i++) b.push(kubika([150, -70], [150, 2], [118, 62], [52, 82], i / 24));
  b.push([46, 86], [46, 100]);
  for (let i = 1; i < 16; i++) {
    const fi = (Math.PI * i) / 16;
    b.push([46 * Math.cos(fi), 100 + 6 * Math.sin(fi)]);
  }
  b.push([-46, 100], [-46, 86], [-52, 82]);
  for (let i = 1; i < 24; i++) b.push(kubika([-52, 82], [-118, 62], [-150, 2], [-150, -70], i / 24));
  return b;
})();

export const vPolygonu = (p: Bod, poly: Bod[]) => {
  let uvnitr = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) uvnitr = !uvnitr;
  }
  return uvnitr;
};

/** Vzdálenost bodu od úsečky */
export const odUsecky = (p: Bod, a: Bod, b: Bod) => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2)) : 0;
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
};

/** Jak daleko je bod od obrysu misky (kladně uvnitř i venku) */
export const odObrysu = (p: Bod) => {
  let m = Infinity;
  for (let i = 0, j = SILUETA.length - 1; i < SILUETA.length; j = i++) m = Math.min(m, odUsecky(p, SILUETA[j], SILUETA[i]));
  return m;
};
export const vMisce = (p: Bod) => vPolygonu(p, SILUETA);

/* ——— Vzory lomu ——— */

interface Vzor {
  nazev: string;
  uzly: Record<string, Bod>;
  /** Prasklina: odkud, kam a ruční ohyby mezi tím */
  hrany: Record<string, [string, string, Bod[]]>;
  /** Obvod dílu: začne v uzlu, pak jde po hranách (název hrany) nebo rovně k uzlu (název uzlu) */
  dily: string[][];
}

const ROHY: Record<string, Bod> = { TL: [-180, -125], TR: [180, -125], BR: [180, 125], BL: [-180, 125] };

export const VZORY: Vzor[] = [
  {
    nazev: "hvězda",
    uzly: {
      ...ROHY,
      J1: [-28, 22], J2: [66, 14], T1: [-84, -125], T2: [50, -125], L: [-180, -26], B1: [-74, 125], R: [180, 4], B2: [94, 125],
    },
    hrany: {
      e1: ["J1", "T1", [[-38, -6], [-50, -36], [-58, -60], [-72, -92], [-78, -110]]],
      e2: ["J1", "T2", [[-8, -6], [10, -34], [26, -62], [40, -96], [46, -112]]],
      e3: ["L", "J1", [[-156, -22], [-128, -10], [-98, 0], [-64, 16], [-44, 18]]],
      e4: ["J1", "B1", [[-34, 48], [-50, 70], [-60, 92], [-70, 112]]],
      e5: ["J1", "J2", [[0, 28], [26, 18], [48, 22]]],
      e6: ["J2", "R", [[96, 10], [128, 2], [158, 4]]],
      e7: ["J2", "B2", [[72, 44], [80, 72], [88, 100]]],
    },
    dily: [
      ["J1", "e1", "TL", "L", "e3"],
      ["J1", "e1", "T2", "e2"],
      ["J1", "e2", "TR", "R", "e6", "e5"],
      ["J2", "e6", "BR", "B2", "e7"],
      ["J1", "e5", "e7", "B1", "e4"],
      ["J1", "e4", "BL", "L", "e3"],
    ],
  },
  {
    nazev: "půlky",
    uzly: {
      ...ROHY,
      T: [12, -125], K1: [4, -18], K2: [10, 22], K3: [-2, 52], B: [-8, 125], L: [-180, -36], BL2: [-150, 125], TR1: [74, -125], R1: [180, 36], R2: [180, 74],
    },
    hrany: {
      m1: ["T", "K1", [[16, -104], [8, -80], [14, -58], [2, -38]]],
      m2: ["K1", "K2", [[12, 2]]],
      m3: ["K2", "K3", [[2, 34], [7, 44]]],
      m4: ["K3", "B", [[-7, 78], [-2, 104]]],
      l1: ["L", "K1", [[-150, -30], [-118, -10], [-82, -20], [-46, -6], [-18, -24]]],
      l2: ["K3", "BL2", [[-30, 58], [-62, 64], [-96, 72], [-128, 100]]],
      r1: ["TR1", "R1", [[78, -100], [94, -74], [112, -46], [132, -16], [152, 12], [170, 28]]],
      r2: ["K2", "R2", [[40, 32], [74, 22], [104, 42], [132, 54], [158, 64]]],
    },
    dily: [
      ["T", "m1", "l1", "L", "TL"],
      ["L", "l1", "m2", "m3", "l2", "BL"],
      ["K3", "l2", "B", "m4"],
      ["TR1", "r1", "TR"],
      ["T", "TR1", "r1", "R2", "r2", "m2", "m1"],
      ["K2", "r2", "BR", "B", "m4", "m3"],
    ],
  },
  {
    nazev: "vodorovně",
    uzly: {
      ...ROHY,
      L: [-180, -24], D1: [-88, -14], U1: [-44, -22], D2: [30, -8], U2: [80, -14], R: [180, -16], TU1: [-64, -125], TU2: [66, -125], BD1: [-56, 125], BD2: [42, 125],
    },
    hrany: {
      h1: ["L", "D1", [[-150, -20], [-118, -10]]],
      h2: ["D1", "U1", [[-66, -24]]],
      h3: ["U1", "D2", [[-20, -12], [4, -20]]],
      h4: ["D2", "U2", [[54, -4]]],
      h5: ["U2", "R", [[110, -22], [140, -12], [162, -18]]],
      u1: ["U1", "TU1", [[-50, -42], [-60, -64], [-54, -88], [-62, -108]]],
      u2: ["U2", "TU2", [[72, -40], [84, -62], [74, -88], [70, -110]]],
      d1: ["D1", "BD1", [[-82, 12], [-72, 40], [-64, 70], [-58, 100]]],
      d2: ["D2", "BD2", [[36, 20], [28, 50], [40, 80], [38, 104]]],
    },
    dily: [
      ["L", "h1", "h2", "u1", "TL"],
      ["U1", "h3", "h4", "u2", "TU1", "u1"],
      ["U2", "h5", "TR", "TU2", "u2"],
      ["L", "h1", "d1", "BL"],
      ["D1", "d1", "BD2", "d2", "h3", "h2"],
      ["D2", "d2", "BR", "R", "h5", "h4"],
    ],
  },
];

/** Pseudonáhoda se semínkem — zuby prasklin vyjdou pokaždé stejně */
export function nahoda(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

/** Prasklina: mezi ručními ohyby drobné střídavé zuby, jak se láme kamenina */
function zubata(body: Bod[], seed: number): Bod[] {
  const r = nahoda(seed);
  const ven: Bod[] = [body[0]];
  for (let i = 0; i < body.length - 1; i++) {
    const [ax, ay] = body[i];
    const [bx, by] = body[i + 1];
    const dx = bx - ax;
    const dy = by - ay;
    const l = Math.hypot(dx, dy) || 1;
    const n = Math.max(1, Math.round(l / (6 + r() * 4)));
    const nx = -dy / l;
    const ny = dx / l;
    for (let k = 1; k < n; k++) {
      const t = (k + (r() - 0.5) * 0.5) / n;
      const o = (k % 2 ? 1 : -1) * (0.45 + r() * 1.25);
      ven.push([ax + dx * t + nx * o, ay + dy * t + ny * o]);
    }
    ven.push([bx, by]);
  }
  return ven;
}

export interface Dil {
  /** Obvod v souřadnicích misky */
  body: Bod[];
  d: string;
  /** Těžiště viditelné části — kolem něj se střep otáčí */
  stred: Bod;
  /** Nejdál od těžiště, co ze střepu je vidět */
  polomer: number;
  /** Řídké vzorky viditelné plochy — na meze a dotyk vedle */
  vzorky: Bod[];
}

export interface Spara {
  id: string;
  /** Body spáry uvnitř misky po ~3 jednotkách */
  body: Bod[];
  /** Navazuje bod na předchozí? (kde spára vyběhne z misky, je mezera) */
  spoj: boolean[];
  /** Celá prasklina jako cesta (na tmavou čáru laku) */
  d: string;
  delka: number;
}

export interface PripravenyVzor {
  index: number;
  dily: Dil[];
  spary: Spara[];
}

const cestaZ = (body: Bod[], zavrit: boolean) => `M${body.map((b) => `${f(b[0])} ${f(b[1])}`).join(" L")}${zavrit ? " Z" : ""}`;

/** Obvod dílu ze sledu uzlů a hran */
function obvod(v: Vzor, hrany: Record<string, Bod[]>, kroky: string[]): Bod[] {
  let kde = kroky[0];
  const body: Bod[] = [v.uzly[kde]];
  for (const krok of kroky.slice(1)) {
    const h = v.hrany[krok];
    if (h) {
      const b = hrany[krok];
      if (kde === h[0]) {
        body.push(...b.slice(1));
        kde = h[1];
      } else if (kde === h[1]) {
        body.push(...b.slice(0, -1).reverse());
        kde = h[0];
      } else throw new Error(`Vzor ${v.nazev}: hrana ${krok} nezačíná v ${kde}`);
    } else {
      body.push(v.uzly[krok]);
      kde = krok;
    }
  }
  const [a, z] = [body[0], body[body.length - 1]];
  if (a[0] === z[0] && a[1] === z[1]) body.pop();
  return body;
}

const pripravene: (PripravenyVzor | undefined)[] = [];

export function pripravVzor(index: number): PripravenyVzor {
  const hotovy = pripravene[index];
  if (hotovy) return hotovy;
  const v = VZORY[index];
  const hrany: Record<string, Bod[]> = {};
  for (const [id, [a, b, ohyby]] of Object.entries(v.hrany)) hrany[id] = zubata([v.uzly[a], ...ohyby, v.uzly[b]], hash(`${v.nazev}/${id}`));

  const obvody = v.dily.map((kroky) => obvod(v, hrany, kroky));
  /* Plochu dílů změří mřížka bodů uvnitř misky */
  const sber = obvody.map(() => ({ sx: 0, sy: 0, n: 0, body: [] as Bod[] }));
  for (let iy = 0; iy <= 69; iy++) {
    for (let ix = 0; ix <= 100; ix++) {
      const p: Bod = [-150 + ix * 3, -100 + iy * 3];
      if (!vMisce(p)) continue;
      const i = obvody.findIndex((o) => vPolygonu(p, o));
      if (i < 0) continue;
      const s = sber[i];
      s.sx += p[0];
      s.sy += p[1];
      s.n++;
      if (ix % 3 === 0 && iy % 3 === 0) s.body.push(p);
    }
  }
  const dily: Dil[] = obvody.map((body, i) => {
    const s = sber[i];
    const stred: Bod = [s.sx / Math.max(1, s.n), s.sy / Math.max(1, s.n)];
    const polomer = Math.max(20, ...s.body.map((p) => Math.hypot(p[0] - stred[0], p[1] - stred[1])));
    return { body, d: cestaZ(body, true), stred, polomer, vzorky: s.body };
  });

  const spary: Spara[] = Object.keys(v.hrany).map((id) => {
    const cara = hrany[id];
    const body: Bod[] = [];
    const spoj: boolean[] = [];
    let minule = false;
    const pridej = (p: Bod) => {
      const ok = vMisce(p) && odObrysu(p) >= 1.6;
      if (ok) {
        body.push(p);
        spoj.push(minule);
      }
      minule = ok;
    };
    pridej(cara[0]);
    for (let i = 0; i < cara.length - 1; i++) {
      const [ax, ay] = cara[i];
      const [bx, by] = cara[i + 1];
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 3));
      for (let k = 1; k <= n; k++) pridej([ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n]);
    }
    let delka = 0;
    for (let i = 1; i < body.length; i++) if (spoj[i]) delka += Math.hypot(body[i][0] - body[i - 1][0], body[i][1] - body[i - 1][1]);
    return { id, body, spoj, d: cestaZ(cara, false), delka };
  });
  const vysledek = { index, dily, spary: spary.filter((s) => s.body.length >= 6) };
  pripravene[index] = vysledek;
  return vysledek;
}

/* ——— Rozházení po šátku ——— */

export interface Poloha {
  /** Kde je těžiště střepu ve scéně */
  x: number;
  y: number;
  /** Pootočení ve stupních (0 = sedí) */
  a: number;
}

/** Kam padne těžiště střepu, který sedí */
export const cilStrepu = (d: Dil): Bod => [MISKA.x + d.stred[0], MISKA.y + d.stred[1]];

/** Body střepu ve scéně při dané poloze */
export const naScenu = (d: Dil, pol: Poloha, p: Bod): Bod => {
  const r = (pol.a * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  const dx = p[0] - d.stred[0];
  const dy = p[1] - d.stred[1];
  return [pol.x + c * dx - s * dy, pol.y + s * dx + c * dy];
};

/** Bod scény do souřadnic misky podle polohy střepu */
export const doMisky = (d: Dil, pol: Poloha, p: Bod): Bod => {
  const r = (-pol.a * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  const dx = p[0] - pol.x;
  const dy = p[1] - pol.y;
  return [d.stred[0] + c * dx - s * dy, d.stred[1] + s * dx + c * dy];
};

/** Posune polohu tak, aby celý střep zůstal na stole */
export function doMezi(d: Dil, pol: Poloha, okraj = 6): Poloha {
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const p of d.vzorky) {
    const [x, y] = naScenu(d, pol, p);
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  }
  let { x, y } = pol;
  if (x0 < okraj) x += okraj - x0;
  else if (x1 > VIEW_W - okraj) x -= x1 - (VIEW_W - okraj);
  if (y0 < MEZE.y0 + okraj) y += MEZE.y0 + okraj - y0;
  else if (y1 > VIEW_H - okraj) y -= y1 - (VIEW_H - okraj);
  return { x, y, a: pol.a };
}

/** Místa kolem obrysu, kam se střepy rozhodí (těžiště) — pak se ještě rozestoupí */
const MISTA: Bod[] = [
  [150, 262], [122, 382], [224, 490], [650, 262], [684, 384], [570, 492], [400, 516],
];
/** Mističky na šátku — na ty střepy nepadají */
const PREKAZKY = [
  { x: 74, y: 514, r: 54 },
  { x: 724, y: 504, r: 50 },
  { x: 612, y: 548, r: 26 },
  { x: 664, y: 540, r: 26 },
  { x: 704, y: 534, r: 22 },
];

export function rozhazej(v: PripravenyVzor, r: () => number): Poloha[] {
  const n = v.dily.length;
  /* Sedm míst na šest střepů — jedno zůstane prázdné */
  const mista = MISTA.map((m) => ({ m, k: r() }))
    .sort((a, b) => a.k - b.k)
    .slice(0, n)
    .map((x) => x.m);
  /* Dolní prostředek (pod miskou) dostane nejmenší střep, ostatní se rozdají náhodně */
  const dolni = mista.findIndex((m) => m[0] === MISKA.x);
  const volna = mista.filter((_, j) => j !== dolni);
  const odNejmensiho = v.dily.map((_, i) => i).sort((a, b) => v.dily[a].polomer - v.dily[b].polomer);
  const polohy: Poloha[] = new Array(n);
  odNejmensiho.forEach((i, k) => {
    const [mx, my] = dolni >= 0 && k === 0 ? mista[dolni] : volna.splice(Math.floor(r() * volna.length), 1)[0];
    const a = (r() < 0.5 ? -1 : 1) * (22 + r() * 38);
    polohy[i] = doMezi(v.dily[i], { x: mx + (r() - 0.5) * 24, y: my + (r() - 0.5) * 20, a }, 14);
  });

  /* Rozestoupit: střepy se nepřekrývají, nelezou do obrysu misky ani na mističky */
  const odstrc = (i: number, ox: number, oy: number, sila: number) => {
    const dx = polohy[i].x - ox;
    const dy = polohy[i].y - oy;
    const l = Math.hypot(dx, dy) || 1;
    return [(dx / l) * sila, (dy / l) * sila];
  };
  for (let kolo = 0; kolo < 40; kolo++) {
    let pohyb = false;
    for (let i = 0; i < n; i++) {
      const d = v.dily[i];
      const body = d.vzorky.map((p) => naScenu(d, polohy[i], p));
      let tx = 0;
      let ty = 0;
      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        const dj = v.dily[j];
        if (Math.hypot(polohy[i].x - polohy[j].x, polohy[i].y - polohy[j].y) > d.polomer + dj.polomer) continue;
        if (body.some((p) => { const q = doMisky(dj, polohy[j], p); return vMisce(q) && vPolygonu(q, dj.body); })) {
          const [x, y] = odstrc(i, polohy[j].x, polohy[j].y, 3);
          tx += x;
          ty += y;
        }
      }
      if (body.some((p) => vMisce([(p[0] - MISKA.x) * 0.93, (p[1] - MISKA.y) * 0.93]))) {
        const [x, y] = odstrc(i, MISKA.x, MISKA.y, 3);
        tx += x;
        ty += y;
      }
      for (const o of PREKAZKY) {
        if (body.some((p) => Math.hypot(p[0] - o.x, p[1] - o.y) < o.r)) {
          const [x, y] = odstrc(i, o.x, o.y, 3);
          tx += x;
          ty += y;
        }
      }
      if (tx || ty) {
        polohy[i] = doMezi(d, { x: polohy[i].x + tx, y: polohy[i].y + ty, a: polohy[i].a }, 14);
        pohyb = true;
      }
    }
    if (!pohyb) break;
  }
  return polohy;
}

/* ——— Kresba misky ——— */

/** Kde je přední okraj misky nad bodem x */
const predniOkraj = (x: number) => OKRAJ.cy + OKRAJ.ry * Math.sqrt(Math.max(0, 1 - (x / OKRAJ.rx) ** 2));

/** Kapka glazury: z (x ± w/2, y0) dolů do baňky a zpátky — jde se zleva doprava */
const kapka = (x: number, y0: number, l: number, w: number, y1 = y0) =>
  ` L${f(x - w / 2)} ${f(y0)}` +
  ` C${f(x - w * 0.27)} ${f(y0 + l * 0.35)} ${f(x - w * 0.25)} ${f(y0 + l * 0.6)} ${f(x - w * 0.4)} ${f(y0 + l - w * 0.4)}` +
  ` A${f(w * 0.4)} ${f(w * 0.4)} 0 0 0 ${f(x + w * 0.4)} ${f(y0 + l - w * 0.4)}` +
  ` C${f(x + w * 0.25)} ${f(y0 + l * 0.6)} ${f(x + w * 0.27)} ${f(y0 + l * 0.35)} ${f(x + w / 2)} ${f(y1)}`;

/** Nuka — krémová popelová glazura, do které se namočil okraj: pás pod okrajem a stékající kapky */
function nuka() {
  const kapky = [
    { x: -112, l: 40, w: 16 },
    { x: -70, l: 74, w: 20 },
    { x: -26, l: 30, w: 15 },
    { x: 22, l: 90, w: 22 },
    { x: 74, l: 54, w: 18 },
    { x: 118, l: 26, w: 14 },
  ];
  const hrana = (x: number) => predniOkraj(x) + 12 + 2.2 * Math.sin(x / 11 + 0.6);
  let d = `M152 -70 A150 30 0 0 1 -150 -70 L-152 ${f(hrana(-152))}`;
  let x = -152;
  for (const k of kapky) {
    for (; x < k.x - k.w / 2; x += 6) d += ` L${f(x)} ${f(hrana(x))}`;
    d += kapka(k.x, hrana(k.x - k.w / 2), k.l, k.w, hrana(k.x + k.w / 2));
    x = k.x + k.w / 2 + 6;
  }
  for (; x <= 152; x += 6) d += ` L${f(x)} ${f(hrana(x))}`;
  return `${d} Z`;
}

/** Kde končí glazura nad patkou — pod ní je vidět holá hlína */
function holaHlina() {
  let d = "M-120 58";
  for (let x = -120; x <= 120; x += 6) d += ` L${x} ${f(56 + 3 * Math.sin(x / 9) + 2 * Math.sin(x / 23))}`;
  return `${d} L120 96 L-120 96 Z`;
}

/** Celá miska (zepředu, trochu shora) — každý střep z ní ukazuje svůj díl */
function miska() {
  return `<g id="ms9-miska">
  <path d="${SILUETA_D}" fill="url(#ms9-glazura)"/>
  <g clip-path="url(#ms9-orez-tela)">
    <path d="${SILUETA_D}" fill="url(#ms9-glazura-stin)"/>
    <g fill="none" stroke-linecap="round">
      <path d="M-148 -38 A148 29.6 0 0 0 148 -38" stroke="#1A0A04" stroke-opacity="0.2" stroke-width="1.8"/>
      <path d="M-148 -39.6 A148 29.6 0 0 0 148 -39.6" stroke="#FFC79A" stroke-opacity="0.14" stroke-width="1.2"/>
      <path d="M-128 8.4 A128 25.6 0 0 0 128 8.4" stroke="#1A0A04" stroke-opacity="0.2" stroke-width="1.8"/>
      <path d="M-128 6.8 A128 25.6 0 0 0 128 6.8" stroke="#FFC79A" stroke-opacity="0.12" stroke-width="1.2"/>
    </g>
    <path d="${holaHlina()}" fill="url(#ms9-hlina)"/>
    <path d="M-120 57.6 L120 57.6" stroke="#2A140A" stroke-opacity="0.25" stroke-width="1"/>
    <path d="M-40 58 C-39 63 -38 66 -36 69 A4 4 0 0 1 -28 69 C-28 65 -29 61 -30 58 Z M40 59 C41 63 42 65 43 67 A3.4 3.4 0 0 0 49.8 67 C50 64 49 61 48 59 Z" fill="#5E2C14"/>
    <path d="${nuka()}" fill="url(#ms9-nuka)"/>
    <path d="M-126 -40 C-124 -6 -112 26 -90 50" stroke="#FFF4E2" stroke-opacity="0.13" stroke-width="12" stroke-linecap="round" fill="none"/>
    <path d="M-123 -34 C-122 -14 -117 6 -108 22" stroke="#FFF8EC" stroke-opacity="0.42" stroke-width="3.2" stroke-linecap="round" fill="none"/>
    <ellipse cx="-117" cy="-47" rx="4.5" ry="2.2" fill="#FFFFFF" opacity="0.55"/>
  </g>
  <path d="M-46 86 L46 86 L46 100 A46 6 0 0 1 -46 100 Z" fill="url(#ms9-patka)"/>
  <path d="M-46 87.2 L46 87.2" stroke="#2A160C" stroke-opacity="0.55" stroke-width="2"/>
  <path d="M-30 98 A40 4 0 0 0 30 98" stroke="#FFE2C0" stroke-opacity="0.25" stroke-width="1.2" fill="none"/>
  <ellipse cx="0" cy="-70" rx="150" ry="30" fill="url(#ms9-vnitrek)"/>
  <g clip-path="url(#ms9-orez-okraje)">
    <ellipse cx="0" cy="-70" rx="150" ry="30" fill="url(#ms9-vnitrek-stin)"/>
    <path d="M-150 -70 A150 30 0 0 1 150 -70 A150 19 0 0 0 -150 -70 Z" fill="url(#ms9-nuka-vnitrek)"/>
    <path d="M-70 -86.6 C-69 -82 -68 -79 -66 -76.4 A4.2 4.2 0 0 0 -57.6 -76.4 C-58 -80 -59 -84 -58.6 -87.6 Z M28 -88.8 C29 -84 30 -80 31 -78 A3.4 3.4 0 0 0 37.8 -78 C38 -81 38 -85 37.6 -89 Z M96 -84.8 C97 -82 97.6 -80 98.6 -78.8 A3 3 0 0 0 104.6 -78.8 C104.8 -81 104.8 -83 104.6 -84 Z" fill="#E3D3B2" opacity="0.92"/>
    <ellipse cx="12" cy="-63" rx="62" ry="12" fill="url(#ms9-louze)"/>
    <path d="M-30 -66.5 C-16 -69.4 6 -70 22 -68.6" stroke="#FFE9C8" stroke-opacity="0.5" stroke-width="1.6" stroke-linecap="round" fill="none"/>
    <path d="M104 -88 C122 -84 136 -79 143 -73" stroke="#FFE6C4" stroke-opacity="0.34" stroke-width="3.4" stroke-linecap="round" fill="none"/>
  </g>
  <ellipse cx="0" cy="-70" rx="150" ry="30" fill="none" stroke="#E9DBBE" stroke-width="3.2"/>
  <path d="M-150 -70 A150 30 0 0 1 150 -70" fill="none" stroke="#B9703F" stroke-opacity="0.55" stroke-width="1.1"/>
  <path d="M-146 -63.4 A150 30 0 0 0 146 -63.4" fill="none" stroke="#FFF7E6" stroke-opacity="0.75" stroke-width="1.3" transform="translate(0 -1)"/>
  <path d="${SILUETA_D}" fill="none" stroke="#1F0F07" stroke-opacity="0.75" stroke-width="1.3"/>
</g>`;
}

function defs() {
  return `<defs>
  <linearGradient id="ms9-zed" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#2A201D"/>
    <stop offset="1" stop-color="#46352C"/>
  </linearGradient>
  <radialGradient id="ms9-lampa-svetlo" cx="86" cy="74" r="560" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#FFC676" stop-opacity="0.62"/>
    <stop offset="0.35" stop-color="#FFB466" stop-opacity="0.24"/>
    <stop offset="1" stop-color="#FFB466" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="ms9-lampa" cx="0.42" cy="0.4" r="0.62">
    <stop offset="0" stop-color="#FFF6DC"/>
    <stop offset="0.45" stop-color="#FFD58E"/>
    <stop offset="0.85" stop-color="#F09A48"/>
    <stop offset="1" stop-color="#D2702E"/>
  </radialGradient>
  <radialGradient id="ms9-lampa-zare" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="#FFD48A" stop-opacity="0.75"/>
    <stop offset="1" stop-color="#FFB45A" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="ms9-vyklenek" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#000000" stop-opacity="0.45"/>
    <stop offset="0.5" stop-color="#000000" stop-opacity="0.1"/>
    <stop offset="1" stop-color="#FFB466" stop-opacity="0.04"/>
  </linearGradient>
  <linearGradient id="ms9-sloupek" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#8A6444"/>
    <stop offset="0.4" stop-color="#6A4A32"/>
    <stop offset="1" stop-color="#3A281B"/>
  </linearGradient>
  <radialGradient id="ms9-svetlo-latka" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="#FFB466" stop-opacity="0.15"/>
    <stop offset="1" stop-color="#FFB466" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="ms9-stul" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#5E3A24"/>
    <stop offset="1" stop-color="#7A4C2E"/>
  </linearGradient>
  <linearGradient id="ms9-latka" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#34467E"/>
    <stop offset="0.45" stop-color="#22305F"/>
    <stop offset="1" stop-color="#18224A"/>
  </linearGradient>
  <linearGradient id="ms9-svitek" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#F3E8D2"/>
    <stop offset="1" stop-color="#E4D3B2"/>
  </linearGradient>
  <linearGradient id="ms9-glazura" x1="-150" y1="0" x2="150" y2="0" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#3A1C10"/>
    <stop offset="0.13" stop-color="#6E361C"/>
    <stop offset="0.3" stop-color="#A2552D"/>
    <stop offset="0.44" stop-color="#8C4626"/>
    <stop offset="0.72" stop-color="#5E2C16"/>
    <stop offset="1" stop-color="#2C140A"/>
  </linearGradient>
  <linearGradient id="ms9-glazura-stin" x1="0" y1="-60" x2="0" y2="90" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#000000" stop-opacity="0"/>
    <stop offset="0.55" stop-color="#000000" stop-opacity="0.1"/>
    <stop offset="1" stop-color="#000000" stop-opacity="0.42"/>
  </linearGradient>
  <linearGradient id="ms9-nuka" x1="0" y1="-70" x2="0" y2="40" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#F4EBD6"/>
    <stop offset="0.4" stop-color="#E7D7B6"/>
    <stop offset="0.72" stop-color="#C8C4AE"/>
    <stop offset="1" stop-color="#93A9AF"/>
  </linearGradient>
  <linearGradient id="ms9-nuka-vnitrek" x1="-150" y1="0" x2="150" y2="0" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#A89C84"/>
    <stop offset="0.5" stop-color="#E2D3B4"/>
    <stop offset="1" stop-color="#F6EEDC"/>
  </linearGradient>
  <linearGradient id="ms9-hlina" x1="-120" y1="0" x2="120" y2="0" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#7A5034"/>
    <stop offset="0.3" stop-color="#C4946A"/>
    <stop offset="0.6" stop-color="#A97A56"/>
    <stop offset="1" stop-color="#6A4228"/>
  </linearGradient>
  <linearGradient id="ms9-patka" x1="-46" y1="0" x2="46" y2="0" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#7E5436"/>
    <stop offset="0.32" stop-color="#C9A07A"/>
    <stop offset="0.62" stop-color="#A47654"/>
    <stop offset="1" stop-color="#5E3A24"/>
  </linearGradient>
  <linearGradient id="ms9-vnitrek" x1="-150" y1="0" x2="150" y2="0" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#1E0E07"/>
    <stop offset="0.38" stop-color="#4A2413"/>
    <stop offset="0.78" stop-color="#7E4224"/>
    <stop offset="1" stop-color="#5C2E18"/>
  </linearGradient>
  <linearGradient id="ms9-vnitrek-stin" x1="0" y1="-84" x2="0" y2="-40" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#000000" stop-opacity="0"/>
    <stop offset="1" stop-color="#000000" stop-opacity="0.38"/>
  </linearGradient>
  <radialGradient id="ms9-louze" cx="0.42" cy="0.45" r="0.6">
    <stop offset="0" stop-color="#1A0B05"/>
    <stop offset="0.65" stop-color="#3A1D0E"/>
    <stop offset="1" stop-color="#5A2E17" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="ms9-zlato" x1="-160" y1="-110" x2="160" y2="110" gradientUnits="userSpaceOnUse" spreadMethod="reflect">
    <stop offset="0" stop-color="#9A6C18"/>
    <stop offset="0.16" stop-color="#E5B44C"/>
    <stop offset="0.26" stop-color="#FFF1B4"/>
    <stop offset="0.38" stop-color="#E2AE44"/>
    <stop offset="0.55" stop-color="#B07E22"/>
    <stop offset="0.7" stop-color="#F6D57E"/>
    <stop offset="0.84" stop-color="#D9A33C"/>
    <stop offset="1" stop-color="#A4741C"/>
  </linearGradient>
  <radialGradient id="ms9-prasek" cx="0.4" cy="0.35" r="0.7">
    <stop offset="0" stop-color="#FFF4C4"/>
    <stop offset="0.45" stop-color="#E9BC52"/>
    <stop offset="1" stop-color="#9C6E1E"/>
  </radialGradient>
  <radialGradient id="ms9-zare-misky" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="#FFC664" stop-opacity="0.9"/>
    <stop offset="0.45" stop-color="#FFA640" stop-opacity="0.52"/>
    <stop offset="0.75" stop-color="#F09030" stop-opacity="0.18"/>
    <stop offset="1" stop-color="#F09030" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="ms9-svit-misky" cx="0.42" cy="0.4" r="0.6">
    <stop offset="0" stop-color="#FFE9B0" stop-opacity="0.3"/>
    <stop offset="1" stop-color="#FFE9B0" stop-opacity="0"/>
  </radialGradient>
  <clipPath id="ms9-orez-tela"><path d="${SILUETA_D}"/></clipPath>
  <clipPath id="ms9-orez-okraje"><ellipse cx="0" cy="-70" rx="150" ry="30"/></clipPath>
  <filter id="ms9-rozmaz" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3.4"/></filter>
  <filter id="ms9-rozmaz-velky" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="9"/></filter>
  <filter id="ms9-zar" x="-20%" y="-20%" width="140%" height="140%">
    <feMorphology operator="dilate" radius="3"/>
    <feGaussianBlur stdDeviation="4"/>
  </filter>
  <filter id="ms9-zlata-zare" x="-10%" y="-10%" width="120%" height="120%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="3.2" result="z"/>
    <feMerge><feMergeNode in="z"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <path id="ms9-jiskra" d="M0 -9 Q2.2 -2.2 9 0 Q2.2 2.2 0 9 Q-2.2 2.2 -9 0 Q-2.2 -2.2 0 -9 Z"/>
  ${miska()}
</defs>`;
}

/* ——— Pozadí: stěna, lucerna, svitek, stolek, šátek, nářadí ——— */

function pozadi() {
  return `<g class="ms9-pozadi">
  <rect width="800" height="186" fill="url(#ms9-zed)"/>
  <path d="M0 22 H548" stroke="#1C1513" stroke-width="5" opacity="0.55"/>
  <path d="M0 26 H548" stroke="#5A463A" stroke-width="1" opacity="0.4"/>
  <g class="ms9-tokonoma">
    <rect x="560" y="0" width="190" height="186" fill="#1C1411"/>
    <rect x="560" y="0" width="190" height="186" fill="url(#ms9-vyklenek)"/>
    <rect x="560" y="0" width="190" height="13" fill="#3A2A1F"/>
    <path d="M560 13.5 H750" stroke="#0E0A08" stroke-width="2.4" opacity="0.7"/>
    <rect x="547" y="0" width="14" height="186" fill="url(#ms9-sloupek)"/>
    <path d="M552 30 C551 70 553 120 551 180" stroke="#2A1C13" stroke-width="1" opacity="0.5" fill="none"/>
    <rect x="750" y="0" width="6" height="186" fill="#2A1E17"/>
  </g>
  <g class="ms9-svitek">
    <path d="M655 13 L637 20 M655 13 L673 20" stroke="#8A7458" stroke-width="1" fill="none"/>
    <rect x="623" y="28" width="76" height="140" fill="#000000" opacity="0.35" filter="url(#ms9-rozmaz)"/>
    <rect x="617" y="22" width="76" height="140" rx="1.5" fill="#5E4A38"/>
    <rect x="617" y="22" width="76" height="16" fill="#4A3A2C"/>
    <rect x="626" y="42" width="58" height="104" fill="url(#ms9-svitek)"/>
    <text class="ms9-svitek-znak" x="655" y="104" text-anchor="middle" font-family="Yuji Syuku, Yu Mincho, serif" font-size="44" fill="#231A15">金</text>
    <rect x="665" y="120" width="9" height="11" rx="1.2" fill="#C4432B" opacity="0.9"/>
    <rect x="611" y="19" width="88" height="5" rx="2.5" fill="#2E2219"/>
    <rect x="608" y="160" width="94" height="7" rx="3.5" fill="#2E2219"/>
    <rect x="605" y="160.5" width="5" height="6" rx="2" fill="#B8925A"/>
    <rect x="700" y="160.5" width="5" height="6" rx="2" fill="#B8925A"/>
  </g>
  <rect y="186" width="800" height="374" fill="url(#ms9-stul)"/>
  <path d="M0 186 H800" stroke="#C8946A" stroke-width="2" opacity="0.7"/>
  <path d="M0 188.5 H800" stroke="#2A170C" stroke-width="2.4" opacity="0.5"/>
  <g stroke="#3E2414" stroke-width="1.4" fill="none" opacity="0.32" stroke-linecap="round">
    <path d="M0 236 C10 300 4 420 14 560"/>
    <path d="M24 196 C30 300 20 430 30 560"/>
    <path d="M770 196 C764 300 776 430 768 560"/>
    <path d="M788 230 C782 330 792 450 786 560"/>
  </g>
  <path d="M58 205 L750 198 L770 572 L26 572 Z" fill="#0A0F24" opacity="0.45" filter="url(#ms9-rozmaz)"/>
  <path d="M54 200 L752 193 L768 566 L30 566 Z" fill="url(#ms9-latka)"/>
  <path d="M65 210.5 L741 203.6 L756.4 556 L41.6 556 Z" fill="none" stroke="#4A5E9E" stroke-width="1.6" opacity="0.55"/>
  <path d="M70.5 215.5 L735.5 208.8 L750.8 550.5 L47.2 550.5 Z" fill="none" stroke="#A9B6E0" stroke-width="0.9" stroke-dasharray="4 5" opacity="0.32"/>
  <g fill="none" stroke-linecap="round">
    <path d="M34 386 C220 378 560 390 764 378" stroke="#4C5F9C" stroke-width="3.2" opacity="0.32"/>
    <path d="M34 389.5 C220 381.5 560 393.5 764 381.5" stroke="#0B1130" stroke-width="2.2" opacity="0.4"/>
    <path d="M404 196 C398 300 410 430 402 566" stroke="#4C5F9C" stroke-width="3.2" opacity="0.28"/>
    <path d="M407.5 196 C401.5 300 413.5 430 405.5 566" stroke="#0B1130" stroke-width="2.2" opacity="0.36"/>
  </g>
  <g fill="none" stroke="#C9D3F2" stroke-width="1.3" opacity="0.13">
    ${seigaiha(660, 552)}
  </g>
  <ellipse cx="170" cy="300" rx="360" ry="240" fill="url(#ms9-svetlo-latka)"/>
  <rect width="800" height="560" fill="url(#ms9-lampa-svetlo)"/>
  <g class="ms9-lampa">
    <path d="M86 0 V22" stroke="#1A1411" stroke-width="1.6"/>
    <circle cx="86" cy="76" r="96" fill="url(#ms9-lampa-zare)"/>
    <rect x="66" y="20" width="40" height="9" rx="3" fill="#201814"/>
    <ellipse cx="86" cy="76" rx="38" ry="48" fill="url(#ms9-lampa)"/>
    <g fill="none" stroke="#C9783A" stroke-width="1" opacity="0.5">
      <path d="M50 58 Q86 64 122 58"/><path d="M48 76 Q86 83 124 76"/><path d="M50 94 Q86 100 122 94"/>
      <path d="M56 42 Q86 47 116 42"/><path d="M56 110 Q86 115 116 110"/>
    </g>
    <path d="M70 52 C66 66 66 86 72 100" stroke="#FFFBEE" stroke-width="5" stroke-linecap="round" fill="none" opacity="0.45"/>
    <rect x="66" y="121" width="40" height="9" rx="3" fill="#201814"/>
    <path d="M86 130 V140" stroke="#C4432B" stroke-width="2"/>
    <path d="M82 140 h8 l-1 12 h-6 Z" fill="#C4432B"/>
  </g>
</g>`;
}

/** Vlnky seigaiha v rohu šátku — tři řady oblouků */
function seigaiha(cx: number, cy: number) {
  let d = "";
  for (let rada = 0; rada < 3; rada++) {
    for (let k = -2; k <= 2; k++) {
      const x = cx + k * 26 + (rada % 2) * 13;
      const y = cy - rada * 11;
      for (const r of [12, 8, 4]) d += `M${x - r} ${y} A${r} ${r} 0 0 1 ${x + r} ${y} `;
    }
  }
  return `<path d="${d}"/>`;
}

/** Mistička s urushi, mistička se zlatým práškem a štětec na podložce */
function nacini() {
  return `<g class="ms9-nacini">
  <g class="ms9-urushi-miska">
    <ellipse cx="74" cy="522" rx="50" ry="17" fill="#05081A" opacity="0.45" filter="url(#ms9-rozmaz)"/>
    <path d="M26 512 C28 528 46 536 74 536 C102 536 120 528 122 512 Z" fill="#1A0F0C"/>
    <ellipse cx="74" cy="512" rx="48" ry="14" fill="#2A1612"/>
    <ellipse cx="74" cy="512" rx="44" ry="12" fill="#8E2A1C"/>
    <ellipse cx="74" cy="513.5" rx="34" ry="8.6" fill="#0C0806"/>
    <path d="M52 510 C60 507 74 506 84 507" stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round" fill="none" opacity="0.55"/>
    <path d="M30 506 C42 500 70 498 92 500" stroke="#FFC9A0" stroke-width="1.4" fill="none" opacity="0.35"/>
    <path d="M58 516 L138 492" stroke="#3A2414" stroke-width="7" stroke-linecap="round" opacity="0.35"/>
    <path d="M56 514 L136 489" stroke="#D9B88A" stroke-width="5.5" stroke-linecap="round"/>
    <path d="M60 512 L134 489" stroke="#F2DDB8" stroke-width="1.4" stroke-linecap="round" opacity="0.7"/>
    <path d="M56 514 L66 511" stroke="#0C0806" stroke-width="5.5" stroke-linecap="round"/>
  </g>
  <g class="ms9-zlato-miska">
    <ellipse cx="724" cy="512" rx="46" ry="15" fill="#05081A" opacity="0.45" filter="url(#ms9-rozmaz)"/>
    <path d="M682 502 C684 516 700 524 724 524 C748 524 764 516 766 502 Z" fill="#D9D2C4"/>
    <ellipse cx="724" cy="502" rx="42" ry="12.5" fill="#F4EFE5"/>
    <ellipse cx="724" cy="503" rx="34" ry="9" fill="#C9BFAE"/>
    <path d="M696 504 C700 494 712 490 724 490 C738 490 748 494 752 504 C740 508 708 508 696 504 Z" fill="url(#ms9-prasek)"/>
    <path d="M708 496 C714 493 724 492 732 493" stroke="#FFF8DA" stroke-width="1.6" stroke-linecap="round" fill="none" opacity="0.8"/>
    <use href="#ms9-jiskra" transform="translate(716 494) scale(0.42)" fill="#FFF8DA"/>
    <use href="#ms9-jiskra" transform="translate(738 497) scale(0.3)" fill="#FFF8DA"/>
  </g>
  <g class="ms9-stetec-lezi">
    <path d="M674 542 C677 535 687 535 690 542 Z" fill="#E9E1D2"/>
    <path d="M674 542 C677 536.6 687 536.6 690 542" stroke="#FFFFFF" stroke-width="1" fill="none" opacity="0.6"/>
    <path d="M610 548 L712 532" stroke="#1E0F08" stroke-width="5" stroke-linecap="round" opacity="0.35" transform="translate(3 5)"/>
    <path d="M610 548 L712 532" stroke="#C9A46A" stroke-width="4.6" stroke-linecap="round"/>
    <path d="M612 546.6 L710 531.2" stroke="#F0D9A8" stroke-width="1.2" stroke-linecap="round" opacity="0.7"/>
    <path d="M640 543.8 L639.4 540.2 M668 539.4 L667.4 535.8" stroke="#8A6A3E" stroke-width="1.2"/>
    <path d="M610 548 L600 549.6" stroke="#2B2420" stroke-width="5.4" stroke-linecap="round"/>
    <path d="M600 549.6 C594 550.4 588 551.4 578 552.4 C587 553.6 594 553.2 600.4 552.4 Z" fill="#D6A23A"/>
</g>
</g>`;
}

/* ——— Střepy ——— */

/** Transformace střepu: těžiště na polohu, natočení a (při zvednutí) trochu zvětšit */
export const transformace = (d: Dil, pol: Poloha, zvetseni = 1) =>
  `translate(${f2(pol.x)} ${f2(pol.y)}) rotate(${f2(pol.a)})${zvetseni !== 1 ? ` scale(${f2(zvetseni)})` : ""} translate(${f2(-d.stred[0])} ${f2(-d.stred[1])})`;

/** Kam padne stín střepu: světlo je vlevo nahoře, stín tedy vpravo dolů ve scéně, ať je střep natočený jakkoli */
export const posunStinu = (a: number, zdvih = 0) => {
  const dx = 4 + zdvih * 6;
  const dy = 7 + zdvih * 9;
  const r = (-a * Math.PI) / 180;
  return `translate(${f2(Math.cos(r) * dx - Math.sin(r) * dy)} ${f2(Math.sin(r) * dx + Math.cos(r) * dy)})`;
};

/** Jeden střep: stín, záře výběru, kus misky, lom (hrana s hlínou) a lesk laku */
export function strepSvg(v: PripravenyVzor, i: number, pol: Poloha, zvetseni = 1) {
  const d = v.dily[i];
  return `<g class="ms9-strep" data-i="${i}" transform="${transformace(d, pol, zvetseni)}">
  <g class="ms9-strep-stin" transform="${posunStinu(pol.a)}"><g filter="url(#ms9-rozmaz)" opacity="0.62"><path d="${SILUETA_D}" clip-path="url(#ms9-d${i})" fill="#04071A"/></g></g>
  <g class="ms9-strep-zare" filter="url(#ms9-zar)" display="none"><path d="${SILUETA_D}" clip-path="url(#ms9-d${i})" fill="#FBE3A0"/></g>
  <g clip-path="url(#ms9-d${i})"><use href="#ms9-miska"/></g>
  <g clip-path="url(#ms9-orez-tela)" fill="none" stroke-linejoin="round">
    <path class="ms9-strep-lom" d="${d.d}" clip-path="url(#ms9-d${i})" stroke="#D9BE9C" stroke-width="3.6"/>
    <path d="${d.d}" clip-path="url(#ms9-d${i})" stroke="#2A170D" stroke-opacity="0.8" stroke-width="1"/>
    <path class="ms9-strep-lesk" d="${d.d}" clip-path="url(#ms9-d${i})" pathLength="100" stroke="#FFF8E4" stroke-width="3" stroke-dasharray="12 100" opacity="0"/>
  </g>
</g>`;
}

/** Vrstva střepů: ořezy dílů a střepy (volné nahoře, přilepené pod nimi) */
export function strepySvg(v: PripravenyVzor, polohy: Poloha[]) {
  const orezy = v.dily.map((d, i) => `<clipPath id="ms9-d${i}"><path d="${d.d}"/></clipPath>`).join("");
  return `<defs>${orezy}</defs><g class="ms9-pevne"></g><g class="ms9-volne">${v.dily.map((_, i) => strepSvg(v, i, polohy[i])).join("")}</g>`;
}

/** Tmavé čáry laku na spárách a místo pro zlato — v souřadnicích misky */
export function sparySvg(v: PripravenyVzor) {
  return `<g clip-path="url(#ms9-orez-tela)" fill="none" stroke-linecap="round" stroke-linejoin="round">
  <ellipse class="ms9-svit" cx="0" cy="0" rx="170" ry="120" fill="url(#ms9-svit-misky)" opacity="0"/>
  <g class="ms9-urushi" stroke="#140C08" stroke-width="3" opacity="0">${v.spary.map((s) => `<path d="${s.d}" pathLength="1"/>`).join("")}</g>
  <path class="ms9-zlato-okraj" d="" stroke="#3A2408" stroke-opacity="0.45" stroke-width="6.6"/>
  <path class="ms9-zlato-stopa" d="" stroke="url(#ms9-zlato)" stroke-width="5"/>
  <path class="ms9-zlato-lesk" d="" stroke="#FFF7D6" stroke-opacity="0.85" stroke-width="1.2" transform="translate(-0.7 -0.8)"/>
  <g class="ms9-beh" stroke="#FFFBEA" stroke-width="2.6" stroke-linecap="butt" stroke-dasharray="18 100" display="none">${v.spary.map((s) => `<path d="${s.d}" pathLength="100"/>`).join("")}</g>
  <g class="ms9-dalsi"><path d=""/></g>
</g>
<g class="ms9-kapky"></g>`;
}

/* ——— Štětec, který jde za ukazatelem ——— */

const STETEC = `<g class="ms9-stetec" transform="translate(-200 -200)" display="none">
  <g transform="rotate(-38)">
    <path d="M0 0 C-2.6 -5 -3.6 -12 -3.2 -20 L3.2 -20 C3.6 -12 2.6 -5 0 0 Z" fill="#2B2420"/>
    <path d="M0 0 C-1.4 -3 -2 -6 -2.1 -9 L2.1 -9 C2 -6 1.4 -3 0 0 Z" fill="#E9B94E"/>
    <rect x="-3.6" y="-27" width="7.2" height="7.4" rx="1.4" fill="#2B2420"/>
    <rect x="-2.8" y="-92" width="5.6" height="66" rx="2.8" fill="#C9A46A"/>
    <rect x="-1.6" y="-90" width="1.4" height="62" rx="0.7" fill="#F0D9A8" opacity="0.7"/>
    <path d="M-2.8 -52 h5.6 M-2.8 -78 h5.6" stroke="#8A6A3E" stroke-width="1.1"/>
  </g>
</g>`;

/* ——— Celá scéna ——— */

/** SVG scény. Bez argumentů výchozí stav: první vzor, střepy rozházené se semínkem */
export function kresba(vzor = 0, polohy?: Poloha[]) {
  const v = pripravVzor(vzor);
  const pol = polohy ?? rozhazej(v, nahoda(9));
  return `<svg class="mu-kresba" viewBox="0 0 ${VIEW_W} ${VIEW_H}" aria-hidden="true">
${defs()}
${pozadi()}
${nacini()}
<ellipse class="ms9-zare-misky" cx="${MISKA.x}" cy="${MISKA.y + 6}" rx="270" ry="190" fill="url(#ms9-zare-misky)" opacity="0"/>
<g class="ms9-cil" transform="translate(${MISKA.x} ${MISKA.y})">
  <ellipse class="ms9-cil-stin" cx="2" cy="106" rx="112" ry="13" fill="#03061A" opacity="0" filter="url(#ms9-rozmaz)"/>
  <path class="ms9-cil-obrys" d="${SILUETA_D}" fill="#0A1130" fill-opacity="0.26" stroke="#B9C6EE" stroke-opacity="0.5" stroke-width="1.6" stroke-dasharray="7 6"/>
  <ellipse class="ms9-cil-obrys" cx="0" cy="-70" rx="150" ry="30" fill="none" stroke="#B9C6EE" stroke-opacity="0.32" stroke-width="1.2" stroke-dasharray="5 6"/>
  <g class="ms9-napoveda"></g>
</g>
<g class="ms9-strepy" data-vzor="${vzor}">${strepySvg(v, pol)}</g>
<g class="ms9-spary" transform="translate(${MISKA.x} ${MISKA.y})">${sparySvg(v)}</g>
<g class="ms9-jiskry"></g>
${STETEC}
</svg>`;
}

/** Ikona otočení: šipka po kruhu (zrcadlí se pro druhý směr) */
const ikonaOtoc = (smer: 1 | -1) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true"><g transform="${smer < 0 ? "matrix(-1 0 0 1 24 0)" : ""}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M18.4 8.6 A7.4 7.4 0 1 0 19.4 14"/><path d="M19.6 3.6 L18.6 8.8 L13.6 7.6"/></g></svg>`;

/** HTML nad kresbou: tlačítka otáčení u vybraného střepu a fokusovatelné zástupce střepů pro klávesnici */
export function prekryvy() {
  const zastupci = Array.from(
    { length: 6 },
    (_, i) => `<button type="button" class="ms9-fokus" data-i="${i}" aria-label="Střep ${i + 1} ze 6 — šipky posouvají, Q a E otáčí, Enter přiloží"></button>`,
  ).join("");
  return `<button type="button" class="ms9-otoc" data-smer="-1" tabindex="-1" aria-label="Otočit střep doleva" hidden>${ikonaOtoc(-1)}</button>
<button type="button" class="ms9-otoc" data-smer="1" tabindex="-1" aria-label="Otočit střep doprava" hidden>${ikonaOtoc(1)}</button>
<div class="ms9-fokusy" role="group" aria-label="Střepy misky">${zastupci}<button type="button" class="ms9-fokus ms9-fokus-zlato" aria-label="Obtáhnout další spáru zlatem (Enter)" hidden></button></div>`;
}

/** Celá scéna bez Střípka (ten je v .astro jako komponenta) — pro testy */
export const scena = () => `<div class="mu-okno">${kresba()}<div class="ms9-kami" aria-hidden="true"></div>${prekryvy()}</div>`;
