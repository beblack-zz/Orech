/**
 * Barvy oblohy podle hodiny. Čistý modul bez `window` — používá ho
 * obloha na stránce (nebe.ts) i build, který z hodiny kurzu barví
 * útržek jízdenky na /kurzy-2.
 */

const omez = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const hex = (h: string) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mixBarva = (a: string, b: string, t: number) => {
  const A = hex(a);
  const B = hex(b);
  return `#${A.map((v, i) => Math.round(mix(v, B[i], t)).toString(16).padStart(2, "0")).join("")}`;
};

interface Paleta {
  h: number;
  barvy: [string, string, string, string, string, string, string, string];
  hvezdy: number;
  noc: number;
}

/* nahoře, uprostřed, u obzoru, světlo mraku, stín mraku, záře mraku, kopce v dálce, kopce blíž */
const NOC: Paleta["barvy"] = ["#0B1026", "#18204A", "#2C2F5E", "#2A3366", "#141A3A", "#3A4478", "#1E2448", "#161B36"];
const PALETY: Paleta[] = [
  { h: 0, barvy: NOC, hvezdy: 1, noc: 1 },
  { h: 4.5, barvy: ["#141B42", "#33397A", "#7E6A93", "#5B5A8E", "#2A2C5E", "#7A78A8", "#39407A", "#262B5A"], hvezdy: 0.8, noc: 0.85 },
  { h: 5.5, barvy: ["#4A5A9A", "#C48FA6", "#F4B98E", "#F2C7C2", "#8E80AE", "#FFE4DC", "#8C7FAE", "#6A6694"], hvezdy: 0.1, noc: 0.35 },
  { h: 6.5, barvy: ["#6F8FC8", "#E7B6A8", "#FBD9A0", "#FFE6D6", "#B49BB8", "#FFF4EC", "#9AA4C8", "#7C8BA8"], hvezdy: 0, noc: 0.08 },
  { h: 8, barvy: ["#6FA4DA", "#B5D3EC", "#F4E8D2", "#FFFFFF", "#C3D2E6", "#FFFFFF", "#9FB9D2", "#7FA0A8"], hvezdy: 0, noc: 0 },
  { h: 12, barvy: ["#3E86D3", "#8DC1EE", "#DCEFF7", "#FFFFFF", "#BFD3EC", "#FFFFFF", "#8FB3D6", "#6E9A9C"], hvezdy: 0, noc: 0 },
  { h: 16, barvy: ["#4F8DD0", "#9EC6E8", "#EFE6CC", "#FFFDF6", "#C9CFE0", "#FFFFFF", "#9DB6CF", "#7D9C94"], hvezdy: 0, noc: 0 },
  { h: 18.5, barvy: ["#5F7FBF", "#E2B48E", "#F8CF8A", "#FFE2C0", "#C99A9A", "#FFF2DE", "#A99BB8", "#8A8A9E"], hvezdy: 0, noc: 0.05 },
  { h: 20, barvy: ["#3A3C7C", "#C0708A", "#F39A66", "#F7B49A", "#7A5E8E", "#FFD8C4", "#6E5E8E", "#4E4672"], hvezdy: 0.15, noc: 0.35 },
  { h: 21, barvy: ["#1E2456", "#4E4A84", "#A86A7E", "#6E5E8E", "#2E2E62", "#8E7EA8", "#3C3A6E", "#2A2A55"], hvezdy: 0.6, noc: 0.75 },
  { h: 22.5, barvy: NOC, hvezdy: 1, noc: 1 },
  { h: 24, barvy: NOC, hvezdy: 1, noc: 1 },
];
export const PROMENNE = ["--nebe-nahore", "--nebe-stred", "--nebe-obzor", "--mrak-svetlo", "--mrak-stin", "--mrak-zare", "--kopec-daleko", "--kopec-blizko"];

export function paleta(hodina: number) {
  const h = ((hodina % 24) + 24) % 24;
  let i = 0;
  while (i < PALETY.length - 2 && PALETY[i + 1].h <= h) i++;
  const a = PALETY[i];
  const b = PALETY[i + 1];
  const t = omez((h - a.h) / (b.h - a.h));
  return {
    barvy: a.barvy.map((c, k) => mixBarva(c, b.barvy[k], t)),
    hvezdy: mix(a.hvezdy, b.hvezdy, t),
    noc: mix(a.noc, b.noc, t),
  };
}
