export type StavKurzu = "open" | "urgent" | "full";

export interface Kurz {
  /** Datum konání. Pozor: měsíce jsou od 0, takže 8 = září. */
  date: Date;
  title: string;
  /** Rozsah a čas, např. „4 lekce · středy 18:00“ */
  format: string;
  lektor: string;
  capacity: string;
  state: StavKurzu;
  price: string;
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
    date: new Date(2026, 8, 16),
    title: "Kurz kruhu pro začátečníky",
    format: "4 lekce · středy 18:00",
    lektor: "Jiřík",
    capacity: "6 / 8 míst",
    state: "open",
    price: "3 800 Kč",
    desc: "Naučíš se základy točení na kruhu — centrovat, vytahovat, tvarovat. Čtyři večery, vlastní tempo.",
  },
  {
    date: new Date(2026, 8, 26),
    title: "Víkendový workshop — mísy & talíře",
    format: "2 dny · so–ne 10:00",
    lektor: "Renča",
    capacity: "poslední místo",
    state: "urgent",
    price: "2 400 Kč",
    desc: "Dva dny u kruhu zaměřené na ploché tvary. Glazování v ceně, hotové kousky vyzvedneš za 2 týdny.",
  },
  {
    date: new Date(2026, 9, 10),
    title: "Glazování — pokročilý seminář",
    format: "1 den · sobota 09:00",
    lektor: "Jiřík",
    capacity: "obsazeno",
    state: "full",
    price: "1 900 Kč",
    desc: "Teorie i praxe glazur — oxidace, redukce, vrstvení. Pro ty, kdo už mají za sebou pár výpalů.",
  },
  {
    date: new Date(2026, 9, 17),
    title: "Rodinná dílna — děti od 6 let",
    format: "1 den · sobota 14:00",
    lektor: "Renča",
    capacity: "4 / 10 míst",
    state: "open",
    price: "890 Kč / rodina",
    desc: "Modelování bez kruhu, vhodné pro děti i rodiče. Každý si odnese vlastní výtvor.",
  },
  {
    date: new Date(2026, 9, 24),
    title: "Kurz kruhu — pokročilí",
    format: "6 lekcí · soboty 10:00",
    lektor: "Renča",
    capacity: "3 / 6 míst",
    state: "open",
    price: "5 200 Kč",
    desc: "Víčka, džbány, sady. Pro ty, kdo zvládají základy a chtějí se posunout dál.",
  },
  {
    date: new Date(2026, 10, 7),
    title: "Zážitkový workshop pro páry",
    format: "1 den · sobota 16:00",
    lektor: "Jiřík",
    capacity: "5 / 6 párů",
    state: "open",
    price: "1 600 Kč / pár",
    desc: "Společné točení, dvě hodiny u kruhu, víno v ceně. Ideální dárek.",
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
