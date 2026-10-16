import type { PostavaId } from "./parta";
import { rezervace, cenaZaCloveka, rozpetiJizdneho, tarifSlovy, detskaSlovy } from "./rezervace";

/**
 * Dílna — /dilna. Informační stránka: jak to v dílně chodí (hodina,
 * lektor, nebo open studio, cesta od rezervace po vyzvednutí, cena,
 * pravidla) a jak se dělá keramika (hlína, tvar, sušení, přežah,
 * glazura, ostrý výpal, otevření pece), k tomu slovníček a otázky.
 *
 * Kdy a za kolik se NEbere odsud: dny, hodiny, cena za člověka a hodinu
 * a velikost skupiny jsou v rezervace.ts, ať Dílna i Rezervace říkají
 * totéž. Glazury jsou ty z kurzy2.ts — tady k nim přibyla jen jejich
 * syrová podoba.
 *
 * Teploty a proměny v peci jsou tytéž jako na Partě 2 (kami.ts — krivka
 * a milniky). Co je obecná keramická znalost (druhy hlíny, šamot, smrštění
 * zhruba o desetinu, žároměrky), je psané obecně, ne jako slib dílny.
 * Délky jednotlivých kroků schválně nikde nejsou — dílna slibuje jen celek,
 * 2–3 týdny.
 *
 * Co je v ceně kromě lektora a kafe (hlína, nástroje, glazury, výpal), je
 * převzaté ze starého ceníku open studia. Když se to změní, stačí upravit
 * `vCene` níž.
 */

const kc = (n: number) => n.toLocaleString("cs-CZ");
const DNY = ["neděle", "pondělí", "úterý", "středa", "čtvrtek", "pátek", "sobota"];
const VE = ["", "jednom", "dvou", "třech", "čtyřech", "pěti", "šesti", "sedmi", "osmi"];
const dny = rezervace.dny.map((d) => DNY[d]);

/** Kdy a za kolik — z rezervace.ts, aby Dílna a Rezervace říkaly totéž */
export const kdy = {
  /** „úterý a pátek“ */
  dny: dny.length > 1 ? `${dny.slice(0, -1).join(", ")} a ${dny[dny.length - 1]}` : dny[0],
  hodiny: `${rezervace.od}–${rezervace.do}`,
  /** Jízdné je skupinové (rezervace.ts): „400–500 Kč“ */
  cena: `${kc(rozpetiJizdneho.od)}–${kc(rozpetiJizdneho.do)} Kč`,
  /** Kolik platí, kdo přijde sám, a kolik každý ve čtyřech */
  cenaSam: `${kc(cenaZaCloveka(1))} Kč`,
  cenaOd: `${kc(rozpetiJizdneho.od)} Kč`,
  zaCo: "za člověka a hodinu",
  /** „1 člověk 500 Kč, 2 lidi 450, 3 lidi 425 a 4 lidi 400 Kč za každého“ — podle toho, kolik lidí v dílně nakonec je */
  tarif: tarifSlovy(),
  /** „dětská jízdenka do 10 let je o 100 Kč levnější“ */
  deti: detskaSlovy,
  /** Kolik míst je v dílně na jednu hodinu */
  mist: rezervace.mist,
  /** Kolik minut má „hodina“ v dílně — tolik, kolik jeden odjezd na Rezervaci */
  minut: Math.round(rezervace.blok * 60),
  /** „sám, nebo až ve čtyřech“ */
  skupina: `sám, nebo až ve ${VE[rezervace.maxOsob] ?? rezervace.maxOsob}`,
};

/* ——— Co se dá v hodině dělat ———
 *
 * Názvy bere i Rezervace (jízdní řád a dárkové jízdenky).
 */

export type CinnostId = "placat" | "tocit" | "glazovat";

export interface Cinnost {
  id: CinnostId;
  /** Znak štětcem: 手 ruka, 轆 kruh, 釉 glazura */
  znak: string;
  /** Jak se tomu říká japonsky — malým písmem vedle */
  japonsky: string;
  cteni: string;
  nazev: string;
  podtitul: string;
  text: string;
  /** Co z toho bývá */
  vysledek: string;
  /** Kapitola stránky, kde je to podrobně */
  kam: string;
  /** S čím pomůže lektor */
  lektor: string;
}

export const cinnosti: Cinnost[] = [
  {
    id: "placat",
    znak: "手",
    japonsky: "手びねり",
    cteni: "tebineri",
    nazev: "Placat",
    podtitul: "modelování v ruce",
    text: "Bez kruhu — jen ruce, válek a pár nástrojů. Placat jde od první minuty a nikdy to neomrzí.",
    vysledek: "miska, talíř, hrnek z plátu, kachel, cokoli, co tě napadne",
    kam: "#tvar",
    lektor: "Ukáže, jak spojit dva kusy, aby v peci nepraskly: rozrýt, potřít šlikrem, přitlačit.",
  },
  {
    id: "tocit",
    znak: "轆",
    japonsky: "轆轤",
    cteni: "rokuro",
    nazev: "Točit",
    podtitul: "na kruhu",
    text: "Tři kruhy, na každém hlína, voda a ty. Napoprvé to většinou spadne. To k tomu patří.",
    vysledek: "miska, hrnek, pohárek, váza",
    kam: "#tvar",
    lektor: "Posadí tě rovně, pohlídá vodu a otáčky a s centrováním pomůže vlastníma rukama.",
  },
  {
    id: "glazovat",
    znak: "釉",
    japonsky: "釉薬",
    cteni: "yūyaku",
    nazev: "Glazovat",
    podtitul: "barva a lesk",
    text: "Co už prošlo prvním výpalem, dostane glazuru. Syrová vypadá úplně jinak než po výpalu.",
    vysledek: "tvůj kus z minula v jedné ze šesti glazur dílny",
    kam: "#glazura",
    lektor: "Poradí, která glazura se s kterou snese, a pohlídá, aby vrstva nebyla moc tlustá.",
  },
];

/* ——— S lektorem, nebo sám ——— */

export const lektor = {
  s: [
    "Ukáže ti, jak na to, od první hroudy.",
    "Na kruhu pomůže s centrováním — s tím nejtěžším.",
    "Poradí s glazurou a s tím, co se v peci snese.",
    "Hodí se, když začínáš, nebo se chceš naučit něco nového.",
  ],
  bez: [
    "Dílna je tvoje a nikdo ti nekouká pod ruce.",
    "Lektor tu nemusí být vůbec — je v ceně, ne v povinnosti.",
    "Na kruh bez lektora jen se základy: z kurzu u nás nebo odjinud.",
    "Hodí se, když víš, co chceš, a chceš na to klid.",
  ],
};

/* ——— Od rezervace po vyzvednutí ———
 *
 * Dvě dráhy: co děláš ty (přijdeš) a co se mezitím děje v dílně.
 * `stav` je podoba kusu u kroku — kreslí ji components/dilna/kresba/nadoba.ts.
 */

/** Podoba kusu, jak ji kreslí components/dilna/kus.ts (U mistra) */
export type StavKusu = "hrouda" | "mokry" | "suchy" | "prezah" | "glazovany" | "hotovy";

export interface KrokNavstevy {
  kdo: "ty" | "dilna";
  nazev: string;
  text: string;
  stav: "hrouda" | "mokry" | "kozeny" | "suchy" | "prezah" | "syrova" | "hotovy";
  /** Jen někdy (obrábění — jen kusy z kruhu) */
  jenNekdy?: string;
  odkaz?: { href: string; text: string };
}

export const navsteva: KrokNavstevy[] = [
  {
    kdo: "ty",
    nazev: "Zamluvíš si hodinu",
    text: `Každé ${kdy.dny}, ${kdy.hodiny} hodin. Na hodinu jsou v dílně ${kdy.mist} místa — přijdeš ${kdy.skupina}.`,
    stav: "hrouda",
    odkaz: { href: "/rezervace", text: "Vybrat hodinu" },
  },
  {
    kdo: "ty",
    nazev: "Přijdeš a tvoříš",
    text: "Zástěru, hlínu i nástroje máme. Placat, nebo točit, s lektorem, nebo bez. Nakonec se podepíšeš rydlem do dna.",
    stav: "mokry",
  },
  { kdo: "dilna", nazev: "Kus schne", text: "Pomalu a přikrytý, na polici v dílně.", stav: "kozeny" },
  {
    kdo: "ty",
    nazev: "Obrobíš patku",
    text: "Až kus zavadne, očkem se mu vytočí patka a srovná dno.",
    stav: "kozeny",
    jenNekdy: "jen kusy z kruhu",
  },
  { kdo: "dilna", nazev: "Přežah", text: "První výpal. Z hlíny je střep, který se ve vodě už nerozmočí.", stav: "prezah" },
  { kdo: "ty", nazev: "Glazuješ", text: "Na některé z dalších hodin. Barvu ukáže až pec.", stav: "syrova" },
  { kdo: "dilna", nazev: "Ostrý výpal", text: "Na 1 280 °C, pak pec celou noc chladne.", stav: "hotovy" },
  { kdo: "ty", nazev: "Vyzvedneš si ho", text: "Dáme vědět, až bude hotovo.", stav: "hotovy" },
];

/** Celek, který dílna slibuje — jednotlivé kroky schválně bez délek */
export const celkem = "2–3 týdny";

/* ——— Jak se dělá keramika ——— */

export type KapitolaId = "hlina" | "tvar" | "suseni" | "prezah" | "glazura" | "vypal" | "hotovo";

export interface Kapitola {
  id: KapitolaId;
  /** Pořadí — japonská číslice */
  cislo: string;
  /** Velký znak štětcem za papírem */
  znak: string;
  japonsky: string;
  cteni: string;
  nazev: string;
  podtitul: string;
  /** Kdo to dělá: ty (na hodině), nebo dílna (mezi tvými hodinami) */
  kdo: { ty?: string; dilna?: string };
  odstavce: string[];
  /** Pár čísel a slov, které stojí za zapamatování */
  fakta: { hodnota: string; popis: string }[];
  /** Kdo z party k tomu má co říct */
  tip: { kdo: PostavaId; text: string };
  /** Hodina na obloze — kapitoly jdou přes den do noci a k ránu */
  hodina: number;
}

export const kapitoly: Kapitola[] = [
  {
    id: "hlina",
    cislo: "一",
    znak: "土",
    japonsky: "土",
    cteni: "tsuchi",
    nazev: "Hlína",
    podtitul: "odkud se bere a proč se hněte",
    kdo: {},
    odstavce: [
      "Keramická hlína je jemná zemina, která se ve vodě dá tvarovat a v ohni se promění v kámen. Kupuje se v pytlích, vlhká a připravená — jako kvádr, ze kterého se drátem krájí hroudy.",
      "Hlíny se liší hlavně tím, kolik žáru snesou. Hrnčířská zůstane po výpalu pórovitá, kamenina při vysoké teplotě slinuje a vodu nepropustí, porcelán je nejjemnější a nejbělejší. V dílně se ostře pálí na 1 280 °C — na to musí být hlína stavěná. Obyčejná hrnčířská by se při té teplotě zkroutila a začala tát.",
      "Do hlíny se často přidává šamot — rozemletá pálená hlína. Hmotu zpevní a pomůže jí přežít sušení i výpal bez prasknutí.",
      "Než jde hlína na kruh, musí se prohníst. Je pak všude stejně vlhká a hlavně bez bublin vzduchu: bublina s kapkou vody se v peci promění v páru a kus roztrhne. V Japonsku se hněte do tvaru květu chryzantémy — říká se tomu kiku-neri.",
    ],
    fakta: [
      { hodnota: "1 280 °C", popis: "na tolik se v dílně pálí — snese to kamenina i porcelán" },
      { hodnota: "kiku-neri", popis: "hnětení do květu chryzantémy, 菊練り" },
      { hodnota: "200 °C", popis: "kolem téhle teploty bouchne bublina, která v hlíně zůstala" },
    ],
    tip: { kdo: "bublinka", text: "Kdo špatně vyhnětl, uslyší kolem dvou set stupňů ránu. To jsem já. Promiň. Vlastně ne." },
    hodina: 13.4,
  },
  {
    id: "tvar",
    cislo: "二",
    znak: "形",
    japonsky: "形",
    cteni: "katachi",
    nazev: "Tvar",
    podtitul: "v ruce, nebo na kruhu",
    kdo: { ty: "s lektorem, nebo sám" },
    odstavce: [
      "Tvar dělá každý sám — s lektorem, nebo bez. Vedou k němu dvě cesty a obě se dají v dílně zkusit hned napoprvé.",
      "V ruce se modeluje bez kruhu: z hroudy se vymačká miska, z válečků vyroste nádoba, z plátu se poskládá hrnek, talíř nebo kachel. Válek jede po dvou lištách, takže plát je všude stejně tlustý.",
      "Na kruhu se hlína nejdřív vycentruje, pak otevře, vytáhne do válce a vytvaruje. Hotový kus se od hlavy kruhu odřízne drátem. Kus z kruhu se ještě jednou vrací — až zavadne, obrobí se mu patka.",
      "Dva kusy se spojují jen tak, aby v peci nepovolily: obě plochy se rozryjí, potřou šlikrem — hlínou rozmíchanou ve vodě — a přitlačí.",
    ],
    fakta: [
      { hodnota: "6 mm", popis: "tloušťka plátu — tolik mají lišty, po kterých jede válek" },
      { hodnota: "3 kruhy", popis: "na každém hlína, voda a ty" },
      { hodnota: "šlikr", popis: "hlína rozmíchaná ve vodě — lepí ucha i spoje" },
    ],
    tip: { kdo: "vazicka", text: "Lokty k tělu, záda rovně. A dýchat — na to se na kruhu často zapomíná." },
    hodina: 14.8,
  },
  {
    id: "suseni",
    cislo: "三",
    znak: "乾",
    japonsky: "乾燥",
    cteni: "kansō",
    nazev: "Sušení",
    podtitul: "pomalu a přikrytý",
    kdo: { dilna: "suší ho pomalu na polici", ty: "obrobíš ho a podepíšeš" },
    odstavce: [
      "Mokrý kus schne na polici pomalu a přikrytý fólií. Kraje a ucho schnou rychleji než zbytek — kdyby se to uspěchalo, kus by se zkroutil nebo praskl.",
      "Nejdřív dojde do kožené tvrdosti: drží tvar, ale ještě se dá řezat. Teď se obrábí patka, lepí ucho a kus se podepisuje — rydlem do dna, protože tužka by v peci shořela.",
      "Pak schne dál, až zbledne. Suchý kus je křehký jako sušenka a ve vodě by se zase rozmočil. Teprve takový smí do pece.",
      "Hlína cestou ztrácí vodu a smršťuje se — při sušení i ve výpalu. Hotový kus bývá zhruba o desetinu menší než mokrý, proto se točí o kousek větší.",
    ],
    fakta: [
      { hodnota: "≈ 10 %", popis: "o tolik se kus zmenší, než je hotový" },
      { hodnota: "rydlem", popis: "podpis do dna — tužka by v peci shořela" },
      { hodnota: "kožená tvrdost", popis: "drží tvar, dá se řezat — čas na patku a ucho" },
    ],
    tip: { kdo: "kachlik", text: "Kroutit se při sušení je pod mou úroveň. Proto se talíře obracejí a nic se neuspěchá." },
    hodina: 16.3,
  },
  {
    id: "prezah",
    cislo: "四",
    znak: "素",
    japonsky: "素焼",
    cteni: "suyaki",
    nazev: "Přežah",
    podtitul: "první výpal, kolem 950 °C",
    kdo: { dilna: "pálí se mezi tvými hodinami" },
    odstavce: [
      "Suché kusy jdou poprvé do pece. Ta se plní shora a skládá se jako hlavolam — na šamotové police, patro po patru. Při přežahu se kusy smějí dotýkat a stát i v sobě, glazura na nich ještě není.",
      "Teplota stoupá pomalu. Pod stovkou se čeká, dokud z hlíny neodejde poslední voda. Kolem 573 °C křemen v hlíně najednou změní objem a kolem 650 °C odchází i voda vázaná chemicky. Od té chvíle je to keramika — ve vodě se už nikdy nerozmočí.",
      "Kolem 950 °C přežah končí. Z hlíny je střep: pevný, ale pórovitý, a glazuru nasaje jako houba. Proto se glazuje až teď.",
    ],
    fakta: [
      { hodnota: "950 °C", popis: "tady přežah končí" },
      { hodnota: "573 °C", popis: "křemenný skok — kdo tu spěchá, má prasklinu" },
      { hodnota: "pórovitý", popis: "střep po přežahu nasaje glazuru jako houba" },
    ],
    tip: { kdo: "samotka", text: "Tisíc stupňů zespodu, cizí misky shora. Normální den. Zvládnu to." },
    hodina: 17.8,
  },
  {
    id: "glazura",
    cislo: "五",
    znak: "釉",
    japonsky: "釉薬",
    cteni: "yūyaku",
    nazev: "Glazura",
    podtitul: "tenká vrstva skla",
    kdo: { ty: "na některé z dalších hodin" },
    odstavce: [
      "Glazura je sklo, které se teprve udělá. Ve kbelíku je to jemně namletý kámen, popel a kovové oxidy ve vodě. Na kusu zaschne do bledé křídové vrstvy a sklem se stane až v peci.",
      "Glazovat se přichází na některou z dalších hodin, až kus projde přežahem. Namáčí se, polévá nebo maluje štětcem — a dvě glazury přes sebe dají třetí barvu tam, kde se potkají.",
      "Syrová glazura vypadá úplně jinak než po výpalu: celadon je šedavá křída, tenmoku béžová. Kdo glazuje poprvé, nevěří. Pak se otevře pec.",
      "Na dně glazura být nesmí. Patka se otře houbičkou dočista — v peci by se kus k polici přilepil.",
    ],
    fakta: [
      { hodnota: "6 glazur", popis: "celadon, tenmoku, shino, matná bílá, popelová šedá a železitá hnědá" },
      { hodnota: "3 vteřiny", popis: "tak dlouho se kus namáčí — vrstva je pak všude stejná" },
      { hodnota: "čisté dno", popis: "jinak se kus v peci přilepí k polici" },
    ],
    tip: { kdo: "kapka", text: "Nejradši mám všechno, co se leskne. Ale na dně glazura být nesmí — to vím i já." },
    hodina: 19.2,
  },
  {
    id: "vypal",
    cislo: "六",
    znak: "火",
    japonsky: "本焼",
    cteni: "honyaki",
    nazev: "Ostrý výpal",
    podtitul: "celý den nahoru, celou noc dolů",
    kdo: { dilna: "pálí se přes den, chladne přes noc" },
    odstavce: [
      "Kusy s glazurou jdou do pece podruhé. Tentokrát se nesmějí dotýkat — glazura se roztaví a slepila by je k sobě i k polici.",
      "Teplota stoupá skoro celý den. Hlína prochází proměnami, které se nedají uspěchat, a kolem 1 240 °C se glazura taví ve sklo. Nahoře, na 1 280 °C, se pec chvíli drží, ať se glazura rozleje a uhladí.",
      "Jak daleko výpal došel, ukazují žároměrky — malé kužely z keramické hmoty, které se při své teplotě ohnou. Měří víc než teploměr, protože počítají i s časem.",
      "Pak pec celou noc chladne. Otevírá se až ráno.",
    ],
    fakta: [
      { hodnota: "1 280 °C", popis: "vrchol ostrého výpalu" },
      { hodnota: "1 240 °C", popis: "glazura se taví ve sklo" },
      { hodnota: "žároměrky", popis: "ohnou se, až je dopáleno" },
    ],
    tip: { kdo: "pecinka", text: "Neotvírej mě. Ještě ne. Ještě ne. Ještě… ne." },
    hodina: 22.6,
  },
  {
    id: "hotovo",
    cislo: "七",
    znak: "窯",
    japonsky: "窯出し",
    cteni: "kamadashi",
    nazev: "Otevření pece",
    podtitul: "ráno je hotovo",
    kdo: { ty: "vyzvedneš si ho, dáme vědět" },
    odstavce: [
      "Ráno, až pec vychladne, se otevře víko. Moc brzo to nejde — prudká změna teploty by kusům mohla prasknout pod rukama.",
      "Glazura je teď sklo: lesklá, nebo matná, podle toho, jaká měla být. Hlína je slinutá a tvrdá jako kámen. A kus je o kus menší než ten, který odešel z kruhu.",
      "Od hroudy po hotový kus to trvá 2–3 týdny. Dáme vědět, až bude k vyzvednutí.",
      "Občas něco praskne — v peci se nic neschová. Ani to ale není konec: v Japonsku se střepy slepují lakem a spára se zasype zlatem. Říká se tomu kintsugi a prasklina se pak stane tou nejhezčí částí.",
    ],
    fakta: [
      { hodnota: "2–3 týdny", popis: "od hroudy po hotový kus" },
      { hodnota: "kintsugi", popis: "spára zalitá zlatem, 金継ぎ" },
    ],
    tip: { kdo: "stripek", text: "Rozbít něco není konec světa. Je to začátek kintsugi." },
    hodina: 29.6,
  },
];

/** Šest kroků na kruhu — popisky pod snímky v kapitole Tvar */
export const naKruhu: { nazev: string; text: string }[] = [
  { nazev: "Centrování", text: "Hlína musí běžet přesně na středu, jinak se rozkmitá. Nejtěžší krok — proto je u toho lektor." },
  { nazev: "Otevření", text: "Palce do středu: vznikne dno a první stěna." },
  { nazev: "Vytažení", text: "Prsty po stěně nahoru. Z hroudy roste válec." },
  { nazev: "Tvarování", text: "Zevnitř ven, nebo zvenku dovnitř. Žebro uhladí stěnu." },
  { nazev: "Odříznutí", text: "Drát pod patou a kus jde na prkno schnout." },
  { nazev: "Obrábění", text: "Až zavadne: dnem vzhůru a očkem vytočit patku. Na to se přijde podruhé." },
];

/** Modelování v ruce — tři vinětky v kapitole Tvar */
export const vRuce: { id: "mackana" | "valecky" | "platy"; nazev: string; text: string }[] = [
  { id: "mackana", nazev: "Mačkaná miska", text: "Palec do hroudy a pomalu dokola. Nejstarší hrnčířská technika, jakou lidi znají." },
  { id: "valecky", nazev: "Z válečků", text: "Hlína se vyválí do provázků a ty se vrší na sebe. Tak rostou velké nádoby i sochy." },
  { id: "platy", nazev: "Z plátů", text: "Plát se vyválí mezi lištami, pak se krájí podle šablony a slepuje." },
];

/** Druhy hlíny — pod destičkami v kapitole Hlína */
export const druhyHliny: { nazev: string; teplota: string; text: string }[] = [
  { nazev: "Hrnčířská", teplota: "do 1 100 °C", text: "cihlová, po výpalu pórovitá" },
  { nazev: "Kamenina", teplota: "1 200–1 300 °C", text: "slinutá, vodu nepropustí" },
  { nazev: "Porcelán", teplota: "1 250–1 400 °C", text: "bílý, v tenké vrstvě prosvítá" },
];

/** Jak se glazuje — kartičky v kapitole Glazura */
export const glazovani: { nazev: string; text: string }[] = [
  { nazev: "Namáčení", text: "Na tři vteřiny do kbelíku. Vrstva je pak všude stejná." },
  { nazev: "Polévání a štětec", text: "Na velké kusy, na malbu, na kapky a přechody." },
  { nazev: "Vrstvení", text: "Dvě glazury přes sebe. Kde se potkají, vznikne třetí barva." },
  { nazev: "Čisté dno", text: "Houbičkou dočista. Jinak se kus v peci přilepí k polici." },
];

/** Japonská jména glazur dílny, které je mají */
export const glazuraJaponsky: Record<string, { znak: string; cteni: string }> = {
  celadon: { znak: "青磁", cteni: "seiji" },
  tenmoku: { znak: "天目", cteni: "tenmoku" },
  shino: { znak: "志野", cteni: "shino" },
};

/* ——— Slovníček ——— */

export interface Heslo {
  heslo: string;
  japonsky?: string;
  text: string;
}

export const slovnicek: { skupina: string; hesla: Heslo[] }[] = [
  {
    skupina: "Hlína a tvar",
    hesla: [
      { heslo: "Šamot", text: "Rozemletá pálená hlína. Přidává se do hmoty, aby líp snesla sušení a výpal. Ze šamotu jsou i police v peci." },
      { heslo: "Kiku-neri", japonsky: "菊練り", text: "Hnětení do tvaru květu chryzantémy. Vyžene z hlíny vzduch." },
      { heslo: "Šlikr", text: "Hlína rozmíchaná ve vodě na hustou kaši. Lepí ucha a spoje." },
      { heslo: "Centrování", text: "Dostat hroudu přesně doprostřed kruhu. Nejtěžší krok točení." },
      { heslo: "Žebro", text: "Plochá šablona ze dřeva nebo kovu. Tvaruje a hladí stěnu na kruhu." },
      { heslo: "Očko", text: "Drátěná smyčka na rukojeti. Obrábí se jím patka." },
      { heslo: "Patka", text: "Spodek kusu, na kterém stojí. Po obrábění je z ní prstenec." },
    ],
  },
  {
    skupina: "Sušení a pec",
    hesla: [
      { heslo: "Kožená tvrdost", text: "Kus drží tvar, ale ještě se dá řezat a lepit. Čas na patku a ucho." },
      { heslo: "Rydlo", text: "Hrot na psaní do hlíny. Podpis rydlem přežije výpal, tužka ne." },
      { heslo: "Přežah", japonsky: "素焼", text: "První výpal, kolem 950 °C. Z hlíny udělá pevný, ale pórovitý střep." },
      { heslo: "Střep", text: "Vypálená hlína. A taky to, co zbyde, když se něco rozbije." },
      { heslo: "Ostrý výpal", japonsky: "本焼", text: "Druhý výpal, v dílně na 1 280 °C. Glazura se roztaví a hlína slinuje." },
      { heslo: "Slinutí", text: "Hlína se při vysoké teplotě zpevní tak, že už nepropustí vodu." },
      { heslo: "Žároměrka", text: "Malý kužel z keramické hmoty, který se při své teplotě ohne. Ukazuje, jak daleko výpal došel." },
    ],
  },
  {
    skupina: "Glazura a potom",
    hesla: [
      { heslo: "Glazura", japonsky: "釉薬", text: "Sklovitá vrstva na povrchu. Ve kbelíku kaše, po výpalu sklo." },
      { heslo: "Celadon", japonsky: "青磁", text: "Zelenavá průsvitná glazura. Barvu jí dává trocha železa." },
      { heslo: "Tenmoku", japonsky: "天目", text: "Tmavá, skoro černá glazura, na hranách do rezava. Taky ze železa." },
      { heslo: "Shino", japonsky: "志野", text: "Bílá až oranžová glazura z živce, původem z Japonska." },
      { heslo: "Kannyū", japonsky: "貫入", text: "Jemná síť prasklinek v glazuře. Vzniká při chladnutí, klidně až po letech." },
      { heslo: "Kintsugi", japonsky: "金継ぎ", text: "Oprava rozbitého kusu lakem a zlatem. Prasklina se neschovává." },
    ],
  },
];

/* ——— Co je v ceně ——— */

export const vCene: { co: string; pozn: string }[] = [
  { co: "Lektor", pozn: "když chceš. Když ne, je to open studio." },
  { co: "Hlína", pozn: "na to, co za hodinu uděláš." },
  { co: "Nástroje a zástěra", pozn: "válek, očka, jehly, houbičky, drát." },
  { co: "Glazury a výpal", pozn: "přežah i ostrý výpal." },
  { co: "Kafe", pozn: "samozřejmost." },
];

/* ——— Pravidla a otázky ——— */

export const pravidla = [
  "Hodinu si zamluv předem na Rezervaci. Poprvé zavolej — nadiktuješ e-mail a pošleme ti přístup.",
  "Po sobě ukliď: hlínu ze stolu, nástroje na místo.",
  "Hotové kusy podepiš a nech na polici k sušení.",
  "Na kruh bez lektora jen se základy.",
];

/** Odpovědi říká někdo z party. Část je z Kurzů 2 (kurzy2.ts), zbytek je o dílně. Ukazuje je Kontakt (components/kontakt/Otazky.astro). */
export const otazky: { q: string; a: string; kdo: PostavaId }[] = [
  { q: "Musím něco umět?", a: "Nemusíš. Lektor je v ceně hodiny a provede tě vším od první hroudy.", kdo: "vazicka" },
  { q: "Můžu přijít s kamarády?", a: `Jasně — čím víc lidí v dílně, tím míň platí každý: ${kdy.tarif}. Na hodinu jsou v dílně ${kdy.mist} místa a platí se na místě.`, kdo: "samotka" },
  { q: "A když někdo nepřijde?", a: "Počítá se, kolik vás v dílně opravdu je. Platí se až na místě, takže když se zamluví čtyři a dorazí tři, platí každý jako ve třech. Jen dej vědět, ať místo může dostat někdo jiný.", kdo: "kachlik" },
  { q: "A můžu vzít dítě?", a: `Můžeš. Sedí s vámi jako každý a ${kdy.deti}.`, kdo: "kapka" },
  { q: "A když lektora nechci?", a: "Pak je to open studio — dílna je tvoje. Jen na kruh bez lektora je potřeba mít základy.", kdo: "stripek" },
  { q: "Co si mám vzít s sebou?", a: "Nic — zástěru, hlínu i nástroje máme tady. Přijď v oblečení, které se může ušpinit.", kdo: "hlinka" },
  { q: "Proč musím přijít ještě jednou?", a: "Glazuje se až po prvním výpalu a kus z kruhu se ještě obrábí, když zavadne. Obojí je na některé z dalších hodin.", kdo: "cedulka" },
  { q: "Kdy si to odnesu?", a: "Sušení a dva výpaly trvají 2–3 týdny. Dáme ti vědět, až bude k vyzvednutí.", kdo: "pecinka" },
  { q: "Je kafe v ceně?", a: "Samozřejmě. Já jsem tu stejně kvůli vodě.", kdo: "kapka" },
];

/* ——— Glazury ——— */

/**
 * Syrová glazura — jak vypadá na kusu před výpalem: bledá, křídová, matná.
 * Po výpalu má barvy z kurzy2.ts. Klíč je název glazury z kurzy2.ts.
 */
export const syrova: Record<string, string> = {
  celadon: "#DCE2DA",
  tenmoku: "#B6A08C",
  shino: "#F3EDE3",
  "matná bílá": "#F6F3EC",
  "popelová šedá": "#D6D2C9",
  "železitá hnědá": "#CDAE96",
  "ořechová": "#C9B49E",
};

/** Glazury, které se lesknou — matné po výpalu odlesk nedostanou */
export const matne = new Set(["matná bílá", "popelová šedá"]);

/**
 * Ořechová glazura byla odměna za hru se zkouškami glazur, která už na
 * webu není. Kreslit ji pořád umí components/dilna/kus.ts.
 */
export const orechova = { nazev: "ořechová", svetlo: "#C8925A", stred: "#7A4E2C", stin: "#3E2616", skvrny: "#E8C35A" };
