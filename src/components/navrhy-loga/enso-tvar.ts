/**
 * Geometrie ensō ze značky (návrh 01, Enso.astro): tah štětce s proměnnou
 * šířkou, kapka na začátku, suché struhy v ocasu, rýha hlavy kruhu a místo
 * pro květ v mezeře. Čistý modul — kreslí z něj logo i skrytý tisk pod UV
 * lampou na dárkových jízdenkách (components/rezervace/darky.ts).
 * Souřadnice v rámečku 200 × 200, střed kruhu 100, 100.
 */
import { tah, cara, rad, type Bod } from "./sdilene";

/** Kde tah začíná a kolik obepíná — soumrak se podle toho barví */
export const ZACATEK_SOUMRAK = -26;
export const ROZSAH_SOUMRAK = 308;

export const S = 100;
export const R = 68;
export const W = 19;
/** Tah začíná kousek nad třetí hodinou a jde po směru hodin. */
const ZACATEK = ZACATEK_SOUMRAK;
const ROZSAH = ROZSAH_SOUMRAK;

/** Ruka nevede kruh dokonale: poloměr mírně dýchá a konec se stáčí ven. */
const polomer = (u: number, t: number) =>
  R * (1 + 0.022 * Math.sin(rad(u) * 2 + 0.6) + 0.01 * Math.sin(rad(u) * 5 + 1.3)) +
  3.5 * Math.pow(Math.max(0, t - 0.8) / 0.2, 2);

const naKruhu = (u: number, t: number, o = 0): Bod => {
  const r = polomer(u, t) + o;
  return [S + r * Math.cos(rad(u)), S + r * Math.sin(rad(u))];
};
const stred = (t: number) => naKruhu(ZACATEK + ROZSAH * t, t);
const sirka = (t: number) => {
  if (t < 0.05) return W * (0.62 + 0.38 * (t / 0.05));
  if (t < 0.5) return W * (1 - 0.1 * ((t - 0.05) / 0.45));
  return W * 0.9 * (1 - 0.86 * Math.pow((t - 0.5) / 0.5, 1.5));
};
export const hlavni = tah(stred, sirka, 160);

/** Kapka, kde štětec dosedl — o kousek za začátkem tahu. */
const [ax, ay] = stred(0);
const [bx, by] = stred(0.01);
const smer = Math.atan2(by - ay, bx - ax);
export const kapka = {
  x: (ax - Math.cos(smer) * 1.6).toFixed(2),
  y: (ay - Math.sin(smer) * 1.6).toFixed(2),
  uhel: ((smer * 180) / Math.PI).toFixed(1),
};

/** Střední čára pro odkrývání v animaci — o kousek delší na obou koncích. */
export const odhal = cara(
  Array.from({ length: 121 }, (_, i) => {
    const t = -0.035 + (1.05 * i) / 120;
    return naKruhu(ZACATEK + ROZSAH * t, Math.min(1, Math.max(0, t)));
  }),
);

/**
 * Suchý štětec: podélné struhy v ocasu tahu. Leží v pevné vzdálenosti
 * od středu, takže jak se tah zužuje, vypadávají z něj jedna po druhé.
 */
export const struhy = [
  { o: -6.0, od: 0.6, w: 0.9, dash: "16 2.4 7 1.6 22 3" },
  { o: -2.3, od: 0.7, w: 0.7, dash: "9 1.8 30 2.6 12 2" },
  { o: 1.9, od: 0.56, w: 1.0, dash: "24 3 11 2 17 2.2" },
  { o: 5.4, od: 0.66, w: 0.8, dash: "12 2.2 20 3.2 8 1.6" },
].map((s) => ({
  ...s,
  d: cara(
    Array.from({ length: 51 }, (_, i) => {
      const t = s.od + ((1.02 - s.od) * i) / 50;
      return naKruhu(ZACATEK + ROZSAH * t, Math.min(1, t), s.o);
    }),
  ),
}));

/** Rýha hlavy kruhu — vlevo dole, naproti mezeře s květem. */
const R2 = 35;
const ryhaStred = (t: number): Bod => {
  const u = 62 + 150 * t;
  const r = R2 * (1 + 0.03 * Math.sin(rad(u) * 3));
  return [S + r * Math.cos(rad(u)), S + r * Math.sin(rad(u))];
};
const ryhaSirka = (t: number) => 0.6 + 4.4 * Math.pow(Math.sin(Math.PI * t), 0.6) * (1 - 0.35 * t);
export const ryha = tah(ryhaStred, ryhaSirka, 70);
export const ryhaOdhal = cara(Array.from({ length: 61 }, (_, i) => ryhaStred(-0.03 + (1.06 * i) / 60)));

/** Květ sedí přesně v mezeře mezi koncem a začátkem tahu. */
export const uKvetu = ZACATEK - (360 - ROZSAH) / 2;
export const kvet = { x: S + (R + 3) * Math.cos(rad(uKvetu)), y: S + (R + 3) * Math.sin(rad(uKvetu)) };
/** Jeden plátek už spadl dovnitř kruhu. */
export const volny = { x: S + 40 * Math.cos(rad(uKvetu)), y: S + 40 * Math.sin(rad(uKvetu)) };
