/**
 * Kresby pro /parta: chrám nad oblaky. Generátory vracejí SVG jako text
 * (stránka je vkládá přes set:html), stejně jako kresby Domku 2 — jde je tak
 * zavolat i mimo stránku a prohlédnout si výsledek.
 *
 *   chram()   ostrov s chrámem: schody z oblak, torii, hlavní síň na terase,
 *             vlevo pagoda, vpravo jeviště kagura-den a rozkvetlá sakura
 *   dalky()   pozadí: vrcholky hor, které koukají z oblačného moře
 *   more()    pás oblačného moře — leží před ostrovem a dělí sekce stránky
 *
 * Je soumrak: slunce stojí nízko vpravo, takže pravé hrany chytají teplé
 * světlo a levé jsou ve fialovém stínu. Oblaka a hory si berou barvy
 * z proměnných oblohy (styles/parta2.css), ať jdou s denní dobou stránky.
 *
 * Střechy, brána i schody se staví zrcadlově z jednoho zadání — co je
 * vlevo, je i vpravo.
 */
import { chomac, nahoda } from "../parta2/tvary";

const f = (n: number) => Math.round(n * 10) / 10;

export const B = {
  strecha: "#2D3256",
  strechaSvetlo: "#8E86BE",
  strechaStin: "#1E2140",
  drevo: "#3B2B38",
  rumelka: "#C4432B",
  rumelkaStin: "#8E2E24",
  rumelkaSvetlo: "#E26A45",
  omitka: "#EBD9C6",
  omitkaStin: "#C9B3B6",
  zlato: "#F3D27A",
  kamen: "#8E86A8",
  kamenStin: "#5F5A85",
  kamenSvetlo: "#B9B0CC",
  skala: "#4B446F",
  skalaStin: "#2A2950",
  borovice: "#2D4B4E",
  boroviceSvetlo: "#4B7A6C",
  zare: "#FFD98A",
};

/**
 * Japonská střecha zepředu: rovný hřeben, prohnuté boky a okap, který se
 * ke koncům zvedá. cx je osa, y výška hřebene, hr a ok šířky hřebene a okapu,
 * v výška, zdvih o kolik se špičky okapu zvednou. `zare` říká, odkud na okap
 * svítí teplé světlo: při soumraku zprava, pod lampiony z obou stran.
 */
export function strecha(
  cx: number, y: number, hr: number, ok: number, v: number, zdvih: number,
  { tasky = 9, lem = true, barva = B.strecha, stin = B.strechaStin, svetlo = B.strechaSvetlo, zare = "vpravo" as "vpravo" | "obe" } = {},
) {
  const L = cx - ok / 2, R = cx + ok / 2, a = cx - hr / 2, b = cx + hr / 2;
  const dole = y + v;
  const bok = (ok - hr) / 2;
  const telo =
    `M${f(a)} ${f(y)} L${f(b)} ${f(y)} ` +
    `C${f(b + bok * 0.3)} ${f(y + v * 0.62)} ${f(R - bok * 0.34)} ${f(dole - zdvih * 0.2)} ${f(R)} ${f(dole - zdvih)} ` +
    `Q${f(cx)} ${f(dole + zdvih * 0.55)} ${f(L)} ${f(dole - zdvih)} ` +
    `C${f(L + bok * 0.34)} ${f(dole - zdvih * 0.2)} ${f(a - bok * 0.3)} ${f(y + v * 0.62)} ${f(a)} ${f(y)} Z`;
  let s = `<path d="${telo}" fill="${barva}"/>`;
  /* řady tašek: od hřebene k okapu, ke krajům čím dál víc prohnuté */
  let rady = "";
  for (let i = 1; i < tasky; i++) {
    const k = i / tasky;
    const nahore = a + (b - a) * k;
    const doleX = L + (R - L) * (0.04 + 0.92 * k);
    const o = (k - 0.5) * 2;
    rady += `M${f(nahore)} ${f(y + 2)} Q${f(nahore + (doleX - nahore) * 0.3)} ${f(y + v * 0.66)} ${f(doleX)} ${f(dole - zdvih * Math.abs(o) * 0.9 + zdvih * 0.2)} `;
  }
  s += `<path d="${rady}" fill="none" stroke="${stin}" stroke-width="1.6" opacity="0.55"/>`;
  /* okap: tmavý spodek a světlá hrana, na kterou padá poslední světlo */
  if (lem) {
    s += `<path d="M${f(L)} ${f(dole - zdvih)} Q${f(cx)} ${f(dole + zdvih * 0.55)} ${f(R)} ${f(dole - zdvih)}" fill="none" stroke="${stin}" stroke-width="7" stroke-linecap="round"/>`;
    s += `<path d="M${f(L)} ${f(dole - zdvih - 2)} Q${f(cx)} ${f(dole + zdvih * 0.55 - 2)} ${f(R)} ${f(dole - zdvih - 2)}" fill="none" stroke="${svetlo}" stroke-width="1.8" stroke-linecap="round" opacity="0.8"/>`;
    for (const k of zare === "obe" ? [-1, 1] : [1])
      s += `<path d="M${f(cx + k * ok * 0.12)} ${f(dole + zdvih * 0.42 - 2)} Q${f(cx + k * ok * 0.36)} ${f(dole + zdvih * 0.2 - 2)} ${f(cx + (k * ok) / 2)} ${f(dole - zdvih - 2)}" fill="none" stroke="#FFC08A" stroke-width="2" stroke-linecap="round" opacity="0.75"/>`;
  }
  /* hřeben */
  s += `<rect x="${f(a - 6)}" y="${f(y - 7)}" width="${f(hr + 12)}" height="9" rx="3" fill="${stin}"/>`;
  s += `<rect x="${f(a - 6)}" y="${f(y - 7)}" width="${f(hr + 12)}" height="2.4" rx="1.2" fill="${svetlo}" opacity="0.7"/>`;
  return s;
}

/** Zkřížené štítové trámy chigi a válečky katsuogi na hřebeni svatyně. */
function hreben(cx: number, y: number, sirka: number, valecku: number) {
  let s = "";
  for (const k of [-1, 1]) {
    const x = cx + (k * sirka) / 2;
    s += `<path d="M${f(x - 14)} ${f(y + 4)} L${f(x + 12)} ${f(y - 38)} M${f(x + 14)} ${f(y + 4)} L${f(x - 12)} ${f(y - 38)}" stroke="${B.zlato}" stroke-width="4.4" stroke-linecap="round"/>`;
    s += `<path d="M${f(x - 14)} ${f(y + 4)} L${f(x + 12)} ${f(y - 38)} M${f(x + 14)} ${f(y + 4)} L${f(x - 12)} ${f(y - 38)}" stroke="#B9862E" stroke-width="1.2" stroke-linecap="round" opacity="0.7"/>`;
  }
  for (let i = 0; i < valecku; i++) {
    const x = cx - sirka / 2 + ((i + 1) * sirka) / (valecku + 1);
    s += `<rect x="${f(x - 7)}" y="${f(y - 15)}" width="14" height="9" rx="4.5" fill="${B.drevo}"/><circle cx="${f(x)}" cy="${f(y - 10.5)}" r="2.2" fill="${B.zlato}"/>`;
  }
  return s;
}

/** Kamenná lucerna tōrō: podstavec, sloupek, komůrka se světlem, stříška. */
function toro(x: number, y: number, m = 1) {
  return (
    `<g transform="translate(${f(x)} ${f(y)}) scale(${m})">` +
    `<circle cx="0" cy="-44" r="34" fill="url(#ch-zare)"/>` +
    `<path d="M-13 0 H13 L10 -8 H-10 Z" fill="${B.kamenStin}"/>` +
    `<rect x="-4.5" y="-30" width="9" height="22" fill="${B.kamen}"/>` +
    `<rect x="-11" y="-36" width="22" height="6" rx="1.5" fill="${B.kamenSvetlo}"/>` +
    `<rect x="-8.5" y="-52" width="17" height="16" fill="${B.kamenStin}"/>` +
    `<rect x="-5.5" y="-49" width="11" height="10" rx="1" fill="#FFE9A8"/>` +
    `<path d="M0 -49 V-39 M-5.5 -44 H5.5" stroke="${B.kamenStin}" stroke-width="1"/>` +
    `<path d="M-16 -52 Q0 -58 16 -52 L8 -62 Q0 -66 -8 -62 Z" fill="${B.kamen}"/>` +
    `<circle cx="0" cy="-67" r="3.2" fill="${B.kamenSvetlo}"/>` +
    `</g>`
  );
}

/** Šňůra papírových lampionků prověšená mezi dvěma body. */
function snura(x1: number, y1: number, x2: number, y2: number, pruvis: number, pocet: number, i0 = 0) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 + pruvis;
  let s = `<path d="M${f(x1)} ${f(y1)} Q${f(mx)} ${f(my)} ${f(x2)} ${f(y2)}" fill="none" stroke="${B.drevo}" stroke-width="1.2" opacity="0.8"/>`;
  for (let i = 1; i <= pocet; i++) {
    const t = i / (pocet + 1);
    const x = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * mx + t * t * x2;
    const y = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * my + t * t * y2;
    const b = (i + i0) % 3 === 0 ? "#FFF1C4" : (i + i0) % 3 === 1 ? "#FFC978" : "#F6A07E";
    s +=
      `<g class="ch-lampionek" style="--z:${(((i + i0) * 0.37) % 1).toFixed(2)}">` +
      `<circle cx="${f(x)}" cy="${f(y + 9)}" r="13" fill="url(#ch-zare)" opacity="0.9"/>` +
      `<path d="M${f(x)} ${f(y)} V${f(y + 3)}" stroke="${B.drevo}" stroke-width="1"/>` +
      `<ellipse cx="${f(x)}" cy="${f(y + 9)}" rx="5" ry="6.4" fill="${b}"/>` +
      `<rect x="${f(x - 3)}" y="${f(y + 2.2)}" width="6" height="1.8" rx="0.6" fill="${B.drevo}"/><rect x="${f(x - 3)}" y="${f(y + 14.2)}" width="6" height="1.8" rx="0.6" fill="${B.drevo}"/>` +
      `</g>`;
  }
  return s;
}

/** Borovice: kmen a pár plochých polštářů jehličí. polstare = [dx, dy, rx, ry] od paty kmene. */
function borovice(x: number, y: number, kmen: string, polstare: [number, number, number, number][], seed: number) {
  let s = `<path d="${kmen}" transform="translate(${f(x)} ${f(y)})" fill="none" stroke="${B.drevo}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`;
  s += `<path d="${kmen}" transform="translate(${f(x)} ${f(y)})" fill="none" stroke="#6B4A4E" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" opacity="0.7"/>`;
  polstare.forEach(([dx, dy, rx, ry], i) => {
    s += `<path d="${chomac(x + dx, y + dy, rx, ry, 11, seed + i, 0.4, 0.66)}" fill="${B.borovice}"/>`;
    s += `<path d="${chomac(x + dx - rx * 0.12, y + dy - ry * 0.34, rx * 0.7, ry * 0.5, 9, seed + 20 + i, 0.6, 0.66)}" fill="${B.boroviceSvetlo}" opacity="0.85"/>`;
  });
  return s;
}

/** Schodiště, které se nahoru zužuje: od (cx, y1) šířky s1 dolů k (cx, y2) šířky s2. */
function schody(cx: number, y1: number, s1: number, y2: number, s2: number, stupnu: number) {
  let s = `<path d="M${f(cx - s1 / 2)} ${y1} L${f(cx + s1 / 2)} ${y1} L${f(cx + s2 / 2)} ${y2} L${f(cx - s2 / 2)} ${y2} Z" fill="url(#ch-schody)"/>`;
  let cary = "";
  for (let i = 1; i < stupnu; i++) {
    /* dole jsou stupně vyšší — jsou blíž */
    const k = Math.pow(i / stupnu, 1.25);
    const y = y1 + (y2 - y1) * k;
    const w = s1 + (s2 - s1) * k;
    cary += `M${f(cx - w / 2)} ${f(y)} H${f(cx + w / 2)} `;
  }
  s += `<path d="${cary}" stroke="${B.kamenStin}" stroke-width="1.5" opacity="0.6"/>`;
  /* zábradlí po obou stranách */
  for (const k of [-1, 1]) {
    s += `<path d="M${f(cx + (k * s1) / 2)} ${y1} L${f(cx + (k * s2) / 2)} ${y2}" stroke="${k < 0 ? B.rumelkaStin : B.rumelka}" stroke-width="5" stroke-linecap="round"/>`;
    s += `<path d="M${f(cx + (k * s1) / 2)} ${y1 - 12} L${f(cx + (k * s2) / 2)} ${y2 - 22}" stroke="${k < 0 ? B.rumelkaStin : B.rumelkaSvetlo}" stroke-width="3.4" stroke-linecap="round"/>`;
  }
  return s;
}

const DEFS =
  `<radialGradient id="ch-zare" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${B.zare}" stop-opacity="0.75"/><stop offset="0.45" stop-color="#FFB86B" stop-opacity="0.28"/><stop offset="1" stop-color="#FFB86B" stop-opacity="0"/></radialGradient>` +
  `<linearGradient id="ch-shoji" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF0BE"/><stop offset="1" stop-color="#FFC56B"/></linearGradient>` +
  `<linearGradient id="ch-schody" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${B.kamenStin}"/><stop offset="0.45" stop-color="${B.kamen}"/><stop offset="1" stop-color="${B.kamenSvetlo}"/></linearGradient>` +
  `<linearGradient id="ch-skala" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${B.skala}"/><stop offset="0.6" stop-color="${B.skalaStin}"/><stop offset="1" stop-color="${B.skalaStin}" stop-opacity="0"/></linearGradient>` +
  `<linearGradient id="ch-zed" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6A6490"/><stop offset="0.55" stop-color="#8E86A8"/><stop offset="1" stop-color="#C2B4C4"/></linearGradient>` +
  `<linearGradient id="ch-omitka" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${B.omitkaStin}"/><stop offset="1" stop-color="${B.omitka}"/></linearGradient>` +
  `<linearGradient id="ch-plato" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7A7399"/><stop offset="1" stop-color="#C9B6BE"/></linearGradient>` +
  `<radialGradient id="ch-sakura" cx="0.6" cy="0.3" r="0.8"><stop offset="0" stop-color="#FBDDE2"/><stop offset="0.55" stop-color="#F2B5C4"/><stop offset="1" stop-color="#D98AA6"/></radialGradient>`;

/** Pagoda: tři patra, každé užší, nahoře věžička s kroužky. */
function pagoda(cx: number, zem: number) {
  const patra = [
    { y: zem - 118, ok: 214, hr: 112, telo: 108, v: 46 },
    { y: zem - 226, ok: 178, hr: 92, telo: 88, v: 42 },
    { y: zem - 326, ok: 146, hr: 60, telo: 68, v: 44 },
  ];
  let s = "";
  /* odspodu nahoru: tělo patra a nad ním střecha */
  patra.forEach((p, i) => {
    const spodek = i === 0 ? zem : patra[i - 1].y - 2;
    const vrch = p.y + p.v - 10;
    s += `<rect x="${f(cx - p.telo / 2)}" y="${f(vrch)}" width="${p.telo}" height="${f(spodek - vrch)}" fill="${B.rumelkaStin}"/>`;
    s += `<rect x="${f(cx)}" y="${f(vrch)}" width="${p.telo / 2}" height="${f(spodek - vrch)}" fill="${B.rumelka}" opacity="0.85"/>`;
    const okno = Math.min(26, spodek - vrch - 26);
    for (const k of [-1, 0, 1]) s += `<rect x="${f(cx + k * p.telo * 0.3 - 7)}" y="${f(spodek - okno - 10)}" width="14" height="${f(okno)}" rx="1" fill="url(#ch-shoji)" opacity="${i === 1 ? 0.95 : 0.7}"/>`;
    s += `<rect x="${f(cx - p.telo / 2 - 8)}" y="${f(spodek - 8)}" width="${p.telo + 16}" height="5" fill="${B.drevo}"/>`;
  });
  patra.forEach((p) => {
    s += strecha(cx, p.y, p.hr, p.ok, p.v, 13, { tasky: 7 });
  });
  const vrch = patra[2].y;
  s += `<path d="M${cx} ${vrch - 6} V${vrch - 92}" stroke="${B.zlato}" stroke-width="3.4" stroke-linecap="round"/>`;
  for (let i = 0; i < 5; i++) s += `<ellipse cx="${cx}" cy="${vrch - 22 - i * 12}" rx="${f(11 - i * 1.6)}" ry="2.6" fill="none" stroke="${B.zlato}" stroke-width="2"/>`;
  s += `<circle cx="${cx}" cy="${vrch - 94}" r="4.4" fill="${B.zlato}"/>`;
  return s;
}

/** Hlavní síň na terase: dvě střechy nad sebou, rudé sloupy, prosvícené šódži a uprostřed vchod se shimenawou. */
function sin(cx: number, zem: number) {
  const stena = zem - 112;
  let s = "";
  /* kamenný sokl */
  s += `<path d="M${cx - 214} ${zem} L${cx - 204} ${zem - 26} H${cx + 204} L${cx + 214} ${zem} Z" fill="url(#ch-zed)"/>`;
  s += `<path d="M${cx - 204} ${zem - 26} H${cx + 204}" stroke="${B.kamenSvetlo}" stroke-width="2" opacity="0.8"/>`;
  /* stěna a pole mezi sloupy */
  s += `<rect x="${cx - 176}" y="${stena}" width="352" height="${zem - 26 - stena}" fill="url(#ch-omitka)"/>`;
  const sloupy = [-176, -118, -60, 60, 118, 176];
  for (let i = 0; i < sloupy.length - 1; i++) {
    const a = cx + sloupy[i] + 7, b = cx + sloupy[i + 1] - 7;
    if (i === 2) {
      /* vchod: teplá tma, v ní oltář se zrcadlem */
      s += `<rect x="${a}" y="${stena + 8}" width="${b - a}" height="${zem - 34 - stena}" fill="#5A2E2A"/>`;
      s += `<circle cx="${cx}" cy="${zem - 62}" r="46" fill="url(#ch-zare)"/>`;
      s += `<rect x="${cx - 22}" y="${zem - 44}" width="44" height="10" fill="${B.drevo}"/><circle cx="${cx}" cy="${zem - 58}" r="11" fill="#FFF3CC"/><circle cx="${cx}" cy="${zem - 58}" r="11" fill="none" stroke="${B.zlato}" stroke-width="2.4"/>`;
    } else {
      s += `<rect x="${a}" y="${stena + 22}" width="${b - a}" height="${zem - 48 - stena}" fill="url(#ch-shoji)"/>`;
      let mriz = "";
      for (let k = 1; k < 4; k++) mriz += `M${f(a + ((b - a) * k) / 4)} ${stena + 22} V${zem - 26} `;
      for (let k = 1; k < 3; k++) mriz += `M${a} ${f(stena + 22 + ((zem - 48 - stena) * k) / 3)} H${b} `;
      s += `<path d="${mriz}" stroke="#B98A52" stroke-width="1.3" opacity="0.75"/>`;
    }
  }
  s += `<rect x="${cx - 180}" y="${stena + 8}" width="360" height="12" fill="${B.drevo}"/>`;
  for (const x of sloupy) {
    s += `<rect x="${cx + x - 7}" y="${stena}" width="14" height="${zem - 26 - stena}" fill="${x < 0 ? B.rumelkaStin : B.rumelka}"/>`;
    s += `<rect x="${cx + x + 2}" y="${stena}" width="3" height="${zem - 26 - stena}" fill="${B.rumelkaSvetlo}" opacity="${x < 0 ? 0.35 : 0.8}"/>`;
  }
  /* zábradlí verandy */
  s += `<path d="M${cx - 200} ${zem - 44} H${cx - 68} M${cx + 68} ${zem - 44} H${cx + 200}" stroke="${B.rumelka}" stroke-width="4" stroke-linecap="round"/>`;
  let pricky = "";
  for (let x = -196; x <= 196; x += 16) if (Math.abs(x) > 70) pricky += `M${cx + x} ${zem - 44} V${zem - 27} `;
  s += `<path d="${pricky}" stroke="${B.rumelkaStin}" stroke-width="2.4"/>`;
  /* střechy: spodní široká, nad ní užší s hřebenem */
  s += strecha(cx, stena - 72, 300, 520, 84, 22, { tasky: 13 });
  s += `<rect x="${cx - 132}" y="${stena - 96}" width="264" height="26" fill="${B.omitkaStin}"/><rect x="${cx}" y="${stena - 96}" width="132" height="26" fill="${B.omitka}" opacity="0.7"/>`;
  for (let x = -120; x <= 120; x += 24) s += `<rect x="${cx + x - 4}" y="${stena - 88}" width="8" height="8" fill="${B.zlato}" opacity="${x < 0 ? 0.6 : 0.9}"/>`;
  s += strecha(cx, stena - 166, 196, 348, 72, 18, { tasky: 9 });
  s += hreben(cx, stena - 170, 196, 5);
  /* provaz shimenawa nad vchodem a papírové třásně */
  s += `<path d="M${cx - 56} ${stena + 24} Q${cx} ${stena + 44} ${cx + 56} ${stena + 24}" fill="none" stroke="#E7D3A4" stroke-width="7" stroke-linecap="round"/>`;
  s += `<path d="M${cx - 56} ${stena + 24} Q${cx} ${stena + 44} ${cx + 56} ${stena + 24}" fill="none" stroke="#B89A62" stroke-width="7" stroke-linecap="round" stroke-dasharray="2 5" opacity="0.7"/>`;
  for (const x of [-30, 0, 30]) {
    const y = stena + 38 - Math.abs(x) * 0.22;
    s += `<path d="M${cx + x - 4} ${f(y)} h8 l-3 7 h5 l-3 7 h4 l-5 9 l-2 -8 h-4 l3 -7 h-5 Z" fill="#FFFDF4"/>`;
  }
  return s;
}

/** Brána torii: dva sloupy mírně k sobě, prohnuté břevno s černou čepicí, pod ním příčka a tabulka. */
function torii(cx: number, zem: number, roztec: number, vyska: number) {
  let s = "";
  const top = zem - vyska;
  for (const k of [-1, 1]) {
    const dole = cx + (k * roztec) / 2, nahore = cx + (k * (roztec - 20)) / 2;
    s += `<path d="M${f(dole - 9)} ${zem} L${f(nahore - 7)} ${top + 14} H${f(nahore + 7)} L${f(dole + 9)} ${zem} Z" fill="${k < 0 ? B.rumelkaStin : B.rumelka}"/>`;
    s += `<path d="M${f(dole + 3)} ${zem} L${f(nahore + 3)} ${top + 14}" stroke="${B.rumelkaSvetlo}" stroke-width="3" opacity="${k < 0 ? 0.3 : 0.9}"/>`;
    s += `<path d="M${f(dole - 13)} ${zem} h26 l-3 -12 h-20 Z" fill="${B.drevo}"/>`;
  }
  const pres = roztec * 0.5 + 54;
  /* spodní příčka nuki s klíny */
  s += `<rect x="${f(cx - roztec / 2 - 26)}" y="${top + 62}" width="${roztec + 52}" height="13" fill="${B.rumelka}"/><rect x="${f(cx - roztec / 2 - 26)}" y="${top + 62}" width="${roztec + 52}" height="3.4" fill="${B.rumelkaSvetlo}" opacity="0.8"/>`;
  /* tabulka uprostřed */
  s += `<rect x="${cx - 13}" y="${top + 26}" width="26" height="36" fill="${B.drevo}"/><rect x="${cx - 9}" y="${top + 30}" width="18" height="28" fill="${B.zlato}"/>`;
  /* horní břevna: shimaki a prohnuté kasagi */
  s += `<path d="M${f(cx - pres + 12)} ${top + 26} Q${cx} ${top + 34} ${f(cx + pres - 12)} ${top + 26} L${f(cx + pres - 14)} ${top + 14} Q${cx} ${top + 22} ${f(cx - pres + 14)} ${top + 14} Z" fill="${B.rumelka}"/>`;
  s += `<path d="M${f(cx - pres)} ${top + 4} Q${cx} ${top + 22} ${f(cx + pres)} ${top + 4} L${f(cx + pres + 5)} ${top - 12} Q${cx} ${top + 7} ${f(cx - pres - 5)} ${top - 12} Z" fill="${B.drevo}"/>`;
  s += `<path d="M${f(cx - pres - 5)} ${top - 12} Q${cx} ${top + 7} ${f(cx + pres + 5)} ${top - 12}" fill="none" stroke="${B.strechaSvetlo}" stroke-width="2.2" stroke-linecap="round" opacity="0.8"/>`;
  s += `<path d="M${cx + 30} ${top - 1.5} Q${f(cx + pres * 0.6)} ${top - 4} ${f(cx + pres + 5)} ${top - 12}" fill="none" stroke="#FFC08A" stroke-width="2.4" stroke-linecap="round" opacity="0.85"/>`;
  return s;
}

/** Jeviště kagura-den: otevřený pavilon na kůlech, napůl rozhrnutá opona a řada lampionků pod okapem. */
function kaguraden(cx: number, zem: number) {
  const podlaha = zem - 46, strop = zem - 142;
  let s = "";
  /* kůly a podlaha */
  for (const x of [-76, -26, 26, 76]) s += `<rect x="${cx + x - 4}" y="${podlaha}" width="8" height="46" fill="${B.drevo}"/>`;
  s += `<rect x="${cx - 92}" y="${podlaha - 9}" width="184" height="11" fill="#6B4A4E"/><rect x="${cx - 92}" y="${podlaha - 9}" width="184" height="3" fill="#B98A72" opacity="0.8"/>`;
  /* zadní stěna z papíru a opona ve třech barvách, stažená doleva */
  s += `<rect x="${cx - 78}" y="${strop}" width="156" height="${podlaha - 9 - strop}" fill="#F3E6CC"/>`;
  s += `<circle cx="${cx + 14}" cy="${podlaha - 52}" r="26" fill="none" stroke="${B.rumelka}" stroke-width="5" stroke-dasharray="120 44" stroke-linecap="round" opacity="0.8"/>`;
  const pruhy = ["#2A2C5E", B.rumelka, "#D6A23A"];
  for (let i = 0; i < 7; i++) s += `<rect x="${f(cx - 78 + i * 8)}" y="${strop}" width="8.4" height="${podlaha - 9 - strop}" fill="${pruhy[i % 3]}"/>`;
  s += `<path d="M${cx - 22} ${strop} V${podlaha - 9}" stroke="#1E2140" stroke-width="2" opacity="0.5"/>`;
  /* sloupy a zábradlí */
  for (const x of [-82, 82]) s += `<rect x="${cx + x - 5}" y="${strop - 4}" width="10" height="${podlaha - strop - 4}" fill="${x < 0 ? B.rumelkaStin : B.rumelka}"/>`;
  s += `<path d="M${cx - 92} ${podlaha - 26} H${cx - 40} M${cx + 40} ${podlaha - 26} H${cx + 92}" stroke="${B.rumelka}" stroke-width="3" stroke-linecap="round"/>`;
  /* střecha a lampionky pod ní */
  s += strecha(cx, strop - 66, 132, 268, 66, 16, { tasky: 8 });
  s += snura(cx - 96, strop + 4, cx + 96, strop + 4, 9, 6, 1);
  /* schůdky dopředu */
  s += `<path d="M${cx - 20} ${podlaha + 2} H${cx + 20} L${cx + 28} ${zem} H${cx - 28} Z" fill="#6B4A4E"/><path d="M${cx - 23} ${podlaha + 17} H${cx + 23} M${cx - 26} ${podlaha + 32} H${cx + 26}" stroke="#3B2B38" stroke-width="1.6"/>`;
  return s;
}

/** Rozkvetlá sakura: nakloněný kmen a koruna z růžových chomáčů. */
function sakura(x: number, y: number) {
  let s = `<path d="M${x} ${y} C${x - 6} ${y - 40} ${x + 10} ${y - 70} ${x - 14} ${y - 108} M${x - 2} ${y - 60} C${x + 20} ${y - 84} ${x + 38} ${y - 86} ${x + 50} ${y - 112}" fill="none" stroke="${B.drevo}" stroke-width="8" stroke-linecap="round"/>`;
  const chom: [number, number, number, number][] = [[-30, -128, 58, 38], [34, -134, 54, 36], [-64, -98, 36, 24], [70, -100, 34, 24], [4, -160, 44, 28]];
  chom.forEach(([dx, dy, rx, ry], i) => (s += `<path d="${chomac(x + dx, y + dy, rx, ry, 12, 300 + i, 0.6, 0.66)}" fill="url(#ch-sakura)"/>`));
  chom.forEach(([dx, dy, rx, ry], i) => (s += `<path d="${chomac(x + dx + 8, y + dy - ry * 0.3, rx * 0.5, ry * 0.42, 9, 320 + i, 0.8, 0.66)}" fill="#FFF1F1" opacity="0.7"/>`));
  return s;
}

/**
 * Ostrov s chrámem. viewBox 0 0 1000 1000; spodních zhruba 160 jednotek
 * (schody a skála) zmizí v oblacích, které před kresbu položí stránka.
 */
export function chram() {
  const DVUR = 660; /* dolní nádvoří s branou */
  const TERASA = 484; /* horní terasa se síní */
  const BRANA = 838; /* kde stojí torii — patami už v oblacích */
  const r = nahoda(77);
  let s = `<defs>${DEFS}</defs>`;

  /* skála pod nádvořím, dolů se ztrácí */
  s += `<path d="M96 ${DVUR + 6} C150 ${DVUR + 70} 190 ${DVUR + 100} 232 ${DVUR + 170} C262 ${DVUR + 220} 300 ${DVUR + 262} 330 1000 L670 1000 C700 ${DVUR + 262} 738 ${DVUR + 220} 768 ${DVUR + 170} C810 ${DVUR + 100} 850 ${DVUR + 70} 904 ${DVUR + 6} Z" fill="url(#ch-skala)"/>`;
  let pukliny = "";
  for (let i = 0; i < 16; i++) {
    const x = 170 + r() * 660, y = DVUR + 24 + r() * 150;
    if (Math.abs(x - 500) < 80) continue;
    pukliny += `M${f(x)} ${f(y)} l${f((r() - 0.5) * 22)} ${f(18 + r() * 30)} l${f((r() - 0.5) * 16)} ${f(10 + r() * 20)} `;
  }
  s += `<path d="${pukliny}" fill="none" stroke="#211F45" stroke-width="2" stroke-linecap="round" opacity="0.5"/>`;

  /* pagoda vzadu vlevo, za borovicí */
  s += pagoda(196, DVUR - 6);

  /* nádvoří: plato a jeho hrana */
  s += `<path d="M84 ${DVUR} Q500 ${DVUR - 26} 916 ${DVUR} L904 ${DVUR + 16} Q500 ${DVUR + 2} 96 ${DVUR + 16} Z" fill="url(#ch-plato)"/>`;
  s += `<path d="M96 ${DVUR + 16} Q500 ${DVUR + 2} 904 ${DVUR + 16} L896 ${DVUR + 30} Q500 ${DVUR + 16} 104 ${DVUR + 30} Z" fill="#3E3966"/>`;

  /* terasa se zdí z kamenů a horní schody */
  s += `<path d="M236 ${DVUR - 8} L262 ${TERASA} H738 L764 ${DVUR - 8} Z" fill="url(#ch-zed)"/>`;
  let kameny = "";
  for (let radek = 0; radek < 6; radek++) {
    const y = TERASA + 14 + radek * 27;
    kameny += `M${f(262 - (radek + 0.5) * 4)} ${y} H${f(738 + (radek + 0.5) * 4)} `;
    for (let x = 280 + (radek % 2) * 24; x < 730; x += 48) if (Math.abs(x - 500) > 78) kameny += `M${x} ${y} v27 `;
  }
  s += `<path d="${kameny}" fill="none" stroke="${B.kamenStin}" stroke-width="1.4" opacity="0.55"/>`;
  s += `<path d="M254 ${TERASA} H746" stroke="${B.kamenSvetlo}" stroke-width="4" stroke-linecap="round"/>`;
  s += sin(500, TERASA);
  s += schody(500, TERASA - 2, 104, DVUR - 10, 156, 11);

  /* jeviště a sakura vpravo, lucerny na nádvoří */
  s += kaguraden(800, DVUR - 8);
  s += sakura(672, DVUR - 6);
  s += toro(296, DVUR - 6, 0.9) + toro(704, DVUR - 6, 0.9);

  /* dolní schody do oblak, po stranách lucerny */
  s += schody(500, DVUR + 2, 150, 1000, 300, 14);
  s += toro(386, DVUR + 92, 0.85) + toro(614, DVUR + 92, 0.85);

  /* borovice v popředí: vlevo velká nakloněná, vpravo menší za jevištěm */
  s += borovice(120, DVUR + 4, "M0 0 C-10 -50 14 -86 -8 -140 M-2 -70 C-30 -84 -44 -100 -62 -104 M-4 -108 C16 -126 34 -128 48 -150", [[-66, -112, 46, 17], [-10, -152, 54, 19], [50, -160, 40, 15], [10, -196, 36, 14]], 500);
  s += borovice(916, DVUR + 2, "M0 0 C8 -40 -12 -70 2 -112 M0 -60 C18 -72 26 -82 36 -92", [[2, -122, 40, 15], [38, -100, 28, 11], [-22, -92, 26, 10]], 540);

  /* průvod stoupá po schodech: sedm světýlek, která se nahoře ztratí na nádvoří (pohyb je v parta3.css, bez něj čekají dole v oblacích) */
  s += `<g transform="translate(500 ${BRANA + 150})">`;
  for (let i = 0; i < 7; i++) s += `<g class="ch-svetylko" style="--i:${i};--sx:${i % 2 ? 16 : -16}px"><circle r="15" fill="url(#ch-zare)"/><circle r="3.4" fill="#FFF3C8"/></g>`;
  s += `</g>`;

  /* brána stojí na schodech až u oblak a rámuje celý chrám; od ní vedou šňůry lampionků k borovicím */
  s += snura(300, BRANA - 326, 112, DVUR - 150, 36, 6, 0) + snura(700, BRANA - 326, 888, DVUR - 118, 36, 6, 2);
  s += torii(500, BRANA, 292, 318);

  return `<svg viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">${s}</svg>`;
}

/** Vrcholky v dálce: jen špičky nad oblaky, barvy podle oblohy. */
export function dalky() {
  const hory: [number, number, number][] = [[150, 250, 210], [400, 300, 150], [640, 270, 180], [1010, 310, 130], [1280, 240, 230], [1520, 300, 150]];
  let s = `<defs><linearGradient id="ch-opar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--nebe-obzor, #F4BA90)" stop-opacity="0"/><stop offset="1" style="stop-color:var(--nebe-obzor, #F4BA90)" stop-opacity="0.9"/></linearGradient></defs>`;
  hory.forEach(([x, y, w], i) => {
    const barva = i % 2 ? "var(--kopec-blizko, #6B6795)" : "var(--kopec-daleko, #8D81AF)";
    s += `<path d="M${x - w} 520 C${x - w * 0.5} ${y + 130} ${x - w * 0.22} ${y + 26} ${x - 8} ${y} Q${x} ${y - 8} ${x + 10} ${y + 4} C${x + w * 0.24} ${y + 40} ${x + w * 0.56} ${y + 140} ${x + w} 520 Z" style="fill:${barva}" opacity="${i % 2 ? 0.7 : 0.85}"/>`;
    /* sníh na špičce */
    s += `<path d="M${x - 8} ${y} Q${x} ${y - 8} ${x + 10} ${y + 4} L${x + w * 0.13} ${y + 30} L${x + w * 0.05} ${y + 22} L${x - w * 0.02} ${y + 36} L${x - w * 0.08} ${y + 20} L${x - w * 0.13} ${y + 30} Z" fill="#FFF6EC" opacity="0.55"/>`;
  });
  s += `<rect x="0" y="300" width="1600" height="260" fill="url(#ch-opar)"/>`;
  return `<svg viewBox="0 0 1600 560" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">${s}</svg>`;
}

/**
 * Pás oblačného moře: tři řady chomáčů, zadní světlejší a menší. Horní okraj
 * je vroubkovaný, dolů přechází do plné barvy, na kterou může navázat další
 * vrstva. `id` musí být na stránce jedinečné (přechody).
 */
export function more(id: string, seed: number, { rad = 3 } = {}) {
  const r = nahoda(seed);
  let s =
    `<defs><linearGradient id="${id}-g" gradientUnits="userSpaceOnUse" x1="0" y1="20" x2="0" y2="300">` +
    `<stop offset="0" style="stop-color:var(--mrak-zare, #FFE6DD)"/><stop offset="0.35" style="stop-color:var(--mrak-svetlo, #F2C8C2)"/><stop offset="1" style="stop-color:var(--mrak-stin, #9083AF)"/></linearGradient></defs>`;
  for (let k = 0; k < rad; k++) {
    const y = 96 + k * 62;
    const op = 0.8 + k * 0.1;
    let d = "";
    for (let x = -60 + r() * 60; x < 1680; ) {
      const rx = 70 + r() * 90 + k * 18;
      const ry = 34 + r() * 26 + k * 6;
      d += chomac(x + rx * 0.5, y + (r() - 0.5) * 22, rx, ry, 10 + Math.floor(r() * 4), seed * 31 + k * 97 + Math.floor(x), 0.3, 0.66) + " ";
      x += rx * (1.05 + r() * 0.5);
    }
    s += `<g class="mo-rada mo-rada-${k}" opacity="${op.toFixed(2)}"><path d="${d}" fill="url(#${id}-g)"/><rect x="-80" y="${y + 6}" width="1780" height="${300 - y}" fill="url(#${id}-g)"/></g>`;
  }
  return `<svg viewBox="0 0 1600 300" preserveAspectRatio="xMidYMin slice" aria-hidden="true" focusable="false">${s}</svg>`;
}
