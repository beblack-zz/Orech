/*
 * 01, Kami — DVANÁCT KVĚTŮ
 *
 * Maiko nosí ve vlasech každý měsíc jiné květy: v lednu borovici, v únoru
 * švestku, v dubnu sakuru, v květnu vistárii, v červenci malé vějířky,
 * v listopadu javor, v prosinci kuličky mochi. Vázička má čerstvé kytky
 * každý den, takže jí to jde samo — a nejen ve vlasech, i ve váze.
 *
 * Za ní stojí kruh ze značky, ensó, jeden tah štětcem v barvách soumraku.
 * Tady je to rok: tah začíná tam, kde je zrovna měsíc, a v mezeře mezi
 * jeho koncem a začátkem svítí květ toho měsíce. Leden je vlevo dole,
 * léto nahoře, prosinec vpravo dole.
 *
 * Kliknutí: zatočí se na dřevácích dokola (rukávy a šňůry kanzashi se
 * rozletí, zezadu je vidět mašle obi a holý zátylek), staré květy z ní
 * opadají, a když je zase čelem, má květy dalšího měsíce. Kruh se mezitím
 * namaluje znovu o kus dál. Nakonec rozevře vějíř a mrkne.
 * Myš: kouká za kurzorem a šňůry s lístky, větvička i rukávy se rozhoupou,
 * když se kolem ní mávne. Kdo jí kurzorem zůstane na tváři, tomu se
 * schová za vějíř a zachichotá se. Když se nic neděje, vymění si květy
 * za čas sama.
 * Zvenku (průvodce v rohu, scripts/parta2/pruvodce.ts): `vstup.vyraz` je
 * výraz, se kterým zrovna mluví — přebije všechno kromě otočky a `stydi`
 * ji schová i za vějíř; `vstup.vitrMysi` ztlumí vítr z mávnutí myší.
 * Gesta k replikám: `vlasy` (přidrží si kanzashi), `ovivani`, `vejir`
 * (póza s vějířem bez otočky), `uklon` (přikrčí se k zemi), `spi`; dál
 * `mesic` (květy skutečného měsíce) a `bezOtocek` (sama se netočí).
 * Šátek z krámku: `vstup.satek` = { vzor, pocet, cuk } jí dá do pravé ruky
 * uzlík furoshiki (kreslí ho jen podoby průvodce, viz Šátek průvodce níž);
 * kde uzlík zrovna visí, vrací kresba v `dyn.satekBod` a hned po kroku to
 * pošle i do `vstup.uzlikJe`, když ho průvodce dal.
 */
import {
  f, rng, clamp, lerp, smooth, rad, deg, mix, pt, kCili, pres, dosed, mrkani, kyvadlo, noveKyvadlo,
  VAZ, DEN, MESICE, KVETY_VETVE, polomer, vazDefs, kvetyDefs, vazTelo, vazTvarNa, vazSnury, vazVetvicka,
  vazZa, vazPred, vazBoty, vazRukavy, vazRuka, vazVejir, klicRukavu, vazStin, kanzashiStred, kvet, listek,
} from "./spolecne.js";
import { vzory, vzorPodleId, vzorPattern } from "../../data/furoshiki";

const ID = "vg1";
const P = DEN;
/* ——— Kruh ——— */
const C = [90, 81];
const RK = 55, WK = 14.5, ROZSAH = 304, DILKU = 72;
/* ——— Postava ——— */
const ZEM = 167, K = 0.84;
const POSTAVA = `translate(${VAZ.cx} ${ZEM}) scale(${K}) translate(${-VAZ.cx} ${-VAZ.zem})`;
const vPostave = (s) => `<g transform="${POSTAVA}">${s}</g>`;
const naPlatno = ([x, y]) => [VAZ.cx + (x - VAZ.cx) * K, ZEM + (y - VAZ.zem) * K];
const TVAR0 = naPlatno([90, 101]);
/* otočka, pak chvíli drží pózu s vějířem; kruh se maluje od K0 po dobu KT */
const TOC = 1.2, PUL = TOC / 2, POZA = 1.2, K0 = 0.3, KT = 1.3;
const KONEC = TOC + POZA + 0.6;
const PRVNI = 3;

/* ═══ Ensó: jeden tah v barvách soumraku ═══ */
const SOUMRAK = [[0, "#C4432B"], [0.28, "#C0708A"], [0.55, "#7A5E8E"], [0.8, "#4E4A84"], [1, "#2A2C5E"]];
const soumrak = (t) => {
  t = clamp(t);
  let i = 0;
  while (i < SOUMRAK.length - 2 && SOUMRAK[i + 1][0] <= t) i++;
  return mix(SOUMRAK[i][1], SOUMRAK[i + 1][1], (t - SOUMRAK[i][0]) / (SOUMRAK[i + 1][0] - SOUMRAK[i][0]));
};
/** Kde na kruhu je který měsíc: od osmé hodiny přes vrchol ke čtvrté. */
const uhelMesice = (m) => -210 + m * (240 / 11);
const zacatekTahu = (m) => uhelMesice(m) + (360 - ROZSAH) / 2;
/* ruka nevede kruh dokonale: poloměr dýchá a konec se stáčí ven */
const naTahu = (m, t, o = 0) => {
  const u = zacatekTahu(m) + ROZSAH * t;
  const r = RK * (1 + 0.02 * Math.sin(rad(u) * 2 + 0.6) + 0.009 * Math.sin(rad(u) * 5 + 1.3)) + 3 * Math.pow(Math.max(0, t - 0.8) / 0.2, 2) + o;
  return [C[0] + r * Math.cos(rad(u)), C[1] + r * Math.sin(rad(u))];
};
/* štětec dosedne, drží sílu a ke konci se vytahuje */
const sirkaTahu = (t) => (t < 0.05 ? WK * (0.62 + 0.38 * (t / 0.05)) : t < 0.5 ? WK * (1 - 0.1 * ((t - 0.05) / 0.45)) : WK * 0.9 * (1 - 0.84 * Math.pow((t - 0.5) / 0.5, 1.5)));
/* suchý štětec: od 0,6 se tah rozpadá na prameny, které dojdou jeden po druhém */
const PRAMENY = [{ o: -0.375, po: 0.84 }, { o: -0.125, po: 1 }, { o: 0.125, po: 0.94 }, { o: 0.375, po: 0.77 }];
const dilek = (m, t0, t1, o0, w0, o1, w1, barva) =>
  `<path d="M${pt(naTahu(m, t0, o0 + w0))} L${pt(naTahu(m, t1, o1 + w1))} L${pt(naTahu(m, t1, o1 - w1))} L${pt(naTahu(m, t0, o0 - w0))} Z" fill="${barva}"/>`;
/** Tah od začátku po `p` (0…1). Barva jde po délce z rumělky do noci. */
const tah = (m, p = 1) => {
  let s = "";
  const [x0, y0] = naTahu(m, 0), [x1, y1] = naTahu(m, 0.012);
  /* kapka, kde štětec dosedl */
  s += `<ellipse cx="${f(x0)}" cy="${f(y0)}" rx="${f(WK * 0.58)}" ry="${f(WK * 0.5)}" transform="rotate(${f(deg(Math.atan2(y1 - y0, x1 - x0)))} ${f(x0)} ${f(y0)})" fill="${SOUMRAK[0][1]}"/>`;
  const n = Math.ceil(DILKU * p);
  for (let i = 0; i < n; i++) {
    const t0 = i / DILKU, t1 = Math.min(p, (i + 1.35) / DILKU);
    if (t1 <= t0) break;
    const b = soumrak((t0 + t1) / 2);
    if (t0 < 0.6) s += dilek(m, t0, t1, 0, sirkaTahu(t0) / 2, 0, sirkaTahu(t1) / 2, b);
    else
      for (const pr of PRAMENY) {
        if (t0 >= pr.po) continue;
        const pul = (t) => sirkaTahu(t) * lerp(0.128, 0.055, Math.pow(clamp((t - 0.6) / (pr.po - 0.6)), 1.6));
        const tk = Math.min(t1, pr.po);
        s += dilek(m, t0, tk, pr.o * sirkaTahu(t0), pul(t0), pr.o * sirkaTahu(tk), pul(tk), b);
      }
  }
  return s;
};
const vrstvaKruh = (st) => tah(st.kruh.m);
const vrstvaKruhZivy = (st) => {
  const p = st.kruh.p;
  if (p <= 0 || p >= 1) return "";
  /* mokrá špička štětce jede napřed */
  const [x, y] = naTahu(st.kruh.novy, p);
  return tah(st.kruh.novy, p) + `<circle cx="${f(x)}" cy="${f(y)}" r="${f(sirkaTahu(p) * 0.62 + 1)}" fill="${mix(soumrak(p), "#FFFFFF", 0.35)}" opacity="0.8"/>`;
};
/* květ měsíce v mezeře: svítí jako měsíc v logu (průvodce pro mistra ho má bez světla, `svit: false`) */
const vrstvaKvetRoku = (st, { svit = true } = {}) => {
  const { m, k } = st.kvetRoku;
  if (k < 0.02) return "";
  const u = rad(uhelMesice(m));
  const x = C[0] + Math.cos(u) * (RK + 1.5), y = C[1] + Math.sin(u) * (RK + 1.5);
  return (
    (svit ? `<circle cx="${f(x)}" cy="${f(y)}" r="${f(17 * k)}" fill="url(#${ID}-svit)"/>` : "") +
    kvet(ID, m, [x, MESICE[m].visi ? y - 7 : y], { s: 1.9 * k, rot: MESICE[m].visi ? 0 : 14 + (1 - k) * -70 })
  );
};

/* ═══ Postava ═══ */
const yawQ = (st) => Math.round(st.yaw / 2) * 2;
/** Póza pro společné kusy postavy. */
const kusy = (st) => ({ yaw: st.yaw, m: st.mKvety, rust: st.rust, kyv: st.kyv, ruce: st.ruce, vejir: st.vejir });
const vrstvaRukavy = (za) => (st) => vPostave(vazRukavy(ID, kusy(st), za, { listky: MESICE[st.mTelo].listB[1] }));
const vrstvaListky = (st) =>
  st.listky
    .map((l) => {
      const q = l.vek / l.zivot;
      return listek(l.m, [l.x, l.y], { s: l.s * (0.8 + 0.2 * Math.cos(l.vek * 5 + l.fz)), rot: l.rot, op: clamp(Math.min(q / 0.06, (1 - q) / 0.3)), svetly: l.svetly });
    })
    .join("");

const defs = () =>
  vazDefs(ID, P) + kvetyDefs(ID) +
  `<radialGradient id="${ID}-zare" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#FFF1D4" stop-opacity="0.75"/><stop offset="0.55" stop-color="#F7CFC0" stop-opacity="0.26"/><stop offset="1" stop-color="#F7CFC0" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="${ID}-svit"><stop offset="0" stop-color="#FFF6DA" stop-opacity="0.95"/><stop offset="0.45" stop-color="#FFE7A3" stop-opacity="0.45"/><stop offset="1" stop-color="#FFE7A3" stop-opacity="0"/></radialGradient>` +
  /* lucerna průvodce v noci: papír prosvícený svíčkou a teplá záře kolem */
  `<radialGradient id="${ID}-chochin" cx="0.45" cy="0.42" r="0.62"><stop offset="0" stop-color="#FFF8DC"/><stop offset="0.45" stop-color="#FFD98A"/><stop offset="0.85" stop-color="#F5A651"/><stop offset="1" stop-color="#D9803A"/></radialGradient>` +
  `<radialGradient id="${ID}-chochin-zare"><stop offset="0" stop-color="#FFE3A6" stop-opacity="0.6"/><stop offset="0.45" stop-color="#FFB65E" stop-opacity="0.2"/><stop offset="1" stop-color="#FFB65E" stop-opacity="0"/></radialGradient>`;

/* ═══ Simulace ═══ */
const novyListek = (dyn, x, y, vx, vy, m, zivot = 3.2) => {
  const R = dyn.nahoda;
  if (dyn.listky.length > 70) return;
  dyn.listky.push({ x, y, vx, vy, m, vek: 0, zivot: zivot * (0.75 + R() * 0.5), rot: R() * 360, vr: (R() - 0.5) * 260, s: 0.55 + R() * 0.4, fz: R() * 6.28, svetly: R() < 0.5 });
};
/** Kde na plátně je květ i na větvičce (bez kývání). */
const kvetVetve = (i) => naPlatno(KVETY_VETVE[i]);
const zmen = (dyn, t) => {
  const R = dyn.nahoda;
  dyn.mPred = dyn.m;
  /* průvodce nosí květy skutečného měsíce (`vstup.mesic`): otočka je jen obnoví, měsíc nemění */
  dyn.m = typeof dyn.mesic === "number" ? dyn.mesic : (dyn.m + 1) % 12;
  dyn.zmena = t;
  dyn.zvuk.push({ druh: "latka", sila: 0.9, pan: 0 });
  dyn.zvuk.push({ druh: "klap", sila: 0.6, pan: -0.1, vys: 0, za: 0.12 });
  dyn.zvuk.push({ druh: "klap", sila: 0.6, pan: 0.1, vys: 1, za: TOC - 0.1 });
  [0, 2, 4].forEach((k, i) => dyn.zvuk.push({ druh: "struna", vys: (dyn.m + k) % 10, sila: 0.8 - i * 0.12, pan: (i - 1) * 0.3, za: PUL + i * 0.13 }));
  dyn.zvuk.push({ druh: "vejir", sila: 0.9, pan: 0.3, za: TOC + 0.16 });
  dyn.zvuk.push({ druh: "zvon", sila: 0.5, pan: 0, za: K0 + KT });
  /* staré květy se rozletí z větvičky i z vlasů */
  for (let i = 0; i < KVETY_VETVE.length; i++) {
    const [x, y] = kvetVetve(i);
    for (let k = 0; k < 4; k++) novyListek(dyn, x, y, (x - 90) * 0.9 + (R() - 0.5) * 46, -14 - R() * 26, dyn.mPred, 2.6);
  }
  const [kx, ky] = naPlatno(kanzashiStred(0));
  for (let k = 0; k < 9; k++) novyListek(dyn, kx, ky + R() * 12, -20 - R() * 34 + (R() - 0.5) * 30, -10 - R() * 22, dyn.mPred, 2.4);
};
const novaDynamika = () => ({
  m: PRVNI, mPred: PRVNI, zmena: -100, ceka: 0, dalsi: 9.5,
  snury: [noveKyvadlo(), noveKyvadlo(), noveKyvadlo()], rukavy: { L: noveKyvadlo(), P: noveKyvadlo() }, masle: noveKyvadlo(), vetev: noveKyvadlo(),
  listky: [], akum: 0.4, nahoda: rng(4104), zvuk: [], pohled: [0, 0], vitr: 0, mx: null, uTvare: 0, stydi: 0, cinkl: -10, nejPred: 0,
  /* lucerna průvodce na špičce tyčky (jen v noci, `vstup.lucerna`) */
  lucerna: noveKyvadlo(),
  /* uzlík šátku v pravé ruce (`vstup.satek`): kyvadlo, pružina, která ho pod dopadnutým kusem zhoupne dolů, jak moc ho drží (0…1),
     poslední vzor a počet (ať zmizí ve stejné látce), kolikrát do něj kus dopadl a kde je jeho střed na plátně (čte pruvodce.ts) */
  satek: noveKyvadlo(), satekPero: { y: 0, v: 0 }, nese: 0, satekVzor: null, satekPocet: 0, satekCuk: 0, satekBod: null,
  /* průvodce zvenku: ruka ke kanzashi, ovívání vějířem, dřímání, úklona, vějíř bez otočky (0…1) a měsíc podle kalendáře */
  vlasy: 0, ovivani: 0, spi: 0, uklon: 0, vejir: 0, mesic: null,
});
/* Kam jde ruka, když si přidrží vlasy (levá, ke kanzashi) a když se ovívá (pravá, vedle tváře) */
const RUKA_VLASY = [60, 71];
const RUKA_OVIVA = [123, 108];
/* S uzlíkem šátku drží pravou ruku o kus výš a blíž k tělu, ať uzlík nevisí až k zemi */
const RUKA_NESE = [-1.5, -5];
/** Póza v čase: natočení, kde má ruce, co dělá vějíř. Čistá funkce času a `dyn`. */
const poza = (d, t) => {
  const u = t - d.zmena;
  const toci = u >= 0 && u < TOC;
  const q = toci ? u / TOC : 0;
  /* `otoc` je natočení zvenku — v letu po úvodu (domek2/let-kami.ts) se dívá, kam letí */
  const yaw = (toci ? 360 * q * q * (3 - 2 * q) : 0) + (d.otoc || 0);
  const vzlet = toci ? Math.sin(Math.PI * q) : 0;
  const v = u - TOC;
  /* póza s vějířem: po otočce, nebo kdykoli si o ni průvodce řekne (`vstup.vejir`) */
  const ukaz = Math.max(v < 0 || v > POZA + 0.6 ? 0 : smooth(v / 0.2) * (1 - smooth((v - POZA) / 0.5)), toci ? 0 : d.vejir || 0);
  const ruka = (str) => {
    const w = rad(str * 90 + yaw), r = 40 + 8 * vzlet;
    return { H: [VAZ.cx + r * Math.sin(w), 117 - 6 * vzlet], za: Math.cos(w) < -0.15 };
  };
  const L = ruka(-1), Pr = ruka(1);
  const sm = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
  L.H = sm(L.H, [47, 112], ukaz);
  Pr.H = sm(sm(Pr.H, [134, 83], ukaz), [108, 124], d.stydi);
  /* průvodce: levou rukou si přidrží vlasy (kanzashi je vepředu, tak ruka nesmí zůstat za zády), pravou se ovívá */
  const vl = (d.vlasy || 0) * (1 - ukaz);
  const ov = (d.ovivani || 0) * (1 - d.stydi) * (1 - ukaz);
  L.H = sm(L.H, RUKA_VLASY, vl);
  if (vl > 0.5) L.za = false;
  Pr.H = sm(Pr.H, RUKA_OVIVA, ov);
  if (ov > 0.5) Pr.za = false;
  /* průvodce s uzlíkem šátku (`vstup.satek`) drží pravou ruku o kus výš v každé póze — i s vějířem, ať uzlík nevisí pod nohy */
  const n = d.nese || 0;
  if (n) Pr.H = [Pr.H[0] + RUKA_NESE[0] * n, Pr.H[1] + RUKA_NESE[1] * n];
  return {
    u, toci, yaw, vzlet, ukaz, L, Pr,
    vejir: { smer: lerp(lerp(lerp(78, -62, ukaz), -125, d.stydi), -78 + 16 * Math.sin(t * 7.5), ov), otevreni: Math.max(dosed(ukaz), 0.86 * d.stydi, 0.8 * ov) },
  };
};
/**
 * Jak se hýbe celá postava (`pohyb` vrstev): dýchá, při otočce se nadnese,
 * v póze se maličko ukloní; v dřímotě (průvodce, `vstup.spi`) trochu klesne
 * a pomalu pokyvuje, při úkloně (`vstup.uklon`) se k zemi přikrčí.
 */
const figura = (d, p, t) => ({
  x: 0,
  y: 0.7 * Math.sin(t * 1.5) - 2.6 * p.vzlet + d.spi * (1.2 + Math.sin(t * 1.1)) + 3.6 * d.uklon,
  r: 1.6 * p.ukaz - 1.2 * d.stydi + 0.5 * Math.sin(t * 0.8) + d.spi * 1.8 * Math.sin(t * 0.55),
  sy: 1 - 0.1 * d.uklon,
});
const krok = (dyn, t, dt, vstup) => {
  const R = dyn.nahoda;
  const volno = () => t - dyn.zmena > KONEC;
  /* průvodce: květy skutečného měsíce hned od začátku, bez otočky */
  if (typeof vstup.mesic === "number" && dyn.mesic !== vstup.mesic) {
    dyn.mesic = vstup.mesic;
    if (volno()) dyn.m = dyn.mPred = vstup.mesic;
  }
  /* průvodce: přidrží si vlasy, ovívá se, dřímá — plynule (`vstup` jen říká, co chce) */
  dyn.vlasy = kCili(dyn.vlasy, vstup.vlasy ? 1 : 0, dt, 0.16);
  dyn.ovivani = kCili(dyn.ovivani, vstup.ovivani ? 1 : 0, dt, 0.25);
  dyn.spi = kCili(dyn.spi, vstup.spi ? 1 : 0, dt, vstup.spi ? 1.2 : 0.15);
  dyn.uklon = kCili(dyn.uklon, vstup.uklon ? 1 : 0, dt, 0.18);
  dyn.vejir = kCili(dyn.vejir, vstup.vejir ? 1 : 0, dt, 0.14);
  /* průvodce: uzlík šátku se v ruce objeví a zase zmizí plynule; když do něj dopadne kus (`cuk` se zvětší), zhoupne se a klesne */
  const sat = vstup.satek;
  dyn.nese = kCili(dyn.nese, sat ? 1 : 0, dt, sat ? 0.13 : 0.1);
  if (sat) {
    dyn.satekVzor = sat.vzor;
    dyn.satekPocet = sat.pocet;
    const cuk = sat.cuk || 0;
    if (cuk > dyn.satekCuk && dyn.nese > 0.5) {
      dyn.satek.w += (dyn.satek.w >= 0 ? 1 : -1) * UZLIK.cuk.w;
      dyn.satekPero.v += UZLIK.cuk.v;
    }
    dyn.satekCuk = cuk;
  }
  if (vstup.kliky && vstup.kliky.length) {
    vstup.kliky.length = 0;
    if (volno()) zmen(dyn, t);
    else dyn.ceka = 1;
    dyn.dalsi = t + 12;
  }
  /* sama se za čas otočí jen tam, kde to nikomu nevadí — průvodce v rohu ne (`vstup.bezOtocek`) */
  if (volno() && (dyn.ceka || (!vstup.bezOtocek && t > dyn.dalsi))) {
    dyn.ceka = 0;
    zmen(dyn, t);
    dyn.dalsi = t + 10 + R() * 4;
  }
  const p = poza(dyn, t);
  /* mávnutí myší je vítr */
  let vm = 0;
  if (vstup.mys && dyn.mx != null && dt > 0) vm = clamp(((vstup.mys.x - dyn.mx) / dt / 90) * (vstup.vitrMysi ?? 1), -3, 3);
  /* v letu ji ofukuje protivítr */
  if (vstup.vitr) vm = clamp(vm + vstup.vitr, -3, 3);
  dyn.mx = vstup.mys ? vstup.mys.x : null;
  dyn.vitr = kCili(dyn.vitr, vm, dt, 0.1);
  /* kurzor na tváři: schová se za vějíř — nebo když řekne něco výrazem `stydi` */
  const uTvare = !p.toci && p.ukaz < 0.05 && !!vstup.mys && Math.hypot(vstup.mys.x - TVAR0[0], vstup.mys.y - TVAR0[1]) < 21;
  dyn.uTvare = uTvare ? dyn.uTvare + dt : 0;
  const stydiPred = dyn.stydi;
  const styd = dyn.uTvare > 0.35 || (vstup.vyraz === "stydi" && !p.toci);
  dyn.stydi = kCili(dyn.stydi, styd ? 1 : 0, dt, styd ? 0.1 : 0.22);
  if (pres(stydiPred, dyn.stydi, 0.5)) {
    dyn.zvuk.push({ druh: "vejir", sila: 0.6, pan: 0.15 });
    dyn.zvuk.push({ druh: "smich", sila: 0.6, pan: 0, za: 0.18 });
  }
  /* všechno, co na ní visí, jde za ní se zpožděním */
  const vitr = dyn.vitr;
  dyn.snury.forEach((q, i) => kyvadlo(q, kanzashiStred(p.yaw)[0], dt, { g: 52 + i * 9, c: 1.5 + i * 0.25, L: 17 + i * 2, vitr: vitr * (9 + i * 2) }));
  kyvadlo(dyn.rukavy.L, p.L.H[0], dt, { g: 30, c: 2.6, L: 26, vitr: vitr * 4 });
  kyvadlo(dyn.rukavy.P, p.Pr.H[0], dt, { g: 30, c: 2.6, L: 26, vitr: vitr * 4 });
  kyvadlo(dyn.masle, VAZ.cx + (polomer(122) + 1.5) * Math.sin(rad(180 + p.yaw)), dt, { g: 26, c: 2.2, L: 30, vitr: vitr * 3 });
  kyvadlo(dyn.vetev, 0, dt, { g: 46, c: 2.4, L: 30, vitr: vitr * 5 + (p.toci ? 9 * Math.sin(rad(p.yaw)) : 0) });
  /* lucerna průvodce visí ze špičky tyčky v levé ruce — tu hýbe otočka i vítr */
  const lx = p.L.H[0];
  kyvadlo(dyn.lucerna, lx + clamp((lx - VAZ.cx) / 20, -1, 1) * 11, dt, { g: 44, c: 2.4, L: 12, vitr: vitr * 4 });
  /* uzlík šátku visí z pravé dlaně: těžší a pomalejší než lucerna; pružina ho po dopadu kusu zhoupne dolů a zpátky */
  kyvadlo(dyn.satek, p.Pr.H[0], dt, { g: 26, c: 2.3, L: 18, vitr: vitr * 3 });
  const pero = dyn.satekPero;
  if (dt > 0) {
    pero.v += (-UZLIK.pero.k * pero.y - UZLIK.pero.c * pero.v) * dt;
    pero.y += pero.v * dt;
  }
  dyn.satekBod = bodUzliku(dyn, p, t);
  /* průvodce svůj snímek počítá obvykle dřív než kresba — ať jeho odkaz s počtem sedí na uzlíku už v tomhle snímku, ne až v dalším */
  if (typeof vstup.uzlikJe === "function") vstup.uzlikJe(dyn.satekBod);
  /* plíšky na šňůrách cinknou, když se rozhoupou */
  const nej = Math.max(...dyn.snury.map((q) => Math.abs(q.w)));
  if (nej > 3 && dyn.nejPred <= 3 && t - dyn.cinkl > 0.2) {
    dyn.cinkl = t;
    dyn.zvuk.push({ druh: "cink", vys: Math.floor(R() * 6), sila: clamp(nej / 8, 0.25, 0.9), pan: -0.25 });
  }
  dyn.nejPred = nej;
  /* lístky: sem tam jeden upadne; při otočce odlétají do stran */
  dyn.akum += dt * (p.toci ? 9 : 0.5 + Math.abs(vitr) * 1.6);
  while (dyn.akum >= 1) {
    dyn.akum -= 1;
    const [x, y] = kvetVetve(Math.floor(R() * KVETY_VETVE.length));
    const m = p.u < PUL && p.u >= 0 ? dyn.mPred : dyn.m;
    if (p.toci) novyListek(dyn, 90 + (R() - 0.5) * 50, 60 + R() * 60, (R() < 0.5 ? -1 : 1) * (26 + R() * 30), -8 - R() * 14, m, 2.2);
    else novyListek(dyn, x, y, vitr * 14 + (R() - 0.5) * 5, 2 + R() * 3, m);
  }
  for (const l of dyn.listky) {
    l.vek += dt;
    l.vx += (vitr * 16 - l.vx * 1.5) * dt;
    l.vy += (11 - l.vy) * dt * 1.4;
    l.x += (l.vx + Math.sin(l.vek * 2.6 + l.fz) * 7) * dt;
    l.y += l.vy * dt;
    l.rot += l.vr * dt;
  }
  dyn.listky = dyn.listky.filter((l) => l.vek < l.zivot && l.y < ZEM + 3);
  /* pohled za kurzorem */
  const kam = vstup.mys && !p.toci ? [clamp((vstup.mys.x - TVAR0[0]) / 34, -1, 1) * 1.9, clamp((vstup.mys.y - TVAR0[1]) / 34, -1, 1) * 1.3] : vstup.pohled && !p.toci ? vstup.pohled : [0, 0];
  dyn.pohled = dyn.pohled.map((v, i) => kCili(v, kam[i], dt, 0.12));
};
const stav = (t, vstup = {}, dyn) => {
  const d = dyn || novaDynamika();
  const p = poza(d, t);
  const u = p.u;
  const bezi = u >= 0 && u < KONEC;
  /* květy na ní: staré zvadnou hned, nové vyraší, až když je zády */
  const mKvety = bezi && u < PUL ? d.mPred : d.m;
  const rust = !bezi ? 1 : u < PUL ? clamp(1 - u / 0.4) : clamp((u - PUL) / 0.95);
  /* kruh: starý během malování nového vybledne */
  const kp = !bezi ? 1 : clamp((u - K0) / KT);
  const maluje = bezi && u < K0 + KT;
  let vyraz = "klid";
  if (p.toci) vyraz = "usmev";
  else if (vstup.vyraz) vyraz = vstup.vyraz;
  else if (p.ukaz > 0.3) vyraz = "mrk";
  else if (d.stydi > 0.4) vyraz = "stydi";
  else if (d.spi > 0.5 || d.uklon > 0.5) vyraz = "klid";
  else if (vstup.mys) vyraz = "kouka";
  return {
    t, u, yaw: p.yaw % 360, vyraz, mKvety, rust, mTelo: mKvety,
    kruh: { m: maluje ? d.mPred : d.m, novy: d.m, p: maluje ? kp * kp * (3 - 2 * kp) : 1, op: maluje ? 1 - smooth(u / 0.6) : 1 },
    kvetRoku: { m: bezi && u < K0 ? d.mPred : d.m, k: !bezi ? 1 : u < K0 ? 1 - smooth(u / K0) : dosed((u - K0) / 0.55) },
    ruce: { L: { ...p.L, kyv: deg(d.rukavy.L.a) }, P: { ...p.Pr, kyv: deg(d.rukavy.P.a) } },
    vejir: p.vejir,
    kyv: { snury: d.snury.map((q) => deg(q.a)), masle: d.masle.a, vetev: deg(d.vetev.a) * 0.5, lucerna: deg(d.lucerna.a) },
    lucerna: !!vstup.lucerna,
    listky: d.listky, pohled: d.pohled, spi: d.spi,
    fig: figura(d, p, t),
    satek: uzlikVeStavu(d),
    mrk: mrkani(t, [1.9, 5.2, 5.45, 8.8], 10.2),
    zare: 0.8 + 0.12 * Math.sin(t * 0.9) + (maluje ? 0.25 * Math.sin(Math.PI * kp) : 0),
  };
};
const snimek = (st) => Math.floor(st.t * 30);
const pohyb = (st) => ({ x: st.fig.x, y: st.fig.y, r: st.fig.r, sy: st.fig.sy, ox: VAZ.cx, oy: ZEM });
const kvetyKlic = (st) => `${yawQ(st)},${st.mKvety},${Math.round(st.rust * 40)}`;

export const kamiKvety = {
  id: "kvety",
  viewBox: "0 0 180 180",
  defs,
  novaDynamika,
  krok,
  stav,
  hukot: () => ({ vitr: 0.06 }),
  klidne: { t: 3 },
  vrstvy: [
    { id: "zare", kresli: () => `<circle cx="${C[0]}" cy="${C[1]}" r="96" fill="url(#${ID}-zare)"/>`, pruhlednost: (st) => f(clamp(st.zare)) },
    { id: "kruh", kresli: vrstvaKruh, klic: (st) => st.kruh.m, pruhlednost: (st) => f(st.kruh.op) },
    { id: "kruh-zivy", kresli: vrstvaKruhZivy, klic: (st) => (st.kruh.p < 1 ? snimek(st) : -1) },
    { id: "kvet-roku", kresli: vrstvaKvetRoku, klic: (st) => `${st.kvetRoku.m},${Math.round(st.kvetRoku.k * 50)}` },
    { id: "stin", kresli: () => vPostave(vazStin(VAZ.cx, { rx: 31 })) },
    { id: "za", kresli: (st) => vPostave(vazZa(ID, kusy(st))), klic: (st) => `${kvetyKlic(st)},${Math.round(st.kyv.masle * 30)}`, pohyb },
    { id: "rukavy-za", kresli: vrstvaRukavy(true), klic: (st) => `${klicRukavu(kusy(st))},${st.mTelo}`, pohyb },
    { id: "okobo", kresli: (st) => vPostave(vazBoty(ID, kusy(st))), klic: yawQ },
    { id: "vetvicka", kresli: (st) => vPostave(vazVetvicka(ID, st.mKvety, { kyv: st.kyv.vetev, rust: st.rust })), klic: (st) => `${st.mKvety},${Math.round(st.rust * 40)},${Math.round(st.kyv.vetev * 4)}`, pohyb },
    { id: "telo", kresli: (st) => vPostave(vazTelo(ID, { yaw: st.yaw, listky: MESICE[st.mTelo].listB[1], listky2: MESICE[st.mTelo].listB[0] })), klic: (st) => `${yawQ(st)},${st.mTelo}`, pohyb },
    { id: "tvar", kresli: (st) => vPostave(vazTvarNa(ID, st.yaw, { dx: st.pohled[0], dy: st.pohled[1], mrk: st.mrk, vyraz: st.vyraz })), klic: (st) => `${f(st.pohled[0])},${f(st.pohled[1])},${f(st.mrk)},${st.vyraz},${yawQ(st)}`, pohyb },
    { id: "pred", kresli: (st) => vPostave(vazPred(ID, kusy(st))), klic: (st) => `${kvetyKlic(st)},${Math.round(st.kyv.masle * 30)}`, pohyb },
    { id: "snury", kresli: (st) => vPostave(vazSnury(ID, st.mKvety, { yaw: st.yaw, kyv: st.kyv.snury, rust: st.rust })), klic: (st) => `${kvetyKlic(st)},${st.kyv.snury.map((a) => Math.round(a * 2)).join(",")}`, pohyb },
    { id: "rukavy-pred", kresli: vrstvaRukavy(false), klic: (st) => `${klicRukavu(kusy(st))},${st.mTelo}`, pohyb },
    { id: "listky", kresli: vrstvaListky, klic: (st) => (st.listky.length ? snimek(st) : -1) },
  ],
};

/*
 * Kami v letu — tatáž Vázička bez kruhu, záře a stínu na zemi. Létá po úvodu
 * Domku 2 a schovává se za strom, dům a do trávy (scripts/domek2/let-kami.ts);
 * natočení (`dyn.otoc`), protivítr (`vstup.vitr`) a pohled (`vstup.pohled`)
 * jí dává let. Id jsou stejná jako u 01 Kami (vg1-), takže obě podoby nesmí
 * stát na jedné stránce.
 */
const BEZ_KRUHU = new Set(["zare", "kruh", "kruh-zivy", "kvet-roku", "stin"]);
export const kamiLet = { ...kamiKvety, id: "let", vrstvy: kamiKvety.vrstvy.filter((v) => !BEZ_KRUHU.has(v.id)) };

/*
 * Průvodce — tatáž podoba v letu, jen s vlastními id (vgp- místo vg1-).
 * Sedí v rohu každé stránky (scripts/parta2/pruvodce.ts), takže se potká
 * s jinými Vázičkami: na KAMI partě s 01 Kami v obsazení. Se stejnými id
 * by si tělo vzalo bílou z cizí kresby, a když je ta ve schovaném listu,
 * zůstalo by průhledné. Id se přepíšou v hotovém textu kresby.
 */
const naPruvodce = (s) => (typeof s === "string" ? s.replaceAll("vg1-", "vgp-") : s);

/*
 * Lucerna průvodce. Když má host v hlavičce noc (`vstup.lucerna`), nese
 * Vázička v levé ruce krátkou bambusovou tyčku a na její špičce papírový
 * čóčin — kyvadlo jako šňůry kanzashi, takže se houpe s větrem i s otočkou.
 * Za ní svítí teplá záře. Lucerna je ve vrstvách dvakrát: za tělem, když
 * má levou ruku za zády, jinak před ním.
 */
/** Špička tyčky: od ruky šikmo ven a nahoru (zepředu se tyčka zkrátí) */
const hrotTycky = (st) => {
  const [x, y] = st.ruce.L.H;
  return [x + clamp((x - VAZ.cx) / 20, -1, 1) * 11, y - 8];
};
/** Čóčin visí ze špičky (0, 0): drátek, soudek se žebry, lakované obruče, rumělkový střapec */
const CHOCHIN =
  `<path d="M0 0 V3" stroke="#3A3028" stroke-width="0.7"/>` +
  `<ellipse cx="0" cy="12.5" rx="7" ry="9.5" fill="url(#${ID}-chochin)" stroke="#9A5A2C" stroke-width="0.7"/>` +
  `<path d="M-6.6 9 Q0 10.4 6.6 9 M-7 12.5 Q0 14 7 12.5 M-6.6 16 Q0 17.4 6.6 16" stroke="#DE9440" stroke-width="0.45" fill="none" opacity="0.75"/>` +
  `<circle cx="0" cy="12.5" r="1.7" fill="#C4432B" opacity="0.85"/>` +
  `<rect x="-4.6" y="2.6" width="9.2" height="2.2" rx="1" fill="#231E24"/>` +
  `<rect x="-4.6" y="20.2" width="9.2" height="2.2" rx="1" fill="#231E24"/>` +
  `<path d="M0 22.4 V24.6" stroke="#8E2A1C" stroke-width="0.8" stroke-linecap="round"/>` +
  `<path d="M-1 24.6 L-1.8 28.6 Q0 29.4 1.8 28.6 L1 24.6 Z" fill="#C4432B" stroke="#8E2A1C" stroke-width="0.4" stroke-linejoin="round"/>`;
const vrstvaLucerna = (za) => (st) => {
  if (!st.lucerna || !!st.ruce.L.za !== za) return "";
  const H = st.ruce.L.H, T = hrotTycky(st);
  return vPostave(
    `<path d="M${pt(H)} L${pt(T)}" stroke="#3A3028" stroke-width="2.6" stroke-linecap="round"/>` +
      `<path d="M${pt(H)} L${pt(T)}" stroke="#C9A060" stroke-width="1.5" stroke-linecap="round"/>` +
      `<g transform="translate(${pt(T)}) rotate(${f(-st.kyv.lucerna)})">${CHOCHIN}</g>`,
  );
};
/** Záře za celou postavou, kolem soudku lucerny */
const vrstvaLucernaZare = (st) => {
  if (!st.lucerna) return "";
  const T = hrotTycky(st), a = rad(st.kyv.lucerna);
  return vPostave(`<circle cx="${f(T[0] + 12.5 * Math.sin(a))}" cy="${f(T[1] + 12.5 * Math.cos(a))}" r="30" fill="url(#${ID}-chochin-zare)"/>`);
};
const klicLucerny = (st) => (st.lucerna ? `${Math.round(st.ruce.L.H[0] * 2)},${Math.round(st.ruce.L.H[1] * 2)},${Math.round(st.kyv.lucerna * 2)},${st.ruce.L.za ? 1 : 0}` : "-");
/** Vrstvy průvodce s lucernou: záře před vším, co je za tělem, lucerna za zády po zadním rukávu, před tělem po předním */
const sLucernou = (vrstvy) =>
  vrstvy.flatMap((v) =>
    v.id === "za"
      ? [{ id: "lucerna-zare", kresli: vrstvaLucernaZare, klic: klicLucerny, pohyb }, v]
      : v.id === "rukavy-za"
        ? [v, { id: "lucerna-za", kresli: vrstvaLucerna(true), klic: klicLucerny, pohyb }]
        : v.id === "rukavy-pred"
          ? [v, { id: "lucerna", kresli: vrstvaLucerna(false), klic: klicLucerny, pohyb }]
          : [v],
  );

/*
 * Šátek průvodce. Co si host v krámku vybral, to mu Vázička nese v uzlíku
 * furoshiki (`vstup.satek` = { vzor, pocet, cuk }, scripts/parta2/pruvodce.ts):
 * otsukai-tsutsumi — oblé tělo, nahoře uzel se dvěma oušky, za který ho
 * svírá v pravé dlani. Látka má vzor, který si host vybral u šátku
 * (data/furoshiki.ts), na ouškách vykukuje rub. Visí z dlaně jako kyvadlo,
 * takže ho rozhoupe otočka i vítr; když do něj dopadne kus (`cuk` se
 * zvětší), zhoupne se a pod tíhou klesne. S víc kusy je maličko plnější.
 * Ve vrstvách je dvakrát jako lucerna: za tělem, když má pravou ruku za
 * zády, jinak před ním — i s dlaní, která ho svírá. Číslo se nekreslí: je to
 * odznak v HTML (pruvodce.ts), který se každý snímek posune na uzlík
 * (`dyn.satekBod`, po kroku ho kresba pošle i do `vstup.uzlikJe`).
 */
/** Uzlík v souřadnicích postavy (počátek v dlani): střed těla pod dlaní, poloměr, velikost (s víc kusy roste), dopad kusu a pružina */
const UZLIK = {
  stred: 20,
  r: 22.5,
  vel: (n) => 1.15 * (1 + 0.05 * clamp((n || 1) - 1, 0, 4)),
  cuk: { w: 1.5, v: 48 },
  pero: { k: 180, c: 11 },
};
/** Jak velký a natočený je vzor na látce; čáry vzoru jsou zesílené, ať je vzor poznat i v rohu */
const SATEK_VZOR = { meritko: { seigaiha: 0.42, asanoha: 0.4, shippo: 0.42, kikko: 0.42, yagasuri: 0.5 }, otoceni: -14, cary: 1.8 };
const tucneCary = (s, k) => s.replace(/stroke-width="([\d.]+)"/g, (_, w) => `stroke-width="${f(Number(w) * k)}"`);
const satekDefs = () =>
  vzory.map((v) => `<pattern id="${ID}-satek-${v.id}" width="${v.w}" height="${v.h}" patternUnits="userSpaceOnUse" patternTransform="rotate(${SATEK_VZOR.otoceni}) scale(${SATEK_VZOR.meritko[v.id] ?? 0.42})">${tucneCary(vzorPattern(v), SATEK_VZOR.cary)}</pattern>`).join("") +
  /* měkké světlo zleva shora a stín vpravo dole, přes každý kus látky zvlášť */
  `<radialGradient id="${ID}-satek-svetlo" cx="0.34" cy="0.3" r="0.8"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.34"/><stop offset="0.42" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="0.76" stop-color="#1E1626" stop-opacity="0.1"/><stop offset="1" stop-color="#1E1626" stop-opacity="0.38"/></radialGradient>`;
/* tělo: úzké hrdlo pod uzlem, dole kulaté a plné; sklady se sbíhají k uzlu */
const UZLIK_TELO = "M-4.4 3.6 C-11 5.2 -21.8 10.6 -22.4 20.6 C-23 30.4 -13.6 36.4 0 36.4 C13.6 36.4 23 30.4 22.4 20.6 C21.8 10.6 11 5.2 4.4 3.6 Q0 2.4 -4.4 3.6 Z";
const UZLIK_SKLADY = "M-3 4.6 C-8 9 -13 14 -16.4 22.5 M3 4.6 C8 9 13 14 16.4 22.5 M-1 5 C-2.4 11 -3.4 17 -3.8 24 M1 5 C2.2 10 3.2 15.4 3.6 21";
/* ouška: dva svázané cípy trčí zpoza dlaně šikmo nahoru; vnitřní půlka každého je rub látky */
const UZLIK_OUSKA = [
  { d: "M-1.2 2.6 C-3.6 -2.4 -9 -8.4 -15.2 -10.2 C-14 -5.4 -10.6 -0.6 -4.6 5.2 Z", rub: "M-15.2 -10.2 C-14 -5.4 -10.6 -0.6 -4.6 5.2 L-2.6 3.6 C-6.4 -0.8 -10.6 -5.6 -15.2 -10.2 Z" },
  { d: "M1.2 2.6 C3.8 -2.8 9.4 -9 14.8 -11 C14 -6 10.8 -0.8 4.6 5.2 Z", rub: "M14.8 -11 C14 -6 10.8 -0.8 4.6 5.2 L2.6 3.6 C6.6 -1 10.4 -6 14.8 -11 Z" },
];
/** Uzlík visí z dlaně `H`: tělo se vzorem, sklady, světlo, ouška s rubem, uzel (dlaň a vějíř přes něj kreslí vrstva) */
const uzlik = (H, s) => {
  const v = vzorPodleId(s.vzor) ?? vzory[0];
  const { rub, lem } = v.barva;
  const latka = `url(#${ID}-satek-${v.id})`, svetlo = `url(#${ID}-satek-svetlo)`;
  const obrys = `stroke="${lem}" stroke-width="1.1" stroke-linejoin="round"`;
  let u =
    `<g transform="translate(0 ${f(s.pero)})">` +
    `<path d="${UZLIK_TELO}" fill="${latka}" ${obrys}/>` +
    `<path d="${UZLIK_SKLADY}" stroke="${lem}" stroke-width="0.9" stroke-linecap="round" fill="none" opacity="0.55"/>` +
    `<path d="${UZLIK_TELO}" fill="${svetlo}"/>` +
    `<path d="M-16.6 11.6 C-20.4 15.4 -21 21 -19.6 26.4" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round" fill="none" opacity="0.3"/>` +
    /* uzel vrhá na hrdlo měkký stín */
    `<ellipse cx="0" cy="8.4" rx="7.4" ry="2.6" fill="#1E1626" opacity="0.22"/>` +
    `</g>`;
  for (const o of UZLIK_OUSKA) u += `<path d="${o.d}" fill="${latka}" ${obrys}/><path d="${o.rub}" fill="${rub}" stroke="${lem}" stroke-width="0.6" stroke-linejoin="round"/><path d="${o.d}" fill="${svetlo}"/>`;
  /* uzel vykukuje pod dlaní */
  u += `<ellipse cx="0" cy="4.6" rx="5.4" ry="3.8" fill="${latka}" ${obrys}/><ellipse cx="0" cy="4.6" rx="5.4" ry="3.8" fill="${svetlo}"/>`;
  return `<g transform="translate(${pt(H)}) rotate(${f(-s.kyv)}) scale(${f(s.k * s.vel)})">${u}</g>`;
};
/** Rozevřený vějíř je v ruce před uzlíkem (ovívá se, schovává se za něj, póza po otočce) — kreslí se znovu přes uzlík, zavřený zůstane za ním */
const VEJIR_PRED_UZLIKEM = 0.25;
/** Uzlík pro kreslení: dokud ho drží, i když zrovna mizí; `k` ho nafoukne s překmitem */
const uzlikVeStavu = (d) =>
  d.nese > 0.02 && d.satekVzor
    ? { vzor: d.satekVzor, pocet: d.satekPocet, k: dosed(clamp(d.nese / 0.92)), vel: UZLIK.vel(d.satekPocet), kyv: deg(d.satek.a), pero: d.satekPero.y }
    : null;
/** Střed uzlíku na plátně 180 × 180 i s tím, jak se hýbe celá postava, a jeho poloměr — podle toho pruvodce.ts posouvá odkaz s počtem */
const bodUzliku = (d, p, t) => {
  const vel = UZLIK.vel(d.satekPocet), a = d.satek.a;
  const l = (UZLIK.stred + d.satekPero.y) * vel;
  const [x, y] = naPlatno([p.Pr.H[0] + l * Math.sin(a), p.Pr.H[1] + l * Math.cos(a)]);
  const g = figura(d, p, t), u = rad(g.r);
  const dx = x - VAZ.cx, dy = (y - ZEM) * g.sy;
  return [f(VAZ.cx + g.x + dx * Math.cos(u) - dy * Math.sin(u)), f(ZEM + g.y + dx * Math.sin(u) + dy * Math.cos(u)), f(UZLIK.r * vel * K)];
};
/* uzlík, přes něj rozevřený vějíř a nakonec dlaň, která obojí svírá */
const vrstvaSatek = (za) => (st) => {
  if (!st.satek || !!st.ruce.P.za !== za) return "";
  const H = st.ruce.P.H, v = st.vejir;
  return vPostave(uzlik(H, st.satek) + (v.otevreni > VEJIR_PRED_UZLIKEM ? vazVejir(ID, H, v.smer, v.otevreni) : "") + vazRuka(ID, H));
};
const klicSatku = (st) =>
  st.satek
    ? `${st.satek.vzor},${st.satek.pocet},${Math.round(st.ruce.P.H[0] * 2)},${Math.round(st.ruce.P.H[1] * 2)},${Math.round(st.satek.kyv * 2)},${Math.round(st.satek.k * 40)},${Math.round(st.satek.pero * 5)},${st.ruce.P.za ? 1 : 0}` +
      (st.vejir.otevreni > VEJIR_PRED_UZLIKEM ? `,${Math.round(st.vejir.smer)},${Math.round(st.vejir.otevreni * 40)}` : "")
    : "-";
/** Vrstvy průvodce s uzlíkem: za zády hned po lucerně za zády, před tělem po lucerně vepředu */
const sSatkem = (vrstvy) =>
  vrstvy.flatMap((v) =>
    v.id === "lucerna-za"
      ? [v, { id: "satek-za", kresli: vrstvaSatek(true), klic: klicSatku, pohyb }]
      : v.id === "lucerna"
        ? [v, { id: "satek", kresli: vrstvaSatek(false), klic: klicSatku, pohyb }]
        : [v],
  );
/* Dřímá (průvodce, `vstup.spi`): víčka má sklopená i vzhůru, tak nad hlavou stoupají dvě tušová „z“ */
const vrstvaSpanek = (st) => {
  if (st.spi < 0.6) return "";
  let s = "";
  for (let i = 0; i < 2; i++) {
    const q = (st.t * 0.32 + i * 0.5) % 1;
    const x = 116 + q * 11 + i * 2, y = 60 - q * 24, r = 2.6 + q * 2.4;
    const op = clamp(Math.min(q / 0.2, (1 - q) / 0.35)) * clamp((st.spi - 0.6) / 0.3);
    s += `<path d="M${f(x - r)} ${f(y - r)} H${f(x + r)} L${f(x - r)} ${f(y + r)} H${f(x + r)}" stroke="#4A3F55" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="${f(op)}"/>`;
  }
  return s;
};
const proPruvodce = (vrstvy) =>
  [...sSatkem(sLucernou(vrstvy)), { id: "spanek", kresli: vrstvaSpanek, klic: (st) => (st.spi > 0.6 ? snimek(st) : -1) }].map((v) => ({ ...v, kresli: (st) => naPruvodce(v.kresli(st)) }));

export const kamiPruvodce = {
  ...kamiLet,
  id: "pruvodce",
  defs: () => naPruvodce(kamiLet.defs() + satekDefs()),
  vrstvy: proPruvodce(kamiLet.vrstvy),
};

/*
 * Průvodce pro mistra (kdo má mistrovský list z /zkouska): Kami podoba
 * i s kruhem dvanácti květů a květem měsíce v mezeře za zády — bez záře
 * a bez světla kolem květu (17. 10. obojí vypnuté na přání) a bez stínu na
 * zemi, protože létá. Ostatní hosté ji vidí bez kruhu.
 */
const BEZ_ZARE = new Set(["zare", "stin"]);
export const kamiPruvodceMistr = {
  ...kamiKvety,
  id: "pruvodce-mistr",
  defs: () => naPruvodce(kamiKvety.defs() + satekDefs()),
  vrstvy: proPruvodce(
    kamiKvety.vrstvy
      .filter((v) => !BEZ_ZARE.has(v.id))
      .map((v) => (v.id === "kvet-roku" ? { ...v, kresli: (st) => vrstvaKvetRoku(st, { svit: false }) } : v)),
  ),
};
