/**
 * Kresba úrovně 二 Kiku-neri — hnětací stůl s velkou hroudou a nad ním
 * dráha s notami jako v taiko. Čistý generátor bez DOM: vrací SVG a HTML
 * jako text (Hneteni.astro ho vkládá přes set:html, testy přímo).
 *
 * Vrstvy v .mu-okno odspodu:
 *   svg.mu-kresba        zeď, nářadí, stůl s plátnem a hrouda — v ní
 *                        rozeta chryzantémy (40 záhybů, objevují se po
 *                        jednom), vzduchové bublinky po minutí a částice
 *   svg.mn2-draha-svg    dráha: rám, plátěný pruh, terč, taktové čáry,
 *                        válec, noty, buben s počtem v řadě, nápisy
 *   div.mn2-bublinka     Bublinka v důlku v hroudě (kresba postavičky se
 *                        vkládá v .astro, tady jen důlek a hliněný lem)
 *
 * Dráha je zvlášť, protože se hýbe každý snímek — prohlížeč pak nemusí
 * pokaždé překreslovat i stůl s hroudou.
 *
 * Souřadnice: viewBox 800 × 560, dráha nahoře (y 26–154), hrouda leží
 * na plátně kolem x 410, spodek na y 454.
 */

export const SIRKA = 800;
export const VYSKA = 560;

/** Vnitřní plátěný pruh dráhy */
export const DRAHA = { x0: 100, x1: 776, y0: 40, y1: 140, y: 90 };
/** Terč — sem má nota dojet přesně ve chvíli úderu */
export const TERC_X = 166;
/** Jak rychle jedou noty (jednotek za sekundu): přes dráhu za necelé dvě sekundy */
export const RYCHLOST = 330;
export const R_NOTY = 32;
export const R_VELKE = 45;

/** Kolem čeho se hrouda mačká: střed a spodek na plátně */
export const HROUDA = { cx: 410, zaklad: 454 };
/**
 * Rozeta záhybů na čele hroudy: střed, poloměr ve vlastní rovině, jak je
 * čelo nakloněné k divákovi (svislé zkrácení) a kde leží první záhyb.
 */
export const ROZETA = { cx: 386, cy: 366, r: 146, sklon: 0.6, prvni: (-78 * Math.PI) / 180 };
export const PLATKU = 40;
/** Záhyby jdou proti směru hodin, hrouda se otáčí po směru — nový záhyb tak vzniká pořád na stejném místě, jako pod rukama */
export const KROK_PLATKU = (2 * Math.PI) / PLATKU;

/** Kudy Bublinku hnětení vytlačuje: od vršku hroudy k pravému rameni (body na povrchu) */
export const CESTA_BUBLINKY: [number, number][] = [
  [452, 243],
  [500, 247],
  [544, 262],
  [578, 284],
  [602, 312],
];
/** Jak se obal Bublinky v bodech cesty naklání podle povrchu (stupně) */
export const NAKLON_BUBLINKY = [-2, 3, 9, 15, 21];
/** Obal Bublinky: čtverec 130 jednotek, důlek je 92 jednotek pod jeho horním okrajem */
export const BUBLINKA = { velikost: 130, dulek: 92 };
/** Jak hluboko v hlíně Bublinka je (v jednotkách její kresby 180 × 180): na začátku jen oči, na konci skoro venku */
export const PONOR = { hluboko: 34, venku: 4 };

/** Místa, kde se po minutí objeví vzduchová bublinka: x, y, poloměr */
export const BUBLINY: [number, number, number][] = [
  [258, 330, 8],
  [540, 404, 9],
  [338, 262, 6.5],
  [236, 400, 7],
  [600, 360, 7.5],
  [452, 440, 6],
  [312, 436, 6.5],
  [604, 412, 5.5],
];

const f = (n: number) => (Math.round(n * 10) / 10).toString();

/** Výchozí poloha obalu Bublinky a její hloubka — než to převezme skript */
export const bublinkaStyl = {
  obal: `transform: translate(${f(((CESTA_BUBLINKY[0][0] - BUBLINKA.velikost / 2) / BUBLINKA.velikost) * 100)}%, ${f(((CESTA_BUBLINKY[0][1] - BUBLINKA.dulek) / BUBLINKA.velikost) * 100)}%) rotate(${NAKLON_BUBLINKY[0]}deg)`,
  telo: `transform: translateY(${f((PONOR.hluboko / 180) * 100)}%)`,
};

/** Hladká uzavřená křivka přes body (Catmull–Rom jako Bézier) */
function uzavrena(body: [number, number][]) {
  const n = body.length;
  let d = `M${f(body[0][0])} ${f(body[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = body[(i - 1 + n) % n];
    const p1 = body[i];
    const p2 = body[(i + 1) % n];
    const p3 = body[(i + 2) % n];
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + " Z";
}

/**
 * Hrouda po kiku-neri vypadá jako ležící ulita: vepředu skloněné čelo,
 * na kterém se záhyby skládají do květu, a za ním hřbet, který se zvedá
 * dozadu doprava. Obrys hřbetu je celá silueta, čelo leží navrch.
 */
const HRBET: [number, number][] = [
  [216, 436], [204, 390], [214, 338], [246, 296], [300, 264], [370, 244], [446, 236],
  [516, 244], [572, 268], [612, 306], [630, 356], [626, 410], [604, 448], [540, 458], [420, 460], [292, 458],
];
export const OBRYS_HROUDY = uzavrena(HRBET);

/** Čelo: elipsa se zploštělým spodkem, jak sedí na plátně */
const CELO_BODY: [number, number][] = Array.from({ length: 20 }, (_, i) => {
  const u = (i / 20) * Math.PI * 2;
  const x = ROZETA.cx + Math.cos(u) * 184;
  const y = ROZETA.cy - 4 + Math.sin(u) * 104;
  return [x, Math.min(y, 452 + Math.sin(u) * 2)] as [number, number];
});
const OBRYS_CELA = uzavrena(CELO_BODY);

/* ——— Rozeta ——— */

/**
 * Záhyb kiku-neri: dlouhý stočený lístek od středu rozety k okraji, u
 * středu tenký, k okraji se rozšiřuje a končí oblým koncem. k-tý záhyb
 * leží o KROK_PLATKU proti směru hodin od předchozího. Souřadnice jsou ve
 * vlastní rovině rozety se středem v 0 0 (na obrazovce ji pak zkrátí sklon).
 */
export function platky() {
  const R = ROZETA.r;
  const rIn = 12;
  const zkrut = 0.52;
  const W = 17.5;
  return Array.from({ length: PLATKU }, (_, k) => {
    const a = ROZETA.prvni - k * KROK_PLATKU;
    const stred = (u: number): [number, number] => {
      const r = rIn + (R - rIn) * u;
      const uhel = a + zkrut * Math.pow(u, 1.25);
      return [Math.cos(uhel) * r, Math.sin(uhel) * r];
    };
    const sirka = (u: number) => W * (0.1 + 0.9 * Math.pow(Math.sin(Math.min(1, u / 0.86) * (Math.PI / 2)), 1.15));
    const levy: [number, number][] = [];
    const pravy: [number, number][] = [];
    const KROKU = 8;
    for (let i = 0; i <= KROKU; i++) {
      const u = (i / KROKU) * 0.94;
      const [x, y] = stred(u);
      const [x2, y2] = stred(u + 0.01);
      const dl = Math.hypot(x2 - x, y2 - y);
      const nx = -(y2 - y) / dl;
      const ny = (x2 - x) / dl;
      const w = sirka(u);
      levy.push([x + nx * w, y + ny * w]);
      pravy.push([x - nx * w, y - ny * w]);
    }
    /* Oblý konec za posledním bodem */
    const spicka = stred(1.02);
    const body = [...levy, spicka, ...pravy.reverse()];
    const d = uzavrena(body);
    const hreben = stred(0.12);
    const h2 = stred(0.5);
    const h3 = stred(0.9);
    const ryha = `M${f(hreben[0])} ${f(hreben[1])} Q${f(h2[0])} ${f(h2[1])} ${f(h3[0])} ${f(h3[1])}`;
    return { k, d, ryha };
  });
}

/**
 * Posun světla a stínu záhybů ve vlastní rovině rozety tak, aby na
 * obrazovce padalo světlo pořád zleva shora, ať je rozeta otočená jakkoli.
 */
export function posunyReliefu(natoceni: number) {
  const c = Math.cos(-natoceni);
  const s = Math.sin(-natoceni);
  const prevod = (x: number, y: number) => {
    const ly = y / ROZETA.sklon;
    return [x * c - ly * s, x * s + ly * c];
  };
  const [sx, sy] = prevod(2.2, 2.8);
  const [hx, hy] = prevod(-1.4, -1.8);
  return { sx, sy, hx, hy };
}

function rozeta() {
  const r = posunyReliefu(0);
  const styl = `--mn2-sx:${f(r.sx)}px;--mn2-sy:${f(r.sy)}px;--mn2-hx:${f(r.hx)}px;--mn2-hy:${f(r.hy)}px`;
  /* Každý nový záhyb se položí přes předchozí, jako šindel */
  const g = platky()
    .map(
      (p) =>
        `<g class="mn2-platek" data-platek="${p.k}">` +
        `<path class="mn2-pl-stin" d="${p.d}" fill="#4A3326" opacity="0.55" transform="translate(${f(r.sx)} ${f(r.sy)})"/>` +
        `<path class="mn2-pl-svetlo" d="${p.d}" fill="#EBD0B2" opacity="0.9" transform="translate(${f(r.hx)} ${f(r.hy)})"/>` +
        `<path d="${p.d}" fill="#B08A6C" stroke="#7A5642" stroke-width="0.9" stroke-opacity="0.45"/>` +
        `<path d="${p.ryha}" fill="none" stroke="#E2C2A2" stroke-width="2.2" stroke-linecap="round" opacity="0.55"/>` +
        `</g>`,
    )
    .join("");
  return (
    `<g class="mn2-rozeta-pozice" transform="translate(${ROZETA.cx} ${ROZETA.cy}) scale(1 ${ROZETA.sklon})">` +
    `<g class="mn2-rotor" style="${styl}">${g}` +
    /* Pupek rozety — tam se záhyby sbíhají */
    `<circle r="11" fill="#7A5642" opacity="0.5"/><circle r="7" cx="-1" cy="-1.5" fill="#C9A386" opacity="0.7"/>` +
    `</g>` +
    `</g>`
  );
}

/* ——— Noty (symboly) ——— */

/** Dlaň: otisk ruky, jak se do hlíny tlačí */
const DLAN =
  `<path d="M-8.6 1.2 Q-8.6 -2.6 -4.8 -2.6 L4.8 -2.6 Q8.6 -2.6 8.6 1.2 L8.6 7.2 Q8.6 14.6 0 14.6 Q-8.6 14.6 -8.6 7.2 Z"/>` +
  `<path d="M-6.4 -1 L-7 -10.6 M-2.2 -2 L-2.3 -14.2 M2.2 -2 L2.5 -13.2 M6.3 -1 L7.1 -9.2 M-7.6 6.4 L-13.6 -0.6" fill="none" stroke-width="4.2" stroke-linecap="round"/>`;

/** Šipka dokola po směru hodin */
function sipka(r: number) {
  const a0 = (160 * Math.PI) / 180;
  const a1 = (40 * Math.PI) / 180;
  const x0 = Math.cos(a0) * r, y0 = Math.sin(a0) * r;
  const x1 = Math.cos(a1) * r, y1 = Math.sin(a1) * r;
  const tx = Math.cos(a1 + Math.PI / 2), ty = Math.sin(a1 + Math.PI / 2);
  const hrot = [x1 + tx * 5.4, y1 + ty * 5.4];
  const k1 = [x1 - tx * 1.4 + Math.cos(a1) * 4.6, y1 - ty * 1.4 + Math.sin(a1) * 4.6];
  const k2 = [x1 - tx * 1.4 - Math.cos(a1) * 4.6, y1 - ty * 1.4 - Math.sin(a1) * 4.6];
  return (
    `<path d="M${f(x0)} ${f(y0)} A${r} ${r} 0 1 1 ${f(x1 - tx * 0.6)} ${f(y1 - ty * 0.6)}" fill="none" stroke-width="3.8" stroke-linecap="round"/>` +
    `<path d="M${f(hrot[0])} ${f(hrot[1])} L${f(k1[0])} ${f(k1[1])} L${f(k2[0])} ${f(k2[1])} Z" stroke-width="1.2" stroke-linejoin="round"/>`
  );
}

function symboly() {
  return (
    `<radialGradient id="mn2-g-tlac" cx="0.38" cy="0.32" r="0.75">` +
    `<stop offset="0" stop-color="#E8735A"/><stop offset="0.55" stop-color="#C4432B"/><stop offset="1" stop-color="#A2341F"/></radialGradient>` +
    `<radialGradient id="mn2-g-otoc" cx="0.38" cy="0.32" r="0.75">` +
    `<stop offset="0" stop-color="#5675A8"/><stop offset="0.55" stop-color="#34507F"/><stop offset="1" stop-color="#22385E"/></radialGradient>` +
    `<radialGradient id="mn2-g-zlato" cx="0.4" cy="0.3" r="0.8">` +
    `<stop offset="0" stop-color="#FBE6A6"/><stop offset="0.6" stop-color="#E8B440"/><stop offset="1" stop-color="#B9852A"/></radialGradient>` +
    /* Tlač: plný rumělkový kotouč s dlaní */
    `<g id="mn2-n-t"><g transform="scale(${f(R_NOTY / 29)})">` +
    `<circle r="29" cy="3" fill="#3A1A10" opacity="0.22"/>` +
    `<circle r="29" fill="#86291A"/>` +
    `<circle r="26.4" fill="url(#mn2-g-tlac)"/>` +
    `<ellipse cx="-8" cy="-13.5" rx="11" ry="5" fill="#FFFFFF" opacity="0.3" transform="rotate(-28 -8 -13.5)"/>` +
    `<g fill="#FFF3E2" stroke="#FFF3E2">${DLAN}</g>` +
    `</g></g>` +
    /* Otoč: indigový prsten se šipkou */
    `<g id="mn2-n-o"><g transform="scale(${f(R_NOTY / 29)})">` +
    `<circle r="29" cy="3" fill="#121A30" opacity="0.22"/>` +
    `<circle r="29" fill="url(#mn2-g-otoc)"/>` +
    `<circle r="18.2" fill="#F7EFDE"/>` +
    `<circle r="18.2" fill="none" stroke="#1A2A4A" stroke-width="1.4" opacity="0.45"/>` +
    `<g fill="#2E4B7C" stroke="#2E4B7C">${sipka(10.2)}</g>` +
    `<path d="M-20 -12 A23 23 0 0 1 -4 -23.4" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity="0.32"/>` +
    `</g></g>` +
    /* Velké noty: zlatý lem */
    `<g id="mn2-n-tv"><circle r="${R_VELKE}" cy="3.4" fill="#3A1A10" opacity="0.22"/><circle r="${R_VELKE}" fill="url(#mn2-g-zlato)"/><circle r="${R_VELKE - 2}" fill="none" stroke="#FFF4C8" stroke-width="1.4" opacity="0.7"/><use href="#mn2-n-t" transform="scale(1.22)"/></g>` +
    `<g id="mn2-n-ov"><circle r="${R_VELKE}" cy="3.4" fill="#121A30" opacity="0.22"/><circle r="${R_VELKE}" fill="url(#mn2-g-zlato)"/><circle r="${R_VELKE - 2}" fill="none" stroke="#FFF4C8" stroke-width="1.4" opacity="0.7"/><use href="#mn2-n-o" transform="scale(1.22)"/></g>`
  );
}

/* ——— Pozadí: zeď, nářadí, stůl ——— */

function pozadi() {
  return (
    /* Zeď a teplé ranní světlo zprava */
    `<rect width="800" height="560" fill="url(#mn2-zed)"/>` +
    `<rect width="800" height="400" fill="url(#mn2-svetlo)"/>` +
    `<path d="M560 154 L800 154 L800 380 L700 380 Z" fill="#FFF6DE" opacity="0.18"/>` +
    /* Lišta na nářadí vlevo: drát s kolíčky, žebro, očko */
    `<g transform="translate(0 14)">` +
    `<rect x="26" y="196" width="196" height="12" rx="3" fill="#A27B55"/>` +
    `<path d="M26 208 H222" stroke="#7A5A3C" stroke-width="2"/>` +
    `<g fill="#6E5236"><circle cx="52" cy="202" r="3"/><circle cx="118" cy="202" r="3"/><circle cx="176" cy="202" r="3"/></g>` +
    /* drát na řezání hlíny */
    `<path d="M52 204 C40 236 36 268 44 296 M52 204 C66 236 74 270 70 298" stroke="#9AA2A8" stroke-width="1.4" fill="none"/>` +
    `<rect x="36" y="292" width="14" height="24" rx="5" fill="#B08660" transform="rotate(8 43 304)"/>` +
    `<rect x="64" y="294" width="14" height="24" rx="5" fill="#A27B55" transform="rotate(-6 71 306)"/>` +
    /* dřevěné žebro */
    `<path d="M118 205 L118 214" stroke="#6E5236" stroke-width="2"/>` +
    `<path d="M100 216 C112 210 128 210 138 218 C146 236 140 262 122 270 C108 266 98 250 98 234 C98 226 98 220 100 216 Z" fill="#D2A770" stroke="#8A6038" stroke-width="1.4"/>` +
    `<circle cx="118" cy="230" r="4" fill="#8A6038" opacity="0.55"/>` +
    /* očko */
    `<path d="M176 205 V214" stroke="#6E5236" stroke-width="2"/>` +
    `<rect x="171" y="214" width="10" height="44" rx="4" fill="#B08660"/>` +
    `<path d="M172 258 C164 268 166 282 176 284 C186 282 188 268 180 258" stroke="#8C949B" stroke-width="2.4" fill="none"/>` +
    `</g>` +
    /* Polička vpravo s miskami, co schnou */
    `<g transform="translate(0 30)">` +
    `<rect x="640" y="262" width="150" height="9" fill="#9A7350"/>` +
    `<path d="M640 271 H790" stroke="#6E5236" stroke-width="2"/>` +
    `<path d="M664 271 L658 292 M766 271 L772 292" stroke="#6E5236" stroke-width="4" stroke-linecap="round"/>` +
    `<path d="M652 262 C650 246 660 238 676 238 C692 238 702 246 700 262 Z" fill="#DCCDBA" stroke="#B5A48E" stroke-width="1"/>` +
    `<path d="M656 246 C668 242 686 242 698 246" stroke="#EFE5D6" stroke-width="2" fill="none"/>` +
    `<path d="M716 262 L718 226 L746 226 L748 262 Z" fill="#E2D5C2" stroke="#B5A48E" stroke-width="1"/>` +
    `<ellipse cx="732" cy="226" rx="14" ry="3.4" fill="#C9B8A0"/>` +
    `<path d="M760 262 C758 252 764 246 772 246 C780 246 786 252 784 262 Z" fill="#D3C2AB" stroke="#B5A48E" stroke-width="1"/>` +
    `</g>` +
    /* Kde zeď potkává stůl */
    `<rect x="0" y="372" width="800" height="12" fill="#B9A688" opacity="0.5"/>` +
    /* Stůl: plátno přes desku, dřevěná hrana, nohy */
    `<path d="M0 380 L800 380 L800 488 L0 488 Z" fill="url(#mn2-platno)"/>` +
    `<path d="M0 383 H800" stroke="#CDBFA6" stroke-width="3"/>` +
    `<path d="M0 476 H800" stroke="#CDBC9E" stroke-width="1.6" stroke-dasharray="7 6" opacity="0.8"/>` +
    `<rect x="0" y="488" width="800" height="28" fill="url(#mn2-hrana)"/>` +
    `<path d="M0 489 H800" stroke="#C69C70" stroke-width="2"/>` +
    `<rect x="0" y="516" width="800" height="44" fill="url(#mn2-pod-stolem)"/>` +
    /* Pod stolem ve stínu: pytel hlíny a kbelík s břečkou */
    `<path d="M128 560 C122 540 130 526 150 522 C170 518 204 518 224 524 C240 530 244 546 240 560 Z" fill="#9A8462"/>` +
    `<path d="M168 522 C172 514 182 512 190 516" stroke="#7A6648" stroke-width="3" fill="none" stroke-linecap="round"/>` +
    `<path d="M150 534 C168 530 196 530 222 536" stroke="#857052" stroke-width="1.6" fill="none" opacity="0.7"/>` +
    `<path d="M566 560 L572 528 L640 528 L646 560 Z" fill="url(#mn2-kbelik)"/>` +
    `<ellipse cx="606" cy="528" rx="34" ry="6" fill="#7E878C"/>` +
    `<ellipse cx="606" cy="529" rx="30" ry="4.4" fill="#8E6A52"/>` +
    `<path d="M576 527 C584 512 628 512 636 527" stroke="#5E666B" stroke-width="2" fill="none"/>` +
    `<rect x="64" y="516" width="28" height="44" fill="#6A4E34"/>` +
    `<rect x="708" y="516" width="28" height="44" fill="#6A4E34"/>` +
    `<rect x="92" y="540" width="616" height="7" fill="#5E4530" opacity="0.8"/>` +
    `<rect x="0" y="516" width="800" height="10" fill="#2B2018" opacity="0.3"/>` +
    /* Vlevo na plátně dvě hotové koule, připravené na kruh */
    `<ellipse cx="128" cy="446" rx="62" ry="10" fill="url(#mn2-stin)"/>` +
    `<circle cx="104" cy="422" r="26" fill="url(#mn2-koule)"/>` +
    `<circle cx="154" cy="428" r="21" fill="url(#mn2-koule)"/>` +
    `<path d="M88 410 C94 402 104 399 112 400" stroke="#E3C7AA" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.7"/>` +
    `<path d="M142 418 C146 412 154 410 160 411" stroke="#E3C7AA" stroke-width="2.6" stroke-linecap="round" fill="none" opacity="0.7"/>` +
    /* Vpravo kostka čerstvé hlíny, ještě nehnětená, s drátem, kterým se z ní krájí */
    `<ellipse cx="712" cy="458" rx="80" ry="11" fill="url(#mn2-stin)"/>` +
    `<path d="M650 454 L652 418 L672 402 L764 402 L772 420 L770 454 Z" fill="url(#mn2-kostka)"/>` +
    `<path d="M652 418 L672 402 L764 402 L772 420 L762 424 L660 424 Z" fill="#BE9A7D"/>` +
    `<path d="M672 402 L764 402" stroke="#DCC0A4" stroke-width="2"/>` +
    `<path d="M660 424 L762 424" stroke="#7A5844" stroke-width="1.2" opacity="0.5"/>` +
    `<path d="M664 440 C694 436 726 442 760 437" stroke="#6E5040" stroke-width="1.2" fill="none" opacity="0.4"/>` +
    `<path d="M700 412 C708 402 720 396 732 398 C744 400 750 410 748 420" stroke="#9AA2A8" stroke-width="1.4" fill="none"/>` +
    `<rect x="690" y="408" width="10" height="20" rx="4" fill="#B08660" transform="rotate(-20 695 418)"/>` +
    `<rect x="744" y="416" width="10" height="20" rx="4" fill="#A27B55" transform="rotate(18 749 426)"/>` +
    /* Na zdi papír s náčrtem: tak má hrouda vypadat */
    `<g transform="rotate(3 712 205)">` +
    `<rect x="664" y="168" width="96" height="78" rx="2" fill="#FBF6EA"/>` +
    `<rect x="664" y="168" width="96" height="78" rx="2" fill="none" stroke="#D9CCB2" stroke-width="1"/>` +
    `<circle cx="712" cy="172" r="3.4" fill="#C4432B"/>` +
    `<g fill="none" stroke="#5C5047" stroke-width="1.3" stroke-linecap="round" opacity="0.85">` +
    `<ellipse cx="712" cy="206" rx="30" ry="19"/>` +
    `<path d="M712 206 C722 194 734 194 738 202 M712 206 C726 206 734 214 730 220 M712 206 C716 218 708 226 700 224 M712 206 C700 214 688 210 686 202 M712 206 C700 198 700 188 708 188"/>` +
    `</g>` +
    `<text x="712" y="240" text-anchor="middle" font-family="Caveat, cursive" font-size="15" fill="#5C5047">kiku-neri</text>` +
    `</g>` +
    /* Drobky hlíny na plátně */
    `<g fill="#9C7860" opacity="0.75"><ellipse cx="222" cy="470" rx="5" ry="2.4"/><ellipse cx="238" cy="478" rx="3" ry="1.6"/><ellipse cx="610" cy="472" rx="4" ry="2"/><ellipse cx="596" cy="480" rx="2.6" ry="1.4"/><ellipse cx="300" cy="476" rx="2.4" ry="1.3"/></g>` +
    `<path d="M250 470 C270 466 292 468 312 466" stroke="#BFA88E" stroke-width="5" stroke-linecap="round" fill="none" opacity="0.45"/>`
  );
}

function prechody() {
  return (
    `<linearGradient id="mn2-zed" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F2EADB"/><stop offset="0.66" stop-color="#E3D5BE"/><stop offset="1" stop-color="#D6C6AA"/></linearGradient>` +
    `<radialGradient id="mn2-svetlo" cx="0.92" cy="0.42" r="0.6"><stop offset="0" stop-color="#FFF4D6" stop-opacity="0.7"/><stop offset="1" stop-color="#FFF4D6" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="mn2-platno" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#DCCFB6"/><stop offset="0.35" stop-color="#E9DEC8"/><stop offset="1" stop-color="#F2E9D7"/></linearGradient>` +
    `<linearGradient id="mn2-pod-stolem" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7C6650"/><stop offset="1" stop-color="#9C8466"/></linearGradient>` +
    `<linearGradient id="mn2-kbelik" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6E767B"/><stop offset="0.4" stop-color="#A3ABB0"/><stop offset="1" stop-color="#5E666B"/></linearGradient>` +
    `<linearGradient id="mn2-hrana" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A88058"/><stop offset="1" stop-color="#7A5A3C"/></linearGradient>` +
    `<radialGradient id="mn2-stin" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#3A2A1E" stop-opacity="0.42"/><stop offset="0.6" stop-color="#3A2A1E" stop-opacity="0.18"/><stop offset="1" stop-color="#3A2A1E" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="mn2-koule" cx="0.36" cy="0.3" r="0.78"><stop offset="0" stop-color="#C9A184"/><stop offset="0.6" stop-color="#9C7860"/><stop offset="1" stop-color="#6E5040"/></radialGradient>` +
    `<linearGradient id="mn2-kostka" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8E6A52"/><stop offset="0.5" stop-color="#A27C62"/><stop offset="1" stop-color="#7A5844"/></linearGradient>` +
    /* Hrouda: světlo zleva shora, dole a vpravo do tmava */
    `<radialGradient id="mn2-hlina" gradientUnits="userSpaceOnUse" cx="330" cy="250" r="380"><stop offset="0" stop-color="#D2AE90"/><stop offset="0.3" stop-color="#B38B6D"/><stop offset="0.62" stop-color="#8C684F"/><stop offset="1" stop-color="#5A402F"/></radialGradient>` +
    `<linearGradient id="mn2-hlina-spodek" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3E2C21" stop-opacity="0"/><stop offset="1" stop-color="#3E2C21" stop-opacity="0.5"/></linearGradient>` +
    `<radialGradient id="mn2-celo" gradientUnits="userSpaceOnUse" cx="320" cy="300" r="300"><stop offset="0" stop-color="#CDA98B"/><stop offset="0.45" stop-color="#AE876A"/><stop offset="1" stop-color="#7E5D47"/></radialGradient>` +
    `<linearGradient id="mn2-celo-lem" gradientUnits="userSpaceOnUse" x1="250" y1="270" x2="520" y2="470"><stop offset="0" stop-color="#F0D6B9"/><stop offset="0.45" stop-color="#C7A182" stop-opacity="0.3"/><stop offset="1" stop-color="#4E3729" stop-opacity="0.7"/></linearGradient>` +
    `<radialGradient id="mn2-rozeta-svetlo" gradientUnits="userSpaceOnUse" cx="320" cy="300" r="240"><stop offset="0" stop-color="#FFF1DC" stop-opacity="0.3"/><stop offset="0.45" stop-color="#FFF1DC" stop-opacity="0.04"/><stop offset="0.72" stop-color="#2E1F16" stop-opacity="0"/><stop offset="1" stop-color="#2E1F16" stop-opacity="0.3"/></radialGradient>` +
    `<radialGradient id="mn2-bublina" cx="0.4" cy="0.35" r="0.7"><stop offset="0" stop-color="#F6EBDD"/><stop offset="0.7" stop-color="#D8BFA4"/><stop offset="1" stop-color="#A88466"/></radialGradient>` +
    `<clipPath id="mn2-orez-hroudy"><path d="${OBRYS_HROUDY}"/></clipPath>`
  );
}

function hrouda() {
  const bubliny = BUBLINY.map(
    ([x, y, r], i) =>
      `<g class="mn2-bublina" data-bublina="${i}">` +
      `<ellipse cx="${x}" cy="${f(y + r * 0.35)}" rx="${f(r * 1.08)}" ry="${f(r * 0.8)}" fill="#4A3326" opacity="0.35"/>` +
      `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#mn2-bublina)"/>` +
      `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#7A5844" stroke-width="1" opacity="0.6"/>` +
      `<ellipse cx="${f(x - r * 0.32)}" cy="${f(y - r * 0.38)}" rx="${f(r * 0.34)}" ry="${f(r * 0.2)}" fill="#FFFFFF" opacity="0.9" transform="rotate(-30 ${f(x - r * 0.32)} ${f(y - r * 0.38)})"/>` +
      `</g>`,
  ).join("");
  return (
    `<ellipse cx="${HROUDA.cx}" cy="${HROUDA.zaklad}" rx="262" ry="24" fill="url(#mn2-stin)"/>` +
    `<g class="mn2-hrouda">` +
    /* Hřbet: celá silueta, světlo zleva shora, vpravo a dole do tmava */
    `<path d="${OBRYS_HROUDY}" fill="url(#mn2-hlina)"/>` +
    `<g clip-path="url(#mn2-orez-hroudy)">` +
    `<path d="M300 268 C360 246 430 240 500 248 C540 254 572 270 598 292" stroke="#E6CBAE" stroke-width="7" stroke-linecap="round" fill="none" opacity="0.45"/>` +
    `<path d="M604 330 C622 360 624 400 608 440" stroke="#D2B293" stroke-width="5" stroke-linecap="round" fill="none" opacity="0.35"/>` +
    `<rect x="190" y="420" width="460" height="44" fill="url(#mn2-hlina-spodek)"/>` +
    `</g>` +
    `<path d="${OBRYS_HROUDY}" fill="none" stroke="#4E3729" stroke-width="1.6" opacity="0.35"/>` +
    /* Čelo: mírně vypouklé, s lemem — světlý nahoře vlevo, tmavý dole vpravo */
    `<path d="${OBRYS_CELA}" fill="#5E4433" opacity="0.35" transform="translate(4 5)"/>` +
    `<path d="${OBRYS_CELA}" fill="url(#mn2-celo)"/>` +
    `<path d="${OBRYS_CELA}" fill="none" stroke="url(#mn2-celo-lem)" stroke-width="3"/>` +
    /* Nehnětená hlína: pár hrubých vrásek, s květem mizí */
    `<g class="mn2-hrube" fill="none" stroke-linecap="round">` +
    `<path d="M250 390 C270 372 296 366 318 378 M404 424 C430 408 462 404 492 416 M300 304 C320 296 342 296 356 302 M466 314 C488 310 514 318 528 332 M346 352 C360 344 376 346 384 356" stroke="#6E4E3B" stroke-width="2.4" opacity="0.45"/>` +
    `<path d="M252 394 C272 377 297 371 318 383 M406 428 C432 413 462 409 492 421 M302 308 C321 301 342 301 356 307 M467 318 C489 315 513 322 527 336 M348 356 C361 349 375 351 383 360" stroke="#E2C4A6" stroke-width="1.6" opacity="0.5" transform="translate(0 2)"/>` +
    `</g>` +
    rozeta() +
    /* Světlo přes rozetu — neotáčí se s ní */
    `<ellipse cx="${ROZETA.cx}" cy="${ROZETA.cy}" rx="178" ry="104" fill="url(#mn2-rozeta-svetlo)" pointer-events="none"/>` +
    /* Lesk mokré hlíny */
    `<path d="M232 344 C240 318 258 300 282 286" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" fill="none" opacity="0.24"/>` +
    `<path d="M352 252 C380 245 410 242 436 242" stroke="#FFFFFF" stroke-width="3.4" stroke-linecap="round" fill="none" opacity="0.3"/>` +
    `<g class="mn2-bubliny">${bubliny}</g>` +
    `</g>`
  );
}

/** Hlavní kresba: zeď, stůl, hrouda */
export function kresba() {
  return (
    `<svg class="mu-kresba" viewBox="0 0 ${SIRKA} ${VYSKA}" aria-hidden="true" focusable="false">` +
    `<defs>${prechody()}</defs>` +
    pozadi() +
    hrouda() +
    `<g class="mn2-castice"></g>` +
    `</svg>`
  );
}

/* ——— Dráha ——— */

/** Mitsudomoe na blánu bubnu — tři čárky, jak bývají na taiko */
function tomoe(r: number) {
  return [0, 120, 240]
    .map(
      (u) =>
        `<path transform="rotate(${u})" d="M0 ${f(-r * 0.48)} m0 ${f(-r * 0.3)} a${f(r * 0.3)} ${f(r * 0.3)} 0 1 1 0 ${f(r * 0.6)} C${f(r * 0.52)} ${f(-r * 0.1)} ${f(r * 0.5)} ${f(r * 0.42)} ${f(r * 0.06)} ${f(r * 0.04)} C${f(r * 0.36)} ${f(-r * 0.12)} ${f(r * 0.1)} ${f(-r * 0.4)} 0 ${f(-r * 0.48)}"/>`,
    )
    .join("");
}

export function draha() {
  const { x0, x1, y0, y1, y } = DRAHA;
  const cvoky = Array.from({ length: 12 }, (_, i) => {
    const u = (i / 12) * Math.PI * 2;
    return `<circle cx="${f(56 + Math.cos(u) * 28.6)}" cy="${f(82 + Math.sin(u) * 28.6)}" r="1.9"/>`;
  }).join("");
  return (
    `<svg class="mn2-draha-svg" viewBox="0 0 ${SIRKA} ${VYSKA}" aria-hidden="true" focusable="false">` +
    `<defs>` +
    symboly() +
    `<linearGradient id="mn2-ram" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C79C70"/><stop offset="0.5" stop-color="#A97F57"/><stop offset="1" stop-color="#8A6544"/></linearGradient>` +
    `<linearGradient id="mn2-lak" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4A3428"/><stop offset="1" stop-color="#2B1E17"/></linearGradient>` +
    `<linearGradient id="mn2-pruh-stin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5C4632" stop-opacity="0.28"/><stop offset="1" stop-color="#5C4632" stop-opacity="0"/></linearGradient>` +
    `<linearGradient id="mn2-pruh-konec" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#F4ECDD" stop-opacity="0"/><stop offset="1" stop-color="#F4ECDD"/></linearGradient>` +
    `<linearGradient id="mn2-stin-drahy" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3A2A1E" stop-opacity="0.2"/><stop offset="1" stop-color="#3A2A1E" stop-opacity="0"/></linearGradient>` +
    `<linearGradient id="mn2-valec" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FBE29A"/><stop offset="0.55" stop-color="#F0C455"/><stop offset="1" stop-color="#D49E2E"/></linearGradient>` +
    `<radialGradient id="mn2-blana" cx="0.42" cy="0.36" r="0.7"><stop offset="0" stop-color="#FBF3E2"/><stop offset="1" stop-color="#E6D3B2"/></radialGradient>` +
    `<clipPath id="mn2-orez-drahy"><rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" rx="12"/></clipPath>` +
    `</defs>` +
    /* Stín pod dráhou na zdi, rám a plátěný pruh */
    `<rect x="18" y="150" width="764" height="16" rx="8" fill="url(#mn2-stin-drahy)"/>` +
    `<rect x="12" y="26" width="776" height="128" rx="22" fill="url(#mn2-ram)"/>` +
    `<path d="M34 30 H766" stroke="#E2BE94" stroke-width="2" stroke-linecap="round" opacity="0.7"/>` +
    `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" rx="12" fill="#F4ECDD"/>` +
    `<g clip-path="url(#mn2-orez-drahy)">` +
    `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="12" fill="url(#mn2-pruh-stin)"/>` +
    `<path d="M${x0} ${y0 + 9} H${x1} M${x0} ${y1 - 9} H${x1}" stroke="#D9CCB2" stroke-width="1.2" stroke-dasharray="5 5"/>` +
    /* Terč: kam má nota dojet */
    `<circle class="mn2-terc-puls" cx="${TERC_X}" cy="${y}" r="41" fill="none" stroke="#C4432B" stroke-width="3" opacity="0"/>` +
    `<circle cx="${TERC_X}" cy="${y}" r="36" fill="#E6D9C1"/>` +
    `<circle cx="${TERC_X}" cy="${y}" r="36" fill="none" stroke="#8A7C70" stroke-width="2.6"/>` +
    `<circle cx="${TERC_X}" cy="${y}" r="26" fill="none" stroke="#8A7C70" stroke-width="1.2" stroke-dasharray="3 4" opacity="0.8"/>` +
    `<g class="mn2-takty" stroke="#8A7C70"></g>` +
    `<g class="mn2-valec" opacity="0">` +
    `<rect class="mn2-valec-telo" x="0" y="${y - 25}" width="10" height="50" rx="25" fill="url(#mn2-valec)" stroke="#B9852A" stroke-width="2"/>` +
    `<g class="mn2-valec-hlava"><circle r="${R_NOTY + 1}" fill="url(#mn2-valec)" stroke="#B9852A" stroke-width="2.4"/><g fill="#C4432B" stroke="#C4432B" transform="scale(1.15)">${DLAN}</g></g>` +
    `<text class="mn2-valec-text" x="0" y="${y + 8}" font-family="Caveat, cursive" font-size="24" font-weight="600" fill="#8A3A1E"></text>` +
    `</g>` +
    `<g class="mn2-noty"></g>` +
    `<circle class="mn2-terc-zasah" cx="${TERC_X}" cy="${y}" r="37" fill="none" stroke="#D6A23A" stroke-width="5" opacity="0"/>` +
    `<rect x="${x1 - 70}" y="${y0}" width="70" height="${y1 - y0}" fill="url(#mn2-pruh-konec)"/>` +
    `</g>` +
    `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" rx="12" fill="none" stroke="#6E5236" stroke-width="2"/>` +
    /* Vlevo lakovaný panel s bubnem: počítá údery v řadě */
    `<path d="M12 48 Q12 26 34 26 L100 26 L100 154 L34 154 Q12 154 12 132 Z" fill="url(#mn2-lak)"/>` +
    `<path d="M100 26 V154" stroke="#1E1510" stroke-width="2"/>` +
    `<g class="mn2-buben">` +
    `<circle cx="56" cy="82" r="32" fill="#8A4E2A"/>` +
    `<circle cx="56" cy="82" r="32" fill="none" stroke="#5E3219" stroke-width="2"/>` +
    `<circle cx="56" cy="82" r="26" fill="url(#mn2-blana)"/>` +
    `<g fill="#D6A23A">${cvoky}</g>` +
    `<g class="mn2-tomoe" transform="translate(56 82)" fill="#C4432B" opacity="0.8">${tomoe(22)}</g>` +
    `<text class="mn2-rada" x="56" y="92" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-size="27" font-weight="600" fill="#2B2420"></text>` +
    `</g>` +
    `<text class="mn2-rada-popis" x="56" y="139" text-anchor="middle" font-family="Caveat, cursive" font-size="17" fill="#F3D27A" opacity="0.9">v řadě</text>` +
    /* Ukázka pro úvodní kartu: jak vypadají obě noty */
    `<g class="mn2-ukazka">` +
    `<use href="#mn2-n-t" x="0" y="0" transform="translate(330 ${y})"/>` +
    `<use href="#mn2-n-o" x="0" y="0" transform="translate(470 ${y})"/>` +
    `<use href="#mn2-n-tv" x="0" y="0" transform="translate(616 ${y})"/>` +
    `<g font-family="Caveat, cursive" font-size="25" fill="#5C5047" text-anchor="middle">` +
    `<text x="330" y="182">tlač</text><text x="470" y="182">otoč</text><text x="616" y="182">velká tlač</text>` +
    `</g>` +
    `</g>` +
    /* Hodnocení úderu a odpočet */
    `<text class="mn2-soud" x="${TERC_X}" y="190" text-anchor="middle" font-family="Caveat, cursive" font-size="34" font-weight="600"></text>` +
    `<text class="mn2-odpocet" x="${TERC_X}" y="${y + 12}" text-anchor="middle" font-family="Caveat, cursive" font-size="38" font-weight="600" fill="#C4432B"></text>` +
    `</svg>`
  );
}

/* ——— Bublinka ——— */

/**
 * Důlek v hroudě, ze kterého Bublinka kouká. Obal má velikost postavičky
 * (viewBox 180 × 180) a skládá se ze tří vrstev: stín, kudy postavička
 * vchází do hlíny, okénko s postavičkou (spodek se schová pod hranu na
 * y 128) a hliněný lem vepředu, který šev přikryje. Tmavá díra za ní
 * není schválně — Bublinka je průhledná a prosvítala by.
 */
export function bublinkaZa() {
  return (
    `<svg class="mn2-dulek" viewBox="0 0 180 180" aria-hidden="true" focusable="false">` +
    `<ellipse cx="90" cy="128" rx="50" ry="9" fill="none" stroke="#3E2C21" stroke-width="3" opacity="0.28"/>` +
    `</svg>`
  );
}

export function bublinkaPred() {
  return (
    `<svg class="mn2-lem" viewBox="0 0 180 180" aria-hidden="true" focusable="false">` +
    `<defs><linearGradient id="mn2-lem-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C09878"/><stop offset="1" stop-color="#8E6A52"/></linearGradient></defs>` +
    /* Přední půlka okraje důlku — uprostřed tlustší, jak se hlína vyhrnula */
    `<path d="M30 126 C36 138 60 144 90 144 C120 144 144 138 150 126 C152 131 151 137 146 141 C130 151 50 151 34 141 C29 137 28 131 30 126 Z" fill="url(#mn2-lem-g)"/>` +
    `<path d="M31 127 C38 138 62 143 90 143 C118 143 142 138 149 127" fill="none" stroke="#E8CDB0" stroke-width="2.2" stroke-linecap="round" opacity="0.9"/>` +
    `<path d="M44 147 C70 152 110 152 136 147" fill="none" stroke="#4E3729" stroke-width="2" stroke-linecap="round" opacity="0.3"/>` +
    `</svg>`
  );
}

/* ——— Ovládání ——— */

export function ovladani() {
  return (
    `<div class="mu-ovladani mn2-ovladani">` +
    `<button type="button" class="mn2-pad mn2-pad-tlac" data-mn2-pad="tlac" aria-label="Tlač — klávesy F, J nebo mezerník" aria-keyshortcuts="F J Space">` +
    `<svg class="mn2-pad-ikona" viewBox="-30 -30 60 60" aria-hidden="true" focusable="false"><circle r="27" fill="#FFF3E2" opacity="0.18"/><g fill="#FFF3E2" stroke="#FFF3E2" transform="scale(1.25)">${DLAN}</g></svg>` +
    `<span class="mn2-pad-nazev">Tlač</span><span class="mn2-pad-klavesy" aria-hidden="true">F · J</span>` +
    `</button>` +
    `<button type="button" class="mn2-pad mn2-pad-otoc" data-mn2-pad="otoc" aria-label="Otoč — klávesy D, K nebo Enter" aria-keyshortcuts="D K Enter">` +
    `<svg class="mn2-pad-ikona" viewBox="-30 -30 60 60" aria-hidden="true" focusable="false"><circle r="27" fill="#F7EFDE" opacity="0.18"/><g fill="#F7EFDE" stroke="#F7EFDE" transform="scale(1.6)">${sipka(10.2)}</g></svg>` +
    `<span class="mn2-pad-nazev">Otoč</span><span class="mn2-pad-klavesy" aria-hidden="true">D · K</span>` +
    `</button>` +
    `</div>`
  );
}

/** Popis scény pro čtečky */
export const POPIS =
  "Hnětací stůl s velkou hroudou, ve které se schovává Bublinka. Nahoře jedou noty k terči: červené znamenají tlač (klávesy F, J nebo mezerník), modré otoč (D, K nebo Enter). Žlutý válec na konci: tlač, co to dá.";

/** Okno scény; Hneteni.astro skládá totéž, jen místo textu postavičky vloží komponentu Postavicka */
export function okno(postavicka: string) {
  return (
    `<div class="mu-okno" role="img" aria-label="${POPIS}">` +
    kresba() +
    draha() +
    bublinka(postavicka) +
    /* Kam ukazuje bublina, když Bublinka mluví během hry — dole vpravo, ať nepřikryje dráhu */
    `<span class="mn2-kotva" aria-hidden="true"></span>` +
    `</div>`
  );
}

export function bublinka(postavicka: string) {
  return (
    `<div class="mn2-bublinka" style="${bublinkaStyl.obal}">` +
    bublinkaZa() +
    `<div class="mn2-bublinka-okenko"><div class="mn2-bublinka-telo" style="${bublinkaStyl.telo}">${postavicka}</div></div>` +
    bublinkaPred() +
    `</div>`
  );
}

/** Celá scéna jako text — pro testy; stránka skládá totéž v Hneteni.astro se skutečnou kresbou Bublinky */
export const scena = (postavicka = "") => okno(postavicka) + ovladani();
