/*
 * Šamotka nese — tři přehnané podoby. Komponenta:
 * components/characters/kami-buh/SamotkaNese.astro, běh: ./beh.js.
 *
 *   v1  Kamidana — polička pro kami: nese svatyni a obětiny z porcelánu (průhledné pozadí)
 *   v2  Výpal — řez pecí s klenbou, celý výpal od sázení po poplácání
 *   v3  Sníh — zimní noc v kulatém okně, teplá Šamotka, vrabci a kočka
 *
 * Jako u Pecinky (scripts/pecinka-ohen): čisté generátory SVG bez DOM.
 * Dostanou čas, stav simulace a vstup a vrátí značky, takže běží i v Node
 * a jde z nich udělat náhled (celeSvg + sharp). Každá podoba má vrstvy:
 * vrstva bez `klic` se nakreslí jednou, s `klic` se překreslí, jen když
 * se klíč změní. Simulace žije v `dyn` (novaDynamika, krok), zvuky, které
 * má běh zahrát, krok přidává do dyn.zvuk. Id ve filtrech mají prefix
 * sn1/sn2/sn3, každá podoba smí být na stránce jen jednou.
 */
import { V1 } from "./kamidana.js";
import { V2 } from "./vypal.js";
import { V3 } from "./snih.js";

/**
 * Celá kresba jako jedno SVG — pro náhled v Node, nebo jako statický první
 * snímek, který komponenta vloží do stránky (s třídou místo rozměrů).
 */
const celeSvg = (V, t, dyn, vstup = {}, { sirka = 900, pozadi = "#F4EBDD", trida = null } = {}) => {
  const st = V.stav(t, vstup, dyn);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${V.viewBox}" ${trida ? `class="${trida}" aria-hidden="true" focusable="false"` : `width="${sirka}" height="${sirka}"`}>` +
    `<defs>${V.defs()}</defs>` +
    (pozadi ? `<rect x="-50" y="-50" width="400" height="400" fill="${pozadi}"/>` : "") +
    V.vrstvy
      .map((v) => {
        const op = v.pruhlednost ? ` opacity="${v.pruhlednost(st)}"` : "";
        return `<g style="${v.styl || ""}"${op}>${v.kresli(st)}</g>`;
      })
      .join("") +
    `</svg>`
  );
};

/** Přetočí simulaci na čas t (pro první snímek, klidný režim a začátek scény). */
const pretoc = (V, t, vstup = {}, krokS = 1 / 60) => {
  const dyn = V.novaDynamika();
  for (let q = 0; q < t; q += krokS) V.krok(dyn, q, krokS, typeof vstup === "function" ? vstup(q) : vstup);
  dyn.zvuk.length = 0;
  return dyn;
};

export const kresby = { v1: V1, v2: V2, v3: V3 };
export { celeSvg, pretoc };
