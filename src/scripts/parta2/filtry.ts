/**
 * Lehčí SVG filtry — varianta k porovnání. ?filtry=lehke v adrese ji zapne,
 * ?filtry=plne vrátí plnou; web si volbu pamatuje i na dalších stránkách
 * (kvalita.ts). Výchozí zůstává plná a modul pak nedělá vůbec nic.
 *
 * Nejdražší na vykreslení (hlavně v Safari na telefonu) jsou feTurbulence
 * (šum) a feDisplacementMap (roztřesený okraj tahu podle šumu). Lehká verze
 * je ve filtrech velkých kreseb nahradí levnými primitivy se stejným `result`:
 *
 *   feTurbulence       → feFlood flood-opacity="0"   průhledno místo šumu
 *   feDisplacementMap  → feOffset                    vstup projde beze změny
 *
 * Zbytek filtru zůstává (záře, barvy, rozpitý lem). Když pak z filtru vychází
 * přesně vstup — čistý tah, tah se zrnem, inkoust s dírkami —, prvkům se vypne
 * úplně (styl [filter="url(#id)"] { filter: none !important }) a prohlížeč
 * kresbu nekreslí přes mezivrstvu vůbec. Textura, která ze šumu teprve vzniká
 * (vlákna papíru), tak zmizí, nezčerná.
 *
 * Co je velké, se rozhoduje po filtrech: největší oblast filtru mezi prvky,
 * které ho používají, od VELKA výš. Malé postavičky, ikonky, značka a čekající
 * kaňka fleku zůstávají plné. Měří se getBoundingClientRect; obal, který se
 * zrovna zvětšuje z malého (rozlévající se flek), se vyrovná podle kořenového
 * <svg>, kresba v <mask> se měří tam, kde je maska použitá. Prvek, který při
 * měření není vidět (display: none, zavřený dialog), se změří, až se ukáže.
 *
 * Levné samo o sobě: jeden průchod po spuštění stránky a pak MutationObserver
 * jen na vložené uzly (šablony pozdeji, kresby ze skriptů) a změny atributu
 * filter. Rozhodnutí se pamatuje podle id, takže kresba překreslovaná přes
 * innerHTML v každém snímku se znovu neměří. Spouští se u každé stránky
 * v prechody.ts; observery založené za stránku tam po přechodu uklidí.
 *
 * V nástrojích prohlížeče je vidět výsledek: <filter data-filtr-lehky="plny |
 * lehky | vypnuty"> a <style data-filtry> v hlavičce.
 */

import { varianta } from "./kvalita";

const SVGNS = "http://www.w3.org/2000/svg";
/** Od jaké plochy oblasti filtru (CSS px²) je kresba velká — zhruba čtverec 200 × 200 */
const VELKA = 200 * 200;
const ZNACKA = "data-filtr-lehky";
const DRAHE = ["feTurbulence", "feDisplacementMap"];

export const lehke = (): boolean => varianta("filtry", ["plne", "lehke"], "plne") === "lehke";

const drahy = (f: Element) => {
  for (let p = f.firstElementChild; p; p = p.nextElementSibling) if (DRAHE.includes(p.localName)) return true;
  return false;
};

/** Šum → průhledná plocha, posun podle šumu → průchod; `result`, vstup a podoblast zůstávají */
function odlehci(f: Element) {
  for (const p of Array.from(f.children)) {
    const sum = p.localName === "feTurbulence";
    if (!sum && p.localName !== "feDisplacementMap") continue;
    const n = document.createElementNS(SVGNS, sum ? "feFlood" : "feOffset");
    for (const a of ["result", "x", "y", "width", "height", "in"]) {
      const v = p.getAttribute(a);
      if (v !== null && (a !== "in" || !sum)) n.setAttribute(a, v);
    }
    if (sum) n.setAttribute("flood-opacity", "0");
    p.replaceWith(n);
  }
}

/* ——— Vychází z filtru beze změny vstup? ———
   Filtr se spočítá na pár zkušebních barvách (RGBA premultiplikované, 0–1).
   Rozmazání, posun a podoblast se počítají jako „mění obraz“, neznámá
   primitiva (světlo, feImage, …) taky — pak filtr zůstane, jen odlehčený.
   Barevný prostor (linearRGB) se zanedbává: na průchodu a průhlednosti nic nemění. */
type Px = number[];
interface Obraz {
  px: Px[];
  plosny: boolean;
}
const ZKOUSKA: Px[] = [
  [0.2, 0.3, 0.4, 0.5],
  [0.9, 0.1, 0.05, 1],
  [0, 0, 0, 0.3],
  [0.6, 0.6, 0.6, 0.6],
  [0, 0, 0, 0],
];
const PRUHLEDNO = (): Px[] => ZKOUSKA.map(() => [0, 0, 0, 0]);
const omez = (x: number) => Math.min(1, Math.max(0, x));
const cislo = (el: Element, a: string, vychozi: number) => {
  const v = parseFloat(el.getAttribute(a) ?? "");
  return Number.isFinite(v) ? v : vychozi;
};
const cisla = (s: string | null) => (s ?? "").trim().split(/[\s,]+/).filter(Boolean).map(Number);

/** Barva výplně feFlood; jen to, co se v kresbách píše (#rgb, #rrggbb, rgb(), black, white) */
function barva(s: string): number[] | null {
  s = s.trim().toLowerCase();
  if (s === "black") return [0, 0, 0];
  if (s === "white") return [1, 1, 1];
  let m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(s);
  if (m) {
    const h = m[1].length === 3 ? m[1].replace(/./g, "$&$&") : m[1];
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  }
  m = /^rgba?\(([^)%]*)\)$/.exec(s);
  const c = m ? cisla(m[1]).slice(0, 3) : [];
  return c.length === 3 && c.every(Number.isFinite) ? c.map((v) => omez(v / 255)) : null;
}

function primitivum(p: Element, vstup: (jm: string | null) => Obraz | null): Obraz | null {
  const pod = ["x", "y", "width", "height"].some((a) => p.hasAttribute(a));
  const A = () => vstup(p.getAttribute("in"));
  /* stejné barvy, jen se obraz posune nebo rozmaže (pokud `zmeni`) */
  const prostorove = (zmeni: boolean): Obraz | null => {
    const a = A();
    return a && { px: a.px, plosny: a.plosny || pod || zmeni };
  };
  switch (p.localName) {
    case "feFlood": {
      const op = omez(cislo(p, "flood-opacity", 1));
      const c = op > 0 ? barva(p.getAttribute("flood-color") ?? "black") : [0, 0, 0];
      return c && { px: ZKOUSKA.map(() => [c[0] * op, c[1] * op, c[2] * op, op]), plosny: pod };
    }
    case "feOffset":
      return prostorove(cislo(p, "dx", 0) !== 0 || cislo(p, "dy", 0) !== 0);
    case "feGaussianBlur":
      return prostorove(cisla(p.getAttribute("stdDeviation")).some((v) => v > 0));
    case "feMorphology":
      return prostorove(cisla(p.getAttribute("radius")).some((v) => v > 0));
    case "feTile":
      return prostorove(true);
    case "feColorMatrix": {
      const a = A();
      if (!a || (p.getAttribute("type") ?? "matrix") !== "matrix") return null;
      const m = p.hasAttribute("values") ? cisla(p.getAttribute("values")) : [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0];
      if (m.length !== 20) return null;
      const px = a.px.map((c) => {
        const u = c[3] > 0 ? [c[0] / c[3], c[1] / c[3], c[2] / c[3], c[3]] : [0, 0, 0, 0];
        const o = [0, 1, 2, 3].map((r) => omez(m[r * 5] * u[0] + m[r * 5 + 1] * u[1] + m[r * 5 + 2] * u[2] + m[r * 5 + 3] * u[3] + m[r * 5 + 4]));
        return [o[0] * o[3], o[1] * o[3], o[2] * o[3], o[3]];
      });
      return { px, plosny: a.plosny || pod };
    }
    case "feComposite":
    case "feBlend": {
      const a = A();
      const b = vstup(p.getAttribute("in2"));
      if (!a || !b) return null;
      const op = p.localName === "feBlend" ? (p.getAttribute("mode") ?? "normal") === "normal" && "over" : (p.getAttribute("operator") ?? "over");
      const k = ["k1", "k2", "k3", "k4"].map((n) => cislo(p, n, 0));
      const slouc = (x: Px, y: Px): Px | null => {
        const xa = x[3];
        const ya = y[3];
        switch (op) {
          case "over": return x.map((v, j) => v + y[j] * (1 - xa));
          case "in": return x.map((v) => v * ya);
          case "out": return x.map((v) => v * (1 - ya));
          case "atop": return x.map((v, j) => v * ya + y[j] * (1 - xa));
          case "xor": return x.map((v, j) => v * (1 - ya) + y[j] * (1 - xa));
          case "lighter": return x.map((v, j) => Math.min(1, v + y[j]));
          case "arithmetic": {
            const v = x.map((v, j) => omez(k[0] * v * y[j] + k[1] * v + k[2] * y[j] + k[3]));
            return v.map((c, j) => (j < 3 ? Math.min(c, v[3]) : c));
          }
        }
        return null;
      };
      const px: Px[] = [];
      for (let i = 0; i < a.px.length; i++) {
        const c = slouc(a.px[i], b.px[i]);
        if (!c) return null;
        px.push(c);
      }
      return { px, plosny: a.plosny || b.plosny || pod };
    }
    case "feMerge": {
      let o: Obraz = { px: PRUHLEDNO(), plosny: pod };
      for (const n of Array.from(p.children)) {
        if (n.localName !== "feMergeNode") continue;
        const x = vstup(n.getAttribute("in"));
        if (!x) return null;
        const spod = o.px;
        o = { px: x.px.map((c, i) => c.map((v, j) => v + spod[i][j] * (1 - c[3]))), plosny: o.plosny || x.plosny };
      }
      return o;
    }
  }
  return null;
}

function bezZmeny(f: Element): boolean {
  const zdroj: Obraz = { px: ZKOUSKA, plosny: false };
  const alfa: Obraz = { px: ZKOUSKA.map((c) => [0, 0, 0, c[3]]), plosny: false };
  const vysledky = new Map<string, Obraz>();
  let posledni = zdroj;
  /* Bez `in` (i s odkazem na neexistující výsledek) bere primitivum výsledek předchozího */
  const vstup = (jm: string | null): Obraz | null => {
    if (jm === "SourceGraphic") return zdroj;
    if (jm === "SourceAlpha") return alfa;
    if (jm && /^(BackgroundImage|BackgroundAlpha|FillPaint|StrokePaint)$/.test(jm)) return null;
    return (jm && vysledky.get(jm)) || posledni;
  };
  for (const p of Array.from(f.children)) {
    if (!p.localName.startsWith("fe")) continue;
    const o = primitivum(p, vstup);
    if (!o) return false;
    const r = p.getAttribute("result");
    if (r) vysledky.set(r, o);
    posledni = o;
  }
  return !posledni.plosny && posledni.px.every((c, i) => c.every((v, j) => Math.abs(v - ZKOUSKA[i][j]) < 1e-3));
}

/* ——— Měření ——— */

/** Nejvzdálenější <svg> nad prvkem — kořen kresby v HTML */
function koren(el: Element): Element | null {
  let k: Element | null = null;
  for (let p: Element | null = el; p && p.namespaceURI === SVGNS; p = p.parentElement) if (p.localName === "svg") k = p;
  return k;
}

/** Hodnota do uvozovek v selektoru [atribut="…"] */
const uvoz = (s: string) => s.replace(/["\\]/g, "\\$&");

/** O kolik oblast filtru přesahuje bbox prvku (objectBoundingBox: width/height filtru, výchozí 120 %) */
function okraj(f: Element): [number, number] {
  if (f.getAttribute("filterUnits") === "userSpaceOnUse") return [1, 1];
  const d = (a: string) => {
    const s = f.getAttribute(a)?.trim();
    const n = parseFloat(s ?? "");
    return Number.isFinite(n) && n > 0 ? (s!.endsWith("%") ? n / 100 : n) : 1.2;
  };
  return [d("width"), d("height")];
}

export function odlehciFiltry(): void {
  if (!lehke()) return;
  try {
    spust();
  } catch {
    /* lehčí filtry jsou jen varianta k porovnání — chyba v nich nesmí shodit stránku */
  }
}

function spust() {
  /** id → velký (rozhodnuto pro celou stránku) */
  const velky = new Map<string, boolean>();
  /** id → drahé filtry, které čekají, až se změří prvky, které je používají */
  const cekaji = new Map<string, Element[]>();
  /** id, pro která se už prvky hledaly v celém dokumentu */
  const hledano = new Set<string>();
  /** id, kterým se filtr vypíná stylem, a id, která vypnout nejdou (filtr po náhradě vstup mění) */
  const vypnute = new Set<string>();
  const nevypinat = new Set<string>();
  /** id → hodnoty atributu filter, jak je mají prvky (kvůli selektoru) */
  const hodnoty = new Map<string, Set<string>>();
  const sledovane = new Map<string, Element[]>();
  let io: IntersectionObserver | null = null;
  let styl: HTMLStyleElement | null = null;
  let zmena = false;
  /* Prvky s filtrem se ve vloženém obsahu hledají, jen když něco čeká na měření:
     první vteřinu po vložení drahého filtru v každé dávce, jinak nejvýš jednou
     za vteřinu (kresba překreslovaná v každém snímku pak stojí jen hledání <filter>) */
  let hledatDo = -1e9;
  let naposledyHledano = -1e9;

  const vypni = (id: string) => {
    if (nevypinat.has(id) || vypnute.has(id)) return;
    vypnute.add(id);
    zmena = true;
  };
  const nechat = (id: string) => {
    nevypinat.add(id);
    if (vypnute.delete(id)) zmena = true;
  };

  const pouzij = (f: Element, jeVelky: boolean) => {
    if (!jeVelky) {
      f.setAttribute(ZNACKA, "plny");
      return;
    }
    odlehci(f);
    const ven = bezZmeny(f);
    f.setAttribute(ZNACKA, ven ? "vypnuty" : "lehky");
    if (ven) vypni(f.id);
    else nechat(f.id);
  };

  const rozhodnuto = (id: string, jeVelky: boolean) => {
    velky.set(id, jeVelky);
    for (const f of cekaji.get(id) ?? []) if (f.isConnected) pouzij(f, jeVelky);
    cekaji.delete(id);
    for (const el of sledovane.get(id) ?? []) io?.unobserve(el);
    sledovane.delete(id);
  };

  const novyFiltr = (f: Element) => {
    const id = f.id;
    if (!id) return;
    const stav = f.getAttribute(ZNACKA);
    if (stav) {
      /* rozhodnutý dřív: hlavička přežívá přechod, nebo se prvek jen přesunul */
      if (!velky.has(id)) velky.set(id, stav !== "plny");
      if (stav === "vypnuty") vypni(id);
      else if (stav === "lehky") nechat(id);
      return;
    }
    if (!drahy(f)) return;
    const v = velky.get(id);
    if (v !== undefined) return pouzij(f, v);
    cekaji.set(id, [...(cekaji.get(id) ?? []).filter((x) => x.isConnected), f]);
    hledatDo = performance.now() + 1000;
  };

  const idPrvku = (el: Element): string | null => {
    const h = el.getAttribute("filter");
    const m = h ? /^\s*url\(\s*["']?#([^"')\s]+)["']?\s*\)\s*$/.exec(h) : null;
    if (!m) return null;
    let hs = hodnoty.get(m[1]);
    if (!hs) hodnoty.set(m[1], (hs = new Set()));
    if (!hs.has(h!)) {
      hs.add(h!);
      if (vypnute.has(m[1])) zmena = true;
    }
    return m[1];
  };

  /** Plocha oblasti filtru v CSS px², −1 když prvek není vidět */
  const meritka = new Map<Element, number>();
  const plocha = (el: Element, f: Element): number => {
    if (!el.isConnected) return -1;
    const r = el.getBoundingClientRect();
    if (r.width <= 0 && r.height <= 0) return -1;
    /* Obal, který se právě zvětšuje (flek se rozlévá), by kresbu ukázal malou.
       Zmenšení se proto vyrovná podle kořenového <svg>, zvětšení (kamera
       přiblížená na scénu) ne — v té velikosti se filtr opravdu počítá. */
    const k = koren(el);
    let m = k ? meritka.get(k) : 1;
    if (m === undefined && k) {
      const rk = k.getBoundingClientRect();
      m = rk.width > 0 && k.clientWidth > rk.width ? k.clientWidth / rk.width : 1;
      meritka.set(k, m);
    }
    const [ox, oy] = okraj(f);
    return r.width * r.height * m! * m! * ox * oy;
  };

  /** Kde se prvek opravdu kreslí: obsah masky tam, kde je maska použitá (i maska v masce) */
  let masky: Map<string, Element[]> | null = null;
  const kreslene = (el: Element, hloubka = 0): Element[] => {
    const maska = el.closest("mask");
    if (!maska) return [el];
    if (!maska.id || hloubka > 2) return [];
    if (!masky) {
      /* prvky s maskou podle id masky: jeden dotaz na celé měření, ne na každou masku */
      masky = new Map();
      for (const u of Array.from(document.querySelectorAll("[mask]"))) {
        const m = /^\s*url\(\s*["']?#([^"')\s]+)/.exec(u.getAttribute("mask") ?? "");
        if (m) masky.set(m[1], [...(masky.get(m[1]) ?? []), u]);
      }
    }
    return (masky.get(maska.id) ?? []).flatMap((u) => kreslene(u, hloubka + 1));
  };

  /**
   * Změří prvky čekajících filtrů; co není vidět, se změří, až se ukáže.
   * Neviditelné prvky, které skript překresluje v každém snímku, se z vkládání
   * znovu měří nejvýš jednou za vteřinu — jinak hlídá IntersectionObserver.
   */
  const neuspech = new Map<string, number>();
  const zmer = (kandidati: Map<string, Element[]>, zObserveru = false) => {
    meritka.clear();
    masky = null;
    const ted = performance.now();
    for (const [id, vse] of kandidati) {
      const f = cekaji.get(id)?.[0];
      const prvky = (zObserveru ? vse : vse.flatMap((el) => kreslene(el))).filter((el) => el.isConnected);
      if (!f || !prvky.length) continue;
      if (!zObserveru && ted - (neuspech.get(id) ?? -1e9) < 1000) {
        sleduj(id, prvky);
        continue;
      }
      let max = -1;
      for (const el of prvky) {
        max = Math.max(max, plocha(el, f));
        if (max >= VELKA) break;
      }
      if (max >= 0) rozhodnuto(id, max >= VELKA);
      else {
        neuspech.set(id, ted);
        sleduj(id, prvky);
      }
    }
  };

  /** sledovaný prvek → id filtru (u masky je to prvek s maskou, ne prvek s filtrem) */
  const zaFiltr = new WeakMap<Element, string>();
  const sleduj = (id: string, prvky: Element[]) => {
    if (typeof IntersectionObserver === "undefined") return;
    const o = (io ??= new IntersectionObserver(
      (zaznamy) => {
        const kandidati = new Map<string, Element[]>();
        for (const z of zaznamy) {
          const id = z.target.isConnected && (z.boundingClientRect.width > 0 || z.boundingClientRect.height > 0) ? zaFiltr.get(z.target) : null;
          if (id && cekaji.has(id)) kandidati.set(id, [...(kandidati.get(id) ?? []), z.target]);
        }
        if (kandidati.size) dokonci(kandidati, true);
      },
      { rootMargin: "1500px 0px" },
    ));
    /* nejvýš osm prvků na filtr; vyřazené z dokumentu se přestanou sledovat */
    const uz = (sledovane.get(id) ?? []).filter((el) => el.isConnected || (o.unobserve(el), false));
    for (const el of prvky) {
      if (uz.length >= 8) break;
      if (uz.includes(el)) continue;
      uz.push(el);
      zaFiltr.set(el, id);
      o.observe(el);
    }
    sledovane.set(id, uz);
  };

  const aktualizujStyl = () => {
    zmena = false;
    const sel: string[] = [];
    for (const id of vypnute) for (const h of new Set([`url(#${id})`, ...(hodnoty.get(id) ?? [])])) sel.push(`[filter="${uvoz(h)}"]`);
    const text = sel.length ? `${sel.join(",")}{filter:none!important}` : "";
    if (!styl) {
      if (!text) return;
      styl = document.createElement("style");
      styl.dataset.filtry = "lehke";
      document.head.append(styl);
    }
    if (styl.textContent !== text) styl.textContent = text;
  };

  const dokonci = (kandidati: Map<string, Element[]>, zObserveru = false) => {
    zmer(kandidati, zObserveru);
    if (zmena) aktualizujStyl();
  };

  /**
   * Projde vložené uzly (s podstromem) a prvky se změněným atributem filter:
   * nové filtry, prvky, které čekající filtry používají, a změří je
   */
  const projdi = (uzly: Element[], zmenene: Element[] = [], celyDokument = false) => {
    for (const el of uzly) {
      if (el.localName === "filter") novyFiltr(el);
      else if (el.firstElementChild) for (const f of Array.from(el.getElementsByTagName("filter"))) novyFiltr(f);
    }
    const ted = performance.now();
    if (!cekaji.size || (!celyDokument && !zmenene.length && ted > hledatDo && ted - naposledyHledano < 1000)) {
      if (zmena) aktualizujStyl();
      return;
    }
    naposledyHledano = ted;
    const kandidati = new Map<string, Element[]>();
    const vezmi = (el: Element) => {
      const id = idPrvku(el);
      if (id && cekaji.has(id)) kandidati.set(id, [...(kandidati.get(id) ?? []), el]);
    };
    for (const el of uzly) {
      if (el.hasAttribute("filter")) vezmi(el);
      if (el.firstElementChild) el.querySelectorAll("[filter]").forEach(vezmi);
    }
    zmenene.forEach(vezmi);
    /* filtr přišel bez prvků (defs zvlášť): jednou je hledat v celém dokumentu */
    const bez = [...cekaji.keys()].filter((id) => !kandidati.has(id) && !hledano.has(id));
    bez.forEach((id) => hledano.add(id));
    if (bez.length && !celyDokument) {
      document.querySelectorAll("[filter]").forEach((el) => {
        const id = idPrvku(el);
        if (id && bez.includes(id)) kandidati.set(id, [...(kandidati.get(id) ?? []), el]);
      });
    }
    dokonci(kandidati);
  };

  projdi([document.body], [], true);

  new MutationObserver((zaznamy) => {
    const uzly: Element[] = [];
    const zmenene: Element[] = [];
    for (const z of zaznamy) {
      if (z.type === "attributes") zmenene.push(z.target as Element);
      else z.addedNodes.forEach((n) => n.nodeType === 1 && uzly.push(n as Element));
    }
    if (uzly.length || zmenene.length) projdi(uzly, zmenene);
  }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["filter"] });
}
