/**
 * Krajina za ořechem na úvodu webu — svítání nad Ořechem po vrstvách od
 * obzoru k louce. Vzadu dva hřebeny v oparu (barvy berou z oblohy, takže
 * se s ní při scrollu přebarví), na bližším vesnice, kde se už svítí. Pod
 * nimi pás ranní mlhy, zelené kopce s poli a mezemi, uprostřed pahorek se
 * zeleným domem z Luční a pěšina od jeho brány dolů k louce. V popředí
 * louka s květinami podle ročního období a vysoká tráva, do které fouká.
 *
 * Kresby vracejí SVG jako text (jako ostatní kresby Domku 2); úvod je
 * skládá do vrstev v components/domek2/UvodKrajina.astro:
 *   kopce   plátno 1600 × 600, „slice“ ke spodnímu okraji
 *   dum     stejné plátno, jen pahorek s domkem (vlastní vrstva kvůli
 *           schovávání Vázičky za dům)
 *   louka   plátno 3600 × 240 — tak široké, aby se ani na široké obrazovce
 *           neořízlo shora a tráva měla celé vršky
 *   trava   přední tráva louky zvlášť, opírá se do ní vítr (CSS)
 *
 * Roční období jsou jen třídy a CSS ze svitaniStyly, stejně jako u ořechu.
 */
import { nahoda, chomac } from "./zaklad";
import { type Bod, f, lerp, vzorkuj, hladka, lomena, vyskaNa, celaCisla } from "./krivky";
import { domek } from "./domek";
import { trava } from "../../parta2/tvary";
import type { Sezona } from "./orech";

export const KRAJINA = { sirka: 1600, vyska: 600 } as const;
export const LOUKA = { sirka: 3600, vyska: 240 } as const;

/** Domek na pahorku: levý okraj a šířka kresby 480 × 320; pata (zem kresby y 300) stojí na PATA */
const PATA = 434;
export const DUM = { x: 640, sirka: 336, y: PATA - (300 / 320) * ((336 * 320) / 480) };
const naDum = (x: number, y: number): Bod => [DUM.x + (x / 480) * DUM.sirka, DUM.y + (y / 320) * ((DUM.sirka * 320) / 480)];

/* ═══ Hřebeny a kopce ═══ */

const HREBEN_1: Bod[] = [[-140, 262], [0, 252], [110, 262], [220, 288], [330, 276], [450, 242], [600, 226], [760, 236], [900, 218], [1040, 230], [1200, 210], [1360, 226], [1500, 212], [1740, 222]];
const HREBEN_2: Bod[] = [[-140, 336], [80, 322], [220, 332], [380, 310], [520, 300], [660, 308], [800, 322], [940, 304], [1080, 294], [1240, 306], [1400, 290], [1560, 300], [1740, 294]];
const KOPCE: Bod[] = [[-140, 380], [140, 362], [320, 372], [520, 352], [700, 358], [880, 346], [1060, 360], [1260, 344], [1460, 356], [1740, 350]];
const BLIZKO: Bod[] = [[-140, 462], [120, 450], [330, 458], [520, 470], [600, 466], [1140, 474], [1260, 462], [1460, 452], [1740, 458]];
const PAHOREK: Bod[] = [[500, 486], [590, 452], [690, 434], [800, 428], [900, 430], [990, 440], [1080, 460], [1170, 486]];

const plocha = (hrana: Bod[], dole = 620) => {
  const b = vzorkuj(hrana, 40);
  return hladka([...b, [b[b.length - 1][0], dole], [b[0][0], dole]]);
};
const hrebenBody = (hrana: Bod[]) => vzorkuj(hrana, 8);

/**
 * Les na hřebeni: vroubky korun sedí přímo na hraně kopce (ne jako mraky
 * nad ním) a dolů se schovají do svahu.
 */
function les(hrana: Bod[], x0: number, x1: number, vyska: number, seed: number): string {
  const R = nahoda(seed);
  const B = hrebenBody(hrana);
  const vrch: Bod[] = [];
  let x = x0;
  while (x < x1) {
    const r = vyska * (0.45 + R() * 0.55);
    const y = vyskaNa(B, x);
    vrch.push([x, y - r * (0.6 + R() * 0.5)]);
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

/**
 * Vesnička v polích vlevo dole — pod textem úvodu, ne v něm. Stěny,
 * střechy, kostelík s věží a pár oken, kde se už svítí.
 */
function vesnice(): string {
  const R = nahoda(8811);
  const B = hrebenBody(KOPCE);
  const domy: string[] = [], stromy: string[] = [], okna: string[] = [];
  const mista = [118, 146, 171, 222, 252, 279, 306];
  mista.forEach((x, i) => {
    const w = 20 + R() * 10, h = 12 + R() * 6, y = vyskaNa(B, x) + 14 + R() * 12;
    const stit = R() < 0.55;
    if (i % 2 === 0) stromy.push(`<path d="${chomac(x + w * 0.65, y - 9, 11, 12, 8, 8900 + i, 0.8, 0.7)}"/>`);
    domy.push(`<rect class="svt-ves-zed" x="${f(x - w / 2)}" y="${f(y - h)}" width="${f(w)}" height="${f(h + 4)}"/>`);
    domy.push(`<rect class="svt-ves-stin" x="${f(x + w * 0.18)}" y="${f(y - h)}" width="${f(w * 0.32)}" height="${f(h + 4)}"/>`);
    domy.push(stit
      ? `<path class="svt-ves-strecha" d="M${f(x - w / 2 - 2)} ${f(y - h)} L${f(x)} ${f(y - h - w * 0.45)} L${f(x + w / 2 + 2)} ${f(y - h)} Z"/>`
      : `<path class="svt-ves-strecha" d="M${f(x - w / 2 - 2)} ${f(y - h)} L${f(x - w / 2 + 5)} ${f(y - h - 9)} L${f(x + w / 2 - 5)} ${f(y - h - 9)} L${f(x + w / 2 + 2)} ${f(y - h)} Z"/>`);
    okna.push(`<rect x="${f(x - w * 0.3)}" y="${f(y - h * 0.62)}" width="3.6" height="4" rx="0.6"/>`);
    if (R() < 0.5) okna.push(`<rect x="${f(x + w * 0.05)}" y="${f(y - h * 0.62)}" width="3.6" height="4" rx="0.6"/>`);
  });
  /* kostelík s věží — jen pro tvar, Ořech má v okolí kostelů dost */
  const kx = 196, ky = vyskaNa(B, kx) + 24;
  domy.push(`<rect class="svt-ves-zed" x="${kx - 17}" y="${f(ky - 18)}" width="30" height="20"/>`);
  domy.push(`<path class="svt-ves-strecha" d="M${kx - 19} ${f(ky - 18)} L${kx - 2} ${f(ky - 30)} L${kx + 15} ${f(ky - 18)} Z"/>`);
  domy.push(`<rect class="svt-ves-zed" x="${kx + 8}" y="${f(ky - 44)}" width="13" height="46"/>`);
  domy.push(`<rect class="svt-ves-stin" x="${kx + 15}" y="${f(ky - 44)}" width="6" height="46"/>`);
  domy.push(`<path class="svt-ves-vez" d="M${kx + 6} ${f(ky - 44)} L${kx + 14.5} ${f(ky - 66)} L${kx + 23} ${f(ky - 44)} Z"/>`);
  domy.push(`<path d="M${kx + 14.5} ${f(ky - 66)} L${kx + 14.5} ${f(ky - 74)} M${kx + 11.5} ${f(ky - 71)} L${kx + 17.5} ${f(ky - 71)}" class="svt-ves-kriz" stroke-width="1.2"/>`);
  okna.push(`<circle cx="${kx + 14.5}" cy="${f(ky - 34)}" r="2.4"/>`);
  return `<g class="svt-ves-stromy">${stromy.join("")}</g><g>${domy.join("")}</g><g class="svt-ves-okna">${okna.join("")}</g>`;
}

/** Pole na kopcích: hranice se rozbíhají k divákovi, v polích řádky, mezi nimi meze s keři */
function pole(): string {
  const R = nahoda(7301);
  const B = hrebenBody(KOPCE);
  const hranice = [-160, 96, 360, 560, 760, 1010, 1236, 1450, 1760];
  const druhy = ["d", "a", "c", "b", "a", "d", "c", "a"];
  const pole: string[] = [], brazdy: string[] = [], meze: string[] = [];
  const dolu = (x: number) => x + (x - 820) * 0.24;
  for (let i = 0; i < hranice.length - 1; i++) {
    const xa = hranice[i], xb = hranice[i + 1];
    const horni = vzorkuj([[xa, vyskaNa(B, xa)], [(xa + xb) / 2, vyskaNa(B, (xa + xb) / 2)], [xb, vyskaNa(B, xb)]], 30);
    pole.push(`<path class="svt-pole-${druhy[i]}" d="${lomena([...horni, [dolu(xb), 486], [dolu(xa), 486]])}"/>`);
    /* řádky po spádnici; na zoraném poli výraznější */
    const n = druhy[i] === "c" ? 10 : 6;
    for (let k = 1; k < n; k++) {
      const x = lerp(xa, xb, k / n);
      brazdy.push(`M${f(x)} ${f(vyskaNa(B, x) + 3)} L${f(dolu(x))} ${f(486)}`);
    }
    /* mez s keři mezi poli — hustě, ať je to pás, ne korálky */
    if (i > 0) {
      vzorkuj([[xa, vyskaNa(B, xa) + 2], [dolu(xa), 486]], 5).forEach(([x, y], k) => {
        if (R() < 0.9) meze.push(`<circle cx="${f(x + (R() - 0.5) * 3)}" cy="${f(y - 2)}" r="${f(3.4 + R() * 2.6 + k * 0.12)}"/>`);
      });
    }
  }
  return `<g>${pole.join("")}</g><path class="svt-brazdy" d="${brazdy.join(" ")}" fill="none" stroke-width="1.6"/><g class="svt-mez">${meze.join("")}</g>`;
}

/** Osamělé stromy na kopcích a na louce — kulaté koruny, stín po ránu doprava */
function stromy(): string {
  const S: [number, number, number][] = [
    [190, 370, 20], [258, 380, 14], [470, 354, 24], [1188, 352, 20], [1362, 350, 16], [1530, 362, 26],
    [86, 462, 30], [372, 470, 22], [1250, 478, 28],
  ];
  return S.map(([x, y, s], i) => `<g>
    <ellipse cx="${f(x + s * 0.9)}" cy="${f(y + s * 0.96)}" rx="${f(s * 1.1)}" ry="${f(s * 0.16)}" class="svt-stin"/>
    <path d="M${x} ${f(y + s)} L${x} ${f(y + s * 0.2)}" class="svt-kmen" stroke-width="${f(s * 0.16)}"/>
    <path class="svt-strom-a" d="${chomac(x, y, s * 0.72, s * 0.8, 9, 7600 + i, 0.85, 0.7)}"/>
    <path class="svt-strom-b" d="${chomac(x - s * 0.18, y - s * 0.22, s * 0.44, s * 0.44, 8, 7700 + i, 1, 0.7)}"/>
    <path class="svt-strom-snih" d="${chomac(x - s * 0.1, y - s * 0.5, s * 0.5, s * 0.2, 8, 7800 + i, 1, 0.7)}"/>
  </g>`).join("");
}

/** Pěšina od brány domku k louce — rozšiřuje se k divákovi */
function pesina(): string {
  const brana = naDum(232, 302);
  const osa = vzorkuj([brana, [brana[0] - 20, 452], [732, 478], [652, 516], [600, 560], [584, 620]], 6);
  const L: Bod[] = [], P: Bod[] = [], S: Bod[] = [];
  osa.forEach(([x, y], i) => {
    const t = (y - brana[1]) / (620 - brana[1]);
    const w = lerp(9, 54, Math.pow(Math.max(0, t), 1.1));
    const a = osa[Math.max(0, i - 1)], b = osa[Math.min(osa.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    L.push([x - (dy / l) * w * 0.5, y + (dx / l) * w * 0.5]);
    P.push([x + (dy / l) * w * 0.5, y - (dx / l) * w * 0.5]);
    S.push([x - (dy / l) * w * 0.12, y + (dx / l) * w * 0.12]);
  });
  const stred = vzorkuj(S, 12);
  return `<path class="svt-cesta" d="${hladka([...L, ...P.reverse()])}"/>
    <path class="svt-cesta-svetlo" d="${hladka(stred, false)}" fill="none" stroke-width="3" stroke-linecap="round"/>`;
}

export function svitani() {
  const R = nahoda(9501);
  const B1 = hrebenBody(HREBEN_1), B2 = hrebenBody(HREBEN_2);
  /* opar: vodorovný pás barvy obzoru, nahoře a dole průhledný */
  const opar = (y0: number, y1: number, op: number) =>
    `<rect x="-200" y="${y0}" width="2000" height="${y1 - y0}" fill="url(#svt-opar)" opacity="${op}"/>`;
  /* mlha: měkké pruhy s průhlednými okraji, které pomalu plují (domek2.css) */
  const mlha = (y: number, v: number, seed: number) => {
    const Rm = nahoda(seed);
    const horni: Bod[] = [], dolni: Bod[] = [];
    for (let x = -260; x <= 1860; x += 140) {
      horni.push([x, y - v * (0.5 + Rm() * 0.6)]);
      dolni.push([x, y + v * (0.35 + Rm() * 0.4)]);
    }
    return `<path d="${hladka([...horni, ...dolni.reverse()])}" fill="url(#svt-mlha-g)"/>`;
  };

  /* hřebeny v oparu — barvy z oblohy */
  const daleko = `
  <defs>
    <linearGradient id="svt-opar" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" style="stop-color:var(--nebe-obzor)" stop-opacity="0"/>
      <stop offset="0.5" style="stop-color:var(--nebe-obzor)" stop-opacity="0.62"/>
      <stop offset="1" style="stop-color:var(--nebe-obzor)" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="svt-mlha-g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" style="stop-color:var(--mrak-zare)" stop-opacity="0"/>
      <stop offset="0.55" style="stop-color:var(--mrak-zare)" stop-opacity="0.75"/>
      <stop offset="1" style="stop-color:var(--mrak-zare)" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="svt-svah" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#FFE3B8" stop-opacity="0.5"/>
      <stop offset="0.45" stop-color="#FFE3B8" stop-opacity="0.12"/>
      <stop offset="1" stop-color="#FFE3B8" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <path d="${plocha(HREBEN_1)}" style="fill:var(--kopec-daleko)"/>
  <path class="svt-snih-daleko" d="${plocha(HREBEN_1)}"/>
  <g style="fill:var(--kopec-blizko)" opacity="0.42">
    <path d="${les(HREBEN_1, 430, 1190, 14, 501)}"/><path d="${les(HREBEN_1, 1250, 1720, 12, 502)}"/><path d="${les(HREBEN_1, -140, 150, 10, 503)}"/>
  </g>
  ${opar(170, 330, 0.62)}
  <path d="${plocha(HREBEN_2)}" style="fill:var(--kopec-blizko)"/>
  <path class="svt-snih-blizko" d="${plocha(HREBEN_2)}"/>
  <g class="svt-les-blizko">
    <path d="${les(HREBEN_2, 30, 340, 16, 511)}"/><path d="${les(HREBEN_2, 1050, 1520, 18, 512)}"/><path d="${les(HREBEN_2, 640, 820, 12, 513)}"/>
  </g>
  ${opar(280, 400, 0.45)}`;
  /* mlha je ve vlastních vrstvách, aby se dala posouvat bez překreslování kopců */
  const mlha1 = `<g class="svt-mlha svt-mlha-1">${mlha(350, 30, 521)}</g>`;
  const mlha2 = `<g class="svt-mlha svt-mlha-2">${mlha(392, 18, 522)}</g>`;
  /* kopce s poli, vesnice, louka pod stromem, pahorek a pěšina */
  const blizko = `
  <path class="svt-kopce" d="${plocha(KOPCE)}"/>
  ${pole()}
  <path d="${plocha(KOPCE)}" fill="url(#svt-svah)" opacity="0.7"/>
  ${vesnice()}
  <path class="svt-blizko" d="${plocha(BLIZKO)}"/>
  <path class="svt-blizko-lem" d="${hladka(vzorkuj(BLIZKO, 40), false)}" fill="none" stroke-width="6"/>
  ${stromy()}
  <path class="svt-blizko" d="${plocha(PAHOREK)}"/>
  <path d="${plocha(PAHOREK)}" fill="url(#svt-svah)"/>
  <path class="svt-snih-skvrny" d="${[[140, 520, 64, 5], [430, 500, 40, 4], [1000, 524, 76, 6], [1380, 500, 56, 4.5], [300, 404, 36, 3], [1150, 396, 44, 3.5]].map(([x, y, rx, ry]) => `M${x - rx} ${y} C${x - rx * 0.6} ${y - ry * 1.6} ${x + rx * 0.5} ${y - ry * 1.8} ${x + rx} ${y} C${x + rx * 0.4} ${y + ry * 0.7} ${x - rx * 0.5} ${y + ry * 0.6} ${x - rx} ${y} Z`).join(" ")}"/>
`;
  void R; void B1; void B2;

  /*
   * Domek na pahorku: kresba z Domku 2, v zimě se sněhem na střeše, dílna
   * už svítí. Pěšina a keříky jsou ve stejné skupině — na úzké obrazovce
   * CSS posune a zmenší domek i s nimi.
   */
  const [zx, zy] = naDum(232, 276);
  const dum = `<g class="krajina-dum">
  ${pesina()}
  <g class="svt-keriky">${[[700, 470, 20], [884, 446, 16], [560, 486, 14]].map(([x, y, s], i) => `<path class="svt-strom-a" d="${chomac(x, y, s, s * 0.6, 9, 7950 + i, 0.6, 0.7)}"/><path class="svt-strom-b" d="${chomac(x - s * 0.2, y - s * 0.2, s * 0.55, s * 0.32, 8, 7960 + i, 1, 0.7)}"/>`).join("")}</g>
    <svg x="${f(DUM.x)}" y="${f(DUM.y)}" width="${DUM.sirka}" height="${f((DUM.sirka * 320) / 480)}" viewBox="0 0 480 320" class="krajina-domek" overflow="visible">
      ${domek()}
      <g class="svt-snih-dum">
        <path d="M194 104 L268 182 L402 174 L328 96 Z" opacity="0.94"/>
        <path d="M106 188 L196 98 L282 188" fill="none" stroke-width="6" stroke-linejoin="round"/>
        <rect x="98" y="272" width="100" height="5" rx="2"/><rect x="262" y="279" width="14" height="4" rx="2"/>
      </g>
    </svg>
    <ellipse class="svt-zare" cx="${f(zx)}" cy="${f(zy)}" rx="44" ry="26" fill="url(#svt-zare-g)"/>
    <defs><radialGradient id="svt-zare-g"><stop offset="0" stop-color="#FFC977" stop-opacity="0.55"/><stop offset="1" stop-color="#FFC977" stop-opacity="0"/></radialGradient></defs>
  </g>`;

  const l = louka();
  return {
    daleko: celaCisla(daleko), mlha1, blizko: celaCisla(blizko), mlha2, dum,
    louka: celaCisla(l.louka), trava: l.trava.map(celaCisla),
  };
}

/* ═══ Louka v popředí ═══ */

function kvetinySymboly(): string {
  return `
  <symbol id="svt-mak" overflow="visible"><path d="M0 0 Q2 -14 0 -26" class="svt-stonek" fill="none" stroke-width="2"/><circle cx="-3.4" cy="-28" r="6.4" fill="#D9452E"/><circle cx="3.4" cy="-28" r="6.4" fill="#E25A3E"/><circle cx="0" cy="-31" r="5" fill="#EC6A4A"/><circle cx="0" cy="-27.5" r="2.2" fill="#2B2420"/></symbol>
  <symbol id="svt-chrpa" overflow="visible"><path d="M0 0 Q-2 -12 0 -24" class="svt-stonek" fill="none" stroke-width="1.8"/><g fill="#5B7FD1"><circle cx="0" cy="-26" r="4.4"/><circle cx="-4.4" cy="-28.4" r="2.5"/><circle cx="4.4" cy="-28.4" r="2.5"/><circle cx="0" cy="-31" r="2.5"/><circle cx="-3.2" cy="-23" r="2.2"/><circle cx="3.2" cy="-23" r="2.2"/></g></symbol>
  <symbol id="svt-kopretina" overflow="visible"><path d="M0 0 Q2 -14 0 -28" class="svt-stonek" fill="none" stroke-width="1.8"/><g fill="#FBF7EC"><ellipse cx="0" cy="-30" rx="8" ry="3.2"/><ellipse cx="0" cy="-30" rx="3.2" ry="7.4"/><ellipse cx="0" cy="-30" rx="6.6" ry="3" transform="rotate(45 0 -30)"/><ellipse cx="0" cy="-30" rx="6.6" ry="3" transform="rotate(-45 0 -30)"/></g><circle cx="0" cy="-30" r="2.6" fill="#E8B440"/></symbol>
  <symbol id="svt-pampeliska" overflow="visible"><path d="M0 0 Q-2 -10 0 -20" class="svt-stonek" fill="none" stroke-width="2"/><path d="M-8 2 Q-12 -4 -14 -2 Q-8 -6 -3 0 Z M8 2 Q12 -4 14 -2 Q8 -6 3 0 Z" class="svt-list-kvetu"/><circle cx="0" cy="-23" r="6.6" fill="#F3C622"/><circle cx="0" cy="-23" r="4" fill="#F7D84A"/><circle cx="-1.6" cy="-24.6" r="1.6" fill="#FCEB8A"/></symbol>
  <symbol id="svt-chmyri" overflow="visible"><path d="M0 0 Q1.5 -14 0 -30" class="svt-stonek" fill="none" stroke-width="1.6"/><circle cx="0" cy="-34" r="7.4" fill="#FFFFFF" fill-opacity="0.72"/><circle cx="0" cy="-34" r="2" fill="#C9C2A8"/></symbol>
  <symbol id="svt-sedmikraska" overflow="visible"><path d="M0 0 L0 -8" class="svt-stonek" stroke-width="1.6"/><g fill="#FFFFFF"><ellipse cx="0" cy="-10" rx="5" ry="2"/><ellipse cx="0" cy="-10" rx="2" ry="5"/><ellipse cx="0" cy="-10" rx="4" ry="1.8" transform="rotate(45 0 -10)"/><ellipse cx="0" cy="-10" rx="4" ry="1.8" transform="rotate(-45 0 -10)"/></g><circle cx="0" cy="-10" r="1.8" fill="#F0BE3A"/><circle cx="-4.6" cy="-10" r="0.9" fill="#F0A0B0"/><circle cx="4.6" cy="-10" r="0.9" fill="#F0A0B0"/></symbol>
  <symbol id="svt-ocun" overflow="visible"><path d="M0 0 L0 -16" stroke="#EDE6EE" stroke-width="2.4"/><path d="M-5 -16 C-6 -24 -3 -31 0 -32 C3 -31 6 -24 5 -16 C3 -14 -3 -14 -5 -16 Z" fill="#C8A2D6"/><path d="M0 -32 C-1 -26 -1 -20 0 -16 M-3 -29 C-4 -24 -3 -19 -2 -16" stroke="#A97FC0" stroke-width="0.9" fill="none"/></symbol>
  <symbol id="svt-krokus" overflow="visible"><path d="M-3 0 Q-5 -10 -7 -18 M3 0 Q5 -10 6 -17" stroke="#6E9A4B" stroke-width="1.6" fill="none"/><path d="M0 0 L0 -12" stroke="#E9E2D0" stroke-width="2.2"/><path d="M-5 -12 C-6 -20 -3 -26 0 -27 C3 -26 6 -20 5 -12 C3 -10 -3 -10 -5 -12 Z"/><path d="M0 -26 L0 -12" stroke="#000" stroke-opacity="0.15" stroke-width="1"/></symbol>
  <symbol id="svt-snezenka" overflow="visible"><path d="M0 0 Q-1 -14 4 -20 Q7 -22 8 -18" class="svt-stonek" fill="none" stroke-width="1.5"/><path d="M-3 0 Q-5 -8 -4 -14 M2 0 Q4 -8 2 -13" stroke="#5E8A4A" stroke-width="1.8" fill="none"/><path d="M8 -18 C4 -16 4 -9 8 -6 C12 -9 12 -16 8 -18 Z" fill="#FFFFFF"/><path d="M6.4 -8 C7.2 -6.4 8.8 -6.4 9.6 -8" stroke="#7FB067" stroke-width="1" fill="none"/></symbol>
  <symbol id="svt-list-zem" overflow="visible"><path d="M0 0 C4 -3 9 -3 14 0 C9 3 4 3 0 0 Z"/><path d="M0 0 L13 0" stroke="#000" stroke-opacity="0.18" stroke-width="0.8"/></symbol>
  <symbol id="svt-orech-zem" overflow="visible"><ellipse rx="6.4" ry="5.6" fill="#B98F5E"/><ellipse cx="-1.6" cy="-1.6" rx="2.6" ry="2" fill="#D9B482"/><path d="M-6 0 Q0 1.6 6 0" stroke="#7E5A36" stroke-width="1" fill="none"/></symbol>
  <symbol id="svt-bedla" overflow="visible"><path d="M0 0 L0 -26" stroke="#E8DCC6" stroke-width="3.2"/><path d="M-3.4 -15 L3.4 -15" stroke="#D2C4A8" stroke-width="2"/><path d="M-15 -26 C-12 -36 12 -36 15 -26 C8 -24 -8 -24 -15 -26 Z" fill="#B38A62"/><path d="M-4 -33 C-2 -35 2 -35 4 -33 C2 -32 -2 -32 -4 -33 Z" fill="#7A5638"/><circle cx="-8" cy="-29" r="1.1" fill="#8E6A48"/><circle cx="7" cy="-29.6" r="1.1" fill="#8E6A48"/><circle cx="1" cy="-28" r="0.9" fill="#8E6A48"/></symbol>
  <symbol id="svt-okolik" overflow="visible"><path d="M0 0 Q1 -18 0 -36" stroke="#9C8A6A" stroke-width="1.6" fill="none"/><path d="M0 -36 L-8 -44 M0 -36 L-3 -46 M0 -36 L3 -46 M0 -36 L8 -44" stroke="#9C8A6A" stroke-width="1.2"/><path d="M-10 -45 L-6 -45 M-5 -47 L-1 -47 M1 -47 L5 -47 M6 -45 L10 -45" stroke="#F5F8FB" stroke-width="2.4" stroke-linecap="round"/></symbol>`;
}

function louka() {
  const R = nahoda(9601);
  const W = LOUKA.sirka;
  /* hrana země vlní se kolem y 150 */
  const hrana: Bod[] = [];
  for (let x = -40; x <= W + 40; x += 160) hrana.push([x, 148 + Math.sin(x / 210) * 7 + (R() - 0.5) * 8]);
  const zem = hladka([...vzorkuj(hrana, 60), [W + 40, 260], [-40, 260]]);

  const rozhod = (pocet: number, sym: string, trida: string, y0: number, y1: number, m0: number, m1: number) =>
    Array.from({ length: pocet }, () => {
      const x = R() * W, y = y0 + R() * (y1 - y0), m = m0 + R() * (m1 - m0);
      return { x, y, el: `<use href="#${sym}" class="${trida}" transform="translate(${f(x)} ${f(y)}) scale(${f(m)})"/>` };
    })
      .sort((a, b) => a.y - b.y)
      .map((k) => k.el)
      .join("");

  const zadni = trava(W, 156, 74, 330, 9611);
  const loukaZem = `
  <defs>
    ${kvetinySymboly()}
    <linearGradient id="svt-louka-g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" class="svt-lz1"/><stop offset="1" class="svt-lz2"/>
    </linearGradient>
  </defs>
  <path d="${zem}" fill="url(#svt-louka-g)"/>
  <path class="svt-louka-snih" d="${hladka([...vzorkuj(hrana.map(([x, y]) => [x, y - 6] as Bod), 60), [W + 40, 260], [-40, 260]])}"/>
  <path class="svt-trava-1" d="${zadni.join(" ")}"/>
  <g class="svt-jen-leto">${rozhod(70, "svt-mak", "", 150, 236, 0.75, 1.25)}${rozhod(42, "svt-chrpa", "", 150, 236, 0.7, 1.15)}${rozhod(56, "svt-kopretina", "", 150, 236, 0.75, 1.2)}</g>
  <g class="svt-jen-jaro">${rozhod(76, "svt-pampeliska", "", 150, 236, 0.75, 1.2)}${rozhod(18, "svt-chmyri", "", 150, 230, 0.8, 1.15)}${rozhod(70, "svt-sedmikraska", "", 156, 238, 0.8, 1.3)}</g>
  <g class="svt-jen-podzim">${rozhod(56, "svt-ocun", "", 152, 236, 0.75, 1.2)}${rozhod(110, "svt-list-zem", "svt-listek-zem", 160, 238, 0.8, 1.4)}${rozhod(26, "svt-orech-zem", "", 172, 236, 0.8, 1.15)}${rozhod(7, "svt-bedla", "", 168, 232, 0.9, 1.3)}</g>
  <g class="svt-jen-predjari">${rozhod(70, "svt-snezenka", "", 154, 236, 0.8, 1.25)}${rozhod(30, "svt-krokus", "svt-krokus-a", 156, 236, 0.8, 1.2)}${rozhod(26, "svt-krokus", "svt-krokus-b", 156, 236, 0.8, 1.2)}</g>
  <g class="svt-jen-zima">${rozhod(46, "svt-okolik", "", 150, 230, 0.8, 1.3)}</g>`;

  const predni = trava(W, 240, 118, 380, 9612);
  const svetle = trava(W, 240, 84, 160, 9613);
  return {
    louka: loukaZem,
    trava: [`<path class="svt-trava-2" d="${predni.join(" ")}"/>`, `<path class="svt-trava-3" d="${svetle.join(" ")}"/>`],
  };
}

/* ═══ Barvy podle ročního období ═══ */

type Paleta = Record<string, string>;
const TRIDY = (p: Record<string, string>) => p;

/** Výplně tříd krajiny; `stop:` jsou zastávky přechodů */
export const SVITANI_BARVY: Record<Sezona, Paleta> = {
  leto: TRIDY({
    "svt-kopce": "#93B062", "svt-blizko": "#83A657", "svt-blizko-lem": "#B5C978",
    "svt-pole-a": "#DDBE5C", "svt-pole-b": "#A3BF6A", "svt-pole-c": "#C9A86E", "svt-pole-d": "#8FB25C",
    "svt-mez": "#55793E", "svt-strom-a": "#4E7339", "svt-strom-b": "#6E9A4B", "svt-kmen": "#5A4A3E",
    "svt-cesta": "#DCCDA6", "svt-cesta-svetlo": "#EFE2C0",
    "stop:svt-lz1": "#8DB35C", "stop:svt-lz2": "#55803B", "svt-trava-1": "#6C9746", "svt-trava-2": "#4C7634", "svt-trava-3": "#7AA64B",
  }),
  podzim: TRIDY({
    "svt-kopce": "#A7A862", "svt-blizko": "#929F56", "svt-blizko-lem": "#C7C27A",
    "svt-pole-a": "#B08A60", "svt-pole-b": "#98B064", "svt-pole-c": "#9C7756", "svt-pole-d": "#C8AC74",
    "svt-mez": "#A2742F", "svt-strom-a": "#B06C2C", "svt-strom-b": "#D69C3E", "svt-kmen": "#5A4A3E",
    "svt-cesta": "#D6C49C", "svt-cesta-svetlo": "#EADBB8", "svt-listek-zem": "#D9A63C",
    "stop:svt-lz1": "#9CA65A", "stop:svt-lz2": "#66733A", "svt-trava-1": "#7E8A44", "svt-trava-2": "#5E6A34", "svt-trava-3": "#99A052",
  }),
  jaro: TRIDY({
    "svt-kopce": "#A2C46A", "svt-blizko": "#8FBC5C", "svt-blizko-lem": "#C2DC86",
    "svt-pole-a": "#EED23C", "svt-pole-b": "#A8CC6C", "svt-pole-c": "#9A7C5A", "svt-pole-d": "#B6D57C",
    "svt-mez": "#6A9C46", "svt-strom-a": "#79AE4E", "svt-strom-b": "#F2E6EC", "svt-kmen": "#5A4A3E",
    "svt-cesta": "#DACBA4", "svt-cesta-svetlo": "#EEE2C2",
    "stop:svt-lz1": "#97C25E", "stop:svt-lz2": "#5C8E3E", "svt-trava-1": "#73A64A", "svt-trava-2": "#4F8236", "svt-trava-3": "#8DBE58",
  }),
  predjari: TRIDY({
    "svt-kopce": "#A3A676", "svt-blizko": "#97A26A", "svt-blizko-lem": "#BDBE8C",
    "svt-pole-a": "#A68E6E", "svt-pole-b": "#A0B274", "svt-pole-c": "#93806A", "svt-pole-d": "#B0B08A",
    "svt-mez": "#77727A", "svt-strom-a": "#8A8494", "svt-strom-b": "#A09AAA", "svt-kmen": "#5A4A3E",
    "svt-cesta": "#CDBB98", "svt-cesta-svetlo": "#E2D4B4", "svt-krokus-a": "#9A72C8", "svt-krokus-b": "#F1E4F4",
    "stop:svt-lz1": "#93A266", "stop:svt-lz2": "#5F7040", "svt-trava-1": "#7C8E4E", "svt-trava-2": "#5C6E3C", "svt-trava-3": "#94A462",
  }),
  zima: TRIDY({
    "svt-kopce": "#E4EAF1", "svt-blizko": "#EEF2F7", "svt-blizko-lem": "#FFFFFF",
    "svt-pole-a": "#E9EEF4", "svt-pole-b": "#DCE4EE", "svt-pole-c": "#E5EBF2", "svt-pole-d": "#F0F4F8",
    "svt-mez": "#8B8598", "svt-strom-a": "#958FA2", "svt-strom-b": "#ACA6B8", "svt-kmen": "#5E5260",
    "svt-cesta": "#DCE3EC", "svt-cesta-svetlo": "#F6F8FB",
    "stop:svt-lz1": "#F1F4F8", "stop:svt-lz2": "#C9D3E0", "svt-trava-1": "#C2B08A", "svt-trava-2": "#A8946C", "svt-trava-3": "#CDBE98",
  }),
};

const SKUPINY: Record<Sezona, string[]> = {
  leto: ["svt-jen-leto"],
  podzim: ["svt-jen-podzim"],
  jaro: ["svt-jen-jaro"],
  predjari: ["svt-jen-predjari", "svt-snih-skvrny"],
  zima: ["svt-jen-zima", "svt-snih-daleko", "svt-snih-blizko", "svt-snih-dum", "svt-louka-snih", "svt-strom-snih"],
};
const VSECHNY = ["svt-jen-leto", "svt-jen-podzim", "svt-jen-jaro", "svt-jen-predjari", "svt-jen-zima", "svt-snih-skvrny", "svt-snih-daleko", "svt-snih-blizko", "svt-snih-dum", "svt-louka-snih", "svt-strom-snih"];

/** CSS krajiny — stejně jako orechStyly (koren = selektor sekce, sezona jen pro náhled) */
export function svitaniStyly(koren: string, sezona?: Sezona): string {
  const pravidla: string[] = [];
  const pro = (s: Sezona) => (sezona ? koren : `${koren}[data-sezona="${s}"]`);
  const pevne = (sel: string, telo: string) => pravidla.push(`${koren} ${sel}{${telo}}`);
  pevne(".svt-snih-daleko", "fill:#F4F7FB;opacity:.42");
  pevne(".svt-snih-blizko", "fill:#F4F7FB;opacity:.3");
  pevne(".svt-snih-skvrny", "fill:#EEF2F6;opacity:.9");
  pevne(".svt-snih-dum", "fill:#F6F8FB;stroke:#F6F8FB");
  pevne(".svt-louka-snih", "fill:#F3F6FA");
  pevne(".svt-strom-snih", "fill:#F6F8FB");
  pevne(".svt-les-blizko", "fill:#3E3A62;opacity:.3");
  pevne(".svt-ves-zed", "fill:#EDE2D6");
  pevne(".svt-ves-stin", "fill:#B9A9B6;opacity:.6");
  pevne(".svt-ves-strecha", "fill:#B45E46");
  pevne(".svt-ves-vez", "fill:#6E7E8C");
  pevne(".svt-ves-kriz", "stroke:#6E7E8C");
  pevne(".svt-ves-stromy", "fill:#4E7339");
  pevne(".svt-ves-okna", "fill:#FFD27A");
  pevne(".svt-mlha-2", "opacity:.6");
  pevne(".svt-brazdy", "stroke:#000;stroke-opacity:.12");
  pevne(".svt-stin", "fill:#2E3B25;opacity:.22");
  pevne(".svt-stonek", "stroke:#4F7A36");
  pevne(".svt-list-kvetu", "fill:#5E8E3E");
  pevne(".svt-zare", "mix-blend-mode:screen");
  pevne(".krajina-domek", "--domek-dilna:#F2B862;--domek-okno:#A9C2D2");

  const seznam: Sezona[] = sezona ? [sezona] : ["leto", "podzim", "jaro", "predjari", "zima"];
  for (const s of seznam) {
    VSECHNY.forEach((g) => pravidla.push(`${pro(s)} .${g}{display:${SKUPINY[s].includes(g) ? "inline" : "none"}}`));
    Object.entries(SVITANI_BARVY[s]).forEach(([k, v]) => {
      if (k.startsWith("stop:")) pravidla.push(`${pro(s)} .${k.slice(5)}{stop-color:${v}}`);
      else if (k === "svt-cesta-svetlo" || k === "svt-blizko-lem") pravidla.push(`${pro(s)} .${k}{stroke:${v}}`);
      else if (k === "svt-kmen") pravidla.push(`${pro(s)} .${k}{stroke:${v}}`);
      else pravidla.push(`${pro(s)} .${k}{fill:${v}}`);
    });
  }
  /* zima: stromy na kopcích jsou holé — koruna jen jako šedofialový chomáč větviček */
  return pravidla.join("\n");
}
