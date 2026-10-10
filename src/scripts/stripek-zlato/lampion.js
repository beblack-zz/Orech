/*
 * 03, Lampion — STŘÍPEK LETÍ S ČÓČINEM SLEPENÝM ZLATEM
 *
 * Jako Pecinka s lampionem z průvodu na Domku 2 a Bublinka, která letí:
 * Střípek nechodí, veze se na svém obláčku nízko nad zemí. Bez pozadí —
 * cestu mu dělá stránka, kam ho kdo postaví, sám se jen vznáší na místě,
 * nakloněný do směru letu a natočený trochu z boku. Že letí, je vidět
 * podle ocasu z chomáčů, který se za obláčkem vlní, podle chuchvalců,
 * které se od něj trhají, a podle zlatého prachu, který se zpod něj sype
 * a ujíždí dozadu.
 *
 * Na bambusové tyči nese papírovou lucernu čóčin — taky slepenou zlatem.
 * Má dvě záplaty z cizího papíru (vlnky seigaiha a modrotisk v barvách
 * loga, stejně jako on sám) a jeden dlouhý zlatý šev od jedné ke druhé,
 * který jde přes erb: tušový kruh. Svíčku v ní nemá, svítí v ní kapka
 * roztaveného zlata. Kolem světla krouží čtyři malé střípky jako můry.
 *
 * Myš: Střípek zvedne lucernu tam, kam kurzor ukazuje, a kouká za ním.
 * Kliknutí: nejbližší střípek se rozletí a vrazí do lucerny. Papír
 * praskne, Střípek se lekne — a za půl vteřiny trhlinu zalije zlato.
 * Trhlin se vejde pět; když jsou všechny zlaté, další rána rozzáří
 * lucernu celou dozlatova a ona pak dostane nový papír.
 *
 * Co se nemění (střep, tyč, papír lucerny, kovové švy), kreslí se jednou
 * a běh s tím jen hýbe: tělo se vznáší, tyč se otáčí v dlani, lucerna se
 * houpe kolem špičky. Proto můžou být švy lucerny kov s filtrem jako na
 * těle. Co přibude po kliknutí, je zlato ploché.
 */
import {
  f, rng, clamp, lerp, smooth, rad, pt, cara, mix, kCili, mrkani, jiskraD, pasPoBodech, normaly, bodNaCare, delky, chomac,
  ZLATO, MRAK, STREP, KUSY, RUCE,
  strDefs, strTelo, strZlato, strTvar, strRuka, strNohy, oblakZadni, oblakPredni, kusSvg,
  sparaVzorky, sparaTvar, elipsaD, zlatoKov, zlatoPlose,
} from "./spolecne.js";

const ID = "szl";
const B0 = [71, 90];
const K = 0.8;
const POSTAVA = `translate(${B0[0]} ${B0[1]}) scale(${K}) translate(-91 -90)`;
const vPostave = (s) => `<g transform="${POSTAVA}">${s}</g>`;
const ZEM = 165;
const deg = (r) => (r * 180) / Math.PI;
/* tvář je natočená do směru letu: posunutá a trochu zúžená */
const NATOCENI = 3.8;
const TVAR = `translate(${93 + NATOCENI} 0) scale(0.93 1) translate(-93 0)`;

/* tyč: od dlaně ke špičce, lucerna visí na háčku */
const TYC = 58, TYC_ZA = 11;
const UHEL0 = -58, UHEL_MEZE = [-63, -44];
const G = 414, MEZE_TH = [-0.28, 0.42];
/* ručka je oblázek bez paže: k tyči se prostě přesune (souřadnice kresby Střípka) */
const RUKA_T = [141, 107];
/* lucerna v souřadnicích háčku: y dolů, v panelu zvětšená LS× */
const LS = 1.72;
const LAMP = { hak: 4, telo: [7, 31], r0: 6.4, r1: 11 };
const STRED_L = 19;
const ZAVES = STRED_L * LS;
const vNaV = (y) => (y - LAMP.telo[0]) / (LAMP.telo[1] - LAMP.telo[0]);
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

/*
 * Zlato na lucerně se kreslí ve zmenšené skupině (ZS) se souřadnicemi
 * o to většími: filtr kovu i ploché zlato ze společných kusů jsou stavěné
 * na spáry Střípkova těla a na drobné lucerně by se jinak slily.
 * Záplaty mají ze stejného důvodu vlastní zmenšení vzoru (PS).
 */
const ZS = 0.36, PS = 0.42;
const vel = (B, k = ZS) => B.map(([x, y]) => [x / k, y / k]);
const SPARA_L = { min: 0.75, max: 1.75, kolis: 0.3 };
/* záplata s vlnkami vpravo nahoře, modrotisk vlevo dole — jako na Střípkovi */
const ZAPLATA_VLNY = [[4.4, 6], [5, 11.4], [7.4, 15], [12.5, 13.2], [12.5, 6]];
const ZAPLATA_MODROTISK = [[-12.5, 21.6], [-6.8, 23.6], [-5.6, 27.6], [-4.9, 32], [-12.5, 32]];
/* původní šev: kolem záplaty, klikatě přes erb a kolem druhé záplaty */
const SVY = [
  [[[4.4, 7.2], [5, 11.4], [7.4, 15], [10.8, 13.8]], 31],
  [[[7.4, 15], [4.4, 15.6], [3, 18.2], [0.6, 17.6], [-0.8, 21], [-3.4, 20.4], [-4.6, 23], [-6.8, 23.6]], 32],
  [[[-10.9, 22.2], [-6.8, 23.6], [-5.6, 27.6], [-5, 31]], 33],
];
const SVY_D =
  SVY.map(([body, seed]) => sparaTvar(sparaVzorky(vel(body), seed, 1.2, SPARA_L))).join(" ") +
  " " + [[7.4, 15], [-6.8, 23.6]].map(([x, y]) => elipsaD(x / ZS, y / ZS, 2.2, 1.8)).join(" ");
const SVY_STRED = SVY.map(([body]) => cara(vel(body))).join(" ");
/* erb: kruh jedním tahem štětce, na začátku tlustý, ke konci se vytrácí */
const ENSO = (() => {
  const B = [];
  for (let i = 0; i <= 44; i++) {
    const u = i / 44, a = rad(-64 + 316 * u), r = 4.5 + 0.22 * Math.sin(u * 5.2);
    B.push([Math.cos(a) * r, STRED_L + 0.2 + Math.sin(a) * r]);
  }
  return pasPoBodech(B, (u) => (0.3 + 1.05 * Math.pow(1 - u, 0.8)) * (u < 0.05 ? 0.5 + u * 10 : 1));
})();
/* kde může papír prasknout: pět míst, kam se ještě nic nevešlo */
const TRHLINY = [
  [[[-8.2, 9.6], [-5.8, 11.2], [-6.4, 13.6], [-4.2, 14.8]], 41],
  [[[10.2, 19.4], [7.6, 21], [8.2, 23.8], [5.8, 26.4]], 42],
  [[[0.6, 7.6], [-0.4, 10], [1.8, 11.4], [1, 13.8]], 43],
  [[[-10.6, 15.4], [-7.8, 16.6], [-8.4, 19], [-6.2, 20.2]], 44],
  [[[-2.6, 30.6], [-1.2, 27.8], [1.6, 28.4], [3.2, 25.6]], 45],
].map(([body, seed]) => {
  const V = sparaVzorky(vel(body), seed, 1.05, SPARA_L);
  const D = delky(body), N = normaly(body);
  /* odkud a kam z ní vyšlehne světlo: z každého zlomu a z půlky každého úseku, střídavě na obě strany */
  const paprsky = [];
  body.forEach((p, i) => {
    const s = i % 2 ? 1 : -1;
    paprsky.push([p, [N[i][0] * s, N[i][1] * s]]);
    if (i) paprsky.push([[(p[0] + body[i - 1][0]) / 2, (p[1] + body[i - 1][1]) / 2], [N[i][0] * -s, N[i][1] * -s]]);
  });
  return {
    V, paprsky, cara: cara(body), stred: bodNaCare(body, D, D[D.length - 1] / 2),
    zlata: `<g transform="scale(${ZS})">${zlatoPlose(ID, sparaTvar(V), cara(V.P))}</g>`,
  };
});
/* celá zlatá lucerna: pásy mezi žebry, každý s vlastním reliéfem */
const PASY = (() => {
  let d = "";
  const N = 8, m = 0.13;
  for (let i = 0; i < N; i++) {
    const y1 = lerp(LAMP.telo[0], LAMP.telo[1], i / N) + (i ? m : 0), y2 = lerp(LAMP.telo[0], LAMP.telo[1], (i + 1) / N) - (i < N - 1 ? m : 0);
    const r1 = polomerL(vNaV(y1)), r2 = polomerL(vNaV(y2)), ym = (y1 + y2) / 2;
    const cx = 2 * polomerL(vNaV(ym)) - (r1 + r2) / 2;
    const s1 = i ? 1.5 : 0.3, s2 = i < N - 1 ? 1.5 : 0.3;
    const q = (x, y) => `${f(x / ZS)} ${f(y / ZS)}`;
    d += `M${q(-r1, y1)} Q${q(0, y1 + s1)} ${q(r1, y1)} Q${q(cx, ym)} ${q(r2, y2)} Q${q(0, y2 + s2)} ${q(-r2, y2)} Q${q(-cx, ym)} ${q(-r1, y1)} Z `;
  }
  return d;
})();
const PAPRSKY = (() => {
  let d = "";
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2, R = i % 2 ? 38 : 54, w = i % 2 ? 0.07 : 0.1;
    d += `M0 0 L${f(Math.cos(a - w) * R)} ${f(Math.sin(a - w) * R)} L${f(Math.cos(a + w) * R)} ${f(Math.sin(a + w) * R)} Z `;
  }
  return d;
})();
const JISKRA = jiskraD(1);

/* čtyři střípky kolem světla: tvar se nemění, jen místo a natočení */
const MURY = [0, 1, 2, 6];
const KUS_SVG = KUSY.map((k) => kusSvg(ID, k));
const MURA_S = 0.43;
/* ocas obláčku: kde se drží (v kresbě Střípka), jak je velký a jak moc se vlní */
const OCAS = [
  { kde: [21, 139], rx: 10.6, ry: 6.9, vy: 0.9, seed: 61 },
  { kde: [9.5, 142], rx: 7.4, ry: 4.9, vy: 2, seed: 62 },
  { kde: [1, 144.5], rx: 4.7, ry: 3.1, vy: 3.2, seed: 63 },
].map((o) => ({
  ...o,
  d: chomac(0, 0, o.rx, o.ry, 9, o.seed, 0.45, 0.7),
  svetlo: chomac(-o.rx * 0.15, -o.ry * 0.42, o.rx * 0.5, o.ry * 0.36, 7, o.seed + 10, 1, 0.7),
}));
const CHUCHVALCE = [chomac(0, 0, 7.4, 4.8, 8, 71, 0.5, 0.7), chomac(0, 0, 5.9, 4.1, 7, 72, 0.5, 0.7), chomac(0, 0, 6.6, 4, 8, 73, 0.5, 0.7)];

/* časy: nálet střípku, jak dlouho se pak vzpamatovává, jak dlouho je trhlina holá, jak dlouho ji zlato zalévá, a rozzáření */
const NALET = 0.3, OMRACENI = 1, HOLA = 0.5, ZLATI = 0.6;
const ZARE_VYMENA = 2.5, ZARE_DRZI = 2.8, ZARE_KONEC = 3.7;

/** Bod z kresby Střípka (0–180) do panelu i s tím, jak se právě vznáší a naklání. */
const naTelo = ([x, y], fig) => {
  const dx = (x - 91) * K, dy = (y - 90) * K;
  const c = Math.cos(rad(fig.r)), s = Math.sin(rad(fig.r));
  return [B0[0] + fig.x + dx * c - dy * s, B0[1] + fig.y + dx * s + dy * c];
};
const dlan = (fig, posun) => {
  const H = naTelo(RUKA_T, fig);
  return [H[0] + posun[0], H[1] + posun[1]];
};
const spicka = (H, uhel) => [H[0] + Math.cos(rad(uhel)) * TYC, H[1] + Math.sin(rad(uhel)) * TYC];
/** Bod lucerny (v souřadnicích háčku) v panelu: houpe se o úhel th kolem špičky. */
const naLampe = (T, th, [x, y]) => [T[0] + (x * Math.cos(th) + y * Math.sin(th)) * LS, T[1] + (-x * Math.sin(th) + y * Math.cos(th)) * LS];
/* výchozí poloha tyče a lucerny: v ní jsou nakreslené, běh je odtud posouvá a otáčí */
const H0 = naTelo(RUKA_T, { x: 0, y: 0, r: 0 });
const T0 = spicka(H0, UHEL0);
const vLampe = (s) => `<g transform="translate(${pt(T0)}) scale(${LS})">${s}</g>`;

/* ——— Vrstvy ——— */
const vrstvaZem = (st) => {
  const v = clamp(1 - st.fig.y / 22, 0.75, 1.25);
  const lx = st.L[0];
  return (
    `<ellipse cx="${f(B0[0] + st.fig.x + 1)}" cy="${ZEM}" rx="${f(40 * v)}" ry="${f(4.6 * v)}" fill="url(#${ID}-stin)" opacity="${f(0.9 * v)}"/>` +
    `<ellipse cx="${f(lx)}" cy="${ZEM}" rx="${f(30 + 6 * st.svetlo)}" ry="${f(5.2 + st.svetlo)}" fill="url(#${ID}-louze)" opacity="${f(clamp(0.74 * st.svetlo))}"/>` +
    `<ellipse cx="${f(lx)}" cy="${ZEM + 0.8}" rx="11.5" ry="1.7" fill="#4A3A52" opacity="0.12"/>`
  );
};
/* brázda za obláčkem: utržené chuchvalce, vlnící se ocas a zlatý prach, který zůstává ve vzduchu, a tak ujíždí dozadu */
const vrstvaBrazda = (st) => {
  let s = "";
  for (const c of st.chuchvalce) {
    const u = c.vek / c.zivot;
    s += `<path d="${CHUCHVALCE[c.k]}" transform="translate(${f(c.x)} ${f(c.y)}) rotate(${f(c.rot)}) scale(${f(lerp(1, 0.3, u * u))})" fill="url(#${ID}-ocas)" opacity="${f(clamp(Math.min(u / 0.12, (1 - u) / 0.45)))}"/>`;
  }
  for (let i = OCAS.length - 1; i >= 0; i--) {
    const o = st.ocas[i];
    s += `<g transform="translate(${f(o.x)} ${f(o.y)}) rotate(${f(o.r)})"><path d="${OCAS[i].d}" fill="url(#${ID}-ocas)"/><path d="${OCAS[i].svetlo}" fill="${MRAK.zare}" opacity="0.6"/></g>`;
  }
  for (const p of st.prach) {
    const u = p.vek / p.zivot;
    const op = clamp(Math.min(u / 0.08, (1 - u) / 0.35)) * (0.62 + 0.38 * Math.sin(p.vek * 9 + p.fz));
    s += `<path d="${JISKRA}" transform="translate(${f(p.x)} ${f(p.y)}) rotate(${f(p.rot)}) scale(${f(p.r)})" fill="${p.sv ? "#FFF0B8" : "#F2C95E"}" stroke="#B8862A" stroke-width="${f(0.28 / p.r)}" opacity="${f(op)}"/>`;
  }
  return s;
};
/* obláček, střep a jeho zlato: kreslí se jednou, vznáší se celé najednou */
const vrstvaTelo = () => vPostave(oblakZadni(ID) + strTelo(ID) + strZlato(ID) + oblakPredni(ID));
/* teplé světlo lucerny na pravém boku střepu; dolů vyhasne dřív, než by došlo na obláček */
const vrstvaSvit = () => vPostave(`<path d="${STREP}" fill="url(#${ID}-svit)"/>`);
/* tvář, volná ručka a nožky, kterými na obláčku pohupuje */
const vrstvaTvar = (st) =>
  vPostave(
    `<g transform="${TVAR}">${strTvar({ dx: st.pohled[0], dy: st.pohled[1], mrk: st.mrk, vyraz: st.vyraz, tvare: 0.55, strana: 1 })}</g>` +
      strRuka(ID, [RUCE.leva[0], RUCE.leva[1] + st.ruka], { uhel: -8 }) +
      strNohy(ID, { kyv: st.kyv }),
  );
const vrstvaZare = (st) => {
  const [lx, ly] = st.L;
  let s = `<circle cx="${f(lx)}" cy="${f(ly)}" r="${f(46 + 4 * st.svetlo + 12 * st.zlate)}" fill="url(#${ID}-zare)" opacity="${f(clamp(0.78 * st.svetlo))}"/>`;
  /* celá zlatá: paprsky se pomalu točí a tepou */
  if (st.zlate > 0.01) s += `<path d="${PAPRSKY}" transform="translate(${f(lx)} ${f(ly)}) rotate(${f(st.t * 16)}) scale(${f(st.zlate * (0.92 + 0.08 * Math.sin(st.t * 11)))})" fill="url(#${ID}-paprsky)" opacity="${f(0.85 * st.zlate)}"/>`;
  return s;
};
/* střípky kolem světla. Kdo letí před lucernou, zableskne se; kdo do ní vrazil, točí se mu hlava */
const muraSvg = (m) => {
  const k = KUSY[m.k];
  let s = `<g transform="translate(${f(m.x)} ${f(m.y)}) rotate(${f(m.rot)}) scale(${f(m.s)})">${KUS_SVG[m.k]}${m.blesk > 0.04 ? `<path d="${k.d}" fill="#FFF6C8" opacity="${f(0.4 * m.blesk)}"/>` : ""}</g>`;
  if (m.blesk > 0.04) s += `<path d="${JISKRA}" transform="translate(${f(m.x - 1.9)} ${f(m.y - 2.2)}) rotate(${f(m.rot * 0.5)}) scale(${f(4.3 * m.blesk)})" fill="#FFFFFF" stroke="${ZLATO.zaklad}" stroke-width="0.12"/>`;
  if (m.zavrat > 0.06)
    for (const q of [0, Math.PI]) {
      const a = m.faze + q;
      s += `<path d="${JISKRA}" transform="translate(${f(m.x + Math.cos(a) * 6.3)} ${f(m.y - 5 + Math.sin(a) * 2)}) scale(${f(1.7 * clamp(m.zavrat * 1.6))})" fill="${ZLATO.lesk}" stroke="${ZLATO.tmave}" stroke-width="0.2"/>`;
    }
  return s;
};
const vrstvaMury = (vpredu) => (st) => st.mury.filter((m) => m.z > 0 === vpredu).map(muraSvg).join("");
/* bambusová tyč s kolínky a oblázek, který ji drží — ve výchozí poloze, otáčí ji běh */
const vrstvaTyc = () => {
  const d = [Math.cos(rad(UHEL0)), Math.sin(rad(UHEL0))], n = [-d[1], d[0]];
  const E = [H0[0] - d[0] * TYC_ZA, H0[1] - d[1] * TYC_ZA], T = T0;
  let s = `<path d="M${pt(E)} L${pt(T)}" stroke="#4E4226" stroke-width="4.1" stroke-linecap="round"/><path d="M${pt(E)} L${pt(T)}" stroke="#A8935A" stroke-width="2.6" stroke-linecap="round"/>`;
  s += `<path d="M${pt([E[0] + n[0] * 0.7, E[1] + n[1] * 0.7])} L${pt([T[0] + n[0] * 0.7, T[1] + n[1] * 0.7])}" stroke="#D2C28A" stroke-width="0.7" stroke-linecap="round" opacity="0.8"/>`;
  for (const q of [0.05, 0.36, 0.64, 0.9]) {
    const P = [lerp(E[0], T[0], q), lerp(E[1], T[1], q)];
    s += `<path d="M${pt([P[0] - n[0] * 1.85, P[1] - n[1] * 1.85])} L${pt([P[0] + n[0] * 1.85, P[1] + n[1] * 1.85])}" stroke="#4E4226" stroke-width="0.95" stroke-linecap="round"/>`;
  }
  s += `<ellipse cx="${f(H0[0])}" cy="${f(H0[1])}" rx="${f(6.2 * K)}" ry="${f(5 * K)}" transform="rotate(${f(UHEL0 + 96)} ${f(H0[0])} ${f(H0[1])})" fill="url(#${ID}-glazura)" stroke="#6B5D4F" stroke-width="${f(1.1 * K)}"/>`;
  return s;
};

/* ——— Lucerna: čtyři vrstvy, které se nepřekreslují, a jedna živá ——— */
const zaplata = (B, vypln) => `<path d="${cara(vel(B, PS))} Z" fill="url(#${ID}-${vypln})"/>`;
/* papír zevnitř prosvícený, záplaty z cizího papíru a světlo, které se dere švy */
const vrstvaPapir = () =>
  vLampe(
    `<path d="M0 -0.6 V${LAMP.hak}" stroke="#2A2422" stroke-width="0.8" stroke-linecap="round"/><circle cx="0" cy="-0.4" r="1.2" fill="none" stroke="#2A2422" stroke-width="0.7"/>` +
      `<path d="${TELO_L}" fill="url(#${ID}-papir)"/>` +
      `<g clip-path="url(#${ID}-lampa)">` +
      `<g transform="scale(${PS})">${zaplata(ZAPLATA_VLNY, "seigaiha")}${zaplata(ZAPLATA_MODROTISK, "modrotisk-pud")}${zaplata(ZAPLATA_MODROTISK, "modrotisk")}</g>` +
      `<path d="${cara(ZAPLATA_VLNY)} Z" fill="#FFE7A0" opacity="0.2"/><path d="${cara(ZAPLATA_MODROTISK)} Z" fill="#FFE7A0" opacity="0.08"/>` +
      `<g transform="scale(${ZS})"><path d="${SVY_STRED}" stroke="#FFFBE0" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.85" filter="url(#${ID}-mekce)"/></g>` +
      `</g>`,
  );
/* kapka roztaveného zlata: jasné jádro, které tepe (průhledností vrstvy) */
const vrstvaJadro = () =>
  vLampe(
    `<ellipse cx="0" cy="${STRED_L + 0.4}" rx="8" ry="10.6" fill="url(#${ID}-jadro)"/>` +
      `<path d="M0 ${STRED_L - 3.6} C1.7 ${STRED_L - 1.3} 2.7 ${STRED_L + 0.2} 2.7 ${STRED_L + 1.6} A2.7 2.7 0 0 1 -2.7 ${STRED_L + 1.6} C-2.7 ${STRED_L + 0.2} -1.7 ${STRED_L - 1.3} 0 ${STRED_L - 3.6} Z" fill="#FFFFFA" stroke="#FFD66A" stroke-width="0.3" opacity="0.95"/>`,
  );
const obruc = (y) =>
  `<rect x="-6.9" y="${f(y)}" width="13.8" height="3.2" rx="1" fill="#2A2422" stroke="#14100E" stroke-width="0.4"/><path d="M-5.6 ${f(y + 1.2)} H5.6" stroke="${ZLATO.jasne}" stroke-width="0.4" stroke-linecap="round"/>`;
/* žebra, erb tuší, zlatý šev jako kov a lakované obruče */
const vrstvaKresba = () =>
  vLampe(
    `<g clip-path="url(#${ID}-lampa)">` +
      `<path d="${ZEBRA}" stroke="#B98A3C" stroke-width="0.32" fill="none" opacity="0.75"/>` +
      `<path d="${ENSO}" fill="#2A2422" opacity="0.9"/>` +
      `<g transform="scale(${ZS})">${zlatoKov(ID, SVY_D)}</g>` +
      `<path d="${TELO_L}" fill="url(#${ID}-boky)"/>` +
      `</g>` +
      `<path d="${TELO_L}" fill="none" stroke="#5E4326" stroke-width="0.5" stroke-linejoin="round"/>` +
      obruc(LAMP.hak) + obruc(LAMP.telo[1] - 0.2),
  );
/** Kus středové čáry spáry od začátku po délku `po`. */
const kusCary = (V, po) => cara([...V.P.filter((_, i) => V.D[i] < po), bodNaCare(V.P, V.D, po)]);
const CARA = `fill="none" stroke-linecap="round" stroke-linejoin="round"`;
/* co na lucerně přibývá: trhliny, zlato, které je zalévá, a střapec */
const vrstvaZive = (st) => {
  let s =
    `<g transform="translate(0 ${LAMP.telo[1] + 3}) rotate(${f(-deg(st.strapec))})"><path d="M0 0 V3" stroke="#8E2A1C" stroke-width="0.8"/><circle cx="0" cy="3.6" r="1.35" fill="url(#${ID}-zl)" stroke="#7A5412" stroke-width="0.3"/>` +
    `<path d="M-1.4 4.7 L-2 11.2 L2 11.2 L1.4 4.7 Z" fill="#C4432B" stroke="#8E2A1C" stroke-width="0.4" stroke-linejoin="round"/><path d="M-0.8 5.5 V10.8 M0 5.5 V11 M0.8 5.5 V10.8" stroke="#8E2A1C" stroke-width="0.3"/></g>`;
  st.trhliny.forEach((tr, i) => {
    if (!tr.stav) return;
    const X = TRHLINY[i];
    if (tr.stav === 2 && tr.q >= 1) {
      s += X.zlata;
      return;
    }
    /* roztržený papír: tmavé okraje a mezi nimi ostré světlo */
    const zab = tr.stav === 1 ? Math.exp(-tr.u / 0.3) : 0;
    s +=
      `<path d="${X.cara}" stroke="#FFE9A0" stroke-width="${f(1.6 + 3.4 * zab)}" opacity="${f(0.35 + 0.3 * zab)}" ${CARA}/>` +
      `<path d="${X.cara}" stroke="#4A3318" stroke-width="1.3" opacity="0.8" ${CARA}/>` +
      `<path d="${X.cara}" stroke="#FFFDF0" stroke-width="0.7" ${CARA}/>`;
    if (zab > 0.03) {
      const d = 1.2 + 5.5 * (1 - zab);
      s += `<path d="${X.paprsky.map(([p, n]) => `M${pt([p[0] + n[0] * 1.1, p[1] + n[1] * 1.1])} L${pt([p[0] + n[0] * d, p[1] + n[1] * d])}`).join(" ")}" stroke="#FFF3B8" stroke-width="0.5" opacity="${f(clamp(zab * 1.3))}" ${CARA}/>`;
    }
    if (tr.stav === 2) {
      /* zlato teče po délce, vpředu žhavá kapka */
      const po = tr.q * X.V.delka;
      if (po > 0.2) {
        const P = bodNaCare(X.V.P, X.V.D, po);
        s += `<g transform="scale(${ZS})">${zlatoPlose(ID, sparaTvar(X.V, 0, po), kusCary(X.V, po))}<circle cx="${f(P[0])}" cy="${f(P[1])}" r="3.6" fill="#FFE08A" opacity="0.55"/><circle cx="${f(P[0])}" cy="${f(P[1])}" r="2" fill="#FFFDF0"/></g>`;
      }
    }
  });
  return vLampe(s);
};
/* lucerna celá ze zlata: leží přes papír a ukáže se jen při rozzáření (průhledností vrstvy) */
const vrstvaZlaty = () =>
  vLampe(
    `<g clip-path="url(#${ID}-lampa)">` +
      `<path d="${TELO_L}" fill="${ZLATO.zaklad}"/>` +
      `<g transform="scale(${ZS})"><path d="${PASY}" fill="${ZLATO.zaklad}" filter="url(#${ID}-kov)"/></g>` +
      `<ellipse cx="0" cy="${STRED_L}" rx="8.6" ry="11" fill="url(#${ID}-jadro)" opacity="0.75"/>` +
      `<path d="${ENSO}" fill="#6B4A10" opacity="0.55"/>` +
      `<path d="${TELO_L}" fill="url(#${ID}-boky)"/>` +
      `</g>` +
      `<path d="${TELO_L}" fill="none" stroke="#7A5412" stroke-width="0.5" stroke-linejoin="round"/>`,
  );
const vrstvaJiskry = (st) =>
  st.jiskry
    .map((j) => {
      const u = j.vek / j.zivot;
      return `<path d="${JISKRA}" transform="translate(${f(j.x)} ${f(j.y)}) rotate(${f(j.rot + u * 70)}) scale(${f(j.r * (1 - u * 0.4))})" fill="${j.sv ? "#FFFDF0" : ZLATO.jasne}" stroke="#B8862A" stroke-width="${f(0.28 / j.r)}" opacity="${f(clamp(Math.min(u / 0.1, (1 - u) / 0.5)))}"/>`;
    })
    .join("");

const defs = () =>
  strDefs(ID) +
  `<clipPath id="${ID}-lampa"><path d="${TELO_L}"/></clipPath>` +
  `<radialGradient id="${ID}-papir" cx="0.5" cy="0.52" r="0.66"><stop offset="0" stop-color="#FFFDF2"/><stop offset="0.55" stop-color="#FBE7AC"/><stop offset="1" stop-color="#E8B55A"/></radialGradient>` +
  `<radialGradient id="${ID}-jadro"><stop offset="0" stop-color="#FFF6C4" stop-opacity="0.95"/><stop offset="0.5" stop-color="#FFE48A" stop-opacity="0.5"/><stop offset="1" stop-color="#FFD66A" stop-opacity="0"/></radialGradient>` +
  /* papír se na bocích stáčí dozadu */
  `<linearGradient id="${ID}-boky" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8A5A1E" stop-opacity="0.4"/><stop offset="0.22" stop-color="#8A5A1E" stop-opacity="0"/><stop offset="0.78" stop-color="#8A5A1E" stop-opacity="0"/><stop offset="1" stop-color="#8A5A1E" stop-opacity="0.45"/></linearGradient>` +
  `<radialGradient id="${ID}-louze"><stop offset="0" stop-color="#FFDD80" stop-opacity="0.75"/><stop offset="0.6" stop-color="${ZLATO.jasne}" stop-opacity="0.26"/><stop offset="1" stop-color="${ZLATO.jasne}" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="${ID}-stin"><stop offset="0" stop-color="#4A3A52" stop-opacity="0.26"/><stop offset="0.65" stop-color="#4A3A52" stop-opacity="0.12"/><stop offset="1" stop-color="#4A3A52" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="${ID}-zare"><stop offset="0" stop-color="#FFF3C4" stop-opacity="0.8"/><stop offset="0.38" stop-color="#FFD978" stop-opacity="0.3"/><stop offset="1" stop-color="#FFD978" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="${ID}-paprsky" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="54"><stop offset="0" stop-color="#FFFBE0" stop-opacity="0.95"/><stop offset="0.45" stop-color="#FFE08A" stop-opacity="0.6"/><stop offset="1" stop-color="${ZLATO.jasne}" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="${ID}-svit" gradientUnits="userSpaceOnUse" cx="142" cy="88" r="46"><stop offset="0" stop-color="#FFD470" stop-opacity="0.7"/><stop offset="0.6" stop-color="#FFD470" stop-opacity="0.16"/><stop offset="1" stop-color="#FFD470" stop-opacity="0"/></radialGradient>` +
  `<linearGradient id="${ID}-ocas" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${MRAK.svetlo}"/><stop offset="0.45" stop-color="${MRAK.svetlo}"/><stop offset="1" stop-color="${mix(MRAK.svetlo, MRAK.stin, 0.5)}"/></linearGradient>`;

/* ——— Simulace ——— */
/** Škubnutí při leknutí: rychle nahoru a dozadu, pomalu zpátky. */
const skubnuti = (u) => (u < 0 || u > 1.4 ? 0 : Math.sin((Math.min(1, u / 0.09) * Math.PI) / 2) * Math.exp(-u / 0.22));
const jakZlata = (d, t) => {
  if (d.zare == null) return 0;
  const u = t - d.zare;
  return smooth(u / 0.35) * (1 - smooth((u - ZARE_DRZI) / (ZARE_KONEC - ZARE_DRZI)));
};
const figV = (t, d) => {
  const lek = skubnuti(t - d.lek), sm = jakZlata(d, t);
  return {
    x: 1.4 * Math.sin(t * 0.7 + 0.5) - 1.4 * lek,
    y: 3.6 * Math.sin(t * 1.5) - 3.2 * lek + 1.2 * sm * Math.sin(t * 15),
    r: 4 + 1.5 * Math.sin(t * 1.5 + 0.9) - 4 * lek,
  };
};
/** Střípek na oběžné dráze kolem světla L: z je hloubka, kladná je před lucernou. Dráha je po stranách sražená: vlevo je Střípek, vpravo kraj plátna. */
const OBEH_X = 4, OBEH_VLEVO = 0.8;
const obehVpravo = (L) => clamp((178 - L[0] - OBEH_X) / 35, 0.62, 0.92);
const obeh = (m, L, t) => {
  const c = Math.cos(m.a);
  m.z = m.r * Math.sin(m.a);
  m.x = L[0] + OBEH_X + m.r * c * (c < 0 ? OBEH_VLEVO : obehVpravo(L));
  m.y = L[1] + m.h0 + 6.2 * Math.sin(t * m.w * 0.8 + m.fz) + m.dh - m.z * 0.12;
};
const ocasV = (t, fig) =>
  OCAS.map((o, i) => {
    const P = naTelo(o.kde, fig), u = t * 3.1 - i * 1.05;
    return { x: P[0] + o.vy * 0.4 * Math.sin(t * 2.3 - i * 0.9), y: P[1] + o.vy * Math.sin(u), r: o.vy * 4.5 * Math.cos(u) };
  });
const novaDynamika = () => {
  const R = rng(727);
  const d = {
    nahoda: R, uhel: UHEL0, uhelC: UHEL0, posun: [0, 0], th: -0.1, thV: 0, strapec: { th: -0.1, om: 0 }, T: null, TV: [0, 0],
    trhliny: TRHLINY.map(() => ({ stav: 0, t0: 0, zamluvena: false, hotova: false })), zlatych: 0, ceka: false, zare: null, lek: -100, pycha: -100, zablesk: 0,
    mury: MURY.map((k, i) => ({
      k, stav: 0, t0: 0, cil: -1, a: i * 1.57 + 0.5 + R() * 0.5, smer: i === 2 ? -1 : 1, va: 1.7 + R() * 0.8, r0: 25.5 + R() * 6, r: 0, h0: -9.6 + i * 5.8 + R() * 2.8,
      dh: 0, fz: R() * 6.28, w: 0.8 + R() * 0.7, spin: R() * 360, zavrat: 0, x: 0, y: 0, z: 0, x0: 0, y0: 0,
    })),
    chuchvalce: [], dalsi: 0.9, prach: [], akum: 0, hrst: 3.2, jiskry: [], akumJ: 0, zvuk: [], pohled: [1.6, 0.1],
  };
  d.T = spicka(dlan(figV(0, d), d.posun), d.uhel);
  const L = naLampe(d.T, d.th, [0, STRED_L]);
  for (const m of d.mury) {
    m.r = m.r0;
    obeh(m, L, 0);
  }
  return d;
};
const prsk = (dyn, [x, y], pocet, { rychlost = 58, zivot = 0.65, r = 2.1, nahoru = 0 } = {}) => {
  const R = dyn.nahoda;
  for (let i = 0; i < pocet && dyn.jiskry.length < 90; i++) {
    const a = R() * 6.28, v = rychlost * (0.35 + R() * 0.65);
    dyn.jiskry.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - nahoru, vek: 0, zivot: zivot * (0.6 + R() * 0.8), r: r * (0.5 + R() * 0.8), rot: R() * 90, sv: R() < 0.5 });
  }
};
const pan = (x) => clamp((x - 90) / 90, -1, 1);
/** Kliknutí: nejbližší střípek, který zrovna krouží, se rozletí k prvnímu celému místu na papíře. */
const vypust = (dyn, t, klik, L) => {
  let nej = null, d0 = 1e9;
  for (const m of dyn.mury) {
    if (m.stav !== 0) continue;
    /* kdo je schovaný za lucernou, ten ať radši počká: vyskočil by zničehonic */
    const d = Math.hypot(m.x - klik.x, m.y - klik.y) + (m.z < 0 && Math.abs(m.x - L[0]) < 21 ? 80 : 0);
    if (d < d0) [d0, nej] = [d, m];
  }
  if (!nej) return;
  const cil = dyn.zare == null ? dyn.trhliny.findIndex((tr) => tr.stav === 0 && !tr.zamluvena) : -1;
  if (cil >= 0) dyn.trhliny[cil].zamluvena = true;
  Object.assign(nej, { stav: 1, t0: t, cil, x0: nej.x, y0: nej.y });
};
/** Střípek vrazil do lucerny v bodě P. */
const naraz = (dyn, t, m, P, L) => {
  dyn.thV = clamp(dyn.thV + (m.x0 > P[0] ? -1.1 : 1.5), -2.4, 2.8);
  dyn.zvuk.push({ druh: "tuk", sila: 0.9, pan: pan(P[0]) });
  if (m.cil >= 0) {
    /* papír praskne a vyšlehne z něj světlo */
    Object.assign(dyn.trhliny[m.cil], { stav: 1, t0: t, zamluvena: false });
    dyn.lek = t;
    dyn.zablesk = 1;
    dyn.zvuk.push({ druh: "trh", sila: 0.9, pan: pan(P[0]), za: 0.02 });
    dyn.zvuk.push({ druh: "pisk", sila: 0.5, pan: pan(B0[0]), za: 0.1 });
    prsk(dyn, P, 10);
  } else {
    /* není už kde prasknout: rozzáří se — hned, nebo až zlato doteče do poslední trhliny */
    if (dyn.zare == null && dyn.trhliny.every((tr) => tr.stav)) dyn.ceka = true;
    prsk(dyn, P, 3, { rychlost: 36 });
  }
  /* omráčený střípek: od místa nárazu se po spirále odmotá zpátky na dráhu */
  const dx = (P[0] - L[0] - OBEH_X) / (P[0] - L[0] < OBEH_X ? OBEH_VLEVO : obehVpravo(L));
  m.stav = 2;
  m.t0 = t;
  m.zavrat = 1;
  m.r = Math.max(12.5, Math.abs(dx) + 5.5);
  m.a = Math.acos(clamp(dx / m.r, -1, 1));
  m.dh = 0;
  obeh(m, L, t);
  m.dh = P[1] - m.y;
};
const krok = (dyn, t, dt, vstup) => {
  const R = dyn.nahoda;
  const fig = figV(t, dyn);
  /* lucernu zvedá za kurzorem: míří tak, aby pod špičkou visela tam, kam ukazuje */
  const H1 = naTelo(RUKA_T, fig);
  let cil = UHEL0 + 3.5 * Math.sin(t * 0.8), cilP = [0, 0];
  if (vstup.mys) {
    const dx = vstup.mys.x - H1[0], dy = vstup.mys.y - H1[1];
    cil = clamp(deg(Math.atan2(dy - ZAVES, Math.max(dx, 16))), UHEL_MEZE[0], UHEL_MEZE[1]);
    cilP = [clamp(dx * 0.05, 0, 2.5), clamp(dy * 0.1, -10, 6)];
  }
  /* dvojí zpoždění: tyč se rozjede zvolna, jinak by lucernou při každém skoku kurzoru švihla */
  dyn.uhelC = kCili(dyn.uhelC, cil, dt, 0.13);
  dyn.uhel = kCili(dyn.uhel, dyn.uhelC, dt, 0.16);
  dyn.posun = dyn.posun.map((q, i) => kCili(q, cilP[i], dt, 0.25));
  /* kyvadlo: rozhoupe ho zrychlení špičky tyče, vzduch ho při letu tlačí dozadu */
  const T = spicka([H1[0] + dyn.posun[0], H1[1] + dyn.posun[1]], dyn.uhel);
  const h = Math.max(dt, 1e-4);
  const TV = [(T[0] - dyn.T[0]) / h, (T[1] - dyn.T[1]) / h];
  const ax = clamp((TV[0] - dyn.TV[0]) / h, -830, 830);
  dyn.T = T;
  dyn.TV = TV;
  const vitr = -0.8 + 1.1 * Math.sin(t * 0.9) + 0.65 * Math.sin(t * 2.3 + 1);
  /* měkké meze: k Střípkovi se rozhoupe míň než od něj, ať mu nevletí do obláčku */
  const pres = dyn.th < MEZE_TH[0] ? dyn.th - MEZE_TH[0] : dyn.th > MEZE_TH[1] ? dyn.th - MEZE_TH[1] : 0;
  dyn.thV += (-(G / ZAVES) * Math.sin(dyn.th) - (1.5 + (pres ? 5 : 0)) * dyn.thV - (ax / ZAVES) * Math.cos(dyn.th) + vitr - 110 * pres) * dt;
  dyn.th = clamp(dyn.th + dyn.thV * dt, -1.2, 1.2);
  /* střapec se za lucernou opožďuje */
  const sp = dyn.strapec;
  sp.om += (40 * (dyn.th - sp.th) - 3.4 * sp.om) * dt;
  sp.th = clamp(sp.th + sp.om * dt, dyn.th - 1, dyn.th + 1);
  const L = naLampe(T, dyn.th, [0, STRED_L]);

  if (vstup.kliky && vstup.kliky.length) {
    for (const k of vstup.kliky) vypust(dyn, t, k, L);
    vstup.kliky.length = 0;
  }
  /* střípky: krouží, nalétávají, nebo se vzpamatovávají z nárazu */
  for (const m of dyn.mury) {
    if (m.stav === 1) {
      const u = (t - m.t0) / NALET;
      const P = naLampe(T, dyn.th, m.cil >= 0 ? TRHLINY[m.cil].stred : [0, STRED_L]);
      /* rozběh: nejdřív kousek couvne, pak vyrazí */
      const e = u * u * (2.4 * u - 1.4);
      m.x = m.x0 + (P[0] - m.x0) * e;
      m.y = m.y0 + (P[1] - m.y0) * e;
      m.z = 16;
      m.spin = (m.spin + dt * 720) % 360;
      if (u >= 1) naraz(dyn, t, m, P, L);
      continue;
    }
    if (m.stav === 2 && t - m.t0 > OMRACENI) m.stav = 0;
    m.zavrat = kCili(m.zavrat, 0, dt, 0.45);
    /* po nárazu odskočí rychle, ať trhlinu nezakrývá */
    m.r = kCili(m.r, m.r0 + 3.4 * Math.sin(t * m.w + m.fz), dt, m.stav === 2 ? 0.16 : 0.5);
    m.dh = kCili(m.dh, 0, dt, 0.4);
    m.a = (m.a + m.smer * m.va * dt * (1 + 0.3 * Math.sin(t * m.w * 1.7 + m.fz) + 1.8 * m.zavrat)) % (Math.PI * 2);
    m.spin = (m.spin + m.smer * dt * (26 + 620 * m.zavrat)) % 360;
    obeh(m, L, t);
  }
  /* trhliny: půl vteřiny holé, pak je zalije zlato */
  dyn.trhliny.forEach((tr, i) => {
    if (tr.stav === 1 && t - tr.t0 >= HOLA) {
      tr.stav = 2;
      tr.t0 = t;
      dyn.pycha = t;
      dyn.zvuk.push({ druh: "cink", vys: dyn.zlatych, sila: 0.8, pan: pan(L[0]) });
      dyn.zlatych++;
    }
    if (tr.stav === 2 && !tr.hotova) {
      const X = TRHLINY[i], q = clamp((t - tr.t0) / ZLATI);
      const C = bodNaCare(X.V.P, X.V.D, q * X.V.delka);
      const P = naLampe(T, dyn.th, [C[0] * ZS, C[1] * ZS]);
      if (R() < dt * 16) prsk(dyn, P, 1, { rychlost: 22, zivot: 0.5, r: 1.5, nahoru: 8 });
      if (q >= 1) {
        tr.hotova = true;
        prsk(dyn, P, 4, { rychlost: 33, zivot: 0.6, r: 1.8 });
      }
    }
  });
  /* rozzáření: pár vteřin celá zlatá; pod zlatem se papír vymění a přidané spáry jsou pryč */
  if (dyn.ceka && dyn.trhliny.every((tr) => tr.hotova)) {
    dyn.ceka = false;
    dyn.zare = t;
    dyn.zablesk = 1;
    dyn.zvuk.push({ druh: "zare", sila: 1, pan: pan(L[0]) });
    dyn.zvuk.push({ druh: "smich", sila: 0.7, pan: pan(B0[0]), za: 0.35 });
    prsk(dyn, L, 20, { rychlost: 96, zivot: 0.9, r: 2.6 });
  }
  if (dyn.zare != null) {
    const u = t - dyn.zare;
    if (u < ZARE_DRZI) {
      dyn.akumJ += dt * 22;
      while (dyn.akumJ >= 1) {
        dyn.akumJ -= 1;
        prsk(dyn, naLampe(T, dyn.th, [(R() - 0.5) * 20, LAMP.telo[0] + R() * 24]), 1, { rychlost: 47, zivot: 0.9, r: 2.2, nahoru: 16 });
      }
    }
    if (u >= ZARE_VYMENA && dyn.zlatych) {
      for (const tr of dyn.trhliny) Object.assign(tr, { stav: 0, t0: 0, zamluvena: false, hotova: false });
      dyn.zlatych = 0;
    }
    if (u >= ZARE_KONEC) dyn.zare = null;
  }
  dyn.zablesk = kCili(dyn.zablesk, 0, dt, 0.2);
  /* chuchvalce: občas se jeden odtrhne od obláčku, ujede dozadu a rozplyne se */
  dyn.dalsi -= dt;
  if (dyn.dalsi <= 0 && dyn.chuchvalce.length < 5) {
    dyn.dalsi = 1.1 + R() * 1.5;
    const P = naTelo([24 + R() * 22, 121 + R() * 16], fig);
    dyn.chuchvalce.push({ x: P[0], y: P[1], vx: -(18 + R() * 10), vy: -(1.4 + R() * 5.5), k: Math.floor(R() * CHUCHVALCE.length), rot: (R() - 0.5) * 30, vr: (R() - 0.5) * 40, vek: 0, zivot: 1.5 + R() * 0.8, fz: R() * 6.28 });
  }
  for (const c of dyn.chuchvalce) {
    c.vek += dt;
    c.x += c.vx * dt;
    c.y += (c.vy + Math.sin(c.vek * 3 + c.fz) * 4) * dt;
    c.rot += c.vr * dt;
  }
  dyn.chuchvalce = dyn.chuchvalce.filter((c) => c.vek < c.zivot);
  /* zlatý prach zpod obláčku: sype se stále trochu a občas celá hrst */
  const novyPrach = () => {
    if (dyn.prach.length >= 60) return;
    const P = naTelo([36 + R() * 112, 149 + R() * 6], fig);
    dyn.prach.push({ x: P[0], y: P[1], vx: -(19 + R() * 15), vy: 5 + R() * 9, r: 1 + R() * R() * 1.7, rot: R() * 90, vr: (R() - 0.5) * 240, vek: 0, zivot: 1.3 + R() * 0.8, fz: R() * 6.28, sv: R() < 0.45 });
  };
  dyn.akum += dt * 9;
  while (dyn.akum >= 1) {
    dyn.akum -= 1;
    novyPrach();
  }
  dyn.hrst -= dt;
  if (dyn.hrst <= 0) {
    dyn.hrst = 6 + R() * 5;
    for (let i = 0; i < 9; i++) novyPrach();
    dyn.zvuk.push({ druh: "sypani", sila: 0.25, pan: pan(B0[0]) });
  }
  for (const p of dyn.prach) {
    p.vek += dt;
    p.x += p.vx * dt;
    p.vy += 20 * dt;
    p.y += p.vy * dt;
    p.rot += p.vr * dt;
    /* co dopadne, zůstane ležet na cestě */
    if (p.y > ZEM - 0.5) {
      p.y = ZEM - 0.5;
      p.vy = 0;
      p.vr *= 1 - Math.min(1, dt * 8);
    }
  }
  dyn.prach = dyn.prach.filter((p) => p.vek < p.zivot);
  for (const j of dyn.jiskry) {
    j.vek += dt;
    j.x += j.vx * dt;
    j.y += j.vy * dt;
    j.vx *= 1 - Math.min(1, dt * 2.4);
    j.vy *= 1 - Math.min(1, dt * 2.4);
  }
  dyn.jiskry = dyn.jiskry.filter((j) => j.vek < j.zivot);
  /* pohled: za střípkem, který se rozletěl, za kurzorem, jinak na lucernu */
  const letici = dyn.mury.find((m) => m.stav === 1);
  const kam = letici ? [letici.x, letici.y] : vstup.mys ? [vstup.mys.x, vstup.mys.y] : L;
  const c = naTelo([93 + NATOCENI, 89], fig);
  const cp = [clamp((kam[0] - c[0]) / 55, -1, 1) * 2, clamp((kam[1] - c[1]) / 55, -1, 1) * 1.4];
  dyn.pohled = dyn.pohled.map((q, i) => kCili(q, cp[i], dt, 0.12));
};
/* bez myši si lucernu prohlíží; jednou za čas zavře oči a pak jedním okem zkontroluje, jestli ještě svítí */
const KLID = 13;
const stav = (t, vstup = {}, dyn) => {
  const d = dyn || novaDynamika();
  const fig = figV(t, d);
  const H = dlan(fig, d.posun);
  const T = spicka(H, d.uhel);
  const L = naLampe(T, d.th, [0, STRED_L]);
  const zlate = jakZlata(d, t);
  const tk = ((t % KLID) + KLID) % KLID;
  let vyraz = "kouka";
  if (d.zare != null && t - d.zare < ZARE_DRZI + 0.3) vyraz = "smich";
  else if (t - d.lek < HOLA) vyraz = "leknuti";
  else if (t - d.pycha < 1.3) vyraz = "pysny";
  else if (d.mury.some((m) => m.stav === 1)) vyraz = "uzas";
  else if (!vstup.mys && tk > 7.4 && tk < 10.2) vyraz = "medituje";
  else if (!vstup.mys && tk >= 10.2 && tk < 10.8) vyraz = "kouk1";
  const trhliny = d.trhliny.map((tr) => ({ stav: tr.stav, u: t - tr.t0, q: tr.stav === 2 ? clamp((t - tr.t0) / ZLATI) : 0 }));
  return {
    t, fig, H, uhel: d.uhel, T, th: d.th, L, strapec: d.strapec.th - d.th, zlate, trhliny, vyraz,
    /* kapka zlata v lucerně pomalu tepe; trhlinou světlo vyšlehne */
    svetlo: 0.82 + 0.13 * Math.sin(t * 2.1) + 0.05 * Math.sin(t * 5.3 + 1) + 0.7 * d.zablesk + 0.6 * zlate,
    /* dokud se na lucerně něco děje, kreslí se každý snímek; jinak jen když se pohne střapec */
    zive: d.zare != null || trhliny.some((tr) => tr.stav === 1 || (tr.stav === 2 && tr.u < ZLATI + 0.1)),
    mury: d.mury.map((m) => ({
      k: m.k, x: m.x, y: m.y, z: m.z, s: MURA_S * (1 + m.z * 0.009), rot: KUSY[m.k].r + m.spin + 20 * Math.sin(t * 1.3 + m.fz), zavrat: m.stav === 2 ? m.zavrat : 0, faze: t * 9 + m.fz,
      /* zableskne se, když přelétá přímo před kapkou zlata */
      blesk: m.z > 0 && m.stav === 0 ? smooth(1 - Math.abs(m.x - L[0]) / 9) * smooth(1.2 - Math.abs(m.y - L[1]) / 21) : 0,
    })),
    ocas: ocasV(t, fig), chuchvalce: d.chuchvalce, prach: d.prach, jiskry: d.jiskry,
    pohled: d.pohled, mrk: mrkani(t, [2.1, 5.3, 5.56, 11.9], KLID),
    kyv: 1.5 * Math.sin(t * 2.4), ruka: 1.1 * Math.sin(t * 1.5 + 2.2),
  };
};
const snimek = (st) => Math.floor(st.t * 30);
const pohyb = (st) => ({ x: st.fig.x, y: st.fig.y, r: st.fig.r, ox: B0[0], oy: B0[1] });
const pohybTyce = (st) => ({ x: st.H[0] - H0[0], y: st.H[1] - H0[1], r: st.uhel - UHEL0, ox: H0[0], oy: H0[1] });
const pohybLampy = (st) => ({ x: st.T[0] - T0[0], y: st.T[1] - T0[1], r: -deg(st.th), ox: T0[0], oy: T0[1] });

export const lampion = {
  id: "lampion",
  viewBox: "0 0 180 180",
  defs,
  novaDynamika,
  krok,
  stav,
  hukot: (st) => ({ vitr: 0.3 + 0.1 * Math.sin(st.t * 0.7) }),
  klidne: { t: 11.6 },
  vrstvy: [
    { id: "zem", kresli: vrstvaZem, klic: snimek },
    { id: "brazda", kresli: vrstvaBrazda, klic: snimek },
    { id: "telo", kresli: vrstvaTelo, tezka: true, pohyb },
    { id: "svit", kresli: vrstvaSvit, pohyb, pruhlednost: (st) => f(clamp(0.2 + 0.8 * st.svetlo)) },
    { id: "tvar", kresli: vrstvaTvar, klic: (st) => `${Math.round(st.pohled[0] * 10)},${Math.round(st.pohled[1] * 10)},${f(st.mrk)},${st.vyraz},${Math.round(st.kyv * 3)}`, pohyb },
    { id: "zare", kresli: vrstvaZare, klic: snimek },
    { id: "mury-za", kresli: vrstvaMury(false), klic: snimek },
    { id: "tyc", kresli: vrstvaTyc, pohyb: pohybTyce },
    { id: "lampion-papir", kresli: vrstvaPapir, tezka: true, pohyb: pohybLampy },
    { id: "lampion-jadro", kresli: vrstvaJadro, pohyb: pohybLampy, pruhlednost: (st) => f(clamp(0.2 + 0.8 * st.svetlo)) },
    { id: "lampion-kresba", kresli: vrstvaKresba, tezka: true, pohyb: pohybLampy },
    { id: "lampion-zive", kresli: vrstvaZive, klic: (st) => (st.zive ? snimek(st) : `${st.trhliny.map((tr) => tr.stav).join("")},${Math.round(deg(st.strapec))}`), pohyb: pohybLampy },
    { id: "lampion-zlaty", kresli: vrstvaZlaty, tezka: true, pohyb: pohybLampy, pruhlednost: (st) => f(st.zlate) },
    { id: "mury-pred", kresli: vrstvaMury(true), klic: snimek },
    { id: "jiskry", kresli: vrstvaJiskry, klic: (st) => (st.jiskry.length ? snimek(st) : -1) },
  ],
};
