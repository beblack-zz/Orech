/**
 * 結 Závěr — Futatsu na rozprostřeném šátku. Kresba konce stránky
 * /obchod-2/futatsu: ráno, světlo zleva z okna, indigový furoshiki se
 * vzorem seigaiha (stejný šátek je košík webu, Satek.astro) a na něm hrnek.
 * Po „Do šátku“ se šátek kolem hrnku zaváže.
 *
 *   satekScena(t, p)   dvě vrstvy: `zadni` (stůl, světlo, šátek, záhyby,
 *                      uzel — pod hrnkem) a `predni` (látka přes hrnek, jak
 *                      ho obaluje). Hrnek (podobizna) leží mezi nimi jako HTML.
 *   satekTvary(t)      tvary a průhlednosti pro uzlování 0 → 1 — skript je
 *                      přepisuje prvkům s data-f během animace
 *   SATEK_VIEWBOX, KUS_SATEK  rámeček kresby a kde v ní stojí hrnek
 *
 * Jednotky jsou milimetry jako v podobizně a pohled je týž (nadhled
 * NADHLED_SATEK, pata hrnku v (0, 76)): bod na zemi (x, z) je v obraze
 * v (x, 76 + z·sin), výška h ubírá h·cos.
 *
 * Uzlování je proměna obrysu: rozprostřený čtverec postavený na cíp se
 * plynule stáhne do uzlíku s dvěma ušima. Každý bod obrysu má svou cestu —
 * vpředu a vzadu se látka zvedá první, boční cípy (z nich jsou uši) nakonec.
 * Přední vrstva odkrývá látku přes hrnek zdola nahoru, takže to vypadá,
 * že ho šátek obaluje. Uzel naskočí nakonec, jako u šátku v krámku.
 */
import { f, omez, hladce } from "../../dilna/kresba/zaklad";
import type { Bod } from "../../dilna/kresba/zaklad";
import { PODOBIZNA } from "./podobizna";

const RAD = Math.PI / 180;
const o3 = (n: number) => (Math.round(n * 1000) / 1000).toString();
const plynule = (a: number, b: number, t: number) => {
  const u = omez((t - a) / (b - a));
  return u * u * (3 - 2 * u);
};
/** Rozjezd i dojezd měkce, konec s lehkým dosednutím */
const kroky = (t: number) => {
  const u = omez(t);
  return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
};

export const NADHLED_SATEK = 24;
const SN = Math.sin(NADHLED_SATEK * RAD);
const PY = PODOBIZNA.pata[1];
/** Bod na zemi (x, z) v obraze */
const zem = (x: number, z: number): Bod => [x, PY + z * SN];

/** Rámeček kresby: na šířku; na telefonu stránka ořízne kraje (xMidYMid slice) */
export const SATEK = { x: -125, y: -78, w: 250, h: 188 };
export const SATEK_VIEWBOX = `${SATEK.x} ${SATEK.y} ${SATEK.w} ${SATEK.h}`;
/** Kde v kresbě leží rámeček podobizny (stejné jednotky, takže 1:1) */
export const KUS_SATEK = { x: PODOBIZNA.x, y: PODOBIZNA.y, w: PODOBIZNA.w, h: PODOBIZNA.h };

/* ═══════════════ Obrys: rozprostřený šátek → uzlík ═══════════════ */

/** Půl úhlopříčky šátku (mm) — čtverec zhruba 33 cm, leží na cíp */
const D = 233;
const L = zem(-D, 0);
const B = zem(0, -D);
const R = zem(D, 0);
const F = zem(0, D);

/* Uzlík zepředu, po směru hodin od špičky levého ucha. Uši jsou cípy
   rozložené do stran jako mašle, uprostřed uzel, tělo kolem hrnku dole
   do oblouku. */
const UCHO_L: Bod = [-51, -37];
const UCHO_P: Bod = [49, -41];
const K_LB: Bod[] = [[-38, -33], [-25, -25.5], [-12, -17], [-5, -17]];
const UZEL_HORE: Bod = [0, -18];
const K_BR: Bod[] = [[5, -17], [12, -17], [23, -27], [36, -36]];
const K_RF: Bod[] = [[50, -31], [40, -19.5], [27, -9.5], [15, -5], [30, -2.5], [45, 6], [53, 20], [56, 42], [55, 64], [51, 81], [38, 91], [18, 97]];
const SPOD: Bod = [0, 98.5];
const K_FL: Bod[] = [[-18, 97], [-38, 91], [-51, 81], [-55, 64], [-56, 42], [-53, 20], [-45, 6], [-30, -2.5], [-14, -5], [-26, -9], [-39, -17], [-50, -27]];

/** Body obrysu: kde leží rozprostřené a kam dojdou v uzlíku */
const OBRYS: { z: Bod; na: Bod }[] = (() => {
  const body: { z: Bod; na: Bod }[] = [];
  const hrana = (a: Bod, b: Bod, cile: Bod[]) => {
    const n = cile.length + 1;
    cile.forEach((na, i) => {
      const k = (i + 1) / n;
      body.push({ z: [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k], na });
    });
  };
  body.push({ z: L, na: UCHO_L });
  hrana(L, B, K_LB);
  body.push({ z: B, na: UZEL_HORE });
  hrana(B, R, K_BR);
  body.push({ z: R, na: UCHO_P });
  hrana(R, F, K_RF);
  body.push({ z: F, na: SPOD });
  hrana(F, L, K_FL);
  return body;
})();

/**
 * Bod obrysu v čase t. Do strany se látka stahuje hned (rychlý rozjezd),
 * nahoru jde měkce a boční cípy přitom vyletí obloukem nad hrnek — jako
 * když je vezmeš do rukou a zvedneš.
 */
function bodObrysu(i: number, t: number): Bod {
  const { z, na } = OBRYS[i];
  const bok = Math.min(1, Math.abs(z[0]) / D);
  const v = omez((t - 0.03 - 0.08 * bok) / 0.74);
  const ux = 1 - Math.pow(1 - v, 2.4);
  const uy = kroky(v);
  const ky = Math.min(z[1], na[1]) - 40 * bok * bok;
  const b = 1 - uy;
  return [z[0] + (na[0] - z[0]) * ux, b * b * z[1] + 2 * b * uy * ky + uy * uy * na[1]];
}

const obrysD = (t: number) => {
  const body = OBRYS.map((_, i) => bodObrysu(i, t));
  /* Uzavřená hladká křivka: konec napojený na začátek */
  const n = body.length;
  const okolo = [body[n - 1], ...body, body[0], body[1]];
  let d = `M${f(body[0][0])} ${f(body[0][1])}`;
  for (let i = 1; i <= n; i++) {
    const p0 = okolo[i - 1];
    const p1 = okolo[i];
    const p2 = okolo[i + 1];
    const p3 = okolo[i + 2];
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return `${d} Z`;
};

/** Kudy přes hrnek už vede látka: od patky nahoru k okraji */
const kryt = (t: number) => {
  const u = kroky((t - 0.2) / 0.52);
  return 100 - u * 128;
};

/**
 * Hrana látky přes hrnek: uprostřed vpředu níž, k bokům výš, jak boční
 * cípy táhnou nahoru. Plocha pod ní (ořez), nebo jen čára hrany.
 */
function hranaKrytu(y: number, jenCara = false): string {
  const body: Bod[] = [];
  for (let x = -60; x <= 60; x += 10) body.push([x, y + 9 * (1 - (x / 56) ** 2)]);
  const cara = `M${f(body[0][0])} ${f(body[0][1])}${hladce(body)}`;
  return jenCara ? cara : `${cara} L60 200 L-60 200 Z`;
}

type Atributy = Record<string, string>;

/**
 * Tvary a průhlednosti pro uzlování v čase t (0 = rozprostřený, 1 =
 * zavázaný). Klíč je data-f prvku, hodnota jeho atributy.
 */
export function satekTvary(t: number): Record<string, Atributy> {
  const T = omez(t);
  const d = obrysD(T);
  /* Vzor se s látkou postaví: ležící šátek je zkrácený, v uzlíku míň */
  const sv = kroky((T - 0.15) / 0.7);
  const vzor = `matrix(1 0 0 ${o3(SN + (0.86 - SN) * sv)} 0 ${f(PY + (24 - PY) * sv)})`;
  const uzel = plynule(0.78, 1, T);
  const meritko = 0.3 + 0.7 * (1 - Math.pow(1 - uzel, 3)) + 0.06 * Math.sin(Math.PI * uzel);
  const [ux, uy] = UZEL;
  return {
    latka: { d },
    vzor: { patternTransform: vzor },
    tvar: { d, opacity: o3(0.1 + 0.9 * plynule(0.35, 0.95, T)) },
    zahyby: { opacity: o3(plynule(0.7, 0.96, T)) },
    uzel: { opacity: o3(omez(uzel * 1.5)), transform: `translate(${f(ux)} ${f(uy)}) scale(${o3(meritko)}) translate(${f(-ux)} ${f(-uy)})` },
    kryt: { d: hranaKrytu(kryt(T)) },
    krytHrana: { d: hranaKrytu(kryt(T), true), opacity: o3(plynule(0.2, 0.3, T) * (1 - plynule(0.68, 0.76, T))) },
    stinUzlu: { opacity: o3(plynule(0.4, 1, T)) },
    okno: { opacity: o3(1 - plynule(0.15, 0.45, T)) },
    objem: { d, opacity: o3(plynule(0.3, 0.9, T)) },
    vrasky: { opacity: o3(1 - plynule(0.02, 0.25, T)) },
    kus: { opacity: o3(1 - plynule(0.56, 0.76, T)) },
    /* Látka přes hrnek je potřeba jen, dokud je hrnek vidět — pak by zakryla uzel a záhyby */
    predni: { opacity: o3(1 - plynule(0.74, 0.8, T)) },
  };
}

const df = (A: Record<string, Atributy>, klic: string) =>
  `data-f="${klic}" ${Object.entries(A[klic]).map(([a, v]) => `${a}="${v}"`).join(" ")}`;

/** Střed uzlu nad hrnkem */
const UZEL: Bod = [0, -8];

/** Vzor seigaiha — vlny moře jako šátek v krámku, v milimetrech */
function vlny(id: string, A: Record<string, Atributy>): string {
  const r = 13;
  const vlna = (cx: number, cy: number) =>
    `<path d="M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy} Z" fill="#2E4A78"/>` +
    `<path d="M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy} M${f(cx - r * 0.7)} ${cy} A${f(r * 0.7)} ${f(r * 0.7)} 0 0 1 ${f(cx + r * 0.7)} ${cy} M${f(cx - r * 0.4)} ${cy} A${f(r * 0.4)} ${f(r * 0.4)} 0 0 1 ${f(cx + r * 0.4)} ${cy}" fill="none" stroke="#E9DFC6" stroke-width="0.9" opacity="0.9"/>`;
  return (
    `<pattern id="${id}" ${df(A, "vzor")} width="${2 * r}" height="${r}" patternUnits="userSpaceOnUse">` +
    `<rect width="${2 * r}" height="${r}" fill="#2E4A78"/>${vlna(0, 0)}${vlna(2 * r, 0)}${vlna(r, r / 2)}${vlna(0, r)}${vlna(2 * r, r)}</pattern>`
  );
}

/**
 * Záhyby uzlíku: okraje bočních cípů od uzlu k zemi, přeložený přední cíp
 * pod uzlem a látka nabraná do uzlu. Tmavá čára je stín záhybu, světlá
 * vedle ní hrana, na kterou svítí okno zleva.
 */
function zahyby(): string {
  const cara = (body: Bod[]) => `M${f(body[0][0])} ${f(body[0][1])}${hladce(body)}`;
  const kraj = (body: Bod[], dx: number, sila = 1) =>
    `<path d="${cara(body)}" stroke="#101C34" stroke-width="2.6" fill="none" stroke-linecap="round" opacity="${o3(0.5 * sila)}"/>` +
    `<path d="${cara(body)}" stroke="#8FA9D6" stroke-width="1.2" fill="none" stroke-linecap="round" opacity="${o3(0.55 * sila)}" transform="translate(${dx} -1)"/>`;
  return (
    kraj([[-9, 0], [-25, 22], [-40, 52], [-48, 84]], 1.6) +
    kraj([[9, 0], [24, 22], [39, 52], [47, 84]], -1.6) +
    kraj([[-31, 7], [-16, 17], [0, 21], [16, 17], [31, 7]], 0, 0.85) +
    /* Látka nabraná do uzlu: krátké záhyby vějířem */
    kraj([[-7, 2], [-13, 8], [-20, 12]], 1, 0.6) +
    kraj([[7, 2], [13, 8], [20, 12]], -1, 0.6) +
    kraj([[-1, 4], [-1, 10]], 1, 0.5)
  );
}

/**
 * Celá kresba při stavu t: zadní vrstva (pod hrnkem) a přední (přes něj).
 * Obě mají viewBox SATEK_VIEWBOX; přední potřebuje obrys hrnku (podobizna
 * obrys()) pro masku — `obrysKusu` při buildu, skript ho při otočení přepíše.
 */
export function satekScena(t: number, obrysKusu: string, p = "ftz"): { zadni: string; predni: string } {
  const A = satekTvary(t);
  const { x: X0, y: Y0, w: W, h: H } = SATEK;
  const dz: string[] = [];
  const z: string[] = [];

  /* ——— Stůl: světlé dřevo, prkna napříč ——— */
  dz.push(`<linearGradient id="${p}-st" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D2B188"/><stop offset="0.55" stop-color="#C49E72"/><stop offset="1" stop-color="#AE875C"/></linearGradient>`);
  z.push(`<rect x="${X0 - 200}" y="${Y0}" width="${W + 400}" height="${H}" fill="url(#${p}-st)"/>`);
  let prkna = "";
  for (let w = -300; w <= 80; w += 72) prkna += `M${X0 - 200} ${f(PY + w * SN)} H${X0 + W + 200}`;
  z.push(`<path d="${prkna}" stroke="#8A6640" stroke-width="0.9" opacity="0.38"/><path d="${prkna}" stroke="#F2DCBA" stroke-width="0.7" opacity="0.38" transform="translate(0 0.9)"/>`);

  /* ——— Ranní světlo z okna: šikmý pás přes stůl i šátek, stíny příček ——— */
  const okno = [zem(-300, -240), zem(-70, -300), zem(150, 190), zem(-110, 230)];
  dz.push(`<linearGradient id="${p}-ok" gradientUnits="userSpaceOnUse" x1="${f(okno[0][0])}" y1="${f(okno[0][1])}" x2="${f(okno[2][0])}" y2="${f(okno[2][1])}"><stop offset="0" stop-color="#FFF4DC" stop-opacity="0.32"/><stop offset="0.65" stop-color="#FFF4DC" stop-opacity="0.16"/><stop offset="1" stop-color="#FFF4DC" stop-opacity="0"/></linearGradient>`);
  const oknoD = `M${okno.map((b) => `${f(b[0])} ${f(b[1])}`).join(" L")} Z`;
  /* Stíny dvou příček okna */
  let pricky = "";
  for (const k of [0.36, 0.68]) {
    const a = [okno[0][0] + (okno[1][0] - okno[0][0]) * k, okno[0][1] + (okno[1][1] - okno[0][1]) * k];
    const b = [okno[3][0] + (okno[2][0] - okno[3][0]) * k, okno[3][1] + (okno[2][1] - okno[3][1]) * k];
    pricky += `M${f(a[0])} ${f(a[1])} L${f(b[0])} ${f(b[1])}`;
  }
  pricky = `<path d="${pricky}" stroke="#2A1E14" stroke-width="2.4" opacity="0.06" stroke-linecap="round"/>`;

  /* ——— Šátek ——— */
  dz.push(vlny(`${p}-v`, A));
  /* Stín uzlíku na stole */
  dz.push(`<radialGradient id="${p}-su"><stop offset="0" stop-color="#1E1410" stop-opacity="0.45"/><stop offset="0.7" stop-color="#1E1410" stop-opacity="0.18"/><stop offset="1" stop-color="#1E1410" stop-opacity="0"/></radialGradient>`);
  z.push(`<path d="${oknoD}" fill="url(#${p}-ok)"/>${pricky}`);
  z.push(`<ellipse cx="16" cy="${f(PY + 6)}" rx="78" ry="22" fill="url(#${p}-su)" ${df(A, "stinUzlu")}/>`);
  z.push(`<path fill="url(#${p}-v)" ${df(A, "latka")}/>`);
  /* Měkké vrásky rozprostřené látky kolem patky */
  let vrasky = "";
  for (const [a, delka, sila] of [[200, 70, 0.16], [228, 54, 0.12], [320, 64, 0.14], [345, 80, 0.12], [150, 46, 0.1]] as [number, number, number][]) {
    const u = a * RAD;
    const a0 = zem(Math.cos(u) * 44, Math.sin(u) * 44);
    const a1 = zem(Math.cos(u + 0.12) * (44 + delka), Math.sin(u + 0.12) * (44 + delka));
    const m = zem(Math.cos(u + 0.05) * (44 + delka / 2), Math.sin(u + 0.05) * (44 + delka / 2));
    vrasky += `<path d="M${f(a0[0])} ${f(a0[1])} Q${f(m[0])} ${f(m[1])} ${f(a1[0])} ${f(a1[1])}" stroke="#0F1C33" stroke-width="3.2" stroke-linecap="round" fill="none" opacity="${sila}"/>`;
    vrasky += `<path d="M${f(a0[0])} ${f(a0[1] - 1.6)} Q${f(m[0])} ${f(m[1] - 1.6)} ${f(a1[0])} ${f(a1[1] - 1.6)}" stroke="#8FA8D4" stroke-width="1.4" stroke-linecap="round" fill="none" opacity="${o3(sila * 1.4)}"/>`;
  }
  z.push(`<g ${df(A, "vrasky")}>${vrasky}</g>`);
  /* Tvar uzlíku: světlo zleva, vpravo a dole stín */
  dz.push(`<linearGradient id="${p}-tv" gradientUnits="userSpaceOnUse" x1="-60" y1="0" x2="60" y2="0"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.16"/><stop offset="0.38" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="0.66" stop-color="#0A1428" stop-opacity="0.14"/><stop offset="1" stop-color="#0A1428" stop-opacity="0.46"/></linearGradient>`);
  dz.push(`<linearGradient id="${p}-tz" gradientUnits="userSpaceOnUse" x1="0" y1="20" x2="0" y2="100"><stop offset="0" stop-color="#0A1428" stop-opacity="0"/><stop offset="1" stop-color="#0A1428" stop-opacity="0.32"/></linearGradient>`);
  dz.push(`<radialGradient id="${p}-ob" gradientUnits="userSpaceOnUse" cx="-16" cy="26" r="78"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.13"/><stop offset="0.45" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="0.8" stop-color="#0A1428" stop-opacity="0.12"/><stop offset="1" stop-color="#0A1428" stop-opacity="0.34"/></radialGradient>`);
  z.push(`<path fill="url(#${p}-tv)" ${df(A, "tvar")}/><path fill="url(#${p}-tz)" ${df(A, "tvar")}/><path fill="url(#${p}-ob)" ${df(A, "objem")}/>`);
  /* Světlo na rozprostřené látce; jak se látka zvedá, ležící pruh světla z ní zmizí */
  z.push(`<g ${df(A, "okno")}><path d="${oknoD}" fill="url(#${p}-ok)"/>${pricky}</g>`);
  z.push(`<g ${df(A, "zahyby")}>${zahyby()}</g>`);

  /* ——— Uzel: dvě smyčky přes sebe mezi ušima, naskočí nakonec ——— */
  const [ux, uy] = UZEL;
  /* Smyčka: nabraná látka je v záhybech tmavší, okraj ve stínu */
  const smycka = (dx: number, uhel: number, tma: number) => {
    const el = `cx="${f(ux + dx)}" cy="${f(uy)}" rx="11" ry="8.6" transform="rotate(${uhel} ${f(ux + dx)} ${f(uy)})"`;
    return (
      `<ellipse ${el} fill="url(#${p}-v)"/>` +
      `<ellipse ${el} fill="#0A1428" opacity="${tma}"/>` +
      `<ellipse ${el} fill="url(#${p}-tv)"/>` +
      `<ellipse ${el} fill="none" stroke="#0E1A30" stroke-width="1.3" opacity="0.55"/>`
    );
  };
  z.push(
    `<g ${df(A, "uzel")}>` +
      `<ellipse cx="${f(ux + 1.5)}" cy="${f(uy + 5)}" rx="17" ry="10" fill="#0A1428" opacity="0.34"/>` +
      smycka(-5, -18, 0.26) +
      `<path d="M${f(ux - 13)} ${f(uy + 3)} Q${f(ux - 7)} ${f(uy + 9)} ${f(ux + 1)} ${f(uy + 6)}" stroke="#101C34" stroke-width="1.6" fill="none" stroke-linecap="round" opacity="0.5"/>` +
      smycka(5, 16, 0.12) +
      `<path d="M${f(ux - 4)} ${f(uy - 6)} Q${f(ux + 4)} ${f(uy - 10.5)} ${f(ux + 13)} ${f(uy - 4)}" stroke="#B9CBEA" stroke-width="1.8" fill="none" stroke-linecap="round" opacity="0.85"/>` +
      `<path d="M${f(ux - 3)} ${f(uy + 6)} Q${f(ux + 6)} ${f(uy + 10)} ${f(ux + 14)} ${f(uy + 3)}" stroke="#101C34" stroke-width="1.8" fill="none" stroke-linecap="round" opacity="0.55"/>` +
      `<path d="M${f(ux - 1)} ${f(uy - 7.5)} Q${f(ux - 4)} ${f(uy)} ${f(ux - 1)} ${f(uy + 7)}" stroke="#101C34" stroke-width="1.3" fill="none" stroke-linecap="round" opacity="0.4"/>` +
      `</g>`,
  );

  /* ——— Přední vrstva: látka přes hrnek, jen pod čarou, kam už vystoupala ——— */
  const dp =
    `<clipPath id="${p}-pod"><path ${df(A, "kryt")}/></clipPath>` +
    `<mask id="${p}-m" maskUnits="userSpaceOnUse" x="${X0}" y="${Y0}" width="${W}" height="${H}">` +
    `<g clip-path="url(#${p}-pod)"><path class="${p}-obrys" d="${obrysKusu}" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="1.4" stroke-linejoin="round"/></g></mask>`;
  /* Hrana látky: nahoře se blýskne, pod ní stín na hrnku */
  const predniObsah =
    `<g ${df(A, "predni")} mask="url(#${p}-m)"><path fill="url(#${p}-v)" ${df(A, "latka")}/><path fill="url(#${p}-tv)" ${df(A, "tvar")}/><path fill="url(#${p}-tz)" ${df(A, "tvar")}/>` +
    `<path fill="none" stroke="#101C34" stroke-width="2.4" ${df(A, "krytHrana")} transform="translate(0 1.6)"/><path fill="none" stroke="#8FA9D6" stroke-width="1.1" ${df(A, "krytHrana")}/></g>`;

  const zadni = `<svg viewBox="${SATEK_VIEWBOX}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><defs>${dz.join("")}</defs>${z.join("")}</svg>`;
  const predni = `<svg viewBox="${SATEK_VIEWBOX}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><defs>${dp}</defs>${predniObsah}</svg>`;
  return { zadni, predni };
}

