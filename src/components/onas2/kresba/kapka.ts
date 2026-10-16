/**
 * Kapka, hladina a rozostřená světla úvodu O nás 2 („Svět v kapce“).
 * Čisté funkce bez DOM, kreslí do jeviště 1000 × 1000 z miry.ts.
 *
 * Kapka je složená jako opravdová kapka v makru: uvnitř baňky je svět
 * vzhůru nohama (svet.ts), kolem něj tmavý lem, kde se světlo láme pryč,
 * na kraji tenká světlá hrana, nahoře vlevo odlesk měsíce a dole teplý
 * srpek — světlo z kapky vychází spodem ven a dopadá na hladinu.
 * Obrys je jedna cesta (#pk-tvar), na kterou se odkazuje ořez, lem
 * i obrysová čára; skript jí za běhu mění jen „d“ a polohu baňky.
 *
 * Hladina je černé zrcadlo v perspektivě (promitni z miry.ts): opar na
 * obzoru, pár lesklých pruhů a zář pod kapkou. Klidné kruhy jsou pro
 * omezený pohyb — jinak kruhy kreslí skript. Odraz ensō ve vodě je
 * zrcadlené logo v HTML (Pocatek.astro).
 *
 * Ids mají předponu pk- (na stránce je jen jedna kapka).
 */
import {
  f,
  OSA_X,
  KAPKA_R,
  OBZOR_Y,
  DOPAD_Y,
  DOPAD_Z,
  promitni,
  tvarKapky,
  kruhNaHladine,
  type Bod,
} from "./miry";
import { nahoda } from "../../parta2/tvary";

const kruhovy = (id: string, stopy: [number, string, number][], navic = "") =>
  `<radialGradient id="${id}"${navic}>${stopy.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join("")}</radialGradient>`;
const linearni = (id: string, stopy: [number, string, number][], navic = ` x1="0" y1="0" x2="0" y2="1"`) =>
  `<linearGradient id="${id}"${navic}>${stopy.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join("")}</linearGradient>`;

const rad = (u: number) => (u * Math.PI) / 180;
/** Srpek podél kruhu: od úhlu a do b, mezi poloměry r1 a r2, na koncích do špičky */
function srpek(a: number, b: number, r1: number, r2: number, kroku = 18): string {
  const ven: Bod[] = [];
  const dovnitr: Bod[] = [];
  for (let i = 0; i <= kroku; i++) {
    const t = i / kroku;
    const u = rad(a + (b - a) * t);
    const tl = Math.sin(Math.PI * t);
    const rr2 = r1 + (r2 - r1) * Math.pow(tl, 0.7);
    ven.push([Math.cos(u) * rr2, Math.sin(u) * rr2]);
    dovnitr.push([Math.cos(u) * r1, Math.sin(u) * r1]);
  }
  const body = [...ven, ...dovnitr.reverse()];
  return `M${body.map(([x, y]) => `${f(x)} ${f(y)}`).join("L")}Z`;
}

/** Čtyřcípá hvězdička třpytu */
const trpyt = (x: number, y: number, r: number, uhel = 0) => {
  const k = r * 0.16;
  const d = `M0 ${f(-r)}Q${f(k)} ${f(-k)} ${f(r)} 0Q${f(k)} ${f(k)} 0 ${f(r)}Q${f(-k)} ${f(k)} ${f(-r)} 0Q${f(-k)} ${f(-k)} 0 ${f(-r)}Z`;
  return `<path d="${d}" transform="translate(${f(x)} ${f(y)}) rotate(${uhel})"/>`;
};

/* ——— Kapka ——— */

/** Svět z svet.ts má poloměr SVET_R; v baňce ho kousek zvětšíme, ať sahá až k tmavému lemu */
const SVET_ZOOM = 1.07;

export function kapkaDefs(): string {
  const plna = tvarKapky(1);
  return (
    `<path id="pk-tvar" d="${plna.d}"/>` +
    `<clipPath id="pk-obrys"><use href="#pk-tvar"/></clipPath>` +
    /* Co se ponoří pod hladinu, není vidět */
    `<clipPath id="pk-nad"><rect x="-3000" y="-3000" width="7000" height="${3000 + DOPAD_Y + 2}"/></clipPath>` +
    /*
     * Špička slzy ukazuje stažený obraz okolí: u trubky noční modř, níž
     * tyrkys a nakonec zeleň louky, kterou svět v baňce začíná nahoře.
     */
    linearni("pk-telo", [
      [0, "#25366E", 1],
      [0.12, "#30527E", 1],
      [0.26, "#3A6E7C", 1],
      [0.38, "#4A8466", 1],
      [0.56, "#3A5E6A", 1],
      [1, "#1E2A5A", 1],
    ]) +
    /* Lem baňky — v rámečku elipsy baňky (objectBoundingBox), takže se natahuje s ní */
    kruhovy("pk-lem", [
      [0, "#050A22", 0],
      [0.85, "#050A22", 0],
      [0.915, "#050A22", 0.62],
      [0.965, "#0A173E", 0.86],
      [1, "#2A4A94", 0.7],
    ], ` cx="0.5" cy="0.5" r="0.5"`) +
    /* Lem baňky nahoře mizí — u slzy baňka přechází rovnou ve špičku, žádný pás mezi nimi */
    linearni("pk-lem-svisle", [
      [0.1, "#000000", 1],
      [0.42, "#FFFFFF", 1],
    ]) +
    `<mask id="pk-lem-maska" maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill="url(#pk-lem-svisle)"/></mask>` +
    kruhovy("pk-halo", [
      [0, "#FFFFFF", 0.42],
      [0.5, "#E8F4FF", 0.14],
      [1, "#E8F4FF", 0],
    ]) +
    kruhovy("pk-dno", [
      [0, "#FFD39A", 0.55],
      [0.6, "#FFB874", 0.16],
      [1, "#FFB874", 0],
    ]) +
    /* Malá čepička v prasklině — skleněná kulička bez světa uvnitř */
    kruhovy("pk-cepicka", [
      [0, "#DDEFFF", 0.9],
      [0.45, "#7FA6D8", 0.85],
      [1, "#24336E", 0.95],
    ], ` cx="0.4" cy="0.62" r="0.7"`) +
    kruhovy("pk-perla", [
      [0, "#FFFFFF", 1],
      [0.35, "#DDF0FF", 0.95],
      [0.8, "#8DB8E4", 0.85],
      [1, "#5A84C0", 0.8],
    ], ` cx="0.38" cy="0.34" r="0.7"`) +
    /* Koruna po dopadu: dole teplá (to je ten svět z kapky), nahoře průsvitně bílá */
    linearni("pk-koruna", [
      [0, "#FFFFFF", 0.95],
      [0.25, "#D8EEFF", 0.82],
      [0.75, "#7FA8DA", 0.6],
      [1, "#F2B57E", 0.7],
    ]) +
    linearni("pk-koruna-zad", [
      [0, "#EAF6FF", 0.8],
      [0.5, "#86AEDD", 0.42],
      [1, "#E7A877", 0.5],
    ]) +
    linearni("pk-sloup", [
      [0, "#9CC3EA", 0.85],
      [0.45, "#F4FBFF", 0.95],
      [1, "#8CB4E0", 0.85],
    ], ` x1="0" y1="0" x2="1" y2="0"`) +
    kruhovy("pk-zablesk", [
      [0, "#FFF8E6", 0.95],
      [0.3, "#FFE7B8", 0.5],
      [1, "#FFD08A", 0],
    ])
  );
}

/**
 * Kapka: tělo, svět uvnitř, lem, odlesky. `svet` je kresba z svet.ts
 * (kruh SVET_R kolem 0,0). Baňka i odlesky sedí na plné visící kapce —
 * skript je posouvá a zvětšuje přes transform.
 */
export function kapka(svet: string): string {
  const plna = tvarKapky(1);
  const [cx, cy] = plna.stred;
  const R = KAPKA_R;
  const posun = `translate(${f(cx)} ${f(cy)})`;
  const ry = plna.ry;

  /* Pruh světla po levé straně krku (ořízne ho obrys, takže nikdy nevyleze ven) */
  const krkLesk = `<path class="pk-krk-lesk" d="M${OSA_X - 26} 226 C${OSA_X - 34} 290 ${OSA_X - 64} 352 ${OSA_X - 98} 412 L${OSA_X - 88} 418 C${OSA_X - 52} 360 ${OSA_X - 24} 296 ${OSA_X - 16} 226Z" fill="#DDF1FF" opacity="0.26"/>` +
    `<path class="pk-krk-lesk" d="M${OSA_X + 22} 232 C${OSA_X + 30} 290 ${OSA_X + 52} 340 ${OSA_X + 80} 388" fill="none" stroke="#FFCF96" stroke-width="5" stroke-linecap="round" opacity="0.3"/>`;

  const telo =
    `<g class="pk-telo" clip-path="url(#pk-obrys)">` +
    `<use href="#pk-tvar" fill="url(#pk-telo)"/>` +
    `<g class="pk-svet" transform="${posun}"><g transform="scale(${SVET_ZOOM})">${svet}</g></g>` +
    `<ellipse class="pk-lem" cx="${f(cx)}" cy="${f(cy)}" rx="${f(R)}" ry="${f(ry)}" fill="url(#pk-lem)" mask="url(#pk-lem-maska)"/>` +
    /* Lem i po krku: široký a řidší, pak úzký a hustší — vidět je jen vnitřní půlka tahu */
    `<use href="#pk-tvar" fill="none" stroke="#050A22" stroke-width="30" stroke-opacity="0.3"/>` +
    `<use href="#pk-tvar" fill="none" stroke="#050A22" stroke-width="13" stroke-opacity="0.42"/>` +
    `<use href="#pk-tvar" fill="none" stroke="#8ED8FF" stroke-width="7" stroke-opacity="0.24"/>` +
    krkLesk +
    `</g>`;

  /* Odlesky v souřadnicích baňky — světlo jde zleva shora, od měsíce */
  const lesky =
    `<g class="pk-lesky" transform="${posun}">` +
    `<ellipse cx="${f(-0.46 * R)}" cy="${f(-0.5 * R)}" rx="${f(0.36 * R)}" ry="${f(0.2 * R)}" transform="rotate(-42 ${f(-0.46 * R)} ${f(-0.5 * R)})" fill="url(#pk-halo)"/>` +
    `<path d="${srpek(198, 254, 0.8 * R, 0.885 * R)}" fill="#FFFFFF" opacity="0.82"/>` +
    `<path d="${srpek(262, 290, 0.84 * R, 0.9 * R, 10)}" fill="#FFFFFF" opacity="0.38"/>` +
    /* Okno — vrata garáže v odlesku, prohnutá po baňce */
    `<path d="M${f(-0.5 * R)} ${f(-0.18 * R)}C${f(-0.47 * R)} ${f(-0.3 * R)} ${f(-0.38 * R)} ${f(-0.4 * R)} ${f(-0.27 * R)} ${f(-0.46 * R)}L${f(-0.22 * R)} ${f(-0.33 * R)}C${f(-0.31 * R)} ${f(-0.27 * R)} ${f(-0.38 * R)} ${f(-0.19 * R)} ${f(-0.41 * R)} ${f(-0.09 * R)}Z" fill="#F2F9FF" opacity="0.2"/>` +
    `<g class="pk-trpyt" fill="#FFFFFF">${trpyt(-0.6 * R, -0.62 * R, 0.16 * R, 8)}<circle cx="${f(-0.6 * R)}" cy="${f(-0.62 * R)}" r="${f(0.035 * R)}"/></g>` +
    /* Dole teplý srpek a zář: svět z kapky prosvítá spodem ven */
    `<ellipse cx="0" cy="${f(0.6 * R)}" rx="${f(0.62 * R)}" ry="${f(0.3 * R)}" fill="url(#pk-dno)"/>` +
    `<path d="${srpek(48, 132, 0.8 * R, 0.9 * R, 20)}" fill="#FFDCA8" opacity="0.62"/>` +
    `<path d="${srpek(-28, 22, 0.9 * R, 0.955 * R, 12)}" fill="#BFE6FF" opacity="0.4"/>` +
    `<circle cx="${f(0.52 * R)}" cy="${f(0.48 * R)}" r="${f(0.025 * R)}" fill="#FFF3DC" opacity="0.9"/>` +
    `</g>`;

  return (
    /* Čepička, která v prasklině natéká, zatímco velká kapka padá */
    `<path class="pk-cepicka" fill="url(#pk-cepicka)" stroke="#E6F5FF" stroke-width="1.4" stroke-opacity="0.7"/>` +
    `<g class="pk-kapka" clip-path="url(#pk-nad)">` +
    /* Lehká záře kolem kapky v nočním vzduchu */
    `<use class="pk-aura" href="#pk-tvar" fill="none" stroke="#9CCBFF" stroke-width="22" stroke-opacity="0.06"/>` +
    telo +
    `<use class="pk-hrana" href="#pk-tvar" fill="none" stroke="#E6F5FF" stroke-width="1.7" stroke-opacity="0.72"/>` +
    lesky +
    `</g>` +
    /* Satelitní kapička z utrženého krku a stopy pádu — skript je ukáže a posouvá */
    `<g class="pk-stopy" opacity="0" stroke="#DDF0FF" stroke-linecap="round" fill="none">` +
    `<path class="pk-stopa" stroke-width="2"/><path class="pk-stopa" stroke-width="1.4"/><path class="pk-stopa" stroke-width="1"/></g>` +
    `<circle class="pk-satelit" r="0" fill="url(#pk-perla)"/>`
  );
}

/* ——— Hladina ——— */

export function hladinaDefs(): string {
  return (
    linearni("pk-voda", [
      [0, "#25306A", 1],
      [0.06, "#141C48", 1],
      [0.35, "#0A1030", 1],
      [1, "#060A1E", 1],
    ], ` x1="0" y1="${OBZOR_Y}" x2="0" y2="1000" gradientUnits="userSpaceOnUse"`) +
    linearni("pk-opar", [
      [0, "#2E3A78", 0],
      [0.7, "#3C4A8E", 0.34],
      [1, "#6878B8", 0.5],
    ]) +
    kruhovy("pk-zare", [
      [0, "#FFE2AE", 0.62],
      [0.35, "#FFC27E", 0.24],
      [1, "#F2A65A", 0],
    ]) +
    linearni("pk-dolu", [
      [0, "#060A1E", 0],
      [1, "#060A1E", 0.85],
    ])
  );
}

export function hladina(): string {
  const r = nahoda(4417);
  const SIR = 7000;
  const X0 = -3000;

  /* Lesklé pruhy — u obzoru husté a tenké, dopředu řidší */
  let pruhy = "";
  for (let i = 0; i < 16; i++) {
    const z = 60 / (1 + i * 0.55) + 2.4;
    const [, y] = promitni(0, z);
    if (y > 1000) continue;
    const delka = 260 + r() * 900;
    const x = -600 + r() * 2200;
    const h = 0.6 + (y - OBZOR_Y) * 0.012;
    pruhy += `<rect x="${f(x)}" y="${f(y)}" width="${f(delka)}" height="${f(h)}" rx="${f(h / 2)}" fill="#AFC2F2" opacity="${f(0.05 + r() * 0.08)}"/>`;
  }

  /* Klidné kruhy (omezený pohyb a čekání na skript) */
  const klidne = [0.95, 1.65, 2.7]
    .map((rr, i) => `<path d="${kruhNaHladine(0, DOPAD_Z, rr)}" stroke-opacity="${f(0.42 - i * 0.11)}"/>`)
    .join("");

  return (
    `<rect class="pk-voda" x="${X0}" y="${OBZOR_Y}" width="${SIR}" height="700" fill="url(#pk-voda)"/>` +
    `<rect x="${X0}" y="${OBZOR_Y - 120}" width="${SIR}" height="120" fill="url(#pk-opar)"/>` +
    `<rect x="${X0}" y="${OBZOR_Y - 1}" width="${SIR}" height="2.4" fill="#B9C6F0" opacity="0.32"/>` +
    pruhy +
    /* Světlo, které kapka soustředí na hladinu — sílí s kapkou a při pádu */
    `<g class="pk-zare"><ellipse cx="${OSA_X}" cy="${f(DOPAD_Y)}" rx="250" ry="38" fill="url(#pk-zare)"/>` +
    `<ellipse cx="${OSA_X}" cy="${f(DOPAD_Y + 2)}" rx="70" ry="7" fill="#FFE9C2" opacity="0.5"/></g>` +
    `<g class="pk-kruhy-klid" fill="none" stroke="#CFE2FF" stroke-width="1.6">${klidne}</g>` +
    `<rect x="${X0}" y="960" width="${SIR}" height="400" fill="url(#pk-dolu)"/>`
  );
}

/* ——— Rozostřená světla v pozadí (bokeh) ——— */

const BOKEH_BARVY: Record<string, string> = {
  lampion: "#F2A65A",
  zlato: "#F3D27A",
  ruze: "#E08AA0",
  mesic: "#9CC3DA",
  levandule: "#B49AD0",
};

const rgba = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

/**
 * Rozostřená světla jako HTML kotouče s kruhovým přechodem — jen se
 * posouvají (transform), takže je kreslí grafická karta a SVG scény se
 * kvůli nim nepřekresluje. Polohy jsou na plátně 1600 × 1000 přepočtené
 * na procenta sekce, velikost v cqh, aby kotouče zůstaly kulaté.
 */
export function bokeh(): string {
  const r = nahoda(2026);
  const barvy = Object.values(BOKEH_BARVY);
  /* Víc vpravo kolem kapky, vlevo za textem jen pár tlumených */
  return [
    [1180, 210, 120], [1420, 120, 70], [1500, 420, 150], [960, 140, 54], [1300, 560, 64],
    [1080, 330, 36], [1560, 700, 96], [820, 520, 44], [620, 160, 82], [380, 90, 46],
    [240, 520, 110], [90, 300, 64], [700, 760, 40], [1240, 800, 30],
  ]
    .map(([x, y, rr], i) => {
      const c = barvy[Math.floor(r() * barvy.length)];
      const vlevo = x < 760;
      const o = (vlevo ? 0.1 : 0.16) + r() * (vlevo ? 0.08 : 0.16);
      const pozadi = `radial-gradient(circle closest-side, ${rgba(c, 0.9)} 0, ${rgba(c, 0.7)} 62%, ${rgba(c, 0.45)} 86%, ${rgba(c, 0)} 100%)`;
      return `<i class="pk-bokeh-k pk-bokeh-k${(i % 3) + 1}" style="left:${f((x / 1600) * 100)}%;top:${f((y / 1000) * 100)}%;--d:${f(rr / 5)}cqh;opacity:${f(o)};--z:${f(4 + r() * 6)}s;background:${pozadi}"></i>`;
    })
    .join("");
}
