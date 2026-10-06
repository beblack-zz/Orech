import type { PostavaId } from "./parta";
import type { Kurz } from "./kurzy";

/**
 * Doplňky pro /kurzy-2. Termíny, ceny a popisy zůstávají v kurzy.ts —
 * tady je jen to, co nový vzhled přidává: kdo kurz „hlídá“, pro koho je
 * (podle toho radí průvodce výběrem), co se na něm člověk naučí a pár
 * věcí kolem.
 *
 * Kurzy v kurzy.ts nemají id, proto se páruje podle názvu. Když se název
 * změní a sem se nepřipíše, kurz se na stránce ukáže dál, jen bez patrona
 * a průvodce ho nebude doporučovat.
 */

export type Uroven = "zacatek" | "trochu" | "pokrocily";
export type Cas = "den" | "vikend" | "pravidelne";
export type Kdo = "ja" | "dite" | "parta";

export interface KurzNavic {
  /** Kami, který kurz hlídá — sedí na jízdence */
  patron: PostavaId;
  uroven: Uroven[];
  cas: Cas[];
  kdo: Kdo[];
}

const VSECHNY_UROVNE: Uroven[] = ["zacatek", "trochu", "pokrocily"];

export const navic: Record<string, KurzNavic> = {
  "Velký & Malý": { patron: "bublinka", uroven: VSECHNY_UROVNE, cas: ["pravidelne"], kdo: ["dite"] },
  "Velký & Velký": { patron: "stripek", uroven: VSECHNY_UROVNE, cas: ["pravidelne"], kdo: ["ja", "parta"] },
  "Kurz kruh pro začátečníky": { patron: "hlinka", uroven: ["zacatek"], cas: ["pravidelne"], kdo: ["ja", "parta"] },
  "Víkendový workshop — mísy & talíře": { patron: "kachlik", uroven: VSECHNY_UROVNE, cas: ["vikend"], kdo: ["ja", "parta"] },
  "Glazování — pokročilý seminář": { patron: "kapka", uroven: ["trochu", "pokrocily"], cas: ["den"], kdo: ["ja", "parta"] },
  "Kurz kruhu — pokročilí": { patron: "vazicka", uroven: ["trochu", "pokrocily"], cas: ["pravidelne"], kdo: ["ja", "parta"] },
};

/* ——— Rozbor řádku „format“ ——— */

const DNY = ["neděle", "pondělí", "úterý", "středa", "čtvrtek", "pátek", "sobota"];
export const denVTydnu = (d: Date) => DNY[d.getDay()];

/** Začátek a konec z „úterky 13:00–14:30“; konec chybí, když ho formát neuvádí. */
export function cas(k: Kurz) {
  const m = k.format.match(/(\d{1,2}):(\d{2})(?:\s*[–-]\s*(\d{1,2}):(\d{2}))?/);
  if (!m) return null;
  return {
    od: [Number(m[1]), Number(m[2])] as [number, number],
    do: m[3] ? ([Number(m[3]), Number(m[4])] as [number, number]) : null,
  };
}

export const hodinaKurzu = (k: Kurz) => {
  const c = cas(k);
  return c ? c.od[0] + c.od[1] / 60 : 10;
};

/** Kolik dní akce trvá — kvůli víkendovým workshopům v kalendáři */
export const pocetDni = (k: Kurz) => {
  const m = k.format.match(/(\d+)\s*dn/);
  return m ? Number(m[1]) : 1;
};

/** Témata z popisu jako jednotlivé štítky: „Modelování, točení, …“ */
export const temata = (k: Kurz) =>
  k.desc
    .split("\n")[0]
    .replace(/\.$/, "")
    .split(/,\s*/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && t.length < 60);

/**
 * Cedulka ve stylu japonského obchodu: co visí na dveřích.
 * 準備中 — připravujeme, 受付中 — přijímáme, 残りわずか — zbývá málo, 満員 — plno.
 */
export const japonskaCedulka = (k: Kurz) =>
  k.state === "pripravujeme"
    ? { znak: "準備中", cesky: "připravujeme" }
    : k.state === "full"
      ? { znak: "満員", cesky: "obsazeno" }
      : k.state === "urgent"
        ? { znak: "残りわずか", cesky: "poslední místa" }
        : { znak: "受付中", cesky: "zápis běží" };

/* ——— Co se tu naučíš ——— */

export interface Dovednost {
  id: string;
  nazev: string;
  /** Pozice na stromě v procentech (vodorovně, svisle od spodu) */
  x: number;
  y: number;
  /** Z které dovednosti vyrůstá */
  z?: string;
  /** Kurzy, které ji učí — podle slov v jejich popisu */
  kurzy: string[];
}

const VM = "Velký & Malý";
const VV = "Velký & Velký";
const ZAC = "Kurz kruh pro začátečníky";
const WS = "Víkendový workshop — mísy & talíře";
const GLA = "Glazování — pokročilý seminář";
const POK = "Kurz kruhu — pokročilí";

export const dovednosti: Dovednost[] = [
  { id: "hlina", nazev: "Příprava hlíny", x: 50, y: 6, kurzy: [VM, VV, ZAC] },
  { id: "modelovani", nazev: "Modelování", x: 22, y: 30, z: "hlina", kurzy: [VM, VV] },
  { id: "toceni", nazev: "Točení na kruhu", x: 62, y: 28, z: "hlina", kurzy: [ZAC, WS, POK, VM, VV] },
  { id: "predloha", nazev: "Podle předlohy", x: 8, y: 54, z: "modelovani", kurzy: [VM, VV] },
  { id: "volna", nazev: "Volná tvorba", x: 30, y: 60, z: "modelovani", kurzy: [VM, VV] },
  { id: "zaklady", nazev: "Centrování, vytahování, tvarování", x: 54, y: 50, z: "toceni", kurzy: [ZAC] },
  { id: "obrabeni", nazev: "Obrábění", x: 80, y: 48, z: "toceni", kurzy: [VM, VV, ZAC] },
  { id: "ploche", nazev: "Mísy & talíře", x: 50, y: 74, z: "zaklady", kurzy: [WS] },
  { id: "vicka", nazev: "Víčka, džbány, sady", x: 76, y: 74, z: "obrabeni", kurzy: [POK] },
  { id: "glazovani", nazev: "Glazování", x: 92, y: 66, z: "obrabeni", kurzy: [VM, VV, WS, GLA] },
  { id: "vrstveni", nazev: "Oxidace, redukce, vrstvení", x: 84, y: 92, z: "glazovani", kurzy: [GLA] },
];

/* ——— Otázky ——— */

/** Odpovědi jsou ze stávající stránky Kurzy, jen je teď říká někdo z party. */
export const otazky: { q: string; a: string; kdo: PostavaId; odkaz?: { href: string; text: string } }[] = [
  { q: "Musím umět točit?", a: "Ne. Většina našich studentů začíná úplně od nuly. Lektor tě vším provede.", kdo: "stripek" },
  { q: "Co si mám vzít s sebou?", a: "Nic — zástěru, hlínu i nástroje máme tady. Přijď v oblečení, které se může ušpinit.", kdo: "hlinka" },
  { q: "Kolik nás bude?", a: "Malé skupiny, nejvýš 8 lidí. U kruhu se na každého dostane.", kdo: "samotka" },
  { q: "Kdo učí?", a: "Jiřík a Renča. Dva lektoři, každý s vlastním rukopisem.", kdo: "vazicka" },
  { q: "Kdy bude moje keramika hotová?", a: "Sušení a výpal trvají 2–3 týdny. Dáme ti vědět, až bude k vyzvednutí.", kdo: "pecinka" },
  { q: "Můžu kurz darovat?", a: "Ano. Prodáváme dárkové poukazy na všechny kurzy i open studio.", kdo: "cedulka", odkaz: { href: "#poukaz", text: "Poskládat poukaz" } },
];

/* ——— Ztracené nářadí ——— */

export type NaradiId = "zastera" | "houbicka" | "jehla" | "ocko" | "drat" | "stetec";

export const naradi: { id: NaradiId; nazev: string; k_cemu: string; skrys: string }[] = [
  { id: "zastera", nazev: "Zástěra", k_cemu: "Aby hlína zůstala v dílně.", skrys: "Visí tam, kde se rozhoduje, kterým kurzem začít." },
  { id: "houbicka", nazev: "Houbička", k_cemu: "Na vodu — tu správnou dávku.", skrys: "Leží u kruhu, na kterém se dá točit nanečisto." },
  { id: "jehla", nazev: "Jehla", k_cemu: "Zarovná okraj a vyryje podpis do dna.", skrys: "Zapíchnutá do jedné jízdenky." },
  { id: "ocko", nazev: "Očko", k_cemu: "Na obrábění — sloupne tenký proužek hlíny.", skrys: "Zamotalo se do větví stromu dovedností." },
  { id: "drat", nazev: "Drát", k_cemu: "Odřízne hotový kus od kruhu.", skrys: "Ležel na cestě domů, mezi sušením a výpalem." },
  { id: "stetec", nazev: "Štětec", k_cemu: "Na glazuru a engobu.", skrys: "Schoval se u dárkového poukazu." },
];

/* ——— Poukaz ——— */

/** Částky ze stávající stránky Kurzy */
export const castkyPoukazu = ["890", "1 500", "2 400"];

/* ——— Simulátor ——— */

/** Glazury, kterými se nanečisto vytočený kus „vypálí“ */
export const glazury = [
  { nazev: "celadon", svetlo: "#C6DCC4", stred: "#93B39B", stin: "#5E7C68" },
  { nazev: "tenmoku", svetlo: "#8A5A34", stred: "#3A2A22", stin: "#1E1612" },
  { nazev: "shino", svetlo: "#F6EEE2", stred: "#E9D5C0", stin: "#C98E6A" },
  { nazev: "matná bílá", svetlo: "#FFFDF8", stred: "#EFEAE0", stin: "#B9B0A2" },
  { nazev: "popelová šedá", svetlo: "#D8D6CC", stred: "#A9A79C", stin: "#6E6C64" },
  { nazev: "železitá hnědá", svetlo: "#C27A4A", stred: "#8A4A2A", stin: "#4E2A18" },
];
