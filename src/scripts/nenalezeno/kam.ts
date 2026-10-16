/**
 * Kam asi člověk chtěl. Z adresy, která na webu není, zkusí uhodnout stránku,
 * která na něm je: překlep (/dilnaa), starý název (/open-studio/cenik),
 * slovo bez diakritiky nebo anglicky (/shop, /kontakt).
 *
 * Čistý modul bez `window` — stránka 404 ho volá v prohlížeči
 * (scripts/nenalezeno/hlavni.ts), ale jde vyzkoušet i v Node.
 */
export interface Cil {
  href: string;
  nazev: string;
  /** Slova bez diakritiky, pod kterými stránku někdo může hledat */
  slova: string[];
}

export const CILE: Cil[] = [
  { href: "/kurzy-2", nazev: "Kurzy a termíny", slova: ["kurzy", "kurz", "terminy", "termin", "workshop", "workshopy", "seminar", "seminare", "deti", "krouzek", "lekce", "courses"] },
  { href: "/dilna", nazev: "Dílna", slova: ["dilna", "openstudio", "open", "studio", "atelier", "cenik", "clenstvi", "tocit", "kruh", "glazovani"] },
  { href: "/rezervace", nazev: "Rezervace", slova: ["rezervace", "rezervovat", "rezervuj", "booking", "objednat", "objednavka", "prihlaska", "kalendar"] },
  { href: "/obchod-2", nazev: "Obchod", slova: ["obchod", "eshop", "shop", "kramek", "produkty", "produkt", "kosik", "hrnky", "hrnek", "misky"] },
  { href: "/parta-2", nazev: "Parta", slova: ["parta", "postavicky", "kami", "stripek", "hlinka", "kapka", "pecinka", "vazicka", "bublinka", "kachlik", "cedulka", "samotka"] },
  { href: "/o-nas-2", nazev: "O nás", slova: ["onas", "nas", "pribeh", "about", "jirik", "renca", "lektori", "kdo"] },
  { href: "/kontakt", nazev: "Kontakt", slova: ["kontakt", "kontakty", "telefon", "email", "mail", "adresa", "mapa", "kudy", "kde", "otevreno", "oteviraci", "contact"] },
  { href: "/domek-2", nazev: "Domek", slova: ["domek", "dum", "prohlidka", "zahrada"] },
  { href: "/kurzy-2#poukaz", nazev: "Dárkový poukaz", slova: ["poukaz", "poukazy", "darkovy", "darek", "voucher"] },
];

/** Malá písmena bez diakritiky; z adresy zbydou jen slova. */
export const slovaZAdresy = (cesta: string): string[] => {
  let s = cesta;
  try {
    s = decodeURIComponent(cesta);
  } catch {}
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\.(html?|php|aspx?)$/, "")
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1 && !/^\d+$/.test(w));
};

/** Kolik úprav dělí dvě slova: vložení, smazání, záměna a prohození sousedních písmen (obchdo → obchod). */
const vzdalenost = (a: string, b: string) => {
  let predtim: number[] = [];
  let radek = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const novy = [i];
    for (let j = 1; j <= b.length; j++) {
      novy[j] = Math.min(radek[j] + 1, novy[j - 1] + 1, radek[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) novy[j] = Math.min(novy[j], predtim[j - 2] + 1);
    }
    predtim = radek;
    radek = novy;
  }
  return radek[b.length];
};

/** Jak moc si jsou dvě slova podobná, 0…1. Začátek slova se počítá skoro jako shoda (kurzy-keramiky → kurzy). */
const podoba = (a: string, b: string) => {
  if (a === b) return 1;
  const kratsi = Math.min(a.length, b.length);
  if (kratsi >= 4 && (a.startsWith(b) || b.startsWith(a))) return 0.9;
  return 1 - vzdalenost(a, b) / Math.max(a.length, b.length);
};

/** Nejpodobnější stránka webu, nebo null, když se adresa ničemu nepodobá. */
export function nejbliz(cesta: string, cile: Cil[] = CILE): Cil | null {
  const slova = slovaZAdresy(cesta);
  /* „open-studio“ i „o-nas“ se hledají i slepené */
  const zkus = [...slova, ...slova.slice(0, -1).map((w, i) => w + slova[i + 1])];
  let nej: Cil | null = null;
  let nejvic = 0.7;
  for (const c of cile)
    for (const w of zkus)
      for (const s of c.slova) {
        const p = podoba(w, s);
        if (p > nejvic) {
          nejvic = p;
          nej = c;
        }
      }
  return nej;
}
