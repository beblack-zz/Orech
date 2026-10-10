/*
 * Návrh 3, Tušový lem — STO SVÍČEK
 * (odložený návrh: na stránce není a ./kresby.js ho neimportuje)
 *
 * Hjakumonogatari kaidankai, „setkání u sta příběhů“: za letní noci se
 * rozsvítilo sto knotů a vyprávěly se strašidelné historky. Po každé se
 * jeden knot zhasl. Když zhasl poslední, mělo se prý něco zjevit —
 * a tak se většinou skončilo u devadesáté deváté.
 *
 * Tady už vypravěči utekli (zbyl převržený šálek a vějíř) a svíčky
 * dohořívají. Za posuvnými dveřmi fusuma je tma a v ní Bublinka. Nejdřív
 * jen oko ve škvíře. S každou zhasnutou svíčkou se dveře rozjedou o kus
 * dál a ona je blíž; u poslední stojí v pokoji. Když zhasne i ta, svítí
 * ve tmě jen její oči a úsměv — a pak se zasměje, bludičky svíčky zase
 * rozsvítí, dveře klapnou a hraje se znova.
 *
 * Kliknutí sfoukne svíčku (tu nejbližší, prostřední až jako poslední).
 * Plamínky se od kurzoru odklánějí. Když se nic neděje, zhasínají samy.
 */
import {
  f, rng, clamp, lerp, smooth, pasPoBodech, mrkani, jazyk, kCili,
  bubDefs, bubLesk, bubTvar, bubCelenka, bubOcas, ocasDefs, ruckaDucha, plaminek, onibiDefs, krokOnibi, tusLem,
} from "./spolecne.js";

const ID = "bs4";
const TUS = tusLem(ID, { seed: 23, barva: "#17131C", lem: "#3A2C38" });
const OREZ = `${ID}-tus-orez`;
const STENA = { y0: 27, y1: 112 };
const STRED = 90, PUL = 17;
const UBEH = [90, 62];

/* Svíčky: dvě řady dohořelých vzadu, vpředu čtyři a poslední uprostřed. `ziva` je pořadí zhasínání. */
const SVICE = [
  ...[30, 48, 66, 114, 132, 150].map((x, i) => ({ x, y: 121, s: 0.55, h: [5, 9, 3, 7, 4, 10][i] })),
  ...[22, 44, 64, 116, 136, 158].map((x, i) => ({ x, y: 138, s: 0.76, h: [8, 3, 6, 9, 4, 6][i] })),
  { x: 31, y: 158, s: 1, h: 15, ziva: 0 },
  { x: 149, y: 158, s: 1, h: 13, ziva: 1 },
  { x: 58, y: 162, s: 1.04, h: 11, ziva: 2 },
  { x: 122, y: 162, s: 1.04, h: 14, ziva: 3 },
  { x: 90, y: 171, s: 1.18, h: 12, ziva: 4 },
];
const ZIVE = SVICE.filter((c) => c.ziva != null).sort((a, b) => a.ziva - b.ziva);
const POCET = ZIVE.length;
const knot = (c) => [c.x, c.y - (14 + c.h + 1.4) * c.s];

/* Jak blízko je: podle počtu zhasnutých svíček (0…5). Škvíra, střed, poloměr. */
const KROKY = [
  { g: 0.12, x: 94.4, y: 84, r: 17 },
  { g: 0.32, x: 93, y: 84, r: 17 },
  { g: 0.64, x: 91.4, y: 84.4, r: 16.8 },
  { g: 1, x: 90, y: 85, r: 16.4 },
  { g: 1, x: 90, y: 93, r: 20.5 },
  { g: 1, x: 90, y: 106, r: 31 },
];
const naKroku = (a) => {
  const i = Math.min(KROKY.length - 2, Math.floor(clamp(a, 0, 5)));
  const k = smooth(clamp(a, 0, 5) - i);
  const A = KROKY[i], B = KROKY[i + 1];
  return { g: lerp(A.g, B.g, k), x: lerp(A.x, B.x, k), y: lerp(A.y, B.y, k), r: lerp(A.r, B.r, k) };
};
/* tma: 0,6 s nic, pak se rozsvítí oči; rozsvěcení: bludičky oběhnou svíčky */
const TMA_OCI = 0.7, TMA_KONEC = 3, NA_SVICKU = 0.4;

/* ——— Pokoj ——— */
const fusuma = (x, w, { tah = 0, uchyt = 0 } = {}) => {
  const y0 = STENA.y0, h = STENA.y1 - STENA.y0;
  let s = `<g transform="translate(${f(tah)} 0)">`;
  s += `<rect x="${x}" y="${y0}" width="${w}" height="${h}" fill="url(#${ID}-fusuma)" stroke="#0B080D" stroke-width="1.2"/>`;
  /* zlatý prach v pásech mlhy a borovice, jak se malují na posuvné dveře */
  s += `<g clip-path="url(#${ID}-pole-${x})">`;
  s += `<path d="M${x - 4} ${y0 + 20} q${w * 0.3} -5 ${w * 0.6} 0 t${w * 0.6} 0 v5 q${-w * 0.3} 4 ${-w * 0.6} 0 t${-w * 0.6} 0 Z" fill="#8A6E38" opacity="0.2"/>`;
  s += `<path d="M${x - 4} ${y0 + 52} q${w * 0.25} -4 ${w * 0.5} 0 t${w * 0.7} 0 v7 q${-w * 0.35} 4 ${-w * 0.7} 0 t${-w * 0.5} 0 Z" fill="#8A6E38" opacity="0.16"/>`;
  s += `</g>`;
  s += `<rect x="${x + 1.6}" y="${y0 + 1.6}" width="${w - 3.2}" height="${h - 3.2}" fill="none" stroke="#4A3C34" stroke-width="0.4" opacity="0.7"/>`;
  if (uchyt) s += `<ellipse cx="${uchyt > 0 ? x + w - 4.4 : x + 4.4}" cy="${y0 + h * 0.56}" rx="1.5" ry="2.6" fill="#0B080D" stroke="#8A6E38" stroke-width="0.45"/>`;
  return s + `</g>`;
};
const borovice = (x, y, k, seed) => {
  const r = rng(seed);
  let s = `<path d="M${x} ${y} q${-3 * k} ${-14 * k} ${4 * k} ${-26 * k} q${5 * k} ${-8 * k} ${-2 * k} ${-18 * k}" stroke="#3E3226" stroke-width="${f(1.6 * k)}" fill="none" stroke-linecap="round"/>`;
  for (let i = 0; i < 5; i++) {
    const bx = x + (r() - 0.4) * 16 * k, by = y - (16 + i * 7 + r() * 4) * k;
    s += `<path d="M${f(bx - 9 * k)} ${f(by)} q${f(9 * k)} ${f(-7 * k)} ${f(18 * k)} 0 q${f(-9 * k)} ${f(-2.4 * k)} ${f(-18 * k)} 0 Z" fill="#3A4634" opacity="0.75"/>`;
  }
  return s;
};
const vrstvaPokoj = () => {
  let s = TUS.skvrna + `<g clip-path="url(#${OREZ})">`;
  /* stěna, překlad a mřížka ranma nad dveřmi */
  s += `<rect x="0" y="0" width="180" height="${STENA.y1}" fill="#1A151C"/>`;
  s += `<g stroke="#2E2630" stroke-width="0.7">${Array.from({ length: 30 }, (_, i) => `<path d="M${8 + i * 5.6} 12 V24"/>`).join("")}</g>`;
  s += `<rect x="0" y="23" width="180" height="4.4" fill="#0E0B10"/><rect x="0" y="9" width="180" height="3" fill="#0E0B10"/>`;
  s += fusuma(14, 38) + fusuma(128, 38);
  s += `<g opacity="0.55">${borovice(27, 110, 0.9, 3)}${borovice(153, 110, 0.8, 8)}</g>`;
  /* tatami: rohože se sbíhají do úběžníku, lemy z tmavé látky */
  s += `<rect x="0" y="${STENA.y1}" width="180" height="70" fill="url(#${ID}-tatami)"/>`;
  s += `<g stroke="#191520" stroke-width="1.5">${[-70, -10, 50, 130, 190, 250].map((xb) => {
    const k = (STENA.y1 - UBEH[1]) / (184 - UBEH[1]);
    return `<path d="M${f(lerp(UBEH[0], xb, k))} ${STENA.y1} L${xb} 184"/>`;
  }).join("")}<path d="M0 129 H180 M0 152 H180" stroke-width="1.2"/></g>`;
  s += `<g stroke="#4E4630" stroke-width="0.3" opacity="0.5">${Array.from({ length: 16 }, (_, i) => `<path d="M0 ${f(114 + i * i * 0.27 + i * 0.2)} H180"/>`).join("")}</g>`;
  s += `<rect x="0" y="${STENA.y1 - 1.2}" width="180" height="2.6" fill="#0B080D"/>`;
  /* vypravěči utekli: zbyl po nich převržený šálek a zapomenutý vějíř */
  s += `<g transform="translate(73 166.4) rotate(-78)"><path d="M-3.4 -6.4 L-3 -0.8 Q-2.8 0 -2 0 H2 Q2.8 0 3 -0.8 L3.4 -6.4 Z" fill="#B9B0A0" stroke="#1A1418" stroke-width="0.5"/><ellipse cx="0" cy="-6.4" rx="3.4" ry="1" fill="#2A2420" stroke="#1A1418" stroke-width="0.4"/></g>`;
  s += `<path d="M65 166.6 q-5 0.6 -8.6 3 q5.6 1.4 10 -0.6 Z" fill="#4A5A3C" opacity="0.7"/>`;
  s += `<g transform="translate(108 167) rotate(-14)"><rect x="-8" y="-1.1" width="16" height="2.2" rx="0.7" fill="#4A3426" stroke="#120C0A" stroke-width="0.4"/><path d="M-6.4 -1.1 V1.1 M-4.6 -1.1 V1.1 M5 -1.1 V1.1" stroke="#C4432B" stroke-width="0.4"/><circle cx="7" cy="0" r="0.5" fill="#D9B25E"/></g>`;
  return s + `</g>`;
};
/* černo za dveřmi a v něm Bublinka, dokud nevyjde; co z ní přesahuje škvíru, zakryjí křídla dveří */
const vrstvaZaDvermi = (st) =>
  `<rect x="${STRED - PUL - 0.6}" y="${STENA.y0}" width="${2 * PUL + 1.2}" height="${STENA.y1 - STENA.y0}" fill="#040307"/>` + (st.a <= 3.04 ? bublinka(st) : "");
const vrstvaDvere = (st) => {
  const tah = PUL * st.kde.g;
  return fusuma(52, 38, { tah: -tah, uchyt: 1 }) + fusuma(90, 38, { tah, uchyt: -1 });
};

/* ——— Svíčky ——— */
const TEMNA = { stojan: "#120E12", lem: "#3A2E30", vosk: "#8E8676", stin: "#5E584E", knot: "#0E0B0C" };
const svicka = (c) => {
  const { x, y, s, h } = c;
  const v = 14;
  let d = `<g transform="translate(${x} ${y}) scale(${s})">`;
  d += `<ellipse cx="0" cy="0.6" rx="7" ry="1.3" fill="#060408" opacity="0.6"/>`;
  /* trojnožka, dřík s kroužkem a miska na vosk */
  d += `<path d="M-5.6 0.6 Q-3 -3.4 -0.7 -3.6 H0.7 Q3 -3.4 5.6 0.6 H4 Q2.4 -1.6 0 -1.6 Q-2.4 -1.6 -4 0.6 Z" fill="${TEMNA.stojan}" stroke="${TEMNA.lem}" stroke-width="0.35"/>`;
  d += `<rect x="-0.7" y="${-v}" width="1.4" height="${v - 3}" fill="${TEMNA.stojan}"/><ellipse cx="0" cy="${-v * 0.5}" rx="1.5" ry="0.9" fill="${TEMNA.stojan}" stroke="${TEMNA.lem}" stroke-width="0.3"/>`;
  d += `<path d="M-5.4 ${-v} Q0 ${-v + 3.4} 5.4 ${-v} Z" fill="${TEMNA.stojan}" stroke="${TEMNA.lem}" stroke-width="0.35"/><ellipse cx="0" cy="${-v}" rx="5.4" ry="1.1" fill="#1E181C" stroke="${TEMNA.lem}" stroke-width="0.35"/>`;
  /* svíčka warósoku: dole úzká, nahoře širší; po straně stekl vosk */
  d += `<path d="M-1.15 ${-v} L-1.8 ${-v - h} H1.8 L1.15 ${-v} Z" fill="${TEMNA.vosk}" stroke="#2A2422" stroke-width="0.35" stroke-linejoin="round"/>`;
  d += `<path d="M0.2 ${-v} L0.5 ${-v - h} H1.8 L1.15 ${-v} Z" fill="${TEMNA.stin}" opacity="0.8"/>`;
  d += `<path d="M-1.8 ${-v - h} q-0.9 1.6 -0.3 ${Math.min(h * 0.5, 4)} q0.7 0.9 0.8 -0.4 Z" fill="${TEMNA.vosk}" stroke="#2A2422" stroke-width="0.25"/>`;
  d += `<ellipse cx="0" cy="${-v - h}" rx="1.8" ry="0.55" fill="#A49C8A" stroke="#2A2422" stroke-width="0.3"/>`;
  d += `<path d="M0 ${-v - h} v-1.7" stroke="${TEMNA.knot}" stroke-width="0.5" stroke-linecap="round"/>`;
  return d + `</g>`;
};
const vrstvaSvicky = () => SVICE.map(svicka).join("");

/* tma v pokoji podle toho, kolik toho ještě hoří; škvíra ve dveřích je černá už sama, tu nepřikrývá, ať je na Bublinku vidět */
const vrstvaTma = (st) => {
  const pul = PUL * st.kde.g;
  return `<path d="M0 0 H180 V180 H0 Z M${f(STRED - pul)} ${STENA.y0} V${STENA.y1} H${f(STRED + pul)} V${STENA.y0} Z" fill="#05030A" fill-rule="evenodd"/>`;
};
/* teplé světlo: louže na rohoži, záře kolem plamene a lesk na svíčce a misce */
const vrstvaSvetlo = (st) => {
  let s = "";
  ZIVE.forEach((c, i) => {
    const z = st.hori[i];
    if (z < 0.02) return;
    const K = knot(c);
    const bl = 1 + 0.05 * Math.sin(st.t * 11 + i * 2.1) + 0.04 * Math.sin(st.t * 17.3 + i);
    s += `<ellipse cx="${c.x}" cy="${f(c.y + 1)}" rx="${f(34 * c.s * bl)}" ry="${f(9 * c.s * bl)}" fill="url(#${ID}-teplo)" opacity="${f(0.55 * z)}"/>`;
    s += `<circle cx="${f(K[0])}" cy="${f(K[1] - 4 * c.s)}" r="${f(36 * c.s * bl)}" fill="url(#${ID}-teplo)" opacity="${f(0.62 * z)}"/>`;
  });
  return s;
};
const vrstvaPlameny = (st) => {
  let s = "";
  ZIVE.forEach((c, i) => {
    const z = st.hori[i];
    const K = knot(c);
    const v = 14;
    /* osvětlená svíčka: slonovina místo šedi, lesk na misce */
    if (z > 0.02) {
      s += `<g transform="translate(${c.x} ${c.y}) scale(${c.s})" opacity="${f(z)}">` +
        `<path d="M-1.15 ${-v} L-1.8 ${-v - c.h} H1.8 L1.15 ${-v} Z" fill="url(#${ID}-vosk)"/>` +
        `<ellipse cx="0" cy="${-v - c.h}" rx="1.8" ry="0.55" fill="#FFF3CF"/>` +
        `<path d="M-4.6 ${-v - 0.2} Q0 ${-v + 0.9} 4.6 ${-v - 0.2}" stroke="#E0A65A" stroke-width="0.4" fill="none" opacity="0.8"/>` +
        `<path d="M0 ${-v - c.h} v-1.7" stroke="#2A1A12" stroke-width="0.5" stroke-linecap="round"/></g>`;
      const vitr = st.vitr[i];
      for (const [barva, kk, W] of [["#C8482A", 1, 4.6], ["#F29A3B", 0.76, 3.4], ["#FBE3A0", 0.5, 2.2], ["#FFFBEA", 0.26, 1.2]]) {
        const { d } = jazyk({ B: [K[0], K[1] + 0.8 * c.s], th0: -Math.PI / 2 + vitr * 0.5, L: 11 * c.s * kk * z * (1 + 0.08 * Math.sin(st.t * 9 + i * 1.7)) * (1 - 0.35 * Math.abs(vitr)), W: W * c.s * (0.6 + 0.4 * z), c: vitr >= 0 ? 1 : -1, stoc: 0.9 + Math.abs(vitr), stoupani: 0.6, t: st.t, w: 7 + i, fz: i * 1.3, vitr: vitr * 1.3, vlna: 0.34, N: 12 });
        s += `<path d="${d}" fill="${barva}"/>`;
      }
    } else if (st.t - st.zhasla[i] < 0.9) {
      /* knot ještě chvilku žhne */
      s += `<circle cx="${f(K[0])}" cy="${f(K[1] + 0.4)}" r="${f(0.7 * c.s)}" fill="#FF7F24" opacity="${f(1 - (st.t - st.zhasla[i]) / 0.9)}"/>`;
    }
  });
  return s;
};
/* dým ze zhasnuté svíčky a její dech, který ji sfoukl */
const vrstvaKour = (st) => {
  let s = "";
  ZIVE.forEach((c, i) => {
    const u = st.t - st.zhasla[i];
    if (u < 0 || u > 4.5 || st.hori[i] > 0.5) return;
    const K = knot(c);
    const q = u / 4.5;
    const B = [];
    for (let j = 0; j <= 10; j++) {
      const p = j / 10;
      B.push([K[0] + Math.sin(p * 5 + st.t * 1.4 + i) * 5 * p * (0.4 + q) + st.vitr[i] * 10 * p, K[1] - 34 * c.s * p * smooth(u / 1.2)]);
    }
    s += `<path d="${pasPoBodech(B, (p) => (0.6 + 4.6 * p * (0.5 + q)) * c.s)}" fill="url(#${ID}-kour)" opacity="${f(0.62 * (1 - q) * smooth(u / 0.3))}"/>`;
  });
  if (st.dech) {
    const { od, kam, u } = st.dech;
    const k0 = clamp(u / 0.3 - 0.3), k1 = clamp(u / 0.3);
    if (k1 > k0 + 0.02) {
      const M = [(od[0] + kam[0]) / 2 + (kam[1] - od[1]) * 0.12, (od[1] + kam[1]) / 2 - 8];
      const B = [];
      for (let j = 0; j <= 12; j++) {
        const p = lerp(k0, k1, j / 12);
        B.push([(1 - p) * (1 - p) * od[0] + 2 * p * (1 - p) * M[0] + p * p * kam[0], (1 - p) * (1 - p) * od[1] + 2 * p * (1 - p) * M[1] + p * p * kam[1]]);
      }
      s += `<path d="${pasPoBodech(B, (p) => 3.4 * Math.sin(Math.PI * clamp(p * 0.9 + 0.06)))}" fill="#CFE6EE" opacity="0.5"/>`;
    }
  }
  return s;
};

/* ——— Bublinka ——— */
/** Celá postava: čím míň světla, tím je tmavší a tím víc svítí sama. */
const bublinka = (st) => {
  const { x, y, r } = st.kde;
  const k = r / 46;
  const tm = st.temnota;
  const obrys = tm > 0.6 ? "#3E7C8E" : "#1E1820";
  let s = `<g transform="translate(${f(x + st.fig.x)} ${f(y + st.fig.y)}) rotate(${f(st.fig.r)}) scale(${f(k)}) translate(-90 -96)">`;
  /* studený svit kolem ní, ať ze tmy za dveřmi vystoupí */
  s += `<circle cx="90" cy="96" r="78" fill="url(#${ID}-onibi-zare)" opacity="${f(0.5 + 0.3 * st.chlad)}"/>`;
  s += `<g opacity="${f(1 - 0.75 * tm)}">${bubOcas(ID, st.t, { delka: 44, smer: -1, sirka: 46, obrys })}</g>`;
  s += `<circle cx="90" cy="96" r="46" fill="url(#${ID}-telo)" opacity="${f(1 - 0.8 * tm)}"/>`;
  /* zespodu ji hřeje poslední svíčka, zevnitř svítí studeně */
  s += `<circle cx="90" cy="96" r="45.6" fill="url(#${ID}-odspodu)" opacity="${f(st.odspodu)}"/>`;
  s += `<circle cx="90" cy="96" r="45.6" fill="url(#${ID}-chlad)" opacity="${f(st.chlad)}"/>`;
  s += `<circle cx="90" cy="96" r="46" fill="none" stroke="${obrys}" stroke-width="${f(clamp(1.3 / k, 1.6, 3.4) * 0.62)}" opacity="${f(1 - 0.45 * tm)}"/>`;
  s += `<g opacity="${f(1 - 0.85 * tm)}">${bubLesk({ sila: 0.62 + 0.2 * st.svit, barva: "#FFF6E4", okraj: "#FFD9A0" })}${bubCelenka({ kyv: st.kyv, papir: "#F4EEE2", stin: "#C4BAAA", obrys: "#3A3034" })}</g>`;
  if (tm > 0.5) s += tvarVeTme(st);
  else s += bubTvar(ID, { dx: st.pohled[0], dy: st.pohled[1], mrk: st.mrk, vyraz: st.vyraz, tvare: 0.3, oko: "#1A1418", svit: st.chlad * 0.5 });
  if (st.a > 3.4 && tm < 0.5) {
    const BAR = { barva: "#E6DED0", obrys: "#1E1820" };
    s += ruckaDucha([47.6, 112], [35, 105], { uhel: 8 + 5 * Math.sin(st.t * 1.4), ohyb: 1, delka: 13, ...BAR }) + ruckaDucha([132.4, 112], [145, 105], { uhel: -8 + 5 * Math.sin(st.t * 1.4 + 1.3), ohyb: -1, delka: 13, ...BAR });
  }
  return s + `</g>`;
};
/** Ve tmě z ní zbudou jen oči a úsměv, jako z kočky Šklíby. */
const tvarVeTme = (st) => {
  const o = st.zjeveni;
  if (o < 0.02) return "";
  const ox = clamp(st.pohled[0], -2.4, 2.4) * 1.4, oy = clamp(st.pohled[1], -1.8, 1.8);
  const ry = 8 * o * (1 - st.mrk * 0.9);
  const usmev = smooth((o - 0.4) / 0.6);
  const oci = [70, 96].map((x) => `<path d="M${x} 90 h14 a7 ${f(ry)} 0 0 1 -14 0 Z"/>`).join("");
  const w = 27 * usmev;
  const pusa = usmev > 0.03 ? `<path d="M${f(90 - w)} ${f(107 - 3 * usmev)} Q90 ${f(107 + 22 * usmev)} ${f(90 + w)} ${f(107 - 3 * usmev)} Q90 ${f(107 + 9 * usmev)} ${f(90 - w)} ${f(107 - 3 * usmev)} Z"/>` : "";
  let zuby = "";
  if (usmev > 0.5) for (let i = -3; i <= 3; i++) zuby += `M${f(90 + i * 6.4)} ${f(107 + 3.4 * usmev - Math.abs(i) * 1.1)} v${f(9 - Math.abs(i) * 1.5)} `;
  return (
    `<g filter="url(#${ID}-zar)" fill="#6FE6DA" opacity="${f(0.8 * o)}">${oci}${pusa}</g>` +
    `<g fill="#E9FFF8">${oci}${pusa}</g>` +
    [77, 103].map((x) => `<ellipse cx="${f(x + ox)}" cy="${f(92.6 + oy * 0.5)}" rx="1.5" ry="${f(Math.max(0.2, ry * 0.52))}" fill="#06141A"/>`).join("") +
    (zuby ? `<path d="${zuby}" stroke="#2A6A76" stroke-width="0.8" fill="none"/>` : "") +
    `<path d="M68 85 L86 88.6 M94 88.6 L112 85" stroke="#9FF0E6" stroke-width="1.5" stroke-linecap="round" fill="none" opacity="${f(o)}"/>`
  );
};
const vrstvaVpredu = (st) => (st.a > 3.04 ? bublinka(st) : "");
const vrstvaOnibi = (st) =>
  st.onibi
    .map((o) => (o.sila > 0.02 ? plaminek(o.x, o.y, o.smer, { id: ID, r: 3.4, delka: 11 + o.rychlost * 0.05, t: st.t, fz: o.fz, barva: "#DDF6F0", lem: "#58A9C4", sila: o.sila }) : ""))
    .join("");

const defs = () =>
  TUS.defs +
  bubDefs(ID, { pruhledna: 0.9, stred: "#F2ECE0", pas: "#DDD4C6", okraj: "#A89C90", lem: "#7C7068", tvare: "#C47A5E" }) +
  onibiDefs(ID) +
  ocasDefs(ID, { barva: "#DDD4C6", dole: 0 }) +
  [14, 52, 90, 128].map((x) => `<clipPath id="${ID}-pole-${x}"><rect x="${x}" y="${STENA.y0}" width="38" height="${STENA.y1 - STENA.y0}"/></clipPath>`).join("") +
  `<linearGradient id="${ID}-fusuma" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#201A20"/><stop offset="0.6" stop-color="#2A2226"/><stop offset="1" stop-color="#3A2E2A"/></linearGradient>` +
  `<linearGradient id="${ID}-tatami" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A2619"/><stop offset="1" stop-color="#3C3622"/></linearGradient>` +
  `<radialGradient id="${ID}-teplo"><stop offset="0" stop-color="#FFC878" stop-opacity="0.62"/><stop offset="0.4" stop-color="#F08A3C" stop-opacity="0.22"/><stop offset="1" stop-color="#E0582E" stop-opacity="0"/></radialGradient>` +
  `<linearGradient id="${ID}-vosk" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFF3D6"/><stop offset="0.55" stop-color="#F2DDB0"/><stop offset="1" stop-color="#C9A774"/></linearGradient>` +
  `<linearGradient id="${ID}-kour" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#B9B0BE" stop-opacity="0.8"/><stop offset="1" stop-color="#B9B0BE" stop-opacity="0"/></linearGradient>` +
  `<radialGradient id="${ID}-odspodu" cx="0.5" cy="1.15" r="0.8"><stop offset="0" stop-color="#FFC070" stop-opacity="0.85"/><stop offset="0.55" stop-color="#F08A3C" stop-opacity="0.22"/><stop offset="1" stop-color="#F08A3C" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="${ID}-chlad" cx="0.5" cy="0.42" r="0.62"><stop offset="0" stop-color="#C6FFF2" stop-opacity="0.5"/><stop offset="0.7" stop-color="#6FC6D6" stop-opacity="0.2"/><stop offset="1" stop-color="#3E7C8E" stop-opacity="0.34"/></radialGradient>` +
  `<filter id="${ID}-zar" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="3.2"/></filter>`;

/* ——— Simulace ——— */
const novaDynamika = () => ({
  /* začíná se u dvou posledních: stojí ve dveřích a je na ni vidět */
  hori: [0, 0, 0, 1, 1], zhasla: [-100, -100, -100, -100, -100], sfouk: null, faze: "hra", tFaze: 0, a: 3, dalsi: 4.6,
  vitr: [0, 0, 0, 0, 0], onibi: [-1, 1].map((k) => ({ x: 90 + k * 30, y: 96, vx: 0, vy: 0, smer: -Math.PI / 2, rychlost: 0, fz: k + 1, sila: 0 })),
  nahoda: rng(909), zvuk: [], pohled: [0, 0], smich: -100,
});
const kolikHori = (dyn) => dyn.hori.reduce((n, z) => n + (z > 0.5 ? 1 : 0), 0);
const sfoukni = (dyn, t, i) => {
  if (dyn.sfouk || dyn.hori[i] < 0.5) return;
  dyn.sfouk = { t0: t, i };
  dyn.zvuk.push({ druh: "fuu", sila: 0.9, pan: clamp((ZIVE[i].x - 90) / 80, -1, 1) });
};
const krok = (dyn, t, dt, vstup) => {
  const R = dyn.nahoda;
  /* plamínky uhýbají kurzoru */
  ZIVE.forEach((c, i) => {
    let cil = 0.12 * Math.sin(t * 0.7 + i * 1.9);
    if (vstup.mys) {
      const K = knot(c);
      const dx = K[0] - vstup.mys.x, d = Math.hypot(dx, K[1] - 4 - vstup.mys.y);
      cil += Math.sign(dx || 1) * clamp(1.4 - d / 26, 0, 1.2);
    }
    /* její dech jde od dveří: plamen lehne směrem ven */
    if (dyn.sfouk && dyn.sfouk.i === i) cil += (c.x < 90 ? -1 : 1) * 1.6 * smooth((t - dyn.sfouk.t0) / 0.3);
    dyn.vitr[i] = kCili(dyn.vitr[i], cil, dt, 0.12);
  });
  if (dyn.faze === "hra") {
    if (vstup.kliky && vstup.kliky.length) {
      const k = vstup.kliky[vstup.kliky.length - 1];
      vstup.kliky.length = 0;
      /* nejbližší hořící; prostřední až nakonec */
      let nej = -1, dNej = 1e9;
      const zbyva = kolikHori(dyn);
      ZIVE.forEach((c, i) => {
        if (dyn.hori[i] < 0.5 || (i === POCET - 1 && zbyva > 1)) return;
        const K = knot(c);
        const d = Math.hypot(K[0] - k.x, K[1] - k.y);
        if (d < dNej) [nej, dNej] = [i, d];
      });
      if (nej >= 0) {
        sfoukni(dyn, t, nej);
        dyn.dalsi = t + 6;
      }
    }
    if (t > dyn.dalsi) {
      const i = dyn.hori.findIndex((z) => z > 0.5);
      if (i >= 0) sfoukni(dyn, t, i);
      dyn.dalsi = t + 5.2 + R() * 1.6;
    }
    if (dyn.sfouk) {
      const u = t - dyn.sfouk.t0, i = dyn.sfouk.i;
      if (u > 0.3) dyn.hori[i] = Math.max(0, dyn.hori[i] - dt / 0.12);
      if (dyn.hori[i] <= 0) {
        dyn.zhasla[i] = t;
        dyn.sfouk = null;
        dyn.zvuk.push({ druh: "syk", sila: 0.5, pan: clamp((ZIVE[i].x - 90) / 80, -1, 1) });
        const zbyva = kolikHori(dyn);
        dyn.zvuk.push({ druh: "sunuti", sila: 0.7, pan: 0, za: 0.25 });
        if (zbyva === 0) {
          dyn.faze = "tma";
          dyn.tFaze = t;
          dyn.zvuk.push({ druh: "zjev", sila: 1, pan: 0, za: TMA_OCI });
          dyn.zvuk.push({ druh: "smich", sila: 0.8, pan: 0, za: 1.7 });
          dyn.onibi.forEach((o, j) => {
            o.x = 90 + (j ? 1 : -1) * 20;
            o.y = 112;
            o.vx = o.vy = 0;
          });
        }
      }
    }
  } else {
    if (vstup.kliky) vstup.kliky.length = 0;
    const u = t - dyn.tFaze;
    if (dyn.faze === "tma") {
      dyn.onibi.forEach((o, j) => {
        o.sila = kCili(o.sila, u > TMA_OCI ? 1 : 0, dt, 0.25);
        krokOnibi(o, [90 + (j ? 1 : -1) * (46 + 4 * Math.sin(t * 1.3 + j)), 104 + 8 * Math.sin(t * 1.1 + j * 2)], dt);
      });
      if (u > TMA_KONEC) {
        dyn.faze = "rozsvec";
        dyn.tFaze = t;
      }
    } else {
      /* bludičky oblétnou svíčky: jedna levé, druhá pravé, poslední spolu */
      const kolik = Math.floor((u - 0.2) / NA_SVICKU);
      for (let i = 0; i < POCET; i++) {
        if (i <= kolik && dyn.hori[i] === 0 && u - 0.2 - i * NA_SVICKU >= 0) {
          dyn.hori[i] = 0.02;
          dyn.zvuk.push({ druh: "zapal", vys: i * 3, sila: 0.9, pan: clamp((ZIVE[i].x - 90) / 80, -1, 1) });
        }
        if (dyn.hori[i] > 0 && dyn.hori[i] < 1) dyn.hori[i] = Math.min(1, dyn.hori[i] + dt / 0.3);
      }
      const cilI = clamp(kolik + 1, 0, POCET - 1);
      dyn.onibi.forEach((o, j) => {
        const mojeI = cilI === POCET - 1 ? cilI : cilI % 2 === j ? cilI : Math.min(POCET - 1, cilI + 1);
        const K = knot(ZIVE[mojeI]);
        krokOnibi(o, [K[0] + (j ? 3 : -3), K[1] - 5], dt, { tuhost: 60, tlumeni: 11 });
        o.sila = kCili(o.sila, kolik >= POCET ? 0 : 1, dt, 0.2);
      });
      if (u > 0.2 + POCET * NA_SVICKU + 0.9) {
        dyn.faze = "hra";
        dyn.dalsi = t + 4.5;
        dyn.onibi.forEach((o) => (o.sila = 0));
        dyn.zvuk.push({ druh: "klap", sila: 0.9, pan: 0 });
      }
    }
  }
  /* jak je blízko: podle toho, kolik svíček už nehoří */
  const cilA = dyn.faze === "tma" ? 5 : dyn.faze === "rozsvec" ? (t - dyn.tFaze < 0.3 ? 5 : 0) : POCET - kolikHori(dyn);
  dyn.a = kCili(dyn.a, cilA, dt, dyn.faze === "rozsvec" ? 0.42 : dyn.faze === "tma" ? 0.3 : 0.5);
  /* pohled: za kurzorem, při foukání na svíčku */
  const kde = naKroku(dyn.a);
  let kam = vstup.mys ? [vstup.mys.x, vstup.mys.y] : [90 + 50 * Math.sin(t * 0.37), 150];
  if (dyn.sfouk) kam = knot(ZIVE[dyn.sfouk.i]);
  const cp = [clamp((kam[0] - kde.x) / 34, -1, 1) * 2.3, clamp((kam[1] - kde.y) / 40, -1, 1) * 1.7];
  dyn.pohled = dyn.pohled.map((q, i) => kCili(q, cp[i], dt, 0.13));
};
const stav = (t, vstup = {}, dyn) => {
  const d = dyn || novaDynamika();
  const kde = naKroku(d.a);
  const svetla = d.hori.reduce((n, z) => n + z, 0);
  const u = t - d.tFaze;
  const vTme = d.faze === "tma";
  /* ve tmě je z ní vidět jen obličej; při rozsvěcení se vrací do těla */
  const temnota = vTme ? smooth(u / 0.5) : d.faze === "rozsvec" ? 1 - smooth(u / 0.7) : 0;
  const zjeveni = vTme ? smooth((u - TMA_OCI) / 0.5) : d.faze === "rozsvec" ? 1 - smooth(u / 0.4) : 0;
  let vyraz = "smug";
  if (d.sfouk) vyraz = "fuk";
  else if (d.faze === "rozsvec" && u > 0.6) vyraz = "smich";
  let dech = null;
  if (d.sfouk) {
    const c = ZIVE[d.sfouk.i];
    dech = { od: [kde.x, kde.y + kde.r * 0.3], kam: knot(c), u: t - d.sfouk.t0 };
  }
  return {
    t, a: d.a, kde, hori: d.hori, zhasla: d.zhasla, vitr: d.vitr, onibi: d.onibi, dech, temnota, zjeveni, vyraz,
    svit: clamp(svetla / POCET),
    tmaPokoje: clamp(0.66 * Math.pow(1 - svetla / POCET, 1.3) + (vTme ? 0.22 * smooth(u / 0.4) : 0), 0, 0.9),
    odspodu: clamp(d.hori[POCET - 1] * smooth((d.a - 3.2) / 0.8) * 0.9),
    chlad: clamp((d.a / 5) * 0.8 + 0.1),
    fig: { x: 0, y: 1.3 * Math.sin(t * 1.2) * (d.a > 3 ? 1.4 : 0.8), r: 1.5 * Math.sin(t * 0.8) },
    kyv: 2.2 * Math.sin(t * 1.7),
    pohled: d.pohled, mrk: mrkani(t, [1.3, 4.7, 4.95, 7.9], 9.3),
  };
};
const snimek = (st) => Math.floor(st.t * 30);

export const lemSvicky = {
  id: "svicky",
  viewBox: "0 0 180 180",
  defs,
  novaDynamika,
  krok,
  stav,
  hukot: (st) => ({ dron: clamp(0.2 + 0.16 * (st.a / 5) + 0.5 * st.temnota), ohen: 0.12 * st.svit }),
  klidne: { t: 2 },
  vrstvy: [
    { id: "pokoj", kresli: vrstvaPokoj, tezka: true },
    { id: "za-dvermi", kresli: vrstvaZaDvermi, klic: snimek, orez: OREZ },
    { id: "dvere", kresli: vrstvaDvere, klic: (st) => f(Math.round(st.kde.g * 400) / 400), orez: OREZ },
    { id: "tma", kresli: vrstvaTma, klic: (st) => f(Math.round(st.kde.g * 400) / 400), orez: OREZ, pruhlednost: (st) => f(st.tmaPokoje) },
    { id: "svetlo", kresli: vrstvaSvetlo, klic: snimek, orez: OREZ },
    { id: "vpredu", kresli: vrstvaVpredu, klic: snimek },
    { id: "svicky", kresli: vrstvaSvicky, orez: OREZ },
    { id: "plameny", kresli: vrstvaPlameny, klic: snimek },
    { id: "kour", kresli: vrstvaKour, klic: snimek, orez: OREZ },
    { id: "onibi", kresli: vrstvaOnibi, klic: snimek },
  ],
};
