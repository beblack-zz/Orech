/*
 * Kapka a hrom — společné kusy kreseb (./kami-kruh.js, tušový lem
 * a ./lampion.js): pomocníci, Kapka rozebraná na kusy, bubny hromu, stuha,
 * bouřkový mráček, provaz pro všechno, co vlaje, a tušový lem.
 *
 * Kapka je bůh hromu Raidžin v malém: za zády nese kruh bubnů a na každém
 * se točí mitsudomoe. Kresba je její podoba z characters/kami-buh/
 * KapkaRaijin.astro, jak ji zná stránka — ploché barvy, stín jako ujetý
 * druhý průchod risografu v barvách loga, oči magatama, dřevěné geta —
 * a bubny z rumělkového laku se zlatými cvočky a stuha z pozdější podoby
 * se stuhou (scripts/kapka-bubny, v4). Tady je jen rozebraná na kusy, se
 * kterými jde hýbat, tělo má místo jedné barvy měkký přechod a tvář umí
 * víc výrazů.
 *
 * Souřadnice postavy jsou souřadnice původní kresby 0–180: tělo je o výšku
 * geta výš (naGeta), spodek zubů je na y = 159,2.
 */

/* ——— Pomocníci ——— */
export const f = (n) => Math.round(n * 100) / 100;
export const rng = (a) => () => {
  a |= 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const smooth = (x) => {
  x = clamp(x);
  return x * x * (3 - 2 * x);
};
export const rad = (d) => (d * Math.PI) / 180;
export const deg = (r) => (r * 180) / Math.PI;
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgbHex = (c) => "#" + c.map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0")).join("");
export const mix = (a, b, k) => {
  const A = hexRgb(a);
  const B = hexRgb(b);
  return rgbHex(A.map((v, i) => v + (B[i] - v) * clamp(k)));
};
export const pt = (p) => `${f(p[0])} ${f(p[1])}`;
export const cara = (body) => "M" + body.map(pt).join(" L");
/** Pružina k cíli, nezávislá na snímkovce: k je časová konstanta v sekundách. */
export const kCili = (v, cil, dt, k) => v + (cil - v) * (1 - Math.exp(-dt / k));
/*
 * Telefon dostane méně částic — stejný dotaz jako telefon() v parta2/kvalita.ts.
 * Kresby musí jít pustit i v Node (první snímek při buildu, zkouška vystoupení),
 * proto bez importu; mimo prohlížeč platí plný počet.
 */
const NA_TELEFONU = typeof matchMedia === "function" && matchMedia("(hover: none) and (pointer: coarse)").matches;
/** Hustota částic jako násobek četnosti: 1, na telefonu 0,5 */
export const HUSTOTA = NA_TELEFONU ? 0.5 : 1;
/** Překročil čas mezi dvěma snímky hranici x? */
export const pres = (a, b, x) => a < x && b >= x;

/** Catmull-Rom přes body → hladká křivka z kubických Bézierů. */
export const hladka = (P, zavrena = false) => {
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
/** Body na stejné křivce, hustě — pro stuhy a tahy s proměnnou šířkou. */
export const vzorkuj = (P, naUsek = 8) => {
  const n = P.length;
  const g = (i) => P[clamp(i, 0, n - 1)];
  const out = [];
  for (let i = 0; i < n - 1; i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    for (let k = 0; k < naUsek; k++) {
      const t = k / naUsek, u = 1 - t;
      out.push([
        u * u * u * p1[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p2[0],
        u * u * u * p1[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p2[1],
      ]);
    }
  }
  out.push(P[n - 1]);
  return out;
};
/** Normály lomené čáry (jednotkové, vlevo od směru). */
export const normaly = (B) =>
  B.map((_, i) => {
    const a = B[Math.max(0, i - 1)], b = B[Math.min(B.length - 1, i + 1)];
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [-(b[1] - a[1]) / d, (b[0] - a[0]) / d];
  });
/** Lomená čára s proměnnou šířkou → uzavřený tvar. sirka(t) pro t 0…1. */
export const pasPoBodech = (B, sirka) => {
  const L = [], Pr = [];
  const N = normaly(B);
  const n = B.length;
  for (let i = 0; i < n; i++) {
    const w = sirka(i / (n - 1)) / 2;
    L.push([B[i][0] + N[i][0] * w, B[i][1] + N[i][1] * w]);
    Pr.push([B[i][0] - N[i][0] * w, B[i][1] - N[i][1] * w]);
  }
  return `${cara(L)} L${Pr.reverse().map(pt).join(" L")} Z`;
};
export const delky = (B) => {
  const D = [0];
  for (let i = 1; i < B.length; i++) D.push(D[i - 1] + Math.hypot(B[i][0] - B[i - 1][0], B[i][1] - B[i - 1][1]));
  return D;
};
/** Bod na lomené čáře v délce s od začátku (D jsou délky od začátku ke každému bodu). */
export const bodNaCare = (B, D, s) => {
  if (s <= 0) return B[0];
  for (let i = 1; i < B.length; i++) {
    if (D[i] >= s) {
      const k = (s - D[i - 1]) / (D[i] - D[i - 1] || 1);
      return [lerp(B[i - 1][0], B[i][0], k), lerp(B[i - 1][1], B[i][1], k)];
    }
  }
  return B[B.length - 1];
};
/** Nepravidelný oblý tvar kolem středu: poloměr kolísá podle seedu. */
export const hrouda = (cx, cy, rx, ry, seed, { bodu = 18, kolisani = 0.14 } = {}) => {
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
export const mrkani = (t, casy, perioda) => {
  const tt = perioda ? ((t % perioda) + perioda) % perioda : t;
  let m = 0;
  for (const c of casy) {
    const u = tt - c;
    if (u > 0 && u < 0.17) m = Math.max(m, Math.sin((Math.PI * u) / 0.17));
  }
  return m;
};
/** Čtyřcípá jiskra kolem počátku. */
export const jiskraD = (r) => `M0 ${f(-r)} Q${f(r * 0.22)} ${f(-r * 0.22)} ${f(r)} 0 Q${f(r * 0.22)} ${f(r * 0.22)} 0 ${f(r)} Q${f(-r * 0.22)} ${f(r * 0.22)} ${f(-r)} 0 Q${f(-r * 0.22)} ${f(-r * 0.22)} 0 ${f(-r)} Z`;
/** Kapička kolem počátku: špička nahoře, výška v, šířka podle ní. */
export const kapickaD = (v) => `M0 ${f(-v * 0.62)} Q${f(-v * 0.3)} ${f(-v * 0.08)} ${f(-v * 0.3)} ${f(v * 0.14)} A${f(v * 0.3)} ${f(v * 0.3)} 0 0 0 ${f(v * 0.3)} ${f(v * 0.14)} Q${f(v * 0.3)} ${f(-v * 0.08)} 0 ${f(-v * 0.62)} Z`;

/**
 * Chomáč — vroubkovaná elipsa z obloučků, stejná jako v components/parta2/tvary.ts
 * (mraky na obloze webu). Tady je zvlášť, ať kresby běží i v holém Node.
 * `dno` < 1 zploští spodní polovinu, mraky mají rovné břicho.
 */
export const chomac = (cx, cy, rx, ry, pocet, seed, dno = 1, hrbol = 0.62) => {
  const r = rng(seed);
  const z = (n) => Math.round(n * 10) / 10;
  const body = [];
  for (let i = 0; i < pocet; i++) {
    const a = (i / pocet) * Math.PI * 2 + (r() - 0.5) * (Math.PI / pocet) * 0.6;
    const k = 0.88 + r() * 0.2;
    const x = cx + Math.cos(a) * rx * k;
    let y = cy + Math.sin(a) * ry * k;
    if (dno < 1 && y > cy) y = cy + (y - cy) * dno;
    body.push([x, y]);
  }
  let d = `M${z(body[0][0])} ${z(body[0][1])}`;
  for (let i = 0; i < pocet; i++) {
    const [x1, y1] = body[i];
    const [x2, y2] = body[(i + 1) % pocet];
    const rb = Math.hypot(x2 - x1, y2 - y1) * hrbol;
    d += ` A${z(rb)} ${z(rb)} 0 0 1 ${z(x2)} ${z(y2)}`;
  }
  return d + " Z";
};

/* ═══════════════════════════════════════════════════════════════════
 * Kapka: původní kresba (characters/kami-buh/KapkaRaijin.astro)
 * ═══════════════════════════════════════════════════════════════════ */
export const TELO = "M90 38 Q60 85 56 108 Q52 132 72 146 Q82 152 90 152 Q98 152 108 146 Q128 132 124 108 Q120 85 90 38 Z";
const MAGATAMA = "M0 -4.2 C3.2 -4.2 4.8 -1.6 4.4 1.4 C4 4.6 0.8 6.8 -1.8 7.8 C-0.4 5.8 -0.8 4.6 -2.3 3.7 C-4.6 2.5 -4.8 -0.8 -3.1 -2.7 C-2.3 -3.7 -1.2 -4.2 0 -4.2 Z";
const CARKA = "M0 -8.4 A8.4 8.4 0 0 1 8.11 -2.17 A6 6 0 0 0 0 -2.4 Z";
/** Mitsudomoe o poloměru 8,4 kolem počátku. */
export const tomoe = (fill, attrs = "") =>
  `<g fill="${fill}" ${attrs}>${[0, 120, 240].map((u) => `<g transform="rotate(${u})"><path d="${CARKA}"/><circle cy="-5.4" r="3"/></g>`).join("")}</g>`;

/** Odstín loga: tah ensó jde z rumělky do noci. */
export const SOUMRAK = ["#C4432B", "#C0708A", "#7A5E8E", "#4E4A84", "#2A2C5E"];
export const VODA = { svetla: "#9DCBE8", zaklad: "#7FB4D8", hluboka: "#6CA5CE", lesk: "#E4F3FB", okraj: "#C4E4F5", chodidlo: "#5A91BC", oko: "#2C557A", odlesk: "#F2FAFF", tvare: "#E89AA4", jazyk: "#E58A86" };
/** Kam až postava sahá: spodek zubů geta, střed těla (už na geta) a ramena. */
export const KAP = { pata: 159.2, stred: [90, 92], tvar: [90, 98] };
export const RAMENA = { L: [57.5, 106], P: [122.5, 106] };

const stopy = (barvy, kde) => barvy.map((b, i) => `<stop offset="${kde[i]}" stop-color="${b}"/>`).join("");
/** Přechody Kapky: stín v barvách loga a voda. Barvy jdou přeladit (v noci je voda temnější). */
export const kapDefs = (id, { voda = VODA, soumrak = SOUMRAK } = {}) =>
  `<linearGradient id="${id}-soumrak" gradientUnits="userSpaceOnUse" x1="60" y1="150" x2="124" y2="36">${stopy(soumrak, [0, 0.28, 0.55, 0.8, 1])}</linearGradient>` +
  `<linearGradient id="${id}-voda" gradientUnits="userSpaceOnUse" x1="62" y1="52" x2="120" y2="150">${stopy([voda.svetla, voda.zaklad, voda.hluboka], [0, 0.46, 1])}</linearGradient>`;

/** Všechno, co patří k tělu, je o výšku geta výš než na původní kresbě. */
export const naGeta = (s) => `<g transform="translate(0 -12)">${s}</g>`;
/** Tělo: stín z druhého průchodu tisku, voda s měkkým přechodem a dva lesky. */
export const kapTelo = (id, { stin = true, voda = VODA } = {}) =>
  naGeta(
    (stin ? `<path d="${TELO}" fill="url(#${id}-soumrak)" transform="translate(5 -4)"/>` : "") +
      `<path d="${TELO}" fill="url(#${id}-voda)"/>` +
      `<ellipse cx="76" cy="100" rx="8" ry="14" fill="${voda.lesk}" opacity="0.55" transform="rotate(-15 76 100)"/>` +
      `<path d="M119 113 Q120.4 129 105 142" stroke="${voda.okraj}" stroke-width="2.4" stroke-linecap="round" fill="none" opacity="0.36"/>`,
  );
/** Jedno geta: deska, dva zuby. `x` je levý okraj desky. */
export const getaSvg = (x, { deska = "#C99A68", zub = "#8C6444", obrys = "#6B5D4F", linka = "#E2BE8C" } = {}) =>
  `<g stroke="${obrys}" stroke-linejoin="round">` +
  `<path d="M${f(x + 2.4)} 152.2 H${f(x + 6)} V159.2 H${f(x + 2.4)} Z M${f(x + 12)} 152.2 H${f(x + 15.6)} V159.2 H${f(x + 12)} Z" fill="${zub}" stroke-width="0.9"/>` +
  `<rect x="${f(x)}" y="146" width="18" height="6.4" rx="1.4" fill="${deska}" stroke-width="1.1"/>` +
  `<path d="M${f(x + 1.4)} 147.8 H${f(x + 16.6)}" stroke="${linka}" stroke-width="0.9" stroke-linecap="round"/></g>`;
export const GETA_X = [71, 91];
export const kapGeta = (volby) => GETA_X.map((x) => getaSvg(x, volby)).join("");
/** Chodidlo s páskem hanao; `x` je jeho střed (80 a 100). */
export const chodidloSvg = (x, { voda = VODA, pasek = "#C4432B" } = {}) =>
  naGeta(
    `<ellipse cx="${f(x)}" cy="154" rx="8" ry="4" fill="${voda.chodidlo}"/>` +
      `<path d="M${f(x - 6.4)} 158 Q${f(x)} 150.6 ${f(x + 6.4)} 158" stroke="${pasek}" stroke-width="1.9" stroke-linecap="round" fill="none"/>`,
  );
export const kapNohy = (volby) => chodidloSvg(80, volby) + chodidloSvg(100, volby);

/**
 * Tvář v souřadnicích původní kresby (kreslí se přes naGeta). dx/dy posouvá
 * pohled, mrk 0…1 zavírá oči.
 * vyraz: klid | radost | uzas | zapal | blazena | leknuti
 */
export const kapTvar = ({ dx = 0, dy = 0, mrk = 0, vyraz = "klid", voda = VODA, tvareOp = 0.45 } = {}) => {
  const oko = voda.oko;
  const S = `stroke="${oko}" stroke-linecap="round" stroke-linejoin="round" fill="none"`;
  const X = [79.4, 100.6];
  const magatama = (k = 0.95, sy = 1, zved = 0) =>
    X.map((x, i) => `<g transform="translate(${f(x + dx)} ${f(106.4 + dy - zved)}) scale(${i ? k : -k} ${f(k * Math.max(0.08, sy * (1 - mrk * 0.94)))})"><path d="${MAGATAMA}" fill="${oko}"/><circle cx="-0.8" cy="-1.4" r="1.15" fill="${voda.odlesk}"/></g>`).join("");
  const oblouky = (nahoru) =>
    X.map((x) => `<path d="M${f(x - 4.4 + dx)} ${f(107.6 + dy - (nahoru ? 0 : 2.6))} Q${f(x + dx)} ${f(107.6 + dy + (nahoru ? -6.2 : 3.4))} ${f(x + 4.4 + dx)} ${f(107.6 + dy - (nahoru ? 0 : 2.6))}" ${S} stroke-width="2.3"/>`).join("");
  const oboci = (zved, sklon) =>
    `<path d="M${f(74.6 + dx)} ${f(97.2 + dy - zved - sklon)} Q${f(79.4 + dx)} ${f(95.4 + dy - zved)} ${f(84 + dx)} ${f(96.8 + dy - zved + sklon)} M${f(96 + dx)} ${f(96.8 + dy - zved + sklon)} Q${f(100.6 + dx)} ${f(95.4 + dy - zved)} ${f(105.4 + dx)} ${f(97.2 + dy - zved - sklon)}" ${S} stroke-width="1.5" opacity="0.8"/>`;
  const vlnka = `<path d="M83 120 Q86.5 124.6 90 121.6 Q93.5 124.6 97 120" ${S} stroke-width="2"/>`;
  const tv = vyraz === "radost" || vyraz === "blazena" ? 1.25 : 1;
  let s = `<circle cx="72" cy="116" r="${f(5 * tv)}" fill="${voda.tvare}" opacity="${f(clamp(tvareOp * tv))}"/><circle cx="108" cy="116" r="${f(5 * tv)}" fill="${voda.tvare}" opacity="${f(clamp(tvareOp * tv))}"/>`;
  if (vyraz === "radost")
    s += oblouky(true) +
      `<path d="M83.4 119.4 Q90 118 96.6 119.4 Q95.6 127.4 90 127.6 Q84.4 127.4 83.4 119.4 Z" fill="${oko}"/>` +
      `<path d="M86.4 124.6 Q90 122.2 93.6 124.6 Q92 126.9 90 127 Q88 126.9 86.4 124.6 Z" fill="${voda.jazyk}"/>`;
  else if (vyraz === "blazena") s += oblouky(false) + `<path d="M84.6 120.4 Q90 124.8 95.4 120.4" ${S} stroke-width="2"/>`;
  else if (vyraz === "uzas") s += oboci(3.4, 0) + magatama(1.12, 1, 1) + `<ellipse cx="${f(90 + dx * 0.5)}" cy="122.4" rx="2.7" ry="3.3" fill="${oko}"/>`;
  else if (vyraz === "leknuti") s += oboci(4.2, -0.8) + magatama(1.2, 1, 1.4) + `<path d="M84.4 122 Q87.2 119.4 90 122 Q92.8 124.6 95.6 122" ${S} stroke-width="1.9"/>`;
  else if (vyraz === "zapal")
    s += oboci(0.4, 1.1) + magatama(1, 1) +
      `<path d="M83 119.6 Q90 121.2 97 119.6 Q95.4 125.4 90 125.6 Q84.6 125.4 83 119.6 Z" fill="${oko}"/>` +
      `<path d="M85.2 120.6 Q90 121.6 94.8 120.6" stroke="${voda.odlesk}" stroke-width="1.3" stroke-linecap="round" fill="none"/>`;
  else s += magatama() + vlnka;
  return s;
};

/* Ruka s paličkou: paže nemá, je to oblázek u boku, který se natočí; palička z něj trčí */
const DLAN = 9.5, PALICKA = 23;
export const kapRuka = (r, uhel, { voda = VODA, palicka = true, drevo = "#E2BE8C", obrys = "#6B5D4F", omotavka = "#C4432B" } = {}) => {
  const [x, y] = RAMENA[r];
  const a = rad(uhel);
  const c = [Math.cos(a), Math.sin(a)];
  const na = (d) => [x + c[0] * d, y + c[1] * d];
  let s = "";
  if (palicka) {
    s +=
      `<path d="${pasPoBodech([na(DLAN - 4.6), na(DLAN + PALICKA)], (t) => lerp(1.8, 2.7, t))}" fill="${drevo}" stroke="${obrys}" stroke-width="0.6" stroke-linejoin="round"/>` +
      `<circle cx="${f(na(DLAN + PALICKA)[0])}" cy="${f(na(DLAN + PALICKA)[1])}" r="1.45" fill="${drevo}" stroke="${obrys}" stroke-width="0.6"/>` +
      /* omotávka z rumělkového hedvábí těsně nad dlaní */
      `<path d="M${pt(na(DLAN + 3.2))} L${pt(na(DLAN + 6.4))}" stroke="${omotavka}" stroke-width="2.5"/>`;
  }
  const d = na(5.5);
  return s + `<ellipse cx="${f(d[0])}" cy="${f(d[1])}" rx="7" ry="5" transform="rotate(${f(uhel)} ${f(d[0])} ${f(d[1])})" fill="${voda.zaklad}"/>`;
};
/** Švih paže: nápřah, rychlý úder, odraz, pomalý návrat. Vrací −0,32…1 (u je čas od úderu). */
export const svih = (u) => {
  if (u < -0.24 || u > 0.6) return 0;
  if (u < -0.11) return -0.32 * smooth((u + 0.24) / 0.13);
  if (u < 0) return -0.32 + 1.32 * Math.pow((u + 0.11) / 0.11, 2.2);
  if (u < 0.07) return 1 - 0.12 * Math.sin((Math.PI * u) / 0.07);
  return 1 - smooth((u - 0.07) / 0.53);
};

/* ═══════════════════════════════════════════════════════════════════
 * Bubny hromu: rumělkový lak, zlaté cvočky, kůže z gofunu
 * ═══════════════════════════════════════════════════════════════════ */
export const bubenDefs = (id) =>
  `<radialGradient id="${id}-kuze" cx="0.42" cy="0.38" r="0.7"><stop offset="0" stop-color="#FFFBF0"/><stop offset="0.7" stop-color="#F1E8D4"/><stop offset="1" stop-color="#DCCDAE"/></radialGradient>` +
  `<radialGradient id="${id}-shu" cx="0.4" cy="0.35" r="0.75"><stop offset="0.7" stop-color="#D24A2E"/><stop offset="0.86" stop-color="#B5361F"/><stop offset="1" stop-color="#7E2112"/></radialGradient>`;
const cvocky = (n, r, rc) => {
  let s = "";
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    s += `<circle cx="${f(Math.cos(a) * r)}" cy="${f(Math.sin(a) * r)}" r="${f(rc)}"/>`;
  }
  return s;
};
/**
 * Buben kolem počátku o poloměru r, bez znaku (ten se točí zvlášť).
 * `zar` 0…1 rozsvítí kůži po úderu, `bok` je vidět pod ním jako tloušťka.
 */
export const bubenSvg = (id, r = 15.4, { zar = 0, cvocku = 16, bok = true } = {}) => {
  const k = r / 15.4;
  return (
    (bok ? `<circle cx="${f(1.1 * k)}" cy="${f(2.3 * k)}" r="${f(r)}" fill="#3B0F08" stroke="#171310" stroke-width="${f(0.8 * k)}"/>` : "") +
    `<circle r="${f(r)}" fill="#171310"/>` +
    `<circle r="${f(14.4 * k)}" fill="url(#${id}-shu)"/>` +
    `<g fill="#E9C46E">${cvocky(cvocku, 13.35 * k, 0.68 * k)}</g>` +
    `<circle r="${f(11.7 * k)}" fill="url(#${id}-kuze)" stroke="#8C6C48" stroke-width="${f(0.45 * k)}"/>` +
    (zar > 0.01 ? `<circle r="${f(11.7 * k)}" fill="#FFFBEE" opacity="${f(clamp(zar) * 0.85)}"/>` : "") +
    /* lesk laku vlevo nahoře */
    `<path d="M${f(-13.2 * k)} ${f(-5.2 * k)} A${f(14.2 * k)} ${f(14.2 * k)} 0 0 1 ${f(-5.2 * k)} ${f(-13.2 * k)}" fill="none" stroke="#FFE3D2" stroke-width="${f(1.1 * k)}" stroke-linecap="round" opacity="0.8"/>`
  );
};
/** Znak na kůži bubnu o poloměru r, natočený o `uhel`. */
export const znakBubnu = (r, uhel, { barva = "#1B1714", puls = 0 } = {}) =>
  `<g transform="rotate(${f(((uhel % 360) + 360) % 360)}) scale(${f((1.22 * r * (1 + puls * 0.14)) / 15.4)})">${tomoe(barva)}</g>`;

/* ═══════════════════════════════════════════════════════════════════
 * Stuha: líc v barvách loga se zlatým vzorkem kirikane, rub světlejší
 * ═══════════════════════════════════════════════════════════════════ */
export const stuhaDefs = (id, { x1 = 6, x2 = 176 } = {}) =>
  `<linearGradient id="${id}-stuha" gradientUnits="userSpaceOnUse" x1="${x1}" y1="0" x2="${x2}" y2="0">${stopy(SOUMRAK, [0, 0.3, 0.58, 0.82, 1])}</linearGradient>` +
  `<linearGradient id="${id}-stuha-rub" gradientUnits="userSpaceOnUse" x1="${x1}" y1="0" x2="${x2}" y2="0">${stopy(["#E08A70", "#DBA0B2", "#A592BC", "#8580BA", "#626AA6"], [0, 0.3, 0.58, 0.82, 1])}</linearGradient>` +
  /* kirikane: jemný vzor z řezaného zlata na líci stuhy */
  `<pattern id="${id}-kirikane" width="3.2" height="3.2" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">` +
  `<circle cx="0.8" cy="0.8" r="0.34" fill="#F1D27C"/><circle cx="2.4" cy="2.4" r="0.34" fill="#F1D27C"/>` +
  `<path d="M1.6 0.2 V1.4 M1 0.8 H2.2" stroke="#F1D27C" stroke-width="0.18" opacity="0.7"/></pattern>`;
/**
 * Stuha z hustých bodů B. `sirka(s)` je plná šířka v místě s (0…1 od kořene
 * ke špičce), `zkrut(s)` −1…1 ji přetáčí: kde je záporný, ukáže rub, kolem
 * nuly je vidět z boku a ztmavne.
 */
export const stuhaSvg = (id, B, sirka, zkrut, { obrys = "#2A2220", vzor = true } = {}) => {
  const n = B.length;
  const N = normaly(B);
  const strany = B.map((p, i) => {
    const s = i / (n - 1);
    const z = zkrut(s);
    const w = (sirka(s) / 2) * z;
    return { l: [p[0] + N[i][0] * w, p[1] + N[i][1] * w], r: [p[0] - N[i][0] * w, p[1] - N[i][1] * w], lic: z >= 0, w: Math.abs(w) * 2, plna: sirka(s) };
  });
  let s = "";
  let start = 0;
  for (let i = 1; i <= n; i++) {
    if (i === n || strany[i].lic !== strany[start].lic) {
      const kus = strany.slice(start, Math.min(n, i + 1));
      const d = `${cara(kus.map((k) => k.l))} L${kus.map((k) => pt(k.r)).reverse().join(" L")} Z`;
      s += `<path d="${d}" fill="url(#${id}-stuha${strany[start].lic ? "" : "-rub"})" stroke="${obrys}" stroke-width="0.32" stroke-linejoin="round"/>`;
      if (vzor && strany[start].lic) s += `<path d="${d}" fill="url(#${id}-kirikane)" opacity="0.75"/>`;
      start = i;
    }
  }
  /* kde se stuha stáčí bokem, ztmavne */
  let stin = "";
  for (let i = 0; i < n - 2; i += 2) {
    const a = strany[i], b = strany[i + 2];
    const st = clamp(1 - a.w / (a.plna || 1));
    if (st < 0.2) continue;
    stin += `<path d="M${pt(a.l)} L${pt(b.l)} L${pt(b.r)} L${pt(a.r)} Z" opacity="${f(st * 0.3)}"/>`;
  }
  return s + (stin ? `<g fill="#1B1520">${stin}</g>` : "");
};

/* ═══════════════════════════════════════════════════════════════════
 * Provaz: řetěz bodů se stálou délkou článku (Verlet). Je z něj stuha,
 * šňůra i střapec — všechno, co má vlát a jít chytit za konec.
 * ═══════════════════════════════════════════════════════════════════ */
/** Rozloží lomenou čáru na n bodů po stejných krocích L. */
export const poCare = (body, n, L) => {
  const D = delky(body);
  return Array.from({ length: n }, (_, i) => bodNaCare(body, D, Math.min(i * L, D[D.length - 1])));
};
export const novyProvaz = (body) => ({ p: body.map((b) => [b[0], b[1]]), q: body.map((b) => [b[0], b[1]]) });
/**
 * Jeden krok provazu. `koren` drží první bod, `spicka` (když je) poslední,
 * `sila(i, s, x, y)` vrací zrychlení bodu. Délka článku L se nemění.
 * `vodice` jsou očka, kterými je provlečený: [{ i, bod, sila }] přitáhne
 * bod i k místu `bod` (sila 0…1 na jedno kolo, není to pevný úchyt).
 */
export const krokProvazu = (pr, dt, L, { koren, sila, spicka = null, vodice = null, tlum = 1.8, iter = 8, hladkost = 0.06 }) => {
  const n = pr.p.length;
  const k = Math.exp(-tlum * dt);
  for (let i = 1; i < n; i++) {
    const [x, y] = pr.p[i];
    const [ax, ay] = sila(i, i / (n - 1), x, y);
    pr.p[i] = [x + (x - pr.q[i][0]) * k + ax * dt * dt, y + (y - pr.q[i][1]) * k + ay * dt * dt];
    pr.q[i] = [x, y];
  }
  const drz = () => {
    pr.p[0][0] = koren[0];
    pr.p[0][1] = koren[1];
    if (spicka) {
      pr.p[n - 1][0] = spicka[0];
      pr.p[n - 1][1] = spicka[1];
    }
    if (vodice)
      for (const v of vodice) {
        pr.p[v.i][0] += (v.bod[0] - pr.p[v.i][0]) * v.sila;
        pr.p[v.i][1] += (v.bod[1] - pr.p[v.i][1]) * v.sila;
      }
  };
  drz();
  for (let it = 0; it < iter; it++) {
    for (let i = 1; i < n; i++) {
      const a = pr.p[i - 1], b = pr.p[i];
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const d = Math.hypot(dx, dy) || 1e-6;
      const o = (d - L) / d;
      const drziA = i === 1, drziB = !!spicka && i === n - 1;
      if (drziA && drziB) continue;
      if (drziA) {
        b[0] -= dx * o;
        b[1] -= dy * o;
      } else if (drziB) {
        a[0] += dx * o;
        a[1] += dy * o;
      } else {
        a[0] += dx * o * 0.5;
        a[1] += dy * o * 0.5;
        b[0] -= dx * o * 0.5;
        b[1] -= dy * o * 0.5;
      }
    }
    /* trocha tuhosti v ohybu, ať se nelomí do cikcaku */
    if (hladkost)
      for (let i = 1; i < n - 1; i++) {
        pr.p[i][0] += ((pr.p[i - 1][0] + pr.p[i + 1][0]) / 2 - pr.p[i][0]) * hladkost;
        pr.p[i][1] += ((pr.p[i - 1][1] + pr.p[i + 1][1]) / 2 - pr.p[i][1]) * hladkost;
      }
    drz();
  }
};
/** Hodí bodem i provazu rychlostí v (jednotky za sekundu) — odraz po úderu, cuknutí. */
export const hodProvazem = (pr, i, v, dt) => {
  pr.q[i] = [pr.p[i][0] - v[0] * dt, pr.p[i][1] - v[1] * dt];
};

/* ═══════════════════════════════════════════════════════════════════
 * Bouřkový mráček: stejné chomáče jako mraky na obloze webu, jen
 * v barvách soumraku ze značky. Raidžin na mraku stojí; Kapka taky.
 * Kreslí se kolem bodu [0, 0] — to je místo, kde stojí geta.
 * ═══════════════════════════════════════════════════════════════════ */
export const MRAK = { svetlo: "#D3CEE9", stred: "#9C95C4", stin: "#585491", zare: "#F3F0FB", pred: "#6F6AA6", pod: "#3B396E" };
const MRAK_ZADNI = {
  telo: [chomac(0, 3, 64, 9, 18, 5, 0.3, 0.66), chomac(-40, -3, 22, 12, 12, 6, 0.4, 0.7), chomac(0, -7, 28, 13, 14, 7, 0.4, 0.7), chomac(40, -3, 22, 12, 12, 8, 0.4, 0.7)],
  svetlo: [chomac(-44, -9.5, 10, 4.6, 9, 9, 1, 0.7), chomac(-6, -15, 13, 5.2, 10, 10, 1, 0.7), chomac(36, -9.5, 10, 4.6, 9, 11, 1, 0.7)],
};
const MRAK_PREDNI = {
  telo: [chomac(0, 10, 52, 6.5, 16, 21, 0.3, 0.66), chomac(-26, 5, 17, 8.5, 11, 22, 0.4, 0.7), chomac(0, 4.5, 20, 8.5, 12, 23, 0.4, 0.7), chomac(26, 5, 17, 8.5, 11, 24, 0.4, 0.7)],
  svetlo: [chomac(-30, 0.6, 7, 3, 8, 25, 1, 0.7), chomac(-5, -0.6, 9, 3.4, 9, 26, 1, 0.7), chomac(22, 0.6, 7, 3, 8, 27, 1, 0.7)],
};
const cesty = (D) => D.map((d) => `<path d="${d}"/>`).join("");
export const mrakDefs = (id, mrak = MRAK) =>
  `<linearGradient id="${id}-mrak" gradientUnits="userSpaceOnUse" x1="0" y1="-20" x2="0" y2="14">${stopy([mrak.svetlo, mrak.stred, mrak.stin], [0, 0.5, 1])}</linearGradient>` +
  `<linearGradient id="${id}-mrak-pred" gradientUnits="userSpaceOnUse" x1="0" y1="-4" x2="0" y2="17">${stopy([mrak.svetlo, mrak.svetlo, mrak.pred], [0, 0.3, 1])}</linearGradient>` +
  `<radialGradient id="${id}-mrak-svit" gradientUnits="userSpaceOnUse" cx="0" cy="2" r="62"><stop offset="0" stop-color="#FFF9E2"/><stop offset="0.45" stop-color="#FFE7A3" stop-opacity="0.75"/><stop offset="1" stop-color="#FFE7A3" stop-opacity="0"/></radialGradient>` +
  `<filter id="${id}-mekce" x="-20%" y="-40%" width="140%" height="180%"><feGaussianBlur stdDeviation="1.6"/></filter>` +
  `<clipPath id="${id}-mrak-z">${cesty(MRAK_ZADNI.telo)}</clipPath><clipPath id="${id}-mrak-p">${cesty(MRAK_PREDNI.telo)}</clipPath>`;
/** Zadní kupa: patří pod postavu. */
export const mrakZadni = (id, mrak = MRAK) => `<g fill="url(#${id}-mrak)">${cesty(MRAK_ZADNI.telo)}</g><g fill="${mrak.zare}" opacity="0.5">${cesty(MRAK_ZADNI.svetlo)}</g>`;
/** Přední val: geta do něj zapadnou. Měkký stín ho odliší od zadní kupy. */
export const mrakPredni = (id, mrak = MRAK) =>
  `<g fill="${mrak.pod}" opacity="0.3" filter="url(#${id}-mekce)" transform="translate(0 -2)">${cesty(MRAK_PREDNI.telo)}</g>` +
  `<g fill="url(#${id}-mrak-pred)">${cesty(MRAK_PREDNI.telo)}</g><g fill="${mrak.zare}" opacity="0.65">${cesty(MRAK_PREDNI.svetlo)}</g>`;
/** Světlo uvnitř mraku, když zahřmí: `kde` je "z" (zadní kupa) nebo "p" (přední val). Sílu určuje průhlednost vrstvy. */
export const mrakSvit = (id, kde) => `<g clip-path="url(#${id}-mrak-${kde})"><circle cx="0" cy="2" r="62" fill="url(#${id}-mrak-svit)"/></g>`;

/* ═══════════════════════════════════════════════════════════════════
 * Tušový lem jako u Pecinčina raku: skvrna rozpité tuše, v ní celá scéna.
 * Vrací cestu skvrny, vrstvu pod scénu a definice filtrů a ořezu
 * (`${id}-tus-orez`), kterým se scéna ořízne.
 * ═══════════════════════════════════════════════════════════════════ */
export const tusLem = (id, { seed = 4, barva = "#241E29", lem = "#3A3240", stred = [90, 92], polomer = [86, 85], skvrny = [0.09, 0.09, 0.15], silaSkvrn = 1.5 } = {}) => {
  const D = hrouda(stred[0], stred[1], polomer[0], polomer[1], seed, { bodu: 30, kolisani: 0.05 });
  return {
    D,
    skvrna:
      `<path d="${hrouda(stred[0], stred[1], polomer[0] + 4, polomer[1] + 4, seed + 5, { bodu: 30, kolisani: 0.06 })}" fill="${lem}" opacity="0.55" filter="url(#${id}-tus-lem)"/>` +
      `<path d="${D}" fill="${barva}" filter="url(#${id}-tus)"/>`,
    defs:
      `<filter id="${id}-tus" x="-12%" y="-12%" width="124%" height="124%" color-interpolation-filters="sRGB">` +
      `<feTurbulence type="fractalNoise" baseFrequency="0.055" numOctaves="4" seed="${seed + 4}" result="n"/>` +
      `<feDisplacementMap in="SourceGraphic" in2="n" scale="13" xChannelSelector="R" yChannelSelector="G" result="d"/>` +
      `<feGaussianBlur in="d" stdDeviation="0.55" result="b"/>` +
      `<feTurbulence type="fractalNoise" baseFrequency="0.018 0.05" numOctaves="2" seed="3" result="m"/>` +
      `<feColorMatrix in="m" type="matrix" values="0 0 0 0 ${skvrny[0]}  0 0 0 0 ${skvrny[1]}  0 0 0 0 ${skvrny[2]}  0 0 0 ${silaSkvrn} -0.62" result="skvrny"/>` +
      `<feComposite in="skvrny" in2="b" operator="in" result="sk"/>` +
      `<feMerge><feMergeNode in="b"/><feMergeNode in="sk"/></feMerge></filter>` +
      `<filter id="${id}-tus-lem" x="-15%" y="-15%" width="130%" height="130%"><feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="${seed + 17}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="16" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation="2.4"/></filter>` +
      `<clipPath id="${id}-tus-orez"><path d="${D}"/></clipPath>`,
  };
};
/** Jediné světlo tušového lemu: bledá žlutá jako srpek měsíce v hlavičce webu (.hlava-tema-mesic v styles/parta2.css). */
export const ZLUTA = { jadro: "#FFF6DA", svetla: "#FFE7A3", zaklad: "#FBE3A0", okraj: "#D9B968" };
