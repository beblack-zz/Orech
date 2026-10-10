/*
 * 02, Tušový lem — PRASKLÁ NOC
 *
 * Nejvzácnější čajové misky jsou černé a uvnitř mají noční oblohu: jóhen
 * tenmoku, glazura s hvězdami. Tahle noc je taková miska zevnitř — a jako
 * každá miska jednou praskne. Mrazem, nebo když do ní někdo ťukne.
 * Trhlinou prosvítá papír. Střípek k ní přiletí na obláčku se štětcem
 * a zalije ji: od jednoho konce k druhému, odbočky doteče lak sám.
 * V tuši to není zlato jako kov (to má jen on sám na těle), ale světlo:
 * spára je čistá bledě zlatá plocha bez textury se září kolem, stejná jako
 * srpek měsíce v hlavičce webu, a nic jiného tu nesvítí. Když barva dojde, zaletí si namočit do misky, která
 * i s nářadím stojí dole na papíře.
 *
 * Zlata přibývá, až je noc žilkovaná jako slepená miska. Pak spáry
 * vzplanou, za horami vyjde slunce a tuš se na chvíli prolne do barev
 * svítání — těch, které má jeho obláček odjakživa. Potom se setmí
 * a nová noc je zase celá.
 *
 * Kliknutí: noc praskne tam, kam se ukáže, a Střípek se lekne. Myš: kouká
 * za kurzorem a odlesk na zlatě jde za ním. Když se nic neděje, praská
 * noc sama a on ji spravuje.
 */
import {
  f, rng, clamp, lerp, smooth, rad, pt, cara, pres, pasPoBodech, hrouda, mrkani, jiskraD, kCili, bodNaCare, delky,
  sparaVzorky, sparaTvar, elipsaD,
  strDefs, strTelo, strZlato, strTvar, strRuka, strNohy, RUCE, strSilueta, oblakZadni, oblakPredni, KUSY, kusSvg, stetecSvg, tusLem,
} from "./spolecne.js";

const ID = "sz2";
const TUS = tusLem(ID, { seed: 23, barva: "#0F1128", lem: "#2B2E55" });
/* stejná skvrna v barvách svítání: s nocí se jen prolíná */
const TUS_R = tusLem(`${ID}r`, { seed: 23, barva: "#EFC3C1", lem: "#E0B2C2", skvrny: [0.62, 0.46, 0.68], silaSkvrn: 1.15 });
const OREZ = `${ID}-tus-orez`;
const PAPIR = "#F1EAD8";
/*
 * Čím se tu maluje místo kovového zlata: bledě zlatá jako srpek měsíce v hlavičce
 * (.hlava-tema-mesic v styles/parta2.css — #FBE3A0 se září #FFE7A3), jádro jako
 * měsíc na obloze webu (#FFF6DA).
 */
const ZLUTA = { jadro: "#FFF6DA", svetla: "#FFE7A3", zaklad: "#FBE3A0", okraj: "#D9B968" };
/** Zalitá spára: jedna čistá žlutá plocha bez obrysu, linek a textury — svítí jen září kolem. */
const svitici = (d) => `<path d="${d}" fill="${ZLUTA.zaklad}"/>`;

const K = 0.44;
const B0 = [90, 64];
const POSTAVA = `translate(${B0[0]} ${B0[1]}) scale(${K}) translate(-91 -90)`;
const vPostave = (s) => `<g transform="${POSTAVA}">${s}</g>`;
/* dlaň v klidu od středu postavy, kam až dosáhne, délka štětce */
const RUKA = [19, 8.7], DOSAH = 12.5, LB = 17.5;
/* nářadí dole na papíře: hladina zlata v misce, jak se kreslí, a zvětšení celého tácku kolem jeho paty */
const MISKA = [110, 166.4], PATA = 178, VETSI = 1.25;
/* kam míří štětec, když si namáčí */
const NAMOC = [MISKA[0], PATA + (MISKA[1] - PATA) * VETSI];
/* po kolika spárách se rozední; klikáním jich jde přidat pár navíc, pak už noc jen ťukne */
const NEJVIC = 9, CEKA_NEJVIC = 5;
const RYCHLOST = 21, NABRANO = 150, RUST = 115;
/* svítání: vzplanutí, prolnutí, výdrž, setmění */
const R_ZAP = 1, R_PLNE = 3.4, R_NOC = 6.6, R_KONEC = 9;
const SLUNCE_X = 118;

/* ——— Kde smí noc praskat ——— */
const doOblasti = ([x, y]) => {
  const dx = (x - 90) / 60, dy = (y - 84) / 49;
  const d = Math.hypot(dx, dy);
  return d <= 1 ? [x, y] : [90 + (dx / d) * 60, 84 + (dy / d) * 49];
};
const vNoci = ([x, y]) => Math.hypot(x - 90, y - 90) < 76 && y > 16 && y < 150;

/* ——— Trhliny ——— */
const rameno = (R, x, y, smer, delka) => {
  const B = [[x, y]];
  let zbyva = delka;
  while (zbyva > 0) {
    const krok = 3.2 + R() * 4.6;
    smer += (R() - 0.5) * 1.2;
    let n = [x + Math.cos(smer) * krok, y + Math.sin(smer) * krok];
    if (!vNoci(n)) {
      smer = Math.atan2(90 - y, 90 - x) + (R() - 0.5) * 0.9;
      n = [x + Math.cos(smer) * krok, y + Math.sin(smer) * krok];
    }
    [x, y] = n;
    B.push(n);
    zbyva -= krok;
  }
  return B;
};
/**
 * Trhlina: hlavní čára (od špičky jednoho ramene přes místo úderu ke špičce
 * druhého) a odbočky. `uder` je délka, ve které leží úder — odtud roste.
 */
const postav = (hlavni, uderI, vetve, seed, t0) => {
  const D = delky(hlavni);
  return {
    hlavni, D, delka: D[D.length - 1], uderI, uder: D[uderI], seed, t0, faze: "ceka", s: 0,
    V: sparaVzorky(hlavni, seed, 1.05, { min: 0.6, max: 1.55, kolis: 0.3, krok: 1.5 }),
    vetve: vetve.map(({ i, body }, k) => {
      const Db = delky(body);
      return { i, od: D[i], body, D: Db, delka: Db[Db.length - 1], V: sparaVzorky(body, seed + 7 + k, 0.75, { min: 0.4, max: 1.05, kolis: 0.26, krok: 1.3 }), tz: null, z: 0 };
    }),
  };
};
const novaTrhlina = (R, [x, y], t0) => {
  const a0 = R() * Math.PI * 2;
  const A = rameno(R, x, y, a0, 13 + R() * 17), B = rameno(R, x, y, a0 + Math.PI + (R() - 0.5) * 1.2, 13 + R() * 17);
  const hlavni = [...A.slice().reverse(), ...B.slice(1)];
  const vetve = [];
  const kolik = R() < 0.55 ? 2 : 1;
  for (let k = 0; k < kolik; k++) {
    const i = 1 + Math.floor(R() * (hlavni.length - 2));
    if (vetve.some((v) => v.i === i)) continue;
    const smer = Math.atan2(hlavni[i + 1][1] - hlavni[i - 1][1], hlavni[i + 1][0] - hlavni[i - 1][0]) + (R() < 0.5 ? 1 : -1) * (0.9 + R() * 0.7);
    vetve.push({ i, body: rameno(R, hlavni[i][0], hlavni[i][1], smer, 6 + R() * 8) });
  }
  return postav(hlavni, A.length - 1, vetve, Math.floor(R() * 1e6), t0);
};
/** Střípek začne od bližšího konce: trhlina se otočí. */
const otoc = (tr) => {
  const n = tr.hlavni.length - 1;
  Object.assign(tr, postav(tr.hlavni.slice().reverse(), n - tr.uderI, tr.vetve.map((v) => ({ i: n - v.i, body: v.body })), tr.seed, tr.t0), { faze: tr.faze });
};
const dokonci = (tr) => {
  tr.faze = "hotova";
  tr.s = tr.delka;
  const U = tr.hlavni[tr.uderI];
  tr.d = sparaTvar(tr.V) + " " + tr.vetve.map((v) => sparaTvar(v.V)).join(" ") + " " + elipsaD(U[0], U[1], 1.5, 1.2);
  tr.stred = cara(tr.hlavni) + " " + tr.vetve.map((v) => cara(v.body)).join(" ");
};
/** Kus lomené čáry mezi délkami a a b. */
const usek = (B, D, a, b) => [bodNaCare(B, D, a), ...B.filter((_, i) => D[i] > a + 0.05 && D[i] < b - 0.05), bodNaCare(B, D, b)];
/** Nezalitá trhlina: tudy prosvítá papír. Nejširší v místě úderu, ke špičkám se ztrácí. */
const sterbina = (B, sirka) => {
  if (B.length < 2) return "";
  return `<path d="${pasPoBodech(B, (q) => sirka(q) + 3)}" fill="#C9D2FF" opacity="0.1"/><path d="${pasPoBodech(B, (q) => sirka(q) + 0.8)}" fill="#03040A" opacity="0.85"/><path d="${pasPoBodech(B, sirka)}" fill="${PAPIR}"/>`;
};

/* ——— Pozadí v tuši: hvězdy v glazuře, hory, borovice ——— */
const JOHEN = (() => {
  /* skvrny jóhen: shluky světlých teček s modrými a fialovými dvorci */
  const r = rng(77);
  const tecky = [];
  for (const [cx, cy, n, rozptyl] of [[44, 40, 9, 13], [112, 30, 8, 12], [146, 70, 8, 11], [70, 78, 6, 12], [30, 92, 6, 10], [128, 108, 7, 12], [86, 22, 5, 9], [60, 116, 5, 9], [152, 110, 4, 7]])
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * rozptyl;
      tecky.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.8, 0.22 + r() * r() * 1.05]);
    }
  return tecky;
})();
const vrstvaJohen = () =>
  JOHEN.map(([x, y, r]) =>
    (r > 0.6 ? `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 3.3)}" fill="none" stroke="#7A56C8" stroke-width="${f(r * 0.7)}" opacity="0.22"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 2.1)}" fill="none" stroke="#4F7BE0" stroke-width="${f(r * 0.8)}" opacity="0.42"/>` : "") +
    `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${r > 0.6 ? "#E6ECFF" : "#B9C6F2"}" opacity="${f(0.55 + r * 0.4)}"/>`,
  ).join("");
const MRKAVE = JOHEN.filter(([, , r]) => r > 0.78).slice(0, 8);

const NOC = { daleko: "#1A1D40", blizko: "#13152E", zem: "#0A0B1A", strom: "#05060E", hrana: "#2D3263", jehlici: "#0B1420", mlha: `${ID}-mlha-hor` };
const RANO = { daleko: "#B98DAC", blizko: "#916E9C", zem: "#65507E", strom: "#3C2F55", hrana: "#F6CDBE", jehlici: "#4A3A5E", mlha: `${ID}-mlha-rano` };
const KMEN = [[18, 170], [21, 154], [28, 140], [38, 130], [47, 124]];
const VETVE = [[[28, 140], [18, 133], [8, 131]], [[38, 130], [50, 127], [61, 129]], [[23, 150], [35, 147], [45, 149]], [[47, 124], [54, 118], [63, 117]]];
const krajina = (P) => {
  let s = `<path d="M0 138 C14 132 24 124 36 127 C48 130 56 119 70 122 C84 125 92 134 106 131 C122 127 132 117 146 121 C160 125 170 133 180 131 V182 H0 Z" fill="${P.daleko}"/>`;
  s += `<path d="M36 127 C48 130 56 119 70 122 M106 131 C122 127 132 117 146 121" stroke="${P.hrana}" stroke-width="0.5" fill="none" opacity="0.7"/>`;
  s += `<rect x="0" y="124" width="180" height="30" fill="url(#${P.mlha})"/>`;
  s += `<path d="M0 150 C20 143 36 147 52 141 C70 134 84 146 100 147 C118 148 130 139 148 143 C162 146 172 150 180 148 V182 H0 Z" fill="${P.blizko}"/>`;
  s += `<path d="M0 163 C30 157 60 161 92 159 C124 157 150 162 180 159 V182 H0 Z" fill="${P.zem}"/>`;
  /* borovice na skále vlevo: kmen, větve a ploché polštáře jehličí */
  s += `<path d="${pasPoBodech(KMEN, (q) => lerp(5.4, 1.6, q))}" fill="${P.strom}"/>`;
  VETVE.forEach((V, i) => {
    s += `<path d="${cara(V)}" stroke="${P.strom}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
    const [x, y] = V[2];
    for (const [dx, dy, rx] of [[0, -1.4, 9.5], [-7, 0.6, 6.5], [6, -3.4, 6]]) {
      s += `<path d="${hrouda(x + dx, y + dy, rx, 2.5, 11 + i * 3 + rx, { bodu: 12, kolisani: 0.2 })}" fill="${P.jehlici}"/>`;
      s += `<path d="M${f(x + dx - rx * 0.8)} ${f(y + dy - 1.9)} Q${f(x + dx)} ${f(y + dy - 3.5)} ${f(x + dx + rx * 0.8)} ${f(y + dy - 1.9)}" stroke="${P.hrana}" stroke-width="0.4" fill="none" opacity="0.6"/>`;
    }
  });
  return s;
};
const vrstvaTus = () => TUS.skvrna + `<g clip-path="url(#${OREZ})"><rect x="0" y="0" width="180" height="182" fill="url(#${ID}-nebe)"/>${vrstvaJohen()}${krajina(NOC)}</g>`;
const vrstvaHvezdy = (st) =>
  MRKAVE.map(([x, y, r], i) => {
    const k = 0.5 + 0.5 * Math.sin(st.t * (1.1 + i * 0.23) + i * 2.1);
    return `<path d="${jiskraD(r * (1.3 + 1.7 * k))}" transform="translate(${f(x)} ${f(y)})" fill="#E9EEFF" opacity="${f(0.25 + 0.6 * k)}"/>`;
  }).join("");
const vrstvaMlha = (st) => {
  let s = "";
  for (const [x0, y, rx, ry, v, op] of [[30, 141, 44, 5, 1.7, 0.5], [130, 147, 50, 6, -1.2, 0.45], [80, 132, 36, 4, 0.9, 0.3]]) {
    const x = (((st.t * v + x0) % 300) + 300) % 300 - 60;
    s += `<ellipse cx="${f(x)}" cy="${f(y + Math.sin(st.t * 0.3 + x0) * 1.2)}" rx="${rx}" ry="${ry}" fill="url(#${ID}-mlha)" opacity="${op}"/>`;
  }
  return s;
};

/* ——— Svítání: stejná skvrna, jiné barvy; slunce vychází za hřebenem ——— */
const vrstvaRanoNebe = () =>
  TUS_R.skvrna +
  `<g clip-path="url(#${OREZ})"><rect x="0" y="0" width="180" height="182" fill="url(#${ID}-rano)"/>` +
  [[52, 58, 34, 2.6, 5], [126, 44, 28, 2.2, 9], [96, 84, 40, 2.4, 13], [34, 100, 22, 1.8, 17]].map(([x, y, rx, ry, seed]) => `<path d="${hrouda(x, y, rx, ry, seed, { bodu: 14, kolisani: 0.24 })}" fill="#FFE9DD" opacity="0.6"/>`).join("") +
  `</g>`;
const vrstvaSlunce = (st) =>
  `<circle cx="${SLUNCE_X}" cy="${f(st.slunceY)}" r="46" fill="url(#${ID}-slunce-zar)"/>` +
  `<circle cx="${SLUNCE_X}" cy="${f(st.slunceY)}" r="12.5" fill="url(#${ID}-slunce)" stroke="#E9A93C" stroke-width="0.5"/>` +
  `<path d="M${SLUNCE_X - 8} ${f(st.slunceY - 5)} A10 10 0 0 1 ${SLUNCE_X - 1} ${f(st.slunceY - 9.6)}" stroke="#FFFBEA" stroke-width="1.2" stroke-linecap="round" fill="none" opacity="0.8"/>`;
const vrstvaRanoHory = () => krajina(RANO);

/* ——— Trhliny a zlato ——— */
const vrstvaTrhliny = (st) => {
  let s = "";
  for (const tr of st.trhliny) {
    if (tr.faze === "hotova") continue;
    const g = (st.t - tr.t0) * RUST;
    const a = Math.max(tr.s - 0.6, tr.uder - g, 0), b = Math.min(tr.delka, tr.uder + g);
    const nejdal = Math.max(tr.uder, tr.delka - tr.uder) || 1;
    if (b - a > 0.3) {
      const B = usek(tr.hlavni, tr.D, a, b);
      const DB = delky(B);
      s += sterbina(B, (q) => lerp(1.7, 0.45, clamp(Math.abs(a + q * DB[DB.length - 1] - tr.uder) / nejdal)));
    }
    for (const v of tr.vetve) {
      const gb = clamp(g - Math.abs(v.od - tr.uder), 0, v.delka);
      if (gb - v.z > 0.3) s += sterbina(usek(v.body, v.D, Math.max(0, v.z - 0.4), gb), (q) => lerp(1.05, 0.34, q));
    }
    /* odštípnuté šupinky kolem úderu */
    if (tr.s < tr.uder && g > 2) {
      const [x, y] = tr.hlavni[tr.uderI];
      s += `<path d="M${f(x - 1.9)} ${f(y - 0.5)} l1.5 -1.7 l1.1 1.3 Z M${f(x + 0.9)} ${f(y + 0.7)} l1.9 0.5 l-0.8 1.5 Z" fill="${PAPIR}" stroke="#03040A" stroke-width="0.3"/>`;
    }
  }
  return s;
};
const vseZlato = (st) => st.trhliny.filter((tr) => tr.faze === "hotova").map((tr) => tr.d).join(" ");
const vsechnyStredy = (st) => st.trhliny.filter((tr) => tr.faze === "hotova").map((tr) => tr.stred).join(" ");
/* spáry svítí do tmy: široká rozmazaná záře a užší, jasnější těsně kolem */
const vrstvaZar = (st) => {
  const d = vsechnyStredy(st);
  return d ? `<g filter="url(#${ID}-zar)" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="${d}" stroke="${ZLUTA.zaklad}" stroke-width="7.5" opacity="0.5"/><path d="${d}" stroke="${ZLUTA.svetla}" stroke-width="3.2" opacity="0.7"/></g>` : "";
};
const vrstvaZlato = (st) => {
  const d = vseZlato(st);
  return d ? svitici(d) : "";
};
const rozdelane = (st) => {
  let d = "", mokre = "";
  for (const tr of st.trhliny) {
    if (tr.faze !== "prace") continue;
    d += sparaTvar(tr.V, 0, tr.s) + " ";
    for (const v of tr.vetve)
      if (v.z > 0.3) d += sparaTvar(v.V, 0, v.z) + " ";
    if (tr.s > 0.2 && tr.s < tr.delka) {
      const [x, y] = bodNaCare(tr.hlavni, tr.D, tr.s);
      mokre += `<circle cx="${f(x)}" cy="${f(y)}" r="3.6" fill="url(#${ID}-svit)"/><circle cx="${f(x)}" cy="${f(y)}" r="1.25" fill="${ZLUTA.jadro}"/>`;
    }
  }
  return { d, mokre };
};
const vrstvaZlatoZive = (st) => {
  const { d, mokre } = rozdelane(st);
  return d.trim() ? svitici(d) + mokre : "";
};
const vrstvaLesk = (st) => {
  const d = vseZlato(st) + " " + rozdelane(st).d;
  if (!d.trim()) return "";
  return (
    `<defs><radialGradient id="${ID}-lg" gradientUnits="userSpaceOnUse" cx="${f(st.lesk[0])}" cy="${f(st.lesk[1])}" r="26"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.9"/><stop offset="0.5" stop-color="${ZLUTA.jadro}" stop-opacity="0.4"/><stop offset="1" stop-color="${ZLUTA.jadro}" stop-opacity="0"/></radialGradient></defs>` +
    `<path d="${d}" fill="url(#${ID}-lg)"/>`
  );
};
/* než se rozední, spáry vzplanou */
const vrstvaVzplanuti = (st) => {
  if (st.zaplane < 0.01) return "";
  const d = vsechnyStredy(st);
  return d ? `<path d="${d}" stroke="${ZLUTA.jadro}" stroke-width="${f(1 + 2.2 * st.zaplane)}" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="${f(0.85 * st.zaplane)}"/>` : "";
};
/* zlatý prach, který po hotové spáře vystoupá a zůstane viset jako hvězda */
const vrstvaPrach = (st) =>
  st.prach
    .map((p, i) => {
      const k = 0.5 + 0.5 * Math.sin(st.t * (1.6 + (i % 5) * 0.3) + p.fz);
      const zrod = smooth(p.vek / 0.4);
      return `<path d="${jiskraD(p.r * (0.75 + 0.5 * k) * zrod)}" transform="translate(${f(p.x)} ${f(p.y)}) rotate(${f(p.fz * 20)})" fill="${k > 0.6 ? ZLUTA.jadro : ZLUTA.svetla}" opacity="${f(0.55 + 0.45 * k)}"/>`;
    })
    .join("");

/* ——— Nářadí dole na papíře: miska se zlatem, lak, špachtle, střepy, co čekají ——— */
const vrstvaVpredu = () => {
  const [mx, my] = MISKA;
  let s = `<g transform="translate(${mx} ${PATA}) scale(${VETSI}) translate(${-mx} ${-PATA})"><ellipse cx="${mx + 6}" cy="178.3" rx="29" ry="1.9" fill="#221A22" opacity="0.32"/>`;
  /* lakovaný tácek s rumělkovou hranou */
  s += `<path d="M${mx - 22} 172.6 H${mx + 34} L${mx + 31} 177.4 H${mx - 19} Z" fill="#2A211E" stroke="#16100E" stroke-width="0.6" stroke-linejoin="round"/>`;
  s += `<path d="M${mx - 22} 172.6 H${mx + 34}" stroke="#C4432B" stroke-width="1.3" stroke-linecap="round"/>`;
  /* miska se zlatým práškem */
  s += `<path d="M${mx - 9.4} ${my} Q${mx - 8.6} 172 ${mx - 3.6} 172.4 H${mx + 3.6} Q${mx + 8.6} 172 ${mx + 9.4} ${my} Z" fill="url(#${ID}-glazura)" stroke="#5E4F44" stroke-width="0.8" stroke-linejoin="round"/>`;
  s += `<ellipse cx="${mx}" cy="${my}" rx="9.4" ry="2.1" fill="#FBF8F2" stroke="#5E4F44" stroke-width="0.8"/>`;
  s += `<ellipse cx="${mx}" cy="${f(my + 0.2)}" rx="7.9" ry="1.55" fill="${ZLUTA.zaklad}"/>`;
  /* barva v misce svítí taky */
  s += `<ellipse cx="${mx}" cy="${f(my - 1)}" rx="13" ry="6" fill="url(#${ID}-svit)" opacity="0.7"/>`;
  s += `<path d="M${mx - 8} ${f(my + 3)} Q${mx - 6.6} 170.6 ${mx - 3} 171.2" stroke="#FFFFFF" stroke-width="1" stroke-linecap="round" fill="none" opacity="0.8"/>`;
  /* kelímek s lakem uruši */
  const kx = mx + 19;
  s += `<path d="M${kx - 4.4} 163.4 L${kx - 3.6} 171.8 Q${kx - 3.4} 172.4 ${kx - 2.6} 172.4 H${kx + 2.6} Q${kx + 3.4} 172.4 ${kx + 3.6} 171.8 L${kx + 4.4} 163.4 Z" fill="#6A2418" stroke="#2A0E0A" stroke-width="0.7" stroke-linejoin="round"/>`;
  s += `<ellipse cx="${kx}" cy="163.4" rx="4.4" ry="1.15" fill="#1E0A08" stroke="#2A0E0A" stroke-width="0.6"/>`;
  s += `<path d="M${kx - 2.8} 165.6 V170.6" stroke="#C4735E" stroke-width="0.8" stroke-linecap="round" opacity="0.8"/>`;
  /* bambusová špachtle opřená o tácek */
  s += `<path d="M${mx - 14} 172.2 L${mx - 20} 158.6" stroke="#4E4226" stroke-width="2" stroke-linecap="round"/><path d="M${mx - 14} 172.2 L${mx - 20} 158.6" stroke="#C9B27A" stroke-width="1.2" stroke-linecap="round"/>`;
  s += `</g>`;
  /* střepy, na které ještě přijde řada */
  for (const [i, x, y, r, m] of [[2, 40, 163, -18, 0.98], [1, 55, 171.4, 14, 0.9], [0, 27, 154.6, 32, 0.86]])
    s += `<ellipse cx="${x + 1}" cy="${y + 6.4 * m}" rx="${f(9 * m)}" ry="1.2" fill="#221A22" opacity="0.25"/><g transform="translate(${x} ${y}) rotate(${r}) scale(${m})">${kusSvg(ID, KUSY[i], { obrys: "#3A322C" })}</g>`;
  return s;
};

/* ——— Střípek ——— */
const vrstvaTvar = (st) => vPostave(strTvar({ dx: st.pohled[0], dy: st.pohled[1], mrk: st.mrk, vyraz: st.vyraz, tvare: 0.55 }));
/* volná ručka a chodidla; ta se štětcem je ve vrstvě se štětcem */
const vrstvaKoncetiny = (st) => vPostave(strRuka(ID, st.s.strana > 0 ? RUCE.leva : RUCE.prava) + strNohy(ID));
const vrstvaStetec = (st) => {
  const { H, T, zasoba } = st.s;
  return (
    (zasoba > 0.05 ? `<circle cx="${f(T[0])}" cy="${f(T[1])}" r="${f(5 + 4 * zasoba)}" fill="url(#${ID}-svit)" opacity="${f(0.5 + 0.4 * zasoba)}"/>` : "") +
    stetecSvg(H, T, { zlato: zasoba, tl: 1.3, barva: ZLUTA.zaklad, okraj: ZLUTA.okraj, jadro: ZLUTA.jadro }) +
    `<g transform="translate(${pt(H)}) scale(${K})">${strRuka(ID, [0, 0], { uhel: st.s.strana * 20 })}</g>`
  );
};
const vrstvaJiskry = (st) =>
  st.jiskry
    .map((j) => {
      const q = j.vek / j.zivot;
      return `<path d="${jiskraD(j.r * (1 - q * 0.45))}" transform="translate(${f(j.x)} ${f(j.y)}) rotate(${f(j.rot + q * 80)})" fill="${j.bila ? PAPIR : q < 0.3 ? ZLUTA.jadro : ZLUTA.svetla}" opacity="${f(clamp(Math.min(q / 0.08, (1 - q) / 0.5)))}"/>`;
    })
    .join("");

const defs = () =>
  TUS.defs + TUS_R.defs +
  /* v noci je glazura studenější */
  strDefs(ID, { glazura: ["#FFFFFF", "#F1EFEE", "#D3CDD2"], hrana: ["#DDD3CD", "#B3A6A8"] }) +
  `<linearGradient id="${ID}-nebe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1A1D4A" stop-opacity="0"/><stop offset="0.55" stop-color="#232863" stop-opacity="0.45"/><stop offset="0.8" stop-color="#35357A" stop-opacity="0.8"/></linearGradient>` +
  `<linearGradient id="${ID}-mlha-hor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5A60A8" stop-opacity="0"/><stop offset="0.7" stop-color="#5A60A8" stop-opacity="0.34"/><stop offset="1" stop-color="#5A60A8" stop-opacity="0"/></linearGradient>` +
  `<linearGradient id="${ID}-mlha-rano" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE9DD" stop-opacity="0"/><stop offset="0.7" stop-color="#FFE9DD" stop-opacity="0.6"/><stop offset="1" stop-color="#FFE9DD" stop-opacity="0"/></linearGradient>` +
  `<radialGradient id="${ID}-mlha"><stop offset="0" stop-color="#8A92D2" stop-opacity="0.32"/><stop offset="1" stop-color="#8A92D2" stop-opacity="0"/></radialGradient>` +
  `<linearGradient id="${ID}-rano" x1="0" y1="0" x2="0" y2="1"><stop offset="0.04" stop-color="#7C77B4"/><stop offset="0.36" stop-color="#C48FAE"/><stop offset="0.58" stop-color="#F2B9AC"/><stop offset="0.74" stop-color="#FFE3BE"/></linearGradient>` +
  `<radialGradient id="${ID}-slunce" cx="0.4" cy="0.36" r="0.75"><stop offset="0" stop-color="#FFFBEA"/><stop offset="0.5" stop-color="#FBD77A"/><stop offset="1" stop-color="#EDAE44"/></radialGradient>` +
  `<radialGradient id="${ID}-slunce-zar"><stop offset="0" stop-color="#FFF4D0" stop-opacity="0.85"/><stop offset="0.4" stop-color="#FFE3B0" stop-opacity="0.34"/><stop offset="1" stop-color="#FFE3B0" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="${ID}-svit"><stop offset="0" stop-color="${ZLUTA.svetla}" stop-opacity="0.85"/><stop offset="0.45" stop-color="${ZLUTA.zaklad}" stop-opacity="0.3"/><stop offset="1" stop-color="${ZLUTA.zaklad}" stop-opacity="0"/></radialGradient>` +
  `<filter id="${ID}-zar" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="2.6"/></filter>`;

/* ——— Simulace ——— */
const ceka = (dyn) => dyn.trhliny.filter((tr) => tr.faze !== "hotova").length;
const hotovych = (dyn) => dyn.trhliny.filter((tr) => tr.faze === "hotova").length;
const jiskra = (dyn, x, y, vx, vy, volby = {}) => {
  const R = dyn.nahoda;
  dyn.jiskry.push({ x, y, vx, vy, vek: 0, zivot: (volby.zivot || 1) * (0.7 + R() * 0.6), r: (volby.r || 1) * (0.6 + R() * 0.8), rot: R() * 90, tiha: volby.tiha ?? 18, bila: !!volby.bila });
};
const praskni = (dyn, kde, t, klik) => {
  const R = dyn.nahoda;
  dyn.trhliny.push(novaTrhlina(R, kde, t));
  const pan = clamp((kde[0] - 90) / 80, -1, 1);
  dyn.zvuk.push({ druh: "krup", sila: klik ? 1 : 0.7, pan });
  /* odštípnuté šupinky papíru */
  for (let i = 0; i < 7; i++) jiskra(dyn, kde[0], kde[1], (R() - 0.5) * 50, -8 - R() * 26, { zivot: 0.7, r: 0.8, bila: true, tiha: 60 });
  if (klik) {
    dyn.lek = t;
    dyn.zvuk.push({ druh: "pisk", sila: 0.5, pan: clamp((dyn.s.x - 90) / 80, -1, 1), za: 0.06 });
  }
};
/** Kde praskne sama: co nejdál od toho, co už prasklé je, a od Střípka. */
const volneMisto = (dyn) => {
  const R = dyn.nahoda;
  let nej = [90, 84], dNej = -1;
  for (let i = 0; i < 7; i++) {
    const a = R() * Math.PI * 2, q = Math.sqrt(R());
    const p = [90 + Math.cos(a) * q * 56, 82 + Math.sin(a) * q * 44];
    let d = Math.hypot(p[0] - dyn.s.x, p[1] - dyn.s.y) * 0.7;
    for (const tr of dyn.trhliny) d = Math.min(d, Math.hypot(p[0] - tr.hlavni[tr.uderI][0], p[1] - tr.hlavni[tr.uderI][1]));
    if (d > dNej) [nej, dNej] = [p, d];
  }
  return nej;
};
const novaDynamika = () => {
  const R = rng(2305);
  const dyn = {
    trhliny: [], verze: 1,
    s: { x: 82, y: 62, vx: 0, vy: 0, strana: 1, uhel: rad(72), H: [82 + RUKA[0], 62 + RUKA[1]], T: [0, 0], naMiste: false, zasek: 0, prehozeno: false, faze: "volno", prace: null, cas: 0, namoceno: false, zasoba: 0.86 },
    rano: null, fronta: [], dalsi: 0.15, lek: -100, jiskry: [], prach: [], nahoda: R, zvuk: [], pohled: [0, 0], lesk: [60, 50], maluje: 0,
  };
  dyn.s.T = [dyn.s.H[0] + Math.cos(dyn.s.uhel) * LB, dyn.s.H[1] + Math.sin(dyn.s.uhel) * LB];
  /* čtyři spáry už jsou zlaté, ať noc nezačíná prázdná */
  for (const kde of [[47, 54], [133, 50], [126, 104], [52, 106]]) {
    const tr = novaTrhlina(R, kde, -100);
    dokonci(tr);
    for (const v of tr.vetve) v.z = v.delka;
    dyn.trhliny.push(tr);
    for (let i = 0; i < 3; i++) dyn.prach.push({ x: kde[0] + (R() - 0.5) * 44, y: kde[1] + (R() - 0.5) * 36, cx: 0, cy: 0, vek: 9, r: 0.8 + R() * 0.8, fz: R() * 6.28, usazen: true });
  }
  return dyn;
};
const krok = (dyn, t, dt, vstup) => {
  const R = dyn.nahoda, s = dyn.s;
  let v = dyn.rano == null ? -1 : t - dyn.rano;
  /* kliknutí: noc praskne; za svítání si to schová na potom a setmí se dřív */
  if (vstup.kliky && vstup.kliky.length) {
    const k = vstup.kliky[vstup.kliky.length - 1];
    vstup.kliky.length = 0;
    const kde = doOblasti([k.x, k.y]);
    if (v >= 0) {
      if (dyn.fronta.length < 3) dyn.fronta.push(kde);
      if (v > R_PLNE && v < R_NOC) {
        dyn.rano = t - R_NOC + 0.01;
        v = t - dyn.rano;
      }
    } else if (ceka(dyn) < CEKA_NEJVIC && dyn.trhliny.length < NEJVIC + 4) praskni(dyn, kde, t, true);
    else {
      dyn.zvuk.push({ druh: "tuk", sila: 0.6, pan: clamp((kde[0] - 90) / 80, -1, 1) });
      for (let i = 0; i < 4; i++) jiskra(dyn, kde[0], kde[1], (R() - 0.5) * 30, -6 - R() * 14, { zivot: 0.5, r: 0.7, bila: true });
    }
  }
  /* sama od mrazu */
  if (v < 0 && t > dyn.dalsi) {
    if (ceka(dyn) < 2 && dyn.trhliny.length < NEJVIC) praskni(dyn, volneMisto(dyn), t, false);
    dyn.dalsi = t + 2.3 + R() * 2.1;
  }
  /* všechno zalité: svítání */
  if (v < 0 && s.faze === "volno" && ceka(dyn) === 0 && hotovych(dyn) >= NEJVIC) {
    dyn.rano = t;
    v = 0;
    s.faze = "rano";
    dyn.zvuk.push({ druh: "zare", sila: 1, pan: 0 });
    dyn.zvuk.push({ druh: "svitani", sila: 1, pan: 0, za: R_ZAP });
    dyn.zvuk.push({ druh: "rin", sila: 0.7, pan: 0, za: R_PLNE });
    dyn.zvuk.push({ druh: "smich", sila: 0.6, pan: 0, za: 0.5 });
    for (const tr of dyn.trhliny) for (const [x, y] of tr.hlavni) if (R() < 0.5) jiskra(dyn, x, y, (R() - 0.5) * 24, -6 - R() * 16, { zivot: 1.3, tiha: 6 });
  }
  if (v >= 0) {
    if (pres(v - dt, v, R_NOC)) {
      dyn.trhliny = [];
      dyn.prach = [];
      dyn.verze++;
    }
    if (v >= R_KONEC) {
      dyn.rano = null;
      v = -1;
      s.faze = "volno";
      dyn.dalsi = t + 1.4;
      dyn.fronta.splice(0).forEach((kde, i) => praskni(dyn, kde, t + i * 0.22, i === 0));
    }
  }

  /* ——— Střípek: co dělá a kam míří štětcem ——— */
  if (s.faze === "volno") {
    const prace = dyn.trhliny.find((tr) => tr.faze === "ceka" && t - tr.t0 > 0.4);
    if (prace && s.zasoba < 0.3) {
      s.faze = "namaci";
      s.namoceno = false;
    } else if (prace) {
      const A = prace.hlavni[0], B = prace.hlavni[prace.hlavni.length - 1];
      if (Math.hypot(B[0] - s.x, B[1] - s.y) < Math.hypot(A[0] - s.x, A[1] - s.y)) otoc(prace);
      prace.faze = "prace";
      s.prace = prace;
      s.faze = "leti";
    }
  }
  let cil = null;
  if (s.faze === "leti") cil = s.prace.hlavni[0];
  else if (s.faze === "maluje") cil = bodNaCare(s.prace.hlavni, s.prace.D, s.prace.s);
  else if (s.faze === "namaci") cil = NAMOC;
  let F, cilUhel = rad(72);
  if (cil) {
    /* kde je trhlina, tam nese štětec: vpravo pravou, vlevo levou; nahoru ho zvedne, dolů sklopí */
    if (s.faze !== "maluje") s.strana = cil[0] > 104 ? 1 : cil[0] < 76 ? -1 : s.strana;
    if (s.faze === "namaci") s.strana = 1;
    cilUhel = rad(lerp(-34, 64, smooth((cil[1] - 36) / 42)));
  } else if (s.faze === "radost" || s.faze === "rano") cilUhel = rad(-62);
  s.uhel = kCili(s.uhel, cilUhel, dt, 0.16);
  const u = [Math.cos(s.uhel) * s.strana, Math.sin(s.uhel)];
  let Hc = null;
  if (cil) {
    Hc = [cil[0] - u[0] * LB, cil[1] - u[1] * LB];
    F = [Hc[0] - s.strana * RUKA[0], Hc[1] - RUKA[1]];
  } else if (s.faze === "rano") F = [90, 60];
  else if (s.faze === "radost") F = [s.x, s.y];
  else if (vstup.mys) F = [vstup.mys.x - s.strana * 26, vstup.mys.y - 20];
  else F = [90 + 34 * Math.sin(t * 0.31), 60 + 12 * Math.sin(t * 0.62 + 0.6)];
  F = [clamp(F[0], 40, 140), clamp(F[1], 30, 146)];
  s.vx += (26 * (F[0] - s.x) - 9 * s.vx) * dt;
  s.vy += (26 * (F[1] - s.y) - 9 * s.vy) * dt;
  s.x += s.vx * dt;
  s.y += s.vy * dt;
  /* dlaň: z klidu se natáhne, kam až dosáhne */
  const H0 = [s.x + s.strana * RUKA[0], s.y + RUKA[1]];
  let Hk = H0;
  if (Hc) {
    const o = [Hc[0] - H0[0], Hc[1] - H0[1]];
    const d = Math.hypot(o[0], o[1]) || 1;
    const q = Math.min(1, DOSAH / d);
    Hk = [H0[0] + o[0] * q, H0[1] + o[1] * q];
  } else if (s.faze === "radost" || s.faze === "rano") Hk = [H0[0] + s.strana * 2, H0[1] - 9];
  s.H = [kCili(s.H[0], Hk[0], dt, 0.05), kCili(s.H[1], Hk[1], dt, 0.05)];
  s.T = [s.H[0] + u[0] * LB, s.H[1] + u[1] * LB];
  s.naMiste = !!cil && Math.hypot(s.T[0] - cil[0], s.T[1] - cil[1]) < 2.2;
  /* nedosáhne (trhlina mu utekla na druhou stranu)? Vezme štětec do druhé ruky, a kdyby ani tak, prostě se natáhne */
  s.zasek = cil && !s.naMiste ? s.zasek + dt : 0;
  if (s.zasek > 1.1 && !s.prehozeno) {
    s.strana = -s.strana;
    s.prehozeno = true;
  }
  if (s.zasek > 2.6) s.naMiste = true;
  if (!s.zasek) s.prehozeno = false;

  dyn.maluje = 0;
  if (s.faze === "leti" && s.naMiste) s.faze = "maluje";
  else if (s.faze === "maluje") {
    const tr = s.prace;
    if (s.naMiste && t - dyn.lek > 0.4) {
      tr.s = Math.min(tr.delka, tr.s + RYCHLOST * dt);
      s.zasoba = Math.max(0.04, s.zasoba - (RYCHLOST * dt) / NABRANO);
      dyn.maluje = 1;
      if (R() < dt * 5) jiskra(dyn, s.T[0], s.T[1], (R() - 0.5) * 10, -2 - R() * 8, { zivot: 0.8, r: 0.7, tiha: 4 });
    }
    if (tr.s >= tr.delka) {
      s.faze = "radost";
      s.cas = t;
      s.prace = null;
      const pan = clamp((s.T[0] - 90) / 80, -1, 1);
      dyn.zvuk.push({ druh: "cink", vys: hotovych(dyn), sila: 0.9, pan });
      for (let i = 0; i < 9; i++) jiskra(dyn, s.T[0], s.T[1], (R() - 0.5) * 36, -8 - R() * 22, { zivot: 1, tiha: 16 });
    }
  } else if (s.faze === "radost" && t - s.cas > 0.75) s.faze = "volno";
  else if (s.faze === "namaci") {
    if (s.naMiste && !s.namoceno) {
      s.namoceno = true;
      s.cas = t;
      dyn.zvuk.push({ druh: "plop", sila: 0.8, pan: 0.25 });
      for (let i = 0; i < 6; i++) jiskra(dyn, NAMOC[0], NAMOC[1], (R() - 0.5) * 22, -10 - R() * 16, { zivot: 0.7, tiha: 40 });
    }
    if (s.namoceno) {
      s.zasoba = kCili(s.zasoba, 1, dt, 0.12);
      if (t - s.cas > 0.5) s.faze = "volno";
    }
  }
  /* odbočky doteče lak sám; když je zalitá celá, je z ní kov a vystoupá z ní prach */
  for (const tr of dyn.trhliny) {
    if (tr.faze !== "prace") continue;
    let vse = tr.s >= tr.delka;
    for (const vt of tr.vetve) {
      if (vt.tz == null && tr.s >= vt.od) vt.tz = t;
      if (vt.tz != null) vt.z = Math.min(vt.delka, (t - vt.tz) * 30);
      if (vt.z < vt.delka) vse = false;
    }
    if (vse) {
      dokonci(tr);
      dyn.verze++;
      dyn.zvuk.push({ druh: "sypani", sila: 0.5, pan: clamp((tr.hlavni[tr.uderI][0] - 90) / 80, -1, 1) });
      for (let i = 0; i < 4; i++) {
        const z = bodNaCare(tr.hlavni, tr.D, R() * tr.delka);
        const kam = [clamp(z[0] + (R() - 0.5) * 40, 22, 158), clamp(z[1] - 6 - R() * 26, 20, 120)];
        dyn.prach.push({ x: z[0], y: z[1], cx: kam[0], cy: kam[1], vek: 0, r: 0.7 + R() * 0.9, fz: R() * 6.28, usazen: false });
      }
    }
  }
  for (const p of dyn.prach) {
    p.vek += dt;
    if (!p.usazen) {
      p.x = kCili(p.x, p.cx + Math.sin(p.vek * 3 + p.fz) * 1.5, dt, 0.7);
      p.y = kCili(p.y, p.cy, dt, 0.7);
      if (p.vek > 3.5) p.usazen = true;
    }
  }
  /* ze štětce občas ukápne */
  if (!dyn.maluje && s.zasoba > 0.25 && Math.hypot(s.vx, s.vy) > 12 && R() < dt * 3) jiskra(dyn, s.T[0], s.T[1], 0, 4, { zivot: 0.9, r: 0.7, tiha: 30 });
  /* za svítání se zlato sype z nebe */
  if (v > R_ZAP && v < R_NOC && R() < dt * 5) jiskra(dyn, 26 + R() * 128, 24 + R() * 60, (R() - 0.5) * 4, 4 + R() * 6, { zivot: 2.2, r: 0.9, tiha: 2 });
  for (const j of dyn.jiskry) {
    j.vek += dt;
    j.x += j.vx * dt;
    j.y += j.vy * dt;
    j.vx *= 1 - dt * 1.8;
    j.vy += j.tiha * dt;
  }
  dyn.jiskry = dyn.jiskry.filter((j) => j.vek < j.zivot);
  /* cvrčci drží noc */
  if (v < 0 && R() < dt * 0.4) dyn.zvuk.push({ druh: "cvrcek", sila: 0.5, pan: (R() - 0.5) * 1.6 });
  /* pohled: na špičku štětce, na novou trhlinu, jinak za kurzorem */
  const posl = dyn.trhliny[dyn.trhliny.length - 1];
  let kam = [s.x + s.vx, s.y + 12];
  if (posl && t - posl.t0 < 0.9 && t - posl.t0 >= 0) kam = posl.hlavni[posl.uderI];
  else if (cil) kam = s.T;
  else if (s.faze === "rano") kam = [SLUNCE_X, 110];
  else if (vstup.mys) kam = [vstup.mys.x, vstup.mys.y];
  const cp = [clamp((kam[0] - s.x) / 24, -1, 1) * 1.9, clamp((kam[1] - s.y) / 24, -1, 1) * 1.3];
  dyn.pohled = dyn.pohled.map((q, i) => kCili(q, cp[i], dt, 0.12));
  /* odlesk: u štětce, když maluje; jinak za kurzorem, nebo bloudí sám */
  const cl = dyn.maluje ? s.T : vstup.mys ? [vstup.mys.x, vstup.mys.y] : [90 + 52 * Math.cos(t * 0.5), 84 + 40 * Math.sin(t * 0.37)];
  dyn.lesk = dyn.lesk.map((q, i) => kCili(q, cl[i], dt, 0.12));
};
const stav = (t, vstup = {}, dyn) => {
  const d = dyn || novaDynamika();
  const s = d.s;
  const v = d.rano == null ? -1 : t - d.rano;
  let vyraz = "medituje";
  if (t - d.lek < 0.55) vyraz = "leknuti";
  else if (s.faze === "maluje") vyraz = "soustredeni";
  else if (s.faze === "radost") vyraz = "pysny";
  else if (s.faze === "leti" || s.faze === "namaci") vyraz = "kouka";
  else if (s.faze === "rano") vyraz = v < R_ZAP + 0.8 ? "smich" : v < R_NOC ? "medituje" : "kouka";
  else if (vstup.mys) vyraz = "kouka";
  const lek = t - d.lek < 0.4 ? Math.sin((Math.PI * (t - d.lek)) / 0.4) : 0;
  const hop = s.faze === "radost" ? Math.sin(Math.PI * clamp((t - s.cas) / 0.5)) : 0;
  const rano = v < 0 ? 0 : smooth((v - R_ZAP) / (R_PLNE - R_ZAP)) * (1 - smooth((v - R_NOC) / (R_KONEC - R_NOC)));
  return {
    t, s, trhliny: d.trhliny, verze: d.verze, jiskry: d.jiskry, prach: d.prach, lesk: d.lesk, pohled: d.pohled, vyraz, maluje: d.maluje,
    rano,
    /* spáry se za svítání rozpustí ve světle */
    zlatoOp: v < 0 || v >= R_NOC ? 1 : 1 - smooth((v - (R_ZAP + 0.6)) / 1.7),
    zaplane: v < 0 ? 0 : smooth(v / 0.3) * (1 - smooth((v - 0.9) / 1.1)),
    slunceY: lerp(160, 121, smooth((v - R_ZAP - 0.2) / 3.2)),
    roste: d.trhliny.some((tr) => tr.faze !== "hotova" && (tr.faze === "prace" || (t - tr.t0) * RUST < 70)),
    fig: { x: s.x - B0[0], y: s.y - B0[1] + 1.3 * Math.sin(t * 1.5) - 2.6 * lek - 2.4 * hop, r: clamp(s.vx * 0.22, -11, 11) + 1.2 * Math.sin(t * 0.9) },
    mrk: mrkani(t, [1.7, 4.9, 5.15, 8.3], 9.7),
  };
};
const snimek = (st) => Math.floor(st.t * 30);
const pohyb = (st) => ({ x: st.fig.x, y: st.fig.y, r: st.fig.r, ox: B0[0], oy: B0[1] });
const jenRano = (st) => f(st.rano);

export const lemNoc = {
  id: "noc",
  viewBox: "0 0 180 180",
  defs,
  novaDynamika,
  krok,
  stav,
  hukot: (st) => ({ vitr: 0.26 * (1 - st.rano), stetec: st.maluje, misa: 0.5 * st.rano }),
  klidne: { t: 2.6 },
  vrstvy: [
    { id: "tus", kresli: vrstvaTus, tezka: true },
    { id: "hvezdy", kresli: vrstvaHvezdy, klic: (st) => Math.floor(st.t * 8), orez: OREZ },
    { id: "mlha", kresli: vrstvaMlha, klic: (st) => Math.floor(st.t * 12), orez: OREZ },
    { id: "rano-nebe", kresli: vrstvaRanoNebe, tezka: true, pruhlednost: jenRano },
    /* slunce se ukáže, až když jsou hory před ním skoro celé, jinak by přes ně prosvítalo */
    { id: "slunce", kresli: vrstvaSlunce, klic: (st) => (st.rano > 0 ? Math.round(st.slunceY * 5) : -1), orez: OREZ, pruhlednost: (st) => f(smooth((st.rano - 0.6) / 0.4)) },
    { id: "rano-hory", kresli: vrstvaRanoHory, orez: OREZ, pruhlednost: jenRano },
    { id: "trhliny", kresli: vrstvaTrhliny, klic: (st) => (st.roste ? snimek(st) : `v${st.verze}`), orez: OREZ },
    { id: "zar-zlata", kresli: vrstvaZar, klic: (st) => st.verze, tezka: true, styl: "mix-blend-mode:screen", orez: OREZ, pruhlednost: (st) => f(st.zlatoOp) },
    { id: "zlato", kresli: vrstvaZlato, klic: (st) => st.verze, orez: OREZ, pruhlednost: (st) => f(st.zlatoOp) },
    { id: "zlato-zive", kresli: vrstvaZlatoZive, klic: (st) => (st.trhliny.some((tr) => tr.faze === "prace") ? snimek(st) : -1), orez: OREZ },
    { id: "lesk", kresli: vrstvaLesk, klic: (st) => `${Math.round(st.lesk[0] * 2)},${Math.round(st.lesk[1] * 2)},${st.verze},${st.maluje ? snimek(st) : 0}`, orez: OREZ, pruhlednost: (st) => f(st.zlatoOp) },
    { id: "vzplanuti", kresli: vrstvaVzplanuti, klic: (st) => (st.zaplane > 0.01 ? snimek(st) : -1), orez: OREZ },
    { id: "prach", kresli: vrstvaPrach, klic: (st) => (st.prach.length ? Math.floor(st.t * 12) : -1), pruhlednost: (st) => f(1 - st.rano) },
    { id: "vpredu", kresli: vrstvaVpredu },
    { id: "oblak-zadni", kresli: () => vPostave(oblakZadni(ID)), pohyb },
    { id: "telo", kresli: () => vPostave(strTelo(ID) + strZlato(ID)), tezka: true, pohyb },
    { id: "oblak-predni", kresli: () => vPostave(oblakPredni(ID)), tezka: true, pohyb },
    { id: "koncetiny", kresli: vrstvaKoncetiny, klic: (st) => st.s.strana, pohyb },
    /* noc na něm leží jako modrý stín, za svítání sleze */
    { id: "stin", kresli: () => vPostave(strSilueta("#9296D6")), styl: "mix-blend-mode:multiply", pohyb, pruhlednost: (st) => f(0.5 * (1 - st.rano)) },
    { id: "tvar", kresli: vrstvaTvar, klic: (st) => `${f(st.pohled[0])},${f(st.pohled[1])},${f(st.mrk)},${st.vyraz}`, pohyb },
    { id: "stetec", kresli: vrstvaStetec, klic: snimek },
    { id: "jiskry", kresli: vrstvaJiskry, klic: (st) => (st.jiskry.length ? snimek(st) : -1) },
  ],
};
