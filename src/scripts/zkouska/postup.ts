/**
 * Co má člověk v komnatě U mistra za sebou: nejlepší známku a body z každé
 * úrovně, kolikrát to zkoušel, pečeť a jméno. Pamatuje si to prohlížeč;
 * bez úložiště (anonymní okno) se hraje dál, jen bez paměti.
 *
 * Úrovně se odemykají po sobě: další jde hrát, až je předchozí prošlá.
 * Kdo jednou prošel, má razítko napořád — opakováním se dá jen zlepšit.
 */
import { nacti, uloz } from "../parta2/stav";
import { urovne, znamkaZBodu, poradiZnamky } from "../../data/mistr";
import type { UrovenId, Znamka } from "../../data/mistr";
import type { Kus } from "../../components/dilna/kus";
import { platnaPecet } from "../../components/zkouska/pecet";
import type { Pecet } from "../../components/zkouska/pecet";

/**
 * Stejná kontrola jako platnyKus v components/dilna/kus.ts. Postup potřebují
 * už dveře, tedy skript, který se načítá hned — import z kus.ts by do něj
 * přitáhl celou kresbu kusu i s glazurami, která je potřeba až za dveřmi.
 */
function platnyKus(x: unknown): x is Kus {
  const k = x as Kus;
  return (
    !!k &&
    typeof k === "object" &&
    Array.isArray(k.r) &&
    k.r.length >= 4 &&
    k.r.length <= 64 &&
    k.r.every((v) => typeof v === "number" && Number.isFinite(v) && v > 0 && v < 400) &&
    typeof k.v === "number" &&
    k.v > 4 &&
    k.v < 500 &&
    Array.isArray(k.glazury) &&
    k.glazury.length <= 2
  );
}

export const KLIC_POSTUP = "mistr-postup";
export const KLIC_PECET = "mistr-pecet";
/** Podpis rydlem ze stránky Dílna — jméno je pro celý web jedno */
export const KLIC_JMENO = "dilna-jmeno";
/** Rámec ho pošle na document po každé změně postupu */
export const ZMENA = "mistr:postup";

export interface Zaznam {
  znamka: Znamka;
  body: number;
  /** Kdy padla nejlepší známka (ms) */
  kdy: number;
  /** Kdy úroveň prošla poprvé — to je datum v sešitě */
  poprve: number;
  /** Kus z úrovně (Tvar) — ten nejlepší */
  kus?: Kus;
}

interface Ulozeno {
  urovne: Partial<Record<UrovenId, Zaznam>>;
  pokusy: Partial<Record<UrovenId, number>>;
}

let stav: Ulozeno = { urovne: {}, pokusy: {} };

const platnyZaznam = (z: unknown): z is Zaznam => {
  if (!z || typeof z !== "object") return false;
  const x = z as Record<string, unknown>;
  return (x.znamka === "yu" || x.znamka === "ryo" || x.znamka === "ka") && typeof x.body === "number" && typeof x.kdy === "number";
};

export function nactiPostup() {
  const x = nacti<Partial<Ulozeno> | null>(KLIC_POSTUP, null);
  stav = { urovne: {}, pokusy: {} };
  for (const u of urovne) {
    const z = x?.urovne?.[u.id];
    if (platnyZaznam(z)) stav.urovne[u.id] = { ...z, poprve: typeof z.poprve === "number" ? z.poprve : z.kdy, kus: z.kus && platnyKus(z.kus) ? z.kus : undefined };
    const p = x?.pokusy?.[u.id];
    if (typeof p === "number" && p > 0) stav.pokusy[u.id] = Math.floor(p);
  }
  return stav;
}

export const zaznam = (id: UrovenId) => stav.urovne[id];
export const pokusu = (id: UrovenId) => stav.pokusy[id] ?? 0;
export const prosla = (id: UrovenId) => !!stav.urovne[id];
export const proslych = () => urovne.filter((u) => prosla(u.id)).length;
/** Úroveň jde hrát, když je první, nebo je předchozí prošlá */
export const odemcena = (i: number) => i <= 0 || prosla(urovne[i - 1].id);
/** Kde stojí figurka: první neprošlá úroveň, nebo 9 = síň mistra */
export const kdeStoji = () => {
  const i = urovne.findIndex((u) => !prosla(u.id));
  return i < 0 ? urovne.length : i;
};
export const jeMistrem = () => proslych() === urovne.length;

/** Pokus se počítá, když se hra spustí */
export function pocitejPokus(id: UrovenId) {
  stav.pokusy[id] = pokusu(id) + 1;
  uloz(KLIC_POSTUP, stav);
}

/**
 * Zapíše výsledek. Vrací, jestli je to první průchod, nebo lepší známka
 * (lepší body při stejné známce se zapíšou potichu).
 */
export function zapisVysledek(id: UrovenId, body: number, kus?: Kus) {
  const znamka = znamkaZBodu(body);
  const byl = stav.urovne[id];
  const ted = Date.now();
  const prvni = !byl;
  const lepsiZnamka = !!byl && poradiZnamky[znamka] < poradiZnamky[byl.znamka];
  if (!byl || body > byl.body) {
    stav.urovne[id] = { znamka, body: Math.round(body), kdy: ted, poprve: byl?.poprve ?? ted, kus: kus ?? byl?.kus };
  } else if (kus && !byl.kus) {
    stav.urovne[id] = { ...byl, kus };
  }
  uloz(KLIC_POSTUP, stav);
  document.dispatchEvent(new CustomEvent(ZMENA, { detail: { id, prvni, lepsiZnamka } }));
  return { znamka, prvni, lepsiZnamka };
}

/** Jen při vývoji (/zkouska?vse): všech devět prošlých s náhodnými známkami, ať jde vidět síň mistra */
export function naZkousku() {
  nactiPostup();
  const ted = Date.now();
  for (const u of urovne) {
    if (stav.urovne[u.id]) continue;
    const body = 55 + Math.round(Math.random() * 45);
    stav.urovne[u.id] = { znamka: znamkaZBodu(body), body, kdy: ted, poprve: ted };
  }
  uloz(KLIC_POSTUP, stav);
}

export function smazPostup() {
  stav = { urovne: {}, pokusy: {} };
  uloz(KLIC_POSTUP, stav);
  document.dispatchEvent(new CustomEvent(ZMENA, { detail: {} }));
}

/* ——— Pečeť a jméno ——— */

export const nactiPecet = (): Pecet | null => {
  const p = nacti<unknown>(KLIC_PECET, null);
  return platnaPecet(p) ? p : null;
};
export const ulozPecet = (p: Pecet) => uloz(KLIC_PECET, p);

export const nactiJmeno = () => {
  const j = nacti<unknown>(KLIC_JMENO, "");
  return typeof j === "string" ? j.trim().slice(0, 40) : "";
};
export const ulozJmeno = (j: string) => uloz(KLIC_JMENO, j.trim().slice(0, 40));
