/*
 * Vystoupení Pecinky na /parta — choreografie pro scény ze scripts/pecinka-ohen.
 * Jak se zapisují, je v ../herec.js; hraje je režisér (../reziser.ts).
 */
import { cekej, mys, klik, pryc, az, titulek, ohlas } from "../herec.js";

/* v1: vítr i pohled se v kroku měří od bodu [90, 100]; obličej je o kousek výš (naPanel([90, 79])) */
const TVAR = [90, 96];
/* obdélník kolem svatozáře (střed C = [90, 99], poloměr R0 = 47 a plameny nad ní), po směru hodin */
const OBVOD = [[160, 170], [20, 170], [20, 26], [160, 26]];

/*
  Fouknutí do rytmu: `pauza` je doba od minulého kliknutí. Odečítá se z ní stisk
  (herec drží tlačítko 0,09 s) a jízda ukazatele, když se fouká z jiného místa.
*/
const STISK = 0.09;
function* fouk(h, x, pauza) {
  const stoji = h.mys && Math.abs(h.mys.x - x) < 0.5;
  const jizda = stoji ? 0 : Math.min(0.17, Math.max(0, pauza - STISK));
  yield cekej(Math.max(0, pauza - STISK - jizda));
  yield klik(x, TVAR[1], jizda);
}

/* v2: FIG = { x: 62, y: 160, s: 0.7 }, naPanel([x, y]) = [62 + (x - 90) * 0.7, 160 + (y - 159) * 0.7] */
const DVIRKA = [62, 126]; // naPanel([90, 110.5])
const MESIC = [146, 34]; // srpek ve vrstvě tuše
const NOVA = [108, 168]; // první místo v řadě: SLOTY[0], dno misek je na y 175

export default {
  /* 01 Kami — plamenná svatozář: pohled a vítr, rozdmýchání, kroužky z komína a nakonec foukání čím dál rychleji */
  v1: {
    delka: 38,
    *hraj(h) {
      yield titulek("Pecinka. Za zády jí hoří svatozář z plamenů.");
      yield cekej(2.6);

      /* pohled a vítr: plameny uhýbají od ukazatele, oči jdou za ním */
      yield titulek("Kam se podívá, odtamtud plameny uhnou.");
      yield mys(30, 95, 0);
      yield cekej(2.2);
      yield mys(150, 95, 1.4);
      yield cekej(1.8);

      /*
        Rozdmýchání: oheň roste s rychlostí ukazatele (naplno od 320 jednotek za vteřinu,
        nad I 1,15 Pecinka špulí pusu úžasem). Čtyřikrát dokola; dlouhé rovné strany drží
        rychlost i při dvaceti snímcích za vteřinu, kolečko z krátkých úseků ji ztrácelo.
      */
      yield titulek("Zvíří se vzduch a oheň povyroste.");
      yield mys(160, 26, 0.25);
      for (let kolo = 0; kolo < 4; kolo++) for (const b of OBVOD) yield mys(...b, 0.2);
      yield mys(...TVAR, 0.3);
      yield cekej(1.5);

      /* fouknutí: kroužek kouře z komína, sprška jisker, smích */
      yield titulek("Foukne. Komínem vyletí kroužek kouře.");
      yield klik(...TVAR, 0);
      yield cekej(0.7);
      yield ohlas("smich");
      yield cekej(1.9);
      /* totéž po větru: kroužek i jiskry to odnese na stranu */
      yield titulek("Další kroužky si bere vítr.");
      yield mys(32, 100, 0.5);
      yield cekej(0.9);
      yield klik(32, 100, 0);
      yield cekej(1.9);
      yield mys(148, 100, 0.6);
      yield cekej(0.8);
      yield klik(148, 100, 0);
      yield cekej(2);

      /* vrchol: foukání čím dál rychleji — oheň na doraz (I má strop 1,9) a sloup kroužků */
      yield ohlas("volani");
      yield titulek("A teď zhluboka. A čím dál rychleji.");
      yield mys(...TVAR, 0.5);
      yield cekej(0.7);
      for (const pauza of [STISK, 0.8, 0.7, 0.6, 0.5, 0.42, 0.35, 0.3]) yield* fouk(h, TVAR[0], pauza);
      /* v plném tempu se přidá vítr: plameny i sloup kroužků se prohnou na jednu a na druhou stranu */
      yield titulek("Komín sotva stíhá.");
      for (const x of [62, 36, 62, 90, 118, 144, 118, 90, 90, 90, 90]) yield* fouk(h, x, 0.27);
      yield az(() => h.dyn.I > 1.5 && h.dyn.krouzky.length >= 5, 1);
      yield ohlas("potlesk");
      yield cekej(1.3);
      yield pryc();
      yield cekej(2);
      yield titulek("Oheň se utiší. Úsměv jí zůstane.");
      yield cekej(3.2);
    },
  },

  /* 02 Tušový lem — raku v noci: tři výpaly za sebou, každá miska vyjde z kádě jiná */
  v2: {
    delka: 33,
    *hraj(h) {
      /*
        Výpal trvá 8 s a kliknutí během něj scéna zahodí, takže se tu hlavně čeká.
        dyn.uPred je fáze běžícího výpalu ve vteřinách (−1 = nepálí se):
        1,25 sevře misku, 3,3 ji ponoří, 5,3 ji vytáhne z vody, 6,2 se řada posune, 7,05 misku postaví.
        Misky jdou vždy ve stejném pořadí: bílá (shiro), černá (kuro), lustr (soumrak), červená (aka).
      */
      const faze = (kdy) => az(() => h.dyn.uPred >= kdy || !h.dyn.vypal, 9);
      const zacalo = () => az(() => h.dyn.vypal, 3);
      const dopaleno = () => az(() => !h.dyn.vypal, 9);

      yield titulek("Pecinka pálí raku. Noc, dvůr a káď s vodou.");
      /* první výpal si scéna spustí sama po 1,2 s */
      yield zacalo();
      yield faze(1.2);
      yield titulek("Kleštěmi vytáhne žhavou misku a šup s ní do vody.");
      yield faze(3.3);
      yield ohlas("uzas");
      yield faze(5.4);
      yield titulek("Z páry vyjde bílá, s černými prasklinami.");
      /* jakmile misku postaví, kouká zase za ukazatelem: ať se podívá na hotovou */
      yield faze(7.15);
      yield mys(...NOVA, 0);
      yield dopaleno();
      yield cekej(1.2);

      /* druhá: černá */
      yield klik(...DVIRKA, 0.3);
      yield zacalo();
      yield faze(0.6);
      yield titulek("Každá vyjde z kádě jiná. Ani Pecinka neví jaká.");
      yield faze(5.4);
      yield titulek("Tentokrát černá jako noc kolem.");
      yield ohlas("potlesk");
      yield faze(7.15);
      yield mys(...NOVA, 0.3);
      yield dopaleno();
      /* chvilka oddechu: pohled na měsíc */
      yield cekej(0.5);
      yield mys(...MESIC, 0.6);
      yield cekej(1.1);

      /* třetí: lustr v barvách soumraku; řada je plná, takže nejstarší miska odejde */
      yield ohlas("volani");
      yield klik(...DVIRKA, 0.4);
      yield zacalo();
      yield faze(1.2);
      yield titulek("Do třetice. V řadě už na ni není místo.");
      yield faze(5.4);
      yield titulek("Třetí se leskne v barvách soumraku.");
      yield ohlas("uzas");
      yield faze(7.15);
      yield mys(...NOVA, 0.3);
      yield dopaleno();
      yield titulek("Čtyři misky, čtyři glazury. A pec hřeje dál.");
      yield cekej(0.8);
      yield pryc();
      yield cekej(3.2);
    },
  },
};
