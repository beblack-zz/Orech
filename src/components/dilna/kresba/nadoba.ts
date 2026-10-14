/**
 * Nádoba na cestě dílnou — jeden a tentýž kus ve všech stavech, od mokré
 * hlíny po vypálenou glazuru. Kreslí ho regál v úvodu, cesta od rezervace
 * po vyzvednutí, sušení, pec i ranní stůl, takže hrnek je všude stejný
 * a mění se jen to, co se s ním opravdu děje:
 *
 *   mokry    tmavý, leskne se, rýhy po prstech
 *   kozeny   kožená tvrdost: matný lesk, obrobená patka, přilepené ucho
 *   suchy    bledý jako křída, bez lesku
 *   prezah   po prvním výpalu do meruňkova, pórovitý
 *   syrova   v syrové glazuře — křídová vrstva, dno otřené
 *   hotovy   po ostrém výpalu — sklo, holá patka
 *
 * Hlína se sušením a výpalem smršťuje, proto je hotový hrnek menší než
 * mokrý (SMRST). Kus je rotační těleso: obrys je řada poloměrů odspodu
 * nahoru v násobcích výšky, vidíme ho trochu shora (ELIPSA).
 *
 * Pata kusu stojí v bodě (x, y). Každý kus potřebuje vlastní předponu
 * `id` — přechody se na stránce nesmějí potkat.
 */
import { HLINA, glazuraPo, glazuraPred, jeMatna, smichej, valcovy, svisly, mekkyStin, f, hladce, nahoda } from "./zaklad";
import type { Trojice, Bod } from "./zaklad";

export type Stav = "mokry" | "kozeny" | "suchy" | "prezah" | "syrova" | "hotovy";
export type Tvar = "hrnek" | "valec" | "yunomi" | "miska" | "vaza";

/** O kolik je kus v daném stavu menší než mokrý — hotový zhruba o desetinu */
export const SMRST: Record<Stav, number> = { mokry: 1, kozeny: 0.97, suchy: 0.94, prezah: 0.935, syrova: 0.935, hotovy: 0.885 };

/** Jak moc shora se na kus díváme: poměr výšky a šířky elipsy okraje */
export const ELIPSA = 0.24;

/** Bodů obrysu na každé straně — víc kresba nepotřebuje, cesty pak nejsou zbytečně dlouhé */
const N = 14;
const hrbol = (t: number, c: number, w: number) => Math.exp(-(((t - c) / w) ** 2));
/** Patka: dole o kousek užší, ať kus nestojí na ostré hraně */
const patka = (t: number, hloubka: number, vyska = 0.07) => hloubka * Math.max(0, 1 - t / vyska) ** 2;

/** Obrysy v násobcích výšky kusu */
export const OBRYSY: Record<Tvar, (t: number) => number> = {
  hrnek: (t) => 0.352 + 0.018 * Math.sin(Math.PI * t * 0.9) - patka(t, 0.04),
  valec: (t) => 0.336 + 0.05 * Math.max(0, 1 - t / 0.2) ** 2 + 0.012 * t,
  yunomi: (t) => 0.262 + 0.036 * t + 0.012 * Math.sin(Math.PI * t) - patka(t, 0.03),
  miska: (t) => 0.44 + 0.7 * (1 - (1 - t) ** 2.3) - patka(t, 0.06, 0.1),
  vaza: (t) => 0.13 + 0.215 * hrbol(t, 0.34, 0.27) + 0.07 * Math.max(0, (t - 0.84) / 0.16) ** 2 + 0.02 * (1 - t) - patka(t, 0.025),
};

const UCHO: Record<Tvar, boolean> = { hrnek: true, valec: false, yunomi: false, miska: false, vaza: false };

export interface NadobaVolby {
  /** Předpona id přechodů — na stránce jedinečná */
  id: string;
  tvar: Tvar;
  stav: Stav;
  /** Název glazury z kurzy2.ts — jen pro syrovou a hotovou */
  glazura?: string;
  /** Pata kusu */
  x: number;
  y: number;
  /** Výška mokrého kusu; v ostatních stavech se zmenší podle SMRST */
  vyska: number;
  /** Zmenšit podle stavu (výchozí ano) */
  smrst?: boolean;
  /** Ucho — výchozí podle tvaru */
  ucho?: boolean;
  /** Ucho vlevo místo vpravo */
  zrcadlo?: boolean;
  /** Stín na zemi (výchozí ano) */
  stin?: boolean;
  /** Rýhy po prstech u kusů z kruhu (výchozí ano) */
  ryhy?: boolean;
  /** Natočení kolem osy pro kreslení — jen posune lesk (0 = světlo zleva) */
  trida?: string;
}

/** Barvy kusu podle stavu: tělo, vnitřek, patka, okraj */
interface Vzhled {
  telo: Trojice;
  vnitrek: Trojice;
  patka: Trojice | null;
  /** Barva okraje, kde se glazura ztenčí */
  okraj: string;
  /** 0 = matný, 1 = sklo */
  lesk: number;
  /** Jak moc jsou vidět rýhy po prstech */
  ryhy: number;
  /** Louže glazury na dně misky */
  louze: string | null;
}

/** Kde se glazura na okraji ztenčí, prosvítá střep nebo jiná barva */
const ZLOM: Record<string, string> = {
  celadon: "#E3EEDD",
  tenmoku: "#9A5A2E",
  shino: "#DC9864",
  "matná bílá": "#FBF8F2",
  "popelová šedá": "#C9BCA8",
  "železitá hnědá": "#D7A066",
};

function vzhled(stav: Stav, glazura: string): Vzhled {
  if (stav === "mokry") return { telo: HLINA.mokry, vnitrek: HLINA.mokry, patka: null, okraj: HLINA.mokry.svetlo, lesk: 0.8, ryhy: 1, louze: null };
  if (stav === "kozeny") return { telo: HLINA.kozeny, vnitrek: HLINA.kozeny, patka: null, okraj: HLINA.kozeny.svetlo, lesk: 0.25, ryhy: 0.6, louze: null };
  if (stav === "suchy") return { telo: HLINA.suchy, vnitrek: HLINA.suchy, patka: null, okraj: "#F4EEE6", lesk: 0, ryhy: 0.45, louze: null };
  if (stav === "prezah") return { telo: HLINA.prezah, vnitrek: HLINA.prezah, patka: null, okraj: "#FBEFE4", lesk: 0, ryhy: 0.4, louze: null };
  if (stav === "syrova") {
    const g = glazuraPred(glazura);
    return { telo: g, vnitrek: g, patka: HLINA.prezah, okraj: smichej(g.svetlo, "#FFFFFF", 0.4), lesk: 0, ryhy: 0, louze: null };
  }
  const g = glazuraPo(glazura);
  const matna = jeMatna(glazura);
  return {
    telo: g,
    vnitrek: g,
    patka: HLINA.palena,
    okraj: ZLOM[glazura] ?? g.svetlo,
    lesk: matna ? 0.08 : 0.85,
    ryhy: matna ? 0.12 : 0.2,
    louze: matna ? null : smichej(g.stin, g.stred, 0.25),
  };
}

/** Body obrysu a míry kusu — hodí se i kresbám, které kreslí kus po svém */
export function geometrie(tvar: Tvar, x: number, y: number, vyska: number) {
  const r = OBRYSY[tvar];
  const ry0 = r(0) * vyska * ELIPSA;
  const zaklad = y - ry0;
  const bod = (t: number, strana: 1 | -1): Bod => [x + strana * r(t) * vyska, zaklad - t * vyska];
  const levy = Array.from({ length: N }, (_, i) => bod(i / (N - 1), -1));
  const pravy = Array.from({ length: N }, (_, i) => bod(i / (N - 1), 1));
  const rx = r(1) * vyska;
  const yTop = zaklad - vyska;
  return { r, ry0, zaklad, levy, pravy, rx, ry: rx * ELIPSA, yTop, rMax: Math.max(...levy.map((b) => x - b[0])) };
}

/** Kus v daném stavu jako <g> i s vlastními <defs> */
export function nadoba(o: NadobaVolby): string {
  const k = o.smrst === false ? 1 : SMRST[o.stav];
  const H = o.vyska * k;
  const { id, x, y, tvar, stav } = o;
  const g = geometrie(tvar, x, y, H);
  const { r, ry0, zaklad, levy, pravy, rx, ry, yTop } = g;
  const v = vzhled(stav, o.glazura ?? "celadon");
  const ucho = (o.ucho ?? UCHO[tvar]) && tvar !== "miska";
  const sm = o.zrcadlo ? -1 : 1;
  const yt = (t: number) => zaklad - t * H;
  const defs: string[] = [];
  const kus: string[] = [];

  const obrys =
    `M${f(levy[0][0])} ${f(levy[0][1])}${hladce(levy)}` +
    ` A${f(rx)} ${f(ry)} 0 0 1 ${f(pravy[N - 1][0])} ${f(pravy[N - 1][1])}` +
    hladce([...pravy].reverse()) +
    ` A${f(r(0) * H)} ${f(ry0)} 0 0 1 ${f(levy[0][0])} ${f(levy[0][1])} Z`;

  /* Světlo zleva, u lesklých kusů sevřenější */
  defs.push(valcovy(`${id}-t`, v.telo, v.lesk > 0.5 ? 0.3 : 0.34));
  defs.push(svisly(`${id}-ao`, "#1E140E", "#1E140E", 0, 0.22));
  /* Obrys se píše jednou a tělo i ořez na něj jen odkazují */
  defs.push(`<path id="${id}-o" d="${obrys}"/>`);
  defs.push(`<clipPath id="${id}-c"><use href="#${id}-o"/></clipPath>`);
  defs.push(
    `<radialGradient id="${id}-v" cx="0.64" cy="0.3" r="0.8">` +
      `<stop offset="0" stop-color="${v.vnitrek.svetlo}"/>` +
      `<stop offset="0.45" stop-color="${v.vnitrek.stred}"/>` +
      `<stop offset="1" stop-color="${smichej(v.vnitrek.stin, "#1E140E", 0.25)}"/>` +
      `</radialGradient>`,
  );

  /* Stín na zemi — světlo zleva, stín trochu doprava */
  if (o.stin !== false) {
    defs.push(mekkyStin(`${id}-s`));
    const sr = r(0) * H * 1.5 + 6;
    kus.push(`<ellipse cx="${f(x + sr * 0.18)}" cy="${f(y - ry0 * 0.1)}" rx="${f(sr)}" ry="${f(sr * 0.2 + 2)}" fill="url(#${id}-s)"/>`);
  }

  /* Ucho — za tělem, konce schová obrys */
  if (ucho) {
    const t1 = 0.8;
    const t0 = 0.26;
    const [x1, y1] = [x + sm * (r(t1) * H - 2), yt(t1)];
    const [x0, y0] = [x + sm * (r(t0) * H - 2), yt(t0)];
    const d = 0.34 * H;
    const cesta = `M${f(x1)} ${f(y1)} C${f(x1 + sm * d * 1.05)} ${f(y1 - d * 0.18)} ${f(x0 + sm * d * 1.0)} ${f(y0 + d * 0.06)} ${f(x0)} ${f(y0)}`;
    const tl = Math.max(2.4, H * 0.082);
    const uB = v.telo;
    kus.push(`<path d="${cesta}" stroke="${uB.stin}" stroke-width="${f(tl + 1.6)}" fill="none" stroke-linecap="round"/>`);
    kus.push(`<path d="${cesta}" stroke="${uB.stred}" stroke-width="${f(tl)}" fill="none" stroke-linecap="round"/>`);
    kus.push(`<path d="${cesta}" stroke="${uB.svetlo}" stroke-width="${f(tl * 0.32)}" fill="none" stroke-linecap="round" opacity="${f(0.45 + v.lesk * 0.4)}" transform="translate(${f(-tl * 0.18 * sm)} ${f(-tl * 0.2)})"/>`);
    if (stav === "kozeny") {
      /* Čerstvě přilepené ucho — spoj potřený šlikrem je ještě tmavší */
      kus.push(`<ellipse cx="${f(x1 - sm * 1)}" cy="${f(y1)}" rx="${f(tl * 0.7)}" ry="${f(tl * 0.9)}" fill="${v.telo.stin}" opacity="0.35"/>`);
      kus.push(`<ellipse cx="${f(x0 - sm * 1)}" cy="${f(y0)}" rx="${f(tl * 0.7)}" ry="${f(tl * 0.9)}" fill="${v.telo.stin}" opacity="0.35"/>`);
    }
  }

  /* Tělo */
  kus.push(`<use href="#${id}-o" fill="url(#${id}-t)"/>`);
  const vnitrni: string[] = [];

  /* Holá patka pod glazurou */
  if (v.patka) {
    defs.push(valcovy(`${id}-p`, v.patka, 0.34));
    const yP = yt(stav === "syrova" ? 0.075 : 0.065);
    const sirka = g.rMax * 2 + 20;
    let hrana = `M${f(x - sirka / 2)} ${f(yP)}`;
    if (stav === "syrova") {
      /* Otřené houbičkou — hrana trochu zvlněná */
      const rnd = nahoda(Math.round(H * 13 + x));
      for (let i = 1; i <= 8; i++) hrana += ` L${f(x - sirka / 2 + (sirka * i) / 8)} ${f(yP + (rnd() - 0.5) * 1.6)}`;
    } else {
      hrana += ` L${f(x + sirka / 2)} ${f(yP)}`;
    }
    vnitrni.push(`<path d="${hrana} V${f(y + 4)} H${f(x - sirka / 2)} Z" fill="url(#${id}-p)"/>`);
    /* Hrana glazury: syrová je tlustá a křídová, vypálená se zaoblí do válečku */
    const front = (yy: number) => `M${f(x - r(0.07) * H)} ${f(yy)} Q${f(x)} ${f(yy + r(0.07) * H * ELIPSA * 1.9)} ${f(x + r(0.07) * H)} ${f(yy)}`;
    vnitrni.push(`<path d="${front(yP - 0.6)}" stroke="${stav === "syrova" ? v.telo.svetlo : smichej(v.telo.stin, "#140C08", 0.25)}" stroke-width="${stav === "syrova" ? 1.4 : 1.2}" fill="none" opacity="${stav === "syrova" ? 0.9 : 0.55}"/>`);
  }

  /* Rýhy po prstech — přední oblouky přes tělo */
  const ryhy = (o.ryhy ?? true) && tvar !== "miska" ? v.ryhy : tvar === "miska" ? v.ryhy * 0.6 : 0;
  if (ryhy > 0) {
    const rnd = nahoda(Math.round(H * 7 + x * 3));
    const pocet = tvar === "vaza" ? 9 : 7;
    for (let i = 1; i <= pocet; i++) {
      const t = 0.12 + ((i - 0.4 + rnd() * 0.5) / (pocet + 0.5)) * 0.8;
      const ri = r(t) * H;
      const yy = yt(t);
      const sag = ri * ELIPSA * 1.85;
      const dd = `M${f(x - ri * 0.99)} ${f(yy)} Q${f(x)} ${f(yy + sag)} ${f(x + ri * 0.99)} ${f(yy)}`;
      vnitrni.push(`<path d="${dd}" stroke="${v.telo.stin}" stroke-width="${f(Math.max(0.8, H * 0.009))}" fill="none" opacity="${f(0.2 * ryhy)}"/>`);
      vnitrni.push(`<path d="${dd}" stroke="${v.telo.svetlo}" stroke-width="${f(Math.max(0.6, H * 0.006))}" fill="none" opacity="${f(0.22 * ryhy)}" transform="translate(0 ${f(Math.max(1, H * 0.012))})"/>`);
    }
  }

  /* Obrobená patka — malý schod nad zemí (od kožené tvrdosti) */
  if (stav !== "mokry") {
    const t = 0.035;
    const ri = r(t) * H;
    vnitrni.push(`<path d="M${f(x - ri)} ${f(yt(t))} Q${f(x)} ${f(yt(t) + ri * ELIPSA * 1.95)} ${f(x + ri)} ${f(yt(t))}" stroke="${(v.patka ?? v.telo).stin}" stroke-width="1" fill="none" opacity="0.4"/>`);
  }

  /* Mokrý kus stojí v trošce šlikru */
  if (stav === "mokry") {
    vnitrni.push(`<path d="M${f(levy[0][0] - 2)} ${f(levy[0][1] - 3)} Q${f(x)} ${f(y + 4)} ${f(pravy[0][0] + 2)} ${f(pravy[0][1] - 3)}" stroke="${HLINA.mokry.svetlo}" stroke-width="2.4" fill="none" opacity="0.55"/>`);
  }

  /* Tma u země */
  vnitrni.push(`<rect x="${f(x - g.rMax - 4)}" y="${f(yt(0.5))}" width="${f(g.rMax * 2 + 8)}" height="${f(H * 0.5 + ry0 + 4)}" fill="url(#${id}-ao)"/>`);

  /* Lesk — světlo z okna v úzkém pruhu po levé straně */
  if (v.lesk > 0) {
    const bodyL: Bod[] = [];
    for (let i = 3; i <= N - 3; i++) {
      const t = i / (N - 1);
      bodyL.push([x - r(t) * H * 0.58, yt(t)]);
    }
    const sir = Math.max(1.4, g.rMax * 0.075);
    vnitrni.push(`<path d="M${f(bodyL[0][0])} ${f(bodyL[0][1])}${hladce(bodyL)}" stroke="#FFFFFF" stroke-width="${f(sir * 3.2)}" fill="none" stroke-linecap="round" opacity="${f(v.lesk * 0.12)}"/>`);
    vnitrni.push(`<path d="M${f(bodyL[1][0])} ${f(bodyL[1][1])}${hladce(bodyL.slice(1, -1))}" stroke="#FFFFFF" stroke-width="${f(sir)}" fill="none" stroke-linecap="round" opacity="${f(v.lesk * 0.62)}"/>`);
    /* Odraz okna vpravo — slabší */
    const bodyP: Bod[] = [];
    for (let i = 5; i <= N - 6; i++) {
      const t = i / (N - 1);
      bodyP.push([x + r(t) * H * 0.78, yt(t)]);
    }
    vnitrni.push(`<path d="M${f(bodyP[0][0])} ${f(bodyP[0][1])}${hladce(bodyP)}" stroke="#FFFFFF" stroke-width="${f(sir * 0.7)}" fill="none" stroke-linecap="round" opacity="${f(v.lesk * 0.2)}"/>`);
  }

  kus.push(`<g clip-path="url(#${id}-c)">${vnitrni.join("")}</g>`);

  /* Okraj a vnitřek */
  const tl = Math.max(1.6, rx * 0.075);
  kus.push(`<ellipse cx="${f(x)}" cy="${f(yTop)}" rx="${f(rx)}" ry="${f(ry)}" fill="${v.okraj}"/>`);
  kus.push(`<ellipse cx="${f(x + tl * 0.08)}" cy="${f(yTop + tl * 0.12)}" rx="${f(rx - tl)}" ry="${f(Math.max(0.5, ry - tl * ELIPSA * 1.5))}" fill="url(#${id}-v)"/>`);
  if (v.louze && tvar === "miska") {
    /* Glazura se v misce slije na dno a je tam tmavší */
    kus.push(`<ellipse cx="${f(x + rx * 0.06)}" cy="${f(yTop + ry * 0.38)}" rx="${f(rx * 0.42)}" ry="${f(ry * 0.36)}" fill="${v.louze}" opacity="0.7"/>`);
  }
  if (v.lesk > 0.5) {
    kus.push(`<path d="M${f(x - rx * 0.62)} ${f(yTop - ry * 0.55)} Q${f(x - rx * 0.2)} ${f(yTop - ry * 0.98)} ${f(x + rx * 0.2)} ${f(yTop - ry * 0.92)}" stroke="#FFFFFF" stroke-width="${f(Math.max(1, tl * 0.45))}" fill="none" stroke-linecap="round" opacity="0.6"/>`);
  }
  /* Přední hrana okraje — světlo zleva */
  kus.push(`<path d="M${f(x - rx)} ${f(yTop)} A${f(rx)} ${f(ry)} 0 0 0 ${f(x + rx)} ${f(yTop)}" stroke="${smichej(v.okraj, "#FFFFFF", 0.35)}" stroke-width="${f(Math.max(0.8, tl * 0.4))}" fill="none" opacity="0.8"/>`);

  return `<g${o.trida ? ` class="${o.trida}"` : ""}><defs>${defs.join("")}</defs>${kus.join("")}</g>`;
}

/**
 * Hrouda hlíny: kostka uříznutá drátem z balíku, nebo vyhnětená
 * homole (kiku-neri) připravená na kruh. Pata v (x, y), `s` = výška.
 */
export function hrouda(o: { id: string; x: number; y: number; s: number; druh?: "kostka" | "homole"; stin?: boolean }): string {
  const { id, x, y, s } = o;
  const h = HLINA.mokry;
  const defs: string[] = [];
  const kus: string[] = [];
  if (o.stin !== false) {
    defs.push(mekkyStin(`${id}-s`));
    kus.push(`<ellipse cx="${f(x + s * 0.12)}" cy="${f(y)}" rx="${f(s * 0.95)}" ry="${f(s * 0.16)}" fill="url(#${id}-s)"/>`);
  }
  if ((o.druh ?? "homole") === "kostka") {
    /* Kvádr: líc (uříznutý drátem), vršek a pravý bok */
    const w = s * 1.15;
    const d = s * 0.42;
    const x0 = x - w / 2 - d * 0.3;
    const y1 = y - 2;
    const y0 = y1 - s;
    const dx = d * 0.7;
    const dy = d * 0.42;
    defs.push(svisly(`${id}-l`, h.stred, smichej(h.stin, h.stred, 0.4)));
    kus.push(`<path d="M${f(x0 + w)} ${f(y0)} l${f(dx)} ${f(-dy)} V${f(y1 - dy)} l${f(-dx)} ${f(dy)} Z" fill="${h.stin}"/>`);
    kus.push(`<path d="M${f(x0)} ${f(y0)} l${f(dx)} ${f(-dy)} H${f(x0 + w + dx)} l${f(-dx)} ${f(dy)} Z" fill="${h.svetlo}"/>`);
    kus.push(`<rect x="${f(x0)}" y="${f(y0)}" width="${f(w)}" height="${f(s)}" rx="${f(s * 0.05)}" fill="url(#${id}-l)"/>`);
    /* Stopy po drátu — jemné oblouky přes líc */
    const rnd = nahoda(Math.round(s * 17));
    for (let i = 0; i < 9; i++) {
      const yy = y0 + s * (0.1 + i * 0.1) + rnd() * 2;
      kus.push(`<path d="M${f(x0 + 3)} ${f(yy)} Q${f(x0 + w / 2)} ${f(yy + 3 + rnd() * 3)} ${f(x0 + w - 3)} ${f(yy - 1)}" stroke="${i % 2 ? h.svetlo : h.stin}" stroke-width="0.9" fill="none" opacity="${f(0.22 + rnd() * 0.15)}"/>`);
    }
    kus.push(`<path d="M${f(x0 + w * 0.12)} ${f(y0 + s * 0.22)} L${f(x0 + w * 0.12)} ${f(y0 + s * 0.78)}" stroke="#FFFFFF" stroke-width="${f(s * 0.05)}" stroke-linecap="round" opacity="0.18"/>`);
  } else {
    /*
     * Homole: vyhnětená hrouda připravená na kruh — oblá, k vršku se
     * zužuje. Na boku zůstaly srpkovité sklady z kiku-neri, které se
     * stáčejí do jednoho bodu jako lístky chryzantémy.
     */
    const w = s * 0.8;
    defs.push(`<radialGradient id="${id}-h" cx="0.34" cy="0.3" r="0.85"><stop offset="0" stop-color="${smichej(h.svetlo, "#FFFFFF", 0.1)}"/><stop offset="0.48" stop-color="${h.stred}"/><stop offset="1" stop-color="${h.stin}"/></radialGradient>`);
    const telo =
      `M${f(x - w)} ${f(y - 2)}` +
      ` C${f(x - w * 1.06)} ${f(y - s * 0.5)} ${f(x - w * 0.62)} ${f(y - s * 0.98)} ${f(x - w * 0.02)} ${f(y - s)}` +
      ` C${f(x + w * 0.58)} ${f(y - s * 1.0)} ${f(x + w * 1.08)} ${f(y - s * 0.52)} ${f(x + w)} ${f(y - 2)}` +
      ` Q${f(x)} ${f(y + s * 0.12)} ${f(x - w)} ${f(y - 2)} Z`;
    kus.push(`<path d="${telo}" fill="url(#${id}-h)"/>`);
    defs.push(`<clipPath id="${id}-hc"><path d="${telo}"/></clipPath>`);
    /*
     * Čelo homole je ke světlu: srpkovité sklady se stáčejí do středu
     * květu kousek nad středem — jako lístky chryzantémy.
     */
    const [sx, sy] = [x + w * 0.08, y - s * 0.56];
    const sklady: string[] = [];
    const pocet = 11;
    for (let i = 0; i < pocet; i++) {
      const a = Math.PI * (0.06 + (i / (pocet - 1)) * 0.94) + Math.PI * 0.02;
      const dl = s * (0.5 + 0.05 * Math.sin(i * 2.3));
      const x1 = sx + Math.cos(a) * dl * 1.25;
      const y1 = sy + Math.sin(a) * dl * 0.9;
      const ohyb = s * 0.11;
      const cx = (x1 + sx) / 2 + Math.cos(a + Math.PI / 2) * ohyb;
      const cy = (y1 + sy) / 2 + Math.sin(a + Math.PI / 2) * ohyb * 0.8;
      sklady.push(`<path d="M${f(x1)} ${f(y1)} Q${f(cx)} ${f(cy)} ${f(sx)} ${f(sy)}" stroke="${h.stin}" stroke-width="${f(s * 0.03)}" fill="none" stroke-linecap="round" opacity="0.3"/>`);
      sklady.push(`<path d="M${f(x1 - 1.4)} ${f(y1 - 2)} Q${f(cx - 1.4)} ${f(cy - 2)} ${f(sx - 0.8)} ${f(sy - 1.2)}" stroke="${h.svetlo}" stroke-width="${f(s * 0.017)}" fill="none" stroke-linecap="round" opacity="0.45"/>`);
    }
    sklady.push(`<ellipse cx="${f(sx)}" cy="${f(sy)}" rx="${f(s * 0.05)}" ry="${f(s * 0.035)}" fill="${h.stin}" opacity="0.4"/>`);
    kus.push(`<g clip-path="url(#${id}-hc)">${sklady.join("")}</g>`);
    kus.push(`<path d="M${f(x - w * 0.8)} ${f(y - s * 0.52)} Q${f(x - w * 0.62)} ${f(y - s * 0.88)} ${f(x - w * 0.16)} ${f(y - s * 0.94)}" stroke="#FFFFFF" stroke-width="${f(s * 0.05)}" fill="none" stroke-linecap="round" opacity="0.28"/>`);
  }
  return `<g><defs>${defs.join("")}</defs>${kus.join("")}</g>`;
}

/** Samostatné SVG s hroudou — ikona do textu */
export function hroudaSvg(id: string, w = 120, h = 120, stin = true): string {
  return `<svg viewBox="0 0 ${w} ${h}" aria-hidden="true">${hrouda({ id, x: w / 2, y: h - 12, s: h * 0.5, druh: "homole", stin })}</svg>`;
}

/** Samostatné SVG s jedním kusem — ikona do textu */
export function nadobaSvg(o: Omit<NadobaVolby, "x" | "y" | "vyska">, w = 120, h = 120, popis?: string): string {
  const aria = popis ? `role="img" aria-label="${popis.replace(/"/g, "&quot;")}"` : `aria-hidden="true"`;
  const vyska = o.tvar === "miska" ? h * 0.42 : o.tvar === "vaza" ? h * 0.78 : h * 0.66;
  return `<svg viewBox="0 0 ${w} ${h}" ${aria}>${nadoba({ ...o, x: w / 2 - (o.tvar === "hrnek" ? w * 0.08 : 0), y: h - 10, vyska })}</svg>`;
}
