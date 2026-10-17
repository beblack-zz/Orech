/**
 * Louka pod první obrazovkou Kontaktu — pásy trávy za sebou jako kulisy
 * v divadle: každý pás začíná vlnitou hranou se stébly a světlým lemem,
 * nahoře je světlejší a dolů tmavne, a na hraně stojí ten z party, kdo
 * odpovídá, nebo vývěska s mapou. Další pás pak leží blíž a přes spodek
 * toho předchozího. Kvítí, listí a sníh jsou ve skupinách svt-jen-*,
 * takže je přepne roční období stejně jako na první obrazovce.
 *
 * Kreslí se v prohlížeči (scripts/kontakt/louka.ts), protože hrany leží
 * tam, kde po zalomení textu skončí řádky otázek — jednotky jsou CSS px.
 */
import { type Bod, f, nahoda, vzorkuj, hladka, vyskaNa, list } from "./zaklad";
import type { Sezona } from "../../../data/uvod2";

export interface LoukaVolby {
  /** Šířka a výška plátna v px */
  W: number;
  H: number;
  /** Hrany pásů shora dolů (y v px plátna); první je šev s první obrazovkou */
  hrany: number[];
  /** Úzké okno: drobnější stébla a méně kvítí */
  uzka: boolean;
  /** Kreslí se jen kvítí tohoto období (při změně měsíce skript kreslí znovu) */
  sezona: Sezona;
}

/** Vlnitá hrana pásu přes celou šířku, k jedné straně se mírně zvedá */
function hrana(W: number, y: number, seed: number, amp: number, sklon: number): Bod[] {
  const R = nahoda(seed);
  const b: Bod[] = [];
  const krok = 150 + R() * 60;
  const s = (R() - 0.5) * 2 * sklon;
  for (let x = -80; x <= W + 80 + krok; x += krok * (0.8 + R() * 0.4)) b.push([x, y + (R() - 0.5) * 2 * amp + s * (x / W - 0.5)]);
  return b;
}

/** Trsy trávy roztroušené po pásu, ať plocha mezi hranami není holá */
function trsy(W: number, y0: number, y1: number, uzka: boolean, seed: number) {
  if (y1 - y0 < 30) return "";
  const R = nahoda(seed);
  const pocet = Math.round((W * (y1 - y0)) / (uzka ? 11000 : 15000));
  let d1 = "", d2 = "";
  for (let i = 0; i < pocet; i++) {
    const x = R() * W, y = y0 + R() * (y1 - y0), v = (uzka ? 9 : 12) * (0.6 + R() * 0.7);
    const t = `M${f(x - 4)} ${f(y)}Q${f(x - 5)} ${f(y - v * 0.6)} ${f(x - 8)} ${f(y - v)}Q${f(x - 3)} ${f(y - v * 0.5)} ${f(x)} ${f(y)}Q${f(x + 1)} ${f(y - v * 0.8)} ${f(x + 1)} ${f(y - v * 1.25)}Q${f(x + 2)} ${f(y - v * 0.7)} ${f(x + 3)} ${f(y)}Q${f(x + 5)} ${f(y - v * 0.6)} ${f(x + 9)} ${f(y - v * 0.9)}Q${f(x + 5)} ${f(y - v * 0.4)} ${f(x + 5)} ${f(y)}Z`;
    if (R() < 0.55) d1 += t;
    else d2 += t;
  }
  return `<path class="svt-trava-2" d="${d1}" opacity="0.55"/><path class="svt-trava-3" d="${d2}" opacity="0.45"/>`;
}

/** Plocha pod hranou až k `dole` */
const plocha = (H: Bod[], dole: number) => {
  const b = vzorkuj(H, 40);
  return hladka([...b, [b[b.length - 1][0], dole], [b[0][0], dole]]);
};

/** Stébla podél hrany: pata kousek pod hranou, vršek nad ní */
function stebla(Bh: Bod[], W: number, pocet: number, vyska: number, seed: number, tridy: string[], posun: number) {
  const R = nahoda(seed);
  const po = new Map<string, string[]>();
  for (let i = 0; i < pocet; i++) {
    const x = -20 + R() * (W + 40);
    const y = vyskaNa(Bh, x) + 4 + posun * (0.4 + R() * 0.8);
    const w = 3 + R() * 5;
    const h = vyska * (0.4 + R() * 0.6);
    const l = (R() - 0.35) * 34 * (vyska / 58);
    const t = tridy[Math.floor(R() * tridy.length)];
    const d = `M${f(x - w / 2)} ${f(y)}Q${f(x + l * 0.35)} ${f(y - h * 0.6)} ${f(x + l)} ${f(y - h)}Q${f(x + l * 0.45)} ${f(y - h * 0.55)} ${f(x + w / 2)} ${f(y)}Z`;
    if (!po.has(t)) po.set(t, []);
    po.get(t)!.push(d);
  }
  return [...po].map(([t, d]) => `<path class="${t}" d="${d.join("")}"/>`).join("");
}

/** Kvítí, listí a ořechy kousek pod hranou — podle ročního období */
function drobnosti(Bh: Bod[], W: number, uzka: boolean, seed: number, sezona: Sezona) {
  const R = nahoda(seed);
  const misto = (od = 18, do_ = 70): Bod => {
    const x = 10 + R() * (W - 20);
    return [x, vyskaNa(Bh, x) + od + R() * (do_ - od)];
  };
  const n = (k: number) => Math.max(2, Math.round(((W / 1440) * k) * (uzka ? 1.4 : 1)));
  let podzim = "", jaro = "", leto = "", predjari = "", zima = "";
  for (let i = 0; i < n(18); i++) {
    const [x, y] = misto(10, 80);
    podzim += `<g transform="translate(${f(x)} ${f(y)}) rotate(${f((R() - 0.5) * 150)}) scale(${f(1.2 + R() * 0.8)})">${list(R() < 0.5 ? "#D9A63C" : "#C27C2E")}</g>`;
  }
  for (let i = 0; i < n(4); i++) {
    const [x, y] = misto(24, 70);
    podzim += `<g transform="translate(${f(x)} ${f(y)}) scale(1.4)"><ellipse rx="6.4" ry="5.6" fill="#B98F5E"/><ellipse cx="-1.6" cy="-1.6" rx="2.6" ry="2" fill="#D9B482"/><path d="M-6 0 Q0 1.6 6 0" stroke="#7E5A36" stroke-width="1" fill="none"/></g>`;
  }
  for (let i = 0; i < n(7); i++) {
    const [x, y] = misto(20, 56);
    podzim += `<g transform="translate(${f(x)} ${f(y)}) scale(${f(1.1 + R() * 0.4)})"><path d="M0 0 L0 -16" stroke="#EDE6EE" stroke-width="2.4"/><path d="M-5 -16 C-6 -24 -3 -31 0 -32 C3 -31 6 -24 5 -16 C3 -14 -3 -14 -5 -16 Z" fill="#C8A2D6"/></g>`;
  }
  for (let i = 0; i < n(16); i++) {
    const [x, y] = misto(16, 66);
    jaro += `<g transform="translate(${f(x)} ${f(y)}) scale(${f(1.1 + R() * 0.5)})"><path d="M0 0 L0 -8" stroke="#4F7A36" stroke-width="1.6"/><g fill="#FFFFFF"><ellipse cx="0" cy="-10" rx="5" ry="2"/><ellipse cx="0" cy="-10" rx="2" ry="5"/></g><circle cx="0" cy="-10" r="1.8" fill="#F0BE3A"/></g>`;
    if (i % 2) jaro += `<g transform="translate(${f(x + 16)} ${f(y + 8)}) scale(1.15)"><path d="M0 0 Q-2 -10 0 -20" stroke="#4F7A36" stroke-width="2" fill="none"/><circle cx="0" cy="-23" r="6.6" fill="#F3C622"/><circle cx="0" cy="-23" r="4" fill="#F7D84A"/></g>`;
    if (i % 5 === 0) jaro += `<ellipse cx="${f(x - 12)}" cy="${f(y + 14)}" rx="3.6" ry="2.2" fill="#F8D2DA" transform="rotate(${f(R() * 180)} ${f(x - 12)} ${f(y + 14)})"/>`;
  }
  for (let i = 0; i < n(12); i++) {
    const [x, y] = misto(22, 64);
    leto += i % 3 === 2
      ? `<g transform="translate(${f(x)} ${f(y)}) scale(${f(1 + R() * 0.4)})"><path d="M0 0 Q-2 -12 0 -24" stroke="#4F7A36" stroke-width="1.8" fill="none"/><g fill="#5B7FD1"><circle cx="0" cy="-26" r="4.4"/><circle cx="-4.4" cy="-28.4" r="2.5"/><circle cx="4.4" cy="-28.4" r="2.5"/><circle cx="0" cy="-31" r="2.5"/></g></g>`
      : `<g transform="translate(${f(x)} ${f(y)}) scale(${f(1.05 + R() * 0.45)})"><path d="M0 0 Q2 -14 0 -26" stroke="#4F7A36" fill="none" stroke-width="2"/><circle cx="-3.4" cy="-28" r="6.4" fill="#D9452E"/><circle cx="3.4" cy="-28" r="6.4" fill="#E25A3E"/><circle cx="0" cy="-31" r="5" fill="#EC6A4A"/><circle cx="0" cy="-27.5" r="2.2" fill="#2B2420"/></g>`;
  }
  for (let i = 0; i < n(11); i++) {
    const [x, y] = misto(18, 60);
    predjari += i % 3 === 0
      ? `<g transform="translate(${f(x)} ${f(y)}) scale(1.15)"><path d="M0 0 L0 -12" stroke="#E9E2D0" stroke-width="2.2"/><path d="M-5 -12 C-6 -20 -3 -26 0 -27 C3 -26 6 -20 5 -12 C3 -10 -3 -10 -5 -12 Z" fill="${R() < 0.5 ? "#9A72C8" : "#F1E4F4"}"/></g>`
      : `<g transform="translate(${f(x)} ${f(y)}) scale(${f(1.15 + R() * 0.4)})"><path d="M0 0 Q-1 -14 4 -20 Q7 -22 8 -18" stroke="#4F7A36" fill="none" stroke-width="1.5"/><path d="M8 -18 C4 -16 4 -9 8 -6 C12 -9 12 -16 8 -18 Z" fill="#FFFFFF"/></g>`;
  }
  for (let i = 0; i < n(10); i++) {
    const [x, y] = misto(10, 50);
    zima += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(18 + R() * 30)}" ry="${f(3 + R() * 3)}" fill="#FFFFFF" opacity="0.75"/>`;
  }
  const podle: Record<Sezona, string> = { podzim, jaro, leto, predjari, zima };
  return `<g class="svt-jen-${sezona}">${podle[sezona]}</g>`;
}

export function louka(o: LoukaVolby): string {
  const { W, H, hrany, uzka, sezona } = o;
  let s = `<defs>
    <linearGradient id="ko-lk-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--lz1)"/><stop offset="0.55" style="stop-color:var(--lz2)"/><stop offset="1" style="stop-color:var(--lz2)"/></linearGradient>
    <linearGradient id="ko-lk-svetlo" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFE3B8" stop-opacity="0.42"/><stop offset="0.5" stop-color="#FFE3B8" stop-opacity="0.08"/><stop offset="1" stop-color="#FFE3B8" stop-opacity="0"/></linearGradient>
    <linearGradient id="ko-lk-stin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1E2A12" stop-opacity="0.28"/><stop offset="1" stop-color="#1E2A12" stop-opacity="0"/></linearGradient>
  </defs>`;
  const vyska = uzka ? 48 : 68;
  hrany.forEach((y, i) => {
    const Bh = hrana(W, y, 6100 + i * 17, uzka ? 7 : 12, i === 0 ? 4 : uzka ? 10 : 28);
    const B8 = vzorkuj(Bh, 8);
    const dalsi = hrany[i + 1] ?? H;
    const dole = Math.min(H + 20, dalsi + 120);
    /* pás: nahoře světlý, dolů tmavne; pod hranou předchozího pásu stín */
    s += `<path d="${plocha(Bh, dole)}" fill="url(#ko-lk-g)"/>`;
    if (i > 0) s += `<path d="${plocha(Bh.map(([x, yy]) => [x, yy + 6] as Bod), Math.min(dole, y + 70))}" fill="url(#ko-lk-stin)" opacity="0.5"/>`;
    s += `<path class="svt-louka-snih" d="${plocha(Bh.map(([x, yy]) => [x, yy + 5] as Bod), dole)}"/>`;
    /* zadní stébla za lemem, lem, kvítí, přední stébla */
    s += trsy(W, y + 90, dalsi - 24, uzka, 6500 + i);
    s += stebla(B8, W, Math.round(W / (uzka ? 6.5 : 5)), vyska, 6200 + i, ["svt-trava-1", "svt-trava-3", "ko-trava-sucha"], 0);
    s += `<path class="ko-louka-lem" d="${hladka(vzorkuj(Bh, 40), false)}" fill="none" stroke-width="4"/>`;
    s += drobnosti(B8, W, uzka, 6300 + i, sezona);
    s += stebla(B8, W, Math.round(W / (uzka ? 13 : 9)), vyska * 0.8, 6400 + i, ["svt-trava-2", "svt-trava-1", "ko-trava-sucha"], 26);
  });
  s += `<rect x="0" y="0" width="${f(W)}" height="${f(H)}" fill="url(#ko-lk-svetlo)" pointer-events="none"/>`;
  return s;
}
