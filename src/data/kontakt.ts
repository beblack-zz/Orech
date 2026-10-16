/**
 * Kontakt (/kontakt) — kdo zvedá telefon, kdy je otevřeno a co parta říká.
 * Údaje (telefon, e-mail, adresa) jsou v data/uvod2.ts a otevírací doba
 * v data/rezervace.ts, ať všude stojí totéž.
 */
import type { PostavaId } from "./parta";
import { rezervace } from "./rezervace";
import { kdy } from "./dilna";
import { kontakt } from "./uvod2";

/**
 * Kdo má službu a zvedá provázkový telefon. Dílna má otevřeno v úterý
 * a v pátek: v úterý Pecinka (úterý je v japonštině den ohně, 火曜日),
 * v pátek Kapka (pátek je den zlata, 金曜日 — a ona má ráda, co se leskne).
 * Mimo otevírací dobu na plotě spí ten, kdo přijde příště.
 */
export function sluzba(d: Date): PostavaId {
  return pristiDen(d) === 2 ? "pecinka" : "kapka";
}

const hodina = (d: Date) => d.getHours() + d.getMinutes() / 60;

export const otevrenoTed = (d: Date) => rezervace.dny.includes(d.getDay()) && hodina(d) >= rezervace.od && hodina(d) < rezervace.do;

/** Den (podle Date.getDay), kdy je otevřeno dnes nebo příště */
export function pristiDen(d: Date): number {
  for (let i = 0; i < 8; i++) {
    const den = (d.getDay() + i) % 7;
    if (!rezervace.dny.includes(den)) continue;
    if (i === 0 && hodina(d) >= rezervace.do) continue;
    return den;
  }
  return rezervace.dny[0];
}

const KDY = ["v neděli", "v pondělí", "v úterý", "ve středu", "ve čtvrtek", "v pátek", "v sobotu"];

/** „teď otevřeno, do 18:00“ / „otevíráme dnes v 9:00“ / „otevíráme v pátek v 9:00“ */
export function stavSlovy(d: Date): { otevreno: boolean; text: string } {
  if (otevrenoTed(d)) return { otevreno: true, text: `teď otevřeno, do ${rezervace.do}:00` };
  const den = pristiDen(d);
  const dnes = den === d.getDay() && hodina(d) < rezervace.od;
  const zitra = den === (d.getDay() + 1) % 7;
  return { otevreno: false, text: `otevíráme ${dnes ? "dnes" : zitra ? "zítra" : KDY[den]} v ${rezervace.od}:00` };
}

/** Co se říká do provázku */
export const repliky = {
  halo: "Haló, tady dílna!",
  bublinka: "Já to slyším taky!",
  spi: "Teď spím… Napiš, ráno odpovím.",
  dopis: "Dopis došel! Odpovíme do večera.",
  dopisSpi: "Dopis došel, ráno ho přečtu.",
  psst: "Psst… všichni spí.",
};

/** Řádek pod tlačítky, když je kamera uvnitř u ústředny */
export const uvnitrHlaseni = [
  "Linka 二 zvoní. Zvedá to {kdo} a poslouchá i Bublinka.",
  "Cedulka hledá v knize rezervací volné místo, Kachlík ti ťuká odkaz na rezervace.",
  "Hotovo — odkaz ti přijde e-mailem. Stačí ho nadiktovat do telefonu.",
];

/** Řádky pod tlačítky u tmavé ústředny, když je zavřeno ({stav} = „Otevíráme v úterý v 9:00“) */
export const uvnitrZavreno = [
  "Linka 二 zvoní do prázdna — v dílně teď nikdo není.",
  "{stav}. Napiš dopis, ráno odpovíme.",
];

/** Kudy ke dveřím — karta v sekci Kudy k nám pod první obrazovkou */
export const kudy = {
  nadpis: "Zelený dům se štítem do ulice.",
  kroky: [
    "V Luční hledej zelený dům se dvěma balkony nad sebou a s lampou, na které visí amplion.",
    `Posuvná pozinkovaná brána bývá v otevírací době otevřená — každé ${kdy.dny} ${kdy.hodiny}.`,
    "Sejdi po rampě dolů. Dveře do dílny jsou prosklené, vlevo od velkých oken.",
  ],
};

/** Dopis po provázku se odešle poštou — předmět a podpis */
export const dopis = {
  komu: kontakt.email,
  predmet: "Dopis z webu",
};
