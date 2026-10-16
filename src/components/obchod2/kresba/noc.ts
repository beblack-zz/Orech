/**
 * Noční přebarvení kresby krámku. Čistý modul bez DOM a bez kreseb —
 * používá ho build (scena.ts, náhledy) i prohlížeč, který si noční kopii
 * vrstev udělá z denní až na stránce (scripts/obchod2/scena.ts), aby
 * HTML nemuselo nést kresbu dvakrát.
 *
 *   nocni   venku: barva krát noční modř plus trocha fialového šera
 *   teple   uvnitř: barva v teplém světle žárovky
 *
 * id se v kopii přejmenují (kd- → kn- venku, kd- → ku- uvnitř), aby se
 * gradienty denní a noční kresby nepletly.
 */
const hex = (h: string) => [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
const zpet = (c: number[]) => `#${c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")}`;

/** Venku v noci (h je šest hex číslic bez #) */
export const nocni = (h: string) => {
  const [r, g, b] = hex(h);
  return zpet([r * 0.29 + 14, g * 0.31 + 16, b * 0.52 + 38]);
};
/** Uvnitř v noci: barva v teplém světle žárovky */
export const teple = (h: string) => {
  const [r, g, b] = hex(h);
  return zpet([r * 0.92 + 6, g * 0.72 + 4, b * 0.46 + 2]);
};

const BARVA = /#([0-9a-fA-F]{6})\b/g;
export const prebarvi = (svg: string, fn: (h: string) => string, predpona: "kn" | "ku") =>
  svg.replace(BARVA, (_, h: string) => fn(h)).replace(/\bkd-/g, `${predpona}-`);
