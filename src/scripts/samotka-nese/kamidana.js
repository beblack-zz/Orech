/*
 * ═══════════════════════════════════════════════════════════════════
 * 1 — KAMIDANA
 * Kamidana (神棚) je doslova „polička pro kami“: domácí oltářík vysoko
 * na zdi, na kterém stojí malá svatyně miyagata a před ní obětiny. Šamotka
 * je polička celý život, tak se jí stala — nese svatyni, dvě vázy se
 * sakaki, lahvičky heiši na saké, rýži, sůl a dva svícny. Všechno kromě
 * dřeva a zlata je bílý porcelán: na kamidaně stojí výrobky z dílny.
 *
 * Svatyně je ve stylu šinmei z Ise: rovná střecha z měděného plechu,
 * na hřebeni válečky kacuogi a na koncích zkřížená prkna čigi. Ta jsou
 * na špičkách uříznutá vodorovně (učisogi) — tak se značí svatyně, kde
 * bydlí ženské kami. Za poličkou plují zlaté pásy mlhy sujari-gasumi jako
 * na malovaných zástěnách, takže kresba nepotřebuje pozadí.
 *
 * Pod Šamotkou visí shimenawa s papírky shide a uprostřed zvonec suzu na
 * barevném provaze. Provaz je řetízek bodů (Verlet): dá se do něj strčit
 * myší, chytit a zatahat, a zvonec zvoní podle toho, jak se houpe.
 * Myš je zároveň průvan — plamínky svíček, papírky i větvičky se od ní
 * odklánějí.
 *
 * Modlí se tu jako u každé svatyně: zazvonit, dvakrát se uklonit, dvakrát
 * tlesknout (kašiwade) a jednou se uklonit. Kliknutí mimo provaz je
 * tlesknutí. Po jednom se Šamotka jen podívá jedním okem, kdo to je; po
 * dvou rychle za sebou se kami probudí: dvířka se otevřou a uvnitř svítí
 * posvátný předmět, ve kterém kami bydlí — pro hrnčíře ta nejsvětější věc
 * na světě, žároměrka ohnutá přesně do správného úhlu. Kdo předtím
 * zazvonil, dostane navíc zlatý prach.
 * ═══════════════════════════════════════════════════════════════════
 */
import {
  f, rng, clamp, lerp, smooth, rad, mix, pt, cara, hladka, zaobleny, jazyk, jiskraD,
  samotkaDefs, samotkaTelo, samotkaTvar, vSamotce, naScenu, shide, provaz, filtrLinka, OBRYS_D,
} from "./zaklad.js";

export const V1 = (() => {
  const FIG = { x: 90, y: 104, s: 0.9 };
  const vSam = vSamotce(FIG);
  const naSc = naScenu(FIG);
  const TVAR = naSc([90, 98]);
  const DVERE = { x0: 80, x1: 100, y0: 57, y1: 75.6 };
  const STRED = [90, 66];

  /* ——— Zlatá mlha sujari-gasumi ——— */
  /*
    Pás mlhy jako na zástěnách školy Kanó: dlouhé zaoblené pruhy, které
    na sebe navazují schodovitě. Každý pás je skupina pruhů s jednou
    průhledností, takže se v překryvech nezdvojí.
  */
  const KASUMI = [
    [{ x1: 2, x2: 62, y: 30, h: 6.4 }, { x1: 14, x2: 46, y: 25.4, h: 6 }, { x1: 30, x2: 70, y: 34.6, h: 5.6 }],
    [{ x1: 118, x2: 178, y: 41, h: 6.2 }, { x1: 132, x2: 170, y: 46, h: 5.8 }],
    [{ x1: 2, x2: 48, y: 141, h: 6 }, { x1: 10, x2: 36, y: 136.4, h: 5.6 }],
    [{ x1: 112, x2: 177, y: 157, h: 6.4 }, { x1: 124, x2: 160, y: 152.2, h: 6 }, { x1: 140, x2: 176, y: 161.8, h: 5.4 }],
  ];
  const pruh = (p) => zaobleny(p.x1, p.y, p.x2 - p.x1, p.h, p.h / 2);
  const SUNAGO = (() => {
    const r = rng(808);
    const S = [];
    for (const pas of KASUMI) {
      for (const p of pas) {
        for (let i = 0; i < 14; i++) S.push([lerp(p.x1 + 2, p.x2 - 2, r()), p.y + 1 + r() * (p.h - 2), 0.22 + r() * 0.45, r() * 6.28, r() < 0.3]);
      }
      /* pár zrnek ulétlo kolem */
      const p = pas[0];
      for (let i = 0; i < 7; i++) S.push([lerp(p.x1, p.x2, r()), p.y + (r() < 0.5 ? -3 - r() * 5 : p.h + 2 + r() * 5), 0.18 + r() * 0.3, r() * 6.28, false]);
    }
    return S;
  })();
  const vrstvaKasumi = () =>
    KASUMI.map((pas) => {
      /* obrys jen po vnějším okraji: nejdřív tahy, přes ně výplně */
      const tahy = pas.map((p) => `<path d="${pruh(p)}" fill="none" stroke="#B4842A" stroke-width="1.1"/>`).join("");
      const vyplne = pas.map((p) => `<path d="${pruh(p)}" fill="url(#sn1-mlha)"/>`).join("");
      return `<g opacity="0.82">${tahy}${vyplne}</g><g opacity="0.32">${pas.map((p) => `<path d="${pruh(p)}" fill="url(#sn1-kirikane)"/>`).join("")}</g>`;
    }).join("");
  const vrstvaSunago = (st) =>
    `<g fill="#F6DB8E">${SUNAGO.map(([x, y, r, fz, ctverec]) => {
      const tr = 0.45 + 0.55 * Math.pow(Math.max(0, Math.sin(st.t * 1.3 + fz)), 6);
      return ctverec
        ? `<rect x="${f(x - r)}" y="${f(y - r)}" width="${f(r * 2)}" height="${f(r * 2)}" transform="rotate(${f(fz * 30)} ${f(x)} ${f(y)})" opacity="${f(tr)}"/>`
        : `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" opacity="${f(tr)}"/>`;
    }).join("")}</g>`;

  /* ——— Svatyně miyagata ——— */
  const DREVO = { svetle: "#F0DDB4", stred: "#E3C795", tmave: "#C9A46C", obrys: "#7A5A3A", stin: "#B48E5C" };
  const ZLATO = { svetle: "#F7DF92", stred: "#DDB04A", tmave: "#9A6E1E" };
  const vrstvaSvatyne = () => {
    let s = "";
    /* střecha: okap, plocha s drážkami plechu, hřeben */
    s += `<path d="M58.4 47.6 H121.6 L123 51.9 H57 Z" fill="#3E7A6A" stroke="#22423A" stroke-width="0.6" stroke-linejoin="round"/>`;
    s += `<path d="M57.6 51.3 H122.4" stroke="#A9D2C3" stroke-width="0.6" opacity="0.8"/>`;
    s += `<path d="M59 47.8 L67.6 34.8 H112.4 L121 47.8 Z" fill="url(#sn1-med)" stroke="#22423A" stroke-width="0.6" stroke-linejoin="round"/>`;
    s += `<g stroke="#2E5E52" stroke-width="0.35" opacity="0.7">${Array.from({ length: 15 }, (_, i) => {
      const k = (i + 1) / 16;
      return `<path d="M${f(lerp(59.6, 120.4, k))} 47.4 L${f(lerp(68, 112, k))} 35.4"/>`;
    }).join("")}</g>`;
    s += `<path d="M62 43.2 H118" stroke="#9CCAB9" stroke-width="0.4" opacity="0.5"/>`;
    s += `<rect x="64.4" y="31.6" width="51.2" height="3.6" rx="0.8" fill="#2F5F53" stroke="#1C3A33" stroke-width="0.5"/>`;
    s += `<path d="M65.6 32.3 H114.4" stroke="#8CC3B1" stroke-width="0.4" opacity="0.7"/>`;
    s += `<rect x="64.4" y="31.6" width="2.4" height="3.6" fill="url(#sn1-zlato)"/><rect x="113.2" y="31.6" width="2.4" height="3.6" fill="url(#sn1-zlato)"/>`;
    /* čigi: dvě prkna zkřížená nad koncem hřebene, špičky vodorovně (učisogi) */
    for (const x of [65.6, 114.4]) {
      for (const smer of [-1, 1]) {
        const dole = [x - smer * 1.6, 35.2], nahore = [x + smer * 4.4, 20.6];
        const d = Math.hypot(nahore[0] - dole[0], nahore[1] - dole[1]);
        const nx = -(nahore[1] - dole[1]) / d * 1.05, ny = (nahore[0] - dole[0]) / d * 1.05;
        const P = [[dole[0] + nx, dole[1] + ny], [nahore[0] + nx, nahore[1]], [nahore[0] - nx, nahore[1]], [dole[0] - nx, dole[1] - ny]];
        s += `<path d="${cara(P)} Z" fill="${DREVO.stred}" stroke="${DREVO.obrys}" stroke-width="0.5" stroke-linejoin="round"/>`;
        s += `<path d="M${pt([nahore[0] + nx * 0.9, nahore[1] + 1.4])} L${pt([nahore[0] - nx * 0.9, nahore[1] + 1.4])}" stroke="${ZLATO.stred}" stroke-width="1.3"/>`;
      }
    }
    /* kacuogi: válečky napříč hřebenem, z čela vidět jen jejich zlaté konce */
    for (const x of [77, 83.5, 90, 96.5, 103]) {
      s += `<circle cx="${x}" cy="30" r="2.35" fill="url(#sn1-kacuogi)" stroke="${ZLATO.tmave}" stroke-width="0.5"/>`;
      s += `<circle cx="${x}" cy="30" r="1.55" fill="none" stroke="${ZLATO.stred}" stroke-width="0.6"/>`;
    }
    /* nageši pod okapem */
    s += `<rect x="66" y="52" width="48" height="3.6" fill="${DREVO.tmave}" stroke="${DREVO.obrys}" stroke-width="0.5"/>`;
    s += `<path d="M66.4 52.6 H113.6" stroke="#2A3A34" stroke-width="0.9" opacity="0.35"/>`;
    /* stěny a sloupy */
    s += `<rect x="68" y="55.6" width="44" height="24" fill="${DREVO.svetle}" stroke="${DREVO.obrys}" stroke-width="0.5"/>`;
    s += `<g fill="${DREVO.stred}" stroke="${DREVO.obrys}" stroke-width="0.45">${[68, 77.6, 100, 109.6].map((x) => `<rect x="${x}" y="55.6" width="2.4" height="24"/>`).join("")}</g>`;
    s += `<g stroke="${DREVO.stin}" stroke-width="0.4" opacity="0.7">${[70.4, 102.4].map((x) => `<path d="M${x} 66.4 H${x + 7.2} M${x} 67.6 H${x + 7.2} M${f(x + 1.4)} 58 V65.6 M${f(x + 3.6)} 58 V65.6 M${f(x + 5.8)} 58 V65.6"/>`).join("")}</g>`;
    s += `<rect x="80" y="56.2" width="20" height="20" fill="#2A1A10" stroke="${DREVO.obrys}" stroke-width="0.5"/>`;
    /* práh */
    s += `<rect x="79.4" y="75.6" width="21.2" height="1.6" fill="url(#sn1-zlato)" stroke="${ZLATO.tmave}" stroke-width="0.3"/>`;
    /* podstavec, zábradlí a schůdky */
    s += `<rect x="62" y="79.4" width="56" height="6.6" rx="0.6" fill="${DREVO.stred}" stroke="${DREVO.obrys}" stroke-width="0.55"/>`;
    s += `<rect x="62.3" y="79.6" width="55.4" height="1.5" fill="${DREVO.svetle}"/>`;
    s += `<path d="M62.6 85.4 H117.4" stroke="${DREVO.obrys}" stroke-width="0.7" opacity="0.4"/>`;
    s += `<g fill="${DREVO.svetle}" stroke="${DREVO.obrys}" stroke-width="0.4">${[63.4, 74.4, 104.2, 115.2].map((x) => `<rect x="${x}" y="75.4" width="1.4" height="4"/>`).join("")}<rect x="63" y="75.4" width="12.8" height="0.95"/><rect x="103.8" y="75.4" width="12.8" height="0.95"/></g>`;
    s += `<path d="M63.4 77.6 H75.8 M104.2 77.6 H116.6" stroke="${DREVO.obrys}" stroke-width="0.45"/>`;
    for (const x of [64.1, 115.9]) s += `<path d="M${f(x - 1.1)} 75.4 Q${f(x - 1.3)} 73.8 ${x} 72.6 Q${f(x + 1.3)} 73.8 ${f(x + 1.1)} 75.4 Z" fill="url(#sn1-zlato)" stroke="${ZLATO.tmave}" stroke-width="0.35"/>`;
    s += `<rect x="83" y="79.4" width="14" height="6.6" fill="${DREVO.svetle}" stroke="${DREVO.obrys}" stroke-width="0.45"/>`;
    s += `<path d="M83.2 81.3 H96.8 M83.2 83.2 H96.8 M83.2 85.1 H96.8" stroke="${DREVO.stin}" stroke-width="0.5"/>`;
    return `<g filter="url(#sn1-linka)">${s}</g>`;
  };

  /* Dvířka: dvě křídla na pantech u sloupů, otvírají se ven k nám */
  const kridlo = (pant, smer, uhel) => {
    const th = rad(uhel);
    const sirka = 10 * Math.cos(th);
    const vys = 2.2 * Math.sin(th);
    const xv = pant + smer * sirka;
    const { y0, y1 } = DVERE;
    const lic = Math.cos(th) > 0;
    const P = [[pant, y0], [xv, y0 - vys], [xv, y1 + vys], [pant, y1]];
    let s = `<path d="${cara(P)} Z" fill="${lic ? DREVO.svetle : mix(DREVO.tmave, "#6A4A2A", 0.4)}" stroke="${DREVO.obrys}" stroke-width="0.5" stroke-linejoin="round"/>`;
    if (lic && Math.abs(sirka) > 1.2) {
      const X = (k) => f(pant + smer * sirka * k);
      s += `<path d="M${X(0.08)} ${f(59.4 - vys * 0.08)} L${X(0.92)} ${f(59.4 - vys * 0.92)} M${X(0.08)} ${f(72.4 + vys * 0.08)} L${X(0.92)} ${f(72.4 + vys * 0.92)}" stroke="${ZLATO.stred}" stroke-width="1.5"/>`;
      s += `<g fill="${ZLATO.svetle}">${[0.25, 0.5, 0.75].map((k) => `<circle cx="${X(k)}" cy="${f(59.4 - vys * k)}" r="0.45"/><circle cx="${X(k)}" cy="${f(72.4 + vys * k)}" r="0.45"/>`).join("")}</g>`;
      s += `<circle cx="${X(0.86)}" cy="66.3" r="${f(1.3 * Math.max(0.3, Math.cos(th)))}" fill="none" stroke="${ZLATO.stred}" stroke-width="0.6"/>`;
      s += `<path d="M${X(0.5)} 61.6 V70.8" stroke="${DREVO.stin}" stroke-width="0.35" opacity="0.6"/>`;
    }
    return s;
  };
  /** Posvátný předmět: zrcadlo a žároměrka ohnutá do správného úhlu na podložce z hlíny. */
  const goshintai = (sila) =>
    `<circle cx="90" cy="66" r="11" fill="url(#sn1-uvnitr)" opacity="${f(sila)}"/>` +
    `<circle cx="90" cy="64.4" r="4.4" fill="url(#sn1-zrcadlo)" stroke="${ZLATO.tmave}" stroke-width="0.4" opacity="${f(0.4 + 0.6 * sila)}"/>` +
    `<path d="M88.2 63 Q89.6 61.8 91.4 62.2" stroke="#FFFFFF" stroke-width="0.5" fill="none" opacity="${f(0.7 * sila)}"/>` +
    `<rect x="85.6" y="73.6" width="8.8" height="2" rx="0.9" fill="#E9DCC2" stroke="#8A6A4A" stroke-width="0.3"/>` +
    `<path d="M88.3 73.7 L89.4 68.6 Q90.2 66.2 92.6 67.4 Q93.6 68 93.4 69.4 Q92.6 68.8 91.4 69.2 Q90.6 69.6 90.4 71 L89.9 73.7 Z" fill="#FFF3D2" stroke="#B88A4A" stroke-width="0.3"/>` +
    `<circle cx="91" cy="70" r="5" fill="url(#sn1-svatost)" opacity="${f(sila)}"/>`;
  const vrstvaVnitrek = (st) => {
    const u = st.dvere;
    let s = "";
    if (u > 0.02) s += `<g clip-path="url(#sn1-dvere-orez)"><rect x="80" y="56.2" width="20" height="20" fill="url(#sn1-hloubka)"/>${goshintai(smooth(u * 1.2))}</g>`;
    const uhel = u * 152;
    s += kridlo(80, 1, uhel) + kridlo(100, -1, uhel);
    /* rolety misu nad dveřmi: brokátový lem a dva střapce agemaki */
    s += `<rect x="79.4" y="55.6" width="21.2" height="3.8" fill="url(#sn1-misu)" stroke="${DREVO.obrys}" stroke-width="0.35"/>`;
    s += `<rect x="79.4" y="55.6" width="21.2" height="1.1" fill="#5A3F86"/><g fill="${ZLATO.svetle}">${[81, 84, 87, 90, 93, 96, 99].map((x) => `<circle cx="${x}" cy="56.15" r="0.3"/>`).join("")}</g>`;
    return `<g filter="url(#sn1-linka)">${s}</g>`;
  };
  const vrstvaStrapce = (st) =>
    [81.6, 98.4]
      .map((x, i) => {
        const a = st.vitr * -22 + Math.sin(st.t * 1.6 + i * 2.1) * 3 + st.otres * Math.sin(st.t * 14 + i) * 9;
        return (
          `<g transform="rotate(${f(a)} ${x} 59.4)">` +
          `<path d="M${x} 59.4 V62.6" stroke="#9E3220" stroke-width="0.5"/>` +
          `<g fill="#C4432B" stroke="#7A1E12" stroke-width="0.25">${[[-1, 0], [1, 0], [0, -1], [0, 1]].map(([dx, dy]) => `<ellipse cx="${f(x + dx * 0.9)}" cy="${f(63.6 + dy * 0.9)}" rx="0.85" ry="0.85"/>`).join("")}</g>` +
          `<path d="M${f(x - 0.9)} 64.8 L${f(x - 1.6)} 69.4 Q${x} 70.2 ${f(x + 1.6)} 69.4 L${f(x + 0.9)} 64.8 Z" fill="#C4432B" stroke="#7A1E12" stroke-width="0.25"/>` +
          `<path d="M${f(x - 0.7)} 65 H${f(x + 0.7)}" stroke="${ZLATO.stred}" stroke-width="0.7"/>` +
          `</g>`
        );
      })
      .join("");

  /* ——— Sakaki ve vázách ——— */
  const LIST_D = (L, W) => `M0 0 C${f(L * 0.3)} ${f(-W * 0.95)} ${f(L * 0.78)} ${f(-W * 0.62)} ${f(L)} 0 C${f(L * 0.78)} ${f(W * 0.62)} ${f(L * 0.3)} ${f(W * 0.95)} 0 0 Z`;
  const vetvicka = (seed, smer) => {
    const r = rng(seed);
    const listy = [];
    for (let i = 0; i < 10; i++) {
      const k = 0.22 + (i / 9) * 0.78;
      const strana = i % 2 ? 1 : -1;
      listy.push({ k, uhel: strana * (48 + r() * 22) - smer * 8, L: 6.2 + r() * 2.2 - (i > 7 ? 1 : 0), W: 2.5 + r() * 0.7, fz: r() * 6.28, odst: r() * 0.8 });
    }
    listy.push({ k: 1, uhel: -smer * 6, L: 7.2, W: 2.7, fz: r() * 6.28, odst: 0.4 });
    return listy;
  };
  const VETVE = [
    { B: [53.6, 71.2], smer: 1, delka: 17, sklon: -8, listy: vetvicka(43, 1).slice(3) },
    { B: [126.4, 71.2], smer: -1, delka: 17, sklon: -8, listy: vetvicka(44, -1).slice(3) },
    { B: [53, 71.2], smer: -1, delka: 25, sklon: 16, listy: vetvicka(41, -1) },
    { B: [127, 71.2], smer: 1, delka: 25, sklon: 16, listy: vetvicka(42, 1) },
  ];
  const vrstvaSakaki = (st) =>
    VETVE.map((v, j) => {
      const kyv = st.vitr * 9 * -1 + Math.sin(st.t * 1.05 + j * 2.4) * 1.4 + st.otres * Math.sin(st.t * 11 + j) * 3;
      const a0 = rad(-90 + v.smer * v.sklon + kyv);
      /* stonek se mírně ohýbá ven */
      const S = [];
      for (let i = 0; i <= 6; i++) {
        const k = i / 6;
        const a = a0 + v.smer * rad(14) * k * k;
        const prev = S[i - 1] || v.B;
        S.push(i === 0 ? v.B : [prev[0] + Math.cos(a) * (v.delka / 6), prev[1] + Math.sin(a) * (v.delka / 6)]);
      }
      let s = `<path d="${hladka(S)}" stroke="#5A4A2E" stroke-width="0.9" fill="none" stroke-linecap="round"/>`;
      for (const l of v.listy) {
        const i = Math.min(5, Math.floor(l.k * 6));
        const kk = l.k * 6 - i;
        const P = [lerp(S[i][0], S[i + 1][0], kk), lerp(S[i][1], S[i + 1][1], kk)];
        const smerStonku = Math.atan2(S[i + 1][1] - S[i][1], S[i + 1][0] - S[i][0]);
        const tres = (2.5 + 7 * Math.abs(st.vitr)) * Math.sin(st.t * 6.5 + l.fz) + st.otres * 6 * Math.sin(st.t * 17 + l.fz);
        const a = (smerStonku * 180) / Math.PI + l.uhel + tres;
        s += `<g transform="translate(${pt(P)}) rotate(${f(a)})"><path d="${LIST_D(l.L, l.W)}" fill="url(#sn1-list)" stroke="#173622" stroke-width="0.3"/><path d="M0.6 0 L${f(l.L * 0.86)} 0" stroke="#7FAE6E" stroke-width="0.3" opacity="0.8"/><path d="M${f(l.L * 0.3)} ${f(-l.W * 0.5)} Q${f(l.L * 0.55)} ${f(-l.W * 0.62)} ${f(l.L * 0.8)} ${f(-l.W * 0.3)}" stroke="#A9D29A" stroke-width="0.25" fill="none" opacity="0.6"/></g>`;
      }
      /* malý papírek shide uvázaný na stonku hlavní větvičky */
      if (v.sklon > 0) {
        const Q = S[2];
        s += shide(Q[0] + v.smer * 0.6, Q[1] + 0.6, kyv * 1.5 + v.smer * 10, { meritko: 0.36 });
      }
      return s;
    }).join("");

  /* ——— Obětiny ——— */
  const vaza = (x) =>
    `<path d="M${f(x - 3.3)} 86 L${f(x - 3.1)} 84.6 Q${f(x - 2.7)} 84 ${f(x - 2.9)} 82.6 L${f(x - 3)} 74.4 Q${f(x - 3.1)} 72.6 ${f(x - 3.9)} 71.3 H${f(x + 3.9)} Q${f(x + 3.1)} 72.6 ${f(x + 3)} 74.4 L${f(x + 2.9)} 82.6 Q${f(x + 2.7)} 84 ${f(x + 3.1)} 84.6 L${f(x + 3.3)} 86 Z" fill="url(#sn1-porcelan)" stroke="#8A8E9A" stroke-width="0.45" stroke-linejoin="round"/>` +
    `<ellipse cx="${x}" cy="71.3" rx="3.9" ry="0.9" fill="#C9CDD6" stroke="#8A8E9A" stroke-width="0.35"/>` +
    `<path d="M${f(x - 1.9)} 74.6 V82" stroke="#FFFFFF" stroke-width="0.7" opacity="0.85" stroke-linecap="round"/>` +
    `<path d="M${f(x - 2.9)} 82.8 H${f(x + 2.9)}" stroke="#3E5A9C" stroke-width="0.4" opacity="0.6"/>`;
  const heishi = (x) =>
    `<path d="M${f(x - 2.3)} 86 Q${f(x - 4.2)} 82.4 ${f(x - 3.6)} 79.4 Q${f(x - 3)} 76.4 ${f(x - 1.2)} 74.2 L${f(x - 1.25)} 72.2 Q${f(x - 1.9)} 71.6 ${f(x - 1.7)} 71 H${f(x + 1.7)} Q${f(x + 1.9)} 71.6 ${f(x + 1.25)} 72.2 L${f(x + 1.2)} 74.2 Q${f(x + 3)} 76.4 ${f(x + 3.6)} 79.4 Q${f(x + 4.2)} 82.4 ${f(x + 2.3)} 86 Z" fill="url(#sn1-porcelan)" stroke="#8A8E9A" stroke-width="0.45" stroke-linejoin="round"/>` +
    `<path d="M${f(x - 2.4)} 77.6 Q${f(x - 2.9)} 80.6 ${f(x - 2)} 83.6" stroke="#FFFFFF" stroke-width="0.7" fill="none" opacity="0.85" stroke-linecap="round"/>` +
    /* kučisaši: zlatý vějířek z papíru zastrčený v hrdle */
    `<path d="M${x} 71.4 L${f(x - 4.6)} 68.4 A5.4 5.4 0 0 1 ${f(x + 4.6)} 68.4 Z" fill="url(#sn1-zlato)" stroke="${ZLATO.tmave}" stroke-width="0.35" stroke-linejoin="round"/>` +
    `<g stroke="${ZLATO.tmave}" stroke-width="0.25" opacity="0.7">${[-60, -30, 0, 30, 60].map((a) => {
      const u = rad(-90 + a * 0.62);
      return `<path d="M${x} 71.4 L${f(x + Math.cos(u) * 5.2)} ${f(71.4 + Math.sin(u) * 5.2)}"/>`;
    }).join("")}</g>` +
    `<path d="M${f(x - 4)} 67.6 A5 5 0 0 1 ${f(x + 4)} 67.6" stroke="#C4432B" stroke-width="0.6" fill="none"/>`;
  const svicen = (x) =>
    `<ellipse cx="${x}" cy="85.4" rx="2.6" ry="0.75" fill="url(#sn1-zlato)" stroke="${ZLATO.tmave}" stroke-width="0.35"/>` +
    `<path d="M${f(x - 0.6)} 85 L${f(x - 0.5)} 78.6 H${f(x + 0.5)} L${f(x + 0.6)} 85 Z" fill="url(#sn1-zlato)" stroke="${ZLATO.tmave}" stroke-width="0.3"/>` +
    `<circle cx="${x}" cy="81.8" r="0.9" fill="${ZLATO.stred}" stroke="${ZLATO.tmave}" stroke-width="0.3"/>` +
    `<ellipse cx="${x}" cy="78.4" rx="2.2" ry="0.6" fill="url(#sn1-zlato)" stroke="${ZLATO.tmave}" stroke-width="0.3"/>` +
    `<rect x="${f(x - 1.1)}" y="72" width="2.2" height="6.3" rx="0.5" fill="#FBF6EA" stroke="#B9AE98" stroke-width="0.3"/>` +
    `<path d="M${f(x - 1.05)} 72.6 Q${f(x - 1.5)} 74 ${f(x - 1.05)} 75.6" stroke="#FBF6EA" stroke-width="0.8" fill="none"/>` +
    `<path d="M${x} 72 V71" stroke="#2A2220" stroke-width="0.35"/>`;
  const vrstvaObetiny = () =>
    vaza(53) + vaza(127) + heishi(42.4) + heishi(137.6) + svicen(34) + svicen(146) +
    /* rýže a sůl morijio na miskách kawarake */
    `<path d="M68.8 84.4 H76.2 L75.4 86 H69.6 Z" fill="#D7B48A" stroke="#8A6A4A" stroke-width="0.35" stroke-linejoin="round"/>` +
    `<path d="M69.6 84.5 Q72.5 80.6 75.4 84.5 Z" fill="#FBF8F0" stroke="#B9AE98" stroke-width="0.3"/>` +
    `<g fill="#D9D2C2">${[[71.2, 83.4], [72.6, 82.4], [73.8, 83.6], [72.4, 83.9]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="0.4" ry="0.22"/>`).join("")}</g>` +
    `<path d="M103.8 84.4 H111.2 L110.4 86 H104.6 Z" fill="#D7B48A" stroke="#8A6A4A" stroke-width="0.35" stroke-linejoin="round"/>` +
    `<path d="M105 84.5 L107.5 79 L110 84.5 Z" fill="#FFFFFF" stroke="#B9AE98" stroke-width="0.3" stroke-linejoin="round"/>` +
    `<path d="M107.5 79.4 L106.2 84.2" stroke="#E4E0D8" stroke-width="0.5"/>`;

  /* Plamínky svíček, uhýbají průvanu */
  const vrstvaPlaminky = (st) => {
    let s = "";
    [[34, 0], [146, 1]].forEach(([x, i]) => {
      const k = 1 + 0.12 * Math.sin(st.t * (9 + i) + i * 2) + 0.06 * Math.sin(st.t * 23 + i) + 0.35 * st.probuzeni;
      const vitr = clamp(-st.vitr * 1.6 + 0.05 * Math.sin(st.t * 2.2 + i), -1.4, 1.4);
      s += `<circle cx="${x}" cy="67" r="${f(10 + 4 * st.probuzeni)}" fill="url(#sn1-svetlo)" opacity="${f(0.75 + 0.1 * Math.sin(st.t * 9 + i))}"/>`;
      for (const [barva, kk, W] of [["#F29A3B", 1, 3.4], ["#FBD36A", 0.72, 2.4], ["#FFF6D8", 0.4, 1.4]]) {
        const { d } = jazyk({ B: [x, 71.2], th0: -Math.PI / 2, L: 6.6 * k * kk, W, c: i ? -1 : 1, stoc: 0.8, stoupani: 0.95, vitr, t: st.t, w: 7 + i, fz: i * 1.3, vlna: 0.3, N: 10 });
        s += `<path d="${d}" fill="${barva}"/>`;
      }
      s += `<ellipse cx="${x}" cy="70.9" rx="0.8" ry="0.6" fill="#6A8CFF" opacity="0.45"/>`;
    });
    return s;
  };

  /* ——— Shimenawa pod poličkou ——— */
  const LANO_Y = 121.2;
  const UVAZY = [33, 90, 147];
  const PRUVES = 5.6;
  const yLana = (x) => {
    const [a, b] = x < 90 ? [UVAZY[0], UVAZY[1]] : [UVAZY[1], UVAZY[2]];
    const k = (x - a) / (b - a);
    return LANO_Y + PRUVES * 4 * k * (1 - k);
  };
  const SHIDE_X = [46, 72, 108, 134];
  const TARE_X = [61.5, 118.5];
  const vrstvaShimenawa = (st) => {
    let s = "";
    const lano = `M${UVAZY[0]} ${LANO_Y} Q61.5 ${f(LANO_Y + PRUVES * 2)} 90 ${LANO_Y} Q118.5 ${f(LANO_Y + PRUVES * 2)} 147 ${LANO_Y}`;
    /* volné konce za uzly */
    s += provaz(`M${UVAZY[0]} ${LANO_Y} Q29.4 ${f(LANO_Y + 1)} 29 ${f(LANO_Y + 5.4)}`, { sirka: 2.6 });
    s += provaz(`M${UVAZY[2]} ${LANO_Y} Q150.6 ${f(LANO_Y + 1)} 151 ${f(LANO_Y + 5.4)}`, { sirka: 2.6 });
    s += provaz(lano, { sirka: 3.6 });
    s += `<g fill="#C9B186">${UVAZY.map((x) => `<ellipse cx="${x}" cy="${LANO_Y}" rx="2.2" ry="2.6"/>`).join("")}</g>`;
    /* tare: svazky slámy ve středu průvěsů */
    for (const [i, x] of TARE_X.entries()) {
      const y = yLana(x) + 1.4;
      const a = st.vitr * -12 + Math.sin(st.t * 1.3 + i * 1.7) * 2.5 + st.otres * 6 * Math.sin(st.t * 12 + i);
      s += `<g transform="rotate(${f(a)} ${x} ${f(y)})"><g stroke="#C9A86A" stroke-width="0.55" stroke-linecap="round">${[-1.6, -0.8, 0, 0.8, 1.6].map((o) => `<path d="M${f(x + o * 0.5)} ${f(y)} L${f(x + o)} ${f(y + 9.4 - Math.abs(o) * 0.8)}"/>`).join("")}</g><rect x="${f(x - 1.3)}" y="${f(y + 1.1)}" width="2.6" height="1.1" fill="#9E7A44"/></g>`;
    }
    SHIDE_X.forEach((x, i) => {
      const y = yLana(x) + 0.8;
      const a = st.vitr * -24 + Math.sin(st.t * 1.5 + i * 1.9) * 4 + st.otres * 14 * Math.sin(st.t * 13 + i * 2);
      s += shide(x, y, a, { meritko: 0.72 });
    });
    return s;
  };

  /* ——— Zvonec suzu na provazu suzu-no-o (Verlet) ——— */
  const UCHYT = [90, 121.8];
  const N = 11;
  const DELKY = [8.4, ...Array(N - 1).fill(3.2)];
  const R_ZVON = 5.1;
  const novyProvaz = () => {
    const P = [];
    let y = UCHYT[1];
    for (let i = 0; i <= N; i++) {
      if (i > 0) y += DELKY[i - 1];
      P.push({ x: UCHYT[0], y, px: UCHYT[0], py: y });
    }
    return P;
  };
  const vrstvaZvonec = (st) => {
    const P = st.provaz;
    const z = P[1];
    const a = Math.atan2(z.x - P[0].x, z.y - P[0].y);
    const uhel = (-a * 180) / Math.PI;
    /* šňůrka ke zvonci */
    let s = `<path d="M${pt([P[0].x, P[0].y])} L${pt([z.x - Math.sin(a) * (R_ZVON + 0.6), z.y - Math.cos(a) * (R_ZVON + 0.6)])}" stroke="#7A1E12" stroke-width="0.9"/>`;
    /* provaz: od spodku zvonce přes body řetízku */
    const zacatek = [z.x + Math.sin(a) * (R_ZVON - 0.6), z.y + Math.cos(a) * (R_ZVON - 0.6)];
    const B = [zacatek, ...P.slice(2).map((p) => [p.x, p.y])];
    const d = hladka(B);
    s += `<path d="${d}" stroke="#5E1A14" stroke-width="4.2" stroke-linecap="round" fill="none"/>`;
    s += `<path d="${d}" stroke="#C4432B" stroke-width="3.2" stroke-linecap="round" fill="none"/>`;
    s += `<path d="${d}" stroke="#F4EEE6" stroke-width="3.2" stroke-dasharray="1.2 3.6" fill="none"/>`;
    s += `<path d="${d}" stroke="#5A3F86" stroke-width="3.2" stroke-dasharray="1.2 3.6" stroke-dashoffset="2.4" fill="none"/>`;
    s += `<path d="${d}" stroke="#FFFFFF" stroke-width="0.5" opacity="0.35" fill="none" transform="translate(-0.8 0)"/>`;
    /* střapec na konci */
    const K = P[N], K1 = P[N - 1];
    const ak = Math.atan2(K.x - K1.x, K.y - K1.y);
    s += `<g transform="translate(${pt([K.x, K.y])}) rotate(${f((-ak * 180) / Math.PI)})"><path d="M-1.8 0 L-3.2 8.6 Q0 10 3.2 8.6 L1.8 0 Z" fill="#C4432B" stroke="#5E1A14" stroke-width="0.4"/><g stroke="#8E2A1C" stroke-width="0.3">${[-1.6, -0.5, 0.6, 1.7].map((o) => `<path d="M${f(o * 0.6)} 2 L${f(o * 1.4)} 8.8"/>`).join("")}</g><rect x="-2.3" y="-0.6" width="4.6" height="2" rx="0.6" fill="url(#sn1-zlato)" stroke="#9A6E1E" stroke-width="0.3"/></g>`;
    /* zvonec: zlatá koule, štěrbina a dvě dírky */
    s += `<g transform="translate(${pt([z.x, z.y])}) rotate(${f(uhel)})">` +
      `<path d="M-1.5 ${f(-R_ZVON - 1.6)} A1.5 1.5 0 1 1 1.5 ${f(-R_ZVON - 1.6)}" stroke="#9A6E1E" stroke-width="0.9" fill="none"/>` +
      `<circle r="${R_ZVON}" fill="url(#sn1-zvon)" stroke="#7A5216" stroke-width="0.5"/>` +
      `<path d="M${f(-R_ZVON + 0.2)} -0.4 Q0 1.2 ${f(R_ZVON - 0.2)} -0.4 M${f(-R_ZVON + 0.4)} -1.6 Q0 -0.1 ${f(R_ZVON - 0.4)} -1.6" stroke="#9A6E1E" stroke-width="0.4" fill="none" opacity="0.8"/>` +
      `<path d="M-3.1 2.9 Q0 3.9 3.1 2.9" stroke="#3A2410" stroke-width="1" stroke-linecap="round" fill="none"/>` +
      `<circle cx="-3.4" cy="2.7" r="0.55" fill="#3A2410"/><circle cx="3.4" cy="2.7" r="0.55" fill="#3A2410"/>` +
      `<ellipse cx="-1.8" cy="-2.6" rx="1.6" ry="0.9" fill="#FFF6D0" opacity="${f(0.55 + 0.4 * st.zvoni)}" transform="rotate(-25 -1.8 -2.6)"/>` +
      `</g>`;
    /* zvonění: tři krátké čárky jako v komiksu */
    if (st.zvoni > 0.05) {
      s += `<g stroke="#C9993A" stroke-width="0.7" stroke-linecap="round" fill="none" opacity="${f(st.zvoni)}">` +
        [-1, 1].map((sm) => `<path d="M${f(z.x + sm * 7.4)} ${f(z.y - 3)} q${sm * 2} 3 0 6"/><path d="M${f(z.x + sm * 9.8)} ${f(z.y - 4.4)} q${sm * 2.8} 4.4 0 8.8"/>`).join("") +
        `</g>`;
    }
    return s;
  };

  /* ——— Světlo kami: záře, paprsky a zlatý prach ——— */
  const vrstvaPaprsky = (st) => {
    if (st.probuzeni < 0.01) return "";
    let s = "";
    const n = 28;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + st.t * 0.06;
      const L = (i % 2 ? 46 : 72) * (0.75 + 0.25 * st.probuzeni) * (1 + 0.06 * Math.sin(st.t * 1.7 + i));
      const w = rad(i % 2 ? 1.6 : 2.6);
      s += `<path d="M${STRED[0]} ${STRED[1]} L${pt([STRED[0] + Math.cos(a - w) * L, STRED[1] + Math.sin(a - w) * L])} L${pt([STRED[0] + Math.cos(a + w) * L, STRED[1] + Math.sin(a + w) * L])} Z"/>`;
    }
    return `<g fill="url(#sn1-paprsek)" opacity="${f(0.95 * st.probuzeni)}">${s}</g>`;
  };
  const vrstvaEfekty = (st) => {
    let s = "";
    for (const v of st.vlny) {
      const u = clamp(v.u / 0.6);
      s += `<circle cx="${f(v.x)}" cy="${f(v.y)}" r="${f(2 + u * 13)}" fill="none" stroke="#E9C46E" stroke-width="${f(1.4 * (1 - u))}" opacity="${f(1 - u)}"/>`;
      s += `<circle cx="${f(v.x)}" cy="${f(v.y)}" r="${f(1 + u * 7)}" fill="none" stroke="#FFF6D8" stroke-width="${f(0.8 * (1 - u))}" opacity="${f(0.8 * (1 - u))}"/>`;
    }
    for (const m of st.prach) {
      const u = m.vek / m.zivot;
      const op = clamp(Math.min(u / 0.1, (1 - u) / 0.45)) * (0.6 + 0.4 * Math.sin(st.t * 9 + m.fz));
      s += `<circle cx="${f(m.x)}" cy="${f(m.y)}" r="${f(m.r * 2.4)}" fill="url(#sn1-svetlo)" opacity="${f(op)}"/><path d="${jiskraD(m.r * (1 - u * 0.3))}" transform="translate(${pt([m.x, m.y])}) rotate(${f(m.rot + u * 120)})" fill="${u < 0.3 ? "#FFF6D8" : "#E9AE3A"}" stroke="#B8801E" stroke-width="0.15" opacity="${f(op)}"/>`;
    }
    if (st.dvere > 0.05) s += `<ellipse cx="90" cy="66" rx="${f(8 + 3 * st.dvere)}" ry="${f(9 + 3 * st.dvere)}" fill="url(#sn1-dvere-svit)" opacity="${f(st.dvere * 0.8)}"/>`;
    return s;
  };

  const vrstvaTvar = (st) => vSam(samotkaTvar("sn1", { oci: st.oci, usta: st.usta, tvare: st.tvare, pohled: st.pohledOka }));

  const defs = () =>
    samotkaDefs("sn1") +
    filtrLinka("sn1-linka", { posun: 1.1, seed: 6 }) +
    `<linearGradient id="sn1-zlato" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F9E6A6"/><stop offset="0.5" stop-color="#E6C064"/><stop offset="1" stop-color="#C9993A"/></linearGradient>` +
    `<linearGradient id="sn1-mlha" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6DE96"/><stop offset="0.35" stop-color="#FBEBB8"/><stop offset="0.7" stop-color="#E9C46E"/><stop offset="1" stop-color="#D4A848"/></linearGradient>` +
    `<pattern id="sn1-kirikane" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><path d="M3 1 V5 M1 3 H5" stroke="#FFF4CC" stroke-width="0.3"/><circle cx="0" cy="0" r="0.5" fill="#FFF4CC"/></pattern>` +
    `<linearGradient id="sn1-med" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8CC1AF"/><stop offset="0.45" stop-color="#5E9E8A"/><stop offset="1" stop-color="#3F7C6B"/></linearGradient>` +
    `<radialGradient id="sn1-kacuogi" cx="0.4" cy="0.35" r="0.7"><stop offset="0" stop-color="#FBE7A6"/><stop offset="0.6" stop-color="#E0B14A"/><stop offset="1" stop-color="#A87A22"/></radialGradient>` +
    `<linearGradient id="sn1-misu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E9D7A8"/><stop offset="1" stop-color="#CDB27A"/></linearGradient>` +
    `<linearGradient id="sn1-porcelan" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFFFFF"/><stop offset="0.55" stop-color="#F1F2F5"/><stop offset="1" stop-color="#C9CED9"/></linearGradient>` +
    `<linearGradient id="sn1-list" x1="0" y1="-1" x2="0" y2="1" gradientUnits="objectBoundingBox"><stop offset="0" stop-color="#3C7046"/><stop offset="1" stop-color="#1F4A30"/></linearGradient>` +
    `<radialGradient id="sn1-svetlo"><stop offset="0" stop-color="#FFD98A" stop-opacity="0.55"/><stop offset="0.5" stop-color="#FFB060" stop-opacity="0.16"/><stop offset="1" stop-color="#FFB060" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="sn1-zvon" cx="0.36" cy="0.32" r="0.75"><stop offset="0" stop-color="#FFF2B8"/><stop offset="0.45" stop-color="#E8BE58"/><stop offset="0.85" stop-color="#B98A2A"/><stop offset="1" stop-color="#8A6218"/></radialGradient>` +
    `<radialGradient id="sn1-zare" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#FFF4D6" stop-opacity="0.85"/><stop offset="0.45" stop-color="#FBE3A8" stop-opacity="0.32"/><stop offset="1" stop-color="#FBE3A8" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="sn1-paprsek" gradientUnits="userSpaceOnUse" cx="${STRED[0]}" cy="${STRED[1]}" r="72"><stop offset="0.12" stop-color="#FFE7A0" stop-opacity="0.95"/><stop offset="0.6" stop-color="#F3C04E" stop-opacity="0.45"/><stop offset="1" stop-color="#F3C04E" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="sn1-hloubka" cx="0.5" cy="0.6" r="0.75"><stop offset="0" stop-color="#7A4A1E"/><stop offset="0.6" stop-color="#3A2010"/><stop offset="1" stop-color="#1E120A"/></radialGradient>` +
    `<radialGradient id="sn1-uvnitr"><stop offset="0" stop-color="#FFE7A0" stop-opacity="0.95"/><stop offset="0.5" stop-color="#E9A84A" stop-opacity="0.4"/><stop offset="1" stop-color="#E9A84A" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="sn1-zrcadlo" cx="0.4" cy="0.38" r="0.7"><stop offset="0" stop-color="#FFFBEA"/><stop offset="0.5" stop-color="#E9D08A"/><stop offset="1" stop-color="#A8822E"/></radialGradient>` +
    `<radialGradient id="sn1-svatost"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.7"/><stop offset="1" stop-color="#FFF4C8" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="sn1-dvere-svit"><stop offset="0" stop-color="#FFF6D8" stop-opacity="0.9"/><stop offset="0.5" stop-color="#FFD98A" stop-opacity="0.35"/><stop offset="1" stop-color="#FFD98A" stop-opacity="0"/></radialGradient>` +
    `<clipPath id="sn1-dvere-orez"><rect x="80" y="56.2" width="20" height="20"/></clipPath>` +
    `<linearGradient id="sn1-ozareni" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE7A0" stop-opacity="0.8"/><stop offset="0.45" stop-color="#FFD27A" stop-opacity="0.3"/><stop offset="1" stop-color="#FFD27A" stop-opacity="0"/></linearGradient>`;

  /* ——— Simulace ——— */
  const novaDynamika = () => ({
    vitr: 0, mysPred: null, provaz: novyProvaz(), uchop: -1, zvoniSila: 0, uhelPred: 0, rychlostPred: 0, smerPred: 0,
    tlesky: [], vlny: [], prach: [], probuzeni: -100, plne: false, zvoneno: -100, pokuk: -100, pokukKam: [0, 0],
    blizkoOd: null, otres: 0, nahoda: rng(2718), zvuk: [], pohled: [0, 0], cekaPoTlesku: -100,
  });
  const delkaProbuzeni = 8.2;
  const stavProbuzeni = (u) => {
    if (u < 0 || u > delkaProbuzeni) return { dvere: 0, sila: 0 };
    const dvere = smooth((u - 0.35) / 1.5) * (1 - smooth((u - 6.4) / 1.6));
    const sila = smooth((u - 0.2) / 1.2) * (1 - smooth((u - 6.2) / 2));
    return { dvere, sila };
  };
  /** Nejbližší bod úsečky AB k bodu P. */
  const kUsecce = (P, A, B) => {
    const vx = B[0] - A[0], vy = B[1] - A[1];
    const L2 = vx * vx + vy * vy;
    const k = L2 ? clamp(((P[0] - A[0]) * vx + (P[1] - A[1]) * vy) / L2) : 0;
    return [A[0] + vx * k, A[1] + vy * k];
  };
  const krokProvaz = (dyn, h, vstup, mysV, mysOd) => {
    const P = dyn.provaz;
    const g = 170;
    for (let i = 1; i <= N; i++) {
      const p = P[i];
      const vx = (p.x - p.px) * 0.982, vy = (p.y - p.py) * 0.982;
      p.px = p.x;
      p.py = p.y;
      p.x += vx + dyn.vitr * -18 * h * h * (i / N);
      p.y += vy + g * h * h;
    }
    /* uchopený bod jde za myší, ostatní ho následují */
    if (dyn.uchop > 0 && vstup.drzi) {
      const p = P[dyn.uchop];
      const cx = clamp(vstup.drzi.x, 20, 160), cy = clamp(vstup.drzi.y, UCHYT[1] + 4, 178);
      p.x += (cx - p.x) * 0.5;
      p.y += (cy - p.y) * 0.5;
    } else if (vstup.mys && mysV) {
      /*
        Myš do provazu strčí, když přes něj přejede. Srážka se počítá s celou
        dráhou myši od minulého snímku — rychlé máchnutí by jinak provaz
        přeskočilo.
      */
      const M = [vstup.mys.x, vstup.mys.y];
      for (let i = 1; i <= N; i++) {
        const p = P[i];
        const Q = kUsecce([p.x, p.y], mysOd || M, M);
        const dx = p.x - Q[0], dy = p.y - Q[1];
        const d = Math.hypot(dx, dy);
        /* zvonec je těžký, do něj se strčí míň než do provazu */
        const tezky = i === 1 ? 0.35 : 1;
        const dosah = i === 1 ? R_ZVON + 0.5 : 4.2;
        if (d < dosah) {
          const v = Math.hypot(mysV[0], mysV[1]) || 1;
          const k = Math.min(1, 420 / v) * tezky;
          const tlak = (dosah - d) / dosah;
          p.x += (mysV[0] / v) * tlak * 0.5 * tezky;
          p.y += (mysV[1] / v) * tlak * 0.2 * tezky;
          p.px -= mysV[0] * k * h * 0.075 * tlak;
          p.py -= mysV[1] * k * h * 0.03 * tlak;
        }
      }
    }
    for (let it = 0; it < 14; it++) {
      P[0].x = UCHYT[0];
      P[0].y = UCHYT[1];
      for (let i = 0; i < N; i++) {
        const a = P[i], b = P[i + 1];
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.0001;
        const rozdil = (d - DELKY[i]) / d;
        /* úchyt se nehne, zvonec váží víc než kousek provazu */
        const wa = i === 0 ? 0 : i === 1 ? 0.22 : 0.5;
        const wb = i === 0 ? 1 : 1 - wa;
        a.x += dx * rozdil * wa;
        a.y += dy * rozdil * wa;
        b.x -= dx * rozdil * wb;
        b.y -= dy * rozdil * wb;
      }
      /* provaz je tlustý: ohybová vazba přes ob-článek ho nenechá zmačkat */
      for (let i = 2; i < N - 1; i++) {
        const a = P[i], b = P[i + 2];
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.0001;
        const klid = DELKY[i] * 1.9;
        if (d < klid) {
          const rozdil = ((d - klid) / d) * 0.25;
          a.x += dx * rozdil;
          a.y += dy * rozdil;
          b.x -= dx * rozdil;
          b.y -= dy * rozdil;
        }
      }
      if (dyn.uchop > 0 && vstup.drzi) {
        const p = P[dyn.uchop];
        p.x += (clamp(vstup.drzi.x, 20, 160) - p.x) * 0.2;
        p.y += (clamp(vstup.drzi.y, UCHYT[1] + 4, 178) - p.y) * 0.2;
      }
    }
  };
  const krok = (dyn, t, dt, vstup) => {
    const R = dyn.nahoda;
    /* průvan z pohybu myši */
    let mysV = null;
    const mysOd = vstup.mys && dyn.mysPred ? [dyn.mysPred.x, dyn.mysPred.y] : null;
    if (vstup.mys && dyn.mysPred) mysV = [(vstup.mys.x - dyn.mysPred.x) / Math.max(dt, 1 / 120), (vstup.mys.y - dyn.mysPred.y) / Math.max(dt, 1 / 120)];
    dyn.mysPred = vstup.mys ? { ...vstup.mys } : null;
    const cilVitr = (mysV ? clamp(mysV[0] / 260, -1, 1) * clamp(1.4 - Math.hypot(vstup.mys.x - 90, vstup.mys.y - 80) / 120, 0.2, 1) : 0) + 0.06 * Math.sin(t * 0.5);
    dyn.vitr += (cilVitr - dyn.vitr) * (1 - Math.exp(-dt / (Math.abs(cilVitr) > Math.abs(dyn.vitr) ? 0.12 : 0.6)));
    dyn.otres *= Math.exp(-dt / 0.35);

    /* kliknutí: do provazu se chytí, jinde se tleská */
    if (vstup.kliky && vstup.kliky.length) {
      for (const k of vstup.kliky) {
        let nejbl = -1, dmin = 7.5;
        for (let i = 1; i <= N; i++) {
          const p = dyn.provaz[i];
          const d = Math.hypot(p.x - k.x, p.y - k.y);
          if (d < dmin) {
            dmin = d;
            nejbl = i;
          }
        }
        if (nejbl > 0) {
          dyn.uchop = vstup.drzi ? nejbl : -1;
          /* i krátké ťuknutí do provazu ho rozhoupe */
          const p = dyn.provaz[nejbl];
          p.px = p.x - (R() < 0.5 ? -1 : 1) * 0.7;
          p.py = p.y - 0.5;
        } else {
          dyn.zvuk.push({ druh: "tlesk", sila: 1, pan: clamp((k.x - 90) / 90, -1, 1) });
          dyn.vlny.push({ x: k.x, y: k.y, t });
          dyn.tlesky.push(t);
          dyn.otres = Math.min(1, dyn.otres + 0.5);
          dyn.tlesky = dyn.tlesky.filter((c) => t - c < 1.3);
          const u = t - dyn.probuzeni;
          if (dyn.tlesky.length >= 2 && (u < 0 || u > delkaProbuzeni - 0.5)) {
            dyn.probuzeni = t;
            dyn.plne = t - dyn.zvoneno < 14;
            dyn.tlesky = [];
            dyn.zvuk.push({ druh: "probuzeni", sila: 1, plne: dyn.plne, za: 0.12 });
            dyn.zvuk.push({ druh: "dvere", za: 0.45 });
          } else if (dyn.tlesky.length === 1) {
            dyn.pokuk = t;
            dyn.pokukKam = [k.x, k.y];
          }
        }
      }
      vstup.kliky.length = 0;
    }
    if (!vstup.drzi) dyn.uchop = -1;

    /* provaz po menších krocích, ať je stabilní */
    const kroku = Math.max(1, Math.ceil(dt / (1 / 120)));
    for (let i = 0; i < kroku; i++) krokProvaz(dyn, dt / kroku, vstup, mysV, i === 0 ? mysOd : null);

    /* zvonění podle houpání zvonce: na krajích kyvu a při trhnutí */
    const P = dyn.provaz;
    const uhel = Math.atan2(P[1].x - P[0].x, P[1].y - P[0].y);
    const om = (uhel - dyn.uhelPred) / Math.max(dt, 1e-3);
    dyn.uhelPred = uhel;
    const rychlost = Math.hypot(P[1].x - P[1].px, P[1].y - P[1].py) / Math.max(dt, 1e-3) / kroku;
    const smer = Math.sign(om);
    if (smer !== 0 && smer !== dyn.smerPred && Math.abs(uhel) > rad(3.5)) {
      const sila = clamp(Math.abs(uhel) / rad(30));
      dyn.zvuk.push({ druh: "suzu", sila: 0.35 + 0.65 * sila, pan: clamp(uhel * 2, -0.8, 0.8) });
      dyn.zvoniSila = Math.max(dyn.zvoniSila, 0.4 + 0.6 * sila);
      dyn.zvoneno = t;
    }
    if (smer !== 0) dyn.smerPred = smer;
    if (rychlost > 26 && R() < dt * 5) {
      dyn.zvuk.push({ druh: "suzu", sila: clamp(rychlost / 90, 0.25, 0.9), pan: clamp(uhel * 2, -0.8, 0.8) });
      dyn.zvoniSila = Math.max(dyn.zvoniSila, 0.6);
      dyn.zvoneno = t;
    }
    dyn.zvoniSila *= Math.exp(-dt / 0.35);

    /* zlatý prach z otevřených dvířek */
    const pr = stavProbuzeni(t - dyn.probuzeni);
    if (pr.dvere > 0.3) {
      const kolik = dt * (dyn.plne ? 26 : 9) * pr.dvere;
      dyn.akum = (dyn.akum || 0) + kolik;
      while (dyn.akum >= 1) {
        dyn.akum -= 1;
        const a = rad(-90 + (R() - 0.5) * 150);
        const v = 6 + R() * (dyn.plne ? 22 : 12);
        dyn.prach.push({ x: 90 + (R() - 0.5) * 10, y: 66 + (R() - 0.5) * 10, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 4, vek: 0, zivot: 1.6 + R() * 1.8, r: 0.6 + R() * (dyn.plne ? 1.4 : 0.8), rot: R() * 90, fz: R() * 6.28 });
      }
    }
    for (const m of dyn.prach) {
      m.vek += dt;
      m.x += m.vx * dt + Math.sin(m.vek * 3 + m.fz) * 3 * dt;
      m.y += m.vy * dt;
      m.vx *= 1 - dt * 0.8;
      m.vy = m.vy * (1 - dt * 0.8) - 2 * dt;
    }
    dyn.prach = dyn.prach.filter((m) => m.vek < m.zivot);
    dyn.vlny = dyn.vlny.filter((v) => t - v.t < 0.6);

    /* Šamotka pokukuje: na myš, když se nad ní chvíli drží */
    const blizko = vstup.mys && Math.hypot(vstup.mys.x - TVAR[0], vstup.mys.y - TVAR[1]) < 34;
    if (blizko && dyn.blizkoOd == null) dyn.blizkoOd = t;
    if (!blizko) dyn.blizkoOd = null;
    if (dyn.blizkoOd != null && t - dyn.blizkoOd > 1.4 && t - dyn.pokuk > 4.5) {
      dyn.pokuk = t;
      dyn.blizkoOd = t + 3;
    }
    const kam = t - dyn.pokuk < 1.6 ? (vstup.mys && blizko ? [vstup.mys.x, vstup.mys.y] : dyn.pokukKam) : null;
    let cil = [0, 0];
    if (kam) cil = [clamp((kam[0] - TVAR[0]) / 30, -1, 1) * 1.7, clamp((kam[1] - TVAR[1]) / 30, -1, 1) * 1.3];
    dyn.pohled = dyn.pohled.map((q, i) => q + (cil[i] - q) * (1 - Math.exp(-dt / 0.12)));
  };

  const stav = (t, vstup = {}, dyn) => {
    const d = dyn || novaDynamika();
    const u = t - d.probuzeni;
    const pr = stavProbuzeni(u);
    let oci = "klid", usta = "usmev", tvare = 0.3;
    if (pr.sila > 0.05) {
      oci = "blaho";
      usta = u > 0.9 && u < 3.4 ? "velky" : "usmev";
      tvare = 0.3 + 0.7 * pr.sila;
    } else if (t - d.pokuk < 1.6) oci = "pokuk";
    if (t - d.zvoneno < 1.2 && oci === "klid") tvare = 0.5;
    return {
      t, vitr: d.vitr, otres: d.otres, provaz: d.provaz, zvoni: clamp(d.zvoniSila), dvere: pr.dvere, probuzeni: pr.sila,
      vlny: d.vlny.map((v) => ({ x: v.x, y: v.y, u: t - v.t })), prach: d.prach, oci, usta, tvare, pohledOka: d.pohled,
    };
  };
  const snimek = (st) => Math.floor(st.t * 30);
  const pomalu = (st) => Math.floor(st.t * 15);

  return {
    id: "v1",
    viewBox: "0 0 180 180",
    defs,
    novaDynamika,
    krok,
    stav,
    hukot: () => 0,
    klidne: { t: 2.4 },
    zacatek: 2.4,
    vrstvy: [
      { id: "zare", kresli: () => `<circle cx="90" cy="62" r="70" fill="url(#sn1-zare)"/>`, pruhlednost: (st) => f(clamp(0.5 + 0.08 * Math.sin(st.t * 0.9) + 0.5 * st.probuzeni)) },
      { id: "paprsky", kresli: vrstvaPaprsky, klic: (st) => (st.probuzeni > 0.01 ? snimek(st) : 0) },
      { id: "kasumi", kresli: vrstvaKasumi, tezka: true },
      { id: "sunago", kresli: vrstvaSunago, klic: (st) => Math.floor(st.t * 8) },
      { id: "samotka", kresli: () => vSam(samotkaTelo("sn1")), tezka: true },
      /* světlo ze svatyně dopadne i na Šamotku */
      { id: "ozareni", kresli: () => vSam(`<path d="${OBRYS_D}" fill="url(#sn1-ozareni)"/>`), pruhlednost: (st) => f(clamp(st.probuzeni * 0.85)) },
      { id: "svatyne", kresli: vrstvaSvatyne, tezka: true },
      { id: "vnitrek", kresli: vrstvaVnitrek, klic: (st) => (st.dvere > 0.001 ? f(st.dvere) : 0) },
      { id: "strapce", kresli: vrstvaStrapce, klic: pomalu },
      { id: "sakaki", kresli: vrstvaSakaki, klic: pomalu },
      { id: "obetiny", kresli: vrstvaObetiny },
      { id: "plaminky", kresli: vrstvaPlaminky, klic: snimek },
      { id: "tvar", kresli: vrstvaTvar, klic: (st) => `${st.oci},${st.usta},${f(st.tvare)},${f(st.pohledOka[0])},${f(st.pohledOka[1])}` },
      { id: "shimenawa", kresli: vrstvaShimenawa, klic: pomalu },
      { id: "zvonec", kresli: vrstvaZvonec, klic: (st) => st.provaz.map((p) => `${Math.round(p.x * 4)},${Math.round(p.y * 4)}`).join() + f(st.zvoni) },
      { id: "efekty", kresli: vrstvaEfekty, klic: (st) => (st.vlny.length || st.prach.length || st.dvere > 0.05 ? snimek(st) : 0) },
    ],
  };
})();
