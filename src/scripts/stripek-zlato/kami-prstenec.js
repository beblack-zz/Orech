/*
 * 01, Kami — SVATOZÁŘ ZE STŘEPŮ
 *
 * Pecinka má za zády plameny, Bublinka studený oheň. Střípek má talíř —
 * tedy to, co z něj zbylo: okraj velkého porcelánového talíře, který
 * někdo upustil, slepený zlatem zpátky do kruhu. Střed chybí, a tak je
 * z něj svatozář. Většina kusů je z jednoho talíře (bílý, s kobaltovými
 * linkami a tečkami po obvodu), pár jich je odjinud, jako na Střípkovi
 * samém: jobicugi, lepení z cizího nádobí. Vlnky seigaiha, modrotisk
 * v barvách loga, seladon, černé raku se zlatým prachem.
 *
 * Střípek před ním medituje na obláčku a kolem obíhají menší střípky,
 * jak obíhaly vždycky. Prstenec drží pohromadě tím, že se soustředí.
 *
 * Myš je světlo: odlesk na zlatě jde za kurzorem. Poletující střípky
 * před ním uhýbají, a když se myší mávne, roztočí se rychleji. Když se
 * kurzor přiblíží k tváři, Střípek pootevře jedno oko.
 * Kliknutí ho vyruší: lekne se, svatozář se rozsype a kusy zůstanou viset
 * ve vzduchu. Zavře oči, vyplázne špičku jazyka a kusy se vracejí jeden
 * po druhém dokola, každý cinkne o stupeň výš a spára se zalije zlatem.
 * Jeden z nich se pokaždé vrátí jiný — z cizího nádobí. Zlata neubývá.
 */
import {
  f, rng, clamp, lerp, smooth, rad, pt, cara, pres, mrkani, jiskraD, kCili,
  chomac, sparaVzorky, sparaTvar, elipsaD, zlatoKov, zlatoPlose,
  strDefs, strTelo, strZlato, strTvar, strRuka, strNohy, RUCE, ZLATO_TELA, oblakZadni, oblakPredni, KUSY, kusSvg,
} from "./spolecne.js";

const ID = "sz1";
const C = [90, 84];
const R1 = 48, R2 = 63.5;
const B0 = [90, 103];
const K = 0.86;
const POSTAVA = `translate(${B0[0]} ${B0[1]}) scale(${K}) translate(-91 -90)`;
const vPostave = (s) => `<g transform="${POSTAVA}">${s}</g>`;
/** Bod z kresby Střípka na plátno (bez vznášení). */
const naPlatno = ([x, y]) => [B0[0] + (x - 91) * K, B0[1] + (y - 90) * K];
const TVAR0 = naPlatno([93, 92]);
const OBRYS = "#6B5D4F";
const KOBALT = "#2F4E9C";
const N = 12;

/* Rozsypání: kusy vyletí, visí, od ZNOVU se vracejí dokola; poslední je doma v SPOJENO */
const VEN = 0.5, ZNOVU = 1.7, OBEH = 2.5, PRILET = 0.36;
const SPOJENO = ZNOVU + OBEH + PRILET;
const KONEC = SPOJENO + 0.3;
const navrat = (i) => ZNOVU + (i / (N - 1)) * OBEH;
/** Kdy se zalije spára j (mezi kusem j−1 a j): až je doma ten pozdější z nich. */
const spoj = (j) => navrat(j === 0 ? N - 1 : j) + PRILET * 0.8;
/** Dosednutí s překmitem: 0 → 1, cestou kousek přes. */
const dosed = (x) => {
  x = clamp(x);
  return 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2);
};
/** Jak daleko je kus i od svého místa: 0 doma, 1 nejdál. */
const mira = (i, u) => (u < 0 || u > KONEC ? 0 : (1 - Math.pow(1 - clamp(u / VEN), 3)) * (1 - dosed((u - navrat(i)) / PRILET)));

/* ——— Prstenec: okraj talíře rozlámaný na dvanáct kusů ——— */
const Rg = rng(1207);
const naKruhu = (a, r) => [C[0] + Math.cos(rad(a)) * r, C[1] + Math.sin(rad(a)) * r];
const UHLY = (() => {
  const sirky = Array.from({ length: N }, () => 0.62 + Rg() * 0.76);
  const soucet = sirky.reduce((a, b) => a + b, 0);
  /* začíná dole za obláčkem a jde po směru hodin */
  const U = [100];
  for (const w of sirky) U.push(U[U.length - 1] + (w / soucet) * 360);
  return U;
})();
/* trhlina i je hranice mezi kusem i−1 a i: od vnitřního okraje k vnějšímu, dvakrát zalomená */
const TRHLINY = UHLY.slice(0, N).map((a) => [naKruhu(a, R1), naKruhu(a + (Rg() - 0.5) * 7, lerp(R1, R2, 0.36)), naKruhu(a + (Rg() - 0.5) * 7, lerp(R1, R2, 0.68)), naKruhu(a, R2)]);
const KUS_D = TRHLINY.map((A, i) => {
  const B = TRHLINY[(i + 1) % N];
  return `M${pt(A[0])} L${pt(A[1])} L${pt(A[2])} L${pt(A[3])} A${R2} ${R2} 0 0 1 ${pt(B[3])} L${pt(B[2])} L${pt(B[1])} L${pt(B[0])} A${R1} ${R1} 0 0 0 ${pt(A[0])} Z`;
});
const STRED_UHEL = UHLY.slice(0, N).map((a, i) => (a + UHLY[i + 1]) / 2);
const STREDY = STRED_UHEL.map((a) => naKruhu(a, (R1 + R2) / 2));
/* kam který kus odletí, jak se pootočí a jak se ve vzduchu pohupuje */
const LET = STRED_UHEL.map((a) => ({ smer: [Math.cos(rad(a)), Math.sin(rad(a))], dal: 12 + Rg() * 9, bok: (Rg() - 0.5) * 9, rot: (Rg() < 0.5 ? -1 : 1) * (9 + Rg() * 22), fz: Rg() * 6.28 }));
const SPARY_V = TRHLINY.map((B, i) => sparaVzorky(B, 40 + i, 1.45, { max: 2.1 }));
const SPARY_D = SPARY_V.map((V) => sparaTvar(V));
const SPARY_STRED = TRHLINY.map(cara);
/* loužička zlata střídavě u vnějšího a vnitřního okraje */
const LOUZE = TRHLINY.map((B, i) => (i % 2 ? [lerp(B[0][0], B[1][0], 0.3), lerp(B[0][1], B[1][1], 0.3)] : [lerp(B[3][0], B[2][0], 0.3), lerp(B[3][1], B[2][1], 0.3)]));
const ZLATO_PRSTENCE = SPARY_D.join(" ") + " " + LOUZE.map(([x, y]) => elipsaD(x, y, 1.5, 1.2)).join(" ");

/* vzory kusů: 0 je talíř, ostatní cizí nádobí */
const VZORY = ["talir", "seigaiha", "modrotisk", "seladon", "raku", "ichimatsu", "sippo", "tokusa"];
const VYPLN = {
  talir: `url(#${ID}-porcelan)`, seigaiha: `url(#${ID}-seigaiha)`, modrotisk: `url(#${ID}-modrotisk-pud)`, seladon: `url(#${ID}-seladon)`,
  raku: "#2A2420", ichimatsu: `url(#${ID}-ichimatsu)`, sippo: `url(#${ID}-sippo)`, tokusa: `url(#${ID}-tokusa)`,
};
const RS = (R1 + R2) / 2;
const kruh = (r, atributy) => `<circle cx="${C[0]}" cy="${C[1]}" r="${f(r)}" fill="none" ${atributy}/>`;
/* talíř: dvojlinka u obou okrajů a mezi nimi řada velkých a malých teček (kobalt pod glazurou) */
const OZDOBA_TALIRE =
  kruh(R2 - 2.3, `stroke="${KOBALT}" stroke-width="0.75"`) + kruh(R2 - 3.5, `stroke="${KOBALT}" stroke-width="0.3"`) +
  kruh(R1 + 2.3, `stroke="${KOBALT}" stroke-width="0.75"`) + kruh(R1 + 3.5, `stroke="${KOBALT}" stroke-width="0.3"`) +
  kruh(RS, `stroke="${KOBALT}" stroke-width="2" stroke-linecap="round" stroke-dasharray="0.01 4.95"`) +
  kruh(RS, `stroke="${KOBALT}" stroke-width="0.9" stroke-linecap="round" stroke-dasharray="0.01 4.95" stroke-dashoffset="2.48"`);
const ozdoba = (i, vzor) => {
  const orez = (s) => `<g clip-path="url(#${ID}-k${i})">${s}</g>`;
  if (vzor === "talir") return orez(OZDOBA_TALIRE);
  if (vzor === "modrotisk") return `<path d="${KUS_D[i]}" fill="url(#${ID}-modrotisk)"/>`;
  if (vzor === "seladon") return `<path d="${KUS_D[i]}" fill="url(#${ID}-krakel)"/>`;
  if (vzor === "raku") return `<path d="${KUS_D[i]}" fill="url(#${ID}-prach)"/>` + orez(kruh(R2 - 1.6, `stroke="#7A3A26" stroke-width="2.2" opacity="0.75"`));
  if (vzor === "seigaiha" || vzor === "sippo") return orez(kruh(R2 - 1.5, `stroke="${KOBALT}" stroke-width="1.5"`) + kruh(R1 + 1.4, `stroke="${KOBALT}" stroke-width="1.2"`));
  return "";
};
const tloustka = (i) => `<path d="${KUS_D[i]}" transform="translate(1.5 2.6)" fill="url(#${ID}-hrana)" stroke="${OBRYS}" stroke-width="0.8" stroke-linejoin="round"/>`;
const kus = (i, vzor) =>
  `<path d="${KUS_D[i]}" fill="${VYPLN[vzor]}"/>` + ozdoba(i, vzor) +
  `<path d="${KUS_D[i]}" fill="url(#${ID}-objem)"/>` +
  `<path d="${KUS_D[i]}" fill="none" stroke="${OBRYS}" stroke-width="0.9" stroke-linejoin="round"/>`;

/* Celý prstenec: kreslí se jednou (a znovu, až se některý kus vymění), zlato je kov */
const vrstvaPrstenec = (st) => {
  let s = "";
  for (let i = 0; i < N; i++) s += tloustka(i);
  for (let i = 0; i < N; i++) s += kus(i, VZORY[st.vzor[i]]);
  /* světlo na glazuře vlevo nahoře */
  const A = naKruhu(196, R2 - 1.3), B = naKruhu(258, R2 - 1.3);
  s += `<path d="M${pt(A)} A${f(R2 - 1.3)} ${f(R2 - 1.3)} 0 0 1 ${pt(B)}" stroke="#FFFFFF" stroke-width="1.1" stroke-linecap="round" fill="none" opacity="0.85"/>`;
  return s + zlatoKov(ID, ZLATO_PRSTENCE);
};
/* Rozsypaný prstenec: každý kus zvlášť, zlato ploché; spára naskočí, až jsou oba sousedi doma */
const vrstvaPrstenecZivy = (st) => {
  if (!st.zivy) return "";
  const u = st.u;
  let kusy = "", nitky = "", zlato = "", zablesky = "";
  for (let i = 0; i < N; i++) {
    const m = mira(i, u), L = LET[i];
    const vis = clamp(m);
    const dx = L.smer[0] * L.dal * m - L.smer[1] * L.bok * vis + Math.sin(st.t * 1.3 + L.fz) * 1.5 * vis;
    const dy = L.smer[1] * L.dal * m + L.smer[0] * L.bok * vis + Math.cos(st.t * 1.1 + L.fz) * 1.5 * vis;
    const tr = `translate(${f(dx)} ${f(dy)}) rotate(${f(L.rot * m)} ${pt(STREDY[i])})`;
    kusy += `<g transform="${tr}">${tloustka(i)}${kus(i, VZORY[st.vzor[i]])}</g>`;
    /* zlatá nitka, na které si ho přitáhne */
    const v = u - navrat(i);
    if (v > -0.3 && v < PRILET) nitky += `<path d="M${pt(STREDY[i])} L${f(STREDY[i][0] + dx)} ${f(STREDY[i][1] + dy)}" opacity="${f(smooth((v + 0.3) / 0.2) * (1 - smooth(v / PRILET)))}"/>`;
  }
  for (let j = 0; j < N; j++) {
    const v = u - spoj(j);
    if (v < 0) continue;
    zlato += zlatoPlose(ID, SPARY_D[j] + " " + elipsaD(LOUZE[j][0], LOUZE[j][1], 1.5, 1.2), SPARY_STRED[j]);
    if (v < 0.5) zablesky += `<path d="${SPARY_STRED[j]}" stroke-width="${f(3.4 * (1 - v / 0.5))}" opacity="${f(1 - smooth(v / 0.5))}"/>`;
  }
  return (
    (nitky ? `<g stroke="#E9BE55" stroke-width="0.5" stroke-linecap="round" fill="none">${nitky}</g>` : "") +
    kusy + zlato +
    (zablesky ? `<g stroke="#FFFBEA" stroke-linecap="round" stroke-linejoin="round" fill="none">${zablesky}</g>` : "")
  );
};
/* odlesk na zlatě: jde za kurzorem, jinak obchází prstenec sám */
const lesk = (id, d, [x, y], r) =>
  `<defs><radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${f(x)}" cy="${f(y)}" r="${r}"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.95"/><stop offset="0.5" stop-color="#FFF6D8" stop-opacity="0.4"/><stop offset="1" stop-color="#FFF6D8" stop-opacity="0"/></radialGradient></defs>` +
  `<path d="${d}" fill="url(#${id})"/>`;
const vrstvaLeskPrstence = (st) => (st.celist > 0.99 ? lesk(`${ID}-lp`, ZLATO_PRSTENCE, st.lesk, 22) : "");
const vrstvaLeskTela = (st) => vPostave(lesk(`${ID}-lt`, ZLATO_TELA, [(st.lesk[0] - B0[0] - st.fig.x) / K + 91, (st.lesk[1] - B0[1] - st.fig.y) / K + 90], 30));

/*
 * Světlo svatozáře: uvnitř prstence zlatý nádech, který k okraji sílí, s jemnými
 * linkami jako kirikane, a kolem prstence krátké paprsky. Když se prstenec
 * rozsype, zhasne.
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
/* dva malé obláčky po stranách, co se drží toho velkého */
const vrstvaOblacky = () =>
  vPostave(
    `<g fill="url(#${ID}-oblak-pred)"><path d="${chomac(4, 149, 15, 7, 11, 31, 0.35, 0.68)}"/><path d="${chomac(180, 145, 13, 6.4, 10, 33, 0.35, 0.68)}"/></g>` +
    `<g fill="#FFE6DD" opacity="0.7"><path d="${chomac(0, 145.6, 6.4, 3, 8, 35, 1, 0.7)}"/><path d="${chomac(177, 142, 5.6, 2.7, 8, 37, 1, 0.7)}"/></g>`,
  );

/* když prstenec zaklapne: paprsky zpoza něj a bílá vlna přes něj */
const PAPRSKY = Array.from({ length: 30 }, (_, i) => ({ a: i * 12 + 4, od: R2 + 3.5, delka: i % 2 ? 9 : 17 }));
const vrstvaPaprsky = (st) => {
  const z = st.zablesk;
  if (z < 0.01) return "";
  let d = "";
  for (const p of PAPRSKY) d += `M${pt(naKruhu(p.a + st.t * 6, p.od))} L${pt(naKruhu(p.a + st.t * 6, p.od + p.delka * (0.35 + 0.65 * Math.sin(Math.PI * clamp(z)))))} `;
  return `<path d="${d}" stroke="#E9BE55" stroke-width="0.9" stroke-linecap="round" fill="none" opacity="${f(clamp(z * 1.3))}"/>`;
};
const vrstvaZablesk = (st) =>
  st.zablesk < 0.01 ? "" : `<circle cx="${C[0]}" cy="${C[1]}" r="${f(RS)}" fill="none" stroke="#FFF8E0" stroke-width="${f(R2 - R1 + 2 + 5 * st.zablesk)}" opacity="${f(0.8 * st.zablesk * st.zablesk)}"/>`;

/* ——— Poletující střípky ——— */
/* obíhají kolem celé svatozáře, dole proletí pod obláčkem */
const OBEZNA = { c: C, rx: 77, ry: 74, doba: 36 };
const vrstvaKusy = (st) => st.kusy.map((q, i) => `<g transform="translate(${f(q.x)} ${f(q.y)}) rotate(${f(q.r)}) scale(0.92)">${kusSvg(ID, KUSY[i])}</g>`).join("");

/* ——— Střípek ——— */
const vrstvaTvar = (st) => vPostave(strTvar({ dx: st.pohled[0], dy: st.pohled[1], mrk: st.mrk, vyraz: st.vyraz, strana: st.strana }));
const vrstvaKoncetiny = (st) => {
  const u = st.u;
  /* leknutí je vyhodí nahoru, soustředění zvedne a roztáhne, radost ještě výš */
  const cuk = st.soustr > 0.5 ? 1.6 * Math.abs(Math.sin(((u - ZNOVU) / OBEH) * (N - 1) * Math.PI)) : 0;
  const chveni = 0.5 * st.soustr * Math.sin(st.t * 23);
  const ruka = ([x, y], k) => {
    let X = x - k * 3 * st.skok, Y = y - 13 * st.skok;
    X = lerp(X, x - k * 8.5, st.soustr);
    Y = lerp(Y, y - 19, st.soustr) - cuk + chveni;
    X = lerp(X, x - k * 9, st.radost);
    Y = lerp(Y, y - 31, st.radost);
    return strRuka(ID, [X, Y + 1.2 * Math.sin(st.t * 1.2 + k)], { uhel: -k * (14 * st.soustr + 24 * st.radost) });
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

const defs = () =>
  strDefs(ID) +
  `<linearGradient id="${ID}-porcelan" gradientUnits="userSpaceOnUse" x1="${C[0] - R2}" y1="${C[1] - R2}" x2="${C[0] + R2}" y2="${C[1] + R2}"><stop offset="0" stop-color="#FFFFFF"/><stop offset="0.55" stop-color="#F6F2EA"/><stop offset="1" stop-color="#DFD7C8"/></linearGradient>` +
  /* objem přes celý prstenec: světlo vlevo nahoře, stín vpravo dole */
  `<linearGradient id="${ID}-objem" gradientUnits="userSpaceOnUse" x1="${C[0] - R2}" y1="${C[1] - R2}" x2="${C[0] + R2}" y2="${C[1] + R2}"><stop offset="0.15" stop-color="#FFFFFF" stop-opacity="0.3"/><stop offset="0.45" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="0.6" stop-color="#2A1E18" stop-opacity="0"/><stop offset="0.9" stop-color="#2A1E18" stop-opacity="0.2"/></linearGradient>` +
  `<linearGradient id="${ID}-seladon" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#C9DDC8"/><stop offset="1" stop-color="#8FA996"/></linearGradient>` +
  `<pattern id="${ID}-krakel" width="11" height="11" patternUnits="userSpaceOnUse"><path d="M0 3 L4 4.6 L6 1 L11 3 M4 4.6 L3 9 L7 11 M3 9 L0 8 M6 1 L7 0 M7 11 L11 8" stroke="#6F8A78" stroke-width="0.3" fill="none"/></pattern>` +
  `<pattern id="${ID}-prach" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="1.2" cy="1.6" r="0.5" fill="#D9A93C"/><circle cx="4.4" cy="0.8" r="0.3" fill="#F2C95E"/><circle cx="3.2" cy="4.2" r="0.42" fill="#C99430"/><circle cx="5.4" cy="3.4" r="0.24" fill="#F2C95E"/><circle cx="0.6" cy="4.8" r="0.26" fill="#D9A93C"/></pattern>` +
  `<pattern id="${ID}-ichimatsu" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(12)"><rect width="5" height="5" fill="#F6EFE0"/><rect width="2.5" height="2.5" fill="#C4432B"/><rect x="2.5" y="2.5" width="2.5" height="2.5" fill="#C4432B"/></pattern>` +
  `<pattern id="${ID}-sippo" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#FBF8F2"/>${[[0, 0], [8, 0], [0, 8], [8, 8], [4, 4]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="none" stroke="${KOBALT}" stroke-width="0.5"/>`).join("")}</pattern>` +
  `<pattern id="${ID}-tokusa" width="2.8" height="2.8" patternUnits="userSpaceOnUse" patternTransform="rotate(-20)"><rect width="2.8" height="2.8" fill="#F1E9D8"/><rect width="1.3" height="2.8" fill="#3E3C78"/></pattern>` +
  KUS_D.map((d, i) => `<clipPath id="${ID}-k${i}"><path d="${d}"/></clipPath>`).join("") +
  `<radialGradient id="${ID}-nimbus" cx="0.5" cy="0.5" r="0.5"><stop offset="0.3" stop-color="#FFF3CF" stop-opacity="0"/><stop offset="0.78" stop-color="#FBE3A4" stop-opacity="0.3"/><stop offset="1" stop-color="#F2CB70" stop-opacity="0.6"/></radialGradient>` +
  `<radialGradient id="${ID}-zare" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#FFF1C9" stop-opacity="0.6"/><stop offset="0.5" stop-color="#F7CFC0" stop-opacity="0.26"/><stop offset="1" stop-color="#F7CFC0" stop-opacity="0"/></radialGradient>`;

/* ——— Simulace ——— */
const posunKusy = (dyn, t, dt, vstup, u) => {
  /* při rozsypání se rozletí do stran a zatočí se */
  const rozlet = u >= 0 && u < KONEC ? (1 - Math.pow(1 - clamp(u / VEN), 3)) * (1 - smooth((u - ZNOVU) / 1.4)) : 0;
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
const novaDynamika = () => {
  const dyn = {
    sek: -100, vzor: Array.from({ length: N }, () => 0), verze: 0, dalsiVzor: 4, uhel: 0.5, roztoceni: 1,
    kusy: KUSY.map(() => ({ ox: 0, oy: 0, vx: 0, vy: 0, x: 0, y: 0, r: 0 })),
    jiskry: [], akum: 0, nahoda: rng(909), zvuk: [], pohled: [0, 0], lesk: [C[0] - 40, C[1] - 30], blizko: 0, strana: 1,
  };
  /* tři kusy jsou cizí hned od začátku, jako na něm samém */
  dyn.vzor[3] = 1;
  dyn.vzor[6] = 3;
  dyn.vzor[9] = 2;
  posunKusy(dyn, 0, 0, {}, -100);
  return dyn;
};
const krok = (dyn, t, dt, vstup) => {
  const R = dyn.nahoda;
  if (vstup.kliky && vstup.kliky.length) {
    vstup.kliky.length = 0;
    if (t - dyn.sek > KONEC + 0.9) {
      dyn.sek = t;
      /* v tom zmatku se jeden kus vymění za cizí (ne ty dva dole za obláčkem) */
      const i = 2 + Math.floor(R() * (N - 3));
      dyn.vzor[i] = dyn.vzor[i] === dyn.dalsiVzor ? 0 : dyn.dalsiVzor;
      dyn.dalsiVzor = 1 + (dyn.dalsiVzor % (VZORY.length - 1));
      dyn.verze++;
      dyn.zvuk.push({ druh: "krup", sila: 1, pan: 0 });
      dyn.zvuk.push({ druh: "pisk", sila: 0.5, pan: 0, za: 0.04 });
      dyn.zvuk.push({ druh: "rin", sila: 0.8, pan: 0, za: ZNOVU - 0.45 });
      for (let j = 0; j < N; j++) dyn.zvuk.push({ druh: "cink", vys: j === 0 ? N : j, sila: 0.8, pan: clamp(Math.cos(rad(UHLY[j])) * 0.8, -1, 1), za: spoj(j) });
      dyn.zvuk.push({ druh: "zare", sila: 1, pan: 0, za: SPOJENO });
      dyn.zvuk.push({ druh: "smich", sila: 0.6, pan: 0, za: KONEC + 0.2 });
      /* zlato ze spár se rozprskne */
      for (let j = 0; j < N; j++)
        for (let k = 0; k < 3; k++) {
          const [x, y] = TRHLINY[j][1 + (k % 2)];
          novaJiskra(dyn, x, y, (x - C[0]) * (0.5 + R() * 0.8) + (R() - 0.5) * 20, (y - C[1]) * (0.5 + R() * 0.8) + (R() - 0.5) * 20, { zivot: 1.1, r: 1.3 });
        }
    }
  }
  const u = t - dyn.sek, u0 = u - dt;
  /* každá zalitá spára zajiskří, po poslední to vzplane celé */
  if (u >= 0 && u < KONEC)
    for (let j = 0; j < N; j++)
      if (pres(u0, u, spoj(j))) for (const [x, y] of TRHLINY[j]) novaJiskra(dyn, x, y, (R() - 0.5) * 16, -4 - R() * 10, { zivot: 0.9 });
  if (pres(u0, u, SPOJENO))
    for (let i = 0; i < 36; i++) {
      const a = R() * Math.PI * 2, r = R1 + R() * (R2 - R1);
      novaJiskra(dyn, C[0] + Math.cos(a) * r, C[1] + Math.sin(a) * r, Math.cos(a) * (14 + R() * 30), Math.sin(a) * (14 + R() * 30) - 6, { zivot: 1.7, r: 1.4 });
    }
  /* mávnutí myší střípky roztočí */
  const cilR = 1 + 5 * clamp((vstup.rychlost || 0) / 320);
  dyn.roztoceni = kCili(dyn.roztoceni, cilR, dt, dyn.roztoceni > cilR ? 1.8 : 0.3);
  dyn.uhel += dt * ((Math.PI * 2) / OBEZNA.doba) * dyn.roztoceni;
  posunKusy(dyn, t, dt, vstup, u);
  /* zlatý prach: z prstence (když drží) a zpod obláčku */
  dyn.akum += dt * (2.4 + 3 * (dyn.roztoceni - 1));
  while (dyn.akum >= 1) {
    dyn.akum -= 1;
    if (R() < 0.6) {
      if (u >= 0 && u < SPOJENO) continue;
      const a = R() * Math.PI * 2, r = R1 + R() * (R2 - R1);
      novaJiskra(dyn, C[0] + Math.cos(a) * r, C[1] + Math.sin(a) * r, (R() - 0.5) * 3, 2 + R() * 5, { zivot: 2 });
    } else novaJiskra(dyn, 42 + R() * 96, 151 + R() * 5, (R() - 0.5) * 3, 5 + R() * 7, { zivot: 2.2 });
  }
  for (const j of dyn.jiskry) {
    j.vek += dt;
    j.x += (j.vx + Math.sin(j.vek * 3 + j.fz) * 3) * dt;
    j.y += j.vy * dt;
    j.vx *= 1 - dt * 1.6;
    j.vy += (6 - j.vy) * dt * 1.2;
  }
  dyn.jiskry = dyn.jiskry.filter((j) => j.vek < j.zivot);
  /* odlesk: za kurzorem, jinak obchází prstenec */
  const cilL = vstup.mys ? [vstup.mys.x, vstup.mys.y] : [C[0] + Math.cos(t * 0.55) * 47, C[1] + Math.sin(t * 0.55) * 47];
  dyn.lesk = dyn.lesk.map((v, i) => kCili(v, cilL[i], dt, 0.1));
  /* kurzor u tváře ho vyruší jen napůl: pootevře oko */
  const uTvare = !!vstup.mys && Math.hypot(vstup.mys.x - TVAR0[0], vstup.mys.y - TVAR0[1]) < 30;
  dyn.blizko = kCili(dyn.blizko, uTvare ? 1 : 0, dt, uTvare ? 0.12 : 0.4);
  if (uTvare) dyn.strana = vstup.mys.x >= TVAR0[0] ? 1 : -1;
  /* pohled: po rozsypání se rozhlíží, při lepení kouká na kus, který se právě vrací */
  let kam = vstup.mys ? [clamp((vstup.mys.x - TVAR0[0]) / 30, -1, 1) * 1.8, clamp((vstup.mys.y - TVAR0[1]) / 30, -1, 1) * 1.2] : [0, 0];
  if (u >= 0 && u < ZNOVU - 0.35) kam = [1.9 * Math.sin(u * 6), -0.9];
  else if (u >= 0 && u < SPOJENO) {
    const S = STREDY[Math.round(clamp((u - ZNOVU) / OBEH) * (N - 1))];
    kam = [clamp((S[0] - TVAR0[0]) / 30, -1, 1) * 1.9, clamp((S[1] - TVAR0[1]) / 30, -1, 1) * 1.3];
  }
  dyn.pohled = dyn.pohled.map((v, i) => kCili(v, kam[i], dt, 0.12));
};
const stav = (t, vstup = {}, dyn) => {
  const d = dyn || novaDynamika();
  const u = t - d.sek;
  const bezi = u >= 0 && u < KONEC + 1.7;
  let vyraz = "medituje";
  if (bezi) vyraz = u < 0.75 ? "leknuti" : u < ZNOVU - 0.35 ? "kouka" : u < SPOJENO ? "soustredeni" : u < KONEC + 0.7 ? "smich" : "pysny";
  else if (d.blizko > 0.5) vyraz = "kouk1";
  const skok = u >= 0 && u < 0.5 ? Math.sin((Math.PI * u) / 0.5) : 0;
  const v = u - SPOJENO;
  return {
    t, u, vyraz, skok, vzor: d.vzor, verze: d.verze, kusy: d.kusy, jiskry: d.jiskry, lesk: d.lesk, pohled: d.pohled, strana: d.strana,
    /* živá vrstva kreslí, dokud ji hotový prstenec nepřekryje */
    zivy: u >= 0 && u < KONEC + 0.15,
    celist: u < 0 || u > KONEC + 0.1 ? 1 : smooth((u - (KONEC - 0.2)) / 0.3),
    zablesk: v < 0 || v > 1.2 ? 0 : smooth(v / 0.07) * (1 - smooth(v / 1.2)),
    soustr: u < 0 ? 0 : smooth((u - (ZNOVU - 0.4)) / 0.3) * (1 - smooth(v / 0.18)),
    radost: v < 0 || v > 1.3 ? 0 : smooth(v / 0.16) * (1 - smooth((v - 0.8) / 0.5)),
    fig: { x: 0, y: 2.2 * Math.sin(t * 1.2) - 3.4 * skok, r: 1.2 * Math.sin(t * 0.8) },
    mrk: mrkani(t, [2.1, 5.6, 5.85, 8.9], 10.4),
  };
};
const snimek = (st) => Math.floor(st.t * 30);
const pohyb = (st) => ({ x: st.fig.x, y: st.fig.y, r: st.fig.r, ox: B0[0], oy: B0[1] });
/* obláček se pod ním při leknutí zmáčkne */
const pohybOblaku = (st) => ({ ...pohyb(st), sx: 1 + 0.05 * st.skok, sy: 1 - 0.07 * st.skok });

export const kamiPrstenec = {
  id: "prstenec",
  viewBox: "0 0 180 180",
  defs,
  novaDynamika,
  krok,
  stav,
  hukot: (st) => ({ misa: clamp(0.3 + 0.6 * st.soustr), vitr: 0.12 }),
  klidne: { t: 3 },
  vrstvy: [
    { id: "zare", kresli: () => `<circle cx="${C[0]}" cy="${C[1]}" r="104" fill="url(#${ID}-zare)"/>`, pruhlednost: (st) => f(clamp(0.78 + 0.1 * Math.sin(st.t * 0.9) + 0.4 * st.zablesk)) },
    { id: "paprsky", kresli: vrstvaPaprsky, klic: (st) => (st.zablesk > 0.01 ? snimek(st) : -1) },
    { id: "nimbus", kresli: vrstvaNimbus, pruhlednost: (st) => f(st.celist * (0.86 + 0.14 * Math.sin(st.t * 1.3))) },
    { id: "kusy", kresli: vrstvaKusy, klic: snimek },
    { id: "prstenec-zivy", kresli: vrstvaPrstenecZivy, klic: (st) => (st.zivy ? snimek(st) : -1) },
    { id: "prstenec", kresli: vrstvaPrstenec, klic: (st) => st.verze, tezka: true, pruhlednost: (st) => f(st.celist) },
    { id: "lesk-prstence", kresli: vrstvaLeskPrstence, klic: (st) => (st.celist > 0.99 ? `${Math.round(st.lesk[0] * 2)},${Math.round(st.lesk[1] * 2)}` : -1) },
    { id: "zablesk", kresli: vrstvaZablesk, klic: (st) => (st.zablesk > 0.01 ? snimek(st) : -1) },
    { id: "oblacky", kresli: vrstvaOblacky, pohyb: (st) => ({ x: 0, y: 1.8 * Math.sin(st.t * 0.9 + 2), r: 0, ox: B0[0], oy: B0[1] }) },
    { id: "oblak-zadni", kresli: () => vPostave(oblakZadni(ID)), pohyb: pohybOblaku },
    { id: "telo", kresli: () => vPostave(strTelo(ID) + strZlato(ID)), tezka: true, pohyb },
    { id: "lesk-tela", kresli: vrstvaLeskTela, klic: (st) => `${Math.round(st.lesk[0] * 2)},${Math.round((st.lesk[1] - st.fig.y) * 2)}`, pohyb },
    { id: "oblak-predni", kresli: () => vPostave(oblakPredni(ID)), tezka: true, pohyb: pohybOblaku },
    { id: "tvar", kresli: vrstvaTvar, klic: (st) => `${f(st.pohled[0])},${f(st.pohled[1])},${f(st.mrk)},${st.vyraz},${st.strana}`, pohyb },
    { id: "koncetiny", kresli: vrstvaKoncetiny, klic: (st) => (st.skok || st.soustr || st.radost ? snimek(st) : Math.floor(st.t * 15)), pohyb },
    { id: "jiskry", kresli: vrstvaJiskry, klic: (st) => (st.jiskry.length ? snimek(st) : -1) },
  ],
};
