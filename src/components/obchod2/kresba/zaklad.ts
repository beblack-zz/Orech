/**
 * Krámek na /obchod-2 — společný základ kreseb.
 *
 * Průčelí malého japonského obchodu s nádobím (うつわ屋 utsuwa-ya),
 * kreslené čelně podle dvou předloh: noční plakát (dvě střechy, velký
 * štít, okno patra se zbožím, plechová stříška s řadou lampionů, svislá
 * svítící cedule, lucerna na tyči, dráty, dřevěný práh se světlem) a
 * izometrický krámek (letáky všude, automat, pouliční lampa, strom
 * přes roh, stolička, stojan s tabulí).
 *
 * Celá scéna je jeden „svět“ SVET.w × SVET.h jednotek (osa y dolů).
 * Na stránce stojí ve sticky scéně a jezdí po něm kamera (jako ulice
 * na Domku 2): celek → okno patra → přízemí → zpátky na celek, stmívá
 * se, lampiony se rozsvěcují, nakonec spadne roleta.
 *
 * ——— Jak se kreslí ———
 *
 * Každá část je generátor, který vrací SVG jako text po VRSTVÁCH
 * (typ Vrstvy níž). Skládá je scena.ts v tomhle pořadí odzadu:
 *
 *   zadni   venku za zbožím: sousedé, sloupy, strom, střechy, zdi
 *   uvnitr  vnitřky oken a výloh: zadní stěny, police, pult, lampa
 *   ——      ZBOŽÍ (HTML: fotky, balíky v novinách, cenovky, páska)
 *   zem     spodek předku: chodník, obrubník, silnice, práh
 *   predni  před zbožím: rámy a sklo, sloupy, stříška, lampiony,
 *           cedule, roleta, věci před krámkem
 *   svetla  co v noci svítí — kreslí se NAD noční tmou, nepřebarvuje se
 *
 * Uvnitř jedné vrstvy jdou části za sebou takhle (co je dřív, je vzadu):
 *   zadni   okoli → dum → prizemi → cedule
 *   uvnitr  dum → prizemi → cedule → okoli
 *   zem     okoli → prizemi → dum → cedule
 *   predni  dum → prizemi → cedule → okoli
 *   svetla  okoli → dum → prizemi → cedule
 *
 * Noc se NEKRESLÍ znovu. scena.ts z denních vrstev udělá noční kopii:
 * všechny barvy #RRGGBB přebarví do noční modři (vnitřky do teplého
 * světla lampy) a id přejmenuje z „kd-“ na „kn-“. Stránka pak kopii
 * prolíná přes denní kresbu podle hodiny. Z toho plynou pravidla:
 *
 *   1. Barvy jen jako #RRGGBB (šest číslic). Žádné rgb(), názvy barev,
 *      #RGB ani currentColor — ty by noc nepřebarvila. Průhlednost
 *      přes opacity / fill-opacity / stop-opacity.
 *   2. Každé id začíná „kd-“ a předponou části (kd-dum-, kd-pr-, kd-ce-,
 *      kd-ok-), aby se nic nepotkalo. Odkazy url(#kd-…) / href="#kd-…".
 *      Každá vrstva má vlastní <defs> — vrstva nesmí sahat na defs
 *      jiné vrstvy (na stránce jsou to různá <svg>).
 *   3. Třídy začínají „krm-“. Seznam tříd, na které sahá stránka, je
 *      v TRIDY níž — jiné si každý pojmenuje podle sebe (krm-dum-…).
 *   4. Co svítí (lampiony, cedule, okna, lampa, automat, odlesky na
 *      chodníku), patří do vrstvy `svetla` a dostane data-prah — práh
 *      0–1, kdy se při stmívání rozsvítí (PRAH níž). Ve dne je vrstva
 *      svetla schovaná; denní podoba téže věci (zhasnutý lampion,
 *      nesvítící cedule) je v `predni` nebo `zadni`.
 *   5. Jen ve dne (vrány na drátech, sluneční odlesk) → třída
 *      krm-jen-den; jen v noci (stažené žaluzie u souseda) → krm-jen-noc.
 *
 * Styl: plochá kresba jako fasáda na Úvodu 2 a ulice na Domku 2 —
 * bez obrysových čar, světlo a stín jako plochy, měkké přechody jen
 * pro světlo a záři. Žádné textury, šum, filtry ani tisíce teček:
 * „overkill“ je v množství dobře nakreslených věcí, ne v zrnu.
 * Světlo ve dne jde zleva shora → stíny padají doprava dolů.
 * Stavba je souměrná podle X.stred (střechy, trámy, krokve, podbití,
 * stříška) — nesouměrné smí být jen krámy, cedule a nepořádek.
 * Mezi střechou a zdí nikde nesmí prosvítat nebe.
 *
 * Náhled bez prohlížeče: scratchpad/krm/nahled.sh (viz README tam).
 */
export { f, body2, mnohouhelnik, lomena, obdelnik, cara, kruh, elipsa, mezi, kolmo, plus, pas, nahoda, chomac, body } from "../../domek2/kresba/zaklad";
export type { Bod } from "../../domek2/kresba/zaklad";

/** Svět: všechny souřadnice kreseb jsou v těchhle jednotkách */
export const SVET = { w: 3200, h: 2000 };

export interface Obdelnik {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Vrstvy jedné části kresby — každá je obsah jednoho <svg> (bez obalu <svg>).
 * `zem` je spodek vrstvy predni (chodník, silnice, práh): kreslí se v ní
 * první, aby paty sloupů, lamp a krámů stály NA chodníku, ne pod ním.
 */
export interface Vrstvy {
  zadni?: string;
  uvnitr?: string;
  zem?: string;
  predni?: string;
  svetla?: string;
}

/*
 * ——— Rozměry stavby ———
 *
 *            dráty ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 *                       ____________hřeben 285____________
 *                     /     hlavní střecha (tašky)        \
 *        okap1 420  /_________________________________________\
 *                  ===== krokve, podbití 420–445 =====
 *           455   /          spodní střecha nad štítem         \
 *        okap2 570 /___________________________________________ \
 *                     ┌──────── štít 585–735 ────────┐
 *     svislá          └──────────────────────────────┘
 *     cedule  770   ┌──────┬──────┬──────┬──────┐  okno patra
 *     930–1040      │ kus  │ kus  │ kus  │ kus  │  (police 990)
 *     770–1390 1040 └──────┴──────┴──────┴──────┘
 *                   ╪╪╪╪╪╪╪╪╪ balkon 1040–1128 ╪╪╪╪╪╪╪╪
 *            1135  ≋≋≋≋≋≋≋≋ plechová stříška ≋≋≋≋≋≋≋≋≋≋
 *            1235    o     o     o     o     o     o     o   lampiony
 *                  ║ schránka rolety / překlad 1235–1330 ║   lucerna
 *            1330  ║ výloha L ║   dveře   ║ výloha P ║    na tyči
 *                  ║  2 × 2   ║ noren,    ║  2 × 2   ║    2185
 *                  ║  kusy    ║ pult,     ║  kusy    ║
 *                  ║          ║ hodiny    ║          ║
 *            1730  ╚══════════╩═══════════╩══════════╝ podlaha
 *            1765  ▓▓▓▓▓▓▓▓▓▓ dřevěný práh / chodník ▓▓▓▓▓▓▓▓▓▓
 *            1860  ─────────────── obrubník ─────────────────
 *            1885  ═══════════════ silnice ══════════════════
 *
 * Zeď domu je X.zedL–X.zedP (1100–2100), osa souměrnosti X.stred 1600.
 * Vlevo od domu soused (0–1092), vpravo soused (2108–3200).
 */
export const Y = {
  /** Nejvyšší dráty na sloupech */
  draty: 70,
  /** Hřeben hlavní střechy */
  hreben: 285,
  /** Okap hlavní střechy — spodní hrana tašek */
  okap1: 420,
  /** Konce krokví a podbití pod hlavní střechou */
  podbiti: 445,
  /** Kde se spodní střecha (nad štítem) opírá o zeď */
  strecha2: 455,
  /** Okap spodní střechy */
  okap2: 570,
  stitNahore: 585,
  stitDole: 735,
  /** Okno patra (otvor ve zdi) */
  oknoNahore: 770,
  oknoDole: 1040,
  /** Horní plocha police v okně patra — stojí na ní kusy z Japonska */
  policeOkna: 990,
  /** Balkon: zábradlí od oknoDole, deska do balkonDole */
  balkonDole: 1128,
  /** Plechová stříška nad přízemím: u zdi a přední hrana (z ní visí lampiony) */
  striskaNahore: 1135,
  striskaDole: 1235,
  lampionNahore: 1245,
  lampionDole: 1325,
  /** Spodek schránky rolety = horní hrana výloh a dveří */
  prekladDole: 1330,
  /** Horní plochy polic ve výlohách (na nich stojí kusy) */
  police1: 1460,
  police2: 1632,
  /** Podlaha krámku = spodek výloh a dveří; pod ní kamenný schod */
  podlaha: 1730,
  /** Chodník u zdi; věci u zdi stojí patou na chodnikPata */
  chodnik: 1765,
  chodnikPata: 1785,
  /** Věci u obrubníku stojí patou kolem 1850 */
  obrubnik: 1860,
  silnice: 1885,
};

export const X = {
  stred: 1600,
  zedL: 1100,
  zedP: 2100,
  hrebenL: 1300,
  hrebenP: 1900,
  okap1L: 1070,
  okap1P: 2130,
  okap2L: 1010,
  okap2P: 2190,
  stitL: 1160,
  stitP: 2040,
  oknoL: 1180,
  oknoP: 2020,
  balkonL: 1120,
  balkonP: 2080,
  striskaL: 1060,
  striskaP: 2140,
  /** Sousedé: levý končí, pravý začíná */
  sousedL: 1092,
  sousedP: 2108,
};

/** Přízemí: čtyři sloupy (šířka 30) a mezi nimi výloha, dveře, výloha */
export const PRIZEMI = {
  sloupy: [1100, 1430, 1740, 2070].map((x): Obdelnik => ({ x, y: Y.striskaDole, w: 30, h: Y.podlaha - Y.striskaDole })),
  vylohaL: { x: 1130, y: Y.prekladDole, w: 300, h: Y.podlaha - Y.prekladDole } as Obdelnik,
  dvere: { x: 1460, y: Y.prekladDole, w: 280, h: Y.podlaha - Y.prekladDole } as Obdelnik,
  vylohaP: { x: 1770, y: Y.prekladDole, w: 300, h: Y.podlaha - Y.prekladDole } as Obdelnik,
  /** Schránka rolety / překlad pod stříškou */
  schranka: { x: 1100, y: Y.striskaDole, w: 1000, h: Y.prekladDole - Y.striskaDole } as Obdelnik,
  /** Stažená roleta zakryje tohle (od sloupu ke sloupu přes všechno) */
  roleta: { x: 1100, y: Y.prekladDole, w: 1000, h: Y.podlaha - Y.prekladDole } as Obdelnik,
  /** Pult ve dveřích: horní deska na y = pult.y */
  pult: { x: 1480, y: 1600, w: 240, h: Y.podlaha - 1600 } as Obdelnik,
  /** Nástěnné hodiny na zadní stěně za dveřmi (HTML — v nich se schovává Střípek). Kresba tu nechá volnou zeď. */
  hodiny: { x: 1640, y: 1452, w: 74, h: 74 } as Obdelnik,
  /** Noren visí od překladu asi sem */
  norenDole: 1430,
};

/* ——— Zboží ———
 * Kusy jsou HTML nad vrstvou `uvnitr` a pod `predni`. Kresba je nesmí
 * zakrýt: v `predni` přes tyhle obdélníky smí jít jen jemný odlesk skla
 * (opacity do 0,15) — žádné příčky, letáky, lampiony ani rostliny.
 * Cenovka visí uvnitř okénka nad kusem, páska se jménem a tlačítko
 * „Do šátku“ leží na přední hraně police (HTML).
 */

/** Okno patra: otvor, rám 16, tři příčky po 14 → čtyři tabulky */
const OKNO_VNITREK = { x: X.oknoL + 16, y: Y.oknoNahore + 16, w: X.oknoP - X.oknoL - 32, h: Y.oknoDole - Y.oknoNahore - 32 };
const TABULKA_W = (OKNO_VNITREK.w - 3 * 14) / 4;
export const OKNO = {
  vnitrek: OKNO_VNITREK as Obdelnik,
  /** Čtyři tabulky okna (vnitřek mezi rámem a příčkami) */
  tabulky: [0, 1, 2, 3].map((i): Obdelnik => ({ x: OKNO_VNITREK.x + i * (TABULKA_W + 14), y: OKNO_VNITREK.y, w: TABULKA_W, h: OKNO_VNITREK.h })),
  /** Příčky okna (svislé, mezi tabulkami) — x levé hrany, šířka 14 */
  pricky: [1, 2, 3].map((i) => OKNO_VNITREK.x + i * (TABULKA_W + 14) - 14),
  /** Přední hrana police v okně: od policeOkna dolů */
  hranaPolice: 26,
};

/** Kus v okně patra: 150 × 150 uprostřed tabulky, stojí na polici */
const kusOkna = (t: Obdelnik): Obdelnik => ({ x: t.x + (t.w - 150) / 2, y: Y.policeOkna - 150, w: 150, h: 150 });
/** Kusy ve výloze: 2 × 2, každý 112 × 112, stojí na police1 a police2 */
const kusyVylohy = (v: Obdelnik): Obdelnik[] =>
  [Y.police1, Y.police2].flatMap((p) => [28, 160].map((dx) => ({ x: v.x + dx, y: p - 112, w: 112, h: 112 })));

export const ZBOZI = {
  /** Keramika z Japonska — čtyři kusy v okně patra */
  okno: OKNO.tabulky.map(kusOkna),
  /** Kusy z dílny — výloha vlevo a vpravo, po čtyřech */
  vylohaL: kusyVylohy(PRIZEMI.vylohaL),
  vylohaP: kusyVylohy(PRIZEMI.vylohaP),
  /** Přední hrana polic ve výlohách (páska, tlačítko): od police dolů */
  hranaPolice: 26,
};

/* ——— Věci kolem domu (kdo je kreslí, ten se jich drží) ——— */
export const MISTA = {
  /** Svislá svítící cedule vlevo od domu a její tyč */
  neon: { x: 930, y: 770, w: 110, h: 620 } as Obdelnik,
  neonTyc: { x: 978, y: 1390, w: 14, h: Y.chodnikPata - 1390 } as Obdelnik,
  /** Velká lucerna na tyči vpravo od domu */
  lucernaTyc: { x: 2177, y: 1150, w: 16, h: Y.chodnikPata - 1150 } as Obdelnik,
  lucerna: { x: 2135, y: 1255, w: 100, h: 160 } as Obdelnik,
  /** Pouliční lampa vlevo (sloup a hlava) */
  lampaSloup: { x: 751, y: 860, w: 18, h: Y.chodnikPata + 40 - 860 } as Obdelnik,
  lampaHlava: { x: 830, y: 880, w: 80, h: 60 } as Obdelnik,
  /** Automat na nápoje vpravo u souseda */
  automat: { x: 2240, y: 1435, w: 180, h: Y.chodnikPata - 1435 } as Obdelnik,
  /** Stojan s tabulí (A) vlevo před domem; psací plocha je HTML */
  tabule: { x: 800, y: 1600, w: 150, h: Y.chodnikPata - 1600 } as Obdelnik,
  tabulePlocha: { x: 816, y: 1618, w: 118, h: 104 } as Obdelnik,
  /** Sousedská vývěska (掲示板) na zdi levého souseda — letáky, tři z nich jsou odkazy */
  vyveska: { x: 548, y: 1350, w: 190, h: 260 } as Obdelnik,
  /** Kolo opřené o lampu */
  kolo: { x: 580, y: 1665, w: 180, h: Y.chodnikPata + 10 - 1665 } as Obdelnik,
  /** Elektrické sloupy */
  sloupL: { x: 505, y: 40, w: 30, h: Y.obrubnik - 40 } as Obdelnik,
  sloupP: { x: 2765, y: 40, w: 30, h: Y.obrubnik - 40 } as Obdelnik,
  /** Kočka spí na zábradlí balkonu vpravo */
  kocka: { x: 1960, y: 990, w: 110, h: 60 } as Obdelnik,
};

/*
 * ——— Paleta (den) ———
 * Noc z ní dělá scena.ts sama. Odstíny si každý smí přidat, ale ať
 * drží rodinu: teplé dřevo, krémová omítka, modrošedé tašky a plech
 * jako na předloze, rumělka a indigo ze zbytku webu, sousedé chladnější
 * a šedší, aby krámek vynikl.
 */
export const P = {
  drevo: "#7A5236",
  drevoTma: "#553722",
  drevoTma2: "#3E2819",
  drevoSvetle: "#A27450",
  drevoHrana: "#C08F62",
  omitka: "#EFE3CC",
  omitkaStin: "#D9C7A8",
  omitkaTma: "#BFA987",
  taska: "#5F738F",
  taskaSvetla: "#8EA3BF",
  taskaTma: "#3F4D66",
  taskaHrana: "#2E3A50",
  plech: "#9DB1C6",
  plechSvetly: "#C7D5E2",
  plechTma: "#7088A2",
  stit: "#FBF4E6",
  stitRam: "#3E2A1D",
  rumelka: "#C4432B",
  rumelkaTma: "#9A3220",
  indigo: "#2E3F7A",
  indigoTma: "#212C5C",
  zlata: "#E2B95A",
  lampion: "#D9502F",
  lampionTma: "#A93A22",
  lampionSvetly: "#F07A50",
  cerna: "#2B2420",
  sklo: "#9FB7C9",
  skloTma: "#5E7487",
  bila: "#FFFFFF",
  list: "#4F7A4A",
  listTma: "#355A36",
  listSvetly: "#7DAA6A",
  listZluty: "#A9C98F",
  kamen: "#BDB3A2",
  kamenTma: "#9C9283",
  dlazba: "#CFC6B4",
  dlazbaSpara: "#ADA390",
  obrubnik: "#D8D1C2",
  asfalt: "#5E5D63",
  asfaltSvetly: "#77767C",
  cara: "#F2EFE6",
  kov: "#8E979E",
  kovTma: "#5E666C",
  kovSvetly: "#C3CACF",
  papir: "#FBF7EC",
  papirStin: "#E6DCC6",
  soused: "#C9C6C9",
  sousedStin: "#A9A6B0",
  sousedTma: "#8E8B98",
  sousedOkno: "#6F7C8E",
  inkoust: "#2B2420",
};

/** Světla (vrstva svetla) — teplé, ať drží s nocí na předloze */
export const SVIT = {
  zar: "#FFD58A",
  zarTepla: "#FFB45A",
  zarBila: "#FFF1C8",
  plamen: "#FF8A3D",
  neon: "#FF5C7A",
  neonBily: "#FFD2DA",
  zarivka: "#E8F4FF",
};

/** Písma pro <text> v kresbě. Na stránce jsou načtená; v náhledu se nahradí systémovými. */
export const PISMO = {
  kanji: "'Yuji Syuku', 'Yu Mincho', 'MingLiU', serif",
  /* Na stránce se písma jmenují „… Variable“ (fontsource), v náhledu bez toho */
  nadpis: "'Fraunces Variable', 'Fraunces', Georgia, serif",
  ruka: "'Caveat', cursive",
  text: "'Newsreader Variable', 'Newsreader', Georgia, serif",
};

/*
 * ——— Stmívání ———
 * Stránka posouvá „svit“ od 0 (den) do 1 (noc). Každý prvek ve vrstvě
 * svetla s data-prah se rozsvítí, když svit přejde jeho práh (s krátkým
 * náběhem, neon s blikáním). Pořadí rozsvěcování:
 */
export const PRAH = {
  /** Pouliční lampa — první, ještě za šera */
  lampa: 0.12,
  /** Okna sousedů — rozházeně mezi 0,15 a 0,7 */
  sousedOd: 0.15,
  sousedDo: 0.7,
  /** Okno patra */
  okno: 0.22,
  /** Vnitřek krámku (výlohy, dveře, lampa nad pultem) */
  uvnitr: 0.28,
  /** Lampiony jeden po druhém zleva doprava: lampionOd + i × lampionKrok */
  lampionOd: 0.34,
  lampionKrok: 0.045,
  /** Světlo na chodníku a prahu pod lampiony a z výloh */
  rozliti: 0.4,
  /** Velký štít */
  stit: 0.66,
  /** Svislá cedule (bliká, než chytne) */
  neon: 0.74,
  /** Lucerna na tyči */
  lucerna: 0.8,
  /** Automat svítí pořád; v noci je jen víc vidět */
  automat: 0,
};

/*
 * ——— Třídy, na které sahá stránka (CSS a skript) ———
 * Kdo kreslí danou věc, dá jí přesně tuhle třídu.
 */
export const TRIDY = {
  /** Každý prvek ve vrstvě svetla, který se rozsvěcuje (+ data-prah) */
  svetlo: "krm-s",
  /** Lampion i (0–6 zleva): skupina v predni i její svítící dvojník ve svetla, obojí s data-i — kývají se spolu */
  lampion: "krm-lampion",
  /** Svislá cedule ve svetla — při rozsvícení bliká */
  neon: "krm-neon",
  /** Roleta: skupina nakreslená STAŽENÁ (zavřeno), oříznutá clipPath na PRIZEMI.roleta; stránka ji vytáhne posunem nahoru o PRIZEMI.roleta.h */
  roleta: "krm-roleta",
  /** Noren ve dveřích — večer se uklidí (stránka ho zvedne a schová) */
  noren: "krm-noren",
  /** Cedulka na dveřích: líc 営業中 (otevřeno) a rub 準備中 (zavřeno) — dvě skupiny přes sebe */
  otevreno: "krm-otevreno",
  zavreno: "krm-zavreno",
  /** Vrány na drátech (jen ve dne) — při stmívání odletí */
  vrany: "krm-vrany",
  /** Můry kolem lampy (svetla) */
  mury: "krm-mury",
  /** Kočka na balkoně (ocas se hýbe: podskupina krm-kocka-ocas) */
  kocka: "krm-kocka",
  /** Látky ve větru (noren, prapor, prádlo) — jemně se vlní */
  vitr: "krm-vitr",
  jenDen: "krm-jen-den",
  jenNoc: "krm-jen-noc",
};

/** Obal světla: <g class="krm-s …" data-prah="…">obsah</g> */
export const svetlo = (prah: number, obsah: string, trida = "", data = "") =>
  `<g class="krm-s${trida ? ` ${trida}` : ""}" data-prah="${Math.round(prah * 1000) / 1000}"${data ? ` ${data}` : ""}>${obsah}</g>`;
