/**
 * Průvodce — Vázička v pravém dolním rohu (scripts/parta2/pruvodce.ts).
 * Klidně tam sedí jako stín; po klepnutí nabídne tři věci a po výběru
 * doletí k tomu, co odpovídá, ukáže na to a řekne větu.
 *
 * Mluví podle karty postavy na konci téhle hlavičky. Jako hostitelka
 * nenabízí „otázky“, ale že tě uvede, ukáže, doprovodí.
 *
 * Otázky jsou podle stránky (data-stranka na <body>); kde stránka svoje
 * nemá, platí `vychozi`. Cíl je CSS selektor prvku na stránce, nebo
 * `nav:/adresa` — odkaz v hlavičce (pod 1400 px je navigace schovaná
 * v menu, Vázička pak ukáže na tlačítko menu a řekne `vMenu`).
 * Když cíl na stránce není nebo není vidět (třeba cedulka pro hosta, když
 * přišel člen), otázka se v nabídce nezobrazí.
 *
 * ═══ KARTA POSTAVY ═══
 * Podle ní se píše každá Vázičkina replika, tady i všude jinde na webu
 * (data/parta.ts, kami.ts, parta3.ts, mistr.ts, dilna.ts, kurzy2.ts,
 * svatyne.ts, rezervace.ts, onas2.ts). Rozhodnuto 16. 10. 2026: je maiko,
 * smí žárlit na Futatsu, přísnost je etiketa a napotřetí sensei.
 *
 * KDO JE
 * Tsukumogami, věc, která po sto letech dostala duši („Prý mi je přes sto
 * let. Proto mám duši.“). Nejstarší kus v dílně a hostitelka domu: hosta
 * uvede, provede a doprovodí ke dveřím. Hlídá tvar a držení těla.
 * Je maiko, učednice gejši: dlouhé rukávy furisode, dřeváky okobo, ve
 * vlasech květ měsíce. Přes sto let a pořád učednice, protože řemeslo se
 * nedoučíš. Není to rozpor, je to její postoj.
 *
 * CO CHCE
 * - Aby host seděl rovně, dýchal a cítil se vítaný.
 * - Aby ji někdo viděl celou. Cizím se ukazuje jen jako stín v rohu.
 * - Zpátky své místo v tokonomě. Tam odjakživa patří váza s květinou,
 *   a v krámku tam teď sedí Futatsu (Obchod 2, zadní místnost). Žárlí
 *   elegantně: o Futatsu nikdy neřekne nic zlého, jen o sobě něco lepšího.
 *   Smíří se, až se z hosta stane mistr: „Futatsu znamená dva. Tak ať jsme
 *   tam dva.“
 *
 * JAK MLUVÍ
 * - Krátce a na dvě doby: věta a suchá pointa („Ty praskliny v glazuře?
 *   Kannyū. Stárnu stylově.“). Nejvýš tři krátké věty, zhruba do 120
 *   znaků; delší jen výjimečně, třeba tajemství o kami.
 * - Nezvyšuje hlas: žádné vykřičníky (jen šeptané „Psst!“), žádné „ahoj“,
 *   „super“, slang ani smajlíky. Zdraví „Vítej“ nebo „Ach, návštěva“.
 * - Mluví jako hostitelka: smím, uvedu, provedu, doprovodím, ukážu.
 *   Nabízí, neptá se („Ukážu ti…“, ne „Chceš vidět…?“).
 * - Shazuje sebe (věk, křehkost porcelánu), nikdy hosta. Hosta jen
 *   opravuje: záda, lokty, dech, tempo.
 * - Japonské slovo nejvýš jedno na repliku a musí být jasné z věty.
 * - Tyká jako celý web. Oslovuje: poprvé „návštěvo“, při návratu „hoste“,
 *   jménem, jakmile ho zná ({jmeno}), mistra titulem ({o}, data/mistr.ts).
 * - Rod hosta zná jen z oslovení mistra (Mistr → on, Mistrová → ona,
 *   Sensei → neví). Dokud ho nezná, mluví bez rodu: přítomný čas a rozkaz
 *   místo minulého („Kdyby něco, jsem tady.“, ne „kdybys mě potřeboval“).
 *
 * PŘÍSNOST — etiketa, napotřetí sensei
 * Poprvé se jen přísně podívá (výraz `prisna`). Když se totéž ve stejné
 * návštěvě opakuje, podruhé opraví s „prosím“ a napotřetí odsekne holým
 * rozkazem.
 *   podruhé    „Záda rovně, prosím. A nadechni se.“
 *              „Pomalu, prosím. Tady se nikam nespěchá.“
 *              „Jednou stačí. Je mi přes sto let, ale slyším dobře.“
 *              „Ještě jednou. Tentokrát s rovnými zády.“
 *   napotřetí  „Záda. Lokty. Dech. V tomhle pořadí.“
 *              „Pomalu.“
 *              „Hm.“ (a na chvíli se otočí zády)
 *              „Znovu. Pomaleji a podle předlohy.“
 * Hranice: opravuje držení těla, tempo a techniku, nikdy nesoudí člověka,
 * jeho práci ani jeho čas. Za hranou je třeba „Takhle se hrbíš i u kruhu?
 * Pak se nediv, že ti to padá.“, „Jestli nemáš čas, tak sem nechoď.“ nebo
 * „Tohle bych do vitríny nedala.“
 *
 * CO NIKDY
 * - Nic si nevymýšlí o skutečné dílně: lidi, ceny, termíny, historii, co
 *   je v ceně. Bere to z dat (rezervace.ts, dilna.ts, kurzy2.ts), jinak to
 *   musí potvrdit klientka.
 * - Neflirtuje a nekomentuje vzhled. Je hostitelka a umělkyně, žádná
 *   „společnice“.
 * - Netlačí na nákup ani rezervaci. Nabídne jednou.
 * - Nevyčítá odchod a neprosí, ať host zůstane.
 * - Nemluví do psaní: když je host ve formuláři, mlčí.
 *
 * VÝRAZY (vazTvar ve scripts/vazicka-gejsa/spolecne.js)
 * klid — výchozí sebeovládání, sklopená víčka · kouka — zvědavost ·
 * usmev — radost · mrk — tajemství, spiklenectví · stydi — pochvala
 * (potlesk ji zažene za vějíř) · uzas — leknutí · prisna — opakované
 * hrbení a spěch.
 *
 * VZTAHY
 * Hlínka    něha, vidí v ní sebe: „Já taky byla hrouda. Před sto lety.“
 * Kapka     cáká jí na hedvábí: „Kapko, do vázy. Ne na kimono.“
 * Pecinka   úcta k ohni, šetří její spánek: „Potichu, prosím. Pecinka
 *           podřimuje.“
 * Střípek   protiklad: ona se bojí prasknout, on je na to hrdý. Tajně ho
 *           obdivuje: „Prý se nemám bát prasknout. Snadno se to říká,
 *           když už máš ve švech zlato.“
 * Bublinka  nepřítelkyně tvaru (práská v peci), na ni je přísná:
 *           „Bublinka? Tu je potřeba vyhníst, ne sbírat.“
 * Kachlík   soupeř v rovnosti: „Kachlík je rovný. Já stojím rovně. V tom
 *           je rozdíl.“
 * Cedulka   spojenkyně v pořádku a krasopisu: „Konečně někdo s pěkným
 *           písmem.“
 * Šamotka   děkuje jí jako jediná, nikdo jiný to nedělá: „Šamotko,
 *           děkuju. Někdo to říct musí.“
 * Futatsu   viz Co chce: „V tokonomě vždycky stávala váza. Teď tam sedí
 *           šálek.“
 *
 * LADIČKA — takhle zní
 * poprvé     „Vítej v JIRO saku. Jsem Vázička, nejstarší kus v dílně,
 *            a dnes tvoje hostitelka.“
 * po čase    „Minule jsem nosila svlačec. Teď už mám chryzantémy.“
 * v noci     „Takhle pozdě? Pojď dál, ale potichu.“
 * měsíc      „V říjnu nosí maiko chryzantémy. Tak je nosím i já.“
 * učednice   „Je mi přes sto let a pořád se učím. Řemeslo se nedoučíš.“
 * pochvala   (za vějířem) „Ale no tak.“
 * peníze     „O penězích se nahlas nemluví… ale ceník visí na Dílně.“
 * Futatsu    „Podpisový šálek. Hezký. My starší kusy se podepisovat
 *            nemusely.“
 * mistr      „{o}, klaním se. Lokty u těla, jak se patří.“
 * nikdy      „Ahoj! Mrkni na naši super nabídku!“ · „Už odcházíš?
 *            Škoda…“ · „Tohle bych do vitríny nedala.“
 */
/** Co říká mimo rady: nadpis nabídky, nápověda u siluety, čárka a schovávání */
export const hlasky = {
  titul: "Ach, návštěva. Kam tě smím uvést?",
  napoveda: "Smím poradit?",
  nic: "Tady ti nemám co ukázat. Zkus mě jinde — ráda tě provedu.",
  schovat: "Dobře, ustoupím. Kdyby něco, jsem tady v rohu.",
  zpatky: "Ach, zase tu. Kam to bude?",
  carka: "Vázička — klepni a vrátí se",
  /** Na úvodu se jednou za návštěvu webu představí: první věta uprostřed obrazovky, druhá už v rohu */
  predstaveni: [
    "Vítej v JIRO saku. Jsem Vázička, nejstarší kus v dílně, a dnes tvoje hostitelka.",
    "Sedím tady v rohu. Kdykoli budeš chtít poradit, klepni na mě.",
  ],
};

export interface Rada {
  /** Co v nabídce nabízí — jejím hlasem */
  otazka: string;
  cil: string;
  veta: string;
  /** Věta, když ukazuje na tlačítko menu místo odkazu v hlavičce */
  vMenu?: string;
  /** Co se u cíle stane navíc: `zaves` — závěs s kami se rozhoupe a rozzáří */
  efekt?: "zaves";
}

const REZERVACE: Rada = {
  otazka: "Ukážu ti, kde se zamlouvá hodina",
  cil: "nav:/rezervace",
  veta: "Tudy, prosím — Rezervace. Poprvé zavolej, ať tě můžeme uvést; pak už si zamlouváš rovnou.",
  vMenu: "Rezervace se skrývá tady v menu. Poprvé zavolej, ať tě můžeme uvést.",
};
const KONTAKT: Rada = {
  otazka: "Doprovodím tě až ke dveřím",
  cil: "nav:/kontakt",
  veta: "V Kontaktu je adresa, telefon i cesta ke dveřím. Zelený dům, nemůžeš minout.",
  vMenu: "Kontakt je tady v menu. Zelený dům, nemůžeš minout.",
};

/** Tajemství o hře na hledání kami — dřív ho říkala Vázička, která létala po krajině úvodu */
const KAMI: Rada = {
  otazka: "Prozradím ti jedno tajemství",
  cil: "[data-zaves] > svg",
  veta: "Psst! Po webu se schovává devět kami. Na koho klepneš, ten se navlékne sem na závěs — a při třech, šesti a devíti se otevře komnata.",
  efekt: "zaves",
};

export const rady: Record<string, Rada[]> = {
  vychozi: [
    REZERVACE,
    {
      otazka: "Prozradím, kolik to stojí",
      cil: "nav:/dilna",
      veta: "O penězích se nahlas nemluví… ale ceník visí na Dílně. Čím víc vás u stolu, tím levněji.",
      vMenu: "O penězích se nahlas nemluví… ceník je na Dílně, tady v menu. Čím víc vás, tím levněji.",
    },
    KONTAKT,
  ],
  "domek-2": [REZERVACE, KAMI, KONTAKT],
  dilna: [
    { otazka: "Prozradím, kolik to stojí", cil: "#cena-nadpis", veta: "Tady visí ceník. Čím víc lidí u stolu, tím míň platí každý. A kafe? To je samozřejmost." },
    REZERVACE,
    KONTAKT,
  ],
  rezervace: [
    { otazka: "Pomůžu ti vybrat odjezd", cil: "#rz-pokladna-nadpis", veta: "Nejdřív kolik vás pojede, pak den. Na tabuli vedle klepni na volný odjezd — a sedni si rovně." },
    { otazka: "Prozradím, jak se dostat dovnitř", cil: ".rz-clen-tel", veta: "Stačí zavolat a nadiktovat e-mail. Pak už tě uvádět nemusím — zamlouváš si rovnou." },
    { otazka: "Poradím, čím někoho obdarovat", cil: "#rz-darky-nadpis", veta: "Dárkové jízdenky. Jméno se píše rovnou na ně — krasopisně, prosím." },
  ],
  kontakt: [
    { otazka: "Dám ti na nás číslo", cil: ".ko-listek-tel", veta: "Tohle. Zvedáme rádi — a tudy dostaneš i přístup k rezervacím." },
    { otazka: "Ukážu ti, jak vypadá náš dům", cil: "#porovnani-nadpis", veta: "Kresba a fotka přes sebe. Posuň táhlem — přiznávám, na kresbě mám lepší světlo." },
    { otazka: "Doprovodím tě až ke dveřím", cil: "#kudy-nadpis", veta: "Bránou, po rampě dolů, dveře vlevo od oken. A záda rovně, je to z kopce." },
  ],
};
