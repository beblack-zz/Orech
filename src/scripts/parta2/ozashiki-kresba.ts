/**
 * Kresby ke hře Tora-tora (ozashiki.ts): skládací zástěna byóbu se zlatem
 * a bambusovým hájem v tuši — v tom háji přemohl válečník Watōnai tygra
 * (a jeden tygr tam pořád vykukuje) — a tři podobizny na karty a tlačítka:
 * válečník s kopím a rumělkovým kumadori, tygr, stařena s holí.
 * Čistý styl jako postavičky webu: hladké plochy, obrys tuší, žádné textury.
 * Id mají předponu oz- (na stránce jsou jen jednou, v panelu hry).
 */
import type { ToraKdo } from "../../data/pruvodce";

const TUS = "#2B2420";
const RUMELKA = "#C4432B";
const PODKLAD = "#F6EAD2";

const TVARY: Record<ToraKdo, string> = {
  /* tygr: kulatá hlava, uši, pruhy na čele a tvářích, světlý čenich, vousky */
  tora:
    `<circle cx="18.5" cy="19" r="7" fill="#E58A2E" stroke="${TUS}" stroke-width="1.6"/>` +
    `<circle cx="45.5" cy="19" r="7" fill="#E58A2E" stroke="${TUS}" stroke-width="1.6"/>` +
    `<circle cx="18.5" cy="19.5" r="3.6" fill="#FBE3C4"/><circle cx="45.5" cy="19.5" r="3.6" fill="#FBE3C4"/>` +
    `<ellipse cx="32" cy="35" rx="19" ry="16.5" fill="#E58A2E" stroke="${TUS}" stroke-width="1.8"/>` +
    `<path d="M32 19.5 L30.6 25.5 L33.4 25.5 Z M25.5 21 L26.6 26 L28.4 25.2 Z M38.5 21 L37.4 26 L35.6 25.2 Z" fill="${TUS}"/>` +
    `<path d="M13.6 33 L20 34.6 L13.8 36.4 M14.5 40 L20.2 39.6 M50.4 33 L44 34.6 L50.2 36.4 M49.5 40 L43.8 39.6" stroke="${TUS}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>` +
    `<ellipse cx="32" cy="41.5" rx="9.5" ry="7" fill="#FFF6E6"/>` +
    `<ellipse cx="25" cy="32.5" rx="2.3" ry="2.8" fill="${TUS}"/><ellipse cx="39" cy="32.5" rx="2.3" ry="2.8" fill="${TUS}"/>` +
    `<circle cx="25.8" cy="31.5" r="0.8" fill="#FFFFFF"/><circle cx="39.8" cy="31.5" r="0.8" fill="#FFFFFF"/>` +
    `<path d="M29.4 38 Q32 36.8 34.6 38 L32 40.6 Z" fill="#6B3A2E"/>` +
    `<path d="M32 40.6 V42.4 M28.5 43.2 Q30.3 44.8 32 42.4 Q33.7 44.8 35.5 43.2" stroke="${TUS}" stroke-width="1.2" stroke-linecap="round" fill="none"/>` +
    `<path d="M22 42 L15 41 M22 44 L15.5 45.5 M42 42 L49 41 M42 44 L48.5 45.5" stroke="${TUS}" stroke-width="0.8" stroke-linecap="round" opacity="0.6"/>`,
  /* stařena: šedivý drdol a čepička vlasů s pěšinkou, oči jako obloučky, vrásky, hůl s háčkem */
  roba:
    `<path d="M50 60 L49 30 Q49 24 54 24 Q58 24 58 28" stroke="${TUS}" stroke-width="3.6" stroke-linecap="round" fill="none"/>` +
    `<path d="M50 60 L49 30 Q49 24 54 24 Q58 24 58 28" stroke="#9A6A3A" stroke-width="2" stroke-linecap="round" fill="none"/>` +
    `<circle cx="32" cy="13.5" r="6" fill="#ECE6DC" stroke="${TUS}" stroke-width="1.5"/>` +
    `<circle cx="32" cy="35" r="16.5" fill="#F6DFC4" stroke="${TUS}" stroke-width="1.8"/>` +
    `<path d="M15.6 33 Q16 18.5 32 18.5 Q48 18.5 48.4 33 Q44 25.5 32 25 Q20 25.5 15.6 33 Z" fill="#ECE6DC" stroke="${TUS}" stroke-width="1.5" stroke-linejoin="round"/>` +
    `<path d="M32 19 Q31 22 32 25" stroke="#B9B1A4" stroke-width="1" fill="none"/>` +
    `<path d="M23.5 35 Q26 32.5 28.5 35 M35.5 35 Q38 32.5 40.5 35" stroke="${TUS}" stroke-width="1.6" stroke-linecap="round" fill="none"/>` +
    `<path d="M21 34 L19.4 33 M21.2 36 L19.6 36.6 M43 34 L44.6 33 M42.8 36 L44.4 36.6" stroke="${TUS}" stroke-width="0.9" stroke-linecap="round" opacity="0.6"/>` +
    `<ellipse cx="23" cy="40" rx="3.2" ry="2" fill="#F2A9A0" opacity="0.7"/><ellipse cx="41" cy="40" rx="3.2" ry="2" fill="#F2A9A0" opacity="0.7"/>` +
    `<path d="M28.5 43 Q32 45.8 35.5 43" stroke="${TUS}" stroke-width="1.4" stroke-linecap="round" fill="none"/>`,
  /* válečník Watōnai: kopí za hlavou s rumělkovým střapcem, bílé líčení s kumadori, čonmage */
  watonai:
    `<path d="M9 58 L51 11.5" stroke="${TUS}" stroke-width="3.4" stroke-linecap="round"/>` +
    `<path d="M9 58 L51 11.5" stroke="#8A5A2B" stroke-width="1.8" stroke-linecap="round"/>` +
    `<path d="M51 11.5 L56.1 8.4 L58.5 3 L53.4 6.1 Z" fill="#E4E2DA" stroke="${TUS}" stroke-width="1.1" stroke-linejoin="round"/>` +
    `<path d="M49.6 13.2 Q47 18.2 48.6 23.2 M50.6 13.8 Q49.6 18.8 51.6 22.8" stroke="${RUMELKA}" stroke-width="2" stroke-linecap="round" fill="none"/>` +
    `<circle cx="31" cy="36" r="16" fill="#FBF3E8" stroke="${TUS}" stroke-width="1.8"/>` +
    `<path d="M15.2 33 Q15.5 19.5 31 19.5 Q46.5 19.5 46.8 33 Q42 27 31 26.5 Q20 27 15.2 33 Z" fill="#1E1A18"/>` +
    `<path d="M27.5 19.8 Q31 15 35 19.8" stroke="#1E1A18" stroke-width="3.2" stroke-linecap="round" fill="none"/>` +
    `<path d="M19 31 Q23 27 27.5 30.5 M43 31 Q39 27 34.5 30.5" stroke="${RUMELKA}" stroke-width="2.6" stroke-linecap="round" fill="none"/>` +
    `<path d="M20.5 38 Q22.5 36.8 25 38.2 M41.5 38 Q39.5 36.8 37 38.2" stroke="${RUMELKA}" stroke-width="1.6" stroke-linecap="round" fill="none"/>` +
    `<path d="M22.5 34.2 L27.6 33.2 M39.5 34.2 L34.4 33.2" stroke="${TUS}" stroke-width="2" stroke-linecap="round"/>` +
    `<path d="M27 44.5 Q31 42.5 35 44.5" stroke="${TUS}" stroke-width="1.6" stroke-linecap="round" fill="none"/>`,
};

/** Podobizna na kartu nebo tlačítko: kulatý medailon 64 × 64 */
export const podobizna = (kdo: ToraKdo) =>
  `<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><circle cx="32" cy="32" r="30" fill="${PODKLAD}"/>${TVARY[kdo]}</svg>`;

/* ——— Zástěna ——— */
const DILY = 4, X0 = 104, SIRKA = 38, HORE = 26, DOLE = 146;
/** Stéblo bambusu: lehce prohnuté, s kolénky a s listy nahoře */
const steblo = (x: number, ohyb: number, kolena: number[], listy: [number, number, number][]) =>
  `<path d="M${x} ${DOLE} C${x - 1} 110 ${x + ohyb} 70 ${x + ohyb * 0.6} ${HORE + 4}" stroke="#3E5236" stroke-width="4.2" fill="none" stroke-linecap="round"/>` +
  kolena.map((y) => `<path d="M${x - 4} ${y} H${x + 4}" stroke="#26331F" stroke-width="1.6" stroke-linecap="round"/>`).join("") +
  listy
    .map(([lx, ly, u]) => `<path d="M0 0 Q9 -4.5 20 -1.5 Q9 2 0 0 Z" fill="#33472D" transform="translate(${lx} ${ly}) rotate(${u})"/>`)
    .join("");

export const zastena = () =>
  `<svg class="ozashiki-zastena" viewBox="0 0 360 170" aria-hidden="true" focusable="false">` +
  `<defs>` +
  `<linearGradient id="oz-zlato" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F3D98A"/><stop offset="1" stop-color="#D9AE52"/></linearGradient>` +
  `<linearGradient id="oz-zlato-stin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E2C26E"/><stop offset="1" stop-color="#C39642"/></linearGradient>` +
  `</defs>` +
  /* tatami a stín zástěny */
  `<rect x="0" y="${DOLE}" width="360" height="24" fill="#D9C99E"/>` +
  `<path d="M0 ${DOLE} H360" stroke="#B5A270" stroke-width="1.5"/>` +
  `<ellipse cx="180" cy="${DOLE + 2}" rx="86" ry="5" fill="${TUS}" opacity="0.12"/>` +
  /* čtyři díly — vedle sebe světlejší a stinnější, ať je znát, že se skládá */
  Array.from({ length: DILY }, (_, i) => `<rect x="${X0 + i * SIRKA}" y="${HORE}" width="${SIRKA}" height="${DOLE - HORE}" fill="url(#oz-zlato${i % 2 ? "-stin" : ""})"/>`).join("") +
  /* bambusový háj tuší */
  steblo(124, -3, [120, 92, 64, 42], [[122, 50, -18], [121, 56, 12], [120, 76, 160], [123, 98, -24]]) +
  steblo(196, 4, [124, 98, 70, 46], [[198, 44, 200], [199, 60, -14], [197, 84, 168], [200, 108, 8]]) +
  steblo(238, -2, [116, 88, 60, 38], [[236, 46, -150], [238, 70, 20], [237, 94, 196]]) +
  /* a tygr z té hry pořád vykukuje mezi stébly */
  `<g transform="translate(212 136)">` +
  `<circle cx="-6" cy="-6" r="3.2" fill="#E58A2E" stroke="${TUS}" stroke-width="1"/><circle cx="6" cy="-6" r="3.2" fill="#E58A2E" stroke="${TUS}" stroke-width="1"/>` +
  `<path d="M-10 6 Q-10 -6 0 -6 Q10 -6 10 6 Z" fill="#E58A2E" stroke="${TUS}" stroke-width="1.2"/>` +
  `<circle cx="-3.4" cy="0" r="1.3" fill="${TUS}"/><circle cx="3.4" cy="0" r="1.3" fill="${TUS}"/>` +
  `<path d="M0 -6 V-3 M-5 -5 L-4 -2.6 M5 -5 L4 -2.6" stroke="${TUS}" stroke-width="1" stroke-linecap="round"/>` +
  `</g>` +
  /* rám z černého laku a nožky */
  `<rect x="${X0}" y="${HORE}" width="${DILY * SIRKA}" height="${DOLE - HORE}" fill="none" stroke="#231E24" stroke-width="4" stroke-linejoin="round"/>` +
  Array.from({ length: DILY - 1 }, (_, i) => `<path d="M${X0 + (i + 1) * SIRKA} ${HORE} V${DOLE}" stroke="#231E24" stroke-width="2.4"/>`).join("") +
  `<rect x="${X0 - 2}" y="${DOLE}" width="9" height="4" rx="1" fill="#231E24"/><rect x="${X0 + DILY * SIRKA - 7}" y="${DOLE}" width="9" height="4" rx="1" fill="#231E24"/>` +
  `</svg>`;
