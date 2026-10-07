/**
 * Kreslení tuší pro svitek na /o-nas-2. Všechno běží při buildu a vrací
 * hotové SVG jako text — scéna je pak jen poskládaná z tahů, přes které
 * jde filtr #tus-hrana (roztřepený okraj) a pod nimi rozpité skvrny
 * #tus-rozpit.
 *
 * Tah štětcem má proměnnou šířku: štětec dosedne, drží sílu a ke konci
 * se odlehčí. Body se proloží Catmull-Romovou křivkou, takže stačí pár
 * opěrných bodů.
 */

export type B = [number, number];
export const TUS = "#2B2420";
/** Síla štětce pro celý svitek — tahy se píšou v jednotkách kresby 1000 × 600 */
const SILA = 1.5;
const f = (n: number) => (Math.round(n * 10) / 10).toString();

/** Bod na hladké křivce přes body; t od 0 do 1 */
function krivka(body: B[]) {
  const n = body.length - 1;
  return (t: number): B => {
    if (n <= 0) return body[0];
    const u = Math.min(n - 1e-6, Math.max(0, t * n));
    const i = Math.floor(u);
    const s = u - i;
    const p0 = body[Math.max(0, i - 1)];
    const p1 = body[i];
    const p2 = body[i + 1];
    const p3 = body[Math.min(n, i + 2)];
    const cr = (a: number, b: number, c: number, d: number) =>
      0.5 * (2 * b + (-a + c) * s + (2 * a - 5 * b + 4 * c - d) * s * s + (-a + 3 * b - 3 * c + d) * s * s * s);
    return [cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1])];
  };
}

interface Tah {
  /** Jak silně štětec dosedne (podíl plné šířky) */
  od?: number;
  /** Jak tenký je konec tahu */
  konec?: number;
  barva?: string;
  pruhl?: number;
  trida?: string;
}

/** Tah štětcem přes body, plná šířka w */
export function tah(body: B[], w: number, { od = 0.4, konec = 0.18, barva = TUS, pruhl = 1, trida }: Tah = {}) {
  const P = krivka(body);
  const delka = body.reduce((s, b, i) => (i ? s + Math.hypot(b[0] - body[i - 1][0], b[1] - body[i - 1][1]) : 0), 0);
  const N = Math.max(10, Math.min(120, Math.round(delka / 6)));
  const sirka = (t: number) => {
    const a = t < 0.14 ? od + (1 - od) * (t / 0.14) : 1;
    const b = t > 0.68 ? 1 - (1 - konec) * ((t - 0.68) / 0.32) : 1;
    return SILA * w * Math.min(a, b) * (0.9 + 0.1 * Math.sin(t * 11 + body.length));
  };
  const L: B[] = [];
  const R: B[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const [x, y] = P(t);
    const [xa, ya] = P(Math.max(0, t - 0.004));
    const [xb, yb] = P(Math.min(1, t + 0.004));
    const d = Math.hypot(xb - xa, yb - ya) || 1;
    const nx = -(yb - ya) / d;
    const ny = (xb - xa) / d;
    const s = sirka(t) / 2;
    L.push([x + nx * s, y + ny * s]);
    R.push([x - nx * s, y - ny * s]);
  }
  const d = `M${L.map((b) => `${f(b[0])} ${f(b[1])}`).join(" L")} L${R.reverse().map((b) => `${f(b[0])} ${f(b[1])}`).join(" L")} Z`;
  return `<path d="${d}" fill="${barva}"${pruhl < 1 ? ` opacity="${pruhl}"` : ""}${trida ? ` class="${trida}"` : ""}/>`;
}

/** Rozpitá skvrna tuše (přes rozmazání) */
export const skvrna = (d: string, barva = TUS, pruhl = 0.12) => `<path d="${d}" fill="${barva}" opacity="${pruhl}" filter="url(#tus-rozpit)"/>`;
/** Plocha bez rozmazání */
export const plocha = (d: string, barva = TUS, pruhl = 0.12) => `<path d="${d}" fill="${barva}" opacity="${pruhl}"/>`;

/** Obdélník ze čtyř tahů — rohy se trochu přetahují, jak to rukou bývá */
export function obdelnik(x: number, y: number, w: number, h: number, sila = 4, o: Tah = {}) {
  const p = 3;
  return [
    tah([[x - p, y], [x + w / 2, y - 1], [x + w + p, y + 1]], sila, o),
    tah([[x + w, y - p], [x + w + 1, y + h / 2], [x + w, y + h + p]], sila, o),
    tah([[x + w + p, y + h], [x + w / 2, y + h + 1], [x - p, y + h - 1]], sila, o),
    tah([[x, y + h + p], [x - 1, y + h / 2], [x + 1, y - p]], sila, o),
  ].join("");
}

/** Elipsa jedním tahem, konec trochu přetáhne začátek */
export function elipsa(cx: number, cy: number, rx: number, ry: number, sila = 4, o: Tah = {}, od = -0.3) {
  const body: B[] = [];
  for (let i = 0; i <= 16; i++) {
    const a = od + (i / 16) * Math.PI * 2.1;
    body.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return tah(body, sila, { od: 0.5, konec: 0.3, ...o });
}

/** Rovná čára (krátký tah) */
export const cara = (x1: number, y1: number, x2: number, y2: number, sila = 3, o: Tah = {}) =>
  tah([[x1, y1], [(x1 + x2) / 2 + (y2 - y1) * 0.01, (y1 + y2) / 2], [x2, y2]], sila, o);

/* ——— Věci do scén ——— */

/** Zem a stěna dílny: zadní hrana podlahy a kus stěny */
export const mistnost = (zed = true) =>
  [
    skvrna("M0 500 L1000 500 L1000 600 L0 600 Z", TUS, 0.08),
    skvrna("M70 462 C300 452 700 456 940 462 L940 500 L70 500 Z", TUS, 0.07),
    zed ? skvrna("M64 100 L940 100 L940 128 C700 140 300 136 64 130 Z", TUS, 0.06) : "",
    zed ? skvrna("M62 100 L96 100 L92 500 L62 500 Z", TUS, 0.06) : "",
    tah([[10, 500], [380, 497], [700, 502], [990, 498]], 5, { od: 0.6 }),
    zed ? tah([[60, 500], [62, 300], [58, 96]], 4, { od: 0.5, konec: 0.4 }) : "",
    zed ? tah([[52, 100], [500, 94], [948, 102]], 4, { od: 0.5 }) : "",
  ].join("");

/** Kbelík */
export const kbelik = (x: number, y: number, s = 1, voda = false) =>
  [
    voda ? plocha(`M${x - 24 * s} ${y - 40 * s} L${x + 24 * s} ${y - 40 * s} L${x + 19 * s} ${y} L${x - 19 * s} ${y} Z`, "#8FB3C9", 0.35) : "",
    tah([[x - 26 * s, y - 42 * s], [x - 22 * s, y - 20 * s], [x - 19 * s, y]], 4 * s),
    tah([[x + 26 * s, y - 42 * s], [x + 22 * s, y - 20 * s], [x + 19 * s, y]], 4 * s),
    elipsa(x, y - 42 * s, 26 * s, 6 * s, 3 * s),
    tah([[x - 19 * s, y], [x, y + 3 * s], [x + 19 * s, y]], 3.5 * s),
    tah([[x - 24 * s, y - 42 * s], [x - 20 * s, y - 68 * s], [x, y - 74 * s], [x + 20 * s, y - 68 * s], [x + 24 * s, y - 42 * s]], 2 * s, { od: 0.6, konec: 0.5 }),
  ].join("");

/** Kaluž: modrá rozpitá plocha a pár kroužků */
export const kaluz = (cx: number, cy: number, rx: number, ry: number) =>
  [
    skvrna(`M${cx - rx} ${cy} C${cx - rx} ${cy - ry * 1.3} ${cx + rx * 0.4} ${cy - ry * 1.1} ${cx + rx} ${cy - ry * 0.2} C${cx + rx * 1.1} ${cy + ry} ${cx - rx * 0.3} ${cy + ry * 1.2} ${cx - rx} ${cy} Z`, "#6E9AB8", 0.32),
    elipsa(cx + rx * 0.1, cy, rx * 0.35, ry * 0.32, 1.6, { pruhl: 0.55 }),
    elipsa(cx + rx * 0.1, cy, rx * 0.62, ry * 0.58, 1.3, { pruhl: 0.35 }),
  ].join("");

/** Prasklá trubka pod stropem a z ní stříká voda */
export const trubkaPraskla = (x1: number, x2: number, y: number, kde: number) =>
  [
    tah([[x1, y], [kde - 10, y + 1]], 9, { od: 0.8, konec: 0.9 }),
    tah([[kde + 10, y + 2], [x2, y]], 9, { od: 0.9, konec: 0.8 }),
    ...[-1, -0.5, 0, 0.5, 1].map((k, i) =>
      tah([[kde, y + 6], [kde + k * 30, y + 40 + (i % 2) * 14], [kde + k * 46, y + 92]], 2.2, { barva: "#5E86A6", od: 0.9, konec: 0.1 }),
    ),
    ...[0, 1, 2].map((i) => elipsa(kde - 24 + i * 22, y + 120 + (i % 2) * 16, 3, 5, 2, { barva: "#5E86A6" })),
  ].join("");

/** Garážová vrata: rám a vodorovné lamely */
export const vrata = (x: number, y: number, w: number, h: number) =>
  [obdelnik(x, y, w, h, 4.5), ...Array.from({ length: 6 }, (_, i) => cara(x + 6, y + ((i + 1) * h) / 7, x + w - 6, y + ((i + 1) * h) / 7 + (i % 2), 1.8, { pruhl: 0.7 }))].join("");

/** Malé okno se sněhem venku */
export const okenko = (x: number, y: number, w: number, h: number, snih = false) =>
  [
    plocha(`M${x} ${y} h${w} v${h} h${-w} Z`, "#C9D6DE", 0.35),
    obdelnik(x, y, w, h, 3.5),
    cara(x + w / 2, y + 4, x + w / 2, y + h - 4, 2.4),
    snih ? [0, 1, 2, 3, 4, 5].map((i) => `<circle cx="${f(x + 10 + ((i * 37) % (w - 20)))}" cy="${f(y + 12 + ((i * 23) % (h - 20)))}" r="2.2" fill="#FFFFFF"/>`).join("") : "",
  ].join("");

/** Mop opřený o zeď */
export const mop = (x: number, y: number) =>
  [tah([[x, y], [x + 40, y - 170]], 3.4, { od: 0.8 }), ...[-12, -6, 0, 6, 12].map((d) => tah([[x + d * 0.3, y - 6], [x + d, y + 6]], 2.4, { od: 0.9 }))].join("");

/** Kolečko s betonem */
export const kolecko = (x: number, y: number) =>
  [
    skvrna(`M${x - 60} ${y - 52} Q${x} ${y - 70} ${x + 56} ${y - 54} L${x + 46} ${y - 38} L${x - 50} ${y - 36} Z`, "#8A8478", 0.5),
    tah([[x - 70, y - 56], [x - 50, y - 18], [x + 40, y - 18], [x + 64, y - 56]], 4.5),
    tah([[x - 72, y - 56], [x, y - 58], [x + 66, y - 56]], 3.5),
    elipsa(x - 46, y - 2, 16, 16, 3.5),
    tah([[x + 40, y - 30], [x + 120, y - 50]], 3.5),
    tah([[x + 30, y - 18], [x + 36, y + 10]], 3),
  ].join("");

/** Váleček na tyči a kbelík s barvou */
export const valecek = (x: number, y: number) =>
  [
    tah([[x, y], [x + 30, y - 210]], 3, { od: 0.8 }),
    tah([[x + 8, y - 214], [x + 52, y - 208]], 12, { od: 0.9, konec: 0.9, barva: "#F2EBDD" }),
    obdelnik(x + 6, y - 222, 48, 16, 2.4),
  ].join("");

/** Zeď s dírou po bourání a pár cihel na zemi */
export const dira = (x: number, y: number) =>
  [
    tah([[x, y], [x + 30, y - 14], [x + 64, y - 6], [x + 88, y + 24], [x + 80, y + 70], [x + 40, y + 84], [x + 6, y + 60], [x, y]], 3.2, { od: 0.6, konec: 0.6 }),
    skvrna(`M${x + 8} ${y + 4} L${x + 80} ${y + 2} L${x + 78} ${y + 70} L${x + 10} ${y + 62} Z`, TUS, 0.22),
    ...[[x + 4, y + 22, 18], [x + 62, y + 4, 20], [x + 70, y + 54, 16], [x + 18, y + 64, 18]].map(([bx, by, bw]) => obdelnik(bx, by, bw, 9, 1.6, { pruhl: 0.8 })),
    ...[0, 1, 2].map((i) => obdelnik(x + 30 + i * 28, 486 - (i % 2) * 6, 24, 12, 2)),
  ].join("");

/** Velké okno výlohy */
export const vyloha = (x: number, y: number, w: number, h: number) =>
  [
    plocha(`M${x} ${y} h${w} v${h} h${-w} Z`, "#CFE0E8", 0.3),
    obdelnik(x, y, w, h, 6),
    cara(x + w / 2, y + 6, x + w / 2, y + h - 6, 4),
    cara(x + 18, y + 26, x + 60, y + 8, 2, { pruhl: 0.5 }),
    cara(x + 24, y + 50, x + 100, y + 14, 2, { pruhl: 0.4 }),
  ].join("");

/** Hrnčířský kruh: vana, hlava a pedál */
export const kruh = (x: number, y: number, s = 1) =>
  [
    skvrna(`M${x - 60 * s} ${y - 34 * s} L${x + 60 * s} ${y - 34 * s} L${x + 50 * s} ${y} L${x - 50 * s} ${y} Z`, "#7E858C", 0.35),
    elipsa(x, y - 52 * s, 62 * s, 14 * s, 3.5 * s),
    tah([[x - 60 * s, y - 50 * s], [x - 54 * s, y - 20 * s], [x - 46 * s, y]], 3.5 * s),
    tah([[x + 60 * s, y - 50 * s], [x + 54 * s, y - 20 * s], [x + 46 * s, y]], 3.5 * s),
    elipsa(x, y - 58 * s, 34 * s, 7 * s, 4 * s, { barva: "#5C6168" }),
    tah([[x - 46 * s, y], [x + 46 * s, y + 2 * s]], 3 * s),
    tah([[x + 54 * s, y - 6 * s], [x + 96 * s, y - 2 * s]], 3 * s),
  ].join("");

/** Rudl */
export const rudl = (x: number, y: number) =>
  [tah([[x, y - 170], [x + 6, y - 10]], 4), tah([[x + 6, y - 10], [x + 60, y - 8]], 4), elipsa(x + 8, y + 2, 12, 12, 3), tah([[x - 12, y - 176], [x + 12, y - 168]], 4)].join("");

/** Kancelářský stůl se šuplíky */
export const stul = (x: number, y: number, w: number, nohyNahoru = false) =>
  nohyNahoru
    ? [obdelnik(x, y - 30, w, 16, 3.5), ...[x + 12, x + w - 12].map((nx) => tah([[nx, y - 30], [nx + 2, y - 110]], 3.5)), tah([[x + 14, y - 44], [x + w - 14, y - 44]], 2, { pruhl: 0.6 })].join("")
    : [
        tah([[x - 6, y - 92], [x + w / 2, y - 94], [x + w + 6, y - 91]], 5),
        tah([[x + 8, y - 90], [x + 6, y]], 3.5),
        tah([[x + w - 8, y - 90], [x + w - 6, y]], 3.5),
        obdelnik(x + w - 70, y - 86, 56, 70, 2.6),
        cara(x + w - 64, y - 62, x + w - 20, y - 62, 2),
        cara(x + w - 64, y - 40, x + w - 20, y - 40, 2),
      ].join("");

/** Krabice z kartonu */
export const krabice = (x: number, y: number, w: number, h: number) =>
  [plocha(`M${x} ${y - h} h${w} v${h} h${-w} Z`, "#B48C64", 0.28), obdelnik(x, y - h, w, h, 3), cara(x + w * 0.5, y - h, x + w * 0.5, y - h + 14, 2.4), cara(x + 6, y - h + 2, x + w - 6, y - h + 2, 6, { barva: "#C9A57C", pruhl: 0.6 })].join("");

/** Trubky po zdi k dřezu */
export const trubky = (x: number, y: number) =>
  [
    tah([[x, 100], [x + 2, y - 120], [x + 30, y - 128], [x + 160, y - 128]], 6, { od: 0.9, konec: 0.9 }),
    tah([[x + 30, 100], [x + 32, y - 104], [x + 60, y - 110], [x + 160, y - 110]], 6, { od: 0.9, konec: 0.9, barva: "#5C5047" }),
    ...[y - 200, y - 260].map((yy) => obdelnik(x - 6, yy, 48, 8, 2)),
  ].join("");

/** Skříňka, otevřená nebo zavřená */
export const skrinka = (x: number, y: number, w: number, h: number, otevrena = false) =>
  [
    plocha(`M${x} ${y - h} h${w} v${h} h${-w} Z`, "#E6D9C2", 0.5),
    obdelnik(x, y - h, w, h, 3.5),
    otevrena
      ? [tah([[x + w, y - h + 4], [x + w + w * 0.45, y - h + 18], [x + w + w * 0.45, y - 14], [x + w, y - 4]], 3), cara(x + 6, y - h / 2, x + w - 6, y - h / 2, 2.4)].join("")
      : [cara(x + w / 2, y - h + 6, x + w / 2, y - 6, 2.4), `<circle cx="${f(x + w / 2 - 8)}" cy="${f(y - h / 2)}" r="2.6" fill="${TUS}"/>`, `<circle cx="${f(x + w / 2 + 8)}" cy="${f(y - h / 2)}" r="2.6" fill="${TUS}"/>`].join(""),
  ].join("");

/** Dřez s kohoutkem */
export const drez = (x: number, y: number) =>
  [obdelnik(x, y - 96, 120, 16, 3.5), tah([[x + 20, y - 96], [x + 26, y - 70], [x + 94, y - 70], [x + 100, y - 96]], 3), tah([[x + 60, y - 96], [x + 60, y - 130], [x + 80, y - 132], [x + 82, y - 120]], 3.5)].join("");

/** Telefon na stativu */
export const stativ = (x: number, y: number) =>
  [
    tah([[x, y - 230], [x - 40, y]], 3),
    tah([[x, y - 230], [x + 40, y]], 3),
    tah([[x, y - 230], [x + 4, y]], 3),
    plocha(`M${x - 24} ${y - 300} h48 v76 h-48 Z`, "#2B2420", 0.85),
    plocha(`M${x - 19} ${y - 293} h38 v58 h-38 Z`, "#CFE0E8", 0.9),
    obdelnik(x - 24, y - 300, 48, 76, 2.4),
  ].join("");

/** Srdíčko */
export const srdce = (x: number, y: number, s = 1, barva = TUS) =>
  `<path d="M${f(x)} ${f(y + 10 * s)} C${f(x - 16 * s)} ${f(y)} ${f(x - 12 * s)} ${f(y - 12 * s)} ${f(x)} ${f(y - 5 * s)} C${f(x + 12 * s)} ${f(y - 12 * s)} ${f(x + 16 * s)} ${f(y)} ${f(x)} ${f(y + 10 * s)} Z" fill="${barva}"/>`;

/** Zásuvka na zdi */
export const zasuvka = (x: number, y: number) =>
  [plocha(`M${x - 20} ${y - 20} h40 v40 h-40 Z`, "#F2EBDD", 0.9), obdelnik(x - 20, y - 20, 40, 40, 2.6), `<circle cx="${f(x - 7)}" cy="${f(y)}" r="3" fill="${TUS}"/>`, `<circle cx="${f(x + 7)}" cy="${f(y)}" r="3" fill="${TUS}"/>`].join("");

/** Jiskra */
export const jiskra = (x: number, y: number, s = 1, barva = "#E8B440") =>
  [0, 1, 2, 3].map((i) => {
    const a = (i * Math.PI) / 2 + 0.3;
    return tah([[x + Math.cos(a) * 4 * s, y + Math.sin(a) * 4 * s], [x + Math.cos(a) * 16 * s, y + Math.sin(a) * 16 * s]], 2.6 * s, { barva, od: 0.9, konec: 0.1 });
  }).join("");

/** Měřák elektřiny se dvěma hroty */
export const merak = (x: number, y: number) =>
  [
    plocha(`M${x} ${y - 70} h46 v70 h-46 Z`, "#E8B440", 0.55),
    obdelnik(x, y - 70, 46, 70, 3),
    plocha(`M${x + 8} ${y - 62} h30 v20 h-30 Z`, "#CFE0E8", 0.9),
    tah([[x + 12, y], [x - 20, y + 30], [x - 60, y + 26]], 2.4, { barva: "#C4432B" }),
    tah([[x + 34, y], [x + 70, y + 26], [x + 110, y + 20]], 2.4),
  ].join("");

/** Páska na podlaze s nápisem — místo pro pec */
export const paskaPec = (x: number, y: number, w: number, h: number) =>
  [
    `<path d="M${x} ${y} L${x + w} ${y} L${x + w + 30} ${y + h} L${x - 30} ${y + h} Z" fill="none" stroke="#D6A23A" stroke-width="7" stroke-dasharray="22 10" stroke-linejoin="round"/>`,
    `<text x="${f(x + w / 2)}" y="${f(y + h / 2 + 10)}" text-anchor="middle" font-size="30" font-weight="700" letter-spacing="6" fill="#C4432B" opacity="0.85" font-family="Fraunces Variable, Fraunces, Georgia, serif">PEC</text>`,
  ].join("");

/** Pytel hlíny */
export const pytel = (x: number, y: number, s = 1) =>
  [
    plocha(`M${x - 44 * s} ${y} C${x - 50 * s} ${y - 40 * s} ${x - 40 * s} ${y - 62 * s} ${x - 30 * s} ${y - 66 * s} L${x + 30 * s} ${y - 66 * s} C${x + 40 * s} ${y - 62 * s} ${x + 50 * s} ${y - 40 * s} ${x + 44 * s} ${y} Z`, "#A9A08E", 0.45),
    tah([[x - 44 * s, y], [x - 50 * s, y - 40 * s], [x - 32 * s, y - 66 * s], [x + 32 * s, y - 66 * s], [x + 50 * s, y - 40 * s], [x + 44 * s, y]], 3.5 * s, { od: 0.5, konec: 0.5 }),
    tah([[x - 44 * s, y], [x, y + 3 * s], [x + 44 * s, y]], 3 * s),
    `<text x="${f(x)}" y="${f(y - 28 * s)}" text-anchor="middle" font-size="${f(15 * s)}" font-weight="700" fill="${TUS}" opacity="0.75" font-family="Fraunces Variable, Fraunces, Georgia, serif">HLÍNA</text>`,
  ].join("");

/** Pec: válec s víkem a ovladačem, z víka jde horko */
export const pec = (x: number, y: number, horko = true) =>
  [
    plocha(`M${x - 60} ${y - 120} h120 v120 h-120 Z`, "#8C949B", 0.4),
    tah([[x - 60, y - 120], [x - 62, y - 60], [x - 60, y]], 4.5),
    tah([[x + 60, y - 120], [x + 62, y - 60], [x + 60, y]], 4.5),
    elipsa(x, y - 122, 62, 14, 4),
    tah([[x - 60, y], [x, y + 6], [x + 60, y]], 4),
    obdelnik(x + 66, y - 92, 26, 48, 2.6),
    `<circle cx="${f(x + 79)}" cy="${f(y - 80)}" r="4" fill="#C4432B"/>`,
    horko ? [0, 1, 2].map((i) => tah([[x - 30 + i * 30, y - 140], [x - 38 + i * 30, y - 170], [x - 24 + i * 30, y - 196], [x - 32 + i * 30, y - 226]], 2.4, { barva: "#C4432B", od: 0.2, konec: 0.1, pruhl: 0.7 })).join("") : "",
  ].join("");

/** Noren ve dveřích */
export const noren = (x: number, y: number, w: number) =>
  [
    tah([[x - 10, y], [x + w + 10, y]], 5),
    plocha(`M${x} ${y + 4} h${w / 2 - 3} v110 h${-(w / 2 - 3)} Z`, "#26336A", 0.85),
    plocha(`M${x + w / 2 + 3} ${y + 4} h${w / 2 - 3} v110 h${-(w / 2 - 3)} Z`, "#26336A", 0.85),
    `<circle cx="${f(x + w / 4)}" cy="${f(y + 52)}" r="16" fill="none" stroke="#F6F1E6" stroke-width="2"/>`,
    `<circle cx="${f(x + (3 * w) / 4)}" cy="${f(y + 52)}" r="16" fill="none" stroke="#F6F1E6" stroke-width="2"/>`,
  ].join("");

/** Postava návštěvníka — pár tahů */
export const clovek = (x: number, y: number, s = 1, barva = TUS) =>
  [
    plocha(`M${x - 16 * s} ${y - 100 * s} C${x - 26 * s} ${y - 70 * s} ${x - 32 * s} ${y - 30 * s} ${x - 34 * s} ${y} L${x + 34 * s} ${y} C${x + 32 * s} ${y - 30 * s} ${x + 26 * s} ${y - 70 * s} ${x + 16 * s} ${y - 100 * s} Z`, barva, 0.22),
    tah([[x - 16 * s, y - 100 * s], [x - 27 * s, y - 60 * s], [x - 34 * s, y]], 3.2 * s, { barva, od: 0.7 }),
    tah([[x + 16 * s, y - 100 * s], [x + 27 * s, y - 60 * s], [x + 34 * s, y]], 3.2 * s, { barva, od: 0.7 }),
    tah([[x - 18 * s, y - 92 * s], [x - 30 * s, y - 62 * s], [x - 22 * s, y - 50 * s]], 2.6 * s, { barva, konec: 0.4 }),
    tah([[x - 36 * s, y + 1], [x + 36 * s, y + 2]], 2.4 * s, { barva, pruhl: 0.8 }),
    `<circle cx="${f(x)}" cy="${f(y - 116 * s)}" r="${f(15 * s)}" fill="${barva}" opacity="0.88"/>`,
  ].join("");

/** Šlápoty */
export const slapoty = (x: number, y: number, pocet = 5, smer = 1) =>
  Array.from({ length: pocet }, (_, i) => {
    const xx = x + i * 46 * smer;
    const yy = y + (i % 2) * 14;
    return `<ellipse cx="${f(xx)}" cy="${f(yy)}" rx="9" ry="5" fill="${TUS}" opacity="0.32" transform="rotate(${-8 * smer} ${f(xx)} ${f(yy)})"/>`;
  }).join("");

/** Kalendářový list s kroužky kolem dnů */
export const kalendar = (x: number, y: number, dny: string[], nadpis: string) =>
  [
    plocha(`M${x} ${y} h120 v140 h-120 Z`, "#FFFDF6", 0.95),
    obdelnik(x, y, 120, 140, 2.6),
    plocha(`M${x} ${y} h120 v22 h-120 Z`, "#C4432B", 0.85),
    `<text x="${f(x + 60)}" y="${f(y + 16)}" text-anchor="middle" font-size="13" font-weight="700" fill="#FFF6E8" font-family="Fraunces Variable, Fraunces, Georgia, serif">${nadpis}</text>`,
    ...dny.map((d, i) => {
      const cx = x + 30 + (i % 2) * 60;
      const cy = y + 54 + Math.floor(i / 2) * 44;
      return `<text x="${f(cx)}" y="${f(cy + 6)}" text-anchor="middle" font-size="17" fill="${TUS}" font-family="Fraunces Variable, Fraunces, Georgia, serif">${d}</text>` + elipsa(cx, cy, 20, 14, 2, { barva: "#C4432B", pruhl: 0.85 });
    }),
  ].join("");

/** Police s nádobami */
export const police = (x: number, y: number, w: number, barvy: string[]) =>
  [
    cara(x, y, x + w, y + 1, 5),
    cara(x, y + 80, x + w, y + 81, 5),
    ...barvy.map((b, i) => {
      const cx = x + 26 + i * ((w - 40) / Math.max(1, barvy.length - 1));
      const yy = i % 2 ? y + 80 : y;
      return i % 3 === 0
        ? `<path d="M${f(cx - 16)} ${f(yy - 2)} C${f(cx - 16)} ${f(yy - 22)} ${f(cx + 16)} ${f(yy - 22)} ${f(cx + 16)} ${f(yy - 2)} Z" fill="${b}"/>` + tah([[cx - 17, yy - 18], [cx + 17, yy - 18]], 2)
        : i % 3 === 1
          ? `<path d="M${f(cx - 10)} ${f(yy - 2)} L${f(cx - 12)} ${f(yy - 30)} L${f(cx + 12)} ${f(yy - 30)} L${f(cx + 10)} ${f(yy - 2)} Z" fill="${b}"/>` + tah([[cx - 12, yy - 30], [cx + 12, yy - 30]], 2)
          : `<path d="M${f(cx - 6)} ${f(yy - 2)} C${f(cx - 16)} ${f(yy - 14)} ${f(cx - 12)} ${f(yy - 34)} ${f(cx - 4)} ${f(yy - 42)} L${f(cx + 4)} ${f(yy - 42)} C${f(cx + 12)} ${f(yy - 34)} ${f(cx + 16)} ${f(yy - 14)} ${f(cx + 6)} ${f(yy - 2)} Z" fill="${b}"/>`;
    }),
  ].join("");

/** Zkušební destičky glazur v řadě */
export const desticky = (x: number, y: number, barvy: string[]) =>
  barvy
    .map((b, i) => {
      const xx = x + i * 30;
      return `<path d="M${f(xx)} ${f(y)} h22 v-38 q-11 -8 -22 0 Z" fill="${b}"/>` + tah([[xx, y], [xx, y - 38], [xx + 11, y - 44], [xx + 22, y - 38], [xx + 22, y]], 1.8);
    })
    .join("");
