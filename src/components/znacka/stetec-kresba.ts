/**
 * Slovní značka JIRO saku napsaná štětcem — kresba pro ZnackaStetec.astro.
 *
 * Písmena jsou kostry (střední čáry jako SVG cesty), přes které se táhne
 * štětec stejně jako u ensō: tah je vyplněný tvar s proměnnou šířkou,
 * štětec na začátku dosedne, vodorovné tahy jsou tenčí než svislé
 * a v kurzívě saku jsou silnější tahy dolů. Ocas tahu se vytahuje do
 * suchého štětce — podélné struhy jdou do masky.
 *
 * Souřadnice: účaří y = 0, verzálka JIRO měří 34 jednotek, x-výška 20.
 * Počítá se jednou při buildu; návrhy variant jsou v navrhy/znacka-*.html.
 */

type Bod = [number, number];

const f = (n: number) => (Math.round(n * 10) / 10).toString();
const cesta = (body: Bod[]) => `M${body.map((p) => `${f(p[0])} ${f(p[1])}`).join(" L")}`;

/** Kostra písmene (jen M, L, C) → husté body */
function rozeber(d: string): Bod[] {
  const t = d.match(/[MLC]|-?\d*\.?\d+/g) ?? [];
  const body: Bod[] = [];
  let i = 0;
  let cmd = "";
  let cur: Bod = [0, 0];
  const num = () => parseFloat(t[i++]);
  while (i < t.length) {
    if (/[MLC]/.test(t[i])) cmd = t[i++];
    if (cmd === "M") {
      cur = [num(), num()];
      body.push(cur);
      cmd = "L";
    } else if (cmd === "L") {
      const p: Bod = [num(), num()];
      for (let k = 1; k <= 12; k++) body.push([cur[0] + ((p[0] - cur[0]) * k) / 12, cur[1] + ((p[1] - cur[1]) * k) / 12]);
      cur = p;
    } else {
      const a = cur;
      const b: Bod = [num(), num()];
      const c: Bod = [num(), num()];
      const e: Bod = [num(), num()];
      for (let k = 1; k <= 30; k++) {
        const s = k / 30;
        const u = 1 - s;
        body.push([
          u * u * u * a[0] + 3 * u * u * s * b[0] + 3 * u * s * s * c[0] + s * s * s * e[0],
          u * u * u * a[1] + 3 * u * u * s * b[1] + 3 * u * s * s * c[1] + s * s * s * e[1],
        ]);
      }
      cur = e;
    }
  }
  return body;
}

/** Lomená čára → t ∈ [0, 1] → bod podle délky */
function podleDelky(body: Bod[]) {
  const L = [0];
  for (let i = 1; i < body.length; i++) L.push(L[i - 1] + Math.hypot(body[i][0] - body[i - 1][0], body[i][1] - body[i - 1][1]));
  const celk = L[L.length - 1] || 1;
  const fn = (t: number): Bod => {
    const x = Math.min(1, Math.max(0, t)) * celk;
    let lo = 0;
    let hi = L.length - 1;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (L[m] <= x) lo = m;
      else hi = m;
    }
    const k = (x - L[lo]) / (L[hi] - L[lo] || 1);
    return [body[lo][0] + (body[hi][0] - body[lo][0]) * k, body[lo][1] + (body[hi][1] - body[lo][1]) * k];
  };
  return Object.assign(fn, { delka: celk });
}

/** Umístění písmene: posun, měřítko a sklon kurzívy */
const umisti =
  ({ x = 0, y = 0, s = 1, sklon = 0 }) =>
  ([lx, ly]: Bod): Bod => [x + (lx - ly * sklon) * s, y + ly * s];

type Zacatek = "kapka" | "mekky" | "ostry";
type Konec = "suchy" | "tupy" | "ostry";
interface Stetec {
  w: number;
  /** 0..1 — o kolik jsou vodorovné tahy tenčí než svislé */
  kontrast?: number;
  /** 0..1 — o kolik jsou tahy dolů silnější (kurzíva) */
  dolu?: number;
  zacatek?: Zacatek;
  konec?: Konec;
}

/** Jeden tah štětce: obrys k vyplnění, kulaté konce a struhy suchého štětce */
function tah(body: Bod[], { w, kontrast = 0.35, dolu = 0, zacatek = "mekky", konec = "suchy" }: Stetec) {
  const st = podleDelky(body);
  const kroku = Math.max(24, Math.round(st.delka * 1.1));
  const profil = (t: number) => {
    let p = 1;
    if (zacatek === "kapka") p *= t < 0.06 ? 0.78 + 0.22 * (t / 0.06) : 1;
    else if (zacatek === "ostry") p *= t < 0.18 ? 0.25 + 0.75 * Math.sin(((t / 0.18) * Math.PI) / 2) : 1;
    else p *= t < 0.08 ? 0.6 + 0.4 * (t / 0.08) : 1;
    p *= 1 - 0.08 * t;
    if (konec === "suchy") p *= t > 0.55 ? 1 - 0.82 * Math.pow((t - 0.55) / 0.45, 1.4) : 1;
    else if (konec === "ostry") p *= t > 0.72 ? 1 - 0.95 * Math.pow((t - 0.72) / 0.28, 1.2) : 1;
    return p;
  };
  /* Směr tahu, vyhlazený přes okolí, ať se šířka ve špičce nezlomí */
  const smer = (t: number) => {
    let acc = 0;
    for (let k = -3; k <= 3; k++) {
      const a = st(Math.max(0, t + k * 0.01 - 0.004));
      const b = st(Math.min(1, t + k * 0.01 + 0.004));
      const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const sy = (b[1] - a[1]) / d;
      const vodorovne = 1 - kontrast * (1 - Math.abs(sy));
      const dolu_ = dolu ? 1 - dolu + dolu * Math.max(0, sy) * 1.15 : 1;
      acc += vodorovne * dolu_;
    }
    return acc / 7;
  };
  const sirka = (t: number) => w * profil(t) * smer(t);
  const normala = (t: number): Bod => {
    const a = st(Math.max(0, t - 0.004));
    const b = st(Math.min(1, t + 0.004));
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [-(b[1] - a[1]) / d, (b[0] - a[0]) / d];
  };

  const levy: Bod[] = [];
  const pravy: Bod[] = [];
  for (let i = 0; i <= kroku; i++) {
    const t = i / kroku;
    const [x, y] = st(t);
    const [nx, ny] = normala(t);
    const s = sirka(t) / 2;
    levy.push([x + nx * s, y + ny * s]);
    pravy.push([x - nx * s, y - ny * s]);
  }
  const [ax, ay] = st(0);
  const [bx, by] = st(1);
  const tvar =
    `<path d="${cesta(levy)} ${cesta(pravy.reverse()).replace("M", "L")} Z"/>` +
    `<circle cx="${f(ax)}" cy="${f(ay)}" r="${f((sirka(0) / 2) * (zacatek === "kapka" ? 1.15 : 1))}"/>` +
    `<circle cx="${f(bx)}" cy="${f(by)}" r="${f(sirka(1) / 2)}"/>`;

  /* Suchý štětec: dvě struhy v ocasu, kudy už tuš nedošla */
  let struhy = "";
  if (konec === "suchy" && st.delka > 22) {
    const pomlcky = [
      [1.6, 0.9, 0.6, 1.4],
      [0.8, 1.2, 1.8, 0.8],
    ];
    [-0.14, 0.2].forEach((o, j) => {
      const od = 0.62 + 0.05 * j;
      const body: Bod[] = [];
      for (let i = 0; i <= 24; i++) {
        const t = Math.min(1, od + ((1.02 - od) * i) / 24);
        const [x, y] = st(t);
        const [nx, ny] = normala(t);
        body.push([x + nx * o * w, y + ny * o * w]);
      }
      struhy +=
        `<path d="${cesta(body)}" stroke-width="${f(w * (0.06 + 0.02 * j))}" ` +
        `stroke-dasharray="${pomlcky[j].map((p) => f(p * w)).join(" ")}"/>`;
    });
  }
  return { tvar, struhy };
}

interface Kostra {
  d: string;
  zacatek?: Zacatek;
  konec?: Konec;
}

/** Verzálky JIRO — každé písmeno s posuvem k dalšímu */
const JIRO: { posuv: number; tahy: Kostra[] }[] = [
  /* Háček J drží sílu až do konce — se suchým ocasem se vlevo ztrácel */
  { posuv: 19, tahy: [{ d: "M12.5 -34 C13 -24 13.4 -12 12 -6 C10.5 0.5 3 1.6 0 -4.5", konec: "tupy" }] },
  { posuv: 12, tahy: [{ d: "M5 -34 C5.4 -22 5.2 -11 5.6 0", konec: "tupy" }] },
  {
    posuv: 24,
    tahy: [
      { d: "M4 -34 C4.4 -22 4.3 -10 4.6 0", konec: "tupy" },
      { d: "M4.2 -33.5 C12 -35.5 20.5 -33 20.5 -25.5 C20.5 -18.5 13 -16.5 5.5 -17.5", zacatek: "mekky", konec: "ostry" },
      { d: "M11 -17.2 C14 -11 17.5 -5 22.5 0.5", konec: "suchy" },
    ],
  },
  {
    posuv: 34,
    tahy: [
      {
        d: "M18.5 -34.2 C8.5 -34.5 2.5 -26 2.5 -17 C2.5 -7 9 0.6 17.5 0.6 C26.5 0.6 32 -7.5 32 -17.5 C32 -27 26 -33.8 17 -33.4 C15 -33.2 13.8 -32.6 13 -31.8",
        zacatek: "kapka",
        konec: "suchy",
      },
    ],
  },
];

/** „saku“ po písmenech, psané stojatě — sklon dodá umístění. Mezi písmeny se štětec zvedá. */
const SAKU: Kostra[] = [
  { d: "M10.5 -18.5 C7 -21.5 1.5 -19.5 2.5 -14.5 C3.5 -10 11.5 -10.5 11 -5 C10.5 0.5 2.5 1 -0.5 -3", zacatek: "mekky", konec: "suchy" },
  { d: "M26 -16 C23 -21 15 -19.5 15 -10.5 C15 -3.5 19 -0.2 22 -1.8 C25 -3.5 26.5 -11 27.5 -19.5 C26.5 -11 26 -3 29.5 -0.8", zacatek: "mekky", konec: "ostry" },
  { d: "M40.5 -34 C39.5 -22 38.5 -10 38 0", zacatek: "kapka", konec: "tupy" },
  { d: "M49 -18.5 C45 -16 42 -12 39 -8.5 C43 -8 46 -3 51 0", zacatek: "mekky", konec: "suchy" },
  { d: "M55.5 -19.5 C55 -12 53.5 -3.5 57.5 -1 C61.5 1 64.5 -9 66 -19.5 C65 -11 64.5 -3 68.5 0", zacatek: "mekky", konec: "suchy" },
];

/** Kde začíná saku a kam sahá soumrak přes něj */
export const SAKU_OD = 101;
/** saku je o pětinu větší než kostra — písmo i tah štětce */
const SAKU_MERITKO = 1.2;
export const SAKU_DO = Math.round(SAKU_OD + 73 * SAKU_MERITKO);
/** Výřez kresby: x, y, šířka, výška (v jednotkách, verzálka = 34) */
export const VIEWBOX: [number, number, number, number] = [-3, -46, 196, 52];
export const VERZALKA = 34;

function napis() {
  let jiro = "";
  let saku = "";
  let struhy = "";
  let x = 0;
  for (const p of JIRO) {
    const kam = umisti({ x });
    for (const k of p.tahy) {
      const t = tah(rozeber(k.d).map(kam), { w: 5.4, kontrast: 0.42, zacatek: k.zacatek ?? "kapka", konec: k.konec });
      jiro += t.tvar;
      struhy += t.struhy;
    }
    x += p.posuv;
  }
  const kamSaku = umisti({ x: SAKU_OD, s: SAKU_MERITKO, sklon: 0.22 });
  for (const k of SAKU) {
    const t = tah(rozeber(k.d).map(kamSaku), { w: 4.4 * SAKU_MERITKO, kontrast: 0.15, dolu: 0.55, zacatek: k.zacatek, konec: k.konec });
    saku += t.tvar;
    struhy += t.struhy;
  }
  return { jiro, saku, struhy };
}

/** Hotové tvary — počítají se jednou, komponenta je jen obalí */
export const STETEC = napis();
