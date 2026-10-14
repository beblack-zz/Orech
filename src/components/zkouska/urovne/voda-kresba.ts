/**
 * Kresba úrovně 三 Voda — „Na střed“ (komnata U mistra, /zkouska).
 *
 * Hrnčířský kruh shora: vana, kovová hlava kruhu s drážkami a na ní hrouda,
 * která běží mimo osu, a proto obíhá kolem středu. Vlevo vlhkoměr ve tvaru
 * kapky a pod ním kbelík s houbou, vpravo terč, na kterém tečka kreslí,
 * jak moc hlína kmitá. Kapka sedí na okraji vany (postavičku vkládá
 * Voda.astro do obalu, který je tady v překryvech).
 *
 * Kresba má dvě vrstvy: pozadí, které se nehýbe (podlaha, vana, hlava kruhu,
 * kbelík — smí mít rozostřené stíny), a popředí, které hra překresluje
 * každý snímek (co se točí, hrouda, ruce, ukazatele). Popředí je bez
 * filtrů: měkké stíny dělají přechody, ať se nic drahého nepřepočítává
 * šedesátkrát za vteřinu.
 *
 * Čisté funkce bez DOM: scénu skládá Voda.astro, proměnlivé části (obrys
 * hroudy, hladinu ve vlhkoměru, polohu na terči) počítá stejnými funkcemi
 * i hra ve scripts/zkouska/urovne/voda.ts.
 *
 * Souřadnice: scéna 800 × 560, osa kruhu v STRED. Vyosení hroudy se kreslí
 * přehnaně (MM jednotek na milimetr), aby bylo kmitání vidět i na telefonu.
 * Všechna id mají předponu mv3-.
 */

export const SIRKA = 800;
export const VYSKA = 560;
/** Osa kruhu */
export const STRED = { x: 400, y: 288 };
/** Vnější okraj vany */
export const R_VANA = 248;
/** Hlava kruhu — z ní se počítá, jak blízko středu jsou ruce */
export const R_HLAVA = 176;
/** Hrouda, dokud se nesesouvá */
export const R_HROUDA = 78;
/** Jednotek scény na milimetr vyosení */
export const MM = 2;
/** Terč: tečka ukazuje vyosení (odmocninově, do `plny` mm), zlatý kruh uprostřed je cíl */
export const TERC = { x: 716, y: 116, r: 62, stupnice: 54, plny: 20 };
/** Vlhkoměr ve tvaru kapky: hladina jde ode dna (dno) nahoru o vyska */
export const VLHKOMER = { x: 84, y: 126, dno: 62, vyska: 136 };
export const KBELIK = { x: 92, y: 440, r: 64 };
/** Obal Kapky: levý horní roh a šířka v jednotkách scény (kresba postavičky je 180 × 180, geta končí na 159) */
export const KAPKA = { x: 546, y: 244, s: 152 };
/** Cílové pásmo vody a hranice, za kterými hlína drhne nebo plave */
export const PASMO: [number, number] = [0.3, 0.8];
export const SUCHO = 0.25;
export const MOKRO = 0.82;
/** Cílový poloměr vyosení (mm) — zlatý kruh na terči */
export const CIL_MM = 1.5;
/** Kde musí být ruce: do tohohle podílu poloměru hlavy kruhu centrují naplno */
export const ZONA = 0.22;

const f1 = (n: number) => (Math.round(n * 10) / 10).toString();
const st = (deg: number) => (deg * Math.PI) / 180;
/** Bod v polárních souřadnicích (stupně, 0° vpravo, kladně po směru hodinek) */
const pol = (a: number, r: number, cx = 0, cy = 0) => `${f1(cx + Math.cos(st(a)) * r)} ${f1(cy + Math.sin(st(a)) * r)}`;
const procenta = (n: number, z: number) => `${((n / z) * 100).toFixed(3)}%`;

/** Uzavřená hladká cesta přes body (Catmull-Rom převedený na Bézierovy křivky) */
export function uzavrenaCesta(body: [number, number][]) {
  const n = body.length;
  let d = `M${f1(body[0][0])} ${f1(body[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = body[(i - 1 + n) % n];
    const p1 = body[i];
    const p2 = body[(i + 1) % n];
    const p3 = body[(i + 2) % n];
    d += `C${f1(p1[0] + (p2[0] - p0[0]) / 6)} ${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)} ${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])} ${f1(p2[1])}`;
  }
  return d + "Z";
}

/** Otevřená hladká cesta přes body */
function otevrenaCesta(body: [number, number][]) {
  let d = `M${f1(body[0][0])} ${f1(body[0][1])}`;
  for (let i = 0; i < body.length - 1; i++) {
    const p0 = body[i - 1] ?? body[i];
    const p1 = body[i];
    const p2 = body[i + 1];
    const p3 = body[i + 2] ?? p2;
    d += `C${f1(p1[0] + (p2[0] - p0[0]) / 6)} ${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)} ${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])} ${f1(p2[1])}`;
  }
  return d;
}

/* ——— Proměnlivé části (počítá je i hra) ——— */

/**
 * Obrys hroudy shora, kolem jejího středu (0, 0). Mimo osu je hrouda
 * hrbolatá (hrbol 0–1), na středu kulatá; rozmočená se vlní (vlna 0–1,
 * při sesouvání i víc). Hrboly se točí s kruhem (uhel v radiánech),
 * světlo zůstává — proto se obrys počítá už pootočený a nekreslí se do
 * otáčené skupiny.
 */
export function obrysHroudy(R: number, hrbol: number, uhel: number, vlna = 0) {
  const N = 40;
  const body: [number, number][] = [];
  for (let i = 0; i < N; i++) {
    const f = (i / N) * Math.PI * 2;
    const g = f - uhel;
    const k =
      1 +
      hrbol * 0.085 * (0.62 * Math.sin(2 * g + 0.7) + 0.22 * Math.sin(3 * g + 2.1) + 0.12 * Math.sin(4 * g + 1.1) + 0.08 * Math.sin(6 * g + 0.4)) +
      vlna * 0.045 * (0.55 * Math.sin(3 * g + 0.4) + 0.3 * Math.sin(5 * g + 2.2) + 0.2 * Math.sin(7 * g + 1.3));
    body.push([Math.cos(f) * R * k, Math.sin(f) * R * k]);
  }
  return uzavrenaCesta(body);
}

/** Rýhy po prstech: spirála od středu hroudy k okraji */
export function spirala(R: number) {
  const body: [number, number][] = [];
  const otacek = 3;
  const n = 72;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = t * otacek * Math.PI * 2;
    const r = 8 + (R * 0.84 - 8) * t;
    body.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return otevrenaCesta(body);
}

/** Výška hladiny ve vlhkoměru (souřadnice kapky) */
export const yVlhkomeru = (w: number) => VLHKOMER.dno - Math.max(0, Math.min(1, w)) * VLHKOMER.vyska;

/** Vlhkoměr: voda pro w (0–1) s vlnkou ve fázi faze — v souřadnicích kapky */
export function hladinaVlhkomeru(w: number, faze: number) {
  const y = yVlhkomeru(w);
  let d = `M-50 ${f1(y)}`;
  for (let x = -50; x <= 50; x += 10) d += `L${x} ${f1(y + Math.sin(x / 9 + faze) * 2.2)}`;
  return d + `L50 ${VLHKOMER.dno + 10}L-50 ${VLHKOMER.dno + 10}Z`;
}

/** Terč: kolik jednotek od středu terče je vyosení r (mm) — odmocnina, ať jde vidět i poslední milimetr */
export const polomerNaTerci = (r: number) => TERC.stupnice * Math.sqrt(Math.max(0, Math.min(r, TERC.plny)) / TERC.plny);

/* ——— Ruce ——— */

/*
 * Levá ruka shora, kolem hroudy se středem (0, 0): dlaň ji obejme zleva,
 * prsty sahají přes vzdálenou stranu, palec leží nahoře na hroudě
 * a předloktí v rukávu vede dolů k hrnčíři, až za okraj scény. Pravá je
 * zrcadlo. Obrysy jsou zvlášť, aby šly přebarvit, když hlína drhne.
 */
const DLAN =
  `M${pol(128, 72)}` +
  `A72 72 0 0 1 ${pol(246, 72)}` +
  `C${pol(256, 70)} ${pol(268, 82)} ${pol(262, 97)}` +
  `C${pol(257, 104)} ${pol(248, 108)} ${pol(240, 106)}` +
  `C${pol(234, 112)} ${pol(226, 113)} ${pol(220, 110)}` +
  `C${pol(213, 116)} ${pol(205, 116)} ${pol(199, 113)}` +
  `C${pol(190, 119)} ${pol(176, 121)} ${pol(164, 121)}` +
  `C${pol(156, 122)} ${pol(150, 126)} ${pol(147, 132)}` +
  `C-128 104 -148 168 -170 236L-112 244` +
  `C-100 196 -70 112 ${pol(128, 72)}Z`;
const PALEC = `M${pol(146, 80)}C-74 34 -52 14 -34 4C-26 0 -18 2 -18 10C-18 18 -30 26 -42 34C-52 41 -60 52 ${pol(132, 82)}Z`;
const PRSTY = [
  `M${pol(244, 79)}A79 79 0 0 0 ${pol(206, 79)}`,
  `M${pol(250, 87)}A87 87 0 0 0 ${pol(208, 87)}`,
  `M${pol(254, 96)}A96 96 0 0 0 ${pol(214, 96)}`,
];
const SLIKR_NA_RUCE = `M${pol(132, 70)}A70 70 0 0 1 ${pol(250, 70)}L${pol(250, 83)}A83 83 0 0 0 ${pol(132, 83)}Z`;
const RUKAV = `M-182 214C-160 204 -122 210 -100 222L-150 600L-300 600Z`;
const MANZETA = `M-184 214C-160 204 -122 210 -98 222`;

function ruka(strana: "l" | "p") {
  const zrcadlo = strana === "p" ? ` transform="scale(-1 1)"` : "";
  return `<g class="mu-voda-ruka mu-voda-ruka-${strana}"${zrcadlo}>
    <path d="${DLAN}" fill="url(#mv3-kuze)" stroke="#A8765A" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M${pol(150, 116)}C-136 120 -152 170 -164 214" stroke="#C99270" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.5"/>
    <path class="mu-voda-slikr-ruka" d="${SLIKR_NA_RUCE}" fill="#8A6650" opacity="0.4"/>
    <g stroke="#B8845F" stroke-width="1.3" fill="none" stroke-linecap="round" opacity="0.75">${PRSTY.map((d) => `<path d="${d}"/>`).join("")}</g>
    <path d="M${pol(200, 112)}C${pol(190, 114)} ${pol(176, 116)} ${pol(166, 116)}" stroke="#FFF2E2" stroke-width="2.2" fill="none" stroke-linecap="round" opacity="0.6"/>
    <path class="mu-voda-drhne-ruka" d="${DLAN}" fill="#C4432B" opacity="0"/>
    <path d="${RUKAV}" fill="url(#mv3-rukav)"/>
    <path d="${MANZETA}" stroke="#6A7CA8" stroke-width="7" fill="none" stroke-linecap="round"/>
    <path d="${MANZETA}" transform="translate(0 7)" stroke="#26304C" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.6"/>
    <path d="${PALEC}" fill="url(#mv3-kuze)" stroke="#A8765A" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M-30 4C-25 2 -21 4 -21 9" stroke="#FBE8D8" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.9"/>
    <path class="mu-voda-drhne-ruka" d="${PALEC}" fill="#C4432B" opacity="0"/>
  </g>`;
}

/** Stín rukou bez filtru: posunutý obrys s měkkým lemem z tahu */
function stinRukou() {
  const tvar = (strana: "l" | "p") =>
    `<g${strana === "p" ? ` transform="scale(-1 1)"` : ""}><path d="${DLAN}"/><path d="${PALEC}"/><path d="${RUKAV}"/></g>`;
  return `<g class="mu-voda-ruce-stin" transform="translate(9 13)" fill="#1E1611" fill-opacity="0.2" stroke="#1E1611" stroke-opacity="0.08" stroke-width="12" stroke-linejoin="round">${tvar("l")}${tvar("p")}</g>`;
}

/** Obě ruce kolem bodu (0, 0); hra je posouvá za ukazatelem */
export const ruce = () => `${stinRukou()}<g class="mu-voda-ruce-tvar">${ruka("l")}${ruka("p")}</g>`;

/** Žlutá houbička — v kbelíku a ta, co se ždímá nad hroudou */
function houba() {
  return `<rect x="-29" y="-17" width="58" height="34" rx="12" fill="#E3B948"/>
      <rect x="-29" y="-17" width="58" height="26" rx="11" fill="#F3D27A"/>
      <g fill="#C99A2E" opacity="0.7"><ellipse cx="-16" cy="-6" rx="3.2" ry="2.4"/><ellipse cx="-3" cy="2" rx="2.4" ry="1.8"/><ellipse cx="12" cy="-8" rx="2.8" ry="2.2"/><ellipse cx="18" cy="6" rx="2" ry="1.6"/><ellipse cx="-20" cy="7" rx="2" ry="1.5"/><ellipse cx="4" cy="-11" rx="1.8" ry="1.4"/></g>
      <path d="M-22 -12H14" stroke="#FFF4C8" stroke-width="2.4" stroke-linecap="round" opacity="0.8"/>`;
}

/* ——— Pozadí: co se nehýbe ——— */

function podlaha() {
  const prkna = [
    { y: 0, h: 74, c: "#D9C2A0", spoje: [180, 610] },
    { y: 74, h: 70, c: "#D2B993", spoje: [380] },
    { y: 144, h: 72, c: "#DCC6A4", spoje: [90, 520] },
    { y: 216, h: 70, c: "#D4BC98", spoje: [300, 720] },
    { y: 286, h: 72, c: "#D9C29F", spoje: [140, 560] },
    { y: 358, h: 70, c: "#CFB690", spoje: [420] },
    { y: 428, h: 72, c: "#DAC4A2", spoje: [60, 650] },
    { y: 500, h: 60, c: "#D3BA95", spoje: [260] },
  ];
  let s = "";
  for (const p of prkna) {
    s += `<rect x="0" y="${p.y}" width="800" height="${p.h}" fill="${p.c}"/>`;
    const y1 = p.y + p.h * 0.36;
    const y2 = p.y + p.h * 0.7;
    s += `<path d="M0 ${f1(y1)}C200 ${f1(y1 - 5)} 420 ${f1(y1 + 6)} 800 ${f1(y1 - 2)}M0 ${f1(y2)}C260 ${f1(y2 + 4)} 520 ${f1(y2 - 5)} 800 ${f1(y2 + 3)}" stroke="#B89A72" stroke-width="1.2" fill="none" opacity="0.35"/>`;
    for (const x of p.spoje) s += `<path d="M${x} ${p.y + 2}V${p.y + p.h - 2}" stroke="#A8865F" stroke-width="2" opacity="0.55"/>`;
    s += `<path d="M0 ${p.y + p.h - 1}H800" stroke="#9E7E58" stroke-width="2.4" opacity="0.6"/>`;
    s += `<path d="M0 ${p.y + p.h + 1.4}H800" stroke="#F4E6CC" stroke-width="1.2" opacity="0.5"/>`;
  }
  /* Dva suky a pár kapek šlikru, co spadly vedle */
  s += `<g fill="none" stroke="#A8865F" opacity="0.5"><ellipse cx="236" cy="516" rx="12" ry="5" stroke-width="1.6"/><ellipse cx="236" cy="516" rx="5" ry="2" stroke-width="1.2"/><ellipse cx="760" cy="300" rx="10" ry="4.5" stroke-width="1.5"/></g>`;
  s += `<g fill="#9C7A60" opacity="0.45"><circle cx="168" cy="548" r="4"/><circle cx="182" cy="540" r="2.2"/><circle cx="640" cy="44" r="3.4"/><circle cx="628" cy="30" r="2"/><ellipse cx="190" cy="40" rx="6" ry="3" transform="rotate(-20 190 40)"/></g>`;
  /* Světlo z okna vlevo nahoře a stín v rozích */
  s += `<rect width="800" height="560" fill="url(#mv3-svetlo)"/>`;
  return s;
}

function vana() {
  const { x, y } = STRED;
  const R = R_VANA;
  const kapicka = (a: number, r: number, v: number) => {
    const [kx, ky] = pol(a, r, x, y).split(" ").map(Number);
    return `<circle cx="${kx}" cy="${ky}" r="${v}" fill="#E8F2F6" opacity="0.8"/><circle cx="${f1(kx - v * 0.35)}" cy="${f1(ky - v * 0.35)}" r="${f1(v * 0.4)}" fill="#FFFFFF"/>`;
  };
  return `
  <g filter="url(#mv3-rozmaz-velky)"><circle cx="${x + 12}" cy="${y + 16}" r="${R}" fill="#3A2B20" opacity="0.34"/></g>
  <circle cx="${x}" cy="${y}" r="${R}" fill="url(#mv3-vana-okraj)"/>
  <circle cx="${x}" cy="${y}" r="${R - 1.5}" fill="none" stroke="#55606A" stroke-width="2"/>
  <path d="M${pol(196, R - 5, x, y)}A${R - 5} ${R - 5} 0 0 1 ${pol(292, R - 5, x, y)}" stroke="#E4EAEE" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.75"/>
  <path d="M${pol(20, R - 6, x, y)}A${R - 6} ${R - 6} 0 0 1 ${pol(80, R - 6, x, y)}" stroke="#4B555E" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.5"/>
  ${kapicka(228, R - 8, 2.6)}${kapicka(236, R - 9, 1.6)}${kapicka(318, R - 8, 2.2)}${kapicka(150, R - 8, 2)}
  <circle cx="${x}" cy="${y}" r="${R - 16}" fill="url(#mv3-vana-stena)"/>
  <circle cx="${x}" cy="${y}" r="${R - 16}" fill="none" stroke="#3E474F" stroke-width="2"/>
  <g stroke="#3E474F" stroke-width="3" stroke-linecap="round">
    <path d="M${pol(102, R - 15, x, y)}L${pol(102, R - 1, x, y)}"/>
    <path d="M${pol(282, R - 15, x, y)}L${pol(282, R - 1, x, y)}"/>
  </g>
  <g stroke="#A9B4BC" stroke-width="1.2" stroke-linecap="round" opacity="0.7">
    <path d="M${pol(104, R - 14, x, y)}L${pol(104, R - 2, x, y)}"/>
    <path d="M${pol(284, R - 14, x, y)}L${pol(284, R - 2, x, y)}"/>
  </g>
  <circle cx="${x}" cy="${y}" r="${R_HLAVA + 22}" fill="#353C42"/>
  <g fill="#8E6E58" opacity="0.55">
    <path d="M${pol(150, 210, x, y)}C${pol(156, 222, x, y)} ${pol(166, 220, x, y)} ${pol(170, 208, x, y)}C${pol(164, 200, x, y)} ${pol(156, 202, x, y)} ${pol(150, 210, x, y)}Z"/>
    <ellipse cx="${f1(x + Math.cos(st(32)) * 212)}" cy="${f1(y + Math.sin(st(32)) * 212)}" rx="9" ry="5" transform="rotate(122 ${f1(x + Math.cos(st(32)) * 212)} ${f1(y + Math.sin(st(32)) * 212)})"/>
    <ellipse cx="${f1(x + Math.cos(st(300)) * 214)}" cy="${f1(y + Math.sin(st(300)) * 214)}" rx="11" ry="4.5" transform="rotate(30 ${f1(x + Math.cos(st(300)) * 214)} ${f1(y + Math.sin(st(300)) * 214)})"/>
    <circle cx="${f1(x + Math.cos(st(236)) * 220)}" cy="${f1(y + Math.sin(st(236)) * 220)}" r="3.4"/>
    <circle cx="${f1(x + Math.cos(st(78)) * 218)}" cy="${f1(y + Math.sin(st(78)) * 218)}" r="4"/>
    <circle cx="${f1(x + Math.cos(st(84)) * 206)}" cy="${f1(y + Math.sin(st(84)) * 206)}" r="2.4"/>
  </g>
  <path d="M${pol(118, 200, x, y)}A200 200 0 0 1 ${pol(146, 200, x, y)}" stroke="#7E5E4A" stroke-width="10" fill="none" stroke-linecap="round" opacity="0.45"/>
  <path d="M${pol(121, 203, x, y)}A203 203 0 0 1 ${pol(138, 203, x, y)}" stroke="#D9C2AE" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.5"/>`;
}

function hlava() {
  const { x, y } = STRED;
  /* Soustružený kov: světlo se na drážkách láme do dvou protilehlých klínů, které stojí, i když se kruh točí */
  const klin = (a: number, sirka: number, vypln: string, op: number) =>
    `<path d="M${x} ${y}L${pol(a - sirka, R_HLAVA - 6, x, y)}A${R_HLAVA - 6} ${R_HLAVA - 6} 0 0 1 ${pol(a + sirka, R_HLAVA - 6, x, y)}Z" fill="${vypln}" opacity="${op}"/>`;
  const drazky = [34, 54, 74, 94, 114, 134, 154]
    .map((r) => `<circle cx="${x}" cy="${y}" r="${r}" stroke="#7F888F" stroke-width="1.1" fill="none" opacity="0.4"/><circle cx="${x + 0.6}" cy="${y + 0.9}" r="${r}" stroke="#F4F7F9" stroke-width="0.9" fill="none" opacity="0.45"/>`)
    .join("");
  return `
  <g filter="url(#mv3-rozmaz)"><circle cx="${x + 4}" cy="${y + 7}" r="${R_HLAVA}" fill="#1E2428" opacity="0.6"/></g>
  <circle cx="${x}" cy="${y}" r="${R_HLAVA}" fill="url(#mv3-hlava)"/>
  ${[226, 46].map((a) => [4, 9, 16, 24].map((w) => klin(a, w, "url(#mv3-hlava-svetlo)", 0.3)).join("")).join("")}
  ${[136, 316].map((a) => [6, 14, 24].map((w) => klin(a, w, "url(#mv3-hlava-tma)", 0.36)).join("")).join("")}
  ${drazky}
  <circle cx="${x}" cy="${y}" r="${R_HLAVA - 2}" fill="none" stroke="#6C757C" stroke-width="3"/>
  <circle cx="${x}" cy="${y}" r="${R_HLAVA - 5.5}" fill="none" stroke="#F1F4F6" stroke-width="1.2" opacity="0.6"/>
  <path d="M${pol(200, R_HLAVA - 14, x, y)}A${R_HLAVA - 14} ${R_HLAVA - 14} 0 0 1 ${pol(262, R_HLAVA - 14, x, y)}" stroke="#FFFFFF" stroke-width="9" fill="none" stroke-linecap="round" opacity="0.32"/>`;
}

function kbelik() {
  const { x, y, r } = KBELIK;
  return `
  <g filter="url(#mv3-rozmaz)"><circle cx="${x + 7}" cy="${y + 10}" r="${r}" fill="#3A2B20" opacity="0.34"/></g>
  <circle cx="${x}" cy="${y}" r="${r}" fill="url(#mv3-zinek)"/>
  <circle cx="${x}" cy="${y}" r="${r - 1}" fill="none" stroke="#5E6A72" stroke-width="2"/>
  <path d="M${pol(200, r - 3, x, y)}A${r - 3} ${r - 3} 0 0 1 ${pol(290, r - 3, x, y)}" stroke="#F2F5F7" stroke-width="2.4" fill="none" stroke-linecap="round" opacity="0.85"/>
  <circle cx="${x}" cy="${y}" r="${r - 7}" fill="#6D7A82"/>
  <circle cx="${x}" cy="${y}" r="${r - 11}" fill="url(#mv3-kbelik-voda)"/>
  <path d="M${x - 40} ${y - 18}C${x - 26} ${y - 30} ${x - 4} ${y - 34} ${x + 14} ${y - 30}" stroke="#FFFFFF" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.4"/>
  <ellipse cx="${x + 18}" cy="${y + 26}" rx="18" ry="7" fill="#8E6E58" opacity="0.25"/>
  <path d="M${pol(176, r + 2, x, y)}C${x - 50} ${y + 70} ${x + 50} ${y + 70} ${pol(4, r + 2, x, y)}" stroke="#4E585F" stroke-width="3.4" fill="none" stroke-linecap="round"/>
  <path d="M${pol(176, r + 2, x, y)}C${x - 50} ${y + 70} ${x + 50} ${y + 70} ${pol(4, r + 2, x, y)}" stroke="#B9C3CA" stroke-width="1.2" fill="none" stroke-linecap="round" opacity="0.8"/>
  <g fill="#59646C"><circle cx="${f1(x - r - 1)}" cy="${y}" r="5"/><circle cx="${f1(x + r + 1)}" cy="${y}" r="5"/></g>`;
}

/** Drát na řezání a dřevěné žebro na podlaze */
function naradi() {
  return `
  <g transform="translate(712 478) rotate(-16)">
    <path d="M-52 6C-26 -4 8 16 46 2" transform="translate(3 5)" stroke="#3A2B20" stroke-width="3" fill="none" opacity="0.18"/>
    <path d="M-52 2C-26 -8 8 12 46 -2" stroke="#9AA3A8" stroke-width="1.8" fill="none"/>
    <g filter="url(#mv3-rozmaz-maly)" fill="#3A2B20" opacity="0.35"><rect x="-66" y="-2" width="17" height="12" rx="5"/><rect x="47" y="-6" width="17" height="12" rx="5"/></g>
    <rect x="-69" y="-6" width="17" height="12" rx="5" fill="#B0814F"/><rect x="-69" y="-6" width="17" height="5" rx="2.5" fill="#CFA06A"/>
    <rect x="44" y="-10" width="17" height="12" rx="5" fill="#B0814F"/><rect x="44" y="-10" width="17" height="5" rx="2.5" fill="#CFA06A"/>
  </g>
  <g transform="translate(736 532) rotate(10)">
    <g filter="url(#mv3-rozmaz-maly)"><path d="M-32 -6C-16 -17 18 -17 32 -4C24 8 -20 9 -32 -6Z" fill="#3A2B20" opacity="0.32" transform="translate(3 5)"/></g>
    <path d="M-32 -6C-16 -17 18 -17 32 -4C24 8 -20 9 -32 -6Z" fill="#C8955E"/>
    <path d="M-27 -8C-13 -15 13 -15 27 -6" stroke="#E2B887" stroke-width="2" fill="none" stroke-linecap="round"/>
    <circle cx="2" cy="-3" r="4" fill="#8E6238"/>
  </g>`;
}

function defsPozadi() {
  return `<defs>
    <radialGradient id="mv3-svetlo" cx="0.18" cy="0.12" r="1.05">
      <stop offset="0" stop-color="#FFF7E6" stop-opacity="0.5"/>
      <stop offset="0.5" stop-color="#FFF7E6" stop-opacity="0"/>
      <stop offset="1" stop-color="#5A3E28" stop-opacity="0.28"/>
    </radialGradient>
    <linearGradient id="mv3-vana-okraj" x1="0.15" y1="0.05" x2="0.85" y2="0.95">
      <stop offset="0" stop-color="#9AA5AD"/>
      <stop offset="0.55" stop-color="#7C878F"/>
      <stop offset="1" stop-color="#5F6970"/>
    </linearGradient>
    <radialGradient id="mv3-vana-stena" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0.8" stop-color="#2F363B"/>
      <stop offset="0.93" stop-color="#4A535A"/>
      <stop offset="1" stop-color="#5C666D"/>
    </radialGradient>
    <radialGradient id="mv3-hlava" cx="0.4" cy="0.36" r="0.72">
      <stop offset="0" stop-color="#E6EAED"/>
      <stop offset="0.55" stop-color="#C3CACF"/>
      <stop offset="1" stop-color="#959EA5"/>
    </radialGradient>
    <radialGradient id="mv3-hlava-svetlo" gradientUnits="userSpaceOnUse" cx="${STRED.x}" cy="${STRED.y}" r="${R_HLAVA}">
      <stop offset="0.12" stop-color="#FFFFFF" stop-opacity="0"/>
      <stop offset="0.45" stop-color="#FFFFFF" stop-opacity="0.38"/>
      <stop offset="0.9" stop-color="#FFFFFF" stop-opacity="0.3"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="mv3-hlava-tma" gradientUnits="userSpaceOnUse" cx="${STRED.x}" cy="${STRED.y}" r="${R_HLAVA}">
      <stop offset="0.12" stop-color="#5F686F" stop-opacity="0"/>
      <stop offset="0.55" stop-color="#5F686F" stop-opacity="0.16"/>
      <stop offset="1" stop-color="#5F686F" stop-opacity="0.05"/>
    </radialGradient>
    <linearGradient id="mv3-zinek" x1="0.1" y1="0" x2="0.9" y2="1">
      <stop offset="0" stop-color="#C3CCD2"/>
      <stop offset="0.5" stop-color="#97A3AB"/>
      <stop offset="1" stop-color="#6E7A82"/>
    </linearGradient>
    <radialGradient id="mv3-kbelik-voda" cx="0.42" cy="0.38" r="0.7">
      <stop offset="0" stop-color="#9DB9BD"/>
      <stop offset="0.7" stop-color="#6F8E93"/>
      <stop offset="1" stop-color="#4F6A70"/>
    </radialGradient>
    <filter id="mv3-rozmaz-velky" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="12"/></filter>
    <filter id="mv3-rozmaz" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6"/></filter>
    <filter id="mv3-rozmaz-maly" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3.5"/></filter>
  </defs>`;
}

/** Pozadí: podlaha, nářadí, kbelík, vana a hlava kruhu */
export function pozadi() {
  return `<svg class="mu-kresba mu-voda-pozadi" viewBox="0 0 ${SIRKA} ${VYSKA}" aria-hidden="true" focusable="false">
  ${defsPozadi()}
  ${podlaha()}
  ${naradi()}
  ${kbelik()}
  ${vana()}
  ${hlava()}
</svg>`;
}

/* ——— Popředí: co hra překresluje ——— */

/** Co se na hlavě kruhu točí: kolíky na desky, šlikr a stopy po vodě — nepravidelně, ať to při otáčení nebliká */
function hlavaToci() {
  const { x, y } = STRED;
  const kolik = (a: number) => {
    const [kx, ky] = pol(a, 138, x, y).split(" ").map(Number);
    return `<circle cx="${kx}" cy="${ky}" r="8.5" fill="#3E464C"/><circle cx="${kx}" cy="${ky}" r="5.6" fill="#C9D0D5"/><circle cx="${f1(kx - 1.4)}" cy="${f1(ky - 1.6)}" r="2" fill="#FFFFFF" opacity="0.8"/>`;
  };
  const slikr = (a1: number, a2: number, r: number, w: number, op: number) =>
    `<path d="M${pol(a1, r, x, y)}A${r} ${r} 0 0 1 ${pol(a2, r, x, y)}" stroke="#8E6E58" stroke-width="${w}" fill="none" stroke-linecap="round" opacity="${op}"/>`;
  return `
  <g class="mu-voda-toci" transform="rotate(0 ${x} ${y})">
    ${kolik(-12)}${kolik(168)}
    <g class="mu-voda-slikr-hlava">${slikr(20, 64, 106, 7, 0.32)}${slikr(110, 128, 150, 5, 0.4)}${slikr(196, 250, 120, 4, 0.28)}${slikr(280, 300, 92, 6, 0.3)}${slikr(330, 352, 158, 3.5, 0.35)}</g>
    <g class="mu-voda-odlesky" stroke="#FFFFFF" stroke-linecap="round" fill="none" opacity="0.55">
      <path d="M${pol(70, 128, x, y)}A128 128 0 0 1 ${pol(92, 128, x, y)}" stroke-width="2"/>
      <path d="M${pol(232, 160, x, y)}A160 160 0 0 1 ${pol(246, 160, x, y)}" stroke-width="1.6"/>
      <path d="M${pol(300, 146, x, y)}A146 146 0 0 1 ${pol(318, 146, x, y)}" stroke-width="1.4"/>
    </g>
    <g stroke="#59626A" stroke-width="2.4" stroke-linecap="round">
      <path d="M${pol(48, 162, x, y)}L${pol(48, 172, x, y)}"/>
      <path d="M${pol(141, 162, x, y)}L${pol(141, 172, x, y)}"/>
      <path d="M${pol(262, 162, x, y)}L${pol(262, 172, x, y)}"/>
    </g>
  </g>`;
}

/** Hrouda se vším, co k ní patří; hra ji posouvá (translate) a obrys přepisuje */
function hrouda(r0: number, smer: number) {
  const ox = STRED.x + Math.cos(smer) * r0 * MM;
  const oy = STRED.y + Math.sin(smer) * r0 * MM;
  const R = R_HROUDA;
  /* Záhyby na neusazené hlíně — mizí, jak se hrouda centruje */
  const zahyby = [
    `M${pol(30, 30)}C${pol(48, 40)} ${pol(66, 44)} ${pol(84, 38)}`,
    `M${pol(150, 46)}C${pol(170, 54)} ${pol(190, 58)} ${pol(206, 50)}`,
    `M${pol(250, 22)}C${pol(270, 30)} ${pol(290, 34)} ${pol(300, 28)}`,
    `M${pol(316, 56)}C${pol(330, 62)} ${pol(346, 64)} ${pol(358, 58)}`,
    `M${pol(110, 60)}C${pol(118, 66)} ${pol(130, 68)} ${pol(140, 64)}`,
  ];
  const praskliny = [
    `M${pol(20, 74)}L${pol(24, 66)}L${pol(19, 60)}`,
    `M${pol(70, 75)}L${pol(73, 66)}L${pol(68, 61)}L${pol(71, 55)}`,
    `M${pol(128, 74)}L${pol(131, 67)}L${pol(127, 62)}`,
    `M${pol(186, 75)}L${pol(190, 66)}L${pol(186, 59)}`,
    `M${pol(238, 74)}L${pol(241, 67)}L${pol(236, 61)}L${pol(240, 56)}`,
    `M${pol(292, 75)}L${pol(296, 68)}L${pol(292, 62)}`,
    `M${pol(336, 74)}L${pol(339, 66)}L${pol(334, 60)}`,
  ];
  return `
  <g class="mu-voda-hrouda" transform="translate(${f1(ox)} ${f1(oy)})">
    <circle class="mu-voda-louze" cx="0" cy="0" r="${R + 12}" fill="url(#mv3-louze)" opacity="0.8"/>
    <circle class="mu-voda-stin" cx="7" cy="10" r="${R + 12}" fill="url(#mv3-stin-hroudy)"/>
    <use class="mu-voda-telo" href="#mv3-obrys" fill="url(#mv3-hlina)"/>
    <use class="mu-voda-mokro" href="#mv3-obrys" fill="#3E2A1F" opacity="0.1"/>
    <use class="mu-voda-sucho" href="#mv3-obrys" fill="#E9DCC9" opacity="0"/>
    <g clip-path="url(#mv3-hrouda-orez)">
      <circle cx="${f1(-R * 0.16)}" cy="${f1(-R * 0.2)}" r="${f1(R * 1.18)}" fill="none" stroke="#2B1D15" stroke-width="${f1(R * 0.42)}" opacity="0.2"/>
      <g class="mu-voda-ryhy" transform="rotate(0)">
        <path d="${spirala(R)}" stroke="#4E3729" stroke-width="3.2" fill="none" opacity="0.3" stroke-linecap="round"/>
        <path d="${spirala(R)}" transform="translate(-1.5 -1.9)" stroke="#EBD3BA" stroke-width="1.5" fill="none" opacity="0.5" stroke-linecap="round"/>
        <g class="mu-voda-zahyby" stroke="#4A3326" stroke-width="2.8" fill="none" stroke-linecap="round" opacity="0.5">${zahyby.map((d) => `<path d="${d}"/>`).join("")}</g>
        <g class="mu-voda-praskliny" stroke="#8C705A" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0">${praskliny.map((d) => `<path d="${d}"/>`).join("")}</g>
      </g>
    </g>
    <ellipse class="mu-voda-lesk" cx="${f1(-R * 0.3)}" cy="${f1(-R * 0.36)}" rx="${f1(R * 0.42)}" ry="${f1(R * 0.24)}" transform="rotate(-32 ${f1(-R * 0.3)} ${f1(-R * 0.36)})" fill="url(#mv3-lesk)" opacity="0.5"/>
    <ellipse class="mu-voda-jiskra" cx="${f1(-R * 0.36)}" cy="${f1(-R * 0.42)}" rx="${f1(R * 0.1)}" ry="${f1(R * 0.05)}" transform="rotate(-32 ${f1(-R * 0.36)} ${f1(-R * 0.42)})" fill="#FFFFFF" opacity="0.6"/>
    <path class="mu-voda-lesk-okraj" d="M${pol(18, R * 0.9)}A${f1(R * 0.9)} ${f1(R * 0.9)} 0 0 1 ${pol(78, R * 0.9)}" stroke="#F6E7D6" stroke-width="2.4" fill="none" stroke-linecap="round" opacity="0.3"/>
    <use href="#mv3-obrys" fill="none" stroke="#3B2A1F" stroke-width="1.6" opacity="0.5"/>
  </g>`;
}

function vlhkomer() {
  const { x, y, dno, vyska } = VLHKOMER;
  const kapka = `M0 -74C10 -56 44 -26 44 18A44 44 0 1 1 -44 18C-44 -26 -10 -56 0 -74Z`;
  const yA = dno - PASMO[0] * vyska;
  const yB = dno - PASMO[1] * vyska;
  const yS = dno - SUCHO * vyska;
  const yM = dno - MOKRO * vyska;
  return `
  <g class="mu-voda-vlhkomer" transform="translate(${x} ${y})">
    <path d="${kapka}" transform="translate(4 7)" fill="#3A2B20" opacity="0.14" stroke="#3A2B20" stroke-opacity="0.08" stroke-width="8" stroke-linejoin="round"/>
    <path d="${kapka}" fill="#F7F1E3"/>
    <g clip-path="url(#mv3-vlhkomer-orez)">
      <path class="mu-voda-hladina" d="${hladinaVlhkomeru(0.55, 0)}" fill="url(#mv3-voda)"/>
      <path class="mu-voda-hladina-lesk" d="M-30 ${f1(yVlhkomeru(0.55) + 7)}H-10" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity="0.7"/>
      <path d="M-26 -10C-34 6 -34 30 -22 46" stroke="#FFFFFF" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.5"/>
    </g>
    <path class="mu-voda-vlhkomer-obrys" d="${kapka}" fill="none" stroke="#4F6A78" stroke-width="3"/>
    <g stroke-linecap="round">
      <path d="M50 ${f1(yA)}H58V${f1(yB)}H50" stroke="#D6A23A" stroke-width="3.4" fill="none" stroke-linejoin="round"/>
      <path d="M44 ${f1(yS)}H58" stroke="#C4432B" stroke-width="2.6"/>
      <path d="M34 ${f1(yM)}H50" stroke="#4D8AA6" stroke-width="2.6" stroke-dasharray="3 3"/>
    </g>
    <text class="mu-voda-ruka-pismo" x="64" y="${f1((yA + yB) / 2 + 7)}" font-size="25" fill="#9A6E1E">akorát</text>
    <text class="mu-voda-ruka-pismo" x="60" y="${f1(yS + 18)}" font-size="20" fill="#C4432B">drhne</text>
    <text class="mu-voda-ruka-pismo" x="54" y="${f1(yM - 6)}" font-size="20" fill="#3F7590">plave</text>
    <text class="mu-voda-popisek" x="0" y="${dno + 32}" text-anchor="middle" font-size="25" fill="#2B2420">voda</text>
  </g>`;
}

function terc() {
  const { x, y, r } = TERC;
  const kruhy = [20, 10, 5].map((mm) => `<circle cx="0" cy="0" r="${f1(polomerNaTerci(mm))}" fill="none" stroke="#8A7C70" stroke-width="1.3" opacity="0.7"/>`).join("");
  const cil = polomerNaTerci(CIL_MM);
  const popis = (mm: number) => `<text x="3" y="${f1(-polomerNaTerci(mm) + 12)}">${mm}</text>`;
  return `
  <g class="mu-voda-terc" transform="translate(${x} ${y})">
    <circle cx="4" cy="7" r="${r + 1}" fill="#3A2B20" opacity="0.14" stroke="#3A2B20" stroke-opacity="0.08" stroke-width="8"/>
    <circle cx="0" cy="0" r="${r}" fill="#F7F1E3"/>
    <circle cx="0" cy="0" r="${r - 3}" fill="none" stroke="#2B2420" stroke-width="1.2" opacity="0.5"/>
    <circle class="mu-voda-cil" cx="0" cy="0" r="${f1(cil)}" fill="#F3D27A" stroke="#D6A23A" stroke-width="2"/>
    ${kruhy}
    <path d="M${-r + 8} 0H${r - 8}M0 ${-r + 8}V${r - 8}" stroke="#8A7C70" stroke-width="0.9" opacity="0.4"/>
    <g class="mu-voda-ruka-pismo" font-size="13" fill="#8A7C70">${popis(20)}${popis(10)}</g>
    <circle class="mu-voda-drzeni" cx="0" cy="0" r="${r + 7}" fill="none" stroke="#D6A23A" stroke-width="6" stroke-linecap="round" stroke-dasharray="0 999" transform="rotate(-90)" opacity="0"/>
    <path class="mu-voda-stopa" d="" fill="none" stroke="#C4432B" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" opacity="0.35"/>
    <circle class="mu-voda-tecka" cx="${f1(polomerNaTerci(16) * Math.cos(st(-38)))}" cy="${f1(polomerNaTerci(16) * Math.sin(st(-38)))}" r="6" fill="#C4432B" stroke="#FFFFFF" stroke-width="1.8"/>
    <text class="mu-voda-cislo mu-voda-terc-cislo" x="0" y="${r + 34}" text-anchor="middle" font-size="26" fill="#2B2420">16 mm</text>
    <text class="mu-voda-ruka-pismo" x="0" y="${r + 54}" text-anchor="middle" font-size="18" fill="#5C5047">od středu</text>
  </g>`;
}

function defsPopredi() {
  return `<defs>
    <radialGradient id="mv3-hlina" cx="0.38" cy="0.34" r="0.74">
      <stop offset="0" stop-color="#D9B699"/>
      <stop offset="0.38" stop-color="#B48F72"/>
      <stop offset="0.78" stop-color="#8A664F"/>
      <stop offset="1" stop-color="#5E4334"/>
    </radialGradient>
    <radialGradient id="mv3-lesk" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.95"/>
      <stop offset="0.6" stop-color="#FFFFFF" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="mv3-stin-hroudy" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0.72" stop-color="#1E1611" stop-opacity="0.5"/>
      <stop offset="0.86" stop-color="#1E1611" stop-opacity="0.2"/>
      <stop offset="1" stop-color="#1E1611" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="mv3-louze" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0.78" stop-color="#6E5040" stop-opacity="0.55"/>
      <stop offset="0.9" stop-color="#8E6E58" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#8E6E58" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="mv3-kuze" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#F5DAC0"/>
      <stop offset="0.5" stop-color="#E9BE9A"/>
      <stop offset="1" stop-color="#CF9874"/>
    </linearGradient>
    <linearGradient id="mv3-rukav" x1="0" y1="204" x2="0" y2="600" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#4A5A82"/>
      <stop offset="0.5" stop-color="#36446A"/>
      <stop offset="1" stop-color="#2A3555"/>
    </linearGradient>
    <linearGradient id="mv3-voda" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#A9D6E8"/>
      <stop offset="1" stop-color="#4D8AA6"/>
    </linearGradient>
    <path id="mv3-obrys" d="${obrysHroudy(R_HROUDA, 1, 0)}"/>
    <clipPath id="mv3-hrouda-orez"><use href="#mv3-obrys"/></clipPath>
    <clipPath id="mv3-vlhkomer-orez"><path d="M0 -74C10 -56 44 -26 44 18A44 44 0 1 1 -44 18C-44 -26 -10 -56 0 -74Z"/></clipPath>
  </defs>`;
}

/** Popředí ve výchozím stavu: hrouda 16 mm mimo osu, vody akorát, ruce schované */
export function popredi() {
  const { x, y } = STRED;
  return `<svg class="mu-kresba mu-voda-popredi" viewBox="0 0 ${SIRKA} ${VYSKA}" aria-hidden="true" focusable="false">
  ${defsPopredi()}
  ${hlavaToci()}
  ${hrouda(16, st(-38))}
  <circle class="mu-voda-zona" cx="${x}" cy="${y}" r="${f1(R_HLAVA * ZONA)}" fill="none" stroke="#F7F1E3" stroke-width="2.2" stroke-dasharray="5 7" opacity="0"/>
  <g class="mu-voda-postrik"></g>
  <g class="mu-voda-ruce" transform="translate(${x} ${y})" opacity="0">${ruce()}</g>
  <g class="mu-voda-houba" transform="translate(${x - 64} ${y - 92})" opacity="0">
    <g class="mu-voda-houba-zdimani">${houba()}</g>
  </g>
  ${vlhkomer()}
  ${terc()}
</svg>`;
}

/** Houbička v kbelíku je vlastní malé SVG, ať se při namáčení nepřekresluje celé pozadí */
function houbaVKbeliku() {
  const { x, y, r } = KBELIK;
  const v = r - 11;
  return `<svg class="mu-kresba mu-voda-kbelik-hladina" viewBox="0 0 ${SIRKA} ${VYSKA}" aria-hidden="true" focusable="false">
  <defs><clipPath id="mv3-kbelik-orez"><circle cx="${x}" cy="${y}" r="${v}"/></clipPath></defs>
  <g clip-path="url(#mv3-kbelik-orez)" fill="none" stroke="#FFFFFF" stroke-linecap="round">
    <circle class="mu-voda-kbelik-vlna" cx="${x - 6}" cy="${y + 4}" r="16" stroke-width="2.2" opacity="0"/>
    <circle class="mu-voda-kbelik-vlna mu-voda-kbelik-vlna-2" cx="${x - 6}" cy="${y + 4}" r="16" stroke-width="1.4" opacity="0"/>
  </g>
  <g class="mu-voda-houba-kbelik" transform="translate(${x - 6} ${y + 4}) rotate(-14)">
    <g class="mu-voda-houba-kbelik-nori">
      <rect x="-27" y="-13" width="60" height="34" rx="12" fill="#1F2A30" opacity="0.22"/>
      ${houba()}
    </g>
  </g>
</svg>`;
}

/** Celá kresba: pozadí, houba v kbelíku a popředí */
export const kresba = () => pozadi() + houbaVKbeliku() + popredi();

/** Obal Kapky v procentech okna */
export const KAPKA_STYL = `left:${procenta(KAPKA.x, SIRKA)};top:${procenta(KAPKA.y, VYSKA)};width:${procenta(KAPKA.s, SIRKA)}`;

/** HTML nad kresbou: plocha, na kterou se pokládají ruce, a kbelík jako druhé místo, odkud se bere voda */
export function prekryvy() {
  const d = R_VANA * 2;
  const { x, y, r } = KBELIK;
  return `<div class="mu-voda-dotyk" role="application" tabindex="0" aria-label="Kruh s hroudou. Drž myš nebo prst uprostřed hlíny a nehýbej se. Z klávesnice drží ruce na středu klávesa H, vodu přidá mezerník nebo W." style="left:${procenta(STRED.x - R_VANA, SIRKA)};top:${procenta(STRED.y - R_VANA, VYSKA)};width:${procenta(d, SIRKA)};height:${procenta(d, VYSKA)}"></div>
<div class="mu-voda-kbelik-cil" aria-hidden="true" style="left:${procenta(x - r, SIRKA)};top:${procenta(y - r, VYSKA)};width:${procenta(2 * r, SIRKA)};height:${procenta(2 * r, VYSKA)}"></div>`;
}

/** Ovládání pod oknem */
export function ovladani() {
  return `<div class="mu-ovladani mu-voda-ovladani">
  <button type="button" class="tlacitko mu-voda-tlacitko" aria-keyshortcuts="Space W">
    <svg class="mu-voda-tlacitko-ikona" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2.5C9 7 5.5 10.6 5.5 14.6a6.5 6.5 0 0 0 13 0C18.5 10.6 15 7 12 2.5Z" fill="#A9D6E8" stroke="currentColor" stroke-width="1.6"/><path d="M9 15.5c.3 1.6 1.4 2.6 3 2.8" stroke="#FFFFFF" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>
    <span>Voda</span>
    <kbd class="mu-voda-klavesa" aria-hidden="true">mezerník</kbd>
  </button>
  <p class="mu-voda-napoveda">Ruce na střed hlíny a nehýbat <span class="mu-voda-napoveda-klavesa">· klávesa H</span></p>
</div>`;
}

/** Celá scéna jako text — pro testy bez Astra (Kapku vkládá Voda.astro, tady stačí zástupce) */
export function scena(kapka = "") {
  return `<div class="mu-okno">${kresba()}${prekryvy()}<div class="mu-voda-kapka" style="${KAPKA_STYL}" aria-hidden="true"><div class="mu-voda-kapka-pruzina">${kapka}</div></div></div>${ovladani()}`;
}
