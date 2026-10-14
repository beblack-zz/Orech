/**
 * Kresby pro Kami z papíru: Kachlík a Kapka podle kami podob
 * (src/components/characters/kami/Kachlik.astro a Kapka.astro), jen bez
 * filtrů ruční linky — tisk má být čistý. Každá kresba umí dvě verze:
 *
 *   barva   jak je postavička na webu
 *   obrys   k vybarvení: plochy bílé s tmavou linkou, oči zůstanou plné,
 *           tvářičky a lesky zmizí
 *
 * `R(obrys, k)` — k je kolik milimetrů má jednotka kresby, aby linka
 * v obrysu vyšla na papíře pořád stejně tlustá.
 */
import { INKOUST } from "./site.mjs";

const f = (n) => Math.round(n * 100) / 100;

export function R(obrys, k, id) {
  const mm = (x) => f(x / k);
  return {
    obrys, id,
    /** plocha: barva, nebo bílá s linkou */
    v: (barva, linka = 0.4) => (obrys ? `fill="#FFFFFF" stroke="${INKOUST}" stroke-width="${mm(linka)}" stroke-linejoin="round"` : `fill="${barva}"`),
    /** čára: v obrysu tmavá a aspoň tak silná, aby šla vidět */
    c: (barva, sirka) => (obrys ? `stroke="${INKOUST}" stroke-width="${f(Math.max(sirka, mm(0.3)))}"` : `stroke="${barva}" stroke-width="${sirka}"`),
    /** tmavý detail (oči, pusa) — plný v obou verzích */
    tma: (barva) => `fill="${obrys ? INKOUST : barva}"`,
    /** jen v barvě (tvářičky, lesky, stíny) */
    jenB: (s) => (obrys ? "" : s),
    /** jen v obrysu */
    jenO: (s) => (obrys ? s : ""),
  };
}

/* ——— Kachlík ——— */

/** Hanko 正 v rohu čela — v jednotkách kresby 180 */
const hanko = (r) =>
  `<g transform="rotate(-4 115 113)"><rect x="108" y="106" width="14" height="14" rx="1.5" ${r.obrys ? `fill="#FFFFFF" stroke="${INKOUST}" stroke-width="0.9"` : `fill="#B84A2B"`}/>` +
  `<path d="M110.5 109 H119.5 M115 109 V117.5 M115 113 H118.5 M112 113.5 V117.5 M110 117.5 H120" stroke="${r.obrys ? INKOUST : "#F4EBDD"}" stroke-width="1.3" stroke-linecap="square" fill="none"/></g>`;

/** Tvář Kachlíka — obočí, byakugó, oči, pusa a tvářičky (kresba 180) */
const kachlikTvar = (r) =>
  r.jenB(`<g fill="#B84A2B" opacity="0.3"><ellipse cx="68" cy="92" rx="6" ry="4"/><ellipse cx="112" cy="92" rx="6" ry="4"/></g>`) +
  `<path d="M72 72 H84 M96 72 H108" stroke="${INKOUST}" stroke-width="2" stroke-linecap="round"/>` +
  `<rect x="88.2" y="70.2" width="3.6" height="3.6" rx="0.4" ${r.obrys ? `fill="#FFFFFF" stroke="${INKOUST}" stroke-width="0.7"` : `fill="#E9C46E" stroke="#8A5A1E" stroke-width="0.6"`}/>` +
  `<ellipse cx="78" cy="81" rx="3.3" ry="4.2" fill="${INKOUST}"/><ellipse cx="102" cy="81" rx="3.3" ry="4.2" fill="${INKOUST}"/>` +
  `<circle cx="77" cy="79.3" r="1.3" fill="#FFF3E6"/><circle cx="101" cy="79.3" r="1.3" fill="#FFF3E6"/>` +
  `<path d="M84 96 H96" stroke="${INKOUST}" stroke-width="2" stroke-linecap="round"/>`;

/** Přechod kachle — radiální jako na webu */
const kachelDefs = (id) =>
  `<defs><radialGradient id="${id}" cx="0.32" cy="0.28" r="0.85"><stop offset="0" stop-color="#D99A6E"/><stop offset="0.55" stop-color="#C87E4E"/><stop offset="1" stop-color="#AA663B"/></radialGradient></defs>`;

/**
 * Stěny Kachlíkovy krabičky. Čelo je jeho tělo z kresby 180 (obdélník
 * 44–136 × 40–134) roztažené na stěnu; ostatní stěny mají tutéž kachel.
 */
export function kachlikSteny(obrys, id) {
  /* každá stěna má vlastní přechod — se stejným id by se na stránce opakovaly */
  let n = 0;
  const kachel = (w, h, r, uvnitr = "") => {
    if (r.obrys) return `<rect width="${w}" height="${h}" fill="#FFFFFF"/>` + uvnitr;
    const g = `${id}-k${n++}`;
    return kachelDefs(g) + `<rect width="${w}" height="${h}" fill="url(#${g})"/>` + uvnitr;
  };
  /* rámeček kachle o kousek dovnitř, jako na čele */
  const ramecek = (w, h, o) => `<rect x="${f(o)}" y="${f(o)}" width="${f(w - 2 * o)}" height="${f(h - 2 * o)}" rx="1.4" fill="none" stroke="${obrys ? INKOUST : "#B84A2B"}" stroke-width="${obrys ? 0.3 : 0.8}" opacity="${obrys ? 1 : 0.55}"/>`;
  return {
    celo: (w, h) => {
      const r = R(obrys, h / 94, id);
      return kachel(w, h, r) +
        `<g transform="scale(${f(w / 92)} ${f(h / 94)}) translate(-44 -40)">` +
        `<rect x="53" y="49" width="74" height="76" rx="4" fill="none" stroke="${obrys ? INKOUST : "#B84A2B"}" stroke-width="${obrys ? 0.7 : 2}" opacity="${obrys ? 1 : 0.55}"/>` +
        r.jenB(`<path d="M50 48 L50 126" stroke="#E9B892" stroke-width="2" stroke-linecap="round" opacity="0.5"/>`) +
        hanko(r) + kachlikTvar(r) + `</g>`;
    },
    levy: (w, h) => kachel(w, h, R(obrys, 1, id), ramecek(w, h, w * 0.1)),
    pravy: (w, h) => kachel(w, h, R(obrys, 1, id), ramecek(w, h, w * 0.1)),
    /* záda: nepolévaná hlína, rýhy na lepidlo do kamen a značka dílny */
    zada: (w, h) =>
      `<rect width="${w}" height="${h}" fill="${obrys ? "#FFFFFF" : "#D6A47C"}"/>` +
      [0.3, 0.5, 0.7].map((y) => `<path d="M${f(w * 0.14)} ${f(h * y)} H${f(w * 0.86)}" stroke="${obrys ? INKOUST : "#A8714A"}" stroke-width="${obrys ? 0.3 : 0.9}" stroke-linecap="round"/>`).join("") +
      `<circle cx="${f(w / 2)}" cy="${f(h * 0.84)}" r="${f(w * 0.07)}" fill="none" stroke="${obrys ? INKOUST : "#8E3F22"}" stroke-width="0.5"/>` +
      `<path d="M${f(w / 2 - w * 0.035)} ${f(h * 0.84)} H${f(w / 2 + w * 0.035)} M${f(w / 2)} ${f(h * 0.84 - w * 0.035)} V${f(h * 0.84 + w * 0.035)}" stroke="${obrys ? INKOUST : "#8E3F22"}" stroke-width="0.45"/>`,
    /* víko: kachel a světlejší obdélník, kam se přilepí vodováha */
    vrch: (w, h) =>
      kachel(w, h, R(obrys, 1, id), ramecek(w, h, w * 0.1)) +
      `<rect x="${f(w / 2 - 15)}" y="${f(h / 2 - 3)}" width="30" height="6" rx="0.8" fill="${obrys ? CHL_O : "#EAD2B4"}" stroke="${INKOUST}" stroke-width="0.2" stroke-dasharray="0.8 0.8"/>`,
    dno: (w, h) => `<rect width="${w}" height="${h}" fill="${obrys ? "#FFFFFF" : "#B9784A"}"/>`,
  };
}
const CHL_O = "#EEEEEE";

/**
 * Podstavec s getami pod Kachlíka — miska, na které stojí. Čelo a záda
 * ukazují obě geta zepředu (prkénko a dva zuby) a nad nimi chodidla,
 * boky jedno geta z profilu. Mezera mezi nimi je stín pod Kachlíkem.
 */
export function getaSteny(obrys, id) {
  const tma = obrys ? "#FFFFFF" : "#4A3B33";
  const drevo = obrys ? `fill="#FFFFFF" stroke="${INKOUST}" stroke-width="0.3"` : `fill="#C99A68" stroke="#6B5D4F" stroke-width="0.3"`;
  const zub = obrys ? `fill="#FFFFFF" stroke="${INKOUST}" stroke-width="0.3"` : `fill="#8C6444" stroke="#6B5D4F" stroke-width="0.25"`;
  const zepredu = (w, h, chodidla) => {
    /* geta stojí na 19/92 a 55/92 šířky, prkénko je 18/92 široké; v kresbě 180 mají od chodidla po zem 21 jednotek */
    const s = w / 92;
    const kus = (x) => {
      const gx = (x - 44) * s, gw = 18 * s;
      const yP = (141.4 - 134) * s, hp = 6.4 * s, yZ = yP + hp;
      return (chodidla ? `<ellipse cx="${f(gx + gw / 2)}" cy="${f(3 * s)}" rx="${f(11 * s)}" ry="${f(5 * s)}" ${obrys ? `fill="#FFFFFF" stroke="${INKOUST}" stroke-width="0.3"` : `fill="#B84A2B"`}/>` +
          `<path d="M${f(gx + 2 * s)} ${f(yP)} Q${f(gx + gw / 2)} ${f(yP - 9.4 * s)} ${f(gx + gw - 2 * s)} ${f(yP)}" stroke="${INKOUST}" stroke-width="0.7" fill="none" stroke-linecap="round"/>` : "") +
        `<rect x="${f(gx + 2.4 * s)}" y="${f(yZ)}" width="${f(3.6 * s)}" height="${f(h - yZ)}" ${zub}/><rect x="${f(gx + 12 * s)}" y="${f(yZ)}" width="${f(3.6 * s)}" height="${f(h - yZ)}" ${zub}/>` +
        `<rect x="${f(gx)}" y="${f(yP)}" width="${f(gw)}" height="${f(hp)}" rx="${f(1.4 * s)}" ${drevo}/>`;
    };
    return `<rect width="${w}" height="${h}" fill="${tma}"/>` + kus(63) + kus(99);
  };
  const zboku = (w, h) => {
    const s = 38 / 92;
    const yP = (141.4 - 134) * s, hp = 6.4 * s, yZ = yP + hp;
    const x0 = w * 0.12, x1 = w * 0.88;
    return `<rect width="${w}" height="${h}" fill="${tma}"/>` +
      `<rect x="${f(x0 + 1.4)}" y="${f(yZ)}" width="${f(2.2)}" height="${f(h - yZ)}" ${zub}/><rect x="${f(x1 - 3.6)}" y="${f(yZ)}" width="${f(2.2)}" height="${f(h - yZ)}" ${zub}/>` +
      `<rect x="${f(x0)}" y="${f(yP)}" width="${f(x1 - x0)}" height="${f(hp)}" rx="0.6" ${drevo}/>`;
  };
  return {
    celo: (w, h) => zepredu(w, h, true),
    zada: (w, h) => zepredu(w, h, true),
    levy: zboku,
    pravy: zboku,
    dno: (w, h) => `<rect width="${w}" height="${h}" fill="${obrys ? "#FFFFFF" : "#E8DCC6"}"/>`,
  };
}

/**
 * Vodováha na Kachlíkovu hlavu jako kvádr: dřevo, na čele a zádech
 * trubička se zelenou kapalinou a bublinou uprostřed (kresba 180:
 * 60 × 8,6 jednotek).
 */
export function vodovahaSteny(obrys) {
  const drevo = (w, h) => `<rect width="${w}" height="${h}" fill="${obrys ? "#FFFFFF" : "#C9A06A"}"/>` +
    (obrys ? "" : `<path d="M0.6 ${f(h * 0.28)} H${f(w - 0.6)}" stroke="#F0D4A4" stroke-width="0.4" opacity="0.7"/>`);
  const trubicka = (w, h) => {
    const tw = w * 0.32, th = h * 0.5, tx = (w - tw) / 2, ty = (h - th) / 2;
    return drevo(w, h) +
      `<rect x="${f(tx)}" y="${f(ty)}" width="${f(tw)}" height="${f(th)}" rx="${f(th / 2)}" fill="${obrys ? "#FFFFFF" : "#2E3A2C"}" ${obrys ? `stroke="${INKOUST}" stroke-width="0.3"` : ""}/>` +
      (obrys ? "" : `<rect x="${f(tx + 0.3)}" y="${f(ty + 0.3)}" width="${f(tw - 0.6)}" height="${f(th - 0.6)}" rx="${f(th / 2 - 0.3)}" fill="#BCE07A"/>`) +
      `<path d="M${f(w / 2 - tw * 0.19)} ${f(ty)} V${f(ty + th)} M${f(w / 2 + tw * 0.19)} ${f(ty)} V${f(ty + th)}" stroke="${obrys ? INKOUST : "#2E3A2C"}" stroke-width="0.25"/>` +
      `<ellipse cx="${f(w / 2)}" cy="${f(h / 2)}" rx="${f(tw * 0.16)}" ry="${f(th * 0.3)}" fill="${obrys ? "#FFFFFF" : "#F6FFE6"}" ${obrys ? `stroke="${INKOUST}" stroke-width="0.25"` : ""}/>` +
      [0.11, 0.89].map((x) => `<circle cx="${f(w * x)}" cy="${f(h / 2)}" r="0.5" fill="${obrys ? INKOUST : "#7A5A3C"}" opacity="0.7"/>`).join("");
  };
  return { celo: trubicka, zada: trubicka, vrch: drevo, levy: drevo, pravy: drevo, dno: drevo };
}

/** Celý Kachlík z kresby 180 — do omalovánky */
export function kachlikPostava(r) {
  const getaKus = (x) =>
    `<path d="M${x + 2.4} 147.8 H${x + 6} V154.8 H${x + 2.4} Z M${x + 12} 147.8 H${x + 15.6} V154.8 H${x + 12} Z" ${r.v("#8C6444")}/>` +
    `<rect x="${x}" y="141.4" width="18" height="6.4" rx="1.4" ${r.v("#C99A68")}/>`;
  return getaKus(63) + getaKus(99) +
    `<ellipse cx="72" cy="137" rx="11" ry="5" ${r.v("#B84A2B")}/><ellipse cx="108" cy="137" rx="11" ry="5" ${r.v("#B84A2B")}/>` +
    `<path d="M65 141.4 Q72 132 79 141.4 M101 141.4 Q108 132 115 141.4" stroke="${INKOUST}" stroke-width="2.1" stroke-linecap="round" fill="none"/>` +
    `<rect x="44" y="40" width="92" height="94" rx="7" ${r.v("#C87E4E", 0.5)}/>` +
    `<rect x="53" y="49" width="74" height="76" rx="4" fill="none" ${r.c("#B84A2B", 1.2)}/>` +
    hanko(r) +
    `<rect x="60" y="31.4" width="60" height="8.6" rx="1.7" ${r.v("#C9A06A")}/>` +
    `<rect x="80.4" y="33.2" width="19.2" height="5" rx="2.5" ${r.v("#BCE07A")}/><ellipse cx="90" cy="35.7" rx="3.1" ry="1.6" ${r.v("#F6FFE6")}/>` +
    kachlikTvar(r);
}

/* ——— Kapka ——— */

const TELO = "M90 38 Q60 85 56 108 Q52 132 72 146 Q82 152 90 152 Q98 152 108 146 Q128 132 124 108 Q120 85 90 38 Z";
const MAGATAMA = "M0 -4.2 C3.2 -4.2 4.8 -1.6 4.4 1.4 C4 4.6 0.8 6.8 -1.8 7.8 C-0.4 5.8 -0.8 4.6 -2.3 3.7 C-4.6 2.5 -4.8 -0.8 -3.1 -2.7 C-2.3 -3.7 -1.2 -4.2 0 -4.2 Z";
const RUCE = ([[57.5, 106, -142], [122.5, 106, -38]]).map(([x, y, uhel]) => {
  const a = (uhel * Math.PI) / 180;
  const na = (d) => [f(x + Math.cos(a) * d), f(y + Math.sin(a) * d)];
  return { dlan: na(5.5), od: na(5), omotavka: [na(11.4), na(15)], spicka: na(31), uhel };
});

/** Tyčka jako plný tvar (ne čára), ať ji silueta obtáhne stejně jako tělo */
const tyc = ([ax, ay], [bx, by], p) => {
  const d = Math.hypot(bx - ax, by - ay), nx = (-(by - ay) / d) * p, ny = ((bx - ax) / d) * p;
  return `<path d="M${f(ax + nx)} ${f(ay + ny)} L${f(bx + nx)} ${f(by + ny)} L${f(bx - nx)} ${f(by - ny)} L${f(ax - nx)} ${f(ay - ny)} Z"/>`;
};

/** Kapka: od špičky (38 − 12 = 26) po spodek get (159,2), osa 90 */
export const KAPKA = { temeno: 26, zem: 159.2, stred: 90, noha: 38 };

/** Tvary siluety Kapky — z nich stojánek obtáhne řeznou linku */
export const kapkaObrysy =
  `<g transform="translate(0 -12)"><path d="${TELO}"/><path d="${TELO}" transform="translate(5 -4)"/></g>` +
  `<rect x="71" y="146" width="38" height="13.2" rx="1.4"/>` +
  RUCE.map((r) => `${tyc(r.od, r.spicka, 1.8)}<ellipse cx="${r.dlan[0]}" cy="${r.dlan[1]}" rx="7" ry="5" transform="rotate(${r.uhel} ${r.dlan[0]} ${r.dlan[1]})"/>`).join("");

const kapkaDefs = (id) =>
  `<defs><linearGradient id="${id}-voda" gradientUnits="userSpaceOnUse" x1="62" y1="52" x2="120" y2="150"><stop offset="0" stop-color="#9DCBE8"/><stop offset="0.46" stop-color="#7FB4D8"/><stop offset="1" stop-color="#6CA5CE"/></linearGradient>` +
  `<linearGradient id="${id}-soumrak" gradientUnits="userSpaceOnUse" x1="60" y1="150" x2="124" y2="36"><stop offset="0" stop-color="#C4432B"/><stop offset="0.28" stop-color="#C0708A"/><stop offset="0.55" stop-color="#7A5E8E"/><stop offset="0.8" stop-color="#4E4A84"/><stop offset="1" stop-color="#2A2C5E"/></linearGradient></defs>`;

const kapkaGeta = (r, zezadu) =>
  [71, 91].map((x) =>
    `<path d="M${x + 2.4} 152.2 H${x + 6} V159.2 H${x + 2.4} Z M${x + 12} 152.2 H${x + 15.6} V159.2 H${x + 12} Z" ${r.v("#8C6444", 0.3)}/>` +
    `<rect x="${x}" y="146" width="18" height="6.4" rx="1.4" ${r.v("#C99A68", 0.3)}/>` +
    (zezadu ? "" : r.jenB(`<path d="M${x + 1.4} 147.8 H${x + 16.6}" stroke="#E2BE8C" stroke-width="0.9" stroke-linecap="round"/>`)),
  ).join("");

const kapkaPalicky = (r) =>
  RUCE.map((p) =>
    `<path d="M${p.od.join(" ")} L${p.spicka.join(" ")}" stroke="${r.obrys ? INKOUST : "#6B5D4F"}" stroke-width="3.6" stroke-linecap="round"/>` +
    `<path d="M${p.od.join(" ")} L${p.spicka.join(" ")}" stroke="${r.obrys ? "#FFFFFF" : "#E2BE8C"}" stroke-width="2.3" stroke-linecap="round"/>` +
    `<path d="M${p.omotavka[0].join(" ")} L${p.omotavka[1].join(" ")}" ${r.obrys ? `stroke="${INKOUST}" stroke-width="0.6" fill="none"` : `stroke="#C4432B" stroke-width="3"`}/>`,
  ).join("");

const kapkaDlane = (r) =>
  RUCE.map((p) => `<ellipse cx="${p.dlan[0]}" cy="${p.dlan[1]}" rx="7" ry="5" transform="rotate(${p.uhel} ${p.dlan[0]} ${p.dlan[1]})" ${r.v("#7FB4D8")}/>`).join("");

/** Kapka zepředu (kresba 180) */
export function kapkaLic(r) {
  const telo = r.obrys
    ? `<path d="${TELO}" fill="#FFFFFF" stroke="${INKOUST}" stroke-width="1" transform="translate(5 -4)"/><path d="${TELO}" fill="#FFFFFF" stroke="${INKOUST}" stroke-width="1"/>`
    : `<path d="${TELO}" fill="url(#${r.id}-soumrak)" transform="translate(5 -4)"/><path d="${TELO}" fill="url(#${r.id}-voda)"/>` +
      `<ellipse cx="76" cy="100" rx="8" ry="14" fill="#E4F3FB" opacity="0.55" transform="rotate(-15 76 100)"/>` +
      `<path d="M119 113 Q120.4 129 105 142" stroke="#C4E4F5" stroke-width="2.4" stroke-linecap="round" opacity="0.36" fill="none"/>`;
  const chodidla = [80, 100].map((x) =>
    `<ellipse cx="${x}" cy="154" rx="8" ry="4" ${r.v("#5A91BC", 0.3)}/>` +
    `<path d="M${x - 6.4} 158 Q${x} 150.6 ${x + 6.4} 158" stroke="${r.obrys ? INKOUST : "#C4432B"}" stroke-width="1.9" stroke-linecap="round" fill="none"/>`).join("");
  const tvar =
    r.jenB(`<g fill="#E89AA4" opacity="0.6"><ellipse cx="72" cy="116" rx="6" ry="4"/><ellipse cx="108" cy="116" rx="6" ry="4"/></g>`) +
    [79.4, 100.6].map((x, i) => `<g transform="translate(${x} 106.4) scale(${i ? 0.95 : -0.95} 0.95)"><path d="${MAGATAMA}" fill="${r.obrys ? INKOUST : "#2C557A"}"/><circle cx="-0.8" cy="-1.4" r="1.2" fill="#F2FAFF"/></g>`).join("") +
    `<path d="M83 120 Q86.5 124.6 90 121.6 Q93.5 124.6 97 120" stroke="${r.obrys ? INKOUST : "#2C557A"}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
  return r.jenB(kapkaDefs(r.id)) + kapkaGeta(r, false) + kapkaPalicky(r) +
    `<g transform="translate(0 -12)">${telo}${chodidla}${tvar}</g>` + kapkaDlane(r);
}

/** Kapka zezadu: bez tváře, druhý tisk na opačné straně, paty nad getami */
export function kapkaRub(r) {
  const telo = r.obrys
    ? `<path d="${TELO}" fill="#FFFFFF" stroke="${INKOUST}" stroke-width="1" transform="translate(-5 -4)"/><path d="${TELO}" fill="#FFFFFF" stroke="${INKOUST}" stroke-width="1"/>`
    : `<path d="${TELO}" fill="url(#${r.id}-soumrak)" transform="translate(-5 -4)"/><path d="${TELO}" fill="url(#${r.id}-voda)"/>` +
      `<ellipse cx="104" cy="100" rx="8" ry="14" fill="#E4F3FB" opacity="0.4" transform="rotate(15 104 100)"/>` +
      `<path d="M61 113 Q59.6 129 75 142" stroke="#C4E4F5" stroke-width="2.4" stroke-linecap="round" opacity="0.36" fill="none"/>`;
  const paty = [80, 100].map((x) => `<ellipse cx="${x}" cy="154" rx="7" ry="3.6" ${r.v("#5A91BC", 0.3)}/>`).join("");
  return r.jenB(kapkaDefs(r.id)) + kapkaGeta(r, true) + kapkaPalicky(r) +
    `<g transform="translate(0 -12)">${telo}${paty}</g>` + kapkaDlane(r);
}

/* ——— Omalovánka: dílna ——— */

/**
 * Dílna k vybarvení (v mm, rám w × h). Na zdi okno s ořechem, prázdný
 * obraz na hřebíku (tam se dítě nakreslí samo) a police s nádobím, pod
 * kterou stojí Kachlík a vodováhou na hlavě měří, jestli visí rovně.
 * Uprostřed hrnčířský kruh s rozdělanou nádobou a vedle Kapka, která na
 * hlínu kape vodu. Kolem je místo, kam se dá dokreslit zbytek party.
 */
export function dilna(w, h) {
  const L = (sila = 0.5) => `stroke="${INKOUST}" stroke-width="${sila}" fill="#FFFFFF" stroke-linejoin="round" stroke-linecap="round"`;
  const C = (sila = 0.35) => `stroke="${INKOUST}" stroke-width="${sila}" fill="none" stroke-linejoin="round" stroke-linecap="round"`;
  const zem = h * 0.8;
  let s = `<defs><clipPath id="om-ram"><rect width="${w}" height="${h}" rx="4"/></clipPath><clipPath id="om-okno"><rect x="12" y="16" width="50" height="62" rx="1.5"/></clipPath></defs>`;
  s += `<g clip-path="url(#om-ram)">`;
  s += `<rect width="${w}" height="${h}" fill="#FFFFFF"/>`;
  /* podlaha z prken, spáry se sbíhají k zadní stěně */
  s += `<path d="M0 ${f(zem)} H${w}" ${C(0.5)}/>`;
  for (let i = -4; i <= 4; i++) s += `<path d="M${f(w / 2 + i * 16)} ${f(zem)} L${f(w / 2 + i * 34)} ${h}" ${C(0.3)}/>`;
  s += `<path d="M0 ${f(zem + 16)} H${w}" ${C(0.25)} opacity="0.7"/>`;
  /* lišta u podlahy */
  s += `<path d="M0 ${f(zem - 3)} H${w}" ${C(0.3)}/>`;

  /* okno: rám, kříž a venku ořech s ořechy */
  s += `<g clip-path="url(#om-okno)">`;
  s += `<path d="M10 66 Q30 58 64 64 V80 H10 Z" ${L(0.35)}/>`;
  s += `<path d="M40 80 C40 66 38 58 41 46 M41 56 Q48 50 52 44 M40 60 Q32 54 27 50" ${C(0.9)}/>`;
  /* koruna jako jeden obrys: kruhy obtažené tmavě a přes ně tytéž bílé */
  const koruna = [[28, 38, 11], [42, 30, 13], [56, 38, 11], [35, 46, 9], [50, 47, 9]];
  s += koruna.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r + 0.25}" fill="${INKOUST}"/>`).join("");
  s += koruna.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r - 0.25}" fill="#FFFFFF"/>`).join("");
  s += `<path d="M24 36 q3 -3 6 0 M38 27 q3 -3 6 0 M50 34 q3 -3 6 0 M31 45 q3 -3 6 0 M45 44 q3 -3 6 0" ${C(0.3)}/>`;
  for (const [x, y] of [[33, 40], [47, 36], [55, 44]]) s += `<circle cx="${x}" cy="${y}" r="1.6" ${L(0.35)}/>`;
  s += `</g>`;
  s += `<rect x="12" y="16" width="50" height="62" rx="1.5" fill="none" stroke="${INKOUST}" stroke-width="0.6"/>`;
  s += `<path d="M37 16 V78 M12 47 H62" ${C(0.5)}/>`;
  s += `<rect x="9" y="78" width="56" height="3" rx="1" ${L(0.45)}/>`;

  /* obraz na hřebíku — prázdný, „tady jsi ty“ */
  s += `<circle cx="94" cy="14" r="0.9" fill="${INKOUST}"/><path d="M80 26 L94 14 L108 26" ${C(0.35)}/>`;
  s += `<rect x="76" y="26" width="36" height="44" rx="1" ${L(0.6)}/><rect x="79" y="29" width="30" height="38" ${C(0.35)}/>`;

  /* police s nádobím; Kachlík pod ní měří vodováhou */
  const py = 104, px = 124, pw = 60;
  s += `<rect x="${px}" y="${py}" width="${pw}" height="3" rx="0.6" ${L(0.5)}/>`;
  s += `<path d="M${px + 5} ${py + 3} l4 8 h-6 M${px + pw - 5} ${py + 3} l-4 8 h6" ${C(0.4)}/>`;
  const nadoby = [
    (x) => `<path d="M${x - 7} ${py} Q${x - 10} ${py - 10} ${x - 5} ${py - 14} H${x + 5} Q${x + 10} ${py - 10} ${x + 7} ${py} Z" ${L()}/><path d="M${x - 4} ${py - 14} V${py - 17} H${x + 4} V${py - 14}" ${L()}/><path d="M${x - 8} ${py - 7} H${x + 8}" ${C(0.3)}/>`,
    (x) => `<path d="M${x - 10} ${py - 8} Q${x} ${py + 1} ${x + 10} ${py - 8} Z" ${L()}/><ellipse cx="${x}" cy="${py - 8}" rx="10" ry="1.8" ${L(0.4)}/>`,
    (x) => `<path d="M${x - 5} ${py} V${py - 18} H${x + 5} V${py} Z" ${L()}/><path d="M${x + 5} ${py - 14} q4.5 0.5 4.5 4 q0 3.5 -4.5 4" ${C(0.5)}/><path d="M${x - 5} ${py - 12} H${x + 5}" ${C(0.3)}/>`,
  ];
  nadoby.forEach((n, i) => (s += n(f(px + pw * (0.2 + i * 0.3)))));
  const kachK = 0.54;
  s += `<ellipse cx="${f(w * 0.8)}" cy="${f(zem + 1)}" rx="20" ry="2.6" ${C(0.3)}/>`;
  s += `<g transform="translate(${f(w * 0.8 - 90 * kachK)} ${f(zem + 1 - 155 * kachK)}) scale(${kachK})">${kachlikPostava(R(true, kachK, "omc"))}</g>`;
  /* čárky „měřím“ mezi vodováhou a policí */
  s += `<path d="M${f(w * 0.8 - 6)} ${f(py + 7)} v3 M${f(w * 0.8)} ${f(py + 6)} v4 M${f(w * 0.8 + 6)} ${f(py + 7)} v3" ${C(0.35)}/>`;

  /* hrnčířský kruh: stolek, talíř a rozdělaná nádoba */
  const kx = w * 0.5, ky = zem - 32;
  s += `<path d="M${f(kx - 22)} ${f(zem)} V${f(ky + 4)} H${f(kx + 22)} V${f(zem)}" ${L()}/>`;
  s += `<rect x="${f(kx - 25)}" y="${f(ky)}" width="50" height="5" rx="1" ${L()}/>`;
  s += `<path d="M${f(kx - 18)} ${f(zem)} V${f(zem - 18)} H${f(kx + 18)} V${f(zem)}" ${C(0.35)}/>`;
  s += `<ellipse cx="${f(kx)}" cy="${f(ky)}" rx="20" ry="4.4" ${L()}/>`;
  s += `<path d="M${f(kx - 11)} ${f(ky)} C${f(kx - 13)} ${f(ky - 10)} ${f(kx - 7)} ${f(ky - 12)} ${f(kx - 8)} ${f(ky - 20)} H${f(kx + 8)} C${f(kx + 7)} ${f(ky - 12)} ${f(kx + 13)} ${f(ky - 10)} ${f(kx + 11)} ${f(ky)} Z" ${L()}/>`;
  s += `<ellipse cx="${f(kx)}" cy="${f(ky - 20)}" rx="8" ry="1.8" ${L(0.45)}/>`;
  for (const y of [-4, -8, -12]) s += `<path d="M${f(kx - 11.6 - y * 0.05)} ${f(ky + y)} Q${f(kx)} ${f(ky + y + 1.6)} ${f(kx + 11.6 + y * 0.05)} ${f(ky + y)}" ${C(0.25)}/>`;

  /* Kapka vlevo od kruhu a kapky vody z její dlaně na hlínu */
  const kapK = 0.5;
  const kapX = w * 0.19;
  s += `<ellipse cx="${f(kapX)}" cy="${f(zem + 1)}" rx="15" ry="2.4" ${C(0.3)}/>`;
  s += `<g transform="translate(${f(kapX - 90 * kapK)} ${f(zem + 1 - 159.2 * kapK)}) scale(${kapK})">${kapkaLic(R(true, kapK, "omk"))}</g>`;
  /* oblouček teček od Kapčiny dlaně k hlíně */
  const dlan = [kapX + (122.5 - 90 + 4) * kapK, zem + 1 - (159.2 - 103) * kapK];
  s += `<path d="M${f(dlan[0] + 2)} ${f(dlan[1] - 3)} Q${f((dlan[0] + kx) / 2)} ${f(ky - 44)} ${f(kx - 4)} ${f(ky - 24)}" ${C(0.4)} stroke-dasharray="0.2 2.2"/>`;
  for (const [x, y, v] of [[kx - 10, ky - 32, 1], [kx - 6, ky - 26, 0.8]]) s += `<path d="M${f(x)} ${f(y)} q${f(-2.2 * v)} ${f(3.4 * v)} 0 ${f(4.6 * v)} q${f(2.2 * v)} ${f(-1.2 * v)} 0 ${f(-4.6 * v)} Z" ${L(0.4)}/>`;
  s += `</g>`;
  s += `<rect width="${w}" height="${h}" rx="4" fill="none" stroke="${INKOUST}" stroke-width="0.7"/>`;
  return s;
}
