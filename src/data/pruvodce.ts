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
 * hrbení a spěch. Rady a hlášky níž nesou `vyraz`, se kterým je řekne;
 * bez něj mluví s tím, co má zrovna na tváři.
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
 * CO O HOSTOVI VÍ (druhé kolo, 17. 10. 2026)
 * Jen to, co host v domě sám udělal a co si kvůli hře pamatují jiné
 * skripty: podpis rydlem, mistrovský list, zkoušky u mistra, nalezené kami,
 * šátek z krámku, slepené číslo, uzlíky omikuji, lístek ze svatyně,
 * rozepsanou dárkovou jízdenku a noc v hlavičce (scripts/parta2/
 * pruvodce-host.ts). Sama nic nového neukládá: nepočítá návštěvy, neměří
 * čas, nesleduje. Gejša je diskrétní — a na požádání řekne, co ví („Povím
 * ti, co o tobě vím“). Jméno z podpisu jen v 1. pádě (5. pád jména se nedá
 * spolehlivě odvodit); oslovuje titulem mistra. Sensei: rod nezná, mluví
 * bez rodu — a maiko se od senseie ráda učí.
 *
 * CO SE DĚJE TEĎ (třetí kolo, 17. 10. 2026)
 * Reaguje jen na chvíli, nic neukládá, počítadla platí na jedné stránce:
 * rychlý scroll je vítr (pohled → „Pomalu, prosím…“ → „Pomalu.“), klepání
 * dokola (pohled → „Jednou stačí…“ → „Hm.“ a zády), v tichu si upraví
 * květy, ovívá se a zadřímne, ve vlasech nosí květy skutečného měsíce
 * a jednou za stránku poznamená, co je na obrazovce.
 *
 * HLAS A GESTA (čtvrté kolo, 17. 10. 2026)
 * Mluví šamisenem: na slabiku tiché brnknutí ve stupnici mijako-buši, výška
 * podle samohlásky, přízvuk na první slabice slova; přísná hlouběji, stydí
 * se a usmívá výš a tišeji, úžas začne „ach“, stydlivá věta skončí
 * zachichotáním — jen se zapnutým zvukem webu (scripts/parta2/pruvodce-hlas.ts).
 * Text v bublině píše štětcem, u „…“, „—“ a teček se zastaví. Replika může
 * nést gesto: úklona, vějíř, vlasy, ovívání, zády.
 *
 * OZASHIKI (páté kolo, 17. 10. 2026)
 * Gejša baví hosty hrami: Tora-tora za zástěnou (scripts/parta2/ozashiki.ts),
 * na tři výhry. Hraje férově, jen má zlozvyk — před tygrem se ovívá. Kdo ho
 * dvakrát využije, toho prokoukne. Prohrává ráda a s úklonou, vyhrává
 * s mrknutím. Výhra se nikam neukládá.
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
import type { PostavaId } from "./parta";

/** Výrazy tváře z kresby (vazTvar ve scripts/vazicka-gejsa/spolecne.js); co který znamená, říká karta */
export type Vyraz = "klid" | "kouka" | "usmev" | "uzas" | "prisna" | "mrk" | "stydi";

/** Gesto k replice (kresba kami-kvety.js): úklona, póza s vějířem, přidrží si vlasy, ovívá se, otočí se zády */
export type Gesto = "uklon" | "vejir" | "vlasy" | "ovivani" | "zady";

/** Co řekne v bublině, s jakým výrazem a gestem; bez výrazu mluví s tím, co má zrovna na tváři */
export interface Replika {
  text: string;
  vyraz?: Vyraz;
  gesto?: Gesto;
}

/** Co říká mimo rady: čárka, schovávání a představení (nadpis nabídky a nápověda jsou v `uvitani`) */
export const hlasky: {
  nic: string;
  carka: string;
  schovat: Replika;
  zpatky: Replika;
  /** Na úvodu se jednou za návštěvu webu představí: první věta uprostřed obrazovky, druhá už v rohu */
  predstaveni: [Replika, Replika];
} = {
  nic: "Tady ti nemám co ukázat. Zkus mě jinde — ráda tě provedu.",
  carka: "Vázička — klepni a vrátí se",
  schovat: { text: "Dobře, ustoupím. Kdyby něco, jsem tady v rohu.", vyraz: "klid", gesto: "uklon" },
  zpatky: { text: "Ach, zase tu. Kam to bude?", vyraz: "usmev", gesto: "vejir" },
  predstaveni: [
    { text: "Vítej v JIRO saku. Jsem Vázička, nejstarší kus v dílně, a dnes tvoje hostitelka.", vyraz: "usmev", gesto: "uklon" },
    { text: "Sedím tady v rohu. Kdykoli budeš chtít poradit, klepni na mě.", vyraz: "mrk", gesto: "vejir" },
  ],
};

export interface Rada {
  /** Co v nabídce nabízí — jejím hlasem */
  otazka: string;
  cil: string;
  veta: string;
  /** Věta, když ukazuje na tlačítko menu místo odkazu v hlavičce */
  vMenu?: string;
  /** S jakým výrazem větu řekne (i `vMenu`) */
  vyraz?: Vyraz;
  /** Co se u cíle stane navíc: `zaves` — závěs s kami se rozhoupe a rozzáří */
  efekt?: "zaves";
  /**
   * Rada, jejíž věta záleží na tom, co host udělal (doplní ji průvodce):
   * `kami` — tajemství podle počtu nalezených, `napoveda` — kde se schovává
   * někdo, koho ještě nemá (bez něj se nenabídne), `tvar` — její zkouška
   */
  druh?: "kami" | "napoveda" | "tvar";
}

/* ═══ Druhé kolo: co host v domě sám udělal (scripts/parta2/pruvodce-host.ts) ═══ */

/**
 * Jak hosta vítá (nadpis nabídky) a jak se nabízí (nápověda u siluety).
 * Pozná jen to, co host udělal sám: mistrovský list (oslovení si vybral
 * v síni mistra), podpis rydlem a noc v hlavičce. {o} je oslovení mistra
 * v 5. pádě — Mistře, Mistrová, Sensei.
 */
export const uvitani: Record<"host" | "noc" | "podpis" | "mistr" | "sensei", { titul: string; napoveda: string }> = {
  host: { titul: "Ach, návštěva. Kam tě smím uvést?", napoveda: "Smím poradit?" },
  noc: { titul: "Ach, noční návštěva. Kam tě smím uvést?", napoveda: "Smím posvítit?" },
  podpis: { titul: "Ach, to jsi ty. Kam tě smím uvést?", napoveda: "Smím poradit?" },
  mistr: { titul: "{o}, klaním se. Kam tě smím uvést?", napoveda: "Smím, {o}?" },
  /* sensei je ten, od koho se učí — a ona je věčná učednice */
  sensei: { titul: "Sensei. Tak teď se budu učit já.", napoveda: "Smím, {o}?" },
};

/** Když host převezme mistrovský list (mistr:titul) — podle oslovení, které si vybral, takže ví i rod */
export const mistrovskyList: Record<"mistr" | "mistrova" | "sensei", Replika> = {
  mistr: { text: "{o}, klaním se. Prošel jsi všech devět zkoušek.", vyraz: "usmev", gesto: "uklon" },
  mistrova: { text: "{o}, klaním se. Prošla jsi všech devět zkoušek.", vyraz: "usmev", gesto: "uklon" },
  sensei: { text: "Sensei. Tak teď se budu učit já.", vyraz: "stydi", gesto: "uklon" },
};

/**
 * Tajemství o kami podle toho, kolik jich host našel. V `cast` doplní
 * průvodce {visi} („visí tři“, „jich visí pět“), {zbyva} („Zbývají
 * čtyři.“) a {komnata} („Komnata U mistra se otevře po šestém.“).
 */
export const kamiPostup: { nic: Replika; cast: Replika; vse: Replika } = {
  nic: {
    text: "Psst! Po webu se schovává devět kami. Na koho klepneš, ten se navlékne sem na závěs — a při třech, šesti a devíti se otevře komnata.",
    vyraz: "mrk",
  },
  cast: { text: "Na závěsu už {visi}. {zbyva} {komnata}", vyraz: "usmev" },
  vse: { text: "Všech devět. Komnaty jsou tvoje — i poklad ve svatyni.", vyraz: "usmev" },
};

/**
 * Kde se kdo schovává mimo Partu 2 — jejími slovy, od nejsnazšího. Nápověda
 * vezme prvního, koho host ještě nemá; na Partě 2 platí `skrys` z data/kami.ts.
 */
export const skryse: [PostavaId, string][] = [
  ["hlinka", "Hlínka spí dole v patičce, mezi vrstvami. Za trilobitem."],
  ["kachlik", "Kachlík se dělá číslicí v tabuli příštího odjezdu. Na Rezervaci."],
  ["samotka", "Šamotka jede vlakem na Rezervaci. V prvním voze, u okna."],
  ["vazicka", "A já? Vykukuju za Zvláštním vlakem u dárkových jízdenek. Nikomu to neříkej."],
  ["stripek", "Střípek se schoval do hodin v krámku. Mezi šestku a sedmičku."],
  ["kapka", "Kapka sedí na opěradle židle u kruhu. V roce na stránce O nás."],
  ["pecinka", "Pecinka vykukuje nad svitkem na KAMI partě. U levého válce."],
  ["cedulka", "Cedulka visí na okapu síně u mistra. Vpravo nad cedulí 名人."],
  ["bublinka", "Bublinka? U mistra, v hlavičce každé zkoušky. Průhledná, jak jinak."],
];

/** Její zkouška u mistra: Tvar 形, čtvrtá. Před ní radí (rada TVAR), po ní řekne své ke známce. */
export const mojeZkouska: { po: string } & Record<"yu" | "ryo" | "ka", Replika> = {
  po: "Řeknu ti, co říkám na tvůj tvar",
  yu: { text: "Shoda nad osmdesát pět procent. Tvar jako z mé dílny. Skoro.", vyraz: "usmev" },
  ryo: { text: "Dobré. Příště rovnější záda.", vyraz: "kouka" },
  ka: { text: "Prošlo to. Tvar si ale pamatuje každý pohyb.", vyraz: "klid" },
};

/** Když host najde kami (scripts/parta2/sber.ts pošle kami:nalezen) — její věta o něm, podle karty (Vztahy) */
export const kNalezu: Record<PostavaId, Replika> = {
  hlinka: { text: "Hlínka. Já taky byla hrouda — před sto lety.", vyraz: "usmev" },
  kapka: { text: "Kapka? Kapko, do vázy. Ne na kimono.", vyraz: "kouka" },
  pecinka: { text: "Pecinka. Potichu, prosím — podřimuje.", vyraz: "klid" },
  stripek: { text: "Střípek. Prý se nemám bát prasknout. Snadno se to říká se zlatem ve švech.", vyraz: "klid" },
  bublinka: { text: "Bublinka? Tu je potřeba vyhníst, ne sbírat.", vyraz: "prisna" },
  kachlik: { text: "Kachlík je rovný. Já stojím rovně. V tom je rozdíl.", vyraz: "mrk" },
  cedulka: { text: "Cedulka. Konečně někdo s pěkným písmem.", vyraz: "usmev" },
  samotka: { text: "Šamotko, děkuju. Někdo to říct musí.", vyraz: "usmev", gesto: "uklon" },
  vazicka: { text: "Tak mě máš. Schovávat se umím, ale nerada.", vyraz: "stydi" },
};

/**
 * Stopy v domě: jedna věta za stránku k tomu, co tam host kdy udělal —
 * jen kde k tomu stránka dává smysl. Řekne první, která platí.
 */
export const stopy: { kde: string[]; co: "futatsu" | "slepeno" | "uzliky" | "listek" | "darek"; replika: Replika }[] = [
  { kde: ["obchod-2", "futatsu"], co: "futatsu", replika: { text: "Futatsu v šátku. A já mám jenom květiny.", vyraz: "klid", gesto: "vlasy" } },
  { kde: ["nenalezeno"], co: "slepeno", replika: { text: "Střípek se chlubí, že mu někdo slepil číslo. Zlatem.", vyraz: "usmev" } },
  { kde: ["parta-2"], co: "uzliky", replika: { text: "Uzlík na provázku drží. Štěstí taky.", vyraz: "usmev" } },
  { kde: ["rezervace", "kontakt"], co: "listek", replika: { text: "Lístek ze svatyně si schovej. Na první návštěvu platí sleva.", vyraz: "mrk", gesto: "vejir" } },
  { kde: ["rezervace"], co: "darek", replika: { text: "Pro koho je ta jízdenka, neříkej. Hostitelka se neptá.", vyraz: "mrk" } },
];

/** Když host v hlavičce přepne na noc — vezme si lucernu (kresba ji nese, dokud je noc) */
export const naNoc: Replika = { text: "Tma? Vezmu si lucernu.", vyraz: "usmev" };

/** Když do uzlíku v její ruce poprvé za stránku doletí kus z krámku (šátek není vidět, nese ho za hosta) */
export const doSatku: Replika = { text: "Šátek ti podržím. Až ho budeš chtít zavázat, stačí klepnout na uzlík.", vyraz: "usmev", gesto: "uklon" };

/**
 * „Povím ti, co o tobě vím“ — poslední volba v nabídce na každé stránce.
 * Vyjmenuje jen to, co web opravdu má (pruvodce-host.ts), nic víc.
 */
export const coVim = {
  otazka: "Povím ti, co o tobě vím",
  /** Popisek bubliny vedle ní (ukáže se při najetí) */
  kratce: "Co o tobě vím",
  titul: "Vím jen tohle:",
  nicTitul: "Nic. Ani jméno.",
  nic: "Tak je to správně.",
  konec: "Víc nevím. A vědět nechci. Je to jen v tomhle prohlížeči a já to nikam neposílám.",
  zpet: "Zpátky",
};

/* ═══ Třetí kolo: co se děje teď (nic se neukládá, počítadla platí jen na stránce) ═══ */

/**
 * Rychlý scroll je vítr: poprvé si jen přidrží vlasy a přísně se podívá,
 * podruhé řekne první větu (etiketa), napotřetí druhou (sensei), dál už
 * jen pohled
 */
export const pomalu: [Replika, Replika] = [
  { text: "Pomalu, prosím. Tady se nikam nespěchá.", vyraz: "kouka" },
  { text: "Pomalu.", vyraz: "prisna" },
];

/** Kdo nabídku otevírá a zavírá pořád dokola: poprvé pohled, podruhé první věta, napotřetí druhá a na chvíli se otočí zády */
export const klepani: [Replika, Replika] = [
  { text: "Jednou stačí. Je mi přes sto let, ale slyším dobře.", vyraz: "kouka" },
  { text: "Hm.", vyraz: "prisna", gesto: "zady" },
];

/** Ticho: když se nic neděje, upraví si květy a ovívá se, po delší chvíli zadřímne — pohyb ji vyleká (řekne jednou za stránku) */
export const probuzeni: Replika = { text: "Ach. Nespala jsem, jen jsem zavřela oči.", vyraz: "stydi", gesto: "vlasy" };

/**
 * Co nosí ve vlasech: květy skutečného měsíce podle kalendáře hana-kanzashi
 * (MESICE ve scripts/vazicka-gejsa/spolecne.js), leden = 0
 */
export const veVlasech: { otazka: string; mesice: Replika[] } = {
  otazka: "Povím ti, co nosím ve vlasech",
  mesice: [
    { text: "V lednu nosí maiko borovici, na dlouhý život. Mně to zjevně funguje.", vyraz: "mrk" },
    { text: "V únoru švestkové květy. Kvetou, když je ještě zima — to se mi líbí.", vyraz: "usmev" },
    { text: "V březnu žlutou řepku. Jaro začíná u nás ve vlasech.", vyraz: "usmev" },
    { text: "V dubnu sakuru. Moje nejmilejší — ale to nikomu neříkej.", vyraz: "stydi" },
    { text: "V květnu vistárii. Visí dolů, ale záda mám rovně.", vyraz: "mrk" },
    { text: "V červnu hortenzii. Barvu jí dává hlína — o tom tu něco víme.", vyraz: "usmev" },
    { text: "V červenci malé vějíře. V Kjótu se slaví Gion.", vyraz: "usmev" },
    { text: "V srpnu svlačec. Ráno kvete, odpoledne spí. Chápu ho.", vyraz: "klid" },
    { text: "V září zvonky. Fialové jako večer nad dílnou.", vyraz: "kouka" },
    { text: "V říjnu nosí maiko chryzantémy. Tak je nosím i já.", vyraz: "usmev" },
    { text: "V listopadu javorové listí. Červené jako glazura, která se povedla.", vyraz: "mrk" },
    { text: "V prosinci mochibanu — rýžové kuličky na větvičce. Na konec roku štěstí.", vyraz: "usmev" },
  ],
};

/* ═══ Čtvrté kolo: hlas šamisenem, psaní štětcem, gesta (u replik výš) a povídání ═══ */

/**
 * „Popovídáme si?“ — vedlejší volba na každé stránce: co nosí ve vlasech
 * (`veVlasech`) a co si myslí o ostatních — o kami, které host už našel,
 * jejich věta z `kNalezu`, pokaždé o dalším
 */
export const povidani = {
  otazka: "Popovídáme si?",
  /** Popisek bubliny vedle ní (ukáže se při najetí) */
  kratce: "Popovídáme",
  titul: "Popovídáme, nebo si zahrajeme?",
  ostatni: "Povím ti, co si myslím o ostatních",
  nikoho: { text: "O ostatních? Nejdřív je najdi. Pak ti povím.", vyraz: "mrk" } as Replika,
};

/* ═══ Páté kolo: ozashiki — hra Tora-tora (scripts/parta2/ozashiki.ts) ═══ */

/** Kým se za zástěnou vyjde: válečník Watōnai, tygr, stařena (jeho máma) */
export type ToraKdo = "watonai" | "tora" | "roba";

/**
 * Tora-tora (虎拳), hra z ozashiki — gejši jí baví hosty. Kámen-nůžky-papír
 * za skládací zástěnou: válečník Watōnai (hrdina hry Kokusenja kassen, co
 * v bambusovém háji přemohl tygra) porazí tygra, tygr sní stařenu a stařena
 * srovná válečníka — je to jeho máma. Na tři výhry. Nic se neukládá.
 */
export const ozashiki: {
  otazka: string;
  titul: string;
  znak: string;
  /** Pod názvem, ať je hned jasné, o co jde */
  podtitul: string;
  /** `jako` — co je to v kámen-nůžky-papír: válečník přemůže tygra jako kámen nůžky, tygr sní stařenu jako nůžky papír */
  postavy: Record<ToraKdo, { jmeno: string; jako: string; znak: string; cteni: string }>;
  pravidla: Replika;
  zpev: string;
  /** Kdo koho a proč — klíč „vítěz-poražený“ */
  souboj: Record<string, string>;
  remiza: Record<ToraKdo, string>;
  tvojeKolo: string;
  mojeKolo: string;
  vyhralHost: Replika;
  vyhralaOna: Replika;
  /** Dvakrát ji porazil válečníkem, když se před tygrem ovívala — prokoukl ji */
  prokouknuta: Replika;
  znovu: string;
  dost: string;
  ty: string;
  ona: string;
  zavrit: string;
} = {
  otazka: "Zahrajeme si Tora-tora?",
  titul: "Tora-tora",
  znak: "虎拳",
  podtitul: "Kámen, nůžky, papír po japonsku",
  postavy: {
    watonai: { jmeno: "Válečník", jako: "kámen", znak: "和藤内", cteni: "Watōnai" },
    tora: { jmeno: "Tygr", jako: "nůžky", znak: "虎", cteni: "tora" },
    roba: { jmeno: "Stařena", jako: "papír", znak: "老婆", cteni: "rōba" },
  },
  pravidla: {
    text: "Za zástěnou si vyber, kým vyjdeš. Válečník přemůže tygra, tygr sní stařenu, stařena srovná válečníka. Na tři výhry.",
    vyraz: "mrk",
    gesto: "vejir",
  },
  zpev: "To-ra, to-ra…",
  souboj: {
    "watonai-tora": "Válečník přemohl tygra — jako v divadle.",
    "tora-roba": "Tygr sežral stařenu. Chudinka.",
    "roba-watonai": "Stařena srovnala válečníka. Mámu se poslouchá.",
  },
  remiza: {
    watonai: "Dva válečníci. Aiko — znovu.",
    tora: "Dva tygři. Aiko — znovu.",
    roba: "Dvě stařeny. Aiko — znovu.",
  },
  tvojeKolo: "Tvoje kolo.",
  mojeKolo: "Moje kolo.",
  vyhralHost: { text: "Tři výhry. Tak to jsem prohrála ráda — klaním se.", vyraz: "usmev", gesto: "uklon" },
  vyhralaOna: { text: "Tři moje. Ozashiki je moje řemeslo. Příště ti dám náskok.", vyraz: "mrk", gesto: "vejir" },
  prokouknuta: { text: "Ty mi koukáš na vějíř, viď? Tak dost, už se neovívám.", vyraz: "stydi" },
  znovu: "Ještě jednou",
  dost: "Děkuju, stačí",
  ty: "Ty",
  ona: "Vázička",
  zavrit: "Zavřít hru",
};

/**
 * Poznámka k tomu, co je zrovna na obrazovce (aspoň z půlky vidět): jedna
 * za stránku a jako stopy jen když nikomu nepřekáží — sama od sebe
 * nejvýš věta za 90 s
 */
export const naObrazovce: { kde: string; cil: string; replika: Replika }[] = [
  { kde: "dilna", cil: "#cena-nadpis", replika: { text: "Psst. Ceník. O penězích se nahlas nemluví.", vyraz: "mrk" } },
  { kde: "obchod-2", cil: "#podpis-nazev", replika: { text: "Podpisový šálek. Hezký. My starší kusy se podepisovat nemusely.", vyraz: "klid", gesto: "ovivani" } },
  { kde: "kontakt", cil: "#kudy-nadpis", replika: { text: "Zelený dům, nemůžeš minout.", vyraz: "usmev", gesto: "vejir" } },
  { kde: "zkouska", cil: '[data-pole="tvar"]', replika: { text: "Čtvrté pole je moje. Tvar.", vyraz: "usmev" } },
];

const REZERVACE: Rada = {
  otazka: "Ukážu ti, kde se zamlouvá hodina",
  cil: "nav:/rezervace",
  veta: "Tudy, prosím — Rezervace. Poprvé zavolej, ať tě můžeme uvést; pak už si zamlouváš rovnou.",
  vMenu: "Rezervace se skrývá tady v menu. Poprvé zavolej, ať tě můžeme uvést.",
  vyraz: "usmev",
};
const KONTAKT: Rada = {
  otazka: "Doprovodím tě až ke dveřím",
  cil: "nav:/kontakt",
  veta: "V Kontaktu je adresa, telefon i cesta ke dveřím. Zelený dům, nemůžeš minout.",
  vMenu: "Kontakt je tady v menu. Zelený dům, nemůžeš minout.",
  vyraz: "usmev",
};

/** Tajemství o hře na hledání kami — věta se mění podle toho, kolik jich host našel (`kamiPostup`) */
const KAMI: Rada = {
  otazka: "Prozradím ti jedno tajemství",
  cil: "[data-zaves] > svg",
  veta: kamiPostup.nic.text,
  vyraz: "mrk",
  efekt: "zaves",
  druh: "kami",
};
/** Kde se schovává někdo, koho host ještě nemá (`skryse`); když má všech devět, nenabídne se */
const NAPOVEDA: Rada = {
  otazka: "Prozradím, kde se někdo schovává",
  cil: "[data-zaves] > svg",
  veta: "",
  vyraz: "mrk",
  efekt: "zaves",
  druh: "napoveda",
};
/** Její zkouška na desce u mistra; po ní se z rady stane `mojeZkouska` */
const TVAR: Rada = {
  otazka: "Poradím ti s mou zkouškou",
  cil: '[data-pole="tvar"]',
  veta: "Čtvrtá zkouška je moje. Obtahuj od patky nahoru a nespěchej.",
  vyraz: "kouka",
  druh: "tvar",
};

export const rady: Record<string, Rada[]> = {
  vychozi: [
    REZERVACE,
    {
      otazka: "Prozradím, kolik to stojí",
      cil: "nav:/dilna",
      veta: "O penězích se nahlas nemluví… ale ceník visí na Dílně. Čím víc vás u stolu, tím levněji.",
      vMenu: "O penězích se nahlas nemluví… ceník je na Dílně, tady v menu. Čím víc vás, tím levněji.",
      vyraz: "mrk",
    },
    KONTAKT,
  ],
  "domek-2": [REZERVACE, KAMI, KONTAKT],
  "parta-2": [KAMI, NAPOVEDA, REZERVACE],
  "parta-3": [KAMI, NAPOVEDA, REZERVACE],
  zkouska: [TVAR, KAMI, NAPOVEDA],
  dilna: [
    { otazka: "Prozradím, kolik to stojí", cil: "#cena-nadpis", veta: "Tady visí ceník. Čím víc lidí u stolu, tím míň platí každý. A kafe? To je samozřejmost.", vyraz: "usmev" },
    REZERVACE,
    KONTAKT,
  ],
  rezervace: [
    { otazka: "Pomůžu ti vybrat hodinu", cil: "#rz-pokladna-nadpis", veta: "Nejdřív kolik vás pojede, pak den. Na tabuli vedle klepni na volnou hodinu — a sedni si rovně.", vyraz: "kouka" },
    { otazka: "Prozradím, jak se dostat dovnitř", cil: ".rz-clen-tel", veta: "Stačí zavolat a nadiktovat e-mail. Pak už tě uvádět nemusím — zamlouváš si rovnou.", vyraz: "usmev" },
    { otazka: "Poradím, čím někoho obdarovat", cil: "#rz-darky-nadpis", veta: "Dárkové jízdenky. Jméno se píše rovnou na ně — krasopisně, prosím.", vyraz: "mrk" },
  ],
  kontakt: [
    { otazka: "Dám ti na nás číslo", cil: ".ko-cislo", veta: "Tohle. Telefon bere Cedulka — a tudy dostaneš i přístup k rezervacím.", vyraz: "usmev" },
    { otazka: "Ukážu ti, na co se lidi ptají", cil: "#ko-ot-nadpis", veta: "Stojan ema. Sundej si destičku a otoč ji — odpověď je na rubu.", vyraz: "kouka" },
    { otazka: "Doprovodím tě až ke dveřím", cil: "#ko-kudy-nadpis", veta: "Bránou, po rampě dolů, dveře vlevo od oken. A záda rovně, je to z kopce.", vyraz: "kouka" },
  ],
  /* krámek (/obchod) — Futatsu v tokonomě: žárlí elegantně */
  "obchod-2": [
    { otazka: "Ukážu ti, co se rodí u nás v dílně", cil: "#tvorba-nadpis", veta: "Kusy z naší pece. Každý je trochu jiný — v tom je ta krása.", vyraz: "usmev" },
    { otazka: "Provedu tě kusy z Japonska", cil: "#japonsko-nadpis", veta: "Tyhle přijely z Japonska. Prohlížej pomalu, ruce u těla.", vyraz: "kouka" },
    { otazka: "Uvedu tě do zadní místnosti", cil: "#podpis-nadpis", veta: "V tokonomě vždycky stávala váza. Teď tam sedí šálek. Hezký, to se musí nechat.", vyraz: "klid" },
  ],
  futatsu: [
    { otazka: "Ukážu ti, z jakého výkresu je", cil: "#vykres-nadpis", veta: "Jeho výkres. Profil jako podle pravítka — kdo ho kreslil, seděl rovně.", vyraz: "kouka" },
    { otazka: "Provedu tě ohněm", cil: "#ohen-nadpis", veta: "Tady prošel pecí. Já kdysi taky — odtud ty praskliny. Kannyū.", vyraz: "klid" },
    { otazka: "Ukážu ti, jak ho zabalit", cil: "#satek-nadpis", veta: "Šátek a uzel. Zavazuje se pomalu, prosím — dárek si to zaslouží.", vyraz: "usmev" },
  ],
  "o-nas-2": [
    { otazka: "Povím ti, jak to všechno začalo", cil: "#pocatek-nadpis", veta: "Vodovodní havárií. Kapka to dodnes bere jako svou zásluhu.", vyraz: "mrk" },
    { otazka: "Představím ti oba lektory", cil: "#rukopisy-nadpis", veta: "Dva lektoři, dva rukopisy. Já bych je poznala i poslepu — podle tahu.", vyraz: "usmev" },
    { otazka: "Ukážu ti, proč se nebát chyby", cil: "#kintsugi-nadpis", veta: "Prý se nemám bát prasknout. Snadno se to říká, když už máš ve švech zlato.", vyraz: "stydi" },
  ],
  papirna: [
    { otazka: "Ukážu ti, kde si nás vystřihneš", cil: "#pa-listy-nadpis", veta: "Pět listů A4. Stříhej pomalu a po čáře — nůžky od těla, prosím.", vyraz: "kouka" },
    KAMI,
    REZERVACE,
  ],
  svatyne: [
    { otazka: "Uvedu tě ke svatyni", cil: "#sv-nadpis", veta: "Za devět kami jeden poklad. Před svatyní se ukloň — lehce, záda rovně.", vyraz: "klid" },
    { otazka: "Ukážu ti tvůj lístek", cil: "#sv-losovani-nadpis", veta: "Jeden lístek, jen pro tebe. Co na něm stojí, zůstane mezi námi.", vyraz: "mrk" },
    NAPOVEDA,
  ],
  /* 404: rozbitá stránka — Střípek je na rozbité věci hrdý */
  nenalezeno: [
    { otazka: "Povím ti, co s rozbitou stránkou", cil: "#nn-nadpis", veta: "Rozbitá stránka. Střípek by řekl, že je to začátek něčeho hezčího.", vyraz: "klid" },
    REZERVACE,
    KONTAKT,
  ],
};
