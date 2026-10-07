/**
 * Zahrada u dílny — obkreslená z fotky images/Dilna/6669.jpg (souřadnice
 * jsou pixely té fotky, 1200 × 1600). Pohled z trávníku: nároží domu se
 * šedým soklem, nad dílnou lodžie s mátovým zábradlím a dvěma květináči,
 * pod ní okna dílny (dveře a dvě pole s nadsvětlíky, levý je vyklopený),
 * šikmá šedá deska na obrubníku se dvěma truhlíky vřesu a rozmarýnu,
 * zámková dlažba dvorku s odvodňovacím žlabem a vpředu mladá převislá
 * sakura přivázaná ke bambusové tyčce, s visačkou ze zahradnictví.
 *
 * Sakura se mění s ročním obdobím (proměnné v dilna-rez.css a domek2.css):
 * na jaře kvete, v létě má listí, na podzim zrudne, v zimě je holá.
 */
import { B, f, chomac, nahoda, mnohouhelnik, obdelnik, cara, elipsa } from "./zaklad";
import type { Bod } from "./zaklad";

export interface ZahradaVolby {
  id?: string;
  /** Nebe jako na fotce (pro porovnání s fotkou) */
  nebe?: boolean;
}

export const ZAHRADA = { x: 0, y: 0, w: 1200, h: 1600 };

/** Kde stojí kami a schovaný klíč (souřadnice kresby) */
export const ZAHRADA_MISTA = {
  hlinka: { x: 336, pata: 1302, w: 92 },
  kapka: { x: 902, pata: 1014, w: 70 },
  bublinka: { x: 612, pata: 262, w: 44 },
  klic: { box: [900, 1088, 960, 1122] as [number, number, number, number] },
  visacka: { box: [205, 790, 255, 880] as [number, number, number, number] },
  sakura: { box: [0, 620, 470, 1340] as [number, number, number, number] },
  truhliky: { box: [620, 930, 960, 1130] as [number, number, number, number] },
};

/** Vřes: drobné trsy růžových a rezavých kvítků */
function vres(cx: number, cy: number, w: number, h: number, seed: number) {
  const r = nahoda(seed);
  let s = "";
  for (let i = 0; i < 26; i++) {
    const x = cx + (r() - 0.5) * w;
    const y = cy - r() * h;
    const barva = ["#C77A86", "#B96A48", "#D99AA3", "#A9583E", "#E4B0B4"][Math.floor(r() * 5)];
    s += `<path d="M${f(x)} ${f(cy)} Q${f(x + (r() - 0.5) * 8)} ${f((y + cy) / 2)} ${f(x + (r() - 0.5) * 10)} ${f(y)}" stroke="#7A6A48" stroke-width="1.2" fill="none"/>`;
    s += elipsa(x + (r() - 0.5) * 6, y + 6, 4 + r() * 3, 9 + r() * 6, `fill="${barva}" class="z-vres"`);
  }
  return s;
}

/** Rozmarýn a santolina: tenké zelené jehličky */
function bylinka(cx: number, cy: number, w: number, h: number, barva: string, seed: number) {
  const r = nahoda(seed);
  let s = "";
  for (let i = 0; i < 18; i++) {
    const x = cx + (r() - 0.5) * w;
    const v = h * (0.5 + r() * 0.5);
    const ohyb = (r() - 0.5) * 24;
    s += `<path d="M${f(x)} ${f(cy)} Q${f(x + ohyb * 0.4)} ${f(cy - v * 0.5)} ${f(x + ohyb)} ${f(cy - v)}" stroke="${barva}" stroke-width="${f(2 + r() * 1.6)}" fill="none" stroke-linecap="round"/>`;
  }
  return s;
}

/** Dřevěný truhlík v perspektivě: přední stěna, bok a horní hrana */
function truhlik(lh: Bod, ph: Bod, pd: Bod, ld: Bod, bok: Bod[], seed: number) {
  const r = nahoda(seed);
  let s = mnohouhelnik(bok, `fill="#5E4330"`);
  s += mnohouhelnik([lh, ph, pd, ld], `fill="#8A6446"`);
  // prkna přední stěny
  for (let i = 1; i < 3; i++) {
    const t = i / 3;
    const a: Bod = [lh[0] + (ld[0] - lh[0]) * t, lh[1] + (ld[1] - lh[1]) * t];
    const b: Bod = [ph[0] + (pd[0] - ph[0]) * t, ph[1] + (pd[1] - ph[1]) * t];
    s += cara(a[0], a[1], b[0], b[1], `stroke="#6E4E36" stroke-width="2"`);
  }
  for (let i = 0; i < 4; i++) {
    const t = 0.1 + r() * 0.8;
    s += cara(lh[0] + (ph[0] - lh[0]) * t, lh[1] + (ph[1] - lh[1]) * t + 6, lh[0] + (ph[0] - lh[0]) * (t + 0.08), lh[1] + (ph[1] - lh[1]) * (t + 0.08) + 6, `stroke="#A9825C" stroke-width="1.2" opacity="0.6"`);
  }
  s += cara(lh[0], lh[1], ph[0], ph[1], `stroke="#B08A62" stroke-width="3"`);
  return s;
}

export function zahrada(v: ZahradaVolby = {}) {
  const p = v.id ?? "za";
  const r = nahoda(6669);

  const defs = `<defs>
    <linearGradient id="${p}-nebe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4A8BE0"/><stop offset="1" stop-color="#9FD0F5"/></linearGradient>
    <linearGradient id="${p}-trava" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" style="stop-color:var(--zem-1, #8DB35C)"/><stop offset="1" style="stop-color:var(--zem-2, #55803B)"/>
    </linearGradient>
    <linearGradient id="${p}-zed-stin" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7A928C"/><stop offset="1" stop-color="#8FA597"/></linearGradient>
    <linearGradient id="${p}-sklo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2E3B47"/><stop offset="1" stop-color="#1F2A33"/></linearGradient>
    <pattern id="${p}-dlazba" width="40" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(14) scale(1.15 0.85)">
      <rect width="40" height="20" fill="${B.dlazba}"/>
      <g stroke="${B.dlazbaSpara}" stroke-width="1.6" fill="none">
        <path d="M0 0.5 H40 M0 10.5 H40"/>
        <path d="M0.5 0.5 V3 L2.5 5.5 L0.5 8 V10.5 M20.5 0.5 V3 L22.5 5.5 L20.5 8 V10.5"/>
        <path d="M10.5 10.5 V13 L12.5 15.5 L10.5 18 V20.5 M30.5 10.5 V13 L32.5 15.5 L30.5 18 V20.5"/>
      </g>
    </pattern>
    <pattern id="${p}-omitka" width="16" height="16" patternUnits="userSpaceOnUse">
      <circle cx="3" cy="4" r="0.9" fill="#000" opacity="0.06"/><circle cx="11" cy="9" r="0.8" fill="#fff" opacity="0.14"/><circle cx="6" cy="14" r="0.9" fill="#000" opacity="0.05"/>
    </pattern>
  </defs>`;

  /* ——— Nebe, sousedův pletený plot a keře vpravo nahoře ——— */
  let pozadi = v.nebe ? obdelnik(860, -10, 360, 640, `fill="url(#${p}-nebe)"`) : "";
  pozadi += `<path d="${chomac(990, 230, 80, 26, 12, 6601, 0.6, 0.6)}" fill="#FFFFFF" opacity="0.75"/>`;
  pozadi += `<path d="${chomac(1150, 300, 60, 18, 10, 6602, 0.6, 0.6)}" fill="#FFFFFF" opacity="0.6"/>`;
  // soused: tmavá střecha a červený slunečník za zábradlím
  pozadi += mnohouhelnik([[860, 400], [990, 380], [990, 560], [860, 560]], `fill="#3B3D40"`);
  for (let i = 0; i < 6; i++) pozadi += cara(860, 410 + i * 24, 990, 392 + i * 24, `stroke="#55585C" stroke-width="2"`);
  pozadi += mnohouhelnik([[905, 382], [925, 382], [935, 548], [915, 548]], `fill="#B5302A"`);
  pozadi += mnohouhelnik([[1050, 280], [1200, 300], [1200, 570], [1050, 570]], `fill="${B.pletenyTma}"`);
  for (let i = 0; i < 12; i++) {
    const y = 290 + i * 23;
    pozadi += `<path d="M1050 ${y} Q1125 ${y + (i % 2 ? -3 : 3)} 1200 ${y + 2} L1200 ${y + 20} Q1125 ${y + 20 + (i % 2 ? -3 : 3)} 1050 ${y + 18} Z" fill="${i % 2 ? B.pleteny : "#9A9388"}"/>`;
  }
  pozadi += obdelnik(1118, 285, 8, 290, `fill="#5E584F"`);
  pozadi += `<path d="${chomac(1130, 560, 90, 70, 16, 6603, 0.8, 0.7)}" fill="#7A8E48"/>`;
  pozadi += `<path d="${chomac(1100, 590, 60, 50, 12, 6604, 0.8, 0.7)}" fill="#9AAE5C"/>`;
  for (let i = 0; i < 12; i++) pozadi += cara(1060 + r() * 140, 640, 1060 + r() * 140, 470 + r() * 80, `stroke="#8E9E54" stroke-width="2"`);

  /* ——— Lodžie nad dílnou ——— */
  let lodzie = "";
  // podhled horní desky a její čelo, nahoře kousek zábradlí v podkroví
  lodzie += mnohouhelnik([[400, 0], [935, 0], [1068, 110], [872, 188], [400, 28]], `fill="#E2E3DD"`);
  lodzie += mnohouhelnik([[935, 0], [1080, 0], [1080, 118], [1068, 110]], `fill="${B.deskaSeda}"`);
  lodzie += mnohouhelnik([[1068, 110], [1080, 118], [1080, 128], [1066, 122]], `fill="${B.deska}"`);
  for (let x = 930; x < 1050; x += 14) lodzie += obdelnik(x, 0, 4, 48 - (x - 930) * 0.12, `fill="${B.mata}"`);
  lodzie += mnohouhelnik([[925, 40], [1050, 70], [1050, 76], [925, 46]], `fill="${B.mata}"`);
  // zadní stěna lodžie na slunci s oknem
  lodzie += mnohouhelnik([[400, 28], [872, 188], [876, 548], [400, 540]], `fill="${B.zed}"`);
  lodzie += mnohouhelnik([[400, 28], [872, 188], [876, 548], [400, 540]], `fill="url(#${p}-omitka)"`);
  lodzie += mnohouhelnik([[400, 28], [872, 188], [872, 240], [400, 70]], `fill="#93A383" opacity="0.35"`);
  lodzie += mnohouhelnik([[418, 74], [578, 124], [576, 378], [418, 368]], `fill="${B.ram}"`);
  lodzie += mnohouhelnik([[430, 86], [566, 132], [564, 366], [430, 358]], `fill="url(#${p}-sklo)"`);
  lodzie += mnohouhelnik([[430, 220], [520, 250], [520, 366], [430, 358]], `fill="#8DB3DB" opacity="0.55"`);
  lodzie += mnohouhelnik([[414, 368], [580, 378], [580, 386], [414, 377]], `fill="#E4E3DD"`);
  // stíny prutů zábradlí na zdi
  for (let i = 0; i < 16; i++) {
    const x = 470 + i * 26;
    lodzie += mnohouhelnik([[x, 360 + i * 4], [x + 6, 360 + i * 4], [x - 50, 540], [x - 56, 540]], `fill="#8C9C7C" opacity="0.18"`);
  }
  // sloup vpravo
  lodzie += mnohouhelnik([[968, 112], [1058, 118], [1052, 552], [972, 550]], `fill="${B.zed}"`);
  lodzie += mnohouhelnik([[968, 112], [990, 113], [994, 550], [972, 550]], `fill="${B.zedStin}"`);
  // zábradlí v perspektivě: madlo, spodní pásnice, pruty hustší do dálky
  const madloA: Bod = [405, 236];
  const madloB: Bod = [985, 383];
  const dolA: Bod = [410, 500];
  const dolB: Bod = [980, 548];
  let zabradli = "";
  for (let t = 0.02; t < 0.99; ) {
    const x1 = madloA[0] + (madloB[0] - madloA[0]) * t;
    const y1 = madloA[1] + (madloB[1] - madloA[1]) * t;
    const x2 = dolA[0] + (dolB[0] - dolA[0]) * t;
    const y2 = dolA[1] + (dolB[1] - dolA[1]) * t;
    zabradli += cara(x1, y1, x2, y2, `stroke="${B.mata}" stroke-width="${f(7 - t * 3)}"`);
    zabradli += cara(x1 + 2, y1, x2 + 2, y2, `stroke="${B.mataStin}" stroke-width="1.4" opacity="0.6"`);
    t += 0.047 - t * 0.022;
  }
  zabradli += cara(madloA[0], madloA[1], madloB[0], madloB[1], `stroke="${B.mata}" stroke-width="10" stroke-linecap="round"`);
  zabradli += cara(madloA[0], madloA[1] - 2, madloB[0], madloB[1] - 2, `stroke="${B.mataSvetlo}" stroke-width="3"`);
  zabradli += cara(dolA[0], dolA[1], dolB[0], dolB[1], `stroke="${B.mata}" stroke-width="8"`);
  zabradli += obdelnik(404, 232, 16, 296, `fill="${B.mata}"`) + obdelnik(414, 232, 5, 296, `fill="${B.mataStin}"`);
  zabradli += cara(766, 332, 768, 540, `stroke="${B.mata}" stroke-width="9"`);
  zabradli += cara(978, 380, 976, 550, `stroke="${B.mata}" stroke-width="7"`);
  // květináče na madle: kuželový s vistárií a široká mísa se suchými stonky a figurkou
  let kvetinace = "";
  kvetinace += `<path d="M584 268 L650 280 L642 330 L596 324 Z" fill="#4A4642"/>`;
  kvetinace += `<path d="M582 266 Q616 258 652 278 L650 286 Q616 268 584 274 Z" fill="#5E5852"/>`;
  kvetinace += `<path d="M600 268 L594 230 M612 270 L620 220 M626 272 L660 230 M606 268 L566 236 M636 274 L690 262" stroke="#6E8A3E" stroke-width="2.2" fill="none"/>`;
  const vistarie = nahoda(6605);
  for (let i = 0; i < 26; i++) {
    const x = 560 + vistarie() * 140;
    const y = 205 + vistarie() * 100;
    kvetinace += elipsa(x, y, 7, 3, `fill="${vistarie() < 0.5 ? "#B9C94A" : "#8EAE3E"}" transform="rotate(${f((vistarie() - 0.5) * 90)} ${f(x)} ${f(y)})"`);
  }
  kvetinace += `<path d="M812 330 Q856 318 900 336 L888 380 Q858 390 824 378 Z" fill="#4A4642"/>`;
  kvetinace += `<path d="M810 328 Q856 312 902 334 L900 342 Q856 324 812 336 Z" fill="#5E5852"/>`;
  kvetinace += `<path d="M822 330 L816 304 M836 326 L842 296 M852 326 L866 300 M868 330 L892 308 M880 332 L906 320" stroke="#B49A62" stroke-width="2" fill="none"/>`;
  kvetinace += `<path d="M870 324 C866 312 868 302 874 298 C880 302 882 312 878 324 Z" fill="#6B4A36"/>`;
  kvetinace += elipsa(874, 300, 4, 4, `fill="#6B4A36"`);

  // deska nad dílnou: světlá hrana a šedé čelo, pod ní podhled
  let deska = "";
  deska += mnohouhelnik([[398, 520], [992, 547], [992, 562], [398, 538]], `fill="${B.deska}"`);
  deska += mnohouhelnik([[398, 538], [992, 562], [990, 606], [398, 612]], `fill="${B.deskaSeda}"`);
  deska += mnohouhelnik([[398, 612], [990, 606], [985, 618], [398, 650]], `fill="#E6E6E2"`);

  /* ——— Nároží domu vlevo ——— */
  let narozi = "";
  narozi += mnohouhelnik([[0, 0], [276, 0], [300, 905], [0, 910]], `fill="url(#${p}-zed-stin)"`);
  narozi += mnohouhelnik([[0, 0], [276, 0], [300, 905], [0, 910]], `fill="url(#${p}-omitka)"`);
  narozi += mnohouhelnik([[0, 862], [298, 858], [300, 940], [0, 918]], `fill="#A9AFA7"`);
  narozi += mnohouhelnik([[276, 0], [402, 0], [402, 732], [298, 735]], `fill="${B.pilastr}"`);
  narozi += mnohouhelnik([[276, 0], [402, 0], [402, 732], [298, 735]], `fill="url(#${p}-omitka)"`);
  narozi += mnohouhelnik([[298, 735], [402, 732], [415, 862], [300, 866]], `fill="#D6D7CF"`);
  narozi += mnohouhelnik([[298, 735], [402, 732], [404, 742], [298, 745]], `fill="#ECEDE7"`);

  /* ——— Okna dílny ——— */
  let okna = "";
  okna += mnohouhelnik([[402, 640], [990, 610], [990, 935], [402, 920]], `fill="#D4D5D0"`);
  okna += mnohouhelnik([[855, 630], [905, 628], [905, 932], [855, 935]], `fill="${B.sedaStin}"`);
  // dveře
  okna += mnohouhelnik([[404, 650], [502, 648], [502, 914], [404, 912]], `fill="${B.ram}"`);
  okna += mnohouhelnik([[414, 662], [488, 660], [488, 904], [414, 902]], `fill="url(#${p}-sklo)"`);
  okna += mnohouhelnik([[414, 760], [488, 700], [488, 760], [414, 830]], `fill="#8DB3DB" opacity="0.18"`);
  okna += obdelnik(479, 812, 7, 34, `rx="2" fill="#D9DBD6"`);
  // první okno s vyklopeným nadsvětlíkem a druhé okno
  okna += mnohouhelnik([[512, 664], [702, 655], [702, 957], [512, 952]], `fill="${B.ram}"`);
  okna += mnohouhelnik([[524, 676], [690, 668], [688, 760], [524, 768]], `fill="#8DB3DB"`);
  okna += mnohouhelnik([[524, 676], [690, 668], [700, 652], [532, 660]], `fill="${B.ram}"`);
  okna += `<path d="${chomac(620, 722, 30, 26, 12, 6606, 1, 0.6)}" fill="#6E8A64" opacity="0.7"/>`;
  okna += mnohouhelnik([[524, 782], [690, 776], [690, 946], [524, 942]], `fill="url(#${p}-sklo)"`);
  okna += mnohouhelnik([[704, 652], [858, 645], [858, 936], [704, 948]], `fill="${B.ram}"`);
  okna += mnohouhelnik([[716, 664], [846, 658], [846, 736], [716, 742]], `fill="url(#${p}-sklo)"`);
  okna += mnohouhelnik([[716, 754], [846, 748], [846, 926], [716, 936]], `fill="url(#${p}-sklo)"`);
  // dílna za sklem — stůl a židle jen tušené
  okna += `<g opacity="0.55"><path d="M528 870 L640 864 L640 872 L528 878 Z" fill="#D9C7A8"/><path d="M540 878 L540 940 M628 872 L628 936" stroke="#8A7A62" stroke-width="3"/><path d="M780 800 L800 940 M820 800 L800 860" stroke="#8A6A48" stroke-width="4"/></g>`;
  okna += mnohouhelnik([[716, 754], [846, 748], [846, 800], [716, 830]], `fill="#8DB3DB" opacity="0.12"`);
  // parapet a odvodňovací žlab
  okna += mnohouhelnik([[500, 952], [990, 930], [990, 940], [500, 962]], `fill="#6E7275"`);

  /* ——— Dlažba dvorku a opěrná zeď ——— */
  let dvorek = "";
  dvorek += mnohouhelnik([[905, 628], [1000, 570], [1200, 652], [1200, 935], [905, 932]], `fill="${B.seda}"`);
  dvorek += mnohouhelnik([[905, 628], [1000, 570], [1200, 652], [1200, 664], [1000, 582], [905, 640]], `fill="#E2E3DF"`);
  dvorek += mnohouhelnik([[640, 962], [990, 935], [1200, 935], [1200, 1182], [660, 1012]], `fill="url(#${p}-dlazba)"`);
  dvorek += mnohouhelnik([[784, 963], [938, 925], [948, 932], [796, 972]], `fill="#3B3A37"`);
  for (let i = 0; i < 14; i++) dvorek += cara(788 + i * 11, 962 - i * 2.7, 793 + i * 11, 969 - i * 2.7, `stroke="#5E5C58" stroke-width="1.6"`);
  // žluté míčky na dlažbě (jsou i na fotce)
  for (const [x, y] of [[920, 932], [975, 975], [878, 1010]] as Bod[]) dvorek += elipsa(x, y, 6, 6, `fill="#E8D23A"`);

  /* ——— Šikmá deska na obrubníku a truhlíky ——— */
  let obrubnik = "";
  obrubnik += mnohouhelnik([[330, 905], [790, 960], [1200, 1092], [1200, 1182], [700, 1050], [300, 930]], `fill="#9FAAAE"`);
  obrubnik += mnohouhelnik([[300, 930], [700, 1050], [1200, 1182], [1200, 1206], [700, 1074], [300, 950]], `fill="${B.kryt}"`);
  obrubnik += mnohouhelnik([[330, 905], [420, 914], [430, 922], [336, 914]], `fill="#C9D0D3"`);
  for (const [x, y] of [[470, 948], [612, 990], [660, 1000]] as Bod[]) obrubnik += elipsa(x, y, 4, 2.4, `fill="#8A4A3A"`);
  let truhliky = "";
  truhliky += truhlik([628, 1002], [792, 1012], [788, 1060], [632, 1050], [[792, 1012], [810, 1004], [806, 1050], [788, 1060]], 6607);
  truhliky += vres(670, 1004, 70, 62, 6608) + bylinka(750, 1008, 56, 80, "#6E8A4E", 6609);
  truhliky += truhlik([760, 1030], [946, 1048], [940, 1118], [766, 1098], [[946, 1048], [964, 1036], [958, 1104], [940, 1118]], 6610);
  truhliky += obdelnik(862, 1012, 64, 32, `fill="#1E1E1E"`);
  truhliky += vres(805, 1034, 76, 70, 6611) + bylinka(890, 1028, 70, 70, "#B9C25A", 6612);

  /* ——— Trávník ——— */
  let travnik = "";
  travnik += mnohouhelnik([[0, 905], [300, 930], [300, 950], [700, 1074], [1200, 1206], [1200, 1600], [0, 1600]], `fill="url(#${p}-trava)"`);
  travnik += mnohouhelnik([[0, 905], [300, 930], [300, 950], [0, 990]], `fill="#3E5E2A" opacity="0.35"`);
  const tr = nahoda(6613);
  const stebla = ["", ""];
  for (let i = 0; i < 520; i++) {
    const x = tr() * 1200;
    const yMin = x < 300 ? 910 : 950 + (x - 300) * 0.28;
    const y = yMin + 20 + tr() * (1600 - yMin);
    const h = 10 + tr() * 22 + (y - 900) * 0.02;
    const l = (tr() - 0.5) * 14;
    stebla[tr() < 0.5 ? 0 : 1] += `M${f(x - 2)} ${f(y)}Q${f(x + l * 0.4)} ${f(y - h * 0.6)} ${f(x + l)} ${f(y - h)}Q${f(x + l * 0.5)} ${f(y - h * 0.5)} ${f(x + 2)} ${f(y)}Z`;
  }
  travnik += `<path d="${stebla[0]}" fill="${B.travaTma}" opacity="0.8"/><path d="${stebla[1]}" fill="${B.travaSvetla}" opacity="0.8"/>`;
  travnik += `<g class="rez-kvetiny">${elipsa(143, 1322, 6, 3, `fill="#FBF7EC"`)}${elipsa(143, 1322, 2, 2, `fill="#E8B440"`)}</g>`;
  travnik += `<g class="snih">${mnohouhelnik([[0, 905], [300, 930], [300, 950], [700, 1074], [1200, 1206], [1200, 1600], [0, 1600]], `fill="#F4F8FB"`)}${mnohouhelnik([[330, 898], [790, 953], [1200, 1085], [1200, 1096], [790, 964], [330, 909]], `fill="#FBFDFF"`)}</g>`;

  /* ——— Sakura na tyčce ——— */
  let sakura = "";
  // kolečko kypré hlíny kolem kmínku
  sakura += `<path d="M238 1296 C246 1262 300 1244 352 1256 C384 1266 380 1312 346 1326 C300 1340 248 1330 238 1296 Z" fill="#3A2A1E"/>`;
  sakura += `<path d="M252 1300 C262 1278 300 1268 340 1276" stroke="#5A4232" stroke-width="3" fill="none"/>`;
  // bambusová tyčka a kmínek s vodorovnými lenticelami
  sakura += `<path d="M262 1322 L210 640 L218 640 L272 1322 Z" fill="#E2D2A8"/>`;
  sakura += `<path d="M264 1322 L212 640" stroke="#C9B482" stroke-width="1.4"/>`;
  for (const y of [760, 900, 1040, 1180]) sakura += cara(214 + (y - 640) * 0.076, y, 223 + (y - 640) * 0.077, y, `stroke="#B49C68" stroke-width="2"`);
  sakura += `<path d="M276 1324 C274 1100 246 900 222 645 L232 645 C254 900 286 1100 292 1324 Z" fill="#7A4E3C"/>`;
  for (let i = 0; i < 18; i++) {
    const y = 680 + i * 36;
    const x = 226 + (y - 645) * 0.078;
    sakura += cara(x - 1, y, x + 7, y, `stroke="#C9A08A" stroke-width="1.4" opacity="0.8"`);
  }
  for (const y of [950, 1190]) sakura += `<path d="M${f(214 + (y - 640) * 0.08)} ${y} L${f(238 + (y - 640) * 0.08)} ${y + 2}" stroke="#4E7A44" stroke-width="3.4" stroke-linecap="round"/>`;
  // visačka ze zahradnictví na provázku
  sakura += `<g class="z-visacka"><path d="M226 790 C222 798 222 806 226 810" stroke="#C9C2B2" stroke-width="1.2" fill="none"/><path d="M216 806 C214 800 236 798 240 806 L246 864 C244 872 222 874 218 866 Z" fill="#F4F3EE" stroke="#D3D0C6" stroke-width="1"/><circle cx="228" cy="812" r="2.2" fill="#C9C2B2"/></g>`;
  // převislá koruna: větve z vrcholku dolů jako deštník
  const kr = nahoda(6614);
  // 18 převislých větví — délky a sklony podle fotky (koruna od x 0 do 450, dolů k y 900)
  const vetve: [number, number, number, number][] = Array.from({ length: 18 }, (_, i) => {
    const t = i / 17;
    const dx = -235 + t * 470 + (kr() - 0.5) * 30;
    const dy = 150 + Math.abs(dx) * 0.28 + kr() * 70;
    return [222 + (kr() - 0.5) * 8, 648 + kr() * 6, dx, dy];
  });
  let koruna = "";
  let vetvicky = "";
  let kvet = "";
  for (const [x0, y0, dx, dy] of vetve) {
    const cx = x0 + dx * 0.55;
    const cy = y0 - 46 - Math.abs(dx) * 0.14;
    const x1 = x0 + dx;
    const y1 = y0 + dy;
    vetvicky += `<path d="M${f(x0)} ${f(y0)} Q${f(cx)} ${f(cy)} ${f(x1)} ${f(y1)}" stroke="#6A4434" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
    for (let i = 0; i < 15; i++) {
      const t = 0.18 + (i / 15) * 0.82;
      const bx = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1;
      const by = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1;
      const delka = 20 + kr() * 16;
      const uhel = 62 + (kr() - 0.5) * 70;
      const lx = bx + Math.cos((uhel * Math.PI) / 180) * delka * 0.5;
      const ly = by + Math.sin((uhel * Math.PI) / 180) * delka * 0.5;
      const t2 = kr();
      koruna += `<ellipse cx="${f(lx)}" cy="${f(ly)}" rx="${f(delka * 0.5)}" ry="${f(4.2 + kr() * 2)}" class="${t2 < 0.45 ? "sak-1" : t2 < 0.8 ? "sak-2" : "sak-3"}" transform="rotate(${f(uhel)} ${f(lx)} ${f(ly)})"/>`;
      if (kr() < 0.7) kvet += `<g transform="translate(${f(bx + (kr() - 0.5) * 10)} ${f(by + 4 + kr() * 10)})"><circle r="5" fill="#F4C1C4"/><circle r="2.8" fill="#FBE3E4"/><circle r="1" fill="#C95A6A"/></g>`;
    }
  }
  sakura += `<g class="z-sakura">${vetvicky}<g class="koruna">${koruna}</g><g class="z-kvet">${kvet}</g>`;
  sakura += `<g class="snih">${vetve.map(([x0, y0, dx]) => `<path d="M${x0} ${y0 - 4} Q${f(x0 + dx * 0.5)} ${f(y0 - 46 - Math.abs(dx) * 0.12)} ${f(x0 + dx * 0.8)} ${f(y0 + 20)}" stroke="#FBFDFF" stroke-width="2.4" fill="none" stroke-linecap="round"/>`).join("")}</g></g>`;
  // listí na trávě pod korunou (na podzim)
  sakura += `<g class="koruna-zem">${[[120, 1350, 0], [360, 1380, 40], [60, 1420, -30], [420, 1300, 70], [200, 1460, 15]].map(([x, y, u]) => elipsa(x, y, 9, 3.6, `class="sak-2" transform="rotate(${u} ${x} ${y})"`)).join("")}</g>`;

  const kresba = `${pozadi}${lodzie}${zabradli}${kvetinace}${deska}${okna}${narozi}${dvorek}${obrubnik}${truhliky}${travnik}${sakura}`;
  return `${defs}${kresba}`;
}
