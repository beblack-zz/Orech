/*
 * 03, Lampion — CEDULKA SVÍTÍ NA CESTU DOMŮ
 *
 * Jako Pecinka s čóčinem a Hlínka s hózuki z průvodu na Domku 2. Cedulka
 * nese na tyčce hranatou lucernu andon: je ze stejného dřeva jako ona
 * a má stejnou stříšku. Na papíře je natrvalo JIRO písmem značky, jako
 * mají lucerny před krámem jméno domu. Svítí na cestu domů kusu, který je
 * zrovna na řadě, a ten ťape v kaluži světla pod ní.
 *
 * Bez pozadí: Cedulka chodí, takže cestu jí dělá stránka, kam ji kdo
 * postaví — v průvodu ji posouvá CSS, sama jen kráčí na místě, natočená
 * trochu z boku ke směru chůze. Nohy nemá, a tak jde jako skříň, kterou
 * stěhuje jeden člověk: z rohu na roh. Pod každým spodním rohem má
 * přivázanou dřevěnou botičku geta: bota došlápne na oba zuby, deska se
 * přes ni překlopí a pootočí, druhý roh se i s botou zvedne a posune
 * dopředu. Klap, klap. Že jde, je vidět podle otisků zubů, které za ní
 * ujíždějí dozadu,
 * podle prachu, podle šňůrky s rolničkou, která za ní vlaje, a podle
 * kusu, který ujíždí s cestou a musí ji dohánět.
 *
 * Když kus dojde domů, odhopká (a na rubu Cedulky dostane fajfku).
 * Cedulka se zastaví a počká, až zezadu přihopká další; lucerna mu
 * zaplane, Cedulka přikývne a jde se dál. Na břiše má pořád své dvě
 * čárky, žádné jméno. Občas se taky jen tak zastaví, přečte si lucernu
 * a přikývne, nebo zívne. Kolem světla se
 * místo můr třepotají papírové visačky, které ještě nevědí, čí jsou;
 * jedna si čas od času sedne Cedulce na stříšku a kus cesty se veze.
 *
 * Myš: Cedulka kouká za kurzorem a posvítí si tam, kam ukazuje; dvě
 * zvědavé visačky za ním odletí. Kdo kurzorem u lucerny mávne, rozhoupe
 * ji. Když se kurzor zastaví na Cedulce, zamává. Kliknutí na lucernu:
 * zaplane a jde se na další kus. Kliknutí na Cedulku: napoprvé zakopne
 * o roh, napodruhé se v poskoku otočí a ukáže rub — seznam těch, kdo už
 * jsou doma. Kliknutí na kus: cinkne a udělá salto. Kliknutí jinam:
 * zafouká.
 *
 * Co se nemění (deska, boty, tužka za stříškou, tyčka, lucerna), kreslí se
 * jednou a běh s tím jen hýbe. Natočení desky je zúžení vrstvy kolem osy
 * a posun bližší a vzdálenější stěny proti sobě — totéž, co dělá
 * `otocena` ve společných kusech, jen rozložené do vrstev, aby se deska
 * nemusela při každém kroku kreslit znovu. Rozsvícený papír leží přes
 * nesvítící a prolíná se do něj průhledností. Filtry tu nejsou žádné.
 */
import {
  f, rng, clamp, lerp, smooth, easeOut, rad, pt, esc, mix, hladka, mrkani, jiskraD, pruzina,
  CED, DREVO, cedDefs, cedDeska, cedTvar, cedRadky, snurka, rucka,
} from "./spolecne.js";

const ID = "cel";
const ZEM = 160;
const FIG = { x: 57, s: 0.82 };
const POSTAVA = `translate(${FIG.x} ${ZEM}) scale(${FIG.s}) translate(-90 -140)`;
const vPostave = (s) => `<g transform="${POSTAVA}">${s}</g>`;
const deg = (r) => (r * 180) / Math.PI;
const cyk = (x) => ((x % 1) + 1) % 1;
const pan = (x) => clamp((x - 90) / 90, -1, 1);
const f1 = (n) => Math.round(n * 10) / 10;
const kCili = (v, cil, dt, k) => v + (cil - v) * (1 - Math.exp(-dt / k));
/** Překročil čas mezi dvěma snímky hranici x? */
const pres = (a, b, x) => a < x && b >= x;
/** Krátké zhoupnutí tam a zpátky: od času `od` trvá `doba`. */
const pulz = (u, od, doba) => (u > od && u < od + doba ? Math.sin((Math.PI * (u - od)) / doba) ** 2 : 0);
/** Bod p otočený o úhel a (radiány, po směru hodinek jako v SVG) kolem bodu o. */
const otoc = ([x, y], a, [ox, oy]) => {
  const c = Math.cos(a), s = Math.sin(a);
  return [ox + (x - ox) * c - (y - oy) * s, oy + (x - ox) * s + (y - oy) * c];
};
/* místa na Cedulce v její kresbě (0–180) */
const VRCHOL = [90, 44.5], STRED = [90, 93], OCI = [90, 88], HRAD = [105.5, 49.4];
const RAMENA = { daleko: [121.5, 99], blizko: [58.5, 103] };
const RUKA = { tloustka: 4.3, barva: "#E9D3AE", obrys: DREVO.obrys };

/* ——— Kusy, které Cedulka vodí domů, a jejich jména ———
   Jména jsou z dílny (podoba 02, Rydlo) a jsou vidět jen na rubu Cedulky,
   v seznamu těch, kdo už jsou doma. Ondrova miska je i tady křivá. */
const KUSY = [
  { jmeno: "Mája", tvar: "miska", glazura: "#4F5E9C", lem: "#2F3A6E" },
  { jmeno: "Kuba", tvar: "hrnek", glazura: "#9DB59A", lem: "#6E8A6A" },
  { jmeno: "Ondra", tvar: "miska", glazura: "#B4552F", lem: "#7A3018", kriva: true },
  { jmeno: "Terka", tvar: "cajovka", glazura: "#F1EADB", lem: "#4F5E9C" },
  { jmeno: "Bára", tvar: "vaza", glazura: "#5A3A22", lem: "#E0B070" },
  { jmeno: "Petra", tvar: "miska", glazura: "#9DB59A", lem: "#6E8A6A" },
  { jmeno: "Lukáš", tvar: "hrnek", glazura: "#4F5E9C", lem: "#2F3A6E" },
  { jmeno: "Zuzka", tvar: "vaza", glazura: "#F1EADB", lem: "#B4552F" },
  { jmeno: "Vojta", tvar: "cajovka", glazura: "#5A3A22", lem: "#E0B070" },
  { jmeno: "Eliška", tvar: "miska", glazura: "#F1EADB", lem: "#4F5E9C" },
  { jmeno: "Honza", tvar: "hrnek", glazura: "#B4552F", lem: "#7A3018" },
  { jmeno: "Anička", tvar: "vaza", glazura: "#9DB59A", lem: "#6E8A6A" },
];
/* co je na lucerně: jméno dílny písmem značky (Zodiak z styles/znacka.css, načítá ho stránka) a jak je na papíře široké */
const NAPIS = { text: "JIRO", velikost: 9.6, sirka: 21.6 };

/* ——— Chůze po rozích ———
   Dvojkrok trvá KROK_T. Roh je OPORA z něj na zemi a jede s cestou dozadu,
   zbytek času je ve vzduchu a přenáší se dopředu. Poloha desky se pak
   spočítá z obou rohů: kde je, jak se kolébá, a z jejich vzdálenosti
   i to, jak moc je zrovna natočená — když zadní roh dojde k přednímu,
   deska je víc z boku a užší. */
const KROK_T = 1.04, KROK = 4.2, OPORA = 0.58, ZDVIH = 4.6, DECH = 3.8;
const NATOCENI = 0.56, COS0 = Math.cos(NATOCENI);
/* půlka vzdálenosti spodních rohů v panelu, kdyby stála čelem */
const ROZTEC = 31 * FIG.s;
const TLOUSTKA = 7;
/* botičky geta: jak jsou vysoké (o tolik je deska nad zemí) a jak daleko od rohu k ose jsou přivázané */
/* kresba boty je 6,4 vysoká, o čtvrtinu se zvětšuje */
const BOTA = { meritko: 1.25, vyska: 6.4 * 1.25, dovnitr: 0.84 };
/* přední roh je ten ve směru chůze, zadní je blíž k nám */
const ROHY = [{ strana: 1, faze: 0 }, { strana: -1, faze: 0.5 }];
/** Jak rychle ujíždí cesta pod rohy (v panelu za sekundu) — tak rychle by ji měl posouvat průvod. */
const RYCHLOST = (2 * KROK) / (OPORA * KROK_T);
/* ve stoji má rohy vedle sebe; v téhle fázi kroku je má stejně, jen zadní už zvedá, a tak z ní vykročí */
const FI_VYKROC = OPORA / 2;
const roh = (n, fi) => {
  const u = cyk(fi - n.faze);
  if (u < OPORA) return { z: lerp(KROK, -KROK, u / OPORA), zved: 0 };
  const k = (u - OPORA) / (1 - OPORA);
  return { z: lerp(-KROK, KROK, smooth(k)), zved: ZDVIH * Math.sin(Math.PI * k) };
};

/* ——— Výměna kusu: časy od zastavení. Přihopká další, lucerna mu zaplane a jde se. ——— */
const VYMENA = { prijde: 0.45, hotovo: 1.3, konec: 2.25 };
/** Přikývnutí: když si lucernu přečte a když dorazí další kus. */
const kyvnuti = (d, t) => {
  const u = t - d.od;
  if (d.rezim === "cte") return pulz(u, 1.45, 0.3) + pulz(u, 1.85, 0.3);
  if (d.rezim === "vymena" && d.vymena) return pulz(u, d.vymena.casy.hotovo + 0.12, 0.3) + 0.7 * pulz(u, d.vymena.casy.hotovo + 0.5, 0.28);
  return 0;
};
/** Deska v panelu: kde má patu, jak se kolébá, jak je natočená a zmáčknutá. Všechno, co je k ní přilepené, se počítá odtud. */
const figV = (d, t) => {
  const jde = 1 - d.rovna;
  /* do stoje se srovná malým poskokem */
  const hop = d.stoji ? 2.6 * Math.sin(Math.PI * d.rovna) : 0;
  const P = ROHY.map((n) => {
    const q = roh(n, d.fi);
    return [FIG.x + n.strana * ROZTEC * COS0 + q.z * jde, ZEM - q.zved * jde - hop - d.skok];
  });
  /* zakopnutí: přepadne přes přední roh a zhoupne se zpátky přes zadní */
  if (d.nakl.a > 0) P[1] = otoc(P[1], rad(d.nakl.a), P[0]);
  else if (d.nakl.a < 0) P[0] = otoc(P[0], rad(d.nakl.a), P[1]);
  const dx = P[0][0] - P[1][0], dy = P[0][1] - P[1][1];
  const c0 = clamp(Math.hypot(dx, dy) / (2 * ROZTEC), 0.3, 1);
  const psi = Math.acos(c0) + d.otoc.a, c = Math.cos(psi);
  const dech = Math.sin((t / DECH) * 2 * Math.PI);
  const mx = (P[0][0] + P[1][0]) / 2, naklon = deg(Math.atan2(dy, dx));
  return {
    /* do chůze se o chlup naklání; deska stojí na botách, a tak je o jejich výšku nad zemí */
    x: mx - FIG.x, y: (P[0][1] + P[1][1]) / 2 - ZEM - BOTA.vyska, r: naklon + 1.3 * jde,
    psi, c, sx: Math.max(0.03, Math.abs(c)), sy: 1 + 0.012 * dech + d.dosed.a + 0.05 * d.protah - 0.06 * kyvnuti(d, t) - 0.06 * d.podrep,
    /* o kolik je bližší stěna desky posunutá od osy; vzdálenější je o stejný kus na druhé straně */
    e: (c >= 0 ? 1 : -1) * (TLOUSTKA / 2) * FIG.s * Math.sin(psi),
    rohy: P,
    /* boty: kde má která podrážku a jak se naklání — na zemi stojí naplocho, zvednutá jde s deskou; při otočce se s ní protočí */
    boty: P.map((p) => ({ x: mx + (p[0] - mx) * (c / c0) * BOTA.dovnitr, y: p[1], r: naklon * clamp((ZEM - p[1]) / 1.6) })),
  };
};
const FIG0 = { x: 0, y: 0, r: 0, psi: NATOCENI, c: COS0, sx: COS0, sy: 1, e: (TLOUSTKA / 2) * FIG.s * Math.sin(NATOCENI) };
/** Bod z kresby Cedulky (0–180) do panelu. hloubka říká, jak daleko je před osou desky (líc +, rub −), ať sedí i při otočce. */
const naTelo = ([x, y], fig, hloubka = 0) => {
  const dx = (x - 90) * FIG.s * fig.c + hloubka * FIG.s * Math.sin(fig.psi), dy = (y - 140) * FIG.s * fig.sy;
  const c = Math.cos(rad(fig.r)), s = Math.sin(rad(fig.r));
  return [FIG.x + fig.x + dx * c - dy * s, ZEM + fig.y + dx * s + dy * c];
};
/** A zpátky: bod z panelu na tu stěnu desky, která je zrovna vidět. */
const doTela = ([x, y], fig) => {
  const dx = x - FIG.x - fig.x, dy = y - ZEM - fig.y;
  const c = Math.cos(rad(fig.r)), s = Math.sin(rad(fig.r));
  return [90 + (dx * c + dy * s - fig.e) / (FIG.s * Math.max(0.3, fig.sx)), 140 + (-dx * s + dy * c) / (FIG.s * fig.sy)];
};
/* kousek před lícem (a za rubem): tam je dlaň, když píše nebo sahá za stříšku pro tužku */
const LIC = TLOUSTKA / 2 + 0.6;

/* ——— Tyčka a lucerna ———
   Tyčku drží vzdálenější ručka. Dlaň se počítá od paty desky, ne od
   ramene: ručka je gumová, a tak se deska může kolébat i otáčet, a lucerna
   přitom nelítá ze strany na stranu. */
const TYC = 68, TYC_ZA = 9, UHEL0 = -65, MEZE_UHEL = [-70, -58];
const DLAN = [ROZTEC * COS0 + 16, -50 * FIG.s];
const dlan = (fig) => {
  const r = rad(0.35 * fig.r), c = Math.cos(r), s = Math.sin(r);
  return [FIG.x + fig.x + DLAN[0] * c - DLAN[1] * s, ZEM + fig.y + DLAN[0] * s + DLAN[1] * c];
};
const spicka = (H, uhel) => [H[0] + TYC * Math.cos(rad(uhel)), H[1] + TYC * Math.sin(rad(uhel))];
/* lucerna v místních souřadnicích: špička tyčky v počátku, osa dolů. Je natočená jako Cedulka: vpředu čelo s papírem, vlevo úzký bok. */
const LAMP = { xB: -18.2, xL: -11.8, xR: 18.2, y0: 19, y1: 47, lista: 2.4, sloupek: 1.8, nozky: 49.2, pricka: 26 };
const PAPIR = { x0: LAMP.xL + LAMP.sloupek, x1: LAMP.xR - LAMP.sloupek, y0: LAMP.y0 + LAMP.lista, y1: LAMP.y1 - LAMP.lista };
const BOK = { x0: LAMP.xB + 1.5, x1: LAMP.xL };
/* svíčka stojí uprostřed bedýnky, nápis je uprostřed pole pod příčkou */
const STRED_L = [1.4, 33], STRED_T = [(PAPIR.x0 + PAPIR.x1) / 2, (LAMP.pricka + 0.5 + PAPIR.y1) / 2];
const ZAVES = 31, G = 170, MEZE_TH = [-0.1, 0.5], KRAJ = 168, ZARE_R = 42;
/** Bod lucerny (v souřadnicích špičky tyčky) v panelu: houpe se o úhel th kolem špičky T. */
const naLucernu = (T, th, [x, y]) => [T[0] + x * Math.cos(th) + y * Math.sin(th), T[1] - x * Math.sin(th) + y * Math.cos(th)];
/* výchozí poloha dlaně, špičky a světla: v ní je tyčka i lucerna nakreslená, běh je odtud posouvá a otáčí */
const H0 = dlan(FIG0), T0 = spicka(H0, UHEL0), L0 = naLucernu(T0, 0, STRED_L);
const vLucerne = (s) => `<g transform="translate(${pt(T0)})">${s}</g>`;
const obd = (x0, y0, x1, y1) => `x="${f(x0)}" y="${f(y0)}" width="${f(x1 - x0)}" height="${f(y1 - y0)}"`;
/* stříška: dvě plochy, které se potkávají na nároží nad předním levým sloupkem; okraje mají jemný prohyb */
const STRISKA = {
  celo: `M0 8.2 Q11 10.4 21.2 18.4 L-13.2 19 Q-6.6 12.4 0 8.2 Z`,
  bok: `M0 8.2 Q-6.6 12.4 -13.2 19 L-21 18.2 Q-10.4 11 0 8.2 Z`,
  okapCelo: `M-13.2 19 L21.2 18.4 L20.7 19.9 L-12.9 20.5 Z`,
  okapBok: `M-21 18.2 L-13.2 19 L-12.9 20.5 L-20.5 19.7 Z`,
  prkna: `M3.2 9.6 L6.6 18.4 M6.4 10.2 L14 18.3 M-1.2 9.6 L-3.4 18.6`,
  prknaBok: `M-3.6 10.6 L-17 18.4`,
};
/* paprsky, když lucerna zaplane */
const PAPRSKY = (() => {
  let d = "";
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + 0.26, r = i % 2 ? 31 : 46, w = i % 2 ? 0.08 : 0.11;
    d += `M0 0 L${f(Math.cos(a - w) * r)} ${f(Math.sin(a - w) * r)} L${f(Math.cos(a + w) * r)} ${f(Math.sin(a + w) * r)} Z `;
  }
  return d;
})();
const JISKRA = jiskraD(1);

/* ——— Tužka: hrot v počátku, guma na +x. Za stříškou leží podél levého spádu, hrotem ke hřebeni. ——— */
const TUZKA =
  `<rect x="5.2" y="-1.7" width="14.8" height="3.4" fill="#E9B839" stroke="#8A6A1E" stroke-width="0.45"/>` +
  `<path d="M5.5 -0.6 H19.8" stroke="#F8DE86" stroke-width="0.75"/><path d="M5.5 0.7 H19.8" stroke="#C6951F" stroke-width="0.4"/>` +
  `<path d="M0 0 L5.2 -1.7 V1.7 Z" fill="#EBD2A6" stroke="#8A6A1E" stroke-width="0.45" stroke-linejoin="round"/><path d="M0 0 L1.8 -0.6 V0.6 Z" fill="#3A3A40"/>` +
  `<rect x="20" y="-1.85" width="2.6" height="3.7" fill="#CFC8BA" stroke="#7A746A" stroke-width="0.4"/><path d="M20.9 -1.8 V1.8 M21.7 -1.8 V1.8" stroke="#7A746A" stroke-width="0.3"/>` +
  `<rect x="22.6" y="-1.6" width="3.1" height="3.2" rx="1.1" fill="#E38F8F" stroke="#A85A5A" stroke-width="0.4"/>`;
const TUZKA0 = { hrot: [70.4, 53.4], uhel: 148.8 };

/* ——— Kus, který jde domů: dno v počátku, osa nahoru. Glazované, hotové, jako na horní polici v dílně. ——— */
const kusSvg = (K, sv) => {
  const g = K.glazura, obrys = mix(g, "#2A1E14", 0.6), tm = mix(g, "#2A1E14", 0.38), lesk = mix(g, "#FFFFFF", 0.45);
  const svit = (d, w) => (sv > 0.03 ? `<path d="${d}" stroke="#FFD08A" stroke-width="${w}" stroke-linecap="round" fill="none" opacity="${f(0.75 * sv)}"/>` : "");
  if (K.tvar === "hrnek")
    return (
      `<path d="M-6.2 -11.6 Q-11.6 -11.2 -11 -6.6 Q-10.4 -3.2 -6 -4.4" stroke="${obrys}" stroke-width="3.2" fill="none" stroke-linecap="round"/><path d="M-6.2 -11.6 Q-11.6 -11.2 -11 -6.6 Q-10.4 -3.2 -6 -4.4" stroke="${g}" stroke-width="1.9" fill="none" stroke-linecap="round"/>` +
      `<path d="M-6.8 -14.6 L-6.3 -1.2 Q0 1 6.3 -1.2 L6.8 -14.6 Z" fill="${g}" stroke="${obrys}" stroke-width="0.7" stroke-linejoin="round"/>` +
      `<path d="M-6.5 -5.2 Q0 -3.4 6.5 -5.2" stroke="${K.lem}" stroke-width="1.5" fill="none" opacity="0.8"/>` +
      `<ellipse cx="0" cy="-14.6" rx="6.8" ry="1.9" fill="${tm}" stroke="${obrys}" stroke-width="0.6"/>` +
      `<path d="M3.6 -12 V-4.4" stroke="${lesk}" stroke-width="1.5" opacity="0.6" stroke-linecap="round"/>` +
      svit("M-6.4 -15 Q0 -17 6.4 -15", 0.9)
    );
  if (K.tvar === "vaza")
    return (
      `<path d="M-3 -20.6 Q-2.4 -16.4 -6.4 -11.6 Q-9.4 -6.8 -5.6 -1 Q0 0.9 5.6 -1 Q9.4 -6.8 6.4 -11.6 Q2.4 -16.4 3 -20.6 Z" fill="${g}" stroke="${obrys}" stroke-width="0.7" stroke-linejoin="round"/>` +
      `<path d="M-5.8 -10.4 q1.2 3.4 0.5 5.8 M-1.2 -12.6 q0.9 3.6 0.3 7 M3.6 -11.4 q0.9 2.8 0.4 5" stroke="${K.lem}" stroke-width="1.2" fill="none" stroke-linecap="round"/>` +
      `<ellipse cx="0" cy="-20.6" rx="3" ry="0.95" fill="${tm}" stroke="${obrys}" stroke-width="0.55"/>` +
      `<path d="M4.4 -9.4 Q6 -6 4.2 -2.8" stroke="${lesk}" stroke-width="1.2" opacity="0.55" stroke-linecap="round" fill="none"/>` +
      svit("M-2.8 -21 Q0 -22 2.8 -21", 0.8)
    );
  if (K.tvar === "cajovka")
    return (
      `<path d="M-6.2 -15.2 L-5.2 -1.4 L-4.2 0 H4.2 L5.2 -1.4 L6.2 -15.2 Z" fill="${g}" stroke="${obrys}" stroke-width="0.7" stroke-linejoin="round"/>` +
      `<path d="M-5.9 -10.2 H5.9 M-5.7 -7.6 H5.7" stroke="${K.lem}" stroke-width="0.95"/>` +
      `<ellipse cx="0" cy="-15.2" rx="6.2" ry="1.7" fill="${tm}" stroke="${obrys}" stroke-width="0.55"/>` +
      `<path d="M3.4 -13 V-4" stroke="${lesk}" stroke-width="1.3" opacity="0.6" stroke-linecap="round"/>` +
      svit("M-5.8 -15.6 Q0 -17.4 5.8 -15.6", 0.9)
    );
  return (
    `<path d="M-4.2 0 H4.2 L4.6 -1.6 H-4.6 Z" fill="${tm}" stroke="${obrys}" stroke-width="0.6" stroke-linejoin="round"/>` +
    `<path d="M-10.6 -9.6 Q-9.6 -2.4 -4.4 -1.4 L4.4 -1.4 Q9.6 -2.4 10.6 -9.6 Z" fill="${g}" stroke="${obrys}" stroke-width="0.7" stroke-linejoin="round"/>` +
    `<ellipse cx="0" cy="-9.6" rx="10.6" ry="2.5" fill="${tm}" stroke="${obrys}" stroke-width="0.6"/>` +
    `<path d="M-8.6 -9.2 Q0 -7.4 8.6 -9.2" stroke="${K.lem}" stroke-width="0.8" fill="none" opacity="0.9"/>` +
    `<path d="M7.6 -7 Q7 -3.4 4 -2.4" stroke="${lesk}" stroke-width="1.2" fill="none" opacity="0.65" stroke-linecap="round"/>` +
    svit("M-10 -10.2 Q0 -12.9 10 -10.2", 1)
  );
};

/* ——— Visačka: papírová jmenovka přeložená napůl, třepotá se jako můra a táhne za sebou červenou nitku ——— */
const KRIDLO = `<path d="M0.2 -2 L3 -2.5 L4.3 -1.3 L4.3 1.7 L0.2 2.2 Z"/>`;
const CARKY = `<path d="M1.2 -0.5 H3.3 M1.2 0.7 H2.7" stroke="#8A7A69" stroke-width="0.32" stroke-linecap="round"/>`;
const visackaSvg = (m) => {
  const papir = mix("#F6EFDF", "#FFE9B4", m.sv), sp = f(0.22 + 0.78 * m.mav);
  return (
    `<g transform="translate(${f(m.x)} ${f(m.y)}) rotate(${f(m.nakl)}) scale(${f(1.25 * m.sc)})"${m.z < 0 ? ` opacity="0.85"` : ""}>` +
    `<path d="M0 2 q${f(-1.3 - m.mav * 0.6)} 2 0.2 3.6 t-0.5 3" stroke="#B84A2B" stroke-width="0.55" stroke-linecap="round" fill="none"/>` +
    `<g fill="${papir}" stroke="#8A6A48" stroke-width="0.34" stroke-linejoin="round"><g transform="scale(${sp} 1)">${KRIDLO}${CARKY}</g><g transform="scale(-${sp} 1)">${KRIDLO}</g></g>` +
    `<path d="M0 -2.3 V2.4" stroke="#8A6A48" stroke-width="0.5" stroke-linecap="round"/><circle cx="0" cy="-1.1" r="0.5" fill="#6B5D4F"/></g>`
  );
};
/* rolnička suzu na konci šňůrky: štěrbina míří dolů */
const ROLNICKA =
  `<circle cx="0" cy="0" r="2.5" fill="url(#${ID}-suzu)" stroke="#7A5A1E" stroke-width="0.5"/>` +
  `<path d="M-1.7 0.9 H1.7" stroke="#5A3E10" stroke-width="0.6" stroke-linecap="round"/><circle cx="0" cy="0.9" r="0.55" fill="#5A3E10"/>` +
  `<path d="M-1.5 -1.3 Q-0.6 -2.1 0.5 -1.9" stroke="#FFF6D2" stroke-width="0.5" stroke-linecap="round" fill="none"/>`;

/* ——— Vrstvy ——— */
/* cesta: vlastní stín, světlo lucerny, otisky zubů bot a prach. Nic víc — pozadí si nese stránka. */
const vrstvaZem = (st) => {
  const S = clamp(st.S, 0, 1.6), bx = FIG.x + st.fig.x, lx = st.L[0], sir = ROZTEC * st.fig.sx, vzduch = clamp(1 + (st.fig.y + BOTA.vyska) / 16, 0.4, 1);
  /* čím níž lucerna visí, tím je kaluž světla menší a jasnější */
  const vys = ZEM - st.L[1];
  let s =
    `<ellipse cx="${f(bx - 4 - 8 * clamp(S))}" cy="${ZEM + 0.4}" rx="${f(sir + 11 + 6 * clamp(S))}" ry="3.9" fill="url(#${ID}-stin)" opacity="${f(vzduch)}"/>` +
    `<ellipse cx="${f(bx)}" cy="${ZEM}" rx="${f(sir + 3)}" ry="2" fill="#2B2420" opacity="${f(0.17 * vzduch)}"/>`;
  if (S > 0.02) {
    const rx = 17 + vys * 0.2 + 7 * Math.max(0, S - 1);
    s += `<ellipse cx="${f(lx)}" cy="${ZEM + 0.3}" rx="${f(rx)}" ry="${f(rx * 0.19)}" fill="url(#${ID}-kaluz)" opacity="${f(clamp(S * (1.24 - vys / 150)))}"/>`;
  }
  /* otisky zůstávají na cestě, a tak ujíždějí dozadu: po každé botě dvě čárky od zubů */
  for (const p of st.stopy) s += `<path d="M${f(p.x - 3.6)} ${f(p.y)} h2 M${f(p.x + 1.8)} ${f(p.y)} h2" stroke="#3A3028" stroke-width="0.9" stroke-linecap="round" opacity="${f(0.2 * p.op)}"/>`;
  for (const p of st.prach) {
    const r = rng(p.seed);
    let g = "";
    for (let i = 0; i < 4; i++) g += `<circle cx="${f(p.x + (i % 2 ? 1 : -1) * (0.5 + r() * 1.2) * p.r)}" cy="${f(p.y - r() * p.r * 0.7)}" r="${f(p.r * (0.36 + r() * 0.34))}"/>`;
    s += `<g fill="#A8957A" opacity="${f(p.op)}">${g}</g>`;
  }
  return s;
};
/* záře kolem lucerny: kruh nakreslený jednou, běh ho nosí za světlem a průhledností s ním tepe */
const vrstvaZare = () => `<circle cx="${f(L0[0])}" cy="${f(L0[1])}" r="${ZARE_R}" fill="url(#${ID}-zare)"/>`;
/* plocha končí na 180: když se lucerna rozhoupe ke kraji, záře zeslábne, ať ji kraj neusekne natvrdo */
const uKraje = (st) => clamp((180 - 14 - st.L[0]) / 22);
/* šňůrka, na které Cedulka jindy visí: tady za ní vlaje od hřebene stříšky a na konci má rolničku */
const vrstvaSnurka = (st) => {
  const B = st.snura, n = B.length - 1;
  const uhel = deg(Math.atan2(B[n][1] - B[n - 1][1], B[n][0] - B[n - 1][0])) - 90;
  return snurka(hladka(B), { sirka: 1.9, posun: st.t * 2.2 * st.chod, obrys: "#8E2A1C" }) + `<g transform="translate(${pt(B[n])}) rotate(${f(uhel * 0.6)}) translate(0 1.8)">${ROLNICKA}</g>`;
};
/* tyčka: nakreslená jednou od dlaně ke špičce, běh ji nosí za dlaní a natáčí */
const vrstvaTyc = () => {
  const u = [Math.cos(rad(UHEL0)), Math.sin(rad(UHEL0))];
  const A = [H0[0] - u[0] * TYC_ZA, H0[1] - u[1] * TYC_ZA], c = `M${pt(A)} L${pt(T0)}`;
  /* kde ji drží, je omotaná červenobílou šňůrkou */
  const omotani = `M${pt([H0[0] - u[0] * 4.4, H0[1] - u[1] * 4.4])} L${pt([H0[0] + u[0] * 4.4, H0[1] + u[1] * 4.4])}`;
  return (
    `<path d="${c}" stroke="${DREVO.obrys}" stroke-width="2.7" stroke-linecap="round" fill="none"/>` +
    `<path d="${c}" stroke="#E4CDA2" stroke-width="1.6" stroke-linecap="round" fill="none"/>` +
    `<path d="M${pt([A[0] + u[1] * 0.38, A[1] - u[0] * 0.38])} L${pt([T0[0] + u[1] * 0.38, T0[1] - u[0] * 0.38])}" stroke="#F6E8CA" stroke-width="0.5" stroke-linecap="round" fill="none"/>` +
    snurka(omotani, { sirka: 2.9 }) +
    /* zářez a očko, ve kterém lucerna visí */
    `<circle cx="${f(T0[0])}" cy="${f(T0[1])}" r="1.35" fill="#6B5D4F"/><circle cx="${f(T0[0])}" cy="${f(T0[1])}" r="0.55" fill="#CFC8BA"/>`
  );
};
const pohybTyce = (st) => ({ x: st.H[0] - H0[0], y: st.H[1] - H0[1], r: st.uhel - UHEL0, ox: H0[0], oy: H0[1] });
/* vzdálenější ručka drží tyčku; je za deskou, ať z ní vyrůstá */
const vrstvaRukaZa = (st) => rucka(st.ramena.daleko, st.H, { ...RUKA, ohyb: 0.4 });
/* tužka za stříškou jako za uchem; když ji Cedulka drží v ruce, tahle zmizí */
const vrstvaTuzka = () => vPostave(`<g transform="translate(${pt(TUZKA0.hrot)}) rotate(${TUZKA0.uhel})">${TUZKA}</g>`);
/* vzdálenější stěna desky: je z ní vidět jen proužek hrany na straně, ze které se díváme */
const vrstvaHrana = () =>
  vPostave(
    `<path d="${CED.tvar}" fill="${DREVO.hrana}" stroke="${DREVO.obrys}" stroke-width="1.6" stroke-linejoin="round"/>` +
      `<path d="${CED.strecha}" stroke="#80623F" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  );
/* deska z původní kresby a očko šňůrky provlečené dírkou a uvázané na hřebeni */
const vrstvaDeska = () =>
  vPostave(
    cedDeska(ID) +
      snurka("M90 62.6 C88.2 57 88.4 50 90 44.6", { sirka: 2.5, obrys: "#8E2A1C" }) +
      `<ellipse cx="90" cy="43.6" rx="3.3" ry="2.5" fill="#B84A2B" stroke="#8E2A1C" stroke-width="0.7"/><path d="M88 42.6 Q90 44.6 92.2 43" stroke="#FBF7EE" stroke-width="1.2" stroke-linecap="round" fill="none"/>`,
  );
/*
 * Botička geta z boku, špičkou ve směru chůze: deska se zvednutou špičkou,
 * dva zuby a červenobílý pásek, kterým je přivázaná k rohu desky. Kreslí
 * se jednou tam, kde stojí ve stoji, a běh ji nosí za rohem.
 */
const BOTA_X = ROHY.map((n) => FIG.x + n.strana * ROZTEC * COS0 * BOTA.dovnitr);
const vrstvaBota = (i) => () =>
  `<g transform="translate(${f(BOTA_X[i])} ${ZEM}) scale(${BOTA.meritko})">` +
  `<path d="M-4.6 0 V-4.4 H-2.2 V0 Z M1.4 0 V-4.4 H3.8 V0 Z" fill="${DREVO.hrana}" stroke="${DREVO.obrys}" stroke-width="0.6" stroke-linejoin="round"/>` +
  `<path d="M-6.7 -4.2 H5.8 Q7.2 -4.5 7 -5.5 L6.7 -6.3 Q6.5 -6.7 5.9 -6.6 L-6 -6.4 Q-6.9 -6.4 -6.9 -5.6 V-4.6 Q-6.9 -4.2 -6.7 -4.2 Z" fill="url(#${ID}-drevo)" stroke="${DREVO.obrys}" stroke-width="0.7" stroke-linejoin="round"/>` +
  `<path d="M-5.6 -5.8 H4.8" stroke="#FFF6E2" stroke-width="0.5" stroke-linecap="round" opacity="0.6"/>` +
  snurka("M3 -6.5 Q0.8 -9.8 -3 -10.6", { sirka: 1.2, obrys: "#8E2A1C" }) +
  snurka("M3 -6.5 Q4.6 -9 3.2 -11.2", { sirka: 1.2, obrys: "#8E2A1C" }) +
  `<circle cx="3" cy="-6.7" r="1.05" fill="#B84A2B" stroke="#8E2A1C" stroke-width="0.4"/></g>`;
const pohybBoty = (i) => (st) => {
  const b = st.fig.boty[i];
  return { x: b.x - BOTA_X[i], y: b.y - ZEM, r: b.r, ox: BOTA_X[i], oy: ZEM };
};
/* teplé světlo lucerny na straně, která je k ní blíž; odvrácená strana desky je ve stínu */
const vrstvaSvit = (st) => {
  const S = clamp(st.S, 0, 1.5), [cx, cy] = st.Lt;
  const dal = Math.hypot(cx - STRED[0], cy - STRED[1]), r = dal + 30;
  return vPostave(
    `<defs><radialGradient id="${ID}-svit-g" gradientUnits="userSpaceOnUse" cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}">` +
      `<stop offset="${f(clamp((dal - 46) / r))}" stop-color="#FFC27A" stop-opacity="${f(clamp(0.66 * S))}"/><stop offset="${f(clamp((dal - 4) / r, 0.01, 0.98))}" stop-color="#F29A52" stop-opacity="${f(clamp(0.16 * S))}"/><stop offset="1" stop-color="#F29A52" stop-opacity="0"/></radialGradient></defs>` +
      `<path d="${CED.tvar}" fill="url(#${ID}-stin-tela)"/>` +
      `<path d="${CED.tvar}" fill="url(#${ID}-svit-g)"/>` +
      `<g clip-path="url(#${ID}-orez)"><path d="${CED.tvar}" fill="none" stroke="url(#${ID}-svit-g)" stroke-width="3.4"/></g>` +
      `<path d="M91 45.6 L128 68" stroke="url(#${ID}-svit-g)" stroke-width="2.2" stroke-linecap="round" fill="none"/>`,
  );
};
/* rub: seznam těch, kdo už jsou doma, a pod nimi ten, kdo je na řadě; vpravo nahoře razítko dílny */
const rubSvg = (st) => {
  const radky = [...st.hotove.map((i) => [i, true]), [st.naRade, false]];
  return (
    `<g clip-path="url(#${ID}-orez)">` +
    radky
      .map(([i, doma], q) => {
        const y = 89 + q * 12.4;
        return (
          `<text x="63.5" y="${f(y)}" font-family="Caveat, cursive" font-weight="600" font-size="13.5" fill="#3A2E28" opacity="${doma ? 0.72 : 1}">${esc(KUSY[i].jmeno)}</text>` +
          `<rect x="102.6" y="${f(y - 8)}" width="8.2" height="8.2" rx="1.3" fill="none" stroke="${DREVO.obrys}" stroke-width="0.9"/>` +
          (doma ? `<path d="M104 ${f(y - 4.2)} l2.7 3 l5.2 -7.8" stroke="#B84A2B" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>` : "")
        );
      })
      .join("") +
    `</g><rect x="104" y="68" width="9" height="9" rx="1.2" fill="#C4432B" opacity="0.88"/><path d="M106.2 70.4 H110.8 M108.5 70.4 V75.2 M106.2 72.8 H110.8" stroke="#F4EBDD" stroke-width="0.9"/>`
  );
};
/* tvář a břicho: dvě čárky z původní kresby, žádné jméno */
const vrstvaTvar = (st) => {
  if (st.rub) return vPostave(rubSvg(st));
  let s = `<g clip-path="url(#${ID}-orez)">${cedRadky()}</g>` + cedTvar(ID, { dx: st.pohled[0], dy: st.pohled[1], mrk: st.mrk, oci: st.oci, usta: st.usta, tvare: st.tvare, odlesk: mix("#FFF8EE", "#FFD487", 0.7 * clamp(st.S)) });
  /* zívá: pusa „o“ z původní kresby se roztáhne */
  if (st.zev > 0.05 && st.usta === "o") s += `<ellipse cx="90" cy="${f(101.4 + 0.9 * st.zev)}" rx="${f(2.6 + 1.5 * st.zev)}" ry="${f(3.2 + 2.8 * st.zev)}" fill="#3A1A12"/>`;
  return vPostave(s);
};
/* bližší ručka: při chůzi se houpe a mává */
const vrstvaRukaPred = (st) => rucka(st.ramena.blizko, st.ruka, { ...RUKA, ohyb: st.ohyb });
/* lucerna zhasnutá: šňůrka, na které visí, a papír tak, jak vypadá bez světla */
const vrstvaLucerna = () =>
  vLucerne(
    snurka("M0 0.6 V7", { sirka: 1.4, obrys: "#8E2A1C" }) +
      `<rect ${obd(BOK.x0, PAPIR.y0, BOK.x1, PAPIR.y1)} fill="url(#${ID}-papir-bok)"/>` +
      `<rect ${obd(PAPIR.x0, PAPIR.y0, PAPIR.x1, PAPIR.y1)} fill="url(#${ID}-papir)"/>`,
  );
/* totéž rozsvícené: svíčka prosvěcuje papír zevnitř, uprostřed nejvíc */
const vrstvaLucernaSvit = () =>
  vLucerne(
    `<rect ${obd(BOK.x0, PAPIR.y0, BOK.x1, PAPIR.y1)} fill="url(#${ID}-bok-svit)"/>` +
      `<rect ${obd(PAPIR.x0, PAPIR.y0, PAPIR.x1, PAPIR.y1)} fill="url(#${ID}-papir-svit)"/>` +
      `<g clip-path="url(#${ID}-papir-orez)"><ellipse cx="${STRED_L[0]}" cy="${STRED_L[1] + 5}" rx="8" ry="10.5" fill="url(#${ID}-jas)"/></g>`,
  );
/* nápis na papíře: JIRO písmem značky, natrvalo. textLength drží šířku, i kdyby se písmo nenačetlo. */
const vrstvaJmeno = () =>
  vLucerne(
    `<text x="${f(STRED_T[0])}" y="${f(STRED_T[1] + NAPIS.velikost * 0.35)}" text-anchor="middle" textLength="${NAPIS.sirka}" lengthAdjust="spacingAndGlyphs" font-family="Zodiak, Georgia, serif" font-weight="700" font-size="${NAPIS.velikost}" fill="#3A2418">${esc(NAPIS.text)}</text>`,
  );
/* dřevo lucerny: sloupky, lišty, příčky a stříška. Leží přes papír i přes nápis. */
const vrstvaLucernaRam = () => {
  const tm = `fill="url(#${ID}-ram-bok)" stroke="${DREVO.obrys}" stroke-width="0.45" stroke-linejoin="round"`;
  const sv = `fill="url(#${ID}-ram)" stroke="${DREVO.obrys}" stroke-width="0.5" stroke-linejoin="round"`;
  return vLucerne(
    /* bok ve stínu: zadní sloupek, lišty a dvě příčky */
    `<g ${tm}><rect ${obd(LAMP.xB, LAMP.y0, LAMP.xB + 1.5, LAMP.nozky)}/><rect ${obd(LAMP.xB, LAMP.y0, LAMP.xL, LAMP.y0 + LAMP.lista)}/><rect ${obd(LAMP.xB, LAMP.y1 - LAMP.lista, LAMP.xL, LAMP.y1)}/>` +
      `<rect ${obd(BOK.x0, 28.6, BOK.x1, 29.5)} stroke-width="0.3"/><rect ${obd(BOK.x0, 36.6, BOK.x1, 37.5)} stroke-width="0.3"/></g>` +
      /* čelo: jedna příčka nahoře jako u šódži, pod ní pole se jménem */
      `<g ${sv}><rect ${obd(PAPIR.x0, LAMP.pricka - 0.5, PAPIR.x1, LAMP.pricka + 0.5)} stroke-width="0.3"/>` +
      `<rect ${obd(LAMP.xL, LAMP.y0, LAMP.xR, LAMP.y0 + LAMP.lista)}/><rect ${obd(LAMP.xL, LAMP.y1 - LAMP.lista, LAMP.xR, LAMP.y1)}/>` +
      `<rect ${obd(LAMP.xL, LAMP.y0, LAMP.xL + LAMP.sloupek, LAMP.nozky)}/><rect ${obd(LAMP.xR - LAMP.sloupek, LAMP.y0, LAMP.xR, LAMP.nozky)}/></g>` +
      /* zevnitř na dřevo svítí svíčka */
      `<path d="M${PAPIR.x0 + 0.2} ${PAPIR.y0 + 0.4} V${PAPIR.y1 - 0.4} M${PAPIR.x1 - 0.2} ${PAPIR.y0 + 0.4} V${PAPIR.y1 - 0.4} M${PAPIR.x0 + 0.4} ${PAPIR.y1 - 0.2} H${PAPIR.x1 - 0.4}" stroke="#FFC878" stroke-width="0.45" opacity="0.7" fill="none"/>` +
      /* stříška jako má Cedulka */
      `<path d="${STRISKA.bok}" fill="url(#${ID}-striska-bok)" stroke="${DREVO.obrys}" stroke-width="0.55" stroke-linejoin="round"/>` +
      `<path d="${STRISKA.celo}" fill="url(#${ID}-striska)" stroke="${DREVO.obrys}" stroke-width="0.55" stroke-linejoin="round"/>` +
      `<path d="${STRISKA.prkna}" stroke="${DREVO.obrys}" stroke-width="0.32" stroke-linecap="round" opacity="0.4" fill="none"/><path d="${STRISKA.prknaBok}" stroke="#5E4630" stroke-width="0.32" stroke-linecap="round" opacity="0.4" fill="none"/>` +
      `<path d="${STRISKA.okapBok}" fill="#8F6E46" stroke="${DREVO.obrys}" stroke-width="0.4" stroke-linejoin="round"/><path d="${STRISKA.okapCelo}" fill="#B48E62" stroke="${DREVO.obrys}" stroke-width="0.4" stroke-linejoin="round"/>` +
      `<path d="M0.4 8.6 Q10.6 10.6 20.4 18" stroke="#F3E3C6" stroke-width="0.5" stroke-linecap="round" fill="none" opacity="0.7"/>` +
      /* korálek, do kterého je uvázaná šňůrka */
      `<circle cx="0" cy="7.4" r="1.7" fill="#B84A2B" stroke="#8E2A1C" stroke-width="0.5"/><circle cx="-0.5" cy="6.9" r="0.5" fill="#F0A088"/>`,
  );
};
const pohybLucerny = (st) => ({ x: st.T[0] - T0[0], y: st.T[1] - T0[1], r: -deg(st.th), ox: T0[0], oy: T0[1] });
/* kus, který jde domů (a ten, co už odchází); ten, co teprve přibíhá zezadu, Cedulku oběhne za zády */
const vrstvaKus = (vzadu) => (st) =>
  st.misky
    .filter((m) => m.vzadu === vzadu)
    .map((m) => {
      const K = KUSY[m.i], vys = -m.y;
      return (
        `<ellipse cx="${f(m.x)}" cy="${ZEM + 0.5}" rx="${f(Math.max(3, 9 - vys * 0.14))}" ry="1.7" fill="#2B2420" opacity="${f(0.22 * m.op * clamp(1 - vys / 34))}"/>` +
        `<g transform="translate(${f(m.x)} ${f(ZEM + m.y)}) rotate(${f(m.rot + (K.kriva ? -8 : 0))} 0 -6)" opacity="${f(m.op)}">${kusSvg(K, m.sv)}</g>`
      );
    })
    .join("");
const vrstvaVisacky = (vpredu) => (st) => st.visacky.filter((m) => m.z >= 0 === vpredu).map(visackaSvg).join("");
/* co létá jen chvíli: paprsky a jiskry, když lucerna zaplane, fajfka a čáry větru */
const vrstvaJiskry = (st) => {
  let s = "";
  const [lx, ly] = st.L;
  if (st.zar > 0.03) {
    s += `<path d="${PAPRSKY}" transform="translate(${f(lx)} ${f(ly)}) rotate(${f(st.t * 22)}) scale(${f(0.5 + 0.5 * clamp(st.zar))})" fill="url(#${ID}-paprsky)" opacity="${f(clamp(0.8 * st.zar))}"/>`;
    s += `<circle cx="${f(lx)}" cy="${f(ly)}" r="${f(15 + 9 * st.zar)}" fill="url(#${ID}-jas)" opacity="${f(clamp(0.6 * st.zar))}"/>`;
  }
  for (const v of st.vanek) {
    const u = v.vek / v.zivot, x = v.x + v.smer * u * 46, k = v.smer * 9;
    s += `<path d="M${f(x)} ${f(v.y)} q${f(k * 0.5)} ${f(-2.4)} ${f(k)} 0 t${f(k)} 0" stroke="#8A7A69" stroke-width="0.9" stroke-linecap="round" fill="none" opacity="${f(0.75 * Math.sin(Math.PI * u))}"/>`;
  }
  for (const q of st.fajfky) {
    const u = q.vek / 1.3, k = 0.7 + 0.5 * easeOut(u / 0.25);
    s += `<path d="M-3 0 l2.4 2.8 l4.8 -7" transform="translate(${f(q.x)} ${f(q.y - 13 * easeOut(u))}) scale(${f(k)})" stroke="#B84A2B" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="${f(clamp(Math.min(u / 0.1, (1 - u) / 0.4)))}"/>`;
  }
  for (const j of st.jiskry) {
    const u = j.vek / j.zivot;
    s += `<path d="${JISKRA}" transform="translate(${f(j.x)} ${f(j.y)}) rotate(${f(j.rot + u * 80)}) scale(${f(j.r * (1 - u * 0.4))})" fill="${j.sv ? "#FFFBE0" : "#FFC860"}" stroke="#C8621E" stroke-width="${f(0.26 / j.r)}" opacity="${f(clamp(Math.min(u / 0.1, (1 - u) / 0.5)))}"/>`;
  }
  return s;
};

const defs = () =>
  cedDefs(ID) +
  `<clipPath id="${ID}-papir-orez"><rect ${obd(PAPIR.x0, PAPIR.y0, PAPIR.x1, PAPIR.y1)}/></clipPath>` +
  `<radialGradient id="${ID}-stin"><stop offset="0" stop-color="#2B2420" stop-opacity="0.28"/><stop offset="0.6" stop-color="#2B2420" stop-opacity="0.13"/><stop offset="1" stop-color="#2B2420" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="${ID}-kaluz"><stop offset="0" stop-color="#FFC268" stop-opacity="0.62"/><stop offset="0.55" stop-color="#F59A4E" stop-opacity="0.24"/><stop offset="1" stop-color="#F59A4E" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="${ID}-zare"><stop offset="0" stop-color="#FFE0A0" stop-opacity="0.6"/><stop offset="0.38" stop-color="#FFA858" stop-opacity="0.24"/><stop offset="1" stop-color="#FF9A4A" stop-opacity="0"/></radialGradient>` +
  /* odvrácená strana desky */
  `<linearGradient id="${ID}-stin-tela" x1="0" y1="0.35" x2="1" y2="0.55"><stop offset="0" stop-color="#4A3020" stop-opacity="0.3"/><stop offset="0.5" stop-color="#4A3020" stop-opacity="0.07"/><stop offset="0.78" stop-color="#4A3020" stop-opacity="0"/></linearGradient>` +
  /* papír lucerny: zhasnutý, a prosvícený svíčkou */
  `<linearGradient id="${ID}-papir" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#EFE5CE"/><stop offset="1" stop-color="#DACBAC"/></linearGradient>` +
  `<linearGradient id="${ID}-papir-bok" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#BFAF90"/><stop offset="1" stop-color="#D0C1A2"/></linearGradient>` +
  `<radialGradient id="${ID}-papir-svit" cx="0.44" cy="0.62" r="0.72"><stop offset="0" stop-color="#FFFBE4"/><stop offset="0.32" stop-color="#FFEBA8"/><stop offset="0.7" stop-color="#FFCF74"/><stop offset="1" stop-color="#F6AC52"/></radialGradient>` +
  `<linearGradient id="${ID}-bok-svit" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#E88E3C"/><stop offset="1" stop-color="#F9BE64"/></linearGradient>` +
  `<radialGradient id="${ID}-jas"><stop offset="0" stop-color="#FFF8D2" stop-opacity="0.9"/><stop offset="0.5" stop-color="#FFD070" stop-opacity="0.32"/><stop offset="1" stop-color="#FFC860" stop-opacity="0"/></radialGradient>` +
  /* dřevo lucerny je stejné jako Cedulčino; bok a stříška jsou tmavší */
  `<linearGradient id="${ID}-ram" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${DREVO.svetle}"/><stop offset="1" stop-color="${DREVO.tmave}"/></linearGradient>` +
  `<linearGradient id="${ID}-ram-bok" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#B8996C"/><stop offset="1" stop-color="#C9AC80"/></linearGradient>` +
  `<linearGradient id="${ID}-striska" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stop-color="#E0C194"/><stop offset="1" stop-color="#C19C6A"/></linearGradient>` +
  `<linearGradient id="${ID}-striska-bok" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#AE8A5C"/><stop offset="1" stop-color="#8F6E46"/></linearGradient>` +
  `<radialGradient id="${ID}-paprsky" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="46"><stop offset="0" stop-color="#FFFBE0" stop-opacity="0.95"/><stop offset="0.45" stop-color="#FFD070" stop-opacity="0.55"/><stop offset="1" stop-color="#FFA050" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="${ID}-suzu" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stop-color="#FFF1C4"/><stop offset="0.5" stop-color="#E2BE66"/><stop offset="1" stop-color="#9A7426"/></radialGradient>`;

/* ——— Simulace ——— */
const SNURA = { n: 9, clanek: 4.9 };
/**
 * Šňůrka z článků. Každý míří tam, kam ho táhne vítr od chůze a tíha
 * (ke konci víc, kvůli rolničce), vlní se a jde za článkem před sebou
 * s malým zpožděním — co udělá hřeben stříšky, doběhne na konec jako vlna.
 */
const krokSnury = (d, P0, t, dt) => {
  const B = d.snura, n = B.length - 1, chod = clamp(d.posuv / RYCHLOST, 0, 2);
  const wx = -(1 + 0.7 * chod) + 3.4 * d.vitr + d.skub[0], wy = 0.16 - 0.12 * Math.min(1, chod) + d.skub[1], trepot = 0.16 + 0.2 * chod + 0.45 * Math.abs(d.vitr);
  const kx = B[n].x, ky = B[n].y;
  B[0].x = P0[0];
  B[0].y = P0[1];
  for (let i = 1; i <= n; i++) {
    const a = B[i - 1], b = B[i], q = i / n;
    const uhel = Math.atan2(wy + 0.42 * q * q, wx) + trepot * q * Math.sin(7.2 * t - 1.25 * i);
    b.x = kCili(b.x, a.x + SNURA.clanek * Math.cos(uhel), dt, 0.05);
    b.y = kCili(b.y, a.y + SNURA.clanek * Math.sin(uhel), dt, 0.05);
    /* článek se nenatahuje */
    const dx = b.x - a.x, dy = b.y - a.y, vz = Math.hypot(dx, dy) || 1;
    b.x = clamp(a.x + (dx / vz) * SNURA.clanek, 5, 175);
    b.y = clamp(a.y + (dy / vz) * SNURA.clanek, 5, ZEM - 3);
  }
  d.skub = d.skub.map((q) => kCili(q, 0, dt, 0.28));
  /* jak rychle letí rolnička */
  return Math.hypot(B[n].x - kx, B[n].y - ky) / dt;
};
const obehVisacky = (m, t) => {
  const rr = m.r + m.rozprch, k = clamp(rr / m.r0);
  m.z = m.sedi > 0 ? 1 : rr * Math.sin(m.a);
  m.x = clamp(m.c[0] + rr * Math.cos(m.a) * 0.95 + m.odfuk, 6, 174);
  m.y = clamp(m.c[1] + (m.h0 + 4 * Math.sin(t * m.w * 0.8 + m.fz)) * k - m.z * 0.1, 8, ZEM - 6);
};
const novaMiska = (i, x, role) => ({ i, x, y: 0, rot: 0, op: role === "prichazi" ? 0 : 1, role, zezadu: role === "prichazi", stav: "sedi", t0: 0, x0: x, x1: x, vyska: 0, doba: 0.3, ceka: 0.25, salto: false });
const DOMOV = L0[0] + 4;
/* dokud je přibíhající kus vlevo odtud, kreslí se za Cedulkou */
const ZA_ZADY = FIG.x + ROZTEC + 7;
const novaDynamika = () => {
  const R = rng(2611);
  const d = {
    nahoda: R, zvuk: [],
    /* chůze: fáze kroku, tempo, jak moc stojí srovnaná a co zrovna dělá (jde, cte, zev, vymena, zakop, otocka) */
    fi: 0.1, tempo: 1, rovna: 0, stoji: false, posuv: RYCHLOST, rezim: "jde", od: 0, doCteni: 5 + R() * 1.5, doVymeny: 10.5 + R() * 2, doZivnuti: 23 + R() * 6,
    /* deska: náklon při zakopnutí, otočka kolem svislé osy, dosednutí a poskok */
    nakl: { a: 0, v: 0 }, otoc: { a: 0, v: 0 }, otocCil: 0, zpet: 0, dosed: { a: 0, v: 0 }, skok: 0, podrep: 0, protah: 0,
    lek: -100, radost: -100, stud: -100, mava: 0, mavaOd: -100, naNi: 0, pohled: [1.4, 0.1],
    /* tyčka a lucerna: úhel tyčky v dlani, kyvadlo na její špičce, zaplanutí a jak moc je světlo ztlumené nebo sfouknuté */
    uhel: { a: UHEL0, v: 0 }, cilUhel: UHEL0, H: [...H0], th: -0.05, om: 0, T: T0, Tp: null, Vp: null, aT: [0, 0], L: L0, zar: 0, zaplanT: -100, tlum: 0, sfouk: 0,
    /* kusy: čí je zrovna na řadě, kdo už je doma a kdo přijde po něm */
    naRade: 0, hotove: [KUSY.length - 3, KUSY.length - 2, KUSY.length - 1], dalsi: 1, fronta: 0, vymena: null,
    ruka: null,
    misky: [novaMiska(0, DOMOV, "jde")],
    snura: [],
    visacky: Array.from({ length: 3 }, (_, i) => ({
      a: 0.5 + i * 2.2 + R() * 0.5, smer: i === 1 ? -1 : 1, va: 0.9 + R() * 0.6, r0: [24, 22, 33][i], r: 0, h0: [-25, 23, -17][i], fz: R() * 6.28, w: 0.7 + R() * 0.6,
      /* první dvě jsou zvědavé a letí za kurzorem, třetí zůstává u světla */
      zved: i < 2 ? 0.6 + R() * 0.35 : 0, lenost: 0.5 + R() * 0.6, c: [...L0], rozprch: 0, odfuk: 0, sedi: 0, x: 0, y: 0, z: 0, vx: 1,
    })),
    doSednuti: 21 + R() * 5, sedi: false,
    stopy: [], prach: [], jiskry: [], vanek: [], fajfky: [],
    mysP: null, mysV: [0, 0], vitr: 0, skub: [0, 0], klavesa: 0, cink: -100, cikady: 17 + R() * 9, suzu: -100,
  };
  const fig = figV(d, 0);
  d.ruka = vychoziRuka(d, 0, fig);
  /* šňůrka: natažená dozadu a nechaná chvíli doznít, ať první snímek nezačíná rovnou čárou */
  const P0 = naTelo(VRCHOL, fig);
  d.snura = Array.from({ length: SNURA.n }, (_, i) => ({ x: P0[0] - i * SNURA.clanek * 0.97, y: P0[1] + i * i * 0.12 }));
  for (let i = 0; i < 80; i++) krokSnury(d, P0, i / 60 - 80 / 60, 1 / 60);
  for (const m of d.visacky) {
    m.r = m.r0;
    obehVisacky(m, 0);
  }
  return d;
};
const zacni = (d, t, rezim) => {
  d.rezim = rezim;
  d.od = t;
};
/** Roh desky došlápl na cestu. */
const doslap = (d, sila, x) => d.zvuk.push({ druh: "roh", sila, pan: pan(x) });
const zaprasit = (d, x, y = ZEM + 0.4) => {
  if (d.prach.length < 8) d.prach.push({ x, y, vek: 0, seed: Math.floor(d.nahoda() * 1000) });
};
const prsk = (d, [x, y], pocet, { rychlost = 60, zivot = 0.7, r = 2, nahoru = 0 } = {}) => {
  const R = d.nahoda;
  for (let i = 0; i < pocet && d.jiskry.length < 40; i++) {
    const a = R() * 6.28, v = rychlost * (0.35 + R() * 0.65);
    d.jiskry.push({ x: x + Math.cos(a) * 12, y: y + Math.sin(a) * 12, vx: Math.cos(a) * v, vy: Math.sin(a) * v - nahoru, vek: 0, zivot: zivot * (0.6 + R() * 0.8), r: r * (0.5 + R() * 0.8), rot: R() * 90, sv: R() < 0.45 });
  }
};
const SALTO = (m) => ({ kam: m.x + (m.role === "jde" ? 2 : 10), vyska: 17, doba: 0.62, salto: true });
const skocMiska = (m, t, { kam, vyska, doba, salto = false }) => Object.assign(m, { stav: "skok", t0: t, x0: m.x, x1: kam, vyska, doba, salto });
/** Šňůrkou to škubne: na chvíli ji to odnese jinam, než kam ji táhne vítr, a rolnička zazvoní. */
const skubniSnurou = (d, x, y) => {
  d.skub = [x, y];
};
/** Lucerna zaplane a visačky se rozprsknou. */
const zaplan = (d, t, sila = 1) => {
  /* držená klávesa kliká třicetkrát za vteřinu: lucerna potřebuje chvilku, než zaplane znovu */
  if (t - d.zaplanT < 0.22) return;
  const R = d.nahoda;
  d.zaplanT = t;
  d.zar = Math.min(2.1, d.zar + 1.15 * sila);
  d.om += (R() - 0.5) * 1.2;
  prsk(d, d.L, Math.round(11 * sila), { rychlost: 66, zivot: 0.8, r: 2.1, nahoru: 10 });
  for (const m of d.visacky) m.rozprch = Math.min(40, m.rozprch + (20 + R() * 12) * sila);
  d.zvuk.push({ druh: "zaplan", sila: 0.8 * sila, pan: pan(d.L[0]) });
};
/** Kus došel domů: odhopká, na seznamu dostane fajfku a Cedulka počká na dalšího. */
const zacniVymenu = (d, t) => {
  const novy = d.dalsi;
  d.dalsi = (d.dalsi + 1) % KUSY.length;
  d.fronta = 0;
  zacni(d, t, "vymena");
  d.vymena = { novy, casy: VYMENA };
  d.hotove = [...d.hotove, d.naRade].slice(-3);
  for (const m of d.misky) {
    if (m.role === "odchazi") continue;
    m.role = "odchazi";
    m.ceka = Math.min(m.ceka, 0.1);
    if (d.fajfky.length < 4) d.fajfky.push({ x: m.x, y: ZEM - 22, vek: 0 });
  }
  d.zvuk.push({ druh: "ding", sila: 0.5, pan: pan(DOMOV) });
};
/** Kliknutí na lucernu: zaplane a jde se na další kus (hned, nebo až Cedulka dodělá, co dělá). */
const rozsvit = (d, t) => {
  zaplan(d, t);
  if (d.rezim === "jde" || d.rezim === "cte" || d.rezim === "zev") zacniVymenu(d, t);
  else d.fronta = 1;
};
/** Lekne se, ale nepustí, co má rozdělané. */
const lekniSe = (d, t, smer = 1) => {
  d.lek = t;
  d.nakl.v += 70 * smer;
};
/** Zakopne o přední roh: přepadne dopředu, dvěma rychlými krůčky to vybere a lucerna se rozhoupe. */
const zakopni = (d, t) => {
  if (d.rezim === "vymena" || d.rezim === "otocka") return lekniSe(d, t);
  if (d.rezim === "zakop" && t - d.od < 0.7) return;
  zacni(d, t, "zakop");
  d.nakl.v += 300;
  d.om += 2.2;
  d.uhel.v += 60;
  d.lek = t;
  skubniSnurou(d, 2.2, -1.6);
  for (const m of d.visacky) m.rozprch += 8;
  d.zvuk.push({ druh: "kopyta", sila: 0.9, pan: pan(FIG.x + 20) });
};
/** V poskoku se otočí a ukáže rub se seznamem; dalším kliknutím (nebo po chvíli sama) se otočí zpátky. */
const otocSe = (d, t) => {
  if (d.rezim === "vymena") return lekniSe(d, t, -1);
  if (d.rezim === "otocka") {
    if (t - d.od > 0.7 && d.zpet > t - d.od) d.zpet = t - d.od;
    return;
  }
  zacni(d, t, "otocka");
  d.zpet = 2.3;
  d.zvuk.push({ druh: "otoc", sila: 0.9, pan: pan(FIG.x), za: 0.1 });
};
/** Kus cinkne a udělá salto. */
const cinkni = (d, t, m) => {
  if (t - d.cink < 0.2) return;
  d.cink = t;
  d.zvuk.push({ druh: "cink", sila: 0.8, pan: pan(m.x) });
  if (m.stav === "sedi") skocMiska(m, t, SALTO(m));
  else m.chceSalto = true;
};
/** Zafouká od místa, kam se kliklo: lucernu to odnese na druhou stranu, plamen se přikrčí a šňůrka práskne. */
const zafoukej = (d, t, k) => {
  const R = d.nahoda, smer = k.x < d.L[0] ? 1 : -1;
  d.om += smer * 2.4;
  d.vitr = smer;
  d.sfouk = 1;
  d.stud = t;
  d.nakl.v += smer * 45;
  for (const m of d.visacky) m.odfuk += smer * (10 + R() * 14);
  for (let i = 0; i < 4 && d.vanek.length < 8; i++) d.vanek.push({ x: k.x + smer * (i * 7 - 6), y: clamp(k.y + (i - 1.5) * 7 + (R() - 0.5) * 4, 10, ZEM - 8), smer, vek: -i * 0.05, zivot: 0.5 + R() * 0.2 });
  d.zvuk.push({ druh: "fuk", sila: 0.6, pan: pan(k.x) });
};
const klik = (d, t, k, fig) => {
  /* z klávesnice přijde přesný střed plochy: střídá lucernu, zakopnutí a otočku; dokud Cedulka píše, lucerna jen zaplane */
  if (k.x === 90 && k.y === 90) return d.rezim === "vymena" ? zaplan(d, t) : [rozsvit, zakopni, otocSe][d.klavesa++ % 3](d, t);
  const m = d.misky.find((q) => q.op > 0.5 && Math.hypot(k.x - q.x, k.y - (ZEM - 7 + q.y)) < 11);
  if (m) return cinkni(d, t, m);
  if (Math.hypot(k.x - d.L[0], k.y - d.L[1]) < 23) return rozsvit(d, t);
  const [x, y] = doTela([k.x, k.y], fig);
  if (x > 50 && x < 130 && y > 40 && y < 144) return d.naNi++ % 2 ? otocSe(d, t) : zakopni(d, t);
  return zafoukej(d, t, k);
};
/** Kde má bližší ručka dlaň, když zrovna nic nedrží: při chůzi se houpe proti kroku, při otočce odletí od těla. */
const vychoziRuka = (d, t, fig) => {
  const S = naTelo(RAMENA.blizko, fig), jde = 1 - d.rovna;
  /* ven od desky: když je k nám rubem, má rameno na druhé straně */
  const ven = fig.c >= 0 ? -1 : 1;
  const fi = -0.22 - 0.55 * jde * Math.cos(2 * Math.PI * d.fi) + 0.1 * Math.sin(t * 1.3) * d.rovna;
  let H = [S[0] + ven * (1.5 - 12.5 * Math.sin(fi)), S[1] + 12.5 * Math.cos(fi)];
  /* zamává tomu, kdo na ni ukazuje */
  if (d.mava > 0.01) H = [lerp(H[0], S[0] - 9.5 + 3.4 * Math.sin(t * 11), d.mava), lerp(H[1], S[1] - 12.5 - 1.2 * Math.cos(t * 11), d.mava)];
  /* leknutí a zakopnutí: ruka vyletí nahoru */
  const lek = clamp(1 - (t - d.lek) / 0.6);
  if (lek > 0) H = [lerp(H[0], S[0] + ven * 11, smooth(lek)), lerp(H[1], S[1] - 9, smooth(lek))];
  /* při otočce ji odstředivá síla odnese od těla */
  const tocka = clamp(Math.abs(d.otoc.v) / 6);
  if (tocka > 0) H = [lerp(H[0], S[0] + ven * 12, tocka), lerp(H[1], S[1] + 3, tocka)];
  return H;
};
/** Jeden krok výměny: starý kus odhopkal, zezadu přihopká další a lucerna mu zaplane. */
const krokVymeny = (d, t, u, uP) => {
  const R = d.nahoda, C = d.vymena.casy, K = KUSY[d.vymena.novy];
  if (pres(uP, u, C.prijde)) d.misky.push(novaMiska(d.vymena.novy, 5, "prichazi"));
  if (pres(uP, u, C.hotovo)) {
    /* je tu: lucerna mu zaplane a on povyskočí */
    d.naRade = d.vymena.novy;
    d.zaplanT = -100;
    zaplan(d, t, 0.85);
    d.radost = t;
    d.zvuk.push({ druh: "ding", sila: 0.8, pan: pan(d.L[0]), za: 0.06 });
    if (K.kriva) d.zvuk.push({ druh: "chichot", sila: 0.7, pan: pan(FIG.x), za: 0.35 });
    for (const m of d.misky) if (m.role !== "odchazi" && m.stav === "sedi") skocMiska(m, t + 0.1, { kam: m.x + (m.role === "jde" ? 0 : 8), vyska: 9, doba: 0.42 });
  }
  if (u > C.konec) {
    zacni(d, t, "jde");
    d.vymena = null;
    d.doVymeny = 17 + R() * 8;
    d.doCteni = Math.max(d.doCteni, 5 + R() * 3);
    d.doZivnuti = Math.max(d.doZivnuti, 4);
  }
};
const krok = (dyn, t, dt, vstup) => {
  if (dt <= 0) return;
  const d = dyn, R = d.nahoda;
  const mys = vstup.mys || null;
  /* rychlost kurzoru: kdo jím u lucerny mávne, udělá vítr */
  const vm = mys && d.mysP ? [(mys.x - d.mysP[0]) / dt, (mys.y - d.mysP[1]) / dt] : [0, 0];
  d.mysP = mys ? [mys.x, mys.y] : null;
  d.mysV = d.mysV.map((q, i) => kCili(q, clamp(vm[i], -500, 500), dt, 0.09));
  if (vstup.kliky && vstup.kliky.length) {
    const fig = figV(d, t);
    for (const k of vstup.kliky) klik(d, t, k, fig);
    vstup.kliky.length = 0;
  }

  /* ——— co zrovna dělá ——— */
  const u = t - d.od, uP = u - dt;
  let stoj = false, cilTempo = 1, cilProtah = 0, cilTlum = 0, cilPodrep = 0, dUhel = 0;
  d.skok = 0;
  if (d.rezim === "jde") {
    d.doCteni -= dt;
    d.doVymeny -= dt;
    d.doZivnuti -= dt;
    if (d.fronta || d.doVymeny <= 0) zacniVymenu(d, t);
    else if (d.doCteni <= 0) zacni(d, t, "cte");
    else if (d.doZivnuti <= 0) zacni(d, t, "zev");
  } else if (d.rezim === "cte") {
    /* zastaví se, lucernu si kousek přitáhne, přečte si ji a dvakrát přikývne */
    stoj = true;
    dUhel = -3 * smooth(u / 0.5) * (1 - smooth((u - 2.1) / 0.4));
    if (pres(uP, u, 1.4)) d.zvuk.push({ druh: "hm", sila: 0.6, pan: pan(FIG.x) });
    if (u > 2.6) {
      zacni(d, t, "jde");
      d.doCteni = 15 + R() * 9;
    }
  } else if (d.rezim === "zev") {
    cilTempo = 0.5;
    cilProtah = Math.sin(Math.PI * clamp((u - 0.2) / 1.5));
    dUhel = 6 * cilProtah;
    if (pres(uP, u, 0.3)) d.zvuk.push({ druh: "zev", sila: 0.7, pan: pan(FIG.x) });
    if (u > 2) {
      zacni(d, t, "jde");
      d.doZivnuti = 26 + R() * 14;
    }
  } else if (d.rezim === "vymena") {
    stoj = true;
    krokVymeny(d, t, u, uP);
  } else if (d.rezim === "zakop") {
    cilTempo = u < 0.34 ? 2.4 : 1;
    stoj = u >= 0.34 && u < 1.45;
    d.skok = u < 0.3 ? 3 * Math.sin((Math.PI * u) / 0.3) : 0;
    if (u > 1.9) {
      zacni(d, t, "jde");
      d.doZivnuti = Math.max(d.doZivnuti, 6);
      d.doCteni = Math.max(d.doCteni, 4);
    }
  } else if (d.rezim === "otocka") {
    /* přikrčí se, vyskočí a ve vzduchu se otočí rubem k nám; po chvíli (nebo po kliknutí) totéž zpátky */
    stoj = true;
    const v = u < d.zpet ? u : u - d.zpet;
    cilPodrep = v < 0.12 ? 1 : 0;
    d.skok = 8.5 * Math.sin(Math.PI * clamp((v - 0.1) / 0.5));
    d.otocCil = u < 0.1 ? 0 : u < d.zpet + 0.1 ? Math.PI : 2 * Math.PI;
    if (pres(uP, u, 0.12)) skubniSnurou(d, 1.6, -2.4);
    if (pres(uP, u, d.zpet)) d.zvuk.push({ druh: "otoc", sila: 0.8, pan: pan(FIG.x), za: 0.1 });
    if (pres(uP, u, d.zpet + 0.12)) skubniSnurou(d, 1.6, -2.4);
    for (const kdy of [0.6, d.zpet + 0.6]) {
      if (!pres(uP, u, kdy)) continue;
      doslap(d, 1, FIG.x);
      d.dosed.v -= 1.3;
      zaprasit(d, FIG.x - 12);
      zaprasit(d, FIG.x + 14);
    }
    if (pres(uP, u, d.zpet + 0.6)) d.radost = t;
    if (u > d.zpet + 0.85) {
      /* celá otáčka je zpátky tam, kde začala */
      d.otoc.a -= 2 * Math.PI;
      d.otocCil = 0;
      zacni(d, t, "jde");
      d.doCteni = Math.max(d.doCteni, 4);
    }
  }
  d.stoji = stoj;
  d.protah = kCili(d.protah, cilProtah, dt, 0.12);
  d.podrep = kCili(d.podrep, cilPodrep, dt, 0.05);
  d.tlum = kCili(d.tlum, cilTlum, dt, 0.25);
  d.sfouk = kCili(d.sfouk, 0, dt, 0.4);

  /* ——— chůze ——— */
  d.tempo = kCili(d.tempo, cilTempo, dt, d.rezim === "zakop" && u < 0.34 ? 0.06 : cilTempo > d.tempo ? 0.3 : 0.2);
  const rovnaP = d.rovna;
  d.rovna = clamp(d.rovna + (stoj ? dt / 0.2 : -dt / 0.16));
  if (stoj && rovnaP < 1 && d.rovna >= 1) {
    /* dosedla na oba rohy naráz */
    d.fi = FI_VYKROC;
    d.dosed.v -= 0.8;
    doslap(d, 0.6, FIG.x);
  }
  const jde = 1 - d.rovna, fiP = d.fi;
  if (!stoj) d.fi = cyk(d.fi + (dt * d.tempo) / KROK_T);
  d.posuv = stoj ? 0 : RYCHLOST * d.tempo * jde;
  if (!stoj && jde > 0.6) {
    for (const n of ROHY) {
      if (cyk(d.fi - n.faze) >= cyk(fiP - n.faze)) continue;
      /* bota došlápla: klap, deska se otřese, tyčka se prohne a na cestě zůstane otisk zubů */
      const x = FIG.x + n.strana * ROZTEC * COS0 * BOTA.dovnitr + KROK, y = ZEM + (n.strana > 0 ? -0.2 : 0.9);
      d.dosed.v -= 0.5;
      d.uhel.v += 11;
      doslap(d, 0.42 + 0.16 * R(), x);
      zaprasit(d, x - 3, y);
      if (d.stopy.length < 16) d.stopy.push({ x, y, vek: 0 });
    }
  }
  const naklP = d.nakl.a;
  pruzina(d.nakl, 0, dt, { tuhost: 85, utlum: 8.5 });
  d.nakl.a = clamp(d.nakl.a, -14, 24);
  /* po zakopnutí dopadne zadní roh zpátky na zem */
  if (naklP > 0 && d.nakl.a <= 0 && d.nakl.v < -30) {
    doslap(d, 0.9, FIG.x - 16);
    zaprasit(d, FIG.x - 22);
    d.dosed.v -= 0.9;
  }
  pruzina(d.otoc, d.otocCil, dt, { tuhost: 62, utlum: 11 });
  pruzina(d.dosed, 0, dt, { tuhost: 260, utlum: 16 });
  d.dosed.a = clamp(d.dosed.a, -0.08, 0.06);

  /* ——— tyčka: dlaň jde za deskou měkce, tyčka si posvítí tam, kam ukazuje kurzor ——— */
  const fig = figV(d, t);
  const cilH = dlan(fig);
  d.H = d.H.map((q, i) => kCili(q, cilH[i], dt, 0.13));
  const [mx, my] = mys ? doTela([mys.x, mys.y], fig) : [0, 0];
  const naNi = mys ? mx > 52 && mx < 128 && my > 42 && my < 142 : false;
  if (mys && !naNi && d.rezim !== "vymena" && d.rezim !== "otocka") {
    let a = deg(Math.atan2(mys.y - ZAVES * 0.7 - d.H[1], mys.x - d.H[0]));
    if (a > 90) a -= 360;
    d.cilUhel = kCili(d.cilUhel, clamp(lerp(UHEL0, a, 0.5), MEZE_UHEL[0], MEZE_UHEL[1]), dt, 0.3);
  } else d.cilUhel = kCili(d.cilUhel, UHEL0, dt, 0.5);
  pruzina(d.uhel, d.cilUhel + dUhel + 1.2 * Math.sin(t * 0.53), dt, { tuhost: 46, utlum: 8 });
  d.uhel.a = clamp(d.uhel.a, MEZE_UHEL[0] - 4, MEZE_UHEL[1] + 4);

  /* ——— lucerna: kyvadlo, které rozhoupe zrychlení špičky tyčky ——— */
  const T = spicka(d.H, d.uhel.a);
  let acc = [0, 0];
  if (d.Tp) {
    const v = [(T[0] - d.Tp[0]) / dt, (T[1] - d.Tp[1]) / dt];
    if (d.Vp) acc = [(v[0] - d.Vp[0]) / dt, (v[1] - d.Vp[1]) / dt];
    d.Vp = v;
  }
  d.Tp = T;
  d.T = T;
  const vel = Math.hypot(acc[0], acc[1]);
  if (vel > G * 3) acc = acc.map((q) => (q * G * 3) / vel);
  d.aT = d.aT.map((q, i) => q + (acc[i] - q) * clamp(dt / 0.03));
  /* nese ji kousek před sebou, ať jí při kroku necinká o stříšku; vzduch s ní pohupuje a kurzor u ní fouká */
  const blizko = mys ? smooth(1 - Math.hypot(mys.x - d.L[0], mys.y - d.L[1]) / 50) : 0;
  d.vitr = kCili(d.vitr, 0, dt, 0.5);
  const vitr = 0.3 + 0.4 * Math.sin(t * 0.83) + 0.22 * Math.sin(t * 1.9 + 1) + clamp(d.mysV[0] * 0.06, -11, 11) * blizko + 2 * d.vitr;
  /* měkké meze: k Cedulce se rozhoupe míň než od ní, ať jí bedýnka nevletí do stříšky, a dopředu jen tolik, aby spodním rohem nevyletěla z plochy */
  const horni = Math.min(MEZE_TH[1], Math.asin(clamp((KRAJ - LAMP.xR - T[0]) / LAMP.nozky, 0.05, 0.6)));
  const mimo = d.th < MEZE_TH[0] ? d.th - MEZE_TH[0] : d.th > horni ? d.th - horni : 0;
  const alfa = (-d.aT[0] * Math.cos(d.th) - (G - d.aT[1]) * Math.sin(d.th)) / ZAVES - (1.15 + (mimo ? 7 : 0)) * d.om - 140 * mimo + vitr;
  d.om = clamp(d.om + alfa * dt, -6, 6);
  d.th += d.om * dt;
  if (d.th < MEZE_TH[0] - 0.1 || d.th > horni + 0.12) {
    d.th = clamp(d.th, MEZE_TH[0] - 0.1, horni + 0.12);
    d.om *= -0.25;
  }
  const L = naLucernu(T, d.th, STRED_L);
  d.L = L;
  d.zar = kCili(d.zar, 0, dt, 0.42);

  /* ——— bližší ručka ——— */
  if (naNi && d.rezim === "jde") d.mavaOd = t;
  d.mava = kCili(d.mava, t - d.mavaOd < 0.7 && d.rezim === "jde" ? 1 : 0, dt, 0.14);
  const vychozi = vychoziRuka(d, t, fig);
  d.ruka = d.ruka.map((q, i) => kCili(q, vychozi[i], dt, 0.05));

  /* ——— šňůrka s rolničkou ——— */
  const svist = krokSnury(d, naTelo(VRCHOL, fig), t, dt);
  if (svist > 95 && t - d.suzu > 0.45) {
    d.suzu = t;
    d.zvuk.push({ druh: "suzu", sila: clamp(svist / 280, 0.25, 0.7), pan: pan(d.snura[SNURA.n - 1].x) });
  }

  /* ——— visačky krouží kolem světla; zvědavé odletí za kurzorem a ta třetí si občas sedne Cedulce na stříšku ——— */
  d.doSednuti -= dt;
  if (d.doSednuti <= 0 && d.rezim === "jde" && !mys) {
    d.doSednuti = 24 + R() * 12;
    d.visacky[2].sedi = 4.2;
  }
  d.sedi = false;
  for (const m of d.visacky) {
    let cil = L, rCil = m.r0 + 3.5 * Math.sin(t * m.w + m.fz), lenost = m.lenost;
    if (m.sedi > 0) {
      /* veze se na stříšce, dokud Cedulka jen jde; pak uletí */
      m.sedi -= dt;
      cil = naTelo(HRAD, fig, LIC);
      rCil = 0;
      lenost = m.r < 2 ? 0.03 : 0.3;
      if (m.r < 2) d.sedi = true;
      if (m.sedi <= 0 || d.rezim !== "jde" || mys) {
        m.sedi = 0;
        m.rozprch = 12;
      }
    } else if (mys && m.zved > 0) {
      cil = [lerp(L[0], mys.x, m.zved), lerp(L[1], mys.y, m.zved)];
      rCil *= lerp(1, 0.45, m.zved);
    }
    m.c = [kCili(m.c[0], cil[0], dt, lenost), kCili(m.c[1], cil[1], dt, lenost)];
    m.r = kCili(m.r, rCil, dt, 0.45);
    m.rozprch = kCili(m.rozprch, 0, dt, 0.75);
    m.odfuk = kCili(m.odfuk, 0, dt, 0.9);
    m.a += m.smer * m.va * dt * (1 + 0.4 * Math.sin(t * m.w * 1.7 + m.fz)) * (m.sedi > 0 ? 0.25 : 1);
    const xP = m.x;
    obehVisacky(m, t);
    if (Math.abs(m.x - xP) > 0.02) m.vx = kCili(m.vx, (m.x - xP) / dt, dt, 0.1);
  }

  /* ——— kusy: sedí na cestě, a tak ujíždějí dozadu; když už jsou daleko, dohopkají ——— */
  const domov = clamp(L[0] + 4, 110, 138);
  for (const m of d.misky) {
    if (m.stav === "sedi") {
      m.x -= d.posuv * dt;
      m.ceka -= dt;
      if (m.ceka <= 0) {
        if (m.role === "odchazi") skocMiska(m, t, { kam: m.x + 13 + R() * 3, vyska: 7, doba: 0.3 });
        else if (m.role === "prichazi") {
          if (domov - m.x < 4) m.role = "jde";
          else skocMiska(m, t, { kam: m.x + Math.min(domov - m.x + 2, 19 + R() * 4), vyska: 6.5, doba: 0.27 });
        } else if (m.x < domov - 3.2) skocMiska(m, t, { kam: Math.min(m.x + 12, domov + 2 + R() * 3.5), vyska: 3.6 + R() * 1.6, doba: 0.3 });
      }
    } else {
      const q = (t - m.t0) / m.doba;
      if (q >= 1) {
        d.zvuk.push({ druh: "tuk", sila: m.vyska > 12 ? 0.5 : 0.13 + 0.06 * R(), pan: pan(m.x1) });
        if (m.vyska > 6) zaprasit(d, m.x1 - 2, ZEM + 0.6);
        Object.assign(m, { stav: "sedi", x: m.x1, y: 0, rot: 0, ceka: m.role === "jde" ? 0.14 : 0.05, salto: false });
        if (m.chceSalto) {
          m.chceSalto = false;
          skocMiska(m, t, SALTO(m));
        }
      } else if (q > 0) {
        m.x = lerp(m.x0, m.x1, q);
        m.y = -m.vyska * 4 * q * (1 - q);
        m.rot = m.salto ? 360 * smooth(q) : lerp(-11, 9, q) * Math.sin(Math.PI * Math.min(1, q * 1.2));
      }
    }
    m.op = m.role === "odchazi" ? clamp((170 - m.x) / 18) : clamp((m.x - 5) / 12);
    if (m.x > ZA_ZADY) m.zezadu = false;
  }
  d.misky = d.misky.filter((m) => !(m.role === "odchazi" && m.x > 168));

  /* ——— co zůstává na cestě a co létá ——— */
  for (const p of d.stopy) {
    p.vek += dt;
    p.x -= d.posuv * dt;
  }
  d.stopy = d.stopy.filter((p) => p.x > 9 && p.vek < 12);
  for (const p of d.prach) {
    p.vek += dt;
    p.x -= d.posuv * dt;
  }
  d.prach = d.prach.filter((p) => p.vek < 0.8);
  for (const j of d.jiskry) {
    j.vek += dt;
    j.x += j.vx * dt;
    j.y += j.vy * dt;
    j.vx *= 1 - Math.min(1, dt * 2.4);
    j.vy *= 1 - Math.min(1, dt * 2.4);
  }
  d.jiskry = d.jiskry.filter((j) => j.vek < j.zivot);
  for (const q of d.fajfky) q.vek += dt;
  d.fajfky = d.fajfky.filter((q) => q.vek < 1.3);
  for (const v of d.vanek) v.vek += dt;
  d.vanek = d.vanek.filter((v) => v.vek < v.zivot);

  /* ——— pohled: za kurzorem, na to, co dělá, jinak na lucernu a občas na nás ——— */
  const oko = naTelo(OCI, fig, LIC);
  const smerem = (P) => [clamp((P[0] - oko[0]) / 42, -1, 1) * 2.2, clamp((P[1] - oko[1]) / 42, -1, 1) * 1.7];
  let cp = d.sedi ? [1.5, -1.7] : (t + 2.1) % 6.3 < 0.9 ? [0, 0.2] : smerem(L);
  if (d.rezim === "vymena") {
    /* dívá se za tím, který odchází, pak dozadu po tom, který přichází, a nakonec na lucernu */
    const C = d.vymena.casy;
    cp = u < C.prijde ? smerem([domov + 30, ZEM - 8]) : u < C.hotovo ? [-1.9, 0.9] : smerem(L);
  } else if (d.rezim === "cte") cp = [lerp(0.7, 2.2, cyk((u - 0.35) / 0.55)), smerem(L)[1]];
  else if (d.rezim === "zakop" && u > 0.5) cp = smerem(L);
  else if (mys) cp = smerem([mys.x, mys.y]);
  d.pohled = d.pohled.map((q, i) => kCili(q, cp[i], dt, 0.09));

  d.cikady -= dt;
  if (d.cikady <= 0) {
    d.cikady = 32 + R() * 20;
    d.zvuk.push({ druh: "cikady", sila: 0.35, pan: -0.6 });
  }
};
/** Jak se tváří: oči a pusa podle toho, co zrovna dělá. */
const vyraz = (d, t) => {
  const u = t - d.od;
  if (t - d.lek < 0.45) return ["siroke", "o"];
  if (d.rezim === "zakop") return u < 1.25 ? ["kulate", "rovna"] : ["smich", "usmev"];
  if (d.rezim === "zev") return u > 0.3 && u < 1.6 ? ["spi", "o"] : ["kulate", "usmev"];
  if (d.rezim === "cte") return u > 1.4 && u < 2.25 ? ["smich", "usmev"] : ["kulate", u > 0.3 ? "rovna" : "usmev"];
  if (d.rezim === "vymena") {
    if (u < d.vymena.casy.hotovo) return ["kulate", "usmev"];
    return ["smich", KUSY[d.vymena.novy].kriva ? "smich" : "usmev"];
  }
  if (t - d.stud < 0.7) return ["zavrene", "o"];
  if (t - d.radost < 1.1) return ["smich", "smich"];
  if (t - d.zaplanT < 0.8) return ["smich", "usmev"];
  if (d.mava > 0.4) return ["kulate", "smich"];
  return ["kulate", d.sedi ? "kocici" : "usmev"];
};
const stav = (t, vstup = {}, dyn) => {
  const d = dyn || novaDynamika();
  const fig = figV(d, t);
  const H = d.H, T = spicka(H, d.uhel.a), th = d.th, L = naLucernu(T, th, STRED_L);
  /* plamen se mihotá a ve větru se přikrčí */
  const S = (0.9 + 0.06 * Math.sin(t * 5.3) + 0.04 * Math.sin(t * 11.7 + 1)) * (1 - 0.45 * d.tlum) * (1 - 0.55 * d.sfouk * (0.6 + 0.4 * Math.sin(t * 34))) + d.zar;
  const [oci, usta] = vyraz(d, t);
  return {
    t, fig, rub: fig.c < 0, H, T, th, uhel: d.uhel.a, L, Lt: doTela(L, fig), S, zar: d.zar, vitr: d.vitr, chod: clamp(d.posuv / RYCHLOST, 0, 2), posuv: d.posuv, rezim: d.rezim,
    ramena: { daleko: naTelo(RAMENA.daleko, fig), blizko: naTelo(RAMENA.blizko, fig) },
    ruka: d.ruka, ohyb: (d.mava > 0.3 ? 0.9 : 0.5) * (fig.c >= 0 ? 1 : -1),
    oci, usta, pohled: d.pohled, mrk: mrkani(t, [1.3, 4.2, 4.45, 7.4], 8.6), zev: d.protah,
    /* po leknutí se začervená */
    tvare: 0.4 + 0.12 * clamp(S - 0.5) + 0.3 * smooth((t - d.lek - 0.2) / 0.3) * clamp(1 - (t - d.lek - 0.5) / 1.5) + 0.2 * clamp(d.zar) + 0.15 * d.mava,
    naRade: d.naRade, hotove: d.hotove,
    snura: [naTelo(VRCHOL, fig), ...d.snura.slice(1).map((b) => [b.x, b.y])],
    misky: d.misky.map((m) => ({ i: m.i, x: m.x, y: m.y, rot: m.rot, op: m.op, vzadu: m.zezadu, sv: Math.round(clamp(S) * clamp(1.15 - Math.abs(m.x - L[0]) / 34) * 8) / 8 })),
    visacky: d.visacky.map((m) => ({
      /* když sedí, křídla jen pomalu otvírá a zavírá */
      x: m.x, y: m.y, z: m.z, sc: 1 + clamp(m.z, -30, 30) * 0.008, nakl: m.sedi > 0 && m.r < 2 ? fig.r + 31 : 14 * Math.sin(t * 2.1 + m.fz) + clamp(m.vx * 0.5, -22, 22),
      mav: m.sedi > 0 && m.r < 2 ? 0.25 + 0.3 * Math.abs(Math.sin(t * 2.4)) : Math.abs(Math.sin(t * 19 + m.fz)),
      sv: clamp(S) * clamp(1.3 - Math.hypot(m.x - L[0], m.y - L[1]) / 40),
    })),
    stopy: d.stopy.map((p) => ({ x: p.x, y: p.y, op: clamp(Math.min(p.vek / 0.2, (p.x - 10) / 16, (12 - p.vek) / 3)) })),
    prach: d.prach.map((p) => {
      const q = p.vek / 0.8;
      return { x: p.x, y: p.y, r: 1.3 + 3.6 * easeOut(q), op: 0.6 * Math.pow(1 - q, 1.3), seed: p.seed };
    }),
    jiskry: d.jiskry, fajfky: d.fajfky, vanek: d.vanek.filter((v) => v.vek >= 0),
  };
};
const snimek = (st) => Math.floor(st.t * 30);
/* bližší stěna desky a všechno, co je na ní; vzdálenější je o tloušťku vedle */
const pohybTela = (strana) => (st) => {
  const g = st.fig, e = strana * g.e, r = rad(g.r);
  return { x: g.x + e * Math.cos(r), y: g.y + e * Math.sin(r), r: g.r, sx: g.sx, sy: g.sy, ox: FIG.x, oy: ZEM };
};
/* tužka je za rubem: při otočce se s deskou překlopí na druhou stranu */
const pohybTuzky = (st) => {
  const g = st.fig, e = -(g.c >= 0 ? 1 : -1) * g.e, r = rad(g.r);
  return { x: g.x + e * Math.cos(r), y: g.y + e * Math.sin(r), r: g.r, sx: g.c >= 0 ? g.sx : -g.sx, sy: g.sy, ox: FIG.x, oy: ZEM };
};
const klicKusu = (vzadu) => (st) => st.misky.filter((m) => m.vzadu === vzadu).map((m) => `${m.i},${f1(m.x)},${f1(m.y)},${Math.round(m.rot)},${Math.round(m.op * 20)},${m.sv}`).join("|");
const jeTuNeco = (st) => (st.jiskry.length || st.fajfky.length || st.vanek.length || st.zar > 0.03 ? snimek(st) : -1);

export const lampion = {
  id: "lampion",
  viewBox: "0 0 180 180",
  defs,
  novaDynamika,
  krok,
  stav,
  /* když zafouká, zahučí to */
  hukot: (st) => clamp(0.8 * Math.abs(st.vitr)),
  klidne: { t: 5.3 },
  /** Rychlost chůze pro průvod: o kolik šířek kresby se má za sekundu posunout, když jde. Když stojí, píše nebo zakopne, jde jinak rychle: stav().posuv je okamžitá rychlost cesty v jednotkách plochy za sekundu. */
  rychlost: RYCHLOST / 180,
  vrstvy: [
    { id: "zem", kresli: vrstvaZem, klic: snimek },
    { id: "zare", kresli: vrstvaZare, pohyb: (st) => ({ x: st.L[0] - L0[0], y: st.L[1] - L0[1], sx: 1 + 0.2 * Math.max(0, st.S - 1), sy: 1 + 0.2 * Math.max(0, st.S - 1), ox: L0[0], oy: L0[1] }), pruhlednost: (st) => f(clamp(0.9 * st.S) * uKraje(st)) },
    { id: "visacky-za", kresli: vrstvaVisacky(false), klic: snimek },
    { id: "snurka", kresli: vrstvaSnurka, klic: snimek },
    { id: "kus-za", kresli: vrstvaKus(true), klic: klicKusu(true) },
    { id: "tyc", kresli: vrstvaTyc, pohyb: pohybTyce },
    { id: "ruka-za", kresli: vrstvaRukaZa, klic: snimek },
    { id: "tuzka", kresli: vrstvaTuzka, pohyb: pohybTuzky },
    { id: "hrana", kresli: vrstvaHrana, pohyb: pohybTela(-1) },
    { id: "deska", kresli: vrstvaDeska, tezka: true, pohyb: pohybTela(1) },
    { id: "svit", kresli: vrstvaSvit, klic: (st) => `${Math.round(st.Lt[0] / 3)},${Math.round(st.Lt[1] / 3)},${Math.round(clamp(st.S, 0, 1.5) * 24)}`, pohyb: pohybTela(1) },
    /* botičky: vzdálenější dřív; pásky leží přes spodní rohy desky */
    { id: "bota-za", kresli: vrstvaBota(0), pohyb: pohybBoty(0) },
    { id: "bota-pred", kresli: vrstvaBota(1), pohyb: pohybBoty(1) },
    {
      id: "tvar", kresli: vrstvaTvar, pohyb: pohybTela(1),
      klic: (st) => (st.rub ? `rub,${st.hotove},${st.naRade}` : `${st.oci},${st.usta},${Math.round(st.tvare * 20)},${Math.round(st.pohled[0] * 8)},${Math.round(st.pohled[1] * 8)},${f(st.mrk)},${Math.round(st.zev * 12)},${Math.round(st.S * 5)}`),
    },
    { id: "ruka-pred", kresli: vrstvaRukaPred, klic: snimek },
    { id: "lucerna", kresli: vrstvaLucerna, pohyb: pohybLucerny },
    { id: "lucerna-svit", kresli: vrstvaLucernaSvit, pohyb: pohybLucerny, pruhlednost: (st) => f(clamp(0.06 + 0.9 * st.S)) },
    { id: "jmeno", kresli: vrstvaJmeno, pohyb: pohybLucerny },
    { id: "lucerna-ram", kresli: vrstvaLucernaRam, tezka: true, pohyb: pohybLucerny },
    { id: "kus", kresli: vrstvaKus(false), klic: klicKusu(false) },
    { id: "visacky-pred", kresli: vrstvaVisacky(true), klic: snimek },
    { id: "jiskry", kresli: vrstvaJiskry, klic: jeTuNeco },
  ],
};
