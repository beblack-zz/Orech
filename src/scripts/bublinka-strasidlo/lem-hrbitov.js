/*
 * 02, Tušový lem — HŘBITOV HRNCŮ
 *
 * U každé staré pece ležela halda nepodarků, monohara: co prasklo, co se
 * zkroutilo, co se slilo dohromady. Většinu z toho má na svědomí Bublinka.
 * V noci, když nad haldou stojí měsíc a ve vrbě táhne vítr, si pro ně
 * chodí: z prasklých kusů stoupají malé bledé dušičky (každá si nese
 * střípek svého hrnce jako čepici) a ona je vede se zvonkem jako pastýřka.
 * Když je jich moc, nejstarší odletí k měsíci.
 *
 * Myš ukazuje cestu: Bublinka pluje za kurzorem a dušičky za ní v řadě.
 * Kliknutí: zazvoní a z nejbližšího hrnce vyklouzne další. Když se nic
 * neděje, obchází haldu sama.
 */
import {
  f, rng, clamp, lerp, smooth, rad, mix, pt, cara, hladka, pasPoBodech, hrouda, mrkani, jiskraD, kCili,
  bubDefs, bubTelo, bubLesk, bubTvar, bubKlobouk, ruckaDucha, plaminek, onibiDefs, krokOnibi, tusLem,
} from "./spolecne.js";

const ID = "bs2";
const TUS = tusLem(ID, { seed: 14, barva: "#1A1A2B", lem: "#35334C" });
const OREZ = `${ID}-tus-orez`;
const MESIC = [127, 44];
const RB = 15.5;
const KB = RB / 46;
const B0 = [90, 84];
const POSTAVA = `translate(${B0[0]} ${B0[1]}) scale(${KB}) translate(-90 -96)`;
const vPostave = (s) => `<g transform="${POSTAVA}">${s}</g>`;
const NEJVIC = 7;
/* dušičky jdou po její stopě: první kus za ní, další těsně za sebou (v jednotkách kresby) */
const ODSTUP = 23, ROZESTUP = 8.6;
const PENTA = 6;

/* ——— Hrnce: tvary v řezu, počátek uprostřed dna, y nahoru záporné ——— */
const TVARY = {
  cubo: { d: "M-9 0 C-14 -4 -15 -14 -9 -19 C-7 -21 -5.4 -21.6 -5 -23 L-5.6 -25.4 H5.6 L5 -23 C5.4 -21.6 7 -21 9 -19 C15 -14 14 -4 9 0 Z", usti: [0, -25.4], rUsti: 5.6, h: 25.4 },
  kame: { d: "M-12 0 C-17 -8 -16 -22 -10 -27 L-11 -30 H11 L10 -27 C16 -22 17 -8 12 0 Z", usti: [0, -30], rUsti: 11, h: 30 },
  wan: { d: "M-10 -11 C-10 -4 -6 -1.4 -3.6 -1.2 L-3.6 0 H3.6 L3.6 -1.2 C6 -1.4 10 -4 10 -11 Z", usti: [0, -11], rUsti: 10, h: 11 },
  tokkuri: { d: "M-5 0 C-7.6 -6 -7 -14 -3 -17 L-2.2 -22 Q-3.4 -24 -2.6 -25 H2.6 Q3.4 -24 2.2 -22 L3 -17 C7 -14 7.6 -6 5 0 Z", usti: [0, -25], rUsti: 2.6, h: 25 },
  sara: { d: "M-13 -3.8 Q-11 -1 -4.4 -0.8 L-4.4 0 H4.4 L4.4 -0.8 Q11 -1 13 -3.8 Z", usti: [0, -3.8], rUsti: 13, h: 3.8 },
  junomi: { d: "M-5.4 -11 L-4.8 -1 Q-4.6 0 -3.4 0 H3.4 Q4.6 0 4.8 -1 L5.4 -11 Z", usti: [0, -11], rUsti: 5.4, h: 11 },
};
/* vzadu tmavší a menší, vpředu tři kusy, které z tuše vyčnívají na papír */
const HRNCE = [
  { typ: "cubo", x: 33, y: 155, s: 0.72, rot: -18, barva: "#2C2B3C", poleva: "#3B3A50", seed: 11 },
  { typ: "kame", x: 58, y: 153, s: 0.9, rot: -7, barva: "#323146", poleva: "#43425C", seed: 3 },
  { typ: "cubo", x: 88, y: 151, s: 0.86, rot: 5, barva: "#3A3545", poleva: "#4F485C", seed: 5 },
  { typ: "tokkuri", x: 112, y: 152, s: 0.95, rot: -14, barva: "#484658", poleva: "#5F5D72", seed: 7 },
  { typ: "kame", x: 138, y: 154, s: 0.82, rot: 9, barva: "#2D3142", poleva: "#3C4458", seed: 9 },
  { typ: "junomi", x: 160, y: 155, s: 0.9, rot: 14, barva: "#3A3A52", poleva: "#4C4C68", seed: 23 },
  { typ: "cubo", x: 44, y: 167, s: 1.02, rot: -24, barva: "#5A4438", poleva: "#765A4A", seed: 13 },
  { typ: "wan", x: 76, y: 153.6, s: 1.2, rot: 172, barva: "#6A666E", poleva: "#85818C", seed: 15, dnem: true },
  { typ: "kame", x: 106, y: 169, s: 1.06, rot: 3, barva: "#43565A", poleva: "#5B7276", seed: 17, oci: true },
  { typ: "sara", x: 137, y: 166, s: 1.1, rot: -6, barva: "#7E7C88", poleva: "#9896A4", seed: 19, tichy: true },
  { typ: "sara", x: 139, y: 162, s: 1.04, rot: 6, barva: "#8C8A96", poleva: "#A6A4B2", seed: 21, tichy: true },
  { typ: "tokkuri", x: 157, y: 169, s: 1.02, rot: 26, barva: "#6E6860", poleva: "#8A8478", seed: 25 },
];
const VPREDU = [
  { typ: "wan", x: 112, y: 177.6, s: 0.92, rot: -7, barva: "#E6DFCD", poleva: "#C9BFA8", obrys: "#3A322C", seed: 31, svetly: true },
  { typ: "junomi", x: 133, y: 178, s: 1.0, rot: 4, barva: "#6C82AE", poleva: "#8FA2C6", obrys: "#2A2C40", seed: 33, svetly: true },
  { typ: "tokkuri", x: 153, y: 178.4, s: 0.86, rot: 82, barva: "#B4552F", poleva: "#D0764E", obrys: "#3A1E14", seed: 35, svetly: true },
];
const naSvet = (p, [lx, ly]) => {
  const c = Math.cos(rad(p.rot)), s = Math.sin(rad(p.rot));
  return [p.x + p.s * (lx * c - ly * s), p.y + p.s * (lx * s + ly * c)];
};
const trhlina = (p) => {
  const tv = TVARY[p.typ];
  const r = rng(p.seed);
  let x = (r() - 0.5) * tv.rUsti * 0.8, y = -tv.h * 0.94;
  const B = [[x, y]];
  const n = Math.max(2, Math.round(tv.h / 5));
  for (let i = 0; i < n; i++) {
    x += (r() - 0.5) * 6;
    y += (tv.h * 0.9) / n;
    B.push([x, y]);
  }
  return B;
};
for (const p of [...HRNCE, ...VPREDU]) {
  p.trhlina = trhlina(p);
  /* dušička vyklouzne ústím; u misky dnem vzhůru prasklinou u nožky */
  p.vychod = naSvet(p, p.dnem ? [0, 2] : TVARY[p.typ].usti);
}
/* odkud smějí stoupat dušičky */
const ZIVE = HRNCE.map((p, i) => (p.tichy ? -1 : i)).filter((i) => i >= 0);

const hrnec = (p) => {
  const tv = TVARY[p.typ];
  const obrys = p.obrys || "#0D0C15";
  const w = f(0.8 / p.s);
  let s = `<g transform="translate(${p.x} ${p.y}) rotate(${p.rot}) scale(${p.s})">`;
  s += `<path d="${tv.d}" fill="${p.barva}"/>`;
  s += `<g clip-path="url(#${ID}-tvar-${p.typ})">`;
  /* poleva steče od hrdla a nechá jazyky */
  const r = rng(p.seed + 7);
  let stek = `M-20 ${f(-tv.h - 2)} H20 V${f(-tv.h * 0.62)}`;
  for (let x = 16; x >= -16; x -= 4) stek += ` Q${x + 2} ${f(-tv.h * (0.62 - 0.2 * r()))} ${x} ${f(-tv.h * (0.6 + 0.08 * r()))}`;
  s += `<path d="${stek} L-20 ${f(-tv.h * 0.62)} Z" fill="${p.poleva}"/>`;
  s += `<rect x="-22" y="${f(-tv.h - 2)}" width="44" height="${f(tv.h + 4)}" fill="url(#${ID}-${p.svetly ? "stin-den" : "stin"})"/>`;
  s += `<path d="${cara(p.trhlina)}" stroke="${p.svetly ? "#2A221E" : "#07060B"}" stroke-width="${f(0.75 / p.s)}" fill="none" stroke-linejoin="round"/>`;
  s += `<path d="M${pt(p.trhlina[1])} l${f(3.4 * (p.seed % 2 ? 1 : -1))} 2.2" stroke="${p.svetly ? "#2A221E" : "#07060B"}" stroke-width="${f(0.5 / p.s)}" fill="none"/>`;
  s += `</g>`;
  if (p.typ !== "sara") s += `<ellipse cx="${tv.usti[0]}" cy="${tv.usti[1]}" rx="${tv.rUsti}" ry="${f(Math.max(0.9, tv.rUsti * 0.22))}" fill="${p.svetly ? "#2A211C" : "#07060B"}"/>`;
  s += `<path d="${tv.d}" fill="none" stroke="${obrys}" stroke-width="${w}" stroke-linejoin="round"/>`;
  return s + `</g>`;
};

/* ——— Pozadí v tuši: měsíc, kopce, pec ve svahu ——— */
const vrstvaTus = () => {
  const [mx, my] = MESIC;
  let s = TUS.skvrna + `<g clip-path="url(#${OREZ})">`;
  s += `<rect x="0" y="30" width="180" height="120" fill="url(#${ID}-obzor)"/>`;
  s += `<circle cx="${mx}" cy="${my}" r="44" fill="url(#${ID}-mesic-zar)"/>`;
  s += `<circle cx="${mx}" cy="${my}" r="13.6" fill="url(#${ID}-mesic)"/>`;
  s += `<g fill="#CFC9AE" opacity="0.62"><ellipse cx="${mx - 5}" cy="${my - 4}" rx="4.2" ry="3.2"/><ellipse cx="${mx + 4.4}" cy="${my + 3.6}" rx="3.4" ry="2.6"/><ellipse cx="${mx - 1.6}" cy="${my + 6.4}" rx="2.2" ry="1.5"/><ellipse cx="${mx + 6}" cy="${my - 5.4}" rx="2" ry="1.6"/><ellipse cx="${mx - 8.4}" cy="${my + 3}" rx="1.4" ry="1.8"/></g>`;
  s += `<g fill="#E9E6D2">${[[22, 36, 0.5], [40, 22, 0.45], [58, 34, 0.35], [76, 16, 0.5], [96, 30, 0.4], [152, 22, 0.4], [166, 64, 0.45], [16, 66, 0.35], [84, 48, 0.3], [160, 96, 0.35], [106, 14, 0.3]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join("")}</g>`;
  s += `<path d="M0 120 C20 110 38 114 52 105 C66 97 80 107 96 109 C112 111 124 101 142 105 C158 108 170 115 180 113 V180 H0 Z" fill="#212139"/>`;
  /* stupňovitá pec noborigama: komory do svahu a komín */
  s += `<g fill="#17172A" stroke="#33334E" stroke-width="0.4">${[[25, 115.4], [33, 112.2], [41, 109.2], [49, 106.2]].map(([x, y]) => `<path d="M${x - 4.4} ${y + 3} V${y - 1} Q${x} ${y - 5.2} ${x + 4.4} ${y - 1} V${y + 3} Z"/>`).join("")}<rect x="54.6" y="94" width="2.8" height="10.6"/></g>`;
  s += `<g fill="#0B0B14">${[[25, 115.4], [33, 112.2], [41, 109.2], [49, 106.2]].map(([x, y]) => `<path d="M${x - 1.1} ${y + 3} V${y + 0.6} Q${x} ${y - 0.6} ${x + 1.1} ${y + 0.6} V${y + 3} Z"/>`).join("")}</g>`;
  s += `<path d="M0 139 C30 135 60 138 90 136.4 C120 135 150 138.4 180 137 V180 H0 Z" fill="#1B1A2C"/>`;
  s += `<path d="M0 139 C30 135 60 138 90 136.4 C120 135 150 138.4 180 137" stroke="#35354F" stroke-width="0.6" fill="none"/>`;
  return s + `</g>`;
};
/* mraky táhnou přes měsíc */
const vrstvaMraky = (st) => {
  let s = "";
  for (const [x0, y, rx, ry, v, seed, op] of [[30, 40, 34, 4.6, 1.5, 3, 0.9], [150, 52, 26, 3.4, 1.1, 7, 0.82], [110, 30, 22, 2.6, 2, 11, 0.7]]) {
    const x = (((st.t * v + x0) % 280) + 280) % 280 - 50;
    s += `<path d="${hrouda(x, y, rx, ry, seed, { bodu: 14, kolisani: 0.26 })}" fill="#22233C" opacity="${op}"/>`;
    s += `<path d="${hrouda(x + 4, y - ry * 0.5, rx * 0.7, ry * 0.5, seed + 1, { bodu: 10, kolisani: 0.22 })}" fill="#3C3F60" opacity="${f(op * 0.5)}"/>`;
  }
  return s;
};

/* vrba: kmen se naklání nad haldu, proutí visí a houpe se */
const KMEN = [[7, 176], [9, 150], [14, 124], [22, 100], [34, 82], [50, 70]];
const VETVE = [
  [[34, 82], [50, 70], [66, 64], [82, 64]],
  [[22, 100], [14, 84], [10, 66], [12, 50]],
  [[40, 77], [44, 60], [54, 48], [68, 44]],
];
const PROUTI = (() => {
  const r = rng(77);
  const P = [];
  const kotvy = [];
  for (const V of VETVE) for (let i = 1; i < V.length; i++) for (let k = 0; k < 4; k++) kotvy.push([lerp(V[i - 1][0], V[i][0], (k + r() * 0.8) / 4), lerp(V[i - 1][1], V[i][1], (k + r() * 0.8) / 4)]);
  for (const [x, y] of kotvy) P.push({ x, y, L: 26 + r() * 40, fz: r() * 6.28, w: 0.7 + r() * 0.5 });
  return P;
})();
const vrstvaVrba = (st) => {
  let s = `<path d="${pasPoBodech(KMEN, (q) => lerp(9.4, 3, q))}" fill="#12111B" stroke="#2A2A3E" stroke-width="0.5"/>`;
  for (const V of VETVE) s += `<path d="${hladka(V)}" stroke="#12111B" stroke-width="2.2" stroke-linecap="round" fill="none"/>`;
  let pruty = "", listi = "";
  for (const p of PROUTI) {
    const B = [];
    for (let i = 0; i <= 8; i++) {
      const q = i / 8;
      const kyv = (Math.sin(st.t * p.w + p.fz - q * 1.6) * 4 + st.vitr * 9) * q * q + Math.sin(p.fz * 3) * 3 * q;
      B.push([p.x + kyv, p.y + Math.min(p.L, 146 - p.y) * q]);
    }
    const d = hladka(B);
    pruty += d + " ";
    listi += d + " ";
  }
  s += `<path d="${pruty}" stroke="#22302B" stroke-width="0.5" fill="none"/>`;
  s += `<path d="${listi}" stroke="#3C5548" stroke-width="1.15" stroke-dasharray="2.6 1.5" fill="none" opacity="0.95"/>`;
  s += `<path d="${listi}" stroke="#6C8A74" stroke-width="0.45" stroke-dasharray="1.3 6.9" stroke-dashoffset="2" fill="none" opacity="0.8"/>`;
  return s;
};

/* halda: zadní řady v tuši, vpředu země a tři kusy přes okraj */
const vrstvaHromada = () => {
  let s = "";
  for (const p of HRNCE) s += hrnec(p);
  s += `<path d="M0 171 C22 166.4 40 172.6 62 171 C88 169 108 175 130 172.4 C150 170 168 173 180 171.4 V182 H0 Z" fill="#12111A"/>`;
  s += `<g stroke="#2E3A34" stroke-width="0.7" stroke-linecap="round" fill="none">${[[18, 171], [52, 172], [70, 171.6], [96, 173], [146, 172.4], [168, 172]].map(([x, y], i) => `<path d="M${x} ${y} q${-1.6 - (i % 2)} -4 ${-3.4} -6 M${x + 1} ${y} q0.4 -4.4 0.2 -7 M${x + 2} ${y} q1.8 -3.6 3.6 -5.4"/>`).join("")}</g>`;
  return s;
};
const vrstvaVpredu = () =>
  VPREDU.map((p) => {
    const z = naSvet(p, [0, 0]);
    return `<ellipse cx="${f(p.typ === "tokkuri" ? p.x + 10 : z[0])}" cy="179.2" rx="${p.typ === "tokkuri" ? 13 : 9}" ry="1.5" fill="#120E12" opacity="0.5"/>` + hrnec(p);
  }).join("");

/* prasklina a ústí se rozsvítí, když z hrnce stoupá dušička; ve velké káди někdo bydlí */
const vrstvaZarHrncu = (st) => {
  let s = "";
  HRNCE.forEach((p, i) => {
    const u = st.t - st.zar[i];
    if (u < 0 || u > 1.6) return;
    const k = Math.sin(Math.PI * clamp(u / 1.6));
    const tv = TVARY[p.typ];
    s += `<g transform="translate(${p.x} ${p.y}) rotate(${p.rot}) scale(${p.s})" opacity="${f(k)}">` +
      `<path d="${cara(p.trhlina)}" stroke="#7FE9DD" stroke-width="${f(2.6 / p.s)}" fill="none" opacity="0.35" stroke-linejoin="round"/>` +
      `<path d="${cara(p.trhlina)}" stroke="#E6FFF8" stroke-width="${f(0.8 / p.s)}" fill="none" stroke-linejoin="round"/>` +
      (p.dnem ? "" : `<ellipse cx="${tv.usti[0]}" cy="${tv.usti[1]}" rx="${f(tv.rUsti * 0.86)}" ry="${f(Math.max(0.7, tv.rUsti * 0.17))}" fill="#9FF0E6"/>`) +
      `</g>`;
  });
  const kad = HRNCE.find((p) => p.oci);
  if (st.mrkKad < 0.6) {
    const [ex, ey] = [clamp((st.fig.x - kad.x) / 40, -1, 1) * 1.6, -0.3];
    s += `<g transform="translate(${kad.x} ${kad.y}) rotate(${kad.rot}) scale(${kad.s})" fill="#C8FFF0">` +
      `<ellipse cx="${f(-3.4 + ex)}" cy="${f(-29.6 + ey)}" rx="1.05" ry="${f(1.05 * (1 - st.mrkKad))}"/><ellipse cx="${f(3.4 + ex)}" cy="${f(-29.6 + ey)}" rx="1.05" ry="${f(1.05 * (1 - st.mrkKad))}"/></g>`;
  }
  return s;
};

/* tráva susuki: stébla a chocholy, které se v měsíci stříbří */
const SUSUKI = [[166, 152, 1, 3], [150, 149, 0.8, 5], [22, 171, 0.9, 9], [124, 150, 0.6, 13]];
const vrstvaTrava = (st) => {
  let s = "";
  for (const [x, y, k, seed] of SUSUKI) {
    const r = rng(seed);
    let stebla = "", chocholy = "";
    for (let i = 0; i < 7; i++) {
      const a = (i - 3) * 0.2 + (r() - 0.5) * 0.14;
      const L = (22 + r() * 16) * k;
      const kyv = Math.sin(st.t * 1.1 + seed + i * 0.8) * 0.07 + st.vitr * 0.3;
      const B = [];
      for (let j = 0; j <= 6; j++) {
        const q = j / 6;
        const th = -Math.PI / 2 + a + (a * 1.4 + kyv * 2.6) * q * q;
        const pp = B.length ? B[B.length - 1] : [x + (i - 3) * 0.9 * k, y];
        B.push(j === 0 ? pp : [pp[0] + (Math.cos(th) * L) / 6, pp[1] + (Math.sin(th) * L) / 6]);
      }
      stebla += hladka(B) + " ";
      if (i % 2 === 0) chocholy += `<path d="${pasPoBodech(B.slice(3), (q) => 2.4 * k * Math.sin(Math.PI * clamp(q * 0.9 + 0.08)))}"/>`;
    }
    s += `<path d="${stebla}" stroke="#56634E" stroke-width="0.6" fill="none" stroke-linecap="round"/><g fill="#C9C8B2" opacity="0.82">${chocholy}</g>`;
  }
  return s;
};

/* ——— Dušičky ——— */
const dusicka = (o, st) => {
  const p = HRNCE[o.hrnec];
  const k = o.mira;
  const r = o.r * k;
  if (r < 0.3) return "";
  let s = plaminek(o.x, o.y, o.smer, { id: ID, r, delka: (8 + o.rychlost * 0.06) * k, t: st.t, fz: o.fz, barva: "#E6FBF6", lem: "#6CC3CC", sila: o.sila, zare: 0 });
  /* střípek hrnce na hlavě, očka a pusa */
  const m = o.mrk;
  s += `<path d="M${f(o.x - r * 0.74)} ${f(o.y - r * 0.6)} L${f(o.x - r * 0.1)} ${f(o.y - r * 1.62)} L${f(o.x + r * 0.78)} ${f(o.y - r * 0.5)} Q${f(o.x)} ${f(o.y - r * 1.04)} ${f(o.x - r * 0.74)} ${f(o.y - r * 0.6)} Z" fill="${mix(p.poleva, "#F2EEE2", 0.42)}" stroke="#0D0C15" stroke-width="0.35" stroke-linejoin="round" opacity="${f(clamp(o.sila * 1.2))}"/>`;
  s += `<g fill="#1B2140" opacity="${f(clamp(o.sila * 1.3))}"><ellipse cx="${f(o.x - r * 0.36 + o.vx * 0.012)}" cy="${f(o.y - r * 0.02)}" rx="${f(r * 0.15)}" ry="${f(r * 0.19 * (1 - m))}"/><ellipse cx="${f(o.x + r * 0.36 + o.vx * 0.012)}" cy="${f(o.y - r * 0.02)}" rx="${f(r * 0.15)}" ry="${f(r * 0.19 * (1 - m))}"/>`;
  s += o.pusa === 0 ? `<ellipse cx="${f(o.x + o.vx * 0.012)}" cy="${f(o.y + r * 0.42)}" rx="${f(r * 0.13)}" ry="${f(r * 0.17)}"/>` : "";
  s += `</g>`;
  if (o.pusa !== 0) s += `<path d="M${f(o.x - r * 0.24 + o.vx * 0.012)} ${f(o.y + r * 0.36)} q${f(r * 0.24)} ${f(r * (o.pusa === 1 ? 0.26 : 0))} ${f(r * 0.48)} 0" stroke="#1B2140" stroke-width="${f(r * 0.12)}" stroke-linecap="round" fill="none" opacity="${f(clamp(o.sila * 1.3))}"/>`;
  return s;
};
const vrstvaDuse = (st) => st.duse.map((o) => dusicka(o, st)).join("");
/* světlo: kolem dušiček, kolem Bublinky a na haldě pod nimi */
const vrstvaSvetlo = (st) => {
  let s = `<circle cx="${f(st.fig.x)}" cy="${f(st.fig.y)}" r="34" fill="url(#${ID}-svit)" opacity="0.5"/>`;
  for (const o of st.duse) s += `<circle cx="${f(o.x)}" cy="${f(o.y)}" r="${f(11 * o.mira)}" fill="url(#${ID}-svit)" opacity="${f(0.62 * o.sila)}"/>`;
  s += `<ellipse cx="${f(st.fig.x)}" cy="158" rx="38" ry="9" fill="url(#${ID}-svit)" opacity="0.22"/>`;
  return s;
};

/* ——— Bublinka ——— */
const vrstvaTelo = () => vPostave(bubTelo(ID, { obrys: "#262742", sirkaObrysu: 2 }));
const vrstvaLesk = () => vPostave(bubLesk({ sila: 0.8, barva: "#F4F8FF", okraj: "#E8F0FF" }) + `<path d="M118 62 A44 44 0 0 1 134 92" stroke="#FFF6D8" stroke-width="2.6" stroke-linecap="round" fill="none" opacity="0.7"/>`);
/* klobouk v měsíčním světle: pletení se stříbří do modra */
const vrstvaKlobouk = (st) => vPostave(bubKlobouk(ID, { kyv: st.kyv, barva: "#14131C", tmava: "#07060C", pleteni: "#5A6486", zebro: "#2E3250", lesk: "#C6D0F0", snurka: "#14131C", stin: 0.3 }));
const vrstvaTvar = (st) => vPostave(bubTvar(ID, { dx: st.pohled[0], dy: st.pohled[1], mrk: st.mrk, vyraz: st.vyraz, tvare: 0.4, oko: "#20223C" }));
const vrstvaRuce = (st) => {
  const BAR = { barva: "#D9DEE8", obrys: "#262742" };
  const W = [147, 100];
  /* zvonek na rumělkové šňůrce: kyvadlo pod zápěstím */
  const fi = st.zvonek;
  const Lz = 21;
  const Z = [W[0] + Math.sin(fi) * Lz, W[1] + 10 + Math.cos(fi) * Lz];
  const zvonek =
    `<path d="M${W[0]} ${W[1] + 9} L${pt(Z)}" stroke="#C4432B" stroke-width="1.8" stroke-linecap="round"/>` +
    `<g transform="translate(${pt(Z)}) rotate(${f((-fi * 180) / Math.PI)})">` +
    `<circle cx="0" cy="8" r="9" fill="url(#${ID}-zvonek)" stroke="#5E4212" stroke-width="1.5"/>` +
    `<path d="M-6.4 10.4 H6.4" stroke="#5E4212" stroke-width="1.6" stroke-linecap="round"/><circle cx="-6.6" cy="10.4" r="1.3" fill="#3A2A0C"/><circle cx="6.6" cy="10.4" r="1.3" fill="#3A2A0C"/>` +
    `<path d="M-5 3 Q-2 0.6 1.6 1.4" stroke="#FFF3CF" stroke-width="1.6" stroke-linecap="round" fill="none" opacity="0.9"/>` +
    `<rect x="-2" y="-2.6" width="4" height="3.4" rx="1" fill="#B88A2E" stroke="#5E4212" stroke-width="1"/></g>`;
  /* vlnky zvonění */
  let vlnky = "";
  const uz = st.t - st.cink;
  if (uz >= 0 && uz < 0.7) {
    const q = uz / 0.7;
    for (const k of [0, 1]) vlnky += `<circle cx="${f(Z[0])}" cy="${f(Z[1] + 8)}" r="${f(12 + 22 * q + k * 9)}" fill="none" stroke="#FFE9A8" stroke-width="${f(2.2 * (1 - q))}" opacity="${f(0.8 * (1 - q))}"/>`;
  }
  return vPostave(
    ruckaDucha([47.6, 112], [35, 106], { uhel: 10 + 6 * Math.sin(st.t * 1.4) - st.fig.vx * 0.5, ohyb: 1, delka: 13, ...BAR }) +
      zvonek +
      ruckaDucha([132.4, 110], W, { uhel: -6 - st.fig.vx * 0.3, ohyb: -1, delka: 12, ...BAR }) +
      vlnky,
  );
};
const vrstvaMlha = (st) => {
  let s = "";
  for (const [x0, y, rx, ry, v, op] of [[20, 148, 46, 7, 2.2, 0.5], [120, 156, 54, 8, -1.6, 0.45], [70, 134, 40, 5, 1.2, 0.3]]) {
    const x = (((st.t * v + x0) % 300) + 300) % 300 - 60;
    s += `<ellipse cx="${f(x)}" cy="${f(y + Math.sin(st.t * 0.3 + x0) * 1.4)}" rx="${rx}" ry="${ry}" fill="url(#${ID}-mlha)" opacity="${op}"/>`;
  }
  return s;
};
const vrstvaJiskry = (st) =>
  st.jiskry
    .map((j) => {
      const u = j.vek / j.zivot;
      return `<path d="${jiskraD(j.r * (1 - u * 0.5))}" transform="translate(${f(j.x)} ${f(j.y)}) rotate(${f(j.rot + u * 80)})" fill="${j.zlata ? "#FFE9A8" : "#E6FFF8"}" opacity="${f(clamp(Math.min(u / 0.1, (1 - u) / 0.5)))}"/>`;
    })
    .join("");

const defs = () =>
  TUS.defs +
  bubDefs(ID, { pruhledna: 0.93, stred: "#FBFCFA", pas: "#E6EBF0", okraj: "#B4BED4", lem: "#8A96B6", tvare: "#D08A8E", zrno: 0.26 }) +
  onibiDefs(ID, { barva: "#7FD6DA", stred: "#C6F6EE" }) +
  Object.entries(TVARY).map(([jm, tv]) => `<clipPath id="${ID}-tvar-${jm}"><path d="${tv.d}"/></clipPath>`).join("") +
  `<linearGradient id="${ID}-obzor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2E3358" stop-opacity="0"/><stop offset="1" stop-color="#2E3358" stop-opacity="0.75"/></linearGradient>` +
  `<radialGradient id="${ID}-mesic-zar"><stop offset="0" stop-color="#EDE8D0" stop-opacity="0.4"/><stop offset="0.4" stop-color="#C9CCD6" stop-opacity="0.14"/><stop offset="1" stop-color="#C9CCD6" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="${ID}-mesic" cx="0.4" cy="0.38" r="0.7"><stop offset="0" stop-color="#FBF7E4"/><stop offset="0.7" stop-color="#EAE4CA"/><stop offset="1" stop-color="#CFC9B0"/></radialGradient>` +
  /* měsíc svítí zprava: levý bok hrnce ve stínu, pravý má stříbrný lem */
  `<linearGradient id="${ID}-stin" x1="0" y1="0" x2="1" y2="0"><stop offset="0.2" stop-color="#05050C" stop-opacity="0.5"/><stop offset="0.6" stop-color="#05050C" stop-opacity="0"/><stop offset="0.72" stop-color="#C6D0F0" stop-opacity="0"/><stop offset="0.82" stop-color="#C6D0F0" stop-opacity="0.34"/></linearGradient>` +
  `<linearGradient id="${ID}-stin-den" x1="0" y1="0" x2="1" y2="0"><stop offset="0.2" stop-color="#2A1E18" stop-opacity="0.3"/><stop offset="0.6" stop-color="#2A1E18" stop-opacity="0"/><stop offset="0.72" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="0.8" stop-color="#FFFFFF" stop-opacity="0.34"/></linearGradient>` +
  `<radialGradient id="${ID}-svit"><stop offset="0" stop-color="#A9F0E6" stop-opacity="0.6"/><stop offset="0.45" stop-color="#5FB6CC" stop-opacity="0.2"/><stop offset="1" stop-color="#5FB6CC" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="${ID}-mlha"><stop offset="0" stop-color="#AEB8DC" stop-opacity="0.34"/><stop offset="1" stop-color="#AEB8DC" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="${ID}-zvonek" cx="0.36" cy="0.3" r="0.8"><stop offset="0" stop-color="#FFE9A8"/><stop offset="0.5" stop-color="#E2B552"/><stop offset="1" stop-color="#A9781E"/></radialGradient>`;

/* ——— Simulace ——— */
/** Kudy chodí, když ji nikdo nevede: ležatá osmička nad haldou. */
const draha = (t) => [90 + 46 * Math.sin(t * 0.33), 80 + 15 * Math.sin(t * 0.66 + 0.6)];
/** Bod na její stopě, `zpet` jednotek za ní. Stopa se měří ušlou dráhou, takže když zastaví, řada zůstane stát. */
const stopa = (dyn, zpet) => {
  const H = dyn.stopa;
  const kde = H[H.length - 1][0] - zpet;
  for (let i = H.length - 1; i > 0; i--) {
    if (H[i - 1][0] <= kde) {
      const k = clamp((kde - H[i - 1][0]) / (H[i][0] - H[i - 1][0] || 1));
      return [lerp(H[i - 1][1], H[i][1], k), lerp(H[i - 1][2], H[i][2], k)];
    }
  }
  return [H[0][1], H[0][2]];
};
const prodluzStopu = (dyn, x, y) => {
  const H = dyn.stopa;
  const p = H[H.length - 1];
  const d = p ? Math.hypot(x - p[1], y - p[2]) : 0;
  if (p && d < 0.3) return;
  H.push([(p ? p[0] : 0) + d, x, y]);
  while (H.length > 2 && H[1][0] < H[H.length - 1][0] - 120) H.shift();
};
const novaDuse = (R, hrnecI, t) => {
  const p = HRNCE[hrnecI];
  return { x: p.vychod[0], y: p.vychod[1], vx: 0, vy: 0, smer: Math.PI / 2, rychlost: 0, fz: R() * 6.28, r: 2.9 + R() * 0.9, hrnec: hrnecI, pusa: Math.floor(R() * 3), stavD: "rodi", t0: t, mira: 0, sila: 1, mrk: 0, mrkFz: R() * 7 };
};
const novaDynamika = () => {
  const R = rng(1414);
  const dyn = { fig: { x: 0, y: 0, vx: 0, vy: 0 }, stopa: [], duse: [], zar: HRNCE.map(() => -100), dalsi: 3.2, jiskry: [], zvonek: 0.2, zvonekV: 0, cink: -100, posledniKlik: -100, vitr: 0, nahoda: R, zvuk: [], pohled: [0, 0], smich: -100, sova: 9 };
  /* stopa za posledních pár sekund a čtyři dušičky už v řadě, ať scéna nezačíná prázdná */
  for (let q = -9; q <= 0; q += 1 / 30) prodluzStopu(dyn, ...draha(q));
  [dyn.fig.x, dyn.fig.y] = draha(0);
  [1, 6, 3, 8].forEach((h, k) => {
    const o = novaDuse(R, h, -10);
    [o.x, o.y] = stopa(dyn, ODSTUP + k * ROZESTUP);
    o.y += 4;
    o.stavD = "jde";
    o.mira = 1;
    dyn.duse.push(o);
  });
  return dyn;
};
const zrod = (dyn, t, hrnecI) => {
  const R = dyn.nahoda;
  dyn.duse.push(novaDuse(R, hrnecI, t));
  dyn.zar[hrnecI] = t;
  const pan = clamp((HRNCE[hrnecI].x - 90) / 80, -1, 1);
  dyn.zvuk.push({ druh: "pop", sila: 0.8, pan, za: 0.25 });
  dyn.zvuk.push({ druh: "ton", vys: hrnecI % PENTA, sila: 0.9, pan, za: 0.3 });
  /* je jich moc: nejstarší, která už chodí, odletí k měsíci */
  const chodi = dyn.duse.filter((o) => o.stavD !== "stoupa");
  if (chodi.length > NEJVIC) {
    chodi[0].stavD = "stoupa";
    chodi[0].t0 = t;
  }
};
const krok = (dyn, t, dt, vstup) => {
  const R = dyn.nahoda;
  const fig = dyn.fig;
  dyn.vitr = kCili(dyn.vitr, 0.3 * Math.sin(t * 0.4) + 0.2 * Math.sin(t * 0.9 + 1), dt, 0.5);
  /* kam pluje */
  const cil = vstup.mys ? [clamp(vstup.mys.x, 26, 154), clamp(vstup.mys.y - 4, 36, 116)] : draha(t);
  const ax = 5.5 * (cil[0] - fig.x) - 3.4 * fig.vx, ay = 5.5 * (cil[1] - fig.y) - 3.4 * fig.vy;
  fig.vx += ax * dt;
  fig.vy += ay * dt;
  fig.x += fig.vx * dt;
  fig.y += fig.vy * dt;
  prodluzStopu(dyn, fig.x, fig.y);
  /* zvonek: kyvadlo, které rozhoupe její zrychlení; cinkne, když projde středem */
  const pred = dyn.zvonek;
  dyn.zvonekV += (-38 * Math.sin(dyn.zvonek) - 1.5 * dyn.zvonekV - ax * 0.22 * Math.cos(dyn.zvonek)) * dt;
  dyn.zvonek = clamp(dyn.zvonek + dyn.zvonekV * dt, -1.3, 1.3);
  if (pred * dyn.zvonek < 0 && Math.abs(dyn.zvonekV) > 2.4 && t - dyn.cink > 0.16) {
    dyn.cink = t;
    dyn.zvuk.push({ druh: "cink", sila: clamp(Math.abs(dyn.zvonekV) / 7, 0.3, 1), pan: clamp((fig.x - 90) / 80, -1, 1) });
  }
  /* kliknutí: zazvoní a z nejbližšího hrnce vyklouzne další */
  if (vstup.kliky && vstup.kliky.length) {
    const k = vstup.kliky[vstup.kliky.length - 1];
    vstup.kliky.length = 0;
    if (t - dyn.posledniKlik > 0.22) {
      dyn.posledniKlik = t;
      dyn.zvonekV += (dyn.zvonekV >= 0 ? 1 : -1) * 7.5;
      dyn.smich = t;
      let nej = ZIVE[0], dNej = 1e9;
      for (const i of ZIVE) {
        if (t - dyn.zar[i] < 1.2) continue;
        const d = Math.hypot(HRNCE[i].vychod[0] - k.x, HRNCE[i].vychod[1] - k.y);
        if (d < dNej) [nej, dNej] = [i, d];
      }
      zrod(dyn, t, nej);
      for (let i = 0; i < 6; i++) dyn.jiskry.push({ x: fig.x + 14 + (R() - 0.5) * 8, y: fig.y + 12 + (R() - 0.5) * 8, vx: (R() - 0.5) * 30, vy: -8 - R() * 20, vek: 0, zivot: 0.7 + R() * 0.5, r: 1 + R() * 1.2, rot: R() * 90, zlata: true });
      dyn.dalsi = Math.max(dyn.dalsi, t + 5);
    }
  }
  if (t > dyn.dalsi) {
    const volne = ZIVE.filter((i) => t - dyn.zar[i] > 6);
    zrod(dyn, t, volne[Math.floor(R() * volne.length)] ?? ZIVE[0]);
    dyn.dalsi = t + 5.5 + R() * 3;
  }
  /* dušičky: zrodí se nad hrncem, pak jdou v řadě po její stopě, nakonec k měsíci */
  let poradi = 0;
  for (const o of dyn.duse) {
    const u = t - o.t0;
    let kam;
    if (o.stavD === "rodi") {
      const p = HRNCE[o.hrnec];
      kam = [p.vychod[0] + Math.sin(u * 5 + o.fz) * 2, p.vychod[1] - 4 - 13 * smooth(u / 1.1)];
      o.mira = smooth(u / 0.6);
      if (u > 1.2) o.stavD = "jde";
    } else if (o.stavD === "jde") {
      const s = stopa(dyn, ODSTUP + poradi * ROZESTUP);
      kam = [s[0] + Math.sin(t * 1.7 + o.fz) * 1.6, s[1] + 4 + Math.cos(t * 1.3 + o.fz) * 2.6];
      o.mira = kCili(o.mira, 1, dt, 0.2);
      poradi++;
    } else {
      kam = [MESIC[0] + Math.sin(u * 3 + o.fz) * 5 * (1 - smooth(u / 2.6)), MESIC[1]];
      o.mira = 1 - 0.72 * smooth(u / 2.8);
      o.sila = 1 - smooth((u - 2.2) / 0.7);
      if (R() < dt * 9) dyn.jiskry.push({ x: o.x + (R() - 0.5) * 3, y: o.y + 2, vx: (R() - 0.5) * 6, vy: 4 + R() * 6, vek: 0, zivot: 0.8 + R() * 0.6, r: 0.6 + R() * 0.7, rot: R() * 90 });
      if (u > 2.9) {
        o.pryc = true;
        dyn.zvuk.push({ druh: "kvet", sila: 0.8, pan: 0.4 });
        for (let i = 0; i < 9; i++) dyn.jiskry.push({ x: MESIC[0] + (R() - 0.5) * 8, y: MESIC[1] + (R() - 0.5) * 8, vx: (R() - 0.5) * 26, vy: (R() - 0.5) * 26, vek: 0, zivot: 0.8 + R() * 0.7, r: 0.8 + R() * 1.2, rot: R() * 90 });
      }
    }
    krokOnibi(o, kam, dt, o.stavD === "stoupa" ? { tuhost: 3.2, tlumeni: 3 } : { tuhost: 16, tlumeni: 6 });
    const m = ((t + o.mrkFz) % 4.6) - 4.4;
    o.mrk = m > 0 ? Math.sin((Math.PI * m) / 0.2) : 0;
  }
  dyn.duse = dyn.duse.filter((o) => !o.pryc);
  for (const j of dyn.jiskry) {
    j.vek += dt;
    j.x += j.vx * dt;
    j.y += j.vy * dt;
    j.vx *= 1 - dt * 1.4;
    j.vy *= 1 - dt * 1.4;
  }
  dyn.jiskry = dyn.jiskry.filter((j) => j.vek < j.zivot);
  /* sova občas zahouká, cvrčci drží noc */
  if (t > dyn.sova) {
    dyn.zvuk.push({ druh: "sova", sila: 0.6, pan: -0.7 });
    dyn.sova = t + 13 + R() * 9;
  }
  if (R() < dt * 0.5) dyn.zvuk.push({ druh: "cvrcek", sila: 0.6, pan: (R() - 0.5) * 1.6 });
  /* pohled: ohlíží se po dušičkách, po zvonění na nový hrnec, jinak za kurzorem */
  const posl = dyn.duse[dyn.duse.length - 1];
  let kam = posl && posl.stavD === "rodi" ? [posl.x, posl.y] : vstup.mys ? [vstup.mys.x, vstup.mys.y] : [fig.x - fig.vx * 2, fig.y + 10];
  const cp = [clamp((kam[0] - fig.x) / 30, -1, 1) * 2.3, clamp((kam[1] - fig.y) / 30, -1, 1) * 1.7];
  dyn.pohled = dyn.pohled.map((q, i) => kCili(q, cp[i], dt, 0.14));
};
const stav = (t, vstup = {}, dyn) => {
  const d = dyn || novaDynamika();
  return {
    t, fig: d.fig, vitr: d.vitr, duse: d.duse, zar: d.zar, jiskry: d.jiskry, zvonek: d.zvonek, cink: d.cink,
    kyv: clamp(-d.fig.vx * 0.5, -16, 16) + 2 * Math.sin(t * 1.7),
    vyraz: t - d.smich < 0.9 ? "smich" : "smug",
    pohled: d.pohled, mrk: mrkani(t, [1.8, 5.2, 5.45, 8.4], 9.6), mrkKad: clamp(Math.sin(t * 0.7) * 6 - 4.6) + mrkani(t, [3.1, 7.3], 8.8),
  };
};
const snimek = (st) => Math.floor(st.t * 30);
const pohyb = (st) => ({ x: st.fig.x - B0[0], y: st.fig.y - B0[1], r: clamp(st.fig.vx * 0.3, -14, 14), ox: B0[0], oy: B0[1] });

export const lemHrbitov = {
  id: "hrbitov",
  viewBox: "0 0 180 180",
  defs,
  novaDynamika,
  krok,
  stav,
  hukot: (st) => ({ vitr: clamp(0.3 + Math.abs(st.vitr) * 0.6) }),
  klidne: { t: 2 },
  vrstvy: [
    { id: "tus", kresli: vrstvaTus, tezka: true },
    { id: "mraky", kresli: vrstvaMraky, klic: (st) => Math.floor(st.t * 8), orez: OREZ },
    { id: "vrba", kresli: vrstvaVrba, klic: (st) => Math.floor(st.t * 15), orez: OREZ },
    { id: "hromada", kresli: vrstvaHromada, orez: OREZ },
    { id: "zar-hrncu", kresli: vrstvaZarHrncu, klic: (st) => `${Math.floor(st.t * 20)}`, orez: OREZ },
    { id: "trava", kresli: vrstvaTrava, klic: (st) => Math.floor(st.t * 15), orez: OREZ },
    { id: "vpredu", kresli: vrstvaVpredu },
    { id: "svetlo", kresli: vrstvaSvetlo, klic: snimek, styl: "mix-blend-mode:screen", orez: OREZ },
    { id: "telo", kresli: vrstvaTelo, tezka: true, pohyb },
    { id: "lesk", kresli: vrstvaLesk, pohyb },
    { id: "klobouk", kresli: vrstvaKlobouk, klic: (st) => f(Math.round(st.kyv * 2) / 2), pohyb },
    { id: "tvar", kresli: vrstvaTvar, klic: (st) => `${f(st.pohled[0])},${f(st.pohled[1])},${f(st.mrk)},${st.vyraz}`, pohyb },
    { id: "ruce", kresli: vrstvaRuce, klic: snimek, pohyb },
    { id: "duse", kresli: vrstvaDuse, klic: snimek },
    { id: "mlha", kresli: vrstvaMlha, klic: (st) => Math.floor(st.t * 12), orez: OREZ },
    { id: "jiskry", kresli: vrstvaJiskry, klic: snimek },
  ],
};
