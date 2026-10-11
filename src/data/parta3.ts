import type { PostavaId } from "./parta";

/**
 * Parta 3 — nebeský chrám. Data pro /parta-3.
 *
 * Parta 2 je den v dílně: cesta hlíny od hroudy po výpal. Parta 3 je noc
 * nad ní — když dílna zhasne, kami vystoupají do chrámu nad oblaky a hrají
 * divadlo. Tady je program večera: kdo vystupuje, co dělá dole a co nahoře,
 * a které kusy má na repertoáru.
 *
 * Kresby kusů jsou přehnané podoby z /marcel (components/characters/kami-buh);
 * `id` kusu je varianta té komponenty. Znak a pořadí účinkujících se berou
 * z cesty hlíny (data/kami.ts), ať čísla sedí s Partou 2. Choreografie jsou
 * v scripts/parta3/vystoupeni.
 */

export interface Kus {
  /** Varianta komponenty z characters/kami-buh */
  id: string;
  nazev: string;
  /** Jedna věta do programu */
  o: string;
  /** Noční scéna — v sále se přitmí */
  noc?: boolean;
}

export interface Ucinkujici {
  id: PostavaId;
  /** Čím je na jevišti */
  obor: string;
  /** Co hlídá přes den v dílně */
  dole: string;
  /** Co dělá v noci v chrámu */
  nahore: string;
  replika: string;
  /** Co volá z hlediště, když hraje někdo jiný */
  volani: string[];
  kusy: Kus[];
}

export const ucinkujici: Ucinkujici[] = [
  {
    id: "hlinka",
    obor: "spáč",
    dole: "Hlídá hlínu, dokud na ni nikdo nesáhl.",
    nahore: "Na jevišti spí. Všechno ostatní se děje kolem ní, a jí to tak vyhovuje.",
    replika: "Vzbuďte mě, až budu něco.",
    volani: ["Chrr.", "Hezký. Asi. Měla jsem zavřené oči.", "Ještě chvilku…"],
    kusy: [
      { id: "sakura", nazev: "Tisíciletý šlofík", o: "Spí pod sakurou starší než celá dílna. Jeden lístek na nose, jedno kýchnutí — a sněží růžově." },
      { id: "ruce", nazev: "Mokré ruce", o: "Usnula na hrnčířském kruhu. Ruce z noci ji vytáčejí do tvarů a ona to celé prospí.", noc: true },
    ],
  },
  {
    id: "bublinka",
    obor: "strašidlo",
    dole: "Hlídá vzduch v hlíně. A když ho najde, škodí.",
    nahore: "V dílně se schovává. Tady se jí konečně smí bát celé hlediště, a ona si to užívá.",
    replika: "Baf. Teď se lekni. Děkuju.",
    volani: ["Bu!", "Já bych to bouchla.", "Kdy už něco praskne?"],
    kusy: [
      { id: "ohen", nazev: "Studený oheň", o: "Hoří modře a nehřeje. Za zády má rohatého ducha — a ten je andílek, kdykoli se ohlédne." },
      { id: "hrbitov", nazev: "Hřbitov hrnců", o: "Co kdy v peci prasklo, má tu dušičku. Bublinka je budí zvonkem a vodí v řadě, dokud neodletí k měsíci.", noc: true },
    ],
  },
  {
    id: "kapka",
    obor: "bubenice hromu",
    dole: "Hlídá vodu, aby jí bylo na kruhu akorát.",
    nahore: "Bubny si půjčila od boha hromu. Nevrátila je. Prší po ní ještě ráno.",
    replika: "Bubnuju já. Prší potom samo.",
    volani: ["Ještě! Hlasitěji!", "To se leskne!", "Přidej!"],
    kusy: [
      { id: "kruh", nazev: "Kruh hromu", o: "Sedm bubnů na obruči, dvě paličky a stuha. Ten nejvyšší si šetří na konec — po něm přijde průtrž." },
      { id: "buben", nazev: "Buben je měsíc", o: "Vylezla na lešení k bubnu, který má místo kůže úplněk. Každá rána z něj setřese trochu deště.", noc: true },
    ],
  },
  {
    id: "vazicka",
    obor: "gejša",
    dole: "Hlídá tvar a rovná záda. U kruhu neodpustí nic.",
    nahore: "Nejstarší z party a jediná s angažmá. Tančí pomalu — spěch je pro mladší ročníky.",
    replika: "Půvab je taky řemeslo. Jen se při něm víc stojí.",
    volani: ["Záda rovně!", "Elegantní. Skoro jako já.", "Pomaleji. Tohle chce čas."],
    kusy: [
      { id: "kvety", nazev: "Dvanáct květů", o: "Každý měsíc nosí ve vlasech jiný květ. Jedna otočka, a je o měsíc dál. Potlesk ji zažene za vějíř." },
      { id: "tycinka", nazev: "Dokud hoří tyčinka", o: "Tanec trvá přesně jednu vonnou tyčinku. Vějířem z jejího kouře skládá tvary; ten poslední je ona sama.", noc: true },
      { id: "destnik", nazev: "Hadí oko", o: "Můstek, déšť a deštník, kterému se říká hadí oko. Točí jím tak dlouho, až déšť odežene a vyjde měsíc.", noc: true },
    ],
  },
  {
    id: "kachlik",
    obor: "strážce pravého úhlu",
    dole: "Hlídá rovinu. Kroutit se při sušení je pod jeho úroveň.",
    nahore: "Jeviště si před každým kusem přeměří. Kdyby bylo o stupeň nakřivo, nehraje se.",
    replika: "Devadesát stupňů. Ne osmdesát devět. Devadesát.",
    volani: ["Stojíš nakřivo.", "Rovně! Skoro.", "Souměrné. Uznávám."],
    kusy: [
      { id: "v1", nazev: "Šest rukou, čtyři rohy", o: "Šest rukou a v každé nářadí na rovinu. Cokoli se kolem něj pohne o stupeň, hned to srovná." },
      { id: "v2", nazev: "Kolečka ve štěrku", o: "Suchá zahrada, uhrabaná do rovna. Někdo mu do štěrku kreslí kolečka a hází kamínky. Počká — a uklidí." },
      { id: "v3", nazev: "Skoro hotová kamna", o: "Zimní srub. Postaví kamna, zatopí, kočka si lehne na pec. Pak si všimne kachle, který je o půl stupně nakřivo.", noc: true },
    ],
  },
  {
    id: "cedulka",
    obor: "písařka",
    dole: "Hlídá, aby se kusy na polici nepomíchaly.",
    nahore: "Zná jména všech v hledišti. I ta, která jsi jí ještě neřekl.",
    replika: "Všechno si píšu. I kdo netleskal.",
    volani: ["Zapsáno!", "To si poznamenám.", "A jak se ten kus jmenuje?"],
    kusy: [
      { id: "v1", nazev: "Kůň na rubu", o: "Destička na přání. Visí ve větru mezi osmi dalšími a na rubu schovává cválajícího koně." },
      { id: "v2", nazev: "Jména ve tmě", o: "Noční dílna. Každé misce seřízne nožku a do dna vyryje jméno, které svítí. Ví, čí je která — i ta křivá.", noc: true },
    ],
  },
  {
    id: "samotka",
    obor: "ta, co nese",
    dole: "Hlídá, co se v peci skládá na sebe. Leží úplně vespod.",
    nahore: "Nese i tohle jeviště. Proto hraje vleže.",
    replika: "Klidně tleskejte. Já to unesu.",
    volani: ["Zvládneš to.", "Unesu i přídavek.", "Děkuju. Někdo to říct musí."],
    kusy: [
      { id: "v1", nazev: "Polička pro kami", o: "Kamidana, domácí svatyně — a nese ji, kdo jiný. Zazvonit, dvakrát tlesknout, a dvířka se otevřou." },
      { id: "v2", nazev: "Celý výpal", o: "Pec v řezu a jeden celý koloběh: žár, chladnutí, vykládání a hned znovu. Glazura jí teče na záda. Usmívá se." },
      { id: "v3", nazev: "Teplé místo", o: "Zimní noc v kulatém okně. Je čerstvě z pece, tak na ní sedí vrabci. Pak přijde kočka. Nakonec se vejdou všichni.", noc: true },
    ],
  },
  {
    id: "pecinka",
    obor: "paní ohně",
    dole: "Hlídá oheň a čas ve výhni. Tisíc tři sta stupňů a žádný spěch.",
    nahore: "Hraje s ohněm, protože s ničím jiným neumí. První řadu prosí, ať si odsedne.",
    replika: "Kdo se spálil, stál moc blízko.",
    volani: ["Víc žáru!", "Teplo. Líbí.", "To bych vypálila líp. Ale dobrý."],
    kusy: [
      { id: "v1", nazev: "Plamenná svatozář", o: "Kami ohniště v plné parádě. Rozdmýchává si svatozář z plamenů, až jí z komína létají kroužky." },
      { id: "v2", nazev: "Raku v noci", o: "Raku se tahá z pece rozžhavené a rovnou do kádě s vodou. Tři misky, tři glazury — žádná nevyjde stejně.", noc: true },
    ],
  },
  {
    id: "stripek",
    obor: "zlatník vlastních chyb",
    dole: "Hlídá, aby se nikdo nebál něco rozbít.",
    nahore: "Každý večer se na jevišti rozsype a zase složí. Říká tomu repríza.",
    replika: "Rozbít se umí každý. Složit se zpátky, to je umění.",
    volani: ["Zlom vaz! Teda — ne doslova.", "Spadlo to? Nevadí!", "Zlatý!"],
    kusy: [
      { id: "prstenec", nazev: "Svatozář ze střepů", o: "Medituje a jedním okem hlídá. Když ho někdo vyruší, svatozář se rozsype — a on ji složí o kus pestřejší." },
      { id: "noc", nazev: "Prasklá noc", o: "Tma praská jako glazura. Zalévá trhliny světlem jednu po druhé, dokud se nerozední.", noc: true },
    ],
  },
];

/** Všechny kusy večera popořadě — podle toho jede „celý večer“ a počítá se, co už člověk viděl. */
export const program = ucinkujici.flatMap((u) => u.kusy.map((k) => ({ kdo: u.id, kus: k.id })));

/* ——— Průvod s lampiony ——— */

/**
 * Kdo jde v průvodu, zleva doprava — jdou doprava, takže první je vpravo.
 * Kachlík a Šamotka lampion nemají: jeden hlídá bránu, druhá drží jeviště.
 */
export const pruvod: { id: PostavaId; nese: string }[] = [
  { id: "hlinka", nese: "Jde ze spaní. Lampion jí vyrostl z hlavy." },
  { id: "bublinka", nese: "Svíčku nemá. Chytila si bludičku." },
  { id: "stripek", nese: "Lucernu upustil. Slepil ji zlatem a svítí líp." },
  { id: "kapka", nese: "V lucerně má kousek hromu. Občas zaduní." },
  { id: "vazicka", nese: "Nese světlo, jako by nesla čaj. Nerozlije." },
  { id: "pecinka", nese: "Čóčin si rozsvítila sama. Sirky nenosí." },
  { id: "cedulka", nese: "Jde první a nese jméno. Bez něj by nikdo nevěděl, čí je to průvod." },
];

/* ——— Hlediště ——— */

/** Co se ozve z lampionů, když se na jevišti něco povede (hlediste.ts vybírá náhodně). */
export const uzas = ["Óó!", "Jé!", "Páni.", "No teda.", "Ty jo."];
export const smich = ["Cha!", "Hihi.", "To se povedlo.", "Chichi."];
/** Poděkování za ohineri — mince zabalené v papíru, které se v japonském divadle házejí na jeviště. */
export const dekuji = ["Děkujem!", "To je na glazuru.", "Ještě jednu a máme na hlínu.", "Ohineri! Mám je ráda. Lesknou se.", "Zapsáno. Do posledního."];
