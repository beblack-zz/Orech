/**
 * 三 Oheň — Futatsu v peci. Kresby kapitoly Oheň na stránce /obchod/futatsu.
 *
 * Díváme se do komory elektrické pece, jako by přední stěna byla pryč.
 * Futatsu stojí na šamotové desce, za ním je zadní stěna z izolačních
 * cihel se dvěma drážkami a spirálami topného drátu, z ní trčí termočlánek,
 * po stranách stojí sloupky další police a vlevo vzadu žároměrky
 * (dilna/kresba/pec.ts). Hrnek sám je podobizna (podobizna.ts) a leží nad
 * kresbou jako HTML, aby šel otáčet.
 *
 *   stavVypalu(h)     co je v peci v hodině h od zapnutí: teplota stěn,
 *                     spirál a hrnku, světlo shora, glazura, krakelé
 *   barvyVypalu(s)    všechno, co se s hodinou mění, jako atributy prvků
 *                     s data-z — build z nich kreslí, skript je přepisuje
 *   pecScena(s, p)    komora pece (viewBox SCENA)
 *   kusVrstva(…)      vrstva přes hrnek: tma, žár přes obrys(), lesk
 *                     roztavené glazury a jiskřičky, když praská krakelé
 *   krivkaPasek(…)    pálicí křivka jako jezdec, čas vodorovně
 *
 * Křivka, barva i síla žáru jsou tytéž jako na Dílně (krivka.ts): do pěti
 * set stupňů je v peci tma, pak třešňová, oranžová a nahoře žlutobílá.
 * Spirály topí napřed a hrnek se prohřívá pozadu — proti stěně stojí jako
 * stín a na vrcholu s pecí splyne. Na začátku a ráno je víko otevřené
 * a do komory padá denní světlo shora.
 */
import { barvaZaru, silaZaru, teplotaV, T_TOP, T_KONEC } from "../../dilna/kresba/krivka";
import { zaromerky } from "../../dilna/kresba/pec";
import { f, smichej, omez, hladce } from "../../dilna/kresba/zaklad";
import type { Bod } from "../../dilna/kresba/zaklad";
import { PODOBIZNA, obrys } from "./podobizna";
import { Rout, rng } from "./tvar";

const RAD = Math.PI / 180;
const plynule = (a: number, b: number, t: number) => {
  const u = omez((t - a) / (b - a));
  return u * u * (3 - 2 * u);
};
/** Průhlednosti a offsety potřebují víc než desetiny */
const o3 = (n: number) => (Math.round(n * 1000) / 1000).toString();
const xy = (b: Bod) => `${f(b[0])} ${f(b[1])}`;
const hladka = (body: Bod[]) => `M${xy(body[0])}${hladce(body)}`;

/* ═══════════════ Co se v peci děje ═══════════════ */

export interface StavVypalu {
  /** Hodina od zapnutí, 0 … T_KONEC (ráno) */
  h: number;
  /** Teplota stěn, spirál a hrnku */
  T: number;
  Ts: number;
  Tk: number;
  /** Světlo shora — otevřené víko na začátku a ráno */
  lampa: number;
  /** Tma zavřené pece: kolik ubrat světla všemu, co samo nesvítí (hrnek ji dostane jako filtr jasu) */
  tma: number;
  /** Glazura 0 = syrová … 1 = hotová (podobizna) */
  vypal: number;
  /** Lesk roztavené glazury */
  lesk: number;
  /** Krakelé 0 … 1 — praská při chladnutí */
  krak: number;
  /** Žároměrky 0 … 1 (pec.ts) */
  ohnuti: number;
}

export function stavVypalu(hodina: number): StavVypalu {
  const h = omez(hodina, 0, T_KONEC);
  const T = teplotaV(h);
  const nahoru = h < T_TOP;
  /* Spirály topí napřed, na vrcholu se stěnami srovnají; při chladnutí jsou vypnuté */
  const Ts = nahoru ? T + 170 * plynule(0.5, 2, h) * (1 - 0.82 * plynule(9.4, 11, h)) : T - 30 * plynule(T_TOP, T_TOP + 1, h);
  /* Hrnek se prohřívá pozadu — dokud se nesrovná, je proti stěně tmavší */
  const Tk = nahoru ? T - 150 * plynule(1.2, 3.5, h) * (1 - plynule(8.6, 10.7, h)) : T - 35 * plynule(T_TOP, T_TOP + 2, h);
  const lampa = h < 2 ? 1 - plynule(0.2, 0.95, h) : plynule(22.7, 23.85, h);
  const vypal = nahoru ? plynule(1150, 1270, T) : 1;
  const lesk = nahoru ? plynule(1215, 1275, T) : plynule(960, 1200, T);
  const krak = plynule(19.4, 23.5, h);
  const ohnuti = plynule(1172, 1288, nahoru ? T : 1280);
  return { h, T, Ts, Tk, lampa, tma: 0.66 * (1 - lampa), vypal, lesk, krak, ohnuti };
}

type Atributy = Record<string, string>;

/**
 * Barvy a průhlednosti podle stavu. Klíč je data-z prvku, hodnota jeho
 * atributy. Tma leží přes celou kresbu (víko zavřené, nic nesvítí), žár
 * přes ni — co samo svítí, tma neztlumí.
 */
export function barvyVypalu(s: StavVypalu): Record<string, Atributy> {
  const g = silaZaru(s.T);
  const gs = silaZaru(s.Ts);
  const gk = silaZaru(s.Tk);
  return {
    tma: { opacity: o3(s.tma) },
    lampa: { opacity: o3(s.lampa) },
    zar: { opacity: o3(0.8 * Math.pow(g, 0.85)) },
    zs0: { "stop-color": barvaZaru(s.T + 30) },
    zs1: { "stop-color": barvaZaru(s.T - 40) },
    zs2: { "stop-color": barvaZaru(s.T - 190) },
    /* Spáry a drážky žhnou o kus tmavěji — cihly jsou vidět i v plném žáru */
    spara: { stroke: barvaZaru(s.T - 300), opacity: o3(0.5 * g) },
    drazka: { fill: barvaZaru(s.T - 220), opacity: o3(0.62 * g) },
    svit: { stroke: barvaZaru(s.Ts - 60), opacity: o3(0.16 * gs) },
    svit2: { stroke: barvaZaru(s.Ts - 20), opacity: o3(0.22 * gs) },
    svit3: { stroke: barvaZaru(s.Ts + 20), opacity: o3(0.34 * gs) },
    spir: { stroke: barvaZaru(s.Ts + 70), opacity: o3(omez(gs * 2.2)) },
    termo: { stroke: barvaZaru(s.T + 10), opacity: o3(0.7 * g) },
    kuzelZar: { opacity: o3(g) },
    kz0: { "stop-color": barvaZaru(s.Tk + 20) },
    kz1: { "stop-color": barvaZaru(s.Tk - 70) },
    kusZar: { opacity: o3(0.95 * Math.pow(gk, 0.62)) },
    lesk: { opacity: o3(0.75 * s.lesk * Math.max(gk, 0.25)) },
    /* Stín pod hrnkem (kreslí ho podobizna) v žáru přesvítí deska */
    stinZar: { opacity: o3(0.85 * Math.pow(g, 0.85)) },
    sz0: { "stop-color": barvaZaru(s.T - 40) },
    sz1: { "stop-color": barvaZaru(s.T - 40) },
  };
}

/** Atributy prvku: data-z a hodnoty pro daný stav */
const dz = (Z: Record<string, Atributy>, klic: string) =>
  `data-z="${klic}" ${Object.entries(Z[klic]).map(([a, v]) => `${a}="${v}"`).join(" ")}`;

/* ═══════════════ Komora pece ═══════════════ */

/** Kresba komory: jednotky obrazu, hrnek stojí v (X0, Y0) */
export const SCENA = { W: 1200, H: 800 };
/** Jednotek obrazu na milimetr */
const K = 5;
/** Díváme se trochu shora; hrnek (podobizna) víc, ať je vidět dovnitř */
const POHLED = 15;
export const NADHLED_OHEN = 20;
const SE = Math.sin(POHLED * RAD);
const CE = Math.cos(POHLED * RAD);
const X0 = 600;
const Y0 = 700;
/** 3D bod komory v mm: x doprava, h nahoru od desky, z k nám; hrnek stojí v počátku */
const P3 = (x: number, h: number, z: number): Bod => [X0 + x * K, Y0 + (z * SE - h * CE) * K];
/** Líc zadní stěny a šamotová deska */
const RI = 225;
const RS = 206;
/** Drážky se spirálami: v každé řadě cihel jedna, uprostřed */
const DRAZKY = [16, 68];
const SPARY = [-10, 42, 94];
/** Bod na zadní stěně: t = úhel od středu vzadu (stupně, + vpravo), r = poloměr */
const naStene = (t: number, h: number, r = RI): Bod => P3(r * Math.sin(t * RAD), h, -r * Math.cos(t * RAD));
/** Vodorovná kružnice na stěně jako křivka přes obraz */
const oblouk = (h: number, r = RI, t0 = -40, t1 = 40, krok = 4) => {
  const body: Bod[] = [];
  for (let t = t0; t <= t1 + 1e-6; t += krok) body.push(naStene(t, h, r));
  return body;
};

/** Kde leží rámeček podobizny v obraze kresby — stránka podle něj klade hrnek */
export const KUS_OHEN = {
  x: X0 + PODOBIZNA.x * K,
  y: Y0 + (PODOBIZNA.y - PODOBIZNA.pata[1]) * K,
  w: PODOBIZNA.w * K,
  h: PODOBIZNA.h * K,
};

/**
 * Spirála topného drátu v drážce: smyčky (trochoida) podél oblouku,
 * jako na Dílně. Drát leží kousek zapuštěný ve stěně.
 */
function spirala(hg: number): string {
  const r = RI + 6;
  const krok = 5.6;
  const body: Bod[] = [];
  const t0 = -42;
  const t1 = 42;
  const delka = (t1 - t0) * RAD * r;
  const n = Math.round((delka / krok) * 6);
  for (let i = 0; i <= n; i++) {
    const s = (i / n) * delka;
    const t = t0 + s / r / RAD;
    const c = naStene(t, hg, r);
    const d = naStene(t + 0.5, hg, r);
    const tx = d[0] - c[0];
    const ty = d[1] - c[1];
    const l = Math.hypot(tx, ty) || 1;
    const ux = tx / l;
    const uy = ty / l;
    const fi = (2 * Math.PI * s) / krok;
    const a = 1.7 * K * Math.sin(fi);
    const b = 3.9 * K * CE * Math.cos(fi);
    body.push([c[0] + ux * a + uy * b, c[1] + uy * a - ux * b]);
  }
  return hladka(body);
}

/** Válcový sloupek na desce: stínovaný válec od desky nahoru ven z obrazu */
function sloupek(x: number, z: number, p: string): string {
  const r = 13;
  const [cx, y0] = P3(x, 0, z);
  const rx = r * K;
  const ry = r * K * SE;
  const yT = -40;
  let o = `<ellipse cx="${f(cx + 10)}" cy="${f(y0 + 8)}" rx="${f(rx * 1.6)}" ry="${f(ry * 1.7)}" fill="url(#${p}-sst)"/>`;
  o += `<path d="M${f(cx - rx)} ${yT} V${f(y0)} A${f(rx)} ${f(ry)} 0 0 0 ${f(cx + rx)} ${f(y0)} V${yT} Z" fill="url(#${p}-sl)"/>`;
  /* Spoj s deskou a jemné vodorovné spáry po lisování */
  o += `<path d="M${f(cx - rx)} ${f(y0)} A${f(rx)} ${f(ry)} 0 0 0 ${f(cx + rx)} ${f(y0)}" stroke="#3A2A1E" stroke-width="3" fill="none" opacity="0.22"/>`;
  for (const hh of [40, 92]) {
    const yy = P3(x, hh, z)[1];
    o += `<path d="M${f(cx - rx)} ${f(yy)} A${f(rx)} ${f(ry)} 0 0 0 ${f(cx + rx)} ${f(yy)}" stroke="#8E7A60" stroke-width="1.6" fill="none" opacity="0.35"/>`;
  }
  return o;
}

/** Stará kapka glazury na desce — z dřívějších výpalů, plochá a lesklá */
function kapka(x: number, z: number, r: number, barva: string): string {
  const [cx, cy] = P3(x, 0, z);
  const rx = r * K;
  const ry = r * K * SE;
  return (
    `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${barva}" opacity="0.75"/>` +
    `<ellipse cx="${f(cx - rx * 0.3)}" cy="${f(cy - ry * 0.35)}" rx="${f(rx * 0.35)}" ry="${f(ry * 0.3)}" fill="#FFFFFF" opacity="0.35"/>`
  );
}

/**
 * Žároměrky (pec.ts) usazené na desce: vnitřek skupiny `${p}-kuzely`.
 * Skript je přes to překreslí, když se ohýbají.
 */
export function kuzely(s: StavVypalu, p = "fto"): string {
  const Z = barvyVypalu(s);
  const [zx, zy] = P3(-72, 0, -30);
  const sz = 0.89;
  return zaromerky(s.ohnuti, p)
    .replace(`class="${p}-zar"`, `class="${p}-zar" ${dz(Z, "kuzelZar")}`)
    .replace(`<svg viewBox="0 0 300 220"`, `<svg x="${f(zx - 150 * sz)}" y="${f(zy - 196 * sz)}" width="${f(300 * sz)}" height="${f(220 * sz)}" viewBox="0 0 300 220" overflow="visible"`);
}

/** Kdy praskne krakelé: hodiny, ve kterých při chladnutí cinkne (a zajiskří) */
export const CINKNUTI: number[] = (() => {
  const h: number[] = [];
  const n = 9;
  for (let i = 0; i < n; i++) {
    const cil = (i + 0.6) / n;
    let lo = 19.4;
    let hi = 23.5;
    for (let k = 0; k < 30; k++) {
      const mid = (lo + hi) / 2;
      if (stavVypalu(mid).krak < cil) lo = mid;
      else hi = mid;
    }
    h.push((lo + hi) / 2);
  }
  return h;
})();

/** Jak se fáze výpalu jmenuje pod velkým číslem */
export function fazeVypalu(h: number): string {
  if (h < 0.5) return "víko je otevřené";
  if (h < T_TOP - 0.8) return "pec topí";
  if (h <= T_TOP) return "drží se";
  if (h < 23.2) return "pec chladne";
  return "ráno, víko nahoře";
}

/**
 * Komora pece při stavu s. Pozadí je průhledné jen mimo kresbu — celý
 * obraz vyplňuje stěna a deska. Hrnek se kreslí zvlášť (KUS_OHEN).
 */
export function pecScena(s: StavVypalu, p = "fto"): string {
  const Z = barvyVypalu(s);
  const { W, H } = SCENA;
  const defs: string[] = [];
  const o: string[] = [];

  /* ——— Zadní stěna: cihly za denního světla, ke krajům se stáčí do stínu ——— */
  defs.push(
    `<linearGradient id="${p}-st" x1="0" y1="0" x2="1" y2="0">` +
      `<stop offset="0" stop-color="#9C8668"/><stop offset="0.24" stop-color="#C6B193"/><stop offset="0.5" stop-color="#D6C3A6"/>` +
      `<stop offset="0.76" stop-color="#C6B193"/><stop offset="1" stop-color="#8E785C"/></linearGradient>`,
  );
  defs.push(
    `<linearGradient id="${p}-stv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF6E6" stop-opacity="0.22"/><stop offset="0.45" stop-color="#FFF6E6" stop-opacity="0"/><stop offset="0.75" stop-color="#2A1C12" stop-opacity="0"/><stop offset="1" stop-color="#2A1C12" stop-opacity="0.25"/></linearGradient>`,
  );
  o.push(`<rect width="${W}" height="${H}" fill="url(#${p}-st)"/>`);
  o.push(`<rect width="${W}" height="${H}" fill="url(#${p}-stv)"/>`);

  /* Spáry: řady cihel (vodorovné oblouky) a svislé spoje vystřídané po půlce cihly.
     V každé řadě je uprostřed drážka, spoj přes ni nevede. */
  let spary = "";
  for (const hh of SPARY) spary += hladka(oblouk(hh, RI, -46, 46));
  let svisle = "";
  for (let k = 0; k < SPARY.length - 1; k++) {
    const h0 = SPARY[k];
    const h1 = SPARY[k + 1];
    const hg = DRAZKY[k];
    for (let j = -2; j <= 2; j++) {
      const t = (j + (k % 2 ? 0.5 : 0)) * 29;
      if (Math.abs(t) > 46) continue;
      const kusy = hg === undefined ? [[h0, h1]] : [[h0, hg - 8], [hg + 8, h1]];
      for (const [u, v] of kusy) svisle += `M${xy(naStene(t, u + 0.8))} L${xy(naStene(t, v - 0.8))}`;
    }
  }
  /* Každá cihla má trochu jiný tón — žádná textura, jen pár odstínů */
  const rc = rng(17);
  let cihly = "";
  for (let k = 0; k < SPARY.length - 1; k++) {
    const hg = DRAZKY[k];
    for (let j = -3; j <= 2; j++) {
      const t0 = (j + (k % 2 ? 0.5 : 0)) * 29;
      const t1 = t0 + 29;
      for (const [u, v] of [[SPARY[k], hg - 8], [hg + 8, SPARY[k + 1]]]) {
        const tvar = [...oblouk(u + 0.8, RI, t0, t1, 2), ...oblouk(v - 0.8, RI, t0, t1, 2).reverse()];
        const svetla = rc() > 0.5;
        cihly += `<path d="M${tvar.map(xy).join(" L")} Z" fill="${svetla ? "#FFF8EA" : "#4A3624"}" opacity="${o3(0.03 + rc() * 0.06)}"/>`;
      }
    }
  }
  o.push(cihly);
  o.push(`<path d="${spary}" stroke="#9A8263" stroke-width="2.6" fill="none" opacity="0.7"/>`);
  o.push(`<path d="${svisle}" stroke="#9A8263" stroke-width="2.4" fill="none" opacity="0.55"/>`);
  /* Hrana cihly pod spárou chytá světlo shora */
  o.push(`<path d="${spary}" stroke="#F4E8D2" stroke-width="1.8" fill="none" opacity="0.4" transform="translate(0 3.2)"/>`);

  /* Drážky se spirálami */
  let drazky = "";
  let studene = "";
  let zhave = "";
  let svit = "";
  const drazka = (hg: number) => {
    const horni = oblouk(hg + 8, RI, -46, 46);
    const dolni = oblouk(hg - 8, RI, -46, 46);
    return `${hladka(horni)} L${xy(dolni[dolni.length - 1])}${hladce([...dolni].reverse())} Z`;
  };
  DRAZKY.forEach((hg, i) => {
    drazky += `<path d="${drazka(hg)}" fill="#7E6648"/>`;
    /* Pod horní hranou drážky stín, spodní hrana na světle */
    drazky += `<path d="${hladka(oblouk(hg + 5.5, RI, -46, 46))}" stroke="#4A3626" stroke-width="${f(5 * K * CE)}" fill="none" opacity="0.55"/>`;
    drazky += `<path d="${hladka(oblouk(hg - 7.6, RI, -46, 46))}" stroke="#E9DBC2" stroke-width="2.4" fill="none" opacity="0.55"/>`;
    const sid = `${p}-sp${i}`;
    defs.push(`<path id="${sid}" d="${spirala(hg)}"/>`);
    studene += `<use href="#${sid}" stroke="#6E655D" stroke-width="${f(1.15 * K)}" fill="none" stroke-linecap="round"/>`;
    studene += `<use href="#${sid}" stroke="#CFC6BA" stroke-width="${f(0.4 * K)}" fill="none" opacity="0.65" transform="translate(-1.2 -1.5)"/>`;
    /* Záře kolem drátu: tři pásy přes sebe dají měkký kraj bez filtru */
    const osa = hladka(oblouk(hg, RI, -46, 46));
    svit += `<path d="${osa}" stroke-width="${f(34 * K * CE)}" fill="none" ${dz(Z, "svit")}/>`;
    svit += `<path d="${osa}" stroke-width="${f(21 * K * CE)}" fill="none" ${dz(Z, "svit2")}/>`;
    svit += `<path d="${osa}" stroke-width="${f(10 * K * CE)}" fill="none" ${dz(Z, "svit3")}/>`;
    zhave += `<use href="#${sid}" stroke-width="${f(1.15 * K)}" fill="none" stroke-linecap="round" ${dz(Z, "spir")}/>`;
  });
  o.push(drazky, studene);

  /* Termočlánek: keramická trubička trčí ze stěny vlevo nahoře */
  const tA = naStene(-16, 50);
  const tB = P3(-RI * Math.sin(16 * RAD) + 30 * Math.sin(16 * RAD), 50, -RI * Math.cos(16 * RAD) + 30 * Math.cos(16 * RAD));
  const termo = `M${xy(tA)} L${xy(tB)}`;
  o.push(`<path d="M${xy([tA[0] + 4, tA[1] + 9])} L${xy([tB[0] + 4, tB[1] + 12])}" stroke="#2A1C12" stroke-width="${f(7 * K)}" stroke-linecap="round" opacity="0.18"/>`);
  o.push(`<path d="${termo}" stroke="#E9E1D2" stroke-width="${f(3.6 * K)}" stroke-linecap="round"/>`);
  o.push(`<path d="${termo}" stroke="#FFFFFF" stroke-width="${f(1.1 * K)}" stroke-linecap="round" opacity="0.7" transform="translate(-2 -4)"/>`);
  o.push(`<ellipse cx="${f(tA[0])}" cy="${f(tA[1])}" rx="${f(4.4 * K)}" ry="${f(5.2 * K)}" fill="#5A4632" opacity="0.55"/>`);

  /* Hloubka za deskou: stěna jde dolů do tmy */
  const hranaDesky: Bod[] = [];
  for (let t = -48; t <= 48; t += 4) hranaDesky.push(P3(RS * Math.sin(t * RAD), 0, -RS * Math.cos(t * RAD)));
  defs.push(`<linearGradient id="${p}-hl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3A2A1E" stop-opacity="0"/><stop offset="1" stop-color="#1E140E" stop-opacity="0.85"/></linearGradient>`);
  o.push(`<path d="${hladka(oblouk(12, RI, -48, 48))} L${xy(hranaDesky[hranaDesky.length - 1])}${hladce([...hranaDesky].reverse())} Z" fill="url(#${p}-hl)"/>`);
  /* Stěna nad deskou — jen tam žhnou spáry a drážky */
  defs.push(`<clipPath id="${p}-zed"><path d="M-60 -60 L${xy(hranaDesky[0])}${hladce(hranaDesky)} L${W + 60} -60 Z"/></clipPath>`);

  /* ——— Šamotová deska ——— */
  const [dcx, dcy] = P3(0, 0, 0);
  defs.push(
    `<radialGradient id="${p}-ds" gradientUnits="userSpaceOnUse" cx="${f(dcx)}" cy="${f(dcy - 30)}" r="${f(RS * K)}" gradientTransform="translate(${f(dcx)} ${f(dcy - 30)}) scale(1 ${o3(SE * 1.9)}) translate(${f(-dcx)} ${f(-dcy + 30)})">` +
      `<stop offset="0" stop-color="#EADFCB"/><stop offset="0.45" stop-color="#DACCB2"/><stop offset="0.8" stop-color="#C1AF92"/><stop offset="1" stop-color="#A8957A"/></radialGradient>`,
  );
  o.push(`<ellipse cx="${f(dcx)}" cy="${f(dcy)}" rx="${f(RS * K)}" ry="${f(RS * K * SE)}" fill="url(#${p}-ds)"/>`);
  /* Zadní hrana desky se blýskne */
  o.push(`<path d="${hladka(hranaDesky)}" stroke="#F6EEDF" stroke-width="2.6" fill="none" opacity="0.7"/>`);
  o.push(kapka(-46, 66, 5.2, "#5E3A22"), kapka(58, -74, 3.8, "#8FA898"), kapka(104, 38, 2.6, "#EDE7DA"));

  /* Žároměrky vlevo vzadu — zrcadlově, ať je nejměkčí kužel blíž hrnku */
  const [zx] = P3(-72, 0, -30);
  o.push(`<g class="${p}-kuzely" transform="translate(${f(zx)} 0) scale(-1 1) translate(${f(-zx)} 0)">${kuzely(s, p)}</g>`);

  /* Sloupky další police po stranách */
  defs.push(
    `<linearGradient id="${p}-sl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7C6A52"/><stop offset="0.16" stop-color="#B9A585"/>` +
      `<stop offset="0.36" stop-color="#E4D5BC"/><stop offset="0.5" stop-color="#D3C1A3"/><stop offset="0.84" stop-color="#9C876A"/><stop offset="1" stop-color="#6E5C46"/></linearGradient>`,
  );
  defs.push(`<radialGradient id="${p}-sst"><stop offset="0" stop-color="#2A1C12" stop-opacity="0.4"/><stop offset="1" stop-color="#2A1C12" stop-opacity="0"/></radialGradient>`);
  o.push(sloupek(-114, -150, p), sloupek(114, -150, p));

  /* ——— Světlo shora: otevřené víko ——— */
  defs.push(`<linearGradient id="${p}-lp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF8EC" stop-opacity="0.3"/><stop offset="0.55" stop-color="#FFF8EC" stop-opacity="0.08"/><stop offset="1" stop-color="#FFF8EC" stop-opacity="0"/></linearGradient>`);
  o.push(`<rect width="${W}" height="${H}" fill="url(#${p}-lp)" ${dz(Z, "lampa")}/>`);

  /* ——— Tma: zavřené víko, nic nesvítí ——— */
  o.push(`<rect width="${W}" height="${H}" fill="#0A0812" ${dz(Z, "tma")}/>`);

  /* ——— Žár: přes tmu, protože svítí sám ——— */
  defs.push(
    `<radialGradient id="${p}-zs" gradientUnits="userSpaceOnUse" cx="${X0}" cy="300" r="820" gradientTransform="translate(${X0} 300) scale(1 0.78) translate(${-X0} -300)">` +
      `<stop offset="0" ${dz(Z, "zs0")}/><stop offset="0.55" ${dz(Z, "zs1")}/><stop offset="1" ${dz(Z, "zs2")}/></radialGradient>`,
  );
  const naZdi = [
    `<path d="${spary}" stroke-width="2.6" fill="none" ${dz(Z, "spara")}/>`,
    `<path d="${svisle}" stroke-width="2.4" fill="none" ${dz(Z, "spara")}/>`,
    ...DRAZKY.map((hg) => `<path d="${drazka(hg)}" ${dz(Z, "drazka")}/>`),
  ];
  o.push(`<g ${dz(Z, "zar")}><rect width="${W}" height="${H}" fill="url(#${p}-zs)"/><g clip-path="url(#${p}-zed)">${naZdi.join("")}</g></g>`);
  o.push(`<path d="${termo}" stroke-width="${f(3.6 * K)}" stroke-linecap="round" fill="none" ${dz(Z, "termo")}/>`);
  o.push(`<g class="${p}-spirala">${svit}${zhave}</g>`);

  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><defs>${defs.join("")}</defs>${o.join("")}</svg>`;
}

/* ═══════════════ Vrstva přes hrnek ═══════════════ */

/** Kde je v podobizně vnitřní okraj — elipsa, kterou se vidí dovnitř (pohled shora pod nadhledem) */
export function vnitrniOkraj(nadhled = NADHLED_OHEN) {
  const n = nadhled * RAD;
  const [, py] = PODOBIZNA.pata;
  const r = 38.6;
  return { cx: 0, cy: py - (76 - 1.7) * Math.cos(n), rx: r, ry: r * Math.sin(n) };
}

/**
 * Kde zajiskří cinknutí: body na protější vnitřní stěně, kam je vidět přes
 * okraj — krakelé je jen uvnitř (souřadnice podobizny). Síť prasklinek
 * kreslí podobizna sama.
 */
export function mistaJisker(nadhled = NADHLED_OHEN): Bod[] {
  const v = vnitrniOkraj(nadhled);
  const r = rng(31);
  const body: Bod[] = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 8 - 0.5) * 1.7 + (r() - 0.5) * 0.25;
    const b = -0.2 - r() * 0.55;
    body.push([v.cx + v.rx * 0.88 * Math.sin(a), v.cy + v.ry * b * Math.cos(a * 0.6)]);
  }
  return body;
}

/**
 * Lesk roztavené glazury: svislý pruh vlevo na boku, kde se v ní zrcadlí
 * spirály. Souřadnice podobizny.
 */
function leskPruh(nadhled: number): string {
  const n = nadhled * RAD;
  const [, py] = PODOBIZNA.pata;
  const levy: Bod[] = [];
  const pravy: Bod[] = [];
  for (let d = 6; d <= 62; d += 4) {
    const R = Rout(d);
    const y = py - (76 - d) * Math.cos(n);
    /* Pruh je uprostřed nejširší a ke koncům se ztrácí */
    const sir = 0.12 * Math.sin((Math.PI * (d - 6)) / 56) ** 0.7;
    const a0 = -0.72 - sir;
    const a1 = -0.72 + sir * 0.8;
    levy.push([R * a0, y + R * Math.sqrt(1 - a0 * a0) * Math.sin(n)]);
    pravy.push([R * a1, y + R * Math.sqrt(1 - a1 * a1) * Math.sin(n)]);
  }
  return `${hladka(levy)} L${xy(pravy[pravy.length - 1])}${hladce([...pravy].reverse())} Z`;
}

/** Kde leží stín podobizny na desce: elipsa kolem patky bez obrysu hrnku (evenodd) */
export const stinZarD = (obrysHrnku: string) => {
  const [, py] = PODOBIZNA.pata;
  const cx = 2.5;
  const cy = py + 0.6;
  const rx = 48;
  const ry = 16;
  return `M${cx - rx} ${cy} A${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z ${obrysHrnku}`;
};

/**
 * Vrstva přes podobiznu (viewBox PODOBIZNA): žár hrnku přes obrys(), lesk
 * roztavené glazury a jiskřičky cinknutí (skryté, dokud je skript
 * nerozsvítí). Tmu zavřené pece dostane podobizna jako filtr jasu
 * (StavVypalu.tma), přes obrys by kolem hrnku zůstala tmavá linka.
 * Třída `${p}-obrys` jde při otočení hrnku přepsat novým obrysem.
 */
export function kusVrstva(s: StavVypalu, uhel = 62, nadhled = NADHLED_OHEN, p = "fto-k"): string {
  const Z = barvyVypalu(s);
  const d = obrys({ uhel, nadhled });
  const defs =
    `<linearGradient id="${p}-z" gradientUnits="userSpaceOnUse" x1="-46" y1="0" x2="46" y2="0">` +
    `<stop offset="0" ${dz(Z, "kz1")}/><stop offset="0.42" ${dz(Z, "kz0")}/><stop offset="0.6" ${dz(Z, "kz0")}/><stop offset="1" ${dz(Z, "kz1")}/></linearGradient>` +
    `<linearGradient id="${p}-l" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFFDF2" stop-opacity="0"/><stop offset="0.5" stop-color="#FFFDF2" stop-opacity="0.6"/><stop offset="1" stop-color="#FFFDF2" stop-opacity="0"/></linearGradient>` +
    `<radialGradient id="${p}-s" gradientUnits="userSpaceOnUse" cx="2.5" cy="${PODOBIZNA.pata[1] + 0.6}" r="48" gradientTransform="translate(2.5 ${PODOBIZNA.pata[1] + 0.6}) scale(1 0.34) translate(-2.5 ${-(PODOBIZNA.pata[1] + 0.6)})">` +
    `<stop offset="0.55" ${dz(Z, "sz0")} stop-opacity="1"/><stop offset="1" ${dz(Z, "sz1")} stop-opacity="0"/></radialGradient>`;
  let jiskry = "";
  mistaJisker(nadhled).forEach(([x, y], i) => {
    jiskry +=
      `<g transform="translate(${x.toFixed(2)} ${y.toFixed(2)})"><g class="${p}-jiskra" data-i="${i}" opacity="0">` +
      `<circle r="3" fill="#FFF1C9" opacity="0.4"/>` +
      `<path d="M0 -3.2 L0.42 -0.42 L3.2 0 L0.42 0.42 L0 3.2 L-0.42 0.42 L-3.2 0 L-0.42 -0.42 Z" fill="#FFFDF4"/></g></g>`;
  });
  return (
    `<defs>${defs}</defs>` +
    `<path class="${p}-stinzar" d="${stinZarD(d)}" fill-rule="evenodd" fill="url(#${p}-s)" ${dz(Z, "stinZar")}/>` +
    `<path class="${p}-obrys" d="${d}" fill="url(#${p}-z)" stroke="url(#${p}-z)" stroke-width="1.1" stroke-linejoin="round" ${dz(Z, "kusZar")}/>` +
    `<path d="${leskPruh(nadhled)}" fill="url(#${p}-l)" ${dz(Z, "lesk")}/>` +
    `<g class="${p}-jiskry">${jiskry}</g>`
  );
}

/* ═══════════════ Pálicí křivka jako jezdec ═══════════════ */

/** Dvě rozvržení pásku: na šířku pod scénou a užší na telefon (větší písmo, kratší popisky) */
export const PASKY = {
  siroky: { W: 1200, H: 150, x0: 46, x1: 1154, y0: 128, y1: 28, pis: 1, nahoru: "nahoru — skoro celý den", dolu: "dolů — celou noc" },
  uzky: { W: 600, H: 170, x0: 26, x1: 574, y0: 142, y1: 34, pis: 1.3, nahoru: "nahoru celý den", dolu: "dolů celou noc" },
};
export type Pasek = (typeof PASKY)["siroky"];
export const kxPasek = (L: Pasek, h: number) => L.x0 + (h / T_KONEC) * (L.x1 - L.x0);
export const kyPasek = (L: Pasek, T: number) => L.y0 - (T / 1300) * (L.y0 - L.y1);
/** Hodina z vodorovné polohy v pásku (0 … 1 přes celou šířku) */
export const hodinaZ = (L: Pasek, podil: number) => omez((podil * L.W - L.x0) / (L.x1 - L.x0)) * T_KONEC;

/**
 * Pálicí křivka přes celou šířku: nahoru skoro celý den, dolů celou noc.
 * Čára má barvu žáru, chladnutí je čárkované. Tečky jsou zastavení,
 * kurzor (třída `${p}-kurzor`) posouvá skript.
 */
export function krivkaPasek(zastavky: number[], h = 0, uzky = false, p = "fto-kr"): string {
  const L = uzky ? PASKY.uzky : PASKY.siroky;
  const { W, H } = L;
  const X = (hh: number) => kxPasek(L, hh);
  const Y = (T: number) => kyPasek(L, T);
  const body: { h: number; x: number; y: number }[] = [];
  for (let hh = 0; hh <= T_KONEC + 1e-6; hh += 0.2) body.push({ h: hh, x: X(hh), y: Y(teplotaV(hh)) });
  for (const hh of [1.5, 2.5, 3.2, 5.5, 8.5, 10.3, 10.8, T_TOP]) {
    if (!body.some((b) => Math.abs(b.h - hh) < 1e-6)) body.push({ h: hh, x: X(hh), y: Y(teplotaV(hh)) });
  }
  body.sort((a, b) => a.h - b.h);
  const cara = (bb: typeof body) => bb.map((b, i) => `${i ? "L" : "M"}${f(b.x)} ${f(b.y)}`).join(" ");
  const nahoru = body.filter((b) => b.h <= T_TOP + 1e-6);
  const dolu = body.filter((b) => b.h >= T_TOP - 1e-6);
  const stopy: string[] = [];
  for (let hh = 0; hh <= T_KONEC; hh += 0.5) stopy.push(`<stop offset="${o3((X(hh) - L.x0) / (L.x1 - L.x0))}" stop-color="${barvaZaru(teplotaV(hh))}"/>`);
  const defs =
    `<linearGradient id="${p}-z" gradientUnits="userSpaceOnUse" x1="${L.x0}" y1="0" x2="${L.x1}" y2="0">${stopy.join("")}</linearGradient>` +
    `<radialGradient id="${p}-v"><stop offset="0" stop-color="#FFD976" stop-opacity="0.3"/><stop offset="0.5" stop-color="#F4852A" stop-opacity="0.1"/><stop offset="1" stop-color="#7E1D10" stop-opacity="0"/></radialGradient>`;
  const s: string[] = [];
  const k = L.pis;
  /* Noc nad chladnutím */
  s.push(`<rect x="${f(X(T_TOP))}" y="6" width="${f(W - X(T_TOP) - 4)}" height="${L.y0 + 8}" rx="12" fill="#0E0C1E" opacity="0.4"/>`);
  s.push(`<path d="M${L.x0} ${L.y0} H${L.x1}" stroke="#E8DCCB" stroke-width="1.5" opacity="0.3"/>`);
  for (let hh = 0; hh <= T_KONEC; hh += 2) {
    s.push(`<path d="M${f(X(hh))} ${L.y0} v${hh % 6 ? 5 : 9}" stroke="#E8DCCB" stroke-width="1.4" opacity="0.35"/>`);
  }
  /* Výška vrcholu */
  s.push(`<path d="M${L.x0} ${f(Y(1280))} H${f(X(10.2))}" stroke="#FFE2B8" stroke-width="1.2" stroke-dasharray="3 7" opacity="0.4"/>`);
  s.push(`<text x="${L.x0 + 2}" y="${f(Y(1280) - 8)}" font-family="Newsreader, Georgia, serif" font-size="${f(17 * k)}" fill="#E8DCCB" opacity="0.7">1 280 °C</text>`);
  s.push(`<text x="${f(X(uzky ? 9.6 : 2.7))}" y="${f(uzky ? L.y0 - 12 : 72)}" text-anchor="middle" font-family="Caveat, cursive" font-size="${f(27 * k)}" fill="#FFE2B8">${L.nahoru}</text>`);
  s.push(`<text x="${f(X(uzky ? 18.6 : 17.4))}" y="${f(Y(uzky ? 760 : 820))}" text-anchor="middle" font-family="Caveat, cursive" font-size="${f(27 * k)}" fill="#C9C2E8">${L.dolu}</text>`);
  /* Měsíc nad nocí */
  const mx = X(uzky ? 22.4 : 21.3);
  const my = uzky ? 30 : 34;
  s.push(`<circle cx="${f(mx)}" cy="${my}" r="${f(11 * k)}" fill="#F4EBC8" opacity="0.9"/><circle cx="${f(mx + 5 * k)}" cy="${f(my - 4 * k)}" r="${f(10 * k)}" fill="#211C36"/>`);
  /* Záře u vrcholu a čára */
  s.push(`<ellipse cx="${f(X(10.6))}" cy="${f(Y(1150))}" rx="${uzky ? 110 : 170}" ry="90" fill="url(#${p}-v)"/>`);
  s.push(`<path d="${cara(nahoru)}" stroke="url(#${p}-z)" stroke-width="${f(12 * k)}" fill="none" stroke-linejoin="round" opacity="0.22"/>`);
  s.push(`<path d="${cara(nahoru)}" stroke="url(#${p}-z)" stroke-width="${f(4.5 * k)}" fill="none" stroke-linejoin="round" stroke-linecap="round"/>`);
  s.push(`<path d="${cara(dolu)}" stroke="url(#${p}-z)" stroke-width="${f(4 * k)}" fill="none" stroke-dasharray="${f(2 * k)} ${f(9 * k)}" stroke-linecap="round"/>`);
  /* Zastavení */
  zastavky.forEach((hh, i) => {
    const x = X(hh);
    const y = Y(teplotaV(hh));
    const b = barvaZaru(Math.max(teplotaV(hh), 560));
    s.push(
      `<g class="${p}-bod" data-i="${i}"><circle cx="${f(x)}" cy="${f(y)}" r="${f(11 * k)}" fill="${b}" opacity="0.22"/>` +
        `<circle cx="${f(x)}" cy="${f(y)}" r="${f(5.5 * k)}" fill="#1C1830" stroke="${smichej(b, "#FFFFFF", 0.35)}" stroke-width="${f(2.6 * k)}"/></g>`,
    );
  });
  /* Kurzor — teď je tady */
  const kx = X(h);
  const ky = Y(teplotaV(h));
  s.push(
    `<g class="${p}-kurzor" transform="translate(${f(kx)} ${f(ky)})">` +
      `<path class="${p}-kurzor-cara" d="M0 0 V${f(L.y0 - ky)}" stroke="#FFF3CF" stroke-width="1.5" stroke-dasharray="3 5" opacity="0.6"/>` +
      `<circle r="${f(19 * k)}" fill="#FFF3CF" opacity="0.16"/><circle r="${f(9 * k)}" fill="#FFF8E6"/><circle r="${f(9 * k)}" fill="none" stroke="#2A2340" stroke-width="2" opacity="0.5"/></g>`,
  );
  return `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false"><defs>${defs}</defs>${s.join("")}</svg>`;
}
