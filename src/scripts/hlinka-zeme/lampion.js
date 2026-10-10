/*
 * 03, Lampion — NÁMĚSÍČNÁ HLÍNKA S HÓZUKI
 *
 * Jako Pecinka s čóčinem z průvodu na Domku 2, jen Hlínka nemá ruce, a tak
 * jí lampion vyrostl. Výhonek na temeni se protáhl, ohnul dopředu jako prut
 * a na konci nese hózuki — mochyni, japonský „lampionový plod“, kterým se
 * o Obonu svítí duším na cestu. Oranžový papírový měchýřek, zčásti už jen
 * krajka žilek, a v něm svítí bobule.
 *
 * Bez pozadí: Hlínka chodí, takže cestu jí dělá stránka, kam ji kdo postaví
 * — v průvodu ji posouvá CSS, sama jen šourá nožkami na místě, natočená
 * trochu z boku ke směru chůze. A jde ze spaní. Oči má zavřené, občas
 * zívne, občas klimbne: zastaví se, výhonek se svěsí, plod pohasne a z pusy
 * se jí nafoukne bublina. Pak sebou škubne a jde dál. Že jde, je vidět
 * podle stop, které za ní ujíždějí dozadu a ze kterých raší klíčky, podle
 * prachu od nožek a podle žabky cučigaeru (zemní žába, jak jinak), která
 * ujíždí s cestou a musí ji doskakovat. Po výhonku leze ke světlu šnek.
 *
 * Plod visí na prutu jako kyvadlo a houpe se podle kroku, prut pod ním
 * pruží. Kolem krouží světlušky a časem se rozblikají do taktu; jedna si
 * občas sedne Hlínce na čelo a ta ze spaní nakrčí pusu. Světlo padá Hlínce
 * na bok a na zem pod plodem.
 *
 * Myš: zvědavé světlušky odletí za kurzorem, výhonek se za ním natáhne jako
 * za sluncem a kdo jím u plodu mávne, rozhoupe ho. Když se kurzor zastaví
 * na Hlínce, pootevře jedno oko; kdo s ním zatřese, když klimbá, vzbudí ji.
 * Kliknutí na plod: zaplane a světlušky se rozprsknou; čtvrté zaplanutí
 * v řadě z něj vypustí dušičky. Kliknutí na Hlínku: zakopne, plod se
 * rozhoupe, ona se napůl probudí, kouká, jak se houpe, zívne a spí dál.
 * Kliknutí na žabku: salto. Kliknutí jinam: zafouká.
 *
 * Co se nemění (hrouda, nožky, měchýřek, šnek), kreslí se jednou a běh
 * s tím jen hýbe: tělo se kolébá a mačká, nožky šourají, plod se houpe
 * kolem špičky prutu. Rozsvícený plod leží přes nesvítící a prolíná se do
 * něj průhledností vrstvy. Filtry tu nejsou žádné.
 */
import {
  f, f1, rng, clamp, lerp, smooth, easeOut, rad, pt, cara, mix, hladka, mrkani, jiskraD, pruzina, kCili, pres,
  HL, hlDefs, hlTelo, hlTvar, zetko, svetylko,
} from "./spolecne.js";

const ID = "hzl";
const ZEM = 160;
const FIG = { x: 64, s: 0.7 };
const POSTAVA = `translate(${FIG.x} ${ZEM}) scale(${FIG.s}) translate(-90 -${HL.spodek})`;
const vPostave = (s) => `<g transform="${POSTAVA}">${s}</g>`;
const deg = (r) => (r * 180) / Math.PI;
const cyk = (x) => ((x % 1) + 1) % 1;
const pan = (x) => clamp((x - 90) / 90, -1, 1);
const pt1 = (p) => `${f1(p[0])} ${f1(p[1])}`;
/* tvář je natočená do směru chůze: posunutá a trochu zúžená */
const NATOCENI = 7;
const TVAR = `translate(${90 + NATOCENI} 0) scale(0.93 1) translate(-90 0)`;
const STRED = [90, 98], KOREN = [90, 54], CELO = [121, 68], PUSA = [99.4, 109.8], ZZZ = [54, 58];
const BARVY = { stonek: "#6E7A4E", stonekTm: "#59633F", list1: "#8A9466", list2: "#9AA375", zilka: "#C7CC9E", obrys: "#4A3F35" };

/* ——— Chůze ze spaní ———
   Dvojkrok trvá KROK_T, nožka je OPORA z něj na zemi a jede dozadu, zbytek
   se šourá dopředu těsně nad zemí. Souřadnice nožek jsou z kresby Hlínky. */
const KROK_T = 1.5, KROK = 9.5, OPORA = 0.6, DECH = 4.2;
/** Náměsíčná nejde rovně: pomalu se motá sem a tam. */
const motani = (t) => Math.sin(t * 0.43 + 0.8);
const NOHY = [{ x: -11, y: 145, faze: 0, blizko: true, barva: "#4F443A" }, { x: 11, y: 143.2, faze: 0.5, blizko: false, barva: "#443A31" }];
/** Jak rychle ujíždí cesta pod nohama (v panelu za sekundu) — tak rychle by ji měl posouvat průvod. */
const RYCHLOST = ((2 * KROK) / (OPORA * KROK_T)) * FIG.s;
const vOpore = (fi) => NOHY.every((n) => cyk(fi - n.faze) < OPORA);
const noha = (n, fi) => {
  const u = cyk(fi - n.faze);
  let z, zved = 0, nakl = 0;
  if (u < OPORA) z = lerp(KROK, -KROK, u / OPORA);
  else {
    const k = (u - OPORA) / (1 - OPORA);
    z = lerp(-KROK, KROK, smooth(k));
    zved = 4 * Math.sin(Math.PI * k);
    /* nejdřív se zvedne pata a špička se vleče, dopadá na patu */
    nakl = 12 * Math.sin(2 * Math.PI * k);
  }
  return { x: 90 + n.x + z, y: n.y - zved, nakl };
};
/** Tělo v panelu: posun, náklon a zmáčknutí kolem bodu, kde stojí. Všechno, co je k tělu přilepené, se počítá odtud. */
const figV = (d, t) => {
  const c = d.chod, dech = Math.sin((t / DECH) * 2 * Math.PI), kol = Math.sin(2 * Math.PI * d.fi);
  return {
    x: 1.1 * motani(t) * c + 0.32 * d.nakl,
    y: -(1 + 2 * kol * kol) * c - d.skok,
    r: -1.3 * kol * c + 0.8 * Math.sin(t * 0.61) * c + d.nakl,
    sx: 1 - 0.008 * dech + 0.6 * d.rosol - 0.028 * d.protah,
    sy: 1 + 0.02 * dech - d.rosol + 0.055 * d.protah,
  };
};
const FIG0 = { x: 0, y: 0, r: 0, sx: 1, sy: 1 };
/** Bod z kresby Hlínky (0–180) do panelu i s tím, jak se právě kolébá, kloní a mačká. */
const naTelo = ([x, y], fig) => {
  const dx = (x - 90) * FIG.s * fig.sx, dy = (y - HL.spodek) * FIG.s * fig.sy;
  const c = Math.cos(rad(fig.r)), s = Math.sin(rad(fig.r));
  return [FIG.x + fig.x + dx * c - dy * s, ZEM + fig.y + dx * s + dy * c];
};
/** A zpátky: bod z panelu do kresby Hlínky. */
const doTela = ([x, y], fig) => {
  const dx = x - FIG.x - fig.x, dy = y - ZEM - fig.y;
  const c = Math.cos(rad(fig.r)), s = Math.sin(rad(fig.r));
  return [90 + (dx * c + dy * s) / (FIG.s * fig.sx), HL.spodek + (-dx * s + dy * c) / (FIG.s * fig.sy)];
};

/* ——— Výhonek: prut z článků od kořínku na temeni po špičku s plodem ———
   Kořínek míří úhlem a, po délce se prut stáčí celkem o k stupňů. Dvěma
   čísly se tak dá mířit špičkou, kam je potřeba. */
const STONEK = { n: 24, delka: 116, exp: 1.3 };
const A0 = -96, K0 = 172;
const MEZE_A = [-116, -72], MEZE_K = [122, 210];
const stonek = (koren, a, k) => {
  const B = [koren], d = STONEK.delka / STONEK.n;
  let [x, y] = koren;
  for (let i = 0; i < STONEK.n; i++) {
    const th = rad(a + k * Math.pow((i + 0.5) / STONEK.n, STONEK.exp));
    x += Math.cos(th) * d;
    y += Math.sin(th) * d;
    B.push([x, y]);
  }
  return B;
};
/** Lomená čára vyhlazená oblouky: vrcholy jsou řídicí body, křivka jde středy úseků. Prut z článků tak není hranatý. */
const obla = (B) => {
  let d = pt(B[0]);
  for (let i = 1; i < B.length - 1; i++) d += ` Q${pt(B[i])} ${f((B[i][0] + B[i + 1][0]) / 2)} ${f((B[i][1] + B[i + 1][1]) / 2)}`;
  return `${d} L${pt(B[B.length - 1])}`;
};
/** Prut jako uzavřený tvar: u kořínku silný, ke špičce se ztenčuje. */
const prutD = (B) => {
  const L = [], P = [], n = B.length - 1;
  for (let i = 0; i <= n; i++) {
    const a = B[Math.max(0, i - 1)], b = B[Math.min(n, i + 1)];
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, w = lerp(2.1, 0.9, Math.pow(i / n, 0.8)) / 2;
    const nx = (-(b[1] - a[1]) / d) * w, ny = ((b[0] - a[0]) / d) * w;
    L.push([B[i][0] + nx, B[i][1] + ny]);
    P.push([B[i][0] - nx, B[i][1] - ny]);
  }
  return `M${obla(L)} L${obla(P.reverse())} Z`;
};
/** List v místních souřadnicích: řapík v počátku, špička na +x, bříško nahoru — tvar z původní kresby. */
const listD = (L) => `M0 0 C${f(0.3 * L)} ${f(-0.4 * L)} ${f(0.8 * L)} ${f(-0.4 * L)} ${f(L)} ${f(-0.25 * L)} C${f(0.7 * L)} ${f(0.05 * L)} ${f(0.3 * L)} ${f(0.15 * L)} 0 0 Z`;
const zilkaD = (L) => `M${f(0.08 * L)} ${f(-0.04 * L)} Q${f(0.5 * L)} ${f(-0.22 * L)} ${f(0.9 * L)} ${f(-0.24 * L)}`;
/* první dva jsou ty z původní kresby, na svém místě u temene; další přibyly, jak výhonek rostl.
   rel je úhel od směru prutu, strana říká, kam má list bříško */
const LISTY = [
  { s: 0.07, L: 12.6, rel: -74, strana: -1, barva: BARVY.list2, w: 1.3, fz: 0.4 },
  { s: 0.115, L: 14, rel: 79, strana: 1, barva: BARVY.list1, w: 1.1, fz: 2.1 },
  { s: 0.41, L: 7.2, rel: -66, strana: -1, barva: BARVY.list2, w: 1.7, fz: 3.3 },
  { s: 0.67, L: 6.2, rel: -58, strana: 1, barva: BARVY.list1, w: 1.9, fz: 5 },
  { s: 0.91, L: 5.6, rel: -64, strana: 1, barva: BARVY.list2, w: 2.2, fz: 1.2 },
].map((l) => ({ ...l, d: listD(l.L), zilka: zilkaD(l.L) }));
/** Bod a směr (ve stupních) na prutu ve zlomku s jeho délky. */
const naPrutu = (B, s) => {
  const q = clamp(s) * (B.length - 1), i = clamp(Math.floor(q), 1, B.length - 2), k = q - i;
  const a = B[i], b = B[i + 1];
  return { P: [lerp(a[0], b[0], k), lerp(a[1], b[1], k)], uhel: deg(Math.atan2(B[i + 1][1] - B[i - 1][1], B[i + 1][0] - B[i - 1][0])) };
};

/* ——— Hózuki v místních souřadnicích: špička prutu v počátku, osa dolů ———
   Měchýřek je popsaný šířkou ve výšce v (0 nahoře, 1 ve špičce); bod na něm
   je [q, v], kde q je −1 na levém kraji a 1 na pravém. Žebra, síť žilek
   i díry jsou v těchhle souřadnicích, takže drží tvar. */
const LS = 1.15, ZARE_R = 40;
const HOZ = { y0: 4.4, y1: 37.4, w: 12.4, v0: 0.3 };
const STRED_H = 20.5;
const ZAVES = STRED_H * LS;
const G = 170, MEZE_TH = [-0.55, 0.72], KRAJ = 161;
const sirkaH = (v) =>
  v <= HOZ.v0
    ? HOZ.w * Math.sqrt(1 - Math.pow((HOZ.v0 - v) / HOZ.v0, 2.4))
    : HOZ.w * Math.pow(Math.cos(((Math.PI / 2) * (v - HOZ.v0)) / (1 - HOZ.v0)), 1.12);
/* levá půlka je o chlup užší a špička uhýbá doprava, ať není jako podle pravítka */
const bodH = (q, v) => {
  v = clamp(v);
  return [q * sirkaH(v) * (q < 0 ? 0.96 : 1) + 1.1 * v * v, lerp(HOZ.y0, HOZ.y1, v)];
};
const OBRYS_H = (() => {
  const P = [], L = [];
  /* nahoře, kde se měchýřek klene, hustěji */
  for (let i = 0; i <= 40; i++) {
    const v = Math.pow(i / 40, 1.7);
    P.push(bodH(1, v));
    L.push(bodH(-1, v));
  }
  return `${cara([...P, ...L.reverse()])} Z`;
})();
/* pět hlavních žeber a mezi nimi vedlejší; natočená, jak je vidět zepředu */
const ZEBRA_Q = [-1, -0.86, -0.5, 0.08, 0.62, 0.92, 1];
const zebroD = (q) => cara(Array.from({ length: 21 }, (_, i) => bodH(q, 0.02 + (0.98 * i) / 20)));
const ZEBRA_HL = [-0.5, 0.62].map(zebroD).join(" ");
const ZEBRA_VE = [-0.86, 0.08, 0.92].map(zebroD).join(" ");
const ZEBRA_ZADNI = [-0.7, -0.2, 0.36, 0.8].map(zebroD).join(" ");
/* síť žilek: v úzkých polích cikcak od žebra k žebru, v širokých přes uzel uprostřed, uzly spojené vedlejší žilkou */
const SIT_H = (() => {
  const R = rng(88);
  let d = "";
  for (let p = 0; p < ZEBRA_Q.length - 1; p++) {
    const qa = ZEBRA_Q[p], qb = ZEBRA_Q[p + 1], siroke = qb - qa > 0.3;
    const n = siroke ? 11 : 13;
    let minuly = null;
    for (let j = 0; j < n; j++) {
      const va = 0.05 + (0.9 * (j + 0.15 + R() * 0.5)) / n, vb = 0.05 + (0.9 * (j + 0.55 + R() * 0.5)) / n;
      if (siroke) {
        const M = bodH(lerp(qa, qb, 0.36 + R() * 0.28), (va + vb) / 2 + (R() - 0.5) * 0.035);
        d += `M${pt1(bodH(qa, va))} L${pt1(M)} L${pt1(bodH(qb, vb))}`;
        if (minuly) d += `M${pt1(minuly)} L${pt1(M)}`;
        minuly = M;
      } else d += `M${pt1(bodH(qa, va))} L${pt1(bodH(qb, vb))} L${pt1(bodH(qa, va + 0.9 / n))}`;
    }
  }
  return d;
})();
/* kde papír zetlel a zbyla krajka: jedno velké okno, kterým je vidět bobule, a dvě dírky */
const diraH = (q0, v0, rq, rv, seed, bodu = 16) => {
  const R = rng(seed);
  return hladka(
    Array.from({ length: bodu }, (_, i) => {
      const u = (i / bodu) * Math.PI * 2, k = 1 + (R() - 0.5) * 0.3;
      return bodH(q0 + Math.cos(u) * rq * k, v0 + Math.sin(u) * rv * k);
    }),
    true,
  );
};
const DIRY_H = [diraH(0.14, 0.53, 0.66, 0.29, 31), diraH(-0.66, 0.34, 0.13, 0.055, 32, 9), diraH(-0.42, 0.82, 0.2, 0.045, 33, 9)].join(" ");
const BOB = bodH(0.12, 0.5), BOB_R = 5.6;
/* paprsky, když plod zaplane */
const PAPRSKY = (() => {
  let d = "";
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2, r = i % 2 ? 30 : 46, w = i % 2 ? 0.08 : 0.11;
    d += `M0 0 L${f(Math.cos(a - w) * r)} ${f(Math.sin(a - w) * r)} L${f(Math.cos(a + w) * r)} ${f(Math.sin(a + w) * r)} Z `;
  }
  return d;
})();
const JISKRA = jiskraD(1);
/** Bod plodu (v souřadnicích špičky prutu) v panelu: houpe se o úhel th kolem špičky T. */
const naHozuki = (T, th, [x, y]) => [T[0] + (x * Math.cos(th) + y * Math.sin(th)) * LS, T[1] + (-x * Math.sin(th) + y * Math.cos(th)) * LS];
/* výchozí poloha špičky a světla: v ní je plod nakreslený, běh ho odtud posouvá a otáčí */
const T0 = stonek(naTelo(KOREN, FIG0), A0, K0)[STONEK.n];
const L0 = naHozuki(T0, 0, [BOB[0], STRED_H]);
const vHozuki = (s) => `<g transform="translate(${pt(T0)}) scale(${LS})">${s}</g>`;

/* ——— Doprovod: žabka cučigaeru, šnek a klíčky ve stopách ——— */
const ZABA_S = 1.1;
const ZABA_TELO = hladka([[-5.8, -0.9], [-5.3, -3.4], [-2.6, -5.5], [0.6, -5.2], [2.4, -5.9], [4.1, -6.1], [5.6, -4.7], [6.5, -3.1], [5.4, -1.4], [2, -0.5], [-2.5, -0.3]], true);
const zabaSvg = (z) => {
  const n = z.natah;
  /* zadní noha: složená pod bokem, ve skoku natažená dozadu */
  const kyc = [-3.8, -2.4], koleno = [lerp(-1.4, -7.8, n), lerp(-3.2, -0.8, n)], pata = [lerp(-5.6, -11.4, n), lerp(-0.5, 1.2, n)], prsty = [lerp(-2.2, -14, n), lerp(-0.1, 2.4, n)];
  const hrdlo = z.hrdlo > 0.03 ? `<circle cx="${f(4.6 + 0.6 * z.hrdlo)}" cy="${f(-1.5 + 0.3 * z.hrdlo)}" r="${f(1 + 1.9 * z.hrdlo)}" fill="#E4D9C0" stroke="${BARVY.obrys}" stroke-width="0.35"/>` : "";
  const oko = z.mrk > 0.5
    ? `<path d="M2.3 -5.6 Q3.4 -5 4.5 -5.6" stroke="${BARVY.obrys}" stroke-width="0.45" stroke-linecap="round" fill="none"/>`
    : `<circle cx="3.4" cy="-5.6" r="1.25" fill="#D9B04A" stroke="${BARVY.obrys}" stroke-width="0.35"/><ellipse cx="3.6" cy="-5.6" rx="0.8" ry="0.5" fill="#2B2420"/><circle cx="3.1" cy="-6" r="0.28" fill="#FFF6D2"/>`;
  return (
    `<g transform="translate(${f(z.x)} ${f(ZEM + z.y)}) rotate(${f(z.rot)} 0 -3) scale(${ZABA_S})">` +
    `<path d="M${pt(kyc)} L${pt(koleno)} L${pt(pata)} L${pt(prsty)}" stroke="#55473A" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>` +
    hrdlo +
    `<path d="${ZABA_TELO}" fill="#7D6B52" stroke="${BARVY.obrys}" stroke-width="0.5"/>` +
    `<path d="M-3.6 -1 Q0.6 -2.6 5.2 -1.7 Q2.4 -0.4 -2.4 -0.4 Z" fill="#CFC2A6"/>` +
    /* tmavý pruh přes oko a bradavičky, podle kterých se zemní žába pozná */
    `<path d="M6.3 -3.4 Q3.6 -4.4 0.8 -3.7" stroke="#55473A" stroke-width="0.7" stroke-linecap="round" fill="none"/>` +
    `<path d="M-3.4 -3.6 h0.01 M-1.6 -4.5 h0.01 M-0.4 -3.3 h0.01 M-2.6 -2.2 h0.01" stroke="#55473A" stroke-width="0.8" stroke-linecap="round"/>` +
    oko +
    `<path d="M2.8 -2 L${f(lerp(3.5, 5.6, n))} ${f(lerp(-0.2, -0.9, n))} l1.4 0.1" stroke="#55473A" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>` +
    `</g>`
  );
};
const SNEK_S = 1.05;
const ULITA = (() => {
  const B = [];
  for (let i = 0; i <= 26; i++) {
    const u = i / 26, a = 0.6 + u * 4.2 * Math.PI, r = 0.25 + 2.5 * u;
    B.push([-0.5 + Math.cos(a) * r, -4 - Math.sin(a) * r]);
  }
  return hladka(B);
})();
/** Šnek na prutu: x po prutu ke špičce, nahoře ulita. Když se lekne, zatáhne hlavu i tykadla. Kreslí se v SNEK0, na prut ho posadí běh. */
const SNEK0 = [90, 30];
const snekSvg = (schov, k) => {
  const hl = lerp(5, 1.6, schov), tyk = 1 - clamp(schov * 1.6);
  let s = `<g transform="translate(${pt(SNEK0)}) scale(${SNEK_S})">`;
  if (tyk > 0.05) {
    s += `<path d="M${f(hl - 0.5)} -1.9 L${f(hl + 1.1 * tyk + k)} ${f(-1.9 - 2.5 * tyk)} M${f(hl - 1.2)} -2 L${f(hl - 0.6 * tyk + k)} ${f(-2 - 2.8 * tyk)}" stroke="#6B5D4F" stroke-width="0.4" stroke-linecap="round" fill="none"/>`;
    s += `<circle cx="${f(hl + 1.1 * tyk + k)}" cy="${f(-1.9 - 2.5 * tyk)}" r="0.38" fill="#4A3F35"/><circle cx="${f(hl - 0.6 * tyk + k)}" cy="${f(-2 - 2.8 * tyk)}" r="0.38" fill="#4A3F35"/>`;
  }
  s +=
    `<path d="M-4.8 -0.7 Q-2 -1.7 1 -1.7 L${f(hl - 1)} -2.4 Q${f(hl + 0.5)} -2.2 ${f(hl)} -0.9 Q${f(hl - 0.6)} -0.5 ${f(hl - 2)} -0.6 L-3.6 -0.5 Z" fill="#E2D8C2" stroke="#6B5D4F" stroke-width="0.35" stroke-linejoin="round"/>` +
    `<circle cx="-0.5" cy="-4" r="3.05" fill="url(#${ID}-ulita)" stroke="#6B5D4F" stroke-width="0.4"/>` +
    `<path d="${ULITA}" stroke="#8A6A3E" stroke-width="0.45" stroke-linecap="round" fill="none"/>` +
    `<path d="M-2.6 -5.6 Q-1.6 -6.6 -0.2 -6.6" stroke="#F4E6C4" stroke-width="0.5" stroke-linecap="round" fill="none" opacity="0.8"/></g>`;
  return s;
};
/* klíček: stonek a dva lístky jako výhonek na temeni, jen docela malý */
const KLICEK =
  `<path d="M0 0.3 Q0.5 -1.8 0 -3.7" stroke="${BARVY.stonek}" stroke-width="0.7" stroke-linecap="round" fill="none"/>` +
  `<path d="${listD(4)}" transform="translate(0 -3.5) rotate(-24)" fill="${BARVY.list1}" stroke="${BARVY.stonek}" stroke-width="0.35"/>` +
  `<path d="${listD(3.5)}" transform="translate(0 -3.3) rotate(-162) scale(1 -1)" fill="${BARVY.list2}" stroke="${BARVY.stonek}" stroke-width="0.35"/>`;
/** Vyskočí kousek přes a vrátí se — klíček, který se vyklubal. */
const vyskoc = (x) => {
  x = clamp(x);
  return 1 + 2.9 * Math.pow(x - 1, 3) + 1.9 * Math.pow(x - 1, 2);
};

/* ——— Vrstvy ——— */
/* cesta: vlastní stín, světlo plodu, stopy s klíčky a prach. Nic víc — pozadí si nese stránka. */
const vrstvaZem = (st) => {
  const S = clamp(st.S, 0, 1.6), bx = FIG.x + st.fig.x, lx = st.L[0];
  /* čím níž plod visí, tím je kaluž světla menší a jasnější */
  const vys = ZEM - st.L[1];
  let s =
    `<ellipse cx="${f(bx - 3 - 8 * clamp(S))}" cy="${ZEM + 0.4}" rx="${f(33 + 7 * clamp(S))}" ry="4.3" fill="url(#${ID}-stin)"/>` +
    `<ellipse cx="${f(bx + 1)}" cy="${ZEM}" rx="25" ry="2.5" fill="#2B2420" opacity="0.16"/>`;
  if (S > 0.02) {
    const rx = 14 + vys * 0.2 + 7 * Math.max(0, S - 1);
    s += `<ellipse cx="${f(lx)}" cy="${ZEM + 0.3}" rx="${f(rx)}" ry="${f(rx * 0.19)}" fill="url(#${ID}-kaluz)" opacity="${f(clamp(S * (1.22 - vys / 150)))}"/>`;
  }
  /* stopy zůstávají na cestě, a tak ujíždějí dozadu; z některých vyraší klíček */
  for (const p of st.stopy) s += `<ellipse cx="${f(p.x)}" cy="${f(p.y)}" rx="5.2" ry="1.3" fill="#3A3028" opacity="${f(0.15 * p.op)}"/>`;
  for (const p of st.stopy) if (p.rust > 0.02) s += `<g transform="translate(${f(p.x)} ${f(p.y)}) scale(${f(p.rust * p.zrc)} ${f(p.rust)})" opacity="${f(clamp(p.op * 1.6))}">${KLICEK}</g>`;
  for (const p of st.prach) {
    const r = rng(p.seed);
    let g = "";
    for (let i = 0; i < 4; i++) g += `<circle cx="${f(p.x + (i % 2 ? 1 : -1) * (0.5 + r() * 1.2) * p.r)}" cy="${f(p.y - r() * p.r * 0.7)}" r="${f(p.r * (0.36 + r() * 0.34))}"/>`;
    s += `<g fill="#A8957A" opacity="${f(p.op)}">${g}</g>`;
  }
  return s;
};
/* nožka: nakreslená jednou, šourá s ní běh */
const vrstvaNoha = (i) => () => vPostave(`<ellipse cx="${90 + NOHY[i].x}" cy="${NOHY[i].y}" rx="11" ry="5" fill="${NOHY[i].barva}"/>`);
const pohybNohy = (i) => (st) => {
  const n = NOHY[i], p = st.nohy[i];
  return { x: st.fig.x + (p.x - 90 - n.x) * FIG.s, y: (p.y - n.y) * FIG.s - st.skok, r: p.nakl, ox: FIG.x + n.x * FIG.s, oy: ZEM + (n.y - HL.spodek) * FIG.s };
};
/* výhonek je za tělem, aby z hroudy vyrůstal: prut, listy a stopka plodu */
const vrstvaVyhonek = (st) => {
  const B = st.B;
  let s = `<path d="${prutD(B)}" fill="${BARVY.stonek}" stroke="${BARVY.stonekTm}" stroke-width="0.35" stroke-linejoin="round"/>`;
  s += `<path d="M${obla(B.slice(2, -1))}" stroke="#93A06C" stroke-width="0.45" stroke-linecap="round" fill="none" opacity="0.6"/>`;
  /* ke konci na prut svítí plod */
  s += `<path d="M${obla(B.slice(-7))}" stroke="#F6C27A" stroke-width="0.7" stroke-linecap="round" fill="none" opacity="${f(clamp(0.5 * st.S))}"/>`;
  LISTY.forEach((l, i) => {
    const { P, uhel } = naPrutu(B, l.s);
    s +=
      `<g transform="translate(${pt(P)}) rotate(${f(uhel + l.rel + st.listy[i])}) scale(1 ${l.strana})">` +
      `<path d="${l.d}" fill="${l.barva}" stroke="${BARVY.stonek}" stroke-width="0.7" stroke-linejoin="round"/>` +
      `<path d="${l.zilka}" stroke="${BARVY.zilka}" stroke-width="0.5" stroke-linecap="round" fill="none" opacity="0.8"/></g>`;
  });
  /* stopka: od špičky prutu do důlku nahoře v měchýřku */
  const K = naHozuki(st.T, st.th, [0, HOZ.y0 + 1.6]), M = naHozuki(st.T, st.th * 0.4, [0.9, HOZ.y0 * 0.5]);
  s += `<path d="M${pt(st.T)} Q${pt(M)} ${pt(K)}" stroke="${BARVY.stonekTm}" stroke-width="1.5" stroke-linecap="round" fill="none"/><path d="M${pt(st.T)} Q${pt(M)} ${pt(K)}" stroke="#7C8556" stroke-width="0.9" stroke-linecap="round" fill="none"/>`;
  return s;
};
const vrstvaSnek = (st) => snekSvg(st.snek.schov, st.snek.tyk * 0.25);
const pohybSneka = (st) => ({ x: st.snek.P[0] - SNEK0[0], y: st.snek.P[1] - SNEK0[1], r: st.snek.uhel, ox: SNEK0[0], oy: SNEK0[1] });
const vrstvaTelo = () => vPostave(hlTelo(ID));
/* teplé světlo plodu na boku, který je k němu blíž; odvrácený bok je ve stínu */
const vrstvaSvit = (st) => {
  const S = clamp(st.S, 0, 1.5), [cx, cy] = st.Lt;
  const dal = Math.hypot(cx - STRED[0], cy - STRED[1]), r = dal + 26;
  return vPostave(
    `<defs><radialGradient id="${ID}-svit-g" gradientUnits="userSpaceOnUse" cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}">` +
      `<stop offset="${f(clamp((dal - 50) / r))}" stop-color="#FFC27A" stop-opacity="${f(clamp(0.66 * S))}"/><stop offset="${f(clamp((dal - 14) / r))}" stop-color="#F08A44" stop-opacity="${f(clamp(0.2 * S))}"/><stop offset="1" stop-color="#F08A44" stop-opacity="0"/></radialGradient></defs>` +
      `<circle cx="${STRED[0]}" cy="${STRED[1]}" r="47.2" fill="url(#${ID}-stin-tela)"/>` +
      `<circle cx="${STRED[0]}" cy="${STRED[1]}" r="47.2" fill="url(#${ID}-svit-g)"/>` +
      `<circle cx="${STRED[0]}" cy="${STRED[1]}" r="47" fill="none" stroke="url(#${ID}-svit-g)" stroke-width="2"/>`,
  );
};
/* jedno oko pootevřené: levé spí dál, to blíž k plodu kouká — stejné tahy jako v hlTvar */
const tvarKouk = (st) => {
  const [x, y] = HL.oci[1], o = st.kouk, linka = "#F4EBDD";
  const ox = clamp(st.pohled[0], -2.2, 2.2);
  return (
    `<g fill="url(#${ID}-tvare)" opacity="${f(clamp(st.tvare))}"><ellipse cx="68" cy="104" rx="9" ry="6"/><ellipse cx="112" cy="104" rx="9" ry="6"/></g>` +
    `<path d="M72 94 Q78 90 84 94" stroke="${linka}" stroke-width="2.5" stroke-linecap="round" fill="none"/>` +
    `<path d="M${x - 5.4} ${y} Q${x} ${f(y + 5.6 * o)} ${x + 5.4} ${y} Z" fill="${linka}"/>` +
    `<circle cx="${f(x + ox * 0.6)}" cy="${f(y + 1.5 * o)}" r="${f(2 * clamp(o * 1.3))}" fill="#2B2420"/>` +
    `<path d="M${x - 6} ${f(y - 0.4)} Q${x} ${f(y - 1.6 - 2.4 * (1 - o))} ${x + 6} ${f(y - 0.4)}" stroke="${linka}" stroke-width="${f(lerp(2.5, 1.8, o))}" stroke-linecap="round" fill="none"/>` +
    `<path d="M85 108 Q90 112 95 108" stroke="${linka}" stroke-width="1.8" stroke-linecap="round" fill="none"/>`
  );
};
const vrstvaTvar = (st) =>
  vPostave(
    `<g transform="${TVAR}">${
      st.oci === "kouk"
        ? tvarKouk(st)
        : hlTvar(ID, { oci: st.oci, usta: st.usta, mrk: st.mrk, dx: st.pohled[0], dy: st.pohled[1], tvare: st.tvare, odlesk: st.S > 0.1 ? { barva: "#FFC86A", sila: clamp(0.3 + 0.5 * st.S) } : null })
    }</g>`,
  );
/* zetka stoupají od hlavy a zůstávají ve vzduchu, a tak ujíždějí dozadu; a bublina, když klimbá */
const vrstvaZzz = (st) => {
  let s = "";
  if (st.zzz > 0.03) {
    const [x0, y0] = naTelo(ZZZ, st.fig), m = 0.95 + 0.3 * st.klimb;
    for (let i = 0; i < 3; i++) {
      const u = cyk(st.t / 3.6 + i / 3), op = Math.sin(Math.PI * u) * st.zzz;
      if (op < 0.03) continue;
      s += zetko(x0 - u * (5 + 11 * st.chod) * m + Math.sin(u * 6 + i) * 2, y0 - u * 24 * m, (0.62 + u * 0.6) * m, op * 0.9);
    }
  }
  const b = st.bublina;
  if (b.r > 0.2) {
    const [ax, ay] = naTelo(PUSA, st.fig), x = ax + b.r * 0.86, y = ay + b.r * 0.34;
    s +=
      `<circle cx="${f(x)}" cy="${f(y)}" r="${f(b.r)}" fill="#F6FBFF" fill-opacity="0.58" stroke="#8FA6B4" stroke-width="0.5"/>` +
      `<path d="M${f(x - b.r * 0.6)} ${f(y - b.r * 0.1)} A${f(b.r * 0.62)} ${f(b.r * 0.62)} 0 0 1 ${f(x - b.r * 0.08)} ${f(y - b.r * 0.6)}" stroke="#FFFFFF" stroke-width="${f(Math.max(0.35, b.r * 0.16))}" stroke-linecap="round" fill="none"/>` +
      /* v bublině se zrcadlí plod */
      `<path d="M${f(x + b.r * 0.44)} ${f(y + b.r * 0.62)} A${f(b.r * 0.78)} ${f(b.r * 0.78)} 0 0 0 ${f(x + b.r * 0.76)} ${f(y - b.r * 0.1)}" stroke="#FFB868" stroke-width="${f(Math.max(0.35, b.r * 0.14))}" stroke-linecap="round" fill="none" opacity="${f(clamp(0.8 * st.S))}"/>`;
  }
  if (b.prask > 0) {
    const [ax, ay] = naTelo(PUSA, st.fig), r = b.praskR, x = ax + r * 0.86, y = ay + r * 0.34, q = 1 - b.prask;
    s += `<g stroke="#8FA6B4" stroke-width="0.55" stroke-linecap="round" opacity="${f(b.prask)}">${[10, 70, 130, 190, 250, 310].map((a) => `<path d="M${f(x + Math.cos(rad(a)) * r * (1 + q * 0.5))} ${f(y + Math.sin(rad(a)) * r * (1 + q * 0.5))} L${f(x + Math.cos(rad(a)) * r * (1.4 + q))} ${f(y + Math.sin(rad(a)) * r * (1.4 + q))}"/>`).join("")}</g>`;
  }
  return s;
};
/* záře kolem plodu: kruh nakreslený jednou, běh ho nosí za světlem a průhledností s ním tepe */
const vrstvaZare = () => `<circle cx="${f(L0[0])}" cy="${f(L0[1])}" r="${ZARE_R}" fill="url(#${ID}-zare)"/>`;
/* plocha končí na 180: když se plod rozhoupe ke kraji, záře zeslábne, ať ji kraj neusekne natvrdo */
const uKraje = (st) => clamp((180 - 13 - st.L[0]) / 24);
/* světluška: krovky, červený štítek a zadeček, který svítí; za jasnou zůstává stopa jako na dlouhé expozici */
const svetluskaSvg = (m) => {
  const j = m.jas;
  let s = "";
  if (m.stopa.length > 1 && j > 0.2) s += `<path d="${cara(m.stopa)} L${f(m.x)} ${f(m.y)}" stroke="#E9DC4E" stroke-width="${f(0.6 + 0.8 * j)}" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="${f(0.5 * j)}"/>`;
  s += `<circle cx="${f(m.x)}" cy="${f(m.y)}" r="${f((3.2 + 5.4 * j) * m.sc)}" fill="url(#${ID}-svetluska)" opacity="${f(0.4 + 0.6 * j)}"/>`;
  s +=
    `<g transform="translate(${f(m.x)} ${f(m.y)}) scale(${f(1.3 * m.sc * m.smer)} ${f(1.3 * m.sc)}) rotate(${f(m.nakl)})">` +
    (m.sedi ? "" : `<ellipse cx="0.1" cy="${f(-0.8 - 0.4 * m.mav)}" rx="1.3" ry="${f(0.3 + 0.6 * m.mav)}" fill="#FBF6EA" stroke="#8A7A69" stroke-width="0.1" opacity="0.4"/>`) +
    `<ellipse cx="0.5" cy="0" rx="1.15" ry="0.6" fill="#3A3028"/><circle cx="1.65" cy="-0.05" r="0.4" fill="#9A3A28"/>` +
    `<ellipse cx="-0.9" cy="0.12" rx="1" ry="0.68" fill="${mix("#E4DC5E", "#FFFDD0", j)}"/></g>`;
  return m.z < 0 ? `<g opacity="0.8">${s}</g>` : s;
};
const vrstvaSvetlusky = (vpredu) => (st) => {
  let s = st.svetlusky.filter((m) => m.z >= 0 === vpredu).map(svetluskaSvg).join("");
  /* dvě světýlka z původní kresby plavou u ní, dokud spí */
  if (vpredu) for (const v of st.svetylka) s += svetylko(ID, v[0], v[1], v[2], v[3]);
  return s;
};
/* zadní stěna měchýřku a bobule — tak, jak vypadají, když nesvítí */
const vrstvaHozukiZada = () =>
  vHozuki(
    `<path d="${OBRYS_H}" fill="#6A2410"/>` +
      `<g clip-path="url(#${ID}-hozuki)"><path d="${ZEBRA_ZADNI}" stroke="#A8552A" stroke-width="0.45" fill="none" opacity="0.55"/></g>` +
      `<circle cx="${f(BOB[0])}" cy="${f(BOB[1])}" r="${BOB_R}" fill="url(#${ID}-bobule)" stroke="#7A2A10" stroke-width="0.4"/>` +
      `<ellipse cx="${f(BOB[0] - 1.8)}" cy="${f(BOB[1] - 2.2)}" rx="1.5" ry="1" transform="rotate(-35 ${f(BOB[0] - 1.8)} ${f(BOB[1] - 2.2)})" fill="#FFE6B0" opacity="0.7"/>`,
  );
/* totéž rozsvícené: bobule žhne a prosvěcuje zadní stěnu */
const vrstvaHozukiJadro = () =>
  vHozuki(
    `<path d="${OBRYS_H}" fill="url(#${ID}-vnitrek)"/>` +
      `<g clip-path="url(#${ID}-hozuki)"><path d="${ZEBRA_ZADNI}" stroke="#C2501C" stroke-width="0.4" fill="none" opacity="0.5"/></g>` +
      `<circle cx="${f(BOB[0])}" cy="${f(BOB[1])}" r="10.5" fill="url(#${ID}-jas)" opacity="0.8"/>` +
      `<circle cx="${f(BOB[0])}" cy="${f(BOB[1])}" r="${BOB_R}" fill="url(#${ID}-bobule-svit)" stroke="#B03A10" stroke-width="0.45"/>` +
      `<ellipse cx="${f(BOB[0] - 1.8)}" cy="${f(BOB[1] - 2.2)}" rx="1.5" ry="1" transform="rotate(-35 ${f(BOB[0] - 1.8)} ${f(BOB[1] - 2.2)})" fill="#FFFFFF" opacity="0.85"/>`,
  );
const zilkyH = (sit, zebra, pruhl) =>
  `<g clip-path="url(#${ID}-hozuki)" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="${pruhl}">` +
  `<path d="${SIT_H}" stroke="${sit}" stroke-width="0.26"/>` +
  `<path d="${ZEBRA_VE}" stroke="${zebra}" stroke-width="0.4"/><path d="${ZEBRA_HL}" stroke="${zebra}" stroke-width="0.62"/></g>`;
/* papír měchýřku s dírami, žebra, síť žilek a v dírách krajka: tmavé žilky proti světlu */
const vrstvaHozukiPapir = () =>
  vHozuki(
    `<path d="${OBRYS_H} ${DIRY_H}" fill-rule="evenodd" fill="url(#${ID}-papir)"/>` +
      `<path d="${OBRYS_H} ${DIRY_H}" fill-rule="evenodd" fill="url(#${ID}-boky)"/>` +
      zilkyH("#8E3413", "#8E3413", 0.6) +
      `<g clip-path="url(#${ID}-diry)" fill="none" stroke="#4E220C" stroke-linecap="round" stroke-linejoin="round"><path d="${SIT_H}" stroke-width="0.28"/><path d="${ZEBRA_VE}" stroke-width="0.38"/><path d="${ZEBRA_HL}" stroke-width="0.52"/></g>` +
      `<path d="${DIRY_H}" fill="none" stroke="#7A2E10" stroke-width="0.42" stroke-linejoin="round"/>` +
      `<path d="${OBRYS_H}" fill="none" stroke="#8A3A16" stroke-width="0.7" stroke-linejoin="round"/>` +
      /* důlek, kterým vchází stopka */
      `<ellipse cx="0.1" cy="${HOZ.y0 + 1.1}" rx="2.6" ry="0.9" fill="#7A2E10" opacity="0.55"/>`,
  );
/* rozsvícený papír: leží přes nesvítící a průhledností se do něj prolíná */
const vrstvaHozukiSvit = () =>
  vHozuki(
    `<path d="${OBRYS_H} ${DIRY_H}" fill-rule="evenodd" fill="url(#${ID}-papir-svit)"/>` +
      `<path d="${OBRYS_H} ${DIRY_H}" fill-rule="evenodd" fill="url(#${ID}-boky)" opacity="0.6"/>` +
      zilkyH("#A6431A", "#9A3A14", 0.62) +
      `<path d="${DIRY_H}" fill="none" stroke="#B4501E" stroke-width="0.4" stroke-linejoin="round"/>` +
      `<path d="${OBRYS_H}" fill="none" stroke="#A8461A" stroke-width="0.7" stroke-linejoin="round"/>` +
      `<circle cx="${f(BOB[0])}" cy="${f(BOB[1])}" r="15" fill="url(#${ID}-jas)" opacity="0.22"/>`,
  );
const pohybHozuki = (st) => ({ x: st.T[0] - T0[0], y: st.T[1] - T0[1], r: -deg(st.th), ox: T0[0], oy: T0[1] });
const vrstvaZaba = (st) => zabaSvg(st.zaba);
/* co létá jen chvíli: jiskry a paprsky, když plod zaplane, dušičky a čáry větru */
const vrstvaJiskry = (st) => {
  let s = "";
  const [lx, ly] = st.L;
  if (st.zar > 0.03) {
    s += `<path d="${PAPRSKY}" transform="translate(${f(lx)} ${f(ly)}) rotate(${f(st.t * 22)}) scale(${f(0.5 + 0.5 * clamp(st.zar))})" fill="url(#${ID}-paprsky)" opacity="${f(clamp(0.8 * st.zar))}"/>`;
    s += `<circle cx="${f(lx)}" cy="${f(ly)}" r="${f(13 + 9 * st.zar)}" fill="url(#${ID}-jas)" opacity="${f(clamp(0.7 * st.zar))}"/>`;
  }
  for (const v of st.vanek) {
    const u = v.vek / v.zivot, x = v.x + v.smer * u * 46, k = v.smer * 9;
    s += `<path d="M${f(x)} ${f(v.y)} q${f(k * 0.5)} ${f(-2.4)} ${f(k)} 0 t${f(k)} 0" stroke="#8A7A69" stroke-width="0.9" stroke-linecap="round" fill="none" opacity="${f(0.75 * Math.sin(Math.PI * u))}"/>`;
  }
  for (const q of st.dusicky) {
    const u = q.vek / q.zivot, op = clamp(Math.min(u / 0.12, (1 - u) / 0.4));
    s +=
      `<circle cx="${f(q.x)}" cy="${f(q.y)}" r="${f(q.r * 3.2)}" fill="url(#${ID}-dusicka)" opacity="${f(op)}"/>` +
      /* hlavička a ocásek, který se táhne za ní, jako u bludiček hitodama */
      `<path d="M${f(q.x - q.r)} ${f(q.y)} A${f(q.r)} ${f(q.r)} 0 1 1 ${f(q.x + q.r)} ${f(q.y)} Q${f(q.x + q.r * 0.7 - q.kx * 0.4)} ${f(q.y + q.r * 2)} ${f(q.x - q.kx)} ${f(q.y + q.r * 4.2)} Q${f(q.x - q.r * 0.9 - q.kx * 0.2)} ${f(q.y + q.r * 1.8)} ${f(q.x - q.r)} ${f(q.y)} Z" fill="#FFF1C4" stroke="#F2A040" stroke-width="0.4" stroke-linejoin="round" opacity="${f(op)}"/>`;
  }
  for (const j of st.jiskry) {
    const u = j.vek / j.zivot;
    s += `<path d="${JISKRA}" transform="translate(${f(j.x)} ${f(j.y)}) rotate(${f(j.rot + u * 80)}) scale(${f(j.r * (1 - u * 0.4))})" fill="${j.sv ? "#FFFBE0" : "#FFC860"}" stroke="#C8621E" stroke-width="${f(0.26 / j.r)}" opacity="${f(clamp(Math.min(u / 0.1, (1 - u) / 0.5)))}"/>`;
  }
  return s;
};

const defs = () =>
  hlDefs(ID) +
  `<clipPath id="${ID}-hozuki"><path d="${OBRYS_H}"/></clipPath>` +
  `<clipPath id="${ID}-diry"><path d="${DIRY_H}"/></clipPath>` +
  `<radialGradient id="${ID}-stin"><stop offset="0" stop-color="#2B2420" stop-opacity="0.28"/><stop offset="0.6" stop-color="#2B2420" stop-opacity="0.13"/><stop offset="1" stop-color="#2B2420" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="${ID}-kaluz"><stop offset="0" stop-color="#FFC268" stop-opacity="0.62"/><stop offset="0.55" stop-color="#F59A4E" stop-opacity="0.24"/><stop offset="1" stop-color="#F59A4E" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="${ID}-zare"><stop offset="0" stop-color="#FFE0A0" stop-opacity="0.62"/><stop offset="0.36" stop-color="#FFA858" stop-opacity="0.24"/><stop offset="1" stop-color="#FF9A4A" stop-opacity="0"/></radialGradient>` +
  /* odvrácený bok hroudy */
  `<linearGradient id="${ID}-stin-tela" x1="0" y1="0.3" x2="1" y2="0.6"><stop offset="0" stop-color="#2B2420" stop-opacity="0.3"/><stop offset="0.5" stop-color="#2B2420" stop-opacity="0.06"/><stop offset="0.75" stop-color="#2B2420" stop-opacity="0"/></linearGradient>` +
  /* měchýřek: nesvítící papír, boky stočené dozadu, a totéž prosvícené bobulí */
  `<linearGradient id="${ID}-papir" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C96A32"/><stop offset="0.5" stop-color="#BC5524"/><stop offset="1" stop-color="#9C3E18"/></linearGradient>` +
  `<linearGradient id="${ID}-boky" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5A1E0A" stop-opacity="0.5"/><stop offset="0.24" stop-color="#5A1E0A" stop-opacity="0"/><stop offset="0.74" stop-color="#5A1E0A" stop-opacity="0"/><stop offset="1" stop-color="#5A1E0A" stop-opacity="0.55"/></linearGradient>` +
  `<radialGradient id="${ID}-papir-svit" cx="0.53" cy="0.5" r="0.64"><stop offset="0" stop-color="#FFE9A0"/><stop offset="0.3" stop-color="#FFC257"/><stop offset="0.64" stop-color="#F58A2C"/><stop offset="1" stop-color="#D8571E"/></radialGradient>` +
  `<radialGradient id="${ID}-vnitrek" cx="0.53" cy="0.5" r="0.6"><stop offset="0" stop-color="#FFD27A"/><stop offset="0.34" stop-color="#F9A040"/><stop offset="1" stop-color="#A8401A"/></radialGradient>` +
  `<radialGradient id="${ID}-bobule" cx="0.38" cy="0.32" r="0.8"><stop offset="0" stop-color="#F2A03C"/><stop offset="0.55" stop-color="#D8501E"/><stop offset="1" stop-color="#9E3012"/></radialGradient>` +
  `<radialGradient id="${ID}-bobule-svit" cx="0.42" cy="0.38" r="0.66"><stop offset="0" stop-color="#FFFDEA"/><stop offset="0.3" stop-color="#FFE27A"/><stop offset="0.72" stop-color="#FF8A22"/><stop offset="1" stop-color="#DA4414"/></radialGradient>` +
  `<radialGradient id="${ID}-jas"><stop offset="0" stop-color="#FFF6C8" stop-opacity="0.9"/><stop offset="0.5" stop-color="#FFC860" stop-opacity="0.32"/><stop offset="1" stop-color="#FFC860" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="${ID}-paprsky" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="46"><stop offset="0" stop-color="#FFFBE0" stop-opacity="0.95"/><stop offset="0.45" stop-color="#FFD070" stop-opacity="0.55"/><stop offset="1" stop-color="#FFA050" stop-opacity="0"/></radialGradient>` +
  /* na světlém papíře stránky musí být záře sytá, bledá by nebyla vidět */
  `<radialGradient id="${ID}-svetluska"><stop offset="0" stop-color="#FFFBB0" stop-opacity="1"/><stop offset="0.28" stop-color="#F2E24A" stop-opacity="0.8"/><stop offset="0.6" stop-color="#E6D23C" stop-opacity="0.3"/><stop offset="1" stop-color="#E6D23C" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="${ID}-dusicka"><stop offset="0" stop-color="#FFE9A8" stop-opacity="1"/><stop offset="0.3" stop-color="#FFB648" stop-opacity="0.7"/><stop offset="0.62" stop-color="#FF8E2E" stop-opacity="0.25"/><stop offset="1" stop-color="#FF8E2E" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="${ID}-ulita" cx="0.36" cy="0.3" r="0.8"><stop offset="0" stop-color="#E4CC96"/><stop offset="0.6" stop-color="#C9A66B"/><stop offset="1" stop-color="#A27C48"/></radialGradient>`;

/* ——— Simulace ——— */
/** Záblesk světlušky: rychle naskočí a pomalu dohasíná, většinu taktu je skoro tma. */
const zablik = (p) => 0.2 + 0.8 * (p < 0.14 ? smooth(p / 0.14) : Math.exp(-(p - 0.14) / 0.2));
/** Tělo, prut a špička pro daný okamžik — stejně to počítá krok i stav. */
const poza = (d, t) => {
  const fig = figV(d, t);
  const B = stonek(naTelo(KOREN, fig), d.a + fig.r, d.k);
  return { fig, B, T: B[STONEK.n] };
};
const obehSvetlusky = (m, t) => {
  const rr = m.r + m.rozprch, k = clamp(rr / m.r0);
  m.z = m.sedi > 0 ? 1 : rr * Math.sin(m.a);
  m.x = clamp(m.c[0] + rr * Math.cos(m.a) * 0.92 + m.odfuk, 5, 175);
  m.y = clamp(m.c[1] + (m.h0 + 5 * Math.sin(t * m.w * 0.8 + m.fz)) * k - m.z * 0.1, 6, ZEM - 3);
};
const novaDynamika = () => {
  const R = rng(4107);
  const d = {
    nahoda: R, zvuk: [],
    /* chůze: fáze kroku, tempo a co zrovna dělá (jde, zev, klimb, skub, zakop) */
    fi: 0.16, tempo: 1, chod: 1, posuv: RYCHLOST, rezim: "jde", od: 0, doZev: 7.5 + R() * 2, doKlimb: 17 + R() * 4, drzi: 2.6,
    /* tělo: náklon, rosol (jak se hrouda po došlapu zatřese) a protažení jsou pružiny */
    nakl: 0, naklV: 0, rosol: 0, rosolV: 0, protah: 0, klimb: 0, skok: 0, bdi: 0, kouk: 0, koukDo: 0, pohled: [1.4, 0.2],
    /* výhonek: úhel u kořínku a stočení, kam míří a jak se třepou listy */
    a: A0, aV: 0, k: K0, kV: 0, cilA: A0, cilK: K0, trep: 0,
    /* plod: kyvadlo na špičce prutu, zaplanutí a kolikáté je v řadě */
    th: -0.05, om: 0, T: null, Tp: null, Vp: null, aT: [0, 0], L: null, zar: 0, stupen: 0, zaplanT: -100, finale: -100, sust: 0,
    mysP: null, mysV: [0, 0], vitr: 0, klavesa: 0,
    bublina: 0, prask: -100, praskR: 0,
    svetlusky: Array.from({ length: 6 }, (_, i) => ({
      a: i * 1.05 + R() * 0.6, smer: i % 3 === 1 ? -1 : 1, va: 0.8 + R() * 0.7, r0: 21 + R() * 13, r: 0, h0: [-19, 9, -6, 17, -13, 3][i] + R() * 4, fz: R() * 6.28, w: 0.6 + R() * 0.7,
      /* první čtyři jsou zvědavé a letí za kurzorem, dvě zůstávají u plodu; poslední si občas sedne Hlínce na čelo */
      faze: R(), perioda: 1.95 + R() * 0.5, zved: i < 4 ? 0.62 + R() * 0.38 : 0, lenost: 0.55 + R() * 0.7, c: [0, 0], rozprch: 0, odfuk: 0, sedi: 0, x: 0, y: 0, z: 0, vx: 1, stopa: [],
    })),
    doSednuti: 12 + R() * 5, sedi: false,
    zaba: { x: 27, y: 0, stav: "sedi", t0: 0, x0: 0, x1: 0, vyska: 0, doba: 0.4, salto: false, ceka: 0.9, ticho: 0, kvak: -100, chceSalto: false },
    snek: { s: 0.46, cil: 0.46, schov: 0, lek: -100 },
    stopy: [], prach: [], jiskry: [], dusicky: [], vanek: [], cvrcek: 9 + R() * 6,
  };
  const p = poza(d, 0);
  d.T = p.T;
  d.L = naHozuki(p.T, d.th, [BOB[0], STRED_H]);
  for (const m of d.svetlusky) {
    m.r = m.r0;
    m.c = [d.L[0], d.L[1]];
    obehSvetlusky(m, 0);
  }
  return d;
};
const zacni = (d, t, rezim) => {
  d.rezim = rezim;
  d.od = t;
};
const lekniSneka = (d, t) => {
  d.snek.lek = t;
  d.snek.cil = Math.max(0.44, d.snek.s - 0.07);
};
const prsk = (d, [x, y], pocet, { rychlost = 60, zivot = 0.7, r = 2, nahoru = 0 } = {}) => {
  const R = d.nahoda;
  for (let i = 0; i < pocet && d.jiskry.length < 48; i++) {
    const a = R() * 6.28, v = rychlost * (0.35 + R() * 0.65);
    d.jiskry.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - nahoru, vek: 0, zivot: zivot * (0.6 + R() * 0.8), r: r * (0.5 + R() * 0.8), rot: R() * 90, sv: R() < 0.45 });
  }
};
const SALTO = (x) => ({ kam: clamp(x - 8, 13, 22), vyska: 28, doba: 0.78, salto: true });
const skocZaba = (d, t, { kam, vyska, doba, salto = false }) => Object.assign(d.zaba, { stav: "skok", t0: t, x0: d.zaba.x, x1: kam, vyska, doba, salto });
const kvakni = (d, t, sila = 0.6) => {
  d.zaba.kvak = t;
  d.zvuk.push({ druh: "kero", sila, pan: pan(d.zaba.x) });
};
const praskniBublinu = (d, t) => {
  if (d.bublina < 1.2) return;
  d.prask = t;
  d.praskR = d.bublina;
  d.bublina = 0;
  d.zvuk.push({ druh: "prask", sila: 0.6, pan: pan(FIG.x + 30) });
};
/** Škubne sebou a jde dál — konec klimbání. */
const skubni = (d, t) => {
  zacni(d, t, "skub");
  d.naklV -= 75;
  d.rosolV -= 0.7;
  d.kV -= 130;
  d.aV -= 40;
  praskniBublinu(d, t);
  lekniSneka(d, t);
  d.zvuk.push({ druh: "nadech", sila: 0.55, pan: pan(FIG.x), za: 0.04 });
};
/** Zakopne: přepadne dopředu, dvěma rychlými krůčky to vybere a lucerna se rozhoupe. */
const zakopni = (d, t) => {
  if (d.rezim === "zakop" && t - d.od < 0.7) return;
  zacni(d, t, "zakop");
  d.naklV += 160;
  d.rosolV += 1.1;
  d.kV += 150;
  d.aV += 50;
  d.om += 2;
  d.trep = 1;
  praskniBublinu(d, t);
  lekniSneka(d, t);
  for (const m of d.svetlusky) m.rozprch += 9;
  if (d.zaba.stav === "sedi") skocZaba(d, t + 0.08, { kam: d.zaba.x, vyska: 8, doba: 0.36 });
  d.zvuk.push({ druh: "zakop", sila: 0.9, pan: pan(FIG.x) });
  d.zvuk.push({ druh: "nadech", sila: 0.5, pan: pan(FIG.x), za: 0.16 });
};
/** Plod zaplane, světlušky se rozprsknou; čtvrté zaplanutí v řadě vypustí dušičky. */
const zaplan = (d, t) => {
  const R = d.nahoda, L = d.L;
  /* držená klávesa kliká třicetkrát za vteřinu: plod potřebuje chvilku, než zaplane znovu */
  if (t - d.zaplanT < 0.22) return;
  d.stupen = t - d.zaplanT < 4.5 ? d.stupen + 1 : 1;
  d.zaplanT = t;
  d.zar = Math.min(2.2, d.zar + 1.25);
  d.om += (R() - 0.5) * 1.4;
  prsk(d, L, 12, { rychlost: 70, zivot: 0.8, r: 2.2, nahoru: 10 });
  for (const m of d.svetlusky) {
    m.rozprch = Math.min(46, m.rozprch + 24 + R() * 14);
    m.faze = R();
    m.sedi = 0;
  }
  lekniSneka(d, t);
  d.zvuk.push({ druh: "zaplan", sila: 0.9, pan: pan(L[0]) });
  d.zvuk.push({ druh: "rozprsk", sila: 0.7, pan: pan(L[0]), za: 0.08 });
  d.zvuk.push({ druh: "rin", stupen: d.stupen, sila: 0.8, pan: pan(L[0]), za: 0.05 });
  if (d.stupen >= 4) {
    /* o Obonu svítí hózuki duším na cestu: tak ať jdou */
    d.stupen = 0;
    d.finale = t;
    d.zar = 2.2;
    for (let i = 0; i < 9 && d.dusicky.length < 18; i++) d.dusicky.push({ x: L[0] + (R() - 0.5) * 16, y: L[1] + (R() - 0.5) * 18, vx: (i - 4) * 2.6 + (R() - 0.5) * 4, vy: 14 + R() * 12, vek: -i * 0.1, zivot: 3.2 + R() * 1.3, fz: R() * 6.28, r: 1.5 + R() * 0.9, kx: 0 });
    prsk(d, L, 16, { rychlost: 95, zivot: 1, r: 2.6, nahoru: 14 });
    d.zvuk.push({ druh: "koto", nahoru: true, sila: 0.7, pan: pan(L[0]), za: 0.12 });
    d.zvuk.push({ druh: "chichot", sila: 0.6, pan: pan(FIG.x), za: 0.75 });
  }
};
/** Zafouká od místa, kam se kliklo: plod to odnese na druhou stranu, listy se roztřepou. */
const zafoukej = (d, t, k) => {
  const R = d.nahoda, smer = k.x < d.L[0] ? 1 : -1;
  d.om += smer * 2.7;
  d.kV += 60;
  d.trep = 1;
  d.vitr = smer;
  for (const m of d.svetlusky) m.odfuk += smer * (10 + R() * 14);
  for (let i = 0; i < 4 && d.vanek.length < 8; i++) d.vanek.push({ x: k.x + smer * (i * 7 - 6), y: clamp(k.y + (i - 1.5) * 7 + (R() - 0.5) * 4, 10, ZEM - 8), smer, vek: -i * 0.05, zivot: 0.5 + R() * 0.2 });
  d.zvuk.push({ druh: "poryv", sila: 0.55, pan: pan(k.x) });
};
const klik = (d, t, k, fig) => {
  const z = d.zaba, c = naTelo(STRED, fig);
  /* z klávesnice přijde přesný střed plochy: střídá zaplanutí a zakopnutí */
  if (k.x === 90 && k.y === 90) return d.klavesa++ % 2 ? zakopni(d, t) : zaplan(d, t);
  if (Math.hypot(k.x - z.x, k.y - (ZEM - 4 + z.y)) < 13) {
    if (z.stav === "sedi") skocZaba(d, t, SALTO(z.x));
    else z.chceSalto = true;
    return kvakni(d, t, 0.8);
  }
  if (Math.hypot(k.x - d.L[0], k.y - d.L[1]) < 22) return zaplan(d, t);
  if (Math.hypot(k.x - c[0], k.y - c[1]) < 37) return zakopni(d, t);
  return zafoukej(d, t, k);
};
/** O kolik pootočit kořínek a přihnout prut, aby špička došla k cíli: jeden krok hledání na snímek. */
const zamir = (d, fig, cil) => {
  const koren = naTelo(KOREN, fig);
  const spicka = (a, k) => stonek(koren, a + fig.r, k)[STONEK.n];
  const T = spicka(d.cilA, d.cilK), Ta = spicka(d.cilA + 1, d.cilK), Tk = spicka(d.cilA, d.cilK + 1);
  const J = [Ta[0] - T[0], Tk[0] - T[0], Ta[1] - T[1], Tk[1] - T[1]];
  const det = J[0] * J[3] - J[1] * J[2];
  if (Math.abs(det) < 1e-3) return;
  const e = [cil[0] - T[0], cil[1] - T[1]];
  d.cilA = clamp(d.cilA + clamp((e[0] * J[3] - e[1] * J[1]) / det, -5, 5) * 0.5, MEZE_A[0], MEZE_A[1]);
  d.cilK = clamp(d.cilK + clamp((-e[0] * J[2] + e[1] * J[0]) / det, -7, 7) * 0.5, MEZE_K[0], MEZE_K[1]);
};
const krok = (dyn, t, dt, vstup) => {
  if (dt <= 0) return;
  const d = dyn, R = d.nahoda;
  const mys = vstup.mys || null;
  /* rychlost kurzoru: kdo jím u plodu mávne, udělá vítr */
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
  let cilTempo = 1, cilProtah = 0, cilKlimb = 0, dA = 0, dK = 0;
  d.skok = 0;
  if (d.rezim === "jde") {
    d.doZev -= dt;
    d.doKlimb -= dt;
    if (d.doKlimb <= 0) {
      zacni(d, t, "klimb");
      d.drzi = 2.2 + R() * 1.4;
    } else if (d.doZev <= 0) zacni(d, t, "zev");
  } else if (d.rezim === "zev") {
    cilTempo = 0.55;
    cilProtah = Math.sin(Math.PI * clamp((u - 0.2) / 1.5));
    if (pres(uP, u, 0.3)) d.zvuk.push({ druh: "zev", sila: 0.7, pan: pan(FIG.x) });
    if (u > 2) {
      zacni(d, t, "jde");
      d.doZev = 10 + R() * 7;
    }
  } else if (d.rezim === "klimb") {
    /* zastaví se, svěsí hlavu i výhonek; kdo u ní zatřese kurzorem, probudí ji dřív */
    cilTempo = 0;
    cilKlimb = 1;
    if (u > 1.3 + d.drzi || (u > 1 && Math.hypot(d.mysV[0], d.mysV[1]) > 260)) skubni(d, t);
  } else if (d.rezim === "skub") {
    cilTempo = u < 0.45 ? 0 : 1;
    if (u > 1) {
      zacni(d, t, "jde");
      d.doKlimb = 19 + R() * 10;
      d.doZev = Math.max(d.doZev, 5);
    }
  } else if (d.rezim === "zakop") {
    cilTempo = u < 0.38 ? 2.3 : u < 2.7 ? 0 : 1;
    d.skok = u < 0.32 ? 4.6 * Math.sin((Math.PI * u) / 0.32) : 0;
    cilProtah = Math.sin(Math.PI * clamp((u - 1.95) / 1.05));
    if (pres(uP, u, 1.95)) d.zvuk.push({ druh: "zev", sila: 0.7, pan: pan(FIG.x) });
    if (u > 3.5) {
      zacni(d, t, "jde");
      d.doZev = 9 + R() * 6;
      d.doKlimb = Math.max(d.doKlimb, 8);
    }
  }
  d.klimb = kCili(d.klimb, cilKlimb, dt, cilKlimb ? 0.5 : 0.12);
  d.protah = kCili(d.protah, cilProtah, dt, 0.12);
  d.bdi = kCili(d.bdi, d.rezim === "zakop" && u < 2.3 ? 1 : 0, dt, 0.2);
  dA += 14 * d.klimb - 5 * d.protah;
  dK += 27 * d.klimb - 16 * d.protah;
  /* bublina se nafukuje s dechem, dokud klimbá */
  d.bublina = d.rezim === "klimb" ? kCili(d.bublina, (3.4 + 4 * d.klimb) * (0.86 + 0.14 * Math.sin((t / 1.9) * 2 * Math.PI)), dt, 0.5) : kCili(d.bublina, 0, dt, 0.08);

  /* ——— chůze ——— */
  d.tempo = kCili(d.tempo, cilTempo, dt, d.rezim === "zakop" && u < 0.38 ? 0.06 : cilTempo > d.tempo ? 0.45 : 0.25);
  /* když se zastavuje, došlápne: nezůstane stát s nožkou ve vzduchu */
  const rychl = cilTempo === 0 && !vOpore(d.fi) ? Math.max(d.tempo, 0.6) : d.tempo < 0.02 ? 0 : d.tempo;
  const fiP = d.fi;
  d.fi = cyk(d.fi + (dt * rychl) / KROK_T);
  d.posuv = RYCHLOST * rychl;
  d.chod = kCili(d.chod, clamp(d.tempo), dt, 0.3);
  for (const n of NOHY) {
    if (cyk(d.fi - n.faze) >= cyk(fiP - n.faze)) continue;
    /* nožka došlápla: hrouda se zatřese, prut se pod plodem prohne, na cestě zůstane stopa */
    const x = FIG.x + 1.1 * motani(t) * d.chod + (n.x + KROK) * FIG.s, y = ZEM + (n.blizko ? 0.9 : -0.7);
    d.rosolV += 0.4 * d.chod;
    d.kV += 20;
    d.zvuk.push({ druh: "sour", sila: 0.2 + 0.12 * R(), pan: pan(x) });
    if (d.prach.length < 8) d.prach.push({ x: x - 5, y, vek: 0, seed: Math.floor(R() * 1000) });
    if (d.stopy.length < 14) d.stopy.push({ x, y, vek: 0, klicek: R() < 0.64, zrc: R() < 0.5 ? -1 : 1, vel: 0.85 + R() * 0.5 });
  }
  [d.nakl, d.naklV] = pruzina(d.nakl, d.naklV, 8 * d.klimb, dt, 64, 7.5);
  [d.rosol, d.rosolV] = pruzina(d.rosol, d.rosolV, 0, dt, 190, 11);
  d.rosol = clamp(d.rosol, -0.12, 0.12);

  /* ——— výhonek: za kurzorem se natahuje jako za sluncem, ale jen kus cesty ——— */
  const fig = figV(d, t);
  const c = naTelo(STRED, fig);
  const naNi = mys ? Math.hypot(mys.x - c[0], mys.y - c[1]) < 36 : false;
  if (mys && !naNi) {
    const klid = stonek(naTelo(KOREN, fig), A0 + fig.r, K0)[STONEK.n];
    zamir(d, fig, [lerp(klid[0], clamp(mys.x, 122, 152), 0.45), lerp(klid[1], clamp(mys.y - ZAVES, 34, 104), 0.45)]);
  } else {
    d.cilA = kCili(d.cilA, A0, dt, 0.6);
    d.cilK = kCili(d.cilK, K0, dt, 0.6);
  }
  [d.a, d.aV] = pruzina(d.a, d.aV, d.cilA + dA + 1.6 * Math.sin(t * 0.47), dt, 38, 9);
  [d.k, d.kV] = pruzina(d.k, d.kV, d.cilK + dK + 3 * Math.sin(t * 0.31 + 1), dt, 44, 5.5);
  d.a = clamp(d.a, MEZE_A[0] - 14, MEZE_A[1] + 22);
  d.k = clamp(d.k, MEZE_K[0] - 30, MEZE_K[1] + 30);
  d.trep = kCili(d.trep, 0, dt, 0.5);

  /* ——— plod: kyvadlo, které rozhoupe zrychlení špičky prutu ——— */
  const T = poza(d, t).T;
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
  /* jde proti vzduchu, takže plod trochu zaostává; kurzor u něj fouká */
  const blizko = mys ? smooth(1 - Math.hypot(mys.x - d.L[0], mys.y - d.L[1]) / 46) : 0;
  d.vitr = kCili(d.vitr, 0, dt, 0.5);
  const vitr = -0.55 * d.chod + 0.45 * Math.sin(t * 0.83) + 0.25 * Math.sin(t * 1.9 + 1) + clamp(d.mysV[0] * 0.018, -3.6, 3.6) * blizko + 2 * d.vitr;
  /* měkké meze: k Hlínce se rozhoupe míň než od ní, ať jí nevletí do tváře, a dopředu jen tolik, aby nevyletěl z plochy */
  const horni = Math.min(MEZE_TH[1], Math.asin(clamp((KRAJ - T[0]) / ZAVES, 0.05, 0.66)));
  const mimo = d.th < MEZE_TH[0] ? d.th - MEZE_TH[0] : d.th > horni ? d.th - horni : 0;
  const alfa = (-d.aT[0] * Math.cos(d.th) - (G - d.aT[1]) * Math.sin(d.th)) / ZAVES - (1.15 + (mimo ? 7 : 0)) * d.om - 140 * mimo + vitr;
  d.om = clamp(d.om + alfa * dt, -6, 6);
  d.th += d.om * dt;
  if (d.th < MEZE_TH[0] - 0.2 || d.th > horni + 0.2) {
    d.th = clamp(d.th, MEZE_TH[0] - 0.2, horni + 0.2);
    d.om *= -0.25;
  }
  const L = naHozuki(T, d.th, [BOB[0], STRED_H]);
  d.L = L;
  d.zar = kCili(d.zar, 0, dt, 0.42);
  /* měchýřek zašustí, když se rozhoupe; šnek se při tom radši schová */
  d.sust = kCili(d.sust, clamp((Math.abs(d.om) - 1.2) / 3) + 0.6 * Math.abs(d.vitr), dt, 0.15);
  if (Math.abs(d.om) > 3.4 && t - d.snek.lek > 1) lekniSneka(d, t);

  /* ——— světlušky ——— */
  d.doSednuti -= dt;
  const posledni = d.svetlusky[d.svetlusky.length - 1];
  if (d.doSednuti <= 0 && d.rezim === "jde" && !mys) {
    d.doSednuti = 17 + R() * 9;
    posledni.sedi = 2.9;
  }
  d.sedi = false;
  for (const m of d.svetlusky) {
    let cil = L, rCil = m.r0 * (1 + 0.45 * d.klimb) + 3.5 * Math.sin(t * m.w + m.fz), lenost = m.lenost;
    if (m.sedi > 0) {
      /* sedí jí na čele: Hlínka nakrčí pusu, a když jí to dojde, škubne sebou */
      m.sedi -= dt;
      cil = naTelo(CELO, fig);
      rCil = 0;
      lenost = 0.3;
      if (m.r < 2.5) d.sedi = true;
      if (m.sedi <= 0 || d.rezim !== "jde") {
        m.sedi = 0;
        m.rozprch = 16;
        if (d.rezim === "jde") {
          d.naklV -= 11;
          d.rosolV += 0.3;
        }
      }
    } else if (mys && m.zved > 0) {
      cil = [lerp(L[0], mys.x, m.zved), lerp(L[1], mys.y, m.zved)];
      rCil *= lerp(1, 0.5, m.zved);
    }
    m.c = [kCili(m.c[0], cil[0], dt, lenost), kCili(m.c[1], cil[1], dt, lenost)];
    m.r = kCili(m.r, rCil, dt, 0.45);
    m.rozprch = kCili(m.rozprch, 0, dt, 0.75);
    m.odfuk = kCili(m.odfuk, 0, dt, 0.9);
    m.a += m.smer * m.va * dt * (1 + 0.4 * Math.sin(t * m.w * 1.7 + m.fz)) * (m.sedi > 0 ? 0.25 : 1);
    const xP = m.x, yP = m.y;
    obehSvetlusky(m, t);
    if (Math.abs(m.x - xP) > 0.02) m.vx = kCili(m.vx, (m.x - xP) / dt, dt, 0.1);
    /* stopa: pár míst, kudy právě letěla */
    const posl = m.stopa[m.stopa.length - 1];
    if (!posl || Math.hypot(xP - posl[0], yP - posl[1]) > 1.6) {
      m.stopa.push([xP, yP]);
      if (m.stopa.length > 5) m.stopa.shift();
    }
  }
  /* blikání se pomalu sladí do taktu, jako u gendži-botaru; zaplanutí ho zase rozhází */
  for (const m of d.svetlusky) {
    let s = 0;
    for (const o of d.svetlusky) s += Math.sin(2 * Math.PI * (o.faze - m.faze));
    m.dFaze = 1 / m.perioda + (0.1 * s) / d.svetlusky.length;
  }
  for (const m of d.svetlusky) m.faze = cyk(m.faze + m.dFaze * dt);

  /* ——— žabka: sedí na cestě, a tak ujíždí dozadu; když už je daleko, doskočí ——— */
  const z = d.zaba;
  if (z.stav === "sedi") {
    z.x -= d.posuv * dt;
    z.ceka -= dt;
    if (z.x < 15 || (z.ceka <= 0 && z.x < 21)) skocZaba(d, t, { kam: 25 + R() * 7, vyska: 6.5 + R() * 3, doba: 0.4 });
    /* když Hlínka stojí, má čas si zakvákat */
    z.ticho = d.posuv < 1 ? z.ticho + dt : 0;
    if (z.ticho > 2.3) {
      z.ticho = -1.5 - R() * 2;
      kvakni(d, t, 0.45);
    }
  } else {
    const q = (t - z.t0) / z.doba;
    if (q >= 1) {
      Object.assign(z, { stav: "sedi", x: z.x1, y: 0, ceka: 0.7 + R() * 0.7, salto: false });
      d.zvuk.push({ druh: "dopad", sila: 0.4 + (z.vyska > 12 ? 0.4 : 0), pan: pan(z.x) });
      if (d.prach.length < 8) d.prach.push({ x: z.x - 2, y: ZEM + 0.6, vek: 0, seed: Math.floor(R() * 1000) });
      if (z.chceSalto) {
        z.chceSalto = false;
        skocZaba(d, t, SALTO(z.x));
      }
    } else if (q > 0) {
      z.x = lerp(z.x0, z.x1, q);
      z.y = -z.vyska * 4 * q * (1 - q);
    }
  }

  /* ——— šnek leze ke světlu; když se lekne, zaleze a kus sjede ——— */
  const sn = d.snek;
  const lek = t - sn.lek < 1.7;
  sn.schov = kCili(sn.schov, lek ? 1 : 0, dt, lek ? 0.07 : 0.6);
  if (lek) sn.s = kCili(sn.s, sn.cil, dt, 0.5);
  else if (sn.schov < 0.15 && sn.s < 0.635) sn.s += 0.0042 * dt;

  /* ——— co zůstává na cestě a co létá ——— */
  for (const p of d.stopy) {
    p.vek += dt;
    p.x -= d.posuv * dt;
  }
  d.stopy = d.stopy.filter((p) => p.x > 9 && p.vek < 14);
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
  for (const q of d.dusicky) {
    q.vek += dt;
    if (q.vek < 0) continue;
    const vx = q.vx - d.posuv * 0.4 + 9 * Math.sin(q.vek * 2.3 + q.fz);
    q.x = clamp(q.x + vx * dt, 6, 174);
    q.y -= q.vy * dt;
    /* ocásek se táhne za pohybem */
    q.kx = kCili(q.kx, vx * 0.16, dt, 0.2);
  }
  d.dusicky = d.dusicky.filter((q) => q.vek < q.zivot && q.y > 4);
  for (const v of d.vanek) v.vek += dt;
  d.vanek = d.vanek.filter((v) => v.vek < v.zivot);

  /* ——— kurzor na Hlínce: pootevře oko ——— */
  if (naNi) d.koukDo = t + 0.5;
  d.kouk = kCili(d.kouk, t < d.koukDo && d.rezim === "jde" ? 1 : 0, dt, 0.16);
  /* pohled: probuzená kouká na rozhoupaný plod, jedním okem po kurzoru */
  const kam = mys && d.rezim === "jde" ? [mys.x, mys.y] : L;
  const oko = naTelo([97, 93], fig);
  const cp = [clamp((kam[0] - oko[0]) / 45, -1, 1) * 2.2, clamp((kam[1] - oko[1]) / 45, -1, 1) * 1.6];
  d.pohled = d.pohled.map((q, i) => kCili(q, cp[i], dt, 0.1));

  d.cvrcek -= dt;
  if (d.cvrcek <= 0) {
    d.cvrcek = 13 + R() * 10;
    d.zvuk.push({ druh: "cvrcek", sila: 0.5, pan: -0.6 });
  }
};
/** Jak se tváří: oči a pusa podle toho, co zrovna dělá. */
const vyraz = (d, t) => {
  const u = t - d.od;
  if (d.rezim === "zakop") {
    if (u < 0.45) return ["siroke", "o"];
    if (u < 1.25) return ["otevrene", "vlnka"];
    if (u < 1.95) return ["ospale", "usmev"];
    if (u < 3) return ["tvrde", "zev"];
    return ["spi", "usmev"];
  }
  if (d.rezim === "skub") return u < 0.5 ? ["ospale", "o"] : ["spi", "usmev"];
  if (d.rezim === "klimb") return [d.klimb > 0.5 ? "tvrde" : "spi", "spanek"];
  if (d.rezim === "zev") return u > 0.3 && u < 1.6 ? ["tvrde", "zev"] : ["spi", "usmev"];
  /* plod jí zaplane do snu: usměje se ze spaní, při dušičkách se rozesměje */
  if (t - d.finale < 1.7) return ["smich", "ach"];
  if (t - d.zaplanT < 0.9) return ["smich", "usmev"];
  if (d.kouk > 0.3) return ["kouk", "usmev"];
  return ["spi", d.sedi ? "vlnka" : "usmev"];
};
const stav = (t, vstup = {}, dyn) => {
  const d = dyn || novaDynamika();
  const { fig, B, T } = poza(d, t);
  const th = d.th;
  const L = naHozuki(T, th, [BOB[0], STRED_H]);
  const dech = Math.sin((t / DECH) * 2 * Math.PI - 0.6);
  /* bobule tepe s Hlínčiným dechem; když klimbá, pohasíná */
  const S = (0.86 + 0.11 * dech + 0.03 * Math.sin(t * 6.1)) * (1 - 0.5 * d.klimb) + d.zar;
  const [oci, usta] = vyraz(d, t);
  const z = d.zaba, qz = z.stav === "skok" ? clamp((t - z.t0) / z.doba) : 0;
  const uk = t - z.kvak;
  const up = t - d.prask;
  return {
    t, fig, B, T, th, L, Lt: doTela(L, fig), S, zar: d.zar, tempo: d.tempo, posuv: d.posuv, chod: d.chod, skok: d.skok, klimb: d.klimb, sust: d.sust,
    nohy: NOHY.map((n) => noha(n, d.fi)),
    oci, usta, kouk: d.kouk, pohled: d.pohled, mrk: mrkani(t, [0.9, 3.4, 3.62], 4.6),
    tvare: 0.42 + 0.2 * clamp(S - 0.5) + 0.25 * d.bdi + 0.3 * clamp(d.zar),
    zzz: (1 - d.bdi) * (1 - clamp(d.kouk * 0.6)),
    bublina: { r: d.bublina, prask: up >= 0 && up < 0.22 ? 1 - up / 0.22 : 0, praskR: d.praskR },
    /* listy se chvějí při chůzi a třepou ve větru */
    listy: LISTY.map((l) => (2.5 + 9 * d.trep) * Math.sin(t * l.w * (1 + 5 * d.trep) + l.fz) + 0.05 * d.kV * (l.s < 0.2 ? 1 : 0.5) * (l.strana * l.rel > 0 ? 1 : -1)),
    snek: { ...naPrutu(B, d.snek.s), schov: Math.round(d.snek.schov * 14) / 14, tyk: Math.round(Math.sin(t * 1.3) * 2) / 2 },
    svetlusky: d.svetlusky.map((m) => ({
      x: m.x, y: m.y, z: m.z, jas: zablik(m.faze), sc: 1 + clamp(m.z, -30, 30) * 0.008, smer: m.vx < 0 ? -1 : 1, nakl: 12 * Math.sin(t * 2.1 + m.fz), mav: Math.abs(Math.sin(t * 38 + m.fz)), sedi: m.sedi > 0 && m.r < 2.5, stopa: m.stopa,
    })),
    svetylka: [
      [...naTelo([38, 121], fig).map((q, i) => q + (i ? 4 * Math.sin(t * 0.9 + 1) : 3 * Math.sin(t * 0.7))), 1.6, (0.55 + 0.35 * Math.sin(t * 1.3)) * (1 - 0.7 * d.bdi)],
      [...naTelo([139, 135], fig).map((q, i) => q + (i ? 3 * Math.sin(t * 1.1 + 2.4) : 3.5 * Math.sin(t * 0.6 + 0.8))), 1.3, (0.5 + 0.35 * Math.sin(t * 1.7 + 2)) * (1 - 0.7 * d.bdi)],
    ],
    zaba: {
      x: z.x, y: z.y, natah: Math.sin(Math.PI * qz), rot: z.salto ? -360 * smooth(qz) : qz > 0 ? lerp(-34, 24, qz) * Math.sin(Math.PI * Math.min(1, qz * 1.25)) : 0,
      /* dvakrát nafoukne hrdlo */
      hrdlo: uk >= 0 && uk < 0.44 ? Math.abs(Math.sin((Math.PI * uk) / 0.22)) : 0, mrk: mrkani(t, [2.2, 6.1], 7.3),
    },
    stopy: d.stopy.map((p) => ({ x: p.x, y: p.y, zrc: p.zrc, op: clamp(Math.min(p.vek / 0.3, (p.x - 10) / 16)), rust: p.klicek && p.x < 52 ? p.vel * vyskoc((52 - p.x) / 9) : 0 })),
    prach: d.prach.map((p) => {
      const u = p.vek / 0.8;
      return { x: p.x, y: p.y, r: 1.5 + 4.2 * easeOut(u), op: 0.62 * Math.pow(1 - u, 1.3), seed: p.seed };
    }),
    jiskry: d.jiskry, dusicky: d.dusicky.filter((q) => q.vek >= 0), vanek: d.vanek.filter((v) => v.vek >= 0),
  };
};
const snimek = (st) => Math.floor(st.t * 30);
const pohyb = (st) => ({ x: st.fig.x, y: st.fig.y, r: st.fig.r, sx: st.fig.sx, sy: st.fig.sy, ox: FIG.x, oy: ZEM });
const jeTuNeco = (st) => (st.jiskry.length || st.dusicky.length || st.vanek.length || st.zar > 0.03 ? snimek(st) : -1);

export const lampion = {
  id: "lampion",
  viewBox: "0 0 180 180",
  defs,
  novaDynamika,
  krok,
  stav,
  /* měchýřek a listy šustí, když se plod rozhoupe nebo zafouká */
  sum: (st) => ({ mira: clamp(0.03 + 0.5 * st.sust), f: 2700, q: 0.6, typ: "bandpass", pan: pan(st.L[0]) }),
  klidne: { t: 4.6 },
  /** Rychlost chůze pro průvod: o kolik šířek kresby se má za sekundu posunout, když jde. Když zívá, klimbá nebo zakopne, jde jinak rychle: stav().posuv je okamžitá rychlost cesty v jednotkách plochy za sekundu. */
  rychlost: RYCHLOST / 180,
  vrstvy: [
    { id: "zem", kresli: vrstvaZem, klic: snimek },
    { id: "noha-za", kresli: vrstvaNoha(1), pohyb: pohybNohy(1) },
    { id: "vyhonek", kresli: vrstvaVyhonek, klic: snimek },
    { id: "snek", kresli: vrstvaSnek, klic: (st) => `${st.snek.schov},${st.snek.tyk}`, pohyb: pohybSneka },
    { id: "telo", kresli: vrstvaTelo, tezka: true, pohyb },
    { id: "svit", kresli: vrstvaSvit, klic: (st) => `${Math.round(st.Lt[0] / 2)},${Math.round(st.Lt[1] / 2)},${Math.round(clamp(st.S, 0, 1.5) * 24)}`, pohyb },
    { id: "tvar", kresli: vrstvaTvar, klic: (st) => `${st.oci},${st.usta},${Math.round(st.tvare * 20)},${Math.round(st.pohled[0] * 8)},${Math.round(st.pohled[1] * 8)},${f(st.mrk)},${Math.round(st.kouk * 12)}`, pohyb },
    { id: "noha-pred", kresli: vrstvaNoha(0), pohyb: pohybNohy(0) },
    { id: "zzz", kresli: vrstvaZzz, klic: (st) => (st.zzz > 0.03 || st.bublina.r > 0.2 || st.bublina.prask > 0 ? Math.floor(st.t * 20) : -1) },
    { id: "zare", kresli: vrstvaZare, pohyb: (st) => ({ x: st.L[0] - L0[0], y: st.L[1] - L0[1], sx: 1 + 0.2 * Math.max(0, st.S - 1), sy: 1 + 0.2 * Math.max(0, st.S - 1), ox: L0[0], oy: L0[1] }), pruhlednost: (st) => f(clamp(0.9 * st.S) * uKraje(st)) },
    { id: "svetlusky-za", kresli: vrstvaSvetlusky(false), klic: snimek },
    { id: "hozuki-zada", kresli: vrstvaHozukiZada, pohyb: pohybHozuki },
    { id: "hozuki-jadro", kresli: vrstvaHozukiJadro, pohyb: pohybHozuki, pruhlednost: (st) => f(clamp(0.1 + 0.9 * st.S)) },
    { id: "hozuki-papir", kresli: vrstvaHozukiPapir, tezka: true, pohyb: pohybHozuki },
    { id: "hozuki-svit", kresli: vrstvaHozukiSvit, tezka: true, pohyb: pohybHozuki, pruhlednost: (st) => f(clamp(0.08 + 0.86 * st.S)) },
    { id: "svetlusky-pred", kresli: vrstvaSvetlusky(true), klic: snimek },
    { id: "zaba", kresli: vrstvaZaba, klic: (st) => `${f1(st.zaba.x)},${f1(st.zaba.y)},${Math.round(st.zaba.rot)},${Math.round(st.zaba.hrdlo * 8)},${st.zaba.mrk > 0.5}` },
    { id: "jiskry", kresli: vrstvaJiskry, klic: jeTuNeco },
  ],
};
