/*
 * Bublinka jako strašidlo — společné kusy kreseb (./kami-ohen.js
 * a ./lem-hrbitov.js): pomocníci, tělo Bublinky, černý slaměný klobouk,
 * svěšené ručky, bludičky a tušový lem.
 *
 * Bublinka je yōkai, ne kami. Kde má Pecinka přes rameno slaměný provaz
 * shimenawa, nosí Bublinka široký černý klobouk kasa, pletený a po obvodu
 * roztřepený, jaký nosí poutníci a tuláci, co nechtějí být poznáni. Stín
 * z krempy jí padá přes čelo. Lítá jako bublina, bez nohou i bez ocásku.
 * Tvář jí zůstává: přivřená očka a zvlněný úsměv.
 *
 * Čelenka duchů a ocásek (bubCelenka, bubOcas, ocasDefs) patří k odloženému
 * návrhu 3 (./kami-stin.js, ./lem-svicky.js) a jinde se nepoužívají.
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
export const krokem = (a, b, x) => smooth((x - a) / (b - a));
export const rad = (d) => (d * Math.PI) / 180;
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

/**
 * Jeden jazyk plamene (z Pecinky s ohněm). Vyrazí ze základny B ve směru
 * th0, cestou se stáčí vzhůru a na konci se zahne do háčku jako plameny
 * na japonských malbách. Vítr ho ohýbá tím víc, čím dál od základny.
 * Vrací obrys i střední čáru.
 */
export const jazyk = ({ B, th0, L, W, c = 1, stoupani = 0.8, stoc = 2.1, vitr = 0, vlna = 0.24, t = 0, w = 3, fz = 0, N = 22, zuzeni = 0.55 }) => {
  let dUp = -Math.PI / 2 - th0;
  while (dUp > Math.PI) dUp -= Math.PI * 2;
  while (dUp < -Math.PI) dUp += Math.PI * 2;
  const body = [];
  let x = B[0], y = B[1];
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    body.push([x, y]);
    const th =
      th0 +
      dUp * stoupani * smooth(s * 1.15) +
      c * stoc * Math.pow(krokem(0.5, 1, s), 1.5) +
      vitr * Math.pow(s, 1.25) +
      vlna * s * Math.sin(t * w + fz - s * 3.4);
    x += (Math.cos(th) * L) / N;
    y += (Math.sin(th) * L) / N;
  }
  const d = pasPoBodech(body, (s) => W * (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, s * 0.95))) * Math.pow(1 - s, zuzeni));
  return { d, body };
};

/* ═══════════════════════════════════════════════════════════════════
 * Tenká vrstva: barvy mýdlové bubliny (z Bublinky jako yōkai). Odrazivost
 * blány vody pro vlnové délky 380–780 nm přes křivky citlivosti oka do
 * sRGB — vyjde Newtonova řada: černá, stříbrná, žlutá, purpurová, modrá.
 * ═══════════════════════════════════════════════════════════════════ */
const FILM = (() => {
  const g = (l, m, s1, s2) => {
    const u = (l - m) / (l < m ? s1 : s2);
    return Math.exp(-0.5 * u * u);
  };
  const cmf = (l) => [
    1.056 * g(l, 599.8, 37.9, 31.0) + 0.362 * g(l, 442.0, 16.0, 26.7) - 0.065 * g(l, 501.1, 20.4, 26.2),
    0.821 * g(l, 568.8, 46.9, 40.5) + 0.286 * g(l, 530.9, 16.3, 31.1),
    1.217 * g(l, 437.0, 11.8, 36.0) + 0.681 * g(l, 459.0, 26.0, 13.8),
  ];
  const vlny = [];
  for (let l = 380; l <= 780; l += 10) vlny.push([l, cmf(l)]);
  const ySum = vlny.reduce((a, [, c]) => a + c[1], 0);
  const n = 1.33, r2 = ((n - 1) / (n + 1)) ** 2;
  const gama = (v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
  const tab = [];
  for (let d = 0; d <= 1600; d += 5) {
    let X = 0, Y = 0, Z = 0;
    for (const [l, c] of vlny) {
      const cs = Math.cos((4 * Math.PI * n * d) / l);
      const R = (2 * r2 * (1 - cs)) / (1 + r2 * r2 - 2 * r2 * cs);
      X += R * c[0];
      Y += R * c[1];
      Z += R * c[2];
    }
    const k = 1 / (ySum * 0.077);
    X *= k;
    Y *= k;
    Z *= k;
    tab.push(
      [3.2406 * X - 1.5372 * Y - 0.4986 * Z, -0.9689 * X + 1.8758 * Y + 0.0415 * Z, 0.0557 * X - 0.204 * Y + 1.057 * Z].map((v) => gama(clamp(v)) * 255),
    );
  }
  return tab;
})();
const film = (d) => {
  const x = clamp(d, 0, 1599.9) / 5;
  const i = Math.floor(x), k = x - i;
  const A = FILM[i], B = FILM[Math.min(FILM.length - 1, i + 1)];
  return rgbHex([0, 1, 2].map((j) => A[j] + (B[j] - A[j]) * k));
};

/* ═══════════════════════════════════════════════════════════════════
 * Bublinka: původní kresba (characters/kami/Bublinka.astro) — koule
 * z napůl průhledného vzduchu. Všechno v jejích souřadnicích: střed
 * 90 96, poloměr 46.
 * ═══════════════════════════════════════════════════════════════════ */
export const BUB = { c: [90, 96], r: 46 };

/** Přechody těla: světlo zleva shora, střed průhlednější než okraj. Barvy jdou přeladit do noci. */
export const bubDefs = (id, { pruhledna = 0.5, stred = "#FBF6EE", pas = "#F2E8D8", okraj = "#E2D3BC", lem = "#D2C1A6", tvare = "#D98A62", zrno = 0.45 } = {}) =>
  `<radialGradient id="${id}-telo" cx="0.38" cy="0.32" r="0.75">` +
  `<stop offset="0" stop-color="${stred}" stop-opacity="${f(pruhledna)}"/>` +
  `<stop offset="0.62" stop-color="${pas}" stop-opacity="${f(lerp(pruhledna, 0.9, 0.5))}"/>` +
  `<stop offset="0.9" stop-color="${okraj}" stop-opacity="0.9"/>` +
  `<stop offset="1" stop-color="${lem}" stop-opacity="0.96"/></radialGradient>` +
  `<radialGradient id="${id}-tvare" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${tvare}" stop-opacity="0.62"/><stop offset="1" stop-color="${tvare}" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="${id}-film-maska-g" cx="0.5" cy="0.5" r="0.5"><stop offset="0.3" stop-color="#FFFFFF" stop-opacity="0.12"/><stop offset="0.78" stop-color="#FFFFFF" stop-opacity="0.6"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="1"/></radialGradient>` +
  `<mask id="${id}-film-maska" maskContentUnits="userSpaceOnUse"><circle cx="90" cy="96" r="46" fill="url(#${id}-film-maska-g)"/></mask>` +
  `<clipPath id="${id}-bublina"><circle cx="90" cy="96" r="45.4"/></clipPath>` +
  `<filter id="${id}-tah" x="-8%" y="-8%" width="116%" height="116%" color-interpolation-filters="sRGB">` +
  `<feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="4" result="vlna"/>` +
  `<feDisplacementMap in="SourceGraphic" in2="vlna" scale="2.4" xChannelSelector="R" yChannelSelector="G" result="tah"/>` +
  `<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="11" result="zrno"/>` +
  `<feColorMatrix in="zrno" type="matrix" values="0 0 0 0 0.23  0 0 0 0 0.18  0 0 0 0 0.16  ${zrno} 0 0 0 -0.2" result="skvrny"/>` +
  `<feComposite in="skvrny" in2="tah" operator="in" result="zrnoVTvaru"/>` +
  `<feMerge><feMergeNode in="tah"/><feMergeNode in="zrnoVTvaru"/></feMerge></filter>`;

/** Tělo: koule, obrys perem. Kreslí se jednou, hýbe s ním běh. */
export const bubTelo = (id, { obrys = "#6B5D4F", sirkaObrysu = 1.6 } = {}) =>
  `<g filter="url(#${id}-tah)"><circle cx="90" cy="96" r="46" fill="url(#${id}-telo)" stroke="${obrys}" stroke-width="${sirkaObrysu}"/></g>`;

/** Lesk navrch: měkký odlesk okna vlevo nahoře, ostrá tečka a světlo po okraji vpravo dole. */
export const bubLesk = ({ okraj = "#FFFFFF", sila = 1, barva = "#FFFFFF" } = {}) =>
  `<ellipse cx="71" cy="76" rx="13" ry="8" fill="${barva}" opacity="${f(0.82 * sila)}" transform="rotate(-35 71 76)"/>` +
  `<ellipse cx="66.6" cy="72.6" rx="4.6" ry="2.6" fill="${barva}" transform="rotate(-35 66.6 72.6)" opacity="${f(sila)}"/>` +
  `<circle cx="84" cy="66" r="1.8" fill="${barva}" opacity="${f(0.7 * sila)}"/>` +
  `<path d="M126 112 A40 40 0 0 1 98 136" stroke="${okraj}" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="${f(0.72 * sila)}"/>`;

/**
 * Duhová blána na těle. Pruhy stejné tloušťky jdou shora dolů (voda stéká,
 * nahoře je blána nejtenčí) a víry je kroutí. Kreslí se odspodu, tenčí
 * přes tlustší.
 */
export const filmPruhy = (st, { pruhu = 15, od = 46, krokNm = 34, viry = [], vlna = 0 } = {}) => {
  const [cx, cy] = BUB.c, r = BUB.r + 2;
  const otoc = (p) => {
    let [x, y] = p;
    for (const v of viry) {
      const dx = x - v.x, dy = y - v.y;
      const d2 = dx * dx + dy * dy;
      const a = v.s * Math.exp(-d2 / (v.r * v.r));
      if (Math.abs(a) < 0.002) continue;
      const c = Math.cos(a), s = Math.sin(a);
      x = v.x + dx * c - dy * s;
      y = v.y + dx * s + dy * c;
    }
    return [x, y + vlna * Math.sin(x * 0.09 + st.t * 0.8) * Math.exp(-(((y - cy) / r) ** 2))];
  };
  const barvy = [];
  for (let j = 0; j <= pruhu; j++) barvy.push(film(od + j * krokNm));
  let s = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${barvy[pruhu]}"/>`;
  for (let k = pruhu - 1; k >= 0; k--) {
    const y0 = cy - r + ((k + 1) / (pruhu + 1)) * 2 * r;
    const B = [];
    for (let i = 0; i <= 26; i++) B.push(otoc([cx - r - 6 + (i / 26) * (2 * r + 12), y0]));
    B.push(otoc([cx + r + 6, cy - r - 8]), otoc([cx - r - 6, cy - r - 8]));
    s += `<path d="${cara(B)} Z" fill="${barvy[k]}"/>`;
  }
  return s;
};
/** Blána, která se sama pomalu převaluje — víry z času, nic dalšího nepotřebuje. */
export const filmSamo = (t, { od = 300, rozkmit = 140 } = {}) => ({
  od: od + rozkmit * Math.sin(t * 0.11) + 60 * Math.sin(t * 0.23),
  krokNm: 32,
  vlna: 2.2,
  viry: [
    { x: 90 + 20 * Math.sin(t * 0.31), y: 82 + 14 * Math.sin(t * 0.43 + 1), r: 22, s: 1.9 * Math.sin(t * 0.37) },
    { x: 74 + 16 * Math.sin(t * 0.27 + 2), y: 108 + 12 * Math.sin(t * 0.33), r: 18, s: -1.6 * Math.sin(t * 0.29 + 1) },
    { x: 108 + 12 * Math.sin(t * 0.41 + 4), y: 104 + 16 * Math.sin(t * 0.25 + 3), r: 20, s: 1.4 * Math.sin(t * 0.35 + 2.4) },
  ],
});

/**
 * Tvářička v souřadnicích původní kresby. dx/dy posouvá pohled, mrk 0…1
 * zavírá oči. svit 0…1 rozsvítí oči studeným světlem (ve tmě).
 * vyraz: smug | fuk | smich | uzas | psst | nevinna | hvizd | leknuti
 */
export const bubTvar = (id, { dx = 0, dy = 0, mrk = 0, vyraz = "smug", tvare = 0.45, oko = "#3A2E28", jazyk: jz = "#E58A86", svit = 0, lesk = "#FFF8F2" } = {}) => {
  let s = "";
  const ox = clamp(dx, -2.4, 2.4), oy = clamp(dy, -1.8, 1.8);
  const tv = vyraz === "fuk" ? 1.5 : vyraz === "smich" ? 1.2 : 1;
  for (const x of [69, 111]) s += `<ellipse cx="${x}" cy="108" rx="${f(8 * tv)}" ry="${f(5.4 * tv)}" fill="url(#${id}-tvare)" opacity="${f(clamp(tvare * 1.5))}"/>`;
  const S = `stroke="${oko}" stroke-linecap="round" stroke-linejoin="round" fill="none"`;
  /* oči ve tmě: bledě zelenomodrá duhovka pod víčkem */
  const zar = svit > 0.02 ? mix(oko, "#BFF6E6", svit) : oko;
  if (vyraz === "fuk") {
    s += `<path d="M72.6 88.6 L81.4 92.6 L72.6 96.6 M107.4 88.6 L98.6 92.6 L107.4 96.6" ${S} stroke-width="2.2"/>`;
    s += `<path d="M70 84.6 L83 87.4 M97 87.4 L110 84.6" ${S} stroke-width="1.5"/>`;
    s += `<ellipse cx="90" cy="110.6" rx="3.1" ry="3.7" fill="${oko}"/><ellipse cx="90" cy="111.8" rx="1.6" ry="1.3" fill="#C4432B" opacity="0.8"/>`;
  } else if (vyraz === "smich") {
    s += `<path d="M72 94.6 Q78 87.4 84 94.6 M96 94.6 Q102 87.4 108 94.6" ${S} stroke-width="2.3"/>`;
    s += `<path d="M71 85.4 Q77.4 82.4 83.4 84.4 M96.6 84.4 Q102.6 82.4 109 85.4" ${S} stroke-width="1.4"/>`;
    s += `<path d="M78.6 106 Q90 102.6 101.4 106 Q100 117.6 90 118.4 Q80 117.6 78.6 106 Z" fill="${oko}"/>`;
    s += `<path d="M84 114.6 Q90 110.8 96 114.6 Q93 117.8 90 117.9 Q87 117.8 84 114.6 Z" fill="${jz}"/>`;
  } else if (vyraz === "uzas" || vyraz === "leknuti") {
    const r = vyraz === "leknuti" ? 4.4 : 3.9;
    for (const x of [78, 102]) s += `<circle cx="${f(x + ox * 0.6)}" cy="${f(93 + oy * 0.5)}" r="${r}" fill="${zar}"/><circle cx="${f(x + ox * 0.6 - 1.2)}" cy="${f(91.6 + oy * 0.5)}" r="1.3" fill="${lesk}"/>`;
    s += `<path d="M71 83.6 Q77 80.4 83 82.6 M97 82.6 Q103 80.4 109 83.6" ${S} stroke-width="1.4"/>`;
    s += vyraz === "leknuti"
      ? `<path d="M83.6 109.6 Q86.8 106.8 90 109.6 Q93.2 112.4 96.4 109.6" ${S} stroke-width="1.9"/>`
      : `<ellipse cx="90" cy="111" rx="2.7" ry="3.4" fill="${oko}"/>`;
  } else if (vyraz === "psst") {
    const ry = 5 * Math.max(0.06, 1 - mrk);
    for (const x of [73, 97]) s += `<path d="M${f(x + 1.4)} 92 h10 a5 ${f(ry)} 0 0 1 -10 0 Z" fill="${zar}"/>`;
    s += `<path d="M71 88.4 L84 90.6 M96 90.6 L109 88.4" ${S} stroke-width="1.4"/>`;
    s += `<path d="M86.4 110.4 Q90 107.6 93.6 110.4 Q90 113.2 86.4 110.4 Z" fill="${oko}"/>`;
  } else if (vyraz === "nevinna" || vyraz === "hvizd") {
    /* svatoušek: kulatá očka se dvěma odlesky, obočí vysoko; hvízdá si a kouká jinam */
    const ry = 4.6 * Math.max(0.08, 1 - mrk * 0.94);
    for (const x of [78, 102]) {
      s += `<ellipse cx="${f(x + ox)}" cy="${f(93 + oy)}" rx="3.9" ry="${f(ry)}" fill="${zar}"/>`;
      if (mrk < 0.5) s += `<circle cx="${f(x + ox - 1.3)}" cy="${f(91.2 + oy)}" r="1.45" fill="${lesk}"/><circle cx="${f(x + ox + 1.3)}" cy="${f(94.8 + oy)}" r="0.7" fill="${lesk}" opacity="0.85"/>`;
    }
    s += `<path d="M71.6 84 Q77.4 81 83 83 M97 83 Q102.6 81 108.4 84" ${S} stroke-width="1.3"/>`;
    if (vyraz === "hvizd") s += `<ellipse cx="${f(92 + ox * 0.5)}" cy="110.4" rx="2.3" ry="2.7" fill="${oko}"/><ellipse cx="${f(92 + ox * 0.5)}" cy="110.8" rx="0.95" ry="1.2" fill="#F1E7D7" opacity="0.6"/>`;
    else s += `<path d="M84.6 108.6 Q90 113.4 95.4 108.6" ${S} stroke-width="1.9"/>`;
  } else {
    /* smug: víčka těžká shora, obočí šikmo, zvlněný úsměv — ví něco, co ty ne */
    const ry = 5 * Math.max(0.06, 1 - mrk);
    for (const x of [73, 97]) {
      s += `<path d="M${f(x + ox)} ${f(92 + oy * 0.5)} h10 a5 ${f(ry)} 0 0 1 -10 0 Z" fill="${zar}"/>`;
      if (mrk < 0.5) s += `<circle cx="${f(x + 7 + ox * 1.1)}" cy="${f(94.6 + oy * 0.6)}" r="1.2" fill="${lesk}"/>`;
    }
    s += `<path d="M${f(71 + ox * 0.4)} ${f(89 + oy * 0.3)} L${f(84 + ox * 0.4)} ${f(91 + oy * 0.3)} M${f(96 + ox * 0.4)} ${f(91 + oy * 0.3)} L${f(109 + ox * 0.4)} ${f(89 + oy * 0.3)}" ${S} stroke-width="1.4"/>`;
    s += `<path d="M79 110 Q85 116 90 110 Q95 104 101 110" ${S} stroke-width="2"/>`;
  }
  return s;
};

/* ——— Klobouk kasa: nízký kužel viděný trochu shora, v souřadnicích Bublinky ——— */
const KASA = (() => {
  const VRCH = [90, 38.6];
  /* bližší okraj krempy: oblouk od levého cípu přes čelo k pravému */
  const krempa = (u) => [(1 - u) * (1 - u) * 30 + 2 * u * (1 - u) * 90 + u * u * 150, (1 - u) * (1 - u) * 71 + 2 * u * (1 - u) * 84 + u * u * 71];
  const obrys = "M30 71 C52 63 71 51 80 42.4 Q90 33.6 100 42.4 C109 51 128 63 150 71 Q90 84 30 71 Z";
  /* pletení: soustředné pásy, každý druhý posunutý o půl oka */
  const pasy = [0.2, 0.34, 0.48, 0.62, 0.76, 0.9].map((q, i) => {
    const y = VRCH[1] + q * 32.4, w = 58.4 * Math.pow(q, 1.2);
    return { d: `M${f(90 - w)} ${f(y)} Q90 ${f(y + 26 * Math.pow(q, 1.2))} ${f(90 + w)} ${f(y)}`, posun: i % 2 ? 1.9 : 0 };
  });
  /* žebra z bambusu od vršku ke krempě */
  let zebra = "";
  for (let u = 0.05; u < 0.96; u += 0.075) {
    const P = krempa(u);
    zebra += `M${pt(VRCH)} Q${f(lerp(VRCH[0], P[0], 0.5) + (P[0] - 90) * 0.05)} ${f(lerp(VRCH[1], P[1], 0.5) - 2.2)} ${pt(P)} `;
  }
  /* roztřepený okraj: stébla trčí z krempy ven a dolů, u cípů do stran */
  const r = rng(61);
  let trepeni = "";
  for (let i = 0; i <= 52; i++) {
    const u = clamp(i / 52 + (r() - 0.5) * 0.012);
    const P = krempa(u);
    const strana = 2 * u - 1;
    let n = [-26 * (1 - 2 * u) + strana * Math.abs(strana) * 130, 120 * (1 - 0.6 * strana * strana)];
    const d = Math.hypot(n[0], n[1]);
    n = [n[0] / d, n[1] / d];
    const a = Math.atan2(n[1], n[0]) + (r() - 0.5) * 0.7;
    /* nad čelem jen krátce, ať to nevypadá jako ofina; k cípům delší */
    const L = 0.9 + r() * 2 + (3.4 + r() * 3.6) * strana * strana;
    const t = [-Math.sin(a) * 0.75, Math.cos(a) * 0.75];
    trepeni += `M${pt([P[0] + t[0], P[1] + t[1] - 0.6])} L${pt([P[0] + Math.cos(a) * L, P[1] + Math.sin(a) * L])} L${pt([P[0] - t[0], P[1] - t[1] - 0.6])} Z `;
  }
  return { VRCH, krempa, obrys, pasy, zebra, trepeni };
})();
/**
 * Černý slaměný klobouk. Sedí na temeni, krempa jde přes čelo a stíní ho,
 * šňůrky se sbíhají pod pusou do mašle. `kyv` (stupně) ho naklání ve
 * větru, `zved` 0…1 ho nadzvedne (když foukne), `brada` posune uzel pod
 * pusu, když je tvář natočená do strany. Stín na čele se ořezává koulí
 * těla, proto `id` z bubDefs.
 */
export const bubKlobouk = (id, { kyv = 0, zved = 0, barva = "#1C1918", tmava = "#0D0B0A", pleteni = "#5C564E", zebro = "#3A3531", lesk = "#9A9388", stin = 0.24, snurka = "#1C1918", brada = 0 } = {}) => {
  const posun = `transform="translate(0 ${f(-4 * zved)}) rotate(${f(kyv * 0.35)} 90 74)"`;
  return (
    /* stín krempy na čele */
    `<g clip-path="url(#${id}-bublina)"><path d="M30 71 Q90 84 150 71 L150 77 Q90 99 30 77 Z" fill="#17121C" opacity="${f(stin * (1 - 0.6 * zved))}"/></g>` +
    /* šňůrky pod bradu a mašle */
    `<path d="M57 77 C49.6 98 ${f(60 + brada * 0.6)} 122 ${f(86.6 + brada)} 130.6 M123 77 C130.4 98 ${f(120 + brada * 0.6)} 122 ${f(93.4 + brada)} 130.6" stroke="${snurka}" stroke-width="1.05" stroke-linecap="round" fill="none"/>` +
    `<g transform="translate(${f(brada)} 0)">` +
    `<path d="M90 131 c-5 -4.8 -9.4 -1 -6.6 2.6 c1.7 2 4.8 0.4 6.6 -2.6 c5 -4.8 9.4 -1 6.6 2.6 c-1.7 2 -4.8 0.4 -6.6 -2.6 Z" fill="none" stroke="${snurka}" stroke-width="1.1" stroke-linejoin="round"/>` +
    `<path d="M89 132 l-2.8 6.4 M91 132 l2.8 6.4" stroke="${snurka}" stroke-width="1.1" stroke-linecap="round"/><circle cx="90" cy="131.4" r="1.3" fill="${snurka}"/></g>` +
    `<g ${posun}>` +
    `<path d="${KASA.trepeni}" fill="${barva}" stroke="${tmava}" stroke-width="0.3" stroke-linejoin="round"/>` +
    `<path d="${KASA.obrys}" fill="${barva}" stroke="${tmava}" stroke-width="1.3" stroke-linejoin="round"/>` +
    `<path d="${KASA.zebra}" stroke="${zebro}" stroke-width="0.6" fill="none"/>` +
    KASA.pasy.map((p) => `<path d="${p.d}" stroke="${tmava}" stroke-width="1.5" fill="none"/><path d="${p.d}" stroke="${pleteni}" stroke-width="1" stroke-dasharray="2.3 1.5" stroke-dashoffset="${p.posun}" fill="none"/>`).join("") +
    /* obšitá krempa, vršek a světlo na levém svahu */
    `<path d="M30 71 Q90 84 150 71" stroke="${tmava}" stroke-width="2.2" stroke-linecap="round" fill="none"/>` +
    `<path d="M33 71.4 Q90 83.2 147 71.4" stroke="${pleteni}" stroke-width="0.6" stroke-dasharray="1.2 1.6" fill="none"/>` +
    `<ellipse cx="90" cy="41.6" rx="6.4" ry="2.4" fill="${tmava}"/><path d="M85.6 40.8 Q90 39.2 94.4 40.8" stroke="${pleteni}" stroke-width="0.6" fill="none"/>` +
    `<path d="M45 65.6 C60 59 73 50.6 81.6 43.4" stroke="${lesk}" stroke-width="2.6" stroke-linecap="round" fill="none" opacity="0.26"/>` +
    `</g>`
  );
};

/**
 * Čelenka duchů hitaikakushi: bílá páska kolem hlavy a nad čelem papírový
 * trojúhelník, který kouká přes temeno. `kyv` (stupně) ho naklání ve větru.
 */
export const bubCelenka = ({ kyv = 0, papir = "#FBF7EE", stin = "#E4DCCB", obrys = "#8A7A69" } = {}) => {
  const paska = "M50.6 72.6 Q90 84 129.4 72.6";
  const k = rad(kyv);
  /* špička se kývá kolem středu základny */
  const Z = [90, 78.6];
  const spicka = [Z[0] + Math.sin(k) * 25, Z[1] - Math.cos(k) * 25];
  const L = [75.6, 77.2], P = [104.4, 77.2];
  return (
    `<path d="${paska}" stroke="${obrys}" stroke-width="5.4" stroke-linecap="round" fill="none"/>` +
    `<path d="${paska}" stroke="${papir}" stroke-width="3.8" stroke-linecap="round" fill="none"/>` +
    `<path d="M52 75.4 Q90 86.6 128 75.4" stroke="${stin}" stroke-width="0.9" fill="none" opacity="0.9"/>` +
    `<path d="M${pt(L)} Q90 80.6 ${pt(P)} L${pt(spicka)} Z" fill="${papir}" stroke="${obrys}" stroke-width="1" stroke-linejoin="round"/>` +
    `<path d="M${pt(spicka)} L${pt([Z[0] + 5.6, Z[1] + 0.6])} L${pt(P)} Z" fill="${stin}" opacity="0.75"/>` +
    `<path d="M${pt(spicka)} L${pt([Z[0] + 5.6, Z[1] + 0.8])}" stroke="${obrys}" stroke-width="0.5" opacity="0.6"/>`
  );
};

/**
 * Ocásek místo nohou: vychází zpod koule, vlní se a ke špičce se vytrácí.
 * `smer` ±1 říká, kam se stočí, `delka` v jednotkách kresby Bublinky.
 */
export const bubOcas = (id, t, { delka = 46, smer = 1, zhoup = 0, fz = 0, sirka = 44, obrys = "#6B5D4F" } = {}) => {
  const B = [];
  const N = 14;
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    const vl = Math.sin(t * 2.1 + fz - s * 3.6) * 5.5 * s;
    B.push([90 + smer * (16 * s * s + zhoup * s * s) + vl, 118 + delka * s]);
  }
  const d = pasPoBodech(B, (s) => sirka * Math.pow(1 - s, 1.25) * (0.86 + 0.14 * Math.cos(s * 5)));
  return `<path d="${d}" fill="url(#${id}-ocas)" stroke="${obrys}" stroke-width="1.1" stroke-linejoin="round" stroke-opacity="0.55"/>`;
};
export const ocasDefs = (id, { barva = "#EFE4D2", dole = 0 } = {}) =>
  `<linearGradient id="${id}-ocas" gradientUnits="userSpaceOnUse" x1="0" y1="124" x2="0" y2="170"><stop offset="0" stop-color="${barva}" stop-opacity="0.92"/><stop offset="0.55" stop-color="${barva}" stop-opacity="0.6"/><stop offset="1" stop-color="${barva}" stop-opacity="${dole}"/></linearGradient>`;

/** Ručka jako gumová hadice: z ramene k zápěstí oblouk. ohyb ±1 říká, kam se ohne loket. */
export const ruckaB = (S, H, { tl = 4.4, barva = "#F1E7D7", obrys = "#6B5D4F", ohyb = 1, pest = true } = {}) => {
  const dx = H[0] - S[0], dy = H[1] - S[1];
  const d = Math.hypot(dx, dy) || 1;
  const prohnuti = (4 + Math.max(0, 34 - d) * 0.38) * ohyb;
  const M = [(S[0] + H[0]) / 2 - (dy / d) * prohnuti, (S[1] + H[1]) / 2 + (dx / d) * prohnuti];
  const c = `M${pt(S)} Q${pt(M)} ${pt(H)}`;
  return (
    `<path d="${c}" stroke="${obrys}" stroke-width="${f(tl + 1.5)}" stroke-linecap="round" fill="none"/>` +
    `<path d="${c}" stroke="${barva}" stroke-width="${tl}" stroke-linecap="round" fill="none"/>` +
    (pest ? `<circle cx="${f(H[0])}" cy="${f(H[1])}" r="${f(tl * 0.95)}" fill="${barva}" stroke="${obrys}" stroke-width="0.85"/>` : "")
  );
};
/**
 * Ručka ducha: paže k zápěstí a z něj svěšená dlaň, jak je mají jūrei
 * na svitcích. `uhel` (stupně) dlaň zhoupne, 0 visí rovně dolů.
 */
export const ruckaDucha = (S, W, { uhel = 0, tl = 4.4, delka = 11, barva = "#F1E7D7", obrys = "#6B5D4F", ohyb = 1 } = {}) =>
  ruckaB(S, W, { tl, barva, obrys, ohyb, pest: false }) +
  `<g transform="translate(${f(W[0])} ${f(W[1])}) rotate(${f(uhel)})">` +
  `<path d="M${f(-tl * 0.72)} -1 C${f(-tl * 1.05)} ${f(delka * 0.5)} ${f(-tl * 0.6)} ${f(delka)} 0 ${f(delka + 0.6)} C${f(tl * 0.6)} ${f(delka)} ${f(tl * 1.05)} ${f(delka * 0.5)} ${f(tl * 0.72)} -1 Z" fill="${barva}" stroke="${obrys}" stroke-width="0.85" stroke-linejoin="round"/>` +
  `<path d="M${f(-tl * 0.2)} ${f(delka * 0.62)} V${f(delka - 0.6)} M${f(tl * 0.26)} ${f(delka * 0.66)} V${f(delka - 1)}" stroke="${obrys}" stroke-width="0.5" stroke-linecap="round" opacity="0.6"/></g>`;

/** Bludička onibi: kulatá hlavička a ocásek, který vlaje proti pohybu. */
export const plaminek = (x, y, smer, { id, r = 3.4, delka = 11, t = 0, fz = 0, barva = "#E2F1F8", jadro = "#FFFFFF", lem = "#78AACB", sila = 1, zare = 4.6 } = {}) => {
  const B = [];
  const N = 10;
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    const vl = Math.sin(t * 7 + fz - s * 4.2) * 2.4 * s * s * (r / 3.4);
    B.push([x + Math.cos(smer) * delka * s - Math.sin(smer) * vl, y + Math.sin(smer) * delka * s + Math.cos(smer) * vl]);
  }
  const telo = (k) => pasPoBodech(B, (s) => 2 * r * k * Math.pow(1 - s, 0.85) * (0.9 + 0.1 * Math.cos(s * 3)));
  return (
    (zare ? `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r * zare)}" fill="url(#${id}-onibi-zare)" opacity="${f(0.85 * sila)}"/>` : "") +
    `<path d="${telo(1.16)}" fill="${lem}" opacity="${f(0.55 * sila)}"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 1.16)}" fill="${lem}" opacity="${f(0.55 * sila)}"/>` +
    `<path d="${telo(0.86)}" fill="${barva}" opacity="${f(clamp(sila * 1.2))}"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 0.86)}" fill="${barva}" opacity="${f(clamp(sila * 1.2))}"/>` +
    `<circle cx="${f(x - r * 0.18)}" cy="${f(y - r * 0.14)}" r="${f(r * 0.46)}" fill="${jadro}" opacity="${f(clamp(sila * 1.2))}"/>`
  );
};
export const onibiDefs = (id, { barva = "#8CC0DA", stred = "#B6DCEE" } = {}) =>
  `<radialGradient id="${id}-onibi-zare"><stop offset="0" stop-color="${stred}" stop-opacity="0.75"/><stop offset="0.45" stop-color="${barva}" stop-opacity="0.24"/><stop offset="1" stop-color="${barva}" stop-opacity="0"/></radialGradient>`;
/** Bludička, která letí k cíli: pružina, ocásek se stáčí proti pohybu a vzhůru. */
export const krokOnibi = (o, cil, dt, { tuhost = 9, tlumeni = 4.2 } = {}) => {
  o.vx += (tuhost * (cil[0] - o.x) - tlumeni * o.vx) * dt;
  o.vy += (tuhost * (cil[1] - o.y) - tlumeni * o.vy - 2) * dt;
  o.x += o.vx * dt;
  o.y += o.vy * dt;
  o.rychlost = Math.hypot(o.vx, o.vy);
  const cilSmer = Math.atan2(-o.vy * 0.04 - 1, -o.vx * 0.04);
  let d = cilSmer - o.smer;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  o.smer += d * (1 - Math.exp(-dt / 0.12));
};

/**
 * Tušový lem jako u Pecinčina raku: skvrna rozpité tuše, v ní celá scéna.
 * Vrací cestu skvrny, vrstvu pod scénu a definice filtrů a ořezu
 * (`${id}-tus-orez`), kterým se scéna ořízne.
 */
export const tusLem = (id, { seed = 4, barva = "#241E29", lem = "#3A3240", stred = [90, 92], polomer = [86, 85] } = {}) => {
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
      `<feColorMatrix in="m" type="matrix" values="0 0 0 0 0.09  0 0 0 0 0.09  0 0 0 0 0.15  0 0 0 1.5 -0.62" result="skvrny"/>` +
      `<feComposite in="skvrny" in2="b" operator="in" result="sk"/>` +
      `<feMerge><feMergeNode in="b"/><feMergeNode in="sk"/></feMerge></filter>` +
      `<filter id="${id}-tus-lem" x="-15%" y="-15%" width="130%" height="130%"><feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="${seed + 17}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="16" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation="2.4"/></filter>` +
      `<clipPath id="${id}-tus-orez"><path d="${D}"/></clipPath>`,
  };
};
