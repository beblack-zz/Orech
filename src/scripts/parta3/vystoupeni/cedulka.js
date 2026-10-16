/*
 * Vystoupení Cedulky na /parta — choreografie pro scény ze scripts/cedulka-ema.
 * Jak se zapisují, je v ../herec.js; hraje je režisér (../reziser.ts).
 */
import { cekej, mys, klik, pryc, az, titulek, ohlas } from "../herec.js";

/*
 * v1 (kresby.js, V1): myš je vítr. Fouká tím víc, čím dál je ukazatel od svislé osy (x = 90),
 * nad 0,75 Cedulka zavře oči. Destičky roztočí až rychlost nad 220 j/s — pomalý přejezd je jen nakloní.
 */
const VPRAVO = [164, 96], VLEVO = [16, 96];
/* bezvětří: na ose, ve výšce tváře (TVAR_STRED = 90, 72.7), ať se Cedulka dívá rovně */
const KLID = [90, 76];
/** +1 lícem k nám, −1 rubem */
const lic = (h) => Math.cos(h.dyn.otoc.a);
/**
 * Poryv zprava: ukazatel skáče po pravé straně nahoru a dolů, 140 j každou desetinu vteřiny
 * (x = 135 dá vítr kolem 0,6 — destičky se nakloní, ale oči Cedulce zůstanou otevřené).
 * Skoky, ne plynulé tahy — vyhlazená rychlost pak vyjde podobně při 60 i při 20 snímcích za vteřinu
 * (plynulý tah při pomalých snímcích destičky skoro neroztočil).
 */
function* poryv(skoku) {
  for (let i = 0; i < skoku; i++) {
    yield mys(135, i % 2 ? 160 : 20, 0);
    yield cekej(0.1);
  }
}

/*
 * v2 (kresby.js, V2): hotové kusy na horní polici (NAHORE; police y = 40, trefa y 22–42),
 * dolní police (y = 72, trefa y 60–74; misky se po ní posouvají, proto se míří přes dyn.rada),
 * točna a časy jednoho kusu ve vteřinách od chvíle, kdy miska přijde (FAZE). Kusy jdou
 * po řadě: 0 Mája, 1 Kuba, 2 Ondra (křivá).
 */
const NAHORE = [20, 40, 60, 80, 99];
const NAHORE_Y = 32, DOLE_Y = 66;
const TOCNA = [113, 143];
const FAZE = { toci: 0.9, rydlo: 3.5, pise: 3.9, fouka: 6.9, pamatuje: 7.5, nese: 8.7, polozi: 10.1, konec: 10.6 };

export default {
  /* 01 Kami — vítr, poryv se jmény na rubech, a pak rub Cedulky: kůň. Podruhé s celou partou v otáčkách. */
  v1: {
    delka: 35,
    *hraj(h) {
      yield titulek("Cedulka je ema: destička, na kterou se píše přání.");
      yield cekej(2.8);

      /* vítr zprava a zleva — pomalu, ať se nic neroztočí */
      yield titulek("Když fouká, parta se odkloní a Cedulka zavře oči.");
      yield mys(...VPRAVO, 0);
      yield cekej(2.2);
      yield mys(...VLEVO, 1.8);
      yield cekej(1.5);
      yield mys(...KLID, 1.1);
      yield cekej(0.8);

      /* poryv; destičky se pak pár vteřin rozmotávají a jména jsou čitelná */
      yield titulek("Poryv destičky roztočí. Na rubu má každá jméno.");
      yield* poryv(16);
      yield mys(...KLID, 0.5);
      yield cekej(3.0);

      /* rub Cedulky */
      yield titulek("A co má na rubu Cedulka?");
      yield ohlas("volani");
      yield cekej(1.8);
      yield klik(...KLID);
      yield az(() => lic(h) < -0.8, 2);
      yield ohlas("uzas");
      yield titulek("Koně. Ema znamená doslova „obrázek koně“.");
      yield cekej(3.8);
      yield klik(...KLID);
      yield az(() => lic(h) > 0.8, 2);
      yield ohlas("smich");
      yield titulek("Otočí se zpátky a směje se. Ví, že ho viděli všichni.");
      yield cekej(2.8);

      /* přídavek: kůň a do toho poryv; zpátky se po 6,5 s otočí sama */
      yield titulek("Ještě jednou, pro ty vzadu.");
      yield cekej(1.3);
      yield klik(...KLID);
      yield az(() => lic(h) < -0.8, 2);
      yield cekej(1.0);
      yield* poryv(10);
      yield pryc();
      yield ohlas("potlesk");
      yield titulek("Místo živého koně dostává svatyně obrázek. Je skladnější.");
      yield az(() => h.dyn.cil < 0.5 && lic(h) > 0.8, 8);
      yield cekej(2.6);
    },
  },

  /* 02 Tušový lem — tři misky: první celým postupem, při druhé zkouška z hotových, třetí je křivá; nakonec všech deset jmen */
  v2: {
    delka: 41,
    *hraj(h) {
      const cas = () => h.t + (h.V.zacatek || 0);
      /** miska k je na řadě a je aspoň u vteřin stará */
      const ve = (k, u) => () => !!h.dyn.prace && h.dyn.prace.k === k && cas() - h.dyn.prace.start >= u;
      /** miska k už stojí na polici a točna je volná */
      const hotova = (k) => () => !h.dyn.prace && h.dyn.dalsi > k;

      /* první miska přijde sama (po 0,8 s) */
      yield titulek("Noc v dílně. Cedulka podepisuje misky.");
      yield az(ve(0, 1.9), 5);
      yield titulek("Seřízne nožku a rydlem vyryje do dna jméno.");
      yield az(ve(0, 6.2), 6);
      yield titulek("Sfoukne drobky. Jméno si pamatuje, miska jde na polici.");
      yield az(ve(0, FAZE.pamatuje + 0.3), 3);
      yield ohlas("uzas");
      yield az(hotova(0), 5);

      /* druhá: klepnutí na točnu ji přinese hned; při práci ťuká na hotové kusy a Cedulka říká čí jsou */
      yield cekej(0.5);
      yield klik(...TOCNA, 0);
      yield pryc();
      yield az(ve(1, FAZE.toci + 0.2), 3);
      yield titulek("Hotové kusy stojí nahoře. O každém ví, čí je.");
      yield cekej(0.5);
      for (const x of NAHORE) {
        yield klik(x, NAHORE_Y, 0);
        yield cekej(0.62);
      }
      /* pryč včas, ať si na břiše stihne rozsvítit jméno z točny (FAZE.pamatuje) */
      yield pryc();
      yield ohlas("potlesk");
      yield titulek("Tužka by v peci shořela. Rytina vydrží.");
      yield az(hotova(1), 8);

      /* třetí je křivá */
      yield cekej(0.5);
      yield klik(...TOCNA, 0);
      yield pryc();
      yield az(ve(2, 0.15), 2);
      yield titulek("Tahle je křivá. Cedulka se směje pokaždé.");
      yield az(ve(2, 0.62), 2);
      yield ohlas("smich");
      yield az(ve(2, FAZE.pise), 5);
      yield titulek("Jméno dostane stejně pečlivé jako ostatní.");
      yield az(hotova(2), 8);

      /* finále: všech deset kusů v jednom tahu — horní police zleva, dolní zprava — a konec u křivé.
         Další miska přijde sama 2,4 s po té minulé, tedy do posledních jmen; dohra je už její. */
      yield titulek("Deset kusů, deset jmen. Další je na cestě.");
      yield cekej(0.3);
      for (const x of NAHORE) {
        yield mys(x, NAHORE_Y, 0);
        yield cekej(0.24);
      }
      const dole = [...h.dyn.rada].sort((a, b) => b.x - a.x);
      for (const m of dole) {
        yield mys(m.x, DOLE_Y, 0);
        yield cekej(0.24);
      }
      yield cekej(0.4);
      yield klik(dole[dole.length - 1].x, DOLE_Y, 0);
      yield cekej(1.2);
      yield pryc();
      yield cekej(3.0);
    },
  },
};
