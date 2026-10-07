import type { PostavaId } from "./parta";
import { kdy } from "./dilna";
import { rezervace } from "./rezervace";
import { kontakt } from "./uvod2";

/**
 * Domek 2 — /domek-2. Dům a dílna nakreslené podle skutečných fotek
 * (images/Dilna a fotoorech), aby šly porovnat s kresbami na Úvodu 2
 * a Partě 2. Texty o tom, co kde stojí, jsou odečtené z fotek; kdy
 * a za kolik se bere z rezervace.ts a dilna.ts, adresa z uvod2.ts.
 *
 * Co z fotek vyčíst nejde a je tu odhadem (ať se to dá snadno opravit):
 *   — že stromek na trávníku je převislá sakura (podle listů a kůry),
 *   — že brána je posuvná (zámek má u pilíře, dole kolečko na pojezdu),
 *   — že kruhy jsou dva kopací a jeden elektrický,
 *   — rozměry dílny (asi 5,4 × 7,8 m).
 */

/** Hlášení obecního rozhlasu z lampy před domem — skládá se z otevírací doby */
export const hlaseni = {
  uvod: "Vážení spoluobčané, dovolujeme si vás upozornit:",
  text: `keramická dílna v ${kontakt.ulice} má otevřeno každé ${kdy.dny} od ${rezervace.od} do ${rezervace.do} hodin. Hodina v dílně stojí ${kdy.cena} za člověka, lektor je v ceně a kafe je samozřejmost.`,
  zaver: "Děkujeme za pozornost.",
};

/* ——— Prohlídka: zastávky od oken dozadu ——— */

export type ZastavkaId = "prehled" | "kruhy" | "stoly" | "pec" | "regal" | "voda" | "kafe";

export interface Foto {
  /** Soubor ve images/Dilna nebo fotoorech (importuje komponenta) */
  soubor: string;
  alt: string;
  popis: string;
  /** Kde je na fotce to podstatné (object-position) */
  kde?: string;
}

export interface Zastavka {
  id: ZastavkaId;
  znak: string;
  nazev: string;
  titulek: string;
  meta: string;
  text: string;
  foto: Foto;
}

export const zastavky: Zastavka[] = [
  {
    id: "prehled",
    znak: "工",
    nazev: "Dílna",
    titulek: "Pod domem, kde bývala garáž.",
    meta: "suterén zeleného domu v Luční",
    text: "Dílna je v suterénu. Z garáže zbyla rampa z ulice a výška stropu — vrata nahradila velká okna na dvorek, takže je tu přes den světlo a v létě stín pod balkonem.",
    foto: { soubor: "6679", alt: "Dílna zevnitř směrem k oknům: oválný stůl s modrými židlemi, za okny dlažba rampy a brána", popis: "Od zadní stěny k oknům — doopravdy.", kde: "50% 62%" },
  },
  {
    id: "kruhy",
    znak: "轆",
    nazev: "Kruhy",
    titulek: "Tři kruhy u oken",
    meta: "dva kopací a jeden elektrický",
    text: "Kopací kruh se roztáčí nohou: dole je těžký dřevěný setrvačník a ten drží otáčky. Rám je natřený nalososovo a sedí se na hnědém sedátku. Elektrický kruh má bílou vaničku na vodu a pedál.",
    foto: { soubor: "fotodilna", alt: "Kopací kruh s dřevěným setrvačníkem a hlavou na závitové hřídeli, za ním nerezová pec", popis: "Kopací kruh — setrvačník je z masivu.", kde: "90% 78%" },
  },
  {
    id: "stoly",
    znak: "机",
    nazev: "Stoly",
    titulek: "Stoly z kanceláře",
    meta: "oválný, překližkový a modré židle",
    text: "Oválný stůl a modré židle přijely v dubnu z jedné kanceláře. Na stole bývá točna, váleček, lišty na tloušťku plátu a zelená podložka, ať se hlína nelepí. Na překližce drží svěrky to, co zrovna schne.",
    foto: { soubor: "6677", alt: "Stůl z překližky s oranžovými svěrkami a stojánkem se štětci, modré židle a vpředu oválný stůl s tyrkysovou točnou", popis: "Točna, váleček a lišty na plát.", kde: "40% 80%" },
  },
  {
    id: "pec",
    znak: "窯",
    nazev: "Pec",
    titulek: "Pec, co se plní shora",
    meta: "nerezová, elektrická, u oken",
    text: "Víko se odklopí nahoru a kusy se skládají dovnitř na šamotové desky do pater. Pálí se dvakrát: nejdřív přežah, pak ostrý výpal s glazurou. Za pecí je bílý plech, ať zeď nedostane horko.",
    foto: { soubor: "fotodilna", alt: "Nerezová pec s odklopeným víkem a regulátorem na boku", popis: "Víko nahoře, uvnitř šamotové desky.", kde: "82% 45%" },
  },
  {
    id: "regal",
    znak: "棚",
    nazev: "Regál",
    titulek: "Regál na celou stěnu",
    meta: "černé lišty a prkna z překližky",
    text: "Kusy tu schnou, než půjdou do pece, a po výpalu čekají, až si pro ně přijdeš. Prkna jdou přendat do jakékoli výšky — proto každé visí jinde. Hotové kusy z obchodu stojí uprostřed.",
    foto: { soubor: "6677", alt: "Stěna s černými lištami a prkny z překližky, na nich schnoucí kusy, stojací lampa a šedá přepravka", popis: "Prkna jsou, kde je zrovna potřeba.", kde: "50% 55%" },
  },
  {
    id: "voda",
    znak: "水",
    nazev: "Dřez",
    titulek: "Dřez a voda na hlínu",
    meta: "linka s dřezem u západní stěny",
    text: "Bez vody se netočí. U dřezu se myjí ruce, houbičky, točny a kbelíky. Nad ním je skříňka s knihami o keramice, Japonsku a čaji a na drátěných policích misky, které se povedly.",
    foto: { soubor: "6685", alt: "Antracitová linka s dřezem a dubovou deskou, nad ní skříňka s knihami a drátěné police se zelenými kusy", popis: "Dřez, kbelíky a houbičky.", kde: "50% 55%" },
  },
  {
    id: "kafe",
    znak: "茶",
    nazev: "Kafe",
    titulek: "Všichni jste vítáni",
    meta: "kávovar, glazury, knihovnička",
    text: "Na lince u zadní stěny stojí kávovar a ve skříňce nad ním lahvičky glazur. Vedle je knihovnička. Šedé dveře za zídkou vedou do domu — tam už dílna končí.",
    foto: { soubor: "6675", alt: "Linka s kávovarem, ve skříňce nad ní lahvičky glazur, nahoře kusy keramiky a vpravo knihovnička", popis: "Kávovar a glazury nad ním.", kde: "50% 50%" },
  },
];

/* ——— Klíče: sbírka Domku 2 ———
 *
 * Po stránce leží sedm klíčů — od brány, od lodžie, od dílny, od pece…
 * Na klíčích jsou barevné čepičky, jak to doma bývá, ať se nepletou.
 * Obsluhuje je obecná sbírka (scripts/parta2/sbirka.ts).
 */
export type KlicId = "brana" | "balkon" | "dilna" | "pec" | "skrinka" | "dvere" | "garaz";

export interface Klic {
  id: KlicId;
  nazev: string;
  /** Barva čepičky */
  cepicka: string;
  /** Kde hledat, dokud chybí */
  napoveda: string;
  /** Co je na štítku, když už visí na háčku */
  stitek: string;
}

export const klice: Klic[] = [
  { id: "brana", nazev: "Od brány", cepicka: "#3F7FB8", napoveda: "Visí u zámku brány, hned vedle čísla domu.", stitek: "Brána se posouvá doleva, za zídku." },
  { id: "balkon", nazev: "Od lodžie", cepicka: "#6E9A4B", napoveda: "Někdo ho schoval do květináče na balkoně.", stitek: "Lodžie nad dílnou — tam se nechodí." },
  { id: "dilna", nazev: "Od dílny", cepicka: "#C4432B", napoveda: "Pod truhlíkem s vřesem. Kde jinde.", stitek: "Prosklené dveře vlevo od oken." },
  { id: "pec", nazev: "Od pece", cepicka: "#E2702E", napoveda: "Regulátor pece se zamyká. Klíček bývá na něm.", stitek: "Bez něj pec nepojede." },
  { id: "skrinka", nazev: "Od glazur", cepicka: "#E8B440", napoveda: "Na drátěné polici vedle skříňky s glazurami.", stitek: "Skříňka nad kávovarem." },
  { id: "dvere", nazev: "Od domu", cepicka: "#8A8F94", napoveda: "Na dřevěné desce zídky u šedých dveří.", stitek: "Ten nepůjčujeme. Tam se bydlí." },
  { id: "garaz", nazev: "Od garáže", cepicka: "#7A5A3E", napoveda: "V únoru ležel v kaluži. Zkus rok dílny.", stitek: "Už nic neodemyká. Garáž je dílna." },
];

/* ——— Kresba a fotka ——— */

export const porovnani = {
  ulice: { soubor: "6670", alt: "Zelený dům se štítem do ulice, dva balkony s mátovým zábradlím, posuvná brána a lampa s rozhlasem", popis: "Z protějšího chodníku" },
  zahrada: { soubor: "6669", alt: "Mladá převislá sakura na tyčce, za ní okna dílny pod balkonem a truhlíky s vřesem na šikmé desce", popis: "Z trávníku u sakury" },
};

/** Sakura u dílny během roku — pro přepínač u kresby zahrady */
export const sezonySakury: { id: "jaro" | "leto" | "podzim" | "zima"; nazev: string; text: string }[] = [
  { id: "jaro", nazev: "Jaro", text: "V dubnu kvete — převislé větve jsou celé růžové." },
  { id: "leto", nazev: "Léto", text: "Přes léto je zelená a dělá trávníku kousek stínu." },
  { id: "podzim", nazev: "Podzim", text: "V říjnu zrudne a listí padá do trávy." },
  { id: "zima", nazev: "Zima", text: "V zimě jsou vidět jen tenké větve a tyčka, ke které je přivázaná." },
];

/** Kdo z party kde na stránce bydlí — jen pro přehled v komentářích a testech */
export const partaNaStrance: Record<string, PostavaId[]> = {
  ulice: ["kapka", "bublinka", "kachlik"],
  prohlidka: ["vazicka", "hlinka", "bublinka", "pecinka", "samotka", "stripek", "cedulka", "kapka", "kachlik"],
  zahrada: ["hlinka", "kapka"],
};
