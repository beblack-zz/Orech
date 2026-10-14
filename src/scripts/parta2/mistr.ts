/**
 * Titul mistra na celém webu. Kdo v komnatě U mistra (/zkouska) projde všech
 * devět úrovní a převezme mistrovský list, má v hlavičce pečeť 名人
 * (odkaz na list), v omamori pásku s titulem a kami ho při prvním kliknutí
 * za návštěvu stránky pozdraví po svém — „Mistře“, „Mistrová“, nebo
 * „Sensei“, podle toho, co si člověk v síni mistra vybral.
 *
 * Pamatuje si to prohlížeč pod klíčem `mistr`; do hlavičky se třída
 * dostane ještě před prvním vykreslením (skript v Hlavicka.astro), ať
 * pečeť neproblikne.
 */
import { nacti, uloz } from "./stav";
import { priOdchodu } from "./prechody";
import { osloveni, pozdravyMistra, urovne } from "../../data/mistr";
import type { OsloveniId, UrovenId, Znamka } from "../../data/mistr";
import type { PostavaId } from "../../data/parta";
import type { Kus } from "../../components/dilna/kus";

export const KLIC_MISTR = "mistr";
/** Pošle se na document, když se titul změní */
export const MISTR_ZMENA = "mistr:titul";

export interface Mistr {
  jmeno: string;
  osloveni: OsloveniId;
  /** Kdy byl list převzat (ms) */
  kdy: number;
  /** Známky na listu — nejlepší, jaké kdy byly (dají se zlepšit i potom) */
  znamky: Partial<Record<UrovenId, Znamka>>;
  /** Kus z Tvaru, který je na listu */
  kus?: Kus;
}

export function mistr(): Mistr | null {
  const m = nacti<Partial<Mistr> | null>(KLIC_MISTR, null);
  if (!m || typeof m !== "object" || typeof m.jmeno !== "string" || !m.osloveni || !(m.osloveni in osloveni)) return null;
  const znamky: Partial<Record<UrovenId, Znamka>> = {};
  for (const u of urovne) {
    const z = m.znamky?.[u.id];
    if (z === "yu" || z === "ryo" || z === "ka") znamky[u.id] = z;
  }
  return { jmeno: m.jmeno.slice(0, 40), osloveni: m.osloveni, kdy: typeof m.kdy === "number" ? m.kdy : Date.now(), znamky, kus: m.kus };
}

export function ulozMistra(m: Mistr) {
  uloz(KLIC_MISTR, m);
  ukazMistra();
  document.dispatchEvent(new CustomEvent(MISTR_ZMENA));
}

/** Pečeť v hlavičce a páska v omamori */
export function ukazMistra() {
  const m = mistr();
  document.documentElement.classList.toggle("je-mistr", !!m);
  const pecet = document.querySelector<HTMLAnchorElement>(".hlava-mistr");
  if (pecet) {
    const popis = m ? `${osloveni[m.osloveni].z}${m.jmeno ? ` — ${m.jmeno}` : ""}. Mistrovský list` : "";
    pecet.setAttribute("aria-label", popis);
    pecet.title = popis;
  }
  const paska = document.querySelector<HTMLElement>(".omamori-mistr-text");
  if (paska && m) paska.textContent = `${osloveni[m.osloveni].z}${m.jmeno ? ` · ${m.jmeno}` : ""}`;
}

/* ——— Pozdrav kami ——— */

const pozdraveni = new Set<PostavaId>();
priOdchodu(() => pozdraveni.clear());

/** Věta pro mistra — jen poprvé za návštěvu stránky, pak už kami mluví jako obvykle */
export function pozdravMistra(kdo: PostavaId): string | null {
  const m = mistr();
  if (!m || pozdraveni.has(kdo)) return null;
  pozdraveni.add(kdo);
  const vety = pozdravyMistra[kdo];
  if (!vety?.length) return null;
  return vety[Math.floor(Math.random() * vety.length)].replaceAll("{o}", osloveni[m.osloveni].volani);
}
