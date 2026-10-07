/**
 * Keramika zdaleka — kusy z Japonska, které v obchodě máme. Používá je
 * /obchod (mřížka s fotkami) i /obchod-2 (krabice z paulovnie). Hlavní
 * fotka je upravená do čtverce ve stylu webu (src/images), další pohledy
 * jsou originály z dílny (fotoorech).
 *
 * Kde se kus vzal a co o něm říct, je v obchod2.ts (druhy) — páruje se
 * podle názvu.
 */
import type { ImageMetadata } from "astro";
import zdaleka1 from "../images/zdaleka-1.webp";
import zdaleka2 from "../images/zdaleka-2.webp";
import zdaleka3 from "../images/zdaleka-3.webp";
import zdaleka4 from "../images/zdaleka-4.webp";
import unglazed2 from "../../fotoorech/unglazed2.jpg";
import hagi2 from "../../fotoorech/hagi2.jpg";
import banko2 from "../../fotoorech/banko2.jpg";
import shigaraki1 from "../../fotoorech/shigaraki1.jpg";
import shigaraki3 from "../../fotoorech/shigaraki3.jpg";

export interface Pohled {
  src: ImageMetadata;
  alt: string;
  /** Krátký popisek pod fotkou — co je na tomhle pohledu vidět */
  popis: string;
}

export interface KusZdaleka {
  src: ImageMetadata;
  alt: string;
  name: string;
  author: string;
  price: string;
  /** Další pohledy na tentýž kus */
  dalsi: Pohled[];
}

export const zdaleka: KusZdaleka[] = [
  {
    src: zdaleka1,
    alt: "Neglazovaná miska se zdobením mřížky na poličce",
    name: "Unglazed",
    author: "Keiichi Miyagawa",
    price: "1 500 Kč",
    dalsi: [{ src: unglazed2, alt: "Pohled do neglazované misky shora: hnědé dno posypané zrnky a světlý okraj", popis: "Zevnitř" }],
  },
  {
    src: zdaleka2,
    alt: "Miska s modrozelenou stékající glazurou na poličce",
    name: "Hagi",
    author: "Seigan Yamane",
    price: "2 500 Kč",
    dalsi: [{ src: hagi2, alt: "Pohled do misky Hagi: na dně se slila zelená glazura, okraj je do hněda", popis: "Zevnitř" }],
  },
  {
    src: zdaleka3,
    alt: "Světlá miska s šedými točenými pruhy na poličce",
    name: "Banko",
    author: "Teruhisa Sato",
    price: "700 Kč",
    dalsi: [{ src: banko2, alt: "Pohled do misky Banko shora: šedohnědé pruhy se stáčejí do spirály až ke dnu", popis: "Zevnitř" }],
  },
  {
    src: zdaleka4,
    alt: "Hrnek ze Shigaraki s hrubou světlou glazurou na poličce",
    name: "Shigaraki ware cup",
    author: "No name",
    price: "800 Kč",
    dalsi: [
      { src: shigaraki1, alt: "Hrnek ze Shigaraki z druhé strany: do ruda, s bílými zrnky a světlým uchem", popis: "Z druhé strany" },
      { src: shigaraki3, alt: "Pohled do hrnku ze Shigaraki: uvnitř tmavě hnědá glazura", popis: "Zevnitř" },
    ],
  },
];
