export type Tvar = "bowl" | "vase" | "mug" | "plate";

export interface Produkt {
  name: string;
  /** Chybí u kusů, které nejsou na prodej — viz `tvorba`. */
  price?: string;
  shape: Tvar;
  author: string;
  glaze: string;
  tag?: string;
  tagKind?: "new" | "last";
}

/** Jediný zdroj zboží. Homepage zobrazuje první čtyři, /obchod všechno. */
export const produkty: Produkt[] = [
  { name: "Miska Jaro", price: "640 Kč", shape: "bowl", author: "Jiřík", glaze: "Matná bílá", tag: "Novinka", tagKind: "new" },
  { name: "Váza úzká", price: "1 240 Kč", shape: "vase", author: "Renča", glaze: "Železitá hnědá" },
  { name: "Hrnek Ranní", price: "480 Kč", shape: "mug", author: "Jiřík", glaze: "Celadon" },
  { name: "Talíř plochý", price: "720 Kč", shape: "plate", author: "Jiřík", glaze: "Popelová šedá", tag: "Poslední kus", tagKind: "last" },
  { name: "Miska hluboká", price: "580 Kč", shape: "bowl", author: "Renča", glaze: "Tenmoku" },
  { name: "Hrnek Večerní", price: "520 Kč", shape: "mug", author: "Jiřík", glaze: "Matná bílá", tag: "Novinka", tagKind: "new" },
  { name: "Váza široká", price: "1 680 Kč", shape: "vase", author: "Renča", glaze: "Shino" },
  { name: "Talíř dezertní", price: "540 Kč", shape: "plate", author: "Jiřík", glaze: "Celadon" },
];

/**
 * Kusy, co nejsou na prodej — ukázka, co z dílny leze. Bez ceny;
 * proto je `price` v Produktu volitelná.
 */
export const tvorba: Produkt[] = [
  { name: "Miska Kámen", shape: "bowl", author: "Renča", glaze: "Tenmoku" },
  { name: "Váza Ořech", shape: "vase", author: "Jiřík", glaze: "Železitá hnědá" },
  { name: "Hrnek Dvojka", shape: "mug", author: "Renča", glaze: "Shino" },
  { name: "Talíř Kruh", shape: "plate", author: "Jiřík", glaze: "Popelová šedá" },
  { name: "Miska Pěna", shape: "bowl", author: "Jiřík", glaze: "Matná bílá" },
  { name: "Váza Krk", shape: "vase", author: "Renča", glaze: "Celadon" },
  { name: "Hrnek Palec", shape: "mug", author: "Jiřík", glaze: "Tenmoku" },
  { name: "Talíř Mělký", shape: "plate", author: "Renča", glaze: "Shino" },
];
