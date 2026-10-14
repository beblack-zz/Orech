import type { PostavaId } from "./parta";

/**
 * Parta 3 — nebeský chrám. Data pro /parta-3.
 *
 * Parta 2 je den v dílně: cesta hlíny od hroudy po výpal. Parta 3 je noc
 * nad ní — když dílna zhasne, kami vystoupají do chrámu nad oblaky a hrají
 * divadlo. Tady je, kdo vystupuje, čím je a které kusy má na repertoáru.
 * Na /parta-3 je z toho „kdo je kdo“ pod lampiony; kusy s
 * `tus` hraje tušový flek (components/flek/Flek.astro).
 *
 * Kresby kusů jsou přehnané podoby z /marcel (components/characters/kami-buh);
 * `id` kusu je varianta té komponenty, první kus je podoba Kami. Znak
 * a pořadí se berou z cesty hlíny (data/kami.ts), ať čísla sedí s Partou 2.
 * Choreografie jsou v scripts/parta3/vystoupeni.
 */

export interface Kus {
  /** Varianta komponenty z characters/kami-buh */
  id: string;
  nazev: string;
  /** Jedna věta do programu */
  o: string;
  /** Noční scéna — v sále se přitmí */
  noc?: boolean;
  /** Tušový lem: scéna v kaňce rozpité tuše — z těch losuje tušový flek (components/flek/Flek.astro) */
  tus?: boolean;
}

export interface Ucinkujici {
  id: PostavaId;
  /** Čím je na jevišti */
  obor: string;
  /** Co řekne, když se rozsvítí jeho lampion, a ráno v závěru */
  replika: string;
  kusy: Kus[];
}

export const ucinkujici: Ucinkujici[] = [
  {
    id: "hlinka",
    obor: "spáč",
    replika: "Vzbuďte mě, až budu něco.",
    kusy: [
      { id: "sakura", nazev: "Tisíciletý šlofík", o: "Spí pod sakurou starší než celá dílna. Jeden lístek na nose, jedno kýchnutí — a sněží růžově." },
      { id: "ruce", nazev: "Mokré ruce", o: "Usnula na hrnčířském kruhu. Ruce z noci ji vytáčejí do tvarů a ona to celé prospí.", noc: true, tus: true },
    ],
  },
  {
    id: "bublinka",
    obor: "strašidlo",
    replika: "Baf. Teď se lekni. Děkuju.",
    kusy: [
      { id: "ohen", nazev: "Studený oheň", o: "Hoří modře a nehřeje. Za zády má rohatého ducha — a ten je andílek, kdykoli se ohlédne." },
      { id: "hrbitov", nazev: "Hřbitov hrnců", o: "Co kdy v peci prasklo, má tu dušičku. Bublinka je budí zvonkem a vodí v řadě, dokud neodletí k měsíci.", noc: true, tus: true },
    ],
  },
  {
    id: "kapka",
    obor: "bubenice hromu",
    replika: "Bubnuju já. Prší potom samo.",
    kusy: [
      { id: "kruh", nazev: "Kruh hromu", o: "Sedm bubnů na obruči, dvě paličky a stuha. Ten nejvyšší si šetří na konec — po něm přijde průtrž." },
      { id: "buben", nazev: "Buben je měsíc", o: "Vylezla na lešení k bubnu, který má místo kůže úplněk. Každá rána z něj setřese trochu deště.", noc: true, tus: true },
    ],
  },
  {
    id: "vazicka",
    obor: "gejša",
    replika: "Půvab je taky řemeslo. Jen se při něm víc stojí.",
    kusy: [
      { id: "kvety", nazev: "Dvanáct květů", o: "Každý měsíc nosí ve vlasech jiný květ. Jedna otočka, a je o měsíc dál. Potlesk ji zažene za vějíř." },
      { id: "tycinka", nazev: "Dokud hoří tyčinka", o: "Tanec trvá přesně jednu vonnou tyčinku. Vějířem z jejího kouře skládá tvary; ten poslední je ona sama.", noc: true, tus: true },
      { id: "destnik", nazev: "Hadí oko", o: "Můstek, déšť a deštník, kterému se říká hadí oko. Točí jím tak dlouho, až déšť odežene a vyjde měsíc.", noc: true, tus: true },
    ],
  },
  {
    id: "kachlik",
    obor: "strážce pravého úhlu",
    replika: "Devadesát stupňů. Ne osmdesát devět. Devadesát.",
    kusy: [
      { id: "v1", nazev: "Šest rukou, čtyři rohy", o: "Šest rukou a v každé nářadí na rovinu. Cokoli se kolem něj pohne o stupeň, hned to srovná." },
      { id: "v2", nazev: "Kolečka ve štěrku", o: "Suchá zahrada, uhrabaná do rovna. Někdo mu do štěrku kreslí kolečka a hází kamínky. Počká — a uklidí." },
      { id: "v3", nazev: "Skoro hotová kamna", o: "Zimní srub. Postaví kamna, zatopí, kočka si lehne na pec. Pak si všimne kachle, který je o půl stupně nakřivo.", noc: true },
    ],
  },
  {
    id: "cedulka",
    obor: "písařka",
    replika: "Všechno si píšu. I tebe.",
    kusy: [
      { id: "v1", nazev: "Kůň na rubu", o: "Destička na přání. Visí ve větru mezi osmi dalšími a na rubu schovává cválajícího koně." },
      { id: "v2", nazev: "Jména ve tmě", o: "Noční dílna. Každé misce seřízne nožku a do dna vyryje jméno, které svítí. Ví, čí je která — i ta křivá.", noc: true, tus: true },
    ],
  },
  {
    id: "samotka",
    obor: "ta, co nese",
    replika: "Klidně si přisedni. Já to unesu.",
    kusy: [
      { id: "v1", nazev: "Polička pro kami", o: "Kamidana, domácí svatyně — a nese ji, kdo jiný. Zazvonit, dvakrát tlesknout, a dvířka se otevřou." },
      { id: "v2", nazev: "Celý výpal", o: "Pec v řezu a jeden celý koloběh: žár, chladnutí, vykládání a hned znovu. Glazura jí teče na záda. Usmívá se." },
      { id: "v3", nazev: "Teplé místo", o: "Zimní noc v kulatém okně. Je čerstvě z pece, tak na ní sedí vrabci. Pak přijde kočka. Nakonec se vejdou všichni.", noc: true },
    ],
  },
  {
    id: "pecinka",
    obor: "paní ohně",
    replika: "Kdo se spálil, stál moc blízko.",
    kusy: [
      { id: "v1", nazev: "Plamenná svatozář", o: "Kami ohniště v plné parádě. Rozdmýchává si svatozář z plamenů, až jí z komína létají kroužky." },
      { id: "v2", nazev: "Raku v noci", o: "Raku se tahá z pece rozžhavené a rovnou do kádě s vodou. Tři misky, tři glazury — žádná nevyjde stejně.", noc: true, tus: true },
    ],
  },
  {
    id: "stripek",
    obor: "zlatník vlastních chyb",
    replika: "Rozbít se umí každý. Složit se zpátky, to je umění.",
    kusy: [
      { id: "prstenec", nazev: "Svatozář ze střepů", o: "Medituje a jedním okem hlídá. Když ho někdo vyruší, svatozář se rozsype — a on ji složí o kus pestřejší." },
      { id: "noc", nazev: "Prasklá noc", o: "Tma praská jako glazura. Zalévá trhliny světlem jednu po druhé, dokud se nerozední.", noc: true, tus: true },
    ],
  },
];

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
