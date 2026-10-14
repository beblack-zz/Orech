import type { PostavaId } from "./parta";

/**
 * Rezervace času v dílně — /rezervace.
 *
 * Termíny jsou každé úterý a pátek od 9 do 18, na měsíc dopředu. Den je
 * rozdělený na odjezdy po hodině a půl (`blok`): 9:00, 10:30, 12:00…
 * Odjezd je buď volný, nebo obsazený: zamlouvá se celý, pro jednoho
 * člověka nebo skupinu až čtyř lidí — žádná místa se nepočítají.
 * Cena je za člověka a „hodinu“ — tou je jeden odjezd, 90 minut (`cenaOdjezdu`).
 *
 * Vedle hodin jsou tu dvě věci, kde se místa počítají: kurz, který zabere
 * celý den (`kurzy`), a permanentka na první a poslední spoj dne
 * (`permanentka`). Obojí je níž.
 *
 * Co je zamluvené, je v Supabase (supabase/schema.sql) a stránka si to bere
 * z /api/volno; rezervovat rovnou smí jen pozvaní členové, ostatní píšou
 * mail. Dokud klíče k Supabase nejsou nastavené, je obsazenost SIMULOVANÁ
 * (scripts/rezervace/simulace.ts) a rezervace se posílá mailem. Stejná
 * čísla hlídá i server (src/lib/rezervace/pravidla.ts).
 */
export const rezervace = {
  /** Dny v týdnu podle Date.getDay(): 2 = úterý, 5 = pátek */
  dny: [2, 5],
  /** Od kdy do kdy je otevřeno — poslední odjezd je 16:30–18:00 */
  od: 9,
  do: 18,
  /** Jak dlouho trvá jeden odjezd, v hodinách. Stejně dlouhé jsou i úseky mezi zastávkami zvláštního vlaku (kurzu). */
  blok: 1.5,
  /** Cena za jednoho člověka a „hodinu“ — jeden odjezd, 90 minut (tu říká i Dílna) */
  cena: 400,
  /** Největší skupina, která si může hodinu zamluvit */
  maxOsob: 4,
  /** Kolik dní dopředu se dá rezervovat */
  dniDopredu: 31,
  /** Den, kdy jezdí zvláštní vlaky (kurzy): 6 = sobota. Hodinové spoje ten den nejedou. */
  denKurzu: 6,
  /** Kolik zvláštních vlaků bývá nejvýš vypsaných naráz — tolik karet má jejich přepážka v pokladně */
  kurzuNaraz: 2,
  /** Kolik hodin před začátkem jde jízdenka ještě zrušit přes web. ODHAD — čeká na potvrzení. */
  zrusitHodinPredem: 24,
};

/** Začátky odjezdů během dne jako hodiny s půlkou: 9, 10.5, 12… */
export const odjezdy = Array.from({ length: Math.round((rezervace.do - rezervace.od) / rezervace.blok) }, (_, i) => rezervace.od + i * rezervace.blok);
/** Hodina s půlkou jako čas: 10.5 → „10:30“ */
export const hhmm = (h: number) => `${Math.floor(h)}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;
/**
 * Cena jednoho odjezdu za člověka. Odjezd je „hodina“ v dílně — ta u nás
 * trvá 90 minut („tam, kde má hlína čas“, viz Dílna), takže stojí tolik
 * co hodina. Rozhodnuto 14. 10. 2026.
 */
export const cenaOdjezdu = rezervace.cena;

/* ——— Kurzy: zvláštní vlaky ———
 *
 * Kurzy jezdí v sobotu (`rezervace.denKurzu`), kdy hodinové spoje nejedou:
 * jeden zvláštní vlak od rána do večera. Má pár míst a lidi se na ně hlásí
 * po jednom, dokud není plno — na rozdíl od hodiny, která se zamlouvá
 * celá. Program dne je trať vlaku: zastávky jsou po hodině a půl, ve stejné
 * časy jako běžné odjezdy (9:00, 10:30, 12:00…).
 *
 * PROGRAMY JSOU NÁVRH: z původních devíti hodinových zastávek je šest
 * po hodině a půl — hnětení, pauza a výběr se schovaly do sousedních.
 * Čeká na potvrzení.
 *
 * Se Supabase se termíny vypisují tam, v tabulce `kurzy` (den, id kurzu
 * a kolik míst), a `terminy` ani ukázka se nepoužijí. Bez ní:
 * kurz bez `terminy` rozdává ukázka (scripts/rezervace/simulace.ts), ať
 * je na stránce vidět, i když skutečné termíny ještě nejsou. Jakmile se
 * sem termíny dopíšou, ukázka ho přestane rozdávat. Pevný termín může být
 * kterýkoli den; kdyby padl na úterý nebo pátek, hodinové spoje i
 * permanentky by ten den měly výluku — stránka s tím počítá.
 *
 * Názvy a popisy vycházejí z kurzů v data/kurzy.ts. CENA JE ODHAD
 * (nejvyšší poukaz z Kurzů 2) a čeká na potvrzení.
 */
export interface Zastavka {
  /** Kdy zastávka začíná — hodina dne i s půlkou (10.5 je 10:30), jeden ze začátků odjezdů */
  h: number;
  /** Krátké jméno — na klapku tabule a do mapy trasy na jízdence */
  nazev: string;
  popis: string;
}

export interface KurzVlak {
  id: string;
  nazev: string;
  /** Jméno vlaku — japonské zvláštní vlaky mají jména; tohle je japonské slovo latinkou a jeho význam */
  vlak: string;
  cteni: string;
  vyznam: string;
  /** Jedno písmeno do kulatého znaku na lokomotivě */
  emblem: string;
  lektor: string;
  popis: string;
  /** Pro koho kurz je — jednou větou do vysvětlivek pod tabulí; říká totéž co `popis` */
  proKoho: string;
  /** Cena za člověka a celý den */
  cena: number;
  /** Kolik lidí se do vlaku vejde */
  mist: number;
  program: Zastavka[];
  /** Pevné termíny jako RRRR-MM-DD */
  terminy?: string[];
}

export const kurzy: KurzVlak[] = [
  {
    id: "kruh",
    nazev: "Den na kruhu",
    vlak: "Rokuro",
    cteni: "rokuro",
    vyznam: "hrnčířský kruh",
    emblem: "R",
    lektor: "Jiřík",
    popis: "Celý den u kruhu pro ty, kdo na něm ještě neseděli: příprava hlíny, středění, vytahování a tvarování. Jede se pomalu a lektor je u toho celou cestu.",
    proKoho: "pro ty, kdo na kruhu ještě neseděli",
    cena: 2400,
    mist: 7,
    program: [
      { h: 9, nazev: "Nástup", popis: "Zástěra, kafe a kdo je kdo. Pak hnětení: hlína se musí probudit, ruce taky." },
      { h: 10.5, nazev: "Středění", popis: "Nejtěžší zastávka trati: dostat hroudu doprostřed." },
      { h: 12, nazev: "Otevření", popis: "Palec dolů, dno a první stěna. A pauza: ruce z hlíny, hlava taky." },
      { h: 13.5, nazev: "Válec", popis: "Stěny nahoru. Z válce se dá udělat všechno." },
      { h: 15, nazev: "Miska", popis: "Z válce do šířky." },
      { h: 16.5, nazev: "Podpis", popis: "Co půjde do pece a co zpátky do kýble. Značka do dna, kusy na polici, kruh umýt." },
    ],
  },
  {
    id: "glazury",
    nazev: "Den glazur",
    vlak: "Yūyaku",
    cteni: "yūyaku",
    vyznam: "glazura",
    emblem: "Y",
    lektor: "Jiřík",
    popis: "Teorie i praxe glazur — oxidace, redukce, vrstvení. Pro ty, kdo už mají za sebou pár výpalů.",
    proKoho: "pro ty, kdo už mají za sebou pár výpalů",
    cena: 2400,
    mist: 7,
    program: [
      { h: 9, nazev: "Nástup", popis: "Zástěra, kafe a kdo je kdo. Pak vzorník: deska se zkouškami, co která glazura udělá." },
      { h: 10.5, nazev: "Teorie", popis: "Oxidace, redukce a proč to z pece vyleze jinak." },
      { h: 12, nazev: "Máčení", popis: "Tři vteřiny v kýblu. Ani o jednu víc. A pauza: ruce z glazury, hlava taky." },
      { h: 13.5, nazev: "Polévání", popis: "Naběračkou přes okraj." },
      { h: 15, nazev: "Vrstvení", popis: "Glazura přes glazuru. Tady začíná dobrodružství." },
      { h: 16.5, nazev: "Do pece", popis: "Štětec, oxidy a linky. Pak otřít dna, naložit, zavřít." },
    ],
  },
];

/* ——— Permanentka ———
 *
 * První a poslední spoj dne nejsou na hodinovou jízdenku: patří lidem
 * s permanentkou. Ta platí tři měsíce na jeden den v týdnu (každé úterý,
 * nebo každý pátek — člověk si vybere) a na jeden spoj, ranní, nebo
 * večerní. Kdo chce oba dny nebo oba spoje, bere si permanentek víc.
 * Míst je na každém dni a spoji pár a plní se po jednom jako kurz.
 * (Výluku by měla jen v den, kdy by kurz vyjel v úterý nebo v pátek.)
 *
 * CENA JE ODHAD: tři měsíce po 1 900 Kč bývalo měsíční členství v open
 * studiu na oba dny, tohle je polovina, protože jde o jeden den v týdnu.
 * Čeká na potvrzení.
 */
export const permanentka = {
  spoje: [
    { h: 9, nazev: "ranní" },
    { h: 16.5, nazev: "večerní" },
  ],
  /** Kolik permanentek se prodá na jeden spoj jednoho dne v týdnu */
  mist: 3,
  mesicu: 3,
  /** Cena za člověka, jeden den v týdnu a jeden spoj na celou dobu platnosti */
  cena: 2850,
};

/* ——— Dárkové jízdenky ———
 *
 * Tři věci z Rezervace jdou koupit pro někoho jiného (components/
 * rezervace/Darky.astro): tři hodiny v dílně, permanentka a zvláštní vlak.
 * Ceny se počítají z pravidel výš — dárek stojí totéž, jako by si to
 * obdarovaný koupil sám. Dárková jízdenka je vždycky pro jednoho a nic
 * nezamlouvá: den, odjezd, spoj i termín kurzu si obdarovaný vybere, až
 * ji bude uplatňovat.
 *
 * Platnost 12 měsíců a „vytiskneme ho na papír, nebo pošleme v PDF“ jsou
 * ze staré stránky Kurzy (poukazText v uvod2.ts). Objednává se mailem
 * (scripts/rezervace/darky.ts) — server je jen pro rezervace členů.
 *
 * ODHAD, čeká na potvrzení: že se odjezdy dají uplatnit po sobě i každý
 * jindy a že se jízdenka uplatní číslem v poznámce rezervace.
 */
export const darky = {
  /** „Tři hodiny v dílně“ — kolik hodin; jsou z toho odjezdy po hodině a půl (odjezduDarku) */
  hodin: 3,
  /** Jak dlouho dárková jízdenka platí od vystavení, v měsících */
  platnostMesicu: 12,
};
/** Kolik odjezdů jsou ty tři hodiny — tolik kuponů má jízdenka a tolik vozů vlak na ní */
export const odjezduDarku = Math.max(1, Math.round(darky.hodin / rezervace.blok));

/* ——— Přání party (jen archivní /rezervace-ema) ———
 *
 * Na archivní tabuli s destičkami ema visely za obsazená místa destičky
 * party a na každé bylo přání — kdo přečetl všech devět, měl celou sbírku
 * (klíč rezervace-prani). Platná rezervace míst nepočítá, a tak ani
 * sbírku nemá.
 *
 * Nápověda v sešitě musí sedět s tím, kdy kami chodí — simulace archivu
 * ho jinam než do jeho hodin nepověsí (scripts/rezervace/ema-simulace.ts).
 */
export interface Prani {
  kdo: PostavaId;
  text: string;
  napoveda: string;
  chodi: {
    /** Dny podle Date.getDay() */
    dny?: number[];
    /** Hodiny [od, do) — začátky termínů */
    hodiny?: [number, number];
    /** Jen do hodin, které jsou úplně plné */
    plno?: boolean;
    /** Jen do hodin, kde jsou ještě aspoň tři místa */
    klid?: boolean;
  };
}

export const prani: Prani[] = [
  { kdo: "kachlik", text: "Ať všechny destičky visí rovně. Tahle visí.", napoveda: "Kachlík chodí přesně na devátou. Ani o minutu později.", chodi: { hodiny: [9, 10] } },
  { kdo: "hlinka", text: "Ať mě někdo vezme do ruky. Ráno, dokud jsem měkká.", napoveda: "Hlínka chodí hned ráno — pak zase usne.", chodi: { hodiny: [9, 11] } },
  { kdo: "samotka", text: "Jednou bych chtěla, aby mi někdo poděkoval. Ale nespěchá to.", napoveda: "Šamotka chodí kolem poledne. Nese, co se dá.", chodi: { hodiny: [11, 13] } },
  { kdo: "vazicka", text: "Rovná záda všem. A čerstvé kytky na stůl.", napoveda: "Vázička chodí přesně v jednu. Po obědě se točí nejlíp.", chodi: { hodiny: [13, 14] } },
  { kdo: "pecinka", text: "Ať mě nikdo neotvírá dřív, než vychladnu.", napoveda: "Pecinka chodí v úterý odpoledne. Úterý je v japonštině den ohně.", chodi: { dny: [2], hodiny: [13, 18] } },
  { kdo: "kapka", text: "Ať se v pátek všechno leskne.", napoveda: "Kapka chodí v pátek. Pátek je v japonštině den zlata a ona má ráda, co se leskne.", chodi: { dny: [5] } },
  { kdo: "cedulka", text: "Ať se každý podepíše. Čitelně, prosím.", napoveda: "Cedulka chodí na poslední hodinu — podepsat, co se za den udělalo.", chodi: { hodiny: [17, 18] } },
  { kdo: "stripek", text: "Ať se tu nikdo nebojí rozbít první hrnek.", napoveda: "Střípek chodí do klidných hodin, kde je ještě hodně volno.", chodi: { klid: true } },
  { kdo: "bublinka", text: "Ať se hněte míň. (Tohle nepsala Bublinka.)", napoveda: "Bublinka se schovává tam, kde je plno. V davu ji nikdo nehledá.", chodi: { plno: true } },
];
