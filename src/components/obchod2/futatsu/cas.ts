/**
 * 四 Čas — hrnek, který stárne s tebou. Kresby kapitoly Čas na stránce
 * /obchod-2/futatsu: pohled do Futatsu shora, jak stojí na dřevěném
 * podšálku (chataku) v ranním světle zleva.
 *
 *   pohledShora(stari, caj, p)  velký pohled: podšálek a stíny, obruba
 *                               s tečkami železa, výstupek, vnitřek
 *                               s krakelé, na dně poslední doušek a pára
 *   nahledStari(stari, caj, p)  malý pohled jen do hrnku — klikací zastávky;
 *                               krakelé si půjčí z velkého přes <use>
 *   barvyStari(stari, caj)      co se se stářím mění (atributy prvků
 *                               s data-c) — build z nich kreslí, skript
 *                               je přepisuje při posunu jezdce
 *   stariZ(v)                   poloha jezdce 0–100 → měsíce, popis, stáří
 *
 * Kamera je kousek nad hrnkem, takže dno je menší než okraj a vnitřní stěna
 * je vidět jako prstenec. Síť krakelé je KRAK z kresba.ts rozvinutá po
 * vnitřku od středu dna až k okraji. Krakelé časem nasaje barvu čaje
 * a tmavne — nejvíc u dna, kde čaj stojí nejdéle. Barvení je z dřívější
 * stránky (futatsu.ts), jen dostalo víc vrstev. Kresba je pro představu.
 */
import { f, smichej, omez } from "../../dilna/kresba/zaklad";
import type { Bod } from "../../dilna/kresba/zaklad";
import { KRAK, Rin, IN, TECKY, NUBS, rng, rad } from "./kresba";
import { BARVY } from "./podobizna";

const o3 = (n: number) => (Math.round(n * 1000) / 1000).toString();

/* ═══════════════ Stáří ═══════════════ */

/** Zastávky jezdce: poloha 0–100, kolik měsíců to je a jak se tomu říká */
export const ZASTAVKY_CASU = [
  { v: 0, mesice: 0, nazev: "Nový z pece" },
  { v: 33, mesice: 0.03, nazev: "Po prvním čaji" },
  { v: 66, mesice: 12, nazev: "Po roce" },
  { v: 100, mesice: 60, nazev: "Po pěti letech" },
];

/** Poloha jezdce → měsíce (mezi zastávkami plynule, dál od nového hrnku pomaleji) */
export function stariZ(v: number) {
  const x = omez(v, 0, 100);
  let i = 0;
  while (i < ZASTAVKY_CASU.length - 2 && ZASTAVKY_CASU[i + 1].v <= x) i++;
  const a = ZASTAVKY_CASU[i];
  const b = ZASTAVKY_CASU[i + 1];
  const t = (x - a.v) / (b.v - a.v);
  const mesice = i === 0 ? a.mesice + (b.mesice - a.mesice) * t : a.mesice * Math.pow(b.mesice / a.mesice, t);
  /* Čaj se v hrnku objeví cestou k prvnímu nálevu */
  return { mesice, popis: popisCasu(mesice), stari: stariMesice(mesice), caj: omez((x - 6) / 20) };
}

/** Viditelné stáří 0–1: hned po prvním čaji kousek, pak pomalu do pěti let */
export const stariMesice = (m: number) => (m <= 0 ? 0 : omez(0.07 + 0.93 * Math.pow(Math.min(m, 60) / 60, 0.72)));

export function popisCasu(m: number): string {
  if (m <= 0.004) return "Nový z pece";
  if (m < 0.12) return "Po prvním čaji";
  if (m < 0.5) return "Po týdnu";
  if (m < 1.5) return "Po měsíci";
  if (m < 5) return `Po ${Math.round(m)} měsících`;
  if (m < 9) return "Po půl roce";
  if (m < 18) return "Po roce";
  if (m < 30) return "Po dvou letech";
  if (m < 42) return "Po třech letech";
  if (m < 54) return "Po čtyřech letech";
  return "Po pěti letech";
}

type Atributy = Record<string, string>;

/**
 * Barvy podle stáří (0–1) a toho, jestli už v hrnku byl čaj (0–1).
 * Klíč je data-c prvku. Prasklinky tmavnou z bledé do čajově hnědé,
 * u dna víc, a kde čaj obvykle sahá, zůstane jemná linka.
 */
export function barvyStari(stari: number, caj = 1): Record<string, Atributy> {
  const t = omez(stari);
  return {
    krak: { stroke: smichej("#C4B398", "#6A4426", Math.pow(t, 0.75)), opacity: o3(0.3 + 0.42 * Math.pow(t, 0.6)), "stroke-width": o3(1.1 + 0.6 * t) },
    krakDno: { stroke: smichej("#9C7C58", "#4A2812", t), opacity: o3(0.7 * Math.pow(t, 0.85)) },
    linka: { opacity: o3(0.3 * t) },
    patina: { opacity: o3(0.13 * t) },
    caj: { opacity: o3(omez(caj)) },
  };
}

const dc = (C: Record<string, Atributy>, klic: string) =>
  `data-c="${klic}" ${Object.entries(C[klic]).map(([a, v]) => `${a}="${v}"`).join(" ")}`;

/* ═══════════════ Geometrie pohledu shora ═══════════════ */

export const SHORA = { W: 1000, H: 1000 };
/** Jednotek obrazu na milimetr a střed hrnku (kousek vlevo, stíny jdou doprava) */
const K = 8.2;
const CX = 478;
const CY = 488;
/** Kamera nad okrajem (mm): čím blíž, tím menší dno */
const KAMERA = 600;
const s = (d: number) => KAMERA / (KAMERA + d);
/** Bod v hloubce d pod okrajem, poloměr r (mm), úhel a (0 = vpravo, po směru hodin) */
const P = (r: number, a: number, d: number): Bod => [CX + r * Math.cos(a) * s(d) * K, CY + r * Math.sin(a) * s(d) * K];
/** Poloměr v obraze */
const rho = (r: number, d: number) => r * s(d) * K;

/* Míry v obraze: obruba, hrana vnitřku, rovná stěna dole, dno, podšálek */
const R_OK = rho(42, 0);
const R_IN = rho(38.6, 1.7);
const R_STENA = rho(36.2, 54);
const R_DNO = rho(22, 66.1);
const R_TAC = rho(60, 76);
const R_CAJ = rho(18, 66.2);

/** Vnitřek jako řada [hloubka, poloměr] od okraje dolů ke středu dna */
const PROFIL: [number, number][] = (() => {
  const body: [number, number][] = [];
  for (let d = 1.7; d < 54; d += 4) body.push([d, Rin(d)]);
  for (const [r, d] of IN.slice(1) as [number, number][]) body.push([d, r]);
  return body.reverse();
})();
/** Délka po vnitřku od středu dna k okraji */
const DELKY: number[] = (() => {
  const L = [0];
  for (let i = 1; i < PROFIL.length; i++) L.push(L[i - 1] + Math.hypot(PROFIL[i][0] - PROFIL[i - 1][0], PROFIL[i][1] - PROFIL[i - 1][1]));
  return L;
})();
const CELKEM = DELKY[DELKY.length - 1];
/** [hloubka, poloměr] vnitřku ve vzdálenosti u (mm po povrchu) od středu dna */
function poPovrchu(u: number): [number, number] {
  const x = omez(u, 0, CELKEM);
  for (let i = 1; i < DELKY.length; i++) {
    if (x <= DELKY[i]) {
      const t = (x - DELKY[i - 1]) / Math.max(1e-6, DELKY[i] - DELKY[i - 1]);
      return [PROFIL[i - 1][0] + (PROFIL[i][0] - PROFIL[i - 1][0]) * t, PROFIL[i - 1][1] + (PROFIL[i][1] - PROFIL[i - 1][1]) * t];
    }
  }
  return PROFIL[PROFIL.length - 1];
}

/**
 * Krakelé rozvinuté po vnitřku: bod sítě v rovině o poloměru ρ leží na
 * povrchu ve vzdálenosti ρ · CELKEM / 38,8 od středu dna.
 */
function krakele(): string {
  const mer = CELKEM / 38.8;
  const bod = ([x, z]: Bod): Bod => {
    const [d, r] = poPovrchu(Math.hypot(x, z) * mer);
    return P(r, Math.atan2(z, x), d);
  };
  let d = "";
  for (const [a, c, b] of KRAK as [Bod, Bod, Bod][]) {
    if (Math.hypot(a[0], a[1]) > 38.8 && Math.hypot(b[0], b[1]) > 38.8) continue;
    const A = bod(a);
    const C = bod(c);
    const B = bod(b);
    d += `M${A[0].toFixed(1)} ${A[1].toFixed(1)}Q${C[0].toFixed(1)} ${C[1].toFixed(1)} ${B[0].toFixed(1)} ${B[1].toFixed(1)}`;
  }
  return d;
}

const kruh = (R: number, cx = CX, cy = CY) => `M${f(cx - R)} ${f(cy)} A${f(R)} ${f(R)} 0 1 0 ${f(cx + R)} ${f(cy)} A${f(R)} ${f(R)} 0 1 0 ${f(cx - R)} ${f(cy)} Z`;

/**
 * Výstupky shora: vyčnívají za obrubu. Navrchu je glazura, řez holé hlíny
 * stojí svisle, takže je z něj vidět jen oranžový okraj na špičce. Spodní
 * výstupek je hlouběji, z obruby vykoukne jen kousek.
 */
const UHEL_SHORA = -34;
function vystupky(p: string): string {
  let o = "";
  const a = rad(UHEL_SHORA);
  const uhel = (a * 180) / Math.PI;
  NUBS.forEach((nb: { y: number; p: number }, i: number) => {
    const d = nb.y;
    const [x0, y0] = P(38.5, a, d);
    const [x1, y1] = P(40.6 + nb.p, a, d);
    const delka = Math.hypot(x1 - x0, y1 - y0);
    const sirka = (i === 0 ? 12.6 : 9.8) * s(d) * K;
    const spic = sirka * 0.76;
    o += `<g transform="translate(${f(x0)} ${f(y0)}) rotate(${f(uhel + (i ? 9 : 0))})">`;
    /* Stín výstupku na podšálku, světlo jde zleva */
    o += `<path d="M0 ${f(-sirka / 2 + 10)} L${f(delka + 18)} ${f(-spic / 2 + 16)} Q${f(delka + 30)} 16 ${f(delka + 18)} ${f(spic / 2 + 16)} L0 ${f(sirka / 2 + 10)} Z" fill="#2A160A" opacity="0.22"/>`;
    /* Tělo v glazuře: u stěny širší, ke špičce se zúží a zaoblí */
    o += `<path d="M0 ${f(-sirka / 2)} L${f(delka - 5)} ${f(-spic / 2)} Q${f(delka + 1.5)} 0 ${f(delka - 5)} ${f(spic / 2)} L0 ${f(sirka / 2)} Z" fill="url(#${p}-vg)"/>`;
    o += `<path d="M${f(delka * 0.3)} ${f(-sirka / 2 + 3)} L${f(delka - 6)} ${f(-spic / 2 + 3)}" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity="0.6"/>`;
    /* Řez: holá hlína v barvě ohně, shora jen proužek na špičce */
    o += `<path d="M${f(delka - 6)} ${f(-spic / 2 + 2)} Q${f(delka + 0.5)} 0 ${f(delka - 6)} ${f(spic / 2 - 2)}" stroke="${BARVY.hiiro}" stroke-width="6.5" fill="none" stroke-linecap="round"/>`;
    o += `</g>`;
  });
  return o;
}

/** Pára nad doušky: tři široké měkké chomáče, které stránka nechá stoupat (CSS) */
function para(p: string): string {
  const r = rng(404);
  let o = "";
  for (let i = 0; i < 3; i++) {
    const x0 = CX - 50 + i * 52 + r() * 16;
    const y0 = CY + 40 - i * 22;
    const d = `M${f(x0)} ${f(y0)} C${f(x0 - 46)} ${f(y0 - 80)} ${f(x0 + 60)} ${f(y0 - 130)} ${f(x0 + 10)} ${f(y0 - 210)} C${f(x0 - 30)} ${f(y0 - 260)} ${f(x0 + 46)} ${f(y0 - 300)} ${f(x0 + 26)} ${f(y0 - 360)}`;
    o += `<g class="${p}-para-${i}"><path d="${d}" stroke="#FFFDF8" stroke-width="${f(60 + i * 10)}" stroke-linecap="round" fill="none" opacity="0.05"/>`;
    o += `<path d="${d}" stroke="#FFFDF8" stroke-width="${f(30 + i * 6)}" stroke-linecap="round" fill="none" opacity="0.07"/>`;
    o += `<path d="${d}" stroke="#FFFDF8" stroke-width="${f(11 + i * 3)}" stroke-linecap="round" fill="none" opacity="0.08"/></g>`;
  }
  return o;
}

/**
 * Velký pohled shora (viewBox SHORA). Průhledné pozadí — leží na ranním
 * papíře stránky. stari 0–1, caj 0–1 (v novém hrnku ještě čaj nebyl).
 */
export function pohledShora(stari: number, caj = 1, p = "ftc"): string {
  const C = barvyStari(stari, caj);
  const { W, H } = SHORA;
  const defs: string[] = [];
  const o: string[] = [];

  /* ——— Podšálek: stín na stole, dřevo, zvednutý okraj ——— */
  defs.push(`<radialGradient id="${p}-st"><stop offset="0" stop-color="#2A1A10" stop-opacity="0.4"/><stop offset="0.62" stop-color="#2A1A10" stop-opacity="0.2"/><stop offset="1" stop-color="#2A1A10" stop-opacity="0"/></radialGradient>`);
  o.push(`<ellipse cx="${f(CX + 52)}" cy="${f(CY + 40)}" rx="${f(R_TAC * 1.16)}" ry="${f(R_TAC * 1.12)}" fill="url(#${p}-st)"/>`);
  defs.push(
    `<radialGradient id="${p}-dr" gradientUnits="userSpaceOnUse" cx="${f(CX - 160)}" cy="${f(CY - 170)}" r="${f(R_TAC * 2)}">` +
      `<stop offset="0" stop-color="#C99464"/><stop offset="0.4" stop-color="#A16A3E"/><stop offset="0.75" stop-color="#7B4B2B"/><stop offset="1" stop-color="#5A341E"/></radialGradient>`,
  );
  o.push(`<circle cx="${CX}" cy="${CY}" r="${f(R_TAC)}" fill="url(#${p}-dr)"/>`);
  /* Let dřeva: pár dlouhých měkkých oblouků, žádná textura */
  defs.push(`<clipPath id="${p}-tc"><circle cx="${CX}" cy="${CY}" r="${f(R_TAC - 20)}"/></clipPath>`);
  const rl = rng(88);
  let leta = "";
  for (let i = 0; i < 8; i++) {
    const y = CY - R_TAC + 70 + (i * (R_TAC * 2 - 140)) / 7 + (rl() - 0.5) * 26;
    const v = 14 + rl() * 22;
    leta += `M${f(CX - R_TAC)} ${f(y)} C${f(CX - R_TAC * 0.35)} ${f(y - v)} ${f(CX + R_TAC * 0.3)} ${f(y + v)} ${f(CX + R_TAC)} ${f(y - v * 0.5)}`;
  }
  o.push(`<g clip-path="url(#${p}-tc)"><path d="${leta}" stroke="#4E2C18" stroke-width="2.6" fill="none" opacity="0.12"/><path d="${leta}" stroke="#F0C496" stroke-width="1.6" fill="none" opacity="0.1" transform="translate(0 5)"/></g>`);
  /* Okraj: světlo vlevo nahoře, stín vpravo dole */
  defs.push(`<linearGradient id="${p}-ok" x1="0.15" y1="0.1" x2="0.85" y2="0.9"><stop offset="0" stop-color="#F2C795"/><stop offset="0.38" stop-color="#B9804F"/><stop offset="0.68" stop-color="#7C4B2A"/><stop offset="1" stop-color="#4A2915"/></linearGradient>`);
  o.push(`<circle cx="${CX}" cy="${CY}" r="${f(R_TAC - 11)}" fill="none" stroke="url(#${p}-ok)" stroke-width="22"/>`);
  o.push(`<circle cx="${CX}" cy="${CY}" r="${f(R_TAC - 23)}" fill="none" stroke="#3E2212" stroke-width="3" opacity="0.32"/>`);
  o.push(`<path d="M${f(CX - (R_TAC - 6) * 0.94)} ${f(CY - (R_TAC - 6) * 0.34)} A${f(R_TAC - 6)} ${f(R_TAC - 6)} 0 0 1 ${f(CX + (R_TAC - 6) * 0.2)} ${f(CY - (R_TAC - 6) * 0.98)}" stroke="#FFE2BC" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.6"/>`);
  for (const [r, op] of [[0.84, 0.13], [0.7, 0.1]] as [number, number][]) {
    o.push(`<circle cx="${CX}" cy="${CY}" r="${f(R_TAC * r)}" fill="none" stroke="#4E2C18" stroke-width="1.8" opacity="${op}"/>`);
  }

  /* ——— Stín hrnku na podšálku, doprava dolů ——— */
  defs.push(`<radialGradient id="${p}-sh"><stop offset="0" stop-color="#26130A" stop-opacity="0.6"/><stop offset="0.72" stop-color="#26130A" stop-opacity="0.34"/><stop offset="1" stop-color="#26130A" stop-opacity="0"/></radialGradient>`);
  defs.push(`<clipPath id="${p}-tcs"><circle cx="${CX}" cy="${CY}" r="${f(R_TAC - 2)}"/></clipPath>`);
  o.push(`<g clip-path="url(#${p}-tcs)"><ellipse cx="${f(CX + 58)}" cy="${f(CY + 40)}" rx="${f(R_OK * 1.12)}" ry="${f(R_OK * 1.08)}" fill="url(#${p}-sh)"/></g>`);

  /* ——— Výstupky (pod obrubou) ——— */
  defs.push(`<linearGradient id="${p}-vg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${BARVY.shinoSvetlo}"/><stop offset="0.6" stop-color="${BARVY.shino}"/><stop offset="1" stop-color="${BARVY.shinoStin}"/></linearGradient>`);
  o.push(vystupky(p));

  /* ——— Obruba: zaoblený okraj, nahoře světlo, vpravo dole stín, tečky železa ——— */
  defs.push(
    `<radialGradient id="${p}-ob" gradientUnits="userSpaceOnUse" cx="${CX}" cy="${CY}" r="${f(R_OK)}">` +
      `<stop offset="${o3(R_IN / R_OK)}" stop-color="#E2D2B8"/><stop offset="${o3((R_IN / R_OK) * 0.45 + 0.55)}" stop-color="#FCF8F0"/><stop offset="1" stop-color="#DFCFB4"/></radialGradient>`,
  );
  o.push(`<circle cx="${CX}" cy="${CY}" r="${f(R_OK)}" fill="url(#${p}-ob)"/>`);
  defs.push(`<linearGradient id="${p}-os" x1="0" y1="0" x2="1" y2="0.5"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.45"/><stop offset="0.45" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="0.7" stop-color="#6E5032" stop-opacity="0"/><stop offset="1" stop-color="#6E5032" stop-opacity="0.3"/></linearGradient>`);
  o.push(`<path d="${kruh(R_OK)} ${kruh(R_IN)}" fill="url(#${p}-os)" fill-rule="evenodd"/>`);
  /* Tenká glazura na hraně se probarví do oranžova */
  o.push(`<circle cx="${CX}" cy="${CY}" r="${f((R_OK + R_IN) / 2 + 3)}" fill="none" stroke="${BARVY.hiiroSvetle}" stroke-width="${f(R_OK - R_IN - 6)}" opacity="0.07"/>`);
  let tecky = "";
  const rt = rng(5);
  for (const t of TECKY as { b: number; y: number; r: number; rr: number }[]) {
    const [x, y] = P(38.9 + t.rr * 2.9, rad(t.b), 0);
    tecky += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(t.r * K * 0.85)}" fill="${BARVY.zelezo}" opacity="${o3(0.5 + rt() * 0.4)}"/>`;
  }
  o.push(tecky);

  /* ——— Vnitřek ——— */
  defs.push(`<clipPath id="${p}-vn"><circle cx="${CX}" cy="${CY}" r="${f(R_IN)}"/></clipPath>`);
  defs.push(
    `<radialGradient id="${p}-gl" gradientUnits="userSpaceOnUse" cx="${CX}" cy="${CY}" r="${f(R_IN)}">` +
      `<stop offset="0" stop-color="#EFE7D8"/><stop offset="${o3(R_DNO / R_IN)}" stop-color="#EADFCB"/><stop offset="${o3((R_DNO / R_IN + R_STENA / R_IN) / 2)}" stop-color="#DFD0B6"/>` +
      `<stop offset="${o3(R_STENA / R_IN)}" stop-color="#D9C8AC"/><stop offset="${o3((R_STENA / R_IN + 1) / 2)}" stop-color="#E6D8C1"/><stop offset="1" stop-color="#F0E7D6"/></radialGradient>`,
  );
  const v: string[] = [];
  v.push(`<circle cx="${CX}" cy="${CY}" r="${f(R_IN)}" fill="url(#${p}-gl)"/>`);
  v.push(`<circle cx="${CX}" cy="${CY}" r="${f(R_IN)}" fill="#B98A57" ${dc(C, "patina")}/>`);
  /* Krakelé — po celém vnitřku; na stěně, kde se síť v pohledu zhušťuje, slabší; u dna tmavší */
  defs.push(`<path id="${p}-krak" d="${krakele()}"/>`);
  defs.push(
    `<radialGradient id="${p}-ms" gradientUnits="userSpaceOnUse" cx="${CX}" cy="${CY}" r="${f(R_IN)}"><stop offset="${o3(R_STENA / R_IN - 0.06)}" stop-color="#FFFFFF"/><stop offset="${o3((R_STENA / R_IN + 1) / 2)}" stop-color="#FFFFFF" stop-opacity="0.45"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0.3"/></radialGradient>` +
      `<mask id="${p}-mst" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="url(#${p}-ms)"/></mask>` +
      `<radialGradient id="${p}-md" gradientUnits="userSpaceOnUse" cx="${CX}" cy="${CY}" r="${f(R_STENA)}"><stop offset="0" stop-color="#FFFFFF"/><stop offset="0.62" stop-color="#FFFFFF" stop-opacity="0.75"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient>` +
      `<mask id="${p}-mdn" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="url(#${p}-md)"/></mask>`,
  );
  v.push(`<g mask="url(#${p}-mst)"><use href="#${p}-krak" fill="none" stroke-linecap="round" ${dc(C, "krak")}/></g>`);
  v.push(`<g mask="url(#${p}-mdn)"><use href="#${p}-krak" fill="none" stroke-width="1.9" stroke-linecap="round" ${dc(C, "krakDno")}/></g>`);
  /* Kam čaj obvykle sahá: linka kousek pod okrajem */
  v.push(`<circle cx="${CX}" cy="${CY}" r="${f(rho(37.9, 10))}" fill="none" stroke="#7A4A22" stroke-width="${f(1.3 * K)}" ${dc(C, "linka")}/>`);
  /* Stín obruby uvnitř: světlo zleva nedosáhne na levou stěnu a kus dna. Kraj stínu je měkký. */
  const dx = rho(30, 60);
  defs.push(
    `<radialGradient id="${p}-sv" gradientUnits="userSpaceOnUse" cx="${f(CX + dx)}" cy="${f(CY + dx * 0.1)}" r="${f(R_IN)}"><stop offset="0.8" stop-color="#000000"/><stop offset="1" stop-color="#000000" stop-opacity="0"/></radialGradient>` +
      `<mask id="${p}-mss" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#FFFFFF"/><circle cx="${f(CX + dx)}" cy="${f(CY + dx * 0.1)}" r="${f(R_IN)}" fill="url(#${p}-sv)"/></mask>`,
  );
  v.push(`<circle cx="${CX}" cy="${CY}" r="${f(R_IN)}" fill="#5A4028" opacity="0.26" mask="url(#${p}-mss)"/>`);
  /* Ranní světlo na pravé stěně a dně */
  defs.push(`<radialGradient id="${p}-sl" gradientUnits="userSpaceOnUse" cx="${f(CX + dx * 0.9)}" cy="${f(CY - dx * 0.2)}" r="${f(R_IN * 0.9)}"><stop offset="0" stop-color="#FFF4DE" stop-opacity="0.32"/><stop offset="1" stop-color="#FFF4DE" stop-opacity="0"/></radialGradient>`);
  v.push(`<circle cx="${CX}" cy="${CY}" r="${f(R_IN)}" fill="url(#${p}-sl)"/>`);

  /* ——— Poslední doušek v jezírku na dně: průsvitný čaj, odlesk oblohy ——— */
  /* Jezírko je uprostřed nejhlubší: tam je čaj tmavší, ke kraji mělčí a světlejší */
  defs.push(
    `<radialGradient id="${p}-cj" gradientUnits="userSpaceOnUse" cx="${CX}" cy="${CY}" r="${f(R_CAJ)}">` +
      `<stop offset="0" stop-color="#8A4E1C" stop-opacity="0.74"/><stop offset="0.65" stop-color="#A8662A" stop-opacity="0.62"/><stop offset="1" stop-color="#C78A48" stop-opacity="0.42"/></radialGradient>`,
  );
  /* Odlesk ranní oblohy na hladině: plochý měkký pruh, žádná kulička */
  defs.push(`<linearGradient id="${p}-od" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF6E2" stop-opacity="0"/><stop offset="0.5" stop-color="#FFF6E2" stop-opacity="0.34"/><stop offset="1" stop-color="#FFF6E2" stop-opacity="0"/></linearGradient>`);
  defs.push(`<clipPath id="${p}-cc"><circle cx="${CX}" cy="${CY}" r="${f(R_CAJ - 2)}"/></clipPath>`);
  let dousek = `<circle cx="${CX}" cy="${CY}" r="${f(R_CAJ)}" fill="url(#${p}-cj)"/>`;
  dousek += `<g clip-path="url(#${p}-cc)"><rect x="${f(CX - R_CAJ * 1.2)}" y="${f(CY - R_CAJ * 0.62)}" width="${f(R_CAJ * 2.4)}" height="${f(R_CAJ * 0.42)}" fill="url(#${p}-od)" transform="rotate(-24 ${CX} ${CY})"/></g>`;
  /* Meniskus: tenká tmavší hrana, vpravo dole se blýskne */
  dousek += `<circle cx="${CX}" cy="${CY}" r="${f(R_CAJ)}" fill="none" stroke="#6A3812" stroke-width="2.2" opacity="0.32"/>`;
  dousek += `<path d="M${f(CX + R_CAJ * 0.94)} ${f(CY + R_CAJ * 0.25)} A${f(R_CAJ - 3)} ${f(R_CAJ - 3)} 0 0 1 ${f(CX + R_CAJ * 0.18)} ${f(CY + R_CAJ * 0.94)}" stroke="#FFEBC8" stroke-width="2.4" fill="none" opacity="0.45" stroke-linecap="round"/>`;
  v.push(`<g ${dc(C, "caj")}>${dousek}<g class="${p}-para">${para(p)}</g></g>`);

  o.push(`<g clip-path="url(#${p}-vn)">${v.join("")}</g>`);
  o.push(`<circle cx="${CX}" cy="${CY}" r="${f(R_IN)}" fill="none" stroke="#7A5C3C" stroke-width="1.8" opacity="0.3"/>`);
  o.push(`<circle cx="${CX}" cy="${CY}" r="${f(R_OK)}" fill="none" stroke="#5A422C" stroke-width="1.8" opacity="0.26"/>`);

  /* ——— Ranní světlo zleva přes celou kresbu ——— */
  defs.push(`<radialGradient id="${p}-rn" gradientUnits="userSpaceOnUse" cx="-80" cy="120" r="1100"><stop offset="0" stop-color="#FFD9A6" stop-opacity="0.22"/><stop offset="0.6" stop-color="#FFD9A6" stop-opacity="0.06"/><stop offset="1" stop-color="#FFD9A6" stop-opacity="0"/></radialGradient>`);
  o.push(`<circle cx="${CX}" cy="${CY}" r="${f(R_TAC)}" fill="url(#${p}-rn)"/>`);

  return `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false"><defs>${defs.join("")}</defs>${o.join("")}</svg>`;
}

/**
 * Malý pohled do hrnku pro zastávky — obruba a vnitřek, krakelé přes <use>
 * z velkého pohledu (musí být v dokumentu), barvy podle stáří.
 */
export function nahledStari(stari: number, caj: number, p = "ftc"): string {
  const C = barvyStari(stari, caj);
  const vb = 300;
  const k = vb / 2 / (R_OK + 6);
  const t = `translate(${f(vb / 2)} ${f(vb / 2)}) scale(${o3(k)}) translate(${-CX} ${-CY})`;
  const krak = Object.entries(C.krak).map(([a, v]) => `${a}="${a === "stroke-width" ? o3(Number(v) * 1.3) : v}"`).join(" ");
  return (
    `<svg viewBox="0 0 ${vb} ${vb}" aria-hidden="true" focusable="false"><g transform="${t}">` +
    `<circle cx="${CX}" cy="${CY}" r="${f(R_OK)}" fill="#F4ECDE"/>` +
    `<circle cx="${CX}" cy="${CY}" r="${f(R_IN)}" fill="url(#${p}-gl)"/>` +
    `<circle cx="${CX}" cy="${CY}" r="${f(R_IN)}" fill="#B98A57" opacity="${C.patina.opacity}"/>` +
    `<g mask="url(#${p}-mst)"><use href="#${p}-krak" fill="none" stroke-linecap="round" ${krak}/></g>` +
    (caj > 0 ? `<circle cx="${CX}" cy="${CY}" r="${f(R_CAJ)}" fill="url(#${p}-cj)" opacity="${o3(caj)}"/>` : "") +
    `<circle cx="${CX}" cy="${CY}" r="${f(rho(37.9, 10))}" fill="none" stroke="#7A4A22" stroke-width="${f(1.3 * K)}" opacity="${C.linka.opacity}"/>` +
    `<circle cx="${CX}" cy="${CY}" r="${f(R_IN)}" fill="none" stroke="#7A5C3C" stroke-width="4" opacity="0.4"/>` +
    `<circle cx="${CX}" cy="${CY}" r="${f(R_OK)}" fill="none" stroke="#5A422C" stroke-width="4" opacity="0.35"/>` +
    `</g></svg>`
  );
}
