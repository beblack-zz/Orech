/*
 * Vázička jako gejša — podle Střípka a zlata, Pecinky s ohněm a Bublinky jako
 * strašidla: podoba Kami (bez pozadí), Tušový lem (noční scéna v rozpité
 * tuši, zatím ve dvou návrzích) a Lampion (jde s lucernou, bez pozadí).
 * Čtvrtá podoba, Na schovávanou, je malá ikona a bydlí jinde
 * (components/characters/schovka/vazicka.ts).
 * Komponenta: components/characters/kami-buh/VazickaGejsa.astro,
 * běh: ./beh.js, společné kusy: ./spolecne.js.
 *
 *   kvety     01 Kami — dvanáct květů: před kruhem ze značky, klik ji zatočí a vymění jí květy za další měsíc (id vg1-)
 *   let       01 Kami v letu — bez kruhu, létá po úvodu Domku 2 a schovává se (id vg1-, nesmí vedle kvety)
 *   tycinka   02 Tušový lem — dokud hoří tyčinka: tančí s vějířem a kouř se za ním stáčí do tvarů (id vg2-)
 *   destnik   02 Tušový lem — hadí oko: v dešti na můstku pod deštníkem janome, zezadu (id vg3-)
 *   lampion   03 Lampion — jde na večer s papírovou lucernou (id vgl-)
 *   pruvodce  01 Kami v letu jako průvodce v rohu každé stránky (id vgp-, smí vedle všech)
 *
 * Stavba je stejná jako u Střípka (scripts/stripek-zlato): čisté generátory
 * SVG bez DOM — dostanou čas, stav simulace a vstup a vrátí značky. Běží
 * i v Node, takže jde udělat náhled jako PNG (celeSvg + sharp) a první
 * snímek se vykreslí už při sestavení stránky.
 *
 * Vrstva bez `klic` se nakreslí jednou, s `klic` se překreslí, jen když se
 * klíč změní. Vrstva s `pohyb` se nepřekresluje, když se jen hýbe: běh ji
 * posune a natočí CSS transformací (stejná čísla celeSvg převede na SVG
 * transform). Vrstva s `pruhlednost` se prolíná, vrstva s `orez` se ořízne
 * tušovou skvrnou. Id ve filtrech a přechodech jsou pevná (vg1-, vg2-,
 * vg3-, vgl-), každá podoba smí být na stránce jen jednou.
 *
 * Simulace žije v `dyn`: beh.js ji založí přes novaDynamika() a každý snímek
 * posune přes krok(). Zvuky, které má běh zahrát, krok přidá do dyn.zvuk.
 */
import { f } from "./spolecne.js";
import { kamiKvety, kamiLet, kamiPruvodce, kamiPruvodceMistr } from "./kami-kvety.js";
import { lemTycinka } from "./lem-tycinka.js";
import { lemDestnik } from "./lem-destnik.js";
import { lampion } from "./lampion.js";

/** Obsah vrstvy i s ořezem — stejně ho skládá běh i statický snímek. */
export const obsahVrstvy = (v, st) => {
  const obsah = v.kresli(st);
  return v.orez && obsah ? `<g clip-path="url(#${v.orez})">${obsah}</g>` : obsah;
};

/**
 * Celá kresba jako jedno SVG — pro náhled v Node, nebo jako statický první
 * snímek, který komponenta vloží do stránky (s třídou místo rozměrů).
 * Vrstvy s `pohyb` dostanou stejný posun a natočení jako v prohlížeči.
 */
export const celeSvg = (V, t, dyn, vstup = {}, { sirka = 900, pozadi = "#F7F1E3", trida = null } = {}) => {
  const st = V.stav(t, vstup, dyn);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${V.viewBox}" ${trida ? `class="${trida}" aria-hidden="true" focusable="false"` : `width="${sirka}" height="${sirka}"`}>` +
    `<defs>${V.defs()}</defs>` +
    (pozadi ? `<rect x="-50" y="-50" width="400" height="400" fill="${pozadi}"/>` : "") +
    V.vrstvy
      .map((v) => {
        let obsah = obsahVrstvy(v, st);
        if (v.pohyb) {
          const p = v.pohyb(st);
          obsah = `<g transform="translate(${f(p.ox + p.x)} ${f(p.oy + p.y)}) rotate(${f(p.r || 0)}) scale(${f(p.sx ?? 1)} ${f(p.sy ?? 1)}) translate(${f(-p.ox)} ${f(-p.oy)})">${obsah}</g>`;
        }
        const op = v.pruhlednost ? ` opacity="${v.pruhlednost(st)}"` : "";
        return `<g style="${v.styl || ""}"${op}>${obsah}</g>`;
      })
      .join("") +
    `</svg>`
  );
};

/** Přetočí simulaci na čas t (pro první snímek a pro klidný režim). */
export const pretoc = (V, t, vstup = {}, krokS = 1 / 60) => {
  const dyn = V.novaDynamika();
  for (let q = 0; q < t; q += krokS) V.krok(dyn, q, krokS, typeof vstup === "function" ? vstup(q) : vstup);
  dyn.zvuk.length = 0;
  return dyn;
};

export const kresby = { kvety: kamiKvety, let: kamiLet, pruvodce: kamiPruvodce, pruvodceMistr: kamiPruvodceMistr, tycinka: lemTycinka, destnik: lemDestnik, lampion };
