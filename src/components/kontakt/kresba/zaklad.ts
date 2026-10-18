/**
 * Společné kusy kreseb Kontaktu — provázkového telefonu venku i ústředny
 * uvnitř dílny. Kresby jsou text (SVG v řetězci) a skládají se v prohlížeči
 * podle velikosti okna, hodiny a ročního období (scripts/kontakt/scena.ts).
 *
 * Krajina bere techniky a třídy barev z úvodu (domek2/kresba/svitani.ts):
 * hřebeny, pole s mezemi, vesnice, stromy a pěšina mají třídy svt-*, takže
 * je přebarví styly ročních období ze svitaniStyly.
 *
 * Provázek je červenobílá šňůrka kōhaku jako Cedulčina — pás s tmavým
 * lemem a bílými šikmými proužky, které s hloubkou houstnou.
 */
import { nahoda, chomac } from "../../parta2/tvary";
import { vzorkuj, hladka, vyskaNa, lerp } from "../../domek2/kresba/krivky";
import type { Bod } from "../../domek2/kresba/krivky";
import { podobizna } from "../../obchod2/futatsu/podobizna";
import { LOUZE } from "../../obchod2/futatsu/tvar";
import type { PostavaId } from "../../../data/parta";

export { nahoda, chomac, vzorkuj, hladka, vyskaNa, lerp };
export type { Bod };

/** Zaokrouhlení na desetiny — kratší cesty */
export const f = (n: number) => Math.round(n * 10) / 10;
export const omez = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const hladce = (t: number) => {
  const q = omez(t);
  return q * q * (3 - 2 * q);
};

/** Hřeben krajiny od x0 do x1: body po `krok`, výška kolem `zaklad` s vlněním `amp` */
export function hreben(x0: number, x1: number, zaklad: number, amp: number, krok: number, seed: number): Bod[] {
  const R = nahoda(seed);
  const b: Bod[] = [];
  for (let x = x0; x <= x1 + krok; x += krok) b.push([x, zaklad + (R() - 0.5) * 2 * amp]);
  return b;
}

/** Plocha pod hranou až dolů */
export function plocha(hrana: Bod[], dole: number) {
  const b = vzorkuj(hrana, 40);
  return hladka([...b, [b[b.length - 1][0], dole], [b[0][0], dole]]);
}

/** Les na hřebeni: vroubky korun sedí na hraně kopce (jako na úvodu) */
export function les(hrana: Bod[], x0: number, x1: number, vyska: number, seed: number): string {
  const R = nahoda(seed);
  const B = vzorkuj(hrana, 8);
  const vrch: Bod[] = [];
  let x = x0;
  while (x < x1) {
    const r = vyska * (0.45 + R() * 0.55);
    vrch.push([x, vyskaNa(B, x) - r * (0.6 + R() * 0.5)]);
    x += r * (0.9 + R() * 0.6);
  }
  if (vrch.length < 2) return "";
  let d = `M${f(x0)} ${f(vyskaNa(B, x0) + 4)}`;
  vrch.forEach(([vx, vy], i) => {
    const r = i ? Math.hypot(vx - vrch[i - 1][0], vy - vrch[i - 1][1]) * 0.62 : vyska * 0.5;
    d += i ? ` A${f(r)} ${f(r)} 0 0 1 ${f(vx)} ${f(vy)}` : ` L${f(vx)} ${f(vy)}`;
  });
  const konec = vrch[vrch.length - 1][0];
  d += ` L${f(konec)} ${f(vyskaNa(B, konec) + 4)}`;
  for (let xx = konec; xx > x0; xx -= 30) d += ` L${f(xx)} ${f(vyskaNa(B, xx) + vyska * 0.9)}`;
  return d + " Z";
}

/** Pole na kopcích: hranice se rozbíhají k divákovi, v polích řádky, mezi nimi meze s keři */
export function pole(hrana: Bod[], hranice: number[], dole: number, stred: number, seed: number): string {
  const R = nahoda(seed);
  const B = vzorkuj(hrana, 8);
  const druhy = ["d", "a", "c", "b", "a", "d", "c", "a", "b", "c"];
  const out: string[] = [];
  const brazdy: string[] = [];
  const meze: string[] = [];
  const dolu = (x: number) => x + (x - stred) * 0.24;
  for (let i = 0; i < hranice.length - 1; i++) {
    const xa = hranice[i], xb = hranice[i + 1];
    const druh = druhy[i % druhy.length];
    const horni = vzorkuj([[xa, vyskaNa(B, xa)], [(xa + xb) / 2, vyskaNa(B, (xa + xb) / 2)], [xb, vyskaNa(B, xb)]], 30);
    const P: Bod[] = [...horni, [dolu(xb), dole], [dolu(xa), dole]];
    out.push(`<path class="svt-pole-${druh}" d="M${P.map(([x, y]) => `${f(x)} ${f(y)}`).join(" L")} Z"/>`);
    const n = druh === "c" ? 10 : 6;
    for (let k = 1; k < n; k++) {
      const x = lerp(xa, xb, k / n);
      brazdy.push(`M${f(x)} ${f(vyskaNa(B, x) + 3)}L${f(dolu(x))} ${f(dole)}`);
    }
    if (i > 0) {
      vzorkuj([[xa, vyskaNa(B, xa) + 2], [dolu(xa), dole]], 5).forEach(([x, y], k) => {
        if (R() < 0.9) meze.push(`<circle cx="${f(x + (R() - 0.5) * 3)}" cy="${f(y - 2)}" r="${f(3.2 + R() * 2.4 + k * 0.1)}"/>`);
      });
    }
  }
  return `<g>${out.join("")}</g><path class="svt-brazdy" d="${brazdy.join("")}" fill="none" stroke-width="1.5"/><g class="svt-mez">${meze.join("")}</g>`;
}

/** Ořech v údolí — vesnička se zdmi, střechami a kostelíkem; okna svítí večer */
export function vesnice(hrana: Bod[], mista: number[], kx: number | null, seed: number, m = 1): string {
  const R = nahoda(seed);
  const B = vzorkuj(hrana, 8);
  const domy: string[] = [], stromy: string[] = [], okna: string[] = [];
  mista.forEach((x, i) => {
    const w = (20 + R() * 10) * m, h = (12 + R() * 6) * m, y = vyskaNa(B, x) + (14 + R() * 12) * m;
    const stit = R() < 0.55;
    if (i % 2 === 0) stromy.push(`<path d="${chomac(x + w * 0.65, y - 9 * m, 11 * m, 12 * m, 8, seed + 100 + i, 0.8, 0.7)}"/>`);
    domy.push(`<rect class="svt-ves-zed" x="${f(x - w / 2)}" y="${f(y - h)}" width="${f(w)}" height="${f(h + 4)}"/>`);
    domy.push(`<rect class="svt-ves-stin" x="${f(x + w * 0.18)}" y="${f(y - h)}" width="${f(w * 0.32)}" height="${f(h + 4)}"/>`);
    domy.push(
      stit
        ? `<path class="svt-ves-strecha" d="M${f(x - w / 2 - 2)} ${f(y - h)} L${f(x)} ${f(y - h - w * 0.45)} L${f(x + w / 2 + 2)} ${f(y - h)} Z"/>`
        : `<path class="svt-ves-strecha" d="M${f(x - w / 2 - 2)} ${f(y - h)} L${f(x - w / 2 + 5 * m)} ${f(y - h - 9 * m)} L${f(x + w / 2 - 5 * m)} ${f(y - h - 9 * m)} L${f(x + w / 2 + 2)} ${f(y - h)} Z"/>`,
    );
    okna.push(`<rect x="${f(x - w * 0.3)}" y="${f(y - h * 0.62)}" width="${f(3.6 * m)}" height="${f(4 * m)}" rx="0.6"/>`);
    if (R() < 0.5) okna.push(`<rect x="${f(x + w * 0.05)}" y="${f(y - h * 0.62)}" width="${f(3.6 * m)}" height="${f(4 * m)}" rx="0.6"/>`);
  });
  if (kx !== null) {
    const ky = vyskaNa(B, kx) + 24 * m;
    const s = (v: number) => f(v * m);
    domy.push(`<rect class="svt-ves-zed" x="${f(kx - 17 * m)}" y="${f(ky - 18 * m)}" width="${s(30)}" height="${s(20)}"/>`);
    domy.push(`<path class="svt-ves-strecha" d="M${f(kx - 19 * m)} ${f(ky - 18 * m)} L${f(kx - 2 * m)} ${f(ky - 30 * m)} L${f(kx + 15 * m)} ${f(ky - 18 * m)} Z"/>`);
    domy.push(`<rect class="svt-ves-zed" x="${f(kx + 8 * m)}" y="${f(ky - 44 * m)}" width="${s(13)}" height="${s(46)}"/>`);
    domy.push(`<rect class="svt-ves-stin" x="${f(kx + 15 * m)}" y="${f(ky - 44 * m)}" width="${s(6)}" height="${s(46)}"/>`);
    domy.push(`<path class="svt-ves-vez" d="M${f(kx + 6 * m)} ${f(ky - 44 * m)} L${f(kx + 14.5 * m)} ${f(ky - 66 * m)} L${f(kx + 23 * m)} ${f(ky - 44 * m)} Z"/>`);
    domy.push(`<path class="svt-ves-kriz" stroke-width="1.2" d="M${f(kx + 14.5 * m)} ${f(ky - 66 * m)} L${f(kx + 14.5 * m)} ${f(ky - 74 * m)} M${f(kx + 11.5 * m)} ${f(ky - 71 * m)} L${f(kx + 17.5 * m)} ${f(ky - 71 * m)}"/>`);
    okna.push(`<circle cx="${f(kx + 14.5 * m)}" cy="${f(ky - 34 * m)}" r="${s(2.4)}"/>`);
  }
  return `<g class="svt-ves-stromy">${stromy.join("")}</g><g>${domy.join("")}</g><g class="svt-ves-okna ko-okna-vsi">${okna.join("")}</g>`;
}

/** Kulatý strom se stínem doprava (slunce je vlevo nízko) */
export function strom(x: number, y: number, s: number, i: number, stin = true) {
  return `<g>
    ${stin ? `<ellipse class="svt-stin" cx="${f(x + s * 1.1)}" cy="${f(y + s * 0.96)}" rx="${f(s * 1.4)}" ry="${f(s * 0.16)}"/>` : ""}
    <path class="svt-kmen" d="M${f(x)} ${f(y + s)} L${f(x)} ${f(y + s * 0.2)}" stroke-width="${f(s * 0.16)}"/>
    <path class="svt-strom-a" d="${chomac(x, y, s * 0.72, s * 0.8, 9, 7600 + i, 0.85, 0.7)}"/>
    <path class="svt-strom-b" d="${chomac(x - s * 0.18, y - s * 0.22, s * 0.44, s * 0.44, 8, 7700 + i, 1, 0.7)}"/>
    <path class="svt-strom-snih" d="${chomac(x - s * 0.1, y - s * 0.5, s * 0.5, s * 0.2, 8, 7800 + i, 1, 0.7)}"/>
  </g>`;
}

/** Bříza: štíhlý bílý kmen a řídká koruna, barvu listí dává roční období (ko-briza-1/2) */
export function briza(x: number, y: number, s: number, i: number) {
  const R = nahoda(9100 + i);
  let listi = "";
  for (let k = 0; k < 7; k++) {
    const a = -Math.PI / 2 + (R() - 0.5) * 1.6, d = s * (0.3 + R() * 0.55);
    listi += `<path class="ko-briza-${k % 2 ? 1 : 2}" d="${chomac(x + Math.cos(a) * d * 0.7, y - s * 1.3 + Math.sin(a) * d * 0.5 + s * 0.4, s * (0.32 + R() * 0.16), s * (0.26 + R() * 0.12), 8, 9200 + i * 10 + k, 0.9, 0.7)}"/>`;
  }
  return `<g>
    <ellipse class="svt-stin" cx="${f(x + s * 1.2)}" cy="${f(y)}" rx="${f(s * 1.3)}" ry="${f(s * 0.12)}"/>
    <path d="M${f(x)} ${f(y)} C${f(x + 1)} ${f(y - s * 0.6)} ${f(x - 2)} ${f(y - s)} ${f(x + 1)} ${f(y - s * 1.5)}" stroke="#EFE9DF" stroke-width="${f(s * 0.09)}" fill="none"/>
    <path d="M${f(x - s * 0.02)} ${f(y - s * 0.3)} h${f(s * 0.05)} M${f(x)} ${f(y - s * 0.62)} h${f(s * 0.04)} M${f(x - s * 0.01)} ${f(y - s * 0.95)} h${f(s * 0.05)}" stroke="#3B322A" stroke-width="${f(s * 0.03)}"/>
    ${listi}
  </g>`;
}

/** Pěšina od brány, k divákovi se rozšiřuje; vrací i osu (pro zvýraznění cesty) */
export function pesina(osa: Bod[], w0: number, w1: number, t0: number, t1: number) {
  const L: Bod[] = [], P: Bod[] = [], S: Bod[] = [];
  const B = vzorkuj(osa, 6);
  B.forEach(([x, y], i) => {
    const t = Math.max(0, (y - t0) / (t1 - t0));
    const w = lerp(w0, w1, Math.pow(t, 1.1));
    const a = B[Math.max(0, i - 1)], b = B[Math.min(B.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    L.push([x - (dy / l) * w * 0.5, y + (dx / l) * w * 0.5]);
    P.push([x + (dy / l) * w * 0.5, y - (dx / l) * w * 0.5]);
    S.push([x - (dy / l) * w * 0.12, y + (dx / l) * w * 0.12]);
  });
  const svg = `<path class="svt-cesta" d="${hladka([...L, ...P.reverse()])}"/>
    <path class="svt-cesta-svetlo" d="${hladka(vzorkuj(S, 12), false)}" fill="none" stroke-width="2.6" stroke-linecap="round"/>`;
  return { svg, osa: hladka(B, false) };
}

/* ═══ Provázek kōhaku ═══ */

/** Bod provázku: poloha, úhel tečny, měřítko hloubky a šířka */
export interface BodProvazku {
  x: number;
  y: number;
  uhel: number;
  m: number;
  w: number;
}

export interface Provazek {
  /** Tmavý lem, červené jádro a bílé proužky kroucení */
  lem: string;
  jadro: string;
  zkrut: string;
  /** Neviditelná široká cesta pro chytání myší a prstem */
  osa: string;
  bod: (t: number) => BodProvazku;
}

/**
 * Pás provázku podle vzorkovače `tvar(t)` (t od 0 u nás do 1 na druhém
 * konci). Šířka ubývá s hloubkou: `w0` u nás, `w1` vzadu, `hloubka` říká,
 * jak rychle (0 = rovnoměrně).
 */
export function provazek(tvar: (t: number) => Bod, w0: number, w1: number, hloubka = 1.9, N = 140): Provazek {
  const body: Bod[] = [];
  for (let i = 0; i <= N; i++) body.push(tvar(i / N));
  const meritko = (t: number) => 1 / (1 + hloubka * t);
  const m1 = meritko(1);
  const w = (t: number) => (hloubka > 0.001 ? w1 + ((w0 - w1) * (meritko(t) - m1)) / (1 - m1) : lerp(w0, w1, t));
  const smer = (i: number) => {
    const a = body[Math.max(0, i - 1)], b = body[Math.min(N, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    return [dx / l, dy / l] as Bod;
  };
  const pas = (pridat: number) => {
    const L: string[] = [], P: string[] = [];
    body.forEach(([x, y], i) => {
      const [tx, ty] = smer(i);
      const h = (w(i / N) + pridat) / 2;
      L.push(`${f(x - ty * h)} ${f(y + tx * h)}`);
      P.push(`${f(x + ty * h)} ${f(y - tx * h)}`);
    });
    return `M${L.join("L")}L${P.reverse().join("L")}Z`;
  };
  let zkrut = "";
  let s = 0;
  for (let i = 1; i <= N; i++) {
    const [x, y] = body[i];
    const t = i / N;
    s += Math.hypot(x - body[i - 1][0], y - body[i - 1][1]);
    const krok = 7.2 * meritko(t) + 1.2;
    if (s >= krok) {
      s = 0;
      const [tx, ty] = smer(i);
      const h = w(t) * 0.42, k = w(t) * 0.55;
      zkrut += `M${f(x - ty * h - tx * k)} ${f(y + tx * h - ty * k)}L${f(x + ty * h + tx * k)} ${f(y - tx * h + ty * k)}`;
    }
  }
  const bod = (t: number): BodProvazku => {
    const q = omez(t) * N;
    const i = Math.min(N - 1, Math.floor(q));
    const u = q - i;
    const x = lerp(body[i][0], body[i + 1][0], u), y = lerp(body[i][1], body[i + 1][1], u);
    const [tx, ty] = smer(Math.round(q));
    return { x, y, uhel: (Math.atan2(ty, tx) * 180) / Math.PI, m: meritko(t) / meritko(0), w: w(t) };
  };
  const osa = `M${body.map(([x, y]) => `${f(x)} ${f(y)}`).join("L")}`;
  return { lem: pas(1.6), jadro: pas(0), zkrut, osa, bod };
}

/** Prohnutý provázek z A do B: parabola s průhybem dolů (a volitelně výchylka navíc) */
export const prohnuty = (A: Bod, B: Bod, prohyb: number, vychylka?: (t: number) => number) => (t: number): Bod => [
  lerp(A[0], B[0], t),
  lerp(A[1], B[1], t) + prohyb * 4 * t * (1 - t) + (vychylka ? vychylka(t) : 0),
];

/** SVG provázku se stálými třídami, aby šel přepisovat po snímcích */
export const provazekSvg = (p: Provazek, trida = "", w0 = 2) => `<g class="ko-provaz ${trida}">
    <path class="ko-provaz-lem" d="${p.lem}"/>
    <path class="ko-provaz-jadro" d="${p.jadro}"/>
    <path class="ko-provaz-zkrut" d="${p.zkrut}" stroke-width="${f(w0 * 0.34)}" stroke-linecap="round"/>
  </g>`;

/* ═══ Drobnosti na provázku ═══ */

/** Vrabec sedí nohama v bodě 0,0 a hledí doprava */
export function vrabec() {
  return `<g class="ko-vrabec-sedi">
    <path d="M-3 -2 L-4 1 M3 -2 L4 1" stroke="#6E5444" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M-7 1.2 Q-3.5 -0.6 0 1.2 M1.5 1.2 Q4.5 -0.6 7.5 1.2" stroke="#6E5444" stroke-width="1.3" fill="none" stroke-linecap="round"/>
    <path d="M-12 -13 L-27 -19 L-26 -14 L-13 -8 Z" fill="#6A4630"/>
    <ellipse cx="0" cy="-12" rx="14" ry="10.5" fill="#A87750" transform="rotate(-10 0 -12)"/>
    <ellipse cx="3" cy="-7.5" rx="10" ry="6.6" fill="#EBE0CC"/>
    <path d="M-12 -14 C-8 -22 4 -22 8 -15 C3 -11 -6 -9 -12 -14 Z" fill="#7B5034"/>
    <path d="M-9 -15 C-5 -18 1 -18 4 -16" stroke="#F0E6D2" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <circle cx="11" cy="-21" r="7.8" fill="#8F6040"/>
    <path d="M5 -25 C8 -30 15 -30 18 -25 C14 -23.5 9 -23.5 5 -25 Z" fill="#8C8A86"/>
    <ellipse cx="13.2" cy="-18.6" rx="4.6" ry="3.6" fill="#F2ECE2"/>
    <ellipse cx="15.4" cy="-14.6" rx="3.2" ry="2.8" fill="#2E2622"/>
    <circle cx="13.6" cy="-22.4" r="1.7" fill="#1C1714"/><circle cx="14.1" cy="-22.9" r="0.55" fill="#FFF"/>
    <path d="M18 -22 L23.5 -20.4 L18 -18.6 Z" fill="#4A3A2E"/>
    <ellipse cx="8.5" cy="-17.4" rx="2.6" ry="1.6" fill="#E8A08A" opacity="0.45"/>
  </g>
  <g class="ko-vrabec-leti">
    <path d="M-10 -14 C-14 -32 -6 -44 6 -48 C2 -36 2 -24 -2 -14 Z" fill="#7B5034"/>
    <path d="M-6 -18 C-6 -28 -2 -36 4 -42" stroke="#F0E6D2" stroke-width="1.4" fill="none" stroke-linecap="round"/>
    <path d="M-10 -10 L-24 -12 L-22 -6 L-10 -6 Z" fill="#6A4630"/>
    <ellipse cx="0" cy="-10" rx="12" ry="8" fill="#A87750"/>
    <ellipse cx="2" cy="-7" rx="8" ry="4.6" fill="#EBE0CC"/>
    <path d="M-4 -13 C2 -28 14 -36 24 -34 C16 -26 8 -16 2 -12 Z" fill="#8B5C3B"/>
    <circle cx="11" cy="-16" r="6.4" fill="#8F6040"/>
    <path d="M6 -20 C9 -24 14 -24 16.5 -20 C13 -19 9 -19 6 -20 Z" fill="#8C8A86"/>
    <ellipse cx="13" cy="-14.6" rx="3.6" ry="2.8" fill="#F2ECE2"/>
    <circle cx="13.2" cy="-17.4" r="1.4" fill="#1C1714"/>
    <path d="M17 -17 L21.5 -15.6 L17 -14.2 Z" fill="#4A3A2E"/>
  </g>`;
}

/** Visačka s otázkou: visí z bodu 0,0 na niti dlouhé `nit` */
export function visacka(text: string, sirka: number, nit: number) {
  const w = sirka, h = 44;
  const obrys = `M${-w / 2 + 3} 8 L${-w / 2 + 12} 0 L${w / 2 - 12} 0 L${w / 2 - 3} 8 L${w / 2} ${h - 4} Q${w / 2} ${h} ${w / 2 - 4} ${h} L${-w / 2 + 4} ${h} Q${-w / 2} ${h} ${-w / 2} ${h - 4} Z`;
  return `<path d="M0 0 C-4 6 -3 ${nit * 0.7} 0 ${nit}" stroke="#7A6A58" stroke-width="1.2" fill="none"/>
    <path d="M0 0 C4 6 3 ${nit * 0.7} 0 ${nit}" stroke="#7A6A58" stroke-width="1.2" fill="none"/>
    <g transform="translate(0 ${nit})">
      <path d="${obrys}" fill="#2B2420" opacity="0.14" transform="translate(3 4)"/>
      <path class="ko-visacka-papir" d="${obrys}" fill="#FCF8EE" stroke="#CDBFA6" stroke-width="1"/>
      <circle cx="0" cy="7" r="3.6" fill="none" stroke="#C9A86E" stroke-width="2"/>
      <circle cx="0" cy="7" r="1.6" fill="#B8AB96"/>
      <text class="ko-ruka-tucne" x="0" y="${h - 11}" text-anchor="middle" font-size="21" fill="#2B2420">${text}</text>
    </g>`;
}

/**
 * 結び文 (musubi-bumi): dopis složený do úzkého proužku washi a zavázaný
 * na jeden uzel, na delším konci 〆 a rumělková tečka. Střed uzlu je 0,0,
 * proužek leží šikmo zleva nahoře doprava dolů (asi 90 × 40 jednotek).
 */
export function musubiBumi() {
  const P = "#FBF8F0", L = "#CFC2AA", S = "#E9E0CD";
  /* rameno: proužek od uzlu ven, šikmo seříznutý konec */
  const rameno = (posun: string, uhel: number, delka: number, w: number, konec = "") => `<g transform="${posun} rotate(${uhel})">
      <path d="M0 ${f(-w / 2)} L${delka - 4} ${f(-w / 2 - 0.6)} L${delka} ${f(w / 2 + 0.8)} L0 ${f(w / 2)} Z" fill="${P}" stroke="${L}" stroke-width="0.9" stroke-linejoin="round"/>
      <path d="M2 0.6 L${delka - 3} 0.9" stroke="${S}" stroke-width="0.9"/>${konec}</g>`;
  const smycka = (barva: string, w: number, carky = "") => `<ellipse rx="12.5" ry="9.6" transform="rotate(-24)" fill="none" stroke="${barva}" stroke-width="${w}"${carky}/>`;
  return `<ellipse cx="4" cy="6" rx="32" ry="8" fill="#2B2420" opacity="0.1" transform="rotate(16)"/>
    ${rameno("translate(-10 3)", -162, 30, 6.8)}
    ${smycka(L, 8.4)}${smycka(P, 6.8)}${smycka(S, 0.8, ' stroke-dasharray="14 6"')}
    ${rameno("translate(-13 -4)", 22, 46, 6.8, `<text class="ko-kanji" x="33" y="3" font-size="8" text-anchor="middle" fill="#2B2420">〆</text><circle cx="41" cy="0.3" r="1.9" fill="#C4432B"/>`)}`;
}

/** Dopis na kladce: 結び文 visí na niti pod kladkou (kladka v bodě 0,0) */
export function dopis() {
  return `<g class="ko-kladka"><path d="M-9 -2 L9 -2" stroke="#8A6A48" stroke-width="2.4" stroke-linecap="round"/>
      <circle cx="0" cy="-3.5" r="6.4" fill="#B88A3E"/><circle cx="0" cy="-3.5" r="4.6" fill="#D9B062"/><circle cx="0" cy="-3.5" r="1.5" fill="#6E5226"/></g>
    <path d="M0 -1 L1 15" stroke="#8A6A48" stroke-width="1.6"/>
    <g transform="translate(1 24) rotate(-6) scale(0.95)">${musubiBumi()}</g>`;
}

/** Padající list ořešáku (lichozpeřený lístek) */
export function list(barva: string) {
  return `<path d="M0 0 C5 -5 14 -5 20 0 C14 5 5 5 0 0 Z" fill="${barva}"/>
    <path d="M0 0 L19 0" stroke="#7A4E2C" stroke-opacity="0.45" stroke-width="0.9"/>`;
}

/** Cedulka na bráně: 営業中 (otevřeno), nebo 準備中 (připravujeme) — svisle */
export function cedulkaBrany(otevreno: boolean) {
  const znaky = otevreno ? ["営", "業", "中"] : ["準", "備", "中"];
  return `<path d="M-7 0 L0 -9 L7 0" stroke="#7A5A3A" stroke-width="1.2" fill="none"/>
    <rect x="-11" y="0" width="22" height="46" rx="2" fill="#2B2420" opacity="0.18" transform="translate(1.6 2)"/>
    <rect x="-11" y="0" width="22" height="46" rx="2" fill="${otevreno ? "#E9D3A8" : "#D9CCB4"}" stroke="#8A6A48" stroke-width="1.2"/>
    <rect x="-8.6" y="2.6" width="17.2" height="40.8" rx="1" fill="none" stroke="#B48E5E" stroke-width="0.6"/>
    ${znaky.map((z, i) => `<text class="ko-kanji" x="0" y="${14 + i * 13}" text-anchor="middle" font-size="11" fill="${i === 2 && otevreno ? "#C4432B" : "#2B2420"}">${z}</text>`).join("")}`;
}

/** Noren ve dveřích dílny — visí jen, když je otevřeno */
export function noren(x: number, y: number, w: number, h: number) {
  let pruhy = "";
  for (let i = 0; i < 3; i++) {
    const x0 = x + (w / 3) * i + 0.8, x1 = x + (w / 3) * (i + 1) - 0.8;
    pruhy += `<path d="M${f(x0)} ${f(y)} L${f(x1)} ${f(y)} L${f(x1 + 0.6)} ${f(y + h)} Q${f((x0 + x1) / 2)} ${f(y + h + 1.6)} ${f(x0 - 0.4)} ${f(y + h)} Z" fill="#2E3E66"/>`;
  }
  return `<g class="ko-noren"><rect x="${f(x - 2)}" y="${f(y - 2)}" width="${f(w + 4)}" height="2.4" fill="#6F4F37"/>${pruhy}<circle cx="${f(x + w / 2)}" cy="${f(y + h * 0.5)}" r="${f(h * 0.2)}" fill="none" stroke="#F3ECDF" stroke-width="1.3"/></g>`;
}

/**
 * Kami ze spritu stránky (kontakt.astro vykreslí celou partu jednou do
 * <svg width="0">, tady se jen odkazuje). Kresba kami má rámec 180 × 180;
 * `x, y` je levý horní roh rámce, `velikost` jeho strana v jednotkách scény.
 * Posouvá se obalová skupina — filtr na <use x> by Chrome počítal jinde.
 */
export const kami = (id: PostavaId, x: number, y: number, velikost: number, trida = "", otoc = 0) =>
  `<g class="ko-kami ${trida}" data-kami="${id}" transform="translate(${f(x)} ${f(y)})${otoc ? ` rotate(${f(otoc)} ${f(velikost / 2)} ${f(velikost)})` : ""} scale(${Math.round((velikost / 180) * 10000) / 10000})"><use href="#ko-k-${id}"/></g>`;

/**
 * Futatsu jako sluchátko: podobizna z krámku v libovolném natočení.
 * `rot` otáčí celou kresbu kolem bodu osy (0, 38); `naObraz` přepočte bod
 * podobizny (mm, pata v 0,76) do scény — pata je tam, kudy vede provázek.
 */
export function hrnek(o: { id: string; x: number; y: number; s: number; rot: number; uhel: number; nadhled: number; uzel?: boolean; svetlo?: "vlevo" | "shora" }) {
  const k = podobizna({ id: o.id, uhel: o.uhel, nadhled: o.nadhled, svetlo: o.svetlo ?? "shora", stin: false });
  const a = (o.rot * Math.PI) / 180;
  const naObraz = (px: number, py: number): Bod => {
    const X = o.s * px, Y = o.s * (py - 38);
    return [o.x + X * Math.cos(a) - Y * Math.sin(a), o.y + X * Math.sin(a) + Y * Math.cos(a)];
  };
  /* uzlík ve dně: dírka, konec provázku a bambusová zarážka — uprostřed
     světlého jezírka na dně (LOUZE, otáčí se s hrnkem; průmět jako v podobizna.ts),
     o kousek větší, ať je z dálky vidět */
  const n = (Math.max(0, Math.min(90, o.nadhled)) * Math.PI) / 180;
  const A = (o.uhel * Math.PI) / 180;
  const cn = Math.cos(n), sn = Math.sin(n);
  /* střed jezírka v průmětu */
  const jezirko = LOUZE.map(([x, z]): Bod => [x * Math.cos(A) + z * Math.sin(A), 76 + (66.2 - 76) * cn + (-x * Math.sin(A) + z * Math.cos(A)) * sn]);
  const dnoX = jezirko.reduce((t, b) => t + b[0], 0) / jezirko.length, dnoY = jezirko.reduce((t, b) => t + b[1], 0) / jezirko.length;
  const uzel = `<g transform="translate(${f(dnoX)} ${f(dnoY)}) scale(1.3) translate(0 -73.4)">
    <ellipse cx="0" cy="73.4" rx="1.7" ry="1.5" fill="#3B2A1B" opacity="0.8"/>
    <path d="M0 73.4 C2 71 3 70 4.4 71.6" stroke="#B84A2B" stroke-width="1" fill="none" stroke-linecap="round"/>
    <path d="M0 73.4 C2 71 3 70 4.4 71.6" stroke="#FBF7EE" stroke-width="1" fill="none" stroke-dasharray="0.8 0.9"/>
    <g transform="rotate(-14 0 72)"><rect x="-8.5" y="70.6" width="16" height="2.4" rx="1.2" fill="#C9AE72"/><rect x="-8.5" y="70.6" width="16" height="0.9" rx="0.45" fill="#E6D3A2"/></g>
  </g>`;
  const svg = `<g transform="translate(${f(o.x)} ${f(o.y)}) rotate(${f(o.rot)}) scale(${o.s}) translate(0 -38)">${k}${o.uzel ? uzel : ""}</g>`;
  return { svg, naObraz };
}
