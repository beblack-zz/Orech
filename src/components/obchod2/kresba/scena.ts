/**
 * Krámek — složení celé scény z částí (okoli, dum, prizemi, cedule).
 *
 * Každá část vrací vrstvy (zaklad.ts → Vrstvy); tady se vrstvy spojí
 * v pevném pořadí. Noční kopii (venku do noční modři, uvnitř do teplého
 * světla lampy — noc.ts) si stránka udělá z denní kresby až v prohlížeči,
 * aby HTML nemuselo nést kresbu dvakrát; prolíná ji přes denní podle
 * hodiny (--tma). Vrstva svetla se nekopíruje.
 */
import { okoli } from "./okoli";
import { dum } from "./dum";
import { prizemi } from "./prizemi";
import { cedule } from "./cedule";
import type { Vrstvy, Obdelnik } from "./zaklad";
export { nocni, teple, prebarvi } from "./noc";

export interface Scena {
  zadniDen: string;
  uvnitrDen: string;
  predniDen: string;
  svetla: string;
}

type Cast = "okoli" | "dum" | "prizemi" | "cedule";
const PORADI: Record<keyof Vrstvy, Cast[]> = {
  zadni: ["okoli", "dum", "prizemi", "cedule"],
  uvnitr: ["dum", "prizemi", "cedule", "okoli"],
  zem: ["okoli", "prizemi", "dum", "cedule"],
  predni: ["dum", "prizemi", "cedule", "okoli"],
  svetla: ["okoli", "dum", "prizemi", "cedule"],
};

let hotova: Scena | null = null;

/** Celá scéna — počítá se jednou za build (stránka z ní bere i znaky pro písmo) */
export function scena(): Scena {
  if (hotova) return hotova;
  const casti: Record<Cast, Vrstvy> = { okoli: okoli(), dum: dum(), prizemi: prizemi(), cedule: cedule() };
  const vrstva = (v: keyof Vrstvy) => PORADI[v].map((c) => casti[c][v] ?? "").join("\n");
  return (hotova = {
    zadniDen: vrstva("zadni"),
    uvnitrDen: vrstva("uvnitr"),
    predniDen: `${vrstva("zem")}\n${vrstva("predni")}`,
    svetla: vrstva("svetla"),
  });
}

/*
 * ——— Zastávky kamery ———
 * Obdélníky světa, které má kamera ukázat celé (zbytek obrazovky vyplní,
 * co je kolem). Široká obrazovka jich má míň, na telefonu se okno patra
 * a přízemí projíždí po kouscích, aby byly kusy dost velké. „noc“ je
 * rozsvěcování přes celou obrazovku, „konec“ tentýž záběr s místem pro
 * závěrečnou kartu.
 */
export const ZASTAVKY: Record<"siroka" | "uzka", { id: string; ram: Obdelnik }[]> = {
  siroka: [
    { id: "celek", ram: { x: 880, y: 230, w: 1440, h: 1660 } },
    { id: "okno", ram: { x: 1110, y: 570, w: 980, h: 590 } },
    { id: "prizemi", ram: { x: 1060, y: 1215, w: 1080, h: 610 } },
    { id: "noc", ram: { x: 760, y: 150, w: 1680, h: 1760 } },
    { id: "konec", ram: { x: 760, y: 150, w: 1680, h: 1760 } },
  ],
  uzka: [
    { id: "celek", ram: { x: 1040, y: 250, w: 1120, h: 1620 } },
    { id: "okno", ram: { x: 1170, y: 740, w: 430, h: 420 } },
    { id: "okno2", ram: { x: 1600, y: 740, w: 430, h: 420 } },
    { id: "vylohaL", ram: { x: 1110, y: 1300, w: 340, h: 470 } },
    { id: "dvere", ram: { x: 1440, y: 1300, w: 320, h: 470 } },
    { id: "vylohaP", ram: { x: 1750, y: 1300, w: 340, h: 470 } },
    { id: "noc", ram: { x: 900, y: 200, w: 1400, h: 1700 } },
    { id: "konec", ram: { x: 900, y: 200, w: 1400, h: 1700 } },
  ],
};
