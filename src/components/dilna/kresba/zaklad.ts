/**
 * Společné kousky kreseb Dílny. Kresby se skládají jako text (SVG
 * v řetězci) a stránka je vkládá přes set:html — stejně jako Domek 2.
 * Čisté funkce bez DOM; náhoda je deterministická, ať se kresba při
 * každém buildu nakreslí stejně.
 *
 * Světlo jde ve všech kresbách zleva shora — z okna dílny.
 */
import { glazury } from "../../../data/kurzy2";
import { syrova, matne } from "../../../data/dilna";

export { nahoda } from "../../parta2/tvary";

export type Bod = [number, number];

/** Zaokrouhlení na desetiny — kratší cesty a stejné číslo při každém buildu */
export const f = (n: number) => (Math.round(n * 10) / 10).toString();

export const omez = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** Hladká křivka bodů (Catmull-Rom jako Bézier) — bez M na začátku */
export function hladce(body: Bod[]) {
  let d = "";
  for (let i = 0; i < body.length - 1; i++) {
    const p0 = body[i - 1] ?? body[i];
    const p1 = body[i];
    const p2 = body[i + 1];
    const p3 = body[i + 2] ?? p2;
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

/** Celá hladká cesta i s M */
export const cesta = (body: Bod[]) => `M${f(body[0][0])} ${f(body[0][1])}${hladce(body)}`;

/* ——— Barvy ——— */

const hex = (h: string) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** Smíchá dvě barvy #RRGGBB v poměru t */
export const smichej = (a: string, b: string, t: number) => {
  const A = hex(a);
  const B = hex(b);
  return `#${A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
};

export type Trojice = { svetlo: string; stred: string; stin: string };

/**
 * Hlína podle toho, kde je na cestě. Mokrá je tmavá a leskne se, kožená
 * matně svítí, suchá je bledá jako křída, po přežahu do meruňkova
 * a po ostrém výpalu (holá patka pod glazurou) do písková.
 */
export const HLINA: Record<"mokry" | "kozeny" | "suchy" | "prezah" | "palena", Trojice> = {
  mokry: { svetlo: "#B48D70", stred: "#8C6A55", stin: "#4F3A2E" },
  kozeny: { svetlo: "#C3A285", stred: "#A4836A", stin: "#6A5242" },
  suchy: { svetlo: "#E9DFD2", stred: "#D3C5B3", stin: "#9C8C79" },
  prezah: { svetlo: "#F6E3D3", stred: "#E8C9B1", stin: "#B98F74" },
  palena: { svetlo: "#E3CBA8", stred: "#C7A985", stin: "#86694D" },
};

/** Glazura po výpalu — barvy z kurzy2.ts, jako všude na webu */
export const glazuraPo = (nazev: string): Trojice => glazury.find((g) => g.nazev === nazev) ?? glazury[0];

/** Syrová glazura — bledá a křídová, jak zaschne na kusu */
export const glazuraPred = (nazev: string): Trojice => {
  const c = syrova[nazev] ?? "#EEE9E0";
  return { svetlo: smichej(c, "#FFFFFF", 0.45), stred: c, stin: smichej(c, "#6E6458", 0.34) };
};

export const jeMatna = (nazev: string) => matne.has(nazev);

/* ——— Paleta dílny ——— */

export const P = {
  /** Omítka, na kterou svítí okno */
  zed: "#EFE6D6",
  zedStin: "#D9CBB2",
  zedTma: "#C4B497",
  /** Překližka — světlé dřevo s vrstvami na hraně */
  preklizka: "#DDBF93",
  preklizkaSvetlo: "#ECD6B2",
  preklizkaStin: "#B8956A",
  preklizkaHrana: "#C9A574",
  /** Tmavé dřevo stolů a nástrojů */
  drevo: "#9C7246",
  drevoSvetlo: "#C49A68",
  drevoStin: "#6E4E30",
  /** Černé lišty regálu */
  lista: "#2E2A27",
  listaSvetlo: "#55504B",
  /** Ocel kruhu a pece */
  ocel: "#A9B0B5",
  ocelSvetlo: "#E6EAEC",
  ocelStin: "#6B7278",
  /** Šamot — cihly a desky v peci */
  samot: "#E7D3B3",
  samotStin: "#B99C74",
  /** Inkoust a rumělka webu */
  inkoust: "#2B2420",
  inkoust2: "#5C5047",
  rumelka: "#C4432B",
  papir: "#F7F1E3",
  zlato: "#D6A23A",
};

/* ——— Pomocníci do <defs> ——— */

/** Vodorovný přechod přes válec: tmavá hrana, světlo zleva, stín vpravo */
export const valcovy = (id: string, t: Trojice, lesk = 0.42) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0">` +
  `<stop offset="0" stop-color="${t.stin}"/>` +
  `<stop offset="0.14" stop-color="${t.stred}"/>` +
  `<stop offset="${f(lesk - 0.08)}" stop-color="${t.svetlo}"/>` +
  `<stop offset="${f(lesk + 0.12)}" stop-color="${t.svetlo}"/>` +
  `<stop offset="0.66" stop-color="${t.stred}"/>` +
  `<stop offset="0.9" stop-color="${smichej(t.stin, t.stred, 0.3)}"/>` +
  `<stop offset="1" stop-color="${t.stin}"/>` +
  `</linearGradient>`;

/** Svislý přechod z jedné barvy do druhé */
export const svisly = (id: string, nahore: string, dole: string, o1 = 1, o2 = 1) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${nahore}" stop-opacity="${o1}"/><stop offset="1" stop-color="${dole}" stop-opacity="${o2}"/></linearGradient>`;

/** Měkký stín na zemi — kruhový přechod do ztracena */
export const mekkyStin = (id: string, barva = "#2B2420", sila = 0.32) =>
  `<radialGradient id="${id}"><stop offset="0" stop-color="${barva}" stop-opacity="${sila}"/><stop offset="0.6" stop-color="${barva}" stop-opacity="${f(sila * 0.45)}"/><stop offset="1" stop-color="${barva}" stop-opacity="0"/></radialGradient>`;

/** Bezpečný text do SVG */
export const txt = (s: string) => s.replace(/[<&>"]/g, (c) => ({ "<": "&lt;", "&": "&amp;", ">": "&gt;", '"': "&quot;" })[c] ?? c);
