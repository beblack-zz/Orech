/*
 * Návrh 3, Kami — VELKÝ STÍN
 * (odložený návrh: na stránce není a ./kresby.js ho neimportuje)
 *
 * „Tváří se nevinně, ale v peci ji nechceš.“ Bublinka sedí na polštáři
 * zabuton jako svatoušek: kulatá očka, čelenka, ručky svěšené. Za ní
 * stojí kulaté papírové stínítko a před ní hoří v misce bludný plamínek.
 * Co je vidět na papíře, je ale něco jiného: obrovský stín s rohy,
 * drápy a zubatou tlamou. Čelenka mu dělá třetí roh.
 *
 * Stín je pravda a ví to. Jakmile se po něm Bublinka ohlédne, je z něj
 * hodná kulička se svatozáří a křidélky — a jak se otočí zpátky,
 * vylézají mu zase rohy.
 *
 * Myš hýbe světlem: kam se kurzor nakloní, tam se plamínek ohne a stín
 * uteče na druhou stranu. Když kurzor ukáže na stín, Bublinka se ohlédne
 * (a nic nevidí). Kliknutí: stín udělá baf, ona nadskočí, ohlédne se
 * a pak si hvízdá, jako by nic.
 */
import {
  f, rng, clamp, lerp, smooth, rad, pt, cara, pasPoBodech, mrkani, jiskraD, jazyk, kCili, pres,
  bubDefs, bubTelo, bubLesk, bubTvar, bubCelenka, bubOcas, ocasDefs, filmPruhy, filmSamo, ruckaDucha, onibiDefs,
} from "./spolecne.js";

const ID = "bs3";
const B0 = [90, 116];
const R = 25;
const K = R / 46;
const POSTAVA = `translate(${B0[0]} ${B0[1]}) scale(${K}) translate(-90 -96)`;
const vPostave = (s) => `<g transform="${POSTAVA}">${s}</g>`;
const DISK = [90, 82], RD = 64;
const LAMPA = [90, 170.4];
/* stín: o kolik se promítne za ni a jak je velký vůči ní */
const DOSAH = 0.68, ZVETSENI = 1.3;
const TMA = "#2A2238";
const BAF = 0.75;

/* ——— Stín: všechno v jednotkách jejího poloměru, střed v počátku ——— */
const bezier = (P0, P1, P2, n = 10) => {
  const B = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    B.push([(1 - u) * (1 - u) * P0[0] + 2 * u * (1 - u) * P1[0] + u * u * P2[0], (1 - u) * (1 - u) * P0[1] + 2 * u * (1 - u) * P1[1] + u * u * P2[1]]);
  }
  return B;
};
const roh = (k, m, kyv) => {
  if (m < 0.05) return "";
  const B = bezier([k * 0.6, -0.68], [k * (1.0 + 0.2 * m), -0.8 - 0.5 * m], [k * (0.74 + 0.08 * kyv), -0.78 - 1.02 * m], 12);
  return `<path d="${pasPoBodech(B, (u) => 0.4 * Math.pow(1 - u, 0.9) * (0.5 + 0.5 * m))}"/>`;
};
const pazoura = (k, m, zved, kyv) => {
  if (m < 0.05) return "";
  const Sh = [k * 0.84, 0.2];
  const E = [k * (1.5 + 0.12 * zved), 0.16 - 0.3 * zved];
  const W = [k * (1.36 + 0.14 * zved + 0.04 * kyv), -0.62 - 0.26 * zved + 0.06 * kyv];
  const E2 = [lerp(Sh[0], E[0], m), lerp(Sh[1], E[1], m)], W2 = [lerp(Sh[0], W[0], m), lerp(Sh[1], W[1], m)];
  let s = `<path d="${pasPoBodech(bezier(Sh, E2, W2), (u) => lerp(0.3, 0.17, u))}"/><circle cx="${f(W2[0])}" cy="${f(W2[1])}" r="${f(0.15 * m)}"/>`;
  const smer = Math.atan2(W2[1] - E2[1], W2[0] - E2[0]) - k * 0.2;
  for (const o of [-0.9, -0.3, 0.3, 0.9]) {
    const a = smer + o * (1 + 0.3 * zved) + 0.1 * kyv * o;
    const n = [-Math.sin(a), Math.cos(a)];
    const L = (0.42 - Math.abs(o) * 0.08) * m;
    s += `<path d="M${pt([W2[0] + n[0] * 0.06, W2[1] + n[1] * 0.06])} Q${pt([W2[0] + Math.cos(a) * L * 0.7 + n[0] * 0.06 * k, W2[1] + Math.sin(a) * L * 0.7 + n[1] * 0.06 * k])} ${pt([W2[0] + Math.cos(a) * L, W2[1] + Math.sin(a) * L])} L${pt([W2[0] - n[0] * 0.06, W2[1] - n[1] * 0.06])} Z"/>`;
  }
  return s;
};
const kridlo = (k, s) => {
  if (s < 0.05) return "";
  let d = "";
  for (const [a, L, w] of [[-58, 0.62, 0.2], [-34, 0.56, 0.19], [-10, 0.44, 0.17]]) {
    const u = rad(k > 0 ? a : 180 - a);
    const c = [Math.cos(u), Math.sin(u)];
    const B = [[k * 0.86, -0.12], [k * 0.86 + c[0] * L * s * 0.5, -0.12 + c[1] * L * s * 0.5], [k * 0.86 + c[0] * L * s, -0.12 + c[1] * L * s]];
    d += `<path d="${pasPoBodech(bezier(B[0], B[1], B[2], 6), (q) => w * s * Math.sin(Math.PI * clamp(q * 0.86 + 0.1)) * 2)}"/>`;
  }
  return d;
};
/** Oči a tlama: díry ve stínu, kterými svítí papír. */
const dirySvetla = (st) => {
  const { m, baf, pohledStinu: [px, py], mrkStinu } = st;
  let s = "";
  if (m > 0.35) {
    const k = smooth((m - 0.35) / 0.4);
    const a = 0.23, h = (0.15 + 0.1 * baf) * k * (1 - mrkStinu * 0.92);
    for (const str of [-1, 1]) {
      s += `<g transform="translate(${f(str * 0.38)} -0.5) rotate(${f(str * -(18 - 6 * baf))})">` +
        `<path d="M${-a} 0 Q0 ${f(-h * 1.5)} ${a} 0 Q0 ${f(h)} ${-a} 0 Z" fill="url(#${ID}-dira)"/>` +
        (h > 0.04 ? `<ellipse cx="${f(px * 0.09)}" cy="${f(-h * 0.14 + py * 0.03)}" rx="${f(0.035 + 0.02 * baf)}" ry="${f(h * 0.62)}" fill="${TMA}"/>` : "") +
        `</g>`;
    }
    /* tlama: zuby jsou stín, který do díry zasahuje shora i zdola */
    const w = 0.56 + 0.06 * baf, y0 = -0.14, mezera = (0.15 + 0.42 * baf) * k, zub = 0.085 + 0.05 * baf;
    const N = 7;
    const zaklad = (x) => y0 - 0.15 * (x / w) * (x / w) * (1 - 0.6 * baf);
    const H = [], D = [];
    for (let i = 0; i <= 2 * N; i++) {
      const x = -w + (i / (2 * N)) * 2 * w;
      const kraj = Math.sin((Math.PI * i) / (2 * N));
      H.push([x, zaklad(x) + (i % 2 ? zub * kraj : 0)]);
      D.push([x, zaklad(x) + mezera * kraj + (i % 2 ? 0 : -zub * kraj * 0.9)]);
    }
    s += `<path d="${cara(H)} L${D.reverse().map(pt).join(" L")} Z" fill="url(#${ID}-dira)"/>`;
  }
  if (st.svata > 0.35) {
    /* hodná kulička: zavřená očka a úsměv */
    const k = smooth((st.svata - 0.35) / 0.4);
    s += `<path d="M-0.56 -0.46 Q-0.38 ${f(-0.46 - 0.2 * k)} -0.2 -0.46 M0.2 -0.46 Q0.38 ${f(-0.46 - 0.2 * k)} 0.56 -0.46 M-0.2 -0.12 Q0 ${f(-0.12 + 0.16 * k)} 0.2 -0.12" stroke="url(#${ID}-dira)" stroke-width="${f(0.075 * k)}" stroke-linecap="round" fill="none"/>`;
  }
  return s;
};
const stredStinu = (st) => [B0[0] + st.fig.x + (B0[0] + st.fig.x - st.svetlo[0]) * DOSAH, B0[1] + st.fig.y * 0.4 + (B0[1] - st.svetlo[1]) * DOSAH - 3 * st.baf];
const vrstvaStin = (st) => {
  const S = stredStinu(st);
  const r = R * ZVETSENI * st.velikost * (1 + 0.3 * st.baf) * (1 + 0.012 * Math.sin(st.t * 2.2));
  const { m, svata, baf } = st;
  const kyv = Math.sin(st.t * 1.6), kyv2 = Math.sin(st.t * 2.3 + 1);
  let tvar = `<circle r="1"/><path d="M-0.31 -0.84 L${f(0.02 * kyv)} -1.38 L0.31 -0.84 Z"/>`;
  tvar += roh(-1, m, kyv) + roh(1, m, -kyv);
  tvar += pazoura(-1, m, baf, kyv2) + pazoura(1, m, baf, -kyv2);
  tvar += kridlo(-1, svata) + kridlo(1, svata);
  if (svata > 0.05) tvar += `<ellipse cx="0" cy="${f(-1.56 - 0.03 * kyv)}" rx="${f(0.44 * svata)}" ry="${f(0.115 * svata)}" fill="none" stroke="${TMA}" stroke-width="0.085"/>`;
  const blik = 0.8 + 0.035 * Math.sin(st.t * 13) + 0.03 * Math.sin(st.t * 7.3);
  return (
    `<g clip-path="url(#${ID}-papir-orez)">` +
    `<g filter="url(#${ID}-mekky)" fill="${TMA}">` +
    /* polostín: plamínek není bod, stín má druhý, slabší okraj */
    `<g opacity="${f(blik * 0.26)}" transform="translate(${f(S[0] + 1.8 + 1.2 * Math.sin(st.t * 3.1))} ${f(S[1] - 1.4)}) scale(${f(r * 1.03)})">${tvar}</g>` +
    `<g opacity="${f(blik)}" transform="translate(${f(S[0])} ${f(S[1])}) scale(${f(r)})">${tvar}</g>` +
    `</g>` +
    `<g transform="translate(${f(S[0])} ${f(S[1])}) scale(${f(r)})">${dirySvetla(st)}</g>` +
    `</g>`
  );
};

/* ——— Stínítko, polštář a stolek ——— */
const vrstvaPapir = () => {
  const r = rng(52);
  let vlakna = "";
  for (let i = 0; i < 46; i++) {
    const a = r() * Math.PI * 2, q = Math.sqrt(r()) * (RD - 6);
    const x = DISK[0] + Math.cos(a) * q, y = DISK[1] + Math.sin(a) * q, u = r() * Math.PI, L = 3 + r() * 7;
    vlakna += `M${f(x)} ${f(y)} q${f(Math.cos(u) * L * 0.5 + (r() - 0.5) * 2)} ${f(Math.sin(u) * L * 0.5 + (r() - 0.5) * 2)} ${f(Math.cos(u) * L)} ${f(Math.sin(u) * L)} `;
  }
  return (
    /* visí na rumělkové šňůře s uzlem */
    `<path d="M90 18 V10" stroke="#8E2A1A" stroke-width="2.3" stroke-linecap="round"/><path d="M90 18 V10" stroke="#C4432B" stroke-width="1.4" stroke-linecap="round"/><circle cx="90" cy="7.6" r="2.6" fill="none" stroke="#C4432B" stroke-width="1.4"/><ellipse cx="90" cy="11.4" rx="2.2" ry="1.3" fill="#C4432B" stroke="#8E2A1A" stroke-width="0.4"/>` +
    `<circle cx="${DISK[0]}" cy="${DISK[1]}" r="${RD}" fill="#241B28" stroke="#120C14" stroke-width="0.8"/>` +
    `<circle cx="${DISK[0]}" cy="${DISK[1]}" r="${RD - 1.7}" fill="none" stroke="#D9B25E" stroke-width="0.5"/>` +
    `<circle cx="${DISK[0]}" cy="${DISK[1]}" r="${RD - 3.4}" fill="url(#${ID}-papir)" stroke="#8A6E54" stroke-width="0.5"/>` +
    `<path d="${vlakna}" stroke="#CBB98F" stroke-width="0.32" fill="none" stroke-linecap="round" opacity="0.7"/>` +
    `<circle cx="${DISK[0]}" cy="${DISK[1]}" r="${RD - 7.4}" fill="none" stroke="#C4432B" stroke-width="0.5" opacity="0.5"/>` +
    /* zlaté cvočky po obvodu rámu */
    `<g fill="#E2BE6A" stroke="#7A5A1E" stroke-width="0.25">${Array.from({ length: 12 }, (_, i) => `<circle cx="${f(DISK[0] + Math.cos(rad(i * 30 + 15)) * (RD - 1.7))}" cy="${f(DISK[1] + Math.sin(rad(i * 30 + 15)) * (RD - 1.7))}" r="0.95"/>`).join("")}</g>`
  );
};
const strapec = (x, y, uhel = 0) =>
  `<g transform="translate(${x} ${y}) rotate(${uhel})"><circle r="1.5" fill="#E2BE6A" stroke="#7A5A1E" stroke-width="0.4"/><path d="M-1.4 1 L-2.2 7.4 L2.2 7.4 L1.4 1 Z" fill="#D9A93E" stroke="#7A5A1E" stroke-width="0.4" stroke-linejoin="round"/><path d="M-0.8 2 V7 M0 2 V7.2 M0.8 2 V7" stroke="#8A6420" stroke-width="0.3"/></g>`;
const vrstvaPolstar = () => {
  let bubliny = "";
  const r = rng(9);
  for (let i = 0; i < 9; i++) bubliny += `<circle cx="${f(56 + i * 8.4 + r() * 2)}" cy="${f(163.6 + r() * 2.6)}" r="${f(0.8 + r() * 1.3)}"/>`;
  return (
    `<ellipse cx="90" cy="176.6" rx="50" ry="3.2" fill="#3A3550" opacity="0.2"/>` +
    /* lakový stolek s nožkami do oblouku, na zástěře zlaté bublinky */
    `<g filter="url(#${ID}-tah)"><path d="M49 168 Q50 175 45 176.4 H52.6 Q56 172 56.6 168 Z M131 168 Q130 175 135 176.4 H127.4 Q124 172 123.4 168 Z" fill="#1E1620" stroke="#0E0910" stroke-width="0.7" stroke-linejoin="round"/>` +
    `<rect x="46" y="160.4" width="88" height="8.4" rx="1.6" fill="url(#${ID}-lak)" stroke="#0E0910" stroke-width="0.8"/>` +
    `<path d="M48 162 H132" stroke="#C4432B" stroke-width="0.7"/><g fill="none" stroke="#E2BE6A" stroke-width="0.4">${bubliny}</g>` +
    /* polštář zabuton v barvách soumraku z loga */
    `<path d="M56 149 C70 146.4 110 146.4 124 149 C128 152 128 157.6 124 160.4 C110 162.6 70 162.6 56 160.4 C52 157.6 52 152 56 149 Z" fill="url(#${ID}-polstar)" stroke="#2A2248" stroke-width="0.9"/>` +
    `<path d="M57 151.4 C72 149.4 108 149.4 123 151.4" stroke="#8E7CC0" stroke-width="0.7" fill="none" opacity="0.8"/>` +
    `<path d="M66 155.6 q4 -2.4 8 0 q4 2.4 8 0 q4 -2.4 8 0 q4 2.4 8 0 q4 -2.4 8 0 q4 2.4 8 0" stroke="#D9B25E" stroke-width="0.45" fill="none" opacity="0.8"/>` +
    `<path d="M84 151 Q90 153.6 96 151" stroke="#2A2248" stroke-width="0.6" fill="none"/></g>` +
    strapec(55.4, 159.6, 24) + strapec(124.6, 159.6, -24)
  );
};
/* miska s olejem na nožce, v ní knot */
const vrstvaLampa = () =>
  `<g filter="url(#${ID}-tah)"><path d="M86.6 174 Q86 177 82 178.4 H98 Q94 177 93.4 174 Z" fill="#2A2420" stroke="#120E0C" stroke-width="0.6" stroke-linejoin="round"/>` +
  `<path d="M79.4 170.4 Q81 175 90 175 Q99 175 100.6 170.4 Z" fill="url(#${ID}-miska)" stroke="#120E0C" stroke-width="0.7"/>` +
  `<ellipse cx="90" cy="170.4" rx="10.6" ry="2" fill="#3A3A36" stroke="#120E0C" stroke-width="0.6"/><ellipse cx="90" cy="170.6" rx="8.6" ry="1.3" fill="#2E5868"/></g>` +
  `<path d="M83 170.6 Q86 169.8 89 170.4" stroke="#BFEAF0" stroke-width="0.5" fill="none" stroke-linecap="round" opacity="0.8"/>`;
/* bludný plamínek: ohýbá se za kurzorem */
const vrstvaPlamen = (st) => {
  const naklon = clamp((st.svetlo[0] - LAMPA[0]) / 30, -1, 1) * 0.9;
  let s = "";
  for (const [barva, kk, W, op] of [["#2F7C9E", 1, 7.6, 0.9], ["#7FD2DC", 0.76, 5.4, 1], ["#D6F7F0", 0.5, 3.6, 1], ["#FFFFFF", 0.26, 2, 1]]) {
    const { d } = jazyk({ B: [LAMPA[0], LAMPA[1] + 0.6], th0: -Math.PI / 2 + naklon * 0.4, L: (18 + 6 * st.baf) * kk * (1 + 0.07 * Math.sin(st.t * 8.3)), W: W * (1 + 0.3 * st.baf), c: naklon >= 0 ? 1 : -1, stoc: 1.3, stoupani: 0.5, t: st.t, w: 6.4, fz: 0.8, vitr: naklon * 0.7, vlna: 0.5 });
    s += `<path d="${d}" fill="${barva}" opacity="${op}"/>`;
  }
  return s;
};
const vrstvaZare = (st) =>
  `<circle cx="${LAMPA[0]}" cy="${LAMPA[1] - 8}" r="${f(46 + 8 * st.baf)}" fill="url(#${ID}-onibi-zare)" opacity="${f(0.7 + 0.05 * Math.sin(st.t * 13))}"/>`;

/* ——— Bublinka ——— */
const vrstvaOcas = (st) => `<g transform="translate(${f(st.fig.x)} ${f(st.fig.y * 0.5)})">${vPostave(bubOcas(ID, st.t, { delka: 34 - st.fig.y * 0.9, smer: 1, sirka: 46, fz: 0.6 }))}</g>`;
const vrstvaTelo = () => vPostave(bubTelo(ID) + `<circle cx="90" cy="96" r="45.2" fill="url(#${ID}-podsvit)"/>`);
const vrstvaFilm = (st) => vPostave(`<g clip-path="url(#${ID}-bublina)" mask="url(#${ID}-film-maska)" opacity="0.2">${filmPruhy(st, filmSamo(st.t))}</g>`);
const vrstvaLesk = () => vPostave(bubLesk());
const vrstvaCelenka = (st) => vPostave(bubCelenka({ kyv: st.kyv }));
const vrstvaTvar = (st) => {
  let s = bubTvar(ID, { dx: st.pohled[0], dy: st.pohled[1], mrk: st.mrk, vyraz: st.vyraz, tvare: 0.5 });
  /* noty, když si hvízdá */
  if (st.vyraz === "hvizd") {
    const u = st.poBafu - 2.3;
    for (const [z, dx] of [[0, 0], [0.42, 9]]) {
      const q = clamp((u - z) / 1.1);
      if (q <= 0 || q >= 1) continue;
      s += `<g transform="translate(${f(108 + dx + q * 14)} ${f(104 - q * 20 + Math.sin(q * 9) * 2)}) rotate(${f(-10 + q * 20)})" opacity="${f(Math.sin(Math.PI * q))}"><ellipse cx="0" cy="0" rx="3" ry="2.2" fill="#3A2E28" transform="rotate(-20)"/><path d="M2.6 -0.6 V-11 Q6 -9.6 6.6 -6" stroke="#3A2E28" stroke-width="1.3" fill="none" stroke-linecap="round"/></g>`;
    }
  }
  return vPostave(s);
};
const vrstvaRuce = (st) => {
  const zved = st.leknuti;
  return vPostave(
    ruckaDucha([47.6, 112], [35 - 3 * zved, 106 - 18 * zved], { uhel: 8 + 5 * Math.sin(st.t * 1.4) - 30 * zved, ohyb: 1, delka: 13 }) +
      ruckaDucha([132.4, 112], [145 + 3 * zved, 106 - 18 * zved], { uhel: -8 + 5 * Math.sin(st.t * 1.4 + 1.3) + 30 * zved, ohyb: -1, delka: 13 }),
  );
};
/* svatozář nad stínem cinkne hvězdičkami */
const vrstvaJiskry = (st) =>
  st.jiskry
    .map((j) => {
      const u = j.vek / j.zivot;
      return `<path d="${jiskraD(j.r * (1 - u * 0.4))}" transform="translate(${f(j.x)} ${f(j.y)}) rotate(${f(j.rot + u * 70)})" fill="#FFF3CF" stroke="#D9A93E" stroke-width="0.25" opacity="${f(clamp(Math.min(u / 0.1, (1 - u) / 0.5)))}"/>`;
    })
    .join("");

const defs = () =>
  bubDefs(ID, { pruhledna: 0.86 }) +
  onibiDefs(ID, { barva: "#7FC8E0", stred: "#C6F0F6" }) +
  ocasDefs(ID, { barva: "#F1E8DA", dole: 0.25 }) +
  `<radialGradient id="${ID}-papir" gradientUnits="userSpaceOnUse" cx="${DISK[0]}" cy="${DISK[1] + 50}" r="${RD * 1.9}"><stop offset="0" stop-color="#FFFBEC"/><stop offset="0.5" stop-color="#F6EBCF"/><stop offset="1" stop-color="#DDCBA2"/></radialGradient>` +
  `<radialGradient id="${ID}-dira" cx="0.5" cy="0.5" r="0.6"><stop offset="0" stop-color="#FFFDF2"/><stop offset="1" stop-color="#FBEFC8"/></radialGradient>` +
  `<clipPath id="${ID}-papir-orez"><circle cx="${DISK[0]}" cy="${DISK[1]}" r="${RD - 3.4}"/></clipPath>` +
  `<filter id="${ID}-mekky" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="0.55"/></filter>` +
  `<radialGradient id="${ID}-podsvit" cx="0.5" cy="1.12" r="0.74"><stop offset="0" stop-color="#9FE6F2" stop-opacity="0.7"/><stop offset="0.6" stop-color="#9FE6F2" stop-opacity="0.16"/><stop offset="1" stop-color="#9FE6F2" stop-opacity="0"/></radialGradient>` +
  `<linearGradient id="${ID}-lak" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3A2A34"/><stop offset="0.3" stop-color="#211820"/><stop offset="1" stop-color="#130D12"/></linearGradient>` +
  `<linearGradient id="${ID}-polstar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7C68B0"/><stop offset="0.5" stop-color="#5B4A8E"/><stop offset="1" stop-color="#3E3470"/></linearGradient>` +
  `<linearGradient id="${ID}-miska" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5A5650"/><stop offset="1" stop-color="#2A2622"/></linearGradient>`;

/* ——— Simulace ——— */
const novaDynamika = () => ({
  m: 1, baf: -100, vZone: 0, kouk: 7.5, bylaSvata: false, svetlo: [...LAMPA], velikost: 1, nahoda: rng(333), zvuk: [], pohled: [0, 0], jiskry: [],
});
const otocena = (dyn, t) => {
  const ub = t - dyn.baf;
  return dyn.vZone > 0.4 || (ub > BAF && ub < 2.3) || (t > dyn.kouk && t < dyn.kouk + 2);
};
const krok = (dyn, t, dt, vstup) => {
  const Rr = dyn.nahoda;
  /* světlo: plamínek se nakloní za kurzorem; čím je kurzor níž (blíž), tím je stín větší */
  let cil = [LAMPA[0] + 5 * Math.sin(t * 0.5), LAMPA[1]], vel = 1;
  if (vstup.mys) {
    cil = [LAMPA[0] + clamp((vstup.mys.x - 90) * 0.42, -26, 26), LAMPA[1]];
    vel = lerp(0.9, 1.14, clamp((vstup.mys.y - 20) / 150));
  }
  dyn.svetlo = [kCili(dyn.svetlo[0], cil[0], dt, 0.22), LAMPA[1]];
  dyn.velikost = kCili(dyn.velikost, vel, dt, 0.3);
  /* ukazuje kurzor na stín? */
  const naStinu = vstup.mys && vstup.mys.y < B0[1] - 22 && Math.hypot(vstup.mys.x - DISK[0], vstup.mys.y - DISK[1]) < RD;
  dyn.vZone = naStinu ? dyn.vZone + dt : Math.max(0, dyn.vZone - dt * 3);
  const ub0 = t - dt - dyn.baf, ub = t - dyn.baf;
  if (vstup.kliky && vstup.kliky.length) {
    vstup.kliky.length = 0;
    if (ub > 2.6) {
      dyn.baf = t;
      dyn.m = 1;
      dyn.vZone = 0;
      dyn.zvuk.push({ druh: "buu", sila: 1, pan: 0 });
      dyn.zvuk.push({ druh: "papir", sila: 0.9, pan: 0, za: 0.05 });
      dyn.zvuk.push({ druh: "hvizd", sila: 0.7, pan: 0, za: 2.4 });
      dyn.kouk = t + 9;
    }
  }
  /* sama se občas podezíravě ohlédne */
  if (!vstup.mys && t > dyn.kouk + 2) dyn.kouk = t + 6.5 + Rr() * 4;
  const ot = otocena(dyn, t);
  /* stín: jakmile se ohlédne, je hned hodný; rohy mu rostou zpátky pomalu a až po chvilce */
  if (ub >= 0 && ub < BAF) dyn.m = 1;
  else if (ot) {
    dyn.m = kCili(dyn.m, 0, dt, 0.06);
    dyn.klid = t;
  } else if (t - (dyn.klid ?? -100) > 0.45) dyn.m = kCili(dyn.m, 1, dt, 0.55);
  const svata = dyn.m < 0.3;
  if (svata && !dyn.bylaSvata) {
    dyn.zvuk.push({ druh: "aureola", sila: 0.8, pan: 0 });
    for (let i = 0; i < 7; i++) dyn.jiskry.push({ x: 90 + (Rr() - 0.5) * 44, y: 22 + Rr() * 16, vx: (Rr() - 0.5) * 8, vy: -2 - Rr() * 6, vek: -Rr() * 0.3, zivot: 0.9 + Rr() * 0.7, r: 1.1 + Rr() * 1.4, rot: Rr() * 90 });
  }
  if (!svata && dyn.bylaSvata && !(ub >= 0 && ub < BAF)) dyn.zvuk.push({ druh: "vrr", sila: 0.6, pan: 0, za: 0.5 });
  dyn.bylaSvata = svata;
  for (const j of dyn.jiskry) {
    j.vek += dt;
    if (j.vek > 0) {
      j.x += j.vx * dt;
      j.y += j.vy * dt;
    }
  }
  dyn.jiskry = dyn.jiskry.filter((j) => j.vek < j.zivot);
  /* pohled: při ohlédnutí nahoru za sebe, při hvízdání do strany, jinak za kurzorem */
  let kam = vstup.mys ? [clamp((vstup.mys.x - B0[0]) / 40, -1, 1) * 2.1, clamp((vstup.mys.y - B0[1]) / 40, -1, 1) * 1.5] : [Math.sin(t * 0.4) * 0.9, 0.2];
  if (ot) kam = [dyn.vZone > 0.4 && vstup.mys ? clamp((vstup.mys.x - B0[0]) / 30, -1, 1) * 1.8 : 0.6, -1.8];
  else if (ub > 2.3 && ub < 4) kam = [-2.2, -0.9];
  dyn.pohled = dyn.pohled.map((q, i) => kCili(q, kam[i], dt, 0.1));
  if (pres(ub0, ub, 0.1)) dyn.zvuk.push({ druh: "pisk", sila: 0.6, pan: 0 });
};
const stav = (t, vstup = {}, dyn) => {
  const d = dyn || novaDynamika();
  const ub = t - d.baf;
  const baf = ub >= 0 && ub < BAF ? Math.pow(Math.sin(Math.PI * clamp(ub / BAF)), 0.6) : 0;
  const leknuti = ub >= 0.06 && ub < 0.9 ? Math.sin(Math.PI * clamp((ub - 0.06) / 0.84)) : 0;
  const ot = otocena(d, t);
  let vyraz = "nevinna";
  if (ub >= 0.06 && ub < BAF) vyraz = "leknuti";
  else if (ot) vyraz = "uzas";
  else if (ub >= 2.3 && ub < 4) vyraz = "hvizd";
  return {
    t, m: d.m, svata: 1 - smooth(d.m / 0.6), baf, leknuti, poBafu: ub, vyraz, svetlo: d.svetlo, velikost: d.velikost, jiskry: d.jiskry,
    fig: { x: 0, y: 1.5 * Math.sin(t * 1.3) - 6 * leknuti, r: 1.2 * Math.sin(t * 0.8) + (ub >= 0 && ub < BAF ? Math.sin(ub * 46) * 2.4 * (1 - ub / BAF) : 0) },
    kyv: 2 * Math.sin(t * 1.7) + 10 * leknuti * Math.sin(t * 30),
    trese: ub >= 0 && ub < 0.9 ? Math.sin(ub * 44) * 1.1 * (1 - ub / 0.9) : 0,
    pohled: d.pohled, mrk: mrkani(t, [2.6, 6.1, 6.36, 9.2], 10.4),
    pohledStinu: vstup.mys ? [clamp((vstup.mys.x - 90) / 50, -1, 1), clamp((vstup.mys.y - 70) / 60, -1, 1)] : [Math.sin(t * 0.6), 0.4],
    mrkStinu: mrkani(t, [1.3, 4.4, 8.1], 9.1),
  };
};
const snimek = (st) => Math.floor(st.t * 30);
const pohyb = (st) => ({ x: st.fig.x, y: st.fig.y, r: st.fig.r, ox: B0[0], oy: B0[1] });
/* papír se při bafnutí zachvěje */
const tresPapiru = (st) => ({ x: 0, y: 0, r: st.trese, ox: DISK[0], oy: 150 });

export const kamiStin = {
  id: "stin",
  viewBox: "0 0 180 180",
  defs,
  novaDynamika,
  krok,
  stav,
  hukot: (st) => ({ dron: clamp(0.25 + 0.5 * st.m + 0.4 * st.baf) }),
  klidne: { t: 3 },
  vrstvy: [
    { id: "papir", kresli: vrstvaPapir, tezka: true, pohyb: tresPapiru },
    { id: "stin", kresli: vrstvaStin, klic: snimek, pohyb: tresPapiru },
    { id: "jiskry", kresli: vrstvaJiskry, klic: snimek },
    { id: "polstar", kresli: vrstvaPolstar, tezka: true },
    { id: "ocas", kresli: vrstvaOcas, klic: snimek },
    { id: "telo", kresli: vrstvaTelo, tezka: true, pohyb },
    { id: "film", kresli: vrstvaFilm, klic: (st) => Math.floor(st.t * 15), pohyb },
    { id: "lesk", kresli: vrstvaLesk, pohyb },
    { id: "celenka", kresli: vrstvaCelenka, klic: (st) => f(Math.round(st.kyv * 4) / 4), pohyb },
    { id: "tvar", kresli: vrstvaTvar, klic: (st) => `${f(st.pohled[0])},${f(st.pohled[1])},${f(st.mrk)},${st.vyraz}${st.vyraz === "hvizd" ? snimek(st) : ""}`, pohyb },
    { id: "ruce", kresli: vrstvaRuce, klic: snimek, pohyb },
    { id: "zare", kresli: vrstvaZare, klic: (st) => Math.floor(st.t * 20) },
    { id: "lampa", kresli: vrstvaLampa, tezka: true },
    { id: "plamen", kresli: vrstvaPlamen, klic: snimek },
  ],
};
