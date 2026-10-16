/**
 * Úvod stránky Futatsu — scéna kolem namalovaného hrnku: černá lakovaná
 * deska (shiki-ita), na které stojí, teplé světlo lampy zleva shora do
 * soumraku a vedle hrnku 二つ psané štětcem, jako svitek vedle kusu.
 * Hrnek sám je HTML vrstva nad kresbou (podobizna.ts, otáčí ho
 * scripts/obchod2/futatsu-otoc.ts), odraz v laku je třetí vrstva, kterou
 * skript překreslí s každým pootočením.
 *
 * Souřadnice jsou milimetry hrnku, stejné jako v podobizně: osa hrnku x = 0,
 * horní hrana okraje y = 0, patka stojí na y = 76 (PODOBIZNA.pata). Všechny
 * vrstvy mají stejný viewBox PLATNO, takže na sebe sedí v každé velikosti.
 * Deska je ve stejném nadhledu jako hrnek (12°) a čelem k divákovi —
 * souměrná, světlo a odlesky jsou jediné, co je vlevo jinak než vpravo.
 *
 * Styl: plochy bez obrysů, světlo jen měkkými přechody, žádné filtry.
 */
import { PODOBIZNA } from "./podobizna";

const f = (n: number) => Math.round(n * 100) / 100;
type Bod = [number, number];
const cesta = (b: Bod[], z = true) => "M" + b.map(([x, y]) => `${f(x)} ${f(y)}`).join("L") + (z ? "Z" : "");

/** Celé plátno scény v mm — vrstvy (kresba, hrnek, odraz) ho sdílejí */
export const PLATNO = { x: -92, y: -24, w: 160, h: 140 };
export const PLATNO_VB = `${PLATNO.x} ${PLATNO.y} ${PLATNO.w} ${PLATNO.h}`;

/** Kde leží rámeček podobizny na plátně (v procentech plátna) — pro HTML vrstvu hrnku */
export const HRNEK_NA_PLATNE = {
  left: ((PODOBIZNA.x - PLATNO.x) / PLATNO.w) * 100,
  top: ((PODOBIZNA.y - PLATNO.y) / PLATNO.h) * 100,
  width: (PODOBIZNA.w / PLATNO.w) * 100,
  height: (PODOBIZNA.h / PLATNO.h) * 100,
};

/* ——— Deska: nadhled 12° jako hrnek, střed hrnku 38 mm od zadní hrany ——— */
const NADHLED = (12 * Math.PI) / 180;
const SN = Math.sin(NADHLED);
const CS = Math.cos(NADHLED);
const PATA = PODOBIZNA.pata[1];
/** y na obrazovce pro bod podlahy v hloubce z (kladně k divákovi) */
const yZ = (z: number) => PATA + z * SN;
export const DESKA = {
  pul: 62,
  zadni: yZ(-38),
  predni: yZ(84),
  /** Tloušťka 10 mm v nadhledu */
  celo: 10 * CS,
  /** Zaoblené rohy desky (poloměr 6 mm) — v nadhledu elipsy */
  rx: 6,
  ry: 6 * SN,
};
const spodek = DESKA.predni + DESKA.celo;

/** Čtvrtoblouk elipsy kolem středu c, od úhlu a do b (stupně, y dolů) */
const oblouk = (c: Bod, rx: number, ry: number, a: number, b: number, n = 8): Bod[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const t = ((a + ((b - a) * i) / n) * Math.PI) / 180;
    return [c[0] + rx * Math.cos(t), c[1] + ry * Math.sin(t)];
  });

/** Horní plocha desky — zaoblený obdélník v nadhledu */
const horni = (): Bod[] => {
  const { pul, zadni, predni, rx, ry } = DESKA;
  return [
    ...oblouk([pul - rx, zadni + ry], rx, ry, 270, 360),
    ...oblouk([pul - rx, predni - ry], rx, ry, 0, 90),
    ...oblouk([-pul + rx, predni - ry], rx, ry, 90, 180),
    ...oblouk([-pul + rx, zadni + ry], rx, ry, 180, 270),
  ];
};
/** Čelo desky: přední oblouk horní plochy a pod ním týž oblouk o tloušťku níž */
const celo = (): Bod[] => {
  const { pul, predni, rx, ry } = DESKA;
  const nahore = [...oblouk([pul - rx, predni - ry], rx, ry, 0, 90), ...oblouk([-pul + rx, predni - ry], rx, ry, 90, 180)];
  const dole = nahore.map(([x, y]) => [x, y + DESKA.celo] as Bod).reverse();
  return [...nahore, ...dole];
};
/** Hrana mezi plochou a čelem — tady se láme světlo */
const hrana = (): Bod[] => {
  const { pul, predni, rx, ry } = DESKA;
  return [...oblouk([pul - rx, predni - ry], rx, ry, 0, 90), ...oblouk([-pul + rx, predni - ry], rx, ry, 90, 180)].reverse();
};

/* ——— Štětec: 二つ napsané tuší za hrnkem ———
 *
 * Tah je střední čára (Catmull-Rom přes pár bodů) a podél ní horní a spodní
 * okraj zvlášť: štětec dosedne šikmo zleva shora (horní okraj začne hned,
 * spodní se zakulatí později), „tome“ na konci přitlačí doprava dolů a zvedne
 * se, „harai“ odejde do ztracena. Suchý štětec (kasure) jsou světlé pruhy
 * podél tahu — maska, ne šum ani filtr. Celé písmo má jednu průhlednost. */
type Tah = {
  body: Bod[];
  /** Šířka tahu podél délky (t 0–1 → mm) */
  sirka: [number, number][];
  /** Spodní okraj vůči hornímu (t → poměr): přes 1 je bříško od přítlaku */
  bricho?: [number, number][];
  konec: "tome" | "harai";
  /** Jak velká část tahu na konci je suchá */
  suchy?: number;
};

const catmull = (b: Bod[], n: number): Bod[] => {
  const o: Bod[] = [];
  for (let i = 0; i < b.length - 1; i++) {
    const p0 = b[i - 1] ?? b[i];
    const p1 = b[i];
    const p2 = b[i + 1];
    const p3 = b[i + 2] ?? p2;
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const t2 = t * t;
      const t3 = t2 * t;
      const q = (a: number, b1: number, c: number, d: number) =>
        0.5 * (2 * b1 + (-a + c) * t + (2 * a - 5 * b1 + 4 * c - d) * t2 + (-a + 3 * b1 - 3 * c + d) * t3);
      o.push([q(p0[0], p1[0], p2[0], p3[0]), q(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  o.push(b[b.length - 1]);
  return o;
};
/** Hodnota v místě t (0–1) lineárně mezi body profilu */
const profil = (p: [number, number][], t: number) => {
  for (let i = 1; i < p.length; i++) if (t <= p[i][0]) return p[i - 1][1] + ((p[i][1] - p[i - 1][1]) * (t - p[i - 1][0])) / (p[i][0] - p[i - 1][0]);
  return p[p.length - 1][1];
};
/** Zaoblení konce: ve vzdálenosti s od konce s poloměrem r (čtvrtkruh) */
const zaobli = (s: number, r: number) => (s >= r ? 1 : Math.sqrt(Math.max(0, 1 - ((r - s) / r) ** 2)));

function tahStetcem(tah: Tah, sem: number, id: string): string {
  const c = catmull(tah.body, 18);
  const n = c.length;
  const delky = [0];
  for (let i = 1; i < n; i++) delky.push(delky[i - 1] + Math.hypot(c[i][0] - c[i - 1][0], c[i][1] - c[i - 1][1]));
  const L = delky[n - 1];
  /* Kolmice míří od střední čáry „dolů“ (vpravo od směru tahu) */
  const kolmice = c.map((_, i) => {
    const a = c[Math.max(0, i - 1)];
    const b = c[Math.min(n - 1, i + 1)];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [-(b[1] - a[1]) / l, (b[0] - a[0]) / l] as Bod;
  });
  const w0 = profil(tah.sirka, 0);
  const w1 = profil(tah.sirka, 1);
  const horni: Bod[] = [];
  const spodni: Bod[] = [];
  const pul: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const s = delky[i];
    const t = s / L;
    const w = profil(tah.sirka, t) / 2;
    let h = w * zaobli(s, 0.22 * w0);
    let d = w * (tah.bricho ? profil(tah.bricho, t) : 1) * zaobli(s, 0.8 * w0);
    if (tah.konec === "tome") {
      h *= zaobli(L - s, 0.95 * w1);
      d *= zaobli(L - s, 0.5 * w1);
    }
    /* Okraj se nepatrně chvěje — pevně, podle pořadí bodu */
    h *= 1 + 0.018 * Math.sin(i * 0.29 + sem);
    d *= 1 + 0.018 * Math.sin(i * 0.23 + sem * 1.7);
    const [nx, ny] = kolmice[i];
    horni.push([c[i][0] - nx * h, c[i][1] - ny * h]);
    spodni.push([c[i][0] + nx * d, c[i][1] + ny * d]);
    pul.push([h, d]);
  }
  const tvar = `<path d="${cesta([...horni, ...spodni.reverse()])}"`;
  if (!tah.suchy) return `${tvar}/>`;

  /* Suchý štětec: několik vlasů podél tahu, které ke konci nenesou tuš */
  const xs = c.map((b) => b[0]);
  const ys = c.map((b) => b[1]);
  const okraj = Math.max(w0, w1, ...tah.sirka.map((x) => x[1]));
  const box = { x: Math.min(...xs) - okraj, y: Math.min(...ys) - okraj, w: Math.max(...xs) - Math.min(...xs) + 2 * okraj, h: Math.max(...ys) - Math.min(...ys) + 2 * okraj };
  const VLASY: [number, number, number][] = [[-0.62, 0.55, 0.05], [-0.3, 0.9, 0.035], [0.02, 0.4, 0.045], [0.34, 0.75, 0.06], [0.66, 0.6, 0.04]];
  let pruhy = "";
  /* U „tome“ štětec na konci znovu přitlačí a nabere tuš — pruhy končí před ním */
  const doKde = tah.konec === "tome" ? 1 - (0.9 * w1) / L : 1;
  for (const [u, kde, sila] of VLASY) {
    const od = 1 - tah.suchy * kde;
    const b: Bod[] = [];
    for (let i = 0; i < n; i++) {
      const t = delky[i] / L;
      if (t < od || t > doKde) continue;
      const [h, d] = pul[i];
      const [nx, ny] = kolmice[i];
      const o = u < 0 ? u * h : u * d;
      b.push([c[i][0] + nx * o, c[i][1] + ny * o]);
    }
    if (b.length > 1) pruhy += `<path d="${cesta(b, false)}" stroke-width="${f(sila * okraj)}"/>`;
  }
  return (
    `<mask id="${id}" maskUnits="userSpaceOnUse" x="${f(box.x)}" y="${f(box.y)}" width="${f(box.w)}" height="${f(box.h)}">` +
    `<rect x="${f(box.x)}" y="${f(box.y)}" width="${f(box.w)}" height="${f(box.h)}" fill="#FFFFFF"/><g fill="none" stroke="#000000" stroke-linecap="round">${pruhy}</g></mask>` +
    `${tvar} mask="url(#${id})"/>`
  );
}

/** Kde stojí 二つ za hrnkem (mm plátna) */
export const PISMO = { x: -90, y: -21, em: 44 };

/**
 * 二つ svisle (tategaki): 二 nahoře, つ (slabika, o kus menší) pod ním.
 * x, y = levý horní roh pole znaku 二, em = velikost znaku v mm.
 */
export function dvaStetcem(x: number, y: number, em: number, p = "ftu") {
  const T = (bx: number, by: number, s = 1, dy = 0): Bod => [x + bx * em * s + (em * (1 - s)) / 2, y + dy + by * em * s];
  const dy = em * 1.02;
  const tahy: Tah[] = [
    /* 二 horní: kratší, v půlce se lehce zvedne, na konci přítlak */
    { body: [T(0.2, 0.32), T(0.4, 0.29), T(0.6, 0.275), T(0.8, 0.28)], sirka: [[0, 0.13 * em], [0.15, 0.11 * em], [0.6, 0.095 * em], [0.88, 0.11 * em], [1, 0.13 * em]], bricho: [[0, 1.2], [0.12, 1.08], [0.3, 1], [0.8, 1], [0.95, 1.22], [1, 1.25]], konec: "tome" },
    /* 二 dolní: dlouhý, uprostřed se prohne, rychlý — v druhé půlce suchý štětec */
    { body: [T(0.04, 0.755), T(0.32, 0.738), T(0.64, 0.736), T(0.96, 0.716)], sirka: [[0, 0.14 * em], [0.1, 0.115 * em], [0.5, 0.09 * em], [0.86, 0.105 * em], [1, 0.13 * em]], bricho: [[0, 1.22], [0.1, 1.08], [0.25, 1], [0.85, 1], [0.96, 1.22], [1, 1.26]], konec: "tome", suchy: 0.42 },
    /* つ: stoupne doprava, zatočí se a odejde vlevo dolů do ztracena */
    { body: [T(0.1, 0.42, 0.88, dy), T(0.38, 0.3, 0.88, dy), T(0.68, 0.255, 0.88, dy), T(0.9, 0.38, 0.88, dy), T(0.86, 0.62, 0.88, dy), T(0.62, 0.82, 0.88, dy), T(0.3, 0.93, 0.88, dy)], sirka: [[0, 0.13 * em], [0.12, 0.105 * em], [0.42, 0.115 * em], [0.62, 0.105 * em], [0.86, 0.055 * em], [1, 0.006 * em]], bricho: [[0, 1.2], [0.1, 1.05], [0.2, 1]], konec: "harai", suchy: 0.5 },
  ];
  return tahy.map((t, i) => tahStetcem(t, i * 1.7 + 0.4, `${p}-tah${i}`)).join("");
}

/**
 * Světelný sloup: protáhlá elipsa s kruhovým přechodem, otočená od zdroje
 * k cíli. Kraje má měkké na všechny strany, bez filtru.
 */
const sloup = (id: string, z: Bod, c: Bod, sirka: number, sila: number) => {
  const cx = (z[0] + c[0]) / 2;
  const cy = (z[1] + c[1]) / 2;
  const delka = Math.hypot(c[0] - z[0], c[1] - z[1]) / 2;
  const uhel = (Math.atan2(c[1] - z[1], c[0] - z[0]) * 180) / Math.PI;
  const t = `translate(${f(cx)} ${f(cy)}) rotate(${f(uhel)})`;
  return {
    def: `<radialGradient id="${id}" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="${t} scale(${f(delka)} ${f(sirka / 2)})"><stop offset="0" stop-color="#FFE4B4" stop-opacity="${sila}"/><stop offset="0.5" stop-color="#FFD9A0" stop-opacity="${f(sila * 0.45)}"/><stop offset="1" stop-color="#FFD09A" stop-opacity="0"/></radialGradient>`,
    tvar: `<ellipse cx="0" cy="0" rx="${f(delka)}" ry="${f(sirka / 2)}" transform="${t}" fill="url(#${id})"/>`,
  };
};

/** Kresba za hrnkem: světlo, deska, odlesky. Vnitřek <svg viewBox={PLATNO_VB}>. */
export function uvodScena(p = "ftu"): string {
  const { pul, zadni, predni } = DESKA;
  /* Lampa visí mimo obraz vlevo nahoře; světlo jde šikmo dolů na hrnek */
  const zdroj: Bod = [-96, -70];
  const sloupy = [
    sloup(`${p}-sloup1`, zdroj, [-2, 74], 86, 0.2),
    sloup(`${p}-sloup2`, [-88, -62], [-14, 58], 46, 0.22),
  ];
  const defs = [
    ...sloupy.map((s) => s.def),
    `<radialGradient id="${p}-zdroj" cx="${zdroj[0] + 22}" cy="${zdroj[1] + 30}" r="52" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FFF0D4" stop-opacity="0.5"/><stop offset="0.45" stop-color="#FFD9A0" stop-opacity="0.16"/><stop offset="1" stop-color="#FFD9A0" stop-opacity="0"/></radialGradient>`,
    /* Teplá záře za hrnkem — odliší krémovou glazuru od fialového soumraku */
    `<radialGradient id="${p}-zare" cx="-6" cy="30" r="66" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FFE2B4" stop-opacity="0.42"/><stop offset="0.5" stop-color="#F7B98A" stop-opacity="0.16"/><stop offset="1" stop-color="#F7B98A" stop-opacity="0"/></radialGradient>`,
    /* Lak: vzadu chytá soumrak, vpředu je hluboce černý */
    `<linearGradient id="${p}-plocha" gradientUnits="userSpaceOnUse" x1="0" y1="${f(zadni)}" x2="0" y2="${f(predni)}"><stop offset="0" stop-color="#4C3D5E"/><stop offset="0.1" stop-color="#2A2135"/><stop offset="0.38" stop-color="#141017"/><stop offset="1" stop-color="#0A0809"/></linearGradient>`,
    /* Lampa zrcadlená v laku: měkký protáhlý odlesk vpředu vlevo */
    `<radialGradient id="${p}-odlesk" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(-36 ${f(predni - 4.2)}) scale(17 2.6)"><stop offset="0" stop-color="#FFF1DA" stop-opacity="0.5"/><stop offset="0.5" stop-color="#FFD7A4" stop-opacity="0.16"/><stop offset="1" stop-color="#FFD7A4" stop-opacity="0"/></radialGradient>`,
    `<linearGradient id="${p}-plocha-bok" gradientUnits="userSpaceOnUse" x1="${-pul}" y1="0" x2="${pul}" y2="0"><stop offset="0" stop-color="#FFC98A" stop-opacity="0.07"/><stop offset="0.45" stop-color="#FFC98A" stop-opacity="0.02"/><stop offset="1" stop-color="#000000" stop-opacity="0.25"/></linearGradient>`,
    `<radialGradient id="${p}-tune" cx="-20" cy="${f(PATA + 7)}" r="50" gradientTransform="translate(-20 ${f(PATA + 7)}) scale(1 0.22) translate(20 ${f(-(PATA + 7))})" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FFC27E" stop-opacity="0.3"/><stop offset="0.6" stop-color="#E8955A" stop-opacity="0.08"/><stop offset="1" stop-color="#E8955A" stop-opacity="0"/></radialGradient>`,
    /* Čelo: lesklý lak — pod hranou tma, pak měkký pás odraženého světla, dole zase tma */
    `<linearGradient id="${p}-celo" gradientUnits="userSpaceOnUse" x1="0" y1="${f(predni)}" x2="0" y2="${f(spodek)}"><stop offset="0" stop-color="#2A201C"/><stop offset="0.1" stop-color="#0F0B0A"/><stop offset="0.32" stop-color="#1D1614"/><stop offset="0.5" stop-color="#0C0909"/><stop offset="1" stop-color="#050404"/></linearGradient>`,
    `<linearGradient id="${p}-celo-svetlo" gradientUnits="userSpaceOnUse" x1="${-pul}" y1="0" x2="${pul}" y2="0"><stop offset="0" stop-color="#FFC98A" stop-opacity="0.16"/><stop offset="0.35" stop-color="#FFC98A" stop-opacity="0.07"/><stop offset="0.7" stop-color="#FFC98A" stop-opacity="0"/></linearGradient>`,
    /* Hrana desky se leskne nejvíc vlevo, pod lampou */
    `<linearGradient id="${p}-hrana" gradientUnits="userSpaceOnUse" x1="${-pul}" y1="0" x2="${pul}" y2="0"><stop offset="0" stop-color="#FFE2B8" stop-opacity="0.55"/><stop offset="0.3" stop-color="#FFD39C" stop-opacity="0.9"/><stop offset="0.62" stop-color="#E8A874" stop-opacity="0.35"/><stop offset="1" stop-color="#9A6A54" stop-opacity="0.12"/></linearGradient>`,
    `<linearGradient id="${p}-zadni-hrana" gradientUnits="userSpaceOnUse" x1="${-pul}" y1="0" x2="${pul}" y2="0"><stop offset="0" stop-color="#C8A0B8" stop-opacity="0.32"/><stop offset="0.5" stop-color="#8A6E92" stop-opacity="0.18"/><stop offset="1" stop-color="#5A4A6A" stop-opacity="0.08"/></linearGradient>`,
    `<radialGradient id="${p}-stin" cx="0" cy="${f(spodek + 1)}" r="70" gradientTransform="translate(0 ${f(spodek + 1)}) scale(1 0.07) translate(0 ${f(-(spodek + 1))})" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#140C14" stop-opacity="0.5"/><stop offset="0.75" stop-color="#140C14" stop-opacity="0.22"/><stop offset="1" stop-color="#140C14" stop-opacity="0"/></radialGradient>`,
  ];

  const s: string[] = [];
  /* Světlo lampy mimo obraz: záře u zdroje */
  s.push(`<circle cx="${zdroj[0] + 22}" cy="${zdroj[1] + 30}" r="52" fill="url(#${p}-zdroj)"/>`);
  /* 二つ štětcem vlevo od hrnku, ve světle lampy (na telefonu se schová, futatsu.css) */
  const z = PISMO;
  s.push(`<g class="${p}-dva" fill="#FFF4E2" opacity="0.3">${dvaStetcem(z.x, z.y, z.em, p)}</g>`);
  /* Dva měkké sloupy světla jdou přes písmo k hrnku */
  s.push(...sloupy.map((x) => x.tvar));
  s.push(`<circle cx="-6" cy="30" r="66" fill="url(#${p}-zare)"/>`);

  /* Stín pod deskou */
  s.push(`<ellipse cx="0" cy="${f(spodek + 1)}" rx="70" ry="5" fill="url(#${p}-stin)"/>`);
  /* Čelo desky */
  const c = cesta(celo());
  s.push(`<path d="${c}" fill="url(#${p}-celo)"/>`, `<path d="${c}" fill="url(#${p}-celo-svetlo)"/>`);
  /* Horní plocha */
  const h = cesta(horni());
  s.push(`<path d="${h}" fill="url(#${p}-plocha)"/>`, `<path d="${h}" fill="url(#${p}-plocha-bok)"/>`);
  /* Tůně světla pod lampou a lampa zrcadlená v laku */
  s.push(`<ellipse cx="-20" cy="${f(PATA + 7)}" rx="50" ry="11" fill="url(#${p}-tune)"/>`);
  s.push(`<ellipse cx="-36" cy="${f(predni - 4.2)}" rx="17" ry="2.6" fill="url(#${p}-odlesk)"/>`);
  /* Zadní hrana chytá oblohu, přední lampu */
  const zh = [...oblouk([-pul + DESKA.rx, zadni + DESKA.ry], DESKA.rx, DESKA.ry, 180, 270), ...oblouk([pul - DESKA.rx, zadni + DESKA.ry], DESKA.rx, DESKA.ry, 270, 360)];
  s.push(`<path d="${cesta(zh, false)}" fill="none" stroke="url(#${p}-zadni-hrana)" stroke-width="0.5" stroke-linecap="round"/>`);
  s.push(`<path d="${cesta(hrana(), false)}" fill="none" stroke="url(#${p}-hrana)" stroke-width="0.42" stroke-linecap="round"/>`);
  return `<defs>${defs.join("")}</defs>${s.join("")}`;
}

/**
 * Odraz hrnku v laku: převrácená kresba hrnku oříznutá na horní plochu
 * desky a rozplývající se do ztracena. `obsah` je vnitřek podobizny (nebo
 * jen obrys) — skript ho vymění při každém pootočení.
 */
export function odrazDefs(p = "ftu"): string {
  const { zadni, predni } = DESKA;
  return (
    `<clipPath id="${p}-odraz-plocha"><path d="${cesta(horni())}"/></clipPath>` +
    `<linearGradient id="${p}-odraz-slabne" gradientUnits="userSpaceOnUse" x1="0" y1="${f(PATA)}" x2="0" y2="${f(predni)}"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.5"/><stop offset="0.45" stop-color="#FFFFFF" stop-opacity="0.2"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>` +
    `<mask id="${p}-odraz-maska" maskUnits="userSpaceOnUse" x="${PLATNO.x}" y="${f(zadni)}" width="${PLATNO.w}" height="${f(predni - zadni)}"><rect x="${PLATNO.x}" y="${f(zadni)}" width="${PLATNO.w}" height="${f(predni - zadni)}" fill="url(#${p}-odraz-slabne)"/></mask>` +
    `<linearGradient id="${p}-odraz-telo" gradientUnits="userSpaceOnUse" x1="-44" y1="0" x2="44" y2="0"><stop offset="0" stop-color="#E9DCC6"/><stop offset="0.45" stop-color="#D9C9AE"/><stop offset="1" stop-color="#8E7C68"/></linearGradient>`
  );
}
/** Obal odrazu: zrcadlo podle podlahy (y = 76). Skript vyměňuje obsah skupiny .ft-odraz-telo. */
export const odrazObal = (obsah: string, p = "ftu") =>
  `<g clip-path="url(#${p}-odraz-plocha)" mask="url(#${p}-odraz-maska)"><g class="ft-odraz-telo" transform="translate(0 ${2 * PATA}) scale(1 -1)">${obsah}</g></g>`;

/** Nápověda „vezmi ho do ruky“ vpravo od hrnku mezi výstupky (levý horní roh, % plátna) */
export const NAPOVEDA = { left: ((50 - PLATNO.x) / PLATNO.w) * 100, top: ((30 - PLATNO.y) / PLATNO.h) * 100 };
/** Levnější odraz jen z obrysu — když je podobizna na plynulé točení moc pomalá */
export const odrazObrys = (d: string, p = "ftu") => `<path d="${d}" fill="url(#${p}-odraz-telo)"/>`;
