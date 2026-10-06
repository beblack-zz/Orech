import type { PostavaId } from "./parta";

/**
 * Doplňky pro /uvod-2. Termíny, zboží, parta, poukaz a otázky se berou
 * z jejich vlastních souborů (kurzy.ts, obchod.ts, parta.ts, kami.ts,
 * kurzy2.ts). Tady je jen to, co zatím žádný datový soubor nemá: texty
 * a ceny ze stávajících stránek a to, co přidává nový úvod — zastavení
 * prohlídky a razítka.
 *
 * Pozor: texty ze starých stránek jsou tu jako kopie (stejně jako otázky
 * a částky poukazu v kurzy2.ts). U každého bloku je napsané, odkud je —
 * když se tam změní cena nebo text, musí se změnit i tady.
 */

/** Z patičky starého webu (components/Footer.astro). */
export const kontakt = {
  email: "ahoj@jirosaku.cz",
  telefon: "+420 777 000 000",
  telefonOdkaz: "+420777000000",
  ulice: "Luční 235",
  psc: "252 25",
  obec: "Ořech",
};

/** Odkaz na mapu podle adresy — souřadnice nikde nemáme, tak se hledá. */
export const mapa = `https://mapy.cz/zakladni?q=${encodeURIComponent(`${kontakt.ulice}, ${kontakt.psc} ${kontakt.obec}`)}`;

/** Z karet Nabídky na dnešním úvodu (components/Nabidka.astro). */
export const nabidka = {
  kurzy: {
    rozsah: "1–10 lekcí",
    text: "Vícedenní cykly pro začátečníky i pokročilé. Kruh, technika, glazování.",
  },
  openStudio: {
    rozsah: "na hodiny",
    text: "Máte čas pro sebe a chtěli byste ho strávit kreativně? Dílna slouží i jako otevřený prostor, kde si své tvoření řídíte sami.",
  },
  workshopy: {
    rozsah: "hodiny či dny",
    text: "Jednorázové zážitkové kurzy. Ideální jako dárek nebo příležitost pro Vaše soukromé akce — teambuildingy, narozeniny, rozlučky se svobodou, zážitkový víkend či den…",
  },
  obchod: {
    rozsah: "keramika s sebou",
    text: "Výrobky od nás i českých a zahraničních keramiků. Malé série a originální kousky.",
  },
};

/** Ze stránky Open studio (pages/open-studio.astro). */
export const openStudio = {
  cenik: [
    { nazev: "Modelování", cena: "300 Kč", popis: "Stůl, hlína a nástroje. Cena je za 90 minut, glazování v ceně." },
    { nazev: "Točení na kruhu", cena: "400 Kč", popis: "Kruh jen pro tebe. Cena je za 90 minut, glazování v ceně." },
    {
      nazev: "Měsíční členství",
      cena: "1 900 Kč / měs",
      popis: "Neomezený přístup v otevíracích hodinách open studia. Hlína, glazury, výpal — vše v ceně.",
      mesicni: true,
    },
  ],
  platnost: "Ceny platí pro říjen 2026",
  pravidla: [
    "Rezervuj si slot předem — kapacita je 6 lidí na směnu",
    "Základní znalost kruhu je podmínka (absolvovaný kurz u nás nebo jinde)",
  ],
};

/** Ze stránky Kurzy (pages/kurzy.astro) — sekce Dárkový poukaz. */
export const poukazText =
  "Poukaz platí na jakýkoli kurz, workshop i open studio — obdarovaný si vybere sám. Platnost 12 měsíců. Vytiskneme ho na papír, nebo pošleme v PDF.";

/** Ze stránky O nás (pages/o-nas.astro) a z bloku O dílně na dnešním úvodu. */
export const oDilne = {
  zacatek:
    "Začínáme v roce 2026 s jednou pecí, dvěma stoly, třemi kruhy a spoustou nadšení. Malá dílna v Ořechu, kde má hlína čas a každá chyba svůj tvar.",
  pristup:
    "Náš přístup je jednoduchý — méně dokonalosti, víc radosti. Nemusíš umět nic, nemusíš plánovat, co vyrobíš. Sedneš si ke kruhu, začneš točit a dál to už půjde samo.",
  lektori: "Kurzy vedou dva lektoři, každý s vlastním rukopisem.",
  vitani: "Všichni jste vítáni",
  kafe: "Stavíme i na kafe.",
};

/** Ze stránky O nás — tým. Jména jsou tak, jak je mají termíny v kurzy.ts. */
export const lide: { jmeno: string; role: string; kde: string; bio: string }[] = [
  {
    jmeno: "Jiřík",
    role: "Zakladatel · lektor",
    kde: "u kruhu",
    bio: "Keramika má v jeho srdci vypálený hodně velký prostor. Skoro každá volná chvíle patří práci okolo dílny, čtení článků a knih o keramice a nakoukávání hrnčířských videí. Jeho výtvarná duše je v dílně k ruce všem nadšencům pro hlínu, když zrovna neroztáčí kruh…",
  },
  {
    jmeno: "Renča",
    role: "Zakladatelka · lektorka",
    kde: "u pece",
    bio: "Lásku ke keramice si nese od prvních kroužků na základní škole. A jak plynul čas, láska ke keramice a Jiříkovo místo v srdci daly vzniknout malé dílně v Ořechu. Je k ruce obsahu webových stránek, příběhům a feedu na Instagramu a komunikaci se vznikající hliněnou partou…",
  },
];

/**
 * Milníky ze stránky O nás („Tak jde čas…“). `m` je číslo měsíce v roce
 * 2026 — podle něj se v kresbě dílny objevuje, co tehdy přibylo.
 */
export const milniky: { m: number; mesic: string; text: string }[] = [
  { m: 2, mesic: "Únor", text: "rekonstrukce garáže po vodovodní havárii" },
  { m: 3, mesic: "Březen", text: "vyléváme podlahu, malujeme stěny, bouráme zeď a stavíme výlohu" },
  { m: 4, mesic: "Duben", text: "stěhujeme do dílny kruhy, montujeme stoly z kanceláře" },
  { m: 5, mesic: "Květen", text: "přivádíme vodovodní a odpadní trubky a sestavujeme skříňky" },
  { m: 6, mesic: "Červen", text: "všechno se nám táhne, a tak na prosby rozjíždíme Instagram a sdílíme alespoň pokroky v dílně" },
  { m: 7, mesic: "Červenec", text: "necháváme udělat revizi elektřiny, instalujeme zásuvky a děláme místo pro novou pec" },
  { m: 8, mesic: "Srpen", text: "nakupujeme hlínu, testujeme glazury, vypalujeme první várku výtvorů" },
  { m: 9, mesic: "Září", text: "nestíháme rozjet kurzy s novým školním rokem, ale vítáme nové tváře na dnech otevřených dveří" },
];

/** Z karty „Co již proběhlo“ na dnešním úvodu (components/Nabidka.astro). */
export const denOtevrenychDveri = {
  nazev: "Den otevřených dveří",
  terminy: ["4. 9.", "11. 9.", "18. 9.", "25. 9."],
};

/* ——— Razítka ———
 *
 * Prohlídka dílny jako „stamp rally“: u každého zastavení se dá něco
 * udělat a za to je razítko do sešitu. Dvě jsou zadarmo — vstupní (projít
 * norenem) a výstupní (zůstat do noci). Sešit si pamatuje prohlížeč.
 */

export type RazitkoId = "brana" | "kruh" | "stul" | "pec" | "police" | "poukaz" | "pauza" | "odjezdy" | "noc";

export interface Razitko {
  id: RazitkoId;
  /** Znak uprostřed otisku */
  znak: string;
  nazev: string;
  /** Co pro razítko udělat — stojí v sešitě, dokud chybí */
  ukol: string;
  /** Kdo z party u razítka stojí — jeho barva je v otisku */
  kdo: PostavaId;
}

export const razitka: Razitko[] = [
  { id: "brana", znak: "門", nazev: "Brána", ukol: "Projít norenem do dílny.", kdo: "kachlik" },
  { id: "kruh", znak: "轆", nazev: "Kruh", ukol: "Roztočit kruh.", kdo: "vazicka" },
  { id: "stul", znak: "机", nazev: "Stůl", ukol: "Prohníst hroudu na stole.", kdo: "hlinka" },
  { id: "pec", znak: "窯", nazev: "Pec", ukol: "Vypálit pec a otevřít ji.", kdo: "pecinka" },
  { id: "police", znak: "棚", nazev: "Police", ukol: "Vzít něco z police.", kdo: "stripek" },
  { id: "poukaz", znak: "贈", nazev: "Poukaz", ukol: "Otočit poukaz na nástěnce.", kdo: "cedulka" },
  { id: "pauza", znak: "茶", nazev: "Pauza", ukol: "Postavit na kafe.", kdo: "kapka" },
  { id: "odjezdy", znak: "発", nazev: "Odjezdy", ukol: "Přepnout tabuli s odjezdy.", kdo: "kachlik" },
  { id: "noc", znak: "夜", nazev: "Noc", ukol: "Zůstat v dílně do noci.", kdo: "bublinka" },
];

/** Klíče, pod kterými si sbírky pamatují ostatní stránky nového vzhledu. */
export const jineSbirky = [
  { klic: "parta2-nalezeni", celkem: 9, kde: "Parta 2", co: "schovaných kami", href: "/parta-2" },
  { klic: "kurzy2-naradi", celkem: 6, kde: "Kurzy 2", co: "kusů ztraceného nářadí", href: "/kurzy-2" },
];

/* ——— Roční období ——— */

export type Sezona = "zima" | "predjari" | "jaro" | "leto" | "podzim";

/** Jak vypadá Ořech v daném měsíci (1–12): holé stromy, kvetoucí sakura, žlutý ořech… */
export const sezonaMesice = (m: number): Sezona =>
  m === 12 || m <= 2 ? "zima" : m === 3 ? "predjari" : m === 4 ? "jaro" : m <= 8 ? "leto" : "podzim";
