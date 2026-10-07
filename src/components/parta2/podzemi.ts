/**
 * Kresby pod loukou pro patičku: hlína, kořeny ořechu, vrstvy a nálezy.
 * Běží při buildu, náhoda je deterministická (tvary.ts), takže se kresba
 * při každém sestavení nepřekreslí jinak. Vzniklo z návrhu
 * navrhy/paticka-orech-ted.html.
 */
import { nahoda, chomac } from "./tvary";
import { vrstvy, type VrstvaId } from "../../data/paticka";

type Bod = [number, number];

const f = (n: number) => Math.round(n * 10) / 10;
const pt = (p: Bod) => `${f(p[0])} ${f(p[1])}`;
const cara = (body: Bod[]) => "M" + body.map(pt).join(" L");
const omez = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));

/** Body na hladké křivce (Catmull-Rom) — pro tahy s proměnnou šířkou */
const vzorkuj = (P: Bod[], naUsek = 6) => {
  const n = P.length;
  const g = (i: number) => P[omez(i, 0, n - 1)];
  const out: Bod[] = [];
  for (let i = 0; i < n - 1; i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
    const c1: Bod = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Bod = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    for (let k = 0; k < naUsek; k++) {
      const t = k / naUsek, u = 1 - t;
      out.push([
        u * u * u * p1[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p2[0],
        u * u * u * p1[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p2[1],
      ]);
    }
  }
  out.push(P[n - 1]);
  return out;
};

/** Lomená čára s proměnnou šířkou → uzavřený tvar; sirka(t) pro t 0…1 */
const pas = (B: Bod[], sirka: (t: number) => number) => {
  const L: Bod[] = [], R: Bod[] = [];
  const n = B.length;
  for (let i = 0; i < n; i++) {
    const a = B[Math.max(0, i - 1)], b = B[Math.min(n - 1, i + 1)];
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = -(b[1] - a[1]) / d, ny = (b[0] - a[0]) / d;
    const w = sirka(i / (n - 1)) / 2;
    L.push([B[i][0] + nx * w, B[i][1] + ny * w]);
    R.push([B[i][0] - nx * w, B[i][1] - ny * w]);
  }
  return `${cara(L)} L${R.reverse().map(pt).join(" L")} Z`;
};

/** Nepravidelný obrys kamene nebo střepu */
const obrys = (cx: number, cy: number, rx: number, ry: number, pocet: number, seed: number, rozptyl = 0.22) => {
  const r = nahoda(seed);
  const P: Bod[] = [];
  for (let i = 0; i < pocet; i++) {
    const a = (i / pocet) * Math.PI * 2 + (r() - 0.5) * 0.25;
    const k = 1 - rozptyl / 2 + r() * rozptyl;
    P.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  return P;
};

/**
 * Kořeny ořechu. Kreslí se od horního okraje dolů: hlavní kořeny jsou
 * náhodné procházky, které táhne tíha dolů, z nich odbočují tenčí
 * a z těch vlásečnice. Souřadnice odpovídají stromu z Orech.astro
 * (viewBox 1000 široký, kmen na 503).
 */
export const koreny = () => {
  const r = nahoda(777);
  const tvary: { d: string; u: number }[] = [];
  const svetla: string[] = [];
  const vlasy: string[] = [];
  const koren = (x0: number, y0: number, uhel: number, delka: number, sila: number, uroven: number) => {
    const B: Bod[] = [[x0, y0]];
    let x = x0, y = y0, a = uhel;
    const krok = 30;
    const n = Math.max(3, Math.round(delka / krok));
    for (let i = 0; i < n && y < 1000; i++) {
      a += (r() - 0.5) * 0.42;
      a += (Math.PI / 2 - a) * (uroven === 0 ? 0.035 : 0.05);
      x += Math.cos(a) * krok;
      y += Math.sin(a) * krok;
      B.push([x, y]);
    }
    const huste = vzorkuj(B, 3);
    tvary.push({ d: pas(huste, (t) => sila * Math.pow(1 - t, 0.85) + 1.2), u: uroven });
    if (sila > 9) svetla.push(pas(huste.map((p): Bod => [p[0] - sila * 0.16, p[1] - sila * 0.12]), (t) => sila * 0.22 * Math.pow(1 - t, 0.9) + 0.4));
    if (uroven < 2) {
      for (let k = 0; k < (uroven === 0 ? 4 : 2); k++) {
        const i = Math.floor((0.2 + r() * 0.65) * (B.length - 1));
        const [bx, by] = B[i];
        const dalsi = B[Math.min(B.length - 1, i + 1)];
        const smer = Math.atan2(dalsi[1] - by, dalsi[0] - bx);
        const tloustka = sila * Math.pow(1 - i / (B.length - 1), 0.85);
        koren(bx, by, smer + (r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.6), delka * (0.3 + r() * 0.25), tloustka * 0.42, uroven + 1);
      }
    } else {
      const [ex, ey] = B[B.length - 1];
      for (let k = 0; k < 4; k++) {
        const u = r() * Math.PI * 2;
        const d = 10 + r() * 22;
        vlasy.push(`M${f(ex)} ${f(ey)} q${f(Math.cos(u) * d * 0.5 + (r() - 0.5) * 8)} ${f(Math.sin(u) * d * 0.5)} ${f(Math.cos(u) * d)} ${f(Math.sin(u) * d)}`);
      }
    }
  };
  const HLAVNI: [number, number, number, number][] = [
    [270, Math.PI - 0.12, 1300, 30],
    [310, Math.PI - 0.42, 900, 44],
    [400, Math.PI / 2 + 0.5, 950, 54],
    [500, Math.PI / 2 + 0.04, 1000, 62],
    [610, Math.PI / 2 - 0.45, 950, 52],
    [700, 0.42, 900, 44],
    [760, 0.1, 1200, 30],
  ];
  for (const [x, a, d, s] of HLAVNI) koren(x, 0, a, d, s, 0);
  /* Desetiny při tomhle měřítku nikdo nepozná a kořeny jsou na každé stránce */
  const cele = (d: string) => d.replace(/(\d)\.\d/g, "$1");
  const vrstva = (u: number) => tvary.filter((t) => t.u === u).map((t) => `<path d="${cele(t.d)}"/>`).join("");
  return (
    `<svg viewBox="-1000 0 3000 1100" preserveAspectRatio="xMidYMin meet" aria-hidden="true">` +
    `<g fill="#3E3329">${vrstva(2)}</g>` +
    `<g fill="none" stroke="#5A4A3A" stroke-width="1.4" stroke-linecap="round" opacity="0.7">${vlasy.map((d) => `<path d="${d}"/>`).join("")}</g>` +
    `<g fill="#46392E">${vrstva(1)}</g>` +
    `<g fill="#4E4136">${vrstva(0)}</g>` +
    `<g fill="#7A6A58" opacity="0.38">${svetla.map((d) => `<path d="${cele(d)}"/>`).join("")}</g>` +
    `</svg>`
  );
};

/** Textura hlíny: kořínky trávy u povrchu, kamínky, zrnka a dvě žížaly */
export const puda = (sirka = 1600, vyska = 1100, seed = 31) => {
  const r = nahoda(seed);
  let s = `<svg viewBox="0 0 ${sirka} ${vyska}" preserveAspectRatio="xMidYMin slice" aria-hidden="true">`;
  s += `<g stroke="#7A6A48" stroke-width="1.2" fill="none" stroke-linecap="round" opacity="0.55">`;
  for (let i = 0; i < 280; i++) {
    const x = r() * sirka;
    const h = 18 + r() * 70;
    s += `<path d="M${f(x)} 0 q${f((r() - 0.5) * 14)} ${f(h * 0.5)} ${f((r() - 0.5) * 18)} ${f(h)}"/>`;
  }
  s += `</g>`;
  const BARVY = ["#5A4C3F", "#6B5D4F", "#4A3F35", "#7A6A58", "#857462", "#3F362E"];
  for (let i = 0; i < 150; i++) {
    const x = r() * sirka, y = 60 + r() * (vyska - 60);
    const rx = 2 + r() * (r() < 0.08 ? 16 : 6), ry = rx * (0.55 + r() * 0.35);
    const u = Math.round((r() - 0.5) * 60);
    const b = BARVY[Math.floor(r() * BARVY.length)];
    s += `<g transform="translate(${f(x)} ${f(y)}) rotate(${u})"><ellipse rx="${f(rx)}" ry="${f(ry)}" fill="${b}"/>${rx > 5 ? `<ellipse cx="${f(-rx * 0.25)}" cy="${f(-ry * 0.3)}" rx="${f(rx * 0.45)}" ry="${f(ry * 0.3)}" fill="#A08E78" opacity="0.35"/>` : ""}</g>`;
  }
  s += `<g fill="#B8A890" opacity="0.28">`;
  for (let i = 0; i < 240; i++) s += `<circle cx="${f(r() * sirka)}" cy="${f(r() * vyska)}" r="${f(0.6 + r() * 1.1)}"/>`;
  s += `</g>`;
  for (const [x, y, u] of [[sirka * 0.12, vyska * 0.62, 12], [sirka * 0.58, vyska * 0.84, -20]]) {
    const cesta = "M0 0 C14 -10 26 8 40 0 C52 -7 60 4 68 0";
    s += `<g transform="translate(${f(x)} ${f(y)}) rotate(${u})"><path d="${cesta}" stroke="#B9837B" stroke-width="5.5" stroke-linecap="round" fill="none"/><path d="${cesta}" stroke="#D8A79E" stroke-width="1.6" stroke-linecap="round" fill="none" opacity="0.6" transform="translate(0 -1.2)"/><path d="M22 -1 v5 M26 0 v5" stroke="#A06A62" stroke-width="1.2"/></g>`;
  }
  return s + `</svg>`;
};

/** Pozadí jedné vrstvy: barva, nahoře zvlněný přechod z vrstvy nad ní, textura */
export const vrstva = (i: number, sirka = 1600, vyska = 420) => {
  const V = vrstvy[i];
  const nad = i === 0 ? "#2A221B" : vrstvy[i - 1].barva;
  const r = nahoda(500 + i * 17);
  let s = `<svg viewBox="0 0 ${sirka} ${vyska}" preserveAspectRatio="xMidYMin slice" aria-hidden="true">`;
  s += `<rect width="${sirka}" height="${vyska}" fill="${V.barva}"/>`;
  const hrana: Bod[] = [];
  for (let x = 0; x <= sirka; x += 80) hrana.push([x, 10 + r() * 22]);
  s += `<path d="M0 0 L${hrana.map(pt).join(" L")} L${sirka} 0 Z" fill="${nad}"/>`;
  const textury: Record<VrstvaId, () => string> = {
    orech: () => {
      let t = `<g stroke="#5E4C3A" stroke-width="1.3" fill="none" opacity="0.6">`;
      for (let k = 0; k < 60; k++) {
        const x = r() * sirka, y = 30 + r() * (vyska - 40);
        t += `<path d="M${f(x)} ${f(y)} q${f((r() - 0.5) * 30)} ${f(10 + r() * 20)} ${f((r() - 0.5) * 40)} ${f(20 + r() * 30)}"/>`;
      }
      return t + `</g>`;
    },
    kachel: () => {
      let t = "";
      for (let k = 0; k < 70; k++) {
        const x = r() * sirka, y = 40 + r() * (vyska - 50), w = 3 + r() * 9;
        t += `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(w * 0.6)}" rx="1" fill="${["#8A4A34", "#A0583C", "#1E1A16", "#B8AE9C"][Math.floor(r() * 4)]}" transform="rotate(${Math.round((r() - 0.5) * 60)} ${f(x)} ${f(y)})" opacity="0.8"/>`;
      }
      return t;
    },
    vlnice: () => {
      let t = `<path d="M0 ${vyska * 0.62} C${sirka * 0.2} ${vyska * 0.56} ${sirka * 0.45} ${vyska * 0.7} ${sirka * 0.7} ${vyska * 0.6} S${sirka * 0.95} ${vyska * 0.64} ${sirka} ${vyska * 0.6} L${sirka} ${vyska * 0.68} C${sirka * 0.7} ${vyska * 0.7} ${sirka * 0.4} ${vyska * 0.76} 0 ${vyska * 0.68} Z" fill="#8C857A" opacity="0.35"/>`;
      for (let k = 0; k < 40; k++) t += `<ellipse cx="${f(r() * sirka)}" cy="${f(40 + r() * (vyska - 50))}" rx="${f(2 + r() * 7)}" ry="${f(1.5 + r() * 3)}" fill="#1E1A16" opacity="0.7"/>`;
      return t;
    },
    tuha: () => {
      let t = `<path d="M0 ${vyska * 0.3} C${sirka * 0.3} ${vyska * 0.26} ${sirka * 0.6} ${vyska * 0.36} ${sirka} ${vyska * 0.3} L${sirka} ${vyska * 0.37} C${sirka * 0.6} ${vyska * 0.42} ${sirka * 0.3} ${vyska * 0.33} 0 ${vyska * 0.38} Z" fill="#2A221B" opacity="0.55"/>`;
      for (let k = 0; k < 50; k++) {
        const rx = 3 + r() * 10;
        t += `<ellipse cx="${f(r() * sirka)}" cy="${f(40 + r() * (vyska - 50))}" rx="${f(rx)}" ry="${f(rx * 0.7)}" fill="${["#8A7660", "#5A4A3A", "#9C8A72"][Math.floor(r() * 3)]}" opacity="0.8"/>`;
      }
      return t;
    },
    linearni: () => {
      /* spraš: jemné svislé trhlinky a bílé cicváry */
      let t = `<g stroke="#8E6C3E" stroke-width="1.1" opacity="0.45">`;
      for (let k = 0; k < 90; k++) {
        const x = r() * sirka, y = 30 + r() * (vyska - 60);
        t += `<path d="M${f(x)} ${f(y)} l${f((r() - 0.5) * 4)} ${f(14 + r() * 40)}"/>`;
      }
      t += `</g>`;
      for (let k = 0; k < 26; k++) t += `<path d="${chomac(r() * sirka, 50 + r() * (vyska - 70), 4 + r() * 7, 3 + r() * 5, 7, 900 + k, 1, 0.6)}" fill="#EDE3C9" opacity="0.85"/>`;
      return t;
    },
    trilobit: () => {
      let t = `<g stroke="#4A535D" stroke-width="1.2" fill="none" opacity="0.8">`;
      for (let y = 40; y < vyska; y += 9 + r() * 10) t += `<path d="M0 ${f(y)} C${sirka * 0.3} ${f(y + (r() - 0.5) * 8)} ${sirka * 0.6} ${f(y + (r() - 0.5) * 8)} ${sirka} ${f(y + (r() - 0.5) * 6)}"/>`;
      t += `</g><g stroke="#22282E" stroke-width="1.6" fill="none">`;
      for (let k = 0; k < 8; k++) {
        const x = r() * sirka;
        t += `<path d="M${f(x)} ${f(40 + r() * 100)} l${f((r() - 0.5) * 30)} ${f(40 + r() * 80)} l${f((r() - 0.5) * 30)} ${f(30 + r() * 60)}"/>`;
      }
      t += `</g>`;
      for (let k = 0; k < 14; k++) t += `<ellipse cx="${f(r() * sirka)}" cy="${f(50 + r() * (vyska - 60))}" rx="${f(4 + r() * 12)}" ry="${f(2 + r() * 4)}" fill="#7A5A40" opacity="0.35"/>`;
      return t;
    },
  };
  return s + textury[V.id]() + `</svg>`;
};

/** Rytá linka: tmavá rýha a pod ní světlá hrana */
const ryha = (d: string, sila = 2, tma = "#3E2A1C", svetlo = "#D4B08A") =>
  `<path d="${d}" stroke="${svetlo}" stroke-width="${f(sila * 0.55)}" fill="none" stroke-linecap="round" opacity="0.6" transform="translate(0.6 1.1)"/><path d="${d}" stroke="${tma}" stroke-width="${sila}" fill="none" stroke-linecap="round"/>`;

/** Střep: lom v barvě hlíny posunutý dolů a líc navrch */
const strep = (P: Bod[], lic: string, lom: string, id: string) =>
  `<path d="${cara(P)} Z" fill="${lom}" transform="translate(3 5)"/><path d="${cara(P)} Z" fill="${lic}"/><clipPath id="${id}"><path d="${cara(P)} Z"/></clipPath>`;

const NALEZY: Record<VrstvaId, () => string> = {
  orech: () => {
    const r = nahoda(61);
    let s = `<defs><radialGradient id="n-orech" cx="0.4" cy="0.35" r="0.7"><stop offset="0" stop-color="#C29468"/><stop offset="0.6" stop-color="#94693F"/><stop offset="1" stop-color="#6E4C2E"/></radialGradient><clipPath id="n-orech-o"><ellipse cx="0" cy="0" rx="46" ry="37"/></clipPath></defs>`;
    s += `<ellipse cx="124" cy="132" rx="58" ry="8" fill="#000" opacity="0.28"/>`;
    s += `<path d="${pas(vzorkuj([[86, 100], [70, 116], [54, 124], [40, 140], [30, 150]], 6), (t) => 6 * (1 - t) + 1)}" fill="#EAE0CB"/>`;
    s += `<g stroke="#EAE0CB" stroke-width="0.9" fill="none" opacity="0.8"><path d="M62 120 l-6 8 M50 128 l5 7 M44 136 l-8 2"/></g>`;
    s += `<g transform="translate(124 84) rotate(-14)"><ellipse cx="0" cy="0" rx="46" ry="37" fill="url(#n-orech)"/>`;
    s += `<g clip-path="url(#n-orech-o)" stroke="#5E412A" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.75">`;
    for (let k = 0; k < 16; k++) {
      const x = -40 + r() * 80, y = -30 + r() * 60;
      s += `<path d="M${f(x)} ${f(y)} q${f(4 + r() * 6)} ${f((r() - 0.5) * 10)} ${f(10 + r() * 10)} ${f((r() - 0.5) * 6)} q5 ${f((r() - 0.5) * 8)} ${f(8 + r() * 6)} ${f((r() - 0.5) * 6)}"/>`;
    }
    s += `</g><path d="M-46 2 C-20 -6 20 -6 47 -1" stroke="#4E3420" stroke-width="3.4" fill="none"/><path d="M-44 0 C-20 -8 20 -8 46 -3" stroke="#D2AA7C" stroke-width="1.1" fill="none" opacity="0.7"/>`;
    s += `<path d="M44 -6 L54 -3 L45 3 Z" fill="#7A5434"/><ellipse cx="-16" cy="-16" rx="14" ry="6" fill="#E6C7A0" opacity="0.25" transform="rotate(-20)"/></g>`;
    return s;
  },
  kachel: () => {
    const P: Bod[] = [[30, 30], [92, 22], [150, 18], [190, 42], [178, 82], [200, 118], [150, 132], [118, 144], [76, 130], [42, 140], [24, 96]];
    let s = `<defs><linearGradient id="n-kachel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6E9C68"/><stop offset="0.6" stop-color="#4C7C52"/><stop offset="1" stop-color="#3A6444"/></linearGradient></defs>`;
    s += `<ellipse cx="116" cy="146" rx="80" ry="8" fill="#000" opacity="0.28"/>`;
    s += strep(P, "url(#n-kachel)", "#A9694A", "n-kachel-o");
    s += `<g clip-path="url(#n-kachel-o)">`;
    s += `<path d="M10 40 L210 32 M40 10 L36 160" stroke="#2C4C34" stroke-width="5" fill="none"/><path d="M10 37 L210 29 M37 10 L33 160" stroke="#9CC694" stroke-width="2" fill="none" opacity="0.8"/>`;
    s += `<path d="M10 52 L210 44 M52 10 L48 160" stroke="#2C4C34" stroke-width="2" fill="none" opacity="0.7"/>`;
    s += `<g transform="translate(122 92)">`;
    for (let k = 0; k < 8; k++) s += `<g transform="rotate(${k * 45})"><ellipse cx="0" cy="-24" rx="9" ry="17" fill="#2F5A3A" opacity="0.65"/><ellipse cx="-2" cy="-26" rx="6" ry="13" fill="#8EBA86" opacity="0.55"/></g>`;
    s += `<circle r="11" fill="#2F5A3A"/><circle r="8" cx="-1.5" cy="-1.5" fill="#A6CC9C"/><circle r="3" fill="#2F5A3A"/></g>`;
    s += `<g stroke="#E8F2E0" stroke-width="0.6" fill="none" opacity="0.28"><path d="M40 70 L70 64 L84 80 L110 72 M60 110 L88 104 L96 122 M150 40 L160 64 L184 60 M140 110 L170 104 L186 118"/></g>`;
    s += `<path d="M30 30 L150 18 L120 40 L40 52 Z" fill="#FFFFFF" opacity="0.14"/></g>`;
    return s;
  },
  vlnice: () => {
    const P: Bod[] = [[26, 44], [60, 30], [110, 26], [160, 28], [204, 38], [196, 70], [210, 104], [168, 130], [128, 122], [90, 142], [50, 120], [30, 92]];
    let s = `<defs><linearGradient id="n-vlnice" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8C7C6A"/><stop offset="1" stop-color="#5E5144"/></linearGradient></defs>`;
    s += `<ellipse cx="118" cy="146" rx="84" ry="8" fill="#000" opacity="0.28"/>`;
    s += strep(P, "url(#n-vlnice)", "#3A322B", "n-vlnice-o");
    s += `<g clip-path="url(#n-vlnice-o)">`;
    s += `<path d="M20 48 C70 34 150 32 214 42" stroke="#A89886" stroke-width="7" fill="none" opacity="0.6"/>`;
    s += `<ellipse cx="80" cy="96" rx="34" ry="18" fill="#2E2822" opacity="0.25"/><ellipse cx="160" cy="80" rx="22" ry="12" fill="#2E2822" opacity="0.2"/>`;
    for (const y of [60, 66]) s += ryha(`M18 ${y} C80 ${y - 6} 150 ${y - 6} 214 ${y - 2}`, 1.6, "#3A3028", "#A89886");
    for (const y of [86, 100, 114]) {
      let d = `M14 ${y}`;
      for (let x = 14; x < 216; x += 22) d += ` q5.5 -7 11 0 t11 0`;
      s += ryha(d, 1.8, "#3A3028", "#A89886");
    }
    return s + `</g>`;
  },
  tuha: () => {
    const P: Bod[] = [[34, 34], [100, 24], [170, 30], [196, 58], [188, 98], [200, 128], [140, 140], [96, 134], [52, 142], [28, 104], [40, 70]];
    let s = `<defs><linearGradient id="n-tuha" x1="0" y1="0" x2="1" y2="0.4"><stop offset="0" stop-color="#3E4146"/><stop offset="0.42" stop-color="#5C6067"/><stop offset="0.5" stop-color="#A3A9B1"/><stop offset="0.58" stop-color="#5C6067"/><stop offset="1" stop-color="#2D2F33"/></linearGradient></defs>`;
    s += `<ellipse cx="116" cy="148" rx="82" ry="8" fill="#000" opacity="0.3"/>`;
    s += strep(P, "url(#n-tuha)", "#26282B", "n-tuha-o");
    s += `<g clip-path="url(#n-tuha-o)">`;
    s += `<path d="M20 44 C80 34 150 34 210 42 L210 52 C150 44 80 44 20 54 Z" fill="#26282B" opacity="0.55"/>`;
    /* svislé rýhy hřebenem — typické pro keltské situly */
    for (let k = 0; k < 15; k++) {
      const x = 36 + k * 11.5;
      s += `<path d="M${x} 58 C${x + 3} 86 ${x - 2} 112 ${x + 2} 146" stroke="#1E2023" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M${f(x + 1.8)} 58 C${f(x + 4.8)} 86 ${f(x - 0.2)} 112 ${f(x + 3.8)} 146" stroke="#8C929A" stroke-width="0.8" fill="none" opacity="0.6"/>`;
    }
    return s + `</g>`;
  },
  linearni: () => {
    const P: Bod[] = [[28, 60], [52, 34], [100, 22], [152, 24], [196, 44], [206, 84], [190, 120], [146, 140], [96, 140], [54, 126], [30, 98]];
    let s = `<defs><radialGradient id="n-lin" cx="0.42" cy="0.38" r="0.7"><stop offset="0" stop-color="#C08C5E"/><stop offset="0.7" stop-color="#9A6A42"/><stop offset="1" stop-color="#7A5234"/></radialGradient></defs>`;
    s += `<ellipse cx="118" cy="148" rx="82" ry="8" fill="#000" opacity="0.26"/>`;
    s += strep(P, "url(#n-lin)", "#5E3E26", "n-lin-o");
    s += `<g clip-path="url(#n-lin-o)">`;
    /* páska ze dvou rytých linek, na nich „notové hlavičky“ */
    for (const d of ["M10 96 C46 40 98 40 120 78 S186 118 222 64", "M10 110 C48 54 96 56 116 92 S190 132 222 78"]) s += ryha(d, 2.2, "#4A2E1C", "#E0BB8E");
    const noty: Bod[] = [[40, 62], [62, 49], [88, 46], [112, 63], [140, 97], [168, 104], [196, 90], [44, 77], [70, 64], [96, 64], [122, 86], [150, 114], [178, 116]];
    for (const [x, y] of noty) s += `<circle cx="${x}" cy="${y + 3}" r="3.2" fill="#4A2E1C"/><circle cx="${f(x - 0.8)}" cy="${f(y + 2.2)}" r="1" fill="#E0BB8E" opacity="0.5"/>`;
    s += `<path d="M30 40 Q80 20 150 26" stroke="#F4D7AE" stroke-width="10" fill="none" opacity="0.14" stroke-linecap="round"/>`;
    return s + `</g>`;
  },
  trilobit: () => {
    const r = nahoda(91);
    const P = obrys(120, 82, 104, 64, 13, 93, 0.14);
    let s = `<defs><linearGradient id="n-bridlice" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stop-color="#4E5864"/><stop offset="1" stop-color="#2E353D"/></linearGradient><linearGradient id="n-tri" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#B2AA9A"/><stop offset="1" stop-color="#7E786C"/></linearGradient></defs>`;
    s += `<ellipse cx="120" cy="150" rx="96" ry="8" fill="#000" opacity="0.3"/>`;
    s += strep(P, "url(#n-bridlice)", "#1E2329", "n-bridlice-o");
    s += `<g clip-path="url(#n-bridlice-o)"><g stroke="#5E6A76" stroke-width="1" fill="none" opacity="0.6">`;
    for (let y = 24; y < 160; y += 8 + r() * 6) s += `<path d="M0 ${f(y)} C70 ${f(y + (r() - 0.5) * 5)} 160 ${f(y + (r() - 0.5) * 5)} 240 ${f(y + (r() - 0.5) * 4)}"/>`;
    s += `</g></g>`;
    /* hlavový štít s očima a trny, deset článků trupu, ocasní štít */
    s += `<g transform="translate(120 80) rotate(-8) scale(1.32)">`;
    s += `<path d="M-30 -22 C-28 -40 28 -40 30 -22 C32 -16 26 -12 22 -12 L-22 -12 C-26 -12 -32 -16 -30 -22 Z" fill="url(#n-tri)" stroke="#4A4740" stroke-width="1.2"/>`;
    s += `<path d="M-28 -15 C-32 -8 -33 -1 -31 6 M28 -15 C32 -8 33 -1 31 6" stroke="#8E887B" stroke-width="2.6" stroke-linecap="round" fill="none"/>`;
    s += `<path d="M-8 -14 C-10 -26 -7 -34 0 -35 C7 -34 10 -26 8 -14 Z" fill="#C4BCAC" stroke="#4A4740" stroke-width="1"/>`;
    s += `<path d="M-17 -24 q-4 4 0 8 M17 -24 q4 4 0 8" stroke="#3A3832" stroke-width="2.4" stroke-linecap="round" fill="none"/>`;
    for (let k = 0; k < 10; k++) {
      const y = -11 + k * 4.6;
      const w = 25 - k * 1.3;
      s += `<path d="M${f(-w)} ${f(y + 1.6)} Q0 ${f(y - 1.6)} ${f(w)} ${f(y + 1.6)} L${f(w - 1)} ${f(y + 4.6)} Q0 ${f(y + 1.6)} ${f(-w + 1)} ${f(y + 4.6)} Z" fill="url(#n-tri)" stroke="#4A4740" stroke-width="0.9"/>`;
      s += `<path d="M-6 ${f(y + 0.4)} Q0 ${f(y - 1.2)} 6 ${f(y + 0.4)}" stroke="#E2DACA" stroke-width="0.9" fill="none" opacity="0.6"/>`;
    }
    s += `<path d="M-9 -12 L-7 34 M9 -12 L7 34" stroke="#4A4740" stroke-width="1.1" opacity="0.8"/>`;
    s += `<path d="M-13 35 C-12 45 12 45 13 35 Z" fill="url(#n-tri)" stroke="#4A4740" stroke-width="1"/>`;
    return s + `</g>`;
  },
};

export const nalez = (id: VrstvaId) => `<svg viewBox="0 0 240 160" aria-hidden="true">${NALEZY[id]()}</svg>`;

/** Lopatka do tlačítka Kopej */
export const lopatka = () =>
  `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 9.5 L20 4"/><path d="M18 2.5 L21.5 6"/><path d="M9.5 8.2 L15.8 14.5 L12 18.3 C10 20.3 6.6 20.3 4.6 18.3 L5.7 19.4 C3.7 17.4 3.7 14 5.7 12 Z" fill="currentColor" fill-opacity="0.18"/></svg>`;
