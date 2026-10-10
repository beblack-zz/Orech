/*
 * Hlínka, kami země, ve třech přehnaných podobách — generátory kresby.
 * Komponenta: components/characters/kami-buh/HlinkaZeme.astro, běh: ./beh.js.
 *
 *   v1  Sakura — spí mezi kořeny posvátné převislé sakury, koruna je svatozář
 *   v2  Drak nad Fudži — rytina po Hokusaiovi: vyválí se do válečku a letí za perlou
 *   v3  Suikinkutsu — zakopaný džbán pod kamennou nádržkou zvoní kapkami, Hlínka v něm spí
 *
 * Stavba je stejná jako u Pecinky s ohněm (scripts/pecinka-ohen): čisté
 * generátory SVG bez DOM, takže běží i v Node a jde z nich udělat náhled
 * jako PNG (celeSvg + sharp). Každá kresba má vrstvy, vrstva bez `klic` se
 * nakreslí jednou, s `klic` se překreslí, jen když se klíč změní. Navíc:
 *
 *   pohyb  — vrstva se hýbe jako celek (dýchání, kýchnutí, smích): běh ji
 *            natočí a zvětší přes CSS transform a prohlížeč ji nepřekresluje.
 *   uzly   — vrstva se nakreslí jednou a pak se mění jen atributy prvků
 *            s data-u (natočení větví sakury, papírky shide). Stovky květů
 *            tak nejdou při každém zafoukání znovu přes innerHTML.
 *
 * Simulace žije v `dyn`: beh.js ji založí přes novaDynamika() a každý
 * snímek posune přes krok(). Zvuky, které má běh zahrát, krok přidá do
 * dyn.zvuk. Id ve filtrech a přechodech jsou pevná, každá podoba smí být
 * na stránce jen jednou. Mají vlastní předponu hz1-, hz2-, hz3-: na
 * stránce Marcel stojí i Pecinka a další, a ty mají v1-telo, v1-tah…
 * Dvě stejná id by si prohlížeč spletl a Hlínka by dostala cizí barvy.
 *
 * Podle Pecinky, Bublinky a Střípka přibyly podoby, které mají každá svůj
 * soubor a společné kusy v ./spolecne.js:
 *
 *   sakura   01 Kami — pod sakurou: nová, čistá kresba ve stylu lampionu (id hzk-)
 *   ruce     02 Tušový lem — mokré ruce: spí na kruhu a ruce z noci ji vytáčejí do tvarů (id hzr-)
 *   lampion  03 Lampion — bez pozadí, jde ze spaní a lampion jí vyrostl z výhonku (id hzl-)
 *
 * Původní sakura (v1) tím ze stránky odešla, 04 Na schovávanou bydlí
 * v components/characters/schovka.
 * Vrstva s `orez` se ořízne tušovou skvrnou, vrstva s `pruhlednost` se prolíná.
 */
import { kamiSakura } from "./kami-sakura.js";
import { lemRuce } from "./lem-ruce.js";
import { lampion } from "./lampion.js";

/* ——— Pomocníci (stejní jako u Pecinky) ——— */
const f = (n) => Math.round(n * 100) / 100;
const rng = (a) => () => {
  a |= 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (x) => {
  x = clamp(x);
  return x * x * (3 - 2 * x);
};
const krokem = (a, b, x) => smooth((x - a) / (b - a));
const easeOut = (x) => 1 - Math.pow(1 - clamp(x), 3);
const rad = (d) => (d * Math.PI) / 180;
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgbHex = (c) => "#" + c.map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0")).join("");
const mix = (a, b, k) => {
  const A = hexRgb(a);
  const B = hexRgb(b);
  return rgbHex(A.map((v, i) => v + (B[i] - v) * clamp(k)));
};
const pt = (p) => `${f(p[0])} ${f(p[1])}`;
const cara = (body) => "M" + body.map(pt).join(" L");
/** Kruh jako podcesta — hodně kruhů v jedné <path> je levnější než stejně <circle>. */
const f1 = (n) => Math.round(n * 10) / 10;
const kruhD = (x, y, r) => `M${f1(x - r)} ${f1(y)}a${f1(r)} ${f1(r)} 0 1 0 ${f1(2 * r)} 0a${f1(r)} ${f1(r)} 0 1 0 ${f1(-2 * r)} 0`;
/** Bod p otočený o úhel a (radiány, kladný po směru hodinek jako v SVG) kolem bodu o. */
const otoc = (p, a, o) => {
  const c = Math.cos(a), s = Math.sin(a);
  const x = p[0] - o[0], y = p[1] - o[1];
  return [o[0] + x * c - y * s, o[1] + x * s + y * c];
};

/** Catmull-Rom přes body → hladká křivka z kubických Bézierů. */
const hladka = (P, zavrena = false) => {
  const n = P.length;
  const g = (i) => (zavrena ? P[(i + n) % n] : P[clamp(i, 0, n - 1)]);
  let d = `M${pt(P[0])}`;
  const m = zavrena ? n : n - 1;
  for (let i = 0; i < m; i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${pt(c1)} ${pt(c2)} ${pt(p2)}`;
  }
  return zavrena ? d + " Z" : d;
};
/** Body na téže křivce (Catmull-Rom), n na úsek — pro pásy s proměnnou šířkou. */
const vzorkuj = (P, n = 8) => {
  const N = P.length;
  const g = (i) => P[clamp(i, 0, N - 1)];
  const out = [];
  for (let i = 0; i < N - 1; i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    for (let k = 0; k < n; k++) {
      const t = k / n, u = 1 - t;
      out.push([
        u * u * u * p1[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p2[0],
        u * u * u * p1[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p2[1],
      ]);
    }
  }
  out.push(P[N - 1]);
  return out;
};
/** Bod a směr ve zlomku s délky lomené čáry. */
const naCare = (B, s) => {
  const D = [0];
  for (let i = 1; i < B.length; i++) D.push(D[i - 1] + Math.hypot(B[i][0] - B[i - 1][0], B[i][1] - B[i - 1][1]));
  const cil = clamp(s) * D[D.length - 1];
  let i = 1;
  while (i < B.length - 1 && D[i] < cil) i++;
  const k = (cil - D[i - 1]) / (D[i] - D[i - 1] || 1);
  const a = B[i - 1], b = B[i];
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  return { p: [lerp(a[0], b[0], k), lerp(a[1], b[1], k)], smer: [(b[0] - a[0]) / d, (b[1] - a[1]) / d] };
};
/** Lomená čára s proměnnou šířkou → uzavřený tvar. sirka(t) pro t 0…1. */
const pasPoBodech = (B, sirka) => {
  const L = [], Pr = [];
  const n = B.length;
  for (let i = 0; i < n; i++) {
    const a = B[Math.max(0, i - 1)], b = B[Math.min(n - 1, i + 1)];
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = -(b[1] - a[1]) / d, ny = (b[0] - a[0]) / d;
    const w = sirka(i / (n - 1)) / 2;
    L.push([B[i][0] + nx * w, B[i][1] + ny * w]);
    Pr.push([B[i][0] - nx * w, B[i][1] - ny * w]);
  }
  return `${cara(L)} L${Pr.reverse().map(pt).join(" L")} Z`;
};
/** Nepravidelný oblý tvar kolem středu: poloměr kolísá podle seedu. */
const hrouda = (cx, cy, rx, ry, seed, { bodu = 18, kolisani = 0.14 } = {}) => {
  const r = rng(seed);
  const B = [];
  for (let i = 0; i < bodu; i++) {
    const u = (i / bodu) * Math.PI * 2;
    const k = 1 + (r() - 0.5) * 2 * kolisani;
    B.push([cx + Math.cos(u) * rx * k, cy + Math.sin(u) * ry * k]);
  }
  return hladka(B, true);
};
/** Mrkání: krátké zavření kolem každého času v seznamu, 0,17 s. */
const mrkani = (t, casy, perioda) => {
  const tt = perioda ? ((t % perioda) + perioda) % perioda : t;
  let m = 0;
  for (const c of casy) {
    const u = tt - c;
    if (u > 0 && u < 0.17) m = Math.max(m, Math.sin((Math.PI * u) / 0.17));
  }
  return m;
};
/** Čtyřcípá jiskra kolem počátku. */
const jiskraD = (r) => `M0 ${f(-r)} Q${f(r * 0.22)} ${f(-r * 0.22)} ${f(r)} 0 Q${f(r * 0.22)} ${f(r * 0.22)} 0 ${f(r)} Q${f(-r * 0.22)} ${f(r * 0.22)} ${f(-r)} 0 Q${f(-r * 0.22)} ${f(-r * 0.22)} 0 ${f(-r)} Z`;
/**
 * Jeden jazyk plamene (z Pecinky s ohněm): vyrazí ze základny B ve směru
 * th0, stáčí se vzhůru a na konci do háčku. Tady z něj je ohnivá aura perly.
 */
const jazyk = ({ B, th0, L, W, c = 1, stoupani = 0.8, stoc = 2.1, vitr = 0, vlna = 0.24, t = 0, w = 3, fz = 0, N = 14, zuzeni = 0.55 }) => {
  let dUp = -Math.PI / 2 - th0;
  while (dUp > Math.PI) dUp -= Math.PI * 2;
  while (dUp < -Math.PI) dUp += Math.PI * 2;
  const body = [];
  let x = B[0], y = B[1];
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    body.push([x, y]);
    const th = th0 + dUp * stoupani * smooth(s * 1.15) + c * stoc * Math.pow(krokem(0.5, 1, s), 1.5) + vitr * Math.pow(s, 1.25) + vlna * s * Math.sin(t * w + fz - s * 3.4);
    x += (Math.cos(th) * L) / N;
    y += (Math.sin(th) * L) / N;
  }
  return pasPoBodech(body, (s) => W * (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, s * 0.95))) * Math.pow(1 - s, zuzeni));
};
/** Rozdíl úhlů zkrácený do −π…π. */
const uhelRozdil = (a, b) => {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
};
/** Tlumená pružina: kam se dostane hodnota x s rychlostí v za dt, když ji táhne k cíli. */
const pruzina = (x, v, cil, dt, tuhost, tlumeni) => {
  const a = -tuhost * (x - cil) - tlumeni * v;
  v += a * dt;
  return [x + v * dt, v];
};

/** Pětilistý kvítek sakury se zoubkem na každém plátku; r je délka plátku, a natočení. */
const kvetD = (cx, cy, r, a = 0) => {
  let d = "";
  for (let i = 0; i < 5; i++) {
    const u = a + (i * 2 * Math.PI) / 5;
    const c = Math.cos(u), sn = Math.sin(u);
    const P = (x, y) => pt([cx + x * c - y * sn, cy + x * sn + y * c]);
    d += `M${P(0, 0)} C${P(-0.55 * r, -0.2 * r)} ${P(-0.64 * r, -0.86 * r)} ${P(-0.2 * r, -r)} L${P(0, -0.82 * r)} L${P(0.2 * r, -r)} C${P(0.64 * r, -0.86 * r)} ${P(0.55 * r, -0.2 * r)} ${P(0, 0)} Z`;
  }
  return d;
};
/** Okvětní lístek sakury se zoubkem na špičce, kolem počátku. */
const LISTEK = "M0 -2.2 C1.4 -1.9 1.7 0.6 0 2.2 C-1.7 0.6 -1.4 -1.9 0 -2.2 Z M0 -2.2 L0.5 -1.5 L0 -1.7 L-0.5 -1.5 Z";

/* ═══════════════════════════════════════════════════════════════════
 * Hlínka: původní kresba (characters/kami/Hlinka.astro). Hrouda r 48
 * kolem (90, 98), nožky na y 144 (spodek 149), výhonek od temene (y 54)
 * do y 28. Všechno v jejích souřadnicích 0–180, na místo ji posadí
 * transform jako u Pecinky.
 * ═══════════════════════════════════════════════════════════════════ */
const HL = { oci: [[78, 93], [102, 93]], spodek: 149 };

const hlDefs = (id, { svetla = "#8A7A69", stred = "#6B5D4F", tmava = "#52463B", tvare = "#C87E4E" } = {}) =>
  `<radialGradient id="${id}-telo" cx="0.36" cy="0.3" r="0.8"><stop offset="0" stop-color="${svetla}"/><stop offset="0.55" stop-color="${stred}"/><stop offset="1" stop-color="${tmava}"/></radialGradient>` +
  `<radialGradient id="${id}-tvare"><stop offset="0" stop-color="${tvare}" stop-opacity="0.85"/><stop offset="1" stop-color="${tvare}" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="${id}-svetylko"><stop offset="0" stop-color="#FFF6D2" stop-opacity="0.95"/><stop offset="0.3" stop-color="#F2DC94" stop-opacity="0.5"/><stop offset="1" stop-color="#F2DC94" stop-opacity="0"/></radialGradient>`;

/** Hrouda se skvrnami, jak je na původní kresbě. */
const hlTelo = (id, { obrys = "#4A3F35" } = {}) =>
  `<circle cx="90" cy="98" r="48" fill="url(#${id}-telo)" stroke="${obrys}" stroke-width="1.6"/>` +
  `<circle cx="70" cy="80" r="8" fill="#9A8A78" opacity="0.4"/><circle cx="108" cy="112" r="6" fill="#7D6E5F" opacity="0.4"/><circle cx="82" cy="120" r="5" fill="#5A4E42" opacity="0.3"/>`;
const hlNohy = (barva = "#4F443A") => `<ellipse cx="76" cy="144" rx="11" ry="5" fill="${barva}"/><ellipse cx="104" cy="144" rx="11" ry="5" fill="${barva}"/>`;

/** Výhonek na temeni. kyv ve stupních kolem kořínku (90, 54). */
const hlVyhonek = ({ kyv = 0, stonek = "#6E7A4E", list1 = "#8A9466", list2 = "#9AA375", zilka = "#C7CC9E" } = {}) =>
  `<g transform="rotate(${f(kyv)} 90 54)">` +
  `<path d="M90 54 C89 44 91 38 95 32" stroke="${stonek}" stroke-width="2.2" stroke-linecap="round" fill="none"/>` +
  `<path d="M94 36 C100 28 110 28 114 31 C108 37 100 39 94 36 Z" fill="${list1}" stroke="${stonek}" stroke-width="1"/>` +
  `<path d="M92 42 C86 35 78 35 74 38 C79 43 87 45 92 42 Z" fill="${list2}" stroke="${stonek}" stroke-width="1"/>` +
  `<path d="M95.5 35.2 Q104 31.6 112 31.2 M90.6 41 Q83 37.6 76.4 38.2" stroke="${zilka}" stroke-width="0.7" stroke-linecap="round" fill="none" opacity="0.8"/>` +
  `</g>`;

/** „z“ jako tah, ne písmo — písma webu se do kresby nedostanou. */
const zetko = (x, y, s, op, barva = "#6B5D4F") =>
  `<path d="M${f(x)} ${f(y)} h${f(5 * s)} l${f(-5 * s)} ${f(6 * s)} h${f(5 * s)}" stroke="${barva}" stroke-width="${f(1.6 * s)}" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="${f(op)}"/>`;
/** Tři zetka stoupají z hrdla a mizí, perioda 3,6 s. */
const zzz = (t, x, y, { barva = "#6B5D4F", meritko = 1, sila = 1 } = {}) => {
  let s = "";
  for (let i = 0; i < 3; i++) {
    const u = (((t / 3.6 + i / 3) % 1) + 1) % 1;
    const op = Math.sin(Math.PI * u) * sila;
    if (op < 0.03) continue;
    s += zetko(x + u * 10 * meritko + Math.sin(u * 6 + i) * 2 * meritko, y - u * 22 * meritko, (0.7 + u * 0.6) * meritko, op, barva);
  }
  return s;
};
/** Světýlko, které kolem Hlínky plave, dokud spí. */
const svetylko = (id, x, y, r = 2.2, op = 1) =>
  `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 4.6)}" fill="url(#${id}-svetylko)" opacity="${f(op)}"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 0.48)}" fill="#FFFBEA" opacity="${f(op)}"/>`;

/**
 * Tvářička v souřadnicích původní kresby.
 * oci: spi (zavřená do úsměvu, jako na původní kresbě) | tvrde (hluboký
 *      spánek) | ospale | otevrene | siroke | smich | kych (přimhouřená)
 * usta: usmev | o | zev | vlnka | ach | kych | spanek
 */
const hlTvar = (id, { oci = "spi", usta = "usmev", mrk = 0, dx = 0, dy = 0, tvare = 0.45, linka = "#F4EBDD", zrenicka = "#2B2420", odlesk = null } = {}) => {
  let s = `<g fill="url(#${id}-tvare)" opacity="${f(clamp(tvare))}"><ellipse cx="68" cy="104" rx="9" ry="6"/><ellipse cx="112" cy="104" rx="9" ry="6"/></g>`;
  const ox = clamp(dx, -2.2, 2.2), oy = clamp(dy, -1.8, 1.8);
  const tah = (d, w = 2.5) => `<path d="${d}" stroke="${linka}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
  if (oci === "spi") s += tah("M72 94 Q78 90 84 94 M96 94 Q102 90 108 94");
  else if (oci === "tvrde") s += tah("M72 92.4 Q78 96.6 84 92.4 M96 92.4 Q102 96.6 108 92.4");
  else if (oci === "smich") s += tah("M71.6 95.4 Q78 88 84.4 95.4 M95.6 95.4 Q102 88 108.4 95.4", 2.8);
  else if (oci === "kych") s += tah("M72.6 89.6 L81.4 93.4 L72.6 97.2 M107.4 89.6 L98.6 93.4 L107.4 97.2", 2.4);
  else if (oci === "ospale") {
    for (const [x, y] of HL.oci) {
      s += `<path d="M${x - 5.4} ${y} Q${x} ${y + 5.4} ${x + 5.4} ${y} Z" fill="${linka}"/>`;
      s += `<circle cx="${f(x + ox * 0.6)}" cy="${f(y + 1.6)}" r="2" fill="${zrenicka}"/>`;
      s += tah(`M${x - 6} ${y - 0.4} Q${x} ${y - 1.6} ${x + 6} ${y - 0.4}`, 1.8);
    }
  } else {
    const velke = oci === "siroke";
    const rx = velke ? 5 : 4.3, ry = (velke ? 5.8 : 5) * Math.max(0.06, 1 - mrk * 0.95);
    for (const [x, y] of HL.oci) {
      s += `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${f(ry)}" fill="${linka}"/>`;
      if (mrk < 0.6) {
        const pr = velke ? 2.3 : 2.6;
        s += `<circle cx="${f(x + ox)}" cy="${f(y + oy * Math.max(0.2, 1 - mrk))}" r="${f(pr * Math.max(0.3, 1 - mrk))}" fill="${zrenicka}"/>`;
        s += `<circle cx="${f(x + ox - 1.1)}" cy="${f(y + oy - 1.4)}" r="1.05" fill="#FFFFFF"/>`;
        if (odlesk) s += `<circle cx="${f(x + ox * 1.3 + 0.8)}" cy="${f(y + oy * 1.3 + 1)}" r="0.8" fill="${odlesk.barva}" opacity="${f(odlesk.sila)}"/>`;
      }
    }
  }
  const pusa = "#3A2A22";
  if (usta === "o") s += `<ellipse cx="90" cy="109.6" rx="2.8" ry="3.3" fill="${pusa}" stroke="${linka}" stroke-width="1.3"/>`;
  else if (usta === "spanek") s += `<ellipse cx="90" cy="109.4" rx="1.9" ry="2.1" fill="${pusa}" stroke="${linka}" stroke-width="1.1"/>`;
  else if (usta === "zev") s += `<ellipse cx="90" cy="110.4" rx="4.4" ry="5.6" fill="${pusa}" stroke="${linka}" stroke-width="1.4"/><ellipse cx="90" cy="113.6" rx="2.6" ry="1.6" fill="#C46A5A"/>`;
  else if (usta === "vlnka") s += tah("M84.4 109.4 Q86.6 107.2 88.8 109.2 Q91 111.2 93.2 109.2 Q94.6 108 95.8 108.8", 1.8);
  else if (usta === "ach") s += `<path d="M84.2 107.2 Q90 116.4 95.8 107.2 Z" fill="${pusa}" stroke="${linka}" stroke-width="1.4" stroke-linejoin="round"/><path d="M87 111.6 Q90 113.6 93 111.6" stroke="#C46A5A" stroke-width="1.6" stroke-linecap="round" fill="none"/>`;
  else if (usta === "kych") s += `<ellipse cx="90" cy="110" rx="4.6" ry="4.2" fill="${pusa}" stroke="${linka}" stroke-width="1.4"/>` + tah("M62 112 L55 115 M60 104 L52 104 M118 112 L125 115 M120 104 L128 104", 1.6);
  else s += tah("M85 108 Q90 112 95 108", 1.8);
  return s;
};

/* ═══════════════════════════════════════════════════════════════════
 * 1 — SAKURA
 * Hlínka spí u kořenů velkého stromu — tak to o ní stojí v partě. Tady je
 * ten strom posvátný (shinboku): stará převislá sakura shidarezakura se
 * slaměným provazem a papírky shide kolem kmene. Za korunou visí bledý
 * měsíc jako svatozář a převislé pruty kolem Hlínky padají jako fontána.
 *
 * Myš je vítr: pruty se od ní odklánějí a rychlé mávnutí strhne okvětní
 * lístky. Lístky padají a zůstávají ležet v mechu i na Hlínce. Kliknutí:
 * jeden lístek jí přistane na nose, Hlínka kýchne, celý strom se otřese a
 * spadne vánice lístků (hanafubuki). Když ji někdo lechtá rychlým pohybem
 * myši, chichotá se. Občas zazpívá sedmihlásek uguisu.
 * ═══════════════════════════════════════════════════════════════════ */
const V1 = (() => {
  const FIG = { x: 90, y: 161, s: 0.62 };
  const FIGT = `translate(${FIG.x} ${FIG.y}) scale(${FIG.s}) translate(-90 -${HL.spodek})`;
  const vPostave = (s) => `<g transform="${FIGT}">${s}</g>`;
  const naPanel = ([x, y]) => [FIG.x + (x - 90) * FIG.s, FIG.y + (y - HL.spodek) * FIG.s];
  const STRED = naPanel([90, 98]);
  const R_TELA = 48 * FIG.s;
  const NOS = naPanel([90, 103]);
  const MESIC = { x: 90, y: 84, r: 50 };
  const R = rng(2604);

  /* ——— Strom: kmen s kořenovými náběhy, hlavní větve, převislé pruty ——— */
  const KMEN = [[90, 150], [88.6, 138], [91.6, 124], [88.6, 110], [91.4, 96], [88.8, 80], [90.8, 64], [90, 50]];
  const sirkaKmene = (s) => 11 + 7 * (1 - s) * (1 - s) + 1.2 * Math.sin(s * 26);
  /*
    Kořenový náběh (nebari): u země se kmen rozteče do širokého zvonu
    s žebry, širšího než Hlínka. Sedí v něm jako v hnízdě.
  */
  const NEBARI_L = [[84.6, 112], [83, 126], [78.6, 137], [70, 145.4], [56, 151.6], [38, 156.4], [24, 160.6]];
  const NEBARI = hladka([...NEBARI_L, [26, 166], [154, 166], ...NEBARI_L.map(([x, y]) => [180 - x, y]).reverse()], true);
  const ZEBRA = [
    [[86, 128], [80, 140], [68, 149], [52, 155], [36, 159]],
    [[88, 136], [84, 146], [74, 153], [62, 158]],
    [[94, 128], [100, 140], [112, 149], [128, 155], [144, 159]],
    [[92, 136], [96, 146], [106, 153], [118, 158]],
  ];
  const VETVE = [
    { P: [[90, 53], [80, 46], [67, 39], [52, 36], [38, 39], [28, 46], [23, 55]], w: [8.4, 2.4], prutu: 7 },
    { P: [[90, 53], [100, 46], [113, 39], [128, 36], [142, 39], [152, 46], [157, 55]], w: [8.4, 2.4], prutu: 7 },
    { P: [[90, 51], [85, 41], [77, 31], [66, 23], [53, 19], [42, 21]], w: [5.8, 1.7], prutu: 5 },
    { P: [[90, 51], [95, 41], [103, 31], [114, 23], [127, 19], [138, 21]], w: [5.8, 1.7], prutu: 5 },
    { P: [[90, 51], [90.6, 41], [92, 31], [95, 22], [99, 15]], w: [4, 1.2], prutu: 2 },
  ].map((v) => ({ ...v, B: vzorkuj(v.P, 4) }));
  const KORENY = [
    { P: [[34, 159.4], [26, 162], [20, 166.4], [15, 171]], w: [3.4, 0.8] },
    { P: [[146, 159.4], [154, 162], [160, 166.4], [165, 171]], w: [3.4, 0.8] },
  ].map((v) => ({ ...v, B: vzorkuj(v.P, 6) }));
  /** Mechový pahorek: horní plocha (kam padají lístky) a spodek s hlínou. */
  const zemY = (x) => (x < 8 || x > 172 ? 999 : 157.5 + Math.pow((x - 90) / 82, 2) * 10);
  const spodekY = (x) => 167.5 + 10.5 * Math.sqrt(Math.max(0, 1 - Math.pow((x - 90) / 82, 2)));

  /*
    Převislé pruty jako fontána: vyrazí z koruny šikmo ven a pak padají.
    Každý má tři články s klouby J0–J2. Při kreslení se vnoří do sebe —
    článek 2 je uvnitř článku 1 —, takže když se natočí horní kloub, jde
    s ním celý zbytek prutu. Pruty u kmene visí za ním, ostatní před měsícem.
  */
  const PRUTY = [];
  VETVE.forEach((v, vi) => {
    for (let k = 0; k < v.prutu; k++) {
      const s = lerp(0.3, 1, (k + 0.25 + R() * 0.5) / v.prutu);
      const { p } = naCare(v.B, s);
      const dx = p[0] - 90;
      const o = clamp(Math.abs(dx) / 68);
      const smer = dx < 0 ? -1 : 1;
      const zadni = Math.abs(dx) < 24;
      const konecY = zadni ? 92 + R() * 14 : 112 + 44 * Math.pow(o, 0.9) + (R() - 0.5) * 10;
      const L = Math.max(30, konecY - p[1]);
      const J0 = [p[0], p[1] - 1.5];
      const J1 = [J0[0] + smer * (4 + 8 * o) * (0.8 + R() * 0.4), J0[1] + L * 0.26];
      const J2 = [J1[0] + smer * (1.5 + 3 * o), J1[1] + L * 0.34];
      const J3 = [J2[0] + smer * 0.6 * o + (R() - 0.5) * 2, J2[1] + L * 0.4];
      PRUTY.push({ J: [J0, J1, J2, J3], zadni, L, fz: R() * 6.28, w0: 0.75 + R() * 0.35, seed: vi * 100 + k, o });
    }
  });
  /* pruty vpředu jsou sytější, aby se neztratily na měsíci; zadní jsou tlumené */
  const KVETY = {
    predni: { stin: "#D46A8A", kvet: "#F09AB4", svetle: "#F8C4D2", tecky: "#B23C60" },
    zadni: { stin: "#C68A9E", kvet: "#E7ADBF", svetle: "#F2CFDA", tecky: "#A2607A" },
  };
  /*
    Kvítky se nekreslí po jednom: v <defs> je pět předkreslených chomáčů
    (jeden kvítek, kvítek s poupětem, dvojice, trojice, velká trojice) ve
    dvou barevných sadách a na pruty se jen rozmístí přes <use>. Celá
    sakura má přes tisíc chomáčů — jako kruhy by měla půl megabajtu.
  */
  const CHOMACE = [
    [[0, 0, 1.2]],
    [[0, 0, 1.6], [-1.2, 1.1, 0.9]],
    [[0, 0, 2], [1.4, 1.2, 1.3]],
    [[-0.8, 0, 1.5], [0.9, -0.5, 1.3], [0.2, 1.3, 1.1]],
    [[-1, 0, 2.1], [1.2, -0.6, 1.7], [0.3, 1.6, 1.5]],
  ];
  const symbolyKvetu = () => {
    const sada = (pre, b) =>
      CHOMACE.map(
        (kr, i) =>
          `<g id="${pre}${i}">` +
          `<path d="${kr.map(([x, y, r]) => kruhD(x + 0.5, y + 0.6, r)).join("")}" fill="${b.stin}"/>` +
          `<path d="${kr.map(([x, y, r]) => kruhD(x, y, r)).join("")}" fill="${b.kvet}"/>` +
          `<path d="${kr.map(([x, y, r]) => kruhD(x - r * 0.3, y - r * 0.32, r * 0.5)).join("")}" fill="${b.svetle}"/>` +
          `<path d="${kr.map(([x, y, r]) => kruhD(x - r * 0.42, y - r * 0.46, r * 0.2)).join("")}" fill="#FFF3F6"/>` +
          `<path d="${kr.map(([x, y, r]) => kruhD(x + r * 0.15, y + r * 0.12, 0.34)).join("")}" fill="${b.tecky}"/>` +
          `</g>`,
      ).join("");
    const velky = (i) => `<g id="hz1-kvet${i}"><path d="${kvetD(0, 0, 2.4, i * 0.42)}" fill="#FAD0DC" stroke="#D86D8E" stroke-width="0.3"/><circle r="0.62" fill="#C64C70"/></g>`;
    return sada("hz1-kp", KVETY.predni) + sada("hz1-kz", KVETY.zadni) + velky(0) + velky(1) + velky(2);
  };
  const chomac = (pre, vel, x, y, r) => {
    const i = vel < 1.05 ? 0 : vel < 1.4 ? (r < 0.5 ? 1 : 3) : vel < 1.75 ? (r < 0.5 ? 2 : 3) : 4;
    return `<use href="#${pre}${i}" x="${Math.round(x * 10) / 10}" y="${Math.round(y * 10) / 10}"/>`;
  };
  /** Chomáče květů podél úsečky jako <use> předkreslených symbolů. */
  const chomace = (A, B, { sila = 1, seed = 1, zadni = false, hustota = 1, rozptyl = 1.5 } = {}) => {
    const r = rng(seed);
    const delka = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1;
    const n = Math.max(3, Math.round((delka / 2.6) * hustota));
    const nx = -(B[1] - A[1]) / delka, ny = (B[0] - A[0]) / delka;
    let s = "";
    for (let i = 0; i < n; i++) {
      const u = (i + 0.2 + r() * 0.6) / n;
      const strana = r() < 0.5 ? -1 : 1;
      const vel = (1.15 + r() * 0.95) * sila * (1 - u * 0.2);
      const off = (0.3 + r() * rozptyl) * strana;
      s += chomac(zadni ? "hz1-kz" : "hz1-kp", vel, lerp(A[0], B[0], u) + nx * off, lerp(A[1], B[1], u) + ny * off + (r() - 0.5) * 1.2, r());
    }
    return s;
  };
  /** Prut jako tři vnořené skupiny s data-u; index uzlu = 3 × pořadí prutu + článek. */
  const prutSvg = (p, i, uhly) => {
    let s = "";
    for (let c = 2; c >= 0; c--) {
      const tl = [p.w0, p.w0 * 0.68, p.w0 * 0.42][c];
      const vnitrek =
        `<path d="M${pt(p.J[c])} L${pt(p.J[c + 1])}" stroke="#6E4A48" stroke-width="${f(tl)}" stroke-linecap="round"/>` +
        chomace(p.J[c], p.J[c + 1], { sila: [1, 0.85, 0.62][c], seed: p.seed * 7 + c, zadni: p.zadni, hustota: [1.2, 1, 0.75][c] }) +
        (c === 0 && !p.zadni ? `<use href="#hz1-kvet${p.seed % 3}" x="${f(lerp(p.J[0][0], p.J[1][0], 0.45))}" y="${f(lerp(p.J[0][1], p.J[1][1], 0.45))}"/>` : "");
      s = `<g data-u="${i * 3 + c}" transform="rotate(${f(uhly[c])} ${f(p.J[c][0])} ${f(p.J[c][1])})">${vnitrek}${s}</g>`;
    }
    return s;
  };
  /** Kde je teď bod na článku c v místě u (0…1): natočení se skládají od kořene prutu. */
  const naPrutu = (p, uhly, c, u) => {
    let q = [lerp(p.J[c][0], p.J[c + 1][0], u), lerp(p.J[c][1], p.J[c + 1][1], u)];
    for (let k = c; k >= 0; k--) q = otoc(q, rad(uhly[k]), p.J[k]);
    return q;
  };

  /*
    Sedmihlásek uguisu sedí na levém prutu a houpe se s ním. Když zpívá
    hó-hokekjó, otevírá zobák a nafoukne hrdlo; když Hlínka kýchne, uletí
    a za chvíli se vrátí.
  */
  const PTACI_PRUT = PRUTY.reduce((b, p, i) => (!p.zadni && p.J[0][0] < 70 && (b < 0 || Math.abs(p.J[0][0] - 46) < Math.abs(PRUTY[b].J[0][0] - 46)) ? i : b), -1);
  const ptacek = ({ x, y, uhel = 0, zobak = 0, nafouk = 0, mava = null, smer = 1 }) => {
    let s = `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(uhel)}) scale(${smer} 1)">`;
    if (mava === null) {
      s += `<path d="M-2.6 -2.4 L-6.6 -0.6 L-6 0.3 L-2.2 -1.3 Z" fill="#6E7238" stroke="#3E3E22" stroke-width="0.3" stroke-linejoin="round"/>`;
      s += `<path d="M-0.5 -1.2 L-0.7 0.2 M0.7 -1.2 L0.7 0.2" stroke="#6E5A44" stroke-width="0.45" stroke-linecap="round"/>`;
    } else {
      const k = Math.sin(mava);
      s += `<path d="M-0.6 -3.6 Q-2.4 ${f(-6 - 4 * k)} -4.8 ${f(-4.2 - 5 * k)} Q-2.6 ${f(-3.6 - 1.4 * k)} 0.6 -3" fill="#6E7238" stroke="#3E3E22" stroke-width="0.3"/>`;
      s += `<path d="M-2.4 -3.2 L-6.2 -2.6 L-5.8 -1.8 L-2.2 -2.4 Z" fill="#6E7238"/>`;
    }
    s += `<ellipse cx="0" cy="-3.2" rx="3.4" ry="${f(2.4 + nafouk * 0.35)}" transform="rotate(-12 0 -3.2)" fill="#8E9150" stroke="#4A4A2A" stroke-width="0.35"/>`;
    s += `<ellipse cx="0.8" cy="${f(-2.5 - nafouk * 0.2)}" rx="${f(2.1 + nafouk * 0.4)}" ry="${f(1.3 + nafouk * 0.3)}" fill="#CDC89C"/>`;
    if (mava === null) s += `<path d="M-2.4 -4.3 Q0.4 -4.6 1.4 -3.4 Q-0.6 -2.6 -2.2 -2.8 Z" fill="#6E7238"/>`;
    s += `<circle cx="2.6" cy="-5.4" r="1.85" fill="#8E9150" stroke="#4A4A2A" stroke-width="0.3"/>`;
    s += `<path d="M1.8 -6.3 L3.9 -6" stroke="#E6E2C0" stroke-width="0.45" stroke-linecap="round"/>`;
    s += `<circle cx="3.15" cy="-5.45" r="0.42" fill="#1E1A14"/><circle cx="3.02" cy="-5.6" r="0.13" fill="#FFFFFF"/>`;
    s += zobak > 0.5
      ? `<path d="M4.2 -5.6 L5.8 -6.3 L4.3 -5.1 Z M4.2 -4.9 L5.5 -4.1 L4.3 -5.1 Z" fill="#4A3E2E"/>`
      : `<path d="M4.25 -5.5 L5.7 -5.1 L4.25 -4.75 Z" fill="#4A3E2E"/>`;
    return s + `</g>`;
  };
  const vrstvaPtacek = (st) => (st.ptacek ? ptacek(st.ptacek) : "");

  /* ——— Statické vrstvy ——— */
  const vrstvaZare = () => `<circle cx="${MESIC.x}" cy="${MESIC.y + 4}" r="98" fill="url(#hz1-zare)"/>`;
  const vrstvaMesic = () => {
    const r = rng(77);
    let prach = "";
    for (let i = 0; i < 80; i++) {
      const a = r() * Math.PI * 2, d = MESIC.r + 4 + Math.pow(r(), 1.6) * 36;
      prach += kruhD(MESIC.x + Math.cos(a) * d, MESIC.y + Math.sin(a) * d * 0.96, 0.25 + r() * 0.55);
    }
    return (
      `<path d="${prach}" fill="#D9AE4E" opacity="0.7"/>` +
      `<circle cx="${MESIC.x}" cy="${MESIC.y}" r="${MESIC.r}" fill="url(#hz1-mesic)"/>` +
      `<circle cx="${MESIC.x}" cy="${MESIC.y}" r="${MESIC.r}" fill="url(#hz1-sunago)" opacity="0.5"/>` +
      `<circle cx="${MESIC.x}" cy="${MESIC.y}" r="${MESIC.r - 0.6}" fill="none" stroke="#D6A23A" stroke-width="1"/>` +
      `<circle cx="${MESIC.x}" cy="${MESIC.y}" r="${MESIC.r + 3.4}" fill="none" stroke="#D6A23A" stroke-width="0.45" stroke-dasharray="5 1.6 1 1.6" opacity="0.8"/>`
    );
  };
  /** Koruna: hustý mrak květů nad hlavními větvemi a pár velkých kvítků navrchu. */
  const koruna = () => {
    const r = rng(8080);
    const podklad = [];
    let kvety = "", velke = "";
    for (const v of VETVE) {
      for (let i = 1; i < v.B.length; i++) {
        const [x, y] = v.B[i];
        podklad.push(kruhD(x + (r() - 0.5) * 3, y - 3.5, 4 + r() * 2.6));
        for (let k = 0; k < 2; k++) kvety += chomac("hz1-kp", 1.45 + r() * 0.9, x + (r() - 0.5) * 9, y - 0.5 - r() * 8.5, r());
        if (r() < 0.3) velke += `<use href="#hz1-kvet${Math.floor(r() * 3)}" x="${f(x + (r() - 0.5) * 8)}" y="${f(y - 3 - r() * 7)}"/>`;
      }
    }
    return `<path d="${podklad.join("")}" fill="#E48FA9" opacity="0.85"/>` + kvety + velke;
  };
  const vrstvaKmen = () => {
    const B = vzorkuj(KMEN, 10);
    let s = `<g filter="url(#hz1-tah)">`;
    for (const v of VETVE) {
      s += `<path d="${pasPoBodech(v.B, (u) => lerp(v.w[0], v.w[1], u) + 1)}" fill="#2E2628"/>`;
      s += `<path d="${pasPoBodech(v.B, (u) => lerp(v.w[0], v.w[1], u))}" fill="#4E4246"/>`;
      s += `<path d="${cara(v.B.slice(1, -3).map(([x, y]) => [x, y - lerp(v.w[0], v.w[1], 0.4) * 0.25]))}" stroke="#7E7072" stroke-width="0.8" fill="none" opacity="0.7"/>`;
    }
    s += `<path d="${NEBARI}" fill="url(#hz1-nebari)" stroke="#3A3034" stroke-width="0.7"/>`;
    s += `<path d="${pasPoBodech(B, sirkaKmene)}" fill="url(#hz1-kura)"/>`;
    s += `<path d="${cara(B.map(([x, y], i) => [x - sirkaKmene(i / (B.length - 1)) / 2, y]))} M${pt([B[0][0] + sirkaKmene(0) / 2, B[0][1]])} ${cara(B.map(([x, y], i) => [x + sirkaKmene(i / (B.length - 1)) / 2, y])).slice(1)}" stroke="#2A2224" stroke-width="1" fill="none"/>`;
    /* žebra náběhu: světlý hřbet a vedle něj tmavá rýha */
    s += `<path d="${ZEBRA.map((z) => hladka(z)).join(" ")}" stroke="#8C7E80" stroke-width="1.5" stroke-linecap="round" fill="none" opacity="0.8"/>`;
    s += `<path d="${ZEBRA.map((z) => hladka(z.map(([x, y]) => [x + (x < 90 ? 2.6 : -2.6), y + 1.8]))).join(" ")}" stroke="#241C1E" stroke-width="0.9" stroke-linecap="round" fill="none" opacity="0.75"/>`;
    /* sakura má na kůře vodorovné čárky (lenticely), starý kmen se kroutí */
    const r = rng(512);
    let ryhy = "", lenticely = "", lisejnik = "";
    for (let i = 0; i < 7; i++) {
      const x0 = 86.5 + r() * 7;
      ryhy += hladka([[x0, 128], [x0 + (r() - 0.5) * 4, 104 - i * 2], [x0 + (r() - 0.5) * 4, 82 - i], [x0 + (r() - 0.5) * 3, 56]]);
    }
    for (let i = 0; i < 26; i++) {
      const y = 56 + r() * 74;
      const x = 90 + (r() - 0.5) * 9;
      lenticely += `M${f(x - 1.3)} ${f(y)} h${f(2 + r() * 1.6)}`;
    }
    for (let i = 0; i < 16; i++) lisejnik += kruhD(84.5 + r() * 11, 58 + r() * 66, 0.45 + r() * 0.85);
    s += `<path d="${ryhy}" stroke="#2A2022" stroke-width="0.7" fill="none" opacity="0.7"/>`;
    s += `<path d="${lenticely}" stroke="#A89A98" stroke-width="0.6" stroke-linecap="round" opacity="0.8"/>`;
    s += `<path d="${lisejnik}" fill="#A3AE92" opacity="0.6"/>`;
    s += `</g>`;
    s += koruna();
    /* slaměný provaz shimenawa s třásněmi */
    const prov = "M83.2 66.4 Q90 71 97 65.8";
    s += `<path d="${prov}" stroke="#A88E5E" stroke-width="5.4" stroke-linecap="round" fill="none"/>`;
    s += `<path d="${prov}" stroke="#E6D3A2" stroke-width="3.9" stroke-linecap="round" fill="none"/>`;
    s += `<path d="${prov}" stroke="#B49C6A" stroke-width="3.9" stroke-dasharray="1.2 3.2" fill="none"/>`;
    s += `<path d="M88.6 70.4 l-0.4 4.4 M90 70.8 v5 M91.4 70.4 l0.4 4.4" stroke="#C9B282" stroke-width="0.7" stroke-linecap="round"/>`;
    return s;
  };
  const vrstvaZem = () => {
    const vrch = [], spod = [];
    for (let x = 8; x <= 172; x += 4) vrch.push([x, zemY(x)]);
    for (let x = 172; x >= 8; x -= 4) spod.push([x, spodekY(x)]);
    const r = rng(4114);
    let mech = "", mechSvetly = "", kaminky = "", fialky = "", lezi = "", korinky = "";
    for (let i = 0; i < 100; i++) {
      const x = 12 + r() * 156;
      const y = zemY(x) + 0.5 + r() * Math.max(1, spodekY(x) - zemY(x) - 6);
      mech += kruhD(x, y, 1 + r() * 1.8);
      if (r() < 0.5) mechSvetly += kruhD(x - 0.6, y - 0.8, 0.5 + r() * 0.7);
    }
    for (const [x, rx] of [[34, 4.2], [148, 3.6], [128, 2.4], [58, 2.6]]) {
      const y = zemY(x) + 2.4;
      kaminky += `<path d="${hrouda(x, y, rx, rx * 0.62, x * 3, { bodu: 10, kolisani: 0.1 })}" fill="#8C8A7E" stroke="#5E5C52" stroke-width="0.5"/><path d="M${f(x - rx * 0.5)} ${f(y - rx * 0.3)} q${f(rx * 0.4)} ${f(-rx * 0.25)} ${f(rx * 0.8)} 0" stroke="#C8C6B8" stroke-width="0.5" fill="none"/>`;
    }
    /* fialky sumire a hvězdičky ptačince v mechu */
    for (const [x, dy] of [[22, 3], [42, 5], [140, 4], [160, 3], [116, 6], [70, 7]]) {
      const y = zemY(x) + dy;
      fialky += `<path d="M${x} ${y + 3} q-0.6 -2 0.2 -3.4" stroke="#5E6E3E" stroke-width="0.5" fill="none"/>`;
      for (let k = 0; k < 5; k++) {
        const a = rad(k * 72 - 90);
        const px = x + Math.cos(a) * 1.1, py = y + Math.sin(a) * 1.1;
        fialky += `<ellipse cx="${f(px)}" cy="${f(py)}" rx="0.95" ry="0.7" transform="rotate(${k * 72 - 90} ${f(px)} ${f(py)})" fill="${x > 100 ? "#8A64B2" : "#7E5BA6"}"/>`;
      }
      fialky += `<circle cx="${x}" cy="${y}" r="0.45" fill="#F2D27A"/>`;
    }
    for (const [x, dy] of [[30, 7], [64, 3], [104, 8], [150, 7]]) fialky += `<path d="${kvetD(x, zemY(x) + dy, 1.2, 0.3)}" fill="#FFFFFF" opacity="0.9"/>`;
    /* pár lístků už leží od rána */
    for (let i = 0; i < 26; i++) {
      const x = 14 + r() * 152, y = zemY(x) + 0.5 + r() * 9;
      lezi += `<use href="#hz1-listek" transform="translate(${f(x)} ${f(y)}) rotate(${f(r() * 360)}) scale(${f(0.7 + r() * 0.4)} ${f(0.45 + r() * 0.3)})" fill="${r() < 0.5 ? "#F4B9C8" : "#F9D7DF"}"/>`;
    }
    /* kořínky visí ze spodku hroudy */
    for (const x of [30, 52, 76, 108, 130, 150]) {
      const y = spodekY(x) - 0.6;
      korinky += `M${x} ${f(y)} q${f(r() * 2 - 1)} ${f(2 + r() * 2)} ${f(r() * 3 - 1.5)} ${f(4 + r() * 3)}`;
    }
    const lem = vrch.map((p, i) => [p[0], p[1] + lerp(1.2, 4.6, Math.sin((Math.PI * i) / (vrch.length - 1))) + Math.sin(i * 1.7) * 1.2]);
    return (
      `<path d="${cara(vrch)} L${spod.map(pt).join(" L")} Z" fill="url(#hz1-hlina)"/>` +
      `<path d="${korinky}" stroke="#4E3E30" stroke-width="0.6" stroke-linecap="round" fill="none"/>` +
      `<path d="${cara(lem)} L${vrch.slice().reverse().map(pt).join(" L")} Z" fill="url(#hz1-mech)"/>` +
      `<path d="${hladka(vrch)}" stroke="#4E5A36" stroke-width="0.9" fill="none"/>` +
      `<path d="${mech}" fill="#5D6B3E" opacity="0.55"/><path d="${mechSvetly}" fill="#A7B27A" opacity="0.7"/>` +
      kaminky + fialky + lezi
    );
  };
  const vrstvaKoreny = () => {
    let s = `<g filter="url(#hz1-tah)">`;
    for (const k of KORENY) {
      s += `<path d="${pasPoBodech(k.B, (u) => lerp(k.w[0], k.w[1], u) + 1.2)}" fill="#2E2628"/>`;
      s += `<path d="${pasPoBodech(k.B, (u) => lerp(k.w[0], k.w[1], u))}" fill="url(#hz1-koren)"/>`;
    }
    s += `</g>`;
    const r = rng(31);
    let mech = "", svetly = "", stebla = "";
    for (const k of KORENY.slice(0, 2)) {
      for (let i = 3; i < k.B.length - 4; i += 2) {
        const [x, y] = k.B[i];
        mech += kruhD(x + (r() - 0.5) * 2, y - 2.2 - r(), 0.8 + r() * 1.1);
      }
    }
    /* mechový límec přes spodek náběhu: kořeny se noří do země, nekoukají jako nožičky */
    for (const strana of [-1, 1]) {
      for (let x = 26; x < 72; x += 2.2) {
        const xx = strana < 0 ? x : 180 - x;
        const y = zemY(xx) - 1.4 - r() * 1.6;
        mech += kruhD(xx, y, 1.3 + r() * 1.5);
        if (r() < 0.6) svetly += kruhD(xx - 0.5, y - 0.9, 0.6 + r() * 0.6);
        if (r() < 0.5) stebla += `M${f(xx)} ${f(y)} l${f((r() - 0.5) * 1.6)} ${f(-1.8 - r() * 2)}`;
      }
    }
    return s + `<path d="${mech}" fill="#6E7C48"/><path d="${svetly}" fill="#A7B27A" opacity="0.8"/><path d="${stebla}" stroke="#55623A" stroke-width="0.5" stroke-linecap="round"/>`;
  };

  /* ——— Hlínka ——— */
  const vrstvaVyhonek = (st) => vPostave(hlVyhonek({ kyv: st.vyhonek }));
  const vrstvaTelo = () => vPostave(`<g filter="url(#hz1-tah)">${hlTelo("hz1")}${hlNohy()}</g>`);
  const vrstvaTvar = (st) => vPostave(hlTvar("hz1", { oci: st.oci, usta: st.usta, mrk: st.mrk, dx: st.pohled[0], dy: st.pohled[1], tvare: st.tvare }));
  const vrstvaNaHlince = (st) =>
    st.naHlince.map((l) => `<use href="#hz1-listek" transform="translate(${f(STRED[0] + l.x)} ${f(STRED[1] + l.y)}) rotate(${f(l.rot)}) scale(${f(l.vel)} ${f(l.vel * 0.7)})" fill="${l.barva}"/>`).join("") +
    (st.nosni ? `<use href="#hz1-listek" transform="translate(${f(st.nosni[0])} ${f(st.nosni[1])}) rotate(${f(st.nosni[2])}) scale(1.3 1)" fill="#F7C4D1" stroke="#E08AA2" stroke-width="0.2"/>` : "");

  /* ——— Živé vrstvy ——— */
  const vrstvaPruty = (zadni) => (st) => PRUTY.map((p, i) => (p.zadni === zadni ? prutSvg(p, i, st.uhly[i]) : "")).join("");
  const uzlyPrutu = (st) => {
    const out = [];
    PRUTY.forEach((p, i) => {
      for (let c = 0; c < 3; c++) out[i * 3 + c] = { transform: `rotate(${f(st.uhly[i][c])} ${f(p.J[c][0])} ${f(p.J[c][1])})` };
    });
    return out;
  };
  const SHIDE_D = "M-2 0 h2.6 v3 h1.6 v3 h-1.6 v3 h1.6 v3 h-2.6 v-3 h-1.6 v-3 h1.6 v-3 h-1.6 Z";
  const SHIDE = [[85.2, 68.6], [95.2, 68]];
  const vrstvaShide = (st) => SHIDE.map(([x, y], i) => `<path data-u="${i}" d="${SHIDE_D}" transform="translate(${x} ${y}) rotate(${f(st.shide[i])})" fill="#FBF7EE" stroke="#8A7A69" stroke-width="0.45" stroke-linejoin="round"/>`).join("");
  const uzlyShide = (st) => SHIDE.map(([x, y], i) => ({ transform: `translate(${x} ${y}) rotate(${f(st.shide[i])})` }));
  const vrstvaListky = (st) =>
    st.naZemi.map((l) => `<use href="#hz1-listek" transform="translate(${f(l.x)} ${f(l.y)}) rotate(${f(l.rot)}) scale(${f(l.vel)} ${f(l.vel * 0.55)})" fill="${l.barva}" opacity="${f(l.op)}"/>`).join("") +
    st.listky.map((l) => `<use href="#hz1-listek" transform="translate(${f(l.x)} ${f(l.y)}) rotate(${f(l.rot)}) scale(${f(l.vel * Math.cos(l.flip))} ${f(l.vel * 0.72)})" fill="${l.barva}"/>`).join("");
  const vrstvaSvetla = (st) => st.svetla.map(([x, y, op]) => svetylko("hz1", x, y, 1.8, op)).join("");
  const vrstvaZzz = (st) => (st.spi > 0.02 ? zzz(st.t, STRED[0] + 24, STRED[1] - 30, { barva: "#5E5045", meritko: 0.75, sila: st.spi }) : "");

  const defs = () =>
    hlDefs("hz1", { tvare: "#D8866A" }) +
    symbolyKvetu() +
    `<path id="hz1-listek" d="${LISTEK}"/>` +
    `<radialGradient id="hz1-mesic" cx="0.42" cy="0.38" r="0.62"><stop offset="0" stop-color="#FFF8E2"/><stop offset="0.6" stop-color="#F8E7B8"/><stop offset="0.92" stop-color="#EFD08A"/><stop offset="1" stop-color="#E4BC68"/></radialGradient>` +
    `<radialGradient id="hz1-zare"><stop offset="0" stop-color="#FCE6C0" stop-opacity="0.75"/><stop offset="0.5" stop-color="#F6C9C0" stop-opacity="0.28"/><stop offset="1" stop-color="#F6C9C0" stop-opacity="0"/></radialGradient>` +
    `<pattern id="hz1-sunago" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(18)"><circle cx="1" cy="1.4" r="0.35" fill="#E2B656"/><circle cx="4" cy="4.2" r="0.22" fill="#E2B656"/><circle cx="4.6" cy="0.8" r="0.15" fill="#FFFFFF"/></pattern>` +
    `<linearGradient id="hz1-kura" gradientUnits="userSpaceOnUse" x1="82" y1="0" x2="99" y2="0"><stop offset="0" stop-color="#3A3034"/><stop offset="0.32" stop-color="#6E6062"/><stop offset="0.58" stop-color="#55474A"/><stop offset="1" stop-color="#2E2628"/></linearGradient>` +
    `<linearGradient id="hz1-nebari" gradientUnits="userSpaceOnUse" x1="28" y1="0" x2="152" y2="0"><stop offset="0" stop-color="#4A3E42"/><stop offset="0.3" stop-color="#6A5C5E"/><stop offset="0.45" stop-color="#7A6C6C"/><stop offset="0.62" stop-color="#605254"/><stop offset="1" stop-color="#3E3436"/></linearGradient>` +
    `<linearGradient id="hz1-koren" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6A5C5E"/><stop offset="1" stop-color="#3A3034"/></linearGradient>` +
    `<linearGradient id="hz1-mech" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8E9A5A"/><stop offset="1" stop-color="#5E6A3C"/></linearGradient>` +
    `<linearGradient id="hz1-hlina" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7A604A"/><stop offset="0.6" stop-color="#5E4836"/><stop offset="1" stop-color="#3E3026"/></linearGradient>` +
    `<filter id="hz1-tah" x="-8%" y="-8%" width="116%" height="116%" color-interpolation-filters="sRGB">` +
    `<feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="4" result="vlna"/>` +
    `<feDisplacementMap in="SourceGraphic" in2="vlna" scale="2.2" xChannelSelector="R" yChannelSelector="G" result="tah"/>` +
    `<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="11" result="zrno"/>` +
    `<feColorMatrix in="zrno" type="matrix" values="0 0 0 0 0.23  0 0 0 0 0.18  0 0 0 0 0.16  0.6 0 0 0 -0.26" result="skvrny"/>` +
    `<feComposite in="skvrny" in2="tah" operator="in" result="zrnoVTvaru"/>` +
    `<feMerge><feMergeNode in="tah"/><feMergeNode in="zrnoVTvaru"/></feMerge></filter>`;

  /* ——— Simulace ——— */
  const BARVY_LISTKU = ["#F4B3C4", "#F8CBD6", "#EE9DB3", "#FBE0E6"];
  const novaDynamika = () => ({
    uhly: PRUTY.map(() => [0, 0, 0]),
    omegy: PRUTY.map(() => [0, 0, 0]),
    vitr: 0, naraz: 0, listky: [], naZemi: [], naHlince: [], akum: 0, nahoda: rng(1937), zvuk: [],
    kych: -10, smich: -10, lechtani: 0, shide: [0, 0], shideV: [0, 0], vyhonek: 0, vyhonekV: 0,
    pohled: [0, 0], ptak: 9, zpev: -10, odlet: -20, nosni: null, svetla: [[40, 120, 0], [142, 112, 0]], svetlaV: [[0, 0], [0, 0]],
  });
  const novyListek = (dyn, R, x, y, vybuch = 0) => {
    dyn.listky.push({
      x, y, vx: (R() - 0.5) * 8 + vybuch * (x - 90) * 0.5, vy: 2 + R() * 4 - vybuch * 8,
      rot: R() * 360, rotV: (R() - 0.5) * 260, flip: R() * 6.28, flipV: 3 + R() * 6, vel: 0.85 + R() * 0.5,
      barva: BARVY_LISTKU[Math.floor(R() * BARVY_LISTKU.length)], fz: R() * 6.28,
    });
  };
  const krok = (dyn, t, dt, vstup) => {
    const R = dyn.nahoda;
    /* vítr: bez myši jen dýchá, myš fouká od sebe, mávnutí udělá náraz */
    let cil = 0.22 * Math.sin(t * 0.43) + 0.1 * Math.sin(t * 1.27 + 1);
    let pohled = [0, 0];
    const mys = vstup.mys;
    if (mys) {
      const dx = mys.x - 90, dy = mys.y - 100;
      cil = -clamp(dx / 60, -1, 1) * 1.1 * clamp(1.6 - Math.hypot(dx, dy) / 130, 0.3, 1);
      pohled = [clamp((mys.x - STRED[0]) / 30, -1, 1) * 2, clamp((mys.y - STRED[1]) / 30, -1, 1) * 1.6];
    }
    dyn.vitr += (cil - dyn.vitr) * (1 - Math.exp(-dt / 0.4));
    const mavnuti = clamp(((vstup.rychlost || 0) - 60) / 260);
    dyn.naraz = Math.max(dyn.naraz * Math.exp(-dt / 0.5), mavnuti);
    /* kýchnutí: lístek padá na nos, nádech, pak výbuch do všech stran */
    if (vstup.kliky && vstup.kliky.length) {
      vstup.kliky.length = 0;
      if (t - dyn.kych > 3.6) {
        dyn.kych = t;
        dyn.nosni = { x: NOS[0] - 6, y: NOS[1] - 52, rot: 30 };
      }
    }
    const u = t - dyn.kych;
    if (dyn.nosni) {
      if (u < 1.05) {
        const k = easeOut(u / 1.05);
        dyn.nosni.x = lerp(NOS[0] - 6, NOS[0] + 0.6, k) + Math.sin(u * 7) * 3 * (1 - k);
        dyn.nosni.y = lerp(NOS[1] - 52, NOS[1] - 1.4, k);
        dyn.nosni.rot = 30 + Math.sin(u * 6) * 50 * (1 - k);
      } else if (u < 1.62) dyn.nosni.rot = 10 + Math.sin(u * 30) * 6;
    }
    if (u > 1.0 && u - dt <= 1.0) dyn.zvuk.push({ druh: "nadech", sila: 0.7 });
    if (u > 1.3 && u - dt <= 1.3) dyn.zvuk.push({ druh: "nadech", sila: 1 });
    if (u > 1.62 && u - dt <= 1.62) {
      dyn.zvuk.push({ druh: "kych", sila: 1 });
      dyn.zvuk.push({ druh: "poryv", sila: 1, za: 0.05 });
      dyn.nosni = null;
      dyn.naraz = 1.4;
      if (t - dyn.odlet > 9) dyn.odlet = t;
      /* všechny pruty dostanou ránu od středu ven */
      PRUTY.forEach((p, i) => {
        const smer = p.J[0][0] < 90 ? 1 : -1;
        const blizko = 1 - clamp(Math.abs(p.J[0][0] - 90) / 110);
        for (let c = 0; c < 3; c++) dyn.omegy[i][c] += smer * (28 + 18 * c) * (0.6 + 0.6 * blizko);
      });
      for (let i = 0; i < 2; i++) dyn.shideV[i] += -120 + R() * 40;
      dyn.vyhonekV += (R() < 0.5 ? -1 : 1) * 260;
      for (const l of dyn.naHlince) novyListek(dyn, R, STRED[0] + l.x, STRED[1] + l.y, 1.2);
      dyn.naHlince = [];
      for (let i = 0; i < 70; i++) {
        const k = Math.floor(R() * PRUTY.length);
        const [x, y] = naPrutu(PRUTY[k], dyn.uhly[k], Math.floor(R() * 3), R());
        novyListek(dyn, R, x, y, 0.6);
      }
      for (const s of dyn.svetlaV) {
        s[0] += (R() - 0.5) * 120;
        s[1] -= 40 + R() * 40;
      }
    }
    /* lechtání: rychlé tahy myší přes Hlínku */
    const naNi = mys && Math.hypot(mys.x - STRED[0], mys.y - STRED[1]) < R_TELA + 3;
    dyn.lechtani = Math.max(0, dyn.lechtani + (naNi && (vstup.rychlost || 0) > 90 ? dt * 2.2 : -dt * 0.9));
    if (dyn.lechtani > 0.55 && t - dyn.smich > 1.6 && u > 3) {
      dyn.smich = t;
      dyn.lechtani = 0.2;
      dyn.zvuk.push({ druh: "chichot", sila: 1 });
    }
    /* pruty: tlumené kyvadlo na každém kloubu, dolní články se ohýbají víc */
    const W = dyn.vitr + dyn.naraz * Math.sin(t * 9.3) * 0.9 + dyn.naraz * 0.6 * Math.sign(dyn.vitr || 1);
    PRUTY.forEach((p, i) => {
      const fq = 0.55 + 18 / p.L;
      const K = (2 * Math.PI * fq) ** 2, D = 2 * 0.22 * Math.sqrt(K);
      const mistni = W + 0.12 * Math.sin(t * (0.9 + fq * 0.5) + p.fz) * (1 + dyn.naraz);
      for (let c = 0; c < 3; c++) {
        const cil = -mistni * [3.2, 4.4, 5.6][c];
        [dyn.uhly[i][c], dyn.omegy[i][c]] = pruzina(dyn.uhly[i][c], dyn.omegy[i][c], cil, dt, K * [1, 1.4, 1.9][c], D);
      }
    });
    for (let i = 0; i < 2; i++) [dyn.shide[i], dyn.shideV[i]] = pruzina(dyn.shide[i], dyn.shideV[i], -W * 26 + Math.sin(t * 2.1 + i * 2) * 4, dt, 60, 5);
    [dyn.vyhonek, dyn.vyhonekV] = pruzina(dyn.vyhonek, dyn.vyhonekV, -W * 9 + Math.sin(t * 0.8) * 2, dt, 40, 4);
    /* lístky se trhají podle větru */
    dyn.akum += dt * (0.9 + 34 * dyn.naraz + 2.4 * Math.abs(dyn.vitr));
    while (dyn.akum >= 1) {
      dyn.akum -= 1;
      const i = Math.floor(R() * PRUTY.length);
      const [x, y] = naPrutu(PRUTY[i], dyn.uhly[i], Math.floor(R() * 3), R());
      novyListek(dyn, R, x, y);
    }
    const zbyle = [];
    for (const l of dyn.listky) {
      const vzduch = W * 28 + Math.sin(t * 1.7 + l.fz) * 6;
      l.vx += (vzduch - l.vx) * dt * 1.6;
      l.vy += (9 + Math.sin(l.flip) * 4 - l.vy) * dt * 1.8;
      l.x += l.vx * dt;
      l.y += l.vy * dt;
      l.rot += l.rotV * dt;
      l.flip += l.flipV * dt;
      const dh = Math.hypot(l.x - STRED[0], l.y - STRED[1]);
      if (dh < R_TELA - 0.5 && l.y < STRED[1] - 6 && dyn.naHlince.length < 14 && u > 2) {
        dyn.naHlince.push({ x: l.x - STRED[0], y: l.y - STRED[1], rot: l.rot, vel: l.vel, barva: l.barva });
        continue;
      }
      if (l.y >= zemY(l.x) + 1.5) {
        dyn.naZemi.push({ x: l.x, y: l.y + R() * 3, rot: l.rot, vel: l.vel, barva: l.barva, vek: 0, op: 1 });
        continue;
      }
      if (l.x > -20 && l.x < 200 && l.y < 200) zbyle.push(l);
    }
    dyn.listky = zbyle;
    for (const l of dyn.naZemi) {
      l.vek += dt;
      l.op = 1 - clamp((l.vek - 14) / 6);
    }
    dyn.naZemi = dyn.naZemi.filter((l) => l.op > 0.01).slice(-90);
    /* světýlka plavou líně kolem Hlínky, po kýchnutí je to odfoukne */
    dyn.svetla.forEach((s, i) => {
      const cx = i === 0 ? 38 + 10 * Math.sin(t * 0.31) : 144 + 9 * Math.sin(t * 0.27 + 1);
      const cy = i === 0 ? 118 + 8 * Math.sin(t * 0.47 + 2) : 108 + 10 * Math.sin(t * 0.41);
      const v = dyn.svetlaV[i];
      [s[0], v[0]] = pruzina(s[0], v[0], cx, dt, 2.2, 1.6);
      [s[1], v[1]] = pruzina(s[1], v[1], cy, dt, 2.2, 1.6);
      s[2] = clamp(0.55 + 0.45 * Math.sin(t * (1.1 + i * 0.3) + i * 2));
    });
    dyn.pohled = dyn.pohled.map((q, i) => q + (pohled[i] - q) * (1 - Math.exp(-dt / 0.2)));
    /* sedmihlásek: hó-hokekjó, občas */
    dyn.ptak -= dt;
    if (dyn.ptak <= 0) {
      dyn.ptak = 16 + R() * 14;
      if (t - dyn.odlet > 9) {
        dyn.zpev = t;
        dyn.zvuk.push({ druh: "uguisu", sila: 0.9, pan: -0.55 });
      }
    }
  };
  const stav = (t, vstup = {}, dyn) => {
    const d = dyn || novaDynamika();
    const u = t - d.kych;
    const us = t - d.smich;
    let oci = "spi", usta = "usmev", tvare = 0.42, spi = 1;
    if (u >= 0 && u < 1.0) oci = u > 0.7 ? "tvrde" : "spi";
    else if (u >= 1.0 && u < 1.62) [oci, usta, tvare] = ["kych", "vlnka", 0.75];
    else if (u >= 1.62 && u < 1.95) [oci, usta, spi] = ["kych", "kych", 0];
    else if (u >= 1.95 && u < 3.2) [oci, usta, spi] = ["siroke", "o", 0];
    else if (u >= 3.2 && u < 4.6) [oci, spi] = ["ospale", clamp((u - 3.2) / 1.4)];
    if (us >= 0 && us < 1.5) [oci, usta, tvare, spi] = ["smich", "ach", 0.85, 0];
    if (vstup.mys && Math.hypot(vstup.mys.x - STRED[0], vstup.mys.y - STRED[1]) < R_TELA + 8) tvare = Math.max(tvare, 0.7);
    const otevrena = oci === "siroke" || oci === "otevrene";
    /* sedmihlásek: na bidýlku na prutu, nebo v letu pryč a zpátky */
    let pt = null;
    if (PTACI_PRUT >= 0) {
      const p = PRUTY[PTACI_PRUT], uh = d.uhly[PTACI_PRUT];
      const bid = naPrutu(p, uh, 1, 0.22);
      const sklon = (uh[0] + uh[1]) * 0.5;
      const uz = t - d.zpev, uo = t - d.odlet;
      const zobak = (uz > 0 && uz < 0.95) || (uz > 1.05 && uz < 1.62 && Math.sin(uz * 40) > -0.3) ? 1 : 0;
      const nafouk = uz > 0 && uz < 1.65 ? Math.sin(Math.PI * clamp(uz / 1.65)) : 0;
      const PRYC = [-14, 18];
      if (uo >= 0 && uo < 1.4) {
        const k = easeOut(uo / 1.4);
        pt = { x: lerp(bid[0], PRYC[0], k), y: lerp(bid[1], PRYC[1], k) - Math.sin(Math.PI * k) * 14, uhel: -10, mava: t * 28, smer: -1 };
      } else if (uo >= 7.4 && uo < 8.8) {
        const k = smooth((uo - 7.4) / 1.4);
        pt = { x: lerp(PRYC[0], bid[0], k), y: lerp(PRYC[1], bid[1], k) - Math.sin(Math.PI * k) * 10, uhel: 0, mava: k < 0.9 ? t * 26 : null, smer: 1 };
      } else if (uo < 0 || uo >= 8.8) pt = { x: bid[0], y: bid[1], uhel: sklon, zobak, nafouk, smer: 1 };
    }
    return {
      t, uhly: d.uhly, shide: d.shide, vyhonek: d.vyhonek, listky: d.listky, naZemi: d.naZemi, naHlince: d.naHlince, ptacek: pt,
      nosni: d.nosni ? [d.nosni.x, d.nosni.y, d.nosni.rot] : null, oci, usta, tvare, spi,
      mrk: otevrena ? mrkani(t, [0.6, 1.9], 2.6) : 0, pohled: d.pohled, svetla: d.svetla, kych: u, smich: us,
      vitr: d.vitr, naraz: d.naraz,
    };
  };
  const snimek = (st) => Math.floor(st.t * 30);
  /* dech, nádech před kýchnutím, odraz po něm a třes při smíchu */
  const pohybHlinky = (st) => {
    const dech = Math.sin((st.t / 4.4) * Math.PI * 2);
    let sy = 1 + 0.02 * dech, sx = 1 - 0.01 * dech, r = 0;
    const u = st.kych;
    if (u > 1.0 && u < 1.62) {
      const k = smooth((u - 1.0) / 0.6);
      sy += 0.07 * k;
      sx -= 0.035 * k;
    } else if (u >= 1.62 && u < 3) {
      const w = u - 1.62;
      sy += -0.16 * Math.exp(-w / 0.22) * Math.cos(w * 26);
      sx += 0.12 * Math.exp(-w / 0.22) * Math.cos(w * 26);
    }
    if (st.smich >= 0 && st.smich < 1.5) {
      const e = Math.sin(Math.PI * (st.smich / 1.5));
      r = 3.2 * e * Math.sin(st.t * 31);
      sy += 0.025 * e * Math.sin(st.t * 23);
    }
    return { ox: FIG.x, oy: FIG.y, sx, sy, r };
  };

  return {
    id: "v1",
    viewBox: "0 0 180 180",
    defs,
    novaDynamika,
    krok,
    stav,
    sum: (st) => ({ mira: clamp(0.14 + 0.45 * Math.abs(st.vitr) + 0.9 * st.naraz, 0, 1.2), f: 1100 + 900 * clamp(st.naraz), q: 0.5, typ: "bandpass" }),
    klidne: { t: 6.2 },
    vrstvy: [
      { id: "zare", kresli: vrstvaZare, pruhlednost: (st) => f(clamp(0.75 + 0.25 * st.naraz)) },
      { id: "mesic", kresli: vrstvaMesic, tezka: true },
      { id: "pruty-zadni", kresli: vrstvaPruty(true), uzly: uzlyPrutu },
      { id: "kmen", kresli: vrstvaKmen, tezka: true },
      { id: "shide", kresli: vrstvaShide, uzly: uzlyShide },
      { id: "zem", kresli: vrstvaZem, tezka: true },
      { id: "koreny", kresli: vrstvaKoreny, tezka: true },
      { id: "vyhonek", kresli: vrstvaVyhonek, klic: (st) => f(st.vyhonek), pohyb: pohybHlinky },
      { id: "telo", kresli: vrstvaTelo, tezka: true, pohyb: pohybHlinky },
      { id: "tvar", kresli: vrstvaTvar, klic: (st) => `${st.oci},${st.usta},${f(st.mrk)},${f(st.pohled[0])},${f(st.pohled[1])},${f(st.tvare)}`, pohyb: pohybHlinky },
      { id: "na-hlince", kresli: vrstvaNaHlince, klic: (st) => `${st.naHlince.length},${st.nosni ? st.nosni.map(f).join() : ""}`, pohyb: pohybHlinky },
      { id: "pruty", kresli: vrstvaPruty(false), uzly: uzlyPrutu },
      { id: "ptacek", kresli: vrstvaPtacek, klic: (st) => (st.ptacek ? `${f(st.ptacek.x)},${f(st.ptacek.y)},${f(st.ptacek.uhel)},${st.ptacek.zobak || 0},${f(st.ptacek.nafouk || 0)},${st.ptacek.mava == null ? "" : Math.floor(st.t * 30)}` : "") },
      { id: "listky", kresli: vrstvaListky, klic: snimek },
      { id: "zzz", kresli: vrstvaZzz, klic: (st) => Math.floor(st.t * 15) },
      { id: "svetla", kresli: vrstvaSvetla, klic: (st) => Math.floor(st.t * 20) },
    ],
  };
})();

/* ═══════════════════════════════════════════════════════════════════
 * 2 — DRAK NAD FUDŽI
 * Rytina ukiyo-e podle posledního Hokusaiova obrazu Drak nad Fudži
 * (富士越龍図, 1849), v barvách Rudé Fudži (Gaifú kaisei). „Možná budu
 * miska. Možná drak.“ Tady drak: Hlínka spí na břehu jezera Kawaguči,
 * probudí se, vytáhne se z hroudy jako hliněný váleček — z takových
 * válečků (himo) se stavějí nádoby — a letí za perlou. Perla je její
 * světýlko: draci na obrazech se za perlou honí odjakživa.
 *
 * Objem hlíny se cestou nemění: hlava se zmenší a čím delší je drak, tím
 * je tenčí. Na těle má otisky šňůry jako keramika Džómon (縄文, „šňůrový
 * vzor“), nejstarší hrnčířství v Japonsku, z výhonku jsou parohy a z nožek
 * tři drápy, jak je mají japonští draci. Po pěti chycených perlách nebo
 * po chvíli letu se unaví, sletí na břeh a nasouká se zpátky do hroudy.
 *
 * V jezeře se zrcadlí Fudži celá zasněžená, i když nahoře sněhu moc není
 * — Hokusai to v Kóšú Misaka suimen namaloval stejně „špatně“. V kartuši
 * stojí 富士越土竜: hliněný drak nad Fudži, jenže 土竜 se japonsky čte
 * mogura — krtek.
 *
 * Perla jde za myší, bez myši si lítá sama. Kliknutí Hlínku probudí, za
 * letu pošle perlu tam, kam se kliklo. Když se nic neděje, vzbudí se sama.
 * ═══════════════════════════════════════════════════════════════════ */
const V2 = (() => {
  const OBR = { x0: 12, y0: 12, x1: 168, y1: 168 };
  const HLADINA = 121;
  const LUZKO = [58, 143];
  const R_HROUDA = 48 * 0.32;
  const R_HLAVA = 10;
  const N = 44, DELKA = 150, SEG = DELKA / (N - 1);
  /* tloušťka podél těla: krk, břicho, ocas do špičky */
  const profil = (s) => (s < 0.05 ? lerp(0.62, 0.8, s / 0.05) : s < 0.24 ? lerp(0.8, 1, (s - 0.05) / 0.19) : lerp(1, 0.16, Math.pow((s - 0.24) / 0.76, 1.25)));
  const KUM = [0];
  for (let i = 1; i <= 400; i++) KUM.push(KUM[i - 1] + profil((i - 0.5) / 400) ** 2 / 400);
  const kumW2 = (s) => KUM[Math.round(clamp(s) * 400)];
  const kouleV = (r) => (4 / 3) * Math.PI * r ** 3;
  const kouleR = (V) => Math.cbrt((3 * Math.max(0, V)) / (4 * Math.PI));
  const OBJEM = kouleV(R_HROUDA);
  const D0 = 2 * Math.sqrt((OBJEM - kouleV(R_HLAVA)) / (Math.PI * DELKA * KUM[400]));
  const objemValecku = (l) => Math.PI * (D0 / 2) ** 2 * DELKA * kumW2(l / DELKA);

  /* ——— Rytina: papír, nebe, Fudži, jezero, břeh ——— */
  const vOrezu = (s) => `<g clip-path="url(#hz2-obraz)">${s}</g>`;
  const FUDZI_L = [[85, 47], [82, 52], [76, 60], [66, 72], [50, 88], [30, 104], [4, 120]];
  const VRCHOL = [[85, 47], [88, 45.2], [91.2, 46.4], [95, 44.4], [99, 46], [103, 44.8], [107, 47]];
  const FUDZI = `M${pt(VRCHOL[0])} L${VRCHOL.slice(1).map(pt).join(" L")} ${hladka(FUDZI_L.map(([x, y]) => [192 - x, y])).replace(/^M/, "L")} L188 130 L4 130 ${hladka(FUDZI_L.slice().reverse()).replace(/^M/, "L")} Z`;
  const naSvahu = (y, prava) => {
    const B = vzorkuj(FUDZI_L, 10);
    let i = 1;
    while (i < B.length - 1 && B[i][1] < y) i++;
    const a = B[i - 1], b = B[i];
    const x = lerp(a[0], b[0], (y - a[1]) / (b[1] - a[1] || 1));
    return prava ? 192 - x : x;
  };
  const snih = () => {
    const yl = 60, xl = naSvahu(yl, false), xp = naSvahu(59, true);
    const prsty = [[xl, yl], [77.6, 66], [79.6, 61.4], [82.2, 70.4], [84.8, 62], [87.6, 72], [90.4, 62.6], [93.2, 68.6], [96, 61.4], [99, 71.4], [102, 62.4], [104.8, 67.4], [107.6, 60.6], [110.4, 64.6], [xp, 59]];
    const levy = vzorkuj(FUDZI_L, 10).filter(([, y]) => y <= yl);
    const pravy = vzorkuj(FUDZI_L, 10).filter(([, y]) => y <= 59).map(([x, y]) => [192 - x, y]);
    return `M${pt(VRCHOL[0])} L${VRCHOL.slice(1).map(pt).join(" L")} L${pravy.map(pt).join(" L")} L${prsty.slice().reverse().map(pt).join(" L")} L${levy.slice().reverse().map(pt).join(" L")} Z`;
  };
  /** Stylizovaný mrak japonských maleb: rovný spodek, navrchu oblé hrbolky, konce stočené. */
  const mrak = (x, y, w, seed, { barva = "#F6F1E6", obrys = "#3A3A4A", stin = "#B9C4D2" } = {}) => {
    const r = rng(seed);
    const n = Math.max(3, Math.round(w / 9));
    let d = `M${f(x)} ${f(y)}`;
    let cx = x;
    const krok = w / n;
    for (let i = 0; i < n; i++) {
      const h = (0.55 + r() * 0.35) * krok;
      d += ` C${f(cx + krok * 0.05)} ${f(y - h)} ${f(cx + krok * 0.95)} ${f(y - h)} ${f(cx + krok)} ${f(y)}`;
      cx += krok;
    }
    d += ` Q${f(x + w + 3)} ${f(y + 2.4)} ${f(x + w - 1)} ${f(y + 3.4)} L${f(x + 1)} ${f(y + 3.4)} Q${f(x - 3)} ${f(y + 2.4)} ${f(x)} ${f(y)} Z`;
    const zavitek = (zx, zy, s) => `M${f(zx)} ${f(zy)} a${f(1.6 * s)} ${f(1.6 * s)} 0 1 1 ${f(2.4 * s)} 1.2`;
    return (
      `<path d="${d}" fill="${barva}" stroke="${obrys}" stroke-width="0.6" stroke-linejoin="round"/>` +
      `<path d="M${f(x + 2)} ${f(y + 1.6)} H${f(x + w - 2)}" stroke="${stin}" stroke-width="1.2" stroke-linecap="round"/>` +
      `<path d="${zavitek(x - 1.8, y + 0.4, 1)} ${zavitek(x + w - 2.6, y + 0.4, -1)}" stroke="${obrys}" stroke-width="0.5" fill="none"/>`
    );
  };
  const vrstvaPapir = () => {
    const r = rng(66);
    const okraj = [];
    for (let i = 0; i < 64; i++) {
      const u = i / 64;
      const strana = Math.floor(u * 4), k = (u * 4) % 1;
      const o = (r() - 0.5) * 0.9;
      okraj.push(strana === 0 ? [6 + k * 168, 6 + o] : strana === 1 ? [174 + o, 6 + k * 168] : strana === 2 ? [174 - k * 168, 174 + o] : [6 + o, 174 - k * 168]);
    }
    return (
      `<rect x="9" y="10" width="168" height="168" rx="1" fill="#2B2420" opacity="0.22" filter="url(#hz2-rozmaz)"/>` +
      `<path d="${cara(okraj)} Z" fill="#EFE4CB"/>` +
      `<path d="M160 170.6 V164.6 H166" stroke="#B9AC8E" stroke-width="0.5" fill="none"/><path d="M14 170.6 H20" stroke="#B9AC8E" stroke-width="0.5"/>` +
      `<rect x="10.2" y="10.2" width="159.6" height="159.6" fill="none" stroke="#2A2420" stroke-width="0.35"/>`
    );
  };
  const MACKAREL = (() => {
    const r = rng(1831);
    let mraky = "", stiny = "";
    for (let j = 0; j < 6; j++) {
      const y0 = 17 + j * 4.4;
      for (let x = 14 + j * 5 + r() * 4; x < 166 - j * 8; x += 5.2 + r() * 2.4) {
        if (Math.sin(x * 0.07 + j * 1.3) + r() * 0.8 < 0.15) continue;
        const y = y0 + (x - 90) * 0.06 + (r() - 0.5) * 1.2;
        const w = 2.6 + r() * 1.8, h = 1 + r() * 0.5;
        mraky += `M${f(x - w)} ${f(y)} q${f(w)} ${f(-h * 1.8)} ${f(2 * w)} 0 q${f(-w)} ${f(h * 0.9)} ${f(-2 * w)} 0 Z`;
        stiny += `M${f(x - w * 0.7)} ${f(y + 0.5)} h${f(w * 1.4)}`;
      }
    }
    return { mraky, stiny };
  })();
  const vrstvaKrajina = () => {
    let s = "";
    /* nebe: pruh bokaši pruské modři nahoře, k obzoru světlá */
    s += `<rect x="12" y="12" width="156" height="112" fill="url(#hz2-nebe)"/>`;
    s += `<rect x="12" y="12" width="156" height="112" fill="url(#hz2-drevo)" opacity="0.16"/>`;
    s += `<path d="${MACKAREL.mraky}" fill="#F7F3EA" opacity="0.92"/><path d="${MACKAREL.stiny}" stroke="#9FB2CA" stroke-width="0.45" opacity="0.8"/>`;
    s += mrak(18, 52, 40, 3);
    /* Fudži: rudá, světlejší levý svah, stín vpravo */
    s += `<path d="${FUDZI}" fill="url(#hz2-fudzi)"/>`;
    s += `<path d="M96 46 L107 47 ${hladka(FUDZI_L.map(([x, y]) => [192 - x, y])).replace(/^M[^C]*/, "")} L188 130 L120 130 Q104 90 96 46 Z" fill="#3A1208" opacity="0.28"/>`;
    s += `<path d="${hladka([[86, 60], [80, 74], [70, 90], [56, 106]])}" stroke="#D9714A" stroke-width="2.4" stroke-linecap="round" fill="none" opacity="0.45"/>`;
    /* rýhy svahů: tenké tmavé tahy dolů */
    let ryhy = "";
    for (const [x0, y0, x1, y1] of [[92, 66, 84, 96], [100, 70, 106, 98], [86, 70, 74, 92], [106, 66, 120, 90], [96, 74, 96, 104], [80, 78, 64, 100], [112, 74, 132, 98]]) ryhy += hladka([[x0, y0], [lerp(x0, x1, 0.5) + (x1 > x0 ? 1.5 : -1.5), lerp(y0, y1, 0.5)], [x1, y1]]);
    s += `<path d="${ryhy}" stroke="#5A1E12" stroke-width="0.6" fill="none" opacity="0.6"/>`;
    s += `<path d="${snih()}" fill="#F4F1E8" stroke="#2A2420" stroke-width="0.5" stroke-linejoin="round"/>`;
    s += `<path d="M90 48 L86 60 M95 47 L94 62 M100 48 L101 60 M104 49 L107 58" stroke="#A9B8CA" stroke-width="0.8" stroke-linecap="round"/>`;
    s += `<path d="${FUDZI}" fill="none" stroke="#2A1810" stroke-width="0.7" stroke-linejoin="round" transform="translate(0.3 0.2)"/>`;
    /* les u paty hory, nahoře zubatý */
    const r = rng(404);
    const vrch = [];
    for (let x = 10; x <= 170; x += 2.2) vrch.push([x, 110 + Math.sin(x * 0.11) * 1.6 - (r() < 0.5 ? r() * 2.4 : 0)]);
    s += `<path d="M10 ${HLADINA + 1} L${vrch.map(pt).join(" L")} L170 ${HLADINA + 1} Z" fill="#2C4632" stroke="#16241A" stroke-width="0.5"/>`;
    let stromy = "";
    for (let j = 0; j < 3; j++) for (let x = 12 + j * 1.4; x < 168; x += 2.8 + r()) stromy += `M${f(x - 1)} ${f(113 + j * 2.6)} l1 -2.2 l1 2.2`;
    s += `<path d="${stromy}" stroke="#4E6C48" stroke-width="0.5" fill="none" opacity="0.8"/>`;
    /* pásy mlhy kasumi přes horu */
    s += `<rect x="6" y="94.6" width="104" height="7.4" rx="3.7" fill="#F6E8D2" opacity="0.94"/>`;
    s += `<rect x="124" y="83" width="54" height="5.6" rx="2.8" fill="#F6E8D2" opacity="0.9"/>`;
    s += `<rect x="40" y="97.4" width="56" height="1.2" rx="0.6" fill="#E9CFB0" opacity="0.8"/>`;
    /* jezero s „nemožným“ odrazem: dole je Fudži celá v zimě */
    s += `<rect x="12" y="${HLADINA}" width="156" height="48" fill="url(#hz2-voda)"/>`;
    const odraz = (y) => HLADINA + (HLADINA - y) * 0.42;
    s += `<g opacity="0.55"><path d="${FUDZI}" transform="translate(0 ${f(HLADINA)}) scale(1 -0.42) translate(0 ${f(-HLADINA)})" fill="#DDE6EE"/>` +
      `<path d="M10 ${HLADINA} L${vrch.map(([x, y]) => pt([x, odraz(y)])).join(" L")} L170 ${HLADINA} Z" fill="#3C5446"/></g>`;
    let vlnky = "", vlnkyTm = "";
    for (let i = 0; i < 46; i++) {
      const y = HLADINA + 2 + r() * 44, x = 14 + r() * 150, w = 3 + r() * 9;
      if (r() < 0.6) vlnky += `M${f(x)} ${f(y)} h${f(w)}`;
      else vlnkyTm += `M${f(x)} ${f(y)} q${f(w / 4)} -0.6 ${f(w / 2)} 0 q${f(w / 4)} 0.6 ${f(w / 2)} 0`;
    }
    s += `<path d="${vlnky}" stroke="#EEF3F5" stroke-width="0.5" stroke-linecap="round" opacity="0.85"/><path d="${vlnkyTm}" stroke="#4E6E8A" stroke-width="0.45" fill="none" opacity="0.7"/>`;
    s += `<path d="M12 ${HLADINA} H168" stroke="#2A2420" stroke-width="0.4" opacity="0.5"/>`;
    return vOrezu(s);
  };
  /* Břeh vpředu: travnatý svah s borovicemi a rákosím, na něm spí Hlínka */
  const BREH = [[10, 136], [30, 139.4], [52, 145.6], [76, 152], [100, 158.6], [118, 164], [130, 170]];
  const vrstvaBreh = () => {
    let s = `<path d="M10 172 L${cara(vzorkuj(BREH, 6)).slice(1)} L132 172 Z" fill="url(#hz2-trava)" stroke="#1E2A18" stroke-width="0.6"/>`;
    s += `<path d="${hladka(BREH)}" stroke="#7E9A54" stroke-width="1.4" fill="none" opacity="0.7" transform="translate(0 1.2)"/>`;
    const r = rng(717);
    let trava = "";
    for (let i = 0; i < 70; i++) {
      const x = 12 + r() * 110;
      const yb = naCare(vzorkuj(BREH, 6), clamp((x - 10) / 120)).p[1];
      const y = yb + 2 + r() * (170 - yb - 2);
      trava += `M${f(x)} ${f(y)} l${f((r() - 0.5) * 1.4)} ${f(-1.8 - r() * 1.6)}`;
    }
    s += `<path d="${trava}" stroke="#2E4422" stroke-width="0.45" stroke-linecap="round" fill="none"/>`;
    /* rákosí u vody */
    let rakos = "";
    for (let i = 0; i < 16; i++) {
      const x = 86 + i * 2.6 + r() * 1.4;
      const yb = 152 + (x - 76) * 0.27;
      rakos += `M${f(x)} ${f(yb + 2)} q${f(-0.6 + r())} ${f(-6 - r() * 4)} ${f(1 + r() * 2)} ${f(-11 - r() * 6)}`;
    }
    s += `<path d="${rakos}" stroke="#4A5A2E" stroke-width="0.55" stroke-linecap="round" fill="none"/>`;
    /* černé borovice: křivý kmen a ploché polštáře jehličí */
    const borovice = (x, y, k, seed) => {
      const rr = rng(seed);
      const kmen = [[x, y], [x + 3 * k, y - 10 * k], [x + 1 * k, y - 20 * k], [x + 6 * k, y - 30 * k], [x + 12 * k, y - 36 * k]];
      let b = `<path d="${pasPoBodech(vzorkuj(kmen, 5), (u) => lerp(3.2 * k, 1 * k, u))}" fill="#4A3426" stroke="#1E140E" stroke-width="0.5"/>`;
      for (const [dx, dy, w] of [[12, -37, 12], [-1, -26, 10], [10, -24, 9], [4, -15, 8]]) {
        const cx = x + dx * k, cy = y + dy * k, ww = w * k;
        b += `<path d="M${f(cx - ww)} ${f(cy)} Q${f(cx - ww * 0.6)} ${f(cy - 4.6 * k)} ${f(cx)} ${f(cy - 4.2 * k)} Q${f(cx + ww * 0.7)} ${f(cy - 4.8 * k)} ${f(cx + ww)} ${f(cy)} Q${f(cx)} ${f(cy + 1.8 * k)} ${f(cx - ww)} ${f(cy)} Z" fill="#2C4A2C" stroke="#142414" stroke-width="0.5"/>`;
        let jehli = "";
        for (let q = 0; q < 7; q++) jehli += `M${f(cx - ww * 0.8 + (q / 6) * ww * 1.6)} ${f(cy - 0.6)} l${f(rr() - 0.5)} ${f(-1.6 * k - rr() * k)}`;
        b += `<path d="${jehli}" stroke="#5E8452" stroke-width="0.45" stroke-linecap="round"/>`;
      }
      return b;
    };
    s += borovice(18, 156, 1.05, 3) + borovice(30, 160, 0.7, 8);
    return vOrezu(s);
  };
  const vrstvaKartus = () =>
    `<rect x="151" y="15.6" width="13.4" height="44" fill="#F3E3B0" stroke="#2A2420" stroke-width="0.5"/>` +
    `<rect x="152.2" y="16.8" width="11" height="41.6" fill="none" stroke="#2A2420" stroke-width="0.25"/>` +
    ["富", "士", "越", "土", "竜"].map((z, i) => `<text x="157.7" y="${f(23.4 + i * 7.6)}" font-size="6.6" text-anchor="middle" dominant-baseline="central" fill="#2A2420" style="font-family: var(--f-kanji, 'Yuji Syuku', 'Yu Mincho', 'Hiragino Mincho ProN', serif)">${z}</text>`).join("") +
    /* pečeť s 土: bílá znaková čára na rumělce */
    `<rect x="152.6" y="62.2" width="10" height="10" rx="0.8" fill="#B8321E"/>` +
    `<path d="M154.8 66 H160.4 M157.6 63.8 V70.4 M154 70.4 H161.2" stroke="#F6E9D6" stroke-width="1.1" stroke-linecap="square"/>` +
    `<rect x="153.2" y="62.8" width="8.8" height="8.8" fill="none" stroke="#F6E9D6" stroke-width="0.35" opacity="0.8"/>`;

  /* ——— Hlínka a drak ——— */
  /** Původní Hlínka (tělo, nožky, výhonek, tvář) v měřítku k kolem středu c. */
  const hlinkaV = (c, k, tvar, { nohy = 1, vyhonek = 0, mrak2 = false } = {}) =>
    `<g transform="translate(${f(c[0])} ${f(c[1])}) scale(${f(k)}) translate(-90 -98)">` +
    (vyhonek !== null ? hlVyhonek({ kyv: vyhonek }) : "") +
    (nohy > 0.02 ? `<g opacity="${f(nohy)}">${hlNohy("#4A3F35")}</g>` : "") +
    `${hlTelo("hz2", { obrys: "#2A2018" })}${hlTvar("hz2", tvar)}</g>` +
    (mrak2 ? "" : "");
  /** Tělo draka z bodů páteře P (od hlavy), hl je poloměr podle profilu. */
  const telo = (P, polomer, st) => {
    const n = P.length;
    if (n < 2) return { zadni: "", predni: "", hlava: "" };
    const nor = [], dir = [];
    for (let i = 0; i < n; i++) {
      const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)];
      const d = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1;
      dir.push([(a[0] - b[0]) / d, (a[1] - b[1]) / d]);
      nor.push([-(a[1] - b[1]) / d, (a[0] - b[0]) / d]);
    }
    /* která strana je hřbet: ta, co míří nahoru; vyhlazené, aby se tělo v obratu přetočilo plynule */
    const sig = nor.map((q) => (q[1] < 0 ? 1 : -1));
    const hrbet = sig.map((_, i) => {
      let a = 0, w = 0;
      for (let k = -4; k <= 4; k++) {
        const j = clamp(i + k, 0, n - 1);
        a += sig[j] * (5 - Math.abs(k));
        w += 5 - Math.abs(k);
      }
      return a / w;
    });
    const H = P.map((_, i) => polomer(i));
    const okraj = (zn, kolik) => P.map((p, i) => [p[0] + nor[i][0] * H[i] * zn * kolik, p[1] + nor[i][1] * H[i] * zn * kolik]);
    const obrys = (rozsir) => {
      const L = P.map((p, i) => [p[0] + nor[i][0] * (H[i] + rozsir), p[1] + nor[i][1] * (H[i] + rozsir)]);
      const Pr = P.map((p, i) => [p[0] - nor[i][0] * (H[i] + rozsir), p[1] - nor[i][1] * (H[i] + rozsir)]);
      const konec = P[n - 1], kr = H[n - 1] + rozsir;
      return `M${pt(L[0])} ${hladka(L).replace(/^M[^C]*/, "")} A${f(kr)} ${f(kr)} 0 0 1 ${pt(Pr[n - 1])} ${hladka(Pr.slice().reverse()).replace(/^M[^C]*/, "")} Z`;
    };
    /* ploutve na hřbetě: sevřené špetky hlíny, dozadu */
    let ploutve = "";
    for (let i = 3; i < n - 3; i += 3) {
      const z = hrbet[i];
      const vel = Math.abs(z) * (1 - i / n) * 1.25 + 0.3;
      if (Math.abs(z) < 0.25) continue;
      const sg = Math.sign(z);
      const zak = [P[i][0] + nor[i][0] * H[i] * sg * 0.7, P[i][1] + nor[i][1] * H[i] * sg * 0.7];
      const spicka = [zak[0] + nor[i][0] * sg * 4.2 * vel - dir[i][0] * 3.4 * vel, zak[1] + nor[i][1] * sg * 4.2 * vel - dir[i][1] * 3.4 * vel];
      const zadek = [zak[0] - dir[i][0] * 4.4 * vel, zak[1] - dir[i][1] * 4.4 * vel];
      ploutve += `M${pt([zak[0] + dir[i][0] * 1.4, zak[1] + dir[i][1] * 1.4])} Q${pt([zak[0] + nor[i][0] * sg * 3 * vel, zak[1] + nor[i][1] * sg * 3 * vel])} ${pt(spicka)} Q${pt([lerp(spicka[0], zadek[0], 0.5) - nor[i][0] * sg * 0.6, lerp(spicka[1], zadek[1], 0.5) - nor[i][1] * sg * 0.6])} ${pt(zadek)} Z`;
    }
    /* břicho: světlý pás na spodní straně se šupinami napříč */
    const bricho = P.map((p, i) => [p[0] - nor[i][0] * hrbet[i] * H[i] * 0.42, p[1] - nor[i][1] * hrbet[i] * H[i] * 0.42]);
    const brichoD = pasPoBodech(bricho.slice(2), (u) => Math.abs(hrbet[Math.min(n - 1, 2 + Math.round(u * (n - 3)))]) * H[Math.min(n - 1, 2 + Math.round(u * (n - 3)))] * 0.62);
    let supiny = "";
    for (let i = 3; i < n - 2; i += 1) {
      const w = Math.abs(hrbet[i]) * H[i] * 0.31;
      if (w < 0.4) continue;
      supiny += `M${pt([bricho[i][0] + nor[i][0] * w, bricho[i][1] + nor[i][1] * w])} L${pt([bricho[i][0] - nor[i][0] * w, bricho[i][1] - nor[i][1] * w])}`;
    }
    /* otisky šňůry Džómon: šikmé čárky, v horní a dolní půlce opačně, takže dělají stromeček */
    let jomon = "";
    for (let i = 2; i < n - 2; i++) {
      const h = H[i] * 0.78;
      for (const zn of [1, -1]) {
        const a = [P[i][0] + nor[i][0] * h * zn * 0.95, P[i][1] + nor[i][1] * h * zn * 0.95];
        const b = [P[i][0] + nor[i][0] * h * zn * 0.2 - dir[i][0] * SEG * 0.9, P[i][1] + nor[i][1] * h * zn * 0.2 - dir[i][1] * SEG * 0.9];
        jomon += `M${pt(a)} L${pt(b)}`;
      }
    }
    /* světlý hřbet: odlesk z levého horního světla */
    const lesk = P.slice(1, -2).map((p, i) => [p[0] + nor[i + 1][0] * hrbet[i + 1] * H[i + 1] * 0.45, p[1] + nor[i + 1][1] * hrbet[i + 1] * H[i + 1] * 0.45 - 0.4]);
    const leskD = lesk.length > 2 ? pasPoBodech(lesk, (u) => H[Math.round(1 + u * (lesk.length - 1))] * 0.42) : "";
    /* nohy: přední pár a zadní pár, vzdálenější za tělem, bližší před ním */
    const noha = (s, faze, blizka) => {
      const i = Math.round(s * (N - 1));
      if (i >= n - 1) return "";
      const z = hrbet[i] || 1;
      const b0 = [P[i][0] - nor[i][0] * z * H[i] * 0.55, P[i][1] - nor[i][1] * z * H[i] * 0.55];
      const kyv = Math.sin(st.t * 7 + faze) * 0.5;
      const smer = Math.atan2(-nor[i][1] * z, -nor[i][0] * z);
      const zpet = Math.atan2(-dir[i][1], -dir[i][0]);
      const a1 = smer + uhelRozdil(zpet, smer) * 0.45 + kyv;
      const k1 = [b0[0] + Math.cos(a1) * 4.6, b0[1] + Math.sin(a1) * 4.6];
      const a2 = a1 - uhelRozdil(zpet, smer) * 0.9 - kyv * 0.6;
      const k2 = [k1[0] + Math.cos(a2) * 4, k1[1] + Math.sin(a2) * 4];
      const barva = blizka ? "#7A6956" : "#4E4236";
      let d = `<path d="M${pt(b0)} L${pt(k1)} L${pt(k2)}" stroke="#2A2018" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
      d += `<path d="M${pt(b0)} L${pt(k1)} L${pt(k2)}" stroke="${barva}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
      let drapy = "";
      for (const o of [-0.6, 0, 0.6]) {
        const a3 = a2 + o;
        drapy += `M${pt(k2)} q${f(Math.cos(a3) * 1.6)} ${f(Math.sin(a3) * 1.6)} ${f(Math.cos(a3 + 0.5) * 2.4)} ${f(Math.sin(a3 + 0.5) * 2.4)}`;
      }
      return d + `<path d="${drapy}" stroke="#F1E6D0" stroke-width="0.6" stroke-linecap="round" fill="none"/>`;
    };
    const zadni = noha(0.22, 1.6, false) + noha(0.58, 4.2, false);
    let telo =
      `<path d="${ploutve}" fill="#5E4E40" stroke="#2A2018" stroke-width="0.5" stroke-linejoin="round"/>` +
      `<path d="${obrys(0.7)}" fill="#2A2018"/>` +
      `<path d="${obrys(0)}" fill="url(#hz2-hlina)"/>` +
      (leskD ? `<path d="${leskD}" fill="#A8957C" opacity="0.55"/>` : "") +
      `<path d="${jomon}" stroke="#4A3C30" stroke-width="0.42" stroke-linecap="round" opacity="0.65"/>` +
      `<path d="${brichoD}" fill="#C9B596"/><path d="${supiny}" stroke="#8E7A60" stroke-width="0.4" opacity="0.8"/>`;
    const predni = noha(0.19, 0, true) + noha(0.55, 2.6, true);
    return { zadni, telo, predni };
  };
  /** Hlava draka: Hlínčina kulatá tvář, čumák ve směru letu, hříva, vousy a parohy z výhonku. */
  const hlava = (st) => {
    const { H: c, rh, smer: th } = st.hlava;
    const k = rh / 48;
    const cs = Math.cos(th), sn = Math.sin(th);
    const naDrak = clamp((R_HROUDA - rh) / (R_HROUDA - R_HLAVA));
    let s = "";
    if (naDrak > 0.05) {
      /* vousy, hříva a čumák jsou za kulatou tváří — tvář zůstává čelem k nám, drak se pozná podle toho, co jí kouká zpoza hlavy */
      for (const v of st.vousy) s += `<path d="${hladka(v)}" stroke="#2A2018" stroke-width="0.6" stroke-linecap="round" fill="none" opacity="${f(naDrak)}"/>`;
      for (const o of [-0.75, 0, 0.75]) {
        const a = th + Math.PI + o;
        const x = c[0] + Math.cos(a) * rh * 0.95, y = c[1] + Math.sin(a) * rh * 0.95;
        const r = rh * 0.34 * naDrak;
        s += `<path d="M${f(x - Math.cos(a) * r)} ${f(y - Math.sin(a) * r)} Q${f(x + Math.cos(a + 0.9) * r * 1.6)} ${f(y + Math.sin(a + 0.9) * r * 1.6)} ${f(x + Math.cos(a) * r * 1.5)} ${f(y + Math.sin(a) * r * 1.5)} Q${f(x + Math.cos(a - 0.6) * r)} ${f(y + Math.sin(a - 0.6) * r)} ${f(x - Math.cos(a) * r)} ${f(y - Math.sin(a) * r)} Z" fill="#5E4E40" stroke="#2A2018" stroke-width="0.5" stroke-linejoin="round"/>`;
      }
      const cx = c[0] + cs * rh * 0.92, cy = c[1] + sn * rh * 0.4 + rh * 0.32;
      s += `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rh * 0.52 * naDrak)}" ry="${f(rh * 0.4 * naDrak)}" transform="rotate(${f((th * 180) / Math.PI)} ${f(cx)} ${f(cy)})" fill="#BCA486" stroke="#2A2018" stroke-width="0.55"/>`;
      s += `<circle cx="${f(cx + cs * rh * 0.3)}" cy="${f(cy - rh * 0.07)}" r="${f(rh * 0.06)}" fill="#2A2018"/><circle cx="${f(cx + cs * rh * 0.3)}" cy="${f(cy + rh * 0.11)}" r="${f(rh * 0.06)}" fill="#2A2018"/>`;
    }
    const tvar = { oci: st.oci, usta: st.usta, mrk: st.mrk, dx: st.pohled[0], dy: st.pohled[1], tvare: 0.55, linka: "#F6EDDC" };
    s += hlinkaV(c, k, tvar, { nohy: 1 - naDrak, vyhonek: null });
    /* parohy: Hlínčin výhonek, větší a nakloněný dozadu */
    s += `<g transform="translate(${f(c[0])} ${f(c[1] - rh * 0.1)}) scale(${f(k * (1 + 0.45 * naDrak))}) translate(-90 -98)">${hlVyhonek({ kyv: -Math.sign(cs || 1) * 18 * naDrak + st.vyhonek })}</g>`;
    return s;
  };
  const kresliDraka = (st) => {
    const d = st.drak;
    let s = "";
    if (d.P.length > 1) {
      const t = telo(d.P, (i) => (D0 / 2) * profil(i / (N - 1)) * d.sila, st);
      s += t.zadni + t.telo + t.predni;
    }
    if (d.zbytek > 0.4) {
      const z = d.P[d.P.length - 1] || st.hlava.H;
      s += `<circle cx="${f(z[0])}" cy="${f(z[1])}" r="${f(d.zbytek)}" fill="url(#hz2-telo)" stroke="#2A2018" stroke-width="0.6"/>`;
    }
    return s + hlava(st);
  };

  /* ——— Perla, obláčky, jiskry, odraz ——— */
  const perlaSvg = (P, st, op = 1) => {
    let s = `<circle cx="${f(P[0])}" cy="${f(P[1])}" r="13" fill="url(#hz2-perla-zare)" opacity="${f(op)}"/>`;
    if (st.let > 0.05) {
      for (let i = 0; i < 3; i++) {
        const a = st.t * 2.4 + (i * Math.PI * 2) / 3;
        const B = [P[0] + Math.cos(a) * 2.6, P[1] + Math.sin(a) * 2.6];
        s += `<path d="${jazyk({ B, th0: a + 1.2, L: 6 * st.let, W: 2.6, c: 1, stoc: 1.8, t: st.t, w: 6, fz: i * 2, vlna: 0.4 })}" fill="#F6C860" opacity="${f(0.85 * op)}"/>`;
      }
    }
    s += `<circle cx="${f(P[0])}" cy="${f(P[1])}" r="2.9" fill="url(#hz2-perla)" opacity="${f(op)}"/><circle cx="${f(P[0] - 0.9)}" cy="${f(P[1] - 1)}" r="0.9" fill="#FFFFFF" opacity="${f(op)}"/>`;
    return s;
  };
  const vrstvaObla = (st) =>
    st.obla
      .map((o) => {
        const u = o.vek / o.zivot;
        return `<circle cx="${f(o.x)}" cy="${f(o.y)}" r="${f(o.r * (0.6 + u * 0.9))}" fill="#F6F1E6" stroke="#5A6476" stroke-width="0.4" opacity="${f((1 - u) * 0.85)}"/>`;
      })
      .join("");
  const vrstvaOdraz = (st) => {
    const zrcadlo = ([x, y]) => [x, 2 * HLADINA - y];
    let s = "";
    const d = st.drak;
    if (d.P.length > 1 && d.P.some(([, y]) => y > HLADINA - 50)) {
      const Pz = d.P.map(zrcadlo);
      const n = Pz.length;
      const L = [], Pr = [];
      for (let i = 0; i < n; i++) {
        const a = Pz[Math.max(0, i - 1)], b = Pz[Math.min(n - 1, i + 1)];
        const dd = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1;
        const h = (D0 / 2) * profil(i / (N - 1)) * d.sila;
        L.push([Pz[i][0] - ((a[1] - b[1]) / dd) * h, Pz[i][1] + ((a[0] - b[0]) / dd) * h]);
        Pr.push([Pz[i][0] + ((a[1] - b[1]) / dd) * h, Pz[i][1] - ((a[0] - b[0]) / dd) * h]);
      }
      s += `<path d="${cara(L)} L${Pr.reverse().map(pt).join(" L")} Z" fill="#3E4C5E"/>`;
    }
    const H = zrcadlo(st.hlava.H);
    if (H[1] < 185) s += `<circle cx="${f(H[0])}" cy="${f(H[1])}" r="${f(st.hlava.rh)}" fill="#3E4C5E"/>`;
    const Pp = zrcadlo(st.perla);
    s += `<ellipse cx="${f(Pp[0])}" cy="${f(Pp[1])}" rx="5.4" ry="2" fill="#FFF0BE"/>`;
    return `<g clip-path="url(#hz2-jezero)"><g mask="url(#hz2-vlnky)" opacity="0.32">${s}</g></g>`;
  };
  const vrstvaPerla = (st) => perlaSvg(st.perla, st);
  const vrstvaJiskry = (st) =>
    st.jiskry
      .map((j) => {
        const u = j.vek / j.zivot;
        return `<path d="${jiskraD(j.r * (1 - u * 0.5))}" transform="translate(${f(j.x)} ${f(j.y)}) rotate(${f(j.rot + u * 120)})" fill="${u < 0.4 ? "#FFF6D8" : "#F6C860"}" opacity="${f(clamp((1 - u) * 1.5))}"/>`;
      })
      .join("");
  const vrstvaZzz = (st) => (st.spi > 0.02 ? zzz(st.t, st.hlava.H[0] + 10, st.hlava.H[1] - 10, { barva: "#2A2420", meritko: 0.55, sila: st.spi }) : "");
  const vrstvaTextura = () => vOrezu(`<rect x="12" y="12" width="156" height="156" filter="url(#hz2-vlakna)" opacity="0.35"/>`);

  const defs = () =>
    hlDefs("hz2", { svetla: "#9A8670", stred: "#76644F", tmava: "#4E4032", tvare: "#D8866A" }) +
    `<clipPath id="hz2-obraz"><rect x="12" y="12" width="156" height="156"/></clipPath>` +
    `<clipPath id="hz2-jezero"><rect x="12" y="${HLADINA}" width="156" height="47"/></clipPath>` +
    `<pattern id="hz2-pruhy" width="8" height="2.2" patternUnits="userSpaceOnUse"><rect width="8" height="1.3" fill="#FFFFFF"/><rect x="5" y="1.3" width="3" height="0.9" fill="#FFFFFF" opacity="0.5"/></pattern>` +
    `<mask id="hz2-vlnky" maskUnits="userSpaceOnUse" x="0" y="${HLADINA}" width="180" height="60"><rect x="0" y="${HLADINA}" width="180" height="60" fill="url(#hz2-pruhy)"/></mask>` +
    `<linearGradient id="hz2-nebe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1B2F62"/><stop offset="0.14" stop-color="#2E4C86"/><stop offset="0.42" stop-color="#7896BE"/><stop offset="0.78" stop-color="#C9D6DC"/><stop offset="1" stop-color="#F1E2C6"/></linearGradient>` +
    `<linearGradient id="hz2-fudzi" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C4502E"/><stop offset="0.35" stop-color="#A9402A"/><stop offset="0.75" stop-color="#7C2C1C"/><stop offset="1" stop-color="#5A2016"/></linearGradient>` +
    `<linearGradient id="hz2-voda" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A9BFCE"/><stop offset="0.5" stop-color="#7E9AB2"/><stop offset="1" stop-color="#5E7C98"/></linearGradient>` +
    `<linearGradient id="hz2-trava" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="#6E8A48"/><stop offset="0.6" stop-color="#4E6A36"/><stop offset="1" stop-color="#34482A"/></linearGradient>` +
    `<linearGradient id="hz2-hlina" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8E7A62"/><stop offset="0.55" stop-color="#76644F"/><stop offset="1" stop-color="#5A4A3A"/></linearGradient>` +
    `<radialGradient id="hz2-perla"><stop offset="0" stop-color="#FFFBEA"/><stop offset="0.6" stop-color="#FBE3A0"/><stop offset="1" stop-color="#E9B84E"/></radialGradient>` +
    `<radialGradient id="hz2-perla-zare"><stop offset="0" stop-color="#FFE9A8" stop-opacity="0.85"/><stop offset="0.35" stop-color="#F6C860" stop-opacity="0.35"/><stop offset="1" stop-color="#F6C860" stop-opacity="0"/></radialGradient>` +
    `<filter id="hz2-drevo-f" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.012 0.22" numOctaves="3" seed="12"/><feColorMatrix type="matrix" values="0 0 0 0 0.92  0 0 0 0 0.95  0 0 0 0 1  0 0 0 1.2 -0.45"/></filter>` +
    `<pattern id="hz2-drevo" width="156" height="112" patternUnits="userSpaceOnUse" x="12" y="12"><rect width="156" height="112" filter="url(#hz2-drevo-f)"/></pattern>` +
    `<filter id="hz2-vlakna" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.8 0.06" numOctaves="2" seed="5"/><feColorMatrix type="matrix" values="0 0 0 0 0.96  0 0 0 0 0.92  0 0 0 0 0.84  0 0 0 0.9 -0.42"/></filter>` +
    `<filter id="hz2-rozmaz" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="2.2"/></filter>`;

  /* ——— Simulace ——— */
  const okno = (x, y, m = 14) => [clamp(x, OBR.x0 + m, OBR.x1 - m), clamp(y, OBR.y0 + m, HLADINA - 8)];
  const sama = (t, f0) => [90 + 56 * Math.sin(0.37 * t + 1.1 + f0) + 12 * Math.sin(0.91 * t + f0 * 2), 58 + 30 * Math.sin(0.53 * t + f0) + 9 * Math.sin(1.3 * t + 2)];
  const LUZKO_SVETLO = [LUZKO[0] + 23, LUZKO[1] - 15];
  const novaDynamika = () => ({
    faze: "spi", u0: 0, konec: -4, chyceno: 0, letOd: 0,
    l: 0, P: [], H: [...LUZKO], smer: -Math.PI / 2, rychlost: 0, rh: R_HROUDA,
    perla: [...LUZKO_SVETLO], perlaV: [0, 0], lis: 0, cilKlik: null,
    vousy: [0, 1].map(() => Array.from({ length: 7 }, () => [...LUZKO])),
    obla: [], jiskry: [], oblaAkum: 0, pohled: [0, 0], vyhonek: 0, nahoda: rng(1849), zvuk: [], smich: -10,
  });
  /** Řetěz z hlavy: každý článek táhne za předchozím; je-li dán kotevní bod, řetěz se k němu ještě dopne. */
  const retez = (dyn, n, kotva) => {
    const P = dyn.P;
    while (P.length < n) P.push([...(P[P.length - 1] || dyn.H)]);
    P.length = n;
    /* článek i spojuje body i-1 a i; poslední je zkrácený, aby délka seděla na l */
    const seg = (i) => (i === n - 1 ? Math.min(SEG, Math.max(0.01, dyn.l - SEG * (n - 2))) : SEG);
    for (let it = 0; it < (kotva ? 3 : 1); it++) {
      P[0] = [...dyn.H];
      for (let i = 1; i < n; i++) {
        const dx = P[i][0] - P[i - 1][0], dy = P[i][1] - P[i - 1][1];
        const d = Math.hypot(dx, dy) || 1;
        P[i] = [P[i - 1][0] + (dx / d) * seg(i), P[i - 1][1] + (dy / d) * seg(i)];
      }
      if (!kotva) break;
      P[n - 1] = [...kotva];
      for (let i = n - 2; i >= 1; i--) {
        const dx = P[i][0] - P[i + 1][0], dy = P[i][1] - P[i + 1][1];
        const d = Math.hypot(dx, dy) || 1;
        P[i] = [P[i + 1][0] + (dx / d) * seg(i + 1), P[i + 1][1] + (dy / d) * seg(i + 1)];
      }
    }
  };
  const krok = (dyn, t, dt, vstup) => {
    const R = dyn.nahoda;
    if (vstup.kliky && vstup.kliky.length) {
      const k = vstup.kliky[vstup.kliky.length - 1];
      vstup.kliky.length = 0;
      if (dyn.faze === "spi") {
        dyn.faze = "vstava";
        dyn.u0 = t;
      } else dyn.cilKlik = { x: k.x, y: k.y, do: t + 2.6 };
    }
    if (dyn.faze === "spi" && t - dyn.konec > 6.5) {
      dyn.faze = "vstava";
      dyn.u0 = t;
    }
    const u = t - dyn.u0;
    /* kam míří perla */
    let cilPerly;
    if (dyn.faze === "spi" || dyn.faze === "zataha") cilPerly = [LUZKO_SVETLO[0] + 3 * Math.sin(t * 0.7), LUZKO_SVETLO[1] + 4 * Math.sin(t * 0.9)];
    else if (dyn.faze === "navrat") cilPerly = [LUZKO_SVETLO[0], LUZKO_SVETLO[1] - 6];
    else if (dyn.cilKlik && t < dyn.cilKlik.do) cilPerly = okno(dyn.cilKlik.x, dyn.cilKlik.y);
    else if (vstup.mys) cilPerly = okno(vstup.mys.x, vstup.mys.y, 6);
    else cilPerly = okno(...sama(t, dyn.lis));
    const tuh = vstup.mys || dyn.cilKlik ? 30 : 8;
    for (const i of [0, 1]) [dyn.perla[i], dyn.perlaV[i]] = pruzina(dyn.perla[i], dyn.perlaV[i], cilPerly[i], dt, tuh, 2 * Math.sqrt(tuh) * 0.8);

    if (dyn.faze === "vstava") {
      if (u < 0.05 && u + dt >= 0.05) dyn.zvuk.push({ druh: "zev", sila: 0.8 });
      if (u > 0.95 && u - dt <= 0.95) dyn.zvuk.push({ druh: "natah", sila: 1 });
      /* hlava se vytahuje z hroudy nahoru, za ní váleček */
      const k = smooth((u - 0.95) / 1.4);
      dyn.l = 54 * k;
      dyn.H = [LUZKO[0] + Math.sin(u * 3.2) * 4 * k, LUZKO[1] - dyn.l * 0.82 - 2 * k];
      dyn.smer = -Math.PI / 2 + Math.sin(u * 3.2) * 0.5 * k;
      dyn.rychlost = 20 * k;
      dyn.rh = lerp(R_HROUDA, R_HLAVA, smooth(dyn.l / 26));
      if (dyn.l > 0.5) retez(dyn, Math.max(2, Math.ceil(dyn.l / SEG) + 1), [LUZKO[0], LUZKO[1] + 4]);
      else dyn.P = [];
      if (u >= 2.35) {
        dyn.faze = "let";
        dyn.letOd = t;
        dyn.chyceno = 0;
        dyn.zvuk.push({ druh: "koto", sila: 1, nahoru: true });
      }
    } else if (dyn.faze === "let" || dyn.faze === "navrat") {
      const ul = t - dyn.letOd;
      if (dyn.l < DELKA) dyn.l = Math.min(DELKA, dyn.l + dt * 85);
      dyn.rh = R_HLAVA;
      /* řízení: natočit se k cíli, omezená rychlost zatáčení, k tomu hadí vlnění */
      /* návrat: nejdřív nad hroudu, pak dolů */
      const NAD = [LUZKO[0], LUZKO[1] - 34];
      if (dyn.faze === "navrat" && !dyn.nad && Math.hypot(dyn.H[0] - NAD[0], dyn.H[1] - NAD[1]) < 14) dyn.nad = true;
      const cil = dyn.faze === "navrat" ? (dyn.nad ? LUZKO : NAD) : dyn.perla;
      const dx = cil[0] - dyn.H[0], dy = cil[1] - dyn.H[1];
      const dist = Math.hypot(dx, dy);
      const chtene = Math.atan2(dy, dx);
      const zatoc = 3.4 + 2.5 * clamp(1 - dyn.rychlost / 90);
      dyn.smer += clamp(uhelRozdil(chtene, dyn.smer), -zatoc * dt, zatoc * dt) + Math.sin(t * 3.3) * 0.9 * dt;
      /* měkké stěny: u okraje obrazu se stočí dovnitř */
      const [ox, oy] = okno(dyn.H[0], dyn.H[1], 8);
      if (dyn.faze === "let" && (ox !== dyn.H[0] || oy !== dyn.H[1])) dyn.smer += clamp(uhelRozdil(Math.atan2(68 - dyn.H[1], 90 - dyn.H[0]), dyn.smer), -4 * dt, 4 * dt);
      const cilRychlost = dyn.faze === "navrat" ? clamp(dist * 2.2, 12, 60) : 46 + 40 * clamp(dist / 70);
      dyn.rychlost += (cilRychlost - dyn.rychlost) * (1 - Math.exp(-dt / 0.5));
      dyn.H = [dyn.H[0] + Math.cos(dyn.smer) * dyn.rychlost * dt, dyn.H[1] + Math.sin(dyn.smer) * dyn.rychlost * dt];
      /* přistání: kousek nad hroudou už jen klouže rovnou dolů na své místo */
      const kLuzku = Math.hypot(dyn.H[0] - LUZKO[0], dyn.H[1] - LUZKO[1]);
      if (dyn.faze === "navrat" && dyn.nad && kLuzku < 36) {
        const k = 1 - Math.exp(-dt / 0.28);
        dyn.H = [lerp(dyn.H[0], LUZKO[0], k), lerp(dyn.H[1], LUZKO[1], k)];
        dyn.smer += uhelRozdil(Math.PI / 2, dyn.smer) * k;
      }
      const n = Math.max(2, Math.ceil(dyn.l / SEG) + 1);
      retez(dyn, n, dyn.l < DELKA - 0.5 ? [LUZKO[0], LUZKO[1] + 4] : null);
      if (dyn.faze === "let") {
        /* chycení perly */
        if (Math.hypot(dyn.perla[0] - dyn.H[0], dyn.perla[1] - dyn.H[1]) < R_HLAVA + 4 && ul > 0.8 && t - dyn.smich > 1.2) {
          dyn.chyceno++;
          dyn.smich = t;
          dyn.lis += 1.7 + R();
          const a = Math.atan2(dyn.perla[1] - dyn.H[1], dyn.perla[0] - dyn.H[0]) + (R() - 0.5);
          dyn.perlaV = [Math.cos(a) * 150, Math.sin(a) * 150 - 40];
          dyn.zvuk.push({ druh: "rin", sila: 1, pan: clamp((dyn.H[0] - 90) / 80, -1, 1), stupen: dyn.chyceno });
          for (let i = 0; i < 16; i++) {
            const b = R() * Math.PI * 2, v = 20 + R() * 40;
            dyn.jiskry.push({ x: dyn.perla[0], y: dyn.perla[1], vx: Math.cos(b) * v, vy: Math.sin(b) * v, vek: 0, zivot: 0.5 + R() * 0.5, r: 1 + R() * 1.4, rot: R() * 90 });
          }
        }
        if (dyn.chyceno >= 5 || ul > 18) {
          dyn.faze = "navrat";
          dyn.nad = false;
          dyn.zvuk.push({ druh: "koto", sila: 0.8, nahoru: false });
        }
      } else if (kLuzku < 1.6) {
        dyn.faze = "zataha";
        dyn.u0 = t;
        dyn.H = [...LUZKO];
      }
      /* obláčky za ocasem */
      dyn.oblaAkum += dt * clamp((dyn.rychlost - 30) / 30) * 14;
      while (dyn.oblaAkum >= 1) {
        dyn.oblaAkum -= 1;
        const z = dyn.P[Math.max(0, dyn.P.length - 1 - Math.floor(R() * 8))];
        if (z && z[1] < HLADINA - 4) dyn.obla.push({ x: z[0] + (R() - 0.5) * 4, y: z[1] + (R() - 0.5) * 4, r: 2 + R() * 2.6, vek: 0, zivot: 0.9 + R() * 0.7 });
      }
    } else if (dyn.faze === "zataha") {
      /* nasouká se zpátky do hroudy: váleček se zkracuje a hlava roste */
      const k = smooth(u / 1.7);
      dyn.l = DELKA * (1 - k);
      dyn.rh = kouleR(OBJEM - objemValecku(dyn.l));
      dyn.H = [LUZKO[0], LUZKO[1] - (1 - k) * 3];
      dyn.rychlost *= 0.9;
      const n = Math.max(2, Math.ceil(dyn.l / SEG) + 1);
      if (dyn.l > 0.5) retez(dyn, n, null);
      else dyn.P = [];
      if (u > 1.7 && u - dt <= 1.7) dyn.zvuk.push({ druh: "plesk", sila: 1 });
      if (u > 1.75) {
        dyn.faze = "spi";
        dyn.konec = t;
        dyn.l = 0;
        dyn.rh = R_HROUDA;
        dyn.P = [];
        dyn.smer = -Math.PI / 2;
      }
    }
    /* vousy: dva řetízky z čumáku, vlají za hlavou */
    const cs = Math.cos(dyn.smer), sn = Math.sin(dyn.smer);
    const cumak = [dyn.H[0] + cs * dyn.rh * 1.3, dyn.H[1] + sn * dyn.rh * 0.4 + dyn.rh * 0.36];
    dyn.vousy.forEach((v, j) => {
      v[0] = [...cumak];
      for (let i = 1; i < v.length; i++) {
        const tah = [Math.sin(t * 5 + i * 0.8 + j * 2) * 0.5, (j ? 0.35 : -0.25) + Math.cos(t * 4 + i) * 0.3];
        const dx = v[i][0] + tah[0] - v[i - 1][0], dy = v[i][1] + tah[1] - v[i - 1][1];
        const d = Math.hypot(dx, dy) || 1;
        v[i] = [v[i - 1][0] + (dx / d) * 2.6, v[i - 1][1] + (dy / d) * 2.6];
      }
    });
    for (const o of dyn.obla) {
      o.vek += dt;
      o.y -= dt * 2;
    }
    dyn.obla = dyn.obla.filter((o) => o.vek < o.zivot);
    for (const j of dyn.jiskry) {
      j.vek += dt;
      j.x += j.vx * dt;
      j.y += j.vy * dt;
      j.vx *= 1 - dt * 2.4;
      j.vy *= 1 - dt * 2.4;
    }
    dyn.jiskry = dyn.jiskry.filter((j) => j.vek < j.zivot);
    /* pohled: na perlu */
    const cp = [clamp((dyn.perla[0] - dyn.H[0]) / 20, -1, 1) * 2, clamp((dyn.perla[1] - dyn.H[1]) / 20, -1, 1) * 1.7];
    dyn.pohled = dyn.pohled.map((q, i) => q + (cp[i] - q) * (1 - Math.exp(-dt / 0.1)));
    dyn.vyhonek = Math.sin(t * 6) * 6 * clamp(dyn.rychlost / 60);
  };
  const stav = (t, vstup = {}, dyn) => {
    const d = dyn || novaDynamika();
    const u = t - d.u0;
    let oci = "spi", usta = "usmev", spi = 0;
    if (d.faze === "spi") spi = clamp((t - d.konec - 0.6) / 1.2);
    else if (d.faze === "vstava") [oci, usta] = u < 0.6 ? ["ospale", "zev"] : u < 0.9 ? ["otevrene", "o"] : ["otevrene", "usmev"];
    else if (d.faze === "let") [oci, usta] = t - d.smich < 0.7 ? ["smich", "ach"] : ["otevrene", "usmev"];
    else if (d.faze === "navrat") [oci, usta] = ["ospale", "usmev"];
    else if (d.faze === "zataha") [oci, usta] = ["spi", "usmev"];
    const letu = d.faze === "let" ? 1 : d.faze === "vstava" ? smooth((u - 1) / 1.2) : d.faze === "navrat" ? 0.5 : 0;
    return {
      t, faze: d.faze, oci, usta, spi, mrk: oci === "otevrene" ? mrkani(t, [0.8, 3.1, 3.3], 4.6) : 0, pohled: d.pohled,
      hlava: { H: d.H, rh: d.rh, smer: d.smer }, drak: { P: d.P, sila: 1, zbytek: d.faze === "vstava" || (d.faze === "let" && d.l < DELKA) ? kouleR(OBJEM - kouleV(d.rh) - objemValecku(d.l)) : 0 },
      vousy: d.vousy, perla: d.perla, let: letu, obla: d.obla, jiskry: d.jiskry, vyhonek: d.vyhonek, rychlost: d.rychlost,
    };
  };
  const snimek = (st) => Math.floor(st.t * 30);
  /* spící hrouda dýchá, v letu se nehýbe jako celek */
  const pohybHroudy = (st) => {
    if (st.faze !== "spi") return { ox: LUZKO[0], oy: LUZKO[1] + R_HROUDA, sx: 1, sy: 1 };
    const dech = Math.sin((st.t / 4) * Math.PI * 2);
    return { ox: LUZKO[0], oy: LUZKO[1] + R_HROUDA, sx: 1 - 0.012 * dech, sy: 1 + 0.024 * dech };
  };

  return {
    id: "v2",
    viewBox: "0 0 180 180",
    defs,
    novaDynamika,
    krok,
    stav,
    sum: (st) => ({ mira: st.faze === "let" || st.faze === "navrat" ? clamp((st.rychlost - 20) / 70) * 0.9 : 0, f: 380 + st.rychlost * 9, q: 0.7, typ: "bandpass", pan: clamp((st.hlava.H[0] - 90) / 80, -1, 1) }),
    klidne: { t: 9.4 },
    vrstvy: [
      { id: "papir", kresli: vrstvaPapir, tezka: true },
      { id: "krajina", kresli: vrstvaKrajina, tezka: true },
      { id: "kartus", kresli: vrstvaKartus },
      { id: "odraz", kresli: vrstvaOdraz, klic: snimek },
      { id: "breh", kresli: vrstvaBreh, tezka: true },
      { id: "obla", kresli: vrstvaObla, klic: (st) => Math.floor(st.t * 20) },
      { id: "drak", kresli: kresliDraka, klic: (st) => (st.faze === "spi" ? `s${st.oci}${f(st.mrk)}` : snimek(st)), pohyb: pohybHroudy },
      { id: "zzz", kresli: vrstvaZzz, klic: (st) => Math.floor(st.t * 15) },
      { id: "mrak", kresli: () => mrak(124, 76, 38, 9) + mrak(132, 82.4, 20, 21, { barva: "#EFE6D6" }) },
      { id: "perla", kresli: vrstvaPerla, klic: snimek, styl: "mix-blend-mode:screen" },
      { id: "jiskry", kresli: vrstvaJiskry, klic: snimek },
      { id: "textura", kresli: vrstvaTextura, tezka: true, styl: "mix-blend-mode:multiply" },
    ],
  };
})();

/* ═══════════════════════════════════════════════════════════════════
 * 3 — SUIKINKUTSU
 * Kus čajové zahrady za soumraku, vyříznutý i se zemí pod ní. Nahoře
 * kamenná nádržka cukubai, u které se před čajovým obřadem myjí ruce
 * („Mokré ruce, prosím“), bambusový přívod kakei a šiši-odoši — bambusová
 * trubka, která se naplní vodou, překlopí, vyleje ji a klapne o kámen.
 * Voda steče do oblázků „moře“ před nádržkou a pod nimi je zakopaný
 * hliněný džbán dnem vzhůru: suikinkutsu, „jeskyně vodní citery“. Kapky
 * padají otvorem do mělké louže na dně a džbán zní jako zvoneček.
 *
 * Hlínka v džbánu spí — kami země bydlí přece v zemi — na plochém kameni,
 * pod javorovým listem místo peřiny. Kolem ní plavou její dvě světýlka a od
 * louže se jim po klenbě vlní odlesky. Když hladina stoupne až k ní, na
 * chvilku se probudí: mokro má ráda.
 *
 * Kliknutí: naběračka hišaku nabere vodu z nádržky a vylije ji do oblázků,
 * za chvíli se pod zemí rozezvoní deset, dvacet kapek. Myš nad nádržkou
 * čeří vodu, myš v džbánu přitahuje světýlka. Šiši-odoši klape samo.
 * Ve větvi javoru visí podzim, sem tam spadne list.
 * ═══════════════════════════════════════════════════════════════════ */
const V3 = (() => {
  const VB = 180;
  const zemY = (x) => 70 + 1.1 * Math.sin(x / 13 + 0.4) + 2.4 * Math.max(0, Math.cos(((x - 84) / 24) * (Math.PI / 2)));
  const DZBAN = [[11, 88], [14, 92], [27, 100], [36, 110], [39, 118], [38, 128], [34.5, 140], [31, 150], [29.4, 156], [29, 158]].map(([hw, y]) => [hw, y]);
  const STRED_X = 86;
  const STENA = 3.2;
  const OTVOR = { x: STRED_X, y: 91.4 };
  const DNO = 156.4;
  const HLADINA0 = 150.6;
  const obrysDzbanu = (rozsir = 0) => {
    const L = vzorkuj(DZBAN.map(([hw, y]) => [STRED_X - hw - rozsir, y]), 6);
    const P = vzorkuj(DZBAN.map(([hw, y]) => [STRED_X + hw + rozsir, y]), 6);
    return `M${pt(L[0])} L${L.slice(1).map(pt).join(" L")} L${P.slice().reverse().map(pt).join(" L")} Z`;
  };
  /** Vnitřek džbánu: obrys zmenšený o stěnu, nahoře o tloušťku dna. */
  const VNITREK = (() => {
    const B = DZBAN.map(([hw, y], i) => [Math.max(2, hw - STENA), i === 0 ? 91.4 : y]);
    const L = vzorkuj(B.map(([hw, y]) => [STRED_X - hw, y]), 6);
    const P = vzorkuj(B.map(([hw, y]) => [STRED_X + hw, y]), 6);
    const dno = DNO + 1.6;
    return `M${pt(L[0])} L${L.slice(1).map(pt).join(" L")} L${pt([L[L.length - 1][0], dno])} L${pt([P[P.length - 1][0], dno])} L${P.slice().reverse().map(pt).join(" L")} Z`;
  })();
  const sirkaUvnitr = (y) => {
    let i = 1;
    while (i < DZBAN.length - 1 && DZBAN[i][1] < y) i++;
    const a = DZBAN[i - 1], b = DZBAN[i];
    return lerp(a[0], b[0], clamp((y - a[1]) / (b[1] - a[1] || 1))) - STENA;
  };
  /* Hlínka na kameni vlevo v džbánu */
  const FIG = { x: 66, y: 148.6, s: 0.205 };
  const FIGT = `translate(${FIG.x} ${FIG.y}) scale(${FIG.s}) translate(-90 -${HL.spodek})`;
  const naPanel = ([x, y]) => [FIG.x + (x - 90) * FIG.s, FIG.y + (y - HL.spodek) * FIG.s];
  const STRED = naPanel([90, 98]);
  /* Šiši-odoši: čep, trubka 28 dlouhá, otevřený konec vlevo */
  const SHISHI = { P: [124, 55.4], l1: 17, l2: 11, klid: 22, naklon: -38 };
  const konceShishi = (uhel) => {
    const a = rad(uhel);
    return { O: [SHISHI.P[0] - Math.cos(a) * SHISHI.l1, SHISHI.P[1] - Math.sin(a) * SHISHI.l1], Z: [SHISHI.P[0] + Math.cos(a) * SHISHI.l2, SHISHI.P[1] + Math.sin(a) * SHISHI.l2] };
  };
  const KAKEI_USTI = [109.4, 43.2];
  const NADRZ = { x: 82, y: 55.2, rx: 17, ry: 5, h: 15 };
  const NADRZ_VODA = [[82, 53.7], [86.6, 55.2], [82, 56.7], [77.4, 55.2]];
  const UMI = { x: 84, y: 69.8, rx: 21 };
  const LUCERNA = [28, 70];
  const OKNO = [28, 45.2];

  /** Javorový list momidži: sedm laloků, prostřední nejdelší. */
  const momijiD = (cx, cy, r, a = 0) => {
    const B = [];
    const laloky = [0.62, 0.86, 1, 0.86, 0.62, 0.42, 0.42];
    const n = 7;
    for (let i = 0; i < n; i++) {
      const u = a - Math.PI / 2 + ((i - 3) * Math.PI * 2) / 8.4;
      const l = laloky[i] * r;
      const zub = u + Math.PI / 8.4;
      B.push([cx + Math.cos(u) * l, cy + Math.sin(u) * l]);
      if (i < n - 1) B.push([cx + Math.cos(zub) * r * 0.32, cy + Math.sin(zub) * r * 0.32]);
    }
    B.push([cx + Math.cos(a + Math.PI / 2) * r * 0.18, cy + Math.sin(a + Math.PI / 2) * r * 0.18]);
    return `M${pt(B[0])} L${B.slice(1).map(pt).join(" L")} Z`;
  };
  const BARVY_JAVORU = ["#C4432B", "#D65A2E", "#E2852E", "#B5382A", "#E9A23A"];

  /* ——— Statické vrstvy ——— */
  const KUPOLE = "M12 72 C8 30 42 4 90 4 C138 4 172 30 168 72 Z";
  const KUS = `M12 70 L${Array.from({ length: 40 }, (_, i) => pt([12 + (i / 39) * 156, zemY(12 + (i / 39) * 156)])).join(" L")} C174 112 150 173 90 175 C30 173 6 112 12 70 Z`;
  const vrstvaNebe = () => {
    const r = rng(1590);
    let hvezdy = "";
    for (let i = 0; i < 40; i++) hvezdy += kruhD(20 + r() * 140, 8 + r() * 30, 0.2 + r() * 0.35);
    /* vrány letí domů na noc */
    let vrany = "";
    for (const [x, y, s] of [[52, 34, 1], [58, 31.6, 0.8], [47, 30, 0.7]]) vrany += `M${f(x - 2.4 * s)} ${f(y - 0.6 * s)} q${f(1.2 * s)} ${f(-1 * s)} ${f(2.4 * s)} ${f(0.6 * s)} q${f(1.2 * s)} ${f(-1.6 * s)} ${f(2.6 * s)} ${f(-0.6 * s)}`;
    return (
      `<g mask="url(#hz3-mlha)"><path d="${KUPOLE}" fill="url(#hz3-nebe)"/>` +
      `<path d="${hvezdy}" fill="#F4ECD8" opacity="0.8"/>` +
      `<circle cx="38" cy="22" r="1.1" fill="#FFF6DA"/><circle cx="38" cy="22" r="4" fill="url(#hz3-vecernice)"/>` +
      `<path d="${vrany}" stroke="#3A3044" stroke-width="0.6" fill="none" stroke-linecap="round"/>` +
      `<path d="M12 64 C40 58 70 62 96 58 C124 54 150 58 168 56 V72 H12 Z" fill="#7E6E9E" opacity="0.5"/>` +
      `<path d="M12 66 C34 62 58 66 84 63 C112 60 140 64 168 61 V72 H12 Z" fill="#9A7EA0" opacity="0.4"/></g>`
    );
  };
  const vrstvaPlot = () => {
    let s = "";
    for (let x = 100; x <= 166; x += 6) s += `<rect x="${f(x - 1)}" y="${f(38 + (x % 12 === 4 ? -2 : 0))}" width="2" height="${f(32 - (x % 12 === 4 ? -2 : 0))}" rx="1" fill="#9A8256" stroke="#4E3E26" stroke-width="0.35"/>`;
    for (const y of [44, 53, 62]) s += `<rect x="98" y="${y - 0.9}" width="70" height="1.8" rx="0.9" fill="#A88E5E" stroke="#4E3E26" stroke-width="0.35"/>`;
    let uzly = "";
    for (let x = 100; x <= 166; x += 6) for (const y of [44, 53, 62]) uzly += `M${f(x - 1)} ${f(y - 0.8)} l2 1.6 M${f(x + 1)} ${f(y - 0.8)} l-2 1.6`;
    s += `<path d="${uzly}" stroke="#1E1612" stroke-width="0.5"/>`;
    return `<g opacity="0.72">${s}</g>`;
  };
  const vrstvaRez = () => {
    let s = `<path d="${KUS}" fill="url(#hz3-zem)"/>`;
    const r = rng(2468);
    let kaminky = "", tecky = "", koreny = "";
    for (let i = 0; i < 26; i++) {
      const x = 18 + r() * 144, y = 78 + r() * 88;
      if (Math.abs(x - STRED_X) < 44 && y > 84 && y < 162) continue;
      if (Math.hypot((x - 90) / 82, (y - 70) / 104) > 0.93) continue;
      kaminky += `<path d="${hrouda(x, y, 1.6 + r() * 2.4, 1 + r() * 1.6, i * 7, { bodu: 9, kolisani: 0.15 })}" fill="${r() < 0.5 ? "#7A6E62" : "#8E8274"}" stroke="#3A2E24" stroke-width="0.3"/>`;
    }
    for (let i = 0; i < 160; i++) {
      const x = 14 + r() * 152, y = 74 + r() * 98;
      if (Math.hypot((x - 90) / 80, (y - 70) / 104) > 0.96) continue;
      tecky += kruhD(x, y, 0.2 + r() * 0.4);
    }
    for (const [x0, k] of [[30, 1], [128, -1], [150, -1], [48, 1]]) {
      let x = x0, y = zemY(x0) + 1, d = `M${f(x)} ${f(y)}`;
      for (let i = 0; i < 6; i++) {
        x += k * (1 + r() * 2.4);
        y += 2.6 + r() * 2;
        d += ` L${f(x)} ${f(y)}`;
      }
      koreny += d;
    }
    s += `<path d="${tecky}" fill="#2E2218" opacity="0.5"/>` + kaminky;
    s += `<path d="${koreny}" stroke="#2E2218" stroke-width="0.45" fill="none" stroke-linecap="round"/>`;
    /* štěrk kolem džbánu a pod mořem: voda jím prosakuje k otvoru */
    let sterk = "";
    for (let i = 0; i < 150; i++) {
      const y = 72 + r() * 90;
      const hw = y < 88 ? 22 - (y - 72) * 0.4 : sirkaUvnitr(Math.min(158, y)) + STENA + 3 + r() * 3;
      const x = STRED_X + (r() - 0.5) * 2 * (y < 88 ? hw : hw + 2);
      if (y >= 88 && Math.abs(x - STRED_X) < sirkaUvnitr(Math.min(158, y)) + STENA) continue;
      sterk += kruhD(x, y, 0.7 + r() * 1.1);
    }
    s += `<path d="${sterk}" fill="#8C887E" stroke="#4A443C" stroke-width="0.25"/>`;
    /* džbán v řezu: řez stěnou je cihlový, vnitřek tmavý */
    s += `<path d="${obrysDzbanu(0.5)}" fill="#3A2416"/>`;
    s += `<path d="${obrysDzbanu(0)}" fill="url(#hz3-strep)"/>`;
    s += `<path d="${VNITREK}" fill="url(#hz3-dutina)"/>`;
    s += `<rect x="${OTVOR.x - 2.2}" y="86" width="4.4" height="6" fill="#1A120E"/>`;
    /* okraj hrdla dole, kameny podstavce a odtok vpravo */
    s += `<path d="M${STRED_X - 31.4} 155.6 h5 v3 h-5 Z M${STRED_X + 26.4} 155.6 h5 v3 h-5 Z" fill="#B66A40" stroke="#3A2416" stroke-width="0.4"/>`;
    let podstavec = "";
    for (let i = 0; i < 9; i++) {
      const x = STRED_X - 36 + i * 9 + (i % 2) * 1.6;
      podstavec += `<path d="${hrouda(x, 162, 4.6, 2.6, 90 + i, { bodu: 10, kolisani: 0.12 })}" fill="${i % 2 ? "#7E7A72" : "#8E8A82"}" stroke="#3A342E" stroke-width="0.4"/>`;
    }
    s += podstavec;
    s += `<path d="M112 157.4 L134 159" stroke="#2A1E16" stroke-width="3.4" stroke-linecap="round"/><path d="M112 157.4 L134 159" stroke="#6E5A44" stroke-width="2.2" stroke-linecap="round"/>`;
    /* kořínky visí ze spodku kusu */
    let visi = "";
    for (const x of [34, 56, 78, 104, 128, 146]) {
      const y = 70 + 104 * Math.sqrt(Math.max(0, 1 - ((x - 90) / 82) ** 2)) * 0.995;
      visi += `M${x} ${f(Math.min(173, y - 1))} q${f(r() * 2 - 1)} ${f(2 + r() * 2)} ${f(r() * 3 - 1.5)} ${f(4 + r() * 3)}`;
    }
    s += `<path d="${visi}" stroke="#4E3E30" stroke-width="0.55" stroke-linecap="round" fill="none"/>`;
    s += `<path d="${KUS}" fill="none" stroke="#2E2218" stroke-width="0.8"/>`;
    return s;
  };
  /** Zahrada nad zemí: mech, lucerna, nádržka, oblázky moře. */
  const vrstvaZahrada = () => {
    let s = "";
    const r = rng(1357);
    /* mechový koberec sugigoke po celé ploše */
    const vrch = Array.from({ length: 60 }, (_, i) => {
      const x = 12 + (i / 59) * 156;
      return [x, zemY(x) - 1.6 - Math.abs(Math.sin(i * 1.9)) * 1.4];
    });
    s += `<path d="M12 ${f(zemY(12) + 2)} L${vrch.map(pt).join(" L")} L168 ${f(zemY(168) + 2)} Z" fill="url(#hz3-mech)" stroke="#2E3A1E" stroke-width="0.5"/>`;
    let chomacky = "";
    for (let i = 0; i < 90; i++) {
      const x = 13 + r() * 154;
      if (Math.abs(x - UMI.x) < UMI.rx) continue;
      const y = zemY(x) - 1 - r() * 1.4;
      chomacky += `M${f(x)} ${f(y)} l${f((r() - 0.5) * 0.8)} ${f(-1 - r())}`;
    }
    s += `<path d="${chomacky}" stroke="#8FA25E" stroke-width="0.5" stroke-linecap="round"/>`;
    /* kamenná lucerna */
    const [lx, ly] = LUCERNA;
    s += `<g stroke="#3E3A34" stroke-width="0.5" stroke-linejoin="round">` +
      `<path d="M${lx - 7.4} ${ly} L${lx - 6.6} ${ly - 5.6} H${lx + 6.6} L${lx + 7.4} ${ly} Z" fill="#8A867E"/>` +
      `<rect x="${lx - 2.2}" y="${ly - 18}" width="4.4" height="12.6" fill="#8E8A82"/>` +
      `<path d="M${lx - 6.8} ${ly - 18} L${lx - 6} ${ly - 21.4} H${lx + 6} L${lx + 6.8} ${ly - 18} Z" fill="#9A968E"/>` +
      `<rect x="${lx - 5}" y="${ly - 29.4}" width="10" height="8" fill="#8E8A82"/>` +
      `<rect x="${lx - 2.6}" y="${ly - 27.6}" width="5.2" height="4.8" fill="#FFC56A"/>` +
      `<path d="M${lx - 12} ${ly - 29} Q${lx - 11} ${ly - 31.4} ${lx - 6} ${ly - 33} L${lx} ${ly - 36.2} L${lx + 6} ${ly - 33} Q${lx + 11} ${ly - 31.4} ${lx + 12} ${ly - 29} Q${lx + 11.6} ${ly - 30.6} ${lx + 13.2} ${ly - 31.4} M${lx - 12} ${ly - 29} Q${lx - 11.6} ${ly - 30.6} ${lx - 13.2} ${ly - 31.4}" fill="#9A968E"/>` +
      `<path d="M${lx - 12} ${ly - 29} H${lx + 12}" stroke-width="0.8"/>` +
      `<path d="M${lx} ${ly - 36} q-2 -1.4 0 -4 q2 2.6 0 4 Z" fill="#9A968E"/></g>`;
    s += `<path d="${kruhD(lx - 4, ly - 2, 1.6)}${kruhD(lx + 3, ly - 20, 1.1)}${kruhD(lx - 7, ly - 30.4, 1.2)}" fill="#6E8044" opacity="0.85"/>`;
    /* nádržka cukubai: kulatá jako mince, uprostřed čtvercová vodní jamka */
    const { x, y, rx, ry, h } = NADRZ;
    s += `<path d="M${x - rx} ${y} V${y + h - 2} Q${x} ${y + h + ry * 0.9} ${x + rx} ${y + h - 2} V${y} Z" fill="url(#hz3-kamen)" stroke="#3A3632" stroke-width="0.6"/>`;
    s += `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#A8A49A" stroke="#3A3632" stroke-width="0.6"/>`;
    s += `<path d="M${pt(NADRZ_VODA[0])} L${NADRZ_VODA.slice(1).map(pt).join(" L")} Z" fill="#2A2E3A" stroke="#4E4A44" stroke-width="0.5"/>`;
    /* znaky kolem jamky: 吾唯足知 se čte i se čtverečkem uprostřed (ten slouží jako 口) */
    s += [["五", x, y - 3.4], ["隹", x + 8.6, y + 0.2], ["止", x, y + 3.6], ["矢", x - 8.6, y + 0.2]].map(([z, zx, zy]) => `<text x="${f(zx)}" y="${f(zy)}" font-size="2.6" text-anchor="middle" dominant-baseline="central" fill="#5E5A52" transform="translate(0 ${f(zy)}) scale(1 0.42) translate(0 ${f(-zy)})" style="font-family: var(--f-kanji, 'Yuji Syuku', 'Yu Mincho', serif)">${z}</text>`).join("");
    s += `<path d="M${x - rx + 2} ${y + 3} Q${x - rx + 1.4} ${y + 8} ${x - rx + 3} ${y + 11}" stroke="#C8C4BA" stroke-width="0.7" fill="none" opacity="0.7"/>`;
    s += `<path d="${kruhD(x - 12, y + 9, 1.4)}${kruhD(x + 13, y + 6, 1)}${kruhD(x + 9.6, y + 11, 1.3)}" fill="#6E8044" opacity="0.8"/>`;
    /* moře: tmavé oblázky v prohlubni před nádržkou */
    let oblazky = "", lesky = "";
    for (let i = 0; i < 46; i++) {
      const x = UMI.x + (r() - 0.5) * 2 * UMI.rx * 0.95;
      const y = zemY(x) - 0.6 - r() * 1.8;
      const rx = 1 + r() * 0.9;
      oblazky += `M${f(x - rx)} ${f(y)} a${f(rx)} ${f(rx * 0.62)} 0 1 0 ${f(2 * rx)} 0 a${f(rx)} ${f(rx * 0.62)} 0 1 0 ${f(-2 * rx)} 0`;
      lesky += kruhD(x - rx * 0.35, y - rx * 0.25, 0.28);
    }
    s += `<path d="${oblazky}" fill="#4A4E58" stroke="#22242A" stroke-width="0.25"/><path d="${lesky}" fill="#C9D4E0" opacity="0.7"/>`;
    return s;
  };
  const vrstvaJavor = () => {
    const vetev = [[184, 2], [164, 8], [146, 12], [130, 18], [118, 26], [111, 31]];
    let s = `<path d="${pasPoBodech(vzorkuj(vetev, 5), (u) => lerp(3, 0.8, u))}" fill="#3A2A24"/>`;
    const r = rng(1011);
    let vetvicky = "", listy = "";
    for (let i = 0; i < 16; i++) {
      const { p } = naCare(vzorkuj(vetev, 5), 0.15 + (i / 15) * 0.85);
      const a = rad(60 + r() * 80);
      const d = 4 + r() * 6;
      const q = [p[0] + Math.cos(a) * d * (r() < 0.5 ? -1 : 1) * 0.6, p[1] + Math.sin(a) * d];
      vetvicky += `M${pt(p)} L${pt(q)}`;
      listy += `<path d="${momijiD(q[0], q[1] + 1.4, 3 + r() * 1.4, (r() - 0.5) * 0.9)}" fill="${BARVY_JAVORU[Math.floor(r() * BARVY_JAVORU.length)]}" stroke="#7A2418" stroke-width="0.25"/>`;
    }
    return s + `<path d="${vetvicky}" stroke="#3A2A24" stroke-width="0.5"/>` + listy;
  };

  /* ——— Živé vrstvy ——— */
  /** Uvnitř džbánu: záře světýlek, odlesky od louže na klenbě, prstence zvuku. */
  const vrstvaKlenba = (st) => {
    let s = "";
    for (const [x, y, op] of st.svetla) s += `<circle cx="${f(x)}" cy="${f(y)}" r="26" fill="url(#hz3-zare)" opacity="${f(op)}"/>`;
    /* odlesky: vlnité světlé čáry nahoře v klenbě, víc rozčeřené po kapce */
    const ruch = st.ruch;
    let d = "";
    for (let k = 0; k < 6; k++) {
      const y0 = 97 + k * 4.2;
      const hw = sirkaUvnitr(y0) - 1;
      const B = [];
      for (let i = 0; i <= 12; i++) {
        const x = STRED_X - hw + (i / 12) * 2 * hw;
        B.push([x, y0 + Math.sin(x * 0.19 + st.t * (0.9 + k * 0.17) + k * 1.3) * (1.2 + ruch * 1.8) + Math.sin(x * 0.07 - st.t * 0.6) * 0.8]);
      }
      d += hladka(B);
    }
    s += `<path d="${d}" stroke="#BFE8D2" stroke-width="0.4" fill="none" opacity="${f(clamp(0.06 + 0.12 * st.jas + 0.3 * ruch))}"/>`;
    for (const v of st.vlny) {
      const u = clamp(v.u / 1.7);
      for (const k of [0, 0.22]) {
        const uu = clamp(u - k);
        if (uu <= 0 || uu >= 1) continue;
        s += `<circle cx="${f(v.x)}" cy="${f(HLADINA0 - st.hladina)}" r="${f(4 + uu * 64)}" fill="none" stroke="#F2D88A" stroke-width="${f(0.7 * (1 - uu) + 0.12)}" opacity="${f((1 - uu) * 0.4 * v.sila)}"/>`;
      }
    }
    return `<g clip-path="url(#hz3-dutina-orez)">${s}</g>`;
  };
  const vrstvaLouze = (st) => {
    const yh = HLADINA0 - st.hladina;
    const hw = sirkaUvnitr(yh) - 0.4;
    let s = `<path d="M${f(STRED_X - hw)} ${f(yh)} H${f(STRED_X + hw)} V${DNO + 2} H${f(STRED_X - hw)} Z" fill="url(#hz3-louze)"/>`;
    s += `<ellipse cx="${STRED_X}" cy="${f(yh)}" rx="${f(hw)}" ry="2.2" fill="#24384A" opacity="0.85"/>`;
    for (const [x, , op] of st.svetla) s += `<ellipse cx="${f(x)}" cy="${f(yh + 0.3)}" rx="3.4" ry="0.8" fill="#FFE7A6" opacity="${f(op * 0.7)}"/>`;
    for (const k of st.kruhy) {
      const u = clamp(k.u / 1.4);
      s += `<ellipse cx="${f(k.x)}" cy="${f(yh)}" rx="${f(1 + u * 16)}" ry="${f(0.3 + u * 1.9)}" fill="none" stroke="#CDE7F2" stroke-width="${f(0.5 * (1 - u) + 0.1)}" opacity="${f((1 - u) * 0.9)}"/>`;
    }
    return `<g clip-path="url(#hz3-dutina-orez)">${s}</g>`;
  };
  const vrstvaKapky = (st) => {
    let s = "";
    for (const k of st.kapky) s += `<path d="M${f(k.x)} ${f(k.y - 1.6)} q0.9 1.4 0 2.2 q-0.9 -0.8 0 -2.2 Z" fill="#CFE9F6"/>`;
    for (const c of st.cakance) s += `<circle cx="${f(c.x)}" cy="${f(c.y)}" r="0.45" fill="#CFE9F6" opacity="${f(clamp(1 - c.vek / 0.5))}"/>`;
    return `<g clip-path="url(#hz3-dutina-orez)">${s}</g>`;
  };
  const vrstvaProsak = (st) => st.prosak.map((p) => `<circle cx="${f(p.x)}" cy="${f(p.y)}" r="0.7" fill="#BFE6F5" opacity="${f(p.op)}"/>`).join("");
  const vrstvaHlinka = (st) =>
    `<path d="${hrouda(FIG.x, FIG.y + 1.4, 9.4, 3, 77, { bodu: 12, kolisani: 0.08 })}" fill="#6E6A62" stroke="#2A2622" stroke-width="0.45"/>` +
    `<path d="${hrouda(FIG.x - 9.4, FIG.y - 2.2, 3, 2, 12, { bodu: 9 })}" fill="#8A847A" stroke="#2A2622" stroke-width="0.35"/>` +
    `<g transform="${FIGT}">${hlVyhonek({ kyv: st.vyhonek })}<g filter="url(#hz3-tah)">${hlTelo("hz3", { obrys: "#2A2018" })}${hlNohy()}</g>${hlTvar("hz3", { oci: st.oci, usta: st.usta, mrk: st.mrk, tvare: st.tvare, dx: st.pohled[0], dy: st.pohled[1] })}</g>` +
    /* javorový list jako peřina, přes nožky a bříško */
    `<g transform="translate(${f(STRED[0] + 1)} ${f(STRED[1] + 7)}) scale(1 0.62)"><path d="${momijiD(0, 0, 11.6, 0.18)}" fill="#C4432B" stroke="#6E2014" stroke-width="0.45"/>` +
    `<path d="M0 0 L-4.4 -9.6 M0 0 L3.6 -10.4 M0 0 L9.4 -4.6 M0 0 L-9.6 -3 M0 0 L1.6 6" stroke="#8E2A1A" stroke-width="0.4" fill="none"/></g>`;
  const vrstvaZzz = (st) => (st.spi > 0.02 ? zzz(st.t, STRED[0] + 6, STRED[1] - 6, { barva: "#F2E6C8", meritko: 0.4, sila: st.spi * 0.85 }) : "");
  const vrstvaSvetla = (st) => st.svetla.map(([x, y, op]) => svetylko("hz3", x, y, 1.5, op)).join("");
  const vrstvaNadrz = (st) => {
    let s = "";
    for (const k of st.nadrzKruhy) {
      const u = clamp(k.u / 1);
      s += `<ellipse cx="${f(k.x)}" cy="${f(k.y)}" rx="${f(0.6 + u * 4.2)}" ry="${f(0.25 + u * 1.3)}" fill="none" stroke="#BCD2E2" stroke-width="0.3" opacity="${f(1 - u)}"/>`;
    }
    s += `<path d="M78.6 54.6 L81 54" stroke="#E8D9B4" stroke-width="0.5" opacity="${f(0.3 + 0.3 * Math.sin(st.t * 1.3))}"/>`;
    if (st.listNaVode) s += `<path d="${momijiD(st.listNaVode[0], st.listNaVode[1], 2.4, st.listNaVode[2])}" transform="translate(0 ${f(st.listNaVode[1])}) scale(1 0.5) translate(0 ${f(-st.listNaVode[1])})" fill="#D65A2E" stroke="#7A2418" stroke-width="0.2"/>`;
    return `<g clip-path="url(#hz3-nadrz-orez)">${s}</g>`;
  };
  const vrstvaShishi = (st) => {
    const { O, Z } = konceShishi(st.shishi);
    let s = "";
    /* přívod kakei z plotu: bambus s kolénky na vidlici */
    s += `<path d="M162 37.4 L${pt(KAKEI_USTI)}" stroke="#4E3A1E" stroke-width="3.6" stroke-linecap="butt"/><path d="M162 37.4 L${pt(KAKEI_USTI)}" stroke="#B8A05E" stroke-width="2.6"/>`;
    s += `<path d="M126 38.4 v2.4 M146 37.9 v2.4" stroke="#4E3A1E" stroke-width="0.6"/>`;
    s += `<path d="M138 70 L138 44 M138 46 L135 40.6 M138 46 L141 40.6" stroke="#5E4A2E" stroke-width="1.4" stroke-linecap="round"/>`;
    /* proud z kakei do trubky */
    const blesk = Math.sin(st.t * 23) * 0.3;
    s += `<path d="M${f(KAKEI_USTI[0] - 0.6)} ${f(KAKEI_USTI[1] + 0.9)} Q${f(KAKEI_USTI[0] - 1.8 + blesk)} ${f(KAKEI_USTI[1] + 3)} ${f(O[0] + 0.6)} ${f(Math.max(KAKEI_USTI[1] + 2, O[1] - 1))}" stroke="#CFE9F6" stroke-width="0.7" fill="none" opacity="0.85"/>`;
    /* kámen, o který trubka klapne, a dva sloupky s čepem */
    s += `<path d="${hrouda(SHISHI.P[0] + 11, 63.4, 6.4, 3.6, 5, { bodu: 10, kolisani: 0.1 })}" fill="#8E8A82" stroke="#3A3632" stroke-width="0.5"/>`;
    s += `<rect x="${SHISHI.P[0] - 1.6}" y="${SHISHI.P[1] - 1}" width="3.2" height="${f(70 - SHISHI.P[1] + 1)}" rx="0.8" fill="#8E6E42" stroke="#3E2E1A" stroke-width="0.4"/>`;
    /* trubka: zešikmený otevřený konec, kolénko u čepu */
    const a = Math.atan2(Z[1] - O[1], Z[0] - O[0]);
    const nx = -Math.sin(a), ny = Math.cos(a);
    const w = 1.9;
    const O1 = [O[0] + nx * w + Math.cos(a) * 1.6, O[1] + ny * w + Math.sin(a) * 1.6], O2 = [O[0] - nx * w, O[1] - ny * w];
    const Z1 = [Z[0] + nx * w, Z[1] + ny * w], Z2 = [Z[0] - nx * w, Z[1] - ny * w];
    s += `<path d="M${pt(O1)} L${pt(Z1)} Q${pt([Z[0] + Math.cos(a) * 1.2, Z[1] + Math.sin(a) * 1.2])} ${pt(Z2)} L${pt(O2)} Z" fill="url(#hz3-bambus)" stroke="#3E2E1A" stroke-width="0.45" stroke-linejoin="round"/>`;
    s += `<ellipse cx="${f(lerp(O1[0], O2[0], 0.5))}" cy="${f(lerp(O1[1], O2[1], 0.5))}" rx="${f(w * 0.6)}" ry="${f(w)}" transform="rotate(${f((a * 180) / Math.PI)} ${f(lerp(O1[0], O2[0], 0.5))} ${f(lerp(O1[1], O2[1], 0.5))})" fill="#3A2E1E"/>`;
    const kol = [lerp(O[0], Z[0], 0.62), lerp(O[1], Z[1], 0.62)];
    s += `<path d="M${pt([kol[0] + nx * w, kol[1] + ny * w])} L${pt([kol[0] - nx * w, kol[1] - ny * w])}" stroke="#4E3A1E" stroke-width="0.6"/>`;
    s += `<circle cx="${SHISHI.P[0]}" cy="${SHISHI.P[1]}" r="0.9" fill="#3E2E1A"/>`;
    /* když se vylévá: proud do oblázků */
    if (st.vylev > 0.02) {
      const cil = [UMI.x + 15, zemY(UMI.x + 15) - 1];
      s += `<path d="M${pt(O)} Q${pt([lerp(O[0], cil[0], 0.4), O[1] + 2])} ${pt(cil)}" stroke="#CFE9F6" stroke-width="${f(0.4 + st.vylev * 1.6)}" fill="none" stroke-linecap="round" opacity="${f(0.9 * st.vylev)}"/>`;
    }
    return s;
  };
  const vrstvaNaberacka = (st) => {
    const { C, fi, psi } = st.naberacka;
    const cs = Math.cos(rad(fi)), sn = Math.sin(rad(fi));
    const konec = [C[0] + cs * 30, C[1] + sn * 30];
    let s = `<path d="M${pt([C[0] + cs * 2.6, C[1] + sn * 2.6])} L${pt(konec)}" stroke="#5E4A2E" stroke-width="1.5" stroke-linecap="round"/><path d="M${pt([C[0] + cs * 2.6, C[1] + sn * 2.6])} L${pt(konec)}" stroke="#D9BE84" stroke-width="0.8" stroke-linecap="round"/>`;
    s += `<g transform="translate(${f(C[0])} ${f(C[1])}) rotate(${f(psi)})"><rect x="-2.8" y="-2.4" width="5.6" height="5" rx="0.8" fill="url(#hz3-bambus)" stroke="#3E2E1A" stroke-width="0.45"/><ellipse cx="0" cy="-2.4" rx="2.8" ry="0.9" fill="${st.naberacka.plna ? "#9FC4DA" : "#3A2E1E"}" stroke="#3E2E1A" stroke-width="0.35"/></g>`;
    if (st.lije > 0.02) {
      const ret = [C[0] + Math.cos(rad(psi - 90)) * 2.6 - 2, C[1] + Math.sin(rad(psi - 90)) * 2.6];
      const cil = [UMI.x - 4, zemY(UMI.x - 4) - 1];
      s += `<path d="M${pt(ret)} Q${pt([ret[0] - 2, lerp(ret[1], cil[1], 0.5)])} ${pt(cil)}" stroke="#CFE9F6" stroke-width="${f(0.5 + st.lije * 1.4)}" fill="none" stroke-linecap="round" opacity="${f(0.92 * st.lije)}"/>`;
      for (let i = 0; i < 4; i++) {
        const a = st.t * 9 + i * 1.6;
        s += `<circle cx="${f(cil[0] + Math.cos(a) * (1 + (i % 2)) * 1.4)}" cy="${f(cil[1] - Math.abs(Math.sin(a)) * 2.2)}" r="0.4" fill="#DFF1F8" opacity="${f(st.lije)}"/>`;
      }
    }
    return s;
  };
  const vrstvaListy = (st) => st.listy.map((l) => `<path d="${momijiD(l.x, l.y, 2.4, l.rot)}" transform="translate(${f(l.x)} ${f(l.y)}) scale(${f(Math.cos(l.flip))} 1) translate(${f(-l.x)} ${f(-l.y)})" fill="${l.barva}" stroke="#7A2418" stroke-width="0.2" opacity="${f(l.op ?? 1)}"/>`).join("");
  const vrstvaLucerna = (st) => `<circle cx="${OKNO[0]}" cy="${OKNO[1]}" r="20" fill="url(#hz3-lucerna)" opacity="${f(0.75 + 0.15 * Math.sin(st.t * 7.3) * Math.sin(st.t * 3.1))}"/>`;

  const defs = () =>
    hlDefs("hz3", { tvare: "#E0906E" }) +
    `<linearGradient id="hz3-nebe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3A4680"/><stop offset="0.35" stop-color="#5E5E9C"/><stop offset="0.62" stop-color="#9A82AE"/><stop offset="0.85" stop-color="#D49AA8"/><stop offset="1" stop-color="#F4BA90"/></linearGradient>` +
    `<radialGradient id="hz3-vecernice"><stop offset="0" stop-color="#FFF6DA" stop-opacity="0.8"/><stop offset="1" stop-color="#FFF6DA" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="hz3-mlha-g" cx="0.5" cy="0.62" r="0.62"><stop offset="0.72" stop-color="#FFFFFF"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient>` +
    `<mask id="hz3-mlha" maskUnits="userSpaceOnUse" x="0" y="0" width="180" height="80"><rect x="0" y="0" width="180" height="80" fill="url(#hz3-mlha-g)"/><rect x="0" y="60" width="180" height="20" fill="#FFFFFF"/></mask>` +
    `<linearGradient id="hz3-zem" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6E5440"/><stop offset="0.4" stop-color="#584232"/><stop offset="1" stop-color="#3A2A20"/></linearGradient>` +
    `<linearGradient id="hz3-strep" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9A4E2C"/><stop offset="0.5" stop-color="#C47A4C"/><stop offset="1" stop-color="#9A4E2C"/></linearGradient>` +
    `<radialGradient id="hz3-dutina" cx="0.5" cy="0.85" r="0.75"><stop offset="0" stop-color="#3A2C24"/><stop offset="0.6" stop-color="#211812"/><stop offset="1" stop-color="#140E0B"/></radialGradient>` +
    `<clipPath id="hz3-dutina-orez"><path d="${VNITREK}"/></clipPath>` +
    `<clipPath id="hz3-nadrz-orez"><path d="M${pt(NADRZ_VODA[0])} L${NADRZ_VODA.slice(1).map(pt).join(" L")} Z"/></clipPath>` +
    `<linearGradient id="hz3-louze" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2E4A60"/><stop offset="1" stop-color="#14202C"/></linearGradient>` +
    `<radialGradient id="hz3-zare"><stop offset="0" stop-color="#FFE7A6" stop-opacity="0.5"/><stop offset="0.45" stop-color="#E9B86A" stop-opacity="0.16"/><stop offset="1" stop-color="#E9B86A" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="hz3-lucerna"><stop offset="0" stop-color="#FFD58A" stop-opacity="0.75"/><stop offset="0.35" stop-color="#FFB45A" stop-opacity="0.25"/><stop offset="1" stop-color="#FFB45A" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="hz3-mech" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6E8048"/><stop offset="1" stop-color="#46562E"/></linearGradient>` +
    `<linearGradient id="hz3-kamen" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6E6A62"/><stop offset="0.35" stop-color="#A29E94"/><stop offset="1" stop-color="#5E5A52"/></linearGradient>` +
    `<linearGradient id="hz3-bambus" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D9C384"/><stop offset="0.5" stop-color="#B8A05E"/><stop offset="1" stop-color="#8E7A42"/></linearGradient>` +
    `<filter id="hz3-tah" x="-8%" y="-8%" width="116%" height="116%"><feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="4" result="vlna"/><feDisplacementMap in="SourceGraphic" in2="vlna" scale="2.2" xChannelSelector="R" yChannelSelector="G"/></filter>`;

  /* ——— Simulace ——— */
  /* stupnice in (miyako-bushi), jak zní koto: d, es, g, a, b o dvě oktávy výš */
  const TONY = [1174.7, 1244.5, 1568, 1760, 1864.7, 2349.3, 2489];
  const NAB_KLID = { C: [97.6, 53.2], fi: 190, psi: 0 };
  const DRAHA_NAB = [
    { u: 0, ...NAB_KLID, plna: false },
    { u: 0.55, C: [83.4, 57.4], fi: 214, psi: 0, plna: false },
    { u: 0.95, C: [83.4, 57.4], fi: 214, psi: 0, plna: true },
    { u: 1.45, C: [86, 45], fi: 205, psi: 0, plna: true },
    { u: 1.95, C: [76, 58.4], fi: 168, psi: 0, plna: true },
    { u: 2.25, C: [76, 58.4], fi: 168, psi: -96, plna: true },
    { u: 2.95, C: [76, 58.4], fi: 168, psi: -96, plna: false },
    { u: 3.6, ...NAB_KLID, plna: false },
  ];
  const naberacka = (u) => {
    if (u < 0 || u >= 3.6) return { ...NAB_KLID, plna: false };
    let i = 0;
    while (i < DRAHA_NAB.length - 2 && DRAHA_NAB[i + 1].u <= u) i++;
    const A = DRAHA_NAB[i], B = DRAHA_NAB[i + 1];
    const k = smooth((u - A.u) / (B.u - A.u));
    return { C: [lerp(A.C[0], B.C[0], k), lerp(A.C[1], B.C[1], k)], fi: lerp(A.fi, B.fi, k), psi: lerp(A.psi, B.psi, k), plna: A.plna };
  };
  const novaDynamika = () => ({
    nab: -10, fronta: [], kapky: [], kruhy: [], vlny: [], cakance: [], prosak: [], hladina: 0, mokro: -10, posledniTon: -1,
    shishi: SHISHI.klid, shishiV: 0, napln: 0.35, faze: "plni", vylev: 0, nadrzKruhy: [], listy: [], listNaVode: null, listCas: 4,
    svetla: [[78, 118, 1], [100, 128, 1]], svetlaV: [[0, 0], [0, 0]], ruch: 0, nahoda: rng(1499), zvuk: [], pohled: [0, 0], cvrcek: 5, seep: 3, vyhonek: 0,
  });
  /** Voda prosákne oblázky: za chvíli začnou do džbánu padat kapky, nepravidelně jako v opravdovém. */
  const prosakni = (dyn, R, t, kolik, x0) => {
    let c = t + 0.9 + R() * 0.4;
    for (let i = 0; i < kolik; i++) {
      dyn.fronta.push({ t: c, sila: 0.55 + R() * 0.45 });
      if (R() < 0.18) dyn.fronta.push({ t: c + 0.05 + R() * 0.06, sila: 0.4 });
      c += 0.12 + -Math.log(1 - R() * 0.95) * 0.32;
    }
    for (let i = 0; i < kolik; i++) dyn.prosak.push({ x0: x0 + (R() - 0.5) * 24, y0: 70 + R() * 2, t0: t + R() * 0.5, d: 0.9 + R() * 0.5, x: 0, y: 0, op: 0 });
  };
  const krok = (dyn, t, dt, vstup) => {
    const R = dyn.nahoda;
    if (vstup.kliky && vstup.kliky.length) {
      vstup.kliky.length = 0;
      if (t - dyn.nab > 3.7) {
        dyn.nab = t;
        dyn.zvuk.push({ druh: "nabrat", sila: 0.8, pan: 0 });
      }
    }
    const un = t - dyn.nab;
    if (un > 1.95 && un - dt <= 1.95) dyn.zvuk.push({ druh: "lit", sila: 1, pan: -0.1 });
    if (un > 2.3 && un - dt <= 2.3) prosakni(dyn, R, t, 16 + Math.floor(R() * 6), UMI.x - 4);
    /* šiši-odoši: plní se, překlopí, vyleje, klapne */
    if (dyn.faze === "plni") {
      dyn.napln += dt / 7.5;
      dyn.shishi = lerp(SHISHI.klid, SHISHI.klid - 6, smooth(dyn.napln));
      if (dyn.napln >= 1) {
        dyn.faze = "klopi";
        dyn.fazeOd = t;
      }
    } else if (dyn.faze === "klopi") {
      const u = (t - dyn.fazeOd) / 0.42;
      dyn.shishi = lerp(SHISHI.klid - 6, SHISHI.naklon, Math.pow(clamp(u), 2));
      dyn.vylev = clamp((u - 0.5) * 2);
      if (u >= 1) {
        dyn.faze = "vylevá";
        dyn.fazeOd = t;
        dyn.zvuk.push({ druh: "splach", sila: 0.6, pan: 0.3 });
        prosakni(dyn, R, t, 7 + Math.floor(R() * 4), UMI.x + 12);
      }
    } else if (dyn.faze === "vylevá") {
      const u = (t - dyn.fazeOd) / 0.45;
      dyn.vylev = 1 - clamp(u);
      dyn.napln = 0;
      if (u >= 1) {
        dyn.faze = "vraci";
        dyn.fazeOd = t;
        dyn.shishiV = 0;
      }
    } else if (dyn.faze === "vraci") {
      /* prázdná trubka padá zpátky — těžší konec je u kamene */
      dyn.shishiV += 900 * dt;
      dyn.shishi += dyn.shishiV * dt;
      if (dyn.shishi >= SHISHI.klid) {
        dyn.shishi = SHISHI.klid;
        if (dyn.shishiV > 60) {
          dyn.zvuk.push({ druh: "kon", sila: clamp(dyn.shishiV / 300), pan: 0.4 });
          dyn.shishiV = -dyn.shishiV * 0.22;
        } else {
          dyn.faze = "plni";
          dyn.shishiV = 0;
        }
      }
    }
    /* prosakování a samovolné kapky (zbytková voda) */
    dyn.seep -= dt;
    if (dyn.seep <= 0) {
      dyn.seep = 5 + R() * 6;
      dyn.fronta.push({ t: t + 0.1, sila: 0.4 + R() * 0.3 });
    }
    for (const p of dyn.prosak) {
      const u = (t - p.t0) / p.d;
      p.op = u < 0 ? 0 : Math.sin(Math.PI * clamp(u));
      const k = smooth(clamp(u));
      p.x = lerp(p.x0, OTVOR.x, k);
      p.y = lerp(p.y0, OTVOR.y - 1, k) + Math.sin(u * 9) * 0.6;
    }
    dyn.prosak = dyn.prosak.filter((p) => t - p.t0 < p.d);
    /* fronta kapek: v daný čas se kapka odtrhne od otvoru */
    dyn.fronta.sort((a, b) => a.t - b.t);
    while (dyn.fronta.length && dyn.fronta[0].t <= t) {
      const q = dyn.fronta.shift();
      dyn.kapky.push({ x: OTVOR.x + (R() - 0.5) * 1.2, y: OTVOR.y + 1, vy: 0, sila: q.sila });
    }
    const yh = HLADINA0 - dyn.hladina;
    for (const k of dyn.kapky) {
      k.vy += 520 * dt;
      k.y += k.vy * dt;
    }
    const dopadle = dyn.kapky.filter((k) => k.y >= yh);
    dyn.kapky = dyn.kapky.filter((k) => k.y < yh);
    for (const k of dopadle) {
      /* tón: náhodný ze stupnice, ale ne dvakrát po sobě stejný */
      let i = Math.floor(R() * TONY.length);
      if (i === dyn.posledniTon) i = (i + 1 + Math.floor(R() * 3)) % TONY.length;
      dyn.posledniTon = i;
      dyn.zvuk.push({ druh: "suikin", sila: k.sila, f: TONY[i] * (1 + (R() - 0.5) * 0.006), pan: (R() - 0.5) * 0.3 });
      dyn.kruhy.push({ x: k.x, t0: t });
      dyn.vlny.push({ x: k.x, t0: t, sila: k.sila });
      for (let j = 0; j < 3; j++) dyn.cakance.push({ x: k.x, y: yh, vx: (R() - 0.5) * 22, vy: -16 - R() * 22, vek: 0 });
      dyn.hladina = Math.min(4.4, dyn.hladina + 0.16);
      dyn.ruch = Math.min(1.4, dyn.ruch + 0.5 * k.sila);
    }
    for (const c of dyn.cakance) {
      c.vek += dt;
      c.vy += 260 * dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
    }
    dyn.cakance = dyn.cakance.filter((c) => c.vek < 0.5 && c.y <= yh + 0.5);
    dyn.kruhy = dyn.kruhy.filter((k) => t - k.t0 < 1.4);
    dyn.vlny = dyn.vlny.filter((v) => t - v.t0 < 2.1);
    /* odtok drží hladinu nízko */
    dyn.hladina = Math.max(0, dyn.hladina - dt * 0.22);
    dyn.ruch *= Math.exp(-dt / 0.9);
    if (dyn.hladina > 2.6 && t - dyn.mokro > 6) {
      dyn.mokro = t;
      dyn.zvuk.push({ druh: "chichot", sila: 0.6 });
    }
    /* světýlka: líně plavou v klenbě, myš v džbánu je přitáhne */
    const vDzbanu = vstup.mys && vstup.mys.y > 92 && vstup.mys.y < 156 && Math.abs(vstup.mys.x - STRED_X) < sirkaUvnitr(vstup.mys.y);
    dyn.svetla.forEach((s, i) => {
      let cil = i === 0 ? [76 + 7 * Math.sin(t * 0.37), 116 + 6 * Math.sin(t * 0.53 + 1)] : [100 + 6 * Math.sin(t * 0.31 + 2), 126 + 5 * Math.sin(t * 0.47)];
      if (vDzbanu) cil = [vstup.mys.x + (i ? 6 : -6) + Math.sin(t * 2 + i) * 2, vstup.mys.y + Math.cos(t * 1.7 + i) * 2];
      const v = dyn.svetlaV[i];
      [s[0], v[0]] = pruzina(s[0], v[0], cil[0], dt, 3, 2.2);
      [s[1], v[1]] = pruzina(s[1], v[1], cil[1], dt, 3, 2.2);
      s[2] = clamp(0.62 + 0.38 * Math.sin(t * (0.9 + i * 0.4) + i * 2));
    });
    /* myš nad nádržkou čeří vodu a voda občas přeteče */
    const naVode = vstup.mys && Math.abs(vstup.mys.x - NADRZ.x) < 10 && Math.abs(vstup.mys.y - NADRZ.y) < 6;
    if (naVode && (vstup.rychlost || 0) > 20 && R() < dt * 9) {
      dyn.nadrzKruhy.push({ x: vstup.mys.x, y: NADRZ.y, t0: t });
      if (R() < 0.18) dyn.fronta.push({ t: t + 1.2 + R(), sila: 0.5 });
    }
    if (R() < dt * 0.6) dyn.nadrzKruhy.push({ x: NADRZ.x + (R() - 0.5) * 6, y: NADRZ.y + (R() - 0.5) * 1.6, t0: t });
    dyn.nadrzKruhy = dyn.nadrzKruhy.filter((k) => t - k.t0 < 1);
    /* javor: jednou za čas spadne list, na nádržce chvíli pluje */
    dyn.listCas -= dt;
    if (dyn.listCas <= 0) {
      dyn.listCas = 9 + R() * 7;
      const { p } = naCare([[150, 12], [130, 18], [116, 28]], R());
      dyn.listy.push({ x: p[0], y: p[1] + 3, vx: -3 - R() * 4, vy: 4, rot: R() * 6, rotV: (R() - 0.5) * 3, flip: R() * 6, flipV: 3 + R() * 3, barva: BARVY_JAVORU[Math.floor(R() * 5)], fz: R() * 6 });
    }
    const zbyle = [];
    for (const l of dyn.listy) {
      if (l.lezi) {
        l.vek += dt;
        l.op = 1 - clamp((l.vek - 8) / 3);
        if (l.op > 0.01) zbyle.push(l);
        continue;
      }
      l.vx += (Math.sin(t * 1.3 + l.fz) * 9 - l.vx) * dt * 1.2;
      l.vy += (8 - l.vy) * dt * 2;
      l.x += l.vx * dt;
      l.y += l.vy * dt;
      l.rot += l.rotV * dt;
      l.flip += l.flipV * dt;
      if (Math.abs(l.x - NADRZ.x) < 4.4 && Math.abs(l.y - NADRZ.y) < 1.6 && !dyn.listNaVode) {
        dyn.listNaVode = [l.x, NADRZ.y, l.rot, t];
        dyn.nadrzKruhy.push({ x: l.x, y: NADRZ.y, t0: t });
        continue;
      }
      if (l.y >= zemY(l.x) - 1.4) {
        l.lezi = true;
        l.vek = 0;
        l.flip = 0;
        zbyle.push(l);
        continue;
      }
      zbyle.push(l);
    }
    dyn.listy = zbyle.slice(-8);
    if (dyn.listNaVode) {
      const u = t - dyn.listNaVode[3];
      dyn.listNaVode[0] = NADRZ.x + Math.sin(u * 0.4) * 2.2;
      dyn.listNaVode[2] += dt * 0.15;
      if (u > 14) dyn.listNaVode = null;
    }
    /* cvrček suzumuši */
    dyn.cvrcek -= dt;
    if (dyn.cvrcek <= 0) {
      dyn.cvrcek = 7 + R() * 7;
      dyn.zvuk.push({ druh: "cvrcek", sila: 0.6, pan: 0.6 - R() * 1.2 });
    }
    const cp = vDzbanu ? [clamp((vstup.mys.x - STRED[0]) / 20, -1, 1) * 2, clamp((vstup.mys.y - STRED[1]) / 20, -1, 1) * 1.6] : [0, 0];
    dyn.pohled = dyn.pohled.map((q, i) => q + (cp[i] - q) * (1 - Math.exp(-dt / 0.2)));
    dyn.vyhonek = Math.sin(t * 0.7) * 4;
  };
  const stav = (t, vstup = {}, dyn) => {
    const d = dyn || novaDynamika();
    const um = t - d.mokro;
    let oci = "spi", usta = "usmev", spi = 1, tvare = 0.4;
    const posledni = d.vlny.length ? t - d.vlny[d.vlny.length - 1].t0 : 9;
    if (posledni < 0.6) tvare = 0.4 + 0.35 * (1 - posledni / 0.6);
    if (um >= 0 && um < 2.6) [oci, usta, spi, tvare] = um < 2 ? ["smich", "ach", 0, 0.8] : ["ospale", "usmev", 0, 0.6];
    const vDzbanu = vstup.mys && vstup.mys.y > 92 && vstup.mys.y < 156 && Math.abs(vstup.mys.x - STRED_X) < sirkaUvnitr(vstup.mys.y);
    if (vDzbanu && oci === "spi") [oci, spi] = ["ospale", 0.3];
    const nab = naberacka(t - d.nab);
    const un = t - d.nab;
    return {
      t, oci, usta, spi, tvare, mrk: 0, pohled: d.pohled, svetla: d.svetla, ruch: d.ruch, jas: (d.svetla[0][2] + d.svetla[1][2]) / 2,
      vlny: d.vlny.map((v) => ({ x: v.x, u: t - v.t0, sila: v.sila })), kruhy: d.kruhy.map((k) => ({ x: k.x, u: t - k.t0 })),
      kapky: d.kapky, cakance: d.cakance, prosak: d.prosak, hladina: d.hladina, shishi: d.shishi, vylev: d.vylev,
      naberacka: nab, lije: un > 2.15 && un < 2.95 ? Math.sin(Math.PI * clamp((un - 2.15) / 0.8)) : 0,
      nadrzKruhy: d.nadrzKruhy.map((k) => ({ x: k.x, y: k.y, u: t - k.t0 })), listy: d.listy, listNaVode: d.listNaVode, vyhonek: d.vyhonek,
    };
  };
  const snimek = (st) => Math.floor(st.t * 30);
  const dech = (st) => {
    const k = Math.sin((st.t / 4.2) * Math.PI * 2);
    return { ox: FIG.x, oy: FIG.y, sx: 1 - 0.012 * k, sy: 1 + 0.03 * k };
  };

  return {
    id: "v3",
    viewBox: `0 0 ${VB} ${VB}`,
    defs,
    novaDynamika,
    krok,
    stav,
    sum: (st) => ({ mira: 0.2 + 0.5 * st.vylev + 0.4 * st.lije, f: 2300, q: 1.1, typ: "bandpass", pan: 0.3 }),
    klidne: { t: 7.4 },
    vrstvy: [
      { id: "nebe", kresli: vrstvaNebe, tezka: true },
      { id: "plot", kresli: vrstvaPlot, tezka: true },
      { id: "rez", kresli: vrstvaRez, tezka: true },
      { id: "klenba", kresli: vrstvaKlenba, klic: (st) => Math.floor(st.t * 20), styl: "mix-blend-mode:screen" },
      { id: "louze", kresli: vrstvaLouze, klic: snimek },
      { id: "hlinka", kresli: vrstvaHlinka, klic: (st) => `${st.oci},${st.usta},${f(st.tvare)},${f(st.pohled[0])},${f(st.pohled[1])},${Math.round(st.vyhonek)}`, pohyb: dech },
      { id: "zzz", kresli: vrstvaZzz, klic: (st) => Math.floor(st.t * 15) },
      { id: "kapky", kresli: vrstvaKapky, klic: snimek },
      { id: "svetla", kresli: vrstvaSvetla, klic: (st) => Math.floor(st.t * 20), styl: "mix-blend-mode:screen" },
      { id: "prosak", kresli: vrstvaProsak, klic: snimek },
      { id: "zahrada", kresli: vrstvaZahrada, tezka: true },
      { id: "lucerna", kresli: vrstvaLucerna, klic: (st) => Math.floor(st.t * 12), styl: "mix-blend-mode:screen" },
      { id: "nadrz", kresli: vrstvaNadrz, klic: (st) => Math.floor(st.t * 20) },
      { id: "shishi", kresli: vrstvaShishi, klic: (st) => `${f(st.shishi)},${f(st.vylev)},${Math.floor(st.t * 12)}` },
      { id: "naberacka", kresli: vrstvaNaberacka, klic: (st) => `${st.naberacka.C.map(f).join()},${f(st.naberacka.psi)},${f(st.lije)},${st.lije > 0 ? snimek(st) : 0}` },
      { id: "javor", kresli: vrstvaJavor },
      { id: "listy", kresli: vrstvaListy, klic: snimek },
    ],
  };
})();

/** Obsah vrstvy i s ořezem tušovou skvrnou — stejně ho skládá běh i statický snímek. */
const obsahVrstvy = (v, st) => {
  const obsah = v.kresli(st);
  return v.orez && obsah ? `<g clip-path="url(#${v.orez})">${obsah}</g>` : obsah;
};

/**
 * Celá kresba jako jedno SVG — pro náhled v Node, nebo jako statický první
 * snímek, který komponenta vloží do stránky (s třídou místo rozměrů).
 */
const celeSvg = (V, t, dyn, vstup = {}, { sirka = 900, pozadi = "#F7F1E3", trida = null } = {}) => {
  const st = V.stav(t, vstup, dyn);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${V.viewBox}" ${trida ? `class="${trida}" aria-hidden="true" focusable="false"` : `width="${sirka}" height="${sirka}"`}>` +
    `<defs>${V.defs()}</defs>` +
    (pozadi ? `<rect x="-50" y="-50" width="400" height="400" fill="${pozadi}"/>` : "") +
    V.vrstvy
      .map((v) => {
        const obsah = obsahVrstvy(v, st);
        const p = v.pohyb ? v.pohyb(st) : null;
        const tr = p ? ` transform="translate(${f(p.ox + (p.x || 0))} ${f(p.oy + (p.y || 0))}) rotate(${f(p.r || 0)}) scale(${f(p.sx ?? 1)} ${f(p.sy ?? 1)}) translate(${f(-p.ox)} ${f(-p.oy)})"` : "";
        const op = v.pruhlednost ? ` opacity="${v.pruhlednost(st)}"` : "";
        return `<g style="${v.styl || ""}"${tr}${op}>${obsah}</g>`;
      })
      .join("") +
    `</svg>`
  );
};

/** Přetočí simulaci na čas t (pro první snímek a pro klidný režim). */
const pretoc = (V, t, vstup = {}, krokS = 1 / 60) => {
  const dyn = V.novaDynamika();
  for (let q = 0; q < t; q += krokS) V.krok(dyn, q, krokS, typeof vstup === "function" ? vstup(q) : vstup);
  dyn.zvuk.length = 0;
  return dyn;
};

export const kresby = { v1: V1, v2: V2, v3: V3, sakura: kamiSakura, ruce: lemRuce, lampion };
export { celeSvg, pretoc, obsahVrstvy };
