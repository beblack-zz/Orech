/*
 * Stránka nenalezena (pages/404.astro) — ČTYŘISTA ČTYŘI Z PORCELÁNU
 *
 * Číslo chyby je servis: dvě čtyřky a mezi nimi okraj talíře, všechno bílý
 * porcelán s kobaltovou linkou a tečkami, rozbitý a slepený zlatem. Nula je
 * Střípkova svatozář z podoby Kami (scripts/stripek-zlato/kami-prstenec.js) —
 * tentýž talíř, stejně rozlámaný —, Střípek před ní medituje na obláčku
 * a drží to celé pohromadě tím, že se soustředí. Pár kusů je odjinud, jako
 * na něm samém: vlnky seigaiha, modrotisk v barvách loga, seladon, raku.
 *
 * Stránka se rozbije před očima: chvíli po příchodu to rupne, střepy spadnou
 * na papír pod scénou a setmí se. Střípek se lekne, rozhlédne se, zavře oči
 * a kusy se vracejí jeden po druhém — čtyřka, nula, čtyřka. Každá zalitá
 * spára cinkne o stupeň výš a s každým kusem je blíž ráno; když zaklapne
 * poslední, rozední se. Kliknutí to rozbije znovu (z místa, kam se kliklo),
 * střepy na zemi jdou rozkopnout a po každém lepení je jeden kus z cizího
 * nádobí. Zlata neubývá. Když se dlouho nic neděje, sám od sebe vypadne
 * jeden kus a Střípek ho s pootevřeným okem vrátí.
 *
 * Myš je světlo: odlesk na zlatě jde za kurzorem, poletující střípky před
 * ním uhýbají, u tváře Střípek pootevře oko.
 *
 * Stavba je stejná jako u přehnaných podob (scripts/stripek-zlato/kresby.js):
 * čisté generátory SVG bez DOM — dostanou čas, stav simulace a vstup a vrátí
 * značky. Běží i v Node, takže první snímek se vykreslí už při sestavení
 * stránky. Vrstva bez `klic` se nakreslí jednou, s `klic` se překreslí, jen
 * když se klíč změní; vrstva s `pohyb` se jen posouvá, s `pruhlednost`
 * prolíná a s `tma` ji běh v noci ztlumí — to je Střípek a střípky kolem
 * něj, co visí na noční obloze. Porcelán čísla ne: střepy leží na papíře,
 * a ten je světlý v každou hodinu.
 * Id ve filtrech a přechodech jsou pevná (nn4-), scéna smí být na stránce jednou.
 *
 * Simulace žije v `dyn`: beh.js ji založí přes novaDynamika() a každý snímek
 * posune přes krok(). Zvuky, které má běh zahrát, krok přidá do dyn.zvuk,
 * zprávy pro stránku (kolikrát už je slepeno) do dyn.udalosti. Hodinu, na
 * kterou má běh přetočit oblohu webu, vrací stav().
 */
import {
  f, rng, clamp, lerp, smooth, rad, pt, cara, mrkani, jiskraD, kCili, chomac,
  sparaVzorky, sparaTvar, elipsaD, zlatoKov, zlatoPlose,
  strDefs, strTelo, strZlato, strTvar, strRuka, strNohy, RUCE, ZLATO_TELA, oblakZadni, oblakPredni, KUSY, kusSvg,
} from "../stripek-zlato/spolecne.js";

const ID = "nn4";
/* obláček v barvách oblohy webu má vlastní přechody (proměnné --mrak-…) */
const IDV = "nn4v";
export const W = 440, H = 200;
const C = [220, 88];
const R1 = 48, R2 = 63.5, RS = (R1 + R2) / 2;
const B0 = [220, 107];
const K = 0.86;
const POSTAVA = `translate(${B0[0]} ${B0[1]}) scale(${K}) translate(-91 -90)`;
const vPostave = (s) => `<g transform="${POSTAVA}">${s}</g>`;
/** Bod z kresby Střípka na plátno (bez vznášení). */
const naPlatno = ([x, y]) => [B0[0] + (x - 91) * K, B0[1] + (y - 90) * K];
const TVAR0 = naPlatno([93, 92]);
const OBRYS = "#6B5D4F";
const KOBALT = "#2F4E9C";
/* Papír pod scénou: sem střepy dopadnou (střed pásu, na který si lehnou) */
const ZEM = 183;
/* tíha v jednotkách kresby za s² */
const TIHA = 640;

/* Rozbití: střepy spadnou a leží, od ZNOVU se vracejí jeden po druhém, každý letí PRILET */
const ZNOVU = 2.3, OBEH = 3.3, PRILET = 0.4;
/* obloha: v klidu svítá, po rozbití je noc, po slepení vyjde slunce */
const HOD_KLID = 5.6, HOD_NOC = 2.9, HOD_RANO = 6.0;

/** Dosednutí s překmitem: 0 → 1, cestou kousek přes. */
const dosed = (x) => {
  x = clamp(x);
  return 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2);
};
const naKruhu = (a, r) => [C[0] + Math.cos(rad(a)) * r, C[1] + Math.sin(rad(a)) * r];
const kruh = (r, atributy) => `<circle cx="${C[0]}" cy="${C[1]}" r="${f(r)}" fill="none" ${atributy}/>`;

/** Uzavřená cesta z vrcholů; vrchol [x, y, r] se zaoblí poloměrem r. */
const mnohouhelnik = (V) => {
  const n = V.length;
  let d = "";
  for (let i = 0; i < n; i++) {
    const p = V[i];
    if (!p[2]) {
      d += `${i ? " L" : "M"}${pt(p)}`;
      continue;
    }
    const k = (q) => {
      const l = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
      const r = Math.min(p[2], l / 2);
      return [p[0] + ((q[0] - p[0]) * r) / l, p[1] + ((q[1] - p[1]) * r) / l];
    };
    d += `${i ? " L" : "M"}${pt(k(V[(i + n - 1) % n]))} Q${pt(p)} ${pt(k(V[(i + 1) % n]))}`;
  }
  return d + " Z";
};
/** Těžiště mnohoúhelníku (podle plochy) a poloměr, do kterého se vejde. */
const teziste = (V) => {
  let a = 0, x = 0, y = 0;
  for (let i = 0; i < V.length; i++) {
    const p = V[i], q = V[(i + 1) % V.length];
    const k = p[0] * q[1] - q[0] * p[1];
    a += k;
    x += (p[0] + q[0]) * k;
    y += (p[1] + q[1]) * k;
  }
  const s = [x / (3 * a), y / (3 * a)];
  return { stred: s, r: Math.max(...V.map((p) => Math.hypot(p[0] - s[0], p[1] - s[1]))) };
};

/* ═══════════════════════════════════════════════════════════════════
 * Čtyřka: tah široký 17 jako okraj talíře, rozlámaná na deset kusů
 * ═══════════════════════════════════════════════════════════════════
 * Kreslí se v souřadnicích 96 × 127 (vlevo nahoře 0 0) a posune se na místo.
 * Šikmý tah jde z [57, 0] do [0, 82], dřík je mezi x 60 a 77, břevno mezi
 * y 82 a 98. Trojúhelník uvnitř má vrcholy H1, H2, H3.
 */
const ctyrka = (x0, y0, p, seed) => {
  const r = rng(seed);
  const na = ([x, y, z]) => (z ? [x + x0, y + y0, z] : [x + x0, y + y0]);
  /* bod na vnější hraně šikmého tahu ve výšce y a bod naproti přes tah */
  const vne = (y) => [57 - (57 * y) / 82, y];
  const pres = ([x, y]) => [x + 13.96, y + 9.7];
  const H1 = [60, 25.5], H2 = [60, 82], H3 = [20.7, 82];
  /* trhlina: dva zlomy mezi a → b, vychýlené do stran */
  const lom = (a, b, sila = 2.3) => {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const d = Math.hypot(dx, dy) || 1;
    const bod = (k) => {
      const o = (r() - 0.5) * 2 * sila;
      return [a[0] + dx * k - (dy / d) * o, a[1] + dy * k + (dx / d) * o];
    };
    return [a, bod(0.36), bod(0.68), b];
  };
  const A = [vne(p.a1), [56 + (r() - 0.5) * 2, p.a1 + 4.4], [66 + (r() - 0.5) * 2, p.a2 - 5], [77, p.a2]];
  const Dm = [(A[1][0] + H1[0]) / 2 + 1.5, (A[1][1] + H1[1]) / 2 - 0.5];
  const B = lom([60, p.b1], [77, p.b2]);
  const Cc = lom(vne(p.c), pres(vne(p.c)));
  const E = lom(vne(p.e), pres(vne(p.e)));
  const F = lom([p.f1, 82], [p.f2, 98]);
  const G = lom(H2, [p.g, 98]);
  const I = lom([60, p.i1], [77, p.i2]);
  const Kk = lom([p.k1, 82], [p.k2, 98]);
  const J = lom([77, p.j1], [60, p.j2]);
  const zpet = (X) => [...X].reverse();
  const Z = 2.6;
  const kusy = [
    /* 0 špička */ [[57, 0, Z], [77, 0, Z], ...zpet(A)],
    /* 1 horní dřík */ [A[1], A[2], A[3], ...zpet(B), H1, Dm],
    /* 2 horní šikmina */ [A[0], A[1], Dm, H1, ...zpet(Cc)],
    /* 3 prostřední šikmina */ [...Cc, ...zpet(E)],
    /* 4 levý cíp */ [...E, H3, ...F, [0, 98, Z], [0, 82, Z]],
    /* 5 břevno */ [F[0], ...G, ...zpet(F).slice(0, -1)],
    /* 6 střed dříku */ [...B, ...zpet(I)],
    /* 7 kříž */ [...I, [77, 82], ...Kk, [77, 98], ...J, [60, 98], ...zpet(G)],
    /* 8 pravý cíp */ [Kk[0], [96, 82, Z], [96, 98, Z], ...zpet(Kk).slice(0, -1)],
    /* 9 pata */ [J[0], [77, 127, Z], [60, 127, Z], ...zpet(J).slice(0, -1)],
  ].map((V) => V.map(na));
  const spary = [
    { body: A, mezi: [0, 1, 2] }, { body: [A[1], Dm, H1], mezi: [1, 2] }, { body: B, mezi: [1, 6] }, { body: Cc, mezi: [2, 3] }, { body: E, mezi: [3, 4] },
    { body: F, mezi: [4, 5] }, { body: G, mezi: [5, 7] }, { body: I, mezi: [6, 7] }, { body: Kk, mezi: [7, 8] }, { body: J, mezi: [7, 9] },
  ].map((s) => ({ ...s, body: s.body.map(na) }));
  const obrys =
    mnohouhelnik([[57, 0, Z], [77, 0, Z], [77, 82], [96, 82, Z], [96, 98, Z], [77, 98], [77, 127, Z], [60, 127, Z], [60, 98], [0, 98, Z], [0, 82, Z]].map(na)) +
    " " + mnohouhelnik([H1, H2, H3].map(na));
  /* osa šikmého tahu: bod v délce s od horního konce */
  const osa = (s) => na([63.98 - 0.5707 * s, 4.85 + 0.8211 * s]);
  const tecky = `M${pt(na([68.5, 9]))} L${pt(na([68.5, 83.4]))} M${pt(na([68.5, 96.6]))} L${pt(na([68.5, 119]))} M${pt(na([9, 90]))} L${pt(na([61.9, 90]))} M${pt(na([75.1, 90]))} L${pt(na([88, 90]))} M${pt(osa(14))} L${pt(osa(92))}`;
  return {
    kusy: kusy.map((V) => ({ d: mnohouhelnik(V), ...teziste(V) })),
    spary,
    obrys,
    tecky,
    kvet: na([68.5, 90]),
    lesk: `M${pt(na([52.2, 9.6]))} L${pt(na([14.6, 63.8]))}`,
    ram: [x0, y0, x0 + 96, y0 + 127],
    /* odspodu nahoru, jak se staví */
    poradi: [9, 7, 8, 5, 4, 3, 6, 2, 1, 0],
  };
};

/* ═══════════════════════════════════════════════════════════════════
 * Nula: okraj talíře rozlámaný na dvanáct kusů — svatozář z podoby Kami
 * (stejné semínko, stejné trhliny)
 * ═══════════════════════════════════════════════════════════════════ */
const prstenec = () => {
  const N = 12;
  const Rg = rng(1207);
  const sirky = Array.from({ length: N }, () => 0.62 + Rg() * 0.76);
  const soucet = sirky.reduce((a, b) => a + b, 0);
  /* začíná dole za obláčkem a jde po směru hodin */
  const U = [100];
  for (const w of sirky) U.push(U[U.length - 1] + (w / soucet) * 360);
  /* trhlina i je hranice mezi kusem i−1 a i: od vnitřního okraje k vnějšímu, dvakrát zalomená */
  const TR = U.slice(0, N).map((a) => [naKruhu(a, R1), naKruhu(a + (Rg() - 0.5) * 7, lerp(R1, R2, 0.36)), naKruhu(a + (Rg() - 0.5) * 7, lerp(R1, R2, 0.68)), naKruhu(a, R2)]);
  const kusy = TR.map((A, i) => {
    const B = TR[(i + 1) % N];
    const stred = naKruhu((U[i] + U[i + 1]) / 2, RS);
    return {
      d: `M${pt(A[0])} L${pt(A[1])} L${pt(A[2])} L${pt(A[3])} A${R2} ${R2} 0 0 1 ${pt(B[3])} L${pt(B[2])} L${pt(B[1])} L${pt(B[0])} A${R1} ${R1} 0 0 0 ${pt(A[0])} Z`,
      stred,
      r: Math.max(...[...A, ...B].map((q) => Math.hypot(q[0] - stred[0], q[1] - stred[1]))),
    };
  });
  return {
    kusy,
    spary: TR.map((body, j) => ({ body, mezi: [(j + N - 1) % N, j] })),
    obrys: "",
    ram: [C[0] - R2, C[1] - R2, C[0] + R2, C[1] + R2],
    poradi: Array.from({ length: N }, (_, i) => i),
  };
};

const VECI = [
  ctyrka(45.5, 24.5, { a1: 15.8, a2: 20, b1: 44, b2: 50, c: 40, e: 66, f1: 34, f2: 30, g: 56, i1: 68, i2: 71, k1: 84, k2: 85.5, j1: 103.5, j2: 102 }, 4041),
  prstenec(),
  ctyrka(298.5, 24.5, { a1: 12.6, a2: 25, b1: 52, b2: 46.5, c: 33.5, e: 60, f1: 42, f2: 45, g: 53, i1: 63.5, i2: 69, k1: 88, k2: 83.5, j1: 110, j2: 113 }, 4044),
];
const NULA = 1;

/* Všechny kusy za sebou (čtyřka, nula, čtyřka) a všechny spáry */
const KV = [], SV = [];
{
  let poradi = 0;
  VECI.forEach((V, o) => {
    V.od = KV.length;
    V.kusy.forEach((q, i) => KV.push({ ...q, o, i }));
    V.poradi.forEach((i) => (KV[V.od + i].poradi = poradi++));
    V.sparyOd = SV.length;
    V.spary.forEach((s, j) => {
      const vz = sparaVzorky(s.body, 40 + o * 20 + j, 1.45, { max: 2.1 });
      /* loužička zlata střídavě u jednoho a druhého konce */
      const B = s.body, n = B.length - 1;
      const louze = j % 2 ? [lerp(B[0][0], B[1][0], 0.3), lerp(B[0][1], B[1][1], 0.3)] : [lerp(B[n][0], B[n - 1][0], 0.3), lerp(B[n][1], B[n - 1][1], 0.3)];
      SV.push({ o, body: B, mezi: s.mezi.map((i) => V.od + i), d: sparaTvar(vz) + " " + elipsaD(louze[0], louze[1], 1.5, 1.2), stred: cara(B), pul: B[Math.floor(B.length / 2)] });
    });
    V.zlato = SV.slice(V.sparyOd).map((s) => s.d).join(" ");
  });
}
const N = KV.length;

/* vzory kusů: 0 je porcelán servisu, ostatní cizí nádobí */
const VZORY = ["talir", "seigaiha", "modrotisk", "seladon", "raku", "ichimatsu", "sippo", "tokusa"];
const vypln = (o, vzor) =>
  ({
    talir: `url(#${ID}-porcelan${o})`, seigaiha: `url(#${ID}-seigaiha)`, modrotisk: `url(#${ID}-modrotisk-pud)`, seladon: `url(#${ID}-seladon)`,
    raku: "#2A2420", ichimatsu: `url(#${ID}-ichimatsu)`, sippo: `url(#${ID}-sippo)`, tokusa: `url(#${ID}-tokusa)`,
  })[vzor];
/* kobalt pod glazurou: dvojlinka u okrajů a mezi nimi řada velkých a malých teček */
const TECKY = (d, atributy = "") =>
  `<path d="${d}" ${atributy} stroke="${KOBALT}" stroke-width="2" stroke-linecap="round" stroke-dasharray="0.01 4.95" fill="none"/>` +
  `<path d="${d}" ${atributy} stroke="${KOBALT}" stroke-width="0.9" stroke-linecap="round" stroke-dasharray="0.01 4.95" stroke-dashoffset="2.48" fill="none"/>`;
const OZDOBA = VECI.map((V, o) => {
  if (o === NULA)
    return (
      kruh(R2 - 2.3, `stroke="${KOBALT}" stroke-width="0.75"`) + kruh(R2 - 3.5, `stroke="${KOBALT}" stroke-width="0.3"`) +
      kruh(R1 + 2.3, `stroke="${KOBALT}" stroke-width="0.75"`) + kruh(R1 + 3.5, `stroke="${KOBALT}" stroke-width="0.3"`) +
      kruh(RS, `stroke="${KOBALT}" stroke-width="2" stroke-linecap="round" stroke-dasharray="0.01 4.95"`) +
      kruh(RS, `stroke="${KOBALT}" stroke-width="0.9" stroke-linecap="round" stroke-dasharray="0.01 4.95" stroke-dashoffset="2.48"`)
    );
  /* linky podél obrysu: široký tah kobaltem a přes něj užší porcelánem, dvakrát */
  const P = `url(#${ID}-porcelan${o})`;
  const [kx, ky] = V.kvet;
  return (
    `<g fill="none" stroke-linejoin="round"><path d="${V.obrys}" stroke="${KOBALT}" stroke-width="7.3"/><path d="${V.obrys}" stroke="${P}" stroke-width="6.7"/>` +
    `<path d="${V.obrys}" stroke="${KOBALT}" stroke-width="5.36"/><path d="${V.obrys}" stroke="${P}" stroke-width="3.86"/></g>` +
    TECKY(V.tecky) +
    /* kde se dřík kříží s břevnem, je kvítek */
    `<g transform="translate(${f(kx)} ${f(ky)})" fill="${KOBALT}">${[0, 72, 144, 216, 288].map((a) => `<ellipse cy="-2.9" rx="1.55" ry="2.5" transform="rotate(${a})"/>`).join("")}<circle r="1" fill="#FBF8F2"/></g>`
  );
});
/* pruh podél okrajů pro cizí kusy */
const lem = (o, barva, sirka, op = 1) =>
  o === NULA
    ? kruh(R2 - sirka, `stroke="${barva}" stroke-width="${sirka}" opacity="${op}"`) + kruh(R1 + sirka * 0.93, `stroke="${barva}" stroke-width="${f(sirka * 0.8)}" opacity="${op}"`)
    : `<path d="${VECI[o].obrys}" fill="none" stroke="${barva}" stroke-width="${f(sirka * 2)}" opacity="${op}"/>`;
const ozdoba = (g, vzor) => {
  const q = KV[g];
  const orez = (s) => `<g clip-path="url(#${ID}-k${g})">${s}</g>`;
  if (vzor === "talir") return orez(OZDOBA[q.o]);
  if (vzor === "modrotisk") return `<path d="${q.d}" fill="url(#${ID}-modrotisk)"/>`;
  if (vzor === "seladon") return `<path d="${q.d}" fill="url(#${ID}-krakel)"/>`;
  if (vzor === "raku") return `<path d="${q.d}" fill="url(#${ID}-prach)"/>` + orez(lem(q.o, "#7A3A26", 1.7, 0.75));
  if (vzor === "seigaiha" || vzor === "sippo") return orez(lem(q.o, KOBALT, 1.5));
  return "";
};
const tloustka = (g) => `<path d="${KV[g].d}" transform="translate(1.5 2.6)" fill="url(#${ID}-hrana)" stroke="${OBRYS}" stroke-width="0.8" stroke-linejoin="round"/>`;
const kus = (g, vzor) =>
  `<path d="${KV[g].d}" fill="${vypln(KV[g].o, vzor)}"/>` + ozdoba(g, vzor) +
  `<path d="${KV[g].d}" fill="url(#${ID}-objem${KV[g].o})"/>` +
  `<path d="${KV[g].d}" fill="none" stroke="${OBRYS}" stroke-width="0.9" stroke-linejoin="round"/>`;
/* světlo na glazuře vlevo nahoře */
const SVETLO = VECI.map((V, o) => {
  if (o !== NULA) return `<path d="${V.lesk}" stroke="#FFFFFF" stroke-width="1.1" stroke-linecap="round" fill="none" opacity="0.85"/>`;
  const A = naKruhu(196, R2 - 1.3), B = naKruhu(258, R2 - 1.3);
  return `<path d="M${pt(A)} A${f(R2 - 1.3)} ${f(R2 - 1.3)} 0 0 1 ${pt(B)}" stroke="#FFFFFF" stroke-width="1.1" stroke-linecap="round" fill="none" opacity="0.85"/>`;
});

/* ——— Celá věc: kreslí se jednou (a znovu, až se některý kus vymění), zlato je kov ——— */
const vrstvaCela = (o) => (st) => {
  const V = VECI[o];
  let s = "";
  for (let i = 0; i < V.kusy.length; i++) s += tloustka(V.od + i);
  for (let i = 0; i < V.kusy.length; i++) s += kus(V.od + i, VZORY[st.vzor[V.od + i]]);
  return s + SVETLO[o] + zlatoKov(ID, V.zlato);
};
/* ——— Rozbitá věc: každý kus zvlášť, kde zrovna je; pod tím, co leží nebo padá, je stín na papíře ——— */
const vrstvaZiva = (o) => (st) => {
  if (st.celist[o] >= 1) return "";
  const V = VECI[o];
  const poradi = V.kusy.map((_, i) => V.od + i).sort((a, b) => (st.p[a].rezim ? 1 : 0) - (st.p[b].rezim ? 1 : 0) || st.p[a].z - st.p[b].z);
  let stiny = "", kusy = "";
  for (const g of poradi) {
    const p = st.p[g], q = KV[g];
    if (!p.rezim) {
      kusy += tloustka(g) + kus(g, VZORY[st.vzor[g]]);
      continue;
    }
    /* čím blíž k zemi, tím je stín určitější */
    const nad = clamp((ZEM + p.z - q.stred[1] - p.y) / 70);
    const bl = 1 - nad;
    if (bl > 0.02) stiny += `<ellipse cx="${f(q.stred[0] + p.x)}" cy="${f(ZEM + p.z + q.r * 0.2 + 1)}" rx="${f(q.r * (0.75 + 0.35 * nad))}" ry="${f(q.r * 0.17 + 0.6)}" opacity="${f(0.2 * bl * bl)}"/>`;
    kusy += `<g transform="translate(${f(q.stred[0] + p.x)} ${f(q.stred[1] + p.y)}) scale(1 ${f(p.sy)}) rotate(${f(p.r)}) translate(${f(-q.stred[0])} ${f(-q.stred[1])})">${tloustka(g)}${kus(g, VZORY[st.vzor[g]])}</g>`;
  }
  return (stiny ? `<g fill="#2B2420">${stiny}</g>` : "") + kusy;
};
/*
 * Zlato, dokud není hotovo: nitka, na které si Střípek kus přitáhne, spára
 * naskočí, až jsou doma všichni její sousedi, a blýskne se. V noci svítí.
 */
const vrstvaZlatoZive = (st) => {
  let nitky = "", zare = "", zlato = "", zablesky = "";
  st.p.forEach((p, g) => {
    if (p.rezim !== 3) return;
    const q = KV[g], k = (st.t - p.tn) / PRILET;
    nitky += `<path d="M${pt(q.stred)} L${f(q.stred[0] + p.x)} ${f(q.stred[1] + p.y)}" opacity="${f(smooth(k / 0.25) * (1 - smooth((k - 0.5) / 0.5)))}"/>`;
  });
  SV.forEach((s, j) => {
    const sp = st.spary[j];
    if (!sp.cela) return;
    const v = st.t - sp.kdy;
    if (st.celist[s.o] < 1) {
      if (st.tma > 0.03) zare += `<path d="${s.stred}" opacity="${f(0.34 * st.tma)}"/>`;
      zlato += zlatoPlose(ID, s.d, s.stred);
    }
    if (v >= 0 && v < 0.5) zablesky += `<path d="${s.stred}" stroke-width="${f(3.4 * (1 - v / 0.5))}" opacity="${f(1 - smooth(v / 0.5))}"/>`;
  });
  return (
    (nitky ? `<g stroke="#E9BE55" stroke-width="0.5" stroke-linecap="round" fill="none">${nitky}</g>` : "") +
    (zare ? `<g stroke="#FFE7A3" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round" fill="none">${zare}</g>` : "") +
    zlato +
    (zablesky ? `<g stroke="#FFFBEA" stroke-linecap="round" stroke-linejoin="round" fill="none">${zablesky}</g>` : "")
  );
};
/* odlesk na zlatě: jde za kurzorem, jinak obchází nulu sám */
const lesk = (id, d, [x, y], r) =>
  `<defs><radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${f(x)}" cy="${f(y)}" r="${r}"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.95"/><stop offset="0.5" stop-color="#FFF6D8" stop-opacity="0.4"/><stop offset="1" stop-color="#FFF6D8" stop-opacity="0"/></radialGradient></defs>` +
  `<path d="${d}" fill="url(#${id})"/>`;
const vrstvaLesk = (st) => {
  const d = VECI.filter((_, o) => st.celist[o] > 0.99).map((V) => V.zlato).join(" ");
  return d ? lesk(`${ID}-lv`, d, st.lesk, 24) : "";
};
const vrstvaLeskTela = (st) => vPostave(lesk(`${ID}-lt`, ZLATO_TELA, [(st.lesk[0] - B0[0] - st.fig.x) / K + 91, (st.lesk[1] - B0[1] - st.fig.y) / K + 90], 30));

/* stíny na papíře pod tím, co se vznáší: pod čtyřkami, pod nulou a pod obláčkem */
const vrstvaStiny = (st) =>
  `<g fill="#2B2420" filter="url(#${ID}-stin)">` +
  `<ellipse cx="103" cy="188.5" rx="43" ry="3.6" opacity="${f(0.17 * st.celist[0])}"/>` +
  `<ellipse cx="220" cy="188.5" rx="56" ry="4" opacity="${f(0.11 + 0.07 * st.celist[1])}"/>` +
  `<ellipse cx="353" cy="188.5" rx="43" ry="3.6" opacity="${f(0.17 * st.celist[2])}"/></g>`;

/*
 * Světlo svatozáře: uvnitř nuly zlatý nádech, který k okraji sílí, s jemnými
 * linkami jako kirikane, a kolem krátké paprsky. Když se nula rozsype, zhasne.
 */
const vrstvaNimbus = () => {
  let linky = "", paprsky = "";
  for (let i = 0; i < 72; i++) linky += `M${pt(naKruhu(i * 5 + 2.5, R1 * (i % 3 ? 0.78 : 0.62)))} L${pt(naKruhu(i * 5 + 2.5, R1 - 1.2))} `;
  for (let i = 0; i < 40; i++) paprsky += `M${pt(naKruhu(i * 9 + 3, R2 + 3.2))} L${pt(naKruhu(i * 9 + 3, R2 + 3.2 + (i % 2 ? 3.6 : 7.4)))} `;
  return (
    `<circle cx="${C[0]}" cy="${C[1]}" r="${R1}" fill="url(#${ID}-nimbus)"/>` +
    `<path d="${linky}" stroke="#E2B552" stroke-width="0.35" stroke-linecap="round" fill="none" opacity="0.5"/>` +
    `<path d="${paprsky}" stroke="#E2B552" stroke-width="0.7" stroke-linecap="round" fill="none" opacity="0.6"/>`
  );
};
/* když zaklapne poslední kus: paprsky zpoza nuly a bílá vlna přes všechny tři číslice */
const PAPRSKY = Array.from({ length: 30 }, (_, i) => ({ a: i * 12 + 4, od: R2 + 3.5, delka: i % 2 ? 9 : 17 }));
const vrstvaPaprsky = (st) => {
  const z = st.zablesk;
  if (z < 0.01) return "";
  let d = "";
  for (const p of PAPRSKY) d += `M${pt(naKruhu(p.a + st.t * 6, p.od))} L${pt(naKruhu(p.a + st.t * 6, p.od + p.delka * (0.35 + 0.65 * Math.sin(Math.PI * clamp(z)))))} `;
  return `<path d="${d}" stroke="#E9BE55" stroke-width="0.9" stroke-linecap="round" fill="none" opacity="${f(clamp(z * 1.3))}"/>`;
};
const vrstvaZablesk = (st) => {
  const z = st.zablesk;
  if (z < 0.01) return "";
  return (
    `<g fill="#FFF8E0" fill-rule="evenodd" stroke="#FFF8E0" stroke-width="${f(2 + 5 * z)}" stroke-linejoin="round" opacity="${f(0.8 * z * z)}"><path d="${VECI[0].obrys}"/><path d="${VECI[2].obrys}"/></g>` +
    `<circle cx="${C[0]}" cy="${C[1]}" r="${f(RS)}" fill="none" stroke="#FFF8E0" stroke-width="${f(R2 - R1 + 2 + 5 * z)}" opacity="${f(0.8 * z * z)}"/>`
  );
};

/* ——— Poletující střípky: obíhají kolem nuly, dole proletí pod obláčkem ——— */
const OBEZNA = { c: C, rx: 77, ry: 74, doba: 36 };
const vrstvaKusy = (st) => st.kusy.map((q, i) => `<g transform="translate(${f(q.x)} ${f(q.y)}) rotate(${f(q.r)}) scale(0.92)">${kusSvg(ID, KUSY[i])}</g>`).join("");

/* ——— Střípek ——— */
/* obláček bere barvy z oblohy webu: v noci ztmavne s ostatními mraky */
const PROM = { zare: ["#FFE6DD", "var(--mrak-zare, #FFE6DD)"], pod: ["#7A6A9E", "var(--mrak-stin, #7A6A9E)"] };
const sPromennymi = (s) => s.replace(/fill="@(\w+)@"/g, (_, k) => `fill="${PROM[k][0]}" style="fill:${PROM[k][1]}"`);
const MRAK_V = { zare: "@zare@", pod: "@pod@" };
const OBLAK_ZADNI = sPromennymi(oblakZadni(IDV, MRAK_V));
const OBLAK_PREDNI = sPromennymi(oblakPredni(IDV, MRAK_V));
/* dva malé obláčky po stranách, co se drží toho velkého */
const vrstvaOblacky = () =>
  vPostave(
    `<g fill="url(#${IDV}-oblak-pred)"><path d="${chomac(4, 149, 15, 7, 11, 31, 0.35, 0.68)}"/><path d="${chomac(180, 145, 13, 6.4, 10, 33, 0.35, 0.68)}"/></g>` +
    sPromennymi(`<g fill="@zare@" opacity="0.7"><path d="${chomac(0, 145.6, 6.4, 3, 8, 35, 1, 0.7)}"/><path d="${chomac(177, 142, 5.6, 2.7, 8, 37, 1, 0.7)}"/></g>`),
  );
const vrstvaTvar = (st) => vPostave(strTvar({ dx: st.pohled[0], dy: st.pohled[1], mrk: st.mrk, vyraz: st.vyraz, strana: st.strana }));
const vrstvaKoncetiny = (st) => {
  /* leknutí je vyhodí nahoru, soustředění zvedne a roztáhne, radost ještě výš; pro jeden kus stačí jedna ručka */
  const cuk = st.soustr > 0.5 ? 1.6 * Math.abs(Math.sin(st.doma * N * Math.PI)) : 0;
  const chveni = 0.5 * st.soustr * Math.sin(st.t * 23);
  const ruka = ([x, y], k) => {
    const jedna = st.zved * (k === -st.zvedStrana ? 1 : 0);
    let X = x - k * 3 * st.skok, Y = y - 13 * st.skok;
    X = lerp(X, x - k * 8.5, st.soustr);
    Y = lerp(Y, y - 19, st.soustr) - cuk + chveni;
    X = lerp(X, x - k * 7, jedna);
    Y = lerp(Y, y - 17, jedna);
    X = lerp(X, x - k * 9, st.radost);
    Y = lerp(Y, y - 31, st.radost);
    return strRuka(ID, [X, Y + 1.2 * Math.sin(st.t * 1.2 + k)], { uhel: -k * (14 * Math.max(st.soustr, jedna) + 24 * st.radost) });
  };
  return vPostave(ruka(RUCE.leva, 1) + ruka(RUCE.prava, -1) + strNohy(ID, { kyv: 1.4 * st.skok }));
};
const vrstvaJiskry = (st) =>
  st.jiskry
    .map((j) => {
      const q = j.vek / j.zivot;
      const op = clamp(Math.min(q / 0.1, (1 - q) / 0.45)) * (0.55 + 0.45 * Math.sin(st.t * 13 + j.fz));
      return `<path d="${jiskraD(j.r * (1 - q * 0.4))}" transform="translate(${f(j.x)} ${f(j.y)}) rotate(${f(j.rot + q * 70)})" fill="${q < 0.3 ? "#FFF6D8" : "#F2C95E"}" stroke="#B8862A" stroke-width="0.25" opacity="${f(op)}"/>`;
    })
    .join("");

/* barva z proměnné oblohy, se zálohou pro náhled bez prohlížeče */
const zastavka = (o, zaloha, promenna) => `<stop offset="${o}" stop-color="${zaloha}" style="stop-color:${promenna}"/>`;
const defs = () =>
  strDefs(ID) +
  VECI.map(
    (V, o) =>
      `<linearGradient id="${ID}-porcelan${o}" gradientUnits="userSpaceOnUse" x1="${f(V.ram[0])}" y1="${f(V.ram[1])}" x2="${f(V.ram[2])}" y2="${f(V.ram[3])}"><stop offset="0" stop-color="#FFFFFF"/><stop offset="0.55" stop-color="#F6F2EA"/><stop offset="1" stop-color="#DFD7C8"/></linearGradient>` +
      /* objem přes celou věc: světlo vlevo nahoře, stín vpravo dole */
      `<linearGradient id="${ID}-objem${o}" gradientUnits="userSpaceOnUse" x1="${f(V.ram[0])}" y1="${f(V.ram[1])}" x2="${f(V.ram[2])}" y2="${f(V.ram[3])}"><stop offset="0.15" stop-color="#FFFFFF" stop-opacity="0.3"/><stop offset="0.45" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="0.6" stop-color="#2A1E18" stop-opacity="0"/><stop offset="0.9" stop-color="#2A1E18" stop-opacity="0.2"/></linearGradient>`,
  ).join("") +
  `<linearGradient id="${ID}-seladon" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#C9DDC8"/><stop offset="1" stop-color="#8FA996"/></linearGradient>` +
  `<pattern id="${ID}-krakel" width="11" height="11" patternUnits="userSpaceOnUse"><path d="M0 3 L4 4.6 L6 1 L11 3 M4 4.6 L3 9 L7 11 M3 9 L0 8 M6 1 L7 0 M7 11 L11 8" stroke="#6F8A78" stroke-width="0.3" fill="none"/></pattern>` +
  `<pattern id="${ID}-prach" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="1.2" cy="1.6" r="0.5" fill="#D9A93C"/><circle cx="4.4" cy="0.8" r="0.3" fill="#F2C95E"/><circle cx="3.2" cy="4.2" r="0.42" fill="#C99430"/><circle cx="5.4" cy="3.4" r="0.24" fill="#F2C95E"/><circle cx="0.6" cy="4.8" r="0.26" fill="#D9A93C"/></pattern>` +
  `<pattern id="${ID}-ichimatsu" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(12)"><rect width="5" height="5" fill="#F6EFE0"/><rect width="2.5" height="2.5" fill="#C4432B"/><rect x="2.5" y="2.5" width="2.5" height="2.5" fill="#C4432B"/></pattern>` +
  `<pattern id="${ID}-sippo" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#FBF8F2"/>${[[0, 0], [8, 0], [0, 8], [8, 8], [4, 4]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="none" stroke="${KOBALT}" stroke-width="0.5"/>`).join("")}</pattern>` +
  `<pattern id="${ID}-tokusa" width="2.8" height="2.8" patternUnits="userSpaceOnUse" patternTransform="rotate(-20)"><rect width="2.8" height="2.8" fill="#F1E9D8"/><rect width="1.3" height="2.8" fill="#3E3C78"/></pattern>` +
  KV.map((q, g) => `<clipPath id="${ID}-k${g}"><path d="${q.d}"/></clipPath>`).join("") +
  `<radialGradient id="${ID}-nimbus" cx="0.5" cy="0.5" r="0.5"><stop offset="0.3" stop-color="#FFF3CF" stop-opacity="0"/><stop offset="0.78" stop-color="#FBE3A4" stop-opacity="0.3"/><stop offset="1" stop-color="#F2CB70" stop-opacity="0.6"/></radialGradient>` +
  `<radialGradient id="${ID}-zare" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#FFF1C9" stop-opacity="0.6"/><stop offset="0.5" stop-color="#F7CFC0" stop-opacity="0.26"/><stop offset="1" stop-color="#F7CFC0" stop-opacity="0"/></radialGradient>` +
  `<filter id="${ID}-stin" x="-20%" y="-150%" width="140%" height="400%"><feGaussianBlur stdDeviation="2.4 1.1"/></filter>` +
  /* obláček jako mraky na obloze webu, v jejích barvách */
  `<linearGradient id="${IDV}-oblak" gradientUnits="userSpaceOnUse" x1="0" y1="20" x2="0" y2="260">${zastavka(0, "#F2C8C2", "var(--mrak-svetlo, #F2C8C2)")}${zastavka(0.5, "#F2C8C2", "var(--mrak-svetlo, #F2C8C2)")}${zastavka(1, "#9083AF", "var(--mrak-stin, #9083AF)")}</linearGradient>` +
  `<linearGradient id="${IDV}-oblak-pred" gradientUnits="userSpaceOnUse" x1="0" y1="119" x2="0" y2="158">${zastavka(0, "#F2C8C2", "var(--mrak-svetlo, #F2C8C2)")}${zastavka(0.45, "#F2C8C2", "var(--mrak-svetlo, #F2C8C2)")}${zastavka(1, "#B49BBE", "color-mix(in srgb, var(--mrak-svetlo, #F2C8C2) 37%, var(--mrak-stin, #9083AF))")}</linearGradient>` +
  `<filter id="${IDV}-mekce" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.2"/></filter>`;

/* ═══════════════════════════════════════════════════════════════════
 * Simulace
 * ═══════════════════════════════════════════════════════════════════ */
/* Co Střípek řekne (bublina nad hlavou): když to rupne a když je slepeno */
const RECI_RUP = ["Jejda!", "Zase?", "Au.", "A znovu…", "To nic."];
const RECI_HOTOVO = [
  "Tak. Jako nová.",
  "Skoro jako nová.",
  "Zlata mám dost.",
  "Rozbité je jen nedolepené.",
  "Tenhle kus je odjinud. Nevadí.",
  "Já se rozbil hned na první hodině.",
  "Druhé pokusy mám nejradši.",
];

/** Kus je na svém místě (nebo k němu rázová vlna ještě nedošla). */
const jeDoma = (p, t) => p.rezim === 0 || (p.rezim === 1 && t < p.t0);

const posunKusy = (dyn, t, dt, vstup, u) => {
  /* při rozbití se rozletí do stran a zatočí se */
  const rozlet = dyn.velke || (u >= 0 && u < ZNOVU + 2) ? (1 - Math.pow(1 - clamp(u / 0.5), 3)) * (1 - smooth((u - ZNOVU) / 1.4)) : 0;
  dyn.kusy.forEach((q, i) => {
    const a = dyn.uhel + (i / KUSY.length) * Math.PI * 2;
    const zx = OBEZNA.c[0] + Math.cos(a) * OBEZNA.rx * (1 + 0.14 * rozlet), zy = OBEZNA.c[1] + Math.sin(a) * OBEZNA.ry * (1 + 0.14 * rozlet);
    /* před kurzorem uhnou */
    let cx = 0, cy = 0;
    if (vstup.mys) {
      const dx = zx + q.ox - vstup.mys.x, dy = zy + q.oy - vstup.mys.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < 28) {
        cx = (dx / d) * (28 - d) * 0.9;
        cy = (dy / d) * (28 - d) * 0.9;
      }
    }
    q.vx += (70 * (cx - q.ox) - 9 * q.vx) * dt;
    q.vy += (70 * (cy - q.oy) - 9 * q.vy) * dt;
    q.ox += q.vx * dt;
    q.oy += q.vy * dt;
    q.x = zx + q.ox;
    q.y = zy + q.oy - 2.6 * Math.sin(t * 1.5 + i * 1.34);
    q.r = KUSY[i].r + 6 * Math.sin(t * 1.5 + i * 1.34) + q.vx * 0.8 + 150 * rozlet * (i % 2 ? 1 : -1);
  });
};
const novaJiskra = (dyn, x, y, vx, vy, { zivot = 1.6, r = 1.1 } = {}) => {
  const R = dyn.nahoda;
  dyn.jiskry.push({ x, y, vx, vy, vek: 0, zivot: zivot * (0.7 + R() * 0.6), r: r * (0.6 + R() * 0.8), rot: R() * 90, fz: R() * 6.28 });
};
const pan = (x) => clamp((x - C[0]) / (W / 2), -1, 1);

const novaDynamika = () => {
  const dyn = {
    /* velké rozbití: kdy začalo, jestli ještě běží, kdy bylo slepeno a kolikrát už */
    sek: -100, velke: false, hotovo: -100, pocet: 0, uvod: false,
    /* jeden kus, který vypadl sám od sebe */
    maly: -1, malyOd: -100, malyDoma: -100, malyStrana: 1, dalsi: 22,
    vzor: KV.map(() => 0), verze: 0, dalsiVzor: 6,
    p: KV.map(() => ({ x: 0, y: 0, r: 0, sy: 1, vx: 0, vy: 0, vr: 0, rezim: 0, t0: 0, z: 0, kdy: 0, tn: 0, od: null, lehl: false, doma: -100 })),
    spary: SV.map(() => ({ cela: true, kdy: -100 })),
    cinku: 0, tuku: 0,
    uhel: 0.5, roztoceni: 1,
    kusy: KUSY.map(() => ({ ox: 0, oy: 0, vx: 0, vy: 0, x: 0, y: 0, r: 0 })),
    jiskry: [], akum: 0, nahoda: rng(404), zvuk: [], udalosti: [],
    pohled: [0, 0], lesk: [C[0] - 40, C[1] - 30], blizko: 0, strana: 1,
    hodina: HOD_KLID, klidHod: HOD_KLID, rec: null,
  };
  /* pár kusů je cizích hned od začátku, jako na něm samém */
  const cizi = [[0, 4, 2], [0, 6, 3], [1, 3, 1], [1, 6, 3], [1, 9, 2], [2, 2, 1], [2, 8, 4]];
  for (const [o, i, v] of cizi) dyn.vzor[VECI[o].od + i] = v;
  posunKusy(dyn, 0, 0, {}, -100);
  return dyn;
};

/** Všechno se rozbije: rána vychází z bodu c, kusy dál od něj se pohnou o chvilku později. */
const rozbij = (dyn, t, c) => {
  const R = dyn.nahoda;
  dyn.sek = t;
  dyn.velke = true;
  dyn.maly = -1;
  dyn.cinku = 0;
  dyn.tuku = 0;
  dyn.p.forEach((p, g) => {
    const q = KV[g];
    const dx = q.stred[0] + p.x - c[0], dy = q.stred[1] + p.y - c[1];
    const d = Math.hypot(dx, dy) || 1;
    /* u rány to kusy rozmetá, dál od ní se jen sesypou pod sebe */
    const s = 14 + 250 * Math.exp(-d / 58);
    p.vx = (dx / d) * s + (R() - 0.5) * 64;
    p.vy = (dy / d) * s * 0.7 - 50 - R() * 110;
    p.vr = (R() - 0.5) * 900;
    p.rezim = 1;
    p.t0 = t + d / 950;
    p.z = (R() - 0.5) * 15;
    p.lehl = false;
    p.kdy = t + ZNOVU + (q.poradi / (N - 1)) * OBEH;
  });
  /* v tom zmatku se jeden kus vymění za cizí (ne ty dva dole za obláčkem) */
  let g = Math.floor(R() * N);
  if (KV[g].o === NULA && (KV[g].i < 1 || KV[g].i > 10)) g = VECI[NULA].od + 5;
  dyn.vzor[g] = dyn.vzor[g] === dyn.dalsiVzor ? 0 : dyn.dalsiVzor;
  dyn.dalsiVzor = 1 + (dyn.dalsiVzor % (VZORY.length - 1));
  dyn.verze++;
  dyn.zvuk.push({ druh: "krup", sila: 1, pan: pan(c[0]) });
  dyn.zvuk.push({ druh: "krup", sila: 0.6, pan: -0.7, za: 0.12 });
  dyn.zvuk.push({ druh: "krup", sila: 0.6, pan: 0.7, za: 0.2 });
  dyn.zvuk.push({ druh: "pisk", sila: 0.5, pan: 0, za: 0.04 });
  dyn.zvuk.push({ druh: "rin", sila: 0.8, pan: 0, za: ZNOVU - 0.45 });
  /* zlato ze spár se rozprskne */
  for (const s of SV)
    for (let k = 1; k < 3; k++) {
      const [x, y] = s.body[Math.min(k, s.body.length - 1)];
      novaJiskra(dyn, x, y, (x - c[0]) * (0.2 + R() * 0.5) + (R() - 0.5) * 30, (y - c[1]) * (0.2 + R() * 0.5) - 20 - R() * 30, { zivot: 1.1, r: 1.3 });
    }
  dyn.rec = { text: RECI_RUP[dyn.pocet ? 1 + ((dyn.pocet - 1) % (RECI_RUP.length - 1)) : 0], od: t + 0.12, po: t + 1.5 };
  dyn.udalosti.push({ druh: "rozbito", pocet: dyn.pocet });
};

/** Jeden kus vypadne sám od sebe: spadne, chvíli leží a Střípek ho vrátí. */
const vypadni = (dyn, t) => {
  const R = dyn.nahoda;
  /* jen z těch, co nejsou schované za postavou */
  const kandidati = KV.map((q, g) => g).filter((g) => KV[g].o !== NULA || (KV[g].i >= 2 && KV[g].i <= 9));
  const g = kandidati[Math.floor(R() * kandidati.length)];
  const p = dyn.p[g];
  p.rezim = 1;
  p.t0 = t;
  p.vx = (R() - 0.5) * 36;
  p.vy = -20;
  p.vr = (R() < 0.5 ? -1 : 1) * (80 + R() * 160);
  p.z = (R() - 0.5) * 10;
  p.lehl = false;
  p.kdy = t + 2.7;
  dyn.maly = g;
  dyn.malyOd = t;
  dyn.malyStrana = KV[g].stred[0] >= C[0] ? 1 : -1;
  dyn.zvuk.push({ druh: "lup", sila: 0.8, pan: pan(KV[g].stred[0]) });
  for (const s of SV) if (s.mezi.includes(g)) novaJiskra(dyn, s.pul[0], s.pul[1], (R() - 0.5) * 20, -8 - R() * 12, { zivot: 0.9 });
};

const krokKusu = (dyn, g, t, dt, vstup) => {
  const p = dyn.p[g], q = KV[g], R = dyn.nahoda;
  if (p.rezim === 0) return;
  /* je čas: Střípek si ho přitáhne zpátky, odkudkoli */
  if (p.rezim < 3 && t >= p.kdy) {
    p.rezim = 3;
    p.tn = t;
    p.od = { x: p.x, y: p.y, r: ((((p.r + 180) % 360) + 360) % 360) - 180, sy: p.sy };
    dyn.zvuk.push({ druh: "svist", sila: 0.5, pan: pan(q.stred[0] + p.x) });
  }
  if (p.rezim === 3) {
    const k = (t - p.tn) / PRILET;
    if (k >= 1) {
      p.rezim = 0;
      p.x = p.y = p.r = p.vx = p.vy = p.vr = 0;
      p.sy = 1;
      p.doma = t;
      return;
    }
    const e = dosed(k);
    p.x = p.od.x * (1 - e);
    p.y = p.od.y * (1 - e);
    p.r = p.od.r * (1 - e);
    p.sy = lerp(p.od.sy, 1, smooth(k * 1.7));
    return;
  }
  if (t < p.t0) return;
  /* nejníž, kam může: když leží naplocho, je blíž k zemi */
  const dno = () => ZEM + p.z - q.stred[1] - q.r * 0.5 * p.sy;
  if (p.lehl) p.sy = kCili(p.sy, 0.4, dt, 0.08);
  if (p.rezim === 1) {
    p.vy += TIHA * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.r += p.vr * dt;
    if (p.y >= dno() && p.vy > 0) {
      p.y = dno();
      if (dyn.tuku < 14) {
        dyn.tuku++;
        dyn.zvuk.push({ druh: "tuk", sila: clamp(p.vy / 300, 0.25, 1), pan: pan(q.stred[0] + p.x) });
      }
      if (p.vy > 90) {
        p.vy *= -0.3;
        p.vx *= 0.62;
        p.vr *= 0.45;
      } else {
        p.vy = 0;
        p.rezim = 2;
      }
      p.lehl = true;
    }
  } else {
    /* leží: doklouže, dotočí se, a když kolem prolétne kurzor, uhne */
    if (vstup.mys && (vstup.rychlost || 0) > 70) {
      const dx = q.stred[0] + p.x - vstup.mys.x, dy = ZEM + p.z - vstup.mys.y;
      if (Math.abs(dx) < 16 && Math.abs(dy) < 16) {
        p.vx += Math.sign(dx || 1) * Math.min(vstup.rychlost, 500) * 2.2 * dt;
        p.vr += (R() - 0.5) * 900 * dt;
      }
    }
    p.x += p.vx * dt;
    p.r += p.vr * dt;
    p.vx *= Math.exp(-dt / 0.14);
    p.vr *= Math.exp(-dt / 0.16);
    p.y = dno();
  }
  /* z papíru nevypadne */
  const x = q.stred[0] + p.x;
  if (x < 26 || x > W - 26) {
    p.x = clamp(x, 26, W - 26) - q.stred[0];
    p.vx *= -0.4;
  }
};

const krok = (dyn, t, dt, vstup) => {
  const R = dyn.nahoda;
  const vsichniDoma = () => dyn.p.every((p) => p.rezim === 0);
  /* poprvé to rupne samo, chvilku po příchodu — stránka se rozbije před očima */
  if (!dyn.uvod && !vstup.klid && t >= 1.25) {
    dyn.uvod = true;
    if (!dyn.velke) rozbij(dyn, t, [C[0], C[1] - 6]);
  }
  if (vstup.kliky && vstup.kliky.length) {
    for (const k of vstup.kliky.splice(0)) {
      dyn.uvod = true;
      if (!dyn.velke && t - dyn.hotovo > 0.9) rozbij(dyn, t, [k.x, k.y]);
      else if (dyn.velke)
        /* střepy na zemi jdou rozkopnout */
        dyn.p.forEach((p, g) => {
          if (p.rezim !== 2) return;
          const q = KV[g];
          const dx = q.stred[0] + p.x - k.x, dy = ZEM + p.z - k.y;
          const d = Math.hypot(dx, dy);
          if (d > 48) return;
          p.rezim = 1;
          p.t0 = t;
          p.vx = (dx / (d || 1)) * (60 + R() * 110) * (1 - d / 80);
          p.vy = -150 - R() * 130;
          p.vr = (R() - 0.5) * 900;
          p.sy = Math.max(p.sy, 0.75);
          p.lehl = false;
          dyn.zvuk.push({ druh: "tuk", sila: 0.6, pan: pan(q.stred[0] + p.x), za: R() * 0.05 });
        });
    }
  }
  /* když se dlouho nic neděje, jeden kus vypadne sám */
  if (!vstup.klid && !dyn.velke && dyn.maly < 0 && t >= dyn.dalsi && t - dyn.hotovo > 6 && vsichniDoma()) {
    vypadni(dyn, t);
    dyn.dalsi = t + 20 + R() * 16;
  }
  if (vstup.mys) dyn.dalsi = Math.max(dyn.dalsi, t + 9);

  for (let g = 0; g < N; g++) krokKusu(dyn, g, t, dt, vstup);

  /* spáry: zlato se zalije, až jsou doma všichni sousedi, a cinkne */
  SV.forEach((s, j) => {
    const sp = dyn.spary[j];
    const cela = s.mezi.every((g) => jeDoma(dyn.p[g], t));
    if (cela && !sp.cela) {
      sp.kdy = t;
      dyn.zvuk.push({ druh: "cink", vys: dyn.velke ? Math.round((dyn.cinku++ * 13) / (SV.length - 1)) : 4 + Math.floor(R() * 4), sila: 0.8, pan: pan(s.pul[0]) });
      for (const [x, y] of s.body) novaJiskra(dyn, x, y, (R() - 0.5) * 16, -4 - R() * 10, { zivot: 0.9 });
    }
    sp.cela = cela;
  });
  /* kus, který vypadl sám, je zpátky */
  if (dyn.maly >= 0 && dyn.p[dyn.maly].rezim === 0) {
    dyn.maly = -1;
    dyn.malyDoma = t;
  }
  /* poslední kus zaklapl: zlato vzplane a rozední se */
  if (dyn.velke && vsichniDoma()) {
    dyn.velke = false;
    dyn.hotovo = t;
    dyn.pocet++;
    dyn.klidHod = HOD_RANO;
    dyn.dalsi = t + 24 + R() * 12;
    dyn.zvuk.push({ druh: "zare", sila: 1, pan: 0 });
    dyn.zvuk.push({ druh: "svitani", sila: 0.9, pan: 0, za: 0.1 });
    dyn.zvuk.push({ druh: "smich", sila: 0.6, pan: 0, za: 0.5 });
    for (let i = 0; i < 36; i++) {
      const a = R() * Math.PI * 2, r = R1 + R() * (R2 - R1);
      novaJiskra(dyn, C[0] + Math.cos(a) * r, C[1] + Math.sin(a) * r, Math.cos(a) * (14 + R() * 30), Math.sin(a) * (14 + R() * 30) - 6, { zivot: 1.7, r: 1.4 });
    }
    for (const s of SV) if (s.o !== NULA) novaJiskra(dyn, s.pul[0], s.pul[1], (R() - 0.5) * 34, -10 - R() * 26, { zivot: 1.6, r: 1.4 });
    dyn.rec = { text: RECI_HOTOVO[(dyn.pocet - 1) % RECI_HOTOVO.length], od: t + 0.7, po: t + 3.9 };
    dyn.udalosti.push({ druh: "slepeno", pocet: dyn.pocet });
  }

  const u = t - dyn.sek;
  /* mávnutí myší střípky roztočí */
  const cilR = 1 + 5 * clamp((vstup.rychlost || 0) / 320);
  dyn.roztoceni = kCili(dyn.roztoceni, cilR, dt, dyn.roztoceni > cilR ? 1.8 : 0.3);
  dyn.uhel += dt * ((Math.PI * 2) / OBEZNA.doba) * dyn.roztoceni;
  posunKusy(dyn, t, dt, vstup, u);
  /* zlatý prach: z nuly (když drží) a zpod obláčku */
  dyn.akum += dt * (2.4 + 3 * (dyn.roztoceni - 1));
  while (dyn.akum >= 1) {
    dyn.akum -= 1;
    if (R() < 0.6) {
      if (dyn.velke) continue;
      const a = R() * Math.PI * 2, r = R1 + R() * (R2 - R1);
      novaJiskra(dyn, C[0] + Math.cos(a) * r, C[1] + Math.sin(a) * r, (R() - 0.5) * 3, 2 + R() * 5, { zivot: 2 });
    } else novaJiskra(dyn, B0[0] - 48 + R() * 96, 163 + R() * 5, (R() - 0.5) * 3, 5 + R() * 7, { zivot: 2.2 });
  }
  for (const j of dyn.jiskry) {
    j.vek += dt;
    j.x += (j.vx + Math.sin(j.vek * 3 + j.fz) * 3) * dt;
    j.y += j.vy * dt;
    j.vx *= 1 - dt * 1.6;
    j.vy += (6 - j.vy) * dt * 1.2;
  }
  dyn.jiskry = dyn.jiskry.filter((j) => j.vek < j.zivot);
  /* odlesk: za kurzorem, jinak obchází nulu */
  const cilL = vstup.mys ? [vstup.mys.x, vstup.mys.y] : [C[0] + Math.cos(t * 0.55) * 47, C[1] + Math.sin(t * 0.55) * 47];
  dyn.lesk = dyn.lesk.map((v, i) => kCili(v, cilL[i], dt, 0.1));
  /* kurzor u tváře ho vyruší jen napůl: pootevře oko */
  const uTvare = !!vstup.mys && Math.hypot(vstup.mys.x - TVAR0[0], vstup.mys.y - TVAR0[1]) < 30;
  dyn.blizko = kCili(dyn.blizko, uTvare ? 1 : 0, dt, uTvare ? 0.12 : 0.4);
  if (uTvare) dyn.strana = vstup.mys.x >= TVAR0[0] ? 1 : -1;
  /* pohled: po ráně kouká dolů na tu spoušť, při lepení na kus, který se právě vrací */
  const na = ([x, y]) => [clamp((x - TVAR0[0]) / 40, -1, 1) * 1.9, clamp((y - TVAR0[1]) / 40, -1, 1) * 1.3];
  let kam = vstup.mys ? [clamp((vstup.mys.x - TVAR0[0]) / 30, -1, 1) * 1.8, clamp((vstup.mys.y - TVAR0[1]) / 30, -1, 1) * 1.2] : [0, 0];
  if (dyn.velke) {
    kam = [1.9 * Math.sin(u * 4.2), 1.2];
    let posl = -1;
    dyn.p.forEach((p, g) => {
      if (p.rezim === 3 && (posl < 0 || p.tn > dyn.p[posl].tn)) posl = g;
    });
    if (posl >= 0) kam = na([KV[posl].stred[0] + dyn.p[posl].x, KV[posl].stred[1] + dyn.p[posl].y]);
    else if (u > ZNOVU) kam = dyn.pohled;
  } else if (dyn.maly >= 0) {
    const p = dyn.p[dyn.maly];
    kam = na([KV[dyn.maly].stred[0] + p.x, KV[dyn.maly].stred[1] + p.y]);
    dyn.strana = dyn.malyStrana;
  }
  dyn.pohled = dyn.pohled.map((v, i) => kCili(v, kam[i], dt, 0.12));
  /* obloha: po ráně se setmí, s každým kusem je blíž ráno, po posledním vyjde slunce */
  let cilH = dyn.klidHod, kH = 1.6;
  if (dyn.velke) {
    const doma = dyn.p.filter((p) => p.rezim === 0).length / N;
    cilH = doma > 0 ? lerp(3.6, 5.3, doma) : HOD_NOC;
    kH = doma > 0 ? 0.3 : 0.42;
  } else if (t - dyn.hotovo < 1.7) {
    cilH = 6.5;
    kH = 0.45;
  }
  dyn.hodina = kCili(dyn.hodina, cilH, dt, kH);
};

const stav = (t, vstup = {}, dyn) => {
  const d = dyn || novaDynamika();
  const u = t - d.sek, v = t - d.hotovo, w = t - d.malyDoma;
  let vyraz = "medituje";
  if (d.velke) vyraz = u < 0.75 ? "leknuti" : u < ZNOVU - 0.35 ? "kouka" : "soustredeni";
  else if (v >= 0 && v < 1) vyraz = "smich";
  else if (v >= 1 && v < 2.6) vyraz = "pysny";
  else if (d.maly >= 0) vyraz = t - d.malyOd < 0.5 ? "medituje" : "kouk1";
  else if (w >= 0 && w < 1.1) vyraz = "pysny";
  else if (d.blizko > 0.5) vyraz = "kouk1";
  const skok = d.velke && u < 0.5 ? Math.sin((Math.PI * u) / 0.5) : 0;
  /* celá věc: všechny kusy doma a velké lepení skončilo — pak ji převezme hotová kresba s kovovým zlatem */
  const celist = VECI.map((V) => {
    if (d.velke) return 0;
    let posl = d.hotovo;
    for (let i = 0; i < V.kusy.length; i++) {
      const p = d.p[V.od + i];
      if (p.rezim !== 0) return 0;
      posl = Math.max(posl, p.doma);
    }
    return smooth((t - posl - 0.05) / 0.25);
  });
  return {
    t, u, vyraz, skok, celist, p: d.p, spary: d.spary, vzor: d.vzor, verze: d.verze,
    kusy: d.kusy, jiskry: d.jiskry, lesk: d.lesk, pohled: d.pohled, strana: d.strana,
    /* kolik kusů už je doma (0…1) — podle toho mu cukají ručky */
    doma: d.velke ? d.p.filter((p) => p.rezim === 0).length / N : 1,
    zablesk: v < 0 || v > 1.2 ? 0 : smooth(v / 0.07) * (1 - smooth(v / 1.2)),
    soustr: d.velke ? smooth((u - (ZNOVU - 0.4)) / 0.3) : v >= 0 && v < 0.2 ? 1 - smooth(v / 0.18) : 0,
    radost: v < 0 || v > 1.3 ? 0 : smooth(v / 0.16) * (1 - smooth((v - 0.8) / 0.5)),
    zved: d.maly >= 0 ? smooth((t - d.malyOd - 0.9) / 0.35) : w >= 0 && w < 0.45 ? 1 - smooth(w / 0.45) : 0,
    zvedStrana: d.malyStrana,
    fig: { x: 0, y: 2.2 * Math.sin(t * 1.2) - 3.4 * skok, r: 1.2 * Math.sin(t * 0.8) },
    mrk: mrkani(t, [2.1, 5.6, 5.85, 8.9], 10.4),
    hodina: d.hodina,
    /* jak moc je tma: Střípek na noční obloze ztmavne, zlaté spáry svítí */
    tma: smooth((5.3 - d.hodina) / 1.4),
    rec: d.rec && t >= d.rec.od && t < d.rec.po ? d.rec.text : "",
  };
};
const snimek = (st) => Math.floor(st.t * 30);
const pohyb = (st) => ({ x: st.fig.x, y: st.fig.y, r: st.fig.r, ox: B0[0], oy: B0[1] });
/* obláček se pod ním při leknutí zmáčkne */
const pohybOblaku = (st) => ({ ...pohyb(st), sx: 1 + 0.05 * st.skok, sy: 1 - 0.07 * st.skok });
/* živá vrstva se překresluje, jen dokud se v ní něco hýbe */
const klicZive = (o) => (st) => {
  if (st.celist[o] >= 1) return -1;
  const V = VECI[o];
  for (let i = 0; i < V.kusy.length; i++) if (st.p[V.od + i].rezim) return snimek(st);
  return `doma${st.verze}`;
};
const veci = [0, 1, 2].flatMap((o) => [
  { id: `ziva${o}`, kresli: vrstvaZiva(o), klic: klicZive(o) },
  { id: `cela${o}`, kresli: vrstvaCela(o), klic: (st) => st.verze, tezka: true, pruhlednost: (st) => f(st.celist[o]) },
]);

export const scena = {
  id: "nenalezeno",
  viewBox: `0 0 ${W} ${H}`,
  W, H,
  defs,
  novaDynamika,
  krok,
  stav,
  hukot: (st) => ({ misa: clamp(0.3 + 0.6 * st.soustr), vitr: 0.1 + 0.16 * st.tma }),
  klidne: { t: 0 },
  vrstvy: [
    { id: "stiny", kresli: vrstvaStiny, klic: (st) => st.celist.map((c) => Math.round(c * 8)).join() },
    { id: "zare", kresli: () => `<circle cx="${C[0]}" cy="${C[1]}" r="104" fill="url(#${ID}-zare)"/>`, pruhlednost: (st) => f(clamp((0.78 + 0.1 * Math.sin(st.t * 0.9)) * (1 - 0.6 * st.tma) + 0.4 * st.zablesk)) },
    { id: "paprsky", kresli: vrstvaPaprsky, klic: (st) => (st.zablesk > 0.01 ? snimek(st) : -1) },
    { id: "nimbus", kresli: vrstvaNimbus, pruhlednost: (st) => f(st.celist[NULA] * (0.86 + 0.14 * Math.sin(st.t * 1.3))) },
    { id: "kusy", kresli: vrstvaKusy, klic: snimek, tma: true },
    ...veci,
    { id: "zlato-zive", kresli: vrstvaZlatoZive, klic: (st) => (st.celist.some((c) => c < 1) || st.spary.some((s) => st.t - s.kdy < 0.5) ? snimek(st) : -1) },
    { id: "lesk", kresli: vrstvaLesk, klic: (st) => `${Math.round(st.lesk[0] * 2)},${Math.round(st.lesk[1] * 2)},${st.celist.map((c) => (c > 0.99 ? 1 : 0)).join("")}` },
    { id: "zablesk", kresli: vrstvaZablesk, klic: (st) => (st.zablesk > 0.01 ? snimek(st) : -1) },
    { id: "oblacky", kresli: vrstvaOblacky, pohyb: (st) => ({ x: 0, y: 1.8 * Math.sin(st.t * 0.9 + 2), r: 0, ox: B0[0], oy: B0[1] }) },
    { id: "oblak-zadni", kresli: () => vPostave(OBLAK_ZADNI), pohyb: pohybOblaku },
    { id: "telo", kresli: () => vPostave(strTelo(ID) + strZlato(ID)), tezka: true, tma: true, pohyb },
    { id: "lesk-tela", kresli: vrstvaLeskTela, klic: (st) => `${Math.round(st.lesk[0] * 2)},${Math.round((st.lesk[1] - st.fig.y) * 2)}`, pohyb },
    { id: "oblak-predni", kresli: () => vPostave(OBLAK_PREDNI), tezka: true, pohyb: pohybOblaku },
    { id: "tvar", kresli: vrstvaTvar, klic: (st) => `${f(st.pohled[0])},${f(st.pohled[1])},${f(st.mrk)},${st.vyraz},${st.strana}`, tma: true, pohyb },
    { id: "koncetiny", kresli: vrstvaKoncetiny, klic: (st) => (st.skok || st.soustr || st.radost || st.zved ? snimek(st) : Math.floor(st.t * 15)), tma: true, pohyb },
    { id: "jiskry", kresli: vrstvaJiskry, klic: (st) => (st.jiskry.length ? snimek(st) : -1) },
  ],
};

/** Obsah vrstvy — stejně ho skládá běh i statický snímek. */
export const obsahVrstvy = (v, st) => v.kresli(st);

/**
 * Celá kresba jako jedno SVG — pro náhled v Node, nebo jako statický první
 * snímek, který komponenta vloží do stránky (s třídou místo rozměrů).
 * Vrstvy s `pohyb` dostanou stejný posun a natočení jako v prohlížeči.
 */
export const celeSvg = (V, t, dyn, vstup = {}, { sirka = 1320, pozadi = "#F7F1E3", trida = null } = {}) => {
  const st = V.stav(t, vstup, dyn);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${V.viewBox}" ${trida ? `class="${trida}" aria-hidden="true" focusable="false"` : `width="${sirka}" height="${Math.round((sirka * V.H) / V.W)}"`}>` +
    `<defs>${V.defs()}</defs>` +
    (pozadi ? `<rect x="-50" y="-50" width="${V.W + 100}" height="${V.H + 100}" fill="${pozadi}"/>` : "") +
    V.vrstvy
      .map((v) => {
        let obsah = obsahVrstvy(v, st);
        if (v.pohyb) {
          const p = v.pohyb(st);
          obsah = `<g transform="translate(${f(p.ox + p.x)} ${f(p.oy + p.y)}) rotate(${f(p.r || 0)}) scale(${f(p.sx ?? 1)} ${f(p.sy ?? 1)}) translate(${f(-p.ox)} ${f(-p.oy)})">${obsah}</g>`;
        }
        const op = v.pruhlednost ? ` opacity="${v.pruhlednost(st)}"` : "";
        return `<g${op}>${obsah}</g>`;
      })
      .join("") +
    `</svg>`
  );
};

/** Přetočí simulaci na čas t (pro první snímek a pro klidný režim). */
export const pretoc = (V, t, vstup = {}, krokS = 1 / 60) => {
  const dyn = V.novaDynamika();
  for (let q = 0; q < t; q += krokS) V.krok(dyn, q, krokS, typeof vstup === "function" ? vstup(q) : vstup);
  dyn.zvuk.length = 0;
  dyn.udalosti.length = 0;
  return dyn;
};
