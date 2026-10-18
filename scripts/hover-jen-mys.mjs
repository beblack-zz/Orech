/**
 * PostCSS (astro.config.mjs): pravidla s :hover platí jen tam, kde se dá
 * najet myší.
 *
 * Na dotyku se :hover „přilepí“ na to, na co člověk naposled klepl —
 * tlačítko zůstane zvednuté, karta posunutá, dokud neklepne jinam. Proto
 * se při buildu každý selektor s :hover přesune do @media (hover: hover),
 * hned za původní pravidlo, takže se pořadí v kaskádě nemění. Ostatní
 * selektory téhož pravidla (třeba :focus-visible) zůstanou, kde byly.
 *
 * Ve zdrojových stylech se tedy :hover píše normálně. Co se po najetí
 * ukazuje a má být vidět i na dotyku, potřebuje vlastní cestu — třídu,
 * aria-pressed nebo @media (hover: none), jako čárka u Vázičky.
 * Pravidla, která už v (hover: hover) jsou, zůstanou, jak jsou.
 */
const jenMys = (uzel) => {
  for (let p = uzel.parent; p; p = p.parent) {
    if (p.type === "atrule" && p.name === "media" && /\(\s*hover\s*:\s*hover\s*\)/.test(p.params)) return true;
  }
  return false;
};

export default function hoverJenMys() {
  return {
    postcssPlugin: "hover-jen-mys",
    Rule(pravidlo, { AtRule }) {
      if (!pravidlo.selector.includes(":hover") || jenMys(pravidlo)) return;
      const mys = pravidlo.selectors.filter((s) => s.includes(":hover"));
      const ostatni = pravidlo.selectors.filter((s) => !s.includes(":hover"));
      pravidlo.after(new AtRule({ name: "media", params: "(hover: hover)" }).append(pravidlo.clone({ selectors: mys })));
      if (ostatni.length) pravidlo.selectors = ostatni;
      else pravidlo.remove();
    },
  };
}
hoverJenMys.postcss = true;
