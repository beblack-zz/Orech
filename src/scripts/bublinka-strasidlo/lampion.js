/*
 * 03, Lampion — BUBLINKA LETÍ S ČÓČINEM
 *
 * Jako Pecinka s lampionem z průvodu na Domku 2, jen Bublinka nechodí:
 * letí. Bez pozadí — cestu jí dělá stránka, kam ji kdo postaví, sama se
 * jen vznáší na místě, nakloněná do směru letu a natočená trochu z boku.
 * Že letí, je vidět podle bublinek, které za ní zůstávají a ujíždějí
 * dozadu, a podle klobouku, který jí vítr zvedá vpředu.
 *
 * Na bambusové tyči nese papírovou lucernu čóčin se třemi bublinami
 * místo erbu. Svíčku v ní nemá: svítí jí jedna z jejích dvou bludiček,
 * které z lucerny kouká ocásek. Druhá letí za ní. Lucerna se houpe jako
 * kyvadlo a studené světlo z ní padá na zem i na Bublinku.
 *
 * Myš: Bublinka zvedne lucernu tam, kam kurzor ukazuje, a kouká za ním.
 * Kliknutí: bludička z lucerny vyklouzne, lucerna zhasne, bludička
 * obletí Bublince klobouk a vrátí se dovnitř.
 */
import {
  f, rng, clamp, lerp, smooth, rad, pt, mrkani, jiskraD, kCili,
  bubDefs, bubTelo, bubLesk, bubTvar, bubKlobouk, filmPruhy, filmSamo, ruckaB, ruckaDucha, plaminek, onibiDefs, krokOnibi,
} from "./spolecne.js";

const ID = "bsl";
const B0 = [62, 102];
const R = 32;
const K = R / 46;
const POSTAVA = `translate(${B0[0]} ${B0[1]}) scale(${K}) translate(-90 -96)`;
const vPostave = (s) => `<g transform="${POSTAVA}">${s}</g>`;
const ZEM = 165;
/* tvář je natočená do směru letu: posunutá a trochu zúžená */
const NATOCENI = 6.5;
const TVAR = `translate(${90 + NATOCENI} 0) scale(0.93 1) translate(-90 0)`;

/* tyč: od dlaně ke špičce, lucerna visí na háčku */
const TYC = 46, TYC_ZA = 10;
const UHEL0 = -46;
const G = 300, ZAVES = 20;
/* lucerna v souřadnicích háčku: y dolů */
const LAMP = { hak: 4, telo: [7, 31], r0: 6.4, r1: 11 };
const polomerL = (v) => LAMP.r0 + (LAMP.r1 - LAMP.r0) * Math.pow(Math.sin(Math.PI * clamp(v)), 0.7);
const TELO_L = (() => {
  const L = [], P = [];
  for (let i = 0; i <= 14; i++) {
    const v = i / 14, y = lerp(LAMP.telo[0], LAMP.telo[1], v);
    L.push([-polomerL(v), y]);
    P.push([polomerL(v), y]);
  }
  return `M${L.map(pt).join(" L")} L${P.reverse().map(pt).join(" L")} Z`;
})();
const ZEBRA = Array.from({ length: 7 }, (_, i) => {
  const v = (i + 1) / 8, y = lerp(LAMP.telo[0], LAMP.telo[1], v), r = polomerL(v);
  return `M${f(-r)} ${f(y)} Q0 ${f(y + 1.5)} ${f(r)} ${f(y)}`;
}).join(" ");
const STRED_L = 19;
/* útěk bludičky: ven z lucerny, kolem klobouku a zpátky */
const VEN = 0.35, KOLEM = 2.7, ZPET = 3.5;

/** Bod z kresby Bublinky (0–180) do panelu i s tím, jak se právě vznáší a naklání. */
const naTelo = ([x, y], fig) => {
  const dx = (x - 90) * K, dy = (y - 96) * K;
  const c = Math.cos(rad(fig.r)), s = Math.sin(rad(fig.r));
  return [B0[0] + fig.x + dx * c - dy * s, B0[1] + fig.y + dx * s + dy * c];
};
const dlan = (fig) => naTelo([137, 120], fig);
const spicka = (fig, uhel) => {
  const H = dlan(fig);
  return [H[0] + Math.cos(rad(uhel)) * TYC, H[1] + Math.sin(rad(uhel)) * TYC];
};
/** Bod lucerny (v souřadnicích háčku) v panelu: houpe se o úhel th kolem špičky. */
const naLampe = (T, th, [x, y]) => [T[0] + x * Math.cos(th) + y * Math.sin(th), T[1] - x * Math.sin(th) + y * Math.cos(th)];

/* ——— Vrstvy ——— */
const vrstvaZem = (st) => {
  const v = clamp(1 - st.fig.y / 14, 0.7, 1.3);
  const L = naLampe(st.T, st.th, [0, STRED_L]);
  return (
    `<ellipse cx="${f(B0[0] + st.fig.x)}" cy="${ZEM}" rx="${f(21 * v)}" ry="${f(3 * v)}" fill="#3A3550" opacity="${f(0.17 * v)}"/>` +
    `<ellipse cx="${f(L[0])}" cy="${ZEM}" rx="${f(27 + 3 * st.svetlo)}" ry="4.6" fill="url(#${ID}-louze)" opacity="${f(0.75 * st.svetlo)}"/>` +
    `<ellipse cx="${f(L[0])}" cy="${ZEM + 0.6}" rx="8" ry="1.3" fill="#3A3550" opacity="0.13"/>`
  );
};
/* bublinky za ní: zůstávají ve vzduchu, a tak ujíždějí dozadu; na konci prasknou */
const vrstvaBubliny = (st) =>
  st.bubliny
    .map((b) => {
      const u = b.vek / b.zivot;
      if (u > 0.93) {
        const q = (u - 0.93) / 0.07;
        return `<g stroke="#8FB9C6" stroke-width="0.5" stroke-linecap="round" opacity="${f(1 - q)}">${[0, 60, 120, 180, 240, 300].map((a) => `<path d="M${f(b.x + Math.cos(rad(a)) * b.r * (1 + q * 0.4))} ${f(b.y + Math.sin(rad(a)) * b.r * (1 + q * 0.4))} L${f(b.x + Math.cos(rad(a)) * b.r * (1.5 + q))} ${f(b.y + Math.sin(rad(a)) * b.r * (1.5 + q))}"/>`).join("")}</g>`;
      }
      const op = clamp(u / 0.1) * 0.9;
      return (
        `<circle cx="${f(b.x)}" cy="${f(b.y)}" r="${f(b.r)}" fill="#FFFFFF" fill-opacity="0.34" stroke="#6B5D4F" stroke-opacity="0.5" stroke-width="0.45" opacity="${f(op)}"/>` +
        `<path d="M${f(b.x - b.r * 0.55)} ${f(b.y - b.r * 0.1)} A${f(b.r * 0.6)} ${f(b.r * 0.6)} 0 0 1 ${f(b.x - b.r * 0.05)} ${f(b.y - b.r * 0.58)}" stroke="#FFFFFF" stroke-width="${f(Math.max(0.3, b.r * 0.22))}" stroke-linecap="round" fill="none" opacity="${f(op)}"/>`
      );
    })
    .join("");
const vrstvaOnibiZadni = (st) => {
  const o = st.onibi[1];
  return plaminek(o.x, o.y, o.smer, { id: ID, r: 3.3, delka: 11 + o.rychlost * 0.05, t: st.t, fz: o.fz, barva: "#DDF6F0", lem: "#58A9C4", sila: 0.85 + 0.08 * Math.sin(st.t * 5) });
};
const vrstvaRukaZadni = (st) => vPostave(ruckaDucha([47.6, 112], [35, 110], { uhel: 30 + 8 * Math.sin(st.t * 1.5 + 0.6), ohyb: 1, delka: 13 }));
const vrstvaTelo = () => vPostave(bubTelo(ID));
const vrstvaFilm = (st) => vPostave(`<g clip-path="url(#${ID}-bublina)" mask="url(#${ID}-film-maska)" opacity="0.2">${filmPruhy(st, filmSamo(st.t))}</g>`);
/* studené světlo lucerny na pravém boku */
const vrstvaSvit = () => vPostave(`<circle cx="90" cy="96" r="45.4" fill="url(#${ID}-svit)"/>`);
const vrstvaLesk = () => vPostave(bubLesk());
const vrstvaTvar = (st) => vPostave(`<g transform="${TVAR}">${bubTvar(ID, { dx: st.pohled[0], dy: st.pohled[1], mrk: st.mrk, vyraz: st.vyraz, tvare: 0.45 })}</g>`);
const vrstvaKlobouk = (st) => vPostave(bubKlobouk(ID, { kyv: st.kyv, brada: NATOCENI }));

/* bambusová tyč s kolínky, ručka, která ji drží, a háček na špičce */
const vrstvaTyc = (st) => {
  const H = dlan(st.fig), T = st.T;
  const d = [Math.cos(rad(st.uhel)), Math.sin(rad(st.uhel))], n = [-d[1], d[0]];
  const E = [H[0] - d[0] * TYC_ZA, H[1] - d[1] * TYC_ZA];
  let s = `<path d="M${pt(E)} L${pt(T)}" stroke="#4E4226" stroke-width="3" stroke-linecap="round"/><path d="M${pt(E)} L${pt(T)}" stroke="#A8935A" stroke-width="1.9" stroke-linecap="round"/>`;
  s += `<path d="M${pt([E[0] + n[0] * 0.5, E[1] + n[1] * 0.5])} L${pt([T[0] + n[0] * 0.5, T[1] + n[1] * 0.5])}" stroke="#D2C28A" stroke-width="0.5" stroke-linecap="round" opacity="0.8"/>`;
  for (const q of [0.06, 0.34, 0.62, 0.9]) {
    const P = [lerp(E[0], T[0], q), lerp(E[1], T[1], q)];
    s += `<path d="M${pt([P[0] - n[0] * 1.35, P[1] - n[1] * 1.35])} L${pt([P[0] + n[0] * 1.35, P[1] + n[1] * 1.35])}" stroke="#4E4226" stroke-width="0.7" stroke-linecap="round"/>`;
  }
  /* ručka z ramene a pěst přes tyč */
  const S = naTelo([127, 111], st.fig);
  s += ruckaB(S, H, { tl: 4.4 * K, ohyb: -1, pest: false });
  s += `<ellipse cx="${f(H[0])}" cy="${f(H[1])}" rx="${f(4.6 * K)}" ry="${f(4.1 * K)}" transform="rotate(${f(st.uhel + 90)} ${f(H[0])} ${f(H[1])})" fill="#F1E7D7" stroke="#6B5D4F" stroke-width="0.8"/>`;
  s += `<path d="M${pt([H[0] - d[0] * 1.2 - n[0] * 1.6, H[1] - d[1] * 1.2 - n[1] * 1.6])} L${pt([H[0] - d[0] * 1.2 + n[0] * 1.2, H[1] - d[1] * 1.2 + n[1] * 1.2])} M${pt([H[0] + d[0] * 0.6 - n[0] * 1.6, H[1] + d[1] * 0.6 - n[1] * 1.6])} L${pt([H[0] + d[0] * 0.6 + n[0] * 1.2, H[1] + d[1] * 0.6 + n[1] * 1.2])}" stroke="#8A7A69" stroke-width="0.45" stroke-linecap="round"/>`;
  return s;
};
const vrstvaLampion = (st) => {
  const sv = st.svetlo;
  const uhel = (-st.th * 180) / Math.PI;
  /* ocásek bludičky kouká z lucerny ven a vlní se */
  const w = Math.sin(st.t * 7.3) * 1.3, w2 = Math.sin(st.t * 5.1 + 1) * 0.8;
  const ocasek = st.doma > 0.05
    ? `<path d="M-1.9 5 Q${f(-2.4 + w)} 0.6 ${f(w * 1.6 + w2)} ${f(-4.6 * st.doma)} Q${f(2.4 + w)} 0.6 1.9 5 Z" fill="#DDF6F0" stroke="#58A9C4" stroke-width="0.45" stroke-linejoin="round" opacity="${f(st.doma)}"/>`
    : "";
  return (
    `<g transform="translate(${pt(st.T)}) rotate(${f(uhel)})">` +
    `<path d="M0 -0.6 V${LAMP.hak}" stroke="#2A2422" stroke-width="0.8" stroke-linecap="round"/><circle cx="0" cy="-0.4" r="1.2" fill="none" stroke="#2A2422" stroke-width="0.7"/>` +
    ocasek +
    /* papír: zevnitř svítí, bez bludičky zešedne */
    `<path d="${TELO_L}" fill="url(#${ID}-papir)"/>` +
    `<path d="${TELO_L}" fill="#A8A69C" opacity="${f(0.86 * (1 - sv))}"/>` +
    `<ellipse cx="0" cy="${STRED_L}" rx="6" ry="9" fill="url(#${ID}-jadro)" opacity="${f(sv)}"/>` +
    `<path d="${ZEBRA}" stroke="#5E7C8A" stroke-width="0.35" fill="none" opacity="0.7"/>` +
    /* tři bubliny místo erbu */
    `<g fill="none" stroke="#2A3877" stroke-width="0.85">${[[0, 15.4], [-3, 20.6], [3, 20.6]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.55"/><path d="M${x - 1.3} ${y - 0.3} A1.4 1.4 0 0 1 ${x - 0.2} ${y - 1.4}" stroke-width="0.45" stroke-linecap="round"/>`).join("")}</g>` +
    `<path d="${TELO_L}" fill="none" stroke="#1B1E3C" stroke-width="0.55" stroke-linejoin="round"/>` +
    /* lakované obruče nahoře a dole, střapec */
    `<rect x="-6.6" y="${LAMP.hak}" width="13.2" height="3.2" rx="1" fill="#1B1E3C" stroke="#0C0E22" stroke-width="0.4"/><path d="M-5.4 5.2 H5.4" stroke="#C9D8EA" stroke-width="0.35"/>` +
    `<rect x="-6.6" y="${LAMP.telo[1] - 0.2}" width="13.2" height="3.2" rx="1" fill="#1B1E3C" stroke="#0C0E22" stroke-width="0.4"/><path d="M-5.4 ${LAMP.telo[1] + 2} H5.4" stroke="#C9D8EA" stroke-width="0.35"/>` +
    `<g transform="translate(0 ${LAMP.telo[1] + 3}) rotate(${f((st.thV || 0) * -5)})"><path d="M0 0 V3" stroke="#2F8FA6" stroke-width="0.8"/><circle cx="0" cy="3.6" r="1.3" fill="#DCE8F4" stroke="#5E7C8A" stroke-width="0.35"/><path d="M-1.4 4.6 L-2 11.4 L2 11.4 L1.4 4.6 Z" fill="#2F8FA6" stroke="#1F5F8E" stroke-width="0.4" stroke-linejoin="round"/><path d="M-0.8 5.4 V11 M0 5.4 V11.2 M0.8 5.4 V11" stroke="#1F5F8E" stroke-width="0.3"/></g>` +
    `</g>`
  );
};
const vrstvaZare = (st) => {
  const L = naLampe(st.T, st.th, [0, STRED_L]);
  return `<circle cx="${f(L[0])}" cy="${f(L[1])}" r="${f(38 + 2 * Math.sin(st.t * 9))}" fill="url(#${ID}-onibi-zare)" opacity="${f(0.9 * st.svetlo)}"/>`;
};
const vrstvaOnibiVenku = (st) => {
  const o = st.onibi[0];
  return st.venku > 0.03 ? plaminek(o.x, o.y, o.smer, { id: ID, r: 3.6 * st.venku, delka: (11 + o.rychlost * 0.06) * st.venku, t: st.t, fz: o.fz, barva: "#DDF6F0", lem: "#58A9C4", sila: 1 }) : "";
};
const vrstvaJiskry = (st) =>
  st.jiskry
    .map((j) => {
      const u = j.vek / j.zivot;
      return `<path d="${jiskraD(j.r * (1 - u * 0.4))}" transform="translate(${f(j.x)} ${f(j.y)}) rotate(${f(j.rot + u * 70)})" fill="#F2FFF8" stroke="#2F7C8F" stroke-width="0.25" opacity="${f(clamp(Math.min(u / 0.1, (1 - u) / 0.5)))}"/>`;
    })
    .join("");

const defs = () =>
  bubDefs(ID, { pruhledna: 0.5 }) +
  onibiDefs(ID) +
  `<radialGradient id="${ID}-papir" cx="0.5" cy="0.52" r="0.66"><stop offset="0" stop-color="#FCFFFD"/><stop offset="0.55" stop-color="#D2F6EE"/><stop offset="1" stop-color="#8CCDD2"/></radialGradient>` +
  `<radialGradient id="${ID}-jadro"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.95"/><stop offset="0.6" stop-color="#FFFFFF" stop-opacity="0.3"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="${ID}-louze"><stop offset="0" stop-color="#9FE2E6" stop-opacity="0.7"/><stop offset="0.6" stop-color="#7FC8DA" stop-opacity="0.24"/><stop offset="1" stop-color="#7FC8DA" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="${ID}-svit" cx="1.04" cy="0.5" r="0.7"><stop offset="0" stop-color="#9FE6F2" stop-opacity="0.75"/><stop offset="0.6" stop-color="#9FE6F2" stop-opacity="0.16"/><stop offset="1" stop-color="#9FE6F2" stop-opacity="0"/></radialGradient>`;

/* ——— Simulace ——— */
const figV = (t) => ({ x: 0, y: 3.4 * Math.sin(t * 1.5), r: 5 + 1.6 * Math.sin(t * 1.5 + 0.8) });
const novaDynamika = () => {
  const fig = figV(0);
  const T = spicka(fig, UHEL0);
  return {
    uhel: UHEL0, th: -0.1, thV: 0, T, TV: [0, 0], unik: null, svetlo: 1, smich: -100,
    onibi: [
      { x: T[0], y: T[1] + STRED_L, vx: 0, vy: 0, smer: -Math.PI / 2, rychlost: 0, fz: 0.7 },
      { x: B0[0] - 47, y: B0[1] - 10, vx: 0, vy: 0, smer: Math.PI, rychlost: 0, fz: 2.9 },
    ],
    bubliny: [], akum: 0, jiskry: [], nahoda: rng(606), zvuk: [], pohled: [0, 0],
  };
};
const novaBublina = (dyn, R2, fig, t) => {
  dyn.bubliny.push({
    x: B0[0] - R * (0.72 + R2() * 0.24), y: B0[1] + fig.y + (R2() - 0.5) * R * 1.3,
    vx: -(18 + R2() * 16), vy: -(2 + R2() * 8), r: 1.1 + R2() * R2() * 3, vek: 0, zivot: 1.5 + R2() * 1.3, fz: R2() * 6.28,
  });
};
const krok = (dyn, t, dt, vstup) => {
  const R2 = dyn.nahoda;
  const fig = figV(t);
  const H = dlan(fig);
  /* lucernu zvedá za kurzorem */
  let cil = UHEL0 + 4 * Math.sin(t * 0.8);
  if (vstup.mys) cil = clamp((Math.atan2(vstup.mys.y - H[1], vstup.mys.x - H[0]) * 180) / Math.PI, -80, -12);
  dyn.uhel = kCili(dyn.uhel, cil, dt, 0.22);
  /* kyvadlo: rozhoupe ho zrychlení špičky tyče, vzduch ho při letu tlačí dozadu */
  const T = spicka(fig, dyn.uhel);
  const h = Math.max(dt, 1e-4);
  const TV = [(T[0] - dyn.T[0]) / h, (T[1] - dyn.T[1]) / h];
  const ax = clamp((TV[0] - dyn.TV[0]) / h, -900, 900);
  dyn.T = T;
  dyn.TV = TV;
  dyn.thV += (-(G / ZAVES) * Math.sin(dyn.th) - 1.5 * dyn.thV - (ax / ZAVES) * Math.cos(dyn.th) - 1.6) * dt;
  dyn.th = clamp(dyn.th + dyn.thV * dt, -1.2, 1.2);
  /* kliknutí: bludička vyklouzne z lucerny */
  if (vstup.kliky && vstup.kliky.length) {
    vstup.kliky.length = 0;
    if (dyn.unik == null) {
      dyn.unik = t;
      const o = dyn.onibi[0];
      [o.x, o.y] = naLampe(T, dyn.th, [0, 4]);
      o.vx = 0;
      o.vy = -30;
      dyn.zvuk.push({ druh: "pop", sila: 0.8, pan: 0.4 });
      dyn.zvuk.push({ druh: "pisk", sila: 0.5, pan: 0.2, za: 0.1 });
    }
  }
  const o = dyn.onibi[0];
  if (dyn.unik != null) {
    const u = t - dyn.unik;
    const vrch = naLampe(T, dyn.th, [0, 2]);
    let kam;
    if (u < VEN) kam = [vrch[0], vrch[1] - 12];
    else if (u < KOLEM) {
      /* kolem klobouku: jeden a půl okruhu proti směru hodin */
      const q = (u - VEN) / (KOLEM - VEN);
      const a = rad(-20 - q * 540);
      kam = [B0[0] + Math.cos(a) * 50, B0[1] + fig.y - 24 + Math.sin(a) * 26];
    } else kam = vrch;
    krokOnibi(o, kam, dt, { tuhost: u < KOLEM ? 34 : 70, tlumeni: u < KOLEM ? 8 : 13 });
    if (u > ZPET || (u > KOLEM + 0.25 && Math.hypot(o.x - vrch[0], o.y - vrch[1]) < 3)) {
      dyn.unik = null;
      dyn.smich = t;
      dyn.zvuk.push({ druh: "zapal", vys: 7, sila: 0.9, pan: 0.4 });
      dyn.zvuk.push({ druh: "smich", sila: 0.6, pan: 0, za: 0.25 });
      const L = naLampe(T, dyn.th, [0, STRED_L]);
      for (let i = 0; i < 12; i++) dyn.jiskry.push({ x: L[0] + (R2() - 0.5) * 16, y: L[1] + (R2() - 0.5) * 20, vx: (R2() - 0.5) * 30, vy: (R2() - 0.5) * 30, vek: 0, zivot: 0.7 + R2() * 0.6, r: 0.9 + R2() * 1.4, rot: R2() * 90 });
    }
  } else {
    [o.x, o.y] = naLampe(T, dyn.th, [0, STRED_L]);
  }
  dyn.svetlo = kCili(dyn.svetlo, dyn.unik != null ? 0.1 : 1, dt, dyn.unik != null ? 0.12 : 0.18);
  /* druhá bludička letí za ní */
  krokOnibi(dyn.onibi[1], [B0[0] - 47 + 4 * Math.sin(t * 0.9), B0[1] + fig.y * 0.6 - 10 + 4 * Math.sin(t * 1.3)], dt, { tuhost: 12, tlumeni: 5 });
  /* letí se doprava, ocásek jí vlaje dozadu */
  dyn.onibi[1].smer = Math.PI + 0.22 * Math.sin(t * 2.1);
  /* bublinky v brázdě */
  dyn.akum += dt * 4.2;
  while (dyn.akum >= 1) {
    dyn.akum -= 1;
    novaBublina(dyn, R2, fig, t);
  }
  for (const b of dyn.bubliny) {
    b.vek += dt;
    b.x += b.vx * dt;
    b.y += (b.vy + Math.sin(b.vek * 4 + b.fz) * 5) * dt;
    b.vx *= 1 - dt * 0.25;
    if (b.vek > b.zivot * 0.93 && !b.prask) {
      b.prask = true;
      if (b.r > 2.4 && R2() < 0.5) dyn.zvuk.push({ druh: "bublina", sila: 0.4, pan: clamp((b.x - 90) / 80, -1, 1) });
    }
  }
  dyn.bubliny = dyn.bubliny.filter((b) => b.vek < b.zivot);
  for (const j of dyn.jiskry) {
    j.vek += dt;
    j.x += j.vx * dt;
    j.y += j.vy * dt;
    j.vx *= 1 - dt * 2;
    j.vy *= 1 - dt * 2;
  }
  dyn.jiskry = dyn.jiskry.filter((j) => j.vek < j.zivot);
  /* pohled: za uteklou bludičkou, za kurzorem, jinak na lucernu */
  const L = naLampe(T, dyn.th, [0, STRED_L]);
  const kam = dyn.unik != null ? [o.x, o.y] : vstup.mys ? [vstup.mys.x, vstup.mys.y] : L;
  const c = [B0[0], B0[1] + fig.y];
  const cp = [clamp((kam[0] - c[0]) / 40, -1, 1) * 2.2, clamp((kam[1] - c[1]) / 40, -1, 1) * 1.6];
  dyn.pohled = dyn.pohled.map((q, i) => kCili(q, cp[i], dt, 0.12));
};
const stav = (t, vstup = {}, dyn) => {
  const d = dyn || novaDynamika();
  const fig = figV(t);
  const u = d.unik != null ? t - d.unik : -1;
  let vyraz = "smug";
  if (u >= 0 && u < 0.9) vyraz = "uzas";
  else if (t - d.smich < 1.1) vyraz = "smich";
  return {
    t, fig, uhel: d.uhel, T: d.T, th: d.th, thV: d.thV, svetlo: d.svetlo, onibi: d.onibi, bubliny: d.bubliny, jiskry: d.jiskry, vyraz,
    /* jak moc je bludička venku (roste, když leze ven, a mizí, když zalézá) a jak moc doma */
    venku: u < 0 ? 0 : smooth(u / 0.25),
    doma: u < 0 ? smooth((t - d.smich) / 0.4 + (d.smich < 0 ? 1 : 0)) : 1 - smooth(u / 0.2),
    /* klobouk vítr zvedá vpředu, a tak se kloní dozadu */
    kyv: -26 + 4 * Math.sin(t * 2.3) + 2 * Math.sin(t * 5.1),
    pohled: d.pohled, mrk: mrkani(t, [1.9, 5.1, 5.36, 8.2], 9.4),
  };
};
const snimek = (st) => Math.floor(st.t * 30);
const pohyb = (st) => ({ x: st.fig.x, y: st.fig.y, r: st.fig.r, ox: B0[0], oy: B0[1] });

export const lampion = {
  id: "lampion",
  viewBox: "0 0 180 180",
  defs,
  novaDynamika,
  krok,
  stav,
  hukot: (st) => ({ vitr: 0.3 + 0.1 * Math.sin(st.t * 0.7) }),
  klidne: { t: 2.6 },
  vrstvy: [
    { id: "zem", kresli: vrstvaZem, klic: snimek },
    { id: "bubliny", kresli: vrstvaBubliny, klic: snimek },
    { id: "onibi-zadni", kresli: vrstvaOnibiZadni, klic: snimek },
    { id: "ruka-zadni", kresli: vrstvaRukaZadni, klic: (st) => Math.floor(st.t * 20), pohyb },
    { id: "telo", kresli: vrstvaTelo, tezka: true, pohyb },
    { id: "film", kresli: vrstvaFilm, klic: (st) => Math.floor(st.t * 15), pohyb },
    { id: "svit", kresli: vrstvaSvit, pohyb, pruhlednost: (st) => f(st.svetlo) },
    { id: "lesk", kresli: vrstvaLesk, pohyb },
    { id: "tvar", kresli: vrstvaTvar, klic: (st) => `${f(st.pohled[0])},${f(st.pohled[1])},${f(st.mrk)},${st.vyraz}`, pohyb },
    { id: "klobouk", kresli: vrstvaKlobouk, klic: (st) => f(Math.round(st.kyv * 4) / 4), pohyb },
    { id: "zare", kresli: vrstvaZare, klic: snimek },
    { id: "tyc", kresli: vrstvaTyc, klic: snimek },
    { id: "lampion", kresli: vrstvaLampion, klic: snimek },
    { id: "onibi-venku", kresli: vrstvaOnibiVenku, klic: (st) => (st.venku > 0.03 ? snimek(st) : -1) },
    { id: "jiskry", kresli: vrstvaJiskry, klic: (st) => (st.jiskry.length ? snimek(st) : -1) },
  ],
};
