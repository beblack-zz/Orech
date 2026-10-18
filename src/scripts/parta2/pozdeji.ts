/**
 * Velké kresby níž na stránce až ve chvíli, kdy se k nim člověk blíží.
 * Prohlížeč pak od začátku nedrží tisíce prvků SVG, které nikdo nevidí.
 *
 * Build: `odloz(svg)` rozdělí hotové SVG na prázdný obal (stejný kořen
 * <svg> se všemi atributy — viewBox, třída, rozměry, takže zabírá přesně
 * stejné místo) a <template data-pozdeji="dovnitr"> s obsahem hned za ním.
 * Šablona musí stát mimo <svg> (uvnitř SVG by parser <template> nebral jako
 * šablonu), proto je obsah v ní znovu zabalený do <svg>, ať se načte ve
 * jmenném prostoru SVG.
 *
 * Prohlížeč: `pozdeji()` najde šablony a přes IntersectionObserver
 * s velkým předstihem obsah vloží — u „dovnitr“ přesune děti obalu ze
 * šablony do prázdného <svg> před ní, jinak šablonu nahradí jejím obsahem.
 * Na rodiči pak pošle bublající událost `pozdeji:vlozeno` (detail = naplněný
 * obal <svg>, nebo vložené prvky), aby se na ni mohly navázat skripty, které uvnitř kresby něco hledají.
 *
 * Hlídá se obal (nebo `data-pozdeji-sleduj` = selektor pro closest(), když
 * obal jezdí pod kamerou a kus z něj bývá mimo rám). Při skoku na kotvu
 * (odkaz #…, adresa s #…) dostane cílová sekce kresby hned. Při tisku a bez
 * IntersectionObserveru se vloží všechno hned. Observery a posluchače po
 * přechodu na jinou stránku uklidí prechody.ts.
 *
 * Do šablon patří jen kresby: texty, tlačítka a odkazy zůstávají v HTML.
 */

export const UDALOST = "pozdeji:vlozeno";

/** Build: kořen <svg …>obsah</svg> → prázdný obal + šablona s obsahem */
export function odloz(svg: string): string {
  const m = /^\s*(<svg\b[^>]*>)([\s\S]*)<\/svg>\s*$/.exec(svg);
  if (!m || m[1].endsWith("/>")) return svg;
  return `${m[1]}</svg><template data-pozdeji="dovnitr"><svg xmlns="http://www.w3.org/2000/svg">${m[2]}</svg></template>`;
}

/**
 * Kresba, která už jednou byla vidět, se mimo obrazovku nevykresluje
 * (content-visibility: auto) — prohlížeč pro ni nepočítá styly, filtry ani
 * animace. Zapne se až po prvním zobrazení a s naměřenou velikostí: dřív by
 * se obal smrskl a stránka poskočila, a šablona v něm by se nevložila
 * (observer uvnitř nevykresleného obalu nic nevidí). Jen pro obaly, které
 * stojí na místě — pod kamerou by kresba při posunu na okamžik chyběla.
 */
export function nekreslitMimo(selektor: string) {
  if (typeof IntersectionObserver === "undefined" || !CSS.supports?.("content-visibility", "auto")) return;
  const io = new IntersectionObserver((zaznamy) => {
    for (const z of zaznamy) {
      if (!z.isIntersecting) continue;
      const el = z.target as HTMLElement;
      io.unobserve(el);
      const sirka = el.offsetWidth;
      const vyska = el.offsetHeight;
      if (!sirka || !vyska) continue;
      el.style.setProperty("contain-intrinsic-size", `auto ${sirka}px auto ${vyska}px`);
      el.style.setProperty("content-visibility", "auto");
    }
  });
  document.querySelectorAll(selektor).forEach((el) => io.observe(el));
}

/** Vloží obsah jedné šablony; vrací vložené prvky */
function vloz(t: HTMLTemplateElement): Element[] {
  if (!t.isConnected) return [];
  const rodic = t.parentElement;
  const obsah = document.importNode(t.content, true);
  let vlozene: Element[];
  if (t.dataset.pozdeji === "dovnitr") {
    const cil = t.previousElementSibling;
    const zdroj = obsah.firstElementChild;
    if (!cil || !zdroj) {
      t.remove();
      return [];
    }
    const kus = document.createDocumentFragment();
    while (zdroj.firstChild) kus.appendChild(zdroj.firstChild);
    cil.appendChild(kus);
    t.remove();
    /* Vložený je obsah obalu — skripty dostanou rovnou ten <svg> */
    vlozene = [cil];
  } else {
    vlozene = [...obsah.children];
    t.replaceWith(obsah);
  }
  rodic?.dispatchEvent(new CustomEvent(UDALOST, { bubbles: true, detail: vlozene }));
  return vlozene;
}

const sablony = (koren: ParentNode = document) => [...koren.querySelectorAll<HTMLTemplateElement>("template[data-pozdeji]")];

/** Vloží hned všechny šablony (v kořeni, nebo na celé stránce) */
export function vlozVse(koren: ParentNode = document) {
  sablony(koren).forEach(vloz);
}

/** Co se hlídá: obal kresby, nebo prvek podle data-pozdeji-sleduj, jinak rodič */
const hlidany = (t: HTMLTemplateElement): Element | null => {
  const sel = t.dataset.pozdejiSleduj;
  if (sel) return t.closest(sel);
  if (t.dataset.pozdeji === "dovnitr" && t.previousElementSibling) return t.previousElementSibling;
  return t.parentElement;
};

/**
 * Zapne odložené vkládání na stránce. `predstih` je rootMargin — o kolik
 * dřív, než kresba dojede na obrazovku, se má vložit.
 */
export function pozdeji(predstih = "1500px 0px") {
  const vse = sablony();
  if (!vse.length) return;
  const tisk = window.matchMedia?.("print");
  if (typeof IntersectionObserver === "undefined" || tisk?.matches) {
    vse.forEach(vloz);
    return;
  }
  const kSablonam = new Map<Element, HTMLTemplateElement[]>();
  const io = new IntersectionObserver(
    (zaznamy) => {
      for (const z of zaznamy) {
        if (!z.isIntersecting) continue;
        io.unobserve(z.target);
        (kSablonam.get(z.target) ?? []).forEach(vloz);
        kSablonam.delete(z.target);
      }
    },
    { rootMargin: predstih },
  );
  for (const t of vse) {
    const el = hlidany(t);
    if (!el) {
      vloz(t);
      continue;
    }
    const seznam = kSablonam.get(el);
    if (seznam) seznam.push(t);
    else {
      kSablonam.set(el, [t]);
      io.observe(el);
    }
  }
  /* Skok na kotvu (odkaz v obsahu, #prohlidka v adrese): sekce, kam se jede,
     dostane kresby hned, ne až observer v dalším snímku — jinak by na okamžik
     bylo vidět prázdné místo */
  const kCili = (hash: string) => {
    if (hash.length < 2) return;
    let el: HTMLElement | null = null;
    try {
      el = document.getElementById(decodeURIComponent(hash.slice(1)));
    } catch {
      return;
    }
    if (el) vlozVse(el.closest("section") ?? el);
  };
  kCili(location.hash);
  document.addEventListener("click", (e) => {
    const a = (e.target as Element | null)?.closest?.<HTMLAnchorElement>('a[href^="#"]');
    if (a) kCili(a.getAttribute("href") ?? "");
  });
  window.addEventListener("hashchange", () => kCili(location.hash));

  /* Tisk: všechno hned, ať na papíře nic nechybí */
  const naTisk = () => {
    vlozVse();
    io.disconnect();
  };
  window.addEventListener("beforeprint", naTisk);
  tisk?.addEventListener?.("change", (e) => {
    if (e.matches) naTisk();
  });
}
