/*
 * Vystoupení Hlínky na /parta — choreografie pro scény ze scripts/hlinka-zeme.
 * Jak se zapisují, je v ../herec.js; hraje je režisér (../reziser.ts).
 */
import { cekej, mys, klik, pryc, az, titulek, ohlas } from "../herec.js";

/*
 * Místa z kami-sakura.js: střed hroudy (STRED = naPanel([90, 98])), dutina se sýčkem (DUTINA)
 * a místo v koruně, odkud se snáší lístek na nos (stav → cilovy). Lístky ze země zvedá mávnutí
 * pod ZEM − 13; v téhle výšce je už dál než R_TELA + 3 od středu, takže Hlínku nelechtá.
 */
const TELO = [84, 128.4];
const DUTINA = [139.6, 150.4];
const LISTEK = [100, 66];
const U_ZEME = 163;
/* odkud fouká vichr: klepnutí vlevo od středu žene lístky doprava a naopak */
const ZLEVA = [22, 96], ZPRAVA = [158, 90];

/* lem-ruce.js: osa kruhu (CX) a výška, ve které kurzor přivolá ruku k pohlazení (do 38 od [CX, DNO − 21]) */
const CX = 90;
const HLAZENI = 108;

export default {
  /* 01 Kami — pod sakurou: vítr, lístek na nos a vánice, lechtání, sýček, a nakonec vánice i s vichrem */
  sakura: {
    delka: 35,
    *hraj(h) {
      const faze = (f) => () => h.dyn.k.faze === f;
      const kycha = () => h.dyn.k.faze !== "nic";
      yield titulek("Hlínka, kami země. Spí pod tisíciletou sakurou.");
      yield cekej(2.8);

      /* vítr: mávnutí korunou tam, zpátky a tam; do toho si (ve 4,2 s) zazpívá sedmihlásek */
      yield titulek("Korunou se prožene vítr. Pruty se za ním zhoupnou.");
      yield mys(14, 64, 0);
      yield mys(168, 58, 0.6);
      yield cekej(0.5);
      yield mys(14, 84, 0.6);
      yield cekej(0.5);
      yield mys(168, 70, 0.6);
      yield pryc();
      yield cekej(1);

      /* první kýchnutí: klepnutí utrhne lístek (v 9. vteřině by si ho scéna utrhla sama) */
      yield titulek("Jeden lístek jí přistane rovnou na nose.");
      if (!kycha()) yield klik(...LISTEK, 0);
      yield pryc();
      yield az(faze("kych"), 4);
      yield ohlas("uzas");
      yield titulek("Hepčí. Ze stromu se sype vánice.");
      yield az(faze("nic"), 4);
      yield cekej(1.2);

      /* lechtání: rychlá myš přímo na ní, dokud spí */
      yield titulek("Spí dál. Jen je lechtivá.");
      yield mys(TELO[0] - 14, TELO[1] - 6, 0);
      for (let i = 0; i < 17; i++) {
        if (i === 8) yield ohlas("smich");
        yield mys(TELO[0] + (i % 2 ? -14 : 14), TELO[1] + (i % 2 ? -6 : 6), 0.13);
      }
      yield cekej(1.4);

      /* sýček: kouká za kurzorem a na klepnutí do dutiny vykoukne a zahouká */
      yield titulek("V dutině u kořenů někdo bydlí.");
      yield mys(DUTINA[0] - 16, DUTINA[1] - 14, 0.8);
      yield cekej(0.5);
      yield klik(...DUTINA, 0.5);
      yield cekej(2.5);

      /* mávnutí těsně nad zemí zvedne, co napadalo */
      yield titulek("Co napadalo na zem, jde zase rozvířit.");
      yield mys(150, U_ZEME, 0.3);
      yield mys(16, U_ZEME, 0.7);
      yield mys(164, U_ZEME, 0.7);
      yield mys(30, U_ZEME, 0.7);
      yield pryc();
      yield cekej(1.6);

      /*
       * Finále: druhý lístek, a do kýchnutí vichr zleva a zprava. Klepnutí během kýchání jen
       * fouká; jakmile dokýchá, spustilo by další, proto se každé hlídá. Přejezd mezi stranami
       * je sám mávnutí po směru vichru.
       */
      yield az(faze("nic"), 3);
      yield ohlas("volani");
      yield titulek("");
      if (!kycha()) yield klik(...LISTEK, 0);
      yield pryc();
      yield az(faze("kych"), 4);
      yield titulek("Hanafubuki. Vánice květů, tentokrát i s vichrem.");
      yield ohlas("potlesk");
      if (kycha()) yield klik(...ZLEVA, 0);
      yield cekej(0.16);
      if (kycha()) yield klik(...ZLEVA, 0);
      yield mys(...ZPRAVA, 0.5);
      if (kycha()) yield klik(...ZPRAVA, 0);
      yield cekej(0.16);
      if (kycha()) yield klik(...ZPRAVA, 0);
      yield mys(...ZLEVA, 0.5);
      yield pryc();
      yield cekej(6.5);
    },
  },

  /* 02 Tušový lem — mokré ruce: konvička, pohlazení, placka, zásobnice a váza, která rozkvete */
  ruce: {
    delka: 41,
    *hraj(h) {
      const faze = (f) => () => h.dyn.faze === f;
      const spi = () => h.dyn.faze === "klid";
      /* první tvar si ruce vezmou samy (v 1,1 s): konvička */
      yield titulek("Hlínka spí na hrnčířském kruhu. Z noci se snesou dvě ruce.");
      yield az(faze("tah"), 5);
      yield titulek("Vytáčejí ji do tvarů. Ona to celé prospí.");
      yield az(faze("hotovo"), 6);
      yield titulek("Konvička. Obrys na polici, zívnutí a za odměnu pohlazení.");
      yield az(spi, 5);

      /* pohlazení: kurzor u spící hroudy přivolá jednu ruku a ta jde za ním */
      yield mys(CX - 12, HLAZENI, 0);
      for (const x of [-4, -12, -4, -12]) yield mys(CX + x, HLAZENI, 0.42);

      /* druhý tvar popoženeme: klepnutí při točení přidá otáčky, až to hlína nevydrží */
      if (spi()) yield klik(CX - 12, HLAZENI, 0);
      yield az(faze("stred"), 3);
      yield titulek("Kruh jde popohnat. Hlína to ráda nemá.");
      yield az(faze("tah"), 3);
      yield cekej(0.45);
      for (let i = 0; i < 6 && h.dyn.faze === "tah"; i++) {
        yield klik(CX - 12, HLAZENI, 0);
        if (h.dyn.faze === "tah") yield cekej(0.2);
      }
      yield pryc();
      if (h.dyn.faze === "pad" || h.dyn.faze === "placka") {
        yield ohlas("smich");
        yield titulek("Placka. Tak znovu a pomalu.");
      }
      yield az(spi, 6);
      yield cekej(0.6);

      /* zásobnice, tentokrát v klidu; s ní je police plná (kdyby placka nevyšla, už na ní stojí) */
      if (h.dyn.hotove.length < 4) {
        if (spi()) yield klik(CX, 100, 0);
        yield pryc();
        yield az(faze("hotovo"), 6);
        yield titulek("Zásobnice. Police je skoro plná, zbývá váza.");
        yield az(spi, 5);
        yield cekej(0.6);
      }

      /* váza: vydrží, výhonek rozkvete, lístek spadne na nos a kýchnutí všechno smaže */
      yield ohlas("volani");
      if (spi()) yield klik(CX, 100, 0);
      yield pryc();
      yield az(faze("drzi"), 9);
      yield ohlas("uzas");
      yield titulek("Váza vydrží. Výhonek rozkvete a noc se rozsvítí.");
      yield az(faze("kych"), 8);
      yield ohlas("smich");
      yield titulek("Hepčí. Vzpomínky zhasnou a noc začíná znovu.");
      yield cekej(3.6);
    },
  },
};
