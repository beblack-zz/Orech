/**
 * Tvar — jak se z hroudy stane kus.
 *
 *   kruhKrok(i)   šest snímků z točení na elektrickém kruhu: centrování,
 *                 otevření, vytažení, tvarování, odříznutí, obrábění.
 *                 Kruh je ve všech šesti stejný a na stejném místě, mění
 *                 se jen hlína, nástroje a šipky. Rumělkové šipky ukazují,
 *                 kam tlačí prsty (ruce se nekreslí), šedá zahnutá šipka
 *                 u hlavy říká, že se kruh točí.
 *   vRuce(druh)   modelování v ruce: mačkaná miska, válečky, pláty —
 *                 vinětky na průhledném pozadí (leží na papíře).
 *
 * Kruh vidíme z boku trochu shora, stejně jako nádoby (ELIPSA). Kus, který
 * z kruhu vyjde, je hrnek z nadoba() — tentýž, který jde po celé stránce.
 * Světlo zleva shora, stíny doprava.
 *
 * Všechna id začínají předponou `p` a číslem snímku (`dtv-k3-…`) nebo
 * písmenem vinětky (`dtv-rm-…`), takže šest snímků a tři vinětky můžou
 * stát na jedné stránce i s výchozí předponou.
 *
 * Háčky pro jemnou animaci v CSS (kresba je hotová i bez nich):
 *   .dtv-sipka     rumělkové šipky — kam tlačí prsty
 *   .dtv-otaceni   šedá zahnutá šipka u hlavy kruhu
 *   .dtv-stuzka    stužka hlíny, která se kroutí z očka (krok 5)
 */
import { HLINA, P, f, hladce, smichej, valcovy, svisly, mekkyStin, nahoda, mix } from "./zaklad";
import type { Bod, Trojice } from "./zaklad";
import { nadoba, OBRYSY, ELIPSA, SMRST } from "./nadoba";

export type KrokKruhu = 0 | 1 | 2 | 3 | 4 | 5;
export type DruhVRuce = "mackana" | "valecky" | "platy";

/* ════════ Společné kousky ════════ */

const K = ELIPSA;
const RUM = P.rumelka;
const HALO = P.papir;

const el = (cx: number, cy: number, rx: number, ry: number, a: string) =>
  `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" ${a}/>`;

const bodyD = (b: Bod[]) => `M${f(b[0][0])} ${f(b[0][1])}${hladce(b)}`;

/** Uzavřená hladká křivka (body bez opakování prvního na konci) */
function uzavrena(b: Bod[]): string {
  const n = b.length;
  let d = `M${f(b[0][0])} ${f(b[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = b[(i - 1 + n) % n];
    const p1 = b[i];
    const p2 = b[(i + 1) % n];
    const p3 = b[(i + 2) % n];
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + "Z";
}

const lomena = (b: Bod[]) => `M${b.map((p) => `${f(p[0])} ${f(p[1])}`).join(" L")}Z`;

/** Bod na elipse; úhel 90° = vpředu (dole na obrazovce) */
const naElipse = (cx: number, cy: number, rx: number, ry: number, st: number): Bod => {
  const a = (st * Math.PI) / 180;
  return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
};

/** Body oblouku elipsy od úhlu a0 do a1 (ve stupních) */
const oblouk = (cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n = 12): Bod[] =>
  Array.from({ length: n + 1 }, (_, i) => naElipse(cx, cy, rx, ry, mix(a0, a1, i / n)));

/**
 * Šipka: hladká čára bodů a hrot na konci. Pod ní světlý lem, ať je
 * vidět i přes tmavou mokrou hlínu.
 */
function sipka(body: Bod[], o: { sirka?: number; hrot?: number; barva?: string; halo?: number; trida?: string } = {}): string {
  const sw = o.sirka ?? 5.2;
  const hl = o.hrot ?? sw * 3;
  const barva = o.barva ?? RUM;
  const n = body.length;
  const T = body[n - 1];
  const A = body[n - 2];
  const dl = Math.hypot(T[0] - A[0], T[1] - A[1]) || 1;
  const ux = (T[0] - A[0]) / dl;
  const uy = (T[1] - A[1]) / dl;
  const nx = -uy;
  const ny = ux;
  const B: Bod = [T[0] - ux * hl, T[1] - uy * hl];
  const hw = hl * 0.6;
  const d = bodyD([...body.slice(0, -1), [B[0] + ux * 2, B[1] + uy * 2]]);
  const L: Bod = [B[0] + nx * hw, B[1] + ny * hw];
  const R: Bod = [B[0] - nx * hw, B[1] - ny * hw];
  const Q: Bod = [B[0] + ux * hl * 0.32, B[1] + uy * hl * 0.32];
  const hrot = `M${f(L[0])} ${f(L[1])} L${f(T[0])} ${f(T[1])} L${f(R[0])} ${f(R[1])} Q${f(Q[0])} ${f(Q[1])} ${f(L[0])} ${f(L[1])}Z`;
  const halo = o.halo ?? 0.92;
  let s = "";
  if (halo > 0) {
    s += `<path d="${d}" stroke="${HALO}" stroke-width="${f(sw + 4.4)}" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="${f(halo)}"/>`;
    s += `<path d="${hrot}" fill="${HALO}" stroke="${HALO}" stroke-width="4.4" stroke-linejoin="round" opacity="${f(halo)}"/>`;
  }
  s += `<path d="${d}" stroke="${barva}" stroke-width="${f(sw)}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  s += `<path d="${hrot}" fill="${barva}" stroke="${barva}" stroke-width="1.6" stroke-linejoin="round"/>`;
  return `<g class="${o.trida ?? "dtv-sipka"}">${s}</g>`;
}

/**
 * Obrys rotačního tělesa viděného trochu shora: obálka vodorovných elips.
 * `prof` = (poloměr, výška) odspodu nahoru, `y0` = střed podstavy.
 */
function obal(x: number, y0: number, prof: Bod[], k: number, M = 40) {
  const hus: Bod[] = [];
  for (let i = 0; i < prof.length - 1; i++) {
    const [r0, h0] = prof[i];
    const [r1, h1] = prof[i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(r1 - r0, h1 - h0) / 1.2));
    for (let j = 0; j < n; j++) hus.push([mix(r0, r1, j / n), mix(h0, h1, j / n)]);
  }
  hus.push(prof[prof.length - 1]);
  const R = Math.max(...hus.map((b) => b[0]));
  const top: Bod[] = [];
  const bot: Bod[] = [];
  for (let i = 0; i <= M; i++) {
    const xx = -Math.cos((Math.PI * i) / M) * R;
    let yt = Infinity;
    let yb = -Infinity;
    for (const [r, h] of hus) {
      if (r + 1e-9 < Math.abs(xx)) continue;
      const s = Math.sqrt(Math.max(0, 1 - (xx / r) ** 2)) * r * k;
      yt = Math.min(yt, y0 - h - s);
      yb = Math.max(yb, y0 - h + s);
    }
    top.push([x + xx, yt]);
    bot.push([x + xx, yb]);
  }
  const d = `M${f(top[0][0])} ${f(top[0][1])}${hladce(top)}${hladce([...bot].reverse())}Z`;
  return { d, top, bot, R };
}

/** Poloměr profilu ve výšce h (lineárně mezi body) */
function rVe(prof: Bod[], h: number) {
  for (let i = 0; i < prof.length - 1; i++) {
    const [r0, h0] = prof[i];
    const [r1, h1] = prof[i + 1];
    if (h >= h0 && h <= h1) return mix(r0, r1, (h - h0) / (h1 - h0 || 1));
  }
  return h < prof[0][1] ? prof[0][0] : prof[prof.length - 1][0];
}

/**
 * Hlína jako rotační těleso — stejné světlo, lesk a rýhy jako nadoba(),
 * jen s libovolným profilem (kužel, bochník, kus dnem vzhůru).
 * Vrací tělo (`pod`) a věci, které patří dovnitř obrysu (`vnitrni`).
 */
function telo(o: { id: string; x: number; y0: number; prof: Bod[]; barvy: Trojice; lesk: number; ryhy?: number; ryhyH?: number[]; leskDo?: number; k?: number }) {
  const { id, x, y0, prof, barvy, lesk } = o;
  const k = o.k ?? K;
  const ob = obal(x, y0, prof, k);
  const defs: string[] = [];
  const vnitrni: string[] = [];
  const H = prof[prof.length - 1][1];
  const R0 = prof[0][0];
  defs.push(valcovy(`${id}-t`, barvy, lesk > 0.5 ? 0.3 : 0.34));
  defs.push(svisly(`${id}-ao`, "#1E140E", "#1E140E", 0, 0.24));
  defs.push(`<clipPath id="${id}-c"><path d="${ob.d}"/></clipPath>`);
  const pod = `<path d="${ob.d}" fill="url(#${id}-t)"/>`;

  /* Rýhy po prstech — přední oblouky */
  const ryhy = o.ryhy ?? 0;
  if (ryhy > 0 && o.ryhyH) {
    for (const h of o.ryhyH) {
      const r = rVe(prof, h);
      const yy = y0 - h;
      const dd = `M${f(x - r * 0.99)} ${f(yy)} Q${f(x)} ${f(yy + r * k * 1.85)} ${f(x + r * 0.99)} ${f(yy)}`;
      vnitrni.push(`<path d="${dd}" stroke="${barvy.stin}" stroke-width="1.2" fill="none" opacity="${f(0.24 * ryhy)}"/>`);
      vnitrni.push(`<path d="${dd}" stroke="${barvy.svetlo}" stroke-width="0.9" fill="none" opacity="${f(0.26 * ryhy)}" transform="translate(0 1.4)"/>`);
    }
  }
  /* Tma u země */
  vnitrni.push(`<rect x="${f(x - ob.R - 4)}" y="${f(y0 - H * 0.5)}" width="${f(ob.R * 2 + 8)}" height="${f(H * 0.5 + R0 * k + 4)}" fill="url(#${id}-ao)"/>`);
  /* Lesk — světlo z okna v úzkém pruhu vlevo */
  if (lesk > 0) {
    const doH = o.leskDo ?? H * 0.92;
    const bL: Bod[] = [];
    const bP: Bod[] = [];
    const n = 16;
    for (let i = 1; i < n; i++) {
      const h = mix(H * 0.08, doH, i / n);
      const r = rVe(prof, h);
      bL.push([x - r * 0.58, y0 - h]);
      if (i > 2 && i < n - 3) bP.push([x + r * 0.78, y0 - h]);
    }
    const sir = Math.max(1.4, ob.R * 0.075);
    vnitrni.push(`<path d="${bodyD(bL)}" stroke="#FFFFFF" stroke-width="${f(sir * 3.2)}" fill="none" stroke-linecap="round" opacity="${f(lesk * 0.12)}"/>`);
    vnitrni.push(`<path d="${bodyD(bL.slice(1, -1))}" stroke="#FFFFFF" stroke-width="${f(sir)}" fill="none" stroke-linecap="round" opacity="${f(lesk * 0.62)}"/>`);
    if (bP.length > 2) vnitrni.push(`<path d="${bodyD(bP)}" stroke="#FFFFFF" stroke-width="${f(sir * 0.7)}" fill="none" stroke-linecap="round" opacity="${f(lesk * 0.2)}"/>`);
  }
  /* Hrana do stínu — tělo se stáčí od světla */
  vnitrni.push(`<path d="${ob.d}" stroke="${barvy.stin}" stroke-width="5" fill="none" opacity="0.22"/>`);
  return { defs: defs.join(""), pod, vnitrni, ob, clip: `${id}-c` };
}

/* ════════ Kruh ════════ */

/** Rozměry snímku z kruhu (viewBox) */
export const KRUH_W = 300;
export const KRUH_H = 340;

const CX = 150;
/** Střed horní plochy hlavy kruhu — tady stojí hlína */
const HY = 250;
const RH = 78;
const TH = 12;
const HRID = 12;
/** Vanička: okraj, dno uvnitř, spodek zvenku (spodek už je pod panelem) */
const VR = 126;
const VY = HY + 31;
const VO = 7;
const VDY = HY + 60;
const VDR = 108;
const VSY = HY + 84;
const VSR = 114;

/** Panel — teplá omítka, světlo z okna zleva shora */
function panel(q: string, defs: string[]) {
  defs.push(
    `<radialGradient id="${q}-pz" cx="0.12" cy="0.08" r="1.2">` +
      `<stop offset="0" stop-color="#FBF6EC"/>` +
      `<stop offset="0.45" stop-color="${P.zed}"/>` +
      `<stop offset="1" stop-color="${smichej(P.zedStin, P.zed, 0.3)}"/>` +
      `</radialGradient>`,
  );
  defs.push(`<clipPath id="${q}-pc"><rect x="4" y="4" width="292" height="332" rx="18"/></clipPath>`);
  defs.push(svisly(`${q}-pp`, P.zedTma, P.zedTma, 0, 0.38));
  let s = `<rect x="4" y="4" width="292" height="332" rx="18" fill="url(#${q}-pz)"/>`;
  /* Podlaha pod kruhem jen jako měkké ztmavnutí */
  s += `<g clip-path="url(#${q}-pc)"><rect x="4" y="236" width="292" height="104" fill="url(#${q}-pp)"/></g>`;
  /* Jemná hrana panelu */
  s += `<rect x="4.5" y="4.5" width="291" height="331" rx="17.5" fill="none" stroke="${P.inkoust}" stroke-width="1" opacity="0.07"/>`;
  return s;
}

/** Kruh: vanička, hřídel, hlava. `mokro` = šlikr na hlavě a na dně */
function kruh(q: string, defs: string[], mokro: boolean) {
  const s: string[] = [];
  /* Vanička zvenku — dole oříznutá panelem, záběr zblízka */
  defs.push(
    `<linearGradient id="${q}-vz" x1="0" y1="0" x2="1" y2="0">` +
      `<stop offset="0" stop-color="#C4C0B6"/><stop offset="0.1" stop-color="#E9E6DF"/><stop offset="0.3" stop-color="#FFFFFF"/>` +
      `<stop offset="0.55" stop-color="#F2F0EA"/><stop offset="0.86" stop-color="#D3CFC6"/><stop offset="1" stop-color="#B5B0A6"/>` +
      `</linearGradient>`,
  );
  defs.push(svisly(`${q}-vzao`, "#6E675C", "#6E675C", 0, 0.3));
  const zvenku =
    `M${CX - VR} ${VY} C${CX - VR} ${VY + 22} ${CX - VSR - 2} ${VSY - 8} ${CX - VSR} ${VSY}` +
    ` A${VSR} ${f(VSR * K)} 0 0 0 ${CX + VSR} ${VSY}` +
    ` C${CX + VSR + 2} ${VSY - 8} ${CX + VR} ${VY + 22} ${CX + VR} ${VY}` +
    ` A${VR} ${f(VR * K)} 0 0 1 ${CX - VR} ${VY}Z`;
  s.push(`<g clip-path="url(#${q}-pc)"><path d="${zvenku}" fill="url(#${q}-vz)"/><path d="${zvenku}" fill="url(#${q}-vzao)"/></g>`);
  /* Zaoblený lem okraje vpředu */
  s.push(`<path d="M${CX - VR} ${VY} A${VR} ${f(VR * K)} 0 0 0 ${CX + VR} ${VY}" stroke="#FFFFFF" stroke-width="5" fill="none" opacity="0.9"/>`);
  s.push(`<path d="M${CX - VR + 2} ${VY + 4} A${VR - 1} ${f((VR - 1) * K)} 0 0 0 ${CX + VR - 2} ${VY + 4}" stroke="#8F887C" stroke-width="1.2" fill="none" opacity="0.35"/>`);

  /* Horní plocha okraje */
  s.push(el(CX, VY, VR, VR * K, `fill="#F7F5F0"`));
  /* Uvnitř: zadní stěna (vlevo ve stínu, vpravo proti oknu) a dno */
  const ri = VR - VO;
  defs.push(`<clipPath id="${q}-vo"><ellipse cx="${CX}" cy="${VY + 1}" rx="${ri}" ry="${f(ri * K)}"/></clipPath>`);
  defs.push(
    `<linearGradient id="${q}-vs" x1="0" y1="0" x2="1" y2="0">` +
      `<stop offset="0" stop-color="#B8B3A9"/><stop offset="0.45" stop-color="#DAD6CE"/><stop offset="1" stop-color="#F3F1EC"/>` +
      `</linearGradient>`,
  );
  defs.push(
    `<radialGradient id="${q}-vd" cx="0.42" cy="0.35" r="0.7">` +
      `<stop offset="0" stop-color="#E4E1DA"/><stop offset="1" stop-color="#C3BEB4"/>` +
      `</radialGradient>`,
  );
  s.push(`<g clip-path="url(#${q}-vo)">`);
  s.push(el(CX, VY + 1, ri, ri * K, `fill="url(#${q}-vs)"`));
  s.push(el(CX, VDY, VDR, VDR * K, `fill="url(#${q}-vd)"`));
  /* Stín hlavy na dně */
  defs.push(mekkyStin(`${q}-hs`, "#2B2420", 0.34));
  s.push(el(CX + 10, VDY - 3, 90, 21, `fill="url(#${q}-hs)"`));
  if (mokro) {
    /* Šlikr na dně kolem hřídele */
    s.push(el(CX + 6, VDY + 1, 60, 11.5, `fill="${HLINA.mokry.stred}" opacity="0.5"`));
    s.push(el(CX + 4, VDY - 1, 46, 7.5, `fill="${HLINA.mokry.svetlo}" opacity="0.35"`));
    s.push(`<path d="M${CX - 42} ${VDY - 2} Q${CX - 21} ${VDY - 7} ${CX + 2} ${VDY - 6}" stroke="#FFFFFF" stroke-width="1.6" fill="none" stroke-linecap="round" opacity="0.5"/>`);
  }
  /* Hřídel */
  defs.push(
    `<linearGradient id="${q}-hr" x1="0" y1="0" x2="1" y2="0">` +
      `<stop offset="0" stop-color="#4E555A"/><stop offset="0.3" stop-color="#B9C0C5"/><stop offset="0.55" stop-color="#858C92"/><stop offset="1" stop-color="#40464B"/>` +
      `</linearGradient>`,
  );
  s.push(`<rect x="${CX - HRID}" y="${HY + TH - 4}" width="${HRID * 2}" height="${VDY - HY - TH + 4}" fill="url(#${q}-hr)"/>`);
  s.push(el(CX, VDY, HRID + 5, (HRID + 5) * K, `fill="#8F887C" opacity="0.45"`));
  s.push(el(CX, VDY, HRID, HRID * K, `fill="url(#${q}-hr)"`));
  s.push(`<rect x="${CX - HRID}" y="${HY + TH - 4}" width="${HRID * 2}" height="12" fill="#1E1A17" opacity="0.28"/>`);
  s.push(`</g>`);
  /* Vnitřní hrana okraje — vzadu chytá světlo */
  s.push(`<path d="M${CX - ri} ${VY + 1} A${ri} ${f(ri * K)} 0 0 1 ${CX + ri} ${VY + 1}" stroke="#FFFFFF" stroke-width="1.4" fill="none" opacity="0.8"/>`);

  /* Hlava kruhu — bok */
  defs.push(
    `<linearGradient id="${q}-hb" x1="0" y1="0" x2="1" y2="0">` +
      `<stop offset="0" stop-color="#626A70"/><stop offset="0.14" stop-color="#9CA3A9"/><stop offset="0.32" stop-color="#EEF1F2"/>` +
      `<stop offset="0.46" stop-color="#BCC3C8"/><stop offset="0.75" stop-color="#868D93"/><stop offset="1" stop-color="#565D63"/>` +
      `</linearGradient>`,
  );
  const bok = `M${CX - RH} ${HY} A${RH} ${f(RH * K)} 0 0 0 ${CX + RH} ${HY} L${CX + RH} ${HY + TH} A${RH} ${f(RH * K)} 0 0 1 ${CX - RH} ${HY + TH}Z`;
  s.push(`<path d="${bok}" fill="url(#${q}-hb)"/>`);
  s.push(`<path d="M${CX - RH + 1} ${HY + TH - 0.8} A${RH - 1} ${f((RH - 1) * K)} 0 0 0 ${CX + RH - 1} ${HY + TH - 0.8}" stroke="#2E3236" stroke-width="1.2" fill="none" opacity="0.35"/>`);
  /* Horní plocha — soustružená, kroužky pro vystředění */
  defs.push(
    `<radialGradient id="${q}-hp" cx="0.34" cy="0.28" r="0.85">` +
      `<stop offset="0" stop-color="#F4F6F7"/><stop offset="0.55" stop-color="#CDD2D6"/><stop offset="1" stop-color="#9DA4AA"/>` +
      `</radialGradient>`,
  );
  defs.push(`<clipPath id="${q}-hc"><ellipse cx="${CX}" cy="${HY}" rx="${RH}" ry="${f(RH * K)}"/></clipPath>`);
  s.push(el(CX, HY, RH, RH * K, `fill="url(#${q}-hp)"`));
  for (const t of [0.3, 0.52, 0.74, 0.9]) {
    s.push(el(CX, HY, RH * t, RH * t * K, `fill="none" stroke="#6F777D" stroke-width="0.8" opacity="0.28"`));
    s.push(el(CX, HY + 0.8, RH * t, RH * t * K, `fill="none" stroke="#FFFFFF" stroke-width="0.7" opacity="0.4"`));
  }
  /* Mokrá hlava — tenký film šlikru */
  if (mokro) s.push(el(CX + 4, HY + 1, RH * 0.96, RH * 0.96 * K, `fill="${HLINA.mokry.stred}" opacity="0.16"`));
  /* Odlesk okna na hlavě */
  defs.push(`<radialGradient id="${q}-ho"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.85"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient>`);
  s.push(el(CX - 32, HY - 8.5, 32, 4.8, `fill="url(#${q}-ho)"`));
  /* Přední hrana hlavy — ostrá, chytá světlo */
  s.push(`<path d="M${CX - RH} ${HY} A${RH} ${f(RH * K)} 0 0 0 ${CX + RH} ${HY}" stroke="#FFFFFF" stroke-width="1.3" fill="none" opacity="0.75"/>`);
  return s.join("");
}

/** Zahnutá šipka otáčení kolem levé hrany hlavy — kruh se točí proti směru hodin (při pohledu shora) */
function otaceni() {
  const b = oblouk(CX, HY + 6, 93, 93 * K, 189, 121, 10);
  return sipka(b, { sirka: 2.4, hrot: 8.5, barva: "#8C857B", halo: 0.75, trida: "dtv-otaceni" });
}

/** Šlikr kolem paty hlíny na hlavě */
const slikr = (r: number) =>
  el(CX + 2, HY + 1.5, r + 9, (r + 9) * K, `fill="${HLINA.mokry.stin}" opacity="0.22"`) +
  el(CX + 1, HY + 1, r + 5, (r + 5) * K, `fill="${HLINA.mokry.svetlo}" opacity="0.3"`);

/** Měkký stín kusu na hlavě — jen po hraně hlavy, ne do vzduchu */
function stinNaHlave(q: string, defs: string[], r0: number) {
  defs.push(mekkyStin(`${q}-ss`, "#2B2420", 0.3));
  const sr = r0 * 1.5 + 6;
  return `<g clip-path="url(#${q}-hc)">${el(CX + sr * 0.2, HY - r0 * K * 0.1, sr, sr * 0.22 + 2, `fill="url(#${q}-ss)"`)}</g>`;
}

/* ——— Jednotlivé kroky ——— */

/** 0 Centrování: kužel vytažený nahoru */
function krokCentrovani(q: string, defs: string[]) {
  const prof: Bod[] = [
    [50, 0], [46.5, 5], [42.5, 16], [38.5, 32], [34.5, 51], [30.3, 71], [25.8, 91], [20.5, 108], [14.8, 121], [9, 129.5], [4, 134], [0, 136],
  ];
  const t = telo({ id: `${q}-h`, x: CX, y0: HY, prof, barvy: HLINA.mokry, lesk: 0.8, leskDo: 120 });
  defs.push(t.defs);
  /* Spirála po stáčení do kužele — šikmé rýhy */
  const spir: string[] = [];
  for (let j = 0; j < 5; j++) {
    const h0 = 12 + j * 23;
    const pts: Bod[] = [];
    for (let i = 0; i <= 10; i++) {
      const h = h0 + (i / 10) * 22;
      const r = rVe(prof, h);
      pts.push(naElipse(CX, HY - h, r, r * K, 180 - i * 18));
    }
    spir.push(`<path d="${bodyD(pts)}" stroke="${HLINA.mokry.stin}" stroke-width="1.4" fill="none" opacity="0.32"/>`);
    spir.push(`<path d="${bodyD(pts)}" stroke="${HLINA.mokry.svetlo}" stroke-width="1" fill="none" opacity="0.34" transform="translate(0 1.7)"/>`);
  }
  let s = stinNaHlave(q, defs, 50) + slikr(50) + t.pod + `<g clip-path="url(#${t.clip})">${spir.join("")}${t.vnitrni.join("")}</g>`;
  /* Osa — hlína běží přesně na středu */
  s += `<path d="M${CX} ${HY + 44} V52" stroke="${P.inkoust2}" stroke-width="2" stroke-dasharray="0.1 6" stroke-linecap="round" opacity="0.55"/>`;
  /* Šipky: z obou stran dovnitř, a nahoru */
  const hS = 54;
  const rS = rVe(prof, hS);
  s += sipka([[CX - rS - 48, HY - hS + 7], [CX - rS - 27, HY - hS + 2.5], [CX - rS - 7, HY - hS]]);
  s += sipka([[CX + rS + 48, HY - hS + 7], [CX + rS + 27, HY - hS + 2.5], [CX + rS + 7, HY - hS]]);
  s += sipka([[CX, HY - 146], [CX, HY - 186]]);
  return s;
}

/** 1 Otevření: nízký bochník, palce otvírají dno */
function krokOtevreni(q: string, defs: string[]) {
  const prof: Bod[] = [
    [60, 0], [61.5, 5], [61, 12.5], [58.5, 22], [53, 31.5], [44.5, 38.5], [34.5, 42.5], [26.5, 44], [22.5, 44],
  ];
  const t = telo({ id: `${q}-h`, x: CX, y0: HY, prof, barvy: HLINA.mokry, lesk: 0.8, leskDo: 27 });
  defs.push(t.defs);
  const h = HLINA.mokry;
  /* Horní plocha je natočená ke světlu — světlejší */
  defs.push(`<radialGradient id="${q}-hv" cx="0.36" cy="0.2" r="0.75"><stop offset="0" stop-color="${h.svetlo}" stop-opacity="0.85"/><stop offset="0.6" stop-color="${h.svetlo}" stop-opacity="0.25"/><stop offset="1" stop-color="${h.svetlo}" stop-opacity="0"/></radialGradient>`);
  const vrch = el(CX, HY - 37, 55, 15.5, `fill="url(#${q}-hv)"`);
  /* Jamka — tmavý vnitřek, vpravo vzadu chytá světlo */
  defs.push(
    `<radialGradient id="${q}-j" cx="0.66" cy="0.2" r="0.85">` +
      `<stop offset="0" stop-color="${h.stred}"/><stop offset="0.5" stop-color="${smichej(h.stin, "#1E140E", 0.3)}"/><stop offset="1" stop-color="#1E140E"/>` +
      `</radialGradient>`,
  );
  const jy = HY - 44;
  const jamka =
    el(CX, jy + 0.6, 25.5, 25.5 * K + 1.2, `fill="${h.svetlo}" opacity="0.55"`) +
    el(CX + 0.5, jy + 0.8, 22, 22 * K, `fill="url(#${q}-j)"`) +
    `<path d="M${CX - 22.5} ${jy + 1} A22.5 ${f(22.5 * K)} 0 0 0 ${CX + 22.5} ${jy + 1}" stroke="#FFFFFF" stroke-width="1.4" fill="none" opacity="0.55"/>`;
  let s = stinNaHlave(q, defs, 60) + slikr(61) + t.pod + `<g clip-path="url(#${t.clip})">${vrch}${t.vnitrni.join("")}</g>` + jamka;
  /* Lesk na rameni vlevo */
  s += `<path d="M${CX - 53} ${HY - 27} Q${CX - 41} ${HY - 40} ${CX - 20} ${HY - 43}" stroke="#FFFFFF" stroke-width="2.4" fill="none" stroke-linecap="round" opacity="0.55"/>`;
  /* Šipka: dolů do středu, u dna do strany */
  s += sipka([[CX, HY - 112], [CX, HY - 64], [CX, HY - 28], [CX + 5, HY - 15], [CX + 18, HY - 10], [CX + 42, HY - 10]]);
  return s;
}

/** Hrnek na kruhu — tentýž kus jako na celé stránce */
const VYSKA_HRNKU = 122;
const hrnekNaKruhu = (id: string, vyska: number) =>
  nadoba({ id, tvar: "hrnek", stav: "mokry", x: CX, y: HY + OBRYSY.hrnek(0) * vyska * K, vyska, ucho: false, stin: false });

/** 2 Vytažení: vysoký válec, prsty zevnitř i zvenku táhnou stěnu nahoru */
function krokVytazeni(q: string, defs: string[]) {
  const H = 134;
  const r = OBRYSY.valec;
  let s = stinNaHlave(q, defs, r(0) * H) + slikr(r(0) * H);
  s += nadoba({ id: `${q}-n`, tvar: "valec", stav: "mokry", x: CX, y: HY + r(0) * H * K, vyska: H, ucho: false, stin: false });
  const vne: Bod[] = [0.14, 0.45, 0.8, 1.1].map((t) => [CX + r(Math.min(t, 1)) * H + 11, HY - t * H]);
  const uvnitr: Bod[] = [0.2, 0.5, 0.8, 1.12].map((t) => [CX + r(Math.min(t, 1)) * H - 13, HY - t * H]);
  s += sipka(uvnitr);
  s += sipka(vne);
  return s;
}

/** 3 Tvarování: bříško zevnitř ven, zvenku dřevěné žebro */
function krokTvarovani(q: string, defs: string[]) {
  const H = VYSKA_HRNKU;
  const r = OBRYSY.hrnek;
  let s = stinNaHlave(q, defs, r(0) * H) + slikr(r(0) * H) + hrnekNaKruhu(`${q}-n`, H);
  /* Žebro: plochá dřevěná destička, pracovní hrana kopíruje bok */
  const hrana: Bod[] = [];
  for (let i = 0; i <= 8; i++) {
    const t = mix(0.12, 0.84, i / 8);
    hrana.push([CX + r(t) * H + 0.8, HY - t * H]);
  }
  const [hx0, hy0] = hrana[0];
  const [hx1, hy1] = hrana[hrana.length - 1];
  const w = 30;
  const zebro =
    `M${f(hx1)} ${f(hy1)}` +
    hladce([...hrana].reverse()) +
    ` C${f(hx0 + 3)} ${f(hy0 + 8)} ${f(hx0 + w - 6)} ${f(hy0 + 8)} ${f(hx0 + w)} ${f(hy0 - 2)}` +
    ` C${f(hx0 + w + 4)} ${f(hy0 - 28)} ${f(hx1 + w + 4)} ${f(hy1 + 28)} ${f(hx1 + w)} ${f(hy1 + 2)}` +
    ` C${f(hx1 + w - 6)} ${f(hy1 - 8)} ${f(hx1 + 3)} ${f(hy1 - 8)} ${f(hx1)} ${f(hy1)}Z`;
  defs.push(
    `<linearGradient id="${q}-z" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0" stop-color="${P.preklizkaSvetlo}"/><stop offset="0.6" stop-color="${P.preklizka}"/><stop offset="1" stop-color="${P.drevoSvetlo}"/>` +
      `</linearGradient>`,
  );
  defs.push(`<clipPath id="${q}-zc"><path d="${zebro}"/></clipPath>`);
  /* Tloušťka destičky — hrana vykukuje vpravo dole */
  s += `<path d="${zebro}" fill="${P.drevo}" transform="translate(2.4 2.4)"/>`;
  s += `<path d="${zebro}" fill="url(#${q}-z)"/>`;
  let let_ = "";
  for (let i = 0; i < 3; i++) {
    const dx = 9 + i * 7;
    let_ += `<path d="M${f(hx1 + dx)} ${f(hy1 - 4)} C${f(hx1 + dx + 5)} ${f(hy1 + 30)} ${f(hx0 + dx + 3)} ${f(hy0 - 30)} ${f(hx0 + dx - 1)} ${f(hy0 + 4)}" stroke="${P.preklizkaStin}" stroke-width="0.9" fill="none" opacity="0.45"/>`;
  }
  s += `<g clip-path="url(#${q}-zc)">${let_}<path d="${zebro}" stroke="${P.drevoStin}" stroke-width="2.4" fill="none" opacity="0.3" transform="translate(1.2 1.2)"/><path d="${zebro}" stroke="#FFFFFF" stroke-width="1.8" fill="none" opacity="0.55" transform="translate(-0.9 -0.9)"/></g>`;
  /* Dírka na pověšení */
  const ox = hx1 + w * 0.55;
  const oy = hy1 + 12;
  s += el(ox, oy, 3.4, 3.4, `fill="${P.drevoStin}"`);
  s += `<path d="M${f(ox - 3)} ${f(oy + 1)} A3.4 3.4 0 0 0 ${f(ox + 3)} ${f(oy + 1)}" stroke="${P.preklizkaSvetlo}" stroke-width="1" fill="none" opacity="0.8"/>`;
  /* Šipka zevnitř ven */
  const tt = 0.5;
  s += sipka([[CX - 14, HY - tt * H], [CX + r(tt) * H - 9, HY - tt * H]]);
  return s;
}

/** 4 Odříznutí: drát s kolíčky pod patou */
function krokOdriznuti(q: string, defs: string[]) {
  const H = VYSKA_HRNKU;
  const r = OBRYSY.hrnek;
  /* Drát leží na hlavě, kousek za středem, a jde pod patou */
  const dy = HY - 5;
  const kx = 122;
  let s = stinNaHlave(q, defs, r(0) * H) + slikr(r(0) * H);
  s += `<path d="M${CX - kx} ${dy} L${CX + kx} ${dy}" stroke="#3A3F43" stroke-width="1.4" fill="none"/>`;
  s += `<path d="M${CX - kx} ${dy - 0.8} L${CX + kx} ${dy - 0.8}" stroke="#FFFFFF" stroke-width="0.5" fill="none" opacity="0.6"/>`;
  s += hrnekNaKruhu(`${q}-n`, H);
  /* Kolíčky */
  defs.push(
    `<linearGradient id="${q}-k" x1="0" y1="0" x2="1" y2="0">` +
      `<stop offset="0" stop-color="${P.drevoStin}"/><stop offset="0.35" stop-color="${P.preklizkaSvetlo}"/><stop offset="1" stop-color="${P.drevo}"/>` +
      `</linearGradient>`,
  );
  for (const sm of [-1, 1]) {
    const x = CX + sm * (kx + 4.5);
    s += `<rect x="${f(x - 4.5)}" y="${f(dy - 15)}" width="9" height="30" rx="4.5" fill="url(#${q}-k)"/>`;
    s += el(x, dy, 5, 2.2, `fill="#3A3F43" opacity="0.6"`);
  }
  /* Šipky: drát napnutý ven */
  s += sipka([[CX - 86, dy - 18], [CX - 112, dy - 18]], { sirka: 4.6 });
  s += sipka([[CX + 86, dy - 18], [CX + 112, dy - 18]], { sirka: 4.6 });
  return s;
}

/** Obráběcí očko: kovová smyčka na dřevěné rukojeti, hranou smyčky v bodě (x, y) */
function ocko(q: string, defs: string[], x: number, y: number, uhel: number) {
  defs.push(
    `<linearGradient id="${q}-or" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="${P.preklizkaSvetlo}"/><stop offset="0.45" stop-color="${P.drevoSvetlo}"/><stop offset="1" stop-color="${P.drevoStin}"/>` +
      `</linearGradient>`,
  );
  defs.push(
    `<linearGradient id="${q}-ok" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="${P.ocelSvetlo}"/><stop offset="0.5" stop-color="${P.ocel}"/><stop offset="1" stop-color="${P.ocelStin}"/>` +
      `</linearGradient>`,
  );
  const smycka = "M23 -3.6 C15 -11.5 2 -10.5 -0.5 -2.5 C-2 4.5 10 10.5 23 3.6";
  let s = `<g transform="translate(${f(x)} ${f(y)}) rotate(${uhel})">`;
  s += `<path d="${smycka}" stroke="${P.ocelStin}" stroke-width="3.2" fill="none" stroke-linecap="round"/>`;
  s += `<path d="${smycka}" stroke="${P.ocelSvetlo}" stroke-width="1.2" fill="none" stroke-linecap="round" transform="translate(-0.4 -0.7)"/>`;
  s += `<rect x="21" y="-4.6" width="10" height="9.2" rx="1.4" fill="url(#${q}-ok)"/>`;
  s += `<rect x="30" y="-5.8" width="80" height="11.6" rx="5.8" fill="url(#${q}-or)"/>`;
  s += `<path d="M36 -3.3 H102" stroke="#FFFFFF" stroke-width="1.4" stroke-linecap="round" opacity="0.45"/>`;
  s += `</g>`;
  return s;
}

/** Stužka hlíny z očka — kroutí se jako vývrtka, vpředu světlá, vzadu rub */
function vyvrtka(x0: number, y0: number, c: Trojice): string {
  const ax = -0.34;
  const ay = -0.94;
  const px = -ay;
  const py = ax;
  const L = 58;
  const otacky = 2.6;
  const N = 90;
  const useky: { b: Bod[]; vpredu: boolean }[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const fi = 2 * Math.PI * otacky * t + 0.6;
    const rho = 7.5 * Math.min(1, 0.2 + t * 5) * (1 - 0.3 * t);
    const b: Bod = [
      x0 + ax * L * t + rho * (px * Math.cos(fi) + ax * 0.45 * Math.sin(fi)),
      y0 + ay * L * t + rho * (py * Math.cos(fi) + ay * 0.45 * Math.sin(fi)),
    ];
    const vpredu = Math.sin(fi) >= 0;
    const u = useky[useky.length - 1];
    if (u && u.vpredu === vpredu) u.b.push(b);
    else useky.push({ b: u ? [u.b[u.b.length - 1], b] : [b], vpredu });
  }
  let zadni = "";
  let predni = "";
  for (const u of useky) {
    if (u.b.length < 2) continue;
    const d = bodyD(u.b);
    if (u.vpredu) {
      predni += `<path d="${d}" stroke="${c.stred}" stroke-width="6.2" fill="none" stroke-linecap="round"/>`;
      predni += `<path d="${d}" stroke="${c.svetlo}" stroke-width="4.2" fill="none" stroke-linecap="round" transform="translate(-0.3 -0.4)"/>`;
      predni += `<path d="${d}" stroke="#FFFFFF" stroke-width="1" fill="none" stroke-linecap="round" opacity="0.4" transform="translate(-1 -1.1)"/>`;
    } else {
      zadni += `<path d="${d}" stroke="${c.stin}" stroke-width="4.2" fill="none" stroke-linecap="round"/>`;
    }
  }
  return `<g class="dtv-stuzka">${zadni}${predni}</g>`;
}

/** Odřezek — stočený proužek hlíny, co spadl na hlavu */
function odrezek(x: number, y: number, s: number, c: Trojice) {
  const d = `M${f(x - 5 * s)} ${f(y + 0.8 * s)} C${f(x - 4 * s)} ${f(y - 3.6 * s)} ${f(x + 3 * s)} ${f(y - 3.8 * s)} ${f(x + 4.6 * s)} ${f(y - 0.6 * s)} C${f(x + 5.4 * s)} ${f(y + 1.4 * s)} ${f(x + 3 * s)} ${f(y + 2 * s)} ${f(x + 1.6 * s)} ${f(y + 0.6 * s)}`;
  return `<path d="${d}" stroke="${c.stin}" stroke-width="${f(2.8 * s)}" fill="none" stroke-linecap="round" opacity="0.85"/><path d="${d}" stroke="${c.svetlo}" stroke-width="${f(1.4 * s)}" fill="none" stroke-linecap="round" transform="translate(-0.3 -0.6)"/>`;
}

/** 5 Obrábění: kožený kus dnem vzhůru, očko odebírá stužku */
function krokObrabeni(q: string, defs: string[]) {
  const H = VYSKA_HRNKU * SMRST.kozeny;
  const r = OBRYSY.hrnek;
  const kz = HLINA.kozeny;
  /* Profil dnem vzhůru: okraj dole na hlavě, patka nahoře */
  const prof: Bod[] = [];
  for (let i = 0; i <= 24; i++) prof.push([r(1 - i / 24) * H, (i / 24) * H]);
  /* Tři hroudičky měkké hlíny — dvě vykukují zpoza kusu, jedna vpředu */
  const R = r(1) * H + 5;
  defs.push(`<radialGradient id="${q}-u" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stop-color="${HLINA.mokry.svetlo}"/><stop offset="0.6" stop-color="${HLINA.mokry.stred}"/><stop offset="1" stop-color="${HLINA.mokry.stin}"/></radialGradient>`);
  const hroudicka = (st: number) => {
    const [x, y] = naElipse(CX, HY, R, R * K, st);
    return (
      `<path d="M${f(x - 10.5)} ${f(y + 2.2)} C${f(x - 11.5)} ${f(y - 5)} ${f(x - 4.5)} ${f(y - 10)} ${f(x + 0.5)} ${f(y - 9.5)} C${f(x + 7)} ${f(y - 9)} ${f(x + 12.5)} ${f(y - 3.5)} ${f(x + 10.5)} ${f(y + 2.2)} Q${f(x)} ${f(y + 6)} ${f(x - 10.5)} ${f(y + 2.2)}Z" fill="url(#${q}-u)"/>` +
      el(x - 1.5, y - 5.5, 5.5, 2.2, `fill="${HLINA.mokry.svetlo}" opacity="0.5"`)
    );
  };
  let s = stinNaHlave(q, defs, R - 5) + hroudicka(210) + hroudicka(-30);
  const t = telo({ id: `${q}-h`, x: CX, y0: HY, prof, barvy: kz, lesk: 0.2, ryhy: 0.6, ryhyH: [0.18, 0.32, 0.46, 0.6, 0.74].map((v) => v * H), leskDo: H * 0.8 });
  defs.push(t.defs);
  s += t.pod + `<g clip-path="url(#${t.clip})">${t.vnitrni.join("")}</g>`;
  /* Dno nahoře: obrobená patka — prstenec a mělké vybrání uprostřed */
  const rd = r(0) * H;
  const yd = HY - H;
  s += el(CX, yd, rd, rd * K, `fill="${kz.svetlo}"`);
  s += el(CX, yd + 0.4, rd * 0.86, rd * 0.86 * K, `fill="none" stroke="${kz.stin}" stroke-width="0.8" opacity="0.3"`);
  s += el(CX + 0.4, yd + 0.9, rd * 0.7, rd * 0.7 * K, `fill="${kz.stred}"`);
  s += el(CX + 0.9, yd + 2, rd * 0.64, rd * 0.64 * K - 0.6, `fill="${smichej(kz.stred, kz.svetlo, 0.5)}"`);
  s += `<path d="M${f(CX - rd)} ${f(yd)} A${f(rd)} ${f(rd * K)} 0 0 0 ${f(CX + rd)} ${f(yd)}" stroke="#FFFFFF" stroke-width="1.1" fill="none" opacity="0.55"/>`;
  s += hroudicka(90);
  /* Odřezky na hlavě */
  s += odrezek(CX + 56, HY + 6, 1.1, kz) + odrezek(CX - 58, HY + 4, 0.9, kz);
  /* Očko na hraně patky vpravo, stužka se kroutí pryč */
  const tx = CX + rd + 1.5;
  const ty = yd + 3.5;
  s += ocko(q, defs, tx, ty, -35);
  s += vyvrtka(tx - 1, ty - 2, kz);
  return s;
}

/**
 * Jeden snímek z točení na kruhu (viewBox 300 × 340). Šest snímků jde na
 * stránce vedle sebe a čte se jako sekvence — kruh je ve všech stejný
 * a na stejném místě. V kresbě není žádný text, popisky dává stránka.
 */
export function kruhKrok(i: KrokKruhu, p = "dtv"): string {
  const q = `${p}-k${i}`;
  const defs: string[] = [];
  let s = panel(q, defs);
  s += kruh(q, defs, i !== 5);
  s += otaceni();
  if (i === 0) s += krokCentrovani(q, defs);
  else if (i === 1) s += krokOtevreni(q, defs);
  else if (i === 2) s += krokVytazeni(q, defs);
  else if (i === 3) s += krokTvarovani(q, defs);
  else if (i === 4) s += krokOdriznuti(q, defs);
  else s += krokObrabeni(q, defs);
  return `<svg viewBox="0 0 ${KRUH_W} ${KRUH_H}" aria-hidden="true"><defs>${defs.join("")}</defs>${s}</svg>`;
}

/* ════════ Modelování v ruce ════════ */

/** Rozměry vinětky (viewBox) */
export const RUCE_W = 420;
export const RUCE_H = 340;

/** Ve vinětkách se díváme víc shora, ať je vidět dovnitř */
const KV = 0.42;

/** Měkký důlek: stín na straně od okna, světlo na straně k oknu (přechody `-dd` a `-dl`) */
const dulek = (q: string, x: number, y: number, w: number, v: number, sila = 1) =>
  el(x - w * 0.12, y - v * 0.16, w * 0.62, v * 0.62, `fill="url(#${q}-dd)" opacity="${f(sila)}"`) +
  el(x + w * 0.14, y + v * 0.2, w * 0.46, v * 0.46, `fill="url(#${q}-dl)" opacity="${f(sila)}"`);

/** Mačkaná miska a vedle koule s první jamkou od palce */
function mackana(q: string, defs: string[]) {
  const h = HLINA.mokry;
  const cosE = Math.sqrt(1 - KV * KV);
  let s = "";
  defs.push(mekkyStin(`${q}-s`, "#2B2420", 0.34));
  defs.push(`<radialGradient id="${q}-l"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.8"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient>`);
  defs.push(`<radialGradient id="${q}-dd"><stop offset="0" stop-color="#1E140E" stop-opacity="0.3"/><stop offset="0.6" stop-color="#1E140E" stop-opacity="0.12"/><stop offset="1" stop-color="#1E140E" stop-opacity="0"/></radialGradient>`);
  defs.push(`<radialGradient id="${q}-dl"><stop offset="0" stop-color="${h.svetlo}" stop-opacity="0.6"/><stop offset="1" stop-color="${h.svetlo}" stop-opacity="0"/></radialGradient>`);

  /* ——— Koule s první jamkou: měkká hlína, na stole trochu sedí ——— */
  const bx = 100;
  const by = 156;
  const R = 55;
  const rx = R * 1.03;
  const ry = R * 0.97;
  s += el(bx + 20, by + ry * cosE + 4, R * 1.25, R * 0.3, `fill="url(#${q}-s)"`);
  const koule =
    `M${f(bx - rx)} ${f(by)} A${f(rx)} ${f(ry)} 0 0 1 ${f(bx + rx)} ${f(by)}` +
    ` C${f(bx + rx)} ${f(by + ry * 0.62)} ${f(bx + rx * 0.62)} ${f(by + ry * 0.97)} ${f(bx)} ${f(by + ry * 0.97)}` +
    ` C${f(bx - rx * 0.62)} ${f(by + ry * 0.97)} ${f(bx - rx)} ${f(by + ry * 0.62)} ${f(bx - rx)} ${f(by)}Z`;
  defs.push(`<radialGradient id="${q}-k" cx="0.36" cy="0.3" r="0.8"><stop offset="0" stop-color="${h.svetlo}"/><stop offset="0.5" stop-color="${h.stred}"/><stop offset="1" stop-color="${h.stin}"/></radialGradient>`);
  defs.push(`<clipPath id="${q}-kc"><path d="${koule}"/></clipPath>`);
  s += `<path d="${koule}" fill="url(#${q}-k)"/>`;
  let vk = `<path d="${koule}" stroke="${h.stin}" stroke-width="7" fill="none" opacity="0.2"/>`;
  /* Odraz od stolu vpravo dole */
  vk += `<path d="M${f(bx + R * 0.1)} ${f(by + ry * 0.92)} Q${f(bx + R * 0.78)} ${f(by + ry * 0.8)} ${f(bx + R * 0.95)} ${f(by + ry * 0.2)}" stroke="${h.svetlo}" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.35"/>`;
  /* Lesk z okna */
  vk += `<ellipse cx="${f(bx - R * 0.44)}" cy="${f(by - R * 0.08)}" rx="${f(R * 0.16)}" ry="${f(R * 0.3)}" transform="rotate(22 ${f(bx - R * 0.44)} ${f(by - R * 0.08)})" fill="url(#${q}-l)"/>`;
  vk += `<ellipse cx="${f(bx - R * 0.47)}" cy="${f(by - R * 0.14)}" rx="${f(R * 0.05)}" ry="${f(R * 0.12)}" transform="rotate(22 ${f(bx - R * 0.47)} ${f(by - R * 0.14)})" fill="#FFFFFF" opacity="0.55"/>`;
  /* Jamka od palce — mělký důlek kolem, uprostřed tma */
  const jx = bx + 3;
  const jy = by - ry * 0.7;
  defs.push(
    `<radialGradient id="${q}-j" cx="0.66" cy="0.24" r="0.9">` +
      `<stop offset="0" stop-color="${h.stred}"/><stop offset="0.42" stop-color="${smichej(h.stin, "#1E140E", 0.35)}"/><stop offset="1" stop-color="#1A110C"/>` +
      `</radialGradient>`,
  );
  /* Důlek kolem jamky — mělký trychtýř: levý svah ve stínu, pravý proti oknu, okraje do ztracena */
  defs.push(`<radialGradient id="${q}-jm"><stop offset="0.4" stop-color="#FFFFFF"/><stop offset="1" stop-color="#000000"/></radialGradient>`);
  defs.push(`<mask id="${q}-jk" maskContentUnits="userSpaceOnUse">${el(jx, jy + 0.5, 28, 12.5, `fill="url(#${q}-jm)"`)}</mask>`);
  defs.push(
    `<linearGradient id="${q}-jg" x1="0" y1="0" x2="1" y2="0.3">` +
      `<stop offset="0" stop-color="${h.stin}" stop-opacity="0.8"/><stop offset="0.42" stop-color="${h.stin}" stop-opacity="0.25"/>` +
      `<stop offset="0.62" stop-color="${h.svetlo}" stop-opacity="0.25"/><stop offset="1" stop-color="${smichej(h.svetlo, "#FFFFFF", 0.2)}" stop-opacity="0.9"/>` +
      `</linearGradient>`,
  );
  vk += el(jx, jy + 0.5, 28, 12.5, `fill="url(#${q}-jg)" mask="url(#${q}-jk)"`);
  vk += el(jx + 1, jy + 0.6, 13.5, 6, `fill="url(#${q}-j)"`);
  vk += `<path d="${bodyD(oblouk(jx + 1, jy + 0.6, 13.5, 6, 100, 165, 6))}" stroke="#FFFFFF" stroke-width="1.2" fill="none" stroke-linecap="round" opacity="0.4"/>`;
  s += `<g clip-path="url(#${q}-kc)">${vk}</g>`;

  /* ——— Mačkaná miska ——— */
  const mx = 274;
  const my = 214;
  const prof: Bod[] = [[42, 0], [61, 7], [75, 18], [85, 33], [92, 49], [95.5, 64], [96.5, 76], [96, 86]];
  const rimR = (fi: number) => 96 + 2.4 * Math.sin(3 * fi) + 1.3 * Math.sin(5 * fi);
  const rimH = (fi: number) => 86 + 3.8 * Math.sin(2 * fi + 0.9) + 2.2 * Math.sin(5 * fi + 0.3);
  const tl = (fi: number) => 6 + 1.4 * Math.sin(4 * fi + 1);
  const okraj = (fi: number, dr = 0): Bod => [mx + (rimR(fi) - dr) * Math.cos(fi), my - rimH(fi) + (rimR(fi) - dr) * KV * Math.sin(fi)];
  const ob = obal(mx, my, prof, KV);
  s += el(mx + 22, my + 42 * KV + 8, 118, 26, `fill="url(#${q}-s)"`);
  /* Vnější stěna vpředu: zvlněný okraj, boky a dno */
  const predni: Bod[] = Array.from({ length: 25 }, (_, i) => okraj(Math.PI - (i / 24) * Math.PI));
  const bot = [...ob.bot].reverse();
  const stena = `M${f(predni[0][0])} ${f(predni[0][1])}${hladce(predni)} L${f(bot[0][0])} ${f(bot[0][1])}${hladce(bot)}Z`;
  defs.push(valcovy(`${q}-mt`, h, 0.3));
  defs.push(svisly(`${q}-mao`, "#1E140E", "#1E140E", 0, 0.26));
  defs.push(`<clipPath id="${q}-mc"><path d="${stena}"/></clipPath>`);
  s += `<path d="${stena}" fill="url(#${q}-mt)"/>`;
  let ven = `<rect x="${mx - 104}" y="${my - 46}" width="208" height="76" fill="url(#${q}-mao)"/>`;
  /* Lesk vlevo — mokrá hlína */
  const bL: Bod[] = [];
  for (let hh = 16; hh <= 62; hh += 6) bL.push([mx - rVe(prof, hh) * 0.62, my - hh + rVe(prof, hh) * KV * 0.55]);
  ven += `<path d="${bodyD(bL)}" stroke="#FFFFFF" stroke-width="12" fill="none" stroke-linecap="round" opacity="0.1"/>`;
  ven += `<path d="${bodyD(bL.slice(1, -1))}" stroke="#FFFFFF" stroke-width="2.6" fill="none" stroke-linecap="round" opacity="0.2"/>`;
  ven += `<path d="${stena}" stroke="${h.stin}" stroke-width="6" fill="none" opacity="0.2"/>`;
  s += `<g clip-path="url(#${q}-mc)">${ven}</g>`;
  /* Okraj — hřbet stěny vymačkaný do tenka, tloušťka se mění */
  const venek = Array.from({ length: 48 }, (_, i) => okraj((i / 48) * 2 * Math.PI));
  const vnitrek = Array.from({ length: 48 }, (_, i) => {
    const fi = (i / 48) * 2 * Math.PI;
    return okraj(fi, tl(fi));
  });
  s += `<path d="${uzavrena(venek)}" fill="${smichej(h.svetlo, h.stred, 0.3)}"/>`;
  /* Vnitřek: vlevo ve stínu okraje, vpravo stěna proti oknu */
  defs.push(
    `<radialGradient id="${q}-mv" cx="0.68" cy="0.3" r="0.85">` +
      `<stop offset="0" stop-color="${smichej(h.svetlo, h.stred, 0.35)}"/><stop offset="0.5" stop-color="${h.stred}"/><stop offset="1" stop-color="${smichej(h.stin, "#1E140E", 0.3)}"/>` +
      `</radialGradient>`,
  );
  const dVni = uzavrena(vnitrek);
  defs.push(`<clipPath id="${q}-mi"><path d="${dVni}"/></clipPath>`);
  s += `<path d="${dVni}" fill="url(#${q}-mv)"/>`;
  let uvnitr = el(mx + 10, my - 20, 52, 19, `fill="url(#${q}-l)" opacity="0.26"`);
  /* Důlky od palce: tři řady po stěně a dva na dně, měkce přes sebe */
  const rnd = nahoda(7);
  const rady: [number, number][] = [[24, 190], [44, 203], [64, 196]];
  for (const [hh, st0] of rady) {
    for (let st = st0; st < 352; st += 22 + rnd() * 9) {
      const fi = (st * Math.PI) / 180;
      const h2 = hh + (rnd() - 0.5) * 7;
      const rr = rVe(prof, h2) - 7;
      const x = mx + rr * Math.cos(fi);
      const y = my - h2 + rr * KV * Math.sin(fi);
      const w = 30 * (0.3 + 0.7 * Math.abs(Math.sin(fi))) * (0.8 + 0.4 * rnd());
      uvnitr += dulek(q, x, y, w, 18 * (0.8 + 0.4 * rnd()), 0.65 + 0.3 * rnd());
    }
  }
  uvnitr += dulek(q, mx - 12, my - 8, 30, 12, 0.8) + dulek(q, mx + 20, my - 13, 28, 11, 0.8);
  /* Mokrý lesk na stěně vpravo vzadu */
  const lp = (hh: number): Bod => {
    const fi = (335 * Math.PI) / 180;
    const rr = rVe(prof, hh) - 7;
    return [mx + rr * Math.cos(fi), my - hh + rr * KV * Math.sin(fi)];
  };
  const lesk = [lp(76), lp(60), lp(44)];
  uvnitr += `<path d="${bodyD(lesk)}" stroke="#FFFFFF" stroke-width="11" fill="none" stroke-linecap="round" opacity="0.09"/>`;
  uvnitr += `<path d="${bodyD(lesk)}" stroke="#FFFFFF" stroke-width="2.4" fill="none" stroke-linecap="round" opacity="0.18"/>`;
  s += `<g clip-path="url(#${q}-mi)">${uvnitr}</g>`;
  /* Světlo na hřbetu okraje — vzadu vlevo a vpředu vlevo */
  const hrbet = (a0: number, a1: number, op: number) => {
    const b = Array.from({ length: 9 }, (_, i) => {
      const fi = mix(a0, a1, i / 8);
      return okraj(fi, tl(fi) * 0.45);
    });
    return `<path d="${bodyD(b)}" stroke="#FFFFFF" stroke-width="1.6" fill="none" stroke-linecap="round" opacity="${op}"/>`;
  };
  s += hrbet(3.4, 4.5, 0.5) + hrbet(1.8, 2.9, 0.55);
  return s;
}

/** Nádoba z válečků ve stavbě a vedle volný váleček */
function valecky(q: string, defs: string[]) {
  const h = HLINA.mokry;
  const vx = 152;
  const vy = 238;
  const N = 6;
  const KROK = 18;
  const rnd = nahoda(23);
  /* Ručně válené — každý váleček trochu jinak tlustý a zvlněný */
  const RHO = Array.from({ length: N }, () => 10.4 + (rnd() - 0.5) * 1.2);
  const Rv = (i: number) => 76 + 2.6 * i;
  const cyv = (i: number) => vy - (6 + RHO[0] + i * KROK);
  const vlna = (i: number, fi: number) => 1.3 * Math.sin(2 * fi + i * 1.7) + 0.7 * Math.sin(5 * fi + i);
  const B = (i: number, fi: number, dy = 0, dr = 0): Bod => {
    const r = Rv(i) + dr;
    return [vx + r * Math.cos(fi), cyv(i) + r * KV * Math.sin(fi) + vlna(i, fi) + dy];
  };
  const pred = (i: number, dy: number, a0 = Math.PI, a1 = 0, n = 18) => bodyD(Array.from({ length: n + 1 }, (_, k) => B(i, mix(a0, a1, k / n), dy)));
  const zad = (i: number, dy: number, dr = 0) => bodyD(Array.from({ length: 19 }, (_, k) => B(i, Math.PI + (k / 18) * Math.PI, dy, dr)));
  let s = "";
  defs.push(mekkyStin(`${q}-s`, "#2B2420", 0.34));
  s += el(vx + 24, vy + 10, 118, 27, `fill="url(#${q}-s)"`);

  /* Kulaté dno — vyválená deska */
  const RB = Rv(0) + RHO[0] + 6;
  s += `<path d="M${f(vx - RB)} ${vy - 6} A${f(RB)} ${f(RB * KV)} 0 0 0 ${f(vx + RB)} ${vy - 6} L${f(vx + RB)} ${vy} A${f(RB)} ${f(RB * KV)} 0 0 1 ${f(vx - RB)} ${vy}Z" fill="${h.stin}"/>`;
  defs.push(`<radialGradient id="${q}-d" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stop-color="${h.svetlo}"/><stop offset="1" stop-color="${h.stred}"/></radialGradient>`);
  s += el(vx, vy - 6, RB, RB * KV, `fill="url(#${q}-d)"`);

  /* Pohled dovnitř: nahoře ještě kulaté válečky, níž zahlazená stěna */
  const t5 = N - 1;
  const r5 = RHO[t5];
  const dira = Array.from({ length: 40 }, (_, k) => {
    const fi = (k / 40) * 2 * Math.PI;
    return B(t5, fi, -r5 * Math.sin(fi), -r5 * Math.abs(Math.cos(fi)));
  });
  defs.push(`<clipPath id="${q}-di"><path d="${uzavrena(dira)}"/></clipPath>`);
  defs.push(
    `<linearGradient id="${q}-vn" x1="0" y1="0" x2="1" y2="0">` +
      `<stop offset="0" stop-color="#2A1C14"/><stop offset="0.55" stop-color="${smichej(h.stin, h.stred, 0.35)}"/><stop offset="1" stop-color="${h.stred}"/>` +
      `</linearGradient>`,
  );
  const R5 = Rv(t5);
  let uvnitr = `<rect x="${f(vx - R5)}" y="${f(cyv(t5) - R5 * KV - 4)}" width="${f(2 * R5)}" height="${f(2 * R5 * KV + 8)}" fill="url(#${q}-vn)"/>`;
  /* Zahlazeno prsty — tahy dolů přes spoje */
  for (let j = 0; j < 9; j++) {
    /* Krátké šmouhy prstem přes spoj dolů, ve dvou řadách přes sebe */
    const rada = j % 2;
    const fi0 = ((206 + j * 15 + rnd() * 6) * Math.PI) / 180;
    const rr = Rv(2) - 6;
    const h0 = 6 + (rada ? 2.6 : 3.5) * KROK + 10 + rnd() * 4;
    const tah: Bod[] = [0, 1, 2].map((k) => {
      const hh = h0 - k * 7;
      const fi = fi0 + k * 0.05;
      return [vx + rr * Math.cos(fi), vy - hh + rr * KV * Math.sin(fi)];
    });
    uvnitr += `<path d="${bodyD(tah)}" stroke="#1E140E" stroke-width="5.5" fill="none" stroke-linecap="round" opacity="0.1"/>`;
    uvnitr += `<path d="${bodyD(tah)}" stroke="${h.svetlo}" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.13" transform="translate(2.4 0.4)"/>`;
  }
  /* Předposlední váleček zevnitř — ještě kulatý */
  {
    const i = N - 2;
    const t = RHO[i] * 0.85;
    const dr = -RHO[i] * 0.55;
    const horni = Array.from({ length: 19 }, (_, k) => B(i, Math.PI + (k / 18) * Math.PI, -t, dr));
    const dolni = Array.from({ length: 19 }, (_, k) => B(i, 2 * Math.PI - (k / 18) * Math.PI, t, dr));
    uvnitr += `<path d="M${f(horni[0][0])} ${f(horni[0][1])}${hladce(horni)} L${f(dolni[0][0])} ${f(dolni[0][1])}${hladce(dolni)}Z" fill="url(#${q}-vn)"/>`;
    uvnitr += `<path d="${zad(i, -t * 0.35, dr)}" stroke="${h.svetlo}" stroke-width="${f(t * 0.6)}" fill="none" opacity="0.42"/>`;
    uvnitr += `<path d="${zad(i, t * 0.8, dr)}" stroke="#1E140E" stroke-width="${f(t * 0.55)}" fill="none" opacity="0.4"/>`;
  }
  s += `<g clip-path="url(#${q}-di)">${uvnitr}</g>`;

  /* Horní váleček vzadu — vidíme jeho vnitřní bok */
  defs.push(
    `<linearGradient id="${q}-vz" x1="0" y1="0" x2="1" y2="0">` +
      `<stop offset="0" stop-color="${h.stin}"/><stop offset="0.55" stop-color="${h.stred}"/><stop offset="0.85" stop-color="${h.svetlo}"/><stop offset="1" stop-color="${h.stred}"/>` +
      `</linearGradient>`,
  );
  {
    const horni = Array.from({ length: 19 }, (_, k) => B(t5, Math.PI + (k / 18) * Math.PI, -r5));
    const dolni = Array.from({ length: 19 }, (_, k) => B(t5, 2 * Math.PI - (k / 18) * Math.PI, r5));
    s += `<path d="M${f(horni[0][0])} ${f(horni[0][1])}${hladce(horni)} L${f(dolni[0][0])} ${f(dolni[0][1])}${hladce(dolni)}Z" fill="url(#${q}-vz)"/>`;
    s += `<path d="${zad(t5, -r5 * 0.45)}" stroke="${h.svetlo}" stroke-width="${f(r5 * 0.55)}" fill="none" opacity="0.36"/>`;
    s += `<path d="${zad(t5, r5 * 0.62)}" stroke="#1E140E" stroke-width="${f(r5 * 0.7)}" fill="none" opacity="0.26"/>`;
  }

  /* Válečky zepředu, odspodu nahoru — každý vyšší překryje vršek nižšího */
  defs.push(valcovy(`${q}-vt`, h, 0.3));
  for (let i = 0; i < N; i++) {
    const r = RHO[i];
    const horni = Array.from({ length: 19 }, (_, k) => B(i, Math.PI - (k / 18) * Math.PI, -r));
    const dolni = Array.from({ length: 19 }, (_, k) => B(i, (k / 18) * Math.PI, r));
    const d = `M${f(horni[0][0])} ${f(horni[0][1])}${hladce(horni)} A${f(r)} ${f(r)} 0 0 1 ${f(dolni[0][0])} ${f(dolni[0][1])}${hladce(dolni)} A${f(r)} ${f(r)} 0 0 1 ${f(horni[0][0])} ${f(horni[0][1])}Z`;
    s += `<path d="${d}" fill="url(#${q}-vt)"/>`;
    s += `<path d="${pred(i, r * 0.62)}" stroke="${h.stin}" stroke-width="${f(r * 0.85)}" fill="none" opacity="0.4"/>`;
    s += `<path d="${pred(i, r * 0.98)}" stroke="#1E140E" stroke-width="1.6" fill="none" opacity="0.38"/>`;
    s += `<path d="${pred(i, -r * 0.42)}" stroke="${h.svetlo}" stroke-width="${f(r * 0.55)}" fill="none" opacity="0.28"/>`;
    /* Mokrý lesk na vršku válečku vlevo */
    s += `<path d="${pred(i, -r * 0.5, (166 * Math.PI) / 180, (124 * Math.PI) / 180, 6)}" stroke="#FFFFFF" stroke-width="1.3" fill="none" stroke-linecap="round" opacity="0.38"/>`;
  }

  /* Volný váleček — had, leží na stole */
  const RH_ = 10.4;
  const had: Bod[] = [[270, 264], [300, 253], [333, 261], [365, 273], [398, 261]];
  const dh = bodyD(had);
  s += `<path d="${dh}" stroke="#2B2420" stroke-width="28" fill="none" stroke-linecap="round" opacity="0.05" transform="translate(5 8)"/>`;
  s += `<path d="${dh}" stroke="#2B2420" stroke-width="17" fill="none" stroke-linecap="round" opacity="0.14" transform="translate(3 6)"/>`;
  s += `<path d="${dh}" stroke="${h.stin}" stroke-width="${f(2 * RH_)}" fill="none" stroke-linecap="round"/>`;
  s += `<path d="${dh}" stroke="${h.stred}" stroke-width="${f(2 * RH_ - 6)}" fill="none" stroke-linecap="round" transform="translate(0 -1.6)"/>`;
  s += `<path d="${dh}" stroke="${h.svetlo}" stroke-width="${f(RH_ * 0.7)}" fill="none" stroke-linecap="round" opacity="0.7" transform="translate(0 -3.8)"/>`;
  s += `<path d="${dh}" stroke="#FFFFFF" stroke-width="1.4" fill="none" stroke-linecap="round" opacity="0.4" transform="translate(-1 -5.4)"/>`;
  return s;
}

/** Plát mezi lištami na plátně, válek, šablona; vedle hrnek z plátu */
function platy(q: string, defs: string[]) {
  const h = HLINA.mokry;
  /* Stůl trochu shora a lehce natočený; 1 cm = S jednotek */
  const S = 8.6;
  const KT = 0.5;
  const ROT = (-7 * Math.PI) / 180;
  const OX = 160;
  const OY = 150;
  const cr = Math.cos(ROT);
  const sr = Math.sin(ROT);
  const T = (u: number, v: number, hh = 0): Bod => {
    const x0 = u * cr - v * sr;
    const z0 = u * sr + v * cr;
    const g = 1 + z0 * 0.008;
    return [OX + S * x0 * g, OY + S * z0 * KT * g - S * hh * g];
  };
  const obdelnik = (u0: number, u1: number, v0: number, v1: number, hh: number) => lomena([T(u0, v0, hh), T(u1, v0, hh), T(u1, v1, hh), T(u0, v1, hh)]);
  const cara = (a: Bod, b: Bod) => `M${f(a[0])} ${f(a[1])} L${f(b[0])} ${f(b[1])}`;
  let s = "";

  /* Plátno — režné, ať se hlína nelepí */
  defs.push(`<linearGradient id="${q}-pl" x1="0" y1="0" x2="1" y2="0.5"><stop offset="0" stop-color="#E6DDCA"/><stop offset="1" stop-color="#D2C6AE"/></linearGradient>`);
  s += `<path d="${obdelnik(-16.6, 16.6, -11.5, 12.5, 0)}" fill="#2B2420" opacity="0.1" transform="translate(2 3)"/>`;
  s += `<path d="${obdelnik(-16.6, 16.6, -11.5, 12.5, 0)}" fill="url(#${q}-pl)"/>`;
  s += `<path d="${obdelnik(-16, 16, -10.9, 11.9, 0)}" fill="none" stroke="#B3A386" stroke-width="1.1" opacity="0.75"/>`;
  /* Měkký záhyb plátna vpředu vlevo */
  const zahyb = (a: Bod, b: Bod) =>
    `<path d="${cara(a, b)}" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" opacity="0.35"/><path d="${cara(a, b)}" stroke="#A8977A" stroke-width="2.6" stroke-linecap="round" opacity="0.26" transform="translate(2.2 1.4)"/>`;
  s += zahyb(T(-16.2, 6.5), T(-14.8, 11.6));

  /* Lišty 6 mm — po stranách plátu, válek na nich jede */
  defs.push(`<linearGradient id="${q}-li" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${P.preklizkaSvetlo}"/><stop offset="0.6" stop-color="${P.preklizka}"/><stop offset="1" stop-color="${P.preklizkaHrana}"/></linearGradient>`);
  const lista = (u0: number, u1: number) => {
    let l = `<path d="${obdelnik(u1, u1 + 1, -12, 13.2, 0)}" fill="#2B2420" opacity="0.12"/>`;
    l += `<path d="${obdelnik(u0, u1, -12, 13.2, 0)}" fill="${P.drevo}"/>`;
    l += `<path d="${obdelnik(u0, u1, -12, 13.2, 0.6)}" fill="url(#${q}-li)"/>`;
    for (const du of [1.3, 3.2]) l += `<path d="${cara(T(u0 + du, -11.6, 0.6), T(u0 + du + 0.3, 12.8, 0.6))}" stroke="${P.preklizkaStin}" stroke-width="0.8" opacity="0.4"/>`;
    l += `<path d="${cara(T(u0, 13.2, 0.6), T(u1, 13.2, 0.6))}" stroke="#FFFFFF" stroke-width="1" opacity="0.6"/>`;
    return l;
  };
  s += lista(-14.2, -8.7) + lista(8.7, 14.2);

  /* Plát — vyválená hlína, okraje trochu nepravidelné */
  const rnd = nahoda(61);
  const obr: Bod[] = [];
  for (let i = 0; i < 44; i++) {
    const t = (i / 44) * 2 * Math.PI;
    const c = Math.cos(t);
    const sn = Math.sin(t);
    obr.push([8.3 * Math.sign(c) * Math.abs(c) ** 0.3 + (rnd() - 0.5) * 0.3, 10.1 * Math.sign(sn) * Math.abs(sn) ** 0.34 + (rnd() - 0.5) * 0.4]);
  }
  s += `<path d="${uzavrena(obr.map(([u, v]) => T(u, v, 0)))}" fill="${h.stin}"/>`;
  defs.push(`<radialGradient id="${q}-pt" cx="0.3" cy="0.25" r="0.95"><stop offset="0" stop-color="${h.svetlo}"/><stop offset="0.55" stop-color="${h.stred}"/><stop offset="1" stop-color="${smichej(h.stred, h.stin, 0.35)}"/></radialGradient>`);
  const vrch = uzavrena(obr.map(([u, v]) => T(u, v, 0.6)));
  defs.push(`<clipPath id="${q}-pc"><path d="${vrch}"/></clipPath>`);
  s += `<path d="${vrch}" fill="url(#${q}-pt)"/>`;
  const l0 = T(-6, 0, 0.6);
  s += `<g clip-path="url(#${q}-pc)">${el(l0[0], l0[1], 50, 11, `fill="#FFFFFF" opacity="0.1" transform="rotate(-4 ${f(l0[0])} ${f(l0[1])})"`)}</g>`;

  /* Papírová šablona (kruh) a čárkovaná čára řezu kolem ní */
  const kruhNaPlatu = (cu: number, cv: number, r: number) =>
    Array.from({ length: 36 }, (_, i) => {
      const a = (i / 36) * 2 * Math.PI;
      return T(cu + r * Math.cos(a), cv + r * Math.sin(a), 0.62);
    });
  const sab = uzavrena(kruhNaPlatu(-4.1, 3.4, 3.5));
  s += `<path d="${sab}" fill="#2B2420" opacity="0.18" transform="translate(1.6 1.8)"/>`;
  s += `<path d="${sab}" fill="#FBF8F1"/>`;
  s += `<path d="${uzavrena(kruhNaPlatu(-4.1, 3.4, 4.05))}" fill="none" stroke="${RUM}" stroke-width="1.8" stroke-dasharray="5 4" stroke-linecap="round"/>`;
  /* Pruh na stěnu hrnku — čárkovaný obdélník */
  s += `<path d="${obdelnik(1, 7.2, -3.6, 7.4, 0.62)}" fill="none" stroke="${RUM}" stroke-width="1.8" stroke-dasharray="5 4" stroke-linecap="round" stroke-linejoin="round"/>`;

  /* Popisek na liště */
  const tp = T(-11.45, 11, 0.6);
  const tq = T(-10.45, 11, 0.6);
  const uhel = (Math.atan2(tq[1] - tp[1], tq[0] - tp[0]) * 180) / Math.PI;
  s += `<text x="${f(tp[0])}" y="${f(tp[1])}" transform="rotate(${f(uhel)} ${f(tp[0])} ${f(tp[1])})" font-family="Caveat, cursive" font-size="22" font-weight="500" text-anchor="middle" fill="${P.inkoust}" opacity="0.82">6 mm</text>`;

  /* Válek leží na obou lištách */
  const vr = 1.9;
  const va = -15.6;
  const vb = 15.6;
  const vv = -7.6;
  const vh = 0.6 + vr;
  /* Stín válku: od místa dotyku dopředu doprava do ztracena */
  const s0a = T(va, vv + 0.3, 0.6);
  const s0b = T(vb, vv + 0.3, 0.6);
  const s1a = T(va + 1.4, vv + 3.6, 0.6);
  const s1b = T(vb + 1.4, vv + 3.6, 0.6);
  defs.push(
    `<linearGradient id="${q}-vs" gradientUnits="userSpaceOnUse" x1="${f((s0a[0] + s0b[0]) / 2)}" y1="${f((s0a[1] + s0b[1]) / 2)}" x2="${f((s1a[0] + s1b[0]) / 2)}" y2="${f((s1a[1] + s1b[1]) / 2)}">` +
      `<stop offset="0" stop-color="#2B2420" stop-opacity="0.32"/><stop offset="1" stop-color="#2B2420" stop-opacity="0"/>` +
      `</linearGradient>`,
  );
  s += `<path d="${lomena([s0a, s0b, s1b, s1a])}" fill="url(#${q}-vs)"/>`;
  /* Obrys válku: obal dvou čel (kruhy kolmo na osu) */
  const celo = (u: number) =>
    Array.from({ length: 36 }, (_, i) => {
      const a = (i / 36) * 2 * Math.PI;
      return T(u, vv + vr * Math.cos(a), vh + vr * Math.sin(a));
    });
  const ca = celo(va);
  const cb = celo(vb);
  const osaA = T(va, vv, vh);
  const osaB = T(vb, vv, vh);
  const dx = osaB[0] - osaA[0];
  const dy = osaB[1] - osaA[1];
  const dl = Math.hypot(dx, dy);
  const nx = -dy / dl;
  const ny = dx / dl;
  const rs = Math.max(...ca.map((b) => Math.abs((b[0] - osaA[0]) * nx + (b[1] - osaA[1]) * ny)));
  const mid: Bod = [(osaA[0] + osaB[0]) / 2, (osaA[1] + osaB[1]) / 2];
  defs.push(
    `<linearGradient id="${q}-va" gradientUnits="userSpaceOnUse" x1="${f(mid[0] - nx * rs)}" y1="${f(mid[1] - ny * rs)}" x2="${f(mid[0] + nx * rs)}" y2="${f(mid[1] + ny * rs)}">` +
      `<stop offset="0" stop-color="${P.preklizkaStin}"/><stop offset="0.14" stop-color="${P.preklizkaSvetlo}"/><stop offset="0.3" stop-color="#F7EAD2"/>` +
      `<stop offset="0.52" stop-color="${P.preklizka}"/><stop offset="0.82" stop-color="${P.drevoSvetlo}"/><stop offset="1" stop-color="${P.drevo}"/>` +
      `</linearGradient>`,
  );
  s += `<path d="${obalBodu([...ca, ...cb])}" fill="url(#${q}-va)"/>`;
  s += `<path d="M${f(osaA[0] - nx * rs * 0.42 + 8)} ${f(osaA[1] - ny * rs * 0.42)} L${f(osaB[0] - nx * rs * 0.42 - 8)} ${f(osaB[1] - ny * rs * 0.42)}" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" opacity="0.6"/>`;
  /* Levé čelo je natočené k nám — je vidět dřevo */
  s += `<path d="${uzavrena(ca)}" fill="${P.preklizkaHrana}"/>`;
  s += `<path d="${uzavrena(ca)}" fill="none" stroke="${P.preklizkaStin}" stroke-width="1" opacity="0.6"/>`;

  /* Hrnek slepený z plátu: svislý šev, dno přilepené zespodu */
  const H = 104;
  const mx = 344;
  const my = 266;
  s += nadoba({ id: `${q}-n`, tvar: "hrnek", stav: "mokry", x: mx, y: my, vyska: H, ryhy: false });
  const r = OBRYSY.hrnek;
  const zakl = my - r(0) * H * K;
  const naHrnku = (t: number, st: number): Bod => {
    const rr = r(t) * H;
    const a = (st * Math.PI) / 180;
    return [mx + rr * Math.cos(a), zakl - t * H + rr * K * Math.sin(a)];
  };
  const sev = Array.from({ length: 11 }, (_, i) => {
    const t = 0.07 + (i / 10) * 0.93;
    return naHrnku(t, 78 + Math.sin(t * 9) * 1.2);
  });
  s += `<path d="${bodyD(sev)}" stroke="${h.stin}" stroke-width="1.9" fill="none" opacity="0.55" transform="translate(1.3 0)"/>`;
  s += `<path d="${bodyD(sev)}" stroke="${h.svetlo}" stroke-width="1.5" fill="none" opacity="0.7" transform="translate(-0.6 0)"/>`;
  /* Spoj stěny a dna */
  const spoj = oblouk(mx, zakl - 0.065 * H, r(0.065) * H, r(0.065) * H * K, 180, 0, 12);
  s += `<path d="${bodyD(spoj)}" stroke="${h.stin}" stroke-width="1.3" fill="none" opacity="0.45"/>`;
  return s;
}

/** Konvexní obal bodů jako uzavřená lomená čára */
function obalBodu(body: Bod[]): string {
  const b = [...body].sort((p, r) => p[0] - r[0] || p[1] - r[1]);
  const kriz = (o: Bod, a: Bod, c: Bod) => (a[0] - o[0]) * (c[1] - o[1]) - (a[1] - o[1]) * (c[0] - o[0]);
  const dolni: Bod[] = [];
  for (const p of b) {
    while (dolni.length >= 2 && kriz(dolni[dolni.length - 2], dolni[dolni.length - 1], p) <= 0) dolni.pop();
    dolni.push(p);
  }
  const horni: Bod[] = [];
  for (const p of [...b].reverse()) {
    while (horni.length >= 2 && kriz(horni[horni.length - 2], horni[horni.length - 1], p) <= 0) horni.pop();
    horni.push(p);
  }
  return lomena([...dolni.slice(0, -1), ...horni.slice(0, -1)]);
}

/**
 * Modelování v ruce — vinětka na průhledném pozadí (viewBox 420 × 340),
 * leží na papíře. Jediný text je „6 mm“ na liště u plátů.
 */
export function vRuce(druh: DruhVRuce, p = "dtv"): string {
  const q = `${p}-r${druh === "mackana" ? "m" : druh === "valecky" ? "v" : "p"}`;
  const defs: string[] = [];
  const s = druh === "mackana" ? mackana(q, defs) : druh === "valecky" ? valecky(q, defs) : platy(q, defs);
  return `<svg viewBox="0 0 ${RUCE_W} ${RUCE_H}" aria-hidden="true"><defs>${defs.join("")}</defs>${s}</svg>`;
}
