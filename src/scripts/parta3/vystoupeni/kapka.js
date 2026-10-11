/*
 * Vystoupení Kapky na /parta-3 — choreografie pro scény ze scripts/kapka-hrom.
 * Jak se zapisují, je v ../herec.js; hraje je režisér (../reziser.ts).
 *
 * Obě scény si hrají samy, když se na ně nesahá, a tím by si vrchol spustily
 * dřív, než má přijít. Obě choreografie proto klepnou hned v první vteřině
 * a pak nikdy nenechají delší pauzu, než kolik scéna vydrží mlčet
 * (kruh 6 s, buben 4 s).
 */
import { cekej, mys, klik, drz, pust, pryc, az, titulek, ohlas } from "../herec.js";

/**
 * Klepnutí na čas `kdy` (vteřiny vystoupení): ukazatel dojede těsně před ním.
 * Čas hlídá h.t, ne součet čekání, takže se rytmus nerozjíždí.
 */
function* naCas(h, kdy, x, y, najezd = 0.12) {
  const jinde = h.mys && Math.hypot(h.mys.x - x, h.mys.y - y) > 0.5;
  const pockat = kdy - h.t - (jinde ? najezd : 0);
  if (pockat > 0) yield cekej(pockat);
  yield klik(x, y, Math.max(0, kdy - h.t));
}

/* ═══ 01 Kami — kruh hromu ═══ */

/* kruh bubnů z kami-kruh.js: střed, poloměr a úhly — 0 a 6 jsou dolní (paličky), 3 horní */
const C = [90, 78], R = 50;
const BUBNY = [157.5, 195, 232.5, 270, 307.5, 345, 22.5].map((u) => [C[0] + R * Math.cos((u * Math.PI) / 180), C[1] + R * Math.sin((u * Math.PI) / 180)]);
/* rána padne až chvíli po klepnutí: paličkou za 0,1 s, stuhou za 0,16 s (krok v kami-kruh.js) */
const NAPRAH = (i) => (i === 0 || i === 6 ? 0.1 : 0.16);

/** Fráze na kruhu: noty [doba, buben]; doba trvá `krok` vteřin a počítá se od času `od`, rána padne na ni. */
function* fraze(h, od, krok, noty) {
  for (const [n, i] of noty) yield* naCas(h, od + n * krok - NAPRAH(i), ...BUBNY[i]);
}
/** Víření: se stisknutým tlačítkem přes bubny `cesta`; každý, na který ukazatel vjede, dostane ránu. */
function* vir(cesta, usek = 0.17) {
  yield drz(...BUBNY[cesta[0]], 0.2);
  for (const i of cesta.slice(1)) yield mys(...BUBNY[i], usek);
  /* chvilku podržet, ať scéna stihne zaznamenat i poslední buben */
  yield cekej(0.07);
  yield pust();
}

/* ═══ 02 Tušový lem — buben je měsíc ═══ */

/* kůže z lem-buben.js: střed a poloměr. Do 0,55 poloměru duní (don), dál zní výš (ten), mimo kůži jsou paličky o sebe (ka). Vlevo od středu bije levá ruka, vpravo pravá. */
const CM = [90, 64], RM = 46;
const DON = { L: [CM[0] - 12, CM[1] + 4], P: [CM[0] + 12, CM[1] + 4] };
const TEN = { L: [CM[0] - 31, CM[1] - 16], P: [CM[0] + 31, CM[1] - 16] };
const KA = [CM[0], CM[1] + RM + 40];

/** Fráze na velkém bubnu: noty [doba, místo]; rána padne 0,1 s po klepnutí. */
function* frazeBubnu(h, od, krok, noty) {
  for (const [n, kam] of noty) yield* naCas(h, od + n * krok - 0.1, ...kam);
}

export default {
  /*
   * 01 Kami — kruh hromu: paličky, stuhy, déšť, víření a nakonec všech sedm krátce po sobě,
   * průtrž a duha. Průtrž spustí sedm bubnů během 6 s, a tak se horní buben (3) celou dobu
   * šetří: dokud nezazní, průtrž přijít nemůže, a přijde přesně s ním.
   */
  kruh: {
    delka: 38,
    *hraj(h) {
      /* nástup: jedna rána hned — první klepnutí umlčí klidový vzor, který by si průtrž spustil sám už v 5. vteřině */
      yield titulek("Kapka nosí za zády sedm bubnů hromu.");
      yield cekej(0.3);
      yield klik(...BUBNY[0], 0);
      yield cekej(0.6);
      yield pryc();
      yield cekej(1.8);

      /* 1. paličky: tři, tři, sedm */
      yield titulek("Na dva dolní dosáhne paličkami.");
      yield* fraze(h, h.t + 0.6, 0.24, [[0, 0], [1, 6], [2, 0], [4, 6], [5, 0], [6, 6], [8, 0], [9, 6], [10, 0], [11, 6], [12, 0], [13, 6], [14, 0]]);
      yield cekej(0.5);
      yield pryc();
      yield cekej(1);

      /* 2. stuhy: nejdřív pomalu, ať je vidět švih, pak totéž zčerstva */
      yield titulek("Na ostatní ne. Do těch bije stuhou.");
      yield* fraze(h, h.t + 0.7, 0.6, [[0, 1], [1, 5], [2, 2], [3, 4]]);
      yield* fraze(h, h.t + 0.7, 0.24, [[0, 1], [1, 5], [2, 2], [3, 4]]);
      yield cekej(0.5);
      yield pryc();
      yield cekej(1);

      /* 3. paličky se ptají, stuhy odpovídají; z mráčku prší čím dál víc */
      yield titulek("Bubnuje ona. Prší potom samo.");
      yield* fraze(h, h.t + 0.6, 0.22, [
        [0, 0], [1, 6], [2, 1], [3, 5],
        [5, 0], [6, 6], [7, 2], [8, 4],
        [10, 0], [11, 6], [12, 1], [13, 5], [14, 2], [15, 4],
      ]);
      yield cekej(0.5);
      yield pryc();
      yield ohlas("potlesk");
      yield cekej(1.3);

      /* 4. víření: po levé straně nahoru a dolů, po pravé taky, a ještě jednou rychleji */
      yield titulek("Když se rozjede, víří.");
      yield cekej(0.4);
      yield* vir([0, 1, 2, 1, 0]);
      yield* vir([6, 5, 4, 5, 6]);
      yield* vir([0, 1, 2, 1, 0], 0.14);
      yield* vir([6, 5, 4, 5, 6], 0.14);
      yield cekej(0.5);
      yield pryc();
      yield cekej(1.6);

      /* vrchol: paličky se rozjedou, víření vyběhne po obou stranách nahoru a obě stuhy švihnou do horního bubnu */
      yield titulek("Ten nejvyšší si šetří na konec.");
      yield ohlas("volani");
      yield* fraze(h, h.t + 1.4, 1, [[0, 0], [0.36, 6], [0.68, 0], [0.96, 6], [1.2, 0], [1.4, 6]]);
      yield* vir([0, 1, 2], 0.15);
      yield* vir([6, 5, 4], 0.15);
      yield cekej(0.2);
      yield klik(...BUBNY[3], 0.2);
      yield klik(...BUBNY[3], 0);
      yield az(() => h.dyn.prutrz > 0, 1);
      /* pojistka: kdyby do víření sáhla opravdová myš a některý buben vypadl, obejde všech sedm ještě jednou */
      if (!(h.dyn.prutrz > 0)) {
        for (const i of [0, 1, 2, 6, 5, 4, 3]) yield klik(...BUBNY[i], 0.08);
        yield az(() => h.dyn.prutrz > 0, 1);
      }
      yield ohlas("uzas");
      yield titulek("Průtrž.");

      /* dohra: leje 3,4 s. Tři rány do deště nejsou jen z radosti — odsunou klidový vzor, ať pod duhou stojí tiše */
      const hrom = h.t;
      yield cekej(0.5);
      yield pryc();
      yield* fraze(h, hrom + 1.9, 0.4, [[0, 0], [1, 6], [2, 0]]);
      yield cekej(0.4);
      yield pryc();
      /* duha vychází 3 s po hromu a drží se do 8,6 s */
      yield cekej(Math.max(0, hrom + 3.6 - h.t));
      yield titulek("A duha potom přijde taky sama.");
      yield cekej(Math.max(0, hrom + 8 - h.t));
    },
  },

  /*
   * 02 Tušový lem — buben je měsíc: každá rána do kůže přidá do louže pod lešením; čtrnáctá ji
   * naplní a scéna pak sama zavíří, dá velkou ránu, spustí liják, otočí se a ukloní.
   * Choreografie proto rozdá třináct ran do obrazů a čtrnáctou si nechá na vrchol.
   * Paličky o sebe (ka) louži neplní, těmi se odpočítává a vyplňuje rytmus.
   */
  buben: {
    delka: 33,
    *hraj(h) {
      /* nástup: paličky odpočítají. První klepnutí musí přijít do 1,1 s, jinak začne bubnovat sama. */
      yield titulek("Kapka bubnuje zády k nám. Její buben je měsíc.");
      yield* frazeBubnu(h, 1.0, 0.3, [[0, KA], [2, KA], [4, KA], [5, KA]]);

      /* 1. tři pomalé rány doprostřed: je vidět vlna na kůži a déšť, který rána setřese */
      yield* frazeBubnu(h, 3.1, 1.6, [[0, DON.L]]);
      yield cekej(0.5);
      yield titulek("Každá rána rozvlní měsíc a setřese trochu deště.");
      yield* frazeBubnu(h, 3.1, 1.6, [[1, DON.P], [2, DON.L]]);
      yield cekej(0.6);
      yield pryc();
      yield cekej(1.1);

      /* 2. střed a kraj: don — ten ten — don — ten ten */
      yield titulek("Uprostřed buben duní, u kraje zní výš.");
      yield* frazeBubnu(h, h.t + 0.6, 0.3, [[0, DON.L], [2, TEN.P], [3, TEN.L], [5, DON.P], [7, TEN.L], [8, TEN.P]]);
      yield cekej(0.6);
      yield pryc();
      yield cekej(1.1);

      /* 3. totéž s paličkami o sebe: louže roste jen po ranách do kůže, je čas si jí všimnout */
      yield titulek("Pod lešením roste louže tuše a měsíc se v ní zhlíží.");
      yield* frazeBubnu(h, h.t + 0.6, 0.3, [[0, DON.L], [2, KA], [3, KA], [5, DON.P], [7, KA], [8, KA]]);
      yield cekej(0.4);
      yield pryc();
      yield cekej(1.3);

      /* vrchol: znovu odpočítá a tři rány zrychlí — poslední naplní louži a scéna naváže vířením */
      yield ohlas("volani");
      const nastup = h.t + 0.7;
      yield* frazeBubnu(h, nastup, 0.25, [[0, KA], [2, KA], [4, KA], [5, KA]]);
      yield* frazeBubnu(h, nastup + 1.75, 1, [[0, DON.L], [0.6, DON.P], [1.05, DON.L]]);
      /* pojistka: kdyby louže ještě plná nebyla, přidá ránu */
      for (let i = 0; i < 3; i++) {
        yield az(() => h.dyn.faze !== "hra", 0.4);
        if (h.dyn.faze !== "hra") break;
        yield klik(...(i % 2 ? DON.L : DON.P), 0.1);
      }
      yield titulek("Louže je plná. Kapka zavíří.");
      yield pryc();
      yield az(() => h.dyn.faze === "lijak", 4);
      yield ohlas("uzas");
      yield titulek("Zahřmí, spustí se liják a vítr s ním hází.");

      /* liják trvá 3,3 s: rychlý pohyb ukazatele ze strany na stranu je vítr, déšť se naklání */
      yield cekej(0.7);
      yield mys(20, 110, 0);
      for (const x of [160, 20, 160, 20]) yield mys(x, 110, 0.5);
      yield pryc();

      /* dohra: mraky se rozejdou, otočí se a ukloní; u louže se ozve žába */
      yield az(() => h.dyn.faze === "otocka", 3);
      yield titulek("Je po dešti. Kapka se otočí a ukloní.");
      yield az(() => h.dyn.kvak > 0, 3);
      yield ohlas("smich");
      yield az(() => h.dyn.faze === "klid", 5);
      yield titulek("Louže se vsakuje, žába kváká. Noc začíná znovu.");
      yield cekej(2.6);
    },
  },
};
