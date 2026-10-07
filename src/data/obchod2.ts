/**
 * Doplňky pro /obchod-2. Zboží zůstává v obchod.ts (na přání a naše
 * tvorba) a zdaleka.ts (keramika z Japonska s fotkami). Tady je jen to,
 * co přidal nový vzhled: texty ze stávající stránky Obchod, popisy
 * glazur, japonská jména pro naši tvorbu a odkud je keramika z Japonska.
 *
 * Pozor: texty ze staré stránky jsou tu jako kopie (stejně jako v uvod2.ts).
 * Když se tam změní, musí se změnit i tady.
 */

/** Ze stránky Obchod (pages/obchod.astro) */
export const obchodTexty = {
  perex:
    "Všechno je točené na kruhu nebo modelované, ručně glazované a vypálené v peci. Něco vzniklo u nás v dílně, něco je od tvůrců, které máme rádi — někdy až z Japonska.",
  kroky: [
    { nazev: "Vyber si", text: "Prohlédni si, co máme. Každý kus je originál — co vidíš, to dostaneš." },
    { nazev: "Napiš nám", text: "Pošli mail s názvem kousku. Potvrdíme dostupnost a domluvíme platbu." },
    { nazev: "Vyzvedni nebo pošleme", text: "Osobní odběr v dílně nebo posíláme Zásilkovnou po celém Česku." },
  ],
};

/* ——— Glazury ———
 * Jak glazura vypadá, ne z čeho je — názvy v obchod.ts jsou jména barev,
 * receptury neznáme. Klíč je název glazury malými písmeny, stejně jako
 * v kurzy2.ts (glazury), odkud se berou barvy.
 */
export const glazuraPopis: Record<string, string> = {
  celadon: "Zelenomodrá jako nefrit. Kde je glazura silnější, tam je barva hlubší — proto ke dnu tmavne.",
  tenmoku: "Skoro černá a lesklá. Na hranách, kde je vrstva tenká, prosvítá do rezava.",
  shino: "Hustá a mléčná, tu a tam do oranžova. Drobné dírky jsou po vzduchu, který z ní v peci utíkal.",
  "matná bílá": "Bílá bez lesku. Tichá, aby vynikl tvar.",
  "popelová šedá": "Šedá jako popel v ohništi. Světlo na ní nekřičí.",
  "železitá hnědá": "Hnědá do ruda, jak ji barví železo. Kde je vrstva tlustší, je skoro čokoládová.",
};

/* ——— Naše tvorba: jména na svitku ———
 * V čajovém obřadu mívá miska vlastní jméno (銘 mei). Naše kusy už jména
 * mají, tak je tu jen převádíme do znaků — visí na svitku v tokonomě.
 */
export const mei: Record<string, { znak: string; cteni: string }> = {
  "Miska Kámen": { znak: "石", cteni: "ishi" },
  "Váza Ořech": { znak: "胡桃", cteni: "kurumi" },
  "Hrnek Dvojka": { znak: "二", cteni: "ni" },
  "Talíř Kruh": { znak: "円", cteni: "en" },
  "Miska Pěna": { znak: "泡", cteni: "awa" },
  "Váza Krk": { znak: "首", cteni: "kubi" },
  "Hrnek Palec": { znak: "親指", cteni: "oyayubi" },
  "Talíř Mělký": { znak: "浅", cteni: "asa" },
};

/* ——— Keramika z Japonska ———
 * Klíč je název kusu v zdaleka.ts. Píše se jen o tradici, ze které kus
 * je, a o tom, co je vidět na fotkách — o autorech nevíme víc než jméno.
 */
export interface Druh {
  /** Nápis na víku krabice (箱書 hakogaki) */
  znak: string;
  cteni: string;
  nazev: string;
  odkud?: { mesto: string; znak: string; prefektura: string; gps: [number, number] };
  text: string;
  /** Na co se podívat na fotkách */
  detail?: string;
}

export const druhy: Record<string, Druh> = {
  Hagi: {
    znak: "萩焼",
    cteni: "hagi-yaki",
    nazev: "Hagi",
    odkud: { mesto: "Hagi", znak: "萩", prefektura: "Yamaguchi", gps: [34.408, 131.399] },
    text: "Hlína z Hagi je měkká a glazura po výpalu jemně popraská. Do prasklinek se léty vpíjí čaj a miska pomalu mění barvu — Japonci tomu říkají sedm proměn Hagi.",
    detail: "Podívej se na patu: je naříznutá. Taková pata je pro Hagi typická. Říká se, že se nařezávala, aby byl kus „vadný“ a směli ho mít i obyčejní lidé, ne jen páni z rodu Mōri.",
  },
  Banko: {
    znak: "萬古焼",
    cteni: "banko-yaki",
    nazev: "Banko",
    odkud: { mesto: "Yokkaichi", znak: "四日市", prefektura: "Mie", gps: [34.965, 136.624] },
    text: "Jméno má od razítka 萬古不易 — „navěky neměnné“ —, kterým své kusy v 18. století značil zakladatel Nunami Rōzan. Z Yokkaichi dnes pochází většina japonských hliněných hrnců na vaření donabe.",
    detail: "Zevnitř se pruhy stáčejí do spirály až ke dnu.",
  },
  "Shigaraki ware cup": {
    znak: "信楽焼",
    cteni: "shigaraki-yaki",
    nazev: "Shigaraki",
    odkud: { mesto: "Shigaraki", znak: "信楽", prefektura: "Shiga", gps: [34.958, 136.087] },
    text: "Jedna ze šesti nejstarších pecí Japonska. Hlína se tu bere z vrstev pradávného jezera Biwa a je plná zrnek živce. A před skoro každým obchodem stojí keramický tanuki pro štěstí.",
    detail: "Otoč si ho: z jedné strany je bílý a hrubý, z druhé do ruda. Tomu rudému se v Shigaraki říká hi-iro, barva ohně. Stěny jsou ořezané do hran — 面取り mentori.",
  },
  Unglazed: {
    znak: "焼締",
    cteni: "yakishime",
    nazev: "Bez glazury",
    text: "Žádná glazura, jen hlína a oheň. Japonci tomu říkají yakishime: hlína se pálí tak vysoko, že zesklovatí sama a nepropouští vodu.",
    detail: "Mřížka je vyrytá do mokré hlíny a stopy prstů po točení zůstaly vidět.",
  },
};

/** Autor „No name“ v zdaleka.ts — jak ho napsat a co k tomu říct */
export const neznamyAutor = {
  jmeno: "autor neznámý",
  text: "Sōetsu Yanagi, zakladatel japonského hnutí mingei, psal právě o krásných věcech od řemeslníků, jejichž jméno nikdo nezná.",
};

/** Ořech, Luční 235 — odsud se počítá, jak daleko kus cestoval */
export const ORECH: [number, number] = [50.02, 14.297];

/** Vzdálenost vzdušnou čarou v km (po povrchu koule) */
export function vzdalenost([a1, o1]: [number, number], [a2, o2]: [number, number] = ORECH) {
  const r = (x: number) => (x * Math.PI) / 180;
  const h = Math.sin(r(a2 - a1) / 2) ** 2 + Math.cos(r(a1)) * Math.cos(r(a2)) * Math.sin(r(o2 - o1) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
