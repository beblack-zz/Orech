/**
 * Vázička-průvodce mluví šamisenem: na každou slabiku tiché, krátké
 * brnknutí ve stupnici mijako-buši (STUPNICE v vazicka-gejsa/beh.js),
 * výška podle samohlásky (u ů → d, o → es, a → g, e ě → a, i y → b).
 * Přízvuk je na první slabice slova jako v češtině — tam brnkne o oktávu
 * výš a silněji. Výraz mění tón: přísná a klidná mluví hluboko, usměvavá,
 * stydlivá a mrkající vysoko (stydlivá i tišeji), úžas začne krátkým
 * „ach“ a stydlivá věta skončí zachichotáním za vějířem.
 *
 * Brnká se při psaní bubliny (kami.ts, volba `pise`) — znak po znaku, takže
 * hlas jde s textem. Hraje jen se zapnutým zvukem webu (beh.js, parta2/zvuk.ts).
 */
import { zahraj } from "../vazicka-gejsa/beh.js";
import type { Vyraz } from "../../data/pruvodce";

const SAMOHLASKY = "aáeéěiíoóuúůyý";
/** Stupeň stupnice podle samohlásky (0 d, 1 es, 2 g, 3 a, 4 b; o oktávu výš +5) */
const STUPEN: Record<string, number> = { u: 0, ú: 0, ů: 0, o: 1, ó: 1, a: 2, á: 2, e: 3, é: 3, ě: 3, i: 4, í: 4, y: 4, ý: 4 };
const DLOUHE = "áéíóúůý";
/** Jak dlouho brnknutí doznívá proti plnému šamisenu z kresby — řeč je rychlá */
const DELKA = 0.32;
/** Je napravo dole, tak zní trochu zprava */
const PAN = 0.45;

export interface Slabika {
  /** Index znaku (v `[...text]`), při jehož napsání brnkne */
  i: number;
  vys: number;
  sila: number;
}

/**
 * Slabiky textu: první samohláska každé skupiny (dvojhláska ou je jedna
 * slabika), přízvuk na první slabice slova, dlouhé samohlásky silněji.
 * Text bez samohlásky („Hm.“) brnkne jednou hluboko.
 */
export function slabiky(text: string, vyraz?: Vyraz): Slabika[] {
  const vysoko = vyraz === "usmev" || vyraz === "stydi" || vyraz === "mrk";
  const hluboko = vyraz === "prisna" || vyraz === "klid";
  const tise = vyraz === "stydi" ? 0.75 : 1;
  const out: Slabika[] = [];
  let predSamohlaska = false;
  let zacatekSlova = true;
  [...text.toLowerCase()].forEach((z, i) => {
    const s = SAMOHLASKY.includes(z);
    if (s && !predSamohlaska) {
      const oktava = hluboko ? 0 : vysoko || zacatekSlova ? 5 : 0;
      out.push({ i, vys: STUPEN[z] + oktava, sila: (zacatekSlova ? 0.42 : 0.32) * (DLOUHE.includes(z) ? 1.15 : 1) * tise });
      zacatekSlova = false;
    }
    if (/\s/.test(z)) zacatekSlova = true;
    predSamohlaska = s;
  });
  if (!out.length) out.push({ i: 0, vys: 0, sila: 0.4 });
  return out;
}

/** Hlas k jedné replice: vrátí funkci pro psaní bubliny, která brnkne, když se napíše slabika */
export function samisen(text: string, vyraz?: Vyraz) {
  const podleZnaku = new Map(slabiky(text, vyraz).map((s) => [s.i, s]));
  return (i: number) => {
    if (i === 0 && vyraz === "uzas") zahraj({ druh: "ach", sila: 0.6, pan: PAN, skupina: "vazicka" });
    const s = podleZnaku.get(i);
    if (s) zahraj({ druh: "struna", vys: Math.min(9, s.vys), sila: s.sila, delka: DELKA, pan: PAN, skupina: "vazicka" });
  };
}

/** Po stydlivé větě se zachichotá za vějířem (`za` sekund — až dopíše) */
export const dozvuk = (vyraz: Vyraz | undefined, za: number) => {
  if (vyraz === "stydi") zahraj({ druh: "smich", sila: 0.4, pan: PAN, za, skupina: "vazicka" });
};
