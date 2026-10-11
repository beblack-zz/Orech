/*
 * Vystoupení Kachlíka na /parta-3 — choreografie pro scény ze scripts/kachlik-rovina.
 * Jak se zapisují, je v ../herec.js; hraje je režisér (../reziser.ts).
 */
import { cekej, mys, klik, pryc, az, titulek, ohlas } from "../herec.js";

/* ——— v1: svatozář. Čísla z kresby.js (V1) ——— */
/* výšky čar, které šňůra tiskne do zlatého pásu (RADKY); klepnutí míří tam, kde čára vznikne */
const RADKY = [47, 43.5, 50.5];
/* podstavec (PATRA): tři stupně kachlí 10 × 10, pořadí jako v KACHLE — podle něj se pozná dyn.oprava.i */
const KACHLE = [[140, 55, 7], [150, 40, 10], [160, 25, 13]].flatMap(([y, x0, n]) => Array.from({ length: n }, (_, i) => [x0 + i * 10 + 5, y + 5]));
/* levou půlku (střed kachle do 90) spravuje palička, pravou olovnice */
const vlevo = (i) => KACHLE[i][0] <= 90;
/* kachle, které vyrazíme my: prostřední stupeň a pak horní, vždy jedna vlevo a jedna vpravo */
const VYRAZ = { L: [55, 155], P: [125, 155], L2: [70, 145], P2: [110, 145] };
/* vítr fouká nejvíc kolem olovnice (150, 128); poryvy vedou přes ni */
const VITR = { y: 128, x0: 62, x1: 176 };

/* ——— v2: zahrada. Místa na štěrku, kam je od prahu vidět a kde nejsou ostrovy (OSTROVY, dosah) ——— */
/* kolečka prstem vpravo od prostředního ostrova, pod zadním: velké a v něm malé */
const KOLO = { x: 138, y: 105, velke: 9, male: 5, dilku: 16 };
const naKole = (r, i) => {
  const u = (i / KOLO.dilku) * Math.PI * 2 - Math.PI / 2;
  return [KOLO.x + r * Math.cos(u), KOLO.y + r * Math.sin(u)];
};
/** Jedno kolečko dokola (a kousek přes, ať se zavře). Rýha vzniká jen z plynulého pohybu. */
function* kolecko(r, dilek = 0.08) {
  yield mys(...naKole(r, 0), 0);
  for (let i = 1; i <= KOLO.dilku + 1; i++) yield mys(...naKole(r, i), dilek);
}
/*
  Kamínky: první vlevo před Kachlíka, druhý doprostřed koleček. Výška prvního je schválně
  109 (hloubka 14): jeho pruh ±6 pak začíná těsně pod kolečky a Kachlík hrabe přes celou
  zahradu jen jednou — druhý pruh mu zbyde krátký (naplanuj skládá pruhy po 12 jednotkách
  hloubky). Blíž k prahu by čtvercové vlny přetekly přes okap z oblázků.
*/
const KAMINKY = [[64, 109], [KOLO.x, KOLO.y]];
/* koruna javoru (vKorune): elipsa kolem 134, 43 */
const JAVOR = [134, 52];
/* bambusová klapačka (naBambusu): x 25–48, y 102–123 */
const BAMBUS = [36, 112];

/* ——— v3: kamna. Čísla z kresby.js (V3) ——— */
const MESIC = [30, 29];
/* levá půlka střechy (STRECHA: 18, 72 → 90, 17), sníh z ní sjede k sněhulákovi */
const STRECHA = [56, 43];
/* Kachlík stojí na KX = 81, zásah platí mezi y 116 a 146 */
const KACHLIK = [81, 131];
/* kachel 1 — spodní řada uprostřed, leží od začátku (slotXY(1) + 6) */
const KACHEL = [122, 128];

const pada = (h) => h.dyn.listy.some((l) => l.faze === "pada");

export default {
  /* 01 Svatozář pravého úhlu — šňůra a razítko, kachel, co se pohne sám, vítr v olovnici a nakonec všechny ruce naráz */
  v1: {
    delka: 33,
    *hraj(h) {
      yield titulek("Kachlík má šest rukou. V každé nářadí na rovinu.");
      yield cekej(2.4);

      /* šňůra: napne, cvrnkne, razítko */
      yield titulek("Napne šňůru a cvrnkne. Čáru potvrdí razítkem.");
      yield klik(90, RADKY[0], 0);
      yield pryc();
      yield az(() => h.dyn.tisky.length > 0, 2);
      yield ohlas("uzas");
      yield az(() => !h.dyn.obrad, 4);

      /* první kachel se nakřiví sám (dalsiKriva = 6,5 s), jen se na něj počká */
      yield az(() => h.dyn.oprava, 3);
      const sam = h.dyn.oprava ? vlevo(h.dyn.oprava.i) : true;
      yield titulek("V podstavci se pohnul kachel. Sám od sebe.");
      yield az(() => !h.dyn.oprava, 6);
      yield cekej(0.6);

      /*
        Vítr: poryvy přes olovnici v jejím rytmu, vždycky po směru kyvu (půlkyv trvá 0,62 s,
        vejdou se do něj dva). Mezi poryvy ukazatel na snímek zmizí — návrat by foukal zpátky.
      */
      yield titulek("Zafouká. Olovnice se rozkývá a Kachlík znervózní.");
      for (let i = 0; i < 6; i++) {
        const doprava = i % 2 === 0;
        const [od, kam] = doprava ? [VITR.x0, VITR.x1] : [VITR.x1, VITR.x0];
        yield az(() => (doprava ? h.dyn.om > 0 && h.dyn.th < 0 : h.dyn.om < 0 && h.dyn.th > 0), 2);
        for (let n = 0; n < 2; n++) {
          yield pryc();
          yield cekej(0.03);
          yield mys(od, VITR.y, 0);
          yield mys(kam, VITR.y, 0.24);
        }
      }
      yield pryc();
      yield cekej(1.2);

      /* vyražený kachel na té straně, kde se ještě neopravovalo — ať je vidět i druhé nářadí */
      yield az(() => !h.dyn.oprava, 6);
      yield titulek(sam ? "Napravo paličkou nedosáhne. Ťuká tedy olovnicí." : "Nalevo to spraví palička. Tři ťuknutí a sedí.");
      yield klik(...(sam ? VYRAZ.P : VYRAZ.L), 0);
      yield pryc();
      yield cekej(1.7);
      yield ohlas("smich");
      yield az(() => !h.dyn.oprava, 4);
      yield cekej(0.8);

      /* vrchol: kachel a šňůra zároveň, dvakrát po sobě — horní čtyři ruce tisknou, spodní ťuká */
      yield ohlas("volani");
      yield titulek("A teď všechno naráz.");
      yield cekej(1);
      for (const kam of [VYRAZ.L2, VYRAZ.P2]) {
        yield az(() => !h.dyn.oprava && !h.dyn.obrad, 5);
        yield klik(...kam, 0);
        yield pryc();
        yield cekej(0.2);
        yield klik(90, RADKY[h.dyn.radek % RADKY.length], 0);
        yield pryc();
        if (kam === VYRAZ.L2) {
          yield cekej(1.1);
          yield titulek("Čtyři ruce tisknou, pátá ťuká. Šestá má volno.");
        }
      }
      yield az(() => !h.dyn.oprava && !h.dyn.obrad, 5);
      yield titulek("Tři čáry jako podle pravítka. Jen razítko má nakřivo.");
      yield cekej(3.4);
    },
  },

  /* 02 Karesansui — kolečka prstem, kamínky a čtvercové vlny, úklid, úklona a javor, který to nenechá být */
  v2: {
    delka: 33,
    *hraj(h) {
      yield titulek("Kachlík hrabe suchou zahradu. Bambus mu odklepává čas.");
      yield cekej(2.2);
      /* bambus by klapl sám až v 4,8 s (PERIODA 7,4); klepnutí ho překlopí hned a Kachlík přikývne */
      yield klik(...BAMBUS, 0);
      yield pryc();
      yield az(() => h.dyn.kyv > 0, 2);
      yield cekej(1);

      /*
        Prst ve štěrku: kolečko a do něj menší. Dokud prst kreslí, Kachlík jen stojí a cuká
        mu obočí; dokud padá první list, obtáhne se velké znovu, ať ho sebere s ostatním.
      */
      yield titulek("Někdo mu do štěrku kreslí kolečka.");
      yield* kolecko(KOLO.velke);
      yield pryc();
      yield cekej(0.03);
      yield* kolecko(KOLO.male, 0.06);
      yield ohlas("smich");
      if (pada(h)) {
        yield pryc();
        yield cekej(0.03);
        yield* kolecko(KOLO.velke);
      }
      yield pryc();
      yield cekej(0.5);

      /* kamínky: další musí přijít do 1,3 s, jinak Kachlík vyrazí uklízet */
      yield titulek("A hází kamínky. Vlny po nich jsou čtvercové.");
      yield klik(...KAMINKY[0], 0);
      yield pryc();
      yield cekej(0.45);
      yield ohlas("uzas");
      yield cekej(0.35);
      yield klik(...KAMINKY[1], 0);
      yield pryc();

      /* úklid: plán si Kachlík udělá sám, až 1,3 s nic nepřiletí — sebrat, uhrabat, domů, vysypat, úklona */
      yield az(() => h.dyn.k.plan.length > 0, 3);
      yield titulek("Kachlík počká, až to přestane. Pak jde uklízet.");
      yield az(() => h.dyn.k.plan[0]?.typ === "hrab", 16);
      yield titulek("Hrabe rovně přes celou zahradu. Se zavřenýma očima.");
      yield az(() => !h.dyn.k.plan.some((u) => u.typ === "hrab"), 16);
      yield titulek("Co nasbíral, nese domů do košíku.");
      yield az(() => h.dyn.k.plan[0]?.typ === "uklona", 8);
      yield titulek("Ukloní se. Svisle, on se nenakloní nikdy.");
      yield cekej(1.3);

      /* dohra: javor setřese další listí */
      yield klik(...JAVOR, 0);
      yield pryc();
      yield cekej(0.7);
      yield titulek("Javor mezitím pustil další listy.");
      yield ohlas("smich");
      yield cekej(3.4);
    },
  },

  /* 03 Kachlová kamna — příběh hraje scéna sama; my do stavby hodíme tři koule, v teple trefíme měsíc a počkáme si na prasklý kachel */
  v3: {
    delka: 47,
    *hraj(h) {
      /* čas uvnitř fáze příběhu; hodiny stavby stojí, když Kachlík doklepává sražený kachel */
      const veFazi = (faze, od = 0) => () => h.dyn.faze === faze && h.dyn.hodiny - h.dyn.fazeOd >= od;

      yield titulek("Zimní noc. Kachlík staví kamna, kachle hází přes hlavu.");
      yield cekej(6);

      /* tři koule do stavby: střecha, Kachlík, kachel; ukazatel zůstává na místě, kočka se tam dívá */
      yield titulek("Z hlediště létají sněhové koule. Na střechu, na Kachlíka…");
      yield klik(...STRECHA, 0);
      yield cekej(3.3);
      yield klik(...KACHLIK, 0);
      yield az(() => h.dyn.kach.splat > 0.5, 2);
      yield ohlas("smich");
      yield cekej(3);
      yield titulek("Další mu srazí kachel nakřivo. Hned ho doklepe.");
      yield klik(...KACHEL, 0);
      yield cekej(2.5);
      yield pryc();

      /* stavba doběhne sama: zbylé kachle, římsa, sirka, dvířka */
      yield az(veFazi("zatapi", 0.2), 14);
      yield titulek("Hotovo. Zatopí, mráz na okně taje a kočka jde na pec.");

      /* v teple (trvá 13 s): koule na měsíc */
      yield az(veFazi("teplo", 5.5), 10);
      yield titulek("Jedna koule doletí až na měsíc.");
      yield klik(...MESIC, 0);
      yield pryc();
      yield az(() => h.dyn.mesicSplat > 0.5, 2);
      yield ohlas("uzas");

      /* vrchol: Kachlík otevře oči, najde kachel o půl stupně nakřivo, ťukne — a ten praskne */
      yield az(veFazi("teplo", 11.7), 8);
      yield titulek("Pak otevře oči. Jeden kachel je o půl stupně nakřivo.");
      yield az(veFazi("vsimne", 0.5), 4);
      yield ohlas("volani");
      yield az(() => h.dyn.kachle[h.dyn.skoro]?.prasklina, 4);
      yield cekej(0.4);
      yield titulek("Ťukne do něj a kachel praskne. Rozebere tedy všechno.");
      yield az(veFazi("rozebira", 0.6), 5);
      yield ohlas("smich");

      /* dohra: kachle jsou v bedně, začíná druhá kamna (TEMATA[1], bílá habánská) */
      yield az(veFazi("stavi", 0.3), 5);
      yield titulek("A staví znovu. Tentokrát bílá.");
      yield cekej(3);
    },
  },
};
