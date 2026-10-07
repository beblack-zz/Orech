/*
 * Cedulka jako ema ve třech přehnaných podobách — generátory kresby.
 * Komponenta: components/characters/kami-buh/CedulkaEma.astro, běh: ./beh.js.
 *
 *   v1  Kůň na rubu — visí na kōhaku šňůře, za zády lakovaný kotouč a kolem
 *       osm malých em s celou partou; po kliknutí se otočí a na rubu cválá kůň
 *   v2  Rydlo — odpolední dílna: Cedulka seřízne misce nožku a rydlem jí
 *       vyryje jméno do dna, pak ji postaví na polici. Ví, čí je která.
 *   v3  Inari — tunel bran torii za soumraku a lišácké destičky, na které
 *       si lidi kreslí obličeje; Cedulka mezi nimi visí a skoro nejde poznat
 *
 * Ema (絵馬) znamená doslova „obrázek koně“. Do svatyní se kdysi darovali
 * živí koně, aby na nich kami jezdili, potom dřevění a nakonec jen koně
 * namalovaní na destičce. Na líci je obrázek, na rub se píše přání — u nás
 * jméno. Rok 2026 je navíc rokem koně.
 *
 * Stavba je stejná jako u Pecinky s ohněm (scripts/pecinka-ohen): čisté
 * generátory SVG bez DOM, které dostanou čas, stav simulace a vstup (myš,
 * kliknutí) a vrátí značky. Běží i v Node, takže jde udělat náhled jako
 * PNG (celeSvg + sharp). Pohyb, zvuk a myš řeší beh.js.
 *
 * Vrstva bez `klic` se nakreslí jednou, s `klic` se překreslí, jen když se
 * klíč změní. Id ve filtrech a přechodech jsou pevná (v1-…, v2-…, v3-…),
 * každá podoba proto smí být na stránce jen jednou.
 *
 * Simulace žije v `dyn`: beh.js ji založí přes novaDynamika() a každý
 * snímek posune přes krok(). Zvuky, které má běh zahrát, krok přidá do
 * dyn.zvuk.
 */

/* ——— Pomocníci ——— */
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
/** Text do SVG: znaky, které by rozbily značky, se nahradí entitami. */
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

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
/** Body na Catmull-Rom křivce: n vzorků z řídké lomené čáry. */
const vzorky = (P, n) => {
  const out = [];
  const m = P.length - 1;
  for (let k = 0; k <= n; k++) {
    const u = (k / n) * m;
    const i = Math.min(m - 1, Math.floor(u));
    const s = u - i;
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(m, i + 2)];
    const s2 = s * s, s3 = s2 * s;
    out.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * s + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * s2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * s3)));
  }
  return out;
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
/** Tah štětcem: hladká křivka přes body, na začátku přítlak, na konci špička. */
const tah = (P, sirka, { n = 18, nabeh = 0.18, spicka = 0.55 } = {}) =>
  pasPoBodech(vzorky(P, n), (s) => sirka * Math.min(1, 0.35 + s / nabeh) * Math.pow(1 - s * 0.96, spicka));
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
/** Kyvadlo s útlumem: úhel a rychlost se posunou o dt pod vlivem síly. */
const kyvadlo = (k, dt, { tuhost = 20, utlum = 1.6, sila = 0 }) => {
  k.v += (-tuhost * Math.sin(k.a) - utlum * k.v + sila) * dt;
  k.a += k.v * dt;
};
/** Pružina k cíli (pro otáčení destiček kolem šňůrky). */
const pruzina = (k, cil, dt, { tuhost = 30, utlum = 7 }) => {
  k.v += (tuhost * (cil - k.a) - utlum * k.v) * dt;
  k.a += k.v * dt;
};

/* ═══════════════════════════════════════════════════════════════════
 * Cedulka: kami kresba (characters/kami/Cedulka.astro) — destička se
 * stříškou, letokruhy a červenobílou šňůrkou. Všechno v jejích
 * souřadnicích 0–180, dírka je na (90, 62), spodek desky na y 140.
 * ═══════════════════════════════════════════════════════════════════ */
const CED = {
  tvar: "M56 66 L90 46 L124 66 L124 134 Q124 140 118 140 L62 140 Q56 140 56 134 Z",
  strecha: "M52 68 L90 45 L128 68",
  letokruhy: ["M56 80 Q74 77 90 81 T124 79", "M56 100 Q70 97 86 101 T124 98", "M56 132 Q76 129 92 133 T124 130"],
  oci: [[80, 88], [100, 88]],
  tvare: [[72, 98], [108, 98]],
};
const DREVO = { svetle: "#F3E3C6", tmave: "#E2C9A0", obrys: "#8A6A48", letokruh: "#B89466", hrana: "#B48E62" };

/** Přechody desky: dřevo, ořez na tvar a ruměnec. */
const cedDefs = (id, d = DREVO) =>
  `<linearGradient id="${id}-drevo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${d.svetle}"/><stop offset="1" stop-color="${d.tmave}"/></linearGradient>` +
  `<clipPath id="${id}-orez"><path d="${CED.tvar}"/></clipPath>` +
  `<radialGradient id="${id}-tvare" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#C87E4E" stop-opacity="0.6"/><stop offset="1" stop-color="#C87E4E" stop-opacity="0"/></radialGradient>`;

/** Holá deska: dřevo, letokruhy, stříška a dírka. */
const cedDeska = (id, { d = DREVO, cara = 1.6 } = {}) =>
  `<path d="${CED.tvar}" fill="url(#${id}-drevo)" stroke="${d.obrys}" stroke-width="${cara}" stroke-linejoin="round"/>` +
  `<g clip-path="url(#${id}-orez)" stroke="${d.letokruh}" stroke-width="0.8" fill="none" opacity="0.45">${CED.letokruhy.map((p) => `<path d="${p}"/>`).join("")}</g>` +
  `<path d="${CED.strecha}" stroke="${d.obrys}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>` +
  `<circle cx="90" cy="62" r="3.6" fill="${d.obrys}" opacity="0.5"/>`;

/**
 * Tvářička. dx/dy posouvá pohled, mrk 0…1 zavírá oči.
 * oci: kulate | siroke | smich | zavrene | spi | prisne
 * usta: usmev | o | smich | rovna | smutek | kocici | fuk
 */
const cedTvar = (id, { dx = 0, dy = 0, mrk = 0, oci = "kulate", usta = "usmev", tvare = 0.4, oko = "#3A2E28", odlesk = "#FFF8EE" } = {}) => {
  let s = CED.tvare.map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="7.4" ry="4.8" fill="url(#${id}-tvare)" opacity="${f(clamp(tvare * 1.6))}"/>`).join("");
  const ox = clamp(dx, -2.2, 2.2), oy = clamp(dy, -1.8, 1.8);
  if (oci === "smich") s += `<path d="M75.4 89.4 Q80 83.4 84.6 89.4 M95.4 89.4 Q100 83.4 104.6 89.4" stroke="${oko}" stroke-width="2.4" stroke-linecap="round" fill="none"/>`;
  else if (oci === "zavrene") s += `<path d="M76 84.2 L83.8 88 L76 91.8 M104 84.2 L96.2 88 L104 91.8" stroke="${oko}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
  else if (oci === "spi") s += `<path d="M76 87.6 Q80 91.4 84 87.6 M96 87.6 Q100 91.4 104 87.6" stroke="${oko}" stroke-width="2" stroke-linecap="round" fill="none"/>`;
  else {
    const velke = oci === "siroke";
    const rx = velke ? 4 : 3.3, ry = (velke ? 5.1 : 4.2) * Math.max(0.08, 1 - mrk * 0.94);
    for (const [x, y] of CED.oci) {
      s += `<ellipse cx="${f(x + ox)}" cy="${f(y + oy)}" rx="${rx}" ry="${f(ry)}" fill="${oko}"/>`;
      if (mrk < 0.5) s += `<circle cx="${f(x + ox - (velke ? 1.2 : 1))}" cy="${f(y + oy - (velke ? 2 : 1.7))}" r="${velke ? 1.6 : 1.3}" fill="${odlesk}"/>`;
    }
    if (oci === "prisne") s += `<path d="M75 81.4 L84.6 83.4 M105 81.4 L95.4 83.4" stroke="${oko}" stroke-width="1.8" stroke-linecap="round"/>`;
  }
  if (usta === "o") s += `<ellipse cx="90" cy="101.4" rx="2.6" ry="3.2" fill="#3A1A12"/>`;
  else if (usta === "fuk") s += `<ellipse cx="90" cy="101" rx="1.8" ry="2.2" fill="#3A1A12"/>`;
  else if (usta === "smich") s += `<path d="M84.4 99.2 Q90 107.6 95.6 99.2 Z" fill="#3A1A12" stroke="#3A1A12" stroke-width="1" stroke-linejoin="round"/><path d="M87 103.2 Q90 105.2 93 103.2" stroke="#C4432B" stroke-width="1.5" stroke-linecap="round" fill="none"/>`;
  else if (usta === "rovna") s += `<path d="M86.4 101 H93.6" stroke="${oko}" stroke-width="2" stroke-linecap="round"/>`;
  else if (usta === "smutek") s += `<path d="M85.6 102.4 Q90 98.8 94.4 102.4" stroke="${oko}" stroke-width="2" stroke-linecap="round" fill="none"/>`;
  else if (usta === "kocici") s += `<path d="M84.6 100 Q87.3 103.6 90 100.4 Q92.7 103.6 95.4 100" stroke="${oko}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
  else if (usta === "jazyk") s += `<path d="M91.4 101.6 Q92.6 106.4 95.6 103.8 Q96 101.6 94 101.2 Z" fill="#D9776A" stroke="${oko}" stroke-width="0.8" stroke-linejoin="round"/><path d="M85 100 Q90 103.6 95 100" stroke="${oko}" stroke-width="2" stroke-linecap="round" fill="none"/>`;
  else s += `<path d="M85 100 Q90 104 95 100" stroke="${oko}" stroke-width="2" stroke-linecap="round" fill="none"/>`;
  return s;
};

/** Dva řádky „textu“, nebo jméno psané rukou (Caveat ze stránky). */
const cedRadky = ({ text = null, barva = "#3A2E28", sila = 1 } = {}) =>
  text
    ? `<text x="90" y="129" text-anchor="middle" font-family="Caveat, cursive" font-weight="600" font-size="${text.length > 7 ? 19 : 22}" fill="${barva}" opacity="${f(sila)}">${esc(text)}</text>`
    : `<path d="M68 118 L112 118" stroke="${barva}" stroke-width="2.6" stroke-linecap="round" opacity="${f(0.55 * sila)}"/>` +
      `<path d="M68 127 L98 127" stroke="${barva}" stroke-width="2.2" stroke-linecap="round" opacity="${f(0.35 * sila)}"/>`;

/**
 * Destička otočená o ψ kolem svislé osy (0 = líc, π = rub), v souřadnicích
 * Cedulky. Deska má tloušťku: vzdálenější stěna se posune na druhou stranu
 * a mezi nimi vykoukne hrana. lic/rub jsou funkce, které vrátí obsah.
 */
const otocena = (psi, lic, rub, { obrys = DREVO.obrys, hrana = DREVO.hrana, tloustka = 6, tvar = CED.tvar, osa = 90, jenObsah = false } = {}) => {
  const c = Math.cos(psi), s = Math.sin(psi);
  const sx = Math.max(0.025, Math.abs(c));
  const blizko = (c >= 0 ? 1 : -1) * (tloustka / 2) * s;
  const sk = (dx) => `translate(${f(osa + dx)} 0) scale(${f(sx)} 1) translate(${-osa} 0)`;
  let out = "";
  if (!jenObsah && Math.abs(s) > 0.02) out += `<g transform="${sk(-blizko)}"><path d="${tvar}" fill="${hrana}" stroke="${obrys}" stroke-width="1.6" stroke-linejoin="round"/></g>`;
  out += `<g transform="${sk(blizko)}">${c >= 0 ? lic() : rub()}`;
  if (!jenObsah && sx < 0.97) out += `<path d="${tvar}" fill="#2A1E14" opacity="${f((1 - sx) * 0.32)}"/>`;
  return out + `</g>`;
};

/** Kroucená červenobílá šňůrka; posun točí pruhy (když se destička točí). */
const snurka = (d, { sirka = 2.6, posun = 0, obrys = null } = {}) =>
  (obrys ? `<path d="${d}" stroke="${obrys}" stroke-width="${f(sirka + 1)}" fill="none" stroke-linecap="round"/>` : "") +
  `<path d="${d}" stroke="#B84A2B" stroke-width="${sirka}" fill="none" stroke-linecap="round"/>` +
  `<path d="${d}" stroke="#FBF7EE" stroke-width="${sirka}" fill="none" stroke-dasharray="${f(sirka * 1.15)} ${f(sirka * 1.15)}" stroke-dashoffset="${f(posun)}"/>`;

/**
 * Ručka jako gumová hadice (z Pecinky): z ramene k dlani oblouk, který se
 * prohne, když je ruka blízko.
 */
const rucka = (S, H, { tloustka = 5.2, barva = "#E9D3AE", obrys = "#8A6A48", ohyb = 1, dlan = true } = {}) => {
  const dx = H[0] - S[0], dy = H[1] - S[1];
  const d = Math.hypot(dx, dy) || 1;
  const prohnuti = Math.max(0, 26 - d) * 0.45 * ohyb;
  const M = [(S[0] + H[0]) / 2 - (dy / d) * prohnuti, (S[1] + H[1]) / 2 + (dx / d) * prohnuti];
  const c = `M${pt(S)} Q${pt(M)} ${pt(H)}`;
  return (
    `<path d="${c}" stroke="${obrys}" stroke-width="${f(tloustka + 1.6)}" stroke-linecap="round" fill="none"/>` +
    `<path d="${c}" stroke="${barva}" stroke-width="${tloustka}" stroke-linecap="round" fill="none"/>` +
    (dlan ? `<circle cx="${f(H[0])}" cy="${f(H[1])}" r="${f(tloustka * 0.72)}" fill="${barva}" stroke="${obrys}" stroke-width="0.8"/>` : "")
  );
};

/* ═══════════════════════════════════════════════════════════════════
 * Parta v malém — portréty na malé emy kolem Cedulky (v1). Kreslí se
 * v souřadnicích Cedulky do plochy pod stříškou, střed asi (90, 104).
 * ═══════════════════════════════════════════════════════════════════ */
const OCKA = (y, barva = "#3A2E28", dx = 6) => `<circle cx="${90 - dx}" cy="${y}" r="2.3" fill="${barva}"/><circle cx="${90 + dx}" cy="${y}" r="2.3" fill="${barva}"/>`;
const PORTRETY = {
  hlinka: () =>
    `<path d="M90 86 C89.4 80 90.6 76 93 72" stroke="#6E7A4E" stroke-width="2.2" fill="none" stroke-linecap="round"/>` +
    `<path d="M92.4 74.6 C97 69.4 104 69.6 106.6 71.6 C102.6 75.6 97 76.8 92.4 74.6 Z" fill="#8A9466" stroke="#6E7A4E" stroke-width="1"/>` +
    `<path d="M91 78.6 C86.6 74 81 74 78.4 76 C82 79.6 87.4 80.6 91 78.6 Z" fill="#9AA375" stroke="#6E7A4E" stroke-width="1"/>` +
    `<circle cx="90" cy="108" r="22" fill="#6B5D4F" stroke="#4A3F35" stroke-width="1.6"/><circle cx="81" cy="100" r="4" fill="#9A8A78" opacity="0.45"/>` +
    OCKA(106, "#F4EBDD"),
  kapka: () =>
    `<path d="M90 76 Q74 100 72 111 Q70 125 82 131 Q90 134 98 131 Q110 125 108 111 Q106 100 90 76 Z" fill="#D79A94" stroke="#B47670" stroke-width="1.6"/>` +
    `<ellipse cx="82" cy="108" rx="3.4" ry="7.4" fill="#FBE7E3" opacity="0.5" transform="rotate(-15 82 108)"/>` +
    OCKA(114, "#5E3430"),
  pecinka: () =>
    `<rect x="99" y="76" width="8" height="13" rx="2.4" fill="#A8432A" stroke="#7E2F18" stroke-width="1.2"/>` +
    `<rect x="69" y="84" width="42" height="40" rx="10" fill="#B84A2B" stroke="#7E2F18" stroke-width="1.6"/>` +
    `<rect x="77" y="105" width="26" height="15" rx="4" fill="#3A2E28" opacity="0.55"/>` +
    `<ellipse cx="90" cy="116" rx="7" ry="3.4" fill="#F0C55E"/><ellipse cx="88" cy="114" rx="2.2" ry="3.6" fill="#FBE3A0"/>` +
    OCKA(97, "#3A2E28"),
  stripek: () =>
    `<path d="M84 79 L98 78 L115 96 L117 117 L106 131 L78 133 L65 119 L65 102 Z" fill="#E8B440" stroke="#B3851F" stroke-width="1.6" stroke-linejoin="round"/>` +
    `<path d="M92 79 Q88 95 95 105 Q100 118 93 132" stroke="#8E6414" stroke-width="2.4" fill="none"/><path d="M92 79 Q88 95 95 105 Q100 118 93 132" stroke="#F7DE8A" stroke-width="0.8" fill="none"/>` +
    OCKA(104, "#3A2E28"),
  vazicka: () =>
    `<g transform="translate(90 106) scale(0.5) translate(-90 -97)"><path d="M71 44 Q75 47 76 54 C66 61 56 78 55 106 C54 130 68 150 82 150 L98 150 C112 150 126 130 125 106 C124 78 114 61 104 54 Q105 47 109 44 Q90 40 71 44 Z" fill="#EFE3D0" stroke="#6B5D4F" stroke-width="3.2"/>` +
    `<path d="M75 55 Q90 60 105 55" stroke="#B84A2B" stroke-width="5" stroke-linecap="round" fill="none"/><path d="M60 118 L72 112 L80 122 L94 116 L106 124 L120 116" stroke="#4F5E9C" stroke-width="3" fill="none" opacity="0.6"/></g>` +
    OCKA(104, "#3A2E28", 5.4),
  bublinka: () =>
    `<circle cx="90" cy="106" r="21" fill="#EFE3D0" stroke="#6B5D4F" stroke-width="1.6"/>` +
    `<ellipse cx="81" cy="97" rx="6" ry="3.6" fill="#FFFFFF" opacity="0.9" transform="rotate(-35 81 97)"/>` +
    `<path d="M106 114 A17 17 0 0 1 94 124" stroke="#FFFFFF" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.8"/>` +
    OCKA(107, "#3A2E28"),
  kachlik: () =>
    `<rect x="69" y="85" width="42" height="42" rx="3.4" fill="#C87E4E" stroke="#94542C" stroke-width="1.6"/>` +
    `<rect x="73.6" y="89.6" width="32.8" height="32.8" rx="2" fill="none" stroke="#B84A2B" stroke-width="1.4" opacity="0.6"/>` +
    `<rect x="98" y="113" width="7" height="7" rx="1" fill="#B84A2B"/>` +
    OCKA(104, "#3A2E28"),
  samotka: () =>
    `<path d="M76 100 L77 90 Q90 87.6 103 90 L104 100 Z" fill="#3A2E28" stroke="#2A211C" stroke-width="1"/><path d="M77 90 Q90 87.6 103 90" stroke="#8A5A34" stroke-width="1.6" fill="none"/>` +
    `<rect x="63" y="101" width="54" height="15" rx="2.6" fill="#F0E4CE" stroke="#6B5D4F" stroke-width="1.6"/><rect x="63" y="112" width="54" height="5" rx="2" fill="#C3B197"/>` +
    `<ellipse cx="90" cy="123" rx="24" ry="3" fill="#E8B440" opacity="0.5"/>` +
    OCKA(108.6, "#3A2E28"),
};

/* ═══════════════════════════════════════════════════════════════════
 * Kůň z rubu emy: bílý posvátný kůň šinme s rudým postrojem a zlatou
 * dečkou, jak ho malují na velké emy ve svatyních. Cválá: noha za nohou
 * mezi nataženým skokem a sbalením pod břicho. Vlastní souřadnice: hlava
 * vlevo, střed trupu v počátku, délka asi 140.
 * ═══════════════════════════════════════════════════════════════════ */
const KUN = {
  inkoust: "#2A2220",
  srst: "#FBF7EE",
  stin: "#E6DDCC",
  postroj: "#C4432B",
  zlato: "#D9B25E",
};
/** Úhly nohou (stupně od svislice, kladné = dopředu k hlavě) v natažení a ve sbalení. */
const NOHY = {
  predni: { kotva: [-25, 7], d: [15, 15], nataz: [62, 86], sbal: [6, -96] },
  zadni: { kotva: [25, 6], d: [16, 16], nataz: [-58, -84], sbal: [50, -12] },
};
const noha = (typ, k, { vzadu = false } = {}) => {
  const N = NOHY[typ];
  const u1 = rad(lerp(N.nataz[0], N.sbal[0], k)), u2 = rad(lerp(N.nataz[1], N.sbal[1], k));
  const A = [N.kotva[0] + (vzadu ? 3 : 0), N.kotva[1]];
  const B = [A[0] - Math.sin(u1) * N.d[0], A[1] + Math.cos(u1) * N.d[0]];
  const C = [B[0] - Math.sin(u2) * N.d[1], B[1] + Math.cos(u2) * N.d[1]];
  const D = [C[0] - Math.sin(u2) * 3.4, C[1] + Math.cos(u2) * 3.4];
  const d = pasPoBodech(vzorky([A, B, C], 10), (s) => lerp(8, 3.4, Math.pow(s, 0.7)));
  const srst = vzadu ? KUN.stin : KUN.srst;
  return (
    `<path d="${d}" fill="${srst}" stroke="${KUN.inkoust}" stroke-width="1.3" stroke-linejoin="round"/>` +
    `<path d="${pasPoBodech([C, D], () => 4.2)}" fill="${KUN.inkoust}" stroke="${KUN.inkoust}" stroke-width="0.8" stroke-linejoin="round"/>`
  );
};
const kun = (faze, { t = 0 } = {}) => {
  const cyklus = faze * Math.PI * 2;
  const k = (1 - Math.cos(cyklus)) / 2;
  const kz = (1 - Math.cos(cyklus - 0.55)) / 2;
  const bob = -Math.sin(cyklus) * 1.8;
  const kyv = Math.sin(cyklus + 0.6) * 4;
  const I = KUN.inkoust;
  let s = "";
  /* vzdálenější nohy, trochu pozdě */
  s += noha("predni", kz, { vzadu: true }) + noha("zadni", kz, { vzadu: true });
  s += `<g transform="translate(0 ${f(bob)})">`;
  /* ocas: pár pramenů, vlají za koněm */
  const ocas = [0, 1, 2, 3].map((i) => {
    const vl = Math.sin(t * 7 + i * 0.9) * 3;
    return tah([[33, -12], [46, -15 + i * 1.5], [58, -10 + i * 3 + vl], [64 + i, 2 + i * 3.4 + vl * 0.7]], 6 - i, { spicka: 0.8 });
  });
  s += `<g fill="${I}">${ocas.map((d) => `<path d="${d}"/>`).join("")}</g>`;
  /* trup */
  const trup = hladka([[-36, -3], [-31, -13], [-18, -17], [-4, -13.5], [12, -14.5], [26, -18], [36, -11], [39, 0], [34, 10], [20, 13], [2, 12.6], [-14, 13], [-28, 10]], true);
  s += `<path d="${trup}" fill="${KUN.srst}" stroke="${I}" stroke-width="1.5" stroke-linejoin="round"/>`;
  /* krk a hlava se pohupují proti trupu */
  s += `<g transform="rotate(${f(kyv * 0.5)} -28 -10)">`;
  /* hříva pod krkem: dlouhé prameny, vlají dozadu */
  const hriva = [0, 1, 2, 3, 4, 5, 6].map((i) => {
    const u = i / 6;
    const A = [lerp(-45, -20, u), lerp(-45, -17, u)];
    const vl = Math.sin(t * 9 + i * 1.3) * 1.8;
    return tah([A, [A[0] + 7, A[1] - 2 + vl], [A[0] + 15, A[1] + 3 + vl]], 5.2 - u * 1.6, { spicka: 0.9 });
  });
  s += `<g fill="${I}">${hriva.map((d) => `<path d="${d}"/>`).join("")}</g>`;
  const krk = hladka([[-32, 0], [-40, -12], [-46, -24], [-51, -35], [-49, -45], [-42, -42], [-33, -31], [-24, -21], [-14, -16]], true);
  s += `<path d="${krk}" fill="${KUN.srst}" stroke="${I}" stroke-width="1.5" stroke-linejoin="round"/>`;
  const hlava = hladka([[-45, -48], [-53, -48.4], [-61, -42], [-68, -34], [-71, -29], [-68.6, -24.4], [-62.6, -24.4], [-56, -29.6], [-48.6, -35]], true);
  s += `<path d="${hlava}" fill="${KUN.srst}" stroke="${I}" stroke-width="1.5" stroke-linejoin="round"/>`;
  s += `<path d="M-48 -47.4 L-47 -56.6 L-43 -47.6 Z" fill="${KUN.srst}" stroke="${I}" stroke-width="1.2" stroke-linejoin="round"/>`;
  /* ofina mezi ušima */
  s += `<path d="${tah([[-48, -47], [-53, -45], [-56, -40.6]], 3.2, { spicka: 0.8 })}" fill="${I}"/>`;
  s += `<ellipse cx="-56.4" cy="-40" rx="1.7" ry="1.25" fill="${I}"/><path d="M-59 -42.4 Q-56.4 -44 -53.8 -42.4" stroke="${I}" stroke-width="0.7" fill="none"/>`;
  s += `<path d="M-68.6 -29.4 Q-66.6 -28.4 -67.2 -26.6" stroke="${I}" stroke-width="0.9" fill="none" stroke-linecap="round"/>`;
  /* uzdečka: nosní řemen, lícní řemen a otěže k sedlu */
  s += `<g stroke="${KUN.postroj}" stroke-width="1.6" fill="none" stroke-linecap="round">` +
    `<path d="M-66 -34 Q-63.6 -27.6 -61 -25.4"/><path d="M-49.4 -45.6 Q-55 -37 -63.6 -31.4"/><path d="M-64 -27.4 Q-44 -16 -14 -13"/></g>`;
  s += `</g>`;
  /* dečka se zlatem a rudé střapce atsubusa */
  s += `<path d="M-14 -15 Q0 -12 16 -15.6 L18 4 Q2 7 -14 4 Z" fill="${KUN.zlato}" stroke="${I}" stroke-width="1.1" stroke-linejoin="round"/>`;
  s += `<path d="M-12 -1 Q2 2 16 -1" stroke="${KUN.postroj}" stroke-width="2" fill="none"/>`;
  s += `<g stroke="#A88A3C" stroke-width="0.6" fill="none"><path d="M-8 -10 l3 3 l3 -3 l3 3 l3 -3 l3 3 l3 -3"/></g>`;
  s += `<path d="M-33 -10 Q-28 2 -32 8" stroke="${KUN.postroj}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
  s += `<path d="M30 -16 Q36 -6 34 4" stroke="${KUN.postroj}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  /* střapec: zlatá kulička a vějíř rudých nití */
  const strapec = (x, y, sw) => {
    let p = "";
    for (let j = -2; j <= 2; j++) p += `<path d="M${x} ${f(y + 1)} Q${f(x + j * 0.7 + sw * 0.4)} ${f(y + 5)} ${f(x + j * 1.3 + sw)} ${f(y + 10 - Math.abs(j) * 0.8)}" stroke="${j % 2 ? "#A8301E" : KUN.postroj}" stroke-width="1.3" stroke-linecap="round" fill="none"/>`;
    return p + `<circle cx="${x}" cy="${y}" r="1.7" fill="${KUN.zlato}" stroke="${I}" stroke-width="0.5"/>`;
  };
  const sw = Math.sin(cyklus + 1) * 2.4 + 1.4;
  s += strapec(-31, 6, sw) + strapec(-6, 5, sw * 0.8) + strapec(10, 4.6, sw * 0.8) + strapec(33, 2, sw);
  s += `</g>`;
  /* bližší nohy */
  s += noha("zadni", k) + noha("predni", k);
  return s;
};
/**
 * Zlatý mrak suyari-gasumi: pás se zaoblenými konci a dvěma obloučky
 * nahoře, uvnitř tenká linka, jak se kreslí na paravánech.
 */
const mrak = (x, y, w, h, { barva = "#E6C46E", obrys = "#B88A2E" } = {}) => {
  const r = h / 2;
  const d =
    `M${f(x)} ${f(y + h)} A${f(r)} ${f(r)} 0 0 1 ${f(x)} ${f(y)} ` +
    `Q${f(x + w * 0.18)} ${f(y - h * 0.55)} ${f(x + w * 0.36)} ${f(y)} Q${f(x + w * 0.56)} ${f(y - h * 0.7)} ${f(x + w * 0.74)} ${f(y)} ` +
    `L${f(x + w)} ${f(y)} A${f(r)} ${f(r)} 0 0 1 ${f(x + w)} ${f(y + h)} Z`;
  return (
    `<path d="${d}" fill="${barva}" stroke="${obrys}" stroke-width="0.8" stroke-linejoin="round"/>` +
    `<path d="M${f(x + 1)} ${f(y + h * 0.55)} H${f(x + w - 1)}" stroke="${obrys}" stroke-width="0.5" opacity="0.7"/>`
  );
};

/* ═══════════════════════════════════════════════════════════════════
 * 1 — KŮŇ NA RUBU
 * Cedulka visí na kōhaku šňůře pod velkým uzlem awadži musubi, jaký se
 * váže na dárkové obálky. Za zády má kotouč z rumělkového laku se zlatým
 * vzorem šippó — prolínající se kruhy znamenají spojení mezi lidmi, tedy
 * přesně to, co Cedulka dělá: spojuje lidi s jejich kusy. Šňůra objíždí
 * kotouč a visí z ní osm malých em s celou partou; Cedulka si pamatuje
 * všechny.
 *
 * Myš je vítr: destičky se od ní odklánějí, a když se jí prudce mávne,
 * roztočí se na šňůrkách a ukážou rub, kde má každý napsané jméno.
 * Kliknutí: Cedulka se otočí. Na rubu má namalovaného koně — ema znamená
 * „obrázek koně“ — a ten cválá, dokud se zase neotočí zpátky.
 * ═══════════════════════════════════════════════════════════════════ */
const V1 = (() => {
  const C = [90, 86], R = 54;
  const RL = R + 2.4;
  const UZEL = [90, 29];
  const ZAVES = [90, 35];
  const S = 0.68;
  const DIRA = [90, 55];
  const CEDT = `translate(${DIRA[0]} ${DIRA[1]}) scale(${S}) translate(-90 -62)`;
  const TVAR_STRED = [DIRA[0], DIRA[1] + 26 * S];
  const MS = 0.25;
  const UHLY = [231, 203, 175, 147];
  const PORADI = [["pecinka", "vazicka", "kapka", "samotka"], ["stripek", "bublinka", "kachlik", "hlinka"]];
  const JMENA = { hlinka: "Hlinka", kapka: "Kapka", pecinka: "Pecinka", stripek: "Střípek", vazicka: "Vázička", bublinka: "Bublinka", kachlik: "Kachlík", samotka: "Šamotka" };
  const MALE = [];
  PORADI.forEach((strana, si) =>
    strana.forEach((id, i) => {
      const a = rad(si ? 180 - UHLY[i] : UHLY[i]);
      MALE.push({ id, P: [C[0] + Math.cos(a) * RL, C[1] + Math.sin(a) * RL], strana: si ? 1 : -1, delka: 7 });
    }),
  );
  const KONEC_SNURY = 124;
  const STRAPCE = [-1, 1].map((s) => {
    const a = rad(s < 0 ? KONEC_SNURY : 180 - KONEC_SNURY);
    return { s, P: [C[0] + Math.cos(a) * RL, C[1] + Math.sin(a) * RL] };
  });

  /* ——— Statické kusy ——— */
  const vrstvaZare = () => `<circle cx="${C[0]}" cy="${C[1]}" r="92" fill="url(#ce1-zare)"/>`;
  const vrstvaKotouc = () => {
    const r = rng(77);
    const zlato = Array.from({ length: 70 }, () => {
      const u = r() * Math.PI * 2, d = Math.sqrt(r()) * (R - 4);
      return `<circle cx="${f(C[0] + Math.cos(u) * d)}" cy="${f(C[1] + Math.sin(u) * d)}" r="${f(0.25 + r() * 0.45)}"/>`;
    }).join("");
    return (
      `<circle cx="${C[0]}" cy="${C[1]}" r="${R + 1.6}" fill="#6E1C0E"/>` +
      `<circle cx="${C[0]}" cy="${C[1]}" r="${R}" fill="url(#ce1-lak)"/>` +
      `<circle cx="${C[0]}" cy="${C[1]}" r="${R}" fill="url(#ce1-shippo)" opacity="0.32"/>` +
      `<g fill="#F2D488" opacity="0.7">${zlato}</g>` +
      `<circle cx="${C[0]}" cy="${C[1]}" r="${R - 2.2}" fill="none" stroke="#E2BE66" stroke-width="1.2"/>` +
      `<circle cx="${C[0]}" cy="${C[1]}" r="${R - 4.4}" fill="none" stroke="#E2BE66" stroke-width="0.4" stroke-dasharray="5 1.4 1.4 1.4"/>` +
      `<circle cx="${C[0]}" cy="${C[1]}" r="${R - 19}" fill="none" stroke="#E2BE66" stroke-width="0.5" opacity="0.55"/>` +
      `<ellipse cx="${C[0] - 20}" cy="${C[1] - 26}" rx="22" ry="11" fill="url(#ce1-lesk)" transform="rotate(-32 ${C[0] - 20} ${C[1] - 26})"/>`
    );
  };
  /* lesk laku: pás světla jednou za sedm sekund přejede přes kotouč */
  const vrstvaLesk = (st) => {
    const u = (st.t % 7) / 1.8;
    if (u > 1) return "";
    const x = lerp(C[0] - R * 1.6, C[0] + R * 1.6, smooth(u));
    return `<g clip-path="url(#ce1-disk)"><rect x="${f(x - 9)}" y="${C[1] - R * 1.5}" width="18" height="${R * 3}" fill="url(#ce1-lesk-pas)" transform="rotate(28 ${f(x)} ${C[1]})" opacity="${f(Math.sin(Math.PI * u))}"/></g>`;
  };
  /* kōhaku šňůra objíždí kotouč z obou stran od uzlu až ke střapcům */
  const SNURA_L = (() => {
    const a0 = rad(262), a1 = rad(KONEC_SNURY);
    return `M${pt([C[0] + Math.cos(a0) * RL, C[1] + Math.sin(a0) * RL])} A${RL} ${RL} 0 0 0 ${pt([C[0] + Math.cos(a1) * RL, C[1] + Math.sin(a1) * RL])}`;
  })();
  const SNURA_P = (() => {
    const a0 = rad(278), a1 = rad(180 - KONEC_SNURY);
    return `M${pt([C[0] + Math.cos(a0) * RL, C[1] + Math.sin(a0) * RL])} A${RL} ${RL} 0 0 1 ${pt([C[0] + Math.cos(a1) * RL, C[1] + Math.sin(a1) * RL])}`;
  })();
  const vrstvaSnura = () =>
    snurka(SNURA_L, { sirka: 2.6, obrys: "#5E160B" }) +
    snurka(SNURA_P, { sirka: 2.6, obrys: "#5E160B" }) +
    /* háčky, na kterých malé emy visí */
    `<g fill="#E2BE66" stroke="#7A5A1E" stroke-width="0.4">${MALE.map((m) => `<circle cx="${f(m.P[0])}" cy="${f(m.P[1])}" r="1.3"/>`).join("")}</g>`;

  /* Uzel awadži musubi: levá půlka bílá, pravá rudá, jako na dárkové obálce */
  const vrstvaUzel = () => {
    const [x, y] = UZEL;
    const smycka = (cx, cy, rx, ry, rot, barva, obrys) =>
      `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${cx} ${cy})" fill="none" stroke="${obrys}" stroke-width="3.6"/>` +
      `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${cx} ${cy})" fill="none" stroke="${barva}" stroke-width="2.4"/>`;
    return (
      /* šňůra shora */
      snurka(`M${x} -8 L${x} ${y - 9}`, { sirka: 2.8, obrys: "#5E160B" }) +
      smycka(x - 7.4, y + 0.6, 7.4, 4.2, -24, "#FBF7EE", "#8A7A69") +
      smycka(x + 7.4, y + 0.6, 7.4, 4.2, 24, "#C4432B", "#5E160B") +
      `<path d="M${x} ${y - 1} C${x - 6} ${y - 4} ${x - 5} ${y - 12} ${x} ${y - 11.4}" fill="none" stroke="#8A7A69" stroke-width="3.6"/>` +
      `<path d="M${x} ${y - 1} C${x - 6} ${y - 4} ${x - 5} ${y - 12} ${x} ${y - 11.4}" fill="none" stroke="#FBF7EE" stroke-width="2.4"/>` +
      `<path d="M${x} ${y - 1} C${x + 6} ${y - 4} ${x + 5} ${y - 12} ${x} ${y - 11.4}" fill="none" stroke="#5E160B" stroke-width="3.6"/>` +
      `<path d="M${x} ${y - 1} C${x + 6} ${y - 4} ${x + 5} ${y - 12} ${x} ${y - 11.4}" fill="none" stroke="#C4432B" stroke-width="2.4"/>` +
      /* křížení uprostřed a konce, které přecházejí do šňůry kolem kotouče */
      `<path d="M${x - 2} ${y + 1} L${x - 9} ${y + 7}" stroke="#8A7A69" stroke-width="3.6" stroke-linecap="round"/><path d="M${x - 2} ${y + 1} L${x - 9} ${y + 7}" stroke="#FBF7EE" stroke-width="2.4" stroke-linecap="round"/>` +
      `<path d="M${x + 2} ${y + 1} L${x + 9} ${y + 7}" stroke="#5E160B" stroke-width="3.6" stroke-linecap="round"/><path d="M${x + 2} ${y + 1} L${x + 9} ${y + 7}" stroke="#C4432B" stroke-width="2.4" stroke-linecap="round"/>` +
      `<rect x="${x - 3.2}" y="${y - 3}" width="6.4" height="6" rx="1.6" fill="#E2BE66" stroke="#7A5A1E" stroke-width="0.6"/>` +
      `<path d="M${x - 2} ${y - 1.2} H${x + 2} M${x - 2} ${y + 1.2} H${x + 2}" stroke="#7A5A1E" stroke-width="0.5"/>`
    );
  };

  /* ——— Živé kusy ——— */
  /** Rub malé emy: jméno psané rukou a malé rudé razítko svatyně. */
  const rubMale = (id) =>
    cedDeska("ce1") +
    `<text x="90" y="112" text-anchor="middle" font-family="Caveat, cursive" font-weight="600" font-size="${JMENA[id].length > 7 ? 21 : 24}" fill="#3A2E28">${JMENA[id]}</text>` +
    `<rect x="103" y="120" width="11" height="11" rx="1.4" fill="#C4432B" opacity="0.85"/><path d="M105.6 123 H111.4 M108.5 123 V129 M105.6 126 H111.4" stroke="#F4EBDD" stroke-width="1.1"/>`;
  const vrstvaMale = (st) =>
    MALE.map((m, i) => {
      const k = st.male[i];
      const lic = () => cedDeska("ce1", { cara: 2.6 }) + PORTRETY[m.id]();
      const rub = () => rubMale(m.id);
      return (
        `<g transform="translate(${f(m.P[0])} ${f(m.P[1])}) rotate(${f((k.a * 180) / Math.PI)})">` +
        `<path d="M0 0 L0 5" stroke="#8A6A48" stroke-width="0.8"/>` +
        `<g transform="translate(0 ${f(m.delka)}) scale(${MS}) translate(-90 -62)">${otocena(k.psi, lic, rub, { tloustka: 7 })}</g></g>`
      );
    }).join("");

  /* Střapce fusa na koncích šňůry, se zlatým zvonečkem */
  const vrstvaStrapce = (st) =>
    STRAPCE.map(({ s, P }, i) => {
      const a = (st.strapce[i] * 180) / Math.PI;
      const pr = [0, 1, 2, 3, 4, 5, 6].map((j) => {
        const x = (j - 3) * 1.1;
        return `<path d="M${f(x * 0.5)} 9 Q${f(x * 0.9)} 17 ${f(x * 1.3 + Math.sin(st.t * 3 + j) * 0.4)} 25" stroke="${j % 2 ? "#A8301E" : "#C4432B"}" stroke-width="1.5" stroke-linecap="round" fill="none"/>`;
      });
      return (
        `<g transform="translate(${f(P[0])} ${f(P[1])}) rotate(${f(a)})">` +
        `<path d="M0 0 V5" stroke="#B84A2B" stroke-width="1.6"/>` +
        pr.join("") +
        `<path d="M-3.4 8.6 Q0 6.6 3.4 8.6 L3 11.4 Q0 12.6 -3 11.4 Z" fill="#E2BE66" stroke="#7A5A1E" stroke-width="0.5"/>` +
        /* zvoneček suzu */
        `<circle cx="0" cy="5.4" r="2.6" fill="url(#ce1-suzu)" stroke="#7A5A1E" stroke-width="0.5"/><path d="M-1.6 6.4 H1.6" stroke="#5A3E10" stroke-width="0.6"/>` +
        `</g>`
      );
    }).join("");

  /* Deska s ruční linkou (filtr) se překresluje jen při otáčení a cvalu; tvář má vlastní vrstvu */
  const vrstvaCedulka = (st) => {
    const lic = () => cedDeska("ce1") + `<g clip-path="url(#ce1-orez)">${cedRadky({ text: null })}</g>`;
    const rub = () =>
      cedDeska("ce1") +
      `<g clip-path="url(#ce1-orez)">` +
      mrak(64, 128, 30, 6) +
      mrak(98, 121, 16, 5) +
      mrak(70, 75, 12, 4) +
      `<g transform="translate(92 104) scale(0.47)">${kun(st.cval, { t: st.t })}</g>` +
      `</g>` +
      `<rect x="108" y="72" width="9" height="9" rx="1.2" fill="#C4432B" opacity="0.88"/><path d="M110.2 74.4 H114.8 M112.5 74.4 V79.2 M110.2 76.8 H114.8" stroke="#F4EBDD" stroke-width="0.9"/>`;
    return (
      snurka(`M${ZAVES[0]} ${ZAVES[1]} L${DIRA[0]} ${DIRA[1] + 2}`, { sirka: 2, posun: st.psi * 3, obrys: "#5E160B" }) +
      `<g transform="${CEDT}"><g filter="url(#ce1-tah)">${otocena(st.psi, lic, rub)}</g></g>`
    );
  };
  const vrstvaTvar = (st) =>
    Math.cos(st.psi) < 0.05
      ? ""
      : `<g transform="${CEDT}">${otocena(st.psi, () => cedTvar("ce1", { dx: st.pohled[0], dy: st.pohled[1], mrk: st.mrk, oci: st.oci, usta: st.usta, tvare: st.tvare }), () => "", { jenObsah: true })}</g>`;

  const vrstvaJiskry = (st) =>
    st.jiskry
      .map((j) => {
        const u = j.vek / j.zivot;
        const op = clamp(Math.min(u / 0.1, (1 - u) / 0.45));
        return `<path d="${jiskraD(j.r * (1 - u * 0.3))}" transform="translate(${f(j.x)} ${f(j.y)}) rotate(${f(j.rot + u * 60)})" fill="${u < 0.3 ? "#FFF6D8" : "#F2D488"}" opacity="${f(op)}"/>`;
      })
      .join("");

  const defs = () =>
    cedDefs("ce1") +
    `<radialGradient id="ce1-zare" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#F3B26A" stop-opacity="0.42"/><stop offset="0.55" stop-color="#E9844A" stop-opacity="0.14"/><stop offset="1" stop-color="#E9844A" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="ce1-lak" cx="0.42" cy="0.36" r="0.7"><stop offset="0" stop-color="#D9603A"/><stop offset="0.55" stop-color="#B8402A"/><stop offset="1" stop-color="#8A2616"/></radialGradient>` +
    `<radialGradient id="ce1-lesk" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#FFE9D0" stop-opacity="0.32"/><stop offset="1" stop-color="#FFE9D0" stop-opacity="0"/></radialGradient>` +
    `<clipPath id="ce1-disk"><circle cx="${C[0]}" cy="${C[1]}" r="${R}"/></clipPath>` +
    `<linearGradient id="ce1-lesk-pas" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFE9C8" stop-opacity="0"/><stop offset="0.5" stop-color="#FFE9C8" stop-opacity="0.38"/><stop offset="1" stop-color="#FFE9C8" stop-opacity="0"/></linearGradient>` +
    `<radialGradient id="ce1-suzu" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stop-color="#FFF1C4"/><stop offset="0.5" stop-color="#E2BE66"/><stop offset="1" stop-color="#9A7426"/></radialGradient>` +
    `<pattern id="ce1-shippo" width="9" height="9" patternUnits="userSpaceOnUse"><g fill="none" stroke="#F2D488" stroke-width="0.45"><circle cx="0" cy="0" r="4.5"/><circle cx="9" cy="0" r="4.5"/><circle cx="0" cy="9" r="4.5"/><circle cx="9" cy="9" r="4.5"/><circle cx="4.5" cy="4.5" r="4.5"/></g></pattern>` +
    `<filter id="ce1-tah" x="-8%" y="-8%" width="116%" height="116%" color-interpolation-filters="sRGB">` +
    `<feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="4" result="vlna"/>` +
    `<feDisplacementMap in="SourceGraphic" in2="vlna" scale="2.2" xChannelSelector="R" yChannelSelector="G" result="tah"/>` +
    `<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="11" result="zrno"/>` +
    `<feColorMatrix in="zrno" type="matrix" values="0 0 0 0 0.23  0 0 0 0 0.18  0 0 0 0 0.16  0.5 0 0 0 -0.24" result="skvrny"/>` +
    `<feComposite in="skvrny" in2="tah" operator="in" result="zrnoVTvaru"/>` +
    `<feMerge><feMergeNode in="tah"/><feMergeNode in="zrnoVTvaru"/></feMerge></filter>`;

  /* ——— Simulace ——— */
  const novaDynamika = () => ({
    vitr: 0,
    male: MALE.map((m, i) => ({ a: 0, v: 0, psi: 0, w: 0, fz: i * 1.7 })),
    strapce: STRAPCE.map(() => ({ a: 0, v: 0 })),
    kyv: { a: 0, v: 0 },
    otoc: { a: 0, v: 0 },
    cil: 0,
    otocenaOd: -10,
    cval: 0,
    jiskry: [],
    vlna: [],
    klap: 0,
    nahoda: rng(51),
    zvuk: [],
    pohled: [0, 0],
    radost: -10,
  });
  const krok = (dyn, t, dt, vstup) => {
    const R0 = dyn.nahoda;
    /* vítr: destičky se od myši odklánějí, bez myši jen tak dýchají */
    let cil = 0.18 * Math.sin(t * 0.37) + 0.08 * Math.sin(t * 1.13 + 1);
    let pohled = [0, 0];
    if (vstup.mys) {
      const dx = vstup.mys.x - 90, dy = vstup.mys.y - 90;
      cil = -clamp(dx / 70, -1, 1) * clamp(1.6 - Math.hypot(dx, dy) / 120, 0.3, 1);
      pohled = [clamp((vstup.mys.x - TVAR_STRED[0]) / 40, -1, 1) * 2, clamp((vstup.mys.y - TVAR_STRED[1]) / 50, -1, 1) * 1.6];
    }
    dyn.vitr += (cil - dyn.vitr) * (1 - Math.exp(-dt / 0.4));
    dyn.pohled = dyn.pohled.map((v, i) => v + (pohled[i] - v) * (1 - Math.exp(-dt / 0.15)));
    /* prudké mávnutí destičky roztočí */
    const naraz = clamp(((vstup.rychlost || 0) - 220) / 500);
    for (let i = 0; i < MALE.length; i++) {
      const m = MALE[i], k = dyn.male[i];
      const sum = Math.sin(t * 1.7 + k.fz) * 0.5 + Math.sin(t * 2.9 + k.fz * 2) * 0.3;
      kyvadlo(k, dt, { tuhost: 18, utlum: 1.5, sila: (-dyn.vitr * 4.4 + sum * (0.5 + Math.abs(dyn.vitr) * 1.6)) * (1 + naraz * 0.6) });
      if (naraz > 0 && R0() < dt * 6 * naraz) {
        k.w += (R0() < 0.5 ? -1 : 1) * (10 + R0() * 14) * naraz;
        dyn.zvuk.push({ druh: "klap", sila: 0.4 + naraz * 0.5, pan: (m.P[0] - 90) / 90 });
      }
      /* šňůrka se zkroutí a pomalu rozmotá: tuhá k nule, s útlumem */
      k.w += (-3.2 * Math.sin(k.psi / 2) * Math.sign(Math.cos(k.psi / 2) || 1) - 0.9 * k.w) * dt;
      k.psi += k.w * dt;
    }
    dyn.strapce.forEach((k, i) => kyvadlo(k, dt, { tuhost: 14, utlum: 1.8, sila: -dyn.vitr * 4 + Math.sin(t * 1.3 + i * 2) * 0.5 }));
    kyvadlo(dyn.kyv, dt, { tuhost: 9, utlum: 2.2, sila: -dyn.vitr * 0.9 + Math.sin(t * 0.8) * 0.12 });
    /* klapání: čím víc se destičky hýbou, tím hustěji */
    const pohyb = dyn.male.reduce((a, k) => a + Math.abs(k.v) + Math.abs(k.w) * 0.12, 0);
    dyn.klap += dt * Math.max(0, pohyb - 1.2) * 0.9;
    while (dyn.klap >= 1) {
      dyn.klap -= 1;
      const m = MALE[Math.floor(R0() * MALE.length)];
      dyn.zvuk.push({ druh: "klap", sila: 0.18 + R0() * 0.3, pan: (m.P[0] - 90) / 90 });
    }
    if (Math.abs(dyn.strapce[0].v) + Math.abs(dyn.strapce[1].v) > 2.6 && R0() < dt * 3) dyn.zvuk.push({ druh: "suzu", sila: 0.35, pan: 0 });
    /* kliknutí: otočit se (nebo zpátky) */
    if (vstup.kliky && vstup.kliky.length) {
      vstup.kliky.length = 0;
      dyn.cil = dyn.cil > 0.5 ? 0 : Math.PI;
      dyn.otocenaOd = t;
      dyn.otoc.v += dyn.cil > 0.5 ? 2 : -2;
      dyn.zvuk.push({ druh: "otoc", sila: 1, pan: 0 });
      dyn.zvuk.push({ druh: "suzu", sila: 0.9, pan: 0 });
      /* malé emy se po ní jedna po druhé otočí dokola, jako vlna */
      if (dyn.cil > 0.5) MALE.forEach((m, i) => dyn.vlna.push({ i, za: t + 0.15 + (m.strana < 0 ? i : 7 - i + 4) * 0.08 }));
      for (let i = 0; i < 18; i++) {
        const u = R0() * Math.PI * 2;
        dyn.jiskry.push({ x: 90 + Math.cos(u) * (22 + R0() * 20), y: 82 + Math.sin(u) * (28 + R0() * 20), vx: Math.cos(u) * 10, vy: Math.sin(u) * 10 - 8, vek: 0, zivot: 0.8 + R0() * 0.8, r: 1 + R0() * 1.4, rot: R0() * 90 });
      }
    }
    for (const v of dyn.vlna) {
      if (t < v.za) continue;
      dyn.male[v.i].w += (dyn.male[v.i].w >= 0 ? 1 : -1) * 7.6;
      dyn.zvuk.push({ druh: "klap", sila: 0.5, pan: (MALE[v.i].P[0] - 90) / 90 });
      v.hotovo = true;
    }
    dyn.vlna = dyn.vlna.filter((v) => !v.hotovo);
    /* třpyt kirakira: zlaté jiskry stoupají kolem kotouče */
    if (R0() < dt * 1.3) {
      const u = R0() * Math.PI * 2;
      dyn.jiskry.push({ x: C[0] + Math.cos(u) * (R + 4 + R0() * 10), y: C[1] + Math.sin(u) * (R + 4 + R0() * 10), vx: (R0() - 0.5) * 3, vy: -5 - R0() * 5, vek: 0, zivot: 1.6 + R0() * 1.2, r: 0.7 + R0() * 0.8, rot: R0() * 90, g: 0 });
    }
    /* sama se po chvíli otočí zpátky */
    if (dyn.cil > 0.5 && t - dyn.otocenaOd > 6.5) {
      dyn.cil = 0;
      dyn.otocenaOd = t;
      dyn.zvuk.push({ druh: "otoc", sila: 0.7, pan: 0 });
    }
    const pred = dyn.otoc.a;
    pruzina(dyn.otoc, dyn.cil, dt, { tuhost: 26, utlum: 5.2 });
    /* zpátky lícem: rozesměje se, že koně všichni viděli */
    if (Math.cos(pred) <= 0 && Math.cos(dyn.otoc.a) > 0) dyn.radost = t;
    /* kůň cválá, jen když je vidět */
    const vidno = Math.cos(dyn.otoc.a) < 0.2;
    const pk = dyn.cval;
    dyn.cval += dt * (vidno ? 1.55 : 0.4);
    if (vidno && Math.floor(pk * 2) !== Math.floor(dyn.cval * 2)) dyn.zvuk.push({ druh: "kopyta", sila: 0.8, pan: 0.1 });
    for (const j of dyn.jiskry) {
      j.vek += dt;
      j.x += j.vx * dt;
      j.y += j.vy * dt;
      j.vy += (j.g ?? 12) * dt;
    }
    dyn.jiskry = dyn.jiskry.filter((j) => j.vek < j.zivot);
  };
  const stav = (t, vstup = {}, dyn) => {
    const d = dyn || novaDynamika();
    let oci = "kulate", usta = "usmev";
    if (t - d.radost < 1.4) [oci, usta] = ["smich", "smich"];
    else if (Math.abs(d.vitr) > 0.75) [oci, usta] = ["zavrene", "o"];
    return {
      t,
      male: d.male.map((k) => ({ a: k.a, psi: k.psi })),
      strapce: d.strapce.map((k) => k.a),
      kyv: d.kyv.a,
      psi: d.otoc.a,
      cval: d.cval,
      jiskry: d.jiskry,
      pohled: d.pohled,
      mrk: mrkani(t, [1.9, 5.1, 5.35, 8.2], 9.5),
      oci,
      usta,
      tvare: Math.round((0.38 + 0.25 * clamp(Math.abs(d.vitr))) * 20) / 20,
    };
  };
  const snimek = (st) => Math.floor(st.t * 30);

  return {
    id: "v1",
    viewBox: "0 0 180 180",
    defs,
    novaDynamika,
    krok,
    stav,
    klidne: { t: 4.2 },
    vrstvy: [
      { id: "zare", kresli: vrstvaZare },
      { id: "kotouc", kresli: vrstvaKotouc, tezka: true },
      { id: "lesk", kresli: vrstvaLesk, klic: (st) => ((st.t % 7) / 1.8 > 1 ? 0 : snimek(st)), styl: "mix-blend-mode:screen" },
      { id: "snura", kresli: vrstvaSnura },
      { id: "strapce", kresli: vrstvaStrapce, klic: snimek },
      { id: "male", kresli: vrstvaMale, klic: snimek },
      { id: "uzel", kresli: vrstvaUzel },
      /* houpání se nepřekresluje, otočí se celá vrstva (filtr ruční linky se tak nepočítá znovu) */
      {
        id: "cedulka",
        kresli: vrstvaCedulka,
        klic: (st) => `${f(st.psi)},${Math.cos(st.psi) < 0.3 ? Math.floor(st.cval * 24) : 0}`,
        pohyb: (st) => ({ uhel: (st.kyv * 180) / Math.PI, cx: ZAVES[0], cy: ZAVES[1] }),
      },
      {
        id: "tvar",
        kresli: vrstvaTvar,
        klic: (st) => `${f(st.psi)},${f(st.pohled[0])},${f(st.pohled[1])},${f(st.mrk)},${st.oci},${st.usta},${f(st.tvare)}`,
        pohyb: (st) => ({ uhel: (st.kyv * 180) / Math.PI, cx: ZAVES[0], cy: ZAVES[1] }),
      },
      { id: "jiskry", kresli: vrstvaJiskry, klic: snimek },
    ],
  };
})();

/* ═══════════════════════════════════════════════════════════════════
 * 2 — RYDLO
 * Odpoledne v dílně. Za oknem ořech, přes stůl padají paprsky a v nich
 * prach. Na točně stojí miska dnem vzhůru, ještě kožovitá. Cedulka visí
 * pod policí, roztočí točnu a očkem seřízne nožku — odřezky se kroutí
 * a padají na stůl. Pak vezme rydlo a vyryje do dna jméno, protože tužka
 * by v peci shořela. Drobky sfoukne, jméno si zapamatuje (na chvíli ho
 * má napsané na sobě) a misku postaví na polici k ostatním.
 *
 * Dvacet misek na polici vypadá skoro stejně. Najeď na kteroukoli a
 * Cedulka ti řekne, čí je — jméno se jí objeví na břiše. Jedna miska je
 * křivá a Cedulku to pokaždé rozesměje. Jedna přijde podepsaná tužkou
 * a Cedulka se zamračí. Kliknutí přinese další misku, sama si ji vezme
 * taky, když se nic neděje.
 * ═══════════════════════════════════════════════════════════════════ */
const V2 = (() => {
  /* Stůl je vidět šikmo shora: kruhy se zploští na K, svislé výšky na V */
  const K = 0.64, V = 0.77;
  const TOCNA = { x: 113, y: 143, rx: 33, tl: 4.6 };
  const MISKA = { r: 27, h: 25, rb: 12.8 };
  const DNO = [TOCNA.x, TOCNA.y - MISKA.h * V];
  const HAK = [58, 75];
  const S = 0.5;
  const DIRA = [58, 86];
  const CEDT = `translate(${DIRA[0]} ${DIRA[1]}) scale(${S}) translate(-90 -62)`;
  const naPanel = ([x, y]) => [DIRA[0] + (x - 90) * S, DIRA[1] + (y - 62) * S];
  const RAMENO_P = naPanel([121, 106]);
  const RAMENO_L = naPanel([59, 106]);
  const TVAR_STRED = naPanel([90, 92]);
  const POLICE = [{ y: 40, x0: 8, x1: 108 }, { y: 72, x0: 8, x1: 108 }];
  const SLOTY = [17, 35, 53, 71, 89];
  const NAHORE = [
    { x: 20, jmeno: "Petra", tvar: "miska", glazura: "#4F5E9C", lem: "#2F3A6E" },
    { x: 40, jmeno: "Lukáš", tvar: "hrnek", glazura: "#9DB59A", lem: "#6E8A6A" },
    { x: 60, jmeno: "Zuzka", tvar: "vaza", glazura: "#5A3A22", lem: "#E0B070" },
    { x: 80, jmeno: "Dan", tvar: "cajovka", glazura: "#F1EADB", lem: "#4F5E9C" },
    { x: 99, jmeno: "Ema", tvar: "miska", glazura: "#B4552F", lem: "#7A3018" },
  ];
  /* Jména, která se na točně vystřídají; křivá rozesměje, tužka zamračí */
  const KUSY = [
    { jmeno: "Mája", hlina: "#B5A48E" },
    { jmeno: "Kuba", hlina: "#A86B4E" },
    { jmeno: "Ondra", hlina: "#9E968A", kriva: true },
    { jmeno: "Terka", hlina: "#C9BBA4" },
    { jmeno: "Bára", hlina: "#B5A48E", tuzka: true },
    { jmeno: "Vojta", hlina: "#A86B4E" },
    { jmeno: "Eliška", hlina: "#C9BBA4" },
    { jmeno: "Honza", hlina: "#9E968A" },
    { jmeno: "Anička", hlina: "#B5A48E" },
    { jmeno: "Šimon", hlina: "#A86B4E" },
    { jmeno: "Klárka", hlina: "#C9BBA4" },
    { jmeno: "Jirka", hlina: "#9E968A" },
  ];
  const kus = (k) => KUSY[((k % KUSY.length) + KUSY.length) % KUSY.length];
  const TEXT = { velikost: 9.4, sirkaZnaku: 0.43 };
  const sirkaTextu = (s) => s.length * TEXT.velikost * TEXT.sirkaZnaku;

  /* Časy jednoho kusu (sekundy od začátku) */
  const FAZE = { prijde: 0, toci: 0.9, rydlo: 3.5, pise: 3.9, fouka: 6.9, pamatuje: 7.5, nese: 8.7, polozi: 10.1, konec: 10.6 };
  const tocnaRychlost = (u) => krokem(FAZE.toci, FAZE.toci + 0.4, u) * (1 - krokem(FAZE.rydlo - 0.4, FAZE.rydlo, u));
  const piseK = (u) => clamp((u - FAZE.pise) / (FAZE.fouka - FAZE.pise - 0.25));
  const seriznuto = (u) => krokem(FAZE.toci + 0.5, FAZE.rydlo - 0.3, u);

  /* ——— Tvary ——— */
  const TVAR = (() => {
    const B = [];
    for (let i = 0; i < 40; i++) {
      const u = (i / 40) * Math.PI * 2;
      const c = Math.cos(u), s = Math.sin(u);
      const n = 4.2;
      B.push([90 + 86 * Math.sign(c) * Math.pow(Math.abs(c), 2 / n), 90 + 86 * Math.sign(s) * Math.pow(Math.abs(s), 2 / n)]);
    }
    const r = rng(23);
    return hladka(B.map(([x, y]) => [x + (r() - 0.5) * 2.4, y + (r() - 0.5) * 2.4]), true);
  })();

  /**
   * Miska dnem vzhůru: O střed okraje, r poloměr okraje, h výška, rb dno,
   * k zploštění, v zkrácení výšky. noha 0…1 = jak moc je seříznutá nožka.
   */
  const miskaVzhuru = (O, { r, h, rb, k = K, v = V, hlina = "#B5A48E", noha = 1, naklon = 0, posunDna = 0 } = {}) => {
    const [x, y] = O;
    const yb = y - h * v, xb = x + posunDna;
    const tmava = mix(hlina, "#3A2E28", 0.32), svetla = mix(hlina, "#FFF4E0", 0.28);
    const tvar =
      `M${f(x - r)} ${f(y)} C${f(x - r)} ${f(y - h * v * 0.58)} ${f(xb - rb - (r - rb) * 0.32)} ${f(yb)} ${f(xb - rb)} ${f(yb)} ` +
      `A${f(rb)} ${f(rb * k)} 0 0 1 ${f(xb + rb)} ${f(yb)} ` +
      `C${f(xb + rb + (r - rb) * 0.32)} ${f(yb)} ${f(x + r)} ${f(y - h * v * 0.58)} ${f(x + r)} ${f(y)} ` +
      `A${f(r)} ${f(r * k)} 0 0 1 ${f(x - r)} ${f(y)} Z`;
    let s = `<g transform="rotate(${f(naklon)} ${f(x)} ${f(y)})">`;
    s += `<path d="${tvar}" fill="${hlina}" stroke="${mix(hlina, "#2A1E14", 0.55)}" stroke-width="0.7" stroke-linejoin="round"/>`;
    /* světlo od okna zprava, stín vlevo */
    s += `<path d="M${f(x - r * 0.92)} ${f(y - 1)} C${f(x - r * 0.9)} ${f(y - h * v * 0.5)} ${f(xb - rb - 2)} ${f(yb + 1.4)} ${f(xb - rb + 1)} ${f(yb + 1.6)}" stroke="${tmava}" stroke-width="${f(r * 0.24)}" fill="none" opacity="0.35" stroke-linecap="round"/>`;
    s += `<path d="M${f(x + r * 0.7)} ${f(y - 2)} C${f(x + r * 0.72)} ${f(y - h * v * 0.5)} ${f(xb + rb + 1)} ${f(yb + 1.6)} ${f(xb + rb - 1.6)} ${f(yb + 2)}" stroke="${svetla}" stroke-width="${f(r * 0.12)}" fill="none" opacity="0.55" stroke-linecap="round"/>`;
    /* dno: nízký válec nožky, nahoře placka, ze které se seřízne prstenec */
    const vn = rb * 0.2 * v;
    s += `<path d="M${f(xb - rb)} ${f(yb)} V${f(yb + vn)} A${f(rb)} ${f(rb * k)} 0 0 0 ${f(xb + rb)} ${f(yb + vn)} V${f(yb)} Z" fill="${mix(hlina, "#3A2E28", 0.12)}" stroke="${mix(hlina, "#2A1E14", 0.5)}" stroke-width="0.6"/>`;
    s += `<ellipse cx="${f(xb)}" cy="${f(yb)}" rx="${f(rb)}" ry="${f(rb * k)}" fill="${mix(hlina, "#FFF4E0", 0.16)}" stroke="${mix(hlina, "#2A1E14", 0.5)}" stroke-width="0.6"/>`;
    if (noha > 0.01) {
      const ri = rb * 0.84;
      s += `<ellipse cx="${f(xb)}" cy="${f(yb + 0.9 * noha)}" rx="${f(ri)}" ry="${f(ri * k)}" fill="${mix(hlina, "#FFF4E0", 0.12)}" opacity="${f(noha)}"/>`;
      s += `<path d="M${f(xb - ri)} ${f(yb + 0.9 * noha)} A${f(ri)} ${f(ri * k)} 0 0 1 ${f(xb + ri)} ${f(yb + 0.9 * noha)}" stroke="${tmava}" stroke-width="0.7" fill="none" opacity="${f(0.8 * noha)}"/>`;
    }
    return s + `</g>`;
  };
  /* Hotové kusy na horní polici (glazované, stojí normálně) */
  const hotovy = (p, dy = 0) => {
    const { x, glazura, lem } = p;
    const y = POLICE[0].y + dy;
    const svetla = mix(glazura, "#FFFFFF", 0.35);
    if (p.tvar === "hrnek")
      return (
        `<path d="M${x + 5.6} ${y - 10} Q${x + 10.4} ${y - 9.4} ${x + 9.6} ${y - 5.4} Q${x + 9} ${y - 2.6} ${x + 5.4} ${y - 3.6}" stroke="${lem}" stroke-width="1.8" fill="none"/>` +
        `<path d="M${x - 6} ${y - 13} L${x - 5.6} ${y - 1} Q${x} ${y + 0.8} ${x + 5.6} ${y - 1} L${x + 6} ${y - 13} Z" fill="${glazura}" stroke="${lem}" stroke-width="0.6"/>` +
        `<ellipse cx="${x}" cy="${y - 13}" rx="6" ry="1.6" fill="${mix(glazura, "#2A1E14", 0.35)}" stroke="${lem}" stroke-width="0.5"/>` +
        `<path d="M${x - 4} ${y - 11} V${y - 3}" stroke="${svetla}" stroke-width="1.2" opacity="0.6" stroke-linecap="round"/>`
      );
    if (p.tvar === "vaza")
      return (
        `<path d="M${x - 2.6} ${y - 18} Q${x - 2} ${y - 14} ${x - 5.6} ${y - 10} Q${x - 8} ${y - 6} ${x - 5} ${y - 1} Q${x} ${y + 0.6} ${x + 5} ${y - 1} Q${x + 8} ${y - 6} ${x + 5.6} ${y - 10} Q${x + 2} ${y - 14} ${x + 2.6} ${y - 18} Z" fill="${glazura}" stroke="#2A1E14" stroke-width="0.6"/>` +
        `<path d="M${x - 2.6} ${y - 18} H${x + 2.6}" stroke="${lem}" stroke-width="1.2"/><path d="M${x - 5} ${y - 9} q1 3 0.4 5 M${x - 1} ${y - 11} q0.8 3 0.2 6 M${x + 3} ${y - 10} q0.8 2.4 0.3 4.4" stroke="${lem}" stroke-width="1" fill="none" stroke-linecap="round"/>`
      );
    if (p.tvar === "cajovka")
      return (
        `<path d="M${x - 5.4} ${y - 14} L${x - 4.6} ${y - 1} Q${x} ${y + 0.6} ${x + 4.6} ${y - 1} L${x + 5.4} ${y - 14} Z" fill="${glazura}" stroke="#8A7A69" stroke-width="0.6"/>` +
        `<ellipse cx="${x}" cy="${y - 14}" rx="5.4" ry="1.4" fill="#DCCFB8" stroke="#8A7A69" stroke-width="0.5"/>` +
        `<path d="M${x - 5} ${y - 9} H${x + 5} M${x - 4.8} ${y - 6.6} H${x + 4.8}" stroke="${lem}" stroke-width="0.8"/>`
      );
    return (
      `<path d="M${x - 9} ${y - 8} Q${x - 8} ${y - 1} ${x - 3} ${y} L${x + 3} ${y} Q${x + 8} ${y - 1} ${x + 9} ${y - 8} Z" fill="${glazura}" stroke="${lem}" stroke-width="0.6"/>` +
      `<ellipse cx="${x}" cy="${y - 8}" rx="9" ry="2" fill="${mix(glazura, "#2A1E14", 0.3)}" stroke="${lem}" stroke-width="0.5"/>` +
      `<path d="M${x - 6.6} ${y - 6} Q${x - 6} ${y - 2.4} ${x - 3} ${y - 1.4}" stroke="${svetla}" stroke-width="1" fill="none" opacity="0.7"/>`
    );
  };

  /* ——— Statické kusy ——— */
  const vrstvaPodklad = () => {
    const r = rng(8);
    const skvrny = Array.from({ length: 16 }, () => `<ellipse cx="${f(10 + r() * 160)}" cy="${f(6 + r() * 80)}" rx="${f(4 + r() * 10)}" ry="${f(2 + r() * 5)}" fill="#FFF3D8" opacity="${f(0.1 + r() * 0.12)}"/>`).join("");
    const desky = [98, 109, 122, 137, 155, 176];
    return (
      `<path d="${TVAR}" fill="#C9A06A" opacity="0.5" filter="url(#ce2-lem)"/>` +
      `<g clip-path="url(#ce2-scena)">` +
      `<rect x="0" y="0" width="180" height="92" fill="url(#ce2-zed)"/>` +
      skvrny +
      /* okno: zlaté odpoledne, za ním ořech */
      `<rect x="114" y="14" width="40" height="46" rx="1.6" fill="url(#ce2-nebe)"/>` +
      `<g fill="#9AA375">${[[140, 18, 12], [151, 30, 10], [128, 22, 8], [146, 44, 9], [134, 34, 6]].map(([x, y, rr]) => `<path d="${hrouda(x, y, rr, rr * 0.8, x + y, { bodu: 10, kolisani: 0.22 })}"/>`).join("")}</g>` +
      `<g fill="#7E8A52" opacity="0.8">${[[146, 24, 7], [154, 38, 6], [131, 28, 4]].map(([x, y, rr]) => `<path d="${hrouda(x, y, rr, rr * 0.8, x * y, { bodu: 9, kolisani: 0.25 })}"/>`).join("")}</g>` +
      `<path d="M154 58 Q146 46 141 36 Q138 28 132 22" stroke="#5E4A34" stroke-width="1.4" fill="none"/>` +
      `<circle cx="125" cy="26" r="9" fill="url(#ce2-slunce)"/>` +
      `<g fill="none" stroke="#7A5A3E" stroke-width="2.2"><rect x="114" y="14" width="40" height="46" rx="1.6"/><path d="M134 14 V60 M114 37 H154"/></g>` +
      `<path d="M110 61 H158 V64.6 H110 Z" fill="#B88E62" stroke="#7A5A3E" stroke-width="0.6"/>` +
      /* kytka v misce na parapetu */
      `<path d="M146 61 L147 56 Q151 55 155 56 L156 61 Z" fill="#C4432B" stroke="#7E2F18" stroke-width="0.5"/>` +
      `<path d="M151 56 Q148 50 145 49 M151 56 Q152 49 155 47 M151 56 Q154 52 158 52" stroke="#6E7A4E" stroke-width="1.1" fill="none" stroke-linecap="round"/>` +
      /* kalendář: za dva týdny je kroužek */
      `<g transform="rotate(2 130 78)"><rect x="120" y="68" width="20" height="21" rx="0.8" fill="#FBF7EE" stroke="#A89A88" stroke-width="0.5"/><rect x="120" y="68" width="20" height="4.4" fill="#C4432B"/>` +
      `<g fill="#8A7A69">${Array.from({ length: 20 }, (_, i) => `<rect x="${f(121.8 + (i % 5) * 3.6)}" y="${f(74.4 + Math.floor(i / 5) * 3.4)}" width="1.6" height="1.2"/>`).join("")}</g>` +
      `<ellipse cx="129.6" cy="85" rx="2.4" ry="2" fill="none" stroke="#C4432B" stroke-width="0.7"/><path d="M123.4 75 l0.7 0.8 l1.4 -1.6" stroke="#C4432B" stroke-width="0.5" fill="none"/></g>` +
      `<circle cx="130" cy="66.4" r="0.8" fill="#5A4636"/>` +
      /* police: deska, čelo, konzole */
      POLICE.map((p) =>
        `<path d="M${p.x0 + 6} ${p.y + 3} L${p.x0 + 6} ${p.y + 12} L${p.x0 + 14} ${p.y + 3} Z M${p.x1 - 6} ${p.y + 3} L${p.x1 - 6} ${p.y + 12} L${p.x1 - 14} ${p.y + 3} Z" fill="#7A5A3E"/>` +
        `<rect x="${p.x0}" y="${p.y - 3}" width="${p.x1 - p.x0}" height="3.4" fill="#C9A57A"/>` +
        `<rect x="${p.x0}" y="${p.y}" width="${p.x1 - p.x0}" height="3.2" fill="#9A7650" stroke="#6E5038" stroke-width="0.5"/>` +
        `<rect x="${p.x0}" y="${p.y + 3.2}" width="${p.x1 - p.x0}" height="2.4" fill="#5A4636" opacity="0.18"/>`,
      ).join("") +
      `<circle cx="${HAK[0]}" cy="${HAK[1] + 0.6}" r="1.1" fill="#4A3A2C"/>` +
      /* stůl: prkna v perspektivě, stopy hlíny */
      `<rect x="0" y="92" width="180" height="90" fill="url(#ce2-stul)"/>` +
      `<rect x="0" y="90" width="180" height="3" fill="#6E5038" opacity="0.5"/>` +
      `<g stroke="#8A6A48" stroke-width="0.6" opacity="0.55">${desky.map((y) => `<path d="M0 ${y} Q90 ${y + 0.6} 180 ${y - 0.4}"/>`).join("")}</g>` +
      `<g fill="#9E8A72" opacity="0.4">${Array.from({ length: 14 }, () => `<ellipse cx="${f(8 + r() * 164)}" cy="${f(100 + r() * 76)}" rx="${f(1.4 + r() * 4)}" ry="${f(0.7 + r() * 1.6)}"/>`).join("")}</g>` +
      /* žluté tužka (špatný nástroj) a dřevěné žebro, houbička */
      `<g transform="rotate(-14 34 162)"><rect x="18" y="160" width="28" height="3.4" fill="#E9B839" stroke="#8A6A1E" stroke-width="0.5"/><path d="M46 160 L52 161.7 L46 163.4 Z" fill="#E9CFA2" stroke="#8A6A1E" stroke-width="0.4"/><path d="M50.4 161.2 L52 161.7 L50.4 162.2 Z" fill="#3A3A40"/><rect x="15" y="160" width="3" height="3.4" fill="#C9B79A" stroke="#8A6A1E" stroke-width="0.4"/></g>` +
      `<path d="M148 160 Q158 152 168 160 Q170 166 160 168 Q150 168 148 160 Z" fill="#C49A6C" stroke="#7A5A3E" stroke-width="0.6"/>` +
      `<path d="${hrouda(158, 120, 8.6, 5.4, 41, { bodu: 14, kolisani: 0.16 })}" fill="#E8C46A" stroke="#B8923A" stroke-width="0.6"/>` +
      `<g fill="#B8923A" opacity="0.6">${[[155, 118], [160, 121], [157, 123], [162, 118]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="0.8"/>`).join("")}</g>` +
      `</g>`
    );
  };
  /* Paprsky z okna přes stůl (přes „screen“) */
  const vrstvaPaprsky = () =>
    `<g clip-path="url(#ce2-scena)">` +
    `<path d="M114 60 L134 60 L92 178 L44 178 Z" fill="url(#ce2-paprsek)" opacity="0.5"/>` +
    `<path d="M134 60 L154 60 L132 178 L96 178 Z" fill="url(#ce2-paprsek)" opacity="0.42"/>` +
    `</g>`;
  const vrstvaTocna = (st) => {
    const { x, y, rx, tl } = TOCNA;
    const ry = rx * K;
    let s = `<ellipse cx="${x}" cy="${f(y + tl * V + 4)}" rx="${rx * 0.5}" ry="${f(rx * 0.5 * K)}" fill="#2A2624" opacity="0.4"/>`;
    s += `<path d="M${x - 10} ${f(y + tl * V)} L${x - 13} ${f(y + tl * V + 6)} Q${x} ${f(y + tl * V + 9)} ${x + 13} ${f(y + tl * V + 6)} L${x + 10} ${f(y + tl * V)} Z" fill="#4A4642"/>`;
    s += `<path d="M${x - rx} ${y} V${f(y + tl * V)} A${rx} ${f(ry)} 0 0 0 ${x + rx} ${f(y + tl * V)} V${y} Z" fill="#7C7D7A" stroke="#4A4642" stroke-width="0.6"/>`;
    s += `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${f(ry)}" fill="url(#ce2-hlinik)" stroke="#5E5F5C" stroke-width="0.6"/>`;
    /* soustředné rýhy, točí se s točnou */
    const otoc = st.otoceni;
    for (const k of [0.93, 0.78]) s += `<ellipse cx="${x}" cy="${y}" rx="${f(rx * k)}" ry="${f(ry * k)}" fill="none" stroke="#8E8F8B" stroke-width="0.5" stroke-dasharray="${f(rx * 0.6)} ${f(rx * 0.25)}" stroke-dashoffset="${f(-otoc * rx * k)}"/>`;
    return s;
  };

  /* ——— Živé kusy ——— */
  const vrstvaPolice = (st) => {
    let s = "";
    /* horní police: hotové kusy, poskočí, když se na ně ukáže */
    NAHORE.forEach((p, i) => (s += `<g opacity="1">${hotovy(p, -st.poskok[`h${i}`] || 0)}</g>`));
    /* dolní police: čerstvě podepsané misky dnem vzhůru */
    for (const m of st.rada) {
      const dy = -(st.poskok[`r${m.k}`] || 0);
      s += `<g opacity="${f(m.op)}">${miskaVzhuru([m.x, POLICE[1].y + dy], { r: 7.6, h: 7.4, rb: 3.8, k: 0.42, v: 0.92, hlina: kus(m.k).hlina, naklon: kus(m.k).kriva ? -7 : 0 })}</g>`;
    }
    return s;
  };
  const vrstvaOdrezky = (st) =>
    st.odrezky
      .map((o) => {
        const op = clamp(Math.min(1, (o.zivot - o.vek) / 1.2));
        return `<path d="M0 0 c1.6 -1.8 3.6 -0.4 2.2 1.4 c-1.4 1.8 -3.6 0.2 -1.6 -1.8 c1.4 -1.4 3.4 0 3.2 1.6" transform="translate(${f(o.x)} ${f(o.y)}) rotate(${f(o.rot)}) scale(${f(o.s)})" stroke="${o.barva}" stroke-width="0.9" fill="none" stroke-linecap="round" opacity="${f(op)}"/>`;
      })
      .join("");
  const nastroj = (tip, uhel, druh) => {
    const u = rad(uhel);
    const d = [Math.cos(u), Math.sin(u)];
    const delka = druh === "ocko" ? 6 : 6.4;
    const A = [tip[0] + d[0] * delka, tip[1] + d[1] * delka];
    const B = [A[0] + d[0] * 11, A[1] + d[1] * 11];
    let s = "";
    if (druh === "ocko") s += `<path d="M${pt(tip)} L${pt(A)}" stroke="#6E6E70" stroke-width="0.9"/><path d="M${pt([tip[0] - d[1] * 1.6, tip[1] + d[0] * 1.6])} Q${pt([tip[0] - d[0] * 2, tip[1] - d[1] * 2])} ${pt([tip[0] + d[1] * 1.6, tip[1] - d[0] * 1.6])}" stroke="#8C8C8E" stroke-width="0.9" fill="none"/>`;
    else s += `<path d="M${pt(tip)} L${pt(A)}" stroke="#9A9A9C" stroke-width="0.7" stroke-linecap="round"/>`;
    s += `<path d="M${pt(A)} L${pt(B)}" stroke="#7A5A3E" stroke-width="2.8" stroke-linecap="round"/><path d="M${pt(A)} L${pt(B)}" stroke="#C49A6C" stroke-width="1.8" stroke-linecap="round"/>`;
    return { s, ruka: [A[0] + d[0] * 5, A[1] + d[1] * 5] };
  };
  /** Miska na točně (nebo na cestě na polici) a vše, co se na ní děje. */
  const vrstvaPrace = (st) => {
    const p = st.prace;
    if (!p) return "";
    const ks = kus(p.k);
    const r = MISKA.r * p.meritko, h = MISKA.h * p.meritko, rb = MISKA.rb * p.meritko;
    let s = "";
    /* stín pod miskou na točně */
    if (p.naTocne) s += `<ellipse cx="${f(p.O[0] + 2)}" cy="${f(p.O[1] + 1)}" rx="${f(r * 1.02)}" ry="${f(r * K * 1.02)}" fill="#2A2624" opacity="0.18"/>`;
    s += miskaVzhuru(p.O, { r, h, rb, k: p.k_, v: p.v_, hlina: ks.hlina, noha: p.noha, naklon: ks.kriva ? -6 : 0, posunDna: ks.kriva ? 2.4 * p.meritko : 0 });
    const yb = p.O[1] - h * p.v_, xb = p.O[0] + (ks.kriva ? 2.4 * p.meritko : 0);
    /* stopy po točení: rýhy, které jedou dokola */
    if (p.naTocne && p.toci > 0.02) {
      for (let i = 0; i < 5; i++) {
        const u = ((st.otoceni * 0.16 + i / 5) % 1 + 1) % 1;
        const a = u * Math.PI;
        const xx = p.O[0] - Math.cos(a) * r * 0.82, yy = p.O[1] - h * p.v_ * 0.42 + Math.sin(a) * 2.4;
        s += `<path d="M${f(xx)} ${f(yy - 2)} v4" stroke="${mix(ks.hlina, "#2A1E14", 0.4)}" stroke-width="0.6" opacity="${f(0.5 * Math.sin(a) * p.toci)}"/>`;
      }
    }
    /* tužkou psané jméno, které se seřízne */
    const T = `translate(${f(xb)} ${f(yb + 0.6)}) scale(${f(p.meritko)} ${f(p.meritko * p.k_ * 1.08)})`;
    if (ks.tuzka && p.tuzka > 0.01)
      s += `<text transform="${T}" x="0" y="2.8" text-anchor="middle" font-family="Caveat, cursive" font-weight="400" font-size="${TEXT.velikost}" fill="#5E5E68" opacity="${f(0.85 * p.tuzka)}">${esc(ks.jmeno)}</text>`;
    /* rytina: světlá hrana a tmavá rýha, odhaluje se zleva */
    if (p.pise > 0) {
      const w = sirkaTextu(ks.jmeno);
      s += `<clipPath id="ce2-psani"><rect x="${f(-w / 2 - 2)}" y="-12" width="${f((w + 4) * p.pise)}" height="24"/></clipPath>`;
      s += `<g transform="${T}"><g clip-path="url(#ce2-psani)">` +
        `<text x="0.35" y="3.3" text-anchor="middle" font-family="Caveat, cursive" font-weight="600" font-size="${TEXT.velikost}" fill="#FFF4E0" opacity="0.7">${esc(ks.jmeno)}</text>` +
        `<text x="0" y="2.8" text-anchor="middle" font-family="Caveat, cursive" font-weight="600" font-size="${TEXT.velikost}" fill="${mix(ks.hlina, "#2A1E14", 0.62)}">${esc(ks.jmeno)}</text>` +
        `</g></g>`;
    }
    /* drobky na dně */
    for (const d of st.drobky) s += `<circle cx="${f(d.x)}" cy="${f(d.y)}" r="${f(d.r)}" fill="${mix(ks.hlina, "#FFF4E0", 0.2)}" stroke="${mix(ks.hlina, "#2A1E14", 0.4)}" stroke-width="0.2" opacity="${f(d.op)}"/>`;
    /* lesk zapamatování */
    if (p.lesk > 0) s += `<path d="${jiskraD(4.6 * p.lesk)}" transform="translate(${f(xb + 9)} ${f(yb - 6)}) rotate(${f(p.lesk * 45)})" fill="#FFF8E6" opacity="${f(p.lesk)}"/>`;
    return s;
  };
  /* Ruce a nástroj nad miskou */
  const vrstvaRuce = (st) => {
    const p = st.prace;
    let s = "";
    const kresliRuku = (S0, H, o = {}) => rucka(S0, H, { tloustka: 3.4, barva: "#E9D3AE", obrys: "#8A6A48", ...o });
    let H_P = [RAMENO_P[0] + 4, RAMENO_P[1] + 14], H_L = [RAMENO_L[0] - 3, RAMENO_L[1] + 14];
    let nastr = "";
    if (p && p.nastroj) {
      const n = nastroj(p.nastroj.tip, p.nastroj.uhel, p.nastroj.druh);
      nastr = n.s;
      H_P = n.ruka;
    }
    if (p && p.nese) {
      H_P = [p.O[0] + MISKA.r * p.meritko * 0.9, p.O[1] - MISKA.h * p.meritko * p.v_ * 0.4];
      H_L = [p.O[0] - MISKA.r * p.meritko * 0.9, p.O[1] - MISKA.h * p.meritko * p.v_ * 0.4];
    }
    s += kresliRuku(RAMENO_L, H_L);
    s += nastr + kresliRuku(RAMENO_P, H_P);
    return s;
  };
  /* Deska s ruční linkou se nakreslí jednou; tvář a jméno na břiše mají vlastní vrstvu */
  const vrstvaCedulka = () => {
    const lic = () => cedDeska("ce2", { d: { ...DREVO, svetle: "#F7E6C6", tmave: "#E6C99A" } });
    return (
      `<path d="${CED.tvar}" transform="translate(${DIRA[0] - 3} ${DIRA[1] + 2}) scale(${S}) translate(-90 -62)" fill="#5A3E26" opacity="0.14"/>` +
      snurka(`M${HAK[0]} ${HAK[1]} L${DIRA[0]} ${DIRA[1] - 1}`, { sirka: 1.6, obrys: "#5E160B" }) +
      `<g transform="${CEDT}"><g filter="url(#ce2-tah)">${otocena(0, lic, lic)}</g></g>`
    );
  };
  const vrstvaTvar = (st) =>
    `<g transform="${CEDT}">` +
    /* čárky „textu“ se prolnou se jménem */
    `<g clip-path="url(#ce2-orez)">${(st.napis ? st.napisSila : 0) < 0.99 ? cedRadky({ sila: 1 - (st.napis ? st.napisSila : 0) }) : ""}${st.napis ? cedRadky({ text: st.napis, sila: st.napisSila }) : ""}</g>` +
    cedTvar("ce2", { dx: st.pohled[0], dy: st.pohled[1], mrk: st.mrk, oci: st.oci, usta: st.usta, tvare: 0.45 }) +
    `</g>`;
  const vrstvaPrach = (st) =>
    st.prach
      .map(([x, y, op]) => `<circle cx="${f(x)}" cy="${f(y)}" r="0.55" fill="#FFF6DA" opacity="${f(op)}"/>`)
      .join("");
  /* Za oknem: z ořechu padá listí (je říjen) a občas přeletí pták */
  const LISTI = Array.from({ length: 4 }, (_, i) => {
    const r = rng(60 + i * 7);
    return { x: 118 + r() * 32, perioda: 6 + r() * 4, fz: r() * 10, barva: ["#C9A24A", "#9AA375", "#B8802E", "#D9B25E"][i] };
  });
  const vrstvaOkno = (st) => {
    let s = "";
    for (const l of LISTI) {
      const u = (((st.t + l.fz) / l.perioda) % 1 + 1) % 1;
      const x = l.x + Math.sin(u * 9 + l.fz) * 4, y = 12 + u * 50, rot = Math.sin(u * 7 + l.fz) * 70;
      s += `<path d="M0 -2.2 Q1.6 0 0 2.2 Q-1.6 0 0 -2.2 Z" transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)})" fill="${l.barva}" stroke="#6E5A2E" stroke-width="0.3"/>`;
    }
    if (st.ptak) {
      const [x, y, kridla] = st.ptak;
      const k = Math.sin(kridla) * 2.6;
      s += `<path d="M${f(x - 3.4)} ${f(y - k)} Q${f(x - 1.4)} ${f(y - 1)} ${f(x)} ${f(y)} Q${f(x + 1.4)} ${f(y - 1)} ${f(x + 3.4)} ${f(y - k)}" stroke="#4A3A2C" stroke-width="0.9" fill="none" stroke-linecap="round"/>`;
    }
    return `<g clip-path="url(#ce2-okno)">${s}</g>`;
  };
  const vrstvaLem = () =>
    `<path d="${TVAR}" fill="none" stroke="#B98E5A" stroke-width="2.6" opacity="0.5" filter="url(#ce2-lem-tah)"/>`;

  const defs = () =>
    cedDefs("ce2", { ...DREVO, svetle: "#F7E6C6", tmave: "#E6C99A" }) +
        `<clipPath id="ce2-scena"><path d="${TVAR}"/></clipPath>` +
    `<clipPath id="ce2-okno"><rect x="114" y="14" width="40" height="46"/></clipPath>` +
    `<filter id="ce2-lem" x="-15%" y="-15%" width="130%" height="130%"><feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="21" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="12" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation="2.2"/></filter>` +
    `<filter id="ce2-lem-tah" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.07" numOctaves="3" seed="5" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="4" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation="0.6"/></filter>` +
    `<filter id="ce2-tah" x="-8%" y="-8%" width="116%" height="116%" color-interpolation-filters="sRGB">` +
    `<feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="4" result="vlna"/>` +
    `<feDisplacementMap in="SourceGraphic" in2="vlna" scale="2" xChannelSelector="R" yChannelSelector="G" result="tah"/>` +
    `<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="11" result="zrno"/>` +
    `<feColorMatrix in="zrno" type="matrix" values="0 0 0 0 0.23  0 0 0 0 0.18  0 0 0 0 0.16  0.5 0 0 0 -0.24" result="skvrny"/>` +
    `<feComposite in="skvrny" in2="tah" operator="in" result="zrnoVTvaru"/>` +
    `<feMerge><feMergeNode in="tah"/><feMergeNode in="zrnoVTvaru"/></feMerge></filter>` +
    `<linearGradient id="ce2-zed" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EDD5AA"/><stop offset="1" stop-color="#DCB988"/></linearGradient>` +
    `<linearGradient id="ce2-stul" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B98E62"/><stop offset="1" stop-color="#D2AE80"/></linearGradient>` +
    `<linearGradient id="ce2-nebe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FBE6B4"/><stop offset="1" stop-color="#F3BE76"/></linearGradient>` +
    `<radialGradient id="ce2-slunce"><stop offset="0" stop-color="#FFF8E0"/><stop offset="0.4" stop-color="#FFE9B0" stop-opacity="0.8"/><stop offset="1" stop-color="#FFE9B0" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="ce2-paprsek" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF2CC" stop-opacity="0.9"/><stop offset="1" stop-color="#FFE2A0" stop-opacity="0"/></linearGradient>` +
    `<linearGradient id="ce2-hlinik" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#C9CAC6"/><stop offset="0.6" stop-color="#A9AAA6"/><stop offset="1" stop-color="#8E8F8B"/></linearGradient>`;

  /* ——— Simulace ——— */
  const novaDynamika = () => ({
    prace: null,
    dalsi: 0,
    konecPosledniho: -1.6,
    rada: [3, 2, 1, 0].map((n, i) => ({ k: -(i + 1), x: SLOTY[i], op: 1 })),
    posun: null,
    otoceni: 0,
    odrezky: [],
    drobky: [],
    poskok: {},
    ukazuje: null,
    ukazujeOd: -10,
    kyv: { a: 0, v: 0 },
    nahoda: rng(404),
    zvuk: [],
    pohled: [0, 0],
    uPred: -1,
    ptak: null,
    ptakDalsi: 6,
    skrab: 0,
  });
  const pres = (a, b, x) => a < x && b >= x;
  /** Co je pod myší: kus na polici, nebo nic. */
  const podMysi = (dyn, m) => {
    if (!m) return null;
    if (m.y > POLICE[0].y - 18 && m.y < POLICE[0].y + 2) {
      const i = NAHORE.findIndex((p) => Math.abs(m.x - p.x) < 9);
      if (i >= 0) return { klic: `h${i}`, jmeno: NAHORE[i].jmeno, kde: [NAHORE[i].x, POLICE[0].y - 8] };
    }
    if (m.y > POLICE[1].y - 12 && m.y < POLICE[1].y + 2) {
      const r = dyn.rada.find((q) => q.op > 0.5 && Math.abs(m.x - q.x) < 8.6);
      if (r) return { klic: `r${r.k}`, jmeno: kus(r.k).jmeno, kde: [r.x, POLICE[1].y - 5] };
    }
    return null;
  };
  const krok = (dyn, t, dt, vstup) => {
    const R = dyn.nahoda;
    const nova = () => {
      dyn.prace = { start: t, k: dyn.dalsi++ };
      dyn.drobky = [];
    };
    /* kliknutí: na kus na polici = ukáže jméno, jinde = další miska */
    if (vstup.kliky && vstup.kliky.length) {
      for (const c of vstup.kliky) {
        const pod = podMysi(dyn, c);
        if (pod) {
          dyn.ukazuje = pod;
          dyn.ukazujeOd = t;
          dyn.poskok[pod.klic] = { t };
          dyn.zvuk.push({ druh: "cink", sila: 0.8, pan: (pod.kde[0] - 90) / 90 });
        } else if (!dyn.prace) nova();
      }
      vstup.kliky.length = 0;
    }
    if (!dyn.prace && t - dyn.konecPosledniho > 2.4 && t > 0.6) nova();
    const p = dyn.prace;
    const u = p ? t - p.start : -1;
    const uP = dyn.uPred;
    const ks = p ? kus(p.k) : null;
    if (p) {
      if (pres(uP, u, 0.25)) dyn.zvuk.push({ druh: "tup", sila: 0.9, pan: 0.25 });
      if (ks.kriva && pres(uP, u, 0.6)) dyn.zvuk.push({ druh: "chichot", sila: 0.8, pan: -0.3 });
      if (ks.tuzka && pres(uP, u, 0.6)) dyn.zvuk.push({ druh: "hm", sila: 0.8, pan: -0.3 });
      /* seřezávání: odřezky se kroutí a padají */
      const v = tocnaRychlost(u);
      if (u > FAZE.toci + 0.5 && u < FAZE.rydlo - 0.3) {
        if (R() < dt * 11) {
          const a = R() * Math.PI;
          dyn.odrezky.push({ x: DNO[0] + 6, y: DNO[1] - 1, vx: 10 + R() * 20, vy: -14 - R() * 12, rot: R() * 360, w: (R() - 0.5) * 900, s: 0.45 + R() * 0.35, vek: 0, zivot: 6 + R() * 3, barva: mix(ks.hlina, "#FFF4E0", 0.05 + R() * 0.2), dopad: TOCNA.y + 6 + R() * 26 * Math.sin(a) });
        }
        dyn.skrab += dt * 9;
        while (dyn.skrab >= 1) {
          dyn.skrab -= 1;
          dyn.zvuk.push({ druh: "skrab", sila: 0.3 + R() * 0.3, pan: 0.3 });
        }
      }
      if (pres(uP, u, FAZE.rydlo)) dyn.zvuk.push({ druh: "tuk", sila: 0.5, pan: 0.2 });
      /* psaní: každé písmeno dvakrát škrábne a nadrobí */
      if (u > FAZE.pise && u < FAZE.fouka - 0.25) {
        const n = ks.jmeno.length;
        const pred = Math.floor(piseK(uP) * n * 2), ted = Math.floor(piseK(u) * n * 2);
        if (ted > pred) {
          dyn.zvuk.push({ druh: "ryt", sila: 0.5 + R() * 0.4, pan: 0.25 });
          const w = sirkaTextu(ks.jmeno);
          const x = DNO[0] - w / 2 + w * piseK(u);
          for (let i = 0; i < 2; i++) dyn.drobky.push({ x: x + (R() - 0.5) * 2, y: DNO[1] + 0.6 + (R() - 0.5) * 2.4, vx: 0, vy: 0, r: 0.3 + R() * 0.3, op: 1, letí: false });
        }
      }
      if (pres(uP, u, FAZE.fouka + 0.1)) {
        dyn.zvuk.push({ druh: "fuk", sila: 0.8, pan: 0 });
        for (const d of dyn.drobky) {
          d.letí = true;
          d.vx = 26 + R() * 30;
          d.vy = -8 - R() * 10;
        }
      }
      if (pres(uP, u, FAZE.pamatuje + 0.1)) dyn.zvuk.push({ druh: "ding", sila: 0.8, pan: -0.3 });
      if (pres(uP, u, FAZE.nese)) {
        dyn.rada = dyn.rada.map((m) => ({ ...m, od: m.x }));
        dyn.posun = t;
      }
      if (pres(uP, u, FAZE.polozi)) {
        dyn.zvuk.push({ druh: "tup", sila: 0.6, pan: -0.5 });
        dyn.rada.push({ k: p.k, x: SLOTY[0], op: 1 });
      }
      if (u >= FAZE.konec) {
        dyn.prace = null;
        dyn.konecPosledniho = t;
      }
      dyn.otoceni += v * dt * 9;
    }
    dyn.uPred = dyn.prace ? u : -1;
    /* řada na polici: posunou se doprava, poslední zmizí */
    if (dyn.posun != null) {
      const k = smooth((t - dyn.posun) / 0.8);
      for (const m of dyn.rada) {
        if (m.od == null) continue;
        const iz = SLOTY.indexOf(m.od);
        const cil = iz + 1 < SLOTY.length ? SLOTY[iz + 1] : SLOTY[SLOTY.length - 1] + 18;
        m.x = lerp(m.od, cil, k);
        if (iz + 1 >= SLOTY.length) m.op = 1 - k;
      }
      if (k >= 1) {
        dyn.rada = dyn.rada.filter((m) => m.op > 0.01).map((m) => ({ k: m.k, x: m.x, op: 1 }));
        dyn.posun = null;
      }
    }
    for (const o of dyn.odrezky) {
      o.vek += dt;
      if (o.y < o.dopad) {
        o.vy += 90 * dt;
        o.x += o.vx * dt;
        o.y += o.vy * dt;
        o.rot += o.w * dt;
      }
    }
    dyn.odrezky = dyn.odrezky.filter((o) => o.vek < o.zivot);
    for (const d of dyn.drobky) {
      if (!d.letí) continue;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vy += 40 * dt;
      d.op = Math.max(0, d.op - dt * 1.6);
    }
    dyn.drobky = dyn.drobky.filter((d) => d.op > 0.02);
    /* najetí myší: Cedulka ukáže jméno */
    const pod = podMysi(dyn, vstup.mys);
    if (pod && (!dyn.ukazuje || dyn.ukazuje.klic !== pod.klic || t - dyn.ukazujeOd > 0.2)) {
      if (!dyn.ukazuje || dyn.ukazuje.klic !== pod.klic) {
        dyn.poskok[pod.klic] = { t };
        dyn.zvuk.push({ druh: "tuk", sila: 0.25, pan: (pod.kde[0] - 90) / 90 });
      }
      dyn.ukazuje = pod;
      dyn.ukazujeOd = t;
    }
    /* pták za oknem */
    if (!dyn.ptak && t > dyn.ptakDalsi) {
      dyn.ptak = { od: t, y: 26 + R() * 18, smer: R() < 0.5 ? 1 : -1 };
      dyn.zvuk.push({ druh: "ptak", sila: 0.5, pan: 0.7 });
    }
    if (dyn.ptak && t - dyn.ptak.od > 2.2) {
      dyn.ptak = null;
      dyn.ptakDalsi = t + 9 + R() * 8;
    }
    kyvadlo(dyn.kyv, dt, { tuhost: 10, utlum: 2.4, sila: Math.sin(t * 0.9) * 0.1 + (p && u > FAZE.pise && u < FAZE.fouka ? Math.sin(t * 13) * 0.25 : 0) });
    /* pohled: na práci, na ukázaný kus, jinak na myš */
    let kam = null;
    if (dyn.ukazuje && t - dyn.ukazujeOd < 1.6) kam = dyn.ukazuje.kde;
    else if (p && u < FAZE.nese) kam = [DNO[0], DNO[1]];
    else if (vstup.mys) kam = [vstup.mys.x, vstup.mys.y];
    const cil = kam ? [clamp((kam[0] - TVAR_STRED[0]) / 30, -1, 1) * 2, clamp((kam[1] - TVAR_STRED[1]) / 30, -1, 1) * 1.6] : [0, 0];
    dyn.pohled = dyn.pohled.map((q, i) => q + (cil[i] - q) * (1 - Math.exp(-dt / 0.12)));
  };
  /** Kde je miska, nástroj a co dělá Cedulka v čase u od začátku kusu. */
  const stavPrace = (d, t) => {
    const p = d.prace;
    if (!p) return null;
    const u = t - p.start;
    const ks = kus(p.k);
    const out = { k: p.k, u, O: [TOCNA.x, TOCNA.y], meritko: 1, k_: K, v_: V, naTocne: true, noha: seriznuto(u), tuzka: 1 - seriznuto(u), pise: 0, toci: tocnaRychlost(u), lesk: 0, nastroj: null, nese: false, drzi: false };
    if (u < 0.25) out.O = [TOCNA.x, TOCNA.y - (1 - easeOut(u / 0.25)) * 22];
    if (u > FAZE.toci + 0.2 && u < FAZE.rydlo - 0.15) {
      out.nastroj = { tip: [DNO[0] + 7.4, DNO[1] - 1.4 + Math.sin(t * 30) * 0.2], uhel: -42, druh: "ocko" };
      out.drzi = true;
    }
    if (u > FAZE.pise - 0.3 && u < FAZE.fouka) {
      const w = sirkaTextu(ks.jmeno);
      const k = piseK(u);
      const vlnka = Math.sin(k * ks.jmeno.length * Math.PI * 2) * 1.6;
      out.nastroj = { tip: [DNO[0] - w / 2 + w * k, DNO[1] + 0.8 + vlnka * K], uhel: -64, druh: "rydlo" };
      out.drzi = true;
    }
    if (u > FAZE.pise) out.pise = Math.max(piseK(u), u > FAZE.fouka ? 1 : 0);
    if (u > FAZE.pamatuje && u < FAZE.nese) out.lesk = Math.sin(Math.PI * clamp((u - FAZE.pamatuje) / 0.9));
    if (u >= FAZE.nese) {
      const k = smooth((u - FAZE.nese) / (FAZE.polozi - FAZE.nese));
      const P0 = [TOCNA.x, TOCNA.y], P1 = [TOCNA.x - 6, 92], P2 = [SLOTY[0] + 10, 46], P3 = [SLOTY[0], POLICE[1].y];
      const b = (a, b2, c, e) => (1 - k) ** 3 * a + 3 * (1 - k) ** 2 * k * b2 + 3 * (1 - k) * k * k * c + k ** 3 * e;
      out.O = [b(P0[0], P1[0], P2[0], P3[0]), b(P0[1], P1[1], P2[1], P3[1])];
      out.meritko = lerp(1, 7.6 / MISKA.r, k);
      out.k_ = lerp(K, 0.42, k);
      out.v_ = lerp(V, 0.92, k);
      out.naTocne = false;
      out.nese = u < FAZE.polozi;
      out.pise = 1;
      if (u > FAZE.polozi) return null;
    }
    return out;
  };
  const stav = (t, vstup = {}, dyn) => {
    const d = dyn || novaDynamika();
    const p = stavPrace(d, t);
    const u = p ? p.u : -1;
    const ks = d.prace ? kus(d.prace.k) : null;
    let oci = "kulate", usta = "usmev", napis = null, napisSila = 1;
    if (p) {
      if (u < FAZE.toci) {
        if (ks.kriva) [oci, usta] = ["smich", "smich"];
        else if (ks.tuzka) [oci, usta] = ["prisne", "rovna"];
        else [oci, usta] = ["siroke", "o"];
      } else if (u < FAZE.rydlo) [oci, usta] = [ks.tuzka && u < FAZE.toci + 1.2 ? "prisne" : "kulate", "rovna"];
      else if (u < FAZE.fouka) [oci, usta] = ["kulate", "jazyk"];
      else if (u < FAZE.pamatuje) [oci, usta] = ["zavrene", "fuk"];
      else if (u < FAZE.nese) {
        [oci, usta] = ["smich", "usmev"];
        napis = ks.jmeno;
        napisSila = Math.sin(Math.PI * clamp((u - FAZE.pamatuje) / (FAZE.nese - FAZE.pamatuje)));
      }
    }
    if (d.ukazuje && t - d.ukazujeOd < 1.6) {
      napis = d.ukazuje.jmeno;
      napisSila = clamp((1.6 - (t - d.ukazujeOd)) / 0.4);
      if (!p || u > FAZE.nese) [oci, usta] = ["kulate", "usmev"];
    }
    const poskok = {};
    for (const [klic, v] of Object.entries(d.poskok)) {
      const q = t - v.t;
      if (q < 0.45) poskok[klic] = Math.sin(Math.PI * (q / 0.45)) * 3.2;
    }
    const prach = Array.from({ length: 22 }, (_, i) => {
      const r = rng(i * 13 + 5);
      const x0 = 60 + r() * 90, y0 = 70 + r() * 100;
      const x = x0 + Math.sin(t * (0.2 + r() * 0.3) + i) * 6, y = y0 + Math.sin(t * (0.15 + r() * 0.2) + i * 2) * 5 - ((t * (1 + r() * 2)) % 10);
      const vPaprsku = clamp(1 - Math.abs((x - (124 - (y - 60) * 0.42)) / 26));
      return [x, y, vPaprsku * (0.35 + 0.45 * Math.sin(t * 1.3 + i) ** 2)];
    });
    let ptak = null;
    if (d.ptak) {
      const q = (t - d.ptak.od) / 2.2;
      ptak = [d.ptak.smer > 0 ? lerp(108, 162, q) : lerp(162, 108, q), d.ptak.y + Math.sin(q * 9) * 1.6, t * 22];
    }
    return {
      t, prace: p, otoceni: d.otoceni, odrezky: d.odrezky, drobky: d.drobky, rada: d.rada, poskok, prach, ptak,
      kyv: d.kyv.a, pohled: d.pohled, mrk: mrkani(t, [1.2, 4.4, 4.65, 7.9], 9), oci, usta, napis, napisSila,
    };
  };
  const snimek = (st) => Math.floor(st.t * 30);

  return {
    id: "v2",
    viewBox: "0 0 180 180",
    defs,
    novaDynamika,
    krok,
    stav,
    hukot: (st) => (st.prace ? clamp(st.prace.toci * 0.8) : 0),
    klidne: { t: 6.2 },
    vrstvy: [
      { id: "podklad", kresli: vrstvaPodklad, tezka: true },
      { id: "okno", kresli: vrstvaOkno, klic: (st) => Math.floor(st.t * 20) },
      { id: "police", kresli: vrstvaPolice, klic: (st) => st.rada.map((m) => `${m.k}:${f(m.x)}:${f(m.op)}`).join() + JSON.stringify(st.poskok) },
      { id: "tocna", kresli: vrstvaTocna, klic: (st) => f(st.otoceni) },
      { id: "odrezky", kresli: vrstvaOdrezky, klic: snimek },
      { id: "prace", kresli: vrstvaPrace, klic: snimek },
      { id: "cedulka", kresli: vrstvaCedulka, pohyb: (st) => ({ uhel: (st.kyv * 180) / Math.PI, cx: HAK[0], cy: HAK[1] }) },
      {
        id: "tvar",
        kresli: vrstvaTvar,
        klic: (st) => `${f(st.pohled[0])},${f(st.pohled[1])},${f(st.mrk)},${st.oci},${st.usta},${st.napis},${f(st.napisSila)}`,
        pohyb: (st) => ({ uhel: (st.kyv * 180) / Math.PI, cx: HAK[0], cy: HAK[1] }),
      },
      { id: "ruce", kresli: vrstvaRuce, klic: snimek },
      { id: "paprsky", kresli: vrstvaPaprsky, styl: "mix-blend-mode:screen" },
      { id: "prach", kresli: vrstvaPrach, klic: snimek, styl: "mix-blend-mode:screen" },
      { id: "lem", kresli: vrstvaLem },
    ],
  };
})();

/* ═══════════════════════════════════════════════════════════════════
 * 3 — INARI
 * Svatyně Fušimi Inari za soumraku, dívá se do ní branou torii. Za ní
 * vede do kopce tunel z tisíce rumělkových bran (senbon torii); na každé
 * je jméno toho, kdo ji daroval, takže je to vlastně jeden dlouhý seznam
 * jmen — Cedulčina parketa. U vchodu sedí kamenná liška s klíčem od
 * sýpky v tlamě a s červeným bryndáčkem.
 *
 * V Inari mají emy tvar lišky a lidi jim domalovávají obličeje — každá
 * je jiná. Cedulka visí na stojanu mezi nimi a skoro nejde poznat.
 * Kliknutí na lišku: někdo jí nakreslí nový obličej (fixa se objeví
 * a kreslí tah za tahem). Když se nic neděje, kreslí se samo. Kliknutí
 * na Cedulku: nasadí si lišáckou masku, aby nebyla poznat vůbec, a dalším
 * kliknutím ji zase sundá. Najetí na kamennou lišku rozsvítí jí oči
 * a tunelem proplují lišácké ohníčky kicunebi.
 * ═══════════════════════════════════════════════════════════════════ */
const V3 = (() => {
  const OTVOR = { x0: 25, x1: 155, y0: 19, y1: 176 };
  const VP = [64, 99];
  const ZEM = 150;
  const S = 0.24;
  const STOJAN = { x0: 96, x1: 153, strecha: 82, horni: 94, dolni: 121, noha: 160 };
  const SLOTY = [
    { x: 104, y: STOJAN.horni }, { x: 117.5, y: STOJAN.horni }, { x: 131, y: STOJAN.horni, ced: true }, { x: 144.5, y: STOJAN.horni },
    { x: 104, y: STOJAN.dolni }, { x: 117.5, y: STOJAN.dolni }, { x: 131, y: STOJAN.dolni }, { x: 144.5, y: STOJAN.dolni },
  ];
  const EMY = SLOTY.filter((s) => !s.ced);
  const CED_SLOT = SLOTY.find((s) => s.ced);
  const DIRA = [CED_SLOT.x, CED_SLOT.y + 6.4];
  const CEDT = `translate(${DIRA[0]} ${DIRA[1]}) scale(${S}) translate(-90 -62)`;
  const naPanel = ([x, y]) => [DIRA[0] + (x - 90) * S, DIRA[1] + (y - 62) * S];
  const TVAR_STRED = naPanel([90, 92]);
  const LISKA = { x: 40, y: 134 };
  const LS = 0.8;

  /* ——— Brány ——— */
  const RUMELKA = { svetla: "#E4643C", stred: "#D2452B", tmava: "#9E2A18" };
  /**
   * Brána mjódžin: kasagi s prohnutými konci a rumělkový šimaki pod ním,
   * nuki skrz sloupy, černé patky. cx střed, zem y paty, w rozteč sloupů,
   * h výška k hornímu okraji kasagi. tma 0…1 ztmaví vzdálené brány.
   */
  const torii = (cx, zem, w, h, { tma = 0, jmena = false, seed = 1 } = {}) => {
    const pw = w * 0.1, top = zem - h;
    const xL = cx - w / 2, xR = cx + w / 2;
    const kh = h * 0.07, sh = h * 0.05, ny = top + h * 0.21, nh = h * 0.055;
    const pres = w * 0.2, sori = h * 0.05;
    const r = (c) => mix(c, "#1A1420", tma);
    let s = "";
    for (const x of [xL, xR]) {
      s += `<path d="M${f(x - pw / 2)} ${f(zem)} L${f(x - pw * 0.44)} ${f(top + kh)} L${f(x + pw * 0.44)} ${f(top + kh)} L${f(x + pw / 2)} ${f(zem)} Z" fill="${r(RUMELKA.stred)}"/>`;
      s += `<path d="M${f(x + pw * 0.12)} ${f(zem)} L${f(x + pw * 0.1)} ${f(top + kh)} L${f(x + pw * 0.44)} ${f(top + kh)} L${f(x + pw / 2)} ${f(zem)} Z" fill="${r(RUMELKA.tmava)}" opacity="0.7"/>`;
      s += `<path d="M${f(x - pw * 0.4)} ${f(zem)} L${f(x - pw * 0.36)} ${f(top + kh)}" stroke="${r(RUMELKA.svetla)}" stroke-width="${f(pw * 0.16)}" opacity="0.7"/>`;
      s += `<rect x="${f(x - pw * 0.56)}" y="${f(zem - h * 0.09)}" width="${f(pw * 1.12)}" height="${f(h * 0.09)}" fill="${r("#1E1A1C")}"/>`;
      if (jmena) {
        const R = rng(seed + x);
        let tahy = "";
        for (let i = 0; i < 9; i++) {
          const y = top + h * 0.3 + i * h * 0.055;
          const d = pw * (0.12 + R() * 0.22);
          tahy += `<path d="M${f(x - d)} ${f(y)} L${f(x + d)} ${f(y + h * 0.012)}"/>`;
        }
        s += `<g stroke="${r("#1E1A1C")}" stroke-width="${f(h * 0.012)}" stroke-linecap="round" opacity="0.8">${tahy}</g>`;
      }
    }
    s += `<rect x="${f(xL - pw * 0.9)}" y="${f(ny)}" width="${f(w + pw * 1.8)}" height="${f(nh)}" fill="${r(RUMELKA.stred)}"/>`;
    s += `<rect x="${f(xL - pw * 0.9)}" y="${f(ny + nh * 0.7)}" width="${f(w + pw * 1.8)}" height="${f(nh * 0.3)}" fill="${r(RUMELKA.tmava)}" opacity="0.7"/>`;
    const kas = `M${f(xL - pres)} ${f(top - sori)} Q${f(cx)} ${f(top + sori * 0.6)} ${f(xR + pres)} ${f(top - sori)} L${f(xR + pres * 0.86)} ${f(top + kh - sori * 0.3)} Q${f(cx)} ${f(top + kh + sori * 0.5)} ${f(xL - pres * 0.86)} ${f(top + kh - sori * 0.3)} Z`;
    s += `<path d="${kas}" fill="${r("#1E1A1C")}"/>`;
    s += `<path d="M${f(xL - pres * 0.8)} ${f(top + kh - sori * 0.25)} Q${f(cx)} ${f(top + kh + sori * 0.5)} ${f(xR + pres * 0.8)} ${f(top + kh - sori * 0.25)} L${f(xR + pres * 0.74)} ${f(top + kh + sh - sori * 0.2)} Q${f(cx)} ${f(top + kh + sh + sori * 0.45)} ${f(xL - pres * 0.74)} ${f(top + kh + sh - sori * 0.2)} Z" fill="${r(RUMELKA.stred)}"/>`;
    return s;
  };
  /** Brány tunelu od nejvzdálenější k nejbližší: měřítko, posun do zatáčky, do kopce. */
  const BRANY = (() => {
    const N = 17, q = 0.84;
    const W0 = 56, H0 = 84, X0 = 70;
    const out = [];
    for (let i = N - 1; i >= 0; i--) {
      const s = Math.pow(q, i);
      const hloubka = 1 - s;
      const cx = VP[0] + (X0 - VP[0]) * s - 10 * hloubka * hloubka;
      const zem = VP[1] + (ZEM - VP[1]) * s - 4 * hloubka;
      out.push({ i, s, cx, zem, w: W0 * s, h: H0 * s });
    }
    return out;
  })();

  /* ——— Lišácká ema: hlava s ušima, dírka na šňůrku na čele ——— */
  const LIS_TVAR = "M0 22 L5.6 18 L9 11 L8.8 4.4 L7.4 -1.6 L3.4 2.4 Q0 1.2 -3.4 2.4 L-7.4 -1.6 L-8.8 4.4 L-9 11 L-5.6 18 Z";
  const lisEma = (obsah = "") =>
    `<path d="${LIS_TVAR}" fill="url(#ce3-drevo-lis)" stroke="#8A6A48" stroke-width="0.7" stroke-linejoin="round"/>` +
    `<path d="M6.6 0.6 L7.8 4.8 L4.6 3.4 Z M-6.6 0.6 L-7.8 4.8 L-4.6 3.4 Z" fill="#C4432B"/>` +
    `<circle cx="0" cy="4.2" r="0.7" fill="#8A6A48" opacity="0.6"/>` +
    `<rect x="-1.6" y="18" width="3.2" height="2.2" rx="0.4" fill="#C4432B" opacity="0.8"/>` +
    obsah;

  /*
    Obličeje, jak je lidi kreslí fixou: seznam tahů v souřadnicích lišky
    (oči kolem y 9.5, pusa kolem 14.5). Tah je lomená čára (body), tečka
    je kruh. Kreslí se jeden po druhém, takže fixa jde tah za tahem.
  */
  const oblouk = (cx, cy, r, a0, a1, n = 8) => Array.from({ length: n + 1 }, (_, i) => {
    const a = rad(lerp(a0, a1, i / n));
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  });
  const CERNA = "#1E1A1C", RUDA = "#C4432B", BILA = "#FFFDF6";
  const OBLICEJE = {
    kawaii: () => [
      { tecka: [-3.6, 9.4, 1.7], c: CERNA }, { tecka: [3.6, 9.4, 1.7], c: CERNA },
      { tecka: [-4.1, 8.7, 0.55], c: BILA }, { tecka: [3.1, 8.7, 0.55], c: BILA },
      { body: [[-1.8, 13.6], [-0.9, 14.6], [0, 13.8], [0.9, 14.6], [1.8, 13.6]], w: 0.6, c: CERNA },
      { body: [[-6.4, 12.4], [-5.6, 11.6]], w: 0.5, c: RUDA }, { body: [[-5.6, 12.6], [-4.8, 11.8]], w: 0.5, c: RUDA },
      { body: [[4.8, 12.6], [5.6, 11.8]], w: 0.5, c: RUDA }, { body: [[5.6, 12.4], [6.4, 11.6]], w: 0.5, c: RUDA },
    ],
    maska: () => [
      { body: [[-6, 8], [-3.6, 9.6], [-1.4, 9.2]], w: 0.9, c: RUDA }, { body: [[6, 8], [3.6, 9.6], [1.4, 9.2]], w: 0.9, c: RUDA },
      { body: [[-5.2, 9.6], [-2.2, 10.2]], w: 0.6, c: CERNA }, { body: [[5.2, 9.6], [2.2, 10.2]], w: 0.6, c: CERNA },
      { body: [[0, 4.6], [-1, 6.4], [0, 7.6], [1, 6.4], [0, 4.6]], w: 0.6, c: RUDA },
      { tecka: [0, 13, 0.8], c: CERNA },
      { body: [[-2.4, 15.2], [0, 16.2], [2.4, 15.2]], w: 0.6, c: CERNA },
    ],
    mrk: () => [
      { body: [[-5, 9.8], [-3.6, 8.4], [-2.2, 9.8]], w: 0.7, c: CERNA },
      { tecka: [3.6, 9.4, 1.4], c: CERNA },
      { body: [[-2.6, 13.6], [0, 15.4], [2.6, 13.6]], w: 0.7, c: CERNA },
      { body: [[0.6, 14.8], [1.2, 16.6], [2.2, 15.6], [2, 14.4]], w: 0.6, c: RUDA },
    ],
    zlobi: () => [
      { body: [[-5.6, 6.8], [-1.8, 8.4]], w: 0.9, c: CERNA }, { body: [[5.6, 6.8], [1.8, 8.4]], w: 0.9, c: CERNA },
      { tecka: [-3.4, 10, 1.1], c: CERNA }, { tecka: [3.4, 10, 1.1], c: CERNA },
      { body: [[-3, 15.4], [-1.5, 14.2], [0, 15.4], [1.5, 14.2], [3, 15.4]], w: 0.6, c: CERNA },
      { body: [[1.4, 14.4], [1.9, 16]], w: 0.5, c: CERNA },
    ],
    spi: () => [
      { body: oblouk(-3.6, 9, 1.8, 20, 160), w: 0.7, c: CERNA }, { body: oblouk(3.6, 9, 1.8, 20, 160), w: 0.7, c: CERNA },
      { tecka: [0, 14.6, 0.9], c: CERNA },
      { body: [[3.6, 3.4], [5.4, 3.4], [3.6, 5.2], [5.4, 5.2]], w: 0.5, c: CERNA },
      { body: [[5.6, 0.6], [6.8, 0.6], [5.6, 1.8], [6.8, 1.8]], w: 0.4, c: CERNA },
    ],
    kocka: () => [
      { tecka: [-3.6, 9.6, 1.1], c: CERNA }, { tecka: [3.6, 9.6, 1.1], c: CERNA },
      { body: [[-2.2, 13.4], [-1.1, 14.6], [0, 13.6], [1.1, 14.6], [2.2, 13.4]], w: 0.6, c: CERNA },
      { body: [[-3.4, 12.6], [-8, 11.4]], w: 0.4, c: CERNA }, { body: [[-3.4, 13.6], [-8, 13.8]], w: 0.4, c: CERNA },
      { body: [[3.4, 12.6], [8, 11.4]], w: 0.4, c: CERNA }, { body: [[3.4, 13.6], [8, 13.8]], w: 0.4, c: CERNA },
    ],
    srdce: () => {
      const srdicko = (cx, cy) => [[cx, cy + 1.6], [cx - 1.7, cy - 0.1], [cx - 1.2, cy - 1.3], [cx, cy - 0.6], [cx + 1.2, cy - 1.3], [cx + 1.7, cy - 0.1], [cx, cy + 1.6]];
      return [
        { body: srdicko(-3.6, 9.4), w: 0.8, c: RUDA, vypln: true }, { body: srdicko(3.6, 9.4), w: 0.8, c: RUDA, vypln: true },
        { body: oblouk(0, 12.6, 2.6, 25, 155), w: 0.7, c: CERNA },
      ];
    },
    knir: () => [
      { tecka: [-3.4, 9, 1], c: CERNA }, { tecka: [3.4, 9, 1], c: CERNA },
      { body: [[0, 13], [-2.4, 12.6], [-4.4, 13.8], [-5.6, 13.2], [-5.4, 12]], w: 1, c: CERNA },
      { body: [[0, 13], [2.4, 12.6], [4.4, 13.8], [5.6, 13.2], [5.4, 12]], w: 1, c: CERNA },
      { body: [[-1, 15.8], [1, 15.8]], w: 0.5, c: CERNA },
    ],
    bryle: () => [
      { body: oblouk(-3.6, 9.4, 2.2, 0, 360, 14), w: 0.6, c: CERNA }, { body: oblouk(3.6, 9.4, 2.2, 0, 360, 14), w: 0.6, c: CERNA },
      { body: [[-1.4, 9], [1.4, 9]], w: 0.5, c: CERNA },
      { tecka: [-3.6, 9.6, 0.7], c: CERNA }, { tecka: [3.6, 9.6, 0.7], c: CERNA },
      { body: oblouk(0, 13.4, 1.6, 30, 150), w: 0.6, c: CERNA },
    ],
    daruma: () => [
      { body: [[-6, 7.4], [-4, 6.4], [-1.6, 7.2]], w: 1.4, c: CERNA }, { body: [[6, 7.4], [4, 6.4], [1.6, 7.2]], w: 1.4, c: CERNA },
      { tecka: [-3.6, 10, 1.8], c: CERNA },
      { body: oblouk(3.6, 10, 1.8, 0, 360, 14), w: 0.5, c: CERNA },
      { body: [[-4.6, 13.8], [-2, 15.2], [0, 14.4], [2, 15.2], [4.6, 13.8]], w: 0.9, c: CERNA },
    ],
    kabuki: () => [
      { body: [[-2, 9.4], [-4.4, 8.8], [-7, 4.6]], w: 0.9, c: RUDA }, { body: [[2, 9.4], [4.4, 8.8], [7, 4.6]], w: 0.9, c: RUDA },
      { body: [[-5.4, 6.4], [-2.4, 5.2]], w: 1, c: CERNA }, { body: [[5.4, 6.4], [2.4, 5.2]], w: 1, c: CERNA },
      { body: [[-2.6, 10], [-4.4, 9.4]], w: 0.6, c: CERNA }, { body: [[2.6, 10], [4.4, 9.4]], w: 0.6, c: CERNA },
      { body: oblouk(0, 17, 2.6, 215, 325), w: 0.8, c: RUDA },
    ],
    hvezdy: () => {
      const hv = (cx, cy) => [0, 1, 2, 3, 4, 5].map((i) => [cx + Math.cos(rad(-90 + i * 144)) * 1.9, cy + Math.sin(rad(-90 + i * 144)) * 1.9]);
      return [
        { body: hv(-3.6, 9.4), w: 0.6, c: CERNA }, { body: hv(3.6, 9.4), w: 0.6, c: CERNA },
        { body: [[-2, 13.2], [0, 16.4], [2, 13.2], [-2, 13.2]], w: 0.6, c: CERNA, vypln: true },
        { body: [[6.4, 3.2], [7.4, 4.4]], w: 0.4, c: RUDA }, { body: [[-6.4, 3.2], [-7.4, 4.4]], w: 0.4, c: RUDA },
      ];
    },
  };
  const STYLY = Object.keys(OBLICEJE);
  const delkaTahu = (B) => B.reduce((a, p, i) => (i ? a + Math.hypot(p[0] - B[i - 1][0], p[1] - B[i - 1][1]) : 0), 0);
  /** Obličej nakreslený z části: k 0…1 přes všechny tahy. Vrací i polohu hrotu fixy. */
  const oblicej = (styl, k) => {
    const tahy = OBLICEJE[styl]();
    const delky = tahy.map((t) => (t.tecka ? t.tecka[2] * 4 : delkaTahu(t.body)));
    const celk = delky.reduce((a, b) => a + b, 0);
    let zbyva = k * celk, s = "", hrot = null;
    tahy.forEach((t, i) => {
      if (zbyva <= 0) return;
      const d = delky[i];
      const cast = clamp(zbyva / d);
      zbyva -= d;
      if (t.tecka) {
        const [x, y, r] = t.tecka;
        s += `<circle cx="${x}" cy="${y}" r="${f(r * Math.sqrt(cast))}" fill="${t.c}"/>`;
        if (cast < 1) hrot = [x + r * 0.3, y];
      } else {
        const L = Math.max(0.01, d);
        s += `<path d="${cara(t.body)}" fill="${t.vypln && cast >= 1 ? t.c : "none"}" stroke="${t.c}" stroke-width="${t.w}" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="${f(L + 1)}" stroke-dashoffset="${f((L + 1) * (1 - cast))}"/>`;
        if (cast < 1) {
          let jeste = cast * L;
          for (let j = 1; j < t.body.length; j++) {
            const a = t.body[j - 1], b = t.body[j];
            const dl = Math.hypot(b[0] - a[0], b[1] - a[1]);
            if (jeste <= dl) {
              hrot = [lerp(a[0], b[0], jeste / (dl || 1)), lerp(a[1], b[1], jeste / (dl || 1))];
              break;
            }
            jeste -= dl;
          }
        }
      }
    });
    return { s, hrot };
  };
  /** Fixa: černá, se stříbrným kroužkem, špička na hrotu. */
  const fixa = (P, uhel = -50) =>
    `<g transform="translate(${f(P[0])} ${f(P[1])}) rotate(${uhel})">` +
    `<path d="M0 0 L2 -0.9 L2 0.9 Z" fill="${CERNA}"/><rect x="2" y="-1.3" width="3" height="2.6" fill="#E9E4DA" stroke="#2A2426" stroke-width="0.25"/>` +
    `<rect x="5" y="-1.6" width="12" height="3.2" rx="0.8" fill="#2A2426"/><rect x="9" y="-1.6" width="1.1" height="3.2" fill="#BFC3C6"/><rect x="15" y="-1.9" width="2.6" height="3.8" rx="0.6" fill="#C4432B"/>` +
    `</g>`;

  /* ——— Statické kusy ——— */
  const vrstvaNebe = () => {
    const R = rng(31);
    let s = `<g clip-path="url(#ce3-otvor)">`;
    s += `<rect x="20" y="10" width="140" height="170" fill="url(#ce3-nebe)"/>`;
    s += `<g fill="#FFF3D8">${Array.from({ length: 14 }, () => `<circle cx="${f(28 + R() * 124)}" cy="${f(22 + R() * 24)}" r="${f(0.25 + R() * 0.35)}" opacity="${f(0.4 + R() * 0.5)}"/>`).join("")}</g>`;
    s += `<circle cx="132" cy="40" r="3.4" fill="#FFF6E0" opacity="0.9"/><circle cx="132" cy="40" r="10" fill="url(#ce3-mesic)"/>`;
    /* les: cedry jako pilové siluety ve dvou plánech */
    const les = (y0, barva, seed, vys) => {
      const r = rng(seed);
      let d = `M18 ${y0 + 40}`;
      for (let x = 18; x <= 162; x += 5 + r() * 4) {
        const v = vys * (0.6 + r() * 0.6);
        d += ` L${f(x)} ${f(y0 - v * 0.25)} L${f(x + 2.4)} ${f(y0 - v)} L${f(x + 4.8)} ${f(y0 - v * 0.25)}`;
      }
      return `<path d="${d} L162 ${y0 + 40} Z" fill="${barva}"/>`;
    };
    s += les(72, "#3B3A5E", 4, 26) + les(84, "#272840", 9, 30);
    /* zem, kamenná cesta do tunelu se schody */
    s += `<path d="M20 ${ZEM - 18} L160 ${ZEM - 20} L160 180 L20 180 Z" fill="#2A2632"/>`;
    const cesta = BRANY.map((b) => [b.cx, b.zem, b.w]);
    const levy = cesta.map(([x, y, w]) => [x - w * 0.36, y]), pravy = cesta.map(([x, y, w]) => [x + w * 0.36, y]);
    s += `<path d="${cara(levy)} L${pravy.reverse().map(pt).join(" L")} Z" fill="#8E8794"/>`;
    for (const b of BRANY.slice(-12)) s += `<path d="M${f(b.cx - b.w * 0.36)} ${f(b.zem)} L${f(b.cx + b.w * 0.36)} ${f(b.zem)}" stroke="#5E5866" stroke-width="${f(0.3 + b.s * 0.9)}"/>`;
    /* světlo na konci tunelu */
    const kon = BRANY[0];
    s += `<ellipse cx="${f(kon.cx)}" cy="${f(kon.zem - kon.h * 0.5)}" rx="${f(kon.w * 1.4)}" ry="${f(kon.h * 0.9)}" fill="url(#ce3-konec)"/>`;
    /* tunel: brány od konce k nám, vzdálené tmavší */
    for (const b of BRANY) s += torii(b.cx, b.zem, b.w, b.h, { tma: clamp((1 - b.s) * 0.75), jmena: b.s > 0.5, seed: b.i * 7 });
    /* lucerny podél cesty v tunelu */
    for (const b of BRANY.filter((q) => q.i % 3 === 1)) {
      for (const sx of [-1, 1]) {
        const x = b.cx + sx * b.w * 0.44, y = b.zem - b.h * 0.02;
        s += `<rect x="${f(x - b.s * 2.2)}" y="${f(y - b.s * 9)}" width="${f(b.s * 4.4)}" height="${f(b.s * 9)}" fill="#6E6872"/><rect x="${f(x - b.s * 1.4)}" y="${f(y - b.s * 7.4)}" width="${f(b.s * 2.8)}" height="${f(b.s * 2.8)}" fill="#FFD48A"/>`;
      }
    }
    s += `</g>`;
    return s;
  };
  /*
    Kamenná liška na podstavci, jak sedí u vchodu do Inari: štíhlá, hrudník
    vypnutý, čenich nahoru k tunelu, ocas zvednutý za zády jako plamen.
    V tlamě klíč od sýpky s rýží, na krku červený bryndáček jodarekake.
  */
  const LISKA_TELO = [[-10, 0], [-11.6, -6], [-9.4, -12], [-6, -18], [-3.2, -23], [-1.8, -28.6], [0.8, -32.2], [4.4, -32.6], [8, -30.8], [13.6, -27.8], [13.8, -26.4], [9.2, -25], [5.2, -23.6], [5.8, -19], [7.6, -13], [8.6, -6], [9.4, 0]];
  const LISKA_OCAS = [[-9.6, -3], [-16, -9], [-17.6, -19], [-14, -29], [-9.4, -35.6], [-8.6, -30], [-11, -22], [-9.8, -13], [-6.4, -7]];
  const vrstvaLiska = () => {
    const { x, y } = LISKA;
    const k = "#8E8A84", kt = "#5E5A54", ks = "#B4B0A8";
    const P = (B) => B.map(([a, b]) => [x + a, y + b]);
    return (
      /* podstavec */
      `<path d="M${x - 15} ${y + 4} L${x + 13} ${y + 4} L${x + 15} ${y + 10} L${x + 15} ${y + 40} L${x - 17} ${y + 40} L${x - 17} ${y + 10} Z" fill="#76726C" stroke="#4A4642" stroke-width="0.6"/>` +
      `<rect x="${x - 19}" y="${y + 1}" width="36" height="5" rx="1" fill="#8A867F" stroke="#4A4642" stroke-width="0.6"/>` +
      `<path d="M${x - 14} ${y + 16} H${x + 12} M${x - 14} ${y + 28} H${x + 12}" stroke="#5E5A54" stroke-width="0.5" opacity="0.6"/>` +
      `<g fill="#6E7A4E" opacity="0.7"><ellipse cx="${x - 12}" cy="${y + 39}" rx="5" ry="1.6"/><ellipse cx="${x + 9}" cy="${y + 5.6}" rx="3" ry="0.9"/></g>` +
      /* ocas za zády */
      `<path d="${hladka(P(LISKA_OCAS), true)}" fill="${k}" stroke="${kt}" stroke-width="0.6"/>` +
      `<path d="${hladka(P([[-14, -29], [-9.4, -35.6], [-8.6, -30], [-11, -26]]), true)}" fill="${ks}"/>` +
      `<path d="M${x - 14.4} ${y - 12} Q${x - 13} ${y - 20} ${x - 10.6} ${y - 26}" stroke="${kt}" stroke-width="0.5" fill="none" opacity="0.7"/>` +
      /* vzdálené ucho, tělo, bližší ucho */
      `<path d="M${x + 1.2} ${y - 31.4} L${x + 0.4} ${y - 39} L${x + 4} ${y - 32.4} Z" fill="${kt}"/>` +
      `<path d="${hladka(P(LISKA_TELO), true)}" fill="${k}" stroke="${kt}" stroke-width="0.6"/>` +
      `<path d="M${x + 3.4} ${y - 32.6} L${x + 5.4} ${y - 40.4} L${x + 7.6} ${y - 31.6} Z" fill="${k}" stroke="${kt}" stroke-width="0.6" stroke-linejoin="round"/>` +
      `<path d="M${x + 4.4} ${y - 33} L${x + 5.4} ${y - 38} L${x + 6.6} ${y - 32.4}" fill="#6A665F"/>` +
      /* stehno, přední nohy, tlapky */
      `<path d="M${x - 8.4} ${y - 1.4} Q${x - 6} ${y - 9.6} ${x + 1.6} ${y - 1.6}" stroke="${kt}" stroke-width="0.6" fill="none"/>` +
      `<path d="M${x + 4.6} ${y - 12} L${x + 4.8} ${y} M${x + 7.6} ${y - 10} L${x + 8.4} ${y}" stroke="${kt}" stroke-width="0.6"/>` +
      `<path d="M${x + 3.6} ${y} h3 M${x + 7} ${y} h3" stroke="${kt}" stroke-width="0.9" stroke-linecap="round"/>` +
      /* oko vysekané do kamene, tlama */
      `<path d="M${x + 5} ${y - 29.4} Q${x + 6.6} ${y - 30.6} ${x + 8} ${y - 29.2}" stroke="#3E3A36" stroke-width="0.8" fill="none" stroke-linecap="round"/>` +
      `<path d="M${x + 13.2} ${y - 26.6} L${x + 8.6} ${y - 25.6}" stroke="${kt}" stroke-width="0.5"/>` +
      `<g fill="#6E7A4E" opacity="0.55"><ellipse cx="${x + 2.6}" cy="${y - 31.4}" rx="1.6" ry="0.7"/><ellipse cx="${x - 7}" cy="${y - 15}" rx="1.2" ry="2"/></g>` +
      `<path d="M${x - 1} ${y - 27} Q${x - 3} ${y - 20} ${x - 7} ${y - 14}" stroke="${ks}" stroke-width="0.8" fill="none" opacity="0.6"/>` +
      /* klíč v tlamě */
      `<path d="M${x + 8.6} ${y - 25.9} L${x + 19.6} ${y - 25.9}" stroke="#C9A24A" stroke-width="1.1"/>` +
      `<circle cx="${x + 21.6}" cy="${y - 25.9}" r="1.8" fill="none" stroke="#C9A24A" stroke-width="0.9"/>` +
      `<path d="M${x + 10} ${y - 25.9} v2.2 M${x + 11.6} ${y - 25.9} v1.6" stroke="#C9A24A" stroke-width="0.8"/>` +
      /* bryndáček */
      `<path d="M${x - 2.6} ${y - 23.4} Q${x + 1.6} ${y - 20.6} ${x + 5.8} ${y - 23.4} L${x + 6.4} ${y - 17} Q${x + 3.6} ${y - 12} ${x + 0.4} ${y - 15} Z" fill="#C4432B" stroke="#7E2F18" stroke-width="0.5" stroke-linejoin="round"/>` +
      `<path d="M${x - 1.8} ${y - 21.6} Q${x + 1.8} ${y - 19} ${x + 5.6} ${y - 21.6}" stroke="#E86A4A" stroke-width="0.5" fill="none"/>`
    );
  };
  const vrstvaStojan = () => {
    const { x0, x1, strecha, horni, dolni, noha } = STOJAN;
    return (
      `<rect x="${x0 + 1}" y="${strecha + 2}" width="3" height="${noha - strecha - 2}" fill="#4A3426"/><rect x="${x1 - 4}" y="${strecha + 2}" width="3" height="${noha - strecha - 2}" fill="#4A3426"/>` +
      `<path d="M${x0 + 2.6} ${strecha + 2} V${noha}" stroke="#7A5A3E" stroke-width="0.8"/><path d="M${x1 - 2.4} ${strecha + 2} V${noha}" stroke="#7A5A3E" stroke-width="0.8"/>` +
      `<path d="M${x0 - 4} ${strecha + 3} L${(x0 + x1) / 2} ${strecha - 7} L${x1 + 4} ${strecha + 3} L${x1 + 2} ${strecha + 5} L${(x0 + x1) / 2} ${strecha - 4} L${x0 - 2} ${strecha + 5} Z" fill="#5E7E6A" stroke="#2E3E36" stroke-width="0.6" stroke-linejoin="round"/>` +
      `<path d="M${x0 - 2} ${strecha + 5} L${(x0 + x1) / 2} ${strecha - 4} L${x1 + 2} ${strecha + 5}" stroke="#8EB09A" stroke-width="0.6" fill="none"/>` +
      [horni, dolni].map((y) => `<rect x="${x0}" y="${y - 2.2}" width="${x1 - x0}" height="3" fill="#6A4A34" stroke="#3A2A1E" stroke-width="0.5"/>`).join("") +
      `<g fill="#C9A24A">${SLOTY.map((sl) => `<circle cx="${sl.x}" cy="${sl.y - 0.6}" r="0.7"/>`).join("")}</g>`
    );
  };
  /* Velká brána vpředu: rám celé scény, na sloupech nápis o daru */
  const vrstvaBrana = () => {
    const pw = 10, xL = 20.5, xR = 159.5, top = 9, zem = 176;
    let s = "";
    s += `<path d="M6 176 Q90 172 174 176 L172 180 L8 180 Z" fill="#8A847E" opacity="0.9"/>`;
    for (const x of [xL, xR]) {
      s += `<path d="M${x - pw / 2} ${zem} L${x - pw * 0.45} 22 L${x + pw * 0.45} 22 L${x + pw / 2} ${zem} Z" fill="url(#ce3-sloup)"/>`;
      s += `<rect x="${x - pw * 0.58}" y="${zem - 13}" width="${pw * 1.16}" height="13" fill="#1E1A1C"/><path d="M${x - pw * 0.58} ${zem - 13} H${x + pw * 0.58}" stroke="#4A4448" stroke-width="0.6"/>`;
      s += `<g font-family="'Yuji Syuku', serif" font-size="6.4" fill="#1E1A1C" text-anchor="middle" opacity="0.85"><text x="${x}" y="68">奉</text><text x="${x}" y="76">納</text></g>`;
      s += `<g stroke="#1E1A1C" stroke-width="0.9" stroke-linecap="round" opacity="0.7">${[88, 94, 100, 106, 114, 120].map((y, i) => `<path d="M${x - 1.6 + (i % 2) * 0.6} ${y} L${x + 1.4} ${y + 1.6}"/>`).join("")}</g>`;
    }
    s += `<rect x="6" y="31" width="168" height="6" fill="#D2452B"/><rect x="6" y="35" width="168" height="2" fill="#9E2A18" opacity="0.7"/>`;
    s += `<rect x="86" y="17" width="8" height="15" fill="#D2452B"/>`;
    s += `<rect x="80.5" y="17.6" width="19" height="13.6" rx="0.8" fill="#1E1A1C" stroke="#C9A24A" stroke-width="0.6"/>`;
    s += `<text x="90" y="27.6" font-family="'Yuji Syuku', serif" font-size="7.6" fill="#E9C46E" text-anchor="middle">稲荷</text>`;
    s += `<path d="M-2 4 Q90 13 182 4 L180 12.6 Q90 19.6 0 12.6 Z" fill="#1E1A1C"/><path d="M-1 5 Q90 13.4 181 5" stroke="#4A4448" stroke-width="0.6" fill="none"/>`;
    s += `<path d="M2 12.6 Q90 19.6 178 12.6 L176 17.6 Q90 23.6 4 17.6 Z" fill="#D2452B"/>`;
    return s;
  };

  /* ——— Živé kusy ——— */
  const vrstvaSvetla = (st) => {
    let s = "";
    const kon = BRANY[0];
    s += `<ellipse cx="${f(kon.cx)}" cy="${f(kon.zem - kon.h * 0.4)}" rx="${f(10 + Math.sin(st.t * 0.7) * 0.6)}" ry="7" fill="url(#ce3-zare)" opacity="0.8"/>`;
    for (const b of BRANY.filter((q) => q.i % 3 === 1)) {
      for (const sx of [-1, 1]) {
        const x = b.cx + sx * b.w * 0.44, y = b.zem - b.h * 0.02 - b.s * 6;
        const mihot = 0.75 + 0.25 * Math.sin(st.t * (5 + b.i) + sx * 2);
        s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(3 + b.s * 10)}" fill="url(#ce3-zare)" opacity="${f(0.55 * mihot)}"/>`;
      }
    }
    return `<g clip-path="url(#ce3-otvor)">${s}</g>`;
  };
  const vrstvaOhnicky = (st) =>
    `<g clip-path="url(#ce3-otvor)">` +
    st.ohnicky
      .map((o) => {
        const u = o.vek / o.zivot;
        const op = clamp(Math.min(u / 0.15, (1 - u) / 0.3)) * (0.75 + 0.25 * Math.sin(st.t * 9 + o.fz));
        const r = o.r * (1 + 0.15 * Math.sin(st.t * 7 + o.fz));
        return `<g transform="translate(${f(o.x)} ${f(o.y)})" opacity="${f(op)}"><circle r="${f(r * 3)}" fill="url(#ce3-kicune)"/><path d="M0 ${f(-r * 2)} Q${f(r)} ${f(-r * 0.4)} ${f(r * 0.7)} ${f(r * 0.3)} Q0 ${f(r * 1.2)} ${f(-r * 0.7)} ${f(r * 0.3)} Q${f(-r)} ${f(-r * 0.4)} 0 ${f(-r * 2)} Z" fill="#DFF6FF"/></g>`;
      })
      .join("") +
    `</g>`;
  const vrstvaOci = (st) => {
    if (st.ociLisky < 0.02) return "";
    const { x, y } = LISKA;
    return `<g opacity="${f(st.ociLisky)}"><circle cx="${x + 6.5}" cy="${y - 29.6}" r="3.2" fill="url(#ce3-kicune)"/><path d="M${x + 5} ${y - 29.4} Q${x + 6.6} ${y - 30.6} ${x + 8} ${y - 29.2}" stroke="#E8FBFF" stroke-width="0.9" fill="none" stroke-linecap="round"/></g>`;
  };
  const vrstvaHavran = (st) => {
    if (!st.havran) return "";
    const [x, y, kr] = st.havran;
    const k = Math.sin(kr) * 2.4;
    return `<g clip-path="url(#ce3-otvor)"><path d="M${f(x - 4)} ${f(y - k)} Q${f(x - 1.6)} ${f(y - 1.4)} ${f(x)} ${f(y)} Q${f(x + 1.6)} ${f(y - 1.4)} ${f(x + 4)} ${f(y - k)}" stroke="#1E1A24" stroke-width="1" fill="none" stroke-linecap="round"/></g>`;
  };
  /** Lišácká maska, kterou si Cedulka nasadí: bílá, s rudými linkami a dírami pro oči. */
  const maska = () => {
    const obrys = "M68 76 L64 58 L77 70 Q90 66 103 70 L116 58 L112 76 Q116 92 106 104 Q98 112 90 113 Q82 112 74 104 Q64 92 68 76 Z";
    const diry = "M74.4 88.6 Q79 84 84.6 87.4 Q80 91.4 74.4 88.6 Z M105.6 88.6 Q101 84 95.4 87.4 Q100 91.4 105.6 88.6 Z";
    return (
      `<path d="${obrys} ${diry}" fill="#FBF7EE" fill-rule="evenodd" stroke="#8A7A69" stroke-width="1"/>` +
      `<path d="M66.6 61 L76 69.4 L70 74 Z M113.4 61 L104 69.4 L110 74 Z" fill="#C4432B" opacity="0.85"/>` +
      `<path d="M72.4 90 Q78 93.6 86 88.4 M107.6 90 Q102 93.6 94 88.4" stroke="#C4432B" stroke-width="1.6" fill="none" stroke-linecap="round"/>` +
      `<path d="M90 72 Q86.4 76 90 81 Q93.6 76 90 72 Z" fill="#C4432B"/>` +
      `<path d="M74 84 Q77 80.4 82 81.6 M106 84 Q103 80.4 98 81.6" stroke="#1E1A1C" stroke-width="1.2" fill="none" stroke-linecap="round"/>` +
      `<ellipse cx="90" cy="103.4" rx="2.2" ry="1.6" fill="#1E1A1C"/><path d="M84 107.4 Q90 110.4 96 107.4" stroke="#1E1A1C" stroke-width="1" fill="none" stroke-linecap="round"/>` +
      `<path d="M66 74 Q56 70 52 76 M114 74 Q124 70 128 76" stroke="#C4432B" stroke-width="1" fill="none"/>`
    );
  };
  const vrstvaEmy = (st) => {
    let s = "";
    st.emy.forEach((e, i) => {
      const sl = EMY[i];
      const a = (e.kyv * 180) / Math.PI;
      const ob = e.styl ? oblicej(e.styl, e.k) : { s: "", hrot: null };
      const stary = e.stary && e.smaz < 1 ? `<g opacity="${f(1 - e.smaz)}">${oblicej(e.stary, 1).s}</g>` : "";
      s += `<g transform="translate(${sl.x} ${sl.y}) rotate(${f(a)})">` +
        `<path d="M0 0 L0 5" stroke="#C4432B" stroke-width="0.7"/><path d="M0 0 L0 5" stroke="#FBF7EE" stroke-width="0.7" stroke-dasharray="0.8 0.8"/>` +
        `<g transform="translate(0 0.6) scale(${LS})">${lisEma(stary + ob.s)}</g></g>`;
      if (ob.hrot && e.k < 1) {
        const ar = rad(a);
        const hx = ob.hrot[0] * LS, hy = ob.hrot[1] * LS + 0.6;
        const P = [sl.x + hx * Math.cos(ar) - hy * Math.sin(ar), sl.y + hx * Math.sin(ar) + hy * Math.cos(ar)];
        s += `<g data-fixa="1">${fixa(P, -52 + Math.sin(st.t * 30) * 3)}</g>`;
      }
    });
    /* Cedulka mezi liškami */
    const lic = () =>
      cedDeska("ce3", { cara: 2.4 }) +
      `<g clip-path="url(#ce3-orez)">${cedRadky({ sila: 0.9 })}</g>` +
      cedTvar("ce3", { dx: st.pohled[0], dy: st.pohled[1], mrk: st.mrk, oci: st.oci, usta: st.usta, tvare: 0.5 }) +
      (st.maska > 0.001 ? `<g transform="translate(0 ${f(-(1 - st.maska) * 70)})" opacity="${f(clamp(st.maska * 3))}">${maska()}</g>` : "");
    const a = (st.kyv * 180) / Math.PI;
    s += `<g transform="rotate(${f(a)} ${CED_SLOT.x} ${CED_SLOT.y})">` +
      snurka(`M${CED_SLOT.x} ${CED_SLOT.y} L${DIRA[0]} ${DIRA[1] - 0.6}`, { sirka: 0.9 }) +
      `<g transform="${CEDT}">${otocena(0, lic, lic)}</g></g>`;
    return s;
  };

  const defs = () =>
    cedDefs("ce3", { ...DREVO, svetle: "#F6E2BE", tmave: "#DDBF8E" }) +
    `<clipPath id="ce3-otvor"><rect x="${OTVOR.x0}" y="${OTVOR.y0}" width="${OTVOR.x1 - OTVOR.x0}" height="${OTVOR.y1 - OTVOR.y0}"/></clipPath>` +
    `<linearGradient id="ce3-drevo-lis" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F8EBD2"/><stop offset="1" stop-color="#E4CBA0"/></linearGradient>` +
    `<linearGradient id="ce3-nebe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2E2D5E"/><stop offset="0.3" stop-color="#5E4E86"/><stop offset="0.5" stop-color="#C0708A"/><stop offset="0.62" stop-color="#E9945E"/><stop offset="1" stop-color="#E9945E"/></linearGradient>` +
    `<radialGradient id="ce3-mesic"><stop offset="0" stop-color="#FFF6E0" stop-opacity="0.45"/><stop offset="1" stop-color="#FFF6E0" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="ce3-konec"><stop offset="0" stop-color="#FFE2A0"/><stop offset="0.35" stop-color="#F6A55E" stop-opacity="0.8"/><stop offset="1" stop-color="#C4432B" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="ce3-zare"><stop offset="0" stop-color="#FFE4A8" stop-opacity="0.9"/><stop offset="0.4" stop-color="#F6A55E" stop-opacity="0.35"/><stop offset="1" stop-color="#F6A55E" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="ce3-kicune"><stop offset="0" stop-color="#E8FBFF" stop-opacity="0.95"/><stop offset="0.35" stop-color="#8FD8F0" stop-opacity="0.45"/><stop offset="1" stop-color="#5AB8E0" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="ce3-sloup" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#E4643C"/><stop offset="0.45" stop-color="#D2452B"/><stop offset="1" stop-color="#9E2A18"/></linearGradient>`;

  /* ——— Simulace ——— */
  const novaDynamika = () => {
    const R = rng(808);
    return {
      emy: EMY.map((_, i) => ({ kyv: { a: 0, v: 0 }, styl: [0, 2, 4, 6].includes(i) ? STYLY[(i * 3) % STYLY.length] : null, k: 1, kresli: null, stary: null, smaz: 1, fz: R() * 6 })),
      dalsiStyl: 5,
      kyv: { a: 0, v: 0 },
      maska: { a: 0, v: 0 },
      maskaCil: 0,
      ohnicky: [],
      dalsiSamo: 2.2,
      oci: 0,
      havran: null,
      havranDalsi: 4,
      cikady: 3,
      nahoda: R,
      zvuk: [],
      pohled: [0, 0],
      divaSe: null,
      vitr: 0,
      radost: -10,
    };
  };
  const zacniKreslit = (dyn, i, t) => {
    const e = dyn.emy[i];
    e.stary = e.styl && e.k >= 1 ? e.styl : null;
    e.smaz = e.stary ? 0 : 1;
    e.styl = STYLY[dyn.dalsiStyl++ % STYLY.length];
    e.k = 0;
    e.kresli = t;
    dyn.divaSe = { i, t };
    dyn.zvuk.push({ druh: "fixa", sila: 0.7, pan: (EMY[i].x - 90) / 90 });
  };
  const naEmu = (m) => {
    for (let i = 0; i < EMY.length; i++) {
      const sl = EMY[i];
      if (Math.abs(m.x - sl.x) < 7.2 && m.y > sl.y - 1 && m.y < sl.y + 20) return i;
    }
    return -1;
  };
  const naCedulku = (m) => Math.abs(m.x - DIRA[0]) < 10 && m.y > DIRA[1] - 6 && m.y < DIRA[1] + 22;
  const naLisku = (m) => m && m.x > LISKA.x - 20 && m.x < LISKA.x + 20 && m.y > LISKA.y - 40 && m.y < LISKA.y + 40;
  const krok = (dyn, t, dt, vstup) => {
    const R = dyn.nahoda;
    if (vstup.kliky && vstup.kliky.length) {
      for (const c of vstup.kliky) {
        const i = naEmu(c);
        if (i >= 0) zacniKreslit(dyn, i, t);
        else if (naCedulku(c)) {
          dyn.maskaCil = dyn.maskaCil > 0.5 ? 0 : 1;
          dyn.zvuk.push({ druh: dyn.maskaCil ? "maska" : "sundat", sila: 0.9, pan: 0.5 });
          dyn.radost = t;
        } else if (naLisku(c)) {
          dyn.zvuk.push({ druh: "kon", sila: 0.9, pan: -0.5 });
          for (let k = 0; k < 4; k++) dyn.ohnicky.push(novyOhnicek(R, true));
        } else {
          /* jinam: nakreslí se obličej na náhodnou lišku */
          zacniKreslit(dyn, Math.floor(R() * EMY.length), t);
        }
      }
      vstup.kliky.length = 0;
    }
    /* samo od sebe: někdo přijde a nakreslí obličej */
    if (t > dyn.dalsiSamo && !dyn.emy.some((e) => e.k < 1)) {
      const prazdne = dyn.emy.map((e, i) => (e.styl ? -1 : i)).filter((i) => i >= 0);
      const i = prazdne.length && R() < 0.7 ? prazdne[Math.floor(R() * prazdne.length)] : Math.floor(R() * EMY.length);
      zacniKreslit(dyn, i, t);
      dyn.dalsiSamo = t + 5.5 + R() * 3;
    }
    for (let i = 0; i < dyn.emy.length; i++) {
      const e = dyn.emy[i];
      if (e.k < 1) {
        const pred = e.k;
        e.smaz = Math.min(1, e.smaz + dt * 3);
        if (e.smaz >= 1) e.k = Math.min(1, e.k + dt / 2.2);
        if (Math.floor(pred * 9) !== Math.floor(e.k * 9) && e.k < 1) dyn.zvuk.push({ druh: "skrip", sila: 0.35 + R() * 0.3, pan: (EMY[i].x - 90) / 90 });
      }
      kyvadlo(e.kyv, dt, { tuhost: 16, utlum: 1.8, sila: -dyn.vitr * 3 + Math.sin(t * 1.4 + e.fz) * 0.35 + (e.k < 1 ? Math.sin(t * 24) * 0.8 : 0) });
    }
    /* vítr od myši */
    let cil = 0;
    if (vstup.mys) cil = clamp((vstup.rychlost || 0) / 600) * (vstup.mys.x > 128 ? 1 : -1);
    dyn.vitr += (cil - dyn.vitr) * (1 - Math.exp(-dt / 0.3));
    kyvadlo(dyn.kyv, dt, { tuhost: 14, utlum: 2, sila: -dyn.vitr * 2 + Math.sin(t * 1.1) * 0.25 });
    pruzina(dyn.maska, dyn.maskaCil, dt, { tuhost: 60, utlum: 9 });
    /* oči kamenné lišky a ohníčky kicunebi */
    const lis = naLisku(vstup.mys);
    dyn.oci += ((lis ? 1 : 0) - dyn.oci) * (1 - Math.exp(-dt / (lis ? 0.25 : 0.8)));
    const hustota = 0.18 + dyn.oci * 1.4;
    if (R() < dt * hustota) dyn.ohnicky.push(novyOhnicek(R, false));
    for (const o of dyn.ohnicky) {
      o.vek += dt;
      o.x += (o.vx + Math.sin(o.vek * 1.3 + o.fz) * 3) * dt;
      o.y += (o.vy + Math.cos(o.vek * 1.7 + o.fz) * 2) * dt;
    }
    dyn.ohnicky = dyn.ohnicky.filter((o) => o.vek < o.zivot);
    /* havran a cikády higurashi */
    if (!dyn.havran && t > dyn.havranDalsi) dyn.havran = { od: t, y: 26 + R() * 10, smer: R() < 0.5 ? 1 : -1 };
    if (dyn.havran && t - dyn.havran.od > 4) {
      dyn.havran = null;
      dyn.havranDalsi = t + 10 + R() * 10;
    }
    if (t > dyn.cikady) {
      dyn.zvuk.push({ druh: "cikady", sila: 0.6, pan: R() < 0.5 ? -0.6 : 0.6 });
      dyn.cikady = t + 9 + R() * 6;
    }
    /* pohled: na kreslení, na lišku, jinak na myš */
    let kam = null;
    if (dyn.divaSe && t - dyn.divaSe.t < 2.4) kam = [EMY[dyn.divaSe.i].x, EMY[dyn.divaSe.i].y + 10];
    else if (vstup.mys) kam = [vstup.mys.x, vstup.mys.y];
    const cp = kam ? [clamp((kam[0] - TVAR_STRED[0]) / 14, -1, 1) * 2, clamp((kam[1] - TVAR_STRED[1]) / 14, -1, 1) * 1.6] : [0, 0];
    dyn.pohled = dyn.pohled.map((q, i) => q + (cp[i] - q) * (1 - Math.exp(-dt / 0.12)));
  };
  const novyOhnicek = (R, kLisce) => {
    if (kLisce) return { x: LISKA.x + 6 + (R() - 0.5) * 10, y: LISKA.y - 34 + (R() - 0.5) * 8, vx: 4 + R() * 6, vy: -2 - R() * 4, vek: 0, zivot: 3 + R() * 2, r: 1 + R() * 0.6, fz: R() * 6 };
    const b = BRANY[Math.floor(4 + R() * 8)];
    return { x: b.cx + (R() - 0.5) * b.w * 0.6, y: b.zem - b.h * (0.25 + R() * 0.4), vx: (R() - 0.5) * 3, vy: -0.5 - R(), vek: 0, zivot: 4 + R() * 3, r: 0.5 + b.s * 1.2, fz: R() * 6 };
  };
  const stav = (t, vstup = {}, dyn) => {
    const d = dyn || novaDynamika();
    let oci = "kulate", usta = "usmev";
    const m = clamp(d.maska.a);
    if (t - d.radost < 1.2) [oci, usta] = d.maskaCil ? ["smich", "smich"] : ["siroke", "o"];
    else if (m > 0.5) usta = "kocici";
    let havran = null;
    if (d.havran) {
      const q = (t - d.havran.od) / 4;
      havran = [d.havran.smer > 0 ? lerp(20, 160, q) : lerp(160, 20, q), d.havran.y + Math.sin(q * 7) * 2, t * 14];
    }
    return {
      t,
      emy: d.emy.map((e) => ({ kyv: e.kyv.a, styl: e.styl, k: e.k, stary: e.stary, smaz: e.smaz })),
      kyv: d.kyv.a,
      maska: m,
      ohnicky: d.ohnicky,
      ociLisky: d.oci,
      havran,
      pohled: d.pohled,
      mrk: mrkani(t, [2.1, 5.7, 5.95, 8.9], 10.5),
      oci,
      usta,
    };
  };
  const snimek = (st) => Math.floor(st.t * 30);

  return {
    id: "v3",
    viewBox: "0 0 180 180",
    defs,
    novaDynamika,
    krok,
    stav,
    hukot: () => 0,
    klidne: { t: 5.4 },
    vrstvy: [
      { id: "nebe", kresli: vrstvaNebe, tezka: true },
      { id: "havran", kresli: vrstvaHavran, klic: (st) => (st.havran ? snimek(st) : 0) },
      { id: "svetla", kresli: vrstvaSvetla, klic: (st) => Math.floor(st.t * 12), styl: "mix-blend-mode:screen" },
      { id: "ohnicky", kresli: vrstvaOhnicky, klic: snimek, styl: "mix-blend-mode:screen" },
      { id: "liska", kresli: vrstvaLiska },
      { id: "oci", kresli: vrstvaOci, klic: (st) => f(st.ociLisky), styl: "mix-blend-mode:screen" },
      { id: "stojan", kresli: vrstvaStojan },
      { id: "emy", kresli: vrstvaEmy, klic: snimek },
      { id: "brana", kresli: vrstvaBrana, tezka: true },
    ],
  };
})();

/**
 * Celá kresba jako jedno SVG — pro náhled v Node, nebo jako statický první
 * snímek, který komponenta vloží do stránky (s třídou místo rozměrů).
 */
const celeSvg = (V, t, dyn, vstup = {}, { sirka = 900, pozadi = "#F4EBDD", trida = null } = {}) => {
  const st = V.stav(t, vstup, dyn);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${V.viewBox}" ${trida ? `class="${trida}" aria-hidden="true" focusable="false"` : `width="${sirka}" height="${sirka}"`}>` +
    `<defs>${V.defs()}</defs>` +
    (pozadi ? `<rect x="-50" y="-50" width="400" height="400" fill="${pozadi}"/>` : "") +
    V.vrstvy
      .map((v) => {
        const obsah = v.kresli(st);
        const op = v.pruhlednost ? ` opacity="${v.pruhlednost(st)}"` : "";
        const p = v.pohyb ? v.pohyb(st) : null;
        const tr = p ? ` transform="rotate(${f(p.uhel)} ${p.cx} ${p.cy})"` : "";
        return `<g style="${v.styl || ""}"${op}${tr}>${obsah}</g>`;
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

export const kresby = { v1: V1, v2: V2, v3: V3 };
export { celeSvg, pretoc };
