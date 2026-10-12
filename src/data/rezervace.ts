import type { PostavaId } from "./parta";

/**
 * Rezervace hodin v dílně — /rezervace.
 *
 * Termíny jsou každé úterý a pátek po hodinách od 9 do 18, na měsíc
 * dopředu. Hodina je buď volná, nebo obsazená: zamlouvá se celá, pro
 * jednoho člověka nebo skupinu až čtyř lidí — žádná místa se nepočítají.
 * Cena je za člověka a hodinu.
 *
 * Vedle hodin jsou tu dvě věci, kde se místa počítají: kurz, který zabere
 * celý den (`kurzy`), a permanentka na první a poslední spoj dne
 * (`permanentka`). Obojí je níž.
 *
 * Obsazenost je zatím SIMULOVANÁ (scripts/rezervace/simulace.ts): backend
 * nemáme, rezervace se posílá mailem. Až bude skutečný kalendář, stačí
 * místo simulace načíst, které hodiny jsou zamluvené.
 */
export const rezervace = {
  /** Dny v týdnu podle Date.getDay(): 2 = úterý, 5 = pátek */
  dny: [2, 5],
  /** První a poslední hodina — poslední termín je 17:00–18:00 */
  od: 9,
  do: 18,
  /** Cena za jednoho člověka a hodinu */
  cena: 400,
  /** Největší skupina, která si může hodinu zamluvit */
  maxOsob: 4,
  /** Kolik dní dopředu se dá rezervovat */
  dniDopredu: 31,
};

/* ——— Kurzy: zvláštní vlaky ———
 *
 * Kurz zabere celý den: hodinové spoje ten den nejedou (výluka) a místo
 * nich vyjede jeden zvláštní vlak od rána do večera. Má pár míst a lidi se
 * na ně hlásí po jednom, dokud není plno — na rozdíl od hodiny, která se
 * zamlouvá celá. Program dne je trať vlaku: co hodina, to zastávka.
 *
 * Kurz bez `terminy` rozdává ukázka (scripts/rezervace/simulace.ts), ať
 * je na stránce vidět, i když skutečné termíny ještě nejsou. Jakmile se
 * sem termíny dopíšou, ukázka ho přestane rozdávat.
 *
 * Názvy a popisy vycházejí z kurzů v data/kurzy.ts. CENA JE ODHAD
 * (nejvyšší poukaz z Kurzů 2) a čeká na potvrzení.
 */
export interface Zastavka {
  /** Hodina dne, kdy zastávka začíná */
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
  /** Pro koho kurz je — jednou větou do vysvětlivek jízdního řádu; říká totéž co `popis` */
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
      { h: 9, nazev: "Nástup", popis: "Zástěra, kafe a kdo je kdo." },
      { h: 10, nazev: "Hnětení", popis: "Hlína se musí probudit. Ruce taky." },
      { h: 11, nazev: "Středění", popis: "Nejtěžší zastávka trati: dostat hroudu doprostřed." },
      { h: 12, nazev: "Otevření", popis: "Palec dolů, dno a první stěna." },
      { h: 13, nazev: "Pauza", popis: "Ruce z hlíny, hlava taky." },
      { h: 14, nazev: "Válec", popis: "Stěny nahoru. Z válce se dá udělat všechno." },
      { h: 15, nazev: "Miska", popis: "Z válce do šířky." },
      { h: 16, nazev: "Výběr", popis: "Co půjde do pece a co zpátky do kýble." },
      { h: 17, nazev: "Podpis", popis: "Značka do dna, kusy na polici, kruh umýt." },
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
      { h: 9, nazev: "Nástup", popis: "Zástěra, kafe a kdo je kdo." },
      { h: 10, nazev: "Vzorník", popis: "Deska se zkouškami: co která glazura udělá." },
      { h: 11, nazev: "Teorie", popis: "Oxidace, redukce a proč to z pece vyleze jinak." },
      { h: 12, nazev: "Máčení", popis: "Tři vteřiny v kýblu. Ani o jednu víc." },
      { h: 13, nazev: "Pauza", popis: "Ruce z glazury, hlava taky." },
      { h: 14, nazev: "Polévání", popis: "Naběračkou přes okraj." },
      { h: 15, nazev: "Vrstvení", popis: "Glazura přes glazuru. Tady začíná dobrodružství." },
      { h: 16, nazev: "Štětec", popis: "Oxidy a linky, pod glazuru i na ni." },
      { h: 17, nazev: "Do pece", popis: "Otřít dna, naložit, zavřít." },
    ],
  },
];

/* ——— Permanentka ———
 *
 * První a poslední spoj dne nejsou na hodinovou jízdenku: patří lidem
 * s permanentkou. Ta platí tři měsíce na jeden den v týdnu (každé úterý,
 * nebo každý pátek — člověk si vybere) a na jeden spoj, ranní, nebo
 * večerní. Kdo chce oba dny nebo oba spoje, bere si permanentek víc.
 * V den, kdy jede kurz, je výluka. Míst je na každém dni a spoji pár
 * a plní se po jednom jako kurz.
 *
 * CENA JE ODHAD: tři měsíce po 1 900 Kč bývalo měsíční členství v open
 * studiu na oba dny, tohle je polovina, protože jde o jeden den v týdnu.
 * Čeká na potvrzení.
 */
export const permanentka = {
  spoje: [
    { h: 9, nazev: "ranní" },
    { h: 17, nazev: "večerní" },
  ],
  /** Kolik permanentek se prodá na jeden spoj jednoho dne v týdnu */
  mist: 3,
  mesicu: 3,
  /** Cena za člověka, jeden den v týdnu a jeden spoj na celou dobu platnosti */
  cena: 2850,
};

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
