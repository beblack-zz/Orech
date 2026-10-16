/*
 * Vystoupení Střípka na /parta — choreografie pro scény ze scripts/stripek-zlato.
 * Jak se zapisují, je v ../herec.js; hraje je režisér (../reziser.ts).
 *
 * Obě scény startují v čase 0 (nemají `zacatek`), takže časové značky v dyn
 * (sek, rano, dalsi) jsou rovnou h.t. Co si scéna losuje — který kus se vymění,
 * kde a jak dlouhá trhlina praskne — má z vlastní zaseté náhody a rozchází se
 * to podle počtu snímků; proto se tu míří a čeká podle h.dyn.
 */
import { cekej, mys, klik, pryc, az, titulek, ohlas } from "../herec.js";

const rad = (d) => (d * Math.PI) / 180;

/* ——— 01 Kami (kami-prstenec.js) ——— */
/* střed svatozáře; malé střípky obíhají po směru hodin kousek za jejím okrajem (OBEZNA: 77 × 74) */
const C = [90, 84];
/* tvář na plátně (TVAR0); do 30 jednotek od ní pootevře oko */
const TVAR = [91.7, 104.7];
const kolem = (u, r = 70) => [C[0] + r * Math.cos(rad(u)), C[1] + r * Math.sin(rad(u))];
/* rozsypání od kliknutí: SPOJENO = ZNOVU + OBEH + PRILET (poslední kus doma, záblesk), KONEC o 0,3 s později;
   další kliknutí scéna vezme až po KONEC + 0,9 */
const ZNOVU = 1.7, SPOJENO = 4.56, KONEC = 4.86;
/** Zakrouží ukazatelem kolem svatozáře: od úhlu `od` o `kolik` stupňů, jedno kolo za `kolo` vteřin. */
function* kruz(od, kolik, kolo = 1.3) {
  for (let u = od + 45; u <= od + kolik; u += 45) yield mys(...kolem(u), kolo / 8);
}

/* ——— 02 Tušový lem (lem-noc.js) ——— */
/* od rozednění (dyn.rano): v R_NOC se setmí a spáry zmizí, v R_KONEC je nová noc celá a praskne, co se mezitím naťukalo */
const R_NOC = 6.6, R_KONEC = 9;
/* svítá, když je zalitých aspoň devět spár a žádná nečeká (čtyři jsou hotové od začátku);
   ťukáním jich jde přidat pár navíc — hrajeme na deset */
const SPAR = 10;
/* kam se dá ťuknout: střed a věnec uvnitř oblasti, kde noc smí praskat (doOblasti: elipsa 60 × 49 kolem [90, 84]) */
const MISTA = [[90, 84]];
for (let u = 0; u < 360; u += 30) MISTA.push([90 + 44 * Math.cos(rad(u)), 84 + 35 * Math.sin(rad(u))]);
const hotovych = (dyn) => dyn.trhliny.filter((tr) => tr.faze === "hotova").length;
const ceka = (dyn) => dyn.trhliny.length - hotovych(dyn);
/** Nejvolnější místo: co nejdál od úderů, které na nebi už jsou, a od Střípka (jako volneMisto ve scéně). */
const volne = (dyn) => {
  let nej = MISTA[0], dNej = -1;
  for (const p of MISTA) {
    let d = Math.hypot(p[0] - dyn.s.x, p[1] - dyn.s.y) * 0.7;
    for (const tr of dyn.trhliny) d = Math.min(d, Math.hypot(p[0] - tr.hlavni[tr.uderI][0], p[1] - tr.hlavni[tr.uderI][1]));
    if (d > dNej) [nej, dNej] = [p, d];
  }
  return nej;
};

export default {
  /* 01 Kami — svatozář ze střepů: hlídá jedním okem, střípky ve víru, rozsypání a nakonec rozsypání ve víru */
  prstenec: {
    delka: 37,
    *hraj(h) {
      /* dyn.sek = kdy se svatozář naposledy rozsypala */
      const odKliku = () => h.t - h.dyn.sek;
      yield titulek("Střípek medituje. Za zády svatozář z rozbitého talíře.");
      yield cekej(2.8);
      /* u tváře pootevře oko — to, ze které strany se kouká */
      yield mys(30, 96, 0);
      yield mys(68, 102, 0.9);
      yield titulek("Tváří se, že o nikom neví. Jedním okem ale hlídá.");
      yield cekej(1.3);
      yield mys(36, 96, 0.5);
      yield cekej(0.9);
      yield mys(70, 102, 0.45);
      yield cekej(0.6);
      yield mys(114, 102, 0.4);
      yield ohlas("smich");
      yield cekej(1.1);
      yield mys(...kolem(0), 0.5);
      yield cekej(1);
      /* mávnutí kolem svatozáře malé střípky roztočí */
      yield titulek("Zvedne se vítr. Malé střípky se roztočí.");
      yield* kruz(0, 720);
      yield cekej(2.4);
      /* kliknutí: lekne se, svatozář se rozsype a on ji kus po kusu složí; jeden kus se přitom vymění za cizí */
      const pred = [...h.dyn.vzor];
      yield klik(90, 44, 0.5);
      yield ohlas("uzas");
      yield titulek("Někdo ťukne. Svatozář je na kusy.");
      yield az(() => odKliku() > ZNOVU + 0.7, 4);
      yield titulek("Oči zavřít, jazyk ven. Skládá ji kus po kusu.");
      yield az(() => odKliku() > SPOJENO, 4);
      yield ohlas("potlesk");
      yield az(() => odKliku() > KONEC, 2);
      yield titulek("Drží. Jen jeden kus se vrátil odjinud.");
      /* až se dosměje, jedním okem si ho prohlédne: ukazatel k tváři z té strany, kde nový kus sedí
         (kusy jdou od 100° po směru hodin, zhruba po třiceti stupních) */
      yield az(() => odKliku() > KONEC + 1.8, 3);
      const novy = Math.max(0, h.dyn.vzor.findIndex((v, i) => v !== pred[i]));
      const smer = rad(100 + (novy + 0.5) * 30);
      yield mys(TVAR[0] + 24 * Math.cos(smer), TVAR[1] + 24 * Math.sin(smer), 0.6);
      yield cekej(1.9);
      /* vrchol: totéž ve víru — roztočit, ťuknout a kroužit dál, než se kusy začnou vracet */
      yield ohlas("volani");
      yield titulek("Ještě jednou. Tentokrát do větru.");
      yield mys(...kolem(-90), 0.4);
      yield* kruz(-90, 540);
      yield klik(...kolem(90), 0);
      yield* kruz(90, 540, 1.5);
      yield az(() => odKliku() > SPOJENO, 4);
      yield titulek("Zlata neubývá. Talíř je pokaždé o kus pestřejší.");
      yield pryc();
      yield cekej(5);
    },
  },

  /* 02 Tušový lem — prasklá noc: praská sama i po ťuknutí, Střípek zalévá, po poslední spáře svítá; nová noc vydrží chvilku */
  noc: {
    delka: 38,
    *hraj(h) {
      let naposled = -9, oMisce = false;
      /** Titulek, ale až když ten předchozí chvíli visel. */
      const rekni = function* (text, odstup = 2.2) {
        while (h.t - naposled < odstup) yield cekej(0.1);
        naposled = h.t;
        yield titulek(text);
      };
      /** Čeká na stav scény (nejdéle `max` vteřin) a hlídá přitom, kdy si Střípek letí namočit — to přijde, kdy samo chce. */
      const pockej = function* (max, kdyz) {
        const konec = h.t + max;
        while (h.t < konec && !kdyz()) {
          if (!oMisce && h.dyn.s.faze === "namaci" && h.t - naposled > 2.4) {
            oMisce = true;
            yield* rekni("Dojde barva. Dolů k misce, namočit a zpátky.");
          }
          yield cekej(0.03);
        }
      };
      /** Počká, až Střípek dodělá další spáru. */
      const dalsiSpara = function* (max) {
        const n = hotovych(h.dyn);
        yield* pockej(max, () => hotovych(h.dyn) > n);
      };
      /**
       * Nádech před ťuknutím — ale jen dokud nehrozí, že noc praskne sama: to zkouší v čase dyn.dalsi
       * a povede se jí to, když čeká míň než dvě trhliny. Ťuknutí těsně předtím jí to zarazí.
       */
      const nadech = function* (s) {
        yield* pockej(s, () => h.dyn.dalsi - h.t < 0.2);
      };
      /** Když mu se spárou došla i barva (zásoba pod 0,3 — hned poletí k misce), pustí vypravěč napřed misku. */
      const miskaNapred = function* () {
        if (!oMisce && h.dyn.s.zasoba < 0.3) yield* pockej(1.6, () => oMisce);
      };
      const tukni = function* () {
        yield klik(...volne(h.dyn), 0.3);
        yield cekej(0.15);
      };

      yield* rekni("Noc je černá miska. Kde praskne, zalije ji Střípek světlem.");
      /* první trhlinu si noc udělá sama hned, druhou za chvíli; jak se do té druhé pustí, někdo mu do toho ťukne */
      yield* pockej(8, () => hotovych(h.dyn) > 4 && !!h.dyn.s.prace);
      yield* rekni("Praská mrazem. Nebo když do ní někdo ťukne.");
      yield* nadech(1);
      yield* tukni();
      yield pryc();
      /* sotva dodělá, praskne jinde — a dokud čekají aspoň dvě trhliny, noc sama nepraská, takže další jsou jen naše */
      yield* dalsiSpara(8);
      yield* nadech(0.3);
      yield* tukni();
      yield pryc();
      yield* dalsiSpara(10);
      yield* nadech(0.3);
      /* a ještě dvakrát, do deseti (kdyby si noc přece jen jednu přidala sama, tak jednou) */
      let kolik = 0;
      for (; kolik < 3 && h.dyn.trhliny.length < SPAR && ceka(h.dyn) < 5; kolik++) yield* tukni();
      yield ohlas("uzas");
      yield pryc();
      yield* miskaNapred();
      yield* rekni("Sotva jednu zalije, praskne jinde." + (kolik > 1 ? " A hned dvakrát." : ""));
      /* zbývá poslední */
      yield* pockej(20, () => ceka(h.dyn) <= 1);
      yield* miskaNapred();
      yield ohlas("volani");
      yield* rekni("Poslední. Noc je žilkovaná jako slepená miska.");
      yield* pockej(12, () => h.dyn.rano != null);
      yield az(() => h.dyn.rano != null, 1);
      /* svítání */
      yield ohlas("potlesk");
      yield* rekni("Spáry vzplanou a za horami vyjde slunce.");
      yield az(() => h.t - h.dyn.rano > R_NOC + 0.3, 9);
      yield* rekni("Pak se setmí. Nová noc je zase celá.");
      /* co se naťuká za svítání, praskne naráz, až je tma; teď už se tím svítání nezkrátí (to jen mezi R_PLNE a R_NOC) */
      for (const [x, y] of [[46, 70], [134, 62], [94, 112]]) {
        yield klik(x, y, 0.2);
        yield cekej(0.15);
      }
      yield pryc();
      yield az(() => h.dyn.rano == null, R_KONEC - R_NOC);
      yield cekej(0.5);
      yield ohlas("smich");
      yield* rekni("Byla.", 0);
      /* dohra: letí zalévat; délka se dorovná podle toho, jak dlouhé trhliny si noc nalosovala */
      yield cekej(Math.min(4.5, Math.max(2, 38 - h.t)));
    },
  },
};
