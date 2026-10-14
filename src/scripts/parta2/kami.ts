/**
 * Klikací kami: reakce, další replika v bublině a zvuk. Bublina se kreslí
 * do <body> s pozicí v dokumentu, takže ji kulaté okno neořízne a při
 * scrollu jede s postavičkou.
 */
import { kamiInfo } from "../../data/kami";
import { parta } from "../../data/parta";
import type { PostavaId } from "../../data/parta";
import { omez } from "./stav";
import * as zvuk from "./zvuk";
import { pozdravMistra } from "./mistr";

const jmena = Object.fromEntries(parta.map((p) => [p.id, p.name])) as Record<PostavaId, string>;
export const jmeno = (id: PostavaId) => jmena[id] ?? id;

const poradi: Partial<Record<PostavaId, number>> = {};
let bublina: HTMLElement | null = null;
let casovac: number | undefined;

function zavri() {
  if (!bublina) return;
  const b = bublina;
  bublina = null;
  window.clearTimeout(casovac);
  b.classList.add("pryc");
  window.setTimeout(() => b.remove(), 260);
}

/* ——— Jak světlé je pozadí pod bublinou ——— */

/** "rgb(…)", "rgba(…)" nebo "#rrggbb" → [r, g, b, a] (0–255, a 0–1) */
function barva(s: string): number[] | null {
  s = s.trim();
  const h = /^#([0-9a-f]{6})$/i.exec(s);
  if (h) return [0, 2, 4].map((i) => parseInt(h[1].slice(i, i + 2), 16)).concat(1);
  const m = /^rgba?\(([^)]+)\)$/.exec(s);
  if (!m) return null;
  const c = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
  return [c[0], c[1], c[2], c[3] ?? 1];
}
/** Relativní jas barvy (0 tma … 1 bílá) */
const jas = (c: number[]) => {
  const l = c.slice(0, 3).map((v) => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
};
/**
 * Jas toho, co je v bodě okna pod bublinou: první prvek s neprůhledným
 * pozadím (karta papíru, tmavá sekce), jinak obloha — její přechod
 * (.nebe: nahoře, střed v 58 %, obzor) přebarvuje nebe.ts podle hodiny.
 */
function jasPod(x: number, y: number): number {
  for (const p of document.elementsFromPoint?.(x, y) ?? []) {
    if (p === document.body || p === document.documentElement) break;
    const c = barva(getComputedStyle(p).backgroundColor);
    if (c && c[3] > 0.6) return jas(c);
  }
  const s = getComputedStyle(document.documentElement);
  const f = omez(y / window.innerHeight, 0, 1);
  const [a, b, k] = f < 0.58 ? ["--nebe-nahore", "--nebe-stred", f / 0.58] : ["--nebe-stred", "--nebe-obzor", (f - 0.58) / 0.42];
  const ca = barva(s.getPropertyValue(a)), cb = barva(s.getPropertyValue(b));
  if (!ca || !cb) return 1;
  return jas(ca.map((v, i) => v + (cb[i] - v) * k));
}

interface Volby {
  /** Bublina je v okně (position: fixed) a volající ji posouvá vrácenou funkcí — za postavou, která letí po stránce */
  pevne?: boolean;
  /** Na světlém pozadí tmavá bublina, na tmavém světlá */
  kontrast?: boolean;
}

/**
 * Bublina s replikou nad prvkem (nebo pod ním, když nahoře není místo).
 * Vrací funkci, která ji znovu postaví k prvku — vrátí false, když už
 * bublina zmizela (s `pevne` ji volající volá každý snímek).
 */
export function rekni(el: Element, kdo: PostavaId, text: string, { pevne = false, kontrast = false }: Volby = {}) {
  zavri();
  const b = document.createElement("div");
  b.className = pevne ? "bublina pevna" : "bublina";
  const j = document.createElement("span");
  j.className = "bublina-jmeno";
  j.textContent = jmeno(kdo);
  b.append(j, document.createTextNode(text));
  document.body.append(b);

  const sirka = b.offsetWidth;
  const vyska = b.offsetHeight;
  let zmereno = -1e9;
  const umisti = () => {
    if (bublina !== b) return false;
    const r = el.getBoundingClientRect();
    const sx = pevne ? 0 : window.scrollX;
    const sy = pevne ? 0 : window.scrollY;
    const okraj = document.documentElement.clientWidth;
    const stred = r.left + r.width / 2;
    const left = omez(stred - sirka / 2, 10, okraj - sirka - 10);
    let top = r.top - vyska - 12 + r.height * 0.06;
    const dole = top < 74;
    if (dole) top = r.bottom + 12;
    b.classList.toggle("dole", dole);
    b.style.left = `${left + sx}px`;
    b.style.top = `${top + sy}px`;
    b.style.setProperty("--ocasek", `${omez(stred - left, 22, sirka - 22)}px`);
    /*
     * Pozadí se přeměří nejvýš čtyřikrát za vteřinu. Krémová a noční modrá
     * bublina mají stejný kontrast s pozadím o jasu ~0,24; napoprvé rozhodne
     * ten, potom je mezi světlou a tmavou mezera, ať bublina na hraně nebliká.
     */
    const ted = performance.now();
    if (kontrast && ted - zmereno > 250) {
      const poprve = zmereno < 0;
      zmereno = ted;
      /* tři body napříč bublinou, ať jeden mrak nebo okraj karty nerozhodne */
      const svetle = [0.2, 0.5, 0.8].reduce((s, k) => s + jasPod(left + sirka * k, top + vyska / 2), 0) / 3;
      if (poprve) b.classList.toggle("tmava", svetle > 0.24);
      else if (svetle > 0.28) b.classList.add("tmava");
      else if (svetle < 0.2) b.classList.remove("tmava");
    }
    return true;
  };
  bublina = b;
  umisti();
  casovac = window.setTimeout(zavri, 3600 + text.length * 30);
  return umisti;
}

export function initKami() {
  document.addEventListener("click", (e) => {
    const k = (e.target as Element).closest<HTMLElement>(".kami");
    if (!k) return;
    const id = k.dataset.kami as PostavaId;
    const info = kamiInfo[id];
    if (!info) return;
    /* Mistra (/zkouska) kami poprvé za návštěvu pozdraví — replika se tím nespotřebuje */
    const pozdrav = pozdravMistra(id);
    const i = poradi[id] ?? 0;
    if (!pozdrav) poradi[id] = (i + 1) % info.repliky.length;

    k.classList.remove("reaguje");
    void k.offsetWidth;
    k.classList.add("reaguje");
    window.setTimeout(() => k.classList.remove("reaguje"), 1000);

    rekni(k, id, pozdrav ?? info.repliky[i]);
    zvuk.reakce(id);
    document.dispatchEvent(new CustomEvent("kami:klik", { detail: { id, el: k } }));
  });
  window.addEventListener("resize", zavri);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") zavri();
  });
}
