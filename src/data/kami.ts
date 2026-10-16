import type { PostavaId } from "./parta";

/**
 * Parta jako japonští kami — data pro hru na hledání (omamori, komnaty) a KAMI partu.
 *
 * Profilové texty (bio, hlídá, oblíbené) zůstávají v parta.ts. Tady je jen
 * to, co přibylo s kami: kým postavička v japonské tradici je, co říká,
 * když na ni někdo klikne, kudy vede cesta hlíny a co se losuje v omikuji.
 */

export type Druh = "kami" | "tsukumogami" | "yōkai";

export interface KamiInfo {
  druh: Druh;
  /** Kým je, krátce — stojí vedle druhu */
  kdo: string;
  /** Repliky po kliknutí, jdou po řadě dokola. První je ta z profilu. */
  repliky: string[];
  /** Nápověda v omamori, dokud se schovaný kami nenajde */
  skrys: string;
  /** Jak těžké je ho najít — podle toho stojí v omamori v první, druhé, nebo třetí řadě */
  narocnost: 1 | 2 | 3;
  /** Nejtěžší ze všech — v omamori má červenou kartu se štítkem */
  nejtezsi?: true;
}

export const kamiInfo: Record<PostavaId, KamiInfo> = {
  hlinka: {
    druh: "kami",
    kdo: "kami země",
    repliky: [
      "Zatím jsem jenom hrouda. Ale to se dá spravit.",
      "Ještě pět minut.",
      "Možná budu miska. Možná drak. Rozhodnu se po obědě.",
      "Mokré ruce, prosím. Suché škrábou.",
      "Kami země. Zní to vznešeně, ale většinou spím.",
    ],
    skrys: "Spí v patičce úplně na dně. Musíš se prokopat až ke kameni.",
    narocnost: 2,
  },
  kapka: {
    druh: "kami",
    kdo: "kami vody",
    repliky: [
      "Já jsem tady spíš omylem. Ale nikomu to neříkej.",
      "Lesklé! Kde? Tam!",
      "Bez vody se na kruhu netočí. Jen tak mimochodem.",
      "Louže je jezero, když jsi dost malá.",
      "V peci mě uvidíš do sta stupňů. Pak už jen páru.",
    ],
    skrys: "Sedí na židli u kruhu v roce dílny. Od dubna se nehnula.",
    narocnost: 1,
  },
  pecinka: {
    druh: "kami",
    kdo: "Kamado-gami, kami ohniště",
    repliky: [
      "Za dva týdny to bude tvrdý jako kámen. Slibuju.",
      "Neotvírej mě. Ještě ne. Ještě ne. Ještě… ne.",
      "Mám na sobě shimenawu. Tak se chovej.",
      "Tisíc tři sta dvacet stupňů. A pořád se usmívám.",
      "Přes noc podřimuju. Ale jedním okem.",
    ],
    skrys: "Veze se na svitku s průvodem. Vlevo, u válečku.",
    narocnost: 1,
  },
  stripek: {
    druh: "tsukumogami",
    kdo: "rozbitý hrnek s duší",
    repliky: [
      "Já jsem se rozbil hned na první hodině. A pořád jsem tady.",
      "Tohle zlato? To je jizva. Nejhezčí věc, co mám.",
      "Rozbít něco není konec světa. Je to začátek kintsugi.",
      "Spadl jsem ze stolu. Doporučuju. Teda ne.",
      "Kdo se nebojí chyb, točí rychleji.",
    ],
    skrys: "Schoval se v hodinách krámku. Mezi šestou a sedmou.",
    narocnost: 3,
    nejtezsi: true,
  },
  vazicka: {
    druh: "tsukumogami",
    kdo: "nejstarší kus v dílně",
    repliky: [
      "Rovně sedět, rovně točit. A dýchat — na to se často zapomíná.",
      "Prý mi je přes sto let. Proto mám duši.",
      "Ty praskliny v glazuře? Kannyū. Stárnu stylově.",
      "Lokty k tělu.",
      "Čerstvé sakury, každý den. Člověk má mít standardy.",
    ],
    skrys: "Kouká zpoza dárkové jízdenky na zvláštní vlak.",
    narocnost: 1,
  },
  bublinka: {
    druh: "yōkai",
    kdo: "raubířka",
    repliky: [
      "Já tam nejsem. Fakt. Klidně to dej do pece.",
      "Hnětení? Tomu říkám šikana.",
      "Pšš. Hraju schovávanou.",
      "Nejsem zlá. Jen jsem v peci hlasitá.",
      "Kami? Kdepak. Yōkai. To je ta zábavnější strana.",
    ],
    skrys: "Bydlí ve vodě. U mistra, kde se středí hlína.",
    narocnost: 2,
  },
  kachlik: {
    druh: "tsukumogami",
    kdo: "rovný kachel",
    repliky: [
      "Čtyři strany, čtyři pravé úhly. Zkus to taky.",
      "Nenaklonil jsem se. To ty stojíš nakřivo.",
      "Mám razítko. 正. Znamená to správný. Úředně.",
      "Kroutit se při sušení je pod mou úroveň.",
      "Vodováha je můj nejlepší kamarád. Má bublinku. To jediné jí vyčítám.",
    ],
    skrys: "Vykukuje nad cedulkou s příští volnou hodinou.",
    narocnost: 2,
  },
  cedulka: {
    druh: "tsukumogami",
    kdo: "ema, destička na přání",
    repliky: [
      "Napiš se na mě. Za dva týdny mi poděkuješ.",
      "Dvacet stejných misek. Jedna je tvoje. Já vím která.",
      "V Japonsku se na mě píšou přání. Tady jména. Splní se obojí.",
      "Piš čitelně. Já to pak budu muset přečíst.",
      "Pamatuju si všechno. Hlavně to, čí je ta křivá.",
    ],
    skrys: "Visí z okapu síně mistra. Tam se dostaneš až po šesti.",
    narocnost: 3,
  },
  samotka: {
    druh: "tsukumogami",
    kdo: "police z pece",
    repliky: [
      "Zvládnu to. Vždycky to zvládnu.",
      "Ještě jeden hrnek? Jasně. Klidně dva.",
      "Tisíc stupňů zespodu, cizí misky shora. Normální den.",
      "Kdyby glazura stekla až na mě… ne, nebudu na to myslet.",
      "Nikdo mi nikdy nepoděkoval. To je v pořádku. Fakt.",
    ],
    skrys: "Jede vlakem po moři. V prvním voze, u okna s cestujícím.",
    narocnost: 3,
  },
};

/* ——— Komnaty ——— */

/**
 * Za každé tři nalezené kami se otevře jedna komnata. Počítá se jen počet,
 * ne kdo — první řada v omamori je ale nejsnazší, takže se většinou otevírají
 * po řadách. Číslo je to samé jako na lístku závěsu (Zaves.astro).
 * `kam` mají komnaty, které už stojí — otevřená dlaždice v omamori tam vede.
 */
export const komnaty: { prah: number; cislo: string; nazev: string; popis: string; kam?: string }[] = [
  { prah: 3, cislo: "一", nazev: "Papírna", kam: "/papirna", popis: "Kami z papíru: vystřihni si partu, slep ji a k tomu omalovánka." },
  { prah: 6, cislo: "二", nazev: "U mistra", kam: "/zkouska", popis: "Devět zastavení cesty hlíny, za každé razítko a na konci mistrovský list." },
  { prah: 9, cislo: "三", nazev: "Poklad", kam: "/svatyne", popis: "Ve svatyni si vytáhneš omikuji. Co je na lístku, prozradí až ona." },
];

/* ——— Cesta hlíny ——— */

export interface Zastaveni {
  id: PostavaId;
  /** Pořadí japonsky — 一, 二, 三… */
  cislo: string;
  /** Znak stanoviště, velký a štětcem */
  znak: string;
  cteni: string;
  nazev: string;
  /**
   * Denní doba, kdy se sem dojde. Čísla rostou přes půlnoc dál (29,5 je
   * půl šesté ráno dalšího dne), aby obloha mezi stanovišti plynula
   * jedním směrem a nevracela se.
   */
  hodina: number;
  /** Co se na stanovišti děje a kdo ho hlídá — tenhle text jde i mimo Partu 2 (obsazení na /parta) */
  text: string;
  /** Výzva ke hře ve scéně stanoviště; patří jen tam, kde ta scéna je */
  pokyn?: string;
}

export const cesta: Zastaveni[] = [
  {
    id: "hlinka", cislo: "一", znak: "土", cteni: "tsuchi", nazev: "Hrouda", hodina: 7,
    text: "Každý kus začíná jako hrouda, která ještě neví, čím bude. Hlína se nechává odležet — čím déle, tím je poddajnější. Hlínka mezitím spí a do ničeho se nehrne.",
  },
  {
    id: "bublinka", cislo: "二", znak: "泡", cteni: "awa", nazev: "Hnětení", hodina: 8.5,
    text: "Než hlína dojde na kruh, musí z ní ven každá bublinka vzduchu. V Japonsku se hněte do tvaru květu chryzantémy, říká se tomu kiku-neri.",
    pokyn: "Zkus to: klikej na hroudu, dokud se Bublinka nevzdá.",
  },
  {
    id: "kapka", cislo: "三", znak: "水", cteni: "mizu", nazev: "Voda", hodina: 10,
    text: "Bez vody se na kruhu netočí, hlína by drhla a trhala se. S moc vodou zase zvadne. Kapka hlídá, aby jí bylo akorát.",
    pokyn: "Klikni do vody.",
  },
  {
    id: "vazicka", cislo: "四", znak: "形", cteni: "katachi", nazev: "Tvar", hodina: 13,
    text: "Na kruhu se z hroudy stane tvar. Nejdřív se hlína vycentruje, pak otevře a vytáhne. Rozhoduje držení těla: lokty opřené, záda rovně, dech klidný.",
    pokyn: "Sjeď dolů a nech ji růst.",
  },
  {
    id: "kachlik", cislo: "五", znak: "平", cteni: "taira", nazev: "Rovina", hodina: 15.5,
    text: "Při sušení se tvar rád zkroutí — kraje schnou rychleji než střed. Proto se suší pomalu a přikryté a talíře se obracejí. Kachlík to hlídá.",
    pokyn: "Zkus ho srovnat: hýbej myší, nebo prstem.",
  },
  {
    id: "cedulka", cislo: "六", znak: "名", cteni: "na", nazev: "Jméno", hodina: 17.5,
    text: "Po týdnu stojí na polici dvacet misek a všechny vypadají podobně. Každý kus se proto podepíše — rydlem do dna, protože tužka by v peci shořela. Cedulka si pamatuje, čí je která.",
  },
  {
    id: "samotka", cislo: "七", znak: "棚", cteni: "tana", nazev: "Police", hodina: 20,
    text: "Pec se skládá jako hlavolam: kusy se nesmějí dotýkat a každá police nese, co unese. Šamotka leží úplně dole a drží všechno ostatní.",
    pokyn: "Dívej se, jak se plní.",
  },
  {
    id: "pecinka", cislo: "八", znak: "火", cteni: "hi", nazev: "Oheň", hodina: 23,
    text: "Výpal trvá celý den a pak celou noc chladne. Teplota stoupá pomalu, protože hlína prochází proměnami, které se nedají uspěchat.",
    pokyn: "Sjeď dolů a rozpal Pecinku.",
  },
  {
    id: "stripek", cislo: "九", znak: "金", cteni: "kin", nazev: "Střep", hodina: 29.5,
    text: "Ráno se pec otevře. Většinou je to radost. Občas něco praskne — a pak přijde kintsugi: střepy se slepí lakem a spára se zasype zlatem. Prasklina se neschovává. Stane se tou nejhezčí částí.",
  },
];

/* ——— Výpal ——— */

/**
 * Pálicí křivka ostrého výpalu kameniny: [hodina, °C]. Pod stovkou se
 * drží, dokud nevyschne poslední voda, kolem 573 °C se nespěchá kvůli
 * křemeni a nahoře se teplota chvíli drží, aby se glazura rozlila.
 */
export const krivka: [number, number][] = [
  [0, 20], [1.5, 100], [2.5, 100], [3.2, 200], [5.5, 600],
  [8.5, 1100], [10.3, 1260], [10.8, 1280], [11.4, 1280],
];

export interface Milnik {
  teplota: number;
  kdo: PostavaId;
  text: string;
  replika: string;
}

export const milniky: Milnik[] = [
  {
    teplota: 100, kdo: "kapka",
    text: "Pod stovkou se čeká, dokud z hlíny neodejde poslední voda. Kdyby se v páru proměnila moc rychle, hrnek by roztrhla.",
    replika: "Tak já jdu. Pa.",
  },
  {
    teplota: 200, kdo: "bublinka",
    text: "Kdo špatně vyhnětl, uslyší teď ránu. Vzduchová kapsa s trochou vody uvnitř se v peci roztrhne.",
    replika: "Bum. Promiň. Vlastně ne.",
  },
  {
    teplota: 573, kdo: "stripek",
    text: "Křemenný skok. Křemen v hlíně najednou změní objem. Kdo tady spěchá, potká mě.",
    replika: "Pomalu. Mluvím z vlastní zkušenosti.",
  },
  {
    teplota: 650, kdo: "hlinka",
    text: "Odchází i voda, která je v hlíně vázaná chemicky. Od téhle chvíle je to keramika a ve vodě se už nikdy nerozmočí.",
    replika: "Tak. Už nejsem hrouda.",
  },
  {
    teplota: 750, kdo: "cedulka",
    text: "Obyčejná tužka by tady už shořela. Proto se jméno rýpe do dna.",
    replika: "Já tu pořád jsem. Rydlem se nepíše nadarmo.",
  },
  {
    teplota: 950, kdo: "samotka",
    text: "Tady by skončil přežah, první výpal. Střep je po něm pevný, ale pórovitý, a glazuru nasaje jako houba.",
    replika: "Ještě tři sta stupňů. Zvládnu to.",
  },
  {
    teplota: 1150, kdo: "kachlik",
    text: "Hlína teď skoro měkne. Co se kroutilo při sušení, zkroutí se i tady — v peci se nic neschová.",
    replika: "Držím. Držím. Drž… ím.",
  },
  {
    teplota: 1240, kdo: "vazicka",
    text: "Glazura se taví ve sklo. Při chladnutí se smrští jinak než střep, a proto jednou možná popraská jemnou sítí. Klidně až za sto let.",
    replika: "Však víš, o čem mluvím.",
  },
  {
    teplota: 1280, kdo: "pecinka",
    text: "Vrchol. Teď chvíli podržet, ať se glazura rozleje a uhladí. Žároměrky se ohýbají — měří víc než teploměr, protože počítají i s časem.",
    replika: "Umím až 1 320. Dneska stačí tohle.",
  },
];

/** Tři žároměrky: první se ohne celá, druhá do pravého úhlu, třetí hlídá, že se nepřepálilo. */
export const zaromerky = [
  { stupne: 1220, od: 1170, do: 1232 },
  { stupne: 1260, od: 1222, do: 1295 },
  { stupne: 1300, od: 1268, do: 1340 },
];

/* ——— Omikuji ——— */

export type Stupen = "daikichi" | "chukichi" | "shokichi" | "kichi" | "suekichi" | "kyo";

export const stupne: Record<Stupen, { znak: string; romaji: string; cesky: string; vaha: number; nalada: "dobre" | "smisene" | "zle" }> = {
  daikichi: { znak: "大吉", romaji: "daikichi", cesky: "velké štěstí", vaha: 14, nalada: "dobre" },
  chukichi: { znak: "中吉", romaji: "chūkichi", cesky: "střední štěstí", vaha: 16, nalada: "dobre" },
  shokichi: { znak: "小吉", romaji: "shōkichi", cesky: "malé štěstí", vaha: 18, nalada: "dobre" },
  kichi: { znak: "吉", romaji: "kichi", cesky: "štěstí", vaha: 20, nalada: "dobre" },
  suekichi: { znak: "末吉", romaji: "suekichi", cesky: "štěstí, které teprve přijde", vaha: 16, nalada: "smisene" },
  kyo: { znak: "凶", romaji: "kyō", cesky: "smůla", vaha: 16, nalada: "zle" },
};

export const vestby: Record<Stupen, { kdo: PostavaId; text: string }[]> = {
  daikichi: [
    { kdo: "vazicka", text: "Dnes se ti všechno vycentruje na první dobrou. Nezvykej si." },
    { kdo: "cedulka", text: "Ze všech misek na polici bude ta tvoje nejhezčí. Vím to. Vím, která je tvoje." },
    { kdo: "pecinka", text: "Glazura se rozleje jako zrcadlo. Za dva týdny se budeš usmívat." },
  ],
  chukichi: [
    { kdo: "kapka", text: "Glazura steče přesně tam, kam chceš. Skoro." },
    { kdo: "pecinka", text: "Pec bude hodná. Oplať jí to: neotvírej ji, dokud nevychladne." },
  ],
  shokichi: [
    { kdo: "stripek", text: "Hrnek se povede. Ucho trochu méně. Nevadí, hrnek se dá držet i za břicho." },
    { kdo: "kachlik", text: "Dnešní talíř bude rovný. Já bych řekl, že ne úplně, ale mě nikdo neposlouchá." },
  ],
  kichi: [
    { kdo: "hlinka", text: "Hlína tě dnes poslechne. Jen jí dej chvíli, ať se probudí." },
    { kdo: "samotka", text: "Uneseš to. Vždycky to uneseš. Věř mi, vím o tom své." },
  ],
  suekichi: [
    { kdo: "stripek", text: "Dnešní kus se nepovede. Ten za týden bude krásný. Mezitím: druhé pokusy." },
    { kdo: "pecinka", text: "Výsledek uvidíš za dva týdny. Do té doby se nedá dělat nic, jen věřit." },
  ],
  kyo: [
    { kdo: "bublinka", text: "Jsem ve tvé hlíně. Hněť, dokud nezačnu prosit." },
    { kdo: "stripek", text: "Něco dnes praskne. Klid — zlato na spravování máme." },
    { kdo: "samotka", text: "Glazura steče až na mě. Zase. Příště nech dole kousek bez glazury." },
  ],
};

/** Rubriky jako na skutečném omikuji, jen hrnčířské. */
export const rubriky: { znak: string; nazev: string; dobre: string[]; zle: string[] }[] = [
  {
    znak: "轆轤", nazev: "Kruh",
    dobre: ["Vycentruješ napoprvé.", "Hlína poslechne. Ruce taky."],
    zle: ["Hlína uteče doleva. Nechoď za ní.", "Centrování potrvá. Dýchej."],
  },
  {
    znak: "釉薬", nazev: "Glazura",
    dobre: ["Steče přesně tak, jak má.", "Barva vyjde hezčí, než čekáš."],
    zle: ["Steče až na dno. Nech kraj bez glazury.", "Vyjde jinak, než čekáš. Třeba se ti zalíbí."],
  },
  {
    znak: "窯", nazev: "Pec",
    dobre: ["Výpal dopadne dobře.", "Žároměrky se ohnou přesně."],
    zle: ["Neotvírej ji brzo. Opravdu ne.", "Jeden kus se nepovede. Zlato máme."],
  },
  {
    znak: "失物", nazev: "Ztracené věci",
    dobre: ["Houbička je pod kruhem.", "Jehla je v kapse zástěry."],
    zle: ["Očko se najde až v příští hroudě.", "Drát na řezání leží tam, kam se nikdo nedíval."],
  },
  {
    znak: "待人", nazev: "Kdo přijde",
    dobre: ["Přijde a přinese buchty.", "Už je na cestě."],
    zle: ["Přijde pozdě. Ale přijde.", "Přijde, až budeš mít hlínu po lokty."],
  },
];
