/*
 * Bublinka jako yōkai ve třech přehnaných podobách — generátory kresby.
 * Komponenta: components/characters/kami-buh/BublinkaYokai.astro, běh: ./beh.js.
 *
 *   v1  Ukradený vítr — čmajzla Fūdžinovi vak s větrem (Kapka vedle bubnuje jako Raidžin)
 *   v2  Jóhen — miska tenmoku jako vesmír; 窯変 je „proměna v peci“, tedy její řemeslo
 *   v3  Šódži — za papírovou stěnou táhne noční průvod strašidel a z děr koukají oči
 *
 * Stavba je stejná jako u Pecinky s ohněm (scripts/pecinka-ohen): čisté
 * generátory SVG bez DOM — dostanou čas, stav simulace a vstup a vrátí
 * značky. Běží i v Node, takže jde udělat náhled jako PNG (celeSvg + sharp)
 * a první snímek se vykreslí už při sestavení stránky.
 *
 * Vrstva bez `klic` se nakreslí jednou, s `klic` se překreslí, jen když se
 * klíč změní. Vrstva s `pohyb` se nepřekresluje, když se jen hýbe: běh ji
 * posune a natočí CSS transformací (stejná čísla celeSvg převede na SVG
 * transform). Id ve filtrech a přechodech jsou pevná, každá podoba smí být
 * na stránce jen jednou.
 *
 * Simulace žije v `dyn`: beh.js ji založí přes novaDynamika() a každý snímek
 * posune přes krok(). Zvuky, které má běh zahrát, krok přidá do dyn.zvuk.
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
/** Pružina k cíli, nezávislá na snímkovce: k je časová konstanta v sekundách. */
const kCili = (v, cil, dt, k) => v + (cil - v) * (1 - Math.exp(-dt / k));

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
/** Body na stejné křivce, hustě — pro stuhy a tahy s proměnnou šířkou. */
const vzorkuj = (P, naUsek = 8) => {
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
const normaly = (B) =>
  B.map((_, i) => {
    const a = B[Math.max(0, i - 1)], b = B[Math.min(B.length - 1, i + 1)];
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [-(b[1] - a[1]) / d, (b[0] - a[0]) / d];
  });
/** Lomená čára s proměnnou šířkou → uzavřený tvar. sirka(t) pro t 0…1. */
const pasPoBodech = (B, sirka) => {
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

/* ═══════════════════════════════════════════════════════════════════
 * Tenká vrstva: barvy mýdlové bubliny a duhových skvrn jóhen
 *
 * Bublina je blána vody silná pár set nanometrů. Světlo se odrazí od
 * přední i zadní stěny a obě vlny se sečtou — podle tloušťky se některé
 * barvy zesílí a jiné vyruší. Tabulka níž to počítá doopravdy: odrazivost
 * blány (n = 1,33) pro vlnové délky 380–780 nm, přes křivky citlivosti
 * oka CIE 1931 (analytická náhrada podle Wymana, Sloana a Shirleyho) do
 * sRGB. Vyjde Newtonova řada: černá, stříbrná, žlutá, purpurová, modrá
 * a pak další řády, čím dál bledší. Odrazivost je jen kolem 8 %, takže
 * se barvy natáhnou na plný jas.
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
/** Barva blány silné d nanometrů (při kolmém pohledu). */
const filmRgb = (d) => {
  const x = clamp(d, 0, 1599.9) / 5;
  const i = Math.floor(x), k = x - i;
  const A = FILM[i], B = FILM[Math.min(FILM.length - 1, i + 1)];
  return [0, 1, 2].map((j) => A[j] + (B[j] - A[j]) * k);
};
const film = (d) => rgbHex(filmRgb(d));
/** Šikmý pohled zkracuje dráhu světla v bláně: d·cos θt, sin θt = sin θ / n. */
const filmSikmo = (d, cosTheta) => d * Math.sqrt(1 - (1 - cosTheta * cosTheta) / (1.33 * 1.33));

/* ═══════════════════════════════════════════════════════════════════
 * Bublinka: původní kresba (characters/kami/Bublinka.astro) — koule
 * z napůl průhledného vzduchu, přivřená očka, zvlněný úsměv. Všechno
 * v jejích souřadnicích: střed 90 96, poloměr 46.
 * ═══════════════════════════════════════════════════════════════════ */
const BUB = { c: [90, 96], r: 46 };

/** Přechody těla: světlo zleva shora, střed průhlednější než okraj (jako u bubliny). */
const bubDefs = (id, { pruhledna = 0.5 } = {}) =>
  `<radialGradient id="${id}-telo" cx="0.38" cy="0.32" r="0.75">` +
  `<stop offset="0" stop-color="#FBF6EE" stop-opacity="${f(pruhledna)}"/>` +
  `<stop offset="0.62" stop-color="#F2E8D8" stop-opacity="${f(lerp(pruhledna, 0.9, 0.5))}"/>` +
  `<stop offset="0.9" stop-color="#E2D3BC" stop-opacity="0.9"/>` +
  `<stop offset="1" stop-color="#D2C1A6" stop-opacity="0.96"/></radialGradient>` +
  `<radialGradient id="${id}-tvare" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#D98A62" stop-opacity="0.62"/><stop offset="1" stop-color="#D98A62" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="${id}-film-maska-g" cx="0.5" cy="0.5" r="0.5"><stop offset="0.3" stop-color="#FFFFFF" stop-opacity="0.12"/><stop offset="0.78" stop-color="#FFFFFF" stop-opacity="0.6"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="1"/></radialGradient>` +
  `<mask id="${id}-film-maska" maskContentUnits="userSpaceOnUse"><circle cx="90" cy="96" r="46" fill="url(#${id}-film-maska-g)"/></mask>` +
  `<clipPath id="${id}-bublina"><circle cx="90" cy="96" r="45.4"/></clipPath>` +
  `<filter id="${id}-tah" x="-8%" y="-8%" width="116%" height="116%" color-interpolation-filters="sRGB">` +
  `<feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="4" result="vlna"/>` +
  `<feDisplacementMap in="SourceGraphic" in2="vlna" scale="2.4" xChannelSelector="R" yChannelSelector="G" result="tah"/>` +
  `<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="11" result="zrno"/>` +
  `<feColorMatrix in="zrno" type="matrix" values="0 0 0 0 0.23  0 0 0 0 0.18  0 0 0 0 0.16  0.45 0 0 0 -0.2" result="skvrny"/>` +
  `<feComposite in="skvrny" in2="tah" operator="in" result="zrnoVTvaru"/>` +
  `<feMerge><feMergeNode in="tah"/><feMergeNode in="zrnoVTvaru"/></feMerge></filter>`;

/** Tělo: koule, obrys perem. Kreslí se jednou, hýbe s ním běh. */
const bubTelo = (id, { obrys = "#6B5D4F", sirkaObrysu = 1.6 } = {}) =>
  `<g filter="url(#${id}-tah)"><circle cx="90" cy="96" r="46" fill="url(#${id}-telo)" stroke="${obrys}" stroke-width="${sirkaObrysu}"/></g>`;

/** Lesk navrch: měkký odlesk okna vlevo nahoře, ostrá tečka a světlo po okraji vpravo dole. */
const bubLesk = ({ okraj = "#FFFFFF", sila = 1 } = {}) =>
  `<ellipse cx="71" cy="76" rx="13" ry="8" fill="#FFFFFF" opacity="${f(0.82 * sila)}" transform="rotate(-35 71 76)"/>` +
  `<ellipse cx="66.6" cy="72.6" rx="4.6" ry="2.6" fill="#FFFFFF" transform="rotate(-35 66.6 72.6)" opacity="${f(sila)}"/>` +
  `<circle cx="84" cy="66" r="1.8" fill="#FFFFFF" opacity="${f(0.7 * sila)}"/>` +
  `<path d="M126 112 A40 40 0 0 1 98 136" stroke="${okraj}" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="${f(0.72 * sila)}"/>`;

/**
 * Duhová blána na těle. Pruhy stejné tloušťky jdou shora dolů (voda stéká,
 * nahoře je blána nejtenčí) a víry je kroutí. Každý pruh je oblast „nad
 * čarou“ protažená přes víry; víry jsou spojité otočení kolem středu, takže
 * se pruhy nikdy nepřekříží. Kreslí se odspodu, tenčí přes tlustší.
 */
const filmPruhy = (st, { pruhu = 15, od = 46, krokNm = 34, viry = [], vlna = 0 } = {}) => {
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

/**
 * Tvářička v souřadnicích původní kresby. dx/dy posouvá pohled, mrk 0…1
 * zavírá oči. vyraz: smug | fuk | smich | akanbe | uzas | psst
 */
const bubTvar = (id, { dx = 0, dy = 0, mrk = 0, vyraz = "smug", tvare = 0.45, oko = "#3A2E28", jazyk = "#E58A86" } = {}) => {
  let s = "";
  const ox = clamp(dx, -2.4, 2.4), oy = clamp(dy, -1.8, 1.8);
  const tv = vyraz === "fuk" ? 1.5 : vyraz === "smich" ? 1.2 : 1;
  for (const x of [69, 111]) s += `<ellipse cx="${x}" cy="108" rx="${f(8 * tv)}" ry="${f(5.4 * tv)}" fill="url(#${id}-tvare)" opacity="${f(clamp(tvare * 1.5))}"/>`;
  const S = `stroke="${oko}" stroke-linecap="round" stroke-linejoin="round" fill="none"`;
  if (vyraz === "fuk") {
    /* mačká vak: očka zmáčknutá, tváře nafouknuté, pusa do kroužku */
    s += `<path d="M72.6 88.6 L81.4 92.6 L72.6 96.6 M107.4 88.6 L98.6 92.6 L107.4 96.6" ${S} stroke-width="2.2"/>`;
    s += `<path d="M70 84.6 L83 87.4 M97 87.4 L110 84.6" ${S} stroke-width="1.5"/>`;
    s += `<ellipse cx="90" cy="110.6" rx="3.1" ry="3.7" fill="${oko}"/><ellipse cx="90" cy="111.8" rx="1.6" ry="1.3" fill="#C4432B" opacity="0.8"/>`;
  } else if (vyraz === "smich") {
    s += `<path d="M72 94.6 Q78 87.4 84 94.6 M96 94.6 Q102 87.4 108 94.6" ${S} stroke-width="2.3"/>`;
    s += `<path d="M71 85.4 Q77.4 82.4 83.4 84.4 M96.6 84.4 Q102.6 82.4 109 85.4" ${S} stroke-width="1.4"/>`;
    s += `<path d="M78.6 106 Q90 102.6 101.4 106 Q100 117.6 90 118.4 Q80 117.6 78.6 106 Z" fill="${oko}"/>`;
    s += `<path d="M84 114.6 Q90 110.8 96 114.6 Q93 117.8 90 117.9 Q87 117.8 84 114.6 Z" fill="${jazyk}"/>`;
  } else if (vyraz === "uzas") {
    for (const x of [78, 102]) s += `<circle cx="${f(x + ox * 0.6)}" cy="${f(93 + oy * 0.5)}" r="3.9" fill="${oko}"/><circle cx="${f(x + ox * 0.6 - 1.2)}" cy="${f(91.6 + oy * 0.5)}" r="1.3" fill="#FFF8F2"/>`;
    s += `<path d="M71 83.6 Q77 80.4 83 82.6 M97 82.6 Q103 80.4 109 83.6" ${S} stroke-width="1.4"/>`;
    s += `<ellipse cx="90" cy="111" rx="2.7" ry="3.4" fill="${oko}"/>`;
  } else if (vyraz === "akanbe") {
    /* akanbé: jedno oko zavřené, druhé vykulené s rudým spodním víčkem, jazyk ven */
    s += `<circle cx="${f(78 + ox * 0.5)}" cy="${f(92.6 + oy * 0.4)}" r="3.6" fill="${oko}"/><circle cx="${f(76.9 + ox * 0.5)}" cy="${f(91.3 + oy * 0.4)}" r="1.2" fill="#FFF8F2"/>`;
    s += `<path d="M73.4 97.4 Q78 100.6 82.6 97.4" stroke="#C4432B" stroke-width="1.5" stroke-linecap="round" fill="none"/>`;
    s += `<path d="M97 92.6 Q102 96.6 107 92.6" ${S} stroke-width="2.1"/>`;
    s += `<path d="M71.4 85.4 L84 87.6 M96 89.4 L108.6 87.8" ${S} stroke-width="1.4"/>`;
    s += `<path d="M79 110 Q85 116 90 110 Q95 104 101 110" ${S} stroke-width="2"/>`;
    s += `<path d="M86.6 112 Q86.2 121.6 91 121.8 Q95.6 121.6 95.2 111.6 Q91 113.6 86.6 112 Z" fill="${jazyk}" stroke="${oko}" stroke-width="0.9"/>`;
    s += `<path d="M90.9 113.4 V118.6" stroke="#B85A5C" stroke-width="0.7" stroke-linecap="round"/>`;
  } else if (vyraz === "psst") {
    /* pšš: oči napravo, pusa našpulená */
    const ry = 5 * Math.max(0.06, 1 - mrk);
    for (const x of [73, 97]) s += `<path d="M${f(x + 1.4)} 92 h10 a5 ${f(ry)} 0 0 1 -10 0 Z" fill="${oko}"/>`;
    s += `<path d="M71 88.4 L84 90.6 M96 90.6 L109 88.4" ${S} stroke-width="1.4"/>`;
    s += `<path d="M86.4 110.4 Q90 107.6 93.6 110.4 Q90 113.2 86.4 110.4 Z" fill="${oko}"/>`;
  } else {
    /* smug: víčka těžká shora, obočí šikmo, zvlněný úsměv — ví něco, co ty ne */
    const ry = 5 * Math.max(0.06, 1 - mrk);
    for (const x of [73, 97]) {
      s += `<path d="M${f(x + ox)} ${f(92 + oy * 0.5)} h10 a5 ${f(ry)} 0 0 1 -10 0 Z" fill="${oko}"/>`;
      if (mrk < 0.5) s += `<circle cx="${f(x + 7 + ox * 1.1)}" cy="${f(94.6 + oy * 0.6)}" r="1.2" fill="#FFF8F2"/>`;
    }
    s += `<path d="M${f(71 + ox * 0.4)} ${f(89 + oy * 0.3)} L${f(84 + ox * 0.4)} ${f(91 + oy * 0.3)} M${f(96 + ox * 0.4)} ${f(91 + oy * 0.3)} L${f(109 + ox * 0.4)} ${f(89 + oy * 0.3)}" ${S} stroke-width="1.4"/>`;
    s += `<path d="M79 110 Q85 116 90 110 Q95 104 101 110" ${S} stroke-width="2"/>`;
  }
  return s;
};

/** Ručka jako gumová hadice: z ramene k pěsti oblouk. ohyb ±1 říká, kam se ohne loket. */
const ruckaB = (S, H, { tl = 4.4, barva = "#F1E7D7", obrys = "#6B5D4F", ohyb = 1, pest = true } = {}) => {
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

/** Bludička onibi: kulatá hlavička a ocásek, který vlaje proti pohybu. */
const plaminek = (x, y, smer, { id, r = 3.4, delka = 11, t = 0, fz = 0, barva = "#E2F1F8", jadro = "#FFFFFF", lem = "#78AACB", sila = 1 } = {}) => {
  const B = [];
  const N = 10;
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    const vl = Math.sin(t * 7 + fz - s * 4.2) * 2.4 * s * s;
    B.push([x + Math.cos(smer) * delka * s - Math.sin(smer) * vl, y + Math.sin(smer) * delka * s + Math.cos(smer) * vl]);
  }
  const telo = (k) => pasPoBodech(B, (s) => 2 * r * k * Math.pow(1 - s, 0.85) * (0.9 + 0.1 * Math.cos(s * 3)));
  return (
    `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 4.6)}" fill="url(#${id}-onibi-zare)" opacity="${f(0.85 * sila)}"/>` +
    `<path d="${telo(1.16)}" fill="${lem}" opacity="${f(0.55 * sila)}"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 1.16)}" fill="${lem}" opacity="${f(0.55 * sila)}"/>` +
    `<path d="${telo(0.86)}" fill="${barva}"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 0.86)}" fill="${barva}"/>` +
    `<circle cx="${f(x - r * 0.18)}" cy="${f(y - r * 0.14)}" r="${f(r * 0.46)}" fill="${jadro}"/>`
  );
};
const onibiDefs = (id) =>
  `<radialGradient id="${id}-onibi-zare"><stop offset="0" stop-color="#B6DCEE" stop-opacity="0.75"/><stop offset="0.45" stop-color="#8CC0DA" stop-opacity="0.24"/><stop offset="1" stop-color="#8CC0DA" stop-opacity="0"/></radialGradient>`;

/* ═══════════════════════════════════════════════════════════════════
 * 1 — UKRADENÝ VÍTR
 * Na Sótacuově paravánu Fūdžin Raidžin-zu stojí proti sobě bůh hromu
 * s kruhem bubnů a bůh větru s vakem, ze kterého pouští vítr. Kapka
 * o kus výš na stránce bubnuje jako Raidžin. Bublinka je yōkai, svatá
 * není, a tak si vak s větrem prostě čmajzla. Drží ho nad hlavou jako
 * Fūdžin, vak je z bílého hedvábí s indigovými tečkami šibori, konce
 * stažené rumělkovou šňůrou. Za zády vlaje šátek v barvě seladonu
 * a kolem krouží její dvě bludičky onibi.
 *
 * Myš je vějíř: kudy se mávne, tam fouká, a šátek, šňůrky i listí jdou
 * s ní. Když se kurzor přiblíží, Bublinka uhne — a když se moc vnucuje,
 * udělá akanbé. Kliknutí: zmáčkne vak, namíří jeho ústí na kurzor
 * a pustí do něj poryv s javorovým listím. Zpětný ráz ji kousek odfoukne.
 * ═══════════════════════════════════════════════════════════════════ */
const V1 = (() => {
  const B0 = [90, 113];
  const K = 33 / 46;
  const R = 33;
  const POSTAVA = `translate(${B0[0]} ${B0[1]}) scale(${K}) translate(-90 -96)`;
  const vPostave = (s) => `<g transform="${POSTAVA}">${s}</g>`;
  const RAMENA = { L: [B0[0] - R * Math.cos(rad(38)), B0[1] - R * Math.sin(rad(38))], P: [B0[0] + R * Math.cos(rad(38)), B0[1] - R * Math.sin(rad(38))] };
  const RUCE = { L: [B0[0] - 40, B0[1] - 45], P: [B0[0] + 40, B0[1] - 45] };
  /* oblouk vaku: kus elipsy, který začíná a končí v pěstích a nahoře se vyboulí do podkovy */
  const OBL = { cx: 90, cy: B0[1] - 61.3, A: 48.5, C: 30.7, od: -0.6 };
  const obloukBod = (th) => [OBL.cx - OBL.A * Math.cos(th), OBL.cy - OBL.C * Math.sin(th)];

  /* Javorový list momidži: sedm cípů, řapík dole v počátku, délka 1 */
  const LIST_D = (() => {
    const laloky = [[-104, 0.4], [-68, 0.7], [-34, 0.9], [0, 1], [34, 0.9], [68, 0.7], [104, 0.4]];
    const st = [0, -0.34];
    const B = [[0.05, 0.02]];
    laloky.forEach(([a, L], i) => {
      const u = rad(a - 90);
      if (i > 0) {
        const uv = rad((a + laloky[i - 1][0]) / 2 - 90);
        B.push([st[0] + Math.cos(uv) * 0.24 * L, st[1] + Math.sin(uv) * 0.24 * L]);
      }
      const bok = (s, k) => [st[0] + Math.cos(u + s * 0.2) * L * k, st[1] + Math.sin(u + s * 0.2) * L * k];
      B.push(bok(-1, 0.5), bok(-0.45, 0.78), [st[0] + Math.cos(u) * L * 0.98, st[1] + Math.sin(u) * L * 0.98], bok(0.45, 0.78), bok(1, 0.5));
    });
    B.push([-0.05, 0.02]);
    return `${cara(B.reverse())} Z M0 0.02 L0 0.32`;
  })();
  const BARVY_LISTU = [["#C4432B", "#8E2A1A"], ["#DE6A2E", "#A84A1E"], ["#E8A43A", "#B07A22"], ["#B8392A", "#7A2416"], ["#D9862F", "#A05E1C"]];

  /** Tah větru: rovný běh a na konci zatočení do spirály, jak se vítr kreslí na dřevořezech. */
  const tahVetru = (q) => {
    const B = [];
    const N = 30;
    let x = q.x, y = q.y, a = q.a;
    const rovne = q.L * 0.62;
    for (let i = 0; i <= N; i++) {
      B.push([x, y]);
      const s = i / N;
      const krok = q.L / N;
      if (s * q.L > rovne) a += q.toc * (0.25 + 1.6 * ((s * q.L - rovne) / (q.L - rovne)));
      else a += q.ohyb;
      x += Math.cos(a) * krok * (1 - 0.45 * Math.max(0, (s * q.L - rovne) / (q.L - rovne)));
      y += Math.sin(a) * krok * (1 - 0.45 * Math.max(0, (s * q.L - rovne) / (q.L - rovne)));
    }
    return B;
  };

  const novaDynamika = () => {
    const R2 = rng(20261007);
    const satek = (strana) =>
      Array.from({ length: 17 }, (_, i) => {
        const x = B0[0] + (strana === "L" ? -1 : 1) * (R + i * 3.4), y = B0[1] + 4 + i * 2.2;
        return { x, y, px: x, py: y };
      });
    return {
      fig: { x: 0, y: 0, vx: 0, vy: 0, r: 0, vr: 0 },
      nafouk: 1, nafoukV: 0,
      fan: { x: 90, y: 90, vx: 0, vy: 0, sila: 0 },
      poryv: null, dalsiSamo: 1.0, poslPoryv: -10,
      satek: { L: satek("L"), P: satek("P") },
      listy: [], tahy: [], akum: 0, akumTahu: 0,
      onibi: [0, 1].map((i) => ({ fz: i * Math.PI + 0.8, x: 90 + (i ? 52 : -52), y: 70, vx: 0, vy: 0, smer: -Math.PI / 2 })),
      blizko: 0, akanbe: -10, mrkZ: 0, boing: -10,
      pohled: [0, 0], nahoda: R2, zvuk: [], mys: null, mysPred: null, sumListi: 0,
    };
  };

  /* ——— Vítr: vánek, vějíř z myši a poryv z vaku ——— */
  const vitrV = (dyn, t, x, y) => {
    let wx = 9 + 6 * Math.sin(t * 0.37) + 4 * Math.sin(t * 0.91 + 1.3);
    let wy = -1.5 + 3 * Math.sin(t * 0.53 + 0.4);
    const F = dyn.fan;
    if (F.sila > 0.01) {
      const d2 = (x - F.x) ** 2 + (y - F.y) ** 2;
      const k = F.sila * Math.exp(-d2 / (2 * 46 * 46));
      wx += F.vx * k * 0.55;
      wy += F.vy * k * 0.55;
    }
    const P = dyn.poryv;
    if (P && P.vypusten != null) {
      const u = t - P.vypusten;
      if (u >= 0 && u < 2.2) {
        const ax = x - P.usti[0], ay = y - P.usti[1];
        const pod = ax * P.smer[0] + ay * P.smer[1];
        const bok = Math.abs(ax * P.smer[1] - ay * P.smer[0]);
        const celo = 40 + 260 * u;
        if (pod > -4 && pod < celo) {
          const sirka = 7 + pod * 0.32;
          const k = Math.exp(-(bok * bok) / (2 * sirka * sirka)) * Math.exp(-u / 0.7) * clamp((celo - pod) / 30) * P.sila;
          wx += P.smer[0] * 170 * k;
          wy += P.smer[1] * 170 * k;
        }
      }
    }
    return [wx, wy];
  };

  /** Kde je co z postavy ve světě: postava se posouvá a natáčí kolem klidového středu. */
  const doSveta = (fig, p) => {
    const c = Math.cos(rad(fig.r)), s = Math.sin(rad(fig.r));
    const dx = p[0] - B0[0], dy = p[1] - B0[1];
    return [B0[0] + fig.x + dx * c - dy * s, B0[1] + fig.y + dx * s + dy * c];
  };
  const doPostavy = (fig, p) => {
    const c = Math.cos(rad(-fig.r)), s = Math.sin(rad(-fig.r));
    const dx = p[0] - B0[0] - fig.x, dy = p[1] - B0[1] - fig.y;
    return [B0[0] + dx * c - dy * s, B0[1] + dx * s + dy * c];
  };

  /* ——— Vak: konce v pěstích, ústí stažená šňůrou ——— */
  const smerKonce = (st, strana) => {
    const P = st.poryv;
    const zakl = strana === "L" ? [-0.32, 1] : [0.32, 1];
    let [x, y] = zakl;
    const vx = st.vitrUVaku[0] / 120;
    x += vx * 0.6;
    y -= Math.abs(vx) * 0.2;
    if (P && P.strana === strana && P.miri > 0) {
      x = lerp(x, P.smerPostava[0], P.miri);
      y = lerp(y, P.smerPostava[1], P.miri);
    }
    const d = Math.hypot(x, y) || 1;
    return [x / d, y / d];
  };
  /*
    Vak je látka, ne nafukovací kruh: oblouk je nesouměrný (vítr ho
    vydouvá na jednu stranu), vnější okraj se boulí jinak než vnitřní,
    u pěstí je hedvábí stažené do záhybů a nahoře se vlní. Každý bok má
    vlastní boule, takže tloušťka kolísá jako u pytle s větrem.
  */
  const vak = (st) => {
    const sw = st.kyv;
    const pocet = 52;
    const B = [];
    for (let i = 0; i <= pocet; i++) {
      const s = i / pocet;
      const th = OBL.od + s * (Math.PI - 2 * OBL.od);
      let [x, y] = obloukBod(th);
      const nahore = Math.sin(Math.PI * s);
      /* levá polovina se vydouvá víc ven a výš — vak se převaluje */
      x += -7 * Math.pow(Math.sin(Math.PI * clamp(s / 0.6)), 2) * (1 - s) + 3 * Math.sin(Math.PI * s * 2) * 0.4;
      y += -4 * Math.sin(Math.PI * clamp((s - 0.1) / 0.55)) * (1 - s * 0.6);
      const vl = 1.1 * Math.sin(Math.PI * 4 * s - st.t * 2.6) * nahore * (0.6 + st.trepot);
      B.push([x + sw * Math.pow(nahore, 1.4) + vl * Math.cos(th) * 0.5, y + vl * Math.sin(th) * 0.5 - (st.nafouk - 1) * 3 * nahore]);
    }
    B[0] = RUCE.L;
    B[pocet] = RUCE.P;
    const W = 7 + 13 * st.nafouk;
    /* normála ven z oblouku (normaly() vrací levou, a ta tu míří dovnitř) */
    const N = normaly(B).map(([x, y]) => [-x, -y]);
    const profil = (s) => Math.pow(Math.sin(Math.PI * s), 0.55);
    /* boule: vnější a vnitřní okraj každý jinak, pomalu se přelévají */
    const ven = (s) => (4.6 + (W - 4.6) * profil(s)) * 0.5 * (1 + 0.2 * Math.sin(Math.PI * 2 * 3.1 * s + 0.6 + st.t * 0.9) * profil(s) + 0.1 * Math.sin(Math.PI * 2 * 5.3 * s + 2 - st.t * 1.3) * profil(s));
    const dovnitr = (s) => (4.6 + (W - 4.6) * profil(s)) * 0.5 * (1 + 0.14 * Math.sin(Math.PI * 2 * 2.3 * s + 2.4 - st.t * 0.7) * profil(s));
    const okrajVen = B.map((p, i) => [p[0] + N[i][0] * ven(i / pocet), p[1] + N[i][1] * ven(i / pocet)]);
    const okrajDovnitr = B.map((p, i) => [p[0] - N[i][0] * dovnitr(i / pocet), p[1] - N[i][1] * dovnitr(i / pocet)]);
    const obrys = `${hladka(okrajVen)} L${pt(okrajDovnitr[pocet])} ${hladka(okrajDovnitr.slice().reverse()).replace(/^M[^C]*/, "")} Z`;
    let s = `<defs><clipPath id="by1-vak-orez"><path d="${obrys}"/></clipPath></defs>`;
    s += `<path d="${obrys}" fill="url(#by1-hedvabi)" stroke="#6E6252" stroke-width="0.85" stroke-linejoin="round"/>`;
    s += `<path d="${obrys}" fill="url(#by1-kanoko)" opacity="0.38"/>`;
    /* tušová lavírka po vnitřní straně, jak stínuje Sótacu: šedomodrá, k okraji se ztrácí */
    const stinB = B.map((p, i) => [p[0] - N[i][0] * dovnitr(i / pocet) * 0.3, p[1] - N[i][1] * dovnitr(i / pocet) * 0.3]);
    s += `<g clip-path="url(#by1-vak-orez)"><path d="${pasPoBodech(stinB, (q) => dovnitr(q) * 1.3)}" fill="#5E6884" opacity="0.22"/><path d="${pasPoBodech(stinB, (q) => dovnitr(q) * 0.7)}" fill="#4A5270" opacity="0.14"/>`;
    /* vítr uvnitř: hedvábí je tenké a prosvítají jím víry, které vakem obíhají */
    let viry = "";
    for (let k = 0; k < 4; k++) {
      const q = (((st.t * 0.07 * (1 + st.trepot) + k / 4) % 1) + 1) % 1;
      const qq = 0.12 + q * 0.76;
      const i = Math.round(qq * pocet);
      const p = B[i], n = N[i];
      const w = (ven(qq) + dovnitr(qq)) * 0.5;
      const smer = Math.atan2(B[Math.min(pocet, i + 1)][1] - B[Math.max(0, i - 1)][1], B[Math.min(pocet, i + 1)][0] - B[Math.max(0, i - 1)][0]);
      const sp = [];
      for (let j = 0; j <= 16; j++) {
        const u = j / 16;
        const a = smer + Math.PI + u * Math.PI * 2.3;
        const r = w * 0.62 * (1 - u * 0.75);
        sp.push([p[0] + n[0] * (w * 0.12) - Math.cos(smer) * (1 - u) * w * 1.2 + Math.cos(a) * r, p[1] + n[1] * (w * 0.12) - Math.sin(smer) * (1 - u) * w * 1.2 + Math.sin(a) * r]);
      }
      viry += `<path d="${hladka(sp)}" stroke="#FFFFFF" stroke-width="0.9" stroke-linecap="round" fill="none" opacity="${f(0.55 * Math.sin(Math.PI * q))}"/>`;
    }
    s += viry + `</g>`;
    const svetloB = B.map((p, i) => [p[0] + N[i][0] * ven(i / pocet) * 0.55, p[1] + N[i][1] * ven(i / pocet) * 0.55]);
    s += `<path d="${hladka(svetloB.slice(5, -5))}" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round" fill="none" opacity="0.8"/>`;
    /* záhyby: u pěstí nahusto a podél (hedvábí je tam stažené), nahoře příčné vlny */
    let zahyby = "";
    const pricny = (s0, k) => {
      const i = Math.round(s0 * pocet);
      const p = B[i], n = N[i];
      const t0 = [-n[1], n[0]];
      const a = [p[0] + n[0] * ven(s0) * 0.92, p[1] + n[1] * ven(s0) * 0.92];
      const b = [p[0] - n[0] * dovnitr(s0) * k, p[1] - n[1] * dovnitr(s0) * k];
      const c = [lerp(a[0], b[0], 0.5) + t0[0] * ven(s0) * 0.55, lerp(a[1], b[1], 0.5) + t0[1] * ven(s0) * 0.55];
      return `M${pt(a)} Q${pt(c)} ${pt(b)} `;
    };
    for (const [s0, k] of [[0.16, 0.2], [0.27, 0.5], [0.38, 0.1], [0.5, 0.45], [0.61, 0.15], [0.72, 0.55], [0.84, 0.25]]) zahyby += pricny(s0 + 0.012 * Math.sin(st.t * 1.4 + s0 * 20), k);
    for (const kraj of [0, 1]) {
      for (const q of [-0.5, 0, 0.45]) {
        const body = [];
        for (let j = 0; j <= 6; j++) {
          const s0 = kraj ? 1 - j * 0.022 : j * 0.022;
          const i = Math.round(s0 * pocet);
          const w = q > 0 ? ven(s0) * q : dovnitr(s0) * q;
          body.push([B[i][0] + N[i][0] * w, B[i][1] + N[i][1] * w]);
        }
        zahyby += hladka(body) + " ";
      }
    }
    s += `<path d="${zahyby}" stroke="#7E7262" stroke-width="0.55" stroke-linecap="round" fill="none" opacity="0.75"/>`;
    return s;
  };
  /** Konec vaku pod pěstí: krček, šňůra, a buď stažený volán, nebo rozevřené ústí. */
  const konecVaku = (st, strana) => {
    const H = RUCE[strana];
    const u = smerKonce(st, strana);
    const n = [-u[1], u[0]];
    const P = st.poryv;
    const otevreno = P && P.strana === strana ? P.otevreno : 0;
    const T = [H[0] + u[0] * 8.5, H[1] + u[1] * 8.5];
    const krcek = [H, [H[0] + u[0] * 4, H[1] + u[1] * 4], T];
    let s = `<path d="${pasPoBodech(krcek, (q) => lerp(5.6, 3, q))}" fill="url(#by1-hedvabi)" stroke="#6E6252" stroke-width="0.7"/>`;
    /* volán za uzlem: stažená látka se rozvírá do kytičky, při poryvu do trychtýře */
    const delka = lerp(6.2, 10, otevreno), sir = lerp(8.4, 16, otevreno);
    const E = [T[0] + u[0] * delka, T[1] + u[1] * delka];
    const okraj = [];
    const vln = Math.round(lerp(5, 3, otevreno));
    for (let i = 0; i <= vln * 2; i++) {
      const q = i / (vln * 2) - 0.5;
      const hl = i % 2 ? 0.82 : 1;
      okraj.push([E[0] + n[0] * sir * q - u[0] * (1 - hl) * delka, E[1] + n[1] * sir * q - u[1] * (1 - hl) * delka]);
    }
    s += `<path d="M${pt(T)} L${cara(okraj).slice(1)} Z" fill="url(#by1-hedvabi)" stroke="#6E6252" stroke-width="0.7" stroke-linejoin="round"/>`;
    if (otevreno > 0.05) {
      const rot = `rotate(${f((Math.atan2(n[1], n[0]) * 180) / Math.PI)} ${f(E[0] - u[0] * 0.6)} ${f(E[1] - u[1] * 0.6)})`;
      s += `<ellipse cx="${f(E[0] - u[0] * 0.6)}" cy="${f(E[1] - u[1] * 0.6)}" rx="${f(sir * 0.47)}" ry="${f(1.8 + 2.8 * otevreno)}" transform="${rot}" fill="#C4432B" stroke="#6E6252" stroke-width="0.6" opacity="${f(otevreno)}"/>`;
      s += `<ellipse cx="${f(E[0] - u[0] * 1.1)}" cy="${f(E[1] - u[1] * 1.1)}" rx="${f(sir * 0.3)}" ry="${f(1 + 1.6 * otevreno)}" transform="${rot}" fill="#6E2416" opacity="${f(0.85 * otevreno)}"/>`;
    }
    s += `<path d="M${pt([T[0] + u[0] * 1.6, T[1] + u[1] * 1.6])} L${pt([E[0] - n[0] * sir * 0.18, E[1] - n[1] * sir * 0.18])} M${pt([T[0] + u[0] * 1.6, T[1] + u[1] * 1.6])} L${pt([E[0] + n[0] * sir * 0.22, E[1] + n[1] * sir * 0.22])}" stroke="#7E7262" stroke-width="0.5" opacity="0.7"/>`;
    /* rumělková šňůra kolem krčku a dva konce se střapci */
    s += `<path d="M${pt([T[0] - n[0] * 2.4, T[1] - n[1] * 2.4])} L${pt([T[0] + n[0] * 2.4, T[1] + n[1] * 2.4])}" stroke="#8E2A1A" stroke-width="2.6" stroke-linecap="round"/>`;
    s += `<path d="M${pt([T[0] - n[0] * 2.4, T[1] - n[1] * 2.4])} L${pt([T[0] + n[0] * 2.4, T[1] + n[1] * 2.4])}" stroke="#C4432B" stroke-width="1.7" stroke-linecap="round"/>`;
    const vx = st.vitrUVaku[0] / 90;
    [-1, 1].forEach((k, j) => {
      const tah = [];
      let x = T[0] + n[0] * k * 1.6, y = T[1] + n[1] * k * 1.6;
      let a = Math.PI / 2 - vx * 0.7 - k * 0.25 + 0.2 * Math.sin(st.t * 2.2 + j * 1.7 + (strana === "L" ? 0 : 2));
      for (let i = 0; i <= 7; i++) {
        tah.push([x, y]);
        a += 0.08 * Math.sin(st.t * 3.1 + i * 0.9 + j) - vx * 0.05;
        x += Math.cos(a) * 2;
        y += Math.sin(a) * 2;
      }
      s += `<path d="${hladka(tah)}" stroke="#C4432B" stroke-width="1.05" stroke-linecap="round" fill="none"/>`;
      const [kx, ky] = tah[tah.length - 1];
      const ka = Math.atan2(tah[7][1] - tah[6][1], tah[7][0] - tah[6][0]);
      s += `<g transform="translate(${f(kx)} ${f(ky)}) rotate(${f((ka * 180) / Math.PI - 90)})"><circle r="1.5" fill="#D6A23A" stroke="#8A5E1A" stroke-width="0.4"/><path d="M-1.5 1 L-2 6.6 L2 6.6 L1.5 1 Z" fill="#C4432B"/><path d="M-0.9 2 V6.2 M0 2 V6.4 M0.9 2 V6.2" stroke="#8E2A1A" stroke-width="0.3"/></g>`;
    });
    return s;
  };

  /* ——— Vrstvy ——— */
  const vrstvaStin = (st) => {
    const vyska = clamp((st.fig.y + st.bob) / 20, -1, 1);
    return `<ellipse cx="${f(B0[0] + st.fig.x * 0.9)}" cy="171.4" rx="${f(24 * (1 - vyska * 0.12))}" ry="3.6" fill="#6B5D4F" opacity="${f(0.15 + vyska * 0.03)}"/>`;
  };
  const vrstvaSatek = (st) => {
    let s = "";
    for (const strana of ["L", "P"]) {
      const B = vzorkuj(st.satek[strana].map((p) => [p.x, p.y]), 4);
      const n = B.length;
      const N = normaly(B);
      const strany = [];
      for (let i = 0; i < n; i++) {
        const q = i / (n - 1);
        const zkrut = Math.cos(Math.PI * 1.5 * q + 0.9 * Math.sin(st.t * 1.3 + q * 3 + (strana === "L" ? 0 : 1.7)) + (strana === "L" ? 0.4 : 2.2));
        const w = (9.5 - 6 * q) * (Math.abs(zkrut) * 0.78 + 0.22) * 0.5;
        strany.push({ l: [B[i][0] + N[i][0] * w, B[i][1] + N[i][1] * w], r: [B[i][0] - N[i][0] * w, B[i][1] - N[i][1] * w], lic: zkrut >= 0 });
      }
      let start = 0;
      for (let i = 1; i <= n; i++) {
        if (i === n || strany[i].lic !== strany[start].lic) {
          const kus = strany.slice(start, Math.min(n, i + 1));
          const d = `${cara(kus.map((k) => k.l))} L${kus.map((k) => pt(k.r)).reverse().join(" L")} Z`;
          s += `<path d="${d}" fill="${strany[start].lic ? "url(#by1-satek)" : "url(#by1-satek-rub)"}" stroke="#4F6E5C" stroke-width="0.35" stroke-linejoin="round"/>`;
          start = i;
        }
      }
    }
    return s;
  };
  const vrstvaVak = (st) => vak(st);
  const vrstvaTelo = () => vPostave(bubTelo("by1"));
  const vrstvaFilm = (st) => vPostave(`<g clip-path="url(#by1-bublina)" mask="url(#by1-film-maska)" opacity="0.34">${filmPruhy(st, st.film)}</g>`);
  const vrstvaLesk = () => vPostave(bubLesk());
  const vrstvaTvar = (st) => vPostave(bubTvar("by1", { dx: st.pohled[0], dy: st.pohled[1], mrk: st.mrk, vyraz: st.vyraz, tvare: 0.42 }));
  const vrstvaRuce = (st) => {
    let s = "";
    for (const strana of ["L", "P"]) s += ruckaB(RAMENA[strana], RUCE[strana], { ohyb: strana === "L" ? -1 : 1, pest: false });
    s += konecVaku(st, "L") + konecVaku(st, "P");
    /* pěsti navrch: svírají krček vaku, prsty přes látku */
    for (const strana of ["L", "P"]) {
      const [x, y] = RUCE[strana];
      const k = strana === "L" ? 1 : -1;
      const u = smerKonce(st, strana);
      const a = (Math.atan2(u[1], u[0]) * 180) / Math.PI - 90;
      s += `<g transform="translate(${f(x)} ${f(y + 1)}) rotate(${f(a * 0.5)})">` +
        `<ellipse rx="5.2" ry="4.6" fill="#F1E7D7" stroke="#6B5D4F" stroke-width="0.9"/>` +
        `<path d="M${f(-2.6 * k)} -3.2 Q${f(-0.6 * k)} -0.6 ${f(-2.8 * k)} 1.8 M${f(-0.4 * k)} -3.8 Q${f(1.6 * k)} -1 ${f(-0.2 * k)} 2.6 M${f(2.2 * k)} -3.2 Q${f(3.8 * k)} -0.8 ${f(2.4 * k)} 2.2" stroke="#8A7A69" stroke-width="0.6" stroke-linecap="round" fill="none"/>` +
        `<path d="M${f(4.4 * k)} -1.4 q${f(1.2 * k)} 2.6 ${f(-1.6 * k)} 3.8" stroke="#6B5D4F" stroke-width="0.7" stroke-linecap="round" fill="none"/></g>`;
    }
    return s;
  };
  const vrstvaOnibi = (vpredu) => (st) =>
    st.onibi
      .filter((o) => !!o.vpredu === vpredu)
      .map((o) => plaminek(o.x, o.y, o.smer, { id: "by1", r: vpredu ? 4.4 : 3.6, delka: (vpredu ? 14 : 11.5) + o.rychlost * 0.05, t: st.t, fz: o.fz, sila: (vpredu ? 0.95 : 0.7) + 0.08 * Math.sin(st.t * 5 + o.fz) }))
      .join("");
  const vrstvaListi = (st) =>
    st.listy
      .map((l) => {
        const op = clamp(Math.min(l.vek / 0.15, (l.zivot - l.vek) / 0.6));
        if (op <= 0.01) return "";
        const sx = Math.cos(l.flip);
        const [lic, rub] = BARVY_LISTU[l.barva];
        return `<path d="${LIST_D}" transform="translate(${f(l.x)} ${f(l.y)}) rotate(${f(l.rot)}) scale(${f(l.vel * (Math.abs(sx) * 0.85 + 0.15) * Math.sign(sx || 1))} ${f(l.vel)})" fill="${sx >= 0 ? lic : rub}" stroke="${rub}" stroke-width="${f(0.5 / l.vel)}" stroke-linejoin="round" opacity="${f(op)}"/>`;
      })
      .join("");
  const vrstvaTahy = (vpredu) => (st) =>
    st.tahy
      .filter((q) => q.vpredu === vpredu)
      .map((q) => {
        const u = q.vek / q.zivot;
        const s1 = clamp(u / 0.45), s0 = clamp((u - 0.35) / 0.65);
        if (s1 - s0 < 0.02) return "";
        const B = q.body;
        const i0 = Math.floor(s0 * (B.length - 1)), i1 = Math.ceil(s1 * (B.length - 1));
        const kus = B.slice(i0, i1 + 1);
        if (kus.length < 2) return "";
        return `<path d="${pasPoBodech(kus, (s) => q.w * Math.pow(Math.sin(Math.PI * clamp(s * 0.92 + 0.04)), 0.7))}" fill="${q.barva}" opacity="${f(q.op * (1 - smooth((u - 0.8) / 0.2)))}"/>`;
      })
      .join("");

  const defs = () =>
    bubDefs("by1", { pruhledna: 0.42 }) +
    onibiDefs("by1") +
    `<linearGradient id="by1-hedvabi" gradientUnits="userSpaceOnUse" x1="40" y1="14" x2="134" y2="96"><stop offset="0" stop-color="#FFFDF8"/><stop offset="0.55" stop-color="#F3EDE0"/><stop offset="1" stop-color="#DCD3C1"/></linearGradient>` +
    `<pattern id="by1-kanoko" width="4.2" height="4.2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect x="1" y="1" width="2.2" height="2.2" rx="0.7" fill="none" stroke="#4F6A96" stroke-width="0.42"/><circle cx="2.1" cy="2.1" r="0.32" fill="#4F6A96"/></pattern>` +
    `<linearGradient id="by1-satek" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#A9C9B2"/><stop offset="1" stop-color="#7FA48D"/></linearGradient>` +
    `<linearGradient id="by1-satek-rub" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#D5E5D6"/><stop offset="1" stop-color="#B5CDB9"/></linearGradient>`;

  /* ——— Simulace ——— */
  const novyList = (dyn, R, x, y, vx, vy) => {
    dyn.listy.push({ x, y, vx, vy, rot: R() * 360, vrot: (R() - 0.5) * 400, flip: R() * 6.28, vflip: 2 + R() * 5, vel: 6.4 + R() * 3.4, barva: Math.floor(R() * BARVY_LISTU.length), vek: 0, zivot: 3.5 + R() * 2.5 });
  };
  const novyTah = (dyn, R, x, y, a, { L = 30 + R() * 22, vpredu = R() < 0.5, w = 1.1 + R() * 0.7, zivot = 1.4 + R() * 0.8, op = 0.5 } = {}) => {
    const toc = (R() < 0.5 ? 1 : -1) * (0.36 + R() * 0.2);
    dyn.tahy.push({ body: tahVetru({ x, y, a, L, toc, ohyb: (R() - 0.5) * 0.02 }), vek: 0, zivot, w, vpredu, barva: R() < 0.7 ? "#5E7FA8" : "#8FA8C4", op });
  };
  const naplanujPoryv = (dyn, t, cil) => {
    const fig = dyn.fig;
    const c = doSveta(fig, B0);
    const strana = cil[0] < c[0] ? "L" : "P";
    dyn.poryv = { t0: t, cil, strana, vypusten: null, miri: 0, otevreno: 0, sila: 1, smer: [0, 1], smerPostava: [0, 1], usti: [0, 0] };
  };
  const krok = (dyn, t, dt, vstup) => {
    const R2 = dyn.nahoda;
    const fig = dyn.fig;
    /* vějíř: rychlost myši se přenese do větru kolem kurzoru */
    if (vstup.mys) {
      if (dyn.mysPred) {
        const vx = (vstup.mys.x - dyn.mysPred.x) / Math.max(dt, 1 / 120), vy = (vstup.mys.y - dyn.mysPred.y) / Math.max(dt, 1 / 120);
        const F = dyn.fan;
        F.vx = kCili(F.vx, clamp(vx, -900, 900), dt, 0.08);
        F.vy = kCili(F.vy, clamp(vy, -900, 900), dt, 0.08);
        F.x = vstup.mys.x;
        F.y = vstup.mys.y;
        F.sila = Math.max(F.sila * Math.exp(-dt / 0.4), clamp(Math.hypot(vx, vy) / 300));
      }
      dyn.mysPred = { ...vstup.mys };
    } else {
      dyn.mysPred = null;
      dyn.fan.sila *= Math.exp(-dt / 0.3);
    }
    /* kliknutí: poryv na kurzor; kdo ťukne přímo do ní, toho jen vysměje a zhoupne se jako želé */
    if (vstup.kliky && vstup.kliky.length) {
      const k = vstup.kliky[vstup.kliky.length - 1];
      vstup.kliky.length = 0;
      const c = doSveta(fig, B0);
      if (Math.hypot(k.x - c[0], k.y - c[1]) < R) {
        dyn.boing = t;
        dyn.zvuk.push({ druh: "boing", sila: 1, pan: clamp((c[0] - 90) / 80, -1, 1) });
        dyn.zvuk.push({ druh: "smich", sila: 0.7, pan: clamp((c[0] - 90) / 80, -1, 1), za: 0.2 });
      } else if (!dyn.poryv || t - dyn.poryv.t0 > 1.3) naplanujPoryv(dyn, t, [k.x, k.y]);
    }
    if (!dyn.poryv && t > dyn.dalsiSamo) {
      const c = doSveta(fig, B0);
      const vpravo = t < 2 ? false : R2() < 0.5;
      naplanujPoryv(dyn, t, t < 2 ? [c[0] - 85, c[1] + 6] : [c[0] + (vpravo ? 80 : -80), c[1] - 30 - R2() * 40]);
      dyn.poryv.sila = 0.8;
    }
    const P = dyn.poryv;
    if (P) {
      const u = t - P.t0;
      const H = RUCE[P.strana];
      const usti = doSveta(fig, H);
      let sm = [P.cil[0] - usti[0], P.cil[1] - usti[1]];
      const ds = Math.hypot(sm[0], sm[1]) || 1;
      sm = [sm[0] / ds, sm[1] / ds];
      if (P.vypusten == null) {
        P.miri = smooth(u / 0.32);
        P.smer = sm;
        const c = Math.cos(rad(-fig.r)), s = Math.sin(rad(-fig.r));
        P.smerPostava = [sm[0] * c - sm[1] * s, sm[0] * s + sm[1] * c];
        if (u > 0.4) {
          P.vypusten = t;
          P.usti = [usti[0] + sm[0] * 12, usti[1] + sm[1] * 12];
          dyn.zvuk.push({ druh: "fuk", sila: P.sila, pan: clamp((usti[0] - 90) / 80, -1, 1) });
          dyn.zvuk.push({ druh: "plach", sila: 0.8, pan: clamp((usti[0] - 90) / 80, -1, 1), za: 0.05 });
          /* zpětný ráz: vítr ven, Bublinka na druhou stranu, a trochu se zatočí */
          fig.vx -= sm[0] * 46 * P.sila;
          fig.vy -= sm[1] * 30 * P.sila;
          fig.vr += (P.strana === "L" ? 1 : -1) * 70 * P.sila;
          dyn.nafoukV -= 4.5;
          for (let i = 0; i < Math.round(24 * P.sila); i++) {
            const a = Math.atan2(sm[1], sm[0]) + (R2() - 0.5) * 1.3;
            const v = 40 + R2() * 120;
            novyList(dyn, R2, P.usti[0] + (R2() - 0.5) * 4, P.usti[1] + (R2() - 0.5) * 4, Math.cos(a) * v, Math.sin(a) * v);
          }
          for (let i = 0; i < 5; i++) {
            const a = Math.atan2(sm[1], sm[0]) + (R2() - 0.5) * 0.5;
            novyTah(dyn, R2, P.usti[0] + sm[0] * (4 + i * 8) + (R2() - 0.5) * 10, P.usti[1] + sm[1] * (4 + i * 8) + (R2() - 0.5) * 10, a, { L: 34 + R2() * 26, w: 1.5 + R2() * 0.8, zivot: 1 + R2() * 0.5, vpredu: true, op: 0.62 });
          }
        }
      } else {
        P.miri = 1 - smooth((t - P.vypusten - 0.9) / 0.6);
        P.otevreno = smooth((t - P.vypusten) / 0.08) * (1 - smooth((t - P.vypusten - 0.9) / 0.5));
        if (t - P.vypusten > 1.6) {
          dyn.poryv = null;
          dyn.poslPoryv = t;
          dyn.dalsiSamo = t + 8 + R2() * 4;
        }
      }
      if (P.vypusten == null) P.otevreno = 0;
    }
    /* vak: tlak roste, když ho mačká, pak splaskne a pomalu se nafoukne zpátky */
    const cilNafouk = P && P.vypusten == null ? 1 + 0.18 * smooth((t - P.t0) / 0.35) : 1;
    const ak = 26 * (cilNafouk - dyn.nafouk) - 5.5 * dyn.nafoukV;
    dyn.nafoukV += ak * dt;
    dyn.nafouk = clamp(dyn.nafouk + dyn.nafoukV * dt, 0.18, 1.3);
    /* uhýbání: kurzor ji odstrkuje, pružina vrací doprostřed */
    let cil = [0, 0];
    const c = doSveta(fig, B0);
    if (vstup.mys) {
      const dx = c[0] - vstup.mys.x, dy = c[1] - vstup.mys.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < 62) {
        const tlak = (62 - d) / 62;
        cil = [clamp(fig.x + (dx / d) * tlak * 40, -30, 30), clamp(fig.y + (dy / d) * tlak * 26, -3, 18)];
      }
      dyn.blizko = d < 40 ? dyn.blizko + dt : Math.max(0, dyn.blizko - dt * 2);
    } else dyn.blizko = Math.max(0, dyn.blizko - dt * 2);
    if (dyn.blizko > 0.7 && t - dyn.akanbe > 3) {
      dyn.akanbe = t;
      dyn.zvuk.push({ druh: "bleee", sila: 0.7, pan: clamp((c[0] - 90) / 80, -1, 1) });
    }
    const kx = 16, cx = 2 * Math.sqrt(kx) * 0.55;
    fig.vx += (kx * (cil[0] - fig.x) - cx * fig.vx) * dt;
    fig.vy += (kx * (cil[1] - fig.y) - cx * fig.vy) * dt;
    fig.x += fig.vx * dt;
    fig.y += fig.vy * dt;
    fig.vr += (-14 * fig.r - 3.2 * fig.vr) * dt;
    fig.r += fig.vr * dt;
    /* šátek: dva ocásky (Verlet), vítr a lehká gravitace — je z hedvábí */
    for (const strana of ["L", "P"]) {
      const T = dyn.satek[strana];
      const A = doSveta(fig, [B0[0] + (strana === "L" ? -1 : 1) * R * 0.97, B0[1] + 4]);
      const pod = 3;
      const h = dt / pod;
      for (let k = 0; k < pod; k++) {
        T[0].x = A[0];
        T[0].y = A[1];
        T[0].px = A[0];
        T[0].py = A[1];
        for (let i = 1; i < T.length; i++) {
          const p = T[i];
          const vx = (p.x - p.px) / Math.max(h, 1e-4), vy = (p.y - p.py) / Math.max(h, 1e-4);
          const [wx, wy] = vitrV(dyn, t, p.x, p.y);
          /*
            Nebeský šátek tennin se drží ve vzduchu: slabá tíže a měkká
            pružina k tvaru esa (vyletí do strany, zvedne se a spadne),
            přes to běží vlna. Vítr ho z tvaru vychýlí, pružina vrací.
          */
          const q = i / (T.length - 1), k = strana === "L" ? -1 : 1;
          const tvarX = A[0] + k * (4 + 58 * q) + 6 * Math.sin(t * 0.8 + q * 3);
          const tvarY = A[1] - 14 * Math.sin(Math.PI * q * 1.15) + 30 * q * q;
          const flut = 26 * Math.sin(t * 3.6 - i * 0.62 + (strana === "L" ? 0 : 2));
          const ax = (wx - vx) * 1.1 + (tvarX - p.x) * 7 + flut * 0.25, ay = (wy - vy) * 1.1 + (tvarY - p.y) * 7 + 4 + flut;
          const nx = p.x + (p.x - p.px) * 0.985 + ax * h * h, ny = p.y + (p.y - p.py) * 0.985 + ay * h * h;
          p.px = p.x;
          p.py = p.y;
          p.x = nx;
          p.y = ny;
        }
        for (let it = 0; it < 5; it++) {
          for (let i = 1; i < T.length; i++) {
            const a = T[i - 1], b = T[i];
            const dx = b.x - a.x, dy = b.y - a.y;
            const d = Math.hypot(dx, dy) || 1e-4;
            const roz = (d - 4.5) / d;
            if (i === 1) {
              b.x -= dx * roz;
              b.y -= dy * roz;
            } else {
              a.x += dx * roz * 0.5;
              a.y += dy * roz * 0.5;
              b.x -= dx * roz * 0.5;
              b.y -= dy * roz * 0.5;
            }
          }
        }
      }
    }
    /* listí */
    dyn.akum += dt * 0.32;
    while (dyn.akum >= 1) {
      dyn.akum -= 1;
      novyList(dyn, R2, -8, 30 + R2() * 110, 20 + R2() * 20, (R2() - 0.5) * 10);
    }
    let sumListi = 0;
    for (const l of dyn.listy) {
      l.vek += dt;
      const [wx, wy] = vitrV(dyn, t, l.x, l.y);
      const kOd = 1.7;
      /* list se ve vzduchu kolébá: vztlak střídá strany, jak se otáčí */
      l.vx += ((wx - l.vx) * kOd + Math.sin(l.vek * 3 + l.flip) * 26 + Math.sin(l.y * 0.05 + t * 0.7) * 14) * dt;
      l.vy += ((wy - l.vy) * kOd + 16 + Math.cos(l.vek * 2.4 + l.rot) * 14 + Math.cos(l.x * 0.05 - t * 0.6) * 12) * dt;
      l.x += l.vx * dt;
      l.y += l.vy * dt;
      l.rot += l.vrot * dt;
      l.flip += l.vflip * dt * (1 + Math.hypot(l.vx, l.vy) / 120);
      sumListi += Math.hypot(l.vx, l.vy);
    }
    dyn.listy = dyn.listy.filter((l) => l.vek < l.zivot && l.x > -30 && l.x < 210 && l.y > -30 && l.y < 210);
    dyn.sumListi += dt * sumListi * 0.004;
    while (dyn.sumListi >= 1) {
      dyn.sumListi -= 1;
      dyn.zvuk.push({ druh: "list", sila: 0.4 + R2() * 0.4, pan: (R2() - 0.5) * 1.4 });
    }
    /* tahy větru: občas kolem, ve směru vánku */
    dyn.akumTahu += dt * (0.55 + dyn.fan.sila * 3);
    while (dyn.akumTahu >= 1) {
      dyn.akumTahu -= 1;
      const x = 6 + R2() * 130, y = 20 + R2() * 140;
      const c = doSveta(fig, B0);
      const [wx, wy] = vitrV(dyn, t, x, y);
      const a = Math.atan2(wy, wx) + (R2() - 0.5) * 0.3;
      /* přes Bublinku ne — prosvítal by jí přes obličej jako škrábanec */
      const bok = Math.abs((c[0] - x) * Math.sin(a) - (c[1] - y) * Math.cos(a));
      const pred = (c[0] - x) * Math.cos(a) + (c[1] - y) * Math.sin(a);
      if (!(bok < R + 6 && pred > -10 && pred < 70)) novyTah(dyn, R2, x, y, a);
    }
    for (const q of dyn.tahy) q.vek += dt;
    dyn.tahy = dyn.tahy.filter((q) => q.vek < q.zivot);
    /* bludičky: kroužek kolem ní, vítr je odfukuje, pružina vrací */
    const cc = doSveta(fig, [B0[0], B0[1] - 6]);
    dyn.onibi.forEach((o, i) => {
      const a = t * 0.42 + o.fz;
      o.vpredu = Math.sin(a) > 0;
      const cilX = cc[0] + Math.cos(a) * 60, cilY = cc[1] + 10 + Math.sin(a) * 22;
      const [wx, wy] = vitrV(dyn, t, o.x, o.y);
      o.vx += (9 * (cilX - o.x) - 4.2 * o.vx + wx * 1.4) * dt;
      o.vy += (9 * (cilY - o.y) - 4.2 * o.vy + wy * 1.4 - 2) * dt;
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      o.rychlost = Math.hypot(o.vx, o.vy);
      /* ocásek proti pohybu a vzhůru, jak hoří plamen */
      const tx = -o.vx * 0.04, ty = -o.vy * 0.04 - 1;
      const cilSmer = Math.atan2(ty, tx);
      let d = cilSmer - o.smer;
      while (d > Math.PI) d -= 2 * Math.PI;
      while (d < -Math.PI) d += 2 * Math.PI;
      o.smer += d * (1 - Math.exp(-dt / 0.12));
    });
    /* pohled: na kurzor, při poryvu za listím, jinak bloumá */
    let kam = null;
    if (P) kam = P.cil;
    else if (vstup.mys) kam = [vstup.mys.x, vstup.mys.y];
    else kam = [90 + Math.sin(t * 0.3) * 60, 100 + Math.sin(t * 0.21) * 30];
    const tv = doSveta(fig, [B0[0], B0[1] - 4]);
    const cp = [clamp((kam[0] - tv[0]) / 40, -1, 1) * 2.2, clamp((kam[1] - tv[1]) / 40, -1, 1) * 1.6];
    dyn.pohled = dyn.pohled.map((q, i) => kCili(q, cp[i], dt, 0.12));
  };

  const stav = (t, vstup = {}, dyn) => {
    const d = dyn || novaDynamika();
    const P = d.poryv;
    let vyraz = "smug";
    if (P && P.vypusten == null) vyraz = "fuk";
    else if (P && t - P.vypusten < 1.5) vyraz = "smich";
    else if (t - d.boing < 0.9) vyraz = "smich";
    else if (t - d.boing < 2.2) vyraz = "akanbe";
    else if (t - d.akanbe < 1.6) vyraz = "akanbe";
    else if (t - d.poslPoryv < 0.4) vyraz = "smich";
    const bob = 2.4 * Math.sin(t * 1.25);
    const vitrUVaku = vitrV(d, t, 90, 40);
    /* želé: tlumené kmitání do šířky a do výšky, objem zůstává */
    const ub = t - d.boing;
    const zele = ub >= 0 && ub < 1.6 ? 0.16 * Math.exp(-ub * 3.2) * Math.sin(ub * 24) : 0;
    const fig = { x: d.fig.x, y: d.fig.y + bob, r: d.fig.r + 1.6 * Math.sin(t * 0.9), sx: 1 + zele, sy: 1 / (1 + zele) };
    return {
      t, fig, bob, nafouk: d.nafouk, poryv: P, vitrUVaku, kyv: clamp(vitrUVaku[0] / 22, -5, 5) + 1.2 * Math.sin(t * 1.1) - d.fig.vx * 0.05,
      trepot: clamp((Math.abs(vitrUVaku[0]) - 10) / 40), satek: d.satek, listy: d.listy, tahy: d.tahy,
      onibi: d.onibi, pohled: d.pohled, mrk: mrkani(t, [1.7, 4.9, 5.12, 8.3], 9.5), vyraz,
      film: {
        od: 300 + 140 * Math.sin(t * 0.11) + 60 * Math.sin(t * 0.23),
        krokNm: 32,
        vlna: 2.2,
        viry: [
          { x: 90 + 20 * Math.sin(t * 0.31), y: 82 + 14 * Math.sin(t * 0.43 + 1), r: 22, s: 1.9 * Math.sin(t * 0.37) + d.fig.vr * 0.01 },
          { x: 74 + 16 * Math.sin(t * 0.27 + 2), y: 108 + 12 * Math.sin(t * 0.33), r: 18, s: -1.6 * Math.sin(t * 0.29 + 1) - d.fig.vx * 0.02 },
          { x: 108 + 12 * Math.sin(t * 0.41 + 4), y: 104 + 16 * Math.sin(t * 0.25 + 3), r: 20, s: 1.4 * Math.sin(t * 0.35 + 2.4) },
        ],
      },
    };
  };
  const snimek = (st) => Math.floor(st.t * 30);
  const pohyb = (st) => ({ x: st.fig.x, y: st.fig.y, r: st.fig.r, ox: B0[0], oy: B0[1], sx: st.fig.sx, sy: st.fig.sy });

  return {
    id: "v1",
    viewBox: "0 0 180 180",
    defs,
    novaDynamika,
    krok,
    stav,
    hukot: (st) => clamp(0.12 + Math.abs(st.vitrUVaku[0]) / 90),
    klidne: { t: 1.95 },
    vrstvy: [
      { id: "stin", kresli: vrstvaStin, klic: snimek },
      { id: "tahy-vzadu", kresli: vrstvaTahy(false), klic: snimek },
      { id: "onibi-vzadu", kresli: vrstvaOnibi(false), klic: snimek },
      { id: "satek", kresli: vrstvaSatek, klic: snimek },
      { id: "vak", kresli: vrstvaVak, klic: snimek, pohyb },
      { id: "telo", kresli: vrstvaTelo, tezka: true, pohyb },
      { id: "film", kresli: vrstvaFilm, klic: (st) => Math.floor(st.t * 15), pohyb },
      { id: "lesk", kresli: vrstvaLesk, pohyb },
      { id: "tvar", kresli: vrstvaTvar, klic: (st) => `${f(st.pohled[0])},${f(st.pohled[1])},${f(st.mrk)},${st.vyraz}`, pohyb },
      { id: "ruce", kresli: vrstvaRuce, klic: snimek, pohyb },
      { id: "onibi", kresli: vrstvaOnibi(true), klic: snimek },
      { id: "listi", kresli: vrstvaListi, klic: snimek },
      { id: "tahy", kresli: vrstvaTahy(true), klic: snimek },
    ],
  };
})();

/**
 * Malá Bublinka do scény: tělo, blána, lesk a tvář najednou, posazená
 * středem na x/y s poloměrem r. Bez filtru tahu — hýbe se každý snímek.
 */
const malaBublinka = (id, st, { x, y, r, vyraz = "smug", pohled = [0, 0], mrk = 0, op = 1, sx = 1, sy = 1, film: fl = null, obrys = "#6B5D4F", lesk = 1 } = {}) => {
  const k = r / 46;
  let s = `<g transform="translate(${f(x)} ${f(y)}) scale(${f(k * sx)} ${f(k * sy)}) translate(-90 -96)"${op < 1 ? ` opacity="${f(op)}"` : ""}>`;
  s += `<circle cx="90" cy="96" r="46" fill="url(#${id}-telo)"/>`;
  if (fl) s += `<g clip-path="url(#${id}-bublina)" mask="url(#${id}-film-maska)" opacity="${f(fl.op ?? 0.34)}">${filmPruhy(st, fl)}</g>`;
  s += `<circle cx="90" cy="96" r="46" fill="none" stroke="${obrys}" stroke-width="${f(1.6 / Math.max(0.35, k * 2.2))}"/>`;
  s += bubLesk({ sila: lesk });
  s += bubTvar(id, { dx: pohled[0], dy: pohled[1], mrk, vyraz, tvare: 0.45 });
  return s + `</g>`;
};

/* ═══════════════════════════════════════════════════════════════════
 * 2 — JÓHEN
 * Jóhen tenmoku je nejvzácnější miska na světě: celé se zachovaly tři
 * a všechny jsou v Japonsku národním pokladem. Černá glazura je posetá
 * skvrnami a kolem každé se třpytí duhový prstenec — modrý, fialový,
 * zelený, podle toho, odkud se díváš. Říká se, že je v ní vesmír.
 *
 * Píše se 曜変 („zářící proměna“), ale původně 窯変 — „proměna v peci“:
 * něco, co se v ohni stane samo a nikdo to neumí zopakovat. Skvrny jsou
 * stopy po bublinách, které glazurou probublaly a praskly. Tedy Bublinka.
 * Jednou za čas jí raubířství vyjde na národní poklad.
 *
 * Miska má stříbrnou obruč fukurin a stojí na lakovém podstavci
 * tenmoku-dai v barvě negoro (rumělka prošoupaná do černé). Bludičky
 * svítí do misky jako lucerny: jedna jde za myší, druhá krouží. Kde se
 * jejich světlo odráží, prstence se rozzáří. Barva prstence záleží na
 * úhlu, pod kterým se na skvrnu díváš, a miska se pomalu otáčí, takže
 * skvrny cestou mění barvu; tažením myši do strany se roztočí, jako
 * když si ji při čajovém obřadu otáčíš v dlaních. Prstence počítá stejná
 * tenká vrstva jako blánu Bublinky.
 *
 * Kliknutí: Bublinka skočí do misky, glazura se rozžhaví jako v peci,
 * probublá, a kde bublina praskne, vykvete nová skvrna.
 *
 * Miska je spočítaná v prostoru (rotační plocha) a promítnutá kolmo
 * shora pod úhlem 56°. Pod tímhle úhlem je vidět celý vnitřek a vnější
 * stěna se schová pod okraj, takže kamera stojí a statické kusy se
 * kreslí jen jednou; hýbou se skvrny, světla a Bublinka.
 * ═══════════════════════════════════════════════════════════════════ */
const V2 = (() => {
  const S = 54;
  const E = 56;
  const cam = { se: Math.sin(rad(E)), ce: Math.cos(rad(E)) };
  cam.V = [0, -cam.ce, cam.se];
  const RIM_IN = 0.955, H = 0.62, ZB = 0.13;
  const C0 = [90, 86 + S * H * cam.ce];
  const sklon = (r) => 0.757 * Math.sqrt(clamp(r / RIM_IN));
  const zVnitrku = (r) => ZB + (H - 0.008 - ZB) * Math.pow(clamp(r / RIM_IN), 1.5);
  const promitni = (P) => [C0[0] + S * P[0], C0[1] - S * (P[1] * cam.se + P[2] * cam.ce)];
  const elipsa = (r, z) => {
    const [x, y] = promitni([0, 0, z]);
    return { cx: x, cy: y, rx: S * r, ry: S * r * cam.se };
  };
  const bodVnitrku = (r, phi) => [r * Math.cos(phi), r * Math.sin(phi), zVnitrku(r)];
  const normala = (r, phi) => {
    const s = sklon(r);
    const k = 1 / Math.sqrt(1 + s * s);
    return [-s * Math.cos(phi) * k, -s * Math.sin(phi) * k, k];
  };
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const norm = (a) => {
    const d = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / d, a[1] / d, a[2] / d];
  };
  /** Z obrazovky zpátky do prostoru ve výšce z. */
  const zObrazovky = (X, Y, z) => [(X - C0[0]) / S, ((C0[1] - Y) / S - z * cam.ce) / cam.se, z];
  const elAttr = (E2) => `cx="${f(E2.cx)}" cy="${f(E2.cy)}" rx="${f(E2.rx)}" ry="${f(E2.ry)}"`;
  /** Malá kružnice na ploše s normálou n se promítne na elipsu: osa ve směru normály se zkrátí. */
  const naPlose = (X, Y, n, a, nv, extra = "") => {
    const uhel = (Math.atan2(-(n[1] * cam.se + n[2] * cam.ce), n[0]) * 180) / Math.PI + 90;
    return `<ellipse rx="${f(a)}" ry="${f(a * nv)}" transform="translate(${f(X)} ${f(Y)}) rotate(${f(uhel)})" ${extra}/>`;
  };

  const OKRAJ = elipsa(1, H);
  const VNITREK = elipsa(RIM_IN, H - 0.008);
  const DNO = promitni([0, 0, ZB]);
  const MISKA_PODST = { lem: elipsa(1.12, -0.02), plocha: elipsa(1.045, -0.04), hrana: elipsa(1.12, -0.07) };

  /* Skvrny: shluky jako na misce Inaba, jednotlivé tečky mezi nimi a jemný olejový prach */
  const { SKVRNY, SHLUKY } = (() => {
    const R = rng(1236);
    const sk = [], sh = [];
    for (let c = 0; c < 12; c++) {
      const r0 = 0.24 + R() * 0.64, p0 = (c / 12) * Math.PI * 2 + R() * 0.5;
      const n = 5 + Math.floor(R() * 9);
      const dSh = R() < 0.78 ? 258 + R() * 40 : 430 + R() * 30;
      sh.push({ r: r0, phi: p0, a: 0.11 + n * 0.008, d: dSh });
      for (let i = 0; i < n; i++) {
        const r = clamp(r0 + (R() - 0.5) * 0.19, 0.08, 0.93);
        sk.push({ r, phi: p0 + ((R() - 0.5) * 0.24) / Math.max(0.3, r), a: 0.011 + R() * 0.017, d: dSh + (R() - 0.5) * 36, halo: 2.4 + R() * 1.5 });
      }
    }
    for (let i = 0; i < 24; i++) sk.push({ r: 0.1 + R() * 0.84, phi: R() * Math.PI * 2, a: 0.009 + R() * 0.01, d: 256 + R() * 44, halo: 2 + R() * 1.2 });
    return { SKVRNY: sk, SHLUKY: sh };
  })();
  const PRACH = (() => {
    const R = rng(77);
    return Array.from({ length: 90 }, () => ({ r: 0.1 + Math.sqrt(R()) * 0.84, phi: R() * Math.PI * 2, a: 0.0035 + R() * 0.0045 }));
  })();
  /* zlatý prach makie v pozadí */
  const ZLATO = (() => {
    const R = rng(4242);
    return Array.from({ length: 80 }, () => [8 + R() * 164, 8 + R() * 164, 0.25 + R() * 0.7, R() * 6.28, 0.6 + R() * 2.2]);
  })();

  /* ——— Statické kusy ——— */
  const POZADI_D = hrouda(90, 92, 86, 85, 31, { bodu: 30, kolisani: 0.05 });
  const vrstvaPozadi = () =>
    `<path d="${hrouda(90, 92, 89, 88, 17, { bodu: 30, kolisani: 0.06 })}" fill="#2E2944" opacity="0.5" filter="url(#by2-lem)"/>` +
    `<path d="${POZADI_D}" fill="url(#by2-noc)" filter="url(#by2-tus)"/>` +
    `<g clip-path="url(#by2-orez)">` +
    `<ellipse cx="90" cy="88" rx="80" ry="64" fill="url(#by2-aurora)"/>` +
    `<g fill="#D6A23A">${ZLATO.map(([x, y, r]) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 0.7)}" opacity="0.42"/>`).join("")}</g>` +
    `</g>`;
  const vrstvaZarePece = () => `<g clip-path="url(#by2-orez)"><ellipse cx="90" cy="96" rx="92" ry="80" fill="url(#by2-pec)"/></g>`;
  /**
   * Podstavec tenmoku-dai shora: široký talířek z laku negoro s vyvýšeným
   * lemem. Na lemu je rumělka prošoupaná do černé, uvnitř talířku leží
   * stín misky.
   */
  const vrstvaPodstavec = () => {
    const { lem, plocha, hrana } = MISKA_PODST;
    return (
      `<ellipse ${elAttr({ ...hrana, rx: hrana.rx + 3, ry: hrana.ry + 3, cy: hrana.cy + 3 })} fill="#05040A" opacity="0.6" filter="url(#by2-rozmaz)"/>` +
      `<ellipse ${elAttr(hrana)} fill="#1A0F0C"/>` +
      `<rect x="${f(lem.cx - lem.rx)}" y="${f(lem.cy)}" width="${f(lem.rx * 2)}" height="${f(hrana.cy - lem.cy)}" fill="#1A0F0C"/>` +
      `<ellipse ${elAttr(lem)} fill="url(#by2-negoro-lem)"/>` +
      `<ellipse ${elAttr(plocha)} fill="url(#by2-negoro)"/>` +
      /* prošoupaný lem: kde se drží v rukou, prosvítá černý spodní lak — skvrny podle šumu */
      `<ellipse ${elAttr({ ...lem, rx: lem.rx - 1.4, ry: lem.ry - 1.2 })} fill="none" stroke="#150C0A" stroke-width="3.4" mask="url(#by2-oser)"/>` +
      `<path d="M${f(lem.cx - lem.rx * 0.9)} ${f(lem.cy + lem.ry * 0.44)} A${f(lem.rx)} ${f(lem.ry)} 0 0 0 ${f(lem.cx + lem.rx * 0.55)} ${f(lem.cy + lem.ry * 0.84)}" stroke="#F4A88C" stroke-width="1.1" fill="none" opacity="0.6" stroke-linecap="round"/>` +
      /* stín misky v talířku */
      `<ellipse cx="${f(OKRAJ.cx + 3)}" cy="${f(OKRAJ.cy + OKRAJ.ry * 0.62)}" rx="${f(OKRAJ.rx * 0.9)}" ry="${f(OKRAJ.ry * 0.62)}" fill="#120806" opacity="0.75" filter="url(#by2-rozmaz)"/>`
    );
  };
  /** Okraj misky (hrana prosvítá do hněda — kaki) a černý vnitřek s tůňkou glazury na dně. */
  const vrstvaMiska = () =>
    `<path d="M${f(OKRAJ.cx - OKRAJ.rx)} ${f(OKRAJ.cy)} A${f(OKRAJ.rx)} ${f(OKRAJ.ry)} 0 0 0 ${f(OKRAJ.cx + OKRAJ.rx)} ${f(OKRAJ.cy)} L${f(OKRAJ.cx + OKRAJ.rx * 0.97)} ${f(OKRAJ.cy + 3)} A${f(OKRAJ.rx * 0.97)} ${f(OKRAJ.ry + 1.4)} 0 0 1 ${f(OKRAJ.cx - OKRAJ.rx * 0.97)} ${f(OKRAJ.cy + 3)} Z" fill="url(#by2-stena)"/>` +
    `<ellipse ${elAttr(OKRAJ)} fill="url(#by2-kaki)"/>` +
    `<ellipse ${elAttr(VNITREK)} fill="url(#by2-cerna)"/>` +
    `<ellipse cx="${f(DNO[0])}" cy="${f(DNO[1])}" rx="${f(S * 0.46)}" ry="${f(S * 0.46 * cam.se)}" fill="url(#by2-tunka)"/>` +
    `<g clip-path="url(#by2-vnitrek)">` +
    /* u hrany je glazura tenká a prosvítá rezavě; okraj vrhá dovnitř stín */
    `<ellipse ${elAttr(VNITREK)} fill="none" stroke="#6A3818" stroke-width="5" opacity="0.55" filter="url(#by2-rozmaz)"/>` +
    `<ellipse cx="${f(VNITREK.cx - 4)}" cy="${f(VNITREK.cy + 5)}" rx="${f(VNITREK.rx)}" ry="${f(VNITREK.ry)}" fill="none" stroke="#000000" stroke-width="7" opacity="0.5" filter="url(#by2-rozmaz)"/>` +
    `</g>`;
  /** Stříbrná obruč fukurin: kov na hraně, vzadu světlý, vpředu ve stínu. */
  const vrstvaObruc = () =>
    `<ellipse ${elAttr({ ...OKRAJ, rx: OKRAJ.rx - 0.6, ry: OKRAJ.ry - 0.55 })} fill="none" stroke="url(#by2-stribro)" stroke-width="1.35"/>` +
    `<path d="M${f(OKRAJ.cx - OKRAJ.rx * 0.97)} ${f(OKRAJ.cy - OKRAJ.ry * 0.22)} A${f(OKRAJ.rx - 0.6)} ${f(OKRAJ.ry - 0.55)} 0 0 1 ${f(OKRAJ.cx + OKRAJ.rx * 0.38)} ${f(OKRAJ.cy - OKRAJ.ry * 0.92)}" stroke="#FFFFFF" stroke-width="0.5" fill="none" opacity="0.8" stroke-linecap="round"/>`;
  /** Žhavá glazura: textura jako tekutý kov, ukáže se, když se miska rozpálí. */
  const vrstvaRoztavena = () =>
    `<g clip-path="url(#by2-vnitrek)">` +
    `<ellipse ${elAttr({ ...VNITREK, rx: VNITREK.rx + 4, ry: VNITREK.ry + 4 })} fill="url(#by2-zhava)"/>` +
    `<rect x="${f(VNITREK.cx - VNITREK.rx)}" y="${f(VNITREK.cy - VNITREK.ry)}" width="${f(VNITREK.rx * 2)}" height="${f(VNITREK.ry * 2)}" filter="url(#by2-lava)" opacity="0.6"/>` +
    `<ellipse cx="${f(DNO[0])}" cy="${f(DNO[1])}" rx="${f(S * 0.4)}" ry="${f(S * 0.4 * cam.se)}" fill="url(#by2-jadro)"/>` +
    `</g>`;

  /* ——— Živé kusy ——— */
  /** Kde se zrcadlí bod světla: normála vnitřku míří na půl cesty mezi světlo a oko. */
  const odlesk = (Lpos) => {
    let P = [0, 0, ZB + 0.15];
    let out = null;
    for (let i = 0; i < 3; i++) {
      const L = norm([Lpos[0] - P[0], Lpos[1] - P[1], Lpos[2] - P[2]]);
      const Hh = norm([L[0] + cam.V[0], L[1] + cam.V[1], L[2] + cam.V[2]]);
      const s = Math.hypot(Hh[0], Hh[1]) / Math.max(0.05, Hh[2]);
      const r = RIM_IN * (s / 0.757) ** 2;
      if (r > RIM_IN * 0.97) return null;
      const phi = Math.atan2(-Hh[1], -Hh[0]);
      P = bodVnitrku(r, phi);
      out = { P, r, phi };
    }
    return out;
  };
  const jasSkvrny = (P, n, svetla) => {
    let spec = 0;
    for (const l of svetla) {
      const L = norm([l.P[0] - P[0], l.P[1] - P[1], l.P[2] - P[2]]);
      const Hh = norm([L[0] + cam.V[0], L[1] + cam.V[1], L[2] + cam.V[2]]);
      spec += Math.pow(Math.max(0, dot(n, Hh)), 14) * l.sila;
    }
    return spec;
  };
  const vrstvaSkvrny = (st) => {
    const zakryto = clamp(st.zar * 1.5);
    if (zakryto > 0.99) return "";
    let mlha = "", halo = "", jadra = "", prach = "", jiskry = "";
    for (const sh of SHLUKY) {
      const phi = sh.phi + st.toc;
      const P = bodVnitrku(sh.r, phi), n = normala(sh.r, phi);
      const nv = dot(n, cam.V);
      const [X, Y] = promitni(P);
      const I = clamp(0.3 + 0.9 * jasSkvrny(P, n, st.svetla));
      mlha += naPlose(X, Y, n, sh.a * S, nv, `fill="${film(filmSikmo(sh.d, lerp(nv, 1, 0.5)))}" opacity="${f(0.2 * I)}"`);
    }
    const kresliSkvrnu = (sk, phi, dNm, sila) => {
      const P = bodVnitrku(sk.r, phi);
      const n = normala(sk.r, phi);
      const nv = dot(n, cam.V);
      if (nv <= 0.05) return;
      const spec = jasSkvrny(P, n, st.svetla);
      const I = clamp(0.3 + 1.15 * spec, 0, 1.2) * sila;
      if (I < 0.02) return;
      const [X, Y] = promitni(P);
      const a = sk.a * S;
      /* úhel mění barvu jen napůl — jinak by u přední stěny všechno zezlátlo */
      const dEf = filmSikmo(dNm, lerp(nv, 1, 0.5));
      halo += naPlose(X, Y, n, a * sk.halo, nv, `fill="${film(dEf)}" opacity="${f(clamp(I * 0.6))}"`);
      halo += naPlose(X, Y, n, a * sk.halo * 0.58, nv, `fill="${film(Math.max(0, dEf - 42))}" opacity="${f(clamp(I * 0.5))}"`);
      jadra += naPlose(X, Y, n, a * 0.62, nv, `fill="${mix("#A89C78", "#FFFBEE", clamp(I - 0.2))}" opacity="${f(clamp(0.45 + I * 0.55) * sila)}"`);
      if (spec * sila > 0.9) jiskry += `<path d="${jiskraD(a * 1.6)}" transform="translate(${f(X)} ${f(Y)}) rotate(${f(st.t * 30 + sk.phi * 57)})" fill="#FFFFFF" opacity="${f(clamp((spec * sila - 0.9) * 2.5))}"/>`;
    };
    for (const sk of SKVRNY) kresliSkvrnu(sk, sk.phi + st.toc, sk.d, 1);
    /* nové skvrny po bublinách: prstenec roste z nuly a barvy přejdou celou Newtonovou řadou */
    for (const sk of st.nove) {
      const k = smooth(sk.vek / 2.8);
      if (k <= 0.01) continue;
      kresliSkvrnu(sk, sk.phi + st.toc, sk.d * k, Math.min(1, sk.vek / 0.4) * (sk.mizi ?? 1));
    }
    for (const p of PRACH) {
      const phi = p.phi + st.toc;
      const P = bodVnitrku(p.r, phi), n = normala(p.r, phi);
      const nv = dot(n, cam.V);
      if (nv <= 0.05) continue;
      const [X, Y] = promitni(P);
      prach += `<ellipse cx="${f(X)}" cy="${f(Y)}" rx="${f(p.a * S)}" ry="${f(p.a * S * nv)}"/>`;
    }
    return (
      `<g opacity="${f(1 - zakryto)}">` +
      `<g fill="#BFB6A0" opacity="0.5">${prach}</g>` +
      `<g filter="url(#by2-mekce)">${mlha}${halo}</g>` +
      jadra + jiskry +
      `</g>`
    );
  };
  /** Odlesky bludiček na glazuře a záblesk na stříbrné obruči. */
  const vrstvaOdlesky = (st) => {
    let s = "", obruc = "";
    for (const l of st.svetla) {
      const o = odlesk(l.P);
      if (o) {
        const [X, Y] = promitni(o.P);
        const n = normala(o.r, o.phi);
        const nv = dot(n, cam.V);
        s += naPlose(X, Y, n, 12, nv * 0.7, `fill="url(#by2-odlesk)" opacity="${f(0.95 * l.sila)}"`);
        s += naPlose(X, Y, n, 1.9, nv * 0.6, `fill="#F4FAFF" opacity="${f(0.85 * l.sila)}"`);
      }
      /* obruč: na kterém místě kruhu míří normála kovu nejvíc mezi světlo a oko */
      let nej = -1, nejPhi = 0;
      for (let i = 0; i < 48; i++) {
        const phi = (i / 48) * Math.PI * 2;
        const P = [Math.cos(phi), Math.sin(phi), H];
        const n = norm([Math.cos(phi) * 0.8, Math.sin(phi) * 0.8, 0.6]);
        const L = norm([l.P[0] - P[0], l.P[1] - P[1], l.P[2] - P[2]]);
        const hd = dot(n, norm([L[0] + cam.V[0], L[1] + cam.V[1], L[2] + cam.V[2]]));
        if (hd > nej) {
          nej = hd;
          nejPhi = phi;
        }
      }
      if (nej > 0.86) {
        const [X, Y] = promitni([Math.cos(nejPhi) * 0.99, Math.sin(nejPhi) * 0.99, H]);
        const k = clamp((nej - 0.86) / 0.12);
        obruc += `<path d="${jiskraD(2.2 + 3.4 * k)}" transform="translate(${f(X)} ${f(Y)}) rotate(${f(st.t * 20)})" fill="#FFFFFF" opacity="${f(k)}"/><circle cx="${f(X)}" cy="${f(Y)}" r="${f(3 + 3 * k)}" fill="url(#by2-odlesk)" opacity="${f(k)}"/>`;
      }
    }
    return `<g clip-path="url(#by2-vnitrek)">${s}</g>${obruc}`;
  };
  /** Vlnky, bubliny v rozžhavené glazuře a odraz Bublinky v černé glazuře. */
  const vrstvaHladina = (st) => {
    let s = "";
    if (st.bub.op > 0.05 && st.bub.vMisce < 0.5 && st.zar < 0.3) {
      const rx = DNO[0] + (st.bub.x - DNO[0]) * 0.5, ry = VNITREK.cy - VNITREK.ry * 0.3 + (st.bub.y - 40) * 0.25;
      s += `<g opacity="${f(0.13 * st.bub.op * clamp(1 - st.zar * 3))}">${malaBublinka("by2", st, { x: rx, y: ry, r: st.bub.r * 0.6, vyraz: st.bub.vyraz, pohled: [st.pohled[0], -st.pohled[1]], sy: -0.72, lesk: 0.5 })}</g>`;
    }
    for (const v of st.vlny) {
      const u = clamp(v.vek / 1.4);
      if (u <= 0) continue;
      const r = 0.05 + u * 0.7;
      const E2 = elipsa(r, zVnitrku(r));
      s += `<ellipse ${elAttr(E2)} fill="none" stroke="${st.zar > 0.3 ? "#FFF0C0" : "#9AB4D8"}" stroke-width="${f(1.3 * (1 - u))}" opacity="${f((1 - u) * 0.85)}"/>`;
    }
    for (const b of st.bubliny) {
      const phi = b.phi + st.toc;
      const P = bodVnitrku(b.r, phi);
      const [X, Y] = promitni(P);
      const nv = dot(normala(b.r, phi), cam.V);
      if (b.vek < b.doba) {
        const k = easeOut(b.vek / b.doba);
        const rr = 0.6 + 2.8 * k;
        s += `<circle cx="${f(X)}" cy="${f(Y - rr * 0.5)}" r="${f(rr)}" fill="url(#by2-var)" stroke="#FFF2C8" stroke-width="0.35"/>`;
        s += `<circle cx="${f(X - rr * 0.35)}" cy="${f(Y - rr * 0.9)}" r="${f(rr * 0.28)}" fill="#FFFFFF" opacity="0.85"/>`;
      } else {
        const u = clamp((b.vek - b.doba) / 0.45);
        s += `<ellipse cx="${f(X)}" cy="${f(Y)}" rx="${f(3 + u * 9)}" ry="${f((3 + u * 9) * nv)}" fill="none" stroke="#FFF0C0" stroke-width="${f(1.1 * (1 - u))}" opacity="${f(1 - u)}"/>`;
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2 + b.phi;
          s += `<circle cx="${f(X + Math.cos(a) * (2 + u * 8))}" cy="${f(Y + Math.sin(a) * (2 + u * 8) * nv - u * 5 + u * u * 7)}" r="${f(0.65 * (1 - u))}" fill="#FFE6A8"/>`;
        }
      }
    }
    return `<g clip-path="url(#by2-vnitrek)">${s}</g>`;
  };
  const vrstvaZlato = (st) =>
    `<g clip-path="url(#by2-orez)" fill="#F3D27A">${ZLATO.filter((_, i) => i % 3 === 0)
      .map(([x, y, r, fz, w]) => {
        const op = Math.max(0, Math.sin(st.t * w + fz)) ** 6;
        return op < 0.05 ? "" : `<path d="${jiskraD(r * 2.6)}" transform="translate(${f(x)} ${f(y)})" opacity="${f(op * 0.9)}"/>`;
      })
      .join("")}</g>`;
  const vrstvaBublinka = (st) => {
    const b = st.bub;
    if (b.op < 0.02) return "";
    return malaBublinka("by2", st, { x: b.x, y: b.y, r: b.r, vyraz: b.vyraz, pohled: st.pohled, mrk: st.mrk, op: b.op, sx: b.sx, sy: b.sy, film: { ...st.film, op: 0.3 }, obrys: "#A39482" });
  };
  const vrstvaOnibi = (st) => st.onibi.map((o) => plaminek(o.X, o.Y, o.smer, { id: "by2", r: 3.6, delka: 12 + o.rychlost * 0.03, t: st.t, fz: o.fz, sila: o.sila })).join("");

  const defs = () =>
    bubDefs("by2", { pruhledna: 0.3 }) +
    onibiDefs("by2") +
    `<filter id="by2-tus" x="-12%" y="-12%" width="124%" height="124%" color-interpolation-filters="sRGB">` +
    `<feTurbulence type="fractalNoise" baseFrequency="0.055" numOctaves="4" seed="8" result="n"/>` +
    `<feDisplacementMap in="SourceGraphic" in2="n" scale="12" xChannelSelector="R" yChannelSelector="G" result="d"/>` +
    `<feGaussianBlur in="d" stdDeviation="0.5"/></filter>` +
    `<filter id="by2-lem" x="-15%" y="-15%" width="130%" height="130%"><feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="21" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="16" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation="2.4"/></filter>` +
    `<filter id="by2-rozmaz" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.2"/></filter>` +
    `<filter id="by2-mekce" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="0.75"/></filter>` +
    /* tekutá glazura: šum přemapovaný do barev žáru */
    `<filter id="by2-lava" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">` +
    `<feTurbulence type="fractalNoise" baseFrequency="0.07 0.11" numOctaves="3" seed="14" result="n"/>` +
    `<feColorMatrix in="n" type="matrix" values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 0 1" result="g"/>` +
    `<feComponentTransfer in="g"><feFuncR type="table" tableValues="0.45 0.75 0.98 1 1"/><feFuncG type="table" tableValues="0.08 0.22 0.5 0.8 0.95"/><feFuncB type="table" tableValues="0.02 0.05 0.12 0.35 0.7"/></feComponentTransfer></filter>` +
    `<filter id="by2-skvrny-laku" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.09 0.14" numOctaves="3" seed="27"/><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  5.5 0 0 0 -2.4"/></filter>` +
    `<mask id="by2-oser" maskUnits="userSpaceOnUse" x="0" y="0" width="180" height="180"><rect width="180" height="180" filter="url(#by2-skvrny-laku)"/></mask>` +
    `<linearGradient id="by2-stena" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0E0A08"/><stop offset="0.3" stop-color="#3A2618"/><stop offset="0.5" stop-color="#2A1C14"/><stop offset="1" stop-color="#070505"/></linearGradient>` +
    `<clipPath id="by2-orez"><path d="${POZADI_D}"/></clipPath>` +
    `<clipPath id="by2-vnitrek"><ellipse ${elAttr(VNITREK)}/></clipPath>` +
    `<linearGradient id="by2-noc" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stop-color="#1D1A33"/><stop offset="0.55" stop-color="#121022"/><stop offset="1" stop-color="#0A0912"/></linearGradient>` +
    `<radialGradient id="by2-aurora" cx="0.5" cy="0.45" r="0.5"><stop offset="0" stop-color="#3D4C9A" stop-opacity="0.45"/><stop offset="0.45" stop-color="#5A3E86" stop-opacity="0.18"/><stop offset="1" stop-color="#5A3E86" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="by2-pec" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#FF8A3A" stop-opacity="0.75"/><stop offset="0.5" stop-color="#C8401A" stop-opacity="0.32"/><stop offset="1" stop-color="#8A2410" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="by2-negoro" cx="0.45" cy="0.66" r="0.62"><stop offset="0.5" stop-color="#5E170E"/><stop offset="0.82" stop-color="#8E2416"/><stop offset="1" stop-color="#A02C1A"/></radialGradient>` +
    `<linearGradient id="by2-negoro-lem" x1="0" y1="0" x2="0.25" y2="1"><stop offset="0" stop-color="#7A2014"/><stop offset="0.55" stop-color="#B53A22"/><stop offset="1" stop-color="#D2553A"/></linearGradient>` +
    `<linearGradient id="by2-kaki" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A8693A"/><stop offset="0.5" stop-color="#6E3A1C"/><stop offset="1" stop-color="#3A1C0E"/></linearGradient>` +
    `<linearGradient id="by2-stribro" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="#F4F2EC"/><stop offset="0.35" stop-color="#B8B4AA"/><stop offset="0.7" stop-color="#6E6A62"/><stop offset="1" stop-color="#3A3732"/></linearGradient>` +
    `<linearGradient id="by2-cerna" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A201A"/><stop offset="0.38" stop-color="#110C0A"/><stop offset="0.75" stop-color="#070605"/><stop offset="1" stop-color="#040303"/></linearGradient>` +
    `<radialGradient id="by2-tunka" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#0D1813"/><stop offset="0.7" stop-color="#0A110E" stop-opacity="0.75"/><stop offset="1" stop-color="#0B0807" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="by2-odlesk" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#E6F2FF" stop-opacity="0.75"/><stop offset="0.45" stop-color="#9CC2E6" stop-opacity="0.22"/><stop offset="1" stop-color="#9CC2E6" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="by2-zhava" cx="0.5" cy="0.6" r="0.6"><stop offset="0" stop-color="#FFD27A"/><stop offset="0.45" stop-color="#F07A2A"/><stop offset="0.8" stop-color="#B0341A"/><stop offset="1" stop-color="#5A1408"/></radialGradient>` +
    `<radialGradient id="by2-jadro" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#FFF6D2" stop-opacity="0.85"/><stop offset="1" stop-color="#FFD27A" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="by2-var" cx="0.4" cy="0.35" r="0.65"><stop offset="0" stop-color="#FFF6D6" stop-opacity="0.9"/><stop offset="0.6" stop-color="#FFC060" stop-opacity="0.55"/><stop offset="1" stop-color="#E8702A" stop-opacity="0.9"/></radialGradient>`;

  /* ——— Simulace ——— */
  const KLID_B = { x: 140, y: 30, r: 19 };
  const novaDynamika = () => ({
    toc: 0.6, tocV: 0.07,
    skok: null, dalsiSkok: 7.5, nove: [], bubliny: [], vlny: [],
    onibi: [
      { fz: 0, x: 62, y: 46, vx: 0, vy: 0, smer: -Math.PI / 2, P: [-0.6, 0.4, 1.3] },
      { fz: 2.4, x: 130, y: 72, vx: 0, vy: 0, smer: -Math.PI / 2, P: [0.8, 0.2, 1.2] },
    ],
    pohled: [0, 0], nahoda: rng(5150), zvuk: [], kapka: 1.2, mysPred: null,
  });
  const krok = (dyn, t, dt, vstup) => {
    const R = dyn.nahoda;
    /* otáčení: miska se točí sama, tah myší do strany ji roztočí */
    let tocCil = 0.07;
    if (vstup.mys && dyn.mysPred) tocCil += clamp((vstup.mys.x - dyn.mysPred.x) / Math.max(dt, 1 / 120) / 260, -2, 2);
    dyn.mysPred = vstup.mys ? { ...vstup.mys } : null;
    dyn.tocV = kCili(dyn.tocV, tocCil, dt, vstup.mys ? 0.25 : 1.6);
    dyn.toc += dyn.tocV * dt;
    /* bludičky: jedna za myší (bez myši bloumá nad miskou), druhá krouží kolem */
    dyn.onibi.forEach((o, i) => {
      let cil;
      if (i === 0) cil = vstup.mys ? [vstup.mys.x, vstup.mys.y - 4] : [78 + 40 * Math.sin(t * 0.33), 48 + 14 * Math.sin(t * 0.47)];
      else {
        const a = t * 0.36 + 2;
        cil = promitni([Math.cos(a) * 1.1, Math.sin(a) * 0.9, 1.2 + 0.15 * Math.sin(t * 0.7)]);
      }
      o.vx += (14 * (cil[0] - o.x) - 6 * o.vx) * dt;
      o.vy += (14 * (cil[1] - o.y) - 6 * o.vy) * dt;
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      o.rychlost = Math.hypot(o.vx, o.vy);
      let d = Math.atan2(-o.vy * 0.04 - 1, -o.vx * 0.04) - o.smer;
      while (d > Math.PI) d -= 2 * Math.PI;
      while (d < -Math.PI) d += 2 * Math.PI;
      o.smer += d * (1 - Math.exp(-dt / 0.12));
      /* ve světě visí bludička kus nad okrajem misky */
      o.P = zObrazovky(o.x, o.y, 1.15);
    });
    /* skok do misky */
    if (vstup.kliky && vstup.kliky.length) {
      vstup.kliky.length = 0;
      if (!dyn.skok) dyn.skok = { t0: t, praskly: 0 };
    }
    if (!dyn.skok && t > dyn.dalsiSkok) dyn.skok = { t0: t, praskly: 0 };
    const sk = dyn.skok;
    if (sk) {
      const u = t - sk.t0;
      const uP = sk.uP ?? -1;
      const pres = (x) => uP < x && u >= x;
      if (pres(0.55)) {
        dyn.zvuk.push({ druh: "plop", sila: 1, pan: 0 });
        dyn.vlny.push({ vek: 0 }, { vek: -0.2 });
      }
      if (pres(0.8)) dyn.zvuk.push({ druh: "zar", sila: 1 });
      /* bubliny probublají glazurou jedna po druhé */
      if (u > 1.1 && u < 2.9 && sk.praskly < 7 && R() < dt * 4.4) {
        sk.praskly++;
        dyn.bubliny.push({ r: 0.2 + Math.sqrt(R()) * 0.7, phi: R() * Math.PI * 2 - dyn.toc, vek: 0, doba: 0.5 + R() * 0.5, praskla: false });
      }
      if (pres(3.7)) {
        dyn.zvuk.push({ druh: "plop", sila: 0.8, pan: 0.2, vys: 1.5 });
        dyn.zvuk.push({ druh: "smich", sila: 0.7, pan: 0.4, za: 0.25 });
        dyn.vlny.push({ vek: 0 });
      }
      sk.uP = u;
      if (u > 6) {
        dyn.skok = null;
        dyn.dalsiSkok = t + 14 + R() * 6;
      }
    }
    for (const b of dyn.bubliny) {
      b.vek += dt;
      if (!b.praskla && b.vek >= b.doba) {
        b.praskla = true;
        dyn.zvuk.push({ druh: "bubl", sila: 0.6 + R() * 0.4, pan: clamp(b.r * Math.cos(b.phi + dyn.toc), -1, 1), vys: 0.8 + R() * 0.6 });
        dyn.nove.push({ r: b.r, phi: b.phi, a: 0.016 + R() * 0.012, d: R() < 0.7 ? 258 + R() * 40 : 430 + R() * 30, halo: 2.8 + R() * 1.4, vek: -1.6 - R() * 0.8, zvoni: false });
      }
    }
    dyn.bubliny = dyn.bubliny.filter((b) => b.vek < b.doba + 0.5);
    for (const n of dyn.nove) {
      n.vek += dt;
      if (!n.zvoni && n.vek > 0.15) {
        n.zvoni = true;
        dyn.zvuk.push({ druh: "kvet", sila: 0.55, pan: clamp(n.r * Math.cos(n.phi + dyn.toc), -1, 1) });
      }
    }
    if (dyn.nove.length > 28) for (const n of dyn.nove.slice(0, dyn.nove.length - 28)) n.mizi = Math.max(0, (n.mizi ?? 1) - dt * 0.5);
    dyn.nove = dyn.nove.filter((n) => (n.mizi ?? 1) > 0);
    for (const v of dyn.vlny) v.vek += dt;
    dyn.vlny = dyn.vlny.filter((v) => v.vek < 1.4);
    /* kapky do zakopané nádoby suikinkucu — tiché zvonění, když se nic neděje */
    dyn.kapka -= dt;
    if (dyn.kapka <= 0) {
      dyn.kapka = 1.6 + R() * 3.2;
      if (!dyn.skok) dyn.zvuk.push({ druh: "kap", sila: 0.35 + R() * 0.4, pan: (R() - 0.5) * 1.2, vys: R() });
    }
    /* pohled: při skoku do misky, jinak na bludičku u myši */
    const kam = dyn.skok ? [90, 110] : [dyn.onibi[0].x, dyn.onibi[0].y];
    const cp = [clamp((kam[0] - KLID_B.x) / 30, -1, 1) * 2.2, clamp((kam[1] - KLID_B.y) / 30, -1, 1) * 1.6];
    dyn.pohled = dyn.pohled.map((q, i) => kCili(q, cp[i], dt, 0.15));
  };

  const stav = (t, vstup = {}, dyn) => {
    const d = dyn || novaDynamika();
    /* Bublinka: visí nad zadním okrajem, při skoku letí do tůňky a pak vybublá */
    const bub = { x: KLID_B.x + 2 * Math.sin(t * 0.8), y: KLID_B.y + 2.4 * Math.sin(t * 1.2), r: KLID_B.r, op: 1, sx: 1, sy: 1, vyraz: "smug", vMisce: 0 };
    let zar = 0;
    if (d.skok) {
      const u = t - d.skok.t0;
      if (u < 0.2) {
        const k = smooth(u / 0.2);
        bub.sx = 1 + 0.12 * k;
        bub.sy = 1 - 0.14 * k;
        bub.vyraz = "fuk";
      } else if (u < 0.6) {
        const k = smooth((u - 0.2) / 0.4);
        bub.x = lerp(bub.x, DNO[0], k);
        bub.y = lerp(bub.y, DNO[1], k) - 26 * Math.sin(Math.PI * k);
        bub.r = lerp(KLID_B.r, 8, k);
        bub.sx = 0.9;
        bub.sy = 1.15;
        bub.vyraz = "smich";
        bub.vMisce = k;
      } else if (u < 3.6) {
        bub.op = 0;
        bub.vMisce = 1;
      } else if (u < 4.6) {
        const k = smooth((u - 3.6) / 1);
        bub.x = lerp(DNO[0], bub.x, k);
        bub.y = lerp(DNO[1] - 4, bub.y, k) - 18 * Math.sin(Math.PI * k);
        bub.r = lerp(6, KLID_B.r, easeOut(k * 1.4));
        bub.op = clamp(k * 5);
        bub.vyraz = "smich";
        bub.vMisce = 1 - k;
      } else if (u < 5.6) bub.vyraz = "smich";
      zar = u < 0.55 ? 0 : u < 1.1 ? smooth((u - 0.55) / 0.55) : u < 2.9 ? 1 : 1 - smooth((u - 2.9) / 1.6);
    }
    return {
      t, toc: d.toc, zar, bub, nove: d.nove, bubliny: d.bubliny, vlny: d.vlny, pohled: d.pohled,
      mrk: mrkani(t, [2.1, 6.3, 6.55], 9),
      svetla: d.onibi.map((o) => ({ P: o.P, sila: 1 })),
      onibi: d.onibi.map((o) => ({ X: o.x, Y: o.y, smer: o.smer, rychlost: o.rychlost || 0, fz: o.fz, sila: 0.95 })),
      film: { od: 240 + 120 * Math.sin(t * 0.13), krokNm: 30, vlna: 2, pruhu: 12, viry: [{ x: 90 + 14 * Math.sin(t * 0.4), y: 92 + 10 * Math.sin(t * 0.5), r: 24, s: 1.6 * Math.sin(t * 0.33) }] },
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
    hukot: (st) => clamp(st.zar * 0.9),
    klidne: { t: 2.6 },
    vrstvy: [
      { id: "pozadi", kresli: vrstvaPozadi, tezka: true },
      { id: "zare-pece", kresli: vrstvaZarePece, pruhlednost: (st) => f(clamp(st.zar * 0.85)) },
      { id: "zlato", kresli: vrstvaZlato, klic: (st) => Math.floor(st.t * 12) },
      { id: "podstavec", kresli: vrstvaPodstavec, tezka: true },
      { id: "miska", kresli: vrstvaMiska, tezka: true },
      { id: "skvrny", kresli: vrstvaSkvrny, klic: (st) => Math.floor(st.t * 24) },
      { id: "odlesky", kresli: vrstvaOdlesky, klic: snimek, styl: "mix-blend-mode:screen" },
      { id: "roztavena", kresli: vrstvaRoztavena, tezka: true, pruhlednost: (st) => f(clamp(st.zar)) },
      { id: "hladina", kresli: vrstvaHladina, klic: snimek },
      { id: "obruc", kresli: vrstvaObruc },
      { id: "bublinka", kresli: vrstvaBublinka, klic: snimek },
      { id: "onibi", kresli: vrstvaOnibi, klic: snimek, styl: "mix-blend-mode:screen" },
    ],
  };
})();

/* ═══════════════════════════════════════════════════════════════════
 * 3 — ŠÓDŽI
 * Noc na verandě engawa. Za papírovou stěnou šódži svítí lampa andon
 * a pokojem táhne průvod hjakki jagjó — noční procesí sta strašidel,
 * jak ho kreslí svitky z doby Muromači. Na papíře jsou vidět jen stíny:
 * vpředu lucerna s jazykem (čóčin-obake), za ní deštník na jedné noze
 * (kasa-obake), konvička kjúsu na geta, čajník s mývalem (bunbuku
 * čagama), lahvička saké s miskou jako kloboukem, sandál bake-zóri
 * a koště. Nad nimi letí pruh plátna ittan-momen. Půlka průvodu jsou
 * cukumogami — věci, které ožily — a v dílně jsou doma.
 *
 * V roztrhaných okénkách sedí oči mokumokuren: koukají za kurzorem,
 * mrkají, a když se k nim kurzor přiblíží, stydlivě se zavřou.
 * Bublinka je venku, s námi. Je to její průvod a ona je jediná
 * yōkai, která se nebojí.
 *
 * Kliknutí: Bublinka se protáhne dírou v papíře, doletí k lampě a její
 * stín naroste do obra ó-njúdó — celý průvod se rozuteče. Pak vyklouzne
 * zpátky a směje se. Lampa pomalu bliká a stíny s ní.
 * ═══════════════════════════════════════════════════════════════════ */
const V3 = (() => {
  const SJ = { x0: 30, x1: 150, y0: 34, y1: 136, koshi: 117 };
  const RADKY = [34, 50.6, 67.2, 83.8, 100.4, 117];
  const SLOUPCE = [30, 45, 60, 75, 90, 105, 120, 135, 150];
  const LAMPA = [90, 80];
  const ZEM = 115.5;
  const KLID_B = { x: 133, y: 129, r: 16 };
  /* Díry v papíru: tři s očima, čtvrtou se Bublinka protahuje dovnitř */
  const DIRY = [
    { x: 52.5, y: 58.9, r: 5.1, seed: 3, oko: true },
    { x: 127.5, y: 42.3, r: 4.8, seed: 8, oko: true },
    { x: 82.5, y: 92.1, r: 5, seed: 13, oko: true },
    { x: 142.5, y: 92.1, r: 5.8, seed: 21, oko: false },
  ];
  const dira = (d) => {
    const R = rng(d.seed);
    const B = [];
    for (let i = 0; i < 13; i++) {
      const u = (i / 13) * Math.PI * 2;
      const k = 1 + (R() - 0.5) * 0.55 * (i % 2 ? 1 : 0.45);
      B.push([d.x + Math.cos(u) * d.r * k * 1.1, d.y + Math.sin(u) * d.r * k * 0.95]);
    }
    return B;
  };
  const DIRY_B = DIRY.map(dira);

  /* ——— Stínové loutky: všechny jdou doleva, nohy na zemi v počátku ——— */
  /** Geta: deska a dva zuby. */
  const geta = (x, y, w = 5) => `M${f(x - w / 2)} ${f(y - 2.2)} h${w} v1.1 h-${w} Z M${f(x - w / 2 + 0.6)} ${f(y - 1.1)} h1 v1.1 h-1 Z M${f(x + w / 2 - 1.6)} ${f(y - 1.1)} h1 v1.1 h-1 Z`;
  const nozka = (x0, y0, x1, y1, w = 1.2) => {
    const dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy) || 1;
    const nx = (-dy / d) * w * 0.5, ny = (dx / d) * w * 0.5;
    return `M${f(x0 + nx)} ${f(y0 + ny)} L${f(x1 + nx)} ${f(y1 + ny)} L${f(x1 - nx)} ${f(y1 - ny)} L${f(x0 - nx)} ${f(y0 - ny)} Z`;
  };
  /** Krok: noha se zvedne a jde dopředu (doleva), druhá je na zemi. faze 0…1, kmit ±1 */
  const krokNohy = (faze, delka = 3) => {
    const s = Math.sin(faze * Math.PI * 2);
    return { dx: -s * delka, zved: Math.max(0, Math.cos(faze * Math.PI * 2 - Math.PI / 2)) * 1.6 };
  };
  const LOUTKY = {
    /* čóčin-obake: papírová lucerna s roztrženou pusou a jazykem, vznáší se */
    lucerna: (p, t) => {
      const by = -21 - 1.6 * Math.sin(p * Math.PI * 2);
      const telo = `M-6 ${f(by - 9)} Q-8.2 ${f(by)} -6 ${f(by + 9)} L6 ${f(by + 9)} Q8.2 ${f(by)} 6 ${f(by - 9)} Z`;
      const vicka = `M-4.6 ${f(by - 11.2)} h9.2 v2.4 h-9.2 Z M-4.6 ${f(by + 8.8)} h9.2 v2.4 h-9.2 Z M-0.6 ${f(by - 14)} h1.2 v3 h-1.2 Z`;
      const pusa = `M-7.4 ${f(by + 0.6)} Q-3 ${f(by + 4.2)} 2.6 ${f(by + 1.4)} Q-2 ${f(by + 2.2)} -7.4 ${f(by + 0.6)} Z`;
      const oko = `M-3.4 ${f(by - 4)} m-1.6 0 a1.6 2 0 1 0 3.2 0 a1.6 2 0 1 0 -3.2 0 Z`;
      const jazyk = `M-6.6 ${f(by + 1.6)} Q${f(-9 + Math.sin(t * 5) * 0.8)} ${f(by + 7)} ${f(-7.4 + Math.sin(t * 5 + 1) * 1.2)} ${f(by + 12)} Q-5 ${f(by + 8)} -4.6 ${f(by + 2.2)} Z`;
      return { d: `${telo} ${pusa} ${oko}`, plny: vicka + " " + jazyk };
    },
    /* kasa-obake: zavřený deštník, jedno oko, jazyk a jedna noha na geta — skáče */
    destnik: (p) => {
      const hop = Math.abs(Math.sin(p * Math.PI)) * 6;
      const y = -hop;
      const nak = -8 + 6 * Math.cos(p * Math.PI * 2);
      const st = `rotate(${f(nak)} 0 ${f(y - 10)})`;
      const plachta = `M0.6 ${f(y - 36)} C-2.4 ${f(y - 26)} -6 ${f(y - 16)} -7.6 ${f(y - 10)} Q-5.6 ${f(y - 11.4)} -3.8 ${f(y - 9.6)} Q-1.8 ${f(y - 11.2)} 0 ${f(y - 9.4)} Q1.9 ${f(y - 11.2)} 3.8 ${f(y - 9.6)} Q5.8 ${f(y - 11.4)} 7.6 ${f(y - 10)} C6 ${f(y - 16)} 3.4 ${f(y - 26)} 0.6 ${f(y - 36)} Z`;
      const oko = `M-1.8 ${f(y - 22)} m-2.3 0 a2.3 2.9 0 1 0 4.6 0 a2.3 2.9 0 1 0 -4.6 0 Z`;
      const jazyk = `M-2.4 ${f(y - 15.4)} Q-6.6 ${f(y - 12)} -9.4 ${f(y - 5.6)} Q-7.4 ${f(y - 9.4)} -1.2 ${f(y - 13.4)} Z`;
      const noha = nozka(0, y - 10, -0.4, y - 2.2, 1.5) + " " + geta(-0.4, y, 5.6);
      return { d: `${plachta} ${oko}`, plny: `<g transform="${st}"><path d="${jazyk} ${noha}"/></g>`, tr: st, kruh: `M0.6 ${f(y - 37.4)} m-1 0 a1 1 0 1 0 2 0 a1 1 0 1 0 -2 0 Z` };
    },
    /* konvička kjúsu: boční ucho, hubička dopředu, kolébá se na dvou nožkách */
    kjusu: (p) => {
      const kol = 6 * Math.sin(p * Math.PI * 2);
      const bob = -Math.abs(Math.sin(p * Math.PI * 2)) * 1.4;
      const L = krokNohy(p), P = krokNohy(p + 0.5);
      const telo = `M-8 ${f(-12 + bob)} C-8 ${f(-20 + bob)} 8 ${f(-20 + bob)} 8 ${f(-12 + bob)} C8 ${f(-5 + bob)} -8 ${f(-5 + bob)} -8 ${f(-12 + bob)} Z`;
      const vicko = `M-4.6 ${f(-17.6 + bob)} Q0 ${f(-21.6 + bob)} 4.6 ${f(-17.6 + bob)} Z M-1.1 ${f(-21.4 + bob)} a1.1 1.1 0 1 0 2.2 0 a1.1 1.1 0 1 0 -2.2 0 Z`;
      const hubicka = `M-7.4 ${f(-12 + bob)} Q-11 ${f(-13 + bob)} -14 ${f(-18.4 + bob)} L-12.4 ${f(-18.8 + bob)} Q-10.4 ${f(-15.4 + bob)} -7.4 ${f(-14.8 + bob)} Z`;
      const ucho = nozka(6.4, -13 + bob, 15, -17 + bob, 2.2);
      const nohy = nozka(-3, -6 + bob, -3 + L.dx, -2.2 - L.zved, 1.3) + " " + nozka(3, -6 + bob, 3 + P.dx, -2.2 - P.zved, 1.3) + " " + geta(-3 + L.dx, -L.zved, 4) + " " + geta(3 + P.dx, -P.zved, 4);
      const st = `rotate(${f(kol)} 0 -10)`;
      return { d: `${telo} ${vicko} ${hubicka} ${ucho}`, plny: `<path d="${nohy}"/>`, tr: st };
    },
    /* bunbuku čagama: čajník, ze kterého kouká mýval — hlava, ocas a čtyři tlapky */
    cagama: (p, t) => {
      const bob = -Math.abs(Math.sin(p * Math.PI * 2)) * 1.2;
      const telo = `M-8.6 ${f(-4 + bob)} C-10.4 ${f(-10 + bob)} -8.6 ${f(-18 + bob)} -6 ${f(-19.6 + bob)} L6 ${f(-19.6 + bob)} C8.6 ${f(-18 + bob)} 10.4 ${f(-10 + bob)} 8.6 ${f(-4 + bob)} Z`;
      const vicko = `M-5.4 ${f(-19.4 + bob)} Q0 ${f(-23.4 + bob)} 5.4 ${f(-19.4 + bob)} Z M-1 ${f(-23 + bob)} a1 1 0 1 0 2 0 a1 1 0 1 0 -2 0 Z`;
      const hlava = `M-8 ${f(-12 + bob)} C-10 ${f(-18 + bob)} -16.4 ${f(-17.6 + bob)} -17.6 ${f(-13.2 + bob)} L-20.4 ${f(-12.2 + bob)} L-17.4 ${f(-10.8 + bob)} C-16 ${f(-7.6 + bob)} -10 ${f(-7.4 + bob)} -8 ${f(-9 + bob)} Z M-11.6 ${f(-16.8 + bob)} L-12.6 ${f(-20.4 + bob)} L-9.8 ${f(-17.4 + bob)} Z M-15 ${f(-16.4 + bob)} L-16.6 ${f(-19.6 + bob)} L-13.6 ${f(-17 + bob)} Z`;
      const oko = `M-14.6 ${f(-13.6 + bob)} a0.8 0.9 0 1 0 1.6 0 a0.8 0.9 0 1 0 -1.6 0 Z`;
      const vl = Math.sin(t * 3) * 1.6;
      const ocas = `M8 ${f(-9 + bob)} C14 ${f(-8 + bob)} ${f(19 + vl)} ${f(-14 + bob)} ${f(17 + vl)} ${f(-21 + bob)} C${f(15.6 + vl)} ${f(-17 + bob)} 13 ${f(-13 + bob)} 8.4 ${f(-13.4 + bob)} Z`;
      const ucho = `M-6.4 ${f(-19.6 + bob)} C-6.4 ${f(-28 + bob)} 6.4 ${f(-28 + bob)} 6.4 ${f(-19.6 + bob)} L5.4 ${f(-19.6 + bob)} C5.4 ${f(-26.6 + bob)} -5.4 ${f(-26.6 + bob)} -5.4 ${f(-19.6 + bob)} Z`;
      let tlapky = "";
      [-6, -2.6, 3, 6.4].forEach((x, i) => {
        const k = krokNohy(p + (i % 2 ? 0.5 : 0) + (i > 1 ? 0.25 : 0), 2.2);
        tlapky += nozka(x, -4.5 + bob, x + k.dx, -0.2 - k.zved, 1.9) + " ";
      });
      return { d: `${telo} ${vicko} ${hlava} ${oko} ${ocas} ${ucho} ${tlapky}` };
    },
    /* lahvička saké s miskou guinomi místo klobouku, poskakuje */
    tokkuri: (p) => {
      const hop = Math.abs(Math.sin(p * Math.PI)) * 4;
      const y = -hop;
      const telo = `M-1.8 ${f(y - 24)} L-1.8 ${f(y - 19)} C-4 ${f(y - 16)} -7.2 ${f(y - 12)} -7.2 ${f(y - 8)} C-7.2 ${f(y - 3)} -4 ${f(y - 2.4)} 0 ${f(y - 2.4)} C4 ${f(y - 2.4)} 7.2 ${f(y - 3)} 7.2 ${f(y - 8)} C7.2 ${f(y - 12)} 4 ${f(y - 16)} 1.8 ${f(y - 19)} L1.8 ${f(y - 24)} Z`;
      const naklon = -12 + 8 * Math.sin(p * Math.PI * 2);
      const miska = `<path d="M-4 ${f(y - 24.4)} L4 ${f(y - 24.4)} L2.6 ${f(y - 28.4)} L-2.6 ${f(y - 28.4)} Z" transform="rotate(${f(naklon)} 0 ${f(y - 24)})"/>`;
      const nohy = nozka(-2.6, y - 3, -3.4, 0, 1.2) + " " + nozka(2.6, y - 3, 3.4, 0, 1.2);
      const oko = `M-3.6 ${f(y - 10)} a1 1.2 0 1 0 2 0 a1 1.2 0 1 0 -2 0 Z`;
      return { d: `${telo} ${oko}`, plny: miska + `<path d="${nohy}"/>` };
    },
    /* bake-zóri: slaměný sandál na dvou hubených nohách, jedno oko, řemínek trčí jako roh */
    zori: (p) => {
      const L = krokNohy(p, 2.6), P = krokNohy(p + 0.5, 2.6);
      const bob = -Math.abs(Math.sin(p * Math.PI * 2)) * 1.2;
      const podesev = `M-4.2 ${f(-6 + bob)} C-5.4 ${f(-14 + bob)} -4.6 ${f(-24 + bob)} -0.6 ${f(-25 + bob)} C3.6 ${f(-24.4 + bob)} 5 ${f(-14 + bob)} 4.2 ${f(-6 + bob)} C3.4 ${f(-4.4 + bob)} -3.4 ${f(-4.4 + bob)} -4.2 ${f(-6 + bob)} Z`;
      const oko = `M-2.2 ${f(-17 + bob)} a1.6 1.9 0 1 0 3.2 0 a1.6 1.9 0 1 0 -3.2 0 Z`;
      const remen = nozka(-0.4, -22 + bob, -3.6, -28 + bob, 1.1) + " " + nozka(-0.4, -22 + bob, 2.8, -27.4 + bob, 1.1);
      const ruce = nozka(-4.2, -14 + bob, -8.6, -17 + bob + Math.sin(p * 6.28) * 1.5, 0.9) + " " + nozka(4.2, -14 + bob, 8, -11 + bob, 0.9);
      const nohy = nozka(-1.8, -5.6 + bob, -1.8 + L.dx, -0.2 - L.zved, 1.1) + " " + nozka(1.8, -5.6 + bob, 1.8 + P.dx, -0.2 - P.zved, 1.1);
      return { d: `${podesev} ${oko}`, plny: `<path d="${remen} ${ruce} ${nohy}"/>` };
    },
    /* koště: jde po štětinách, násada se kymácí */
    koste: (p) => {
      const kyv = 5 * Math.sin(p * Math.PI * 2);
      let stetiny = "";
      for (let i = 0; i < 7; i++) {
        const x0 = -3 + i;
        const k = krokNohy(p + (i % 2 ? 0.5 : 0), 1.6);
        stetiny += nozka(x0 * 0.7, -10, x0 * 1.6 + k.dx, -k.zved, 0.9) + " ";
      }
      const vazani = `M-3.6 -12.6 h7.2 v2.8 h-7.2 Z`;
      const nasada = nozka(0, -12, 2.6, -36, 1.6);
      return { d: `${stetiny} ${vazani}`, plny: `<path d="${nasada}" transform="rotate(${f(kyv)} 0 -11)"/>` };
    },
  };
  /* Pořadí v průvodu: lucerna svítí na cestu, plátno letí nad nimi */
  const PRUVOD = [
    { druh: "lucerna", odstup: 0, krokDel: 9 },
    { druh: "destnik", odstup: 27, krokDel: 12 },
    { druh: "kjusu", odstup: 52, krokDel: 7 },
    { druh: "cagama", odstup: 79, krokDel: 8 },
    { druh: "tokkuri", odstup: 106, krokDel: 9 },
    { druh: "zori", odstup: 128, krokDel: 6.5 },
    { druh: "koste", odstup: 151, krokDel: 7 },
  ];
  const DELKA_SMYCKY = 360;
  const MOMEN = { odstup: 64 };

  /* ——— Statické kusy ——— */
  const POZADI_D = hrouda(90, 92, 86, 85, 44, { bodu: 30, kolisani: 0.05 });
  /* bambus vlevo za sloupem: proti noční obloze jen stíny stébel a listů */
  const BAMBUS = (() => {
    const R = rng(606);
    let st = "", li = "";
    for (let i = 0; i < 4; i++) {
      const x = 2 + i * 5.4 + R() * 2;
      st += `<rect x="${f(x)}" y="0" width="${f(1.5 + R() * 0.8)}" height="150"/>`;
      for (let k = 0; k < 6; k++) st += `<rect x="${f(x - 0.3)}" y="${f(12 + k * 21 + R() * 6)}" width="2.6" height="0.7"/>`;
      for (let k = 0; k < 5; k++) {
        const y = 20 + R() * 100, smer = R() < 0.5 ? -1 : 1, L = 6 + R() * 5;
        li += `<path d="M${f(x + 1)} ${f(y)} q${f(smer * L * 0.5)} ${f(-1.8)} ${f(smer * L)} ${f(1.6)} q${f(-smer * L * 0.45)} ${f(-0.4)} ${f(-smer * L)} ${f(-1.6)} Z"/>`;
      }
    }
    return `<g fill="#0B0D18">${st}${li}</g>`;
  })();
  const vrstvaPozadi = () =>
    `<path d="${hrouda(90, 92, 89, 88, 23, { bodu: 30, kolisani: 0.06 })}" fill="#3A2E2A" opacity="0.45" filter="url(#by3-lem)"/>` +
    `<path d="${POZADI_D}" fill="url(#by3-noc)" filter="url(#by3-tus)"/>` +
    `<g clip-path="url(#by3-orez)">` +
    /* noční zahrada po stranách: měsíční šero, vlevo bambus, vpravo kamenná lucerna */
    `<rect x="0" y="0" width="180" height="180" fill="url(#by3-mesicni)"/>` +
    /* měsíc za bambusem, jak se to maluje na paravány */
    `<circle cx="14" cy="52" r="16" fill="url(#by3-mesic-zar)"/><circle cx="14" cy="52" r="7.4" fill="#F1E6C8"/>` +
    BAMBUS +
    `<g fill="#0E1020"><path d="M160 112 h14 v4 h-14 Z M162 98 h10 v14 h-10 Z M158 92 h18 l-3 -5 h-12 Z M164 116 h6 v14 h-6 Z M160 130 h14 v5 h-14 Z"/></g>` +
    `<rect x="163.6" y="101" width="6.8" height="7" fill="#F2C47A" opacity="0.55"/>` +
    /* záře ze šódži na verandu a na trámy */
    `<ellipse cx="90" cy="96" rx="90" ry="74" fill="url(#by3-rozsvit)"/>` +
    /* veranda engawa: prkna utíkají k nám, u papíru teplá, vpředu tmavá a na hraně měsíc */
    `<path d="M0 ${SJ.y1} H180 V180 H0 Z" fill="url(#by3-engawa)"/>` +
    `<g stroke="#1A120C" stroke-width="0.7" opacity="0.8">${[142.4, 149.6, 157.6, 166.6].map((y) => `<path d="M0 ${y} H180"/>`).join("")}</g>` +
    `<g stroke="#C08A52" stroke-width="0.4" opacity="0.35">${[142.9, 150.1, 158.1].map((y) => `<path d="M14 ${y} H166"/>`).join("")}</g>` +
    `<path d="M0 166.2 H180" stroke="#8EA2D0" stroke-width="0.6" opacity="0.5"/>` +
    /* lesk papíru na naleštěném dřevě */
    `<ellipse cx="90" cy="${SJ.y1 + 5}" rx="58" ry="3.6" fill="#FFD9A0" opacity="0.3" filter="url(#by3-rozmaz)"/>` +
    /* střecha: okraj s konci krokví, pod ní svinutá rohož sudare a trám */
    `<path d="M0 0 H180 V${SJ.y0 - 13} H0 Z" fill="#0E0B10"/>` +
    `<g fill="#1E1714">${Array.from({ length: 16 }, (_, i) => `<rect x="${4 + i * 11.3}" y="${SJ.y0 - 13}" width="5" height="3.2"/>`).join("")}</g>` +
    `<rect x="${SJ.x0 + 4}" y="${SJ.y0 - 13.6}" width="${SJ.x1 - SJ.x0 - 8}" height="4.6" rx="2.3" fill="#5A4430"/>` +
    `<g stroke="#3A2A1C" stroke-width="0.35">${Array.from({ length: 37 }, (_, i) => `<path d="M${SJ.x0 + 5 + i * 3} ${SJ.y0 - 13.6} v4.6"/>`).join("")}</g>` +
    `<g stroke="#C4432B" stroke-width="0.8">${[SJ.x0 + 22, SJ.x1 - 22].map((x) => `<path d="M${x} ${SJ.y0 - 14} v5.8 M${x} ${SJ.y0 - 8.2} l-1 3.4 M${x} ${SJ.y0 - 8.2} l1 3.4"/>`).join("")}</g>` +
    `<rect x="16" y="${SJ.y0 - 8}" width="148" height="6.6" fill="#2E2018"/>` +
    `<path d="M16 ${SJ.y0 - 1.6} H164" stroke="#8A5E36" stroke-width="0.6" opacity="0.7"/>` +
    `<rect x="${SJ.x0 - 8}" y="${SJ.y0 - 6}" width="8" height="${SJ.y1 - SJ.y0 + 6}" fill="#2A1C14"/><rect x="${SJ.x1}" y="${SJ.y0 - 6}" width="8" height="${SJ.y1 - SJ.y0 + 6}" fill="#2A1C14"/>` +
    `<path d="M${SJ.x0 - 0.6} ${SJ.y0} V${SJ.y1} M${SJ.x1 + 0.6} ${SJ.y0} V${SJ.y1}" stroke="#B07A46" stroke-width="0.6" opacity="0.6"/>` +
    `<path d="M${SJ.x0 - 7.6} ${SJ.y0} V${SJ.y1}" stroke="#6A7CB0" stroke-width="0.5" opacity="0.5"/>` +
    /* měsíc a hvězdy v pruhu nad střechou */
    `<g fill="#E9DFC4">${[[34, 8.6, 0.4], [62, 6, 0.3], [104, 7.4, 0.35], [124, 10, 0.3], [160, 11, 0.3]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join("")}</g>` +
    `</g>`;
  /** Papír šódži: teplá záře od lampy, nejsvětlejší kolem ní, k rohům tmavne. Vlákna washi. */
  const vrstvaPapir = () =>
    `<rect x="${SJ.x0}" y="${SJ.y0}" width="${SJ.x1 - SJ.x0}" height="${SJ.koshi - SJ.y0}" fill="url(#by3-papir)"/>` +
    `<rect x="${SJ.x0}" y="${SJ.y0}" width="${SJ.x1 - SJ.x0}" height="${SJ.koshi - SJ.y0}" filter="url(#by3-vlakna)" opacity="0.55" style="mix-blend-mode:multiply"/>`;
  const vrstvaPlamen = () => `<ellipse cx="${LAMPA[0]}" cy="${LAMPA[1]}" rx="40" ry="34" fill="url(#by3-lampa)"/>`;
  /** Mřížka kumiko, rám a deska koši-ita dole. Všechno dřevo je proti světlu tmavé. */
  const vrstvaMrizka = () => {
    let s = "";
    s += `<g fill="#2C1E15">`;
    for (const x of SLOUPCE.slice(1, -1)) s += `<rect x="${f(x - 0.55)}" y="${SJ.y0}" width="1.1" height="${SJ.koshi - SJ.y0}"/>`;
    for (const y of RADKY.slice(1, -1)) s += `<rect x="${SJ.x0}" y="${f(y - 0.55)}" width="${SJ.x1 - SJ.x0}" height="1.1"/>`;
    s += `</g>`;
    /* rám a prostřední příčle dvou posuvných křídel */
    s += `<path d="M${SJ.x0} ${SJ.y0} H${SJ.x1} V${SJ.y1} H${SJ.x0} Z M${SJ.x0 + 2.4} ${SJ.y0 + 2.2} V${SJ.koshi} H${SJ.x1 - 2.4} V${SJ.y0 + 2.2} Z" fill="#3A281C" fill-rule="evenodd"/>`;
    s += `<rect x="${(SJ.x0 + SJ.x1) / 2 - 1.4}" y="${SJ.y0}" width="2.8" height="${SJ.y1 - SJ.y0}" fill="#3A281C"/>`;
    s += `<rect x="${SJ.x0}" y="${SJ.koshi}" width="${SJ.x1 - SJ.x0}" height="${SJ.y1 - SJ.koshi}" fill="url(#by3-koshi)"/>`;
    const stred = (SJ.x0 + SJ.x1) / 2;
    s += `<g stroke="#1E140E" stroke-width="0.45" opacity="0.7">${[121, 125, 129, 133].map((y) => `<path d="M${SJ.x0 + 3} ${y} Q${(SJ.x0 + stred) / 2} ${y + 0.8} ${stred - 2} ${y} M${stred + 2} ${y} Q${(stred + SJ.x1) / 2} ${y - 0.8} ${SJ.x1 - 3} ${y}"/>`).join("")}</g>`;
    s += `<path d="M${SJ.x0} ${SJ.koshi + 0.4} H${SJ.x1}" stroke="#7A5232" stroke-width="0.7"/>`;
    s += `<g fill="#14100C">${[SJ.x0 + 18, SJ.x1 - 18].map((x) => `<ellipse cx="${x}" cy="${SJ.y1 - 10}" rx="2.6" ry="1.4"/>`).join("")}</g>`;
    return s;
  };
  /** Díry: roztržený papír s cáry, ve volné díře světlo z pokoje. */
  const vrstvaDiry = (st) => {
    let s = "";
    DIRY.forEach((d, i) => {
      const B = DIRY_B[i];
      const tlak = st.tlakDira && i === 3 ? st.tlakDira : 0;
      const Bt = B.map(([x, y]) => [d.x + (x - d.x) * (1 + tlak * 0.35), d.y + (y - d.y) * (1 + tlak * 0.2)]);
      s += `<path d="${hladka(Bt, true)}" fill="${d.oko ? "#140C08" : "url(#by3-svetlo-diry)"}"/>`;
      /* cáry papíru kolem díry, ohnuté dovnitř */
      const R = rng(d.seed + 40);
      for (let k = 0; k < 4; k++) {
        const j = Math.floor(R() * Bt.length);
        const [x, y] = Bt[j];
        const a = Math.atan2(y - d.y, x - d.x) + Math.PI + (R() - 0.5) * 0.6;
        const L = 1.6 + R() * 1.8 + tlak * 1.5;
        s += `<path d="M${f(x + Math.cos(a + 1.6) * 1.1)} ${f(y + Math.sin(a + 1.6) * 1.1)} L${f(x + Math.cos(a) * L)} ${f(y + Math.sin(a) * L)} L${f(x + Math.cos(a - 1.6) * 1.1)} ${f(y + Math.sin(a - 1.6) * 1.1)} Z" fill="#F2DDB4" stroke="#C9A06A" stroke-width="0.25"/>`;
      }
      s += `<path d="${hladka(Bt, true)}" fill="none" stroke="#B88A54" stroke-width="0.45" opacity="0.8"/>`;
    });
    return s;
  };
  /** Oči mokumokuren v dírách: bělmo, duhovka za kurzorem, víčka z papíru. */
  const vrstvaOci = (st) => {
    let s = "";
    st.oci.forEach((o) => {
      const d = DIRY[o.dira];
      const ry = d.r * 0.82;
      const rx = d.r * 1.05;
      const otevr = clamp(1 - o.zavreno);
      if (otevr < 0.04) {
        s += `<path d="M${f(d.x - rx)} ${f(d.y)} Q${f(d.x)} ${f(d.y + 1.4)} ${f(d.x + rx)} ${f(d.y)}" stroke="#E8C8A0" stroke-width="0.6" fill="none" opacity="0.7"/>`;
        return;
      }
      const ryO = ry * otevr;
      s += `<g clip-path="url(#by3-dira-${o.dira})">`;
      s += `<ellipse cx="${f(d.x)}" cy="${f(d.y)}" rx="${f(rx)}" ry="${f(ryO)}" fill="#F3E9D2"/>`;
      const ir = d.r * 0.52 * (1 + o.uzas * 0.12);
      const ix = d.x + o.pohled[0] * d.r * 0.42, iy = d.y + o.pohled[1] * ry * 0.34;
      s += `<g clip-path="url(#by3-dira-${o.dira})"><ellipse cx="${f(d.x)}" cy="${f(d.y)}" rx="${f(rx)}" ry="${f(ryO)}" fill="none"/>`;
      s += `<circle cx="${f(ix)}" cy="${f(iy)}" r="${f(ir)}" fill="#5A3A20"/><circle cx="${f(ix)}" cy="${f(iy)}" r="${f(ir * 0.72)}" fill="#3A2412"/>`;
      s += `<circle cx="${f(ix)}" cy="${f(iy)}" r="${f(ir * (0.42 - o.uzas * 0.18))}" fill="#0A0604"/>`;
      s += `<circle cx="${f(ix - ir * 0.36)}" cy="${f(iy - ir * 0.36)}" r="${f(ir * 0.22)}" fill="#FFF8E8"/>`;
      s += `</g>`;
      /* víčka: shora a zdola tmavá kůže, která oko přivírá */
      s += `<path d="M${f(d.x - rx - 1)} ${f(d.y - ry - 2)} H${f(d.x + rx + 1)} V${f(d.y)} Q${f(d.x)} ${f(d.y - ryO * 2)} ${f(d.x - rx - 1)} ${f(d.y)} Z" fill="#2A1A10"/>`;
      s += `<path d="M${f(d.x - rx - 1)} ${f(d.y + ry + 2)} H${f(d.x + rx + 1)} V${f(d.y)} Q${f(d.x)} ${f(d.y + ryO * 2)} ${f(d.x - rx - 1)} ${f(d.y)} Z" fill="#2A1A10"/>`;
      s += `<path d="M${f(d.x - rx)} ${f(d.y)} Q${f(d.x)} ${f(d.y - ryO * 2)} ${f(d.x + rx)} ${f(d.y)}" stroke="#0E0805" stroke-width="0.6" fill="none"/>`;
      s += `</g>`;
    });
    return s;
  };
  /** Stíny průvodu na papíře: jedna barva, měkký okraj. Bublinčin stín roste u lampy. */
  const vrstvaStiny = (st) => {
    let s = "";
    let svit = "";
    for (const c of st.pruvod) {
      const L = LOUTKY[c.druh](c.faze, st.t);
      const tr = `translate(${f(c.x)} ${f(c.y)}) scale(${f(c.mer)})`;
      if (c.druh === "lucerna") {
        /* čóčin-obake je rozsvícená: na papíře je vidět jako putující světlo, stín vrhají jen víčka, žebra a jazyk */
        const by = -21 - 1.6 * Math.sin(c.faze * Math.PI * 2);
        svit += `<g transform="${tr}"><ellipse cx="0" cy="${f(by)}" rx="22" ry="24" fill="url(#by3-lucerna)" opacity="${f(st.svit)}"/><ellipse cx="0" cy="${f(by)}" rx="7" ry="9" fill="#FFFBEE" opacity="${f(0.75 * st.svit)}"/></g>`;
        s += `<g transform="${tr}">${L.plny}<path d="M-6.6 ${f(by - 5)} Q0 ${f(by - 4)} 6.6 ${f(by - 5)} M-7.4 ${f(by)} Q0 ${f(by + 1)} 7.4 ${f(by)} M-6.6 ${f(by + 5)} Q0 ${f(by + 6)} 6.6 ${f(by + 5)}" stroke="#3A2214" stroke-width="0.45" fill="none" opacity="0.3"/>` +
          `<path d="M-6 ${f(by - 9)} Q-8.2 ${f(by)} -6 ${f(by + 9)} M6 ${f(by - 9)} Q8.2 ${f(by)} 6 ${f(by + 9)}" stroke="#3A2214" stroke-width="0.6" fill="none" opacity="0.4"/>` +
          `<path d="M-7.4 ${f(by + 0.6)} Q-3 ${f(by + 4.2)} 2.6 ${f(by + 1.4)} Q-2 ${f(by + 2.2)} -7.4 ${f(by + 0.6)} Z M-5 ${f(by - 4)} a1.6 2 0 1 0 3.2 0 a1.6 2 0 1 0 -3.2 0 Z"/></g>`;
        continue;
      }
      s += `<g transform="${tr}">`;
      if (L.tr && c.druh !== "destnik") s += `<g transform="${L.tr}"><path d="${L.d}" fill-rule="evenodd"/>${L.plny || ""}</g>`;
      else s += `<path d="${L.d}" fill-rule="evenodd"/>${L.plny || ""}${L.kruh ? `<path d="${L.kruh}"/>` : ""}`;
      s += `</g>`;
    }
    /* ittan-momen: pruh plátna letí nad průvodem, vlní se, dvě díry jako oči */
    if (st.momen) {
      const m = st.momen;
      const B = [];
      for (let i = 0; i <= 18; i++) {
        const q = i / 18;
        B.push([m.x + q * 46, m.y + Math.sin(st.t * 3.2 - q * 7) * (1 + q * 3) - q * 2]);
      }
      s += `<path d="${pasPoBodech(B, (q) => 5.2 * (1 - q * 0.4))}"/>`;
      s += `<path d="M${f(B[1][0] - 0.4)} ${f(B[1][1] - 0.6)} a0.7 0.9 0 1 0 1.4 0 a0.7 0.9 0 1 0 -1.4 0 Z M${f(B[2][0] + 0.6)} ${f(B[2][1] - 0.4)} a0.7 0.9 0 1 0 1.4 0 a0.7 0.9 0 1 0 -1.4 0 Z" fill="#F6DDB0"/>`;
    }
    return `<g clip-path="url(#by3-papir-orez)">${svit}<g fill="#3A2214" opacity="${f(0.82 * st.svit)}" filter="url(#by3-stin)">${s}</g></g>`;
  };
  /** Obří stín: Bublinka u lampy — kulatý stín s pazoury, čím blíž lampě, tím větší a rozmazanější. */
  const vrstvaObr = (st) => {
    const o = st.obr;
    if (!o) return "";
    const k = o.mer;
    const ruce = o.ruce;
    const d =
      `M${f(-14)} 0 a14 14 0 1 0 28 0 a14 14 0 1 0 -28 0 Z ` +
      /* pazoury nahoře: ručky zvednuté jako rohy */
      `${nozka(-10, -6, -17, -18 - ruce * 4, 3.4)} ${nozka(10, -6, 17, -18 - ruce * 4, 3.4)} ` +
      `M${f(-19)} ${f(-19 - ruce * 4)} l-2.4 -3.4 l2.2 1.2 l0.6 -3.6 l1.4 3.2 l2 -2.6 l-0.4 4 Z ` +
      `M${f(19)} ${f(-19 - ruce * 4)} l2.4 -3.4 l-2.2 1.2 l-0.6 -3.6 l-1.4 3.2 l-2 -2.6 l0.4 4 Z`;
    return `<g clip-path="url(#by3-papir-orez)"><g transform="translate(${f(o.x)} ${f(o.y)}) scale(${f(k)})" fill="#2A160C" opacity="${f(o.op)}" filter="url(#by3-stin-obr)"><path d="${d}" fill-rule="evenodd"/>` +
      /* oči ó-njúdó: dvě díry, kterými prosvítá lampa */
      `<path d="M-7 -3 a2.6 3.4 0 1 0 5.2 0 a2.6 3.4 0 1 0 -5.2 0 Z M1.8 -3 a2.6 3.4 0 1 0 5.2 0 a2.6 3.4 0 1 0 -5.2 0 Z M-6 7 Q0 11 6 7 Q0 9 -6 7 Z" fill="#F8E2B4"/></g></g>`;
  };
  /** Můry u papíru: přiletí na světlo, třepetají se. Proti světlu jsou jen stínky. */
  const vrstvaMury = (st) =>
    st.mury
      .map((m) => {
        const kr = Math.abs(Math.sin(st.t * 22 + m.fz));
        return `<g transform="translate(${f(m.x)} ${f(m.y)}) rotate(${f(m.uhel)})" fill="#2A1A10"><path d="M0 0 L${f(-3.4)} ${f(-2.6 * kr)} L-2.6 ${f(0.6 * kr)} Z M0 0 L3.4 ${f(-2.6 * kr)} L2.6 ${f(0.6 * kr)} Z"/><ellipse rx="0.6" ry="1.6"/></g>`;
      })
      .join("");
  /** Tráva susuki vpředu vlevo: proti záři tmavá, klasy prosvětlené. */
  const vrstvaTrava = (st) => {
    let s = "";
    const R = rng(91);
    for (let i = 0; i < 9; i++) {
      const x0 = 4 + i * 4.4 + R() * 3, L = 36 + R() * 30;
      const kyv = 0.18 * Math.sin(st.t * 0.9 + i * 0.7) + 0.08 * Math.sin(st.t * 2.1 + i);
      const B = [];
      for (let k = 0; k <= 8; k++) {
        const q = k / 8;
        B.push([x0 + Math.sin(kyv + 0.25 + i * 0.05) * L * q * q * 0.9 + q * 6, 180 - L * q]);
      }
      s += `<path d="${pasPoBodech(B, (q) => 1.5 * (1 - q * 0.8))}" fill="#14100C"/>`;
      if (i % 2 === 0) {
        const vrch = B[8];
        const kl = [];
        for (let k = 0; k <= 6; k++) {
          const q = k / 6;
          kl.push([vrch[0] + q * 9 * Math.cos(-1.1 + kyv * 2), vrch[1] + q * 9 * Math.sin(-1.1 + kyv * 2) + q * q * 6]);
        }
        s += `<path d="${pasPoBodech(kl, (q) => 2.6 * Math.sin(Math.PI * clamp(q * 0.9 + 0.1)))}" fill="#C9A06A" opacity="0.75"/>`;
      }
    }
    return `<g clip-path="url(#by3-orez)">${s}</g>`;
  };
  const vrstvaBublinka = (st) => {
    const b = st.bub;
    if (b.op < 0.02) return "";
    /* proti papíru svítí: teplý lem kolem dokola */
    return (
      `<circle cx="${f(b.x)}" cy="${f(b.y)}" r="${f(b.r * 1.5)}" fill="url(#by3-lem-bublinky)" opacity="${f(b.op)}"/>` +
      malaBublinka("by3", st, { x: b.x, y: b.y, r: b.r, vyraz: b.vyraz, pohled: st.pohled, mrk: st.mrk, op: b.op, sx: b.sx, sy: b.sy, film: { ...st.film, op: 0.26 }, obrys: "#4A3426" })
    );
  };
  const vrstvaOnibi = (vpredu) => (st) => st.onibi.filter((o) => !!o.vpredu === vpredu).map((o) => (o.op < 0.05 ? "" : plaminek(o.x, o.y, o.smer, { id: "by3", r: vpredu ? 2.9 : 2.4, delka: vpredu ? 10 : 8.4, t: st.t, fz: o.fz, sila: o.op * (vpredu ? 1 : 0.75) }))).join("");

  const defs = () =>
    bubDefs("by3", { pruhledna: 0.36 }) +
    onibiDefs("by3") +
    `<filter id="by3-tus" x="-12%" y="-12%" width="124%" height="124%" color-interpolation-filters="sRGB">` +
    `<feTurbulence type="fractalNoise" baseFrequency="0.055" numOctaves="4" seed="5" result="n"/>` +
    `<feDisplacementMap in="SourceGraphic" in2="n" scale="12" xChannelSelector="R" yChannelSelector="G" result="d"/>` +
    `<feGaussianBlur in="d" stdDeviation="0.5"/></filter>` +
    `<filter id="by3-lem" x="-15%" y="-15%" width="130%" height="130%"><feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="33" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="16" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation="2.4"/></filter>` +
    `<filter id="by3-rozmaz" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="2"/></filter>` +
    `<filter id="by3-stin" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="0.55"/></filter>` +
    `<filter id="by3-stin-obr" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.1"/></filter>` +
    `<filter id="by3-vlakna" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.6 0.06" numOctaves="2" seed="9"/><feColorMatrix type="matrix" values="0 0 0 0 0.86  0 0 0 0 0.72  0 0 0 0 0.52  0 0 0 0.9 -0.36"/></filter>` +
    `<clipPath id="by3-orez"><path d="${POZADI_D}"/></clipPath>` +
    `<clipPath id="by3-papir-orez"><rect x="${SJ.x0 + 2.4}" y="${SJ.y0 + 2.2}" width="${SJ.x1 - SJ.x0 - 4.8}" height="${SJ.koshi - SJ.y0 - 2.2}"/></clipPath>` +
    DIRY_B.map((B, i) => `<clipPath id="by3-dira-${i}"><path d="${hladka(B, true)}"/></clipPath>`).join("") +
    `<linearGradient id="by3-noc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1A1830"/><stop offset="0.6" stop-color="#16121C"/><stop offset="1" stop-color="#0E0A0C"/></linearGradient>` +
    `<linearGradient id="by3-mesicni" x1="0" y1="0" x2="1" y2="0.4"><stop offset="0" stop-color="#2A3058"/><stop offset="0.5" stop-color="#1A1A30"/><stop offset="1" stop-color="#222748"/></linearGradient>` +
    `<radialGradient id="by3-mesic-zar"><stop offset="0" stop-color="#F1E6C8" stop-opacity="0.45"/><stop offset="1" stop-color="#F1E6C8" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="by3-rozsvit" cx="0.5" cy="0.45" r="0.5"><stop offset="0" stop-color="#FFB060" stop-opacity="0.32"/><stop offset="0.6" stop-color="#C0602A" stop-opacity="0.12"/><stop offset="1" stop-color="#C0602A" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="by3-engawa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7A5434"/><stop offset="0.35" stop-color="#4A321F"/><stop offset="1" stop-color="#1A120C"/></linearGradient>` +
    `<radialGradient id="by3-papir" gradientUnits="userSpaceOnUse" cx="${LAMPA[0]}" cy="${LAMPA[1]}" r="96"><stop offset="0" stop-color="#FFF6DE"/><stop offset="0.26" stop-color="#F9DDA8"/><stop offset="0.6" stop-color="#DDA866"/><stop offset="1" stop-color="#9C6232"/></radialGradient>` +
    `<radialGradient id="by3-lucerna"><stop offset="0" stop-color="#FFF8E2" stop-opacity="0.95"/><stop offset="0.35" stop-color="#FFE4AA" stop-opacity="0.55"/><stop offset="1" stop-color="#FFD48A" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="by3-lampa"><stop offset="0" stop-color="#FFFBEA" stop-opacity="0.85"/><stop offset="0.4" stop-color="#FFE3A8" stop-opacity="0.35"/><stop offset="1" stop-color="#FFE3A8" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="by3-svetlo-diry"><stop offset="0" stop-color="#FFFDF2"/><stop offset="1" stop-color="#FFE6B0"/></radialGradient>` +
    `<radialGradient id="by3-lem-bublinky"><stop offset="0.6" stop-color="#FFD08A" stop-opacity="0"/><stop offset="0.68" stop-color="#FFD08A" stop-opacity="0.45"/><stop offset="1" stop-color="#FFD08A" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="by3-koshi" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5A3C26"/><stop offset="1" stop-color="#2E1E14"/></linearGradient>`;

  /* ——— Simulace ——— */
  const novaDynamika = () => ({
    ujeto: 60, rychlost: 9, panika: 0,
    trik: null, dalsiTrik: 14,
    oci: DIRY.map((d, i) => (d.oko ? { dira: i, pohled: [0, 0], zavreno: 0, mrkat: 1.5 + i * 1.7, uzas: 0 } : null)).filter(Boolean),
    onibi: [0, 1].map((i) => ({ fz: i * Math.PI, x: KLID_B.x + (i ? 18 : -18), y: KLID_B.y - 10, vx: 0, vy: 0, smer: -Math.PI / 2, op: 1 })),
    mury: [0, 1].map((i) => ({ fz: i * 2, x: 60 + i * 50, y: 50, vx: 0, vy: 0, uhel: 0 })),
    kroky: {}, cvrcek: 0.6, pohled: [0, 0], nahoda: rng(8080), zvuk: [], blikani: 1,
  });
  const vMistnosti = (dyn, t) => {
    const out = [];
    for (const c of PRUVOD) {
      const pozice = (dyn.ujeto + DELKA_SMYCKY - c.odstup) % DELKA_SMYCKY;
      const x = SJ.x1 + 16 - pozice;
      out.push({ ...c, x, pozice });
    }
    return out;
  };
  const krok = (dyn, t, dt, vstup) => {
    const R = dyn.nahoda;
    /* průvod jde stálým krokem; při panice utíká */
    const cilRychlost = 9 + dyn.panika * 34;
    dyn.rychlost = kCili(dyn.rychlost, cilRychlost, dt, 0.25);
    dyn.ujeto += dyn.rychlost * dt;
    dyn.panika = Math.max(0, dyn.panika - dt * 0.35);
    /* klapání geta: každý dopad nohy ťukne, když je loutka vidět */
    for (const c of vMistnosti(dyn, t)) {
      if (c.x < SJ.x0 || c.x > SJ.x1) continue;
      const krokyTed = Math.floor(dyn.ujeto / c.krokDel * 2);
      if (dyn.kroky[c.druh] != null && krokyTed !== dyn.kroky[c.druh] && c.druh !== "lucerna") dyn.zvuk.push({ druh: c.druh === "destnik" || c.druh === "tokkuri" ? "tuk" : "klap", sila: 0.25 + R() * 0.15 + dyn.panika * 0.3, pan: clamp((c.x - 90) / 70, -1, 1), vys: R() });
      dyn.kroky[c.druh] = krokyTed;
    }
    /* trik s obřím stínem; kdo ťukne přímo do oka, toho oko neuvidí — urazí se a zavře */
    if (vstup.kliky && vstup.kliky.length) {
      const k = vstup.kliky[vstup.kliky.length - 1];
      vstup.kliky.length = 0;
      const oko = dyn.oci.find((o) => Math.hypot(k.x - DIRY[o.dira].x, k.y - DIRY[o.dira].y) < DIRY[o.dira].r + 3);
      if (oko) {
        oko.urazene = t + 1.6;
        dyn.zvuk.push({ druh: "tuk", sila: 0.5, pan: clamp((DIRY[oko.dira].x - 90) / 70, -1, 1), vys: 1 });
      } else if (!dyn.trik) dyn.trik = { t0: t };
    }
    if (!dyn.trik && t > dyn.dalsiTrik) dyn.trik = { t0: t };
    const T = dyn.trik;
    if (T) {
      const u = t - T.t0, uP = T.uP ?? -1;
      const pres = (x) => uP < x && u >= x;
      if (pres(0.7)) dyn.zvuk.push({ druh: "vrz", sila: 0.8, pan: 0.6 });
      if (pres(1.05)) dyn.zvuk.push({ druh: "pop", sila: 0.9, pan: 0.6 });
      if (pres(2.0)) {
        dyn.zvuk.push({ druh: "buu", sila: 1, pan: 0 });
        dyn.panika = 1;
      }
      if (pres(4.1)) dyn.zvuk.push({ druh: "vrz", sila: 0.7, pan: 0.6, vys: 1.3 });
      if (pres(4.45)) {
        dyn.zvuk.push({ druh: "pop", sila: 1, pan: 0.6 });
        dyn.zvuk.push({ druh: "smich", sila: 0.8, pan: 0.5, za: 0.2 });
      }
      T.uP = u;
      if (u > 6.2) {
        dyn.trik = null;
        dyn.dalsiTrik = t + 16 + R() * 8;
      }
    }
    /* oči: za kurzorem, při triku na obra; když se kurzor přiblíží, zavřou se */
    const obr = T && t - T.t0 > 1.2 && t - T.t0 < 4.2;
    dyn.oci.forEach((o, i) => {
      const d = DIRY[o.dira];
      let kam = vstup.mys ? [vstup.mys.x, vstup.mys.y] : [90 + 50 * Math.sin(t * 0.3 + i * 2), 80 + 30 * Math.sin(t * 0.23 + i)];
      if (obr) kam = LAMPA;
      else if (!vstup.mys) {
        /* bez kurzoru koukají po průvodu a po Bublince */
        const c = vMistnosti(dyn, t).find((c) => c.x > SJ.x0 && c.x < SJ.x1);
        if (c && (Math.sin(t * 0.4 + i * 1.3) > 0)) kam = [c.x, ZEM - 14];
        else kam = [KLID_B.x, KLID_B.y];
      }
      const dx = kam[0] - d.x, dy = kam[1] - d.y, dd = Math.hypot(dx, dy) || 1;
      const cil = [(dx / dd) * clamp(dd / 30), (dy / dd) * clamp(dd / 30)];
      o.pohled = o.pohled.map((q, j) => kCili(q, cil[j], dt, 0.12));
      const plachost = vstup.mys && Math.hypot(vstup.mys.x - d.x, vstup.mys.y - d.y) < 11 ? 1 : 0;
      o.mrkat -= dt;
      let zav = Math.max(plachost, o.urazene && t < o.urazene ? 1 : 0);
      if (o.mrkat < 0) {
        zav = Math.max(zav, Math.sin(Math.PI * clamp(-o.mrkat / 0.18)));
        if (o.mrkat < -0.18) o.mrkat = 2.5 + R() * 4;
      }
      o.zavreno = kCili(o.zavreno, zav, dt, plachost ? 0.08 : 0.04);
      o.uzas = kCili(o.uzas, obr ? 1 : 0, dt, 0.2);
    });
    /* bludičky: krouží kolem Bublinky; když je uvnitř, čekají u díry */
    const b = stavBublinky(dyn, t);
    dyn.onibi.forEach((o, i) => {
      const a = t * 0.9 + o.fz;
      o.vpredu = Math.sin(a) > 0;
      const stred = b.op > 0.3 ? [b.x, b.y] : [DIRY[3].x + 4, DIRY[3].y + 8];
      const cil = [stred[0] + Math.cos(a) * 27, stred[1] + 4 + Math.sin(a) * 9];
      o.vx += (12 * (cil[0] - o.x) - 5 * o.vx) * dt;
      o.vy += (12 * (cil[1] - o.y) - 5 * o.vy) * dt;
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      let d = Math.atan2(-o.vy * 0.04 - 1, -o.vx * 0.04) - o.smer;
      while (d > Math.PI) d -= 2 * Math.PI;
      while (d < -Math.PI) d += 2 * Math.PI;
      o.smer += d * (1 - Math.exp(-dt / 0.12));
    });
    /* můry: obletují papír kolem lampy */
    dyn.mury.forEach((m, i) => {
      const a = t * (1.3 + i * 0.4) + m.fz;
      const cil = [LAMPA[0] + Math.cos(a) * (30 + 12 * Math.sin(t * 0.7 + i)), LAMPA[1] - 10 + Math.sin(a * 1.7) * 22];
      m.vx += (8 * (cil[0] - m.x) - 2 * m.vx + (R() - 0.5) * 900) * dt;
      m.vy += (8 * (cil[1] - m.y) - 2 * m.vy + (R() - 0.5) * 900) * dt;
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.uhel = clamp(m.vx * 0.4, -40, 40);
    });
    /* cvrček zvonkový (suzumuši): v noci zvoní pořád, při panice ztichne */
    dyn.cvrcek -= dt;
    if (dyn.cvrcek <= 0) {
      dyn.cvrcek = 0.9 + R() * 1.6;
      if (dyn.panika < 0.2) dyn.zvuk.push({ druh: "cvrcek", sila: 0.4 + R() * 0.3, pan: -0.8 + R() * 0.4 });
    }
    dyn.blikani = kCili(dyn.blikani, 0.92 + 0.08 * Math.sin(t * 7.3) * Math.sin(t * 3.1 + 1) + (R() - 0.5) * 0.06, dt, 0.06);
    /* Bublinka kouká za kurzorem, při triku na papír */
    const kam = vstup.mys ? [vstup.mys.x, vstup.mys.y] : [70 + 30 * Math.sin(t * 0.3), 80];
    const cp = [clamp((kam[0] - KLID_B.x) / 30, -1, 1) * 2.2, clamp((kam[1] - KLID_B.y) / 30, -1, 1) * 1.6];
    dyn.pohled = dyn.pohled.map((q, i) => kCili(q, cp[i], dt, 0.15));
  };
  /** Kde je Bublinka během triku. */
  const stavBublinky = (d, t) => {
    const bub = { x: KLID_B.x + 1.6 * Math.sin(t * 0.8), y: KLID_B.y + 2 * Math.sin(t * 1.3), r: KLID_B.r, op: 1, sx: 1, sy: 1, vyraz: "smug" };
    const D = DIRY[3];
    let obr = null, tlakDira = 0;
    if (d.trik) {
      const u = t - d.trik.t0;
      if (u < 0.7) {
        const k = smooth(u / 0.7);
        bub.x = lerp(bub.x, D.x, k);
        bub.y = lerp(bub.y, D.y, k) - 8 * Math.sin(Math.PI * k);
        bub.r = lerp(KLID_B.r, 9, k);
        bub.vyraz = "psst";
      } else if (u < 1.05) {
        /* protahuje se dírou: zúží se a zmizí */
        const k = smooth((u - 0.7) / 0.35);
        bub.x = D.x;
        bub.y = D.y;
        bub.r = 9;
        bub.sx = 1 - 0.55 * k;
        bub.sy = 1 + 0.4 * k;
        bub.op = 1 - smooth((k - 0.6) / 0.4);
        bub.vyraz = "fuk";
        tlakDira = Math.sin(Math.PI * k);
      } else if (u < 4.1) {
        bub.op = 0;
        /* stín: od díry k lampě, roste do obra a pak se vrací */
        const tam = smooth((u - 1.05) / 1), zpet = smooth((u - 3.2) / 0.9);
        const k = tam * (1 - zpet);
        const x = lerp(D.x, LAMPA[0] + 6, k), y = lerp(ZEM - 22, LAMPA[1] - 4, k);
        obr = { x, y, mer: lerp(0.32, 2.1, k), op: lerp(0.86, 0.62, k), ruce: Math.max(0, Math.sin((u - 1.6) * 7)) * k };
      } else if (u < 4.45) {
        const k = smooth((u - 4.1) / 0.35);
        bub.x = D.x;
        bub.y = D.y;
        bub.r = 9;
        bub.sx = 0.45 + 0.55 * k;
        bub.sy = 1.4 - 0.4 * k;
        bub.op = smooth(k * 2);
        bub.vyraz = "smich";
        tlakDira = Math.sin(Math.PI * k);
      } else if (u < 5.6) {
        const k = smooth((u - 4.45) / 1.1);
        bub.x = lerp(D.x, bub.x, k);
        bub.y = lerp(D.y, bub.y, k) - 10 * Math.sin(Math.PI * k);
        bub.r = lerp(9, KLID_B.r, k);
        bub.vyraz = "smich";
      } else bub.vyraz = "smich";
    }
    return { ...bub, obr, tlakDira };
  };

  const stav = (t, vstup = {}, dyn) => {
    const d = dyn || novaDynamika();
    const b = stavBublinky(d, t);
    const pruvod = vMistnosti(d, t)
      .filter((c) => c.x > SJ.x0 - 30 && c.x < SJ.x1 + 30)
      .map((c) => {
        const hop = d.panika > 0.05 ? Math.abs(Math.sin(t * 9 + c.odstup)) * 7 * d.panika : 0;
        return { druh: c.druh, x: c.x, y: ZEM - hop, mer: 1.3, faze: (d.ujeto / c.krokDel) % 1 };
      });
    const pm = (d.ujeto + DELKA_SMYCKY - MOMEN.odstup) % DELKA_SMYCKY;
    const momenX = SJ.x1 + 16 - pm;
    return {
      t, bub: b, obr: b.obr, tlakDira: b.tlakDira, pruvod,
      momen: momenX > SJ.x0 - 50 && momenX < SJ.x1 + 10 ? { x: momenX, y: ZEM - 46 + 3 * Math.sin(t * 1.3) - d.panika * 10 } : null,
      oci: d.oci, onibi: d.onibi.map((o) => ({ ...o, op: b.op > 0.3 ? 1 : 0.55 })), mury: d.mury, pohled: d.pohled,
      mrk: mrkani(t, [1.3, 4.4, 4.62, 7.9], 9.3), svit: d.blikani,
      film: { od: 260 + 110 * Math.sin(t * 0.12), krokNm: 30, vlna: 2, pruhu: 12, viry: [{ x: 90 + 14 * Math.sin(t * 0.4), y: 92 + 10 * Math.sin(t * 0.5), r: 24, s: 1.6 * Math.sin(t * 0.33) }] },
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
    klidne: { t: 6.8 },
    vrstvy: [
      { id: "pozadi", kresli: vrstvaPozadi, tezka: true },
      { id: "papir", kresli: vrstvaPapir, tezka: true },
      { id: "plamen", kresli: vrstvaPlamen, pruhlednost: (st) => f(clamp(st.svit * 1.1 - 0.1)) },
      { id: "stiny", kresli: vrstvaStiny, klic: snimek },
      { id: "obr", kresli: vrstvaObr, klic: snimek },
      { id: "mrizka", kresli: vrstvaMrizka, tezka: true },
      { id: "diry", kresli: vrstvaDiry, klic: (st) => f(st.tlakDira) },
      { id: "oci", kresli: vrstvaOci, klic: (st) => st.oci.map((o) => `${f(o.pohled[0])},${f(o.pohled[1])},${f(o.zavreno)},${f(o.uzas)}`).join("|") },
      { id: "mury", kresli: vrstvaMury, klic: snimek },
      { id: "trava", kresli: vrstvaTrava, klic: (st) => Math.floor(st.t * 15) },
      { id: "onibi-vzadu", kresli: vrstvaOnibi(false), klic: snimek, styl: "mix-blend-mode:screen" },
      { id: "bublinka", kresli: vrstvaBublinka, klic: snimek },
      { id: "onibi", kresli: vrstvaOnibi(true), klic: snimek, styl: "mix-blend-mode:screen" },
    ],
  };
})();

/**
 * Celá kresba jako jedno SVG — pro náhled v Node, nebo jako statický první
 * snímek, který komponenta vloží do stránky (s třídou místo rozměrů).
 * Vrstvy s `pohyb` dostanou stejný posun a natočení jako v prohlížeči.
 */
const celeSvg = (V, t, dyn, vstup = {}, { sirka = 900, pozadi = "#F7F1E3", trida = null } = {}) => {
  const st = V.stav(t, vstup, dyn);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${V.viewBox}" ${trida ? `class="${trida}" aria-hidden="true" focusable="false"` : `width="${sirka}" height="${sirka}"`}>` +
    `<defs>${V.defs()}</defs>` +
    (pozadi ? `<rect x="-50" y="-50" width="400" height="400" fill="${pozadi}"/>` : "") +
    V.vrstvy
      .map((v) => {
        let obsah = v.kresli(st);
        if (v.pohyb) {
          const p = v.pohyb(st);
          obsah = `<g transform="translate(${f(p.ox + p.x)} ${f(p.oy + p.y)}) rotate(${f(p.r || 0)}) scale(${f(p.sx ?? 1)} ${f(p.sy ?? 1)}) translate(${f(-p.ox)} ${f(-p.oy)})">${obsah}</g>`;
        }
        const op = v.pruhlednost ? ` opacity="${v.pruhlednost(st)}"` : "";
        return `<g style="${v.styl || ""}"${op}>${obsah}</g>`;
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
export { celeSvg, pretoc, film, filmRgb };
