import type { PostavaId } from "./parta";

/**
 * Rezervace času v dílně — /rezervace.
 *
 * Termíny jsou každé úterý a pátek od 9 do 18, na měsíc dopředu. Den je
 * rozdělený na odjezdy po hodině a půl (`blok`): 9:00, 10:30, 12:00…
 * Každý odjezd má pár míst (`mist`) a plní se po skupinách: kdo přijde
 * sám, zabere jedno místo a na zbytek si můžou koupit jízdenku další —
 * celý odjezd si sám pro sebe nezamluví nikdo. (Do 16. 10. 2026 se odjezd
 * zamlouval celý a místa neměl.)
 * Jízdné je za člověka a „hodinu“ — tou je jeden odjezd, 90 minut — a je
 * skupinové: čím víc lidí na odjezdu nakonec sedí, tím míň platí každý
 * (`jizdne`, `cenaOdjezdu`). Platí se na místě.
 *
 * Místa se počítají i u dvou dalších věcí: u kurzu, který zabere celý den
 * (`kurzy`), a u permanentky na první a poslední spoj dne (`permanentka`).
 * Obojí je níž.
 *
 * Co je zamluvené, je v Supabase (supabase/schema.sql) a stránka si to bere
 * z /api/volno; rezervovat smí jen členové z databáze. Přístup se dává po
 * telefonu: člověk nadiktuje e-mail, dílna ho zapíše a odkaz mu přijde
 * mailem. Dokud klíče k Supabase nejsou nastavené, je obsazenost SIMULOVANÁ
 * (scripts/rezervace/simulace.ts) a rezervovat nejde. Stejná
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
  /** Kolik lidí se vejde na jeden odjezd — tolik je v dílně míst naráz */
  mist: 4,
  /** Největší skupina na jedné jízdence — víc, než má odjezd míst, to být nemůže */
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

/* Otevírací doba slovy — patička, O nás a úvod ji berou odsud, ať se nerozejdou s rezervacemi */
const DEN = ["neděle", "pondělí", "úterý", "středa", "čtvrtek", "pátek", "sobota"];
const VE_DNI = ["v neděli", "v pondělí", "v úterý", "ve středu", "ve čtvrtek", "v pátek", "v sobotu"];
/** „úterý a pátek“ */
export const dnySlovy = rezervace.dny.map((d) => DEN[d]).join(" a ");
/** „v úterý a v pátek“ */
export const veDnySlovy = rezervace.dny.map((d) => VE_DNI[d]).join(" a ");
/** „9:00–18:00“ */
export const otevrenoSlovy = `${hhmm(rezervace.od)}–${hhmm(rezervace.do)}`;

/* ——— Jízdné: skupinové ———
 *
 * Odjezd je „hodina“ v dílně — ta u nás trvá 90 minut („tam, kde má hlína
 * čas“, viz Dílna), takže stojí tolik co hodina (rozhodnuto 14. 10. 2026).
 * Cena za člověka záleží na tom, kolik lidí na odjezdu v dílně nakonec
 * sedí — všech dohromady, ne jen těch, co přišli spolu: jeden člověk 500,
 * dva 450 za každého, tři 425, čtyři 400. Platí se na místě, takže kdo si
 * odjezd zamluví sám za 500 a přidají se k němu další tři, zaplatí všichni
 * čtyři po 400. Při rezervaci se tak dá říct jen to, kolik by to stálo
 * teď (`ostatni` = kolik lidí už na odjezdu sedí) — cena pak už jen klesá.
 *
 * Kdo nepřijde, nepočítá se: platí se podle toho, kolik lidí v dílně
 * opravdu je (`pravidloPrichodu`). Když ze čtyř zamluvených dorazí tři,
 * platí každý jako ve třech. Rozhodnuto 16. 10. 2026.
 *
 * Dítě do deseti let se počítá jako každý (zabere místo a počítá se do
 * obsazení), jen má dětskou jízdenku o stovku levnější. Na webu se děti
 * neklikají — platí se na místě, tak se tam i spočítají; web to jen říká
 * (`detskaSlovy`). Sleva platí jen na odjezdy, ne na kurz a permanentku.
 * Rozhodnuto 16. 10. 2026.
 */
export const jizdne = {
  /** Cena za člověka a odjezd podle toho, kolik lidí na něm v dílně sedí: [1, 2, 3, 4] */
  skupina: [500, 450, 425, 400],
  /** O kolik je levnější dítě, za každý odjezd */
  slevaDite: 100,
  /** Do kolika let je dítě dítětem */
  vekDite: 10,
};
/** Cena za člověka na odjezdu, kde sedí `lidi` lidí */
export const cenaZaCloveka = (lidi: number) => jizdne.skupina[Math.min(Math.max(1, Math.round(lidi)), jizdne.skupina.length) - 1];
/** Kolik zaplatí `osob` lidí za jeden odjezd, když s nimi na něm sedí ještě `ostatni` — bez dětských jízdenek, ty se spočítají na místě */
export const cenaOdjezdu = (osob: number, ostatni = 0) => osob * cenaZaCloveka(osob + ostatni);
/** Jak se cena odjezdu počítá, slovy: „500 Kč za člověka“, „3 lidi po 425 Kč“ */
export function rozpisOdjezdu(osob: number, ostatni = 0) {
  const c = `${cenaZaCloveka(osob + ostatni).toLocaleString("cs-CZ")} Kč`;
  return osob === 1 ? `${c} za člověka` : `${osob} lidi po ${c}`;
}
/** Kdo nepřijde, nepočítá se — věta na web i do mailu */
export const pravidloPrichodu = "Počítá se, kolik vás v dílně opravdu je — kdo nepřijde, nepočítá se.";
/** „dětská jízdenka do 10 let je o 100 Kč levnější“ */
export const detskaSlovy = `dětská jízdenka do ${jizdne.vekDite} let je o ${jizdne.slevaDite.toLocaleString("cs-CZ")} Kč levnější`;
/** Jízdné po řadě slovy: „1 člověk 500 Kč, 2 lidi 450, 3 lidi 425 a 4 lidi 400 Kč za každého“ */
export const tarifSlovy = () =>
  jizdne.skupina
    .map((c, i) => `${i === 0 ? "1 člověk" : `${i + 1} lidi`} ${c.toLocaleString("cs-CZ")}${i === 0 ? " Kč" : ""}`)
    .join(", ")
    .replace(/, ([^,]*)$/, " a $1") + " Kč za každého";
/** Nejnižší a nejvyšší jízdné za člověka — „400–500 Kč“ */
export const rozpetiJizdneho = { od: Math.min(...jizdne.skupina), do: Math.max(...jizdne.skupina) };

/* ——— Kurzy: zvláštní vlaky ———
 *
 * Kurzy jezdí v sobotu (`rezervace.denKurzu`), kdy hodinové spoje nejedou:
 * jeden zvláštní vlak od rána do večera. Má pár míst a lidi se na ně hlásí
 * po jednom, dokud není plno. Program dne je trať vlaku: zastávky jsou po hodině a půl, ve stejné
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
    mist: 4,
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
    mist: 4,
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
 * Platí se za jízdy: 400 Kč za člověka a každý týden, kdy spoj jede —
 * jako hodina a půl ve čtyřech, i když jedeš sám. Tři měsíce jednoho dne
 * v týdnu jsou 13 jízd (12 až 14 podle dne, kdy se začíná); týden, kdy je
 * výluka, se neplatí. Rozhodnuto 16. 10. 2026.
 */
export const permanentka = {
  spoje: [
    { h: 9, nazev: "ranní" },
    { h: 16.5, nazev: "večerní" },
  ],
  /** Kolik permanentek se prodá na jeden spoj jednoho dne v týdnu — tolik, kolik má dílna míst (rozhodnuto 17. 10. 2026) */
  mist: 4,
  mesicu: 3,
  /** Cena za člověka a jednu jízdu (hodinu a půl) — permanentka stojí tolikrát, kolik má jízd */
  cenaJizdy: 400,
};
/** Kolik jízd permanentka obvykle má — tři měsíce jednoho dne v týdnu jsou 13 týdnů. Pro dárek a ceníky; na jízdence se počítá skutečný počet. */
export const jizdPermanentky = Math.round((permanentka.mesicu * 52) / 12);
/** Cena permanentky za člověka a jeden spoj, když má `jizd` jízd */
export const cenaPermanentky = (jizd = jizdPermanentky) => jizd * permanentka.cenaJizdy;

/* ——— Dárkové jízdenky ———
 *
 * Tři věci z Rezervace jdou koupit pro někoho jiného (components/
 * rezervace/Darky.astro): tři hodiny v dílně, permanentka a zvláštní vlak.
 * Ceny se počítají z pravidel výš — dárek stojí totéž, jako by si to
 * obdarovaný koupil sám (hodiny za plné jízdné jednoho člověka — kolik
 * lidí s ním bude sedět, dopředu nevíme —, permanentka
 * za obvyklých 13 jízd). Dárková jízdenka je vždycky pro jednoho a nic
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
