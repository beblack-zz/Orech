/*
 * 02, Tušový lem — MOKRÉ RUCE
 *
 * O Hlínce v partě stojí, že čeká, až ji někdo vezme do ruky, a že má ráda
 * šlofík a mokré ruce. Tak tady je: noc v dílně, ona spí na hrnčířském
 * kruhu, a z tmy se snesou dvě velké ruce. Nejsou z masa, jsou z noci —
 * vidět je z nich jen světlý obrys, stejná bledá žlutá jako měsíc
 * v hlavičce webu. Kruh se roztočí, ruce ji vystředí a vytáhnou do tvaru:
 * čajová miska, hrnek, konvička (výhonek jí zůstane jako úchytka víčka),
 * zásobnice. Hlínka to celé prospí. Ruce ji na chvíli ukážou, na polici
 * vzadu po ní zůstane světlý obrys na památku, a ona zívne a splaskne
 * zpátky do hroudy.
 *
 * Když je police skoro plná, přijde váza. Ta vydrží: ruce se pod ní
 * rozevřou, výhonek rozkvete a je z toho ikebana. Pak jí lístek spadne na
 * nos, kýchne, vzpomínky zhasnou a noc začíná znovu.
 *
 * Kliknutí: ruce se pustí do dalšího tvaru. Kliknutí během točení přidá
 * kruhu otáčky a hlína se rozkýve — po třetím to nevydrží a je z ní
 * placka. Myš: při tažení určuje, jak vysoko ji ruce vytáhnou; když spí
 * a kurzor je u ní, jedna ruka ji přijde pohladit.
 */
import {
  f, rng, clamp, lerp, smooth, rad, pt, hladka, pasPoBodech, hrouda, jiskraD, kvetD, LISTEK, pruzina,
  hlVyhonek, hlTvar, zzz, svetylko, kCili, pres, tusLem, NADOBY, michej, polomer, konturaNadoby, nadobaDefs, hlNadoba,
} from "./spolecne.js";

const ID = "hzr";
const TUS = tusLem(ID, { seed: 31, barva: "#10122B", lem: "#2C2F58" });
const OREZ = `${ID}-tus-orez`;
/* čím svítí ruce: bledě zlatá ze srpku měsíce v hlavičce, jako spáry u Střípka */
const ZLUTA = { jadro: "#FFF6DA", svetla: "#FFE7A3", zaklad: "#FBE3A0", okraj: "#D9B968" };
const NOC = "#171A3C";
const HRANA = "#2D3263";
const CX = 90, DNO = 142.4;
/* kruh: hlava, na které sedí, a setrvačník pod ní */
const HLAVA = { y: 143, rx: 32, ry: 5.8, tl: 3.8 };
const SETR = { y: 166, rx: 38, ry: 6.4, tl: 5 };
const PORADI = ["cawan", "junomi", "konvicka", "tsubo"];
const SLOTY = [54, 72, 90, 108, 126], POLICE = 45;
const T_SESTUP = 0.9, T_STRED = 1, T_TAH = 2.3, T_DETAIL = 1.3, T_HOTOVO = 1.6, T_ZEV = 1.5;
/* váza: kdy spadne lístek, kdy se nadechne a kdy kýchne */
const T_PLATEK = 3.4, T_NADECH = 4.5, T_KYCH = 5.1;
const NA_KRUHU = { sestup: 1, stred: 1, tah: 1, detail: 1 };
const yVe = (T, u) => DNO - u * T.H;

/* ——— Dílna v tuši ——— */
const dilna = () => {
  let s = `<rect x="0" y="0" width="180" height="182" fill="url(#${ID}-nebe)"/>`;
  /* podlaha z prken, sbíhají se za kruhem */
  s += `<path d="M0 131 H180 V182 H0 Z" fill="#0B0C1F"/>`;
  for (let x = -70; x <= 250; x += 26) s += `<path d="M${f(lerp(90, x, 0.4))} 131 L${x} 182" stroke="#1B1E45" stroke-width="0.5"/>`;
  s += `<path d="M0 131 H180" stroke="${HRANA}" stroke-width="0.6" opacity="0.8"/>`;
  s += `<ellipse cx="90" cy="152" rx="62" ry="15" fill="url(#${ID}-svit)" opacity="0.2"/>`;
  /* police na vzpomínky */
  s += `<rect x="37" y="${POLICE}" width="106" height="2.8" rx="0.6" fill="#1C1F47"/><path d="M37.6 ${POLICE} H142.4" stroke="#434A8C" stroke-width="0.5"/>`;
  for (const x of [47, 133]) s += `<path d="M${x - 1.2} ${POLICE + 2.8} H${x + 1.2} V${POLICE + 9} Z" fill="#1C1F47"/>`;
  /* vlevo zásobnice na hlínu s poklicí a naběračkou */
  s += `<path d="M18 131 C10 122 10 106 19 100 L18.4 96.4 H41.6 L41 100 C50 106 50 122 42 131 Z" fill="#090A1B"/>`;
  s += `<path d="M41 100 C50 106 50 122 42 131" stroke="${HRANA}" stroke-width="0.7" fill="none"/>`;
  s += `<path d="M16.4 96.4 H43.6 M30 96.4 V93.4 M27.4 93.2 H32.6" stroke="#23275A" stroke-width="1.5" stroke-linecap="round"/>`;
  s += `<path d="M22 110 Q30 113 38 109 M21 118 Q30 121 39 117" stroke="#1B1E45" stroke-width="0.6" fill="none"/>`;
  /* vpravo lišta s nářadím: očko, ledvinka, struna, utěrka */
  s += `<path d="M131 72 H166" stroke="#23275A" stroke-width="1.4" stroke-linecap="round"/>`;
  s += `<path d="M137 72 V86" stroke="#1B1E45" stroke-width="1"/><ellipse cx="137" cy="89.4" rx="2.4" ry="3.4" fill="none" stroke="#353A78" stroke-width="0.8"/>`;
  s += `<path d="M146 72 V78" stroke="#1B1E45" stroke-width="0.6"/><path d="M142.6 80 C142.6 77 149.4 77 149.4 80 C149.4 84.6 142.6 84.6 142.6 80 Z" fill="#0D0E24" stroke="#353A78" stroke-width="0.6"/>`;
  s += `<path d="M153.4 72 C152 80 156 84 154 92" stroke="#353A78" stroke-width="0.4" fill="none"/><path d="M152.4 92 H155.6" stroke="#353A78" stroke-width="1.2" stroke-linecap="round"/>`;
  s += `<path d="M159.6 72 H165.4 L166 91 L162.6 89 L159 91.4 Z" fill="#0D0E24" stroke="${HRANA}" stroke-width="0.5" stroke-linejoin="round"/>`;
  return s;
};
const vrstvaTus = () => TUS.skvrna + `<g clip-path="url(#${OREZ})">${dilna()}</g>`;

/* ——— Kruh ——— */
const vrstvaKruh = () => {
  const { y, rx, ry, tl } = SETR;
  let s = `<path d="M${CX - rx} ${y} V${y + tl} A${rx} ${ry} 0 0 0 ${CX + rx} ${y + tl} V${y} Z" fill="#131229"/>`;
  s += `<ellipse cx="${CX}" cy="${y}" rx="${rx}" ry="${ry}" fill="#211F47" stroke="#3A3F7C" stroke-width="0.5"/>`;
  /* hřídel a ložisko */
  s += `<rect x="${CX - 3.6}" y="${HLAVA.y + 3}" width="7.2" height="${y - HLAVA.y - 3}" fill="#19183A"/><path d="M${CX - 2} ${HLAVA.y + 5} V${y - 1}" stroke="#3A3F7C" stroke-width="0.5"/>`;
  s += `<ellipse cx="${CX}" cy="${y}" rx="7" ry="1.3" fill="#15142E" stroke="#3A3F7C" stroke-width="0.4"/>`;
  s += `<path d="M${CX - HLAVA.rx} ${HLAVA.y} V${HLAVA.y + HLAVA.tl} A${HLAVA.rx} ${HLAVA.ry} 0 0 0 ${CX + HLAVA.rx} ${HLAVA.y + HLAVA.tl} V${HLAVA.y} Z" fill="#1A1839"/>`;
  s += `<ellipse cx="${CX}" cy="${HLAVA.y}" rx="${HLAVA.rx}" ry="${HLAVA.ry}" fill="#2B2955" stroke="#4E5494" stroke-width="0.6"/>`;
  return s;
};
/** Rysky na hlavě a na setrvačníku: jedou dokola a při otáčkách se rozmažou do obloučků. */
const vrstvaRysky = (st) => {
  let s = "";
  const smuha = clamp(st.om * 0.022, 0, 0.5);
  for (const [K, r0, r1, n, barva] of [[HLAVA, 26, 30.6, 5, "#7078C4"], [SETR, 31, 36.6, 7, "#4E5494"]]) {
    const q = K.ry / K.rx;
    for (let i = 0; i < n; i++) {
      const a = st.fi + (i * Math.PI * 2) / n;
      if (smuha < 0.04) s += `<path d="M${f(CX + r0 * Math.cos(a))} ${f(K.y + r0 * q * Math.sin(a))} L${f(CX + r1 * Math.cos(a))} ${f(K.y + r1 * q * Math.sin(a))}" stroke="${barva}" stroke-width="0.8" stroke-linecap="round" opacity="0.8"/>`;
      else {
        const rs = (r0 + r1) / 2;
        const B = [0, 1, 2, 3, 4].map((k) => [CX + rs * Math.cos(a - (smuha * k) / 4), K.y + rs * q * Math.sin(a - (smuha * k) / 4)]);
        s += `<path d="${hladka(B)}" stroke="${barva}" stroke-width="${f((r1 - r0) * 0.45)}" stroke-linecap="round" fill="none" opacity="${f(0.6 - smuha * 0.5)}"/>`;
      }
    }
  }
  /* kalná voda kolem paty */
  if (st.mokro > 0.03) s += `<ellipse cx="${CX}" cy="${HLAVA.y}" rx="${f(st.T.r[0] + 5)}" ry="${f((st.T.r[0] + 5) * (HLAVA.ry / HLAVA.rx))}" fill="#8A7A69" opacity="${f(0.3 * st.mokro)}"/>`;
  return s;
};

/* ——— Vzpomínky na polici: obrys každého tvaru, kterým dnes v noci byla ——— */
const VZPOMINKY = Object.fromEntries([...PORADI, "vaza"].map((k) => [k, konturaNadoby(NADOBY[k])]));
const vrstvaVzpominky = (st) =>
  st.hotove
    .map((h, i) => {
      const vek = st.t - h.t0;
      if (vek < 0) return "";
      let op = smooth(vek / 0.5) * (0.78 + 0.22 * Math.sin(st.t * 1.3 + i * 1.7));
      if (st.mizi != null) op *= 1 - smooth((st.t - st.mizi - i * 0.2) / 0.45);
      if (op < 0.02) return "";
      const V = VZPOMINKY[h.klic];
      const blesk = 1 + 2.4 * (1 - smooth(vek / 0.7)) + 1.2 * st.slava;
      return (
        `<g transform="translate(${SLOTY[i]} ${POLICE}) scale(0.27)" opacity="${f(op)}" stroke-linecap="round" stroke-linejoin="round" fill="none">` +
        `<path d="${V.d}" stroke="${ZLUTA.svetla}" stroke-width="${f(7 * blesk)}" opacity="0.14"/>` +
        `<path d="${V.d}" stroke="${ZLUTA.zaklad}" stroke-width="2.3" fill="${ZLUTA.zaklad}" fill-opacity="0.09"/>` +
        `<path d="${V.linky}" stroke="${ZLUTA.zaklad}" stroke-width="1.7"/></g>`
      );
    })
    .join("");

/* ——— Hlínka na kruhu ——— */
const vrstvaTelo = (st) => st.N.telo;
const vrstvaTvar = (st) => `<g transform="${st.N.tvarT}">${hlTvar(ID, st.vyraz)}</g>`;
const vrstvaVyhonek = (st) => {
  const [x, y] = st.N.vrch;
  const m = 0.46 * (1 + 0.32 * st.kvet);
  let s = hlVyhonek({ kyv: 0 });
  if (st.kvet > 0.02) {
    /* rozkvete: velký květ na konci stonku, poupě na lístku, pyl svítí stejně jako ruce */
    const k = st.kvet * (1 + 0.25 * Math.sin(Math.PI * clamp(st.kvet)));
    s += `<g transform="translate(95 31) scale(${f(k)})"><path d="${kvetD(0, 0, 10.5, 0.3)}" fill="#F8C4D2" stroke="#D86D8E" stroke-width="0.8" stroke-linejoin="round"/><path d="${kvetD(0, 0, 5.2, 0.9)}" fill="#FBE0E8"/>`;
    for (let i = 0; i < 5; i++) s += `<circle cx="${f(2.6 * Math.cos(i * 1.257))}" cy="${f(2.6 * Math.sin(i * 1.257))}" r="0.8" fill="${ZLUTA.svetla}"/>`;
    s += `<circle r="1.5" fill="#C64C70"/></g>`;
    s += `<g transform="translate(75 37) scale(${f(clamp(st.kvet * 1.4))})"><path d="${kvetD(0, 0, 4.6, 0.1)}" fill="#F3AEC2" stroke="#D86D8E" stroke-width="0.6"/><circle r="0.9" fill="#C64C70"/></g>`;
  }
  return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(st.kyv)}) scale(${f(m)}) translate(-90 -54)">${s}</g>`;
};
const vrstvaZzz = (st) => (st.spi > 0.04 ? zzz(st.t, CX + polomer(st.T, 0.86) + 7, yVe(st.T, 1) + 5, { barva: "#C4C0EA", meritko: 0.8, sila: st.spi }) : "");
/* dvě světýlka, která kolem ní plavou, dokud spí; když se točí, uhnou na polici */
const vrstvaSvetylka = (st) => {
  /* když váza vydrží, rozsvítí se za ní noc */
  let s = st.slava > 0.02 ? `<circle cx="${CX}" cy="${DNO - 40}" r="${f(52 + 3 * Math.sin(st.t * 1.6))}" fill="url(#${ID}-svit)" opacity="${f(0.75 * st.slava)}"/>` : "";
  for (let i = 0; i < 4; i++) {
    const a = st.t * (0.42 + i * 0.07) + i * 1.9;
    const kolem = [CX + Math.cos(a) * (36 + i * 5), DNO - 24 + Math.sin(a * 1.3) * 16 - i * 3];
    const stranou = [i % 2 ? 150 - i * 4 : 26 + i * 5, 60 + i * 9 + Math.sin(a * 2) * 3];
    const k = st.plachost;
    s += svetylko(ID, lerp(kolem[0], stranou[0], k), lerp(kolem[1], stranou[1], k), 1.5 + 0.3 * (i % 2), 0.55 + 0.35 * Math.sin(st.t * 1.7 + i * 2.2));
  }
  return s;
};

/* ——— Ruce z noci ———
 * Kreslí se v místních souřadnicích levé ruky: dlaň kolem počátku, prsty
 * doprava, palec nahoře, předloktí odchází doleva nahoru do tmy. Pravá je
 * zrcadlo. Každý prst je tlustý tah světlou barvou a přes něj o něco užší
 * tah nocí, takže zbude jen obrys a prsty se překrývají, jak mají.
 */
const PRSTY = [[-4.8, 10.6, 3.2], [-1.6, 11.8, 3.4], [1.6, 11, 3.3], [4.7, 8.8, 2.9]];
/* ruce jsou obří: dlaň je širší než Hlínčina tvář */
const VELKA = 1.45;
const DLAN = "M-8.2 -5.4 C-3 -7.2 4 -6.8 7.6 -5.8 C9.2 -2 9.2 2.6 7.6 5.8 C3 7 -3 6.8 -8.2 5.2 C-9.4 2 -9.4 -2 -8.2 -5.4 Z";
const rukaSvg = (h, strana) => {
  if (h.op < 0.02) return "";
  const tah = (d, w) =>
    `<path d="${d}" stroke="${ZLUTA.zaklad}" stroke-width="${f(w + 0.95)}" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="${d}" stroke="${NOC}" stroke-width="${f(w)}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
  let prsty = "", vse = "";
  PRSTY.forEach(([ky, L, w], i) => {
    const a = rad((i - 1.5) * 8 * h.roztaz + 11 * h.ohyb);
    const d = L * (1 - 0.36 * h.ohyb);
    const K = [6.4, ky * (1 + 0.16 * h.roztaz)];
    const T = [K[0] + Math.cos(a) * d, K[1] + Math.sin(a) * d];
    const b = 0.5 + 1.9 * h.ohyb;
    const C = [K[0] + Math.cos(a) * d * 0.55 + Math.sin(a) * b, K[1] + Math.sin(a) * d * 0.55 - Math.cos(a) * b];
    const cesta = `M${pt(K)} Q${pt(C)} ${pt(T)}`;
    prsty += tah(cesta, w);
    vse += cesta + " ";
  });
  const ap = rad(lerp(-76, -20, h.palec));
  const P0 = [-1.8, -4.2], P1 = [P0[0] + Math.cos(ap) * 9.8, P0[1] + Math.sin(ap) * 9.8];
  const palec = `M${pt(P0)} Q${f(P0[0] + Math.cos(ap - 0.5) * 5.6)} ${f(P0[1] + Math.sin(ap - 0.5) * 5.6)} ${pt(P1)}`;
  /* předloktí míří do rohu, odkud ruka přišla, a ztrácí se ve tmě */
  const paze =
    `<g transform="rotate(${f(h.paze - h.uhel - 180)})">` +
    `<path d="M-5 -5 L-30 -6.6 L-74 -10 V10 L-30 6.6 L-5 5 Z" fill="url(#${ID}-paze-v)"/>` +
    `<path d="M-7 -5.1 L-30 -6.6 L-74 -10 M-7 5.1 L-30 6.6 L-74 10" stroke="url(#${ID}-paze)" stroke-width="0.55" stroke-linecap="round" stroke-linejoin="round" fill="none"/></g>`;
  return (
    `<g transform="translate(${f(h.x)} ${f(h.y)}) scale(${strana < 0 ? VELKA : -VELKA} ${VELKA}) rotate(${f(h.uhel)})" opacity="${f(h.op)}">` +
    `<circle r="19" fill="url(#${ID}-svit)" opacity="0.55"/>` +
    paze +
    `<path d="${vse}${palec}" stroke="${ZLUTA.svetla}" stroke-width="7" stroke-linecap="round" fill="none" opacity="0.1"/>` +
    `<path d="${DLAN}" fill="${NOC}" stroke="${ZLUTA.zaklad}" stroke-width="0.48" stroke-linejoin="round"/>` +
    prsty + tah(palec, 3.7) +
    /* vráska v zápěstí a klouby, ať je znát, že je to hřbet ruky */
    `<path d="M-7.2 -3.4 Q-6 0 -7.2 3.4 M5 -5 Q5.8 -4.2 5 -3.4 M5.4 -1.9 Q6.2 -1.1 5.4 -0.3 M5.4 1.3 Q6.2 2.1 5.4 2.9" stroke="${ZLUTA.okraj}" stroke-width="0.4" stroke-linecap="round" fill="none" opacity="0.7"/>` +
    `</g>`
  );
};
const vrstvaRuce = (st) => rukaSvg(st.ruce[0], -1) + rukaSvg(st.ruce[1], 1);

/* ——— Šlikr: kapky v letu a cákance, co po nich zůstanou ——— */
const vrstvaKapky = (st) =>
  st.kapky
    .map((k) => {
      const v = Math.hypot(k.vx, k.vy) || 1;
      return `<ellipse cx="${f(k.x)}" cy="${f(k.y)}" rx="${f(k.r * (1 + v * 0.012))}" ry="${f(k.r * 0.8)}" transform="rotate(${f((Math.atan2(k.vy, k.vx) * 180) / Math.PI)} ${f(k.x)} ${f(k.y)})" fill="#A39280"/>`;
    })
    .join("");
const vrstvaCakance = (st) =>
  st.cakance
    .map((c) => {
      const op = 0.8 * (1 - smooth((st.t - c.t0 - 14) / 8));
      return op > 0.02 ? `<path d="${hrouda(c.x, c.y, c.r * 1.5, c.r * 0.62, c.seed, { bodu: 8, kolisani: 0.3 })}" fill="#8A7A69" opacity="${f(op)}"/><circle cx="${f(c.x - c.r * 0.4)}" cy="${f(c.y - c.r * 0.14)}" r="${f(c.r * 0.26)}" fill="#C9B8A2" opacity="${f(op * 0.8)}"/>` : "";
    })
    .join("");

/* ——— Na papíře pod skvrnou: miska s vodou a houbou, nářadí ——— */
const vrstvaVpredu = () => {
  const O = "#3A322C";
  let s = `<ellipse cx="32" cy="178.4" rx="17" ry="1.5" fill="#221A22" opacity="0.28"/>`;
  /* miska s kalnou vodou, v ní mořská houba */
  s += `<path d="M20.6 169 Q21.4 177.6 28 178 H36 Q42.6 177.6 43.4 169 Z" fill="#E6DFCD" stroke="${O}" stroke-width="0.8" stroke-linejoin="round"/>`;
  s += `<ellipse cx="32" cy="169" rx="11.4" ry="2.4" fill="#F4EEE0" stroke="${O}" stroke-width="0.8"/><ellipse cx="32" cy="169.3" rx="9.8" ry="1.8" fill="#A99C8E"/>`;
  s += `<path d="${hrouda(35, 167.2, 5, 3.3, 5, { bodu: 11, kolisani: 0.16 })}" fill="#E3C27A" stroke="#8A6A2E" stroke-width="0.6"/>`;
  for (const [x, y] of [[33.4, 166.4], [36.4, 167.8], [35, 165.6], [37.6, 166.2]]) s += `<circle cx="${x}" cy="${y}" r="0.55" fill="#8A6A2E" opacity="0.7"/>`;
  s += `<path d="M22.6 172 Q23.4 176 27 176.8" stroke="#FFFFFF" stroke-width="0.9" stroke-linecap="round" fill="none" opacity="0.8"/>`;
  /* vpravo dřevěná ledvinka, očko a struna s kolíčky */
  s += `<ellipse cx="148" cy="178.6" rx="16" ry="1.3" fill="#221A22" opacity="0.25"/>`;
  s += `<path d="M137 177.6 C135 172 141 168.6 146 171 C150 173 148.6 177 144 178 Z" fill="#C9A26A" stroke="${O}" stroke-width="0.7" stroke-linejoin="round"/><circle cx="142" cy="174.4" r="1.1" fill="#F1EAD8" stroke="${O}" stroke-width="0.5"/>`;
  s += `<path d="M151 178 L160.6 168.4" stroke="${O}" stroke-width="2.2" stroke-linecap="round"/><path d="M151 178 L160.6 168.4" stroke="#B98B56" stroke-width="1.3" stroke-linecap="round"/><ellipse cx="162.6" cy="166.2" rx="2.1" ry="2.9" transform="rotate(42 162.6 166.2)" fill="none" stroke="${O}" stroke-width="0.8"/>`;
  s += `<path d="M124 178.4 C128 172 133 181 138 178.6" stroke="${O}" stroke-width="0.4" fill="none"/><path d="M122.4 177.6 V179.4 M139.6 177.6 V179.6" stroke="#B98B56" stroke-width="1.6" stroke-linecap="round"/>`;
  return s;
};

const vrstvaJiskry = (st) => {
  let s = st.jiskry
    .map((j) => {
      const q = j.vek / j.zivot;
      const op = clamp(Math.min(q / 0.08, (1 - q) / 0.5));
      if (j.listek) return `<path d="${LISTEK}" transform="translate(${f(j.x)} ${f(j.y)}) rotate(${f(j.rot + j.vek * 200)}) scale(${f(j.r)})" fill="#F8C4D2" stroke="#D86D8E" stroke-width="0.3" opacity="${f(op)}"/>`;
      return `<path d="${jiskraD(j.r * (1 - q * 0.45))}" transform="translate(${f(j.x)} ${f(j.y)}) rotate(${f(j.rot + q * 80)})" fill="${q < 0.3 ? ZLUTA.jadro : ZLUTA.svetla}" opacity="${f(op)}"/>`;
    })
    .join("");
  /* jiskra, která nese vzpomínku na polici */
  for (const l of st.letci) {
    const q = clamp((st.t - l.t0) / l.doba);
    if (q <= 0 || q >= 1) continue;
    const k = smooth(q);
    const x = lerp(l.x0, l.x1, k) + Math.sin(q * Math.PI) * l.bok, y = lerp(l.y0, l.y1, k);
    s += `<circle cx="${f(x)}" cy="${f(y)}" r="6" fill="url(#${ID}-svit)"/><path d="${jiskraD(2.6)}" transform="translate(${f(x)} ${f(y)}) rotate(${f(q * 200)})" fill="${ZLUTA.jadro}"/>`;
  }
  if (st.platek) s += `<path d="${LISTEK}" transform="translate(${pt(st.platek.p)}) rotate(${f(st.platek.r)}) scale(1.25)" fill="#F8C4D2" stroke="#D86D8E" stroke-width="0.3"/>`;
  return s;
};

const defs = () =>
  TUS.defs +
  nadobaDefs(ID, { svetla: "#94867B", stred: "#6B5F59", tmava: "#463E44" }) +
  `<linearGradient id="${ID}-nebe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1A1D4A" stop-opacity="0"/><stop offset="0.5" stop-color="#232863" stop-opacity="0.4"/><stop offset="0.72" stop-color="#2F3274" stop-opacity="0.7"/></linearGradient>` +
  `<radialGradient id="${ID}-svit"><stop offset="0" stop-color="${ZLUTA.svetla}" stop-opacity="0.5"/><stop offset="0.45" stop-color="${ZLUTA.zaklad}" stop-opacity="0.16"/><stop offset="1" stop-color="${ZLUTA.zaklad}" stop-opacity="0"/></radialGradient>` +
  `<linearGradient id="${ID}-paze" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${ZLUTA.zaklad}" stop-opacity="0"/><stop offset="0.7" stop-color="${ZLUTA.zaklad}"/></linearGradient>` +
  `<linearGradient id="${ID}-paze-v" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${NOC}" stop-opacity="0"/><stop offset="0.6" stop-color="${NOC}"/></linearGradient>`;

/* ——— Simulace ——— */
const jiskra = (dyn, x, y, vx, vy, volby = {}) => {
  const R = dyn.nahoda;
  dyn.jiskry.push({ x, y, vx, vy, vek: 0, zivot: (volby.zivot || 1) * (0.7 + R() * 0.6), r: (volby.r || 1) * (0.6 + R() * 0.8), rot: R() * 90, tiha: volby.tiha ?? 18, listek: !!volby.listek });
};
const cakni = (dyn, n, sila = 1) => {
  const R = dyn.nahoda;
  for (let i = 0; i < n; i++) {
    const s = R() < 0.5 ? -1 : 1, q = 0.12 + R() * 0.8;
    dyn.kapky.push({ x: CX + s * polomer(dyn.Tk, q), y: yVe(dyn.Tk, q), vx: s * (14 + R() * 36) * sila, vy: -(4 + R() * 30) * sila, r: 0.5 + R() * 0.9, zem: 150 + R() * 28 });
  }
};
const prejdi = (dyn, faze, t) => {
  dyn.faze = faze;
  dyn.tf = t;
  dyn.od = dyn.T;
};
const zacni = (dyn, t) => {
  dyn.cil = dyn.hotove.length >= PORADI.length ? "vaza" : PORADI[dyn.hotove.length];
  prejdi(dyn, "sestup", t);
  dyn.zvuk.push({ druh: "nabrat", sila: 0.7, pan: 0 });
};
/** Nevydržela to: placka. */
const spadni = (dyn, t) => {
  prejdi(dyn, "pad", t);
  dyn.wob = 0;
  dyn.om *= 0.3;
  dyn.zvuk.push({ druh: "plesk", sila: 1, pan: 0 });
  cakni(dyn, 24, 1.5);
};
/** Tvar, do kterého ji ruce vytáhnou: ucho, hubička a víčko přijdou až potom. */
const hruby = (klic) => ({ ...NADOBY[klic], hubicka: 0, ucho: 0, vicko: 0, otvor: 1 });
const SKRYTA = (s) => ({ x: CX + s * 60, y: 30, uhel: 56, paze: 236, roztaz: 0.5, ohyb: 0.25, palec: 0.3, op: 0, k: 0.3 });

const novaDynamika = () => {
  const dyn = {
    faze: "klid", tf: 0, od: NADOBY.hrouda, cil: "cawan", T: NADOBY.hrouda, Tk: NADOBY.hrouda, kTvar: 0,
    /* dva tvary už na polici stojí, ať noc nezačíná prázdná */
    hotove: [{ klic: "cawan", t0: -9 }, { klic: "junomi", t0: -9 }], mizi: null, verze: 1,
    fi: 0.3, om: 0, wob: 0, mokro: 0, zele: 0, zeleV: 0, vyska: 1, kvet: 0, hlazeni: 0, plachost: 0, spi: 1, slava: 0,
    ruce: [-1, 1].map((s) => ({ ...SKRYTA(s) })),
    kapky: [], cakance: [], jiskry: [], letci: [], platek: null, dalsi: 1.1, chichot: 0, nahoda: rng(4107), zvuk: [],
  };
  return dyn;
};
const krok = (dyn, t, dt, vstup) => {
  const R = dyn.nahoda;
  let klik = null;
  if (vstup.kliky && vstup.kliky.length) {
    klik = vstup.kliky[vstup.kliky.length - 1];
    vstup.kliky.length = 0;
  }
  if (klik) {
    if (dyn.faze === "klid") zacni(dyn, t);
    else if (NA_KRUHU[dyn.faze]) {
      /* přidat otáčky: hlína se rozkýve, a když je toho moc, spadne */
      dyn.om += 6.5;
      dyn.wob += 0.46;
      cakni(dyn, 7, 1.1);
      dyn.zvuk.push({ druh: "natah", sila: 0.5, pan: 0 });
      if (dyn.wob > 1.25) spadni(dyn, t);
    } else if (dyn.faze === "drzi") {
      /* polechtat vázu: kýchne dřív */
      if (t - dyn.tf < T_PLATEK) dyn.tf = t - T_PLATEK;
    } else dyn.dalsi = t;
  }
  const u = t - dyn.tf, uPred = u - dt;
  let T = NADOBY.hrouda, omCil = 0, mokroCil = 0, uRuky = 0.4, vlna = 0, kTvar = 0;
  switch (dyn.faze) {
    case "klid":
      if (t > dyn.dalsi) zacni(dyn, t);
      break;
    case "sestup":
      omCil = 9;
      mokroCil = 0.6;
      if (u > T_SESTUP) {
        prejdi(dyn, "stred", t);
        dyn.zvuk.push({ druh: "natah", sila: 0.7, pan: 0 });
      }
      break;
    case "stred": {
      /* středění: stisknout do kužele, pak stlačit do bochníku */
      const q = u / T_STRED;
      omCil = 10.5;
      mokroCil = 1;
      T = q < 0.55 ? michej(NADOBY.hrouda, NADOBY.kuzel, Math.sin((Math.PI * q) / 0.55)) : michej(NADOBY.hrouda, NADOBY.bochnik, smooth((q - 0.55) / 0.4));
      uRuky = q < 0.55 ? lerp(0.32, 0.62, Math.sin((Math.PI * q) / 0.55)) : 0.5;
      if (u > T_STRED) {
        dyn.T = T;
        prejdi(dyn, "tah", t);
        dyn.zvuk.push({ druh: "natah", sila: 0.9, pan: 0 });
      }
      break;
    }
    case "tah": {
      const k = smooth(u / T_TAH);
      omCil = 9;
      mokroCil = 1;
      kTvar = k;
      T = michej(dyn.od, hruby(dyn.cil), k);
      /* dva tahy odspodu nahoru, pod prsty jede vlna hlíny */
      const p = ((u / T_TAH) * 2) % 1;
      uRuky = lerp(0.16, 0.86, smooth(p));
      vlna = Math.sin(Math.PI * k);
      if (pres(uPred, u, T_TAH / 2)) dyn.zvuk.push({ druh: "natah", sila: 0.6, pan: 0 });
      if (u > T_TAH) {
        dyn.T = T;
        const N = NADOBY[dyn.cil];
        prejdi(dyn, N.hubicka || N.ucho || N.vicko ? "detail" : "hotovo", t);
      }
      break;
    }
    case "detail": {
      /* kruh stojí: vytáhnout hubičku, přilepit ucho, přiklopit víčko */
      const k = smooth(u / T_DETAIL);
      mokroCil = 0.8;
      kTvar = 1;
      T = michej(dyn.od, NADOBY[dyn.cil], k);
      if (pres(uPred, u, T_DETAIL * 0.8)) dyn.zvuk.push({ druh: "kon", sila: 0.35, pan: 0 });
      if (u > T_DETAIL) prejdi(dyn, "hotovo", t);
      break;
    }
    case "hotovo":
      T = NADOBY[dyn.cil];
      mokroCil = 0.5;
      kTvar = 1;
      if (uPred < 1e-6) {
        /* obrys odletí na polici */
        const i = dyn.hotove.length;
        dyn.hotove.push({ klic: dyn.cil, t0: t + 0.75 });
        dyn.letci.push({ x0: CX, y0: yVe(T, 1) - 6, x1: SLOTY[i], y1: POLICE - 8, t0: t + 0.05, doba: 0.7, bok: (i - 2) * -5 });
        dyn.zvuk.push({ druh: "rin", stupen: i, sila: 0.8, pan: (SLOTY[i] - 90) / 80, za: 0.75 });
        for (let j = 0; j < 8; j++) jiskra(dyn, CX + (R() - 0.5) * 30, yVe(T, 0.6 + R() * 0.4), (R() - 0.5) * 22, -10 - R() * 18, { zivot: 1, tiha: 12 });
      }
      if (u > T_HOTOVO) {
        if (dyn.cil === "vaza") {
          prejdi(dyn, "drzi", t);
          dyn.zvuk.push({ druh: "koto", nahoru: true, sila: 0.8, pan: 0, za: 0.25 });
        } else {
          prejdi(dyn, "zev", t);
          dyn.zvuk.push({ druh: "zev", sila: 0.9, pan: 0 });
        }
      }
      break;
    case "zev": {
      /* zívne a splaskne zpátky do hroudy */
      const k = smooth((u - 0.75) / (T_ZEV - 0.75));
      T = michej(NADOBY[dyn.cil], NADOBY.hrouda, k);
      kTvar = 1 - k;
      if (pres(uPred, u, 0.85)) {
        dyn.zeleV = 2.6;
        dyn.zvuk.push({ druh: "plesk", sila: 0.45, pan: 0 });
      }
      if (u > T_ZEV) {
        prejdi(dyn, "klid", t);
        dyn.dalsi = Math.max(dyn.dalsi, t) + 2.2 + R() * 1.2;
      }
      break;
    }
    case "pad":
      T = michej(dyn.od, NADOBY.placka, smooth(u / 0.2));
      if (u > 0.2) {
        prejdi(dyn, "placka", t);
        dyn.zeleV = 3.4;
      }
      break;
    case "placka":
      T = NADOBY.placka;
      if (u > 1.8) {
        prejdi(dyn, "vstan", t);
        dyn.zvuk.push({ druh: "natah", sila: 0.6, pan: 0 });
      }
      break;
    case "vstan":
      T = michej(NADOBY.placka, NADOBY.hrouda, smooth(u / 0.45));
      if (u > 0.45) {
        prejdi(dyn, "klid", t);
        dyn.zeleV = -2.4;
        dyn.dalsi = Math.max(dyn.dalsi, t + 2);
      }
      break;
    case "drzi":
      /* ikebana: výhonek rozkvete, pak lístek na nos */
      T = NADOBY.vaza;
      kTvar = 1;
      if (u > 0.3) dyn.kvet = kCili(dyn.kvet, 1, dt, 0.35);
      if (u < 2.4 && R() < dt * 7) jiskra(dyn, CX + (R() - 0.5) * 70, 60 + R() * 70, (R() - 0.5) * 6, -4 - R() * 8, { zivot: 1.8, tiha: -2, r: 0.9 });
      if (pres(uPred, u, T_NADECH)) dyn.zvuk.push({ druh: "nadech", sila: 0.9, pan: 0 });
      if (u > T_KYCH) {
        prejdi(dyn, "kych", t);
        dyn.mizi = t;
        dyn.zeleV = 3;
        dyn.zvuk.push({ druh: "kych", sila: 1, pan: 0 });
        dyn.zvuk.push({ druh: "koto", nahoru: false, sila: 0.5, pan: 0, za: 0.25 });
        const N = hlNadoba(ID, T, { cx: CX, dno: DNO });
        for (let j = 0; j < 16; j++) jiskra(dyn, N.vrch[0] + 2, N.vrch[1] - 12, (R() - 0.5) * 70, -20 - R() * 40, { zivot: 1.6, tiha: 50, r: 1.2, listek: true });
      }
      break;
    case "kych":
      T = michej(NADOBY.vaza, NADOBY.hrouda, smooth(u / 0.3));
      kTvar = 1 - smooth(u / 0.3);
      dyn.kvet = kCili(dyn.kvet, 0, dt, 0.06);
      if (u > 1.9) {
        dyn.hotove = [];
        dyn.mizi = null;
        dyn.verze++;
        prejdi(dyn, "klid", t);
        dyn.dalsi = t + 2.6;
      }
      break;
  }
  dyn.T = T;
  dyn.kTvar = kTvar;
  const naKruhu = !!NA_KRUHU[dyn.faze];
  dyn.om = kCili(dyn.om, omCil, dt, omCil > dyn.om ? 0.3 : 0.75);
  dyn.fi += dyn.om * dt;
  dyn.wob *= Math.exp(-dt / (naKruhu ? 1.3 : 0.25));
  dyn.mokro = kCili(dyn.mokro, mokroCil, dt, 0.5);
  [dyn.zele, dyn.zeleV] = pruzina(dyn.zele, dyn.zeleV, 0, dt, 170, 8.5);
  /* myš určuje, jak vysoko ji ruce vytáhnou */
  const vyskaCil = vstup.mys && kTvar > 0.05 && dyn.faze !== "drzi" ? lerp(1.3, 0.76, clamp((vstup.mys.y - 46) / 96)) : 1;
  dyn.vyska = kCili(dyn.vyska, vyskaCil, dt, 0.22);
  const n = T.r.length;
  const Tk = { ...T, H: T.H * lerp(1, dyn.vyska, kTvar) * (1 - dyn.zele), r: T.r.map((v, i) => v * (1 + dyn.zele * 0.5) + vlna * 1.7 * Math.exp(-Math.pow((i / (n - 1) - uRuky) / 0.13, 2))) };
  dyn.Tk = Tk;
  const osa = (q) => dyn.wob * 4.4 * Math.sin(dyn.fi + q * 2.2) * q;

  /* ——— Ruce: kam míří, a k cíli dojdou měkce ——— */
  const stredHl = [CX, DNO - 21];
  const hladi = dyn.faze === "klid" && vstup.mys && Math.hypot(vstup.mys.x - stredHl[0], vstup.mys.y - stredHl[1]) < 38 ? (vstup.mys.x < CX ? -1 : 1) : 0;
  dyn.hlazeni = kCili(dyn.hlazeni, hladi ? 1 : 0, dt, 0.3);
  if (dyn.hlazeni > 0.7 && t > dyn.chichot) {
    dyn.zvuk.push({ druh: "chichot", sila: 0.6, pan: 0 });
    dyn.chichot = t + 2.6 + R() * 1.6;
  }
  const maxR = Math.max(...Tk.r);
  dyn.ruce.forEach((h, i) => {
    const s = i ? 1 : -1;
    let c = SKRYTA(s);
    const naBoku = (q, odstup) => ({ x: CX + osa(q) + s * (Math.max(polomer(Tk, q), 11) + odstup), y: yVe(Tk, q) });
    switch (dyn.faze) {
      case "klid":
        if (hladi === s) c = { x: clamp(vstup.mys.x, CX - 15, CX + 15) + s * 14, y: yVe(Tk, 1) - 3 + 1.6 * Math.sin(t * 4.2), uhel: 24 + 9 * Math.sin(t * 4.2), paze: 250, roztaz: 0.3, ohyb: 0.5, palec: 0.4, op: 0.9, k: 0.14 };
        break;
      case "sestup":
        c = { ...naBoku(0.42, 13), uhel: 8, paze: 228, roztaz: 0.1, ohyb: 0.75, palec: 0.7, op: 1, k: 0.2 };
        break;
      case "stred":
        c = { ...naBoku(uRuky, 11.5), uhel: 8, paze: 228, roztaz: 0, ohyb: 0.85, palec: 0.8, op: 1, k: 0.07 };
        break;
      case "tah": {
        const q = clamp(uRuky + (s > 0 ? 0.05 : 0));
        c = { ...naBoku(q, 11.5), uhel: 9 - 9 * (q - 0.5), paze: 228, roztaz: 0, ohyb: 0.82, palec: q > 0.8 ? 1 : 0.6, op: 1, k: 0.07 };
        break;
      }
      case "detail": {
        const k = smooth((t - dyn.tf) / T_DETAIL);
        /* pravá vytahuje hubičku, levá lepí ucho */
        if (s > 0) c = { x: CX + polomer(Tk, 0.58) + 13 + 13 * k, y: yVe(Tk, 0.58) - 2 - 10 * k, uhel: 26, paze: 222, roztaz: 0, ohyb: 1, palec: 1, op: 1, k: 0.08 };
        else c = { x: CX - polomer(Tk, 0.5) - 14 - 11 * k, y: yVe(Tk, 0.52), uhel: 4, paze: 230, roztaz: 0, ohyb: 0.9, palec: 0.9, op: 1, k: 0.08 };
        break;
      }
      case "hotovo":
        /* ukázat: dlaně se rozevřou a odtáhnou */
        c = { x: CX + s * (maxR + 27 + 20 * Math.max(Tk.hubicka, Tk.ucho)), y: yVe(Tk, 0.55), uhel: -14, paze: 222, roztaz: 1, ohyb: 0.05, palec: 0.12, op: dyn.cil === "vaza" ? 0.9 : 0.9 * (1 - smooth((u - (T_HOTOVO - 0.5)) / 0.5)), k: 0.16 };
        break;
      case "drzi":
        c = { x: CX + s * 43, y: DNO - 3 + 1.2 * Math.sin(t * 1.1 + s), uhel: -26, paze: 214, roztaz: 0.5, ohyb: 0.3, palec: 0.3, op: 0.85, k: 0.3 };
        break;
      case "pad":
      case "kych":
        /* leknou se a ucuknou */
        c = { x: CX + s * 56, y: 92, uhel: -40, paze: 226, roztaz: 1, ohyb: 0, palec: 0, op: 1 - smooth((u - 0.6) / 0.7), k: 0.06 };
        break;
      case "placka":
        c = { x: CX + s * 56, y: 92, uhel: -40, paze: 226, roztaz: 1, ohyb: 0, palec: 0, op: 1 - smooth((u - 0.3) / 0.7), k: 0.1 };
        break;
    }
    const k = c.k;
    for (const a of ["x", "y", "uhel", "paze", "roztaz", "ohyb", "palec"]) h[a] = kCili(h[a], c[a], dt, k);
    h.op = kCili(h.op, c.op, dt, c.op > h.op ? 0.18 : 0.3);
  });
  dyn.plachost = kCili(dyn.plachost, dyn.faze === "klid" ? 0 : 1, dt, 0.6);
  dyn.spi = kCili(dyn.spi, dyn.faze === "klid" || dyn.faze === "hotovo" || (dyn.faze === "drzi" && u < T_PLATEK) ? 1 : 0, dt, 0.3);
  dyn.slava = kCili(dyn.slava, dyn.faze === "drzi" ? 1 : 0, dt, 0.5);

  /* lístek z květu: snese se jí na nos */
  if (dyn.faze === "drzi" && u >= T_PLATEK) {
    if (!dyn.platek) dyn.platek = { t0: t };
  } else dyn.platek = null;

  /* šlikr odstřikuje, dokud se točí */
  if (dyn.om > 4 && dyn.mokro > 0.4 && R() < dt * dyn.om * 0.32) cakni(dyn, 1, 0.75);
  for (const k of dyn.kapky) {
    k.vy += 120 * dt;
    k.x += k.vx * dt;
    k.y += k.vy * dt;
    if (k.y >= k.zem && k.vy > 0) {
      k.pryc = true;
      if (k.x > 6 && k.x < 174) dyn.cakance.push({ x: k.x, y: k.zem, r: k.r * (1 + R() * 0.8), t0: t, seed: Math.floor(R() * 1e5) });
      dyn.verze++;
    }
  }
  dyn.kapky = dyn.kapky.filter((k) => !k.pryc);
  if (dyn.cakance.length > 44) dyn.cakance.splice(0, dyn.cakance.length - 44);
  if (dyn.cakance.length && t - dyn.cakance[0].t0 > 22) {
    dyn.cakance.shift();
    dyn.verze++;
  }
  for (const j of dyn.jiskry) {
    j.vek += dt;
    j.x += j.vx * dt;
    j.y += j.vy * dt;
    j.vx *= 1 - dt * 1.8;
    j.vy += j.tiha * dt;
  }
  dyn.jiskry = dyn.jiskry.filter((j) => j.vek < j.zivot);
  dyn.letci = dyn.letci.filter((l) => t - l.t0 < l.doba + 0.1);
  /* cvrček drží noc, když se nic netočí */
  if (dyn.faze === "klid" && R() < dt * 0.3) dyn.zvuk.push({ druh: "cvrcek", sila: 0.45, pan: (R() - 0.5) * 1.6 });
};

const VYRAZY = {
  klid: { oci: "spi", usta: "usmev", tvare: 0.45 },
  sestup: { oci: "tvrde", usta: "spanek", tvare: 0.45 },
  stred: { oci: "tvrde", usta: "spanek", tvare: 0.5 },
  tah: { oci: "tvrde", usta: "o", tvare: 0.55 },
  detail: { oci: "kych", usta: "vlnka", tvare: 0.7 },
  hotovo: { oci: "spi", usta: "usmev", tvare: 0.65 },
  pad: { oci: "siroke", usta: "o", tvare: 0.4 },
  placka: { oci: "ospale", usta: "vlnka", tvare: 0.5 },
  vstan: { oci: "ospale", usta: "vlnka", tvare: 0.5 },
  drzi: { oci: "smich", usta: "usmev", tvare: 0.8 },
};
const stav = (t, vstup = {}, dyn) => {
  const d = dyn || novaDynamika();
  const u = t - d.tf;
  const osa = (q) => d.wob * 4.4 * Math.sin(d.fi + q * 2.2) * q;
  const N = hlNadoba(ID, d.Tk, { cx: CX, dno: DNO, faze: d.fi, mokro: d.mokro, osa, obrys: "#2E2630" });
  let vyraz = VYRAZY[d.faze] || VYRAZY.klid;
  if (d.faze === "klid" && d.hlazeni > 0.4) vyraz = { oci: "smich", usta: "usmev", tvare: 0.85 };
  else if (d.faze === "zev") vyraz = u < 0.95 ? { oci: "tvrde", usta: "zev", tvare: 0.5 } : VYRAZY.klid;
  else if (d.faze === "kych") vyraz = u < 0.4 ? { oci: "kych", usta: "kych", tvare: 0.7 } : u < 1.1 ? { oci: "ospale", usta: "vlnka", tvare: 0.5 } : VYRAZY.klid;
  else if (d.faze === "drzi" && u > T_NADECH) vyraz = { oci: "siroke", usta: "o", tvare: 0.6, dy: 1.6 };
  else if (d.faze === "drzi" && u > T_PLATEK + 0.85) vyraz = { oci: "ospale", usta: "vlnka", tvare: 0.6 };
  /* lístek padá z květu na nos */
  let platek = null;
  if (d.platek) {
    const q = clamp((t - d.platek.t0) / 0.9);
    const od = [N.vrch[0] + 3, N.vrch[1] - 12], kam = [N.stredTvare[0], N.stredTvare[1] + 1.4];
    platek = { p: [lerp(od[0], kam[0], q) + Math.sin(q * 7) * 5 * (1 - q), lerp(od[1], kam[1], q * q)], r: 30 + (1 - q) * 300 };
  }
  const dech = Math.sin(t * 1.25);
  return {
    t, faze: d.faze, T: d.Tk, N, fi: d.fi, om: d.om, mokro: d.mokro, ruce: d.ruce, kapky: d.kapky, cakance: d.cakance, jiskry: d.jiskry, letci: d.letci,
    hotove: d.hotove, mizi: d.mizi, verze: d.verze, kvet: d.kvet, vyraz, platek, plachost: d.plachost, spi: d.spi, slava: d.slava,
    kyv: 5 * Math.sin(t * 1.1) + d.wob * 18 * Math.sin(d.fi) + d.zeleV * 3,
    /* v klidu jen dýchá, to zvládne posun vrstvy; jinak se tělo překresluje */
    zije: d.faze !== "klid" || d.om > 0.12 || Math.abs(d.zele) > 0.004 || Math.abs(d.zeleV) > 0.05,
    dech: d.faze === "klid" ? dech : 0,
  };
};
const snimek = (st) => Math.floor(st.t * 30);
const pohyb = (st) => ({ x: 0, y: 0, ox: CX, oy: DNO, sx: 1 - 0.008 * st.dech, sy: 1 + 0.014 * st.dech });

export const lemRuce = {
  id: "ruce",
  viewBox: "0 0 180 180",
  defs,
  novaDynamika,
  krok,
  stav,
  /* kruh hučí podle otáček, jinak je slyšet jen noc */
  sum: (st) => (st.om > 0.4 ? { mira: clamp(st.om / 11) * 0.9, f: 110 + st.om * 24, q: 1.1, typ: "lowpass", pan: 0 } : { mira: 0.1, f: 420, q: 0.5, pan: 0 }),
  klidne: { t: 7 },
  vrstvy: [
    { id: "tus", kresli: vrstvaTus, tezka: true },
    { id: "vzpominky", kresli: vrstvaVzpominky, klic: (st) => (st.mizi != null || st.hotove.some((h) => st.t - h.t0 < 0.8) ? snimek(st) : `${st.hotove.length},${Math.floor(st.t * 5)},${f(st.slava)}`), orez: OREZ },
    { id: "svetylka", kresli: vrstvaSvetylka, klic: (st) => Math.floor(st.t * 15), orez: OREZ },
    { id: "kruh", kresli: vrstvaKruh },
    { id: "rysky", kresli: vrstvaRysky, klic: (st) => `${f(st.fi)},${f(st.mokro)}` },
    { id: "cakance", kresli: vrstvaCakance, klic: (st) => `${st.verze},${st.cakance.length ? Math.floor(st.t) : 0}` },
    { id: "telo", kresli: vrstvaTelo, klic: (st) => (st.zije ? snimek(st) : "k"), pohyb },
    { id: "vyhonek", kresli: vrstvaVyhonek, klic: (st) => (st.zije ? snimek(st) : `k${Math.floor(st.t * 10)}`), pohyb },
    { id: "tvar", kresli: vrstvaTvar, klic: (st) => `${st.N.tvarT},${st.vyraz.oci},${st.vyraz.usta},${st.vyraz.tvare}`, pohyb },
    { id: "zzz", kresli: vrstvaZzz, klic: (st) => (st.spi > 0.04 ? Math.floor(st.t * 12) : -1) },
    { id: "ruce", kresli: vrstvaRuce, klic: (st) => (st.ruce[0].op > 0.02 || st.ruce[1].op > 0.02 ? snimek(st) : -1), orez: OREZ },
    { id: "kapky", kresli: vrstvaKapky, klic: (st) => (st.kapky.length ? snimek(st) : -1) },
    { id: "vpredu", kresli: vrstvaVpredu },
    { id: "jiskry", kresli: vrstvaJiskry, klic: (st) => (st.jiskry.length || st.letci.length || st.platek ? snimek(st) : -1) },
  ],
};
