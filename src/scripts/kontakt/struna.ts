/**
 * Provázek jako struna koto. Kde ho drnkneš, tak vysoko zazní: u našeho
 * hrnku (t = 0) nejníž, u domu (t = 1) nejvýš, po stupních japonské
 * pentatoniky in (miyako-bushi, na E: E F A H C). Dvě oktávy a horní E,
 * tedy jedenáct „pražců“. Napnutý provázek (při hovoru) zní o kousek výš.
 *
 * Kdo zahraje začátek písně Sakura (stupně x x x+1, x x x+1 — v E-in
 * A A H, A A H), tomu hlídač motivu vrátí true. Hraje se jen se zapnutým
 * zvukem (zvuk.ton se ptá sám), motiv se pozná i potichu.
 */
import * as zvuk from "../parta2/zvuk";

/** Půltóny stupňů in od E */
const IN = [0, 1, 5, 7, 8];
/** Počet stupňů na struně (dvě oktávy + horní E) */
export const STUPNE = 11;
const E3 = 164.81;

/** Stupeň (0 … STUPNE−1) podle místa na provázku t ∈ [0, 1] */
export const stupen = (t: number) => Math.max(0, Math.min(STUPNE - 1, Math.floor(t * STUPNE)));

/** Kmitočet stupně v Hz; napnutí 0–1 přidá až půl tónu */
export function frekvence(st: number, napnuti = 0) {
  const pultony = 12 * Math.floor(st / 5) + IN[st % 5] + napnuti * 1;
  return E3 * 2 * Math.pow(2, pultony / 12);
}

/** Zahraje stupeň jako drnknutí: tělo (trojúhelník), alikvóta a cvaknutí nehtu */
export function brnk(st: number, sila = 1, napnuti = 0) {
  const fr = frekvence(st, napnuti);
  const s = Math.max(0.25, Math.min(1, sila));
  zvuk.ton(fr * 1.006, fr, 1.1, "triangle", 0.085 * s);
  zvuk.ton(fr * 2, fr * 1.996, 0.55, "sine", 0.028 * s);
  zvuk.ton(fr * 3.01, fr * 2.99, 0.12, "sine", 0.012 * s);
}

/**
 * Hlídač motivu Sakura: dostává zahrané stupně a vrátí true, když
 * posledních šest tvoří x x x+1 x x x+1. Mezera přes 2,5 s řadu zahodí.
 */
export function hlidacMotivu() {
  let rada: { st: number; cas: number }[] = [];
  return (st: number, cas = performance.now()) => {
    if (rada.length && cas - rada[rada.length - 1].cas > 2500) rada = [];
    rada.push({ st, cas });
    if (rada.length > 6) rada.shift();
    if (rada.length < 6) return false;
    const [a, b, c, d, e, g] = rada.map((r) => r.st);
    const ok = a === b && c === a + 1 && d === a && e === a && g === a + 1;
    if (ok) rada = [];
    return ok;
  };
}
