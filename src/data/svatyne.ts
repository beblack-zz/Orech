import type { PostavaId } from "./parta";

/**
 * Svatyně — třetí komnata hry se schovanými kami (/svatyne). Otevře se za
 * všech devět nalezených a uvnitř se jednou vytáhne omikuji s pokladem.
 *
 * Lístek je vždycky velké štěstí, má číslo devět a podepíše ho jeden
 * z party. Heslo na lístku je znak a čtení jeho stanoviště z cesty hlíny
 * (kami.ts) — v dílně tak stačí znát devět slov.
 */

/**
 * Kde kdo ve svatyni je (components/svatyne/kresba.ts, scéna 1200 × 1000):
 * x osa postavičky, y spodní hrana jejího obrázku (180 × 180), w jeho šířka.
 * Každý sedí tam, kam patří — Pecinka jako plamínek ve svatyňce, Vázička
 * na oltáři, Kapka kape z bambusu, Bublinka plave v nádržce, Cedulka visí
 * mezi destičkami ema, Kachlík je dlaždice na cestě, Šamotka drží obětní
 * skříňku, Střípek sedí u strážného draka a Hlínka spí u kořenů posvátného stromu.
 */
export const sezeni: { id: PostavaId; x: number; y: number; w: number }[] = [
  { id: "pecinka", x: 600, y: 662, w: 72 },
  { id: "vazicka", x: 524, y: 674, w: 58 },
  { id: "kapka", x: 1023, y: 811, w: 60 },
  { id: "bublinka", x: 1064, y: 849, w: 70 },
  { id: "cedulka", x: 156, y: 743, w: 60 },
  { id: "kachlik", x: 700, y: 996, w: 74 },
  { id: "samotka", x: 600, y: 867, w: 160 },
  { id: "stripek", x: 432, y: 985, w: 72 },
  { id: "hlinka", x: 205, y: 971, w: 84 },
];

/** Věštba na lístku pokladu — každý z party má jednu, losuje se podpis */
export const vestbyPokladu: { kdo: PostavaId; text: string }[] = [
  { kdo: "hlinka", text: "Máš nás všechny. I mě, a to jsem spala. Hlína tě bude poslouchat." },
  { kdo: "kapka", text: "Devět z devíti. Přesně tolik vody, kolik je potřeba — ani kapka navíc." },
  { kdo: "pecinka", text: "Kdo umí hledat, umí i čekat. A to je v hrnčířství polovina práce." },
  { kdo: "stripek", text: "Kdo najde i střep pod ponkem, tomu se v dílně nic neztratí." },
  { kdo: "vazicka", text: "Bystré oko a klidné ruce. Ke kruhu ti chybí už jen hlína." },
  { kdo: "bublinka", text: "Dobře. Vzdávám se. Ale jenom tobě." },
  { kdo: "kachlik", text: "Devět kami, žádný nechybí, žádný nepřebývá. Úředně správně. 正" },
  { kdo: "cedulka", text: "Tvoje jméno si zapíšu. Rydlem, aby vydrželo i výpal." },
  { kdo: "samotka", text: "Unesla jsem tisíc hrnků. Ten tvůj ponesu ráda." },
];

/** Co lístek dává — rozhodnuto 14. 10. 2026: sleva na první návštěvu dílny */
export const odmena = {
  sleva: "20 %",
  co: "sleva na první návštěvu",
  pokyn: "Ukaž lístek v dílně a řekni heslo",
};
