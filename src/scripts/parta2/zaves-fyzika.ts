/**
 * Závěs s kami v hlavičce — tvar a fyzika, bez prohlížeče. Sourozenec
 * zvonkohry (zvonkohra-fyzika.ts): visí na stejném kroužku ve stejné výšce
 * a fouká do něj stejný vítr.
 *
 * Z břevna torii visí tři šňůrky, na každé tři místa pod sebou a na konci
 * papírový lístek. Každé místo je jeden nalezený kami, každá šňůrka jedna
 * komnata: jakmile jsou na ní všichni tři, lístek se rozsvítí. Šňůrky jsou
 * odleva čím dál delší, takže se čtou jako schody — tři, šest, devět.
 *
 * Počítá se v rovině obrazovky (x doprava, y dolů). Body se hýbou po malých
 * krocích a šňůrka je drží na délce, stejně jako u zvonkohry. Místa jsou
 * těžší a vítr je skoro neunáší; lístek je lehký, chytá ho nejvíc a právě
 * on šňůrkou cuká. Modul nesahá na window ani document — Zaves.astro z něj
 * vykreslí klidovou polohu už při buildu.
 */

import { SNUR, MIST, KOTVY } from "./zaves-miry";

/* Počty a kotvy jsou v zaves-miry.ts — potřebuje je i lehká část závěsu bez fyziky */
export { SNUR, MIST, KOTVY };
/** Počátek souřadnic je ve středu kroužku, za který závěs visí */
export const KOTVA_Y = 16.4;
/** Od břevna k prvnímu místu na nejkratší šňůrce a o kolik je každá další delší */
const PRVNI = 12.6;
const SCHOD = 6;
/** Rozteč míst na šňůrce a velikost kresby na jednom místě */
const ROZTEC = 19.5;
export const MISTO = 17;
export const LISTEK = { sirka: 9, vyska: 19, snurka: 12.5 };

export interface Bod {
  x: number;
  y: number;
  uhel: number;
}
export interface Poloha {
  /** Náklon břevna ve stupních */
  tram: number;
  snury: {
    /** Lomená čára šňůrky od břevna po lístek */
    body: number[];
    mista: Bod[];
    /** sirka je kosinus otočení: pod nulou je vidět rub */
    listek: Bod & { sirka: number };
  }[];
}

const G = 900;
/** Jak rychle vítr strhne část s sebou (1/s) — zároveň ji tlumí, když nefouká */
const ODPOR = { misto: 0.7, listek: 4.6 };
const KROK = 1 / 240;
/** Kolik bodů má jedna šňůrka: místa a těžiště lístku */
const B = MIST + 1;

/** Hladký šum: průměr několika sinusovek s náhodnou fází, zhruba −1…1 */
const sum = (frekvence: number[]) => {
  const faze = frekvence.map(() => Math.random() * Math.PI * 2);
  return (t: number) => frekvence.reduce((s, f, i) => s + Math.sin(t * f * Math.PI * 2 + faze[i]), 0) / frekvence.length;
};

/** Tlumený oscilátor na drobné pohyby: náklon břevna, otáčení lístku */
const kyvadlo = (perioda: number, tlumeni: number) => {
  const w = (Math.PI * 2) / perioda;
  return {
    uhel: 0,
    rychlost: 0,
    krok(dt: number, cil: number, sila: number) {
      this.rychlost += (-w * w * (this.uhel - cil) - 2 * tlumeni * w * this.rychlost + sila) * dt;
      this.uhel += this.rychlost * dt;
    },
  };
};

export function zaves() {
  const N = SNUR * B;
  const x = new Float64Array(N), y = new Float64Array(N);
  const vx = new Float64Array(N), vy = new Float64Array(N);
  const ox = new Float64Array(N), oy = new Float64Array(N);
  /** Převrácená hmotnost a to, jak moc bod unáší vítr (1/s) */
  const w = new Float64Array(N);
  const odpor = new Float64Array(N);
  /** Délka šňůrky nad bodem */
  const delka = new Float64Array(N);
  /** Vítr u každého bodu */
  const wx = new Float64Array(N);
  const kx = new Float64Array(SNUR), ky = new Float64Array(SNUR);
  const tram = kyvadlo(1.5, 0.4);
  const otoceni = KOTVY.map(() => kyvadlo(2.1, 0.08));
  /* Víry: každá šňůrka dostane vítr trochu jinak, lístek třepotá nejrychleji */
  const viry = KOTVY.map(() => ({
    snura: sum([0.29, 0.67, 1.13]),
    listek: sum([0.71, 1.37, 2.41]),
    otoc: sum([0.15, 0.36, 0.7]),
  }));
  let cas = 0;

  /* Kotvy se otáčejí s břevnem kolem kroužku */
  const kotvy = () => {
    const c = Math.cos(tram.uhel), s = Math.sin(tram.uhel);
    KOTVY.forEach((k, i) => {
      kx[i] = k * c - KOTVA_Y * s;
      ky[i] = k * s + KOTVA_Y * c;
    });
  };

  kotvy();
  for (let i = 0; i < SNUR; i++) {
    for (let j = 0; j < B; j++) {
      const b = i * B + j;
      const list = j === MIST;
      delka[b] = j === 0 ? PRVNI + SCHOD * i : list ? LISTEK.snurka + LISTEK.vyska / 2 : ROZTEC;
      x[b] = kx[i];
      y[b] = (j ? y[b - 1] : ky[i]) + delka[b];
      w[b] = list ? 1 / 0.22 : 1;
      odpor[b] = list ? ODPOR.listek : ODPOR.misto;
    }
  }

  /** Šňůrka mezi dvěma body — jen táhne, povolit může. a < 0 je pevná kotva. */
  const vazba = (a: number, b: number, px: number, py: number) => {
    const dx = x[b] - px, dy = y[b] - py;
    const d = Math.hypot(dx, dy);
    if (d <= delka[b]) return;
    const wa = a < 0 ? 0 : w[a];
    const k = (d - delka[b]) / (d * (wa + w[b]));
    if (a >= 0) {
      x[a] += wa * k * dx;
      y[a] += wa * k * dy;
    }
    x[b] -= w[b] * k * dx;
    y[b] -= w[b] * k * dy;
  };

  const podkrok = (h: number) => {
    for (let b = 0; b < N; b++) {
      const k = odpor[b];
      vx[b] += k * (wx[b] - vx[b]) * h;
      vy[b] += (G - 0.3 * k * vy[b]) * h;
      ox[b] = x[b];
      oy[b] = y[b];
      x[b] += vx[b] * h;
      y[b] += vy[b] * h;
    }
    for (let it = 0; it < 4; it++) {
      for (let i = 0; i < SNUR; i++) {
        for (let j = 0; j < B; j++) {
          const b = i * B + j;
          if (j === 0) vazba(-1, b, kx[i], ky[i]);
          else vazba(b - 1, b, x[b - 1], y[b - 1]);
        }
      }
    }
    for (let b = 0; b < N; b++) {
      vx[b] = (x[b] - ox[b]) / h;
      vy[b] = (y[b] - oy[b]) / h;
    }
    cas += h;
  };

  const stupne = (dx: number, dy: number) => (Math.atan2(-dx, dy) * 180) / Math.PI;

  return {
    /** Posune čas o dt sekund. vitr je rychlost větru zleva doprava (px/s) — půjčuje ji zvonkohra. */
    krok(dt: number, vitr: number) {
      dt = Math.min(dt, 1 / 20);
      if (dt <= 0) return;
      const sila = Math.abs(vitr);
      for (let i = 0; i < SNUR; i++) {
        const v = viry[i];
        const snura = vitr * (1 + 0.3 * v.snura(cas));
        for (let j = 0; j < MIST; j++) wx[i * B + j] = snura;
        wx[i * B + MIST] = vitr * (1 + 0.45 * v.listek(cas)) + 0.5 * sila * v.listek(cas + 7);
        otoceni[i].krok(dt, 0, 0.3 * sila * v.otoc(cas));
      }
      tram.krok(dt, -0.0012 * vitr, 0);
      kotvy();
      const kroku = Math.ceil(dt / KROK);
      for (let k = 0; k < kroku; k++) podkrok(dt / kroku);
    },

    /**
     * Ruka projela závěsem: bod (bx, by) v souřadnicích kresby, rychlost
     * v px/s. Co je v dosahu, zrychlí nanejvýš na rychlost ruky.
     */
    postrc(bx: number, by: number, rx: number) {
      const cx = Math.max(-90, Math.min(90, rx * 0.55));
      for (let b = 0; b < N; b++) {
        const list = b % B === MIST;
        if (Math.abs(bx - x[b]) > (list ? LISTEK.sirka / 2 + 3 : MISTO / 2 + 2)) continue;
        if (Math.abs(by - y[b]) > (list ? LISTEK.vyska / 2 + 3 : MISTO / 2 + 2)) continue;
        vx[b] = cx > 0 ? Math.max(vx[b], cx) : Math.min(vx[b], cx);
        if (list) otoceni[Math.floor(b / B)].rychlost += (Math.random() - 0.5) * 3;
      }
    },

    /** Na šňůrku někdo přibyl: cukne sebou od toho místa dolů a břevno se zhoupne */
    cukni(snura: number, misto = 0, sila = 1) {
      const kam = Math.random() < 0.5 ? -1 : 1;
      for (let j = misto; j < B; j++) vx[snura * B + j] += kam * (26 + 9 * (j - misto)) * sila;
      /* váha na kraji břevno stáhne na svou stranu, uprostřed s ním jen trochu škubne */
      tram.rychlost += (KOTVY[snura] ? Math.sign(KOTVY[snura]) * 0.5 : kam * 0.2) * sila;
      otoceni[snura].rychlost += kam * 5 * sila;
    },

    poloha(): Poloha {
      return {
        tram: (tram.uhel * 180) / Math.PI,
        snury: KOTVY.map((_, i) => {
          const body = [kx[i], ky[i]];
          const mista: Bod[] = [];
          for (let j = 0; j < MIST; j++) {
            const b = i * B + j;
            const px = j ? x[b - 1] : kx[i], py = j ? y[b - 1] : ky[i];
            mista.push({ x: x[b], y: y[b], uhel: stupne(x[b] - px, y[b] - py) });
            body.push(x[b], y[b]);
          }
          /* lístek visí za horní okraj: ten leží na spojnici posledního místa a těžiště lístku */
          const p = i * B + MIST - 1, t = p + 1;
          const dx = x[t] - x[p], dy = y[t] - y[p];
          const d = Math.hypot(dx, dy) || 1;
          const hx = x[p] + (dx / d) * LISTEK.snurka, hy = y[p] + (dy / d) * LISTEK.snurka;
          body.push(hx, hy);
          return { body, mista, listek: { x: hx, y: hy, uhel: stupne(dx, dy), sirka: Math.cos(otoceni[i].uhel) } };
        }),
      };
    },
  };
}

export type Zaves = ReturnType<typeof zaves>;

/** Kam se poloha zapíše: klíč prvku (data-zv), atribut, hodnota */
export type Zapisovac = (klic: string, atribut: string, hodnota: string) => void;

const f = (v: number) => (Math.round(v * 100) / 100).toString();

/** Převede polohu na atributy kresby — stejně při buildu i v prohlížeči */
export function zapis(p: Poloha, nastav: Zapisovac) {
  nastav("tram", "transform", `rotate(${f(p.tram)})`);
  p.snury.forEach((s, i) => {
    nastav(`snura-${i}`, "points", s.body.map(f).join(" "));
    s.mista.forEach((m, j) => nastav(`misto-${i}-${j}`, "transform", `translate(${f(m.x)} ${f(m.y)}) rotate(${f(m.uhel)})`));
    const l = s.listek;
    nastav(`listek-${i}`, "transform", `translate(${f(l.x)} ${f(l.y)}) rotate(${f(l.uhel)}) scale(${f(Math.max(0.05, Math.abs(l.sirka)))} 1)`);
    nastav(`listek-${i}-lic`, "visibility", l.sirka >= 0 ? "visible" : "hidden");
    nastav(`listek-${i}-rub`, "visibility", l.sirka >= 0 ? "hidden" : "visible");
  });
}
