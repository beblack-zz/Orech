/**
 * Kresby ven z HTML — nástroje pro registr /kresby/*.svg (_kresby.ts).
 *
 * Statická kresba jde celá do souboru a stránka ji ukáže přes <img>
 * (obrazek). Prohlížeč pak nedrží v DOM stránky žádný její prvek, filtry
 * a přechody spočítá jednou do bitmapy a soubor si nechá napořád.
 *
 * Kresba, ve které se něco hýbe (CSS animace) nebo na co sahá skript,
 * zůstane ve stránce jako <svg>, ale každý delší souvislý úsek statických
 * prvků se z ní vyjme do souboru a na jeho místo přijde <image> (vyjmi).
 * Pořadí vrstev zůstane stejné, takže kresba vypadá stejně, a ve stránce
 * zbude jen to, co se hýbe, s pár odkazy na soubory. Úsek dostane rozměr
 * podle toho, kde jeho obsah opravdu leží (ohraničení z geometrie s rezervou
 * na tah a filtry), aby bitmapa nebyla větší, než je potřeba.
 *
 * Kresby jsou text, který píšou naše generátory (dobře utvořené SVG bez
 * komentářů a CDATA), takže stačí jednoduchý rozklad na značky. Id jsou
 * v každém souboru vlastní a přejmenují se na krátká; stejný obsah = stejný
 * soubor (např. kruh, který je na šesti snímcích Tvaru stejný).
 */
import { createHash } from "node:crypto";

export const XMLNS = 'xmlns="http://www.w3.org/2000/svg"';

export const otisk = (s: string) => createHash("sha1").update(s).digest("hex").slice(0, 10);
/** Adresa souboru s otiskem obsahu — změněná kresba má jinou adresu, takže se smí cachovat napořád */
export const adresa = (jmeno: string, obsah: string) => `/kresby/${jmeno}.svg?v=${otisk(obsah)}`;

/** Soubory jedné sady kreseb: jméno → obsah. Stejný obsah dostane stejné jméno. */
export class Sklad {
  readonly soubory = new Map<string, string>();
  private podleObsahu = new Map<string, string>();
  /** Uloží soubor a vrátí jeho adresu */
  uloz(jmeno: string, obsah: string): string {
    const uz = this.podleObsahu.get(obsah);
    if (uz) return adresa(uz, obsah);
    if (this.soubory.has(jmeno)) throw new Error(`[kresby] soubor ${jmeno} už existuje`);
    this.soubory.set(jmeno, obsah);
    this.podleObsahu.set(obsah, jmeno);
    return adresa(jmeno, obsah);
  }
}

/* ═══════════════ Rozklad na značky ═══════════════ */

export interface Uzel {
  tag: string;
  atr: Record<string, string>;
  deti: (Uzel | string)[];
  /** Otevírací značka tak, jak je v textu */
  otevreni: string;
  /** Kde prvek v textu začíná a končí (celý i s obsahem) */
  od: number;
  do: number;
  zdroj: string;
}

const ATRIBUT = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'))?/g;

function atributy(otevreni: string): Record<string, string> {
  const a: Record<string, string> = {};
  const vnitrek = otevreni.replace(/^<[^\s/>]+/, "").replace(/\/?>$/, "");
  for (const m of vnitrek.matchAll(ATRIBUT)) a[m[1]] = m[2] ?? m[3] ?? "";
  return a;
}

/** Rozloží text SVG na strom; vrátí první prvek (kořen <svg>) */
export function rozloz(text: string): Uzel {
  const koren: Uzel = { tag: "#", atr: {}, deti: [], otevreni: "", od: 0, do: text.length, zdroj: text };
  const zasobnik: Uzel[] = [koren];
  let i = 0;
  while (i < text.length) {
    const lt = text.indexOf("<", i);
    const nahore = zasobnik[zasobnik.length - 1];
    if (lt < 0) {
      nahore.deti.push(text.slice(i));
      break;
    }
    if (lt > i) nahore.deti.push(text.slice(i, lt));
    if (text.startsWith("<!--", lt)) {
      const k = text.indexOf("-->", lt);
      const e = k < 0 ? text.length : k + 3;
      nahore.deti.push(text.slice(lt, e));
      i = e;
      continue;
    }
    if (text.startsWith("</", lt)) {
      const k = text.indexOf(">", lt);
      const u = zasobnik.pop()!;
      u.do = k + 1;
      i = k + 1;
      continue;
    }
    let j = lt + 1;
    let uvozovka = "";
    for (; j < text.length; j++) {
      const c = text[j];
      if (uvozovka) {
        if (c === uvozovka) uvozovka = "";
      } else if (c === '"' || c === "'") uvozovka = c;
      else if (c === ">") break;
    }
    const otevreni = text.slice(lt, j + 1);
    const tag = /^<([^\s/>]+)/.exec(otevreni)![1];
    const u: Uzel = { tag, atr: atributy(otevreni), deti: [], otevreni, od: lt, do: j + 1, zdroj: text };
    nahore.deti.push(u);
    i = j + 1;
    if (otevreni.endsWith("/>")) continue;
    if (tag === "style" || tag === "script") {
      const k = text.indexOf(`</${tag}>`, i);
      u.deti.push(text.slice(i, k));
      u.do = k + tag.length + 3;
      i = u.do;
    } else zasobnik.push(u);
  }
  const prvni = koren.deti.find((d): d is Uzel => typeof d !== "string");
  if (!prvni) throw new Error("[kresby] v kresbě není žádný prvek");
  return prvni;
}

const cely = (u: Uzel) => u.zdroj.slice(u.od, u.do);
const prvky = (u: Uzel) => u.deti.filter((d): d is Uzel => typeof d !== "string");

/** Co se nekreslí samo — definice se do souborů dostanou přes odkazy na id */
const DEFINICE = new Set(["defs", "clipPath", "mask", "filter", "linearGradient", "radialGradient", "pattern", "symbol", "marker", "title", "desc", "metadata"]);
/** Kontejnery, do kterých se dá jít a vyjmout z nich jen část */
const KONTEJNERY = new Set(["g"]);

/** Vlastnosti, které se dědí — obsah souboru je musí dostat od předků, kteří zůstali ve stránce */
const DEDI_SE = new Set([
  "fill", "fill-opacity", "fill-rule", "stroke", "stroke-width", "stroke-opacity", "stroke-linecap", "stroke-linejoin",
  "stroke-dasharray", "stroke-dashoffset", "stroke-miterlimit", "font-family", "font-size", "font-weight", "font-style",
  "font-variant", "font-stretch", "text-anchor", "dominant-baseline", "letter-spacing", "word-spacing", "color",
  "visibility", "clip-rule", "paint-order", "marker-start", "marker-mid", "marker-end", "shape-rendering", "text-rendering",
  "image-rendering", "color-interpolation", "color-interpolation-filters", "direction", "writing-mode",
]);

/** Deklarace z atributu style */
const styl = (u: Uzel): [string, string][] =>
  (u.atr.style ?? "")
    .split(";")
    .map((s): [string, string] => {
      const i = s.indexOf(":");
      return i < 0 ? ["", ""] : [s.slice(0, i).trim(), s.slice(i + 1).trim()];
    })
    .filter((p) => p[0]);

/* ═══════════════ Odkazy na id ═══════════════ */

const ODKAZ = /url\(#([^)\s"']+)\)|href="#([^"]+)"/g;
const odkazy = (s: string) => [...s.matchAll(ODKAZ)].map((m) => m[1] ?? m[2]);
const definovana = (s: string) => new Set([...s.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));

function indexuj(u: Uzel, ids: Map<string, Uzel>) {
  if (u.atr.id) ids.set(u.atr.id, u);
  for (const d of prvky(u)) indexuj(d, ids);
}

/**
 * Definice, které text potřebuje a sám je nemá (i definice definic).
 * `jenZnat` jsou id, která se jen zaznamenají do `chybi` (stránka je má jinde).
 */
function definiceK(text: string, ids: Map<string, Uzel>, jenZnat?: Set<string>, chybi?: Set<string>): string {
  const ma = definovana(text);
  const pridane: string[] = [];
  const fronta = odkazy(text);
  while (fronta.length) {
    const id = fronta.shift()!;
    if (ma.has(id)) continue;
    ma.add(id);
    const u = ids.get(id);
    if (jenZnat?.has(id)) {
      chybi?.add(id);
      if (u) fronta.push(...odkazy(cely(u)));
      continue;
    }
    if (!u) continue;
    const t = cely(u);
    pridane.push(t);
    for (const x of definovana(t)) ma.add(x);
    fronta.push(...odkazy(t));
  }
  return pridane.join("");
}

/** Id v souboru na krátká (a, b, … z, aa, ab …) — soubor je samostatný, nic jiného na ně neodkazuje */
function kratkaId(text: string): string {
  const mapa = new Map<string, string>();
  let n = 0;
  const jmeno = (k: number) => {
    let s = "";
    do {
      s = String.fromCharCode(97 + (k % 26)) + s;
      k = Math.floor(k / 26) - 1;
    } while (k >= 0);
    return s;
  };
  for (const m of text.matchAll(/\sid="([^"]+)"/g)) if (!mapa.has(m[1])) mapa.set(m[1], jmeno(n++));
  return text.replace(/(\sid=")([^"]+)(")|url\(#([^)\s"']+)\)|(href="#)([^"]+)(")/g, (_, a, id1, c, id2, h, id3, k) => {
    if (id1 !== undefined) return `${a}${mapa.get(id1) ?? id1}${c}`;
    if (id2 !== undefined) return `url(#${mapa.get(id2) ?? id2})`;
    return `${h}${mapa.get(id3) ?? id3}${k}`;
  });
}

/* ═══════════════ Geometrie: matice a ohraničení ═══════════════ */

type Matice = [number, number, number, number, number, number];
const JEDNOTKOVA: Matice = [1, 0, 0, 1, 0, 0];
const nasob = (m: Matice, n: Matice): Matice => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
];
function obratit(m: Matice): Matice | null {
  const det = m[0] * m[3] - m[1] * m[2];
  if (Math.abs(det) < 1e-12) return null;
  return [m[3] / det, -m[1] / det, -m[2] / det, m[0] / det, (m[2] * m[5] - m[3] * m[4]) / det, (m[1] * m[4] - m[0] * m[5]) / det];
}

/** Atribut transform (seznam funkcí) jako matice */
function matice(t: string | undefined): Matice {
  let m = JEDNOTKOVA;
  if (!t) return m;
  for (const f of t.matchAll(/(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g)) {
    const a = (f[2].match(/[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g) ?? []).map(Number);
    let n: Matice = JEDNOTKOVA;
    const rad = ((a[0] ?? 0) * Math.PI) / 180;
    switch (f[1]) {
      case "matrix":
        n = [a[0], a[1], a[2], a[3], a[4], a[5]];
        break;
      case "translate":
        n = [1, 0, 0, 1, a[0] ?? 0, a[1] ?? 0];
        break;
      case "scale":
        n = [a[0], 0, 0, a[1] ?? a[0], 0, 0];
        break;
      case "rotate": {
        const c = Math.cos(rad);
        const s = Math.sin(rad);
        const [cx, cy] = [a[1] ?? 0, a[2] ?? 0];
        n = nasob(nasob([1, 0, 0, 1, cx, cy], [c, s, -s, c, 0, 0]), [1, 0, 0, 1, -cx, -cy]);
        break;
      }
      case "skewX":
        n = [1, 0, Math.tan(rad), 1, 0, 0];
        break;
      case "skewY":
        n = [1, Math.tan(rad), 0, 1, 0, 0];
        break;
    }
    m = nasob(m, n);
  }
  return m;
}

/** Ohraničení [x0, y0, x1, y1]; nekonečné = nevíme (obsah se pak nevyjímá) */
type Ram = [number, number, number, number];
const NEKONECNO: Ram = [-Infinity, -Infinity, Infinity, Infinity];
const konecny = (r: Ram) => r.every(Number.isFinite);

function spoj(a: Ram | null, b: Ram | null): Ram | null {
  if (!a) return b;
  if (!b) return a;
  return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];
}
function prunik(a: Ram, b: Ram): Ram | null {
  const r: Ram = [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.min(a[2], b[2]), Math.min(a[3], b[3])];
  return r[0] <= r[2] && r[1] <= r[3] ? r : null;
}
const rozsir = (r: Ram, o: number): Ram => [r[0] - o, r[1] - o, r[2] + o, r[3] + o];
function preved(r: Ram, m: Matice): Ram {
  if (!konecny(r)) return NEKONECNO;
  const body = [
    [r[0], r[1]],
    [r[2], r[1]],
    [r[0], r[3]],
    [r[2], r[3]],
  ].map(([x, y]) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]);
  return [Math.min(...body.map((b) => b[0])), Math.min(...body.map((b) => b[1])), Math.max(...body.map((b) => b[0])), Math.max(...body.map((b) => b[1]))];
}

const cislo = (s: string | undefined, vychozi = 0) => {
  const n = s === undefined ? NaN : parseFloat(s);
  return Number.isFinite(n) ? n : vychozi;
};

/** Ohraničení cesty: koncové a řídicí body, oblouky navzorkované */
function ramCesty(d: string): Ram | null {
  let r: Ram | null = null;
  const bod = (x: number, y: number) => (r = spoj(r, [x, y, x, y]));
  let i = 0;
  const CISLO = /[\s,]*([-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?)/y;
  const VLAJKA = /[\s,]*([01])/y;
  const precti = (re: RegExp) => {
    re.lastIndex = i;
    const m = re.exec(d);
    if (!m) return null;
    i = re.lastIndex;
    return Number(m[1]);
  };
  let x = 0;
  let y = 0;
  let sx = 0;
  let sy = 0;
  let prikaz = "";
  /* Poslední řídicí bod kubiky a kvadriky — S a T ho zrcadlí */
  let kc: [number, number] | null = null;
  let kq: [number, number] | null = null;
  while (i < d.length) {
    const p = /[\s,]*([a-zA-Z])/y;
    p.lastIndex = i;
    const m = p.exec(d);
    if (m) {
      prikaz = m[1];
      i = p.lastIndex;
      if (prikaz === "Z" || prikaz === "z") {
        x = sx;
        y = sy;
        kc = kq = null;
        continue;
      }
    } else if (!prikaz || /^[\s,]*$/.test(d.slice(i))) break;
    const rel = prikaz === prikaz.toLowerCase();
    const P = prikaz.toUpperCase();
    const n = (k: number) => {
      const a: number[] = [];
      for (let j = 0; j < k; j++) {
        const v = precti(CISLO);
        if (v === null) return null;
        a.push(v);
      }
      return a;
    };
    /* Zrcadlo posledního řídicího bodu kolem aktuálního (nebo aktuální bod) */
    const zrcadlo = (k: [number, number] | null): [number, number] => (k ? [2 * x - k[0], 2 * y - k[1]] : [x, y]);
    if (P === "M" || P === "L" || P === "T") {
      const a = n(2);
      if (!a) break;
      if (P === "T") {
        const q = zrcadlo(kq);
        bod(q[0], q[1]);
        kq = q;
      } else kq = null;
      kc = null;
      x = rel ? x + a[0] : a[0];
      y = rel ? y + a[1] : a[1];
      if (P === "M") {
        sx = x;
        sy = y;
        prikaz = rel ? "l" : "L";
      }
      bod(x, y);
    } else if (P === "H" || P === "V") {
      const a = n(1);
      if (!a) break;
      if (P === "H") x = rel ? x + a[0] : a[0];
      else y = rel ? y + a[0] : a[0];
      kc = kq = null;
      bod(x, y);
    } else if (P === "C" || P === "S" || P === "Q") {
      const k = P === "C" ? 6 : 4;
      const a = n(k);
      if (!a) break;
      if (P === "S") {
        const c1 = zrcadlo(kc);
        bod(c1[0], c1[1]);
      }
      const body: [number, number][] = [];
      for (let j = 0; j < k; j += 2) body.push([rel ? x + a[j] : a[j], rel ? y + a[j + 1] : a[j + 1]]);
      for (const [px, py] of body) bod(px, py);
      /* Řídicí bod před koncem: u C a S druhý, u Q jediný */
      const ridici = body[body.length - 2];
      kc = P === "Q" ? null : ridici;
      kq = P === "Q" ? ridici : null;
      x = body[body.length - 1][0];
      y = body[body.length - 1][1];
    } else if (P === "A") {
      kc = kq = null;
      const a = n(3);
      if (!a) break;
      const f1 = precti(VLAJKA);
      const f2 = precti(VLAJKA);
      const b = n(2);
      if (f1 === null || f2 === null || !b) break;
      const x2 = rel ? x + b[0] : b[0];
      const y2 = rel ? y + b[1] : b[1];
      for (const [px, py] of oblouk(x, y, a[0], a[1], a[2], f1, f2, x2, y2)) bod(px, py);
      x = x2;
      y = y2;
    } else break;
  }
  return r;
}

/** Body na eliptickém oblouku (převod z koncových bodů na střed, SVG F.6.5) s rezervou na vzorkování */
function oblouk(x1: number, y1: number, rx: number, ry: number, uhel: number, velky: number, smer: number, x2: number, y2: number): [number, number][] {
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  if (!rx || !ry) return [[x1, y1], [x2, y2]];
  const phi = (uhel * Math.PI) / 180;
  const c = Math.cos(phi);
  const s = Math.sin(phi);
  const dx = (x1 - x2) / 2;
  const dy = (y1 - y2) / 2;
  const x1p = c * dx + s * dy;
  const y1p = -s * dx + c * dy;
  const lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lam > 1) {
    rx *= Math.sqrt(lam);
    ry *= Math.sqrt(lam);
  }
  const zn = velky === smer ? -1 : 1;
  const citatel = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const k = zn * Math.sqrt(Math.max(0, citatel / (rx * rx * y1p * y1p + ry * ry * x1p * x1p)));
  const cxp = (k * rx * y1p) / ry;
  const cyp = (-k * ry * x1p) / rx;
  const cx = c * cxp - s * cyp + (x1 + x2) / 2;
  const cy = s * cxp + c * cyp + (y1 + y2) / 2;
  const u = (ax: number, ay: number, bx: number, by: number) => Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
  const t1 = u(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let dt = u((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!smer && dt > 0) dt -= 2 * Math.PI;
  else if (smer && dt < 0) dt += 2 * Math.PI;
  const KROKU = 48;
  /* Mezi vzorky může oblouk vybočit nejvýš o r·(1 − cos(Δ/2)) */
  const rezerva = Math.max(rx, ry) * (1 - Math.cos(Math.abs(dt) / KROKU / 2)) + 0.01;
  const body: [number, number][] = [[x1, y1], [x2, y2]];
  for (let j = 0; j <= KROKU; j++) {
    const t = t1 + (dt * j) / KROKU;
    const ex = rx * Math.cos(t);
    const ey = ry * Math.sin(t);
    const px = c * ex - s * ey + cx;
    const py = s * ex + c * ey + cy;
    body.push([px - rezerva, py - rezerva], [px + rezerva, py + rezerva]);
  }
  return body;
}

interface Dedeno {
  tah: boolean;
  sirka: number;
}

/** Tah a jeho šířka podle předků a prvku (atributy i style) */
function zdedit(d: Dedeno, u: Uzel): Dedeno {
  let { tah, sirka } = d;
  const nastav = (k: string, v: string) => {
    if (k === "stroke") tah = v !== "none" && v !== "transparent";
    if (k === "stroke-width") sirka = cislo(v, sirka);
  };
  if (u.atr.stroke !== undefined) nastav("stroke", u.atr.stroke);
  if (u.atr["stroke-width"] !== undefined) nastav("stroke-width", u.atr["stroke-width"]);
  for (const [k, v] of styl(u)) nastav(k, v);
  return { tah, sirka };
}

/** Ohraničení prvku v souřadnicích jeho rodiče (už s vlastní transformací) */
function ramPrvku(u: Uzel, d: Dedeno, ids: Map<string, Uzel>, hloubka = 0): Ram | null {
  if (hloubka > 40) return NEKONECNO;
  if (DEFINICE.has(u.tag)) return null;
  const dd = zdedit(d, u);
  const a = u.atr;
  let r: Ram | null;
  const tvar = (q: Ram | null) => (q && dd.tah ? rozsir(q, dd.sirka * 2 + 0.5) : q);
  switch (u.tag) {
    case "g":
    case "a":
    case "switch":
      r = null;
      for (const c of prvky(u)) r = spoj(r, ramPrvku(c, dd, ids, hloubka + 1));
      break;
    case "path":
      r = tvar(ramCesty(a.d ?? ""));
      break;
    case "rect":
    case "image": {
      const x = cislo(a.x);
      const y = cislo(a.y);
      r = u.tag === "rect" ? tvar([x, y, x + cislo(a.width), y + cislo(a.height)]) : [x, y, x + cislo(a.width), y + cislo(a.height)];
      break;
    }
    case "circle":
    case "ellipse": {
      const cx = cislo(a.cx);
      const cy = cislo(a.cy);
      const rx = u.tag === "circle" ? cislo(a.r) : cislo(a.rx, cislo(a.ry));
      const ry = u.tag === "circle" ? cislo(a.r) : cislo(a.ry, cislo(a.rx));
      r = tvar([cx - rx, cy - ry, cx + rx, cy + ry]);
      break;
    }
    case "line":
      r = tvar([Math.min(cislo(a.x1), cislo(a.x2)), Math.min(cislo(a.y1), cislo(a.y2)), Math.max(cislo(a.x1), cislo(a.x2)), Math.max(cislo(a.y1), cislo(a.y2))]);
      break;
    case "polyline":
    case "polygon": {
      const c = (a.points?.match(/[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g) ?? []).map(Number);
      r = null;
      for (let j = 0; j + 1 < c.length; j += 2) r = spoj(r, [c[j], c[j + 1], c[j], c[j + 1]]);
      r = tvar(r);
      break;
    }
    case "use": {
      const cil = ids.get((a.href ?? a["xlink:href"] ?? "").replace(/^#/, ""));
      if (!cil || cil.tag === "symbol" || cil.tag === "svg") return NEKONECNO;
      const q = ramPrvku(cil, dd, ids, hloubka + 1);
      r = q && preved(q, [1, 0, 0, 1, cislo(a.x), cislo(a.y)]);
      break;
    }
    default:
      /* text, foreignObject, vnořené svg… — nevíme, nevyjímat */
      return NEKONECNO;
  }
  if (r && a.filter) r = oblastFiltru(r, a.filter, ids);
  if (r && a["clip-path"]) {
    const o = ramOrezu(a["clip-path"], ids, dd);
    if (o) r = prunik(r, o);
  }
  if (r && a.transform) r = preved(r, matice(a.transform));
  return r;
}

/** Filtr kreslí jen do své oblasti (výchozí −10 % / 120 % ohraničení prvku) */
function oblastFiltru(r: Ram, hodnota: string, ids: Map<string, Uzel>): Ram {
  const m = /url\(#([^)]+)\)/.exec(hodnota);
  const f = m && ids.get(m[1]);
  if (!f || !konecny(r)) return NEKONECNO;
  const a = f.atr;
  if (a.filterUnits === "userSpaceOnUse") {
    if ([a.x, a.y, a.width, a.height].some((v) => v === undefined || v.endsWith("%"))) return NEKONECNO;
    const x = cislo(a.x);
    const y = cislo(a.y);
    return [x, y, x + cislo(a.width), y + cislo(a.height)];
  }
  const podil = (v: string | undefined, vychozi: number) => (v === undefined ? vychozi : v.endsWith("%") ? parseFloat(v) / 100 : cislo(v, vychozi));
  const w = r[2] - r[0];
  const h = r[3] - r[1];
  const x = r[0] + podil(a.x, -0.1) * w;
  const y = r[1] + podil(a.y, -0.1) * h;
  return [x, y, x + podil(a.width, 1.2) * w, y + podil(a.height, 1.2) * h];
}

/** Ohraničení ořezu (clipPath v souřadnicích prvku); null = neořezávat */
function ramOrezu(hodnota: string, ids: Map<string, Uzel>, d: Dedeno): Ram | null {
  const m = /url\(#([^)]+)\)/.exec(hodnota);
  const c = m && ids.get(m[1]);
  if (!c || c.atr.clipPathUnits === "objectBoundingBox") return null;
  let r: Ram | null = null;
  for (const x of prvky(c)) r = spoj(r, ramPrvku(x, { tah: false, sirka: d.sirka }, ids));
  if (r && c.atr.transform) r = preved(r, matice(c.atr.transform));
  return r && konecny(r) ? r : null;
}

/* ═══════════════ Celá kresba do <img> ═══════════════ */

export interface Obrazek {
  src: string;
  sirka: number;
  vyska: number;
}

/** Atributy kořene, které zůstanou v souboru (vzhled), ne ty pro stránku */
function korenSouboru(koren: Uzel, viewBox: string, w: number, h: number): string {
  const nechat = Object.entries(koren.atr).filter(([k]) => DEDI_SE.has(k) || k === "preserveAspectRatio" || k === "style");
  return `<svg ${XMLNS} viewBox="${viewBox}" width="${w}" height="${h}"${nechat.map(([k, v]) => ` ${k}="${v}"`).join("")}>`;
}

const rozmery = (koren: Uzel) => {
  const vb = (koren.atr.viewBox ?? "").trim().split(/[\s,]+/).map(Number);
  if (vb.length !== 4 || vb.some((n) => !Number.isFinite(n))) throw new Error("[kresby] kresba nemá viewBox");
  return vb as [number, number, number, number];
};

/**
 * Celá kresba jako soubor pro <img>. Kresba nesmí mít v sobě nic, na co
 * sahá CSS stránky nebo skript, ani text v písmu webu.
 */
export function obrazek(sklad: Sklad, jmeno: string, svg: string): Obrazek {
  /* Text by v obrázku dostal náhradní písmo — taková kresba patří do vyjmi(), ta text nechá ve stránce */
  if (/<(text|a|foreignObject|style|script)[\s>]/.test(svg)) throw new Error(`[kresby] ${jmeno}: kresba s textem, odkazem nebo stylem nejde celá do <img> — použij vyjmi()`);
  const koren = rozloz(svg.trim());
  const [, , w, h] = rozmery(koren);
  const obsah = svg.trim().slice(koren.otevreni.length, -"</svg>".length);
  const soubor = kratkaId(korenSouboru(koren, koren.atr.viewBox, w, h) + obsah + "</svg>");
  return { src: sklad.uloz(jmeno, soubor), sirka: w, vyska: h };
}

/* ═══════════════ Kresba s pohybem: statické úseky do <image> ═══════════════ */

export type Nechat = "cele" | "obal";

export interface Volby {
  /**
   * Co musí zůstat ve stránce: "cele" = prvek i s obsahem (hýbe se, sahá
   * na něj skript, záleží na jeho ohraničení), "obal" = prvek zůstane, ale
   * jeho statický obsah smí do souboru (průhlednost, posun celé skupiny).
   * Text zůstává vždy (písmo webu se do obrázku nedostane).
   */
  nechat?: (u: Uzel) => Nechat | null | undefined | false;
  /** Úsek kratší než tohle (bajty) zůstane ve stránce — nestojí za soubor */
  prah?: number;
  /** Kořen ořezává na viewBox (overflow: hidden) — soubory stačí do něj */
  orez?: boolean;
  /** CSS stránky vybírá prvky přes :nth-child — pořadí se zachová modulo tohle číslo */
  poradi?: number;
  /** Společné definice mimo kresbu (jiné <svg> na stránce), na které kresba odkazuje */
  vnejsi?: string;
  /** Id, která za běhu mění skript — co na ně odkazuje, zůstane ve stránce */
  zive?: string[];
}

export interface Vysledek {
  /** Kresba pro stránku — <svg> s tím, co zůstalo, a s <image> místo statických úseků */
  svg: string;
  /** Které z vnějších definic kresba ve stránce pořád potřebuje */
  vnejsi: Set<string>;
  /** Kolik souborů kresba použila */
  souboru: number;
}

/** Třídy prvku → co s ním (první shoda vyhrává) */
export const podleTrid =
  (mapa: Record<string, Nechat>) =>
  (u: Uzel): Nechat | null => {
    for (const t of (u.atr.class ?? "").split(/\s+/)) if (t && mapa[t]) return mapa[t];
    return null;
  };

export function vyjmi(sklad: Sklad, jmeno: string, svg: string, volby: Volby = {}): Vysledek {
  const text = svg.trim();
  const koren = rozloz(text);
  if (/<style|<script/.test(text)) return { svg: text, vnejsi: new Set(), souboru: 0 };
  const prah = volby.prah ?? 2048;
  const ids = new Map<string, Uzel>();
  indexuj(koren, ids);
  const vnejsiIds = new Set<string>();
  if (volby.vnejsi) {
    const v = rozloz(`<svg>${volby.vnejsi}</svg>`);
    const m = new Map<string, Uzel>();
    indexuj(v, m);
    for (const [k, u] of m) {
      if (!ids.has(k)) {
        ids.set(k, u);
        vnejsiIds.add(k);
      }
    }
  }

  /* Živá id a všechno, co na ně (i přes další definice) odkazuje */
  const zive = new Set(volby.zive ?? []);
  for (let zmena = true; zmena; ) {
    zmena = false;
    for (const [id, u] of ids) {
      if (!zive.has(id) && odkazy(cely(u)).some((x) => zive.has(x))) {
        zive.add(id);
        zmena = true;
      }
    }
  }
  const vlastniOdkazy = (u: Uzel) => odkazy(u.otevreni);

  const rozhodnuti = new Map<Uzel, Nechat | null>();
  const rozhodni = (u: Uzel): Nechat | null => {
    if (rozhodnuti.has(u)) return rozhodnuti.get(u)!;
    let r: Nechat | null = volby.nechat?.(u) || null;
    /* Text (písmo webu), odkaz (dá se na něj kliknout) a cizí obsah zůstávají vždy */
    if (!r && ["text", "a", "foreignObject", "style", "script"].includes(u.tag)) r = "cele";
    if (!r && vlastniOdkazy(u).some((x) => zive.has(x))) r = KONTEJNERY.has(u.tag) ? "obal" : "cele";
    rozhodnuti.set(u, r);
    return r;
  };
  const obsahuje = new Map<Uzel, boolean>();
  const potrebuje = (u: Uzel): boolean => {
    if (obsahuje.has(u)) return obsahuje.get(u)!;
    const r = rozhodni(u) !== null || prvky(u).some(potrebuje);
    obsahuje.set(u, r);
    return r;
  };
  /* Filtr počítá i s tím, co leží za okrajem obrazu (rozmazání zpoza okraje) — soubor s filtrem se neořezává */
  const sFiltrem = (u: Uzel): boolean => u.atr.filter !== undefined || styl(u).some(([k]) => k === "filter") || prvky(u).some(sFiltrem);

  const [vx, vy, vw, vh] = rozmery(koren);
  const zKorene: Dedeno = zdedit({ tah: false, sirka: 1 }, koren);
  const M = volby.poradi ?? 0;
  let souboru = 0;
  let n = 0;

  /** Dědičné vlastnosti předků jako atributy obalu v souboru (vlastní proměnné CSS do style) */
  const dedicne = (predci: Uzel[]) => {
    const a = new Map<string, string>();
    const promenne = new Map<string, string>();
    for (const p of predci) {
      for (const [k, v] of Object.entries(p.atr)) if (DEDI_SE.has(k)) a.set(k, v);
      for (const [k, v] of styl(p)) {
        if (k.startsWith("--")) promenne.set(k, v);
        else if (DEDI_SE.has(k)) a.set(k, v);
      }
    }
    const s = [...promenne].map(([k, v]) => `${k}:${v}`).join(";");
    return [...a].map(([k, v]) => ` ${k}="${v}"`).join("") + (s ? ` style="${s}"` : "");
  };

  /** Zůstane vlastnost z atributu style, která se nedědí (a do souboru by se zdvojila)? */
  const stylJenDedicny = (u: Uzel) => styl(u).every(([k]) => DEDI_SE.has(k) || k.startsWith("--"));

  /**
   * `pohled` je oblast v místních souřadnicích, mimo kterou obsah určitě
   * není vidět (viewBox kořene, ořezy předků) — soubory se na ni zmenší.
   * Pod obalem, který se hýbe, platí jen ořezy, které se hýbou s ním.
   */
  function zpracuj(deti: (Uzel | string)[], predci: Uzel[], dedeno: Dedeno, pohled: Ram): string {
    let ven = "";
    let usek: Uzel[] = [];
    let puvodne = 0;
    let vystup = 0;
    /* Na kořeni jde jako první vždy <defs> (doplní se na konci) — počítá se do pořadí */
    if (predci.length === 1 && M) vystup = 1;
    const dorovnej = (i: number) => {
      if (!M) return;
      while ((vystup + 1 - i) % M !== 0) {
        ven += "<g/>";
        vystup++;
      }
    };
    const vyprazdni = () => {
      if (!usek.length) return;
      const uzly = usek;
      usek = [];
      const kusy = uzly.map(cely);
      const velikost = kusy.reduce((s, k) => s + k.length, 0);
      let r: Ram | null = null;
      const p = uzly.some(sFiltrem) ? NEKONECNO : pohled;
      if (velikost >= prah) {
        for (const u of uzly) r = spoj(r, ramPrvku(u, dedeno, ids));
        if (r) r = prunik(r, p);
      }
      if (!r || !konecny(r)) {
        ven += kusy.join("");
        vystup += kusy.length;
        return;
      }
      /* Jednotka rezervy kolem obsahu — i přes okraj toho, co je vidět: okraj
         obrázku pak neleží na okraji kresby a nevznikne na něm šev z vyhlazování */
      const x0 = Math.floor(r[0] - 1);
      const y0 = Math.floor(r[1] - 1);
      const w = Math.ceil(r[2] + 1) - x0;
      const h = Math.ceil(r[3] + 1) - y0;
      const obal = dedicne(predci);
      const obsah = obal ? `<g${obal}>${kusy.join("")}</g>` : kusy.join("");
      const defs = definiceK(obsah, ids);
      const soubor = kratkaId(`<svg ${XMLNS} viewBox="${x0} ${y0} ${w} ${h}" width="${w}" height="${h}">${defs ? `<defs>${defs}</defs>` : ""}${obsah}</svg>`);
      const src = sklad.uloz(`${jmeno}-${++n}`, soubor);
      souboru++;
      ven += `<image href="${src}" x="${x0}" y="${y0}" width="${w}" height="${h}"/>`;
      vystup++;
    };
    for (const d of deti) {
      if (typeof d === "string") continue;
      puvodne++;
      if (DEFINICE.has(d.tag)) continue;
      if (!potrebuje(d)) {
        usek.push(d);
        continue;
      }
      vyprazdni();
      dorovnej(puvodne);
      const r = rozhodni(d);
      const dovnitr = KONTEJNERY.has(d.tag) && stylJenDedicny(d) && r !== "cele";
      if (!dovnitr) ven += cely(d);
      else {
        /* Obal, který se hýbe, může obsah posunout do obrazu; filtr může obsah zpoza okraje rozmazat dovnitř */
        let p: Ram = r === "obal" || d.atr.filter ? NEKONECNO : pohled;
        if (konecny(p) && d.atr.transform) {
          const o = obratit(matice(d.atr.transform));
          p = o ? preved(p, o) : NEKONECNO;
        }
        /* Ořez, jehož tvar mění skript, nic nezaručuje */
        if (d.atr["clip-path"] && !odkazy(d.atr["clip-path"]).some((x) => zive.has(x))) {
          const o = ramOrezu(d.atr["clip-path"], ids, dedeno);
          if (o) p = prunik(p, o) ?? p;
        }
        ven += d.otevreni + zpracuj(d.deti, [...predci, d], zdedit(dedeno, d), p) + `</${d.tag}>`;
      }
      vystup++;
    }
    vyprazdni();
    return ven;
  }

  const vnitrek = zpracuj(koren.deti, [koren], zKorene, volby.orez === false ? NEKONECNO : [vx, vy, vx + vw, vy + vh]);
  const chybi = new Set<string>();
  const defs = definiceK(vnitrek, ids, vnejsiIds, chybi);
  const vysledek = `${koren.otevreni}${defs || M ? `<defs>${defs}</defs>` : ""}${vnitrek}</svg>`;
  return { svg: vysledek, vnejsi: chybi, souboru };
}
