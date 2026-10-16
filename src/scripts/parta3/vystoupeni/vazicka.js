/*
 * Vystoupení Vázičky na /parta — choreografie pro scény ze scripts/vazicka-gejsa.
 * Jak se zapisují, je v ../herec.js; hraje je režisér (../reziser.ts).
 *
 * Tyhle tři scény si nic nelosují přes Math.random (mají vlastní zasetou náhodu),
 * takže běží pokaždé stejně; hlídat je potřeba jen jejich vlastní hodiny:
 * květy se po 9,5 s vymění samy, kouř se v 1,4 s složí sám a tyčinka dohoří ve 32,5 s.
 */
import { cekej, mys, klik, pryc, az, titulek, ohlas } from "../herec.js";

/** Čas scény: v něm jsou značky uvnitř dyn (zmena, zapal, po, poryv). */
const cas = (h) => h.t + (h.V.zacatek || 0);

/* ——— Dvanáct květů (kami-kvety.js) ——— */
/* kruh roku: květ měsíce m svítí v mezeře tahu (uhelMesice, střed C, poloměr RK + 1,5) */
const kvetRoku = (m) => {
  const u = ((-210 + m * (240 / 11)) * Math.PI) / 180;
  return [90 + Math.cos(u) * 56.5, 81 + Math.sin(u) * 56.5];
};
/* její tvář na plátně (TVAR0); kdo na ní zůstane kurzorem, tomu se schová za vějíř */
const TVAR = [90, 118.6];
/* otočka i s pózou trvá KONEC = 3 s; klik dřív by se jen zařadil do fronty */
const KONEC = 3;
const dotocila = (h) => cas(h) - h.dyn.zmena > KONEC + 0.04;
/** Otočka do dalšího měsíce: ukáže tam, kde se v kruhu rozsvítí jeho květ, a klepne, jakmile dotočí tu předchozí. */
function* otocka(h) {
  const m = (h.dyn.m + 1) % 12;
  yield mys(...kvetRoku(m), 0.5);
  yield az(() => dotocila(h), 4);
  yield klik(...kvetRoku(m), 0);
  yield az(() => h.dyn.m === m, 1);
}

/* ——— Tyčinka (lem-tycinka.js) ——— */
/* lusknutí složí tvar, jen když je stužka dost dlouhá (A1 + N_T × DAVKA), žádný tvar nedrží a tyčince zbývají aspoň 2 s z HORI */
const STUZKY = 0.9 + 66 * 0.07, HORI = 40;
const muzeTvar = (h) => {
  const d = h.dyn;
  return d.hori && cas(h) - d.zapal < HORI - 2.4 && d.rezV == null && !d.pruhy.some((p) => p.typ === "tvar") && d.hlavni.length > 0 && d.hlavni[0].vek >= STUZKY + 0.05;
};
/** Lusknutí: počká, až je kouře dost, a klepne u ní (kurzor za x = 80 by ji odvedl doprava pod tvar). */
function* lusk(h) {
  const n = h.dyn.tvarI + 1;
  yield az(() => muzeTvar(h), 6);
  yield klik(76, 98, 0.3);
  yield az(() => h.dyn.tvarI >= n, 1);
}

/* ——— Hadí oko (lem-destnik.js) ——— */
/* střed deštníku (STRED0) a její tělo na plátně: naPlatno([90, 112]) */
const DESTNIK = [89, 66], TELO = [86, 101];
/* jedno roztočení ubere mraku ZA_KLIK; déšť sám vydrží PRSI vteřin */
const ZA_KLIK = 0.17, PRSI = 46;

export default {
  /* 01 Kami — dvanáct květů: pohled, vítr, otočky od května do listopadu a nakonec stud za vějířem */
  kvety: {
    delka: 39,
    *hraj(h) {
      yield titulek("Vázička, gejša. Je duben, a tak nosí sakuru.");
      yield cekej(2.6);
      /* otevře oči a dívá se, kam se ukáže: nejdřív na sakuru v kruhu */
      yield mys(...kvetRoku(3), 0);
      yield cekej(0.9);
      yield mys(140, 70, 0.7);
      /* mávnutí je vítr: šňůry kanzashi, rukávy a větvička */
      yield titulek("Kolem se mihne vítr. Šňůry ve vlasech cinknou.");
      yield cekej(0.5);
      for (const x of [38, 142, 38, 142]) yield mys(x, 86, 0.3);
      yield cekej(1.2);
      /* první otočka musí přijít dřív, než si ji v 9,5 s udělá scéna sama */
      yield titulek("Otočka na dřevácích — a je květen. Vistárie.");
      yield* otocka(h);
      yield cekej(1.3);
      yield ohlas("uzas");
      yield cekej(2.6);
      /* tři otočky hned po sobě: klepne se přesně ve chvíli, kdy skončí póza s vějířem */
      yield titulek("Léto: hortenzie, vějířky, svlačec.");
      for (let i = 0; i < 3; i++) {
        yield* otocka(h);
        yield cekej(1.6);
      }
      yield cekej(2.3);
      yield titulek("Podzim: zvonek, chryzantéma a nakonec javor.");
      for (let i = 0; i < 3; i++) {
        yield* otocka(h);
        yield cekej(1.6);
      }
      yield ohlas("potlesk");
      yield cekej(0.9);
      /* kurzor zůstane na tváři: schová se za vějíř a zachichotá se */
      yield mys(TVAR[0] + 2, TVAR[1] - 3, 0.5);
      yield az(() => h.dyn.stydi > 0.5, 2.5);
      yield titulek("Potlesk ji uvede do rozpaků. Schová se za vějíř.");
      yield ohlas("smich");
      yield cekej(2.7);
      yield titulek("Přes sto let v dílně, a pořád se stydí.");
      yield cekej(0.9);
      /* 12 s po posledním kliku by se květy vyměnily samy — do té doby musí být dohráno */
      yield pryc();
      yield cekej(2.6);
    },
  },

  /* 02a Tušový lem — tyčinka: pět tvarů z kouře (poslední je ona sama), pak tyčinka dohoří, úklona a nová */
  tycinka: {
    delka: 39,
    *hraj(h) {
      yield titulek("Čas gejši se měří na vonné tyčinky. Jedna právě hoří.");
      /* první tvar si scéna složí sama (dalsiTvar = 1,4 s) */
      yield az(() => h.dyn.tvarI >= 1, 3);
      yield cekej(1.7);
      yield titulek("Lusknutí vějířem přetne kouř. Složí se do kruhu.");
      yield cekej(1.6);
      /* tančí tam, kam se ukáže, a vějíř rozhání kouř */
      yield mys(84, 104, 0);
      yield mys(118, 108, 0.9);
      yield cekej(1.4);
      yield mys(76, 98, 0.8);
      yield titulek("Každé lusknutí jiný tvar. Květ sakury.");
      yield* lusk(h);
      yield cekej(0.7);
      yield ohlas("uzas");
      yield cekej(2.6);
      /* kurzor prohrábne sloupec kouře a ten se za ním stočí */
      yield mys(150, 126, 0.5);
      yield mys(118, 104, 0.5);
      yield mys(150, 84, 0.5);
      yield mys(76, 98, 0.9);
      yield cekej(0.3);
      yield titulek("Jeřáb v letu.");
      yield* lusk(h);
      yield cekej(3.3);
      /* na tvar je kouře ještě málo: klepnutí do něj jen foukne (kdyby ho už dost bylo, neklepat — složil by se motýl) */
      yield mys(128, 116, 0.6);
      if (!muzeTvar(h) && h.dyn.hlavni.length && h.dyn.hlavni[0].vek < STUZKY - 0.25) yield klik(131, 112, 0.1);
      yield cekej(0.5);
      yield mys(76, 98, 0.8);
      yield cekej(0.6);
      yield titulek("Motýl.");
      yield* lusk(h);
      yield cekej(3.3);
      yield pryc();
      yield cekej(0.7);
      yield ohlas("volani");
      yield cekej(1.8);
      yield titulek("A nakonec váza. Tedy ona sama.");
      yield* lusk(h);
      yield cekej(1.3);
      yield ohlas("potlesk");
      yield pryc();
      /* tyčinka dohoří sama (HORI): zazvoní, Vázička se jí ukloní a v popelu se rozsvítí nová */
      yield az(() => !h.dyn.hori, 8);
      yield titulek("Tyčinka dohořela. Vázička se jí ukloní.");
      yield az(() => h.dyn.hori, 4);
      yield titulek("V popelu se rozsvítí nová. Tančí se dál.");
      yield cekej(3.4);
    },
  },

  /* 02b Tušový lem — hadí oko: vítr, ohlédnutí, roztočený deštník a nakonec měsíc, který za ním celou dobu stál */
  destnik: {
    delka: 33,
    *hraj(h) {
      yield titulek("Noční déšť. Vázička stojí na můstku, zády k nám.");
      yield cekej(2.6);
      /* myš je vítr: déšť se nakloní a ona proti němu nastaví deštník */
      yield titulek("Vítr se otočí. Nastaví mu deštník, mašle vlaje.");
      yield mys(90, 44, 0);
      yield mys(26, 52, 1);
      yield cekej(1.8);
      /* prudké mávnutí na druhou stranu je poryv (rychlost přes 300): deštník se zatřese */
      yield mys(154, 56, 0.08);
      yield az(() => cas(h) - h.dyn.poryv < 1, 0.6);
      yield cekej(2);
      /* kdo na ni ukáže, na toho se ohlédne */
      yield ohlas("volani");
      yield mys(TELO[0] + 8, TELO[1] - 4, 0.8);
      yield titulek("Někdo na ni zavolá. Ohlédne se zpod deštníku.");
      yield az(() => h.dyn.kouk > 0.9, 3);
      yield cekej(1.3);
      yield mys(TELO[0] - 6, TELO[1] + 4, 0.7);
      yield cekej(1);
      yield mys(...DESTNIK, 0.6);
      yield az(() => h.dyn.kouk < 0.1, 3);
      /* roztočení: prstenec kapek a o kus míň deště. Točí se, dokud po kliku zbude deště aspoň na další */
      yield titulek("Roztočí deštník. Každým roztočením odežene kus deště.");
      while (h.dyn.po == null && h.dyn.mrak > ZA_KLIK + 0.08) {
        yield klik(...DESTNIK, 0);
        yield cekej(2.2);
      }
      /* poslední klik: mraku zbývá míň než ZA_KLIK, takže déšť skončí hned s ním */
      yield az(() => h.dyn.po != null || h.dyn.mrak <= ZA_KLIK - 0.005, (ZA_KLIK * PRSI) / 2);
      yield titulek("Ještě jednou — a je po dešti.");
      if (h.dyn.po == null) yield klik(...DESTNIK, 0);
      yield cekej(0.5);
      yield pryc();
      /* dohra scény (PO): sklapne, měsíc, ohlédnutí, rosnička, zatáhne se a deštník se rozevře; kliknutí by ohlédnutí zkrátilo */
      const po = () => (h.dyn.po == null ? -1 : cas(h) - h.dyn.po);
      yield az(() => po() > 2.3, 4);
      yield titulek("Proto ten kruh svítil. Celou dobu za ním stál měsíc.");
      yield ohlas("uzas");
      yield az(() => po() > 4.9, 4);
      yield ohlas("smich");
      yield az(() => po() > 5.4, 2);
      yield titulek("Ohlédne se přes rameno. Zakváká rosnička.");
      yield az(() => po() > 8.4, 5);
      yield titulek("Zatáhne se. Deštník se rozevře znovu.");
      yield az(() => h.dyn.po == null, 3);
      yield cekej(2.8);
    },
  },
};
