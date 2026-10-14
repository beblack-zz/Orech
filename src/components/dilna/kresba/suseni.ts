/**
 * Sušení. Na překližkovém prkně regálu stojí tentýž kus ve třech stavech:
 * mokrý pod fólií (suší se pomalu a přikrytý), kožený s čerstvě
 * přilepeným uchem (vedle stužky po obrábění a štětec se šlikrem)
 * a suchý, bledý. Každý je o kus menší — rumělkové čárkované čáry od
 * okraje vedou k pravítku a u suchého kusu je čárkovaně, jak velký bude
 * po výpalu.
 *
 * podpisSvg: dno hrnku zespodu v kožené tvrdosti, jméno vyryté rydlem.
 *
 * Světlo jde zleva shora (okno dílny), stíny padají doprava dolů.
 */
import { P, HLINA, f, hladce, nahoda, smichej, mekkyStin, txt } from "./zaklad";
import type { Bod } from "./zaklad";
import { nadoba, geometrie, SMRST } from "./nadoba";

/* ——— Pomocníci ——— */

const rozmaz = (id: string, s: number) =>
  `<filter id="${id}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${s}"/></filter>`;

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

const otevrena = (b: Bod[]) => `M${f(b[0][0])} ${f(b[0][1])}${hladce(b)}`;

/** Stuha podél čáry — zúžený tah bez obrysu (šířka na levou a pravou stranu) */
function stuha(c: Bod[], vl: number[], vp: number[]) {
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
  return `M${f(L[0][0])} ${f(L[0][1])}${hladce(L)} L${f(R[n - 1][0])} ${f(R[n - 1][1])}${hladce([...R].reverse())} Z`;
}

/* ——— Rozvržení ——— */

/** Prkno: přední hrana horní plochy, tloušťka hrany, zadní hrana */
const PRKNO = { x0: 14, x1: 990, yPred: 452, tl: 38, yZad: 344 };
/** Kusy stojí kousek za přední hranou */
const PATA = 424;
/** Výška mokrého kusu — ostatní stavy zmenší nadoba() sama (SMRST) */
const VYSKA = 236;
const KUSY = [
  { x: 168, tvar: "valec" as const, stav: "mokry" as const, stitek: "mokrý" },
  { x: 412, tvar: "hrnek" as const, stav: "kozeny" as const, stitek: "kožený" },
  { x: 672, tvar: "hrnek" as const, stav: "suchy" as const, stitek: "suchý" },
];
/** Pravítko na pravém konci prkna */
const PRAVITKO = { x: 952, w: 28, yHor: 128 };

/* ——— Prkno z překližky ——— */

function prkno(p: string, defs: string[]) {
  const { x0, x1, yPred, tl, yZad } = PRKNO;
  defs.push(
    `<linearGradient id="${p}-pv" x1="0" y1="0" x2="1" y2="0.4"><stop offset="0" stop-color="${P.preklizkaSvetlo}"/><stop offset="0.6" stop-color="${P.preklizka}"/><stop offset="1" stop-color="${smichej(P.preklizka, P.preklizkaStin, 0.45)}"/></linearGradient>`,
    `<linearGradient id="${p}-pz" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.preklizkaStin}" stop-opacity="0.32"/><stop offset="0.5" stop-color="${P.preklizkaStin}" stop-opacity="0"/></linearGradient>`,
    `<linearGradient id="${p}-ph" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000000" stop-opacity="0"/><stop offset="1" stop-color="#2B2420" stop-opacity="0.22"/></linearGradient>`,
    mekkyStin(`${p}-ps`, P.inkoust, 0.2),
  );
  const s: string[] = [];
  /* Stín pod prknem */
  s.push(`<ellipse cx="530" cy="${yPred + tl + 30}" rx="520" ry="22" fill="url(#${p}-ps)"/>`);
  /* Černé konzole regálu pod prknem */
  for (const x of [96, 900]) {
    s.push(`<path d="M${x - 5} ${yPred + tl} h10 v52 h-10 Z" fill="${P.lista}"/>`);
    s.push(`<path d="M${x + 5} ${yPred + tl + 40} L${x + 44} ${yPred + tl} h-9 L${x + 5} ${yPred + tl + 31} Z" fill="${P.lista}"/>`);
    s.push(`<path d="M${x - 4} ${yPred + tl} v52" stroke="${P.listaSvetlo}" stroke-width="1.4"/>`);
  }
  /* Horní plocha */
  s.push(`<path d="M${x0 + 4} ${yZad} H${x1 - 4} L${x1} ${yPred} H${x0} Z" fill="url(#${p}-pv)"/>`);
  s.push(`<path d="M${x0 + 4} ${yZad} H${x1 - 4} L${x1} ${yPred} H${x0} Z" fill="url(#${p}-pz)"/>`);
  /* Hrana: vrstvy dýhy — světlejší podélné, tmavší příčné s čárkou lepidla */
  const vrstev = 7;
  const v = tl / vrstev;
  for (let i = 0; i < vrstev; i++) {
    const y = yPred + i * v;
    s.push(`<rect x="${x0}" y="${f(y)}" width="${x1 - x0}" height="${f(v + 0.3)}" fill="${i % 2 ? "#CDAA78" : "#E6CDA4"}"/>`);
    if (i > 0) s.push(`<path d="M${x0} ${f(y)} H${x1}" stroke="#94724A" stroke-width="0.8" opacity="0.45"/>`);
  }
  /* Hrana dole tmavne, vpravo trochu víc */
  s.push(`<rect x="${x0}" y="${yPred}" width="${x1 - x0}" height="${tl}" fill="url(#${p}-ph)"/>`);
  s.push(`<path d="M${x0} ${yPred + tl - 3} H${x1}" stroke="#2B2420" stroke-width="6" opacity="0.08"/>`);
  /* Zaoblená přední hrana chytá světlo */
  s.push(`<path d="M${x0 + 1} ${yPred + 0.8} H${x1 - 1}" stroke="#FFF6E6" stroke-width="1.8" opacity="0.75"/>`);
  return s.join("");
}

/* ——— Fólie přes mokrý kus ——— */

function folie(p: string, defs: string[]) {
  const k = KUSY[0];
  const g = geometrie(k.tvar, k.x, PATA, VYSKA);
  const { rx, ry, yTop, r } = g;
  const x = k.x;
  const H = VYSKA;
  const yDole = g.zaklad;
  const rDole = r(0) * H;
  /* Lem: na levém boku visí do třetiny výšky, šikmo přes líc dolů doprava
     až na prkno; přebytek fólie leží zmačkaný na prkně vpravo od kusu */
  const lem: Bod[] = [
    [x - rx - 6, yTop + H * 0.34],
    [x - rx * 0.62, yTop + H * 0.43],
    [x - rx * 0.12, yTop + H * 0.47],
    [x + rx * 0.3, yTop + H * 0.56],
    [x + rx * 0.55, yTop + H * 0.72],
    [x + rx * 0.72, yDole - 2],
    [x + rDole * 0.86, yDole + 15],
  ];
  const hromadka: Bod[] = [
    [x + rDole + 18, yDole + 19],
    [x + rDole + 44, yDole + 15],
    [x + rDole + 52, yDole + 6],
    [x + rDole + 38, yDole - 2],
    [x + rDole + 10, yDole - 4],
  ];
  /* Obrys dokola: vršek zleva doprava (fólie leží na zadní hraně okraje),
     pravý bok těsně podél kusu dolů, hromádka, lem zprava doleva, levý bok */
  const obrys: Bod[] = [
    [x - rx - 4, yTop + 2],
    [x - rx * 0.72, yTop - ry * 0.82],
    [x, yTop - ry - 2.5],
    [x + rx * 0.72, yTop - ry * 0.8],
    [x + rx + 4, yTop + 3],
    [x + rx + 6, yTop + H * 0.3],
    [x + rx + 7, yTop + H * 0.62],
    [x + rDole + 6, yDole - 8],
    ...hromadka,
    ...lem.slice().reverse(),
    [x - rx - 7, yTop + H * 0.17],
  ];
  const cesta = uzavrena(obrys);
  defs.push(
    `<linearGradient id="${p}-fo" x1="0" y1="0" x2="0.35" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.5"/><stop offset="0.3" stop-color="#F4F7F8" stop-opacity="0.26"/><stop offset="1" stop-color="#E9EFF1" stop-opacity="0.34"/></linearGradient>`,
    rozmaz(`${p}-fb`, 1.6),
    rozmaz(`${p}-fb4`, 4),
  );
  const s: string[] = [`<g class="${p}-folie">`];
  s.push(`<path d="${cesta}" fill="url(#${p}-fo)"/>`);
  /* Fólie se mezi okraji prohne do otvoru: uprostřed tmavší, vlevo světlo */
  s.push(`<ellipse cx="${f(x + rx * 0.1)}" cy="${f(yTop + ry * 0.2)}" rx="${f(rx * 0.66)}" ry="${f(ry * 0.5)}" fill="#55636A" opacity="0.12" filter="url(#${p}-fb)"/>`);
  s.push(`<path d="M${f(x - rx * 0.84)} ${f(yTop - ry * 0.25)} Q${f(x - rx * 0.35)} ${f(yTop + ry * 0.62)} ${f(x + rx * 0.45)} ${f(yTop + ry * 0.42)}" stroke="#FFFFFF" stroke-width="2" fill="none" opacity="0.75" stroke-linecap="round"/>`);
  /* Přes přední hranu okraje je fólie napnutá — světlá linka */
  s.push(`<path d="M${f(x - rx - 3)} ${f(yTop + 1.5)} A${f(rx + 3)} ${f(ry + 2.5)} 0 0 0 ${f(x + rx * 0.35)} ${f(yTop + ry + 2)}" stroke="#FFFFFF" stroke-width="2.2" fill="none" opacity="0.8" stroke-linecap="round"/>`);

  /* Záhyby: fólie se táhne doprava dolů za přebytkem — šikmé pruhy lesku
     (široký měkký a v něm úzký ostrý) a mezi nimi chladný stín */
  const zahyby: Bod[][] = [
    [[x - rx - 2, yTop + 8], [x - rx - 5, yTop + H * 0.17], [x - rx - 3, yTop + H * 0.31]],
    [[x - rx * 0.5, yTop + ry + 3], [x - rx * 0.46, yTop + H * 0.24], [x - rx * 0.36, yTop + H * 0.42]],
    [[x - rx * 0.02, yTop + ry + 5], [x + rx * 0.1, yTop + H * 0.27], [x + rx * 0.2, yTop + H * 0.5]],
    [[x + rx * 0.42, yTop + ry + 3], [x + rx * 0.52, yTop + H * 0.36], [x + rx * 0.58, yTop + H * 0.66]],
    [[x + rx * 0.8, yTop + ry * 0.4], [x + rx * 0.9, yTop + H * 0.45], [x + rx * 0.84, yTop + H * 0.86]],
  ];
  const mekke: string[] = [];
  const ostre: string[] = [];
  const stiny: string[] = [];
  zahyby.forEach((b, i) => {
    const d = otevrena(b);
    mekke.push(`<path d="${d}" stroke="#FFFFFF" stroke-width="${7 + (i % 2) * 3}" fill="none" opacity="0.3" stroke-linecap="round"/>`);
    stiny.push(`<path d="${d}" stroke="#5F6C73" stroke-width="6" fill="none" opacity="0.2" stroke-linecap="round" transform="translate(${8 + (i % 2) * 2} 2)"/>`);
    /* Ostrý lesk jen na kusu záhybu */
    const kus = b.map((q, j): Bod => (j === 0 ? [q[0] + (b[1][0] - q[0]) * 0.35, q[1] + (b[1][1] - q[1]) * 0.35] : q));
    if (i % 2 === 0) ostre.push(`<path d="${otevrena(kus)}" stroke="#FFFFFF" stroke-width="${f(1.2 + (i % 3) * 0.3)}" fill="none" opacity="0.8" stroke-linecap="round"/>`);
  });
  s.push(`<g filter="url(#${p}-fb4)">${stiny.join("")}${mekke.join("")}</g>`);
  s.push(ostre.join(""));
  /* Zmačkaná hromádka na prkně: pár krátkých lesků */
  const hb = hromadka;
  s.push(`<path d="M${f(hb[4][0] + 4)} ${f(hb[4][1] + 6)} Q${f(hb[3][0] - 2)} ${f(hb[3][1] + 8)} ${f(hb[2][0] - 6)} ${f(hb[2][1] + 3)}" stroke="#FFFFFF" stroke-width="1.4" fill="none" opacity="0.85" stroke-linecap="round"/>`);
  s.push(`<path d="M${f(hb[0][0] - 6)} ${f(hb[0][1] - 5)} Q${f(hb[1][0] - 8)} ${f(hb[1][1] - 2)} ${f(hb[1][0] + 2)} ${f(hb[1][1] - 6)}" stroke="#FFFFFF" stroke-width="1.2" fill="none" opacity="0.7" stroke-linecap="round"/>`);
  s.push(`<path d="${uzavrena(hb.concat([[x + rDole * 0.9, yDole + 10]]))}" fill="#5F6C73" opacity="0.08" transform="translate(3 4)" filter="url(#${p}-fb)"/>`);
  /* Lem fólie — tenká jasná hrana a pod ní stín */
  const lemD = otevrena([...lem, ...hromadka.slice(0, 2)]);
  s.push(`<path d="${lemD}" stroke="#5F6C73" stroke-width="2.6" fill="none" opacity="0.1" transform="translate(1 3)"/>`);
  s.push(`<path d="${lemD}" stroke="#FFFFFF" stroke-width="1.5" fill="none" opacity="0.9"/>`);
  s.push(`</g>`);
  return s.join("");
}

/* ——— Stužky po obrábění a štětec se šlikrem ——— */

/**
 * Stužka hlíny po obrábění: pásek stočený do vývrtky. Osa leží na prkně
 * ve směru `uhel`; přední oblouky jsou světlejší, zadní (vnitřek pásku)
 * tmavší. Kde je pásek vidět z hrany, je úzký.
 */
function stuzka(C: Bod, uhel: number, r: number, krok: number, otacek: number, w0: number) {
  const h = HLINA.kozeny;
  const dx = Math.cos(uhel);
  const dy = Math.sin(uhel);
  const K = Math.round(otacek * 20);
  const body: { b: Bod; w: number; pred: boolean }[] = [];
  /* Vývrtka viděná trochu shora: smyčky (protáhlá cykloida) — nahoře
     se pásek vrací dozadu, tam je tmavší rub, dole jde dopředu světlý líc */
  const k = krok / (Math.PI * 2);
  for (let i = 0; i <= K; i++) {
    const t = (i / K) * otacek * Math.PI * 2;
    const rr = r * (1 - (0.25 * i) / K);
    const u = k * t - rr * Math.sin(t);
    const v = -rr * Math.cos(t) * 0.8;
    const konce = Math.min(1, (i / K) * 6, ((K - i) / K) * 6);
    body.push({
      b: [C[0] + dx * u - dy * v, C[1] + dy * u + dx * v],
      w: w0 * (0.45 + 0.55 * Math.abs(Math.cos(t))) * (0.3 + 0.7 * konce),
      pred: Math.cos(t) < k / rr,
    });
  }
  const useky: { b: Bod[]; w: number[]; pred: boolean }[] = [];
  for (const q of body) {
    const u = useky[useky.length - 1];
    if (!u || u.pred !== q.pred) {
      const nove = { b: u ? [u.b[u.b.length - 1]] : [], w: u ? [u.w[u.w.length - 1]] : [], pred: q.pred };
      useky.push(nove);
    }
    const v = useky[useky.length - 1];
    v.b.push(q.b);
    v.w.push(q.w);
  }
  const zad: string[] = [];
  const pred: string[] = [];
  for (const u of useky) {
    if (u.b.length < 2) continue;
    const pul = u.w.map((w) => w / 2);
    if (u.pred) {
      pred.push(`<path d="${stuha(u.b, pul, pul)}" fill="${smichej(h.stred, h.svetlo, 0.45)}"/>`);
      pred.push(`<path d="${stuha(u.b, pul.map((w) => w * 0.9), pul.map((w) => -w * 0.3))}" fill="${smichej(h.svetlo, "#FFFFFF", 0.15)}" opacity="0.8"/>`);
    } else {
      zad.push(`<path d="${stuha(u.b, pul.map((w) => w * 0.85), pul.map((w) => w * 0.85))}" fill="${smichej(h.stin, h.stred, 0.6)}"/>`);
    }
  }
  return { zad: zad.join(""), pred: pred.join(""), stin: body.map((q) => q.b) };
}

function drobnosti(p: string, defs: string[]) {
  const s: string[] = [];
  defs.push(rozmaz(`${p}-db`, 1.4));
  /* Stužky — vlevo před koženým kusem, co spadly z očka */
  const stuzky: [number, number, number, number, number, number, number][] = [
    /* x, y, úhel osy, poloměr, krok, otáček, šířka */
    [262, 437, -0.08, 8, 20, 2.3, 4.2],
    [306, 447, 0.22, 6.5, 17, 1.8, 3.8],
    [238, 449, -0.3, 5.5, 15, 1.4, 3.4],
  ];
  for (const [x, y, u, r, k, o, w] of stuzky) {
    const q = stuzka([x, y], u, r, k, o, w);
    const sx = Math.min(...q.stin.map((b) => b[0]));
    const ex = Math.max(...q.stin.map((b) => b[0]));
    s.push(`<ellipse cx="${f((sx + ex) / 2 + 3)}" cy="${f(y + r * 0.7 + 2)}" rx="${f((ex - sx) / 2 + 3)}" ry="3" fill="${P.inkoust}" opacity="0.18" filter="url(#${p}-db)"/>`);
    s.push(q.zad, q.pred);
  }

  /* Štětec: leží šikmo před mezerou mezi kožený a suchým kusem, štětiny
     obalené šlikrem, pod nimi kapka šlikru na prkně */
  const A: Bod = [532, 447];
  const B: Bod = [446, 433];
  const dl = Math.hypot(B[0] - A[0], B[1] - A[1]);
  const ux = (B[0] - A[0]) / dl;
  const uy = (B[1] - A[1]) / dl;
  const nx = -uy;
  const ny = ux;
  const pt = (t: number, o = 0): Bod => [A[0] + (B[0] - A[0]) * t + nx * o, A[1] + (B[1] - A[1]) * t + ny * o];
  defs.push(
    `<linearGradient id="${p}-st" gradientUnits="userSpaceOnUse" x1="${f(pt(0.5, -5)[0])}" y1="${f(pt(0.5, -5)[1])}" x2="${f(pt(0.5, 5)[0])}" y2="${f(pt(0.5, 5)[1])}"><stop offset="0" stop-color="#A4442E"/><stop offset="0.35" stop-color="#C9644A"/><stop offset="1" stop-color="#7E2F1F"/></linearGradient>`,
    `<linearGradient id="${p}-sk" gradientUnits="userSpaceOnUse" x1="${f(pt(0.5, -5)[0])}" y1="${f(pt(0.5, -5)[1])}" x2="${f(pt(0.5, 5)[0])}" y2="${f(pt(0.5, 5)[1])}"><stop offset="0" stop-color="${P.ocelStin}"/><stop offset="0.3" stop-color="${P.ocelSvetlo}"/><stop offset="1" stop-color="${P.ocelStin}"/></linearGradient>`,
  );
  const sl = HLINA.mokry;
  /* Kapka šlikru pod štětinami */
  const kal = pt(-0.06, 3);
  s.push(`<ellipse cx="${f(kal[0])}" cy="${f(kal[1] + 2)}" rx="13" ry="4" fill="${sl.stred}"/>`);
  s.push(`<ellipse cx="${f(kal[0] - 3)}" cy="${f(kal[1] + 0.8)}" rx="6" ry="1.2" fill="#FFFFFF" opacity="0.5"/>`);
  /* Stín štětce */
  s.push(`<path d="M${f(pt(0.02)[0] + 3)} ${f(pt(0.02)[1] + 5)} L${f(pt(1)[0] + 3)} ${f(pt(1)[1] + 5)}" stroke="${P.inkoust}" stroke-width="8" stroke-linecap="round" opacity="0.16" filter="url(#${p}-db)"/>`);
  /* Násada, objímka */
  s.push(`<path d="M${f(pt(0.36)[0])} ${f(pt(0.36)[1])} L${f(pt(1)[0])} ${f(pt(1)[1])}" stroke="url(#${p}-st)" stroke-width="6.5" stroke-linecap="round"/>`);
  s.push(`<path d="M${f(pt(0.36)[0])} ${f(pt(0.36)[1] - 1.6)} L${f(pt(0.98)[0])} ${f(pt(0.98)[1] - 1.6)}" stroke="#FFFFFF" stroke-width="1.2" stroke-linecap="round" opacity="0.35"/>`);
  s.push(`<path d="M${f(pt(0.23)[0])} ${f(pt(0.23)[1])} L${f(pt(0.38)[0])} ${f(pt(0.38)[1])}" stroke="url(#${p}-sk)" stroke-width="8"/>`);
  /* Štětiny obalené šlikrem */
  const st = [pt(0.24, -4.2), pt(0.12, -4.6), pt(0.03, -2.4), pt(-0.02, 0.6), pt(0.03, 3.6), pt(0.13, 4.8), pt(0.24, 4.2)];
  s.push(`<path d="${uzavrena(st)}" fill="${sl.stred}"/>`);
  s.push(`<path d="M${f(pt(0.21, -2.4)[0])} ${f(pt(0.21, -2.4)[1])} L${f(pt(0.06, -1.8)[0])} ${f(pt(0.06, -1.8)[1])}" stroke="#FFFFFF" stroke-width="1.3" stroke-linecap="round" opacity="0.6"/>`);
  return s.join("");
}

/* ——— Pravítko a smrštění ——— */

/** Výška okraje každého kusu na obrazovce (střed elipsy okraje) a jeho pravý kraj */
const okraje = () =>
  KUSY.map((k) => {
    const g = geometrie(k.tvar, k.x, PATA, VYSKA * SMRST[k.stav]);
    return { y: g.yTop, x: k.x + g.rx };
  });

/** Čárkované čáry od okraje k pravítku — kreslí se pod kusy, další kus je zakryje */
function cary(p: string) {
  const { x } = PRAVITKO;
  return okraje()
    .map((o) => `<path class="${p}-cara" d="M${f(o.x + 5)} ${f(o.y)} H${x - 12}" stroke="${P.rumelka}" stroke-width="1.6" stroke-dasharray="7 5" opacity="0.85"/>`)
    .join("");
}

function pravitko(p: string, defs: string[]) {
  const { x, w, yHor } = PRAVITKO;
  const yDol = PATA + 6;
  const s: string[] = [];
  defs.push(
    `<linearGradient id="${p}-pr" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#F3DDB4"/><stop offset="0.75" stop-color="#E6C795"/><stop offset="1" stop-color="#C9A472"/></linearGradient>`,
    `<linearGradient id="${p}-sp" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${P.drevoSvetlo}"/><stop offset="1" stop-color="${smichej(P.drevoSvetlo, P.drevo, 0.55)}"/></linearGradient>`,
    mekkyStin(`${p}-prs`, P.inkoust, 0.3),
  );
  const xl = x - 10;
  /* Stín pravítka a špalíku, do kterého je zastrčené */
  s.push(`<ellipse cx="${x + 26}" cy="${yDol + 4}" rx="46" ry="8" fill="url(#${p}-prs)"/>`);
  s.push(`<rect x="${xl}" y="${yHor}" width="${w}" height="${yDol - 12 - yHor}" rx="2" fill="url(#${p}-pr)"/>`);
  s.push(`<path d="M${xl + 1} ${yHor + 2} V${yDol - 16}" stroke="#FFF7E8" stroke-width="1.4" opacity="0.8"/>`);
  /* Dílky: centimetr = 21 px (prkno má 18 mm a 38 px), půlcentimetry kratší */
  const cm = 21;
  let i = 0;
  for (let y = yDol - 18; y > yHor + 6; y -= cm / 2, i++) {
    const dl = i % 2 === 0 ? 12 : 7;
    s.push(`<path d="M${f(xl + w - dl)} ${f(y)} H${xl + w}" stroke="${P.inkoust2}" stroke-width="1" opacity="0.75"/>`);
  }
  /* Špalík z tmavšího dřeva, pravítko je v něm zastrčené */
  s.push(`<path d="M${xl - 10} ${yDol - 14} h${w + 20} l7 -5 v17 l-7 6 h-${w + 20} Z" fill="url(#${p}-sp)"/>`);
  s.push(`<path d="M${xl - 10} ${yDol - 14} h${w + 20} l7 -5 h-${w + 20} Z" fill="#E2C193"/>`);
  s.push(`<path d="M${xl + w + 10} ${yDol - 14} l7 -5 v17 l-7 6 Z" fill="${P.drevo}"/>`);
  s.push(`<path d="M${xl - 2} ${yDol - 16.5} h${w + 4}" stroke="${P.drevoStin}" stroke-width="2.2" opacity="0.7"/>`);
  /* Rumělkové značky na pravítku, kam čáry došly */
  for (const o of okraje()) {
    s.push(`<path d="M${xl - 4} ${f(o.y)} h16" stroke="${P.rumelka}" stroke-width="2.2" stroke-linecap="round"/>`);
  }
  return s.join("");
}

/** U suchého kusu čárkovaně: tak velký bude po výpalu */
function poVypalu(p: string) {
  const k = KUSY[2];
  const H = VYSKA * SMRST.hotovy;
  const g = geometrie(k.tvar, k.x, PATA, H);
  const N = g.levy.length;
  const obrys =
    `M${f(g.levy[0][0])} ${f(g.levy[0][1])}${hladce(g.levy)}` +
    ` A${f(g.rx)} ${f(g.ry)} 0 0 1 ${f(g.pravy[N - 1][0])} ${f(g.pravy[N - 1][1])}` +
    hladce([...g.pravy].reverse()) +
    ` A${f(g.r(0) * H)} ${f(g.ry0)} 0 0 1 ${f(g.levy[0][0])} ${f(g.levy[0][1])} Z`;
  return `<path class="${p}-vypal" d="${obrys}" stroke="${P.rumelka}" stroke-width="1.5" stroke-dasharray="5 5" fill="none" opacity="0.6"/>`;
}

/* ——— Štítky z papírové pásky na hraně prkna ——— */

function stitky() {
  const s: string[] = [];
  const nakloneni = [-1.6, 1.1, -0.8];
  KUSY.forEach((k, i) => {
    const w = 104;
    const h = 31;
    const x0 = k.x - w / 2;
    const y0 = PRKNO.yPred + 4;
    /* Natržené konce pásky: vpravo dolů, vlevo nahoru */
    const prava: string[] = [];
    const leva: string[] = [];
    for (let j = 0; j <= 6; j++) {
      prava.push(`${f(x0 + w + (j % 2 ? 2.4 : 0))} ${f(y0 + (j * h) / 6)}`);
      leva.push(`${f(x0 - (j % 2 ? 2.4 : 0))} ${f(y0 + h - (j * h) / 6)}`);
    }
    const d = `M${prava.join(" ")} ${leva.join(" ")}Z`;
    s.push(`<g transform="rotate(${nakloneni[i]} ${k.x} ${y0 + h / 2})">`);
    s.push(`<path d="${d}" fill="#2B2420" opacity="0.1" transform="translate(1.5 2)"/>`);
    s.push(`<path d="${d}" fill="#F4E8C9" opacity="0.94"/>`);
    s.push(`<text x="${k.x}" y="${f(y0 + h * 0.78)}" text-anchor="middle" font-family="Caveat, cursive" font-size="28" fill="${P.inkoust}">${k.stitek}</text>`);
    s.push(`</g>`);
  });
  return s.join("");
}

/* ——— Celá kresba ——— */

export function suseniSvg(p = "dsu"): string {
  const defs: string[] = [];
  const s: string[] = [];
  s.push(prkno(p, defs));
  s.push(pravitko(p, defs));
  s.push(cary(p));
  KUSY.forEach((k, i) => {
    s.push(nadoba({ id: `${p}-n${i}`, tvar: k.tvar, stav: k.stav, x: k.x, y: PATA, vyska: VYSKA, ucho: k.tvar === "valec" ? false : undefined }));
  });
  s.push(folie(p, defs));
  s.push(drobnosti(p, defs));
  s.push(poVypalu(p));
  s.push(stitky());
  return `<svg viewBox="0 0 1000 560" aria-hidden="true"><defs>${defs.join("")}</defs>${s.join("")}</svg>`;
}

/** Místo pro Kachlíka — stojí na prkně vpravo mezi suchým kusem a pravítkem */
export const MISTA_SUSENI = { kachlik: { x: 878, y: 446, w: 124 } };

/* ——— Podpis rydlem do dna ——— */

/**
 * Dno hrnku zespodu v kožené tvrdosti: hrnek leží dnem vzhůru, kolem je
 * spodek stěny, uprostřed obrobená patka (prstenec) a v ní vyryté jméno.
 * Přes dno šikmo leží rydlo, hrotem tam, kde jméno skončilo.
 */
export function podpisSvg(jmeno = "Jana", p = "dsu"): string {
  const h = HLINA.kozeny;
  const cx = 198;
  const cy = 192;
  const R = 140;
  const Rp = 113;
  const Ri = 90;
  const defs: string[] = [];
  const s: string[] = [];
  defs.push(
    mekkyStin(`${p}-ds`, P.inkoust, 0.42),
    `<radialGradient id="${p}-dt" cx="0.36" cy="0.32" r="0.72"><stop offset="0" stop-color="${smichej(h.svetlo, "#FFFFFF", 0.1)}"/><stop offset="0.55" stop-color="${h.stred}"/><stop offset="0.86" stop-color="${smichej(h.stred, h.stin, 0.55)}"/><stop offset="1" stop-color="${h.stin}"/></radialGradient>`,
    `<radialGradient id="${p}-dp" cx="0.4" cy="0.36" r="0.75"><stop offset="0" stop-color="${smichej(h.svetlo, "#FFFFFF", 0.12)}"/><stop offset="0.7" stop-color="${h.svetlo}"/><stop offset="1" stop-color="${smichej(h.svetlo, h.stred, 0.6)}"/></radialGradient>`,
    `<linearGradient id="${p}-dh" x1="0.15" y1="0.1" x2="0.85" y2="0.9"><stop offset="0" stop-color="#E9D2B9"/><stop offset="0.5" stop-color="${h.stred}"/><stop offset="1" stop-color="${h.stin}"/></linearGradient>`,
    `<linearGradient id="${p}-di" x1="0.15" y1="0.1" x2="0.85" y2="0.9"><stop offset="0" stop-color="${h.stin}"/><stop offset="0.5" stop-color="${h.stred}"/><stop offset="1" stop-color="#E4CBB0"/></linearGradient>`,
    `<radialGradient id="${p}-dd" cx="0.42" cy="0.4" r="0.7"><stop offset="0" stop-color="${smichej(h.svetlo, h.stred, 0.25)}"/><stop offset="1" stop-color="${smichej(h.stred, h.svetlo, 0.2)}"/></radialGradient>`,
    rozmaz(`${p}-d1`, 1),
    rozmaz(`${p}-d3`, 3),
    rozmaz(`${p}-d06`, 0.6),
  );
  /* Ucho — zespodu je vidět jako pásek, který vybíhá šikmo vlevo nahoru */
  const ua = (225 * Math.PI) / 180;
  const ud: Bod = [Math.cos(ua), Math.sin(ua)];
  const un: Bod = [-ud[1], ud[0]];
  const uB = (r: number, o: number): Bod => [cx + ud[0] * r + un[0] * o, cy + ud[1] * r + un[1] * o];
  const uSir = 15;
  const uKon = R + 72;
  const ucho = `M${f(uB(R - 30, -uSir)[0])} ${f(uB(R - 30, -uSir)[1])} L${f(uB(uKon, -uSir)[0])} ${f(uB(uKon, -uSir)[1])} A${uSir} ${uSir} 0 0 1 ${f(uB(uKon, uSir)[0])} ${f(uB(uKon, uSir)[1])} L${f(uB(R - 30, uSir)[0])} ${f(uB(R - 30, uSir)[1])} Z`;
  defs.push(
    `<linearGradient id="${p}-du" gradientUnits="userSpaceOnUse" x1="${f(uB(R, 0)[0])}" y1="${f(uB(R, 0)[1])}" x2="${f(uB(uKon + uSir, 0)[0])}" y2="${f(uB(uKon + uSir, 0)[1])}"><stop offset="0" stop-color="${h.stred}"/><stop offset="0.45" stop-color="${smichej(h.svetlo, h.stred, 0.3)}"/><stop offset="1" stop-color="${h.stin}"/></linearGradient>`,
  );
  /* Stín hrnku i s uchem na stole doprava dolů */
  s.push(`<circle cx="${cx + 12}" cy="${cy + 14}" r="${R + 14}" fill="url(#${p}-ds)"/>`);
  s.push(`<path d="${ucho}" fill="${P.inkoust}" opacity="0.18" transform="translate(9 11)" filter="url(#${p}-d3)"/>`);
  s.push(`<path d="${ucho}" fill="url(#${p}-du)"/>`);
  /* Hrana pásku ke světlu */
  s.push(`<path d="M${f(uB(R - 4, -uSir + 3)[0])} ${f(uB(R - 4, -uSir + 3)[1])} L${f(uB(uKon, -uSir + 3)[0])} ${f(uB(uKon, -uSir + 3)[1])}" stroke="#F1DCC3" stroke-width="2.4" stroke-linecap="round" opacity="0.7"/>`);
  /* Spodek stěny — od nejširšího místa se stáčí k patce */
  s.push(`<circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#${p}-dt)"/>`);
  /* Patka: obrobený prstenec, hrana sražená očkem */
  s.push(`<circle cx="${cx}" cy="${cy}" r="${Rp + 4}" fill="url(#${p}-dh)"/>`);
  s.push(`<circle cx="${cx}" cy="${cy}" r="${Rp}" fill="url(#${p}-dp)"/>`);
  /* Stopy po očku na prstenci — pár soustředných kroužků */
  for (const [r, sv] of [[Ri + 7, 1], [Ri + 13, 0], [Ri + 19, 1]] as const) {
    s.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${sv ? "#FFF3E4" : h.stin}" stroke-width="0.9" opacity="${sv ? 0.45 : 0.22}"/>`);
  }
  /* Vnitřní stěna prstence: vlevo nahoře ve stínu, vpravo dole na světle */
  s.push(`<circle cx="${cx}" cy="${cy}" r="${Ri + 3}" fill="url(#${p}-di)"/>`);
  /* Dno uvnitř patky */
  s.push(`<circle cx="${cx + 1}" cy="${cy + 1}" r="${Ri}" fill="url(#${p}-dd)"/>`);
  /* Prstenec vrhá do dna stín vlevo nahoře */
  s.push(`<path d="M${cx - Ri + 2} ${cy + 18} A${Ri - 2} ${Ri - 2} 0 0 1 ${cx + 18} ${cy - Ri + 2} A${Ri + 6} ${Ri + 6} 0 0 0 ${cx - Ri + 2} ${cy + 18} Z" fill="${h.stin}" opacity="0.32" filter="url(#${p}-d3)"/>`);
  /* Spirála po obrábění na dně — jen náznak */
  for (const [r, sv] of [[34, 0], [56, 1], [76, 0]] as const) {
    s.push(`<circle cx="${cx + 1}" cy="${cy + 1}" r="${r}" fill="none" stroke="${sv ? "#FFF3E4" : h.stin}" stroke-width="0.9" opacity="${sv ? 0.32 : 0.16}"/>`);
  }

  /* Jméno vyryté rydlem: světlá hrana dole vpravo, tmavá rýha, nahoře
     vlevo ještě tmavší okraj, kolem drobný val vytlačené hlíny */
  const t = txt(jmeno.trim() || "Jana");
  const n = Array.from(jmeno.trim() || "Jana").length;
  const vel = Math.max(30, Math.min(66, 164 / (0.42 * n)));
  const sirka = 0.42 * n * vel;
  const dlouhe = sirka > 166 ? ` textLength="166" lengthAdjust="spacingAndGlyphs"` : "";
  const tx = cx + 2;
  const ty = cy + vel * 0.3;
  const pismo = `font-family="Caveat, cursive" font-size="${f(vel)}" font-weight="500" text-anchor="middle"${dlouhe}`;
  const text = (dx: number, dy: number, at: string) => `<text x="${f(tx + dx)}" y="${f(ty + dy)}" ${pismo} ${at}>${t}</text>`;
  s.push(`<g transform="rotate(-7 ${cx} ${cy})">`);
  s.push(`<g filter="url(#${p}-d06)">${text(0.4, 0.6, `fill="none" stroke="${smichej(h.svetlo, "#FFFFFF", 0.25)}" stroke-width="3.6" stroke-linejoin="round" opacity="0.5"`)}</g>`);
  s.push(text(1.4, 1.6, `fill="#EBD3B8"`));
  s.push(text(-0.5, -0.6, `fill="#3E2C21"`));
  s.push(text(0.3, 0.4, `fill="${smichej(h.stin, "#2E1F17", 0.25)}"`));
  s.push(`</g>`);

  /* Rydlo: hrot tam, kde jméno skončilo, násada šikmo dolů doprava přes okraj */
  const konec: Bod = [cx + Math.min(sirka, 166) / 2 + 6, cy + vel * 0.18 - (Math.min(sirka, 166) / 2) * 0.12];
  const ux = 0.5;
  const uy = 0.866;
  const nx = -uy;
  const ny = ux;
  const bod = (d: number, o = 0): Bod => [konec[0] + ux * d + nx * o, konec[1] + uy * d + ny * o];
  defs.push(
    `<linearGradient id="${p}-ry" gradientUnits="userSpaceOnUse" x1="${f(bod(120, 8)[0])}" y1="${f(bod(120, 8)[1])}" x2="${f(bod(120, -8)[0])}" y2="${f(bod(120, -8)[1])}"><stop offset="0" stop-color="${P.drevoSvetlo}"/><stop offset="0.3" stop-color="#E2BE8E"/><stop offset="0.7" stop-color="${P.drevo}"/><stop offset="1" stop-color="${P.drevoStin}"/></linearGradient>`,
    `<linearGradient id="${p}-rk" gradientUnits="userSpaceOnUse" x1="${f(bod(50, 5)[0])}" y1="${f(bod(50, 5)[1])}" x2="${f(bod(50, -5)[0])}" y2="${f(bod(50, -5)[1])}"><stop offset="0" stop-color="${P.ocelSvetlo}"/><stop offset="0.45" stop-color="${P.ocel}"/><stop offset="1" stop-color="${P.ocelStin}"/></linearGradient>`,
  );
  const rydlo = (posun: Bod, barvy: boolean) => {
    const q = (d: number, o = 0): Bod => {
      const b = bod(d, o);
      return [b[0] + posun[0], b[1] + posun[1]];
    };
    const r: string[] = [];
    const jehla = [q(0, 0), q(40, 1.6), q(46, 1.9), q(46, -1.9), q(40, -1.6)];
    const objimka = [q(44, 3.6), q(58, 4.2), q(58, -4.2), q(44, -3.6)];
    const nasada = [q(56, 5.6), q(70, 7.2), q(150, 7.6), q(162, 5), q(162, -5), q(150, -7.6), q(70, -7.2), q(56, -5.6)];
    const cesta = (b: Bod[]) => `M${b.map((x) => `${f(x[0])} ${f(x[1])}`).join(" ")}Z`;
    if (!barvy) {
      r.push(`<path d="${cesta(nasada)}"/>`, `<path d="${cesta(objimka)}"/>`, `<path d="${cesta(jehla)}"/>`);
      return r.join("");
    }
    r.push(`<path d="${cesta(nasada)}" fill="url(#${p}-ry)"/>`);
    r.push(`<path d="M${f(q(72, 3.6)[0])} ${f(q(72, 3.6)[1])} L${f(q(152, 3.8)[0])} ${f(q(152, 3.8)[1])}" stroke="#FFF4E2" stroke-width="1.6" stroke-linecap="round" opacity="0.5"/>`);
    r.push(`<path d="${cesta(objimka)}" fill="url(#${p}-rk)"/>`);
    r.push(`<path d="${cesta(jehla)}" fill="url(#${p}-rk)"/>`);
    r.push(`<path d="M${f(q(4, 0.3)[0])} ${f(q(4, 0.3)[1])} L${f(q(42, 0.9)[0])} ${f(q(42, 0.9)[1])}" stroke="#FFFFFF" stroke-width="0.7" opacity="0.8"/>`);
    return r.join("");
  };
  /* Stín rydla na dně — doprava dolů, měkký */
  s.push(`<g fill="${P.inkoust}" opacity="0.28" filter="url(#${p}-d3)">${rydlo([7, 9], false)}</g>`);
  s.push(rydlo([0, 0], true));
  /* Drobek hlíny u hrotu, co vyjel z rýhy */
  s.push(`<ellipse cx="${f(konec[0] + 6)}" cy="${f(konec[1] + 1)}" rx="3" ry="2" fill="${h.svetlo}"/><ellipse cx="${f(konec[0] + 5)}" cy="${f(konec[1] + 0.2)}" rx="1.4" ry="0.8" fill="#FFFFFF" opacity="0.5"/>`);
  return `<svg viewBox="0 0 360 360" aria-hidden="true"><defs>${defs.join("")}</defs>${s.join("")}</svg>`;
}
