/**
 * Společné kousky kreseb Domku 2. Kresby se tu skládají jako text (SVG
 * v řetězci), ne jako Astro komponenty — dají se tak vyrenderovat i mimo
 * stránku a porovnat s fotkou, ze které jsou obkreslené. Stránka je vkládá
 * přes set:html.
 *
 * Barvy jsou ze skutečných fotek domu (images/Dilna), jen srovnané do
 * palety nového vzhledu: šalvějově zelená fasáda, mátové zábradlí,
 * terakotové tašky, tmavě hnědé podbití, pozinkovaná brána.
 */
export { nahoda, chomac, body } from "../../parta2/tvary";

/** Zaokrouhlení na desetiny — kratší cesty a stejné číslo při každém buildu */
export const f = (n: number) => Math.round(n * 10) / 10;

export type Bod = [number, number];

export const body2 = (p: Bod[]) => p.map(([x, y]) => `${f(x)},${f(y)}`).join(" ");
export const mnohouhelnik = (p: Bod[], atributy = "") => `<polygon points="${body2(p)}" ${atributy}/>`;
export const lomena = (p: Bod[], atributy = "") => `<polyline points="${body2(p)}" fill="none" ${atributy}/>`;
export const obdelnik = (x: number, y: number, w: number, h: number, atributy = "") =>
  `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" ${atributy}/>`;
export const cara = (x1: number, y1: number, x2: number, y2: number, atributy = "") =>
  `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" ${atributy}/>`;
export const kruh = (cx: number, cy: number, r: number, atributy = "") => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" ${atributy}/>`;
export const elipsa = (cx: number, cy: number, rx: number, ry: number, atributy = "") =>
  `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" ${atributy}/>`;

/** Bod na úsečce A→B v poměru t */
export const mezi = (a: Bod, b: Bod, t: number): Bod => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/** Posun bodu kolmo k úsečce A→B (kladně doleva od směru A→B) */
export const kolmo = (a: Bod, b: Bod, d: number): Bod => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l = Math.hypot(dx, dy) || 1;
  return [-dy / l * d, dx / l * d];
};

export const plus = (a: Bod, b: Bod): Bod => [a[0] + b[0], a[1] + b[1]];

/** Pás podél úsečky A→B tloušťky t (kolmo „dolů“ od ní) jako mnohoúhelník */
export const pas = (a: Bod, b: Bod, t: number, atributy = "", posun = 0) => {
  const k0 = kolmo(a, b, posun);
  const k1 = kolmo(a, b, posun + t);
  return mnohouhelnik([plus(a, k0), plus(b, k0), plus(b, k1), plus(a, k1)], atributy);
};

/* ——— Paleta podle fotek ——— */
export const B = {
  /* fasáda */
  zed: "#CBD6B9",
  zedStin: "#B4C2A2",
  zedTma: "#9DAD8D",
  pilastr: "#D6DFC8",
  lodzie: "#BFCCAC",
  sokl: "#CFD0C8",
  /* zábradlí a desky balkonů */
  mata: "#A6CFA2",
  mataStin: "#86B384",
  mataSvetlo: "#C8E6C2",
  deska: "#E3E4DE",
  deskaSpodek: "#BDC0BD",
  deskaSeda: "#A6AAAB",
  /* okna */
  ram: "#F7F7F2",
  ramStin: "#D9DBD6",
  sklo: "#2B3744",
  skloSvetle: "#3E4D5C",
  odlesk: "#8DB3DB",
  /* střecha */
  tasky: "#B6583B",
  taskyTma: "#8E3D2A",
  taskySvetlo: "#D47A5C",
  drevo: "#4D3626",
  drevoTma: "#33251B",
  drevoSvetlo: "#6F4F37",
  /* brána a plechy */
  pozink: "#B5C0C5",
  pozinkTma: "#8B979D",
  pozinkSvetlo: "#E4EAED",
  svod: "#9CA6AB",
  /* zídka, plot, dlažba, silnice */
  zidka: "#CED7B4",
  zidkaStin: "#B8C29E",
  strisku: "#9B9C94",
  plot: "#5E5245",
  plotSvetly: "#7B6C5B",
  plotSpara: "#3B322A",
  pleteny: "#8B847A",
  pletenyTma: "#6C665D",
  dlazba: "#C9BFAB",
  dlazbaSpara: "#A79C87",
  obrubnik: "#D3CBBB",
  asfalt: "#6F6D6A",
  asfaltSvetly: "#858380",
  seda: "#C9CAC6",
  sedaStin: "#AEB0AC",
  kryt: "#6A767A",
  /* zeleň */
  borovice: "#263F2F",
  boroviceSvetla: "#38593F",
  trava: "#6E9A45",
  travaTma: "#4C7634",
  travaSvetla: "#94BC5E",
  /* uvnitř dílny */
  bila: "#F1EFE9",
  bilaStin: "#DEDBD2",
  taupe: "#A9937D",
  taupeStin: "#957F69",
  podlaha: "#B9BCB2",
  podlahaSvetla: "#CDD0C6",
  antracit: "#4B5054",
  antracitTma: "#3A3E41",
  antracitSvetly: "#5D6266",
  dub: "#C9A374",
  dubTma: "#A9834F",
  preklizka: "#D9BD8C",
  preklizkaTma: "#B89A68",
  cerna: "#2A2A2A",
  modra: "#2F57A3",
  modraTma: "#22437F",
  nerez: "#C7CDD1",
  nerezTma: "#8D959B",
  nerezSvetly: "#EEF1F3",
  sedeDvere: "#A9ADB0",
  dlazbaTmava: "#6A5D50",
  lososova: "#C98F7E",
};
