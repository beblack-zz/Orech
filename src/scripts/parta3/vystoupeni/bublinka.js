/*
 * Vystoupení Bublinky na /parta — choreografie pro scény ze scripts/bublinka-strasidlo.
 * Jak se zapisují, je v ../herec.js; hraje je režisér (../reziser.ts).
 */
import { cekej, mys, klik, pryc, az, titulek, ohlas } from "../herec.js";

/** Čas scény — v něm jsou časové značky v dyn (fuk, dalsi). */
const cas = (h) => h.t + (h.V.zacatek || 0);

/* ——— ohen (kami-ohen.js) ——— */
/* duch stojí v kotouči nad ní: ukazatel na něm (v kotouči a výš než y 82,6) = ohlédne se */
const NA_DUCHA = [90, 62];
/* pod ní uprostřed: žádný vítr, kouká před sebe */
const KLID = [90, 128];
/* sfouknutí: 3,5 s po klepnutí svatozář vzplane (KONEC − 0,4), po 5,2 s si zase všímá ducha (KONEC + 1,3) */
const VZPLANE = 3.5, DOHRANO = 5.2;

/* ——— hrbitov (lem-hrbitov.js) ——— */
/* hrnce podle čísla v HRNCE: [x, y, měřítko, natočení, výška ústí]; 9 a 10 jsou talíře, ty mlčí.
   Tón hrnce je číslo % 6 v pentatonice: 0 a 6 znějí stejně, 1 a 7, 2 a 8, 5 a 11. */
const HRNCE = {
  0: [33, 155, 0.72, -18, 25.4], 1: [58, 153, 0.9, -7, 30], 2: [88, 151, 0.86, 5, 25.4],
  3: [112, 152, 0.95, -14, 25], 4: [138, 154, 0.82, 9, 30], 5: [160, 155, 0.9, 14, 11],
  6: [44, 167, 1.02, -24, 25.4], 7: [76, 153.6, 1.2, 172, -2], 8: [106, 169, 1.06, 3, 30], 11: [157, 169, 1.02, 26, 25],
};
/** Kudy z hrnce leze dušička (p.vychod): klepnutí sem vybere právě tenhle hrnec. */
const usti = (i) => {
  const [x, y, s, rot, v] = HRNCE[i];
  const a = (rot * Math.PI) / 180;
  return [x + s * v * Math.sin(a), y - s * v * Math.cos(a)];
};
/* řada jich unese sedm (NEJVIC); s osmou nejstarší odletí k měsíci */
const NEJVIC = 7;
/* celá halda zleva doprava, přední hrnec vždy zopakuje tón zadního: c c d d e e g a c c */
const STUPNICE = [0, 6, 1, 7, 2, 8, 3, 4, 5, 11];
/** Kudy obchází haldu, když ji nikdo nevede (draha). */
const draha = (t) => [90 + 46 * Math.sin(t * 0.33), 80 + 15 * Math.sin(t * 0.66 + 0.6)];

export default {
  /* 01 Kami — studený oheň: vítr, dvakrát ohlédnutí po duchovi, sfouknutá svatozář a ohlédnutí na rozloučenou */
  ohen: {
    delka: 33,
    *hraj(h) {
      yield titulek("Bublinka, strašidlo. V kotouči za ní stojí ještě jedno.");
      yield cekej(2.6);
      /* ukazatel je vítr: plameny se od něj odklánějí */
      yield titulek("Plameny kolem uhýbají před větrem.");
      yield mys(22, 96, 0);
      yield cekej(1.6);
      yield mys(158, 96, 0.9);
      yield cekej(1.6);
      yield mys(...KLID, 0.6);
      yield cekej(1);
      /* v 9. vteřině by se ohlédla i sama (dyn.kouk) — ukazatel na duchovi ji předběhne a podrží do 11. */
      yield mys(...NA_DUCHA, 0.3);
      yield az(() => h.dyn.m < 0.3, 2);
      yield titulek("Ohlédne se. Stojí tam andílek.");
      yield ohlas("smich");
      yield cekej(Math.max(2.2, 11.3 - h.t));
      yield mys(...KLID, 0.4);
      yield az(() => h.dyn.m > 0.35, 3);
      yield titulek("Otočí se zpátky — a rohy jsou venku.");
      yield az(() => h.dyn.m > 0.9, 3);
      yield cekej(0.9);
      yield mys(...NA_DUCHA, 0.25);
      yield az(() => h.dyn.m < 0.3, 2);
      yield titulek("Zkusí to rychleji. Zase andílek.");
      yield cekej(1.1);
      yield mys(...KLID, 0.25);
      yield az(() => h.dyn.m > 0.9, 4);
      yield cekej(0.8);
      /* rychlé mávání oheň rozdmýchá (vstup.rychlost), klepnutí ho sfoukne */
      yield ohlas("volani");
      yield titulek("Vítr oheň rozdmýchá. Ona ho sfoukne.");
      for (let i = 0; i < 8; i++) yield mys(i % 2 ? 152 : 28, 104, 0.26);
      yield klik(90, 100, 0.2);
      yield az(() => cas(h) - h.dyn.fuk > 0.75, 2);
      yield titulek("Tma. Svítí jen houby, oči a zuby.");
      yield ohlas("uzas");
      /* plameny naskáčou samy; až vzplanou všechny, titulek uhne */
      yield az(() => cas(h) - h.dyn.fuk > VZPLANE, 5);
      yield titulek("");
      yield az(() => cas(h) - h.dyn.fuk > DOHRANO - 0.3, 3);
      /* na rozloučenou ještě jednou; rohy pak dorostou už bez ukazatele */
      yield mys(...NA_DUCHA, 0.3);
      yield az(() => h.dyn.m < 0.3, 2);
      yield titulek("Ohlédne se naposled. Nic. Jen andílek.");
      yield ohlas("smich");
      yield cekej(1.6);
      yield pryc();
      yield az(() => h.dyn.m > 0.9, 4);
      yield cekej(1.2);
    },
  },

  /* 02 Tušový lem — hřbitov hrnců: průvod, zvonek nad hrncem, osmá dušička a nakonec stupnice přes celou haldu */
  hrbitov: {
    delka: 34,
    *hraj(h) {
      const chodi = () => h.dyn.duse.filter((o) => o.stavD !== "stoupa").length;
      const stoupa = () => h.dyn.duse.filter((o) => o.stavD === "stoupa").length;
      /* ve 3,2 s vyleze z haldy první dušička sama (dyn.dalsi) — titulek na ni čeká */
      yield titulek("Bublinka na hřbitově hrnců. Co kdy prasklo, má tu dušičku.");
      yield cekej(3.5);
      /* oblouk přes celé nebe, ať je řada vidět; první klepnutí musí přijít dřív, než vyleze další sama (8,7 s) */
      yield titulek("Vede je se zvonkem. Kudy pluje ona, tudy jdou za ní.");
      yield mys(h.dyn.fig.x, h.dyn.fig.y + 4, 0);
      yield mys(148, 58, 0.9);
      yield mys(92, 42, 1.1);
      yield mys(42, 60, 1.1);
      yield mys(38, 104, 0.8);
      /* zvoní zleva doprava, dokud není řada plná; další klepnutí pak pošle nejstarší k měsíci */
      yield klik(...usti(6), 0.45);
      yield titulek("Zazvoní nad hrncem — a vyklouzne další.");
      yield cekej(1.9);
      if (chodi() < NEJVIC) {
        yield klik(...usti(8), 0.8);
        yield cekej(1.9);
      }
      yield klik(...usti(4), 0.8);
      yield az(() => stoupa() > 0, 1);
      yield titulek("Osmá se do řady nevejde. Nejstarší letí k měsíci.");
      yield az(() => stoupa() === 0, 4);
      yield ohlas("uzas");
      yield cekej(0.6);
      /* druhý oblouk s plnou řadou, pod měsícem doleva; pět vteřin po zvonění vyleze jedna sama (dyn.dalsi) */
      yield titulek("Řada je plná. Jedna vyleze, jedna odletí.");
      yield mys(150, 84, 0.9);
      yield mys(108, 58, 1);
      yield mys(56, 62, 1);
      yield mys(34, 104, 1);
      yield ohlas("volani");
      yield titulek("A teď zazvoní na všechny, od kraje do kraje.");
      yield cekej(0.9);
      /* kdyby zrovna lezla dušička sama, počkat, až její hrnec zhasne — klepnutí by si jinak vzalo sousední */
      if (h.dyn.dalsi - cas(h) < 0.5) {
        yield az(() => h.dyn.dalsi - cas(h) > 3, 1.5);
        yield cekej(1.3);
      }
      /* půl vteřiny na tón, tak se houpe i zvonek; sedmým tónem je stará řada pryč, pak odlétají už i ty čerstvé */
      for (const [n, i] of STUPNICE.entries()) {
        yield klik(...usti(i), 0.3);
        yield cekej(0.11);
        if (n === 6) {
          yield titulek("Celá řada letí k měsíci.");
          yield ohlas("potlesk");
        }
      }
      /* dovést ji na dráhu, po které chodí sama, a teprve tam pustit — jinak se nová řada zamotá */
      const [x, y] = draha(cas(h) + 1.3);
      yield mys(x, y + 4, 1.3);
      yield pryc();
      yield az(() => stoupa() === 0, 5);
      yield titulek("O dušičky nouze není. U pece pořád něco praská.");
      /* pět vteřin po posledním zvonění vyleze další sama — na tu se ještě počká */
      yield az(() => h.dyn.dalsi - cas(h) > 3, 4);
      yield cekej(1.6);
    },
  },
};
