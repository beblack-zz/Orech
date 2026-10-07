import type { PostavaId } from "./parta";
import { rezervace } from "./rezervace";
import { glazury } from "./kurzy2";

/**
 * Dílna — /dilna. Co se v dílně dá dělat (placat, točit, glazovat), jak
 * hodina v dílně chodí, co je v ceně a kdy se dá bez lektora.
 *
 * Kdy a za kolik se NEbere odsud: dny, hodiny, cena za člověka a hodinu
 * a velikost skupiny jsou v rezervace.ts, ať Dílna i Rezervace říkají
 * totéž. Glazury jsou ty z kurzy2.ts (kruh nanečisto, kusy v obchodě) —
 * tady k nim přibyla jen jejich syrová podoba.
 *
 * Co je v ceně kromě lektora a kafe (hlína, nástroje, glazury, výpal), je
 * převzaté ze starého ceníku open studia. Když se to změní, stačí upravit
 * `vCene` níž.
 */

const cena = rezervace.cena.toLocaleString("cs-CZ");
const DNY = ["neděle", "pondělí", "úterý", "středa", "čtvrtek", "pátek", "sobota"];
const VE = ["", "jednom", "dvou", "třech", "čtyřech", "pěti", "šesti", "sedmi", "osmi"];
const dny = rezervace.dny.map((d) => DNY[d]);

/** Kdy a za kolik — z rezervace.ts, aby Dílna a Rezervace říkaly totéž */
export const kdy = {
  /** „úterý a pátek“ */
  dny: dny.length > 1 ? `${dny.slice(0, -1).join(", ")} a ${dny[dny.length - 1]}` : dny[0],
  hodiny: `${rezervace.od}–${rezervace.do}`,
  cena: `${cena} Kč`,
  zaCo: "za člověka a hodinu",
  /** „sám, nebo až ve čtyřech“ */
  skupina: `sám, nebo až ve ${VE[rezervace.maxOsob] ?? rezervace.maxOsob}`,
};

/* ——— Co se tu dělá ——— */

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
  techniky: { nazev: string; text: string }[];
  /** S čím pomůže lektor */
  lektor: string;
  /** Kdo z party k tomu patří */
  kdo: PostavaId;
}

export const cinnosti: Cinnost[] = [
  {
    id: "placat",
    znak: "手",
    japonsky: "手びねり",
    cteni: "tebineri",
    nazev: "Placat",
    podtitul: "Modelování v ruce",
    text: "Bez kruhu — jen ruce, válek a pár nástrojů. Z hroudy se dá vymačkat miska, vyválet plát a z plátu poskládat hrnek, talíř nebo kachel. Placat jde od první minuty a nikdy to neomrzí.",
    techniky: [
      { nazev: "Mačkaná miska", text: "Palec do hroudy a pomalu dokola. Nejstarší hrnčířská technika, jakou lidi znají." },
      { nazev: "Z válečků", text: "Hlína se vyválí do provázků a ty se vrší na sebe. Tak rostou velké nádoby i sochy." },
      { nazev: "Z plátů", text: "Válkem mezi dvěma lištami vznikne plát, který je všude stejně tlustý. Pak se krájí podle šablony a slepuje." },
      { nazev: "Podle předlohy i volně", text: "Přineseš obrázek, nebo necháš ruce, ať si dělají, co chtějí." },
    ],
    lektor: "Ukáže, jak spojit dva kusy, aby v peci nepraskly: rozrýt, potřít šlikrem, přitlačit.",
    kdo: "hlinka",
  },
  {
    id: "tocit",
    znak: "轆",
    japonsky: "轆轤",
    cteni: "rokuro",
    nazev: "Točit",
    podtitul: "Na kruhu",
    text: "Tři kruhy, na každém hlína, voda a ty. Vycentrovat, otevřít, vytáhnout, vytvarovat — a když se to povede, odříznout drátem. Napoprvé to většinou spadne. To k tomu patří.",
    techniky: [
      { nazev: "Centrování", text: "Hlína musí běžet přesně na středu, jinak se rozkmitá. Nejtěžší krok — proto je u toho lektor." },
      { nazev: "Otevření a vytahování", text: "Palce do středu, pak prsty po stěně nahoru. Z hroudy roste válec." },
      { nazev: "Tvarování", text: "Z válce miska, hrnek nebo váza. Rozhoduje, kde zatlačíš zevnitř a kde zvenku." },
      { nazev: "Obrábění", text: "Až kus zavadne, očkem se mu vytočí patka a srovná dno. Na to se přijde podruhé." },
    ],
    lektor: "Posadí tě rovně, pohlídá vodu a otáčky a s centrováním pomůže vlastníma rukama.",
    kdo: "vazicka",
  },
  {
    id: "glazovat",
    znak: "釉",
    japonsky: "釉薬",
    cteni: "yūyaku",
    nazev: "Glazovat",
    podtitul: "Barva a lesk",
    text: "Když kus projde prvním výpalem, dostane glazuru. Namáčí se, polévá nebo maluje štětcem — a syrová vypadá úplně jinak než po výpalu. Kdo glazuje poprvé, nevěří. Pak se otevře pec.",
    techniky: [
      { nazev: "Namáčení", text: "Kus se na tři vteřiny ponoří do kbelíku. Vrstva je pak všude stejná." },
      { nazev: "Polévání a štětec", text: "Na velké kusy, na malbu, na kapky a přechody." },
      { nazev: "Vrstvení", text: "Dvě glazury přes sebe. Kde se potkají, vznikne třetí barva." },
      { nazev: "Čisté dno", text: "Na dně glazura být nesmí — v peci by se kus přilepil k polici." },
    ],
    lektor: "Poradí, která glazura se s kterou snese, a pohlídá, aby vrstva nebyla moc tlustá.",
    kdo: "kapka",
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

/* ——— Jak to chodí ——— */

/** Podoba kusu u kroku — podle ní se kreslí kus na polici vedle */
export type StavKusu = "hrouda" | "mokry" | "suchy" | "prezah" | "glazovany" | "hotovy";

export const kroky: { nazev: string; text: string; stav: StavKusu; kdo: PostavaId; odkaz?: { href: string; text: string } }[] = [
  {
    nazev: "Zamluv si hodinu",
    text: `Každé ${kdy.dny}, ${kdy.hodiny} hodin. Hodina se zamlouvá celá — přijdeš ${kdy.skupina}.`,
    stav: "hrouda",
    kdo: "cedulka",
    odkaz: { href: "/rezervace", text: "Vybrat hodinu" },
  },
  { nazev: "Přijď, jak jsi", text: "Zástěru, hlínu i nástroje máme. Vezmi si oblečení, které se může ušpinit.", stav: "hrouda", kdo: "hlinka" },
  { nazev: "Tvoř", text: "Placat, točit, nebo glazovat, co už prošlo prvním výpalem. S lektorem, nebo bez.", stav: "mokry", kdo: "vazicka" },
  { nazev: "Podepiš se a nech to schnout", text: "Rydlem do dna — tužka by v peci shořela. Kus pak pomalu schne na polici.", stav: "suchy", kdo: "kachlik" },
  { nazev: "Přežah", text: "První výpal. Z hlíny je střep, který už se ve vodě nerozmočí.", stav: "prezah", kdo: "samotka" },
  { nazev: "Glazuj", text: "Na některé z dalších hodin kus namočíš do glazury. Syrová je bledá a matná.", stav: "glazovany", kdo: "kapka" },
  { nazev: "Ostrý výpal", text: "Kolem 1 280 °C se glazura roztaví ve sklo. Pak pec celou noc chladne.", stav: "hotovy", kdo: "pecinka" },
  { nazev: "Vyzvedni si ho", text: "Od hroudy po hotový kus to trvá 2–3 týdny. Dáme vědět, až bude hotovo.", stav: "hotovy", kdo: "stripek" },
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
  "Hodinu si zamluv předem — na Rezervaci, mailem nebo telefonem.",
  "Po sobě ukliď: hlínu ze stolu, nástroje na místo.",
  "Hotové kusy podepiš a nech na polici k sušení.",
  "Na kruh bez lektora jen se základy.",
];

/** Odpovědi říká někdo z party. Část je z Kurzů 2 (kurzy2.ts), zbytek je o dílně. */
export const otazky: { q: string; a: string; kdo: PostavaId }[] = [
  { q: "Musím něco umět?", a: "Nemusíš. Lektor je v ceně hodiny a provede tě vším od první hroudy.", kdo: "vazicka" },
  { q: "Můžu přijít s kamarády?", a: `Jasně. Hodina se zamlouvá celá — přijď ${kdy.skupina}. Platí se za každého.`, kdo: "samotka" },
  { q: "A když lektora nechci?", a: "Pak je to open studio — dílna je tvoje. Jen na kruh bez lektora je potřeba mít základy.", kdo: "stripek" },
  { q: "Co si mám vzít s sebou?", a: "Nic — zástěru, hlínu i nástroje máme tady. Přijď v oblečení, které se může ušpinit.", kdo: "hlinka" },
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
 * Tajná glazura za celou desku zkoušek. V dílně ji nemáme — je jen tady,
 * jako odměna, a jmenuje se po stromu, po kterém má jméno vesnice.
 */
export const orechova = { nazev: "ořechová", svetlo: "#C8925A", stred: "#7A4E2C", stin: "#3E2616", skvrny: "#E8C35A" };

/* ——— Zkoušky glazur (sbírka) ———
 *
 * Šest zkušebních střípků, jeden od každé glazury, schovaných po stránce.
 * Kdo najde všechny, má celou desku zkoušek — a v kbelících přibude
 * ořechová glazura. Pamatuje si to prohlížeč (klíč dilna-zkousky).
 */
export const zkousky: { id: string; skrys: string }[] = [
  { id: "celadon", skrys: "Leží na parapetu výlohy. Tam, kde je nejvíc světla." },
  { id: "shino", skrys: "Na stole, kde se placá. Zapadla pod plátno." },
  { id: "popelová šedá", skrys: "U kruhu, hned vedle kyblíku s vodou." },
  { id: "tenmoku", skrys: "Za kbelíky s glazurou. Kapka ví, za kterým." },
  { id: "železitá hnědá", skrys: "Na cestě kusu — tam, kde se pálí přežah." },
  { id: "matná bílá", skrys: "V kuchyňce. Někdo ji opřel o kávovar." },
];

/** Glazura podle názvu i s ořechovou — pro kreslení kusu */
export const glazuraPodleNazvu = (nazev: string) =>
  nazev === orechova.nazev ? orechova : glazury.find((g) => g.nazev === nazev);
