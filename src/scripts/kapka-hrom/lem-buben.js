/*
 * 02, Tušový lem — BUBEN JE MĚSÍC
 *
 * Největší buben, ódaiko, se o slavnostech bije zády k lidem. Kapka si
 * na to vylezla na lešení (geta nechala dole u žebříku, bubeníci hrají
 * bosi), kolem hlavy má čelenku a paličky nad hlavou. Před ní visí ve tmě
 * buben, jaký má jen bůh hromu: kůže je úplněk a mitsudomoe na ní jsou
 * měsíční moře. Tělo bubnu se ztrácí v noci, vidět jsou jen cvočky po
 * obvodu — vypadají jako hvězdy. Nic jiného tu nesvítí; měsíc má barvu
 * srpku v hlavičce webu.
 *
 * Každá rána rozvlní světlo po kůži, přižene kus mraku a setřese z nebe
 * trochu deště. Pod lešením z toho roste louže tuše, vytéká ven na papír
 * a měsíc se v ní skládá do odrazu. Když je plná, Kapka zavíří, dá
 * poslední ránu oběma paličkami — zahřmí a spustí se liják. Až se vyprší,
 * mraky se rozejdou, ona se otočí a ukloní se. Louže se vsákne, ozvou se
 * žáby a noc začíná znovu.
 *
 * Kliknutí do kůže: rána. Uprostřed buben duní, u kraje zní výš; kliknutí
 * mimo kůži jsou paličky o sebe. Myš: paličky míří za kurzorem a rychlý
 * pohyb je vítr, který nakloní déšť. Když se nic neděje, bubnuje sama
 * a zrychluje.
 */
import {
  f, rng, clamp, lerp, smooth, pt, kCili, vzorkuj, pasPoBodech, chomac, jiskraD, mrkani,
  kapDefs, kapTelo, kapTvar, naGeta, getaSvg, svih, tomoe, poCare, novyProvaz, krokProvazu, hodProvazem, tusLem, ZLUTA,
} from "./spolecne.js";

const ID = "kh2";
const NOC = { tus: "#0F1128", lem: "#2B2E55", telo: "#191C40", telo2: "#22264E", drevo: "#2A2848", drevo2: "#3A3862", mrak: "#1F2350", mrak2: "#2B3066", palicka: "#3F3C66", stuzka: "#A8433A", stuzka2: "#7C2F2C" };
const DEN = { prkno: "#C99A68", tram: "#B08456", stin: "#8C6444", obrys: "#6B5D4F" };
const TUS = tusLem(ID, { seed: 31, barva: NOC.tus, lem: NOC.lem, stred: [90, 90], polomer: [86, 84] });
const OREZ = `${ID}-tus-orez`;
/* voda a stín z tisku, jak vypadají v noci */
const VODA_NOC = { svetla: "#6F97C4", zaklad: "#527BAC", hluboka: "#3E6294", lesk: "#B7D2EA", okraj: "#9CC0E0", chodidlo: "#36567F", oko: "#132544", odlesk: "#E3F0FB", tvare: "#B8708C", jazyk: "#C9787A" };
const SOUMRAK_NOC = ["#8A3428", "#84506A", "#5C4A78", "#3E3C6E", "#262854"];

/* ——— Buben ——— */
const CM = [90, 64], RM = 46;
const ZNAK = (0.6 * RM) / 8.4;
/* ——— Kapka: stojí bosa na plošině ——— */
const K = 0.5, STOJI = [90, 146];
const POSTAVA = `translate(${STOJI[0]} ${STOJI[1]}) scale(${K}) translate(-90 -146)`;
const vPostave = (s) => `<g transform="${POSTAVA}">${s}</g>`;
const naPlatno = ([x, y]) => [STOJI[0] + (x - 90) * K, STOJI[1] + (y - 146) * K];
/* ruce a špičky paliček v klidu (od místa, kde stojí), a kam je dá, když se klaní */
const RUKA0 = { L: [-17.5, -27], P: [17.5, -27] }, SPICKA0 = { L: [-31, -66], P: [31, -66] };
const RUKA_DOLE = { L: [-19.5, -21], P: [19.5, -21] }, SPICKA_DOLE = { L: [-38, 4], P: [38, 4] };
/* uzel čelenky vzadu na hlavě (v souřadnicích postavy, už na výšce těla) */
const UZEL = [90, 79.6];
const N_CIP = 7, CIP = 2.4;

/* ——— Jak to jde za sebou ——— */
const NA_RANU = 0.075;
const VIRENI = [0, 0.24, 0.46, 0.66, 0.84, 1.0, 1.14, 1.26, 1.36, 1.45, 1.53, 1.6];
const VELKA = 2.05;
const LIJE = 3.3, OTOCKA = 0.5, POKLONA = 2.7, KLID = 4.2;
const TICHO = 4;

/* ——— Pevné kusy scény ——— */
const HVEZDY = (() => {
  const r = rng(77);
  const H = [];
  while (H.length < 17) {
    const x = 12 + r() * 156, y = 12 + r() * 120;
    if (Math.hypot(x - CM[0], y - CM[1]) < RM + 14) continue;
    if (Math.hypot((x - 90) / 78, (y - 90) / 76) > 1) continue;
    H.push({ x, y, r: 0.5 + r() * 0.7, fz: r() * 6.28, velka: r() < 0.3 });
  }
  return H;
})();
const mrak = (rx, ry, seed) => ({
  d: chomac(0, 0, rx, ry, Math.round(rx / 2.6), seed, 0.35, 0.66),
  s: [chomac(-rx * 0.42, -ry * 0.5, rx * 0.26, ry * 0.42, 8, seed + 1, 1, 0.7), chomac(rx * 0.18, -ry * 0.62, rx * 0.3, ry * 0.42, 9, seed + 2, 1, 0.7)],
});
const MRAKY = [
  { ...mrak(46, 8, 51), y: 100, od: -62, k: 46 },
  { ...mrak(38, 7, 53), y: 36, od: 236, k: 138 },
  { ...mrak(50, 9, 55), y: 121, od: 250, k: 136 },
  { ...mrak(30, 6, 57), y: 22, od: -44, k: 40 },
  { ...mrak(34, 6.5, 59), y: 70, od: 232, k: 150 },
];
const cvocky = (r, n, rc, posun = 0) => {
  let s = "";
  for (let i = 0; i < n; i++) {
    const a = ((i + posun) / n) * Math.PI * 2;
    s += `<circle cx="${f(CM[0] + Math.cos(a) * r)}" cy="${f(CM[1] + Math.sin(a) * r)}" r="${rc}"/>`;
  }
  return s;
};
/* lešení se žebříkem: stejné tvary ve dne (na papíře) i v noci (v tuši) */
const vez = (b) => {
  const o = b.obrys ? ` stroke="${b.obrys}" stroke-width="0.7" stroke-linejoin="round"` : "";
  let s = `<path d="M69.5 151 L115 171.5 M110.5 151 L65 171.5" stroke="${b.stin}" stroke-width="2.3" stroke-linecap="round"/>`;
  s += `<path d="M66.4 149 H71.4 L66.4 175 H61 Z M108.6 149 H113.6 L119 175 H113.6 Z" fill="${b.tram}"${o}/>`;
  s += `<rect x="62.4" y="160.6" width="55.2" height="3.1" rx="0.8" fill="${b.tram}"${o}/>`;
  /* žebřík opřený zleva o plošinu */
  s += `<path d="M44.6 178 L58.6 146.4 M50.6 178 L64.4 147" stroke="${b.obrys || b.tram}" stroke-width="${b.obrys ? 2.6 : 1.9}" stroke-linecap="round"/>`;
  if (b.obrys) s += `<path d="M44.6 178 L58.6 146.4 M50.6 178 L64.4 147" stroke="${b.tram}" stroke-width="1.5" stroke-linecap="round"/>`;
  for (let i = 0; i < 6; i++) {
    const q = 0.09 + i * 0.16;
    s += `<path d="M${f(lerp(44.6, 58.6, q))} ${f(lerp(178, 146.4, q))} L${f(lerp(50.6, 64.4, q))} ${f(lerp(178, 147, q))}" stroke="${b.obrys || b.stin}" stroke-width="${b.obrys ? 1.5 : 1.1}" stroke-linecap="round"/>`;
  }
  /* plošina */
  s += `<rect x="59" y="146" width="62" height="4.2" rx="1" fill="${b.prkno}"${o}/>`;
  s += `<path d="M61 147.5 H119" stroke="${b.linka}" stroke-width="0.7" stroke-linecap="round" opacity="0.8"/>`;
  return s;
};
const vrstvaPapir = () =>
  vez({ prkno: DEN.prkno, tram: DEN.tram, stin: DEN.stin, obrys: DEN.obrys, linka: "#E2BE8C" }) +
  /* geta nechala dole u žebříku */
  `<ellipse cx="33.5" cy="178.4" rx="11" ry="1.5" fill="#7A5E8E" opacity="0.22"/>` +
  `<g transform="translate(29.5 178.2) rotate(-7) scale(0.5) translate(-80 -159.2)">${getaSvg(71)}<path d="M73.6 146 Q80 140.4 86.4 146" stroke="#C4432B" stroke-width="1.9" stroke-linecap="round" fill="none"/></g>` +
  `<g transform="translate(38.6 178.6) rotate(5) scale(0.5) translate(-80 -159.2)">${getaSvg(71)}<path d="M73.6 146 Q80 140.4 86.4 146" stroke="#C4432B" stroke-width="1.9" stroke-linecap="round" fill="none"/></g>`;
const vrstvaVezNoc = () => vez({ prkno: NOC.drevo2, tram: NOC.drevo, stin: "#1D1C38", obrys: null, linka: "#4A4878" });
/* dva hřebeny kopců: o tón světlejší tuš, ať má noc zem */
const vrstvaKopce = () =>
  `<path d="M-6 146 C14 132 30 139 44 133 C58 127 66 140 82 138 C100 136 108 128 124 131 C142 134 150 126 168 132 L190 138 V186 H-6 Z" fill="#141838"/>` +
  `<path d="M-6 160 C18 150 34 158 56 153 C80 148 98 160 120 156 C142 152 160 158 190 150 V186 H-6 Z" fill="#12163A"/>`;
/* rosnička na papíře vedle louže: po dešti kváká, nafukuje při tom hrdlo */
const ZABA = [153.5, 177.6];
const vrstvaZaba = (st) => {
  const k = st.kvak;
  return (
    `<g transform="translate(${ZABA[0]} ${ZABA[1]})">` +
    `<ellipse cx="0" cy="0.6" rx="6.4" ry="1" fill="#7A5E8E" opacity="0.22"/>` +
    `<path d="M-5.2 0 Q-6.6 -1.6 -4.4 -2.8 M5.2 0 Q6.6 -1.6 4.4 -2.8" stroke="#6E8F4A" stroke-width="1.5" stroke-linecap="round" fill="none"/>` +
    (k > 0.03 ? `<circle cx="0.4" cy="${f(-1.6 - k * 0.5)}" r="${f(1.2 + k * 2)}" fill="#E4EBC0" stroke="#5B6B44" stroke-width="0.3"/>` : "") +
    `<path d="M-4.4 0 C-5 -3.4 -2.6 -5.6 0 -5.6 C2.6 -5.6 5 -3.4 4.4 0 Z" fill="#8DB063" stroke="#5B6B44" stroke-width="0.4" stroke-linejoin="round"/>` +
    `<circle cx="-2.1" cy="-5.3" r="1.25" fill="#8DB063" stroke="#5B6B44" stroke-width="0.35"/><circle cx="2.1" cy="-5.3" r="1.25" fill="#8DB063" stroke="#5B6B44" stroke-width="0.35"/>` +
    `<circle cx="-2.1" cy="-5.4" r="0.55" fill="#2B2420"/><circle cx="2.1" cy="-5.4" r="0.55" fill="#2B2420"/>` +
    `<path d="M-1.5 -3 Q0 -2.2 1.5 -3" stroke="#5B6B44" stroke-width="0.4" stroke-linecap="round" fill="none"/>` +
    `</g>`
  );
};
const vrstvaHvezdy = () =>
  HVEZDY.map((h) => (h.velka ? `<path d="${jiskraD(h.r * 1.9)}" transform="translate(${f(h.x)} ${f(h.y)})" fill="${ZLUTA.svetla}" opacity="0.8"/>` : `<circle cx="${f(h.x)}" cy="${f(h.y)}" r="${f(h.r * 0.6)}" fill="${ZLUTA.svetla}" opacity="0.7"/>`)).join("");
/* tělo bubnu: v noci skoro není, jen dvě řady cvočků */
const vrstvaTeloBubnu = () =>
  `<circle cx="${CM[0]}" cy="${CM[1]}" r="${RM + 9.4}" fill="${NOC.telo}"/>` +
  `<circle cx="${CM[0]}" cy="${CM[1]}" r="${RM + 5}" fill="none" stroke="${NOC.telo2}" stroke-width="1"/>` +
  `<g fill="${ZLUTA.zaklad}" opacity="0.85">${cvocky(RM + 3.1, 40, 0.62)}</g><g fill="${ZLUTA.zaklad}" opacity="0.55">${cvocky(RM + 7.1, 40, 0.5, 0.5)}</g>`;
/* kůže: jedna čistá plocha; znak je noc, která jí prosvítá */
const vrstvaMesic = () => `<circle cx="${CM[0]}" cy="${CM[1]}" r="${RM}" fill="${ZLUTA.zaklad}"/>`;
const vrstvaZnak = () => `<g transform="translate(${CM[0]} ${CM[1]}) scale(${f(ZNAK)})">${tomoe(NOC.tus)}</g>`;
/* rána rozvlní světlo po kůži: kruhy od místa úderu, jen na kůži */
const vrstvaVlny = (st) => {
  let s = "";
  for (const v of st.vlny) {
    for (let j = 0; j < 3; j++) {
      const q = (v.vek - j * 0.09) / 1.1;
      if (q <= 0 || q >= 1) continue;
      const r = 3 + q * RM * 1.9 * (0.6 + 0.4 * v.sila);
      s += `<circle cx="${f(v.x)}" cy="${f(v.y)}" r="${f(r)}" fill="none" stroke="${j === 1 ? ZLUTA.okraj : ZLUTA.jadro}" stroke-width="${f((j === 1 ? 1.1 : 2.2) * (1 - q) * v.sila + 0.2)}" opacity="${f((1 - q) * (j === 1 ? 0.7 : 1))}"/>`;
    }
  }
  return s ? `<g clip-path="url(#${ID}-kuze)">${s}</g>` : "";
};
const vrstvaMraky = (st) =>
  MRAKY.map((m, i) => `<g transform="translate(${f(lerp(m.od, m.k, smooth(st.mraky * 1.25 - i * 0.06)) + 3 * Math.sin(st.t * 0.3 + i * 2))} ${m.y})"><path d="${m.d}" fill="${NOC.mrak}"/><path d="${m.s[0]} ${m.s[1]}" fill="${NOC.mrak2}"/></g>`).join("");
/* louže tuše pod lešením: vyteče až na papír a měsíc se v ní skládá do odrazu */
const LOUZE = [90, 174.6];
const vrstvaLouze = (st) => {
  const m = st.louze;
  if (m < 0.02) return "";
  const rx = 6 + 42 * m, ry = 1 + 4.6 * m;
  const r = rng(5);
  const B = [];
  for (let i = 0; i < 22; i++) {
    const u = (i / 22) * Math.PI * 2;
    const k = 1 + (r() - 0.5) * 0.14 + 0.05 * Math.sin(u * 3 + 1);
    B.push([LOUZE[0] + Math.cos(u) * rx * k, LOUZE[1] + Math.sin(u) * ry * k]);
  }
  let d = `M${pt(B[0])}`;
  for (let i = 0; i < 22; i++) {
    const a = B[i], b = B[(i + 1) % 22];
    d += ` Q${pt(a)} ${f((a[0] + b[0]) / 2)} ${f((a[1] + b[1]) / 2)}`;
  }
  let s = `<path d="${d} Z" fill="${NOC.tus}"/>`;
  /* odraz: pár plochých čoček nad sebou, které se na hladině rozcházejí */
  const jas = clamp((m - 0.12) / 0.5) * (1 - 0.8 * st.mraky * (1 - st.svitani));
  if (jas > 0.02) {
    const pruhu = 4;
    for (let i = 0; i < pruhu; i++) {
      const q = (i + 0.5) / pruhu - 0.5;
      const w = rx * 0.5 * Math.sqrt(1 - q * q * 3.2) * (0.5 + 0.5 * m);
      const x = LOUZE[0] + (1.6 + 2.6 * st.cereni) * Math.sin(st.t * (2.2 + i * 0.5) + i * 1.7);
      s += `<ellipse cx="${f(x)}" cy="${f(LOUZE[1] + q * ry * 1.25)}" rx="${f(Math.max(0.4, w))}" ry="${f(ry * 0.13)}" fill="${ZLUTA.zaklad}" opacity="${f(jas)}"/>`;
    }
  }
  for (const k of st.kruhy) {
    const q = k.vek / 0.9;
    s += `<ellipse cx="${f(k.x)}" cy="${f(k.y)}" rx="${f(1 + q * 7 * k.r)}" ry="${f((1 + q * 7 * k.r) * 0.2)}" fill="none" stroke="${ZLUTA.svetla}" stroke-width="${f(0.5 * (1 - q))}" opacity="${f(0.8 * (1 - q))}"/>`;
  }
  return s;
};
const vrstvaDest = (st) => {
  if (!st.dest.length) return "";
  const sk = st.sklon;
  let d = "";
  for (const k of st.dest) d += `M${f(k.x)} ${f(k.y)} l${f(sk * k.l)} ${f(k.l)} `;
  return `<path d="${d}" stroke="${ZLUTA.svetla}" stroke-width="0.5" stroke-linecap="round" fill="none" opacity="0.6"/>`;
};

/* ——— Kapka zezadu a zepředu ——— */
const bosa = `<ellipse cx="80" cy="142" rx="8" ry="4" fill="${VODA_NOC.chodidlo}"/><ellipse cx="100" cy="142" rx="8" ry="4" fill="${VODA_NOC.chodidlo}"/>`;
const orezTela = (s) => `<g clip-path="url(#${ID}-telo)">${s}</g>`;
const kapZada = () =>
  `<g transform="translate(180 0) scale(-1 1)">${kapTelo(ID, { voda: VODA_NOC })}</g>` + bosa +
  /* čelenka: zezadu je vidět, jak hlavu obíhá, a uzel */
  naGeta(orezTela(`<path d="M54 85 Q90 97 126 85" stroke="${NOC.stuzka}" stroke-width="5.6" fill="none"/><path d="M54 87.2 Q90 99.2 126 87.2" stroke="${NOC.stuzka2}" stroke-width="1.2" fill="none"/>`)) +
  `<ellipse cx="${UZEL[0]}" cy="${UZEL[1]}" rx="3.8" ry="3.1" fill="${NOC.stuzka2}"/><ellipse cx="${UZEL[0] - 0.6}" cy="${UZEL[1] - 0.6}" rx="2.2" ry="1.6" fill="${NOC.stuzka}"/>`;
const kapPredek = () =>
  kapTelo(ID, { voda: VODA_NOC }) + bosa +
  naGeta(orezTela(`<path d="M54 85.6 Q90 91.4 126 85.6" stroke="${NOC.stuzka}" stroke-width="5.6" fill="none"/><path d="M54 87.8 Q90 93.6 126 87.8" stroke="${NOC.stuzka2}" stroke-width="1.2" fill="none"/>`));
const vrstvaTvar = (st) => vPostave(naGeta(kapTvar({ mrk: st.mrk, vyraz: st.vyraz, voda: VODA_NOC, tvareOp: 0.55 })));
/* cípy čelenky: dva krátké provázky, které po každé ráně vyletí */
const vrstvaCipy = (st) =>
  st.cipy
    .map((c) => `<path d="${pasPoBodech(vzorkuj(c.p, 3), (s) => lerp(2.3, 1.5, s))}" fill="${NOC.stuzka}"/>`)
    .join("");
const vrstvaRuce = (st) =>
  ["L", "P"]
    .map((r) => {
      const { ruka, spicka } = st.ruce[r];
      return (
        `<path d="${pasPoBodech([[ruka[0] - (spicka[0] - ruka[0]) * 0.13, ruka[1] - (spicka[1] - ruka[1]) * 0.13], spicka], (s) => lerp(2.9, 2.3, s))}" fill="${NOC.palicka}"/>` +
        `<circle cx="${f(spicka[0])}" cy="${f(spicka[1])}" r="1.15" fill="${NOC.palicka}"/>` +
        `<ellipse cx="${f(ruka[0])}" cy="${f(ruka[1])}" rx="4.1" ry="3.2" transform="rotate(${f((Math.atan2(spicka[1] - ruka[1], spicka[0] - ruka[0]) * 180) / Math.PI + 90)} ${f(ruka[0])} ${f(ruka[1])})" fill="${VODA_NOC.zaklad}"/>`
      );
    })
    .join("");

const defs = () =>
  TUS.defs + kapDefs(ID, { voda: VODA_NOC, soumrak: SOUMRAK_NOC }) +
  `<clipPath id="${ID}-kuze"><circle cx="${CM[0]}" cy="${CM[1]}" r="${RM}"/></clipPath>` +
  `<clipPath id="${ID}-telo"><path d="M90 38 Q60 85 56 108 Q52 132 72 146 Q82 152 90 152 Q98 152 108 146 Q128 132 124 108 Q120 85 90 38 Z"/></clipPath>` +
  `<radialGradient id="${ID}-zablesk" gradientUnits="userSpaceOnUse" cx="${CM[0]}" cy="${CM[1]}" r="118"><stop offset="0" stop-color="${ZLUTA.jadro}" stop-opacity="0.95"/><stop offset="0.45" stop-color="${ZLUTA.svetla}" stop-opacity="0.5"/><stop offset="0.82" stop-color="${ZLUTA.svetla}" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="${ID}-zare" gradientUnits="userSpaceOnUse" cx="${CM[0]}" cy="${CM[1]}" r="${RM + 40}"><stop offset="${f(RM / (RM + 40))}" stop-color="${ZLUTA.svetla}" stop-opacity="0.5"/><stop offset="0.72" stop-color="${ZLUTA.svetla}" stop-opacity="0.14"/><stop offset="1" stop-color="${ZLUTA.svetla}" stop-opacity="0"/></radialGradient>`;

/* ——— Simulace ——— */
const cilNaKuzi = (p) => {
  /* kam dosáhne: malé pole kolem středu kůže, posunuté podle toho, kam se ukázalo */
  const dx = clamp((p.x - CM[0]) / RM, -1, 1), dy = clamp((p.y - CM[1]) / RM, -1, 1);
  return [CM[0] + dx * 11, CM[1] + 7 + dy * 6];
};
const naplanuj = (dyn, cas, { ruka, cil, druh = "don", sila = 1, velka = false, auto = false }) => {
  dyn.udery.push({ cas, ruka, cil, druh, sila, velka, auto, hrano: false });
  dyn.udery.sort((a, b) => a.cas - b.cas);
};
const dalsiRuka = (dyn, x) => {
  if (x != null && Math.abs(x - CM[0]) > 7) return x < CM[0] ? "L" : "P";
  dyn.stridani = !dyn.stridani;
  return dyn.stridani ? "L" : "P";
};
const faze = (dyn, jaka, t) => {
  dyn.faze = jaka;
  dyn.fazeOd = t;
};
const kruhVLouzi = (dyn, r = 1) => {
  const R = dyn.nahoda;
  const rx = 6 + 42 * dyn.louze;
  dyn.kruhy.push({ x: LOUZE[0] + (R() - 0.5) * 1.5 * rx, y: LOUZE[1] + (R() - 0.5) * 3 * dyn.louze, vek: 0, r });
};
const zahraj = (dyn, u, t) => {
  const R = dyn.nahoda;
  const pan = clamp((u.cil[0] - 90) / 40, -1, 1);
  if (u.druh === "ka") {
    dyn.zvuk.push({ druh: "ka", sila: 0.7 * u.sila, pan: 0 });
    dyn.klap = 1;
    return;
  }
  dyn.puls = Math.max(dyn.puls, u.sila);
  dyn.om += (u.druh === "don" ? 150 : 90) * u.sila;
  dyn.vlny.push({ x: u.cil[0], y: u.cil[1], vek: 0, sila: Math.min(1.3, u.sila) });
  dyn.zvuk.push({ druh: "odaiko", sila: 0.9 * u.sila, pan: pan * 0.4, vys: u.druh === "ten" ? 1 : 0 });
  dyn.lije = Math.min(1.6, dyn.lije + 0.3 * u.sila);
  dyn.dup = 1;
  dyn.trpyt = 1;
  dyn.posledni = t;
  /* cípy čelenky vyletí */
  dyn.cipy.forEach((c, i) => hodProvazem(c, N_CIP - 1, [(i ? 1 : -1) * (16 + R() * 14), -34 - R() * 16], 1 / 60));
  if (dyn.faze === "hra") {
    dyn.mokro = Math.min(1, dyn.mokro + NA_RANU * u.sila);
    if (dyn.mokro >= 1) {
      /* louže je plná: zavíří a dá poslední ránu */
      faze(dyn, "vireni", t);
      dyn.udery = dyn.udery.filter((x) => x.hrano);
      VIRENI.forEach((c, i) => naplanuj(dyn, t + 0.35 + c, { ruka: i % 2 ? "P" : "L", cil: [CM[0] + (i % 2 ? 5 : -5), CM[1] + 8], druh: i % 3 === 2 ? "ten" : "don", sila: 0.55 + 0.035 * i, auto: true }));
      naplanuj(dyn, t + 0.35 + VELKA, { ruka: "LP", cil: [CM[0], CM[1] + 6], sila: 1.3, velka: true, auto: true });
    }
  }
  if (u.velka) {
    faze(dyn, "lijak", t);
    dyn.zablesk = 1;
    dyn.velkaVlna = t;
    dyn.zvuk.push({ druh: "hrom", sila: 1, blizko: 0.9, pan: 0 });
    dyn.zvuk.push({ druh: "hrom", sila: 0.5, blizko: 0.2, pan: 0.4, za: 1.5 });
  }
};
const novaDynamika = () => {
  const cip = (k) => novyProvaz(poCare([naPlatno(UZEL), [naPlatno(UZEL)[0] + k * 5, naPlatno(UZEL)[1] + 14]], N_CIP, CIP));
  return {
    faze: "hra", fazeOd: 0, mokro: 0, louze: 0, mraky: 0, lije: 0, puls: 0, om: 0, uhel: 0, dup: 0, trpyt: 0, klap: 0, zablesk: 0, velkaVlna: -100, cereni: 0,
    udery: [], vlny: [], dest: [], kruhy: [], akum: 0, kapani: 0, zaby: 0, kvak: 0,
    cipy: [cip(-1), cip(1)],
    stridani: false, posledni: -100, posledniVstup: -100, dalsiAuto: 1.1, autoI: 0, vitr: 0, mysPred: null, mir: [0, 0],
    nahoda: rng(8128), zvuk: [],
  };
};
/* jak je natočená: 0 zády, 1 čelem; a jak hluboko se klaní */
const otoceni = (dyn, t) => {
  const u = t - dyn.fazeOd;
  if (dyn.faze === "otocka") return clamp(u / OTOCKA);
  if (dyn.faze === "poklona") return 1;
  if (dyn.faze === "zpet") return 1 - clamp(u / OTOCKA);
  return 0;
};
const uklon = (dyn, t) => (dyn.faze === "poklona" ? smooth((t - dyn.fazeOd - 0.35) / 0.5) * (1 - smooth((t - dyn.fazeOd - 1.7) / 0.55)) : 0);
const telo = (dyn, t) => {
  const o = otoceni(dyn, t), b = uklon(dyn, t);
  return {
    o, b,
    sx: Math.max(0.05, Math.abs(Math.cos(Math.PI * o))) * (1 + 0.04 * dyn.dup),
    sy: (1 - 0.05 * dyn.dup) * (1 - 0.2 * b),
    y: 0.5 * Math.sin(t * 1.5),
  };
};
const krok = (dyn, t, dt, vstup) => {
  const R = dyn.nahoda;
  /* myš: vítr nakloní déšť, paličky míří za kurzorem */
  if (vstup.mys) {
    if (dyn.mysPred && dt > 0) dyn.vitr = kCili(dyn.vitr, clamp((vstup.mys.x - dyn.mysPred) / Math.max(dt, 0.004), -160, 160), dt, 0.15);
    dyn.mysPred = vstup.mys.x;
    const c = cilNaKuzi(vstup.mys);
    dyn.mir = [kCili(dyn.mir[0], (c[0] - CM[0]) * 0.45, dt, 0.15), kCili(dyn.mir[1], (c[1] - CM[1] - 7) * 0.45, dt, 0.15)];
  } else {
    dyn.mysPred = null;
    dyn.mir = [kCili(dyn.mir[0], 0, dt, 0.4), kCili(dyn.mir[1], 0, dt, 0.4)];
  }
  dyn.vitr = kCili(dyn.vitr, 0, dt, 0.7);
  if (vstup.kliky && vstup.kliky.length) {
    for (const p of vstup.kliky) {
      dyn.posledniVstup = t;
      if (dyn.faze === "klid") {
        faze(dyn, "hra", t);
        dyn.mokro = 0;
      }
      if (dyn.faze === "hra" || dyn.faze === "lijak") {
        const d = p.klavesa ? 0 : Math.hypot(p.x - CM[0], p.y - CM[1]);
        dyn.udery = dyn.udery.filter((x) => x.hrano || !x.auto);
        if (d > RM + 3) naplanuj(dyn, t + 0.1, { ruka: "LP", cil: [STOJI[0], STOJI[1] - 82], druh: "ka", sila: 1 });
        else naplanuj(dyn, t + 0.1, { ruka: dalsiRuka(dyn, p.klavesa ? null : p.x), cil: cilNaKuzi(p.klavesa ? { x: CM[0], y: CM[1] } : p), druh: d < RM * 0.55 ? "don" : "ten", sila: 1 });
      } else if (dyn.louze > 0.1) {
        /* zrovna nebubnuje: aspoň to kápne do louže */
        kruhVLouzi(dyn, 1.3);
        dyn.zvuk.push({ druh: "kap", sila: 0.7, pan: 0 });
      }
    }
    vstup.kliky.length = 0;
  }
  /* když se nic neděje, bubnuje sama a zrychluje */
  if (dyn.faze === "hra" && t - dyn.posledniVstup > TICHO && t >= dyn.dalsiAuto && !dyn.udery.some((u) => !u.hrano)) {
    const i = dyn.autoI++;
    const kam = [[0, 0], [-0.5, 0.2], [0.5, 0.2], [0, -0.6], [-0.7, -0.4], [0.7, -0.4]][i % 6];
    const p = { x: CM[0] + kam[0] * RM, y: CM[1] + kam[1] * RM };
    naplanuj(dyn, t + 0.26, { ruka: i % 2 ? "P" : "L", cil: cilNaKuzi(p), druh: i % 4 === 3 ? "ten" : "don", sila: 0.8 + 0.2 * dyn.mokro, auto: true });
    dyn.dalsiAuto = t + lerp(1.25, 0.34, Math.pow(dyn.mokro, 0.8));
  }
  for (const u of dyn.udery) {
    if (!u.hrano && t >= u.cas) {
      u.hrano = true;
      zahraj(dyn, u, t);
    }
  }
  dyn.udery = dyn.udery.filter((u) => t - u.cas < 1);
  /* fáze po velké ráně: liják, otočka, poklona, zpátky, klid */
  const uF = t - dyn.fazeOd;
  if (dyn.faze === "lijak") {
    dyn.lije = Math.max(dyn.lije, 1.5);
    if (uF > LIJE) faze(dyn, "otocka", t);
  } else if (dyn.faze === "otocka") {
    if (uF > OTOCKA) {
      faze(dyn, "poklona", t);
      dyn.zvuk.push({ druh: "smich", sila: 0.6, pan: 0, za: 0.5 });
      dyn.zaby = t + 0.9;
    }
  } else if (dyn.faze === "poklona") {
    if (uF > POKLONA) faze(dyn, "zpet", t);
  } else if (dyn.faze === "zpet") {
    if (uF > OTOCKA) faze(dyn, "klid", t);
  } else if (dyn.faze === "klid") {
    if (uF > KLID) {
      faze(dyn, "hra", t);
      dyn.mokro = 0;
      dyn.dalsiAuto = t + 0.8;
    }
  }
  const poDesti = dyn.faze === "otocka" || dyn.faze === "poklona" || dyn.faze === "zpet" || dyn.faze === "klid";
  dyn.mraky = kCili(dyn.mraky, poDesti ? 0 : dyn.faze === "lijak" || dyn.faze === "vireni" ? 1 : dyn.mokro * 0.9, dt, poDesti ? 0.9 : 0.6);
  dyn.louze = kCili(dyn.louze, dyn.faze === "klid" ? 0 : dyn.faze === "hra" ? dyn.mokro * 0.9 : 1, dt, dyn.faze === "klid" ? 1.3 : 0.7);
  dyn.lije = Math.max(0, dyn.lije - dt * (0.5 + dyn.lije * 0.6));
  dyn.puls *= Math.exp(-dt / 0.14);
  dyn.dup *= Math.exp(-dt / 0.12);
  dyn.trpyt *= Math.exp(-dt / 0.5);
  dyn.klap *= Math.exp(-dt / 0.1);
  dyn.zablesk *= Math.exp(-dt / 0.28);
  dyn.om *= Math.exp(-dt / 0.6);
  dyn.kvak = Math.max(0, dyn.kvak - dt / 0.55);
  dyn.uhel += (3 + dyn.om) * dt;
  /* po dešti: z lešení kape do louže a ozvou se žáby */
  if (poDesti && dyn.louze > 0.2) {
    dyn.kapani -= dt;
    if (dyn.kapani <= 0) {
      dyn.kapani = 0.35 + R() * 0.9;
      kruhVLouzi(dyn, 1);
      dyn.zvuk.push({ druh: "kap", sila: 0.35 + R() * 0.3, pan: (R() - 0.5) * 0.8, vys: R() });
    }
    if (dyn.zaby && t >= dyn.zaby) {
      dyn.zvuk.push({ druh: "zaba", sila: 0.5, pan: 0.6 });
      dyn.kvak = 1;
      dyn.zaby = t + 1.1 + R() * 1.6;
    }
  } else dyn.zaby = poDesti ? dyn.zaby : 0;
  /* déšť */
  dyn.akum += dt * 76 * dyn.lije;
  while (dyn.akum >= 1) {
    dyn.akum -= 1;
    dyn.dest.push({ x: -10 + R() * 200, y: -4 + R() * 30, v: 150 + R() * 70, l: 3.2 + R() * 3 });
    if (dyn.louze > 0.15 && R() < 0.1) kruhVLouzi(dyn, 0.6 + R() * 0.5);
  }
  const sklon = dyn.vitr / 260;
  for (const k of dyn.dest) {
    k.y += k.v * dt;
    k.x += k.v * sklon * dt;
  }
  dyn.dest = dyn.dest.filter((k) => k.y < 178);
  for (const v of dyn.vlny) v.vek += dt;
  dyn.vlny = dyn.vlny.filter((v) => v.vek < 1.4);
  for (const k of dyn.kruhy) k.vek += dt;
  dyn.kruhy = dyn.kruhy.filter((k) => k.vek < 0.9);
  dyn.cereni = kCili(dyn.cereni, clamp(dyn.lije + dyn.kruhy.length * 0.2), dt, 0.3);
  /* cípy čelenky: kořen jde s hlavou, i když se otáčí a klaní */
  if (dt > 0) {
    const T = telo(dyn, t);
    const celem = T.o > 0.5;
    dyn.cipy.forEach((c, i) => {
      const k = i ? 1 : -1;
      /* zády je uzel uprostřed, čelem jsou cípy vidět za spánky */
      const lokal = celem ? [90 + k * 27, 75] : [UZEL[0] + k * 1.6, UZEL[1] + 1.5];
      const p = naPlatno(lokal);
      const koren = [STOJI[0] + (p[0] - STOJI[0]) * T.sx, STOJI[1] + T.y + (p[1] - STOJI[1]) * T.sy];
      krokProvazu(c, dt, CIP, {
        koren,
        sila: (j, s) => [k * 14 + dyn.vitr * 0.9 * s + 30 * s * Math.sin(t * 3.1 + i * 2 + s * 3), 74],
        tlum: 2.6, iter: 5, hladkost: 0.05,
      });
    });
  }
};
/* poloha ruky a špičky paličky: klid, nápřah a úder, při pokloně dole u těla */
const ruce = (dyn, t) => {
  const T = telo(dyn, t);
  const dole = T.o > 0 ? smooth(T.o * 2.2) : 0;
  const vitez = dyn.faze === "lijak" ? smooth((t - dyn.fazeOd) / 0.4) * (1 - smooth((t - dyn.fazeOd - LIJE + 0.5) / 0.5)) : 0;
  const out = {};
  for (const r of ["L", "P"]) {
    const k = r === "L" ? -1 : 1;
    let s = 0, akt = null;
    for (const u of dyn.udery) {
      if (!u.ruka.includes(r)) continue;
      const v = svih(t - u.cas);
      if (v !== 0 && (!akt || u.cas > akt.cas)) {
        akt = u;
        s = v;
      }
    }
    const dych = 0.8 * Math.sin(t * 1.5 + (k > 0 ? 1.2 : 0));
    let ruka = [STOJI[0] + RUKA0[r][0] + k * 1.5 * vitez, STOJI[1] + RUKA0[r][1] + dych * 0.5 - 4 * vitez];
    let spicka = [STOJI[0] + SPICKA0[r][0] + dyn.mir[0] * 0.9 + k * 7 * vitez, STOJI[1] + SPICKA0[r][1] + dyn.mir[1] * 0.9 + dych - 9 * vitez];
    if (akt) {
      if (s < 0) {
        /* nápřah: palička se zvrátí ven a dozadu */
        const q = -s / 0.32;
        spicka = [spicka[0] + k * 10 * q, spicka[1] + 3 * q];
        ruka = [ruka[0] + k * 1.2 * q, ruka[1] - 1.5 * q];
      } else {
        const C2 = akt.cil;
        spicka = [lerp(spicka[0], C2[0], s), lerp(spicka[1], C2[1], s)];
        ruka = [lerp(ruka[0], ruka[0] + (C2[0] - ruka[0]) * 0.14, s), lerp(ruka[1], ruka[1] + (C2[1] - ruka[1]) * 0.14, s)];
      }
    }
    if (dole > 0) {
      const b = T.b * 6;
      ruka = [lerp(ruka[0], STOJI[0] + RUKA_DOLE[r][0], dole), lerp(ruka[1], STOJI[1] + RUKA_DOLE[r][1] + b, dole)];
      spicka = [lerp(spicka[0], STOJI[0] + SPICKA_DOLE[r][0], dole), lerp(spicka[1], STOJI[1] + SPICKA_DOLE[r][1], dole)];
    }
    out[r] = { ruka, spicka };
  }
  return out;
};
const stav = (t, vstup = {}, dyn) => {
  const d = dyn || novaDynamika();
  const T = telo(d, t);
  const uV = t - d.velkaVlna;
  let vyraz = "radost";
  if (d.faze === "poklona" && T.b > 0.4) vyraz = "blazena";
  return {
    t, faze: d.faze, T, celem: T.o > 0.5, ruce: ruce(d, t), vyraz, mrk: mrkani(t, [1.1, 3.4], 4.4),
    vlny: d.vlny, dest: d.dest, kruhy: d.kruhy, cipy: d.cipy,
    mraky: d.mraky, louze: d.louze, cereni: d.cereni, lije: d.lije, sklon: d.vitr / 260,
    kvak: Math.sin(Math.PI * clamp(d.kvak)), puls: d.puls, uhel: d.uhel, trpyt: d.trpyt, zablesk: d.zablesk, svitani: 0,
    velka: uV >= 0 && uV < 1.2 ? uV / 1.2 : -1,
    zive: d.vlny.length > 0,
  };
};
const snimek = (st) => Math.floor(st.t * 30);
const pohyb = (st) => ({ x: 0, y: st.T.y, r: 0, sx: st.T.sx, sy: st.T.sy, ox: STOJI[0], oy: STOJI[1] });
/* kůže se po ráně nadme a vrátí; znak se s ní točí */
const pohybKuze = (st) => ({ x: 0, y: 0, r: 0, sx: 1 + 0.03 * st.puls, sy: 1 + 0.03 * st.puls, ox: CM[0], oy: CM[1] });

export const lemBuben = {
  id: "buben",
  viewBox: "0 0 180 180",
  defs,
  novaDynamika,
  krok,
  stav,
  hukot: (st) => ({ dest: clamp(st.lije / 1.5), vitr: 0.16 + 0.2 * st.mraky }),
  kurzor: () => "pointer",
  klidne: { t: 8.9 },
  vrstvy: [
    { id: "papir", kresli: vrstvaPapir },
    { id: "zaba", kresli: vrstvaZaba, klic: (st) => Math.round(st.kvak * 12) },
    { id: "tus", kresli: () => TUS.skvrna, tezka: true },
    { id: "hvezdy", kresli: vrstvaHvezdy, orez: OREZ, pruhlednost: (st) => f(clamp(1 - st.mraky * 1.2) * (0.75 + 0.25 * Math.sin(st.t * 1.3))) },
    { id: "zare", kresli: () => `<circle cx="${CM[0]}" cy="${CM[1]}" r="${RM + 40}" fill="url(#${ID}-zare)"/>`, orez: OREZ, pruhlednost: (st) => f(clamp(0.8 + 0.5 * st.puls + 0.06 * Math.sin(st.t * 0.8))) },
    { id: "kopce", kresli: vrstvaKopce, orez: OREZ },
    { id: "telo-bubnu", kresli: vrstvaTeloBubnu, orez: OREZ, pruhlednost: (st) => f(0.82 + 0.18 * st.trpyt) },
    { id: "mesic", kresli: vrstvaMesic, pohyb: pohybKuze },
    { id: "vlny", kresli: vrstvaVlny, klic: (st) => (st.zive ? snimek(st) : -1) },
    { id: "znak", kresli: vrstvaZnak, pohyb: (st) => ({ ...pohybKuze(st), r: st.uhel % 360 }) },
    { id: "mraky", kresli: vrstvaMraky, klic: (st) => Math.floor(st.t * 12), orez: OREZ },
    { id: "velka-vlna", kresli: (st) => (st.velka < 0 ? "" : `<circle cx="${CM[0]}" cy="${CM[1]}" r="${f(RM + st.velka * 110)}" fill="none" stroke="${ZLUTA.svetla}" stroke-width="${f(3 * (1 - st.velka))}" opacity="${f(0.8 * (1 - st.velka))}"/>`), klic: (st) => (st.velka < 0 ? -1 : snimek(st)), orez: OREZ },
    { id: "vez", kresli: vrstvaVezNoc, orez: OREZ },
    { id: "louze", kresli: vrstvaLouze, klic: (st) => (st.louze < 0.02 ? -1 : snimek(st)) },
    { id: "cipy-za", kresli: (st) => (st.celem ? vrstvaCipy(st) : ""), klic: (st) => (st.celem ? snimek(st) : -1) },
    { id: "zada", kresli: () => vPostave(kapZada()), pohyb, pruhlednost: (st) => (st.celem ? 0 : 1) },
    { id: "predek", kresli: () => vPostave(kapPredek()), pohyb, pruhlednost: (st) => (st.celem ? 1 : 0) },
    { id: "tvar", kresli: vrstvaTvar, klic: (st) => `${st.vyraz},${f(st.mrk)}`, pohyb, pruhlednost: (st) => (st.celem ? 1 : 0) },
    { id: "cipy-pred", kresli: (st) => (st.celem ? "" : vrstvaCipy(st)), klic: (st) => (st.celem ? -1 : snimek(st)) },
    { id: "ruce", kresli: vrstvaRuce, klic: snimek },
    { id: "dest", kresli: vrstvaDest, klic: (st) => (st.dest.length ? snimek(st) : -1), orez: OREZ },
    { id: "zablesk", kresli: () => `<circle cx="${CM[0]}" cy="${CM[1]}" r="118" fill="url(#${ID}-zablesk)"/>`, orez: OREZ, pruhlednost: (st) => f(clamp(st.zablesk * 0.8)) },
  ],
};
