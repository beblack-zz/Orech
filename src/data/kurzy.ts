export type StavKurzu = "open" | "urgent" | "full";

export interface Kurz {
  day: string;
  month: string;
  title: string;
  meta: string;
  capacity: string;
  state: StavKurzu;
  price: string;
  desc: string;
}

/**
 * Jediný zdroj termínů. Homepage zobrazuje první čtyři, /kurzy všechny.
 * Lektory drž v souladu s týmem na /o-nas.
 */
export const kurzy: Kurz[] = [
  {
    day: "14",
    month: "Bře",
    title: "Kurz kruhu pro začátečníky",
    meta: "4 lekce · středy 18:00 · Jiřík",
    capacity: "6 / 8 míst",
    state: "open",
    price: "3 800 Kč",
    desc: "Naučíš se základy točení na kruhu — centrovat, vytahovat, tvarovat. Čtyři večery, vlastní tempo.",
  },
  {
    day: "22",
    month: "Bře",
    title: "Víkendový workshop — mísy & talíře",
    meta: "2 dny · so–ne 10:00 · Renča",
    capacity: "poslední místo",
    state: "urgent",
    price: "2 400 Kč",
    desc: "Dva dny u kruhu zaměřené na ploché tvary. Glazování v ceně, hotové kousky vyzvedneš za 2 týdny.",
  },
  {
    day: "05",
    month: "Dub",
    title: "Glazování — pokročilý seminář",
    meta: "1 den · sobota 09:00 · Jiřík",
    capacity: "obsazeno",
    state: "full",
    price: "1 900 Kč",
    desc: "Teorie i praxe glazur — oxidace, redukce, vrstvení. Pro ty, kdo už mají za sebou pár výpalů.",
  },
  {
    day: "12",
    month: "Dub",
    title: "Rodinná dílna — děti od 6 let",
    meta: "1 den · sobota 14:00 · Renča",
    capacity: "4 / 10 míst",
    state: "open",
    price: "890 Kč / rodina",
    desc: "Modelování bez kruhu, vhodné pro děti i rodiče. Každý si odnese vlastní výtvor.",
  },
  {
    day: "19",
    month: "Dub",
    title: "Kurz kruhu — pokročilí",
    meta: "6 lekcí · soboty 10:00 · Renča",
    capacity: "3 / 6 míst",
    state: "open",
    price: "5 200 Kč",
    desc: "Víčka, džbány, sady. Pro ty, kdo zvládají základy a chtějí se posunout dál.",
  },
  {
    day: "26",
    month: "Dub",
    title: "Zážitkový workshop pro páry",
    meta: "1 den · sobota 16:00 · Jiřík",
    capacity: "5 / 6 párů",
    state: "open",
    price: "1 600 Kč / pár",
    desc: "Společné točení, dvě hodiny u kruhu, víno v ceně. Ideální dárek.",
  },
];
