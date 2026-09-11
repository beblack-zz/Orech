/** `pripravujeme` = termín je vypsaný, ale zápis ještě neběží. */
export type StavKurzu = "pripravujeme" | "open" | "urgent" | "full";

export interface Kurz {
  /**
   * Datum konání. Pozor: měsíce jsou od 0, takže 10 = listopad.
   * Musí padnout na den v týdnu, který slibuje `format` („středy“, „soboty“).
   */
  date: Date;
  title: string;
  /** Rozsah a čas, např. „4 lekce · středy 18:00“ */
  format: string;
  lektor: string;
  capacity: string;
  state: StavKurzu;
  /** Nepovinná — dokud se zápis neotevře, cena se nikde neukazuje. */
  price?: string;
  desc: string;
}

/**
 * Jediný zdroj termínů. Nikde jinde termíny nepiš.
 *
 * Filtruje se podle dnešního data, takže propadlé kurzy ze stránek samy
 * zmizí a počty v hlavičkách se dopočítají. Web je statický — filtr se
 * vyhodnotí při buildu, takže po vypršení termínu je potřeba znovu
 * sestavit (typicky stačí naplánovaný build jednou denně).
 */
const vsechnyKurzy: Kurz[] = [
  {
    date: new Date(2026, 9, 6), // úterý — sedí na „úterky 15:00“, začátek trimestru
    title: "Malý & Velký",
    format: "10 lekcí · trimestr · úterky 15:00–16:30 · 90 min · s pomocí",
    lektor: "JIRO",
    capacity: "",
    state: "pripravujeme",
    desc: "Modelování, točení, příprava hlíny, obrábění, glazování, tvoření podle předlohy, volná tvorba.",
  },
  {
    date: new Date(2026, 9, 6), // úterý — stejný den jako Malý & Velký, jen večer
    title: "Velký & Velký",
    format: "10 lekcí · trimestr · úterky 17:00–18:30 · 90 min · s pomocí",
    lektor: "JIRO",
    capacity: "",
    state: "pripravujeme",
    desc: "Pro velké a pro dospělé. Modelování, točení, příprava hlíny, obrábění, glazování, tvoření podle předlohy, volná tvorba.",
  },
  {
    date: new Date(2026, 10, 3), // úterý — sedí na „úterky 10:00“
    title: "Kurz kruh pro začátečníky",
    format: "4 lekce · měsíc · úterky 10:00–11:30",
    lektor: "JIRO",
    capacity: "6 / 8 míst",
    state: "pripravujeme",
    desc: "Příprava hlíny a náčiní, základy točení na kruhu (centrování, vytahování, tvarování), obrábění.",
  },
  {
    date: new Date(2026, 10, 14), // sobota
    title: "Víkendový workshop — mísy & talíře",
    format: "2 dny · so–ne 10:00",
    lektor: "Renča",
    capacity: "poslední místo",
    state: "pripravujeme",
    desc: "Dva dny u kruhu zaměřené na ploché tvary. Glazování v ceně, hotové kousky vyzvedneš za 2 týdny.",
  },
  {
    date: new Date(2026, 10, 21), // sobota
    title: "Glazování — pokročilý seminář",
    format: "1 den · sobota 09:00",
    lektor: "JIRO",
    capacity: "obsazeno",
    state: "pripravujeme",
    desc: "Teorie i praxe glazur — oxidace, redukce, vrstvení. Pro ty, kdo už mají za sebou pár výpalů.",
  },
  {
    date: new Date(2026, 10, 28), // sobota — sedí na „soboty 10:00“
    title: "Kurz kruhu — pokročilí",
    format: "6 lekcí · soboty 10:00",
    lektor: "Renča",
    capacity: "3 / 6 míst",
    state: "pripravujeme",
    desc: "Víčka, džbány, sady. Pro ty, kdo zvládají základy a chtějí se posunout dál.",
  },
];

const dnes = new Date();
dnes.setHours(0, 0, 0, 0);

/** Jen kurzy, které ještě nebyly, seřazené od nejbližšího. */
export const kurzy: Kurz[] = vsechnyKurzy
  .filter((k) => k.date >= dnes)
  .sort((a, b) => a.date.getTime() - b.date.getTime());

const MESICE = ["Led", "Úno", "Bře", "Dub", "Kvě", "Čvn", "Čvc", "Srp", "Zář", "Říj", "Lis", "Pro"];

export const den = (d: Date) => String(d.getDate()).padStart(2, "0");
export const mesic = (d: Date) => MESICE[d.getMonth()];

/** „4 lekce · středy 18:00 · Jiřík“ */
export const popisKurzu = (k: Kurz) => `${k.format} · ${k.lektor}`;

/**
 * Co se u termínu ukáže místo počtu míst. Ve fázi „připravujeme“ zůstává
 * `capacity` v datech nedotčené — až se zápis otevře, stačí přepnout `state`
 * zpátky a obsazenost se vrátí sama.
 */
export const stavPopis = (k: Kurz) => (k.state === "pripravujeme" ? "připravujeme" : k.capacity);

/** Popisek tlačítka u termínu. */
export const tlacitkoPopis = (k: Kurz) =>
  k.state === "pripravujeme" ? "Dám vědět" : k.state === "full" ? "Náhradník" : "Rezervovat";

/** Plné tmavé tlačítko patří jen tam, kde se dá zapsat hned. */
export const lzeRezervovat = (k: Kurz) => k.state === "open" || k.state === "urgent";

/**
 * Sezóna podle prvního nadcházejícího termínu — aby v hlavičce
 * nezůstalo natvrdo „Jaro 2026“, až budou termíny na podzim.
 */
export function sezona(seznam: Kurz[] = kurzy): string | null {
  const prvni = seznam[0];
  if (!prvni) return null;
  const m = prvni.date.getMonth();
  const nazev = m >= 2 && m <= 4 ? "Jaro" : m >= 5 && m <= 7 ? "Léto" : m >= 8 && m <= 10 ? "Podzim" : "Zima";
  return `${nazev} ${prvni.date.getFullYear()}`;
}
