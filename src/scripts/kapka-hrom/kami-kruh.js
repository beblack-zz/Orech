/*
 * 01, Kami — KRUH HROMU
 *
 * Raidžin, bůh hromu, nosí za zády kruh bubnů a stojí na mraku. Kapka
 * taky: sedm bubnů z rumělkového laku na černé obruči, na každém se točí
 * mitsudomoe a každý je naladěný jinak. Na dva dolní dosáhne paličkami.
 * Na ostatní ne — a tak do nich bije stuhou: konce si provlékla obručí,
 * vlají ven do stran, a když je potřeba, švihnou po bubnu jako dlouhý
 * rukáv tanečnice.
 *
 * „Bubnuju já. Prší potom samo." Z mráčku pod jejími geta po každé ráně
 * víc prší (kapky jsou v barvách loga) a uvnitř se v něm blýská. Kdo
 * rozezní všech sedm bubnů krátce po sobě, spustí průtrž — a po ní se
 * nad kruhem na chvíli ukáže duha v barvách soumraku ze značky.
 *
 * Kliknutí na buben: udeří do něj (paličkou, nebo stuhou). Tažení se
 * stisknutým tlačítkem přes bubny je víření. Myš: kouká za kurzorem,
 * buben pod ním se roztočí a rychlý pohyb je vítr do stuh. Když se nic
 * neděje, hraje si sama: paličky drží puls, stuhy odpovídají dokola
 * a nakonec všechno naráz.
 */
import {
  f, rng, clamp, lerp, smooth, rad, deg, pt, mrkani, kCili, vzorkuj, kapickaD, chomac,
  KAP, RAMENA, SOUMRAK, kapDefs, kapTelo, kapGeta, kapNohy, kapTvar, kapRuka, naGeta, svih,
  bubenDefs, bubenSvg, znakBubnu, stuhaDefs, stuhaSvg, poCare, novyProvaz, krokProvazu, hodProvazem,
  mrakDefs, mrakZadni, mrakPredni, mrakSvit,
} from "./spolecne.js";

const ID = "kh1";
const K = 0.7;
/* kde stojí: spodek geta na plátně */
const PATA = [90, 143];
const POSTAVA = `translate(${PATA[0]} ${PATA[1]}) scale(${K}) translate(-90 -${KAP.pata})`;
const vPostave = (s) => `<g transform="${POSTAVA}">${s}</g>`;
const naPlatno = ([x, y]) => [PATA[0] + (x - 90) * K, PATA[1] + (y - KAP.pata) * K];
const zPlatna = ([x, y]) => [90 + (x - PATA[0]) / K, KAP.pata + (y - PATA[1]) / K];
const TVAR0 = naPlatno([90, 98]);

/* ——— Kruh: sedm bubnů po 37,5°, dole za ní a za mrakem obruč jen probíhá ——— */
const C = [90, 78], R = 50, RB = 11.2;
const UHLY = [157.5, 195, 232.5, 270, 307.5, 345, 22.5];
const BUBNY = UHLY.map((u, i) => ({ i, u, x: C[0] + R * Math.cos(rad(u)), y: C[1] + R * Math.sin(rad(u)) }));
const N_BUBNU = BUBNY.length;
/* kdo na který dosáhne: PL/PP palička, SL/SP stuha; do horního smí obě stuhy */
const KDO = ["PL", "SL", "SL", "S", "SP", "SP", "PP"];
/* ladění: dole po stranách nejhlubší, nahoře nejvyšší (pentatonika) */
const LADENI = [0.75, 1, 1.26, 1.68, 1.5, 1.125, 0.84];

/* ——— Paličky ——— */
const KLID = { L: -115, P: -65 };
const smerK = (r, i) => {
  const [x, y] = zPlatna([BUBNY[i].x, BUBNY[i].y]);
  return deg(Math.atan2(y - RAMENA[r][1], x - RAMENA[r][0]));
};
const UDER = { L: smerK("L", 0), P: smerK("P", 6) };
/* úhel jde kratší cestou (vlevo přes −180°) */
const kratsi = (z, k) => z + ((((k - z) % 360) + 540) % 360) - 180;

/* ——— Stuhy: kořen za ramenem, průvlak mezerou mezi dolním a druhým bubnem, konec vlaje venku ——— */
const N = 30, DELKA = 68, CLANEK = DELKA / (N - 1), NAPRAH = 0.22;
const KOREN = { L: naPlatno([62, 92]), P: naPlatno([118, 92]) };
const mezera = (u) => [C[0] + (R + 1) * Math.cos(rad(u)), C[1] + (R + 1) * Math.sin(rad(u))];
const PRUVLAK = { L: mezera(176.25), P: mezera(3.75) };
const ZACATEK = {
  L: [KOREN.L, [56, 87], PRUVLAK.L, [27, 84], [16, 94], [9, 108]],
  P: [KOREN.P, [124, 87], PRUVLAK.P, [153, 84], [164, 94], [171, 108]],
};
const M = Math.round((Math.hypot(PRUVLAK.L[0] - 56, PRUVLAK.L[1] - 87) + Math.hypot(56 - KOREN.L[0], 87 - KOREN.L[1])) / CLANEK) + 1;

/* ——— Když se nic neděje: čas, buben, síla, kdo (jinak podle KDO), velký úder ——— */
const PERIODA = 14;
const VZOR = [
  [0.6, 0, 0.7], [0.9, 6, 0.7], [1.2, 0, 0.75], [1.35, 6, 0.65], [1.5, 0, 0.8],
  [1.8, 1, 0.75], [2.1, 5, 0.75], [2.4, 2, 0.8], [2.7, 4, 0.8],
  [3.0, 0, 0.8], [3.15, 6, 0.8], [3.3, 0, 0.85], [3.45, 6, 0.85],
  [3.75, 1, 0.8], [3.9, 5, 0.8],
  [4.5, 0, 1, null, true], [4.5, 6, 1, null, true], [4.5, 3, 1, "SL", true], [4.5, 3, 1, "SP", true, true],
];
const TICHO = 6;
/* průtrž: jak dlouho leje, kdy se ukáže duha a kdy zmizí */
const LIJE = 3.4, DUHA_OD = 3, DUHA_DO = 8.6, PO_PRUTRZI = 10;

const houpani = (t) => 1.5 * Math.sin(t * 1.15);
const BARVY_DESTE = ["#3F4C94", "#3F4C94", "#4E4A84", "#7A5E8E", "#C0708A", "#3F4C94", "#C4432B"];
const KAPKA_D = kapickaD(3.4);

/* ——— Vrstvy ——— */
const vrstvaNimbus = () => {
  let kruhy = "";
  for (const [r, op] of [[14, 0.2], [22, 0.24], [30, 0.3], [38, 0.36]]) kruhy += `<circle cx="${C[0]}" cy="${C[1]}" r="${r}" fill="none" stroke="#86AFD6" stroke-width="0.45" opacity="${op}"/>`;
  return `<circle cx="${C[0]}" cy="${C[1]}" r="${R}" fill="url(#${ID}-nimbus)"/>` + kruhy;
};
const vrstvaDuha = () => {
  let s = "";
  SOUMRAK.slice(0, 4).forEach((b, i) => {
    const r = 65.4 + i * 3.1;
    const A = [C[0] + r * Math.cos(rad(203)), C[1] + r * Math.sin(rad(203))], B = [C[0] + r * Math.cos(rad(337)), C[1] + r * Math.sin(rad(337))];
    s += `<path d="M${pt(A)} A${r} ${r} 0 0 1 ${pt(B)}" stroke="${b}" stroke-width="3.1" stroke-linecap="round" fill="none"/>`;
  });
  return `<g opacity="0.5" mask="url(#${ID}-duha-maska)">${s}</g>`;
};
/* dva malé obláčky po stranách, co se drží toho velkého */
const vrstvaOblacky = () =>
  `<g fill="url(#${ID}-oblacek)"><path d="${chomac(20, 153, 13, 6, 10, 31, 0.35, 0.68)}"/><path d="${chomac(163, 150, 11, 5.4, 9, 33, 0.35, 0.68)}"/></g>` +
  `<g fill="#F3F0FB" opacity="0.6"><path d="${chomac(17, 150.2, 5.4, 2.4, 8, 35, 1, 0.7)}"/><path d="${chomac(160.6, 147.4, 4.6, 2.1, 8, 37, 1, 0.7)}"/></g>`;
const vrstvaKruh = () =>
  `<circle cx="${C[0]}" cy="${C[1]}" r="${R}" fill="none" stroke="#1F1A17" stroke-width="3.2"/>` +
  `<circle cx="${C[0]}" cy="${C[1]}" r="${R}" fill="none" stroke="#D9B25E" stroke-width="0.6" stroke-dasharray="8 1.6 2.4 1.6" opacity="0.85"/>` +
  `<circle cx="${C[0]}" cy="${C[1]}" r="${R - 1.1}" fill="none" stroke="#3A302A" stroke-width="0.45" opacity="0.7"/>` +
  BUBNY.map((b) => `<g transform="translate(${f(b.x)} ${f(b.y)})">${bubenSvg(ID, RB)}</g>`).join("");
/* co se na bubnech hýbe: úder (buben poskočí a kůže zesvětlá), znak a kroužek pod kurzorem */
const vrstvaBubny = (st) => {
  let s = "";
  for (const b of BUBNY) {
    const B = st.bubny[b.i];
    s += `<g transform="translate(${f(b.x)} ${f(b.y)})">`;
    if (B.puls > 0.01 || B.zar > 0.01) s += `<g transform="scale(${f(1 + B.puls * 0.12)})">${bubenSvg(ID, RB, { zar: B.zar, bok: false })}</g>`;
    s += znakBubnu(RB, B.a, { puls: B.puls });
    if (st.nad === b.i) s += `<circle r="${f(RB + 1.7)}" fill="none" stroke="#FFE7A3" stroke-width="0.9" opacity="0.9"/>`;
    s += `</g>`;
  }
  return s;
};
/* po úderu se od bubnu rozejde kruh, jako když kápne do louže */
const vrstvaVlny = (st) =>
  st.vlny
    .map((v) => {
      const q = v.vek / 0.7;
      return (
        `<circle cx="${f(v.x)}" cy="${f(v.y)}" r="${f(RB + 1.5 + q * 15)}" fill="none" stroke="#C4432B" stroke-width="${f(1.2 * (1 - q) * v.sila)}" opacity="${f(0.7 * (1 - q))}"/>` +
        `<circle cx="${f(v.x)}" cy="${f(v.y)}" r="${f(RB + 1.5 + q * 8)}" fill="none" stroke="#6B5D4F" stroke-width="${f(0.6 * (1 - q))}" opacity="${f(0.45 * (1 - q))}"/>`
      );
    })
    .join("");
const vrstvaDest = (st) =>
  st.dest
    .map((k) => `<path d="${KAPKA_D}" transform="translate(${f(k.x)} ${f(k.y)}) scale(${f(k.r)})" fill="${BARVY_DESTE[k.b]}" opacity="${f(0.85 * clamp((k.y - k.y0) / 3) * clamp((184 - k.y) / 9))}"/>`)
    .join("");
/* kapičky, co úder setřese z kůže bubnu */
const vrstvaKapicky = (st) =>
  st.kapky
    .map((k) => {
      const q = k.vek / k.zivot;
      return `<circle cx="${f(k.x)}" cy="${f(k.y)}" r="${f(k.r * (1 - q * 0.5))}" fill="${k.svetla ? "#DDEFFA" : "#7FB4D8"}" opacity="${f(0.9 * (1 - q * q))}"/>`;
    })
    .join("");
const SIRKA_STUHY = (s) => lerp(7.2, 3.8, Math.pow(s, 1.2));
const vrstvaStuhy = (st) =>
  ["L", "P"]
    .map((strana) => {
      const S = st.stuhy[strana];
      const zkrut = (s) => Math.cos(Math.PI * 1.5 * (s - 0.5) + 0.45 * Math.sin(st.t * 1.1 + s * 4 + S.faze));
      return stuhaSvg(ID, vzorkuj(S.pr.p, 3), SIRKA_STUHY, zkrut);
    })
    .join("");
const vrstvaTvar = (st) => vPostave(naGeta(kapTvar({ dx: st.pohled[0], dy: st.pohled[1], mrk: st.mrk, vyraz: st.vyraz })));
const vrstvaRuce = (st) => vPostave(kapRuka("L", st.ruce.L) + kapRuka("P", st.ruce.P));

const defs = () =>
  kapDefs(ID) + bubenDefs(ID) + stuhaDefs(ID) + mrakDefs(ID) +
  `<radialGradient id="${ID}-zare" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#F2F6FD" stop-opacity="0.85"/><stop offset="0.5" stop-color="#DCD6EE" stop-opacity="0.34"/><stop offset="1" stop-color="#DCD6EE" stop-opacity="0"/></radialGradient>` +
  `<linearGradient id="${ID}-duha-prechod" gradientUnits="userSpaceOnUse" x1="0" y1="26" x2="0" y2="58"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>` +
  `<mask id="${ID}-duha-maska" maskUnits="userSpaceOnUse" x="0" y="-10" width="180" height="80"><rect x="0" y="-10" width="180" height="80" fill="url(#${ID}-duha-prechod)"/></mask>` +
  `<linearGradient id="${ID}-oblacek" gradientUnits="userSpaceOnUse" x1="0" y1="143" x2="0" y2="157"><stop offset="0" stop-color="#D3CEE9"/><stop offset="0.45" stop-color="#C2BCDF"/><stop offset="1" stop-color="#7B76AF"/></linearGradient>` +
  `<radialGradient id="${ID}-nimbus" cx="0.5" cy="0.5" r="0.5"><stop offset="0.25" stop-color="#EAF3FB" stop-opacity="0"/><stop offset="0.8" stop-color="#CFE2F4" stop-opacity="0.34"/><stop offset="1" stop-color="#B4CFEA" stop-opacity="0.6"/></radialGradient>`;

/* ——— Simulace ——— */
const bubenPod = (p, bob, k) => {
  let nej = -1, dNej = Infinity;
  for (const b of BUBNY) {
    const d = Math.hypot(p.x - b.x, p.y - b.y - bob);
    if (d < RB * k && d < dNej) {
      dNej = d;
      nej = b.i;
    }
  }
  return nej;
};
const naplanuj = (dyn, cas, buben, sila, { kdo = null, velky = false, tichy = false, vzor = false } = {}) => {
  let kym = kdo || KDO[buben];
  if (kym === "S") {
    dyn.stridani = !dyn.stridani;
    kym = dyn.stridani ? "SL" : "SP";
  }
  dyn.udery.push({ cas, buben, sila, kdo: kym, velky, tichy, vzor, hrano: false });
  dyn.udery.sort((a, b) => a.cas - b.cas);
};
const uzivatel = (dyn, t) => {
  dyn.posledniVstup = t;
  dyn.vzorOd = null;
  dyn.udery = dyn.udery.filter((u) => u.hrano || !u.vzor);
};
const zahraj = (dyn, u, t, bob) => {
  const R0 = dyn.nahoda;
  const b = BUBNY[u.buben], B = dyn.bubny[u.buben];
  const pan = clamp((b.x - 90) / 70, -1, 1);
  B.zar = Math.max(B.zar, u.sila);
  B.puls = Math.max(B.puls, u.sila);
  B.om += 420 * u.sila;
  dyn.hrano[u.buben] = t;
  dyn.posledni = { t, buben: u.buben, velky: u.velky };
  if (u.tichy) return;
  dyn.vlny.push({ x: b.x, y: b.y + bob, vek: 0, sila: u.sila });
  dyn.zvuk.push({ druh: "don", sila: 0.85 * u.sila, pan, ladeni: LADENI[u.buben] });
  if (u.kdo[0] === "S") dyn.zvuk.push({ druh: "plesk", sila: 0.5 * u.sila, pan });
  /* ostatní bubny se rozezní po obruči, čím dál, tím později */
  for (const o of BUBNY) if (o.i !== u.buben) dyn.ozveny.push({ cas: t + 0.05 + Math.abs(o.i - u.buben) * 0.045, buben: o.i, sila: u.sila * 0.3 });
  dyn.lije = Math.min(1.5, dyn.lije + 0.17 * u.sila);
  dyn.svit = Math.max(dyn.svit, 0.5 * u.sila);
  dyn.poryv = Math.min(2, dyn.poryv + 0.5 * u.sila);
  dyn.tempo += 1;
  dyn.dup = 1;
  /* z kůže odskočí pár kapiček, ven od středu kruhu */
  const ven = [(b.x - C[0]) / R, (b.y - C[1]) / R];
  for (let i = 0; i < 5; i++) {
    const a = Math.atan2(ven[1], ven[0]) + (R0() - 0.5) * 2.2;
    const v = 22 + R0() * 34;
    dyn.kapky.push({ x: b.x + Math.cos(a) * RB * 0.6, y: b.y + bob + Math.sin(a) * RB * 0.6, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 12, vek: 0, zivot: 0.45 + R0() * 0.3, r: 0.7 + R0() * 0.7, svetla: R0() < 0.4 });
  }
  /* všech sedm krátce po sobě: průtrž */
  if (t - dyn.prutrz > PO_PRUTRZI && dyn.hrano.every((h) => t - h < 6)) {
    dyn.prutrz = t;
    dyn.zvuk.push({ druh: "hrom", sila: 0.75, blizko: 0.45, pan: 0, za: 0.15 });
    dyn.zvuk.push({ druh: "duha", sila: 0.8, pan: 0, za: DUHA_OD + 0.2 });
    dyn.zvuk.push({ druh: "smich", sila: 0.6, pan: 0, za: 0.8 });
  }
};
const krokStuhy = (dyn, strana, t, h, bob) => {
  const k = strana === "L" ? -1 : 1;
  const S = dyn.stuhy[strana];
  const koren = [KOREN[strana][0], KOREN[strana][1] + bob];
  const u = dyn.udery.find((x) => !x.hrano && x.kdo === "S" + strana && t >= x.cas - NAPRAH);
  let spicka = null;
  if (u) {
    if (S.cil !== u) {
      S.cil = u;
      S.od = [S.pr.p[N - 1][0], S.pr.p[N - 1][1]];
      S.t0 = t - h;
    }
    const q = clamp((t - S.t0) / Math.max(0.03, u.cas - S.t0));
    const e = Math.pow(q, 1.8);
    const cil = [BUBNY[u.buben].x, BUBNY[u.buben].y + bob];
    const dx = cil[0] - S.od[0], dy = cil[1] - S.od[1];
    const d = Math.hypot(dx, dy) || 1;
    /* špička nejde rovně: nejdřív se rozmáchne do oblouku */
    const boule = Math.sin(Math.PI * q) * Math.min(13, d * 0.3) * k;
    spicka = [lerp(S.od[0], cil[0], e) + (-dy / d) * boule, lerp(S.od[1], cil[1], e) + (dx / d) * boule];
    /* hedvábí se při švihu trochu natáhne, jinak by na horní buben nedosáhlo */
    S.natah = Math.max(kCili(S.natah, 1, h, 0.18), (Math.hypot(spicka[0] - koren[0], spicka[1] - koren[1]) * 1.03) / DELKA);
    S.pruvlak = kCili(S.pruvlak, 0, h, 0.04);
  } else {
    if (S.cil) {
      /* právě udeřila: špička se od kůže odrazí zpátky ke kořeni */
      const p = S.pr.p[N - 1];
      const d = Math.hypot(koren[0] - p[0], koren[1] - p[1]) || 1;
      hodProvazem(S.pr, N - 1, [((koren[0] - p[0]) / d) * 46 + k * 26, ((koren[1] - p[1]) / d) * 46 - 8], h);
      S.cil = null;
      S.klid = t;
    }
    S.natah = kCili(S.natah, 1, h, 0.18);
    S.pruvlak = kCili(S.pruvlak, t - S.klid > 0.3 ? 1 : 0, h, 0.35);
  }
  const fl = 1 + 0.45 * dyn.poryv;
  const sila = (i, s, x, y) => {
    let ax, ay;
    if (i <= M) {
      /* uvnitř kruhu: jen se nadnáší, ať se od ramene k průvlaku klene */
      ax = k * 20;
      ay = -26 * Math.sin((Math.PI * i) / M);
    } else {
      /* venku: vítr ven a dolů, konec se vlní */
      const o = (i - M) / (N - 1 - M);
      ax = k * 64 + 40 * o * fl * Math.sin(t * 2.3 - o * 4.4 + S.faze);
      ay = 52 + 62 * o * fl * Math.sin(t * 3.1 - o * 5.6 + S.faze * 1.7);
    }
    ax += dyn.vitr[0] * 1.3 * s;
    ay += dyn.vitr[1] * 1.3 * s;
    return [ax, ay];
  };
  const vodice = S.pruvlak > 0.01 ? [{ i: M, bod: [PRUVLAK[strana][0], PRUVLAK[strana][1] + bob], sila: 0.5 * S.pruvlak }] : null;
  krokProvazu(S.pr, h, CLANEK * S.natah, { koren, sila, spicka, vodice, tlum: 1.5, iter: 8, hladkost: 0.035 });
};
const novaDynamika = () => ({
  bubny: BUBNY.map((b) => ({ a: b.i * 47, om: 0, puls: 0, zar: 0 })),
  hrano: BUBNY.map(() => -100),
  udery: [], ozveny: [], vlny: [], kapky: [], dest: [], akum: 0,
  stuhy: {
    L: { pr: novyProvaz(poCare(ZACATEK.L, N, CLANEK)), cil: null, od: null, t0: 0, klid: -10, pruvlak: 1, natah: 1, faze: 0.4 },
    P: { pr: novyProvaz(poCare(ZACATEK.P, N, CLANEK)), cil: null, od: null, t0: 0, klid: -10, pruvlak: 1, natah: 1, faze: 2.9 },
  },
  lije: 0, svit: 0, poryv: 0, tempo: 0, dup: 0, prutrz: -100, posledni: null, posledniVstup: -100, vzorOd: null, vzorI: 0,
  stridani: false, klavesa: -1, tazen: -1, nad: -1, vitr: [0, 0], mysPred: null, pohled: [0, 0],
  nahoda: rng(4711), zvuk: [],
});
const krok = (dyn, t, dt, vstup) => {
  const R0 = dyn.nahoda;
  const bob = houpani(t);
  /* myš: vítr do stuh a buben pod kurzorem */
  if (vstup.mys) {
    if (dyn.mysPred && dt > 0) {
      const v = [(vstup.mys.x - dyn.mysPred.x) / Math.max(dt, 0.004), (vstup.mys.y - dyn.mysPred.y) / Math.max(dt, 0.004)];
      const d = Math.hypot(v[0], v[1]) || 1;
      const m = Math.min(170, d) / d;
      dyn.vitr = [kCili(dyn.vitr[0], v[0] * m, dt, 0.12), kCili(dyn.vitr[1], v[1] * m, dt, 0.12)];
    }
    dyn.mysPred = { x: vstup.mys.x, y: vstup.mys.y };
    dyn.nad = bubenPod(vstup.mys, bob, 1.15);
  } else {
    dyn.mysPred = null;
    dyn.nad = -1;
  }
  dyn.vitr = [kCili(dyn.vitr[0], 0, dt, 0.5), kCili(dyn.vitr[1], 0, dt, 0.5)];
  if (vstup.kliky && vstup.kliky.length) {
    for (const p of vstup.kliky) {
      let i;
      if (p.klavesa) i = dyn.klavesa = (dyn.klavesa + 1) % N_BUBNU;
      else {
        i = bubenPod(p, bob, 1.5);
        if (i < 0) i = BUBNY.reduce((nej, b) => (Math.hypot(p.x - b.x, p.y - b.y) < Math.hypot(p.x - BUBNY[nej].x, p.y - BUBNY[nej].y) ? b.i : nej), 0);
      }
      uzivatel(dyn, t);
      naplanuj(dyn, t + (KDO[i][0] === "P" ? 0.1 : 0.16), i, 1);
      dyn.tazen = i;
    }
    vstup.kliky.length = 0;
  }
  /* tažení se stisknutým tlačítkem přes bubny: každý, na který kurzor vjede, dostane ránu */
  if (vstup.drzi && dyn.nad >= 0 && dyn.nad !== dyn.tazen) {
    uzivatel(dyn, t);
    naplanuj(dyn, t + (KDO[dyn.nad][0] === "P" ? 0.1 : 0.14), dyn.nad, 0.85);
    dyn.tazen = dyn.nad;
  }
  if (!vstup.drzi) dyn.tazen = -1;
  /* když se nic neděje, hraje sama */
  if (t - dyn.posledniVstup > TICHO) {
    if (dyn.vzorOd == null || t - dyn.vzorOd > PERIODA) {
      dyn.vzorOd = dyn.vzorOd == null ? t : dyn.vzorOd + PERIODA;
      dyn.vzorI = 0;
    }
    while (dyn.vzorI < VZOR.length && dyn.vzorOd + VZOR[dyn.vzorI][0] < t + 0.4) {
      const [c, b, s, kdo, velky, tichy] = VZOR[dyn.vzorI++];
      naplanuj(dyn, dyn.vzorOd + c, b, s, { kdo, velky: !!velky, tichy: !!tichy, vzor: true });
    }
  }
  for (const u of dyn.udery) {
    if (!u.hrano && t >= u.cas) {
      u.hrano = true;
      zahraj(dyn, u, t, bob);
    }
  }
  dyn.udery = dyn.udery.filter((u) => t - u.cas < 1.2);
  dyn.ozveny = dyn.ozveny.filter((o) => {
    if (t < o.cas) return true;
    const B = dyn.bubny[o.buben];
    B.puls = Math.max(B.puls, o.sila);
    B.om += 200 * o.sila;
    return false;
  });
  dyn.bubny.forEach((B, i) => {
    B.zar *= Math.exp(-dt / 0.22);
    B.puls *= Math.exp(-dt / 0.16);
    B.om *= Math.exp(-dt / 0.5);
    B.a += (24 + B.om + (i === dyn.nad ? 150 : 0)) * dt * (i % 2 ? -1 : 1);
  });
  /* průtrž: leje, v mraku se blýská */
  const uP = t - dyn.prutrz;
  if (uP >= 0 && uP < LIJE) {
    dyn.lije = Math.max(dyn.lije, 2.2 * smooth(uP / 0.4));
    if (R0() < dt * 2.4) {
      dyn.svit = Math.max(dyn.svit, 0.55 + R0() * 0.45);
      if (R0() < 0.35) dyn.zvuk.push({ druh: "hrom", sila: 0.4, blizko: 0.2, pan: R0() - 0.5 });
    }
  }
  dyn.lije = Math.max(0, dyn.lije - dt * (uP >= 0 && uP < LIJE ? 0 : 0.24 + dyn.lije * 0.35));
  dyn.svit *= Math.exp(-dt / 0.25);
  dyn.poryv *= Math.exp(-dt / 0.7);
  dyn.tempo *= Math.exp(-dt / 0.7);
  dyn.dup *= Math.exp(-dt / 0.12);
  /* déšť zpod mraku */
  dyn.akum += dt * (dyn.lije > 0.03 ? 5 + 30 * dyn.lije : 0);
  while (dyn.akum >= 1) {
    dyn.akum -= 1;
    const y0 = PATA[1] + 8.5 + R0() * 3 + bob;
    dyn.dest.push({ x: PATA[0] + (R0() - 0.5) * 98, y: y0, y0, vy: 44 + R0() * 30, r: 0.7 + R0() * 0.5, b: Math.floor(R0() * BARVY_DESTE.length) });
  }
  for (const k of dyn.dest) {
    k.vy += 70 * dt;
    k.y += k.vy * dt;
    k.x += dyn.vitr[0] * 0.05 * dt;
  }
  dyn.dest = dyn.dest.filter((k) => k.y < 184);
  for (const v of dyn.vlny) v.vek += dt;
  dyn.vlny = dyn.vlny.filter((v) => v.vek < 0.7);
  for (const k of dyn.kapky) {
    k.vek += dt;
    k.vy += 150 * dt;
    k.x += k.vx * dt;
    k.y += k.vy * dt;
  }
  dyn.kapky = dyn.kapky.filter((k) => k.vek < k.zivot);
  /* stuhy */
  if (dt > 0) {
    const kroku = Math.max(1, Math.ceil(dt / 0.017));
    const h = dt / kroku;
    for (let q = 1; q <= kroku; q++) for (const strana of ["L", "P"]) krokStuhy(dyn, strana, t - dt + h * q, h, bob);
  }
  /* pohled: za bubnem, do kterého právě bije, jinak za kurzorem; při průtrži dolů na déšť */
  let kam = vstup.mys ? [clamp((vstup.mys.x - TVAR0[0]) / 34, -1, 1) * 2, clamp((vstup.mys.y - TVAR0[1]) / 34, -1, 1) * 1.4] : [1.1 * Math.sin(t * 0.5), 0.3 * Math.sin(t * 0.37)];
  const dalsi = dyn.udery.find((u) => !u.hrano) || (dyn.posledni && t - dyn.posledni.t < 0.4 ? dyn.posledni : null);
  if (dalsi) {
    const b = BUBNY[dalsi.buben];
    const d = Math.hypot(b.x - TVAR0[0], b.y - TVAR0[1]) || 1;
    kam = [((b.x - TVAR0[0]) / d) * 2, ((b.y - TVAR0[1]) / d) * 1.4];
  }
  dyn.pohled = dyn.pohled.map((v, i) => kCili(v, kam[i], dt, 0.09));
};
const stav = (t, vstup = {}, dyn) => {
  const d = dyn || novaDynamika();
  const bob = houpani(t);
  const ruce = {};
  for (const r of ["L", "P"]) {
    let s = 0, aktivni = null;
    for (const u of d.udery) {
      if (u.kdo !== "P" + r) continue;
      const v = svih(t - u.cas);
      if (v !== 0 && (aktivni === null || u.cas > aktivni.cas)) {
        aktivni = u;
        s = v;
      }
    }
    const klid = KLID[r] + 4 * Math.sin(t * 1.3 + (r === "L" ? 0 : 1.7));
    ruce[r] = klid + (kratsi(klid, UDER[r]) - klid) * s;
  }
  const uP = t - d.prutrz;
  let vyraz = "klid";
  if (uP >= 0 && uP < 0.7) vyraz = "uzas";
  else if (uP >= 0.7 && uP < LIJE + 0.4) vyraz = "radost";
  else if (uP >= LIJE + 0.4 && uP < DUHA_DO - 0.6) vyraz = "blazena";
  else if (d.posledni && d.posledni.velky && t - d.posledni.t < 0.6) vyraz = "radost";
  else if (d.tempo > 2.6) vyraz = "zapal";
  return {
    t, bob, bubny: d.bubny, stuhy: d.stuhy, dest: d.dest, vlny: d.vlny, kapky: d.kapky, ruce, vyraz, pohled: d.pohled, nad: d.nad,
    svit: clamp(d.svit), lije: d.lije, dup: d.dup,
    duha: uP < DUHA_OD || uP > DUHA_DO + 1.6 ? 0 : smooth((uP - DUHA_OD) / 1.3) * (1 - smooth((uP - DUHA_DO) / 1.6)),
    zije: d.bubny.some((B) => B.puls > 0.01 || B.zar > 0.01),
    mrk: vyraz === "klid" || vyraz === "zapal" ? mrkani(t, [2.3, 5.9, 6.15, 9.2, 12.4], PERIODA) : 0,
  };
};
const snimek = (st) => Math.floor(st.t * 30);
const pohyb = (st) => ({ x: 0, y: st.bob, r: 0, ox: PATA[0], oy: PATA[1] });
/* tělo se pod každou ranou trochu zhoupne v kolenou */
const pohybTela = (st) => ({ ...pohyb(st), sx: 1 + 0.03 * st.dup, sy: 1 - 0.04 * st.dup });
const naMraku = (s) => `<g transform="translate(${PATA[0]} ${PATA[1]})">${s}</g>`;

export const kamiKruh = {
  id: "kruh",
  viewBox: "0 0 180 180",
  defs,
  novaDynamika,
  krok,
  stav,
  hukot: (st) => ({ dest: clamp(st.lije / 1.7), vitr: 0.1 }),
  kurzor: (st) => (st.nad >= 0 ? "pointer" : "default"),
  klidne: { t: 9.4 },
  vrstvy: [
    { id: "zare", kresli: () => `<circle cx="${C[0]}" cy="${C[1] + 6}" r="98" fill="url(#${ID}-zare)"/>`, pruhlednost: (st) => f(clamp(0.8 + 0.08 * Math.sin(st.t * 0.9) + 0.25 * st.svit)) },
    { id: "duha", kresli: vrstvaDuha, pruhlednost: (st) => f(st.duha) },
    { id: "dest", kresli: vrstvaDest, klic: (st) => (st.dest.length ? snimek(st) : -1) },
    { id: "nimbus", kresli: vrstvaNimbus, pohyb },
    { id: "kruh", kresli: vrstvaKruh, tezka: true, pohyb },
    { id: "bubny", kresli: vrstvaBubny, klic: (st) => (st.zije || st.nad >= 0 ? `${snimek(st)}` : `${Math.floor(st.t * 20)}`), pohyb },
    { id: "vlny", kresli: vrstvaVlny, klic: (st) => (st.vlny.length ? snimek(st) : -1) },
    { id: "oblacky", kresli: vrstvaOblacky, pohyb: (st) => ({ x: 0, y: 1.7 * Math.sin(st.t * 0.9 + 2), r: 0, ox: 90, oy: 150 }) },
    { id: "mrak-zadni", kresli: () => naMraku(mrakZadni(ID)), pohyb },
    { id: "mrak-zadni-svit", kresli: () => naMraku(mrakSvit(ID, "z")), pohyb, pruhlednost: (st) => f(st.svit) },
    { id: "stuhy", kresli: vrstvaStuhy, klic: snimek },
    { id: "geta", kresli: () => vPostave(kapGeta()), pohyb },
    { id: "telo", kresli: () => vPostave(kapTelo(ID) + kapNohy()), pohyb: pohybTela },
    { id: "tvar", kresli: vrstvaTvar, klic: (st) => `${f(st.pohled[0])},${f(st.pohled[1])},${f(st.mrk)},${st.vyraz}`, pohyb: pohybTela },
    { id: "mrak-predni", kresli: () => naMraku(mrakPredni(ID)), tezka: true, pohyb },
    { id: "mrak-predni-svit", kresli: () => naMraku(mrakSvit(ID, "p")), pohyb, pruhlednost: (st) => f(st.svit * 0.9) },
    { id: "ruce", kresli: vrstvaRuce, klic: (st) => `${f(st.ruce.L)},${f(st.ruce.P)}`, pohyb: pohybTela },
    { id: "kapicky", kresli: vrstvaKapicky, klic: (st) => (st.kapky.length ? snimek(st) : -1) },
  ],
};
