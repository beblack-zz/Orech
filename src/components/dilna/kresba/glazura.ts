/**
 * Glazura — dvě kresby kapitoly 五:
 *
 *   vzornikSvg   deska z překližky na zdi a na ní šest zkušebních střepů
 *                dvakrát: nahoře v syrové glazuře (křída), dole tytéž po
 *                ostrém výpalu. Sloupec je tentýž střep — dole jen o kousek
 *                menší, protože se při výpalu smrštil (jako SMRST nádob).
 *   namaceniSvg  kbelík se syrovou glazurou, nad ním hrnek v glazovacích
 *                kleštích, vedle otírání dna houbičkou.
 *
 * Světlo zleva shora, stíny doprava dolů. Všechna id začínají předponou `p`.
 */
import { P, HLINA, glazuraPo, glazuraPred, jeMatna, smichej, svisly, mekkyStin, f, cesta, hladce, nahoda } from "./zaklad";
import type { Trojice, Bod } from "./zaklad";
import { nadoba, SMRST, ELIPSA, OBRYSY } from "./nadoba";

/** Glazury dílny v pořadí, v jakém je web vypisuje (kurzy2.ts) */
const NAZVY = ["celadon", "tenmoku", "shino", "matná bílá", "popelová šedá", "železitá hnědá"];

/** Kde se glazura ztenčí, prosvítá střep — stejné barvy jako hrana nádob v nadoba.ts */
const ZLOM: Record<string, string> = {
  celadon: "#E3EEDD",
  tenmoku: "#9A5A2E",
  shino: "#DC9864",
  "matná bílá": "#FBF8F2",
  "popelová šedá": "#C9BCA8",
  "železitá hnědá": "#D7A066",
};

/** Šířka názvu v Caveatu v em (změřeno z písma webu) — podle ní se ustřihne štítek */
const CAVEAT: Record<string, number> = {
  celadon: 2.48,
  tenmoku: 2.75,
  shino: 1.8,
  matná: 2.22,
  bílá: 1.23,
  popelová: 2.72,
  šedá: 1.5,
  železitá: 2.4,
  hnědá: 2.07,
};
const sirkaNazvu = (s: string, px: number) => (CAVEAT[s] ?? s.length * 0.31) * px;

/** Vypálený střep je menší než syrový — stejný poměr jako u nádob */
const SMRSTENI = SMRST.hotovy / SMRST.syrova;

/** Tloušťka destičky — vidíme horní a levou hranu (stejně jako u desky) */
const TL: Bod = [-3, -3.8];

/* ——— Zkušební střep ——— */

interface Strep {
  W: number;
  H: number;
  /** Obrys destičky */
  obrys: string;
  /** Obrys i s tloušťkou (líc posunutý o TL) a boční plocha s glazurou */
  bok: string;
  bokGlazura: string;
  /** Kde je glazura: pod hranou namáčení */
  glazura: string;
  /** Hrana namáčení zleva doprava */
  hrana: string;
  /** Nejvyšší bod hrany */
  vrch: number;
  /** Spodek namočený podruhé — dvojitá vrstva, po výpalu sytější */
  glazura2: string;
  hrana2: string;
  /** Vyrytá vlnka */
  ryha: string;
  /** Razítko — kvítek */
  razitko: string;
  rz: Bod;
  dira: Bod;
}

/** Kvítek z pěti okvětních lístků (kruhů) — razítko na střepu */
function kvet(cx: number, cy: number, r: number) {
  let d = "";
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    const x = cx + Math.cos(a) * r * 0.55;
    const y = cy + Math.sin(a) * r * 0.55;
    const rr = r * 0.45;
    d += `M${f(x - rr)} ${f(y)} a${f(rr)} ${f(rr)} 0 1 0 ${f(rr * 2)} 0 a${f(rr)} ${f(rr)} 0 1 0 ${f(-rr * 2)} 0 `;
  }
  return d.trim();
}

/** Tvar střepu v jeho vlastních souřadnicích (syrová velikost). Sloupec = tentýž střep. */
function tvarStrepu(i: number): Strep {
  const rnd = nahoda(4100 + i * 53);
  const W = 108;
  const H = 174 + (rnd() - 0.5) * 5;
  /* Ručně řezané rohy — každý trochu jiný */
  const [a, b, c, d] = [0, 0, 0, 0].map(() => 5.5 + rnd() * 3);
  const obrys =
    `M${f(a)} 0 H${f(W - b)} A${f(b)} ${f(b)} 0 0 1 ${f(W)} ${f(b)} V${f(H - c)} A${f(c)} ${f(c)} 0 0 1 ${f(W - c)} ${f(H)}` +
    ` H${f(d)} A${f(d)} ${f(d)} 0 0 1 0 ${f(H - d)} V${f(a)} A${f(a)} ${f(a)} 0 0 1 ${f(a)} 0 Z`;
  const spodek = ` V${f(H - c)} A${f(c)} ${f(c)} 0 0 1 ${f(W - c)} ${f(H)} H${f(d)} A${f(d)} ${f(d)} 0 0 1 0 ${f(H - d)} Z`;
  /* Hrana namáčení: kus šel do kbelíku trochu nakřivo a glazura se zvlnila */
  const hranaNamaceni = (zaklad: number, naklon: number, vlna: number): Bod[] => {
    const faze = rnd() * 6;
    const body: Bod[] = [];
    for (let k = 0; k <= 6; k++) {
      const t = k / 6;
      body.push([W * t, zaklad + naklon * (t - 0.5) + Math.sin(t * 7 + faze) * vlna + (rnd() - 0.5) * vlna * 0.8]);
    }
    return body;
  };
  const body = hranaNamaceni(H * (0.262 + (rnd() - 0.5) * 0.05), (rnd() - 0.5) * 10, 1.6);
  /* Podruhé jen spodek — ať je vidět, co udělá dvojitá vrstva */
  const body2 = hranaNamaceni(H * (0.64 + (rnd() - 0.5) * 0.04), (rnd() - 0.5) * 8, 1.2);
  const hrana = cesta(body);
  const hrana2 = cesta(body2);
  const glazura = hrana + spodek;
  const glazura2 = hrana2 + spodek;
  /* Vyrytá vlnka v jednoduché vrstvě, razítko v dvojité */
  const yR = H * 0.45;
  const ryhaBody: Bod[] = [];
  for (let k = 0; k <= 10; k++) {
    const t = k / 10;
    ryhaBody.push([17 + (W - 34) * t, yR + Math.sin(t * Math.PI * 2 + 0.4) * 3.6]);
  }
  const rz: Bod = [W / 2, H * 0.815];

  /*
   * Tloušťka: líc vytažený o TL nahoru doleva. Obrys tělesa = zadní hrana
   * nahoře a vlevo, přední vpravo a dole, v rozích tečny ve směru kolmém na TL.
   */
  const [vx, vy] = TL;
  const dl = Math.hypot(vx, vy);
  const [nx, ny] = [-vy / dl, vx / dl];
  const t1: Bod = [W - b + b * nx, b + b * ny];
  const t2: Bod = [d - d * nx, H - d - d * ny];
  const bok =
    `M${f(t1[0])} ${f(t1[1])} A${f(b)} ${f(b)} 0 0 1 ${f(W)} ${f(b)} V${f(H - c)} A${f(c)} ${f(c)} 0 0 1 ${f(W - c)} ${f(H)} H${f(d)}` +
    ` A${f(d)} ${f(d)} 0 0 1 ${f(t2[0])} ${f(t2[1])} L${f(t2[0] + vx)} ${f(t2[1] + vy)} A${f(d)} ${f(d)} 0 0 1 ${f(vx)} ${f(H - d + vy)}` +
    ` V${f(a + vy)} A${f(a)} ${f(a)} 0 0 1 ${f(a + vx)} ${f(vy)} H${f(W - b + vx)} A${f(b)} ${f(b)} 0 0 1 ${f(t1[0] + vx)} ${f(t1[1] + vy)} Z`;
  const y0 = body[0][1];
  const bokGlazura =
    `M0 ${f(y0)} L${f(vx)} ${f(y0 + vy)} V${f(H - d + vy)} A${f(d)} ${f(d)} 0 0 0 ${f(t2[0] + vx)} ${f(t2[1] + vy)}` +
    ` L${f(t2[0])} ${f(t2[1])} A${f(d)} ${f(d)} 0 0 0 0 ${f(H - d)} Z`;

  return {
    W,
    H,
    obrys,
    bok,
    bokGlazura,
    glazura,
    hrana,
    vrch: Math.min(...body.map((q) => q[1])),
    glazura2,
    hrana2,
    ryha: cesta(ryhaBody),
    razitko: kvet(rz[0], rz[1], 10),
    rz,
    dira: [W / 2, 17],
  };
}

/** Vypálená glazura odshora dolů: u hrany tenká (prosvítá střep), dole tlustá a sytá */
function zastavkyPo(n: string): [number, string][] {
  const g = glazuraPo(n);
  const z = ZLOM[n] ?? g.svetlo;
  switch (n) {
    case "tenmoku":
      return [[0, z], [0.05, smichej(z, g.svetlo, 0.6)], [0.12, smichej(g.svetlo, g.stred, 0.6)], [0.25, g.stred], [0.82, smichej(g.stred, g.stin, 0.6)], [1, g.stin]];
    case "celadon":
      return [[0, smichej(g.svetlo, z, 0.5)], [0.16, g.svetlo], [0.55, g.stred], [1, smichej(g.stred, g.stin, 0.62)]];
    case "shino":
      return [[0, smichej(g.svetlo, z, 0.8)], [0.12, smichej(g.svetlo, z, 0.35)], [0.32, g.svetlo], [1, g.stred]];
    case "železitá hnědá":
      return [[0, smichej(g.svetlo, z, 0.6)], [0.14, g.svetlo], [0.5, g.stred], [1, smichej(g.stred, g.stin, 0.6)]];
    case "matná bílá":
      return [[0, g.svetlo], [0.55, smichej(g.svetlo, g.stred, 0.6)], [1, smichej(g.stred, g.stin, 0.12)]];
    case "popelová šedá":
      return [[0, smichej(g.svetlo, z, 0.45)], [0.3, smichej(g.svetlo, g.stred, 0.4)], [1, smichej(g.stred, g.stin, 0.22)]];
    default:
      return [[0, g.svetlo], [0.5, g.stred], [1, g.stin]];
  }
}

const prechod = (id: string, stops: [number, string][], x2 = 0, y2 = 1) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o, c]) => `<stop offset="${f(o * 100)}%" stop-color="${c}"/>`).join("")}</linearGradient>`;

/** Díra s hřebíkem, na kterém střep visí */
function dira(p: string, s: Strep, stena: string) {
  const [x, y] = s.dira;
  const r = 6.8;
  return (
    `<circle cx="${f(x)}" cy="${f(y)}" r="${r}" fill="${stena}"/>` +
    `<circle cx="${f(x - 1.3)}" cy="${f(y - 1.7)}" r="${f(r - 1.6)}" fill="url(#${p}-dr)"/>` +
    `<ellipse cx="${f(x + 1.4)}" cy="${f(y - 2.4)}" rx="4" ry="3.4" fill="${P.inkoust}" opacity="0.35"/>` +
    `<circle cx="${f(x)}" cy="${f(y - 3.6)}" r="3.6" fill="url(#${p}-hr)"/>`
  );
}

/** Destička jako plát: hrana nahoře a vlevo (hlína, dole glazura) */
function plat(p: string, s: Strep, hlina: string, hranaGlazury: string) {
  return (
    `<path d="${s.bok}" fill="${hlina}"/>` +
    `<path d="${s.bokGlazura}" fill="${hranaGlazury}"/>` +
    /* Horní hrana chytá nejvíc světla, levá dolů ubývá */
    `<path d="${s.bok}" fill="url(#${p}-bok)"/>`
  );
}

/** Zkosení líce: houbičkou zaoblená hrana — vpravo a dole se odvrací od okna */
const zkoseni = (p: string, i: number, s: Strep, sila = 1) =>
  `<g clip-path="url(#${p}-tc${i})">` +
  `<path d="${s.obrys}" stroke="${P.inkoust}" stroke-width="3" fill="none" opacity="${f(0.16 * sila)}" transform="translate(-0.9 -1.1)"/>` +
  `<path d="${s.obrys}" stroke="#FFFFFF" stroke-width="1.6" fill="none" opacity="${f(0.28 * sila)}" transform="translate(0.5 0.6)"/>` +
  `</g>`;

/** Střep v syrové glazuře: bledý, křídový, matný — nic z barev pece */
function strepSyrovy(p: string, i: number, n: string, s: Strep) {
  const g = glazuraPred(n);
  const h = HLINA.prezah;
  const o: string[] = [];
  o.push(plat(p, s, h.svetlo, smichej(g.svetlo, "#FFFFFF", 0.25)));
  o.push(`<path d="${s.obrys}" fill="url(#${p}-hp)"/>`);
  o.push(`<path d="${s.glazura}" fill="url(#${p}-gs${i})"/>`);
  o.push(`<g clip-path="url(#${p}-gc${i})">`);
  /* Syrová vrstva je tlustá — její horní hrana chytá světlo, pod ní stín vrstvy */
  o.push(`<path d="${s.hrana}" stroke="#FFFFFF" stroke-width="2.6" fill="none" opacity="0.85"/>`);
  o.push(`<path d="${s.hrana}" stroke="${g.stin}" stroke-width="8" fill="none" opacity="0.07" transform="translate(0 5)"/>`);
  /* Druhé namočení: ještě tlustší křída, stejně bledá */
  o.push(`<path d="${s.glazura2}" fill="#FFFFFF" opacity="0.13"/>`);
  o.push(`<path d="${s.hrana2}" stroke="#FFFFFF" stroke-width="1.6" fill="none" opacity="0.5"/>`);
  o.push(`<path d="${s.hrana2}" stroke="${g.stin}" stroke-width="1" fill="none" opacity="0.14" transform="translate(0 -1.3)"/>`);
  /* Vlnka a razítko jsou pod křídou jen tušit */
  o.push(`<path d="${s.ryha}" stroke="${g.stin}" stroke-width="3.4" fill="none" stroke-linecap="round" opacity="0.3"/>`);
  o.push(`<path d="${s.ryha}" stroke="#FFFFFF" stroke-width="1.3" fill="none" stroke-linecap="round" opacity="0.6" transform="translate(0.5 2)"/>`);
  o.push(`<path d="${s.razitko}" fill="${g.stin}" opacity="0.26"/>`);
  o.push(`<path d="${s.razitko}" fill="${smichej(g.stred, "#FFFFFF", 0.2)}" transform="translate(0.7 1.1)"/>`);
  o.push(`<path d="${s.razitko}" fill="${g.stin}" opacity="0.1" transform="translate(0.7 1.1)"/>`);
  o.push(`</g>`);
  o.push(`<path d="${s.obrys}" fill="url(#${p}-sv)"/>`);
  o.push(zkoseni(p, i, s, 0.9));
  o.push(dira(p, s, h.stin));
  return o.join("");
}

/** Jak moc je na hranách vidět střep pod glazurou */
const PROSVIT: Record<string, number> = { celadon: 0.75, tenmoku: 1, shino: 0.8, "matná bílá": 0.7, "popelová šedá": 0.6, "železitá hnědá": 0.85 };

/** Barva tenké glazury na hraně střepu — matná bílá tam trochu zteplá od hlíny */
const prosvit = (n: string) => (n === "matná bílá" ? smichej(ZLOM[n], HLINA.palena.stred, 0.32) : (ZLOM[n] ?? glazuraPo(n).svetlo));

/** Co udělá dvojitá vrstva po výpalu: celadon a hnědé ztmavnou, shino a bílá zbělají */
const DVOJITA: Record<string, [string, number]> = {
  celadon: ["#3F6150", 0.26],
  tenmoku: ["#0B0706", 0.5],
  shino: ["#FFFFFF", 0.45],
  "matná bílá": ["#FFFFFF", 0.5],
  "popelová šedá": ["#55534C", 0.18],
  "železitá hnědá": ["#3A1C0E", 0.3],
};

/** Střep po výpalu: sklo, které se na hranách ztenčí a v rýze slije */
function strepVypaleny(p: string, i: number, n: string, s: Strep) {
  const g = glazuraPo(n);
  const z = prosvit(n);
  const matna = jeMatna(n);
  const k = PROSVIT[n] ?? 0.7;
  const [dB, dO] = DVOJITA[n] ?? [g.stin, 0.25];
  const h = HLINA.palena;
  const o: string[] = [];
  o.push(plat(p, s, h.svetlo, z));
  o.push(`<path d="${s.obrys}" fill="url(#${p}-hv)"/>`);
  o.push(`<path d="${s.glazura}" fill="url(#${p}-gp${i})"/>`);
  o.push(`<g clip-path="url(#${p}-gc${i})">`);
  /* Dvojitá vrstva dole a její hrana — tam, kde druhá vrstva končí, se sklo ztenčí */
  o.push(`<path d="${s.glazura2}" fill="${dB}" opacity="${dO}"/>`);
  o.push(`<path d="${s.hrana2}" stroke="${z}" stroke-width="5" fill="none" opacity="${f(0.22 * k)}" transform="translate(0 -1)"/>`);
  o.push(`<path d="${s.hrana2}" stroke="${z}" stroke-width="1.8" fill="none" opacity="${f(0.45 * k)}" transform="translate(0 -0.6)"/>`);
  /* Na hranách destičky a u hrany namáčení je glazura tenká — prosvítá střep */
  o.push(`<path d="${s.obrys}" stroke="${z}" stroke-width="6" fill="none" opacity="${f(0.28 * k)}"/>`);
  o.push(`<path d="${s.obrys}" stroke="${z}" stroke-width="2.4" fill="none" opacity="${f(0.5 * k)}"/>`);
  for (const [w, op] of [[14, 0.2], [7, 0.32], [2.6, 0.55]] as const) {
    o.push(`<path d="${s.hrana}" stroke="${z}" stroke-width="${w}" fill="none" opacity="${f(op * k)}"/>`);
  }
  /* Dole se glazura slila do válečku */
  if (!matna) o.push(`<rect x="0" y="${f(s.H - 12)}" width="${f(s.W)}" height="12" fill="url(#${p}-vl${i})"/>`);
  /* Vlnka: v rýze se glazura slije tmavší, na hřbetech se ztenčí */
  const lou = smichej(g.stin, "#140C08", n === "tenmoku" ? 0.5 : 0.12);
  o.push(`<path d="${s.ryha}" stroke="${z}" stroke-width="6" fill="none" stroke-linecap="round" opacity="${f((matna ? 0.35 : 0.5) * k)}"/>`);
  o.push(`<path d="${s.ryha}" stroke="${lou}" stroke-width="3.6" fill="none" stroke-linecap="round" opacity="${matna ? 0.4 : 0.85}"/>`);
  /* Razítko: kvítek plný tmavé glazury s tenkým světlým lemem */
  o.push(`<path d="${s.razitko}" fill="${z}" opacity="${f((matna ? 0.45 : 0.7) * k)}" transform="translate(-0.7 -0.9)"/>`);
  o.push(`<path d="${s.razitko}" fill="${lou}" opacity="${matna ? 0.38 : 0.85}"/>`);
  o.push(`</g>`);
  o.push(`<path d="${s.obrys}" fill="url(#${p}-sv)"/>`);
  o.push(zkoseni(p, i, s, matna ? 0.9 : 0.7));
  if (!matna) {
    /* Lesk: odraz vysokého okna svisle po levé části, ostré světlo na zaoblené hraně, jiskry v loužích */
    const t = s.vrch;
    o.push(
      `<g class="${p}-lesk" clip-path="url(#${p}-gc${i})">` +
        `<rect x="${f(s.W * 0.12)}" y="${f(t + 8)}" width="${f(s.W * 0.19)}" height="${f((s.H - t) * 0.62)}" rx="4" fill="url(#${p}-okno)"/>` +
        `<path d="M${f(s.W * 0.145)} ${f(t + 12)} V${f(t + 40)}" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" opacity="0.45"/>` +
        `<path d="M3.2 ${f(t + 10)} V${f(s.H - 22)}" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>` +
        `<path d="${s.ryha}" stroke="#FFFFFF" stroke-width="1.2" fill="none" stroke-linecap="round" stroke-dasharray="8 200" stroke-dashoffset="-5" opacity="0.8" transform="translate(-0.4 -1.1)"/>` +
        `<circle cx="${f(s.rz[0] - 2.6)}" cy="${f(s.rz[1] - 6.4)}" r="1.3" fill="#FFFFFF" opacity="0.85"/>` +
        `</g>`,
    );
  }
  o.push(dira(p, s, h.stin));
  return o.join("");
}

/** Plamínek pece — rumělka a zlato */
const plamen = (x: number, y: number, k: number) =>
  `<g transform="translate(${f(x)} ${f(y)}) scale(${k})">` +
  `<path d="M0 0 C-8.5 0 -12 -6.5 -10 -12.5 C-8.2 -17.6 -3.6 -19.6 -2.6 -28 C3 -23.6 10 -17.6 10.2 -9.6 C10.4 -3.6 6.6 0 0 0 Z" fill="${P.rumelka}"/>` +
  `<path d="M0.4 -1.8 C-4.4 -1.8 -6.4 -5.4 -5.2 -8.8 C-4.2 -11.6 -1.4 -12.8 -0.6 -17.2 C2.8 -14 5.8 -11 5.8 -7.2 C5.8 -3.8 3.8 -1.8 0.4 -1.8 Z" fill="${P.zlato}"/>` +
  `</g>`;

/**
 * Vzorník glazur: deska z překližky na dvou hřebících, nahoře šest
 * střepů v syrové glazuře, dole tytéž po výpalu, pod nimi štítky.
 */
export function vzornikSvg(p = "dgl"): string {
  const defs: string[] = [];
  const s: string[] = [];

  /* Deska: líc, nahoře a vlevo hrana s vrstvami překližky */
  const X0 = 30;
  const X1 = 970;
  const Y0 = 58;
  const Y1 = 572;
  const DX = -8;
  const DY = -10;

  defs.push(`<filter id="${p}-rs" x="-0.1" y="-0.1" width="1.2" height="1.2"><feGaussianBlur stdDeviation="7"/></filter>`);
  defs.push(`<filter id="${p}-rm" x="-0.1" y="-0.1" width="1.2" height="1.2"><feGaussianBlur stdDeviation="3.2"/></filter>`);
  defs.push(prechod(`${p}-lic`, [[0, "#EDD8B4"], [0.45, P.preklizka], [1, "#CDAC7E"]], 0.55, 1));
  defs.push(prechod(`${p}-hp`, [[0, HLINA.prezah.svetlo], [0.7, HLINA.prezah.stred], [1, smichej(HLINA.prezah.stred, HLINA.prezah.stin, 0.3)]], 0.4, 1));
  defs.push(prechod(`${p}-hv`, [[0, HLINA.palena.svetlo], [0.7, HLINA.palena.stred], [1, smichej(HLINA.palena.stred, HLINA.palena.stin, 0.3)]], 0.4, 1));
  /* Světlo z okna: zleva světleji, vpravo ubývá */
  defs.push(
    `<linearGradient id="${p}-sv" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.16"/><stop offset="0.35" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="0.7" stop-color="${P.inkoust}" stop-opacity="0"/><stop offset="1" stop-color="${P.inkoust}" stop-opacity="0.1"/></linearGradient>`,
  );
  defs.push(`<radialGradient id="${p}-dr" cx="0.3" cy="0.3" r="0.8"><stop offset="0" stop-color="#4A3826"/><stop offset="1" stop-color="${P.preklizkaStin}"/></radialGradient>`);
  /* Hrany destičky: nahoře světlo, vlevo dolů ubývá */
  defs.push(`<linearGradient id="${p}-bok" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.5"/><stop offset="0.12" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="1" stop-color="${P.inkoust}" stop-opacity="0.25"/></linearGradient>`);
  /* Odraz okna na lesklé glazuře: svislý pruh s měkkými kraji, dolů slábne */
  defs.push(
    `<linearGradient id="${p}-okno" x1="0" y1="0" x2="1" y2="0.18"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="0.3" stop-color="#FFFFFF" stop-opacity="0.26"/><stop offset="0.55" stop-color="#FFFFFF" stop-opacity="0.16"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>`,
  );
  defs.push(`<radialGradient id="${p}-hr" cx="0.36" cy="0.32" r="0.75"><stop offset="0" stop-color="${P.ocelSvetlo}"/><stop offset="0.55" stop-color="${P.ocel}"/><stop offset="1" stop-color="${P.ocelStin}"/></radialGradient>`);
  defs.push(`<radialGradient id="${p}-ms" cx="0.38" cy="0.34" r="0.7"><stop offset="0" stop-color="#F6DE96"/><stop offset="0.5" stop-color="${P.zlato}"/><stop offset="1" stop-color="#8F6A22"/></radialGradient>`);

  /* Stín desky na zdi */
  s.push(`<rect x="${X0 + DX + 12}" y="${Y0 + DY + 14}" width="${X1 - X0 - DX}" height="${Y1 - Y0 - DY}" rx="4" fill="${P.inkoust}" opacity="0.3" filter="url(#${p}-rs)"/>`);

  /* Hřebíky ve zdi a provázek k očkům na hraně desky */
  const oka: Bod[] = [
    [X0 + 84 + DX / 2, Y0 + DY / 2],
    [X1 - 84 + DX / 2, Y0 + DY / 2],
  ];
  const hreby: Bod[] = [
    [300, 18],
    [700, 18],
  ];
  const provazek = `M${f(oka[0][0])} ${f(oka[0][1] - 9)} L${hreby[0][0]} ${hreby[0][1] + 2.6} L${hreby[1][0]} ${hreby[1][1] + 2.6} L${f(oka[1][0])} ${f(oka[1][1] - 9)}`;
  s.push(`<path d="${provazek}" stroke="${P.inkoust}" stroke-width="2.6" fill="none" stroke-linejoin="round" opacity="0.13" transform="translate(4 5)"/>`);
  for (const [x, y] of hreby) s.push(`<ellipse cx="${x + 2.5}" cy="${y + 3}" rx="6.5" ry="5.5" fill="${P.inkoust}" opacity="0.18"/>`);

  /* Hrany desky s vrstvami */
  const vrstvy = 5;
  for (let k = 0; k < vrstvy; k++) {
    const a = k / vrstvy;
    const b = (k + 1) / vrstvy;
    const svetla = k % 2 === 0;
    s.push(
      `<path d="M${f(X0 + DX * a)} ${f(Y0 + DY * a)} H${f(X1 + DX * a)} L${f(X1 + DX * b)} ${f(Y0 + DY * b)} H${f(X0 + DX * b)} Z" fill="${svetla ? "#F1DEBB" : "#E0C49A"}"/>`,
    );
    s.push(
      `<path d="M${f(X0 + DX * a)} ${f(Y0 + DY * a)} V${f(Y1 + DY * a)} L${f(X0 + DX * b)} ${f(Y1 + DY * b)} V${f(Y0 + DY * b)} Z" fill="${svetla ? "#E3C99F" : "#CFAE80"}"/>`,
    );
  }
  for (let k = 1; k < vrstvy; k++) {
    const a = k / vrstvy;
    s.push(`<path d="M${f(X0 + DX * a)} ${f(Y1 + DY * a)} V${f(Y0 + DY * a)} H${f(X1 + DX * a)}" stroke="#A9865A" stroke-width="0.6" fill="none" opacity="0.5"/>`);
  }
  s.push(`<rect x="${X0}" y="${Y0}" width="${X1 - X0}" height="${Y1 - Y0}" fill="url(#${p}-lic)"/>`);
  /* Kresba dřeva — jen pár dlouhých vláken */
  const rd = nahoda(77);
  for (let k = 0; k < 7; k++) {
    const y = Y0 + 34 + k * 72 + rd() * 20;
    const body: Bod[] = [];
    for (let j = 0; j <= 6; j++) body.push([X0 + ((X1 - X0) * j) / 6, y + Math.sin(j * 1.3 + k) * 4 + rd() * 3]);
    s.push(`<path d="${cesta(body)}" stroke="${P.preklizkaStin}" stroke-width="1.3" fill="none" opacity="0.12"/>`);
  }
  /* Hrana líce chytá světlo */
  s.push(`<path d="M${X0} ${Y1} V${Y0} H${X1}" stroke="#FFF6E2" stroke-width="1.4" fill="none" opacity="0.7"/>`);

  /* Očka, provázek a hřebíky */
  for (const [x, y] of oka) s.push(`<ellipse cx="${f(x)}" cy="${f(y - 9)}" rx="5.4" ry="6.4" stroke="${P.ocelStin}" stroke-width="2.2" fill="none"/>`);
  s.push(`<path d="${provazek}" stroke="#9E8058" stroke-width="2.8" fill="none" stroke-linejoin="round"/>`);
  s.push(`<path d="${provazek}" stroke="#D2B98C" stroke-width="1" fill="none" stroke-linejoin="round" opacity="0.8" transform="translate(-0.4 -0.6)"/>`);
  for (const [x, y] of oka) {
    s.push(`<path d="M${f(x - 5.4)} ${f(y - 9)} A5.4 6.4 0 0 0 ${f(x + 5.4)} ${f(y - 9)}" stroke="${P.ocel}" stroke-width="2.2" fill="none"/>`);
    s.push(`<rect x="${f(x - 1.3)}" y="${f(y - 3)}" width="2.6" height="4" fill="${P.ocelStin}"/>`);
  }
  for (const [x, y] of hreby) s.push(`<circle cx="${x}" cy="${y}" r="5.6" fill="url(#${p}-hr)"/>`);

  /* Střepy */
  const roztec = 150;
  const stredy = NAZVY.map((_, i) => (X0 + X1) / 2 + (i - (NAZVY.length - 1) / 2) * roztec);
  const yS = 84;
  const yV = 312;
  const tvary = NAZVY.map((_, i) => tvarStrepu(i));
  const stiny: string[] = [];
  const strepy: string[] = [];
  const rv = nahoda(919);
  NAZVY.forEach((n, i) => {
    const t = tvary[i];
    const g = glazuraPred(n);
    const gp = glazuraPo(n);
    defs.push(`<clipPath id="${p}-gc${i}"><path d="${t.glazura}"/></clipPath>`);
    defs.push(`<clipPath id="${p}-tc${i}"><path d="${t.obrys}"/></clipPath>`);
    defs.push(prechod(`${p}-gs${i}`, [[0, smichej(g.svetlo, g.stred, 0.3)], [0.6, g.stred], [1, smichej(g.stred, g.stin, 0.38)]], 0.35, 1));
    defs.push(prechod(`${p}-gp${i}`, zastavkyPo(n)));
    defs.push(svisly(`${p}-vl${i}`, gp.stin, gp.stin, 0, n === "tenmoku" ? 0.7 : 0.45));
    const xs = stredy[i] - t.W / 2;
    const xv = stredy[i] - (t.W * SMRSTENI) / 2;
    /* Každý střep visí na jednom hřebíku, tak se trochu natočí */
    const [hx, hy] = [t.dira[0], t.dira[1] - 3.6];
    const uS = `rotate(${f((rv() - 0.5) * 2.6)} ${f(hx)} ${f(hy)})`;
    const uV = `rotate(${f((rv() - 0.5) * 2.6)} ${f(hx)} ${f(hy)})`;
    const k = SMRSTENI.toFixed(4);
    stiny.push(`<path d="${t.obrys}" transform="translate(${f(xs + 5)} ${f(yS + 7)}) ${uS}"/>`);
    stiny.push(`<path d="${t.obrys}" transform="translate(${f(xv + 5)} ${f(yV + 7)}) scale(${k}) ${uV}"/>`);
    strepy.push(`<g transform="translate(${f(xs)} ${yS}) ${uS}"><g class="${p}-strep">${strepSyrovy(p, i, n, t)}</g></g>`);
    strepy.push(`<g transform="translate(${f(xv)} ${yV}) scale(${k}) ${uV}"><g class="${p}-strep">${strepVypaleny(p, i, n, t)}</g></g>`);
  });

  /*
   * Štítky pod vypálenými střepy. Dvouslovné názvy na dva řádky — štítek je
   * pak úzký a vejde se, i kdyby se místo Caveatu vzalo širší písmo.
   */
  const yT = 489;
  const stitky: string[] = [];
  const rs = nahoda(301);
  const pis = 26;
  const radek = 24;
  NAZVY.forEach((n, i) => {
    const radky = n.split(" ");
    const w = Math.max(...radky.map((r) => sirkaNazvu(r, pis))) + 24;
    const h = 40 + (radky.length - 1) * radek;
    const x = stredy[i];
    const uhel = (rs() - 0.5) * 5;
    const otoc = `rotate(${f(uhel)} ${f(x)} ${yT + 6})`;
    stiny.push(`<rect x="${f(x - w / 2 + 3)}" y="${yT + 4}" width="${f(w)}" height="${h}" rx="2" transform="${otoc}"/>`);
    stitky.push(
      `<g transform="${otoc}">` +
        `<rect x="${f(x - w / 2)}" y="${yT}" width="${f(w)}" height="${h}" rx="2" fill="#FBF6EA"/>` +
        `<rect x="${f(x - w / 2)}" y="${yT}" width="${f(w)}" height="${h}" rx="2" fill="url(#${p}-sv)"/>` +
        radky.map((r, j) => `<text x="${f(x)}" y="${yT + 32 + j * radek}" text-anchor="middle" font-family="Caveat, cursive" font-size="${pis}" fill="${P.inkoust}">${r}</text>`).join("") +
        `<ellipse cx="${f(x + 1.4)}" cy="${yT + 7.5}" rx="3.4" ry="3" fill="${P.inkoust}" opacity="0.3"/>` +
        `<circle cx="${f(x)}" cy="${yT + 6}" r="3.2" fill="url(#${p}-ms)"/>` +
        `</g>`,
    );
  });

  s.push(`<g fill="${P.inkoust}" opacity="0.3" filter="url(#${p}-rm)">${stiny.join("")}</g>`);
  s.push(strepy.join(""));

  /* Mezi řadami pec: plamínek a teplota, tužkou na desce */
  const yP = 285;
  const xP = (X0 + X1) / 2;
  const cara = (x1: number, x2: number) => {
    const body: Bod[] = [];
    for (let j = 0; j <= 8; j++) body.push([x1 + ((x2 - x1) * j) / 8, yP - 9 + Math.sin(j * 1.7 + x1) * 0.8]);
    return `<path d="${cesta(body)}" stroke="${P.inkoust2}" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.35"/>`;
  };
  s.push(cara(X0 + 50, xP - 80) + cara(xP + 80, X1 - 50));
  s.push(plamen(xP - 52, yP + 3, 0.95));
  s.push(`<text x="${f(xP - 34)}" y="${yP + 1}" font-family="Caveat, cursive" font-size="30" fill="${P.inkoust}">1 280 °C</text>`);

  s.push(stitky.join(""));

  return `<svg viewBox="0 0 1000 600" aria-hidden="true"><defs>${defs.join("")}</defs>${s.join("")}</svg>`;
}

/* ——— Namáčení ——— */

/** Kbelík: střed horního okraje, poloměry a hladina (souřadnice viewBoxu 800 × 640) */
const KB = { x: 262, y: 352, R: 152, Rv: 145, E: 0.3, pas: 16, dno: 598, Rd: 127, hladina: 36 };

/**
 * Místa pro postavičky nad kresbou namáčení (viewBox 800 × 640).
 * Kapka stojí na předním okraji kbelíku vlevo a kouká do glazury.
 */
export const MISTA_GLAZURA = { kapka: { x: 172, y: 388, w: 80 } };

/** Přechod přes válec jako `valcovy`, ale v souřadnicích kresby — ať navazuje na tělo z nadoba() */
const valcovyU = (id: string, t: Trojice, x1: number, x2: number, lesk = 0.34) =>
  `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${f(x1)}" y1="0" x2="${f(x2)}" y2="0">` +
  `<stop offset="0" stop-color="${t.stin}"/>` +
  `<stop offset="0.14" stop-color="${t.stred}"/>` +
  `<stop offset="${f(lesk - 0.08)}" stop-color="${t.svetlo}"/>` +
  `<stop offset="${f(lesk + 0.12)}" stop-color="${t.svetlo}"/>` +
  `<stop offset="0.66" stop-color="${t.stred}"/>` +
  `<stop offset="0.9" stop-color="${smichej(t.stin, t.stred, 0.3)}"/>` +
  `<stop offset="1" stop-color="${t.stin}"/>` +
  `</linearGradient>`;

/** Kapka glazury: kulatá dole, nahoře do špičky (cx, cy = střed baňky) */
const kapka = (cx: number, cy: number, r: number, delka: number) =>
  `M${f(cx)} ${f(cy - delka)} C${f(cx + r * 0.35)} ${f(cy - delka * 0.55)} ${f(cx + r)} ${f(cy - r * 0.5)} ${f(cx + r)} ${f(cy)}` +
  ` A${f(r)} ${f(r)} 0 0 1 ${f(cx - r)} ${f(cy)} C${f(cx - r)} ${f(cy - r * 0.5)} ${f(cx - r * 0.35)} ${f(cy - delka * 0.55)} ${f(cx)} ${f(cy - delka)} Z`;

/** Šipka rumělkou: cesta + hrot na konci (směr z posledního úseku) */
function sipka(d: string, konec: Bod, odkud: Bod, barva = P.rumelka) {
  const a = Math.atan2(konec[1] - odkud[1], konec[0] - odkud[0]);
  const hrot = (u: number) => [konec[0] - Math.cos(a + u) * 11, konec[1] - Math.sin(a + u) * 11] as Bod;
  const [l, r] = [hrot(0.45), hrot(-0.45)];
  return (
    `<path d="${d}" stroke="${barva}" stroke-width="2.6" fill="none" stroke-linecap="round"/>` +
    `<path d="M${f(l[0])} ${f(l[1])} L${f(konec[0])} ${f(konec[1])} L${f(r[0])} ${f(r[1])}" stroke="${barva}" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
  );
}

/**
 * Namáčení: bílý kbelík se syrovým celadonem, nad ním v glazovacích
 * kleštích hrnek po přežahu, spodek už v glazuře a kapky padají zpátky.
 * Vpravo na prkénku tentýž hrnek v syrové glazuře a houbička mu otírá
 * dno dočista. Štítky „3 vteřiny“ a „čisté dno“.
 */
export function namaceniSvg(p = "dgl"): string {
  const defs: string[] = [];
  const s: string[] = [];
  const syr = glazuraPred("celadon");
  /* Tekutá glazura v kbelíku — o kousek sytější než zaschlá křída */
  const tekutaStred = smichej(syr.stred, "#9DB3A2", 0.3);
  const tekuta = { svetlo: smichej(tekutaStred, "#FFFFFF", 0.55), stred: tekutaStred, stin: smichej(syr.stin, "#5E7565", 0.4) };

  /* ——— Kbelík ——— */
  const { x: kx, y: ky, R, Rv, E, pas, dno, Rd, hladina } = KB;
  const Rp = R - 6;
  const kuz = (Rp - Rd) / (dno - ky - pas);
  const Rh = Rv - hladina * kuz;
  const yH = ky + hladina;
  /* Předek elipsy v bodě x */
  const predek = (cy: number, rx: number, x: number) => cy + rx * E * Math.sqrt(Math.max(0, 1 - ((x - kx) / rx) ** 2));

  defs.push(mekkyStin(`${p}-ks`, P.inkoust, 0.3));
  defs.push(
    `<linearGradient id="${p}-kb" gradientUnits="userSpaceOnUse" x1="${kx - R}" y1="0" x2="${kx + R}" y2="0">` +
      `<stop offset="0" stop-color="#CDD0CC"/><stop offset="0.07" stop-color="#F1F0EB"/><stop offset="0.25" stop-color="#FFFFFF"/>` +
      `<stop offset="0.45" stop-color="#F6F6F1"/><stop offset="0.7" stop-color="#DCDDD8"/><stop offset="0.9" stop-color="#BABEBC"/><stop offset="1" stop-color="#A3A8A7"/>` +
      `</linearGradient>`,
  );
  defs.push(svisly(`${p}-ka`, P.inkoust, P.inkoust, 0, 0.16));
  defs.push(
    `<linearGradient id="${p}-kv" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#A3A7A1"/><stop offset="0.45" stop-color="#C6C8C2"/><stop offset="1" stop-color="#E4E4DE"/></linearGradient>`,
  );
  defs.push(
    `<radialGradient id="${p}-hl" cx="0.36" cy="0.2" r="0.9">` +
      `<stop offset="0" stop-color="${tekuta.svetlo}"/><stop offset="0.45" stop-color="${tekuta.stred}"/><stop offset="1" stop-color="${smichej(tekuta.stred, tekuta.stin, 0.55)}"/>` +
      `</radialGradient>`,
  );
  defs.push(`<clipPath id="${p}-ko"><ellipse cx="${kx}" cy="${ky}" rx="${Rv}" ry="${f(Rv * E)}"/></clipPath>`);
  const telo = `M${f(kx - Rp)} ${ky + pas} L${f(kx - Rd)} ${dno} A${Rd} ${f(Rd * E)} 0 0 0 ${f(kx + Rd)} ${dno} L${f(kx + Rp)} ${ky + pas} Z`;
  defs.push(`<clipPath id="${p}-kt"><path d="${telo}"/></clipPath>`);

  /* Stín na zemi — doprava od okna */
  s.push(`<ellipse cx="${kx + 34}" cy="${dno + 6}" rx="${R + 26}" ry="40" fill="url(#${p}-ks)"/>`);
  /* Tělo, tma u dna, saténový lesk plastu */
  s.push(`<path d="${telo}" fill="url(#${p}-kb)"/>`);
  s.push(
    `<g clip-path="url(#${p}-kt)">` +
      `<rect x="${kx - R}" y="${dno - 120}" width="${2 * R}" height="${f(120 + Rd * E + 4)}" fill="url(#${p}-ka)"/>` +
      `<path d="M${f(kx - R * 0.5)} ${ky + pas + 10} L${f(kx - Rd * 0.47)} ${dno - 6}" stroke="#FFFFFF" stroke-width="16" stroke-linecap="round" opacity="0.5"/>` +
      `<path d="M${f(kx - R * 0.66)} ${ky + pas + 14} L${f(kx - Rd * 0.64)} ${dno - 18}" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" opacity="0.8"/>` +
      `<path d="M${f(kx + R * 0.8)} ${ky + pas + 8} L${f(kx + Rd * 0.8)} ${dno - 8}" stroke="#E9ECEA" stroke-width="5" stroke-linecap="round" opacity="0.55"/>` +
      /* Zaschlé stékance glazury po vnějšku */
      [
        [kx - 92, 46],
        [kx + 58, 30],
        [kx - 40, 18],
      ]
        .map(([x, l]) => {
          const y0 = predek(ky + pas, Rp, x) - 2;
          return (
            `<path d="M${f(x - 3.4)} ${f(y0)} C${f(x - 3.6)} ${f(y0 + l * 0.5)} ${f(x - 2.6)} ${f(y0 + l - 4)} ${f(x - 3.4)} ${f(y0 + l)} A3.6 3.6 0 0 0 ${f(x + 3.6)} ${f(y0 + l)} C${f(x + 3)} ${f(y0 + l - 5)} ${f(x + 2.6)} ${f(y0 + l * 0.5)} ${f(x + 2.4)} ${f(y0)} Z" fill="${smichej(syr.stred, syr.stin, 0.45)}"/>` +
            `<path d="M${f(x - 1.6)} ${f(y0 + 2)} V${f(y0 + l - 2)}" stroke="#FFFFFF" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/>`
          );
        })
        .join("") +
      `</g>`,
  );
  /* Zesílený okraj se dvěma žebry */
  const pasD = `M${kx - R} ${ky} A${R} ${f(R * E)} 0 0 0 ${kx + R} ${ky} V${ky + pas} A${R} ${f(R * E)} 0 0 1 ${kx - R} ${ky + pas} Z`;
  s.push(`<path d="${pasD}" fill="url(#${p}-kb)"/>`);
  for (const dy of [6, 11]) {
    const zebro = `M${kx - R} ${ky + dy} A${R} ${f(R * E)} 0 0 0 ${kx + R} ${ky + dy}`;
    s.push(`<path d="${zebro}" stroke="#9EA19C" stroke-width="1.3" fill="none" opacity="0.45"/>`);
    s.push(`<path d="${zebro}" stroke="#FFFFFF" stroke-width="1.1" fill="none" opacity="0.7" transform="translate(0 1.3)"/>`);
  }
  s.push(`<path d="M${kx - R} ${ky + pas} A${R} ${f(R * E)} 0 0 0 ${kx + R} ${ky + pas}" stroke="${P.inkoust}" stroke-width="2.4" fill="none" opacity="0.1" transform="translate(0 1.5)"/>`);
  /* Horní hrana a vnitřek */
  s.push(`<ellipse cx="${kx}" cy="${ky}" rx="${R}" ry="${f(R * E)}" fill="#F6F5F0"/>`);
  s.push(`<ellipse cx="${kx}" cy="${ky}" rx="${Rv}" ry="${f(Rv * E)}" fill="url(#${p}-kv)"/>`);
  /* Hladina: zaschlý proužek na stěně nad ní, lesk tekutiny, kroužky od kapek, stín hrnku */
  const kruhy: string[] = [];
  const [kruhX, kruhY] = [kx - 4, yH - 3];
  for (const [r, o] of [
    [9, 0.5],
    [19, 0.38],
    [31, 0.24],
    [45, 0.13],
  ]) {
    kruhy.push(`<ellipse cx="${f(kruhX)}" cy="${f(kruhY)}" rx="${r}" ry="${f(r * E)}" stroke="#FFFFFF" stroke-width="1.6" fill="none" opacity="${o}"/>`);
    kruhy.push(`<ellipse cx="${f(kruhX)}" cy="${f(kruhY + 1.4)}" rx="${r}" ry="${f(r * E)}" stroke="${tekuta.stin}" stroke-width="1.2" fill="none" opacity="${f(o * 0.6)}"/>`);
  }
  s.push(
    `<g clip-path="url(#${p}-ko)">` +
      `<path d="M${f(kx - Rh - 6)} ${f(yH - 6)} A${f(Rh + 6)} ${f((Rh + 6) * E)} 0 0 1 ${f(kx + Rh + 6)} ${f(yH - 6)}" stroke="${syr.stred}" stroke-width="8" fill="none" opacity="0.95"/>` +
      `<ellipse cx="${kx}" cy="${f(yH)}" rx="${f(Rh)}" ry="${f(Rh * E)}" fill="url(#${p}-hl)"/>` +
      `<path d="M${f(kx - Rh)} ${f(yH)} A${f(Rh)} ${f(Rh * E)} 0 0 1 ${f(kx + Rh)} ${f(yH)}" stroke="#FFFFFF" stroke-width="2.2" fill="none" opacity="0.6"/>` +
      `<ellipse cx="${kx + 64}" cy="${f(yH + 1)}" rx="54" ry="14" fill="${P.inkoust}" opacity="0.09"/>` +
      `<path d="M${f(kx - Rh * 0.72)} ${f(yH - Rh * E * 0.42)} Q${f(kx - Rh * 0.3)} ${f(yH - Rh * E * 0.72)} ${f(kx + Rh * 0.1)} ${f(yH - Rh * E * 0.66)}" stroke="#FFFFFF" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.45"/>` +
      `<g class="${p}-kruhy">${kruhy.join("")}</g>` +
      `</g>`,
  );
  /* Přední hrana okraje chytá světlo */
  s.push(`<path d="M${kx - R} ${ky} A${R} ${f(R * E)} 0 0 0 ${kx + R} ${ky}" stroke="#FFFFFF" stroke-width="2" fill="none" opacity="0.9"/>`);
  s.push(`<path d="M${kx - Rv} ${ky} A${Rv} ${f(Rv * E)} 0 0 0 ${kx + Rv} ${ky}" stroke="#B9BBB6" stroke-width="1.4" fill="none" opacity="0.7"/>`);
  /* Drátěné ucho s držadlem, sklopené dopředu */
  const ucho = `M${kx - R + 4} ${ky + 10} C${kx - R + 14} ${ky + 128} ${kx + R - 14} ${ky + 128} ${kx + R - 4} ${ky + 10}`;
  s.push(`<path d="${ucho}" stroke="${P.inkoust}" stroke-width="2.6" fill="none" opacity="0.12" transform="translate(3 4)"/>`);
  s.push(`<path d="${ucho}" stroke="${P.ocelStin}" stroke-width="2.6" fill="none"/>`);
  s.push(`<path d="${ucho}" stroke="${P.ocelSvetlo}" stroke-width="1" fill="none" opacity="0.8" transform="translate(-0.4 -0.6)"/>`);
  const yU = ky + 10 + 0.75 * 118;
  s.push(`<rect x="${kx - 32}" y="${f(yU - 6)}" width="64" height="12" rx="6" fill="#E9E8E2"/>`);
  s.push(`<rect x="${kx - 32}" y="${f(yU - 6)}" width="64" height="12" rx="6" fill="url(#${p}-kb)" opacity="0.6"/>`);
  s.push(`<path d="M${kx - 26} ${f(yU - 2.5)} H${kx + 8}" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" opacity="0.9"/>`);
  for (const sx of [-1, 1]) {
    s.push(`<ellipse cx="${kx + sx * (R - 5)}" cy="${ky + 9}" rx="6" ry="8" fill="${sx < 0 ? "#F2F1EC" : "#C9CBC6"}"/>`);
    s.push(`<circle cx="${kx + sx * (R - 5)}" cy="${ky + 9}" r="2.2" fill="${P.ocelStin}"/>`);
  }

  /* ——— Hrnek v kleštích nad kbelíkem ——— */
  const hx = 262;
  const hy = 285;
  const vys = 170;
  const H = vys * SMRST.prezah;
  const r = OBRYSY.hrnek;
  const zaklad = hy - r(0) * H * ELIPSA;
  const yTop = zaklad - H;
  const rxTop = r(1) * H;
  const yt = (t: number) => zaklad - t * H;
  const tNam = 0.5;
  const tl = 1.2;
  const rMax = Math.max(...Array.from({ length: 41 }, (_, i) => r(i / 40))) * H;
  s.push(nadoba({ id: `${p}-n1`, tvar: "hrnek", stav: "prezah", x: hx, y: hy, vyska: vys, zrcadlo: true, stin: false }));
  /* Spodek v glazuře: nad hladinou namáčení vodorovně (ucho), na těle přední oblouk */
  const rN = r(tNam) * H + tl;
  const yN = yt(tNam);
  defs.push(`<clipPath id="${p}-nm"><path d="M0 ${f(yN)} H${f(hx - rN)} A${f(rN)} ${f(rN * ELIPSA)} 0 0 0 ${f(hx + rN)} ${f(yN)} H800 V640 H0 Z"/></clipPath>`);
  s.push(`<g clip-path="url(#${p}-nm)">${nadoba({ id: `${p}-n1g`, tvar: "hrnek", stav: "syrova", glazura: "celadon", x: hx, y: hy, vyska: vys, zrcadlo: true, stin: false })}</g>`);
  /* Glazura i přes patku (dno se teprve otře) — vlastní obrys o tloušťku vrstvy větší */
  defs.push(valcovyU(`${p}-gt`, syr, hx - rMax - tl, hx + rMax + tl));
  const n = 12;
  const lev: Bod[] = [];
  const prav: Bod[] = [];
  for (let i = 0; i <= n; i++) {
    const t = (tNam * i) / n;
    lev.push([hx - r(t) * H - tl, yt(t)]);
    prav.push([hx + r(t) * H + tl, yt(t)]);
  }
  const r0 = r(0) * H + tl;
  const ry0 = r(0) * H * ELIPSA + 0.4;
  const plast =
    `M${f(hx - rN)} ${f(yN)} A${f(rN)} ${f(rN * ELIPSA)} 0 0 0 ${f(hx + rN)} ${f(yN)}` +
    hladce([...prav].reverse()) +
    ` A${f(r0)} ${f(ry0)} 0 0 1 ${f(hx - r0)} ${f(zaklad)}` +
    hladce(lev) +
    ` Z`;
  defs.push(`<clipPath id="${p}-pl"><path d="${plast}"/></clipPath>`);
  s.push(`<path d="${plast}" fill="url(#${p}-gt)"/>`);
  /* Mokrá glazura se leskne: pruh světla vlevo, stékance ke dnu, horní hrana vrstvy */
  const pruh: Bod[] = [];
  for (let i = 1; i <= n - 1; i++) {
    const t = (tNam * i) / n;
    pruh.push([hx - r(t) * H * 0.56, yt(t)]);
  }
  s.push(
    `<g clip-path="url(#${p}-pl)">` +
      `<rect x="${f(hx - rMax - 4)}" y="${f(yt(0.3))}" width="${f(rMax * 2 + 8)}" height="${f(0.3 * H + 14)}" fill="url(#${p}-ka)"/>` +
      `<path d="M${f(pruh[0][0])} ${f(pruh[0][1])}${hladce(pruh)}" stroke="#FFFFFF" stroke-width="7" fill="none" stroke-linecap="round" opacity="0.16"/>` +
      `<path d="M${f(pruh[1][0])} ${f(pruh[1][1])}${hladce(pruh.slice(1, -1))}" stroke="#FFFFFF" stroke-width="2.4" fill="none" stroke-linecap="round" opacity="0.7"/>` +
      [
        [hx - 21, 0.26],
        [hx + 20, 0.22],
        [hx - 2, 0.17],
      ]
        .map(([x, t]) => {
          const y1 = yt(t);
          const y2 = predekHrnku(x);
          return (
            `<path d="M${f(x)} ${f(y1)} C${f(x - 1)} ${f(y1 + 10)} ${f(x + 1)} ${f(y2 - 12)} ${f(x)} ${f(y2)}" stroke="${syr.stin}" stroke-width="4.6" fill="none" stroke-linecap="round" opacity="0.09"/>` +
            `<path d="M${f(x - 0.8)} ${f(y1 + 2)} C${f(x - 1.8)} ${f(y1 + 10)} ${f(x + 0.2)} ${f(y2 - 12)} ${f(x - 0.8)} ${f(y2 - 2)}" stroke="#FFFFFF" stroke-width="1.4" fill="none" stroke-linecap="round" opacity="0.38"/>`
          );
        })
        .join("") +
      `</g>`,
  );
  function predekHrnku(x: number) {
    return zaklad + ry0 * Math.sqrt(Math.max(0, 1 - ((x - hx) / r0) ** 2));
  }
  s.push(`<path d="M${f(hx - rN)} ${f(yN)} A${f(rN)} ${f(rN * ELIPSA)} 0 0 0 ${f(hx + rN)} ${f(yN)}" stroke="#FFFFFF" stroke-width="1.8" fill="none" opacity="0.85"/>`);
  s.push(`<path d="M${f(hx - rN)} ${f(yN)} A${f(rN)} ${f(rN * ELIPSA)} 0 0 0 ${f(hx + rN)} ${f(yN)}" stroke="${syr.stin}" stroke-width="1" fill="none" opacity="0.3" transform="translate(0 -1.4)"/>`);

  /* Kapky: visí ze dna, padají, dopadají do kroužků */
  const kapky: string[] = [];
  const barvaKapky = smichej(tekuta.stred, tekuta.stin, 0.3);
  for (const [x, d] of [
    [hx - 21, 9],
    [hx + 20, 12],
    [hx - 2, 15],
  ]) {
    const y0 = predekHrnku(x) - 1;
    kapky.push(`<path d="${kapka(x, y0 + d - 3.6, 3.8, d)}" fill="${barvaKapky}"/>`);
    kapky.push(`<circle cx="${f(x - 1.3)}" cy="${f(y0 + d - 4.8)}" r="1.1" fill="#FFFFFF" opacity="0.85"/>`);
  }
  s.push(`<g class="${p}-visi">${kapky.splice(0).join("")}</g>`);
  for (const [x, y, rr] of [
    [hx - 3, 324, 4.8],
    [hx - 4, 360, 4.2],
  ]) {
    kapky.push(`<path d="${kapka(x, y, rr, rr * 3)}" fill="${barvaKapky}"/>`);
    kapky.push(`<path d="${kapka(x, y, rr, rr * 3)}" fill="${tekuta.stin}" opacity="0.25" transform="translate(1 0.6)"/>`);
    kapky.push(`<circle cx="${f(x - rr * 0.35)}" cy="${f(y - rr * 0.3)}" r="${f(rr * 0.3)}" fill="#FFFFFF" opacity="0.9"/>`);
  }
  s.push(`<g class="${p}-pada">${kapky.join("")}</g>`);

  /* Glazovací kleště: dva pružné pásky spojené vzadu, drátěné hroty */
  const J: Bod = [598, 22];
  const a1: Bod = [331, 97];
  const b1: Bod = [346, 117];
  const pasek = (z: Bod, k: Bod) => `M${f(z[0])} ${f(z[1])} L${f(k[0])} ${f(k[1])}`;
  const usek = (z: Bod, k: Bod, t0: number, t1: number) =>
    pasek([z[0] + (k[0] - z[0]) * t0, z[1] + (k[1] - z[1]) * t0], [z[0] + (k[0] - z[0]) * t1, z[1] + (k[1] - z[1]) * t1]);
  /* Vnitřní hrot vede přes okraj dovnitř hrnku — přední stěna ho schová */
  defs.push(`<clipPath id="${p}-ok"><path d="M0 0 H800 V${f(yTop)} H${f(hx + rxTop)} A${f(rxTop)} ${f(rxTop * ELIPSA)} 0 0 1 ${f(hx - rxTop)} ${f(yTop)} H0 Z"/></clipPath>`);
  const drat = (d: string, sila = 2.4) =>
    `<path d="${d}" stroke="${P.ocelStin}" stroke-width="${f(sila + 1)}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${d}" stroke="${P.ocel}" stroke-width="${f(sila)}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${d}" stroke="${P.ocelSvetlo}" stroke-width="${f(sila * 0.35)}" fill="none" stroke-linecap="round" opacity="0.9" transform="translate(-0.3 -0.5)"/>`;
  s.push(`<g clip-path="url(#${p}-ok)">${drat(`M${f(a1[0])} ${f(a1[1])} Q${f(a1[0] - 10)} ${f(a1[1] + 2)} ${f(hx + rxTop - 6)} ${f(yTop - 4)} Q${f(hx + rxTop - 12)} ${f(yTop)} ${f(hx + rxTop - 15)} ${f(yTop + 7)}`)}</g>`);
  /* Pásek pružné oceli: u hrotu úzký, ke spoji se rozšiřuje; horní hrana chytá světlo */
  const pasekTvar = (z: Bod, k: Bod, wz: number, wk: number, posun = 0) => {
    const [dx, dy] = [k[0] - z[0], k[1] - z[1]];
    const l = Math.hypot(dx, dy);
    const [nx, ny] = [-dy / l, dx / l];
    const b = (q: Bod, w: number, sm: number) => `${f(q[0] + nx * (sm * w / 2 + posun))} ${f(q[1] + ny * (sm * w / 2 + posun))}`;
    return `M${b(z, wz, 1)} L${b(k, wk, 1)} L${b(k, wk, -1)} L${b(z, wz, -1)} Z`;
  };
  for (const [z, w] of [
    [a1, 7],
    [b1, 7.6],
  ] as [Bod, number][]) {
    s.push(`<path d="${pasekTvar(z, J, 3.6, w)}" fill="${P.ocel}" stroke="${P.ocelStin}" stroke-width="1" stroke-linejoin="round"/>`);
    s.push(`<path d="${pasekTvar(z, J, 1.2, w * 0.3, -w * 0.18)}" fill="${P.ocelSvetlo}" opacity="0.95"/>`);
    /* Gumové držadlo u spoje */
    s.push(`<path d="${usek(z, J, 0.62, 0.97)}" stroke="#2E2A27" stroke-width="${w + 4}" stroke-linecap="round"/>`);
    s.push(`<path d="${usek(z, J, 0.64, 0.95)}" stroke="#5A524C" stroke-width="1.6" stroke-linecap="round" opacity="0.9" transform="translate(-0.5 -2)"/>`);
  }
  s.push(drat(`M${f(b1[0])} ${f(b1[1])} Q${f(b1[0] - 8)} ${f(b1[1] + 4)} ${f(hx + r(0.93) * H + 3)} ${f(yt(0.93))}`));
  s.push(`<circle cx="${J[0]}" cy="${J[1]}" r="7.5" fill="#2E2A27"/>`);
  s.push(`<circle cx="${J[0] - 1.8}" cy="${J[1] - 2}" r="2.4" fill="#6B625B"/>`);

  /* ——— Vpravo: prkénko, hrnek v syrové glazuře, houbička a miska s vodou ——— */
  const pk = { x0: 470, x1: 774, yz: 546, yp: 580, h: 12, dx: 14 };
  defs.push(svisly(`${p}-pk`, "#D9B98C", "#C69F6C"));
  defs.push(svisly(`${p}-ph`, "#A57B4D", "#8A6440"));
  s.push(`<ellipse cx="${(pk.x0 + pk.x1) / 2 + 24}" cy="${pk.yp + pk.h + 4}" rx="${(pk.x1 - pk.x0) / 2 + 30}" ry="16" fill="url(#${p}-ks)"/>`);
  s.push(`<path d="M${pk.x0} ${pk.yz} H${pk.x1} L${pk.x1 + pk.dx} ${pk.yp} H${pk.x0 - pk.dx} Z" fill="url(#${p}-pk)"/>`);
  s.push(`<path d="M${pk.x0 - pk.dx} ${pk.yp} H${pk.x1 + pk.dx} V${pk.yp + pk.h} H${pk.x0 - pk.dx} Z" fill="url(#${p}-ph)"/>`);
  s.push(`<path d="M${pk.x0 - pk.dx} ${pk.yp} H${pk.x1 + pk.dx}" stroke="#F1DDB8" stroke-width="1.4" opacity="0.8"/>`);
  for (const [y, o] of [
    [556, 0.16],
    [566, 0.12],
    [573, 0.14],
  ])
    s.push(`<path d="M${pk.x0 + 10} ${y} C${pk.x0 + 90} ${y - 2} ${pk.x1 - 120} ${y + 2} ${pk.x1 - 6} ${y}" stroke="#9C7246" stroke-width="1.1" fill="none" opacity="${o}"/>`);

  /* Miska s vodou (vzadu) */
  const mx = 716;
  const my = 562;
  s.push(nadoba({ id: `${p}-n3`, tvar: "miska", stav: "hotovy", glazura: "tenmoku", x: mx, y: my, vyska: 52 }));
  const mH = 52 * SMRST.hotovy;
  const mrx = OBRYSY.miska(1) * mH;
  const mTop = my - OBRYSY.miska(0) * mH * ELIPSA - mH;
  defs.push(`<radialGradient id="${p}-vo" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stop-color="#F3F7F6"/><stop offset="0.6" stop-color="#CFDEDF"/><stop offset="1" stop-color="#A9BEC0"/></radialGradient>`);
  s.push(`<ellipse cx="${mx + 1}" cy="${f(mTop + 3.2)}" rx="${f(mrx * 0.84)}" ry="${f(mrx * ELIPSA * 0.74)}" fill="url(#${p}-vo)"/>`);
  s.push(`<path d="M${f(mx - mrx * 0.55)} ${f(mTop + 1)} Q${f(mx - mrx * 0.2)} ${f(mTop - 3)} ${f(mx + mrx * 0.15)} ${f(mTop - 2)}" stroke="#FFFFFF" stroke-width="2.4" fill="none" stroke-linecap="round" opacity="0.8"/>`);

  /* Hrnek v syrové glazuře — patka otřená dočista */
  const ox = 556;
  const oy = 574;
  s.push(nadoba({ id: `${p}-n2`, tvar: "hrnek", stav: "syrova", glazura: "celadon", x: ox, y: oy, vyska: vys, zrcadlo: true }));
  const oz = oy - r(0) * H * ELIPSA;
  const oyP = oz - 0.075 * H;

  /*
   * Houbička: měkký polštářek mokré žluté houby, zepředu přitisknutý
   * k patce vpravo — kde se patky dotýká, je promáčknutá a zelenavá od
   * glazury. Kudy už prošla, je střep holý.
   */
  const hu = { x0: ox + 10, x1: ox + 72, yt: oz - 12, yh: oz - 3, yb: oz + 17 };
  const hm = (hu.x0 + hu.x1) / 2;
  defs.push(`<linearGradient id="${p}-hb" x1="0" y1="0" x2="0.15" y2="1"><stop offset="0" stop-color="#F4C94A"/><stop offset="0.55" stop-color="#E7B235"/><stop offset="1" stop-color="#BF8A22"/></linearGradient>`);
  defs.push(`<linearGradient id="${p}-hv" x1="0" y1="0" x2="1" y2="0.5"><stop offset="0" stop-color="#FCE79A"/><stop offset="1" stop-color="#F3CF5C"/></linearGradient>`);
  const houba =
    `M${f(hu.x0 + 8)} ${f(hu.yt + 1)} C${f(hm - 10)} ${f(hu.yt - 3)} ${f(hm + 10)} ${f(hu.yt - 3)} ${f(hu.x1 - 9)} ${f(hu.yt)}` +
    ` C${f(hu.x1 + 1)} ${f(hu.yt + 2)} ${f(hu.x1 + 3)} ${f(hu.yb - 8)} ${f(hu.x1 - 4)} ${f(hu.yb - 1)}` +
    ` C${f(hm + 12)} ${f(hu.yb + 3)} ${f(hm - 12)} ${f(hu.yb + 3)} ${f(hu.x0 + 6)} ${f(hu.yb)}` +
    /* Promáčknutí o patku */
    ` C${f(hu.x0 + 1)} ${f(hu.yb - 3)} ${f(hu.x0 + 6)} ${f(hu.yh + 3)} ${f(hu.x0 + 2)} ${f(hu.yh - 1)}` +
    ` C${f(hu.x0 - 1)} ${f(hu.yt + 6)} ${f(hu.x0 + 2)} ${f(hu.yt + 1)} ${f(hu.x0 + 8)} ${f(hu.yt + 1)} Z`;
  const horni =
    `M${f(hu.x0 + 8)} ${f(hu.yt + 1)} C${f(hm - 10)} ${f(hu.yt - 3)} ${f(hm + 10)} ${f(hu.yt - 3)} ${f(hu.x1 - 9)} ${f(hu.yt)}` +
    ` C${f(hu.x1 - 2)} ${f(hu.yt + 1)} ${f(hu.x1 - 1)} ${f(hu.yh - 1)} ${f(hu.x1 - 6)} ${f(hu.yh + 1)}` +
    ` C${f(hm + 8)} ${f(hu.yh + 4)} ${f(hm - 8)} ${f(hu.yh + 4)} ${f(hu.x0 + 4)} ${f(hu.yh + 1)}` +
    ` C${f(hu.x0 + 1)} ${f(hu.yh - 3)} ${f(hu.x0 + 2)} ${f(hu.yt + 2)} ${f(hu.x0 + 8)} ${f(hu.yt + 1)} Z`;
  defs.push(`<clipPath id="${p}-hc"><path d="${houba}"/></clipPath>`);
  s.push(`<ellipse cx="${f(hm + 10)}" cy="${f(hu.yb + 1)}" rx="${f((hu.x1 - hu.x0) / 2 + 12)}" ry="5" fill="${P.inkoust}" opacity="0.2"/>`);
  const pory = nahoda(612);
  s.push(
    `<g class="${p}-houba">` +
      `<path d="${houba}" fill="url(#${p}-hb)"/>` +
      `<g clip-path="url(#${p}-hc)">` +
      `<path d="${horni}" fill="url(#${p}-hv)"/>` +
      /* Kde houba drží na patce, nabrala glazuru */
      `<path d="M${f(hu.x0 - 4)} ${f(hu.yt - 2)} C${f(hu.x0 + 9)} ${f(hu.yt + 6)} ${f(hu.x0 + 7)} ${f(hu.yb - 8)} ${f(hu.x0 + 13)} ${f(hu.yb + 4)} H${f(hu.x0 - 6)} Z" fill="${syr.stred}" opacity="0.92"/>` +
      Array.from({ length: 11 }, () => {
        const px = hu.x0 + 16 + pory() * (hu.x1 - hu.x0 - 24);
        const py = hu.yt + 4 + pory() * (hu.yb - hu.yt - 8);
        const pr = 0.7 + pory() * 0.9;
        return `<ellipse cx="${f(px)}" cy="${f(py)}" rx="${f(pr * 1.4)}" ry="${f(pr)}" fill="#A8741A" opacity="0.38"/>`;
      }).join("") +
      /* Mokrá houba se leskne */
      `<path d="M${f(hm - 14)} ${f(hu.yt + 2.4)} C${f(hm - 4)} ${f(hu.yt)} ${f(hm + 8)} ${f(hu.yt)} ${f(hm + 16)} ${f(hu.yt + 1.6)}" stroke="#FFF8DC" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.9"/>` +
      `</g>` +
      `</g>`,
  );
  /* Pár kapek vody na prkénku */
  for (const [x, y, rr] of [
    [hu.x1 + 14, hu.yb - 6, 3.2],
    [hu.x1 + 25, hu.yb - 1, 2.2],
  ]) {
    s.push(`<ellipse cx="${f(x)}" cy="${f(y)}" rx="${rr}" ry="${f(rr * 0.6)}" fill="#E8EEEC" opacity="0.85"/>`);
    s.push(`<circle cx="${f(x - rr * 0.35)}" cy="${f(y - rr * 0.2)}" r="${f(rr * 0.3)}" fill="#FFFFFF"/>`);
  }

  /* ——— Štítky ——— */
  /* Tři vteřiny: šipka dolů do kbelíku a zpátky nahoru */
  const sx = 118;
  const [s1, s2] = [yN - 8, ky - 54];
  s.push(sipka(`M${sx} ${f(s1)} V${f(s2)}`, [sx, s2], [sx, s2 - 14]));
  s.push(sipka(`M${sx} ${f(s2)} V${f(s1)}`, [sx, s1], [sx, s1 + 14]));
  s.push(`<text x="${sx - 12}" y="${f((s1 + s2) / 2 + 9)}" text-anchor="end" font-family="Caveat, cursive" font-size="30" fill="${P.inkoust}">3 vteřiny</text>`);
  /* Čisté dno: šipka k holému proužku u patky */
  const cil: Bod = [ox - 12, oyP + 5];
  s.push(sipka(`M${ox + 74} ${f(oyP - 74)} Q${ox + 18} ${f(oyP - 58)} ${f(cil[0])} ${f(cil[1])}`, cil, [ox + 6, oyP - 30]));
  s.push(`<text x="${ox + 80}" y="${f(oyP - 72)}" font-family="Caveat, cursive" font-size="30" fill="${P.inkoust}">čisté dno</text>`);

  return `<svg viewBox="0 0 800 640" aria-hidden="true"><defs>${defs.join("")}</defs>${s.join("")}</svg>`;
}
