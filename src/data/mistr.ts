import type { PostavaId } from "./parta";

/**
 * Učení u mistra — druhá komnata hry se schovanými kami (/zkouska).
 *
 * Kdo najde šest kami, projde norenem do dílny a tam ho čeká devět úrovní
 * po cestě hlíny (cesta v kami.ts): od hroudy po zlato, každou hlídá kami
 * svého zastavení. Úrovně jdou po sobě jako políčka na desce sugoroku,
 * za každou je razítko do sešitu a známka 優 良 可. Kdo projde všech
 * devět, dostane mistrovský list 免許皆伝 a parta ho po celém webu
 * oslovuje jako mistra (scripts/parta2/mistr.ts).
 *
 * Tady jsou jen texty a čísla. Hry samotné jsou ve scripts/zkouska/urovne,
 * jejich scény v components/zkouska/urovne.
 */

export type UrovenId = "hrouda" | "hneteni" | "voda" | "tvar" | "rovina" | "jmeno" | "police" | "ohen" | "strep";

export interface Uroven {
  id: UrovenId;
  /** Pořadí na desce — 一 až 九 */
  cislo: string;
  /** Znak zastavení cesty hlíny (kami.ts) — je i na razítku */
  znak: string;
  cteni: string;
  /** Zastavení cesty hlíny */
  stanice: string;
  /** Jak se jmenuje úroveň */
  nazev: string;
  /** Kdo úroveň hlídá — jeho zastavení to je */
  kdo: PostavaId;
  /** Co se dělá, jednou větou — na políčku desky a v sešitě, dokud chybí razítko */
  ukol: string;
  /** Zadání na úvodní kartě úrovně */
  zadani: string;
  /** Čím se hraje */
  ovladani: string;
  /** Za co je 優 — ať se ví, kam mířit */
  vyborne: string;
  /** Co kami řekne, když se úroveň otevře */
  uvod: string;
}

export const urovne: Uroven[] = [
  {
    id: "hrouda", cislo: "一", znak: "土", cteni: "tsuchi", stanice: "Hrouda", nazev: "Šest stejných", kdo: "hlinka",
    ukol: "Odkrojit šest hrud po půl kilu.",
    zadani: "Na šest misek je potřeba šest stejných hrud. Z bloku hlíny odkrajuj drátem kusy po 500 gramech — váha řekne, jak se to povedlo. Kolik váží celý blok, je na praporku. Blok není všude stejně tlustý: kde je vyšší, váží centimetr víc. A na bloku spí Hlínka a občas se převalí. Tu nekrájej.",
    ovladani: "Myší namíříš drát a kliknutím krojíš. Prstem drát táhneš a puštěním krojíš — puštění mimo scénu řez zruší. Šipky posouvají drát o centimetr, se Shiftem o 2 mm, mezerník krojí.",
    vyborne: "優, když se v průměru netrefíš o víc než 13 gramů a Hlínku nevzbudíš.",
    uvod: "Půl kila. Šestkrát. A potichu, prosím.",
  },
  {
    id: "hneteni", cislo: "二", znak: "泡", cteni: "awa", stanice: "Hnětení", nazev: "Kiku-neri", kdo: "bublinka",
    ukol: "Prohnětat hroudu do rytmu.",
    zadani: "Z hlíny musí ven každá bublinka vzduchu. Hněte se do chryzantémy: dlaní dolů, pootočit, dlaní dolů… Noty jedou zprava k terči — trefuj se do rytmu a z hroudy vyroste květ a Bublinka se vystěhuje. Co netrefíš, tam se schová zpátky. Na konci utíká: tlač, co to dá.",
    ovladani: "Dvě plochy pod scénou: Tlač na červené noty, Otoč na modré. Z klávesnice F, J nebo mezerník tlačí, D, K nebo Enter otáčí.",
    vyborne: "優 za 85 % zásahů. Na konci se tlačí, co to dá — každý úder nad dvanáct je bod navíc, nejvýš čtyři.",
    uvod: "Hnětení? Tomu říkám šikana.",
  },
  {
    id: "voda", cislo: "三", znak: "水", cteni: "mizu", stanice: "Voda", nazev: "Na střed", kdo: "kapka",
    ukol: "Vycentrovat hlínu na kruhu.",
    zadani: "Hlína na kruhu musí běžet přesně na středu, jinak obíhá a kmitá. Polož ruce doprostřed, drž je v klidu a nech kruh pracovat. Bez vody hlína drhne a cuká ven, s moc vodou zvadne a sesune se — Kapka napoví, kdy přidat. Až se zlatý kruh na terči naplní, pomalu pusť.",
    ovladani: "Drž myš nebo prst uprostřed hlíny a nehýbej se. Vodu přidá tlačítko Voda, ťuknutí do kbelíku nebo mezerník; z klávesnice drží ruce klávesa H.",
    vyborne: "優 za střed do dvaceti vteřin a vodu pořád akorát.",
    uvod: "Bez vody se na kruhu netočí. Jen tak mimochodem.",
  },
  {
    id: "tvar", cislo: "四", znak: "形", cteni: "katachi", stanice: "Tvar", nazev: "Podle předlohy", kdo: "vazicka",
    ukol: "Vytočit tři kusy podle předlohy.",
    zadani: "Mistr postaví na polici kus a řekne: takový. Jeho obrys leží na kruhu jako zlatá čára — obtáhni ho od patky nahoru a kruh vytočí, co nakreslíš. Kde čára sedí, zlatá se rozsvítí. Co by na kruhu spadlo, spadne i tady. Tři kusy, každý těžší, na každý 35 vteřin.",
    ovladani: "Táhni myší nebo prstem od patky nahoru, vpravo od osy; překreslit se dá, kolikrát chceš. Hotový tvar odřízni drátem — tlačítkem, nebo Enterem.",
    vyborne: "優 za shodu s předlohou v průměru aspoň 85 %.",
    uvod: "Rovně sedět, rovně točit. A dýchat.",
  },
  {
    id: "rovina", cislo: "五", znak: "平", cteni: "taira", stanice: "Rovina", nazev: "Sušárna", kdo: "kachlik",
    ukol: "Usušit kusy, ať se nezkroutí.",
    zadani: "Kusy na polici schnou a kraj vždycky rychleji než střed. Co schne nerovně, to se kroutí, a co se kroutí moc, praskne. Vodováha nad kusem ukáže, o kolik kraj předbíhá — za čárkou je zle. Přikrývej fólií, talíř, kachel a mísu obracej a hlídej okno: Bublinka ho otevře a je průvan. Do neděle musí být všechno suché a rovné.",
    ovladani: "Klepnutím na kus ho přikryješ fólií nebo odkryješ. Talíř, kachel a mísu obrátí kulatá šipka, otevřené okno zavřeš klepnutím. Klávesy 1–5, C, F a O.",
    vyborne: "優, když nic nepraskne, nic se moc nezkroutí a do neděle je všechno suché.",
    uvod: "Kroutit se při sušení je pod mou úroveň.",
  },
  {
    id: "jmeno", cislo: "六", znak: "名", cteni: "na", stanice: "Jméno", nazev: "Čí je která", kdo: "cedulka",
    ukol: "Vyrýt si pečeť a najít svou misku.",
    zadani: "Po týdnu stojí na polici dvacet misek a všechny vypadají stejně. Nejdřív si vyryj pečeť — tou se podepíšeš i na mistrovský list. Pak ji hlídej: Cedulka ukáže dna misek, přeskládá je a ty najdi tu svou. Tři kola, každé rychlejší — a ve třetím Cedulka trochu podvádí.",
    ovladani: "Napiš jméno a znaky na pečeť, vyber tvar a písmo, pak Vyrýt. Misku vybereš kliknutím nebo prstem, z klávesnice šipkami a Enterem.",
    vyborne: "優 za tři kola bez jediné chyby.",
    uvod: "Pamatuju si všechno. Hlavně to, čí je ta křivá.",
  },
  {
    id: "police", cislo: "七", znak: "棚", cteni: "tana", stanice: "Police", nazev: "Skládání pece", kdo: "samotka",
    ukol: "Naskládat pec, ať se nic nedotýká.",
    zadani: "Pec se skládá jako hlavolam. Kusy se nesmějí dotýkat sebe ani spirál ve stěnách a nad každým musí zůstat kus místa — výšku polic měníš sloupky. Police unese 3 kg, Šamotka na dně 4 kg. Co má glazuru na dně, otři o houbičku, jinak se přilepí. Sedm kusů musí dovnitř, dva se zlatou cedulkou jsou navíc.",
    ovladani: "Kusy přetahuj myší nebo prstem — nebo na kus klepni a pak klepni, kam ho dát. Kliknutím na sloupky přepneš výšku police. Z klávesnice Tab, Enter a šipky.",
    vyborne: "優 za kus navíc a víko do 1:50 — nebo za všech devět.",
    uvod: "Zvládnu to. Vždycky to zvládnu.",
  },
  {
    id: "ohen", cislo: "八", znak: "火", cteni: "hi", stanice: "Oheň", nazev: "Pálicí křivka", kdo: "pecinka",
    ukol: "Vypálit pec po křivce.",
    zadani: "Výpal trvá celý den. Drž pero zapisovače v zeleném pásu kolem křivky — pec má setrvačnost, takže se topí dopředu. Pod stovkou pomalu, ať z hlíny odejde voda, kolem 573 °C se nespěchá kvůli křemeni a nahoře se chvíli drží, ať se glazura rozleje, ale přes 1 310 °C steče. Žároměrky pak řeknou, jak to dopadlo. A v noci, až pec chladne — neotvírat brzo.",
    ovladani: "Drž tlačítko Topit nebo mezerník a pec topí, pustíš — a chladne. Kroužek před perem ukazuje, kam teplota míří. Po výpalu tlačítko Otevřít pec.",
    vyborne: "優 za průměrnou odchylku do 15 °C, výpal bez nehody a žároměrky 1 · ½ · 0.",
    uvod: "Mám na sobě shimenawu. Tak se chovej.",
  },
  {
    id: "strep", cislo: "九", znak: "金", cteni: "kin", stanice: "Střep", nazev: "Kintsugi", kdo: "stripek",
    ukol: "Slepit misku a spáry zasypat zlatem.",
    zadani: "Ráno se otevřela pec a jedna miska praskla na šest střepů. Neschovávej to. Slep střepy, jak k sobě patří — každý je potřeba i pootočit — a spáry pak obtáhni štětcem zlatem. Zlato patří do spáry, ne vedle. Na všechno jsou tři minuty.",
    ovladani: "Střepy táhni myší nebo prstem. Otáčí se kolečkem myši, klávesami Q a E, kulatými tlačítky u vybraného střepu nebo druhým prstem. Zlato táhni štětcem po spáře. Z klávesnice Tab, šipky, Q/E a Enter.",
    vyborne: "優 za misku slepenou do čtyřiceti vteřin a zlato jen ve spárách.",
    uvod: "Spadl jsem ze stolu. Doporučuju. Teda ne.",
  },
];

export const urovenPodleId = (id: UrovenId) => urovne.find((u) => u.id === id)!;

/* ——— Známky ———
 *
 * Jako na japonském vysvědčení: 優 výborně, 良 dobře, 可 prošlo. Úroveň
 * vrací body 0–100 a z nich je známka; kdo neprojde, razítko nemá.
 */

export type Znamka = "yu" | "ryo" | "ka";

export const znamky: Record<Znamka, { znak: string; cteni: string; nazev: string; od: number }> = {
  yu: { znak: "優", cteni: "yū", nazev: "výborně", od: 85 },
  ryo: { znak: "良", cteni: "ryō", nazev: "dobře", od: 65 },
  ka: { znak: "可", cteni: "ka", nazev: "prošlo", od: 0 },
};

export const znamkaZBodu = (body: number): Znamka => (body >= znamky.yu.od ? "yu" : body >= znamky.ryo.od ? "ryo" : "ka");
/** Lepší známka má menší pořadí */
export const poradiZnamky: Record<Znamka, number> = { yu: 0, ryo: 1, ka: 2 };

/* ——— Stupně ———
 *
 * Deska je ve třech pásech po třech úrovních. Kdo projde první tři, je
 * tovaryš; třetí pás je zkouška na mistra a mistrem je až ten, kdo projde
 * všech devět. Figurka na desce je kámen ze šógi a při povýšení se otočí
 * (jako v šógi, kde má povýšený kámen na rubu červený znak).
 */
export const stupne: { znak: string; cteni: string; nazev: string; pas: string; popis: string; od: number }[] = [
  { znak: "見習", cteni: "minarai", nazev: "Učeň", pas: "Učeň", od: 0, popis: "Vážit, hníst, centrovat. Na tvar se jde, až ruce vědí, co dělají." },
  { znak: "職人", cteni: "shokunin", nazev: "Tovaryš", pas: "Tovaryš", od: 3, popis: "Ruce už vědí. Teď se učí, co dělá čas: tvar, sušení a jméno." },
  { znak: "名人", cteni: "meijin", nazev: "Mistr", pas: "Zkouška na mistra", od: 9, popis: "Pec, oheň a zlato. Kdo projde, dostane mistrovský list." },
];

/** Na kterém pásu desky úroveň leží (0–2) */
export const pasUrovne = (i: number) => Math.floor(i / 3);
/** Stupeň podle počtu prošlých úrovní: učeň, tovaryš, mistr */
export const stupenPodlePoctu = (prosle: number) => (prosle >= 9 ? stupne[2] : prosle >= 3 ? stupne[1] : stupne[0]);

/* ——— Mistr ——— */

/**
 * Jak se mistrovi říká. Rod se nehádá podle jména — člověk si v síni
 * mistra vybere sám, a parta ho pak po celém webu oslovuje takhle.
 */
export type OsloveniId = "mistr" | "mistrova" | "sensei";
export const osloveni: Record<OsloveniId, { titul: string; volani: string; z: string }> = {
  mistr: { titul: "mistr", volani: "Mistře", z: "Mistr z Ořechu" },
  mistrova: { titul: "mistrová", volani: "Mistrová", z: "Mistrová z Ořechu" },
  sensei: { titul: "sensei", volani: "Sensei", z: "Sensei z Ořechu" },
};

/** Mistrovský list — svitek, který se v síni mistra rozvine */
export const list = {
  znak: "免許皆伝",
  cteni: "menkyo kaiden",
  nazev: "Mistrovský list",
  /** Doslova: „povolení, že bylo předáno všechno“ — nejvyšší list v japonských uměních a řemeslech */
  doslova: "předáno všechno",
  text: "Cesta hlíny je za tebou: od hroudy až po zlato, devět zastavení a devět razítek. Parta z dílny v Ořechu ti tímto předává všechno, co umí. Víc už nemá.",
  podpis: "Parta z dílny v Ořechu",
};

/**
 * Co kami řeknou mistrovi, když na ně někde na webu klikne — poprvé za
 * návštěvu stránky (scripts/parta2/mistr.ts). {o} je oslovení: Mistře,
 * Mistrová, Sensei. Věty jsou psané tak, aby seděly na všechna tři.
 */
export const pozdravyMistra: Record<PostavaId, string[]> = {
  hlinka: ["{o}! Pro tebe se i probudím.", "{o}, z té hroudy už něco bude. Vím to."],
  kapka: ["{o}! Ten mistrovský list se tak hezky leskne.", "Vody akorát, {o}. Jako vždycky."],
  pecinka: ["{o}. Pro tebe klidně tisíc tři sta dvacet stupňů.", "Kdo umí počkat, má u mě otevřeno. {o}."],
  stripek: ["{o}! S tebou se rozbíjím rád. Zlato máš v ruce.", "Kdo se nebojí chyb, točí rychleji. Viď, {o}?"],
  vazicka: ["{o}, klaním se. Lokty u těla, jak se patří.", "Rovná záda. Tak se to dělá, {o}."],
  bublinka: ["Ach jo. {o}. Před tebou se neschovám.", "{o}… Dobře. Vzdávám se předem."],
  kachlik: ["{o}. Úředně potvrzeno: 正.", "Devět razítek a ani jedno nakřivo. {o}."],
  cedulka: ["{o}! Tvoje jméno mám vyryté. Rydlem.", "Pamatuju si všechno, {o}. Hlavně tvou pečeť."],
  samotka: ["{o}. Tvoje kusy ponesu ráda. Všechny.", "Zvládnu to, {o}. S tebou vždycky."],
};
