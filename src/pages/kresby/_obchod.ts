/**
 * Stěny vitrín na Obchodu (Vlastní tvorba, Japonská keramika — kresba/uvnitr.ts)
 * jako soubory /kresby/obchod-*.svg. Soubory staví [soubor].svg.ts přes
 * _kresby.ts, Vitrina.astro si odsud bere, co vložit do stránky. Od 8. 11. 2026.
 *
 * Každá stěna je dvakrát (široká a úzká obrazovka) a má vrstvu za kusy
 * a před nimi. Statické úseky jdou do souborů v <image> (_vrstvy.ts → vyjmi),
 * ve stránce zůstane jen text (štíty a nápisy v písmu webu) a to, co se
 * houpe: „cele“ u tříd uv-houpe (lampionek, zvonek) a uv-noren (noren).
 * Kdo do kresby stěny přidá novou animovanou třídu, musí ji dopsat sem,
 * jinak ztuhne v obrázku.
 *
 * Kresba přesahuje viewBox (overflow: visible ve vitrina.css), proto se
 * soubory neořezávají (orez: false).
 */
import { Sklad, vyjmi, podleTrid } from "./_vrstvy";
import { stena } from "../../components/obchod2/kresba/uvnitr";
import { zJaponska, zDilny } from "../../data/kramek";

type Odkud = "dilna" | "japonsko";
type Rozvrzeni = "siroka" | "uzka";

export interface StenaVitriny {
  /** Celý <svg> vrstvy za kusy a před nimi — do stránky přes set:html */
  zadni: string;
  predni: string;
}

const NECHAT = podleTrid({ "uv-houpe": "cele", "uv-noren": "cele" });

function vyrob() {
  const sklad = new Sklad();
  const steny = {} as Record<Odkud, Record<Rozvrzeni, StenaVitriny>>;
  for (const odkud of ["dilna", "japonsko"] as const) {
    const n = (odkud === "japonsko" ? zJaponska : zDilny).length;
    steny[odkud] = {} as Record<Rozvrzeni, StenaVitriny>;
    for (const rozvrzeni of ["siroka", "uzka"] as const) {
      const s = stena(odkud, rozvrzeni, n);
      const g = s.g;
      const pr = (v: number) => `${((v / g.W) * 100).toFixed(3)}%`;
      /* Stejný kořen, jaký měla stěna vložená ve Vitrina.astro */
      const koren = `<svg class="o2v-kresba o2v-${rozvrzeni}" viewBox="${s.viewBox}" style="left:${pr(-g.ext)};width:${pr(g.W + 2 * g.ext)}" preserveAspectRatio="xMidYMin meet" aria-hidden="true">`;
      const vrstva = (kde: "zadni" | "predni", obsah: string) =>
        vyjmi(sklad, `obchod-${odkud}-${rozvrzeni}-${kde}`, `${koren}${obsah}</svg>`, { orez: false, nechat: NECHAT }).svg;
      steny[odkud][rozvrzeni] = { zadni: vrstva("zadni", s.zadni), predni: vrstva("predni", s.predni) };
    }
  }
  return { steny, soubory: sklad.soubory };
}

let hotovo: ReturnType<typeof vyrob> | undefined;
/** Stěny vitrín a jejich soubory — počítá se jednou za build */
export const obchod = () => (hotovo ??= vyrob());
