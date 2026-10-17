/**
 * Stojan ema 絵馬掛け na louce Kontaktu (components/kontakt/Otazky.astro).
 *
 * Jeden velký předmět jako u svatyně: dva cedrové sloupy na kamenných
 * patkách, sedlová střecha z měděného plechu s měděnkou a prohnutými okapy,
 * uprostřed štít s pozlacenou rozetou 懸魚 a lakovanou deskou 扁額, pod
 * okapem šimenawa s papírovými klikaticemi 紙垂, v rozích bronzové lucerny
 * a u kraje zvonec suzu s pestrým provazem. Za sloupy je stěna starých
 * destiček cizích lidí (rok koně 午, takže hodně z nich má koně) a před ní
 * na šňůře kōhaku visí deset čerstvých destiček party s otázkami — ty jsou
 * HTML (Otazky.astro), tady jsou jen jejich malby (`lic`, `rub`, `prazdna`).
 *
 * Šňůra je pokračování té od Futatsu: z louky přijde zleva na konec
 * horního trámu (kotva `vstup`), vede po trámech, kolem sloupu se omotá
 * o trám níž a z konce posledního trámu visí dolů k vývěsce (kotva
 * `vystup`). Destičky jsou na ní uvázané očkem v nejnižších bodech
 * průvěsů mezi úvazky.
 *
 * Tři rozvržení podle šířky okna (siroka ≥ 1080 px, stredni 700–1079,
 * uzka < 700) počítá jedna funkce `rozvrh` — z ní je kresba i procenta
 * pro HTML, takže destičky, parta, zvonec a kotvy sedí na pixel. Spodní
 * okraj kresby je zem (paty sloupů); u paty zbyla jen Bublinka, kouká
 * zpoza sloupu (parta je namalovaná na destičkách).
 *
 * Kresby jsou text (SVG v řetězci) jako ostatní kresby Kontaktu. Sdílené
 * kusy (staré destičky, dřevo destiček, přechody) jsou jednou v `zasoba()`
 * a varianty i destičky se na ně odkazují přes <use> a url(#…).
 * Id: ko-em- (sdílené), ko-em-s-/-m-/-u- (varianty stojanu).
 * Barvy jsou atributy, aby kresba platila i v náhledu bez CSS; třídy
 * svt-* přebarví roční období (svitaniStyly), ko-ema-zare a ko-ema-noc
 * řídí noc (kontakt-ema.css), ko-provaz-* jsou barvy šňůry (kontakt.css).
 */
import { f, nahoda, lerp, omez, provazek, type Bod } from "./zaklad";
import type { PostavaId } from "../../../data/parta";

/* ═══ Režimy a míry ═══ */

export type Rezim = "siroka" | "stredni" | "uzka";
export const REZIMY: Rezim[] = ["siroka", "stredni", "uzka"];
export const PRIPONA: Record<Rezim, "s" | "m" | "u"> = { siroka: "s", stredni: "m", uzka: "u" };

/** Box destičky v jednotkách: nahoře očko kolem šňůry, pod ním deska */
export const DESKA = { W: 200, H: 180 } as const;
/** Tvar desky: špička střechy, ramena, dno, okraj, zaoblení dna, díra pro šňůrku, střed šňůry stojanu */
const D = { vrch: 22, ramena: 60, dno: 174, kraj: 5, r: 8, dira: 34, snura: 7 };

/** Kde má kami v rámu 180 × 180 nohy (střed stínu) — podíl výšky rámu */
export const PATA: Record<PostavaId, number> = {
  vazicka: 0.85,
  samotka: 0.915,
  kachlik: 0.87,
  kapka: 0.885,
  stripek: 0.865,
  hlinka: 0.82,
  cedulka: 0.845,
  pecinka: 0.865,
  bublinka: 0.865,
};

/** Pečeť 判子 na rubu: jeden znak podle toho, nad čím kdo bdí */
export const HANKO: Record<PostavaId, string> = {
  kapka: "滴",
  pecinka: "窯",
  hlinka: "土",
  stripek: "金",
  vazicka: "花",
  samotka: "棚",
  kachlik: "正",
  cedulka: "札",
  bublinka: "泡",
};

const P = (x: number, y: number) => `${f(x)} ${f(y)}`;
const lomena = (b: Bod[], z = true) => `M${b.map(([x, y]) => P(x, y)).join("L")}${z ? "Z" : ""}`;
const kvadr = (a: Bod, c: Bod, b: Bod) => (t: number): Bod => {
  const u = 1 - t;
  return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]];
};
const vzorek = (fn: (t: number) => Bod, n: number): Bod[] => Array.from({ length: n + 1 }, (_, i) => fn(i / n));
/** Posun lomené čáry o `d` kolmo (kladně vlevo od směru chůze v SVG, tj. dolů pro cestu doprava) */
function posun(B: Bod[], d: number): Bod[] {
  return B.map((p, i) => {
    const a = B[Math.max(0, i - 1)], b = B[Math.min(B.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    return [p[0] - (dy / l) * d, p[1] + (dx / l) * d];
  });
}
/** Vzorkovač lomené čáry podle délky */
function poCeste(B: Bod[]): (t: number) => Bod {
  const d = [0];
  for (let i = 1; i < B.length; i++) d.push(d[i - 1] + Math.hypot(B[i][0] - B[i - 1][0], B[i][1] - B[i - 1][1]));
  const L = d[d.length - 1] || 1;
  return (t) => {
    const s = omez(t) * L;
    let i = 1;
    while (i < d.length - 1 && d[i] < s) i++;
    const u = (s - d[i - 1]) / (d[i] - d[i - 1] || 1);
    return [lerp(B[i - 1][0], B[i][0], u), lerp(B[i - 1][1], B[i][1], u)];
  };
}
const delka = (B: Bod[]) => B.reduce((s, b, i) => (i ? s + Math.hypot(b[0] - B[i - 1][0], b[1] - B[i - 1][1]) : 0), 0);

/* ═══ Úspora bajtů: cesty v relativních souřadnicích ═══ */

/** Číslo na desetiny (nebo celé, `k` = 1) bez zbytečných znaků (0.5 → .5, -0.5 → -.5) */
const cislo = (v: number, k = 10) => {
  let s = String(Math.round(v * k) / k);
  if (s === "-0") s = "0";
  if (s.startsWith("0.")) s = s.slice(1);
  else if (s.startsWith("-0.")) s = "-" + s.slice(2);
  return s;
};
const POCTY: Record<string, number> = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0 };

/**
 * Přepíše atribut d do relativních souřadnic s čísly na desetiny: místo
 * „L1234.5 287.3“ stačí „4.1.3“. Body se zaokrouhlí v absolutních
 * souřadnicích a teprve pak se počítají rozdíly, takže se chyba nesčítá.
 */
function kratka(d: string, k = 10): string {
  const tok = d.match(/[MmLlHhVvCcSsQqTtAaZz]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) ?? [];
  const r = (v: number) => Math.round(v * k) / k;
  let cx = 0, cy = 0, sx = 0, sy = 0;
  let out = "", posl = "", prikaz = "";
  const pis = (c: string, cisla: number[]) => {
    if (c !== posl || c === "m") {
      out += c;
      posl = c === "m" ? "l" : c;
      prikaz = "";
    }
    for (const n of cisla) {
      const t = cislo(n, k);
      if (prikaz && !t.startsWith("-") && !(t.startsWith(".") && prikaz.includes(".") && !/[eE]/.test(prikaz))) out += " ";
      out += t;
      prikaz = t;
    }
  };
  let i = 0;
  let c = "";
  while (i < tok.length) {
    if (/^[A-Za-z]$/.test(tok[i])) c = tok[i++];
    else if (!c) break;
    const rel = c === c.toLowerCase();
    const k = c.toLowerCase();
    if (k === "z") {
      out += "z";
      posl = "z";
      prikaz = "";
      cx = sx;
      cy = sy;
      c = "";
      continue;
    }
    const n = POCTY[k];
    const a = tok.slice(i, i + n).map(Number);
    i += n;
    if (a.length < n || a.some((x) => !Number.isFinite(x))) break;
    const X = (v: number) => r(rel ? cx + v : v), Y = (v: number) => r(rel ? cy + v : v);
    if (k === "m" || k === "l" || k === "t") {
      const x = X(a[0]), y = Y(a[1]);
      pis(k, [x - cx, y - cy]);
      cx = x;
      cy = y;
      if (k === "m") {
        sx = x;
        sy = y;
        c = rel ? "l" : "L";
      }
    } else if (k === "h") {
      const x = r(rel ? cx + a[0] : a[0]);
      pis("h", [x - cx]);
      cx = x;
    } else if (k === "v") {
      const y = r(rel ? cy + a[0] : a[0]);
      pis("v", [y - cy]);
      cy = y;
    } else if (k === "c" || k === "s" || k === "q") {
      const b: number[] = [];
      for (let j = 0; j < n; j += 2) b.push(X(a[j]) - cx, Y(a[j + 1]) - cy);
      pis(k, b);
      cx += b[n - 2];
      cy += b[n - 1];
      cx = r(cx);
      cy = r(cy);
    } else if (k === "a") {
      const x = X(a[5]), y = Y(a[6]);
      pis("a", [a[0], a[1], a[2]]);
      out += ` ${a[3] ? 1 : 0} ${a[4] ? 1 : 0} `;
      prikaz = "";
      pis("a", [x - cx, y - cy]);
      cx = x;
      cy = y;
    }
  }
  return out.length < d.length ? out : d;
}
/** Zkrátí všechny cesty v hotové kresbě (`k` = 10 na desetiny, 1 na celé jednotky) */
const kompakt = (svg: string, k = 10) => svg.replace(/ d="([^"]*)"/g, (_, d: string) => ` d="${kratka(d, k)}"`);

/* ═══ Rozvržení ═══ */

interface RadaParam {
  /** Vršek trámu, pod kterým vede šňůra */
  tram: number;
  /** Středy destiček zleva doprava */
  sloty: number[];
  /** Průvěsy šňůry v polích s destičkou (dokola) */
  prohyby: number[];
  /** Klidové náklony destiček (stupně) */
  naklony: number[];
}

interface Param {
  W: number;
  zem: number;
  sloupy: [number, number];
  sw: number;
  strecha: { x0: number; x1: number; hreben: number; okap: number; zdvih: number; zdvihH: number };
  stit: { vrch: number; pul: number };
  plaketa: { y: number; w: number; h: number };
  washi: { y: number; w: number; h: number };
  /** Spodek krokví (vršek vaznice) uprostřed */
  keta: number;
  /** Vršek hlavního trámu pod okapem */
  hlava: number;
  tl: number;
  presah: number;
  dw: number;
  rady: RadaParam[];
  w: number;
  lucerny: { x: number; m: number }[];
  zvonec: { x: number; m: number; konec: number };
  /** Vršek police u paty */
  police: number;
  /** id, x, y nohou, velikost rámu, zrcadlo, náklon */
  kami: [PostavaId, number, number, number, boolean, number][];
  /** Stěna starých destiček: odkud kam, rozestup řad, měřítka plánů */
  zed: { y0: number; y1: number; krok: number; s3: number; s2: number };
  /** Měřítko drobností (šimenawa, shide, lucerny, rozeta…) */
  m: number;
  /** Písmo nadpisu v jednotkách stojanu: h2, perex, znaky na desce, štítek, odsazení pod připínáčky */
  pisma: { h2: number; perex: number; kanji: number; stitek: number; odsazeni: number };
}

const PARAM: Record<Rezim, Param> = {
  siroka: {
    W: 1400,
    zem: 744,
    sloupy: [70, 1330],
    sw: 52,
    strecha: { x0: 0, x1: 1400, hreben: 2, okap: 100, zdvih: 46, zdvihH: 12 },
    stit: { vrch: -40, pul: 222 },
    plaketa: { y: 28, w: 224, h: 82 },
    washi: { y: 146, w: 560, h: 80 },
    keta: 124,
    hlava: 168,
    tl: 16,
    presah: 42,
    dw: 182,
    rady: [
      { tram: 232, sloty: [300, 500, 700, 900, 1100], prohyby: [14, 20, 11, 18, 15], naklony: [-2.4, 1.8, -1, 2.6, -1.8] },
      { tram: 428, sloty: [300, 500, 700, 900, 1100], prohyby: [17, 12, 19, 13, 16], naklony: [2, -2.8, 1.4, -1.6, 2.8] },
    ],
    w: 6.6,
    lucerny: [{ x: 139, m: 1.15 }, { x: 1261, m: 1.15 }],
    zvonec: { x: 1374, m: 1, konec: 480 },
    police: 668,
    kami: [
      ["bublinka", 1300, 740, 150, false, 0],
    ],
    zed: { y0: 128, y1: 672, krok: 56, s3: 0.6, s2: 0.76 },
    m: 1,
    pisma: { h2: 36, perex: 16.5, kanji: 36, stitek: 13, odsazeni: 14 },
  },
  stredni: {
    W: 1000,
    zem: 970,
    sloupy: [62, 938],
    sw: 40,
    strecha: { x0: 0, x1: 1000, hreben: 2, okap: 78, zdvih: 34, zdvihH: 9 },
    stit: { vrch: -30, pul: 162 },
    plaketa: { y: 20, w: 170, h: 70 },
    washi: { y: 118, w: 440, h: 104 },
    keta: 98,
    hlava: 132,
    tl: 14,
    presah: 30,
    dw: 196,
    rady: [
      { tram: 232, sloty: [182, 394, 606, 818], prohyby: [14, 19, 12, 17], naklony: [-2.2, 1.6, -1.2, 2.4] },
      { tram: 440, sloty: [288, 500, 712], prohyby: [16, 12, 18], naklony: [2.6, -1.8, 1.4] },
      { tram: 648, sloty: [394, 606, 818], prohyby: [13, 18, 15], naklony: [-1.6, 2.4, -2.6] },
    ],
    w: 6,
    lucerny: [{ x: 104, m: 0.74 }, { x: 896, m: 0.74 }],
    zvonec: { x: 978, m: 0.8, konec: 540 },
    police: 902,
    kami: [
      ["bublinka", 910, 966, 138, false, 0],
    ],
    zed: { y0: 102, y1: 904, krok: 54, s3: 0.58, s2: 0.74 },
    m: 0.78,
    pisma: { h2: 32, perex: 15, kanji: 28, stitek: 11, odsazeni: 12 },
  },
  uzka: {
    W: 390,
    zem: 1146,
    sloupy: [19, 371],
    sw: 18,
    strecha: { x0: 0, x1: 390, hreben: 2, okap: 54, zdvih: 16, zdvihH: 4 },
    stit: { vrch: -16, pul: 96 },
    plaketa: { y: 10, w: 116, h: 50 },
    washi: { y: 80, w: 302, h: 130 },
    keta: 68,
    hlava: 86,
    tl: 9,
    presah: 8,
    dw: 160,
    rady: [
      { tram: 216, sloty: [109, 281], prohyby: [10, 14], naklony: [-1.8, 2.2] },
      { tram: 384, sloty: [109, 281], prohyby: [14, 9], naklony: [2.4, -1.6] },
      { tram: 552, sloty: [109, 281], prohyby: [9, 13], naklony: [-2.6, 1.4] },
      { tram: 720, sloty: [109, 281], prohyby: [13, 10], naklony: [1.6, -2.2] },
      { tram: 888, sloty: [109, 281], prohyby: [11, 14], naklony: [-1.4, 2.6] },
    ],
    w: 4.6,
    lucerny: [{ x: 24, m: 0.48 }],
    zvonec: { x: 368, m: 0.52, konec: 384 },
    police: 1094,
    kami: [
      ["bublinka", 350, 1144, 108, false, 0],
    ],
    zed: { y0: 70, y1: 1098, krok: 46, s3: 0.46, s2: 0.58 },
    m: 0.42,
    pisma: { h2: 25, perex: 15, kanji: 20, stitek: 9, odsazeni: 24 },
  },
};

export interface DeskaMisto {
  /** Bod úchytu (horní střed boxu) a šířka destičky v jednotkách stojanu */
  x: number;
  y: number;
  w: number;
  /** Klidový náklon ve stupních */
  r: number;
  rada: number;
}

export interface KamiMisto {
  id: PostavaId;
  /** Bod pod nohama */
  x: number;
  y: number;
  /** Strana rámu 180 × 180 */
  v: number;
  zrcadlo: boolean;
  naklon: number;
}

/** Úsek šňůry po trámu: body úvazků a průvěsy mezi nimi */
interface Girlanda {
  y: number;
  uvazky: number[];
  prohyby: number[];
  smer: 1 | -1;
}

export interface Rozvrh {
  rezim: Rezim;
  p: "s" | "m" | "u";
  W: number;
  H: number;
  q: Param;
  okap: (x: number) => number;
  hreben: (x: number) => number;
  /** Destičky v pořadí dat (0–8 otázky, 9 prázdná) */
  desky: DeskaMisto[];
  kami: KamiMisto[];
  girlandy: Girlanda[];
  kotvy: { vstup: Bod; vystup: Bod; smerVstup: number; smerVystup: number };
  zvonec: { x: number; y: number; w: number; h: number };
  /** Kde visí ozdoby svátků (bod závěsu) */
  zavesy: Bod[];
  /** Šimenawa: osa, tloušťka a co z ní visí (klikatice shide a slaměné střapce) */
  sim: { x0: number; x1: number; stred: (t: number) => Bod; sirka: (t: number) => number };
  visi: { x: number; y: number; typ: "shide" | "strapec" }[];
  /** Plaketa a washi s nadpisem (levý horní roh a rozměr), vnitřní pole plakety */
  plaketa: { x: number; y: number; w: number; h: number };
  washi: { x: number; y: number; w: number; h: number };
  pole: { x: number; y: number; w: number; h: number };
  /** Ten, kdo kouká zpoza sloupu (index v kami) a za kterým sloupem */
  schovka: { i: number; sloup: number } | null;
  /** Lucerny: bod závěsu a měřítko */
  lucerny: { x: number; y: number; m: number }[];
}

export function rozvrh(rezim: Rezim): Rozvrh {
  const q = PARAM[rezim];
  const { W, zem, strecha: s } = q;
  const cx = (s.x0 + s.x1) / 2, pul = (s.x1 - s.x0) / 2;
  const u = (x: number) => omez(Math.abs(x - cx) / pul);
  const okap = (x: number) => s.okap - s.zdvih * Math.pow(u(x), 3.2);
  const hreben = (x: number) => s.hreben - s.zdvihH * Math.pow(u(x), 3);
  const [sl, sp] = q.sloupy;
  const vnitrL = sl + q.sw / 2, vnitrP = sp - q.sw / 2;
  const sm = q.dw / DESKA.W;

  const desky: DeskaMisto[] = [];
  const girlandy: Girlanda[] = [];
  q.rady.forEach((rd, ri) => {
    const yT = rd.tram + q.tl + q.w * 0.5;
    /* úvazky: u sloupů a mezi destičkami tak, aby každá visela uprostřed svého pole */
    const S = rd.sloty;
    const krok = S.length > 1 ? S[1] - S[0] : q.dw + 14;
    const uv: number[] = [vnitrL];
    const hrany = [S[0] - krok / 2, ...S.slice(1).map((x, i) => (x + S[i]) / 2), S[S.length - 1] + krok / 2];
    hrany.forEach((x) => {
      if (x - uv[uv.length - 1] > 24 && vnitrP - x > 24) uv.push(x);
    });
    uv.push(vnitrP);
    const prohyby: number[] = [];
    let k = 0;
    for (let i = 0; i < uv.length - 1; i++) {
      const stred = (uv[i] + uv[i + 1]) / 2;
      const ma = S.some((x) => Math.abs(x - stred) < 6);
      const L = uv[i + 1] - uv[i];
      prohyby.push(ma ? rd.prohyby[k++ % rd.prohyby.length] * Math.max(0.5, q.m) : Math.max(3, L * 0.05));
    }
    girlandy.push({ y: yT, uvazky: uv, prohyby, smer: ri % 2 === 0 ? 1 : -1 });
    S.forEach((x, i) => {
      const j = uv.findIndex((a, n) => n < uv.length - 1 && a < x && uv[n + 1] > x);
      const a = uv[j], b = uv[j + 1];
      const t = (x - a) / (b - a);
      const y = yT + prohyby[j] * 4 * t * (1 - t) - D.snura * sm;
      desky.push({ x, y, w: q.dw, r: rd.naklony[i % rd.naklony.length], rada: ri });
    });
  });

  const kami: KamiMisto[] = q.kami.map(([id, x, y, v, zrcadlo, naklon]) => ({ id, x, y, v, zrcadlo, naklon }));
  /* Bublinka (prázdná destička) kouká zpoza pravého sloupu */
  const bi = kami.findIndex((k) => k.id === "bublinka");
  const schovka = bi >= 0 ? { i: bi, sloup: 1 } : null;

  /* kotvy: vstup na levém konci horního trámu, výstup pod koncem posledního */
  const g0 = girlandy[0], gk = girlandy[girlandy.length - 1];
  const konecL = sl - q.sw / 2 - q.presah, konecP = sp + q.sw / 2 + q.presah;
  const vstup: Bod = [konecL - q.w * 0.6, g0.y];
  const vystupX = gk.smer === 1 ? konecP - q.w * 0.9 : konecL + q.w * 0.9;
  const vystup: Bod = [vystupX, gk.y + q.tl * 0.9 + q.w * 2.4];

  const z = q.zvonec;
  const zvTop = okap(z.x) + 8 * z.m;
  const zvonecBox = { x: z.x, y: (zvTop + z.konec + 12 * z.m) / 2, w: Math.max(60 * z.m, (44 / 1400) * W * 1.1), h: z.konec + 12 * z.m - zvTop };

  const plaketa = { x: W / 2 - q.plaketa.w / 2, y: q.plaketa.y, w: q.plaketa.w, h: q.plaketa.h };
  const ram = Math.max(4, 9 * q.m);
  const pole = { x: plaketa.x + ram, y: plaketa.y + ram, w: plaketa.w - ram * 2, h: plaketa.h - ram * 2 };
  const washi = { x: W / 2 - q.washi.w / 2, y: q.washi.y, w: q.washi.w, h: q.washi.h };

  /* šimenawa od sloupu ke sloupu, uprostřed nejtlustší */
  const m = q.m;
  const sy = q.keta + 22 * m + 2;
  const sp0 = 16 * m + 2;
  const stl = 30 * m + 4;
  const sim = {
    x0: sl,
    x1: sp,
    stred: (t: number): Bod => [lerp(sl, sp, t), sy + sp0 * 4 * t * (1 - t)],
    sirka: (t: number) => stl * (0.32 + 0.68 * Math.pow(Math.sin(Math.PI * t), 0.6)),
  };
  /* z šimenawy visí od washi ven střídavě klikatice a střapce, mimo lucerny; ozdoby svátků místo střapců */
  const lucerny = q.lucerny.map((l) => ({ x: l.x, y: okap(l.x) + 14 * l.m + q.keta - q.strecha.okap, m: l.m }));
  const visi: Rozvrh["visi"] = [];
  const krokV = Math.max(16, 46 * m);
  for (const smer of [-1, 1]) {
    let k = 0;
    for (let x = W / 2 + smer * (q.washi.w / 2 + 22 * m); smer < 0 ? x > sl + q.sw : x < sp - q.sw; x += smer * krokV, k++) {
      if (lucerny.some((l) => Math.abs(l.x - x) < 30 * l.m + 8)) continue;
      const t = (x - sl) / (sp - sl);
      const y = sim.stred(t)[1] + sim.sirka(t) * 0.42;
      visi.push({ x, y, typ: k % 2 ? "strapec" : "shide" });
    }
  }
  visi.sort((a, b) => a.x - b.x);
  /* ozdoby svátků: čtyři místa, souměrně po dvou od washi (místo střapců); kde šimenawa není vidět, visí z okapu */
  const strapce = visi.filter((v) => v.typ === "strapec").map((v) => [v.x, v.y] as Bod);
  const leve = strapce.filter(([x]) => x < W / 2).sort((a, b) => b[0] - a[0]).slice(0, 2);
  const prave = strapce.filter(([x]) => x > W / 2).sort((a, b) => a[0] - b[0]).slice(0, 2);
  const zavesy: Bod[] =
    leve.length === 2 && prave.length === 2
      ? [...leve.reverse(), ...prave]
      : [0.18, 0.34, 0.66, 0.82].map((t) => {
          const x = lerp(sl, sp, t);
          return [x, okap(x) + (q.keta - q.strecha.okap) + 6 * m] as Bod;
        });

  return {
    rezim,
    p: PRIPONA[rezim],
    W,
    H: zem,
    q,
    okap,
    hreben,
    desky,
    kami,
    girlandy,
    kotvy: { vstup, vystup, smerVstup: 180, smerVystup: 90 },
    zvonec: zvonecBox,
    zavesy,
    sim,
    visi,
    plaketa,
    washi,
    pole,
    schovka,
    lucerny,
  };
}

/* ═══ Sdílená zásoba: přechody, staré destičky, dřevo destiček ═══ */

const ZLATO = "url(#ko-em-zlato)";

/** Obrys desky ema v boxu 200 × 180 (nebo zmenšený přes `k`) */
function obrysDesky(k = 1, dx = 0, dy = 0) {
  const { vrch, ramena, dno, kraj, r } = D;
  const X = (x: number) => f(x * k + dx), Y = (y: number) => f(y * k + dy);
  const L = kraj, R = DESKA.W - kraj;
  return `M${X(100)} ${Y(vrch)} L${X(R - 1.5)} ${Y(ramena - 0.6)} Q${X(R)} ${Y(ramena)} ${X(R)} ${Y(ramena + 2)} L${X(R)} ${Y(dno - r)} Q${X(R)} ${Y(dno)} ${X(R - r)} ${Y(dno)} L${X(L + r)} ${Y(dno)} Q${X(L)} ${Y(dno)} ${X(L)} ${Y(dno - r)} L${X(L)} ${Y(ramena + 2)} Q${X(L)} ${Y(ramena)} ${X(L + 1.5)} ${Y(ramena - 0.6)} Z`;
}

/** Šňůrka kōhaku destičky: z díry nahoru, uzlík nad špicí a očko kolem šňůry stojanu (zezadu bez očka) */
function ocko(zezadu = false) {
  const c = D.dira, s = D.snura;
  const u = s + 12;
  const nahoru = `M98.8 ${c} C97.6 ${c - 7} 98.4 ${u + 4} 99.2 ${u} M101.2 ${c} C102.4 ${c - 7} 101.6 ${u + 4} 100.8 ${u}`;
  const smycka = `M99 ${u} C94.6 ${u - 3} 94 ${s - 3.6} 100 ${s - 4.4} C106 ${s - 3.6} 105.4 ${u - 3} 101 ${u}`;
  const tah = (d: string, w: number, barva: string, extra = "") => `<path d="${d}" stroke="${barva}" stroke-width="${w}" fill="none" stroke-linecap="round"${extra}/>`;
  const vse = zezadu ? [nahoru] : [nahoru, smycka];
  return vse.map((d) => tah(d, 3.2, "#5E160B")).join("") +
    vse.map((d) => tah(d, 2.1, "#B84A2B")).join("") +
    vse.map((d) => tah(d, 0.8, "#FBF7EE", ' stroke-dasharray="1 1.6" opacity="0.9"')).join("") +
    `<ellipse cx="100" cy="${u + 0.4}" rx="2.6" ry="2.1" fill="#9C3420"/><path d="M98.2 ${u - 0.2} Q100 ${u - 1.6} 101.8 ${u - 0.2}" stroke="#F6C2A8" stroke-width="0.7" fill="none" opacity="0.8"/>`;
}

/** Dřevo destičky (líc čerstvé hinoki, rub o tón tmavší), hrana, stín, díra a šňůrka */
function deskaSymbol(id: string, rub: boolean) {
  const g = rub ? "url(#ko-em-hinoki-rub)" : "url(#ko-em-hinoki)";
  /* letokruhy: pár protáhlých oblouků, žádná textura */
  const kruhy = rub
    ? `<g fill="none" stroke="#C99E62" stroke-linecap="round" opacity="0.45">
      <path d="M18 168 C40 120 92 104 150 112 C170 115 184 122 192 130" stroke-width="1.1"/>
      <path d="M10 150 C34 108 84 92 140 98 C164 101 182 108 194 116" stroke-width="0.9"/>
      <path d="M30 172 C52 136 98 124 146 130 C166 133 180 140 188 148" stroke-width="0.8" opacity="0.7"/>
      <path d="M58 82 C86 70 124 68 150 76" stroke-width="0.8" opacity="0.6"/>
    </g>`
    : `<g fill="none" stroke="#D8B57E" stroke-linecap="round" opacity="0.5">
      <path d="M12 96 C60 92 120 99 188 94" stroke-width="0.9"/>
      <path d="M12 140 C70 136 128 143 188 138" stroke-width="0.8"/>
      <path d="M40 162 C90 158 140 164 186 160" stroke-width="0.7" opacity="0.7"/>
    </g>`;
  return `<g id="${id}">
    <path d="${obrysDesky(1, 6, 9)}" fill="#120804" opacity="0.14"/>
    <path d="${obrysDesky(1, 3.6, 5.4)}" fill="#120804" opacity="0.16"/>
    <path d="${obrysDesky(1, 1.6, 2)}" fill="#A87C48"/>
    <path d="${obrysDesky()}" fill="${g}"/>
    ${kruhy}
    <path d="${obrysDesky()}" fill="url(#ko-em-hinoki-lesk)"/>
    <path d="${obrysDesky()}" fill="none" stroke="#B98F58" stroke-width="1.1"/>
    <circle cx="100" cy="${D.dira}" r="3.6" fill="#6E4A26"/><circle cx="100" cy="${D.dira + 0.5}" r="2.4" fill="#3B2614"/>
    ${ocko(rub)}
  </g>`;
}

/* ——— Staré destičky cizích lidí: deska 100 × 90, šňůrka nahoře v 50,0 ——— */

const MAL_OBRYS = "M50 11 L97.5 30 V83 Q97.5 87 93.5 87 H6.5 Q2.5 87 2.5 83 V30 Z";
/** Ztmavlé dřevo, jak destičky léta visí venku */
const TONY = [
  { d: "#B39B78", h: "#8A7356", s: "#5E4A36" },
  { d: "#A18865", h: "#7A644A", s: "#54412E" },
  { d: "#917A5A", h: "#6E5A42", s: "#4A3A2A" },
  { d: "#BFA986", h: "#93805F", s: "#665238" },
];
/** Vybledlé barvy maleb: slunce a déšť jim ubraly sytost */
const C = { cervena: "#A85440", modra: "#566E86", zelena: "#62785A", zlata: "#BC9C56", inkoust: "#3A302A", bila: "#E4DACA", ruzova: "#C99AA0", hneda: "#7E5A40" };

/** Nečitelné písmo štětcem: sloupce „znaků“ ze tří až pěti krátkých tahů (žádný skutečný text) */
function pismo(sloupce: number, seed: number, x0 = 80, y0 = 35, y1 = 80) {
  const R = nahoda(seed);
  let d = "";
  for (let k = 0; k < sloupce; k++) {
    const x = x0 - k * 15;
    for (let y = y0 + R() * 3; y < y1 - 7; y += 9.5 + R() * 2) {
      const n = 3 + Math.floor(R() * 3);
      for (let j = 0; j < n; j++) {
        const a = x - 3.5 + R() * 7, b = y + R() * 7;
        const typ = Math.floor(R() * 5);
        if (typ === 0) d += `M${P(a - 2.5, b)}h${f(4 + R() * 2)}`;
        else if (typ === 1) d += `M${P(a, b - 1.5)}v${f(3.5 + R() * 3)}`;
        else if (typ === 2) d += `M${P(a, b)}l${f(1 + R())} ${f(1.4 + R())}`;
        else if (typ === 3) d += `M${P(a, b)}q${f(-1 - R())} ${f(2.4)} ${f(-3 - R())} ${f(3.4)}`;
        else d += `M${P(a, b)}q${f(1 + R())} ${f(2.2)} ${f(3.4 + R())} ${f(3)}`;
      }
    }
  }
  return `<path d="${d}" stroke="${C.inkoust}" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.82"/>`;
}

/**
 * Kůň ze starých destiček jednou: tělo v barvě `color` (currentColor), hříva,
 * nohy a obrys tuší, rudý postroj. Motivy ho jen přebarví a posunou.
 */
function kunSymbol() {
  const c = C;
  return `<g id="ko-em-kun">
    <path d="M30 70 L27 82 M36 71 L38 82 M60 70 L58 82 M66 69 L71 80 M24 31 C27 36 30 41 33 46 M27 30 C31 35 34 40 37 45 M74 52 C82 52 86 58 86 66 C84 62 80 60 76 60" stroke="#3A2A20" stroke-width="2.8" fill="none" stroke-linecap="round"/>
    <path d="M26 58 C26 50 34 47 46 48 C56 49 62 47 68 46 C72 45 76 50 74 58 C72 66 62 70 48 70 C36 70 26 66 26 58 Z M28 52 C24 47 21 40 20 33 C19 29 22 27 25 30 C28 34 32 42 36 48 M20 33 C17 32 13 35 12 39 C11 42 14 44 17 42 C19 41 21 38 23 37 M22 30 L23 25 L25 30" fill="currentColor" stroke="${c.inkoust}" stroke-width="1.3" stroke-linejoin="round"/>
    <path d="M42 50 C46 58 54 59 60 50 M14 39 C20 40 26 44 30 50" stroke="${c.cervena}" stroke-width="2" fill="none"/>
    <circle cx="17" cy="36" r="0.9" fill="${c.inkoust}"/>
  </g>`;
}

/** Motivy na starých destičkách (malované v ploše 8–92 × 30–84); koně a písmo jsou odkazy na jeden kus */
const MOTIVY: Record<string, string> = (() => {
  const c = C;
  const kun = (barva: string, tr = "") => `<use href="#ko-em-kun" color="${barva}"${tr ? ` transform="${tr}"` : ""}/>`;
  const pis = (id: string, tr = "") => `<use href="#ko-em-pismo-${id}"${tr ? ` transform="${tr}"` : ""}/>`;
  return {
    kun1: kun(c.bila),
    kun2: kun("#8E5E3E", "translate(100 0) scale(-1 1)"),
    kun3: `<circle cx="50" cy="56" r="22" fill="${c.cervena}" opacity="0.85"/>` + kun(c.bila, "translate(14 8) scale(.72)"),
    kun4: `<path d="M24 64 L68 62 M28 64 L26 80 M36 64 L37 80 M58 63 L57 79 M66 62 L70 78 M68 62 L76 48 L84 50 L80 44 L72 44 L68 52 M24 64 C20 58 22 54 18 50" stroke="#B4683A" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<circle cx="20" cy="38" r="7" fill="#CFA24A"/><path d="M20 26 V29 M20 47 V50 M8 38 H11 M29 38 H32 M12 30 L14 32 M26 44 L28 46 M12 46 L14 44 M26 32 L28 30" stroke="#CFA24A" stroke-width="1.6" stroke-linecap="round"/>`,
    kun5: kun("#C9B898", "translate(100 0) scale(-1 1)"),
    kun6: `<path d="M10 82 Q50 74 90 82" stroke="${c.zelena}" stroke-width="3" fill="none"/>` + kun("#7A4E34", "translate(4 -4) scale(.92)"),
    slunce: `<circle cx="50" cy="56" r="17" fill="${c.cervena}"/><circle cx="50" cy="56" r="24.5" fill="none" stroke="${c.cervena}" stroke-width="7" stroke-dasharray="2.2 10.6"/>`,
    sakura: `<path d="M8 40 C30 46 46 58 60 72 M34 52 C40 44 50 40 58 40 M50 63 C58 60 70 62 80 66" stroke="#5A4232" stroke-width="2.4" fill="none" stroke-linecap="round"/>` +
      [[58, 40], [80, 66], [44, 50], [66, 70], [26, 46], [72, 58]].map(([x, y]) => `<use href="#ko-em-kvet-m" transform="translate(${x} ${y}) scale(.7)"/>`).join(""),
    fudzi: `<path d="M6 82 L40 42 Q50 34 60 42 L94 82 Z" fill="${c.modra}"/><path d="M40 42 Q50 34 60 42 L66 50 L60 48 L55 53 L50 47 L45 53 L40 48 L34 50 Z" fill="${c.bila}"/><circle cx="76" cy="40" r="7" fill="${c.cervena}"/>`,
    daruma: `<path d="M50 34 C68 34 76 50 74 64 C72 78 62 84 50 84 C38 84 28 78 26 64 C24 50 32 34 50 34 Z" fill="${c.cervena}" stroke="#6E2E22" stroke-width="1.2"/>` +
      `<ellipse cx="50" cy="56" rx="15" ry="12" fill="${c.bila}"/><circle cx="44" cy="54" r="3.6" fill="${c.inkoust}"/><circle cx="56" cy="54" r="3.6" fill="none" stroke="${c.inkoust}" stroke-width="1"/>` +
      `<path d="M38 50 Q44 46 48 50 M52 50 Q56 46 62 50 M45 63 Q50 66 55 63" stroke="${c.inkoust}" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M36 74 Q50 80 64 74" stroke="${c.zlata}" stroke-width="2.4" fill="none"/>`,
    vlny: `<rect x="3" y="52" width="94" height="33" fill="url(#ko-em-seigaiha-m)"/><circle cx="74" cy="40" r="6" fill="${c.zlata}"/>`,
    hrnek: `<ellipse cx="50" cy="78" rx="30" ry="5" fill="#6E5844"/><path d="M30 76 Q28 58 36 46 L64 46 Q72 58 70 76 Z" fill="#A2704A" stroke="#5E4028" stroke-width="1.2"/>` +
      `<ellipse cx="50" cy="46" rx="14" ry="3.4" fill="#7E5234"/><path d="M34 62 Q50 66 66 62" stroke="${c.modra}" stroke-width="3" fill="none"/><path d="M42 36 Q40 30 44 26 M52 36 Q50 30 54 26" stroke="#8C7C6C" stroke-width="1.4" fill="none" stroke-linecap="round"/>`,
    srdce: `<path d="M50 80 C30 66 24 56 26 48 C28 40 38 38 44 44 L50 50 L56 44 C62 38 72 40 74 48 C76 56 70 66 50 80 Z" fill="${c.cervena}"/><path d="M36 46 C34 48 34 52 36 54" stroke="#E0B0A0" stroke-width="2" fill="none" stroke-linecap="round"/>` + pis("b", "translate(30 0) scale(.6 1)"),
    detska: `<path d="M18 80 V60 L32 48 L46 60 V80 Z" fill="none" stroke="#B4683A" stroke-width="2.2" stroke-linejoin="round"/><rect x="28" y="66" width="8" height="14" fill="none" stroke="#B4683A" stroke-width="1.8"/>` +
      `<circle cx="64" cy="58" r="5" fill="none" stroke="${c.modra}" stroke-width="2"/><path d="M64 63 V74 M58 68 H70 M64 74 L60 82 M64 74 L68 82" stroke="${c.modra}" stroke-width="2" fill="none" stroke-linecap="round"/>` +
      `<circle cx="80" cy="64" r="4" fill="none" stroke="${c.cervena}" stroke-width="1.8"/><path d="M80 68 V76 M76 71 H84 M80 76 L77 82 M80 76 L83 82" stroke="${c.cervena}" stroke-width="1.8" fill="none" stroke-linecap="round"/>` +
      `<circle cx="78" cy="38" r="6" fill="#CFA24A"/>`,
    torii: `<path d="M18 42 Q50 36 82 42 L82 47 Q50 41 18 47 Z" fill="${c.cervena}"/><path d="M24 52h52v4H24ZM31 44h5v40h-5ZM64 44h5v40h-5Z" fill="${c.cervena}"/><rect x="47" y="47" width="6" height="6" fill="${c.inkoust}" opacity="0.6"/>`,
    pismo1: pis("a") + `<rect x="12" y="70" width="9" height="9" fill="none" stroke="${c.cervena}" stroke-width="1.6"/>`,
    pismo2: pis("b", "translate(-6 0)") + `<circle cx="20" cy="74" r="5" fill="none" stroke="${c.cervena}" stroke-width="1.6"/>`,
    pismo3: pis("a", "translate(100 0) scale(-1 1)"),
    pismo4: pis("b", "translate(-20 0)") + kun("#C9B898", "translate(64 30) scale(.42)"),
  };
})();
/** Které motivy jsou na starých destičkách častěji (koně, je rok koně; hodně jich ukazuje rub s přáním) */
const LOS_MOTIVU = ["kun1", "pismo1", "kun2", "pismo3", "kun3", "slunce", "pismo2", "kun4", "sakura", "kun5", "pismo4", "fudzi", "kun6", "daruma", "pismo1", "vlny", "kun1", "hrnek", "pismo3", "srdce", "kun2", "detska", "torii", "pismo2", "kun3", "pismo4", "kun5", "slunce"];

/** Deska staré destičky v jednom tónu (šňůrka, stín, hrana, světlo, obrys a dírka) */
function tonSymbol(id: string, ton: number) {
  const T = TONY[ton];
  return `<g id="${id}">
    <path d="M47 0.5 C44 4 46 9 49.4 13 M53 0.5 C56 4 54 9 50.6 13" stroke="#5A3E2C" stroke-width="1.3" fill="none"/>
    <path d="${MAL_OBRYS}" fill="#0E0804" opacity="0.3" transform="translate(2.5 3.5)"/>
    <path d="${MAL_OBRYS}" fill="${T.s}" transform="translate(1.2 1.6)"/>
    <path d="${MAL_OBRYS}" fill="${T.d}" stroke="${T.h}" stroke-width="1"/>
    <path d="M50 11 L97.5 30 V38 C66 30 34 30 2.5 38 V30 Z" fill="#FFF2D6" opacity="0.12"/>
    <circle cx="50" cy="19" r="2.2" fill="${T.s}"/>
  </g>`;
}

/** Pás starých destiček na liště: `n` kusů po `krok`, jednotkové měřítko (deska 100 široká) */
function pasSymbol(id: string, seed: number, n: number, krok: number, kusy: string[]) {
  const R = nahoda(seed);
  let s = "";
  for (let i = 0; i < n; i++) {
    const x = i * krok + (R() - 0.5) * krok * 0.3;
    const y = (R() - 0.5) * 7;
    const r = (R() - 0.5) * 12;
    s += `<use href="#${kusy[Math.floor(R() * kusy.length)]}" transform="translate(${Math.round(x)} ${Math.round(y)}) rotate(${Math.round(r)} 50 0)"/>`;
  }
  return `<g id="${id}">${s}</g>`;
}

/** Vlnky seigaiha jako vzor: tlumené pro staré destičky (m), sytější pro Kapčinu malbu (k) */
const VLNY = [["m", "#566E86", "#E4DACA"], ["k", "#5E8EC0", "#EAF2FA"]]
  .map(([k, mo, bi]) => `<pattern id="ko-em-seigaiha-${k}" patternUnits="userSpaceOnUse" width="18" height="18"><path d="M-10 19A10 10 0 0 1 10 19A10 10 0 0 1 30 19ZM-1 10A10 10 0 0 1 19 10Z" fill="${mo}" stroke="${bi}" stroke-width="1.2"/><path d="M-6 19A6 6 0 0 1 6 19M14 19A6 6 0 0 1 26 19M3 10A6 6 0 0 1 15 10" fill="none" stroke="${bi}" stroke-width="1"/></pattern>`)
  .join("");

/** Kvítek sakury (pět lístků) jako kus: růžový, světlý a vybledlý pro staré destičky */
const KVETY = [["kvet", "#F4B8C4", "#C95A72"], ["kvet-b", "#FBE0E6", "#C95A72"], ["kvet-m", "#C99AA0", "#9E5A64"]]
  .map(([id, b, st]) => {
    const d = [0, 1, 2, 3, 4]
      .map((i) => {
        const a = (i * 72 * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a);
        const t = (x: number, y: number) => P(x * c - y * sn, x * sn + y * c);
        return `M0 0C${t(-3.4, -3)} ${t(-3.6, -8.4)} ${t(-1.2, -10)}L${t(0, -8.6)}L${t(1.2, -10)}C${t(3.6, -8.4)} ${t(3.4, -3)} 0 0Z`;
      })
      .join("");
    return `<g id="ko-em-${id}"><path d="${d}" fill="${b}"/><circle r="1.8" fill="${st}"/></g>`;
  })
  .join("");

/**
 * Vše, co se sdílí: přechody, staré destičky (kusy a pásy), dřevo
 * destiček party. Vkládá se jednou do <svg width="0" height="0"> v Otazky.astro.
 */
export function zasoba(): string {
  const R = nahoda(5150);
  const kusy: string[] = [];
  /* desky ve čtyřech tónech a každý motiv jen jednou, kusy jsou dvojice <use> */
  let stare = TONY.map((_, t) => tonSymbol(`ko-em-t${t}`, t)).join("") + kunSymbol();
  stare += `<g id="ko-em-pismo-a">${pismo(4, 71)}</g><g id="ko-em-pismo-b">${pismo(3, 93, 72)}</g>`;
  stare += [...new Set(LOS_MOTIVU)].map((mo) => `<g id="ko-em-m-${mo}" opacity="0.8">${MOTIVY[mo]}</g>`).join("");
  for (let i = 0; i < LOS_MOTIVU.length; i++) {
    const id = `ko-em-k${i}`;
    stare += `<g id="${id}"><use href="#ko-em-t${Math.floor(R() * TONY.length)}"/><use href="#ko-em-m-${LOS_MOTIVU[i]}"/></g>`;
    kusy.push(id);
  }
  /* pásy pro dva plány: vzadu hustěji, vpředu řidčeji */
  const pasy = [
    pasSymbol("ko-em-pa", 5201, 38, 58, kusy),
    pasSymbol("ko-em-pb", 5202, 38, 58, kusy),
    pasSymbol("ko-em-pc", 5204, 24, 78, kusy),
    pasSymbol("ko-em-pd", 5205, 24, 78, kusy),
  ].join("");
  return kompakt(`<linearGradient id="ko-em-med" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A6DCCB"/><stop offset="0.3" stop-color="#78BAAA"/><stop offset="0.75" stop-color="#4E9386"/><stop offset="1" stop-color="#36705F"/></linearGradient>
  <linearGradient id="ko-em-med-svetlo" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFF6D8" stop-opacity="0.3"/><stop offset="0.45" stop-color="#FFF6D8" stop-opacity="0"/><stop offset="0.75" stop-color="#0E2A26" stop-opacity="0"/><stop offset="1" stop-color="#0E2A26" stop-opacity="0.24"/></linearGradient>
  <linearGradient id="ko-em-hreben" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8FD0C0"/><stop offset="0.45" stop-color="#3F8578"/><stop offset="1" stop-color="#245248"/></linearGradient>
  <linearGradient id="ko-em-sloup" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6A3C24"/><stop offset="0.2" stop-color="#B27A50"/><stop offset="0.45" stop-color="#9A6440"/><stop offset="0.8" stop-color="#70432A"/><stop offset="1" stop-color="#4A2A1A"/></linearGradient>
  <linearGradient id="ko-em-tram" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B07450"/><stop offset="0.45" stop-color="#8A5636"/><stop offset="1" stop-color="#5A3420"/></linearGradient>
  <linearGradient id="ko-em-kamen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#CBC7BD"/><stop offset="0.3" stop-color="#ABA79E"/><stop offset="1" stop-color="#7A766E"/></linearGradient>
  <linearGradient id="ko-em-zlato" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="#FBEBB0"/><stop offset="0.4" stop-color="#E4B850"/><stop offset="0.75" stop-color="#C08A2C"/><stop offset="1" stop-color="#8E621C"/></linearGradient>
  <linearGradient id="ko-em-lak" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3A2E2A"/><stop offset="0.5" stop-color="#1E1816"/><stop offset="1" stop-color="#120E0D"/></linearGradient>
  <linearGradient id="ko-em-slama" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F3E3AA"/><stop offset="0.45" stop-color="#D8BA6C"/><stop offset="1" stop-color="#93733A"/></linearGradient>
  <linearGradient id="ko-em-bronz" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4A4630"/><stop offset="0.3" stop-color="#8C8456"/><stop offset="0.6" stop-color="#5E5A3C"/><stop offset="1" stop-color="#34321F"/></linearGradient>
  <linearGradient id="ko-em-zed" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1E140E"/><stop offset="0.3" stop-color="#2E2018"/><stop offset="1" stop-color="#3A2A20"/></linearGradient>
  <linearGradient id="ko-em-stin-okap" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#140B06" stop-opacity="0.66"/><stop offset="0.5" stop-color="#140B06" stop-opacity="0.26"/><stop offset="1" stop-color="#140B06" stop-opacity="0"/></linearGradient>
  <linearGradient id="ko-em-podhled" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3E2619"/><stop offset="1" stop-color="#1E120B"/></linearGradient>
  <linearGradient id="ko-em-omitka" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D2C6AE"/><stop offset="0.35" stop-color="#EBE2CE"/><stop offset="1" stop-color="#F4ECDB"/></linearGradient>
  <linearGradient id="ko-em-washi" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stop-color="#FFFCF3"/><stop offset="0.6" stop-color="#F8F0DE"/><stop offset="1" stop-color="#EFE3C8"/></linearGradient>
  <linearGradient id="ko-em-hinoki" x1="0" y1="0" x2="0.35" y2="1"><stop offset="0" stop-color="#FCEFD0"/><stop offset="0.55" stop-color="#F3DEAE"/><stop offset="1" stop-color="#E6C690"/></linearGradient>
  <linearGradient id="ko-em-hinoki-rub" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stop-color="#F8E7C2"/><stop offset="0.6" stop-color="#EFD6A4"/><stop offset="1" stop-color="#E2C28C"/></linearGradient>
  <linearGradient id="ko-em-hinoki-lesk" x1="0" y1="0" x2="1" y2="0.6"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.34"/><stop offset="0.4" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="0.85" stop-color="#6E4A26" stop-opacity="0"/><stop offset="1" stop-color="#6E4A26" stop-opacity="0.12"/></linearGradient>
  <linearGradient id="ko-em-valec" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2A1208" stop-opacity="0.5"/><stop offset="0.2" stop-color="#2A1208" stop-opacity="0"/><stop offset="0.3" stop-color="#FFF4E0" stop-opacity="0.14"/><stop offset="0.45" stop-color="#FFF4E0" stop-opacity="0"/><stop offset="0.72" stop-color="#2A1208" stop-opacity="0"/><stop offset="1" stop-color="#2A1208" stop-opacity="0.55"/></linearGradient>
  <linearGradient id="ko-em-den" x1="0" y1="0" x2="1" y2="0.25"><stop offset="0" stop-color="#FFE6B4" stop-opacity="0.2"/><stop offset="0.42" stop-color="#FFE6B4" stop-opacity="0"/><stop offset="0.7" stop-color="#1A1008" stop-opacity="0"/><stop offset="1" stop-color="#1A1008" stop-opacity="0.14"/></linearGradient>
  <radialGradient id="ko-em-zare" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#FFE3A6" stop-opacity="0.85"/><stop offset="0.35" stop-color="#FFC66E" stop-opacity="0.35"/><stop offset="1" stop-color="#FFB050" stop-opacity="0"/></radialGradient>
  <radialGradient id="ko-em-stin-zem" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#1E2A12" stop-opacity="0.34"/><stop offset="1" stop-color="#1E2A12" stop-opacity="0"/></radialGradient>
  <radialGradient id="ko-em-svetluska" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#F6FFB8" stop-opacity="0.95"/><stop offset="0.3" stop-color="#D8F27A" stop-opacity="0.45"/><stop offset="1" stop-color="#B8E05A" stop-opacity="0"/></radialGradient>
  <radialGradient id="ko-em-hlavicka" cx="0.36" cy="0.32" r="0.7"><stop offset="0" stop-color="#F6A089"/><stop offset="0.58" stop-color="#C4432B"/><stop offset="1" stop-color="#7E1F12"/></radialGradient>
  <radialGradient id="ko-em-zlata-zare" cx="0.5" cy="0.6" r="0.5"><stop offset="0" stop-color="#F3D27A" stop-opacity="0.55"/><stop offset="1" stop-color="#F3D27A" stop-opacity="0"/></radialGradient>
  <radialGradient id="ko-em-pec-zare" cx="0.5" cy="0.8" r="0.6"><stop offset="0" stop-color="#FFE08A"/><stop offset="0.6" stop-color="#F29A3A" stop-opacity="0.6"/><stop offset="1" stop-color="#E05A2A" stop-opacity="0"/></radialGradient>
  <linearGradient id="ko-em-dolu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F3DEAE" stop-opacity="0"/><stop offset="1" stop-color="#F0D9A6" stop-opacity="0.96"/></linearGradient>
  ${VLNY}${KVETY}
  <clipPath id="ko-em-c-deska" clipPathUnits="userSpaceOnUse"><path d="${obrysDesky()}"/></clipPath>
  ${deskaSymbol("ko-em-lic", false)}
  ${deskaSymbol("ko-em-rub", true)}
  <g id="ko-em-cista"><path d="${obrysDesky()}" fill="#7E5E38" transform="translate(0 6)"/><path d="${obrysDesky()}" fill="#F1DDB2" stroke="#B98F58" stroke-width="2.4"/></g>
  ${gegyo()}${lucerna()}${zvony()}
  <g id="ko-em-shide-l">${shide(-1)}</g><g id="ko-em-shide-p">${shide(1)}</g><g id="ko-em-strapec">${strapec()}</g>
  ${["#F6C9D2", "#FBE0E6"].map((c, i) => `<path id="ko-em-listek${i}" d="M0 0c2-3 6-3 7 0c-1 3-5 3-7 0Z" fill="${c}"/>`).join("")}
  ${["#E3B23C", "#D9962E"].map((c, i) => `<path id="ko-em-ginkgo${i}" d="M0 0l-6-8q6-4 12 0Z" fill="${c}"/>`).join("")}
  ${["#C4432B", "#D9652E"].map((c, i) => `<path id="ko-em-javor${i}" d="M0 0l-2-4-5 1 3-4-1-5 3 2 2-4 2 4 3-2-1 5 3 4-5-1Z" fill="${c}"/>`).join("")}
  <g id="ko-em-muska"><circle r="10" fill="url(#ko-em-svetluska)"/><circle r="1.2" fill="#FBFFE0"/></g>
  ${stare}
  ${pasy}`);
}

/* ═══ Kresba stojanu ═══ */

/** Kanagu: pozlacené kování na konci trámu (čepička s nýtem) */
const kovani = (x: number, y: number, w: number, h: number) =>
  `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(Math.min(w, h) * 0.2)}" fill="${ZLATO}" stroke="#7A5418" stroke-width="0.6"/>` +
  `<circle cx="${f(x + w * 0.5)}" cy="${f(y + h * 0.5)}" r="${f(Math.min(w, h) * 0.13)}" fill="#8E621C"/>`;

/** Trám s přečnívajícími konci (kibana) a zlatými čepičkami */
function tram(x0: number, x1: number, y: number, tl: number, m: number) {
  const k = tl * 0.55;
  const d = `M${P(x0 + k, y)} L${P(x1 - k, y)} Q${P(x1, y)} ${P(x1, y + tl * 0.5)} Q${P(x1, y + tl)} ${P(x1 - k, y + tl)} L${P(x0 + k, y + tl)} Q${P(x0, y + tl)} ${P(x0, y + tl * 0.5)} Q${P(x0, y)} ${P(x0 + k, y)} Z`;
  return `<path d="${d}" fill="url(#ko-em-tram)"/>` +
    `<path d="M${P(x0 + k, y + 1)} L${P(x1 - k, y + 1)}" stroke="#D9A274" stroke-width="${f(Math.max(0.8, tl * 0.08))}" opacity="0.6"/>` +
    kovani(x0 + 1.5 * m, y + tl * 0.08, tl * 0.62, tl * 0.84) + kovani(x1 - 1.5 * m - tl * 0.62, y + tl * 0.08, tl * 0.62, tl * 0.84);
}

/** Cedrový sloup na kamenné patce, s kováním nahoře a měděnou manžetou dole (`od`/`do` = jen výřez) */
function sloup(r: Rozvrh, x: number, yTop: number, odY = -Infinity, doY = Infinity) {
  const { q, H } = r;
  const w = q.sw;
  const patkaH = w * 0.62;
  const y0 = Math.max(yTop, odY), y1 = Math.min(H - patkaH + 2, doY);
  let s = "";
  if (y1 > y0) {
    s += `<rect x="${f(x - w / 2)}" y="${f(y0)}" width="${f(w)}" height="${f(y1 - y0)}" fill="url(#ko-em-sloup)"/>`;
    /* pár žilek dřeva, světlo zleva a stinná hrana vpravo */
    const R = nahoda(Math.round(x));
    let zilky = "";
    for (let i = 0; i < 3; i++) {
      const zx = x - w * 0.3 + i * w * 0.24 + R() * w * 0.06;
      zilky += `M${P(zx, y0)} C${P(zx + w * 0.04, lerp(y0, y1, 0.3))} ${P(zx - w * 0.05, lerp(y0, y1, 0.7))} ${P(zx + w * 0.02, y1)}`;
    }
    s += `<path d="${zilky}" stroke="#5A321E" stroke-width="${f(Math.max(0.6, w * 0.018))}" fill="none" opacity="0.35"/>`;
    s += `<path d="M${P(x - w * 0.28, y0)} V${f(y1)}" stroke="#E2B488" stroke-width="${f(Math.max(0.6, w * 0.03))}" opacity="0.35"/>`;
    s += `<path d="M${P(x + w / 2 - 0.8, y0)} V${f(y1)}" stroke="#2E180E" stroke-width="1.4" opacity="0.5"/>`;
  }
  /* kování pod hlavicí */
  const kv = yTop + w * 0.35;
  if (kv >= odY && kv <= doY) s += `<rect x="${f(x - w / 2 - 1)}" y="${f(kv)}" width="${f(w + 2)}" height="${f(w * 0.2)}" fill="${ZLATO}"/><path d="M${P(x - w / 2, kv + w * 0.2)} H${f(x + w / 2)}" stroke="#7A5418" stroke-width="0.8"/>`;
  /* měděná manžeta a kamenná patka */
  const man = H - patkaH - w * 0.42;
  if (man + w * 0.42 >= odY) {
    s += `<rect x="${f(x - w / 2 - 1.5)}" y="${f(man)}" width="${f(w + 3)}" height="${f(w * 0.44)}" rx="1.5" fill="url(#ko-em-hreben)"/>`;
    s += `<path d="M${P(x - w / 2 - 1.5, man + 1.5)} H${f(x + w / 2 + 1.5)}" stroke="#A9DCCD" stroke-width="1" opacity="0.7"/>`;
    const pw = w * 1.7;
    s += `<path d="M${P(x - pw / 2, H)} L${P(x - pw / 2 + 3, H - patkaH + 4)} Q${P(x - pw / 2 + 4, H - patkaH)} ${P(x - pw / 2 + 10, H - patkaH)} L${P(x + pw / 2 - 10, H - patkaH)} Q${P(x + pw / 2 - 4, H - patkaH)} ${P(x + pw / 2 - 3, H - patkaH + 4)} L${P(x + pw / 2, H)} Z" fill="url(#ko-em-kamen)"/>`;
    s += `<path d="M${P(x - pw / 2 + 6, H - patkaH + 1.5)} H${f(x + pw / 2 - 6)}" stroke="#E8E4DA" stroke-width="1.4" opacity="0.8"/>`;
    s += `<path d="M${P(x + pw / 2 - 3, H - patkaH + 4)} L${P(x + pw / 2, H)}" stroke="#5E5A52" stroke-width="1.6" opacity="0.6"/>`;
  }
  return s;
}

/** Konzola tokyō na hlavici sloupu: blok daito, rameno hijiki se třemi bločky masu */
function konzola(x: number, yTop: number, ySpod: number, w: number) {
  const h = ySpod - yTop;
  const bh = h * 0.42, rh = h * 0.3;
  const rw = w * 2.3;
  let s = `<path d="M${P(x - w * 0.62, ySpod)} L${P(x - w * 0.5, ySpod - bh)} L${P(x + w * 0.5, ySpod - bh)} L${P(x + w * 0.62, ySpod)} Z" fill="#8A5636"/>`;
  s += `<path d="M${P(x - rw / 2, ySpod - bh)} Q${P(x - rw / 2 - 2, ySpod - bh - rh * 0.5)} ${P(x - rw / 2 + 3, ySpod - bh - rh)} L${P(x + rw / 2 - 3, ySpod - bh - rh)} Q${P(x + rw / 2 + 2, ySpod - bh - rh * 0.5)} ${P(x + rw / 2, ySpod - bh)} Z" fill="#9A6440"/>`;
  s += `<path d="M${P(x - rw / 2 + 2, ySpod - bh - rh + 1)} H${f(x + rw / 2 - 2)}" stroke="#D49A6A" stroke-width="1" opacity="0.6"/>`;
  let bloky = "";
  for (const dx of [-rw / 2 + w * 0.32, 0, rw / 2 - w * 0.32]) {
    const mw = w * 0.5;
    bloky += `M${P(x + dx - mw / 2, ySpod - bh - rh)} L${P(x + dx - mw * 0.4, yTop)} L${P(x + dx + mw * 0.4, yTop)} L${P(x + dx + mw / 2, ySpod - bh - rh)} Z`;
  }
  return s + `<path d="${bloky}" fill="#7A4A2E"/>`;
}

/**
 * Vzory jednoho režimu (v jeho jednotkách): drážky a spoje měděných tabulí,
 * kroucení slámy na šimenawě a pětibarevné pruhy provazu zvonce.
 */
function vzory(r: Rozvrh) {
  const { p, q } = r;
  const m = Math.max(0.5, q.m);
  const k = 21 * m, v = 30 * m;
  const sp = Math.max(0.8, 1.6 * q.m), lm = Math.max(0.5, 0.9 * q.m);
  const plech = `<pattern id="ko-em-${p}-plech" patternUnits="userSpaceOnUse" width="${f(k * 2)}" height="${f(v * 2)}">
    <path d="M${f(sp / 2)} 0V${f(v * 2)}M${f(k + sp / 2)} 0V${f(v * 2)}" stroke="#2E6A60" stroke-width="${f(sp)}" opacity="0.7"/>
    <path d="M${f(sp + 1.2 * m)} 0V${f(v * 2)}M${f(k + sp + 1.2 * m)} 0V${f(v * 2)}" stroke="#C2EADD" stroke-width="${f(lm)}" opacity="0.55"/>
    <path d="M${f(sp + 1)} ${f(v * 0.5)}h${f(k - sp - 2)}M${f(k + sp + 1)} ${f(v * 1.5)}h${f(k - sp - 2)}" stroke="#2E6A60" stroke-width="${f(lm)}" opacity="0.4"/>
  </pattern>`;
  const t = Math.max(7, 15 * q.m);
  const slama = `<pattern id="ko-em-${p}-slama" patternUnits="userSpaceOnUse" width="${f(t)}" height="${f(t * 2)}" patternTransform="rotate(-38)">
    <rect width="${f(t * 0.34)}" height="${f(t * 2)}" fill="#8C6C2C" opacity="0.55"/><rect x="${f(t * 0.34)}" width="${f(t * 0.16)}" height="${f(t * 2)}" fill="#FCF3D2" opacity="0.5"/>
  </pattern>`;
  const z = q.zvonec, kz = 10 * z.m, pw = 20 * z.m;
  const barvy = ["#C4432B", "#F5EFE3", "#6D4A8E", "#F5EFE3", "#4E8A5A", "#F5EFE3", "#E2B840", "#F5EFE3"];
  const provaz = `<pattern id="ko-em-${p}-pruhy" patternUnits="userSpaceOnUse" x="${f(z.x - pw / 2)}" width="${f(pw)}" height="${f(kz * 8)}">${barvy
    .map((b, i) => `<path d="M0 ${f(i * kz + kz)}L${f(pw)} ${f(i * kz + kz * 0.1)}V${f(i * kz + kz * 1.1)}L0 ${f(i * kz + kz * 2)}Z" fill="${b}"/>`)
    .join("")}<path d="M0 ${f(kz * 9)}L${f(pw)} ${f(kz * 8.1)}V${f(kz * 9.1)}L0 ${f(kz * 10)}ZM0 ${f(kz * 0)}L${f(pw)} ${f(-kz * 0.9)}V${f(kz * 0.1)}L0 ${f(kz)}Z" fill="${barvy[7]}"/></pattern>`;
  return plech + slama + provaz;
}

/** Střecha: měděný plech s drážkami, skříňový hřeben s plechy oni-ita, okapová hrana a dvě řady krokví s bílými čely */
function strecha(r: Rozvrh) {
  const { q, okap, hreben, p } = r;
  const s = q.strecha;
  const m = q.m;
  const N = 48;
  const xs = Array.from({ length: N + 1 }, (_, i) => lerp(s.x0, s.x1, i / N));
  const hb = 24 * m + 3;
  const vrsekX = (x: number) => lerp(s.x0 + 12 * m, s.x1 - 12 * m, (x - s.x0) / (s.x1 - s.x0));
  /* plocha střechy: nahoře hřeben, dole okap; boky se k okapu lehce rozevírají */
  const vrch: Bod[] = xs.map((x) => [vrsekX(x), hreben(x) + hb * 0.6]);
  const spod: Bod[] = xs.map((x) => [x, okap(x)]);
  const plocha = lomena([...vrch, ...spod.slice().reverse()]);
  let out = `<defs><path id="ko-em-${p}-plocha" d="${plocha}"/></defs><use href="#ko-em-${p}-plocha" fill="url(#ko-em-med)"/><use href="#ko-em-${p}-plocha" fill="url(#ko-em-${p}-plech)"/>`;
  /* měděnka: pár měkkých světlejších pruhů, jak po plechu teče déšť */
  const R = nahoda(3301);
  let pruhy = "";
  for (let i = 0; i < 9; i++) {
    const x = lerp(s.x0 + 40, s.x1 - 40, (i + R() * 0.6) / 9);
    pruhy += `<path d="M${P(vrsekX(x), hreben(x) + hb)} L${P(x + 2, okap(x) - 3)}" stroke-width="${f(21 * m * (0.6 + R() * 0.8))}" opacity="${f(0.05 + R() * 0.07)}"/>`;
  }
  out += `<g stroke="#C6EDE0">${pruhy}</g><use href="#ko-em-${p}-plocha" fill="url(#ko-em-med-svetlo)"/>`;
  /* boční prkna štítů na koncích střechy (z boku jako tmavá hrana se zlatou čepičkou) */
  for (const a of [0, N]) {
    const [xv, yv] = vrch[a], [x2, y2] = spod[a];
    const sm = a ? 1 : -1;
    out += `<path d="M${P(xv, yv - hb * 0.4)} L${P(x2 + sm * 2 * m, y2 + 2 * m)}" stroke="#4A2C1C" stroke-width="${f(7 * m + 1)}" stroke-linecap="round"/>`;
    out += `<circle cx="${f(x2 + sm * 2 * m)}" cy="${f(y2 + 2 * m)}" r="${f(5 * m + 1)}" fill="${ZLATO}" stroke="#7A5418" stroke-width="0.6"/>`;
  }
  /* hřeben skříňový (hako-mune): víčko, dva pásy a spodní lišta */
  const hrebenD = lomena([...xs.map((x) => [vrsekX(x), hreben(x)] as Bod), ...xs.slice().reverse().map((x) => [vrsekX(x), hreben(x) + hb] as Bod)]);
  out += `<path d="${hrebenD}" fill="url(#ko-em-hreben)"/>`;
  const linka = (dy: number) => `M${xs.map((x) => P(vrsekX(x), hreben(x) + dy)).join("L")}`;
  out += `<path d="${linka(1.5 * m)}" stroke="#D2F2E6" stroke-width="${f(1.6 * m + 0.4)}" fill="none" opacity="0.85"/>`;
  out += `<path d="${linka(hb * 0.3)}${linka(hb * 0.62)}${linka(hb - 1)}" stroke="#1E4840" stroke-width="${f(1.2 * m + 0.3)}" fill="none" opacity="0.65"/>`;
  out += `<path d="${linka(hb * 0.3 + 1.6 * m)}${linka(hb * 0.62 + 1.6 * m)}" stroke="#B8E6D8" stroke-width="${f(0.8 * m + 0.2)}" fill="none" opacity="0.5"/>`;
  for (const smer of [-1, 1]) {
    const x = smer < 0 ? vrsekX(s.x0) + 10 * m : vrsekX(s.x1) - 10 * m;
    const y = hreben(smer < 0 ? s.x0 : s.x1);
    const w = 44 * m + 4, h = 26 * m + 3;
    /* plech oni-ita: nízký štítek nad koncem hřebene, kraje stočené do úponků jako mrak */
    const d = `M${P(x - w * 0.36, y + hb)} C${P(x - w * 0.5, y + hb * 0.4)} ${P(x - w * 0.62, y - h * 0.3)} ${P(x - w * 0.46, y - h * 0.62)} C${P(x - w * 0.34, y - h * 0.86)} ${P(x - w * 0.12, y - h * 0.7)} ${P(x - w * 0.18, y - h * 0.5)} C${P(x - w * 0.08, y - h * 1.02)} ${P(x + w * 0.08, y - h * 1.02)} ${P(x + w * 0.18, y - h * 0.5)} C${P(x + w * 0.12, y - h * 0.7)} ${P(x + w * 0.34, y - h * 0.86)} ${P(x + w * 0.46, y - h * 0.62)} C${P(x + w * 0.62, y - h * 0.3)} ${P(x + w * 0.5, y + hb * 0.4)} ${P(x + w * 0.36, y + hb)} Z`;
    out += `<path d="${d}" fill="url(#ko-em-hreben)" stroke="#1E4840" stroke-width="${f(0.9 * m + 0.3)}" stroke-linejoin="round"/>`;
    out += `<path d="M${P(x - w * 0.4, y - h * 0.2)} Q${P(x, y - h * 0.5)} ${P(x + w * 0.4, y - h * 0.2)}" stroke="#D2F2E6" stroke-width="${f(1 * m + 0.3)}" fill="none" opacity="0.6"/>`;
    out += `<circle cx="${f(x)}" cy="${f(y + hb * 0.15)}" r="${f(w * 0.17)}" fill="${ZLATO}" stroke="#7A5418" stroke-width="0.6"/><circle cx="${f(x)}" cy="${f(y + hb * 0.15)}" r="${f(w * 0.07)}" fill="#C08A2C"/>`;
  }
  /* okapová hrana (kaya-oi): silná lišta, na rozích se zvedá */
  const tl = 10 * m + 2;
  out += `<path d="${lomena([...spod, ...spod.slice().reverse().map(([x, y]) => [x, y + tl] as Bod)])}" fill="#2B6458"/>`;
  out += `<path d="M${spod.map(([x, y]) => P(x, y + 1.3)).join("L")}" stroke="#B8E6D8" stroke-width="${f(1.4 * m + 0.4)}" fill="none" opacity="0.9"/>`;
  /* podhled a dvě řady krokví (čárkovaný tah podél okapu: hranatá čela nahoře, kulatá dole ve stínu) */
  const podhledH = q.keta - s.okap - tl;
  out += `<path d="${lomena([...spod.map(([x, y]) => [x, y + tl] as Bod), ...spod.slice().reverse().map(([x, y]) => [x, y + tl + podhledH + 4 * m] as Bod)])}" fill="url(#ko-em-podhled)"/>`;
  const kr = Math.max(3, 8 * m), kk = Math.max(7, 17 * m);
  const rada = (dy: number) => `M${xs.slice(1, -1).map((x) => P(x, okap(x) + tl + dy)).join("L")}`;
  const y1 = 1.4 * m + kr * 0.43, y2 = kr * 1.62 + 2 * m;
  out += `<path d="${rada(y1)}" stroke="#5E4A36" stroke-width="${f(kr * 0.86 + 1.2)}" stroke-dasharray="${f(kr + 1.2)} ${f(kk - kr - 1.2)}" fill="none"/>`;
  out += `<path d="${rada(y1)}" stroke="#F7F2E6" stroke-width="${f(kr * 0.86)}" stroke-dasharray="${f(kr)} ${f(kk - kr)}" stroke-dashoffset="-0.6" fill="none"/>`;
  out += `<path d="${rada(y2)}" stroke="#BDB4A2" stroke-width="${f(kr * 0.72)}" stroke-dasharray="0 ${f(kk)}" stroke-dashoffset="${f(-kr / 2 - 0.6)}" stroke-linecap="round" fill="none"/>`;
  return out;
}

/** Štít čidori-hafu uprostřed: prkna hafu, štítová stěna, pozlacená rozeta 懸魚 */
function stit(r: Rozvrh) {
  const { q, okap, W } = r;
  const cx = W / 2;
  const { vrch, pul } = q.stit;
  const m = q.m;
  const tl = 16 * m + 2;
  const A: Bod = [cx, vrch];
  const strana = (smer: number) => {
    const B: Bod = [cx + smer * pul, okap(cx + smer * pul) + 2 * m];
    const C: Bod = [cx + smer * pul * 0.42, vrch + (B[1] - vrch) * 0.7];
    return vzorek(kvadr(A, C, B), 18);
  };
  const Lv = strana(-1), Pv = strana(1);
  const Li = posun(Lv, -tl), Pi = posun(Pv, tl);
  /* štítová stěna: omítka mezi vnitřními hranami prken */
  const yz = okap(cx) + 2;
  let s = `<path d="${lomena([...Li.filter(([, y]) => y < yz), [cx - pul * 0.8, yz], [cx + pul * 0.8, yz], ...Pi.filter(([, y]) => y < yz).reverse()])}" fill="url(#ko-em-omitka)"/>`;
  /* trámky ve štítu: vazný trám, sloupek ke špici a dvě vzpěry */
  const yv = vrch + (yz - vrch) * 0.6;
  const sir = pul * 0.62 * ((yv - vrch) / (yz - vrch));
  s += `<path d="M${P(cx - sir, yv)}h${f(sir * 2)}v${f(9 * m + 1)}h${f(-sir * 2)}ZM${P(cx - 4 * m - 1, vrch + tl * 1.1)}h${f(8 * m + 2)}V${f(yv)}h${f(-8 * m - 2)}Z" fill="#7A4A2E"/>`;
  s += `<path d="M${P(cx - sir * 0.7, yv)} L${P(cx - 5 * m, vrch + tl * 1.9)} M${P(cx + sir * 0.7, yv)} L${P(cx + 5 * m, vrch + tl * 1.9)}" stroke="#7A4A2E" stroke-width="${f(5 * m + 1)}"/>`;
  /* stín pod prkny na omítce */
  s += `<path d="${lomena([...Li, ...posun(Li, -tl * 0.9).reverse()])}${lomena([...Pi, ...posun(Pi, tl * 0.9).reverse()])}" fill="#3A2418" opacity="0.18"/>`;
  /* měděná lemovka střechy štítu nad prkny */
  const Lo = posun(Lv, 7 * m + 1), Po = posun(Pv, -(7 * m + 1));
  s += `<path d="${lomena([...Lo, ...Lv.slice().reverse()])}${lomena([...Po, ...Pv.slice().reverse()])}" fill="#3F8578"/>`;
  s += `<path d="M${Lo.map(([x, y]) => P(x, y)).join("L")}M${Po.map(([x, y]) => P(x, y)).join("L")}" stroke="#B8E6D8" stroke-width="${f(1.2 * m + 0.4)}" fill="none"/>`;
  /* prkna hafu: tmavé dřevo se světlou hranou */
  s += `<path d="${lomena([...Lv, ...Li.slice().reverse()])}" fill="#5A3622"/><path d="${lomena([...Pv, ...Pi.slice().reverse()])}" fill="#4A2C1C"/>`;
  s += `<path d="M${Lv.map(([x, y]) => P(x, y + 1.2 * m)).join("L")}M${Pv.map(([x, y]) => P(x, y + 1.2 * m)).join("L")}" stroke="#B07850" stroke-width="${f(1.4 * m + 0.3)}" fill="none" opacity="0.8"/>`;
  /* zlaté kování: na koncích prken podél prkna, uprostřed délky pásek */
  let zlato = "";
  for (const [B, Bi] of [[Lv, Li], [Pv, Pi]] as [Bod[], Bod[]][]) {
    const n = B.length;
    zlato += lomena([...B.slice(n - 4), ...Bi.slice(n - 4).reverse()]) + lomena([B[8], B[10], Bi[10], Bi[8]]);
    const [mx, my] = B[n - 2], [ix, iy] = Bi[n - 2];
    s += `<circle cx="${f((mx + ix) / 2)}" cy="${f((my + iy) / 2)}" r="${f(2.2 * m + 0.4)}" fill="#8E621C"/>`;
  }
  s += `<path d="${zlato}" fill="${ZLATO}" stroke="#7A5418" stroke-width="0.7"/>`;
  /* rozeta gegyo pod špicí */
  s += `<use href="#ko-em-gegyo" transform="translate(${P(cx, vrch + tl * 0.9)}) scale(${f(m * 0.9 + 0.05)})"/>`;
  return s;
}

/** Pozlacená rozeta 懸魚 (gegyo): střední puklice, dva stočené úponky a přívěsek (jednou v zásobě) */
function gegyo() {
  const o = "#7A5418";
  const upony = [-1, 1].map((s) => `M${s * 6} 12 C${s * 18} 4 ${s * 34} 6 ${s * 40} 16 C${s * 45} 25 ${s * 38} 33 ${s * 30} 30 C${s * 23} 27 ${s * 26} 19 ${s * 32} 21`).join("");
  const male = [-1, 1].map((s) => `M${s * 12} 22 C${s * 18} 30 ${s * 16} 40 ${s * 8} 44`).join("");
  return `<g id="ko-em-gegyo"><path d="${upony}" fill="none" stroke="${o}" stroke-width="7.4" stroke-linecap="round"/><path d="${upony}" fill="none" stroke="${ZLATO}" stroke-width="5" stroke-linecap="round"/>
    <path d="${male}" fill="none" stroke="${o}" stroke-width="5.4" stroke-linecap="round"/><path d="${male}" fill="none" stroke="${ZLATO}" stroke-width="3.4" stroke-linecap="round"/>
    <path d="M-7 30 Q0 58 0 62 Q0 58 7 30 Z M-16 4 Q0 -4 16 4 L12 10 Q0 4 -12 10 Z" fill="${ZLATO}" stroke="${o}" stroke-width="1"/>
    <circle cx="0" cy="20" r="13.5" fill="${ZLATO}" stroke="${o}" stroke-width="1.2"/>
    <circle cx="0" cy="20" r="8.4" fill="none" stroke="${o}" stroke-width="1" opacity="0.8"/>
    <circle cx="0" cy="20" r="10.8" fill="none" stroke="#8E621C" stroke-width="2.2" stroke-dasharray="0 11.31" stroke-linecap="round"/>
    <circle cx="0" cy="20" r="4" fill="#C08A2C"/><ellipse cx="-3.4" cy="15.6" rx="3.2" ry="2" fill="#FFF6D0" opacity="0.7"/></g>`;
}

/** Lakovaná deska 扁額 se zlatým rámem (nápis je HTML ve štítku) */
function plaketa(r: Rozvrh) {
  const { x, y, w, h } = r.plaketa;
  const m = r.q.m;
  const ram = Math.max(4, 9 * m);
  return `<rect x="${f(x + 3 * m)}" y="${f(y + 5 * m)}" width="${f(w)}" height="${f(h)}" rx="${f(3 * m)}" fill="#140A04" opacity="0.35"/>
    <rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(3.4 * m + 0.6)}" fill="${ZLATO}" stroke="#6E4A14" stroke-width="${f(0.8 * m + 0.4)}"/>
    <rect x="${f(x + ram * 0.36)}" y="${f(y + ram * 0.36)}" width="${f(w - ram * 0.72)}" height="${f(h - ram * 0.72)}" rx="${f(2 * m + 0.4)}" fill="none" stroke="#8E621C" stroke-width="${f(0.8 * m + 0.3)}" opacity="0.8"/>
    <rect x="${f(x + ram)}" y="${f(y + ram)}" width="${f(w - ram * 2)}" height="${f(h - ram * 2)}" rx="${f(1.5 * m + 0.4)}" fill="url(#ko-em-lak)"/>
    <rect x="${f(x + ram + 2.5 * m)}" y="${f(y + ram + 2.5 * m)}" width="${f(w - ram * 2 - 5 * m)}" height="${f(h - ram * 2 - 5 * m)}" fill="none" stroke="#C99A3E" stroke-width="${f(0.7 * m + 0.2)}" opacity="0.7"/>
    <path d="M${P(x + ram + 4 * m, y + ram + 3 * m)} L${P(x + w * 0.42, y + ram + 3 * m)} L${P(x + ram + 4 * m, y + h * 0.62)} Z" fill="#FFFFFF" opacity="0.06"/>
    <path d="M${P(x, y)}h${f(w)}v${f(h)}h${f(-w)}Z" fill="none" stroke="${ZLATO}" stroke-width="${f(8 * m + 1.6)}" stroke-dasharray="0 ${f(w)} 0 ${f(h)}" stroke-linecap="round"/>`;
}

/** Washi s nadpisem: papír s měkkými okraji, přišpendlený dvěma připínáčky jako na vývěsce */
function washi(r: Rozvrh) {
  const { x, y, w, h } = r.washi;
  const m = r.q.m;
  const R = nahoda(4411);
  /* mírně zvlněné okraje ručního papíru */
  const okraj = (ax: number, ay: number, bx: number, by: number, n: number): Bod[] =>
    Array.from({ length: n + 1 }, (_, i) => {
      const t = i / n;
      const v = i === 0 || i === n ? 0 : (R() - 0.5) * 1.8 * Math.max(0.6, m);
      return [lerp(ax, bx, t) + (ay === by ? 0 : v), lerp(ay, by, t) + (ay === by ? v : 0)] as Bod;
    });
  const B = [...okraj(x, y, x + w, y, 14), ...okraj(x + w, y, x + w, y + h, 5).slice(1), ...okraj(x + w, y + h, x, y + h, 14).slice(1), ...okraj(x, y + h, x, y, 5).slice(1)];
  const id = `ko-em-${r.p}-washi`;
  const pin = (px: number, py: number) => {
    const pr = Math.max(3, 7 * m + 1);
    return `<ellipse cx="${f(px + pr * 0.35)}" cy="${f(py + pr * 0.6)}" rx="${f(pr * 1.05)}" ry="${f(pr * 0.8)}" fill="#140A05" opacity="0.3"/><circle cx="${f(px)}" cy="${f(py)}" r="${f(pr)}" fill="url(#ko-em-hlavicka)"/><ellipse cx="${f(px - pr * 0.32)}" cy="${f(py - pr * 0.36)}" rx="${f(pr * 0.3)}" ry="${f(pr * 0.2)}" fill="#FFFFFF" opacity="0.45"/>`;
  };
  return `<g class="ko-ema-washi"><defs><path id="${id}" d="${lomena(B)}"/></defs>
    <use href="#${id}" fill="#1E120A" opacity="0.22" transform="translate(${f(4 * m + 1)} ${f(7 * m + 1)})"/>
    <use href="#${id}" fill="url(#ko-em-washi)" stroke="#D9CBAE" stroke-width="${f(0.8 * m + 0.4)}"/>
    <path d="M${P(x + w * 0.06, y + h * 0.3)} c${f(w * 0.1)} ${f(-2 * m)} ${f(w * 0.2)} ${f(2 * m)} ${f(w * 0.3)} 0 M${P(x + w * 0.55, y + h * 0.82)} c${f(w * 0.1)} ${f(2 * m)} ${f(w * 0.22)} ${f(-1 * m)} ${f(w * 0.36)} 0" stroke="#E6D9BC" stroke-width="${f(0.8 * m + 0.3)}" fill="none" opacity="0.8"/>
    ${pin(x + Math.max(14, 22 * m), y + Math.max(10, 13 * m))}${pin(x + w - Math.max(14, 22 * m), y + Math.max(10, 13 * m))}
    <use class="ko-ema-washi-noc" href="#${id}" fill="#0E1124" opacity="0"/>
  </g>`;
}

/** Šimenawa: kroucený slaměný provaz od sloupu ke sloupu, uprostřed nejtlustší */
function simenawa(r: Rozvrh) {
  const m = r.q.m;
  const { stred, sirka } = r.sim;
  const N = 40;
  const horni: Bod[] = [], dolni: Bod[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const [x, y] = stred(t);
    horni.push([x, y - sirka(t) / 2]);
    dolni.push([x, y + sirka(t) / 2]);
  }
  const id = `ko-em-${r.p}-sim`;
  return `<defs><path id="${id}" d="${lomena([...horni, ...dolni.reverse()])}"/></defs>
    <use href="#${id}" fill="#1E120A" opacity="0.2" transform="translate(${f(2 * m)} ${f(5 * m + 1)})"/>
    <use href="#${id}" fill="url(#ko-em-slama)"/><use href="#${id}" fill="url(#ko-em-${r.p}-slama)"/>`;
}

/** Papírová klikatice 紙垂 visící z bodu 0,0: proužek přeložený do blesku, díly střídavě šikmé (při m = 1) */
function shide(s: number) {
  const w = 13, h = 14.4, d = w * 0.58 * s, sk = w * 0.16 * s;
  let dily = "", stin = "";
  for (let k = 0; k < 4; k++) {
    const o = k % 2 ? d : 0;
    const t = k % 2 ? -sk : sk;
    const dil = `M${P(o - w / 2 + t, k * h)} L${P(o + w / 2 + t, k * h)} L${P(o + w / 2 - t, (k + 1) * h + 0.6)} L${P(o - w / 2 - t, (k + 1) * h + 0.6)} Z`;
    dily += `<path d="${dil}" fill="${k % 2 ? "#F2EDE2" : "#FFFEFA"}"/>`;
    stin += dil;
  }
  return `<path d="M-3 -1 h6" stroke="#E9E0CC" stroke-width="2.5"/><path d="${stin}" fill="#2B2420" opacity="0.12" transform="translate(2 2.4)"/>${dily}<path d="${stin}" fill="none" stroke="#D2C9B8" stroke-width="0.65" stroke-linejoin="round"/>`;
}

/** Slaměný střapec sagari mezi klikaticemi (při m = 1) */
function strapec() {
  const R = nahoda(9301);
  let s = "", t = "";
  for (let k = 0; k < 7; k++) {
    const x = (k - 3) * 1.5;
    const d = `M${P(x, 0)} Q${P(x + (R() - 0.5) * 3, 16)} ${P(x * 1.6 + (R() - 0.5) * 3, 26 + R() * 8)}`;
    if (k % 2) s += d;
    else t += d;
  }
  return `<path d="${s}" stroke="#C9A85C" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="${t}" stroke="#E4CC88" stroke-width="1.5" fill="none" stroke-linecap="round"/><rect x="-6" y="-1" width="12" height="4" rx="1.5" fill="#B08A44"/>`;
}

/** Visací bronzová lucerna tsuri-dōrō (při m = 1, závěs v 0,0): řetízek, stříška s úponky, schránka s mřížkou */
const LUC = { w: 46, ret: 18 };
function lucerna() {
  const { w, ret } = LUC;
  const Y = ret;
  const bx = -w * 0.36, by = Y + 19, bw = w * 0.72, bh = 30;
  let s = `<path d="M0 0V${ret}" stroke="#4A4630" stroke-width="2.6" stroke-dasharray="3.4 1.1"/>`;
  s += `<circle cx="0" cy="${f(Y + 2)}" r="3.4" fill="url(#ko-em-bronz)"/>`;
  s += `<path d="M${P(-w * 0.62, Y + 16)} Q${P(-w * 0.3, Y + 12)} ${P(0, Y + 4)} Q${P(w * 0.3, Y + 12)} ${P(w * 0.62, Y + 16)} L${P(w * 0.56, Y + 19)} L${P(-w * 0.56, Y + 19)} Z" fill="url(#ko-em-bronz)" stroke="#2E2C1C" stroke-width="0.8"/>`;
  s += `<path d="M${P(-w * 0.62, Y + 16)} q-4 -1 -3 -5 M${P(w * 0.62, Y + 16)} q4 -1 3 -5" stroke="#5E5A3C" stroke-width="1.9" fill="none" stroke-linecap="round"/>`;
  s += `<path d="M${P(-w * 0.5, Y + 15)} Q${P(0, Y + 7)} ${P(w * 0.5, Y + 15)}" stroke="#A9DCCD" stroke-width="1.2" fill="none" opacity="0.5"/>`;
  s += `<rect x="${f(bx)}" y="${f(by)}" width="${f(bw)}" height="${bh}" fill="url(#ko-em-bronz)" stroke="#2E2C1C" stroke-width="0.8"/>`;
  s += `<rect x="${f(bx + bw * 0.12)}" y="${f(by + bh * 0.14)}" width="${f(bw * 0.76)}" height="${f(bh * 0.72)}" fill="#2A281C"/>`;
  s += `<use href="#ko-em-mriz"/>`;
  s += `<path d="M${P(bx - 3, by + bh)} h${f(bw + 6)} l-4 5 h${f(-bw + 2)} Z" fill="url(#ko-em-bronz)"/>`;
  s += `<path d="M0 ${f(by + bh + 5)} v5" stroke="#4A4630" stroke-width="2" stroke-linecap="round"/>`;
  s += `<ellipse cx="${f(-w * 0.24)}" cy="${f(Y + 17.5)}" rx="5" ry="1.6" fill="#7FB5A6" opacity="0.6"/>`;
  let mriz = "";
  for (let k = 1; k < 4; k++) mriz += `M${P(bx + bw * 0.12 + (bw * 0.76 * k) / 4, by + bh * 0.14)} v${f(bh * 0.72)}`;
  mriz += `M${P(bx + bw * 0.12, by + bh * 0.5)} h${f(bw * 0.76)}`;
  return `<path id="ko-em-mriz" d="${mriz}" stroke="#5E5A3C" stroke-width="1.4"/><g id="ko-em-lucerna">${s}</g>` +
    /* noční světlo: rozsvícená okénka s mřížkou a záře kolem */
    `<g id="ko-em-lucerna-svetlo"><circle cx="0" cy="${f(by + bh / 2)}" r="120" fill="url(#ko-em-zare)"/><rect x="${f(bx + bw * 0.12)}" y="${f(by + bh * 0.14)}" width="${f(bw * 0.76)}" height="${f(bh * 0.72)}" fill="#FFD27A"/><use href="#ko-em-mriz"/></g>`;
}

/** Svazek rolniček suzu (velká uprostřed, dvě menší po stranách) se závěsem v 0,0, při m = 1 */
function zvony() {
  const zvon = (cx: number, cy: number, R: number) => `<circle cx="${f(cx + R * 0.12)}" cy="${f(cy + R * 0.18)}" r="${f(R)}" fill="#3A2610" opacity="0.25"/>
    <circle cx="${f(cx)}" cy="${f(cy)}" r="${f(R)}" fill="${ZLATO}" stroke="#7A5418" stroke-width="${f(R * 0.06)}"/>
    <path d="M${P(cx - R, cy - R * 0.06)} Q${P(cx, cy + R * 0.3)} ${P(cx + R, cy - R * 0.06)}" stroke="#8E621C" stroke-width="${f(R * 0.12)}" fill="none"/>
    <path d="M${P(cx - R * 0.62, cy + R * 0.42)} Q${P(cx, cy + R * 0.66)} ${P(cx + R * 0.62, cy + R * 0.42)}" stroke="#3A2610" stroke-width="${f(R * 0.15)}" fill="none" stroke-linecap="round"/>
    <circle cx="${f(cx)}" cy="${f(cy + R * 0.58)}" r="${f(R * 0.14)}" fill="#3A2610"/>
    <ellipse cx="${f(cx - R * 0.36)}" cy="${f(cy - R * 0.42)}" rx="${f(R * 0.3)}" ry="${f(R * 0.2)}" fill="#FFF8DC" opacity="0.75" transform="rotate(-30 ${P(cx - R * 0.36, cy - R * 0.42)})"/>`;
  const R = 21;
  const yb = 22 + R;
  return `<g id="ko-em-zvony">
    <path d="M0 -6 V12" stroke="#5E4A26" stroke-width="3"/>
    <path d="M-22 14 Q0 6 22 14" stroke="#8E621C" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M-19 13 V${yb + 4} M19 13 V${yb + 4}" stroke="#5E4A26" stroke-width="1.4"/>
    ${zvon(-19, yb + 13, 10)}${zvon(19, yb + 13, 10)}${zvon(0, yb, R)}
  </g>`;
}
/** Kde pod závěsem svazku končí velká rolnička (při m = 1) — odtud visí provaz */
const ZVONY_DNO = 22 + 21 * 2 - 2;

/** Zvonec suzu s pestrým provazem suzu-no-o (skupiny pro skript: .ko-ema-suzu, .ko-ema-provaz-zvonu) */
function zvonec(r: Rozvrh) {
  const { q, okap, p } = r;
  const { x, m, konec } = q.zvonec;
  const y0 = okap(x) + 8 * m;
  const top = y0 + ZVONY_DNO * m;
  const pw = 20 * m;
  const dno = konec - 20 * m;
  const suzu = `<g class="ko-ema-suzu"><use href="#ko-em-zvony" transform="translate(${P(x, y0)}) scale(${f(m * 100) / 100})"/></g>`;
  /* provaz: pětibarevné šikmé pruhy (vzor), válcový stín, dole uzel a střapec */
  const strapce = [-3, -2, -1, 0, 1, 2, 3].map((j) => `<path d="M${P(x + j * 1.7 * m, dno + 4 * m)} Q${P(x + j * 2.4 * m, dno + 14 * m)} ${P(x + j * 3.2 * m, dno + 24 * m)}" stroke="${["#C4432B", "#E2B840", "#6D4A8E", "#4E8A5A"][(j + 3) % 4]}"/>`).join("");
  const provaz = `<g class="ko-ema-provaz-zvonu">
    <rect x="${f(x - pw / 2)}" y="${f(top)}" width="${f(pw)}" height="${f(dno - top)}" rx="${f(pw * 0.3)}" fill="url(#ko-em-${p}-pruhy)"/>
    <rect x="${f(x - pw / 2)}" y="${f(top)}" width="${f(pw)}" height="${f(dno - top)}" rx="${f(pw * 0.3)}" fill="url(#ko-em-valec)"/>
    <rect x="${f(x - pw * 0.62)}" y="${f(dno - 4 * m)}" width="${f(pw * 1.24)}" height="${f(9 * m)}" rx="${f(4 * m)}" fill="#C4432B"/>
    <g stroke-width="${f(1.8 * m)}" fill="none" stroke-linecap="round">${strapce}</g>
  </g>`;
  return provaz + suzu;
}

/* ——— Šňůra kōhaku ——— */

/**
 * Úseky šňůry jako tahy osy z provazek(): tmavý lem a červené jádro jsou dva
 * tahy téže cesty (jako pás z provazek, jen bez dvojích bodů), přes ně bílé
 * proužky kroucení z provazek a lesk nahoře; pod tím měkký stín na stěně.
 * Všechny úseky jedné skupiny sdílí jednu cestu (podcesty), takže je to pár značek.
 */
function snura(kusy: { B: Bod[]; n?: number }[], w: number, id: string, stin: [number, number] | null, orez = "") {
  const pr = kusy.map((k) => provazek(poCeste(k.B), w, w, 0, k.n ?? Math.max(8, Math.round(delka(k.B) / 7))));
  const osa = pr.map((p) => p.osa).join("");
  const zkrut = pr.map((p) => p.zkrut).join("");
  let s = `<path id="${id}" d="${osa}" fill="none"/>`;
  /* stín padá jen na stěnu za šňůrou (mimo ni by visel ve vzduchu) */
  if (stin) s += `<g${orez ? ` clip-path="url(#${orez})"` : ""}><g transform="translate(${f(stin[0])} ${f(stin[1])})" stroke="#120804"><use href="#${id}" stroke-width="${f(w * 2.4)}" stroke-opacity="0.08"/><use href="#${id}" stroke-width="${f(w * 1.1)}" stroke-opacity="0.16"/></g></g>`;
  s += `<use href="#${id}" stroke="#5E160B" stroke-width="${f(w + 1.6)}"/><use href="#${id}" stroke="#B84A2B" stroke-width="${f(w)}"/>`;
  s += `<use href="#${id}" transform="translate(${f(-w * 0.06)} ${f(-w * 0.2)})" stroke="#F09A7A" stroke-opacity="0.5" stroke-width="${f(Math.max(0.8, w * 0.2))}"/>`;
  s += `<path class="ko-provaz-zkrut" d="${zkrut}" stroke="#FBF7EE" opacity="0.92" fill="none" stroke-width="${f(w * 0.34)}" stroke-linecap="round"/>`;
  return s;
}

/** Přední půlotáčky šňůry kolem válce (sloupu nebo trámu) od yA k yB; směr 1 = zleva doprava */
function ovin(x: number, rr: number, yA: number, yB: number, w: number, krok: number, smer = 1) {
  const H = Math.abs(yB - yA);
  const n = Math.max(1, Math.round(H / krok));
  const p = H / n;
  const kusy: { B: Bod[]; n: number }[] = [];
  for (let k = 0; k < n; k++) {
    const ya = Math.min(yA, yB) + p * k;
    kusy.push({ B: vzorek((t) => [x + smer * rr * Math.sin(-Math.PI / 2 + Math.PI * t), ya + p * 0.5 * t], 6), n: 6 });
  }
  const y1 = Math.min(yA, yB) - w, y2 = Math.max(yA, yB) + p * 0.5 + w;
  return { kusy, valec: `<rect x="${f(x - rr - w * 0.5)}" y="${f(y1)}" width="${f(2 * rr + w)}" height="${f(y2 - y1)}" fill="url(#ko-em-valec)"/>` };
}

/** Celá šňůra stojanu: po trámech, úvazky, omotávky kolem sloupů a konce u kotev */
function snuraStojanu(r: Rozvrh) {
  const { q, girlandy, kotvy, p } = r;
  const w = q.w;
  const [sl, sp] = q.sloupy;
  const rr = q.sw / 2 + w * 0.1;
  const konecL = sl - q.sw / 2 - q.presah, konecP = sp + q.sw / 2 + q.presah;
  const hlavni: { B: Bod[] }[] = [];
  const ovinuti: { B: Bod[]; n: number }[] = [];
  let valce = "";
  girlandy.forEach((g, gi) => {
    /* body po trámu: pole mezi úvazky jsou paraboly */
    const B: Bod[] = [];
    for (let i = 0; i < g.uvazky.length - 1; i++) {
      const a = g.uvazky[i], b = g.uvazky[i + 1];
      const n = Math.max(5, Math.round((b - a) / 16));
      for (let k = i ? 1 : 0; k <= n; k++) {
        const t = k / n;
        B.push([lerp(a, b, t), g.y + g.prohyby[i] * 4 * t * (1 - t)]);
      }
    }
    /* přes čelo sloupů na obou koncích; první řada začíná u kotvy vstupu, poslední končí na konci trámu */
    B.unshift([sl - q.sw / 2 - w * 0.2, g.y]);
    B.push([sp + q.sw / 2 + w * 0.2, g.y]);
    if (gi === 0) B.unshift(kotvy.vstup);
    if (gi === girlandy.length - 1) {
      const konec = g.smer === 1 ? konecP - w * 0.9 : konecL + w * 0.9;
      if (g.smer === 1) B.push([konec, g.y]);
      else B.unshift([konec, g.y]);
    }
    hlavni.push({ B });
    /* úvazky kolem trámu: dvě otáčky přes čelo */
    const yT = g.y - w * 0.5 - q.tl;
    g.uvazky.slice(1, -1).forEach((x) => ovinuti.push(...ovin(x, w * 0.9, yT - w * 0.3, g.y + w * 0.2, w, q.tl + w * 2).kusy));
    /* omotávka kolem sloupu dolů do další řady */
    const dalsi = girlandy[gi + 1];
    if (dalsi) {
      const o = ovin(g.smer === 1 ? sp : sl, rr, g.y, dalsi.y - w * 0.6, w, Math.max(w * 4, q.sw * 0.9), g.smer === 1 ? -1 : 1);
      ovinuti.push(...o.kusy);
      valce += o.valec;
    }
  });
  /* konec: z konce posledního trámu šňůra spadne dolů ke kotvě výstupu (přes konec trámu dvě otáčky) */
  const gk = girlandy[girlandy.length - 1];
  const kx = gk.smer === 1 ? konecP - w * 0.9 : konecL + w * 0.9;
  const [vx, vy] = kotvy.vystup;
  hlavni.push({ B: vzorek(kvadr([kx - gk.smer * w * 2, gk.y], [vx, gk.y + w * 0.4], [vx, vy]), 8) });
  ovinuti.push(...ovin(kx - gk.smer * w * 2.6, w * 0.9 + 1, gk.y - w * 0.5 - q.tl - w * 0.2, gk.y + w * 0.2, w, (q.tl + w) / 2).kusy);
  /* omotávka kolem levého sloupu u vstupu */
  const g0 = girlandy[0];
  const o = ovin(sl, rr, g0.y - w * 1.6, g0.y + w * 0.4, w, w * 1.1);
  ovinuti.push(...o.kusy);
  valce += o.valec;
  return snura(hlavni, w, `ko-em-${p}-snura`, [w * 1.3, w * 2.4], `ko-em-${p}-zed`) + snura(ovinuti, w, `ko-em-${p}-ovin`, null) + valce;
}

/** Stěna starých destiček za sloupy: tmavé fošny, lišty a pásy destiček ve dvou plánech */
function stena(r: Rozvrh) {
  const { q, p } = r;
  const [sl, sp] = q.sloupy;
  const x0 = sl + q.sw / 2, x1 = sp - q.sw / 2;
  const { y0, y1, krok, s3, s2 } = q.zed;
  const obd = `x="${f(x0)}" y="${f(y0)}" width="${f(x1 - x0)}" height="${f(y1 - y0)}"`;
  let s = `<clipPath id="ko-em-${p}-zed"><rect ${obd}/></clipPath><g clip-path="url(#ko-em-${p}-zed)"><rect ${obd} fill="url(#ko-em-zed)"/>`;
  const R = nahoda(6100 + q.W);
  const pasyZ = ["ko-em-pa", "ko-em-pb"], pasyP = ["ko-em-pc", "ko-em-pd"];
  /* zadní plán: hustě, menší a v hlubším stínu */
  let lis = "", rady = "", i = 0;
  for (let y = y0 + 4; y < y1 - 20 * s3; y += krok, i++) {
    lis += `M${P(x0, y - 2)}h${f(x1 - x0)}`;
    rady += `<use href="#${pasyZ[i % 2]}" transform="translate(${Math.round(x0 - 20 - R() * 140 * s3)} ${Math.round(y)}) scale(${f(s3)})"/>`;
  }
  s += `<path d="${lis}" stroke="#1A100A" stroke-width="${f(Math.max(2, 4 * s3))}"/>${rady}<rect ${obd} fill="#160C06" opacity="0.5"/>`;
  /* přední plán: řidčeji, větší, posunutý o půl řady */
  rady = "";
  i = 0;
  for (let y = y0 + 4 + krok * 0.5; y < y1 - 30 * s2; y += krok, i++) rady += `<use href="#${pasyP[i % 2]}" transform="translate(${Math.round(x0 - 30 - R() * 140 * s2)} ${Math.round(y)}) scale(${f(s2)})"/>`;
  /* stín pod střechou: nahoře tma, dolů slábne */
  s += `${rady}<rect ${obd} fill="#1E1008" opacity="0.26"/><rect x="${f(x0)}" y="${f(y0)}" width="${f(x1 - x0)}" height="${f((y1 - y0) * 0.5)}" fill="url(#ko-em-stin-okap)"/></g>`;
  return s;
}

/** Police u paty: kamenná podezdívka, prkno a na něm štůsek prázdných destiček, kalamář a štětec */
function police(r: Rozvrh) {
  const { q, H, W, kami } = r;
  const m = q.m;
  const [sl, sp] = q.sloupy;
  const x0 = sl + q.sw / 2, x1 = sp - q.sw / 2;
  const yP = q.police;
  const tl = Math.max(4, 10 * m);
  /* podezdívka z tesaných kamenů */
  const kh = (H - yP - tl) * 0.62;
  const ky = H - kh;
  let s = `<rect x="${f(x0)}" y="${f(ky)}" width="${f(x1 - x0)}" height="${f(kh)}" fill="url(#ko-em-kamen)"/>`;
  let spary = `M${P(x0, ky + kh * 0.5)} H${f(x1)}`;
  const R = nahoda(7100 + W);
  for (let x = x0 + 30 * m; x < x1; x += (70 + R() * 40) * Math.max(0.5, m)) spary += `M${P(x, ky)} v${f(kh * 0.5)}`;
  for (let x = x0 + 60 * m; x < x1; x += (70 + R() * 40) * Math.max(0.5, m)) spary += `M${P(x, ky + kh * 0.5)} v${f(kh * 0.5)}`;
  s += `<path d="${spary}" stroke="#6E6A62" stroke-width="${f(1.2 * m + 0.4)}" opacity="0.7"/>`;
  s += `<path d="M${P(x0, ky + 1)} H${f(x1)}" stroke="#E8E4DA" stroke-width="${f(1.4 * m + 0.4)}" opacity="0.7"/>`;
  /* nožky a prkno police */
  s += `<path d="${[x0 + 40 * m, (x0 + x1) / 2, x1 - 40 * m].map((x) => `M${P(x - 5 * m, yP + tl)}h${f(10 * m)}V${f(ky)}h${f(-10 * m)}Z`).join("")}" fill="#5E3822"/>`;
  s += `<rect x="${f(x0 - 6 * m)}" y="${f(yP)}" width="${f(x1 - x0 + 12 * m)}" height="${f(tl)}" rx="${f(2 * m)}" fill="url(#ko-em-tram)"/>`;
  s += `<path d="M${P(x0 - 5 * m, yP + 1)} H${f(x1 + 5 * m)}" stroke="#D49A6A" stroke-width="${f(1 * m + 0.4)}" opacity="0.7"/>`;
  if (r.rezim === "uzka") return s;
  /* na polici v největší mezeře mezi partou: štůsek čistých destiček, kalamář suzuri a štětec */
  const xs = kami.map((k) => k.x).sort((a, b) => a - b);
  let cx = (x0 + x1) / 2, nej = 0;
  for (let i = 0; i < xs.length - 1; i++) {
    if (xs[i + 1] - xs[i] > nej && xs[i] > x0 && xs[i + 1] < x1) {
      nej = xs[i + 1] - xs[i];
      cx = (xs[i] + xs[i + 1]) / 2;
    }
  }
  const k = Math.max(0.24, 0.3 * m);
  for (let i = 0; i < 4; i++) s += `<use href="#ko-em-cista" transform="translate(${P(cx - 50 * m + i * 1.4 * m - 100 * k, yP - 176 * k - i * 3.2 * m)}) scale(${f(k * 100) / 100}) rotate(${f((i % 2 ? 1 : -1) * 2.5)} 100 90)"/>`;
  /* kalamář: černý kámen s jezírkem tuše */
  const sx = cx + 24 * m;
  s += `<rect x="${f(sx - 24 * m)}" y="${f(yP - 9 * m)}" width="${f(48 * m)}" height="${f(9 * m)}" rx="${f(3 * m)}" fill="#2A2420"/><ellipse cx="${f(sx - 9 * m)}" cy="${f(yP - 9 * m)}" rx="${f(9 * m)}" ry="${f(2.2 * m)}" fill="#0E0A08"/><path d="M${P(sx - 22 * m, yP - 8 * m)} H${f(sx + 22 * m)}" stroke="#6E625A" stroke-width="${f(0.8 * m + 0.2)}"/>`;
  /* štětec na podložce */
  s += `<g transform="translate(${P(sx + 30 * m, yP - 3 * m)}) rotate(-8)"><rect x="0" y="${f(-2.4 * m)}" width="${f(54 * m)}" height="${f(4.8 * m)}" rx="${f(2.4 * m)}" fill="#A87A44"/><rect x="${f(38 * m)}" y="${f(-2.6 * m)}" width="${f(5 * m)}" height="${f(5.2 * m)}" fill="#2A2420"/><path d="M0 0 Q${f(-10 * m)} ${f(-4 * m)} ${f(-18 * m)} 0 Q${f(-10 * m)} ${f(4 * m)} 0 0 Z" fill="#1E1816"/></g>`;
  return s;
}

/** Roční období: sníh, okvětní lístky, listí, světlušky (skupiny svt-jen-*) */
function obdobi(r: Rozvrh) {
  const { q, okap, hreben, W, H, girlandy } = r;
  const s = q.strecha;
  const m = q.m;
  const R = nahoda(8800 + W);
  /* zima: čepice sněhu na střeše a hřebeni, lem na trámech, rampouchy */
  const N = 36;
  const xs = Array.from({ length: N + 1 }, (_, i) => lerp(s.x0 + 14 * m, s.x1 - 14 * m, i / N));
  const vrch = xs.map((x) => [x, hreben(x) - 3 * m] as Bod);
  const dole = xs.map((x) => [x, lerp(hreben(x), okap(x), 0.42 + Math.sin(x * 0.05) * 0.06)] as Bod);
  let ramp = "";
  for (let x = s.x0 + 30; x < s.x1 - 30; x += (40 + R() * 70) * Math.max(0.5, m)) {
    const y = okap(x) + 11 * m + 2;
    ramp += `M${P(x - 2 * m, y)} L${P(x, y + (8 + R() * 16) * m + 2)} L${P(x + 2 * m, y)} Z`;
  }
  const [sl, sp] = q.sloupy;
  let lemy = `M${xs.map((x) => P(x, okap(x) - 2 * m)).join("L")}`;
  girlandy.forEach((g) => {
    const yT = g.y - q.w * 0.5 - q.tl;
    lemy += `M${P(sl - q.sw / 2 - q.presah + 4, yT)} Q${P(W / 2, yT - 5 * m - 1)} ${P(sp + q.sw / 2 + q.presah - 4, yT)}`;
  });
  lemy += `M${P(r.plaketa.x + 4, r.plaketa.y)} H${f(r.plaketa.x + r.plaketa.w - 4)}M${P(sl + q.sw / 2, q.police)} H${f(sp - q.sw / 2)}`;
  r.lucerny.forEach((l) => (lemy += `M${P(l.x - 24 * l.m, l.y + 33 * l.m)} Q${P(l.x, l.y + 20 * l.m)} ${P(l.x + 24 * l.m, l.y + 33 * l.m)}`));
  const zima = `<path d="${lomena([...vrch, ...dole.reverse()])}" fill="#F7FAFD"/><path d="${ramp}" fill="#E6F1F8" opacity="0.9"/><path d="${lemy}" stroke="#F7FAFD" stroke-width="${f(4 * m + 1.5)}" fill="none" stroke-linecap="round"/>`;
  /* jaro: okvětní lístky sakury na střeše, trámech a ve vzduchu */
  let jaro = "";
  for (let i = 0; i < 13; i++) {
    const x = lerp(s.x0 + 20, s.x1 - 20, R());
    const y = R() < 0.4 ? lerp(hreben(x) + 10, okap(x) - 6, R()) : lerp(okap(x) + 30, H - 10, R());
    jaro += `<use href="#ko-em-listek${i % 2}" transform="translate(${P(x, y)}) rotate(${Math.round(R() * 360)}) scale(${f((1.1 + R() * 0.8) * Math.max(0.55, m))})"/>`;
  }
  /* podzim: listí ginkga a javoru na střeše a dole u paty */
  let podzim = "";
  for (let i = 0; i < 11; i++) {
    const x = lerp(s.x0 + 20, s.x1 - 20, R());
    const y = R() < 0.6 ? lerp(hreben(x) + 14, okap(x) - 4, R()) : lerp(H - 30 * m, H - 4, R());
    podzim += `<use href="#ko-em-${R() < 0.55 ? "ginkgo" : "javor"}${i % 2}" transform="translate(${P(x, y)}) rotate(${Math.round(R() * 360)}) scale(${f((1.1 + R() * 0.7) * Math.max(0.55, m))})"/>`;
  }
  /* předjaří: zbytky sněhu na střeše */
  let predjari = "";
  for (let i = 0; i < 7; i++) {
    const x = lerp(s.x0 + 60, s.x1 - 60, (i + R() * 0.7) / 7);
    const y = lerp(hreben(x) + 14 * m, okap(x) - 10 * m, R());
    predjari += `<ellipse class="svt-snih-skvrny" cx="${f(x)}" cy="${f(y)}" rx="${f((16 + R() * 26) * m + 4)}" ry="${f((3 + R() * 3) * m + 1)}"/>`;
  }
  /* léto: světlušky v noci kolem stojanu (jen pár měkkých záblesků) */
  let leto = "";
  for (let i = 0; i < 7; i++) {
    const x = lerp(30, W - 30, R());
    const y = lerp(q.police - 160 * m, H + 10, R());
    leto += `<use href="#ko-em-muska" transform="translate(${P(x, y)}) scale(${f((10 + R() * 8) * Math.max(0.5, m) / 10)})"/>`;
  }
  return `<g class="svt-jen-zima">${kompakt(zima, 1)}</g><g class="svt-jen-jaro">${jaro}</g><g class="svt-jen-podzim">${podzim}</g><g class="svt-jen-predjari">${predjari}</g><g class="svt-jen-leto"><g class="ko-ema-svetlusky">${leto}</g></g>`;
}

/** Obrys toho, co je na stojanu nakreslené (bez washi) — pro noční tónování a denní světlo zleva */
function silueta(r: Rozvrh) {
  const { q, okap, hreben, H, W } = r;
  const s = q.strecha;
  const m = q.m;
  const N = 24;
  const xs = Array.from({ length: N + 1 }, (_, i) => lerp(s.x0, s.x1, i / N));
  const obd = (x: number, y: number, w: number, h: number) => `M${P(x, y)}h${f(w)}v${f(h)}h${f(-w)}Z`;
  /* střecha od hřebene po spodek krokví, štít a plechy na koncích hřebene */
  let d = lomena([...xs.map((x) => [x, hreben(x)] as Bod), ...xs.slice().reverse().map((x) => [x, okap(x) + (q.keta - s.okap) + 6] as Bod)]);
  d += `M${P(W / 2, q.stit.vrch - 4)} L${P(W / 2 + q.stit.pul + 8, okap(W / 2 + q.stit.pul) + 6)} L${P(W / 2 - q.stit.pul - 8, okap(W / 2 - q.stit.pul) + 6)} Z`;
  for (const x of [s.x0, s.x1]) d += obd(x - (x < W / 2 ? -2 : 52 * m + 8), hreben(x) - 30 * m - 3, 50 * m + 6, 32 * m + 4);
  /* mezi sloupy od vaznice po zem, sloupy s patkami, trámy s konci */
  const [sl, sp] = q.sloupy;
  d += obd(sl, q.keta, sp - sl, H - q.keta);
  for (const x of q.sloupy) d += obd(x - q.sw / 2 - 1.5, q.keta, q.sw + 3, H - q.keta) + obd(x - q.sw * 0.85, H - q.sw * 0.62, q.sw * 1.7, q.sw * 0.62);
  d += obd(sl - q.sw / 2 - q.presah * 0.8, q.hlava, sp - sl + q.sw + q.presah * 1.6, q.tl + 2 * m);
  r.girlandy.forEach((g) => (d += obd(sl - q.sw / 2 - q.presah, g.y - q.w * 0.5 - q.tl, sp - sl + q.sw + q.presah * 2, q.tl + q.w)));
  /* lucerny a zvonec s provazem */
  r.lucerny.forEach((l) => (d += obd(l.x - 30 * l.m, l.y, 60 * l.m, 112 * l.m)));
  const z = q.zvonec;
  d += obd(z.x - 30 * z.m, okap(z.x), 60 * z.m, 70 * z.m) + obd(z.x - 10.5 * z.m, okap(z.x) + 60 * z.m, 21 * z.m, z.konec - 18 * z.m - okap(z.x) - 60 * z.m) + obd(z.x - 13 * z.m, z.konec - 24 * z.m, 26 * z.m, 50 * z.m);
  return d;
}

/**
 * Kresba stojanu pro jeden režim — vnitřek <svg class="ko-ema-v …" viewBox="0 0 W H">.
 * Vše pod zemí (stín, kousek patek) přečnívá dolů (overflow: visible).
 * Hrubé kusy (střecha, sloupy, stěna, police) jsou na celé jednotky, jemné na desetiny.
 */
export function stojan(r: Rozvrh): string {
  const { q, W, H, p } = r;
  const [sl, sp] = q.sloupy;
  const m = q.m;
  let hrube = `<defs>${vzory(r)}</defs>`;
  /* stín na trávě (světlo zleva shora) */
  hrube += `<ellipse cx="${f(W / 2 + 40 * m)}" cy="${f(H + 4)}" rx="${f((sp - sl) / 2 + 120 * m)}" ry="${f(26 * m + 6)}" fill="url(#ko-em-stin-zem)"/>`;
  hrube += stena(r);
  /* trámy řad (za sloupy) a stín, který vrhají na stěnu */
  r.girlandy.forEach((g) => {
    const yT = g.y - q.w * 0.5 - q.tl;
    hrube += `<rect x="${f(sl)}" y="${f(yT + q.tl)}" width="${f(sp - sl)}" height="${f(q.tl * 0.9)}" fill="#120804" opacity="0.3"/>`;
    hrube += tram(sl - q.sw / 2 - q.presah, sp + q.sw / 2 + q.presah, yT, q.tl, m);
  });
  /* sloupy, hlavní trám, vaznice pod krokvemi a konzoly na sloupech */
  const yTop = q.keta + 10 * m;
  hrube += sloup(r, sl, yTop) + sloup(r, sp, yTop);
  hrube += tram(sl - q.sw / 2 - q.presah * 0.8, sp + q.sw / 2 + q.presah * 0.8, q.hlava, q.tl + 2 * m, m);
  hrube += `<rect x="${f(q.strecha.x0 + 30 * m)}" y="${f(q.keta - 2)}" width="${f(q.strecha.x1 - q.strecha.x0 - 60 * m)}" height="${f(12 * m + 2)}" fill="#4A2C1C"/>`;
  hrube += konzola(sl, q.keta, yTop + 14 * m, q.sw) + konzola(sp, q.keta, yTop + 14 * m, q.sw);
  hrube += strecha(r);
  let s = kompakt(hrube, 1);
  /* štít, deska, šimenawa s klikaticemi a střapci (mimo washi a lucerny), lucerny */
  let jemne = stit(r) + plaketa(r) + simenawa(r);
  const sk = f(m * 100) / 100;
  jemne += r.visi.map((v, i) => `<use href="#ko-em-${v.typ === "strapec" ? "strapec" : i % 4 ? "shide-p" : "shide-l"}" transform="translate(${P(v.x, v.y)}) scale(${sk})"/>`).join("");
  jemne += r.lucerny.map((l) => `<use href="#ko-em-lucerna" transform="translate(${P(l.x, l.y)}) scale(${f(l.m * 100) / 100})"/>`).join("");
  /* šňůra kōhaku: stíny, úseky a omotávky */
  jemne += snuraStojanu(r);
  s += kompakt(jemne, 10);
  /* police u paty, zvonec a roční období */
  s += kompakt(police(r), 1) + kompakt(zvonec(r), 10) + obdobi(r);
  /* noc: tónování stojanu, pak washi (o něco světlejší) a záře luceren nad tím */
  s += kompakt(`<defs><path id="ko-em-${p}-obrys" d="${silueta(r)}"/></defs><use href="#ko-em-${p}-obrys" fill="url(#ko-em-den)"/><use class="ko-ema-noc" href="#ko-em-${p}-obrys" fill="#0E1124" opacity="0"/>`, 1);
  s += kompakt(washi(r), 10);
  s += `<g class="ko-ema-zare">${r.lucerny.map((l) => `<use href="#ko-em-lucerna-svetlo" transform="translate(${P(l.x, l.y)}) scale(${f(l.m * 100) / 100})"/>`).join("")}</g>`;
  return `<g class="ko-ema-${p}">${s}</g>`;
}

/* ═══ Popředí: tráva přes paty a nohy party, sloup přes toho, kdo se schovává ═══ */

function trs(x: number, y: number, sirka: number, vyska: number, n: number, seed: number, po: Map<string, string>) {
  const R = nahoda(seed);
  const tridy = ["svt-trava-1", "svt-trava-2", "svt-trava-3", "ko-trava-sucha"];
  for (let j = 0; j < n; j++) {
    const bx = x + (R() - 0.5) * sirka;
    const by = y + R() * vyska * 0.18;
    const h = vyska * (0.5 + R() * 0.5);
    const bw = 2.2 + R() * 2.6 * (vyska / 30);
    const l = (R() - 0.4) * h * 0.6;
    const d = `M${P(bx - bw / 2, by)}Q${P(bx + l * 0.35, by - h * 0.6)} ${P(bx + l, by - h)}Q${P(bx + l * 0.45, by - h * 0.55)} ${P(bx + bw / 2, by)}Z`;
    const t = tridy[Math.floor(R() * tridy.length)];
    po.set(t, (po.get(t) ?? "") + d);
  }
}

/**
 * Kus sloupu přes toho, kdo kouká zpoza něj (Bublinka) — vlastní vrstva nad partou,
 * v noci tónovaná stejně jako stojan (ko-ema-noc), ať navazuje na sloup za ní.
 */
export function sloupek(r: Rozvrh): string {
  const { q, H, kami, schovka } = r;
  if (!schovka) return "";
  const k = kami[schovka.i];
  const x = q.sloupy[schovka.sloup];
  const od = k.y - k.v * 0.95;
  const w = q.sw;
  const tmava = `M${P(x - w / 2 - 1.5, od)}h${f(w + 3)}V${f(H - w * 0.62)}h${f(w * 0.35)}V${f(H)}h${f(-w * 1.7)}V${f(H - w * 0.62)}h${f(w * 0.35)}Z`;
  return kompakt(sloup(r, x, q.keta + 10 * q.m, od, H + 2) + `<path class="ko-ema-noc" d="${tmava}" fill="#0E1124" opacity="0"/>`, 1);
}

export function popredi(r: Rozvrh): string {
  const { q, H, W, kami } = r;
  const m = q.m;
  let s = "";
  /* trsy u pat sloupů, kolem nohou party a podél podezdívky */
  const po = new Map<string, string>();
  q.sloupy.forEach((x, i) => trs(x, H + 2, q.sw * 2.4, 26 * Math.max(0.6, m), 7, 400 + i, po));
  kami.forEach((k, i) => trs(k.x, k.y + 3, k.v * 0.62, Math.max(12, k.v * 0.2), 6, 500 + i, po));
  for (let x = q.sloupy[0] + 60 * m; x < q.sloupy[1] - 40 * m; x += 160 * Math.max(0.5, m)) trs(x, H + 4, 50 * m + 10, 20 * Math.max(0.6, m), 5, 600 + Math.round(x), po);
  s += kompakt([...po].map(([t, d]) => `<path class="${t}" d="${d}"/>`).join(""), 1);
  /* roční období u země */
  const R = nahoda(9900 + W);
  let zima = "", podzim = "", jaro = "";
  q.sloupy.forEach((x) => (zima += `<path d="M${P(x - q.sw * 1.05, H + 3)} Q${P(x - q.sw * 0.5, H - q.sw * 0.3)} ${P(x, H - q.sw * 0.26)} Q${P(x + q.sw * 0.6, H - q.sw * 0.3)} ${P(x + q.sw * 1.2, H + 3)} Z"/>`));
  for (let i = 0; i < 9; i++) {
    const x = lerp(10, W - 10, (i + R()) / 9);
    podzim += `<use href="#ko-em-ginkgo${i % 2}" transform="translate(${P(x, H + 6)}) rotate(${Math.round(R() * 360)}) scale(${f(Math.max(0.6, m) * 1.4)})"/>`;
    jaro += `<use href="#ko-em-listek${i % 2}" transform="translate(${P(x + 14, H + 6)}) rotate(${Math.round(R() * 180)}) scale(${f(Math.max(0.6, m) * 1.3)})"/>`;
  }
  s += `<g class="svt-jen-zima" fill="#F7FAFD">${kompakt(zima, 1)}</g><g class="svt-jen-podzim">${podzim}</g><g class="svt-jen-jaro">${jaro}</g>`;
  return s;
}

/* ═══ Destičky party: malby líce a rubu ═══ */

/** Kami namalovaný na líci: rám 180 se nohama postaví na `zem` */
const kamiNaDesce = (id: PostavaId, x: number, zem: number, v: number, zrcadlo = false) => {
  const k = v / 180;
  const y = zem - PATA[id] * v;
  return `<g transform="translate(${P(x - v / 2, y)}) scale(${f(k * 1000) / 1000})">${zrcadlo ? `<g transform="translate(180 0) scale(-1 1)"><use href="#ko-k-${id}"/></g>` : `<use href="#ko-k-${id}"/>`}</g>`;
};

/** Kvítek sakury ze zásoby (`b` = světlý) */
const kvet = (x: number, y: number, k: number, svetly = false) => `<use href="#ko-em-kvet${svetly ? "-b" : ""}" transform="translate(${P(x, y)}) scale(${f(k)})"/>`;

const ZEM_LICE = 124;

/** Malby líce podle toho, kdo odpovídá; `kapka2` je Kapčina druhá destička (kafe) */
const MALBY: Record<string, () => string> = {
  /* Vázička: rozevřený vějíř za zády, sakura v rozích */
  vazicka: () => {
    const cx = 100, cy = 128, r0 = 30, r1 = 82;
    const dily = ["", ""];
    let zebra = "";
    const n = 12;
    const b = (a: number, r: number) => P(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    for (let i = 0; i < n; i++) {
      const a0 = Math.PI * (1.08 + (0.84 * i) / n), a1 = Math.PI * (1.08 + (0.84 * (i + 1)) / n);
      dily[i % 2] += `M${b(a0, r0)} L${b(a0, r1)} A${r1} ${r1} 0 0 1 ${b(a1, r1)} L${b(a1, r0)} A${r0} ${r0} 0 0 0 ${b(a0, r0)} Z`;
      zebra += `M${b(a0, r0 - 4)} L${b(a0, r1)}`;
    }
    let vejir = `<path d="${dily[0]}" fill="#C4432B"/><path d="${dily[1]}" fill="#E9B94C"/><path d="${zebra}" stroke="#5A3622" stroke-width="1.2"/>`;
    vejir += `<path d="M${P(cx + Math.cos(Math.PI * 1.08) * r1, cy + Math.sin(Math.PI * 1.08) * r1)} A${r1} ${r1} 0 0 1 ${P(cx + Math.cos(Math.PI * 1.92) * r1, cy + Math.sin(Math.PI * 1.92) * r1)}" stroke="#5A3622" stroke-width="1.6" fill="none"/>`;
    vejir += `<g fill="none" stroke="#F6E2A8" stroke-width="1.4" opacity="0.8"><path d="M58 92 q8 -10 16 0 q8 -10 16 0"/><path d="M110 70 q8 -10 16 0 q8 -10 16 0"/></g>`;
    return `<circle cx="100" cy="92" r="64" fill="#F6DFB2" opacity="0.7"/>${vejir}
      <path d="M8 42 C22 50 34 58 44 74 M24 52 C26 44 32 40 38 40" stroke="#5A3622" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      ${kvet(38, 40, 0.9)}${kvet(46, 72, 1)}${kvet(20, 56, 0.8)}${kvet(168, 64, 0.9)}${kvet(184, 82, 0.75, true)}${kvet(158, 96, 0.7)}`;
  },
  /* Šamotka: hora v dálce, police s miskami a žár pece */
  samotka: () => `<path d="M-4 124 L60 62 Q74 50 88 62 L150 124 Z" fill="#9FB0C8"/><path d="M60 62 Q74 50 88 62 L96 70 L88 68 L82 74 L74 66 L66 74 L60 68 L52 70 Z" fill="#F4F2EC"/>
      <path d="M98 124 L150 84 Q160 76 170 84 L214 124 Z" fill="#B7C3D4"/>
      <rect x="0" y="86" width="200" height="40" fill="url(#ko-em-dolu)" opacity="0.8"/>
      <rect x="132" y="62" width="58" height="5" rx="1.5" fill="#8A6438"/><rect x="10" y="78" width="54" height="5" rx="1.5" fill="#8A6438"/>
      <path d="M140 62 q2 -10 10 -10 q8 0 10 10 Z M164 62 q2 -12 12 -12 q10 0 12 12 Z" fill="#7FA89A" stroke="#4E6E62" stroke-width="1"/>
      <path d="M16 78 q1 -9 9 -9 q8 0 9 9 Z M38 78 q2 -11 11 -11 q9 0 11 11 Z" fill="#C98A5A" stroke="#7A4A2E" stroke-width="1"/>
      <path d="M150 50 q-3 -6 1 -11 M176 48 q-3 -6 1 -11" stroke="#B9A894" stroke-width="1.2" fill="none" stroke-linecap="round"/>`,
  /* Kachlík: šachovnice ichimatsu a dřevěné pravítko s úhelníkem */
  kachlik: () => {
    let sach = "";
    const k = 16;
    for (let y = 20; y < 116; y += k) for (let x = 4; x < 196; x += k) if (((x - 4) / k + (y - 20) / k) % 2 === 0) sach += `M${x} ${y}h${k}v${Math.min(k, 116 - y)}h${-k}Z`;
    return `<rect x="0" y="20" width="200" height="96" fill="#EFE4C8"/><path d="${sach}" fill="#2F4A72" opacity="0.88"/>
      <rect x="0" y="84" width="200" height="34" fill="url(#ko-em-dolu)"/>
      <g transform="translate(150 54) rotate(14)"><path d="M0 0 L36 0 L0 52 Z" fill="#E9C27A" stroke="#7A5418" stroke-width="1.2"/><path d="M8 12 L18 12 L8 27 Z" fill="#EFE4C8" stroke="#7A5418" stroke-width="0.8"/>${[6, 12, 18, 24, 30].map((x) => `<path d="M${x} 0 v4" stroke="#7A5418" stroke-width="0.8"/>`).join("")}</g>
      <g transform="translate(16 98) rotate(-6)"><rect width="56" height="9" fill="#D9A55C" stroke="#7A5418" stroke-width="1"/>${[6, 12, 18, 24, 30, 36, 42, 48].map((x) => `<path d="M${x} 0 v${x % 12 ? 3 : 5}" stroke="#7A5418" stroke-width="0.8"/>`).join("")}</g>`;
  },
  /* Kapka (dítě): kruhy na vodě, vlnky seigaiha a malá kapička vedle ní */
  kapka: () => {
    const vlny = `<rect x="0" y="104" width="200" height="22" fill="url(#ko-em-seigaiha-k)"/>`;
    return `<rect x="0" y="20" width="200" height="104" fill="#CFE2F2" opacity="0.75"/>
      ${[0, 1, 2].map((i) => `<ellipse cx="100" cy="118" rx="${40 + i * 24}" ry="${7 + i * 4}" fill="none" stroke="#6E9CC8" stroke-width="1.6" opacity="${0.8 - i * 0.2}"/>`).join("")}
      ${vlny}
      ${[[30, 48], [56, 34], [150, 40], [172, 60], [134, 66]].map(([x, y]) => `<path d="M${x} ${y - 7} C${x + 4} ${y - 1} ${x + 5} ${y + 2} ${x} ${y + 4} C${x - 5} ${y + 2} ${x - 4} ${y - 1} ${x} ${y - 7} Z" fill="#7FB0DC"/>`).join("")}
      <g transform="translate(146 92)"><path d="M0 -20 C9 -8 12 -2 12 5 C12 13 6 18 0 18 C-6 18 -12 13 -12 5 C-12 -2 -9 -8 0 -20 Z" fill="#8EC0EA" stroke="#4E7EB0" stroke-width="1.2"/><circle cx="-4" cy="4" r="1.6" fill="#2B2420"/><circle cx="4" cy="4" r="1.6" fill="#2B2420"/><path d="M-3 9 Q0 11 3 9" stroke="#2B2420" stroke-width="1" fill="none"/><ellipse cx="-4" cy="-6" rx="2.4" ry="4" fill="#FFFFFF" opacity="0.6" transform="rotate(20 -4 -6)"/></g>`;
  },
  /* Kapka (kafe): velký hrnek s kávou, pára a zrnka */
  kapka2: () => `<rect x="0" y="20" width="200" height="104" fill="#F0DCC0" opacity="0.7"/>
      <ellipse cx="146" cy="118" rx="44" ry="7" fill="#8A5A34" opacity="0.4"/>
      <path d="M110 74 L118 118 Q146 126 174 118 L182 74 Z" fill="#E9E2D6" stroke="#6E5A48" stroke-width="1.4"/>
      <path d="M182 82 C196 82 198 104 180 108" stroke="#6E5A48" stroke-width="4" fill="none"/>
      <ellipse cx="146" cy="74" rx="36" ry="7.5" fill="#5A3420" stroke="#6E5A48" stroke-width="1.4"/>
      <ellipse cx="146" cy="74" rx="20" ry="3.6" fill="none" stroke="#C99A6A" stroke-width="1.2"/><ellipse cx="146" cy="74" rx="9" ry="1.6" fill="none" stroke="#C99A6A" stroke-width="1"/>
      <path d="M116 92 Q146 98 176 92" stroke="#3E6EA8" stroke-width="3.4" fill="none"/>
      <path d="M134 60 C128 50 140 44 134 32 M152 58 C146 48 158 42 152 30" stroke="#B9A894" stroke-width="2.4" fill="none" stroke-linecap="round" opacity="0.8"/>
      ${[[24, 112, 20], [44, 118, -30], [14, 96, 60], [88, 116, 10]].map(([x, y, a]) => `<g transform="translate(${x} ${y}) rotate(${a})"><ellipse rx="6" ry="4.2" fill="#6E4428"/><path d="M-5 0 Q0 2 5 0" stroke="#3B2414" stroke-width="1" fill="none"/></g>`).join("")}`,
  /* Střípek: lakovaná tma se zlatými žilkami kintsugi */
  stripek: () => {
    const R = nahoda(77);
    let zily = "";
    const vetev = (x: number, y: number, a: number, d: number, w: number, hl: number) => {
      let px = x, py = y;
      let dd = `M${P(px, py)}`;
      for (let i = 0; i < 4; i++) {
        a += (R() - 0.5) * 0.9;
        px += (Math.cos(a) * d) / 4;
        py += (Math.sin(a) * d) / 4;
        dd += `L${P(px, py)}`;
        if (hl > 0 && R() < 0.34) vetev(px, py, a + (R() < 0.5 ? 0.8 : -0.8), d * 0.5, w * 0.6, hl - 1);
      }
      zily += `<path d="${dd}" stroke-width="${f(w)}"/>`;
    };
    vetev(8, 40, 0.3, 90, 3, 2);
    vetev(196, 64, Math.PI + 0.2, 80, 2.6, 2);
    vetev(100, 22, Math.PI / 2 + 0.3, 60, 2.2, 1);
    return `<rect x="0" y="20" width="200" height="104" fill="#2A2632"/>
      <ellipse cx="100" cy="96" rx="80" ry="54" fill="url(#ko-em-zlata-zare)"/>
      <g stroke="#E2B850" fill="none" stroke-linejoin="round" stroke-linecap="round">${zily}</g>
      <rect x="0" y="112" width="200" height="14" fill="#2A2632"/><path d="M0 112 H200" stroke="#E2B850" stroke-width="1.4"/>`;
  },
  /* Hlínka: větvička sakury nad ní, padající lístky a hrouda hlíny */
  hlinka: () => `<rect x="0" y="20" width="200" height="104" fill="#FBE6EA" opacity="0.8"/>
      <path d="M196 30 C160 40 130 36 100 52 C80 62 62 60 40 70" stroke="#5A3622" stroke-width="3.2" fill="none" stroke-linecap="round"/>
      <path d="M150 38 C146 48 148 56 152 62 M118 46 C122 36 130 30 140 28" stroke="#5A3622" stroke-width="2" fill="none" stroke-linecap="round"/>
      ${kvet(150, 62, 1.1)}${kvet(140, 28, 1)}${kvet(100, 52, 1.2)}${kvet(66, 62, 0.9, true)}${kvet(40, 70, 1)}${kvet(176, 36, 0.9, true)}${kvet(122, 44, 0.7)}
      ${[[30, 96, 30], [176, 88, 120], [60, 106, 200], [150, 104, 60]].map(([x, y, a]) => `<path d="M${x} ${y} c2 -3 6 -3 7 0 c-1 3 -5 3 -7 0 Z" fill="#F4B8C4" transform="rotate(${a} ${x} ${y})"/>`).join("")}
      <path d="M44 126 Q60 110 100 110 Q140 110 156 126 Z" fill="#8A6A52"/><path d="M60 116 Q100 108 140 116" stroke="#A88A70" stroke-width="2" fill="none"/>`,
  /* Cedulka: ensó štětcem, proužek papíru a štětec s kapkami tuše */
  cedulka: () => `<path d="M138 42 C168 58 170 104 138 118 C104 132 62 122 50 92 C40 66 62 40 96 36 C110 34 124 36 134 40" stroke="#2B2420" stroke-width="9" fill="none" stroke-linecap="round" opacity="0.88"/>
      <path d="M126 38 C132 40 136 41 140 44" stroke="#2B2420" stroke-width="5" fill="none" stroke-linecap="round" stroke-dasharray="3 2" opacity="0.6"/>
      <g transform="translate(18 34) rotate(-6)"><rect width="22" height="72" fill="#FBF8F0" stroke="#CFC2AA" stroke-width="1"/>${pismo(1, 333, 11, 6, 58).replace('stroke-width="1.5"', 'stroke-width="1.3"')}<rect x="7" y="60" width="8" height="8" fill="none" stroke="#C4432B" stroke-width="1.2"/></g>
      <g transform="translate(150 98) rotate(-36)"><rect x="0" y="-3.4" width="56" height="6.8" rx="3.4" fill="#A87A44"/><rect x="40" y="-3.6" width="6" height="7.2" fill="#2A2420"/><path d="M0 0 Q-12 -5 -22 0 Q-12 5 0 0 Z" fill="#1E1816"/></g>
      ${[[132, 112, 2.6], [124, 118, 1.6], [140, 120, 1.4]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#2B2420"/>`).join("")}`,
  /* Pecinka: plameny karura-en stoupají za ní */
  pecinka: () => {
    const plamen = (x: number, y: number, h: number, w: number, barva: string, smer = 1) =>
      `<path d="M${P(x - w, y)} C${P(x - w, y - h * 0.4)} ${P(x - w * 0.2 * smer, y - h * 0.5)} ${P(x + w * 0.1 * smer, y - h * 0.8)} C${P(x + w * 0.3 * smer, y - h * 0.95)} ${P(x - w * 0.1 * smer, y - h)} ${P(x + w * 0.2 * smer, y - h * 1.08)} C${P(x + w * 0.9 * smer, y - h * 0.8)} ${P(x + w, y - h * 0.4)} ${P(x + w, y)} Z" fill="${barva}"/>`;
    return `<rect x="0" y="20" width="200" height="104" fill="url(#ko-em-pec-zare)"/>
      ${plamen(36, 126, 86, 26, "#C4432B")}${plamen(164, 126, 92, 26, "#C4432B", -1)}${plamen(70, 126, 104, 26, "#E0662E", -1)}${plamen(130, 126, 100, 26, "#E0662E")}${plamen(100, 126, 110, 30, "#F2A33A")}
      ${plamen(52, 126, 60, 14, "#F6C85A")}${plamen(148, 126, 64, 14, "#F6C85A", -1)}${plamen(100, 126, 70, 18, "#FCE3A0")}`;
  },
};

/** Líc destičky: dřevo, malba podle toho, kdo odpovídá, a on sám (otázka je HTML) */
export function lic(kdo: PostavaId, druha = false): string {
  const kafe = kdo === "kapka" && druha;
  const malba = MALBY[kafe ? "kapka2" : kdo]?.() ?? "";
  const v = kdo === "samotka" ? 124 : kafe ? 106 : 118;
  const x = kafe ? 64 : 100;
  return kompakt(`<use href="#ko-em-lic"/>
    <g clip-path="url(#ko-em-c-deska)">${malba}</g>
    <path d="${obrysDesky(0.9, 10, 13.4)}" fill="none" stroke="#B4462C" stroke-width="1.2" opacity="0.5"/>
    ${kamiNaDesce(kdo, x, ZEM_LICE + (kdo === "samotka" ? 4 : 0), v, kafe)}
    <path d="M12 ${ZEM_LICE + 1} Q100 ${ZEM_LICE - 3} 188 ${ZEM_LICE + 1}" stroke="#B4462C" stroke-width="1" fill="none" opacity="0.35"/>`);
}

/** Rub destičky: holé dřevo s letokruhy a šňůrkou zezadu (odpověď a pečeť jsou HTML) */
export function rub(): string {
  return `<use href="#ko-em-rub"/>`;
}

/** Prázdná destička: čisté dřevo, jen tužkou rýsované řádky */
export function prazdna(): string {
  return `<use href="#ko-em-lic"/>
    <g stroke="#B98F58" stroke-width="0.7" opacity="0.45" stroke-dasharray="2 3"><path d="M24 104 H176"/><path d="M24 140 H176"/></g>`;
}

/**
 * Velikost písma odpovědi na rubu (v cqw šířky destičky), aby se text vešel
 * do plochy desky: krátké odpovědi velkým písmem, dlouhé menším.
 */
export function pismoOdpovedi(text: string): number {
  const n = text.length;
  return f(omez(Math.sqrt(5600 / Math.max(20, n)), 6.2, 9));
}
