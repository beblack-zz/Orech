/**
 * Kontakt uvnitř — ústředna 交換台 v dílně. Kamera vjela po provázku oknem
 * dovnitř: provázky od všech hrnků vedou pod stropem na dubovou skříňku na
 * oválném stole z kanceláře, přes kladky shora do hrnků v kolébkách.
 * Linka 二 zvoní — její hrnek drží ten, kdo má službu, a ucho k němu tiskne
 * i Bublinka. Cedulka listuje knihou odjezdů, Kachlík skáče po kulatých
 * klávesách psacího stroje a ťuká odkaz na rezervace.
 *
 * Když je zavřeno, je v dílně potmě a nikdo nezvedá: hrnek linky 二 leží
 * v kolébce a zvoní do prázdna, Bublinka kouká z hroudy, Kachlík spí na
 * klávesách a přes ústřednu visí cedulka 準備中 s příští otevírací dobou.
 *
 * Kresba je rozdělená na pozadí (stěna, stůl, fíkus, hodiny — přes celou
 * šířku) a jádro (ústředna, parta, stroj, kniha), které se kreslí v rámu
 * návrhu a do scény se posune a zmenší. Co se hýbe (Cedulka, Kachlík,
 * klávesy, písmo na papíře, listy knihy, zvonek linky), má třídu a skript
 * scripts/kontakt/uvnitr.ts to po snímcích přepisuje v souřadnicích jádra.
 */
import type { PostavaId } from "../../../data/parta";
import { type Bod, f, nahoda, kami, hrnek, provazek, prohnuty, provazekSvg } from "./zaklad";
import type { Rezim } from "./venku";

export interface UvnitrVolby {
  W: number;
  H: number;
  rezim: Rezim;
  panel: { prava: number; dolni: number };
  kdo: PostavaId;
  /** Zavřeno: potmě, nikdo nezvedá a na ústředně visí cedulka */
  otevreno: boolean;
  /** Řádky cedulky, když je zavřeno (např. „otevíráme v úterý v 9:00“) */
  cedulka?: string[];
}

export interface UvnitrBody {
  zavreno: boolean;
  /** Posun a měřítko jádra ve scéně */
  jadro: { ox: number; oy: number; k: number };
  /** Aktivní linka: kde vchází pod stropem, kladka a pata drženého hrnku (scéna) */
  vstup: Bod;
  kladka: Bod;
  pata: Bod;
  /** Kam kamera při příletu míří (scéna) */
  ohnisko: Bod;
  /** Hlavy pro bubliny (scéna) */
  hlavaKdo: Bod;
  hlavaBublinka: Bod;
  /** Cedulka: hák (jádro) — null, když se na stůl nevešla */
  cedulka: { hak: Bod; velikost: number } | null;
  kniha: { hrbet: Bod; sirka: number; zdvih: number } | null;
  kachlik: { x: number; y: number; velikost: number };
  /** Středy kláves v jádře (pro skoky) */
  klavesy: Bod[];
  /** Šířka provázků */
  w0: number;
  w1: number;
}

const GLAZURY = [
  { svetlo: "#C6DCC4", stred: "#93B39B", stin: "#5E7C68" },
  { svetlo: "#8A5A34", stred: "#3A2A22", stin: "#1E1612" },
  { svetlo: "#F6EEE2", stred: "#E9D5C0", stin: "#C98E6A" },
  { svetlo: "#FFFDF8", stred: "#EFEAE0", stin: "#B9B0A2" },
  { svetlo: "#D8D6CC", stred: "#A9A79C", stin: "#6E6C64" },
  { svetlo: "#C27A4A", stred: "#8A4A2A", stin: "#4E2A18" },
];
const CISLA = ["一", "二", "三", "四", "五", "六", "七", "八", "九"];
const DUB = { svetlo: "#E2C597", stred: "#C9A472", stin: "#9C7A4C", tma: "#6E5232" };
export const AKTIVNI = 1;

/** Text, který Kachlík ťuká — skript ho odkrývá po písmenech */
export const PAPIR = ["Ahoj!", "Tady je tvůj odkaz", "na rezervace:", "jirosaku.cz/rezervace", "Vyber si hodinu. Kachlík"];

/** Hrneček na boku otvorem k nám (malý, na ústředně) */
function hrnecek(cx: number, cy: number, r: number, gl: (typeof GLAZURY)[number], id: string) {
  return `<g>
    <defs><radialGradient id="${id}" cx="0.56" cy="0.42" r="0.62"><stop offset="0" stop-color="${gl.stin}"/><stop offset="0.7" stop-color="${gl.stred}"/><stop offset="1" stop-color="${gl.svetlo}"/></radialGradient></defs>
    <ellipse cx="${f(cx + r * 0.22)}" cy="${f(cy - r * 0.12)}" rx="${f(r * 0.98)}" ry="${f(r * 0.96)}" fill="${gl.stin}"/>
    <circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="url(#${id})"/>
    <ellipse cx="${f(cx + r * 0.16)}" cy="${f(cy - r * 0.06)}" rx="${f(r * 0.38)}" ry="${f(r * 0.34)}" fill="${gl.stred}" opacity="0.8"/>
    <circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r * 0.92)}" fill="none" stroke="${gl.svetlo}" stroke-width="${f(r * 0.16)}"/>
    <path d="M${f(cx - r * 0.78)} ${f(cy - r * 0.42)} A${f(r * 0.9)} ${f(r * 0.9)} 0 0 1 ${f(cx - r * 0.1)} ${f(cy - r * 0.9)}" stroke="#FFFFFF" stroke-width="${f(r * 0.1)}" fill="none" stroke-linecap="round" opacity="0.7"/>
  </g>`;
}

function zvonek(x: number, y: number, r: number, aktivni: boolean) {
  return `<g class="${aktivni ? "ko-u-zvonek" : ""}">
    <path d="M${f(x)} ${f(y - r * 1.3)} L${f(x)} ${f(y - r * 0.9)}" stroke="#7A5A2A" stroke-width="1.4"/>
    <path d="M${f(x - r)} ${f(y + r * 0.5)} C${f(x - r)} ${f(y - r * 0.6)} ${f(x - r * 0.5)} ${f(y - r)} ${f(x)} ${f(y - r)} C${f(x + r * 0.5)} ${f(y - r)} ${f(x + r)} ${f(y - r * 0.6)} ${f(x + r)} ${f(y + r * 0.5)} Z" fill="#D2A64A" stroke="#8C6A24" stroke-width="1"/>
    <path d="M${f(x - r * 0.55)} ${f(y - r * 0.45)} C${f(x - r * 0.45)} ${f(y - r * 0.75)} ${f(x - r * 0.2)} ${f(y - r * 0.85)} ${f(x + r * 0.05)} ${f(y - r * 0.85)}" stroke="#F3D98A" stroke-width="${f(r * 0.22)}" fill="none" stroke-linecap="round"/>
    <circle cx="${f(x)}" cy="${f(y + r * 0.7)}" r="${f(r * 0.28)}" fill="#8C6A24"/>
    ${aktivni ? `<path class="ko-u-vlny" d="M${f(x - r * 1.6)} ${f(y - r * 0.9)} q${f(-r * 0.5)} ${f(r * 0.6)} 0 ${f(r * 1.2)} M${f(x - r * 2.1)} ${f(y - r * 1.2)} q${f(-r * 0.7)} ${f(r * 0.9)} 0 ${f(r * 1.8)} M${f(x + r * 1.6)} ${f(y - r * 0.9)} q${f(r * 0.5)} ${f(r * 0.6)} 0 ${f(r * 1.2)} M${f(x + r * 2.1)} ${f(y - r * 1.2)} q${f(r * 0.7)} ${f(r * 0.9)} 0 ${f(r * 1.8)}" stroke="#C4432B" stroke-width="1.6" fill="none" stroke-linecap="round"/>` : ""}
  </g>`;
}

/** Ústředna: dubová skříňka se třemi policemi po třech linkách (jádro) */
function ustredna(x0: number, y0: number, w: number, h: number, drzi = true) {
  const vnitr = 16;
  const sloupce = [x0 + w * 0.2, x0 + w * 0.5, x0 + w * 0.8];
  const rady = [y0 + h * 0.33, y0 + h * 0.58, y0 + h * 0.83];
  const kladkyY = y0 + 34;
  let s = "";
  s += `<rect x="${f(x0 + 18)}" y="${f(y0 + 10)}" width="${f(w)}" height="${f(h)}" rx="10" fill="#4A3A2A" opacity="0.12"/>`;
  s += `<ellipse cx="${f(x0 + w / 2 + 20)}" cy="${f(y0 + h + 4)}" rx="${f(w * 0.62)}" ry="12" fill="#4A3A2A" opacity="0.2"/>`;
  s += `<rect x="${f(x0)}" y="${f(y0)}" width="${f(w)}" height="${f(h)}" rx="10" fill="url(#ko-u-dub)" stroke="${DUB.tma}" stroke-width="1.6"/>`;
  s += `<rect x="${f(x0 + vnitr)}" y="${f(y0 + vnitr + 30)}" width="${f(w - vnitr * 2)}" height="${f(h - vnitr * 2 - 30)}" rx="5" fill="url(#ko-u-panel)" stroke="${DUB.tma}" stroke-opacity="0.5" stroke-width="1.2"/>`;
  s += `<rect x="${f(x0 + vnitr - 4)}" y="${f(kladkyY - 9)}" width="${f(w - vnitr * 2 + 8)}" height="18" rx="4" fill="${DUB.stin}"/>`;
  s += `<g><rect x="${f(x0 + w / 2 - 108)}" y="${f(y0 - 40)}" width="216" height="40" rx="5" fill="#3B2A1E"/>
    <rect x="${f(x0 + w / 2 - 102)}" y="${f(y0 - 35)}" width="204" height="30" rx="3" fill="none" stroke="#C9A472" stroke-width="0.8"/>
    <text class="ko-kanji" x="${f(x0 + w / 2 - 34)}" y="${f(y0 - 13)}" text-anchor="middle" font-size="19" fill="#F3E3C0" letter-spacing="2">交換台</text>
    <text class="ko-pismo-soft" x="${f(x0 + w / 2 + 50)}" y="${f(y0 - 15.5)}" text-anchor="middle" font-size="11.5" letter-spacing="2.4" fill="#F3E3C0">ÚSTŘEDNA</text></g>`;
  rady.forEach((ry) => {
    s += `<rect x="${f(x0 + vnitr)}" y="${f(ry + 30)}" width="${f(w - vnitr * 2)}" height="9" fill="${DUB.stred}" stroke="${DUB.tma}" stroke-opacity="0.5" stroke-width="0.8"/>`;
    s += `<rect x="${f(x0 + vnitr)}" y="${f(ry + 39)}" width="${f(w - vnitr * 2)}" height="5" fill="#4A3A2A" opacity="0.14"/>`;
  });
  const linky: { k: number; cx: number; cy: number; kladka: Bod }[] = [];
  rady.forEach((ry, r) =>
    sloupce.forEach((cx, c) => {
      const k = r * 3 + c;
      linky.push({ k, cx, cy: ry, kladka: [x0 + vnitr + 14 + ((w - vnitr * 2 - 28) * (k + 0.5)) / 9, kladkyY] });
    }),
  );
  linky.forEach((l) => {
    if (l.k === AKTIVNI && drzi) return;
    s += `<path d="M${f(l.kladka[0])} ${f(l.kladka[1])} L${f(l.cx + 6)} ${f(l.cy - 6)}" stroke="#B84A2B" stroke-width="1.6" opacity="0.85"/>`;
    s += `<path d="M${f(l.kladka[0])} ${f(l.kladka[1])} L${f(l.cx + 6)} ${f(l.cy - 6)}" stroke="#FBF7EE" stroke-width="1.6" stroke-dasharray="2 3" opacity="0.85"/>`;
  });
  linky.forEach((l) => {
    s += `<circle cx="${f(l.kladka[0])}" cy="${f(l.kladka[1])}" r="7" fill="#B88A3E" stroke="#6E5226" stroke-width="1"/><circle cx="${f(l.kladka[0])}" cy="${f(l.kladka[1])}" r="2.2" fill="#6E5226"/>`;
  });
  linky.forEach(({ k, cx, cy }) => {
    const r = 24;
    const zvoni = k === AKTIVNI;
    s += `<path d="M${f(cx - 30)} ${f(cy + 30)} L${f(cx - 30)} ${f(cy + 12)} Q${f(cx - 26)} ${f(cy + 10)} ${f(cx - 22)} ${f(cy + 12)} A24 16 0 0 0 ${f(cx + 22)} ${f(cy + 12)} Q${f(cx + 26)} ${f(cy + 10)} ${f(cx + 30)} ${f(cy + 12)} L${f(cx + 30)} ${f(cy + 30)} Z" fill="${DUB.stred}" stroke="${DUB.tma}" stroke-width="1"/>`;
    if (!zvoni || !drzi) s += hrnecek(cx, cy - 4, r, GLAZURY[(k * 5 + 2) % GLAZURY.length], `ko-u-h${k}`);
    else s += `<path d="M${f(cx - 16)} ${f(cy + 13)} A16 9 0 0 0 ${f(cx + 16)} ${f(cy + 13)}" fill="#4A3A2A" opacity="0.18"/>`;
    s += zvonek(cx - 40, cy - 30, 7, zvoni);
    s += zvoni
      ? `<g class="ko-u-kontrolka"><circle cx="${f(cx + 40)}" cy="${f(cy - 32)}" r="13" fill="#FFB347" opacity="0.35"/><circle cx="${f(cx + 40)}" cy="${f(cy - 32)}" r="5.6" fill="#FF9F2E" stroke="#B85A10" stroke-width="1"/><circle cx="${f(cx + 38.6)}" cy="${f(cy - 33.4)}" r="1.8" fill="#FFE7B0"/></g>`
      : `<circle cx="${f(cx + 40)}" cy="${f(cy - 32)}" r="5.6" fill="#E9DCC8" stroke="#9C8A6A" stroke-width="1"/>`;
    s += `<g><ellipse cx="${f(cx)}" cy="${f(cy + 52)}" rx="11" ry="8.6" fill="#FBF8F0" stroke="#3B4A6E" stroke-width="1.3"/><text class="ko-kanji" x="${f(cx)}" y="${f(cy + 56.6)}" text-anchor="middle" font-size="11.5" fill="#26324F">${CISLA[k]}</text></g>`;
  });
  s += `<g><circle cx="${f(x0 + w + 2)}" cy="${f(y0 + h * 0.55)}" r="9" fill="#2B2420"/><path d="M${f(x0 + w + 2)} ${f(y0 + h * 0.55)} L${f(x0 + w + 26)} ${f(y0 + h * 0.55 - 16)}" stroke="#2B2420" stroke-width="5" stroke-linecap="round"/><rect x="${f(x0 + w + 22)}" y="${f(y0 + h * 0.55 - 30)}" width="10" height="18" rx="5" fill="#8A4A2A"/></g>`;
  return { svg: s, linky };
}

/** Psací stroj: mátový, kulaté klávesy jako kameny přes potok (jádro) */
function psaciStroj(x: number, y: number, m: number) {
  const T = (px: number, py: number) => `${f(x + px * m)} ${f(y + py * m)}`;
  let s = `<g class="ko-u-stroj">`;
  s += `<ellipse cx="${f(x + 150 * m)}" cy="${f(y + 196 * m)}" rx="${f(176 * m)}" ry="${f(16 * m)}" fill="#3A2A1E" opacity="0.22"/>`;
  s += `<path d="M${T(70, 34)} L${T(60, -112)} Q${T(150, -124)} ${T(240, -112)} L${T(230, 34)} Z" fill="#FFFDF6" stroke="#D2C6B0" stroke-width="1"/>`;
  PAPIR.forEach((r, i) => {
    s += `<text class="ko-u-radek ko-psaci" data-radek="${i}" data-text="${r}" x="${f(x + 76 * m)}" y="${f(y + (-86 + i * 15) * m)}" font-size="${f(10.4 * m)}" fill="#2B2420"${i === 3 ? ` text-decoration="underline"` : ""}>${r}</text>`;
  });
  s += `<rect x="${f(x + 18 * m)}" y="${f(y + 26 * m)}" width="${f(264 * m)}" height="${f(26 * m)}" rx="${f(13 * m)}" fill="#2B2420"/>`;
  s += `<rect x="${f(x + 24 * m)}" y="${f(y + 30 * m)}" width="${f(252 * m)}" height="${f(6 * m)}" rx="${f(3 * m)}" fill="#4A403A"/>`;
  s += `<circle cx="${f(x + 10 * m)}" cy="${f(y + 39 * m)}" r="${f(13 * m)}" fill="#C9CDD0" stroke="#7E8488" stroke-width="1"/><circle cx="${f(x + 290 * m)}" cy="${f(y + 39 * m)}" r="${f(13 * m)}" fill="#C9CDD0" stroke="#7E8488" stroke-width="1"/>`;
  s += `<path d="M${T(-6, 30)} L${T(-34, 6)} L${T(-38, 12)}" stroke="#C9CDD0" stroke-width="${f(5 * m)}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  s += `<path d="M${T(14, 52)} L${T(286, 52)} L${T(306, 150)} Q${T(308, 180)} ${T(280, 182)} L${T(20, 182)} Q${T(-8, 180)} ${T(-6, 150)} Z" fill="url(#ko-u-stroj)" stroke="#5E8C74" stroke-width="1.2"/>`;
  s += `<path d="M${T(40, 52)} L${T(260, 52)} L${T(250, 72)} L${T(50, 72)} Z" fill="#2B2420" opacity="0.85"/>`;
  s += `<path d="M${T(70, 56)} Q${T(150, 44)} ${T(230, 56)}" stroke="#C9CDD0" stroke-width="${f(3 * m)}" fill="none"/>`;
  s += `<text class="ko-kanji" x="${f(x + 150 * m)}" y="${f(y + 92 * m)}" text-anchor="middle" font-size="${f(12 * m)}" letter-spacing="${f(3 * m)}" fill="#F3ECDF">ジロ</text>`;
  const rady: [number, number, number][] = [[11, 102, 22], [11, 122, 18], [10, 141, 14], [9, 160, 10]];
  const klavesy: Bod[] = [];
  let i = 0;
  rady.forEach(([n, ry, odsaz]) => {
    for (let kk = 0; kk < n; kk++) {
      const kx = 30 + odsaz + kk * ((240 - odsaz * 2) / (n - 1));
      const cx = x + kx * m, cy = y + ry * m;
      klavesy.push([cx, cy]);
      s += `<g class="ko-u-klavesa" data-i="${i++}"><ellipse cx="${f(cx)}" cy="${f(cy + 3 * m)}" rx="${f(8.6 * m)}" ry="${f(3.6 * m)}" fill="#3A4A40" opacity="0.5"/>
        <g class="ko-u-hlava"><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(8 * m)}" fill="#2B2420" stroke="#C9CDD0" stroke-width="${f(1.4 * m)}"/>
        <circle cx="${f(cx - 2 * m)}" cy="${f(cy - 2 * m)}" r="${f(2.4 * m)}" fill="#F3ECDF" opacity="0.5"/></g></g>`;
    }
  });
  s += `<rect x="${f(x + 80 * m)}" y="${f(y + 168 * m)}" width="${f(140 * m)}" height="${f(9 * m)}" rx="${f(4.5 * m)}" fill="#2B2420" stroke="#C9CDD0" stroke-width="${f(1.2 * m)}"/>`;
  s += `<g><circle cx="${f(x + 292 * m)}" cy="${f(y + 4 * m)}" r="${f(7 * m)}" fill="#D2A64A" stroke="#8C6A24" stroke-width="1"/>
    <g class="ko-u-cink"><path d="M${T(304, -6)} q${f(6 * m)} ${f(4 * m)} 0 ${f(10 * m)} M${T(310, -12)} q${f(9 * m)} ${f(8 * m)} 0 ${f(20 * m)}" stroke="#C4432B" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <text class="ko-ruka-tucne" x="${f(x + 318 * m)}" y="${f(y - 14 * m)}" font-size="${f(22 * m)}" fill="#C4432B">cink!</text></g></g>`;
  s += `</g>`;
  return { svg: s, klavesy };
}

/** Kniha odjezdů na pultíku; listy v letu přepisuje skript (jádro) */
function kniha(x: number, y: number, m: number) {
  const T = (px: number, py: number) => `${f(x + px * m)} ${f(y + py * m)}`;
  let s = `<g class="ko-u-kniha">`;
  s += `<ellipse cx="${f(x + 120 * m)}" cy="${f(y + 150 * m)}" rx="${f(150 * m)}" ry="${f(13 * m)}" fill="#3A2A1E" opacity="0.2"/>`;
  s += `<path d="M${T(40, 60)} L${T(56, 146)} M${T(200, 60)} L${T(184, 146)}" stroke="${DUB.tma}" stroke-width="${f(7 * m)}" stroke-linecap="round"/>`;
  s += `<path d="M${T(-6, 74)} L${T(246, 74)} L${T(232, 34)} L${T(8, 34)} Z" fill="${DUB.stred}" stroke="${DUB.tma}" stroke-width="1.2"/>`;
  s += `<path d="M${T(2, 66)} L${T(238, 66)} L${T(226, 20)} L${T(14, 20)} Z" fill="#7A2E22"/>`;
  s += `<path d="M${T(10, 62)} Q${T(62, 54)} ${T(118, 62)} L${T(116, 18)} Q${T(64, 8)} ${T(20, 16)} Z" fill="#FBF6EA" stroke="#D2C6B0" stroke-width="0.8"/>`;
  s += `<path d="M${T(122, 62)} Q${T(178, 54)} ${T(230, 62)} L${T(220, 16)} Q${T(176, 8)} ${T(124, 18)} Z" fill="#F7F0E2" stroke="#D2C6B0" stroke-width="0.8"/>`;
  for (let i = 0; i < 5; i++) {
    s += `<path d="M${T(26, 26 + i * 7.4)} Q${T(66, 21 + i * 7.4)} ${T(108, 27 + i * 7.4)}" stroke="#8A7C70" stroke-width="0.7" fill="none" opacity="0.7"/>`;
    s += `<path d="M${T(132, 27 + i * 7.4)} Q${T(172, 21 + i * 7.4)} ${T(212, 26 + i * 7.4)}" stroke="#8A7C70" stroke-width="0.7" fill="none" opacity="0.7"/>`;
  }
  s += `<text class="ko-ruka-tucne" x="${f(x + 64 * m)}" y="${f(y + 18 * m)}" text-anchor="middle" font-size="${f(10 * m)}" fill="#C4432B">odjezdy · pá</text>`;
  ["9:00 Hlínka", "10:00 ✓ 2 místa", "11:00 Šamotka"].forEach((t, i) => {
    const tx = x + 28 * m, ty = y + (31 + i * 9.6) * m;
    s += `<text class="ko-ruka" x="${f(tx)}" y="${f(ty)}" font-size="${f(9 * m)}" fill="#3B322A" transform="rotate(-3 ${f(tx)} ${f(ty)})">${t}</text>`;
  });
  s += `<path d="M${T(118, 18)} L${T(120, 64)}" stroke="#B8AE9A" stroke-width="1"/>`;
  s += `<path d="M${T(150, 60)} L${T(146, 92)} L${T(152, 86)} L${T(156, 93)} L${T(156, 60)} Z" fill="#C4432B"/>`;
  s += `<path class="ko-u-list" data-list="0" d="" fill="#FFFCF4" stroke="#D2C6B0" stroke-width="0.8"/>`;
  s += `<path class="ko-u-list" data-list="1" d="" fill="#FBF6EA" stroke="#D2C6B0" stroke-width="0.8"/>`;
  s += `</g>`;
  return { svg: s, hrbet: [x + 119 * m, y + 40 * m] as Bod, sirka: 104 * m, zdvih: 70 * m };
}

function kafe(x: number, y: number, m: number, para = true) {
  return `<g transform="translate(${f(x)} ${f(y)}) scale(${f(m)})">
    <ellipse cx="0" cy="4" rx="34" ry="8" fill="#3A2A1E" opacity="0.18"/>
    <ellipse cx="0" cy="0" rx="32" ry="8" fill="#EFEAE0" stroke="#B9B0A2" stroke-width="1"/>
    <path d="M-20 -30 L-17 -3 Q0 4 17 -3 L20 -30 Z" fill="#93B39B"/>
    <ellipse cx="0" cy="-30" rx="20" ry="5" fill="#C6DCC4"/>
    <ellipse cx="0" cy="-29.4" rx="16.4" ry="3.6" fill="#4A2E1E"/>
    <path d="M-14 -18 C-15 -10 -13 -6 -10 -4" stroke="#C6DCC4" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.7"/>
    ${para ? `<path class="ko-u-para" d="M-6 -40 C-12 -50 0 -56 -6 -66 M6 -42 C0 -52 12 -58 6 -70" stroke="#FFFFFF" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.65"/>` : ""}
  </g>`;
}

function fikus(x: number, y: number, m: number) {
  const R = nahoda(6601);
  let listy = "";
  const vetve: Bod[] = [[-40, -250], [10, -300], [50, -220], [-10, -180], [70, -290], [-60, -320]];
  vetve.forEach(([vx, vy]) => (listy += `<path d="M0 -40 Q${f(vx * 0.4)} ${f(vy * 0.5)} ${vx} ${vy}" stroke="#6E5A44" stroke-width="3" fill="none"/>`));
  for (let i = 0; i < 46; i++) {
    const v = vetve[i % vetve.length];
    const t = 0.45 + R() * 0.6;
    const lx = v[0] * t + (R() - 0.5) * 50, ly = v[1] * t + (R() - 0.5) * 40;
    const u = (R() - 0.5) * 160, d = 30 + R() * 16;
    const bar = R() < 0.5 ? "#3E6B3A" : R() < 0.5 ? "#4F7E44" : "#5E8E4A";
    listy += `<g transform="translate(${f(lx)} ${f(ly)}) rotate(${f(u)})"><path d="M0 0 C${f(d * 0.3)} ${f(-d * 0.42)} ${f(d * 0.8)} ${f(-d * 0.36)} ${f(d)} 0 C${f(d * 0.8)} ${f(d * 0.36)} ${f(d * 0.3)} ${f(d * 0.42)} 0 0 Z" fill="${bar}"/><path d="M2 0 L${f(d - 3)} 0" stroke="#2E4E2A" stroke-width="1" opacity="0.5"/></g>`;
  }
  return `<g transform="translate(${f(x)} ${f(y)}) scale(${f(m)})"><ellipse cx="6" cy="2" rx="70" ry="12" fill="#3A3A30" opacity="0.2"/>${listy}<path d="M-50 -60 L50 -60 L40 0 L-40 0 Z" fill="#4B5054"/><path d="M-54 -66 L54 -66 L52 -56 L-52 -56 Z" fill="#5D6266"/></g>`;
}

/** Nádražní hodiny: bílý ciferník, černé čárky; ručičky nastaví skript podle času */
function hodiny(x: number, y: number, r: number) {
  let carky = "";
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    const r1 = r * (i % 5 === 0 ? 0.7 : 0.82), r2 = r * 0.9;
    carky += `M${f(x + Math.sin(a) * r1)} ${f(y - Math.cos(a) * r1)}L${f(x + Math.sin(a) * r2)} ${f(y - Math.cos(a) * r2)}`;
  }
  return `<g class="ko-u-hodiny" data-x="${f(x)}" data-y="${f(y)}" data-r="${f(r)}">
    <circle cx="${f(x + 4)}" cy="${f(y + 5)}" r="${f(r + 4)}" fill="#3A2A1E" opacity="0.12"/>
    <circle cx="${f(x)}" cy="${f(y)}" r="${f(r + 4)}" fill="#3B3F42"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="#FBFAF6"/>
    <path d="${carky}" stroke="#1C1714" stroke-width="${f(Math.max(0.8, r / 36))}"/>
    <path class="ko-u-hodinova" d="M${f(x)} ${f(y + r * 0.14)} L${f(x)} ${f(y - r * 0.5)}" stroke="#1C1714" stroke-width="${f(r / 11)}"/>
    <path class="ko-u-minutova" d="M${f(x)} ${f(y + r * 0.14)} L${f(x)} ${f(y - r * 0.78)}" stroke="#1C1714" stroke-width="${f(r / 16)}"/>
    <circle cx="${f(x)}" cy="${f(y)}" r="${f(r / 19)}" fill="#1C1714"/>
  </g>`;
}

/** Zelená podložka s hroudou, ve které se Bublinka jinak schovává (teď je prázdná), a váleček */
function podlozka(x: number, y: number, m: number) {
  const T = (px: number, py: number) => `${f(x + px * m)} ${f(y + py * m)}`;
  return `<g>
    <path d="M${T(0, 18)} L${T(228, 0)} L${T(250, 122)} L${T(-14, 144)} Z" fill="#2E6B4E"/>
    <path d="M${T(0, 18)} L${T(228, 0)} L${T(230, 8)} L${T(1, 26)} Z" fill="#3F8462"/>
    <path d="M${T(46, 15)} L${T(36, 140)} M${T(92, 11)} L${T(86, 136)} M${T(138, 7)} L${T(136, 132)} M${T(184, 4)} L${T(186, 128)}" stroke="#4F8A6A" stroke-width="1.6"/>
    <ellipse cx="${f(x + 120 * m)}" cy="${f(y + 82 * m)}" rx="${f(70 * m)}" ry="${f(13 * m)}" fill="#1E3A2A" opacity="0.35"/>
    <path d="M${T(52, 84)} C${T(48, 46)} ${T(80, 24)} ${T(116, 24)} C${T(156, 24)} ${T(186, 46)} ${T(184, 84)} Z" fill="#9C7860"/>
    <path d="M${T(70, 66)} C${T(72, 46)} ${T(92, 34)} ${T(114, 34)}" stroke="#C9A184" stroke-width="${f(7 * m)}" fill="none" stroke-linecap="round" opacity="0.8"/>
    <path d="M${T(106, 82)} C${T(104, 64)} ${T(112, 56)} ${T(122, 56)} C${T(132, 56)} ${T(140, 64)} ${T(138, 82)} Z" fill="#5E4334"/>
    <path d="M${T(270, 118)} L${T(428, 76)}" stroke="#E1C79C" stroke-width="${f(15 * m)}" stroke-linecap="round"/>
  </g>`;
}

/** Cedulka 準備中 přes ústřednu, když je zavřeno — visí na dvou šňůrkách z lišty s kladkami (souřadnice ústředny) */
function cedulkaZavreno(cx: number, lista: number, y: number, radky: string[]) {
  const w = 236, h = 30 + radky.length * 22;
  return `<g class="ko-u-cedulka-zavreno">
    <path d="M${f(cx - 70)} ${f(lista)} L${f(cx - 80)} ${f(y + 4)} M${f(cx + 70)} ${f(lista)} L${f(cx + 80)} ${f(y + 4)}" stroke="#5E160B" stroke-width="2.4"/>
    <path d="M${f(cx - 70)} ${f(lista)} L${f(cx - 80)} ${f(y + 4)} M${f(cx + 70)} ${f(lista)} L${f(cx + 80)} ${f(y + 4)}" stroke="#FBF7EE" stroke-width="1.6" stroke-dasharray="2 2.4"/>
    <rect x="${f(cx - w / 2 + 3)}" y="${f(y + 4)}" width="${w}" height="${h}" rx="6" fill="#2B2420" opacity="0.22"/>
    <rect x="${f(cx - w / 2)}" y="${f(y)}" width="${w}" height="${h}" rx="6" fill="#D9CCB4" stroke="#8A6A48" stroke-width="1.6"/>
    <rect x="${f(cx - w / 2 + 5)}" y="${f(y + 5)}" width="${w - 10}" height="${h - 10}" rx="4" fill="none" stroke="#B48E5E" stroke-width="0.8"/>
    <text class="ko-kanji" x="${f(cx)}" y="${f(y + 27)}" text-anchor="middle" font-size="19" letter-spacing="3" fill="#2B2420">準備中</text>
    ${radky.map((r, i) => `<text class="ko-ruka-tucne" x="${f(cx)}" y="${f(y + 50 + i * 22)}" text-anchor="middle" font-size="${i ? 18 : 20}" fill="${i ? "#5C5047" : "#C4432B"}">${r}</text>`).join("")}
  </g>`;
}

export function uvnitr(o: UvnitrVolby) {
  const { W, H, rezim, panel, kdo, otevreno } = o;
  const siroka = rezim === "siroka";
  const zavreno = !otevreno;

  /* ——— jádro: posun a měřítko ——— */
  let jx: number, jy: number, jk: number;
  if (siroka) {
    /* levý okraj Kapčiny bubliny (x ≈ 640 v jádře) musí zůstat vpravo od textu */
    jk = Math.max(0.55, Math.min(1, (W - panel.prava - 30) / 1000));
    jx = W - 1640 * jk;
    jy = H - 900 * jk;
  } else {
    const st = panel.dolni;
    jk = Math.min((H - st) / 326, (W / 390) * 1.2);
    jx = (W - 390 * jk) / 2;
    jy = st - 518 * jk;
  }
  const S = (p: Bod): Bod => [jx + p[0] * jk, jy + p[1] * jk];

  /* ——— pozadí přes celou šířku ——— */
  let pz = "";
  const zedDole = siroka ? 700 : S([0, 744])[1] - 8 * jk;
  pz += `<rect width="${f(W)}" height="${f(zedDole)}" fill="url(#ko-u-zed)"/>`;
  if (siroka) {
    pz += `<rect x="${f(W - 300 * jk)}" y="${f(H - 570 * jk)}" width="${f(300 * jk + 2)}" height="${f(zedDole - (H - 570 * jk))}" fill="#A9937D"/>`;
    pz += `<path d="M30 70 L760 40 L800 660 L60 690 Z" fill="url(#ko-u-okno)"/>`;
    pz += `<path d="M300 60 L320 680 M560 50 L584 676" stroke="#BFB7A6" stroke-width="16" opacity="0.1"/>`;
  } else {
    pz += `<path d="M0 60 L${f(W * 0.8)} 50 L${f(W * 0.82)} ${f(zedDole)} L0 ${f(zedDole)} Z" fill="url(#ko-u-okno)"/>`;
    pz += `<rect x="${f(W - 120 * jk)}" y="${f(S([0, 560])[1])}" width="${f(120 * jk + 2)}" height="${f(zedDole - S([0, 560])[1])}" fill="#A9937D"/>`;
  }
  pz += `<rect y="${f(zedDole - 12)}" width="${f(W)}" height="12" fill="#D9D3C6"/>`;
  pz += `<rect y="${f(zedDole)}" width="${f(W)}" height="${f(H - zedDole + 2)}" fill="#B9BCB2"/>`;
  pz += siroka ? hodiny(W - 148 * jk, H - 686 * jk, 50 * jk) : hodiny(W - 52 * jk, S([0, 600])[1], 24 * jk);
  if (siroka) pz += fikus(30, H + 14, 0.74);

  /* stůl: oválný z kanceláře, levý konec zakulacený */
  const [sx0, sy0] = siroka ? S([722, 582]) : S([112, 738]);
  const leva = siroka ? S([480, 890])[0] : S([26, 844])[0];
  pz += `<path d="M${f(sx0)} ${f(sy0 + 8 * jk)} L${f(W + 20)} ${f(sy0 + 8 * jk)} L${f(W + 20)} ${f(H + 20)} L${f(leva - 10)} ${f(H + 20)} C${f(leva - 50 * jk)} ${f(sy0 + 220 * jk)} ${f(sx0 - 220 * jk)} ${f(sy0 + 50 * jk)} ${f(sx0)} ${f(sy0 + 8 * jk)} Z" fill="#A9844F"/>`;
  pz += `<path d="M${f(sx0)} ${f(sy0)} L${f(W + 20)} ${f(sy0)} L${f(W + 20)} ${f(H + 10)} L${f(leva)} ${f(H + 10)} C${f(leva - 50 * jk)} ${f(sy0 + 214 * jk)} ${f(sx0 - 214 * jk)} ${f(sy0 + 50 * jk)} ${f(sx0)} ${f(sy0)} Z" fill="url(#ko-u-stul)"/>`;
  pz += `<path d="M${f(sx0)} ${f(sy0)} L${f(W + 20)} ${f(sy0)}" stroke="#F0DDBA" stroke-width="${f(2.4 * jk)}"/>`;

  /* ——— jádro ——— */
  let j = "";
  let us: ReturnType<typeof ustredna>;
  let stroj: ReturnType<typeof psaciStroj>;
  let kn: ReturnType<typeof kniha> | null = null;
  let drzeny: ReturnType<typeof hrnek>;
  let kdoPos: { x: number; y: number; v: number }, buPos: { x: number; y: number; v: number };
  let kach: { x: number; y: number; velikost: number };
  let ced: { hak: Bod; velikost: number } | null = null;
  if (siroka) {
    j += podlozka(520, 724, 1);
    us = ustredna(880, 160, 370, 420, otevreno);
    j += us.svg;
    drzeny = hrnek({ id: "ko-uh", x: 852, y: 566, s: 0.86, rot: -158, uhel: 62, nadhled: 72 });
    kdoPos = { x: 716, y: 494, v: 136 };
    buPos = { x: 890, y: 500, v: 128 };
    kn = kniha(912, 712, 1.08);
    ced = { hak: [1066, 584], velikost: 112 };
    stroj = psaciStroj(1236, 646, 1);
    kach = { x: 1374, y: 606, velikost: 112 };
  } else {
    us = ustredna(0, 0, 370, 420, otevreno);
    drzeny = hrnek({ id: "ko-uh", x: 92, y: 752, s: 0.6, rot: -164, uhel: 62, nadhled: 72 });
    kdoPos = { x: 14, y: 712, v: 92 };
    buPos = { x: 112, y: 712, v: 88 };
    stroj = psaciStroj(186, 752, 0.46);
    kach = { x: 244, y: 706, velikost: 62 };
  }
  const UM = siroka ? 1 : 0.54;
  const UO: Bod = siroka ? [0, 0] : [92, 548];
  const naUs = (p: Bod): Bod => [UO[0] + p[0] * UM, UO[1] + p[1] * UM];
  if (!siroka) j += `<g transform="translate(${UO[0]} ${UO[1]}) scale(${UM})">${us.svg}</g>`;
  const linka = us.linky[AKTIVNI];
  const kladkaJ = naUs(linka.kladka);
  /* zavřeno: provázek linky 二 končí u hrnku v kolébce, nikdo ho nedrží */
  const pataJ = otevreno ? drzeny.naObraz(0, 76) : naUs([linka.cx + 6, linka.cy - 6]);

  if (otevreno) {
    /* aktivní linka od kladky dolů k drženému hrnku */
    const sestup = provazek(prohnuty(kladkaJ, pataJ, siroka ? 6 : 4), siroka ? 2.2 : 1.6, siroka ? 3.2 : 2.4, 0);
    j += provazekSvg(sestup, "ko-u-sestup", siroka ? 3.2 : 2.4);
    j += drzeny.svg;
    j += kami(kdo, kdoPos.x, kdoPos.y, kdoPos.v, "ko-u-kdo", 10);
    j += kami("bublinka", buPos.x, buPos.y, buPos.v, "ko-u-bublinka", -9);
  } else if (siroka) {
    /* Bublinka kouká ze své hroudy na podložce — ořízne ji oblouk dvířek */
    j += `<defs><clipPath id="ko-u-dvirka"><path d="M626 806 C624 788 632 780 642 780 C652 780 660 788 658 806 Z"/></clipPath></defs>
      <g clip-path="url(#ko-u-dvirka)"><g class="ko-u-vykuk">${kami("bublinka", 619, 776, 46)}</g></g>`;
  } else {
    j += kami("bublinka", buPos.x, buPos.y, buPos.v, "ko-u-bublinka", -6);
  }
  if (kn && ced) {
    j += kn.svg;
    j += `<path d="M1150 790 L1150 610 Q1150 584 1124 584 L${ced.hak[0]} ${ced.hak[1]}" stroke="#8C6A24" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    j += `<g class="ko-u-cedulka" transform="translate(${ced.hak[0]} ${ced.hak[1]}) rotate(${otevreno ? 24 : 0})">${kami("cedulka", -ced.velikost / 2, -30, ced.velikost)}</g>`;
  }
  if (siroka) j += kafe(1196, 872, 0.9, otevreno);
  j += stroj.svg;
  /* zavřeno: Kachlík spí rovnou na klávesách */
  const [spiX, spiY] = stroj.klavesy[16];
  const kachPoz: Bod = otevreno ? [kach.x, kach.y] : [spiX - kach.velikost * 0.5, spiY - kach.velikost * 0.86];
  j += `<g class="ko-u-kachlik${otevreno ? "" : " spi"}" transform="translate(${f(kachPoz[0])} ${f(kachPoz[1])})">${kami("kachlik", 0, 0, kach.velikost)}</g>`;

  const jadro = `<g class="ko-u-jadro" transform="translate(${f(jx)} ${f(jy)}) scale(${f(jk)})">${j}</g>`;

  /* ——— provázky od okna pod stropem ke kladkám (ve scéně) ——— */
  let prov = "";
  let vstup: Bod = [0, 0];
  const w0 = siroka ? 5.6 : 3.4, w1 = siroka ? 1.6 : 1.2;
  us.linky.forEach((l) => {
    const cil = S(naUs(l.kladka));
    const start: Bod = siroka ? [W - 1600 * jk + (520 + l.k * 122) * jk, -14] : [W + 14, S([0, 536])[1] + l.k * Math.max(22 * jk, (H - panel.dolni) * 0.07)];
    if (l.k === AKTIVNI) vstup = start;
    const p = provazek(prohnuty(start, cil, siroka ? 10 : 4), w0, w1, siroka ? 1.9 : 1.4);
    prov += provazekSvg(p, l.k === AKTIVNI ? "ko-u-aktivni" : "", w0);
  });

  /* ——— zavřeno: tma, světlo oknem (den/měsíc), kontrolka linky a cedulka nad ní ——— */
  let tma = "";
  if (zavreno) {
    const sviti = S(naUs([linka.cx + 40, linka.cy - 32]));
    const [ux, uy] = S(naUs([0, 0]));
    const usM = jk * UM;
    /* u okna (vlevo, za zády) zůstává světleji, ať se čte text; k ústředně tmavne */
    tma += `<rect class="ko-u-tma" x="-10" y="-10" width="${f(W + 20)}" height="${f(H + 20)}" fill="url(#ko-u-tma-g)"/>`;
    tma += `<rect class="ko-u-tma-noc" x="-10" y="-10" width="${f(W + 20)}" height="${f(H + 20)}"/>`;
    tma += `<path class="ko-u-paprsek ko-u-paprsek-den" d="M0 0 L${f(W * 0.46)} 0 L${f(W * 0.62)} ${f(H)} L0 ${f(H)} Z"/>`;
    tma += `<path class="ko-u-paprsek ko-u-paprsek-noc" d="M0 0 L${f(W * 0.46)} 0 L${f(W * 0.62)} ${f(H)} L0 ${f(H)} Z"/>`;
    tma += `<circle class="ko-u-kontrolka-zare" cx="${f(sviti[0])}" cy="${f(sviti[1])}" r="${f(26 * jk * UM)}" fill="url(#ko-u-zare)"/>`;
    tma += `<g transform="translate(${f(ux)} ${f(uy)}) scale(${f(usM)})">${cedulkaZavreno(siroka ? 1065 : 185, siroka ? 194 : 34, siroka ? 300 : 140, o.cedulka ?? ["zavřeno"])}</g>`;
    const [zx, zy] = S([kachPoz[0] + kach.velikost * 0.7, kachPoz[1] + kach.velikost * 0.1]);
    const zz = 15 * jk * (siroka ? 1 : 0.7);
    tma += `<g class="ko-zzz ko-u-zzz ko-ruka-tucne" font-size="${f(zz)}"><text x="${f(zx)}" y="${f(zy)}">z</text><text x="${f(zx + zz * 0.7)}" y="${f(zy - zz * 0.9)}" font-size="${f(zz * 1.25)}">z</text><text x="${f(zx + zz * 1.5)}" y="${f(zy - zz * 2.1)}" font-size="${f(zz * 1.55)}">Z</text></g>`;
  }

  const body: UvnitrBody = {
    zavreno,
    jadro: { ox: jx, oy: jy, k: jk },
    vstup,
    kladka: S(kladkaJ),
    pata: S(pataJ),
    ohnisko: otevreno ? S(drzeny.naObraz(0, 38)) : S(naUs([linka.cx, linka.cy])),
    /* Bubliny se nesmí překrýt: Kapčina vlevo nahoře, Bublinčina vpravo níž */
    hlavaKdo: S(siroka ? [kdoPos.x + kdoPos.v * 0.12, kdoPos.y - kdoPos.v * 0.06] : [kdoPos.x + kdoPos.v * 0.5, kdoPos.y - kdoPos.v * 0.1]),
    hlavaBublinka: zavreno && siroka ? S([642, 782]) : S(siroka ? [buPos.x + buPos.v * 1.02, buPos.y + buPos.v * 0.42] : [buPos.x + buPos.v * 1.6, buPos.y + buPos.v * 0.62]),
    cedulka: ced,
    kniha: kn ? { hrbet: kn.hrbet, sirka: kn.sirka, zdvih: kn.zdvih } : null,
    kachlik: kach,
    klavesy: stroj.klavesy,
    w0,
    w1,
  };
  /* Pozadí, jádro, pak provázky (jsou nejblíž oku — vedou pod stropem nad hlavou) */
  return { svg: `${pz}${jadro}<g class="ko-u-provazky">${prov}</g>${tma}`, body };
}

export const UVNITR_DEFS = `
  <linearGradient id="ko-u-zed" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F5F3EE"/><stop offset="1" stop-color="#E4E0D6"/></linearGradient>
  <linearGradient id="ko-u-dub" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${DUB.svetlo}"/><stop offset="0.55" stop-color="${DUB.stred}"/><stop offset="1" stop-color="${DUB.stin}"/></linearGradient>
  <linearGradient id="ko-u-panel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6EFE2"/><stop offset="1" stop-color="#E9DCC6"/></linearGradient>
  <linearGradient id="ko-u-stul" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#CFAE82"/><stop offset="0.35" stop-color="#DDBE92"/><stop offset="1" stop-color="#E6CBA2"/></linearGradient>
  <linearGradient id="ko-u-stroj" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B9DCC6"/><stop offset="1" stop-color="#86B49C"/></linearGradient>
  <radialGradient id="ko-u-okno" cx="0.45" cy="0.4" r="0.7"><stop offset="0" stop-color="#FFF1CC" stop-opacity="0.75"/><stop offset="1" stop-color="#FFF1CC" stop-opacity="0"/></radialGradient>
  <linearGradient id="ko-u-paprsek-den" x1="0" y1="0" x2="1" y2="0.6"><stop offset="0" stop-color="#FFF1CC" stop-opacity="0.5"/><stop offset="1" stop-color="#FFF1CC" stop-opacity="0"/></linearGradient>
  <linearGradient id="ko-u-paprsek-noc" x1="0" y1="0" x2="1" y2="0.6"><stop offset="0" stop-color="#C9D8FF" stop-opacity="0.42"/><stop offset="1" stop-color="#C9D8FF" stop-opacity="0"/></linearGradient>
  <linearGradient id="ko-u-tma-g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0B1030" stop-opacity="0.1"/><stop offset="0.4" stop-color="#0B1030" stop-opacity="0.18"/><stop offset="0.62" stop-color="#0B1030" stop-opacity="0.5"/><stop offset="1" stop-color="#0B1030" stop-opacity="0.62"/></linearGradient>
  <radialGradient id="ko-u-zare"><stop offset="0" stop-color="#FFC56E" stop-opacity="0.9"/><stop offset="0.4" stop-color="#FF9F2E" stop-opacity="0.35"/><stop offset="1" stop-color="#FF9F2E" stop-opacity="0"/></radialGradient>`;
