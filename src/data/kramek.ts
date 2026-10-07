/**
 * Zboží v krámku na /obchod-2 jedním seznamem: keramika z Japonska
 * (zdaleka.ts, s fotkami) a kusy z dílny na přání (obchod.ts). Kus bez
 * fotek stojí v bedně zabalený v novinách; jakmile dostane `fotky`
 * v obchod.ts, ukáže se v krámku fotka.
 *
 * `id` je stejné jako v šátku (zdaleka-0…, na-prani-0…) — šátek si
 * vybrané kusy pamatuje v prohlížeči, tak se nesmí měnit.
 *
 * Jen pro build: tahá obrázky, do skriptů v prohlížeči nepatří.
 */
import type { Pohled } from "./zdaleka";
import { zdaleka } from "./zdaleka";
import { produkty } from "./obchod";
import type { Tvar } from "./obchod";
import { druhy, neznamyAutor } from "./obchod2";
import type { Druh } from "./obchod2";

export interface KusVKramku {
  id: string;
  nazev: string;
  /** Jak je napsaná v datech, např. „1 500 Kč“ */
  cena: string;
  autor: string;
  odkud: "japonsko" | "dilna";
  /** První je hlavní. Prázdné = kus je ještě zabalený v novinách. */
  fotky: Pohled[];
  /** Podle tvaru se balí do novin (kusy z Japonska ho nepotřebují) */
  tvar?: Tvar;
  glazura?: string;
  novinka: boolean;
  druh?: Druh;
  /** Autor „No name“: co k tomu říct */
  neznamy?: string;
}

export const zJaponska: KusVKramku[] = zdaleka.map((k, i) => ({
  id: `zdaleka-${i}`,
  nazev: k.name,
  cena: k.price,
  autor: k.author === "No name" ? neznamyAutor.jmeno : k.author,
  odkud: "japonsko",
  fotky: [{ src: k.src, alt: k.alt, popis: "Zepředu" }, ...k.dalsi],
  novinka: false,
  druh: druhy[k.name],
  neznamy: k.author === "No name" ? neznamyAutor.text : undefined,
}));

export const zDilny: KusVKramku[] = produkty.map((k, i) => ({
  id: `na-prani-${i}`,
  nazev: k.name,
  cena: k.price ?? "",
  autor: k.author,
  odkud: "dilna",
  fotky: k.fotky ?? [],
  tvar: k.shape,
  glazura: k.glaze,
  novinka: k.tagKind === "new",
}));

/** Všechno v pořadí, v jakém to stojí v krámku (a jak se v detailu listuje) */
export const kramek = [...zJaponska, ...zDilny];

/** „1 240 Kč“ → číslo a měna zvlášť, na cenovku */
export const cenovka = (cena: string) => {
  const m = cena.match(/^(.*?)\s*(Kč)$/);
  return m ? { castka: m[1], mena: m[2] } : { castka: cena, mena: "" };
};
