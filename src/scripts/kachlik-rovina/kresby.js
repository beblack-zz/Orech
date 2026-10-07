/*
 * Kachlík ve třech přehnaných podobách — generátory kresby.
 * Komponenta: components/characters/kami-buh/KachlikRovina.astro, běh: ./beh.js.
 *
 *   v1  Svatozář pravého úhlu — šestiruký jako Kannon, v rukou nářadí na rovinu,
 *       za zády čtvercová svatozář, stojí na stupních z kachlí
 *   v2  Karesansui — ranní zahrada viděná z temné místnosti jako obraz v rámu;
 *       Kachlík hrabe štěrk do rovných čar a kolem kamenů dělá čtvercové kruhy
 *   v3  Kachlová kamna — zimní roubenka v řezu; staví kamna kachel po kachli,
 *       zatopí, a když najde jeden kachel o půl stupně nakřivo, všechno rozebere
 *
 * Stavba je stejná jako u Pecinky s ohněm (scripts/pecinka-ohen): čisté
 * generátory SVG, které dostanou čas, stav simulace a vstup (myš, kliknutí)
 * a vrátí značky. Žádné DOM, takže běží i v Node a jde z nich udělat náhled
 * jako PNG (celeSvg + sharp). Pohyb, zvuk a myš řeší beh.js.
 *
 * Každá kresba má vrstvy: vrstva bez `klic` se nakreslí jednou, s `klic` se
 * překreslí, jen když se klíč změní. Simulace žije v `dyn` (novaDynamika,
 * krok); zvuky, které má běh zahrát, krok přidá do dyn.zvuk. Id ve filtrech
 * a přechodech jsou pevná, každá podoba smí být na stránce jen jednou.
 * Prefix je kr1–kr3: na Marcelovi stojí vedle Pecinky, která má v1–v3.
 *
 * Napříč podobami platí jedno: Kachlík se nikdy nenakloní. Chodí, natahuje
 * ruce, hrabe i zvedá kachle, ale deska těla stojí vždycky svisle. Teda skoro
 * — razítko 正 („správný“) má na sobě o čtyři stupně nakřivo a neví o tom.
 */

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
const rad = (d) => (d * Math.PI) / 180;
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgbHex = (c) => "#" + c.map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0")).join("");
const mix = (a, b, k) => {
  const A = hexRgb(a);
  const B = hexRgb(b);
  return rgbHex(A.map((v, i) => v + (B[i] - v) * clamp(k)));
};
/** Barva na stupnici [[poloha, barva], …] */
const stupnice = (S, x) => {
  const k = clamp(x, S[0][0], S[S.length - 1][0]);
  let i = 0;
  while (i < S.length - 2 && S[i + 1][0] <= k) i++;
  return mix(S[i][1], S[i + 1][1], (k - S[i][0]) / (S[i + 1][0] - S[i][0]));
};
/** Žár podle teploty 0…1: tmavě rudá, třešňová, oranžová, žlutá, skoro bílá. */
const ZAR = [[0, "#4A120A"], [0.2, "#8E1E10"], [0.4, "#D2401A"], [0.6, "#FF7F24"], [0.8, "#FFBE55"], [1, "#FFF0C2"]];
const zar = (T) => stupnice(ZAR, T);
const pt = (p) => `${f(p[0])} ${f(p[1])}`;
const cara = (body) => "M" + body.map(pt).join(" L");
const lerpP = (A, B, k) => [lerp(A[0], B[0], k), lerp(A[1], B[1], k)];

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
/** Okno v čase: 0 před a, 1 mezi, náběh a doběh přes `hrana` sekund. */
const okno = (u, a, b, hrana = 0.15) => krokem(a - hrana, a, u) * (1 - krokem(b, b + hrana, u));
/** Pružina k cíli: rychlost × tlumení, vrací [x, v]. */
const pruzina = (x, v, cil, dt, tuhost, tlumeni) => {
  const a = -tuhost * (x - cil) - tlumeni * v;
  v += a * dt;
  return [x + v * dt, v];
};

/* ═══════════════════════════════════════════════════════════════════
 * Kachlík: kami podoba (characters/kami/Kachlik.astro) zvednutá na geta.
 * Všechno v jeho souřadnicích 0–180: deska těla 44–136 × 50–144,
 * chodidla na y 147, desky geta 151,4–157,8, spodek zubů je na y 164,8.
 * ═══════════════════════════════════════════════════════════════════ */
const KACH = {
  telo: { x: 44, y: 50, w: 92, h: 94, rx: 7 },
  oci: [[78, 91], [102, 91]],
  nohy: [72, 108],
  getaX: [63, 99],
  dno: 164.8,
};
const teloD = (() => {
  const { x, y, w, h, rx } = KACH.telo;
  return `M${x + rx} ${y} H${x + w - rx} A${rx} ${rx} 0 0 1 ${x + w} ${y + rx} V${y + h - rx} A${rx} ${rx} 0 0 1 ${x + w - rx} ${y + h} H${x + rx} A${rx} ${rx} 0 0 1 ${x} ${y + h - rx} V${y + rx} A${rx} ${rx} 0 0 1 ${x + rx} ${y} Z`;
})();

/** Ruční linka a zrno papíru jako u kami party (characters/kami/Kresba.astro). */
const tahFiltr = (id, posun = 2.4) =>
  `<filter id="${id}" x="-8%" y="-8%" width="116%" height="116%" color-interpolation-filters="sRGB">` +
  `<feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="4" result="vlna"/>` +
  `<feDisplacementMap in="SourceGraphic" in2="vlna" scale="${posun}" xChannelSelector="R" yChannelSelector="G" result="tah"/>` +
  `<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="11" result="zrno"/>` +
  `<feColorMatrix in="zrno" type="matrix" values="0 0 0 0 0.23  0 0 0 0 0.18  0 0 0 0 0.16  0.6 0 0 0 -0.26" result="skvrny"/>` +
  `<feComposite in="skvrny" in2="tah" operator="in" result="zrnoVTvaru"/>` +
  `<feMerge><feMergeNode in="tah"/><feMergeNode in="zrnoVTvaru"/></feMerge></filter>`;

/** Přechody těla: světlo zleva shora jako na kami podobě. */
const kachDefs = (id, { svetla = "#D99A6E", stred = "#C87E4E", tmava = "#AA663B" } = {}) =>
  `<radialGradient id="${id}-telo" cx="0.32" cy="0.28" r="0.85"><stop offset="0" stop-color="${svetla}"/><stop offset="0.55" stop-color="${stred}"/><stop offset="1" stop-color="${tmava}"/></radialGradient>` +
  `<radialGradient id="${id}-tvare" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#B84A2B" stop-opacity="0.6"/><stop offset="1" stop-color="#B84A2B" stop-opacity="0"/></radialGradient>`;

/**
 * Razítko 正 (sei, „rovný, správný“): čtverec s levým horním rohem v x, y
 * o straně s. Tahy znaku jsou z razítka na kami podobě.
 */
const seiZnak = (x, y, s, { barva = "#B84A2B", tah = "#F4EBDD", uhel = -4, sirka } = {}) => {
  const k = s / 14;
  const P = (a, b) => `${f(x + a * k)} ${f(y + b * k)}`;
  const d = `M${P(2.5, 3)} H${f(x + 11.5 * k)} M${P(7, 3)} V${f(y + 11.5 * k)} M${P(7, 7)} H${f(x + 10.5 * k)} M${P(4, 7.5)} V${f(y + 11.5 * k)} M${P(2, 11.5)} H${f(x + 12 * k)}`;
  return (
    `<g transform="rotate(${uhel} ${f(x + s / 2)} ${f(y + s / 2)})">` +
    `<rect x="${f(x)}" y="${f(y)}" width="${f(s)}" height="${f(s)}" rx="${f(1.5 * k)}" fill="${barva}"/>` +
    `<path d="${d}" stroke="${tah}" stroke-width="${f(sirka || 1.3 * k)}" stroke-linecap="square" fill="none"/></g>`
  );
};

/** Deska těla, vnitřní rámeček, lesk a razítko. */
const kachTelo = (id, { obrys = "#94542C", ram = "#B84A2B", lesk = "#E9B892", vypln = null, hanko = true } = {}) =>
  `<path d="${teloD}" fill="${vypln || `url(#${id}-telo)`}" stroke="${obrys}" stroke-width="1.6"/>` +
  `<rect x="53" y="59" width="74" height="76" rx="4" fill="none" stroke="${ram}" stroke-width="2" opacity="0.55"/>` +
  `<path d="M50 58 L50 136" stroke="${lesk}" stroke-width="2" stroke-linecap="round" opacity="0.5"/>` +
  (hanko ? seiZnak(108, 116, 14) : "");

/** Chodidla a pásky hanao přes ně. */
const kachNohy = ({ noha = "#B84A2B", hanao = "#3A2E28", zvednuti = [0, 0] } = {}) =>
  KACH.nohy.map((x, i) => `<ellipse cx="${x}" cy="${f(147 - zvednuti[i])}" rx="11" ry="5" fill="${noha}"/>`).join("") +
  `<path d="${KACH.nohy.map((x, i) => `M${x - 7} ${f(151.4 - zvednuti[i])} Q${x} ${f(142 - zvednuti[i])} ${x + 7} ${f(151.4 - zvednuti[i])}`).join(" ")}" stroke="${hanao}" stroke-width="2.1" stroke-linecap="round" fill="none"/>`;

/** Geta pod nohama: deska a dva zuby (z Kapky, na šířku Kachlíka). */
const kachGeta = ({ deska = "#C99A68", zub = "#8C6444", obrys = "#6B5D4F", linka = "#E2BE8C", zvednuti = [0, 0] } = {}) =>
  `<g stroke="${obrys}" stroke-linejoin="round">` +
  KACH.getaX
    .map((gx, i) => {
      const dy = -zvednuti[i];
      return (
        `<path d="M${gx + 2.4} ${f(157.8 + dy)} H${gx + 6} V${f(164.8 + dy)} H${gx + 2.4} Z M${gx + 12} ${f(157.8 + dy)} H${gx + 15.6} V${f(164.8 + dy)} H${gx + 12} Z" fill="${zub}" stroke-width="0.9"/>` +
        `<rect x="${gx}" y="${f(151.4 + dy)}" width="18" height="6.4" rx="1.4" fill="${deska}" stroke-width="1.1"/>` +
        `<path d="M${gx + 1.4} ${f(153.2 + dy)} H${gx + 16.6}" stroke="${linka}" stroke-width="0.9" stroke-linecap="round"/>`
      );
    })
    .join("") +
  `</g>`;

/**
 * Tvář. Obočí zůstává rovné vždycky — mění se jen jeho výška a sklon.
 * dx/dy posouvá pohled, mrk 0…1 zavírá oči, cuk 0…1 škube pravým okem.
 * oci:   kulate | siroke | spokojene | zavrene | prisne
 * oboci: rovne | zdvizene | mracene | ustarane
 * usta:  rovna | usmev | o | vlnka | ctverec | kousek
 */
const kachTvar = (id, { dx = 0, dy = 0, mrk = 0, cuk = 0, oci = "kulate", oboci = "rovne", usta = "rovna", tvare = 0.35, oko = "#3A2E28" } = {}) => {
  let s = "";
  s += [[68, 102], [112, 102]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="7" ry="4.6" fill="url(#${id}-tvare)" opacity="${f(clamp(tvare * 1.5))}"/>`).join("");
  const ox = clamp(dx, -2.2, 2.2), oy = clamp(dy, -1.8, 1.8);
  const OB = {
    rovne: "M72 82 H84 M96 82 H108",
    zdvizene: "M72 78.4 H84 M96 78.4 H108",
    mracene: "M72 79.4 L84 83.6 M96 83.6 L108 79.4",
    ustarane: "M72 83.4 L84 79.2 M96 79.2 L108 83.4",
  };
  s += `<path d="${OB[oboci] || OB.rovne}" transform="translate(${f(ox * 0.4)} ${f(oy * 0.5)})" stroke="${oko}" stroke-width="2" stroke-linecap="round" fill="none"/>`;
  if (oci === "spokojene") {
    s += `<path d="M74 92 Q78 87 82 92 M98 92 Q102 87 106 92" stroke="${oko}" stroke-width="2.4" stroke-linecap="round" fill="none"/>`;
  } else if (oci === "zavrene") {
    s += `<path d="M74.4 91 H81.6 M98.4 91 H105.6" stroke="${oko}" stroke-width="2.2" stroke-linecap="round"/>`;
  } else if (oci === "prisne") {
    for (const [x, y] of KACH.oci) {
      s += `<ellipse cx="${f(x + ox)}" cy="${f(y + 1 + oy * 0.6)}" rx="3.3" ry="2.4" fill="${oko}"/>`;
      s += `<path d="M${x - 4.2} ${f(y - 1)} H${x + 4.2}" stroke="${oko}" stroke-width="1.6" stroke-linecap="round"/>`;
    }
  } else {
    const velke = oci === "siroke";
    KACH.oci.forEach(([x, y], i) => {
      const rx = velke ? 4 : 3.3;
      let ry = (velke ? 5.2 : 4.2) * Math.max(0.08, 1 - mrk * 0.94);
      if (i === 1) ry *= 1 - 0.55 * cuk;
      s += `<ellipse cx="${f(x + ox)}" cy="${f(y + oy)}" rx="${rx}" ry="${f(ry)}" fill="${oko}"/>`;
      if (mrk < 0.5 && ry > 2) {
        s += `<circle cx="${f(x + ox - (velke ? 1.2 : 1))}" cy="${f(y + oy - (velke ? 2 : 1.7))}" r="${velke ? 1.6 : 1.3}" fill="#FFF3E6"/>`;
        if (velke) s += `<circle cx="${f(x + ox + 1.3)}" cy="${f(y + oy + 1.6)}" r="0.7" fill="#FFF3E6" opacity="0.8"/>`;
      }
    });
  }
  if (usta === "usmev") s += `<path d="M84 105 Q90 109 96 105" stroke="${oko}" stroke-width="2" stroke-linecap="round" fill="none"/>`;
  else if (usta === "o") s += `<ellipse cx="90" cy="106.5" rx="2.6" ry="3.2" fill="#3A1A12"/>`;
  else if (usta === "vlnka") s += `<path d="M83 106 Q85.3 104 87.6 106 T92.2 106 T96.8 106" stroke="${oko}" stroke-width="1.8" stroke-linecap="round" fill="none"/>`;
  else if (usta === "ctverec") s += `<rect x="86" y="102.6" width="8" height="7" rx="1" fill="#3A1A12"/><rect x="87.4" y="107" width="5.2" height="1.6" rx="0.6" fill="#C4432B"/>`;
  else if (usta === "kousek") s += `<path d="M86.6 106 H93.4" stroke="${oko}" stroke-width="2.5" stroke-linecap="round"/>`;
  else s += `<path d="M84 106 H96" stroke="${oko}" stroke-width="2" stroke-linecap="round"/>`;
  return s;
};

/**
 * Ručka jako gumová hadice z ramene S do dlaně H. Ohyb je prohnutí loktu
 * v jednotkách kreslení: kladný prohne ruku doleva od směru S → H.
 */
const ruka = (S, H, { ohyb = 0, tloustka = 2.9, barva = "#B84A2B", obrys = "#7A3418", lesk = "#DE7A52", dlan = true } = {}) => {
  const dx = H[0] - S[0], dy = H[1] - S[1];
  const d = Math.hypot(dx, dy) || 1;
  const M = [(S[0] + H[0]) / 2 + (dy / d) * ohyb, (S[1] + H[1]) / 2 - (dx / d) * ohyb];
  const c = `M${pt(S)} Q${pt(M)} ${pt(H)}`;
  return (
    `<path d="${c}" stroke="${obrys}" stroke-width="${f(tloustka + 1.3)}" stroke-linecap="round" fill="none"/>` +
    `<path d="${c}" stroke="${barva}" stroke-width="${tloustka}" stroke-linecap="round" fill="none"/>` +
    (lesk ? `<path d="${c}" transform="translate(-0.35 -0.45)" stroke="${lesk}" stroke-width="${f(tloustka * 0.28)}" stroke-linecap="round" fill="none" opacity="0.75"/>` : "") +
    (dlan ? dlanKruh(H, tloustka, barva, obrys) : "")
  );
};
const dlanKruh = (H, tloustka = 2.9, barva = "#B84A2B", obrys = "#7A3418") => `<circle cx="${f(H[0])}" cy="${f(H[1])}" r="${f(tloustka * 0.8)}" fill="${barva}" stroke="${obrys}" stroke-width="0.65"/>`;
/** Zlatý náramek kousek před dlaní, natočený napříč ruky (jako u soch Kannon). */
const naramek = (S, H, ohyb = 0, s = 0.8) => {
  const dx = H[0] - S[0], dy = H[1] - S[1];
  const d = Math.hypot(dx, dy) || 1;
  const M = [(S[0] + H[0]) / 2 + (dy / d) * ohyb, (S[1] + H[1]) / 2 - (dx / d) * ohyb];
  const q = 1 - s;
  const P = [q * q * S[0] + 2 * q * s * M[0] + s * s * H[0], q * q * S[1] + 2 * q * s * M[1] + s * s * H[1]];
  const T = [2 * q * (M[0] - S[0]) + 2 * s * (H[0] - M[0]), 2 * q * (M[1] - S[1]) + 2 * s * (H[1] - M[1])];
  const a = (Math.atan2(T[1], T[0]) * 180) / Math.PI;
  return `<g transform="translate(${pt(P)}) rotate(${f(a)})"><rect x="-0.8" y="-2.1" width="1.6" height="4.2" rx="0.6" fill="#E3B95A" stroke="#8A5A1E" stroke-width="0.35"/><path d="M-0.3 -1.5 V1.5" stroke="#FFF2C4" stroke-width="0.35" opacity="0.8"/></g>`;
};

/* ——— Nářadí na rovinu (v souřadnicích panelu, kolem dlaně) ——— */

/** Vodováha: dřevěné tělo, trubička se zelenou kapalinou a bublinou posunutou o b. */
const vodovaha = (x, y, w, h, b, { telo = "#C9A06A", hrana = "#7A5A3C" } = {}) => {
  const tw = w * 0.32, th = h * 0.56, tx = x + w / 2 - tw / 2, ty = y + (h - th) / 2;
  const bx = clamp(x + w / 2 + b, tx + th * 0.6, tx + tw - th * 0.6);
  return (
    `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(h * 0.2)}" fill="${telo}" stroke="${hrana}" stroke-width="0.5"/>` +
    `<path d="M${f(x + 1)} ${f(y + h * 0.28)} H${f(x + w - 1)}" stroke="#F0D4A4" stroke-width="${f(h * 0.12)}" stroke-linecap="round" opacity="0.7"/>` +
    `<rect x="${f(tx)}" y="${f(ty)}" width="${f(tw)}" height="${f(th)}" rx="${f(th / 2)}" fill="#2E3A2C"/>` +
    `<rect x="${f(tx + 0.3)}" y="${f(ty + 0.3)}" width="${f(tw - 0.6)}" height="${f(th - 0.6)}" rx="${f(th / 2 - 0.3)}" fill="#BCE07A"/>` +
    `<path d="M${f(x + w / 2 - th * 0.75)} ${f(ty)} V${f(ty + th)} M${f(x + w / 2 + th * 0.75)} ${f(ty)} V${f(ty + th)}" stroke="#2E3A2C" stroke-width="${f(th * 0.12)}"/>` +
    `<ellipse cx="${f(bx)}" cy="${f(ty + th / 2)}" rx="${f(th * 0.62)}" ry="${f(th * 0.34)}" fill="#F6FFE6"/>` +
    `<ellipse cx="${f(bx - th * 0.18)}" cy="${f(ty + th * 0.4)}" rx="${f(th * 0.2)}" ry="${f(th * 0.1)}" fill="#FFFFFF"/>` +
    [x + w * 0.12, x + w * 0.88].map((cx) => `<circle cx="${f(cx)}" cy="${f(y + h / 2)}" r="${f(h * 0.16)}" fill="${hrana}" opacity="0.6"/>`).join("")
  );
};

/** Palička kizuchi: násada z dlaně ve směru a (stupně), na konci hlava napříč. */
const palicka = (H, a, { delka = 9, hlava = [6.4, 3.8] } = {}) => {
  const u = rad(a);
  const E = [H[0] + Math.cos(u) * delka, H[1] + Math.sin(u) * delka];
  const [hw, hh] = hlava;
  return (
    `<path d="M${pt(H)} L${pt(E)}" stroke="#6E4A2A" stroke-width="1.9" stroke-linecap="round"/>` +
    `<path d="M${pt(H)} L${pt(E)}" stroke="#D8B47A" stroke-width="1.1" stroke-linecap="round"/>` +
    `<g transform="translate(${pt(E)}) rotate(${f(a)})">` +
    `<rect x="${f(-hh / 2)}" y="${f(-hw / 2)}" width="${f(hh)}" height="${f(hw)}" rx="${f(hh * 0.3)}" fill="#A87848" stroke="#5A3A1E" stroke-width="0.5"/>` +
    `<path d="M${f(-hh / 2)} ${f(-hw / 2 + 0.9)} H${f(hh / 2)} M${f(-hh / 2)} ${f(hw / 2 - 0.9)} H${f(hh / 2)}" stroke="#5A3A1E" stroke-width="0.45"/>` +
    `<path d="M${f(-hh * 0.18)} ${f(-hw / 2 + 1.4)} V${f(hw / 2 - 1.4)}" stroke="#D8AE7E" stroke-width="0.5" opacity="0.7"/></g>`
  );
};

/** Ocelový úhelník sašigane: dlouhé rameno svisle z dlaně nahoru, krátké ven do strany (smer ±1). */
const sasigane = (H, smer = -1, { delka = 30, kratke = 15 } = {}) => {
  const [x, y] = H;
  const roh = [x, y + 5];
  const dl = `M${f(x - 1.1)} ${f(y - delka + 5)} H${f(x + 1.1)} V${f(roh[1] + 1.1)} H${f(x - 1.1)} Z`;
  const kr = smer < 0 ? `M${f(x - kratke)} ${f(roh[1] - 1.1)} H${f(x + 1.1)} V${f(roh[1] + 1.1)} H${f(x - kratke)} Z` : `M${f(x - 1.1)} ${f(roh[1] - 1.1)} H${f(x + kratke)} V${f(roh[1] + 1.1)} H${f(x - 1.1)} Z`;
  let ryski = "";
  for (let i = 1; i * 1.5 < delka - 2; i++) {
    const yy = roh[1] - 1.1 - i * 1.5;
    ryski += `M${f(x + 1.1)} ${f(yy)} h${i % 5 === 0 ? -1.4 : -0.7} `;
  }
  for (let i = 1; i * 1.5 < kratke - 2; i++) {
    const xx = x + smer * (1.1 + i * 1.5);
    ryski += `M${f(xx)} ${f(roh[1] - 1.1)} v${i % 5 === 0 ? 1.4 : 0.7} `;
  }
  return (
    `<path d="${dl}" fill="url(#ocel)" stroke="#4E555C" stroke-width="0.4"/>` +
    `<path d="${kr}" fill="url(#ocel)" stroke="#4E555C" stroke-width="0.4"/>` +
    `<path d="${ryski}" stroke="#3A4046" stroke-width="0.22"/>` +
    /* značka pravého úhlu v rohu */
    `<path d="M${f(x + smer * 2.8)} ${f(roh[1] - 1.1)} V${f(roh[1] - 3.9)} H${f(x + (smer < 0 ? -1.1 : 1.1))}" stroke="#C4432B" stroke-width="0.35" fill="none" transform="translate(${smer < 0 ? 0 : 0} 0)"/>`
  );
};

/**
 * Tesařská inkoustová šňůra sumicubo: vyřezávané dřevěné tělo s kalamářem
 * a cívkou. Šňůra vychází ze špičky vpravo (vrací se špička).
 */
const sumicubo = (H) => {
  const [x, y] = H;
  const T = (px, py) => pt([x + px, y + py]);
  return (
    `<path d="M${T(-9, 0)} C${T(-9, -3.8)} ${T(-5, -4.4)} ${T(0, -4)} C${T(5, -3.6)} ${T(8.4, -2.2)} ${T(10, 0)} C${T(8.4, 2.2)} ${T(5, 3.6)} ${T(0, 4)} C${T(-5, 4.4)} ${T(-9, 3.8)} ${T(-9, 0)} Z" fill="#8A5A34" stroke="#3E2414" stroke-width="0.5"/>` +
    /* vyřezávaná hlava jeřába na špičce */
    `<path d="M${T(6.4, -2.6)} Q${T(9.6, -4.6)} ${T(10.6, -1.4)} M${T(7.6, 1.8)} Q${T(9.2, 3.4)} ${T(6.2, 3)}" stroke="#C08A5A" stroke-width="0.45" fill="none" stroke-linecap="round"/>` +
    /* kalamář s vatou */
    `<circle cx="${f(x + 3.4)}" cy="${f(y)}" r="2.5" fill="#1E1814" stroke="#C08A5A" stroke-width="0.35"/>` +
    `<g fill="#3A3230">${[[2.6, -0.6], [3.8, 0.7], [4.3, -0.9], [2.9, 0.9]].map(([a, b]) => `<circle cx="${f(x + a)}" cy="${f(y + b)}" r="0.45"/>`).join("")}</g>` +
    /* cívka s klikou */
    `<circle cx="${f(x - 4.8)}" cy="${f(y)}" r="3" fill="#B98258" stroke="#3E2414" stroke-width="0.4"/>` +
    `<path d="M${T(-4.8, -2.4)} V${f(y + 2.4)} M${T(-7.2, 0)} H${f(x - 2.4)}" stroke="#5E3A20" stroke-width="0.45"/>` +
    `<path d="M${T(-4.8, -3)} L${T(-6.4, -5.8)}" stroke="#3E2414" stroke-width="0.7" stroke-linecap="round"/><circle cx="${f(x - 6.6)}" cy="${f(y - 6.2)}" r="0.9" fill="#D8B47A" stroke="#3E2414" stroke-width="0.3"/>`
  );
};
const SUMICUBO_SPICKA = [10.4, 0];

/** Karuko: dřevěný kolíček s jehlou na konci šňůry. */
const karuko = (P) =>
  `<rect x="${f(P[0] - 1.1)}" y="${f(P[1] - 2.6)}" width="2.2" height="3.4" rx="0.6" fill="#D8B47A" stroke="#5A3A1E" stroke-width="0.35"/>` +
  `<path d="M${f(P[0])} ${f(P[1] + 0.8)} V${f(P[1] + 2.8)}" stroke="#8A9096" stroke-width="0.4" stroke-linecap="round"/>`;

/** Razítko hanko: lakovaná násada (osa ve směru a), rumělková plocha na konci. */
const hanko = (H, a = 90, { delka = 13 } = {}) => {
  const u = rad(a);
  const A = [H[0] - Math.cos(u) * delka * 0.45, H[1] - Math.sin(u) * delka * 0.45];
  return (
    `<g transform="translate(${pt(A)}) rotate(${f(a - 90)})">` +
    `<rect x="-2.2" y="-1.4" width="4.4" height="${f(delka)}" rx="1.2" fill="#2A1E1E" stroke="#120C0C" stroke-width="0.4"/>` +
    `<ellipse cx="0" cy="-1.2" rx="2.2" ry="1.3" fill="#D9B25E" stroke="#8A6A2A" stroke-width="0.3"/>` +
    `<rect x="-2.2" y="1.4" width="4.4" height="1.2" fill="#D9B25E"/>` +
    `<rect x="-2.3" y="${f(delka - 2.6)}" width="4.6" height="1.6" rx="0.5" fill="#C4432B"/>` +
    `<path d="M-1 0.4 V${f(delka - 3.4)}" stroke="#5A4A4A" stroke-width="0.5" opacity="0.6"/></g>`
  );
};

/** Olovnice sagefuri: provázek z dlaně, mosazné závaží vychýlené o úhel th (radiány). */
const olovnice = (H, th, L) => {
  const B = [H[0] + Math.sin(th) * L, H[1] + Math.cos(th) * L];
  return (
    `<path d="M${pt(H)} L${pt(B)}" stroke="#EDE3CC" stroke-width="0.45"/>` +
    `<g transform="translate(${pt(B)}) rotate(${f((-th * 180) / Math.PI)})">` +
    `<rect x="-1.7" y="-0.4" width="3.4" height="2.2" rx="0.5" fill="url(#mosaz)" stroke="#6E4A1E" stroke-width="0.3"/>` +
    `<path d="M-2 1.8 H2 L0 7.4 Z" fill="url(#mosaz)" stroke="#6E4A1E" stroke-width="0.3" stroke-linejoin="round"/>` +
    `<path d="M-0.9 2.4 L-0.2 5.6" stroke="#FFF2C4" stroke-width="0.4" stroke-linecap="round" opacity="0.8"/></g>`
  );
};
const NASTROJ_DEFS =
  `<linearGradient id="ocel" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#EEF1F4"/><stop offset="0.5" stop-color="#C3CAD1"/><stop offset="1" stop-color="#8E979F"/></linearGradient>` +
  `<linearGradient id="mosaz" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#F6DE8E"/><stop offset="0.5" stop-color="#D2A548"/><stop offset="1" stop-color="#8E6424"/></linearGradient>`;

/* ═══════════════════════════════════════════════════════════════════
 * 1 — SVATOZÁŘ PRAVÉHO ÚHLU
 * Kannon má tisíc rukou, aby dosáhla na každé trápení. Kachlík jich má
 * šest a dosáhne na každou křivost: v rukou drží úhelník sašigane,
 * tesařskou šňůru sumicubo s kolíčkem karuko, paličku kizuchi, razítko
 * 正 a olovnici sagefuri. Na hlavě nosí vodováhu a za zády svatozář —
 * čtvercovou, jak jinak: hrany s milimetrovou stupnicí, vnořené čtverce
 * jako Albersova Pocta čtverci (rumělka v šachovnici ičimacu, noc
 * z loga) a kolem paprsky, které končí přesně na čtverci. Stojí na geta
 * na stupních z kachlí, jako Buddha na podstavci šumidan.
 *
 * Myš je vítr: rozhoupe olovnici a Kachlíka to znervózní. Kliknutí:
 * napne šňůru přes svatozář, cvrnkne a zůstane po ní rovná čára, kterou
 * potvrdí razítkem. Kliknutí na kachel podstavce ho vyrazí nakřivo —
 * a Kachlík ho paličkou srovná. Občas se kachel nakřiví i sám.
 * ═══════════════════════════════════════════════════════════════════ */
const V1 = (() => {
  const FIG = { x: 90, y: 140, s: 0.6 };
  const FIGT = `translate(${FIG.x} ${FIG.y}) scale(${FIG.s}) translate(-90 -${KACH.dno})`;
  const vPostave = (s) => `<g transform="${FIGT}">${s}</g>`;
  const naPanel = ([x, y]) => [FIG.x + (x - 90) * FIG.s, FIG.y + (y - KACH.dno) * FIG.s];
  const C = [90, 92];
  const D = { x: 38, y: 40, w: 104, h: 104 };
  /* Albersova Pocta čtverci: okraje nahoře, po stranách a dole v poměru 13 : 9 : 5 */
  const CTVERCE = [
    { x: 38, y: 40, s: 104, fill: "url(#kr1-zlato)" },
    { x: 47, y: 53, s: 86, fill: "url(#kr1-ichimatsu)" },
    { x: 56, y: 66, s: 68, fill: "#2E2D66" },
    { x: 65, y: 79, s: 50, fill: "url(#kr1-stred)" },
  ];
  const HLAVA = naPanel([90, 50])[1];
  const VAHA = { x: 70, y: HLAVA - 5.6, w: 40, h: 5.6 };

  /* Ramena za deskou těla (její souřadnice) a klidové polohy dlaní na panelu */
  const RAMENA = {
    L1: naPanel([48, 66]), L2: naPanel([48, 94]), L3: naPanel([48, 122]),
    P1: naPanel([132, 66]), P2: naPanel([132, 94]), P3: naPanel([132, 122]),
  };
  const KLID = { L1: [33, 58], L2: [22, 92], L3: [31, 121], P1: [147, 57], P2: [158, 92], P3: [149, 117] };
  const OHYB = { L1: 7, L2: 6, L3: -6, P1: -7, P2: -6, P3: 6 };
  const DECH = { L1: 0, L2: 1.7, L3: 3.1, P1: 0.8, P2: 2.4, P3: 4 };
  const OLOVNICE_L = 15;
  /* Výšky čar, které šňůra natiskne do zlatého pásu nad hlavou */
  const RADKY = [47, 43.5, 50.5];

  /* Podstavec: tři stupně z kachlí, glazury souměrně podle středu */
  const PATRA = [
    { y: 140, x0: 55, vzor: "ikiriki" },
    { y: 150, x0: 40, vzor: "kikikkikik" },
    { y: 160, x0: 25, vzor: "ikikikrkikiki" },
  ];
  const GLAZURY = {
    i: { telo: "#34336A", ram: "#5E5BA4", motiv: "#D9B25E", lesk: "#8E8CD0" },
    k: { telo: "#EFE6D2", ram: "#C9B99A", motiv: "#34336A", lesk: "#FFFFFF" },
    r: { telo: "#C4432B", ram: "#E58266", motiv: "#F4EBDD", lesk: "#F6B39C" },
    z: { telo: "#C4432B", ram: "#E58266", motiv: "#F4EBDD", lesk: "#F6B39C" },
  };
  const KACHLE = PATRA.flatMap((p, pi) =>
    [...p.vzor].map((g, i) => ({ pi, i, x: p.x0 + i * 10, y: p.y, g: g === "z" ? "r" : g, sei: g === "r" || g === "z" })),
  );
  const ROH_KACHLE = (k, uhel) => {
    /* zvednutý roh: při kladném úhlu (po směru hodin) levý horní, jinak pravý horní */
    const u = rad(uhel);
    const lx = uhel >= 0 ? -4.6 : 4.6, ly = -4.6;
    return [k.x + 5 + lx * Math.cos(u) - ly * Math.sin(u), k.y + 5 + lx * Math.sin(u) + ly * Math.cos(u)];
  };

  /* ——— Statické vrstvy ——— */
  const vrstvaZare = () =>
    `<circle cx="${C[0]}" cy="${C[1] - 4}" r="100" fill="url(#kr1-zare)"/>` +
    `<rect x="${D.x - 10}" y="${D.y - 10}" width="${D.w + 20}" height="${D.h + 20}" rx="14" fill="url(#kr1-zare-ctverec)" opacity="0.7"/>`;

  const vrstvaPaprsky = () => {
    let dl = "", kr = "", tecky = "";
    const N = 104;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 + Math.PI / N;
      const k = 1 / Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a)));
      const dlouhy = i % 2 === 0;
      const r0 = 55 * k, r1 = (dlouhy ? 80 : 69) * k;
      const A = [C[0] + Math.cos(a) * r0, C[1] + Math.sin(a) * r0];
      const B = [C[0] + Math.cos(a) * r1, C[1] + Math.sin(a) * r1];
      if (dlouhy) {
        dl += `M${pt(A)} L${pt(B)} `;
        tecky += `<rect x="${f(B[0] - 0.55)}" y="${f(B[1] - 0.55)}" width="1.1" height="1.1"/>`;
      } else kr += `M${pt(A)} L${pt(B)} `;
    }
    return (
      `<path d="${dl}" stroke="url(#kr1-paprsek)" stroke-width="0.5"/>` +
      `<path d="${kr}" stroke="url(#kr1-paprsek)" stroke-width="0.36" opacity="0.85"/>` +
      `<g fill="#E9C46E">${tecky}</g>` +
      /* dva tenké čtverce, na kterých paprsky končí */
      `<rect x="${C[0] - 80}" y="${C[1] - 80}" width="160" height="160" fill="none" stroke="#D9B25E" stroke-width="0.3" stroke-dasharray="0.6 2.4" opacity="0.7"/>`
    );
  };

  const vrstvaSvatozar = () => {
    let s = `<rect x="${D.x + 1.6}" y="${D.y + 2.4}" width="${D.w}" height="${D.h}" fill="#5E160B" opacity="0.35"/>`;
    for (const c of CTVERCE) s += `<rect x="${c.x}" y="${c.y}" width="${c.s}" height="${c.s}" fill="${c.fill}"/>`;
    /* milimetrový papír ve zlatě a mezi čtverci zlaté linky kirikane */
    s += `<rect x="${D.x}" y="${D.y}" width="${D.w}" height="${D.h}" fill="url(#kr1-mrizka)" opacity="0.55"/>`;
    s += CTVERCE.slice(1).map((c) => `<rect x="${c.x}" y="${c.y}" width="${c.s}" height="${c.s}" fill="none" stroke="#F2D27A" stroke-width="0.6"/>`).join("");
    s += `<rect x="${D.x}" y="${D.y}" width="${D.w}" height="${D.h}" fill="none" stroke="#6E1C0E" stroke-width="0.9"/>`;
    s += `<rect x="${D.x + 1.6}" y="${D.y + 1.6}" width="${D.w - 3.2}" height="${D.h - 3.2}" fill="none" stroke="#B88A2E" stroke-width="0.35"/>`;
    /* stupnice po obvodu: po dvou dílcích, každý pátý delší */
    let ryski = "";
    for (let i = 1; i < 52; i++) {
      const L = i % 5 === 0 ? 3.2 : 1.5;
      const p = D.x + i * 2;
      const q = D.y + i * 2;
      ryski += `M${p} ${D.y + 1.6} v${L} M${p} ${D.y + D.h - 1.6} v${-L} M${D.x + 1.6} ${q} h${L} M${D.x + D.w - 1.6} ${q} h${-L} `;
    }
    s += `<path d="${ryski}" stroke="#7A4E16" stroke-width="0.3"/>`;
    /* stupnice i na noční pruh */
    let noc = "";
    for (let i = 1; i < 34; i++) {
      const L = i % 5 === 0 ? 2.4 : 1.1;
      noc += `M${56 + i * 2} 66 v${L} M56 ${66 + i * 2} h${L} M124 ${66 + i * 2} h${-L} `;
    }
    s += `<path d="${noc}" stroke="#D9B25E" stroke-width="0.3" opacity="0.85"/>`;
    /* rohy jako na kovaném rámu: čtvereček v každém rohu */
    s += [[D.x, D.y], [D.x + D.w, D.y], [D.x, D.y + D.h], [D.x + D.w, D.y + D.h]].map(([x, y]) => `<rect x="${x - 2.4}" y="${y - 2.4}" width="4.8" height="4.8" fill="#D9B25E" stroke="#6E1C0E" stroke-width="0.6"/><rect x="${x - 1}" y="${y - 1}" width="2" height="2" fill="#6E1C0E"/>`).join("");
    return s;
  };

  const vrstvaPostava = () =>
    vPostave(`<g filter="url(#kr1-tah)">${kachGeta({})}${kachNohy({})}${kachTelo("kr1")}</g>`);

  /* ——— Živé vrstvy ——— */
  const vrstvaLesk = (st) => {
    if (st.lesk < 0) return "";
    const x = lerp(D.x - 40, D.x + D.w + 40, st.lesk);
    return `<g clip-path="url(#kr1-deska)"><rect x="${f(x - 7)}" y="${D.y - 30}" width="14" height="${D.h + 60}" fill="url(#kr1-lesk)" transform="rotate(28 ${f(x)} ${C[1]})"/></g>`;
  };

  const vrstvaTisky = (st) => {
    let s = "";
    for (const r of st.tisky) {
      const rr = rng(r.seed);
      let dash = "";
      let zbyva = D.w;
      while (zbyva > 0) {
        const a = 6 + rr() * 22;
        dash += `${f(a)} ${f(0.25 + rr() * 0.5)} `;
        zbyva -= a;
      }
      s += `<g opacity="${f(r.op)}"><path d="M${D.x + 0.6} ${f(r.y)} H${D.x + D.w - 0.6}" stroke="#1E1A1A" stroke-width="0.6" stroke-dasharray="${dash}"/>`;
      s += `<g fill="#1E1A1A">${Array.from({ length: 9 }, () => `<circle cx="${f(D.x + 3 + rr() * (D.w - 6))}" cy="${f(r.y + (rr() - 0.5) * 2.4)}" r="${f(0.12 + rr() * 0.22)}"/>`).join("")}</g>`;
      if (r.razitko) s += seiZnak(D.x + D.w - 9.4, r.y - 2.6, 6.2, { barva: "#C4432B", tah: "#FBF2DC", sirka: 0.55 });
      s += `</g>`;
    }
    return s;
  };

  /* Šňůra mezi špičkou sumicuba a kolíčkem: napjatá, zvednutá, nebo kmitá */
  const snura = (st) => {
    const A = [st.ruce.L2[0] + SUMICUBO_SPICKA[0], st.ruce.L2[1] + SUMICUBO_SPICKA[1]];
    const B = [st.ruce.P2[0] - 1.4, st.ruce.P2[1] - 0.6];
    let d;
    if (st.snura.typ === "tah") d = `M${pt(A)} L${pt(st.snura.P)} L${pt(B)}`;
    else if (st.snura.typ === "kmit") {
      const body = [];
      for (let i = 0; i <= 28; i++) {
        const s = i / 28;
        const P = lerpP(A, B, s);
        P[1] += st.snura.A1 * Math.sin(Math.PI * s) + st.snura.A2 * Math.sin(2 * Math.PI * s);
        body.push(P);
      }
      d = cara(body);
    } else d = `M${pt(A)} L${pt(B)}`;
    return `<path d="${d}" stroke="#1E1A1A" stroke-width="0.55" fill="none" stroke-linejoin="round"/>`;
  };

  /* Horní a prostřední ruce jsou za deskou těla, i se šňůrou */
  const vrstvaRuce = (st) => {
    const R = st.ruce;
    let s = "";
    s += ruka(RAMENA.L1, R.L1, { ohyb: OHYB.L1 }) + naramek(RAMENA.L1, R.L1, OHYB.L1) + sasigane(R.L1, -1);
    s += ruka(RAMENA.P1, R.P1, { ohyb: OHYB.P1 }) + naramek(RAMENA.P1, R.P1, OHYB.P1) + hanko(R.P1, st.hankoUhel);
    s += snura(st);
    s += ruka(RAMENA.L2, R.L2, { ohyb: OHYB.L2 }) + naramek(RAMENA.L2, R.L2, OHYB.L2) + sumicubo(R.L2);
    s += ruka(RAMENA.P2, R.P2, { ohyb: OHYB.P2 }) + naramek(RAMENA.P2, R.P2, OHYB.P2) + karuko([R.P2[0] - 1.4, R.P2[1] - 0.6]);
    /* dlaně přes nářadí, aby ho držely */
    s += dlanKruh(R.L1) + dlanKruh(R.L2);
    return s;
  };

  /* Spodní ruce jsou před podstavcem: palička a olovnice */
  const vrstvaRuceDole = (st) => {
    const R = st.ruce;
    return (
      ruka(RAMENA.L3, R.L3, { ohyb: st.ohybL3 }) +
      naramek(RAMENA.L3, R.L3, st.ohybL3) +
      palicka(R.L3, st.palickaUhel) +
      dlanKruh(R.L3) +
      ruka(RAMENA.P3, R.P3, { ohyb: st.ohybP3 }) +
      naramek(RAMENA.P3, R.P3, st.ohybP3) +
      olovnice([R.P3[0], R.P3[1] + 1.6], st.olovnice, OLOVNICE_L)
    );
  };

  const vrstvaPodstavec = (st) => {
    let s = `<ellipse cx="90" cy="172" rx="70" ry="3.4" fill="#2A2440" opacity="0.18"/>`;
    for (const p of PATRA) {
      const w = p.vzor.length * 10;
      s += `<rect x="${p.x0 - 0.8}" y="${p.y}" width="${w + 1.6}" height="10" fill="#E6D8BC" stroke="#6B5D4F" stroke-width="0.6"/>`;
    }
    st.kachle.forEach((k, idx) => {
      const g = GLAZURY[k.g];
      const uhel = st.uhly[idx];
      let t = `<rect x="${k.x + 0.45}" y="${k.y + 0.45}" width="9.1" height="9.1" rx="0.8" fill="${g.telo}" stroke="#2A2230" stroke-width="0.35"/>`;
      t += `<rect x="${k.x + 2}" y="${k.y + 2}" width="6" height="6" rx="0.5" fill="none" stroke="${g.ram}" stroke-width="0.5"/>`;
      if (k.sei) t += seiZnak(k.x + 2.6, k.y + 2.6, 4.8, { barva: "none", tah: g.motiv, uhel: 0, sirka: 0.45 });
      else t += `<rect x="${k.x + 4.1}" y="${k.y + 4.1}" width="1.8" height="1.8" fill="${g.motiv}"/>`;
      t += `<path d="M${k.x + 1.4} ${k.y + 2.6} V${k.y + 1.4} H${k.x + 3.2}" stroke="${g.lesk}" stroke-width="0.45" fill="none" stroke-linecap="round" opacity="0.7"/>`;
      s += Math.abs(uhel) > 0.01 ? `<g transform="rotate(${f(uhel)} ${k.x + 5} ${k.y + 5})">${t}</g>` : t;
    });
    /* zlaté hrany stupňů a stín geta */
    s += PATRA.map((p) => `<path d="M${p.x0 - 0.8} ${p.y} h${p.vzor.length * 10 + 1.6}" stroke="#D9B25E" stroke-width="0.8"/>`).join("");
    s += `<ellipse cx="90" cy="140.2" rx="21" ry="1.5" fill="#1D1B3F" opacity="0.4"/>`;
    return s;
  };

  /* mezi obočím byakugó jako u Buddhy — Kachlíkovo je čtvercové */
  const vrstvaTvar = (st) =>
    vPostave(
      kachTvar("kr1", { dx: st.pohled[0], dy: st.pohled[1], mrk: st.mrk, cuk: st.cuk, oci: st.oci, oboci: st.oboci, usta: st.usta, tvare: st.tvare }) +
        `<rect x="88.3" y="${st.oboci === "zdvizene" ? 76.6 : 80.2}" width="3.4" height="3.4" rx="0.4" fill="#E9C46E" stroke="#8A5A1E" stroke-width="0.5"/><rect x="88.9" y="${st.oboci === "zdvizene" ? 77.2 : 80.8}" width="1.1" height="1.1" fill="#FFF6D8"/>`,
    );

  const vrstvaVodovaha = (st) =>
    `<rect x="${VAHA.x + 1}" y="${VAHA.y + VAHA.h - 0.4}" width="${VAHA.w - 2}" height="1" fill="#3A2E28" opacity="0.25"/>` +
    vodovaha(VAHA.x, VAHA.y, VAHA.w, VAHA.h, st.bublina);

  const vrstvaJiskry = (st) =>
    st.jiskry
      .map((j) => {
        const u = j.vek / j.zivot;
        const op = clamp(Math.min(u / 0.1, (1 - u) / 0.45)) * (0.6 + 0.4 * Math.sin(st.t * 9 + j.fz));
        const r = j.r * (1 - u * 0.3);
        return `<rect x="${f(j.x - r / 2)}" y="${f(j.y - r / 2)}" width="${f(r)}" height="${f(r)}" fill="${u < 0.3 ? "#FFF3CF" : "#E9C46E"}" opacity="${f(op)}"/>`;
      })
      .join("") +
    st.kapky.map((k) => `<circle cx="${f(k.x)}" cy="${f(k.y)}" r="${f(k.r)}" fill="#1E1A1A" opacity="${f(clamp(1 - k.vek / k.zivot))}"/>`).join("");

  const defs = () =>
    kachDefs("kr1") +
    NASTROJ_DEFS +
    tahFiltr("kr1-tah") +
    `<radialGradient id="kr1-zare" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#F6C86A" stop-opacity="0.5"/><stop offset="0.55" stop-color="#E9A44A" stop-opacity="0.16"/><stop offset="1" stop-color="#E9A44A" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="kr1-zare-ctverec" cx="0.5" cy="0.5" r="0.62"><stop offset="0.7" stop-color="#FBE3A0" stop-opacity="0.45"/><stop offset="1" stop-color="#FBE3A0" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="kr1-zlato" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FBE7A6"/><stop offset="0.45" stop-color="#EBC35E"/><stop offset="0.8" stop-color="#D49A36"/><stop offset="1" stop-color="#B9782A"/></linearGradient>` +
    `<radialGradient id="kr1-stred" cx="0.5" cy="0.4" r="0.7"><stop offset="0" stop-color="#FFF4CC"/><stop offset="1" stop-color="#E9C46E"/></radialGradient>` +
    `<linearGradient id="kr1-paprsek" gradientUnits="userSpaceOnUse" x1="${C[0]}" y1="0" x2="${C[0]}" y2="180"><stop offset="0" stop-color="#C99A3E"/><stop offset="1" stop-color="#E0B85A"/></linearGradient>` +
    `<linearGradient id="kr1-lesk" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="0.5" stop-color="#FFFBE8" stop-opacity="0.4"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>` +
    `<pattern id="kr1-ichimatsu" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="translate(47 53)"><rect width="6" height="6" fill="#C4432B"/><rect width="3" height="3" fill="#A33520"/><rect x="3" y="3" width="3" height="3" fill="#A33520"/></pattern>` +
    `<pattern id="kr1-mrizka" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="translate(38 40)"><path d="M4 0 V4 M0 4 H4" stroke="#FFF4CC" stroke-width="0.25"/></pattern>` +
    `<clipPath id="kr1-deska"><rect x="${D.x}" y="${D.y}" width="${D.w}" height="${D.h}"/></clipPath>`;

  /* ——— Simulace ——— */
  const novaDynamika = () => ({
    obrad: null, oprava: null, dalsiKriva: 6.5, uhly: KACHLE.map(() => 0), tisky: [], radek: 0,
    th: 0.05, om: 0, b: 0, vb: 0, vitr: 0, mysPred: null, pivotPred: null, pivotV: [0, 0],
    jiskry: [], kapky: [], akum: 0, nahoda: rng(4242), zvuk: [], pohled: [0, 0], klid: 0, uPred: -1, oPred: -1,
  });

  /*
    Obřad se šňůrou (u od kliknutí). Horní ruce nejdřív uhnou nahoru, aby
    se prostřední, které šňůru zvedají, s nimi nezkřížily. Cvrnká ruka
    s razítkem: sáhne na šňůru shora, zvedne ji a pustí, pak čáru potvrdí.
  */
  const NAD_HLAVOU = { L1: [26, 33], P1: [126, 37] };
  const stavObradu = (u, yR) => {
    const zved = krokem(0.1, 0.55, u) * (1 - krokem(2.0, 2.6, u));
    const uhni = smooth(u / 0.35) * (1 - krokem(2.1, 2.7, u));
    const L1 = lerpP(KLID.L1, NAD_HLAVOU.L1, uhni);
    const L2 = lerpP(KLID.L2, [21, yR], zved);
    const P2 = lerpP(KLID.P2, [159, yR], zved);
    const A = [L2[0] + SUMICUBO_SPICKA[0], L2[1]], B = [P2[0] - 1.4, P2[1] - 0.6];
    const stred = lerpP(A, B, 0.5);
    let P1, snura = { typ: "rovna" };
    if (u < 0.86) {
      const nad = [stred[0], stred[1] - 7.5 * krokem(0.62, 0.84, u)];
      P1 = lerpP(lerpP(KLID.P1, NAD_HLAVOU.P1, smooth(u / 0.4)), [nad[0] + 1.2, nad[1] - 2.6], krokem(0.42, 0.72, u));
      if (u > 0.62) snura = { typ: "tah", P: nad };
    } else if (u < 1.55) {
      const tau = u - 0.86;
      P1 = lerpP([stred[0] + 1.2, stred[1] - 10.1], NAD_HLAVOU.P1, smooth(tau / 0.5));
      snura = { typ: "kmit", A1: -7.5 * Math.exp(-tau / 0.16) * Math.cos(2 * Math.PI * 11 * tau), A2: -1.6 * Math.exp(-tau / 0.09) * Math.sin(2 * Math.PI * 19 * tau) };
    } else {
      /* razítko na pravý konec čáry, pak zpátky dolů */
      const cil = [D.x + D.w - 6.3, yR - 6];
      const tisk = u > 1.95 && u < 2.12 ? Math.sin(Math.PI * clamp((u - 1.95) / 0.17)) : 0;
      P1 = lerpP(lerpP(NAD_HLAVOU.P1, [cil[0], cil[1] + 3.2 * tisk], smooth((u - 1.55) / 0.35)), KLID.P1, krokem(2.2, 2.75, u));
    }
    return { L1, L2, P2, P1, snura };
  };
  const OBRAD_KONEC = 3.4;

  /*
    Oprava kachle: k levé půlce podstavce sáhne ruka s paličkou, k pravé
    ruka s olovnicí — mosazné závaží je těžké, poslouží jako kladívko.
    Tři údery do zvednutého rohu, pak zpátky.
  */
  const stavOpravy = (o, t) => {
    const u = t - o.oprava;
    const k = KACHLE[o.i];
    const vlevo = k.x + 5 <= 90;
    const roh = ROH_KACHLE(k, o.znamenko * 3);
    const klid = vlevo ? KLID.L3 : KLID.P3;
    let H = klid, a = -90, ohyb = vlevo ? OHYB.L3 : OHYB.P3, tam = 0;
    if (u > 0) {
      tam = smooth(u / 0.45) * (1 - krokem(1.5, 1.95, u));
      const uder = [0.55, 0.9, 1.25].reduce((m, c) => Math.max(m, u > c - 0.1 && u < c + 0.08 ? Math.sin(Math.PI * clamp((u - c + 0.1) / 0.18)) : 0), 0);
      const cil = vlevo ? [roh[0] - 7.2 + 2.4 * uder, roh[1] - 6.4 + 2.2 * uder] : [roh[0], roh[1] - OLOVNICE_L - 9.6 + 2.6 * uder];
      H = lerpP(klid, cil, tam);
      a = lerp(-90, 40, tam);
      ohyb = lerp(ohyb, vlevo ? -4 : 5, tam);
    }
    return { H, a, ohyb, u, vlevo, tam };
  };

  const krok = (dyn, t, dt, vstup) => {
    const R = dyn.nahoda;
    /* — kliknutí: na kachel podstavce, jinak obřad se šňůrou — */
    if (vstup.kliky && vstup.kliky.length) {
      for (const c of vstup.kliky.splice(0)) {
        const zasah = KACHLE.findIndex((k) => c.x >= k.x - 0.5 && c.x <= k.x + 10.5 && c.y >= k.y - 0.5 && c.y <= k.y + 10.5);
        if (zasah >= 0 && !dyn.oprava) {
          const z = R() < 0.5 ? -1 : 1;
          dyn.oprava = { i: zasah, start: t, znamenko: z, cil: z * (4.8 + R() * 1.4), naraz: true, oprava: t + 1.0 };
          dyn.uhly[zasah] = dyn.oprava.cil;
          dyn.zvuk.push({ druh: "cvak", pan: (KACHLE[zasah].x - 90) / 90 });
          dyn.b += 0.4;
          dyn.vb += z * 22;
        } else if (zasah < 0 && !dyn.obrad) {
          dyn.obrad = { start: t, y: RADKY[dyn.radek % RADKY.length] };
          dyn.radek++;
        }
      }
    }
    /* — sama od sebe se občas nějaká kachle nakřiví — */
    if (!dyn.oprava && !dyn.obrad && t > dyn.dalsiKriva) {
      const i = Math.floor(R() * KACHLE.length);
      const z = R() < 0.5 ? -1 : 1;
      dyn.oprava = { i, start: t, znamenko: z, cil: z * (2.8 + R() * 1), naraz: false, oprava: t + 1.9 };
      dyn.zvuk.push({ druh: "vrz", pan: (KACHLE[i].x - 90) / 90 });
    }
    const o = dyn.oprava;
    if (o) {
      const u = t - o.start;
      if (!o.naraz) dyn.uhly[o.i] = o.cil * smooth(u / 1.6) * (u < 1.9 ? 1 : 1);
      const uo = t - o.oprava, uoP = dyn.oPred;
      for (const [c, k, druh] of [[0.55, 0.35, "tuk"], [0.9, 0.28, "tuk"], [1.25, 0, "tik"]]) {
        if (uoP < c && uo >= c) {
          dyn.uhly[o.i] *= k;
          dyn.zvuk.push({ druh, sila: 0.9, pan: (KACHLE[o.i].x - 90) / 90 });
          dyn.vb += (R() - 0.5) * 14;
        }
      }
      if (uoP < 1.55 && uo >= 1.55) dyn.zvuk.push({ druh: "rin", sila: 0.5 });
      dyn.oPred = uo;
      if (uo > 2.3) {
        dyn.uhly[o.i] = 0;
        dyn.oprava = null;
        dyn.oPred = -1;
        dyn.dalsiKriva = t + 9 + R() * 6;
      }
    }
    /* — obřad se šňůrou — */
    const ob = dyn.obrad;
    if (ob) {
      const u = t - ob.start, uP = dyn.uPred;
      if (uP < 0.62 && u >= 0.62) dyn.zvuk.push({ druh: "napnuti", sila: 0.6 });
      if (uP < 0.86 && u >= 0.86) {
        dyn.zvuk.push({ druh: "brnk", sila: 1 });
        if (dyn.tisky.length >= RADKY.length) dyn.tisky.shift();
        dyn.tisky = dyn.tisky.filter((r) => r.y !== ob.y);
        dyn.tisky.push({ y: ob.y, seed: Math.floor(R() * 1e6), t0: t, razitko: false });
        for (let i = 0; i < 16; i++) dyn.kapky.push({ x: D.x + 4 + R() * (D.w - 8), y: ob.y, vx: (R() - 0.5) * 12, vy: (R() - 0.65) * 26, vek: 0, zivot: 0.4 + R() * 0.4, r: 0.18 + R() * 0.3 });
        dyn.vb += 18;
        dyn.om += 1.2;
      }
      if (uP < 2.03 && u >= 2.03) {
        dyn.zvuk.push({ druh: "razitko", sila: 1, pan: 0.5 });
        const r = dyn.tisky.find((q) => q.y === ob.y);
        if (r) r.razitko = true;
        dyn.vb -= 26;
      }
      if (uP < 2.35 && u >= 2.35) dyn.zvuk.push({ druh: "rin", sila: 1 });
      dyn.uPred = u;
      if (u >= OBRAD_KONEC) {
        dyn.obrad = null;
        dyn.uPred = -1;
      }
    }
    /* — vítr z myši, olovnice a bublina — */
    let ax = 0;
    if (vstup.mys) {
      if (dyn.mysPred) {
        const vx = (vstup.mys.x - dyn.mysPred.x) / Math.max(dt, 0.008);
        const blizko = clamp(1.4 - Math.hypot(vstup.mys.x - 150, vstup.mys.y - 128) / 60);
        ax += clamp(vx, -900, 900) * 0.05 * (0.25 + 0.75 * blizko);
      }
      dyn.mysPred = { x: vstup.mys.x, y: vstup.mys.y };
    } else dyn.mysPred = null;
    const cilVitr = vstup.mys ? clamp((vstup.rychlost || 0) / 400) * Math.sign(ax || 1) : 0.08 * Math.sin(t * 0.5);
    dyn.vitr += (cilVitr - dyn.vitr) * (1 - Math.exp(-dt / 0.4));
    /* olovnice visí z dlaně, která se hýbe s dechem: zrychlení čepu ji rozkývá */
    const pivot = rucePro(dyn, t).P3;
    if (dyn.pivotPred && dt > 0) {
      const v = [(pivot[0] - dyn.pivotPred[0]) / dt, (pivot[1] - dyn.pivotPred[1]) / dt];
      const a = (v[0] - dyn.pivotV[0]) / dt;
      ax -= clamp(a, -400, 400);
      dyn.pivotV = v;
    }
    dyn.pivotPred = pivot;
    const g = (2 * Math.PI / 1.25) ** 2;
    const alfa = -g * Math.sin(dyn.th) - 0.55 * dyn.om + (ax / OLOVNICE_L) * Math.cos(dyn.th);
    dyn.om += alfa * dt;
    dyn.th += dyn.om * dt;
    dyn.th = clamp(dyn.th, -1.1, 1.1);
    [dyn.b, dyn.vb] = pruzina(dyn.b, dyn.vb, 0, dt, 140, 5.5);
    dyn.b = clamp(dyn.b, -4.8, 4.8);
    /* klid: jak dlouho se nic neděje a olovnice visí rovně */
    dyn.klid = Math.abs(dyn.th) < rad(0.6) && Math.abs(dyn.om) < 0.05 && !dyn.obrad && !dyn.oprava ? dyn.klid + dt : 0;
    /* — jiskry ve tvaru čtverečků, vždycky rovně — */
    dyn.akum += dt * 2.6;
    while (dyn.akum >= 1) {
      dyn.akum -= 1;
      const naHrane = R();
      const x = naHrane < 0.6 ? D.x + R() * D.w : naHrane < 0.8 ? D.x - 6 + R() * 8 : D.x + D.w - 2 + R() * 8;
      const y = naHrane < 0.6 ? D.y - 4 + R() * 10 : D.y + 10 + R() * 70;
      dyn.jiskry.push({ x, y, vy: -5 - R() * 7, vek: 0, zivot: 1.6 + R() * 1.4, r: 0.7 + R() * 0.9, fz: R() * 6.28 });
    }
    for (const j of dyn.jiskry) {
      j.vek += dt;
      j.x += (dyn.vitr * 14 + Math.sin(j.vek * 2 + j.fz) * 1.2) * dt;
      j.y += j.vy * dt;
    }
    dyn.jiskry = dyn.jiskry.filter((j) => j.vek < j.zivot);
    for (const k of dyn.kapky) {
      k.vek += dt;
      k.vy += 60 * dt;
      k.x += k.vx * dt;
      k.y += k.vy * dt;
    }
    dyn.kapky = dyn.kapky.filter((k) => k.vek < k.zivot);
    /* — pohled: kachel, šňůra, olovnice, nebo myš — */
    let kam = null;
    if (dyn.oprava) {
      const k = KACHLE[dyn.oprava.i];
      kam = [k.x + 5, k.y + 5];
    } else if (dyn.obrad) {
      const u = t - dyn.obrad.start;
      kam = u < 1.6 ? [90, dyn.obrad.y] : [D.x + D.w - 6, dyn.obrad.y];
    } else if (Math.abs(dyn.th) > rad(5)) kam = [pivot[0] + Math.sin(dyn.th) * OLOVNICE_L, pivot[1] + OLOVNICE_L];
    else if (vstup.mys) kam = [vstup.mys.x, vstup.mys.y];
    let cil = [0, 0];
    if (kam) {
      const O = naPanel([90, 91]);
      cil = [clamp((kam[0] - O[0]) / 34, -1, 1) * 2.1, clamp((kam[1] - O[1]) / 34, -1, 1) * 1.7];
    } else if (((t % 7) + 7) % 7 > 5.9) cil = [0, -1.8]; /* občas zkontroluje bublinu nad hlavou */
    dyn.pohled = dyn.pohled.map((q, i) => q + (cil[i] - q) * (1 - Math.exp(-dt / 0.12)));
    /* tisky pomalu blednou, nejstarší odejde */
    for (const r of dyn.tisky) r.op = clamp(1 - (t - r.t0) / 60, 0.45, 1);
  };

  /** Polohy všech šesti dlaní v čase t (klid s dechem, obřad, oprava). */
  const rucePro = (d, t) => {
    const R = {};
    for (const k of Object.keys(KLID)) {
      const fz = DECH[k];
      R[k] = [KLID[k][0] + 0.5 * Math.sin(t * 1.1 + fz), KLID[k][1] + 0.7 * Math.sin(t * 0.9 + fz * 1.3)];
    }
    if (d && d.obrad) {
      const so = stavObradu(t - d.obrad.start, d.obrad.y);
      R.L1 = so.L1;
      R.L2 = so.L2;
      R.P2 = so.P2;
      R.P1 = so.P1;
    }
    if (d && d.oprava && t >= d.oprava.oprava) {
      const so = stavOpravy(d.oprava, t);
      R[so.vlevo ? "L3" : "P3"] = so.H;
    }
    return R;
  };

  const stav = (t, vstup = {}, dyn) => {
    const d = dyn || novaDynamika();
    const R = rucePro(d, t);
    let snura = { typ: "rovna" };
    const hankoUhel = 90;
    let oci = "kulate", oboci = "rovne", usta = "rovna", tvare = 0.3, cuk = 0;
    if (Math.abs(d.th) > rad(7)) [oboci, usta] = ["ustarane", "vlnka"];
    else if (d.klid > 2.5) usta = "usmev";
    if (d.obrad) {
      const u = t - d.obrad.start;
      snura = stavObradu(u, d.obrad.y).snura;
      if (u < 0.86) [oci, oboci, usta] = ["prisne", "rovne", "kousek"];
      else if (u < 1.2) [oci, oboci, usta] = ["zavrene", "rovne", "rovna"];
      else if (u < 2.2) [oci, oboci, usta] = ["kulate", "rovne", "rovna"];
      else [oci, oboci, usta, tvare] = ["spokojene", "rovne", "usmev", 0.65];
    }
    let palickaUhel = -90, ohybL3 = OHYB.L3, ohybP3 = OHYB.P3, olovnice = d.th;
    const uhly = d.uhly.slice();
    if (d.oprava) {
      const o = d.oprava;
      const u = t - o.start, uo = t - o.oprava;
      if (uo < 0) {
        const vsiml = o.naraz ? 0.1 : 0.5;
        if (u > vsiml && u < vsiml + 0.6) [oci, oboci, usta] = ["siroke", "zdvizene", o.naraz ? "ctverec" : "o"];
        else if (u >= vsiml + 0.6) {
          [oci, oboci, usta] = ["kulate", "mracene", "kousek"];
          cuk = Math.abs(Math.sin(t * 38)) * (Math.sin(t * 3) > 0 ? 1 : 0);
        }
      } else if (uo < 1.45) [oci, oboci, usta] = ["prisne", "mracene", "kousek"];
      else [oci, oboci, usta, tvare] = ["spokojene", "rovne", "usmev", 0.6];
      if (uo >= 0) {
        const so = stavOpravy(o, t);
        if (so.vlevo) {
          palickaUhel = so.a;
          ohybL3 = so.ohyb;
        } else {
          /* závaží při ťukání visí kolmo dolů */
          ohybP3 = so.ohyb;
          olovnice = d.th * (1 - so.tam);
        }
      }
    }
    const leskU = ((t % 7.5) + 7.5) % 7.5;
    return {
      t, ruce: R, snura, hankoUhel, palickaUhel, ohybL3, ohybP3, olovnice, bublina: d.b,
      kachle: KACHLE, uhly, tisky: d.tisky, jiskry: d.jiskry, kapky: d.kapky,
      lesk: leskU < 1.4 ? leskU / 1.4 : -1,
      pohled: d.pohled, mrk: mrkani(t, [1.8, 4.9, 5.15, 8.3], 9.5), cuk, oci, oboci, usta, tvare,
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
    smycky: () => ({}),
    klidne: { t: 3.0 },
    vrstvy: [
      { id: "zare", kresli: vrstvaZare, pruhlednost: (st) => f(0.85 + 0.15 * Math.sin(st.t * 0.8)) },
      { id: "paprsky", kresli: vrstvaPaprsky, tezka: true },
      { id: "svatozar", kresli: vrstvaSvatozar, tezka: true },
      { id: "lesk", kresli: vrstvaLesk, klic: (st) => (st.lesk < 0 ? -1 : snimek(st)) },
      { id: "tisky", kresli: vrstvaTisky, klic: (st) => st.tisky.map((r) => `${r.y}:${f(r.op)}:${r.razitko}`).join() },
      { id: "ruce", kresli: vrstvaRuce, klic: snimek },
      { id: "podstavec", kresli: vrstvaPodstavec, klic: (st) => st.uhly.map((u) => f(u)).join() },
      { id: "postava", kresli: vrstvaPostava, tezka: true },
      { id: "tvar", kresli: vrstvaTvar, klic: (st) => `${f(st.pohled[0])},${f(st.pohled[1])},${f(st.mrk)},${f(st.cuk)},${st.oci},${st.oboci},${st.usta},${f(st.tvare)}` },
      { id: "vodovaha", kresli: vrstvaVodovaha, klic: (st) => f(st.bublina) },
      { id: "ruce-dole", kresli: vrstvaRuceDole, klic: snimek },
      { id: "jiskry", kresli: vrstvaJiskry, klic: snimek },
    ],
  };
})();

/* ═══════════════════════════════════════════════════════════════════
 * 2 — KARESANSUI
 * Suchá zahrada za ranního světla, viděná z temné místnosti mezi sloupy
 * jako obraz v rámu (gakubuči teien); naleštěná podlaha ji zrcadlí.
 * Bílý štěrk znamená vodu, a tak se hrabe do vln — jenže Kachlík hrabe
 * rovně a kolem kamenů nedělá kruhy, ale čtverce. Za zahradou je zeď
 * s pěti bílými linkami sudžibei, v mlze pagoda, nad zdí javor momidži
 * a v rohu bambusová klapačka šiši-odoši, která odměřuje čas. Kachlík
 * s ní pokyvuje.
 *
 * Myš je prst ve štěrku: kudy jede, tam zůstane rýha. Kachlík počká, až
 * přestaneš, a jde ji uhrabat. Kliknutí do štěrku hodí kamínek a od něj
 * se rozběhnou čtvercové vlny, kliknutí do javoru setřese listí a na
 * bambus ho překlopí. Listí, kamínky i rýhy Kachlík uklidí a pak se
 * ukloní — svisle, protože se nenakloní ani při úkloně.
 * ═══════════════════════════════════════════════════════════════════ */
const V2 = (() => {
  /* Štěrk v souřadnicích zahrady: X napříč jako na panelu, G do hloubky 0–60 */
  const Y0 = 124, Y1 = 80, HL = 60, CP = 0.7;
  const XMIN = 25, XMAX = 155;
  const pZ = (z) => (z * (1 + CP)) / (1 + CP * z);
  const yG = (G) => Y0 - (Y0 - Y1) * pZ(G / HL);
  const gY = (y) => {
    const p = (Y0 - y) / (Y0 - Y1);
    return (HL * p) / (1 + CP - CP * p);
  };
  const mer = (G) => 1 / (1 + CP * clamp(G / HL, 0, 1.2));
  const OSTROVY = [
    { X: 58, G: 40, a: 6.5, kameny: [[-1.6, 0.6, 9.5, 13, 3], [5, -1.4, 5.6, 4.6, 5]] },
    { X: 108, G: 23, a: 5.5, kameny: [[0, 0, 13, 5.2, 8], [-5.5, 2.6, 3.6, 2.8, 9]] },
    { X: 138, G: 47, a: 4.5, kameny: [[0, 0, 7, 9.5, 14]] },
  ];
  const ROZESTUP = 2.6, KRUHU = 3;
  const dosah = (a) => a + ROZESTUP * KRUHU + 1.4;
  const SISI = { X0: 25, X1: 46, G1: 10 };
  const DOMA = [90, 3.6];
  const KOS = [76, 1.6];
  const CARY = Array.from({ length: 24 }, (_, i) => (i + 0.5) * (HL / 24));
  const PERIODA = 7.4;
  const LISTY_BARVY = ["#C4432B", "#D9622B", "#E3862F", "#B8322A", "#E9A23B"];

  /* Kámen: oblý tvar s rovným dnem, světlo zleva */
  const kamen = (cx, cy, w, h, seed, m = 1) => {
    const r = rng(seed);
    const B = [];
    for (let i = 0; i < 14; i++) {
      const u = (i / 14) * Math.PI * 2;
      const k = 1 + (r() - 0.5) * 0.34;
      B.push([cx + Math.cos(u) * (w / 2) * k * m, Math.min(cy, cy - (h / 2) * m + Math.sin(u) * (h / 2) * k * m)]);
    }
    const d = hladka(B, true);
    return (
      `<ellipse cx="${f(cx + w * 0.4 * m)}" cy="${f(cy + 0.3)}" rx="${f(w * 0.75 * m)}" ry="${f(1.5 * m)}" fill="#6E6454" opacity="0.32"/>` +
      `<path d="${d}" fill="url(#kr2-kamen)" stroke="#3E3A34" stroke-width="${f(0.45 * m)}"/>` +
      `<path d="M${f(cx - w * 0.36 * m)} ${f(cy - h * 0.25 * m)} Q${f(cx - w * 0.3 * m)} ${f(cy - h * 0.8 * m)} ${f(cx + w * 0.05 * m)} ${f(cy - h * 0.9 * m)}" stroke="#D8D2C4" stroke-width="${f(0.7 * m)}" fill="none" stroke-linecap="round" opacity="0.7"/>` +
      `<path d="M${f(cx + w * 0.12 * m)} ${f(cy - h * 0.55 * m)} l${f(w * 0.12 * m)} ${f(h * 0.2 * m)}" stroke="#4E4A42" stroke-width="${f(0.4 * m)}" opacity="0.6"/>`
    );
  };
  /** Javorový list momidži: pět laloků jako dlaň. */
  const javor = (x, y, s, rot, barva, sy = 1) => {
    const L = [[-90, 1], [-35, 0.9], [-145, 0.9], [20, 0.6], [160, 0.6]];
    const B = [];
    const sorted = L.slice().sort((a, b) => a[0] - b[0]);
    sorted.forEach(([a, l], i) => {
      const n = sorted[(i + 1) % sorted.length];
      let mid = (a + (n[0] < a ? n[0] + 360 : n[0])) / 2;
      B.push([Math.cos(rad(a)) * l, Math.sin(rad(a)) * l]);
      B.push([Math.cos(rad(mid)) * 0.32, Math.sin(rad(mid)) * 0.32]);
    });
    const d = "M" + B.map(([px, py]) => pt([px * s, py * s])).join(" L") + " Z";
    return `<g transform="translate(${f(x)} ${f(y)}) scale(1 ${f(sy)}) rotate(${f(rot)})"><path d="${d}" fill="${barva}" stroke="#7A2414" stroke-width="${f(s * 0.08)}" stroke-linejoin="round"/><path d="M0 0 L0 ${f(s * 0.55)}" stroke="#7A2414" stroke-width="${f(s * 0.1)}"/></g>`;
  };

  /* ——— Zahrada za sloupy (statická) ——— */
  const zahrada = () => {
    let s = "";
    /* nebe, slunce zleva, kopce a mlha */
    s += `<rect x="20" y="20" width="140" height="62" fill="url(#kr2-nebe)"/>`;
    s += `<circle cx="36" cy="30" r="44" fill="url(#kr2-slunce)"/>`;
    s += `<path d="M20 54 C34 47 46 50 58 46 C72 42 86 49 100 47 C116 45 126 41 142 45 C150 47 156 46 160 47 V66 H20 Z" fill="#CFC1C0" opacity="0.7"/>`;
    s += `<path d="M20 58 C40 54 52 57 70 54 C90 51 104 56 124 53 C138 51 150 54 160 53 V66 H20 Z" fill="#BDB7AA" opacity="0.7"/>`;
    /* pětipatrová pagoda v mlze: samé vodorovné střechy */
    const pag = [];
    let py = 58;
    for (let i = 0; i < 5; i++) {
      const w = 13 - i * 1.5, h = 3.6 - i * 0.2;
      pag.push(`<rect x="${f(46 - w * 0.32)}" y="${f(py - h)}" width="${f(w * 0.64)}" height="${f(h)}"/>`);
      pag.push(`<path d="M${f(46 - w / 2 - 1)} ${f(py - h)} Q46 ${f(py - h - 1.6)} ${f(46 + w / 2 + 1)} ${f(py - h)} L${f(46 + w / 2 - 0.6)} ${f(py - h + 0.9)} H${f(46 - w / 2 + 0.6)} Z"/>`);
      py -= h + 0.7;
    }
    pag.push(`<path d="M46 ${f(py)} V${f(py - 8)}" stroke="#9A90A0" stroke-width="0.6"/>`);
    pag.push([0, 1.6, 3.2, 4.8].map((k) => `<rect x="44.9" y="${f(py - 1.4 - k)}" width="2.2" height="0.5"/>`).join(""));
    s += `<g fill="#9A90A0" opacity="0.8">${pag.join("")}</g>`;
    s += `<rect x="20" y="49" width="140" height="11" fill="#F6EDE4" opacity="0.55" filter="url(#kr2-mlha)"/>`;
    /* stromy za zdí vlevo */
    s += `<g fill="#9DA28C" opacity="0.85">${[[30, 58, 9, 6], [42, 60, 8, 5], [62, 59, 10, 5.4], [80, 60, 9, 4.6], [96, 60, 8, 4.2]].map(([x, y, rx, ry], i) => `<path d="${hrouda(x, y, rx, ry, 40 + i, { bodu: 14, kolisani: 0.16 })}"/>`).join("")}</g>`;
    /* javor: kmen za zdí, koruna přes zeď */
    s += `<path d="M148 66 C147 56 144 50 139 44 M145 52 C150 47 154 45 158 44 M141 47 C134 44 128 44 122 47" stroke="#4A3226" stroke-width="2.2" stroke-linecap="round" fill="none"/>`;
    s += `<path d="M148 66 C147 56 144 50 139 44" stroke="#4A3226" stroke-width="3.4" stroke-linecap="round" fill="none"/>`;
    const r = rng(61);
    let koruna = "", svetla = "";
    for (let i = 0; i < 44; i++) {
      const u = r() * Math.PI * 2, q = Math.sqrt(r());
      const x = 136 + Math.cos(u) * q * 26 - (r() < 0.25 ? 14 : 0), y = 42 + Math.sin(u) * q * 14;
      const rr = 3 + r() * 3.6;
      koruna += `<path d="${hrouda(x, y, rr, rr * 0.82, 100 + i, { bodu: 10, kolisani: 0.2 })}" fill="${LISTY_BARVY[Math.floor(r() * 4)]}"/>`;
      if (r() < 0.5) svetla += `<circle cx="${f(x - rr * 0.3)}" cy="${f(y - rr * 0.35)}" r="${f(rr * 0.42)}"/>`;
    }
    s += `<g opacity="0.95">${koruna}</g><g fill="#F2B05A" opacity="0.45">${svetla}</g>`;
    for (let i = 0; i < 26; i++) {
      const u = r() * Math.PI * 2;
      s += javor(136 + Math.cos(u) * (24 + r() * 5) - (r() < 0.3 ? 10 : 0), 42 + Math.sin(u) * (13 + r() * 3), 1.5 + r() * 0.8, r() * 360, LISTY_BARVY[Math.floor(r() * 5)]);
    }
    /* zeď cuidži-bei: tašková stříška, okrová stěna s pěti bílými linkami */
    s += `<path d="M20 64.6 L22 58.6 H158 L160 64.6 Z" fill="#4E525E"/>`;
    s += `<path d="M22 58.6 H158" stroke="#2E313A" stroke-width="1.4"/>`;
    let tasky = "";
    for (let x = 23; x < 158; x += 3.6) tasky += `M${f(x)} 59.4 V63.6 `;
    s += `<path d="${tasky}" stroke="#383B45" stroke-width="1.2"/><path d="${tasky}" stroke="#7C808E" stroke-width="0.35" transform="translate(-0.4 0)"/>`;
    s += `<g>${Array.from({ length: 39 }, (_, i) => `<circle cx="${f(23 + i * 3.6)}" cy="64.4" r="1.25" fill="#5E6270" stroke="#9094A2" stroke-width="0.3"/><circle cx="${f(23 + i * 3.6)}" cy="64.4" r="0.35" fill="#9094A2"/>`).join("")}</g>`;
    s += `<rect x="20" y="65.6" width="140" height="13.4" fill="url(#kr2-zed)"/>`;
    s += `<g stroke="#FBF5E8" stroke-width="0.7">${[68.4, 70.8, 73.2, 75.6].map((y) => `<path d="M20 ${y} H160"/>`).join("")}<path d="M20 78 H160"/></g>`;
    s += `<rect x="20" y="79" width="140" height="1.6" fill="#8C8678"/>`;
    /* štěrk: podklad se zrnem */
    s += `<path d="M20 80.6 H160 V125 H20 Z" fill="url(#kr2-strk)"/>`;
    s += `<path d="M20 80.6 H160 V125 H20 Z" fill="url(#kr2-zrno)" opacity="0.55"/>`;
    /* okap z tmavých oblázků vpředu a oblázkové lůžko pod bambusem */
    s += `<rect x="20" y="124" width="140" height="5" fill="#5C5650"/>`;
    s += `<g fill="#7A736A">${Array.from({ length: 60 }, (_, i) => `<ellipse cx="${f(21 + i * 2.33 + (r() - 0.5))}" cy="${f(125.4 + r() * 2.4)}" rx="${f(0.9 + r() * 0.4)}" ry="0.6"/>`).join("")}</g>`;
    const lozeH = yG(SISI.G1);
    s += `<path d="M20 ${f(lozeH)} H${SISI.X1} L${SISI.X1 + 2} 124 H20 Z" fill="#6A645C"/>`;
    s += `<g fill="#8A847A">${Array.from({ length: 40 }, () => `<ellipse cx="${f(21 + r() * (SISI.X1 - 20))}" cy="${f(lozeH + 1 + r() * (124 - lozeH - 2))}" rx="${f(0.8 + r() * 0.5)}" ry="0.55"/>`).join("")}</g>`;
    /* ostrovy: mech, čtvercové kruhy a kameny */
    for (const o of OSTROVY) {
      const m = mer(o.G);
      const yc = yG(o.G);
      const vys = (yG(o.G - o.a) - yG(o.G + o.a)) / 2;
      s += `<path d="${hrouda(o.X, yc, o.a * 1.05, vys * 1.05, 70 + o.a * 10, { bodu: 16, kolisani: 0.12 })}" fill="url(#kr2-mech)"/>`;
      s += `<g fill="#A6B060" opacity="0.6">${Array.from({ length: 8 }, () => `<circle cx="${f(o.X + (r() - 0.5) * o.a * 1.4)}" cy="${f(yc + (r() - 0.5) * vys)}" r="${f(0.5 * m)}"/>`).join("")}</g>`;
      s += kruhyKolem(o.X, o.G, o.a, KRUHU);
      for (const [dx, dg, w, h, seed] of o.kameny) s += kamen(o.X + dx, yG(o.G + dg), w, h, seed, m);
    }
    return s;
  };
  /** Čtvercové „kruhy“ v štěrku kolem bodu: rýha a světlá hrana jako u čar. */
  const kruhyKolem = (X, G, a, n, posun = 0) => {
    let s = "";
    for (let k = 1; k <= n; k++) {
      const r = a + ROZESTUP * k - posun;
      const x0 = X - r, x1 = X + r, yh = yG(G + r), yd = yG(G - r);
      const w = 0.62 * mer(G);
      s += `<path d="M${f(x0)} ${f(yh)} H${f(x1)} V${f(yd)} H${f(x0)} Z" fill="none" stroke="#B3A893" stroke-width="${f(w)}" stroke-linejoin="round" transform="translate(0 ${f(0.35 * mer(G))})"/>`;
      s += `<path d="M${f(x0)} ${f(yh)} H${f(x1)} V${f(yd)} H${f(x0)} Z" fill="none" stroke="#FFFCF4" stroke-width="${f(w * 0.75)}" stroke-linejoin="round"/>`;
    }
    return s;
  };

  /* ——— Místnost a rám (statické, přes zahradu) ——— */
  const BLOB = hrouda(90, 92, 87, 86, 5, { bodu: 30, kolisani: 0.05 });
  const vrstvaPokoj = () =>
    `<path d="${hrouda(90, 92, 91, 90, 9, { bodu: 30, kolisani: 0.06 })}" fill="#3A2E28" opacity="0.5" filter="url(#kr2-tus-lem)"/>` +
    `<path d="${BLOB}" fill="#211A16" filter="url(#kr2-tus)"/>`;
  const vrstvaZahrada = () => `<g clip-path="url(#kr2-otvor)">${zahrada()}</g>`;
  /* Co se zrcadlí v podlaze: nebe, kopce, javor a stříška zdi, převrácené pod práh */
  const odraz = () => {
    const r = rng(61);
    let s = `<rect x="20" y="20" width="140" height="46" fill="url(#kr2-nebe)"/><circle cx="36" cy="30" r="40" fill="url(#kr2-slunce)"/>`;
    s += `<path d="M20 54 C34 47 46 50 58 46 C72 42 86 49 100 47 C116 45 126 41 142 45 C150 47 156 46 160 47 V66 H20 Z" fill="#CFC1C0" opacity="0.7"/>`;
    for (let i = 0; i < 30; i++) {
      const u = r() * Math.PI * 2, q = Math.sqrt(r());
      const x = 136 + Math.cos(u) * q * 26 - (r() < 0.25 ? 14 : 0), y = 42 + Math.sin(u) * q * 14;
      s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(3 + r() * 3.4)}" fill="${LISTY_BARVY[Math.floor(r() * 4)]}"/>`;
    }
    s += `<path d="M148 66 C147 56 144 50 139 44" stroke="#4A3226" stroke-width="3" fill="none"/>`;
    s += `<path d="M20 64.6 L22 58.6 H158 L160 64.6 Z" fill="#4E525E"/>`;
    return s;
  };
  const vrstvaRam = () => {
    let s = "";
    /* nadsvětlík ranma s mřížkou kumiko, prosvícený zahradou */
    s += `<rect x="25" y="9.5" width="130" height="10.5" fill="#5E4A3A"/>`;
    let mr = "";
    for (let x = 25; x <= 155; x += 6.5) mr += `M${f(x)} 9.5 V20 `;
    for (let i = 0; i < 20; i++) {
      const x = 25 + i * 6.5;
      mr += `M${f(x)} 9.5 L${f(x + 6.5)} 20 M${f(x + 6.5)} 9.5 L${f(x)} 20 `;
    }
    s += `<path d="${mr}" stroke="#2A1F18" stroke-width="0.5"/>`;
    s += `<path d="M25 14.75 H155" stroke="#2A1F18" stroke-width="0.8"/>`;
    /* naleštěná podlaha: v tmavém dřevě se zrcadlí javor a nebe (juka-momidži) */
    s += `<path d="M10 133 H170 V178 H10 Z" fill="#231B16"/>`;
    s += `<g opacity="0.5" filter="url(#kr2-odraz)"><g transform="translate(0 191.4) scale(1 -0.87)">${odraz()}</g></g>`;
    s += `<path d="M10 133 H170 V178 H10 Z" fill="url(#kr2-podlaha-stin)"/>`;
    s += `<g stroke="#120D0A" stroke-width="0.35" opacity="0.55">${[137.5, 143, 149.5, 157, 166].map((y) => `<path d="M10 ${y} H170"/>`).join("")}</g>`;
    s += `<rect x="10" y="133" width="160" height="8" fill="url(#kr2-podlaha-lesk)"/>`;
    /* sloupy, překlad kamoi a práh šikii; hrany chytají světlo ze zahrady */
    s += `<rect x="15" y="4" width="10" height="130" fill="url(#kr2-sloup-l)"/><rect x="155" y="4" width="10" height="130" fill="url(#kr2-sloup-p)"/>`;
    s += `<path d="M24.6 27 V128" stroke="#C9A27A" stroke-width="0.6" opacity="0.8"/><path d="M155.4 27 V128" stroke="#E8C79A" stroke-width="0.7" opacity="0.9"/>`;
    s += `<rect x="8" y="20" width="164" height="7" fill="url(#kr2-kamoi)"/><path d="M25 27 H155" stroke="#D8B48A" stroke-width="0.5" opacity="0.7"/>`;
    s += `<rect x="8" y="128.6" width="164" height="4.6" fill="#3A2C22"/>`;
    s += `<path d="M8 128.6 H172" stroke="#B8946C" stroke-width="0.5"/><path d="M25 130.2 H155 M25 131.7 H155" stroke="#1E1612" stroke-width="0.5"/>`;
    return `<g clip-path="url(#kr2-ram-orez)">${s}</g>`;
  };

  /* Světelné pruhy od nízkého slunce zleva */
  const vrstvaSvetlo = () =>
    `<g clip-path="url(#kr2-otvor)">` +
    [[25, 16, 104], [44, 9, 88], [60, 12, 74]]
      .map(([x, w, d]) => `<path d="M${x} 27 H${x + w} L${x + w + d} 128 H${x + d * 0.78} Z" fill="url(#kr2-paprsek)"/>`)
      .join("") +
    `</g>`;

  /* ——— Štěrk (živý): čáry, rýhy, kamínky a vlny ——— */
  const odsun = (X, G0, st, kandidati) => {
    let p = 0;
    for (const b of kandidati) {
      const dx = X - b.X;
      if (Math.abs(dx) > 3.6) continue;
      const d = Math.hypot(dx, G0 - b.G);
      if (d < 3.6) {
        const q = (3.6 - d) * 0.8 * (G0 >= b.G ? 1 : -1);
        if (Math.abs(q) > Math.abs(p)) p = q;
      }
    }
    for (const v of st.vlny) {
      const dch = Math.max(Math.abs(X - v.X), Math.abs(G0 - v.G));
      for (let k = 0; k < 3; k++) {
        const vek = v.vek - k * 0.22;
        if (vek <= 0 || vek > 1.5) continue;
        const r = 1.5 + 15 * vek;
        const A = 2.4 * Math.exp(-vek * 1.6) * (1 - vek / 1.5);
        p += A * Math.exp(-((dch - r) ** 2) / 2.2) * (G0 >= v.G ? 1 : -1);
      }
    }
    return p;
  };
  const vrstvaStrk = (st) => {
    const zakazane = [
      ...OSTROVY.map((o) => ({ X: o.X, G: o.G, A: dosah(o.a) })),
      ...st.kaminky.filter((k) => k.usazeny).map((k) => ({ X: k.X, G: k.G, A: 6.6 })),
    ];
    let s = "";
    for (const G0 of CARY) {
      const m = mer(G0);
      const zakaz = zakazane.filter((o) => Math.abs(G0 - o.G) < o.A).map((o) => [o.X - o.A, o.X + o.A]);
      if (G0 < SISI.G1) zakaz.push([XMIN - 5, SISI.X1 + 0.6]);
      zakaz.sort((a, b) => a[0] - b[0]);
      const useky = [];
      let od = XMIN - 4;
      for (const [a, b] of zakaz) {
        if (a > od) useky.push([od, a]);
        od = Math.max(od, b);
      }
      if (od < XMAX + 4) useky.push([od, XMAX + 4]);
      const kandidati = st.ryhy.filter((b) => Math.abs(b.G - G0) < 4);
      let d = "";
      const rovna = !kandidati.length && !st.vlny.length;
      for (const [a, b] of useky) {
        /* nerozhrabaná čára je rovná: stačí jí dva body */
        if (rovna) {
          d += `M${f(a)} ${f(yG(G0))} H${f(b)} `;
          continue;
        }
        const body = [];
        const n = Math.max(1, Math.ceil((b - a) / 2.2));
        for (let i = 0; i <= n; i++) {
          const X = a + ((b - a) * i) / n;
          body.push([X, yG(G0 + odsun(X, G0, st, kandidati))]);
        }
        d += cara(body) + " ";
      }
      s += `<path d="${d}" stroke="#B5AA94" stroke-width="${f(0.72 * m)}" fill="none" transform="translate(0 ${f(0.4 * m)})"/>`;
      s += `<path d="${d}" stroke="#FFFCF4" stroke-width="${f(0.55 * m)}" fill="none"/>`;
    }
    /* rýhy od prstu: světlé navršené okraje, tmavé dno */
    const tahy = new Map();
    for (const b of st.ryhy) {
      if (!tahy.has(b.tah)) tahy.set(b.tah, []);
      tahy.get(b.tah).push(b);
    }
    for (const body of tahy.values()) {
      const useky = [[body[0]]];
      for (let i = 1; i < body.length; i++) {
        const p = body[i - 1], q = body[i];
        if (q.i - p.i === 1 && Math.hypot(q.X - p.X, q.G - p.G) < 4) useky[useky.length - 1].push(q);
        else useky.push([q]);
      }
      for (const u of useky) {
        if (u.length < 2) continue;
        const P = u.map((b) => [b.X, yG(b.G)]);
        const m = mer(u.reduce((a, b) => a + b.G, 0) / u.length);
        const d = hladka(P);
        s += `<path d="${d}" stroke="#F8F3E8" stroke-width="${f(2.6 * m)}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
        s += `<path d="${d}" stroke="#C4B8A2" stroke-width="${f(1.35 * m)}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
        s += `<path d="${d}" stroke="#A39680" stroke-width="${f(0.5 * m)}" stroke-linecap="round" fill="none" transform="translate(0 ${f(0.3 * m)})"/>`;
      }
    }
    /* čtvercové vlny: od kamínku se rozbíhají tři čtverce jako kruhy na vodě */
    for (const v of st.vlny) {
      for (let k = 0; k < 3; k++) {
        const vek = v.vek - k * 0.22;
        if (vek <= 0 || vek > 1.5) continue;
        const r = 1.5 + 15 * vek;
        const op = (1 - vek / 1.5) ** 1.4;
        const x0 = v.X - r, x1 = v.X + r, yh = yG(v.G + r), yd = yG(v.G - r);
        const m = mer(v.G);
        const d = `M${f(x0)} ${f(yh)} H${f(x1)} V${f(yd)} H${f(x0)} Z`;
        s += `<path d="${d}" fill="none" stroke="#A89C86" stroke-width="${f(1.1 * m)}" stroke-linejoin="round" opacity="${f(op)}" transform="translate(0 ${f(0.5 * m)})"/>`;
        s += `<path d="${d}" fill="none" stroke="#FFFFFF" stroke-width="${f(0.9 * m)}" stroke-linejoin="round" opacity="${f(op)}"/>`;
      }
    }
    /* kamínky: padající, ležící s čtvercovými kroužky, nebo jen důlek po sebraném */
    for (const k of st.kaminky) {
      const m = mer(k.G);
      if (k.usazeny) s += kruhyKolem(k.X, k.G, 0.6, 2);
      if (k.faze === "pada") {
        const y = yG(k.G) - 18 * (1 - smooth(k.vek / 0.28)) ** 2;
        s += `<ellipse cx="${f(k.X)}" cy="${f(y - 1.5 * m)}" rx="${f(2.1 * m)}" ry="${f(1.6 * m)}" fill="#5E5850" stroke="#2E2A26" stroke-width="0.35"/>`;
      } else if (k.faze === "lezi") {
        s += `<ellipse cx="${f(k.X + 0.8 * m)}" cy="${f(yG(k.G) + 0.2)}" rx="${f(2.6 * m)}" ry="${f(0.8 * m)}" fill="#6E6454" opacity="0.35"/>`;
        s += `<ellipse cx="${f(k.X)}" cy="${f(yG(k.G) - 1.2 * m)}" rx="${f(2.2 * m)}" ry="${f(1.5 * m)}" fill="#5E5850" stroke="#2E2A26" stroke-width="0.35"/><ellipse cx="${f(k.X - 0.7 * m)}" cy="${f(yG(k.G) - 1.9 * m)}" rx="${f(0.7 * m)}" ry="${f(0.4 * m)}" fill="#A8A096"/>`;
      } else if (k.faze === "sebrany") s += `<ellipse cx="${f(k.X)}" cy="${f(yG(k.G))}" rx="${f(1.8 * m)}" ry="${f(0.6 * m)}" fill="#A89C86" opacity="0.6"/>`;
    }
    return s;
  };

  /* ——— Listí na zemi a ve vzduchu ——— */
  const vrstvaListyZem = (st) => st.listy.filter((l) => l.faze === "lezi").map((l) => javor(l.X, yG(l.G) - 0.3, 1.7 * mer(l.G), l.rot, l.barva, 0.55)).join("");
  const vrstvaListyVzduch = (st) => st.listy.filter((l) => l.faze === "pada").map((l) => javor(l.x, l.y, 1.8, l.rot, l.barva, 0.6 + 0.4 * Math.cos(l.flip))).join("");

  /* ——— Šiši-odoši: bambusová trubka na čepu, přítok z kakei, kamenná nádrž ——— */
  const SO = { cep: [35, 113.4], delka: 15.5, zadek: 5.4 };
  const uhelSisi = (u) => {
    if (u < 6.5) return lerp(-15, -11, u / 6.5);
    if (u < 6.78) return lerp(-11, 33, smooth((u - 6.5) / 0.28));
    if (u < 7.02) return 33;
    if (u < 7.2) return lerp(33, -17, (u - 7.02) / 0.18);
    return lerp(-17, -15, smooth((u - 7.2) / 0.2));
  };
  const vrstvaSisi = (st) => {
    const u = st.sisi;
    const a = uhelSisi(u);
    const [cx, cy] = SO.cep;
    let s = "";
    /* nádrž cukubai a kámen, do kterého trubka tluče */
    s += `<path d="${hrouda(41.5, 121.4, 5.2, 2.6, 31, { bodu: 14, kolisani: 0.08 })}" fill="url(#kr2-kamen)" stroke="#3E3A34" stroke-width="0.4"/>`;
    s += `<ellipse cx="41.5" cy="120.3" rx="3.4" ry="1.05" fill="#3E4A52"/><ellipse cx="40.8" cy="120.1" rx="1.3" ry="0.32" fill="#B8C8D0" opacity="0.6"/>`;
    s += `<path d="${hrouda(28.6, 120, 2.6, 1.8, 33, { bodu: 10, kolisani: 0.1 })}" fill="url(#kr2-kamen)" stroke="#3E3A34" stroke-width="0.4"/>`;
    /* přítok: krátký bambus ze zdi za sloupem, kapky */
    s += `<path d="M25 104.6 L44.4 107.2" stroke="#6E7A3A" stroke-width="1.9" stroke-linecap="round"/><path d="M25 104.6 L44.4 107.2" stroke="#A8B860" stroke-width="1.1" stroke-linecap="round"/>`;
    s += `<path d="M33 105.5 v1.3" stroke="#5A6430" stroke-width="0.45"/>`;
    const tekouci = (((st.t * 3.4) % 1) + 1) % 1;
    s += `<path d="M44.7 107.6 Q45.3 108.2 45.1 ${f(108.6 + tekouci * 1.8)}" stroke="#9EC4D8" stroke-width="0.5" fill="none" opacity="0.9"/>`;
    /* stojánek a čep */
    s += `<path d="M31.8 113.4 L33.4 120.6 M38.2 113.4 L36.6 120.6" stroke="#4A3A2A" stroke-width="0.8"/>`;
    /* trubka: otevřený konec vpravo nahoře, zavřený vlevo */
    const k = Math.cos(rad(a)), q = Math.sin(rad(a));
    const P = (d, o = 0) => [cx + k * d - q * o, cy + q * d + k * o];
    const A = P(-SO.zadek), B = P(SO.delka - SO.zadek);
    s += `<path d="M${pt(A)} L${pt(B)}" stroke="#5A6430" stroke-width="2.9" stroke-linecap="butt"/>`;
    s += `<path d="M${pt(A)} L${pt(B)}" stroke="#A8B860" stroke-width="2.1"/>`;
    s += `<path d="M${pt(P(-SO.zadek, -0.55))} L${pt(P(SO.delka - SO.zadek, -0.55))}" stroke="#D6E096" stroke-width="0.4" opacity="0.8"/>`;
    s += [1.6, 6.4].map((d) => `<path d="M${pt(P(d, -1.1))} L${pt(P(d, 1.1))}" stroke="#5A6430" stroke-width="0.5"/>`).join("");
    s += `<ellipse cx="${f(B[0])}" cy="${f(B[1])}" rx="0.7" ry="1.1" transform="rotate(${f(a)} ${f(B[0])} ${f(B[1])})" fill="#3A4422"/>`;
    s += `<circle cx="${cx}" cy="${cy}" r="0.65" fill="#2A2018"/>`;
    /* vylitá voda do nádrže */
    if (u > 6.7 && u < 7.1) {
      const k2 = smooth((u - 6.7) / 0.12) * (1 - smooth((u - 6.95) / 0.15));
      s += `<path d="M${pt(B)} Q${f(B[0] + 0.5)} ${f(B[1] + 2.4)} 42 120.2" stroke="#B8D6E6" stroke-width="${f(1.1 * k2)}" fill="none" stroke-linecap="round" opacity="0.85"/>`;
    }
    return s;
  };

  /* ——— Kachlík s hráběmi, sugegasou a košíkem ——— */
  const klobouk = () => {
    let s = `<path d="M26 58 L90 23 L154 58 Q90 66 26 58 Z" fill="url(#kr2-slama)" stroke="#7A5E32" stroke-width="1.6" stroke-linejoin="round"/>`;
    let pruhy = "";
    for (let i = 0; i <= 12; i++) {
      const x = 30 + i * 10;
      pruhy += `M90 25 L${x} ${f(58 + Math.sin((i / 12) * Math.PI) * 3.4)} `;
    }
    s += `<path d="${pruhy}" stroke="#9A7A44" stroke-width="0.9" opacity="0.7"/>`;
    s += `<path d="M30 57.6 Q90 65 150 57.6" stroke="#5E4624" stroke-width="2.2" fill="none" opacity="0.55"/>`;
    s += `<circle cx="90" cy="24.6" r="3" fill="#7A5E32"/>`;
    return s;
  };
  const hrabe = (H, hlava, svisle, m) => {
    if (svisle) {
      const [x, y] = H;
      const top = [x, y - 22 * m], dole = [x, y + 15 * m];
      return (
        `<path d="M${pt(dole)} L${pt(top)}" stroke="#6E4A2A" stroke-width="${f(1.4 * m)}" stroke-linecap="round"/><path d="M${pt(dole)} L${pt(top)}" stroke="#D8B47A" stroke-width="${f(0.8 * m)}" stroke-linecap="round"/>` +
        `<rect x="${f(x - 5.5 * m)}" y="${f(top[1] - 1.4 * m)}" width="${f(11 * m)}" height="${f(1.8 * m)}" rx="${f(0.4 * m)}" fill="#A87848" stroke="#5A3A1E" stroke-width="${f(0.3 * m)}"/>` +
        `<path d="${Array.from({ length: 6 }, (_, i) => `M${f(x - 4.6 * m + i * 1.84 * m)} ${f(top[1] - 1.4 * m)} v${f(-1.8 * m)}`).join(" ")}" stroke="#5A3A1E" stroke-width="${f(0.6 * m)}" stroke-linecap="round"/>`
      );
    }
    /* hlava leží ve štěrku napříč (do hloubky), násada k ruce */
    const { X, G, smer } = hlava;
    const y1 = yG(G + 6), y2 = yG(G - 6), yc = yG(G);
    const zub = Array.from({ length: 6 }, (_, i) => {
      const y = lerp(y1, y2, (i + 0.5) / 6);
      return `M${f(X)} ${f(y)} h${f(-smer * 1.6 * mer(G))}`;
    }).join(" ");
    const kon = [H[0] + (H[0] - X) * 0.18, H[1] + (H[1] - yc) * 0.18];
    return (
      `<path d="${zub}" stroke="#5A3A1E" stroke-width="${f(0.55 * mer(G))}" stroke-linecap="round"/>` +
      `<path d="M${f(X)} ${f(y1)} L${f(X)} ${f(y2)}" stroke="#5A3A1E" stroke-width="${f(1.7 * mer(G))}" stroke-linecap="round"/><path d="M${f(X)} ${f(y1)} L${f(X)} ${f(y2)}" stroke="#A87848" stroke-width="${f(1 * mer(G))}" stroke-linecap="round"/>` +
      `<path d="M${f(X)} ${f(yc)} L${pt(kon)}" stroke="#6E4A2A" stroke-width="${f(1.4 * m)}" stroke-linecap="round"/><path d="M${f(X)} ${f(yc)} L${pt(kon)}" stroke="#D8B47A" stroke-width="${f(0.8 * m)}" stroke-linecap="round"/>`
    );
  };
  const vrstvaKachlik = (st) => {
    const k = st.k;
    const m = mer(k.G), sc = 0.24 * m;
    const X = k.X, y0 = yG(k.G);
    const by = y0 + (k.dip - k.bob) * sc;
    const T = `translate(${f(X)} ${f(by)}) scale(${f(sc)}) translate(-90 -${KACH.dno})`;
    const naS = ([bx, byy]) => [X + (bx - 90) * sc, by + (byy - KACH.dno) * sc];
    const ramenoL = naS([46, 100]), ramenoP = naS([134, 100]);
    let s = `<ellipse cx="${f(X)}" cy="${f(y0 + 0.2)}" rx="${f(13 * m)}" ry="${f(1.9 * m)}" fill="#6E6454" opacity="0.3"/>`;
    /* ruka s hráběmi: při hrabání je hlava za Kachlíkem ve štěrku */
    let hrabeS, rukaH;
    if (k.hrabe) {
      const strana = -k.smer;
      rukaH = naS([90 + strana * 58, 116]);
      hrabeS = hrabe(rukaH, { X: X - k.smer * 12, G: k.G, smer: k.smer }, false, m);
    } else {
      rukaH = naS([152, 112]);
      hrabeS = hrabe(rukaH, null, true, m);
    }
    const rameno = k.hrabe && k.smer > 0 ? ramenoL : ramenoP;
    /* druhá ruka: sbírá, nese úlovek, jinak volně u těla */
    let volna = k.hrabe && k.smer > 0 ? naS([142, 120]) : naS([36, 120]);
    if (k.sahne) volna = lerpP(volna, [k.sahne[0], k.sahne[1] - 0.6], k.sahneK);
    const ramenoV = k.hrabe && k.smer > 0 ? ramenoP : ramenoL;
    s += hrabeS;
    s += `<g transform="${T}">${kachGeta({ zvednuti: k.nohy })}${kachNohy({ zvednuti: k.nohy })}${kachTelo("kr2")}${kachTvar("kr2", { dx: st.pohled[0], dy: st.pohled[1], mrk: st.mrk, cuk: st.cuk, oci: st.oci, oboci: st.oboci, usta: st.usta, tvare: st.tvare })}${klobouk()}</g>`;
    const tl = 2.25 * m;
    s += ruka(rameno, rukaH, { ohyb: 2.6 * m * (rameno === ramenoP ? -1 : 1), tloustka: tl });
    s += ruka(ramenoV, volna, { ohyb: 2 * m * (ramenoV === ramenoP ? -1 : 1), tloustka: tl });
    /* co nese v ruce */
    k.nese.slice(-2).forEach((v, i) => {
      if (v.druh === "list") s += javor(volna[0] + i * 0.8, volna[1] + 1.2, 1.7 * m, v.rot, v.barva);
      else s += `<ellipse cx="${f(volna[0] + 0.4)}" cy="${f(volna[1] + 1)}" rx="${f(1.5 * m)}" ry="${f(1.1 * m)}" fill="#5E5850" stroke="#2E2A26" stroke-width="0.3"/>`;
    });
    /* kameny, které stojí před ním, se nakreslí znovu přes něj */
    for (const o of OSTROVY) {
      if (o.G >= k.G || Math.abs(o.X - X) > 18) continue;
      for (const [dx, dg, w, h, seed] of o.kameny) s += kamen(o.X + dx, yG(o.G + dg), w, h, seed, mer(o.G));
    }
    return s;
  };
  const vrstvaKos = (st) => {
    const m = mer(KOS[1]);
    const [x, y] = [KOS[0], yG(KOS[1])];
    const w = 8 * m, h = 5.4 * m;
    let s = `<ellipse cx="${f(x + 0.6)}" cy="${f(y + 0.3)}" rx="${f(w * 0.62)}" ry="${f(1.2 * m)}" fill="#6E6454" opacity="0.3"/>`;
    /* úlovek vykukuje z koše */
    for (let i = 0; i < Math.min(6, st.kos.length); i++) {
      const v = st.kos[st.kos.length - 1 - i];
      s += v.druh === "list" ? javor(x - w * 0.3 + i * 1.3 * m, y - h + 0.4, 1.5 * m, v.rot, v.barva) : `<ellipse cx="${f(x - w * 0.25 + i * 1.2 * m)}" cy="${f(y - h + 0.6)}" rx="${f(1.2 * m)}" ry="${f(0.8 * m)}" fill="#5E5850"/>`;
    }
    s += `<rect x="${f(x - w / 2)}" y="${f(y - h)}" width="${f(w)}" height="${f(h)}" fill="#C9A86A" stroke="#6E5230" stroke-width="0.4"/>`;
    let plet = "";
    for (let i = 1; i < 6; i++) plet += `M${f(x - w / 2 + (w * i) / 6)} ${f(y - h)} v${f(h)} `;
    for (let i = 1; i < 4; i++) plet += `M${f(x - w / 2)} ${f(y - h + (h * i) / 4)} h${f(w)} `;
    s += `<path d="${plet}" stroke="#8A6A3A" stroke-width="0.3"/><path d="M${f(x - w / 2)} ${f(y - h)} h${f(w)}" stroke="#6E5230" stroke-width="0.8"/>`;
    return s;
  };

  const defs = () =>
    kachDefs("kr2") +
    `<filter id="kr2-tus" x="-12%" y="-12%" width="124%" height="124%" color-interpolation-filters="sRGB">` +
    `<feTurbulence type="fractalNoise" baseFrequency="0.055" numOctaves="4" seed="8" result="n"/>` +
    `<feDisplacementMap in="SourceGraphic" in2="n" scale="12" xChannelSelector="R" yChannelSelector="G" result="d"/>` +
    `<feGaussianBlur in="d" stdDeviation="0.55"/></filter>` +
    `<filter id="kr2-tus-lem" x="-15%" y="-15%" width="130%" height="130%"><feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="21" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="16" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation="2.4"/></filter>` +
    `<filter id="kr2-mlha" x="-10%" y="-60%" width="120%" height="220%"><feGaussianBlur stdDeviation="2.4"/></filter>` +
    `<filter id="kr2-odraz" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="0.9 0.5"/></filter>` +
    `<clipPath id="kr2-otvor"><rect x="25" y="27" width="130" height="101.6"/></clipPath>` +
    `<clipPath id="kr2-ram-orez"><path d="${hrouda(90, 92, 82, 81, 5, { bodu: 30, kolisani: 0.05 })}"/></clipPath>` +
    `<linearGradient id="kr2-nebe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E7B9AE"/><stop offset="0.55" stop-color="#F6DCCB"/><stop offset="1" stop-color="#FBEEDF"/></linearGradient>` +
    `<radialGradient id="kr2-slunce"><stop offset="0" stop-color="#FFF6DE" stop-opacity="0.95"/><stop offset="0.35" stop-color="#FFE6C2" stop-opacity="0.5"/><stop offset="1" stop-color="#FFE6C2" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="kr2-zed" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#E6C68A"/><stop offset="1" stop-color="#CFAE6E"/></linearGradient>` +
    `<linearGradient id="kr2-strk" x1="0" y1="0" x2="1" y2="0.3"><stop offset="0" stop-color="#F6F1E6"/><stop offset="1" stop-color="#E4DCCB"/></linearGradient>` +
    `<pattern id="kr2-zrno" width="3" height="2" patternUnits="userSpaceOnUse"><circle cx="0.6" cy="0.5" r="0.18" fill="#B8AC96"/><circle cx="2.1" cy="1.4" r="0.15" fill="#C8BCA6"/><circle cx="1.6" cy="0.3" r="0.12" fill="#FFFFFF"/></pattern>` +
    `<radialGradient id="kr2-mech" cx="0.4" cy="0.35" r="0.7"><stop offset="0" stop-color="#94A24E"/><stop offset="1" stop-color="#5E6E30"/></radialGradient>` +
    `<linearGradient id="kr2-kamen" x1="0" y1="0" x2="1" y2="0.4"><stop offset="0" stop-color="#9E978A"/><stop offset="0.55" stop-color="#7A7468"/><stop offset="1" stop-color="#55504A"/></linearGradient>` +
    `<linearGradient id="kr2-slama" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#EBD39A"/><stop offset="1" stop-color="#C4A260"/></linearGradient>` +
    `<linearGradient id="kr2-paprsek" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF6E0" stop-opacity="0.2"/><stop offset="1" stop-color="#FFF6E0" stop-opacity="0"/></linearGradient>` +
    `<linearGradient id="kr2-sloup-l" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1E1712"/><stop offset="0.7" stop-color="#3A2C22"/><stop offset="1" stop-color="#5A4434"/></linearGradient>` +
    `<linearGradient id="kr2-sloup-p" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6E5440"/><stop offset="0.3" stop-color="#3A2C22"/><stop offset="1" stop-color="#1E1712"/></linearGradient>` +
    `<linearGradient id="kr2-kamoi" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A2019"/><stop offset="1" stop-color="#4A382A"/></linearGradient>` +
    `<linearGradient id="kr2-podlaha-lesk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE9C8" stop-opacity="0.14"/><stop offset="1" stop-color="#FFE9C8" stop-opacity="0"/></linearGradient>` +
    `<linearGradient id="kr2-podlaha-stin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1A1310" stop-opacity="0.1"/><stop offset="1" stop-color="#1A1310" stop-opacity="0.85"/></linearGradient>`;

  /* ——— Simulace ——— */
  const novaDynamika = () => ({
    k: { X: DOMA[0], G: DOMA[1], smer: 1, plan: [], hrabe: false, krokF: 0, nohy: [0, 0], bob: 0, dip: 0, nese: [], sahne: null, sahneK: 0, uDoby: 0 },
    ryhy: [], tah: 0, bodI: 0, posledniBod: null, posledniVstup: -10, kreslil: -10, mysPred: null,
    kaminky: [], vlny: [], listy: [], kos: [], dalsiList: 3.2, sisiStart: -2.4, sisiPred: 0, ptak: 14,
    nahoda: rng(777), zvuk: [], pohled: [0, 0], verze: 0, lekl: -10, kyv: -10,
  });
  const naStrku = (x, y) => x > XMIN + 1 && x < XMAX - 1 && y > Y1 + 0.6 && y < Y0;
  const vOstrove = (X, G) => OSTROVY.some((o) => Math.max(Math.abs(X - o.X), Math.abs(G - o.G)) < o.a + 1);
  const vKorune = (x, y) => ((x - 134) / 28) ** 2 + ((y - 43) / 17) ** 2 < 1 && y < 64;
  const naBambusu = (x, y) => x > 25 && x < 48 && y > 102 && y < 123;

  const maPraci = (d) => d.ryhy.length || d.kaminky.some((k) => k.faze !== "pada") || d.listy.some((l) => l.faze === "lezi");
  const naplanuj = (d) => {
    const plan = [];
    let pos = [d.k.X, d.k.G];
    const veci = [...d.listy.filter((l) => l.faze === "lezi"), ...d.kaminky.filter((k) => k.faze === "lezi")];
    while (veci.length) {
      veci.sort((a, b) => Math.hypot(a.X - pos[0], a.G - pos[1]) - Math.hypot(b.X - pos[0], b.G - pos[1]));
      const v = veci.shift();
      const stoj = [clamp(v.X + (v.X > 120 ? -9 : 9), XMIN + 8, XMAX - 8), clamp(v.G, 1, 56)];
      plan.push({ typ: "jdi", cil: stoj }, { typ: "seber", vec: v });
      pos = stoj;
    }
    /* pruhy štěrku, které je potřeba uhrabat: hrábě berou 12 jednotek do hloubky */
    const body = [...d.ryhy.map((b) => [b.X, b.G]), ...d.kaminky.flatMap((k) => [[k.X - 6, k.G - 6], [k.X + 6, k.G + 6]])];
    body.sort((a, b) => a[1] - b[1]);
    const pruhy = [];
    for (const [X, G] of body) {
      const p = pruhy[pruhy.length - 1];
      if (p && G - p.g0 <= 12) {
        p.g1 = G;
        p.x0 = Math.min(p.x0, X);
        p.x1 = Math.max(p.x1, X);
      } else pruhy.push({ g0: G, g1: G, x0: X, x1: X });
    }
    for (const p of pruhy) {
      const G = clamp((p.g0 + p.g1) / 2, 2, 58);
      const a = clamp(p.x0 - 3, XMIN + 2, XMAX - 2), b = clamp(p.x1 + 3, XMIN + 2, XMAX - 2);
      const zleva = Math.abs(pos[0] - a) < Math.abs(pos[0] - b);
      const [od, kam] = zleva ? [a, b] : [b, a];
      const s = Math.sign(kam - od) || 1;
      const start = clamp(od + s * 12, XMIN + 7, XMAX - 7), konec = clamp(kam + s * 12, XMIN + 7, XMAX - 7);
      plan.push({ typ: "jdi", cil: [start, G] }, { typ: "hrab", G, od: start, kam: konec, smer: s, x0: Math.min(a, b) - 1, x1: Math.max(a, b) + 1 });
      pos = [konec, G];
    }
    plan.push({ typ: "jdi", cil: DOMA });
    if (veci.length || plan.some((u) => u.typ === "seber")) plan.push({ typ: "vysyp" });
    plan.push({ typ: "uklona" });
    return plan;
  };

  const krok = (dyn, t, dt, vstup) => {
    const R = dyn.nahoda;
    const k = dyn.k;
    /* — kliknutí — */
    if (vstup.kliky && vstup.kliky.length) {
      for (const c of vstup.kliky.splice(0)) {
        if (naBambusu(c.x, c.y)) {
          const u = t - dyn.sisiStart;
          if (u < 6.4) dyn.sisiStart = t - 6.45;
        } else if (vKorune(c.x, c.y)) {
          for (let i = 0; i < 3; i++) dyn.listy.push(novyList(R, c.x + (R() - 0.5) * 10, c.y + (R() - 0.5) * 6));
          dyn.zvuk.push({ druh: "sust", sila: 0.8, pan: 0.6 });
        } else if (naStrku(c.x, c.y)) {
          const G = gY(c.y);
          if (!vOstrove(c.x, G) && !(G < SISI.G1 && c.x < SISI.X1 + 1)) {
            dyn.kaminky.push({ X: c.x, G, vek: 0, faze: "pada", usazeny: false });
            dyn.posledniVstup = t;
            dyn.lekl = t + 0.28;
          }
        }
      }
    }
    /* — prst ve štěrku — */
    if (vstup.mys && naStrku(vstup.mys.x, vstup.mys.y)) {
      const X = vstup.mys.x, G = gY(vstup.mys.y);
      const p = dyn.posledniBod;
      const novy = !p || t - p.t > 0.3 || Math.hypot(X - p.X, G - p.G) > 9;
      if (novy) {
        dyn.tah++;
        dyn.posledniBod = { X, G, t };
      } else {
        const d = Math.hypot(X - p.X, G - p.G);
        if (d >= 1.1 && dyn.ryhy.length < 420) {
          const n = Math.min(12, Math.floor(d / 1.1));
          for (let i = 1; i <= n; i++) {
            const q = i / n;
            const bX = lerp(p.X, X, q), bG = lerp(p.G, G, q);
            if (vOstrove(bX, bG)) continue;
            dyn.ryhy.push({ X: bX, G: bG, tah: dyn.tah, i: dyn.bodI++ });
          }
          if (t - dyn.posledniVstup > 1.2) dyn.kreslil = t;
          dyn.posledniBod = { X, G, t };
          dyn.posledniVstup = t;
          dyn.verze++;
          if (R() < dt * 9) dyn.zvuk.push({ druh: "krup", sila: 0.25, pan: (X - 90) / 90 });
        } else p.t = t;
      }
    } else dyn.posledniBod = null;
    /* — kamínky a vlny — */
    for (const km of dyn.kaminky) {
      km.vek += dt;
      if (km.faze === "pada" && km.vek >= 0.28) {
        km.faze = "lezi";
        km.vek = 0;
        dyn.vlny.push({ X: km.X, G: km.G, vek: 0 });
        dyn.zvuk.push({ druh: "plink", sila: 1, pan: (km.X - 90) / 90 });
      }
      if (km.faze !== "pada" && km.vek > 1.2) km.usazeny = true;
    }
    for (const v of dyn.vlny) v.vek += dt;
    dyn.vlny = dyn.vlny.filter((v) => v.vek < 2.2);
    /* — listí — */
    if (t > dyn.dalsiList) {
      dyn.listy.push(novyList(R));
      dyn.dalsiList = t + 6.5 + R() * 6;
    }
    for (const l of dyn.listy) {
      if (l.faze !== "pada") continue;
      l.vek += dt;
      l.x += (Math.sin(l.vek * l.w + l.fz) * 9 - 3) * dt;
      l.y += 8.5 * dt;
      l.rot += dt * 60 * Math.cos(l.vek * l.w);
      l.flip += dt * 3.1;
      if (l.y >= yG(l.G)) {
        l.faze = "lezi";
        l.X = clamp(l.x, XMIN + 3, XMAX - 3);
        dyn.zvuk.push({ druh: "list", sila: 0.4, pan: (l.X - 90) / 90 });
      }
    }
    /* — šiši-odoši — */
    let us = t - dyn.sisiStart;
    while (us >= PERIODA) {
      dyn.sisiStart += PERIODA;
      us -= PERIODA;
    }
    if (dyn.sisiPred < 6.55 && us >= 6.55) dyn.zvuk.push({ druh: "slup", sila: 0.7, pan: -0.6 });
    if (dyn.sisiPred < 7.2 && us >= 7.2) {
      dyn.zvuk.push({ druh: "tok", sila: 1, pan: -0.6 });
      if (!k.plan.length) dyn.kyv = t;
    }
    dyn.sisiPred = us;
    /* — ptáček občas zazpívá — */
    if (t > dyn.ptak) {
      dyn.zvuk.push({ druh: "ptak", sila: 0.6, pan: 0.5 });
      dyn.ptak = t + 22 + R() * 14;
    }
    /* — Kachlík — */
    if (!k.plan.length && maPraci(dyn) && t - dyn.posledniVstup > 1.3 && !dyn.kaminky.some((q) => q.faze === "pada")) k.plan = naplanuj(dyn);
    let jde = false;
    k.hrabe = false;
    k.sahne = null;
    if (k.plan.length) {
      const u = k.plan[0];
      if (u.start == null) u.start = t;
      const uu = t - u.start;
      if (u.typ === "jdi") {
        const dx = u.cil[0] - k.X, dg = u.cil[1] - k.G;
        const d = Math.hypot(dx, dg);
        const v = 32 * dt;
        if (d <= v) {
          k.X = u.cil[0];
          k.G = u.cil[1];
          k.plan.shift();
        } else {
          k.X += (dx / d) * v;
          k.G += (dg / d) * v;
          if (Math.abs(dx) > 0.5) k.smer = Math.sign(dx);
          jde = true;
        }
      } else if (u.typ === "hrab") {
        k.hrabe = true;
        k.smer = u.smer;
        const v = 21 * dt;
        const zbyva = (u.kam - k.X) * u.smer;
        const hlavaX = k.X - u.smer * 12;
        const pred = dyn.ryhy.length;
        dyn.ryhy = dyn.ryhy.filter((b) => !(Math.abs(b.G - u.G) <= 6.4 && (u.smer > 0 ? b.X <= hlavaX : b.X >= hlavaX)));
        if (dyn.ryhy.length !== pred) dyn.verze++;
        if (zbyva <= v) {
          k.X = u.kam;
          const pred2 = dyn.ryhy.length;
          dyn.ryhy = dyn.ryhy.filter((b) => !(Math.abs(b.G - u.G) <= 6.4 && b.X >= u.x0 - 12 && b.X <= u.x1 + 12));
          dyn.kaminky = dyn.kaminky.filter((q) => !(q.faze === "sebrany" && Math.abs(q.G - u.G) <= 6.5));
          if (dyn.ryhy.length !== pred2) dyn.verze++;
          k.plan.shift();
        } else {
          k.X += u.smer * v;
          jde = true;
          dyn.kaminky = dyn.kaminky.filter((q) => !(q.faze === "sebrany" && Math.abs(q.G - u.G) <= 6.5 && (u.smer > 0 ? q.X <= hlavaX : q.X >= hlavaX)));
          if (Math.floor(uu / 0.3) !== Math.floor((uu - dt) / 0.3)) dyn.zvuk.push({ druh: "hrab", sila: 0.7, pan: (k.X - 90) / 90 });
        }
      } else if (u.typ === "seber") {
        const v = u.vec;
        k.sahne = [v.X, yG(v.G)];
        k.sahneK = Math.sin(Math.PI * clamp(uu / 0.8));
        k.dip = 9 * k.sahneK;
        if (!u.hotovo && uu > 0.4) {
          u.hotovo = true;
          if (v.faze === "lezi") {
            if (v.barva) {
              v.faze = "nese";
              k.nese.push({ druh: "list", rot: v.rot, barva: v.barva });
              dyn.listy = dyn.listy.filter((l) => l !== v);
            } else {
              v.faze = "sebrany";
              k.nese.push({ druh: "kamen" });
              dyn.verze++;
            }
            dyn.zvuk.push({ druh: "sust", sila: 0.5, pan: (v.X - 90) / 90 });
          }
        }
        if (uu > 0.8) {
          k.dip = 0;
          k.plan.shift();
        }
      } else if (u.typ === "vysyp") {
        k.sahne = [KOS[0], yG(KOS[1]) - 5];
        k.sahneK = Math.sin(Math.PI * clamp(uu / 0.6));
        if (!u.hotovo && uu > 0.3) {
          u.hotovo = true;
          dyn.kos.push(...k.nese);
          if (dyn.kos.length > 12) dyn.kos.splice(0, dyn.kos.length - 12);
          k.nese = [];
          dyn.zvuk.push({ druh: "sust", sila: 0.4, pan: -0.2 });
        }
        if (uu > 0.6) k.plan.shift();
      } else if (u.typ === "uklona") {
        k.dip = 7 * Math.sin(Math.PI * clamp(uu / 1.1));
        if (!u.hotovo && uu > 0.55) {
          u.hotovo = true;
          dyn.zvuk.push({ druh: "rin", sila: 0.45 });
        }
        if (uu > 1.1) {
          k.dip = 0;
          k.plan.shift();
        }
      }
    }
    /* chůze: kroky na geta, tělo se zhoupne, ale nenakloní */
    if (jde) {
      const pred = k.krokF;
      k.krokF += dt * Math.PI * 2 * (k.hrabe ? 1.6 : 2.5);
      if (Math.floor(pred / Math.PI) !== Math.floor(k.krokF / Math.PI)) dyn.zvuk.push({ druh: "krup", sila: 0.55, pan: (k.X - 90) / 90 });
    } else k.krokF = 0;
    k.nohy = jde ? [Math.max(0, Math.sin(k.krokF)) * 6, Math.max(0, -Math.sin(k.krokF)) * 6] : [0, 0];
    k.bob = jde ? Math.abs(Math.sin(k.krokF)) * 3 : 0;
    const kyv = t - dyn.kyv;
    if (!k.plan.length && kyv > 0 && kyv < 0.45) k.dip = 4 * Math.sin(Math.PI * kyv / 0.45);
    else if (!k.plan.length) k.dip = 0;
    /* pohled: na rýhu, kamínek, list, nebo kam jde */
    let kam = null;
    if (t - dyn.posledniVstup < 1.3 && vstup.mys) kam = [vstup.mys.x, vstup.mys.y];
    else if (k.plan.length) {
      const u = k.plan[0];
      if (u.typ === "seber") kam = [u.vec.X, yG(u.vec.G)];
      else if (u.typ === "jdi") kam = [u.cil[0], yG(u.cil[1])];
      else if (u.typ === "hrab") kam = [k.X - u.smer * 12, yG(u.G)];
    } else {
      const padajici = dyn.listy.find((l) => l.faze === "pada");
      if (padajici) kam = [padajici.x, padajici.y];
    }
    let cil = [0, 0];
    if (kam) {
      const m = mer(k.G);
      const O = [k.X, yG(k.G) - 15 * m];
      cil = [clamp((kam[0] - O[0]) / 24, -1, 1) * 2.1, clamp((kam[1] - O[1]) / 24, -1, 1) * 1.7];
    }
    dyn.pohled = dyn.pohled.map((q, i) => q + (cil[i] - q) * (1 - Math.exp(-dt / 0.12)));
  };
  const novyList = (R, x, y) => ({
    faze: "pada", x: x ?? 116 + R() * 36, y: y ?? 36 + R() * 18, vek: 0, w: 1.6 + R() * 1.2, fz: R() * 6.28,
    rot: R() * 360, flip: R() * 6.28, barva: LISTY_BARVY[Math.floor(R() * LISTY_BARVY.length)], G: 10 + R() * 46, X: 0,
  });

  const stav = (t, vstup = {}, dyn) => {
    const d = dyn || novaDynamika();
    const k = d.k;
    let oci = "kulate", oboci = "rovne", usta = "rovna", tvare = 0.3, cuk = 0;
    const u0 = k.plan[0];
    if (t - d.kreslil < 0.7 || (t > d.lekl && t - d.lekl < 0.6)) [oci, oboci, usta] = ["siroke", "zdvizene", t > d.lekl && t - d.lekl < 0.6 ? "ctverec" : "o"];
    else if (t - d.posledniVstup < 1.3) {
      [oci, oboci, usta] = ["kulate", "mracene", "kousek"];
      cuk = Math.abs(Math.sin(t * 38)) * (Math.sin(t * 2.6) > 0.3 ? 1 : 0);
    } else if (u0) {
      if (u0.typ === "hrab") [oci, oboci, usta] = ["zavrene", "rovne", "rovna"];
      else if (u0.typ === "uklona") [oci, oboci, usta, tvare] = ["spokojene", "rovne", "usmev", 0.6];
      else [oci, oboci, usta] = ["prisne", "rovne", "kousek"];
    } else if (t - d.kyv < 0.5) oci = "spokojene";
    return {
      t, k, ryhy: d.ryhy, kaminky: d.kaminky, vlny: d.vlny, listy: d.listy, kos: d.kos,
      sisi: (((t - d.sisiStart) % PERIODA) + PERIODA) % PERIODA, verze: d.verze,
      pohled: d.pohled, mrk: mrkani(t, [1.2, 4.4, 4.65, 7.1], 8.8), cuk, oci, oboci, usta, tvare,
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
    smycky: () => ({ voda: 0.07 }),
    klidne: { t: 2.2 },
    vrstvy: [
      { id: "pokoj", kresli: vrstvaPokoj, tezka: true },
      { id: "zahrada", kresli: vrstvaZahrada, tezka: true },
      { id: "strk", kresli: (st) => `<g clip-path="url(#kr2-otvor)">${vrstvaStrk(st)}</g>`, klic: (st) => (st.vlny.length ? snimek(st) : `${st.verze}:${st.kaminky.map((q) => q.faze + q.usazeny).join()}`) },
      { id: "listy-zem", kresli: vrstvaListyZem, klic: (st) => st.listy.filter((l) => l.faze === "lezi").length },
      { id: "sisi", kresli: vrstvaSisi, klic: (st) => Math.floor(st.t * 20) },
      { id: "kachlik", kresli: vrstvaKachlik, klic: (st) => `${f(st.k.X)},${f(st.k.G)},${f(st.k.dip)},${f(st.k.bob)},${st.k.hrabe},${st.k.nese.length},${f(st.k.sahneK)},${f(st.pohled[0])},${f(st.pohled[1])},${f(st.mrk)},${f(st.cuk)},${st.oci},${st.oboci},${st.usta}` },
      { id: "kos", kresli: vrstvaKos, klic: (st) => st.kos.length },
      { id: "listy", kresli: vrstvaListyVzduch, klic: snimek },
      { id: "svetlo", kresli: vrstvaSvetlo, styl: "mix-blend-mode:screen", pruhlednost: (st) => f(0.8 + 0.2 * Math.sin(st.t * 0.4)) },
      { id: "ram", kresli: vrstvaRam, tezka: true },
    ],
  };
})();

/* ═══════════════════════════════════════════════════════════════════
 * 3 — KACHLOVÁ KAMNA
 * Kachel se česky jmenuje podle kachlových kamen, a tak Kachlík v zimní
 * noci staví kamna v roubence. Chalupa je v řezu jako dílna na Úvodu 2:
 * střecha pod sněhem, rampouchy, venku sněhulák z kostek s hrncem na
 * hlavě a smrček. Kachlík bere kachle z bedny, přehazuje si je přes
 * hlavu z ruky do ruky — kachel přitom letí naprosto rovně, ani se
 * nepootočí — a skládá je do kamen. Co sedne nakřivo, doklepe. Každá
 * kamna jsou jiná: zelená, habánská, medová, kobaltová, japonská.
 *
 * Když jsou hotová, zatopí. Mráz na okně roztaje, z komína jde kouř
 * a kočka si lehne na pec. Kachlík blaženě zavře oči. Pak je otevře,
 * všimne si, že jeden kachel je o půl stupně nakřivo, ťukne do něj —
 * a ten praskne. Povzdech, kočka uraženě seskočí, a Kachlík všechna
 * kamna rozebere a staví znovu. Teda skoro hotová.
 *
 * Myš je vítr: žene sníh a kouř, kočka sleduje kurzor. Kliknutí hodí
 * sněhovou kouli. Do kamen srazí kachel nakřivo, do střechy sešoupne
 * sníh, do Kachlíka ho obalí a do měsíce… zkus to.
 * ═══════════════════════════════════════════════════════════════════ */
const V3 = (() => {
  const POD = 146;
  const KX = 81, SC = 0.215;
  const naS = ([bx, by], dx = 0) => [KX + dx + (bx - 90) * SC, POD + (by - KACH.dno) * SC];
  const BEDNA = { x: 40, y: 134, w: 18, h: 12 };
  const KAM = { x: 104, y: 86, sl: 3, ra: 4, k: 12 };
  const N = KAM.sl * KAM.ra;
  const slotXY = (i) => [KAM.x + (i % KAM.sl) * KAM.k, KAM.y + (KAM.ra - 1 - Math.floor(i / KAM.sl)) * KAM.k];
  const RIMSA = { x: 101, y: 80, w: 42, h: 6 };
  const OKNO = { x: 40, y: 82, s: 22 };
  const KOCKA_LAVICE = [52, 124];
  const KOCKA_PEC = [121, 80];
  const KOMIN = [135, 38];
  const MESIC = [30, 29];
  const RUKA_L = [KX - 13, 136], RUKA_P = [KX + 14, 136];
  const RAMENO_L = naS([47, 100]), RAMENO_P = naS([133, 100]);
  const DOMU = { x0: 30, x1: 150, y0: 64, y1: 152 };

  /* ——— Témata kamen ——— */
  const TEMATA = [
    { styl: "relief", telo: "#3E7B53", svetlo: "#7DB98A", stin: "#1F4C36", motivy: ["tulipan", "srdce", "ruzice"] },
    { styl: "malba", telo: "#F1EADA", svetlo: "#FFFFFF", stin: "#BFB197", motivy: ["tulipan", "ruzice", "hvezda"], barvy: ["#2F4E9C", "#E3A62E", "#4E8A4A"] },
    { styl: "relief", telo: "#BE8236", svetlo: "#EDBE6A", stin: "#7A4A1A", motivy: ["srdce", "hvezda", "ruzice"] },
    { styl: "linka", telo: "#22346C", svetlo: "#4D67AC", stin: "#121C40", motivy: ["hvezda", "ruzice", "sakura"], barvy: ["#E2BC64"] },
    { styl: "malba", telo: "#2E2D66", svetlo: "#5C5AA4", stin: "#18173E", motivy: ["sakura", "vlny", "hvezda"], barvy: ["#F2A6B0", "#F4EBDD", "#E9C46E"] },
  ];
  /** Motiv kachle v rozložení: krajní sloupce stejné, prostřední jiný, uprostřed 正. */
  const motivPro = (tema, i) => {
    const c = i % KAM.sl, r = Math.floor(i / KAM.sl);
    if (c === 1 && r === 2) return "sei";
    const M = TEMATA[tema].motivy;
    return c === 1 ? M[(r + 1) % 3] : M[r % 2 === 0 ? 0 : 2];
  };
  const MOTIV_D = {
    srdce: "M0 2.9 C-3.7 0.3 -3.4 -2.9 -1.4 -2.9 C-0.4 -2.9 0 -2 0 -1.4 C0 -2 0.4 -2.9 1.4 -2.9 C3.4 -2.9 3.7 0.3 0 2.9 Z",
    tulipan: "M-2.2 -2.6 L-1 -0.9 L0 -3 L1 -0.9 L2.2 -2.6 C2.5 -0.2 1.6 0.8 0 0.8 C-1.6 0.8 -2.5 -0.2 -2.2 -2.6 Z M-0.35 0.8 H0.35 V3.2 H-0.35 Z M0 2.4 Q-1.9 1.2 -2.6 2.7 Q-1.1 3.3 0 2.4 Z M0 2.4 Q1.9 1.2 2.6 2.7 Q1.1 3.3 0 2.4 Z",
    ruzice: Array.from({ length: 6 }, (_, k) => {
      const a = rad(k * 60 - 90), b = rad(k * 60 - 90 + 30), c2 = rad(k * 60 - 90 - 30);
      return `M0 0 Q${f(Math.cos(c2) * 2.6)} ${f(Math.sin(c2) * 2.6)} ${f(Math.cos(a) * 3.2)} ${f(Math.sin(a) * 3.2)} Q${f(Math.cos(b) * 2.6)} ${f(Math.sin(b) * 2.6)} 0 0 Z`;
    }).join(" "),
    sakura: Array.from({ length: 5 }, (_, k) => {
      const a = rad(k * 72 - 90);
      const P = (r, da) => pt([Math.cos(a + rad(da)) * r, Math.sin(a + rad(da)) * r]);
      return `M0 0 Q${P(2.2, -32)} ${P(3.2, -10)} L${P(2.7, 0)} L${P(3.2, 10)} Q${P(2.2, 32)} 0 0 Z`;
    }).join(" "),
    hvezda: "M-2.2 -2.2 H2.2 V2.2 H-2.2 Z M0 -3.1 L3.1 0 L0 3.1 L-3.1 0 Z",
    vlny: "M-3.4 1.6 A3.4 3.4 0 0 1 3.4 1.6 M-2.3 1.6 A2.3 2.3 0 0 1 2.3 1.6 M-1.2 1.6 A1.2 1.2 0 0 1 1.2 1.6 M-3.4 -1.4 A1.7 1.7 0 0 1 0 -1.4 A1.7 1.7 0 0 1 3.4 -1.4",
  };
  const motivSvg = (motiv, T) => {
    if (motiv === "sei") return seiZnak(-3.1, -3.1, 6.2, { barva: T.styl === "malba" && T.telo === "#F1EADA" ? "#C4432B" : "#C4432B", tah: "#F4EBDD", uhel: -4, sirka: 0.6 });
    const d = MOTIV_D[motiv];
    if (motiv === "vlny" || T.styl === "linka") {
      const barva = T.barvy ? T.barvy[0] : T.svetlo;
      return `<path d="${d}" fill="none" stroke="${barva}" stroke-width="0.45" stroke-linejoin="round"/>` + (motiv === "ruzice" || motiv === "sakura" ? `<circle r="0.7" fill="${barva}"/>` : "");
    }
    if (T.styl === "malba") {
      const [a, b] = T.barvy;
      return `<path d="${d}" fill="${a}" stroke="${mix(a, "#000000", 0.25)}" stroke-width="0.2"/>` + `<circle r="${motiv === "srdce" ? 0.6 : 0.85}" fill="${b}"/>`;
    }
    const plocha = mix(T.telo, T.svetlo, 0.35);
    return `<path d="${d}" fill="${T.svetlo}" transform="translate(-0.3 -0.3)"/><path d="${d}" fill="${T.stin}" transform="translate(0.3 0.3)"/><path d="${d}" fill="${plocha}"/>`;
  };
  /** Kachel 12 × 12 s levým horním rohem v x, y. */
  const kachel = (x, y, tema, motiv, { uhel = 0, prasklina = false, zar = 0 } = {}) => {
    const T = TEMATA[tema];
    let g = `<rect x="0.25" y="0.25" width="11.5" height="11.5" rx="0.9" fill="${T.telo}" stroke="${T.stin}" stroke-width="0.45"/>`;
    g += `<rect x="1.3" y="1.3" width="9.4" height="9.4" rx="0.5" fill="none" stroke="${T.svetlo}" stroke-width="0.5" opacity="0.85"/>`;
    g += `<rect x="1.85" y="1.85" width="8.3" height="8.3" rx="0.4" fill="none" stroke="${T.stin}" stroke-width="0.35" opacity="0.8"/>`;
    g += `<g transform="translate(6 6)">${motivSvg(motiv, T)}</g>`;
    g += `<path d="M1.5 4.2 Q1.7 1.7 4.4 1.4" stroke="#FFFFFF" stroke-width="0.5" opacity="0.35" fill="none" stroke-linecap="round"/>`;
    if (prasklina) g += `<path d="M1.6 0.8 L4.4 4.2 L3.6 6.3 L6.8 8.1 L6.1 11.2 M4.4 4.2 L7.4 3.4" stroke="#1A1410" stroke-width="0.45" fill="none" stroke-linejoin="round"/>`;
    if (zar > 0.01) g += `<rect x="0.25" y="0.25" width="11.5" height="11.5" rx="0.9" fill="#FF9440" opacity="${f(zar * 0.16)}"/>`;
    return `<g transform="translate(${f(x)} ${f(y)})${Math.abs(uhel) > 0.001 ? ` rotate(${f(uhel)} 6 6)` : ""}">${g}</g>`;
  };
  const rimsa = (x, y, tema) => {
    const T = TEMATA[tema];
    return (
      `<g transform="translate(${f(x)} ${f(y)})">` +
      `<path d="M3 6 H39 V4.2 H41 V2 H42 V0 H0 V2 H1 V4.2 H3 Z" fill="${T.telo}" stroke="${T.stin}" stroke-width="0.45" stroke-linejoin="round"/>` +
      `<path d="M0.4 0.6 H41.6 M1.4 2.6 H40.6" stroke="${T.svetlo}" stroke-width="0.5" opacity="0.8"/>` +
      `<path d="M3 5.6 H39" stroke="${T.stin}" stroke-width="0.4"/>` +
      Array.from({ length: 7 }, (_, i) => `<rect x="${f(5 + i * 5.2)}" y="4.4" width="2.2" height="1.2" fill="${T.stin}" opacity="0.6"/>`).join("") +
      `</g>`
    );
  };

  /* ——— Noc, chalupa, sněhulák (statické) ——— */
  const NOC = hrouda(90, 86, 88, 84, 12, { bodu: 30, kolisani: 0.05 });
  const vrstvaNoc = () => {
    const r = rng(23);
    let s = `<path d="${hrouda(90, 86, 92, 88, 19, { bodu: 30, kolisani: 0.06 })}" fill="#2A3560" opacity="0.45" filter="url(#kr3-tus-lem)"/>`;
    s += `<path d="${NOC}" fill="url(#kr3-noc)" filter="url(#kr3-tus)"/>`;
    s += `<g clip-path="url(#kr3-noc-orez)">`;
    s += `<g fill="#F4EBDD">${Array.from({ length: 34 }, () => `<circle cx="${f(8 + r() * 164)}" cy="${f(6 + r() * 70)}" r="${f(0.25 + r() * 0.45)}" opacity="${f(0.45 + r() * 0.55)}"/>`).join("")}</g>`;
    s += `<circle cx="${MESIC[0]}" cy="${MESIC[1]}" r="22" fill="url(#kr3-mesic-zar)"/>`;
    s += `</g>`;
    return s;
  };
  const vrstvaMesic = (st) =>
    `<g transform="rotate(${f(st.mesic)} ${MESIC[0]} ${MESIC[1] + 9})"><circle cx="${MESIC[0]}" cy="${MESIC[1]}" r="8" fill="#F1E6C6"/><circle cx="${MESIC[0] + 3.8}" cy="${MESIC[1] - 2.4}" r="7.2" fill="#22305A"/></g>` +
    (st.mesicSplat > 0 ? `<g opacity="${f(st.mesicSplat)}">${splatD(MESIC[0] - 3, MESIC[1] + 1, 2.4)}</g>` : "");

  const splatD = (x, y, s) => {
    const r = rng(Math.round(x * 13 + y * 7));
    const B = Array.from({ length: 12 }, (_, i) => {
      const u = (i / 12) * Math.PI * 2;
      const k = i % 2 ? 0.55 + r() * 0.2 : 0.9 + r() * 0.45;
      return [x + Math.cos(u) * s * k, y + Math.sin(u) * s * k * 0.85];
    });
    return `<path d="${hladka(B, true)}" fill="#FBFDFF" stroke="#B8C6DA" stroke-width="0.3"/><circle cx="${f(x + s * 1.3)}" cy="${f(y - s * 0.4)}" r="${f(s * 0.18)}" fill="#FBFDFF"/><circle cx="${f(x - s * 1.2)}" cy="${f(y + s * 0.6)}" r="${f(s * 0.14)}" fill="#FBFDFF"/>`;
  };

  const STRECHA = { l: [18, 72], v: [90, 17], p: [162, 72] };
  const vrstvaDum = () => {
    const r = rng(41);
    let s = "";
    /* smrček vpravo a sněhulák z kostek vlevo */
    const smrk = [[165, 150, 13], [165, 140, 11], [165, 131, 9], [165, 123, 7], [165, 116, 5]];
    s += `<path d="M164 150 V154" stroke="#3A2A20" stroke-width="1.6"/>`;
    for (const [x, y, w] of smrk) {
      s += `<path d="M${x - w} ${y} L${x} ${y - w * 1.15} L${x + w} ${y} Z" fill="#24463A" stroke="#16302A" stroke-width="0.4" stroke-linejoin="round"/>`;
      s += `<path d="M${f(x - w * 0.85)} ${f(y - 0.6)} Q${x} ${f(y - w * 0.5)} ${f(x + w * 0.85)} ${f(y - 0.6)} Q${x} ${f(y - w * 0.3)} ${f(x - w * 0.85)} ${f(y - 0.6)} Z" fill="#F4F7FB"/>`;
    }
    s += `<path d="M165 109.6 l0.9 1.8 h-1.8 Z" fill="#F4F7FB"/>`;
    s += snehulak();
    /* střecha: krytina v řezu a pod ní půda */
    const [L, V, P] = [STRECHA.l, STRECHA.v, STRECHA.p];
    s += `<path d="M${pt(L)} L${pt(V)} L${pt(P)} Z" fill="#3A2C22"/>`;
    s += `<path d="M30 64 L90 23 L150 64 Z" fill="#2A1F18"/>`;
    s += `<path d="M90 23 V64 M60 43.5 V64 M120 43.5 V64" stroke="#4A382A" stroke-width="1.2"/>`;
    /* na půdě se suší bylinky a visí cop česneku */
    s += `<path d="M68 52 V56 M74 50 V55 M106 50 V54" stroke="#6E5A44" stroke-width="0.4"/>`;
    s += `<path d="M66.6 56 l1.4 4 l1.4 -4 Z M72.6 55 l1.4 4.4 l1.4 -4.4 Z" fill="#7A8A4A"/><g fill="#EDE2C8">${[0, 1.8, 3.6].map((d) => `<ellipse cx="106" cy="${f(55.4 + d)}" rx="1.1" ry="0.95"/>`).join("")}</g>`;
    s += `<path d="M${pt(L)} L${pt(V)} L${pt(P)}" stroke="#5A4232" stroke-width="5" fill="none" stroke-linejoin="round"/>`;
    s += `<path d="M${pt(L)} L${pt(V)} L${pt(P)}" stroke="#7A5A44" stroke-width="2.6" fill="none" stroke-linejoin="round" stroke-dasharray="2 0.6"/>`;
    /* komín */
    s += `<rect x="${KOMIN[0] - 4.4}" y="${KOMIN[1]}" width="8.8" height="18" fill="#8A5A44" stroke="#3E2418" stroke-width="0.5"/>`;
    s += `<g stroke="#5E3A2A" stroke-width="0.35">${[3, 6, 9, 12, 15].map((d) => `<path d="M${KOMIN[0] - 4.4} ${KOMIN[1] + d} h8.8"/>`).join("")}</g>`;
    s += `<rect x="${KOMIN[0] - 5.2}" y="${KOMIN[1] - 1.4}" width="10.4" height="2" fill="#6E4434" stroke="#3E2418" stroke-width="0.5"/>`;
    s += `<path d="M${KOMIN[0] - 5.6} ${KOMIN[1] - 1.4} Q${KOMIN[0]} ${KOMIN[1] - 5} ${KOMIN[0] + 5.6} ${KOMIN[1] - 1.4} Z" fill="#F4F7FB" stroke="#C4D0E2" stroke-width="0.3"/>`;
    /* sníh na střeše: silná hrbolatá peřina s převisem nad okapem */
    const snih = [];
    for (let i = 0; i <= 26; i++) {
      const u = i / 26;
      const P0 = u < 0.5 ? lerpP([L[0] - 3, L[1] - 1], V, u * 2) : lerpP(V, [P[0] + 3, P[1] - 1], (u - 0.5) * 2);
      const tl = 4.6 + 1.6 * Math.sin(u * 23 + 1) + (r() - 0.5) * 1.2 - (Math.abs(u - 0.5) < 0.04 ? 1.4 : 0);
      snih.push([P0[0], P0[1] - tl]);
    }
    const snihD = `M${pt([L[0] - 4, L[1] + 1.5])} ` + snih.map((q) => `L${pt(q)}`).join(" ") + ` L${pt([P[0] + 4, P[1] + 1.5])} Q${f(P[0] - 2)} ${f(P[1] - 0.6)} ${pt(lerpP(V, P, 0.92))} L${pt(V)} L${pt(lerpP(V, L, 0.92))} Q${f(L[0] + 2)} ${f(L[1] - 0.6)} ${pt([L[0] - 4, L[1] + 1.5])} Z`;
    s += `<path d="${snihD}" fill="url(#kr3-snih)" stroke="#AEBCD2" stroke-width="0.35" stroke-linejoin="round"/>`;
    /* rampouchy: všechny stejně dlouhé, kromě jednoho */
    s += `<g fill="#DDEAF6" stroke="#9FB4CE" stroke-width="0.25">${RAMPOUCHY.map(([x, y, l]) => `<path d="M${f(x - 0.8)} ${f(y)} L${f(x)} ${f(y + l)} L${f(x + 0.8)} ${f(y)} Z"/>`).join("")}</g>`;
    /* zadní stěna z trámů s vybílenými spárami */
    s += `<rect x="30" y="64" width="120" height="82" fill="#7A5236"/>`;
    for (let y = 64, i = 0; y < 146; y += 6.8, i++) {
      s += `<rect x="30" y="${f(y)}" width="120" height="6.2" fill="${i % 2 ? "#845A3C" : "#7A5236"}"/>`;
      s += `<path d="M30 ${f(y + 6.5)} H150" stroke="#E6D9BE" stroke-width="0.7"/>`;
      s += `<path d="M30 ${f(y + 1.2)} H150" stroke="#9A7050" stroke-width="0.4" opacity="0.6"/>`;
    }
    /* stěny v řezu: čela trámů */
    for (const x of [33, 147]) {
      for (let y = 67.4; y < 146; y += 6.8) s += `<circle cx="${x}" cy="${f(y)}" r="3.2" fill="#B08A62" stroke="#5A3E28" stroke-width="0.5"/><circle cx="${x}" cy="${f(y)}" r="1.9" fill="none" stroke="#8A6644" stroke-width="0.35"/><circle cx="${x}" cy="${f(y)}" r="0.7" fill="#8A6644"/>`;
    }
    /* trám stropu a podlaha */
    s += `<rect x="26" y="62" width="128" height="4" fill="#5A3E2A" stroke="#3A2618" stroke-width="0.4"/>`;
    s += `<rect x="30" y="146" width="120" height="4.4" fill="#9A7650" stroke="#5A3E28" stroke-width="0.4"/>`;
    s += `<g stroke="#6E5038" stroke-width="0.35">${[44, 60, 76, 92, 108, 124, 140].map((x) => `<path d="M${x} 146 v4.4"/>`).join("")}</g>`;
    /* okno se čtyřmi tabulkami a krajkovou záclonkou */
    const { x: ox, y: oy, s: os } = OKNO;
    s += `<rect x="${ox - 2}" y="${oy - 2}" width="${os + 4}" height="${os + 4}" fill="#EDE6D8" stroke="#8A7A62" stroke-width="0.5"/>`;
    s += `<rect x="${ox - 3}" y="${oy + os + 1.6}" width="${os + 6}" height="2.2" fill="#E2D8C4" stroke="#8A7A62" stroke-width="0.45"/>`;
    /* police s habánskými talíři a džbánkem */
    s += `<rect x="72" y="83" width="24" height="1.6" fill="#6E4A2E"/><path d="M74 84.6 l2 3 M94 84.6 l-2 3" stroke="#6E4A2E" stroke-width="0.8"/>`;
    for (const [x, b] of [[78, "#2F4E9C"], [88, "#4E8A4A"]]) {
      s += `<circle cx="${x}" cy="79.2" r="3.8" fill="#F4EEE0" stroke="#A89A80" stroke-width="0.4"/><circle cx="${x}" cy="79.2" r="2.8" fill="none" stroke="${b}" stroke-width="0.4"/>`;
      s += `<path d="${MOTIV_D.tulipan}" transform="translate(${x} 79.2) scale(0.55)" fill="${b}"/><circle cx="${x}" cy="78.9" r="0.4" fill="#E3A62E"/>`;
    }
    s += `<path d="M92.6 83 C91.8 80.6 92 78.4 93.4 77.6 H95.6 C97 78.4 97.2 80.6 96.4 83 Z" fill="#B84A2B" stroke="#6E2A18" stroke-width="0.4"/><path d="M96.6 78.6 Q98.6 79.4 96.8 81.4" stroke="#6E2A18" stroke-width="0.6" fill="none"/>`;
    /* lampa na trámu */
    s += `<path d="M88 66 V73" stroke="#4A3A2A" stroke-width="0.4"/><path d="M85.6 77.6 H90.4 L89.4 80 H86.6 Z" fill="#C9A04A" stroke="#6E5420" stroke-width="0.3"/>`;
    s += `<path d="M86.4 77.6 C85.8 75.6 86.6 74 88 73.4 C89.4 74 90.2 75.6 89.6 77.6 Z" fill="#FFF0C8" opacity="0.9" stroke="#C9B48A" stroke-width="0.25"/><ellipse cx="88" cy="76.2" rx="0.6" ry="1" fill="#FFB648"/>`;
    /* lavice pod oknem a bedna s kachlemi pod ní */
    s += `<rect x="36" y="124" width="29" height="2.8" fill="#A07A52" stroke="#5A3E28" stroke-width="0.4"/>`;
    s += `<path d="M38.6 126.8 V146 M62.4 126.8 V146" stroke="#7A5638" stroke-width="1.8"/>`;
    s += `<rect x="${BEDNA.x}" y="${BEDNA.y}" width="${BEDNA.w}" height="${BEDNA.h}" fill="#9A7048" stroke="#4E3420" stroke-width="0.5"/>`;
    s += `<path d="M${BEDNA.x} ${BEDNA.y + 4} h${BEDNA.w} M${BEDNA.x} ${BEDNA.y + 8} h${BEDNA.w}" stroke="#6E4E30" stroke-width="0.45"/>`;
    s += `<path d="M${BEDNA.x + 1.2} ${BEDNA.y + 1.2} l${BEDNA.w - 2.4} ${BEDNA.h - 2.4}" stroke="#6E4E30" stroke-width="0.7"/>`;
    /* podezdívka a sníh kolem chalupy */
    s += `<path d="M2 150 C20 147 40 149.6 60 149 C90 148.2 120 150 150 149 C162 148.6 172 149.4 178 150.2 L178 165 C150 170 30 170 2 165 Z" fill="url(#kr3-zem)"/>`;
    s += `<path d="M2 150 C20 147 40 149.6 60 149 C90 148.2 120 150 150 149 C162 148.6 172 149.4 178 150.2" stroke="#B8C6DA" stroke-width="0.45" fill="none"/>`;
    return s;
  };
  const RAMPOUCHY = (() => {
    const out = [];
    for (let i = 0; i < 5; i++) out.push([21 + i * 2.4, 72.4 - i * 1.85, i === 3 ? 6.4 : 4.6]);
    for (let i = 0; i < 5; i++) out.push([159 - i * 2.4, 72.4 - i * 1.85, 4.6]);
    return out;
  })();
  const snehulak = () => {
    let s = `<ellipse cx="15" cy="150.4" rx="10" ry="1.6" fill="#9FB4CE" opacity="0.5"/>`;
    const kost = (x, y, w, uhel = 0) => `<g transform="rotate(${uhel} ${f(x + w / 2)} ${f(y + w / 2)})"><rect x="${x}" y="${y}" width="${w}" height="${w}" rx="1.4" fill="url(#kr3-snih)" stroke="#9FB4CE" stroke-width="0.4"/><path d="M${f(x + 1)} ${f(y + 1.6)} h${f(w * 0.35)}" stroke="#FFFFFF" stroke-width="0.5" stroke-linecap="round"/></g>`;
    /* ruce z klacků v pravém úhlu a koště */
    s += `<path d="M9 135.6 H3.6 V130.6 M21 135.6 H26.4 V130.6" stroke="#5A3E28" stroke-width="0.8" fill="none" stroke-linecap="round"/>`;
    s += `<path d="M26.4 129 V151" stroke="#7A5638" stroke-width="0.7"/><path d="M24.4 151 L26.4 144.6 L28.4 151 Z" fill="#C9A86A" stroke="#7A5638" stroke-width="0.3"/>`;
    s += kost(8.5, 138, 13) + kost(10, 129.2, 10);
    s += `<g fill="#2A2420">${[[15, 133.4], [15, 136.2], [15, 141.6], [15, 145]].map(([x, y]) => `<rect x="${x - 0.6}" y="${y - 0.6}" width="1.2" height="1.2"/>`).join("")}</g>`;
    /* hlava je nakřivo o tři stupně; na ní hrnec */
    s += `<g transform="rotate(3 15 125.6)">${kost(11.2, 121.8, 7.6)}<rect x="12.6" y="123.6" width="1.1" height="1.1" fill="#2A2420"/><rect x="16.4" y="123.6" width="1.1" height="1.1" fill="#2A2420"/><path d="M15.4 125.6 H20.4 L15.4 126.8 Z" fill="#E3862F"/>`;
    s += `<path d="M11.6 121.8 L12.4 117.6 H17.8 L18.6 121.8 Z" fill="#B84A2B" stroke="#6E2A18" stroke-width="0.35"/><path d="M11 121.8 H19.2" stroke="#6E2A18" stroke-width="0.7"/></g>`;
    return s;
  };

  /* ——— Okno: venku sněží, na tabulkách mráz ——— */
  const MRAZ = (() => {
    const r = rng(88);
    const tab = OKNO.s / 2 - 0.6;
    let d = "";
    const vetev = (x, y, a, l, hloubka) => {
      const x2 = x + Math.cos(a) * l, y2 = y + Math.sin(a) * l;
      d += `M${pt([x, y])} L${pt([x2, y2])} `;
      if (hloubka > 0) {
        for (let k = 1; k <= 3; k++) {
          const q = k / 4;
          const bx = x + Math.cos(a) * l * q, by = y + Math.sin(a) * l * q;
          vetev(bx, by, a + rad(55), l * 0.38 * (1 - q * 0.4), hloubka - 1);
          vetev(bx, by, a - rad(55), l * 0.38 * (1 - q * 0.4), hloubka - 1);
        }
      }
    };
    for (let ty = 0; ty < 2; ty++)
      for (let tx = 0; tx < 2; tx++) {
        const x0 = OKNO.x + tx * (OKNO.s / 2) + 0.6, y0 = OKNO.y + ty * (OKNO.s / 2) + 0.6;
        const rohy = [[x0, y0, 45], [x0 + tab, y0, 135], [x0, y0 + tab, -45], [x0 + tab, y0 + tab, -135]];
        for (const [x, y, a] of rohy) {
          if (r() < 0.25) continue;
          vetev(x, y, rad(a + (r() - 0.5) * 30), 2.6 + r() * 2.4, 1);
        }
      }
    return d;
  })();
  const vrstvaOkno = (st) => {
    const { x, y, s: os } = OKNO;
    let s = `<g clip-path="url(#kr3-okno)"><rect x="${x}" y="${y}" width="${os}" height="${os}" fill="#22305A"/>`;
    s += `<path d="M${x} ${y + 16} Q${x + 8} ${y + 12} ${x + 14} ${y + 14} T${x + os} ${y + 12.6} V${y + os} H${x} Z" fill="#DDE6F2"/>`;
    s += `<path d="M${x + 15} ${y + 14} l2.4 -5 l2.4 5 Z" fill="#1E3A32"/><circle cx="${x + 5}" cy="${y + 13.4}" r="0.6" fill="#FFC870"/>`;
    for (const v of st.snihOkno) s += `<circle cx="${f(v.x)}" cy="${f(v.y)}" r="${f(v.r)}" fill="#FFFFFF" opacity="0.85"/>`;
    /* mráz: bílé kapradiny z rohů tabulek, s teplem tají */
    if (st.mraz > 0.02) {
      s += `<g opacity="${f(st.mraz)}"><rect x="${x}" y="${y}" width="${os}" height="${os}" fill="url(#kr3-jinovatka)"/>`;
      s += `<path d="${MRAZ}" stroke="#F4FAFF" stroke-width="0.32" fill="none" stroke-linecap="round"/></g>`;
    }
    s += `</g>`;
    s += `<path d="M${x + os / 2} ${y} V${y + os} M${x} ${y + os / 2} H${x + os}" stroke="#EDE6D8" stroke-width="1.3"/>`;
    s += `<rect x="${x}" y="${y}" width="${os}" height="${os}" fill="none" stroke="#C9BFAC" stroke-width="0.5"/>`;
    /* krajková záclonka */
    s += `<path d="M${x - 1} ${y} H${x + os + 1} V${y + 2.4} ${Array.from({ length: 8 }, (_, i) => `Q${f(x + os + 1 - (i + 0.5) * ((os + 2) / 8))} ${y + 4.4} ${f(x + os + 1 - (i + 1) * ((os + 2) / 8))} ${y + 2.4}`).join(" ")} Z" fill="#FBF8F0" stroke="#D8CCB4" stroke-width="0.3"/>`;
    s += `<g fill="#D8CCB4">${Array.from({ length: 8 }, (_, i) => `<circle cx="${f(x - 1 + (i + 0.5) * ((os + 2) / 8))}" cy="${y + 2.6}" r="0.45"/>`).join("")}</g>`;
    return s;
  };

  /* ——— Kamna ——— */
  const vrstvaKamna = (st) => {
    let s = "";
    /* podstavec s litinovými dvířky */
    s += `<rect x="${KAM.x}" y="134" width="36" height="12" fill="#5E4A3C" stroke="#2E221A" stroke-width="0.5"/>`;
    s += `<path d="M${KAM.x} 140 H${KAM.x + 36}" stroke="#4A3A2E" stroke-width="0.4"/>`;
    /* nehotové sloty: hliněné tělo kamen s maltou */
    s += `<rect x="${KAM.x}" y="${KAM.y}" width="36" height="48" fill="#8E7056" stroke="#4E3A2A" stroke-width="0.5"/>`;
    for (let i = 0; i < N; i++) {
      const [x, y] = slotXY(i);
      s += `<rect x="${x + 1}" y="${y + 1}" width="10" height="10" rx="0.6" fill="#7A5E46" stroke="#A88A6A" stroke-width="0.35" stroke-dasharray="1.2 0.8"/>`;
    }
    /* položené kachle */
    st.kachle.forEach((k, i) => {
      if (!k) return;
      const [x, y] = slotXY(i);
      s += kachel(x, y, st.tema, k.motiv, { uhel: k.uhel, prasklina: k.prasklina, zar: st.teplo });
    });
    if (st.rimsa) s += rimsa(RIMSA.x, RIMSA.y, st.tema);
    /* roura do komína */
    if (st.rimsa) s += `<rect x="132.6" y="62" width="4.8" height="${RIMSA.y - 62}" fill="#3A3434" stroke="#1E1A1A" stroke-width="0.4"/><path d="M132 72 h6" stroke="#1E1A1A" stroke-width="0.8"/>`;
    return s;
  };
  const vrstvaDvirka = (st) => {
    const o = st.dvirka;
    const x = KAM.x + 11, y = 136.6, w = 14, h = 7.8;
    let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="0.6" fill="#1A1614"/>`;
    if (st.ohen > 0.01) {
      const fl = 0.75 + 0.25 * Math.sin(st.t * 17) * Math.sin(st.t * 7.3 + 1);
      s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="0.6" fill="url(#kr3-ohen)" opacity="${f(st.ohen * fl)}"/>`;
    }
    const sir = w * Math.cos(o * rad(100));
    s += `<path d="M${x} ${y} L${f(x + sir)} ${f(y - o * 1.2)} L${f(x + sir)} ${f(y + h + o * 1.2)} L${x} ${y + h} Z" fill="#2E2A28" stroke="#121010" stroke-width="0.5"/>`;
    if (Math.cos(o * rad(100)) > 0.4) {
      const svit = st.ohen > 0.01 ? zar(0.62 + 0.18 * st.ohen + 0.04 * Math.sin(st.t * 13)) : "#141110";
      s += `<g fill="${svit}">${[0.25, 0.42, 0.59, 0.76].map((p) => `<rect x="${f(x + sir * p - 0.5)}" y="${y + 2}" width="1" height="${h - 4}" rx="0.4"/>`).join("")}</g>`;
      s += `<circle cx="${f(x + sir * 0.9)}" cy="${y + h / 2}" r="0.7" fill="#8A8078"/>`;
    }
    return s;
  };

  /* ——— Kočka ——— */
  const kockaSedi = (x, y, pohled, mrk, usi = 0) => {
    const [px, py] = pohled;
    let s = `<path d="M3.4 -0.4 Q7.6 -0.6 6.6 -4.8 Q6.2 -6.6 5 -6.2" stroke="#6E6862" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
    s += `<path d="M-3.8 0 C-4.2 -3.2 -3.4 -6.6 0 -7 C3.4 -6.6 4.2 -3.2 3.8 0 Z" fill="#8C8580" stroke="#4E4842" stroke-width="0.35"/>`;
    s += `<path d="M-2.8 -2.2 q1 -0.6 1.2 -2 M2.8 -2.2 q-1 -0.6 -1.2 -2" stroke="#5E5852" stroke-width="0.5" fill="none"/>`;
    s += `<ellipse cx="0" cy="-3.4" rx="1.6" ry="2.3" fill="#F2EEE6"/>`;
    s += `<g transform="translate(${f(px * 0.5)} 0)">`;
    const ucho = usi > 0.5 ? "M-3 -10.2 L-4.2 -11.2 L-1.6 -11 Z M3 -10.2 L4.2 -11.2 L1.6 -11 Z" : "M-3 -10 L-2.6 -12.8 L-0.8 -11 Z M3 -10 L2.6 -12.8 L0.8 -11 Z";
    s += `<path d="${ucho}" fill="#8C8580" stroke="#4E4842" stroke-width="0.35" stroke-linejoin="round"/>`;
    s += `<circle cx="0" cy="-8.8" r="3.3" fill="#8C8580" stroke="#4E4842" stroke-width="0.35"/>`;
    s += `<path d="M-1 -11.6 v1.2 M0 -11.9 v1.4 M1 -11.6 v1.2" stroke="#5E5852" stroke-width="0.4"/>`;
    if (mrk > 0.6) s += `<path d="M-2 -8.8 h1.4 M0.6 -8.8 h1.4" stroke="#2A2420" stroke-width="0.4"/>`;
    else
      for (const ex of [-1.3, 1.3]) {
        s += `<ellipse cx="${ex}" cy="-8.8" rx="0.95" ry="${f(0.75 * (1 - mrk))}" fill="#C8D44A"/>`;
        s += `<ellipse cx="${f(ex + px * 0.35)}" cy="${f(-8.8 + py * 0.2)}" rx="0.22" ry="${f(0.65 * (1 - mrk))}" fill="#1A1614"/>`;
      }
    s += `<path d="M-0.4 -7.6 h0.8 l-0.4 0.5 Z" fill="#D88A8A"/><path d="M0 -7.1 q-0.6 0.6 -1.1 0.2 M0 -7.1 q0.6 0.6 1.1 0.2" stroke="#4E4842" stroke-width="0.25" fill="none"/>`;
    s += `<path d="M-1.6 -7.4 h-2 M-1.6 -7 l-1.8 0.5 M1.6 -7.4 h2 M1.6 -7 l1.8 0.5" stroke="#EDE6DC" stroke-width="0.15"/>`;
    s += `</g>`;
    return `<g transform="translate(${f(x)} ${f(y)})">${s}</g>`;
  };
  const kockaSpi = (x, y, t) => {
    const d = 1 + 0.05 * Math.sin(t * 2.2);
    let s = `<ellipse cx="0" cy="-2.6" rx="6.2" ry="${f(2.8 * d)}" fill="#8C8580" stroke="#4E4842" stroke-width="0.35"/>`;
    s += `<path d="M-4 -2.4 q1.6 -1.6 3 -0.4 M0 -2 q1.6 -1.6 3 -0.4" stroke="#5E5852" stroke-width="0.45" fill="none"/>`;
    s += `<path d="M5.6 -1 Q2 1.2 -3.4 0.2" stroke="#6E6862" stroke-width="1.4" fill="none" stroke-linecap="round"/>`;
    s += `<path d="M-6.8 -5.6 L-6.6 -8 L-5 -6.4 Z M-3.6 -6 L-3.4 -8.2 L-2 -6.4 Z" fill="#8C8580" stroke="#4E4842" stroke-width="0.3"/>`;
    s += `<circle cx="-4.6" cy="-4" r="2.6" fill="#8C8580" stroke="#4E4842" stroke-width="0.35"/>`;
    s += `<path d="M-6 -4.2 q0.6 0.5 1.1 0 M-4.2 -4.2 q0.6 0.5 1.1 0" stroke="#2A2420" stroke-width="0.35" fill="none"/>`;
    const z = ((t * 0.5) % 1 + 1) % 1;
    s += `<path d="M${f(-1 + z * 3)} ${f(-8 - z * 6)} h1.3 l-1.3 1.4 h1.3" stroke="#F4EBDD" stroke-width="0.3" fill="none" opacity="${f(1 - z)}"/>`;
    return `<g transform="translate(${f(x)} ${f(y)})">${s}</g>`;
  };
  const kockaSkok = (x, y, smer) =>
    `<g transform="translate(${f(x)} ${f(y)}) scale(${smer} 1)"><path d="M-6 -2 Q0 -6.4 6 -3.6 Q2 -0.8 -6 -2 Z" fill="#8C8580" stroke="#4E4842" stroke-width="0.35"/><circle cx="6" cy="-4.4" r="2.4" fill="#8C8580" stroke="#4E4842" stroke-width="0.35"/><path d="M5 -6.2 l0.4 -2 l1.2 1.6 M7 -6.2 l0.8 -1.8 l0.6 1.8" fill="#8C8580" stroke="#4E4842" stroke-width="0.3"/><path d="M-6 -2 Q-9 -2.4 -10 -5" stroke="#6E6862" stroke-width="1.3" fill="none" stroke-linecap="round"/><path d="M-4 -1.2 l-2 2.6 M3 -2 l2.4 2.2" stroke="#6E6862" stroke-width="1" stroke-linecap="round"/></g>`;
  const vrstvaKocka = (st) => {
    const k = st.kocka;
    if (k.faze === "skok") return kockaSkok(k.x, k.y, k.smer);
    if (k.faze === "spi") return kockaSpi(KOCKA_PEC[0], KOCKA_PEC[1], st.t);
    return kockaSedi(k.x, k.y, k.pohled, k.mrk, k.usi);
  };

  /* ——— Kachlík, jeho ruce a co má zrovna v ruce ——— */
  const kulich = () => {
    let s = `<path d="M44 58 V49 Q44 37 58 35.6 H122 Q136 37 136 49 V58 Z" fill="#C4432B" stroke="#6E2A18" stroke-width="1.6" stroke-linejoin="round"/>`;
    s += `<path d="M44.8 46 H135.2" stroke="#F4EBDD" stroke-width="3"/>`;
    s += `<path d="${Array.from({ length: 11 }, (_, i) => `M${48 + i * 8} 46 l4 -1.4 l4 1.4`).join(" ")}" stroke="#C4432B" stroke-width="1.1" fill="none"/>`;
    s += `<rect x="44" y="51" width="92" height="7" fill="#A8341F"/><path d="${Array.from({ length: 23 }, (_, i) => `M${47 + i * 4} 51.6 V57.4`).join(" ")}" stroke="#7E2414" stroke-width="1"/>`;
    s += `<path d="${hrouda(90, 30, 9, 8, 77, { bodu: 16, kolisani: 0.14 })}" fill="#F4EBDD" stroke="#C9B9A0" stroke-width="1"/>`;
    s += `<path d="M84 27 q3 -3 6 -1" stroke="#FFFFFF" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
    return s;
  };
  const sirka = 1.95;
  const vrstvaKachlik = (st) => {
    const K = st.kach;
    const dx = K.trese;
    const T = `translate(${f(KX + dx)} ${POD}) scale(${SC}) translate(-90 -${KACH.dno})`;
    let s = `<ellipse cx="${KX}" cy="${POD + 0.4}" rx="13" ry="1.4" fill="#2A1C14" opacity="0.35"/>`;
    s += `<g transform="${T}">${kachGeta({ zvednuti: [0, 0] })}${kachNohy({})}${kachTelo("kr3")}${kachTvar("kr3", { dx: st.pohled[0], dy: st.pohled[1], mrk: st.mrk, cuk: st.cuk, oci: st.oci, oboci: st.oboci, usta: st.usta, tvare: st.tvare })}${kulich()}</g>`;
    if (K.splat > 0) s += `<g opacity="${f(K.splat)}">${splatD(KX + dx + 2, 128, 3.4)}</g>`;
    const rl = [RAMENO_L[0] + dx, RAMENO_L[1]], rp = [RAMENO_P[0] + dx, RAMENO_P[1]];
    s += ruka(rl, K.L, { ohyb: 3, tloustka: sirka });
    s += ruka(rp, K.P, { ohyb: -3, tloustka: sirka });
    /* kachel v ruce nebo ve vzduchu: vždycky naprosto rovně */
    if (K.nese) s += K.nese.rimsa ? rimsa(K.nese.x - 21, K.nese.y - 3, st.tema) : kachel(K.nese.x - 6, K.nese.y - 6, st.tema, K.nese.motiv);
    if (K.sirka) {
      const [x, y] = K.P;
      s += `<path d="M${f(x)} ${f(y)} l3 -2.4" stroke="#E2C48A" stroke-width="0.5"/><circle cx="${f(x + 3.2)}" cy="${f(y - 2.6)}" r="0.6" fill="#C4432B"/>`;
      if (K.sirka > 1) s += `<path d="M${f(x + 3.2)} ${f(y - 2.8)} q-1 -1.6 0 -3 q1 1.4 0 3 Z" fill="#FFC048" opacity="0.9"/>`;
    }
    /* dlaně navrch, ať kachel drží */
    s += dlanKruh(K.L, sirka) + dlanKruh(K.P, sirka);
    return s;
  };

  /* ——— Světlo, sníh, koule ——— */
  const vrstvaSvetlo = (st) =>
    `<g clip-path="url(#kr3-dum)">` +
    `<circle cx="88" cy="76" r="44" fill="url(#kr3-lampa)"/>` +
    (st.teplo > 0.01 ? `<circle cx="${KAM.x + 18}" cy="138" r="${f(56 + 6 * Math.sin(st.t * 3.1))}" fill="url(#kr3-teplo)" opacity="${f(st.teplo)}"/>` : "") +
    (st.ohenDvere > 0.01 ? `<circle cx="${KAM.x + 18}" cy="141" r="26" fill="url(#kr3-teplo)" opacity="${f(st.ohenDvere)}"/>` : "") +
    `</g>`;
  const vrstvaChlad = (st) => `<rect x="30" y="62" width="120" height="88" fill="#7E92C4" opacity="${f(0.38 * (1 - st.teplo))}"/>`;
  const vrstvaVenku = (st) => {
    let s = `<g clip-path="url(#kr3-venku)">`;
    for (const v of st.snih) {
      if (v.ctverec) s += `<rect x="${f(v.x - v.r)}" y="${f(v.y - v.r)}" width="${f(v.r * 2)}" height="${f(v.r * 2)}" fill="#FFFFFF" stroke="#A8B8D0" stroke-width="0.15"/>`;
      else s += `<circle cx="${f(v.x)}" cy="${f(v.y)}" r="${f(v.r)}" fill="#FFFFFF" stroke="#A8B8D0" stroke-width="0.15" opacity="0.92"/>`;
    }
    for (const d of st.dym) {
      const u = d.vek / d.zivot;
      s += `<circle cx="${f(d.x)}" cy="${f(d.y)}" r="${f(d.r)}" fill="url(#kr3-dym)" opacity="${f(clamp(Math.min(u * 5, 1) * (1 - u)) * 0.8)}"/>`;
    }
    s += `</g>`;
    /* kapky z rampouchů, když se oteplí */
    for (const k of st.kapky) s += `<ellipse cx="${f(k.x)}" cy="${f(k.y)}" rx="0.35" ry="0.6" fill="#CFE2F4"/>`;
    /* sníh sesunutý ze střechy */
    for (const h of st.hroudy) s += `<path d="${hrouda(h.x, h.y, 2.6 * h.k, 1.8 * h.k, h.seed, { bodu: 10, kolisani: 0.2 })}" fill="#F4F7FB" stroke="#B8C6DA" stroke-width="0.3"/>`;
    /* rozplácnuté koule */
    for (const p of st.splaty) s += `<g opacity="${f(p.op)}">${splatD(p.x, p.y, p.s)}</g>`;
    /* letící koule: zmenšuje se, jak letí od nás */
    for (const k of st.koule) {
      const u = clamp(k.vek / k.doba);
      const x = lerp(k.od[0], k.do[0], u), y = lerp(k.od[1], k.do[1], u) - Math.sin(Math.PI * u) * k.oblouk;
      const r = lerp(6, k.r1, u);
      s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="url(#kr3-koule)" stroke="#9FB4CE" stroke-width="0.4"/>`;
    }
    /* kachle letí zpátky do bedny, když se kamna rozebírají */
    for (const l of st.letici) s += l.rimsa ? rimsa(l.x - 21, l.y - 3, st.tema) : kachel(l.x - 6, l.y - 6, st.tema, l.motiv, { prasklina: l.prasklina });
    return s;
  };

  const defs = () =>
    kachDefs("kr3") +
    `<filter id="kr3-tus" x="-12%" y="-12%" width="124%" height="124%" color-interpolation-filters="sRGB">` +
    `<feTurbulence type="fractalNoise" baseFrequency="0.055" numOctaves="4" seed="8" result="n"/>` +
    `<feDisplacementMap in="SourceGraphic" in2="n" scale="12" xChannelSelector="R" yChannelSelector="G" result="d"/>` +
    `<feGaussianBlur in="d" stdDeviation="0.55"/></filter>` +
    `<filter id="kr3-tus-lem" x="-15%" y="-15%" width="130%" height="130%"><feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="21" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="16" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation="2.4"/></filter>` +
    `<clipPath id="kr3-noc-orez"><path d="${hrouda(90, 86, 82, 78, 12, { bodu: 30, kolisani: 0.05 })}"/></clipPath>` +
    `<clipPath id="kr3-okno"><rect x="${OKNO.x}" y="${OKNO.y}" width="${OKNO.s}" height="${OKNO.s}"/></clipPath>` +
    `<clipPath id="kr3-dum"><rect x="30" y="62" width="120" height="88"/></clipPath>` +
    `<clipPath id="kr3-venku"><path clip-rule="evenodd" d="M-10 -10 H190 V190 H-10 Z M${DOMU.x0} ${DOMU.y0} H${DOMU.x1} V${DOMU.y1} H${DOMU.x0} Z"/></clipPath>` +
    `<linearGradient id="kr3-noc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#18213F"/><stop offset="1" stop-color="#2E3D68"/></linearGradient>` +
    `<radialGradient id="kr3-mesic-zar"><stop offset="0" stop-color="#F1E6C6" stop-opacity="0.32"/><stop offset="1" stop-color="#F1E6C6" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="kr3-snih" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#D6E2F0"/></linearGradient>` +
    `<linearGradient id="kr3-zem" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6F9FD"/><stop offset="1" stop-color="#C6D4E6"/></linearGradient>` +
    `<linearGradient id="kr3-jinovatka" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F4FAFF" stop-opacity="0.55"/><stop offset="0.35" stop-color="#F4FAFF" stop-opacity="0.05"/><stop offset="0.65" stop-color="#F4FAFF" stop-opacity="0.05"/><stop offset="1" stop-color="#F4FAFF" stop-opacity="0.5"/></linearGradient>` +
    `<radialGradient id="kr3-ohen" cx="0.5" cy="0.8" r="0.8"><stop offset="0" stop-color="#FFF0B0"/><stop offset="0.4" stop-color="#FFA640"/><stop offset="1" stop-color="#C4401A"/></radialGradient>` +
    `<radialGradient id="kr3-teplo"><stop offset="0" stop-color="#FFB45A" stop-opacity="0.42"/><stop offset="0.5" stop-color="#F08A3A" stop-opacity="0.14"/><stop offset="1" stop-color="#F08A3A" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="kr3-lampa"><stop offset="0" stop-color="#FFE0A0" stop-opacity="0.4"/><stop offset="0.45" stop-color="#FFD080" stop-opacity="0.12"/><stop offset="1" stop-color="#FFD080" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="kr3-dym"><stop offset="0" stop-color="#A8A8B8" stop-opacity="0.7"/><stop offset="1" stop-color="#A8A8B8" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="kr3-koule" cx="0.35" cy="0.35" r="0.7"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#C8D6E8"/></radialGradient>`;

  /* ——— Simulace ——— */
  const PRED = 5;
  const novaDynamika = () => {
    const R = rng(1977);
    const d = {
      hodiny: 0, faze: "stavi", fazeOd: 0, tema: 0, kachle: Array(N).fill(null), rimsa: false, krok: null, skoro: 7,
      teplo: 0, mraz: 1, ohen: 0, dvirka: 0, oprava: null,
      kocka: { faze: "sedi", x: KOCKA_LAVICE[0], y: KOCKA_LAVICE[1], skok: null, pohled: [0, 0] },
      kach: { trese: 0, splat: 0, lekl: -10, mrzi: -10 },
      snih: [], snihOkno: [], dym: [], kapky: [], hroudy: [], splaty: [], koule: [], letici: [],
      mesic: 0, mesicV: 0, mesicSplat: 0, vitr: 0, mysPred: null,
      nahoda: R, zvuk: [], pohled: [0, 0], fazePred: -1,
    };
    for (let i = 0; i < PRED; i++) d.kachle[i] = { motiv: motivPro(0, i), uhel: 0 };
    for (let i = 0; i < 80; i++) d.snih.push(novaVlocka(R, true));
    for (let i = 0; i < 12; i++) d.snihOkno.push({ x: OKNO.x + R() * OKNO.s, y: OKNO.y + R() * OKNO.s, r: 0.25 + R() * 0.3, vy: 2 + R() * 2.5, fz: R() * 6.28 });
    return d;
  };
  const novaVlocka = (R, kdekoli) => ({ x: R() * 184 - 2, y: kdekoli ? R() * 160 : -4 - R() * 10, r: 0.3 + R() * 0.55, vy: 6 + R() * 7, fz: R() * 6.28, ctverec: R() < 0.08 });

  /*
    Jeden kachel: levá ruka ho vezme z bedny, přehodí obloukem přes hlavu
    pravé, ta ho zasadí. Když sedne nakřivo, pravá ho doklepe.
  */
  const DOBA_KACHLE = 1.9, DOBA_KLEPANI = 0.75;
  const stavKroku = (kr, u) => {
    const cil = kr.rimsa ? [RIMSA.x + 21, RIMSA.y + 3] : slotXY(kr.i).map((v) => v + 6);
    let L = RUKA_L, P = RUKA_P, nese = null;
    const vBedne = [BEDNA.x + 9, BEDNA.y + 1.5];
    if (u < 0.45) {
      L = lerpP(RUKA_L, vBedne, Math.sin(Math.PI * clamp(u / 0.45)) * 1.0);
      if (u > 0.22) nese = { x: L[0], y: L[1] - 4 };
    } else if (u < 0.9) {
      const q = smooth((u - 0.45) / 0.45);
      const A = [RUKA_L[0], RUKA_L[1] - 6], B = [RUKA_P[0] + 3, RUKA_P[1] - 12];
      const x = lerp(A[0], B[0], q), y = lerp(A[1], B[1], q) - Math.sin(Math.PI * q) * 26;
      nese = { x, y };
      L = lerpP([RUKA_L[0], RUKA_L[1] - 6], RUKA_L, q);
      P = lerpP(RUKA_P, B, krokem(0.5, 0.85, u));
    } else if (u < 1.4) {
      const q = smooth((u - 0.9) / 0.5);
      const B = [RUKA_P[0] + 3, RUKA_P[1] - 12];
      P = lerpP(B, [cil[0] - 3.2, cil[1] + 2], q);
      nese = { x: P[0] + 3.2, y: P[1] - 2 };
    } else {
      const vrat = krokem(DOBA_KACHLE - 0.35 + (kr.klepe ? DOBA_KLEPANI : 0), DOBA_KACHLE + (kr.klepe ? DOBA_KLEPANI : 0), u);
      let ruka = [cil[0] - 3.2, cil[1] + 2];
      if (kr.klepe && u > 1.45 && u < 1.45 + DOBA_KLEPANI) {
        const v = u - 1.45;
        const uder = [0.12, 0.34, 0.56].reduce((m, c) => Math.max(m, v > c - 0.08 && v < c + 0.06 ? Math.sin(Math.PI * clamp((v - c + 0.08) / 0.14)) : 0), 0);
        ruka = [cil[0] - 7 + 2.4 * uder, cil[1] - 6 + 2 * uder];
      }
      P = lerpP(ruka, RUKA_P, vrat);
    }
    if (nese && kr.rimsa) nese.rimsa = true;
    else if (nese) nese.motiv = kr.motiv;
    return { L, P, nese };
  };

  const krok = (dyn, t, dt, vstup) => {
    const R = dyn.nahoda;
    /* — vítr z myši: žene sníh a kouř — */
    let cilV = 0.6 * Math.sin(t * 0.3);
    if (vstup.mys) {
      if (dyn.mysPred) cilV += clamp(((vstup.mys.x - dyn.mysPred.x) / Math.max(dt, 0.008)) * 0.05, -26, 26);
      dyn.mysPred = { ...vstup.mys };
    } else dyn.mysPred = null;
    dyn.vitr += (cilV - dyn.vitr) * (1 - Math.exp(-dt / 0.5));
    /* — sněhové koule — */
    if (vstup.kliky && vstup.kliky.length) {
      for (const c of vstup.kliky.splice(0)) {
        const mesic = Math.hypot(c.x - MESIC[0], c.y - MESIC[1]) < 12;
        const doba = mesic ? 0.75 : 0.38 + (180 - c.y) * 0.0012;
        dyn.koule.push({ od: [90 + (R() - 0.5) * 30, 196], do: [c.x, c.y], vek: 0, doba, oblouk: mesic ? 60 : 18, r1: mesic ? 0.9 : 1.6 + (c.y / 180) * 1.4, mesic });
        dyn.zvuk.push({ druh: "hod", sila: 0.5 });
      }
    }
    for (const k of dyn.koule) {
      k.vek += dt;
      if (k.vek < k.doba || k.hotovo) continue;
      k.hotovo = true;
      dopad(dyn, k, t, R);
    }
    dyn.koule = dyn.koule.filter((k) => !k.hotovo);
    /* — stavba: oprava počká, až Kachlík položí kachel, který drží; pak hodiny stavby stojí — */
    if (dyn.oprava && dyn.oprava.start == null && !dyn.krok) dyn.oprava.start = t;
    const opravuje = dyn.oprava && dyn.oprava.start != null;
    if (!opravuje) dyn.hodiny += dt;
    const h = dyn.hodiny;
    const fu = h - dyn.fazeOd, fuP = dyn.fazePred;
    const pres = (c) => fuP < c && fu >= c;
    if (dyn.faze === "stavi") {
      if (!dyn.krok && !dyn.oprava) {
        const i = dyn.kachle.findIndex((k) => !k);
        if (i < 0) {
          dyn.krok = { rimsa: true, start: h, klepe: false, uhel0: 0 };
        } else {
          const krive = R() < 0.55 || i === dyn.skoro;
          dyn.krok = { i, start: h, motiv: motivPro(dyn.tema, i), klepe: krive, uhel0: krive ? (R() < 0.5 ? -1 : 1) * (1.6 + R() * 2.6) : 0 };
        }
      }
      const kr = dyn.krok;
      if (kr) {
        const u = h - kr.start, uP = u - (opravuje ? 0 : dt);
        if (uP < 0.24 && u >= 0.24) dyn.zvuk.push({ druh: "cink", sila: 0.35, pan: -0.5 });
        if (uP < 0.5 && u >= 0.5) dyn.zvuk.push({ druh: "hod", sila: 0.35 });
        if (uP < 1.4 && u >= 1.4) {
          if (kr.rimsa) dyn.rimsa = true;
          else dyn.kachle[kr.i] = { motiv: kr.motiv, uhel: kr.uhel0 };
          dyn.zvuk.push({ druh: "klap", sila: 0.9, pan: 0.4 });
        }
        if (kr.klepe && !kr.rimsa) {
          for (const [c, k] of [[0.12, 0.3], [0.34, 0.2], [0.56, 0]]) {
            if (uP < 1.45 + c && u >= 1.45 + c) {
              const kach = dyn.kachle[kr.i];
              if (kach) kach.uhel = kr.i === dyn.skoro && c === 0.56 ? 0.5 : kach.uhel * k;
              dyn.zvuk.push({ druh: "tuk", sila: 0.8, pan: 0.4 });
            }
          }
        }
        if (u >= DOBA_KACHLE + (kr.klepe ? DOBA_KLEPANI : 0)) {
          dyn.krok = null;
          if (kr.rimsa) prepni(dyn, "zatapi", h);
        }
      }
    } else if (dyn.faze === "zatapi") {
      dyn.dvirka = smooth(fu / 0.35) * (1 - krokem(1.7, 2.05, fu));
      if (pres(0.85)) dyn.zvuk.push({ druh: "skrt", sila: 0.8, pan: 0.4 });
      if (fu > 1.1) dyn.ohen = Math.min(1, dyn.ohen + dt * 1.2);
      if (pres(2.1)) dyn.zvuk.push({ druh: "dvere", sila: 0.6, pan: 0.4 });
      if (fu > 2.4) prepni(dyn, "teplo", h);
    } else if (dyn.faze === "teplo") {
      if (pres(1.6)) skocKocka(dyn, KOCKA_PEC, t);
      if (fu > 13) prepni(dyn, "vsimne", h);
    } else if (dyn.faze === "vsimne") {
      if (pres(2.1)) {
        const k = dyn.kachle[dyn.skoro];
        if (k) {
          k.prasklina = true;
          k.uhel = 2.6;
        }
        dyn.zvuk.push({ druh: "praskne", sila: 1, pan: 0.4 });
      }
      if (pres(3.3)) dyn.zvuk.push({ druh: "vzdech", sila: 0.7 });
      if (fu > 4.3) {
        prepni(dyn, "rozebira", h);
        dyn.zvuk.push({ druh: "pss", sila: 0.8, pan: 0.4 });
        for (let i = 0; i < 8; i++) dyn.dym.push({ x: KAM.x + 18 + (R() - 0.5) * 6, y: 138, r: 2 + R() * 2, vy: -8 - R() * 6, vek: 0, zivot: 1.4 + R(), vnitrni: true });
      }
    } else if (dyn.faze === "rozebira") {
      if (pres(0.25)) {
        skocKocka(dyn, KOCKA_LAVICE, t);
        dyn.zvuk.push({ druh: "mnau", sila: 0.7, pan: 0.3 });
      }
      /* římsa první, pak kachle od posledního */
      const poradi = [-1, ...Array.from({ length: N }, (_, i) => N - 1 - i)];
      poradi.forEach((idx, n) => {
        const start = 0.6 + n * 0.14;
        if (pres(start)) {
          const od = idx < 0 ? [RIMSA.x + 21, RIMSA.y + 3] : slotXY(idx).map((v) => v + 6);
          const k = idx < 0 ? null : dyn.kachle[idx];
          dyn.letici.push({ od, vek: 0, rimsa: idx < 0, motiv: k ? k.motiv : null, prasklina: k ? k.prasklina : false });
          if (idx < 0) dyn.rimsa = false;
          else dyn.kachle[idx] = null;
        }
      });
      if (fu > 0.6 + poradi.length * 0.14 + 0.7) {
        dyn.tema = (dyn.tema + 1) % TEMATA.length;
        dyn.skoro = 3 + Math.floor(R() * 8);
        prepni(dyn, "stavi", h);
      }
    }
    dyn.fazePred = h - dyn.fazeOd;
    /* teplo, oheň a mráz se řídí fází */
    const hori = dyn.faze === "teplo" || dyn.faze === "vsimne" || (dyn.faze === "zatapi" && fu > 1.1);
    if (!hori && dyn.faze !== "zatapi") dyn.ohen = Math.max(0, dyn.ohen - dt * 1.5);
    dyn.teplo += ((hori ? 1 : 0) - dyn.teplo) * (1 - Math.exp(-dt / (hori ? 2.4 : 1.2)));
    dyn.mraz += ((hori ? 0 : 1) - dyn.mraz) * (1 - Math.exp(-dt / (hori ? 2.2 : 4.5)));
    if (dyn.faze !== "zatapi") dyn.dvirka = Math.max(0, dyn.dvirka - dt * 3);
    if (hori && R() < dt * 2.2) dyn.zvuk.push({ druh: "praskot", sila: 0.2 + R() * 0.3, pan: 0.4 });
    /* — letící kachle do bedny — */
    for (const l of dyn.letici) {
      l.vek += dt;
      const q = smooth(l.vek / 0.5);
      const cil = [BEDNA.x + 9 + (R() - 0.5) * 0.2, BEDNA.y + 2];
      l.x = lerp(l.od[0], cil[0], q);
      l.y = lerp(l.od[1], cil[1], q) - Math.sin(Math.PI * q) * 30;
      if (l.vek >= 0.5 && !l.dopadl) {
        l.dopadl = true;
        dyn.zvuk.push({ druh: "cink", sila: 0.6, pan: -0.5 });
      }
    }
    dyn.letici = dyn.letici.filter((l) => !l.dopadl);
    /* — oprava kachle sraženého koulí — */
    if (opravuje) {
      const o = dyn.oprava;
      const u = t - o.start;
      for (const [c, k] of [[0.95, 0.3], [1.2, 0.25], [1.45, 0]]) {
        if (u - dt < c && u >= c) {
          const kach = dyn.kachle[o.i];
          /* kachel „teda skoro“ zůstane o půl stupně nakřivo i po opravě */
          if (kach) kach.uhel = o.i === dyn.skoro && k === 0 ? 0.5 : kach.uhel * k;
          dyn.zvuk.push({ druh: "tuk", sila: 0.8, pan: 0.4 });
        }
      }
      if (u > 1.9) dyn.oprava = null;
    }
    /* — kočka — */
    const ko = dyn.kocka;
    if (ko.skok) {
      const u = (t - ko.skok.start) / 0.62;
      if (u >= 1) {
        ko.faze = ko.skok.cil === KOCKA_PEC ? "spi" : "sedi";
        [ko.x, ko.y] = ko.skok.cil;
        ko.skok = null;
      } else {
        ko.faze = "skok";
        ko.x = lerp(ko.skok.od[0], ko.skok.cil[0], u);
        ko.y = lerp(ko.skok.od[1], ko.skok.cil[1], u) - Math.sin(Math.PI * u) * 22;
        ko.smer = Math.sign(ko.skok.cil[0] - ko.skok.od[0]) || 1;
      }
    }
    if (ko.faze === "sedi") {
      let cil = [0, 0];
      if (vstup.mys) cil = [clamp((vstup.mys.x - ko.x) / 30, -1, 1) * 2, clamp((vstup.mys.y - (ko.y - 9)) / 30, -1, 1) * 2];
      ko.pohled = ko.pohled.map((q, i) => q + (cil[i] - q) * (1 - Math.exp(-dt / 0.08)));
    }
    /* — Kachlík: třes po zásahu, sníh na něm — */
    const K = dyn.kach;
    const ut = t - K.lekl;
    K.trese = ut > 0 && ut < 0.6 ? Math.sin(ut * 60) * 1.1 * (1 - ut / 0.6) : 0;
    K.splat = Math.max(0, K.splat - dt * 0.35);
    /* — měsíc se po zásahu zhoupne — */
    [dyn.mesic, dyn.mesicV] = pruzina(dyn.mesic, dyn.mesicV, 0, dt, 40, 2.2);
    dyn.mesicSplat = Math.max(0, dyn.mesicSplat - dt * 0.12);
    /* — sníh, kouř, kapky, hroudy, šplíchance — */
    for (const v of dyn.snih) {
      v.y += v.vy * dt;
      v.x += (dyn.vitr * (0.6 + v.r * 0.5) + Math.sin(t * 1.3 + v.fz) * 2.4) * dt;
      if (v.y > 166 || v.x < -6 || v.x > 186) Object.assign(v, novaVlocka(R, false), v.x < -6 ? { x: 184 } : v.x > 186 ? { x: -4 } : {});
    }
    for (const v of dyn.snihOkno) {
      v.y += v.vy * dt;
      v.x += (dyn.vitr * 0.12 + Math.sin(t + v.fz) * 0.6) * dt;
      if (v.y > OKNO.y + OKNO.s + 1) {
        v.y = OKNO.y - 1;
        v.x = OKNO.x + R() * OKNO.s;
      }
      if (v.x < OKNO.x - 1) v.x += OKNO.s + 1;
      if (v.x > OKNO.x + OKNO.s + 1) v.x -= OKNO.s + 1;
    }
    if (dyn.teplo > 0.2 && R() < dt * 6 * dyn.teplo) dyn.dym.push({ x: KOMIN[0] + (R() - 0.5) * 3, y: KOMIN[1] - 2, r: 2.2 + R(), vy: -9 - R() * 5, vek: 0, zivot: 2.6 + R() * 1.4 });
    for (const d of dyn.dym) {
      d.vek += dt;
      d.y += d.vy * dt;
      d.x += (dyn.vitr * 0.9 + 2.6) * dt;
      d.r += dt * 3.4;
    }
    dyn.dym = dyn.dym.filter((d) => d.vek < d.zivot);
    if (dyn.teplo > 0.5 && R() < dt * 1.2) {
      const [x, y, l] = RAMPOUCHY[Math.floor(R() * RAMPOUCHY.length)];
      dyn.kapky.push({ x, y: y + l, vy: 0 });
    }
    for (const k of dyn.kapky) {
      k.vy += 160 * dt;
      k.y += k.vy * dt;
    }
    dyn.kapky = dyn.kapky.filter((k) => k.y < 150);
    for (const hr of dyn.hroudy) {
      if (hr.faze === "klouze") {
        hr.x += hr.smer * 30 * dt;
        hr.y = strechaY(hr.x) - 4;
        if ((hr.smer < 0 && hr.x < STRECHA.l[0]) || (hr.smer > 0 && hr.x > STRECHA.p[0])) {
          hr.faze = "pada";
          hr.vx = hr.smer * 12;
          hr.vy = 0;
        }
      } else {
        hr.vy += 140 * dt;
        hr.x += hr.vx * dt;
        hr.y += hr.vy * dt;
        if (hr.y > 148 && !hr.dopadla) {
          hr.dopadla = true;
          dyn.zvuk.push({ druh: "flump", sila: 0.6, pan: (hr.x - 90) / 90 });
          dyn.splaty.push({ x: hr.x, y: 149, s: 3, op: 1 });
        }
      }
    }
    dyn.hroudy = dyn.hroudy.filter((hr) => !hr.dopadla);
    for (const p of dyn.splaty) p.op -= dt * (p.rychle ? 0.5 : 0.16);
    dyn.splaty = dyn.splaty.filter((p) => p.op > 0);
    /* — pohled Kachlíka — */
    let kam = null;
    const kr = dyn.krok;
    if (dyn.oprava && dyn.oprava.start != null) kam = t - dyn.oprava.start < 0.6 ? [90, 190] : slotXY(dyn.oprava.i).map((v) => v + 6);
    else if (K.lekl > t - 0.8) kam = [90, 190];
    else if (dyn.faze === "stavi" && kr) {
      const s = stavKroku(kr, h - kr.start);
      kam = s.nese ? [s.nese.x, s.nese.y] : h - kr.start < 0.5 ? [BEDNA.x + 9, BEDNA.y] : kr.rimsa ? [RIMSA.x + 21, RIMSA.y] : slotXY(kr.i).map((v) => v + 6);
    } else if (dyn.faze === "zatapi") kam = [KAM.x + 18, 140];
    else if (dyn.faze === "vsimne" || dyn.faze === "rozebira") kam = slotXY(dyn.skoro).map((v) => v + 6);
    else if (vstup.mys && dyn.faze !== "teplo") kam = [vstup.mys.x, vstup.mys.y];
    let cil = [0, 0];
    if (kam) cil = [clamp((kam[0] - KX) / 30, -1, 1) * 2.1, clamp((kam[1] - 128) / 30, -1, 1) * 1.7];
    dyn.pohled = dyn.pohled.map((q, i) => q + (cil[i] - q) * (1 - Math.exp(-dt / 0.12)));
  };
  const prepni = (dyn, faze, h) => {
    dyn.faze = faze;
    dyn.fazeOd = h;
    dyn.fazePred = -1;
  };
  const skocKocka = (dyn, cil, t) => {
    const ko = dyn.kocka;
    ko.skok = { od: [ko.x, ko.y], cil, start: t };
    ko.faze = "skok";
  };
  const strechaY = (x) => (x < 90 ? lerp(STRECHA.l[1], STRECHA.v[1], (x - STRECHA.l[0]) / (90 - STRECHA.l[0])) : lerp(STRECHA.v[1], STRECHA.p[1], (x - 90) / (STRECHA.p[0] - 90)));
  /** Kam koule dopadla a co způsobila. */
  const dopad = (dyn, k, t, R) => {
    const [x, y] = k.do;
    const pan = (x - 90) / 90;
    if (k.mesic) {
      dyn.mesicV += 140;
      dyn.mesicSplat = 1;
      dyn.zvuk.push({ druh: "tink", sila: 0.8, pan: -0.7 });
      return;
    }
    dyn.zvuk.push({ druh: "koule", sila: 0.9, pan });
    const vDome = x > DOMU.x0 && x < DOMU.x1 && y > DOMU.y0 && y < DOMU.y1;
    const naKachliku = Math.abs(x - KX) < 13 && y > 116 && y < 146;
    if (naKachliku) {
      dyn.kach.lekl = t;
      dyn.kach.splat = 1;
      return;
    }
    if (vDome) {
      dyn.splaty.push({ x, y, s: 2.6, op: 1, rychle: true });
      const i = dyn.kachle.findIndex((q, idx) => q && x >= slotXY(idx)[0] - 1 && x <= slotXY(idx)[0] + 13 && y >= slotXY(idx)[1] - 1 && y <= slotXY(idx)[1] + 13);
      if (i >= 0 && !dyn.oprava && dyn.faze !== "rozebira" && dyn.faze !== "vsimne") {
        dyn.kachle[i].uhel = (R() < 0.5 ? -1 : 1) * (5 + R() * 2);
        dyn.oprava = { i, start: null };
        dyn.kach.lekl = t;
        dyn.zvuk.push({ druh: "klap", sila: 0.6, pan });
      } else if (Math.hypot(x - dyn.kocka.x, y - dyn.kocka.y + 6) < 9) dyn.kocka.usi = t;
      return;
    }
    const naStrese = y < strechaY(x) + 2 && y > strechaY(x) - 10 && x > STRECHA.l[0] - 4 && x < STRECHA.p[0] + 4;
    if (naStrese) {
      dyn.splaty.push({ x, y, s: 2.4, op: 1, rychle: true });
      dyn.hroudy.push({ x, y: strechaY(x) - 4, smer: x < 90 ? -1 : 1, faze: "klouze", k: 1.2, seed: Math.floor(R() * 1000) });
      dyn.zvuk.push({ druh: "flump", sila: 0.35, pan });
      return;
    }
    dyn.splaty.push({ x, y, s: 2.4, op: 1 });
  };

  const stav = (t, vstup = {}, dyn) => {
    const d = dyn || novaDynamika();
    const h = d.hodiny, fu = h - d.fazeOd;
    let L = RUKA_L, P = RUKA_P, nese = null, sirkaZ = 0;
    let oci = "kulate", oboci = "rovne", usta = "rovna", tvare = 0.3, cuk = 0;
    if (d.faze === "stavi" && d.krok) {
      const s = stavKroku(d.krok, h - d.krok.start);
      [L, P, nese] = [s.L, s.P, s.nese];
      [oci, usta] = ["prisne", "kousek"];
      if (h - d.krok.start > 1.4 && !d.krok.klepe) [oci, usta] = ["kulate", "rovna"];
    } else if (d.faze === "zatapi") {
      const k = smooth(fu / 0.35) * (1 - krokem(1.9, 2.3, fu));
      P = lerpP(RUKA_P, [KAM.x + 10, 139], k);
      sirkaZ = fu > 0.6 && fu < 1.6 ? (fu > 0.85 ? 2 : 1) : 0;
    } else if (d.faze === "teplo") {
      [oci, oboci, usta, tvare] = ["spokojene", "rovne", "usmev", 0.55 + 0.1 * Math.sin(t * 2)];
      const k = krokem(0.6, 1.6, fu);
      L = lerpP(RUKA_L, [KX - 6, 128], k);
      P = lerpP(RUKA_P, [KX + 19, 128 + Math.sin(t * 1.4) * 0.6], k);
    } else if (d.faze === "vsimne") {
      if (fu < 0.5) [oci, oboci, usta, tvare] = ["kulate", "rovne", "usmev", 0.5];
      else if (fu < 1.6) {
        [oci, oboci, usta] = ["kulate", "mracene", "kousek"];
        cuk = Math.abs(Math.sin(t * 38)) * (Math.sin(t * 3) > 0 ? 1 : 0);
      } else if (fu < 2.1) [oci, oboci, usta] = ["prisne", "mracene", "kousek"];
      else if (fu < 3.2) [oci, oboci, usta] = ["siroke", "zdvizene", "ctverec"];
      else [oci, oboci, usta] = ["zavrene", "ustarane", "vlnka"];
      const cil = slotXY(d.skoro).map((v) => v + 6);
      const k = krokem(1.6, 2.0, fu) * (1 - krokem(2.5, 2.9, fu));
      const uder = fu > 2.0 && fu < 2.2 ? Math.sin(Math.PI * (fu - 2.0) / 0.2) : 0;
      P = lerpP(RUKA_P, [cil[0] - 7 + 2.4 * uder, cil[1] - 6 + 2 * uder], k);
    } else if (d.faze === "rozebira") [oci, oboci, usta] = ["zavrene", "ustarane", "rovna"];
    if (d.oprava && d.oprava.start != null) {
      const u = t - d.oprava.start;
      const cil = slotXY(d.oprava.i).map((v) => v + 6);
      const k = krokem(0.55, 0.85, u) * (1 - krokem(1.55, 1.9, u));
      const uder = [0.95, 1.2, 1.45].reduce((m, c) => Math.max(m, u > c - 0.08 && u < c + 0.06 ? Math.sin(Math.PI * clamp((u - c + 0.08) / 0.14)) : 0), 0);
      P = lerpP(P, [cil[0] - 7 + 2.4 * uder, cil[1] - 6 + 2 * uder], k);
      [oci, oboci, usta] = u < 0.6 ? ["siroke", "zdvizene", "o"] : ["prisne", "mracene", "kousek"];
    }
    const ul = t - d.kach.lekl;
    if (ul > 0 && ul < 0.9 && !(d.oprava && d.oprava.start != null)) [oci, oboci, usta] = ["siroke", "zdvizene", "ctverec"];
    const ko = d.kocka;
    return {
      t, tema: d.tema, kachle: d.kachle, rimsa: d.rimsa, teplo: d.teplo, mraz: d.mraz, ohen: d.ohen, dvirka: d.dvirka,
      ohenDvere: d.ohen * d.dvirka,
      kach: { L, P, nese, sirka: sirkaZ, trese: d.kach.trese, splat: d.kach.splat },
      kocka: { faze: ko.faze, x: ko.x, y: ko.y, smer: ko.smer || 1, pohled: ko.pohled, mrk: mrkani(t, [3.1, 3.4, 9.2], 11), usi: t - (ko.usi || -10) < 1.2 ? 1 : 0 },
      snih: d.snih, snihOkno: d.snihOkno, dym: d.dym, kapky: d.kapky, hroudy: d.hroudy, splaty: d.splaty, koule: d.koule, letici: d.letici,
      mesic: d.mesic, mesicSplat: d.mesicSplat,
      pohled: d.pohled, mrk: d.faze === "teplo" ? 0 : mrkani(t, [1.5, 4.7, 4.95, 7.9], 9), cuk, oci, oboci, usta, tvare,
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
    smycky: (st) => ({ ohen: st.ohen * 0.8, predeni: st.kocka.faze === "spi" ? 0.7 : 0 }),
    klidne: { t: 1.2 },
    vrstvy: [
      { id: "noc", kresli: vrstvaNoc, tezka: true },
      { id: "mesic", kresli: vrstvaMesic, klic: (st) => `${f(st.mesic)},${f(st.mesicSplat)}` },
      { id: "dum", kresli: vrstvaDum, tezka: true },
      { id: "okno", kresli: vrstvaOkno, klic: (st) => `${Math.floor(st.t * 15)},${f(st.mraz)}` },
      { id: "kamna", kresli: vrstvaKamna, klic: (st) => `${st.tema},${st.rimsa},${f(st.teplo)},${st.kachle.map((k) => (k ? `${f(k.uhel)}${k.prasklina ? "p" : ""}` : "-")).join()}` },
      { id: "dvirka", kresli: vrstvaDvirka, klic: (st) => (st.ohen > 0.01 ? snimek(st) : f(st.dvirka)) },
      { id: "kocka", kresli: vrstvaKocka, klic: (st) => `${st.kocka.faze},${f(st.kocka.x)},${f(st.kocka.y)},${f(st.kocka.pohled[0])},${f(st.kocka.pohled[1])},${f(st.kocka.mrk)},${st.kocka.usi},${st.kocka.faze === "spi" ? Math.floor(st.t * 10) : ""}` },
      { id: "kachlik", kresli: vrstvaKachlik, klic: (st) => `${f(st.kach.L[0])},${f(st.kach.L[1])},${f(st.kach.P[0])},${f(st.kach.P[1])},${st.kach.nese ? `${f(st.kach.nese.x)},${f(st.kach.nese.y)}` : ""},${st.kach.sirka},${f(st.kach.trese)},${f(st.kach.splat)},${f(st.pohled[0])},${f(st.pohled[1])},${f(st.mrk)},${f(st.cuk)},${st.oci},${st.oboci},${st.usta},${f(st.tvare)},${st.tema}` },
      { id: "chlad", kresli: vrstvaChlad, klic: (st) => f(st.teplo), styl: "mix-blend-mode:multiply" },
      { id: "svetlo", kresli: vrstvaSvetlo, klic: (st) => (st.teplo > 0.01 || st.ohenDvere > 0.01 ? Math.floor(st.t * 15) : -1), styl: "mix-blend-mode:screen" },
      { id: "venku", kresli: vrstvaVenku, klic: snimek },
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
export { celeSvg, pretoc };
