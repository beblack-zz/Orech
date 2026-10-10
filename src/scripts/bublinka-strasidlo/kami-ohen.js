/*
 * 01, Kami — STUDENÝ OHEŇ
 *
 * Pecinčina plamenná svatozář naruby. Za Fudóem hoří kaen kóhai z rumělky
 * a zlata; za Bublinkou hoří totéž, jen studeně: bludné ohně onibi
 * v indigu a tyrkysu se stříbrnými linkami, kotouč je noční lak se
 * stříbrným kirikane a měsíci dokola.
 *
 * V kotouči za ní stojí duch: velký, rohatý, s drápy a zubatou tlamou.
 * Na tmavém laku je z něj vidět hlavně to, co svítí — oči a zuby —
 * a obrys tam, kde zakrývá stříbro. Bublinka před ním lítá jako bublina
 * v černém slaměném klobouku a tváří se, že o ničem neví. Duch to ví
 * taky: jakmile se po něm ohlédne, je z něj hodná kulička se svatozáří
 * a křidélky, a jak se otočí zpátky, vylézají mu zase rohy.
 *
 * Skálu iwakura nahradila hromádka prasklých mis a džbánů obrostlých
 * mechem — z každé dílny u staré pece zbyla halda nepodarků, monohara.
 * V mechu svítí houby tsukijotake, které doopravdy světélkují.
 *
 * Myš je vítr: plameny se od ní odklánějí, a když se jí rychle mávne,
 * oheň se rozdmýchá. Když kurzor ukáže na ducha, Bublinka se ohlédne
 * (a nic nevidí). Kliknutí: duch udělá baf, ona svatozář sfoukne —
 * chvíli svítí jen houby a jeho oči a zuby — a plameny pak naskakují
 * jeden po druhém dokola.
 */
import {
  f, rng, clamp, lerp, smooth, rad, pt, cara, pasPoBodech, hrouda, mrkani, jiskraD, jazyk, kCili,
  bubDefs, bubTelo, bubLesk, bubTvar, bubKlobouk, filmPruhy, filmSamo, ruckaDucha, plaminek, onibiDefs, krokOnibi,
} from "./spolecne.js";

const ID = "bs1";
const B0 = [90, 112.6];
const R = 24;
const K = R / 46;
const POSTAVA = `translate(${B0[0]} ${B0[1]}) scale(${K}) translate(-90 -96)`;
const vPostave = (s) => `<g transform="${POSTAVA}">${s}</g>`;
const C = [90, 92], R0 = 46;
/* duch je jen v kotouči */
const SKLO = R0 - 0.6;
const DUCH = { stred: [90, 78.6], r: 22.5 };
const TMA = "#0A0F2E";
const SVIT = "#E9FFF8";

/* Sfouknutí: zhasne od temene do stran, po pauze naskakuje zleva dokola */
const ZNOVU = 1.5, OBEH = 1.9, KONEC = ZNOVU + OBEH + 0.5;
const POCET_TONU = 16;
const poradi = (a) => clamp((a - 158) / 224);
const uroven = (a, u) => {
  if (u < 0 || u > KONEC) return 1;
  const p = poradi(a);
  const zhasni = 1 - smooth((u - 0.3 - 0.3 * Math.abs(p - 0.5)) / 0.22);
  const rozsvit = smooth((u - (ZNOVU + p * OBEH)) / 0.34);
  return Math.max(zhasni, rozsvit);
};
/** Čerstvě zapálený jazyk na chvilku vyšlehne. */
const vyslehnuti = (a, u) => {
  if (u < 0 || u > KONEC + 0.6) return 0;
  const v = u - (ZNOVU + poradi(a) * OBEH);
  return v > 0 && v < 0.7 ? Math.sin(Math.PI * v / 0.7) : 0;
};
/** Jak moc je tma: 1, když nehoří nic. */
const tma = (u) => (u < 0 || u > KONEC ? 0 : smooth((u - 0.3) / 0.4) * (1 - smooth((u - ZNOVU) / OBEH)));

/* Jazyky ve čtyřech vrstvách: indigový lak vně, mořská modř, tyrkys, bílé jádro */
const Rn = rng(2718);
const VRSTVY = [
  { id: "vne", od: 158, krok: 14.7, delka: [13, 36], W: 15.5 },
  { id: "mod", od: 165, krok: 14.7, delka: [9.5, 25], W: 11.5 },
  { id: "tyr", od: 158, krok: 14.7, delka: [6.5, 16], W: 8 },
  { id: "jad", od: 165, krok: 14.7, delka: [3.6, 9], W: 5 },
].map((v) => {
  const jazyky = [];
  for (let a = v.od; a <= 382 - (v.od - 158); a += v.krok) {
    const nahore = clamp(-Math.sin(rad(a)));
    const levy = a < 270;
    jazyky.push({
      a,
      L0: v.delka[0] + v.delka[1] * Math.pow(nahore, 2.2),
      c: (levy ? 1 : -1) * (Rn() < 0.22 ? -0.55 : 1),
      w: 1.5 + Rn() * 1.2,
      fz: Rn() * 6.28,
      w1: 0.9 + Rn() * 0.9,
      f1: Rn() * 6.28,
    });
  }
  return { ...v, jazyky };
});
const BARVY = { vne: "#1C2A63", mod: `url(#${ID}-mod)`, tyr: `url(#${ID}-tyr)`, jad: "#EAFBF2" };

const plamenyVrstva = (v, st) => {
  let s = "", stribro = "";
  for (const j of v.jazyky) {
    const h = uroven(j.a, st.fuk);
    if (h < 0.03) continue;
    const a = rad(j.a);
    const B = [C[0] + Math.cos(a) * (R0 - 3), C[1] + Math.sin(a) * (R0 - 3)];
    const k = 0.42;
    const th0 = Math.atan2(Math.sin(a) * (1 - k) - k, Math.cos(a) * (1 - k));
    const nahore = clamp(-Math.sin(a));
    const sleh = vyslehnuti(j.a, st.fuk);
    const L = j.L0 * (0.74 + 0.36 * st.I) * (1 + 0.12 * Math.sin(st.t * j.w1 + j.f1)) * h * (1 + 0.42 * sleh);
    /* bludný oheň se vlní víc a pomaleji než ten z pece */
    const { d, body } = jazyk({
      B, th0, L, W: v.W * (0.85 + 0.2 * st.I) * (0.4 + 0.6 * h), c: j.c, t: st.t, w: j.w, fz: j.fz,
      vitr: st.vitr * (0.55 + 0.45 * nahore), stoupani: 0.82, stoc: 2.15, N: 16, vlna: 0.36,
    });
    s += `<path d="${d}"/>`;
    if (v.id === "vne" && h > 0.5) stribro += `<path d="${cara(body.slice(3, -2))}"/>`;
  }
  return (
    `<g fill="${BARVY[v.id]}"${v.id === "vne" ? ` stroke="#0E1638" stroke-width="0.6" stroke-linejoin="round"` : ""}>${s}</g>` +
    (stribro ? `<g fill="none" stroke="#DCE8F4" stroke-width="0.5" stroke-linecap="round" opacity="0.9">${stribro}</g>` : "")
  );
};
const vrstvaPlameny = (st) => `<circle cx="${C[0]}" cy="${C[1]}" r="${R0 + 4}" fill="#1C2A63"/>` + VRSTVY.map((v) => plamenyVrstva(v, st)).join("");

/* Kotouč za zády: noční lak, tyrkysové a stříbrné prstence, vzorek kirikane a měsíce dokola */
const vrstvaKotouc = () => {
  let mesice = "";
  for (let i = 0; i < 16; i++) {
    const u = rad(i * 22.5 - 90);
    const [x, y] = [C[0] + Math.cos(u) * (R0 - 9.3), C[1] + Math.sin(u) * (R0 - 9.3)];
    /* fáze: nahoře úplněk, dole nov */
    const faze = Math.cos(rad(i * 22.5)) * 0.5 + 0.5;
    mesice += `<circle cx="${f(x)}" cy="${f(y)}" r="1.5" fill="#DCE8F4"/>`;
    if (faze < 0.97) mesice += `<circle cx="${f(x + (i < 8 ? -1 : 1) * 3 * faze)}" cy="${f(y)}" r="1.56" fill="#18214F"/>`;
  }
  return (
    `<circle cx="${C[0]}" cy="${C[1]}" r="${R0}" fill="url(#${ID}-kotouc)" stroke="#0C1230" stroke-width="0.9"/>` +
    `<circle cx="${C[0]}" cy="${C[1]}" r="${R0}" fill="url(#${ID}-kirikane)" opacity="0.4"/>` +
    `<circle cx="${C[0]}" cy="${C[1]}" r="${R0 - 3.2}" fill="none" stroke="#3FA7A8" stroke-width="1.4"/>` +
    `<circle cx="${C[0]}" cy="${C[1]}" r="${R0 - 5.6}" fill="none" stroke="#C9D8EA" stroke-width="0.5" stroke-dasharray="6 1.4 1.4 1.4"/>` +
    `<g clip-path="url(#${ID}-kotouc-orez)">${mesice}</g>` +
    `<circle cx="${C[0]}" cy="${C[1]}" r="${R0 - 13}" fill="none" stroke="#3FA7A8" stroke-width="0.6" opacity="0.7"/>` +
    `<g stroke="#E6F2FA" stroke-width="0.45" opacity="0.5">${Array.from({ length: 36 }, (_, i) => {
      const u = rad(i * 10 + 5);
      return `<path d="M${pt([C[0] + Math.cos(u) * (R0 - 20), C[1] + Math.sin(u) * (R0 - 20)])} L${pt([C[0] + Math.cos(u) * (R0 - 14.4), C[1] + Math.sin(u) * (R0 - 14.4)])}"/>`;
    }).join("")}</g>`
  );
};

/* ——— Duch v kotouči: všechno v jednotkách jeho poloměru, střed v počátku ——— */
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
  const B = bezier([k * 0.6, -0.68], [k * (1.0 + 0.12 * m), -0.78 - 0.3 * m], [k * (0.74 + 0.08 * kyv), -0.72 - 0.56 * m], 12);
  return `<path d="${pasPoBodech(B, (u) => 0.4 * Math.pow(1 - u, 0.9) * (0.5 + 0.5 * m))}"/>`;
};
const pazoura = (k, m, zved, kyv) => {
  if (m < 0.05) return "";
  const Sh = [k * 0.84, 0.2];
  const E = [k * (1.3 + 0.08 * zved), 0.12 - 0.26 * zved];
  const W = [k * (1.12 + 0.1 * zved + 0.04 * kyv), -0.6 - 0.2 * zved + 0.06 * kyv];
  const E2 = [lerp(Sh[0], E[0], m), lerp(Sh[1], E[1], m)], W2 = [lerp(Sh[0], W[0], m), lerp(Sh[1], W[1], m)];
  let s = `<path d="${pasPoBodech(bezier(Sh, E2, W2), (u) => lerp(0.3, 0.17, u))}"/><circle cx="${f(W2[0])}" cy="${f(W2[1])}" r="${f(0.15 * m)}"/>`;
  const smer = Math.atan2(W2[1] - E2[1], W2[0] - E2[0]) - k * 0.2;
  for (const o of [-0.9, -0.3, 0.3, 0.9]) {
    const a = smer + o * (1 + 0.3 * zved) + 0.1 * kyv * o;
    const n = [-Math.sin(a), Math.cos(a)];
    const L = (0.38 - Math.abs(o) * 0.08) * m;
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
/** Oči a tlama: jediné, co na duchovi svítí. `vypln` je barva. */
const dirySvetla = (st, vypln) => {
  const { m, baf, pohledDucha: [px, py], mrkDucha } = st;
  let s = "";
  if (m > 0.35) {
    const k = smooth((m - 0.35) / 0.4);
    const a = 0.23, h = (0.15 + 0.1 * baf) * k * (1 - mrkDucha * 0.92);
    for (const str of [-1, 1]) {
      s += `<g transform="translate(${f(str * 0.38)} -0.5) rotate(${f(str * -(18 - 6 * baf))})">` +
        `<path d="M${-a} 0 Q0 ${f(-h * 1.5)} ${a} 0 Q0 ${f(h)} ${-a} 0 Z" fill="${vypln}"/>` +
        (h > 0.04 ? `<ellipse cx="${f(px * 0.09)}" cy="${f(-h * 0.14 + py * 0.03)}" rx="${f(0.035 + 0.02 * baf)}" ry="${f(h * 0.62)}" fill="${TMA}"/>` : "") +
        `</g>`;
    }
    /* tlama: zuby jsou tma, která do díry zasahuje shora i zdola */
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
    s += `<path d="${cara(H)} L${D.reverse().map(pt).join(" L")} Z" fill="${vypln}"/>`;
  }
  if (st.svata > 0.35) {
    /* hodná kulička: zavřená očka a úsměv */
    const k = smooth((st.svata - 0.35) / 0.4);
    s += `<path d="M-0.56 -0.46 Q-0.38 ${f(-0.46 - 0.2 * k)} -0.2 -0.46 M0.2 -0.46 Q0.38 ${f(-0.46 - 0.2 * k)} 0.56 -0.46 M-0.2 -0.12 Q0 ${f(-0.12 + 0.16 * k)} 0.2 -0.12" stroke="${vypln}" stroke-width="${f(0.075 * k)}" stroke-linecap="round" fill="none"/>`;
  }
  return s;
};
const vrstvaDuch = (st) => {
  const S = [DUCH.stred[0] + st.uhyb, DUCH.stred[1] + st.fig.y * 0.3 - 1.6 * st.baf];
  const r = DUCH.r * (1 + 0.16 * st.baf) * (1 + 0.012 * Math.sin(st.t * 2.2));
  const { m, svata, baf } = st;
  const kyv = Math.sin(st.t * 1.6), kyv2 = Math.sin(st.t * 2.3 + 1);
  /* dolů nekončí koulí: tělo se rozplývá, jako u duchů bez nohou */
  let tvar = `<path d="M-1 0 C-1.04 0.7 -1.12 1.4 -1.24 2.2 H1.24 C1.12 1.4 1.04 0.7 1 0 Z" fill="url(#${ID}-duch-dole)"/><circle r="1"/>`;
  tvar += roh(-1, m, kyv) + roh(1, m, -kyv);
  tvar += pazoura(-1, m, baf, kyv2) + pazoura(1, m, baf, -kyv2);
  tvar += kridlo(-1, svata) + kridlo(1, svata);
  /* svatozář hodné kuličky svítí jako oči, jinak by na tmavém laku nebyla vidět */
  const aureola = svata > 0.05 ? `<ellipse cx="0" cy="${f(-1.42 - 0.03 * kyv)}" rx="${f(0.44 * svata)}" ry="${f(0.115 * svata)}" fill="none" stroke="${SVIT}" stroke-width="0.075" opacity="${f(svata)}"/>` : "";
  const blik = 0.88 + 0.03 * Math.sin(st.t * 13) + 0.025 * Math.sin(st.t * 7.3);
  const posun = `transform="translate(${f(S[0])} ${f(S[1])}) scale(${f(r)})"`;
  return (
    `<g clip-path="url(#${ID}-sklo)">` +
    `<g filter="url(#${ID}-mekky)" fill="${TMA}" opacity="${f(blik)}"><g ${posun}>${tvar}</g></g>` +
    /* oči a zuby svítí samy; když oheň zhasne, tím víc */
    `<g filter="url(#${ID}-zar-oci)" opacity="${f(0.5 + 0.5 * st.tma)}"><g ${posun}>${dirySvetla(st, "#7FE9DD")}${aureola}</g></g>` +
    `<g ${posun}>${dirySvetla(st, SVIT)}${aureola}</g>` +
    `</g>`
  );
};
/* svatozář nad duchem cinkne hvězdičkami */
const vrstvaHvezdy = (st) =>
  st.hvezdy
    .map((j) => {
      if (j.vek < 0) return "";
      const u = j.vek / j.zivot;
      return `<path d="${jiskraD(j.r * (1 - u * 0.4))}" transform="translate(${f(j.x)} ${f(j.y)}) rotate(${f(j.rot + u * 70)})" fill="#FFF3CF" stroke="#C99A2E" stroke-width="0.3" opacity="${f(clamp(Math.min(u / 0.1, (1 - u) / 0.5)))}"/>`;
    })
    .join("");

/* ——— Hromádka nepodarků ——— */
const OBRYS = "#463C36";
/** Klikatá prasklina z bodu dolů. */
const prasklina = (x, y, seed, { kroku = 5, krokY = 5, sirka = 3.4 } = {}) => {
  const r = rng(seed);
  const B = [[x, y]];
  for (let i = 0; i < kroku; i++) {
    x += (r() - 0.5) * 2 * sirka;
    y += krokY * (0.7 + r() * 0.6);
    B.push([x, y]);
  }
  return cara(B);
};
const trava = (x, y, seed, { n = 5, vyska = 7, barva = "#5E7A46" } = {}) => {
  const r = rng(seed);
  let d = "";
  for (let i = 0; i < n; i++) {
    const dx = (i - (n - 1) / 2) * 1.5 + (r() - 0.5);
    const h = vyska * (0.6 + r() * 0.6);
    d += `M${f(x + dx * 0.5)} ${y} Q${f(x + dx * 0.8)} ${f(y - h * 0.6)} ${f(x + dx * 2.2)} ${f(y - h)} `;
  }
  return `<path d="${d}" stroke="${barva}" stroke-width="0.8" stroke-linecap="round" fill="none"/>`;
};
const mech = (cx, cy, rx, ry, seed) => {
  const r = rng(seed + 50);
  let tecky = "";
  for (let i = 0; i < Math.round(rx * 1.3); i++) {
    const a = r() * Math.PI * 2, q = Math.sqrt(r()) * 0.82;
    tecky += `<circle cx="${f(cx + Math.cos(a) * rx * q)}" cy="${f(cy + Math.sin(a) * ry * q - ry * 0.12)}" r="${f(0.5 + r() * 0.6)}"/>`;
  }
  return (
    `<path d="${hrouda(cx, cy, rx, ry, seed, { bodu: 11, kolisani: 0.16 })}" fill="#587544" stroke="#3C5231" stroke-width="0.7"/>` +
    `<path d="${hrouda(cx - rx * 0.12, cy - ry * 0.22, rx * 0.7, ry * 0.55, seed + 3, { bodu: 9, kolisani: 0.18 })}" fill="#7C9A56"/>` +
    `<g fill="#A9C472">${tecky}</g>`
  );
};
/* houby tsukijotake: kde rostou a jak jsou velké */
const HOUBY = [[66.4, 171.6, 1], [70.6, 173, 0.75], [62.6, 173.4, 0.6], [119, 168.6, 0.9], [123.4, 170.4, 0.65], [27.6, 172.4, 0.8], [31.4, 173.8, 0.55], [154.6, 173.6, 0.7]];
const houba = ([x, y, s]) =>
  `<path d="M${f(x - 0.7 * s)} ${f(y)} L${f(x - 0.5 * s)} ${f(y - 3.4 * s)} H${f(x + 0.5 * s)} L${f(x + 0.7 * s)} ${f(y)} Z" fill="#E6F4D8" stroke="#6F8A62" stroke-width="0.4"/>` +
  `<path d="M${f(x - 3.4 * s)} ${f(y - 3.2 * s)} Q${f(x)} ${f(y - 7.4 * s)} ${f(x + 3.4 * s)} ${f(y - 3.2 * s)} Q${f(x)} ${f(y - 2.2 * s)} ${f(x - 3.4 * s)} ${f(y - 3.2 * s)} Z" fill="#CFEFC0" stroke="#6F8A62" stroke-width="0.5" stroke-linejoin="round"/>` +
  `<path d="M${f(x - 2 * s)} ${f(y - 4 * s)} Q${f(x - 0.6 * s)} ${f(y - 5.8 * s)} ${f(x + 0.8 * s)} ${f(y - 5.6 * s)}" stroke="#F6FFE9" stroke-width="${f(0.6 * s)}" stroke-linecap="round" fill="none"/>`;

const vrstvaHromada = () => {
  let s = `<ellipse cx="90" cy="175.2" rx="66" ry="4.6" fill="#3A3550" opacity="0.2"/>`;
  s += `<g filter="url(#${ID}-tah)" stroke-linejoin="round">`;
  /* vzadu: láhev na saké a hrdlo džbánu, které kouká z hromady */
  s += `<g transform="translate(118 160) rotate(24)"><path d="M-5 0 C-7.6 -6 -7 -14 -3 -17 L-2.2 -22 Q-3.4 -24 -2.6 -25 H2.6 Q3.4 -24 2.2 -22 L3 -17 C7 -14 7.6 -6 5 0 Z" fill="url(#${ID}-seda)" stroke="${OBRYS}" stroke-width="0.8"/><path d="M-6.4 -9 Q0 -6 6.4 -9.6 M-6.8 -5 Q0 -2.4 6.6 -5.4" stroke="#E9E2D0" stroke-width="1.5" fill="none" opacity="0.7"/><ellipse cx="0" cy="-25" rx="2.6" ry="0.8" fill="#2A211C"/></g>`;
  s += `<g transform="translate(60 158) rotate(-20)"><path d="M-9 0 C-13 -6 -11 -15 -6 -18 L-6.6 -21 H6.6 L6 -18 C11 -15 13 -6 9 0 Z" fill="url(#${ID}-celadon)" stroke="${OBRYS}" stroke-width="0.8"/><ellipse cx="0" cy="-21" rx="6.6" ry="1.5" fill="#26302C" stroke="${OBRYS}" stroke-width="0.6"/><path d="${prasklina(2, -18, 5, { kroku: 3, krokY: 5, sirka: 3 })}" stroke="#2E3A34" stroke-width="0.6" fill="none"/></g>`;
  /* vlevo: džbán cubo na boku, hrdlem k nám, uražené ucho */
  s += `<g transform="translate(38 164.6) rotate(-13)">` +
    `<ellipse cx="2" cy="0" rx="19" ry="12.6" fill="url(#${ID}-zelezita)" stroke="${OBRYS}" stroke-width="0.9"/>` +
    `<path d="M-13 -8.6 Q-17 -9 -19.6 -6.6 L-19.6 6.6 Q-17 9 -13 8.6 Z" fill="#6A4A3A" stroke="${OBRYS}" stroke-width="0.8"/>` +
    `<ellipse cx="-19.8" cy="0" rx="2.6" ry="6.9" fill="#1E1512" stroke="${OBRYS}" stroke-width="0.8"/>` +
    `<path d="M-8 -11.4 Q2 -14.6 13 -10.4" stroke="#C99A6A" stroke-width="1.1" fill="none" opacity="0.55" stroke-linecap="round"/>` +
    `<path d="M4 -12.4 L6.6 -7 L3.6 -2.4 L8 2.6 L5.6 7 L9 11.6" stroke="#22160F" stroke-width="0.7" fill="none"/>` +
    `<path d="M6.6 -7 L11 -5.6 M8 2.6 L12.6 4" stroke="#22160F" stroke-width="0.5" fill="none"/>` +
    `<path d="M10 -9.6 C16 -6 18.6 0 16 6" stroke="#2A1A14" stroke-width="2.6" fill="none" opacity="0.35"/></g>`;
  /* vpravo: talíře nakřivo na sobě, vrchní vyštípnutý */
  const talir = (x, y, rot, barva, lem, vzor = "") =>
    `<g transform="translate(${x} ${y}) rotate(${rot})"><path d="M-15 -4.2 Q-12.6 -1 -5 -0.8 L-5 0 H5 L5 -0.8 Q12.6 -1 15 -4.2 Z" fill="${barva}" stroke="${OBRYS}" stroke-width="0.8"/><path d="M-15 -4.2 Q0 -2 15 -4.2" stroke="${lem}" stroke-width="1" fill="none"/>${vzor}</g>`;
  s += talir(140, 172.6, 2, "#E4DDCB", "#C4432B");
  s += talir(142.4, 168.2, -5, "#AFC3B1", "#7C9684", `<path d="M-9 -2.4 q1.6 1 3.2 0 q1.6 1 3.2 0 q1.6 1 3.2 0 q1.6 1 3.2 0 q1.6 1 3.2 0" stroke="#6F8A78" stroke-width="0.5" fill="none"/>`);
  s += `<g transform="translate(139 163.6) rotate(9)"><path d="M-15 -4.2 Q-12.6 -1 -5 -0.8 L-5 0 H5 L5 -0.8 Q12.6 -1 15 -4.2 L9.4 -3.6 L7.6 -1.6 L4.6 -3.2 Z" fill="#E9E4D6" stroke="${OBRYS}" stroke-width="0.8"/><path d="M-13 -3.6 Q-11 -1.6 -5.6 -1.4 M-2 -1.8 q1.4 -1.6 2.8 0 q1.4 -1.6 2.8 0" stroke="#5F78A6" stroke-width="0.6" fill="none"/></g>`;
  /* uprostřed: velká mísa dnem vzhůru, popelová glazura steče od nožky */
  s += `<path d="M55 173 C55 158.6 70 149.4 82.4 148.2 L82.4 145.4 H97.6 L97.6 148.2 C110 149.4 125 158.6 125 173 Z" fill="url(#${ID}-misa)" stroke="${OBRYS}" stroke-width="1"/>`;
  s += `<path d="M82.4 148.2 C76 150 73 154 74.6 158 C76 161 79.6 160 80 156.6 C80.6 153 84 153.4 85 157 C86 162 91 162.4 92 157.4 C93 153 97 153.4 98 157.6 C99 161.6 103.6 161 104 157 C104.4 153.6 108 152.6 109.4 155.6 C110.4 151.6 103 149 97.6 148.2 Z" fill="#7F8A68" opacity="0.85"/>`;
  s += `<path d="M58 167 Q90 172 122 167" stroke="#5E564C" stroke-width="0.6" fill="none" opacity="0.6"/>`;
  s += `<path d="${prasklina(99, 148.6, 12, { kroku: 5, krokY: 5, sirka: 3.6 })}" stroke="#2A221E" stroke-width="0.8" fill="none"/>`;
  s += `<path d="${prasklina(101.6, 158, 15, { kroku: 2, krokY: 4, sirka: 5 })}" stroke="#2A221E" stroke-width="0.5" fill="none"/>`;
  s += `<path d="M60.4 173 L64.6 166.6 L69 169.4 L72.6 173 Z" fill="#221A17" stroke="${OBRYS}" stroke-width="0.7"/>`;
  /* proražené dno: tudy se dostala ven */
  s += `<ellipse cx="90" cy="145.4" rx="7.6" ry="1.7" fill="#8E8576" stroke="${OBRYS}" stroke-width="0.8"/>`;
  s += `<path d="M84.6 145.5 L87 144.5 L89.4 145.9 L92 144.3 L95.4 145.6 L93 146.5 L90 145.9 L87.2 146.6 Z" fill="#15100E"/>`;
  /* vpředu: střepy, šálek na boku a mech */
  s += `<g transform="translate(88 176.6) rotate(-74)"><path d="M-5.4 -11 L-4.8 -1 Q-4.6 0 -3.4 0 H3.4 Q4.6 0 4.8 -1 L5.4 -11 Z" fill="#5F78A6" stroke="${OBRYS}" stroke-width="0.8"/><ellipse cx="0" cy="-11" rx="5.4" ry="1.5" fill="#1D2233" stroke="${OBRYS}" stroke-width="0.6"/><path d="M-4.8 -7 H5 M-4.6 -4 H4.8" stroke="#E4DDCB" stroke-width="0.7"/></g>`;
  for (const [body, barva] of [
    [[[20, 175.6], [24, 171.4], [28.6, 174], [26, 176.6]], "#AFC3B1"],
    [[[104, 176.4], [107, 172.6], [112.6, 174.6], [110, 177.2]], "#E4DDCB"],
    [[[128, 176.8], [130, 174], [134.6, 175.4], [133, 177.4]], "#8A5A44"],
    [[[160, 176.4], [162.6, 173], [166.6, 175.2], [164, 177]], "#E9E4D6"],
    [[[48, 177.4], [50.6, 175], [54, 176.6], [52, 178]], "#5A4034"],
  ])
    s += `<path d="${cara(body)} Z" fill="${barva}" stroke="${OBRYS}" stroke-width="0.7"/>`;
  s += `</g>`;
  s += mech(47, 157.6, 9.6, 3.2, 3) + mech(73, 152.2, 6.4, 2.2, 9) + mech(113, 157, 5.6, 2, 21) + mech(66, 175.2, 10.6, 2.6, 31) + mech(121, 174.2, 9, 2.6, 42) + mech(29, 176.2, 7.6, 2.2, 55) + mech(153, 176.4, 8, 2, 66) + mech(141, 160, 4.4, 1.4, 71);
  s += trava(18, 177, 5, { vyska: 8 }) + trava(79, 176.4, 9, { n: 4, vyska: 5.6 }) + trava(134, 177, 13, { vyska: 7 }) + trava(168, 177, 17, { n: 4, vyska: 6, barva: "#6C8A50" }) + trava(100, 177.4, 23, { n: 3, vyska: 4.6 });
  /* kapradí z rozbitého hrdla */
  s += `<g stroke="#4C6A3C" stroke-width="0.7" fill="none" stroke-linecap="round"><path d="M19.4 164 Q14 158 9.6 156.4"/><path d="M18 162.6 l-2.6 -0.4 M16.2 160.6 l-2.8 0 M14.2 158.9 l-2.6 0.6 M17.6 162.2 l-0.2 -2.6 M15.6 160.2 l0.2 -2.6 M13.4 158.4 l0.6 -2.4"/></g>`;
  s += HOUBY.map(houba).join("");
  return s;
};
/* světélkování hub: zelená záře, ve tmě zesílí */
const vrstvaHouby = () => HOUBY.map(([x, y, s]) => `<circle cx="${x}" cy="${f(y - 4 * s)}" r="${f(9 * s)}" fill="url(#${ID}-houba)"/>`).join("");
/* její stín na dně mísy: čím výš se vznese, tím je menší a bledší */
const vrstvaStin = (st) => {
  const k = clamp(1 + st.fig.y / 9, 0.5, 1.2);
  return `<ellipse cx="90" cy="146.6" rx="${f(8.6 * k)}" ry="${f(1.5 * k)}" fill="#2A2238" opacity="${f(0.3 * k)}"/>`;
};

/* ——— Bublinka ——— */
const vrstvaTelo = () => vPostave(bubTelo(ID));
const vrstvaFilm = (st) => vPostave(`<g clip-path="url(#${ID}-bublina)" mask="url(#${ID}-film-maska)" opacity="0.2">${filmPruhy(st, filmSamo(st.t))}</g>`);
const vrstvaLesk = () => vPostave(bubLesk());
const vrstvaKlobouk = (st) => vPostave(bubKlobouk(ID, { kyv: st.kyv, zved: st.zved }));
const vrstvaTvar = (st) => vPostave(bubTvar(ID, { dx: st.pohled[0], dy: st.pohled[1], mrk: st.mrk, vyraz: st.vyraz, tvare: 0.42 }));
const vrstvaRuce = (st) => {
  const zved = st.zved;
  const L = [35 - 2 * zved, 105 - 15 * zved], P = [145 + 2 * zved, 105 - 15 * zved];
  return vPostave(
    ruckaDucha([47.6, 112], L, { uhel: 8 + st.vitr * -7 + 5 * Math.sin(st.t * 1.4) - 24 * zved, ohyb: 1, delka: 13 }) +
      ruckaDucha([132.4, 112], P, { uhel: -8 + st.vitr * -7 + 5 * Math.sin(st.t * 1.4 + 1.3) + 24 * zved, ohyb: -1, delka: 13 }),
  );
};
const vrstvaOnibi = (vpredu) => (st) =>
  st.onibi
    .filter((o) => !!o.vpredu === vpredu)
    .map((o) => plaminek(o.x, o.y, o.smer, { id: ID, r: vpredu ? 4 : 3.2, delka: (vpredu ? 13 : 10.5) + o.rychlost * 0.05, t: st.t, fz: o.fz, barva: "#DDF6F0", lem: "#58A9C4", sila: (vpredu ? 0.95 : 0.72) + 0.08 * Math.sin(st.t * 5 + o.fz) }))
    .join("");

/* dým po sfouknutí: z každého jazyka obláček, který stoupá a řídne */
const vrstvaDym = (st) => {
  const u = st.fuk;
  if (u < 0.3 || u > 2.6) return "";
  let s = "";
  for (const j of VRSTVY[0].jazyky) {
    const v = u - 0.3 - 0.3 * Math.abs(poradi(j.a) - 0.5);
    if (v < 0 || v > 1.7) continue;
    const q = v / 1.7;
    const a = rad(j.a);
    const x = C[0] + Math.cos(a) * (R0 + 6) + Math.sin(j.fz + v * 2) * 3 * q + st.vitr * 16 * q, y = C[1] + Math.sin(a) * (R0 + 6) - 22 * q;
    s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(2.6 + 6.5 * q)}" fill="url(#${ID}-dym)" opacity="${f(0.75 * (1 - q) * smooth(q * 8))}"/>`;
  }
  return s;
};
const vrstvaJiskry = (st) =>
  st.jiskry
    .map((j) => {
      const u = j.vek / j.zivot;
      const op = clamp(Math.min(u / 0.08, (1 - u) / 0.4)) * (0.6 + 0.4 * Math.sin(st.t * 14 + j.fz));
      return `<path d="${jiskraD(j.r * (1 - u * 0.4))}" transform="translate(${f(j.x)} ${f(j.y)}) rotate(${f(j.rot + u * 60)})" fill="${u < 0.35 ? "#F2FFF8" : "#8FDCD6"}" stroke="#2F7C8F" stroke-width="0.25" opacity="${f(op)}"/>`;
    })
    .join("");

const defs = () =>
  bubDefs(ID, { pruhledna: 0.86 }) +
  onibiDefs(ID) +
  `<radialGradient id="${ID}-mod" gradientUnits="userSpaceOnUse" cx="${C[0]}" cy="${C[1]}" r="80"><stop offset="0.5" stop-color="#2E8FA6"/><stop offset="1" stop-color="#1F5F8E"/></radialGradient>` +
  `<radialGradient id="${ID}-tyr" gradientUnits="userSpaceOnUse" cx="${C[0]}" cy="${C[1]}" r="70"><stop offset="0.6" stop-color="#A9EBD9"/><stop offset="1" stop-color="#63C6C9"/></radialGradient>` +
  `<radialGradient id="${ID}-kotouc" cx="0.5" cy="0.42" r="0.6"><stop offset="0" stop-color="#34478E"/><stop offset="0.55" stop-color="#232F6C"/><stop offset="0.9" stop-color="#171F4C"/><stop offset="1" stop-color="#10163A"/></radialGradient>` +
  `<clipPath id="${ID}-kotouc-orez"><circle cx="${C[0]}" cy="${C[1]}" r="${R0 - 6.6}"/></clipPath>` +
  `<linearGradient id="${ID}-duch-dole" x1="0" y1="0" x2="0" y2="1"><stop offset="0.3" stop-color="${TMA}"/><stop offset="1" stop-color="${TMA}" stop-opacity="0"/></linearGradient>` +
  `<clipPath id="${ID}-sklo"><circle cx="${C[0]}" cy="${C[1]}" r="${SKLO}"/></clipPath>` +
  `<filter id="${ID}-mekky" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="0.5"/></filter>` +
  `<filter id="${ID}-zar-oci" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.6"/></filter>` +
  `<radialGradient id="${ID}-zare" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#8FDDE6" stop-opacity="0.6"/><stop offset="0.55" stop-color="#5FB0D6" stop-opacity="0.24"/><stop offset="1" stop-color="#5FB0D6" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="${ID}-houba"><stop offset="0" stop-color="#C8FFC0" stop-opacity="0.75"/><stop offset="0.5" stop-color="#9EE8A8" stop-opacity="0.26"/><stop offset="1" stop-color="#9EE8A8" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="${ID}-dym"><stop offset="0" stop-color="#6E7C98" stop-opacity="0.7"/><stop offset="1" stop-color="#6E7C98" stop-opacity="0"/></radialGradient>` +
  `<linearGradient id="${ID}-misa" gradientUnits="userSpaceOnUse" x1="62" y1="146" x2="120" y2="176"><stop offset="0" stop-color="#B9B09C"/><stop offset="0.5" stop-color="#9A917F"/><stop offset="1" stop-color="#6E655A"/></linearGradient>` +
  `<linearGradient id="${ID}-zelezita" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7A5644"/><stop offset="0.5" stop-color="#57392C"/><stop offset="1" stop-color="#33211A"/></linearGradient>` +
  `<linearGradient id="${ID}-celadon" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#B7CDB9"/><stop offset="1" stop-color="#7D9886"/></linearGradient>` +
  `<linearGradient id="${ID}-seda" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#A39A8A"/><stop offset="1" stop-color="#766D60"/></linearGradient>` +
  `<pattern id="${ID}-kirikane" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><path d="M2.5 0.9 V4.1 M0.9 2.5 H4.1" stroke="#DCE8F4" stroke-width="0.3"/><circle cx="0" cy="0" r="0.45" fill="#DCE8F4"/></pattern>`;

/* ——— Simulace ——— */
const STRED_ONIBI = [B0[0], B0[1] - 12];
const novaOnibi = () => [0, Math.PI].map((fz) => ({ x: STRED_ONIBI[0] + Math.cos(fz + 0.4) * 58, y: STRED_ONIBI[1] + 8 + Math.sin(fz + 0.4) * 19, vx: 0, vy: 0, smer: -Math.PI / 2, fz, rychlost: 0, vpredu: false }));
const novaDynamika = () => ({
  I: 0.45, vitr: 0, fuk: -100, onibi: novaOnibi(), jiskry: [], hvezdy: [], akum: 0, nahoda: rng(404), zvuk: [], pohled: [0, 0],
  /* duch: m je, jak moc je obr (1) nebo svatoušek (0) */
  m: 1, vZone: 0, kouk: 9, klid: -100, bylaSvata: false, uhyb: 0,
});
const novaJiskra = (dyn, Rr, a, vybuch) => {
  const nahore = clamp(-Math.sin(a));
  const r = R0 + (12 + 26 * Math.pow(nahore, 1.6)) * (0.6 + 0.4 * clamp(dyn.I)) * (0.6 + Rr() * 0.5);
  dyn.jiskry.push({
    x: C[0] + Math.cos(a) * r, y: C[1] + Math.sin(a) * r,
    vx: Math.cos(a) * (vybuch ? 22 : 4) + dyn.vitr * 14, vy: -6 - Rr() * 9 + Math.sin(a) * (vybuch ? 18 : 3),
    vek: 0, zivot: 1.6 + Rr() * 1.8, r: 0.8 + Rr() * 1.3, rot: Rr() * 90, fz: Rr() * 6.28,
  });
};
/** Ohlédla se po duchovi? Když na něj ukazuje kurzor, nebo jen tak, ze zvyku. */
const otocena = (dyn, t) => dyn.vZone > 0.4 || (t > dyn.kouk && t < dyn.kouk + 2);
const krok = (dyn, t, dt, vstup) => {
  const Rr = dyn.nahoda;
  let cil = 0.16 * Math.sin(t * 0.45) + 0.07 * Math.sin(t * 1.3 + 1);
  let pohled = [Math.sin(t * 0.3) * 0.8, 0];
  if (vstup.mys) {
    const dx = vstup.mys.x - 90, dy = vstup.mys.y - 100;
    cil = -clamp(dx / 70, -1, 1) * 0.85 * clamp(1.5 - Math.hypot(dx, dy) / 140, 0.25, 1);
    pohled = [clamp(dx / 40, -1, 1) * 2.2, clamp((vstup.mys.y - B0[1]) / 50, -1, 1) * 1.6];
  }
  dyn.vitr = kCili(dyn.vitr, cil, dt, 0.35);
  const u0 = t - dt - dyn.fuk;
  if (vstup.kliky && vstup.kliky.length) {
    vstup.kliky.length = 0;
    if (t - dyn.fuk > KONEC) {
      dyn.fuk = t;
      dyn.zvuk.push({ druh: "buu", sila: 0.5, pan: 0 });
      dyn.zvuk.push({ druh: "fuk", sila: 1, pan: 0, za: 0.08 });
      dyn.zvuk.push({ druh: "syk", sila: 0.7, pan: 0, za: 0.3 });
      for (let i = 0; i < POCET_TONU; i++) dyn.zvuk.push({ druh: "zapal", vys: i, sila: 0.8, pan: -0.8 + (1.6 * i) / (POCET_TONU - 1), za: ZNOVU + (i / (POCET_TONU - 1)) * OBEH });
      dyn.zvuk.push({ druh: "smich", sila: 0.7, pan: 0, za: KONEC - 0.2 });
    }
  }
  const u = t - dyn.fuk;
  const vSekvenci = u >= 0 && u < KONEC + 1.3;
  /* po posledním jazyku svatozář vzplane a rozhodí jiskry */
  if (u0 < KONEC - 0.4 && u >= KONEC - 0.4) {
    dyn.I = 1.7;
    for (let i = 0; i < 30; i++) novaJiskra(dyn, Rr, rad(180 + Rr() * 180), true);
  }
  const mavnuti = clamp((vstup.rychlost || 0) / 320);
  const cilI = 0.45 + 0.8 * mavnuti;
  dyn.I += (cilI - dyn.I) * (1 - Math.exp(-dt / (dyn.I > cilI ? 1.7 : 0.35)));
  /* jiskry jen z toho, co hoří */
  const tm = tma(u);
  dyn.akum += dt * (1.2 + 6 * dyn.I) * (1 - tm);
  while (dyn.akum >= 1) {
    dyn.akum -= 1;
    const a = rad(190 + Rr() * 160);
    if (uroven((a * 180) / Math.PI, u) > 0.5) novaJiskra(dyn, Rr, a, false);
  }
  for (const j of dyn.jiskry) {
    j.vek += dt;
    j.vx += (dyn.vitr * 16 - j.vx) * dt * 1.2;
    j.x += (j.vx + Math.sin(j.vek * 3 + j.fz) * 5) * dt;
    j.y += j.vy * dt;
    j.vy *= 1 - dt * 0.3;
  }
  dyn.jiskry = dyn.jiskry.filter((j) => j.vek < j.zivot);
  /* bludičky krouží kolem ní; když je tma, přitáhnou se blíž */
  dyn.onibi.forEach((o) => {
    const a = t * 0.42 + o.fz;
    o.vpredu = Math.sin(a) > 0;
    krokOnibi(o, [STRED_ONIBI[0] + Math.cos(a) * lerp(58, 44, tm), STRED_ONIBI[1] + 8 + Math.sin(a) * 19], dt);
    o.vx += dyn.vitr * 30 * dt;
  });
  /* duch: ukazuje na něj kurzor? Pak se Bublinka ohlédne a on je hned hodný; rohy mu rostou zpátky pomalu */
  const naDuchu = !vSekvenci && vstup.mys && vstup.mys.y < B0[1] - 30 && Math.hypot(vstup.mys.x - C[0], vstup.mys.y - C[1]) < SKLO;
  dyn.vZone = naDuchu ? dyn.vZone + dt : Math.max(0, dyn.vZone - dt * 3);
  if (vSekvenci) dyn.kouk = Math.max(dyn.kouk, t + 7);
  else if (!vstup.mys && t > dyn.kouk + 2) dyn.kouk = t + 9 + Rr() * 5;
  const ot = !vSekvenci && otocena(dyn, t);
  if (vSekvenci) dyn.m = kCili(dyn.m, 1, dt, 0.08);
  else if (ot) {
    dyn.m = kCili(dyn.m, 0, dt, 0.06);
    dyn.klid = t;
  } else if (t - dyn.klid > 0.45) dyn.m = kCili(dyn.m, 1, dt, 0.55);
  const svata = dyn.m < 0.3;
  if (svata && !dyn.bylaSvata) {
    dyn.zvuk.push({ druh: "aureola", sila: 0.8, pan: 0 });
    for (let i = 0; i < 7; i++) dyn.hvezdy.push({ x: DUCH.stred[0] + (Rr() - 0.5) * 34, y: DUCH.stred[1] - 26 - Rr() * 12, vx: (Rr() - 0.5) * 8, vy: -2 - Rr() * 6, vek: -Rr() * 0.3, zivot: 0.9 + Rr() * 0.7, r: 1.1 + Rr() * 1.4, rot: Rr() * 90 });
  }
  if (!svata && dyn.bylaSvata && !vSekvenci) dyn.zvuk.push({ druh: "vrr", sila: 0.6, pan: 0, za: 0.5 });
  dyn.bylaSvata = svata;
  for (const j of dyn.hvezdy) {
    j.vek += dt;
    if (j.vek > 0) {
      j.x += j.vx * dt;
      j.y += j.vy * dt;
    }
  }
  dyn.hvezdy = dyn.hvezdy.filter((j) => j.vek < j.zivot);
  /* duch se v kotouči kousek posune proti kurzoru, jako by byl hlouběji */
  dyn.uhyb = kCili(dyn.uhyb, vstup.mys ? -clamp((vstup.mys.x - 90) * 0.05, -3.4, 3.4) : 2 * Math.sin(t * 0.4), dt, 0.3);
  /* pohled: při ohlédnutí nahoru za sebe, jinak za kurzorem */
  if (ot) pohled = [dyn.vZone > 0.4 && vstup.mys ? clamp((vstup.mys.x - B0[0]) / 30, -1, 1) * 1.8 : 0.6, -1.8];
  dyn.pohled = dyn.pohled.map((v, i) => kCili(v, pohled[i], dt, ot ? 0.1 : 0.15));
};
const stav = (t, vstup = {}, dyn) => {
  const d = dyn || novaDynamika();
  const u = t - d.fuk;
  const tm = tma(u);
  const vSekvenci = u >= 0 && u < KONEC + 1.3;
  let vyraz = "smug";
  if (u >= 0 && u < 0.32) vyraz = "fuk";
  else if (u < ZNOVU + 0.2) vyraz = "psst";
  else if (u > KONEC - 0.4 && u < KONEC + 1.3) vyraz = "smich";
  else if (!vSekvenci && otocena(d, t)) vyraz = "uzas";
  const zved = u >= 0 && u < 0.7 ? Math.sin(Math.PI * clamp(u / 0.7)) : 0;
  /* duch udělá baf, když ona foukne, a zazubí se, když svatozář znovu vzplane */
  let baf = 0;
  if (u >= 0 && u < 0.62) baf = Math.pow(Math.sin(Math.PI * clamp(u / 0.62)), 0.6);
  else if (u > KONEC - 0.4 && u < KONEC + 0.6) baf = 0.55 * Math.sin(Math.PI * clamp((u - (KONEC - 0.4)) / 1));
  return {
    t, I: d.I, vitr: d.vitr, fuk: u, tma: tm, vyraz, zved, baf,
    m: d.m, svata: 1 - smooth(d.m / 0.6), uhyb: d.uhyb, hvezdy: d.hvezdy,
    fig: { x: 0, y: 2.1 * Math.sin(t * 1.25) - 2.2 * zved, r: 1.4 * Math.sin(t * 0.9) + d.vitr * 3 },
    kyv: d.vitr * -9 + 2.4 * Math.sin(t * 1.7),
    onibi: d.onibi, jiskry: d.jiskry, pohled: d.pohled, mrk: mrkani(t, [2.2, 5.4, 5.65, 8.6], 10),
    pohledDucha: vstup.mys ? [clamp((vstup.mys.x - 90) / 50, -1, 1), clamp((vstup.mys.y - 70) / 60, -1, 1)] : [Math.sin(t * 0.6), 0.4],
    mrkDucha: mrkani(t, [1.3, 4.4, 8.1], 9.1),
  };
};
const snimek = (st) => Math.floor(st.t * 30);
const pohyb = (st) => ({ x: st.fig.x, y: st.fig.y, r: st.fig.r, ox: B0[0], oy: B0[1] });

export const kamiOhen = {
  id: "ohen",
  viewBox: "0 0 180 180",
  defs,
  novaDynamika,
  krok,
  stav,
  hukot: (st) => ({ ohen: clamp(0.2 + 0.4 * st.I) * (1 - st.tma), dron: clamp(0.12 + 0.3 * st.m * (1 - st.tma) + 0.5 * st.tma) }),
  klidne: { t: 3.4 },
  vrstvy: [
    { id: "zare", kresli: () => `<circle cx="${C[0]}" cy="${C[1] - 8}" r="96" fill="url(#${ID}-zare)"/>`, pruhlednost: (st) => f(clamp(0.5 + 0.4 * st.I) * (1 - 0.85 * st.tma)) },
    { id: "plameny", kresli: vrstvaPlameny, klic: snimek },
    { id: "kotouc", kresli: vrstvaKotouc, tezka: true },
    { id: "duch", kresli: vrstvaDuch, klic: snimek },
    { id: "hvezdy", kresli: vrstvaHvezdy, klic: (st) => (st.hvezdy.length ? snimek(st) : -1) },
    { id: "dym", kresli: vrstvaDym, klic: (st) => (st.fuk > 0.3 && st.fuk < 2.7 ? snimek(st) : -1) },
    { id: "onibi-vzadu", kresli: vrstvaOnibi(false), klic: snimek },
    { id: "hromada", kresli: vrstvaHromada, tezka: true },
    { id: "houby", kresli: vrstvaHouby, pruhlednost: (st) => f(clamp(0.5 + 0.14 * Math.sin(st.t * 1.1) + 0.5 * st.tma)) },
    { id: "stin", kresli: vrstvaStin, klic: (st) => Math.round(st.fig.y * 6) },
    { id: "telo", kresli: vrstvaTelo, tezka: true, pohyb },
    { id: "film", kresli: vrstvaFilm, klic: (st) => Math.floor(st.t * 15), pohyb },
    { id: "lesk", kresli: vrstvaLesk, pohyb },
    { id: "klobouk", kresli: vrstvaKlobouk, klic: (st) => `${f(Math.round(st.kyv * 4) / 4)},${f(Math.round(st.zved * 20) / 20)}`, pohyb },
    { id: "tvar", kresli: vrstvaTvar, klic: (st) => `${f(st.pohled[0])},${f(st.pohled[1])},${f(st.mrk)},${st.vyraz}`, pohyb },
    { id: "ruce", kresli: vrstvaRuce, klic: snimek, pohyb },
    { id: "onibi", kresli: vrstvaOnibi(true), klic: snimek },
    { id: "jiskry", kresli: vrstvaJiskry, klic: snimek },
  ],
};
