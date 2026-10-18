/**
 * Kresby O nás (components/onas2/kresba) jako soubory /kresby/onas-*.svg.
 * Soubory staví [soubor].svg.ts přes _kresby.ts, Pocatek.astro si odsud
 * bere kapku a společné definice.
 *
 * Jen svět v kapce na Počátku. V kapce se hýbe kde co — skript mění tvar
 * kapky (#pk-tvar), posouvá a zvětšuje svět a odlesky, CSS rozsvěcuje okna
 * dílny a lampiony — ale krajina uvnitř je statická. Ta jde do souborů
 * v <image> (_vrstvy.ts); skupiny s okny a lampiony zůstanou ve stránce
 * celé, protože zpoždění jejich blikání bere CSS z :nth-child. Všechno
 * s třídou pk-… a pkt-… zůstává ve stránce (sahá na to skript nebo CSS),
 * jen do skupin kapky, těla a světa se smí — hýbou se jako celek.
 *
 * Trubka a hladina schválně přesahují z jeviště přes celou šířku sekce
 * (.pk-kresba má overflow: visible) — jako obrázek by byly obří, zůstávají
 * ve stránce. Rok je kamera po kresbě domu, ten zůstává taky.
 */
import { Sklad, vyjmi, rozloz, type Uzel } from "./_vrstvy";
import { kapkaDefs, kapka, hladinaDefs } from "../../components/onas2/kresba/kapka";
import { svetVKapce } from "../../components/onas2/kresba/svet";
import { trubka } from "../../components/onas2/kresba/trubka";

const tridy = (u: Uzel) => (u.atr.class ?? "").split(/\s+/).filter(Boolean);
const sviti = (u: Uzel) => tridy(u).includes("pkw-svit");
/** Skupiny kapky, do kterých se smí — skript s nimi hýbe jako s celkem */
const OBAL = new Set(["pk-kapka", "pk-telo", "pk-svet"]);

function vyrob() {
  const sklad = new Sklad();
  const svet = svetVKapce();
  const tr = trubka();
  const spolecne = kapkaDefs() + hladinaDefs() + tr.defs;
  const r = vyjmi(sklad, "onas-kapka", `<svg viewBox="0 0 1000 1000">${kapka(svet.svg)}</svg>`, {
    orez: false,
    vnejsi: spolecne + svet.defs,
    zive: ["pk-tvar"],
    nechat: (u) => {
      const t = tridy(u);
      if (t.some((x) => OBAL.has(x))) return "obal";
      if (t.some((x) => x.startsWith("pk-") || x.startsWith("pkt-"))) return "cele";
      if (sviti(u) || u.deti.some((d) => typeof d !== "string" && sviti(d))) return "cele";
      return null;
    },
  });
  /* Z definic světa zůstanou ve stránce jen ty, které potřebuje to, co v kapce zůstalo */
  const defsSveta = rozloz(`<svg>${svet.defs}</svg>`)
    .deti.filter((d): d is Uzel => typeof d !== "string")
    .map((d) => d.zdroj.slice(d.od, d.do))
    .filter((t) => {
      const ids = [...t.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
      return !ids.length || ids.some((id) => r.vnejsi.has(id));
    })
    .join("");
  return {
    /** Obsah <svg class="pk-kresba-kapka"> — bez kořene, ten má Pocatek.astro */
    kapka: r.svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, ""),
    /** Společné definice jeviště (pk-defs) */
    defs: spolecne + defsSveta,
    /** Soubory kapky — první obrazovka, stránka je stahuje hned s hlavičkou */
    predem: [...r.svg.matchAll(/<image href="([^"]+)"/g)].map((m) => m[1]),
    soubory: sklad.soubory,
  };
}

let hotovo: ReturnType<typeof vyrob> | undefined;
/** Kresby a soubory O nás — počítá se jednou za build */
export const onas = () => (hotovo ??= vyrob());
