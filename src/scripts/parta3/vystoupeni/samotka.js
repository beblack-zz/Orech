/*
 * Vystoupení Šamotky na /parta-3 — choreografie pro scény ze scripts/samotka-nese.
 * Jak se zapisují, je v ../herec.js; hraje je režisér (../reziser.ts).
 *
 * Scény startují předtočené (V.zacatek), časové značky v dyn jsou proto
 * v čase scény: h.t + h.V.zacatek.
 */
import { cekej, mys, klik, drz, pust, pryc, az, titulek, ohlas } from "../herec.js";

/* rozvrh výpalu z vypal.js (vteřiny cyklu dyn.u): zapálení, vypnutí hořáků, otevření, váza ven, poplácání */
const ZAPAL = 5.5, VYPNUTI = 16.1, OTEVRENI = 22.7, T_VAZA = OTEVRENI + 3.8, PLACANI = OTEVRENI + 5.9;

/* patra borovice ze snih.js (střed), od největšího — kliknutí do patra z něj shodí sníh */
const PATRA = [[3, 138, 84], [1, 134, 60], [2, 152, 70], [4, 158, 92], [0, 143, 44]];

export default {
  /* 01 Kamidana — průvan, tlesknutí, provaz se zvoncem a nakonec celý obřad: zazvonit, dvakrát tlesknout, kami se probudí */
  v1: {
    delka: 30,
    *hraj(h) {
      const cas = () => h.t + h.V.zacatek;
      /* článek provazu (1 = zvonec, 11 = střapec); provaz se houpe, tak se míří podle stavu */
      const clanek = (i) => [h.dyn.provaz[i].x, h.dyn.provaz[i].y];

      yield titulek("Šamotka celý život něco nese. Teď nese svatyni pro kami.");
      yield cekej(3);

      /* myš je průvan: přejezd nad poličkou ohne plamínky, papírky i větvičky */
      yield titulek("Kdo jde kolem, udělá průvan. Plamínky i papírky uhnou.");
      yield mys(14, 66, 0);
      yield mys(166, 66, 0.55);
      yield cekej(1.1);
      yield mys(14, 72, 0.55);
      yield cekej(0.7);
      yield pryc();
      yield cekej(1);

      /* jedno tlesknutí (kliknutí mimo provaz): podívá se jedním okem, odkud to bylo. Dvě do 1,3 s by už budila kami. */
      yield titulek("Jedno tlesknutí. Šamotka mrkne, kdo to je.");
      yield cekej(0.5);
      yield klik(128, 146, 0);
      yield cekej(0.2);
      yield pryc();
      yield cekej(1.6);
      yield klik(52, 146, 0);
      yield cekej(0.2);
      yield pryc();
      yield cekej(0.3);
      yield ohlas("smich");
      yield cekej(1.9);

      /* rychlý přejezd přes provaz do něj strčí (zvonec vyletí o 10–40°); pomalý by ho odnesl s sebou */
      yield titulek("Do provazu stačí strčit a zvonec zacinká.");
      yield cekej(0.4);
      yield mys(55, 150, 0);
      yield mys(125, 150, 0.3);
      yield pryc();
      yield cekej(2.8);

      /* chytit provaz dole a zatahat: zvonec zazvoní v každé úvrati. Dvakrát po třech. */
      yield titulek("Pořádně se ale zvoní takhle. Ať kami ví, že někdo přišel.");
      yield drz(...clanek(9), 0);
      for (let i = 0; i < 2; i++) {
        yield mys(78, 153, 0.18);
        yield mys(102, 153, 0.3);
        yield mys(78, 153, 0.3);
        yield mys(102, 153, 0.3);
        yield mys(90, 156, 0.18);
        yield cekej(0.55);
      }
      yield pust();
      yield pryc();
      yield cekej(0.6);
      yield ohlas("volani");
      yield cekej(0.9);

      /* dvě tlesknutí po sobě: kami se probudí, a protože se před tím zvonilo, i se zlatým prachem */
      yield titulek("Pak se dvakrát tleskne.");
      yield cekej(1);
      yield klik(128, 146, 0);
      yield cekej(0.35);
      yield klik(128, 146, 0);
      yield az(() => cas() - h.dyn.probuzeni < 2, 1);
      yield pryc();
      yield cekej(1.1);
      yield ohlas("uzas");
      yield titulek("Dvířka se otevřou. Kami je vzhůru.");
      yield cekej(3.2);
      yield titulek("Bydlí v žároměrce. Ohnuté přesně, jak má být.");
      /* dvířka se zavírají 6,4–8 s po probuzení */
      yield az(() => cas() - h.dyn.probuzeni > 8, 6);
    },
  },

  /* 02 Výpal — začíná v plném žáru: chladnutí, vysázení, poplácání a hned nový výpal s plynem a redukcí */
  v2: {
    delka: 33,
    *hraj(h) {
      const u = () => h.dyn.u;

      /* první vteřiny dobíhá výpal, který hořel už při načtení: v 0,7 s steče glazura z vázy */
      yield titulek("Šamotka v peci nese výpal. Na záda jí zrovna teče glazura.");
      yield az(() => u() > VYPNUTI + 0.3, 5);
      yield titulek("Hořáky zhasnou. Pec chladne, glazura praská, Šamotka spí.");
      yield az(() => u() > OTEVRENI + 0.1, 9);
      yield titulek("Hrnky jdou ven. Váza se přilepila, tu musí odtrhnout.");
      yield az(() => u() > T_VAZA + 1.15, 7);
      yield ohlas("smich");
      yield az(() => u() > PLACANI + 0.1, 3);
      yield titulek("A pak ji někdo poplácá. Jediná chvíle, kdy otevře oči.");
      yield az(() => u() > PLACANI + 0.85, 3);
      yield ohlas("potlesk");

      /* nový výpal začne sám; při sázení kliknutí znamená „kdo to byl“ — podívá se po váze */
      const vypal = h.dyn.cislo;
      yield az(() => h.dyn.cislo > vypal, 5);
      yield titulek("A hned znovu. Šamotka mrkne, co jí to zase nakládají.");
      yield az(() => u() > 2.75, 5);
      yield klik(62, 98, 0);
      yield cekej(0.2);
      yield pryc();

      /* když se topí, kliknutí přidá plyn: 1,2 s běží výpal 2,6× rychleji. Jednou — redukci chci v klidu. */
      yield az(() => u() > ZAPAL, 5);
      yield titulek("Hořáky naskočí a ještě se přidá plyn.");
      yield cekej(0.6);
      yield klik(8, 153, 0);
      yield cekej(0.2);
      yield pryc();
      yield az(() => u() > ZAPAL + 4.5, 5);
      yield titulek("Přiškrtí se tah. Černý kouř, plameny šlehají ven.");
      yield az(() => u() > ZAPAL + 5.2, 3);
      yield ohlas("uzas");
      yield az(() => u() > ZAPAL + 7.4, 4);
      yield titulek("Tisíc tři sta. Tohle má nejradši, i s kapkou na zádech.");
      /* končí v plném žáru, těsně před vypnutím hořáků */
      yield az(() => u() > VYPNUTI - 0.3, 5);
    },
  },

  /* 03 Sníh — vítr, sníh z borovice, kočka vyžene vrabce, ti se vrátí i na ni, zvon z pagody a nakonec teplo */
  v3: {
    delka: 32,
    *hraj(h) {
      /* kočka přijde sama v 7,5 s a zvon z pagody je daný už od začátku (čas scény) — kolem nich se to staví */
      const zvon = h.dyn.dalsiZvon;

      yield titulek("Zimní noc. Šamotka je čerstvě z pece a sníh nad ní taje.");
      yield cekej(2.4);
      /* myš je vítr: unese sníh, kouř z komína i plamínek v lucerně */
      yield mys(20, 46, 0);
      yield mys(160, 46, 0.7);
      yield cekej(1);
      yield mys(20, 56, 0.7);
      yield cekej(0.4);

      yield titulek("Z borovice se sesype sníh. Vrabci se leknou.");
      const patro = PATRA.find(([i]) => h.dyn.patra[i].snih > 0.3) || PATRA[0];
      yield klik(patro[1], patro[2], 0.4);
      yield cekej(0.2);
      yield pryc();

      yield az(() => h.dyn.kocka, 4);
      yield ohlas("volani");
      yield titulek("Přichází kočka.");
      yield az(() => h.dyn.kocka.vyplasila, 6);
      yield ohlas("uzas");
      yield titulek("Vrabci jsou pryč. Teplé místo je teď její.");
      yield az(() => h.dyn.kocka.stav === "slape", 5);
      yield titulek("Dvakrát se otočí, chvíli šlape a stočí se do klubíčka.");
      yield az(() => h.dyn.kocka.stav !== "slape", 6);
      yield cekej(0.4);

      /*
        Kliknutí do nebe přivolá vrabce; když kočka leží, dvě místa ze čtyř jsou na ní. Páté kliknutí
        by shodilo sníh. Volají se, už když si lehá — letí přes dvě vteřiny a do zvonu mají stihnout usnout.
      */
      const privolej = function* (x, y) {
        if (h.dyn.vrabci.length >= 4) return;
        yield klik(x, y, 0.2);
        yield cekej(0.35);
      };
      yield* privolej(40, 40);
      yield* privolej(60, 58);
      yield titulek("Vrabci se vracejí. Dva si sednou rovnou na kočku.");
      yield* privolej(30, 66);
      yield* privolej(52, 34);
      yield pryc();
      yield az(() => h.dyn.vrabci.length >= 4 && h.dyn.vrabci.every((v) => v.stav === "sedi"), 5);
      yield ohlas("smich");

      yield az(() => h.dyn.dalsiZvon > zvon, 8);
      yield titulek("Z pagody se ozve zvon. Vrabci se ohlédnou, kočce cukne ucho.");
      yield cekej(2.6);

      /* kliknutí na Šamotku: zahřeje, zapáří se z ní a kočka se rozpřede */
      yield klik(100, 136, 0);
      yield titulek("Šamotka nic neříká. Jen hřeje o trochu víc.");
      yield cekej(0.2);
      yield pryc();
      yield cekej(3.6);
    },
  },
};
