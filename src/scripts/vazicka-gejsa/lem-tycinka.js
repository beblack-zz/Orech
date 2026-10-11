/*
 * 02, Tušový lem — DOKUD HOŘÍ TYČINKA
 *
 * Čas gejši se nepočítal na hodiny, ale na vonné tyčinky: kolik jich za
 * večer dohořelo, tolik se zaplatilo. Jedna teď hoří v kadidelnici, která
 * stojí dole na papíře, a dokud hoří, Vázička tančí. Noc je tuš a svítí
 * v ní jediná věc — stužka kouře. Není to kov ani oheň, jen bledá žlutá
 * jako srpek měsíce v hlavičce webu.
 *
 * Kouř stoupá nejdřív rovně, pak se rozvlní, a kam mávne vějíř, tam se
 * stočí. Jednou za čas vějířem luskne: stužku tím přetne, a co odřízla,
 * se složí do tvaru — kruh ze značky, květ sakury, jeřáb, motýl, váza
 * (ona sama). Chvíli drží a rozplyne se. Když tyčinka dohoří, ukloní se
 * jí, tma na okamžik zůstane prázdná a v popelu se rozsvítí nová.
 *
 * Myš: kouř se stáčí za kurzorem a Vázička tančí tam, kam se ukáže.
 * Kliknutí: luskne vějířem a kouř se složí do dalšího tvaru; když ho na to
 * ještě není dost, aspoň do něj foukne. Když se nic neděje, tančí
 * a skládá tvary sama.
 */
import {
  f, rng, clamp, lerp, smooth, rad, deg, cara, pasPoBodech, prevzorkuj, kCili, dosed, mrkani, kyvadlo, noveKyvadlo,
  VAZ, NOC, ZLUTA, polomer, vazDefs, kvetyDefs, vazTelo, vazTvarNa, vazSnury, vazVetvicka, vazZa, vazPred, vazBoty, vazRukavy, klicRukavu, kanzashiStred, tusLem,
} from "./spolecne.js";

const ID = "vg2";
const P = NOC;
const M = 3;
const TUS = tusLem(ID, { seed: 31, barva: "#101229", lem: "#2B2E55" });
const OREZ = `${ID}-tus-orez`;

/* ——— Postava: tančí vlevo, na podlaze uvnitř tuše ——— */
const K = 0.62, FX = 58, ZEM = 151;
const POSTAVA = `translate(${FX} ${ZEM}) scale(${K}) translate(${-VAZ.cx} ${-VAZ.zem})`;
const vPostave = (s) => `<g transform="${POSTAVA}">${s}</g>`;
const naPlatno = ([x, y]) => [FX + (x - VAZ.cx) * K, ZEM + (y - VAZ.zem) * K];
const R_VEJIRE = 25;

/* ——— Tyčinka a kouř ——— */
/* špička tyčinky: nová a dohořelá; hoří HORI sekund */
const TX = 135, TY0 = 137.5, TY1 = 160, PATA = 178, HORI = 40;
/* uzel stužky vznikne každých DAVKA sekund a žije ZIVOT */
const DAVKA = 0.07, ZIVOT = 9;
/* lusknutí odřízne kus stužky starý A1 až A1 + N_T × DAVKA a složí ho do tvaru na DRZI sekund */
const A1 = 0.9, N_T = 66, DRZI = 3.1, ROZPAD = 3.4;
const STRED = [112, 61], VEL = 23;
const UKLON = 3.6;

/* ═══ Tvary z kouře: každý je jedna čára, začíná dole, kde se napojuje stužka ═══ */
const naTvar = (B) => prevzorkuj(B.map(([x, y]) => [STRED[0] + x * VEL, STRED[1] + y * VEL]), N_T);
const polar = (n, fn) => Array.from({ length: n + 1 }, (_, i) => fn(i / n));
const vyhlad = (B, n = 90) => {
  /* Catmull-Rom přes ručně položené body → hustá lomená čára */
  const g = (i) => B[clamp(i, 0, B.length - 1)];
  const V = [];
  for (let i = 0; i < B.length - 1; i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
    const kroku = Math.ceil(n / (B.length - 1));
    for (let k = 0; k < kroku; k++) {
      const t = k / kroku, t2 = t * t, t3 = t2 * t;
      V.push([0, 1].map((o) => 0.5 * (2 * p1[o] + (-p0[o] + p2[o]) * t + (2 * p0[o] - 5 * p1[o] + 4 * p2[o] - p3[o]) * t2 + (-p0[o] + 3 * p1[o] - 3 * p2[o] + p3[o]) * t3)));
    }
  }
  V.push(B[B.length - 1]);
  return V;
};
const TVARY = [
  /* ensó: skoro zavřený kruh, ruka ho nevede dokonale */
  { id: "enso", body: polar(70, (q) => { const a = rad(112 + 326 * q), r = 1 + 0.03 * Math.sin(q * 9) + 0.05 * q; return [Math.cos(a) * r, Math.sin(a) * r]; }) },
  /* květ sakury jedním tahem: stonek a pět plátků přes střed */
  { id: "kvet", body: [[0.34, 1.34], [0.16, 0.7], ...polar(110, (q) => { const a = rad(90 + 360 * q), r = 0.1 + 0.95 * Math.pow(Math.abs(Math.cos(2.5 * (a - rad(54)))), 0.85); return [Math.cos(a) * r, Math.sin(a) * r - 0.08]; })] },
  /* jeřáb v letu: nohy vzadu, krk se zobákem napřed, dvě křídla nahoru */
  { id: "jerab", body: vyhlad([[-1.2, 0.56], [-0.5, 0.34], [0.2, 0.2], [0.72, -0.12], [1.2, -0.26], [0.7, -0.3], [0.24, -0.08], [0.42, -1.02], [-0.06, -0.14], [-0.5, -0.9], [-0.44, 0.04], [-0.9, 0.2]]) },
  /* motýl: tělíčko, čtyři křídla a tykadlo */
  { id: "motyl", body: vyhlad([[0, 0.9], [0, 0.2], [0, -0.3], [0.5, -0.95], [1.02, -0.9], [1.0, -0.2], [0.14, 0.02], [0.72, 0.26], [0.66, 0.82], [0.06, 0.3], [-0.06, 0.3], [-0.66, 0.82], [-0.72, 0.26], [-0.14, 0.02], [-1.0, -0.2], [-1.02, -0.9], [-0.5, -0.95], [0, -0.3], [0.2, -0.66], [0.36, -1.04]]) },
  /* váza: ona sama, od paty po hrdlo a zpátky */
  { id: "vaza", body: (() => {
    const B = [[0, 1.05]];
    const na = (y, str) => [(str * polomer(y)) / 44, (y - 102) / 44];
    for (let y = 148; y >= 57; y -= 6.5) B.push(na(y, 1));
    B.push([0, (53 - 102) / 44]);
    for (let y = 57; y <= 148; y += 6.5) B.push(na(y, -1));
    B.push([-0.06, 1.05]);
    return vyhlad(B, 120);
  })() },
].map((T) => ({ ...T, cile: naTvar(T.body) }));

/* ═══ Pozadí v tuši ═══ */
const vrstvaTus = () =>
  TUS.skvrna +
  `<g clip-path="url(#${OREZ})">` +
  `<rect x="0" y="0" width="180" height="182" fill="url(#${ID}-nebe)"/>` +
  /* podlaha: o něco světlejší tuš a tenká hrana, na které stojí */
  `<rect x="0" y="${ZEM - 0.6}" width="180" height="40" fill="url(#${ID}-podlaha)"/>` +
  `<path d="M0 ${ZEM - 0.6} H180" stroke="#4A4E86" stroke-width="0.5" opacity="0.55"/>` +
  `</g>`;
/* stín pod ní na podlaze */
const vrstvaStin = () => `<ellipse cx="${FX}" cy="${ZEM + 0.6}" rx="21" ry="2.6" fill="#05060F" opacity="0.6"/>`;

/* ═══ Kouř ═══ */
/** Šířka stužky podle stáří uzlu: u tyčinky vlas, nahoře se rozplývá do šířky. */
const sirkaUzlu = (u) => 0.45 + 3.9 * Math.pow(clamp(u.vek / ZIVOT), 0.9);
/** Jedna stužka: uzly od nejstaršího po nejmladší. `tenci` ji zúží na koncích (odříznutý kus). */
const stuha = (U, { op = 1, plna = false, tenci = false } = {}) => {
  const n = U.length;
  if (n < 3 || op < 0.01) return "";
  /* uzly se dvakrát uhladí se sousedy, ať stužka nemá zuby */
  let B = U.map((u) => [u.x, u.y]);
  for (let k = 0; k < 2; k++) B = B.map((b, i) => (i === 0 || i === n - 1 ? b : [(B[i - 1][0] + 2 * b[0] + B[i + 1][0]) / 4, (B[i - 1][1] + 2 * b[1] + B[i + 1][1]) / 4]));
  const W = U.map((u, i) => {
    let w = u.w ?? sirkaUzlu(u);
    if (tenci) w *= smooth(Math.min(i, n - 1 - i) / 5 + 0.12);
    return w;
  });
  const tvar = pasPoBodech(B, (q) => W[Math.round(q * (n - 1))]);
  const stred = cara(B);
  const barva = plna ? ZLUTA.zaklad : `url(#${ID}-kour)`;
  return (
    `<g opacity="${f(op)}">` +
    /* záře: dvě široké průsvitné čáry pod stužkou, bez filtru */
    `<path d="${stred}" stroke="${barva}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.08"/>` +
    `<path d="${stred}" stroke="${barva}" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.15"/>` +
    `<path d="${tvar}" fill="${barva}"/>` +
    `<path d="${stred}" stroke="${barva}" stroke-width="0.7" stroke-linecap="round" stroke-linejoin="round" fill="none"/>` +
    `</g>`
  );
};
const vrstvaKour = (st) => {
  let s = "";
  for (const p of st.pruhy) s += stuha(p.uzly, { op: p.op, plna: p.typ === "tvar", tenci: true });
  return s + stuha(st.hlavni);
};
/* ——— Kadidelnice dole na papíře ——— */
const vrstvaVpredu = () => {
  let s = `<ellipse cx="${TX + 4}" cy="${PATA + 0.4}" rx="27" ry="1.8" fill="#221A22" opacity="0.3"/>`;
  /* lakovaný tácek s rumělkovou hranou */
  s += `<path d="M${TX - 20} 173.6 H${TX + 29} L${TX + 26.4} ${PATA} H${TX - 17.4} Z" fill="#2A211E" stroke="#16100E" stroke-width="0.6" stroke-linejoin="round"/>`;
  s += `<path d="M${TX - 20} 173.6 H${TX + 29}" stroke="#C4432B" stroke-width="1.2" stroke-linecap="round"/>`;
  /* kadidelnice: seladonová miska na třech nožkách, v ní popel */
  s += `<path d="M${TX - 5.4} 172.6 l-0.8 1.4 M${TX + 5.4} 172.6 l0.8 1.4 M${TX} 173 v1" stroke="#4E5E56" stroke-width="1.5" stroke-linecap="round"/>`;
  s += `<path d="M${TX - 9} 164.6 C${TX - 9.6} 169.6 ${TX - 6.4} 172.8 ${TX - 2.6} 173 H${TX + 2.6} C${TX + 6.4} 172.8 ${TX + 9.6} 169.6 ${TX + 9} 164.6 Z" fill="url(#${ID}-seladon)" stroke="#4E5E56" stroke-width="0.8" stroke-linejoin="round"/>`;
  s += `<ellipse cx="${TX}" cy="164.6" rx="9" ry="1.9" fill="#D9DDD2" stroke="#4E5E56" stroke-width="0.8"/>`;
  s += `<ellipse cx="${TX}" cy="164.9" rx="7.4" ry="1.3" fill="#A9A49C"/>`;
  s += `<path d="M${TX - 7.4} 167 Q${TX - 6.6} 170.6 ${TX - 3.4} 171.6" stroke="#FFFFFF" stroke-width="0.9" stroke-linecap="round" fill="none" opacity="0.7"/>`;
  /* tyčinky, které ještě přijdou na řadu, převázané proužkem papíru */
  for (const [i, dy] of [[0, 0], [1, -1.1], [2, -0.4]]) s += `<path d="M${TX + 13} ${f(172.6 + dy)} L${TX + 27} ${f(171.2 + dy - i * 0.5)}" stroke="${i === 1 ? "#6A7A5E" : "#7E6A54"}" stroke-width="0.8" stroke-linecap="round"/>`;
  s += `<path d="M${TX + 18.4} 170.2 l1.6 2.6" stroke="#F4E6C2" stroke-width="2.2"/><path d="M${TX + 18.4} 170.2 l1.6 2.6" stroke="#C4432B" stroke-width="0.6"/>`;
  return s;
};
const vrstvaTycinka = (st) => {
  const y = st.spicka;
  if (y > 164) return "";
  return (
    `<path d="M${TX} ${f(y)} V165.2" stroke="#3E3A34" stroke-width="1.5" stroke-linecap="round"/><path d="M${TX} ${f(y + 0.6)} V165.2" stroke="#8C7A5E" stroke-width="0.8" stroke-linecap="round"/>` +
    /* kousek šedého popela, který se ještě drží */
    (st.hori ? `<path d="M${TX} ${f(y - 0.3)} v${f(1.2 + st.popel)}" stroke="#B9B4AC" stroke-width="1.2" stroke-linecap="round"/>` : "")
  );
};
const vrstvaZhavy = (st) =>
  st.hori ? `<circle cx="${TX}" cy="${f(st.spicka)}" r="3.4" fill="url(#${ID}-zhavy)"/><circle cx="${TX}" cy="${f(st.spicka)}" r="0.8" fill="#FFD9A8"/>` : "";
const vrstvaPopel = (st) => st.popilek.map((p) => `<circle cx="${f(p.x)}" cy="${f(p.y)}" r="${f(p.r)}" fill="#B9B4AC" opacity="${f(clamp(1.4 - p.vek))}"/>`).join("");

/* ═══ Postava ═══ */
const vrstvaTvar = (st) => vPostave(vazTvarNa(ID, st.o.yaw, { dx: st.pohled[0], dy: st.pohled[1], mrk: st.mrk, vyraz: st.vyraz, P, tvare: 0.4 }));

const defs = () =>
  TUS.defs + vazDefs(ID, P) + kvetyDefs(ID, [M], 0.74) +
  `<linearGradient id="${ID}-nebe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1A1D4A" stop-opacity="0"/><stop offset="0.6" stop-color="#20245A" stop-opacity="0.4"/><stop offset="0.82" stop-color="#2C2E6A" stop-opacity="0.75"/></linearGradient>` +
  `<linearGradient id="${ID}-podlaha" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2E3170" stop-opacity="0.7"/><stop offset="1" stop-color="#2E3170" stop-opacity="0"/></linearGradient>` +
  /* kouř směrem nahoru řídne, až se u okraje tuše ztratí */
  `<linearGradient id="${ID}-kour" gradientUnits="userSpaceOnUse" x1="0" y1="160" x2="0" y2="10"><stop offset="0" stop-color="${ZLUTA.zaklad}"/><stop offset="0.55" stop-color="${ZLUTA.zaklad}" stop-opacity="0.9"/><stop offset="0.86" stop-color="${ZLUTA.zaklad}" stop-opacity="0.4"/><stop offset="1" stop-color="${ZLUTA.zaklad}" stop-opacity="0"/></linearGradient>` +
  `<radialGradient id="${ID}-zhavy"><stop offset="0" stop-color="#FF9A54" stop-opacity="0.95"/><stop offset="0.4" stop-color="#F0683A" stop-opacity="0.45"/><stop offset="1" stop-color="#F0683A" stop-opacity="0"/></radialGradient>` +
  `<linearGradient id="${ID}-seladon" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#CFE0D2"/><stop offset="1" stop-color="#8FA996"/></linearGradient>`;

/* ═══ Tanec: sled póz, mezi kterými plyne ═══ */
/* x je úkrok, yaw natočení, L a P ruce [azimut od jejího předku, jak daleko od osy, výška], smer a otv vějíř, nakl náklon */
const TANEC = [
  { d: 1.4, x: 0, yaw: 0, L: [-90, 40, 117], P: [70, 44, 104], smer: -90, otv: 1, nakl: 0 },
  { d: 1.6, x: 6, yaw: -20, L: [-100, 44, 112], P: [80, 48, 74], smer: -62, otv: 1, nakl: -3 },
  { d: 0.9, x: 10, yaw: 14, L: [-80, 42, 118], P: [42, 50, 98], smer: -8, otv: 1, nakl: 3 },
  { d: 2.3, x: 0, yaw: 360, L: [-90, 47, 108], P: [90, 47, 108], smer: -90, otv: 0.55, nakl: 0 },
  { d: 1.4, x: -8, yaw: 380, L: [-110, 44, 102], P: [60, 46, 121], smer: 24, otv: 1, nakl: 5 },
  { d: 1.5, x: -2, yaw: 350, L: [-90, 42, 112], P: [100, 50, 84], smer: -104, otv: 1, nakl: -4 },
  { d: 1.3, x: 0, yaw: 360, L: [-90, 40, 117], P: [30, 36, 110], smer: -90, otv: 0.14, nakl: 2 },
];
const DELKA_TANCE = TANEC.reduce((a, p) => a + p.d, 0);
const mezi = (a, b, k) => (Array.isArray(a) ? a.map((v, i) => lerp(v, b[i], k)) : lerp(a, b, k));
/** Póza tance v čase tt (smyčka). Vrací i číslo figury, ať jde poznat, kdy začala nová. */
const tanec = (tt) => {
  let u = ((tt % DELKA_TANCE) + DELKA_TANCE) % DELKA_TANCE;
  let i = 0;
  while (u > TANEC[i].d) u -= TANEC[i++].d;
  const do_ = TANEC[i];
  const od = i === 0 ? { ...TANEC[TANEC.length - 1], yaw: TANEC[TANEC.length - 1].yaw - 360 } : TANEC[i - 1];
  const k = smooth(u / do_.d);
  const p = { figura: i };
  for (const klic of ["x", "yaw", "L", "P", "smer", "otv", "nakl"]) p[klic] = mezi(od[klic], do_[klic], k);
  return p;
};
/** Póza se vším, co ji přebíjí: lusknutí vějířem a úklona tyčince. */
const poza = (d, t) => {
  const p = tanec(d.tanecT);
  /* lusknutí: ruka vyletí ke kouři, vějíř sklapne a hned se rozevře */
  const ul = t - d.lusk;
  if (ul >= 0 && ul < 0.6) {
    const k = smooth(ul / 0.1) * (1 - smooth((ul - 0.36) / 0.24));
    p.P = mezi(p.P, [76 - p.yaw, 52, 88], k);
    p.smer = lerp(p.smer, -30, k);
    p.otv = ul < 0.1 ? lerp(p.otv, 0.06, ul / 0.1) : ul < 0.16 ? 0.06 : lerp(0.06, 1, dosed((ul - 0.16) / 0.2));
  }
  /* úklona: otočí se k tyčince, sepne ruce a předkloní se */
  const uu = t - d.konec;
  let uklon = 0;
  if (uu >= 0 && uu < UKLON) {
    uklon = smooth(uu / 0.8) * (1 - smooth((uu - (UKLON - 1)) / 0.9));
    p.yaw = lerp(p.yaw, 74, uklon);
    p.nakl = lerp(p.nakl, 15, uklon);
    p.x = lerp(p.x, 0, uklon);
    p.L = mezi(p.L, [-64, 32, 116], uklon);
    p.P = mezi(p.P, [-40, 36, 113], uklon);
    p.smer = lerp(p.smer, 96, uklon);
    p.otv = lerp(p.otv, 0.06, uklon);
  }
  const ruka = ([az, r, y]) => {
    const w = rad(az + p.yaw);
    return { H: [VAZ.cx + r * Math.sin(w), y], za: Math.cos(w) < -0.2 };
  };
  return { ...p, uklon, ruceP: { L: ruka(p.L), P: ruka(p.P) } };
};
/** Špička vějíře na plátně: odtud fouká do kouře. */
const spickaVejire = (d, p) => {
  const [hx, hy] = naPlatno(p.ruceP.P.H);
  return [hx + d.figX + Math.cos(rad(p.smer)) * R_VEJIRE * K, hy + Math.sin(rad(p.smer)) * R_VEJIRE * K];
};

/* ═══ Simulace ═══ */
const spicka = (d, t) => {
  const b = clamp((t - d.zapal) / HORI);
  /* nová tyčinka se z popela vysune */
  return lerp(lerp(TY1 + 5, TY0, smooth((t - d.zapal + d.predehra) / 0.7)), TY1, b);
};
/** Proudění: kouř stoupá, čím výš nad špičkou, tím víc se vlní. */
const proud = (x, y, t, vek, ty) => {
  const h = ty - y;
  const A = 10.5 * smooth((h - 9) / 46);
  return [
    A * (Math.sin(0.055 * y + 0.8 * t) + 0.55 * Math.sin(0.12 * y - 1.25 * t + 1.7)) - 3.4 * smooth(h / 80) + (x - 150 > 0 ? -(x - 150) * 0.6 : 0),
    -(16 - 6 * smooth(vek / 4)) + 0.25 * A * Math.cos(0.07 * y + 0.6 * t),
  ];
};
const posunUzly = (U, t, dt, ty) => {
  for (const u of U) {
    u.vek += dt;
    const [px, py] = proud(u.x, u.y, t, u.vek, ty);
    u.vx = kCili(u.vx, px, dt, 0.34);
    u.vy = kCili(u.vy, py, dt, 0.34);
    u.x += u.vx * dt;
    u.y += u.vy * dt;
  }
};
/** Fouknutí: uzly kolem bodu dostanou rychlost navíc. */
const fouk = (dyn, [x, y], [vx, vy], dosah) => {
  const na = (u) => {
    const w = Math.exp(-((u.x - x) ** 2 + (u.y - y) ** 2) / (dosah * dosah));
    u.vx += vx * w;
    u.vy += vy * w;
  };
  dyn.hlavni.forEach(na);
  for (const p of dyn.pruhy) if (p.typ === "volny") p.uzly.forEach(na);
};
const krokKoure = (dyn, t, dt) => {
  const ty = spicka(dyn, t);
  if (dyn.hori) {
    dyn.davka += dt;
    while (dyn.davka >= DAVKA) {
      dyn.davka -= DAVKA;
      dyn.hlavni.push({ x: TX + (dyn.nahoda() - 0.5) * 0.3, y: ty - 0.6, vx: 0, vy: -16, vek: dyn.davka, zivot: ZIVOT });
    }
  }
  posunUzly(dyn.hlavni, t, dt, ty);
  dyn.hlavni = dyn.hlavni.filter((u) => u.vek < u.zivot);
  for (const p of dyn.pruhy) {
    if (p.typ === "tvar") {
      /* uzly táhne pružina na své místo ve tvaru; tvar maličko dýchá */
      const v = t - p.t0;
      const nab = smooth(v / 0.7);
      p.uzly.forEach((u, i) => {
        const [cx, cy] = p.cile[p.uzly.length - 1 - i];
        const dych = 0.5 * Math.sin(t * 1.4 + i * 0.21);
        u.vx += (15 * (cx + dych - u.x) - 7.5 * u.vx) * dt;
        u.vy += (15 * (cy - u.y) - 7.5 * u.vy) * dt;
        u.x += u.vx * dt;
        u.y += u.vy * dt;
        u.w = lerp(u.w0, 1.1 + 0.95 * Math.sin((Math.PI * i) / (p.uzly.length - 1)), nab);
      });
      p.op = 1;
      if (v > DRZI) {
        p.typ = "volny";
        p.t1 = t;
        p.uzly.forEach((u, i) => {
          u.vek = 2.6 + 2 * (1 - i / p.uzly.length);
          u.zivot = u.vek + ROZPAD * (0.7 + 0.3 * (i / p.uzly.length));
          u.w1 = u.w;
        });
      }
    } else {
      posunUzly(p.uzly, t, dt, ty);
      p.uzly = p.uzly.filter((u) => u.vek < u.zivot);
      const zbyva = p.uzly.length ? Math.max(...p.uzly.map((u) => u.zivot - u.vek)) : 0;
      p.op = clamp(zbyva / 2.2);
      /* co bylo tvarem, se při rozpadu zase rozšíří do kouře */
      if (p.t1 != null) for (const u of p.uzly) u.w = lerp(u.w1, sirkaUzlu(u), smooth((t - p.t1) / 1.6));
    }
  }
  dyn.pruhy = dyn.pruhy.filter((p) => p.uzly.length > 2);
};
const stuzkyDost = (dyn) => dyn.hlavni.length > 0 && dyn.hlavni[0].vek >= A1 + N_T * DAVKA - 0.05;
const drziTvar = (dyn) => dyn.pruhy.some((p) => p.typ === "tvar");
/** Řez: co je starší než tvar, odletí; prostředek se složí do tvaru; mladý kus stoupá dál. */
const rez = (dyn, t) => {
  const stare = dyn.hlavni.filter((u) => u.vek > A1 + N_T * DAVKA);
  const kus = dyn.hlavni.filter((u) => u.vek > A1 && u.vek <= A1 + N_T * DAVKA);
  dyn.hlavni = dyn.hlavni.filter((u) => u.vek <= A1);
  if (stare.length > 2) dyn.pruhy.push({ typ: "volny", uzly: stare, op: 1 });
  if (kus.length < 8) return;
  const T = TVARY[dyn.tvarI % TVARY.length];
  for (const u of kus) u.w0 = sirkaUzlu(u);
  dyn.pruhy.push({ typ: "tvar", uzly: kus, cile: prevzorkuj(T.cile, kus.length), t0: t, op: 1, tvar: T.id });
  dyn.zvuk.push({ druh: "dech", sila: 0.9, pan: 0.3, vys: dyn.tvarI });
  dyn.tvarI++;
  dyn.posledni = t;
};
const novaDynamika = () => {
  const dyn = {
    hlavni: [], pruhy: [], davka: 0, hori: true, zapal: -7.5, predehra: 10, konec: -100, lusk: -100, rezV: null, tvarI: 0, posledni: -100, dalsiTvar: 1.4,
    tanecT: 0, figura: 0, figX: 0, popilek: [], dalsiPopel: 3.5, popel: 0,
    snury: [noveKyvadlo(), noveKyvadlo(), noveKyvadlo()], rukavy: { L: noveKyvadlo(), P: noveKyvadlo() }, masle: noveKyvadlo(), vetev: noveKyvadlo(),
    vejirPred: null, mysPred: null, nahoda: rng(7719), zvuk: [], pohled: [0, 0], cinkl: -10, nejPred: 0, nota: 0,
  };
  /* tyčinka už chvíli hoří: stužka je natažená, než se scéna ukáže */
  for (let q = -7.5; q < 0; q += 1 / 30) krokKoure(dyn, q, 1 / 30);
  return dyn;
};
/* krátká melodie na šamisen: jedna nota na každou figuru tance */
const MELODIE = [0, 2, 4, 3, 5, 4, 2, 1, 0, 4, 6, 5, 7, 5, 4, 2];
const krok = (dyn, t, dt, vstup) => {
  const R = dyn.nahoda;
  const horelo = dyn.hori;
  /* ——— tyčinka ——— */
  if (dyn.hori && t - dyn.zapal >= HORI) {
    dyn.hori = false;
    dyn.konec = t;
    dyn.zvuk.push({ druh: "zvon", sila: 0.7, pan: 0.3 });
  }
  if (!dyn.hori && t - dyn.konec >= UKLON - 0.9) {
    dyn.hori = true;
    dyn.zapal = t;
    dyn.predehra = 0;
    dyn.tanecT = 0;
    dyn.dalsiTvar = t + A1 + N_T * DAVKA + 1.2;
    dyn.zvuk.push({ druh: "plamen", sila: 0.7, pan: 0.3 });
  }
  /* ——— kliknutí: lusknutí a tvar, nebo aspoň fouknutí ——— */
  const muze = () => dyn.hori && t - dyn.zapal < HORI - 2 && dyn.rezV == null && !drziTvar(dyn) && stuzkyDost(dyn);
  let chce = t > dyn.dalsiTvar;
  if (vstup.kliky && vstup.kliky.length) {
    const k = vstup.kliky[vstup.kliky.length - 1];
    vstup.kliky.length = 0;
    if (muze()) chce = true;
    else if (dyn.hori) {
      /* fouknutí od místa kliknutí */
      dyn.lusk = t;
      dyn.zvuk.push({ druh: "vejir", sila: 0.5, pan: -0.3 });
      for (const U of [dyn.hlavni, ...dyn.pruhy.filter((p) => p.typ === "volny").map((p) => p.uzly)])
        for (const u of U) {
          const dx = u.x - k.x, dy = u.y - k.y, d2 = dx * dx + dy * dy + 4;
          const w = 46 * Math.exp(-d2 / 900) / Math.sqrt(d2);
          u.vx += dx * w;
          u.vy += dy * w;
        }
    }
  }
  if (chce && muze()) {
    dyn.lusk = t;
    dyn.rezV = t + 0.13;
    dyn.dalsiTvar = t + 8.5 + R() * 2.5;
    dyn.zvuk.push({ druh: "vejir", sila: 1, pan: -0.3, za: 0.1 });
  }
  if (dyn.rezV != null && t >= dyn.rezV) {
    dyn.rezV = null;
    rez(dyn, t);
  }
  /* ——— tanec ——— */
  const uklani = !dyn.hori || t - dyn.konec < UKLON;
  if (!uklani) dyn.tanecT += dt;
  const p = poza(dyn, t);
  if (p.figura !== dyn.figura && !uklani) {
    dyn.figura = p.figura;
    dyn.zvuk.push({ druh: "struna", vys: MELODIE[dyn.nota++ % MELODIE.length], sila: 0.7, pan: -0.35 });
    dyn.zvuk.push({ druh: "klap", sila: 0.35, pan: -0.4, vys: dyn.nota % 2, za: 0.12 });
    if (p.figura === 3) dyn.zvuk.push({ druh: "latka", sila: 0.6, pan: -0.35, za: 0.3 });
  }
  /* tančí tam, kam se ukáže */
  const kam = vstup.mys && !uklani ? clamp(vstup.mys.x - 22 - FX, -16, 30) : 0;
  dyn.figX = kCili(dyn.figX, kam + p.x * K, dt, 0.45);
  /* vějíř fouká do kouře: čím rychleji se špička hýbe, tím víc */
  const sp = spickaVejire(dyn, p);
  if (dyn.vejirPred && dt > 0) {
    const v = [clamp((sp[0] - dyn.vejirPred[0]) / dt, -160, 160), clamp((sp[1] - dyn.vejirPred[1]) / dt, -160, 160)];
    if (Math.hypot(v[0], v[1]) > 8) fouk(dyn, sp, [v[0] * 1.1 * dt, v[1] * 1.1 * dt], 52);
  }
  dyn.vejirPred = sp;
  /* a kurzor taky, zblízka a silněji */
  if (vstup.mys && dyn.mysPred && dt > 0) {
    const v = [clamp((vstup.mys.x - dyn.mysPred.x) / dt, -260, 260), clamp((vstup.mys.y - dyn.mysPred.y) / dt, -260, 260)];
    if (Math.hypot(v[0], v[1]) > 6) fouk(dyn, [vstup.mys.x, vstup.mys.y], [v[0] * 2.6 * dt, v[1] * 2.6 * dt], 22);
  }
  dyn.mysPred = vstup.mys ? { ...vstup.mys } : null;
  krokKoure(dyn, t, dt);
  /* ——— popel: občas upadne do misky ——— */
  dyn.popel = dyn.hori ? Math.min(3.2, dyn.popel + dt * 0.5) : 0;
  if (dyn.hori && t > dyn.dalsiPopel) {
    dyn.dalsiPopel = t + 4 + R() * 3;
    const y = spicka(dyn, t);
    for (let i = 0; i < 3; i++) dyn.popilek.push({ x: TX + (R() - 0.5) * 1.2, y: y + i, vy: 4 + R() * 6, vx: (R() - 0.5) * 3, r: 0.5 + R() * 0.4, vek: 0 });
    dyn.popel = 0;
    dyn.zvuk.push({ druh: "syk", sila: 0.6, pan: 0.4 });
  }
  for (const q of dyn.popilek) {
    q.vek += dt;
    q.vy += 40 * dt;
    q.x += q.vx * dt;
    q.y = Math.min(164.4, q.y + q.vy * dt);
  }
  dyn.popilek = dyn.popilek.filter((q) => q.vek < 1.4);
  /* ——— co na ní visí ——— */
  const zavesX = (x) => x + dyn.figX / K;
  dyn.snury.forEach((q, i) => kyvadlo(q, zavesX(kanzashiStred(p.yaw)[0]), dt, { g: 52 + i * 9, c: 1.5 + i * 0.25, L: 17 + i * 2 }));
  kyvadlo(dyn.rukavy.L, zavesX(p.ruceP.L.H[0]), dt, { g: 30, c: 2.6, L: 26 });
  kyvadlo(dyn.rukavy.P, zavesX(p.ruceP.P.H[0]), dt, { g: 30, c: 2.6, L: 26 });
  kyvadlo(dyn.masle, zavesX(VAZ.cx + (polomer(122) + 1.5) * Math.sin(rad(180 + p.yaw))), dt, { g: 26, c: 2.2, L: 30 });
  kyvadlo(dyn.vetev, zavesX(VAZ.cx), dt, { g: 46, c: 2.4, L: 30 });
  const nej = Math.max(...dyn.snury.map((q) => Math.abs(q.w)));
  if (nej > 3 && dyn.nejPred <= 3 && t - dyn.cinkl > 0.25) {
    dyn.cinkl = t;
    dyn.zvuk.push({ druh: "cink", vys: Math.floor(R() * 6), sila: clamp(nej / 9, 0.2, 0.7), pan: -0.4 });
  }
  dyn.nejPred = nej;
  if (horelo && R() < dt * 0.3) dyn.zvuk.push({ druh: "cvrcek", sila: 0.45, pan: (R() - 0.5) * 1.6 });
  /* ——— pohled: na tvar, dokud drží; jinak za kurzorem ——— */
  const tv = naPlatno([90, 101]);
  const oko = [tv[0] + dyn.figX, tv[1]];
  let cil = [0, 0];
  if (drziTvar(dyn)) cil = [clamp((STRED[0] - oko[0]) / 40, -1, 1) * 1.9, clamp((STRED[1] - oko[1]) / 40, -1, 1) * 1.3];
  else if (vstup.mys) cil = [clamp((vstup.mys.x - oko[0]) / 34, -1, 1) * 1.9, clamp((vstup.mys.y - oko[1]) / 34, -1, 1) * 1.3];
  dyn.pohled = dyn.pohled.map((v, i) => kCili(v, cil[i], dt, 0.14));
};
const stav = (t, vstup = {}, dyn) => {
  const d = dyn || novaDynamika();
  const p = poza(d, t);
  const ul = t - d.lusk;
  let vyraz = "klid";
  if (p.uklon > 0.3) vyraz = "klid";
  else if (ul >= 0 && ul < 0.7) vyraz = "mrk";
  else if (drziTvar(d)) vyraz = "kouka";
  else if (vstup.mys) vyraz = "kouka";
  const yaw = ((p.yaw % 360) + 360) % 360;
  return {
    t, vyraz, hlavni: d.hlavni, pruhy: d.pruhy, hori: d.hori, spicka: spicka(d, t), popel: d.popel, popilek: d.popilek, pohled: d.pohled,
    o: {
      yaw, m: M, P, rust: 1,
      kyv: { masle: d.masle.a, snury: d.snury.map((q) => deg(q.a)), vetev: deg(d.vetev.a) * 0.5 },
      ruce: { L: { ...p.ruceP.L, kyv: deg(d.rukavy.L.a) }, P: { ...p.ruceP.P, kyv: deg(d.rukavy.P.a) } },
      vejir: { smer: p.smer, otevreni: p.otv, barvy: { papir: ["#E9E6F2", "#C9C6DE"], pruh: ["#A8443A", "#9A6A8E", "#6A5A92"] } },
    },
    fig: { x: d.figX, y: 0.5 * Math.sin(t * 1.6) * (1 - p.uklon), r: p.nakl + 0.5 * Math.sin(t * 0.8) },
    mrk: mrkani(t, [2.3, 5.9, 6.15, 9.4], 10.6),
    zhavy: d.hori ? 0.75 + 0.25 * Math.sin(t * 7.3) * Math.sin(t * 2.9) : 0,
  };
};
const snimek = (st) => Math.floor(st.t * 30);
const yawQ = (st) => Math.round(st.o.yaw / 2);
const pohyb = (st) => ({ x: st.fig.x, y: st.fig.y, r: st.fig.r, ox: FX, oy: ZEM });

export const lemTycinka = {
  id: "tycinka",
  viewBox: "0 0 180 180",
  defs,
  novaDynamika,
  krok,
  stav,
  hukot: () => ({ vitr: 0.14 }),
  klidne: { t: 3.6 },
  vrstvy: [
    { id: "tus", kresli: vrstvaTus, tezka: true },
    { id: "stin", kresli: vrstvaStin, orez: OREZ, pohyb: (st) => ({ x: st.fig.x, y: 0, r: 0, ox: FX, oy: ZEM }) },
    { id: "za", kresli: (st) => vPostave(vazZa(ID, st.o)), klic: (st) => `${yawQ(st)},${Math.round(st.o.kyv.masle * 30)}`, pohyb },
    { id: "rukavy-za", kresli: (st) => vPostave(vazRukavy(ID, st.o, true, { listky: "#B9B6D6" })), klic: (st) => klicRukavu(st.o), pohyb },
    { id: "okobo", kresli: (st) => vPostave(vazBoty(ID, st.o)), klic: yawQ, pohyb: (st) => ({ x: st.fig.x, y: 0, r: 0, ox: FX, oy: ZEM }) },
    { id: "vetvicka", kresli: (st) => vPostave(vazVetvicka(ID, M, { kyv: st.o.kyv.vetev, P })), klic: (st) => Math.round(st.o.kyv.vetev * 4), pohyb },
    { id: "telo", kresli: (st) => vPostave(vazTelo(ID, { yaw: st.o.yaw, P, listky: "#B9B6D6", listky2: "#9A8CB8" })), klic: yawQ, pohyb },
    { id: "tvar", kresli: vrstvaTvar, klic: (st) => `${f(st.pohled[0])},${f(st.pohled[1])},${f(st.mrk)},${st.vyraz},${yawQ(st)}`, pohyb },
    { id: "pred", kresli: (st) => vPostave(vazPred(ID, st.o)), klic: (st) => `${yawQ(st)},${Math.round(st.o.kyv.masle * 30)}`, pohyb },
    { id: "snury", kresli: (st) => vPostave(vazSnury(ID, M, { yaw: st.o.yaw, kyv: st.o.kyv.snury, P })), klic: (st) => `${yawQ(st)},${st.o.kyv.snury.map((a) => Math.round(a * 2)).join(",")}`, pohyb },
    { id: "rukavy-pred", kresli: (st) => vPostave(vazRukavy(ID, st.o, false, { listky: "#B9B6D6" })), klic: (st) => klicRukavu(st.o), pohyb },
    { id: "kour", kresli: vrstvaKour, klic: snimek, orez: OREZ },
    { id: "vpredu", kresli: vrstvaVpredu },
    { id: "tycinka", kresli: vrstvaTycinka, klic: (st) => `${Math.round(st.spicka * 5)},${st.hori ? Math.round(st.popel * 3) : -1}` },
    { id: "zhavy", kresli: vrstvaZhavy, klic: (st) => (st.hori ? Math.round(st.spicka * 5) : -1), pruhlednost: (st) => f(st.zhavy) },
    { id: "popel", kresli: vrstvaPopel, klic: (st) => (st.popilek.length ? snimek(st) : -1) },
  ],
};
