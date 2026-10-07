/**
 * Dílna v suterénu — pohled z dvorku skrz velká okna, okna jsou „vyjmutá“.
 * Místnost se kreslí v metrech (prostor.ts) a věci stojí tam, kde stojí
 * na fotkách z images/Dilna a fotoorech:
 *
 *   západní stěna (vlevo)   věšák se zástěrou, dřevěné židle a radiátor,
 *                           černý vozík, linka s dřezem, nad ní skříňka
 *                           s knihami a drátěné police se zelenými kusy
 *   severní stěna (vzadu)   šedé dveře do domu za zídkou s dřevěnou deskou,
 *                           fíkus, linka s kávovarem, skříňka s glazurami,
 *                           knihovnička
 *   východní stěna (vpravo) pilíř, regál z černých lišt a překližky, lampa,
 *                           nerezová pec vrchem nahoru u oken
 *   uprostřed               oválný stůl z kanceláře a modré židle, stůl
 *                           z překližky se svěrkami, u oken dva kopací
 *                           kruhy a elektrický kruh s bílou vaničkou
 *
 * Bílé stěny s pruhem v barvě taupe, šedozelená stěrka na podlaze,
 * antracitové skříňky s dubovou deskou. Dva režimy:
 *
 *   prohlidka  dílna jak je teď, s klikacími místy a partou
 *   rok        totéž v roce 2026 po měsících — věci mají data-od/data-do
 *              a navíc je tu garáž: vrata, kaluž, prasklá trubka, příčka
 *
 * Vrací SVG a místa pro HTML vrstvu nad kresbou (tlačítka, kami, klíče)
 * ve stejných souřadnicích (viewBox 1600 × 1000).
 */
import { B, f, mnohouhelnik, obdelnik, elipsa, nahoda, chomac } from "./zaklad";
import type { Bod } from "./zaklad";
import { prostor, MISTNOST } from "./prostor";
import type { B3 } from "./prostor";
import { nadoba } from "./nadoba";
import { produkty } from "../../../data/obchod";

export type DilnaRezim = "prohlidka" | "rok";

export interface Misto {
  /** Obdélník v kresbě: x0, y0, x1, y1 */
  box: [number, number, number, number];
}
export interface KamiMisto {
  x: number;
  pata: number;
  w: number;
}

export const DILNA_W = 1600;
export const DILNA_H = 1000;

export function dilna(rezim: DilnaRezim = "prohlidka", p = "dl") {
  const rok = rezim === "rok";
  const S = prostor();
  const { P, m, plocha, cesta, cara3, cary3, kvadr, kruznice, stadion, valec, kotouc, body } = S;
  const { x0: X0, x1: X1, hloubka: Z1, strop: Y1, stropU: YU, preklad: ZP } = MISTNOST;
  /** Atributy pro režim „rok“: od kterého měsíce věc v dílně je (a do kterého) */
  const od = (mOd: number, mDo?: number) => (rok ? ` data-od="${mOd}"${mDo ? ` data-do="${mDo}"` : ""}` : "");
  const g = (obsah: string, atributy = "") => `<g${atributy}>${obsah}</g>`;
  const defs: string[] = [];
  const mista: Record<string, Misto> = {};
  const kami: Record<string, KamiMisto> = {};
  /** Obdélník kolem bodů v kresbě — pro klikací místa */
  const boxKolem = (pts: Bod[], okraj = 6): [number, number, number, number] => {
    const xs = pts.map((q) => q[0]);
    const ys = pts.map((q) => q[1]);
    return [Math.min(...xs) - okraj, Math.min(...ys) - okraj, Math.max(...xs) + okraj, Math.max(...ys) + okraj].map((n) => f(n)) as [number, number, number, number];
  };
  const boxKvadru = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, okraj = 6) =>
    boxKolem(body([[x0, y0, z0], [x1, y0, z0], [x0, y1, z0], [x1, y1, z0], [x0, y0, z1], [x1, y0, z1], [x0, y1, z1], [x1, y1, z1]]), okraj);
  /** Kami stojí patou v bodě (x, y, z); šířka v metrech se přepočte hloubkou */
  const postav = (id: string, x: number, y: number, z: number, sirka: number) => {
    const [sx, sy] = P(x, y, z);
    kami[id] = { x: f(sx), pata: f(sy), w: f(sirka * m(z)) };
  };

  /* ——— Přechody ——— */
  defs.push(`
    <linearGradient id="${p}-podlaha" gradientUnits="userSpaceOnUse" x1="0" y1="${f(P(0, 0, 0)[1])}" x2="0" y2="${f(P(0, 0, Z1)[1])}">
      <stop offset="0" stop-color="#CBCFC5"/><stop offset="0.45" stop-color="${B.podlaha}"/><stop offset="1" stop-color="#A6AA9F"/>
    </linearGradient>
    <linearGradient id="${p}-strop" gradientUnits="userSpaceOnUse" x1="0" y1="${f(P(0, YU, 0)[1])}" x2="0" y2="${f(P(0, Y1, Z1)[1])}">
      <stop offset="0" stop-color="#EDEBE5"/><stop offset="1" stop-color="#D8D5CC"/>
    </linearGradient>
    <linearGradient id="${p}-zed-l" gradientUnits="userSpaceOnUse" x1="${f(P(X0, 0, 0)[0])}" y1="0" x2="${f(P(X0, 0, Z1)[0])}" y2="0">
      <stop offset="0" stop-color="#F3F1EB"/><stop offset="1" stop-color="#DEDAD1"/>
    </linearGradient>
    <linearGradient id="${p}-zed-p" gradientUnits="userSpaceOnUse" x1="${f(P(X1, 0, 0)[0])}" y1="0" x2="${f(P(X1, 0, Z1)[0])}" y2="0">
      <stop offset="0" stop-color="#ECE9E2"/><stop offset="1" stop-color="#D9D5CB"/>
    </linearGradient>
    <linearGradient id="${p}-taupe-l" gradientUnits="userSpaceOnUse" x1="${f(P(X0, 0, 0)[0])}" y1="0" x2="${f(P(X0, 0, Z1)[0])}" y2="0">
      <stop offset="0" stop-color="#B49F89"/><stop offset="1" stop-color="#9A8670"/>
    </linearGradient>
    <radialGradient id="${p}-zar" cx="0.5" cy="0.6" r="0.6">
      <stop offset="0" stop-color="#FFF2C0"/><stop offset="0.4" stop-color="#FFB050" stop-opacity="0.85"/><stop offset="1" stop-color="#E0501E" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="${p}-svetlo" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFF6DC" stop-opacity="0.55"/><stop offset="1" stop-color="#FFF6DC" stop-opacity="0"/>
    </linearGradient>
    <pattern id="${p}-pruhy" width="20" height="120" patternUnits="userSpaceOnUse">
      <rect x="0" width="4" height="120" fill="#FFFFFF" opacity="0.2"/><rect x="11" width="2" height="120" fill="#2E2018" opacity="0.18"/>
    </pattern>`);

  /* ════════ Skořepina: podlaha, stěny, strop ════════ */
  const podlaha = plocha([[X0, 0, 0], [X1, 0, 0], [X1, 0, Z1], [X0, 0, Z1]], `fill="url(#${p}-podlaha)"`);
  const zadni = plocha([[X0, 0, Z1], [X1, 0, Z1], [X1, Y1, Z1], [X0, Y1, Z1]], `fill="#ECEAE3"`);
  const levaObrys: B3[] = [[X0, 0, 0], [X0, 0, Z1], [X0, Y1, Z1], [X0, Y1, ZP], [X0, YU, ZP], [X0, YU, 0]];
  const pravaObrys: B3[] = [[X1, 0, 0], [X1, 0, Z1], [X1, Y1, Z1], [X1, Y1, ZP], [X1, YU, ZP], [X1, YU, 0]];
  const leva = plocha(levaObrys, `fill="url(#${p}-zed-l)"`);
  const prava = plocha(pravaObrys, `fill="url(#${p}-zed-p)"`);
  // Hlavní strop napřed, snížený pruh u oken přes něj — schod mezi nimi oko zespodu nevidí
  const strop =
    plocha([[X0, Y1, ZP], [X1, Y1, ZP], [X1, Y1, Z1], [X0, Y1, Z1]], `fill="url(#${p}-strop)"`) +
    plocha([[X0, YU, 0], [X1, YU, 0], [X1, YU, ZP], [X0, YU, ZP]], `fill="#F1EFE9"`) +
    cesta([[X0, YU, ZP], [X1, YU, ZP]], `stroke="#D3CFC6" stroke-width="2"`);
  // Pruh v barvě taupe: po celé západní stěně do 1,5 m, vzadu obdélník za linkou s kávovarem
  const taupe =
    plocha([[X0, 0, 0], [X0, 0, 6.55], [X0, 1.5, 6.55], [X0, 1.5, 0]], `fill="url(#${p}-taupe-l)"`) +
    plocha([[-1.15, 0, Z1], [1.55, 0, Z1], [1.55, 1.55, Z1], [-1.15, 1.55, Z1]], `fill="${B.taupe}"`);
  // Kouty — tenké tmavší čáry, ať se stěny čtou
  const kouty =
    cesta([[X0, 0, Z1], [X0, Y1, Z1]], `stroke="#CFCBC1" stroke-width="2"`) +
    cesta([[X1, 0, Z1], [X1, Y1, Z1]], `stroke="#CFCBC1" stroke-width="2"`) +
    cesta([[X0, 0, 0], [X0, 0, Z1], [X1, 0, Z1], [X1, 0, 0]], `stroke="#9EA297" stroke-width="2" fill="none"`) +
    cesta([[X0, 0.06, 0.2], [X0, 0.06, 6.5]], `stroke="#8A7764" stroke-width="2" fill="none"`);
  // Sluníčko z oken na podlaze a na západní stěně (tři pole oken)
  const okenniSvetlo = rok
    ? ""
    : g(
        [
          [[-2.55, 0.0, 0.4], [-1.05, 0.0, 0.4], [-0.55, 0.0, 2.6], [-2.0, 0.0, 2.6]],
          [[-0.9, 0.0, 0.4], [0.95, 0.0, 0.4], [1.45, 0.0, 2.6], [-0.4, 0.0, 2.6]],
          [[1.1, 0.0, 0.4], [2.6, 0.0, 0.4], [2.7, 0.0, 1.6], [1.6, 0.0, 2.6]],
        ]
          .map((q) => plocha(q as B3[], `fill="#FFF3D2" opacity="0.42"`))
          .join("") + plocha([[X0, 0.9, 1.4], [X0, 0.9, 2.9], [X0, 2.0, 2.4], [X0, 2.0, 1.1]], `fill="#FFF3D2" opacity="0.22"`),
        ` class="dl-slunce"`,
      );
  const stin = (cx: number, cz: number, rx: number, rz: number, sila = 0.16) =>
    `<polygon points="${body(kruznice(cx, 0.002, cz, rx, rz, 28)).map(([x, y]) => `${f(x)},${f(y)}`).join(" ")}" fill="#3A3A30" opacity="${sila}"/>`;
  const stiny = g(
    stin(-0.62, 3.6, 1.25, 0.62) + stin(1.29, 5.15, 0.8, 0.5) + stin(2.12, 0.8, 0.5, 0.45, 0.2) + stin(-1.2, 0.9, 0.48, 0.42) + stin(0.5, 0.95, 0.48, 0.42) + stin(1.18, 2.15, 0.4, 0.34),
    ` class="dl-stiny"`,
  );

  /* ════════ Severní stěna: vstup, fíkus, linka s kávovarem, knihovnička ════════ */
  const vstup = (() => {
    let s = "";
    // tmavá dlažba v závětří a šedé dveře do domu s úzkým matným proskleným pruhem
    s += plocha([[X0, 0.004, 6.62], [-1.35, 0.004, 6.62], [-1.35, 0.004, Z1], [X0, 0.004, Z1]], `fill="${B.dlazbaTmava}"`);
    for (let i = 1; i < 4; i++) s += cara3([X0, 0.006, 6.62 + i * 0.3], [-1.35, 0.006, 6.62 + i * 0.3], "#5A4E43", 0.012);
    s += plocha([[-2.52, 0, Z1], [-1.56, 0, Z1], [-1.56, 2.08, Z1], [-2.52, 2.08, Z1]], `fill="#F4F3EF"`);
    s += plocha([[-2.46, 0, Z1], [-1.62, 0, Z1], [-1.62, 2.02, Z1], [-2.46, 2.02, Z1]], `fill="${B.sedeDvere}"`);
    s += plocha([[-2.06, 0.3, Z1], [-1.92, 0.3, Z1], [-1.92, 1.85, Z1], [-2.06, 1.85, Z1]], `fill="#7E868C"`);
    s += plocha([[-2.05, 0.31, Z1], [-1.99, 0.31, Z1], [-1.99, 1.84, Z1], [-2.05, 1.84, Z1]], `fill="#9AA2A7"`);
    s += cara3([-1.7, 1.02, Z1], [-1.82, 1.02, Z1], "#3A3A3A", 0.03);
    // vypínač a zídka s dubovou deskou, za kterou se přezouvá
    s += plocha([[-1.45, 1.05, Z1], [-1.37, 1.05, Z1], [-1.37, 1.15, Z1], [-1.45, 1.15, Z1]], `fill="#2E2E2E"`);
    s += kvadr(X0, -1.78, 0, 1.04, 6.5, 6.66, { celo: B.taupe, bok: B.taupeStin });
    s += kvadr(X0, -1.74, 1.04, 1.1, 6.47, 6.68, { celo: "#C17A3E", vrch: "#D99A58", bok: "#A9682F" });
    return g(s, ` class="dl-vstup"`);
  })();

  const fikus = (() => {
    const [px, py] = P(-1.12, 0, 7.42);
    const s = m(7.42);
    let t = valec(-1.12, 7.42, 0.17, 0, 0.36, ["#D9D4CA", "#F4F1EA", "#CFCAC0"], "#3A2E28", `${p}-kvetinac-fik`);
    t += `<path d="M${f(px)} ${f(py - 0.36 * s)} C${f(px - 4)} ${f(py - 0.9 * s)} ${f(px + 6)} ${f(py - 1.3 * s)} ${f(px + 2)} ${f(py - 1.62 * s)}" stroke="#5E4A38" stroke-width="${f(0.03 * s)}" fill="none"/>`;
    const r = nahoda(707);
    for (let i = 0; i < 14; i++) {
      const v = 0.45 + (i / 14) * 1.2;
      const strana = i % 2 ? 1 : -1;
      const lx = px + strana * (0.08 + r() * 0.12) * s;
      const ly = py - v * s;
      t += elipsa(lx, ly, 0.11 * s, 0.07 * s, `fill="${i % 3 ? "#3F6B34" : "#5A8A44"}" transform="rotate(${f(strana * (20 + r() * 40))} ${f(lx)} ${f(ly)})"`);
    }
    return g(t, ` class="dl-fikus"${od(6)}`);
  })();

  const linkaA = (() => {
    let s = "";
    const zA = 7.2;
    // spodní skříňky: čtyři dvířka, černé úchytky, sokl
    s += kvadr(-1.0, 1.4, 0, 0.08, zA + 0.05, Z1, { celo: B.antracitTma });
    s += kvadr(-1.0, 1.4, 0.08, 0.88, zA, Z1, { celo: B.antracit, bok: B.antracitTma });
    for (const x of [-0.4, 0.2, 0.8]) s += cara3([x, 0.1, zA], [x, 0.86, zA], "#33373A", 0.012);
    for (const x of [-0.85, -0.25, 0.35, 0.95]) s += cara3([x, 0.76, zA], [x + 0.2, 0.76, zA], "#141414", 0.022);
    s += kvadr(-1.02, 1.42, 0.88, 0.92, zA - 0.03, Z1, { celo: B.dubTma, vrch: B.dub });
    // na desce: kbelík, kávovar, dóza, krabička s nářadím a keramická kočka
    s += valec(-0.66, 7.55, 0.13, 0.92, 1.12, ["#D8D4CB", "#FBF9F4", "#D2CEC4"], "#EDEAE3", `${p}-kbelik-a`);
    s += `<g class="dl-kavovar">`;
    s += kvadr(-0.02, 0.24, 0.92, 1.33, 7.42, 7.72, { celo: "#232323", bok: "#151515", vrch: "#2E2E2E" });
    s += plocha([[0.01, 1.24, 7.42], [0.21, 1.24, 7.42], [0.21, 1.3, 7.42], [0.01, 1.3, 7.42]], `fill="#3E3E3E"`);
    s += plocha([[0.05, 1.26, 7.419], [0.1, 1.26, 7.419], [0.1, 1.28, 7.419], [0.05, 1.28, 7.419]], `fill="#7CFFA0" opacity="0.9"`);
    s += plocha([[0.05, 1.05, 7.42], [0.19, 1.05, 7.42], [0.19, 1.15, 7.42], [0.05, 1.15, 7.42]], `fill="#111"`);
    s += valec(0.12, 7.47, 0.035, 0.94, 1.0, ["#5E7C68", "#93B39B", "#5E7C68"], "#2B2420", `${p}-salek`);
    const [kx, ky] = P(0.12, 1.05, 7.42);
    s += `<g class="dl-para" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"><path d="M${f(kx - 5)} ${f(ky)} c-4 -8 4 -12 0 -20"/><path d="M${f(kx + 2)} ${f(ky - 2)} c-4 -9 4 -13 0 -22"/><path d="M${f(kx + 9)} ${f(ky)} c-4 -8 4 -12 0 -20"/></g>`;
    s += `</g>`;
    s += valec(0.43, 7.6, 0.07, 0.92, 1.14, ["#1E1E1E", "#3A3A3A", "#1A1A1A"], "#2A2A2A", `${p}-doza`);
    s += kvadr(0.62, 0.98, 0.92, 1.04, 7.45, 7.75, { celo: "#6E4B32", vrch: "#8A6040" });
    s += kvadr(1.02, 1.2, 0.92, 1.02, 7.48, 7.7, { celo: "#BFD9EA", vrch: "#E9F3F8" });
    const [cx2, cy2] = P(0.8, 1.04, 7.55);
    s += `<g transform="translate(${f(cx2)} ${f(cy2)}) scale(${f(m(7.55) / 120)})"><path d="M-9 0 C-10 -8 -8 -14 -6 -16 L-7 -21 L-3 -17 L3 -17 L7 -21 L6 -16 C8 -14 10 -8 9 0 Z" fill="#B9A38C"/><circle cx="-3" cy="-11" r="1" fill="#3A2E28"/><circle cx="3" cy="-11" r="1" fill="#3A2E28"/></g>`;
    // horní skříňka s glazurami: dvě dvířka, uprostřed otevřené police s lahvičkami
    s += kvadr(-0.4, 1.2, 1.55, 2.13, 7.45, Z1, { celo: B.antracit, spodek: B.antracitTma });
    s += plocha([[0.12, 1.57, 7.45], [0.64, 1.57, 7.45], [0.64, 2.11, 7.45], [0.12, 2.11, 7.45]], `fill="#1F2224"`);
    for (const y of [1.74, 1.92]) s += cara3([0.12, y, 7.47], [0.64, y, 7.47], "#9FB8C4", 0.012, `opacity="0.8"`);
    const lahve = ["#5B7FD1", "#C4432B", "#E8B440", "#6E9A4B", "#B07AA8", "#3FA7A0", "#E07A3E", "#5B7FD1", "#C4432B", "#6E9A4B"];
    let lahvicky = "";
    lahve.forEach((barva, i) => {
      const rada = i < 5 ? 1.58 : 1.76;
      const x = 0.16 + (i % 5) * 0.095;
      lahvicky += kvadr(x, x + 0.06, rada, rada + 0.13, 7.5, 7.56, { celo: "#F6F4EE" });
      lahvicky += kvadr(x, x + 0.06, rada + 0.03, rada + 0.08, 7.49, 7.5, { celo: barva });
      lahvicky += kvadr(x + 0.015, x + 0.045, rada + 0.13, rada + 0.155, 7.51, 7.55, { celo: "#2B2B2B" });
    });
    s += g(lahvicky, ` class="dl-glazury"${od(8)}`);
    s += cara3([-0.12, 1.66, 7.45], [0.08, 1.66, 7.45], "#141414", 0.022);
    s += cara3([0.7, 1.66, 7.45], [0.95, 1.66, 7.45], "#141414", 0.022);
    s += kvadr(-0.42, 1.22, 2.13, 2.16, 7.43, Z1, { celo: B.dubTma, spodek: B.dub });
    // nahoře na skříňce řada kusů: zelené, terakotové, bílé
    const nahore: [string, string, number][] = [["bowl", "Celadon", -0.3], ["vase", "Celadon", -0.08], ["bowl", "Železitá hnědá", 0.15], ["mug", "Shino", 0.36], ["bowl", "Železitá hnědá", 0.58], ["bowl", "Celadon", 0.84], ["mug", "Popelová šedá", 1.06]];
    for (const [tvar, gl, x] of nahore) {
      const [nx, ny] = P(x, 2.16, 7.6);
      s += nadoba(tvar as "bowl", nx, ny, (m(7.6) / 52) * (tvar === "vase" ? 0.16 : 0.2), gl);
    }
    // drátěné police vlevo a lišta s kelímky na nářadí
    for (const y of [1.33, 1.68]) {
      s += kvadr(-1.0, -0.5, y, y + 0.012, 7.55, Z1, { celo: "#2F3532", vrch: "#3E4541" });
      for (let i = 0; i <= 8; i++) s += cara3([-1.0 + i * 0.0625, y, 7.55], [-1.0 + i * 0.0625, y + 0.12, 7.55], "#2F3532", 0.006);
      s += cara3([-1.0, y + 0.12, 7.55], [-0.5, y + 0.12, 7.55], "#2F3532", 0.008);
    }
    for (const [tvar, gl, x, y] of [["mug", "Celadon", -0.9, 1.342], ["bowl", "Shino", -0.66, 1.342], ["vase", "Celadon", -0.85, 1.692], ["mug", "Matná bílá", -0.6, 1.692]] as [string, string, number, number][]) {
      const [nx, ny] = P(x, y, 7.66);
      s += nadoba(tvar as "bowl", nx, ny, (m(7.66) / 52) * (tvar === "vase" ? 0.16 : 0.2), gl);
    }
    s += cara3([-1.02, 1.18, 7.7], [-0.3, 1.18, 7.7], "#161616", 0.018);
    for (const x of [-0.86, -0.56]) {
      s += cara3([x, 1.18, 7.7], [x, 1.1, 7.68], "#161616", 0.008);
      s += valec(x, 7.67, 0.06, 0.96, 1.1, ["#151515", "#2E2E2E", "#151515"], "#0E0E0E", `${p}-kelimek-a${x}`);
      s += cara3([x - 0.02, 1.08, 7.67], [x - 0.05, 1.2, 7.67], "#B98A54", 0.01) + cara3([x + 0.02, 1.08, 7.67], [x + 0.04, 1.22, 7.67], "#D8C29A", 0.01);
    }
    return g(s, ` class="dl-linka-a"${od(5)}`);
  })();

  const knihovnicka = (() => {
    let s = kvadr(1.45, 1.86, 0, 1.36, 7.5, Z1, { celo: "#5A3F28", vrch: B.dub, bok: "#7A5A3C" });
    const police = [0.06, 0.38, 0.7, 1.02];
    const r = nahoda(4242);
    const barvy = ["#C4432B", "#E8B440", "#3F7FB8", "#2E2E2E", "#6E9A4B", "#F2EEE4", "#B07AA8", "#E07A3E", "#5C8BA8", "#D9C9A5"];
    for (const y0 of police) {
      s += kvadr(1.47, 1.84, y0, y0 + 0.02, 7.5, 7.52, { celo: B.dub });
      let x = 1.49;
      while (x < 1.8) {
        const w = 0.025 + r() * 0.025;
        const h = 0.2 + r() * 0.08;
        s += plocha([[x, y0 + 0.02, 7.51], [x + w, y0 + 0.02, 7.51], [x + w, y0 + 0.02 + h, 7.51], [x, y0 + 0.02 + h, 7.51]], `fill="${barvy[Math.floor(r() * barvy.length)]}"`);
        x += w + 0.004;
      }
    }
    s += kvadr(1.47, 1.84, 1.36, 1.44, 7.5, 7.78, { celo: "#F2EEE4", vrch: "#E8D9B8" });
    s += kvadr(1.49, 1.8, 1.44, 1.47, 7.52, 7.76, { celo: "#E07A3E", vrch: "#F3D27A" });
    return g(s, ` class="dl-knihovna"${od(6)}`);
  })();

  /* ════════ Východní stěna: pilíř, regál, lampa ════════ */
  const pilir = kvadr(2.3, X1, 0, Y1, 7.0, Z1, { celo: "#E6E3DB", bok: "#F1EFE9" });

  // Regál: lišty po 0,75 m, prkna z překližky v různých výškách (podle fotky 6677)
  const LISTY = [1.55, 2.3, 3.05, 3.8, 4.55, 5.3, 6.05, 6.8];
  const PRKNA: [number, number, number][] = [
    [1.55, 2.3, 2.28], [1.55, 2.3, 1.58], [1.55, 3.05, 1.0],
    [2.3, 3.05, 2.05], [2.3, 3.05, 0.22], [3.05, 4.55, 2.3], [3.05, 4.55, 1.72], [3.05, 3.8, 1.05], [3.8, 4.55, 0.48],
    [4.55, 5.3, 1.95], [4.55, 6.05, 1.38], [4.55, 5.3, 0.75], [5.3, 6.05, 2.22], [5.3, 6.05, 0.3],
    [6.05, 6.8, 1.92], [6.05, 6.8, 1.18], [6.05, 6.8, 0.55],
  ];
  const regal = (() => {
    let s = "";
    for (const z of LISTY) {
      s += plocha([[X1 - 0.005, 0.12, z - 0.018], [X1 - 0.005, 0.12, z + 0.018], [X1 - 0.005, 2.36, z + 0.018], [X1 - 0.005, 2.36, z - 0.018]], `fill="#262626"`);
    }
    const r = nahoda(9090);
    const prkna = [...PRKNA].sort((a, b) => b[2] - a[2]);
    for (const [z0, z1, y] of prkna) {
      for (const z of LISTY.filter((q) => q >= z0 && q <= z1)) s += plocha([[X1, y - 0.003, z - 0.01], [X1 - 0.25, y - 0.003, z - 0.01], [X1 - 0.24, y - 0.03, z - 0.01], [X1 - 0.03, y - 0.1, z - 0.01], [X1, y - 0.1, z - 0.01]], `fill="#1E1E1E"`);
      s += kvadr(X1 - 0.29, X1 - 0.005, y, y + 0.024, z0 - 0.08, z1 + 0.08, { celo: B.preklizkaTma, bok: "#C3A472", vrch: B.preklizka, spodek: "#B5935E" });
    }
    // Na prknech schnou kusy — syrové a přežahnuté, sem tam glazovaný
    const kusy: [number, number, string, string][] = [];
    for (const [z0, z1, y] of PRKNA) {
      if (y > 2.1) continue;
      let z = z0 + 0.12;
      while (z < z1 - 0.1) {
        if (r() < 0.62) {
          const t = r();
          kusy.push([z, y + 0.024, t < 0.4 ? "bowl" : t < 0.75 ? "mug" : "vase", r() < 0.55 ? "syrová" : r() < 0.7 ? "přežah" : ["Celadon", "Shino", "Tenmoku"][Math.floor(r() * 3)]]);
        }
        z += 0.16 + r() * 0.16;
      }
    }
    kusy.sort((a, b) => b[0] - a[0]);
    let naRegale = "";
    for (const [z, y, tvar, gl] of kusy) {
      const [nx, ny] = P(X1 - 0.14, y, z);
      naRegale += nadoba(tvar as "bowl", nx, ny, (m(z) / 52) * (tvar === "vase" ? 0.13 : tvar === "mug" ? 0.16 : 0.17), gl);
    }
    s += g(naRegale, od(8));
    // šedá přepravka na spodním prkně, kbelík a pytel pod regálem, prodlužovačka
    s += kvadr(X1 - 0.28, X1 - 0.02, 0.48, 0.74, 3.92, 4.42, { celo: "#7D868A", bok: "#6A7276", vrch: "#959EA2" });
    for (let i = 1; i < 4; i++) s += cara3([X1 - 0.28, 0.48 + i * 0.065, 3.92], [X1 - 0.02, 0.48 + i * 0.065, 3.92], "#646C70", 0.008);
    s += valec(X1 - 0.24, 1.98, 0.15, 0, 0.32, ["#D6D2C8", "#FAF8F2", "#CFCBC1"], "#EDEAE3", `${p}-kbelik-r`);
    s += `<path d="${chomac(...P(X1 - 0.25, 0.18, 2.62), 0.24 * m(2.62), 0.16 * m(2.62), 12, 3131, 0.8, 0.6)}" fill="#1E1E1E"/>`;
    s += cesta([[X1 - 0.02, 0.01, 3.2], [2.2, 0.01, 3.3], [1.6, 0.01, 3.9], [1.3, 0.01, 4.6], [1.5, 0.01, 5.1]], `stroke="#E2702E" stroke-width="${f(0.018 * m(4))}" fill="none" stroke-linecap="round"`);
    s += kvadr(1.42, 1.62, 0.0, 0.035, 5.08, 5.15, { celo: "#F4F3EE", vrch: "#FFFFFF" });
    return g(s, ` class="dl-regal"${od(5)}`);
  })();

  // Pytle s hlínou u konce regálu — na nich spí Hlínka
  const pytle = (() => {
    let s = "";
    for (const [z, x, h] of [[6.55, 2.32, 0.34], [6.3, 2.0, 0.3]] as [number, number, number][]) {
      const [sx, sy] = P(x, 0, z);
      const w = 0.42 * m(z);
      const v = h * m(z);
      s += `<path d="M${f(sx - w / 2)} ${f(sy)} L${f(sx - w / 2 + 2)} ${f(sy - v * 0.82)} C${f(sx - w / 2 + 4)} ${f(sy - v * 1.02)} ${f(sx + w / 2 - 4)} ${f(sy - v * 1.02)} ${f(sx + w / 2 - 2)} ${f(sy - v * 0.82)} L${f(sx + w / 2)} ${f(sy)} Z" fill="#F2F0EA" stroke="#B9B4A8" stroke-width="1"/>`;
      s += obdelnik(sx - w * 0.36, sy - v * 0.55, w * 0.72, v * 0.22, `fill="#3A63A8"`);
      s += `<path d="M${f(sx - w * 0.3)} ${f(sy - v * 0.44)} H${f(sx + w * 0.2)}" stroke="#F2F0EA" stroke-width="${f(v * 0.05)}"/>`;
    }
    return g(s, ` class="dl-pytle"${od(8)}`);
  })();

  const lampa = (() => {
    let s = "";
    s += valec(2.08, 5.95, 0.15, 0, 0.03, ["#8D959B", "#E2E7EA", "#8D959B"], "#C7CDD1", `${p}-lampa-noha`);
    s += cara3([2.08, 0.03, 5.95], [2.08, 1.62, 5.95], "#AEB6BB", 0.025);
    s += cara3([2.08, 1.62, 5.95], [1.92, 1.74, 5.86], "#AEB6BB", 0.02);
    const [lx, ly] = P(1.86, 1.68, 5.84);
    const sl = m(5.84);
    s += `<path class="dl-lampa-stinidlo" d="M${f(lx - 0.13 * sl)} ${f(ly + 0.06 * sl)} C${f(lx - 0.12 * sl)} ${f(ly - 0.07 * sl)} ${f(lx + 0.12 * sl)} ${f(ly - 0.07 * sl)} ${f(lx + 0.13 * sl)} ${f(ly + 0.06 * sl)} Z" fill="#B9C1C6"/>`;
    s += elipsa(lx, ly + 0.06 * sl, 0.13 * sl, 0.025 * sl, `class="dl-lampa-svetlo" fill="#F4F1E6"`);
    s += `<path class="dl-lampa-kuzel" d="M${f(lx - 0.13 * sl)} ${f(ly + 0.07 * sl)} L${f(lx - 0.5 * sl)} ${f(ly + 1.6 * sl)} L${f(lx + 0.4 * sl)} ${f(ly + 1.6 * sl)} L${f(lx + 0.13 * sl)} ${f(ly + 0.07 * sl)} Z" fill="#FFF1C8" opacity="0"/>`;
    return g(s, ` class="dl-lampa"${od(6)}`);
  })();

  /* ════════ Západní stěna: linka s dřezem, vozík, židle, věšák ════════ */
  const linkaB = (() => {
    let s = "";
    const xF = -2.1;
    // vozík a úzká police
    const vozik = (z0: number, z1: number) => {
      let t = "";
      for (const y of [0.12, 0.45, 0.8]) t += kvadr(-2.66, -2.3, y, y + 0.03, z0, z1, { celo: "#1E1E1E", vrch: "#2B2B2B", bok: "#181818" });
      for (const [x, z] of [[-2.3, z0], [-2.3, z1]] as [number, number][]) t += cara3([x, 0.06, z], [x, 0.83, z], "#1A1A1A", 0.018);
      for (const z of [z0, z1]) t += elipsa(...P(-2.32, 0.03, z), 0.035 * m(z), 0.02 * m(z), `fill="#111"`);
      return t;
    };
    // úzká černá police za linkou — je dál než linka, kreslí se první
    s += kvadr(X0, -2.34, 0, 0.96, 3.96, 4.22, { celo: "#1E1E1E", bok: "#262626", vrch: "#2E2E2E" });
    for (const y of [0.3, 0.62]) s += cara3([-2.34, y, 3.96], [-2.34, y, 4.22], "#3A3A3A", 0.012);
    // spodní skříňky: lícem do místnosti (stěna x = −2,1)
    s += kvadr(X0, xF, 0, 0.08, 1.8, 3.9, { celo: B.antracitTma, bok: B.antracitTma });
    s += kvadr(X0, xF, 0.08, 0.88, 1.8, 3.9, { celo: B.antracitTma, bok: B.antracit });
    for (const z of [2.4, 3.0]) s += cara3([xF, 0.1, z], [xF, 0.86, z], "#2E3235", 0.012);
    for (const y of [0.62, 0.36]) s += cara3([xF, y, 3.0], [xF, y, 3.9], "#2E3235", 0.012);
    for (const [z, y] of [[2.08, 0.76], [2.62, 0.76], [3.32, 0.78], [3.32, 0.52], [3.32, 0.26]] as [number, number][]) s += cara3([xF, y, z], [xF, y, z + 0.24], "#141414", 0.024);
    s += kvadr(-2.72, -2.08, 0.88, 0.92, 1.78, 3.92, { celo: B.dubTma, bok: B.dubTma, vrch: B.dub });
    // dřez a výsuvná baterie
    s += plocha([[-2.58, 0.921, 2.12], [-2.22, 0.921, 2.12], [-2.22, 0.921, 2.62], [-2.58, 0.921, 2.62]], `fill="#8D959B"`);
    s += plocha([[-2.55, 0.922, 2.15], [-2.25, 0.922, 2.15], [-2.25, 0.922, 2.59], [-2.55, 0.922, 2.59]], `fill="#5E666C"`);
    s += cesta([[-2.64, 0.92, 2.38], [-2.64, 1.32, 2.38], [-2.56, 1.4, 2.38], [-2.44, 1.33, 2.38], [-2.42, 1.16, 2.38]], `stroke="#C9CFD3" stroke-width="${f(0.03 * m(2.38))}" fill="none" stroke-linecap="round" stroke-linejoin="round"`);
    s += cesta([[-2.42, 1.16, 2.38], [-2.42, 1.08, 2.38]], `stroke="#E9EDF0" stroke-width="${f(0.034 * m(2.38))}" fill="none" stroke-linecap="round"`);
    s += `<g class="dl-voda" opacity="0">${cesta([[-2.42, 1.07, 2.38], [-2.42, 0.93, 2.38]], `stroke="#9FD0E8" stroke-width="${f(0.016 * m(2.38))}" stroke-dasharray="3 3" fill="none"`)}</g>`;
    // na desce: kbelíky, houbičky, točna, rozprašovač, sešit
    s += valec(-2.4, 2.86, 0.13, 0.92, 1.12, ["#D6D2C8", "#FBF9F4", "#CFCBC1"], "#F2EFE8", `${p}-kbelik-b1`);
    s += valec(-2.38, 3.3, 0.11, 0.92, 1.07, ["#D6D2C8", "#FBF9F4", "#CFCBC1"], "#F2EFE8", `${p}-kbelik-b2`);
    s += kvadr(-2.55, -2.35, 0.92, 0.97, 1.9, 2.02, { celo: "#E8B440", vrch: "#F3D27A", bok: "#C9962F" });
    s += kvadr(-2.32, -2.22, 0.92, 0.95, 2.0, 2.06, { celo: "#E8D23A", vrch: "#7FA34A" });
    s += plocha([[-2.62, 0.921, 3.5], [-2.2, 0.921, 3.5], [-2.2, 0.921, 3.88], [-2.62, 0.921, 3.88]], `fill="#3E6B48"`);
    s += valec(-2.4, 3.66, 0.11, 0.95, 0.98, ["#9AA0A4", "#E7EBED", "#9AA0A4"], "#D7DCDF", `${p}-tocna-b`);
    s += cara3([-2.4, 0.92, 3.66], [-2.4, 0.95, 3.66], "#8D959B", 0.03);
    s += valec(-2.55, 3.3, 0.035, 0.92, 1.18, ["#8E1F16", "#D9452E", "#8E1F16"], "#2B2B2B", `${p}-rozpr`);
    s += kvadr(-2.66, -2.5, 0.92, 0.94, 3.72, 3.88, { celo: "#1E1E1E", vrch: "#2B2B2B" });
    // horní skříňka s knihami a otevřeným středem
    s += kvadr(X0, -2.36, 1.55, 2.1, 1.8, 3.0, { celo: B.antracitTma, bok: B.antracit, spodek: B.antracitTma });
    s += plocha([[-2.36, 1.57, 2.22], [-2.36, 1.57, 2.58], [-2.36, 2.08, 2.58], [-2.36, 2.08, 2.22]], `fill="#1F2224"`);
    const kn = nahoda(5150);
    for (const y of [1.6, 1.82]) {
      let z = 2.24;
      while (z < 2.56) {
        const w = 0.02 + kn() * 0.02;
        s += plocha([[-2.37, y, z], [-2.37, y, z + w], [-2.37, y + 0.16 + kn() * 0.03, z + w], [-2.37, y + 0.16, z]], `fill="${["#C4432B", "#F2EEE4", "#2E2E2E", "#E8B440", "#5C8BA8"][Math.floor(kn() * 5)]}"`);
        z += w + 0.004;
      }
    }
    s += cara3([-2.36, 1.66, 1.92], [-2.36, 1.66, 2.12], "#141414", 0.022);
    s += cara3([-2.36, 1.66, 2.68], [-2.36, 1.66, 2.88], "#141414", 0.022);
    for (const [tvar, gl, z] of [["bowl", "Celadon", 1.9], ["bowl", "Celadon", 2.14], ["mug", "Celadon", 2.42], ["bowl", "Železitá hnědá", 2.66], ["bowl", "Celadon", 2.9]] as [string, string, number][]) {
      const [nx, ny] = P(-2.55, 2.1, z);
      s += nadoba(tvar as "bowl", nx, ny, (m(z) / 52) * 0.2, gl);
    }
    // lampička na husím krku přicvaknutá ke skříňce
    s += cesta([[-2.36, 1.75, 1.8], [-2.3, 1.82, 1.72], [-2.26, 1.86, 1.66]], `stroke="#1E1E1E" stroke-width="${f(0.012 * m(1.7))}" fill="none"`);
    s += elipsa(...P(-2.25, 1.86, 1.64), 0.03 * m(1.64), 0.015 * m(1.64), `fill="#1E1E1E"`);
    // drátěné police do kříže a lišta s kelímky
    for (const [y, z0, z1] of [[1.62, 3.1, 3.5], [1.86, 3.45, 3.9]] as [number, number, number][]) {
      s += kvadr(X0, -2.42, y, y + 0.012, z0, z1, { bok: "#2F3532", vrch: "#3E4541" });
      for (let i = 0; i <= 6; i++) s += cara3([-2.42, y, z0 + ((z1 - z0) * i) / 6], [-2.42, y + 0.11, z0 + ((z1 - z0) * i) / 6], "#2F3532", 0.006);
      s += cara3([-2.42, y + 0.11, z0], [-2.42, y + 0.11, z1], "#2F3532", 0.008);
    }
    for (const [tvar, gl, z, y] of [["mug", "Celadon", 3.2, 1.632], ["mug", "Celadon", 3.36, 1.632], ["vase", "Železitá hnědá", 3.56, 1.872], ["mug", "Shino", 3.74, 1.872]] as [string, string, number, number][]) {
      const [nx, ny] = P(-2.56, y, z);
      s += nadoba(tvar as "bowl", nx, ny, (m(z) / 52) * (tvar === "vase" ? 0.15 : 0.2), gl);
    }
    s += cara3([X0, 1.26, 3.05], [X0 + 0.04, 1.26, 3.95], "#161616", 0.016);
    for (const z of [3.35, 3.62]) {
      s += valec(-2.6, z, 0.065, 1.02, 1.18, ["#151515", "#2E2E2E", "#151515"], "#0E0E0E", `${p}-kelimek-b${z}`);
      s += cara3([-2.6, 1.17, z], [-2.62, 1.32, z - 0.02], "#B98A54", 0.01) + cara3([-2.6, 1.17, z], [-2.58, 1.3, z + 0.03], "#E8D8B0", 0.012);
    }
    s += kvadr(-2.66, -2.5, 1.04, 1.2, 3.84, 3.94, { celo: "#E9F2F6", bok: "#F6FAFC" });
    // vozík stojí před linkou blíž k oknům
    s += vozik(1.32, 1.72);
    return g(s, ` class="dl-linka-b"${od(5)}`);
  })();

  const radiator = (() => {
    let s = plocha([[X0 + 0.01, 0.16, 0.32], [X0 + 0.01, 0.16, 1.3], [X0 + 0.01, 0.78, 1.3], [X0 + 0.01, 0.78, 0.32]], `fill="#F3F2EE"`);
    for (let i = 1; i < 12; i++) s += cara3([X0 + 0.012, 0.18, 0.32 + i * 0.082], [X0 + 0.012, 0.76, 0.32 + i * 0.082], "#D8D6CF", 0.01);
    return s;
  })();
  const radiatorZidle = (() => {
    let s = "";
    // dvě dřevěné židle s šedým čalouněním, opěradly ke zdi
    const zidle = (z: number) => {
      let t = "";
      t += cara3([-2.58, 0, z - 0.2], [-2.58, 0.46, z - 0.2], "#7A4A2A", 0.03) + cara3([-2.58, 0, z + 0.2], [-2.58, 0.46, z + 0.2], "#7A4A2A", 0.03);
      t += cara3([-2.2, 0, z - 0.2], [-2.18, 0.44, z - 0.2], "#8A5A34", 0.03) + cara3([-2.2, 0, z + 0.2], [-2.18, 0.44, z + 0.2], "#8A5A34", 0.03);
      t += kvadr(-2.6, -2.16, 0.42, 0.48, z - 0.22, z + 0.22, { celo: "#7A4A2A", bok: "#8A5A34", vrch: "#B9B6B0" });
      t += kvadr(-2.64, -2.58, 0.48, 0.92, z - 0.22, z + 0.22, { celo: "#6E4026", bok: "#8A5A34", vrch: "#9C6A40" });
      t += kvadr(-2.58, -2.56, 0.56, 0.88, z - 0.2, z + 0.2, { bok: "#A9A6A0" });
      return t;
    };
    s += zidle(1.02) + zidle(0.55);
    // věšák u oken a černá zástěra
    s += cara3([X0 + 0.01, 1.78, 0.12], [X0 + 0.01, 1.78, 0.5], "#1A1A1A", 0.03);
    for (const z of [0.18, 0.31, 0.44]) s += cara3([X0 + 0.01, 1.78, z], [X0 + 0.07, 1.72, z], "#1A1A1A", 0.014);
    s += plocha([[X0 + 0.04, 1.72, 0.22], [X0 + 0.04, 1.72, 0.4], [X0 + 0.05, 1.45, 0.44], [X0 + 0.05, 0.95, 0.46], [X0 + 0.05, 0.92, 0.16], [X0 + 0.05, 1.45, 0.18]], `fill="#2A2A2E"`);
    s += cara3([X0 + 0.05, 1.5, 0.2], [X0 + 0.05, 1.5, 0.42], "#4A4A50", 0.01);
    return g(s, ` class="dl-zapad"${od(9)}`);
  })();

  /* ════════ Pec: nerezová, plní se shora ════════ */
  const PEC = { x: 2.12, z: 0.8, r: 0.37, dole: 0.42, nahore: 1.12 };
  const pec = (() => {
    let s = "";
    // bílý zahnutý štít za pecí a kabel do zdi
    s += plocha([[X1 - 0.02, 0, 0.18], [X1 - 0.02, 0, 1.42], [X1 - 0.02, 1.62, 1.42], [X1 - 0.02, 1.7, 0.8], [X1 - 0.02, 1.62, 0.18]], `fill="#F7F6F2"`);
    s += cesta([[X1 - 0.02, 0.5, 1.3], [2.5, 0.02, 1.36], [1.9, 0.01, 1.5]], `stroke="#2B2B2B" stroke-width="${f(0.015 * m(1.4))}" fill="none"`);
    // stojan
    for (const [dx, dz] of [[-0.26, -0.26], [0.26, -0.26], [-0.26, 0.26], [0.26, 0.26]] as [number, number][]) {
      s += cara3([PEC.x + dx, 0, PEC.z + dz], [PEC.x + dx, PEC.dole, PEC.z + dz], "#1E1E1E", 0.035);
    }
    s += valec(PEC.x, PEC.z, PEC.r * 0.92, PEC.dole - 0.04, PEC.dole, "#1E1E1E");
    // plášť s pruhy a sponami
    s += valec(PEC.x, PEC.z, PEC.r, PEC.dole, PEC.nahore, ["#7E868C", "#C7CDD1", "#F2F5F7", "#B4BBC0", "#9AA2A8", "#6A7278"], undefined, `${p}-pec-plast`);
    for (const y of [0.62, 0.93]) {
      const pas = body(kruznice(PEC.x, y, PEC.z, PEC.r + 0.006).filter((q) => q[2] <= PEC.z + 0.02));
      s += `<polyline points="${pas.map(([x, yy]) => `${f(x)},${f(yy)}`).join(" ")}" fill="none" stroke="#7B8389" stroke-width="${f(0.022 * m(PEC.z))}"/>`;
    }
    for (const dx of [-0.24, 0.24]) s += kvadr(PEC.x + dx - 0.03, PEC.x + dx + 0.03, 1.02, 1.09, PEC.z - PEC.r * 0.75, PEC.z - PEC.r * 0.7, { celo: "#2B2B2B" });
    // regulátor na boku
    s += kvadr(1.6, 1.74, 0.72, 1.0, 0.66, 0.72, { celo: "#D9DDE0", bok: "#B9BEC2" });
    s += plocha([[1.62, 0.92, 0.66], [1.72, 0.92, 0.66], [1.72, 0.97, 0.66], [1.62, 0.97, 0.66]], `fill="#1E2A22"`);
    const [dx2, dy2] = P(1.67, 0.925, 0.66);
    s += `<text class="dl-pec-displej" x="${f(dx2)}" y="${f(dy2 - 1)}" text-anchor="middle" font-size="${f(0.045 * m(0.66))}" fill="#7CFFA0" font-family="ui-monospace, Consolas, monospace">20</text>`;
    s += elipsa(...P(1.645, 0.82, 0.66), 0.012 * m(0.66), 0.012 * m(0.66), `fill="#C4432B"`);
    s += elipsa(...P(1.695, 0.82, 0.66), 0.012 * m(0.66), 0.012 * m(0.66), `fill="#5C5047"`);
    s += cesta([[1.74, 0.85, 0.7], [PEC.x - PEC.r, 0.85, PEC.z]], `stroke="#2B2B2B" stroke-width="${f(0.012 * m(0.7))}" fill="none"`);
    // vnitřek (jen otevřená) — tmavý otvor, desky a kusy
    const otvor = body(kruznice(PEC.x, PEC.nahore, PEC.z, PEC.r * 0.84));
    s += `<g class="dl-pec-uvnitr">${mnohouhelnik(otvor, `fill="#2B1A12"`)}${mnohouhelnik(body(kruznice(PEC.x, PEC.nahore - 0.02, PEC.z, PEC.r * 0.84)), `fill="#3B2A1F"`)}`;
    const sp = m(PEC.z) / 52;
    s += nadoba("bowl", ...P(PEC.x - 0.14, PEC.nahore - 0.04, PEC.z - 0.05), sp * 0.22, "Shino");
    s += nadoba("vase", ...P(PEC.x + 0.02, PEC.nahore - 0.04, PEC.z + 0.08), sp * 0.15, "Celadon");
    s += nadoba("mug", ...P(PEC.x + 0.16, PEC.nahore - 0.04, PEC.z - 0.06), sp * 0.21, "Tenmoku");
    s += `</g>`;
    // víko zavřené: nerezový lem a světlá deska s mřížkou
    const vik = `<g class="dl-pec-viko">${kotouc((y) => kruznice(PEC.x, y, PEC.z, PEC.r + 0.01), PEC.nahore + 0.07, 0.07, "#E9ECEE", "#9AA2A8")}${mnohouhelnik(body(kruznice(PEC.x, PEC.nahore + 0.071, PEC.z, PEC.r * 0.86)), `fill="#F1EEE6"`)}${[-0.18, 0, 0.18].map((d) => S.cara3([PEC.x + d, PEC.nahore + 0.072, PEC.z - PEC.r * 0.8], [PEC.x + d, PEC.nahore + 0.072, PEC.z + PEC.r * 0.8], "#D8D2C6", 0.006)).join("")}${[-0.18, 0, 0.18].map((d) => S.cara3([PEC.x - PEC.r * 0.8, PEC.nahore + 0.072, PEC.z + d], [PEC.x + PEC.r * 0.8, PEC.nahore + 0.072, PEC.z + d], "#D8D2C6", 0.006)).join("")}${S.kvadr(PEC.x - 0.06, PEC.x + 0.06, PEC.nahore + 0.07, PEC.nahore + 0.1, PEC.z - PEC.r - 0.02, PEC.z - PEC.r + 0.04, { celo: "#2B2B2B", vrch: "#3A3A3A" })}</g>`;
    // víko otevřené: postavené na pantu vzadu, vnitřkem k nám
    const [hx, hy] = P(PEC.x, PEC.nahore + 0.07, PEC.z + PEC.r);
    const vr = (PEC.r + 0.01) * m(PEC.z + PEC.r);
    const vikoOtevrene = `<g class="dl-pec-viko-otevrene">${elipsa(hx, hy - vr * 0.98, vr * 1.0, vr * 0.98, `fill="#9AA2A8"`)}${elipsa(hx, hy - vr * 0.98, vr * 0.86, vr * 0.84, `fill="#EDE6D6"`)}${elipsa(hx, hy - vr * 0.98, vr * 0.86, vr * 0.84, `fill="none" stroke="#D3C7B0" stroke-width="2"`)}</g>`;
    s += vikoOtevrene + vik;
    s += `<g class="dl-pec-horko" fill="none" stroke="#FFD9A0" stroke-width="2" stroke-linecap="round">${[-0.15, 0, 0.15].map((d) => {
      const [x, y] = P(PEC.x + d, PEC.nahore + 0.2, PEC.z);
      return `<path d="M${f(x)} ${f(y)} c-6 -8 4 -14 -2 -24"/>`;
    }).join("")}</g>`;
    const [gx, gy] = P(PEC.x, PEC.nahore + 0.1, PEC.z);
    s += elipsa(gx, gy, 0.62 * m(PEC.z), 0.34 * m(PEC.z), `class="dl-pec-zar" fill="url(#${p}-zar)"`);
    return g(s, ` class="dl-pec"${od(8)}`);
  })();

  /* ════════ Stoly a židle ════════ */
  const zidle = (x: number, z: number, celem: "sever" | "jih") => {
    let s = "";
    const w = 0.22;
    const nohy = (a: number, b: number) => cara3([a, 0, b], [a, 0.45, b], "#141414", 0.022);
    s += nohy(x - w + 0.03, z - w + 0.03) + nohy(x + w - 0.03, z - w + 0.03) + nohy(x - w + 0.03, z + w - 0.03) + nohy(x + w - 0.03, z + w - 0.03);
    const zz = celem === "sever" ? z - w : z + w - 0.05;
    if (celem === "jih") s += kvadr(x - w, x + w, 0.48, 0.9, zz, zz + 0.05, { celo: B.modraTma, bok: "#141414", vrch: "#141414" });
    s += kvadr(x - w, x + w, 0.43, 0.5, z - w, z + w, { celo: "#1A1A1A", bok: "#141414", vrch: B.modra });
    if (celem === "sever") {
      // zezadu je opěradlo černá plastová skořepina, modré čalounění vykoukne jen nahoře
      s += cara3([x - w + 0.02, 0.48, zz + 0.02], [x - w + 0.02, 0.62, zz], "#141414", 0.025) + cara3([x + w - 0.02, 0.48, zz + 0.02], [x + w - 0.02, 0.62, zz], "#141414", 0.025);
      s += kvadr(x - w + 0.01, x + w - 0.01, 0.86, 0.9, zz + 0.006, zz + 0.05, { celo: B.modra, vrch: B.modra });
      s += kvadr(x - w + 0.01, x + w - 0.01, 0.6, 0.87, zz, zz + 0.05, { celo: "#232323", bok: "#141414" });
      s += cara3([x - w + 0.08, 0.84, zz - 0.002], [x + w - 0.08, 0.84, zz - 0.002], "#3A3A3A", 0.008);
    }
    return s;
  };

  const OVAL = { x: -0.62, z: 3.56, delka: 2.2, sirka: 0.95, y: 0.75 };
  const stulOval = (() => {
    let s = "";
    for (const [dx, dz] of [[-0.78, -0.28], [0.78, -0.28], [-0.78, 0.28], [0.78, 0.28]] as [number, number][]) {
      s += cara3([OVAL.x + dx, 0, OVAL.z + dz], [OVAL.x + dx, OVAL.y - 0.03, OVAL.z + dz], "#1A1A1A", 0.04);
    }
    s += cara3([OVAL.x - 0.78, 0.12, OVAL.z - 0.28], [OVAL.x + 0.78, 0.12, OVAL.z - 0.28], "#1A1A1A", 0.02);
    s += kotouc((y) => stadion(OVAL.x, y, OVAL.z, OVAL.delka, OVAL.sirka), OVAL.y, 0.035, "#D9B88E", "#A9844F");
    // na stole: podložka, hrouda, točna, váleček, lišty, miska, kyblík s houbou na tyčce
    s += plocha([[-1.45, OVAL.y + 0.002, 3.32], [-0.82, OVAL.y + 0.002, 3.32], [-0.82, OVAL.y + 0.002, 3.82], [-1.45, OVAL.y + 0.002, 3.82]], `fill="#2E6B4E"`);
    for (let i = 1; i < 5; i++) s += cara3([-1.45 + i * 0.126, OVAL.y + 0.003, 3.32], [-1.45 + i * 0.126, OVAL.y + 0.003, 3.82], "#4F8A6A", 0.004);
    s += valec(-0.18, 3.48, 0.05, OVAL.y, OVAL.y + 0.02, "#1C8C9C");
    s += cara3([-0.18, OVAL.y + 0.02, 3.48], [-0.18, OVAL.y + 0.11, 3.48], "#1C8C9C", 0.03);
    s += kotouc((y) => kruznice(-0.18, y, 3.48, 0.15), OVAL.y + 0.13, 0.02, "#3FB6C4", "#1C8C9C");
    for (let i = 1; i < 4; i++) s += `<polyline points="${body(kruznice(-0.18, OVAL.y + 0.131, 3.48, 0.04 * i).filter((q) => q[2] < 3.5)).map(([x, y]) => `${f(x)},${f(y)}`).join(" ")}" fill="none" stroke="#2A9AA8" stroke-width="1"/>`;
    s += cara3([0.12, OVAL.y + 0.03, 3.78], [0.5, OVAL.y + 0.03, 3.7], "#E1C79C", 0.045);
    s += cara3([-0.55, OVAL.y + 0.01, 3.33], [0.0, OVAL.y + 0.01, 3.26], "#E8D3A6", 0.022);
    s += cara3([-0.5, OVAL.y + 0.01, 3.38], [0.05, OVAL.y + 0.01, 3.31], "#D9C08F", 0.022);
    s += nadoba("bowl", ...P(-0.48, OVAL.y, 3.8), (m(3.8) / 52) * 0.17, "Matná bílá");
    s += valec(-1.6, 3.62, 0.11, OVAL.y, OVAL.y + 0.12, ["#B8501E", "#E2702E", "#B8501E"], "#7A3A16", `${p}-kyblik`);
    s += cara3([-1.6, OVAL.y + 0.1, 3.62], [-1.75, OVAL.y + 0.48, 3.62], "#E6CFA0", 0.012);
    s += `<path d="${chomac(...P(-1.77, OVAL.y + 0.5, 3.62), 0.05 * m(3.62), 0.04 * m(3.62), 9, 1717, 1, 0.7)}" fill="#D9A84A"/>`;
    // hrouda na podložce — v ní se schovává Bublinka
    const [hx, hy] = P(-1.12, OVAL.y + 0.003, 3.55);
    const hs = m(3.55);
    s += `<g class="hrouda"><path class="hrouda-telo" d="M${f(hx - 0.12 * hs)} ${f(hy)} C${f(hx - 0.13 * hs)} ${f(hy - 0.1 * hs)} ${f(hx - 0.05 * hs)} ${f(hy - 0.15 * hs)} ${f(hx + 0.01 * hs)} ${f(hy - 0.15 * hs)} C${f(hx + 0.08 * hs)} ${f(hy - 0.15 * hs)} ${f(hx + 0.13 * hs)} ${f(hy - 0.09 * hs)} ${f(hx + 0.12 * hs)} ${f(hy)} Z" fill="url(#${p}-hlina)" stroke="#3B2A1B" stroke-width="1" stroke-opacity="0.35"/>
      <g class="hrouda-kiku" stroke="#5E4334" stroke-width="1.2" fill="none" opacity="0"><path d="M${f(hx)} ${f(hy - 0.14 * hs)} C${f(hx - 0.06 * hs)} ${f(hy - 0.08 * hs)} ${f(hx - 0.08 * hs)} ${f(hy - 0.03 * hs)} ${f(hx - 0.09 * hs)} ${f(hy)} M${f(hx)} ${f(hy - 0.14 * hs)} C${f(hx + 0.05 * hs)} ${f(hy - 0.08 * hs)} ${f(hx + 0.07 * hs)} ${f(hy - 0.03 * hs)} ${f(hx + 0.08 * hs)} ${f(hy)}"/></g></g>`;
    mista.hrouda = { box: boxKolem([[hx - 0.16 * hs, hy - 0.2 * hs], [hx + 0.16 * hs, hy + 0.03 * hs]], 2) };
    postav("bublinka", -1.1, OVAL.y + 0.1, 3.5, 0.24);
    return s;
  })();
  defs.push(`<linearGradient id="${p}-hlina" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5E4334"/><stop offset="0.3" stop-color="#9C7860"/><stop offset="0.44" stop-color="#C9A184"/><stop offset="0.6" stop-color="#9C7860"/><stop offset="1" stop-color="#4E3729"/></linearGradient>`);

  const PREKL = { x0: 0.62, x1: 1.96, z0: 4.75, z1: 5.55, y: 0.76 };
  const stulPreklizka = (() => {
    let s = "";
    for (const [x, z] of [[PREKL.x0 + 0.06, PREKL.z0 + 0.06], [PREKL.x1 - 0.06, PREKL.z0 + 0.06], [PREKL.x0 + 0.06, PREKL.z1 - 0.06], [PREKL.x1 - 0.06, PREKL.z1 - 0.06]] as [number, number][]) {
      s += cara3([x, 0, z], [x, PREKL.y - 0.03, z], "#1A1A1A", 0.04);
    }
    s += kvadr(PREKL.x0, PREKL.x1, PREKL.y - 0.03, PREKL.y, PREKL.z0, PREKL.z1, { celo: "#C9A97A", bok: "#C9A97A", vrch: B.preklizka });
    s += cara3([PREKL.x0, PREKL.y - 0.015, PREKL.z0], [PREKL.x1, PREKL.y - 0.015, PREKL.z0], "#A88A5C", 0.004);
    // dvě oranžové svěrky na hraně, stojánek se štětci, zelený hrnek, lahvičky
    for (const x of [0.95, 1.6]) {
      s += kvadr(x - 0.03, x + 0.03, PREKL.y - 0.12, PREKL.y + 0.05, PREKL.z0 - 0.03, PREKL.z0 + 0.04, { celo: "#E2702E", vrch: "#F29A5C" });
      s += cara3([x, PREKL.y + 0.05, PREKL.z0], [x, PREKL.y - 0.14, PREKL.z0], "#B9BEC2", 0.012);
    }
    s += kvadr(1.2, 1.38, PREKL.y, PREKL.y + 0.12, 5.05, 5.18, { celo: "#B98A54", vrch: "#D4A86E" });
    for (let i = 0; i < 6; i++) s += cara3([1.22 + i * 0.03, PREKL.y + 0.1, 5.12], [1.21 + i * 0.035, PREKL.y + 0.32 - (i % 3) * 0.04, 5.12], i % 2 ? "#3A2E28" : "#C4432B", 0.008);
    s += nadoba("mug", ...P(0.85, PREKL.y, 5.2), (m(5.2) / 52) * 0.2, "Celadon");
    s += valec(1.62, 5.25, 0.04, PREKL.y, PREKL.y + 0.16, ["#D9D4CA", "#FFFFFF", "#D9D4CA"], "#E07A8A", `${p}-lahvicka1`);
    s += valec(1.72, 5.3, 0.04, PREKL.y, PREKL.y + 0.14, ["#D9D4CA", "#FFFFFF", "#D9D4CA"], "#5B7FD1", `${p}-lahvicka2`);
    return s;
  })();

  /* ════════ Kruhy u oken ════════ */
  const KRUHY = [
    { x: -1.2, z: 0.9 },
    { x: 0.5, z: 0.95 },
  ];
  const ELEKTRICKY = { x: 1.18, z: 2.15 };
  const hlinaFaze = (c: number, pata: number, sc: number) => [
    `M${c - 20 * sc} ${pata} C${c - 22 * sc} ${pata - 15 * sc} ${c - 12 * sc} ${pata - 25 * sc} ${c} ${pata - 25 * sc} C${c + 12 * sc} ${pata - 25 * sc} ${c + 22 * sc} ${pata - 15 * sc} ${c + 20 * sc} ${pata} Z`,
    `M${c - 15 * sc} ${pata} C${c - 16 * sc} ${pata - 17 * sc} ${c - 14 * sc} ${pata - 35 * sc} ${c - 13 * sc} ${pata - 47 * sc} L${c + 13 * sc} ${pata - 47 * sc} C${c + 14 * sc} ${pata - 35 * sc} ${c + 16 * sc} ${pata - 17 * sc} ${c + 15 * sc} ${pata} Z`,
    `M${c - 12 * sc} ${pata} C${c - 23 * sc} ${pata - 17 * sc} ${c - 21 * sc} ${pata - 39 * sc} ${c - 9 * sc} ${pata - 50 * sc} C${c - 6 * sc} ${pata - 54 * sc} ${c - 7 * sc} ${pata - 60 * sc} ${c - 8 * sc} ${pata - 67 * sc} L${c + 8 * sc} ${pata - 67 * sc} C${c + 7 * sc} ${pata - 60 * sc} ${c + 6 * sc} ${pata - 54 * sc} ${c + 9 * sc} ${pata - 50 * sc} C${c + 21 * sc} ${pata - 39 * sc} ${c + 23 * sc} ${pata - 17 * sc} ${c + 12 * sc} ${pata} Z`,
    `M${c - 27 * sc} ${pata - 21 * sc} C${c - 25 * sc} ${pata - 7 * sc} ${c - 14 * sc} ${pata} ${c} ${pata} C${c + 14 * sc} ${pata} ${c + 25 * sc} ${pata - 7 * sc} ${c + 27 * sc} ${pata - 21 * sc} Z`,
  ];
  const hlinaOkraj: ([number, number, number] | null)[] = [null, [47, 13, 3], [67, 8, 2], [21, 27, 5]];
  const hlinaNaKruhu = (i: number, c: number, pata: number, sc: number, start: number) => {
    let s = "";
    hlinaFaze(c, pata, sc).forEach((d, fz) => {
      defs.push(`<clipPath id="${p}-k${i}-f${fz}"><path d="${d}"/></clipPath>`);
      s += `<g class="kruh-faze" data-f="${fz}"><path d="${d}" fill="url(#${p}-hlina)" stroke="#3B2A1B" stroke-width="1" stroke-opacity="0.35"/>`;
      s += `<g clip-path="url(#${p}-k${i}-f${fz})"><rect class="kruh-pruhy" x="${f(c - 60 * sc)}" y="${f(pata - 75 * sc)}" width="${f(140 * sc)}" height="${f(80 * sc)}" fill="url(#${p}-pruhy)"/></g>`;
      const o = hlinaOkraj[fz];
      if (o) s += elipsa(c, pata - o[0] * sc, o[1] * sc, o[2] * sc, `fill="#4A3426" stroke="#C9A184" stroke-width="1.2"`);
      s += `</g>`;
    });
    void start;
    return s;
  };

  const kopaciKruh = (i: number, x: number, z: number) => {
    let s = "";
    const sc = m(z);
    // dřevěný setrvačník na podlaze
    s += kotouc((y) => kruznice(x, y, z, 0.36), 0.16, 0.12, "#C9AC84", "#9C7C56");
    for (const r of [0.12, 0.22, 0.3]) s += `<polyline class="kruh-krouzek" points="${body(kruznice(x, 0.161, z, r)).map(([a, b]) => `${f(a)},${f(b)}`).join(" ")}" fill="none" stroke="#A88A62" stroke-width="1.4" stroke-dasharray="7 9"/>`;
    // růžovo-lososový rám a sedátko
    const ram = B.lososova;
    const ramTma = "#A9705F";
    s += cara3([x - 0.6, 0.02, z + 0.2], [x + 0.08, 0.02, z + 0.26], ramTma, 0.035);
    s += cara3([x - 0.6, 0.02, z + 0.2], [x - 0.56, 0.54, z + 0.08], ramTma, 0.04);
    s += cara3([x - 0.6, 0.02, z - 0.2], [x + 0.08, 0.02, z - 0.26], ram, 0.04);
    s += cara3([x - 0.6, 0.02, z - 0.2], [x - 0.56, 0.54, z - 0.08], ram, 0.045);
    s += cara3([x - 0.56, 0.46, z], [x - 0.03, 0.64, z], ram, 0.04);
    s += kvadr(x - 0.74, x - 0.36, 0.54, 0.6, z - 0.18, z + 0.18, { celo: "#4A3528", bok: "#3A2A20", vrch: "#5E4434" });
    // závitová hřídel a hlava
    s += cara3([x, 0.16, z], [x, 0.7, z], "#7A5A3E", 0.035);
    for (let k = 0; k < 7; k++) s += cara3([x - 0.018, 0.24 + k * 0.06, z], [x + 0.018, 0.25 + k * 0.06, z], "#5A4030", 0.006);
    s += kotouc((y) => kruznice(x, y, z, 0.16), 0.74, 0.035, "#5A4234", "#3E2C22");
    for (const r of [0.05, 0.1, 0.14]) s += `<polyline class="kruh-krouzek" points="${body(kruznice(x, 0.741, z, r)).map(([a, b]) => `${f(a)},${f(b)}`).join(" ")}" fill="none" stroke="#3E2C22" stroke-width="1" stroke-dasharray="4 6"/>`;
    const [cx, cy] = P(x, 0.742, z);
    s += hlinaNaKruhu(i, cx, cy, sc / 280, i);
    mista[`kruh${i}`] = { box: boxKolem([P(x - 0.42, 0, z - 0.4), P(x + 0.42, 0, z - 0.4), P(x, 1.0, z)], 4) };
    return `<g class="kruh" data-kruh="${i}" data-faze="${i}">${s}</g>`;
  };

  const elektrickyKruh = (i: number) => {
    const { x, z } = ELEKTRICKY;
    const sc = m(z);
    let s = "";
    s += kvadr(x - 0.28, x + 0.28, 0, 0.36, z - 0.24, z + 0.24, { celo: "#7E868C", bok: "#6A7278", vrch: "#959DA3" });
    s += kvadr(x - 0.12, x + 0.04, 0, 0.05, z - 0.52, z - 0.38, { celo: "#2B2B2B", vrch: "#3A3A3A" });
    s += cara3([x - 0.04, 0.05, z - 0.38], [x - 0.04, 0.2, z - 0.25], "#2B2B2B", 0.01);
    // bílá vanička a hlava
    s += kotouc((y) => kruznice(x, y, z, 0.33), 0.5, 0.14, "#F4F2EC", "#D9D6CE");
    s += mnohouhelnik(body(kruznice(x, 0.501, z, 0.29)), `fill="#C9C4B8"`);
    s += kotouc((y) => kruznice(x, y, z, 0.16), 0.48, 0.02, "#8D959B", "#6A7278");
    for (const r of [0.05, 0.1, 0.14]) s += `<polyline class="kruh-krouzek" points="${body(kruznice(x, 0.481, z, r)).map(([a, b]) => `${f(a)},${f(b)}`).join(" ")}" fill="none" stroke="#5E666C" stroke-width="1" stroke-dasharray="4 6"/>`;
    const [cx, cy] = P(x, 0.482, z);
    s += hlinaNaKruhu(i, cx, cy, sc / 300, i);
    // bílá stolička s modrým sedákem
    for (const [dx, dz] of [[-0.12, -0.1], [0.12, -0.1], [-0.12, 0.1], [0.12, 0.1]] as [number, number][]) s += cara3([x - 0.62 + dx, 0, z + dz], [x - 0.62 + dx * 0.7, 0.6, z + dz * 0.7], "#F4F2EC", 0.022);
    s += cara3([x - 0.74, 0.25, z - 0.1], [x - 0.5, 0.25, z - 0.1], "#F4F2EC", 0.015);
    s += kotouc((y) => kruznice(x - 0.62, y, z, 0.16), 0.66, 0.06, B.modra, B.modraTma);
    mista[`kruh${i}`] = { box: boxKolem([P(x - 0.34, 0, z - 0.35), P(x + 0.34, 0, z - 0.35), P(x, 0.9, z)], 4) };
    return `<g class="kruh kruh-elektricky" data-kruh="${i}" data-faze="2">${s}</g>`;
  };

  /* ════════ Venku: dvorek, stěny výklenku, deska nad okny ════════ */
  const venku = (() => {
    let s = "";
    const ZV = -1.2;
    // dlažba dvorku s odvodňovacím žlabem u oken — až k okraji záběru
    const ZD = -5.4;
    s += plocha([[-3.05, 0, ZD], [3.0, 0, ZD], [3.0, 0, 0], [-3.05, 0, 0]], `fill="${B.dlazba}"`);
    const spary: [B3, B3][] = [];
    for (let i = 0; i <= 54; i++) {
      const z = ZD + i * 0.1;
      spary.push([[-3.05, 0, z], [3.0, 0, z]]);
      const posun = i % 2 ? 0.1 : 0;
      for (let x = -3.05 + posun; x < 3.0; x += 0.2) spary.push([[x, 0, z], [x + 0.02, 0, z + 0.1]]);
    }
    s += cary3(spary, B.dlazbaSpara, 0.009);
    s += plocha([[-3.05, 0.001, ZD], [3.0, 0.001, ZD], [3.0, 0.001, -1.4], [-3.05, 0.001, -1.4]], `fill="#FFF6DC" opacity="0.18"`);
    // dál od oken rampa stoupá k ulici — dlažba tmavne do stínu zídek
    s += plocha([[-3.05, 0.002, ZD], [3.0, 0.002, ZD], [3.0, 0.002, -3.4], [-3.05, 0.002, -3.4]], `fill="#5E5A50" opacity="0.12"`);
    // vlevo jižní stěna západního křídla (vystupuje před okna), vpravo sloup lodžie
    s += plocha([[-6, 0.4, ZV], [X0, 0.4, ZV], [X0, 4.6, ZV], [-6, 4.6, ZV]], `fill="${B.zed}"`);
    s += plocha([[-6, 0.4, ZV], [X0, 0.4, ZV], [X0, 0.72, ZV], [-6, 0.72, ZV]], `fill="${B.sokl}"`);
    s += plocha([[X0 - 0.02, 0.4, ZV], [X0 + 0.02, 0.4, ZV], [X0 + 0.02, 4.6, ZV], [X0 - 0.02, 4.6, ZV]], `fill="#E3EAD8"`);
    s += plocha([[X1, 0, ZV], [3.15, 0, ZV], [3.15, 4.6, ZV], [X1, 4.6, ZV]], `fill="${B.zed}"`);
    s += plocha([[X1, 0, ZV], [X1 + 0.06, 0, ZV], [X1 + 0.06, 4.6, ZV], [X1, 4.6, ZV]], `fill="${B.zedStin}"`);
    // vlevo šikmá šedá deska na obrubníku a za ní tráva, vpravo opěrná zeď rampy
    s += plocha([[-3.05, 0, ZD], [-3.05, 0, -0.02], [-3.05, 0.36, -0.02], [-3.05, 0.7, ZD]], `fill="${B.kryt}"`);
    s += plocha([[-3.05, 0.36, -0.02], [-3.38, 0.4, -0.02], [-3.38, 0.76, ZD], [-3.05, 0.7, ZD]], `fill="#8E9A9E"`);
    s += plocha([[-3.38, 0.4, -0.02], [-6, 0.42, -0.02], [-6, 0.8, ZD], [-3.38, 0.76, ZD]], `fill="${B.trava}"`);
    s += plocha([[3.0, 0, ZD], [3.0, 0, -0.02], [3.0, 1.6, -0.02], [3.0, 0.9, ZD]], `fill="${B.seda}"`);
    s += plocha([[3.0, 1.6, -0.02], [3.3, 1.6, -0.02], [3.3, 0.9, ZD], [3.0, 0.9, ZD]], `fill="#DCDDD9"`);
    s += plocha([[-2.62, 0.002, -0.22], [2.62, 0.002, -0.22], [2.62, 0.002, -0.08], [-2.62, 0.002, -0.08]], `fill="#3B3A37"`);
    s += cary3(Array.from({ length: 52 }, (_, i) => [[-2.6 + i * 0.1, 0.003, -0.21], [-2.6 + i * 0.1, 0.003, -0.09]] as [B3, B3]), "#5E5C58", 0.012);
    // levý bok: zelená zeď s šedým soklem (nároží domu), pravý: šedá omítka
    s += plocha([[X0, 0, ZV], [X0, 0, 0], [X0, YU, 0], [X0, YU, ZV]], `fill="#A9B79A"`);
    s += plocha([[X0, 0, ZV], [X0, 0, 0], [X0, 0.32, 0], [X0, 0.32, ZV]], `fill="#C9CAC2"`);
    s += plocha([[X1, 0, ZV], [X1, 0, 0], [X1, YU, 0], [X1, YU, ZV]], `fill="${B.sedaStin}"`);
    // za zábradlím zelená zeď lodžie v přízemí, pod ní podhled a čelo desky balkonu
    s += plocha([[-4, 2.74, -0.1], [4, 2.74, -0.1], [4, 4.6, -0.1], [-4, 4.6, -0.1]], `fill="${B.lodzie}"`);
    s += plocha([[-4, 2.74, -0.1], [4, 2.74, -0.1], [4, 2.95, -0.1], [-4, 2.95, -0.1]], `fill="#93A383" opacity="0.5"`);
    s += plocha([[-3.6, YU, ZV], [3.6, YU, ZV], [3.6, YU, 0], [-3.6, YU, 0]], `fill="#E2E3DE"`);
    s += plocha([[-3.6, YU, ZV], [3.6, YU, ZV], [3.6, 2.68, ZV], [-3.6, 2.68, ZV]], `fill="${B.deskaSeda}"`);
    s += plocha([[-3.6, 2.66, ZV - 0.02], [3.6, 2.66, ZV - 0.02], [3.6, 2.76, ZV - 0.02], [-3.6, 2.76, ZV - 0.02]], `fill="${B.deska}"`);
    // lodžie v přízemí: zadní stěna výš, okénko, nahoře deska horního balkonu a zábradlí podkroví
    s += plocha([[-4, 4.6, -0.1], [4, 4.6, -0.1], [4, 9, -0.1], [-4, 9, -0.1]], `fill="${B.lodzie}"`);
    s += plocha([[-0.95, 3.72, -0.1], [-0.05, 3.72, -0.1], [-0.05, 4.86, -0.1], [-0.95, 4.86, -0.1]], `fill="${B.ram}"`);
    s += plocha([[-0.87, 3.8, -0.11], [-0.13, 3.8, -0.11], [-0.13, 4.78, -0.11], [-0.87, 4.78, -0.11]], `fill="${B.sklo}"`);
    s += plocha([[-0.87, 4.2, -0.12], [-0.4, 4.78, -0.12], [-0.25, 4.78, -0.12], [-0.87, 4.45, -0.12]], `fill="${B.odlesk}" opacity="0.3"`);
    s += plocha([[-1.0, 3.66, -0.15], [0.0, 3.66, -0.15], [0.0, 3.72, -0.15], [-1.0, 3.72, -0.15]], `fill="#E4E3DD"`);
    s += plocha([[-4, 5.55, ZV], [4, 5.55, ZV], [4, 5.92, ZV], [-4, 5.92, ZV]], `fill="${B.deskaSeda}"`);
    s += plocha([[-4, 5.9, ZV - 0.02], [4, 5.9, ZV - 0.02], [4, 6.0, ZV - 0.02], [-4, 6.0, ZV - 0.02]], `fill="${B.deska}"`);
    s += cary3(Array.from({ length: 55 }, (_, i) => [[-3.5 + i * 0.13, 6.02, ZV + 0.06], [-3.5 + i * 0.13, 7.0, ZV + 0.06]] as [B3, B3]), B.mata, 0.022);
    s += cara3([-4, 7.0, ZV + 0.06], [4, 7.0, ZV + 0.06], B.mata, 0.05) + cara3([-4, 6.06, ZV + 0.06], [4, 6.06, ZV + 0.06], B.mata, 0.04);
    // na desce mátové zábradlí lodžie: pruty, madlo, spodní pásnice
    s += cary3(Array.from({ length: 55 }, (_, i) => [[-3.5 + i * 0.13, 2.78, ZV + 0.06], [-3.5 + i * 0.13, 3.78, ZV + 0.06]] as [B3, B3]), B.mata, 0.022);
    s += cara3([-3.6, 2.82, ZV + 0.06], [3.6, 2.82, ZV + 0.06], B.mata, 0.045);
    s += cara3([-3.6, 3.78, ZV + 0.06], [3.6, 3.78, ZV + 0.06], B.mata, 0.06);
    s += cara3([-3.6, 3.8, ZV + 0.05], [3.6, 3.8, ZV + 0.05], B.mataSvetlo, 0.015);
    // dva květináče na madle jako na fotce: menší kuželový s vistárií, široká mísa se suchými stonky
    const [k1x, k1y] = P(-1.2, 3.78, ZV + 0.02);
    const [k2x, k2y] = P(0.95, 3.78, ZV + 0.02);
    const sk = m(ZV) / 100;
    s += `<g transform="translate(${f(k1x)} ${f(k1y)}) scale(${f(sk)})"><path d="M-18 -8 L18 -8 L13 30 L-13 30 Z" fill="#4A4642"/><path d="M-20 -10 H20 V-4 H-20 Z" fill="#5E5852"/><path d="M0 -8 C-8 -30 -22 -36 -30 -32 M0 -8 C4 -34 16 -44 26 -40 M0 -8 C-2 -24 2 -36 -2 -48" stroke="#6E8A3E" stroke-width="2.6" fill="none"/><g fill="#B9C94A">${[[-30, -32], [26, -40], [-2, -48], [-16, -38], [14, -28]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="7" ry="3" transform="rotate(-25 ${x} ${y})"/>`).join("")}</g></g>`;
    s += `<g transform="translate(${f(k2x)} ${f(k2y)}) scale(${f(sk)})"><path d="M-34 -6 Q0 -16 34 -6 L26 22 Q0 30 -26 22 Z" fill="#4A4642"/><path d="M-36 -8 Q0 -20 36 -8 V-2 Q0 -14 -36 -2 Z" fill="#5E5852"/><path d="M-22 -8 L-28 -30 M-6 -10 L-2 -36 M12 -10 L22 -32 M26 -8 L40 -24" stroke="#B49A62" stroke-width="2.4" fill="none"/></g>`;
    return s;
  })();

  // Bílý rám okenní stěny — okna jsou vyjmutá, zůstal obrys a stopy příček
  const ramOken = (() => {
    let s = "";
    const r = 0.07;
    s += plocha([[X0, 0, 0], [X0 + r, 0, 0], [X0 + r, YU, 0], [X0, YU, 0]], `fill="${B.ram}"`);
    s += plocha([[X1 - r, 0, 0], [X1, 0, 0], [X1, YU, 0], [X1 - r, YU, 0]], `fill="${B.ram}"`);
    s += plocha([[X0, YU - r, 0], [X1, YU - r, 0], [X1, YU, 0], [X0, YU, 0]], `fill="${B.ram}"`);
    s += plocha([[X0, 0, 0], [X1, 0, 0], [X1, 0.05, 0], [X0, 0.05, 0]], `fill="#D9DBD6"`);
    return g(s, ` class="dl-ram"${od(3)}`);
  })();

  /* ════════ Rok 2026: co tu bylo, než tu byla dílna ════════ */
  const ROK_PRICKA = 5.4;
  const elipsaNaZemi = (x: number, z: number, rx: number, rz: number, atributy: string, y = 0.003, n = 30) =>
    `<polygon points="${body(kruznice(x, y, z, rx, rz, n)).map(([a, b]) => `${f(a)},${f(b)}`).join(" ")}" ${atributy}/>`;

  // Únor: holý beton, sekční vrata vytažená pod strop, prasklá trubka a kaluž
  const rokSkorepina = (() => {
    let s = "";
    let garaz = "";
    garaz += plocha([[X0, 0, 0], [X0, 0, Z1], [X0, Y1, Z1], [X0, Y1, ZP], [X0, YU, ZP], [X0, YU, 0]], `fill="#A8A59C"`);
    garaz += plocha([[X1, 0, 0], [X1, 0, Z1], [X1, Y1, Z1], [X1, Y1, ZP], [X1, YU, ZP], [X1, YU, 0]], `fill="#A19E95"`);
    garaz += plocha([[X0, 0, 0], [X1, 0, 0], [X1, 0, Z1], [X0, 0, Z1]], `fill="#9C998F"`);
    garaz += plocha([[X0, Y1, ZP], [X1, Y1, ZP], [X1, Y1, Z1], [X0, Y1, Z1]], `fill="#B3B0A7"`);
    garaz += plocha([[X0, YU, 0], [X1, YU, 0], [X1, YU, ZP], [X0, YU, ZP]], `fill="#BCB9B0"`);
    garaz += [[0.9, 2.6, 0.5, 0.22], [-1.3, 5.0, 0.4, 0.2], [1.8, 4.6, 0.3, 0.14]].map(([x, z, rx, rz]) => elipsaNaZemi(x, z, rx, rz, `fill="#6E6A60" opacity="0.45"`)).join("");
    // vodítka a lamely vrat pod stropem
    for (const x of [X0 + 0.06, X1 - 0.06]) {
      garaz += cara3([x, 0, 0.04], [x, 2.28, 0.04], "#6E7378", 0.05);
      garaz += cara3([x, 2.28, 0.04], [x, 2.34, 0.4], "#6E7378", 0.05);
      garaz += cara3([x, 2.34, 0.4], [x, 2.34, 2.9], "#6E7378", 0.05);
    }
    for (let i = 0; i < 5; i++) {
      const z0 = 0.45 + i * 0.48;
      garaz += plocha([[X0 + 0.1, 2.3, z0], [X1 - 0.1, 2.3, z0], [X1 - 0.1, 2.3, z0 + 0.46], [X0 + 0.1, 2.3, z0 + 0.46]], `fill="#8E9398"`);
      garaz += cara3([X0 + 0.1, 2.3, z0 + 0.23], [X1 - 0.1, 2.3, z0 + 0.23], "#7A7F84", 0.02);
    }
    // tlustá trubka pod stropem s prasklinou, kape z ní do kaluže
    garaz += cara3([X0 + 0.12, 2.32, 0], [X0 + 0.12, 2.32, Z1], "#8C949B", 0.09);
    garaz += cara3([X0 + 0.12, 2.35, 0], [X0 + 0.12, 2.35, Z1], "#B9C0C6", 0.025);
    const [tx, ty] = P(X0 + 0.12, 2.28, 3.1);
    garaz += `<path d="M${f(tx - 6)} ${f(ty - 6)} l5 8 l5 -9" stroke="#2B2420" stroke-width="2" fill="none"/>`;
    garaz += `<circle class="rok-kapka" cx="${f(tx)}" cy="${f(ty + 6)}" r="4" fill="#8FB3C9"/><circle class="rok-kapka rok-kapka-2" cx="${f(tx)}" cy="${f(ty + 6)}" r="3.4" fill="#8FB3C9"/>`;
    garaz += elipsaNaZemi(-0.6, 3.1, 1.9, 1.05, `fill="#8FB3C9" opacity="0.82"`, 0.004, 40);
    garaz += elipsaNaZemi(-0.9, 3.0, 1.0, 0.5, `fill="#C9DDE8" opacity="0.6"`, 0.005);
    const [vx, vy] = P(-2.25, 0.006, 3.1);
    garaz += `<ellipse class="rok-vlnka" cx="${f(vx)}" cy="${f(vy)}" rx="40" ry="7" fill="none" stroke="#FFFFFF" stroke-width="1.5"/>`;
    s += g(garaz, ` data-od="2" data-do="3"`);
    // Červenec: místo pro novou pec vyznačené páskou
    let pec = `<polygon points="${body([[1.62, 0.004, 0.32], [2.62, 0.004, 0.32], [2.62, 0.004, 1.28], [1.62, 0.004, 1.28]]).map(([a, b]) => `${f(a)},${f(b)}`).join(" ")}" fill="none" stroke="#E8B440" stroke-width="3" stroke-dasharray="10 6"/>`;
    const [px, py] = P(2.12, 0.005, 0.8);
    pec += `<text x="${f(px)}" y="${f(py + 8)}" text-anchor="middle" font-size="24" fill="#B98A1C" font-family="Caveat, cursive" font-weight="600">PEC</text>`;
    s += g(pec, ` data-od="7" data-do="8"`);
    // Září: šlápoty ze dne otevřených dveří
    let slapoty = "";
    for (let i = 0; i < 18; i++) {
      const t = i / 17;
      const x = -1.6 + Math.sin(t * Math.PI * 1.6) * 1.2 + (i % 2) * 0.14;
      const z = 0.4 + t * 5.6;
      const [sx, sy] = P(x, 0.004, z);
      const k = m(z) / 240;
      slapoty += `<g transform="translate(${f(sx)} ${f(sy)}) scale(${f(k)})" fill="#7E6A58" opacity="0.4"><ellipse cx="0" cy="0" rx="9" ry="3.6"/><ellipse cx="-13" cy="0.4" rx="4" ry="3"/></g>`;
    }
    s += g(slapoty, ` data-od="9" data-do="10"`);
    // Zásuvky od července
    let zasuvky = "";
    for (const [x, y, z] of [[X0 + 0.005, 0.3, 1.6], [X0 + 0.005, 1.05, 3.4], [X1 - 0.005, 0.3, 1.4], [X1 - 0.005, 0.3, 4.2], [0.9, 0.3, Z1 - 0.005]] as B3[]) {
      const naBoku = Math.abs(Math.abs(x) - 2.7) < 0.01;
      const q: B3[] = naBoku ? [[x, y, z - 0.04], [x, y, z + 0.04], [x, y + 0.08, z + 0.04], [x, y + 0.08, z - 0.04]] : [[x - 0.04, y, z], [x + 0.04, y, z], [x + 0.04, y + 0.08, z], [x - 0.04, y + 0.08, z]];
      zasuvky += plocha(q, `fill="#FBF8F1" stroke="#B9AE9C" stroke-width="1"`);
    }
    s += g(zasuvky, ` data-od="7"`);
    // Květen: nové trubky k dřezu (pak zmizí za skříňkami)
    s += g(
      cara3([X0 + 0.05, 0.1, 0.3], [X0 + 0.05, 0.1, 2.4], "#B9C0C6", 0.04) + cara3([X0 + 0.05, 0.1, 2.4], [X0 + 0.05, 0.7, 2.4], "#B9C0C6", 0.04) + cara3([X0 + 0.09, 0.06, 0.3], [X0 + 0.09, 0.06, 2.5], "#8C949B", 0.06),
      ` data-od="5" data-do="6"`,
    );
    return s;
  })();

  // Únor: příčka, za kterou byl sklad — v březnu padla
  const rokPricka = (() => {
    let s = "";
    let pricka = "";
    pricka += plocha([[X0, 0, ROK_PRICKA], [X1, 0, ROK_PRICKA], [X1, Y1, ROK_PRICKA], [X0, Y1, ROK_PRICKA]], `fill="#B1AEA5"`);
    for (let i = 0; i < 9; i++) pricka += cara3([X0, 0.29 * (i + 1), ROK_PRICKA], [X1, 0.29 * (i + 1), ROK_PRICKA], "#9E9B92", 0.008);
    pricka += plocha([[-0.4, 0, ROK_PRICKA], [0.5, 0, ROK_PRICKA], [0.5, 2.0, ROK_PRICKA], [-0.4, 2.0, ROK_PRICKA]], `fill="#7A6A58"`);
    pricka += plocha([[-0.35, 0, ROK_PRICKA], [0.45, 0, ROK_PRICKA], [0.45, 1.95, ROK_PRICKA], [-0.35, 1.95, ROK_PRICKA]], `fill="#8E7C68"`);
    // plechový regál s plechovkami barev
    pricka += kvadr(1.7, 2.6, 0, 1.8, ROK_PRICKA - 0.5, ROK_PRICKA - 0.05, { celo: "#5E6368", bok: "#4E5358" });
    for (const y of [0.45, 0.95, 1.45]) pricka += kvadr(1.72, 2.58, y, y + 0.03, ROK_PRICKA - 0.52, ROK_PRICKA - 0.05, { celo: "#7E848A", vrch: "#959BA0" });
    [[1.8, 0.48], [2.05, 0.48], [2.3, 0.98], [1.85, 0.98], [2.2, 1.48]].forEach(([x, y], i) => {
      pricka += valec(x + 0.1, ROK_PRICKA - 0.3, 0.09, y, y + 0.18, ["#8C949B", "#D9DEE1", "#8C949B"], "#B9C0C6", `${p}-plech-${i}`);
    });
    s += g(pricka, ` data-od="2" data-do="3"`);
    // Březen: suť ze zbourané příčky
    let sut = "";
    const r = nahoda(3131);
    for (let i = 0; i < 16; i++) {
      const x = -2.3 + r() * 4.4;
      const z = ROK_PRICKA - 0.3 + r() * 0.6;
      sut += kvadr(x, x + 0.18 + r() * 0.14, 0, 0.08 + r() * 0.1, z, z + 0.14, { celo: "#A89A86", vrch: "#BDB09C" });
    }
    s += g(sut, ` data-od="3" data-do="4"`);
    return s;
  })();

  // Před stoly: harampádí garáže, štafle s barvou, mobil na stativu, elektrikářova bedna
  const rokVpredu = (() => {
    let s = "";
    let garaz = "";
    garaz += kvadr(1.5, 2.1, 0, 0.42, 2.9, 3.4, { celo: "#C49A6C", vrch: "#D9B588", bok: "#A9824F" }) + kvadr(1.62, 2.02, 0.42, 0.74, 2.98, 3.36, { celo: "#B98E60", vrch: "#D1AC7E", bok: "#9C7746" });
    garaz += cara3([1.5, 0.21, 2.9], [2.1, 0.21, 2.9], "#8A6A44", 0.01);
    for (const y of [0.0, 0.18]) {
      garaz += kotouc((yy) => kruznice(-2.15, yy, 1.35, 0.32), y + 0.17, 0.17, "#2B2B2B", "#1E1E1E");
      garaz += elipsaNaZemi(-2.15, 1.35, 0.17, 0.17, `fill="#4A4A4A"`, y + 0.171);
    }
    // staré kolo opřené o zeď
    for (const z of [3.9, 4.75]) {
      const kolo = Array.from({ length: 16 }, (_, i) => [X1 - 0.08, 0.34 + Math.sin((i / 16) * Math.PI * 2) * 0.33, z + Math.cos((i / 16) * Math.PI * 2) * 0.33] as B3);
      garaz += plocha(kolo, `fill="none" stroke="#2B2B2B" stroke-width="3"`);
    }
    garaz += cara3([X1 - 0.08, 0.34, 3.9], [X1 - 0.08, 0.7, 4.3], "#B5302A", 0.03) + cara3([X1 - 0.08, 0.7, 4.3], [X1 - 0.08, 0.34, 4.75], "#B5302A", 0.03) + cara3([X1 - 0.08, 0.7, 4.3], [X1 - 0.08, 0.92, 4.2], "#B5302A", 0.03);
    s += g(garaz, ` data-od="2" data-do="3"`);
    // březen: štafle a kýbl s barvou
    let stafle = "";
    stafle += cara3([1.9, 0, 2.2], [2.15, 1.7, 2.4], "#C9A37A", 0.04) + cara3([2.4, 0, 2.6], [2.15, 1.7, 2.4], "#C9A37A", 0.04);
    for (let i = 1; i < 6; i++) stafle += cara3([1.9 + i * 0.04, i * 0.28, 2.2 + i * 0.03], [2.4 - i * 0.04, i * 0.28, 2.6 - i * 0.03], "#B08660", 0.025);
    stafle += valec(1.4, 2.0, 0.14, 0, 0.3, ["#D6D2C8", "#FBF9F4", "#CFCBC1"], "#5B7FD1", `${p}-kybl-barva`);
    stafle += cara3([1.3, 0.3, 2.0], [1.1, 0.02, 1.7], "#5B7FD1", 0.03);
    s += g(stafle, ` data-od="3" data-do="4"`);
    // červen: mobil na stativu — začíná Instagram
    let mobil = "";
    mobil += cara3([0.25, 0, 1.75], [0.35, 1.25, 1.95], "#2B2420", 0.02) + cara3([0.45, 0, 1.75], [0.35, 1.25, 1.95], "#2B2420", 0.02) + cara3([0.35, 0, 2.15], [0.35, 1.25, 1.95], "#2B2420", 0.02);
    mobil += kvadr(0.26, 0.44, 1.25, 1.58, 1.94, 1.97, { celo: "#2B2420" });
    mobil += plocha([[0.28, 1.28, 1.938], [0.42, 1.28, 1.938], [0.42, 1.55, 1.938], [0.28, 1.55, 1.938]], `fill="#7DA7C9"`);
    const [rx, ry] = P(0.38, 1.53, 1.93);
    mobil += `<circle class="rok-nahrava" cx="${f(rx)}" cy="${f(ry)}" r="3" fill="#E2452E"/>`;
    s += g(mobil, ` data-od="6" data-do="7"`);
    // červenec: elektrikářova bedna a smotaný kabel
    s += g(
      kvadr(0.9, 1.35, 0, 0.26, 1.6, 1.85, { celo: "#C4432B", vrch: "#D9604A", bok: "#A93A25" }) +
        kvadr(1.0, 1.25, 0.26, 0.3, 1.68, 1.78, { celo: "#2B2B2B" }) +
        elipsaNaZemi(0.6, 1.7, 0.18, 0.1, `fill="none" stroke="#E2702E" stroke-width="5"`, 0.02),
      ` data-od="7" data-do="8"`,
    );
    return s;
  })();

  // Září: stojan s plakátem na dvorku
  const rokNejbliz = (() => {
    let s = "";
    s += cara3([-1.85, 0, -0.85], [-1.6, 1.0, -0.7], "#6E5236", 0.05) + cara3([-1.35, 0, -0.85], [-1.6, 1.0, -0.7], "#6E5236", 0.05);
    s += plocha([[-1.85, 0.25, -0.86], [-1.35, 0.25, -0.86], [-1.4, 0.95, -0.74], [-1.8, 0.95, -0.74]], `fill="#2E3A2E"`);
    const [tx, ty] = P(-1.6, 0.74, -0.78);
    const k = m(-0.78) / 300;
    s += `<g transform="translate(${f(tx)} ${f(ty)}) scale(${f(k)})"><text y="0" text-anchor="middle" font-size="26" fill="#F7F1E3" font-family="Caveat, cursive" font-weight="600">Den otevřených</text><text y="30" text-anchor="middle" font-size="26" fill="#F7F1E3" font-family="Caveat, cursive" font-weight="600">dveří</text><text y="64" text-anchor="middle" font-size="22" fill="#F3D27A" font-family="Caveat, cursive">každý pátek v září</text></g>`;
    return g(s, ` data-od="9" data-do="10"`);
  })();

  /* ════════ Pořadí kreslení: od zadní stěny dopředu ════════ */
  const SVGtelo = [
    venku,
    podlaha,
    zadni,
    leva,
    prava,
    taupe,
    strop,
    kouty,
    rok ? rokSkorepina : "",
    okenniSvetlo,
    rok ? "" : stiny,
    vstup,
    fikus,
    linkaA,
    knihovnicka,
    pilir,
    regal,
    pytle,
    lampa,
    rok ? rokPricka : "",
    radiator,
    linkaB,
    radiatorZidle,
    g(stulPreklizka + zidle(1.0, 4.36, "sever") + zidle(1.62, 4.36, "sever") + zidle(-1.18, 4.38, "jih") + zidle(-0.06, 4.38, "jih") + stulOval + zidle(-1.25, 2.82, "sever") + zidle(-0.12, 2.82, "sever"), ` class="dl-stoly"${od(4)}`),
    rok ? rokVpredu : "",
    g(elektrickyKruh(2), od(4)),
    pec,
    g(kopaciKruh(1, KRUHY[1].x, KRUHY[1].z) + kopaciKruh(0, KRUHY[0].x, KRUHY[0].z), ` class="dl-kruhy"${od(4)}`),
    ramOken,
    rok ? rokNejbliz : "",
  ].join("");

  /* ——— Klikací místa a kde stojí parta ——— */
  mista.pec = { box: boxKvadru(PEC.x - PEC.r - 0.1, PEC.x + PEC.r, 0, 1.32, PEC.z - PEC.r, PEC.z + PEC.r) };
  mista.kafe = { box: boxKvadru(-0.04, 0.26, 0.92, 1.36, 7.42, 7.72, 4) };
  mista.voda = { box: boxKvadru(-2.68, -2.2, 0.9, 1.42, 2.1, 2.66, 4) };
  // Lampa a dveře jen v horní části — dole jsou před nimi kruhy a ty mají přednost
  mista.lampa = { box: boxKvadru(1.7, 2.24, 1.2, 1.82, 5.8, 6.0, 4) };
  mista.dvere = { box: boxKvadru(-2.5, -1.6, 1.12, 2.05, Z1, Z1, 2) };
  mista.knihy = { box: boxKvadru(1.45, 1.86, 0, 1.36, 7.5, Z1, 2) };
  mista.glazury = { box: boxKvadru(0.1, 0.66, 1.55, 2.13, 7.45, 7.46, 2) };
  postav("pecinka", 1.45, 0, 0.45, 0.36);
  postav("samotka", PEC.x, PEC.nahore + 0.08, PEC.z, 0.2);
  // Vázička sedí na sedátku kopacího kruhu, Kachlík na dubové desce zídky u dveří
  postav("vazicka", KRUHY[0].x - 0.55, 0.6, KRUHY[0].z, 0.26);
  postav("hlinka", 2.15, 0.36, 6.42, 0.3);
  postav("stripek", X1 - 0.14, 1.744, 3.5, 0.16);
  postav("cedulka", 1.66, 1.47, 7.62, 0.2);
  postav("kapka", -2.3, 0.92, 2.36, 0.17);
  postav("kachlik", -2.25, 1.1, 6.58, 0.26);
  postav("kapka-kaluz", -0.6, 0.005, 2.9, 0.22);
  mista.klicGaraz = { box: boxKolem([P(0.3, 0, 3.4), P(0.62, 0.06, 3.4)], 6) };
  mista.klicPec = { box: boxKolem([P(1.6, 1.0, 0.66), P(1.74, 1.1, 0.66)], 6) };
  mista.klicSkrinka = { box: boxKolem([P(-0.98, 1.72, 7.55), P(-0.84, 1.82, 7.55)], 6) };
  mista.klicDvere = { box: boxKolem([P(-1.98, 1.1, 6.55), P(-1.8, 1.16, 6.55)], 6) };

  const kusy = produkty.slice(0, 4).map((k, i) => {
    const z = [3.3, 3.55, 4.75, 5.0][i];
    const y = [1.744, 1.744, 1.404, 1.404][i];
    const [nx, ny] = P(X1 - 0.14, y, z);
    const sc = (m(z) / 52) * (k.shape === "vase" ? 0.15 : 0.2);
    mista[`kus${i}`] = { box: boxKolem([[nx - 30 * sc, ny - 70 * sc], [nx + 30 * sc, ny + 4]], 2) };
    return `<g class="kus" data-kus="${i}">${nadoba(k.shape, nx, ny, sc, k.glaze)}</g>`;
  });

  /** Záběr kamery kolem bodů v prostoru: střed a rozměr v kresbě (x, y, w, h) */
  const zaber = (pts: B3[], okraj = 1.18, minW = 300): [number, number, number, number] => {
    const b = body(pts);
    const xs = b.map((q) => q[0]);
    const ys = b.map((q) => q[1]);
    const w = Math.max(minW, (Math.max(...xs) - Math.min(...xs)) * okraj);
    const h = (Math.max(...ys) - Math.min(...ys)) * okraj;
    // V rámu s poměrem 1,6 je vidět víc, než je záběr — střed se posune dovnitř kresby
    const vw = Math.min(DILNA_W, Math.max(w, h * 1.6));
    const vh = Math.min(DILNA_H, Math.max(h, w / 1.6));
    const cx = Math.min(DILNA_W - vw / 2, Math.max(vw / 2, (Math.max(...xs) + Math.min(...xs)) / 2));
    const cy = Math.min(DILNA_H - vh / 2, Math.max(vh / 2, (Math.max(...ys) + Math.min(...ys)) / 2));
    return [f(cx), f(cy), f(w), f(h)];
  };
  const kamery: Record<string, [number, number, number, number]> = {
    prehled: zaber([[X0, 0, 0], [X1, 0, 0], [X0, YU, 0], [X1, YU, 0]], 1.06),
    kruhy: zaber([[-1.75, 0, 0.5], [1.6, 0, 0.5], [-1.75, 1.0, 1.4], [1.6, 0.9, 2.5]], 1.12),
    stoly: zaber([[-1.9, 0, 2.6], [2.0, 0, 4.4], [-1.9, 1.0, 3.6], [2.0, 1.0, 5.6]], 1.1),
    pec: zaber([[1.5, 0, 0.4], [X1, 0, 0.4], [1.5, 1.45, 1.2], [X1, 1.7, 1.4]], 1.15),
    regal: zaber([[X1 - 0.3, 0, 1.5], [X1, 2.4, 1.5], [X1 - 0.3, 0, 6.9], [X1, 2.4, 6.9]], 1.12),
    voda: zaber([[X0, 0, 1.3], [-2.05, 0, 1.3], [X0, 2.15, 1.8], [-2.05, 0, 4.3], [X0, 2.15, 4.3]], 1.18),
    kafe: zaber([[-2.6, 0, Z1], [1.9, 0, Z1], [-2.6, 2.2, Z1], [1.9, 2.2, Z1], [-1.2, 0, 7.0]], 1.12),
  };

  void ELEKTRICKY;
  const svg = `<defs>${defs.join("")}</defs>${SVGtelo}<g class="dl-kusy"${od(8)}>${kusy.join("")}</g>`;
  return { svg, mista, kami, kamery };
}
