/**
 * Úroveň 一 Hrouda — kresba scény „Šest stejných“. Čisté funkce bez DOM,
 * které vracejí SVG a HTML jako text: Hrouda.astro je skládá při buildu
 * a hra (scripts/zkouska/urovne/hrouda.ts) s nimi překresluje blok, krajíce,
 * koule a cedulky.
 *
 * Scéna (viewBox 800 × 560) je ranní kout dílny: vlevo stará kuchyňská
 * váha s krémovým ciferníkem, přes stůl s plátnem leží dlouhý blok hlíny,
 * před ním krejčovský metr a prkénko na šest koulí, vpravo v popředí pytel
 * hlíny. Oknem padá ranní světlo a za oknem je ořech.
 *
 * Vrstvy: zadní SVG (pokoj, stůl, blok, váha, podnos, pytel), mezi nimi
 * HTML obal s Hlínkou (Postavicka) a přední SVG (drát, krajíce v letu,
 * koule, cedulky, okraj pytle). Všechna id začínají mh1-.
 *
 * Měřítko: 1 cm = CM jednotek, blok začíná na X0 a leží na čáře ZAKLAD
 * (hrouda-model.ts).
 */
import { CM, X0, ZAKLAD, HROUD, CIL, novyBlok, vyska } from "./hrouda-model";
import type { Blok } from "./hrouda-model";

export const SIRKA = 800;
export const VYSKA = 560;
/** Blok, který je vidět ve statické kresbě (před tím, než hra postaví vlastní) */
export const VYCHOZI_SEME = 7311;

/** Váha: střed ciferníku, poloměr stupnice a výška, na které je miska */
export const VAHA = { x: 104, y: 341, r: 45, miska: 247 };
/** Podnos: středy šesti koulí */
export const PODNOS = { x: 272, krok: 70, y: 416 };
/** Pytel v popředí: střed otvoru */
export const PYTEL = { x: 736, y: 424 };
/** Drát: kde jsou kolíky */
export const DRAT = { nahore: 166, dole: 392 };
/**
 * Hlínka: šířka obalu ve viewBoxu, kde má v obrázku (180 × 180) střed těla
 * (kruh r 48 kolem 90 98), jak vysoko je střed nad tím, na čem leží,
 * a poloměr těla — v něm se drát nesmí ocitnout.
 */
export const HLINKA = { sirka: 116, stred: 98 / 180, nad: (51 / 180) * 116, polomer: (48 / 180) * 116 };

/** Ručička: úhel ve stupních pro hmotnost — 500 g je přesně nahoře */
export const uhelVahy = (g: number) => -150 + 0.3 * Math.max(-20, Math.min(1060, g));

const f1 = (n: number) => String(Math.round(n * 10) / 10);
const bod = (p: [number, number]) => `${f1(p[0])} ${f1(p[1])}`;

/** Hladká čára přes body (Catmull-Rom jako Bézierovy křivky) — bez úvodního M */
export function hladka(body: [number, number][]) {
  let d = "";
  for (let i = 0; i < body.length - 1; i++) {
    const p0 = body[i - 1] ?? body[i];
    const p1 = body[i];
    const p2 = body[i + 1];
    const p3 = body[i + 2] ?? p2;
    d += ` C${f1(p1[0] + (p2[0] - p0[0]) / 6)} ${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)} ${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${bod(p2)}`;
  }
  return d;
}

const lomena = (body: [number, number][]) => body.map((p, i) => `${i ? "L" : "M"}${bod(p)}`).join(" ");

/* ——— Blok a krajíce ——— */

export interface KusVolby {
  /** Předpona id: clipPath kusu je `${id}-orez` */
  id: string;
  /** Předpona filtrů a přechodů SVG, ve kterém kus leží: mh1-z (zadní), mh1-p (přední) */
  defs: "mh1-z" | "mh1-p";
  /** Pravý konec je řez (krajíc) — vidíme ho zezadu jako vypouklý kraj */
  rez?: boolean;
  /** Bez stínu pod sebou (kus ve vzduchu si ho kreslí sám) */
  bezStinu?: boolean;
}

const sx = (x: number) => X0 + x * CM;

/**
 * Obrys kusu bloku mezi od a po (cm): hřbet jako body a u pravého konce
 * bloku zakulacený nos. Spodek leží rovně na stole.
 */
export function obrysKusu(b: Blok, od: number, po: number) {
  const konec = po >= b.delka - 0.001;
  /* Hřbet jde po profilu až k začátku čepičky, pak ho převezme nos */
  const xe = konec ? Math.max(od, b.delka - b.cepicka) : po;
  const xs: number[] = [];
  for (let x = od; x < xe - 0.05; x += 0.5) xs.push(x);
  xs.push(xe);
  const hrbet: [number, number][] = xs.map((x) => [sx(x), ZAKLAD - vyska(b, x) * CM]);
  const hE = vyska(b, xe) * CM;
  return { konec, xe, hrbet, hOd: vyska(b, od) * CM, hPo: konec ? 0 : vyska(b, po) * CM, hE };
}

/** Silueta kusu jako cesta */
export function siluetaKusu(b: Blok, od: number, po: number, rez = false) {
  const o = obrysKusu(b, od, po);
  const xl = sx(od);
  let d = `M${f1(xl)} ${f1(ZAKLAD)} L${bod(o.hrbet[0])}` + hladka(o.hrbet);
  if (o.konec) {
    /* Nos: z hřbetu oblým obloukem dolů a zpátky ke stolu */
    const p1 = o.hrbet[o.hrbet.length - 1];
    const n: [number, number] = [sx(b.delka) + 2, ZAKLAD - o.hE * 0.4];
    const dole: [number, number] = [sx(b.delka - (b.delka - o.xe) * 0.55), ZAKLAD];
    d +=
      ` C${f1(p1[0] + (n[0] - p1[0]) * 0.62)} ${f1(p1[1])} ${f1(n[0])} ${f1(p1[1] + (n[1] - p1[1]) * 0.42)} ${bod(n)}` +
      ` C${f1(n[0])} ${f1(n[1] + (dole[1] - n[1]) * 0.55)} ${f1(dole[0] + (n[0] - dole[0]) * 0.45)} ${f1(dole[1])} ${bod(dole)}`;
  } else {
    const xp = sx(po);
    const ry = o.hPo / 2;
    d += rez ? ` A${f1(ry * 0.4)} ${f1(ry)} 0 0 1 ${f1(xp)} ${f1(ZAKLAD)}` : ` L${f1(xp)} ${f1(ZAKLAD)}`;
  }
  return d + " Z";
}

/**
 * Pás stínování mezi zlomky výšky a a c (0 = hřbet, 1 = stůl). Pásy se
 * kreslí rozmazané a ořízlé siluetou, takže světlo jde po tvaru bloku.
 * V čepičce se výška drží, nos si ořízne silueta.
 */
function pas(b: Blok, od: number, po: number, a: number, c: number) {
  const xe = po >= b.delka - 0.001 ? Math.max(od, b.delka - b.cepicka) : po;
  const n = Math.max(3, Math.ceil((xe - od) / 0.9));
  const horni: [number, number][] = [];
  const dolni: [number, number][] = [];
  const pridej = (X: number, x: number) => {
    const h = vyska(b, x) * CM;
    horni.push([X, ZAKLAD - h + a * h]);
    dolni.push([X, ZAKLAD - h + c * h]);
  };
  pridej(sx(od) - 30, od);
  for (let i = 0; i <= n; i++) pridej(sx(od + ((xe - od) * i) / n), od + ((xe - od) * i) / n);
  pridej(sx(po) + 40, xe);
  return lomena(horni) + " " + lomena(dolni.reverse()).replace(/^M/, "L") + " Z";
}

/** Rovná stěna po drátu — elipsa průřezu na levém konci kusu */
function stena(x: number, h: number, defs: string) {
  const ry = h / 2;
  const rx = ry * 0.4;
  const cy = ZAKLAD - ry;
  /* Drát nechá na stěně pár jemných rýh napříč */
  const ryhy = [0.28, 0.5, 0.72]
    .map((t) => {
      const y = ZAKLAD - h * t;
      const s = Math.sqrt(Math.max(0, 1 - ((y - cy) / ry) ** 2)) * rx * 0.84;
      return `M${f1(x - s)} ${f1(y + 0.8)} Q${f1(x)} ${f1(y - 1.4)} ${f1(x + s)} ${f1(y + 0.5)}`;
    })
    .join(" ");
  return (
    `<ellipse cx="${f1(x)}" cy="${f1(cy)}" rx="${f1(rx)}" ry="${f1(ry)}" fill="url(#${defs}-stena)" stroke="#4E3729" stroke-opacity="0.6" stroke-width="1.3"/>` +
    `<path d="${ryhy}" fill="none" stroke="#5E4434" stroke-width="0.9" stroke-opacity="0.4" stroke-linecap="round"/>` +
    `<path d="M${f1(x - rx * 0.5)} ${f1(cy - ry * 0.74)} Q${f1(x - rx * 0.92)} ${f1(cy - ry * 0.1)} ${f1(x - rx * 0.62)} ${f1(cy + ry * 0.5)}" fill="none" stroke="#F6E2CE" stroke-width="1.6" stroke-opacity="0.55" stroke-linecap="round"/>`
  );
}

/**
 * Kus bloku jako SVG (bez obalové <g>): stín, tělo se stínováním, důlky
 * po prstech, lesk mokré hlíny a stěna po drátu vlevo.
 */
export function kusBloku(b: Blok, od: number, po: number, o: KusVolby) {
  const sil = siluetaKusu(b, od, po, o.rez);
  const ob = obrysKusu(b, od, po);
  const xl = sx(od);
  const xp = ob.konec ? sx(b.delka) + 2 : sx(po) + (o.rez ? ob.hPo * 0.2 : 0);
  const d = o.defs;
  const orez = `${o.id}-orez`;
  let s = "";
  if (!o.bezStinu) {
    /* Světlo jde z okna vpravo vzadu — stín padá dopředu a doleva, a kde je blok vyšší, je delší */
    const stin: [number, number][] = [];
    const n = Math.max(2, Math.ceil((po - od) / 1.5));
    for (let i = n; i >= 0; i--) {
      const x = od + ((po - od) * i) / n;
      const h = vyska(b, Math.min(x, ob.xe)) * CM;
      stin.push([sx(x) - h * 0.32, ZAKLAD + h * 0.17]);
    }
    s +=
      `<path d="M${f1(xl - 12)} ${f1(ZAKLAD - 2)} L${f1(xp)} ${f1(ZAKLAD - 2)} L${bod(stin[0])}${hladka(stin)} Z" fill="#4A3426" opacity="0.2" filter="url(#${d}-mekce)"/>` +
      `<path d="M${f1(xl - 4)} ${f1(ZAKLAD + 0.5)} H${f1(xp - 6)}" stroke="#2E1F16" stroke-width="5" stroke-linecap="round" opacity="0.45" filter="url(#${d}-mekce-2)"/>`;
  }
  s += `<clipPath id="${orez}"><path d="${sil}"/></clipPath>`;
  s += `<g clip-path="url(#${orez})">`;
  s += `<path d="${sil}" fill="#8F6B53"/>`;
  s += `<g filter="url(#${d}-mekce)">`;
  s += `<path d="${pas(b, od, po, -0.5, 0.44)}" fill="#B78F70"/>`;
  s += `<path d="${pas(b, od, po, 0.05, 0.22)}" fill="#D3AD8D"/>`;
  s += `<path d="${pas(b, od, po, 0.6, 0.86)}" fill="#694A38" opacity="0.92"/>`;
  s += `<path d="${pas(b, od, po, 0.7, 0.84)}" fill="#533A2C" opacity="0.6"/>`;
  s += `<path d="${pas(b, od, po, 0.91, 1.5)}" fill="#7E5E4A" opacity="0.9"/>`;
  if (ob.konec) {
    /* Nos je ke světlu — zakulacená špička se rozsvítí */
    const nx = sx(b.delka);
    s += `<ellipse cx="${f1(nx - ob.hE * 0.36)}" cy="${f1(ZAKLAD - ob.hE * 0.62)}" rx="${f1(ob.hE * 0.34)}" ry="${f1(ob.hE * 0.3)}" fill="#E4C2A3" opacity="0.55"/>`;
  }
  s += `</g>`;
  /* Důlky po palcích — kde se hlína dřív hnětla */
  let dulky = "";
  for (const [x, t, v] of b.dulky) {
    if (x < od + 0.8 || x > Math.min(po, ob.xe) - 0.8) continue;
    const h = vyska(b, x) * CM;
    const cx = sx(x);
    const cy = ZAKLAD - h + t * h;
    dulky +=
      `<ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(8.5 * v)}" ry="${f1(3.4 * v)}" fill="#4E3729" opacity="0.15"/>` +
      `<path d="M${f1(cx - 7 * v)} ${f1(cy + 2.6 * v)} Q${f1(cx)} ${f1(cy + 5.6 * v)} ${f1(cx + 7 * v)} ${f1(cy + 2.6 * v)}" fill="none" stroke="#E8C9AD" stroke-width="${f1(1.3 * v)}" opacity="0.32" stroke-linecap="round"/>`;
  }
  if (dulky) s += `<g filter="url(#${d}-mekce-2)">${dulky}</g>`;
  /* Lesk mokré hlíny po hřbetu a pár silnějších odlesků */
  const lesk: [number, number][] = [];
  const l0 = od + (po - od) * 0.05;
  const l1 = Math.min(po, ob.xe) - Math.min(1.2, (po - od) * 0.06);
  for (let i = 0; i <= 10; i++) {
    const x = l0 + ((l1 - l0) * i) / 10;
    const h = vyska(b, x) * CM;
    lesk.push([sx(x), ZAKLAD - h + h * 0.12]);
  }
  let odlesky = "";
  for (const [x, , v] of b.dulky) {
    const xx = x + 2.4;
    if (xx < od + 0.6 || xx > Math.min(po, ob.xe) - 0.6) continue;
    const h = vyska(b, xx) * CM;
    odlesky += `<ellipse cx="${f1(sx(xx))}" cy="${f1(ZAKLAD - h + h * 0.13)}" rx="${f1(11 * v)}" ry="2.2" fill="#FFF6EA" opacity="0.5"/>`;
  }
  s += `<g filter="url(#${d}-mekce-2)"><path d="M${bod(lesk[0])}${hladka(lesk)}" fill="none" stroke="#FFF4E6" stroke-width="2.6" stroke-linecap="round" opacity="0.3"/>${odlesky}</g>`;
  s += `</g>`;
  s += `<path d="${sil}" fill="none" stroke="#4E3729" stroke-width="1.5" stroke-opacity="0.55" stroke-linejoin="round"/>`;
  s += stena(xl, ob.hOd, d);
  return s;
}

/** Defs, které potřebuje kus bloku v daném SVG */
const defsKusu = (p: "mh1-z" | "mh1-p") =>
  `<filter id="${p}-mekce" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation="5"/></filter>` +
  `<filter id="${p}-mekce-2" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation="1.6"/></filter>` +
  `<radialGradient id="${p}-stena" cx="0.36" cy="0.32" r="0.8"><stop offset="0" stop-color="#B08B70"/><stop offset="0.6" stop-color="#94705A"/><stop offset="1" stop-color="#74553F"/></radialGradient>`;

/* ——— Koule a cedulky ——— */

/** Barva podle toho, jak se hrouda povedla */
export function barvaOdchylky(odch: number) {
  const a = Math.abs(odch);
  if (a <= 8) return "#2F7A55";
  if (a <= 20) return "#6E8A2E";
  if (a <= 45) return "#B97A1C";
  return "#C4432B";
}

/** Odchylka jako text: +12, −8, ±0 */
export const odchylkaText = (odch: number) => {
  const r = Math.round(odch);
  return r === 0 ? "±0" : r > 0 ? `+${r}` : `−${-r}`;
};

/** Poloměr koule z hmotnosti — objem roste se třetí mocninou */
export const polomerKoule = (g: number) => 29 * Math.cbrt(Math.max(20, g) / CIL);

/** Koule hlíny se středem v 0 0 (posouvá ji obalová <g>) */
export function koule(g: number, defs: "mh1-p" = "mh1-p") {
  const r = polomerKoule(g);
  return (
    `<ellipse class="mh1-koule-stin" cx="${f1(r * 0.12)}" cy="${f1(r * 0.92)}" rx="${f1(r * 1.02)}" ry="${f1(r * 0.24)}" fill="#3A281D" opacity="0.3" filter="url(#${defs}-mekce-2)"/>` +
    `<g class="mh1-koule-telo">` +
    `<circle r="${f1(r)}" fill="url(#${defs}-koule)" stroke="#4E3729" stroke-opacity="0.45" stroke-width="1.3"/>` +
    `<path d="M${f1(-r * 0.62)} ${f1(-r * 0.28)} Q${f1(-r * 0.2)} ${f1(-r * 0.86)} ${f1(r * 0.5)} ${f1(-r * 0.62)}" fill="none" stroke="#FFF4E6" stroke-width="2.6" stroke-linecap="round" opacity="0.45"/>` +
    `<path d="M${f1(-r * 0.5)} ${f1(r * 0.36)} Q${f1(0)} ${f1(r * 0.56)} ${f1(r * 0.46)} ${f1(r * 0.3)}" fill="none" stroke="#5A3F2F" stroke-width="1.2" stroke-linecap="round" opacity="0.35"/>` +
    `</g>`
  );
}

/** Papírová cedulka s váhou — stojí opřená před koulí */
export function cedulka(g: number, i: number) {
  const odch = g - CIL;
  const nakloneni = [-5, 3, -2, 4, -4, 2][i % 6];
  return (
    `<g transform="rotate(${nakloneni})">` +
    `<path d="M0 -21 C-3 -12 1 -6 -1 -1" fill="none" stroke="#8A7C70" stroke-width="0.9"/>` +
    `<rect x="-23" y="-2" width="46" height="31" rx="3" fill="#FBF7EC" stroke="#C9B48A" stroke-width="0.9"/>` +
    `<circle cx="0" cy="3" r="1.6" fill="#E9DFC7" stroke="#C9B48A" stroke-width="0.6"/>` +
    `<text x="0" y="16" text-anchor="middle" font-size="15" fill="#2B2420" style="font-family:var(--f-ruka, Caveat, cursive)">${Math.round(g)} g</text>` +
    `<text x="0" y="26.5" text-anchor="middle" font-size="10.5" font-weight="600" fill="${barvaOdchylky(odch)}" style="font-family:var(--f-ruka, Caveat, cursive)">${odchylkaText(odch)}</text>` +
    `</g>`
  );
}

/* ——— Váha ——— */

function vaha() {
  const { x, y, r } = VAHA;
  const bodNa = (g: number, rr: number) => {
    const u = ((uhelVahy(g) - 90) * Math.PI) / 180;
    return [x + Math.cos(u) * rr, y + Math.sin(u) * rr] as [number, number];
  };
  let ryski = "";
  let cisla = "";
  for (let g = 0; g <= 1000; g += 20) {
    const velka = g % 100 === 0;
    const a = bodNa(g, r);
    const c = bodNa(g, r - (velka ? 8 : 4.5));
    ryski += `M${bod(a)} L${bod(c)} `;
    if (velka) {
      const t = bodNa(g, r - 16);
      const pet = g === 500;
      cisla += `<text x="${f1(t[0])}" y="${f1(t[1] + 2.8)}" text-anchor="middle" font-size="${pet ? 9.5 : 7.2}" font-weight="${pet ? 700 : 600}" fill="${pet ? "#C4432B" : "#5C5047"}" style="font-family:var(--f-display, Georgia, serif)">${g}</text>`;
    }
  }
  /* Zlatá výseč 490–510 g — kdo se trefí sem, je to na gram */
  const z0 = bodNa(490, r + 0.5);
  const z1 = bodNa(510, r + 0.5);
  const z2 = bodNa(510, r - 9);
  const z3 = bodNa(490, r - 9);
  const vysec = `M${bod(z0)} A${r + 0.5} ${r + 0.5} 0 0 1 ${bod(z1)} L${bod(z2)} A${r - 9} ${r - 9} 0 0 0 ${bod(z3)} Z`;

  return `
  <g class="mh1-vaha">
    <ellipse cx="${x + 4}" cy="429" rx="94" ry="9" fill="#3A2C22" opacity="0.22" filter="url(#mh1-z-mekce)"/>
    <path d="M24 414 Q24 406 32 406 H176 Q184 406 184 414 V424 Q184 430 176 430 H32 Q24 430 24 414 Z" fill="#4F7D74"/>
    <path d="M27 410 H181" stroke="#8DB8AD" stroke-width="1.5" opacity="0.7"/>
    <path d="M46 278 Q46 270 54 270 H154 Q162 270 162 278 L176 404 Q177 410 170 410 H38 Q31 410 32 404 Z" fill="url(#mh1-z-smalt)"/>
    <path d="M54 274 H154" stroke="#C7E0D8" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
    <path d="M160 282 L172 398" stroke="#3E665E" stroke-width="3" stroke-linecap="round" opacity="0.35"/>
    <rect x="96" y="256" width="16" height="16" rx="2" fill="url(#mh1-z-chrom)"/>
    <circle cx="${x}" cy="${y}" r="${r + 9}" fill="url(#mh1-z-chrom)"/>
    <circle cx="${x}" cy="${y}" r="${r + 5.5}" fill="#6F7579"/>
    <circle cx="${x}" cy="${y}" r="${r + 4.5}" fill="url(#mh1-z-cifernik)"/>
    <path d="${vysec}" fill="#E8B848" opacity="0.85"/>
    <path d="${ryski}" stroke="#4A3F37" stroke-width="1" stroke-linecap="round"/>
    ${cisla}
    <text x="${x}" y="${y + 17}" text-anchor="middle" font-size="8" fill="#8A7C70" style="font-family:var(--f-display, Georgia, serif)">g</text>
    <g class="mh1-rucicka" transform="rotate(${f1(uhelVahy(0))} ${x} ${y})">
      <path d="M${x - 1.6} ${y + 10} L${x - 0.7} ${y - r + 3} L${x} ${y - r + 0.5} L${x + 0.7} ${y - r + 3} L${x + 1.6} ${y + 10} Z" fill="#C4432B"/>
      <circle cx="${x}" cy="${y + 9}" r="3.2" fill="#C4432B"/>
    </g>
    <circle cx="${x}" cy="${y}" r="5.2" fill="url(#mh1-z-chrom)" stroke="#5E656B" stroke-width="0.8"/>
    <path d="M${x - r - 1} ${y - 18} A${r + 2} ${r + 2} 0 0 1 ${x - 10} ${y - r - 1}" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity="0.5"/>
    <rect x="${x - 21}" y="391" width="42" height="11" rx="2" fill="#F3E9D2" stroke="#3E665E" stroke-width="0.6" opacity="0.95"/>
    <text x="${x}" y="399.4" text-anchor="middle" font-size="7.4" font-weight="700" fill="#3E665E" letter-spacing="0.8" style="font-family:var(--f-display, Georgia, serif)">1 kg</text>
    <path d="M38 252 Q104 274 170 252 L164 258 Q104 278 44 258 Z" fill="#6F7579"/>
    <ellipse cx="104" cy="${VAHA.miska}" rx="68" ry="9.5" fill="url(#mh1-z-miska)" stroke="#5E656B" stroke-width="1"/>
    <ellipse cx="104" cy="${VAHA.miska - 0.8}" rx="60" ry="6.5" fill="#B5BCC1" opacity="0.65"/>
    <path d="M52 245 Q80 240 118 241" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
  </g>`;
}

/* ——— Pokoj ——— */

function okno() {
  /* Ořech za oknem: lichozpeřené listy, dva zelené ořechy */
  const list = (x: number, y: number, uhel: number, d: number) =>
    `<path transform="translate(${x} ${y}) rotate(${uhel})" d="M0 0 C${f1(d * 0.3)} ${f1(-d * 0.22)} ${f1(d * 0.75)} ${f1(-d * 0.2)} ${f1(d)} 0 C${f1(d * 0.75)} ${f1(d * 0.2)} ${f1(d * 0.3)} ${f1(d * 0.22)} 0 0 Z" fill="#7E9A5E"/>`;
  const vetev = [
    list(706, 34, 160, 26), list(700, 44, 196, 24), list(688, 36, 150, 22), list(682, 50, 205, 22),
    list(668, 42, 142, 20), list(664, 58, 214, 20), list(650, 52, 160, 18), list(718, 58, 230, 22),
    list(728, 70, 120, 20), list(735, 88, 200, 18),
  ].join("");
  return `
  <g class="mh1-okno-kresba">
    <rect x="556" y="24" width="184" height="182" fill="url(#mh1-z-nebe)"/>
    <path d="M556 150 C590 138 626 146 660 136 C690 128 716 134 740 128 L740 206 L556 206 Z" fill="#B9C79E"/>
    <path d="M556 174 C600 162 650 170 700 160 C716 157 730 158 740 156 L740 206 L556 206 Z" fill="#9DB58A"/>
    <path d="M740 26 C722 34 700 40 676 42 C664 43 652 48 642 56" fill="none" stroke="#6B5640" stroke-width="3.4" stroke-linecap="round"/>
    <path d="M714 36 C718 54 726 70 734 90" fill="none" stroke="#6B5640" stroke-width="2.2" stroke-linecap="round"/>
    ${vetev}
    <circle cx="694" cy="62" r="6.5" fill="#93AA5E"/><circle cx="704" cy="66" r="6" fill="#86A055"/>
    <circle cx="692" cy="60" r="2" fill="#C5D59A" opacity="0.7"/>
    <rect x="556" y="24" width="184" height="182" fill="#FFF6DA" opacity="0.18"/>
    <rect x="550" y="18" width="196" height="194" fill="none" stroke="#8A6A48" stroke-width="12"/>
    <path d="M648 22 V208 M554 116 H742" stroke="#8A6A48" stroke-width="7"/>
    <path d="M545 13 H751" stroke="#A9865F" stroke-width="2" opacity="0.7"/>
    <rect x="538" y="210" width="220" height="12" rx="2" fill="#9A7652"/>
    <rect x="538" y="221" width="220" height="5" fill="#6E5236" opacity="0.6"/>
    <g transform="translate(578 210)">
      <path d="M-11 0 L-9 -17 L9 -17 L11 0 Z" fill="#B9653F"/>
      <path d="M-12 -17 H12" stroke="#9A4E2E" stroke-width="3" stroke-linecap="round"/>
      <path d="M0 -18 C-2 -30 -10 -34 -16 -32 C-12 -26 -6 -22 0 -18 Z M0 -18 C2 -32 10 -38 16 -36 C12 -28 6 -22 0 -18 Z M0 -18 C0 -28 2 -36 0 -42 C-3 -34 -2 -26 0 -18 Z" fill="#7E9A5E"/>
    </g>
  </g>`;
}

function police() {
  /* Misky z minulé objednávky schnou dnem vzhůru — každá trochu jiná */
  const miska = (x: number, s: number, barva: string) =>
    `<path d="M${f1(x - 24 * s)} 96 C${f1(x - 22 * s)} ${f1(96 - 18 * s)} ${f1(x - 12 * s)} ${f1(96 - 24 * s)} ${f1(x)} ${f1(96 - 24 * s)} C${f1(x + 12 * s)} ${f1(96 - 24 * s)} ${f1(x + 22 * s)} ${f1(96 - 18 * s)} ${f1(x + 24 * s)} 96 Z" fill="${barva}"/>` +
    `<rect x="${f1(x - 8 * s)}" y="${f1(96 - 28 * s)}" width="${f1(16 * s)}" height="${f1(5 * s)}" rx="${f1(1.5 * s)}" fill="${barva}"/>` +
    `<path d="M${f1(x - 18 * s)} ${f1(96 - 12 * s)} C${f1(x - 12 * s)} ${f1(96 - 20 * s)} ${f1(x - 4 * s)} ${f1(96 - 22 * s)} ${f1(x + 2 * s)} ${f1(96 - 22 * s)}" fill="none" stroke="#FFFFFF" stroke-width="1.6" opacity="0.35" stroke-linecap="round"/>`;
  return `
  <g class="mh1-police">
    <rect x="250" y="96" width="236" height="9" rx="1.5" fill="#9A7652"/>
    <rect x="250" y="104" width="236" height="3" fill="#6E5236" opacity="0.6"/>
    <path d="M276 107 L276 128 L296 107 Z M462 107 L462 128 L442 107 Z" fill="#7A5A3C"/>
    ${miska(292, 1, "#CDBBA5")}${miska(348, 1.12, "#C7B39C")}${miska(404, 0.9, "#D2C1AC")}
    <path d="M440 96 L444 70 L466 70 L470 96 Z" fill="#B9A286"/>
    <path d="M448 70 L446 50 M455 70 L458 46 M462 70 L468 54" stroke="#8A6A48" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="446" cy="49" r="3" fill="#C9B07A"/><circle cx="468" cy="53" r="2.6" fill="#8C949B"/>
  </g>`;
}

function poznamka() {
  return `
  <g class="mh1-poznamka" transform="rotate(-4 78 50)">
    <path d="M26 12 H130 V84 L124 80 L116 84 L108 79 L98 84 L88 80 L78 84 L68 79 L58 84 L48 80 L38 84 L32 79 L26 84 Z" fill="#FBF7EC" stroke="#D8C9A8" stroke-width="0.8"/>
    <circle cx="78" cy="18" r="4" fill="#C4432B"/><circle cx="77" cy="17" r="1.4" fill="#F0A08C"/>
    <text x="78" y="40" text-anchor="middle" font-size="18" fill="#2B2420" style="font-family:var(--f-ruka, Caveat, cursive)">6 misek</text>
    <text x="78" y="59" text-anchor="middle" font-size="16" fill="#2B2420" style="font-family:var(--f-ruka, Caveat, cursive)">po 500 g</text>
    <path d="M46 63 Q78 68 110 63" fill="none" stroke="#C4432B" stroke-width="1.3" stroke-linecap="round" opacity="0.8"/>
    <g fill="none" stroke="#8A7C70" stroke-width="1">
      <path d="M38 74 Q44 80 50 74 M55 74 Q61 80 67 74 M72 74 Q78 80 84 74 M89 74 Q95 80 101 74 M106 74 Q112 80 118 74"/>
      <path d="M37 74 H51 M54 74 H68 M71 74 H85 M88 74 H102 M105 74 H119"/>
    </g>
  </g>`;
}

function stul() {
  /* Měkké záhyby plátna */
  const zahyby = [
    "M30 318 C120 312 210 322 300 316",
    "M420 312 C520 318 600 308 700 316",
    "M60 446 C160 452 240 440 330 448",
    "M470 454 C560 446 640 456 760 448",
    "M600 330 C640 360 650 392 690 420",
  ];
  return `
  <g class="mh1-stul">
    <rect x="0" y="512" width="800" height="48" fill="#9C8468"/>
    <path d="M0 520 H800" stroke="#7E6A52" stroke-width="2" opacity="0.5"/>
    <rect x="58" y="506" width="30" height="60" fill="#5E5850"/>
    <rect x="712" y="506" width="30" height="60" fill="#55504A"/>
    <rect x="0" y="484" width="800" height="28" fill="url(#mh1-z-beton)"/>
    <path d="M0 511 H800" stroke="#6F675C" stroke-width="2" opacity="0.6"/>
    <path d="M0 298 H800 V476 H0 Z" fill="url(#mh1-z-platno)"/>
    <path d="M0 298 H800" stroke="#B8AA90" stroke-width="2"/>
    <rect x="0" y="292" width="800" height="7" fill="#7E6E58" opacity="0.18" filter="url(#mh1-z-mekce-2)"/>
    <g fill="none" stroke="#CDBFA3" stroke-width="2.2" stroke-linecap="round" opacity="0.75">${zahyby.map((d) => `<path d="${d}"/>`).join("")}</g>
    <path d="M0 472 C200 476 600 474 800 472 L800 488 C600 491 200 492 0 488 Z" fill="#E4D8C1"/>
    <path d="M0 479 C200 482 600 481 800 479" fill="none" stroke="#B8AA90" stroke-width="1" stroke-dasharray="5 4" opacity="0.8"/>
  </g>`;
}

function metr() {
  /* Krejčovský metr od levé stěny bloku — po centimetrech, čísla po pěti */
  let ryski = "";
  let cisla = "";
  for (let c = 0; c <= 46; c++) {
    const x = X0 + c * CM;
    const dlouha = c % 5 === 0;
    ryski += `M${f1(x)} 362 V${dlouha ? 371 : 366.5} `;
    if (c < 46) ryski += `M${f1(x + CM / 2)} 362 V364.4 `;
    if (dlouha) cisla += `<text x="${f1(x + 1.6)}" y="379" font-size="8.5" fill="#2B2420" style="font-family:var(--f-display, Georgia, serif)">${c}</text>`;
  }
  return `
  <g class="mh1-metr">
    <path d="M${X0 - 26} 360 L${X0 - 26} 382 L800 383 L800 361 Z" fill="#3A2C22" opacity="0.12" filter="url(#mh1-z-mekce-2)"/>
    <path d="M${X0 - 6} 360 H800 V381 H${X0 - 6} Z" fill="#F1D78C"/>
    <path d="M${X0 - 6} 360.6 H800" stroke="#FFF2C4" stroke-width="1.2"/>
    <rect x="${X0 - 15}" y="359" width="12" height="23" rx="1.5" fill="url(#mh1-z-chrom)"/>
    <path d="${ryski}" stroke="#2B2420" stroke-width="0.9"/>
    ${cisla}
    <text x="${X0 + 46.5 * CM + 3}" y="379" font-size="7" fill="#5C5047" style="font-family:var(--f-display, Georgia, serif)">cm</text>
  </g>`;
}

function podnos() {
  /* Šest míst tužkou na prkénku a čísla na jeho hraně */
  const mista = Array.from({ length: HROUD }, (_, i) => {
    const x = PODNOS.x + i * PODNOS.krok;
    return (
      `<ellipse cx="${x}" cy="${PODNOS.y + 26}" rx="24" ry="5.6" fill="none" stroke="#6E5236" stroke-width="1.1" stroke-dasharray="3 3" opacity="0.6"/>` +
      `<text x="${x}" y="${PODNOS.y + 46}" text-anchor="middle" font-size="12" fill="#EFD9B4" opacity="0.9" style="font-family:var(--f-ruka, Caveat, cursive)">${i + 1}</text>`
    );
  }).join("");
  return `
  <g class="mh1-podnos">
    <path d="M214 462 L226 470 H676 L690 462 Z" fill="#3A2C22" opacity="0.22" filter="url(#mh1-z-mekce-2)"/>
    <path d="M228 418 H676 L686 452 H218 Z" fill="url(#mh1-z-drevo)"/>
    <path d="M218 452 H686 V462 Q686 467 681 467 H223 Q218 467 218 462 Z" fill="#8A6544"/>
    <path d="M234 428 C380 425 520 431 670 427 M224 441 C400 438 560 444 682 440" fill="none" stroke="#A47C55" stroke-width="1" opacity="0.6"/>
    <path d="M228 418.8 H676" stroke="#E2C59E" stroke-width="1.2" opacity="0.8"/>
    <path d="M219 452.6 H685" stroke="#C89E72" stroke-width="1" opacity="0.7"/>
    ${mista}
  </g>`;
}

function pytel(predni: boolean) {
  const { x, y } = PYTEL;
  /* Přední okraj otvoru — kreslí se i do přední vrstvy, aby Hlínka mohla sedět v pytli */
  const lem = `<path d="M${x - 62} ${y - 2} C${x - 40} ${y + 14} ${x + 40} ${y + 14} ${x + 62} ${y - 2} L${x + 66} ${y + 12} C${x + 40} ${y + 30} ${x - 40} ${y + 30} ${x - 66} ${y + 12} Z" fill="url(#mh1-${predni ? "p" : "z"}-pytel-lem)" stroke="#8F6B3F" stroke-width="1"/>`;
  if (predni) return `<g class="mh1-pytel-lem">${lem}</g>`;
  return `
  <g class="mh1-pytel">
    <ellipse cx="${x + 2}" cy="556" rx="80" ry="10" fill="#3A281D" opacity="0.25" filter="url(#mh1-z-mekce)"/>
    <path d="M${x - 64} ${y + 6} C${x - 72} ${y + 60} ${x - 78} ${y + 110} ${x - 70} 572 L${x + 74} 572 C${x + 80} ${y + 110} ${x + 72} ${y + 60} ${x + 64} ${y + 6} Z" fill="url(#mh1-z-pytel)"/>
    <path d="M${x - 44} ${y + 40} C${x - 50} ${y + 80} ${x - 50} ${y + 110} ${x - 46} 560 M${x + 50} ${y + 36} C${x + 56} ${y + 80} ${x + 54} ${y + 120} ${x + 50} 560" fill="none" stroke="#8F6B3F" stroke-width="1.6" opacity="0.45"/>
    <ellipse cx="${x}" cy="${y}" rx="60" ry="12" fill="#3B2A1F"/>
    <path d="M${x - 46} ${y + 2} C${x - 30} ${y - 8} ${x + 26} ${y - 9} ${x + 44} ${y + 1} C${x + 20} ${y + 8} ${x - 24} ${y + 9} ${x - 46} ${y + 2} Z" fill="#8E6A54"/>
    <path d="M${x - 30} ${y - 2} C${x - 14} ${y - 6} ${x + 8} ${y - 6} ${x + 22} ${y - 3}" fill="none" stroke="#C49E80" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
    ${lem}
    <g transform="rotate(-3 ${x} ${y + 76})">
      <rect x="${x - 44}" y="${y + 46}" width="88" height="62" rx="3" fill="#F3EAD6" opacity="0.94"/>
      <text x="${x}" y="${y + 72}" text-anchor="middle" font-size="21" font-weight="600" fill="#2B2420" style="font-family:var(--f-display, Georgia, serif)">Hlína</text>
      <path d="M${x - 30} ${y + 80} H${x + 30}" stroke="#C4432B" stroke-width="1.4"/>
      <text x="${x}" y="${y + 98}" text-anchor="middle" font-size="13" fill="#5C5047" letter-spacing="1" style="font-family:var(--f-display, Georgia, serif)">10 kg</text>
    </g>
  </g>`;
}

/** Praporek na jehle zapíchnutý do pravého konce: kolik váží celý blok */
function praporek(b: Blok) {
  const xc = b.delka - 2.6;
  const x = X0 + xc * CM;
  const y = ZAKLAD - vyska(b, xc) * CM + 8;
  const vaha = String(b.hmotnost).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `
    <g class="mh1-praporek">
      <path d="M${f1(x)} ${f1(y)} L${f1(x - 6)} ${f1(y - 66)}" stroke="#8C949B" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M${f1(x - 6)} ${f1(y - 66)} L${f1(x - 7.2)} ${f1(y - 74)}" stroke="#B08660" stroke-width="4" stroke-linecap="round"/>
      <g transform="rotate(-4 ${f1(x - 6)} ${f1(y - 60)})">
        <path d="M${f1(x - 5)} ${f1(y - 70)} H${f1(x + 54)} L${f1(x + 48)} ${f1(y - 58)} L${f1(x + 54)} ${f1(y - 46)} H${f1(x - 5)} Z" fill="#FBF7EC" stroke="#C9B48A" stroke-width="0.8"/>
        <text x="${f1(x + 22)}" y="${f1(y - 53)}" text-anchor="middle" font-size="15" fill="#2B2420" style="font-family:var(--f-ruka, Caveat, cursive)">${vaha} g</text>
      </g>
    </g>`;
}

/** Celý blok mezi od a po i s praporkem — obsah <g class="mh1-blok"> */
export function blokSvg(b: Blok, od = 0) {
  return kusBloku(b, od, b.delka, { id: "mh1-blok", defs: "mh1-z" }) + praporek(b);
}

/** Sluneční paprsek z okna — přes blok, ať se ví, odkud je světlo */
const paprsek = () =>
  `<path class="mh1-paprsek" d="M556 24 L556 206 L740 206 L609 352 L261 352 Z" fill="url(#mh1-z-paprsek)" opacity="0.4" filter="url(#mh1-z-rozptyl)"/>`;

/* ——— Vrstvy ——— */

export function zadni(b: Blok = novyBlok(VYCHOZI_SEME)) {
  return `<svg class="mu-kresba mh1-zadni" viewBox="0 0 ${SIRKA} ${VYSKA}" aria-hidden="true" focusable="false">
  <defs>
    ${defsKusu("mh1-z")}
    <filter id="mh1-z-rozptyl" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="14"/></filter>
    <linearGradient id="mh1-z-zed" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F2E7D0"/><stop offset="1" stop-color="#DECCAA"/></linearGradient>
    <radialGradient id="mh1-z-zare" cx="0.82" cy="0.18" r="0.7"><stop offset="0" stop-color="#FFF6DE" stop-opacity="0.85"/><stop offset="1" stop-color="#FFF6DE" stop-opacity="0"/></radialGradient>
    <linearGradient id="mh1-z-nebe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C6DBE8"/><stop offset="0.7" stop-color="#F4E6CC"/><stop offset="1" stop-color="#F8D9B6"/></linearGradient>
    <linearGradient id="mh1-z-paprsek" x1="0.8" y1="0" x2="0.3" y2="1"><stop offset="0" stop-color="#FFF6DA" stop-opacity="0.95"/><stop offset="1" stop-color="#FFF6DA" stop-opacity="0"/></linearGradient>
    <linearGradient id="mh1-z-platno" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#DCD0B8"/><stop offset="0.35" stop-color="#E9DFCA"/><stop offset="1" stop-color="#EFE6D3"/></linearGradient>
    <linearGradient id="mh1-z-beton" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B2AA9C"/><stop offset="1" stop-color="#958C7F"/></linearGradient>
    <linearGradient id="mh1-z-drevo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C79F74"/><stop offset="1" stop-color="#B08660"/></linearGradient>
    <linearGradient id="mh1-z-smalt" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5F8E85"/><stop offset="0.3" stop-color="#93BDB2"/><stop offset="0.55" stop-color="#7DAAA0"/><stop offset="1" stop-color="#4E7A71"/></linearGradient>
    <linearGradient id="mh1-z-chrom" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E9EDEF"/><stop offset="0.45" stop-color="#A9B1B6"/><stop offset="0.7" stop-color="#D5DADD"/><stop offset="1" stop-color="#7E868C"/></linearGradient>
    <linearGradient id="mh1-z-miska" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8C949B"/><stop offset="0.35" stop-color="#E8ECEE"/><stop offset="0.6" stop-color="#C2C9CD"/><stop offset="1" stop-color="#7E868C"/></linearGradient>
    <radialGradient id="mh1-z-cifernik" cx="0.42" cy="0.36" r="0.75"><stop offset="0" stop-color="#FFFBF0"/><stop offset="0.75" stop-color="#F6ECD5"/><stop offset="1" stop-color="#E4D5B6"/></radialGradient>
    <linearGradient id="mh1-z-pytel" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#A7814F"/><stop offset="0.35" stop-color="#CDAA76"/><stop offset="0.7" stop-color="#BE9A66"/><stop offset="1" stop-color="#93703F"/></linearGradient>
    <linearGradient id="mh1-z-pytel-lem" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D9BC8C"/><stop offset="1" stop-color="#B8925E"/></linearGradient>
  </defs>
  <rect width="${SIRKA}" height="${VYSKA}" fill="url(#mh1-z-zed)"/>
  <rect width="${SIRKA}" height="300" fill="url(#mh1-z-zare)"/>
  ${okno()}
  ${police()}
  ${poznamka()}
  ${stul()}
  ${metr()}
  <g class="mh1-blok">${blokSvg(b)}</g>
  ${paprsek()}
  ${vaha()}
  ${podnos()}
  ${pytel(false)}
</svg>`;
}

/** Drát se dvěma dřevěnými kolíky — kreslí se svisle, posouvá ho hra */
function drat(x: number, b: Blok) {
  const { nahore, dole } = DRAT;
  const kolik = (y: number) =>
    `<rect x="-18" y="${y - 5.5}" width="36" height="11" rx="5.5" fill="url(#mh1-p-kolik)" stroke="#6E4E30" stroke-width="0.8"/>` +
    `<path d="M-13 ${y - 2.6} H13" stroke="#E6C49A" stroke-width="1.4" stroke-linecap="round" opacity="0.7"/>` +
    `<circle cx="0" cy="${y}" r="2.2" fill="#5E656B"/>`;
  const xc = (x - X0) / CM;
  const hrbet = ZAKLAD - vyska(b, Math.max(0, Math.min(b.delka, xc))) * CM;
  return `
  <g class="mh1-drat" transform="translate(${f1(x)} 0)">
    <path class="mh1-drat-rovina" d="M0 ${f1(hrbet + 3)} V${ZAKLAD - 2}" stroke="#FFF4E2" stroke-width="5" stroke-linecap="round" opacity="0.28"/>
    <path class="mh1-drat-rez" d="M0 ${nahore} V${dole}" stroke="#FFF8EC" stroke-width="7" stroke-linecap="round" opacity="0"/>
    <path class="mh1-drat-cara" d="M0 ${nahore + 4} V${dole - 4}" stroke="#4E555A" stroke-width="2.6"/>
    <path class="mh1-drat-lesk" d="M0 ${nahore + 4} V${dole - 4}" stroke="#E4E9EC" stroke-width="1.2"/>
    ${kolik(nahore)}
    ${kolik(dole)}
    <g class="mh1-delka" transform="translate(0 ${nahore - 24})">
      <rect x="-33" y="-14" width="66" height="26" rx="13" fill="#2B2420" opacity="0.88"/>
      <text class="mh1-delka-text" x="0" y="5.6" text-anchor="middle" font-size="18" fill="#F7F1E3" style="font-family:var(--f-ruka, Caveat, cursive)">3,0 cm</text>
    </g>
  </g>`;
}

export function predni(b: Blok = novyBlok(VYCHOZI_SEME)) {
  return `<svg class="mu-kresba mh1-predni" viewBox="0 0 ${SIRKA} ${VYSKA}" aria-hidden="true" focusable="false">
  <defs>
    ${defsKusu("mh1-p")}
    <linearGradient id="mh1-p-kolik" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D2A770"/><stop offset="1" stop-color="#9C7246"/></linearGradient>
    <radialGradient id="mh1-p-koule" cx="0.62" cy="0.3" r="0.85"><stop offset="0" stop-color="#D6B497"/><stop offset="0.5" stop-color="#A27E66"/><stop offset="1" stop-color="#5E4434"/></radialGradient>
    <linearGradient id="mh1-p-pytel-lem" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D9BC8C"/><stop offset="1" stop-color="#B8925E"/></linearGradient>
  </defs>
  <g class="mh1-cedulky"></g>
  <g class="mh1-kusy"></g>
  ${pytel(true)}
  ${drat(X0 + Math.min(3, b.delka / 2) * CM, b)}
  <g class="mh1-drobky"></g>
  <g class="mh1-vysledek" opacity="0">
    <g class="mh1-vysledek-telo">
      <rect class="mh1-vysledek-papir" x="-66" y="-23" width="132" height="40" rx="7" fill="#FBF7EC" stroke="#C9B48A" stroke-width="1"/>
      <text class="mh1-vysledek-text" x="0" y="7" text-anchor="middle" font-size="30" fill="#2B2420" style="font-family:var(--f-ruka, Caveat, cursive)"></text>
    </g>
  </g>
</svg>`;
}

/** Probuzená Hlínka: otevřené oči, zamračení a vztekací křížek — přes kresbu postavičky (180 × 180) */
export function hlinkaVzhuru() {
  /* char-breathe: dýchá stejně jako kresba pod ní (postavicky.css), ať oči nesjedou */
  return `<svg class="mh1-hlinka-vzhuru char-breathe" viewBox="0 0 180 180" aria-hidden="true" focusable="false">
    <g filter="url(#mh1-p-mekce-2)" fill="#C87E4E" opacity="0.55"><ellipse cx="66" cy="106" rx="8" ry="5"/><ellipse cx="114" cy="106" rx="8" ry="5"/></g>
    <ellipse cx="78" cy="95" rx="6.2" ry="7" fill="#F4EBDD"/><ellipse cx="102" cy="95" rx="6.2" ry="7" fill="#F4EBDD"/>
    <circle cx="79.5" cy="96.5" r="3.2" fill="#2B2420"/><circle cx="100.5" cy="96.5" r="3.2" fill="#2B2420"/>
    <circle cx="80.6" cy="95.2" r="1" fill="#FFFFFF"/><circle cx="101.6" cy="95.2" r="1" fill="#FFFFFF"/>
    <path d="M69 84 L86 88 M111 84 L94 88" stroke="#2B2420" stroke-width="2.6" stroke-linecap="round"/>
    <ellipse cx="90" cy="112" rx="4" ry="3.2" fill="#3A2C22"/>
    <g stroke="#C4432B" stroke-width="3" stroke-linecap="round" fill="none" transform="translate(130 58)">
      <path d="M-9 -3 Q-4 -4 -3 -9 M3 -9 Q4 -4 9 -3 M9 3 Q4 4 3 9 M-3 9 Q-4 4 -9 3"/>
    </g>
  </svg>`;
}

/** Hlínka v obalu: střed těla ve scéně a náklon — styl obalu v procentech scény */
export function hlinkaStyl(cx: number, cy: number, uhel = 0) {
  const w = HLINKA.sirka;
  const left = ((cx - w / 2) / SIRKA) * 100;
  const top = ((cy - w * HLINKA.stred) / VYSKA) * 100;
  return `left:${left.toFixed(3)}%;top:${top.toFixed(3)}%;width:${((w / SIRKA) * 100).toFixed(3)}%;transform:rotate(${uhel.toFixed(2)}deg)`;
}

/** Kde Hlínka spí ve statické kresbě — střed těla */
export function hlinkaVychozi(b: Blok = novyBlok(VYCHOZI_SEME)) {
  const xc = b.delka * 0.6;
  return { x: X0 + xc * CM, y: ZAKLAD - vyska(b, xc) * CM - HLINKA.nad + 3 };
}

/** Řada pod scénou: drát po kouscích a řez — hlavně pro prst a klávesnici */
export function ovladani() {
  return `<div class="mu-ovladani mh1-ovladani">
  <button type="button" class="tlacitko tlacitko-maly tlacitko-obrys mh1-posun" data-posun="-1" aria-label="Drát o 2 milimetry doleva"><span aria-hidden="true">◂ 2 mm</span></button>
  <button type="button" class="tlacitko tlacitko-maly mh1-krojit">Krojit</button>
  <button type="button" class="tlacitko tlacitko-maly tlacitko-obrys mh1-posun" data-posun="1" aria-label="Drát o 2 milimetry doprava"><span aria-hidden="true">2 mm ▸</span></button>
</div>`;
}

export const OKNO_POPIS =
  "Blok hlíny na stole, vlevo váha. Myší nebo prstem namiř drát, kliknutím nebo puštěním prstu krojíš. Šipky posouvají drát o centimetr, se Shiftem o 2 milimetry, mezerník nebo Enter krojí.";

/**
 * Celá scéna jako HTML — pro testy a náhledy. Hrouda.astro skládá totéž,
 * jen místo `hlinka` vloží skutečnou kresbu postavičky.
 */
export function scena(hlinka = "") {
  const b = novyBlok(VYCHOZI_SEME);
  const h = hlinkaVychozi(b);
  return (
    `<div class="mu-okno mh1-okno" tabindex="0" role="application" aria-label="${OKNO_POPIS}">` +
    zadni(b) +
    `<div class="mh1-hlinka" style="${hlinkaStyl(h.x, h.y)}"><div class="mh1-hlinka-telo">${hlinka}${hlinkaVzhuru()}</div></div>` +
    predni(b) +
    `<p class="mh1-hlaseni" aria-live="polite"></p>` +
    `</div>` +
    ovladani()
  );
}
