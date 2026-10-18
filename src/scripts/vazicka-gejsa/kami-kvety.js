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
 * pošle i do `vstup.uzlikJe`, když ho průvodce dal. S `druh: "velky"` je to
 * druhá verze: uzlík skoro tak velký jako ona nese pod sebou, pořád letí
 * a vějíř ji ovívá sám (Velký uzlík níž); `vstup.satek.lek` = kolikrát
 * se s ním lekla.
 */
import {
  f, rng, clamp, lerp, smooth, rad, deg, mix, pt, kCili, pres, dosed, mrkani, kyvadlo, noveKyvadlo,
  VAZ, DEN, MESICE, KVETY_VETVE, polomer, vazDefs, kvetyDefs, vazTelo, vazTvarNa, vazSnury, vazVetvicka,
  vazZa, vazPred, vazBoty, vazRukavy, vazRuka, vazVejir, klicRukavu, vazStin, kanzashiStred, kvet, listek, PLATEK,
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
/** Póza pro společné kusy postavy. S velkým uzlíkem nemá vějíř v ruce — ruce má plné, vějíř ji ovívá sám (vrstva námahy). */
const kusy = (st) => ({ yaw: st.yaw, m: st.mKvety, rust: st.rust, kyv: st.kyv, ruce: st.ruce, vejir: st.velky ? null : st.vejir });
const vrstvaRukavy = (za) => (st) =>
  vPostave(st.velky ? rukavyVelkeho(st, za) : vazRukavy(ID, kusy(st), za, { listky: MESICE[st.mTelo].listB[1] }));
/**
 * Rukávy s velkým uzlíkem: rukáv vyrůstá z boku jako u malé verze — nahoře
 * začíná na obrysu vázy v hrotu, vnější hrana kopíruje její oblouk a od těla
 * se odkloní plynule až pod ramenem (žádná rovná hrana ani roh); nadloktí
 * jde dolů kousek vně obrysu a přes předek těla vede jen předloktí
 * k dlaním těsně nad uzlem — obi i vzor kimona zůstanou vidět. U lokte visí
 * krátký vak, u zápěstí svítí podšívka. Kreslí se tady (ne vazRukav), ať
 * jde po těle: střední čára po obrysu k lokti a obloukem k zápěstí, pás
 * s vnější a vnitřní šířkou zvlášť. Jde s postavou i s předklonem, takže se
 * od těla nikdy neodtrhne; dlaně jsou na uzlu.
 */
const RUKAV_VELKY = {
  /* výšky na obrysu (souřadnice postavy): kde rukáv začíná v hrotu, do kdy vnější hrana leží na obrysu, loket */
  vrch: 96, rameno: 106, loket: 127,
  /* o kolik je střed lokte vně obrysu */
  vne: 2.8,
  /* šířka dovnitř přes okraj těla u ramene, půlšířka u lokte a u zápěstí; vak u lokte */
  dovnitr: 2.8, loketW: 3.7, zapesti: 3, vak: { delka: 9, sirka: 3.2 },
};
const rukavVelky = (strana, H, k, listky) => {
  const R = RUKAV_VELKY, s = strana;
  const pul = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const k2 = (a, b, q) => [lerp(a[0], b[0], q), lerp(a[1], b[1], q)];
  const naObrysu = (y, o = 0) => [VAZ.cx + s * (polomer(y) + o), y];
  /* nadloktí: střed po obrysu, pod ramenem se plynule odkloní ven; šířky ven a dovnitř zvlášť (nahoře hrot) */
  const NAD = 12, PRED = 12, N = NAD + PRED;
  const stred = [], ven = [], dov = [];
  for (let i = 0; i <= NAD; i++) {
    const y = lerp(R.vrch, R.loket, i / NAD);
    const q = (y - R.vrch) / (R.loket - R.vrch), pod = smooth(clamp((y - R.rameno) / (R.loket - R.rameno)));
    stred.push(naObrysu(y, R.vne * pod));
    ven.push(lerp(0, R.loketW, pod) * smooth(clamp(q / 0.1)));
    dov.push(lerp(R.dovnitr * smooth(clamp(q / 0.45)), R.loketW, pod));
  }
  /* předloktí: z lokte obloukem k zápěstí, navazuje na směr nadloktí */
  const E = stred[NAD], t1 = [E[0] - stred[NAD - 1][0], E[1] - stred[NAD - 1][1]], d1 = Math.hypot(...t1) || 1;
  const Q2 = [E[0] + (t1[0] / d1) * 0.45 * Math.hypot(H[0] - E[0], H[1] - E[1]), E[1] + (t1[1] / d1) * 0.45 * Math.hypot(H[0] - E[0], H[1] - E[1])];
  const bez = (a, c, b, t) => [(1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1]];
  for (let j = 1; j <= PRED; j++) {
    stred.push(bez(E, Q2, H, j / PRED));
    const w = lerp(R.loketW, R.zapesti, j / PRED);
    ven.push(w);
    dov.push(w);
  }
  /* dokud uzlík přibývá, paže se teprve ohýbá: z rovného rukávu od ramene k dlani */
  const T = stred[0];
  const body = stred.map((P, i) => k2(k2(T, H, i / N), P, k));
  /* kolmice ven od těla (na stranu `strana`) */
  const kolmice = (i) => {
    const a = body[Math.max(0, i - 1)], b = body[Math.min(N, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
    return s > 0 ? [dy / d, -dx / d] : [-dy / d, dx / d];
  };
  const vne = [], dovnitr = [];
  body.forEach((P, i) => {
    const [nx, ny] = kolmice(i);
    vne.push([P[0] + nx * ven[i], P[1] + ny * ven[i]]);
    dovnitr.push([P[0] - nx * dov[i], P[1] - ny * dov[i]]);
  });
  /* hladce přes středy úseček; nahoře se obě hrany sejdou v hrotu na obrysu */
  const hladce = (b) => b.slice(1, -1).map((P, i) => `Q${pt(P)} ${pt(pul(P, b[i + 2]))}`).join(" ") + ` L${pt(b[b.length - 1])}`;
  const pas = `M${pt(vne[0])} ${hladce(vne)} L${pt(dovnitr[N])} ${hladce([...dovnitr].reverse())} Z`;
  let o = "";
  /* krátký vak furisode u lokte, vně těla (pod pásem) */
  if (k > 0.05) {
    const [ex, ey] = vne[NAD], dl = R.vak.delka * k, sr = R.vak.sirka;
    o += `<path d="M${f(ex - s * 0.6)} ${f(ey - 2)} Q${f(ex + s * (sr + 1.4))} ${f(ey + dl * 0.45)} ${f(ex + s * sr * 0.4)} ${f(ey + dl)} Q${f(ex - s * sr * 0.9)} ${f(ey + dl * 0.75)} ${f(ex - s * sr * 0.7)} ${f(ey + 2)} Z" fill="url(#${ID}-rukav)" stroke="${P.obrys}" stroke-width="1" stroke-linejoin="round"/>`;
    o += `<path d="${PLATEK}" transform="translate(${f(ex + s * sr * 0.2)} ${f(ey + dl * 0.78)}) rotate(${f(s * 20)}) scale(0.2)" fill="${listky}" opacity="0.85"/>`;
  }
  o += `<path d="${pas}" fill="url(#${ID}-rukav)" stroke="${P.obrys}" stroke-width="1" stroke-linejoin="round"/>`;
  /* podšívka u zápěstí: rumělkový proužek napříč rukávem */
  const iM = N - 2, [mx, my] = body[iM], [kx, ky] = kolmice(iM), wM = ven[iM] * 0.92;
  o += `<path d="M${f(mx + kx * wM)} ${f(my + ky * wM)} L${f(mx - kx * wM)} ${f(my - ky * wM)}" stroke="${P.limec}" stroke-width="1.6" stroke-linecap="round"/>`;
  return o + vazRuka(ID, H);
};
const rukavyVelkeho = (st, za) => {
  const o = kusy(st), k = st.velky.k, listky = MESICE[st.mTelo].listB[1];
  let s = "";
  for (const kdo of ["L", "P"]) {
    const r = o.ruce[kdo];
    if (!!r.za !== za) continue;
    s += rukavVelky(kdo === "L" ? -1 : 1, r.H, k, listky);
  }
  return s;
};
const klicRukavuVelkeho = (st) => (st.velky ? `,${Math.round(st.velky.k * 20)}` : "");
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
  satek: noveKyvadlo(), satekPero: { y: 0, v: 0 }, nese: 0, satekVzor: null, satekPocet: 0, satekCuk: 0, satekLek: 0, satekBod: null,
  /* velký uzlík (`vstup.satek.druh === "velky"`): jak moc ho má (0…1), kdy začalo kolo trápení a kde v něm byla minule, rána po dopadnutém kusu,
     natažení uzlíku (pružina), propad po dopadnutém kusu (pružina), kyvadlo, na kterém visí, a fáze mávání vějíře */
  velky: { k: 0, t0: 0, uPred: 0, rana: 0, pero: { y: 0, v: 0 }, klesani: { y: 0, v: 0 }, kyv: noveKyvadlo(), mava: 0 },
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
  /* velký uzlík: obě ruce svírají jeho uzel pod tělem, paže vedou před tělem (rukávy ve zkratce, viz rukavyVelkeho) — na gesta
     mu nezbývá žádná (vějíř ji ovívá sám); otočená zády má uzlík i ruce za sebou */
  const vk = d.velky ? d.velky.k : 0;
  if (vk > 0.001) {
    const nat = velkyPoza(d, t).natah;
    L.H = sm(L.H, [VELKY.ruceL[0], VELKY.ruceL[1] + nat], vk);
    Pr.H = sm(Pr.H, [VELKY.ruceP[0], VELKY.ruceP[1] + nat], vk);
    if (vk > 0.5) L.za = Pr.za = Math.cos(rad(yaw)) < 0;
  }
  return {
    u, toci, yaw, vzlet, ukaz, L, Pr,
    vejir: { smer: lerp(lerp(lerp(78, -62, ukaz), -125, d.stydi), -78 + 16 * Math.sin(t * 7.5), ov), otevreni: Math.max(dosed(ukaz), 0.86 * d.stydi, 0.8 * ov) },
  };
};
/**
 * Jak se hýbe celá postava (`pohyb` vrstev): dýchá, při otočce se nadnese,
 * v póze se maličko ukloní; v dřímotě (průvodce, `vstup.spi`) trochu klesne
 * a pomalu pokyvuje, při úkloně (`vstup.uklon`) se k zemi přikrčí. S velkým
 * uzlíkem se navíc vznáší: pohupuje se, kolébá, pod vahou propadá a zabírá
 * — a je pořád mírně předkloněná k uzlu: kreslí se jako slabší úklona
 * (níž a maličko stlačená), víc, když se propadá, míň, když se vytahuje.
 */
const figura = (d, p, t) => {
  const vp = d.velky && d.velky.k > 0.001 ? velkyPoza(d, t) : null;
  /* úklona a předklon jsou tentýž pohyb: úklona ji předkloní celou, jinak drží svůj předklon (nesčítají se) */
  const pk = Math.max(d.uklon, vp ? vp.predklon : 0);
  return {
    x: 0,
    y: 0.7 * Math.sin(t * 1.5) - 2.6 * p.vzlet + d.spi * (1.2 + Math.sin(t * 1.1)) + 3.6 * pk + (vp ? vp.y : 0),
    r: 1.6 * p.ukaz - 1.2 * d.stydi + 0.5 * Math.sin(t * 0.8) + d.spi * 1.8 * Math.sin(t * 0.55) + (vp ? vp.r : 0),
    sy: 1 - 0.1 * pk,
  };
};
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
  /* velký uzlík (druhá verze): objeví se stejně plynule; když do něj dopadne kus, propadne se s ním o kus níž, natáhne se a zase vyletí */
  const velky = !!sat && sat.druh === "velky", vel = dyn.velky;
  dyn.nese = kCili(dyn.nese, sat && !velky ? 1 : 0, dt, sat && !velky ? 0.13 : 0.1);
  vel.k = kCili(vel.k, velky ? 1 : 0, dt, velky ? 0.2 : 0.12);
  if (sat) {
    dyn.satekVzor = sat.vzor;
    dyn.satekPocet = sat.pocet;
    const cuk = sat.cuk || 0;
    if (cuk > dyn.satekCuk && dyn.nese > 0.5) {
      dyn.satek.w += (dyn.satek.w >= 0 ? 1 : -1) * UZLIK.cuk.w;
      dyn.satekPero.v += UZLIK.cuk.v;
    }
    if (cuk > dyn.satekCuk && velky && vel.k > 0.5) {
      vel.rana = 1;
      vel.klesani.v += VELKY.rana;
      vel.pero.v += 1.6;
    }
    dyn.satekCuk = cuk;
    /* s velkým se lekla (`lek` se zvětší — probudila se): propadne se jako po kusu, jen míň, a zase vyletí */
    const lek = sat.lek || 0;
    if (lek > dyn.satekLek && velky && vel.k > 0.5) {
      vel.rana = Math.max(vel.rana, 0.7);
      vel.klesani.v += 0.7 * VELKY.rana;
    }
    dyn.satekLek = lek;
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
  /* s velkým uzlíkem jí do šňůr fouká vějíř, který ji sám ovívá */
  if (vel.k > 0.02) {
    const vj = vejirSam(dyn, t, velkyPoza(dyn, t));
    vel.mava += dt * (6 + 6 * vj.sila) * (1 - 0.85 * (dyn.spi || 0));
    vm = clamp(vm + 0.5 * vj.sila * vel.k * Math.sin(vel.mava), -3, 3);
  }
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
  /* velký uzlík: když se propadne, natáhne se, když zabere, povolí; rána po kusu odezní, propad po něm se vrátí s přetažením; houpe se pod ní */
  if (vel.k > 0.001) {
    vel.rana = kCili(vel.rana, 0, dt, 0.6);
    const u = faze(dyn, t);
    if (pres(vel.uPred, u, KOLO_PROPAD)) vel.pero.v += 1.0;
    if (pres(vel.uPred, u, KOLO_ZABERE)) vel.pero.v -= 0.6;
    vel.uPred = u;
    if (dt > 0) {
      vel.pero.v += (-VELKY.pero.k * vel.pero.y - VELKY.pero.c * vel.pero.v) * dt;
      vel.pero.y = clamp(vel.pero.y + vel.pero.v * dt, -0.12, 0.22);
      vel.klesani.v += (-VELKY.klesani.k * vel.klesani.y - VELKY.klesani.c * vel.klesani.v) * dt;
      vel.klesani.y += vel.klesani.v * dt;
    }
    /* kyvadlo se věší za uzel tak, jak je na obrazovce — kolébání i let ho rozhoupou */
    const g = figura(dyn, p, t);
    kyvadlo(vel.kyv, naObrazovce(g, VELKY.uzel)[0], dt, { ...VELKY.kyv, vitr: vitr * 1.4 });
  }
  dyn.satekBod = vel.k > 0.02 ? bodVelkeho(dyn, p, t) : bodUzliku(dyn, p, t);
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
  /* velký uzlík jí kus vytrhl dolů: úlek přebije i to, s čím zrovna mluví */
  else if (d.velky && d.velky.k > 0.5 && d.velky.rana > 0.35) vyraz = "uzas";
  else if (vstup.vyraz) vyraz = vstup.vyraz;
  else if (p.ukaz > 0.3) vyraz = "mrk";
  else if (d.stydi > 0.4) vyraz = "stydi";
  else if (d.spi > 0.5 || d.uklon > 0.5) vyraz = "klid";
  else if (vyrazVelkeho(d, t)) vyraz = vyrazVelkeho(d, t);
  else if (vstup.mys) vyraz = "kouka";
  return {
    t, u, yaw: p.yaw % 360, vyraz, mKvety, rust, mTelo: mKvety,
    kruh: { m: maluje ? d.mPred : d.m, novy: d.m, p: maluje ? kp * kp * (3 - 2 * kp) : 1, op: maluje ? 1 - smooth(u / 0.6) : 1 },
    kvetRoku: { m: bezi && u < K0 ? d.mPred : d.m, k: !bezi ? 1 : u < K0 ? 1 - smooth(u / K0) : dosed((u - K0) / 0.55) },
    ruce: { L: { ...p.L, kyv: deg(d.rukavy.L.a) }, P: { ...p.Pr, kyv: deg(d.rukavy.P.a) } },
    vejir: p.vejir,
    kyv: { snury: d.snury.map((q) => deg(q.a)), masle: d.masle.a, vetev: deg(d.vetev.a) * 0.5, lucerna: deg(d.lucerna.a) },
    /* s velkým uzlíkem lucernu nenese vůbec — ruce má plné; barvy zůstávají stejné ve dne i v noci */
    lucerna: !!vstup.lucerna && !(d.velky && d.velky.k > 0.5),
    listky: d.listky, pohled: d.pohled, spi: d.spi,
    fig: figura(d, p, t),
    satek: uzlikVeStavu(d),
    velky: velkyVeStavu(d, t, p),
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
    { id: "rukavy-za", kresli: vrstvaRukavy(true), klic: (st) => `${klicRukavu(kusy(st))},${st.mTelo}${klicRukavuVelkeho(st)}`, pohyb },
    { id: "okobo", kresli: (st) => vPostave(vazBoty(ID, kusy(st))), klic: yawQ },
    { id: "vetvicka", kresli: (st) => vPostave(vazVetvicka(ID, st.mKvety, { kyv: st.kyv.vetev, rust: st.rust })), klic: (st) => `${st.mKvety},${Math.round(st.rust * 40)},${Math.round(st.kyv.vetev * 4)}`, pohyb },
    { id: "telo", kresli: (st) => vPostave(vazTelo(ID, { yaw: st.yaw, listky: MESICE[st.mTelo].listB[1], listky2: MESICE[st.mTelo].listB[0] })), klic: (st) => `${yawQ(st)},${st.mTelo}`, pohyb },
    { id: "tvar", kresli: (st) => vPostave(vazTvarNa(ID, st.yaw, { dx: st.pohled[0], dy: st.pohled[1], mrk: st.mrk, vyraz: st.vyraz })), klic: (st) => `${f(st.pohled[0])},${f(st.pohled[1])},${f(st.mrk)},${st.vyraz},${yawQ(st)}`, pohyb },
    { id: "pred", kresli: (st) => vPostave(vazPred(ID, kusy(st))), klic: (st) => `${kvetyKlic(st)},${Math.round(st.kyv.masle * 30)}`, pohyb },
    { id: "snury", kresli: (st) => vPostave(vazSnury(ID, st.mKvety, { yaw: st.yaw, kyv: st.kyv.snury, rust: st.rust })), klic: (st) => `${kvetyKlic(st)},${st.kyv.snury.map((a) => Math.round(a * 2)).join(",")}`, pohyb },
    { id: "rukavy-pred", kresli: vrstvaRukavy(false), klic: (st) => `${klicRukavu(kusy(st))},${st.mTelo}${klicRukavuVelkeho(st)}`, pohyb },
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
 * má levou ruku za zády, jinak před ním. S velkým uzlíkem ji nenese (ruce
 * má na uzlu, viz Velký uzlík).
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

/*
 * Velký uzlík — druhá verze k porovnání (`vstup.satek.druh === "velky"`;
 * pruvodce.ts ji vybírá podle ?uzlik=velky / ?uzlik=maly). Šátek skoro tak
 * velký jako ona nese pod sebou jako včelka: visí jí pod tělem uprostřed
 * a drží ho za uzel oběma rukama — paže vycházejí po stranách z obrysu,
 * nadloktí jde podél těla a přes předek jen předloktí k dlaním na uzlu, ať
 * je vidět obi i vzor kimona (`rukavyVelkeho`) — a je pořád mírně
 * předkloněná, jako když nese něco těžkého před sebou (slabší úklona, s kolem
 * se mění; v hlubokém předklonu jí uzlík paže trochu natáhne). Pořád letí, i doma v rohu — vznáší se,
 * pohupuje se nahoru a dolů a mírně se kolébá. Ve smyčce (`KOLO`) drží
 * výšku, pod vahou se propadne, oddechne si (u spánku jí kápne pot), zabere
 * a zase se vytáhne; s každým kusem navíc se propadá hloub. Nic se při tom
 * netřese a nefuní — námahu nese výraz, pot a vějíř. Když do něj kus doletí
 * (`cuk`), propadne se o kus níž a zase vyletí (pružina `klesani`); když se
 * lekne (`lek`, probudila se), propadne se míň. Uzlík visí z uzlu jako těžké
 * kyvadlo a drží se svisle, i když se ona kolébá; když se propadne, natáhne
 * se. Ruce má plné, a tak jí vějíř poletuje vlevo od hlavy a ovívá ji sám —
 * čím víc se namáhá, tím víc (a fouká jí do šňůr kanzashi) — a nikdy se jí
 * nedotkne: když se stydí, přiletí blíž k tváři, na gesto s vějířem se
 * rozevře a zvedne, když dřímá, svěsí se a přivře. Lucernu s velkým uzlíkem
 * nenosí, ve dne ani v noci. Co jinak stojí — okobo a u průvodce pro mistra
 * kruh za zády s květem měsíce (logo) — s ní letí jako jeden celek
 * (`sNiVelky`). Otočená zády má uzlík za sebou. Námaha (vějíř, pot) je
 * zvláštní vrstva před ní.
 */
const VELKY = {
  /* uzel v rukou pod tělem (souřadnice postavy), půlšířka a délka uzlíku od uzlu ke dnu; s kusy maličko roste */
  uzel: [90, 152], sirka: 36, delka: 62, vel: (n) => 1 + 0.04 * clamp((n || 1) - 1, 0, 5),
  /* ruce na uzlu: levá a pravá */
  ruceL: [84.5, 149.5], ruceP: [95.5, 149.5],
  /* vznášení: pohupování (jednotky postavy, rad/s), kolébání (°, rad/s), propad pod vahou (jednotky) a rána po dopadnutém kusu */
  houp: 3.2, houpW: 2.8, koleb: 2.4, kolebW: 1.1, propad: 6.5, rana: 110,
  /* jedno kolo trápení (s) */
  perioda: 6.6,
  /* vějíř poletuje vlevo od hlavy, s mezerou: čep a kam míří papír (°, k její tváři) */
  vejir: [22, 82], vejirSmer: -34,
  /* uzel a ouška jsou malého uzlíku, jen větší */
  usi: 1.5,
  /* natažení po propadu (pružina), propad po dopadnutém kusu (pružina) a těžké kyvadlo */
  pero: { k: 160, c: 11 }, klesani: { k: 45, c: 7 }, kyv: { g: 16, c: 2.4, L: 40 },
  /* o kolik jí uzlík v nejhlubším předklonu natáhne paže (dlaně i uzel níž, jednotky postavy) */
  natah: 3.5,
};
/**
 * Kam se vějíř hne na gesta — pořád vlevo od ní a s mezerou (souřadnice
 * postavy): když se stydí, přiletí blíž k tváři a skoro se rozevře; na gesto
 * se rozevře celý a zvedne; když dřímá, klesne o `dolu`, přivře se a svěsí.
 */
const VEJIR_GESTA = { stud: { P0: [22, 84], smer: -28, otev: 0.92 }, gesto: { P0: [22, 78], smer: -55, otev: 1 }, spi: { dolu: 6, smer: 100, otev: 0.45 } };
/**
 * Jedno kolo trápení ve vzduchu: klíčové body [u, hodnota] (u 0…1, kolo se
 * opakuje), mezi nimi hladce. Drží výšku (0–0,3), propadne se (do 0,4),
 * oddychuje (do 0,62), zabere a vytáhne se (0,7–0,8) a zase drží.
 */
const KOLO = {
  /* propad (1 = o `propad` níž): padá zrychleně („pad“), vytahuje se pomalu a kousek přetáhne */
  propad: [[0, 0], [0.3, 0.12], [0.4, 1, "pad"], [0.62, 0.85], [0.78, -0.15], [0.86, 0], [1, 0]],
  /* námaha 0…1 — podle ní ji vějíř ovívá víc a rychleji */
  namaha: [[0, 0.5], [0.3, 0.55], [0.36, 0.9], [0.44, 0.25], [0.62, 0.3], [0.7, 1], [0.8, 0.9], [0.9, 0.55], [1, 0.5]],
  /* náklon do strany (° krát tíha): při propadu se nakloní, když zabírá, vyrovná na druhou stranu */
  naklon: [[0, -0.3], [0.3, -0.2], [0.38, 0.8], [0.5, 0.3], [0.62, 0], [0.72, -1.2], [0.84, -0.6], [1, -0.3]],
  /* předklon k uzlu (krát úklona): pořád trochu, při propadu víc, když zabírá a vytahuje se, narovná se — ale nikdy úplně */
  predklon: [[0, 0.4], [0.3, 0.42], [0.4, 0.72, "pad"], [0.62, 0.62], [0.72, 0.26], [0.8, 0.2], [0.9, 0.34], [1, 0.4]],
};
/** Kdy v kole se propadne a kdy zabere (uzlík se natáhne / povolí) */
const KOLO_PROPAD = 0.34, KOLO_ZABERE = 0.7;
/** Výraz během kola (do kterého u platí): námaha, úlek, když se propadá, oddech, námaha, úsilí s pootevřenou pusou, námaha */
const KOLO_VYRAZ = [[0.32, "prisna"], [0.42, "uzas"], [0.64, "klid"], [0.74, "prisna"], [0.82, "uzas"], [1.01, "prisna"]];
const vKole = (u, body) => {
  for (let i = 0; i < body.length - 1; i++) {
    const [u0, v0] = body[i], [u1, v1, jak] = body[i + 1];
    if (u > u1) continue;
    const q = clamp((u - u0) / (u1 - u0 || 1));
    return lerp(v0, v1, jak === "pad" ? q * q : smooth(q));
  }
  return body[body.length - 1][1];
};
/** Čím víc kusů, tím těžší (1…1,72) */
const tihaVelkeho = (n) => 1 + 0.12 * clamp((n || 1) - 1, 0, 6);
const faze = (d, t) => ((((t - d.velky.t0) / VELKY.perioda) % 1) + 1) % 1;
/** Póza ve vzduchu: posun dolů (pohupování, propad, rána), náklon (kolébání, kolo, rána), předklon a námaha — krát to, jak moc ho má. Čistá funkce času a `dyn`. */
const velkyPoza = (d, t) => {
  const v = d.velky, tiha = tihaVelkeho(d.satekPocet), u = faze(d, t), k = v.k;
  const kolo = (klic) => vKole(u, KOLO[klic]);
  /* když dřímá, jen se zlehka vznáší a nenamáhá se */
  const bdi = 1 - (d.spi || 0) * 0.8;
  const pk = clamp(lerp(0.4, kolo("predklon"), bdi) + v.rana * 0.25, 0.15, 0.85);
  return {
    u, tiha, k,
    y: k * (VELKY.houp * Math.sin(t * VELKY.houpW) * (0.6 + 0.4 * bdi) + kolo("propad") * VELKY.propad * (0.6 + 0.4 * tiha) * bdi + v.klesani.y),
    r: k * (VELKY.koleb * Math.sin(t * VELKY.kolebW) + kolo("naklon") * (1 + 0.6 * tiha) * bdi + v.rana * 5),
    namaha: k * clamp(kolo("namaha") * bdi * (0.75 + 0.25 * tiha) + v.rana * 0.6),
    /* když dřímá, zůstane v klidném předklonu; po dopadnutém kusu se předkloní víc */
    predklon: k * pk,
    /* v hlubokém předklonu jí uzlík paže trochu natáhne: dlaně i uzel jdou o kus níž (souřadnice postavy) */
    natah: k * VELKY.natah * clamp((pk - 0.35) / 0.4),
  };
};
/** Bod postavy na plátně i s tím, jak se celá hýbe (`pohyb` vrstev) */
const naObrazovce = (g, P) => {
  const [x, y] = naPlatno(P), u = rad(g.r || 0);
  const dx = x - VAZ.cx, dy = (y - ZEM) * (g.sy ?? 1);
  return [VAZ.cx + g.x + dx * Math.cos(u) - dy * Math.sin(u), ZEM + g.y + dx * Math.sin(u) + dy * Math.cos(u)];
};
/**
 * Tvar uzlíku v souřadnicích postavy: uzel pevně v jejích rukou (v hlubokém
 * předklonu s nimi o kus níž), natočení vrstvy uzlíku tak, aby visel
 * svisle podle kyvadla, ať se ona kolébá jak chce (`otoceni` ve stupních),
 * délka a šířka i s natažením.
 */
const velkyTvar = (d, t, g) => {
  const v = d.velky, S = VELKY.vel(d.satekPocet);
  return {
    K: [VELKY.uzel[0], VELKY.uzel[1] + velkyPoza(d, t).natah], S,
    otoceni: -deg(v.kyv.a) - (g.r || 0),
    delka: VELKY.delka * S * (1 + 0.6 * v.pero.y),
    sirka: VELKY.sirka * S * (1 - 0.35 * v.pero.y),
  };
};
/** Bod uzlíku (počátek v uzlu, osa dolů) v souřadnicích postavy */
const vUzliku = (tv, k, [x, y]) => {
  const u = rad(tv.otoceni), c = Math.cos(u), s = Math.sin(u);
  return [tv.K[0] + k * (x * c - y * s), tv.K[1] + k * (x * s + y * c)];
};
/** Střed těla velkého uzlíku na plátně a jeho půlšířka — podle toho pruvodce.ts posouvá odkaz s počtem */
const bodVelkeho = (d, p, t) => {
  const g = figura(d, p, t), tv = velkyTvar(d, t, g), k = dosed(clamp(d.velky.k / 0.92));
  const [x, y] = naObrazovce({ ...g, sy: 1 }, vUzliku(tv, k, [0, 0.56 * tv.delka]));
  return [f(x), f(y), f(tv.sirka * k * K)];
};
/**
 * Vějíř, který ji ovívá sám: poletuje vlevo od hlavy a mává k její tváři,
 * tím rychleji a víc, čím víc se namáhá (a když se ovívá i sama od sebe);
 * na gesta se hne podle `VEJIR_GESTA` — a pořád s mezerou, nikdy se jí
 * nedotkne. Fáze mávání se načítá v kroku (`dyn.velky.mava`).
 */
const vejirSam = (d, t, vp) => {
  const v = d.velky, sila = clamp(0.2 + 0.8 * vp.namaha + 0.4 * (d.ovivani || 0));
  const sp = d.spi || 0, sm = d.stydi || 0, vj = (d.vejir || 0) * (1 - sm), G = VEJIR_GESTA;
  let P0 = [VELKY.vejir[0] + 1.6 * Math.sin(t * 1.9), VELKY.vejir[1] + 1.2 * Math.cos(t * 1.4)];
  /* mává nahoru a zpátky — nikdy níž než výchozí směr, ať nesáhne na rameno ani na rukáv */
  let smer = VELKY.vejirSmer - (8 + 20 * sila) * (0.5 - 0.5 * Math.cos(v.mava)) * (1 - sp);
  let otev = 0.78 + 0.08 * Math.sin(v.mava * 0.5);
  const k2 = (a, b, q) => [lerp(a[0], b[0], q), lerp(a[1], b[1], q)];
  P0 = k2(P0, G.stud.P0, sm);
  smer = lerp(smer, G.stud.smer, sm);
  otev = lerp(otev, G.stud.otev, sm);
  P0 = k2(P0, G.gesto.P0, vj);
  smer = lerp(smer, G.gesto.smer, vj);
  otev = lerp(otev, G.gesto.otev, vj);
  P0 = [P0[0], P0[1] + G.spi.dolu * sp];
  smer = lerp(smer, G.spi.smer, sp);
  otev = lerp(otev, G.spi.otev, sp);
  return { P0, smer, otevreni: otev * vp.k, sila };
};
/** Uzlík pro kreslení: tvar, látka, námaha (vějíř, pot); dokud ho má, i když zrovna mizí */
const velkyVeStavu = (d, t, p) => {
  const v = d.velky;
  if (!(v.k > 0.02) || !d.satekVzor) return null;
  const g = figura(d, p, t), vp = velkyPoza(d, t), tv = velkyTvar(d, t, g);
  const u = vp.u, spi = (d.spi || 0) > 0.5;
  const okno = (q) => (q > 0 && q < 1 ? q : -1);
  return {
    ...tv, k: dosed(clamp(v.k / 0.92)), vzor: d.satekVzor, pocet: d.satekPocet,
    /* otočená zády má uzlík za sebou */
    za: Math.cos(rad(p.yaw)) < 0,
    /* kapka potu, když oddychuje */
    pot: spi ? -1 : okno((u - 0.44) / 0.28),
    vejir: vejirSam(d, t, vp),
  };
};
/** Výraz při námaze, když zrovna nemluví (podle kola); úlek po dopadnutém kusu přebíjí i řeč (viz stav) */
const vyrazVelkeho = (d, t) => {
  const v = d.velky;
  if (!v || !(v.k > 0.5) || (d.spi || 0) > 0.5) return null;
  if (v.rana > 0.35) return "uzas";
  const u = faze(d, t);
  return KOLO_VYRAZ.find(([kdy]) => u < kdy)[1];
};
/* tělo velkého uzlíku od uzlu dolů: úzké hrdlo, dole kulaté a plné */
const teloVelkeho = (w, l) =>
  `M${f(-0.17 * w)} ${f(0.1 * l)} C${f(-0.5 * w)} ${f(0.16 * l)} ${f(-w)} ${f(0.3 * l)} ${f(-w)} ${f(0.58 * l)}` +
  ` C${f(-w)} ${f(0.86 * l)} ${f(-0.58 * w)} ${f(l)} 0 ${f(l)} C${f(0.58 * w)} ${f(l)} ${f(w)} ${f(0.86 * l)} ${f(w)} ${f(0.58 * l)}` +
  ` C${f(w)} ${f(0.3 * l)} ${f(0.5 * w)} ${f(0.16 * l)} ${f(0.17 * w)} ${f(0.1 * l)} Q0 ${f(0.1 * l - 1.6)} ${f(-0.17 * w)} ${f(0.1 * l)} Z`;
/* uzlík pod ní: tělo se vzorem, sklady, světlo, lesk, ouška s rubem a uzel a přes něj dlaně */
const vrstvaVelky = (za) => (st) => {
  const s = st.velky;
  if (!s || s.za !== za) return "";
  const v = vzorPodleId(s.vzor) ?? vzory[0];
  const { rub, lem } = v.barva;
  const latka = `url(#${ID}-satek-${v.id})`, svetlo = `url(#${ID}-satek-svetlo)`;
  const w = s.sirka, l = s.delka;
  let u = `<path d="${teloVelkeho(w, l)}" fill="${latka}" stroke="${lem}" stroke-width="1.4" stroke-linejoin="round"/>`;
  u += `<path d="${[[-0.62, 0.5], [-0.3, 0.64], [0.02, 0.6], [0.32, 0.62], [0.6, 0.48]].map(([x, y]) => `M${f(x * 0.12 * w)} ${f(0.13 * l)} Q${f(x * 0.55 * w)} ${f(0.3 * l)} ${f(x * w)} ${f(y * l)}`).join(" ")}" stroke="${lem}" stroke-width="1.1" stroke-linecap="round" fill="none" opacity="0.5"/>`;
  u += `<path d="${teloVelkeho(w, l)}" fill="${svetlo}"/>`;
  u += `<path d="M${f(-0.74 * w)} ${f(0.3 * l)} C${f(-0.93 * w)} ${f(0.42 * l)} ${f(-0.96 * w)} ${f(0.57 * l)} ${f(-0.87 * w)} ${f(0.72 * l)}" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round" fill="none" opacity="0.28"/>`;
  u += `<ellipse cx="0" cy="${f(0.2 * l)}" rx="${f(0.3 * w)}" ry="${f(0.05 * l)}" fill="#1E1626" opacity="0.2"/>`;
  let uzel = "";
  const obrys = `stroke="${lem}" stroke-width="${f(1.3 / VELKY.usi)}" stroke-linejoin="round"`;
  for (const o of UZLIK_OUSKA) uzel += `<path d="${o.d}" fill="${latka}" ${obrys}/><path d="${o.rub}" fill="${rub}" stroke="${lem}" stroke-width="${f(0.75 / VELKY.usi)}" stroke-linejoin="round"/><path d="${o.d}" fill="${svetlo}"/>`;
  uzel += `<ellipse cx="0" cy="4.6" rx="5.4" ry="3.8" fill="${latka}" ${obrys}/><ellipse cx="0" cy="4.6" rx="5.4" ry="3.8" fill="${svetlo}"/>`;
  u += `<g transform="scale(${VELKY.usi})">${uzel}</g>`;
  /* vepředu přes uzel znovu obě dlaně, ať ho svírají (rukávy jsou pod uzlíkem, ať jim visí do něj, ne přes něj) */
  const dlane = za ? "" : vazRuka(ID, st.ruce.L.H) + vazRuka(ID, st.ruce.P.H);
  return vPostave(`<g transform="translate(${pt(s.K)}) rotate(${f(s.otoceni)}) scale(${f(s.k)})">${u}</g>${dlane}`);
};
/* Námaha před ní (souřadnice postavy, jde s ní): vějíř, který ji ovívá sám, a kapka potu u spánku */
const vrstvaNamaha = (st) => {
  const s = st.velky;
  if (!s) return "";
  const w = rad(st.yaw), c = Math.cos(w);
  /* tvář je natočená s postavou: kde je vzhledem ke středu vázy */
  const naTvari = (x, y) => [VAZ.cx + 30.5 * Math.sin(w) + (x - VAZ.cx) * c, y];
  let o = "";
  const vj = s.vejir;
  if (vj.otevreni > 0.04) o += vazVejir(ID, vj.P0, vj.smer, vj.otevreni);
  if (s.pot >= 0) {
    const q = s.pot, roste = smooth(q / 0.15), pada = clamp((q - 0.7) / 0.3);
    /* u spánku nad obočím, ať nevypadá jako slza; sjede po kraji tváře a skápne */
    const [x, y] = naTvari(108.5, 83 + 9 * smooth((q - 0.15) / 0.55) + 16 * pada * pada);
    o += `<g transform="translate(${f(x)} ${f(y)}) scale(${f(roste * (1 - 0.3 * pada))})" opacity="${f(1 - pada)}"><path d="M0 -3.2 C1.6 -0.8 2.4 0.6 2.4 1.6 C2.4 3 1.3 3.8 0 3.8 C-1.3 3.8 -2.4 3 -2.4 1.6 C-2.4 0.6 -1.6 -0.8 0 -3.2 Z" fill="#CFEAF6" stroke="#5E9DC4" stroke-width="0.6"/><ellipse cx="-0.8" cy="1.2" rx="0.6" ry="1" fill="#FFFFFF" opacity="0.85"/></g>`;
  }
  return vPostave(o);
};
const klicVelkeho = (st) => (st.velky ? snimek(st) : -1);
/** Velký uzlík jde s ní a natáčí se, ale s jejím předklonem se nemačká (`sy`) — je to náklad, ne ona */
const pohybUzliku = (st) => ({ ...pohyb(st), sy: 1 });
/**
 * Vrstvy průvodce s uzlíkem: malý za zády hned po lucerně za zády a před
 * tělem po lucerně vepředu; velký pod ní za zády před zadními rukávy (ať
 * ho dlaně drží), vepředu přes přední rukávy (dlaně si kreslí sám);
 * námaha s vějířem navrchu.
 */
const sSatkem = (vrstvy) =>
  vrstvy.flatMap((v) =>
    v.id === "rukavy-za"
      ? [{ id: "velky-za", kresli: vrstvaVelky(true), klic: klicVelkeho, pohyb: pohybUzliku }, v]
      : v.id === "lucerna-za"
        ? [v, { id: "satek-za", kresli: vrstvaSatek(true), klic: klicSatku, pohyb }]
        : v.id === "lucerna"
          ? [v, { id: "velky", kresli: vrstvaVelky(false), klic: klicVelkeho, pohyb: pohybUzliku }, { id: "satek", kresli: vrstvaSatek(false), klic: klicSatku, pohyb }, { id: "namaha", kresli: vrstvaNamaha, klic: klicVelkeho, pohyb }]
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
/**
 * Co jinak stojí — okobo a u průvodce pro mistra kruh za zády s květem
 * měsíce (logo): s velkým uzlíkem letí s ní jako jeden celek, posune se
 * a natočí s postavou (jen se nemačká); bez něj stojí, jak stálo.
 */
const S_NI_VELKY = new Set(["kruh", "kruh-zivy", "kvet-roku", "okobo"]);
const sNiVelky = (st) => {
  const k = st.velky ? st.velky.k : 0;
  return { x: k * st.fig.x, y: k * st.fig.y, r: k * st.fig.r, ox: VAZ.cx, oy: ZEM };
};
const proPruvodce = (vrstvy) =>
  [...sSatkem(sLucernou(vrstvy)), { id: "spanek", kresli: vrstvaSpanek, klic: (st) => (st.spi > 0.6 ? snimek(st) : -1) }]
    .map((v) => (S_NI_VELKY.has(v.id) ? { ...v, pohyb: sNiVelky } : v))
    .map((v) => ({ ...v, kresli: (st) => naPruvodce(v.kresli(st)) }));

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
 * zemi, protože létá. S velkým uzlíkem s ní kruh letí (`sNiVelky`).
 * Ostatní hosté ji vidí bez kruhu.
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
