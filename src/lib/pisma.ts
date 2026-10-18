/**
 * Webová písma: jeden zúžený woff2 na řez místo fontsource podmnožin
 * latin + latin-ext. Soubory v public/fonts/web/ vyrábí
 * scripts/pisma/podmnozina.py (latinka, Latin-1, čeština, typografie);
 * variabilní osy zůstávají celé (Fraunces opsz/wght/SOFT/WONK,
 * Newsreader wght, kurzíva navíc opsz). Jména rodin jsou stejná jako
 * dřív, proměnné v parta2.css se nemění.
 *
 * @font-face skládá Hlava.astro (dřív styles/pisma.css). Každá adresa nese
 * otisk obsahu (?v=…), takže si prohlížeč písmo smí nechat napořád
 * (public/_headers) a po přegenerování písma dostane rovnou nový soubor.
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const otisky = new Map<string, string>();

/** Adresa souboru z public/ s otiskem obsahu; když soubor chybí, zůstane holá */
export function sOtiskem(adresa: string): string {
  let otisk = otisky.get(adresa);
  if (otisk === undefined) {
    try {
      otisk = createHash("sha1").update(fs.readFileSync(path.join(process.cwd(), "public", adresa))).digest("hex").slice(0, 10);
    } catch {
      otisk = "";
    }
    otisky.set(adresa, otisk);
  }
  return otisk ? `${adresa}?v=${otisk}` : adresa;
}

const rez = (rodina: string, styl: string, vaha: string, soubor: string, format = "woff2") =>
  `@font-face{font-family:'${rodina}';font-style:${styl};font-display:swap;font-weight:${vaha};src:url(${sOtiskem(`/fonts/web/${soubor}.woff2`)}) format('${format}')}`;

/** @font-face latinkových řezů — na každé stránce stejný, přechod mezi stránkami ho nechá na místě */
export const latinka = () =>
  [
    rez("Fraunces Variable", "normal", "100 900", "fraunces-normal", "woff2-variations"),
    rez("Fraunces Variable", "italic", "100 900", "fraunces-italic", "woff2-variations"),
    rez("Newsreader Variable", "normal", "200 800", "newsreader-normal", "woff2-variations"),
    /* kurzíva s osou opsz: drobné popisky (10,5–14,5 px) vypadají s optickou velikostí jinak než s pevnou 16 */
    rez("Newsreader Variable", "italic", "200 800", "newsreader-italic", "woff2-variations"),
    rez("Caveat", "normal", "400", "caveat-400"),
    rez("Caveat", "normal", "600", "caveat-600"),
  ].join("");

/** Písmo textu a hlavičky — je na první obrazovce každé stránky, proto se stahuje hned */
export const prvniPismo = () => sOtiskem("/fonts/web/newsreader-normal.woff2");
