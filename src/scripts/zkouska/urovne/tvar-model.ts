/**
 * Úroveň 四 Tvar — počty bez DOM: obrys z nakreslené čáry, shoda
 * s předlohou a výsledek hry.
 *
 * Fyzika je ta samá, jako mívala Dílna (components/dilna/kus.ts):
 * z bodů čáry se obrys skládá funkcí zBodu() a co by spadlo, říká
 * spadne(). Navíc se tu jen nepočítá kus čáry, který jede po hlavě
 * kruhu — kdo začne u osy a táhne ven k patce, teprve patku hledá.
 *
 * Shoda kola: oba obrysy se projdou ve 48 stejných poměrných výškách
 * (patka s patkou, polovina s polovinou, okraj s okrajem).
 *   E1 = průměrná odchylka poloměru (bez 1 mm na chvění ruky)
 *        / průměrný poloměr předlohy
 *   E2 = rozdíl výšek / výška předlohy
 *   S  = 1 − 2 · E1 − E2, omezeno na 0–1
 * Body hry = 100 × vážený průměr S tří kol (váza váží 1,2), prošlo
 * od 40 bodů, a jen když nespadl víc než jeden kus.
 */
import { omez } from "../../parta2/stav";
import { poznejDruh, nazevDruhu, spadne, zBodu } from "../../../components/dilna/kus";
import type { Kus } from "../../../components/dilna/kus";
import type { Profil, Predloha } from "../../../components/zkouska/urovne/tvar-tvary";
import type { Vysledek } from "../hra";

export interface BodCary {
  /** Vzdálenost od osy v mm */
  r: number;
  /** Výška nad hlavou kruhu v mm */
  h: number;
}

/** Pod touhle výškou (mm) jede čára po hlavě kruhu a do obrysu se nepočítá */
const PO_HLAVE = 3;
/** Nižší čára není obrys, jen škrtnutí */
export const NEJMIN_VYSKA = 15;

/** Obrys z bodů čáry, nebo null, když čára na obrys nestačí */
export function obrysZCary(body: BodCary[]): Profil | null {
  if (body.length < 5) return null;
  if (Math.max(...body.map((b) => b.h)) < NEJMIN_VYSKA) return null;
  const stena = body.filter((b) => b.h >= PO_HLAVE);
  return zBodu(stena.length >= 3 ? stena : body);
}

/** Proč by kus spadl — „siroke“, „previs“, „tenke“ — nebo null */
export const proc = (o: Profil) => spadne(o.r, o.v);

/** Poloměr obrysu ve výšce h mm; nad okrajem a pod patkou je 0 */
export function polomerVe(p: Profil, h: number) {
  if (h < 0 || h > p.v) return 0;
  const t = (h / p.v) * (p.r.length - 1);
  const i = Math.min(p.r.length - 2, Math.floor(t));
  return p.r[i] + (p.r[i + 1] - p.r[i]) * (t - i);
}

const VZORKU = 48;
export const VAHA_SIRKY = 2.0;
export const VAHA_VYSKY = 1.0;
/** Co ruka nedrží přesněji, se nepočítá — milimetr na poloměru */
export const CHVENI = 1;

/**
 * Shoda kusu s předlohou: s 0–1 a obě odchylky. Poloměry se porovnávají
 * ve stejné poměrné výšce obou kusů (v polovině kusu s polovinou předlohy),
 * výška zvlášť — kdo přetáhne okraj misky o tři milimetry, neplatí to
 * dvakrát, a kdo vytočí jen půlku vázy, stejně se netrefí do jejího tvaru.
 */
export function shoda(cil: Profil, kus: Profil) {
  let rozdil = 0;
  for (let k = 0; k < VZORKU; k++) {
    const t = (k + 0.5) / VZORKU;
    rozdil += Math.max(0, Math.abs(polomerVe(kus, t * kus.v) - polomerVe(cil, t * cil.v)) - CHVENI);
  }
  const prumer = cil.r.reduce((s, x) => s + x, 0) / cil.r.length;
  const e1 = rozdil / VZORKU / prumer;
  const e2 = Math.abs(kus.v - cil.v) / cil.v;
  return { s: omez(1 - VAHA_SIRKY * e1 - VAHA_VYSKY * e2), e1, e2 };
}

/**
 * Sedí čára v téhle výšce na zlaté? Kvůli rozsvícení předlohy během
 * kreslení — tolerance je 2,5 mm nebo 7 % poloměru.
 */
export function sedi(cil: Profil, kus: Profil | null, h: number) {
  if (!kus || h > kus.v) return false;
  const rt = polomerVe(cil, h);
  return Math.abs(polomerVe(kus, h) - rt) <= Math.max(2.5, rt * 0.07);
}

export interface Kolo {
  predloha: Predloha;
  /** Shoda 0–1 (spadlý kus a hrouda mají 0) */
  s: number;
  spadlo: boolean;
  /** Obrys odříznutého kusu; null, když se nic nevytočilo */
  obrys: Profil | null;
}

/** Odříznutý kus, jak půjde na mistrovský list */
export function kusZObrysu(o: Profil): Kus {
  const druh = poznejDruh(o.r, o.v);
  return {
    puvod: "kruh",
    druh,
    nazev: `${nazevDruhu(druh)} podle předlohy`,
    r: o.r.map((x) => Math.round(x * 10) / 10),
    v: Math.round(o.v * 10) / 10,
    glazury: [],
    dno: false,
  };
}

export const procenta = (s: number) => Math.round(s * 100);

/** Výsledek celé hry ze tří kol */
export function vysledekHry(kola: Kolo[]): Vysledek {
  const vahy = kola.reduce((s, k) => s + k.predloha.vaha, 0) || 1;
  const body = Math.round((100 * kola.reduce((s, k) => s + k.predloha.vaha * k.s, 0)) / vahy);
  const pady = kola.filter((k) => k.spadlo).length;
  const proslo = body >= 40 && pady <= 1;
  const veta = !proslo
    ? pady >= 2
      ? "Spadlo to víckrát, než je zdrávo. Dýchej a znovu."
      : "Tohle předloha není. Dívej se na polici, lokty k tělu — a znovu."
    : body >= 85
      ? "Tohle by na polici nikdo nerozeznal."
      : body >= 65
        ? "Podobné. Kdo neví, nepozná."
        : "Je to kus. Předloha by se urazila, ale je to kus.";
  const udaje = kola.map((k): [string, string] => [
    k.predloha.nazev,
    k.spadlo ? k.predloha.spadlo : k.obrys ? `${procenta(k.s)} %` : "jen hrouda",
  ]);
  let nej: Kolo | null = null;
  for (const k of kola) if (k.obrys && !k.spadlo && (!nej || k.s > nej.s)) nej = k;
  return { body, proslo, veta, udaje, ...(nej?.obrys ? { kus: kusZObrysu(nej.obrys) } : {}) };
}
