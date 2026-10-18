/*
 * 03, Lampion — KAPKA NESE HROM V LUCERNĚ
 *
 * Jako Pecinka s čóčinem a Cedulka s andonem z průvodu na Domku 2. Kapka
 * jde deštěm v dřevěných geta a na bambusové tyči nese kulatý sváteční
 * čóčin: černé lakované obruče nahoře a dole, bambusová žebra, rumělkové
 * pruhy, erb mitsudomoe jako na bubnech a střapec. Svíčku v něm nemá.
 * Zavřela si do něj kousek hromu: bledě zlaté světlo, které se mihotá jako
 * blýskání na časy a s každým došlapem blikne. Papírem občas prosvitne
 * klikatý výboj — po stranách erbu, protože tuš světlo nepustí.
 *
 * Bez pozadí: Kapka chodí, takže cestu jí dělá stránka, kam ji kdo postaví
 * — v průvodu ji posouvá CSS, sama jen kráčí na místě, natočená o 38° ke
 * směru chůze (doprava jako ostatní). Kapka je rotační, takže natočení je
 * vidět jinde než na těle: tvář má posunutou do směru chůze, bližší ručka
 * je před tělem a drží paličku, vzdálenější vykukuje zpoza boku a drží tyč,
 * a hlavně kruh bubnů na zádech je z boku elipsa. Bubny mají tloušťku,
 * bližší jsou větší, vzdálenější mizí za tělem a mitsudomoe se na nich
 * točí dál. Pod ní je jen stín a kaluž světla z lucerny.
 *
 * Nic na ní nevisí napevno. Lucerna je kyvadlo na špičce tyče a rozhoupává
 * ji to, jak se špička hýbe; střapec jde za ní se zpožděním. Kruh bubnů na
 * zádech nadskočí o chvilku později než tělo. Stuha v barvách soumraku je
 * uvázaná na kruhu a vlaje za ní — je to provaz ze společných kusů. A tělo
 * je kapka vody: po každém došlapu se zavlní.
 *
 * Jde si svým vlastním deštěm: pár kapek v barvách značky, pod každou se
 * na cestě rozběhne kolo, a kam došlápne geta, tam to cákne. Sem tam jedna
 * kapka spadne na buben a ten si ťukne sám. Jednou za čas si za chůze
 * dvakrát ťukne paličkou i Kapka, hrom v lucerně jí odpoví a chvilku prší
 * víc — „Bubnuju já. Prší potom samo.“ A když cesta přiveze louži, skočí
 * do ní oběma nohama, až voda vyletí do stran.
 *
 * Myš: Kapka kouká za kurzorem a lucernu k němu natáhne, světlo v papíru
 * se za ním nakloní. Rychlé mávnutí myší je vítr: rozhoupe lucernu
 * a rozevlaje stuhu.
 * Kliknutí: Kapka povyskočí a bouchne paličkou do nejbližšího bubnu. Po
 * kruhu se rozezní ostatní, hrom v lucerně zaplane a zaduní a spustí se
 * přeháňka. Čtvrtá rána v řadě je hromobití: lucerna se rozzáří celá,
 * Kapka zůstane koukat a pak se rozesměje. Kdo tlačítko myši drží, víří.
 * Kliknutí na lucernu: hrom uvnitř se lekne, lucerna odskočí a zapraská —
 * a Kapka se lekne s ním.
 *
 * Co se nemění (tělo, kruh s bubny, geta, ručky, tyč, lucerna, střapec),
 * kreslí se jednou a běh s tím jen hýbe. Rozsvícený papír leží přes zhasnutý
 * a prolíná se do něj průhledností vrstvy, stejně jako světlo na Kapčině
 * boku. Filtry tu nejsou žádné.
 */
import {
  f, rng, clamp, lerp, smooth, rad, deg, mix, pt, cara, vzorkuj, pasPoBodech, hrouda, kCili, mrkani, jiskraD, kapickaD, HUSTOTA,
  TELO, VODA, KAP, RAMENA, ZLUTA, tomoe,
  kapDefs, kapTelo, kapTvar, naGeta, getaSvg, chodidloSvg, kapRuka, svih,
  bubenDefs, bubenSvg, znakBubnu, stuhaDefs, stuhaSvg, novyProvaz, krokProvazu, hodProvazem,
} from "./spolecne.js";

const ID = "khl";
const ZEM = 160;
/* kde v ploše stojí a jak je velká; kresba Kapky je 0–180 a zuby geta končí na KAP.pata */
const FX = 85, K = 0.78;
const POSTAVA = `translate(${FX} ${ZEM}) scale(${K}) translate(-90 -${KAP.pata})`;
const vPostave = (s) => `<g transform="${POSTAVA}">${s}</g>`;
const cyk = (x) => ((x % 1) + 1) % 1;
const pan = (x) => clamp((x - 90) / 90, -1, 1);
/** Tlumená pružina k cíli: p je { a, v }. */
const pruzina = (p, cil, dt, { tuhost, utlum }) => {
  p.v += ((cil - p.a) * tuhost - p.v * utlum) * dt;
  p.a += p.v * dt;
};
/* natočení ke směru chůze */
const NATOCENI = rad(38), COS = Math.cos(NATOCENI), SIN = Math.sin(NATOCENI);
/* tvář je posunutá do směru chůze a trochu zúžená */
const TVAR_DX = 8.6, TVAR_SX = 0.9;
const OCI = [98, 95];

/** Bod z kresby Kapky (0–180) do panelu i s tím, jak se tělo právě houpe, naklání a mačká. */
const FIG0 = { x: 0, y: 0, r: 0, sx: 1, sy: 1 };
const naTelo = ([x, y], fig) => {
  const dx = (x - 90) * K * fig.sx, dy = (y - KAP.pata) * K * fig.sy;
  const c = Math.cos(rad(fig.r)), s = Math.sin(rad(fig.r));
  return [FX + fig.x + dx * c - dy * s, ZEM + fig.y + dx * s + dy * c];
};
const zPostavy = (p) => naTelo(p, FIG0);

/* ——— Chůze na geta ———
   Dvojkrok trvá KROK_T. Noha je OPORA z něj na zemi a jede s cestou
   dozadu, zbytek času se zvedne, přenese dopředu a geta se překlopí z paty
   na špičku. Bližší noha je ta vlevo (Kapka je k nám natočená pravým
   bokem), vzdálenější je o kousek výš a kreslí se dřív. */
const KROK_T = 0.92, KROK = 8.2, OPORA = 0.58, ZDVIH = 6.2;
const NOHY = [{ x: -10 * COS, dy: 1.2, faze: 0, blizko: true }, { x: 10 * COS, dy: -1.2, faze: 0.5, blizko: false }];
const NOHA0 = NOHY.map((n) => zPostavy([90 + n.x, KAP.pata + n.dy]));
/** Jak rychle ujíždí cesta pod nohama (v panelu za sekundu) — tak rychle by ji měl posouvat průvod. */
const RYCHLOST = (2 * KROK * K) / (OPORA * KROK_T);
/* z téhle fáze se po doskoku vykročí: bližší noha je uprostřed opory, vzdálenější se právě zvedá */
const FI_VYKROC = OPORA / 2;
const noha = (n, fi, jde) => {
  const u = cyk(fi - n.faze);
  if (u < OPORA) return { dx: lerp(KROK, -KROK, u / OPORA) * jde, zved: 0, nakl: 0 };
  const k = (u - OPORA) / (1 - OPORA);
  return { dx: lerp(-KROK, KROK, smooth(k)) * jde, zved: ZDVIH * Math.sin(Math.PI * k) * jde, nakl: lerp(16, -12, smooth(k)) * Math.pow(Math.sin(Math.PI * k), 0.7) * jde };
};
/* skok do louže a poskok při ráně do bubnu: přikrčení, let, dopad */
const SKOK_LOUZE = { priprava: 0.16, doba: 0.5, vyska: 13, typ: "louze" };
const SKOK_RANA = { priprava: 0.06, doba: 0.34, vyska: 6, typ: "rana" };

/* ——— Kruh bubnů na zádech, z boku ———
   Leží v rovině kolmé na směr chůze, kus za zády: střed má posunutý dozadu
   (vlevo) a na šířku je zúžený na cos 38°. Bubnů je na kruhu sedm jako
   v podobě Kami; dva spodní jsou celé schované za tělem, a tak se nekreslí.
   Co je vlevo, je k nám blíž, a proto o chlup větší. */
const KS = [90 - 13 * SIN, 62], KR = 46, BR = 13.6, BT = 8.4, KUZE = (11.7 * BR) / 15.4;
const naKruhu = (u, r = KR) => [KS[0] + r * Math.cos(rad(u)) * COS, KS[1] + r * Math.sin(rad(u))];
const BUBNY = [-2, -1, 0, 1, 2].map((k, i) => {
  const u = 270 + (k * 360) / 7, c = Math.cos(rad(u)), m = 1 - 0.07 * c;
  const [x, y] = naKruhu(u);
  /* čelo s kůží je posunuté o půl tloušťky dopředu, záda dozadu */
  return { i, u, y, m, rx: BR * COS * m, ry: BR * m, xp: x + (BT / 2) * SIN * m, xz: x - (BT / 2) * SIN * m, dal: c };
});
/* vzdálenější se kreslí dřív */
const PORADI = [...BUBNY].sort((a, b) => b.dal - a.dal).map((b) => b.i);
const BUBEN_X = BUBNY.map((b) => zPostavy([b.xp, b.y])[0]);
/* kde kruh zajíždí do zad: kolem toho bodu se kývá */
const CEP = [86, 102], C0 = zPostavy(CEP);
/* uzel stuhy: na kruhu vzadu, v mezeře mezi dvěma bližšími bubny */
const UZEL = naKruhu(193);
const OBRUC = (() => {
  const B = [];
  for (let u = 90; u <= 450; u += 5) B.push(naKruhu(u));
  /* začíná i končí dole za tělem; vlevo, kde je blíž, je silnější */
  return pasPoBodech(B, (s) => 3.7 * (1 - 0.16 * Math.cos(rad(90 + 360 * s))));
})();
const kruhV = (d, fig) => {
  const c = naTelo(CEP, fig);
  return { x: c[0] - C0[0], y: c[1] - C0[1] + d.kruhY.a, r: fig.r + d.kruh.a };
};
/** Bod na kruhu (v kresbě Kapky) v panelu, i s tím, jak se kruh právě kývá. */
const naKruh = (p, kr) => {
  const q = zPostavy(p), a = rad(kr.r), c = Math.cos(a), s = Math.sin(a);
  const dx = q[0] - C0[0], dy = q[1] - C0[1];
  return [C0[0] + kr.x + dx * c - dy * s, C0[1] + kr.y + dx * s + dy * c];
};

/* ——— Ručky ———
   Paže Kapka nemá, ručka je oblázek u boku. Bližší je před tělem a drží
   paličku: při chůzi se houpe proti noze, při ráně se rozmáchne k bližšímu
   bubnu. Vzdálenější vykukuje zpoza pravého boku a drží tyč. */
const RUKA_DX = 6, RUKA_DY = -2;
const RAMENO = [RAMENA.L[0] + RUKA_DX, RAMENA.L[1] + RUKA_DY];
const KLID_U = 116;
const UDER_U = deg(Math.atan2(BUBNY[0].y + 2.5 - RAMENO[1], BUBNY[0].xp - RAMENO[0])) + 360;
const RUKA_VODA = { ...VODA, zaklad: VODA.svetla };
const RAMENO0 = zPostavy(RAMENO);
const RUKA_T = [124.5, 96];

/* ——— Tyč a lucerna ———
   Lucerna v místních souřadnicích: háček na špičce tyče v počátku, osa dolů. */
const TYC = 57, TYC_ZA = 10, UHEL0 = -60, MEZE_UHEL = [-63, -48];
const LAMP = { hak: 5, kruh: [5, 8.6], telo: [8.6, 40.6], dno: [40.6, 44], r0: 7.6, rx: 18.2 };
const STRED_L = (LAMP.telo[0] + LAMP.telo[1]) / 2, VYSKA_L = (LAMP.telo[1] - LAMP.telo[0]) / 2;
/* tělo je elipsa seříznutá nahoře a dole tak, aby na ni sedly obruče */
const RY_L = VYSKA_L / Math.sqrt(1 - (LAMP.r0 / LAMP.rx) ** 2);
const polomerL = (y) => LAMP.rx * Math.sqrt(Math.max(0, 1 - ((y - STRED_L) / RY_L) ** 2));
const TELO_L =
  `M${-LAMP.r0} ${LAMP.telo[0]} A${LAMP.rx} ${f(RY_L)} 0 0 0 ${-LAMP.r0} ${LAMP.telo[1]} L${LAMP.r0} ${LAMP.telo[1]} A${LAMP.rx} ${f(RY_L)} 0 0 0 ${LAMP.r0} ${LAMP.telo[0]} Z`;
/* žebro: kroužek z bambusu, při pohledu trochu shora prohnutý dolů */
const PROHNUTI = 0.15;
const zebro = (y) => {
  const r = polomerL(y);
  return `M${f(-r)} ${f(y)} Q0 ${f(y + 2 * PROHNUTI * r)} ${f(r)} ${f(y)}`;
};
const ZEBRA = Array.from({ length: 12 }, (_, i) => zebro(LAMP.telo[0] + ((i + 1) * (LAMP.telo[1] - LAMP.telo[0])) / 13)).join(" ");
/* pruh papíru mezi dvěma výškami — rumělkové pásy pod horní a nad dolní obručí */
const pruhL = (y0, y1) => {
  const a = polomerL(y0), b = polomerL(y1);
  return `M${f(-a)} ${f(y0)} Q0 ${f(y0 + 2 * PROHNUTI * a)} ${f(a)} ${f(y0)} L${f(b)} ${f(y1)} Q0 ${f(y1 + 2 * PROHNUTI * b)} ${f(-b)} ${f(y1)} Z`;
};
/* erb je natočený jako Kapka: kousek vpravo od osy a zúžený */
const ERB = { x: 3, y: STRED_L + 1.6, sx: 0.88, r: 0.98 };
const ZAVES = 26, G = 380, MEZE_TH = [-0.15, 0.5];
const ZARE_R = 38;
const spicka = (H, uhel) => [H[0] + TYC * Math.cos(rad(uhel)), H[1] + TYC * Math.sin(rad(uhel))];
/** Bod lucerny (v souřadnicích háčku) v panelu: houpe se o úhel th kolem špičky T. */
const naLampe = (T, th, [x, y]) => [T[0] + x * Math.cos(th) + y * Math.sin(th), T[1] - x * Math.sin(th) + y * Math.cos(th)];
/* výchozí poloha dlaně, špičky a světla: v ní je tyč i lucerna nakreslená, běh je odtud posouvá a otáčí */
const H0 = zPostavy(RUKA_T), T0 = spicka(H0, UHEL0), L0 = naLampe(T0, 0, [0, STRED_L]), D0 = naLampe(T0, 0, [0, LAMP.dno[1]]);
const vLampe = (s) => `<g transform="translate(${pt(T0)})">${s}</g>`;
/* odkud svítí na Kapku: střed lucerny v souřadnicích jejího těla (uvnitř naGeta, proto o 12 níž) */
const SVIT_C = [90 + (L0[0] - FX) / K, KAP.pata + (L0[1] - ZEM) / K + 12];
/* výboje, které prosvítají papírem: pár klikatých čar po stranách erbu (tuš světlo nepustí), pokaždé blýskne jinde */
const VYBOJE = [[-9.6, 11], [10.8, 12], [-11.2, 13], [-7.6, 14], [11.6, 15]].map(([x0, seed]) => {
  const r = rng(seed), vyska = 7 + 2.4 * r();
  const B = [[x0 + (r() - 0.5) * 2, STRED_L - vyska]];
  for (let i = 1; i <= 5; i++) B.push([x0 + (i % 2 ? 1 : -1) * (1.2 + 1.7 * r()), STRED_L - vyska + (i * 2 * vyska) / 5 + (r() - 0.5) * 1.2]);
  /* jedna krátká odbočka, ke středu lucerny */
  const k = 1 + Math.floor(r() * 3);
  return { x: x0, d: `${cara(B)} M${pt(B[k])} L${pt([B[k][0] + (x0 > 0 ? -3.2 : 3.2), B[k][1] + 2.2 + r()])}` };
});
/* paprsky, když je hromobití: měkké klíny, žádné blesky */
const PAPRSKY = (() => {
  let d = "";
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + 0.2, r = i % 2 ? 33 : 47, w = i % 2 ? 0.07 : 0.1;
    d += `M0 0 L${f(Math.cos(a - w) * r)} ${f(Math.sin(a - w) * r)} L${f(Math.cos(a + w) * r)} ${f(Math.sin(a + w) * r)} Z `;
  }
  return d;
})();

/* ——— Stuha ———
   Dva konce od jednoho uzlu, dlouhý a krátký. Každý je provaz ze společných
   kusů a táhne ho to ke křivce, kterou by ve větru od chůze udělal: u uzlu
   je nadnesený (zdvih), ke konci se svěsí (sves) a běží po něm vlna.
   Všechno ostatní — zpoždění za krokem, švihnutí po skoku, mávnutí myší —
   už dělá provaz sám. Úhly jsou v radiánech, vlevo je π. */
const STUHA = { n: 17, clanek: 3.1, zdvih: 0.35, sves: 0.8, vlna: 1, w: 5.6, k: 0.5, faze: 0, tuhost: 100, tlum: 3.2 };
const STUZKA = { n: 9, clanek: 2.8, zdvih: -0.3, sves: 0.7, vlna: 0.7, w: 6.8, k: 0.7, faze: 1.9, tuhost: 120, tlum: 4 };
const cilStuhy = (koren, J, t, smer, sves, trepot) => {
  const B = [koren];
  for (let i = 1; i < J.n; i++) {
    const s = i / (J.n - 1);
    const a = smer + J.zdvih - (J.sves + sves) * s * s + (0.25 + 0.75 * s) * J.vlna * trepot * (Math.sin(J.w * t - J.k * i + J.faze) + 0.36 * Math.sin(1.7 * J.w * t - 2.1 * J.k * i + 2 + J.faze));
    B.push([B[i - 1][0] + J.clanek * Math.cos(a), B[i - 1][1] + J.clanek * Math.sin(a)]);
  }
  return B;
};

/* ——— Déšť a louže ——— */
const BARVY_DESTE = ["#3F4C94", "#C4432B", "#7A5E8E", "#4E4A84", "#C0708A", "#6CA5CE"];
const KAPICKA = kapickaD(1), JISKRA = jiskraD(1);
const LOUZE_D = hrouda(0, 0, 22, 4.1, 77, { bodu: 12, kolisani: 0.12 });
/* u kraje plochy se všechno na cestě vytrácí, ať to kraj neusekne natvrdo */
const uKraje = (x) => clamp(Math.min((x - 3) / 12, (177 - x) / 12));

/* ——— Vrstvy ——— */
const kapkaSvg = (x, y, rot, v, barva, op) =>
  `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(${f(v)})" opacity="${f(op)}"><path d="${KAPICKA}" fill="${barva}"/><circle cx="-0.1" cy="0.15" r="0.07" fill="#FFFFFF" opacity="0.75"/></g>`;
const koloSvg = (k) => {
  const u = k.vek / k.zivot, rx = k.r * (0.25 + 0.75 * Math.sqrt(u)), op = (1 - u) * uKraje(k.x);
  let s = `<ellipse cx="${f(k.x)}" cy="${f(k.y)}" rx="${f(rx)}" ry="${f(rx * 0.28)}" fill="none" stroke="${k.barva}" stroke-width="${f(0.3 + 0.7 * (1 - u))}" opacity="${f(0.62 * op)}"/>`;
  /* větší kolo má uvnitř druhé */
  if (k.r > 8 && u > 0.25) s += `<ellipse cx="${f(k.x)}" cy="${f(k.y)}" rx="${f(rx * 0.55)}" ry="${f(rx * 0.154)}" fill="none" stroke="${k.barva}" stroke-width="0.4" opacity="${f(0.4 * op)}"/>`;
  return s;
};
/* louže na cestě: voda v barvách soumraku, lesk a odraz lucerny, když jde kolem */
const louzeSvg = (p, st) => {
  const odraz = clamp(st.S) * clamp(1.25 - Math.abs(p.x - st.L[0]) / 34);
  let s =
    `<path d="${LOUZE_D}" fill="url(#${ID}-louze)" stroke="#5B62A6" stroke-width="0.35" stroke-opacity="0.4"/>` +
    `<path d="M-16 -1.6 Q-8 -3.5 3 -3.1" stroke="#EAF2FB" stroke-width="0.8" stroke-linecap="round" fill="none" opacity="0.85"/>`;
  if (odraz > 0.04) s += `<ellipse cx="${f(clamp(st.L[0] - p.x, -9, 9))}" cy="0.5" rx="10" ry="1.7" fill="${ZLUTA.svetla}" opacity="${f(0.75 * odraz)}"/>`;
  return `<g transform="translate(${f(p.x)} ${ZEM + 1.4})" opacity="${f(uKraje(p.x))}">${s}</g>`;
};
/* šplouchnutí, když skočí do louže: dva jazyky vody, které vyletí do stran, protáhnou se a spadnou */
const splouchSvg = (u) => {
  const h = Math.sin(Math.PI * Math.min(1, u * 1.1)), y = ZEM + 1.5;
  let s = "";
  for (const k of [-1, 1]) {
    const x = FX + k * 3 - 14 * u;
    const B = vzorkuj([[x + k * 4, y], [x + k * (9 + 7 * u), y - 17 * h - 2], [x + k * (16 + 17 * u), y - 13 * h * (1 - 0.7 * u) - 1]], 7);
    s += `<path d="${pasPoBodech(B, (q) => 6.4 * (1 - 0.55 * u) * Math.pow(Math.sin(Math.PI * (0.1 + 0.9 * q)), 0.8))}" fill="url(#${ID}-voda)" stroke="${VODA.chodidlo}" stroke-width="0.4" stroke-linejoin="round" opacity="${f(clamp(1.5 * (1 - u)))}"/>`;
  }
  return s;
};
/* cesta: vlastní stín, kaluž světla pod lucernou, louže a kola od kapek. Nic víc — pozadí si nese stránka. */
const vrstvaZem = (st) => {
  const S = clamp(st.S, 0, 1.7), vzduch = clamp(1 - st.skok / 30, 0.55, 1), rx = 28 + 7 * Math.max(0, S - 1);
  /* kaluž světla leží pod lucernou; když se lucerna rozhoupe ke kraji plochy, kaluž zůstane celá v ní */
  let s =
    `<ellipse cx="${f(FX + st.fig.x - 5)}" cy="${ZEM + 0.8}" rx="${f(34 * vzduch)}" ry="${f(4.8 * vzduch)}" fill="url(#${ID}-stin)" opacity="${f(vzduch)}"/>` +
    `<ellipse cx="${f(Math.min(st.L[0], 179 - rx))}" cy="${ZEM + 1}" rx="${f(rx)}" ry="${f(5.4 + 1.4 * Math.max(0, S - 1))}" fill="url(#${ID}-kaluz)" opacity="${f(clamp(0.9 * S))}"/>`;
  if (st.louze) s += louzeSvg(st.louze, st);
  for (const k of st.kola) s += koloSvg(k);
  return s;
};
/* déšť: kapky za Kapkou jsou menší a bledší; před ní navíc to, co vycákne zpod geta, a jiskřičky od lucerny */
const vrstvaDest = (vzadu) => (st) => {
  let s = "";
  for (const k of st.kapky) if (k.vzadu === vzadu) s += kapkaSvg(k.x, k.y, k.rot, k.v, BARVY_DESTE[k.b], k.op);
  if (vzadu) return s;
  if (st.splouch < 1) s += splouchSvg(st.splouch);
  for (const k of st.cakance) s += kapkaSvg(k.x, k.y, k.rot, k.v, BARVY_DESTE[k.b], k.op);
  for (const j of st.jiskry) {
    const u = j.vek / j.zivot;
    s += `<path d="${JISKRA}" transform="translate(${f(j.x)} ${f(j.y)}) rotate(${f(j.rot + u * 70)}) scale(${f(j.r * (1 - u * 0.4))})" fill="${j.sv ? "#FFFFFF" : ZLUTA.svetla}" stroke="${ZLUTA.okraj}" stroke-width="${f(0.26 / j.r)}" opacity="${f(clamp(Math.min(u / 0.1, (1 - u) / 0.5)))}"/>`;
  }
  return s;
};
/* záře kolem lucerny: kruh nakreslený jednou, běh ho nosí za světlem a průhledností s ním bliká */
const vrstvaZare = () => `<circle cx="${f(L0[0])}" cy="${f(L0[1])}" r="${ZARE_R}" fill="url(#${ID}-zare)"/>`;
/* hromobití: lucerna se rozzáří celá a paprsky se pomalu otočí. Když se rozhoupe ke kraji plochy, zkrátí se: přes kraj smějí jen špičkami, které už skoro nejsou vidět. */
const vrstvaPaprsky = (st) => {
  if (st.hromobiti < 0.02) return "";
  const [lx, ly] = st.L;
  return `<path d="${PAPRSKY}" transform="translate(${f(lx)} ${f(ly)}) rotate(${f(st.t * 20)}) scale(${f(Math.min(0.45 + 0.5 * st.hromobiti, (190 - lx) / 47))})" fill="url(#${ID}-paprsky)" opacity="${f(0.8 * st.hromobiti)}"/>`;
};
/* stuha a její kratší konec: obě vlají od uzlu na kruhu, kreslí se za ním */
const vrstvaStuha = (st) =>
  stuhaSvg(ID, vzorkuj(st.stuzka, 3), (s) => (4.6 - 1.6 * s) * Math.min(1, 0.5 + s / 0.1, (1.03 - s) / 0.12), (s) => Math.cos(Math.PI * (0.9 * s + 0.1) + 0.4 * Math.sin(1.3 * st.t + 2)), { vzor: false }) +
  /* dlouhý konec je v první půlce lícem k nám, pak se jednou přetočí a ukáže rub; místo přetočení se pomalu stěhuje */
  stuhaSvg(ID, vzorkuj(st.stuha, 3), (s) => (5.8 - 1.5 * s) * Math.min(1, 0.45 + s / 0.08, (1.02 - s) / 0.1), (s) => Math.cos(Math.PI * (1.15 * s - 0.25) + 0.5 * Math.sin(1.1 * st.t + 3 * s)));
/* buben z boku: plášť z rumělkového laku je vidět vlevo od čela jako srpek */
const bubenBok = (b) =>
  `<path d="M${f(b.xp)} ${f(b.y - b.ry)} H${f(b.xz)} A${f(b.rx)} ${f(b.ry)} 0 0 0 ${f(b.xz)} ${f(b.y + b.ry)} H${f(b.xp)} Z" fill="url(#${ID}-bok)" stroke="#171310" stroke-width="0.8" stroke-linejoin="round"/>` +
  `<path d="M${f(b.xz - b.rx * 0.5)} ${f(b.y - b.ry * 0.82)} Q${f(b.xz - b.rx * 0.2)} ${f(b.y - b.ry * 0.97)} ${f(b.xp - 0.6)} ${f(b.y - b.ry * 0.95)}" stroke="#FFD9C4" stroke-width="0.7" stroke-linecap="round" fill="none" opacity="0.6"/>`;
const bubenCelo = (b, obsah) => `<g transform="translate(${f(b.xp)} ${f(b.y)}) scale(${f(COS * b.m)} ${f(b.m)})">${obsah}</g>`;
/* kruh z černého laku se zlatou linkou, uzel stuhy a bubny bez znaků: kreslí se jednou */
const vrstvaKruh = () =>
  vPostave(
    `<path d="${OBRUC}" fill="#1F1A17"/>` +
      `<ellipse cx="${f(KS[0])}" cy="${KS[1]}" rx="${f(KR * COS)}" ry="${KR}" fill="none" stroke="#D9B25E" stroke-width="0.6" stroke-dasharray="8 1.6 2.4 1.6" opacity="0.85"/>` +
      `<path d="M${pt(naKruhu(200, KR - 1.1))} A${f((KR - 1.1) * COS)} ${KR - 1.1} 0 0 1 ${pt(naKruhu(262, KR - 1.1))}" stroke="#6A5A50" stroke-width="0.5" stroke-linecap="round" fill="none" opacity="0.8"/>` +
      /* uzel: stuha dvakrát ovinutá kolem kruhu a dvě smyčky */
      `<g transform="translate(${pt(UZEL)})"><path d="M-1 -0.6 C-4.6 -7.4 -10.4 -4.6 -7.6 -0.8 C-6 1.2 -3 0.8 -1 -0.6 Z" fill="#C4432B" stroke="#7E2112" stroke-width="0.45" stroke-linejoin="round"/>` +
      `<path d="M-1 0.6 C-5.4 3.2 -8 8.2 -4.4 8.4 C-2 8.4 -0.6 4.6 -1 0.6 Z" fill="#D25A40" stroke="#7E2112" stroke-width="0.45" stroke-linejoin="round"/>` +
      `<ellipse cx="0" cy="0" rx="2.9" ry="3.9" transform="rotate(-8)" fill="#C4432B" stroke="#7E2112" stroke-width="0.5"/><path d="M-1.6 -1.6 Q0 -0.6 1.7 -1.9 M-1.7 1 Q0 2 1.6 0.7" stroke="#F0A088" stroke-width="0.5" stroke-linecap="round" fill="none"/></g>` +
      PORADI.map((i) => bubenBok(BUBNY[i]) + bubenCelo(BUBNY[i], bubenSvg(ID, BR, { bok: false, cvocku: 14 }))).join(""),
  );
/* mitsudomoe se na bubnech točí dál; po ráně kůže zasvítí, znak poskočí a od bubnu se rozejde kruh */
const vrstvaZnaky = (st) =>
  vPostave(
    PORADI.map((i) => {
      const b = BUBNY[i], z = st.znaky[i];
      let s = "";
      if (z.zar > 0.02) {
        const r = BR + 2 + (1 - z.zar) * 13;
        s += `<ellipse cx="${f(b.xp)}" cy="${f(b.y)}" rx="${f(r * COS * b.m)}" ry="${f(r * b.m)}" fill="none" stroke="#C4432B" stroke-width="${f(1.3 * z.zar)}" opacity="${f(0.7 * z.zar)}"/>`;
      }
      /* kůže zezlátne jako papír lucerny a znak na ní zrudne */
      return s + bubenCelo(b, z.zar > 0.02 ? `<circle r="${f(KUZE)}" fill="${ZLUTA.svetla}" opacity="${f(0.85 * z.zar)}"/>` + znakBubnu(BR, z.a, { puls: z.zar, barva: mix("#1B1714", "#C4432B", z.zar) }) : znakBubnu(BR, z.a));
    }).join(""),
  );
/* bambusová tyč s kolínky: nakreslená jednou od dlaně ke špičce, běh ji nosí za dlaní a natáčí. Konec za dlaní schová tělo. */
const vrstvaTyc = () => {
  const u = [Math.cos(rad(UHEL0)), Math.sin(rad(UHEL0))], n = [-u[1], u[0]];
  const A = [H0[0] - u[0] * TYC_ZA, H0[1] - u[1] * TYC_ZA], c = `M${pt(A)} L${pt(T0)}`;
  let s =
    `<path d="${c}" stroke="#4E4226" stroke-width="3.3" stroke-linecap="round"/><path d="${c}" stroke="#A8935A" stroke-width="2.1" stroke-linecap="round"/>` +
    `<path d="M${pt([A[0] - n[0] * 0.55, A[1] - n[1] * 0.55])} L${pt([T0[0] - n[0] * 0.55, T0[1] - n[1] * 0.55])}" stroke="#D8C990" stroke-width="0.6" stroke-linecap="round" opacity="0.85"/>`;
  for (const q of [0.3, 0.52, 0.74, 0.93]) {
    const P = [lerp(A[0], T0[0], q), lerp(A[1], T0[1], q)];
    s += `<path d="M${pt([P[0] - n[0] * 1.5, P[1] - n[1] * 1.5])} L${pt([P[0] + n[0] * 1.5, P[1] + n[1] * 1.5])}" stroke="#4E4226" stroke-width="0.85" stroke-linecap="round"/>`;
  }
  /* železný háček na špičce, do kterého je lucerna zavěšená */
  return s + `<circle cx="${f(T0[0])}" cy="${f(T0[1])}" r="1.5" fill="#2A2422"/><circle cx="${f(T0[0] - 0.4)}" cy="${f(T0[1] - 0.4)}" r="0.5" fill="#8A7E74"/>`;
};
/* ručka, která tyč drží: oblázek zpoza boku, lucerna na něj svítí */
const vrstvaRukaTyc = () =>
  `<g transform="rotate(${UHEL0 + 96} ${pt(H0)})"><ellipse cx="${f(H0[0])}" cy="${f(H0[1])}" rx="${f(6.8 * K)}" ry="${f(5.2 * K)}" fill="${VODA.zaklad}"/>` +
  `<ellipse cx="${f(H0[0] + 0.6)}" cy="${f(H0[1] - 1.5)}" rx="${f(4.2 * K)}" ry="${f(1.9 * K)}" fill="${VODA.lesk}" opacity="0.55"/>` +
  `<path d="M${f(H0[0] - 4.4)} ${f(H0[1] + 2.4)} Q${f(H0[0])} ${f(H0[1] + 4.8)} ${f(H0[0] + 4.4)} ${f(H0[1] + 2.4)}" stroke="${VODA.chodidlo}" stroke-width="0.8" stroke-linecap="round" fill="none" opacity="0.7"/></g>`;
/* nožky pod tělem, ať mezi kapkou a chodidlem nikdy není mezera; horní konec schová tělo, dolní chodidlo */
const vrstvaNohy = (st) => st.nozky.map(([A, B], i) => `<path d="M${pt(A)} L${pt(B)}" stroke="${NOHY[i].blizko ? VODA.chodidlo : "#4F84AE"}" stroke-width="${f(8.4 * K)}" stroke-linecap="round"/>`).join("");
/* tělo z původní kresby: kreslí se jednou, chůzi mu dává posun vrstvy */
const vrstvaTelo = () => vPostave(kapTelo(ID));
/* světlo lucerny na pravém boku kapky a tenký jasný lem po jejím okraji */
const vrstvaSvit = () =>
  vPostave(naGeta(`<path d="${TELO}" fill="url(#${ID}-svit)"/><g clip-path="url(#${ID}-telo)"><path d="${TELO}" fill="none" stroke="url(#${ID}-svit-lem)" stroke-width="4.4"/></g>`));
const vrstvaTvar = (st) =>
  vPostave(
    naGeta(
      `<g clip-path="url(#${ID}-telo)"><g transform="translate(${f(90 + TVAR_DX + 0.5 * st.pohled[0])} 0) scale(${TVAR_SX} 1) translate(-90 0)">` +
        kapTvar({ dx: st.pohled[0], dy: st.pohled[1], mrk: st.mrk, vyraz: st.vyraz, tvareOp: st.tvare }) +
        `</g></g>`,
    ),
  );
/* geta s chodidlem a páskem hanao: nakreslené jednou tam, kde stojí, běh je zvedá, nosí a překlápí */
const vrstvaGeta = (i) => () => {
  const n = NOHY[i], x = 90 + n.x;
  const drevo = n.blizko ? {} : { deska: "#B98C5E", zub: "#7E5A3E", linka: "#D0AC7C" };
  const voda = n.blizko ? {} : { voda: { ...VODA, chodidlo: "#4F84AE" }, pasek: "#AE3A26" };
  /* z boku je deska delší než zepředu */
  return vPostave(`<g transform="translate(0 ${n.dy})"><g transform="translate(${f(x)} 0) scale(1.16 1) translate(${f(-x)} 0)">${getaSvg(x - 9, drevo)}</g>${chodidloSvg(x, voda)}</g>`);
};
/* bližší ručka s paličkou, nakreslená jednou v klidové poloze; běh ji otáčí kolem ramene. Pod ní stín, ať je na těle vidět. */
const vrstvaRuka = () => {
  const a = rad(KLID_U), d = [RAMENA.L[0] + Math.cos(a) * 5.5 + 0.9, RAMENA.L[1] + Math.sin(a) * 5.5 + 1.6];
  return vPostave(
    `<g transform="translate(${RUKA_DX} ${RUKA_DY})">` +
      `<ellipse cx="${f(d[0])}" cy="${f(d[1])}" rx="7.2" ry="5.2" transform="rotate(${KLID_U} ${f(d[0])} ${f(d[1])})" fill="${VODA.chodidlo}" opacity="0.5"/>` +
      kapRuka("L", KLID_U, { voda: RUKA_VODA }) +
      `</g>`,
  );
};

/* ——— Lucerna: zhasnutý papír, přes něj rozsvícený, výboj uvnitř a navrch kresba s obručemi ——— */
/* drátěné držadlo, očko a papír tak, jak vypadá bez světla */
const vrstvaPapir = () =>
  vLampe(
    `<path d="M-5.6 ${LAMP.hak + 0.4} C-5.6 1.4 -2.4 0.5 0 0.5 C2.4 0.5 5.6 1.4 5.6 ${LAMP.hak + 0.4}" stroke="#2A2422" stroke-width="0.75" stroke-linecap="round" fill="none"/>` +
      `<circle cx="0" cy="-0.5" r="1.3" fill="none" stroke="#2A2422" stroke-width="0.7"/>` +
      `<path d="${TELO_L}" fill="url(#${ID}-papir)"/>`,
  );
/* totéž rozsvícené: hrom prosvěcuje papír zevnitř, uprostřed nejvíc */
const vrstvaPapirSvit = () => vLampe(`<path d="${TELO_L}" fill="url(#${ID}-papir-svit)"/>`);
/* kousek hromu: měkké jádro, které se naklání za kurzorem, a klikatý výboj, když se zableskne */
const vrstvaVyboj = (st) => {
  const [nx, ny] = st.naklon, v = st.vyboj;
  let s = `<ellipse cx="${f(nx)}" cy="${f(STRED_L + 0.6 + ny)}" rx="9.5" ry="11" fill="url(#${ID}-jadro)" opacity="${f(clamp(0.35 + 0.65 * st.S))}"/>`;
  if (v > 0.03) {
    const V = VYBOJE[st.tvar % VYBOJE.length], C = `fill="none" stroke-linecap="round" stroke-linejoin="round"`;
    /* kde blýskne, tam se papír na chvilku rozsvítí víc; teplý lem drží výboj čitelný i na světlém papíře */
    s +=
      `<g transform="translate(${f(nx * 0.5)} ${f(ny * 0.5)})">` +
      `<ellipse cx="${f(V.x * 0.8)}" cy="${f(STRED_L)}" rx="8" ry="11.5" fill="url(#${ID}-jadro)" opacity="${f(0.75 * v)}"/>` +
      `<path d="${V.d}" stroke="#FFB648" stroke-width="4" opacity="${f(0.3 * v)}" ${C}/>` +
      `<path d="${V.d}" stroke="#FFF3BE" stroke-width="1.6" opacity="${f(0.9 * v)}" ${C}/>` +
      `<path d="${V.d}" stroke="#FFFFFF" stroke-width="0.6" opacity="${f(clamp(v))}" ${C}/></g>`;
  }
  return vLampe(`<g clip-path="url(#${ID}-lampa)">${s}</g>`);
};
const obrucL = (y0, y1, linka) => {
  const w = LAMP.r0 + 1.1;
  return (
    `<rect x="${-w}" y="${y0}" width="${2 * w}" height="${f(y1 - y0)}" rx="1.1" fill="url(#${ID}-lak)" stroke="#0E0B0A" stroke-width="0.4"/>` +
    `<path d="M${f(-w + 1.3)} ${f(y0 + 0.95)} H${f(w - 3)}" stroke="#7A6A5E" stroke-width="0.45" stroke-linecap="round"/>` +
    `<path d="M${f(-w + 0.7)} ${f(linka)} H${f(w - 0.7)}" stroke="#D9B25E" stroke-width="0.5"/>`
  );
};
/* žebra, rumělkové pásy, erb tuší, stín na bocích a lakované obruče */
const vrstvaKresba = () =>
  vLampe(
    `<g clip-path="url(#${ID}-lampa)">` +
      `<path d="${pruhL(LAMP.telo[0], LAMP.telo[0] + 4)}" fill="#C4432B" opacity="0.86"/><path d="${pruhL(LAMP.telo[1] - 4.6, LAMP.telo[1] + 1)}" fill="#C4432B" opacity="0.86"/>` +
      `<path d="${zebro(LAMP.telo[0] + 5.2)} ${zebro(LAMP.telo[1] - 5.8)}" stroke="#7E2112" stroke-width="0.4" fill="none" opacity="0.7"/>` +
      `<g transform="translate(${ERB.x} ${f(ERB.y)}) scale(${f(ERB.sx * ERB.r)} ${ERB.r}) rotate(-14)" opacity="0.9">${tomoe("#1B1714")}</g>` +
      `<path d="${ZEBRA}" stroke="#9A6E2C" stroke-width="0.34" fill="none" opacity="0.6"/>` +
      `<path d="${TELO_L}" fill="url(#${ID}-boky)"/>` +
      `</g>` +
      `<path d="${TELO_L}" fill="none" stroke="#6E4E22" stroke-width="0.55" stroke-linejoin="round"/>` +
      obrucL(LAMP.kruh[0], LAMP.kruh[1] + 0.5, LAMP.kruh[1] - 0.6) +
      obrucL(LAMP.dno[0] - 0.5, LAMP.dno[1], LAMP.dno[0] + 0.5),
  );
/* střapec: nakreslený jednou pod dolní obručí, běh ho nosí za lucernou a natáčí o chvilku později */
const vrstvaStrapec = () =>
  `<g transform="translate(${pt(D0)})"><path d="M0 0 V3.4" stroke="#8E2A1C" stroke-width="0.8"/>` +
  `<circle cx="0" cy="4.4" r="1.8" fill="url(#${ID}-zl)" stroke="#7A5412" stroke-width="0.35"/>` +
  `<path d="M-1.7 6 L-2.7 15.4 Q0 16.6 2.7 15.4 L1.7 6 Z" fill="#C4432B" stroke="#8E2A1C" stroke-width="0.45" stroke-linejoin="round"/>` +
  `<path d="M-1 7.6 L-1.4 15.2 M0 7.6 V15.7 M1 7.6 L1.4 15.2" stroke="#8E2A1C" stroke-width="0.32" stroke-linecap="round"/>` +
  `<rect x="-1.9" y="5.8" width="3.8" height="1.6" rx="0.5" fill="#E9C46E" stroke="#7A5412" stroke-width="0.3"/></g>`;

const stopy = (S) => S.map(([o, barva, op]) => `<stop offset="${o}" stop-color="${barva}"${op == null ? "" : ` stop-opacity="${op}"`}/>`).join("");
const defs = () =>
  kapDefs(ID) +
  bubenDefs(ID) +
  /* stuha vlaje doleva: u uzlu rumělka, na konci noc */
  stuhaDefs(ID, { x1: 54, x2: 6 }) +
  `<clipPath id="${ID}-telo"><path d="${TELO}"/></clipPath>` +
  `<clipPath id="${ID}-lampa"><path d="${TELO_L}"/></clipPath>` +
  `<radialGradient id="${ID}-stin">${stopy([[0, "#3A3460", 0.3], [0.6, "#3A3460", 0.13], [1, "#3A3460", 0]])}</radialGradient>` +
  `<radialGradient id="${ID}-kaluz">${stopy([[0, "#FFE08A", 0.85], [0.55, ZLUTA.zaklad, 0.36], [1, ZLUTA.zaklad, 0]])}</radialGradient>` +
  `<linearGradient id="${ID}-louze" x1="0" y1="0" x2="0" y2="1">${stopy([[0, "#A9BDE4", 0.75], [1, "#5B62A6", 0.6]])}</linearGradient>` +
  `<radialGradient id="${ID}-zare">${stopy([[0, ZLUTA.jadro, 0.95], [0.36, "#FFE08A", 0.5], [0.7, "#FFD978", 0.16], [1, "#FFD978", 0]])}</radialGradient>` +
  `<radialGradient id="${ID}-paprsky" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="47">${stopy([[0, "#FFFFFF", 0.95], [0.4, "#FFE08A", 0.75], [1, "#FFD060", 0]])}</radialGradient>` +
  /* plášť bubnu: nahoře na něj svítí, dole je ve stínu */
  `<linearGradient id="${ID}-bok" x1="0" y1="0" x2="0" y2="1">${stopy([[0, "#DA5632"], [0.4, "#B5361F"], [1, "#5E170C"]])}</linearGradient>` +
  /* světlo na Kapce: od lucerny vpravo nahoře, na druhou stranu těla nedojde */
  `<radialGradient id="${ID}-svit" gradientUnits="userSpaceOnUse" cx="${f(SVIT_C[0])}" cy="${f(SVIT_C[1])}" r="118">${stopy([[0.34, "#FFE9A6", 0.78], [0.56, "#FFD978", 0.3], [0.8, "#FFD978", 0.06], [1, "#FFD978", 0]])}</radialGradient>` +
  `<radialGradient id="${ID}-svit-lem" gradientUnits="userSpaceOnUse" cx="${f(SVIT_C[0])}" cy="${f(SVIT_C[1])}" r="88">${stopy([[0.42, "#FFFBE6", 0.95], [0.72, "#FFF0B8", 0.4], [1, "#FFF0B8", 0]])}</radialGradient>` +
  /* papír lucerny: zhasnutý, a prosvícený hromem */
  `<radialGradient id="${ID}-papir" cx="0.46" cy="0.42" r="0.66">${stopy([[0, "#F3EBD8"], [0.6, "#E2D6BA"], [1, "#C2B290"]])}</radialGradient>` +
  `<radialGradient id="${ID}-papir-svit" cx="0.5" cy="0.52" r="0.6">${stopy([[0, "#FFFFF6"], [0.3, ZLUTA.jadro], [0.62, ZLUTA.svetla], [0.86, "#F5D07A"], [1, "#DFA84E"]])}</radialGradient>` +
  `<radialGradient id="${ID}-jadro">${stopy([[0, "#FFFFFF", 0.95], [0.42, ZLUTA.jadro, 0.6], [1, ZLUTA.svetla, 0]])}</radialGradient>` +
  /* papír se na bocích stáčí dozadu */
  `<linearGradient id="${ID}-boky" x1="0" y1="0" x2="1" y2="0">${stopy([[0, "#7A5A22", 0.44], [0.22, "#7A5A22", 0], [0.74, "#7A5A22", 0], [1, "#7A5A22", 0.5]])}</linearGradient>` +
  `<linearGradient id="${ID}-lak" x1="0" y1="0" x2="1" y2="0">${stopy([[0, "#0E0B0A"], [0.3, "#3A302A"], [0.62, "#171310"], [1, "#0E0B0A"]])}</linearGradient>` +
  `<radialGradient id="${ID}-zl" cx="0.36" cy="0.32" r="0.8">${stopy([[0, "#FFF1C4"], [0.5, "#E9C46E"], [1, "#9A7426"]])}</radialGradient>`;

/* ——— Simulace ——— */
/** Tělo v panelu: houpe se do kroku, je nakloněné do chůze, po došlapu se zavlní a před skokem přikrčí. */
const figV = (d) => {
  const j = d.jde, w = 2 * Math.PI * d.fi;
  const sy = 1 + d.dosed.a - 0.08 * d.podrep;
  return {
    x: 0.7 * K * Math.sin(w) * j,
    y: -1.9 * K * Math.sin(w) ** 2 * j - d.skok,
    r: 2.2 + 1.2 * Math.sin(w + 0.7) * j + d.nakl.a,
    sx: 1 - 0.55 * (sy - 1), sy,
  };
};
const vlnka = (d, x, y, r, zivot, barva = "#6E74AE") => {
  if (d.kola.length < 20) d.kola.push({ x, y, r, vek: 0, zivot, barva });
};
const cakanec = (d, x, y, rychlost, nahoru, velikost = 1) => {
  const R = d.nahoda;
  if (d.cakance.length >= 30) return;
  const a = (R() - 0.5) * 2.2;
  d.cakance.push({ x, y: y - 1, vx: Math.sin(a) * rychlost - d.posuv, vy: -(nahoru * (0.55 + 0.45 * R())), v: (1.9 + 1.5 * R()) * velikost, b: Math.floor(R() * BARVY_DESTE.length), zem: y + 0.5 });
};
const prsk = (d, [x, y], pocet, rychlost = 46) => {
  const R = d.nahoda;
  for (let i = 0; i < pocet && d.jiskry.length < 14; i++) {
    const a = R() * 6.28, v = rychlost * (0.4 + 0.6 * R());
    d.jiskry.push({ x: x + Math.cos(a) * 13, y: y + Math.sin(a) * 13, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 8, vek: 0, zivot: 0.55 + 0.45 * R(), r: 1.5 + 1.5 * R(), rot: R() * 90, sv: R() < 0.5 });
  }
};
const novaKapka = (d) => {
  const R = d.nahoda;
  if (d.kapky.length >= 46) return;
  /* padají šikmo dozadu: Kapka jim odchází */
  const vx = -(d.posuv + 10 + 12 * R()), vy = 150 + 50 * R(), b = Math.floor(R() * BARVY_DESTE.length);
  if (R() < 0.1) {
    /* sem tam jedna spadne na některý z horních bubnů — a ten si ťukne sám */
    const i = 1 + Math.floor(R() * 3), B = BUBNY[i], P = zPostavy([lerp(B.xz, B.xp, R()), B.y - B.ry + 1.5]);
    d.kapky.push({ x: P[0] - (vx * (P[1] + 8)) / vy, y: -8, vx, vy, v: 4.6 + 1.6 * R(), b, vzadu: false, zem: P[1], buben: i });
    return;
  }
  const x = 34 + R() * 172, y = -6 - R() * 10;
  /* co by Kapce spadlo přes tvář, padá za ní: kapka pod okem by vypadala jako slza */
  const vzadu = R() < 0.55 || Math.abs(x + (vx * (112 - y)) / vy - FX - 1) < 30;
  d.kapky.push({ x, y, vx, vy, v: 4.4 + 2.4 * R(), b, vzadu, zem: ZEM + (vzadu ? -3.2 - 2.4 * R() : 1.6 + 4 * R()), buben: -1 });
};
/** Kapka spadla na buben: kůže se zachvěje, znak se pootočí a pár kapiček odskočí. */
const kapkaNaBuben = (d, k) => {
  const R = d.nahoda;
  d.bzar[k.buben] = Math.max(d.bzar[k.buben], 0.36);
  d.roztoc[k.buben] += 60;
  for (let i = 0; i < 2; i++) cakanec(d, k.x + (R() - 0.5) * 3, k.zem, 14, 34, 0.9);
  d.zvuk.push({ druh: "don", sila: 0.12 + 0.08 * R(), pan: pan(BUBEN_X[k.buben]), ladeni: 1.5 + 0.14 * k.buben });
};
/** Přikrčí se a skočí: lucerna zůstane o kousek pozadu a tyč se prohne. */
const zacniSkok = (d, t, jak) => {
  d.rezim = "skok";
  d.od = t;
  d.skokJak = jak;
  d.om -= 0.07 * jak.vyska;
  d.uhel.v -= 1.6 * jak.vyska;
  d.nakl.v += 1.8 * jak.vyska;
};
/** Rána do bubnu: Kapka povyskočí a za okamžik bouchne. Kdo kliká rychle, bubnuje. */
const rana = (d, t) => {
  const posledni = d.udery.length ? d.udery[d.udery.length - 1].cas : -100;
  const cas = Math.max(t + 0.15, posledni + 0.17);
  if (cas - t > 0.6) return;
  d.udery.push({ cas, sila: 0.95, znel: false });
  /* při víření neposkakuje při každé ráně, jen co chvíli */
  if (d.rezim === "jde" && d.jde > 0.5 && t - d.dopadT > 0.4) zacniSkok(d, t, SKOK_RANA);
};
/** Šťouchnutí do lucerny: hrom uvnitř se lekne a Kapka s ním. */
const stouchni = (d, t, k) => {
  const smer = k.x < d.L[0] ? 1 : -1;
  d.om += smer * 2.6;
  d.zar = Math.min(2, d.zar + 0.9);
  d.divoky = 1;
  d.lek = t;
  d.radost = t + 0.6;
  d.nakl.v -= 40;
  prsk(d, d.L, 5);
  d.zvuk.push({ druh: "papir", sila: 0.8, pan: pan(k.x) });
  d.zvuk.push({ druh: "vyboj", sila: 0.8, pan: pan(d.L[0]), za: 0.02 });
  d.zvuk.push({ druh: "pisk", sila: 0.55, pan: pan(FX), za: 0.08 });
};
const klik = (d, t, k) => {
  d.klikT = t;
  /* z klávesnice přijde přesný střed plochy: to je vždycky rána do bubnu */
  d.viri = false;
  if (!(k.x === 90 && k.y === 90) && Math.hypot(k.x - d.L[0], k.y - d.L[1]) < 21) return stouchni(d, t, k);
  d.viri = true;
  rana(d, t);
};
/** Palička dopadla na kůži. Silná rána rozezní celý kruh a hrom v lucerně odpoví; slabé ťuknutí za chůze jen zabliká. */
const zazni = (d, t, q) => {
  d.bzar[0] = Math.max(d.bzar[0], q.sila);
  d.roztoc[0] += 300 * q.sila;
  d.kruh.v -= 55 * q.sila;
  if (q.sila < 0.6) {
    d.zvuk.push({ druh: "ka", sila: q.sila, pan: pan(BUBEN_X[0]) });
    d.casovane.push({ cas: t + 0.16, co: "odpoved", sila: q.sila });
    return;
  }
  d.combo = t - d.comboT < 1.5 ? d.combo + 1 : 1;
  d.comboT = t;
  /* čtvrtá rána v řadě je hromobití — ale ne víckrát za pár vteřin, i kdyby někdo vířil bez přestání */
  const velka = d.combo >= 4 && t - d.hromobitiT > 3.5;
  if (velka) d.hromobitiT = t;
  d.zvuk.push({ druh: "don", sila: 0.9, pan: pan(BUBEN_X[0]), ladeni: 1 + 0.05 * Math.min(5, d.combo - 1) });
  /* ostatní bubny se rozezní po obvodu kruhu, jeden po druhém */
  for (let i = 1; i < BUBNY.length; i++) d.casovane.push({ cas: t + 0.07 * i, co: "ozvena", buben: i, sila: velka ? 1 : 0.64 - 0.08 * i });
  d.casovane.push({ cas: t + 0.13, co: velka ? "hromobiti" : "odpoved", sila: q.sila });
  d.nakl.v -= 26;
  d.skub = [-30, -90];
  if (velka) d.combo = 0;
};
const casovana = (d, t, c) => {
  const R = d.nahoda;
  if (c.co === "ozvena") {
    d.bzar[c.buben] = Math.max(d.bzar[c.buben], c.sila);
    d.roztoc[c.buben] += 190 * c.sila;
    d.zvuk.push({ druh: "don", sila: 0.36 * c.sila, pan: pan(BUBEN_X[c.buben]), ladeni: 1.12 + 0.09 * c.buben });
  } else if (c.co === "odpoved") {
    /* hrom v lucerně odpoví: zableskne se, zaduní a rozprší se */
    d.zar = Math.min(1.9, d.zar + 0.8 * c.sila);
    d.tvar += 1 + Math.floor(R() * 2);
    d.lijak = Math.min(2.2, d.lijak + 1.2 * c.sila);
    d.om += 0.5 * c.sila;
    d.zvuk.push({ druh: "vyboj", sila: 0.5 * c.sila, pan: pan(d.L[0]) });
    if (c.sila > 0.6) {
      prsk(d, d.L, 2);
      /* zaduní tiše a zdaleka; hrom doznívá pár vteřin, a tak se při bubnování nevrství jeden přes druhý */
      if (t - d.hromT > 2.4) {
        d.hromT = t;
        d.zvuk.push({ druh: "hrom", sila: 0.45, blizko: 0.15, pan: pan(d.L[0]) });
      }
    }
    /* a pak si chvilku užívá, jak prší */
    d.blaho = t + (c.sila > 0.6 ? 0.5 : 0.35);
  } else if (c.co === "hromobiti") {
    d.zar = 2.3;
    d.paprsky = t;
    d.divoky = 1;
    d.tvar += 1;
    d.lijak = 2.2;
    d.om += 0.7;
    d.uzas = t;
    d.radost = t + 0.6;
    d.skub = [-80, -170];
    for (let i = 0; i < BUBNY.length; i++) {
      d.bzar[i] = 1;
      d.roztoc[i] += 240;
    }
    prsk(d, d.L, 8, 70);
    d.hromT = t;
    d.zvuk.push({ druh: "hrom", sila: 0.9, blizko: 0.55, pan: pan(d.L[0]) });
    d.zvuk.push({ druh: "vyboj", sila: 0.9, pan: pan(d.L[0]) });
    d.zvuk.push({ druh: "cink", sila: 0.6, pan: pan(d.L[0]), za: 0.12 });
    d.zvuk.push({ druh: "smich", sila: 0.7, pan: pan(FX), za: 0.75 });
  }
};
/** Geta došláplo: klap, tělo se zavlní, tyč se prohne, hrom v lucerně zabliká a na cestě to cákne. */
const doslap = (d, n) => {
  const R = d.nahoda;
  const x = FX + (n.x + KROK) * K, y = ZEM + (n.blizko ? 1.7 : -0.5);
  d.zvuk.push({ druh: "klap", sila: 0.4 + 0.14 * R(), pan: pan(x) });
  d.dosed.v -= 0.34;
  d.uhel.v += 9;
  d.kruh.v += n.blizko ? 15 : -15;
  d.kruhY.v += 10;
  d.krokZar = Math.max(d.krokZar, 0.2);
  /* kdo došlápne do louže, cákne víc */
  const vLouzi = d.louze && Math.abs(d.louze.x - x) < 15;
  vlnka(d, x, y, vLouzi ? 11 : 6.5 + 2 * R(), 0.6);
  for (let i = 0; i < (vLouzi ? 4 : 2); i++) cakanec(d, x + (R() - 0.5) * 7, y, 16, vLouzi ? 62 : 36, vLouzi ? 1.3 : 1);
  if (vLouzi || R() < 0.4) d.zvuk.push({ druh: "kap", sila: vLouzi ? 0.34 : 0.14, vys: R(), pan: pan(x), za: 0.04 });
};
/** Dopad po skoku: obě geta naráz. Do louže to pořádně vycákne. */
const dopad = (d, t) => {
  const R = d.nahoda, jak = d.skokJak, doLouze = jak.typ === "louze" && d.louze && Math.abs(d.louze.x - FX) < 20;
  d.rezim = "jde";
  d.od = t;
  d.dopadT = t;
  d.fi = FI_VYKROC;
  d.dosed.v -= 0.5 + 0.055 * jak.vyska;
  d.kruh.v += 22;
  d.kruhY.v += 14 + 2 * jak.vyska;
  d.uhel.v += 16;
  d.om += 0.1 * jak.vyska;
  d.nakl.v -= 2.4 * jak.vyska;
  d.krokZar = 0.32;
  d.zvuk.push({ druh: "klap", sila: 0.75, pan: pan(FX - 6) });
  d.zvuk.push({ druh: "klap", sila: 0.6, pan: pan(FX + 6), za: 0.035 });
  for (const n of NOHY) {
    const x = FX + n.x * K, y = ZEM + (n.blizko ? 1.7 : -0.5);
    vlnka(d, x, y, doLouze ? 15 : 8, doLouze ? 0.9 : 0.6);
    if (!doLouze) for (let i = 0; i < 2; i++) cakanec(d, x + (R() - 0.5) * 12, y, 20, 44);
  }
  if (doLouze) {
    /* voda vyletí do obou stran: dva jazyky a nad nimi kapky v oblouku */
    for (let i = 0; i < 16 && d.cakance.length < 30; i++) {
      const strana = i % 2 ? 1 : -1, a = 0.25 + 0.5 * R(), v = 92 + 58 * R();
      d.cakance.push({ x: FX + strana * (5 + 6 * R()), y: ZEM - 1, vx: strana * v * Math.sin(a) - 0.4 * d.posuv, vy: -v * Math.cos(a), v: 3 + 3 * R(), b: Math.floor(R() * BARVY_DESTE.length), zem: ZEM + 2.5 });
    }
    vlnka(d, FX, ZEM + 1.2, 24, 1.1, "#7A5E8E");
    d.splouch = t;
    d.radost = t;
    d.lijak = Math.min(2.2, d.lijak + 0.3);
    d.skub = [-20, -120];
    d.zvuk.push({ druh: "cak", sila: 0.9, pan: pan(FX) });
    d.zvuk.push({ druh: "kap", sila: 0.4, vys: 0.3, pan: pan(FX - 14), za: 0.22 });
    d.zvuk.push({ druh: "kap", sila: 0.3, vys: 0.75, pan: pan(FX + 16), za: 0.34 });
    d.zvuk.push({ druh: "smich", sila: 0.7, pan: pan(FX), za: 0.3 });
  }
};
/** Krok jednoho konce stuhy: táhne ho to k jeho křivce ve větru, myš s ním mává a co ho škublo, to ho švihne. U kraje plochy a u země ho to vrací. */
const krokStuhy = (d, pr, J, koren, t, dt) => {
  const C = cilStuhy(koren, J, t, d.smerStuhy, d.svesStuhy, d.trepot);
  if (d.skub) pr.p.forEach((p, i) => i && hodProvazem(pr, i, [(p[0] - pr.q[i][0]) / dt + (d.skub[0] * i) / (J.n - 1), (p[1] - pr.q[i][1]) / dt + (d.skub[1] * i) / (J.n - 1)], dt));
  krokProvazu(pr, dt, J.clanek, {
    koren, tlum: J.tlum, iter: 6, hladkost: 0.1,
    sila: (i, s, x, y) => {
      let ax = J.tuhost * (C[i][0] - x) + 0.4 * d.mysV[0], ay = J.tuhost * (C[i][1] - y) + 0.4 * d.mysV[1];
      if (x < 7) ax += (7 - x) * 80;
      if (y > ZEM - 5) ay -= (y - ZEM + 5) * 90;
      return [ax, ay];
    },
  });
  /* a kdyby ji vítr přece jen vyhnal z plochy, dál už nemůže */
  for (let i = 1; i < J.n; i++) {
    pr.p[i][0] = Math.max(3.5, pr.p[i][0]);
    pr.p[i][1] = clamp(pr.p[i][1], 4, ZEM - 2);
  }
};
const krok = (dyn, t, dt, vstup) => {
  if (dt <= 0) return;
  const d = dyn, R = d.nahoda;
  const mys = vstup.mys || null;
  /* rychlost kurzoru: rychlé mávnutí je vítr */
  const vm = mys && d.mysP ? [(mys.x - d.mysP[0]) / dt, (mys.y - d.mysP[1]) / dt] : [0, 0];
  d.mysP = mys ? [mys.x, mys.y] : null;
  d.mysV = d.mysV.map((q, i) => kCili(q, clamp(vm[i], -420, 420), dt, 0.1));
  if (vstup.kliky && vstup.kliky.length) {
    for (const k of vstup.kliky) klik(d, t, k);
    vstup.kliky.length = 0;
  }
  /* kdo tlačítko po ráně drží, víří: další rána přijde, jakmile ta předchozí dozní */
  if (!vstup.drzi) d.viri = false;
  else if (d.viri && t - d.klikT > 0.25 && d.udery.every((q) => q.znel)) {
    rana(d, t);
    d.klikT = t - 0.25;
  }

  /* ——— co zrovna dělá: jde, nebo skáče ——— */
  const u = t - d.od;
  let cilPodrep = 0;
  d.skok = 0;
  if (d.rezim === "skok") {
    const jak = d.skokJak;
    if (u < jak.priprava) cilPodrep = 1;
    else if (u < jak.priprava + jak.doba) {
      const q = (u - jak.priprava) / jak.doba;
      d.skok = jak.vyska * 4 * q * (1 - q);
    } else dopad(d, t);
  } else {
    /* jednou za čas si za chůze dvakrát ťukne do bubnu, do kroku */
    d.doTuku -= dt;
    if (d.doTuku <= 0 && !d.udery.length && t - d.klikT > 5 && !(d.louze && d.louze.x - FX < 70 && !d.louze.hotova)) {
      d.doTuku = 8 + 5 * R();
      d.udery.push({ cas: t + 0.3, sila: 0.42, znel: false }, { cas: t + 0.3 + KROK_T / 2, sila: 0.5, znel: false });
    }
  }
  d.podrep = kCili(d.podrep, cilPodrep, dt, 0.04);
  d.jde = clamp(d.jde + (d.rezim === "skok" ? -dt / 0.07 : dt / 0.14));
  d.posuv = RYCHLOST;

  /* ——— chůze: kdykoli geta došlápne ——— */
  if (d.rezim === "jde") {
    const fiP = d.fi;
    d.fi = cyk(d.fi + dt / KROK_T);
    if (d.jde > 0.6) for (const n of NOHY) if (cyk(d.fi - n.faze) < cyk(fiP - n.faze)) doslap(d, n);
  }
  pruzina(d.dosed, 0, dt, { tuhost: 240, utlum: 13 });
  d.dosed.a = clamp(d.dosed.a, -0.1, 0.07);
  pruzina(d.nakl, 0, dt, { tuhost: 90, utlum: 9 });
  d.nakl.a = clamp(d.nakl.a, -8, 8);
  pruzina(d.kruh, 0, dt, { tuhost: 150, utlum: 9 });
  d.kruh.a = clamp(d.kruh.a, -5, 5);
  pruzina(d.kruhY, 0, dt, { tuhost: 210, utlum: 12 });
  d.kruhY.a = clamp(d.kruhY.a, -2.5, 3);

  /* ——— rány do bubnu a všechno, co po nich přijde se zpožděním ——— */
  for (const q of d.udery) {
    if (q.znel || t < q.cas) continue;
    q.znel = true;
    zazni(d, t, q);
  }
  d.udery = d.udery.filter((q) => t - q.cas < 0.62);
  for (const c of d.casovane) if (t >= c.cas) casovana(d, t, c);
  d.casovane = d.casovane.filter((c) => t < c.cas);
  /* palička: při chůzi se houpe proti bližší noze, při ráně se rozmáchne */
  let cilP = KLID_U + 12 * Math.sin(2 * Math.PI * d.fi) * d.jde + 16 * clamp(d.skok / 8);
  let nej = null;
  for (const q of d.udery) if (t - q.cas > -0.24 && t - q.cas < 0.6 && (!nej || Math.abs(t - q.cas) < Math.abs(t - nej.cas))) nej = q;
  if (nej) cilP = KLID_U + (UDER_U - KLID_U) * svih(t - nej.cas);
  /* k ráně letí palička naostro, jinak se za cílem trochu zpožďuje, ať sebou necukne, když rána přijde narychlo */
  d.palicka = kCili(d.palicka, cilP, dt, nej && Math.abs(t - nej.cas) < 0.08 ? 0.005 : 0.022);
  for (let i = 0; i < BUBNY.length; i++) {
    d.znak[i] = (d.znak[i] + (26 + d.roztoc[i]) * dt) % 360;
    d.roztoc[i] = kCili(d.roztoc[i], 0, dt, 0.5);
    d.bzar[i] = kCili(d.bzar[i], 0, dt, 0.2);
  }

  /* ——— tyč: dlaň jde za tělem měkce a lucernu natáhne tam, kam ukazuje kurzor ——— */
  const fig = figV(d);
  const cilH = naTelo(RUKA_T, fig);
  let cilZdvih = 0;
  if (mys) {
    let a = deg(Math.atan2(mys.y - ZAVES - d.H[1], Math.max(mys.x - d.H[0], 14)));
    if (a > 90) a -= 360;
    d.cilUhel = kCili(d.cilUhel, clamp(lerp(UHEL0, a, 0.6), MEZE_UHEL[0], MEZE_UHEL[1]), dt, 0.25);
    cilZdvih = clamp((mys.y - 96) * 0.07, -5, 4);
  } else d.cilUhel = kCili(d.cilUhel, UHEL0, dt, 0.5);
  d.zdvih = kCili(d.zdvih, cilZdvih, dt, 0.25);
  d.H = [kCili(d.H[0], cilH[0], dt, 0.07), kCili(d.H[1], cilH[1] + d.zdvih, dt, 0.07)];
  pruzina(d.uhel, d.cilUhel + 1.1 * Math.sin(t * 0.6), dt, { tuhost: 52, utlum: 8 });
  d.uhel.a = clamp(d.uhel.a, MEZE_UHEL[0] - 4, MEZE_UHEL[1] + 4);

  /* ——— lucerna: kyvadlo, které rozhoupe zrychlení špičky tyče ——— */
  const T = spicka(d.H, d.uhel.a);
  let acc = [0, 0];
  if (d.Tp) {
    const v = [(T[0] - d.Tp[0]) / dt, (T[1] - d.Tp[1]) / dt];
    if (d.Vp) acc = [(v[0] - d.Vp[0]) / dt, (v[1] - d.Vp[1]) / dt];
    d.Vp = v;
  }
  d.Tp = T;
  const vel = Math.hypot(acc[0], acc[1]);
  if (vel > G * 2.5) acc = acc.map((q) => (q * G * 2.5) / vel);
  d.aT = d.aT.map((q, i) => q + (acc[i] - q) * clamp(dt / 0.03));
  /* vzduch ji při chůzi tlačí dozadu a pohupuje s ní; kurzor u ní fouká víc */
  const blizko = mys ? smooth(1 - Math.hypot(mys.x - d.L[0], mys.y - d.L[1]) / 55) : 0;
  const vitr = -0.25 + 0.3 * Math.sin(t * 0.83) + 0.18 * Math.sin(t * 1.9 + 1) + clamp(d.mysV[0] * (0.014 + 0.05 * blizko), -12, 12);
  /* měkké meze: ke Kapce se rozhoupe míň než od ní, ať jí nevletí do boku, a ve skoku skoro nic neváží */
  const mimo = d.th < MEZE_TH[0] ? d.th - MEZE_TH[0] : d.th > MEZE_TH[1] ? d.th - MEZE_TH[1] : 0;
  const alfa = (-d.aT[0] * Math.cos(d.th) - (G - Math.min(d.aT[1], 0.75 * G)) * Math.sin(d.th)) / ZAVES - (1.5 + (mimo ? 7 : 0)) * d.om - 150 * mimo + vitr;
  d.om = clamp(d.om + alfa * dt, -6, 6);
  d.th += d.om * dt;
  if (d.th < MEZE_TH[0] - 0.12 || d.th > MEZE_TH[1] + 0.14) {
    d.th = clamp(d.th, MEZE_TH[0] - 0.12, MEZE_TH[1] + 0.14);
    d.om *= -0.25;
  }
  /* střapec jde za lucernou se zpožděním */
  const sp = d.strapec;
  sp.om += (44 * (d.th - sp.th) - 3.6 * sp.om) * dt;
  sp.th = clamp(sp.th + sp.om * dt, d.th - 0.9, d.th + 0.9);
  const L = naLampe(T, d.th, [0, STRED_L]);
  d.L = L;

  /* ——— hrom v lucerně: blýská se na časy, často dvakrát za sebou ——— */
  d.doBlesku -= dt;
  if (d.doBlesku <= 0) {
    d.blesk = Math.max(d.blesk, 0.5 + 0.5 * R());
    d.tvar += 1 + Math.floor(R() * 2);
    d.doBlesku = R() < 0.42 ? 0.07 + 0.1 * R() : 1.3 + 2.8 * R();
    if (R() < 0.3) d.zvuk.push({ druh: "vyboj", sila: 0.1 + 0.1 * R(), pan: pan(L[0]) });
  }
  /* po šťouchnutí a při hromobití výboj chvíli přeskakuje */
  if (d.divoky > 0.15 && Math.floor(t * 18) !== Math.floor((t - dt) * 18)) d.tvar += 1;
  d.blesk = kCili(d.blesk, 0, dt, 0.11);
  d.zar = kCili(d.zar, 0, dt, 0.45);
  d.krokZar = kCili(d.krokZar, 0, dt, 0.16);
  d.divoky = kCili(d.divoky, 0, dt, 0.35);
  const kam = mys ? [clamp((mys.x - L[0]) / 26, -1, 1) * 3.4, clamp((mys.y - L[1]) / 26, -1, 1) * 3] : [0, 0];
  d.naklon = d.naklon.map((q, i) => kCili(q, kam[i], dt, 0.2));

  /* ——— stuha ——— */
  const koren = naKruh(UZEL, kruhV(d, fig));
  /* myš nahoru a dolů stuhu zvedá a sráží, proti směru chůze ji svěsí, po směru rozechvěje */
  d.smerStuhy = kCili(d.smerStuhy, Math.PI + clamp(-d.mysV[1] / 300, -0.8, 0.8), dt, 0.15);
  d.svesStuhy = kCili(d.svesStuhy, 1.2 * clamp(d.mysV[0] / 300), dt, 0.15);
  d.trepot = kCili(d.trepot, 1 + 0.5 * clamp(-d.mysV[0] / 300), dt, 0.15);
  krokStuhy(d, d.stuha, STUHA, koren, t, dt);
  krokStuhy(d, d.stuzka, STUZKA, koren, t, dt);
  d.skub = null;
  /* když konec stuhy švihne, práskne */
  const n = STUHA.n - 1, svist = Math.hypot(d.stuha.p[n][0] - d.stuha.q[n][0], d.stuha.p[n][1] - d.stuha.q[n][1]) / dt;
  if (svist > 150 && t - d.plesk > 0.7) {
    d.plesk = t;
    d.zvuk.push({ druh: "plesk", sila: clamp(svist / 320, 0.3, 0.8), pan: pan(d.stuha.p[n][0]) });
  }

  /* ——— déšť: pár kapek pořád, po ráně do bubnu přeháňka (na telefonu poloviční) ——— */
  d.lijak = kCili(d.lijak, 0, dt, 0.9);
  d.akum += dt * HUSTOTA * (3.2 + 30 * Math.min(1.5, d.lijak));
  while (d.akum >= 1) {
    d.akum -= 1;
    novaKapka(d);
  }
  for (const k of d.kapky) {
    k.x += k.vx * dt;
    k.y += k.vy * dt;
    if (k.y < k.zem) continue;
    k.pryc = true;
    if (k.buben >= 0) {
      kapkaNaBuben(d, k);
      continue;
    }
    if (k.x < 6 || k.x > 174) continue;
    vlnka(d, k.x, k.zem, 3.5 + k.v * 0.7, 0.7);
    if (t - d.kapT > 0.3 && R() < 0.5) {
      d.kapT = t;
      d.zvuk.push({ druh: "kap", sila: 0.1 + 0.1 * R(), vys: R(), pan: pan(k.x) });
    }
  }
  d.kapky = d.kapky.filter((k) => !k.pryc);
  for (const k of d.kola) {
    k.vek += dt;
    k.x -= d.posuv * dt;
  }
  d.kola = d.kola.filter((k) => k.vek < k.zivot);
  for (const k of d.cakance) {
    k.vy += 300 * dt;
    k.x += k.vx * dt;
    k.y += k.vy * dt;
  }
  d.cakance = d.cakance.filter((k) => k.y < k.zem || k.vy < 0);
  for (const j of d.jiskry) {
    j.vek += dt;
    j.x += j.vx * dt;
    j.y += j.vy * dt;
    j.vx *= 1 - Math.min(1, dt * 2.6);
    j.vy *= 1 - Math.min(1, dt * 2.6);
  }
  d.jiskry = d.jiskry.filter((j) => j.vek < j.zivot);

  /* ——— louže: přijede s cestou, a když je na dosah, Kapka do ní skočí ——— */
  if (d.louze) {
    const p = d.louze;
    p.x -= d.posuv * dt;
    const zbyva = (p.x - FX) / RYCHLOST - SKOK_LOUZE.priprava - SKOK_LOUZE.doba;
    if (!p.hotova && zbyva <= 0) {
      p.hotova = true;
      /* kdo zrovna skáče kvůli bubnu, louži prostě přejde */
      if (d.rezim === "jde" && zbyva > -0.1) zacniSkok(d, t, SKOK_LOUZE);
    }
    if (p.x < -4) {
      d.louze = null;
      d.doLouze = 15 + 9 * R();
    }
  } else {
    d.doLouze -= dt;
    if (d.doLouze <= 0) d.louze = { x: 200, hotova: false };
  }

  /* ——— pohled: za kurzorem, na buben, na louži, jinak na lucernu, občas na nás a nahoru do deště ——— */
  const oko = naTelo(OCI, fig);
  const smerem = (P) => [clamp((P[0] - oko[0]) / 40, -1, 1) * 2.2, clamp((P[1] - oko[1]) / 40, -1, 1) * 1.6];
  const tk = cyk(t / 9.4) * 9.4;
  let cp = tk < 5.4 ? smerem(L) : tk < 6.7 ? [0.1, 0.3] : tk < 8.1 ? [1.5, -1.5] : smerem(L);
  if (nej && t - nej.cas < 0.3) cp = [-2.1, -1.2];
  else if (d.zar > 0.5) cp = smerem(L);
  else if (d.louze && !d.louze.hotova && d.louze.x - FX < 64) cp = smerem([d.louze.x, ZEM]);
  else if (mys) cp = smerem([mys.x, mys.y]);
  d.pohled = d.pohled.map((q, i) => kCili(q, cp[i], dt, 0.09));
};
const novaDynamika = () => {
  const R = rng(3811);
  const d = {
    nahoda: R, zvuk: [],
    /* chůze: fáze dvojkroku, jak moc jde (0 = nohy u sebe), co dělá a odkdy */
    fi: 0.3, jde: 1, rezim: "jde", od: -2, skokJak: null, skok: 0, podrep: 0, dopadT: -100, posuv: RYCHLOST,
    /* tělo: zavlnění po došlapu, náklon, a kruh na zádech, který se kývá a nadskakuje o chvilku později */
    dosed: { a: 0, v: 0 }, nakl: { a: 0, v: 0 }, kruh: { a: 0, v: 0 }, kruhY: { a: 0, v: 0 },
    /* tyč a lucerna: dlaň, úhel tyče v ní, kyvadlo na špičce a střapec */
    H: [...H0], uhel: { a: UHEL0, v: 0 }, cilUhel: UHEL0, zdvih: 0, th: -0.03, om: 0, Tp: null, Vp: null, aT: [0, 0], L: [...L0], strapec: { th: 0, om: 0 },
    /* hrom v lucerně: záblesk, kdy přijde další, který výboj je vidět, zaplanutí po ráně, bliknutí do kroku */
    blesk: 0, doBlesku: 1.1, tvar: 0, zar: 0, krokZar: 0, divoky: 0, naklon: [0, 0], paprsky: -100,
    /* bubny: natočení znaků, o kolik se točí rychleji, jak svítí kůže; rány a to, co po nich přijde */
    znak: BUBNY.map((b) => (b.i * 47) % 360), roztoc: BUBNY.map(() => 0), bzar: BUBNY.map(() => 0),
    udery: [], casovane: [], palicka: KLID_U, combo: 0, comboT: -100, hromT: -100, hromobitiT: -100, viri: false, doTuku: 7,
    /* stuha: dva provazy, kam je žene vítr, jak moc jsou svěšené a rozechvělé, a čím je to právě škublo */
    stuha: null, stuzka: null, smerStuhy: Math.PI, svesStuhy: 0, trepot: 1, skub: null, plesk: -100,
    /* déšť a cesta */
    kapky: [], kola: [], cakance: [], jiskry: [], akum: 0, lijak: 0, kapT: -100, louze: null, doLouze: 12.5, splouch: -100,
    /* myš a tvář: odkdy se leká, žasne, raduje a blaženě zavírá oči */
    mysP: null, mysV: [0, 0], klikT: -100, pohled: [1.6, -0.4], lek: -100, uzas: -100, radost: -100, blaho: -100,
  };
  /* stuha natažená dozadu; pak se všechno nechá chvíli běžet, ať první snímek nezačíná rovnou čárou a prázdným nebem */
  const koren = naKruh(UZEL, kruhV(d, figV(d)));
  d.stuha = novyProvaz(cilStuhy(koren, STUHA, -2, Math.PI, 0, 1));
  d.stuzka = novyProvaz(cilStuhy(koren, STUZKA, -2, Math.PI, 0, 1));
  const nic = { mys: null, rychlost: 0, kliky: [] };
  for (let i = 120; i > 0; i--) krok(d, -i / 60, 1 / 60, nic);
  d.zvuk.length = 0;
  return d;
};
/** Jak se tváří. */
const vyraz = (d, t) => {
  if (t - d.lek < 0.45) return "leknuti";
  if (t - d.uzas >= 0 && t - d.uzas < 0.6) return "uzas";
  if (t >= d.radost && t - d.radost < 1.3) return "radost";
  if (d.udery.some((q) => q.sila > 0.6 && t - q.cas > -0.26 && t - q.cas < 0.32)) return "zapal";
  /* louži nejdřív uvidí, a pak už se do ní těší */
  if (d.rezim === "skok" && d.skokJak.typ === "louze") return t - d.od < d.skokJak.priprava ? "uzas" : "radost";
  if (t >= d.blaho && t - d.blaho < 1.5) return "blazena";
  return "klid";
};
const stav = (t, vstup = {}, dyn) => {
  const d = dyn || novaDynamika();
  const fig = figV(d), kruh = kruhV(d, fig);
  const H = d.H, T = spicka(H, d.uhel.a), th = d.th, L = naLampe(T, th, [0, STRED_L]);
  /* světlo: dýchá, blýská se, blikne s každým došlapem a po ráně zaplane */
  const S = Math.min(2.5, 0.74 + 0.07 * Math.sin(t * 2.1) + 0.04 * Math.sin(t * 5.3 + 1) + 0.55 * d.blesk + d.krokZar + d.zar);
  /* nohy: ve skoku jdou s tělem, přitáhnou se a špičky jim spadnou */
  const nohy = NOHY.map((n) => {
    const q = noha(n, d.fi, d.jde);
    return { x: q.dx * K, y: -q.zved * K - d.skok - Math.min(3, d.skok * 0.3), r: q.nakl + clamp(d.skok * 1.8, 0, n.blizko ? 13 : 17) };
  });
  const D = naLampe(T, th, [0, LAMP.dno[1]]);
  const hromobiti = clamp((t - d.paprsky) / 0.12) * clamp(1 - (t - d.paprsky - 0.5) / 0.9);
  return {
    t, fig, kruh, nohy, skok: d.skok, H, T, th, uhel: d.uhel.a, L, S, hromobiti,
    /* nožky: od spodku těla k chodidlu */
    nozky: NOHY.map((n, i) => {
      const a = rad(nohy[i].r), P = [NOHA0[i][0] + nohy[i].x, NOHA0[i][1] + nohy[i].y];
      return [naTelo([90 + n.x * 0.75, 134], fig), [P[0] + Math.sin(a) * 15.8 * K, P[1] - Math.cos(a) * 15.8 * K]];
    }),
    strapec: { x: D[0] - D0[0], y: D[1] - D0[1], r: -deg(d.strapec.th) },
    tvar: d.tvar, vyboj: clamp(0.14 + 1.5 * d.blesk + 0.7 * d.zar + 1.6 * d.krokZar + 0.6 * d.divoky), naklon: d.naklon,
    znaky: BUBNY.map((b) => ({ a: d.znak[b.i], zar: d.bzar[b.i] < 0.02 ? 0 : d.bzar[b.i] })),
    bubnuje: d.bzar.some((z) => z >= 0.02) || d.roztoc.some((r) => r > 20),
    palicka: d.palicka, rameno: naTelo(RAMENO, fig),
    stuha: d.stuha.p, stuzka: d.stuzka.p,
    vyraz: vyraz(d, t), pohled: d.pohled, mrk: mrkani(t, [1.4, 4.6, 4.86, 7.9], 9.4),
    /* světlo jí zbarví tváře */
    tvare: clamp(0.42 + 0.16 * clamp(S - 0.7) + (t >= d.radost && t - d.radost < 1.3 ? 0.14 : 0)),
    kapky: d.kapky.map((k) => ({ x: k.x, y: k.y, rot: deg(Math.atan2(-k.vx, k.vy)), v: k.v * (k.vzadu ? 0.78 : 1), b: k.b, vzadu: k.vzadu, op: (k.vzadu ? 0.5 : 0.86) * clamp((k.y - 2) / 12) * uKraje(k.x) })),
    splouch: (t - d.splouch) / 0.42,
    cakance: d.cakance.map((k) => ({ x: k.x, y: k.y, rot: deg(Math.atan2(-k.vx, k.vy)), v: k.v, b: k.b, op: 0.85 * uKraje(k.x) })),
    kola: d.kola, jiskry: d.jiskry, louze: d.louze,
    lijak: d.lijak, vitr: clamp(Math.hypot(d.mysV[0], d.mysV[1]) / 320), posuv: d.posuv,
  };
};
const snimek = (st) => Math.floor(st.t * 30);
const pohybTela = (st) => ({ x: st.fig.x, y: st.fig.y, r: st.fig.r, sx: st.fig.sx, sy: st.fig.sy, ox: FX, oy: ZEM });
/* kruh je tuhý: jde s tělem, ale nemačká se s ním, a kývá se kolem místa, kde zajíždí do zad */
const pohybKruhu = (st) => ({ x: st.kruh.x, y: st.kruh.y, r: st.kruh.r, ox: C0[0], oy: C0[1] });
const pohybGeta = (i) => (st) => ({ x: st.nohy[i].x, y: st.nohy[i].y, r: st.nohy[i].r, ox: NOHA0[i][0], oy: NOHA0[i][1] });
/* ručka s paličkou jde s tělem a otáčí se kolem ramene */
const pohybRuky = (st) => ({ x: st.rameno[0] - RAMENO0[0], y: st.rameno[1] - RAMENO0[1], r: st.fig.r + st.palicka - KLID_U, ox: RAMENO0[0], oy: RAMENO0[1] });
const pohybTyce = (st) => ({ x: st.H[0] - H0[0], y: st.H[1] - H0[1], r: st.uhel - UHEL0, ox: H0[0], oy: H0[1] });
const pohybLampy = (st) => ({ x: st.T[0] - T0[0], y: st.T[1] - T0[1], r: -deg(st.th), ox: T0[0], oy: T0[1] });
const pohybStrapce = (st) => ({ x: st.strapec.x, y: st.strapec.y, r: st.strapec.r, ox: D0[0], oy: D0[1] });
/* záře se po ráně rozroste, ale jen kam až plocha sahá */
const pohybZare = (st) => {
  const k = Math.max(0.6, Math.min(1 + 0.22 * Math.max(0, st.S - 1), (184 - st.L[0]) / ZARE_R));
  return { x: st.L[0] - L0[0], y: st.L[1] - L0[1], r: 0, sx: k, sy: k, ox: L0[0], oy: L0[1] };
};

export const lampion = {
  id: "lampion",
  viewBox: "0 0 180 180",
  defs,
  novaDynamika,
  krok,
  stav,
  /* prší pořád trochu a po ráně do bubnu víc; vítr dělá jen myš */
  hukot: (st) => ({ dest: f(clamp(0.16 + 0.42 * st.lijak)), vitr: f(clamp(0.06 + 0.8 * st.vitr)) }),
  /* v klidném režimu: uprostřed kroku, zrovna když se v lucerně zablesklo */
  klidne: { t: 10.23 },
  /** Rychlost chůze pro průvod: o kolik šířek kresby se má za sekundu posunout. Kapka se nezastavuje, ani když skáče: stav().posuv je rychlost cesty v jednotkách plochy za sekundu. */
  rychlost: RYCHLOST / 180,
  vrstvy: [
    { id: "zem", kresli: vrstvaZem, klic: snimek },
    { id: "dest-za", kresli: vrstvaDest(true), klic: snimek },
    { id: "zare", kresli: vrstvaZare, pohyb: pohybZare, pruhlednost: (st) => f(clamp(0.66 * st.S)) },
    { id: "paprsky", kresli: vrstvaPaprsky, klic: (st) => (st.hromobiti < 0.02 ? -1 : snimek(st)) },
    { id: "stuha", kresli: vrstvaStuha, klic: snimek },
    { id: "kruh", kresli: vrstvaKruh, pohyb: pohybKruhu },
    /* znaky se točí pomalu, stačí je překreslit patnáctkrát za vteřinu; po ráně každý snímek */
    { id: "znaky", kresli: vrstvaZnaky, klic: (st) => (st.bubnuje ? snimek(st) : `k${Math.floor(st.t * 15)}`), pohyb: pohybKruhu },
    { id: "tyc", kresli: vrstvaTyc, pohyb: pohybTyce },
    { id: "nohy", kresli: vrstvaNohy, klic: snimek },
    { id: "telo", kresli: vrstvaTelo, pohyb: pohybTela },
    { id: "svit", kresli: vrstvaSvit, pohyb: pohybTela, pruhlednost: (st) => f(clamp(0.14 + 0.6 * st.S)) },
    { id: "tvar", kresli: vrstvaTvar, klic: (st) => `${st.vyraz},${Math.round(st.pohled[0] * 5)},${Math.round(st.pohled[1] * 5)},${f(st.mrk)},${Math.round(st.tvare * 16)}`, pohyb: pohybTela },
    /* geta: vzdálenější dřív */
    { id: "geta-za", kresli: vrstvaGeta(1), pohyb: pohybGeta(1) },
    { id: "geta-pred", kresli: vrstvaGeta(0), pohyb: pohybGeta(0) },
    { id: "ruka-tyc", kresli: vrstvaRukaTyc, pohyb: pohybTyce },
    { id: "lampion-papir", kresli: vrstvaPapir, pohyb: pohybLampy },
    { id: "lampion-svit", kresli: vrstvaPapirSvit, pohyb: pohybLampy, pruhlednost: (st) => f(clamp(0.3 + 0.62 * st.S)) },
    { id: "lampion-vyboj", kresli: vrstvaVyboj, klic: (st) => `${st.tvar},${Math.round(st.vyboj * 8)},${Math.round(clamp(st.S, 0, 1.6) * 6)},${Math.round(st.naklon[0] * 2)},${Math.round(st.naklon[1] * 2)}`, pohyb: pohybLampy },
    { id: "lampion-kresba", kresli: vrstvaKresba, pohyb: pohybLampy },
    { id: "strapec", kresli: vrstvaStrapec, pohyb: pohybStrapce },
    { id: "ruka", kresli: vrstvaRuka, pohyb: pohybRuky },
    { id: "dest", kresli: vrstvaDest(false), klic: snimek },
  ],
};
