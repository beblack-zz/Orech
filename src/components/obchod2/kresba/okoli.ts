/**
 * Okolí krámku — ulice, ve které krámek stojí.
 *
 * Z nočního plakátu: sousedé chladnější a tmavší než krámek, betonové
 * sloupy s transformátorem a pavučinou drátů, klimatizace, trubky,
 * kytky v květináčích. Z izometrického krámku: červený automat na
 * nápoje, strom přes roh, červená stolička, stojan s tabulí, chodník
 * s obrubníkem a silnice s čárami, měkké pastelové denní světlo.
 *
 * Rozvržení zleva (osa x světa):
 *   0–515      starý obchodní dům s měděným průčelím (看板建築):
 *              v přízemí holič se staženou roletou, v patrech futon
 *              a prádlo, nahoře ozdobná atika
 *   515–1092   čtyřpatrový dům s kachlíky (雑居ビル): kavárna 喫茶
 *              v 1. patře, balkon s prádlem, na střeše nádrž na vodu
 *              a anténa; v přízemí volná zeď pro vývěsku (prizemi.ts)
 *   1092–1100  tmavá spára u krámku
 *   2108–2760  dvoupatrový dřevěný dům: tašky いぶし瓦, vlnitý plech,
 *              mřížové dveře 格子戸, plynoměr; před ním automat
 *   2760–3200  bytovka コーポさくら s balkony a kolárnou
 *   za domem 2108–2760 sakura — koruna se barví podle ročního období
 *   sloupy     MISTA.sloupL a sloupP, mezi nimi a do stran dráty
 *
 * Vrstvy: zadni (sousedé, strom, sloupy), zem (chodník s hmatovou
 * dlažbou, obrubník, silnice s poklopem, paty sloupů), predni (dráty
 * a vrány, automat, kytky, stojan, kolo, stolička…) a svetla
 * (okna sousedů, automat, lampička na sloupu, cedulka kavárny).
 *
 * Třídy pro stránku: krm-vrany > krm-vrana (data-i, data-x, data-y =
 * kde vrána sedí), krm-ok-automat (svetla), krm-ok-okno
 * (svetla), krm-vitr (prádlo a futony), koruna + sak-1/2/3 (listí),
 * snih (zimní čepice), koruna-zem (napadané lístky na chodníku).
 */
import { P, SVIT, PISMO, PRAH, MISTA, Y, svetlo, f, chomac, nahoda, obdelnik, cara, kruh, elipsa, mnohouhelnik } from "./zaklad";
import type { Vrstvy, Obdelnik, Bod } from "./zaklad";
import { nocni } from "./noc";

/* ——— Barvy okolí — chladnější a šedší než krámek ——— */
const O = {
  /* L1: zezelenalé měděné plechy (緑青), ztlumené do šeda */
  med: "#AEBFB8",
  medSvetla: "#C6D3CD",
  medStin: "#97A8A2",
  medTma: "#7C8D88",
  medSpara: "#9DAFA8",
  l1Omitka: "#C3CBC8",
  /* L2: kachlíky (rodina P.soused) */
  l2: P.soused,
  l2Svetly: "#D8D5D9",
  l2Stin: P.sousedStin,
  l2Tma: P.sousedTma,
  l2Spara: "#BDB9C0",
  /* R1: vlnitý plech, tašky いぶし瓦, omítka, prkna */
  plech: "#A3B3BF",
  plechSvetly: "#BDCAD3",
  plechTma: "#8696A4",
  kawara: "#7A8491",
  kawaraSvetla: "#9CA6B2",
  kawaraTma: "#59626F",
  r1Omitka: "#C8CACB",
  prkna: "#8E8B88",
  prknaSpara: "#76736F",
  drevoSede: "#6C6865",
  drevoSedeTma: "#524E4B",
  /* R2: bytovka */
  r2: "#CED1D4",
  r2Svetly: "#DDDFE1",
  r2Stin: "#B1B5BA",
  r2Tma: "#959AA1",
  /* okna a kov */
  hlinik: "#C2C8CD",
  hlinikSvetly: "#DCE1E5",
  hlinikTma: "#98A0A8",
  sklo: P.sousedOkno,
  skloSvetle: "#8795A6",
  odlesk: "#B9C7D4",
  skloMatne: "#C4CDD4",
  zaves: "#E8E4DB",
  zavesStin: "#CFCAC0",
  beton: "#BEBFBA",
  betonSvetly: "#D6D7D2",
  betonTma: "#9E9F9A",
  ocel: "#7E868D",
  ocelTma: "#5F666C",
  kabel: "#2E2D33",
  porcelan: "#F1F0EA",
  porcelanStin: "#C9C8C1",
  klima: "#E6E7E3",
  klimaStin: "#C7C9C4",
  trubka: "#E3DED0",
  snih: "#FBFDFF",
  stin: "#2B2420",
  /* zeleň v květináčích */
  list: P.list,
  listTma: P.listTma,
  listSvetly: P.listSvetly,
  /* kůra sakury */
  kura: "#4B403C",
  kuraSvetla: "#665853",
};

/* ——— Pomocníci ——— */

/** Hodně obdélníků jedné barvy jako jedna cesta */
const obdelniky = (r: number[][], atributy: string) =>
  r.length ? `<path d="${r.map(([x, y, w, h]) => `M${f(x)} ${f(y)}h${f(w)}v${f(h)}h${f(-w)}z`).join("")}" ${atributy}/>` : "";
/** Lomená čára / mnohoúhelník jako d */
const cesta = (b: Bod[], zavrit = true) => `M${b.map(([x, y]) => `${f(x)} ${f(y)}`).join(" L")}${zavrit ? " Z" : ""}`;
const snih = (obsah: string) => `<g class="snih">${obsah}</g>`;
const jenDen = (obsah: string) => `<g class="krm-jen-den">${obsah}</g>`;
const jenNoc = (obsah: string) => `<g class="krm-jen-noc">${obsah}</g>`;
const vitr = (obsah: string) => `<g class="krm-vitr">${obsah}</g>`;
/** Svislý nápis: znak pod znakem */
const svisle = (x: number, y: number, znaky: string, velikost: number, atributy: string, rozestup = 1.1) =>
  `<text font-size="${velikost}" text-anchor="middle" ${atributy}>${[...znaky]
    .map((z, i) => `<tspan x="${f(x)}" y="${f(y + i * velikost * rozestup)}">${z}</tspan>`)
    .join("")}</text>`;
/** Kroužek jako část cesty (pro hodně koleček jednou cestou) */
const kolecko = (cx: number, cy: number, r: number) =>
  `M${f(cx - r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`;

/** Hladká křivka přes body (Catmull-Rom → Bézier) */
function hladka(b: Bod[]) {
  let d = `M${f(b[0][0])} ${f(b[0][1])}`;
  for (let i = 0; i < b.length - 1; i++) {
    const p0 = b[i - 1] ?? b[i];
    const p1 = b[i];
    const p2 = b[i + 1];
    const p3 = b[i + 2] ?? p2;
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

/** Body na hladké křivce (pro větve, které se zužují) */
function vzorkuj(b: Bod[], n: number): Bod[] {
  const out: Bod[] = [];
  for (let i = 0; i < b.length - 1; i++) {
    const p0 = b[i - 1] ?? b[i];
    const p1 = b[i];
    const p2 = b[i + 1];
    const p3 = b[i + 2] ?? p2;
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const t2 = t * t;
      const t3 = t2 * t;
      const q = (a: number, b1: number, c: number, d: number) =>
        0.5 * (2 * b1 + (-a + c) * t + (2 * a - 5 * b1 + 4 * c - d) * t2 + (-a + 3 * b1 - 3 * c + d) * t3);
      out.push([q(p0[0], p1[0], p2[0], p3[0]), q(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(b[b.length - 1]);
  return out;
}

/** Zužující se větev jako vyplněný tvar: šířka w0 u kmene → w1 na konci */
function vetev(b: Bod[], w0: number, w1: number) {
  const s = vzorkuj(b, 8);
  const l: Bod[] = [];
  const r: Bod[] = [];
  s.forEach((p, i) => {
    const a = s[Math.max(0, i - 1)];
    const c = s[Math.min(s.length - 1, i + 1)];
    const dx = c[0] - a[0];
    const dy = c[1] - a[1];
    const d = Math.hypot(dx, dy) || 1;
    const w = (w0 + (w1 - w0) * (i / (s.length - 1))) / 2;
    l.push([p[0] - (dy / d) * w, p[1] + (dx / d) * w]);
    r.push([p[0] + (dy / d) * w, p[1] - (dx / d) * w]);
  });
  return cesta([...l, ...r.reverse()]);
}

/* ——— Dráty: řetězovka jako parabola (kvadratická Bézierova křivka) ——— */
interface Drat {
  a: Bod;
  b: Bod;
  prohyb: number;
}
const naDratu = (d: Drat, x: number) => {
  const t = (x - d.a[0]) / (d.b[0] - d.a[0]);
  return d.a[1] + (d.b[1] - d.a[1]) * t + d.prohyb * 4 * t * (1 - t);
};
const dratD = (d: Drat) =>
  `M${f(d.a[0])} ${f(d.a[1])} Q${f((d.a[0] + d.b[0]) / 2)} ${f((d.a[1] + d.b[1]) / 2 + 2 * d.prohyb)} ${f(d.b[0])} ${f(d.b[1])}`;

/* ——— Sloupy ——— */
const SL = MISTA.sloupL.x + MISTA.sloupL.w / 2;
const SP = MISTA.sloupP.x + MISTA.sloupP.w / 2;
const VRCH = MISTA.sloupL.y;
const PATA = Y.obrubnik - 2;
/** Poloviční šířka sloupu v dané výšce — beton se ke kořeni rozšiřuje */
const pulSloupu = (y: number) => 12 + ((y - VRCH) / (PATA - VRCH)) * 4.5;

/**
 * Úchyty drátů na sloupu (pro sloup se středem cx; zrcadlo = pravý sloup).
 * Ramena jsou níž než vršek sloupu, aby dráty nad krámkem byly vidět
 * i v celkovém záběru kamery (ten začíná kolem y 230).
 */
const uchyty = (cx: number, zrcadlo: boolean) => {
  const m = zrcadlo ? -1 : 1;
  return {
    /** zemnicí lano na špičce sloupu */
    vrch: [cx + m * 14, 54] as Bod,
    vn: [cx - 80, cx - 30, cx + 75].map((x): Bod => [x, 114]),
    vn2: [cx - 62, cx + 62].map((x): Bod => [x, 186]),
    nn: [326, 344, 362].map((y): Bod => [cx + m * 24, y]),
    tel: [cx - m * 4, 646] as Bod,
  };
};
const UL = uchyty(SL, false);
const UP = uchyty(SP, true);

/* ——— Dráty mezi sloupy, do stran, přípojky a „k divákovi“ ——— */
const DRATY_VN: Drat[] = [
  { a: UL.vrch, b: UP.vrch, prohyb: 36 },
  ...UL.vn.map((a, i): Drat => ({ a, b: UP.vn[i], prohyb: 50 + i * 3 })),
  // nad krámkem musí zůstat nad hřebenem a jeho oni-gawarami (vršky kolem y 232)
  ...UL.vn2.map((a, i): Drat => ({ a, b: UP.vn2[i], prohyb: 24 - i * 2 })),
];
const DRATY_STRANY: Drat[] = [
  { a: [-1700, 60], b: UL.vrch, prohyb: 40 },
  { a: UP.vrch, b: [4900, 58], prohyb: 40 },
  ...UL.vn.map((b, i): Drat => ({ a: [-1700, 120 + i * 3], b, prohyb: 64 + i * 3 })),
  ...UL.vn2.map((b, i): Drat => ({ a: [-1700, 190], b, prohyb: 74 + i * 5 })),
  ...UP.vn.map((a, i): Drat => ({ a, b: [4900, 118 + i * 3], prohyb: 60 + i * 4 })),
  ...UP.vn2.map((a, i): Drat => ({ a, b: [4900, 192], prohyb: 72 + i * 3 })),
];
const DRATY_NN: Drat[] = [
  ...UL.nn.map((b, i): Drat => ({ a: [-1700, 338 + i * 18], b, prohyb: 92 + i * 6 })),
  ...UP.nn.map((a, i): Drat => ({ a, b: [4900, 338 + i * 18], prohyb: 88 + i * 6 })),
];
const DRATY_TEL: Drat[] = [
  { a: [-1700, 680], b: UL.tel, prohyb: 70 },
  { a: [-1700, 698], b: [UL.tel[0] - 2, 664], prohyb: 76 },
  { a: UP.tel, b: [4900, 680], prohyb: 68 },
  { a: [UP.tel[0] + 2, 664], b: [4900, 702], prohyb: 74 },
];
/** Přípojky k domům: krámek (okraj střechy zleva i zprava), sousedé */
const PRIPOJKY: Drat[] = [
  { a: UL.nn[0], b: [1110, 432], prohyb: 26 },
  { a: UL.nn[1], b: [872, 552], prohyb: 20 },
  { a: [SL - 16, 362], b: [300, 452], prohyb: 14 },
  { a: UP.nn[0], b: [2090, 432], prohyb: 30 },
  { a: UP.nn[1], b: [2600, 688], prohyb: 22 },
  { a: [SP + 16, 362], b: [2950, 446], prohyb: 10 },
];
const PRIPOJKY_TEL: Drat[] = [
  { a: UL.tel, b: [726, 928], prohyb: 30 },
  { a: UP.tel, b: [3060, 884], prohyb: 26 },
];
/** Dráty, které vedou přes ulici k divákovi — na obraze stoupají ven z rámu */
const DRATY_K_DIVAKOVI: Drat[] = [
  { a: UL.vn2[0], b: [-260, -60], prohyb: 22 },
  { a: UL.vn[2], b: [1010, -60], prohyb: 14 },
  { a: UP.vn2[0], b: [2410, -80], prohyb: 18 },
  { a: UP.vn[2], b: [3360, -40], prohyb: 14 },
];
/** Kotevní lana sloupů (rovná, s chráničem dole) */
const KOTVY: Drat[] = [
  { a: [SL - 8, 120], b: [330, 1852], prohyb: 0 },
  { a: [SP + 8, 120], b: [2948, 1852], prohyb: 0 },
];
/** Všechny dráty s tloušťkou a barvou — kreslí je predni a přes rozsvícená okna i svetla */
const VSECHNY_DRATY: { d: Drat; w: number; c: string }[] = [
  ...[...DRATY_VN, ...DRATY_STRANY].map((d) => ({ d, w: 2.4, c: O.kabel })),
  ...DRATY_K_DIVAKOVI.map((d) => ({ d, w: 2.8, c: O.kabel })),
  ...DRATY_NN.map((d) => ({ d, w: 2.6, c: "#34333A" })),
  ...PRIPOJKY.map((d) => ({ d, w: 2, c: "#34333A" })),
  ...DRATY_TEL.map((d) => ({ d, w: 5, c: "#25242A" })),
  ...PRIPOJKY_TEL.map((d) => ({ d, w: 2.6, c: "#25242A" })),
  ...KOTVY.map((d) => ({ d, w: 2.4, c: "#4A4A50" })),
];
/** Vede drát přes obdélník? (stačí pár vzorků po x) */
const krizi = (d: Drat, r: Obdelnik) => {
  const x0 = Math.max(r.x, Math.min(d.a[0], d.b[0]));
  const x1 = Math.min(r.x + r.w, Math.max(d.a[0], d.b[0]));
  if (x1 < x0) return false;
  for (let k = 0; k <= 12; k++) {
    const y = naDratu(d, x0 + ((x1 - x0) * k) / 12);
    if (y >= r.y && y <= r.y + r.h) return true;
  }
  return false;
};
/** Denní kresba v nočních barvách (pro siluety věcí před rozsvíceným oknem) */
const doNoci = (svg: string) => svg.replace(/#([0-9a-fA-F]{6})\b/g, (_, h: string) => nocni(h));

/*
 * ——— Vrány ———
 * Sedí na drátech, které jsou vidět v celkovém záběru kamery (ten začíná
 * kolem y 230): dvě na přípojce ke krámku před korunou sakury, jedna
 * u levé střechy krámku, jedna nad starým domem vlevo, jedna nad bytovkou.
 */
const VRANY = [
  { drat: DRATY_NN[1], x: 318, smer: 1, s: 0.96, poza: "cisti" },
  { drat: PRIPOJKY[0], x: 1040, smer: -1, s: 1, poza: "sedi" },
  { drat: PRIPOJKY[3], x: 2302, smer: 1, s: 1.05, poza: "krak" },
  { drat: PRIPOJKY[3], x: 2458, smer: -1, s: 0.98, poza: "sedi" },
  { drat: DRATY_NN[3], x: 2992, smer: -1, s: 0.94, poza: "sedi" },
].map((v) => ({ ...v, y: naDratu(v.drat, v.x) }));

/* ——— Kde co je (stránka z toho dělá tlačítka a cíle) ——— */
export const OKOLI = {
  /** Automat na nápoje — stránka z něj dělá tlačítko */
  automat: { ...MISTA.automat } as Obdelnik,
  /** Kolo opřené o lampu (skutečný obrys kresby) */
  kolo: { x: 546, y: 1636, w: 252, h: 152 } as Obdelnik,
  /** Vrány na drátech (hrubý obdélník kolem všech — jsou rozházené po celé šířce) */
  vrany: (() => {
    const xs = VRANY.map((v) => v.x);
    const ys = VRANY.map((v) => v.y);
    const x = Math.min(...xs) - 40;
    const y = Math.min(...ys) - 50;
    return { x: f(x), y: f(y), w: f(Math.max(...xs) + 40 - x), h: f(Math.max(...ys) + 12 - y) } as Obdelnik;
  })(),
  /** Každá vrána zvlášť (pořadí = data-i skupiny krm-vrana) */
  vranyKazda: VRANY.map((v): Obdelnik => ({ x: f(v.x - 36 * v.s), y: f(v.y - 48 * v.s), w: f(72 * v.s), h: f(52 * v.s) })),
};

/* =====================================================================
 *  ZADNÍ VRSTVA
 * ===================================================================== */

/** Vzory do <defs> zadní vrstvy */
const defsZadni = () => `<defs>
  <pattern id="kd-ok-z-zaluzie" width="12" height="9" patternUnits="userSpaceOnUse">
    <rect width="12" height="9" fill="#E2E0D9"/><rect y="6.5" width="12" height="2.5" fill="#B9B6AE"/>
  </pattern>
  <pattern id="kd-ok-z-med" width="44" height="26" patternUnits="userSpaceOnUse">
    <rect width="44" height="26" fill="${O.med}"/>
    <path d="M0 12.5 H44 M0 25.5 H44 M11 0 V13 M33 13 V26" stroke="${O.medSpara}" stroke-width="1.6" fill="none"/>
    <path d="M12 1.5 H32 M34 14.5 H44 M0 14.5 H10" stroke="${O.medSvetla}" stroke-width="1.4" fill="none" opacity="0.7"/>
  </pattern>
  <pattern id="kd-ok-z-kachle" width="36" height="36" patternUnits="userSpaceOnUse">
    <rect width="36" height="36" fill="${O.l2}"/>
    <path d="M0 17.5 H36 M0 35.5 H36 M17.5 0 V18 M35.5 18 V36" stroke="${O.l2Spara}" stroke-width="1.2" fill="none"/>
  </pattern>
  <pattern id="kd-ok-z-vlnity" width="14" height="60" patternUnits="userSpaceOnUse">
    <rect width="14" height="60" fill="${O.plech}"/><rect x="1" width="4" height="60" fill="${O.plechSvetly}"/><rect x="9" width="3" height="60" fill="${O.plechTma}"/>
  </pattern>
  <pattern id="kd-ok-z-kawara" width="24" height="16" patternUnits="userSpaceOnUse">
    <rect width="24" height="16" fill="${O.kawara}"/><rect x="2" width="10" height="16" fill="${O.kawaraSvetla}"/><rect x="12" width="3" height="16" fill="${O.kawaraTma}"/>
    <path d="M0 15.4 H24" stroke="${O.kawaraTma}" stroke-width="1.2" opacity="0.55"/>
  </pattern>
  <pattern id="kd-ok-z-roleta" width="40" height="13" patternUnits="userSpaceOnUse">
    <rect width="40" height="13" fill="#B7BDC3"/><rect width="40" height="3" fill="#CFD4D9"/><rect y="10.5" width="40" height="2.5" fill="#98A0A7"/>
  </pattern>
  <pattern id="kd-ok-z-sudare" width="20" height="5" patternUnits="userSpaceOnUse">
    <rect width="20" height="5" fill="#C9B78F"/><rect y="3.6" width="20" height="1.4" fill="#A8946A"/>
  </pattern>
  <pattern id="kd-ok-z-prkna" width="22" height="60" patternUnits="userSpaceOnUse">
    <rect width="22" height="60" fill="${O.prkna}"/><rect x="19.5" width="2.5" height="60" fill="${O.prknaSpara}"/><rect x="1" width="2" height="60" fill="#A3A09C" opacity="0.6"/>
  </pattern>
  <pattern id="kd-ok-z-oblozeni" width="60" height="32" patternUnits="userSpaceOnUse">
    <rect width="60" height="32" fill="${O.r2}"/><rect y="30" width="60" height="2" fill="${O.r2Stin}" opacity="0.8"/>
  </pattern>
  <pattern id="kd-ok-z-tygr" width="26" height="26" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
    <rect width="26" height="26" fill="#E8C341"/><rect width="13" height="26" fill="#2E2B2A"/>
  </pattern>
  <g id="kd-ok-z-klima">
    <rect width="76" height="54" rx="3" fill="${O.klima}"/>
    <rect x="72" width="4" height="54" fill="${O.klimaStin}"/>
    <rect y="50" width="76" height="4" fill="${O.klimaStin}"/>
    <circle cx="27" cy="26" r="20" fill="#BBBEBA"/>
    <circle cx="27" cy="26" r="16.5" fill="#8C908D"/>
    <path d="M10.5 26 H43.5 M27 9.5 V42.5 M15.3 14.3 L38.7 37.7 M38.7 14.3 L15.3 37.7" stroke="#C3C6C1" stroke-width="1.6"/>
    <circle cx="27" cy="26" r="4" fill="#C3C6C1"/>
    <path d="M53 10 H68 M53 16 H68 M53 22 H68 M53 28 H68 M53 34 H68 M53 40 H68" stroke="#C9CBC6" stroke-width="2.2"/>
  </g>
  <g id="kd-ok-z-izolator">
    <rect x="-1.6" y="-4" width="3.2" height="6" fill="${O.ocelTma}"/>
    <path d="M-7 -4 L7 -4 L5 -8 L6 -9.5 L-6 -9.5 L-5 -8 Z" fill="${O.porcelan}"/>
    <path d="M-5 -9.5 L5 -9.5 L3.6 -13 L-3.6 -13 Z" fill="${O.porcelan}"/>
    <path d="M1 -4 L7 -4 L5 -8 L6 -9.5 L3 -9.5 Z" fill="${O.porcelanStin}"/>
  </g>
  <clipPath id="kd-ok-z-holic"><rect x="84" y="1456" width="26" height="156" rx="4"/></clipPath>
  ${DEFS_ZADNI.join("")}
</defs>`;

/* ——— Okna sousedů ——— */
type Vnitrek = "zaluzie" | "zaves" | "zavesP" | "krajka" | "matne" | "tma" | "kytka";
/**
 * Jak okno v noci svítí. Sousedé svítí tlumeně a každý jinak, aby
 * nejjasnějším a nejteplejším místem obrazu zůstal krámek:
 *   teple     lampa v pokoji (teplý přechod shora dolů)
 *   roh, rohP lampa v rohu pokoje — svítí jen kus okna (vlevo / vpravo dole)
 *   zatazeno  zatažené závěsy prosvícené zezadu, uprostřed škvíra
 *   tv        modré světlo televize
 *   bile      zářivka (koupelna, chodba)
 */
type Svit = "teple" | "roh" | "rohP" | "zatazeno" | "tv" | "bile";
interface Okno {
  x: number;
  y: number;
  w: number;
  h: number;
  kridla?: number;
  ram?: number;
  ramBarva?: string;
  ramStin?: string;
  vnitrek?: Vnitrek[];
  parapet?: string | false;
  /** Kdy se v noci rozsvítí (0–1 v rozpětí sousedOd–sousedDo); bez prahu zůstane tmavé */
  noc?: number;
  svit?: Svit;
  /** Síla svitu (průhlednost 0,5–0,75) */
  sila?: number;
  /** Když v noci nesvítí: zatažené závěsy (jen v noci) */
  zatahnout?: boolean;
  /** Oblouk nahoře (okna v patře starého domu) */
  oblouk?: boolean;
  /** Co stojí před oknem v zadní vrstvě (zábradlí, květináče) — v noci se překreslí jako silueta přes svit */
  pred?: string;
  /** Díry ve svitu (d cesty, nepřekrývat) — tam stojí před oknem cizí kresba, třeba sloup lampy s cedulkou ulice */
  diry?: string;
}

/* <defs>, které nasbírají okna a strom při kreslení (každá vrstva má své) */
let DEFS_ZADNI: string[] = [];
let DEFS_SVETLA: string[] = [];

/** Okno souseda: den do zadní vrstvy, svit (pokud má) do svetla */
function okno(o: Okno) {
  const { x, y, w, h, kridla = 2, ram = 7, ramBarva = O.hlinik, ramStin = O.hlinikTma, vnitrek = ["tma"], parapet = O.hlinikSvetly } = o;
  const vx = x + ram;
  const vy = y + ram;
  const vw = w - 2 * ram;
  const vh = h - 2 * ram;
  const mezera = ram * 0.8;
  const tw = (vw - (kridla - 1) * mezera) / kridla;
  const r = o.oblouk ? w / 2 : 0;
  const obrys = (dx: number) =>
    `M${f(x + dx)} ${f(y + h - dx)} V${f(y + r)} A${f(r - dx)} ${f(r - dx)} 0 0 1 ${f(x + w - dx)} ${f(y + r)} V${f(y + h - dx)} Z`;
  let s = o.oblouk ? `<path d="${obrys(0)}" fill="${ramBarva}"/>` : obdelnik(x, y, w, h, `fill="${ramBarva}"`);
  s += obdelnik(x + w - 3, y + r * 0.6, 3, h - r * 0.6, `fill="${ramStin}"`);
  // sklo a co je za ním — tabulky po jedné
  const tabulky: Obdelnik[] = [];
  for (let i = 0; i < kridla; i++) tabulky.push({ x: vx + i * (tw + mezera), y: vy, w: tw, h: vh });
  const zavesD = (t: Obdelnik, druh: Vnitrek) => {
    const sw = t.w * 0.36;
    const zx = druh === "zaves" ? t.x : t.x + t.w - sw;
    return `M${f(zx)} ${f(t.y)} H${f(zx + sw)} C${f(zx + sw * 0.8)} ${f(t.y + t.h * 0.5)} ${f(zx + sw * 1.05)} ${f(t.y + t.h * 0.8)} ${f(zx + sw * 0.9)} ${f(t.y + t.h)} H${f(zx)} Z`;
  };
  const zaluzieDol = (t: Obdelnik, i: number) => t.h * (0.38 + ((i * 37 + x) % 30) / 100);
  const kytkaD = (t: Obdelnik, i: number) => chomac(t.x + t.w * 0.5, t.y + t.h - 14, t.w * 0.32, 16, 9, Math.round(x + i), 0.7, 0.6);
  let odlesky = "";
  let zatazeno = "";
  let vnitr = "";
  tabulky.forEach((t, i) => {
    const druh = vnitrek[i % vnitrek.length];
    vnitr += obdelnik(t.x, t.y, t.w, t.h, `fill="${druh === "matne" ? O.skloMatne : O.sklo}"`);
    if (druh === "zaluzie") {
      const dol = zaluzieDol(t, i);
      vnitr += obdelnik(t.x, t.y, t.w, dol, `fill="url(#kd-ok-z-zaluzie)"`) + obdelnik(t.x, t.y + dol - 3, t.w, 4, `fill="#A8A59D"`);
    } else if (druh === "zaves" || druh === "zavesP") {
      const sw = t.w * 0.36;
      const zx = druh === "zaves" ? t.x : t.x + t.w - sw;
      vnitr += `<path d="${zavesD(t, druh)}" fill="${O.zaves}"/>`;
      vnitr += `<path d="M${f(zx + sw * 0.33)} ${f(t.y)} V${f(t.y + t.h)} M${f(zx + sw * 0.66)} ${f(t.y)} V${f(t.y + t.h)}" stroke="${O.zavesStin}" stroke-width="2"/>`;
    } else if (druh === "krajka") {
      vnitr += obdelnik(t.x, t.y, t.w, t.h, `fill="${O.zaves}" opacity="0.55"`);
    } else if (druh === "kytka") {
      vnitr += `<path d="${kytkaD(t, i)}" fill="#5E7C5A"/>`;
    }
    // odlesk oblohy: šikmý pruh
    if (druh !== "matne")
      odlesky += cesta([
        [t.x, t.y + t.h * 0.62],
        [t.x + t.w * 0.62, t.y],
        [t.x + t.w * 0.86, t.y],
        [t.x, t.y + t.h * 0.94],
      ]);
    if (o.noc === undefined && o.zatahnout)
      zatazeno += obdelnik(t.x, t.y, t.w / 2 + 2, t.h, `fill="${O.zaves}"`) + obdelnik(t.x + t.w / 2 - 2, t.y, t.w / 2 + 2, t.h, `fill="${O.zavesStin}"`);
  });
  if (odlesky) vnitr += `<path d="${odlesky}" fill="${O.odlesk}" opacity="0.3"/>`;
  if (zatazeno) vnitr += jenNoc(zatazeno);
  if (o.oblouk) DEFS_ZADNI.push(`<clipPath id="kd-ok-z-oblouk-${f(x)}"><path d="${obrys(ram)}"/></clipPath>`);
  s += o.oblouk ? `<g clip-path="url(#kd-ok-z-oblouk-${f(x)})">${vnitr}</g>` : vnitr;
  // stín horní části rámu do skla (světlo shora)
  s += obdelnik(vx, vy, vw, 4, `fill="${O.stin}" opacity="0.12"`);
  if (parapet) s += obdelnik(x - 6, y + h, w + 12, 7, `fill="${parapet}"`) + obdelnik(x - 6, y + h + 7, w + 12, 3, `fill="${O.stin}" opacity="0.14"`);

  // ——— noční svit ———
  let noc = "";
  if (o.noc !== undefined) {
    const svit = o.svit ?? "teple";
    const prah = PRAH.sousedOd + (PRAH.sousedDo - PRAH.sousedOd) * o.noc;
    const plocha = (a: string) => (o.oblouk ? `<path d="${obrys(ram)}" ${a}/>` : obdelnik(vx, vy, vw, vh, a));
    let g = "";
    if (svit === "zatazeno") {
      // závěsy prosvícené zezadu: záhyby a světlá škvíra uprostřed
      g += plocha(`fill="url(#kd-ok-s-zatazeno)"`);
      const zahyby: string[] = [];
      for (let zx = vx + 9; zx < vx + vw - 4; zx += 15) zahyby.push(`M${f(zx)} ${f(vy)} V${f(vy + vh)}`);
      g += `<path d="${zahyby.join("")}" stroke="#A9662F" stroke-width="4" opacity="0.4"/>`;
      g += obdelnik(vx + vw * 0.5 - 3, vy, 6, vh, `fill="#FFE6B0" opacity="0.85"`);
    } else {
      g += plocha(`fill="url(#kd-ok-s-${svit})"`);
      if (svit === "tv") {
        // odlesk obrazovky a silueta opěradla gauče
        g += elipsa(vx + vw * 0.5, vy + vh * 0.62, vw * 0.36, vh * 0.2, `fill="#DCE8FF" opacity="0.3"`);
        g += `<path d="M${f(vx)} ${f(vy + vh)} V${f(vy + vh * 0.86)} Q${f(vx + vw * 0.08)} ${f(vy + vh * 0.8)} ${f(vx + vw * 0.3)} ${f(vy + vh * 0.82)} H${f(vx + vw * 0.7)} Q${f(vx + vw * 0.92)} ${f(vy + vh * 0.8)} ${f(vx + vw)} ${f(vy + vh * 0.86)} V${f(vy + vh)} Z" fill="#1C2140" opacity="0.75"/>`;
      }
      tabulky.forEach((t, i) => {
        const druh = vnitrek[i % vnitrek.length];
        if (druh === "zaves" || druh === "zavesP") g += `<path d="${zavesD(t, druh)}" fill="${svit === "tv" ? "#3E4E96" : "#C9803F"}" opacity="0.7"/>`;
        else if (druh === "zaluzie") g += obdelnik(t.x, t.y, t.w, zaluzieDol(t, i), `fill="url(#kd-ok-s-zaluzie)"`);
        else if (druh === "krajka") g += obdelnik(t.x, t.y, t.w, t.h, `fill="#FFF1D6" opacity="0.22"`);
        else if (druh === "kytka") g += `<path d="${kytkaD(t, i)}" fill="#2A2230" opacity="0.85"/>`;
        else if (druh === "matne") g += obdelnik(t.x, t.y, t.w, t.h, `fill="#FFFFFF" opacity="0.12"`);
      });
    }
    // příčky přes svit v noční barvě rámu
    const pricky: number[][] = [];
    for (let i = 1; i < kridla; i++) pricky.push([vx + i * (tw + mezera) - mezera, vy, mezera, vh]);
    g += obdelniky(pricky, `fill="${nocni(ramBarva.slice(1))}"`);
    // svit jen ve skle; sloupy lamp před oknem z něj vyříznout
    const id = `kd-ok-s-okno-${f(x)}-${f(y)}`;
    let orez = o.oblouk ? obrys(ram) : `M${f(vx)} ${f(vy)}h${f(vw)}v${f(vh)}h${f(-vw)}Z`;
    orez += o.diry ?? "";
    DEFS_SVETLA.push(`<clipPath id="${id}"><path d="${orez}" clip-rule="evenodd"/></clipPath>`);
    // dráty, které vedou před oknem, a věci v zadní vrstvě před ním — jako noční siluety přes svit
    const sklo: Obdelnik = { x: vx, y: vy, w: vw, h: vh };
    const pres = VSECHNY_DRATY.filter((v) => krizi(v.d, sklo))
      .map((v) => `<path d="${dratD(v.d)}" fill="none" stroke="${nocni(v.c.slice(1))}" stroke-width="${v.w}"/>`)
      .join("");
    noc = svetlo(prah, `<g clip-path="url(#${id})"><g opacity="${o.sila ?? 0.66}">${g}</g>${o.pred ? doNoci(o.pred) : ""}${pres}</g>`, "krm-ok-okno");
  }
  return { den: s, svit: noc };
}

/* ——— L1: starý obchodní dům s měděným průčelím ——— */
function domL1() {
  const sv: string[] = [];
  let s = "";
  // průčelí: měděné plechy v patrech, omítka v přízemí
  s += obdelnik(0, 404, 517, 900, `fill="url(#kd-ok-z-med)"`);
  s += obdelnik(0, 1300, 517, 465, `fill="${O.l1Omitka}"`);
  // ozdobná atika: stupňovitý štít s erbem
  s += `<path d="M0 404 V378 H140 V360 H186 V340 H330 V360 H376 V378 H517 V404 Z" fill="${O.medSvetla}"/>`;
  s += `<path d="M0 378 H140 V360 H186 V340 H330 V360 H376 V378 H517 V384 H372 V366 H326 V346 H190 V366 H144 V384 H0 Z" fill="#DCE5E1"/>`;
  s += obdelnik(206, 352, 104, 44, `rx="3" fill="${O.medStin}"`);
  s += kruh(258, 374, 15, `fill="${O.medSvetla}"`) + kruh(258, 374, 11, `fill="${O.medStin}"`);
  s += `<path d="M248 369 H268 M248 374 H268 M248 379 H268" stroke="${O.medSvetla}" stroke-width="2.2"/>`;
  // římsa a zubořez pod ní
  s += obdelnik(-4, 402, 525, 18, `fill="#D3DCD8"`) + obdelnik(-4, 402, 525, 4, `fill="#E6ECE9"`);
  s += obdelnik(0, 420, 517, 10, `fill="${O.medTma}" opacity="0.45"`);
  s += obdelniky(Array.from({ length: 22 }, (_, i) => [8 + i * 23.5, 430, 12, 10]), `fill="${O.medSvetla}"`);
  // lizény po krajích a pásy mezi patry
  s += obdelnik(0, 430, 20, 870, `fill="${O.medStin}"`) + obdelnik(497, 430, 20, 870, `fill="${O.medStin}"`);
  s += obdelnik(0, 430, 4, 870, `fill="${O.medSvetla}" opacity="0.7"`) + obdelnik(497, 430, 4, 870, `fill="${O.medSvetla}" opacity="0.7"`);
  s += obdelnik(-4, 858, 525, 16, `fill="#D3DCD8"`) + obdelnik(0, 874, 517, 8, `fill="${O.medTma}" opacity="0.35"`);
  s += obdelnik(-4, 1284, 525, 22, `fill="#D3DCD8"`) + obdelnik(-4, 1284, 525, 4, `fill="#E6ECE9"`) + obdelnik(0, 1306, 517, 10, `fill="${O.medTma}" opacity="0.4"`);

  // 2. patro: dvě okna; vlevo prádlo na tyči, vpravo futon přes zábradlí
  const o3a = okno({ x: 52, y: 512, w: 160, h: 240, ram: 8, ramBarva: "#6E7B78", ramStin: "#56625F", vnitrek: ["krajka", "zaves"], noc: 0.35, svit: "teple", sila: 0.6, parapet: "#D3DCD8" });
  const o3b = okno({ x: 296, y: 512, w: 160, h: 240, ram: 8, ramBarva: "#6E7B78", ramStin: "#56625F", vnitrek: ["zavesP", "tma"], zatahnout: true, parapet: "#D3DCD8" });
  s += o3a.den + o3b.den;
  sv.push(o3a.svit);
  // zábradlí před pravým oknem
  s += obdelnik(290, 694, 172, 6, `fill="${O.ocelTma}"`);
  s += obdelniky(Array.from({ length: 12 }, (_, i) => [296 + i * 14.4, 700, 3, 58]), `fill="${O.ocelTma}"`);
  // prádlo (jen ve dne, ve větru)
  let pradlo = "";
  pradlo += obdelnik(30, 786, 220, 4, `rx="2" fill="#C9CDD0"`);
  pradlo += `<path d="M40 778 V792 M240 778 V792" stroke="${O.ocelTma}" stroke-width="3"/>`;
  // tričko, ručník, ponožky, košile
  const kus = (x: number, tvar: string, barva: string) => `<path transform="translate(${x} 790)" d="${tvar}" fill="${barva}"/>`;
  const TRICKO = "M-22 4 L-10 0 Q0 6 10 0 L22 4 L28 18 L18 22 L16 16 L16 54 L-16 54 L-16 16 L-18 22 L-28 18 Z";
  const RUCNIK = "M-16 0 H16 V66 H-16 Z";
  const PONOZKA = "M-4 0 H4 V22 Q4 28 10 30 L10 36 Q-2 38 -4 28 Z";
  pradlo += kus(72, TRICKO, "#8FB3D9") + kus(72, "M-16 30 H16 V36 H-16 Z", "#7097C2");
  pradlo += kus(122, RUCNIK, "#F3F1EA") + kus(122, "M-16 54 H16 V60 H-16 Z", "#E2A1A0");
  pradlo += kus(160, PONOZKA, "#E8E3D6") + kus(178, PONOZKA, "#E8E3D6");
  pradlo += kus(216, TRICKO, "#F0D58A");
  for (const hx of [72, 216]) pradlo += `<path d="M${hx - 12} 794 L${hx} 784 L${hx + 12} 794" stroke="#8E959B" stroke-width="1.6" fill="none"/>`;
  // futon přes zábradlí
  let futon = `<path d="M292 690 Q296 682 304 682 H452 Q460 682 462 690 L466 792 Q462 800 452 800 H302 Q292 800 290 792 Z" fill="#E9B6AE"/>`;
  futon += `<path d="M290 776 H466 V792 Q462 800 452 800 H302 Q292 800 290 792 Z" fill="#D99A93"/>`;
  futon += `<path d="M292 690 Q296 682 304 682 H452 Q460 682 462 690 V698 H292 Z" fill="#F4D5CF"/>`;
  futon += `<path d="${[[320, 724], [372, 742], [424, 722], [346, 764], [402, 768]].map(([x, y]) => kolecko(x, y, 7)).join("")}" fill="#F7E3DE"/>`;
  s += jenDen(vitr(pradlo) + vitr(futon));
  s += snih(obdelnik(-4, 396, 525, 8, `rx="4" fill="${O.snih}"`) + `<path d="M140 362 H186 V342 H330 V362 H376 V372 H326 V350 H190 V372 H140 Z" fill="${O.snih}"/>`);

  // 1. patro: tři okna s obloukem
  const okna2 = [
    okno({ x: 44, y: 958, w: 116, h: 236, kridla: 1, ram: 8, ramBarva: "#E2E7E4", ramStin: "#BFC8C4", vnitrek: ["zaves"], oblouk: true, noc: 0.2, svit: "roh", sila: 0.7, parapet: "#D3DCD8" }),
    okno({ x: 200, y: 958, w: 116, h: 236, kridla: 1, ram: 8, ramBarva: "#E2E7E4", ramStin: "#BFC8C4", vnitrek: ["tma"], oblouk: true, zatahnout: true, parapet: "#D3DCD8" }),
    okno({ x: 356, y: 958, w: 116, h: 236, kridla: 1, ram: 8, ramBarva: "#E2E7E4", ramStin: "#BFC8C4", vnitrek: ["kytka"], oblouk: true, noc: 0.62, svit: "tv", sila: 0.6, parapet: "#D3DCD8" }),
  ];
  for (const o of okna2) {
    s += o.den;
    if (o.svit) sv.push(o.svit);
  }
  // klimatizace na konzoli mezi okny a trubka v krytu
  s += `<use href="#kd-ok-z-klima" transform="translate(164 1210) scale(0.86)"/>`;
  s += `<path d="M168 1214 H160 V1180 H178" stroke="${O.trubka}" stroke-width="7" fill="none" stroke-linejoin="round"/>`;
  s += `<path d="M168 1258 L180 1272 M224 1258 L212 1272" stroke="${O.ocelTma}" stroke-width="3"/>`;
  s += snih(obdelnik(162, 1204, 68, 7, `rx="3" fill="${O.snih}"`));

  // přízemí: holič se staženou roletou
  s += obdelnik(116, 1320, 360, 70, `fill="#2F4A6E"`) + obdelnik(122, 1326, 348, 58, `fill="#ECE6D8"`);
  s += `<text x="232" y="1372" font-size="44" text-anchor="middle" fill="#2F4A6E" font-family="${PISMO.kanji}">理容</text>`;
  s += `<text x="384" y="1364" font-size="17" text-anchor="middle" letter-spacing="3" fill="#2F4A6E" font-family="${PISMO.nadpis}" font-weight="600">BARBER</text>`;
  s += obdelnik(334, 1372, 100, 4, `fill="#C4432B"`) + obdelnik(334, 1376, 100, 4, `fill="#2F4A6E"`);
  s += obdelnik(140, 1394, 322, 30, `fill="#AEB4BA"`) + obdelnik(140, 1394, 322, 5, `fill="#CDD2D6"`);
  s += obdelnik(150, 1424, 302, 341, `fill="url(#kd-ok-z-roleta)"`);
  s += obdelnik(150, 1424, 302, 6, `fill="${O.stin}" opacity="0.2"`);
  s += obdelnik(150, 1746, 302, 19, `fill="#8E959C"`) + obdelnik(288, 1736, 26, 8, `rx="2" fill="#6E757C"`);
  s += obdelnik(144, 1424, 6, 341, `fill="#9AA1A8"`) + obdelnik(452, 1424, 6, 341, `fill="#9AA1A8"`);
  // lísteček na roletě
  s += `<g transform="rotate(-2.5 300 1560)">${obdelnik(262, 1540, 76, 34, `fill="#F7F5EF"`)}${obdelnik(262, 1540, 12, 6, `fill="#E8E0C4" opacity="0.9"`)}${obdelnik(326, 1540, 12, 6, `fill="#E8E0C4" opacity="0.9"`)}<text x="300" y="1564" font-size="15" text-anchor="middle" fill="#3A3330" font-family="${PISMO.kanji}">本日休業</text></g>`;
  // točící se tyč holičů (サインポール)
  s += obdelnik(108, 1478, 14, 8, `fill="${O.ocelTma}"`) + obdelnik(108, 1584, 14, 8, `fill="${O.ocelTma}"`);
  s += `<path d="M82 1456 Q82 1436 97 1434 Q112 1436 112 1456 Z" fill="#F2F2EE"/>`;
  s += obdelnik(84, 1456, 26, 156, `rx="4" fill="#F6F6F2"`);
  s += `<g clip-path="url(#kd-ok-z-holic)">${Array.from({ length: 7 }, (_, i) => {
    const y0 = 1440 + i * 30;
    return `<path d="M80 ${y0 + 18} L114 ${y0} L114 ${y0 + 9} L80 ${y0 + 27} Z" fill="${i % 2 ? "#2F5EA8" : "#D23A30"}"/>`;
  }).join("")}</g>`;
  s += obdelnik(86, 1456, 5, 156, `fill="#FFFFFF" opacity="0.5"`);
  s += `<path d="M82 1612 H112 V1622 Q97 1630 82 1622 Z" fill="#E4E4DF"/>`;
  // hasicí přístroj v červené skříňce (消火器)
  s += obdelnik(18, 1612, 44, 92, `rx="3" fill="#C8322A"`) + obdelnik(18, 1612, 44, 6, `rx="3" fill="#E0594C"`);
  s += svisle(40, 1640, "消火器", 13, `fill="#FFFFFF" font-family="${PISMO.kanji}"`, 1.15);
  // sokl
  s += obdelnik(0, 1712, 150, 53, `fill="#8C9894"`) + obdelnik(458, 1712, 59, 53, `fill="#8C9894"`);
  s += obdelnik(0, 1712, 150, 4, `fill="#A6B1AD"`) + obdelnik(458, 1712, 59, 4, `fill="#A6B1AD"`);
  // svod vpravo
  s += obdelnik(482, 430, 9, 1335, `fill="#A3ABA8"`) + obdelnik(482, 430, 3, 1335, `fill="#C2C9C6"`);
  return { den: s, svit: sv };
}

/* ——— L2: čtyřpatrový dům s kachlíky, kavárna v 1. patře ——— */
function domL2() {
  const sv: string[] = [];
  let s = "";
  const x0 = 515;
  const x1 = 1094;
  s += obdelnik(x0, 150, x1 - x0, 1615, `fill="url(#kd-ok-z-kachle)"`);
  // přízemí hladká omítka (vývěska na ni přijde z prizemi.ts)
  s += obdelnik(x0, 1314, x1 - x0, 451, `fill="${O.l2}"`);
  // lizény na rozích a pásy mezi patry
  s += obdelnik(x0, 152, 28, 1150, `fill="${O.l2Svetly}"`) + obdelnik(x0 + 25, 152, 3, 1150, `fill="${O.l2Stin}"`);
  s += obdelnik(1062, 152, 30, 1150, `fill="${O.l2Svetly}"`) + obdelnik(1089, 152, 3, 1150, `fill="${O.l2Stin}"`);
  for (const y of [536, 916, 1296]) {
    s += obdelnik(x0 - 2, y, x1 - x0 + 2, 18, `fill="${O.l2Svetly}"`) + obdelnik(x0 - 2, y, x1 - x0 + 2, 3, `fill="#E6E4E7"`);
    s += obdelnik(x0, y + 18, x1 - x0, 9, `fill="${O.l2Tma}" opacity="0.3"`);
  }
  // atika s oplechováním
  s += obdelnik(x0 - 4, 140, x1 - x0 + 4, 13, `fill="#DCDBDF"`) + obdelnik(x0 - 4, 153, x1 - x0 + 4, 5, `fill="${O.l2Tma}" opacity="0.55"`);

  // 3. patro (nejvyšší)
  const w4a = okno({ x: 582, y: 256, w: 206, h: 196, vnitrek: ["zaluzie", "zaluzie"], noc: 0.5, svit: "teple", sila: 0.58 });
  const w4b = okno({ x: 840, y: 256, w: 170, h: 196, vnitrek: ["zaves", "tma"], noc: 0.86, svit: "zatazeno", sila: 0.62 });
  s += w4a.den + w4b.den;
  sv.push(w4a.svit, w4b.svit);
  s += `<use href="#kd-ok-z-klima" transform="translate(700 468)"/>`;
  s += `<path d="M700 488 H684 V462" stroke="${O.trubka}" stroke-width="7" fill="none" stroke-linejoin="round"/>`;
  s += `<path d="M708 522 L720 534 M768 522 L756 534" stroke="${O.ocelTma}" stroke-width="3"/>`;
  // úchyt přípojky
  s += obdelnik(866, 548, 12, 6, `fill="${O.ocelTma}"`) + kruh(872, 552, 3.5, `fill="${O.porcelan}"`);

  // 2. patro: balkon s prádlem a kytkami, malé matné okno
  // věci na balkoně a zábradlí stojí před dveřmi — v noci z nich jsou siluety přes svit
  const kytkyBalkon =
    `<path d="${chomac(600, 846, 26, 22, 10, 2301, 0.7)}" fill="${O.listTma}"/><path d="${chomac(596, 838, 16, 14, 9, 2302, 0.7)}" fill="${O.list}"/>` +
    `<path d="${chomac(648, 852, 20, 16, 9, 2303, 0.7)}" fill="${O.list}"/>` +
    obdelnik(582, 862, 34, 26, `fill="#B8643E"`) +
    obdelnik(632, 866, 30, 22, `fill="#5E6E8E"`);
  const zabradliB =
    obdelnik(566, 806, 248, 8, `fill="${O.hlinik}"`) +
    obdelnik(566, 806, 248, 2.5, `fill="${O.hlinikSvetly}"`) +
    obdelniky(Array.from({ length: 21 }, (_, i) => [570 + i * 11.8, 814, 3, 74]), `fill="${O.hlinikTma}"`) +
    obdelnik(566, 884, 248, 5, `fill="${O.hlinik}"`);
  const lampa = MISTA.lampaSloup;
  const dvereB = okno({
    x: 588, y: 636, w: 204, h: 252, vnitrek: ["krajka", "zavesP"], noc: 0.3, svit: "rohP", sila: 0.66, parapet: false,
    pred: `${obdelnik(728, 834, 76, 54, `rx="3" fill="${O.klima}"`)}${kytkyBalkon}${zabradliB}`,
    diry: `M${lampa.x - 3} ${lampa.y - 4}V881H${lampa.x + lampa.w + 3}V${lampa.y - 4}Z`,
  });
  const w3b = okno({ x: 846, y: 650, w: 78, h: 150, kridla: 1, vnitrek: ["matne"], noc: 0.6, svit: "bile", sila: 0.5 });
  s += dvereB.den + w3b.den;
  sv.push(dvereB.svit, w3b.svit);
  // na balkoně: klimatizace, kytky, prádlo
  s += `<use href="#kd-ok-z-klima" transform="translate(728 834)"/>`;
  s += kytkyBalkon;
  let pradlo2 = obdelnik(596, 686, 194, 4, `rx="2" fill="#C9CDD0"`);
  pradlo2 += `<path transform="translate(630 690)" d="M-20 0 H20 V58 H-20 Z" fill="#F2EEE4"/><path transform="translate(630 690)" d="M-20 46 H20 V52 H-20 Z" fill="#9EB9D6"/>`;
  pradlo2 += `<path transform="translate(686 690)" d="M-24 4 L-11 0 Q0 7 11 0 L24 4 L30 20 L19 24 L17 18 L17 64 L-17 64 L-17 18 L-19 24 L-30 20 Z" fill="#C9DDB5"/>`;
  pradlo2 += `<path transform="translate(744 690)" d="M-16 0 H16 V40 L8 40 L4 18 L0 40 L-8 40 L-16 40 Z" fill="#7A8DA8"/>`;
  s += jenDen(vitr(pradlo2));
  // zábradlí balkonu a deska
  s += zabradliB;
  s += obdelnik(560, 889, 260, 22, `fill="${O.l2Svetly}"`) + obdelnik(560, 911, 260, 7, `fill="${O.l2Tma}" opacity="0.35"`);
  s += snih(obdelnik(562, 800, 256, 7, `rx="3" fill="${O.snih}"`) + obdelnik(726, 828, 80, 7, `rx="3" fill="${O.snih}"`) + obdelnik(698, 462, 80, 7, `rx="3" fill="${O.snih}"`));

  // 1. patro: kavárna 喫茶 — okno s kavárenskou záclonkou, truhlík, svislá cedule
  // před oknem stojí sloup pouliční lampy s cedulkou ulice (cedule.ts) — ze svitu se vyříznou
  const ls = MISTA.lampaSloup;
  const DIRA_LAMPA_KAVARNA = `M${ls.x - 3} 1005V1144H${ls.x - 10}V1227H${ls.x + ls.w + 12}V1144H${ls.x + ls.w + 3}V1005Z`;
  const kavarna = okno({ x: 628, y: 996, w: 280, h: 240, kridla: 3, ram: 9, ramBarva: "#6B5A4D", ramStin: "#544539", vnitrek: ["tma", "tma", "tma"], noc: 0.03, svit: "teple", sila: 0.64, parapet: false, diry: DIRA_LAMPA_KAVARNA });
  s += kavarna.den;
  sv.push(kavarna.svit);
  // záclonka do půlky okna a zlatý nápis na skle
  for (let i = 0; i < 3; i++) {
    const tx = 637 + i * 89.6;
    s += `<path d="M${f(tx)} 1130 H${f(tx + 82)} V1218 Q${f(tx + 72)} 1226 ${f(tx + 62)} 1218 Q${f(tx + 52)} 1226 ${f(tx + 41)} 1218 Q${f(tx + 30)} 1226 ${f(tx + 20)} 1218 Q${f(tx + 10)} 1226 ${f(tx)} 1218 Z" fill="#F2EFE8"/>`;
  }
  s += obdelnik(636, 1126, 264, 4, `fill="#A3896A"`);
  // závěsné lampy v krajních tabulkách, zlatý nápis vlevo a hrnek vpravo
  // (prostřední tabulku kříží sloup pouliční lampy, tak tam nic není)
  const hrnek = (barva: string) =>
    `<path d="M846 1078 H870 V1090 Q870 1102 858 1102 Q846 1102 846 1090 Z" fill="${barva}"/><path d="M870 1082 Q878 1082 878 1089 Q878 1096 869 1096" stroke="${barva}" stroke-width="2.4" fill="none"/><path d="M842 1106 H874" stroke="${barva}" stroke-width="2.4" stroke-linecap="round"/><path d="M853 1072 Q849 1066 853 1060 M862 1072 Q858 1066 862 1060" stroke="${barva}" stroke-width="2" fill="none" opacity="0.8"/>`;
  s += `<path d="M678 1005 V1026 M858 1005 V1026" stroke="#3E3633" stroke-width="1.4"/>`;
  s += `<path d="M668 1026 H688 L684 1035 H672 Z M848 1026 H868 L864 1035 H852 Z" fill="#3E3633"/>`;
  s += `<text x="678" y="1098" font-size="15" text-anchor="middle" letter-spacing="1.5" fill="#D9B36A" font-family="${PISMO.nadpis}" font-weight="600">COFFEE</text>`;
  s += hrnek("#D9B36A");
  // v noci: záclonky prosvícené, lampy svítí (rozsvítí se spolu s oknem)
  sv.push(
    svetlo(
      PRAH.sousedOd + (PRAH.sousedDo - PRAH.sousedOd) * 0.03,
      `<g opacity="0.7" clip-path="url(#kd-ok-s-okno-628-996)">${[0, 1, 2]
        .map((i) => {
          const tx = 637 + i * 89.6;
          return `<path d="M${f(tx)} 1130 H${f(tx + 82)} V1218 Q${f(tx + 72)} 1226 ${f(tx + 62)} 1218 Q${f(tx + 52)} 1226 ${f(tx + 41)} 1218 Q${f(tx + 30)} 1226 ${f(tx + 20)} 1218 Q${f(tx + 10)} 1226 ${f(tx)} 1218 Z" fill="#F6D9A8" opacity="0.4"/>`;
        })
        .join("")}${elipsa(678, 1038, 12, 6, `fill="#FFF3C8"`)}${elipsa(858, 1038, 12, 6, `fill="#FFF3C8"`)}<text x="678" y="1098" font-size="15" text-anchor="middle" letter-spacing="1.5" fill="#8A5A2A" font-family="${PISMO.nadpis}" font-weight="600">COFFEE</text>${hrnek("#8A5A2A")}</g>`,
      "krm-ok-okno",
    ),
  );
  // truhlík s muškáty
  s += obdelnik(622, 1238, 292, 24, `fill="#5E4A3A"`) + obdelnik(622, 1238, 292, 4, `fill="#7A624F"`);
  s += `<path d="${chomac(670, 1232, 44, 14, 12, 2311, 0.6)}" fill="${O.list}"/><path d="${chomac(770, 1230, 52, 15, 13, 2312, 0.6)}" fill="${O.listTma}"/><path d="${chomac(866, 1232, 44, 14, 12, 2313, 0.6)}" fill="${O.list}"/>`;
  s += `<path d="${[[650, 1222], [676, 1218], [702, 1226], [744, 1216], [772, 1222], [800, 1214], [842, 1222], [868, 1216], [892, 1224]].map(([x, y]) => kolecko(x, y, 6)).join("")}" fill="#D2453A"/>`;
  s += snih(obdelnik(620, 1232, 296, 7, `rx="3" fill="${O.snih}"`));
  // svislá cedule kavárny (podsvícená skříňka)
  s += obdelnik(550, 952, 54, 304, `rx="4" fill="#5E4636"`);
  s += obdelnik(556, 958, 42, 292, `rx="2" fill="#F1E7D0"`);
  const ceduleText = (barva: string) =>
    svisle(577, 998, "喫茶", 31, `fill="${barva}" font-family="${PISMO.kanji}"`, 1.12) +
    `<path d="M565 1074 H589 V1084 Q589 1098 577 1098 Q565 1098 565 1084 Z" fill="${barva}"/><path d="M589 1078 Q597 1078 597 1085 Q597 1092 588 1092" stroke="${barva}" stroke-width="2.6" fill="none"/>` +
    `<path d="M571 1068 Q567 1062 571 1056 Q575 1050 571 1044 M582 1068 Q578 1062 582 1056 Q586 1050 582 1044" stroke="${barva}" stroke-width="2" fill="none" opacity="0.7"/>` +
    svisle(577, 1136, "珈琲", 22, `fill="#9A3220" font-family="${PISMO.kanji}"`, 1.1) +
    `<text x="577" y="1232" font-size="19" text-anchor="middle" fill="${barva}" font-family="${PISMO.nadpis}" font-weight="600">2F</text>`;
  s += ceduleText("#4A3426");
  s += snih(obdelnik(548, 946, 58, 8, `rx="4" fill="${O.snih}"`));
  sv.push(
    svetlo(
      PRAH.sousedOd + 0.06,
      `${elipsa(577, 1104, 64, 180, `fill="url(#kd-ok-s-haloT)" opacity="0.6"`)}${obdelnik(556, 958, 42, 292, `rx="2" fill="#F6E6C2"`)}${ceduleText("#5A3A26")}`,
      "krm-ok-cedule",
    ),
  );
  // svod a trubky u krámku (z velké části za svislou cedulí krámku)
  s += obdelnik(1066, 158, 9, 1607, `fill="#ABAFB4"`) + obdelnik(1066, 158, 3, 1607, `fill="#C7CACE"`);
  s += obdelniky([158, 520, 900, 1280, 1640].map((y) => [1063, y, 15, 6]), `fill="#8E9398"`);

  // přízemí: okno s mříží, elektroměr, sokl
  s += obdelnik(x0, 1690, x1 - x0, 75, `fill="#A3A0A8"`) + obdelnik(x0, 1690, x1 - x0, 4, `fill="#BDBAC1"`);
  const mriz = okno({ x: 782, y: 1388, w: 142, h: 176, kridla: 2, vnitrek: ["matne", "matne"] });
  s += mriz.den;
  sv.push(mriz.svit);
  s += obdelniky(Array.from({ length: 10 }, (_, i) => [788 + i * 14, 1384, 4, 186]), `fill="${O.hlinikTma}"`);
  s += obdelnik(782, 1440, 142, 4, `fill="${O.hlinikTma}"`) + obdelnik(782, 1512, 142, 4, `fill="${O.hlinikTma}"`);
  s += obdelnik(1002, 1418, 44, 62, `rx="3" fill="#C9CCCF"`) + kruh(1024, 1442, 13, `fill="#E8ECEE"`) + cara(1016, 1442, 1032, 1442, `stroke="#2E2D33" stroke-width="2"`);
  s += obdelnik(1020, 1318, 6, 100, `fill="#9EA3A8"`);

  // střecha: nádrž na vodu, strojovna schodiště, antény
  // nádrž (panelová, na ocelovém rámu)
  s += `<path d="M612 150 V112 M700 150 V112 M788 150 V112 M612 140 L700 116 L788 140 M612 116 L700 140 L788 116" stroke="${O.ocel}" stroke-width="5" fill="none"/>`;
  s += obdelnik(604, 108, 192, 8, `fill="${O.ocelTma}"`);
  s += obdelnik(600, 38, 200, 72, `fill="#D3DCE2"`);
  s += `<path d="M625 38 V110 M650 38 V110 M675 38 V110 M700 38 V110 M725 38 V110 M750 38 V110 M775 38 V110 M600 62 H800 M600 86 H800" stroke="#B5C2CB" stroke-width="2"/>`;
  s += obdelnik(784, 38, 16, 72, `fill="#B9C5CE"`);
  s += obdelnik(596, 32, 208, 8, `rx="2" fill="#C3CDD4"`) + obdelnik(640, 24, 34, 9, `fill="#B3BEC6"`);
  s += obdelnik(756, 14, 6, 20, `fill="#9BA6AF"`) + `<path d="M748 16 Q759 4 770 16 Z" fill="#9BA6AF"/>`;
  s += `<path d="M806 40 V150 M818 40 V150 M806 56 H818 M806 74 H818 M806 92 H818 M806 110 H818 M806 128 H818" stroke="${O.ocel}" stroke-width="2.6"/>`;
  // strojovna schodiště (塔屋)
  s += obdelnik(846, 86, 92, 66, `fill="${O.l2Svetly}"`) + obdelnik(842, 80, 100, 9, `fill="#DCDBDF"`) + obdelnik(910, 89, 28, 63, `fill="${O.l2Stin}" opacity="0.5"`);
  s += obdelnik(862, 104, 30, 48, `fill="#9AA3AD"`) + kruh(886, 130, 2, `fill="#5F666C"`);
  // anténa (rybí kost) a satelit
  s += obdelnik(966, 8, 4, 145, `fill="${O.ocel}"`);
  s += `<path d="M922 30 H1020 M930 20 V40 M944 18 V42 M958 17 V43 M982 18 V42 M996 20 V40 M1010 22 V38 M940 72 H1000 M948 64 V80 M962 63 V81 M980 64 V80 M994 66 V78" stroke="${O.ocel}" stroke-width="2.4"/>`;
  s += obdelnik(1036, 122, 4, 30, `fill="${O.ocel}"`);
  s += `<ellipse cx="1038" cy="116" rx="15" ry="18" transform="rotate(-28 1038 116)" fill="#E3E6E9"/><ellipse cx="1041" cy="117" rx="9" ry="12" transform="rotate(-28 1041 117)" fill="#CDD2D6"/>`;
  s += cara(1030, 108, 1018, 130, `stroke="${O.ocel}" stroke-width="2"`) + kruh(1017, 132, 3.5, `fill="#8E959B"`);
  s += snih(obdelnik(x0 - 6, 134, x1 - x0 + 8, 8, `rx="4" fill="${O.snih}"`) + obdelnik(594, 26, 212, 8, `rx="4" fill="${O.snih}"`) + obdelnik(840, 74, 104, 8, `rx="4" fill="${O.snih}"`));
  return { den: s, svit: sv };
}

/* ——— R1: dvoupatrový dřevěný dům s taškami ——— */
/** Pravý konec R1 — hřeben s oni-gawarou končí před pravým sloupem, aby byla vidět */
const R1_KONEC = 2734;
function domR1() {
  const sv: string[] = [];
  let s = "";
  const x0 = 2106;
  const x1 = R1_KONEC;
  // zeď patra: vlnitý plech; přízemí: omítka a prkna
  s += obdelnik(x0, 650, x1 - x0, 600, `fill="url(#kd-ok-z-vlnity)"`);
  s += obdelnik(x0, 946, x1 - x0, 4, `fill="${O.plechTma}"`) + obdelnik(x0, 950, x1 - x0, 2, `fill="${O.plechSvetly}"`);
  s += obdelnik(x0, 1290, x1 - x0, 270, `fill="${O.r1Omitka}"`);
  s += obdelnik(x0, 1560, x1 - x0, 205, `fill="url(#kd-ok-z-prkna)"`);
  s += obdelnik(x0, 1556, x1 - x0, 6, `fill="${O.drevoSede}"`);
  s += obdelnik(x0, 1745, x1 - x0, 20, `fill="${O.drevoSedeTma}"`);
  // pravý roh domu (nároží) ve stínu
  s += obdelnik(x1 - 8, 650, 8, 1115, `fill="${O.plechTma}" opacity="0.6"`);

  // střecha: hřeben, tašky, čela tašek, okap
  s += obdelnik(x0, 594, x1 - x0 + 14, 58, `fill="url(#kd-ok-z-kawara)"`);
  s += obdelnik(x0, 596, x1 - x0 + 14, 7, `fill="${O.kawaraTma}" opacity="0.6"`);
  s += obdelnik(x0, 584, x1 - x0 - 6, 12, `fill="#5A6370"`) + obdelnik(x0, 589, x1 - x0 - 6, 2, `fill="#4A525E"`);
  s += obdelnik(x0, 594, x1 - x0 - 6, 4, `fill="#D8D7D2"`);
  s += obdelnik(x0, 574, x1 - x0 - 6, 12, `rx="5" fill="#6E7784"`) + obdelnik(x0 + 2, 575, x1 - x0 - 10, 3, `fill="#97A1AD"`);
  // oni-gawara na konci hřebene
  const ox = x1 - 24;
  s += `<path d="M${ox - 20} 600 V572 Q${ox - 20} 552 ${ox} 548 Q${ox + 20} 552 ${ox + 20} 572 V600 Z" fill="#66707D"/>`;
  s += `<path d="M${ox - 24} 566 Q${ox - 28} 552 ${ox - 18} 546 Q${ox - 20} 556 ${ox - 14} 562 Z M${ox + 24} 566 Q${ox + 28} 552 ${ox + 18} 546 Q${ox + 20} 556 ${ox + 14} 562 Z" fill="#66707D"/>`;
  s += `<path d="M${ox - 16} 598 V574 Q${ox - 16} 558 ${ox} 554 Q${ox + 16} 558 ${ox + 16} 574 V598" stroke="#8F99A5" stroke-width="2.4" fill="none"/>`;
  s += kruh(ox, 578, 7, `fill="#8F99A5"`) + kruh(ox, 578, 3.5, `fill="#59626F"`);
  // čela tašek: pás plochých a kolečka kulatých
  s += obdelnik(x0, 646, x1 - x0 + 16, 12, `fill="#5B6471"`);
  const cela: string[] = [];
  const tecky: string[] = [];
  for (let x = x0 + 12; x < x1 + 16; x += 24) {
    cela.push(kolecko(x, 652, 8.5));
    tecky.push(kolecko(x, 652, 3));
  }
  s += `<path d="${cela.join("")}" fill="#727C89"/><path d="${tecky.join("")}" fill="#59626F"/>`;
  // okapový žlab a podhled ve stínu
  s += obdelnik(x0, 660, x1 - x0 + 18, 10, `rx="5" fill="#B5BCC2"`) + obdelnik(x0, 661, x1 - x0 + 18, 3, `fill="#D9DEE2"`);
  s += obdelnik(x0, 670, x1 - x0, 26, `fill="#4E535C" opacity="0.32"`);
  s += snih(
    `<path d="M${x0} 586 H${x1 + 18} V600 C${x1 - 100} 606 ${x1 - 300} 602 ${x0 + 300} 607 C${x0 + 160} 609 ${x0 + 60} 604 ${x0} 606 Z" fill="${O.snih}"/>` +
      obdelnik(x0, 568, x1 - x0 - 6, 9, `rx="4" fill="${O.snih}"`) +
      `<path d="M${ox - 20} 556 Q${ox} 538 ${ox + 20} 556 Z" fill="${O.snih}"/>` +
      `<path d="M${x0} 640 H${x1 + 18} V650 C${x1 - 200} 654 ${x0 + 200} 652 ${x0} 652 Z" fill="${O.snih}"/>`,
  );

  // patro: okno s rohoží sudare, okno s kytkami, klimatizace, elektroměr
  const w1 = okno({ x: 2290, y: 770, w: 162, h: 190, ram: 8, ramBarva: O.drevoSede, ramStin: O.drevoSedeTma, vnitrek: ["tma", "tma"], parapet: "#9A9693" });
  s += w1.den;
  s += obdelnik(2298, 778, 146, 120, `fill="url(#kd-ok-z-sudare)"`) + obdelnik(2296, 896, 150, 5, `rx="2" fill="#8E7A52"`);
  s += `<path d="M2322 778 V902 M2420 778 V902" stroke="#7A6A4C" stroke-width="1.6"/>`;
  s += jenNoc(obdelnik(2298, 898, 146, 54, `fill="url(#kd-ok-z-sudare)"`));
  // svit za rohoží — pruhy přes světlo, uprostřed příčka
  sv.push(
    svetlo(
      PRAH.sousedOd + (PRAH.sousedDo - PRAH.sousedOd) * 0.25,
      `<g opacity="0.66">${obdelnik(2298, 778, 146, 174, `fill="url(#kd-ok-s-roh)"`)}${obdelnik(2298, 778, 146, 174, `fill="url(#kd-ok-s-sudare)"`)}${obdelnik(2369, 778, 6, 174, `fill="${nocni(O.drevoSede.slice(1))}"`)}</g>`,
      "krm-ok-okno",
    ),
  );
  // květináčky na parapetu (stojí před sklem — v noci silueta přes svit)
  const kvetinacky =
    obdelniky([[2562, 944, 22, 18], [2600, 946, 18, 16], [2664, 944, 22, 18]], `fill="#B8643E"`) +
    `<path d="${chomac(2573, 938, 14, 10, 8, 2401, 0.7)}${chomac(2609, 941, 11, 8, 8, 2402, 0.7)}${chomac(2675, 937, 14, 11, 8, 2403, 0.7)}" fill="${O.list}"/>` +
    `<path d="${kolecko(2570, 932, 4)}${kolecko(2680, 930, 4)}" fill="#E4A0B4"/>`;
  const w2 = okno({ x: 2552, y: 770, w: 150, h: 190, ram: 8, ramBarva: O.drevoSede, ramStin: O.drevoSedeTma, vnitrek: ["krajka", "kytka"], noc: 0.78, svit: "rohP", sila: 0.55, parapet: "#9A9693", pred: kvetinacky });
  s += w2.den;
  sv.push(w2.svit);
  s += kvetinacky;
  // klimatizace s trubkou ke zdi
  s += `<use href="#kd-ok-z-klima" transform="translate(2466 984)"/>`;
  s += `<path d="M2466 1004 H2458 V970" stroke="${O.trubka}" stroke-width="7" fill="none" stroke-linejoin="round"/>`;
  s += `<path d="M2474 1038 L2486 1050 M2534 1038 L2522 1050" stroke="${O.ocelTma}" stroke-width="3"/>`;
  // přípojka a elektroměr
  s += obdelnik(2594, 684, 12, 6, `fill="${O.ocelTma}"`) + kruh(2600, 688, 3.5, `fill="${O.porcelan}"`);
  s += obdelnik(2598, 690, 5, 300, `fill="#8E959B"`);
  s += obdelnik(2584, 988, 34, 52, `rx="3" fill="#C9CCCF"`) + kruh(2601, 1008, 10, `fill="#E8ECEE"`) + cara(2595, 1008, 2607, 1008, `stroke="#2E2D33" stroke-width="2"`);
  s += snih(obdelnik(2464, 978, 80, 7, `rx="3" fill="${O.snih}"`) + obdelnik(2284, 958, 174, 6, `rx="3" fill="${O.snih}"`) + obdelnik(2546, 958, 162, 6, `rx="3" fill="${O.snih}"`));

  // přístřešek nad přízemím (下屋) z tašek
  s += obdelnik(x0, 1238, x1 - x0 + 14, 50, `fill="url(#kd-ok-z-kawara)"`);
  s += obdelnik(x0, 1234, x1 - x0 + 6, 9, `fill="#8C939B"`);
  s += obdelnik(x0, 1282, x1 - x0 + 16, 11, `fill="#5B6471"`);
  const cela2: string[] = [];
  for (let x = x0 + 12; x < x1 + 16; x += 24) cela2.push(kolecko(x, 1287, 7.5));
  s += `<path d="${cela2.join("")}" fill="#727C89"/>`;
  s += obdelnik(x0, 1294, x1 - x0, 34, `fill="#4E535C" opacity="0.28"`);
  s += snih(`<path d="M${x0} 1232 H${x1 + 16} V1250 C${x1 - 200} 1256 ${x0 + 260} 1252 ${x0} 1256 Z" fill="${O.snih}"/>`);

  // přízemí: plynoměr se žlutými trubkami, mřížové dveře 格子戸, lampička, jmenovka
  s += `<path d="M2458 1494 V1765 M2484 1430 V1380 H2440" stroke="#D9B23A" stroke-width="7" fill="none" stroke-linejoin="round"/>`;
  s += obdelnik(2442, 1430, 54, 64, `rx="4" fill="#C7CCD0"`) + obdelnik(2452, 1442, 34, 18, `rx="2" fill="#E9EDEF"`) + obdelnik(2456, 1468, 26, 8, `fill="#3E4248"`);
  s += obdelnik(2452, 1520, 12, 6, `fill="#C8322A"`);
  const dx = 2550;
  const dw = 156;
  s += obdelnik(dx, 1412, dw, 353, `fill="#5A534E"`);
  s += obdelnik(dx + 8, 1420, dw - 16, 40, `fill="#DADDDE"`);
  const prickyNadsvetliku = Array.from({ length: 13 }, (_, i) => `M${dx + 14 + i * 10} 1420 V1460`).join(" ");
  s += `<path d="${prickyNadsvetliku}" stroke="#5A534E" stroke-width="2.4"/>`;
  s += obdelnik(dx + 8, 1468, 68, 289, `fill="#D5D9DB"`) + obdelnik(dx + 80, 1468, 68, 289, `fill="#D5D9DB"`);
  s += `<path d="${Array.from({ length: 15 }, (_, i) => `M${f(dx + 13 + i * 9.4)} 1468 V1757`).join(" ")}" stroke="#5A534E" stroke-width="3"/>`;
  s += obdelniky([[dx + 8, 1560, dw - 16, 5], [dx + 8, 1660, dw - 16, 5]], `fill="#5A534E"`);
  s += obdelnik(dx + 75, 1468, 6, 289, `fill="#47413D"`);
  s += obdelnik(dx + 8, 1468, dw - 16, 5, `fill="${O.stin}" opacity="0.18"`);
  // lampička nad dveřmi
  const lx = dx + dw / 2;
  s += obdelnik(lx - 11, 1372, 22, 6, `fill="#3E3A38"`) + obdelnik(lx - 9, 1378, 18, 26, `rx="2" fill="#EEF0F0"`) + obdelnik(lx - 11, 1402, 22, 5, `fill="#3E3A38"`);
  // jmenovka a zvonek
  s += obdelnik(2710, 1478, 18, 58, `fill="#B79B74"`) + svisle(2719, 1499, "鈴木", 14, `fill="#3A2E26" font-family="${PISMO.kanji}"`, 1.1);
  s += obdelnik(2711, 1550, 16, 22, `rx="2" fill="#E6E8E8"`) + kruh(2719, 1564, 3, `fill="#5F666C"`);
  // svod na levém kraji (u krámku)
  s += obdelnik(2112, 670, 8, 568, `fill="#A3ABB2"`) + obdelnik(2112, 1292, 8, 473, `fill="#A3ABB2"`) + obdelnik(2112, 670, 3, 1095, `fill="#C3CAD0"`);
  // stín střech krámku na sousedovi (světlo zleva shora)
  s += `<path d="M${x0} 572 L2192 572 L2262 652 L${x0} 652 Z" fill="${O.stin}" opacity="0.16"/>`;
  s += `<path d="M${x0} 1236 L2142 1236 L2214 1330 L${x0} 1330 Z" fill="${O.stin}" opacity="0.14"/>`;
  // noční svit: lampička nad dveřmi, kužel na dveře a prosvícený nadsvětlík
  sv.push(
    svetlo(
      0.42,
      `${elipsa(lx, 1392, 56, 46, `fill="url(#kd-ok-s-haloT)" opacity="0.7"`)}${obdelnik(lx - 9, 1378, 18, 26, `rx="2" fill="#FFF1C8"`)}<path d="M${lx - 30} 1404 L${lx + 30} 1404 L${lx + 96} 1765 L${lx - 96} 1765 Z" fill="url(#kd-ok-s-kuzel)"/>${obdelnik(dx + 8, 1420, dw - 16, 40, `fill="#F6C27A" opacity="0.5"`)}<path d="${prickyNadsvetliku}" stroke="${nocni("5A534E")}" stroke-width="2.4"/>`,
      "krm-ok-lampa",
    ),
  );
  return { den: s, svit: sv };
}

/* ——— R2: bytovka コーポさくら ——— */
function domR2() {
  const sv: string[] = [];
  let s = "";
  const x0 = R1_KONEC;
  const x1 = 3204;
  s += obdelnik(x0, 432, x1 - x0, 1333, `fill="url(#kd-ok-z-oblozeni)"`);
  s += obdelnik(x0 - 4, 420, x1 - x0 + 4, 14, `fill="${O.r2Svetly}"`) + obdelnik(x0, 434, x1 - x0, 8, `fill="${O.r2Tma}" opacity="0.45"`);
  s += obdelnik(x0, 432, 14, 1333, `fill="${O.r2Svetly}"`) + obdelnik(x0 + 12, 432, 3, 1333, `fill="${O.r2Stin}"`);
  // dvě patra balkonů: dveře, klimatizace, prádlo, zábradlí z mléčného skla
  const patra: { y: number; a?: [number, Svit, number]; b?: [number, Svit, number] }[] = [
    { y: 444, a: [0.12, "zatazeno", 0.6] },
    { y: 884, a: [0.4, "tv", 0.55], b: [0.95, "rohP", 0.62] },
  ];
  patra.forEach((p, k) => {
    const dno = p.y + 418;
    const zy = dno - 112;
    // zábradlí z mléčného skla stojí před spodkem dveří — v noci je to silueta přes svit
    const zabradliR =
      obdelnik(2762, zy, 442, 110, `fill="#E6EAED" opacity="0.8"`) +
      obdelnik(2762, zy - 6, 442, 8, `fill="${O.hlinik}"`) +
      obdelnik(2762, zy - 6, 442, 2.5, `fill="${O.hlinikSvetly}"`) +
      obdelniky([[2762, zy, 5, 110], [2974, zy - 60, 22, 172], [3200, zy, 5, 110]], `fill="#E2E4E6"`) +
      obdelnik(2992, zy - 60, 4, 172, `fill="${O.r2Stin}"`);
    const klimaX = k ? 3100 : 2870;
    const klimaSilueta = obdelnik(klimaX, dno - 56, 76, 54, `rx="3" fill="${O.klima}"`);
    // pravý elektrický sloup (se stupačkami) stojí před levým krajem dveří A
    const skloY = p.y + 117;
    const skloH = dno - p.y - 126;
    const dA = okno({
      x: 2786, y: p.y + 110, w: 164, h: dno - p.y - 112, vnitrek: k ? ["zaves", "krajka"] : ["krajka", "zavesP"],
      noc: p.a?.[0], svit: p.a?.[1], sila: p.a?.[2], zatahnout: !p.a, parapet: false,
      pred: (k ? "" : klimaSilueta) + zabradliR,
      diry: `M2793 ${skloY}V${skloY + skloH}H${f(SP + pulSloupu(skloY + skloH) + 15)}V${skloY}Z`,
    });
    const dB = okno({
      x: 3016, y: p.y + 110, w: 166, h: dno - p.y - 112, vnitrek: k ? ["tma", "zavesP"] : ["zaves", "tma"],
      noc: p.b?.[0], svit: p.b?.[1], sila: p.b?.[2], zatahnout: !p.b, parapet: false,
      pred: (k ? klimaSilueta : "") + zabradliR,
    });
    s += dA.den + dB.den;
    sv.push(dA.svit, dB.svit);
    s += `<use href="#kd-ok-z-klima" transform="translate(${klimaX} ${dno - 56})"/>`;
    if (k === 0) {
      // prádlo na tyči
      let pr = obdelnik(2776, p.y + 150, 184, 4, `rx="2" fill="#C9CDD0"`);
      pr += `<path transform="translate(2812 ${p.y + 154})" d="M-22 4 L-10 0 Q0 6 10 0 L22 4 L28 18 L18 22 L16 16 L16 56 L-16 56 L-16 16 L-18 22 L-28 18 Z" fill="#F4C9A8"/>`;
      pr += `<path transform="translate(2866 ${p.y + 154})" d="M-16 0 H16 V70 H-16 Z" fill="#B9D3E8"/>`;
      pr += `<path transform="translate(2916 ${p.y + 154})" d="M-22 4 L-10 0 Q0 6 10 0 L22 4 L28 18 L18 22 L16 16 L16 56 L-16 56 L-16 16 L-18 22 L-28 18 Z" fill="#E8E4D8"/>`;
      s += jenDen(vitr(pr));
    } else {
      // kytky na balkoně
      s += `<path d="${chomac(2812, dno - 120, 24, 30, 10, 2501, 0.8)}" fill="${O.listTma}"/><path d="${chomac(2806, dno - 132, 14, 18, 9, 2502, 0.8)}" fill="${O.list}"/>`;
      s += obdelnik(2796, dno - 96, 34, 40, `fill="#C9C2B4"`);
    }
    // zábradlí: mléčné sklo v hliníkovém rámu, přepážka mezi byty
    s += zabradliR;
    s += obdelnik(2756, dno - 2, 448, 18, `fill="${O.r2Svetly}"`) + obdelnik(2756, dno + 16, 448, 8, `fill="${O.r2Tma}" opacity="0.38"`);
    s += snih(obdelnik(2760, zy - 12, 444, 7, `rx="3" fill="${O.snih}"`));
  });
  // futon přes zábradlí v 1. patře (jen ve dne)
  s += jenDen(
    vitr(
      `<path d="M3022 1180 Q3026 1170 3036 1170 H3176 Q3186 1170 3188 1180 L3190 1262 Q3186 1270 3176 1270 H3034 Q3024 1270 3022 1262 Z" fill="#A9C4DE"/><path d="M3022 1180 Q3026 1170 3036 1170 H3176 Q3186 1170 3188 1180 V1188 H3022 Z" fill="#C9DBEC"/><path d="M3034 1206 H3178 M3034 1228 H3178 M3034 1250 H3178" stroke="#8EAACB" stroke-width="3"/>`,
    ),
  );
  // přízemí: schránky, vchod se jménem domu, kolárna
  s += obdelnik(x0, 1690, x1 - x0, 75, `fill="${O.r2Tma}"`) + obdelnik(x0, 1690, x1 - x0, 4, `fill="${O.r2Stin}"`);
  s += obdelnik(2800, 1462, 84, 112, `rx="2" fill="#B5BCC2"`);
  s += obdelniky(
    [0, 1, 2].flatMap((r) => [0, 1].map((c) => [2805 + c * 40, 1467 + r * 35, 36, 31])),
    `fill="#CDD3D8"`,
  );
  s += obdelniky(
    [0, 1, 2].flatMap((r) => [0, 1].map((c) => [2813 + c * 40, 1474 + r * 35, 20, 3])),
    `fill="#5F666C"`,
  );
  s += obdelnik(2952, 1352, 116, 42, `rx="3" fill="#D6DADD"`) + obdelnik(2952, 1390, 116, 4, `fill="${O.r2Tma}"`);
  s += `<text x="3010" y="1381" font-size="19" text-anchor="middle" fill="#3E4550" font-family="${PISMO.kanji}">コーポさくら</text>`;
  s += obdelnik(2952, 1404, 120, 14, `fill="${O.r2Svetly}"`) + obdelnik(2952, 1418, 120, 8, `fill="${O.r2Tma}" opacity="0.4"`);
  s += obdelnik(2962, 1426, 100, 339, `fill="${O.hlinik}"`);
  s += obdelnik(2970, 1434, 84, 331, `fill="#5E6B7A"`);
  s += `<path d="M2970 1640 L3054 1520 L3054 1560 L2970 1680 Z" fill="${O.odlesk}" opacity="0.28"/>`;
  s += obdelnik(3010, 1434, 3, 331, `fill="${O.hlinik}"`) + obdelnik(3016, 1590, 4, 40, `fill="${O.hlinikSvetly}"`);
  // v noci: chodba za skleněnými dveřmi pod zářivkou a podsvícené jméno domu
  sv.push(
    svetlo(
      PRAH.sousedOd + 0.04,
      `${elipsa(3012, 1560, 90, 200, `fill="url(#kd-ok-s-haloB)" opacity="0.6"`)}<g opacity="0.5">${obdelnik(2970, 1434, 84, 331, `fill="url(#kd-ok-s-bile)"`)}${obdelnik(2976, 1600, 30, 160, `fill="#9AA6B8" opacity="0.5"`)}</g>${obdelnik(3010, 1434, 3, 331, `fill="${nocni(O.hlinik.slice(1))}"`)}${obdelnik(2952, 1352, 116, 42, `rx="3" fill="#DCE6EF" opacity="0.85"`)}<text x="3010" y="1381" font-size="19" text-anchor="middle" fill="#2E3540" font-family="${PISMO.kanji}">コーポさくら</text>`,
      "krm-ok-okno",
    ),
  );
  // kolárna: střecha z polykarbonátu na dvou sloupcích
  s += `<path d="M3082 1452 L3204 1440 L3204 1452 L3082 1464 Z" fill="#C6D6D8" opacity="0.85"/>`;
  s += obdelniky([[3088, 1460, 5, 305], [3196, 1450, 5, 315]], `fill="${O.ocel}"`);
  s += snih(`<path d="M3080 1446 L3204 1434 L3204 1442 L3080 1454 Z" fill="${O.snih}"/>` + obdelnik(x0 - 6, 414, x1 - x0 + 6, 8, `rx="4" fill="${O.snih}"`) + obdelnik(2950, 1398, 124, 7, `rx="3" fill="${O.snih}"`));
  return { den: s, svit: sv };
}

/* ——— Sakura za pravým sousedem ——— */
/** Hlavní větve: od kmene (vykukuje nad hřebenem souseda) ven do koruny */
const VETVE: { b: Bod[]; w: [number, number] }[] = [
  { b: [[2424, 660], [2421, 590], [2413, 532]], w: [42, 32] },
  { b: [[2410, 538], [2344, 492], [2256, 452], [2150, 432]], w: [22, 6] },
  { b: [[2408, 530], [2370, 452], [2338, 374]], w: [18, 5] },
  { b: [[2418, 528], [2446, 448], [2482, 366]], w: [18, 5] },
  { b: [[2422, 540], [2502, 496], [2594, 452], [2680, 440]], w: [20, 6] },
  { b: [[2432, 566], [2532, 560], [2630, 536], [2706, 526]], w: [14, 4] },
  { b: [[2404, 560], [2346, 550], [2286, 534]], w: [14, 5] },
];
/**
 * Shluky listí [cx, cy, rx, ry, seed]: zadní řada (horní okraj koruny),
 * přední řada a pár převislých dole. Každý shluk je stínovaný jako
 * oblak — světlý okraj vlevo nahoře, tmavý srpek vpravo dole.
 */
const SHLUKY_ZADNI: number[][] = [
  [2152, 430, 64, 46, 11],
  [2246, 386, 84, 60, 12],
  [2364, 352, 96, 62, 13],
  [2490, 356, 92, 60, 14],
  [2604, 392, 82, 56, 15],
  [2682, 450, 50, 42, 16],
];
const SHLUKY_PREDNI: number[][] = [
  [2204, 486, 76, 50, 21],
  [2318, 452, 86, 56, 22],
  [2440, 446, 88, 58, 23],
  [2560, 468, 84, 54, 24],
  [2656, 508, 62, 42, 25],
  [2272, 530, 50, 30, 26],
  [2508, 530, 56, 32, 27],
  [2392, 520, 44, 28, 28],
];
/** Převislá větev přes hřeben souseda (kreslí se před střechu, daleko od rohu střechy krámku) */
const PREVIS: Bod[] = [[2398, 570], [2356, 578], [2324, 606], [2306, 656]];
const SHLUKY_PRED: number[][] = [
  [2334, 604, 50, 32, 31],
  [2302, 662, 36, 28, 32],
];

/** Shluk listí: tmavý podklad, střední tón posunutý vlevo nahoru (zbude tmavý srpek), světlý okraj vlevo nahoře */
function shluk(id: string, [cx, cy, rx, ry, sd]: number[]) {
  const B = chomac(cx, cy, rx, ry, 17, 6100 + sd, 0.94, 0.56);
  const H = chomac(cx - rx * 0.46, cy - ry * 0.56, rx * 0.6, ry * 0.5, 12, 6200 + sd, 1, 0.56);
  const kor = (trida: string, barva: string, d: string, a = "") => `<path class="koruna ${trida}" fill="${barva}" d="${d}"${a}/>`;
  return {
    def: `<clipPath id="${id}"><path d="${B}"/></clipPath>`,
    kresba:
      kor("sak-1", "#D98C8A", B) +
      `<g clip-path="url(#${id})">${kor("sak-2", "#EBA9A6", B, ` transform="translate(${f(-rx * 0.15)} ${f(-ry * 0.24)})"`)}${kor("sak-3", "#F7CFCB", H)}</g>`,
  };
}

/** Drobné větvičky ke shlukům (v zimě dělají jemnou siluetu koruny) */
function vetvicky() {
  const r = nahoda(5150);
  let tenke = "";
  let nejtenci = "";
  [...SHLUKY_ZADNI, ...SHLUKY_PREDNI.slice(0, 5)].forEach(([cx, cy, rx, ry], i) => {
    const start: Bod = [2414 + (cx - 2414) * 0.42 + (r() - 0.5) * 30, 530 + (cy - 530) * 0.4 + (r() - 0.5) * 16];
    tenke += `M${f(start[0])} ${f(start[1])} Q${f((start[0] + cx) / 2 + (r() - 0.5) * 30)} ${f((start[1] + cy) / 2 - 16)} ${f(cx)} ${f(cy)}`;
    for (let k = 0; k < 3; k++) {
      const a = -Math.PI / 2 + (r() - 0.5) * 2.8;
      const l = 0.7 + r() * 0.45;
      const ex = cx + Math.cos(a) * rx * l;
      const ey = cy + Math.sin(a) * ry * l;
      nejtenci += `M${f(cx)} ${f(cy)} Q${f((cx + ex) / 2 + (r() - 0.5) * 16)} ${f((cy + ey) / 2 - 8)} ${f(ex)} ${f(ey)}`;
      if ((i + k) % 2 === 0) {
        const a2 = a + (r() - 0.5) * 1.4;
        nejtenci += `M${f((cx * 0.4 + ex * 0.6))} ${f((cy * 0.4 + ey * 0.6))} l${f(Math.cos(a2) * rx * 0.32)} ${f(Math.sin(a2) * ry * 0.38)}`;
      }
    }
  });
  return { tenke, nejtenci };
}

function strom() {
  const v = vetvicky();
  let defs = "";
  let zadni = "";
  // větve (v zimě je vidět jen tohle)
  zadni += `<path d="${VETVE.map((x) => vetev(x.b, x.w[0], x.w[1])).join("")}" fill="${O.kura}"/>`;
  zadni += `<path d="${v.tenke}" stroke="${O.kura}" stroke-width="5" stroke-linecap="round" fill="none"/>`;
  zadni += `<path d="${v.nejtenci}" stroke="${O.kura}" stroke-width="2.6" stroke-linecap="round" fill="none"/>`;
  // světlejší horní hrana silných větví (světlo zleva shora)
  zadni += `<path d="${VETVE.slice(1).map((x) => hladka(x.b.map(([a, b]): Bod => [a - 2, b - 4]))).join("")}" stroke="${O.kuraSvetla}" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.8"/>`;
  // koruna: zadní řada, mezi ní a přední prosvítají větve, přední řada
  SHLUKY_ZADNI.forEach((s, i) => {
    const k = shluk(`kd-ok-z-shluk-z${i}`, s);
    defs += k.def;
    zadni += k.kresba;
  });
  // úseky větví mezi řadami (bez konců, ať netrčí ven z koruny)
  zadni += `<path d="${VETVE.slice(1, 6).map((x) => hladka(x.b.slice(0, -1))).join("")}" stroke="${O.kura}" stroke-width="5" stroke-linecap="round" fill="none"/>`;
  SHLUKY_PREDNI.forEach((s, i) => {
    const k = shluk(`kd-ok-z-shluk-p${i}`, s);
    defs += k.def;
    zadni += k.kresba;
  });
  // sníh (jen v zimě) leží jen na skoro vodorovných větvích, ne na těch, co míří vzhůru
  zadni += snih(
    `<path d="${[1, 4, 5, 6].map((k) => VETVE[k]).map((x) => hladka(x.b.map(([a, b], i): Bod => [a, b - x.w[0] * (1 - i / x.b.length) * 0.45 - 2]))).join("")}" stroke="${O.snih}" stroke-width="5" stroke-linecap="round" fill="none"/>`,
  );
  // převislá větev přes hřeben souseda a její dva shluky
  let predni = `<path d="${vetev(PREVIS, 13, 4)}" fill="${O.kura}"/>`;
  predni += `<path d="M2324 606 Q2350 626 2356 652 M2350 580 Q2318 588 2302 612" stroke="${O.kura}" stroke-width="3" stroke-linecap="round" fill="none"/>`;
  SHLUKY_PRED.forEach((s, i) => {
    const k = shluk(`kd-ok-z-shluk-v${i}`, s);
    defs += k.def;
    predni += k.kresba;
  });
  predni += snih(`<path d="M2394 563 Q2372 566 2352 572" stroke="${O.snih}" stroke-width="4" stroke-linecap="round" fill="none"/>`);
  return { defs: `<defs>${defs}</defs>`, zadni, predni };
}

/* ——— Elektrický sloup ——— */
function sloupTelo(cx: number, y0: number, y1: number) {
  const l0 = cx - pulSloupu(y0);
  const r0 = cx + pulSloupu(y0);
  const l1 = cx - pulSloupu(y1);
  const r1 = cx + pulSloupu(y1);
  return (
    mnohouhelnik([[l0, y0], [r0, y0], [r1, y1], [l1, y1]], `fill="${O.beton}"`) +
    mnohouhelnik([[l0, y0], [l0 + 6, y0], [l1 + 7, y1], [l1, y1]], `fill="${O.betonSvetly}"`) +
    mnohouhelnik([[r0 - 7, y0], [r0, y0], [r1, y1], [r1 - 9, y1]], `fill="${O.betonTma}"`)
  );
}

function sloup(cx: number, levy: boolean) {
  const u = levy ? UL : UP;
  const m = levy ? 1 : -1;
  let s = "";
  // tělo
  s += sloupTelo(cx, VRCH, 1770);
  s += `<path d="M${cx - 13} ${VRCH} Q${cx} ${VRCH - 9} ${cx + 13} ${VRCH} Z" fill="${O.betonTma}"/>`;
  // výstražný pruh u země (žlutočerný)
  const pruh = (y0: number, y1: number) => mnohouhelnik([[cx - pulSloupu(y0), y0], [cx + pulSloupu(y0), y0], [cx + pulSloupu(y1), y1], [cx - pulSloupu(y1), y1]], `fill="url(#kd-ok-z-tygr)"`);
  s += pruh(1600, 1700);
  s += mnohouhelnik([[cx + pulSloupu(1600) - 8, 1600], [cx + pulSloupu(1600), 1600], [cx + pulSloupu(1700), 1700], [cx + pulSloupu(1700) - 9, 1700]], `fill="${O.stin}" opacity="0.25"`);
  // zemnicí lano na špičce
  s += obdelnik(levy ? cx + 8 : cx - 18, 50, 10, 8, `fill="${O.ocelTma}"`);
  // ramena s izolátory
  for (const [y, a, b] of [[128, cx - 92, cx + 86], [200, cx - 74, cx + 74]] as [number, number, number][]) {
    s += obdelnik(a, y, b - a, 8, `fill="${O.ocel}"`) + obdelnik(a, y, b - a, 2.5, `fill="#A3AAB0"`);
    s += `<path d="M${a + 22} ${y + 8} L${cx - 10} ${y + 46} M${b - 22} ${y + 8} L${cx + 10} ${y + 46}" stroke="${O.ocelTma}" stroke-width="3.5"/>`;
  }
  for (const [x, y] of [...u.vn, ...u.vn2]) s += `<use href="#kd-ok-z-izolator" transform="translate(${f(x)} ${f(y + 14)})"/>`;
  // nízké napětí: stojánek s cívkovými izolátory
  const rx = cx + m * 17;
  s += obdelnik(levy ? rx - 2 : rx - 4, 316, 6, 56, `fill="${O.ocelTma}"`);
  for (const [, y] of u.nn) s += elipsa(rx + m * 5, y, 5, 6, `fill="${O.porcelan}"`) + elipsa(rx + m * 6.5, y, 2.5, 6, `fill="${O.porcelanStin}"`);
  s += elipsa(cx - m * 16, 362, 4, 5, `fill="${O.porcelan}"`);
  // telefonní kabel: spojka a stočená rezerva zavěšená vedle sloupu
  s += obdelnik(cx - m * 4 - (levy ? 46 : -16), 638, 30, 16, `rx="7" fill="#2A292E"`);
  const kx = cx + m * 36;
  s += `<path d="M${cx + m * 12} 660 Q${kx} 664 ${kx} 690" stroke="#2A292E" stroke-width="4" fill="none"/>`;
  s += `<path d="${[0, 5, 10].map((d) => `M${kx - 20} ${700 + d} a20 15 0 1 0 40 0 a20 15 0 1 0 -40 0`).join("")}" stroke="#2A292E" stroke-width="3.4" fill="none"/>`;
  s += obdelnik(cx - pulSloupu(656) - 2, 656, pulSloupu(656) * 2 + 4, 8, `fill="${O.ocelTma}"`);
  // stupačky (足場ボルト)
  const st: number[][] = [];
  const hl: number[][] = [];
  let k = 0;
  for (let y = 1090; y > 400; y -= 44, k++) {
    const vlevo = k % 2 === 0;
    const pw = pulSloupu(y);
    st.push(vlevo ? [cx - pw - 14, y, 14, 4] : [cx + pw, y, 14, 4]);
    hl.push(vlevo ? [cx - pw - 16, y - 3, 4, 10] : [cx + pw + 12, y - 3, 4, 10]);
  }
  s += obdelniky(st, `fill="${O.ocel}"`) + obdelniky(hl, `fill="${O.ocelTma}"`);
  // sníh na ramenech
  s += snih(obdelnik(cx - 94, 122, 182, 6, `rx="3" fill="${O.snih}"`) + obdelnik(cx - 76, 194, 152, 6, `rx="3" fill="${O.snih}"`) + `<path d="M${cx - 13} ${VRCH} Q${cx} ${VRCH - 12} ${cx + 13} ${VRCH} Z" fill="${O.snih}"/>`);
  return s;
}

/** Levý sloup navíc: transformátor, reklama 陶芸教室 */
function sloupLDoplnky() {
  const cx = SL;
  let s = "";
  // transformátor (柱上変圧器) na levé straně sloupu, pod ním vypínač
  s += `<path d="M${cx - 50} 262 L${cx - 72} 114 M${cx - 36} 262 L${cx - 28} 116" stroke="${O.kabel}" stroke-width="2"/>`;
  s += obdelniky([[cx - 30, 288, 20, 6], [cx - 30, 346, 20, 6]], `fill="${O.ocelTma}"`);
  s += obdelnik(cx - 78, 272, 50, 92, `rx="7" fill="#AEB5BA"`);
  s += obdelnik(cx - 76, 272, 9, 92, `fill="#C9CFD3"`) + obdelnik(cx - 40, 272, 12, 92, `fill="#8F969C"`);
  s += obdelnik(cx - 80, 266, 54, 10, `rx="4" fill="#C2C8CC"`);
  s += `<path d="M${cx - 78} 306 H${cx - 28} M${cx - 78} 334 H${cx - 28}" stroke="#979EA3" stroke-width="2.4"/>`;
  s += obdelnik(cx - 70, 314, 18, 13, `fill="#EEF0F0"`);
  s += obdelnik(cx - 56, 252, 8, 15, `fill="${O.porcelan}"`) + obdelnik(cx - 40, 252, 8, 15, `fill="${O.porcelan}"`);
  s += `<path d="M${cx - 53} 364 Q${cx - 50} 384 ${cx - 14} 392" stroke="${O.kabel}" stroke-width="2.4" fill="none"/>`;
  s += snih(obdelnik(cx - 82, 260, 58, 8, `rx="4" fill="${O.snih}"`));
  // reklama ovinutá kolem sloupu (電柱広告): 陶芸教室 → tudy
  const y0 = 1288;
  const pw = pulSloupu(y0 + 100) + 2;
  s += obdelnik(cx - pw, y0, pw * 2, 212, `rx="2" fill="#F5F2E8"`);
  s += obdelnik(cx - pw, y0, pw * 2, 24, `rx="2" fill="${P.rumelka}"`);
  s += kruh(cx, y0 + 12, 6, `fill="#F5F2E8"`);
  s += svisle(cx, y0 + 50, "陶芸教室", 21, `fill="#2B2420" font-family="${PISMO.kanji}"`, 1.08);
  s += svisle(cx, y0 + 152, "この先", 10, `fill="#2B2420" font-family="${PISMO.kanji}"`, 1.15);
  s += `<path d="M${cx - 12} ${y0 + 192} H${cx + 6} V${y0 + 186} L${cx + 14} ${y0 + 194} L${cx + 6} ${y0 + 202} V${y0 + 196} H${cx - 12} Z" fill="${P.rumelka}"/>`;
  s += obdelnik(cx + pw - 6, y0, 6, 212, `fill="${O.stin}" opacity="0.14"`);
  return s;
}

/** Pravý sloup navíc: lampička 防犯灯, číslo ulice, reklama うつわ */
function sloupPDoplnky() {
  const cx = SP;
  let s = "";
  // vypínač (開閉器) na pravé straně
  s += obdelniky([[cx + 12, 286, 14, 5], [cx + 12, 318, 14, 5]], `fill="${O.ocelTma}"`);
  s += obdelnik(cx + 24, 276, 36, 52, `rx="4" fill="#A9B0B5"`) + obdelnik(cx + 24, 276, 7, 52, `fill="#C4CACE"`) + obdelnik(cx + 52, 276, 8, 52, `fill="#8C9399"`);
  s += `<path d="M${cx + 34} 276 L${cx + 26} 188 M${cx + 50} 276 L${cx + 60} 188" stroke="${O.kabel}" stroke-width="2"/>`;
  s += snih(obdelnik(cx + 22, 270, 40, 7, `rx="3" fill="${O.snih}"`));
  // lampička na rameni (svítí v noci)
  s += `<path d="M${cx - 13} 1100 L${cx - 52} 1088" stroke="${O.ocel}" stroke-width="5" stroke-linecap="round"/>`;
  s += obdelnik(cx - 92, 1078, 44, 13, `rx="4" fill="#EDEFF0"`) + obdelnik(cx - 92, 1078, 44, 4, `rx="2" fill="#B9BFC4"`);
  s += obdelnik(cx - 86, 1090, 32, 4, `fill="#D9E2E8"`);
  // modrá cedulka s adresou (住居表示)
  const pw = pulSloupu(1240) + 3;
  s += obdelnik(cx - pw, 1168, pw * 2, 96, `rx="3" fill="#2C5DA0"`);
  s += svisle(cx, 1188, "本町", 15, `fill="#FFFFFF" font-family="${PISMO.kanji}"`, 1.1);
  s += svisle(cx, 1224, "一丁目", 11, `fill="#FFFFFF" font-family="${PISMO.kanji}"`, 1.1);
  // reklama: うつわ ← tudy
  const y0 = 1300;
  const pw2 = pulSloupu(y0 + 100) + 2;
  s += obdelnik(cx - pw2, y0, pw2 * 2, 190, `rx="2" fill="#2E3F7A"`);
  s += obdelnik(cx - pw2, y0, pw2 * 2, 20, `rx="2" fill="#F2EFE6"`);
  s += svisle(cx, y0 + 50, "うつわ", 22, `fill="#F2EFE6" font-family="${PISMO.kanji}"`, 1.08);
  s += svisle(cx, y0 + 134, "この先", 10, `fill="#F2EFE6" font-family="${PISMO.kanji}"`, 1.15);
  s += `<path d="M${cx + 12} ${y0 + 172} H${cx - 6} V${y0 + 166} L${cx - 14} ${y0 + 174} L${cx - 6} ${y0 + 182} V${y0 + 176} H${cx + 12} Z" fill="#F2EFE6"/>`;
  s += obdelnik(cx + pw2 - 6, y0, 6, 190, `fill="${O.stin}" opacity="0.18"`);
  // noční svit lampičky
  const svit = svetlo(
    PRAH.lampa + 0.06,
    `${elipsa(cx - 70, 1092, 60, 34, `fill="url(#kd-ok-s-haloB)"`)}<path d="M${cx - 90} 1092 L${cx - 50} 1092 L${cx + 60} 1858 L${cx - 200} 1858 Z" fill="url(#kd-ok-s-kuzelB)"/>${obdelnik(cx - 88, 1089, 36, 5, `rx="2" fill="#F4FAFF"`)}${elipsa(cx - 70, 1830, 150, 26, `fill="url(#kd-ok-s-haloB)"`)}`,
    "krm-ok-lampa",
  );
  return { den: s, svit };
}

/* ——— Spáry a stíny u krámku ——— */
const spary = () =>
  obdelnik(1088, 150, 14, 1615, `fill="#5A5862"`) + obdelnik(2098, 560, 12, 1205, `fill="#5A5862"`) + obdelnik(1088, 150, 4, 1615, `fill="#45434C"`);

/* =====================================================================
 *  ZEM: chodník, hmatová dlažba, obrubník, silnice, poklop
 * ===================================================================== */
function zem() {
  const W = 3200;
  let s = `<defs>
    <pattern id="kd-ok-m-hmat" x="0" y="1812" width="57" height="17" patternUnits="userSpaceOnUse">
      <rect width="57" height="17" fill="#E2B33F"/>
      <path d="M5 3.5 H52 M5 7.5 H52 M5 11.5 H52" stroke="#F2CC62" stroke-width="2.2" stroke-linecap="round"/>
      <rect width="1.6" height="17" fill="#B88C2A"/><rect y="15.4" width="57" height="1.6" fill="#B88C2A"/>
    </pattern>
    <radialGradient id="kd-ok-m-poklop-lesk" cx="0.38" cy="0.32" r="0.7"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.28"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient>
  </defs>`;
  // chodník: velké desky ve dvou řadách, spáry se k divákovi lehce rozbíhají
  s += obdelnik(-40, Y.chodnik, W + 80, Y.obrubnik - Y.chodnik, `fill="${P.dlazba}"`);
  s += obdelnik(-40, Y.chodnik, W + 80, 5, `fill="#8C8577" opacity="0.4"`);
  const spary: string[] = [];
  const svetla: string[] = [];
  const RADA = 1810;
  for (let x = -60; x < W + 80; x += 152) {
    spary.push(`M${f(x)} ${Y.chodnik} L${f(x + (x - 1600) * 0.035)} ${RADA}`);
    svetla.push(`M${f(x + 3)} ${Y.chodnik + 6} L${f(x + 3 + (x - 1600) * 0.035)} ${RADA - 2}`);
  }
  for (let x = 16; x < W + 80; x += 166) {
    spary.push(`M${f(x)} ${RADA} L${f(x + (x - 1600) * 0.05)} ${Y.obrubnik}`);
    svetla.push(`M${f(x + 3)} ${RADA + 20} L${f(x + 3 + (x - 1600) * 0.05)} ${Y.obrubnik - 2}`);
  }
  spary.push(`M-40 ${RADA} H${W + 40}`);
  s += `<path d="${spary.join("")}" stroke="${P.dlazbaSpara}" stroke-width="2.6" fill="none"/>`;
  s += `<path d="${svetla.join("")}M-40 ${RADA + 2.5} H${W + 40}" stroke="#E2DACA" stroke-width="1.6" fill="none" opacity="0.8"/>`;
  // hmatová dlažba (点字ブロック) — žlutý pás podél celé ulice
  s += obdelnik(-40, 1812, W + 80, 17, `fill="url(#kd-ok-m-hmat)"`);
  s += obdelnik(-40, 1829, W + 80, 2, `fill="#8C8577" opacity="0.3"`);
  // obrubník
  s += obdelnik(-40, Y.obrubnik, W + 80, 7, `fill="#E4DFD3"`);
  s += obdelnik(-40, Y.obrubnik + 7, W + 80, Y.silnice - Y.obrubnik - 7, `fill="${P.obrubnik}"`);
  s += obdelnik(-40, Y.silnice - 3, W + 80, 3, `fill="#B5AD9D"`);
  s += `<path d="${Array.from({ length: 30 }, (_, i) => `M${f(-20 + i * 112)} ${Y.obrubnik} V${Y.silnice}`).join("")}" stroke="#B5AC9A" stroke-width="2"/>`;
  // betonový žlab a mříže
  s += obdelnik(-40, Y.silnice, W + 80, 18, `fill="#B9B4AA"`) + obdelnik(-40, Y.silnice + 16, W + 80, 3, `fill="#8E8A82"`);
  for (const gx of [858, 2452, 3080]) {
    s += obdelnik(gx, Y.silnice + 2, 80, 13, `fill="#4E4D52"`);
    s += `<path d="${Array.from({ length: 9 }, (_, i) => `M${gx + 5 + i * 9} ${Y.silnice + 3} V${Y.silnice + 14}`).join("")}" stroke="#77767C" stroke-width="2.4"/>`;
  }
  // silnice: asfalt, záplaty, praskliny, krajnice, přerušovaná osa
  const asfaltY = Y.silnice + 19;
  s += obdelnik(-40, asfaltY, W + 80, 2000 - asfaltY + 40, `fill="${P.asfalt}"`);
  s += obdelniky([[260, 1950, 220, 40], [1980, 1935, 160, 30], [2840, 1962, 260, 50]], `fill="#646369"`);
  s += `<path d="M640 1940 l40 6 l26 -4 l30 8 M1220 1986 l34 -8 l22 4 M2380 1932 l18 10 l30 2" stroke="#4E4D53" stroke-width="2" fill="none"/>`;
  s += obdelnik(-40, 1918, W + 80, 7, `fill="${P.cara}" opacity="0.92"`);
  s += obdelniky(Array.from({ length: 13 }, (_, i) => [40 + i * 260, 1990, 150, 6]), `fill="${P.cara}" opacity="0.85"`);
  // požární hydrant: žlutě orámovaný poklop v silnici (消火栓)
  s += obdelnik(2936, 1936, 104, 28, `rx="4" fill="#E2BE3A"`) + obdelnik(2946, 1941, 84, 18, `rx="3" fill="#5A595F"`);
  s += `<text x="2988" y="1955" font-size="12" text-anchor="middle" fill="#E2BE3A" font-family="${PISMO.kanji}">消火栓</text>`;
  // ozdobný poklop: kapr v kruzích vln a lístky sakury
  s += poklop(1652, 1956, 66, 21);
  // napadané lístky pod stromem (barví se podle roku, v zimě a v létě nejsou)
  const r = nahoda(7301);
  let listky = "";
  for (let i = 0; i < 22; i++) {
    const x = 2130 + r() * 640;
    const y = 1770 + r() * 120;
    const a = Math.round(r() * 180);
    listky += `<ellipse class="${i % 2 ? "sak-2" : "sak-3"}" fill="${i % 2 ? "#EBA9A6" : "#F7CFCB"}" cx="${f(x)}" cy="${f(y)}" rx="5.5" ry="2.8" transform="rotate(${a} ${f(x)} ${f(y)})"/>`;
  }
  s += `<g class="koruna-zem">${listky}</g>`;
  // sníh: pás u zdí a na obrubníku
  s += snih(`<path d="M-40 ${Y.chodnik} H${W + 40} V${Y.chodnik + 12} C2600 ${Y.chodnik + 20} 2000 ${Y.chodnik + 14} 1600 ${Y.chodnik + 18} C1100 ${Y.chodnik + 22} 600 ${Y.chodnik + 12} -40 ${Y.chodnik + 16} Z" fill="${O.snih}"/>` + obdelnik(-40, Y.obrubnik - 3, W + 80, 9, `rx="4" fill="${O.snih}"`));
  // paty sloupů na chodníku a jejich stíny
  for (const cx of [SL, SP]) {
    s += `<path d="M${cx - 8} ${PATA} L${cx + 18} ${PATA} L${cx + 150} 1906 L${cx + 112} 1906 Z" fill="${O.stin}" opacity="0.14"/>`;
    s += sloupTelo(cx, Y.chodnik - 6, PATA);
    s += obdelnik(cx - pulSloupu(PATA) - 3, PATA - 14, pulSloupu(PATA) * 2 + 6, 14, `fill="${O.betonTma}"`) + obdelnik(cx - pulSloupu(PATA) - 3, PATA - 14, pulSloupu(PATA) * 2 + 6, 3, `fill="${O.betonSvetly}"`);
  }
  return s;
}

/** Ozdobný litinový poklop (マンホール蓋) — kapr, vlny a sakura; kreslí se v kruhu a zplošťuje */
function poklop(cx: number, cy: number, rx: number, ry: number) {
  const vlny = Array.from({ length: 3 }, (_, i) => {
    const y = 0.18 + i * 0.22;
    return `M-0.8 ${y} Q-0.6 ${y - 0.1} -0.4 ${y} T0 ${y} T0.4 ${y} T0.8 ${y}`;
  }).join("");
  const kvet = (x: number, y: number, r: number) =>
    Array.from({ length: 5 }, (_, i) => {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      return `M${f(x)} ${f(y)} Q${f(x + Math.cos(a - 0.5) * r)} ${f(y + Math.sin(a - 0.5) * r)} ${f(x + Math.cos(a) * r)} ${f(y + Math.sin(a) * r)} Q${f(x + Math.cos(a + 0.5) * r)} ${f(y + Math.sin(a + 0.5) * r)} ${f(x)} ${f(y)}`;
    }).join("");
  // souřadnice motivu jsou v jednotkovém kruhu, zvětšené na 100 (a pak zmenšené transformací)
  const k = (d: string) => d.replace(/-?\d+(\.\d+)?/g, (n) => f(Number(n) * 100).toString());
  return `<g transform="translate(${cx} ${cy}) scale(${f(rx / 100)} ${f(ry / 100)})">
    <ellipse cx="6" cy="8" rx="104" ry="104" fill="${O.stin}" opacity="0.18"/>
    <circle r="102" fill="#7D7C82"/>
    <circle r="94" fill="#4F4E55"/>
    <circle r="88" fill="#3E5F86"/>
    <path d="${k(vlny)}" stroke="#7FA6CC" stroke-width="7" fill="none" stroke-linecap="round"/>
    <path d="M-62 4 C-40 -40 20 -48 52 -16 C60 -8 70 -6 80 -14 C76 0 74 10 80 26 C70 18 62 16 54 24 C24 52 -36 50 -62 4 Z" fill="#D9502F"/>
    <path d="M-30 -22 C-14 -30 6 -30 16 -24 C6 -14 -14 -12 -30 -22 Z M-10 18 C4 26 22 26 34 16 C22 12 4 10 -10 18 Z" fill="#F4EFE6"/>
    <circle cx="-44" cy="-4" r="6" fill="#2B2420"/><circle cx="-46" cy="-6" r="2" fill="#F4EFE6"/>
    <path d="M-20 -40 C-10 -60 10 -60 18 -44 Z" fill="#E86A44"/>
    <path d="${kvet(-56, -48, 18)}${kvet(52, 52, 16)}${kvet(-30, 62, 12)}" fill="#EBA9A6"/>
    <circle r="88" fill="url(#kd-ok-m-poklop-lesk)"/>
  </g>`;
}

/* =====================================================================
 *  PŘEDNÍ VRSTVA: dráty a vrány, automat, kytky, stojan, kolo
 * ===================================================================== */

/** Vrána v profilu (zobák doleva při smer 1), sedí patou na (0,0) */
function vrana(poza: string) {
  const telo = "#2A2A33";
  const lesk = "#454B60";
  let s = "";
  // ocas, tělo, křídlo, hlava, zobák, nohy
  s += `<path d="M10 -14 L30 -6 L32 -2 L12 -8 Z" fill="${telo}"/>`;
  s += `<path d="M-14 -16 C-14 -28 -2 -32 8 -28 C16 -25 18 -16 14 -10 C8 -4 -6 -4 -12 -9 Z" fill="${telo}"/>`;
  s += `<path d="M-6 -24 C2 -28 12 -24 16 -16 C10 -12 0 -12 -6 -16 Z" fill="${lesk}"/>`;
  if (poza === "cisti") {
    // hlava zabořená do křídla
    s += `<circle cx="-2" cy="-26" r="7.5" fill="${telo}"/><path d="M-2 -22 L6 -17 L-1 -18 Z" fill="#1C1C22"/>`;
  } else {
    const hy = poza === "krak" ? -38 : -34;
    s += `<circle cx="-14" cy="${hy}" r="8" fill="${telo}"/>`;
    s += `<circle cx="-16" cy="${hy - 2}" r="1.6" fill="#C9CED8"/>`;
    if (poza === "krak") s += `<path d="M-20 ${hy - 3} L-34 ${hy - 8} L-22 ${hy - 1} Z M-21 ${hy + 1} L-33 ${hy + 4} L-21 ${hy + 3} Z" fill="#1C1C22"/>`;
    else s += `<path d="M-20 ${hy - 3} L-33 ${hy + 1} L-20 ${hy + 3} Z" fill="#1C1C22"/>`;
    s += `<path d="M-12 ${hy + 6} C-12 -26 -10 -24 -8 -22 L-14 -18 Z" fill="${telo}"/>`;
  }
  s += `<path d="M-3 -6 L-4 0 M3 -6 L4 0" stroke="#1C1C22" stroke-width="2.2" stroke-linecap="round"/>`;
  return s;
}

function draty() {
  let s = "";
  const skupina = (d: Drat[], atributy: string) => `<path d="${d.map(dratD).join("")}" fill="none" ${atributy}/>`;
  s += skupina([...DRATY_VN, ...DRATY_STRANY], `stroke="${O.kabel}" stroke-width="2.4"`);
  s += skupina(DRATY_K_DIVAKOVI, `stroke="${O.kabel}" stroke-width="2.8"`);
  s += skupina(DRATY_NN, `stroke="#34333A" stroke-width="2.6"`);
  s += skupina(PRIPOJKY, `stroke="#34333A" stroke-width="2"`);
  s += skupina(DRATY_TEL, `stroke="#25242A" stroke-width="5"`);
  s += skupina(PRIPOJKY_TEL, `stroke="#25242A" stroke-width="2.6"`);
  // úchyty přípojek na okrajích střechy krámku a na starém domě
  for (const [x, y] of [[1110, 432], [2090, 432], [300, 452]]) s += obdelnik(x - 6, y - 2, 12, 5, `fill="${O.ocelTma}"`) + kruh(x, y, 3.4, `fill="${O.porcelan}"`);
  // vrány (jen ve dne; stránka je za šera nechá odletět)
  s += `<g class="krm-vrany krm-jen-den">${VRANY.map(
    (v, i) =>
      `<g class="krm-vrana" data-i="${i}" data-x="${f(v.x)}" data-y="${f(v.y)}"><g transform="translate(${f(v.x)} ${f(v.y)}) scale(${f(v.smer * v.s)} ${f(v.s)})">${vrana(v.poza)}</g></g>`,
  ).join("")}</g>`;
  // kotevní lano levého a pravého sloupu se žlutým chráničem
  for (const { a, b } of KOTVY) {
    const [x0, y0] = a;
    const [x1] = b;
    s += cara(x0, y0, x1, 1852, `stroke="#4A4A50" stroke-width="2.4"`);
    const t = (1640 - y0) / (1852 - y0);
    const xa = x0 + (x1 - x0) * t;
    s += `<path d="M${f(xa)} 1640 L${x1} 1846" stroke="#E8C341" stroke-width="11" stroke-linecap="round"/>`;
    const pruhy: string[] = [];
    for (let k = 0; k < 4; k++) {
      const ty = 1660 + k * 46;
      const tx = xa + (x1 - xa) * ((ty - 1640) / 206);
      pruhy.push(`M${f(tx)} ${ty} L${f(tx + (x1 - xa) * (20 / 206))} ${ty + 20}`);
    }
    s += `<path d="${pruhy.join("")}" stroke="#2E2B2A" stroke-width="11"/>`;
    s += obdelnik(x1 - 10, 1846, 20, 8, `rx="2" fill="#6E6E72"`);
  }
  return s;
}

/* ——— Automat na nápoje ——— */
/** Vzorky nápojů ve třech řadách: [druh, barva] */
const NAPOJE: [string, string][][] = [
  [["l", "#6FA35A"], ["l", "#9CCBE8"], ["l", "#3E7CC0"], ["l", "#B57A3E"], ["l", "#F0D25A"], ["l", "#E8E4D8"]],
  [["p", "#2E2A2A"], ["p", "#F08A32"], ["p", "#7E4FA0"], ["p", "#D23A30"], ["p", "#D9C3A0"], ["p", "#2E6FB8"]],
  [["p", "#F2C230"], ["p", "#6E4A33"], ["p", "#3A3A44"], ["l", "#4E8A4A"], ["p", "#C9A27A"], ["p", "#F2E070"]],
];
const CENY = [["130", "110", "150", "130", "160", "100"], ["130", "160", "160", "160", "140", "200"], ["140", "130", "130", "150", "140", "140"]];
const A = MISTA.automat;
const RADY = [1460, 1518, 1576];

/** Tvary plechovky a lahve do <defs> (předpona podle vrstvy) */
const tvaryNapoju = (p: string, lesk: number) => `
  <g id="${p}-plech"><rect x="0" y="5" width="17" height="33" rx="2"/><rect x="1" y="1" width="15" height="5" rx="2" fill="#C9CDD2"/><rect x="0" y="16" width="17" height="10" fill="#FFFFFF" opacity="0.55"/><rect x="3" y="6" width="3" height="31" fill="#FFFFFF" opacity="${lesk}"/></g>
  <g id="${p}-lahev"><path d="M5 2 H12 V6 C12 10 17 12 17 17 V40 Q17 42 15 42 H2 Q0 42 0 40 V17 C0 12 5 10 5 6 Z"/><rect x="5" y="0" width="7" height="5" rx="1" fill="#F4F4F2"/><rect x="0" y="22" width="17" height="11" fill="#FFFFFF" opacity="0.7"/><rect x="3" y="12" width="3" height="27" fill="#FFFFFF" opacity="${lesk}"/></g>`;

function vzorky(p: string) {
  let s = "";
  NAPOJE.forEach((rada, ri) => {
    rada.forEach(([druh, barva], i) => {
      const x = A.x + 17 + i * 25.6;
      const y = RADY[ri] + (druh === "l" ? 2 : 6);
      s += `<use href="#${p}-${druh === "l" ? "lahev" : "plech"}" x="${f(x)}" y="${y}" fill="${barva}"/>`;
    });
  });
  return s;
}

function automat() {
  const x0 = A.x;
  const x1 = A.x + A.w;
  let s = "";
  // stín na chodníku doprava dolů
  s += `<path d="M${x0 + 10} 1782 L${x1} 1782 L${x1 + 58} 1800 L${x0 + 60} 1800 Z" fill="${O.stin}" opacity="0.18"/>`;
  // skříň
  s += obdelnik(x0, A.y + 6, A.w, A.h - 6, `rx="4" fill="#CC3A2E"`);
  s += obdelnik(x0 + 2, A.y + 10, 8, A.h - 30, `fill="#DE5546" opacity="0.85"`);
  s += obdelnik(x1 - 10, A.y + 10, 10, A.h - 30, `fill="#A82C23"`);
  s += obdelnik(x0 - 4, A.y - 2, A.w + 8, 14, `rx="3" fill="#B3302A"`) + obdelnik(x0 - 2, A.y - 1, A.w + 4, 3, `fill="#E06A5C"`);
  // výloha se vzorky
  s += obdelnik(x0 + 10, 1450, A.w - 20, 184, `rx="3" fill="#8E2A22"`);
  s += obdelnik(x0 + 13, 1453, A.w - 26, 178, `fill="#E9EEF2"`);
  s += vzorky("kd-ok-p");
  RADY.forEach((y, ri) => {
    s += obdelnik(x0 + 13, y + 44, A.w - 26, 12, `fill="#2B2F3A"`);
    s += `<path d="${CENY[ri].map((_, i) => `M${f(x0 + 18 + i * 25.6)} ${y + 50}h15v4h-15z`).join("")}" fill="${ri === 2 ? "#E8574A" : "#5AA0E6"}"/>`;
    s += `<text x="0" y="${y + 49}" font-size="6.5" fill="#FFFFFF" font-family="${PISMO.text}">${CENY[ri].map((c, i) => `<tspan x="${f(x0 + 25.5 + i * 25.6)}" text-anchor="middle">${c}</tspan>`).join("")}</text>`;
  });
  s += `<path d="M${x0 + 13} 1453 L${x0 + 70} 1453 L${x0 + 13} 1530 Z" fill="#FFFFFF" opacity="0.22"/>`;
  // nápisy つめた〜い / あったか〜い na tmavé liště
  s += obdelnik(x0 + 11, 1632, A.w - 22, 16, `rx="2" fill="#2B2F3A"`);
  s += obdelnik(x0 + 14, 1634, 74, 12, `rx="2" fill="#2E6FB8"`) + `<text x="${x0 + 51}" y="1643.5" font-size="9" text-anchor="middle" fill="#FFFFFF" font-family="${PISMO.kanji}">つめた〜い</text>`;
  s += obdelnik(x0 + 92, 1634, 74, 12, `rx="2" fill="#E8503A"`) + `<text x="${x0 + 129}" y="1643.5" font-size="9" text-anchor="middle" fill="#FFFFFF" font-family="${PISMO.kanji}">あったか〜い</text>`;
  // ovládání: reklamní panel, mince, bankovky, displej, páčka
  s += obdelnik(x0 + 13, 1652, 96, 50, `rx="3" fill="#F4EFE4"`);
  s += kruh(x0 + 38, 1677, 18, `fill="#2E6FB8"`) + `<text x="${x0 + 38}" y="1684" font-size="20" text-anchor="middle" fill="#FFFFFF" font-family="${PISMO.kanji}">冷</text>`;
  s += `<text x="${x0 + 82}" y="1673" font-size="11" text-anchor="middle" fill="#C8322A" font-family="${PISMO.kanji}">いらっ</text><text x="${x0 + 82}" y="1688" font-size="11" text-anchor="middle" fill="#C8322A" font-family="${PISMO.kanji}">しゃい</text>`;
  s += obdelnik(x0 + 116, 1652, 50, 50, `rx="3" fill="#B5352B"`);
  s += obdelnik(x0 + 128, 1656, 26, 18, `rx="2" fill="#3A3A40"`) + obdelnik(x0 + 140, 1659, 2.5, 12, `fill="#9EA4AA"`);
  s += obdelnik(x0 + 122, 1678, 38, 8, `rx="2" fill="#3A3A40"`) + obdelnik(x0 + 126, 1681, 30, 2, `fill="#9EA4AA"`);
  s += obdelnik(x0 + 124, 1689, 26, 9, `fill="#20232A"`) + kruh(x0 + 157, 1694, 5, `fill="#D9DDE0"`);
  // výdejní klapka a vracení mincí
  s += obdelnik(x0 + 20, 1710, 120, 50, `rx="4" fill="#2A2528"`);
  s += obdelnik(x0 + 24, 1714, 112, 40, `rx="3" fill="#8E8A90"`) + obdelnik(x0 + 24, 1714, 112, 4, `fill="#B9B5BB"`);
  s += `<text x="${x0 + 80}" y="1740" font-size="9" text-anchor="middle" letter-spacing="1" fill="#E9E6EA" font-family="${PISMO.nadpis}">PUSH</text>`;
  s += `<text x="${x0 + 80}" y="1708" font-size="7.5" text-anchor="middle" fill="#F6D9D4" font-family="${PISMO.kanji}">取出口</text>`;
  s += obdelnik(x0 + 146, 1714, 22, 28, `rx="3" fill="#2A2528"`);
  // sokl a nožky
  s += obdelnik(x0, 1764, A.w, 21, `fill="#8E2A22"`);
  s += obdelniky([[x0 + 4, 1782, 12, 5], [x1 - 16, 1782, 12, 5]], `fill="#3A3A40"`);
  s += snih(obdelnik(x0 - 6, A.y - 8, A.w + 12, 9, `rx="4" fill="${O.snih}"`));
  // koše na plechovky a PET lahve
  for (const [bx, barva, napis] of [[2428, "#2E6FB8", "あきかん"], [2490, "#3F8E5F", "ペットボトル"]] as [number, string, string][]) {
    s += `<path d="M${bx + 4} 1788 L${bx + 60} 1788 L${bx + 92} 1798 L${bx + 34} 1798 Z" fill="${O.stin}" opacity="0.14"/>`;
    s += obdelnik(bx, 1694, 58, 92, `rx="5" fill="#E4E7EA"`) + obdelnik(bx + 50, 1694, 8, 92, `rx="3" fill="#C4C9CE"`);
    s += obdelnik(bx, 1690, 58, 10, `rx="4" fill="${barva}"`);
    s += elipsa(bx + 29, 1716, 16, 10, `fill="#3A3A40"`) + elipsa(bx + 29, 1714, 16, 8, `fill="#2A292E"`);
    s += obdelnik(bx + 4, 1742, 50, 16, `fill="${barva}"`);
    s += `<text x="${bx + 29}" y="1754" font-size="${napis.length > 4 ? 7.5 : 10}" text-anchor="middle" fill="#FFFFFF" font-family="${PISMO.kanji}">${napis}</text>`;
    s += snih(obdelnik(bx - 2, 1685, 62, 7, `rx="3" fill="${O.snih}"`));
  }
  return `<g class="krm-ok-automat-den">${s}</g>`;
}

/* ——— Kytky v květináčích ——— */
/** Kopinatý list (aspidistra, hosta) z paty do špičky */
const kopi = (x0: number, y0: number, x1: number, y1: number, sirka: number) => {
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const l = Math.hypot(dx, dy) || 1;
  const nx = (-dy / l) * sirka;
  const ny = (dx / l) * sirka;
  return `M${f(x0)} ${f(y0)} Q${f(mx + nx)} ${f(my + ny)} ${f(x1)} ${f(y1)} Q${f(mx - nx)} ${f(my - ny)} ${f(x0)} ${f(y0)} Z`;
};

/** Květináč: zúžený dolů, s okrajem, světlem vlevo a stínem vpravo */
function kvetinac(x: number, y: number, w: number, h: number, barva: string, svetla: string, tma: string, okraj = 9) {
  const z = w * 0.14;
  return (
    `<path d="M${f(x + w + 4)} ${f(y + h)} L${f(x + w + 52)} ${f(y + h + 12)} L${f(x + 40)} ${f(y + h + 12)} L${f(x + 6)} ${f(y + h)} Z" fill="${O.stin}" opacity="0.16"/>` +
    `<path d="M${f(x)} ${f(y)} H${f(x + w)} L${f(x + w - z)} ${f(y + h)} H${f(x + z)} Z" fill="${barva}"/>` +
    `<path d="M${f(x + w * 0.66)} ${f(y)} H${f(x + w)} L${f(x + w - z)} ${f(y + h)} H${f(x + w * 0.62)} Z" fill="${tma}"/>` +
    `<path d="M${f(x + w * 0.12)} ${f(y + okraj)} H${f(x + w * 0.24)} L${f(x + w * 0.26)} ${f(y + h - 4)} H${f(x + z + 4)} Z" fill="${svetla}" opacity="0.7"/>` +
    obdelnik(x - 3, y - okraj, w + 6, okraj, `rx="2" fill="${svetla}"`) +
    obdelnik(x + w * 0.62, y - okraj, w * 0.38 + 3, okraj, `rx="2" fill="${barva}"`) +
    obdelnik(x - 3, y, w + 6, 3, `fill="${O.stin}" opacity="0.2"`)
  );
}

function kytky() {
  let s = "";
  // vlevo: kamélie (椿) ve vysokém terakotovém, tsuwabuki v indigovém
  s += `<path d="M1066 1708 L1064 1676 M1065 1690 L1050 1672 M1065 1686 L1082 1666" stroke="#5E4636" stroke-width="4" stroke-linecap="round"/>`;
  s += `<path d="${chomac(1066, 1668, 36, 32, 15, 8101, 0.86, 0.58)}${chomac(1046, 1642, 22, 20, 11, 8102, 1, 0.58)}${chomac(1088, 1640, 22, 19, 11, 8103, 1, 0.58)}${chomac(1066, 1624, 20, 15, 10, 8104, 1, 0.58)}" fill="${O.listTma}"/>`;
  // lesklé listy po obvodu keře
  const listyK: number[][] = [[1030, 1662, 1022, 1650], [1034, 1690, 1024, 1696], [1100, 1660, 1112, 1650], [1098, 1688, 1110, 1694], [1052, 1620, 1046, 1608], [1082, 1618, 1090, 1606], [1066, 1612, 1068, 1604]];
  s += `<path d="${listyK.map(([x0, y0, x1, y1]) => kopi(x0, y0, x1, y1, 6)).join("")}" fill="${O.listTma}"/>`;
  s += `<path d="${chomac(1058, 1660, 26, 22, 12, 8111, 1, 0.58)}${chomac(1042, 1636, 14, 12, 9, 8112, 1, 0.58)}${chomac(1082, 1632, 14, 11, 9, 8113, 1, 0.58)}${chomac(1061, 1619, 12, 9, 8, 8114, 1, 0.58)}" fill="${O.list}"/>`;
  s += `<g fill="#A9C98F" opacity="0.8">${[[1046, 1650, -30], [1070, 1640, 20], [1052, 1676, -20], [1084, 1660, 30], [1036, 1630, -40]].map(([x, y, u]) => elipsa(x, y, 6, 2.6, `transform="rotate(${u} ${x} ${y})"`)).join("")}</g>`;
  // červené květy se žlutým středem
  const kvety: number[][] = [[1048, 1660], [1084, 1644], [1074, 1690], [1098, 1676], [1058, 1628], [1036, 1684], [1090, 1618]];
  s += `<path d="${kvety.map(([x, y]) => kolecko(x, y, 6.5)).join("")}" fill="#C23040"/>`;
  s += `<path d="${kvety.map(([x, y]) => kolecko(x - 1.5, y - 1.5, 3.6)).join("")}" fill="#E45C66"/>`;
  s += `<path d="${kvety.map(([x, y]) => kolecko(x, y, 1.8)).join("")}" fill="#F2C94C"/>`;
  s += snih(`<path d="M1040 1612 Q1066 1596 1092 1612 Z M1024 1640 Q1036 1630 1050 1640 Z" fill="${O.snih}"/>`);
  s += kvetinac(1038, 1710, 58, 75, "#B9683F", "#CF8257", "#9C5233", 10);
  // tsuwabuki: kulaté lesklé listy
  s += `<path d="M1124 1748 L1112 1718 M1124 1748 L1134 1712 M1124 1748 L1124 1728 M1124 1748 L1142 1732" stroke="#4E7A3E" stroke-width="2.4"/>`;
  for (const [x, y, r] of [[1110, 1716, 13], [1136, 1708, 14], [1123, 1727, 12], [1144, 1731, 10]] as [number, number, number][]) {
    s += kruh(x, y, r, `fill="${O.listTma}"`) + kruh(x - r * 0.25, y - r * 0.25, r * 0.6, `fill="${O.list}"`) + elipsa(x - r * 0.35, y - r * 0.4, r * 0.25, r * 0.14, `fill="#A9C98F" opacity="0.8"`);
  }
  s += `<path d="M1102 1752 Q1100 1786 1124 1786 Q1148 1786 1146 1752 Z" fill="#3E527E"/><path d="M1102 1752 Q1100 1786 1116 1786 Q1108 1770 1110 1752 Z" fill="#6E86B0"/>`;
  s += obdelnik(1099, 1746, 50, 7, `rx="3" fill="#4A6090"`);
  s += `<path d="M1146 1786 L1176 1794 L1132 1794 Z" fill="${O.stin}" opacity="0.15"/>`;

  // vpravo: bonsaj na stolečku a aspidistra v seladonovém
  s += `<path d="M2122 1784 L2160 1796 L2096 1796 Z" fill="${O.stin}" opacity="0.14"/>`;
  s += obdelnik(2054, 1729, 72, 10, `rx="2" fill="#8C6446"`) + obdelnik(2054, 1729, 72, 3, `fill="#A27450"`);
  s += obdelniky([[2060, 1739, 9, 46], [2111, 1739, 9, 46]], `fill="#6E4C34"`) + obdelnik(2060, 1764, 60, 5, `fill="#6E4C34"`);
  s += obdelnik(2066, 1716, 48, 13, `rx="2" fill="#5F7E9A"`) + obdelnik(2066, 1716, 48, 3, `fill="#86A2BC"`);
  s += `<path d="M2092 1716 C2088 1702 2070 1700 2074 1686 C2078 1674 2098 1676 2096 1662 C2095 1654 2088 1650 2090 1644" stroke="#5E4636" stroke-width="7" fill="none" stroke-linecap="round"/>`;
  s += `<path d="M2076 1690 L2060 1688 M2096 1668 L2112 1668" stroke="#5E4636" stroke-width="4" stroke-linecap="round"/>`;
  for (const [x, y, rx, ry, sd] of [[2066, 1686, 21, 9, 7701], [2108, 1667, 22, 10, 7702], [2088, 1648, 17, 8, 7703]] as [number, number, number, number, number][]) {
    s += `<path d="${chomac(x, y, rx, ry, 10, sd, 0.55, 0.62)}" fill="#3D5E3F"/>`;
    s += `<path d="${chomac(x - 3, y - 3, rx * 0.66, ry * 0.55, 8, sd + 50, 0.55, 0.62)}" fill="#5E8452"/>`;
  }
  s += snih(`<path d="M2048 1640 Q2066 1634 2084 1640 Z M2090 1660 Q2110 1652 2128 1660 Z M2074 1641 Q2088 1634 2102 1641 Z" fill="${O.snih}"/>` + obdelnik(2052, 1724, 76, 6, `rx="3" fill="${O.snih}"`));
  // aspidistra: dlouhé listy z paty
  const pata: Bod = [2147, 1702];
  const listyA: [number, number, number][] = [
    [2112, 1650, 9], [2126, 1634, 10], [2146, 1630, 10], [2166, 1636, 9], [2182, 1654, 8], [2120, 1672, 7], [2176, 1676, 7],
  ];
  listyA.forEach(([x, y, w], i) => {
    s += `<path d="${kopi(pata[0], pata[1], x, y, w)}" fill="${i % 2 ? O.list : O.listTma}"/>`;
  });
  s += `<path d="${listyA.slice(1, 4).map(([x, y]) => `M${pata[0]} ${pata[1]} Q${f((pata[0] + x) / 2 - 2)} ${f((pata[1] + y) / 2)} ${x} ${y}`).join("")}" stroke="${O.listSvetly}" stroke-width="1.4" fill="none" opacity="0.7"/>`;
  s += kvetinac(2126, 1708, 44, 77, "#93B3A2", "#B3CFC0", "#789A88", 8);

  // u dveří souseda: povijnice (朝顔) na bambusové mřížce, konvička
  s += `<path d="M2717 1736 V1590 M2729 1736 V1580 M2741 1736 V1594 M2712 1620 H2746 M2712 1680 H2746" stroke="#B59A60" stroke-width="2.4"/>`;
  s += `<path d="M2728 1736 C2716 1700 2742 1680 2726 1650 C2712 1626 2738 1604 2728 1584" stroke="#5E8A3E" stroke-width="2" fill="none"/>`;
  const srdce = (x: number, y: number, r: number) => `M${f(x)} ${f(y + r)} C${f(x - r * 1.4)} ${f(y)} ${f(x - r * 0.6)} ${f(y - r)} ${f(x)} ${f(y - r * 0.3)} C${f(x + r * 0.6)} ${f(y - r)} ${f(x + r * 1.4)} ${f(y)} ${f(x)} ${f(y + r)} Z`;
  s += `<path d="${[[2718, 1712, 8], [2738, 1690, 9], [2720, 1664, 8], [2740, 1640, 8], [2724, 1618, 7], [2738, 1600, 7], [2716, 1596, 6]].map(([x, y, r]) => srdce(x, y, r)).join("")}" fill="${O.list}"/>`;
  s += `<path d="${kolecko(2734, 1704, 8)}${kolecko(2716, 1650, 7.5)}${kolecko(2742, 1616, 7)}" fill="#5B6FC9"/><path d="${kolecko(2734, 1704, 3)}${kolecko(2716, 1650, 3)}${kolecko(2742, 1616, 2.6)}" fill="#F2F0FA"/>`;
  s += kvetinac(2710, 1738, 36, 47, "#B9683F", "#CF8257", "#9C5233", 7);
  // konvička
  s += `<path d="M2674 1786 L2700 1794 L2664 1794 Z" fill="${O.stin}" opacity="0.14"/>`;
  s += `<path d="M2652 1748 L2622 1726" stroke="#9AA3AA" stroke-width="5" stroke-linecap="round"/><path d="M2614 1720 L2626 1718 L2628 1732 Z" fill="#9AA3AA"/>`;
  s += obdelnik(2648, 1744, 44, 42, `rx="6" fill="#AEB6BC"`) + obdelnik(2648, 1744, 12, 42, `rx="5" fill="#C9D0D5"`);
  s += `<path d="M2654 1746 Q2670 1722 2688 1746" stroke="#8E979E" stroke-width="4" fill="none"/>`;
  return s;
}

/* ——— Stojan s tabulí (A) ——— */
function stojan() {
  const t = MISTA.tabule;
  const p = MISTA.tabulePlocha;
  let s = "";
  s += `<path d="M${t.x + 6} 1784 L${t.x + t.w - 2} 1784 L${t.x + t.w + 44} 1798 L${t.x + 52} 1798 Z" fill="${O.stin}" opacity="0.16"/>`;
  // nohy a rám
  s += obdelniky([[t.x, t.y, 15, t.h], [t.x + t.w - 15, t.y, 15, t.h]], `fill="${P.drevoSvetle}"`);
  s += obdelniky([[t.x, t.y, 4, t.h], [t.x + t.w - 15, t.y, 4, t.h]], `fill="${P.drevoHrana}"`);
  s += obdelniky([[t.x + 12, t.y, 3, t.h], [t.x + t.w - 3, t.y, 3, t.h]], `fill="${P.drevo}"`);
  s += obdelnik(t.x, t.y, t.w, 18, `fill="${P.drevoSvetle}"`) + obdelnik(t.x, t.y, t.w, 4, `fill="${P.drevoHrana}"`);
  s += obdelnik(t.x + 60, t.y + 5, 30, 7, `rx="3.5" fill="${P.drevoTma}"`);
  s += obdelnik(t.x, p.y + p.h, t.w, 16, `fill="${P.drevoSvetle}"`) + obdelnik(t.x, p.y + p.h + 13, t.w, 3, `fill="${P.drevo}"`);
  s += obdelnik(t.x + 8, 1762, t.w - 16, 7, `fill="${P.drevo}"`);
  // tabule (prázdná — křídou píše stránka)
  s += obdelnik(p.x, p.y, p.w, p.h, `fill="#2F473C"`);
  s += obdelnik(p.x, p.y, p.w, 4, `fill="#243A30"`) + obdelnik(p.x, p.y, 4, p.h, `fill="#243A30"`);
  // křídy na liště
  s += obdelnik(p.x + 76, p.y + p.h - 2, 16, 5, `rx="2" fill="#F4F1E8"`) + obdelnik(p.x + 96, p.y + p.h - 2, 11, 5, `rx="2" fill="#F2B8C0"`);
  s += obdelniky([[t.x + 2, 1781, 11, 5], [t.x + t.w - 13, 1781, 11, 5]], `fill="${P.drevoTma2}"`);
  s += snih(obdelnik(t.x - 3, t.y - 6, t.w + 6, 8, `rx="4" fill="${O.snih}"`));
  return s;
}

/* ——— Kolo (ママチャリ) opřené o lampu ——— */
/**
 * Bokorys: zadní osa v (0,0), přední v (146,0), pneumatiky stojí na y = 44.
 * Rám a kryt řetězu nemají barvu — dá ji <use> (stroke, fill), takže
 * stejný tvar poslouží i pro kola v kolárně u bytovky.
 */
function koloTvar() {
  const R = 44;
  const kolo = (cx: number) =>
    `<circle cx="${cx}" cy="0" r="${R - 3}" fill="none" stroke="#38383E" stroke-width="6"/><circle cx="${cx}" cy="0" r="${R - 8}" fill="none" stroke="#C3CACF" stroke-width="2.4"/>` +
    `<path d="${Array.from({ length: 9 }, (_, i) => {
      const a = (i / 9) * Math.PI;
      return `M${f(cx - Math.cos(a) * (R - 9))} ${f(-Math.sin(a) * (R - 9))} L${f(cx + Math.cos(a) * (R - 9))} ${f(Math.sin(a) * (R - 9))}`;
    }).join("")}" stroke="#CDD3D7" stroke-width="0.9"/><circle cx="${cx}" cy="0" r="5.5" fill="#9AA2A8"/>`;
  let s = kolo(0) + kolo(146);
  // blatníky
  s += `<path d="M-49 -9 A50 50 0 0 1 43 -25 M103 -25 A50 50 0 0 1 195 -9" stroke="#C3CACF" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
  // nosič vzadu
  s += `<path d="M-30 -54 H34 M-24 -54 L-3 -4 M34 -54 L44 -58" stroke="#B9C0C5" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  // rám: zadní stavba, sedlová trubka a nízká hlavní trubka (na ママチャリ se nastupuje snadno)
  s += `<path d="M44 -56 L0 0 L64 8" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  s += `<path d="M64 8 L44 -58 M121 -50 C104 -26 88 4 64 8" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  s += `<path d="M119 -66 L125 -38" stroke-width="9" fill="none" stroke-linecap="round"/>`;
  s += `<path d="M125 -38 Q138 -20 146 0" stroke="#C3CACF" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
  // kryt řetězu
  s += `<path d="M72 -2 C84 2 82 18 66 18 L6 9 C-6 7 -4 -8 8 -7 Z"/>`;
  s += `<path d="M12 -4 L66 -1" stroke="#FFFFFF" stroke-width="2" opacity="0.35"/>`;
  // kruhový zámek na zadním kole (リング錠)
  s += obdelnik(10, -27, 13, 10, `rx="2" fill="#5F666C"`);
  // klika a pedál
  s += `<path d="M64 8 L76 26" stroke="#5F666C" stroke-width="4.5" stroke-linecap="round"/>` + obdelnik(68, 24, 18, 5, `rx="2" fill="#38383E"`);
  // sedlovka, pérování a sedlo
  s += `<path d="M44 -58 L40 -74" stroke="#9AA2A8" stroke-width="5"/>`;
  s += `<path d="${kolecko(31, -72, 3.4)}${kolecko(49, -72, 3.4)}" stroke="#7E868D" stroke-width="2" fill="none"/>`;
  s += `<path d="M22 -80 Q38 -90 58 -82 Q56 -74 38 -74 Q26 -74 22 -80 Z" fill="#3A3433"/>`;
  // představec, řídítka zahnutá dozadu, gripy, zvonek
  s += `<path d="M119 -66 L117 -80 Q112 -88 98 -86 L84 -84" stroke="#C3CACF" stroke-width="4.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  s += obdelnik(76, -88, 14, 7, `rx="3" fill="#38383E"`) + kruh(102, -90, 4, `fill="#D9DDE0"`);
  // drátěný košík: přišroubovaný k hlavové trubce, podpěry k ose
  s += `<path d="M128 -64 L127 -46 M172 -64 L148 -4" stroke="#A3ABB1" stroke-width="2.4"/>`;
  s += `<path d="M124 -98 H178 L174 -64 H128 Z" fill="#B9C0C5" opacity="0.32"/>`;
  s += `<path d="M124 -98 H178 L174 -64 H128 Z M126 -87 H177 M127 -76 H175 M137 -98 L139 -64 M151 -98 V-64 M165 -98 L163 -64" stroke="#9EA6AC" stroke-width="2" fill="none"/>`;
  s += obdelnik(122, -101, 58, 5, `rx="2" fill="#C3CACF"`);
  // lampa na vidlici
  s += obdelnik(130, -34, 12, 9, `rx="3" fill="#E9E5D8"`) + obdelnik(141, -32, 3, 5, `fill="#F4E9B8"`);
  // stojánek (sklopený za zadním kolem)
  s += `<path d="M-2 6 L-22 16" stroke="#8E959B" stroke-width="3" stroke-linecap="round"/>`;
  return s;
}

function kola() {
  let s = "";
  // stín doprava dolů
  s += `<path d="M552 1786 L790 1786 L838 1798 L600 1798 Z" fill="${O.stin}" opacity="0.15"/>`;
  // kolo u lampy (rám pastelově tyrkysový) a dvě v kolárně u bytovky
  s += `<use href="#kd-ok-p-kolo" transform="translate(598 1741)" stroke="#79A9A1" fill="#79A9A1"/>`;
  s += `<path d="M3080 1786 L3220 1786 L3240 1796 L3100 1796 Z" fill="${O.stin}" opacity="0.14"/>`;
  s += `<use href="#kd-ok-p-kolo" transform="translate(3098 1741) scale(0.94 0.94)" stroke="#C9C5BC" fill="#C9C5BC"/>`;
  s += `<use href="#kd-ok-p-kolo" transform="translate(3150 1747) scale(0.9 0.9)" stroke="#8E6E6A" fill="#8E6E6A"/>`;
  s += snih(obdelnik(719, 1635, 62, 6, `rx="3" fill="${O.snih}"`) + obdelnik(620, 1647, 38, 5, `rx="2.5" fill="${O.snih}"`));
  return s;
}

/* ——— Drobnosti: stolička, koště, miska pro kočku ——— */
function drobnosti() {
  let s = "";
  // červená stolička u automatu
  const sx = 2606;
  s += `<path d="M${sx - 22} 1784 L${sx + 30} 1784 L${sx + 60} 1794 L${sx + 6} 1794 Z" fill="${O.stin}" opacity="0.16"/>`;
  s += `<path d="M${sx - 20} 1730 L${sx - 26} 1784 M${sx + 20} 1730 L${sx + 26} 1784" stroke="#C3CACF" stroke-width="3.2" stroke-linecap="round"/>`;
  s += `<path d="M${sx - 10} 1732 L${sx - 12} 1780 M${sx + 10} 1732 L${sx + 12} 1780" stroke="#8E959B" stroke-width="2.6" stroke-linecap="round"/>`;
  s += elipsa(sx, 1760, 22, 4, `fill="none" stroke="#B9C0C5" stroke-width="2.4"`);
  s += obdelnik(sx - 28, 1722, 56, 11, `rx="4" fill="#B5372A"`);
  s += elipsa(sx, 1722, 28, 7, `fill="#D84535"`) + elipsa(sx - 8, 1720, 12, 3, `fill="#EE7A68" opacity="0.8"`);
  s += snih(elipsa(sx, 1718, 26, 5, `fill="${O.snih}"`));
  // bambusové koště opřené o zeď mezi lucernou a automatem
  s += `<path d="M2234 1552 L2214 1720" stroke="#C2A564" stroke-width="5" stroke-linecap="round"/>`;
  s += `<path d="M2231 1580 l5 1 M2227 1616 l5 1 M2222 1652 l5 1 M2218 1688 l5 1" stroke="#9C8448" stroke-width="2.2"/>`;
  s += `<path d="M2206 1714 L2222 1716 L2242 1786 L2178 1786 Z" fill="#8E7A4A"/><path d="M2210 1730 L2196 1784 M2216 1730 L2212 1784 M2222 1730 L2228 1784" stroke="#6E5E36" stroke-width="1.6"/>`;
  s += obdelnik(2204, 1712, 20, 7, `rx="2" fill="#7A5236"`);
  // miska pro kočku u dveří souseda
  s += `<path d="M2554 1774 H2580 L2576 1786 H2558 Z" fill="#E9E2D2"/>` + obdelnik(2552, 1771, 30, 4, `rx="2" fill="#C4432B"`);
  return s;
}

/* =====================================================================
 *  SVĚTLA
 * ===================================================================== */
const defsSvetla = () => `<defs>
  <linearGradient id="kd-ok-s-teple" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE2A6"/><stop offset="1" stop-color="#EFA458"/></linearGradient>
  <radialGradient id="kd-ok-s-roh" cx="0.18" cy="0.92" r="1.05"><stop offset="0" stop-color="#FFDDA2"/><stop offset="0.42" stop-color="#F3A860" stop-opacity="0.72"/><stop offset="1" stop-color="#D8884A" stop-opacity="0.1"/></radialGradient>
  <radialGradient id="kd-ok-s-rohP" cx="0.82" cy="0.92" r="1.05"><stop offset="0" stop-color="#FFDDA2"/><stop offset="0.42" stop-color="#F3A860" stop-opacity="0.72"/><stop offset="1" stop-color="#D8884A" stop-opacity="0.1"/></radialGradient>
  <linearGradient id="kd-ok-s-zatazeno" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EFB06A"/><stop offset="1" stop-color="#D2843F"/></linearGradient>
  <linearGradient id="kd-ok-s-tv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7F98DA"/><stop offset="0.65" stop-color="#9DB6F0"/><stop offset="1" stop-color="#6A7FC8"/></linearGradient>
  <linearGradient id="kd-ok-s-bile" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EEF5FC"/><stop offset="1" stop-color="#BCD0E6"/></linearGradient>
  <radialGradient id="kd-ok-s-haloT" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${SVIT.zar}" stop-opacity="0.4"/><stop offset="1" stop-color="${SVIT.zar}" stop-opacity="0"/></radialGradient>
  <radialGradient id="kd-ok-s-haloB" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${SVIT.zarivka}" stop-opacity="0.3"/><stop offset="1" stop-color="${SVIT.zarivka}" stop-opacity="0"/></radialGradient>
  <linearGradient id="kd-ok-s-kuzel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${SVIT.zar}" stop-opacity="0.24"/><stop offset="1" stop-color="${SVIT.zar}" stop-opacity="0"/></linearGradient>
  <linearGradient id="kd-ok-s-kuzelB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${SVIT.zarivka}" stop-opacity="0.2"/><stop offset="1" stop-color="${SVIT.zarivka}" stop-opacity="0.02"/></linearGradient>
  <pattern id="kd-ok-s-zaluzie" width="12" height="9" patternUnits="userSpaceOnUse"><rect width="12" height="9" fill="#E9B26C" opacity="0.35"/><rect y="6.5" width="12" height="2.5" fill="#9A5E2C" opacity="0.7"/></pattern>
  <pattern id="kd-ok-s-sudare" width="20" height="5" patternUnits="userSpaceOnUse"><rect y="3.4" width="20" height="1.6" fill="#7A4C26" opacity="0.8"/></pattern>
  <radialGradient id="kd-ok-s-automat" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#EAF6FF" stop-opacity="0.32"/><stop offset="0.5" stop-color="#D6ECFF" stop-opacity="0.1"/><stop offset="1" stop-color="#D6ECFF" stop-opacity="0"/></radialGradient>
  ${tvaryNapoju("kd-ok-s", 0.5)}
  ${DEFS_SVETLA.join("")}
</defs>`;

function svitAutomatu() {
  const x0 = A.x;
  let panel = "";
  panel += elipsa(x0 + 90, 1560, 190, 240, `fill="url(#kd-ok-s-automat)"`);
  panel += obdelnik(x0 + 13, 1453, A.w - 26, 178, `fill="#F6FBFF"`);
  panel += vzorky("kd-ok-s");
  RADY.forEach((y, ri) => {
    panel += obdelnik(x0 + 13, y + 44, A.w - 26, 12, `fill="#1E222C"`);
    panel += `<path d="${CENY[ri].map((_, i) => `M${f(x0 + 18 + i * 25.6)} ${y + 50}h15v4h-15z`).join("")}" fill="${ri === 2 ? "#FF8A7A" : "#8FD0FF"}"/>`;
  });
  panel += obdelnik(x0 + 14, 1634, 74, 12, `rx="2" fill="#3E8AE0"`) + obdelnik(x0 + 92, 1634, 74, 12, `rx="2" fill="#F05A4A"`);
  panel += `<text x="${x0 + 51}" y="1643.5" font-size="9" text-anchor="middle" fill="#FFFFFF" font-family="${PISMO.kanji}">つめた〜い</text><text x="${x0 + 129}" y="1643.5" font-size="9" text-anchor="middle" fill="#FFFFFF" font-family="${PISMO.kanji}">あったか〜い</text>`;
  panel += obdelnik(x0 + 124, 1689, 26, 9, `fill="#0E2A16"`) + `<text x="${x0 + 137}" y="1696.5" font-size="7.5" text-anchor="middle" fill="#7DFF9A" font-family="${PISMO.text}">0</text>`;
  panel += obdelnik(x0 + 128, 1656, 26, 18, `rx="2" fill="none" stroke="#8FD0FF" stroke-width="1.4" opacity="0.8"`);
  panel += obdelnik(x0 + 24, 1714, 112, 3, `fill="#D6ECFF" opacity="0.5"`);
  const zem = elipsa(x0 + 96, 1804, 200, 34, `fill="url(#kd-ok-s-automat)"`) + elipsa(x0 + 90, 1794, 120, 18, `fill="url(#kd-ok-s-automat)"`);
  return svetlo(PRAH.automat, panel, "krm-ok-automat") + svetlo(PRAH.rozliti, zem, "krm-ok-automat krm-ok-automat-zem");
}

/* =====================================================================
 *  SLOŽENÍ
 * ===================================================================== */
export function okoli(): Vrstvy {
  DEFS_ZADNI = [];
  DEFS_SVETLA = [];
  const l1 = domL1();
  const l2 = domL2();
  const r1 = domR1();
  const r2 = domR2();
  const st = strom();
  const pd = sloupPDoplnky();

  const zadni = [
    defsZadni(),
    st.defs,
    // strom za pravým sousedem (kmen schová dům)
    `<g class="krm-ok-strom">${st.zadni}</g>`,
    r1.den,
    `<g class="krm-ok-strom-pred">${st.predni}</g>`,
    r2.den,
    l1.den,
    l2.den,
    spary(),
    sloup(SL, true),
    sloupLDoplnky(),
    sloup(SP, false),
    pd.den,
  ].join("\n");

  const predni = [
    `<defs>${tvaryNapoju("kd-ok-p", 0.35)}<g id="kd-ok-p-kolo">${koloTvar()}</g></defs>`,
    draty(),
    automat(),
    kytky(),
    stojan(),
    kola(),
    drobnosti(),
  ].join("\n");

  const svetla = [
    defsSvetla(),
    ...l1.svit,
    ...l2.svit,
    ...r1.svit,
    ...r2.svit,
    pd.svit,
    svitAutomatu(),
  ]
    .filter(Boolean)
    .join("\n");

  return { zadni, zem: zem(), predni, svetla };
}
