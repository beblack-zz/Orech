/**
 * Co Vázička-průvodce ví o hostovi — jen to, co host v domě sám udělal
 * a co si kvůli hře pamatují jiné skripty: podpis rydlem, mistrovský list,
 * zkoušky u mistra, nalezené kami, šátek z krámku, slepené číslo, uzlíky
 * omikuji, lístek ze svatyně, rozepsaná dárková jízdenka a noc v hlavičce.
 * Sama nic nového neukládá — nepočítá návštěvy a neměří čas (karta postavy
 * v data/pruvodce.ts). Klíče patří jiným skriptům, tady se jen čtou.
 */
import { nacti } from "./stav";
import { mistr } from "./mistr";
import type { Mistr } from "./mistr";
import { jmeno as jmenoKami } from "./kami";
import { KLIC_NALEZENI } from "./zaves";
import { osloveni, znamky } from "../../data/mistr";
import type { Znamka } from "../../data/mistr";
import { kamiInfo, komnaty } from "../../data/kami";
import { parta } from "../../data/parta";
import type { PostavaId } from "../../data/parta";
import { kamiPostup, skryse, mojeZkouska, coVim } from "../../data/pruvodce";
import type { Rada, Replika } from "../../data/pruvodce";

/** Kdo který klíč zapisuje — tady se jen čte */
const KLICE = {
  /** scripts/zkouska/postup.ts: známky a body z úrovní u mistra */
  postup: "mistr-postup",
  /** scripts/zkouska/postup.ts: podpis rydlem, jedno jméno pro celý web */
  jmeno: "dilna-jmeno",
  /** scripts/obchod2/satek.ts: id kusů v šátku (košíku krámku) */
  satek: "obchod2-satek",
  /** scripts/nenalezeno/hlavni.ts: kolikrát slepil číslo na ztracené stránce */
  slepeno: "nenalezeno-slepeno",
  /** scripts/parta2/omikuji.ts: kolik uzlíků omikuji uvázal */
  uzliky: "parta2-uzliky",
  /** scripts/svatyne/svatyne.ts: vytažený lístek (sleva na první návštěvu) */
  listek: "svatyne-listek",
  /** scripts/rezervace/darky.ts: rozepsaná dárková jízdenka */
  darek: "rezervace-darek",
  /** scripts/parta2/pruvodce.ts: na úvodu se už jednou představila */
  predstavena: "pruvodce-predstavena",
};
/** Futatsu v šátku — id podle pořadí v data/obchod.ts (viz data/kramek.ts, `na-prani-${i}`) */
const FUTATSU = "na-prani-8";
const KAMI = new Set<string>(parta.map((p) => p.id));
const VSICHNI = parta.length;

export interface Host {
  /** Podpis rydlem (jen 1. pád) — z mistrovského listu, jinak z podpisu */
  jmeno: string | null;
  mistr: Mistr | null;
  nalezeni: PostavaId[];
  /** Prošlé úrovně u mistra a známka z její (Tvar 形) */
  razitek: number;
  tvar: Znamka | null;
  vSatku: number;
  futatsuVSatku: boolean;
  slepeno: number;
  uzliky: number;
  listek: boolean;
  darek: boolean;
  /** Noc v hlavičce — čte se živě z třídy, host ji přepíná tlačítkem */
  noc: boolean;
  predstavena: boolean;
}

const cislo = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);

export function zjisti(): Host {
  const m = mistr();
  const podpis = nacti<unknown>(KLICE.jmeno, "");
  const jmeno = (m?.jmeno || (typeof podpis === "string" ? podpis : "")).trim();
  const postup = nacti<{ urovne?: Record<string, { znamka?: unknown } | undefined> } | null>(KLICE.postup, null);
  const urovne = postup && typeof postup === "object" && postup.urovne && typeof postup.urovne === "object" ? postup.urovne : {};
  const znamka = (z: unknown): z is Znamka => z === "yu" || z === "ryo" || z === "ka";
  const satek = nacti<unknown>(KLICE.satek, []);
  const vSatku = Array.isArray(satek) ? satek.filter((id): id is string => typeof id === "string") : [];
  const nalezeni = nacti<unknown>(KLIC_NALEZENI, []);
  const darek = nacti<Record<string, unknown> | null>(KLICE.darek, null);
  const tvar = urovne.tvar?.znamka;
  return {
    jmeno: jmeno || null,
    mistr: m,
    nalezeni: Array.isArray(nalezeni) ? [...new Set(nalezeni.filter((id): id is PostavaId => typeof id === "string" && KAMI.has(id)))] : [],
    razitek: Object.values(urovne).filter((u) => znamka(u?.znamka)).length,
    tvar: znamka(tvar) ? tvar : null,
    vSatku: vSatku.length,
    futatsuVSatku: vSatku.includes(FUTATSU),
    slepeno: cislo(nacti<unknown>(KLICE.slepeno, 0)),
    uzliky: cislo(nacti<unknown>(KLICE.uzliky, 0)),
    listek: !!nacti<unknown>(KLICE.listek, null),
    darek: !!darek && typeof darek === "object" && ["pro", "vzkaz", "od"].some((k) => typeof darek[k] === "string" && (darek[k] as string).trim() !== ""),
    noc: !!document.querySelector(".hlava")?.classList.contains("je-noc"),
    predstavena: nacti<unknown>(KLICE.predstavena, null) != null,
  };
}

/** {o} oslovení mistra (5. pád), {z} titul z listu, {jmeno} podpis (1. pád) a cokoli z `navic` */
export const vypln = (text: string, h: Host, navic: Record<string, string | number> = {}) =>
  text.replace(/\{(\w+)\}/g, (_, k: string) => {
    if (k === "o") return h.mistr ? osloveni[h.mistr.osloveni].volani : "";
    if (k === "z") return h.mistr ? osloveni[h.mistr.osloveni].z : "";
    if (k === "jmeno") return h.jmeno ?? "";
    return String(navic[k] ?? "");
  });
export const vyplnRepliku = (r: Replika, h: Host): Replika => ({ ...r, text: vypln(r.text, h) });

/* ——— Čísla slovy, jak je řekne nahlas ——— */
const SLOVY = ["nula", "jeden", "dva", "tři", "čtyři", "pět", "šest", "sedm", "osm", "devět"];
const PO_KOLIKATEM: Record<number, string> = { 3: "třetím", 6: "šestém", 9: "devátém" };
const visi = (n: number) => (n === 1 ? "visí jeden" : n <= 4 ? `visí ${SLOVY[n]}` : `jich visí ${SLOVY[n]}`);
const zbyva = (z: number) => (z === 1 ? "Zbývá poslední." : z <= 4 ? `Zbývají ${SLOVY[z]}.` : `Zbývá ${SLOVY[z]}.`);
const kusy = (n: number) => `${n} ${n === 1 ? "kus" : n <= 4 ? "kusy" : "kusů"}`;

/** Tajemství o kami podle toho, kolik jich host našel */
const kamiTed = (h: Host): Replika => {
  const n = h.nalezeni.length;
  if (n === 0) return kamiPostup.nic;
  if (n >= VSICHNI) return kamiPostup.vse;
  const dalsi = komnaty.find((k) => k.prah > n);
  const komnata = dalsi && PO_KOLIKATEM[dalsi.prah] ? `Komnata ${dalsi.nazev} se otevře po ${PO_KOLIKATEM[dalsi.prah]}.` : "";
  return { ...kamiPostup.cast, text: vypln(kamiPostup.cast.text, h, { visi: visi(n), zbyva: zbyva(VSICHNI - n), komnata }).trim() };
};

/** Kde se schovává první, koho host ještě nemá: na Partě 2 její skrýš odtud, jinde skrýš po webu */
const napoveda = (h: Host, stranka: string): string | null => {
  const chybi = (id: PostavaId) => !h.nalezeni.includes(id);
  if (stranka === "parta-2") {
    const p = parta.find((k) => chybi(k.id));
    return p ? `${jmenoKami(p.id)}? ${kamiInfo[p.id].skrys}` : null;
  }
  return skryse.find(([id]) => chybi(id))?.[1] ?? null;
};

/**
 * Rada pro tohohle hosta: u `druh` doplní větu podle toho, co udělal;
 * null = nemá co říct (třeba nápověda, když má všech devět)
 */
export function radaPro(r: Rada, h: Host, stranka: string): Rada | null {
  if (r.druh === "kami") {
    const k = kamiTed(h);
    return { ...r, veta: k.text, vMenu: undefined, vyraz: k.vyraz };
  }
  if (r.druh === "napoveda") {
    const text = napoveda(h, stranka);
    return text ? { ...r, veta: text, vMenu: undefined } : null;
  }
  if (r.druh === "tvar" && h.tvar) {
    const k = mojeZkouska[h.tvar];
    return { ...r, otazka: mojeZkouska.po, veta: k.text, vyraz: k.vyraz };
  }
  return r;
}

/** „Povím ti, co o tobě vím“: řádky jen toho, co web opravdu má */
export function coVimPolozky(h: Host): string[] {
  const p: string[] = [];
  if (h.jmeno) p.push(`Podpis rydlem: ${h.jmeno}`);
  if (h.mistr) p.push(`Mistrovský list: ${osloveni[h.mistr.osloveni].z}`);
  if (h.razitek) p.push(`U mistra ${h.razitek} z 9 razítek${h.tvar ? `, moje zkouška Tvar na ${znamky[h.tvar].znak}` : ""}`);
  if (h.nalezeni.length) p.push(`Na závěsu ${h.nalezeni.length} z ${VSICHNI} kami`);
  if (h.vSatku) p.push(`V šátku z krámku ${kusy(h.vSatku)}${h.futatsuVSatku ? ", i Futatsu" : ""}`);
  if (h.slepeno) p.push(`Slepené číslo na ztracené stránce (${h.slepeno}×)`);
  if (h.uzliky) p.push(`Uvázané uzlíky omikuji: ${h.uzliky}`);
  if (h.listek) p.push("Lístek ze svatyně");
  if (h.darek) p.push("Rozepsaná dárková jízdenka — pro koho, nevím");
  if (h.noc) p.push("Noc v hlavičce");
  if (h.predstavena) p.push("Že jsem se ti už představila");
  return p;
}

/** Nadpis „co vím“ — prázdný seznam má vlastní */
export const coVimTitul = (polozky: string[]) => (polozky.length ? coVim.titul : coVim.nicTitul);
