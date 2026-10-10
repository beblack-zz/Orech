/*
 * Pecinka s ohněm ve čtyřech přehnaných podobách — generátory kresby.
 * Komponenta: components/characters/kami-buh/PecinkaOhen.astro, běh: ./beh.js.
 *
 *   v1       Plamenná svatozář — kaen kóhai jako za Fudóem, zlato a lak, Pecinka na skále iwakura
 *   v2       Raku — v noční tuši vytáhne kleštěmi rozžhavenou misku a zakalí ji v kádi
 *   v3       Prskavka na vějíři — senkó hanabi na malovaném uchiwa, letní noc
 *   lampion  Jde s čóčinem — bez pozadí, z boku, chůze na geta, můry, čóčin-obake (id pcl-)
 *
 * Čisté generátory SVG: dostanou čas, stav simulace a vstup (myš, kliknutí)
 * a vrátí značky. Žádné DOM, takže běží i v Node a jde z nich udělat náhled
 * jako PNG (celeSvg + sharp). Pohyb, zvuk a myš řeší beh.js.
 *
 * Stejně jako u Kapky (scripts/kapka-bubny): každá kresba má vrstvy, vrstva
 * bez `klic` se nakreslí jednou, s `klic` se překreslí, jen když se klíč
 * změní. Plameny a jiskry se překreslují nejvýš třicetkrát za sekundu.
 * Id ve filtrech a přechodech jsou pevná, každá podoba smí být na stránce
 * jen jednou.
 *
 * Simulace (jiskry, pára, kyvadlo prskavky) žije v `dyn`: beh.js ji založí
 * přes novaDynamika() a každý snímek posune přes krok(). Zvuky, které má
 * běh zahrát, krok přidá do dyn.zvuk.
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
/** Barva na stupnici [[poloha, barva], …] */
const stupnice = (S, x) => {
  const k = clamp(x, S[0][0], S[S.length - 1][0]);
  let i = 0;
  while (i < S.length - 2 && S[i + 1][0] <= k) i++;
  return mix(S[i][1], S[i + 1][1], (k - S[i][0]) / (S[i + 1][0] - S[i][0]));
};
const pt = (p) => `${f(p[0])} ${f(p[1])}`;
const cara = (body) => "M" + body.map(pt).join(" L");

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

/**
 * Jeden jazyk plamene. Vyrazí ze základny B ve směru th0 (radiány, y dolů),
 * cestou se stáčí vzhůru, protože teplo stoupá, a na konci se zahne do
 * háčku jako plameny na japonských malbách. Vítr ho ohýbá tím víc, čím
 * dál od základny. Vrací obrys i střední čáru (na zlaté linky).
 */
const jazyk = ({ B, th0, L, W, c = 1, stoupani = 0.8, stoc = 2.1, vitr = 0, vlna = 0.24, t = 0, w = 3, fz = 0, N = 22, zuzeni = 0.55 }) => {
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

/** Čtyřcípá jiskra kolem počátku. */
const jiskraD = (r) => `M0 ${f(-r)} Q${f(r * 0.22)} ${f(-r * 0.22)} ${f(r)} 0 Q${f(r * 0.22)} ${f(r * 0.22)} 0 ${f(r)} Q${f(-r * 0.22)} ${f(r * 0.22)} ${f(-r)} 0 Q${f(-r * 0.22)} ${f(-r * 0.22)} 0 ${f(-r)} Z`;

/** Žár podle teploty 0…1: tmavě rudá, třešňová, oranžová, žlutá, skoro bílá. */
const ZAR = [[0, "#4A120A"], [0.2, "#8E1E10"], [0.4, "#D2401A"], [0.6, "#FF7F24"], [0.8, "#FFBE55"], [1, "#FFF0C2"]];
const zar = (T) => stupnice(ZAR, T);

/* ═══════════════════════════════════════════════════════════════════
 * Pecinka: původní kresba (characters/kami/Pecinka.astro) zvednutá na geta.
 * Všechno v jejích souřadnicích 0–180, nohy stojí na deskách geta (y 146),
 * spodek zubů je na y 159.
 * ═══════════════════════════════════════════════════════════════════ */
const PEC = {
  telo: { x: 45, y: 53, w: 90, h: 85, rx: 20 },
  komin: { x: 108, y: 35, w: 14, h: 24, rx: 5 },
  dvirka: { x: 62, y: 93, w: 56, h: 35, rx: 8 },
  oci: [[76, 79], [104, 79]],
  nohy: [70, 110],
  getaX: [61, 101],
  provaz: "M44 63 Q90 73 136 63",
  shide: [[55, 66], [125, 66]],
  rameno: { L: [47, 100], P: [133, 100] },
};
const obdelnik = (o, attrs = "") => `<rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" rx="${o.rx}" ${attrs}/>`;
const teloD = (() => {
  const { x, y, w, h, rx } = PEC.telo;
  return `M${x + rx} ${y} H${x + w - rx} A${rx} ${rx} 0 0 1 ${x + w} ${y + rx} V${y + h - rx} A${rx} ${rx} 0 0 1 ${x + w - rx} ${y + h} H${x + rx} A${rx} ${rx} 0 0 1 ${x} ${y + h - rx} V${y + rx} A${rx} ${rx} 0 0 1 ${x + rx} ${y} Z`;
})();

/** Přechody těla: světlo zleva shora jako na kami podobě. */
const pecDefs = (id, { svetla = "#CF6A47", stred = "#B84A2B", tmava = "#97391F" } = {}) =>
  `<radialGradient id="${id}-telo" cx="0.34" cy="0.25" r="0.85"><stop offset="0" stop-color="${svetla}"/><stop offset="0.55" stop-color="${stred}"/><stop offset="1" stop-color="${tmava}"/></radialGradient>` +
  `<radialGradient id="${id}-tvare" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#F3C04E" stop-opacity="0.75"/><stop offset="1" stop-color="#F3C04E" stop-opacity="0"/></radialGradient>`;

/** Geta pod nohama: deska, dva zuby (z Kapky, jen na šířku Pecinky). */
const pecGeta = ({ deska = "#C99A68", zub = "#8C6444", obrys = "#6B5D4F", linka = "#E2BE8C" } = {}) =>
  `<g stroke="${obrys}" stroke-linejoin="round">` +
  PEC.getaX
    .map(
      (gx) =>
        `<path d="M${gx + 2.4} 152.2 H${gx + 6} V159.2 H${gx + 2.4} Z M${gx + 12} 152.2 H${gx + 15.6} V159.2 H${gx + 12} Z" fill="${zub}" stroke-width="0.9"/>` +
        `<rect x="${gx}" y="146" width="18" height="6.4" rx="1.4" fill="${deska}" stroke-width="1.1"/>` +
        `<path d="M${gx + 1.4} 147.8 H${gx + 16.6}" stroke="${linka}" stroke-width="0.9" stroke-linecap="round"/>`,
    )
    .join("") +
  `</g>`;

/** Nohy a pásky hanao. */
const pecNohy = ({ noha = "#97391F", hanao = "#C4432B" } = {}) =>
  PEC.nohy.map((x) => `<ellipse cx="${x}" cy="141.4" rx="9.4" ry="4.8" fill="${noha}"/>`).join("") +
  `<path d="${PEC.nohy.map((x) => `M${x - 7} 146 Q${x} 136.6 ${x + 7} 146`).join(" ")}" stroke="${hanao}" stroke-width="2.1" stroke-linecap="round" fill="none"/>`;

/** Komín a tělo s obrysem. `dvirka` je obsah dvířek, kreslí se zvlášť. */
const pecTelo = (id, { obrys = "#7E2F18", komin = "#A8432A" } = {}) =>
  obdelnik(PEC.komin, `fill="${komin}" stroke="${obrys}" stroke-width="1.3"`) +
  `<path d="M108.6 39.6 H121.4" stroke="${obrys}" stroke-width="0.8" opacity="0.6"/>` +
  `<path d="${teloD}" fill="url(#${id}-telo)" stroke="${obrys}" stroke-width="1.6"/>`;

/** Slaměná shimenawa přes rameno pece. */
const pecProvaz = () =>
  `<path d="${PEC.provaz}" stroke="#C9B186" stroke-width="6.5" stroke-linecap="round" fill="none"/>` +
  `<path d="${PEC.provaz}" stroke="#EBDDB8" stroke-width="5" stroke-linecap="round" fill="none"/>` +
  `<path d="${PEC.provaz}" stroke="#C9B186" stroke-width="5" stroke-dasharray="1.6 4.4" fill="none"/>`;

/** Papírky shide, houpou se o úhel (stupně). */
const SHIDE_D = "M-4 0 h5 v6 h3 v6 h-3 v6 h3 v6 h-5 v-6 h-3 v-6 h3 v-6 h-3 Z";
const pecShide = (uhly = [0, 0], { papir = "#FBF7EE", obrys = "#8A7A69" } = {}) =>
  PEC.shide
    .map(([x, y], i) => `<path d="${SHIDE_D}" transform="translate(${x} ${y}) rotate(${f(uhly[i])})" fill="${papir}" stroke="${obrys}" stroke-width="0.7" stroke-linejoin="round"/>`)
    .join("");

/**
 * Tvářička. dx/dy posouvá pohled, mrk 0…1 zavírá oči.
 * oci: kulate | siroke | smich | zavrene | spi
 * usta: usmev | o | fuk | ach | smutek | rovna
 */
const pecTvar = (id, { dx = 0, dy = 0, mrk = 0, oci = "kulate", usta = "usmev", tvare = 0.35, oko = "#3A2E28", pusa = "#F4EBDD", odlesk = null } = {}) => {
  let s = "";
  const fukT = usta === "fuk" ? 1.5 : 1;
  s += PEC.oci.map(([x, y]) => `<ellipse cx="${x - 10 * (x < 90 ? 1 : -1)}" cy="${y + 6}" rx="${f(6.5 * fukT)}" ry="${f(4.5 * fukT)}" fill="url(#${id}-tvare)" opacity="${f(clamp(tvare * 1.6))}"/>`).join("");
  const ox = clamp(dx, -2, 2), oy = clamp(dy, -1.6, 1.6);
  if (oci === "smich") {
    s += `<path d="M71.6 80.4 Q76 74.6 80.4 80.4 M99.6 80.4 Q104 74.6 108.4 80.4" stroke="${oko}" stroke-width="2.2" stroke-linecap="round" fill="none"/>`;
  } else if (oci === "zavrene") {
    s += `<path d="M72 75.6 L79.6 79.2 L72 82.8 M108 75.6 L100.4 79.2 L108 82.8" stroke="${oko}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
  } else if (oci === "spi") {
    s += `<path d="M72 78.6 Q76 82 80 78.6 M100 78.6 Q104 82 108 78.6" stroke="${oko}" stroke-width="1.9" stroke-linecap="round" fill="none"/>`;
  } else {
    const velke = oci === "siroke";
    const rx = velke ? 4 : 3.3, ry = (velke ? 5 : 4.2) * Math.max(0.08, 1 - mrk * 0.94);
    for (const [x, y] of PEC.oci) {
      s += `<ellipse cx="${f(x + ox)}" cy="${f(y + oy)}" rx="${rx}" ry="${f(ry)}" fill="${oko}"/>`;
      if (mrk < 0.5) s += `<circle cx="${f(x + ox - (velke ? 1.2 : 1))}" cy="${f(y + oy - (velke ? 2 : 1.7))}" r="${velke ? 1.6 : 1.3}" fill="#FFF3D6"/>`;
      if (velke && mrk < 0.5) s += `<circle cx="${f(x + ox + 1.3)}" cy="${f(y + oy + 1.6)}" r="0.7" fill="#FFF3D6" opacity="0.8"/>`;
      /* v očích se odráží, na co kouká */
      if (odlesk && mrk < 0.5) s += `<circle cx="${f(x + ox * 1.35 + 0.6)}" cy="${f(y + oy * 1.35 + 0.9)}" r="${velke ? 1 : 0.85}" fill="${odlesk.barva}" opacity="${f(odlesk.sila)}"/>`;
    }
  }
  if (usta === "o") s += `<ellipse cx="90" cy="91" rx="2.7" ry="3.3" fill="#3A1A12"/><ellipse cx="90" cy="92.4" rx="1.5" ry="1.2" fill="#C4432B"/>`;
  else if (usta === "fuk") s += `<ellipse cx="90" cy="90.6" rx="1.9" ry="2.3" fill="#3A1A12"/>`;
  else if (usta === "ach") s += `<path d="M83.6 88.4 Q90 97 96.4 88.4 Z" fill="#3A1A12" stroke="#3A1A12" stroke-width="1" stroke-linejoin="round"/><path d="M86.4 92.2 Q90 94.8 93.6 92.2" stroke="#C4432B" stroke-width="1.6" stroke-linecap="round" fill="none"/>`;
  else if (usta === "smutek") s += `<path d="M85 92 Q90 88.4 95 92" stroke="${pusa}" stroke-width="2" stroke-linecap="round" fill="none"/>`;
  else if (usta === "rovna") s += `<path d="M86 90.4 H94" stroke="${pusa}" stroke-width="2" stroke-linecap="round"/>`;
  else s += `<path d="M84 89 Q90 94 96 89" stroke="${pusa}" stroke-width="2" stroke-linecap="round" fill="none"/>`;
  return s;
};

/**
 * Ručka jako gumová hadice: z ramene k dlani oblouk, který se prohne,
 * když je ruka blízko. Kreslí se v souřadnicích, kam ji kdo posadí.
 */
const rucka = (S, H, { tloustka = 5.2, barva = "#B84A2B", obrys = "#7E2F18", ohyb = 1 } = {}) => {
  const dx = H[0] - S[0], dy = H[1] - S[1];
  const d = Math.hypot(dx, dy) || 1;
  const prohnuti = Math.max(0, 26 - d) * 0.45 * ohyb;
  const M = [(S[0] + H[0]) / 2 - (dy / d) * prohnuti, (S[1] + H[1]) / 2 + (dx / d) * prohnuti];
  const c = `M${pt(S)} Q${pt(M)} ${pt(H)}`;
  return (
    `<path d="${c}" stroke="${obrys}" stroke-width="${f(tloustka + 1.6)}" stroke-linecap="round" fill="none"/>` +
    `<path d="${c}" stroke="${barva}" stroke-width="${tloustka}" stroke-linecap="round" fill="none"/>` +
    `<circle cx="${f(H[0])}" cy="${f(H[1])}" r="${f(tloustka * 0.72)}" fill="${barva}" stroke="${obrys}" stroke-width="0.8"/>`
  );
};

/* ═══════════════════════════════════════════════════════════════════
 * 1 — PLAMENNÁ SVATOZÁŘ
 * Za Fudóem a za Kódžinem, kami kuchyňského ohně, hoří kaen kóhai:
 * svatozář z plamenů, které se na konci stáčejí do háčků. Pecinka ji
 * dostala taky — zlatý kruh za zády a kolem něj lakovaný oheň se zlatými
 * linkami kirikane. Stojí na geta na skále iwakura, kam podle šintó
 * sestupují kami. Na komíně jí hoří plamínek jako na perle hódžu.
 *
 * Myš je vítr: plameny se od ní odklánějí, a když se jí rychle mávne,
 * oheň se rozdmýchá. Kliknutí: Pecinka si fouhne a svatozář vzplane.
 * ═══════════════════════════════════════════════════════════════════ */
const V1 = (() => {
  const FIG = { x: 90, y: 157, s: 0.76 };
  const FIGT = `translate(${FIG.x} ${FIG.y}) scale(${FIG.s}) translate(-90 -159)`;
  const vPostave = (s) => `<g transform="${FIGT}">${s}</g>`;
  const naPanel = ([x, y]) => [FIG.x + (x - 90) * FIG.s, FIG.y + (y - 159) * FIG.s];
  const C = [90, 99], R0 = 47;
  const KOMIN = naPanel([115, 35]);

  /* Jazyky ve čtyřech vrstvách: tmavý lak vně, rumělka, oranžová, zlaté jádro */
  const R = rng(1320);
  const VRSTVY = [
    { id: "vne", od: 158, krok: 14.7, delka: [13, 36], W: 15.5 },
    { id: "rum", od: 165, krok: 14.7, delka: [9.5, 25], W: 11.5 },
    { id: "ora", od: 158, krok: 14.7, delka: [6.5, 16], W: 8 },
    { id: "jad", od: 165, krok: 14.7, delka: [3.6, 9], W: 5 },
  ].map((v) => {
    const jazyky = [];
    for (let a = v.od; a <= 382 - (v.od - 158); a += v.krok) {
      const nahore = clamp(-Math.sin(rad(a)));
      const levy = a < 270;
      jazyky.push({
        a,
        L0: v.delka[0] + v.delka[1] * Math.pow(nahore, 2.2),
        c: (levy ? 1 : -1) * (R() < 0.22 ? -0.55 : 1),
        w: 2.2 + R() * 1.6,
        fz: R() * 6.28,
        w1: 1.3 + R() * 1.2,
        f1: R() * 6.28,
      });
    }
    return { ...v, jazyky };
  });
  const BARVY = { vne: "#9A2716", rum: "url(#v1-rum)", ora: "url(#v1-ora)", jad: "#F8D77E" };

  const plamenyVrstva = (v, st) => {
    let s = "", zlate = "";
    for (const j of v.jazyky) {
      const a = rad(j.a);
      const B = [C[0] + Math.cos(a) * (R0 - 3), C[1] + Math.sin(a) * (R0 - 3)];
      const k = 0.42;
      const th0 = Math.atan2(Math.sin(a) * (1 - k) - k, Math.cos(a) * (1 - k));
      const nahore = clamp(-Math.sin(a));
      const L = j.L0 * (0.74 + 0.36 * st.I) * (1 + 0.1 * Math.sin(st.t * j.w1 + j.f1));
      const { d, body } = jazyk({
        B, th0, L, W: v.W * (0.85 + 0.2 * st.I), c: j.c, t: st.t, w: j.w, fz: j.fz,
        vitr: st.vitr * (0.55 + 0.45 * nahore), stoupani: 0.82, stoc: 2.15, N: 16,
      });
      s += `<path d="${d}"/>`;
      if (v.id === "vne") zlate += `<path d="${cara(body.slice(3, -2))}"/>`;
    }
    const fill = BARVY[v.id];
    return (
      `<g fill="${fill}"${v.id === "vne" ? ` stroke="#5E160B" stroke-width="0.6" stroke-linejoin="round"` : ""}>${s}</g>` +
      (zlate ? `<g fill="none" stroke="#E9C46E" stroke-width="0.5" stroke-linecap="round" opacity="0.9">${zlate}</g>` : "")
    );
  };
  const vrstvaPlameny = (st) =>
    `<circle cx="${C[0]}" cy="${C[1]}" r="${R0 + 4}" fill="#9A2716"/>` + VRSTVY.map((v) => plamenyVrstva(v, st)).join("");

  /* Zlatý kruh za zády: kotouč, rumělkové a zlaté prstence, jemný vzorek kirikane */
  const vrstvaSvatozar = () =>
    `<circle cx="${C[0]}" cy="${C[1]}" r="${R0}" fill="url(#v1-kotouc)" stroke="#6E1C0E" stroke-width="0.9"/>` +
    `<circle cx="${C[0]}" cy="${C[1]}" r="${R0}" fill="url(#v1-kirikane)" opacity="0.5"/>` +
    `<circle cx="${C[0]}" cy="${C[1]}" r="${R0 - 3.2}" fill="none" stroke="#C4432B" stroke-width="1.4"/>` +
    `<circle cx="${C[0]}" cy="${C[1]}" r="${R0 - 5.6}" fill="none" stroke="#B88A2E" stroke-width="0.5" stroke-dasharray="6 1.4 1.4 1.4"/>` +
    `<circle cx="${C[0]}" cy="${C[1]}" r="${R0 - 13}" fill="none" stroke="#C4432B" stroke-width="0.6" opacity="0.7"/>` +
    /* paprsky ze středu, jak je mívá kotouč za hlavou */
    `<g stroke="#FFF1C4" stroke-width="0.5" opacity="0.55">${Array.from({ length: 36 }, (_, i) => {
      const u = rad(i * 10 + 5);
      return `<path d="M${pt([C[0] + Math.cos(u) * (R0 - 12), C[1] + Math.sin(u) * (R0 - 12)])} L${pt([C[0] + Math.cos(u) * (R0 - 6.6), C[1] + Math.sin(u) * (R0 - 6.6)])}"/>`;
    }).join("")}</g>`;

  /* Skála iwakura: kameny v barvách noci z loga, zlatý obrys a tahy šunpó */
  /*
    Kameny jsou hranaté: světlá horní plocha, tmavé boky a tahy sekerou
    (šunpó), jak se skály kreslí na paravánech. Prostřední nese Pecinku.
  */
  const skaly = [
    {
      bok: [[42, 161], [50, 153.6], [72, 151.4], [104, 150.8], [126, 152.6], [138, 159], [141, 169], [130, 178.6], [62, 179.4], [40, 171]],
      vrch: [[50, 153.6], [72, 151.4], [104, 150.8], [126, 152.6], [133, 156.4], [116, 160.2], [78, 160.8], [54, 158.8]],
      tahy: [[[48, 166], [60, 164.6]], [[52, 172], [66, 170.4]], [[120, 166.4], [134, 165]], [[112, 173], [126, 171.6]], [[84, 168], [100, 167]], [[70, 175], [88, 174]]],
    },
    {
      bok: [[16, 173], [24, 163.4], [38, 161.6], [50, 166], [52, 176], [44, 181], [18, 181]],
      vrch: [[24, 163.4], [38, 161.6], [48, 165.4], [36, 167.6], [25, 167]],
      tahy: [[[22, 174], [34, 172.6]], [[30, 178], [44, 177]]],
    },
    {
      bok: [[128, 177], [134, 165.4], [150, 162.8], [163, 168], [166, 177], [158, 181.4], [132, 181.4]],
      vrch: [[134, 165.4], [150, 162.8], [161, 167.4], [149, 169.6], [137, 169]],
      tahy: [[[140, 175.6], [154, 174.4]], [[146, 179], [160, 178]]],
    },
  ];
  const vrstvaSkala = () =>
    skaly
      .map(
        (k) =>
          `<path d="${cara(k.bok)} Z" fill="#34336A" stroke="#D9B25E" stroke-width="0.8" stroke-linejoin="round"/>` +
          `<path d="${cara(k.vrch)} Z" fill="#6E64A0" stroke="#D9B25E" stroke-width="0.5" stroke-linejoin="round"/>` +
          `<g stroke="#1E1D45" stroke-width="1.1" stroke-linecap="round">${k.tahy.map(([a, b]) => `<path d="M${pt(a)} L${pt(b)}"/>`).join("")}</g>` +
          `<g stroke="#D9B25E" stroke-width="0.45" stroke-linecap="round" opacity="0.8">${k.tahy.map(([a, b]) => `<path d="M${pt([a[0] + 2, a[1] + 1.4])} L${pt([b[0] - 3, b[1] + 1.4])}"/>`).join("")}</g>`,
      )
      .join("") +
    `<g fill="#E9C46E">${[[38, 163], [57, 171], [149, 166], [104, 173], [140, 160.6]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="0.75"/>`).join("")}</g>` +
    `<ellipse cx="90" cy="157.4" rx="27" ry="2.6" fill="#1D1B3F" opacity="0.5"/>`;

  /* Pecinka: tělo se štětcovou linkou, k tomu teplé světlo od plamenů */
  const vrstvaPostava = () =>
    vPostave(
      `<g filter="url(#v1-tah)">${pecGeta({})}${pecNohy({})}${pecTelo("v1")}` +
        `<rect x="62" y="93" width="56" height="35" rx="8" fill="#3A2E28" fill-opacity="0.45"/>` +
        `${pecProvaz()}</g>`,
    );
  const vrstvaSvit = () =>
    vPostave(`<path d="${teloD}" fill="url(#v1-svit)"/><rect x="108" y="35" width="14" height="24" rx="5" fill="url(#v1-svit)"/>`);

  /*
    Ve dvířkách hoří vlastní ohýnek jako na původní kresbě: tmavé okénko,
    nízké plamínky u dna a záře jen odspodu. Velký jasný otvor by působil
    jako pusa.
  */
  const vrstvaDvirka = (st) => {
    let s = `<rect x="62" y="93" width="56" height="35" rx="8" fill="url(#v1-vyhen)" opacity="${f(clamp(0.45 + st.I * 0.3))}"/>`;
    const sady = [
      { barva: "#C4432B", k: 1, W: 7.4 },
      { barva: "#F29A3B", k: 0.68, W: 5 },
      { barva: "#FBE3A0", k: 0.4, W: 3 },
    ];
    for (const sada of sady) {
      let g = "";
      [76, 84, 91, 98, 105].forEach((x, i) => {
        const L = (7.5 + (i % 2 ? 2.4 : 0) + (i === 2 ? 4 : 0)) * sada.k * (0.75 + 0.35 * st.I) * (1 + 0.14 * Math.sin(st.t * (5 + i) + i * 2));
        const { d } = jazyk({ B: [x, 128.6], th0: -Math.PI / 2, L, W: sada.W, c: i < 2 ? 1 : i > 2 ? -1 : (Math.sin(st.t * 0.7) > 0 ? 1 : -1), stoc: 1.6, t: st.t, w: 5 + i * 0.6, fz: i * 1.7, vitr: st.vitr * 0.5, vlna: 0.4 });
        g += `<path d="${d}"/>`;
      });
      s += `<g fill="${sada.barva}">${g}</g>`;
    }
    s += `<ellipse cx="90" cy="129" rx="22" ry="4" fill="#FFD27A" opacity="${f(0.25 + 0.2 * clamp(st.I))}"/>`;
    return vPostave(`<g clip-path="url(#v1-dvirka)">${s}</g><rect x="62" y="93" width="56" height="35" rx="8" fill="none" stroke="#7E2F18" stroke-width="1.1"/>`);
  };

  /* Plamínek hódžu na komíně a kroužky kouře po fouknutí */
  const vrstvaKomin = (st) => {
    const [kx, ky] = KOMIN;
    const vzplanuti = st.huf < 1.2 ? Math.sin(Math.PI * clamp(st.huf / 1.2)) : 0;
    const k = (0.8 + 0.25 * st.I + 0.5 * vzplanuti) * (1 + 0.08 * Math.sin(st.t * 7.3));
    let s = "";
    for (const [barva, kk, W] of [["#9A2716", 1, 7.4], ["#E0582E", 0.74, 5.4], ["#F6C15A", 0.48, 3.6], ["#FFF3CF", 0.24, 2]]) {
      const { d } = jazyk({ B: [kx, ky + 1.5], th0: -Math.PI / 2, L: 17 * k * kk, W: W * (0.9 + 0.2 * k), c: 1, stoc: 1.5, stoupani: 0.9, t: st.t, w: 6.2, fz: 1.3, vitr: st.vitr * 0.8, vlna: 0.5 });
      s += `<path d="${d}" fill="${barva}"/>`;
    }
    for (const r of st.krouzky) {
      const u = clamp(r / 2.4);
      const y = ky - 20 - u * 44, x = kx + st.vitr * 30 * u;
      s += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(4 + u * 12)}" ry="${f(1.6 + u * 3.6)}" fill="none" stroke="#6B5D4F" stroke-width="${f(2.2 - u * 1.4)}" opacity="${f((1 - u) * 0.7)}"/>`;
    }
    return s;
  };

  const vrstvaTvar = (st) => {
    let usta = "usmev", oci = "kulate";
    if (st.huf < 0.55) {
      usta = "fuk";
      oci = "zavrene";
    } else if (st.huf < 1.6) {
      usta = "ach";
      oci = "smich";
    } else if (st.I > 1.15) usta = "o";
    return vPostave(pecTvar("v1", { dx: st.pohled[0], dy: st.pohled[1], mrk: st.mrk, oci, usta, tvare: 0.25 + 0.35 * clamp(st.I) }));
  };
  const vrstvaShide = (st) => vPostave(pecShide([st.vitr * -14 + Math.sin(st.t * 1.7) * 4, st.vitr * -14 + Math.sin(st.t * 1.7 + 2.4) * 4]));

  const vrstvaJiskry = (st) =>
    st.jiskry
      .map((j) => {
        const u = j.vek / j.zivot;
        const op = clamp(Math.min(u / 0.08, (1 - u) / 0.4)) * (0.65 + 0.35 * Math.sin(st.t * 18 + j.fz));
        return `<path d="${jiskraD(j.r * (1 - u * 0.4))}" transform="translate(${f(j.x)} ${f(j.y)}) rotate(${f(j.rot + u * 90)})" fill="${u < 0.35 ? "#FFF3CF" : "#F3C04E"}" opacity="${f(op)}"/>`;
      })
      .join("");

  const defs = () =>
    pecDefs("v1") +
    `<radialGradient id="v1-rum" gradientUnits="userSpaceOnUse" cx="${C[0]}" cy="${C[1]}" r="80"><stop offset="0.5" stop-color="#E35E2E"/><stop offset="1" stop-color="#C4432B"/></radialGradient>` +
    `<radialGradient id="v1-ora" gradientUnits="userSpaceOnUse" cx="${C[0]}" cy="${C[1]}" r="70"><stop offset="0.6" stop-color="#F7B24A"/><stop offset="1" stop-color="#EE8434"/></radialGradient>` +
    `<radialGradient id="v1-kotouc" cx="0.5" cy="0.45" r="0.55"><stop offset="0" stop-color="#FBE7A6"/><stop offset="0.55" stop-color="#EBC35E"/><stop offset="0.9" stop-color="#D49A36"/><stop offset="1" stop-color="#B9782A"/></radialGradient>` +
    `<radialGradient id="v1-zare" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#F6B85A" stop-opacity="0.55"/><stop offset="0.55" stop-color="#E9844A" stop-opacity="0.22"/><stop offset="1" stop-color="#E9844A" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="v1-vyhen" cx="0.5" cy="1.05" r="0.8"><stop offset="0" stop-color="#FFB45A" stop-opacity="0.95"/><stop offset="0.4" stop-color="#E0582E" stop-opacity="0.55"/><stop offset="0.85" stop-color="#9A2E16" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="v1-svit" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFD98A" stop-opacity="0.55"/><stop offset="0.35" stop-color="#FFB060" stop-opacity="0.12"/><stop offset="1" stop-color="#FFB060" stop-opacity="0"/></linearGradient>` +
    `<pattern id="v1-kirikane" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><path d="M2.5 0.9 V4.1 M0.9 2.5 H4.1" stroke="#FFF4CC" stroke-width="0.3"/><circle cx="0" cy="0" r="0.45" fill="#FFF4CC"/></pattern>` +
    `<clipPath id="v1-dvirka"><rect x="62" y="93" width="56" height="35" rx="8"/></clipPath>` +
    `<filter id="v1-tah" x="-8%" y="-8%" width="116%" height="116%" color-interpolation-filters="sRGB">` +
    `<feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="4" result="vlna"/>` +
    `<feDisplacementMap in="SourceGraphic" in2="vlna" scale="2.4" xChannelSelector="R" yChannelSelector="G" result="tah"/>` +
    `<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="11" result="zrno"/>` +
    `<feColorMatrix in="zrno" type="matrix" values="0 0 0 0 0.23  0 0 0 0 0.18  0 0 0 0 0.16  0.6 0 0 0 -0.26" result="skvrny"/>` +
    `<feComposite in="skvrny" in2="tah" operator="in" result="zrnoVTvaru"/>` +
    `<feMerge><feMergeNode in="tah"/><feMergeNode in="zrnoVTvaru"/></feMerge></filter>`;

  const novaDynamika = () => ({ I: 0.45, vitr: 0, huf: -10, krouzky: [], jiskry: [], akum: 0, praskot: 0, nahoda: rng(99), zvuk: [], pohled: [0, 0] });
  const krok = (dyn, t, dt, vstup) => {
    const R = dyn.nahoda;
    /* vítr: plameny se od myši odklánějí, bez myši se jen tak pohupují */
    let cil = 0.16 * Math.sin(t * 0.45) + 0.07 * Math.sin(t * 1.3 + 1);
    let pohled = [0, 0];
    if (vstup.mys) {
      const dx = vstup.mys.x - 90, dy = vstup.mys.y - 100;
      cil = -clamp(dx / 70, -1, 1) * 0.85 * clamp(1.5 - Math.hypot(dx, dy) / 140, 0.25, 1);
      pohled = [clamp(dx / 40, -1, 1) * 1.8, clamp(dy / 50, -1, 1) * 1.4];
    }
    dyn.vitr += (cil - dyn.vitr) * (1 - Math.exp(-dt / 0.35));
    dyn.pohled = dyn.pohled.map((v, i) => v + (pohled[i] - v) * (1 - Math.exp(-dt / 0.15)));
    /* mávnutí rozdmýchá oheň */
    const mavnuti = clamp((vstup.rychlost || 0) / 320);
    const cilI = 0.45 + 0.8 * mavnuti;
    if (vstup.kliky && vstup.kliky.length) {
      vstup.kliky.length = 0;
      dyn.huf = t;
      dyn.I = Math.min(1.9, dyn.I + 0.9);
      dyn.krouzky.push(t);
      dyn.zvuk.push({ druh: "fuk", sila: 1, pan: 0 });
      for (let i = 0; i < 26; i++) novaJiskra(dyn, R, true);
    }
    dyn.I += (cilI - dyn.I) * (1 - Math.exp(-dt / (dyn.I > cilI ? 1.7 : 0.35)));
    dyn.krouzky = dyn.krouzky.filter((k) => t - k < 2.4);
    /* jiskry z plamenů */
    dyn.akum += dt * (1.6 + 9 * dyn.I);
    while (dyn.akum >= 1) {
      dyn.akum -= 1;
      novaJiskra(dyn, R, false);
    }
    for (const j of dyn.jiskry) {
      j.vek += dt;
      j.vx += (dyn.vitr * 22 - j.vx) * dt * 1.4;
      j.x += (j.vx + Math.sin(j.vek * 5 + j.fz) * 4) * dt;
      j.y += j.vy * dt;
      j.vy *= 1 - dt * 0.4;
    }
    dyn.jiskry = dyn.jiskry.filter((j) => j.vek < j.zivot);
    /* praskání: čím víc hoří, tím hustěji */
    dyn.praskot += dt * (1.2 + 7 * clamp(dyn.I, 0, 1.6));
    while (dyn.praskot >= 1) {
      dyn.praskot -= 1;
      if (R() < 0.8) dyn.zvuk.push({ druh: "praskot", sila: 0.25 + R() * 0.55, pan: (R() - 0.5) * 1.2 });
    }
  };
  const novaJiskra = (dyn, R, vybuch) => {
    const a = rad(190 + R() * 160);
    const nahore = clamp(-Math.sin(a));
    const r = R0 + (12 + 26 * Math.pow(nahore, 1.6)) * (0.6 + 0.4 * clamp(dyn.I)) * (0.6 + R() * 0.5);
    dyn.jiskry.push({
      x: C[0] + Math.cos(a) * r,
      y: C[1] + Math.sin(a) * r,
      vx: Math.cos(a) * (vybuch ? 30 : 6) + dyn.vitr * 20,
      vy: -14 - R() * 16 + Math.sin(a) * (vybuch ? 26 : 4),
      vek: 0,
      zivot: 1 + R() * 1.4,
      r: 0.8 + R() * 1.4,
      rot: R() * 90,
      fz: R() * 6.28,
    });
  };
  const stav = (t, vstup = {}, dyn) => {
    const d = dyn || novaDynamika();
    return {
      t,
      I: d.I,
      vitr: d.vitr,
      huf: t - d.huf,
      krouzky: d.krouzky.map((k) => t - k),
      jiskry: d.jiskry,
      pohled: d.pohled,
      mrk: mrkani(t, [2.2, 5.4, 5.65, 8.6], 10),
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
    hukot: (st) => clamp(0.25 + 0.4 * st.I, 0, 1),
    klidne: { t: 3.4 },
    vrstvy: [
      { id: "zare", kresli: () => `<circle cx="${C[0]}" cy="${C[1] - 8}" r="96" fill="url(#v1-zare)"/>`, pruhlednost: (st) => f(clamp(0.45 + 0.4 * st.I)) },
      { id: "plameny", kresli: vrstvaPlameny, klic: snimek },
      { id: "svatozar", kresli: vrstvaSvatozar, tezka: true },
      { id: "skala", kresli: vrstvaSkala },
      { id: "postava", kresli: vrstvaPostava, tezka: true },
      { id: "svit", kresli: vrstvaSvit, pruhlednost: (st) => f(clamp(0.35 + 0.45 * st.I)) },
      { id: "dvirka", kresli: vrstvaDvirka, klic: snimek },
      { id: "shide", kresli: vrstvaShide, klic: snimek },
      { id: "tvar", kresli: vrstvaTvar, klic: (st) => `${f(st.pohled[0])},${f(st.pohled[1])},${f(st.mrk)},${st.huf < 1.6 ? Math.floor(st.huf * 10) : st.I > 1.15}` },
      { id: "komin", kresli: vrstvaKomin, klic: snimek },
      { id: "jiskry", kresli: vrstvaJiskry, klic: snimek },
    ],
  };
})();

/* ═══════════════════════════════════════════════════════════════════
 * 2 — RAKU
 * Noc rozpitá tuší, na dvoře hranice dříví a kád s vodou. Pecinka
 * otevře dvířka, kleštěmi vytáhne rozžhavenou misku a ponoří ji do
 * vody. Zasyčí to, vyvalí se pára, a když se rozplyne, je z misky
 * hotové raku: bílá s černými prasklinami, černá kuro raku, rudá aka
 * raku, nebo lesklý lustr v barvách loga. Hotové misky staví do řady
 * před kádí, každá je trochu jiná.
 *
 * Kliknutí vypálí další misku. Když se nic neděje, Pecinka vypaluje sama.
 * ═══════════════════════════════════════════════════════════════════ */
const V2 = (() => {
  const FIG = { x: 62, y: 160, s: 0.7 };
  const FIGT = `translate(${FIG.x} ${FIG.y}) scale(${FIG.s}) translate(-90 -159)`;
  const vPostave = (s) => `<g transform="${FIGT}">${s}</g>`;
  const naPanel = ([x, y]) => [FIG.x + (x - 90) * FIG.s, FIG.y + (y - 159) * FIG.s];
  const RAMENO = [93, 119];
  const DVERE = naPanel([90, 110.5]);
  const TVAR_STRED = naPanel([90, 84]);
  const KAD = { x: 116, y: 120, rx: 20, ry: 5, dno: 156, rxDno: 17 };
  const HLADINA = 121.4;
  const SLOTY = [108, 126, 144, 162];
  const SLOT_DNO = 175;
  const KLESTE = 16;

  /* Misky v řezu, počátek uprostřed okraje, y dolů */
  const TVARY = {
    wan: { d: "M-8.4 0 C-8.4 6 -5 10 -3.4 10.4 L-3.4 12 L3.4 12 L3.4 10.4 C5 10 8.4 6 8.4 0 Z", rim: 8.4, h: 12 },
    tsutsu: { d: "M-6.2 0 C-6.6 5 -6.4 10 -5 12 L-2.8 12.4 L-2.8 13.6 L2.8 13.6 L2.8 12.4 L5 12 C6.4 10 6.6 5 6.2 0 Z", rim: 6.2, h: 13.6 },
    hira: { d: "M-9.6 0 C-9 4.6 -5 7.4 -3 7.6 L-3 9 L3 9 L3 7.6 C5 7.4 9 4.6 9.6 0 Z", rim: 9.6, h: 9 },
  };
  const tvarMisky = (k) => ["wan", "tsutsu", "hira"][((k % 3) + 3) % 3];
  const glazuraMisky = (k) => ["shiro", "kuro", "soumrak", "aka"][((k % 4) + 4) % 4];
  const GLAZURA = {
    shiro: { zaklad: "#EDE5D3", ustí: "#D6CBB4", praskliny: "#2A2220", sila: 0.34, op: 0.85 },
    kuro: { zaklad: "#1E1916", ustí: "#0F0C0B", praskliny: null },
    soumrak: { zaklad: "url(#v2-lustr)", ustí: "#4A3C70", praskliny: "#F6E9FF", sila: 0.26, op: 0.45 },
    aka: { zaklad: "#B4552F", ustí: "#8A3C22", praskliny: "#4A2418", sila: 0.28, op: 0.7 },
  };
  /** Síť prasklin: krátké náhodné procházky, ořízne je tvar misky. */
  const praskliny = (seed, sirka, vyska) => {
    const r = rng(seed);
    let d = "";
    for (let i = 0; i < 10; i++) {
      let x = (r() - 0.5) * 2 * sirka, y = r() * vyska, a = r() * Math.PI * 2;
      const B = [[x, y]];
      const n = 3 + Math.floor(r() * 6);
      for (let k = 0; k < n; k++) {
        a += (r() - 0.5) * 1.5;
        x += Math.cos(a) * 2.1;
        y += Math.sin(a) * 2.1;
        B.push([x, y]);
      }
      d += cara(B) + " ";
    }
    return d;
  };
  /** Miska v souřadnicích misky. T je žár 0…1, přes glazuru se kreslí záře. */
  const miska = (k, T = 0) => {
    const jm = tvarMisky(k);
    const tv = TVARY[jm], gl = GLAZURA[glazuraMisky(k)];
    let s = `<path d="${tv.d}" fill="${gl.zaklad}"/>`;
    let uvnitr = "";
    if (gl.praskliny) uvnitr += `<path d="${praskliny(k * 7 + 3, tv.rim, tv.h)}" stroke="${gl.praskliny}" stroke-width="${gl.sila}" fill="none" stroke-linecap="round" opacity="${gl.op}"/>`;
    else uvnitr += `<g fill="#6A3A1E" opacity="0.7"><ellipse cx="${f(-tv.rim * 0.35)}" cy="${f(tv.h * 0.5)}" rx="1.3" ry="0.8"/><ellipse cx="${f(tv.rim * 0.4)}" cy="${f(tv.h * 0.32)}" rx="0.9" ry="0.6"/></g>`;
    uvnitr += `<rect x="${-tv.rim - 1}" y="${f(tv.h - 1.9)}" width="${tv.rim * 2 + 2}" height="3" fill="#2E2622"/>`;
    uvnitr += `<path d="M${f(-tv.rim * 0.66)} 1.8 Q${f(-tv.rim * 0.74)} ${f(tv.h * 0.45)} ${f(-tv.rim * 0.3)} ${f(tv.h * 0.74)}" stroke="#FFFFFF" stroke-width="1.1" opacity="${glazuraMisky(k) === "kuro" ? 0.32 : 0.42}" fill="none" stroke-linecap="round"/>`;
    s += `<g clip-path="url(#v2-tvar-${jm})">${uvnitr}</g>`;
    s += `<ellipse cx="0" cy="0" rx="${tv.rim}" ry="1.9" fill="${gl.ustí}" stroke="#1A1412" stroke-width="0.45"/>`;
    s += `<path d="${tv.d}" fill="none" stroke="#1A1412" stroke-width="0.5" opacity="0.65"/>`;
    if (T > 0.01) {
      const z = smooth(T * 1.7);
      s +=
        `<path d="${tv.d}" fill="${zar(T * 0.92)}" opacity="${f(z)}"/>` +
        `<ellipse cx="0" cy="0" rx="${tv.rim}" ry="1.9" fill="${zar(Math.min(1, T + 0.1))}" opacity="${f(z)}"/>` +
        `<ellipse cx="0" cy="${f(tv.h * 0.42)}" rx="${f(tv.rim * 0.55)}" ry="${f(tv.h * 0.28)}" fill="${zar(Math.min(1, T + 0.22))}" opacity="${f(0.55 * z)}"/>`;
    }
    return s;
  };
  const pocatekMisky = (k, P) => [P[0] - (TVARY[tvarMisky(k)].rim - 1.5), P[1] + 1];

  /* Pohyb kleští: hrot P, úhel kleští φ (od ruky k hrotu), sevření g */
  const KLID = { P: [100, 151], phi: 82, g: 0 };
  const DRAHA = [
    { u: 0, ...KLID },
    { u: 0.45, ...KLID },
    { u: 1.1, P: [71, 123], phi: 165, g: 0 },
    { u: 1.3, P: [71, 123], phi: 165, g: 1 },
    { u: 2.2, P: [96, 108], phi: 120, g: 1 },
    { u: 3.0, P: [123, 101], phi: 30, g: 1 },
    { u: 3.32, P: [123, 127], phi: 30, g: 1 },
    { u: 4.6, P: [123, 126], phi: 30, g: 1 },
    { u: 5.3, P: [123, 99], phi: 30, g: 1 },
    { u: 6.1, P: [121, 97], phi: 38, g: 1 },
    { u: 7.0, P: [115, 162], phi: 75, g: 1 },
    { u: 7.2, P: [115, 162], phi: 75, g: 0 },
    { u: 8.0, ...KLID },
  ];
  const KONEC = 8.0;
  const draha = (u) => {
    let i = 0;
    while (i < DRAHA.length - 2 && DRAHA[i + 1].u <= u) i++;
    const A = DRAHA[i], B = DRAHA[i + 1];
    const k = smooth((u - A.u) / (B.u - A.u || 1));
    return { P: [lerp(A.P[0], B.P[0], k), lerp(A.P[1], B.P[1], k)], phi: lerp(A.phi, B.phi, k), g: lerp(A.g, B.g, k) };
  };
  const dvere = (u) => (u < 0 ? 0 : smooth(u / 0.5) * (1 - smooth((u - 2.2) / 0.7)));
  const zarMisky = (u) => {
    if (u < 1.3) return 1;
    if (u < 3.3) return 1 - 0.16 * (u - 1.3);
    return Math.max(0, 0.68 * (1 - (u - 3.3) / 0.55));
  };

  /* ——— Statické kusy ——— */
  const TUS_D = hrouda(90, 92, 86, 85, 4, { bodu: 30, kolisani: 0.05 });
  const vrstvaTus = () =>
    `<path d="${hrouda(90, 92, 90, 89, 9, { bodu: 30, kolisani: 0.06 })}" fill="#3A3240" opacity="0.55" filter="url(#v2-tus-lem)"/>` +
    `<path d="${TUS_D}" fill="#241E29" filter="url(#v2-tus)"/>` +
    `<g clip-path="url(#v2-tus-orez)">` +
    `<circle cx="146" cy="34" r="20" fill="url(#v2-mesic-zar)"/>` +
    `<circle cx="146" cy="34" r="8" fill="#E9DFC4"/><circle cx="149.6" cy="31.6" r="7.2" fill="#241E29"/>` +
    `<g fill="#E9DFC4">${[[40, 30, 0.6], [62, 18, 0.45], [98, 26, 0.5], [118, 14, 0.4], [168, 60, 0.45], [24, 58, 0.4], [130, 52, 0.35]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join("")}</g>` +
    `<path d="M0 116 C18 104 36 109 50 101 C64 94 78 103 92 105 C108 107 122 97 140 100 C156 103 168 110 180 108 V180 H0 Z" fill="#2C2531"/>` +
    `<path d="M0 147 C30 144.4 60 146.4 90 145.4 C120 144.4 150 146.6 180 145.6 V180 H0 Z" fill="#342B33"/>` +
    `<path d="M0 147 C30 144.4 60 146.4 90 145.4 C120 144.4 150 146.6 180 145.6" stroke="#4A3E46" stroke-width="0.8" fill="none"/>` +
    /* hranice dříví za Pecinkou */
    `<g stroke="#2A1E18" stroke-width="0.7">${[[12, 145], [20, 145], [28, 145], [36, 145], [16, 138], [24, 138], [32, 138], [20, 131], [28, 131]]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.9" fill="#4E3A2C"/><circle cx="${x}" cy="${y}" r="2.5" fill="#6A5240" stroke="none"/><circle cx="${x}" cy="${y}" r="1.1" fill="none" stroke="#4E3A2C" stroke-width="0.5"/>`)
      .join("")}</g>` +
    `</g>`;
  const vrstvaPostava = () =>
    vPostave(
      `<g filter="url(#v2-tah)">${pecGeta({ deska: "#8A6A48", zub: "#5E4430", obrys: "#3A2A1E", linka: "#A8865E" })}${pecNohy({ noha: "#5A2414", hanao: "#9E3422" })}` +
        `${pecTelo("v2", { obrys: "#3E180C", komin: "#6E2E1C" })}` +
        `<path d="${PEC.provaz}" stroke="#8E7C5E" stroke-width="6.5" stroke-linecap="round" fill="none"/><path d="${PEC.provaz}" stroke="#B2A27E" stroke-width="5" stroke-linecap="round" fill="none"/><path d="${PEC.provaz}" stroke="#8E7C5E" stroke-width="5" stroke-dasharray="1.6 4.4" fill="none"/>` +
        `</g>${pecShide([0, 0], { papir: "#CFC8B8", obrys: "#6E6252" })}`,
    );
  const vrstvaKadZadni = () =>
    `<ellipse cx="${KAD.x}" cy="${KAD.y}" rx="${KAD.rx}" ry="${KAD.ry}" fill="#3A2A1E" stroke="#1E140E" stroke-width="0.8"/>` +
    `<ellipse cx="${KAD.x}" cy="${HLADINA}" rx="${KAD.rx - 1.8}" ry="${KAD.ry - 1}" fill="#17202E"/>`;
  const vrstvaKad = () => {
    const { x, y, rx, ry, dno, rxDno } = KAD;
    const telo = `M${x - rx} ${y} L${x - rxDno} ${dno} Q${x} ${dno + 4} ${x + rxDno} ${dno} L${x + rx} ${y} A${rx} ${ry} 0 0 1 ${x - rx} ${y} Z`;
    const duzky = [-15, -9, -3, 3, 9, 15].map((o) => `M${f(x + o)} ${f(y + ry * Math.sqrt(1 - (o / rx) ** 2))} L${f(x + o * (rxDno / rx))} ${f(dno + 3.6 * Math.sqrt(1 - (o / rx) ** 2))}`).join(" ");
    const obruc = (yy, w) => {
      const k = (yy - y) / (dno - y);
      const r = lerp(rx, rxDno, k);
      return `<path d="M${f(x - r)} ${yy} Q${x} ${f(yy + 4.6)} ${f(x + r)} ${yy}" stroke="#2A2016" stroke-width="${w + 1}" fill="none"/><path d="M${f(x - r)} ${yy} Q${x} ${f(yy + 4.6)} ${f(x + r)} ${yy}" stroke="#7E8A52" stroke-width="${w}" fill="none"/>`;
    };
    return (
      `<path d="${telo}" fill="url(#v2-drevo)" stroke="#1E140E" stroke-width="0.9"/>` +
      `<path d="${duzky}" stroke="#2A1E14" stroke-width="0.5" opacity="0.7"/>` +
      obruc(128, 1.6) +
      obruc(149, 1.6) +
      `<path d="M${x - rx} ${y} A${rx} ${ry} 0 0 0 ${x + rx} ${y}" stroke="#7A5A40" stroke-width="1.6" fill="none"/>`
    );
  };

  /* ——— Živé kusy ——— */
  const vrstvaDvere = (st) => {
    const o = st.dvere;
    let s = `<rect x="62" y="93" width="56" height="35" rx="8" fill="#140D0B"/>`;
    if (o > 0.01) {
      s += `<rect x="62" y="93" width="56" height="35" rx="8" fill="url(#v2-komora)" opacity="${f(smooth(o * 1.6))}"/>`;
      s += `<g fill="#FFE6A8" opacity="${f(0.35 * o)}"><rect x="66" y="118" width="48" height="2.4" rx="1"/></g>`;
    } else {
      /* zavřená: světlo prosvítá spárou a kukátkem */
      s += `<rect x="62" y="93" width="56" height="35" rx="8" fill="none" stroke="#E0582E" stroke-width="0.9" opacity="${f(0.45 + 0.15 * Math.sin(st.t * 2.3))}"/>`;
    }
    /* dvířka se otáčejí kolem levého pantu ven k nám */
    const th = o * rad(104);
    const sirka = 56 * Math.cos(th);
    const vys = 4.6 * Math.sin(th);
    const xv = 62 + sirka;
    s += `<path d="M62 93 L${f(xv)} ${f(93 - vys)} L${f(xv)} ${f(128 + vys)} L62 128 Z" fill="${mix("#4A3028", "#1E1816", o)}" stroke="#120C0A" stroke-width="1" stroke-linejoin="round"/>`;
    if (Math.cos(th) > 0.3) s += `<path d="M${f(62 + sirka * 0.08)} ${f(99 - vys)} H${f(62 + sirka * 0.92)} M${f(62 + sirka * 0.08)} ${f(122 + vys)} H${f(62 + sirka * 0.92)}" stroke="#5E4034" stroke-width="1.2" opacity="0.8"/><rect x="${f(62 + sirka * 0.86)}" y="106" width="${f(Math.max(1, sirka * 0.1))}" height="9" rx="1.2" fill="#2A1C16" stroke="#6E5044" stroke-width="0.6"/>`;
    if (Math.cos(th) > 0.15) {
      const kx = 62 + sirka * 0.5, ky = 110.5;
      s += `<circle cx="${f(kx)}" cy="${ky}" r="${f(3.4 * Math.max(0.2, Math.cos(th)))}" fill="#120C0A"/><circle cx="${f(kx)}" cy="${ky}" r="${f(2.3 * Math.max(0.2, Math.cos(th)))}" fill="${o > 0.01 ? "#2A1E1A" : zar(0.82 + 0.06 * Math.sin(st.t * 2.3))}"/>`;
      s += `<g fill="#6B5D55">${[0.12, 0.88].map((p) => `<circle cx="${f(62 + sirka * p)}" cy="${f(97 - vys * 0.8)}" r="0.9"/><circle cx="${f(62 + sirka * p)}" cy="${f(124 + vys * 0.8)}" r="0.9"/>`).join("")}</g>`;
    }
    return vPostave(s);
  };
  const vrstvaTvar = (st) =>
    vPostave(pecTvar("v2", { dx: st.pohled[0], dy: st.pohled[1], mrk: st.mrk, oci: st.oci, usta: st.usta, tvare: 0.18 + 0.45 * st.svetloDvere, pusa: "#E9DCC6" }));
  const vrstvaVoda = (st) => {
    let s = "";
    if (st.miska && st.miska.T > 0.05) {
      const blizko = clamp(1 - Math.abs(st.miska.O[0] - KAD.x) / 30) * clamp(1 - (HLADINA - st.miska.O[1]) / 40);
      if (blizko > 0.01) s += `<ellipse cx="${f(st.miska.O[0])}" cy="${HLADINA + 0.6}" rx="7" ry="1.6" fill="${zar(st.miska.T)}" opacity="${f(0.6 * blizko * st.miska.T)}"/>`;
    }
    for (const v of st.vlny) {
      const u = clamp(v / 1.6);
      s += `<ellipse cx="${KAD.x + 7}" cy="${HLADINA}" rx="${f(6 + u * 11)}" ry="${f(1.4 + u * 2)}" fill="none" stroke="#8A9AB4" stroke-width="0.6" opacity="${f((1 - u) * 0.7)}"/>`;
    }
    return `<g clip-path="url(#v2-hladina)">${s}</g>`;
  };
  const klesteSvg = (H, P, g) => {
    const d = Math.hypot(P[0] - H[0], P[1] - H[1]) || 1;
    const nx = -(P[1] - H[1]) / d, ny = (P[0] - H[0]) / d;
    const roz = 0.5 + 1.8 * (1 - g);
    return [-1, 1]
      .map((s) => {
        const P2 = [P[0] + nx * roz * s * 0.6, P[1] + ny * roz * s * 0.6];
        const H2 = [H[0] + nx * 0.5 * s, H[1] + ny * 0.5 * s];
        return `<path d="M${pt(H2)} L${pt(P2)}" stroke="#2A2422" stroke-width="1.2" stroke-linecap="round"/><path d="M${pt(H2)} L${pt(P2)}" stroke="#8A8078" stroke-width="0.4" stroke-linecap="round"/>`;
      })
      .join("");
  };
  /* Do kádě jde miska za její přední stěnou, z kádě k řadě už před ní */
  const vrstvaPrace = (vpredu) => (st) => {
    if (st.vpredu !== vpredu) return "";
    const { P, H, g } = st.kleste;
    let s = "";
    if (st.miska) {
      const m = st.miska;
      let obsah = `<circle cx="0" cy="${TVARY[tvarMisky(m.k)].h * 0.45}" r="16" fill="url(#v2-halo)" opacity="${f(m.T * 0.9)}"/>` + miska(m.k, m.T);
      if (m.lesk > 0) obsah += `<path d="${jiskraD(3.4 * m.lesk)}" transform="translate(${f(-TVARY[tvarMisky(m.k)].rim * 0.4)} 3) rotate(${f(m.lesk * 40)})" fill="#FFFFFF" opacity="${f(m.lesk)}"/>`;
      const g2 = `<g transform="translate(${f(m.O[0])} ${f(m.O[1])})">${obsah}</g>`;
      s += m.podHladinou ? `<g clip-path="url(#v2-nad-hladinou)">${g2}</g>` : g2;
    }
    const kl = klesteSvg(H, P, g);
    s += P[1] > HLADINA - 1 && Math.abs(P[0] - KAD.x) < KAD.rx ? `<g clip-path="url(#v2-nad-hladinou)">${kl}</g>` : kl;
    s += rucka(RAMENO, H, { tloustka: 3.8, barva: "#7A3826", obrys: "#3E180C" });
    return s;
  };
  const vrstvaRada = (st) =>
    st.rada
      .map((m) => {
        const tv = TVARY[tvarMisky(m.k)];
        return (
          `<g opacity="${f(m.op)}"><ellipse cx="${f(m.x)}" cy="${SLOT_DNO + 0.4}" rx="${tv.rim + 1.4}" ry="1.6" fill="#120E12" opacity="0.6"/>` +
          `<g transform="translate(${f(m.x)} ${f(SLOT_DNO - tv.h + m.dy)})">${miska(m.k, 0)}</g></g>`
        );
      })
      .join("");
  const vrstvaPara = (st) =>
    st.para
      .map((p) => {
        const u = p.vek / p.zivot;
        const op = clamp(Math.min(u / 0.12, 1) * (1 - u)) * p.op;
        return `<circle cx="${f(p.x)}" cy="${f(p.y)}" r="${f(p.r)}" fill="url(#v2-para${p.tepla > 0.5 ? "-tepla" : ""})" opacity="${f(op)}"/>`;
      })
      .join("");
  const vrstvaSvetlo = (st) => {
    let s = "";
    if (st.svetloDvere > 0.01) s += `<circle cx="${f(DVERE[0])}" cy="${f(DVERE[1])}" r="70" fill="url(#v2-svetlo)" opacity="${f(st.svetloDvere)}"/>`;
    if (st.miska && st.miska.T > 0.02) {
      const c = [st.miska.O[0], st.miska.O[1] + 5];
      s += `<circle cx="${f(c[0])}" cy="${f(c[1])}" r="${f(36 + 20 * st.miska.T)}" fill="url(#v2-svetlo)" opacity="${f(0.85 * st.miska.T)}"/>`;
    }
    if (st.zablesk > 0.01) s += `<circle cx="${KAD.x}" cy="${HLADINA - 6}" r="44" fill="url(#v2-svetlo)" opacity="${f(st.zablesk)}"/>`;
    s += `<circle cx="${f(DVERE[0])}" cy="${f(DVERE[1])}" r="26" fill="url(#v2-svetlo)" opacity="${f(0.16 + 0.06 * Math.sin(st.t * 2.3))}"/>`;
    return s;
  };
  const vrstvaJiskry = (st) =>
    st.jiskry
      .map((j) => {
        const u = j.vek / j.zivot;
        return `<circle cx="${f(j.x)}" cy="${f(j.y)}" r="${f(j.r * (1 - u * 0.5))}" fill="${u < 0.3 ? "#FFF0C2" : "#FFB45A"}" opacity="${f(clamp((1 - u) * 1.4))}"/>`;
      })
      .join("") +
    st.kapky.map((k) => `<ellipse cx="${f(k.x)}" cy="${f(k.y)}" rx="0.55" ry="0.9" fill="#9DB0CC" opacity="0.85"/>`).join("");
  const vrstvaKour = (st) => {
    const [kx, ky] = naPanel([115, 35]);
    let s = "";
    for (let i = 0; i < 6; i++) {
      const u = ((st.t * 0.14 + i / 6) % 1 + 1) % 1;
      const x = kx + Math.sin(u * 5 + i) * 3 * u + u * 14, y = ky - 2 - u * 70;
      s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(4 + u * 12)}" fill="url(#v2-kour)" opacity="${f(0.55 * (1 - u) * smooth(u * 6))}"/>`;
    }
    return s;
  };

  const defs = () =>
    pecDefs("v2", { svetla: "#9A4E36", stred: "#7A3826", tmava: "#52200F" }) +
    `<filter id="v2-tus" x="-12%" y="-12%" width="124%" height="124%" color-interpolation-filters="sRGB">` +
    `<feTurbulence type="fractalNoise" baseFrequency="0.055" numOctaves="4" seed="8" result="n"/>` +
    `<feDisplacementMap in="SourceGraphic" in2="n" scale="13" xChannelSelector="R" yChannelSelector="G" result="d"/>` +
    `<feGaussianBlur in="d" stdDeviation="0.55" result="b"/>` +
    `<feTurbulence type="fractalNoise" baseFrequency="0.018 0.05" numOctaves="2" seed="3" result="m"/>` +
    `<feColorMatrix in="m" type="matrix" values="0 0 0 0 0.11  0 0 0 0 0.09  0 0 0 0 0.13  0 0 0 1.5 -0.62" result="skvrny"/>` +
    `<feComposite in="skvrny" in2="b" operator="in" result="sk"/>` +
    `<feMerge><feMergeNode in="b"/><feMergeNode in="sk"/></feMerge></filter>` +
    `<filter id="v2-tus-lem" x="-15%" y="-15%" width="130%" height="130%"><feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="21" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="16" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation="2.4"/></filter>` +
    `<clipPath id="v2-tus-orez"><path d="${TUS_D}"/></clipPath>` +
    `<filter id="v2-tah" x="-8%" y="-8%" width="116%" height="116%"><feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="4" result="vlna"/><feDisplacementMap in="SourceGraphic" in2="vlna" scale="2.2" xChannelSelector="R" yChannelSelector="G"/></filter>` +
    `<radialGradient id="v2-kour"><stop offset="0" stop-color="#6A6068" stop-opacity="0.7"/><stop offset="1" stop-color="#6A6068" stop-opacity="0"/></radialGradient><radialGradient id="v2-mesic-zar"><stop offset="0" stop-color="#E9DFC4" stop-opacity="0.28"/><stop offset="1" stop-color="#E9DFC4" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="v2-komora" cx="0.5" cy="0.6" r="0.75"><stop offset="0" stop-color="#FFF4CE"/><stop offset="0.45" stop-color="#FFC25A"/><stop offset="0.85" stop-color="#F07A2A"/><stop offset="1" stop-color="#B8401A"/></radialGradient>` +
    `<radialGradient id="v2-svetlo"><stop offset="0" stop-color="#FFB45A" stop-opacity="0.62"/><stop offset="0.4" stop-color="#E0582E" stop-opacity="0.24"/><stop offset="1" stop-color="#E0582E" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="v2-halo"><stop offset="0" stop-color="#FFD27A" stop-opacity="0.75"/><stop offset="0.5" stop-color="#FF8A2A" stop-opacity="0.3"/><stop offset="1" stop-color="#FF8A2A" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="v2-para"><stop offset="0" stop-color="#F4F0EA" stop-opacity="0.85"/><stop offset="0.6" stop-color="#D6D0D0" stop-opacity="0.38"/><stop offset="1" stop-color="#C8C2C4" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="v2-para-tepla"><stop offset="0" stop-color="#FFE2B0" stop-opacity="0.85"/><stop offset="0.6" stop-color="#F4A868" stop-opacity="0.35"/><stop offset="1" stop-color="#F4A868" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="v2-drevo" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3E2C1E"/><stop offset="0.4" stop-color="#6A4C34"/><stop offset="1" stop-color="#2E2016"/></linearGradient>` +
    `<linearGradient id="v2-lustr" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#C4432B"/><stop offset="0.32" stop-color="#C0708A"/><stop offset="0.62" stop-color="#7A5E8E"/><stop offset="1" stop-color="#3A3C7A"/></linearGradient>` +
    Object.entries(TVARY).map(([jm, tv]) => `<clipPath id="v2-tvar-${jm}"><path d="${tv.d}"/></clipPath>`).join("") +
    `<clipPath id="v2-hladina"><ellipse cx="${KAD.x}" cy="${HLADINA}" rx="${KAD.rx - 1.8}" ry="${KAD.ry - 1}"/></clipPath>` +
    `<clipPath id="v2-nad-hladinou"><rect x="-20" y="-20" width="220" height="${HLADINA + 20.4}"/></clipPath>`;

  /* ——— Simulace ——— */
  const novaDynamika = () => ({
    vypal: null, dalsi: 0, konecPosledniho: -5.8, rada: [{ k: -2, x: SLOTY[1], op: 1 }, { k: -1, x: SLOTY[0], op: 1 }],
    para: [], kapky: [], jiskry: [], vlny: [], akum: 0, praskot: 0, nahoda: rng(717), zvuk: [], pohled: [0, 0], uPred: -1,
  });
  const pres = (a, b, x) => a < x && b >= x;
  const pustPar = (dyn, R, kolik, tepla) => {
    for (let i = 0; i < kolik; i++) {
      dyn.para.push({
        x: KAD.x + 7 + (R() - 0.5) * 16, y: HLADINA - 2 - R() * 5, vx: (R() - 0.5) * 16, vy: -(tepla ? 22 : 12) - R() * (tepla ? 30 : 16),
        r: (tepla ? 5 : 3) + R() * 4, rost: (tepla ? 9 : 5) + R() * 7, vek: -R() * (tepla ? 0.25 : 0.4), zivot: 1.6 + R() * 1.8, op: 0.7 + R() * 0.3, tepla: tepla ? 1 : 0,
      });
    }
  };
  const krok = (dyn, t, dt, vstup) => {
    const R = dyn.nahoda;
    if (vstup.kliky && vstup.kliky.length) {
      vstup.kliky.length = 0;
      if (!dyn.vypal) dyn.vypal = { start: t, k: dyn.dalsi++ };
    }
    if (!dyn.vypal && t - dyn.konecPosledniho > 7 && t > 1) dyn.vypal = { start: t, k: dyn.dalsi++ };
    const v = dyn.vypal;
    const u = v ? t - v.start : -1;
    const uP = dyn.uPred;
    if (v) {
      if (pres(uP, u, 0.05)) dyn.zvuk.push({ druh: "dvere" });
      if (pres(uP, u, 1.25)) dyn.zvuk.push({ druh: "cink", sila: 0.8, pan: -0.2 });
      if (pres(uP, u, 3.3)) {
        dyn.zvuk.push({ druh: "syk", sila: 1, pan: 0.3 });
        for (let i = 0; i < 6; i++) dyn.zvuk.push({ druh: "bubl", za: 0.15 + i * 0.16 + R() * 0.1, pan: 0.3 });
        pustPar(dyn, R, 38, true);
        dyn.vlny.push(t);
      }
      if (u > 3.4 && u < 4.6 && R() < dt * 10) pustPar(dyn, R, 1, false);
      if (pres(uP, u, 4.7)) {
        pustPar(dyn, R, 10, false);
        dyn.vlny.push(t);
      }
      if (u > 5.0 && u < 6.2 && R() < dt * 5) {
        const st = stavVypalu(v, t);
        if (st.miska) dyn.kapky.push({ x: st.miska.O[0] + (R() - 0.5) * 8, y: st.miska.O[1] + TVARY[tvarMisky(v.k)].h, vy: 0 });
        dyn.zvuk.push({ druh: "kap", za: 0.25, pan: 0.3 });
      }
      if (pres(uP, u, 6.2)) {
        dyn.rada = dyn.rada.map((m) => ({ ...m, od: m.x }));
        dyn.posun = t;
      }
      if (pres(uP, u, 7.05)) {
        dyn.zvuk.push({ druh: "tuk", sila: 0.9, pan: 0.2 });
        dyn.rada.push({ k: v.k, x: SLOTY[0], op: 1 });
      }
      /* jiskry z otevřených dvířek a z rozžhavené misky */
      const o = dvere(u);
      const st = stavVypalu(v, t);
      const T = st.miska ? st.miska.T : 0;
      dyn.akum += dt * (12 * o + 9 * T);
      while (dyn.akum >= 1) {
        dyn.akum -= 1;
        const zMisky = st.miska && T > 0.1 && R() < (9 * T) / (12 * o + 9 * T + 0.001);
        const [x0, y0] = zMisky ? [st.miska.O[0] + (R() - 0.5) * 12, st.miska.O[1]] : [DVERE[0] + (R() - 0.5) * 30, DVERE[1] - 6];
        dyn.jiskry.push({ x: x0, y: y0, vx: (R() - 0.5) * 14, vy: -10 - R() * 22, vek: 0, zivot: 0.6 + R() * 0.9, r: 0.4 + R() * 0.6 });
      }
      dyn.praskot += dt * (4 * o + 8 * T);
      while (dyn.praskot >= 1) {
        dyn.praskot -= 1;
        dyn.zvuk.push({ druh: "praskot", sila: 0.2 + R() * 0.4, pan: -0.3 + R() * 0.6 });
      }
      if (u >= KONEC) {
        dyn.vypal = null;
        dyn.konecPosledniho = t;
      }
    }
    dyn.uPred = dyn.vypal ? u : -1;
    /* řada: ostatní se posunou o místo doprava, poslední odejde */
    if (dyn.posun != null) {
      const k = smooth((t - dyn.posun) / 0.7);
      for (const m of dyn.rada) {
        const iz = SLOTY.indexOf(m.od);
        const cil = iz + 1 < SLOTY.length ? SLOTY[iz + 1] : SLOTY[SLOTY.length - 1] + 16;
        m.x = lerp(m.od, cil, k);
        if (iz + 1 >= SLOTY.length) m.op = 1 - k;
      }
      if (k >= 1) {
        dyn.rada = dyn.rada.filter((m) => m.op > 0.01).map((m) => ({ k: m.k, x: m.x, op: 1 }));
        dyn.posun = null;
      }
    }
    for (const p of dyn.para) {
      p.vek += dt;
      if (p.vek < 0) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy *= 1 - dt * 0.5;
      p.vx += Math.sin(t * 1.3 + p.y * 0.1) * dt * 4;
      p.r += p.rost * dt;
      if (p.tepla) p.tepla = Math.max(0, p.tepla - dt * 1.6);
    }
    dyn.para = dyn.para.filter((p) => p.vek < p.zivot);
    for (const j of dyn.jiskry) {
      j.vek += dt;
      j.x += j.vx * dt;
      j.y += j.vy * dt;
      j.vy += 6 * dt;
    }
    dyn.jiskry = dyn.jiskry.filter((j) => j.vek < j.zivot);
    for (const k of dyn.kapky) {
      k.vy += 160 * dt;
      k.y += k.vy * dt;
    }
    dyn.kapky = dyn.kapky.filter((k) => k.y < HLADINA);
    dyn.vlny = dyn.vlny.filter((w) => t - w < 1.6);
    /* pohled: na misku, jinak na myš */
    const st = dyn.vypal ? stavVypalu(dyn.vypal, t) : null;
    let cil = [0, 0];
    const kam = st && st.miska ? [st.miska.O[0], st.miska.O[1] + 4] : vstup.mys ? [vstup.mys.x, vstup.mys.y] : null;
    if (kam) cil = [clamp((kam[0] - TVAR_STRED[0]) / 30, -1, 1) * 1.9, clamp((kam[1] - TVAR_STRED[1]) / 30, -1, 1) * 1.5];
    dyn.pohled = dyn.pohled.map((q, i) => q + (cil[i] - q) * (1 - Math.exp(-dt / 0.12)));
  };
  /** Kde je co během jednoho výpalu v čase t. */
  const stavVypalu = (v, t) => {
    const u = t - v.start;
    const { P, phi, g } = draha(u);
    const H = [P[0] - Math.cos(rad(phi)) * KLESTE, P[1] - Math.sin(rad(phi)) * KLESTE];
    const viditelna = u > 0.3 && u < 7.1;
    /* do sevření stojí miska v peci, pak jede s kleštěmi */
    const miskaSt = viditelna
      ? {
          k: v.k,
          O: pocatekMisky(v.k, u < 1.2 ? DRAHA[2].P : P),
          T: zarMisky(u),
          podHladinou: u > 3.0 && u < 5.3,
          lesk: u > 5.5 && u < 6.3 ? Math.sin(Math.PI * clamp((u - 5.5) / 0.8)) : 0,
        }
      : null;
    return { u, kleste: { P, H, g }, miska: miskaSt };
  };
  const stav = (t, vstup = {}, dyn) => {
    const d = dyn || novaDynamika();
    const v = d.vypal;
    const sv = v ? stavVypalu(v, t) : null;
    const u = sv ? sv.u : -1;
    const P = KLID.P;
    const kleste = sv ? sv.kleste : { P, H: [P[0] - Math.cos(rad(KLID.phi)) * KLESTE, P[1] - Math.sin(rad(KLID.phi)) * KLESTE], g: 0 };
    let oci = "kulate", usta = "usmev";
    if (sv) {
      if (u < 0.7) [oci, usta] = ["siroke", "o"];
      else if (u < 3.3) [oci, usta] = ["siroke", "rovna"];
      else if (u < 5.0) [oci, usta] = ["zavrene", "o"];
      else if (u < 7.4) [oci, usta] = ["smich", "ach"];
    }
    const o = sv ? dvere(u) : 0;
    const zablesk = sv && u > 3.3 && u < 4.2 ? 0.7 * (1 - (u - 3.3) / 0.9) : 0;
    const rada = d.rada.map((m) => ({ ...m, dy: 0 }));
    return {
      t, dvere: o, svetloDvere: o, zablesk, miska: sv ? sv.miska : null, kleste, oci, usta, vpredu: u > 5.6,
      pohled: d.pohled, mrk: mrkani(t, [1.4, 4.6, 4.85, 7.3], 9), para: d.para, jiskry: d.jiskry, kapky: d.kapky,
      vlny: d.vlny.map((w) => t - w), rada,
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
    hukot: (st) => clamp(0.12 + 0.75 * st.dvere + 0.2 * (st.miska ? st.miska.T : 0)),
    klidne: { t: 3.55 },
    vrstvy: [
      { id: "tus", kresli: vrstvaTus, tezka: true },
      { id: "kour", kresli: vrstvaKour, klic: (st) => Math.floor(st.t * 20) },
      { id: "postava", kresli: vrstvaPostava, tezka: true },
      { id: "dvere", kresli: vrstvaDvere, klic: (st) => (st.dvere > 0 ? snimek(st) : Math.floor(st.t * 8)) },
      { id: "tvar", kresli: vrstvaTvar, klic: (st) => `${f(st.pohled[0])},${f(st.pohled[1])},${f(st.mrk)},${st.oci},${st.usta},${f(st.svetloDvere)}` },
      { id: "kad-zadni", kresli: vrstvaKadZadni },
      { id: "voda", kresli: vrstvaVoda, klic: snimek },
      { id: "prace", kresli: vrstvaPrace(false), klic: snimek },
      { id: "kad", kresli: vrstvaKad },
      { id: "prace-vpredu", kresli: vrstvaPrace(true), klic: snimek },
      { id: "rada", kresli: vrstvaRada, klic: (st) => st.rada.map((m) => `${m.k}:${f(m.x)}:${f(m.op)}`).join() },
      { id: "para", kresli: vrstvaPara, klic: snimek },
      { id: "svetlo", kresli: vrstvaSvetlo, klic: snimek, styl: "mix-blend-mode:screen" },
      { id: "jiskry", kresli: vrstvaJiskry, klic: snimek },
    ],
  };
})();

/* ═══════════════════════════════════════════════════════════════════
 * 3 — PRSKAVKA NA VĚJÍŘI
 * Letní noc namalovaná na vějíř uchiwa, jak se v Edu tiskly obrázky
 * uchiwa-e: Mléčná dráha, světlušky, pod střechou skleněný zvonek fúrin
 * a na verandě engawa prasátko kajari-buta, ze kterého se kouří spirála
 * proti komárům. Pecinka drží senkó hanabi, japonskou prskavku z kroucené
 * papírové šňůrky v barvách loga.
 *
 * Prskavka hoří jako opravdová, ve fázích, které mají v Japonsku jména:
 * poupě (cubomi), pivoňka (botan), borové jehličí (macuba) — jiskry se
 * větví jako jehličí —, vrba (janagi) a nakonec padající chryzantéma
 * (čiri-giku). Kulička žhavé strusky visí na šňůrce jako kyvadlo. Ruka
 * jde za myší; kdo s ní cukne, kuličku setřese a Pecinka posmutní.
 * Kliknutím se zapálí nová.
 * ═══════════════════════════════════════════════════════════════════ */
const V3 = (() => {
  const C = [90, 80], RV = 70;
  const FIG = { x: 80, y: 131.5, s: 0.56 };
  const FIGT = `translate(${FIG.x} ${FIG.y}) scale(${FIG.s}) translate(-90 -159)`;
  const vPostave = (s) => `<g transform="${FIGT}">${s}</g>`;
  const naPanel = ([x, y]) => [FIG.x + (x - 90) * FIG.s, FIG.y + (y - 159) * FIG.s];
  const vOrezu = (s) => `<g clip-path="url(#v3-lic)">${s}</g>`;
  const RAMENO = naPanel(PEC.rameno.P);
  const RUKA0 = [117, 89];
  const DELKA = 27;
  const TVAR_STRED = naPanel([90, 82]);
  const ENGAWA = 129;
  const PRASE = [46, 121.4];
  const FURIN = [121, 23];
  const G = 260;

  const FAZE = [
    { od: 0, id: "zapal", r: 0, sv: 0.3 },
    { od: 1.0, id: "pupen", r: 1.8, sv: 0.34 },
    { od: 3.6, id: "botan", r: 7, sv: 0.58 },
    { od: 7.2, id: "macuba", r: 24, sv: 1 },
    { od: 13.2, id: "janagi", r: 12, sv: 0.74 },
    { od: 18.2, id: "ciri", r: 7, sv: 0.38 },
    { od: 22.4, id: "konec", r: 0, sv: 0 },
  ];
  const faze = (tau) => {
    let i = 0;
    while (i < FAZE.length - 1 && FAZE[i + 1].od <= tau) i++;
    return FAZE[i];
  };
  /** Síla světla s plynulými přechody mezi fázemi. */
  const svetloFaze = (tau) => {
    let i = 0;
    while (i < FAZE.length - 1 && FAZE[i + 1].od <= tau) i++;
    const A = FAZE[i], B = FAZE[Math.min(FAZE.length - 1, i + 1)];
    const k = B === A ? 0 : smooth((tau - (B.od - 0.8)) / 0.8);
    return lerp(A.sv, B.sv, k);
  };
  const polomerKulicky = (tau) => {
    if (tau < 0.35) return 0;
    if (tau < 1.0) return 1.75 * easeOut((tau - 0.35) / 0.65);
    if (tau < 18.2) return 1.75 + 0.18 * Math.sin(tau * 9);
    return lerp(1.75, 0.95, smooth((tau - 18.2) / 4.2));
  };

  /* ——— Statické kusy ——— */
  const hvezdy = (() => {
    const r = rng(1937);
    const H = [];
    for (let i = 0; i < 46; i++) H.push([22 + r() * 136, 22 + r() * 80, 0.25 + r() * 0.4, r()]);
    /* Mléčná dráha: hustý pás drobných hvězd šikmo přes nebe */
    for (let i = 0; i < 150; i++) {
      const s = r();
      const x = lerp(22, 162, s), y = lerp(34, 82, s) + (r() + r() + r() - 1.5) * 9;
      H.push([x, y, 0.18 + r() * 0.24, r()]);
    }
    return H;
  })();
  const vrstvaStin = () =>
    `<g filter="url(#v3-rozmaz)" fill="#3A2E28" opacity="0.22"><circle cx="${C[0] + 2.6}" cy="${C[1] + 3.6}" r="${RV}"/><rect x="88" y="150" width="9" height="31" rx="3"/></g>`;
  const vrstvaRukojet = () =>
    `<rect x="86.4" y="140" width="7.2" height="39" rx="3.2" fill="url(#v3-bambus)" stroke="#6E4E2A" stroke-width="0.7"/>` +
    `<path d="M86.6 161 H93.4 M86.6 171.6 H93.4" stroke="#6E4E2A" stroke-width="1"/>` +
    `<path d="M88.4 143 V177" stroke="#F0D9A8" stroke-width="0.7" opacity="0.7"/>`;
  const vrstvaNebe = () =>
    vOrezu(
      `<rect x="10" y="0" width="160" height="160" fill="url(#v3-nebe)"/>` +
        `<path d="M8 66 L172 26 L172 62 L8 102 Z" fill="url(#v3-draha)" opacity="0.55" filter="url(#v3-rozmaz-velky)"/>` +
        `<g fill="#F4EDD8">${hvezdy.map(([x, y, rr, j]) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rr)}" opacity="${f(0.45 + j * 0.55)}"/>`).join("")}</g>` +
        `<path d="M8 112 C26 100 40 104 56 97 C72 90 86 99 100 101 C116 103 132 93 150 95 C160 96 168 100 176 104 V160 H8 Z" fill="#2E2E66"/>` +
        `<path d="M8 120 C30 112 50 116 70 111 C92 106 112 116 132 113 C150 110 164 114 176 118 V160 H8 Z" fill="#1E1F48"/>` +
        /* střecha: okraj okapu a krokve */
        `<path d="M8 0 H176 V19 Q90 25 8 19 Z" fill="#1A1424"/>` +
        `<path d="M8 19 Q90 25 176 19" stroke="#4A3A44" stroke-width="1.6" fill="none"/>` +
        `<g fill="#2A2030">${[34, 54, 74, 94, 114, 134, 154].map((x) => `<rect x="${x - 2.4}" y="${f(19.6 + 3 * Math.sin((Math.PI * (x - 8)) / 168))}" width="4.8" height="3.4" rx="0.6"/>`).join("")}</g>`,
    );
  const vrstvaEngawa = () =>
    vOrezu(
      `<path d="M8 ${ENGAWA} H176 V${ENGAWA + 6} H8 Z" fill="#7A5E44"/>` +
        `<g stroke="#5A4230" stroke-width="0.6">${[ENGAWA + 1.6, ENGAWA + 3.4].map((y) => `<path d="M8 ${y} H176"/>`).join("")}</g>` +
        `<path d="M8 ${ENGAWA} H176" stroke="#A88A68" stroke-width="0.8"/>` +
        `<path d="M8 ${ENGAWA + 6} H176 V160 H8 Z" fill="#3E2C20"/>` +
        `<path d="M8 ${ENGAWA + 6} H176" stroke="#24180F" stroke-width="1.2"/>` +
        `<g stroke="#2A1E14" stroke-width="0.8">${[30, 70, 110, 150].map((x) => `<path d="M${x} ${ENGAWA + 6} V160"/>`).join("")}</g>`,
    );
  /* Prasátko kajari-buta: modrošedá glazura, místo čumáku velký otvor, v něm doutná spirála proti komárům */
  const vrstvaPrase = () => {
    const [x, y] = PRASE;
    return (
      `<ellipse cx="${x}" cy="${ENGAWA + 0.7}" rx="10.4" ry="1.5" fill="#120C08" opacity="0.55"/>` +
      `<g stroke="#2E3448" stroke-width="0.7" stroke-linejoin="round" stroke-linecap="round">` +
      `<path d="M${x - 9} ${y - 1.6} q-3 -1.2 -2.6 1.4 q0.6 2 2.4 0.6 q0.9 -0.8 0 -1.4" fill="none"/>` +
      `<path d="M${x - 6.4} ${y + 4.6} v3.4 h2.6 v-2.4 M${x + 2.4} ${y + 5.2} v2.8 h2.6 v-3.6" fill="#5E6A84"/>` +
      `<ellipse cx="${x}" cy="${y}" rx="9.4" ry="7.2" fill="url(#v3-prase)"/>` +
      `<path d="M${x + 1.6} ${y - 6.2} q0.4 -3.6 3 -3.2 q0.6 1.8 -0.4 3.6 Z M${x + 5.2} ${y - 5.2} q1.6 -3 3.8 -2 q-0.2 2 -1.8 3.4 Z" fill="#7C88A2"/>` +
      `<ellipse cx="${x + 8.8}" cy="${y + 0.4}" rx="3.2" ry="5.4" fill="#A8B4C8"/>` +
      `</g>` +
      `<ellipse cx="${x + 9.2}" cy="${y + 0.4}" rx="2.2" ry="4.3" fill="#14141C"/>` +
      `<circle cx="${x + 9.4}" cy="${y + 1.2}" r="2.2" fill="url(#v3-doutnak)"/>` +
      `<circle cx="${x + 9.4}" cy="${y + 1.2}" r="0.6" fill="#FF8A44"/>` +
      `<g fill="#2A2E40">${[[-4.4, -1.4], [-1.4, 1.6], [-4.8, 3], [-1.8, -3.6]].map(([dx, dy]) => `<circle cx="${x + dx}" cy="${y + dy}" r="0.65"/>`).join("")}</g>` +
      `<circle cx="${x + 4.4}" cy="${y - 2.2}" r="0.8" fill="#1A1C28"/>` +
      `<ellipse cx="${x + 4.2}" cy="${y + 1.2}" rx="1.4" ry="0.8" fill="#E89AA4" opacity="0.55"/>` +
      `<path d="M${x - 6.6} ${y - 3.6} q2 -2.2 5 -2.2" stroke="#D4DCEA" stroke-width="0.9" fill="none" opacity="0.7" stroke-linecap="round"/>`
    );
  };
  const vrstvaPostava = () =>
    vPostave(
      `<g filter="url(#v3-tah)">${pecGeta({ deska: "#B08A60", zub: "#7A5A3E", obrys: "#4A3424", linka: "#D2B080" })}${pecNohy({ noha: "#6A2A18", hanao: "#C4432B" })}` +
        `${pecTelo("v3", { obrys: "#4A1C0E", komin: "#843A24" })}` +
        `<rect x="62" y="93" width="56" height="35" rx="8" fill="#2A1612" fill-opacity="0.55"/>` +
        `<ellipse cx="90" cy="124" rx="22" ry="6" fill="#E8B440" opacity="0.2"/>${[[80, 12, 6, 1], [90, 16, 7, -1], [100, 11, 5.4, -1]].map(([x, L, W, c]) => `<path d="${jazyk({ B: [x, 127], th0: -Math.PI / 2, L, W, c, stoc: 1.5, t: 0.4, fz: x }).d}" fill="#E8A040" opacity="0.9"/><path d="${jazyk({ B: [x, 127], th0: -Math.PI / 2, L: L * 0.55, W: W * 0.55, c, stoc: 1.3, t: 0.4, fz: x }).d}" fill="#F6D27A"/>`).join("")}` +
        `${pecProvaz()}</g>` +
        pecShide([4, -3], { papir: "#EDE6D6", obrys: "#7A6E5E" }) +
        /* druhá ručka v bok */
        rucka(PEC.rameno.L, [36, 112], { tloustka: 6, barva: "#94422A", obrys: "#4A1C0E", ohyb: -1 }),
    );
  /* Papír vějíře: vlákna, prosvítající žebra a rumělkový lem */
  const vrstvaPapir = () =>
    vOrezu(
      `<rect x="10" y="0" width="160" height="160" filter="url(#v3-vlakna)" opacity="0.5"/>` +
        `<g stroke="#6E5638" stroke-width="0.35" opacity="0.15">${Array.from({ length: 41 }, (_, i) => {
          const a = rad(-180 + (i + 0.5) * (180 / 41));
          return `<path d="M90 150 L${f(90 + Math.cos(a) * 92)} ${f(150 + Math.sin(a) * 92)}"/>`;
        }).join("")}</g>`,
    );
  const vrstvaLem = () =>
    `<circle cx="${C[0]}" cy="${C[1]}" r="${RV}" fill="none" stroke="#9E3220" stroke-width="3.8"/>` +
    `<circle cx="${C[0]}" cy="${C[1]}" r="${RV}" fill="none" stroke="#C4432B" stroke-width="2.6"/>` +
    `<circle cx="${C[0]}" cy="${C[1]}" r="${RV - 1.9}" fill="none" stroke="#7A2A1A" stroke-width="0.4" opacity="0.6"/>` +
    `<path d="M81 150.4 Q90 141 99 150.4" fill="#C9A46A" stroke="#6E4E2A" stroke-width="0.7"/>` +
    `<g stroke="#6E4E2A" stroke-width="0.4">${[-6, -3, 0, 3, 6].map((o) => `<path d="M90 149.6 L${90 + o} 144.4"/>`).join("")}</g>`;

  /* ——— Živé kusy ——— */
  const vrstvaSvetlusky = (st) =>
    vOrezu(
      st.svetlusky
        .map(([x, y, op]) =>
          op < 0.04 ? "" : `<circle cx="${f(x)}" cy="${f(y)}" r="4" fill="url(#v3-svetluska)" opacity="${f(op)}"/><circle cx="${f(x)}" cy="${f(y)}" r="0.75" fill="#F4FFB8" opacity="${f(op)}"/>`,
        )
        .join(""),
    );
  const vrstvaDym = (st) => {
    const [x, y] = [PRASE[0] + 9.4, PRASE[1] + 1];
    const B = [];
    for (let i = 0; i <= 18; i++) {
      const s = i / 18;
      B.push([x + s * 3 + Math.sin(st.t * 0.9 + s * 6) * (1 + s * 6) + st.vitr * 18 * s * s, y - s * 52]);
    }
    return vOrezu(
      `<path d="${hladka(B)}" stroke="#B8B4C4" stroke-width="0.9" fill="none" opacity="0.5" stroke-linecap="round"/>` +
        `<path d="${hladka(B.slice(6).map(([a, b], i) => [a + 1.2 + Math.sin(st.t * 1.4 + i) * 0.8, b - 1]))}" stroke="#B8B4C4" stroke-width="0.5" fill="none" opacity="0.3"/>`,
    );
  };
  /* Fúrin: skleněný zvonek se srdíčkem a papírkem, houpe se ve větru */
  const vrstvaFurin = (st) => {
    const [x, y] = FURIN;
    const a = st.furin * 11;
    const b = st.furin * 26 + Math.sin(st.t * 2.1) * 3;
    return vOrezu(
      `<path d="M${x} 20.6 V${y + 2}" stroke="#E9DFC4" stroke-width="0.4"/>` +
        `<g transform="rotate(${f(a)} ${x} ${y + 2})">` +
        `<path d="M${x - 5.4} ${y + 10} Q${x - 5.6} ${y + 2.2} ${x} ${y + 2} Q${x + 5.6} ${y + 2.2} ${x + 5.4} ${y + 10} Z" fill="#CFE4F4" fill-opacity="0.55" stroke="#E8F2FA" stroke-width="0.5"/>` +
        `<path d="M${x - 3.4} ${y + 7} q1.6 -1.6 3.2 0 q1.6 1.6 3.2 0" stroke="#C4432B" stroke-width="0.8" fill="none"/>` +
        `<path d="M${x - 3.2} ${y + 4.2} q0.6 -1.2 1.8 -1.4" stroke="#FFFFFF" stroke-width="0.6" fill="none" opacity="0.8"/>` +
        `<g transform="rotate(${f(b - a)} ${x} ${y + 10})">` +
        `<path d="M${x} ${y + 10} V${y + 15.6}" stroke="#E9DFC4" stroke-width="0.35"/>` +
        `<rect x="${x - 2.1}" y="${y + 15.6}" width="4.2" height="11" rx="0.4" fill="#7A5E8E"/>` +
        `<rect x="${x - 2.1}" y="${y + 15.6}" width="4.2" height="11" rx="0.4" fill="url(#v3-tanzaku)" opacity="0.6"/>` +
        `</g></g>`,
    );
  };
  const kulickaSvg = (B, r, sv, t) =>
    `<circle cx="${f(B[0])}" cy="${f(B[1])}" r="${f(r * 1.25)}" fill="#C4432B"/>` +
    `<circle cx="${f(B[0])}" cy="${f(B[1])}" r="${f(r)}" fill="${zar(0.72 + 0.1 * sv + 0.05 * Math.sin(t * 31))}"/>` +
    `<circle cx="${f(B[0] - r * 0.25)}" cy="${f(B[1] - r * 0.3)}" r="${f(r * 0.45)}" fill="#FFF6DA"/>`;
  const vrstvaPrskavka = (st) => {
    const H = st.ruka, B = st.kulicka;
    let s = rucka(RAMENO, H, { tloustka: 3.4, barva: "#94422A", obrys: "#4A1C0E" });
    /* šňůrka: nahoře papír v barvách loga, dole ohořelá */
    const M = [(H[0] + B[0]) / 2 + (B[1] - H[1]) * 0.06, (H[1] + B[1]) / 2];
    const Pd = (u) => [lerp(lerp(H[0], M[0], u), lerp(M[0], B[0], u), u), lerp(lerp(H[1], M[1], u), lerp(M[1], B[1], u), u)];
    const papir = Array.from({ length: 9 }, (_, i) => Pd((i / 8) * st.papir));
    const ohorela = Array.from({ length: 6 }, (_, i) => Pd(st.papir + (i / 5) * (1 - st.papir)));
    s += `<path d="${cara(papir)}" stroke="#C0708A" stroke-width="1.3" stroke-linecap="round" fill="none"/>`;
    s += `<path d="${cara(papir)}" stroke="#4E4A84" stroke-width="1.3" stroke-dasharray="0.9 1.3" fill="none"/>`;
    s += `<path d="${cara(papir.slice(0, 3))}" stroke="#C4432B" stroke-width="1.4" stroke-dasharray="0.9 1.3" stroke-dashoffset="1" fill="none"/>`;
    s += `<path d="${cara(ohorela)}" stroke="#2A2224" stroke-width="0.75" stroke-linecap="round" fill="none"/>`;
    s += `<circle cx="${f(H[0])}" cy="${f(H[1])}" r="2.3" fill="#94422A" stroke="#4A1C0E" stroke-width="0.6"/>`;
    if (st.plamen > 0.01) {
      const { d } = jazyk({ B: [B[0], B[1] + 0.6], th0: -Math.PI / 2, L: 7 * st.plamen, W: 3.2 * st.plamen, c: 1, stoc: 1.2, t: st.t, w: 9, vlna: 0.6 });
      s += `<path d="${d}" fill="#F6C15A"/>`;
    }
    if (st.r > 0.05) s += kulickaSvg(B, st.r, st.sv, st.t);
    if (st.pada) s += kulickaSvg(st.pada, 1.4, 0.4, st.t);
    if (st.uhlik) s += `<ellipse cx="${f(st.uhlik.x)}" cy="${ENGAWA + 0.4}" rx="1.5" ry="0.7" fill="${zar(0.6 * st.uhlik.k)}" opacity="${f(st.uhlik.k)}"/>`;
    return s;
  };
  const vrstvaJiskry = (st) => {
    let s = "";
    for (const j of st.jiskry) {
      const op = clamp(1 - (j.vek - j.konec) / 0.1);
      if (op <= 0) continue;
      if (j.typ === "vrba") {
        const P = [];
        for (let i = 0; i <= 6; i++) {
          const tau = Math.max(0, j.vek - 0.14 + (i / 6) * 0.14);
          P.push([j.x + j.vx * tau, j.y + j.vy * tau + 0.5 * 120 * tau * tau]);
        }
        s += `<path d="${cara(P)}" stroke="#FFC060" stroke-width="0.7" stroke-linecap="round" fill="none" opacity="${f(op)}"/><circle cx="${f(P[6][0])}" cy="${f(P[6][1])}" r="0.5" fill="#FFF0C2" opacity="${f(op)}"/>`;
        continue;
      }
      let d = "";
      for (const [x1, y1, x2, y2, t0, t1] of j.seg) {
        if (j.vek < t0) continue;
        const k = clamp((j.vek - t0) / (t1 - t0 || 1));
        d += `M${f(x1)} ${f(y1)} L${f(lerp(x1, x2, k))} ${f(lerp(y1, y2, k))}`;
      }
      if (d)
        s +=
          `<g opacity="${f(op)}"><path d="${d}" stroke="#FF9A3A" stroke-width="1.6" stroke-linecap="round" fill="none" opacity="0.45"/>` +
          `<path d="${d}" stroke="#FFF2C8" stroke-width="0.5" stroke-linecap="round" fill="none"/></g>`;
    }
    return vOrezu(s);
  };
  const vrstvaSvetlo = (st) => {
    if (st.sv < 0.01 && !st.pada) return "";
    const B = st.pada || st.kulicka;
    const sv = st.pada ? 0.25 : st.sv;
    return vOrezu(
      `<circle cx="${f(B[0])}" cy="${f(B[1])}" r="${f(44 + 30 * sv)}" fill="url(#v3-svetlo)" opacity="${f(clamp(sv * (0.82 + 0.18 * st.mihot)))}"/>` +
        `<circle cx="${f(B[0])}" cy="${f(B[1])}" r="${f(9 + 6 * sv)}" fill="url(#v3-halo)" opacity="${f(clamp(0.5 + sv * 0.5))}"/>`,
    );
  };
  const vrstvaTvar = (st) =>
    vPostave(
      pecTvar("v3", {
        dx: st.pohled[0], dy: st.pohled[1], mrk: st.mrk, oci: st.oci, usta: st.usta, tvare: 0.2 + 0.5 * st.sv,
        odlesk: st.sv > 0.05 ? { barva: "#FFC860", sila: clamp(0.4 + st.sv * 0.6) } : null,
      }),
    );

  const defs = () =>
    pecDefs("v3", { svetla: "#A4563A", stred: "#843C26", tmava: "#5A2416" }) +
    `<clipPath id="v3-lic"><circle cx="${C[0]}" cy="${C[1]}" r="${RV}"/></clipPath>` +
    `<linearGradient id="v3-nebe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0C0F2A"/><stop offset="0.2" stop-color="#151A40"/><stop offset="0.5" stop-color="#232758"/><stop offset="0.7" stop-color="#3A3468"/><stop offset="0.82" stop-color="#4E4078"/></linearGradient>` +
    `<linearGradient id="v3-draha" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C8C8F0" stop-opacity="0"/><stop offset="0.5" stop-color="#D8D4F4" stop-opacity="0.5"/><stop offset="1" stop-color="#C8C8F0" stop-opacity="0"/></linearGradient>` +
    `<linearGradient id="v3-bambus" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#A88250"/><stop offset="0.4" stop-color="#D8B884"/><stop offset="1" stop-color="#9A7444"/></linearGradient>` +
    `<radialGradient id="v3-prase" cx="0.38" cy="0.3" r="0.8"><stop offset="0" stop-color="#A4B0C4"/><stop offset="0.6" stop-color="#7C88A2"/><stop offset="1" stop-color="#55607A"/></radialGradient><radialGradient id="v3-doutnak"><stop offset="0" stop-color="#FF8A44" stop-opacity="0.8"/><stop offset="1" stop-color="#FF8A44" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="v3-svetluska"><stop offset="0" stop-color="#E8F59A" stop-opacity="0.7"/><stop offset="1" stop-color="#E8F59A" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="v3-svetlo"><stop offset="0" stop-color="#FFB45A" stop-opacity="0.7"/><stop offset="0.35" stop-color="#E86A30" stop-opacity="0.26"/><stop offset="1" stop-color="#E86A30" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="v3-halo"><stop offset="0" stop-color="#FFF2C8" stop-opacity="0.9"/><stop offset="0.4" stop-color="#FFB04A" stop-opacity="0.45"/><stop offset="1" stop-color="#FFB04A" stop-opacity="0"/></radialGradient>` +
    `<pattern id="v3-tanzaku" width="2" height="2" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.35" fill="#F4EDD8"/></pattern>` +
    `<filter id="v3-rozmaz" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="2.4"/></filter>` +
    `<filter id="v3-rozmaz-velky" x="-20%" y="-40%" width="140%" height="180%"><feGaussianBlur stdDeviation="7"/></filter>` +
    `<filter id="v3-vlakna" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.7 0.05" numOctaves="2" seed="5"/><feColorMatrix type="matrix" values="0 0 0 0 0.96  0 0 0 0 0.92  0 0 0 0 0.84  0 0 0 0.9 -0.42"/></filter>` +
    `<filter id="v3-tah" x="-8%" y="-8%" width="116%" height="116%"><feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="4" result="vlna"/><feDisplacementMap in="SourceGraphic" in2="vlna" scale="2.2" xChannelSelector="R" yChannelSelector="G"/></filter>`;

  /* ——— Simulace ——— */
  const SVETLUSKY = Array.from({ length: 8 }, (_, i) => {
    const r = rng(300 + i);
    return { cx: 20 + r() * 140, cy: 92 + r() * 30, ax: 6 + r() * 10, ay: 3 + r() * 6, wx: 0.2 + r() * 0.3, wy: 0.3 + r() * 0.4, p: r() * 6, q: r() * 6, wb: 1.2 + r() * 1.4, b: r() * 6 };
  });
  const novaDynamika = () => ({
    zapal: 0.6, stav: "hori", konec: -10, smutek: -10, kyv: { phi: 0.05, om: 0 }, ruka: [...RUKA0], rukaV: [0, 0],
    jiskry: [], akum: 0, pada: null, uhlik: null, furin: 0, furinV: 0, vitr: 0, nahoda: rng(4321), zvuk: [], pohled: [0, 0], mysPred: null,
  });
  const vetev = (R, x, y, a, L, h, t0, out, rozptyl, kolik) => {
    const x2 = x + Math.cos(a) * L, y2 = y + Math.sin(a) * L + L * 0.08;
    const t1 = t0 + L / 190;
    out.push([x, y, x2, y2, t0, t1]);
    if (h > 0) {
      const n = kolik(R);
      for (let i = 0; i < n; i++) vetev(R, x2, y2, a + (R() - 0.5) * rozptyl, L * (0.4 + R() * 0.24), h - 1, t1, out, rozptyl, kolik);
    }
  };
  const novaJiskra = (dyn, R, f0, B) => {
    const a = R() * Math.PI * 2;
    if (f0.id === "janagi") {
      const v = 34 + R() * 34;
      const a2 = rad(lerp(-20, 200, R()));
      dyn.jiskry.push({ typ: "vrba", x: B[0], y: B[1], vx: Math.cos(a2) * v, vy: Math.sin(a2) * v * 0.6 - 6, vek: 0, konec: 0.5 + R() * 0.4 });
      return;
    }
    const seg = [];
    if (f0.id === "pupen") vetev(R, B[0], B[1], a, 2.4 + R() * 2, 0, 0, seg, 1, () => 0);
    else if (f0.id === "botan") vetev(R, B[0], B[1], a, 6 + R() * 5, 1, 0, seg, 1.1, () => 2);
    else if (f0.id === "macuba") vetev(R, B[0], B[1], a, 9 + R() * 9, 3, 0, seg, 1.5, (r) => (r() < 0.35 ? 3 : 2));
    else vetev(R, B[0], B[1], a, 2.2 + R() * 2.4, 1, 0, seg, 2, (r) => 3 + (r() < 0.5 ? 1 : 0));
    const konec = Math.max(...seg.map((q) => q[5])) + 0.04;
    dyn.jiskry.push({ typ: "jehla", seg, vek: 0, konec });
  };
  const pustit = (dyn, t, B, smutne) => {
    dyn.stav = "zhasla";
    dyn.konec = t;
    dyn.pada = { x: B[0], y: B[1], vx: dyn.kyv.om * DELKA * Math.cos(dyn.kyv.phi) * 0.6, vy: 0 };
    if (smutne) dyn.smutek = t;
  };
  const krok = (dyn, t, dt, vstup) => {
    const R = dyn.nahoda;
    /* ruka jde za myší, pružně — z jejího zrychlení se rozhoupe kulička */
    let cil = [...RUKA0];
    if (vstup.mys) cil = [RUKA0[0] + clamp((vstup.mys.x - 115) * 0.14, -10, 10), RUKA0[1] + clamp((vstup.mys.y - 100) * 0.12, -8, 8)];
    cil[1] += Math.sin(t * 1.3) * 0.5;
    const K = 90, D = 2 * Math.sqrt(K) * 0.85;
    const a = [0, 1].map((i) => K * (cil[i] - dyn.ruka[i]) - D * dyn.rukaV[i]);
    for (const i of [0, 1]) {
      dyn.rukaV[i] += a[i] * dt;
      dyn.ruka[i] += dyn.rukaV[i] * dt;
    }
    const k = dyn.kyv;
    const alfa = (-a[0] * Math.cos(k.phi) - (G - a[1]) * Math.sin(k.phi)) / DELKA - 0.9 * k.om;
    k.om += alfa * dt;
    k.phi += k.om * dt;
    const B = [dyn.ruka[0] + Math.sin(k.phi) * DELKA, dyn.ruka[1] + Math.cos(k.phi) * DELKA];
    /* vítr pro fúrin a kouř: z pohybu myši */
    let mv = 0;
    if (vstup.mys && dyn.mysPred) mv = (vstup.mys.x - dyn.mysPred.x) / Math.max(dt, 1 / 120);
    dyn.mysPred = vstup.mys ? { ...vstup.mys } : null;
    dyn.vitr += (clamp(mv / 400, -1, 1) - dyn.vitr) * (1 - Math.exp(-dt / 0.6));
    const fa = -14 * dyn.furin - 1.2 * dyn.furinV + dyn.vitr * 9 + Math.sin(t * 0.7) * 0.6;
    dyn.furinV += fa * dt;
    dyn.furin += dyn.furinV * dt;
    if (Math.abs(dyn.furinV) > 0.9 && R() < dt * 3) dyn.zvuk.push({ druh: "furin", sila: clamp(Math.abs(dyn.furinV) / 3), pan: 0.5 });
    /* zapálení */
    if (vstup.kliky && vstup.kliky.length) {
      vstup.kliky.length = 0;
      if (dyn.stav !== "hori") {
        dyn.stav = "hori";
        dyn.zapal = t;
        dyn.zvuk.push({ druh: "skrt", sila: 1, pan: 0.3 });
      } else {
        dyn.kyv.om += (R() - 0.5) * 1.2;
      }
    }
    if (dyn.stav === "zhasla" && t - dyn.konec > 4.2) {
      dyn.stav = "hori";
      dyn.zapal = t;
      dyn.zvuk.push({ druh: "skrt", sila: 0.8, pan: 0.3 });
    }
    if (dyn.stav === "hori") {
      const tau = t - dyn.zapal;
      const f0 = faze(tau);
      if (f0.id === "konec") pustit(dyn, t, B, false);
      else {
        /* cuknutí setřese kuličku: napětí ve šňůrce vyskočí nebo povolí */
        const napeti = -a[0] * Math.sin(k.phi) + (G - a[1]) * Math.cos(k.phi) + DELKA * k.om * k.om;
        if (tau > 1.2 && (napeti > G * 2.7 || napeti < G * 0.1)) {
          pustit(dyn, t, B, true);
          dyn.zvuk.push({ druh: "pss", sila: 0.6, pan: 0.3 });
        } else {
          dyn.akum += dt * f0.r * (0.7 + 0.6 * R());
          while (dyn.akum >= 1) {
            dyn.akum -= 1;
            novaJiskra(dyn, R, f0, B);
            if (R() < 0.85) dyn.zvuk.push({ druh: "jiskra", sila: f0.id === "macuba" ? 0.5 + R() * 0.5 : 0.2 + R() * 0.3, pan: clamp((B[0] - 90) / 70, -1, 1) });
          }
        }
      }
    }
    for (const j of dyn.jiskry) j.vek += dt;
    dyn.jiskry = dyn.jiskry.filter((j) => j.vek < j.konec + 0.1);
    if (dyn.pada) {
      dyn.pada.vy += G * dt;
      dyn.pada.x += dyn.pada.vx * dt;
      dyn.pada.y += dyn.pada.vy * dt;
      if (dyn.pada.y >= ENGAWA) {
        dyn.uhlik = { x: dyn.pada.x, t };
        dyn.pada = null;
        dyn.zvuk.push({ druh: "pss", sila: 0.35, pan: 0.3 });
      }
    }
    if (dyn.uhlik && t - dyn.uhlik.t > 3) dyn.uhlik = null;
    /* pohled: na kuličku, když hoří, jinak na myš */
    const kam = dyn.stav === "hori" ? B : dyn.pada ? [dyn.pada.x, dyn.pada.y] : vstup.mys ? [vstup.mys.x, vstup.mys.y] : null;
    let cp = [0, 0];
    if (kam) cp = [clamp((kam[0] - TVAR_STRED[0]) / 26, -1, 1) * 1.9, clamp((kam[1] - TVAR_STRED[1]) / 26, -1, 1) * 1.5];
    dyn.pohled = dyn.pohled.map((q, i) => q + (cp[i] - q) * (1 - Math.exp(-dt / 0.12)));
  };
  const stav = (t, vstup = {}, dyn) => {
    const d = dyn || novaDynamika();
    const hori = d.stav === "hori";
    const tau = t - d.zapal;
    const f0 = hori ? faze(tau) : null;
    const B = [d.ruka[0] + Math.sin(d.kyv.phi) * DELKA, d.ruka[1] + Math.cos(d.kyv.phi) * DELKA];
    const sv = hori ? svetloFaze(tau) : 0;
    let oci = "kulate", usta = "usmev";
    if (t - d.smutek < 2.6) usta = "smutek";
    else if (hori && f0.id === "macuba") [oci, usta] = ["siroke", "o"];
    else if (hori && (f0.id === "botan" || f0.id === "janagi")) oci = "siroke";
    else if (!hori && t - d.konec < 2.6) [oci, usta] = ["smich", "usmev"];
    return {
      t, ruka: d.ruka, kulicka: B, r: hori ? polomerKulicky(tau) : 0, sv, mihot: Math.sin(t * 23) * 0.5 + Math.sin(t * 37) * 0.5,
      papir: hori ? lerp(0.6, 0.72, clamp(tau / 22)) : 0.74, plamen: hori && tau < 1 ? Math.sin(Math.PI * clamp(tau / 1)) : 0,
      pada: d.pada ? [d.pada.x, d.pada.y] : null, uhlik: d.uhlik ? { x: d.uhlik.x, k: 1 - clamp((t - d.uhlik.t) / 3) } : null,
      jiskry: d.jiskry, pohled: d.pohled, mrk: mrkani(t, [2.6, 6.9, 7.15], 11), oci, usta, furin: d.furin, vitr: d.vitr,
      svetlusky: SVETLUSKY.map((s) => [s.cx + s.ax * Math.sin(t * s.wx + s.p), s.cy + s.ay * Math.sin(t * s.wy + s.q), smooth(Math.sin(t * s.wb + s.b) * 1.6 - 0.2) * (1 - sv * 0.6)]),
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
    klidne: { t: 10.4 },
    vrstvy: [
      { id: "stin", kresli: vrstvaStin, tezka: true },
      { id: "rukojet", kresli: vrstvaRukojet },
      { id: "nebe", kresli: vrstvaNebe, tezka: true },
      { id: "svetlusky", kresli: vrstvaSvetlusky, klic: (st) => Math.floor(st.t * 20) },
      { id: "furin", kresli: vrstvaFurin, klic: (st) => `${f(st.furin)},${Math.floor(st.t * 10)}` },
      { id: "engawa", kresli: vrstvaEngawa },
      { id: "dym", kresli: vrstvaDym, klic: (st) => Math.floor(st.t * 20) },
      { id: "prase", kresli: vrstvaPrase },
      { id: "postava", kresli: vrstvaPostava, tezka: true },
      { id: "tvar", kresli: vrstvaTvar, klic: (st) => `${f(st.pohled[0])},${f(st.pohled[1])},${f(st.mrk)},${st.oci},${st.usta},${f(st.sv)}` },
      { id: "prskavka", kresli: vrstvaPrskavka, klic: snimek },
      { id: "svetlo", kresli: vrstvaSvetlo, klic: snimek, styl: "mix-blend-mode:screen" },
      { id: "jiskry", kresli: vrstvaJiskry, klic: snimek, styl: "mix-blend-mode:screen" },
      { id: "papir", kresli: vrstvaPapir, tezka: true, styl: "mix-blend-mode:multiply" },
      { id: "lem", kresli: vrstvaLem },
    ],
  };
})();

/* ═══════════════════════════════════════════════════════════════════
 * LAMPION — Pecinka jde s čóčinem
 * Stará podoba z Domku 2, kde parta chodí večer po chodníku
 * s lucerničkami na tyčkách, tady přehnaně. Bez pozadí: Pecinka chodí,
 * takže cestu jí dělá stránka, kam ji kdo postaví — v průvodu ji po
 * chodníku posouvá CSS jako na Domku 2, sama jen kráčí na místě.
 * Je natočená trochu z boku, ke směru chůze: vidíme čelo s tvářičkou
 * a dvířky a vlevo od něj její pravý bok.
 *
 * Chůze na geta: karan… koron. Tělo se s každým krokem zhoupne
 * a zakolébá, ručka na boku mává a druhá drží bambusovou tyč s papírovou
 * lucernou čóčin — vpředu štětcem 火, vzadu sakura ze značky v kruhu jako
 * rodový erb kamon. Lucerna se od kroků houpe jako kyvadlo a pomalu se
 * točí na háčku, kolem krouží můry a pod geta se práší. Prach zůstává
 * na cestě, a tak ujíždí dozadu — podle něj je vidět, že jde.
 *
 * Myš: Pecinka zvedne lucernu tam, kam ukazuje, a kouká na ni. Kdo s ní
 * zatřese, svíčka zhasne a Pecinka ji zapálí jiskrou z vlastního komína.
 * Kliknutí lucernu probudí: stoletá lucerna se podle pověsti stane
 * čóčin-obake, otevře oko, roztrhne papír do úsměvu a vyplázne jazyk po
 * nejbližší můře.
 * ═══════════════════════════════════════════════════════════════════ */
const VL = (() => {
  const deg = (r) => (r * 180) / Math.PI;

  /* ——— Natočení o 38° ke směru chůze ———
     Čelo je čelní kresba zúžená na cos 38° a posunutá doprava (PRED),
     vlevo od něj je vidět pravý bok. Souřadnice postavy 0–180 jako
     u ostatních podob, nohy dopadají na y 159. */
  const COS = 0.788, SIN = 0.616;
  const PRED = `translate(37.6 0) scale(${COS} 1)`;
  const TELO = { x: 43.4, y: 53, w: 100.6, h: 85, rx: 19 };
  const HRANA = 73;
  const KOMIN = { x: 100, y: 35, w: 20, h: 26, rx: 5.5 };
  const obdelnikD = ({ x, y, w, h, rx }) =>
    `M${x + rx} ${y} H${x + w - rx} A${rx} ${rx} 0 0 1 ${x + w} ${y + rx} V${y + h - rx} A${rx} ${rx} 0 0 1 ${x + w - rx} ${y + h} H${x + rx} A${rx} ${rx} 0 0 1 ${x} ${y + h - rx} V${y + rx} A${rx} ${rx} 0 0 1 ${x + rx} ${y} Z`;
  const TELO_D = obdelnikD(TELO);
  const KOMIN_D = obdelnikD(KOMIN);
  const PROVAZ_BOK = "M74 63.4 Q60 66 43 61.8";
  const RUKA = [157, 99];
  const RAMENO = [140, 104];
  const RAMENO_BOK = [57, 100];

  /* ——— Postava v panelu: nohy na zemi v (FIG.x, FIG.y), lucerna vpravo před ní ——— */
  const FIG = { x: 56, y: 150, s: 0.76 };
  const FIGT = `translate(${FIG.x} ${FIG.y}) scale(${FIG.s}) translate(-90 -159)`;
  const vPostave = (s) => `<g transform="${FIGT}">${s}</g>`;
  const doPostavy = ([x, y]) => [90 + (x - FIG.x) / FIG.s, 159 + (y - FIG.y) / FIG.s];
  const zPostavy = ([x, y]) => [FIG.x + (x - 90) * FIG.s, FIG.y + (y - 159) * FIG.s];

  /* ——— Chůze ——— */
  const KROK_T = 1.12;
  const KROK = 17;
  const OPORA = 0.56;
  const NOHY = [{ x: -20, faze: 0, blizko: true }, { x: 20, faze: 0.5, blizko: false }];
  /** Jak rychle ujíždí cesta pod nohama (v panelu za sekundu) — tak rychle by ji měl posouvat průvod */
  const RYCHLOST = ((2 * KROK * SIN) / (OPORA * KROK_T)) * FIG.s;
  const faze = (t) => (((t / KROK_T) % 1) + 1) % 1;
  /** Tělo jde dvakrát za krok nahoru a kolébá se k noze, na které stojí */
  const chuze = (fi) => ({ fi, zved: 2.2 * Math.pow(Math.sin(2 * Math.PI * fi), 2), kyv: -2.6 * Math.sin(2 * Math.PI * fi) });
  /** Bod přilepený k tělu → panel, i s houpáním a kolébáním (stejně jako posun vrstev těla) */
  const naTelo = ([x, y], ch) => {
    const u = rad(ch.kyv), dx = (x - 90) * FIG.s, dy = (y - 159) * FIG.s;
    return [FIG.x + dx * Math.cos(u) - dy * Math.sin(u), FIG.y + dx * Math.sin(u) + dy * Math.cos(u) - ch.zved * FIG.s];
  };
  const posunTela = (st) => ({ dx: 0, dy: -st.ch.zved * FIG.s, rot: st.ch.kyv, ox: FIG.x, oy: FIG.y });
  /** Noha: na zemi jede dozadu (chůze na místě), ve vzduchu se zvedne, přenese dopředu a geta se překlopí z paty na špičku */
  const noha = (n, fi) => {
    const u = (((fi - n.faze) % 1) + 1) % 1;
    let z, zved = 0, nakl = 0;
    if (u < OPORA) z = lerp(KROK, -KROK, u / OPORA);
    else {
      const k = (u - OPORA) / (1 - OPORA);
      z = lerp(-KROK, KROK, smooth(k));
      zved = 8 * Math.sin(Math.PI * k);
      nakl = 13 * Math.sin(2 * Math.PI * k) * (k < 0.5 ? 1 : 0.7);
    }
    return { X: 90 + n.x * COS + z * SIN, Y: 159 - zved + (n.blizko ? 1.2 : -1.2), zved, nakl };
  };

  /* ——— Lucerna v místních souřadnicích: háček v počátku, osa dolů ——— */
  const LAMP = { hak: 3.4, kruh: [3.4, 7.4], telo: [7.4, 32.6], dno: [32.6, 36], r0: 7.6, r1: 11.8, stred: 20 };
  const LS = 1.25;
  const ZAVES = LAMP.stred * LS;
  const TYC = 50;
  const UHEL0 = -50;
  const G = 260;
  const polomer = (v) => LAMP.r0 + (LAMP.r1 - LAMP.r0) * Math.pow(Math.sin(Math.PI * clamp(v)), 0.7);
  const vyskaNaV = (y) => (y - LAMP.telo[0]) / (LAMP.telo[1] - LAMP.telo[0]);
  const TELO_L = (() => {
    const P = [], Q = [];
    for (let i = 0; i <= 16; i++) {
      const v = i / 16, y = lerp(LAMP.telo[0], LAMP.telo[1], v), w = polomer(v);
      P.push([w, y]);
      Q.push([-w, y]);
    }
    return `${cara([...P, ...Q.reverse()])} Z`;
  })();
  /* Bambusová žebra higo: kroužky, které při pohledu shora trochu prohnou dolů */
  const ZEBRA = (() => {
    let d = "";
    for (let i = 1; i < 12; i++) {
      const v = i / 12, y = lerp(LAMP.telo[0], LAMP.telo[1], v), w = polomer(v), b = w * 0.14;
      d += `M${f(-w)} ${f(y)} Q0 ${f(y + 2 * b)} ${f(w)} ${f(y)} `;
    }
    return d;
  })();
  /** Z místních souřadnic lucerny do panelu: háček na špičce T, lucerna vychýlená o th */
  const svet = (T, th, [x, y]) => [T[0] + (x * Math.cos(th) + y * Math.sin(th)) * LS, T[1] + (-x * Math.sin(th) + y * Math.cos(th)) * LS];

  /* 火 štětcem: dvě čárky nahoře, dlouhý tah doleva a rozmáchnutý doprava */
  const KANJI = (() => {
    const tahy = [
      [[[-5.8, -4.1], [-5.2, -2.7], [-4.4, -1.3], [-3.9, -0.5]], (s) => 0.7 + 1.7 * Math.sin(Math.PI * Math.pow(s, 0.75))],
      [[[5.7, -4.7], [5.1, -3.1], [4.2, -1.7], [3.4, -0.7]], (s) => 0.35 + 1.55 * (1 - s * 0.7)],
      [[[0.2, -7.6], [0.35, -5], [0.3, -2.2], [-0.4, 0.6], [-1.8, 3], [-3.8, 5], [-6.7, 6.9]], (s) => 0.25 + 2.1 * Math.pow(1 - s, 0.7)],
      [[[0.2, 0.6], [1.6, 2.4], [3.4, 4.2], [5.4, 5.6], [7.5, 6.6]], (s) => 0.6 + 2.5 * Math.pow(s, 1.3) * (s < 0.86 ? 1 : 1 - ((s - 0.86) / 0.14) * 0.75)],
    ];
    return `<g fill="#1E120C" transform="scale(0.84)">${tahy.map(([B, w]) => `<path d="${pasPoBodech(B, w)}"/>`).join("")}</g>`;
  })();
  /* Na zadní straně erb: sakura ze značky v kruhu (maru ni sakura) */
  const PLATEK = "M0 0 C-2.5 -1.5 -4.1 -3.9 -4.2 -6.6 C-4.3 -9.4 -3.1 -11.5 -1.9 -12.6 L0 -9.5 L1.9 -12.6 C3.1 -11.5 4.3 -9.4 4.2 -6.6 C4.1 -3.9 2.5 -1.5 0 0 Z";
  const KAMON =
    `<circle r="6.7" fill="none" stroke="#A8301C" stroke-width="1.1"/>` +
    `<g fill="#B83A22" transform="scale(0.43)">${[0, 72, 144, 216, 288].map((u) => `<path d="${PLATEK}" transform="rotate(${u}) translate(0 -1.7)"/>`).join("")}</g>` +
    `<circle r="1.1" fill="#F2C86A"/>`;
  /* Můra zepředu: přední a zadní křídlo, druhá půlka je zrcadlo */
  const KRIDLO_D = "M0 -0.4 C-1.3 -2.7 -4.3 -2.9 -4.6 -1.1 C-4.8 0.2 -3.2 0.7 -1.2 0.3 C-2.6 1 -3 2.6 -1.6 2.9 C-0.6 3.1 -0.1 1.9 0 1 Z";
  const kridla = `<path d="${KRIDLO_D}"/><path d="${KRIDLO_D}" transform="scale(-1 1)"/>`;

  /* ——— Cesta: stín, světlo lucerny a prach. Nic víc — pozadí si nese stránka. ——— */
  const vrstvaZem = (st) => {
    const S = clamp(st.S, 0, 1.4);
    const lx = st.L[0];
    const zem = FIG.y + 0.6;
    let s = `<ellipse cx="${f(FIG.x + 2 - (lx - FIG.x) * 0.16 * clamp(S))}" cy="${f(zem)}" rx="${f(37 + 6 * clamp(S))}" ry="4.4" fill="url(#pcl-stin)"/>`;
    s += `<ellipse cx="${FIG.x + 3}" cy="${f(zem - 0.3)}" rx="27" ry="2.6" fill="#2B2420" opacity="0.15"/>`;
    if (S > 0.02) s += `<ellipse cx="${f(lx)}" cy="${f(zem + 0.4)}" rx="33" ry="5.6" fill="url(#pcl-kaluz)" opacity="${f(clamp(S))}"/>`;
    /* prach od geta se rozletí do stran */
    for (const p of st.prach) {
      const r = rng(p.seed);
      let g = "";
      for (let i = 0; i < 5; i++) g += `<circle cx="${f(p.x + (i % 2 ? 1 : -1) * (0.6 + r() * 1.3) * p.r)}" cy="${f(p.y - r() * p.r * 0.7)}" r="${f(p.r * (0.38 + r() * 0.35))}"/>`;
      s += `<g fill="#A8957A" opacity="${f(p.op)}">${g}</g>`;
    }
    return s;
  };

  /* ——— Nohy na geta, z boku: deska s horní hranou, dva zuby, nožka a páska hanao ——— */
  const getaSvg = (p, daleko) =>
    `<g transform="translate(${f(p.X)} ${f(p.Y)}) rotate(${f(p.nakl)}) scale(${daleko ? 0.8 : 0.86} 0.92)">` +
    `<path d="M-11.4 -7.4 H-6.8 V-0.2 H-11.4 Z M6.8 -7.4 H11.4 V-0.2 H6.8 Z" fill="#8C6444" stroke="#6B5D4F" stroke-width="0.9" stroke-linejoin="round"/>` +
    `<rect x="-15.5" y="-13.6" width="31" height="6.6" rx="1.5" fill="#C99A68" stroke="#6B5D4F" stroke-width="1.1"/>` +
    `<path d="M-14 -11.8 H14" stroke="#E2BE8C" stroke-width="0.9" stroke-linecap="round"/>` +
    `<ellipse cx="0.6" cy="-17.6" rx="10.2" ry="5.2" fill="${daleko ? "#7E2E18" : "#97391F"}"/>` +
    `<path d="M9.4 -13.8 Q1.6 -23.6 -7.4 -13.8" stroke="${daleko ? "#A8382A" : "#C4432B"}" stroke-width="2.2" stroke-linecap="round" fill="none"/>` +
    `</g>`;
  const vrstvaNohy = (st) => {
    /* nožky schované pod tělem, ať mezi tělem a nohou nikdy není mezera */
    let s = st.nohy.map((p, i) => `<rect x="${f(p.X - 5.6)}" y="${f(124 - st.ch.zved)}" width="11.2" height="${f(Math.max(4, p.Y - 17.6 - (124 - st.ch.zved)))}" rx="4" fill="${NOHY[i].blizko ? "#97391F" : "#7E2E18"}"/>`).join("");
    s += getaSvg(st.nohy[1], true) + getaSvg(st.nohy[0], false);
    return vPostave(s);
  };

  /* ——— Tělo natočené z boku: kreslí se jednou, chůzi mu dává posun vrstvy ——— */
  const provaz = (d) =>
    `<path d="${d}" stroke="#C9B186" stroke-width="6.5" stroke-linecap="round" fill="none"/>` +
    `<path d="${d}" stroke="#EBDDB8" stroke-width="5" stroke-linecap="round" fill="none"/>` +
    `<path d="${d}" stroke="#C9B186" stroke-width="5" stroke-dasharray="1.6 4.4" fill="none"/>`;
  const vrstvaTelo = () =>
    vPostave(
      `<g filter="url(#pcl-tah)">` +
        `<path d="${KOMIN_D}" fill="url(#pcl-komin)" stroke="#7E2F18" stroke-width="1.3"/>` +
        `<path d="M${KOMIN.x + 0.8} ${KOMIN.y + 4.6} H${KOMIN.x + KOMIN.w - 0.8}" stroke="#7E2F18" stroke-width="0.8" opacity="0.6"/>` +
        `<path d="${TELO_D}" fill="url(#pcl-telo34)"/>` +
        `<path d="${TELO_D}" fill="url(#pcl-bok-g)" clip-path="url(#pcl-bok)"/>` +
        `<rect x="${HRANA - 5}" y="${TELO.y}" width="10" height="${TELO.h}" fill="url(#pcl-hrana)" clip-path="url(#pcl-telo-orez)"/>` +
        `<path d="${TELO_D}" fill="none" stroke="#7E2F18" stroke-width="1.6"/>` +
        `<g transform="${PRED}"><rect x="62" y="93" width="56" height="35" rx="8" fill="#3A2E28" fill-opacity="0.42"/></g>` +
        provaz(PROVAZ_BOK) +
        `<g transform="${PRED}">${provaz(PEC.provaz)}</g>` +
        `</g>`,
    );
  /* Ve dvířkách hoří vlastní ohýnek. Když lucerna zhasne, rozfouká ho, než pošle jiskru. */
  const vrstvaDvirka = (st) => {
    const I = st.vyhen;
    let s = `<rect x="62" y="93" width="56" height="35" rx="8" fill="url(#pcl-vyhen)" opacity="${f(clamp(0.38 + 0.35 * I))}"/>`;
    for (const [barva, kk, W] of [["#C4432B", 1, 7.4], ["#F29A3B", 0.68, 5], ["#FBE3A0", 0.4, 3]]) {
      let g = "";
      [76, 84, 91, 98, 105].forEach((x, i) => {
        const L = (7.5 + (i % 2 ? 2.4 : 0) + (i === 2 ? 4 : 0)) * kk * (0.62 + 0.4 * I) * (1 + 0.14 * Math.sin(st.t * (5 + i) + i * 2));
        g += `<path d="${jazyk({ B: [x, 128.6], th0: -Math.PI / 2, L, W, c: i < 2 ? 1 : i > 2 ? -1 : 1, stoc: 1.6, t: st.t, w: 5 + i * 0.6, fz: i * 1.7, vitr: -0.35, vlna: 0.4 }).d}"/>`;
      });
      s += `<g fill="${barva}">${g}</g>`;
    }
    return vPostave(`<g transform="${PRED}"><g clip-path="url(#pcl-dvirka)">${s}</g><rect x="62" y="93" width="56" height="35" rx="8" fill="none" stroke="#7E2F18" stroke-width="1.1"/></g>`);
  };
  /* Lucerna svítí na čelo, bok zůstává ve stínu */
  const vrstvaSvit = (st) => {
    const S = clamp(st.S, 0, 1.4);
    if (S < 0.02) return "";
    const [cx, cy] = doPostavy(st.L);
    return vPostave(
      `<defs><radialGradient id="pcl-svit-g" gradientUnits="userSpaceOnUse" cx="${f(cx)}" cy="${f(cy + st.ch.zved)}" r="118">` +
        `<stop offset="0" stop-color="#FFC27A" stop-opacity="${f(clamp(0.7 * S))}"/><stop offset="0.45" stop-color="#F08A44" stop-opacity="${f(clamp(0.28 * S))}"/><stop offset="1" stop-color="#F08A44" stop-opacity="0"/></radialGradient></defs>` +
        `<g clip-path="url(#pcl-cela)" fill="url(#pcl-svit-g)"><path d="${TELO_D}"/><path d="${KOMIN_D}"/></g>`,
    );
  };
  const vrstvaTvar = (st) =>
    vPostave(
      `<g transform="${PRED}">${pecTvar("pcl", {
        dx: st.pohled[0], dy: st.pohled[1], mrk: st.mrk, oci: st.oci, usta: st.usta, tvare: 0.3 + 0.3 * clamp(st.S),
        odlesk: st.S > 0.08 ? { barva: "#FFC86A", sila: clamp(0.3 + 0.55 * st.S) } : null,
      })}</g>`,
    );
  /* Papírky shide vlají dozadu, jak jde, a poskakují s každým krokem */
  const vrstvaShide = (st) =>
    vPostave(
      `<g transform="${PRED}">${pecShide([st.shide[0], st.shide[1]])}</g>` +
        `<path d="${SHIDE_D}" transform="translate(57.5 64.8) scale(${SIN} 1) rotate(${f(st.shide[2])})" fill="#F1EBDF" stroke="#8A7A69" stroke-width="0.7" stroke-linejoin="round"/>`,
    );
  /* Ručka na boku mává proti blízké noze */
  const vrstvaRukaBok = (st) => {
    const psi = 0.25 - 0.75 * Math.cos(2 * Math.PI * st.ch.fi);
    const H = [RAMENO_BOK[0] + 17 * Math.sin(psi), RAMENO_BOK[1] + 15 * Math.cos(psi)];
    return vPostave(rucka(RAMENO_BOK, H, { tloustka: 6, barva: "#B04A2E", obrys: "#7E2F18", ohyb: 0.4 }) + `<circle cx="${f(H[0] - 1.2)}" cy="${f(H[1] - 1.4)}" r="1.4" fill="#E08A62" opacity="0.6"/>`);
  };
  const vrstvaKomin = (st) => {
    const [kx, ky] = naTelo([110, 34], st.ch);
    let s = "";
    for (let i = 0; i < 5; i++) {
      const u = (((st.t * 0.12 + i / 5) % 1) + 1) % 1;
      /* kouř zůstává ve vzduchu, Pecinka mu odchází: unáší ho dozadu */
      const x = kx + Math.sin(u * 4.4 + i) * 2 * u - u * RYCHLOST * 3.4, y = ky - 1.5 - u * 40;
      s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(2.4 + u * 7.5)}" fill="url(#pcl-kour)" opacity="${f(0.45 * (1 - u) * smooth(u * 5))}"/>`;
    }
    if (st.kominPlamen > 0.01) {
      for (const [barva, kk, W] of [["#9A2716", 1, 6.4], ["#E0582E", 0.74, 4.6], ["#F6C15A", 0.48, 3], ["#FFF3CF", 0.24, 1.7]]) {
        s += `<path d="${jazyk({ B: [kx, ky + 1.2], th0: -Math.PI / 2, L: 15 * st.kominPlamen * kk, W: W * (0.8 + 0.3 * st.kominPlamen), c: -1, stoc: 1.5, stoupani: 0.9, t: st.t, w: 7, fz: 1.3, vitr: -0.5, vlna: 0.5 }).d}" fill="${barva}"/>`;
      }
    }
    return s;
  };

  /* ——— Tyč, lucerna a všechno kolem ní (v panelu) ——— */
  const tycSvg = (st) => {
    const { H, T } = st;
    const d = [T[0] - H[0], T[1] - H[1]];
    const n = Math.hypot(d[0], d[1]) || 1;
    const u = [d[0] / n, d[1] / n];
    const B0 = [H[0] - u[0] * 20, H[1] - u[1] * 20];
    const sag = 1.2 + st.ohyb * 0.5;
    const M = [H[0] + d[0] * 0.5 - u[1] * sag, H[1] + d[1] * 0.5 + u[0] * sag];
    const c = `M${pt(B0)} L${pt(H)} Q${pt(M)} ${pt(T)}`;
    const bod = (q) => [lerp(lerp(H[0], M[0], q), lerp(M[0], T[0], q), q), lerp(lerp(H[1], M[1], q), lerp(M[1], T[1], q), q)];
    const kolinka = [0.3, 0.62, 0.92]
      .map((q) => {
        const p = bod(q);
        return `<path d="M${pt([p[0] - u[1] * 1.1, p[1] + u[0] * 1.1])} L${pt([p[0] + u[1] * 1.1, p[1] - u[0] * 1.1])}"/>`;
      })
      .join("");
    return (
      `<path d="${c}" stroke="#4A361E" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>` +
      `<path d="${c}" stroke="#B08A52" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>` +
      `<path d="${c}" stroke="#E8CE98" stroke-width="0.45" stroke-linecap="round" fill="none" opacity="0.7" transform="translate(${f(u[1] * 0.4)} ${f(-u[0] * 0.4)})"/>` +
      `<g stroke="#6E5230" stroke-width="0.7" stroke-linecap="round">${kolinka}</g>`
    );
  };
  const znaky = (st) => {
    let s = "";
    const inkoust = clamp(0.3 + 0.65 * clamp(st.S)) * (1 - 0.75 * st.obakeTvar);
    for (const [uhel, kresba] of [[0, KANJI], [Math.PI, KAMON]]) {
      const a = st.phi + uhel;
      const c = Math.cos(a);
      if (c < 0.06) continue;
      s += `<g transform="translate(${f(Math.sin(a) * 9.6)} 19.6) scale(${f(c)} 1)" opacity="${f(inkoust * clamp(c * 1.8))}">${kresba}</g>`;
    }
    return s;
  };
  /* Čóčin-obake: oko a roztržená ústa s cáry papíru */
  const obakeTvar = (st) => {
    const o = st.obake;
    if (!o) return "";
    let s = "";
    if (o.usta > 0.01) {
      const y0 = 24.6, w = polomer(vyskaNaV(y0)) - 1.4, h = 6.6 * o.usta;
      s += `<path d="M${f(-w)} ${y0} Q0 ${f(y0 - 1.6)} ${f(w)} ${y0} Q${f(w * 0.55)} ${f(y0 + h * 1.25)} 0 ${f(y0 + h * 1.3)} Q${f(-w * 0.55)} ${f(y0 + h * 1.25)} ${f(-w)} ${y0} Z" fill="url(#pcl-usta)" stroke="#4A1208" stroke-width="0.5" stroke-linejoin="round"/>`;
      let zuby = "";
      for (let i = -3; i <= 3; i++) {
        const x = (i * w) / 3.8, k = 1 - (x / w) ** 2;
        const yh = y0 - 0.8 * k, yd = y0 + h * 1.28 * k;
        zuby += `M${f(x - 1)} ${f(yh)} L${f(x)} ${f(yh + 1.7 * o.usta)} L${f(x + 1)} ${f(yh)} Z `;
        if (Math.abs(i) < 3) zuby += `M${f(x - 0.9)} ${f(yd)} L${f(x + 0.3)} ${f(yd - 1.5 * o.usta)} L${f(x + 1)} ${f(yd)} Z `;
      }
      s += `<path d="${zuby}" fill="#F2A55A" stroke="#4A1208" stroke-width="0.3" stroke-linejoin="round"/>`;
    }
    if (o.oko > 0.01) {
      const E = [-0.4, 15.4], rx = 4.8, ry = 3.4 * o.oko;
      const r = rng(5);
      const B = Array.from({ length: 18 }, (_, i) => {
        const a = (i / 18) * Math.PI * 2, k = 1.22 + (i % 2 ? 0.16 : -0.05) + r() * 0.1;
        return [E[0] + Math.cos(a) * rx * k, E[1] + Math.sin(a) * ry * k];
      });
      s += `<path d="${cara(B)} Z" fill="#4A1208"/>`;
      s += `<ellipse cx="${E[0]}" cy="${E[1]}" rx="${rx}" ry="${f(ry)}" fill="#FFF6E2"/>`;
      const [px, py] = o.pohled;
      s += `<ellipse cx="${f(E[0] + px)}" cy="${f(E[1] + py * o.oko)}" rx="2.2" ry="${f(Math.min(2.2, ry * 0.85))}" fill="#2A160E"/>`;
      s += `<ellipse cx="${f(E[0] + px)}" cy="${f(E[1] + py * o.oko)}" rx="1.05" ry="${f(Math.min(1.05, ry * 0.5))}" fill="#050302"/>`;
      if (o.oko > 0.6) s += `<circle cx="${f(E[0] + px - 0.7)}" cy="${f(E[1] + py - 0.8)}" r="0.55" fill="#FFFFFF"/>`;
    }
    return s;
  };
  const lucerna = (st) => {
    const sv = clamp(st.S);
    const bloom = Math.max(0, st.S - 1);
    const barvy = ["#FFF6D8", "#FFD27A", "#F4963E", "#C85A2A"].map((c) => mix(mix("#5A4A3E", c, sv), "#FFFFFF", bloom * 0.35));
    let s = `<defs><radialGradient id="pcl-papir" cx="0.5" cy="0.56" r="0.62">${[0, 0.35, 0.75, 1].map((o, i) => `<stop offset="${o}" stop-color="${barvy[i]}"/>`).join("")}</radialGradient></defs>`;
    s += `<path d="M0 -0.6 V${LAMP.hak}" stroke="#2A2420" stroke-width="0.8"/><circle cx="0" cy="-1.3" r="1" fill="none" stroke="#2A2420" stroke-width="0.6"/>`;
    s += `<path d="${TELO_L}" fill="url(#pcl-papir)"/>`;
    s += `<g clip-path="url(#pcl-telo-lamp)">`;
    /* plamínek svíčky prosvítá papírem; kývá se a při chůzi se kloní dozadu */
    if (sv > 0.02) {
      s += `<ellipse cx="${f(st.svicka)}" cy="22.6" rx="${f(3.3 + st.mihot * 0.6)}" ry="${f(5.4 + st.mihot)}" fill="#FFFBEA" opacity="${f(0.45 * sv)}"/>`;
      s += `<ellipse cx="${f(st.svicka * 1.3)}" cy="21.6" rx="1.3" ry="2.6" fill="#FFFFFF" opacity="${f(0.4 * sv)}"/>`;
    }
    s += znaky(st);
    s += `<path d="${ZEBRA}" fill="none" stroke="${mix("#3A2E26", "#B4602E", sv)}" stroke-width="0.42" opacity="0.7"/>`;
    s += `<path d="${TELO_L}" fill="url(#pcl-papir-boky)"/><path d="${TELO_L}" fill="url(#pcl-papir-konce)"/>`;
    s += obakeTvar(st);
    s += `</g>`;
    s += `<path d="${TELO_L}" fill="none" stroke="#8A4A26" stroke-width="0.4" opacity="0.6"/>`;
    /* lakované kroužky */
    s += `<rect x="${-LAMP.r0 - 0.5}" y="${LAMP.kruh[0]}" width="${2 * LAMP.r0 + 1}" height="${LAMP.kruh[1] - LAMP.kruh[0]}" rx="1.1" fill="#1A1412"/>`;
    s += `<path d="M${-LAMP.r0} ${LAMP.kruh[0] + 0.6} H${LAMP.r0}" stroke="#55453A" stroke-width="0.5"/><path d="M${-LAMP.r0} ${f(LAMP.kruh[1] - 0.7)} H${LAMP.r0}" stroke="#8E2A1C" stroke-width="0.6"/>`;
    s += `<rect x="${-LAMP.r0 - 0.5}" y="${LAMP.dno[0]}" width="${2 * LAMP.r0 + 1}" height="${f(LAMP.dno[1] - LAMP.dno[0])}" rx="1.1" fill="#1A1412"/>`;
    s += `<path d="M${-LAMP.r0} ${f(LAMP.dno[0] + 0.7)} H${LAMP.r0}" stroke="#8E2A1C" stroke-width="0.6"/>`;
    if (sv > 0.02) s += `<path d="M${-LAMP.r0 + 0.6} ${f(LAMP.kruh[1] - 0.2)} H${LAMP.r0 - 0.6} M${-LAMP.r0 + 0.6} ${f(LAMP.dno[0] + 0.2)} H${LAMP.r0 - 0.6}" stroke="#FFB868" stroke-width="0.35" opacity="${f(0.8 * sv)}"/>`;
    return s;
  };
  const strapecSvg = (st) => {
    const B = svet(st.T, st.th, [0, LAMP.dno[1]]);
    return (
      `<g transform="translate(${f(B[0])} ${f(B[1])}) rotate(${f(-deg(st.strapec))}) scale(${LS})">` +
      `<path d="M0 0 V2.6" stroke="#8E2A1C" stroke-width="0.6"/><circle cx="0" cy="3.3" r="0.9" fill="#C4432B"/>` +
      `<path d="M-1.1 3.8 L1.1 3.8 L1.6 10.4 Q0 11.2 -1.6 10.4 Z" fill="#B23A26"/>` +
      `<path d="M-0.6 4.4 V10.2 M0 4.4 V10.6 M0.6 4.4 V10.2" stroke="#7A2214" stroke-width="0.3"/></g>`
    );
  };
  const jazykSvg = (o) => {
    const R0 = o.koren, K = o.spicka;
    const d = [K[0] - R0[0], K[1] - R0[1]];
    const n = Math.hypot(d[0], d[1]);
    if (n < 0.8) return "";
    let perp = [-d[1] / n, d[0] / n];
    if (perp[1] < 0) perp = [-perp[0], -perp[1]];
    const sag = Math.min(7, n * 0.2);
    const C = [(R0[0] + K[0]) / 2 + perp[0] * sag, (R0[1] + K[1]) / 2 + perp[1] * sag];
    const B = Array.from({ length: 13 }, (_, i) => {
      const q = i / 12;
      return [lerp(lerp(R0[0], C[0], q), lerp(C[0], K[0], q), q), lerp(lerp(R0[1], C[1], q), lerp(C[1], K[1], q), q)];
    });
    return (
      `<path d="${pasPoBodech(B, (q) => 3.9 * (1 - 0.5 * q))}" fill="#C9372E" stroke="#5E120E" stroke-width="0.45" stroke-linejoin="round"/>` +
      `<circle cx="${f(K[0])}" cy="${f(K[1])}" r="1.1" fill="#C9372E"/>` +
      `<path d="${cara(B.slice(1, -1))}" stroke="#F28A7C" stroke-width="0.5" fill="none" opacity="0.8" stroke-linecap="round"/>`
    );
  };
  const muraSvg = (m, st, chycena = false) => {
    const sv = clamp(st.S) * m.pritomna;
    const pred = m.z > 0 && !chycena;
    const barva = chycena ? "#E2C08E" : pred ? mix("#6A6458", "#2A2018", sv) : mix("#8A7C68", "#E2C08E", sv);
    const telo = pred ? mix("#4A4458", "#1A120C", sv) : mix("#5A4C3C", "#8A6A48", sv);
    return (
      `<g transform="translate(${f(m.x)} ${f(m.y)}) rotate(${f(m.nakl)}) scale(${f(m.sc * 0.95)})" opacity="${f(clamp(m.pritomna * 1.2))}">` +
      `<g transform="scale(${f(m.sp)} 1)" fill="${barva}" stroke="#5A4632" stroke-width="${pred ? 0 : 0.3}">${kridla}</g>` +
      `<ellipse cx="0" cy="0.5" rx="0.5" ry="1.5" fill="${telo}"/>` +
      `<path d="M-0.25 -0.9 L-1 -2.4 M0.25 -0.9 L1 -2.4" stroke="${telo}" stroke-width="0.22"/></g>`
    );
  };
  const vrstvaTyc = (st) => tycSvg(st);
  const vrstvaLampion = (st) => {
    /* vzdálená ručka drží tyč: z kraje čela k dlani */
    let s = vPostave(rucka(doPostavy(naTelo(RAMENO, st.ch)), doPostavy(st.H), { tloustka: 5.2, barva: "#A8432A", obrys: "#7E2F18" }));
    s += `<g transform="translate(${f(st.T[0])} ${f(st.T[1])}) rotate(${f(-deg(st.th))}) scale(${LS})">${lucerna(st)}</g>`;
    s += strapecSvg(st);
    if (st.obake && st.obake.jazyk > 0.02) {
      s += jazykSvg(st.obake);
      if (st.obake.mura) s += muraSvg(st.obake.mura, st, true);
    }
    return s;
  };
  const vrstvaMury = (vpredu) => (st) => st.mury.filter((m) => !m.chycena && (m.z > 0) === vpredu).map((m) => muraSvg(m, st)).join("");
  const vrstvaZare = (st) => {
    let s = "";
    const S = clamp(st.S, 0, 1.6);
    if (S > 0.01) {
      const [lx, ly] = st.L;
      const r = 36 + 8 * S;
      s +=
        `<defs><radialGradient id="pcl-zare-g" gradientUnits="userSpaceOnUse" cx="${f(lx)}" cy="${f(ly)}" r="${f(r)}">` +
        `<stop offset="0" stop-color="#FFD890" stop-opacity="${f(clamp(0.42 * S))}"/><stop offset="0.4" stop-color="#FFA050" stop-opacity="${f(clamp(0.16 * S))}"/><stop offset="1" stop-color="#FFA050" stop-opacity="0"/></radialGradient></defs>` +
        `<circle cx="${f(lx)}" cy="${f(ly)}" r="${f(r)}" fill="url(#pcl-zare-g)"/>` +
        /* ze spodního otvoru padá světlo na cestu */
        `<g transform="translate(${f(st.T[0])} ${f(st.T[1])}) rotate(${f(-deg(st.th))}) scale(${LS})"><path d="M-6.4 36 L6.4 36 L14 ${f((FIG.y + 1 - st.T[1]) / LS)} L-14 ${f((FIG.y + 1 - st.T[1]) / LS)} Z" fill="url(#pcl-kuzel)" opacity="${f(clamp(0.32 * S))}"/></g>`;
    }
    if (st.jiskra) {
      const { p, stopa } = st.jiskra;
      s += stopa.map(([x, y], i) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(1.5 - i * 0.22)}" fill="#FF9A3A" opacity="${f(0.8 - i * 0.12)}"/>`).join("");
      s += `<circle cx="${f(p[0])}" cy="${f(p[1])}" r="6" fill="url(#pcl-jiskra)"/><circle cx="${f(p[0])}" cy="${f(p[1])}" r="0.9" fill="#FFFBEA"/>`;
    }
    return s;
  };

  const defs = () =>
    pecDefs("pcl") +
    `<clipPath id="pcl-telo-orez"><path d="${TELO_D}"/></clipPath>` +
    `<clipPath id="pcl-bok"><rect x="${TELO.x - 2}" y="${TELO.y - 2}" width="${HRANA - TELO.x + 2}" height="${TELO.h + 4}"/></clipPath>` +
    `<clipPath id="pcl-cela"><rect x="${HRANA}" y="20" width="90" height="130"/></clipPath>` +
    `<clipPath id="pcl-dvirka"><rect x="62" y="93" width="56" height="35" rx="8"/></clipPath>` +
    `<clipPath id="pcl-telo-lamp"><path d="${TELO_L}"/></clipPath>` +
    `<radialGradient id="pcl-telo34" cx="0.6" cy="0.26" r="0.82"><stop offset="0" stop-color="#D2704C"/><stop offset="0.55" stop-color="#B84A2B"/><stop offset="1" stop-color="#97391F"/></radialGradient>` +
    `<linearGradient id="pcl-bok-g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4A1A0C" stop-opacity="0.5"/><stop offset="0.34" stop-color="#5A2210" stop-opacity="0.26"/></linearGradient>` +
    `<linearGradient id="pcl-hrana" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#F2A27A" stop-opacity="0"/><stop offset="0.55" stop-color="#F2A27A" stop-opacity="0.38"/><stop offset="1" stop-color="#F2A27A" stop-opacity="0"/></linearGradient>` +
    `<linearGradient id="pcl-komin" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7E2E1A"/><stop offset="0.42" stop-color="#8A3420"/><stop offset="0.48" stop-color="#B85438"/><stop offset="1" stop-color="#A8432A"/></linearGradient>` +
    `<radialGradient id="pcl-stin"><stop offset="0" stop-color="#2B2420" stop-opacity="0.3"/><stop offset="0.6" stop-color="#2B2420" stop-opacity="0.14"/><stop offset="1" stop-color="#2B2420" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="pcl-kaluz"><stop offset="0" stop-color="#FFB860" stop-opacity="0.5"/><stop offset="0.55" stop-color="#F59A4E" stop-opacity="0.2"/><stop offset="1" stop-color="#F59A4E" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="pcl-kour"><stop offset="0" stop-color="#6B5D4F" stop-opacity="0.6"/><stop offset="1" stop-color="#6B5D4F" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="pcl-vyhen" cx="0.5" cy="1.05" r="0.8"><stop offset="0" stop-color="#FFB45A" stop-opacity="0.95"/><stop offset="0.4" stop-color="#E0582E" stop-opacity="0.55"/><stop offset="0.85" stop-color="#9A2E16" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="pcl-usta" cx="0.5" cy="0.45" r="0.6"><stop offset="0" stop-color="#FFF4C0"/><stop offset="0.45" stop-color="#F7963E"/><stop offset="1" stop-color="#7A1C0C"/></radialGradient>` +
    `<linearGradient id="pcl-papir-boky" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3A140A" stop-opacity="0.55"/><stop offset="0.24" stop-color="#3A140A" stop-opacity="0"/><stop offset="0.72" stop-color="#3A140A" stop-opacity="0"/><stop offset="1" stop-color="#3A140A" stop-opacity="0.6"/></linearGradient>` +
    `<linearGradient id="pcl-papir-konce" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3A140A" stop-opacity="0.5"/><stop offset="0.16" stop-color="#3A140A" stop-opacity="0"/><stop offset="0.84" stop-color="#3A140A" stop-opacity="0"/><stop offset="1" stop-color="#3A140A" stop-opacity="0.55"/></linearGradient>` +
    `<linearGradient id="pcl-kuzel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFD890" stop-opacity="0.7"/><stop offset="1" stop-color="#FFD890" stop-opacity="0"/></linearGradient>` +
    `<radialGradient id="pcl-jiskra"><stop offset="0" stop-color="#FFF4D0"/><stop offset="0.3" stop-color="#FFB050" stop-opacity="0.7"/><stop offset="1" stop-color="#FF7A2A" stop-opacity="0"/></radialGradient>` +
    `<filter id="pcl-tah" x="-8%" y="-8%" width="116%" height="116%"><feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="4" result="vlna"/><feDisplacementMap in="SourceGraphic" in2="vlna" scale="2.2" xChannelSelector="R" yChannelSelector="G"/></filter>`;

  /* ——— Simulace ——— */
  const novaMura = (R, zdaleka) => ({
    a: R() * Math.PI * 2, smer: R() < 0.5 ? -1 : 1, va: 2 + R() * 1.8, r0: 17 + R() * 6, r: zdaleka ? 70 + R() * 30 : 17 + R() * 6,
    h0: -9 + R() * 10, fz: R() * 6.28, w1: 0.7 + R() * 0.8, w2: 1.5 + R() * 1.2, mav: 26 + R() * 12, pritomna: zdaleka ? 0 : 1,
    chycena: false, nalet: 0, x: 0, y: 0, z: 0,
  });
  const novaDynamika = () => {
    const R = rng(1919);
    return {
      nahoda: R, uhel: UHEL0, uhelV: 0, posun: [0, 0], posunV: [0, 0], ohyb: 1.1, ohybV: 0, mys: null, Tp: null, Vp: null, aT: [0, 0],
      kyv: { th: -0.08, om: 0 }, strapec: { th: -0.08, om: 0 }, toc: { phi: 0.3, om: 0 },
      S: 1, hori: true, zhasnuto: -10, zapaleno: -10, jiskra: null, obake: null,
      mury: Array.from({ length: 3 }, () => novaMura(R, false)), prach: [], sust: 0, zvuk: [], pohled: [0, 0],
      otres: { x: { smer: 0, kraj: null, casy: [] }, y: { smer: 0, kraj: null, casy: [] } },
    };
  };
  const dlan = (d, ch) => {
    const H0 = naTelo(RUKA, ch);
    return [H0[0] + d.posun[0], H0[1] + d.posun[1]];
  };
  const spicka = (d, H) => {
    const U = rad(d.uhel);
    return [H[0] + TYC * Math.cos(U), H[1] + TYC * Math.sin(U) + d.ohyb];
  };
  const JISKRA_LET = [0.35, 0.95];
  /** Jiskra z komína: nejdřív komín vzplane, pak letí obloukem do lucerny */
  const stavJiskry = (d, t, L, ch) => {
    if (!d.jiskra) return null;
    const u = t - d.jiskra.t0;
    const [a, b] = JISKRA_LET;
    if (u < a) return { plamen: Math.sin((Math.PI * u) / (a + 0.1)), p: null };
    const C = naTelo([110, 32], ch);
    const poloha = (q) => {
      q = clamp(q);
      const e = smooth(q);
      return [lerp(C[0], L[0], e), lerp(C[1], L[1], e) - 24 * Math.sin(Math.PI * q)];
    };
    const q = (u - a) / (b - a);
    return { plamen: Math.max(0, 1 - (u - a) / 0.3), p: poloha(q), stopa: [1, 2, 3, 4].map((i) => poloha(q - i * 0.035)) };
  };
  const krok = (dyn, t, dt, vstup) => {
    if (dt <= 0) return;
    const R = dyn.nahoda;
    const klik = vstup.kliky && vstup.kliky.length > 0;
    if (klik) vstup.kliky.length = 0;
    if (vstup.mys) {
      if (!dyn.mys) dyn.mys = [vstup.mys.x, vstup.mys.y];
      const k = 1 - Math.exp(-dt / 0.045);
      dyn.mys = [dyn.mys[0] + (vstup.mys.x - dyn.mys[0]) * k, dyn.mys[1] + (vstup.mys.y - dyn.mys[1]) * k];
    } else dyn.mys = null;
    const ch = chuze(faze(t));
    const H0 = naTelo(RUKA, ch);
    /* myš: Pecinka zvedne lucernu tam, kam ukazuje */
    let cilUhel = UHEL0 + Math.sin(t * 0.7) * 2.5, cilPosun = [0, 0];
    if (dyn.mys) {
      const [mx, my] = dyn.mys;
      cilUhel = clamp(deg(Math.atan2(my - ZAVES - H0[1], mx - H0[0])), -84, -16);
      cilPosun = [clamp((mx - H0[0]) * 0.05, -3, 4), clamp((my - H0[1]) * 0.05, -4, 3)];
    }
    const KU = 120, DU = 2 * Math.sqrt(KU) * 0.7;
    dyn.uhelV += (KU * (cilUhel - dyn.uhel) - DU * dyn.uhelV) * dt;
    dyn.uhel += dyn.uhelV * dt;
    const KP = 110, DP = 2 * Math.sqrt(KP) * 0.75;
    for (const i of [0, 1]) {
      dyn.posunV[i] += (KP * (cilPosun[i] - dyn.posun[i]) - DP * dyn.posunV[i]) * dt;
      dyn.posun[i] += dyn.posunV[i] * dt;
    }
    /* tyč se pod lucernou prohne a pruží */
    const k = dyn.kyv;
    const napeti = G * Math.cos(k.th) + ZAVES * k.om * k.om;
    const KO = 160, DO = 2 * Math.sqrt(KO) * 0.35;
    dyn.ohybV += (KO * ((1.1 * napeti) / G - dyn.ohyb) - DO * dyn.ohybV) * dt;
    dyn.ohyb += dyn.ohybV * dt;
    /* zrychlení špičky tyče (chůze, ruka, tyč) rozhoupe lucernu */
    const T = spicka(dyn, [H0[0] + dyn.posun[0], H0[1] + dyn.posun[1]]);
    let a = [0, 0];
    if (dyn.Tp) {
      const v = [(T[0] - dyn.Tp[0]) / dt, (T[1] - dyn.Tp[1]) / dt];
      if (dyn.Vp) a = [(v[0] - dyn.Vp[0]) / dt, (v[1] - dyn.Vp[1]) / dt];
      dyn.Vp = v;
    }
    dyn.Tp = T;
    const vel = Math.hypot(a[0], a[1]);
    if (vel > G * 3) a = a.map((q) => (q * G * 3) / vel);
    dyn.aT = dyn.aT.map((q, i) => q + (a[i] - q) * clamp(dt / 0.03));
    const aT = dyn.aT;
    /* jde proti vzduchu, takže lucerna trochu zaostává */
    const vitr = -0.9 + 0.5 * Math.sin(t * 0.83) + 0.3 * Math.sin(t * 1.9 + 1);
    const pres = Math.max(0, Math.abs(k.th) - 1.2);
    const alfa = (-aT[0] * Math.cos(k.th) - (G - aT[1]) * Math.sin(k.th)) / ZAVES - (1.0 + pres * 14) * k.om - Math.sign(k.th) * pres * 90 + vitr;
    k.om = clamp(k.om + alfa * dt, -7, 7);
    k.th += k.om * dt;
    const sp = dyn.strapec;
    sp.om += (38 * (k.th - sp.th) - 3.2 * sp.om) * dt;
    sp.th += sp.om * dt;
    /* lucerna se na háčku pomalu točí: chvíli 火, chvíli sakura; probuzená se otočí čelem k nám */
    const tc = dyn.toc;
    let cilPhi = (Math.PI / 2) * (1 - Math.cos((2 * Math.PI * t) / 46)) + 0.35 * Math.sin(t * 0.37);
    if (dyn.obake) cilPhi = Math.round(tc.phi / (2 * Math.PI)) * 2 * Math.PI;
    tc.om += ((dyn.obake ? 30 : 2.4) * (cilPhi - tc.phi) - (dyn.obake ? 9 : 1.5) * tc.om + k.om * 0.25) * dt;
    tc.phi += tc.om * dt;
    /* třesení: obrat myši aspoň o 7 jednotek se počítá; pět obratů v jedné ose za 1,2 s (třeseme rychleji
       než dvakrát za vteřinu) svíčku sfoukne, stejně jako když se lucerna rozhoupe skoro do vodorovna */
    const ot = dyn.otres;
    if (vstup.mys) {
      for (const [osa, h] of [["x", vstup.mys.x], ["y", vstup.mys.y]]) {
        const o = ot[osa];
        if (o.kraj == null) {
          o.kraj = h;
          continue;
        }
        const d = h - o.kraj;
        if (o.smer === 0) {
          if (Math.abs(d) > 7) [o.smer, o.kraj] = [Math.sign(d), h];
        } else if (Math.sign(d) === o.smer) o.kraj = h;
        else if (Math.abs(d) > 7) {
          o.casy.push(t);
          [o.smer, o.kraj] = [-o.smer, h];
        }
      }
    } else ot.x.kraj = ot.y.kraj = null;
    for (const o of [ot.x, ot.y]) o.casy = o.casy.filter((c) => t - c < 1.2);
    if (dyn.hori && (Math.max(ot.x.casy.length, ot.y.casy.length) >= 5 || Math.abs(k.th) > 1.3)) {
      ot.x.casy.length = ot.y.casy.length = 0;
      dyn.hori = false;
      dyn.zhasnuto = t;
      dyn.obake = null;
      dyn.zvuk.push({ druh: "zhasni", sila: 1, pan: 0.4 });
    }
    /* … a Pecinka ji zapálí jiskrou z komína */
    if (!dyn.hori && !dyn.jiskra && (t - dyn.zhasnuto > 1.15 || klik)) {
      dyn.jiskra = { t0: t };
      dyn.zvuk.push({ druh: "fuk", sila: 0.6, pan: -0.2 });
    }
    if (dyn.jiskra) {
      const u = t - dyn.jiskra.t0;
      if (u > JISKRA_LET[0] && u < JISKRA_LET[1] && R() < dt * 14) dyn.zvuk.push({ druh: "jiskra", sila: 0.4 + R() * 0.4, pan: 0.2 });
      if (u >= JISKRA_LET[1]) {
        dyn.jiskra = null;
        dyn.hori = true;
        dyn.zapaleno = t;
        dyn.zvuk.push({ druh: "zapal", sila: 1, pan: 0.4 });
      }
    }
    const cilS = dyn.hori ? 1 + 0.6 * Math.exp(-(t - dyn.zapaleno) / 0.35) : 0;
    dyn.S += (cilS - dyn.S) * (1 - Math.exp(-dt / (dyn.hori ? 0.08 : 0.12)));
    /* papír zašustí, když se lucerna rozhoupe */
    dyn.sust -= dt;
    if (Math.abs(k.om) > 2.6 && dyn.sust <= 0) {
      dyn.sust = 0.22;
      dyn.zvuk.push({ druh: "sust", sila: clamp((Math.abs(k.om) - 2.6) / 2.5, 0.2, 1), pan: 0.4 });
    }
    /* geta dopadne: karan… koron, a zvedne se obláček prachu */
    const fiP = faze(t - dt);
    for (const n of NOHY) {
      const u = (((ch.fi - n.faze) % 1) + 1) % 1, uP = (((fiP - n.faze) % 1) + 1) % 1;
      if (u < uP) {
        dyn.zvuk.push({ druh: n.blizko ? "karan" : "koron", sila: 0.55, pan: -0.25 });
        const p = noha(n, ch.fi);
        const P = zPostavy([p.X, 159]);
        dyn.prach.push({ x: P[0] + 6 * FIG.s, y: P[1] + (n.blizko ? 0.8 : -0.8), t0: t, seed: Math.floor(R() * 1000) });
      }
    }
    dyn.prach = dyn.prach.filter((p) => t - p.t0 < 0.9);
    /* můry krouží kolem světla, občas narazí do papíru; po tmě odletí */
    const L = svet(T, k.th, [0, LAMP.stred]);
    for (const m of dyn.mury) {
      if (m.chycena) continue;
      const laka = dyn.S > 0.4;
      m.pritomna += ((laka ? 1 : 0) - m.pritomna) * (1 - Math.exp(-dt / (laka ? 1.4 : 0.6)));
      const cilR = laka ? m.r0 + 4 * Math.sin(t * m.w1 + m.fz) : 80;
      m.r += (cilR - m.r) * (1 - Math.exp(-dt / (laka ? 0.9 : 0.5)));
      if (laka && m.nalet <= 0 && R() < dt * 0.35) m.nalet = 0.6;
      if (m.nalet > 0) {
        m.nalet -= dt;
        m.r += (11 - m.r) * (1 - Math.exp(-dt / 0.09));
        if (m.r < 15.6) {
          m.r = 19;
          m.nalet = 0;
          if (R() < 0.5) m.smer *= -1;
          if (dyn.S > 0.5) dyn.zvuk.push({ druh: "mura", sila: 0.5 + R() * 0.5, pan: 0.4 });
        }
      }
      m.a += m.smer * m.va * dt * (1 + 0.45 * Math.sin(t * m.w2 + m.fz));
      if (R() < dt * 0.12) m.smer *= -1;
      const h = m.h0 + 5.5 * Math.sin(t * m.w2 * 0.8 + m.fz) + 2.5 * Math.sin(t * 3.3 + m.fz * 2);
      m.z = m.r * Math.sin(m.a);
      m.x = L[0] + m.r * Math.cos(m.a);
      m.y = L[1] + h - m.z * 0.1 - (1 - m.pritomna) * 30;
    }
    /* kliknutí: lucerna procitne jako čóčin-obake */
    if (klik && dyn.hori && !dyn.obake && t - dyn.zapaleno > 0.4) {
      const usta = svet(T, k.th, [0, 26]);
      let cil = null, nej = 1e9;
      for (const m of dyn.mury) {
        if (m.pritomna < 0.8 || m.chycena) continue;
        const dd = Math.hypot(m.x - usta[0], m.y - usta[1]);
        if (dd < nej) [nej, cil] = [dd, m];
      }
      dyn.obake = { t0: t, cil: nej < 50 ? cil : null, chycena: false, bod: null };
    }
    if (dyn.obake) {
      const o = dyn.obake;
      const u = t - o.t0, uP = u - dt;
      if (uP < 0.15 && u >= 0.15) dyn.zvuk.push({ druh: "trh", sila: 1, pan: 0.4 });
      if (uP < 0.45 && u >= 0.45) dyn.zvuk.push({ druh: "bero", sila: 1, pan: 0.4 });
      if (o.cil && !o.chycena && u >= 0.85) {
        o.chycena = true;
        o.bod = [o.cil.x, o.cil.y];
        o.cil.chycena = true;
      }
      if (o.chycena && uP < 1.35 && u >= 1.35) {
        dyn.zvuk.push({ druh: "polk", sila: 1, pan: 0.4 });
        Object.assign(o.cil, novaMura(R, true));
      }
      if (u > 2.4) dyn.obake = null;
    }
    /* pohled: na myš, jinak na lucernu; při zapalování na jiskru */
    const tvar = naTelo([108, 82], ch);
    const jis = stavJiskry(dyn, t, L, ch);
    const kam = jis ? jis.p : dyn.mys && !dyn.obake ? dyn.mys : [L[0], L[1] - (dyn.obake ? 6 : 0)];
    const cil = kam ? [clamp((kam[0] - tvar[0]) / 30, -1, 1) * 1.9, clamp((kam[1] - tvar[1]) / 30, -1, 1) * 1.5] : [0, 0];
    dyn.pohled = dyn.pohled.map((q, i) => q + (cil[i] - q) * (1 - Math.exp(-dt / 0.12)));
  };
  const stav = (t, vstup = {}, dyn) => {
    const d = dyn || novaDynamika();
    const ch = chuze(faze(t));
    const H = dlan(d, ch);
    const T = spicka(d, H);
    const th = d.kyv.th;
    const L = svet(T, th, [0, LAMP.stred]);
    const mihot = 0.5 + 0.3 * Math.sin(t * 13.1) + 0.2 * Math.sin(t * 23.7 + 1);
    /* při třesení plamínek zápasí: světlo poskakuje, než zhasne */
    const ohrozeni = d.hori ? Math.max(d.otres.x.casy.length, d.otres.y.casy.length) / 5 : 0;
    const S = d.S * (0.94 + 0.06 * mihot - ohrozeni * 0.4 * (0.5 + 0.5 * Math.sin(t * 31)));
    const jis = stavJiskry(d, t, L, ch);
    let ob = null, obakeTvar = 0;
    if (d.obake) {
      const o = d.obake;
      const u = t - o.t0;
      const oko = smooth(u / 0.22) * (1 - smooth((u - 2.0) / 0.3));
      const usta = smooth((u - 0.15) / 0.3) * (1 - smooth((u - 1.6) / 0.35));
      const akanbe = !o.cil;
      const jaz = akanbe ? smooth((u - 0.45) / 0.3) * (1 - smooth((u - 1.45) / 0.3)) : smooth((u - 0.45) / 0.38) * (1 - smooth((u - 0.92) / 0.43));
      const koren = svet(T, th, [0, 25.6 + usta * 3.6]);
      let cil = akanbe ? [koren[0] + 1.5 + 2.4 * Math.sin(t * 9), koren[1] + 14 + 1.5 * Math.sin(t * 6)] : o.bod || [o.cil.x, o.cil.y];
      const dd = [cil[0] - koren[0], cil[1] - koren[1]];
      const n = Math.hypot(dd[0], dd[1]);
      if (n > 50) cil = [koren[0] + (dd[0] / n) * 50, koren[1] + (dd[1] / n) * 50];
      const K = [lerp(koren[0], cil[0], jaz), lerp(koren[1], cil[1], jaz)];
      const oko0 = svet(T, th, [-0.4, 15.4]);
      const smer = [K[0] - oko0[0], K[1] - oko0[1] + (jaz < 0.05 ? 20 : 0)];
      const sn = Math.hypot(smer[0], smer[1]) || 1;
      ob = {
        oko, usta, jazyk: jaz, koren, spicka: K, pohled: [(smer[0] / sn) * 1.6, (smer[1] / sn) * 1.2],
        mura: o.chycena && u < 1.35 ? { ...o.cil, x: K[0], y: K[1], z: 1, sc: 1, nakl: Math.sin(t * 30) * 25, sp: 0.3 + 0.7 * Math.abs(Math.sin(t * 40)), pritomna: 1 } : null,
      };
      obakeTvar = Math.max(oko, usta);
    }
    let oci = "kulate", usta = "usmev";
    if (d.obake) {
      const u = t - d.obake.t0;
      if (u > 0.15 && u < 1.45) [oci, usta] = ["siroke", "o"];
      else if (u >= 1.45) [oci, usta] = ["smich", "ach"];
    } else if (!d.hori) [oci, usta] = t - d.zhasnuto < 0.9 ? ["siroke", "o"] : ["zavrene", "fuk"];
    else if (t - d.zapaleno < 1.6) [oci, usta] = ["smich", "usmev"];
    const vlna = 4 * Math.PI * ch.fi;
    return {
      t, ch, nohy: NOHY.map((n) => noha(n, ch.fi)),
      prach: d.prach.map((p) => {
        const u = (t - p.t0) / 0.9;
        return { x: p.x - RYCHLOST * (t - p.t0), y: p.y, r: 1.6 + 5.4 * easeOut(u), op: 0.6 * Math.pow(1 - u, 1.3), seed: p.seed };
      }),
      shide: [10 + 7 * Math.sin(vlna + 0.5), 10 + 7 * Math.sin(vlna + 1.7), 12 + 6 * Math.sin(vlna + 2.6)],
      H, T, th, phi: d.toc.phi, L, S, mihot, strapec: d.strapec.th, ohyb: d.ohyb,
      svicka: clamp(d.kyv.om * -0.5 - 0.6 + ohrozeni * 2.4 * Math.sin(t * 17), -2.6, 2.6),
      obake: ob, obakeTvar,
      mury: d.mury.map((m) => ({ ...m, sc: 1 + m.z * 0.012, nakl: 20 * Math.sin(t * 2 + m.fz), sp: 0.25 + 0.75 * Math.abs(Math.sin(t * m.mav + m.fz)) })),
      pohled: d.pohled, mrk: mrkani(t, [1.8, 5.2, 5.45, 8.4], 10), oci, usta,
      jiskra: jis && jis.p ? { p: jis.p, stopa: jis.stopa } : null,
      kominPlamen: jis ? jis.plamen : 0,
      vyhen: 0.55 + 0.12 * mihot + (d.hori ? 0 : 0.6 * smooth((t - d.zhasnuto) / 0.6)),
    };
  };
  const snimek = (st) => Math.floor(st.t * 30);

  return {
    id: "lampion",
    viewBox: "0 0 180 180",
    defs,
    novaDynamika,
    krok,
    stav,
    hukot: () => 0,
    klidne: { t: 3 },
    /** Rychlost chůze pro průvod: o kolik procent šířky kresby se má za sekundu posunout */
    rychlost: RYCHLOST / 180,
    vrstvy: [
      { id: "zem", kresli: vrstvaZem, klic: snimek },
      { id: "nohy", kresli: vrstvaNohy, klic: snimek },
      { id: "tyc", kresli: vrstvaTyc, klic: snimek },
      { id: "telo", kresli: vrstvaTelo, tezka: true, posun: posunTela },
      { id: "dvirka", kresli: vrstvaDvirka, klic: snimek, posun: posunTela },
      { id: "svit", kresli: vrstvaSvit, klic: snimek, posun: posunTela, styl: "mix-blend-mode:screen" },
      { id: "tvar", kresli: vrstvaTvar, klic: (st) => `${f(st.pohled[0])},${f(st.pohled[1])},${f(st.mrk)},${st.oci},${st.usta},${f(st.S)}`, posun: posunTela },
      { id: "shide", kresli: vrstvaShide, klic: (st) => Math.floor(st.t * 24), posun: posunTela },
      { id: "ruka-bok", kresli: vrstvaRukaBok, klic: snimek, posun: posunTela },
      { id: "komin", kresli: vrstvaKomin, klic: (st) => (st.kominPlamen > 0 ? snimek(st) : Math.floor(st.t * 20)) },
      { id: "mury-za", kresli: vrstvaMury(false), klic: snimek },
      { id: "lampion", kresli: vrstvaLampion, klic: snimek },
      { id: "mury-pred", kresli: vrstvaMury(true), klic: snimek },
      { id: "zare", kresli: vrstvaZare, klic: snimek },
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
        let obsah = v.kresli(st);
        if (v.orez) obsah = `<g clip-path="url(#${v.orez})">${obsah}</g>`;
        const op = v.pruhlednost ? ` opacity="${v.pruhlednost(st)}"` : "";
        /* vrstva, která se celá posouvá (tělo při chůzi), dostane posun jako transformaci */
        const p = v.posun ? v.posun(st) : null;
        const tr = p ? ` transform="translate(${f(p.dx)} ${f(p.dy)}) rotate(${f(p.rot)} ${f(p.ox)} ${f(p.oy)})"` : "";
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

export const kresby = { v1: V1, v2: V2, v3: V3, lampion: VL };
export { celeSvg, pretoc };
