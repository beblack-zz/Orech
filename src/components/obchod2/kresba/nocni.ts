/**
 * Krámek jen v noci (od 8. 11. 2026): z denní kresby (scena.ts) se při
 * buildu udělá noční a rozdělí se na to, co je hotový obrázek, a to, co
 * zůstane živé.
 *
 *   vzadu     zadní kresba a vnitřky v noci — obrázek POD zbožím
 *   vpredu    přední kresba v noci bez lampionů — obrázek NAD zbožím
 *   lampiony  sedm lampionů na stříšce i se svými definicemi — živé SVG,
 *             kývají se ve větru a po ťuknutí se rozhoupou
 *   svetla    vrstva světel jako dřív — živé SVG; definice, na které sahá
 *             (tvary a přechody z denní kresby, id kd-…), nese s sebou
 *
 * Obrázky (public/kramek/) vyrábí `node scripts/kramek-noc.mjs` přes
 * headless Edge ze stránky /kresby/kramek, která ukáže vzadu a vpredu
 * s písmy a styly webu, pro každé roční období zvlášť (strom za domem,
 * sníh). `otisk` je otisk nočních vrstev — skript ho zapíše vedle obrázků
 * a Kramek.astro při buildu varuje, když kresba a obrázky nesedí.
 */
import { createHash } from "node:crypto";
import { scena, nocni, teple, prebarvi } from "./scena";
import { rozloz, definiceZe, type Uzel } from "../../../pages/kresby/_vrstvy";
import type { Sezona } from "../../../data/uvod2";

export interface NocniKramek {
  vzadu: string;
  vpredu: string;
  lampiony: string;
  svetla: string;
  otisk: string;
}

/** Všechna roční období, pro která jsou obrázky */
export const SEZONY: Sezona[] = ["zima", "predjari", "jaro", "leto", "podzim"];
export const VRSTVY = ["vzadu", "vpredu"] as const;
export type VrstvaObrazku = (typeof VRSTVY)[number];

/** Nejvyšší prvky, které mají třídu `trida` (do jejich vnitřku se už nehledá) */
function sTridou(u: Uzel, trida: string, kam: Uzel[] = []): Uzel[] {
  for (const d of u.deti) {
    if (typeof d === "string") continue;
    if ((d.atr.class ?? "").split(/\s+/).includes(trida)) kam.push(d);
    else sTridou(d, trida, kam);
  }
  return kam;
}

/** Vyjme z úseku SVG prvky s třídou: vrátí úsek bez nich a jejich text */
function vyjmi(text: string, trida: string): { zbytek: string; vyjmute: string } {
  const obal = `<svg>${text}</svg>`;
  const nalez = sTridou(rozloz(obal), trida).sort((a, b) => a.od - b.od);
  let zbytek = "";
  let od = 5;
  for (const u of nalez) {
    zbytek += obal.slice(od, u.od);
    od = u.do;
  }
  zbytek += obal.slice(od, obal.length - 6);
  return { zbytek, vyjmute: nalez.map((u) => obal.slice(u.od, u.do)).join("\n") };
}

let hotovo: NocniKramek | null = null;

export function nocniKramek(): NocniKramek {
  if (hotovo) return hotovo;
  const S = scena();
  const zadni = prebarvi(S.zadniDen, nocni, "kn");
  const uvnitr = prebarvi(S.uvnitrDen, teple, "ku");
  const predni = prebarvi(S.predniDen, nocni, "kn");
  const { zbytek: vpredu, vyjmute } = vyjmi(predni, "krm-lampion");
  const vzadu = `${zadni}\n${uvnitr}`;
  const lampiony = `<defs>${definiceZe(vyjmute, `${predni}\n${zadni}`)}</defs>${vyjmute}`;
  /* Světla berou tvary a přechody z denní kresby — v obrázcích nejsou, tak jdou s nimi */
  const den = `${S.zadniDen}\n${S.uvnitrDen}\n${S.predniDen}`;
  const svetla = `<defs>${definiceZe(S.svetla, den)}</defs>${S.svetla}`;
  const otisk = createHash("sha1").update(`${vzadu}\u0000${vpredu}`).digest("hex").slice(0, 12);
  return (hotovo = { vzadu, vpredu, lampiony, svetla, otisk });
}
