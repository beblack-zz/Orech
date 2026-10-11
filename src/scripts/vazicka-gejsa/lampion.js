/*
 * 03, Lampion — VÁZIČKA JDE NA VEČER S ČÓČINEM
 *
 * Jako Pecinka s čóčinem a Cedulka s andonem z průvodu na Domku 2. Maiko
 * jde večer uličkou na hostinu a svítí si na cestu: v ruce nese na krátké
 * bambusové tyčce papírový čóčin. Skládací, s černými lakovanými obručemi
 * nahoře a dole, s drátěným držadlem, se žebry z bambusu a s rumělkovým
 * střapcem. Na papíře má znak domu: pětilistý květ sakury ze značky. Uvnitř
 * se třepotá plamínek svíčky a pod lucernou leží na cestě kaluž světla.
 *
 * Bez pozadí: Vázička chodí, takže cestu jí dělá stránka, kam ji kdo
 * postaví — v průvodu ji posouvá CSS, sama jen cupitá na místě v dřevácích
 * okobo, natočená trochu z boku ke směru chůze (stejně jako Pecinka
 * a Cedulka, doprava). Krůčky jsou drobné a rychlé: klap, klap. Tělo se
 * při každém maličko zhoupne. Že jde, je vidět podle otisků, které za ní
 * ujíždějí dozadu, a podle lístků sakury, které jí občas upadnou z větvičky
 * a zůstanou ležet na cestě.
 *
 * Nic na ní nevisí napevno. Lucerna je kyvadlo na špičce tyčky, rukávy
 * furisode kyvadla na zápěstích, šňůry kanzashi tři kyvadla různé délky,
 * volné konce mašle na zádech čtvrté a větvička pruží. Rozhoupává je to,
 * jak se hýbe místo, kde visí, a tak za krokem jdou se zpožděním.
 *
 * Myš: Vázička má sklopená víčka, a když přijde kurzor, zvedne oči a kouká
 * za ním; zvědavá můra za ním odletí. Když se kurzor zastaví na ní, zakryje
 * si rukávem ústa a zasměje se, podruhé se v chůzi ukloní. Rychlé mávnutí
 * myší je vítr: rozhoupe lucernu, rukávy i šňůry, plamínek se přikrčí
 * a z větvičky to strhne lístek.
 * Kliknutí na lucernu: ťukne do papíru a plamen zaplane. Kliknutí na
 * Vázičku: napoprvé se zastaví, otočí se čelem a hluboce se ukloní;
 * napodruhé se otočí celá dokola, lucernu obnese kolem sebe a ukáže mašli
 * na zádech. Kliknutí jinam: zafouká, plamínek skoro zhasne, ona se lekne,
 * zakryje ho rukávem a on se zase rozhoří.
 * Sama od sebe se občas zastaví a upraví si kanzashi (plíšky zacinkají),
 * nebo se ohlédne, jestli za ní někdo jde.
 *
 * Co se nemění (lucerna, větvička), kreslí se jednou a běh s tím jen hýbe.
 * Váza se kreslí znovu, jen když se otočí (po dvou stupních), tvář, jen
 * když změní výraz nebo pohled. Rozsvícený papír leží přes zhasnutý
 * a prolíná se do něj průhledností. Lucerna je ve vrstvách dvakrát, za
 * Vázičkou a před ní: při otočce ji nese kolem sebe a vrstvy se vystřídají
 * ve chvíli, kdy je lucerna vedle těla. Filtry tu nejsou žádné.
 */
import {
  f, rng, clamp, lerp, smooth, rad, deg, pt, mix, hladka, kCili, pres, mrkani, jiskraD,
  DEN, OBRYS, RUMELKA, VAZ, TELO_D, PLATEK, KVETY_VETVE,
  vazDefs, kvetyDefs, vazTelo, vazSpona, vazTvarNa, vazZatylek, vazMasle, vazOzdoby, vazSnury, vazVetvicka, vazRukav, vazRuka, vazOkobo,
  rameno, kanzashiStred, listek,
} from "./spolecne.js";

const ID = "vgl";
/* duben: sakura na větvičce i v kanzashi */
const M = 3;
const PAL = DEN;
const ZEM = 160;
/* kde v ploše stojí a jak je velká; kresba Vázičky je 0–180 se zemí ve VAZ.zem */
const FX = 74, K = 0.92;
const POSTAVA = `translate(${FX} ${ZEM}) scale(${K}) translate(-90 -${VAZ.zem})`;
const vPostave = (s) => `<g transform="${POSTAVA}">${s}</g>`;
/* natočení ke směru chůze; kladné je doprava jako u Pecinky a Cedulky */
const YAW0 = 38;
const cyk = (x) => ((x % 1) + 1) % 1;
const pan = (x) => clamp((x - 90) / 90, -1, 1);
const f1 = (n) => Math.round(n * 10) / 10;
/** Krátké zhoupnutí tam a zpátky: od času `od` trvá `doba`. */
const pulz = (u, od, doba) => (u > od && u < od + doba ? Math.sin((Math.PI * (u - od)) / doba) ** 2 : 0);
/** Pružina s tlumením: p = { a, v }. */
const pruzina = (p, cil, dt, { tuhost, utlum }) => {
  p.v += (tuhost * (cil - p.a) - utlum * p.v) * dt;
  p.a += p.v * dt;
};
/**
 * Kyvadlo na závěsu, který se hýbe: p.a je úhel od svislice v radiánech
 * (kladný doprava), `ax` vodorovné zrychlení závěsu. `tah` je stálý tah
 * vzduchu (při chůzi dozadu, ve větru po větru).
 */
const kyvadlo = (p, ax, dt, { om2, utlum, cit, tah = 0, mez = 1 }) => {
  p.v += (-om2 * Math.sin(p.a) - cit * ax * Math.cos(p.a) - utlum * p.v + tah) * dt;
  p.a += p.v * dt;
  if (Math.abs(p.a) > mez) {
    p.a = Math.sign(p.a) * mez;
    p.v *= -0.3;
  }
};
/** Zrychlení bodu z jeho polohy snímek po snímku, vyhlazené a s mezí: tím se rozhoupávají kyvadla. */
const MAX_ZR = 900;
const novySled = () => ({ p: null, v: null, a: [0, 0] });
const zrychleni = (s, P, dt) => {
  if (s.p) {
    const v = [(P[0] - s.p[0]) / dt, (P[1] - s.p[1]) / dt];
    if (s.v) {
      let a = [(v[0] - s.v[0]) / dt, (v[1] - s.v[1]) / dt];
      const vel = Math.hypot(a[0], a[1]);
      if (vel > MAX_ZR) a = a.map((q) => (q * MAX_ZR) / vel);
      s.a = s.a.map((q, i) => q + (a[i] - q) * clamp(dt / 0.045));
    }
    s.v = v;
  }
  s.p = P;
  return s.a;
};

/* ——— Kde co je ———
   Bod z kresby Vázičky do plochy: nejdřív tam, kde stojí v klidu, pak
   s pohybem těla (posun, náklon a zmáčknutí kolem paty). */
const naZaklad = ([x, y]) => [FX + (x - 90) * K, ZEM + (y - VAZ.zem) * K];
const naPlatno = (p, fig) => {
  const [bx, by] = naZaklad(p);
  const dx = (bx - FX) * fig.sx, dy = (by - ZEM) * fig.sy;
  const c = Math.cos(rad(fig.r)), s = Math.sin(rad(fig.r));
  return [FX + fig.x + dx * c - dy * s, ZEM + fig.y + dx * s + dy * c];
};
/** A zpátky: bod z plochy do kresby Vázičky. */
const doPostavy = ([x, y], fig) => {
  const dx = x - FX - fig.x, dy = y - ZEM - fig.y;
  const c = Math.cos(rad(fig.r)), s = Math.sin(rad(fig.r));
  return [90 + (dx * c + dy * s) / (fig.sx * K), VAZ.zem + (-dx * s + dy * c) / (fig.sy * K)];
};
const FIG0 = { x: 0, y: 0, r: 0, sx: 1, sy: 1 };
const HRDLO0 = naZaklad([VAZ.cx, VAZ.hrdlo]);

/* ——— Chůze v okobo ———
   Dvojkrok trvá KROK_T. Dřevák je OPORA z něj na zemi a jede s cestou
   dozadu, zbytek času je ve vzduchu a přenáší se dopředu. Maiko cupitá:
   krok je kratičký a rychlý. */
const KROK_T = 0.64, KROK = 2.7, OPORA = 0.56, ZDVIH = 2.5;
/** Jak rychle ujíždí cesta pod nohama (v ploše za sekundu) — tak rychle by ji měl posouvat průvod. */
const RYCHLOST = (2 * KROK) / (OPORA * KROK_T);
/* ve stoji má nohy vedle sebe; z téhle fáze kroku vykročí, aniž by sebou škubla */
const FI_VYKROC = OPORA / 2;
/* její pravá noha je při chůzi blíž k nám */
const NOHY = [{ strana: -1, faze: 0 }, { strana: 1, faze: 0.5 }];
const ROZKROK = 8.5;
/* jak široký je vak rukávu pod zápěstím; když ruku zvedne k vlasům, překlopí se na druhou stranu, k lokti */
const RUKAV = 15.5;
const noha = (n, fi) => {
  const u = cyk(fi - n.faze);
  if (u < OPORA) return { z: lerp(KROK, -KROK, u / OPORA), zved: 0, uhel: 0 };
  const k = (u - OPORA) / (1 - OPORA);
  /* pata se zvedne první, a tak se dřevák skloní na špičku; dosedá naplocho */
  return { z: lerp(-KROK, KROK, smooth(k)), zved: ZDVIH * Math.sin(Math.PI * k), uhel: 15 * Math.sin(Math.PI * k) * (1 - 1.5 * k) };
};

/* ——— Ruka s lucernou ———
   Dlaň je v úhlu `w` kolem osy vázy (z pohledu diváka: 90 je vpravo vedle
   těla, 0 před ním), tyčka z ní míří ven a šikmo vzhůru. Při otočce se úhel
   točí s tělem, a tak lucerna obejde Vázičku dokola; vlevo, kde je k okraji
   plochy blíž, si ji přitáhne k tělu. */
const RUKA_L = { w: 72, r: 41, y: 99 };
const TYC = { dx: 17, dy: 11.5, za: 6.5 };
const rukaLucerny = (w, dolu = 0) => {
  const s = Math.sin(rad(w)), vlevo = clamp(-s);
  const H = [90 + (RUKA_L.r - 9 * vlevo) * s, RUKA_L.y + dolu];
  return { H, T: [H[0] + TYC.dx * (1 - 0.25 * vlevo) * s, H[1] - TYC.dy], s };
};

/* ——— Čóčin ———
   V místních souřadnicích: očko, za které visí na tyčce, je v počátku, osa
   míří dolů. Papír je soudek mezi dvěma obručemi; díváme se maličko shora,
   proto jsou žebra i obruče vepředu prohnuté dolů. */
const LUC = { kruh: 6.8, y0: 10, y1: 35, rK: 6.4, rB: 11, dno: 38.4 };
const STRED_L = [0, 23], KNOT = [0, 32.6], ZNAK = [0, 21.6];
const ZAVES = 24, G = 170, MEZE_TH = [-0.34, 0.62];
const sirkaL = (q) => LUC.rK + (LUC.rB - LUC.rK) * Math.pow(Math.sin(Math.PI * clamp(q)), 0.72);
const BOKY = Array.from({ length: 11 }, (_, i) => [sirkaL(i / 10), lerp(LUC.y0, LUC.y1, i / 10)]);
/** Hladká křivka bez úvodního M — pokračování rozdělané cesty. */
const dal = (B) => hladka(B).replace(/^M[^C]*/, "");
const PAPIR_D =
  `M${-LUC.rK} ${LUC.y0} Q0 ${LUC.y0 + 2.3} ${LUC.rK} ${LUC.y0}` + dal(BOKY) +
  ` Q0 ${LUC.y1 + 2.3} ${-LUC.rK} ${LUC.y1}` + dal(BOKY.slice().reverse().map(([w, y]) => [-w, y])) + " Z";
const ZEBRA = Array.from({ length: 8 }, (_, i) => {
  const q = (i + 1) / 9, w = sirkaL(q) - 0.2, y = lerp(LUC.y0, LUC.y1, q);
  return `M${f(-w)} ${f(y)} Q0 ${f(y + w * 0.3)} ${f(w)} ${f(y)}`;
}).join(" ");
/* obruč: nízký válec, spodní hrana je vepředu prohnutá */
const obrucD = (ya, yb, r) => `M${-r} ${ya} V${yb} Q0 ${f(yb + r * 0.34)} ${r} ${yb} V${ya} Z`;
/* znak domu na papíře: květ ze značky, pět plátků kolem středu */
const znak = (barva, stred) =>
  `<g transform="translate(${ZNAK[0]} ${ZNAK[1]}) scale(0.94 1)"><g transform="scale(0.41)" fill="${barva}">${[0, 72, 144, 216, 288].map((u) => `<path d="${PLATEK}" transform="rotate(${u}) translate(0 -1.9)"/>`).join("")}</g><circle r="0.85" fill="${stred}"/></g>`;
/** Bod lucerny v ploše: visí na špičce tyčky T a houpe se o úhel th (kladný = spodek doprava). */
const naLucernu = (T, th, [x, y]) => [T[0] + x * Math.cos(th) + y * Math.sin(th), T[1] - x * Math.sin(th) + y * Math.cos(th)];
/* výchozí poloha špičky tyčky, světla a knotu: v ní je lucerna nakreslená, běh ji odtud posouvá a otáčí */
const T0 = naPlatno(rukaLucerny(RUKA_L.w).T, FIG0), L0 = naLucernu(T0, 0, STRED_L), KNOT0 = naLucernu(T0, 0, KNOT);
const vLucerne = (s) => `<g transform="translate(${pt(T0)})">${s}</g>`;
const ZARE_R = 40;
const JISKRA = jiskraD(1);

/* ——— Úklona a otočka: časy od zastavení ——— */
const UKL = { celem: 0.08, dolu: 0.62, nahoru: 1.78, zpet: 2.2, konec: 2.8 };
/* otočka má dvě půlky: nejdřív se otočí zády a chvilku tak postojí, ať je mašle vidět, pak se dotočí */
const OTOCKA = { start: 0.08, zady: 150, dal: 0.82, konec: 2.1 };

/** Tělo v ploše: houpání při kroku, náklon, úklona a zmáčknutí. Všechno, co je k němu přilepené, se počítá odtud. */
const figV = (d, t, yaw) => {
  const jde = 1 - d.rovna, sn = Math.sin(rad(yaw)), cs = Math.cos(rad(yaw));
  /* bok se střídá s dvojkrokem, hup je dvakrát za dvojkrok: při došlapu je nejníž */
  const bok = Math.sin(2 * Math.PI * d.fi), hup = 0.5 - 0.5 * Math.cos(4 * Math.PI * d.fi);
  const chich = d.g.smich * Math.abs(Math.sin(t * 15));
  /* úklona: co z ní míří k nám, je zkrácení, co do strany, je náklon */
  const sy = 1 + d.dosed.a - 0.18 * d.uklon * Math.abs(cs) + 0.007 * Math.sin(t * 1.6) - 0.014 * chich;
  return {
    x: 0.45 * bok * jde,
    y: -0.85 * hup * jde - d.skok,
    r: (1.2 + 1.4 * bok) * jde + d.sklon.a + 13 * d.uklon * sn,
    sx: 1 + (1 - sy) * 0.3,
    sy,
  };
};
/** Kam si sahá bližší ručka: volně u boku (při chůzi se houpe proti kroku), nebo za tím, co zrovna dělá. */
const vychoziRuka = (d, yaw) => {
  const jde = 1 - d.rovna;
  return [90 + 40 * Math.sin(rad(yaw - 100)) - 2.4 * jde * Math.cos(2 * Math.PI * d.fi), 117 - 0.8 * jde * Math.abs(Math.sin(2 * Math.PI * d.fi))];
};
const cilRuky = (d, t, yaw, Lf) => {
  const g = d.g, c = Math.cos(rad(yaw)), tvarX = 90 + 30.5 * Math.sin(rad(yaw)), kz = kanzashiStred(yaw);
  let H = vychoziRuka(d, yaw);
  const k = (cil, vaha) => {
    if (vaha > 0.001) H = [lerp(H[0], cil[0], smooth(vaha)), lerp(H[1], cil[1], smooth(vaha))];
  };
  /* při úkloně ruku složí před sebe, kanzashi si rovná zespodu, plamen kryje rukávem zezadu, při smíchu si zakryje ústa */
  k([85, 127], g.uklon);
  k([kz[0] - 4.5 + 1.1 * Math.sin(t * 9), kz[1] + 7 + 0.8 * Math.cos(t * 9)], g.kanz);
  k([Lf[0] - 16, Lf[1] + 1], g.kryt);
  k([tvarX - 7.6 * c - 1, 106.4 + 0.5 * Math.sin(t * 30)], g.smich);
  return H;
};
/** Celá póza z toho, co je v simulaci: natočení, tělo, nohy, ruce, tyčka a lucerna. */
const poza = (d, t) => {
  const yaw = YAW0 + d.natoc.a + d.ot.a;
  /* váza se kreslí po dvou stupních; všechno, co na ní sedí, bere stejné číslo */
  const yawQ = (((Math.round(yaw / 2) * 2) % 360) + 360) % 360;
  const sn = Math.sin(rad(yaw)), cs = Math.cos(rad(yaw));
  const fig = figV(d, t, yaw), jde = 1 - d.rovna;
  /* při otočce přešlapuje na místě */
  const tocka = clamp(Math.abs(d.ot.v) / 120);
  const nohy = NOHY.map((n, i) => {
    const q = noha(n, d.fi);
    return {
      i, hloubka: -n.strana * sn,
      x: n.strana * ROZKROK * cs * K + q.z * jde,
      y: -n.strana * sn * 1.1 - q.zved * jde - 1.5 * tocka * Math.max(0, Math.sin(rad(d.ot.a * 3 + i * 180))) - d.skok * 0.5,
      uhel: q.uhel * jde,
    };
  }).sort((a, b) => a.hloubka - b.hloubka);
  const wL = RUKA_L.w + d.ot.a;
  const luc = rukaLucerny(wL, 5 * d.uklon - d.zdvih);
  const T = naPlatno(luc.T, fig), L = naLucernu(T, d.th, STRED_L);
  return {
    yaw, yawQ, sn, cs, fig, nohy, wL, lucZa: Math.cos(rad(wL)) < 0,
    Hl: luc.H, Tf: luc.T, T, L, Lf: doPostavy(L, fig),
    hlava: naPlatno(kanzashiStred(yaw), fig),
    zada: naPlatno([90 - 34 * sn, 123], fig),
    zapesti: [naPlatno(d.ruka, fig), naPlatno(luc.H, fig)],
    tvar: naPlatno([90 + 30.5 * sn, 99], fig),
  };
};

/* ——— Vrstvy ——— */
/* cesta: vlastní stín, kaluž světla, otisky dřeváků a lístky, co už dopadly. Nic víc — pozadí si nese stránka. */
const vrstvaZem = (st) => {
  const S = clamp(st.S, 0, 1.6), bx = FX + st.fig.x, vzduch = clamp(1 - st.skok / 10, 0.5, 1);
  /* lucerna svítí zprava, a tak stín padá dozadu */
  let s =
    `<ellipse cx="${f(bx - 4 - 6 * clamp(S))}" cy="${ZEM + 0.5}" rx="${f(27 + 5 * clamp(S))}" ry="3.8" fill="url(#${ID}-stin)" opacity="${f(vzduch)}"/>` +
    `<ellipse cx="${f(bx)}" cy="${ZEM + 0.2}" rx="14" ry="1.9" fill="#2B2420" opacity="${f(0.16 * vzduch)}"/>`;
  if (S > 0.02) {
    /* čím níž lucerna visí, tím je kaluž světla menší a jasnější */
    const vys = ZEM - st.L[1], rx = 15 + vys * 0.2 + 7 * Math.max(0, S - 1);
    s += `<ellipse cx="${f(st.L[0])}" cy="${ZEM + 0.4}" rx="${f(rx)}" ry="${f(rx * 0.2)}" fill="url(#${ID}-kaluz)" opacity="${f(clamp(S * (1.2 - vys / 150)) * st.uKraje)}"/>`;
  }
  for (const p of st.stopy) s += `<ellipse cx="${f(p.x)}" cy="${f(p.y)}" rx="2.2" ry="0.75" fill="#3A3028" opacity="${f(0.16 * p.op)}"/>`;
  for (const l of st.lezici) s += `<g transform="translate(${f(l.x)} ${f(l.y)}) scale(1 0.42)">${listek(M, [0, 0], { s: l.s, rot: l.rot, op: l.op, svetly: l.svetly })}</g>`;
  return s;
};
/* záře kolem lucerny: kruh nakreslený jednou, běh ho nosí za světlem a průhledností s ním tepe */
const vrstvaZare = () => `<circle cx="${f(L0[0])}" cy="${f(L0[1])}" r="${ZARE_R}" fill="url(#${ID}-zare)"/>`;
/* můra: dvě křídla, která se zavírají a otvírají; ve světle je teplejší */
const KRIDLO = "M0.3 -0.5 C1.4 -3.1 4.2 -3.3 4.5 -1.6 C4.6 -0.4 3.2 0.3 2.4 0.5 C3.4 1 3.3 2.7 2.1 2.6 C1.2 2.5 0.6 1.5 0.3 0.7 Z";
const muraSvg = (m) => {
  const sp = f(0.2 + 0.8 * m.mav);
  return (
    `<g transform="translate(${f(m.x)} ${f(m.y)}) rotate(${f(m.nakl)}) scale(${f(m.sc)})"${m.z < 0 ? ` opacity="0.8"` : ""}>` +
    `<g fill="${mix("#F3ECDC", "#FFE3A6", m.sv)}" stroke="#9A8468" stroke-width="0.32" stroke-linejoin="round"><path d="${KRIDLO}" transform="scale(${sp} 1)"/><path d="${KRIDLO}" transform="scale(-${sp} 1)"/></g>` +
    `<ellipse cx="0" cy="0.3" rx="0.6" ry="1.7" fill="#6B5D4F"/></g>`
  );
};
const vrstvaMury = (vpredu) => (st) => st.mury.filter((m) => m.z >= 0 === vpredu).map(muraSvg).join("");
/* mašle a ozdoby se kreslí jednou za snímek pro obě vrstvy (za tělem a před ním) */
const casti = (st) => st.casti || (st.casti = { masle: vazMasle(ID, { yaw: st.yawQ, P: PAL, kyv: st.kyvMasle }), ozdoby: vazOzdoby(ID, M, { yaw: st.yawQ, P: PAL }) });
const vrstvaMasleZa = (st) => vPostave(casti(st).masle.za + casti(st).ozdoby.za);
/* dřevák: nakreslený jednou tam, kde stojí pata vázy, běh ho nosí za nohou */
const vrstvaOkobo = (st) => vPostave(vazOkobo(ID, [90, VAZ.zem], { bok: st.sn, P: PAL }));
const pohybOkobo = (i) => (st) => ({ x: st.nohy[i].x, y: st.nohy[i].y, r: st.nohy[i].uhel, ox: FX, oy: ZEM });
/* bambusová tyčka: od dlaně ke špičce s očkem, na kterém visí lucerna */
const tycSvg = (H, T) => {
  const dx = T[0] - H[0], dy = T[1] - H[1], d = Math.hypot(dx, dy) || 1, u = [dx / d, dy / d];
  const A = [H[0] - u[0] * TYC.za, H[1] - u[1] * TYC.za], c = `M${pt(A)} L${pt(T)}`;
  const kolinko = [lerp(H[0], T[0], 0.55), lerp(H[1], T[1], 0.55)];
  return (
    `<path d="${c}" stroke="${OBRYS}" stroke-width="2.5" stroke-linecap="round" fill="none"/>` +
    `<path d="${c}" stroke="#D8C27E" stroke-width="1.5" stroke-linecap="round" fill="none"/>` +
    `<path d="M${f(kolinko[0] - u[1])} ${f(kolinko[1] + u[0])} L${f(kolinko[0] + u[1])} ${f(kolinko[1] - u[0])}" stroke="#9A8448" stroke-width="0.6"/>` +
    `<circle cx="${f(T[0])}" cy="${f(T[1])}" r="1.25" fill="#3A3028"/>`
  );
};
const pazeSvg = (a) =>
  (a.tyc ? tycSvg(a.H, a.tyc) : "") +
  vazRukav(ID, a.A, a.H, { kyv: a.kyv, strana: a.strana, sirka: a.sirka, P: PAL }) +
  vazRuka(ID, a.H, { P: PAL });
const vrstvaRukavZa = (st) => vPostave(st.paze.filter((a) => a.za).map(pazeSvg).join(""));
/* větvička je nakreslená jednou; běh ji naklání kolem hrdla a s otočkou ji zužuje a překlápí */
const vrstvaVetvicka = () => vPostave(vazVetvicka(ID, M, { P: PAL }));
const pohybVetvicky = (st) => {
  const N = naPlatno([VAZ.cx, VAZ.hrdlo], st.fig);
  return { x: N[0] - HRDLO0[0], y: N[1] - HRDLO0[1], r: st.fig.r + st.kyvVetve, sx: st.fig.sx * st.vetevSx, sy: st.fig.sy * (1 - 0.22 * st.uklon * Math.abs(st.cs)), ox: HRDLO0[0], oy: HRDLO0[1] };
};
/* váza se vším, co je na ní namalované; kreslí se znovu, jen když se pootočí */
const vrstvaTelo = (st) => vPostave(vazTelo(ID, { yaw: st.yawQ, P: PAL }) + vazSpona(ID, { yaw: st.yawQ, P: PAL }) + vazZatylek(ID, { yaw: st.yawQ, P: PAL }));
/* teplé světlo lucerny na té straně vázy, která je k ní blíž */
const vrstvaSvit = (st) => {
  const S = clamp(st.S, 0, 1.5) * (st.lucZa ? 0.5 : 1), [cx, cy] = st.Lf;
  const vzd = Math.hypot(cx - VAZ.c[0], cy - VAZ.c[1]), r = vzd + 28;
  return vPostave(
    `<defs><radialGradient id="${ID}-svit-g" gradientUnits="userSpaceOnUse" cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}">` +
      `<stop offset="${f(clamp((vzd - 40) / r, 0, 0.9))}" stop-color="#FFC27A" stop-opacity="${f(clamp(0.5 * S))}"/><stop offset="${f(clamp((vzd - 6) / r, 0.02, 0.97))}" stop-color="#F29A52" stop-opacity="${f(clamp(0.1 * S))}"/><stop offset="1" stop-color="#F29A52" stop-opacity="0"/></radialGradient></defs>` +
      `<path d="${TELO_D}" fill="url(#${ID}-svit-g)"/>`,
  );
};
const vrstvaTvar = (st) => vPostave(vazTvarNa(ID, st.yawQ, { vyraz: st.vyraz, dx: st.pohled[0], dy: st.pohled[1], mrk: st.mrk, P: PAL, tvare: st.tvare }));
/* co je před tělem: mašle (zezadu), ozdoby ve vlasech, šňůry kanzashi a bližší rukáv */
const vrstvaPred = (st) =>
  vPostave(
    casti(st).masle.pred + casti(st).ozdoby.pred + vazSnury(ID, M, { yaw: st.yawQ, kyv: st.kyvSnur, P: PAL }) +
      st.paze.filter((a) => !a.za).map(pazeSvg).join(""),
  );
/* lucerna zhasnutá: držadlo, papír se žebry a znakem, obruče a střapec */
const vrstvaLucerna = () => {
  const lak = `fill="url(#${ID}-lak)" stroke="#1A1518" stroke-width="0.6" stroke-linejoin="round"`;
  return vLucerne(
    /* drátěné držadlo od horní obruče k očku */
    `<path d="M-5.9 ${LUC.kruh + 0.6} C-6.3 2.6 -2.6 0.9 0 0.9 C2.6 0.9 6.3 2.6 5.9 ${LUC.kruh + 0.6}" stroke="#3A3028" stroke-width="0.85" stroke-linecap="round" fill="none"/>` +
      `<circle cx="0" cy="0.5" r="1.3" fill="none" stroke="#3A3028" stroke-width="0.7"/>` +
      `<path d="${PAPIR_D}" fill="url(#${ID}-papir)" stroke="${OBRYS}" stroke-width="0.8" stroke-linejoin="round"/>` +
      `<path d="${ZEBRA}" stroke="#B5A07A" stroke-width="0.45" fill="none"/>` +
      znak(RUMELKA, "#F6E7C8") +
      /* horní obruč je shora otevřená: tudy odchází teplo svíčky */
      `<path d="${obrucD(LUC.kruh, LUC.y0, LUC.rK + 0.5)}" ${lak}/>` +
      `<ellipse cx="0" cy="${LUC.kruh}" rx="${LUC.rK + 0.5}" ry="${f((LUC.rK + 0.5) * 0.17)}" ${lak}/>` +
      `<ellipse cx="0" cy="${LUC.kruh + 0.1}" rx="${LUC.rK - 1.5}" ry="${f((LUC.rK - 1.5) * 0.17)}" fill="#0E0C10"/>` +
      `<path d="M${-LUC.rK + 1.4} ${LUC.kruh + 1.5} V${LUC.y0 - 0.4}" stroke="#FFFFFF" stroke-width="0.7" stroke-linecap="round" opacity="0.35"/>` +
      `<path d="${obrucD(LUC.y1 - 0.3, LUC.dno, LUC.rK + 0.5)} " ${lak}/>` +
      `<path d="M${-LUC.rK + 1.4} ${LUC.y1 + 1} V${LUC.dno - 0.2}" stroke="#FFFFFF" stroke-width="0.7" stroke-linecap="round" opacity="0.35"/>` +
      /* střapec na rumělkové šňůrce */
      `<path d="M0 ${LUC.dno + 1.6} V${LUC.dno + 4}" stroke="#8E2A1C" stroke-width="0.8" stroke-linecap="round"/>` +
      `<path d="M-1 ${LUC.dno + 5} L-1.9 ${LUC.dno + 10} Q0 ${LUC.dno + 11} 1.9 ${LUC.dno + 10} L1 ${LUC.dno + 5} Z" fill="${RUMELKA}" stroke="#8E2A1C" stroke-width="0.45" stroke-linejoin="round"/>` +
      `<path d="M-0.5 ${LUC.dno + 6.2} L-0.8 ${LUC.dno + 9.8} M0.5 ${LUC.dno + 6.2} L0.8 ${LUC.dno + 9.8}" stroke="#8E2A1C" stroke-width="0.3" opacity="0.7"/>` +
      `<circle cx="0" cy="${LUC.dno + 4.5}" r="1.2" fill="${PAL.zlatoSv}" stroke="#8E2A1C" stroke-width="0.4"/>`,
  );
};
/* totéž rozsvícené: svíčka prosvěcuje papír zevnitř, žebra a znak jsou proti světlu tmavší, k okrajům papír tmavne */
const vrstvaLucernaSvit = () =>
  vLucerne(
    `<path d="${PAPIR_D}" fill="url(#${ID}-papir-svit)"/>` +
      `<path d="${ZEBRA}" stroke="#DE9440" stroke-width="0.45" fill="none" opacity="0.8"/>` +
      znak("#B5391F", "#FFE9B0") +
      `<path d="${PAPIR_D}" fill="url(#${ID}-papir-kraj)" stroke="#9A5A2C" stroke-width="0.8" stroke-linejoin="round"/>` +
      /* otvorem v horní obruči je vidět světlo */
      `<ellipse cx="0" cy="${LUC.kruh + 0.1}" rx="${LUC.rK - 1.7}" ry="${f((LUC.rK - 1.7) * 0.17)}" fill="#FFD98C"/>`,
  );
/* plamínek svíčky prosvítá papírem; běh ho natahuje, kloní a zhasíná */
const vrstvaPlamen = () =>
  vLucerne(
    `<ellipse cx="${KNOT[0]}" cy="${KNOT[1] - 4.6}" rx="3.3" ry="5.4" fill="url(#${ID}-plamen)"/>` +
      `<path d="M0 ${KNOT[1] - 0.6} C-1.5 ${KNOT[1] - 2.2} -1.1 ${KNOT[1] - 4.6} 0 ${KNOT[1] - 6.8} C1.1 ${KNOT[1] - 4.6} 1.5 ${KNOT[1] - 2.2} 0 ${KNOT[1] - 0.6} Z" fill="#FFFFFF" opacity="0.92"/>`,
  );
const pohybLucerny = (st) => ({ x: st.T[0] - T0[0], y: st.T[1] - T0[1], r: -deg(st.th), ox: T0[0], oy: T0[1] });
/* plamen se točí s lucernou, ale kolem knotu: tam se taky natahuje a kloní */
const pohybPlamene = (st) => {
  const Kn = naLucernu(st.T, st.th, KNOT);
  return { x: Kn[0] - KNOT0[0], y: Kn[1] - KNOT0[1], r: -deg(st.th) + st.plamen.r, sx: st.plamen.sx, sy: st.plamen.sy, ox: KNOT0[0], oy: KNOT0[1] };
};
/* lucerna je ve vrstvách dvakrát: `za` je vidět, když ji při otočce nese za zády */
const lucernaVrstvy = (za) => {
  const vid = (st) => st.lucZa === za, p = za ? "-za" : "";
  return [
    { id: `lucerna${p}`, kresli: vrstvaLucerna, pohyb: pohybLucerny, pruhlednost: (st) => (vid(st) ? 1 : 0) },
    { id: `lucerna-svit${p}`, kresli: vrstvaLucernaSvit, pohyb: pohybLucerny, pruhlednost: (st) => (vid(st) ? f(clamp(0.04 + 0.96 * st.S)) : 0) },
    { id: `plamen${p}`, kresli: vrstvaPlamen, pohyb: pohybPlamene, pruhlednost: (st) => (vid(st) ? f(clamp(1.05 * st.S)) : 0) },
  ];
};
/* co létá jen chvíli: lístky z větvičky, jiskry, když plamen zaplane, a čáry větru */
const vrstvaCastice = (st) => {
  let s = "";
  const [lx, ly] = st.L;
  if (st.zar > 0.03) s += `<circle cx="${f(lx)}" cy="${f(ly)}" r="${f(14 + 10 * st.zar)}" fill="url(#${ID}-jas)" opacity="${f(clamp(0.6 * st.zar))}"/>`;
  for (const v of st.vanek) {
    const u = v.vek / v.zivot, x = v.x + v.smer * u * 44, k = v.smer * 9;
    s += `<path d="M${f(x)} ${f(v.y)} q${f(k * 0.5)} -2.4 ${f(k)} 0 t${f(k)} 0" stroke="#8A7A69" stroke-width="0.9" stroke-linecap="round" fill="none" opacity="${f(0.7 * Math.sin(Math.PI * u))}"/>`;
  }
  for (const l of st.letici) s += listek(M, [l.x, l.y], { s: l.s, rot: l.rot, op: l.op, svetly: l.svetly });
  for (const j of st.jiskry) {
    const u = j.vek / j.zivot;
    s += `<path d="${JISKRA}" transform="translate(${f(j.x)} ${f(j.y)}) rotate(${f(j.rot + u * 80)}) scale(${f(j.r * (1 - u * 0.4))})" fill="${j.sv ? "#FFFBE0" : "#FFC860"}" stroke="#C8621E" stroke-width="${f(0.26 / j.r)}" opacity="${f(clamp(Math.min(u / 0.1, (1 - u) / 0.5)))}"/>`;
  }
  return s;
};

const defs = () =>
  vazDefs(ID, PAL) +
  kvetyDefs(ID, [M]) +
  `<radialGradient id="${ID}-stin"><stop offset="0" stop-color="#2B2420" stop-opacity="0.26"/><stop offset="0.6" stop-color="#2B2420" stop-opacity="0.12"/><stop offset="1" stop-color="#2B2420" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="${ID}-kaluz"><stop offset="0" stop-color="#FFC268" stop-opacity="0.62"/><stop offset="0.55" stop-color="#F59A4E" stop-opacity="0.24"/><stop offset="1" stop-color="#F59A4E" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="${ID}-zare"><stop offset="0" stop-color="#FFE0A0" stop-opacity="0.62"/><stop offset="0.38" stop-color="#FFA858" stop-opacity="0.24"/><stop offset="1" stop-color="#FF9A4A" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="${ID}-jas"><stop offset="0" stop-color="#FFF8D2" stop-opacity="0.9"/><stop offset="0.5" stop-color="#FFD070" stop-opacity="0.32"/><stop offset="1" stop-color="#FFC860" stop-opacity="0"/></radialGradient>` +
  /* papír lucerny: zhasnutý (světlo zleva jako na váze), prosvícený svíčkou a ztmavení k okrajům soudku */
  `<linearGradient id="${ID}-papir" gradientUnits="userSpaceOnUse" x1="${-LUC.rB}" y1="0" x2="${LUC.rB}" y2="0"><stop offset="0" stop-color="#E9DFC6"/><stop offset="0.3" stop-color="#F8F1DF"/><stop offset="0.65" stop-color="#EADFC4"/><stop offset="1" stop-color="#CDBD9A"/></linearGradient>` +
  `<radialGradient id="${ID}-papir-svit" gradientUnits="userSpaceOnUse" cx="0" cy="${KNOT[1] - 5}" r="19"><stop offset="0" stop-color="#FFFCE8"/><stop offset="0.32" stop-color="#FFEEB2"/><stop offset="0.7" stop-color="#FFCE74"/><stop offset="1" stop-color="#F3A650"/></radialGradient>` +
  `<linearGradient id="${ID}-papir-kraj" gradientUnits="userSpaceOnUse" x1="${-LUC.rB}" y1="0" x2="${LUC.rB}" y2="0"><stop offset="0" stop-color="#C9692A" stop-opacity="0.42"/><stop offset="0.24" stop-color="#C9692A" stop-opacity="0"/><stop offset="0.76" stop-color="#C9692A" stop-opacity="0"/><stop offset="1" stop-color="#B85A22" stop-opacity="0.5"/></linearGradient>` +
  `<radialGradient id="${ID}-plamen"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.95"/><stop offset="0.4" stop-color="#FFF4BE" stop-opacity="0.7"/><stop offset="1" stop-color="#FFD070" stop-opacity="0"/></radialGradient>` +
  `<linearGradient id="${ID}-lak" gradientUnits="userSpaceOnUse" x1="${-LUC.rK}" y1="0" x2="${LUC.rK}" y2="0"><stop offset="0" stop-color="#2E2830"/><stop offset="0.3" stop-color="#4A424C"/><stop offset="0.55" stop-color="#231E24"/><stop offset="1" stop-color="#141114"/></linearGradient>`;

/* ——— Simulace ——— */
const obehMury = (m, t) => {
  const rr = m.r + m.rozprch;
  m.z = Math.sin(m.a);
  m.x = clamp(m.c[0] + rr * Math.cos(m.a) + m.odfuk, 6, 174);
  m.y = clamp(m.c[1] + m.h0 * clamp(rr / m.r0, 0.4, 1.6) + 4.5 * Math.sin(t * m.w + m.fz) - m.z * 1.5, 8, ZEM - 6);
};
const novaDynamika = () => {
  const R = rng(3811);
  const d = {
    nahoda: R, zvuk: [],
    /* chůze: fáze kroku, jak moc stojí srovnaná a co zrovna dělá (jde, uklona, otocka, kryje, kanzashi, ohled) */
    fi: 0.12, rovna: 0, stoji: false, posuv: RYCHLOST, rezim: "jde", od: 0, fronta: null, doKanz: 9 + R() * 4, doOhled: 19 + R() * 6,
    /* tělo: natočení od směru chůze, otočka dokola, náklon, dosednutí, poskok a úklona */
    natoc: { a: 0, v: 0 }, ot: { a: 0, v: 0 }, otCil: 0, sklon: { a: 0, v: 0 }, dosed: { a: 0, v: 0 }, skok: 0, uklon: 0, zdvih: 0,
    /* bližší ručka: kde je a jak moc dělá které gesto */
    ruka: null, g: { smich: 0, kanz: 0, kryt: 0, uklon: 0 },
    smichOd: -100, pokyvOd: -100, mrkOd: -100, radost: -100, lek: -100, doPozdravu: 0, pozdravu: 0, klidMys: 0, klikuNaNi: 0, klavesa: 0, pohled: [0, 0],
    /* lucerna: kyvadlo na špičce tyčky, zaplanutí a jak moc je plamen sfouknutý */
    th: -0.05, om: 0, zar: 0, sfouk: 0, sfoukDo: -100, zaplanT: -100,
    /* co na ní visí: rukávy (bližší, vzdálenější), tři šňůry kanzashi, konce mašle a větvička */
    rukavy: [{ a: -0.12, v: 0 }, { a: -0.1, v: 0 }], snury: [{ a: -0.14, v: 0 }, { a: -0.16, v: 0 }, { a: -0.12, v: 0 }], masle: { a: -0.14, v: 0 }, vetev: { a: -1, v: 0 },
    sled: { hlava: novySled(), zada: novySled(), ruka: novySled(), rukaL: novySled(), T: novySled() },
    mury: Array.from({ length: 2 }, (_, i) => ({
      a: 0.8 + i * 2.7, smer: i ? -1 : 1, va: 1.5 + R() * 0.7, r0: [19, 25][i], r: [19, 25][i], h0: [-10, 7][i], fz: R() * 6.28, w: 0.9 + R() * 0.6,
      /* první je zvědavá a letí za kurzorem, druhá zůstává u světla */
      zved: i === 0 ? 0.7 : 0, c: [...L0], rozprch: 0, odfuk: 0, x: 0, y: 0, z: 0, vx: 0,
    })),
    listky: [], stopy: [], jiskry: [], vanek: [], doListku: 1.6 + R() * 2,
    mysP: null, mysV: [0, 0], vitr: 0, poryv: 0, fukT: -100, latkaT: -100, cinkT: -100, kroku: 0,
  };
  d.ruka = vychoziRuka(d, YAW0);
  for (const m of d.mury) obehMury(m, 0);
  return d;
};
const hraj = (d, druh, sila, x, dalsi) => {
  if (d.zvuk.length < 48) d.zvuk.push({ druh, sila, pan: pan(x), ...dalsi });
};
const zacni = (d, t, rezim) => {
  d.rezim = rezim;
  d.od = t;
};
const prsk = (d, [x, y], pocet) => {
  const R = d.nahoda;
  for (let i = 0; i < pocet && d.jiskry.length < 24; i++) {
    const a = R() * 6.28, v = 52 * (0.35 + R() * 0.65);
    d.jiskry.push({ x: x + Math.cos(a) * 11, y: y + Math.sin(a) * 13, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 10, vek: 0, zivot: 0.7 * (0.6 + R() * 0.8), r: 1.9 * (0.5 + R() * 0.8), rot: R() * 90, sv: R() < 0.45 });
  }
};
const zavan = (d, k, smer) => {
  const R = d.nahoda;
  for (let i = 0; i < 4 && d.vanek.length < 8; i++) d.vanek.push({ x: clamp(k.x + smer * (i * 7 - 6), 8, 172), y: clamp(k.y + (i - 1.5) * 7 + (R() - 0.5) * 4, 10, ZEM - 8), smer, vek: -i * 0.05, zivot: 0.5 + R() * 0.2 });
};
/** Z větvičky se utrhne lístek. */
const pustListek = (d, Z) => {
  if (d.listky.length >= 8) return;
  const R = d.nahoda, [x, y] = KVETY_VETVE[Math.floor(R() * KVETY_VETVE.length) % KVETY_VETVE.length];
  const [px, py] = naPlatno([90 + (x - 90) * Math.tanh(2.6 * Math.cos(rad(Z.yaw - YAW0))), y], Z.fig);
  d.listky.push({ x: px, y: py, vx: (R() - 0.5) * 6, vy: 4, rot: R() * 360, vr: (R() - 0.5) * 260, fz: R() * 6.28, vek: 0, lezi: false, zem: ZEM - 0.4 + R() * 1.6, s: 0.5 + R() * 0.2, svetly: R() < 0.5 });
};
/** Plamen zaplane, můry se rozprchnou. */
const zaplan = (d, t, Z, sila = 1) => {
  /* držená klávesa kliká třicetkrát za vteřinu: plamen potřebuje chvilku, než zaplane znovu */
  if (t - d.zaplanT < 0.22) return;
  const R = d.nahoda;
  d.zaplanT = t;
  d.zar = Math.min(2, d.zar + 1.1 * sila);
  d.sfouk = 0;
  d.sfoukDo = -100;
  d.om += 0.5 + (R() - 0.5) * 1.2;
  d.radost = t;
  prsk(d, Z.L, Math.round(8 * sila));
  for (const m of d.mury) m.rozprch = Math.min(34, m.rozprch + (16 + R() * 10) * sila);
  hraj(d, "papir", 0.7 * sila, Z.L[0]);
  hraj(d, "plamen", 0.8 * sila, Z.L[0], { za: 0.05 });
};
/** Zastaví se, otočí se čelem a hluboce se ukloní. */
const ukloniSe = (d, t) => {
  zacni(d, t, "uklona");
  hraj(d, "struna", 0.6, FX, { vys: 2 });
};
/** Otočí se celá dokola, lucernu obnese kolem sebe a ukáže mašli na zádech. */
const otocSe = (d, t) => {
  zacni(d, t, "otocka");
  hraj(d, "latka", 0.7, FX, { za: 0.12 });
  [0, 2, 4, 7].forEach((vys, i) => hraj(d, "struna", 0.5, FX, { vys, za: [0.1, 0.3, OTOCKA.dal + 0.05, OTOCKA.dal + 0.25][i] }));
};
/** Kliknutí na Vázičku: střídá úklonu a otočku; co má rozdělané, dodělá. */
const klikNaNi = (d, t) => {
  if (d.rezim === "uklona" || d.rezim === "otocka") {
    d.fronta = d.rezim === "uklona" ? "otocka" : "uklona";
    return;
  }
  (d.klikuNaNi++ % 2 ? otocSe : ukloniSe)(d, t);
};
/** Zafouká od místa, kam se kliklo: plamínek skoro zhasne a ona ho jde zakrýt rukávem. */
const zafoukej = (d, t, k, Z) => {
  const smer = k.x < Z.L[0] ? 1 : -1;
  d.poryv = smer * 1.25;
  d.fukT = t;
  d.sfoukDo = t + 0.75;
  d.om += smer * 2;
  d.lek = t;
  for (const m of d.mury) m.odfuk += smer * (10 + d.nahoda() * 12);
  zavan(d, k, smer);
  pustListek(d, Z);
  hraj(d, "fuk", 0.7, k.x);
  hraj(d, "ach", 0.5, FX, { za: 0.12 });
  if (d.rezim === "jde" || d.rezim === "kanzashi" || d.rezim === "ohled" || d.rezim === "kryje") zacni(d, t, "kryje");
};
const klik = (d, t, k, Z) => {
  if (!Number.isFinite(k.x) || !Number.isFinite(k.y)) return;
  /* z klávesnice přijde přesný střed plochy: střídá lucernu, úklonu, vítr a otočku */
  if (k.x === 90 && k.y === 90) return [zaplan, klikNaNi, (dd, tt, ZZ) => zafoukej(dd, tt, { x: 150, y: 80 }, ZZ), klikNaNi][d.klavesa++ % 4](d, t, Z);
  if (Math.hypot(k.x - Z.L[0], k.y - Z.L[1]) < 17) return zaplan(d, t, Z);
  const [x, y] = doPostavy([k.x, k.y], Z.fig);
  if ((x > 55 && x < 125 && y > 56 && y < 160) || (x > 78 && x < 116 && y > 16 && y <= 56)) return klikNaNi(d, t);
  return zafoukej(d, t, k, Z);
};

const krok = (dyn, t, dt, vstup = {}) => {
  if (!(dt > 0)) return;
  const d = dyn, R = d.nahoda;
  const mys = vstup.mys && Number.isFinite(vstup.mys.x) && Number.isFinite(vstup.mys.y) ? vstup.mys : null;
  /* rychlost kurzoru: kdo jím mávne, udělá vítr */
  const vm = mys && d.mysP ? [(mys.x - d.mysP[0]) / dt, (mys.y - d.mysP[1]) / dt] : [0, 0];
  d.mysP = mys ? [mys.x, mys.y] : null;
  d.mysV = d.mysV.map((q, i) => kCili(q, clamp(vm[i], -600, 600), dt, 0.09));
  if (vstup.kliky && vstup.kliky.length) {
    const Z0 = poza(d, t);
    for (const k of vstup.kliky) klik(d, t, k, Z0);
    vstup.kliky.length = 0;
  }

  /* ——— co zrovna dělá ——— */
  const u = t - d.od, uP = u - dt;
  let stoj = false, cilNatoc = 0, cilUklon = 0, cilZdvih = 0;
  const gesta = { smich: t - d.smichOd < 1.45 ? 1 : 0, kanz: 0, kryt: 0, uklon: 0 };
  d.skok = 0;
  if (d.rezim === "jde") {
    d.doKanz -= dt;
    d.doOhled -= dt;
    if (d.fronta) {
      const co = d.fronta;
      d.fronta = null;
      (co === "otocka" ? otocSe : ukloniSe)(d, t);
    } else if (!mys && d.doKanz <= 0) zacni(d, t, "kanzashi");
    else if (!mys && d.doOhled <= 0) zacni(d, t, "ohled");
  } else if (d.rezim === "uklona") {
    stoj = true;
    cilNatoc = u > UKL.celem && u < UKL.zpet ? 5 - YAW0 : 0;
    cilUklon = u > UKL.dolu && u < UKL.nahoru ? 1 : 0;
    gesta.uklon = u > 0.3 && u < UKL.zpet - 0.1 ? 1 : 0;
    if (pres(uP, u, UKL.dolu)) hraj(d, "latka", 0.5, FX);
    if (pres(uP, u, UKL.dolu + 0.28)) hraj(d, "zvon", 0.5, FX);
    if (pres(uP, u, UKL.nahoru + 0.15)) hraj(d, "struna", 0.5, FX, { vys: 5 });
    if (u > UKL.konec) zacni(d, t, "jde");
  } else if (d.rezim === "otocka") {
    stoj = true;
    if (u > OTOCKA.start) d.otCil = u < OTOCKA.dal ? OTOCKA.zady : 360;
    d.skok = 2 * Math.sin(Math.PI * clamp((u - 0.05) / 1.75));
    cilZdvih = 3;
    for (const kdy of [0.3, 0.55, 1.02, 1.27, 1.52]) if (pres(uP, u, kdy)) hraj(d, "klap", 0.4, FX, { vys: d.kroku++ % 2 });
    if (pres(uP, u, 0.5)) hraj(d, "cink", 0.4, FX, { vys: 3 });
    if (pres(uP, u, OTOCKA.dal)) hraj(d, "latka", 0.6, FX);
    if (u > OTOCKA.konec) {
      /* celá otáčka je zpátky tam, kde začala */
      if (d.ot.a > 180) d.ot.a -= 360;
      d.otCil = 0;
      d.mrkOd = t;
      hraj(d, "cink", 0.45, FX, { vys: 5 });
      zacni(d, t, "jde");
    }
  } else if (d.rezim === "kryje") {
    stoj = true;
    gesta.kryt = u > 0.12 && u < 1.3 ? 1 : 0;
    if (pres(uP, u, 0.2)) hraj(d, "latka", 0.6, FX + 20);
    if (pres(uP, u, 0.95)) {
      /* za rukávem se plamínek zase chytí */
      d.zar = Math.min(2, d.zar + 0.4);
      d.radost = t;
      hraj(d, "plamen", 0.6, FX + 40);
    }
    if (u > 1.75) zacni(d, t, "jde");
  } else if (d.rezim === "kanzashi") {
    stoj = true;
    gesta.kanz = u > 0.2 && u < 1.3 ? 1 : 0;
    [0.62, 0.86, 1.12].forEach((kdy, i) => {
      if (!pres(uP, u, kdy)) return;
      hraj(d, "cink", 0.4, FX - 8, { vys: [1, 4, 2][i] });
      d.snury[i].v += (i % 2 ? -1 : 1) * 2.6;
    });
    if (u > 1.75) {
      zacni(d, t, "jde");
      d.doKanz = 17 + R() * 11;
      d.doOhled = Math.max(d.doOhled, 6);
    }
  } else if (d.rezim === "ohled") {
    stoj = true;
    cilNatoc = u > 0.12 && u < 1.15 ? -74 : 0;
    if (pres(uP, u, 0.2)) hraj(d, "struna", 0.35, FX, { vys: 6 });
    if (u > 1.8) {
      zacni(d, t, "jde");
      d.doOhled = 25 + R() * 14;
      d.doKanz = Math.max(d.doKanz, 6);
    }
  }
  d.stoji = stoj;
  pruzina(d.natoc, cilNatoc, dt, { tuhost: 70, utlum: 14 });
  pruzina(d.ot, d.otCil, dt, { tuhost: 34, utlum: 10.5 });
  /* v chůzi se ukloní jen zlehka, tomu, kdo se u ní zastavil */
  d.uklon = kCili(d.uklon, Math.max(cilUklon, 0.6 * pulz(t - d.pokyvOd, 0, 0.95)), dt, 0.11);
  d.zdvih = kCili(d.zdvih, cilZdvih, dt, 0.15);
  for (const k of Object.keys(gesta)) d.g[k] = kCili(d.g[k], gesta[k], dt, gesta[k] ? 0.09 : 0.13);

  /* ——— chůze ——— */
  const rovnaP = d.rovna;
  d.rovna = clamp(d.rovna + (stoj ? dt / 0.18 : -dt / 0.16));
  if (stoj && rovnaP < 1 && d.rovna >= 1) {
    /* dostoupla: obě nohy vedle sebe */
    d.fi = FI_VYKROC;
    d.dosed.v -= 0.5;
    hraj(d, "klap", 0.4, FX, { vys: d.kroku++ % 2 });
  }
  const jde = 1 - d.rovna, fiP = d.fi;
  if (!stoj) d.fi = cyk(d.fi + dt / KROK_T);
  d.posuv = stoj ? 0 : RYCHLOST * jde;
  const chod = d.posuv / RYCHLOST;
  let doslap = 0;
  if (!stoj && jde > 0.6) {
    for (const n of NOHY) {
      if (cyk(d.fi - n.faze) >= cyk(fiP - n.faze)) continue;
      /* dřevák došlápl: klap, tělo se zhoupne a na cestě zůstane otisk */
      const hloubka = -n.strana * Math.sin(rad(YAW0));
      const x = FX + n.strana * ROZKROK * Math.cos(rad(YAW0)) * K + KROK, y = ZEM + 0.3 + hloubka * 1.1;
      d.dosed.v -= 0.45;
      doslap = n.strana;
      hraj(d, "klap", 0.3 + 0.1 * R(), x, { vys: d.kroku++ % 2 });
      if (d.stopy.length < 18) d.stopy.push({ x, y, vek: 0 });
    }
  }
  pruzina(d.dosed, 0, dt, { tuhost: 300, utlum: 17 });
  d.dosed.a = clamp(d.dosed.a, -0.07, 0.05);

  /* ——— vítr: mávnutí myší a poryv po kliknutí ——— */
  const rychl = Math.hypot(d.mysV[0], d.mysV[1]);
  const cilVitr = (mys && rychl > 170 ? clamp(d.mysV[0] / 280, -1.3, 1.3) : 0) + d.poryv;
  d.poryv = kCili(d.poryv, 0, dt, 0.35);
  const vitrP = d.vitr;
  d.vitr = clamp(kCili(d.vitr, cilVitr, dt, Math.abs(cilVitr) > Math.abs(d.vitr) ? 0.1 : 0.45), -1.6, 1.6);
  if (Math.abs(d.vitr) > 0.5 && Math.abs(vitrP) <= 0.5 && t - d.fukT > 0.9) {
    d.fukT = t;
    hraj(d, "fuk", clamp(0.35 + 0.3 * Math.abs(d.vitr)), mys ? mys.x : 90);
    if (mys) zavan(d, mys, Math.sign(d.vitr));
  }
  const vitr = d.vitr + 0.05 * Math.sin(t * 0.83) + 0.03 * Math.sin(t * 1.9 + 1);
  d.sklon.v += 70 * d.vitr * dt;
  pruzina(d.sklon, 0, dt, { tuhost: 60, utlum: 9 });
  d.sklon.a = clamp(d.sklon.a, -7, 7);

  /* ——— póza a bližší ručka ——— */
  let Z = poza(d, t);
  const cil = cilRuky(d, t, Z.yaw, Z.Lf);
  d.ruka = d.ruka.map((q, i) => kCili(q, cil[i], dt, 0.075));
  Z = poza(d, t);

  /* ——— co na ní visí: každé kyvadlo rozhoupá zrychlení místa, kde je uvázané ——— */
  const aHlava = zrychleni(d.sled.hlava, Z.hlava, dt), aZada = zrychleni(d.sled.zada, Z.zada, dt);
  const aRuka = zrychleni(d.sled.ruka, Z.zapesti[0], dt), aRukaL = zrychleni(d.sled.rukaL, Z.zapesti[1], dt);
  /* při chůzi táhne vzduch všechno dozadu, vítr po větru; každý došlap jimi cukne */
  const tah = -chod + 4.6 * vitr;
  if (doslap) {
    for (const p of d.rukavy) p.v -= 0.16;
    d.snury.forEach((p, i) => (p.v -= 0.5 + 0.25 * i));
    d.masle.v += 0.5 * doslap;
    d.vetev.v -= 26;
  }
  kyvadlo(d.rukavy[0], aRuka[0], dt, { om2: 19, utlum: 2, cit: 0.05, tah: 2.2 * tah, mez: 0.75 });
  kyvadlo(d.rukavy[1], aRukaL[0], dt, { om2: 21, utlum: 2.1, cit: 0.05, tah: 1.9 * tah, mez: 0.75 });
  [[62, 1.5], [50, 1.3], [74, 1.7]].forEach(([om2, utlum], i) => kyvadlo(d.snury[i], aHlava[0], dt, { om2, utlum, cit: 0.03, tah: (9 + i) * tah, mez: 1.05 }));
  kyvadlo(d.masle, aZada[0], dt, { om2: 16, utlum: 2.2, cit: 0.035, tah: 3.2 * tah, mez: 1 });
  /* větvička pruží: ohne se proti zrychlení hrdla a po větru */
  d.vetev.v += (-0.5 * aHlava[0] + 150 * vitr - 20 * chod) * dt;
  pruzina(d.vetev, 0, dt, { tuhost: 95, utlum: 7 });
  d.vetev.a = clamp(d.vetev.a, -16, 16);
  /* plíšky cinknou, když se šňůry rozlétnou, a rukáv zašustí, když sebou švihne */
  if (Math.abs(d.snury[1].v) > 3.4 && t - d.cinkT > 0.5) {
    d.cinkT = t;
    hraj(d, "cink", clamp(Math.abs(d.snury[1].v) / 9, 0.2, 0.5), Z.hlava[0], { vys: Math.floor(R() * 6) % 6 });
  }
  if (Math.max(Math.abs(d.rukavy[0].v), Math.abs(d.rukavy[1].v)) > 2.6 && t - d.latkaT > 0.7) {
    d.latkaT = t;
    hraj(d, "latka", 0.35, FX);
  }

  /* ——— lucerna: kyvadlo, které rozhoupe zrychlení špičky tyčky ——— */
  const aT = zrychleni(d.sled.T, Z.T, dt);
  const blizko = mys ? smooth(1 - Math.hypot(mys.x - Z.L[0], mys.y - Z.L[1]) / 50) : 0;
  /* měkké meze: k Vázičce se rozhoupe míň než od ní */
  const mimo = d.th < MEZE_TH[0] ? d.th - MEZE_TH[0] : d.th > MEZE_TH[1] ? d.th - MEZE_TH[1] : 0;
  const alfa = (-aT[0] * 0.5 * Math.cos(d.th) - (G - clamp(aT[1], -120, 120) * 0.5) * Math.sin(d.th)) / ZAVES - (1.1 + (mimo ? 7 : 0)) * d.om - 140 * mimo + 2.4 * vitr - 0.35 * chod + clamp(d.mysV[0] * 0.05, -9, 9) * blizko;
  d.om = clamp(d.om + alfa * dt, -6, 6);
  d.th += d.om * dt;
  if (d.th < MEZE_TH[0] - 0.12 || d.th > MEZE_TH[1] + 0.12) {
    d.th = clamp(d.th, MEZE_TH[0] - 0.12, MEZE_TH[1] + 0.12);
    d.om *= -0.25;
  }
  d.zar = kCili(d.zar, 0, dt, 0.42);
  /* plamen: vítr ho přikrčí, po kliknutí vedle skoro zhasne a drží se jen tak tak */
  const cilSfouk = t < d.sfoukDo ? 1 : clamp(0.5 * Math.abs(d.vitr) - 0.15);
  d.sfouk = kCili(d.sfouk, cilSfouk, dt, cilSfouk > d.sfouk ? 0.07 : 0.4);

  /* ——— můry krouží kolem světla; zvědavá odletí za kurzorem ——— */
  const [mx, my] = mys ? doPostavy([mys.x, mys.y], Z.fig) : [0, 0];
  const naNi = !!mys && mx > 56 && mx < 124 && my > 58 && my < 152;
  const L = naLucernu(Z.T, d.th, STRED_L);
  for (const m of d.mury) {
    /* do tváře jí ale neleze: když je kurzor na Vázičce, zůstane můra na půl cesty */
    const zved = m.zved * (naNi ? 0.4 : 1);
    const kam = mys && zved > 0 ? [lerp(L[0], mys.x, zved), lerp(L[1], mys.y, zved)] : L;
    m.c = [kCili(m.c[0], kam[0], dt, 0.5), kCili(m.c[1], kam[1], dt, 0.5)];
    m.r = kCili(m.r, (m.r0 + 3 * Math.sin(t * m.w + m.fz)) * (mys && zved > 0.5 ? 0.5 : 1), dt, 0.45);
    m.rozprch = kCili(m.rozprch, 0, dt, 0.75);
    m.odfuk = kCili(m.odfuk, 0, dt, 0.9);
    m.a += m.smer * m.va * dt * (1 + 0.4 * Math.sin(t * m.w * 1.7 + m.fz));
    const xP = m.x;
    obehMury(m, t);
    m.vx = kCili(m.vx, (m.x - xP) / dt, dt, 0.1);
  }

  /* ——— co zůstává na cestě a co létá ——— */
  d.doListku -= dt * (chod + 2.5 * Math.abs(d.vitr));
  if (d.doListku <= 0) {
    d.doListku = 3.2 + R() * 4;
    pustListek(d, Z);
  }
  for (const l of d.listky) {
    l.vek += dt;
    if (l.lezi) {
      l.x -= (d.posuv - 34 * d.vitr) * dt;
      continue;
    }
    l.vx = kCili(l.vx, -0.8 * d.posuv + 55 * d.vitr + 7 * Math.sin(l.vek * 3.1 + l.fz), dt, 0.5);
    l.vy = kCili(l.vy, 25 + 6 * Math.sin(l.vek * 4.3 + l.fz), dt, 0.3);
    l.x += l.vx * dt;
    l.y += l.vy * dt;
    l.rot += l.vr * dt;
    if (l.y >= l.zem) {
      l.y = l.zem;
      l.lezi = true;
    }
  }
  d.listky = d.listky.filter((l) => l.x > 5 && l.x < 177 && l.vek < 16);
  for (const p of d.stopy) {
    p.vek += dt;
    p.x -= d.posuv * dt;
  }
  d.stopy = d.stopy.filter((p) => p.x > 8 && p.vek < 10);
  for (const j of d.jiskry) {
    j.vek += dt;
    j.x += j.vx * dt;
    j.y += j.vy * dt;
    j.vx *= 1 - Math.min(1, dt * 2.4);
    j.vy *= 1 - Math.min(1, dt * 2.4);
  }
  d.jiskry = d.jiskry.filter((j) => j.vek < j.zivot);
  for (const v of d.vanek) v.vek += dt;
  d.vanek = d.vanek.filter((v) => v.vek < v.zivot);

  /* ——— kurzor se u ní zastavil: napoprvé se zasměje do rukávu, podruhé se v chůzi ukloní ——— */
  d.klidMys = naNi && rychl < 45 ? d.klidMys + dt : 0;
  if (d.rezim === "jde" && d.klidMys > 0.5 && t > d.doPozdravu) {
    d.doPozdravu = t + 4.6;
    d.klidMys = 0;
    if (d.pozdravu++ % 2 === 0) {
      d.smichOd = t;
      hraj(d, "latka", 0.4, FX);
      hraj(d, "smich", 0.6, FX, { za: 0.3 });
    } else {
      d.pokyvOd = t;
      hraj(d, "struna", 0.35, FX, { vys: 4, za: 0.2 });
    }
  }

  /* ——— pohled: za kurzorem, jinak na to, co dělá ——— */
  const smerem = (B) => [clamp((B[0] - Z.tvar[0]) / 34, -1, 1) * 2, clamp((B[1] - Z.tvar[1]) / 34, -1, 1) * 1.4];
  let cp = mys ? smerem([mys.x, mys.y]) : [0, 0];
  if (d.rezim === "uklona") cp = u > UKL.dolu - 0.1 && u < UKL.nahoru ? [0, 1.3] : [0, 0];
  else if (d.rezim === "kryje") cp = smerem(L);
  else if (d.rezim === "ohled") cp = [-1.5, 0.2];
  else if (t - d.zaplanT < 0.9) cp = smerem(L);
  d.pohled = d.pohled.map((q, i) => kCili(q, cp[i], dt, 0.09));
};
/** Jak se tváří podle toho, co zrovna dělá. */
const vyraz = (d, t) => {
  const u = t - d.od;
  if (t - d.lek < 0.5) return "uzas";
  if (d.g.smich > 0.35) return "stydi";
  if (d.rezim === "uklona") return u < UKL.dolu ? "kouka" : u < UKL.nahoru + 0.12 ? "klid" : "usmev";
  if (d.rezim === "otocka") return "usmev";
  if (t - d.mrkOd < 0.8) return "mrk";
  if (d.rezim === "kryje") return u < 0.95 ? "kouka" : "usmev";
  if (d.rezim === "kanzashi") return u > 0.55 && u < 1.45 ? "usmev" : "klid";
  if (d.rezim === "ohled") return u > 0.2 && u < 1.4 ? "kouka" : "klid";
  if (t - d.radost < 1) return "usmev";
  if (d.uklon > 0.2) return "klid";
  return d.mysP ? "kouka" : "klid";
};
const stav = (t, vstup = {}, dyn) => {
  const d = dyn || novaDynamika();
  const Z = poza(d, t);
  /* plamen se mihotá; sfouknutý se drží jen tak tak a třepe se */
  const S = (0.9 + 0.06 * Math.sin(t * 5.3) + 0.04 * Math.sin(t * 11.7 + 1) + 0.025 * Math.sin(t * 23.3 + 2)) * (1 - 0.9 * d.sfouk * (0.82 + 0.18 * Math.sin(t * 34))) + d.zar;
  const AP = rameno(-1, Z.yawQ), AL = rameno(1, Z.yawQ);
  const maslePred = Math.cos(rad(180 + Z.yawQ)) > 0;
  return {
    t, yaw: Z.yaw, yawQ: Z.yawQ, sn: Math.sin(rad(Z.yawQ)), cs: Z.cs, fig: Z.fig, nohy: Z.nohy, skok: d.skok, uklon: d.uklon, rezim: d.rezim, posuv: d.posuv,
    T: Z.T, L: Z.L, Lf: Z.Lf, th: d.th, lucZa: Z.lucZa, S, zar: d.zar, vitr: d.vitr,
    /* plocha končí na 180: když se lucerna rozhoupe ke kraji, záře zeslábne, ať ji kraj neusekne natvrdo */
    uKraje: clamp((180 - 12 - Z.L[0]) / 24) * clamp((Z.L[0] - 12) / 24),
    plamen: {
      r: clamp(-9 * d.om - 16 * d.vitr, -30, 30) + 4 * Math.sin(t * 7.7) + 14 * d.sfouk * Math.sin(t * 29),
      sx: 1 - 0.05 * Math.sin(t * 13.1) + 0.2 * clamp(d.zar) - 0.2 * d.sfouk,
      sy: Math.max(0.3, 1 + 0.09 * Math.sin(t * 13.1) + 0.06 * Math.sin(t * 29.3 + 1) + 0.45 * clamp(d.zar) - 0.5 * d.sfouk),
    },
    paze: [
      { A: AP, H: d.ruka, kyv: deg(d.rukavy[0].a), strana: Math.sin(rad(Z.yawQ - 90)) > 0.05 ? 1 : -1, za: AP[2] < -0.3, sirka: RUKAV * (1 - 2 * smooth(d.g.kanz)), tyc: null },
      { A: AL, H: Z.Hl, kyv: deg(d.rukavy[1].a), strana: Math.sin(rad(Z.wL)) < -0.05 ? -1 : 1, za: AL[2] < -0.3, sirka: RUKAV, tyc: Z.Tf },
    ],
    kyvSnur: d.snury.map((p) => deg(p.a)),
    /* mašle je zepředu zrcadlově: houpe se pořád stejným směrem v ploše */
    kyvMasle: f(clamp(d.masle.a * 1.6, -1, 1) * (maslePred ? 1 : -1)),
    /* větvička se s otočkou zužuje a překlopí, ale ani z boku z ní není jen čárka */
    kyvVetve: d.vetev.a, vetevSx: Math.tanh(2.6 * Math.cos(rad(Z.yaw - YAW0))) / Math.tanh(2.6),
    vyraz: vyraz(d, t), pohled: d.pohled, mrk: mrkani(t, [1.3, 4.2, 4.45, 7.4], 8.6),
    /* po smíchu a když plamen zaplane, se červená víc */
    tvare: clamp(0.5 + 0.2 * d.g.smich + 0.15 * clamp(d.zar)),
    mury: d.mury.map((m) => ({
      x: m.x, y: m.y, z: m.z, sc: 1 + m.z * 0.14, nakl: 14 * Math.sin(t * 2.1 + m.fz) + clamp(m.vx * 0.5, -24, 24),
      mav: Math.abs(Math.sin(t * 19 + m.fz)), sv: clamp(S) * clamp(1.3 - Math.hypot(m.x - Z.L[0], m.y - Z.L[1]) / 40),
    })),
    stopy: d.stopy.map((p) => ({ x: p.x, y: p.y, op: clamp(Math.min(p.vek / 0.15, (p.x - 8) / 18, (10 - p.vek) / 3)) })),
    letici: d.listky.filter((l) => !l.lezi).map((l) => ({ x: l.x, y: l.y, rot: l.rot, s: l.s, svetly: l.svetly, op: clamp(Math.min(l.vek / 0.2, (l.x - 5) / 14)) })),
    lezici: d.listky.filter((l) => l.lezi).map((l) => ({ x: l.x, y: l.y, rot: l.rot, s: l.s, svetly: l.svetly, op: clamp(Math.min((l.x - 5) / 18, (16 - l.vek) / 3)) })),
    jiskry: d.jiskry, vanek: d.vanek.filter((v) => v.vek >= 0),
  };
};
const snimek = (st) => Math.floor(st.t * 30);
const pohybTela = (st) => ({ x: st.fig.x, y: st.fig.y, r: st.fig.r, sx: st.fig.sx, sy: st.fig.sy, ox: FX, oy: ZEM });
const jeTuNeco = (st) => (st.letici.length || st.jiskry.length || st.vanek.length || st.zar > 0.03 ? snimek(st) : -1);

export const lampion = {
  id: "lampion",
  viewBox: "0 0 180 180",
  defs,
  novaDynamika,
  krok,
  stav,
  /* když zafouká, zahučí to */
  hukot: (st) => ({ vitr: f(clamp(0.05 + 0.8 * Math.abs(st.vitr))) }),
  klidne: { t: 7.2 },
  /** Rychlost chůze pro průvod: o kolik šířek kresby se má za sekundu posunout, když jde. Když stojí, klaní se nebo se točí, cesta stojí: stav().posuv je okamžitá rychlost cesty v jednotkách plochy za sekundu. */
  rychlost: RYCHLOST / 180,
  vrstvy: [
    { id: "zem", kresli: vrstvaZem, klic: snimek },
    { id: "zare", kresli: vrstvaZare, pohyb: (st) => ({ x: st.L[0] - L0[0], y: st.L[1] - L0[1], r: 0, sx: 1 + 0.2 * Math.max(0, st.S - 1), sy: 1 + 0.2 * Math.max(0, st.S - 1), ox: L0[0], oy: L0[1] }), pruhlednost: (st) => f(clamp(0.9 * st.S) * st.uKraje) },
    { id: "mury-za", kresli: vrstvaMury(false), klic: snimek },
    ...lucernaVrstvy(true),
    { id: "masle-za", kresli: vrstvaMasleZa, klic: (st) => `${st.yawQ},${Math.round(st.kyvMasle * 30)}`, pohyb: pohybTela },
    /* dřeváky: vzdálenější dřív */
    { id: "okobo-za", kresli: vrstvaOkobo, klic: (st) => st.yawQ, pohyb: pohybOkobo(0) },
    { id: "okobo-pred", kresli: vrstvaOkobo, klic: (st) => st.yawQ, pohyb: pohybOkobo(1) },
    { id: "rukav-za", kresli: vrstvaRukavZa, klic: snimek, pohyb: pohybTela },
    { id: "vetvicka", kresli: vrstvaVetvicka, pohyb: pohybVetvicky },
    { id: "telo", kresli: vrstvaTelo, klic: (st) => st.yawQ, tezka: true, pohyb: pohybTela },
    { id: "svit", kresli: vrstvaSvit, klic: (st) => `${Math.round(st.Lf[0] / 3)},${Math.round(st.Lf[1] / 3)},${Math.round(clamp(st.S, 0, 1.5) * 8)},${st.lucZa}`, pohyb: pohybTela },
    { id: "tvar", kresli: vrstvaTvar, klic: (st) => `${st.yawQ},${st.vyraz},${Math.round(st.pohled[0] * 8)},${Math.round(st.pohled[1] * 8)},${st.vyraz === "kouka" || st.vyraz === "mrk" ? f1(st.mrk) : 0},${Math.round(st.tvare * 20)}`, pohyb: pohybTela },
    { id: "pred", kresli: vrstvaPred, klic: snimek, pohyb: pohybTela },
    ...lucernaVrstvy(false),
    { id: "mury-pred", kresli: vrstvaMury(true), klic: snimek },
    { id: "castice", kresli: vrstvaCastice, klic: jeTuNeco },
  ],
};
