/**
 * Kresby, které jsou stejné na každé stránce (patička), jako samostatné SVG
 * soubory /kresby/*.svg. Prohlížeč si je stáhne jednou a každá stránka má
 * o ~250 kB menší HTML. Soubory staví [soubor].svg.ts při buildu.
 *
 * Patří sem jen čistě dekorativní a statické kresby: v <img> je nevidí CSS
 * stránky (třídy, proměnné, currentColor) ani skripty, takže barvy musí být
 * v souboru napevno. Co se animuje podle stránky (ensō a tah v hlavičce,
 * zvonkohra, značka v hlavičce, která se v noci přebarví), zůstává vložené.
 *
 * Adresy nesou otisk obsahu (?v=…), aby šlo soubory cachovat napořád:
 * změněná kresba dostane novou adresu.
 */
import { createHash } from "node:crypto";
import { experimental_AstroContainer } from "astro/container";
import { koreny, puda, vrstva, nalez } from "../../components/parta2/podzemi";
import { vrstvy, type VrstvaId } from "../../data/paticka";
import Enso from "../../components/navrhy-loga/Enso.astro";
import ZnackaStetec from "../../components/znacka/ZnackaStetec.astro";

/** Barva písma patičky (.pata v styles/parta2.css) — JIRO ve značce ji jinak bere z currentColor */
const PATA_PISMO = "#EFE5D3";

const XMLNS = 'xmlns="http://www.w3.org/2000/svg"';
const samostatne = (svg: string) => svg.replace(/^<svg /, `<svg ${XMLNS} `);

/** Výstup komponenty → samostatný soubor: jen <svg>, bez Astro atributů, s pevnými id */
const zKomponenty = (html: string, predpona: string, pevne: string, styl = "") => {
  let svg = html.slice(html.indexOf("<svg"), html.lastIndexOf("</svg>") + 6);
  svg = svg.replace(/ data-astro-cid-[a-z0-9]+(="[^"]*")?/g, "");
  /* noveId() dává náhodná id — v souboru stačí pevná a obsah je pak při každém buildu stejný */
  const nahodne = svg.match(new RegExp(`id="(${predpona}-[a-z0-9]+)`))?.[1];
  if (nahodne) svg = svg.split(nahodne).join(pevne);
  if (!svg.includes("xmlns=")) svg = svg.replace(/^<svg /, `<svg ${XMLNS} `);
  if (styl) svg = svg.replace(/^(<svg[^>]*>)/, `$1<style>${styl}</style>`);
  return svg;
};

/* Ensō v patičce svítí květem jako měsíc — animace z Enso.astro, v souboru vlastní */
const ENSO_STYL =
  "@keyframes enso-svit{50%{opacity:.86}}.enso-mesic{animation:enso-svit 5s ease-in-out infinite}" +
  "@media (prefers-reduced-motion:reduce){.enso-mesic{animation:none}}";

async function vyrob() {
  const k = new Map<string, string>();
  k.set("paticka-puda", samostatne(puda()));
  k.set("paticka-koreny", samostatne(koreny()));
  vrstvy.forEach((v, i) => {
    k.set(`paticka-vrstva-${v.id}`, samostatne(vrstva(i)));
    k.set(`paticka-nalez-${v.id}`, samostatne(nalez(v.id)));
  });
  const c = await experimental_AstroContainer.create();
  k.set("paticka-enso", zKomponenty(await c.renderToString(Enso, { props: { size: 54, soumrak: true, tema: "tmave" } }), "enso", "pe", ENSO_STYL));
  k.set("paticka-znacka", zKomponenty(await c.renderToString(ZnackaStetec, { props: { vyska: 26, tema: "tmave", napevno: PATA_PISMO } }), "znacka", "pz"));
  return k;
}

let hotovo: Promise<Map<string, string>> | undefined;
/** Všechny soubory: jméno (bez .svg) → obsah. Počítá se jednou za build. */
export const kresby = () => (hotovo ??= vyrob());

const otisk = (s: string) => createHash("sha1").update(s).digest("hex").slice(0, 10);
const adresa = (jmeno: string, obsah: string) => `/kresby/${jmeno}.svg?v=${otisk(obsah)}`;

/** Adresy a rozměry kreseb pro Paticka.astro */
export async function patickaKresby() {
  const k = await kresby();
  const a = (jmeno: string) => adresa(jmeno, k.get(jmeno)!);
  const znacka = k.get("paticka-znacka")!;
  const rozmer = (atr: string) => znacka.match(new RegExp(`^<svg[^>]* ${atr}="([\\d.]+)"`))?.[1];
  return {
    puda: a("paticka-puda"),
    koreny: a("paticka-koreny"),
    vrstva: (id: VrstvaId) => a(`paticka-vrstva-${id}`),
    nalez: (id: VrstvaId) => a(`paticka-nalez-${id}`),
    enso: a("paticka-enso"),
    znacka: { src: a("paticka-znacka"), width: rozmer("width"), height: rozmer("height") },
  };
}
