import type { PostavaId } from "./parta";
import { veDnySlovy, otevrenoSlovy } from "./rezervace";

/**
 * Doplňky pro /o-nas. Lidé, milníky a texty o dílně jsou v uvod2.ts
 * (lide, milniky, oDilne) — tady je jen to, co přidal nový vzhled:
 * svitek s příběhem dílny, co říká Střípek u kintsugi, kdo si přisedne
 * ke stolu, co říká parta ke kreslenému ensō
 * a pár vět ze stránky O nás, které v uvod2.ts nejsou.
 *
 * Pozor: věty ze staré stránky jsou tu jako kopie. Když se tam změní,
 * musí se změnit i tady.
 */

/** Ze stránky O nás (pages/o-nas.astro) */
export const oNasTexty = {
  lektori:
    "Kurzy vedou dva lektoři, každý s vlastním rukopisem. Pro děti, dospělé, začátečníky, i pro pokročilé, kteří si chtějí přijít jen sednout a rozjímat u hlíny.",
  adresa: "Luční 235, Ořech.",
  /* Otevírací doba se nepřepisuje ručně — bere se z Rezervace */
  oteviraci: `Dílna je otevřená ${veDnySlovy} ${otevrenoSlovy}.`,
};

/* ——— Svitek ———
 *
 * Příběh dílny jako obrázkový svitek 絵巻 emaki: měsíc po měsíci od
 * havárie v garáži až po dnešek. Čte se zprava doleva jako opravdový
 * svitek a obloha nad ním jde z noci do večera — první rok dílny jako
 * jeden den. Texty jsou milníky z uvod2.ts (páruje se podle měsíce),
 * tady je jen kdo z party u toho byl a co k tomu říká.
 *
 * Na stránce je místo svitku teď rok dílny (onas2/Rok.astro) — z téhle
 * tabulky bere denní dobu nad každým měsícem;
 * repliky a Svitek.astro zůstaly pro případ, že by se svitek vracel.
 */
export interface Scena {
  /** Měsíc v roce 2026 jako v uvod2.ts (milniky.m); 0 = teď */
  m: number;
  kdo: PostavaId;
  replika: string;
  /** Denní doba nad touhle scénou */
  hodina: number;
  /** Id šupinky zlata, která se ve scéně schovávala (už jen Svitek.astro) */
  zlato: string;
}

export const sceny: Scena[] = [
  { m: 2, kdo: "kapka", replika: "To jsem nebyla já. Teda… možná trochu.", hodina: 4.6, zlato: "unor" },
  { m: 3, kdo: "kachlik", replika: "Rovně. Ještě rovněji. Tak. Teď.", hodina: 5.9, zlato: "brezen" },
  { m: 4, kdo: "vazicka", replika: "Opatrně se mnou. Jsem starožitnost.", hodina: 7.3, zlato: "duben" },
  { m: 5, kdo: "samotka", replika: "Skříňky? To jsou police, co se stydí.", hodina: 9, zlato: "kveten" },
  { m: 6, kdo: "cedulka", replika: "Fotka, popisek, jméno. To umím.", hodina: 11, zlato: "cerven" },
  { m: 7, kdo: "pecinka", replika: "Tady budu stát. Měřte pořádně.", hodina: 13, zlato: "cervenec" },
  { m: 8, kdo: "hlinka", replika: "Přivezli mě! Celý pytel mě.", hodina: 15, zlato: "srpen" },
  { m: 9, kdo: "bublinka", replika: "Tolik nových lidí. Nikdo si mě nevšimne.", hodina: 16.8, zlato: "zari" },
  { m: 0, kdo: "stripek", replika: "A pokračování příště. Klidně s chybami.", hodina: 18.3, zlato: "ted" },
];

/* ——— Kintsugi ———
 * Zlato leží na šátku kolem misky (onas2/Kintsugi.astro): co šupinka, to
 * jedna spára. Co k tomu řekne Střípek (scripts/onas2/kintsugi.ts).
 */
export const kintsugiReakce = {
  prvni: "Lechtá to. Ale hezky. Pokračuj.",
  pulka: "Už se v tom zlatě skoro vidím.",
  hotovo: "Zlato! Teď jsem nejhezčí miska v dílně. Teda já jsem hrnek. Ale i tak.",
  zaMe: "Za tebe? No dobře. Ale chyby se nejlíp spravují vlastníma rukama.",
  znovu: "Zase rozbitá? Nevadí. Aspoň bude víc zlata.",
};

/* ——— Ichi-go ichi-e ———
 * Stůl v dílně (onas2/Spolu.astro): kolik je míst na hodině, tolik židlí.
 * Kdo si přisedne, řekne svoje a cena za člověka se přepočítá podle
 * jízdného z rezervace.ts (scripts/onas2/spolu.ts).
 */
export const spoluMista: { kdo: PostavaId; text: string }[] = [
  { kdo: "hlinka", text: "Můžu si přisednout? Nesu hlínu pro všechny." },
  { kdo: "bublinka", text: "Nikoho tu neznám. Tak aspoň někoho poznám." },
  { kdo: "kapka", text: "Sednu si k vodě. Kdyby si někdo potřeboval namočit ruce." },
  { kdo: "pecinka", text: "U stolu je teplo. To budu asi já." },
];

/* ——— Ensō ———
 * Co řekne parta ke kruhu, který si člověk nakreslí. Dokonalost se tu
 * nehodnotí — každý tah dostane něco hezkého. Pořadí je pořadí, ve kterém
 * se pravidla zkoušejí (scripts/onas2/enso.ts).
 */
export type EnsoDruh = "kratky" | "mrnavy" | "obri" | "dvakrat" | "otevreny" | "kulaty" | "krivy" | "jiny";

export const ensoReakce: Record<EnsoDruh, { kdo: PostavaId; text: string }> = {
  kratky: { kdo: "hlinka", text: "To je spíš čárka. Moc hezká čárka. Zkus to dokola." },
  mrnavy: { kdo: "bublinka", text: "Tak malý, že se do něj vejdu jen já. Beru!" },
  obri: { kdo: "pecinka", text: "Přes celý papír! Odvaha se cení." },
  dvakrat: { kdo: "kapka", text: "Dvakrát dokola! Mně se z toho taky točí hlava." },
  otevreny: { kdo: "vazicka", text: "Otevřené ensō. Nechává místo pro to, co teprve přijde." },
  kulaty: { kdo: "kachlik", text: "Skoro dokonalý. Já bych ho bral. Ale tady se dokonalost nenosí." },
  krivy: { kdo: "stripek", text: "Křivý? Ne. Svůj." },
  jiny: { kdo: "samotka", text: "Tenhle se povedl. Nikomu ho nedávej." },
};

/* ——— Skupinové foto ——— */
export const foto = {
  odpocet: ["3", "2", "1"],
  /** „Hai, chīzu!“ — co se v Japonsku říká místo „sýr“ */
  cheese: "はい、チーズ!",
  vysledky: [
    "Někdo vždycky mrkne.",
    "Bublinka zase utekla.",
    "Kachlík stál rovně. Jako jediný.",
    "Tahle se povedla. Skoro.",
  ],
};
