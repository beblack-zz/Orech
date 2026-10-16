/**
 * 一 Podpis (銘 mei) — kresby kapitoly o podpisu.
 *
 *   rap(p)        řap japonského meče (nakago) naležato: kus čepele, pozlacená
 *                 měděná objímka habaki, řap s rzí, pilováním a vysekaným podpisem;
 *                 kde by byla rukojeť, je jen čárkovaný obrys jako skrytá hrana
 *                 na výkrese — podpis pod ní nikdo neuvidí
 *   lupa(obsah)   kruhové okno na makro výstupku z podobizna.ts (vystupekZblizka)
 *
 * Jednotky jsou milimetry (řap má zhruba skutečné míry katany), světlo
 * zleva shora jako všude. Noc: kresba stojí na tmavé obloze, popisky jsou
 * psané rukou světlou tuží. Podpis na řapu je jen naznačený — tahy dláta
 * bez skutečných znaků, nic nepředstírá jméno žádného mečíře.
 */
import { VYSTUPEK } from "./podobizna";

const f = (n: number) => Math.round(n * 100) / 100;
type Bod = [number, number];
const cesta = (b: Bod[], z = true) => "M" + b.map(([x, y]) => `${f(x)} ${f(y)}`).join("L") + (z ? "Z" : "");
/** Deterministická náhoda — kresba vyjde při každém buildu stejně */
const nahoda = (sem: number) => {
  let s = sem >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Rámeček kresby řapu v mm */
export const RAP = { x: -6, y: -30, w: 316, h: 92 };
export const RAP_VB = `${RAP.x} ${RAP.y} ${RAP.w} ${RAP.h}`;

/* ——— Míry: čepel zleva, ostří dole ——— */
const HAB = [70, 100]; // habaki od–do
const RAP_KONEC = 262; // kde končí řap (zaoblená špička kurijiri)
const TSUKA = [104, 300]; // rukojeť od–do
/** Horní a dolní hrana řapu v místě x — od objímky se zužuje ke konci */
const rapHrany = (x: number): [number, number] => {
  const t = Math.min(1, Math.max(0, (x - HAB[1]) / (RAP_KONEC - HAB[1])));
  return [2 + 2.4 * t, 24 - 4.6 * t];
};
const RAP_STRED = (x: number) => {
  const [a, b] = rapHrany(x);
  return (a + b) / 2;
};

function obrysRapu(): Bod[] {
  const horni: Bod[] = [];
  const dolni: Bod[] = [];
  for (let x = HAB[0] + 4; x <= RAP_KONEC - 6; x += 4) {
    const [a, b] = rapHrany(x);
    horni.push([x, a]);
    dolni.push([x, b]);
  }
  /* Kurijiri: oblá špička jako kaštan */
  const [a, b] = rapHrany(RAP_KONEC - 6);
  const cy = (a + b) / 2;
  const r = (b - a) / 2;
  const spicka: Bod[] = Array.from({ length: 13 }, (_, i) => {
    const u = -Math.PI / 2 + (Math.PI * i) / 12;
    return [RAP_KONEC - 6 + r * 0.95 * Math.cos(u), cy + r * Math.sin(u)];
  });
  return [...horni, ...spicka, ...dolni.reverse()];
}

/** Jeden tah dláta: klínek, na začátku širší, na konci do špičky */
const dlato = (x1: number, y1: number, x2: number, y2: number, w: number): Bod[] => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const l = Math.hypot(dx, dy) || 1;
  const nx = (-dy / l) * w;
  const ny = (dx / l) * w;
  return [
    [x1 + nx, y1 + ny],
    [x1 + dx * 0.25 + nx * 0.8, y1 + dy * 0.25 + ny * 0.8],
    [x2, y2],
    [x1 + dx * 0.25 - nx * 0.8, y1 + dy * 0.25 - ny * 0.8],
    [x1 - nx, y1 - ny],
  ];
};

export function rap(p = "ftm"): string {
  const q = nahoda(17);
  const defs: string[] = [];
  const s: string[] = [];

  defs.push(
    /* Čepel: hřbet tmavší ocel, plocha světlejší, ostří mléčné za vlnou kalení */
    `<linearGradient id="${p}-cepel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5B6773"/><stop offset="0.3" stop-color="#4A5560"/><stop offset="0.34" stop-color="#8C9AA7"/><stop offset="0.7" stop-color="#7A8895"/><stop offset="1" stop-color="#6E7C88"/></linearGradient>`,
    `<linearGradient id="${p}-ha" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C9D3DB"/><stop offset="1" stop-color="#E6ECF0"/></linearGradient>`,
    /* Čepel mizí doleva do noci */
    `<linearGradient id="${p}-mizi" gradientUnits="userSpaceOnUse" x1="-4" y1="0" x2="${HAB[0]}" y2="0"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="0.55" stop-color="#FFFFFF" stop-opacity="0.85"/><stop offset="1" stop-color="#FFFFFF"/></linearGradient>`,
    `<mask id="${p}-mizi-m" maskUnits="userSpaceOnUse" x="${RAP.x}" y="${RAP.y}" width="${RAP.w}" height="${RAP.h}"><rect x="${RAP.x}" y="${RAP.y}" width="${RAP.w}" height="${RAP.h}" fill="url(#${p}-mizi)"/></mask>`,
    /* Habaki: pozlacená měď s leskem nahoře */
    `<linearGradient id="${p}-hab" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F0CF86"/><stop offset="0.22" stop-color="#D2A458"/><stop offset="0.62" stop-color="#A97736"/><stop offset="1" stop-color="#6E4A22"/></linearGradient>`,
    /* Řap: rez a patina, u objímky teplejší, ke konci tmavne */
    `<linearGradient id="${p}-rez" gradientUnits="userSpaceOnUse" x1="${HAB[1]}" y1="0" x2="${RAP_KONEC}" y2="0"><stop offset="0" stop-color="#5E4130"/><stop offset="0.35" stop-color="#47332A"/><stop offset="1" stop-color="#2E231E"/></linearGradient>`,
    `<linearGradient id="${p}-rez-svetlo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C08A62" stop-opacity="0.32"/><stop offset="0.4" stop-color="#C08A62" stop-opacity="0"/><stop offset="1" stop-color="#000000" stop-opacity="0.3"/></linearGradient>`,
    `<clipPath id="${p}-rap"><path d="${cesta(obrysRapu())}"/></clipPath>`,
    `<radialGradient id="${p}-zare" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#FFD9A0" stop-opacity="0.15"/><stop offset="0.6" stop-color="#FFD9A0" stop-opacity="0.05"/><stop offset="1" stop-color="#FFD9A0" stop-opacity="0"/></radialGradient>`,
  );

  /* Teplé světlo za mečem, ať nesplyne s nocí */
  s.push(`<ellipse cx="150" cy="12" rx="170" ry="44" fill="url(#${p}-zare)"/>`);

  /* ——— Čepel: přichází zleva, mírně prohnutá ——— */
  const hrbet = (x: number) => -0.0006 * (HAB[0] - x) ** 2;
  const ostri = (x: number) => 30 - 0.0004 * (HAB[0] - x) ** 2;
  const cep: Bod[] = [];
  for (let x = -4; x <= HAB[0] + 2; x += 3) cep.push([x, hrbet(x)]);
  for (let x = HAB[0] + 2; x >= -4; x -= 3) cep.push([x, ostri(x)]);
  /* Vlna kalení (hamon) — klidná notare s pár hrbolky */
  const hamon: Bod[] = [];
  for (let x = -4; x <= HAB[0] + 2; x += 1.5) hamon.push([x, ostri(x) - 7 - 1.6 * Math.sin(x * 0.19) - 0.9 * Math.sin(x * 0.53 + 1)]);
  s.push(`<g mask="url(#${p}-mizi-m)">`);
  s.push(`<path d="${cesta(cep)}" fill="url(#${p}-cepel)"/>`);
  s.push(`<path d="${cesta([...hamon, [HAB[0] + 2, ostri(HAB[0] + 2)], [-4, ostri(-4)]])}" fill="url(#${p}-ha)"/>`);
  /* Hrana shinogi a odlesk lampy na ploše */
  s.push(`<path d="${cesta(cep.slice(0, cep.length / 2).map(([x]) => [x, hrbet(x) + 10.4] as Bod), false)}" fill="none" stroke="#B9C6D1" stroke-width="0.5" opacity="0.8"/>`);
  s.push(`<path d="${cesta(cep.slice(0, cep.length / 2).map(([x]) => [x, hrbet(x) + 0.4] as Bod), false)}" fill="none" stroke="#DDE6EE" stroke-width="0.7" opacity="0.7"/>`);
  s.push(`<path d="${cesta(cep.slice(0, cep.length / 2).map(([x]) => [x, hrbet(x) + 14.5] as Bod), false)}" fill="none" stroke="#FFFFFF" stroke-width="2.6" opacity="0.14"/>`);
  s.push(`</g>`);

  /* ——— Řap ——— */
  const obrys = cesta(obrysRapu());
  s.push(`<path d="${obrys}" fill="url(#${p}-rez)"/>`);
  s.push(`<g clip-path="url(#${p}-rap)">`);
  /* Pilování (yasurime): šikmé tahy pilníku, světlé a tmavé střídavě */
  for (let x = HAB[1] + 20; x < RAP_KONEC + 4; x += 4.2) {
    const [a, b] = rapHrany(x);
    const sk = 6;
    s.push(`<path d="M${f(x)} ${f(a - 1)}L${f(x - sk)} ${f(b + 1)}" stroke="#1E1612" stroke-width="0.6" opacity="0.55"/>`);
    s.push(`<path d="M${f(x + 0.8)} ${f(a - 1)}L${f(x + 0.8 - sk)} ${f(b + 1)}" stroke="#8A6448" stroke-width="0.35" opacity="0.35"/>`);
  }
  /* Skvrny rzi — pár větších, žádné zrno */
  for (let i = 0; i < 7; i++) {
    const x = HAB[1] + 10 + q() * (RAP_KONEC - HAB[1] - 20);
    const c = RAP_STRED(x) + (q() - 0.5) * 12;
    s.push(`<ellipse cx="${f(x)}" cy="${f(c)}" rx="${f(4 + q() * 9)}" ry="${f(1.6 + q() * 2.4)}" fill="${q() > 0.5 ? "#7A4E2E" : "#1F1814"}" opacity="${f(0.18 + q() * 0.16)}"/>`);
  }
  s.push(`<path d="${obrys}" fill="url(#${p}-rez-svetlo)"/>`);
  /* Podpis: pět znaků z tahů dláta podél řapu, pod otvorem pro kolík. Píše se svisle,
     tedy tady naležato: hlava znaku míří k objímce. Znaky jsou vymyšlené — tvar kanji,
     žádné skutečné jméno. */
  const len = (gx: number, gy: number, kx = gx, ky = gy): [number, number, number, number] => [gx, gy, kx, ky];
  const ZNAKY: [number, number, number, number][][] = [
    [len(0.15, 0.2, 0.85, 0.2), len(0.2, 0.5, 0.8, 0.5), len(0.5, 0.08, 0.5, 0.92), len(0.5, 0.56, 0.14, 0.9), len(0.5, 0.56, 0.86, 0.9)],
    [len(0.36, 0.05, 0.14, 0.42), len(0.26, 0.3, 0.26, 0.95), len(0.46, 0.25, 0.9, 0.25), len(0.6, 0.08, 0.6, 0.95), len(0.6, 0.55, 0.88, 0.55), len(0.6, 0.8, 0.86, 0.8)],
    [len(0.22, 0.14, 0.22, 0.86), len(0.22, 0.14, 0.8, 0.14), len(0.8, 0.14, 0.8, 0.86), len(0.22, 0.5, 0.8, 0.5), len(0.22, 0.86, 0.8, 0.86)],
    [len(0.3, 0.1, 0.7, 0.1), len(0.1, 0.32, 0.9, 0.32), len(0.5, 0.04, 0.5, 0.6), len(0.5, 0.6, 0.14, 0.95), len(0.5, 0.6, 0.9, 0.95)],
    [len(0.14, 0.1, 0.86, 0.1), len(0.3, 0.1, 0.3, 0.54), len(0.7, 0.1, 0.7, 0.54), len(0.14, 0.54, 0.86, 0.54), len(0.5, 0.56, 0.18, 0.95), len(0.52, 0.7, 0.86, 0.95)],
  ];
  ZNAKY.forEach((znak, k) => {
    const x0 = 140 + k * 17.5;
    const c = RAP_STRED(x0 + 6);
    const vel = 11;
    const P = (gx: number, gy: number): Bod => [x0 + gy * vel, c + (0.5 - gx) * vel * 0.8];
    for (const [ax, ay, bx, by] of znak) {
      const [x1, y1] = P(ax, ay);
      const [x2, y2] = P(bx + (q() - 0.5) * 0.06, by + (q() - 0.5) * 0.06);
      const t = dlato(x1, y1, x2, y2, 0.5);
      s.push(`<path d="${cesta(t.map(([x, y]) => [x + 0.32, y + 0.32] as Bod))}" fill="#120D0A" opacity="0.85"/>`);
      s.push(`<path d="${cesta(t)}" fill="#B89474"/>`);
    }
  });
  s.push(`</g>`);
  /* Horní hrana řapu chytá světlo */
  const hh: Bod[] = [];
  for (let x = HAB[1]; x <= RAP_KONEC - 6; x += 4) hh.push([x, rapHrany(x)[0] + 0.3]);
  s.push(`<path d="${cesta(hh, false)}" fill="none" stroke="#C99A72" stroke-width="0.5" opacity="0.55"/>`);
  /* Otvor pro kolík (mekugi-ana) */
  const mx = 124;
  const my = RAP_STRED(mx);
  s.push(`<circle cx="${mx}" cy="${f(my)}" r="3.3" fill="#0B0D1C"/><path d="M${mx + 2.3} ${f(my - 2.4)}A3.3 3.3 0 0 1 ${mx - 1.2} ${f(my + 3.1)}" fill="none" stroke="#A47A58" stroke-width="0.45" opacity="0.7"/>`);

  /* ——— Habaki ——— */
  const [h0, h1] = HAB;
  s.push(`<path d="M${h0} -1.5Q${h0} -3.2 ${h0 + 2} -3.2H${h1 - 1.5}Q${h1 + 0.6} -3.2 ${h1 + 0.6} -1H${h1 + 0.6}V27Q${h1 + 0.6} 30.6 ${h1 - 2} 31.2H${h0 + 2}Q${h0} 31 ${h0} 29Z" fill="url(#${p}-hab)"/>`);
  for (let i = 0; i < 7; i++) s.push(`<path d="M${h0 + 6 + i * 3.6} 4L${h0 + 2 + i * 3.6} 26" stroke="#8A5E2C" stroke-width="0.5" opacity="0.45"/>`);
  s.push(`<path d="M${h0 + 1} -2.4H${h1 - 1}" stroke="#FFF2CC" stroke-width="0.7" opacity="0.8"/>`);
  s.push(`<path d="M${h1} -2V28" stroke="#5A3A18" stroke-width="0.7" opacity="0.6"/>`);

  /* ——— Rukojeť, která tu není: obrys čárkovaně jako skrytá hrana ——— */
  const [t0, t1] = TSUKA;
  const tsuka: Bod[] = [];
  for (let x = t0; x <= t1; x += 6) {
    const u = (x - t0) / (t1 - t0);
    const pas = 1.2 * Math.sin(u * Math.PI); // lehce zúžený pas uprostřed
    tsuka.push([x, -4.5 + pas]);
  }
  const dole = tsuka.map(([x, y]) => [x, 13 + (13 - y) - 0.4] as Bod).reverse();
  const hlava: Bod[] = Array.from({ length: 9 }, (_, i) => {
    const u = -Math.PI / 2 + (Math.PI * i) / 8;
    return [t1 + 6 * Math.cos(u), 13 + 17.6 * Math.sin(u)];
  });
  s.push(`<path d="${cesta([...tsuka, ...hlava, ...dole])}" fill="none" stroke="#F4ECDD" stroke-width="0.7" stroke-dasharray="4 2.6" opacity="0.55"/>`);
  /* Omotávka rukojeti (tsuka-ito): křížem přes sebe, kosočtverce jen naznačené */
  let ito = "";
  for (let x = t0 + 16; x < t1 - 20; x += 24) ito += `M${x} -2L${x + 20} 28M${x + 20} -2L${x} 28`;
  s.push(`<path d="${ito}" fill="none" stroke="#F4ECDD" stroke-width="0.45" stroke-dasharray="2.4 2.2" opacity="0.26"/>`);
  /* Kolík rukojeti skrz otvor */
  s.push(`<circle cx="${mx}" cy="${f(my)}" r="5.2" fill="none" stroke="#F4ECDD" stroke-width="0.6" stroke-dasharray="2.2 1.8" opacity="0.5"/>`);

  /* ——— Poznámky rukou ——— */
  const ruka = (x: number, y: number, t: string, kotva = "start", velikost = 8.4) =>
    `<text x="${x}" y="${y}" font-size="${velikost}" text-anchor="${kotva}" class="ftm-ruka">${t}</text>`;
  s.push(ruka(196, -16, `<tspan class="ftm-kanji">銘</tspan> mei — podpis mečíře`, "middle"));
  s.push(`<path d="M182 -12Q176 -4 170 3.5" fill="none" stroke="#EE8A4E" stroke-width="0.7" stroke-linecap="round"/><path d="M170 3.5l3.6 -1.2M170 3.5l0.3 -3.7" stroke="#EE8A4E" stroke-width="0.7" stroke-linecap="round"/>`);
  s.push(ruka(214, 48, "tady bude rukojeť — podpis zmizí pod ní", "middle", 7.6));
  s.push(`<path d="M236 40Q246 36 250 31.5" fill="none" stroke="#F4ECDD" stroke-width="0.6" stroke-linecap="round" opacity="0.7"/>`);
  s.push(ruka(16, 46, "čepel", "middle", 7));
  s.push(ruka(85, -10, "habaki", "middle", 6.6));

  return `<defs>${defs.join("")}</defs>${s.join("")}`;
}

/**
 * Lupa: kruhové okno s makrem výstupku. `obsah` je vnitřek kresby
 * vystupekZblizka (viewBox VYSTUPEK) — v kruhu se ořízne, kraj kruhu
 * má tenký světlý lem jako detail na výkrese.
 */
export const LUPA = { w: 200, h: 200, r: 90 };
export function lupa(obsah: string, p = "ftv"): string {
  const { r } = LUPA;
  const c = 100;
  /* Makro roztáhnout, ať pokryje celý kruh */
  const v = VYSTUPEK;
  const k = Math.max((2 * r) / v.w, (2 * r) / v.h);
  const w = v.w * k;
  const h = v.h * k;
  return (
    `<defs><clipPath id="${p}-kruh"><circle cx="${c}" cy="${c}" r="${r}"/></clipPath>` +
    `<radialGradient id="${p}-zare" cx="0.5" cy="0.5" r="0.5"><stop offset="0.82" stop-color="#FFD9A0" stop-opacity="0.22"/><stop offset="1" stop-color="#FFD9A0" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="${p}-vineta" cx="0.42" cy="0.4" r="0.62"><stop offset="0.7" stop-color="#000000" stop-opacity="0"/><stop offset="1" stop-color="#140E1E" stop-opacity="0.38"/></radialGradient></defs>` +
    `<circle cx="${c}" cy="${c}" r="${r + 9}" fill="url(#${p}-zare)"/>` +
    `<g clip-path="url(#${p}-kruh)"><svg x="${f(c - w / 2)}" y="${f(c - h / 2)}" width="${f(w)}" height="${f(h)}" viewBox="${v.viewBox}" preserveAspectRatio="xMidYMid slice">${obsah}</svg>` +
    `<circle cx="${c}" cy="${c}" r="${r}" fill="url(#${p}-vineta)"/></g>` +
    `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="#F4ECDD" stroke-width="0.9" opacity="0.85"/>` +
    `<circle cx="${c}" cy="${c}" r="${r + 4}" fill="none" stroke="#F4ECDD" stroke-width="0.4" opacity="0.4"/>`
  );
}
