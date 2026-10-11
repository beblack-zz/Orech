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
 */
import {
  f, rng, clamp, lerp, smooth, rad, deg, mix, pt, kCili, pres, dosed, mrkani, kyvadlo, noveKyvadlo,
  VAZ, DEN, MESICE, KVETY_VETVE, polomer, vazDefs, kvetyDefs, vazTelo, vazTvarNa, vazSnury, vazVetvicka,
  vazZa, vazPred, vazBoty, vazRukavy, klicRukavu, vazStin, kanzashiStred, kvet, listek,
} from "./spolecne.js";

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
/* květ měsíce v mezeře: svítí jako měsíc v logu */
const vrstvaKvetRoku = (st) => {
  const { m, k } = st.kvetRoku;
  if (k < 0.02) return "";
  const u = rad(uhelMesice(m));
  const x = C[0] + Math.cos(u) * (RK + 1.5), y = C[1] + Math.sin(u) * (RK + 1.5);
  return (
    `<circle cx="${f(x)}" cy="${f(y)}" r="${f(17 * k)}" fill="url(#${ID}-svit)"/>` +
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
  `<radialGradient id="${ID}-svit"><stop offset="0" stop-color="#FFF6DA" stop-opacity="0.95"/><stop offset="0.45" stop-color="#FFE7A3" stop-opacity="0.45"/><stop offset="1" stop-color="#FFE7A3" stop-opacity="0"/></radialGradient>`;

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
  dyn.m = (dyn.m + 1) % 12;
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
});
/** Póza v čase: natočení, kde má ruce, co dělá vějíř. Čistá funkce času a `dyn`. */
const poza = (d, t) => {
  const u = t - d.zmena;
  const toci = u >= 0 && u < TOC;
  const q = toci ? u / TOC : 0;
  const yaw = toci ? 360 * q * q * (3 - 2 * q) : 0;
  const vzlet = toci ? Math.sin(Math.PI * q) : 0;
  const v = u - TOC;
  const ukaz = v < 0 || v > POZA + 0.6 ? 0 : smooth(v / 0.2) * (1 - smooth((v - POZA) / 0.5));
  const ruka = (str) => {
    const w = rad(str * 90 + yaw), r = 40 + 8 * vzlet;
    return { H: [VAZ.cx + r * Math.sin(w), 117 - 6 * vzlet], za: Math.cos(w) < -0.15 };
  };
  const L = ruka(-1), Pr = ruka(1);
  const sm = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
  L.H = sm(L.H, [47, 112], ukaz);
  Pr.H = sm(sm(Pr.H, [134, 83], ukaz), [108, 124], d.stydi);
  return {
    u, toci, yaw, vzlet, ukaz, L, Pr,
    vejir: { smer: lerp(lerp(78, -62, ukaz), -125, d.stydi), otevreni: Math.max(dosed(ukaz), 0.86 * d.stydi) },
  };
};
const krok = (dyn, t, dt, vstup) => {
  const R = dyn.nahoda;
  const volno = () => t - dyn.zmena > KONEC;
  if (vstup.kliky && vstup.kliky.length) {
    vstup.kliky.length = 0;
    if (volno()) zmen(dyn, t);
    else dyn.ceka = 1;
    dyn.dalsi = t + 12;
  }
  if (volno() && (dyn.ceka || t > dyn.dalsi)) {
    dyn.ceka = 0;
    zmen(dyn, t);
    dyn.dalsi = t + 10 + R() * 4;
  }
  const p = poza(dyn, t);
  /* mávnutí myší je vítr */
  let vm = 0;
  if (vstup.mys && dyn.mx != null && dt > 0) vm = clamp((vstup.mys.x - dyn.mx) / dt / 90, -3, 3);
  dyn.mx = vstup.mys ? vstup.mys.x : null;
  dyn.vitr = kCili(dyn.vitr, vm, dt, 0.1);
  /* kurzor na tváři: schová se za vějíř */
  const uTvare = !p.toci && p.ukaz < 0.05 && !!vstup.mys && Math.hypot(vstup.mys.x - TVAR0[0], vstup.mys.y - TVAR0[1]) < 21;
  dyn.uTvare = uTvare ? dyn.uTvare + dt : 0;
  const stydiPred = dyn.stydi;
  dyn.stydi = kCili(dyn.stydi, dyn.uTvare > 0.35 ? 1 : 0, dt, dyn.uTvare > 0.35 ? 0.1 : 0.22);
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
  const kam = vstup.mys && !p.toci ? [clamp((vstup.mys.x - TVAR0[0]) / 34, -1, 1) * 1.9, clamp((vstup.mys.y - TVAR0[1]) / 34, -1, 1) * 1.3] : [0, 0];
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
  else if (p.ukaz > 0.3) vyraz = "mrk";
  else if (d.stydi > 0.4) vyraz = "stydi";
  else if (vstup.mys) vyraz = "kouka";
  return {
    t, u, yaw: p.yaw % 360, vyraz, mKvety, rust, mTelo: mKvety,
    kruh: { m: maluje ? d.mPred : d.m, novy: d.m, p: maluje ? kp * kp * (3 - 2 * kp) : 1, op: maluje ? 1 - smooth(u / 0.6) : 1 },
    kvetRoku: { m: bezi && u < K0 ? d.mPred : d.m, k: !bezi ? 1 : u < K0 ? 1 - smooth(u / K0) : dosed((u - K0) / 0.55) },
    ruce: { L: { ...p.L, kyv: deg(d.rukavy.L.a) }, P: { ...p.Pr, kyv: deg(d.rukavy.P.a) } },
    vejir: p.vejir,
    kyv: { snury: d.snury.map((q) => deg(q.a)), masle: d.masle.a, vetev: deg(d.vetev.a) * 0.5 },
    listky: d.listky, pohled: d.pohled,
    /* dýchá, při otočce se nadnese, v póze se maličko ukloní */
    fig: { x: 0, y: 0.7 * Math.sin(t * 1.5) - 2.6 * p.vzlet, r: 1.6 * p.ukaz - 1.2 * d.stydi + 0.5 * Math.sin(t * 0.8) },
    mrk: mrkani(t, [1.9, 5.2, 5.45, 8.8], 10.2),
    zare: 0.8 + 0.12 * Math.sin(t * 0.9) + (maluje ? 0.25 * Math.sin(Math.PI * kp) : 0),
  };
};
const snimek = (st) => Math.floor(st.t * 30);
const pohyb = (st) => ({ x: st.fig.x, y: st.fig.y, r: st.fig.r, ox: VAZ.cx, oy: ZEM });
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
