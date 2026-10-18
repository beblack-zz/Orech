/**
 * Kresby Dílny (components/dilna/kresba) jako soubory /kresby/dilna-*.svg.
 * Soubory staví [soubor].svg.ts přes _kresby.ts, komponenty Dílny si odsud
 * berou, co vložit do stránky.
 *
 * Statické kresby (police na konci, destičky hlín, dvě vinětky V ruce,
 * žároměrky) jdou celé do <img>. Ostatní se hýbou (třídy z dilna.css) nebo
 * na ně sahá skript výpalu — ty zůstávají jako <svg>, ale jejich statické
 * vrstvy jsou soubory v <image> (_vrstvy.ts) a ve stránce zbude jen to,
 * co se hýbe. Které třídy musí zůstat, je u každé kresby: „cele“ = prvek
 * se hýbe sám (nebo na jeho ohraničení záleží, transform-box: fill-box),
 * „obal“ = mění se jen průhlednost nebo poloha celé skupiny, její obsah
 * smí do souboru. Kdo přidá do kresby novou animovanou třídu, musí ji
 * dopsat sem, jinak ztuhne v obrázku.
 *
 * Text v písmu webu (Caveat) zůstává ve stránce vždycky — do obrázku se
 * písmo stránky nedostane.
 */
import { Sklad, obrazek, vyjmi, podleTrid, type Obrazek, type Volby } from "./_vrstvy";
import { regalSvg, polickaSvg } from "../../components/dilna/kresba/regal";
import { hlinaSvg, hlinyDruhy } from "../../components/dilna/kresba/hlina";
import { kruhKrok, vRuce as vRuceSvg } from "../../components/dilna/kresba/tvar";
import { suseniSvg } from "../../components/dilna/kresba/suseni";
import { pecRez, zaromerky, ranoSvg } from "../../components/dilna/kresba/pec";
import { vzornikSvg, namaceniSvg } from "../../components/dilna/kresba/glazura";
import { vRuce } from "../../data/dilna";

/** Hlína: vinětka má nad deskou prázdný papír — na stránce se ořízne */
export const HLINA_OREZ = 96;
export const HLINA_H = 620 - HLINA_OREZ;

function vyrob() {
  const sklad = new Sklad();
  const obr = (jmeno: string, svg: string) => obrazek(sklad, `dilna-${jmeno}`, svg);
  const vrstvy = (jmeno: string, svg: string, volby: Volby = {}) => vyjmi(sklad, `dilna-${jmeno}`, svg, { orez: true, ...volby }).svg;

  const kresby = {
    /* Úvod: paprsek z okna dýchá, prach v něm pluje, na hotovém hrnku jiskra */
    regal: vrstvy("regal", regalSvg(), { nechat: podleTrid({ "drg-paprsek": "cele", "drg-jiskra": "cele", "drg-prach": "cele" }) }),
    /* Konec: police s hotovými kusy */
    policka: obr("policka", polickaSvg()),
    /* Hlína: kroužek kolem bubliny pochoduje */
    hlina: vrstvy("hlina", hlinaSvg().replace('viewBox="0 0 900 620"', `viewBox="0 ${HLINA_OREZ} 900 ${HLINA_H}"`), { nechat: podleTrid({ "dhl-kruh": "cele" }) }),
    hliny: obr("hliny", hlinyDruhy()),
    /* Tvar: dvě vinětky celé, u plátů zůstane ve stránce popisek „6 mm“ */
    vRuce: Object.fromEntries(
      vRuce.map((v) => [v.id, v.id === "platy" ? { svg: vrstvy(`vruce-${v.id}`, vRuceSvg(v.id)) } : { img: obr(`vruce-${v.id}`, vRuceSvg(v.id)) }]),
    ) as Record<string, { svg?: string; img?: Obrazek }>,
    /* Na kruhu: šipky dýchají, šipka otáčení bliká, stužka z očka se kroutí (fill-box) */
    kruh: ([0, 1, 2, 3, 4, 5] as const).map((i) =>
      vrstvy(`kruh-${i}`, kruhKrok(i), { nechat: podleTrid({ "dtv-sipka": "cele", "dtv-otaceni": "cele", "dtv-stuzka": "cele" }) }),
    ),
    /* Sušení: čárky k pravítku pochodují, fólie dýchá, obrys po výpalu bliká; popisky jsou text */
    suseni: vrstvy("suseni", suseniSvg(), { nechat: podleTrid({ "dsu-cara": "cele", "dsu-folie": "obal", "dsu-vypal": "cele" }) }),
    /* Přežah: spirály se mihotají */
    prezah: vrstvy("prezah", pecRez("prezah"), { nechat: podleTrid({ "dpe-spirala": "cele" }) }),
    /* Glazura: střepy se houpou (rotate kolem bodu ve view-boxu), glazura se leskne.
       Zpoždění houpání bere CSS z :nth-child obalů střepů — pořadí zůstane modulo 3 */
    vzornik: vrstvy("vzornik", vzornikSvg(), { nechat: podleTrid({ "dgl-strep": "obal", "dgl-lesk": "cele" }), poradi: 3 }),
    namaceni: vrstvy("namaceni", namaceniSvg("dgn"), {
      nechat: podleTrid({ "dgn-kruhy": "cele", "dgn-visi": "cele", "dgn-pada": "cele", "dgn-houba": "cele" }),
    }),
    /* Ostrý výpal: žár (průhlednost podle --zar ze scripts/dilna/vypal.ts) a displej regulátoru
       zůstanou jako skupiny ve stránce, spirály se mihotají */
    pec: vrstvy("pec", pecRez("ostry", "dpo"), { nechat: podleTrid({ "dpo-zar": "obal", "dpo-rg-cisla": "obal", "dpo-spirala": "cele" }) }),
    zaromerky: [obr("zaromerky-0", zaromerky(0, "dz0")), obr("zaromerky-1", zaromerky(0.5, "dz1")), obr("zaromerky-2", zaromerky(1, "dz2"))],
    /* Ráno: pára nad pecí, paprsek z okna, lesk glazur */
    rano: vrstvy("rano", ranoSvg(), { nechat: podleTrid({ "dpr-para": "cele", "dpr-paprsek": "cele", "dpr-lesk": "cele" }) }),
  };
  return {
    kresby,
    /** Soubory regálu — první obrazovka, stránka je stahuje hned s hlavičkou */
    predem: [...kresby.regal.matchAll(/<image href="([^"]+)"/g)].map((m) => m[1]),
    soubory: sklad.soubory,
  };
}

let hotovo: ReturnType<typeof vyrob> | undefined;
/** Kresby a soubory Dílny — počítá se jednou za build */
export const dilna = () => (hotovo ??= vyrob());
