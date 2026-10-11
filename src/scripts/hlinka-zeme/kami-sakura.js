/*
 * 01, Kami — POD SAKUROU
 *
 * Hlínka spí u kořenů velkého stromu — tak to o ní stojí v partě. Strom je
 * posvátný (shinboku) a tisíciletý: převislá sakura, „vodopád květů“
 * takizakura. Kmen má tlustý a stočený, s dutinou u paty a se slaměným
 * provazem a papírky shide. Naklání se nad Hlínku zprava, větve podpírají
 * dřevěné berle hózue, jak se to starým sakurám dělá, a koruna jí nad
 * hlavou dělá výklenek, ve kterém visí bledý kotouč jako svatozář.
 *
 * Kreslená je stejně jako Hlínka s lampionem (./lampion.js): čistá hrouda
 * s měkkým světlem, žádná textura a žádný ostrov — pod ní je jen stín
 * a spadané lístky. Přehnaný je strom. Koruna má tři plány: vzadu oblaka
 * květů a bledé pruty, uprostřed hlavní záclona a úplně vpředu pár prutů
 * s velkými květy, které visí i přes Hlínku. Květy jsou pořád velké a je
 * jich pár druhů (zepředu ve třech odstínech, z boku, poupata, trsy na
 * stopkách), žádné tečky. Původní sakura (v1 v ./kresby.js) zůstala
 * v komponentě, na stránce není.
 *
 * Myš je vítr: mávnutí pošle korunou poryv jako vlnu, pruty se za ním
 * zhoupnou a dokmitají a strhne z nich lístky. Pomalý kurzor pruty jen
 * rozhrnuje jako ruka záclonu. Lístky ve vzduchu se kolem kurzoru zatočí a ty na zemi jdou
 * rozvířit. Padají a zůstávají ležet na zemi i na Hlínce; občas spadne
 * celý květ a zůstane jí na hlavě. Na výhonku jí mezitím vykvetl vlastní.
 * Kliknutí: jeden lístek jí přistane na nose, Hlínka se nadechne a kýchne,
 * otřes projde stromem od ní ven a spadne vánice lístků (hanafubuki);
 * další kliknutí do toho jen zafouká. Když ji někdo lechtá rychlým pohybem
 * myši, chichotá se. Na větvi sedí sedmihlásek uguisu a občas zazpívá,
 * mezi květy přeletují dva mejiro a uždibují je. V dutině u kořenů někdo
 * bydlí: kouká za kurzorem a na kliknutí vykoukne a zahouká.
 */
import {
  f, rng, clamp, lerp, smooth, rad, pt, hladka, vzorkuj, naCare, pasPoBodech, kvetD, LISTEK, pruzina, mrkani,
  HL, hlDefs, hlTelo, hlNohy, hlVyhonek, hlTvar, zzz, svetylko, kCili, pres, delky,
} from "./spolecne.js";

const ID = "hzk";
const ZEM = 160;
const FIG = { x: 84, s: 0.62 };
const POSTAVA = `translate(${FIG.x} ${ZEM}) scale(${FIG.s}) translate(-90 -${HL.spodek})`;
const vPostave = (s) => `<g transform="${POSTAVA}">${s}</g>`;
const naPanel = ([x, y]) => [FIG.x + (x - 90) * FIG.s, ZEM + (y - HL.spodek) * FIG.s];
const STRED = naPanel([90, 98]), R_TELA = 48 * FIG.s;
const NOS = [90, 101];
/* špička výhonku v kresbě Hlínky a kam na ní sedne květ */
const VYHONEK = { spicka: [95, 32], kvet: [96.8, 29.4] };
const KORA = "#5B4447", KORA_SV = "#8E7370", KORA_TM = "#3F2E31", VETEV = "#49363B";
const KOTOUC = { x: 86, y: 72, r: 50 };
const T_PADA = 0.9, T_SEDI = 0.75, T_NADECH = 0.6, T_KYCH = 0.4, T_PO = 1.4;

/* ——— Strom: starý kmen nakloněný zprava nad Hlínku ——— */
const KMEN = vzorkuj([[143, 164], [141.4, 151], [137.6, 137], [131.6, 122], [123.6, 107], [114.4, 93], [105.4, 80], [98.6, 69], [94.6, 59]], 5);
const sirkaKmene = (q) => lerp(23, 10, Math.pow(q, 0.75));
/* hrany zvlášť: u paty náběh do kořenů, cestou po jedné bouli */
const kmenL = (q) => sirkaKmene(q) / 2 + 5 * Math.exp(-q * 15) + 1.4 * Math.exp(-Math.pow((q - 0.58) / 0.07, 2));
const kmenP = (q) => sirkaKmene(q) / 2 + 6 * Math.exp(-q * 13) + 1.2 * Math.exp(-Math.pow((q - 0.24) / 0.06, 2));
/** Bod na kmeni: q po délce od paty, u napříč (−1 levá hrana, 1 pravá). */
const naKmeni = (q, u = 0) => {
  const { p, smer } = naCare(KMEN, q);
  const w = u * (u < 0 ? kmenL(q) : kmenP(q));
  return [p[0] - smer[1] * w, p[1] + smer[0] * w];
};
const KORENY = [
  [[[133, 153], [126.6, 158], [119, 161.2], [111, 162.6]], 7.4],
  [[[151, 152], [158, 157], [165, 160.2], [171.6, 161.4]], 6.4],
  [[[137, 156], [132.4, 161], [127, 164.2], [121, 165.6]], 7],
  [[[149, 156], [153.6, 161], [159, 164], [165, 165.2]], 6.6],
  [[[143, 157], [143.4, 162], [145.4, 166.6]], 6.4],
];
/*
 * Větve: dvě spodní nesou záclonu až k zemi, vůdčí výhon (pokračování kmene)
 * a dvě horní dělají kopuli, pět menších ji vyplňuje. `spodni` říká, čí pruty visí až dolů —
 * ostatní jen překrývají patro pod sebou.
 */
const VETVE = [
  { P: [[99, 71], [90, 56], [75, 45], [57, 39], [39, 40], [24, 47], [13, 58], [6, 71]], w: [8.6, 1.5], hlavni: true, spodni: 1 },
  { P: [[100, 69], [108, 56], [121, 46], [137, 40], [152, 41], [164.6, 48], [173, 58], [177, 71]], w: [8, 1.5], hlavni: true, spodni: 1 },
  { P: [[95.4, 61], [91, 46], [89.4, 32], [90.6, 20], [94.6, 10], [100, 4]], w: [6.2, 1.1], hlavni: true },
  { P: [[92.6, 53], [82, 40], [68, 28], [52, 19], [37, 16], [24, 19], [15, 27]], w: [4.8, 1] },
  { P: [[92, 50], [106, 38], [121, 26], [137, 18], [152, 17], [164, 22], [172, 31]], w: [4.8, 1] },
  { P: [[63, 40.4], [53, 31], [42, 27], [31, 29], [22, 36]], w: [2.8, 0.8], spodni: 0.5 },
  { P: [[131, 41.6], [142, 31], [154, 28], [164, 31], [171, 39]], w: [2.8, 0.8], spodni: 0.5 },
  { P: [[90.4, 35], [80, 24], [70, 13], [60, 7], [49, 5]], w: [2.8, 0.7] },
  { P: [[90.8, 21], [102, 19.4], [115, 14], [128, 10], [139, 9]], w: [2.4, 0.7] },
  { P: [[89.6, 28], [84.6, 17], [79, 9], [72.6, 4.6]], w: [2.2, 0.7] },
]
  /* celá koruna se musí vejít do plochy: boky k ose, vršek dolů */
  .map((v) => ({ ...v, P: v.P.map(([x, y]) => [92 + (x - 92) * 0.93, y < 44 ? y + (44 - y) * 0.13 : y]) }))
  .map((v) => ({ ...v, B: vzorkuj(v.P, 5) }));
const VUDCI = VETVE[2];
const sirkaVetve = (v, q) => lerp(v.w[0], v.w[1], Math.pow(q, 0.85));
/** Místo na větvi: bod na jejím hřbetu, `nad` jednotek nad ním. */
const naVetvi = (vi, s, nad = 0) => {
  const v = VETVE[vi];
  const { p } = naCare(v.B, s);
  return [p[0], p[1] - sirkaVetve(v, s) / 2 - nad];
};
/* berle pod konci spodních větví */
const PODPERY = [[0, 0.83, 3], [1, 0.83, -3]].map(([vi, s, dx]) => {
  const v = VETVE[vi];
  const { p } = naCare(v.B, s);
  const vrch = [p[0], p[1] + sirkaVetve(v, s) / 2 + 1];
  return { vrch, pata: [vrch[0] + dx, ZEM + 2.4] };
});

/*
 * Pruty jako vodopád: z větve vyrazí šikmo ven a pak padají. Nad Hlínkou
 * jsou krátké, po stranách sahají skoro k zemi, takže kolem ní koruna dělá
 * výklenek. Každý má dva až pět článků s klouby, při kreslení vnořené do
 * sebe — když se natočí horní kloub, jde s ním celý zbytek prutu.
 */
const oblouk = (x) => 72 + 84 * smooth((Math.abs(x - FIG.x) - 24) / 62);
let cisloPrutu = 0;
const novyPrut = (R, kotva, konecY, { clanku, m = 1, seed }) => {
  const dx = kotva[0] - 93, smer = dx < 0 ? -1 : 1, o = clamp(Math.abs(dx) / 84);
  const L = Math.max(15, Math.min(152, konecY) - kotva[1]);
  const n = clanku || (L < 36 ? 3 : L < 72 ? 4 : 5);
  const d0 = L * (n === 2 ? 0.42 : n === 3 ? 0.24 : 0.17);
  const J = [[kotva[0], kotva[1] + 0.5]];
  let x = clamp(kotva[0] + smer * (1.6 + 4.2 * o) * (0.7 + R() * 0.6), 6, 174), y = kotva[1] + 0.5 + d0;
  J.push([x, y]);
  for (let i = 1; i < n; i++) {
    x = clamp(x + smer * Math.max(0, 1.5 - i * 0.4) * o + (R() - 0.5) * 1.8, 6, 174);
    y += (L - d0) / (n - 1);
    J.push([x, y]);
  }
  return { J, n, L, o, m, fz: R() * 6.28, seed, x: kotva[0], dalka: Math.hypot(kotva[0] - STRED[0], kotva[1] - STRED[1]), i: cisloPrutu++ };
};
const prutyZVetvi = (seed, pocty, { posun = 0.6, clanku, uprav = (y) => y } = {}) => {
  const R = rng(seed), P = [];
  VETVE.forEach((v, vi) => {
    const pocet = pocty[vi] || 0;
    for (let k = 0; k < pocet; k++) {
      const s = lerp(0.26, 1, (k + 0.3 + R() * 0.4) / pocet);
      const { p } = naCare(v.B, s);
      let kY = oblouk(p[0]) + (R() - 0.5) * 10;
      if (!v.spodni) kY = Math.min(kY, p[1] + 30 + R() * 24);
      else if (v.spodni < 1) kY = Math.min(kY, p[1] + 46 + R() * 30);
      P.push(novyPrut(R, [p[0], p[1] + posun], uprav(kY, p[0]), { clanku, seed: seed * 13 + vi * 100 + k }));
    }
  });
  return P;
};

/* květ jako <use>: zepředu ve třech natočeních a třech odstínech, z boku, poupě, lístek a plochý květ do dálky */
const kvet = (x, y, m, r) => `<use href="#${ID}-k${(r < 0.55 ? 0 : r < 0.86 ? 3 : 6) + (Math.floor(r * 23) % 3)}" transform="translate(${f(x)} ${f(y)}) scale(${f(m)})"/>`;
const bok = (x, y, m, uhel, r) => `<use href="#${ID}-b${r < 0.6 ? 0 : 1}" transform="translate(${f(x)} ${f(y)}) rotate(${f(uhel)}) scale(${f(m)})"/>`;
const poupe = (x, y, m, uhel) => `<use href="#${ID}-poupe" transform="translate(${f(x)} ${f(y)}) rotate(${f(uhel)}) scale(${f(m)})"/>`;
const kvetZ = (x, y, m, r) => `<use href="#${ID}-z${Math.floor(r * 4)}" transform="translate(${f(x)} ${f(y)}) scale(${f(m)})"/>`;
const listecek = (x, y, m, uhel, r = 0) => `<path d="M0 0 C1.4 -1.6 3.6 -1.6 4.6 0 C3.6 1.2 1.4 1.2 0 0 Z" transform="translate(${f(x)} ${f(y)}) rotate(${f(uhel)}) scale(${f(m)})" fill="${r < 0.7 ? "#A6AB76" : "#C2A078"}" stroke="${r < 0.7 ? "#7C8556" : "#9A7A54"}" stroke-width="0.3"/>`;
/** Trs: z jednoho místa visí na stopkách tři čtyři květy, jak sakura opravdu kvete. */
const trs = (x, y, m, r) => {
  const n = 3 + (r() < 0.4 ? 1 : 0);
  let stopky = "", kvety = "";
  for (let i = 0; i < n; i++) {
    const a = rad(lerp(-40, 40, i / (n - 1)) + (r() - 0.5) * 14), L = (3 + r() * 2.6) * m;
    const ex = x + Math.sin(a) * L, ey = y + Math.cos(a) * L;
    stopky += `M${f(x)} ${f(y)} Q${f(x + Math.sin(a) * L * 0.2)} ${f(y + L * 0.6)} ${f(ex)} ${f(ey)}`;
    kvety += r() < 0.22 ? poupe(ex, ey, m * 0.9, 90 - (a * 180) / Math.PI) : r() < 0.3 ? bok(ex, ey - 1.4 * m, m * 0.9, (-a * 180) / Math.PI * 0.6, r()) : kvet(ex, ey, m * (0.85 + r() * 0.3), r());
  }
  return `<path d="${stopky}" stroke="#9C8A62" stroke-width="0.26" stroke-linecap="round" fill="none"/>${kvety}`;
};
/** Květy podél článku prutu: střídavě vlevo a vpravo, ke špičce menší a poupata. */
const kvetyClanku = (p, c, zadni) => {
  const r = rng(p.seed * 7 + c);
  const A = p.J[c], B = p.J[c + 1];
  const d = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1;
  const n = Math.max(1, Math.round(d / ((zadni ? 4.3 : 4.5) * p.m)));
  const nx = -(B[1] - A[1]) / d, ny = (B[0] - A[0]) / d;
  let s = "";
  for (let i = 0; i < n; i++) {
    const u = (i + 0.3 + r() * 0.4) / n, cely = (c + u) / p.n;
    const strana = (i + c) % 2 ? 1 : -1, off = (1.2 + r() * 1.7) * strana * p.m;
    const x = lerp(A[0], B[0], u) + nx * off, y = lerp(A[1], B[1], u) + ny * off;
    if (zadni) s += kvetZ(x, y, lerp(1.08, 0.72, cely) * (0.85 + r() * 0.3), r());
    else if (cely > 0.86 && r() < 0.65) s += poupe(x, y, (0.8 + r() * 0.3) * p.m, 60 + r() * 60);
    else {
      if (r() < 0.14) s += listecek(x, y, (0.8 + r() * 0.4) * p.m, strana > 0 ? 20 + r() * 40 : 120 + r() * 40, r());
      const m = lerp(1.12, 0.68, cely) * (0.86 + r() * 0.3) * p.m;
      s += r() < 0.12 ? bok(x, y - 1.6 * m, m, (r() - 0.5) * 44, r()) : kvet(x, y, m, r());
    }
  }
  return s;
};
/** Sada prutů, která se hýbe a kreslí stejně; `prvni` je číslo jejího prvního kloubu ve vlastní vrstvě. */
const novaSada = (pruty, { zadni = false, cara: barva = "#6B4A4C", tl = [0.8, 0.64, 0.52, 0.44, 0.38] } = {}) => {
  let prvni = 0;
  for (const p of pruty) {
    p.prvni = prvni;
    prvni += p.n;
    p.kvety = Array.from({ length: p.n }, (_, c) => kvetyClanku(p, c, zadni));
    if (!zadni) {
      /* u kotvy trs, ať prut nezačíná holou tyčkou */
      const r = rng(p.seed + 5);
      for (let i = 0; i < 2; i++) p.kvety[0] = kvet(p.J[0][0] + (r() - 0.5) * 3.6 * p.m, p.J[0][1] + 0.6 + r() * 2.4 * p.m, (0.95 + r() * 0.25) * p.m, r()) + p.kvety[0];
    }
  }
  return { pruty, barva, tl, kloubu: prvni };
};
const SADY = {
  zadni: novaSada(prutyZVetvi(2711, [7, 7, 2, 4, 4, 2, 2, 0, 0], { posun: 1.2, clanku: 2, uprav: (y, x) => (Math.abs(x - FIG.x) < 40 ? y - 9 : y + 3) }), { zadni: true, cara: "#C7A3AC", tl: [0.6, 0.45] }),
  stred: novaSada(prutyZVetvi(1904, [8, 7, 2, 4, 4, 2, 2, 2, 2, 2])),
  /* vpředu: po stranách dlouhé, uprostřed tři krátké přes rozsochu */
  predni: novaSada(
    (() => {
      const R = rng(606);
      return [[0, 0.95, 151], [0, 0.86, 144], [0, 0.72, 118], [1, 0.72, 113], [1, 0.86, 142], [1, 0.95, 151], [2, 0.5, 58], [3, 0.3, 63], [4, 0.34, 65]].map(([vi, s, kY], k) => {
        const { p } = naCare(VETVE[vi].B, s);
        return novyPrut(R, [p[0], p[1] + 0.8], kY, { m: 1.32, seed: 9000 + k });
      });
    })(),
    { cara: "#5E3F42", tl: [0.95, 0.78, 0.62, 0.52, 0.45] },
  ),
};
const VSECHNY_PRUTY = [...SADY.zadni.pruty, ...SADY.stred.pruty, ...SADY.predni.pruty];
/* lístky se trhají z prostředních a předních */
const TRHACI = [...SADY.stred.pruty, ...SADY.predni.pruty];
const NAD_NI = TRHACI.filter((p) => Math.abs(p.x - FIG.x) < 46);
const prutSvg = (S, p, uhly) => {
  let s = "";
  for (let c = p.n - 1; c >= 0; c--) {
    /* článek je mírný oblouk, který navazuje na směr předchozího */
    const A = p.J[c], B = p.J[c + 1], Z = c ? p.J[c - 1] : [A[0], A[1] - 1];
    const k = 0.32 * Math.hypot(B[0] - A[0], B[1] - A[1]) / (Math.hypot(A[0] - Z[0], A[1] - Z[1]) || 1);
    s =
      `<g data-u="${p.prvni + c}" transform="rotate(${f(uhly[p.prvni + c])} ${pt(A)})">` +
      `<path d="M${pt(A)} Q${f(A[0] + (A[0] - Z[0]) * k)} ${f(A[1] + (A[1] - Z[1]) * k)} ${pt(B)}" stroke="${S.barva}" stroke-width="${S.tl[c]}" stroke-linecap="round" fill="none"/>` +
      `${p.kvety[c]}${s}</g>`;
  }
  return s;
};
const vrstvaSady = (jmeno) => (st) => SADY[jmeno].pruty.map((p) => prutSvg(SADY[jmeno], p, st.uhly[jmeno])).join("");
/*
 * Každé natočení znamená překreslit celou vrstvu květů. Zadní sadě proto
 * stačí třicet změn za vteřinu a ostatním taky, dokud je klid — střídají se
 * pak se zadní, ať se v jednom snímku nepřekreslují všechny naráz.
 */
const uzlySady = (jmeno) => {
  let klic = null, out = null;
  return (st) => {
    const k = jmeno === "zadni" ? Math.floor(st.t * 30) : st.zive ? st.t : Math.floor(st.t * 30 + 0.5);
    if (k === klic) return out;
    klic = k;
    const U = st.uhly[jmeno];
    out = [];
    for (const p of SADY[jmeno].pruty) for (let c = 0; c < p.n; c++) out.push({ transform: `rotate(${f(U[p.prvni + c])} ${pt(p.J[c])})` });
    return out;
  };
};

/* ——— Dálka: oblaka květů na větvích, obrys jen kolem celého shluku ——— */
const MRAKY = (() => {
  const r = rng(515), K = [];
  for (const v of VETVE) {
    const D = delky(v.B), n = Math.max(2, Math.round(D[D.length - 1] / 7.5));
    for (let k = 0; k <= n; k++) {
      const q = lerp(0.16, 1, k / n);
      const { p } = naCare(v.B, q);
      const rr = lerp(10.5, 6.4, q) * (0.84 + r() * 0.36) * (v.hlavni ? 1 : 0.82);
      K.push([p[0] + (r() - 0.5) * 5, p[1] - rr * 0.34 + (r() - 0.5) * 3.6, rr]);
    }
  }
  /* a v rozsoše, ať tam neprosvítá kotouč */
  K.push([99, 30, 8.5], [84, 37, 8], [103, 42, 7.5], [78, 30, 7.5]);
  return K;
})();
const vrstvaMraky = () => {
  const kruhy = (fn) => MRAKY.map(fn).join("");
  return (
    `<g fill="none" stroke="#EBB3C4" stroke-width="1.1">${kruhy(([x, y, r]) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}"/>`)}</g>` +
    `<g fill="#F9DAE2">${kruhy(([x, y, r]) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}"/>`)}</g>` +
    /* světlo shora zleva a vroubek vpravo dole, ať je shluk oblý */
    `<g fill="#FDEFF3" opacity="0.8">${kruhy(([x, y, r]) => `<circle cx="${f(x - r * 0.2)}" cy="${f(y - r * 0.26)}" r="${f(r * 0.62)}"/>`)}</g>` +
    `<path d="${kruhy(([x, y, r]) => `M${f(x + r * 0.84)} ${f(y + r * 0.2)} A${f(r * 0.86)} ${f(r * 0.86)} 0 0 1 ${f(x + r * 0.1)} ${f(y + r * 0.86)}`)}" stroke="#EDB9C8" stroke-width="0.5" stroke-linecap="round" fill="none" opacity="0.5"/>`
  );
};

/* ——— Kmen, kořeny, větve, berle ——— */
const SHIME_Q = 0.4;
const DUTINA = { x: 139.6, y: 150.4, rx: 4.3, ry: 6.3 };
const DUTINA_D = `M${DUTINA.x - DUTINA.rx} ${DUTINA.y + DUTINA.ry} C${DUTINA.x - DUTINA.rx - 0.5} ${DUTINA.y - 1} ${DUTINA.x - DUTINA.rx * 0.62} ${DUTINA.y - DUTINA.ry} ${DUTINA.x + 0.3} ${DUTINA.y - DUTINA.ry} C${DUTINA.x + DUTINA.rx * 0.7} ${DUTINA.y - DUTINA.ry} ${DUTINA.x + DUTINA.rx + 0.5} ${DUTINA.y - 1} ${DUTINA.x + DUTINA.rx} ${DUTINA.y + DUTINA.ry} Z`;
const podpera = ({ pata, vrch }) => {
  const str = [(pata[0] + vrch[0]) / 2, (pata[1] + vrch[1]) / 2];
  let s = `<ellipse cx="${f(pata[0])}" cy="${ZEM + 2.2}" rx="6" ry="1.3" fill="#2B2420" opacity="0.16"/>`;
  s += `<path d="${pasPoBodech([pata, str, vrch], (q) => lerp(3.5, 2.7, q))}" fill="url(#${ID}-drevo)" stroke="#6F5F4E" stroke-width="0.4" stroke-linejoin="round"/>`;
  s += `<path d="M${f(pata[0] - 0.5)} ${f(pata[1] - 4)} L${f(vrch[0] - 0.4)} ${f(vrch[1] + 9)}" stroke="#7E6C59" stroke-width="0.4" stroke-linecap="round" opacity="0.45"/>`;
  /* sedlo, na kterém větev leží, a úvaz černým provázkem */
  const sedlo = `M${f(vrch[0] - 4.8)} ${f(vrch[1] - 1.6)} Q${f(vrch[0])} ${f(vrch[1] + 2.8)} ${f(vrch[0] + 4.8)} ${f(vrch[1] - 1.6)}`;
  s += `<path d="${sedlo}" stroke="#6F5F4E" stroke-width="3.3" stroke-linecap="round" fill="none"/><path d="${sedlo}" stroke="#A8957E" stroke-width="2.3" stroke-linecap="round" fill="none"/>`;
  for (let i = 0; i < 4; i++) s += `<path d="M${f(vrch[0] - 2)} ${f(vrch[1] + 4.2 + i * 0.95)} L${f(vrch[0] + 2)} ${f(vrch[1] + 4.7 + i * 0.95)}" stroke="#3A2F2B" stroke-width="0.7" stroke-linecap="round"/>`;
  for (let i = 0; i < 3; i++) s += `<path d="M${f(str[0] - 2.1)} ${f(str[1] + 18 + i * 0.95)} L${f(str[0] + 2.1)} ${f(str[1] + 18.5 + i * 0.95)}" stroke="#3A2F2B" stroke-width="0.7" stroke-linecap="round"/>`;
  return s;
};
const vrstvaStrom = () => {
  let s = PODPERY.map(podpera).join("");
  /* větve: hlavní mají světlo po hřbetu a pár lenticel */
  for (const v of VETVE) if (v !== VUDCI) s += `<path d="${pasPoBodech(v.B, (q) => sirkaVetve(v, q))}" fill="${VETEV}" stroke="${KORA_TM}" stroke-width="0.35" stroke-linejoin="round"/>`;
  for (const v of VETVE.filter((x) => x.hlavni)) {
    const hrbet = [];
    for (let i = 3; i <= 24; i++) {
      const q = i / 30, { p, smer } = naCare(v.B, q);
      const nahoru = smer[0] > 0 ? [smer[1], -smer[0]] : [-smer[1], smer[0]];
      hrbet.push([p[0] + nahoru[0] * sirkaVetve(v, q) * 0.26, p[1] + nahoru[1] * sirkaVetve(v, q) * 0.26]);
      if (i % 4 === 1) s += `<path d="M${f(p[0] - nahoru[0] * sirkaVetve(v, q) * 0.3)} ${f(p[1] - nahoru[1] * sirkaVetve(v, q) * 0.3)} L${f(p[0] + nahoru[0] * sirkaVetve(v, q) * 0.1)} ${f(p[1] + nahoru[1] * sirkaVetve(v, q) * 0.1)}" stroke="${KORA_SV}" stroke-width="0.5" stroke-linecap="round" opacity="0.6"/>`;
    }
    s += `<path d="${hladka(hrbet)}" stroke="#A98C86" stroke-width="0.6" stroke-linecap="round" fill="none" opacity="0.45"/>`;
  }
  /* kořeny se rozbíhají po zemi a mizí ve stínu */
  for (const [B, w] of KORENY) {
    const body = vzorkuj(B, 4);
    s += `<path d="${pasPoBodech(body, (q) => lerp(w, 0.9, Math.pow(q, 0.8)))}" fill="url(#${ID}-koren)" stroke="${KORA_TM}" stroke-width="0.4" stroke-linejoin="round"/>`;
    s += `<path d="${hladka(body.slice(2, -3).map(([x, y], i, a) => [x, y - lerp(w, 0.9, Math.pow((i + 2) / (a.length + 4), 0.8)) * 0.24]))}" stroke="#A98C86" stroke-width="0.5" stroke-linecap="round" fill="none" opacity="0.4"/>`;
  }
  /* kmen */
  const N = 44, L = [], P = [];
  for (let i = 0; i <= N; i++) {
    L.push(naKmeni(i / N, -1));
    P.push(naKmeni(i / N, 1));
  }
  /* nahoře kmen plynule přejde do vůdčího výhonu, ostatní větve z něj vycházejí zezadu */
  for (let j = 2; j <= 20; j++) {
    const q = j / 20, { p, smer } = naCare(VUDCI.B, q);
    const w = (sirkaVetve(VUDCI, q) + 3.6 * Math.exp(-q * 10)) / 2;
    L.push([p[0] + smer[1] * w, p[1] - smer[0] * w]);
    P.push([p[0] - smer[1] * w, p[1] + smer[0] * w]);
  }
  const kmenD = `${hladka([...L, ...P.slice().reverse()])} Z`;
  s += `<path d="${kmenD}" fill="url(#${ID}-kmen)" stroke="${KORA_TM}" stroke-width="0.6" stroke-linejoin="round"/>`;
  s += `<path d="${kmenD}" fill="url(#${ID}-kmen-stin)"/>`;
  /* stočené rýhy starého dřeva */
  for (const [faze, k] of [[0.5, 0.6], [2.4, 0.52], [4.5, 0.56]]) {
    const A = [], B = [];
    for (let i = 3; i <= 41; i++) {
      const q = i / N, u = k * Math.sin(q * 4.4 + faze);
      A.push(naKmeni(q, u));
      B.push(naKmeni(q, u - 0.07));
    }
    s += `<path d="${hladka(B)}" stroke="#A98C86" stroke-width="0.5" stroke-linecap="round" fill="none" opacity="0.22"/><path d="${hladka(A)}" stroke="${KORA_TM}" stroke-width="0.7" stroke-linecap="round" fill="none" opacity="0.5"/>`;
  }
  /* kůra sakury: příčné čárky lenticel; dole se prohýbají dolů, nahoře nahoru, jak se na kmen díváme zdola */
  const r = rng(41);
  let svetle = "", tmave = "";
  for (let i = 0; i < 17; i++) {
    const q = 0.07 + (0.84 * (i + r() * 0.9)) / 17;
    const a = -0.8 + r() * 1.2, b = Math.min(0.84, a + 0.16 + r() * 0.34);
    const A = naKmeni(q, a), B = naKmeni(q, b), { smer } = naCare(KMEN, q);
    if (Math.abs(q - SHIME_Q) < 0.04 || Math.hypot((A[0] + B[0]) / 2 - DUTINA.x, (A[1] + B[1]) / 2 - DUTINA.y) < 8.5) continue;
    const pr = lerp(1.5, -1.6, q) * (b - a);
    const C = [(A[0] + B[0]) / 2 - smer[0] * pr, (A[1] + B[1]) / 2 - smer[1] * pr];
    svetle += `M${pt(A)} Q${pt(C)} ${pt(B)}`;
    tmave += `M${f(A[0] - smer[0] * 0.6)} ${f(A[1] - smer[1] * 0.6)} Q${f(C[0] - smer[0] * 0.6)} ${f(C[1] - smer[1] * 0.6)} ${f(B[0] - smer[0] * 0.6)} ${f(B[1] - smer[1] * 0.6)}`;
  }
  s += `<path d="${tmave}" stroke="${KORA_TM}" stroke-width="0.45" stroke-linecap="round" fill="none" opacity="0.4"/><path d="${svetle}" stroke="${KORA_SV}" stroke-width="0.62" stroke-linecap="round" fill="none" opacity="0.6"/>`;
  /* světlo po levé hraně */
  s += `<path d="${hladka(L.slice(4, -3).map((_, i) => naKmeni((i + 4) / N, -0.86)))}" stroke="#B59A93" stroke-width="0.8" stroke-linecap="round" fill="none" opacity="0.5"/>`;
  /* dutina u paty: zával kůry kolem a tma uvnitř */
  s += `<path d="${DUTINA_D}" fill="none" stroke="#8A6F70" stroke-width="2.4" stroke-linejoin="round" opacity="0.7"/><path d="${DUTINA_D}" fill="url(#${ID}-dutina)" stroke="#2A1D1F" stroke-width="0.5" stroke-linejoin="round"/>`;
  /* květy přímo na větvích: nahoře trsy, pod větví visí další na stopkách */
  const k = rng(77);
  for (const v of VETVE) {
    const D = delky(v.B), n = Math.round(D[D.length - 1] / 5);
    for (let i = 1; i <= n; i++) {
      const q = (i - 0.5 + (k() - 0.5) * 0.5) / n;
      if (q < 0.14) continue;
      const { p } = naCare(v.B, q), w = sirkaVetve(v, q) / 2;
      if (k() < 0.42) s += trs(p[0] + (k() - 0.5) * 3, p[1] + w * 0.6, lerp(1.1, 0.86, q), k);
      const pocet = 2 + (k() < 0.5 ? 1 : 0);
      for (let j = 0; j < pocet; j++) s += kvet(p[0] + (k() - 0.5) * 7, p[1] - w - 0.4 - k() * 3.6, lerp(1.22, 0.86, q) * (0.85 + k() * 0.3), k());
      if (k() < 0.4) s += poupe(p[0] + (k() - 0.5) * 7, p[1] - w - 3.6 - k() * 2, 0.9, -90 + (k() - 0.5) * 70);
      if (k() < 0.2) s += listecek(p[0] + (k() - 0.5) * 6, p[1] - w - 2, 0.9 + k() * 0.4, -30 - k() * 120, k());
    }
  }
  return s;
};
/** Slaměný provaz kolem kmene, střapce a papírky, které se houpou ve větru. */
const SHIME = (() => {
  const { smer } = naCare(KMEN, SHIME_Q);
  const A = naKmeni(SHIME_Q, -1), B = naKmeni(SHIME_Q, 1);
  const ven = Math.hypot(B[0] - A[0], B[1] - A[1]);
  const a = [A[0] - ((B[0] - A[0]) / ven) * 1.6, A[1] - ((B[1] - A[1]) / ven) * 1.6], b = [B[0] + ((B[0] - A[0]) / ven) * 1.6, B[1] + ((B[1] - A[1]) / ven) * 1.6];
  /* uprostřed se provaz prověsí k patě */
  const c = [(a[0] + b[0]) / 2 - smer[0] * 3.4, (a[1] + b[1]) / 2 - smer[1] * 3.4];
  const bod = (q) => [(1 - q) * (1 - q) * a[0] + 2 * q * (1 - q) * c[0] + q * q * b[0], (1 - q) * (1 - q) * a[1] + 2 * q * (1 - q) * c[1] + q * q * b[1]];
  return { a, b, c, bod, smer };
})();
const SHIDE = "M0 0 h2.6 v3.2 h2 v3.2 h2 v3.6 h-2.8 v-3.2 h-2 v-3.2 h-1.8 Z";
const vrstvaProvaz = (st) => {
  const { a, b, c, bod, smer } = SHIME;
  let s = "";
  const kyv = (i) => st.vitr * 16 + 3 * Math.sin(st.t * 1.7 + i * 1.9) + st.otres * 12 * Math.sin(st.t * 28 + i);
  /* střapce ze slámy mezi papírky */
  [0.33, 0.67].forEach((q, i) => {
    const [x, y] = bod(q);
    let d = "";
    for (let j = -2; j <= 2; j++) d += `M${f(x + j * 0.3)} ${f(y + 1.6)} L${f(x + j * 0.85)} ${f(y + 7.6 - Math.abs(j) * 0.5)}`;
    s += `<g transform="rotate(${f(kyv(i + 5) * 0.6)} ${f(x)} ${f(y + 1)})"><path d="${d}" stroke="#C9AE6C" stroke-width="0.55" stroke-linecap="round"/><path d="M${f(x - 0.9)} ${f(y + 2.6)} h1.8" stroke="#8A6E3A" stroke-width="0.7" stroke-linecap="round"/></g>`;
  });
  [0.14, 0.5, 0.86].forEach((q, i) => {
    const [x, y] = bod(q);
    s += `<path d="${SHIDE}" transform="translate(${f(x - 1.5)} ${f(y + 1.2)}) rotate(${f(kyv(i))} 1.4 0) scale(0.94)" fill="#FFFDF6" stroke="#B5A78C" stroke-width="0.35" stroke-linejoin="round"/>`;
  });
  const lano = `M${pt(a)} Q${pt(c)} ${pt(b)}`;
  s += `<path d="${lano}" stroke="#7E6433" stroke-width="5.4" stroke-linecap="round" fill="none"/><path d="${lano}" stroke="#DCC384" stroke-width="4.1" stroke-linecap="round" fill="none"/>`;
  /* zkrut: šikmé čárky po celé délce, nahoře světlo */
  let zkrut = "", lesk = "";
  for (let i = 0; i <= 9; i++) {
    const [x, y] = bod(0.04 + i * 0.102);
    zkrut += `M${f(x - 1 + smer[0] * 1.7)} ${f(y + smer[1] * 1.7)} L${f(x + 1 - smer[0] * 1.7)} ${f(y - smer[1] * 1.7)}`;
    lesk += `M${f(x + 0.3 + smer[0] * 1.2)} ${f(y + smer[1] * 1.2)} L${f(x + 1.5 + smer[0] * 1.3)} ${f(y + 0.5 + smer[1] * 1.3)}`;
  }
  s += `<path d="${zkrut}" stroke="#A88B4E" stroke-width="0.6" stroke-linecap="round"/><path d="${lesk}" stroke="#F3E3B4" stroke-width="0.5" stroke-linecap="round" opacity="0.8"/>`;
  return s;
};

/* ——— Zem: žádný ostrov, jen stíny a co napadalo ——— */
const vrstvaZem = () =>
  `<ellipse cx="92" cy="${ZEM + 1.6}" rx="86" ry="7" fill="url(#${ID}-stin)"/>` +
  `<ellipse cx="${FIG.x - 1}" cy="${ZEM + 0.3}" rx="26" ry="2.6" fill="#2B2420" opacity="0.16"/>` +
  `<ellipse cx="143" cy="${ZEM + 3}" rx="30" ry="3.2" fill="#2B2420" opacity="0.15"/>`;
const listekSvg = (x, y, rot, mx, my, op = 1) => `<use href="#${ID}-listek" transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(${f(mx)} ${f(my)})"${op < 0.99 ? ` opacity="${f(op)}"` : ""}/>`;
/** Celý utržený květ; `my` ho zplošťuje, když se ve vzduchu převrací nebo leží. */
const celyKvet = (k, x, y, rot, mx, my, op = 1) => `<use href="#${ID}-k${k}" transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(${f(mx)} ${f(my)})"${op < 0.99 ? ` opacity="${f(op)}"` : ""}/>`;
const vrstvaLezici = (st) => st.lezici.map((l) => (l.k != null ? celyKvet(l.k, l.x, l.y, l.rot, l.m, l.m * 0.56) : listekSvg(l.x, l.y, l.rot, l.m, l.m * 0.52))).join("");
const vrstvaKotouc = () =>
  `<circle cx="${KOTOUC.x}" cy="${KOTOUC.y}" r="${KOTOUC.r + 16}" fill="url(#${ID}-zare)"/>` +
  `<circle cx="${KOTOUC.x}" cy="${KOTOUC.y}" r="${KOTOUC.r}" fill="url(#${ID}-kotouc)"/>` +
  `<circle cx="${KOTOUC.x}" cy="${KOTOUC.y}" r="${KOTOUC.r - 0.4}" fill="none" stroke="#EFD49C" stroke-width="0.5" opacity="0.7"/>`;

/* ——— Ptáci: sedmihlásek zpívá na levé větvi, dva mejiro přeletují po koruně ——— */
const BIDLO = naVetvi(0, 0.47, 4.6);
const BIDLA = [[3, 0.52], [2, 0.82], [4, 0.5], [1, 0.52], [0, 0.72], [6, 0.6], [7, 0.62], [8, 0.6]].map(([vi, s]) => naVetvi(vi, s, 3.9));
const UGUISU = { m: 1, telo: "#9BA06A", obrys: "#6B7048", bricho: "#E9E4C6", kridlo: "#84895A", ocas: "#7C8052" };
const MEJIRO = { m: 0.8, telo: "#A9B653", obrys: "#6F7A3A", bricho: "#F0ECD8", kridlo: "#8D9B46", ocas: "#7F8B3E", hrdlo: "#E4D45C", krouzek: true };
const NOTA = "M0 0 V-4.6 L2.6 -5.4 V-4.2 L0.7 -3.6 V0.2 A1.3 1 0 1 1 0 0 Z";
const ptakSvg = (x, y, b, B) => {
  let s = `<g transform="translate(${f(x)} ${f(y)}) scale(${f((b.smer || 1) * B.m)} ${B.m}) rotate(${f(b.naklon)})">`;
  s += `<path d="M-4.2 0.4 L-10 ${f(2.2 - b.zpev * 2.4)} L-9.4 ${f(0.2 - b.zpev * 2.4)} L-4.6 -1.2 Z" fill="${B.ocas}"/>`;
  if (!b.leti) s += `<path d="M-0.8 3.2 v1.8 M1.2 3.2 v1.8" stroke="#6B5D4F" stroke-width="0.5" stroke-linecap="round"/>`;
  s += `<ellipse cx="0" cy="0" rx="5" ry="${f(3.6 + 0.5 * b.zpev)}" fill="${B.telo}" stroke="${B.obrys}" stroke-width="0.4"/>`;
  s += `<path d="M-3.6 1.3 Q0.2 4.6 4 0.9 Q1 2.9 -3.6 1.3 Z" fill="${B.bricho}"/>`;
  if (B.hrdlo) s += `<path d="M1.4 0.9 Q4.6 1.2 5.6 -1 Q4.4 2.6 1.4 0.9 Z" fill="${B.hrdlo}"/>`;
  s += `<path d="M-3.2 -0.8 Q0 -2.6 2.4 0 Q-0.4 1.6 -3.6 0.8 Z" transform="rotate(${f(-b.kridla * 62)} -3 0) scale(${b.leti ? 1.25 : 1})" fill="${B.kridlo}" stroke="${B.obrys}" stroke-width="0.3"/>`;
  s += `<circle cx="4.2" cy="-2.6" r="2.7" fill="${B.telo}" stroke="${B.obrys}" stroke-width="0.4"/>`;
  if (B.krouzek) s += `<circle cx="5" cy="-2.8" r="1.15" fill="#FFFFFF"/><circle cx="5.05" cy="-2.8" r="0.58" fill="#2B2420"/>`;
  else s += `<path d="M3 -3.7 Q4.6 -4.6 6.2 -3.6" stroke="${B.bricho}" stroke-width="0.5" stroke-linecap="round" fill="none"/><circle cx="5" cy="-2.8" r="0.6" fill="#2B2420"/><circle cx="5.2" cy="-3" r="0.2" fill="#FFFFFF"/>`;
  s += `<path d="M6.6 -2.9 L9.4 -2.5 L6.7 -2.2 Z" transform="rotate(${f(-18 * b.zpev)} 6.7 -2.5)" fill="#6B5D4F"/><path d="M6.6 -2.4 L9 -2.2 L6.7 -1.8 Z" transform="rotate(${f(16 * b.zpev)} 6.7 -2.2)" fill="#55493E"/>`;
  return s + `</g>`;
};
const noty = (x, y, u0, barva) => {
  let s = "";
  for (let i = 0; i < 3; i++) {
    const u = u0 * 1.25 - i * 0.22;
    if (u <= 0 || u >= 1) continue;
    s += `<path d="${NOTA}" transform="translate(${f(x + u * 9 + Math.sin(u * 6 + i) * 2)} ${f(y - u * 13)}) rotate(${f(-10 + i * 12)}) scale(0.9)" fill="${barva}" opacity="${f(Math.sin(Math.PI * u))}"/>`;
  }
  return s;
};
const vrstvaPtaci = (st) => {
  const b = st.ptak;
  let s = ptakSvg(BIDLO[0], BIDLO[1] - b.vyska, { ...b, leti: b.vyska > 0.4 }, UGUISU);
  /* když zpívá, stoupají od zobáku noty */
  if (b.noty > 0) s += noty(BIDLO[0] + 11, BIDLO[1] - b.vyska - 4, b.noty, "#7C8556");
  for (const m of st.mejiro) s += ptakSvg(m.x, m.y, m, MEJIRO);
  return s;
};

/* ——— Kdo bydlí v dutině: sýček, ze kterého jsou většinou vidět jen oči ——— */
const vrstvaDutina = (st) => {
  const o = st.sova, { x, y } = DUTINA;
  const cy = y - 0.6 - o.ven * 1.3, m = 1 + 0.16 * o.ven;
  let s = `<g clip-path="url(#${ID}-dutina-orez)"><g transform="translate(${f(x)} ${f(cy)}) scale(${f(m)})">`;
  if (o.ven > 0.02)
    s +=
      `<g opacity="${f(o.ven)}"><path d="M-3.9 7 C-4.6 0 -4 -3.4 -2.6 -4.2 L-2 -3 Q0 -3.8 2 -3 L2.6 -4.2 C4 -3.4 4.6 0 3.9 7 Z" fill="#8C7762"/>` +
      `<circle cx="-1.55" cy="-0.6" r="1.9" fill="#D4C2A8"/><circle cx="1.55" cy="-0.6" r="1.9" fill="#D4C2A8"/>` +
      `<path d="M-0.6 0.5 L0.6 0.5 L0 ${f(1.9 + o.houka * 0.5)} Z" fill="#E0A73C"/>` +
      `<path d="M-2.4 3.4 q0.8 0.8 1.6 0 M0.8 3.4 q0.8 0.8 1.6 0 M-0.8 5 q0.8 0.8 1.6 0" stroke="#6F5D4B" stroke-width="0.35" stroke-linecap="round" fill="none"/></g>`;
  const r = 1.02 * (1 + 0.22 * o.siroke), ry = r * Math.max(0.08, 1 - o.mrk);
  for (const ex of [-1.55, 1.55]) {
    s += `<ellipse cx="${ex}" cy="-0.6" rx="${f(r)}" ry="${f(ry)}" fill="#F4C552"/>`;
    if (o.mrk < 0.6) s += `<circle cx="${f(ex + o.dx * 0.34)}" cy="${f(-0.6 + o.dy * 0.3)}" r="${f(0.5 - 0.12 * o.siroke)}" fill="#2B2420"/>`;
  }
  s += `</g></g>`;
  if (o.noty > 0) s += noty(x + 4, y - 7, o.noty, KORA_SV);
  return s;
};

/* ——— Hlínka: čistá hrouda jako u lampionu, světlo shora od kotouče ——— */
const vrstvaTelo = () => vPostave(hlNohy() + hlTelo(ID));
const vrstvaSvit = () =>
  vPostave(
    `<circle cx="90" cy="98" r="47.2" fill="url(#${ID}-stin-tela)"/>` +
      `<circle cx="90" cy="98" r="47.2" fill="url(#${ID}-svit)"/>`,
  );
/* světlo prosívané korunou: pár měkkých skvrn, které po hroudě pomalu putují s větrem */
const vrstvaSkvrny = (st) => {
  let s = "";
  for (let i = 0; i < 4; i++) {
    const x = 90 + 30 * Math.sin(st.t * 0.21 + i * 2.1) + st.vitr * 9, y = 74 + 13 * Math.sin(st.t * 0.17 + i * 1.3) + i * 4;
    s += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(9 + 2 * Math.sin(st.t * 0.5 + i))}" ry="6" transform="rotate(${f(-20 + i * 14)} ${f(x)} ${f(y)})" fill="url(#${ID}-skvrna)"/>`;
  }
  return vPostave(`<g clip-path="url(#${ID}-orez-tela)">${s}</g>`);
};
/* výhonek s vlastním květem: nejdřív poupě, pak se otevře */
const vrstvaVyhonek = (st) => {
  const p = st.puk;
  let s = "";
  if (p > 0.02 && p < 1.5) s += `<use href="#${ID}-poupe" transform="translate(${pt(VYHONEK.spicka)}) rotate(-56) scale(${f(1.75 * smooth(Math.min(1, p)) * (p > 1 ? 1 - (p - 1) * 2 : 1))})"/>`;
  if (p > 1) {
    const u = clamp(p - 1);
    s += `<path d="M${pt(VYHONEK.spicka)} L${pt(VYHONEK.kvet)}" stroke="#8C7A52" stroke-width="0.9" stroke-linecap="round"/>`;
    s += `<use href="#${ID}-k4" transform="translate(${pt(VYHONEK.kvet)}) rotate(14) scale(${f(1.8 * smooth(u) * (1 + 0.28 * Math.sin(Math.PI * u)))})"/>`;
  }
  return vPostave(hlVyhonek({ kyv: st.kyv }) + (s ? `<g transform="rotate(${f(st.kyv)} 90 54)">${s}</g>` : ""));
};
const vrstvaTvar = (st) => vPostave(hlTvar(ID, st.vyraz));
/* co jí zůstalo ležet na hlavě — lístky i celé květy — a ten jeden lístek na nose */
const vrstvaNaNi = (st) => {
  let s = "";
  for (const l of st.naNi) {
    const x = 90 + Math.sin(l.a) * 47.4, y = 98 - Math.cos(l.a) * 47.4, uhel = (l.a * 180) / Math.PI;
    s += l.k != null ? celyKvet(l.k, x, y - 0.6, l.rot + uhel, 1.75, 1.2) : listekSvg(x, y, l.rot + uhel, 1.9, 1.3);
  }
  if (st.naNose) s += listekSvg(NOS[0], NOS[1] - 1, 24 + 6 * Math.sin(st.t * 9) * st.naNose, 1.9, 1.5);
  return vPostave(s);
};
const vrstvaZzz = (st) => (st.spi > 0.04 ? zzz(st.t, STRED[0] - R_TELA * 1.02, STRED[1] - R_TELA * 0.98, { meritko: 1.1, sila: st.spi * 0.9 }) : "");
const vrstvaSvetylka = (st) => {
  let s = "";
  for (let i = 0; i < 3; i++) {
    const a = st.t * (0.5 + i * 0.13) + i * 2.6;
    s += svetylko(ID, STRED[0] + Math.cos(a) * (R_TELA + 12 + i * 5), STRED[1] + 6 + Math.sin(a * 1.4) * 15, 1.9 - 0.3 * i, 0.55 + 0.4 * Math.sin(st.t * 1.6 + i * 2));
  }
  return s;
};
const vrstvaListky = (st) => {
  let s = "";
  for (const l of st.listky) {
    const preklop = Math.cos(l.fz + l.vek * l.toc), op = clamp(l.vek / 0.2);
    s += l.k != null ? celyKvet(l.k, l.x, l.y, l.rot, l.m, l.m * (0.3 + 0.7 * Math.abs(preklop)), op) : listekSvg(l.x, l.y, l.rot, l.m, l.m * preklop, op);
  }
  /* ten, který míří na nos */
  if (st.cilovy) s += listekSvg(st.cilovy[0], st.cilovy[1], st.cilovy[2], 1.25, 1.1);
  return s;
};

const ODSTINY = [["kvet", "#E8AFC1"], ["kvet-t", "#DC8FA9"], ["kvet-s", "#CF7896"]];
const KVETY_DEFS = (() => {
  let s = "";
  for (let i = 0; i < 9; i++) {
    const [vypln, obrys] = ODSTINY[Math.floor(i / 3)], a = (i % 3) * 0.42;
    let nitky = "", prasniky = "";
    for (let k = 0; k < 5; k++) {
      const x = 1.08 * Math.sin(a + k * 1.257 + 0.63), y = -1.08 * Math.cos(a + k * 1.257 + 0.63);
      nitky += `M0 0L${f(x)} ${f(y)}`;
      prasniky += `M${f(x - 0.21)} ${f(y)}a0.21 0.21 0 1 0 0.42 0a0.21 0.21 0 1 0 -0.42 0`;
    }
    s +=
      `<g id="${ID}-k${i}"><path d="${kvetD(0, 0, 3, a)}" fill="url(#${ID}-${vypln})" stroke="${obrys}" stroke-width="0.22" stroke-linejoin="round"/>` +
      `<path d="${nitky}" stroke="#E07F9E" stroke-width="0.13"/><path d="${prasniky}" fill="#F6D77A"/><circle r="0.46" fill="#D9648A"/></g>`;
  }
  /* květ z boku: visí na stopce, kalich a tři plátky do zvonku */
  const platek = "M0 2.5 C1.2 2.9 1.45 4.5 0.3 5.4 L0 5.05 L-0.3 5.4 C-1.45 4.5 -1.2 2.9 0 2.5 Z";
  for (let i = 0; i < 2; i++) {
    const obrys = ODSTINY[i][1];
    s +=
      `<g id="${ID}-b${i}"><path d="M0 0 V2.2" stroke="#8C7A52" stroke-width="0.34" stroke-linecap="round"/>` +
      `<g fill="${i ? "#EFA0BA" : "#F5B9CB"}" stroke="${obrys}" stroke-width="0.2" stroke-linejoin="round"><path d="${platek}" transform="rotate(40 0 2.5)"/><path d="${platek}" transform="rotate(-40 0 2.5)"/></g>` +
      `<path d="${platek}" fill="${i ? "#F7C3D2" : "#FBDCE5"}" stroke="${obrys}" stroke-width="0.2" stroke-linejoin="round"/>` +
      `<path d="M-0.62 1.8 L0.62 1.8 L0.4 2.95 L0 2.65 L-0.4 2.95 Z" fill="#CC748C"/></g>`;
  }
  s += `<g id="${ID}-poupe"><path d="M0 0 L2.2 0" stroke="#8C7A52" stroke-width="0.4" stroke-linecap="round"/><ellipse cx="3.1" cy="0" rx="1.5" ry="1.05" fill="#E98FAB" stroke="#C8607F" stroke-width="0.25"/><path d="M3.2 -0.9 Q4.4 0 3.2 0.9 Q3.9 0 3.2 -0.9 Z" fill="#F7C3D2"/><path d="M1.8 -0.6 Q2.7 0 1.8 0.6 Z" fill="#A9566B"/></g>`;
  /* do dálky stačí plochý květ */
  for (let i = 0; i < 4; i++) s += `<g id="${ID}-z${i}"><path d="${kvetD(0, 0, 2.6, (i % 2) * 0.6)}" fill="${i < 2 ? "#FBE1E8" : "#F6CAD6"}" stroke="#EBB3C4" stroke-width="0.2"/><circle r="0.42" fill="#EDA5BA"/></g>`;
  s += `<path id="${ID}-listek" d="${LISTEK}" fill="#F9CCD8" stroke="#E29BB3" stroke-width="0.2"/>`;
  return s;
})();
const defs = () =>
  hlDefs(ID) +
  KVETY_DEFS +
  `<radialGradient id="${ID}-kvet"><stop offset="0" stop-color="#F4A9C0"/><stop offset="0.45" stop-color="#FCDCE5"/><stop offset="1" stop-color="#FFF4F6"/></radialGradient>` +
  `<radialGradient id="${ID}-kvet-t"><stop offset="0" stop-color="#EE94B1"/><stop offset="0.5" stop-color="#F7BFD0"/><stop offset="1" stop-color="#FBDCE5"/></radialGradient>` +
  `<radialGradient id="${ID}-kvet-s"><stop offset="0" stop-color="#E27A9C"/><stop offset="0.5" stop-color="#F0A3BB"/><stop offset="1" stop-color="#F7C6D4"/></radialGradient>` +
  /* kmen je světlejší zleva, odkud na něj svítí kotouč; přechod leží napříč jeho osou */
  `<linearGradient id="${ID}-kmen" gradientUnits="userSpaceOnUse" x1="108" y1="115" x2="131" y2="104.4"><stop offset="0" stop-color="#7D6365"/><stop offset="0.5" stop-color="${KORA}"/><stop offset="1" stop-color="#402E31"/></linearGradient>` +
  `<linearGradient id="${ID}-kmen-stin" gradientUnits="userSpaceOnUse" x1="0" y1="58" x2="0" y2="106"><stop offset="0" stop-color="#2A1D1F" stop-opacity="0.36"/><stop offset="1" stop-color="#2A1D1F" stop-opacity="0"/></linearGradient>` +
  `<linearGradient id="${ID}-koren" gradientUnits="userSpaceOnUse" x1="0" y1="152" x2="0" y2="167"><stop offset="0" stop-color="${KORA}"/><stop offset="1" stop-color="#4A3739"/></linearGradient>` +
  `<linearGradient id="${ID}-dutina" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1D1315"/><stop offset="1" stop-color="#33242A"/></linearGradient>` +
  `<clipPath id="${ID}-dutina-orez"><path d="${DUTINA_D}"/></clipPath>` +
  `<linearGradient id="${ID}-drevo" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#BBA890"/><stop offset="1" stop-color="#8E7B66"/></linearGradient>` +
  `<radialGradient id="${ID}-kotouc"><stop offset="0" stop-color="#FFF8E2"/><stop offset="0.7" stop-color="#FCEDC6"/><stop offset="1" stop-color="#F8E0B0"/></radialGradient>` +
  `<radialGradient id="${ID}-zare"><stop offset="0.7" stop-color="#FBE3A0" stop-opacity="0.34"/><stop offset="1" stop-color="#FBE3A0" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="${ID}-stin"><stop offset="0" stop-color="#2B2420" stop-opacity="0.26"/><stop offset="0.6" stop-color="#2B2420" stop-opacity="0.12"/><stop offset="1" stop-color="#2B2420" stop-opacity="0"/></radialGradient>` +
  /* dole a vpravo, kde ji stíní kmen, je hrouda tmavší; shora na ni svítí kotouč přes květy */
  `<linearGradient id="${ID}-stin-tela" x1="0.3" y1="0.2" x2="0.8" y2="1"><stop offset="0.3" stop-color="#2B2420" stop-opacity="0"/><stop offset="0.7" stop-color="#2B2420" stop-opacity="0.1"/><stop offset="1" stop-color="#2B2420" stop-opacity="0.32"/></linearGradient>` +
  `<radialGradient id="${ID}-svit" cx="0.6" cy="0.06" r="0.8"><stop offset="0" stop-color="#FFCDA8" stop-opacity="0.42"/><stop offset="0.5" stop-color="#F7A98C" stop-opacity="0.15"/><stop offset="1" stop-color="#F7A98C" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="${ID}-skvrna"><stop offset="0" stop-color="#FFE9CF" stop-opacity="0.26"/><stop offset="1" stop-color="#FFE9CF" stop-opacity="0"/></radialGradient>` +
  `<clipPath id="${ID}-orez-tela"><circle cx="90" cy="98" r="47.2"/></clipPath>`;

/* ——— Simulace ——— */
/* vítr po sloupcích: poryv vstoupí z návětrné strany a postupuje korunou */
const SLOUPCU = 12;
const vitrV = (dyn, x) => {
  const j = clamp((x + 6) / 192) * (SLOUPCU - 1), i = Math.min(SLOUPCU - 2, Math.floor(j));
  return lerp(dyn.sl[i], dyn.sl[i + 1], j - i);
};
const novyListek = (R, x, y, volby = {}) => ({
  x, y, vx: (volby.vx || 0) + (R() - 0.5) * 8, vy: (volby.vy ?? 2) + R() * 5, rot: R() * 360, vr: (R() - 0.5) * 260, fz: R() * 6.28, toc: 1.6 + R() * 2.6,
  m: 0.82 + R() * 0.5, vek: 0, zem: ZEM - 2.5 + R() * 9, pad: 9 + R() * 6,
});
/** Lístek se utrhne z náhodného místa na prutu; s `cely` spadne rovnou celý květ. */
const utrhni = (dyn, volby = {}) => {
  const R = dyn.nahoda;
  const odkud = volby.pruty || TRHACI;
  const p = odkud[Math.floor(R() * odkud.length)], q = R();
  const c = Math.min(p.n - 1, Math.floor(q * p.n)), k = q * p.n - c;
  const l = novyListek(R, lerp(p.J[c][0], p.J[c + 1][0], k) + (R() - 0.5) * 4, lerp(p.J[c][1], p.J[c + 1][1], k), volby);
  if (volby.cely) Object.assign(l, { k: Math.floor(R() * 9), m: 0.86 + R() * 0.3, pad: 15 + R() * 6, toc: 3 + R() * 3 });
  dyn.listky.push(l);
  return l;
};
const poloz = (dyn, l) => {
  dyn.lezici.push({ x: l.x, y: l.zem, rot: l.rot, m: l.m, k: l.k });
  if (dyn.lezici.length > 170) dyn.lezici.splice(0, dyn.lezici.length - 170);
  dyn.verze++;
};
const zacniKych = (dyn, t) => {
  dyn.k = { faze: "pada", t0: t };
};
/** Mejiro přeletí na volné bidlo; při úprku vyletí obloukem až nad korunu. */
const prelet = (dyn, m, t, uprk = false) => {
  const R = dyn.nahoda;
  const obsazena = dyn.mejiro.map((x) => x.misto);
  let kam = m.misto;
  for (let i = 0; i < 12 && (kam === m.misto || obsazena.includes(kam)); i++) kam = Math.floor(R() * BIDLA.length);
  const A = BIDLA[m.misto], B = BIDLA[kam];
  Object.assign(m, { z: m.misto, misto: kam, t0: t, doba: uprk ? 2.1 + R() * 0.5 : 0.5 + Math.hypot(B[0] - A[0], B[1] - A[1]) / 110, uprk, zob: -10 });
};
const novaDynamika = () => {
  const R = rng(3303);
  const dyn = {
    nahoda: R, zvuk: [], mys: null, mv: [0, 0], smer: 0, vitr: 0, poryv: 0, otres: 0, otresT0: -100, tPred: 0, listky: [], lezici: [], naNi: [], verze: 1,
    sl: new Array(SLOUPCU).fill(0), pr: VSECHNY_PRUTY.map(() => ({ a: 0, v: 0, od: 0, odV: 0 })), rozhrn: 0,
    k: { faze: "nic", t0: 0 }, dalsiKych: 9, poza: 0, pozaV: 0, lechtani: 0, chichot: 0, spi: 1,
    ptak: { zpev: -10, skok: -10, dalsi: 4.2 },
    mejiro: [{ misto: 0, z: 0, t0: -10, doba: 1, dalsi: 1.6, zob: 2.6 }, { misto: 3, z: 3, t0: -10, doba: 1, dalsi: 5.2, zob: -10 }],
    sova: { ven: 0, t0: -10, dx: 0, dy: 0 },
    puk: 2, pukCeka: 0,
  };
  /* pár lístků a květů už leží a pár je ve vzduchu, ať první snímek není holý */
  for (let i = 0; i < 84; i++) {
    const x = 14 + R() * 156;
    if (Math.abs(x - FIG.x) < 19 && R() < 0.7) continue;
    dyn.lezici.push({ x, y: ZEM - 2.5 + R() * 9, rot: R() * 360, m: 0.82 + R() * 0.5, k: R() < 0.1 ? Math.floor(R() * 9) : undefined });
  }
  for (let i = 0; i < 24; i++) {
    const l = utrhni(dyn);
    l.y += R() * 80;
    l.vek = 1 + R() * 3;
  }
  dyn.listky = dyn.listky.filter((l) => l.y < l.zem - 6 && Math.hypot(l.x - STRED[0], l.y - STRED[1]) > R_TELA + 3);
  dyn.naNi.push({ a: -0.5, rot: 20, t0: 0, zivot: 11 }, { a: 0.42, rot: 10, t0: 0, zivot: 30, k: 1 });
  return dyn;
};
const krok = (dyn, t, dt, vstup) => {
  const R = dyn.nahoda, k = dyn.k, tPred = dyn.tPred;
  dyn.tPred = t;
  /* vítr: slabý vane sám, silný dělá myš; směr je ten, kterým se hýbe */
  let vitrCil = 0.13 * Math.sin(t * 0.37) + 0.08 * Math.sin(t * 0.83 + 1);
  const m = vstup.mys, rych = vstup.rychlost || 0;
  if (m) {
    if (dyn.mys) {
      dyn.smer = kCili(dyn.smer, Math.sign(m.x - dyn.mys.x), dt, 0.12);
      const idt = 1 / Math.max(dt, 0.008);
      dyn.mv[0] = kCili(dyn.mv[0], clamp((m.x - dyn.mys.x) * idt, -240, 240), dt, 0.1);
      dyn.mv[1] = kCili(dyn.mv[1], clamp((m.y - dyn.mys.y) * idt, -240, 240), dt, 0.1);
    }
    /* fouká až opravdové mávnutí; pomalý kurzor mezi pruty je jen rozhrnuje */
    vitrCil += dyn.smer * clamp((rych - 30) / 170, 0, 1.3);
    dyn.mys = { x: m.x, y: m.y };
    /* lechtání: rychlá myš přímo na ní */
    if (Math.hypot(m.x - STRED[0], m.y - STRED[1]) < R_TELA + 3 && rych > 70 && k.faze === "nic") dyn.lechtani = Math.min(1.4, dyn.lechtani + dt * 2.6);
    /* mávnutí těsně nad zemí zvedne, co tam leží */
    if (m.y > ZEM - 13 && rych > 90) {
      let zvednuto = 0;
      for (let i = dyn.lezici.length - 1; i >= 0 && zvednuto < 2; i--) {
        const l = dyn.lezici[i];
        if (Math.abs(l.x - m.x) > 9) continue;
        dyn.lezici.splice(i, 1);
        dyn.listky.push({ ...novyListek(R, l.x, l.y - 1, { vx: dyn.mv[0] * 0.2, vy: -16 - R() * 26 }), m: l.m, k: l.k, vek: 0.3 });
        zvednuto++;
      }
      if (zvednuto) dyn.verze++;
    }
  } else {
    dyn.mys = null;
    dyn.mv[0] = dyn.mv[1] = 0;
  }
  dyn.lechtani = Math.max(0, dyn.lechtani - dt * 0.9);
  if (dyn.lechtani > 0.5 && t > dyn.chichot) {
    dyn.zvuk.push({ druh: "chichot", sila: 0.7, pan: -0.1 });
    dyn.chichot = t + 0.9;
  }
  dyn.vitr = kCili(dyn.vitr, vitrCil + dyn.poryv, dt, 0.3);
  dyn.poryv *= Math.exp(-dt / 0.7);
  dyn.otres *= Math.exp(-dt / 0.8);
  /* poryv jde korunou sloupec po sloupci a každý prut se za ním zhoupne s vlastní setrvačností */
  const sl = dyn.sl, ks = 1 - Math.exp(-dt / 0.055);
  if (dyn.vitr >= 0) {
    sl[0] += (dyn.vitr - sl[0]) * ks;
    for (let j = 1; j < SLOUPCU; j++) sl[j] += (sl[j - 1] - sl[j]) * ks;
  } else {
    sl[SLOUPCU - 1] += (dyn.vitr - sl[SLOUPCU - 1]) * ks;
    for (let j = SLOUPCU - 2; j >= 0; j--) sl[j] += (sl[j + 1] - sl[j]) * ks;
  }
  for (const p of VSECHNY_PRUTY) {
    const s = dyn.pr[p.i];
    [s.a, s.v] = pruzina(s.a, s.v, vitrV(dyn, p.x) * (0.7 + 0.5 * p.o), dt, 26, 5);
  }
  /*
   * Kurzor pruty rozhrnuje jako ruka záclonu. Prut přímo pod ním stojí,
   * nejvíc uhnou ty kousek vedle a dál to slábne — kdyby uhýbal nejvíc ten,
   * na kterém kurzor zrovna je, přeskočil by při přejetí naráz na druhou
   * stranu. K cíli se prut dotahuje pružinou, takže neškubne, ani když myš
   * vjede, odjede nebo skočí.
   */
  dyn.rozhrn = 0;
  for (const p of TRHACI) {
    const s = dyn.pr[p.i];
    let cil = 0;
    if (m) {
      const u = (p.J[1][0] - m.x) / 13;
      cil = 8 * u * Math.exp((1 - u * u) / 2) * Math.exp(-Math.pow(Math.max(0, m.y - p.J[p.n][1] - 10) / 30, 2) - Math.pow(Math.max(0, p.J[0][1] - 8 - m.y) / 18, 2));
    }
    [s.od, s.odV] = pruzina(s.od, s.odV, cil, dt, 70, 12);
    dyn.rozhrn = Math.max(dyn.rozhrn, Math.abs(s.od), Math.abs(s.odV) * 0.1);
  }

  /* ——— Kliknutí: do dutiny budí sýčka, jinam kýchnutí ——— */
  if (vstup.kliky && vstup.kliky.length) {
    const kl = vstup.kliky[vstup.kliky.length - 1];
    vstup.kliky.length = 0;
    if (Math.hypot(kl.x - DUTINA.x, kl.y - DUTINA.y) < 9) {
      if (t - dyn.sova.t0 > 2.4) {
        dyn.sova.t0 = t;
        dyn.zvuk.push({ druh: "hou", sila: 0.9, pan: 0.5, za: 0.35 });
      }
    } else if (k.faze === "nic") zacniKych(dyn, t);
    else {
      /* už se kýchá: kliknutí jen zafouká od místa, kam se kleplo */
      const s = kl.x < 90 ? 1 : -1;
      dyn.poryv += s * 0.9;
      dyn.zvuk.push({ druh: "poryv", sila: 0.6, pan: -s * 0.5 });
      for (let i = 0; i < 14; i++) utrhni(dyn, { vx: s * 26 });
    }
  }
  if (k.faze === "nic" && t > dyn.dalsiKych) zacniKych(dyn, t);
  const u = t - k.t0;
  if (k.faze === "pada" && u > T_PADA) [k.faze, k.t0] = ["sedi", t];
  else if (k.faze === "sedi" && u > T_SEDI) {
    [k.faze, k.t0] = ["nadech", t];
    dyn.zvuk.push({ druh: "nadech", sila: 1, pan: -0.05 });
  } else if (k.faze === "nadech" && u > T_NADECH) {
    [k.faze, k.t0] = ["kych", t];
    dyn.zvuk.push({ druh: "kych", sila: 1, pan: -0.05 });
    dyn.zvuk.push({ druh: "poryv", sila: 0.9, pan: 0, za: 0.08 });
    dyn.otres = 1;
    dyn.otresT0 = t;
    dyn.pozaV = 9;
    dyn.ptak.skok = t;
    for (const mj of dyn.mejiro) prelet(dyn, mj, t, true);
    dyn.zvuk.push({ druh: "civ", sila: 0.8, pan: 0.2, za: 0.12 });
    /* hanafubuki: strom se otřese a sype se z něj vánice, s ní i celé květy */
    for (let i = 0; i < 150; i++) utrhni(dyn, { vx: (R() - 0.5) * 60, vy: -6 + R() * 10 }).m *= 1.3;
    for (let i = 0; i < 12; i++) utrhni(dyn, { vx: (R() - 0.5) * 40, vy: -4 + R() * 8, cely: true });
    /* nejvíc se sype z prutů přímo nad ní */
    for (let i = 0; i < 60; i++) utrhni(dyn, { vx: (R() - 0.5) * 50, vy: -4 + R() * 12, pruty: NAD_NI }).m *= 1.5;
    /* a co leželo kolem ní na zemi, vyletí do vzduchu */
    for (let i = dyn.lezici.length - 1; i >= 0; i--) {
      const l = dyn.lezici[i], dx = l.x - FIG.x;
      if (Math.abs(dx) > 62 || R() < 0.2) continue;
      dyn.lezici.splice(i, 1);
      dyn.listky.push({ ...novyListek(R, l.x, l.y - 1, { vx: Math.sign(dx || 1) * (16 + R() * 44), vy: -22 - R() * 34 }), m: l.m, k: l.k, vek: 0.3 });
    }
    /* co měla na hlavě, odletí — i květ z výhonku */
    for (const l of dyn.naNi.splice(0)) {
      const [x, y] = naPanel([90 + Math.sin(l.a) * 49, 98 - Math.cos(l.a) * 49]);
      dyn.listky.push({ ...novyListek(R, x, y, { vx: Math.sin(l.a) * 40 + (R() - 0.5) * 12, vy: -30 - R() * 20 }), rot: l.rot, vr: (R() - 0.5) * 500, toc: 3, m: 1.1, vek: 0.3, k: l.k });
    }
    if (dyn.puk > 1.5) {
      const [x, y] = naPanel(VYHONEK.kvet);
      dyn.listky.push({ ...novyListek(R, x, y, { vx: 24, vy: -44 }), vr: 520, toc: 5, m: 1.1, vek: 0.3, k: 4, pad: 15 });
    }
    dyn.puk = -0.5;
    const [nx, ny] = naPanel(NOS);
    dyn.listky.push({ ...novyListek(R, nx, ny, { vx: -34, vy: -46 }), rot: 0, vr: 700, fz: 0, toc: 4, m: 1.2, vek: 0.3, zem: ZEM + 4, pad: 10 });
    dyn.verze++;
  } else if (k.faze === "kych" && u > T_KYCH) [k.faze, k.t0] = ["po", t];
  else if (k.faze === "po" && u > T_PO) {
    [k.faze, k.t0] = ["nic", t];
    dyn.dalsiKych = t + 15 + R() * 10;
  }
  [dyn.poza, dyn.pozaV] = pruzina(dyn.poza, dyn.pozaV, 0, dt, 150, 7);
  dyn.spi = kCili(dyn.spi, (k.faze === "nic" || k.faze === "pada") && dyn.lechtani < 0.5 ? 1 : 0, dt, 0.3);
  /* květ na výhonku: poupě doroste, chvíli počká a otevře se */
  if (dyn.puk < 1) {
    dyn.puk = Math.min(1, dyn.puk + dt / 7);
    if (dyn.puk >= 1) dyn.pukCeka = t + 1 + R() * 2.5;
  } else if (dyn.puk < 2 && t > dyn.pukCeka && k.faze === "nic") {
    if (dyn.puk === 1) dyn.zvuk.push({ druh: "pup", sila: 0.8, pan: -0.05 });
    dyn.puk = Math.min(2, dyn.puk + dt / 0.9 + 1e-6);
  }

  /* ——— Lístky ——— */
  const sila = Math.abs(dyn.vitr);
  if (dyn.listky.length < 210 && R() < dt * (2.1 + sila * 8 + Math.max(0, sila - 0.6) * 24)) utrhni(dyn, { vx: dyn.vitr * 20 });
  /* otřes ještě chvíli sype */
  if (dyn.otres > 0.45 && R() < dt * 90) utrhni(dyn, { vx: (R() - 0.5) * 40, vy: R() * 6 });
  if (R() < dt * 0.09) utrhni(dyn, { cely: true });
  const vir = m && rych > 40 ? Math.min(1, rych / 200) : 0, toc = dyn.mv[0] < 0 ? -1 : 1;
  for (const l of dyn.listky) {
    l.vek += dt;
    l.vx = kCili(l.vx, vitrV(dyn, l.x) * 48 + 7 * Math.sin(l.vek * 2.3 + l.fz), dt, 0.5);
    l.vy = kCili(l.vy, l.pad + 3 * Math.sin(l.vek * 3.1 + l.fz), dt, 0.6);
    /* rychlá myš lístky strhne s sebou a zatočí je kolem sebe */
    if (vir) {
      const ax = l.x - m.x, ay = l.y - m.y, d2 = ax * ax + ay * ay;
      if (d2 < 784) {
        const g = (1 - d2 / 784) * vir * dt * 7;
        l.vx += (dyn.mv[0] * 0.8 - ay * 2.4 * toc) * g;
        l.vy += (dyn.mv[1] * 0.8 + ax * 2.4 * toc) * g;
      }
    }
    l.x += l.vx * dt;
    l.y += l.vy * dt;
    l.rot += l.vr * dt;
    /* na Hlínku: nahoře občas zůstane ležet, jinak sklouzne po boku */
    const dx = l.x - STRED[0], dy = l.y - STRED[1], d = Math.hypot(dx, dy);
    if (d < R_TELA + 0.6 && l.vy > 0) {
      const kvetu = dyn.naNi.filter((x) => x.k != null).length;
      if (dy < -R_TELA * 0.62 && dyn.k.faze === "nic" && (l.k != null ? kvetu < 4 : dyn.naNi.length - kvetu < 4 && R() < 0.5)) {
        dyn.naNi.push({ a: Math.atan2(dx, -dy), rot: l.rot % 60, t0: t, zivot: l.k != null ? 26 + R() * 20 : 7 + R() * 9, k: l.k });
        dyn.verze++;
        l.pryc = true;
      } else {
        l.x = STRED[0] + (dx / d) * (R_TELA + 0.8);
        l.y = STRED[1] + (dy / d) * (R_TELA + 0.8);
        l.vx += Math.sign(dx || 1) * 30 * dt * 8;
      }
    }
    if (l.y >= l.zem && l.vy > 0) {
      l.pryc = true;
      if (l.x > 4 && l.x < 176) poloz(dyn, l);
    } else if (l.x < -16 || l.x > 196 || l.y < -40) l.pryc = true;
  }
  dyn.listky = dyn.listky.filter((l) => !l.pryc);
  /* z hlavy časem sklouznou */
  for (const l of dyn.naNi)
    if (t - l.t0 > l.zivot) {
      const [x, y] = naPanel([90 + Math.sin(l.a) * 49, 98 - Math.cos(l.a) * 49]);
      dyn.listky.push({ ...novyListek(R, x, y, { vx: Math.sin(l.a) * 14, vy: 3 }), rot: l.rot, vr: 120, toc: 2, m: 1.1, vek: 0.3, k: l.k });
      l.pryc = true;
      dyn.verze++;
    }
  dyn.naNi = dyn.naNi.filter((l) => !l.pryc);

  /* sedmihlásek: zpívá, když je klid */
  const b = dyn.ptak;
  if (t > b.dalsi && k.faze === "nic") {
    b.zpev = t;
    b.dalsi = t + 10 + R() * 9;
    dyn.zvuk.push({ druh: "uguisu", sila: 0.8, pan: -0.45 });
  }
  /* mejiro: posedí, uždíbne květ a letí jinam */
  for (const mj of dyn.mejiro) {
    const sedi = t > mj.t0 + mj.doba;
    if (sedi && mj.uprk !== null && mj.dalsi < mj.t0 + mj.doba) {
      mj.dalsi = t + 2.4 + R() * 5;
      mj.zob = t + 0.7 + R() * 1.2;
    }
    if (sedi && pres(tPred, t, mj.zob)) {
      const [x, y] = BIDLA[mj.misto];
      dyn.listky.push({ ...novyListek(R, x + 4, y + 4, {}), k: Math.floor(R() * 9), m: 0.9, pad: 16, toc: 4 });
      for (let i = 0; i < 2; i++) dyn.listky.push(novyListek(R, x + 4 + R() * 3, y + 4, {}));
    }
    if (sedi && t > mj.dalsi && k.faze === "nic") {
      prelet(dyn, mj, t);
      if (R() < 0.6) dyn.zvuk.push({ druh: "civ", sila: 0.5, pan: clamp((BIDLA[mj.misto][0] - 90) / 90, -0.8, 0.8) });
    }
  }
  /* sýček kouká za kurzorem, když je blízko */
  const so = dyn.sova;
  const kouka = m && Math.hypot(m.x - DUTINA.x, m.y - DUTINA.y) < 70;
  so.dx = kCili(so.dx, kouka ? clamp((m.x - DUTINA.x) / 22, -1, 1) : 0, dt, 0.18);
  so.dy = kCili(so.dy, kouka ? clamp((m.y - DUTINA.y) / 22, -1, 1) : 0, dt, 0.18);
};

const VYRAZY = {
  nic: { oci: "spi", usta: "usmev", tvare: 0.45 },
  pada: { oci: "spi", usta: "usmev", tvare: 0.45 },
  sedi: { oci: "ospale", usta: "vlnka", tvare: 0.55 },
  nadech: { oci: "siroke", usta: "o", tvare: 0.5, dy: -1.2 },
  kych: { oci: "kych", usta: "kych", tvare: 0.75 },
};
/** Natočení kloubů jedné sady: houpání, vítr s dokmitem, rozhrnutí kurzorem (obojí už dotažené v kroku) a otřes, který přijde tím později, čím je prut dál od Hlínky. */
const uhlySady = (S, d, t) => {
  const U = [];
  for (const p of S.pruty) {
    const od = d.pr[p.i].od;
    const uo = t - d.otresT0 - p.dalka / 230;
    const tres = uo > 0 && uo < 5 ? 7.5 * Math.exp(-uo / 0.55) * Math.sin(uo * 31 + p.fz * 3) : 0;
    const vitr = d.pr[p.i].a * 24, dil = 3 / p.n;
    for (let c = 0; c < p.n; c++) {
      const q = p.n > 1 ? c / (p.n - 1) : 0;
      U.push(-(1.5 * dil * Math.sin(t * (0.9 + 0.2 * c) + p.fz + c) + (vitr / p.n) * (0.8 + 0.4 * q) + (c === 0 ? od * 0.6 : c === 1 ? od * 0.3 : 0) + tres * dil * (1 - 0.4 * q)));
    }
  }
  return U;
};
const stav = (t, vstup = {}, dyn) => {
  const d = dyn || novaDynamika();
  const k = d.k, u = t - k.t0;
  let vyraz = VYRAZY[k.faze];
  if (k.faze === "po") vyraz = u < 0.9 ? { oci: "ospale", usta: "vlnka", tvare: 0.55 } : VYRAZY.nic;
  else if (k.faze === "nic" && d.lechtani > 0.5) vyraz = { oci: "smich", usta: "ach", tvare: 0.85 };
  /* póza: dýchá, nadechne se do záklonu, kýchnutím se předkloní a dopruží */
  let sx = 1 - 0.006 * Math.sin(t * 1.25), sy = 1 + 0.012 * Math.sin(t * 1.25), r = 0, y = 0;
  if (k.faze === "nadech") {
    const q = smooth(u / T_NADECH);
    [sx, sy, r] = [1 + 0.03 * q, 1 + 0.075 * q, -6 * q];
  } else if (k.faze === "kych") {
    const q = Math.sin(Math.PI * clamp(u / T_KYCH));
    [sx, sy, r, y] = [1 + 0.07 * q, 1 - 0.1 * q, 9 * q - 3 * (1 - q), -2.4 * q];
  }
  r += d.poza * 3 + 2.4 * Math.sin(t * 25) * clamp(d.lechtani - 0.3);
  const uhly = { zadni: uhlySady(SADY.zadni, d, t), stred: uhlySady(SADY.stred, d, t), predni: uhlySady(SADY.predni, d, t) };
  /* lístek, který míří na nos: snáší se obloukem od koruny */
  let cilovy = null;
  if (k.faze === "pada") {
    const q = clamp(u / T_PADA), [nx, ny] = naPanel([NOS[0], NOS[1] - 1]);
    cilovy = [lerp(nx + 16, nx, smooth(q)) + Math.sin(q * 9) * 5 * (1 - q), lerp(ny - 62, ny, q * q * 0.5 + q * 0.5), 24 + (1 - q) * 420];
  }
  const b = d.ptak;
  const zp = t - b.zpev, sk = t - b.skok;
  const zpev = zp > 0 && zp < 1.75 ? (zp < 0.95 ? 0.75 + 0.25 * Math.sin(zp * 30) : zp < 1.05 ? 0 : 1) : 0;
  const skok = sk > 0 && sk < 0.8 ? Math.sin((Math.PI * sk) / 0.8) : 0;
  /* mejiro: mezi bidly letí obloukem a mává, na bidle se pohupuje a občas zobne do květu */
  let leti = false;
  const mejiro = d.mejiro.map((mj, i) => {
    const A = BIDLA[mj.z], B = BIDLA[mj.misto], q = (t - mj.t0) / mj.doba;
    if (q >= 0 && q < 1) {
      leti = true;
      const e = smooth(q), h = mj.uprk ? 52 : 5 + Math.hypot(B[0] - A[0], B[1] - A[1]) * 0.1;
      return { x: lerp(A[0], B[0], e), y: lerp(A[1], B[1], e) - h * Math.sin(Math.PI * q), smer: B[0] >= A[0] ? 1 : -1, naklon: -16 * Math.cos(Math.PI * q), zpev: 0, kridla: 0.5 + 0.5 * Math.sin(t * 52 + i), leti: true };
    }
    const z = Math.abs(t - mj.zob) < 0.22 ? 1 - Math.abs(t - mj.zob) / 0.22 : 0;
    return { x: B[0], y: B[1], smer: i ? -1 : 1, naklon: 3 * Math.sin(t * 1.9 + i * 2) + 40 * z, zpev: 0, kridla: 0, leti: false, zob: z };
  });
  const so = d.sova, su = t - so.t0;
  const ven = su > 0 && su < 2.2 ? smooth(su / 0.3) * (1 - smooth((su - 1.7) / 0.5)) : 0;
  return {
    t, vitr: d.vitr, otres: d.otres, uhly, vyraz, listky: d.listky, lezici: d.lezici, naNi: d.naNi, verze: d.verze, cilovy,
    naNose: k.faze === "sedi" ? 0.3 : k.faze === "nadech" ? 1 : 0,
    spi: d.spi,
    puk: d.puk,
    zive: Math.abs(d.vitr) > 0.22 || t - d.otresT0 < 4 || d.rozhrn > 0.2,
    fig: { sx, sy, r, y },
    kyv: 5 * Math.sin(t * 1.1) + d.vitr * 16 + d.otres * 12 * Math.sin(t * 27),
    ptak: { zpev, noty: zp > 0 && zp < 2.6 ? zp / 2.6 : 0, vyska: 9 * skok, kridla: skok > 0 ? 0.5 + 0.5 * Math.sin(t * 46) : 0, naklon: -6 * zpev + 2 * Math.sin(t * 1.4) - 14 * skok },
    mejiro, leti,
    sova: {
      ven, dx: so.dx, dy: so.dy, siroke: Math.max(d.otres, ven), mrk: ven > 0.1 ? 0 : mrkani(t, [1.3, 4.6, 4.9], 6.4),
      houka: su > 0.35 && su < 1.5 ? Math.max(0, Math.sin((su - 0.35) * 7)) : 0, noty: su > 0.35 && su < 2.4 ? (su - 0.35) / 2.05 : 0,
    },
  };
};
const snimek = (st) => Math.floor(st.t * 30);
const pohyb = (st) => ({ x: 0, y: st.fig.y, r: st.fig.r, sx: st.fig.sx, sy: st.fig.sy, ox: FIG.x, oy: ZEM });

export const kamiSakura = {
  id: "sakura",
  viewBox: "0 0 180 180",
  defs,
  novaDynamika,
  krok,
  stav,
  /* vítr v koruně */
  sum: (st) => ({ mira: 0.22 + 0.7 * Math.abs(st.vitr) + 0.5 * st.otres, f: 520 + 520 * Math.abs(st.vitr), q: 0.6, pan: clamp(st.vitr, -0.8, 0.8) }),
  klidne: { t: 3.2 },
  vrstvy: [
    { id: "zem", kresli: vrstvaZem },
    { id: "kotouc", kresli: vrstvaKotouc },
    { id: "mraky", kresli: vrstvaMraky, tezka: true },
    { id: "zadni", kresli: vrstvaSady("zadni"), uzly: uzlySady("zadni"), tezka: true },
    { id: "strom", kresli: vrstvaStrom, tezka: true },
    { id: "dutina", kresli: vrstvaDutina, klic: (st) => (st.sova.ven || st.sova.mrk || st.otres > 0.05 ? snimek(st) : Math.floor(st.t * 12)) },
    { id: "provaz", kresli: vrstvaProvaz, klic: (st) => Math.floor(st.t * 15) },
    { id: "pruty", kresli: vrstvaSady("stred"), uzly: uzlySady("stred"), tezka: true },
    { id: "ptaci", kresli: vrstvaPtaci, klic: (st) => (st.leti || st.ptak.zpev || st.ptak.noty || st.ptak.vyska ? snimek(st) : Math.floor(st.t * 12)) },
    { id: "lezici", kresli: vrstvaLezici, klic: (st) => st.verze },
    { id: "svetylka", kresli: vrstvaSvetylka, klic: (st) => Math.floor(st.t * 15) },
    { id: "telo", kresli: vrstvaTelo, pohyb },
    { id: "svit", kresli: vrstvaSvit, pohyb },
    { id: "skvrny", kresli: vrstvaSkvrny, klic: (st) => Math.floor(st.t * 12), pohyb },
    { id: "vyhonek", kresli: vrstvaVyhonek, klic: (st) => `${Math.round(st.kyv * 4)},${Math.round(st.puk * 30)}`, pohyb },
    { id: "tvar", kresli: vrstvaTvar, klic: (st) => `${st.vyraz.oci},${st.vyraz.usta}`, pohyb },
    { id: "na-ni", kresli: vrstvaNaNi, klic: (st) => `${st.verze},${st.naNose ? snimek(st) : 0}`, pohyb },
    { id: "zzz", kresli: vrstvaZzz, klic: (st) => (st.spi > 0.04 ? Math.floor(st.t * 12) : -1) },
    { id: "predni", kresli: vrstvaSady("predni"), uzly: uzlySady("predni"), tezka: true },
    { id: "listky", kresli: vrstvaListky, klic: (st) => (st.listky.length || st.cilovy ? snimek(st) : -1) },
  ],
};
