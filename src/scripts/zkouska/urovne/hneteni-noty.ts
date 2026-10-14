/**
 * Píseň pro úroveň 二 Kiku-neri (hneteni.ts): noty, válec a doprovod.
 *
 * Všechno je pevně dané, žádná náhoda — každý hraje stejnou píseň, takže
 * se dá natrénovat. 100 dob za minutu, takt 4/4 trvá 2,4 s. Čas 0 je první
 * doba odpočítávání, čas se počítá v sekundách.
 *
 *   takty 0–1    odpočet: dřívka hyōshigi (raz — dva — raz, dva, tři, čtyři)
 *   takty 2–7    A — čtvrtky, tlač–otoč, tlač–otoč: tak se hněte kiku-neri
 *   takty 8–13   B — osminy
 *   takty 14–19  C — synkopy, dvojice a rychlé střídání
 *   takty 20–21  „Bublinka utíká“ — válec, tlačí se, co to dá
 *   takt 22      poslední velká tlač
 *
 * Takt se zapisuje osmi znaky po osminách: T tlač, O otoč, X velká tlač,
 * Y velká otoč, tečka nic. Velké noty stojí na koncích frází.
 *
 * Doprovod: hluboký buben (don) na první a třetí dobu, dřevěné ťuknutí na
 * druhou a čtvrtou, a koto, které hraje s notami — tlač zní dole, otoč
 * nahoře, takže se dá hrát i podle sluchu. Stupnice miyako-bushi na E:
 * E F A H C.
 */

export type Typ = "tlac" | "otoc";
export type Cast = "A" | "B" | "C" | "konec";

export interface Nota {
  /** Kdy má přijít úder (s) */
  t: number;
  typ: Typ;
  velka: boolean;
  cast: Cast;
}

export interface Udalost {
  t: number;
  co: "ki" | "don" | "kara" | "koto" | "bas";
  /** Výška v Hz (koto a basa) */
  f?: number;
  sila: number;
}

export const TEMPO = 100;
export const DOBA = 60 / TEMPO;
export const TAKT = 4 * DOBA;
const OSMINA = DOBA / 2;

/** Tóny miyako-bushi */
const H3 = 246.94, E4 = 329.63, F4 = 349.23, A4 = 440, H4 = 493.88, C5 = 523.25, E5 = 659.26;
const E2 = 82.41, A2 = 110, H2 = 123.47, E3 = 164.81;

const CASTI: { cast: Cast; od: number; takty: string[]; tlac: number[]; otoc: number[] }[] = [
  {
    cast: "A", od: 2,
    takty: ["T.O.T.O.", "T.O.X...", "T.O.T.O.", "T.O.X...", "T.O.T.O.", "T.O.T.Y."],
    tlac: [E4, F4, E4, A4], otoc: [H4, A4, H4, C5],
  },
  {
    cast: "B", od: 8,
    takty: ["TTO.TTO.", "TOTOX...", "TTO.TTO.", "TOTOT.Y.", "T.TOT.TO", "TOTOX..."],
    tlac: [E4, F4, A4, F4], otoc: [H4, C5, E5, C5],
  },
  {
    cast: "C", od: 14,
    takty: ["T..T..O.", "T..T..TO", "TTOOTTO.", "O.OTO.X.", "TOOTTOOT", "X...Y..."],
    tlac: [A4, F4, E4, F4], otoc: [C5, H4, E5, H4],
  },
];

/** Válec: od první doby taktu 20 do čtvrté doby taktu 21 */
export const VALEC = { od: 20 * TAKT, do: 21 * TAKT + 3 * DOBA };
/** Válec se počítá jako vyhnání, když je úderů aspoň tolik */
export const VALEC_DOST = 12;
/** Poslední velká tlač */
const POSLEDNI = 22 * TAKT;
/** Hra končí dobu po poslední notě */
export const KONEC = POSLEDNI + DOBA;

export const NOTY: Nota[] = [];
export const HUDBA: Udalost[] = [];

/** Kde je melodie každého typu v rámci fráze */
const poradi: Record<Typ, number> = { tlac: 0, otoc: 0 };
for (const c of CASTI) {
  c.takty.forEach((radek, k) => {
    const takt = c.od + k;
    /* Melodie se po dvou taktech opakuje — fráze */
    if (k % 2 === 0) poradi.tlac = poradi.otoc = 0;
    [...radek].forEach((znak, j) => {
      if (znak === ".") return;
      const t = takt * TAKT + j * OSMINA;
      const typ: Typ = znak === "T" || znak === "X" ? "tlac" : "otoc";
      const velka = znak === "X" || znak === "Y";
      NOTY.push({ t, typ, velka, cast: c.cast });
      if (velka) {
        /* Konec fráze: oktáva */
        HUDBA.push({ t, co: "koto", f: typ === "tlac" ? E4 : E5, sila: 1 });
        HUDBA.push({ t, co: "koto", f: typ === "tlac" ? E3 : H4, sila: 0.8 });
      } else {
        const rada = c[typ];
        HUDBA.push({ t, co: "koto", f: rada[poradi[typ]++ % rada.length], sila: 0.75 });
      }
    });
  });
}
NOTY.push({ t: POSLEDNI, typ: "tlac", velka: true, cast: "konec" });

/* ——— Doprovod ——— */

/* Odpočet: dřívka na první a třetí dobu prvního taktu, pak na každou */
export const ODPOCET: { t: number; text: string }[] = [
  { t: 0, text: "raz" },
  { t: 2 * DOBA, text: "dva" },
  { t: 4 * DOBA, text: "raz" },
  { t: 5 * DOBA, text: "dva" },
  { t: 6 * DOBA, text: "tři" },
  { t: 7 * DOBA, text: "čtyři" },
];
for (const o of ODPOCET) HUDBA.push({ t: o.t, co: "ki", sila: o.t < 4 * DOBA ? 0.8 : 1 });
/* Do první noty se vběhne po stupnici */
[E4, F4, A4, H4].forEach((f, i) => HUDBA.push({ t: 7.5 * DOBA + i * (DOBA / 8), co: "koto", f, sila: 0.45 + i * 0.1 }));

const BASY = [E2, E2, A2, H2];
for (let takt = 2; takt < 20; takt++) {
  const t0 = takt * TAKT;
  const sila = takt < 8 ? 0.8 : takt < 14 ? 0.9 : 1;
  HUDBA.push({ t: t0, co: "don", sila: sila });
  HUDBA.push({ t: t0 + DOBA, co: "kara", sila: 0.55 * sila });
  HUDBA.push({ t: t0 + 2 * DOBA, co: "don", sila: 0.6 * sila });
  HUDBA.push({ t: t0 + 3 * DOBA, co: "kara", sila: 0.55 * sila });
  HUDBA.push({ t: t0, co: "bas", f: BASY[(takt - 2) % 4], sila: 0.9 });
  HUDBA.push({ t: t0 + 2 * DOBA, co: "bas", f: BASY[(takt - 2) % 4], sila: 0.5 });
  /* V části C pohání ťukání i na osminy mezi dobami */
  if (takt >= 14) for (let d = 0; d < 4; d++) HUDBA.push({ t: t0 + d * DOBA + OSMINA, co: "kara", sila: 0.28 });
}
/* Válec: buben na každou dobu a ťukání na osminy, sílí */
for (let i = 0; i < 16; i++) {
  const t = VALEC.od + i * OSMINA;
  const k = i / 15;
  if (i % 2 === 0) HUDBA.push({ t, co: "don", sila: 0.55 + 0.5 * k });
  HUDBA.push({ t, co: "kara", sila: 0.25 + 0.35 * k });
  if (i % 4 === 0) HUDBA.push({ t, co: "bas", f: i < 8 ? E2 : H2, sila: 0.8 });
}
/* Konec: velký buben a koto zahraje akord odspodu nahoru */
HUDBA.push({ t: POSLEDNI, co: "don", sila: 1.25 });
HUDBA.push({ t: POSLEDNI, co: "bas", f: E2, sila: 1 });
[E3, H3, E4, A4, H4, E5].forEach((f, i) => HUDBA.push({ t: POSLEDNI + i * 0.035, co: "koto", f, sila: 0.7 }));

HUDBA.sort((a, b) => a.t - b.t);

/** Začátky částí — kvůli krátké zprávě */
export const ZACATKY: { t: number; cast: Cast }[] = CASTI.map((c) => ({ t: c.od * TAKT, cast: c.cast }));

/** Taktové čáry na dráze: od prvního taktu s notami po poslední */
export const CARY: number[] = Array.from({ length: 21 }, (_, i) => (i + 2) * TAKT);

/** Počet not, které se počítají do zásahů (válec ne) */
export const POCET = NOTY.length;
