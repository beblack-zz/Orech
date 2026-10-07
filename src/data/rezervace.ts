import type { PostavaId } from "./parta";

/**
 * Rezervace hodin v dílně — /rezervace.
 *
 * Termíny jsou každé úterý a pátek po hodinách od 9 do 18, na měsíc
 * dopředu. Hodina je buď volná, nebo obsazená: zamlouvá se celá, pro
 * jednoho člověka nebo skupinu až čtyř lidí — žádná místa se nepočítají.
 * Cena je za člověka a hodinu.
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
