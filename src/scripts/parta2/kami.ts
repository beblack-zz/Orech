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

/** Bublina s replikou nad prvkem (nebo pod ním, když nahoře není místo). */
export function rekni(el: Element, kdo: PostavaId, text: string) {
  zavri();
  const b = document.createElement("div");
  b.className = "bublina";
  const j = document.createElement("span");
  j.className = "bublina-jmeno";
  j.textContent = jmeno(kdo);
  b.append(j, document.createTextNode(text));
  document.body.append(b);

  const r = el.getBoundingClientRect();
  const sirka = b.offsetWidth;
  const vyska = b.offsetHeight;
  const sx = window.scrollX;
  const sy = window.scrollY;
  const okraj = document.documentElement.clientWidth;
  const stred = r.left + r.width / 2;
  const left = omez(stred - sirka / 2, 10, okraj - sirka - 10);
  let top = r.top - vyska - 12 + r.height * 0.06;
  if (top < 74) {
    top = r.bottom + 12;
    b.classList.add("dole");
  }
  b.style.left = `${left + sx}px`;
  b.style.top = `${top + sy}px`;
  b.style.setProperty("--ocasek", `${omez(stred - left, 22, sirka - 22)}px`);

  bublina = b;
  casovac = window.setTimeout(zavri, 3600 + text.length * 30);
}

export function initKami() {
  document.addEventListener("click", (e) => {
    const k = (e.target as Element).closest<HTMLElement>(".kami");
    if (!k) return;
    const id = k.dataset.kami as PostavaId;
    const info = kamiInfo[id];
    if (!info) return;
    const i = poradi[id] ?? 0;
    poradi[id] = (i + 1) % info.repliky.length;

    k.classList.remove("reaguje");
    void k.offsetWidth;
    k.classList.add("reaguje");
    window.setTimeout(() => k.classList.remove("reaguje"), 1000);

    rekni(k, id, info.repliky[i]);
    zvuk.reakce(id);
    document.dispatchEvent(new CustomEvent("kami:klik", { detail: { id, el: k } }));
  });
  window.addEventListener("resize", zavri);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") zavri();
  });
}
