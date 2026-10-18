/**
 * Textury balíků na 3D šátku (canvas 2D, běží v prohlížeči): noviny, do
 * kterých je kus zabalený, a visačka 荷札 s fotkou kusu a číslem — stejným
 * jako na účtence.
 *
 * Noviny nejsou písmem: znaky se kreslí synteticky jako drobné tahy podobné
 * kanji a kaně, ať nejsou potřeba japonská písma. Strana je rozdělená do
 * pásů 段, v nich sloupce svislého textu (tategaki) zprava doleva, články
 * mají titulky většími znaky (některé bílé na černém), sem tam rastrovaná
 * fotka a dole inzeráty, občas v rumělkovém rámečku. Textura je celý arch
 * o straně ARCH metrů (zhruba 1 px na milimetr); okraje archu zůstávají
 * bez tisku — končí v nich špičky lístků chomáčku.
 *
 * Visačka je krémový karton s vlákny, rumělkovým rámečkem a dírkou
 * s kroužkem; přes skoro celou šířku fotka kusu (když chybí, tušová
 * kresbička tvaru), pod ní velké číslo rukou (Caveat ze stránky) a drobně
 * jméno. Rohy obrázku, které obrys kartičky odřízne, jsou čistý karton —
 * odtud bere barvu rub kartičky (balik.ts).
 *
 * Obrázky se nahrávají do WebGL, jak jsou (bez UNPACK_FLIP_Y): uv (0, 0)
 * je levý horní roh.
 */
import type { KusNaSatku, TvarBaliku } from "./typy";

/** Strana archu novin (m), kterou textura pokrývá — balik.ts podle ní počítá uv */
export const ARCH = 0.5;
/**
 * Visačka v metrech; zkosení horních rohů a poloměr dírky jsou díl šířky,
 * výška dírky díl výšky od horního okraje
 */
export const VISACKA = { sirka: 0.056, vyska: 0.084, zkoseni: 0.18, dirkaY: 0.1, dirkaR: 0.05 };

const NOVINY_PX = 512;
const VISACKA_PX: [number, number] = [256, 384];

const INKOUST: [number, number, number] = [46, 42, 38];
const RUMELKA = "#C4452D";
const PAPIR: [number, number, number] = [233, 222, 197];

/** Stejná náhoda jako balik.ts (mulberry32) */
const nahoda = (seme: number) => {
  let s = seme | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const mezi = (r: () => number, a: number, b: number) => a + (b - a) * r();
const hladce = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const cele = (r: () => number, a: number, b: number) => a + Math.floor(r() * (b - a + 1));

/* ═══ Znaky ═══ */

/**
 * Drobné znaky do sloupců textu: 4 × 4 px, hodnoty 0…1. Kanji mají víc
 * tahů (vodorovné, svislé, rámeček), kana dva tři krátké a řidší.
 */
let drobne: Float32Array[] | null = null;
function drobneZnaky(): Float32Array[] {
  if (drobne) return drobne;
  const r = nahoda(4242);
  drobne = Array.from({ length: 160 }, () => {
    const g = new Float32Array(16);
    const tah = (x: number, y: number, v: number) => {
      if (x >= 0 && x < 4 && y >= 0 && y < 4) g[y * 4 + x] = Math.max(g[y * 4 + x], v);
    };
    const v = () => 0.7 + 0.3 * r();
    if (r() < 0.36) {
      for (let k = 0; k < 2 + (r() < 0.45 ? 1 : 0); k++) {
        const x = cele(r, 0, 3), y = cele(r, 0, 3);
        const sikmo = r() < 0.4;
        const vod = r() < 0.5;
        for (let t = 0; t < 2; t++) tah(x + (vod || sikmo ? t : 0), y + (!vod || sikmo ? t : 0), v());
      }
    } else {
      for (let k = 0; k < cele(r, 1, 2); k++) {
        const y = cele(r, 0, 3), x0 = cele(r, 0, 1), x1 = cele(r, 2, 3);
        for (let x = x0; x <= x1; x++) tah(x, y, v());
      }
      for (let k = 0; k < cele(r, 1, 2); k++) {
        const x = cele(r, 0, 3), y0 = cele(r, 0, 1), y1 = cele(r, 2, 3);
        for (let y = y0; y <= y1; y++) tah(x, y, v());
      }
      if (r() < 0.25) for (let k = 0; k < 4; k++) tah(k % 2 ? 3 : 0, k < 2 ? 1 : 2, v());
    }
    return g;
  });
  return drobne;
}

/**
 * Velký znak vektorem (titulky, inzeráty): bezpatkové tahy v čtverci
 * o straně `vel`. Skladba jako u kanji — vlevo radikál a vpravo tělo, nebo
 * nahoře stříška a dole tělo, jinde jen pár tahů s šikmými tahy dolů.
 */
function velkyZnak(g: CanvasRenderingContext2D, x: number, y: number, vel: number, r: () => number) {
  const w = vel * 0.86;
  const ox = x + (vel - w) / 2;
  const oy = y + (vel - w) / 2;
  const cara = (x0: number, y0: number, x1: number, y1: number) => {
    g.moveTo(ox + x0 * w, oy + y0 * w);
    g.lineTo(ox + x1 * w, oy + y1 * w);
  };
  const vodorovne = (x0: number, x1: number, y0: number, y1: number, n: number) => {
    for (let k = 0; k < n; k++) {
      const yy = n === 1 ? (y0 + y1) / 2 : y0 + ((y1 - y0) * k) / (n - 1);
      cara(x0, yy, x1, yy);
    }
  };
  const telo = (x0: number, x1: number, y0: number, y1: number) => {
    const druh = r();
    if (druh < 0.3) {
      /* 口 — rámeček, uvnitř čárka */
      cara(x0, y0, x0, y1);
      cara(x1, y0, x1, y1);
      vodorovne(x0, x1, y0, y1, 2 + (r() < 0.5 ? 1 : 0));
    } else if (druh < 0.6) {
      vodorovne(x0, x1, y0, y1, cele(r, 2, 4));
      const sx = x0 + (x1 - x0) * mezi(r, 0.35, 0.65);
      cara(sx, y0 - 0.04, sx, y1 + 0.04);
    } else if (druh < 0.82) {
      vodorovne(x0, x1, y0, y0 + (y1 - y0) * 0.35, 1);
      const sx = (x0 + x1) / 2;
      cara(sx, y0, sx, y0 + (y1 - y0) * 0.45);
      cara(sx, y0 + (y1 - y0) * 0.4, x0, y1);
      cara(sx, y0 + (y1 - y0) * 0.4, x1, y1);
    } else {
      cara(x0, y0, x0, y1);
      vodorovne(x0, x1, y0, y1, 2);
      cara(x1, y0, x1 - 0.05, y1);
      cara(x0 + (x1 - x0) * 0.5, y0, x0 + (x1 - x0) * 0.5, y1);
    }
  };
  const druh = r();
  if (druh < 0.45) {
    const d = mezi(r, 0.3, 0.42);
    if (r() < 0.5) {
      /* 氵 — tři tečky */
      for (let k = 0; k < 3; k++) cara(0.04, 0.12 + k * 0.32, 0.16 + (k === 2 ? -0.06 : 0.06), 0.2 + k * 0.32 + (k === 2 ? 0.08 : 0));
    } else {
      cara(d * 0.5, 0, d * 0.5, 1);
      vodorovne(0, d, 0.25, 0.25, 1);
      cara(d * 0.5, 0.5, 0.02, 0.78);
    }
    telo(d + 0.08, 1, 0.05, 0.95);
  } else if (druh < 0.7) {
    vodorovne(0, 1, 0.12, 0.12, 1);
    cara(0.3, 0, 0.3, 0.28);
    cara(0.7, 0, 0.7, 0.28);
    telo(0.08, 0.92, 0.42, 0.98);
  } else if (druh < 0.85) {
    telo(0.05, 0.95, 0.05, 0.95);
  } else {
    /* kana — oblouky */
    g.moveTo(ox + 0.15 * w, oy + 0.25 * w);
    g.quadraticCurveTo(ox + 0.9 * w, oy + 0.05 * w, ox + 0.55 * w, oy + 0.55 * w);
    g.quadraticCurveTo(ox + 0.25 * w, oy + 0.95 * w, ox + 0.8 * w, oy + 0.92 * w);
    if (r() < 0.6) cara(0.2, 0.55, 0.65, 0.45);
  }
}

/* ═══ Noviny ═══ */

interface Clanek {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

/**
 * Arch novin 512 × 512 px — každý balík jiný podle `seme`. Text v ImageData
 * (rychle, pixel po pixelu), titulky, fotky a inzeráty vektorem násobením
 * přes papír, jak tiskařská čerň sedá na novinový papír.
 */
export function texturaNovin(seme: number): HTMLCanvasElement {
  const W = NOVINY_PX;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = W;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  const r = nahoda((seme ^ 0x2c1b3c6d) + 11);

  /* ——— Papír: zažloutlý, skvrnitý, k okrajům archu víc ——— */
  g.fillStyle = `rgb(${PAPIR})`;
  g.fillRect(0, 0, W, W);
  const skvrny = document.createElement("canvas");
  skvrny.width = skvrny.height = 20;
  const gs = skvrny.getContext("2d")!;
  for (let y = 0; y < 20; y++)
    for (let x = 0; x < 20; x++) {
      const t = r();
      gs.fillStyle = `rgba(${150 + t * 40},${120 + t * 30},${70 + t * 20},${0.05 + 0.13 * r()})`;
      gs.fillRect(x, y, 1, 1);
    }
  g.imageSmoothingEnabled = true;
  g.globalCompositeOperation = "multiply";
  g.drawImage(skvrny, -W * 0.05, -W * 0.05, W * 1.1, W * 1.1);
  for (const [x0, y0, x1, y1] of [
    [0, 0, 0, 46],
    [0, W, 0, W - 46],
    [0, 0, 46, 0],
    [W, 0, W - 46, 0],
  ]) {
    const p = g.createLinearGradient(x0, y0, x1, y1);
    p.addColorStop(0, "rgba(196,160,96,0.42)");
    p.addColorStop(1, "rgba(196,160,96,0)");
    g.fillStyle = p;
    g.fillRect(0, 0, W, W);
  }
  /* Pár hnědých skvrnek od stáří */
  for (let k = cele(r, 2, 6); k > 0; k--) {
    const x = r() * W, y = r() * W, rr = mezi(r, 3, 12);
    const p = g.createRadialGradient(x, y, 0, x, y, rr);
    p.addColorStop(0, "rgba(170,120,60,0.22)");
    p.addColorStop(1, "rgba(170,120,60,0)");
    g.fillStyle = p;
    g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
  g.globalCompositeOperation = "source-over";

  /* ——— Rozvržení strany: pásy 段, články, dole inzeráty ——— */
  const M = 15;
  const ROZTEC = 5;
  const ZNAKU = 9;
  const PAS = ZNAKU * ROZTEC + 4;
  const y0 = M + 16;
  const pasu = Math.floor((W - M - y0) / PAS);
  const yPas = (b: number) => y0 + b * PAS;
  const xL = M, xR = W - M;
  const inzeratu = r() < 0.75 ? cele(r, 2, 3) : 0;
  const clanky: Clanek[] = [];
  for (let b = 0; b < pasu - inzeratu; ) {
    const vys = Math.min(cele(r, 2, 4), pasu - inzeratu - b);
    let x = xR;
    while (x > xL + 8) {
      const sir = x - xL < 150 ? x - xL : Math.max(60, Math.round(mezi(r, 0.28, 0.6) * (xR - xL)));
      clanky.push({ x0: Math.max(xL, x - sir), x1: x, y0: yPas(b), y1: yPas(b + vys) - 4 });
      x -= sir;
    }
    b += vys;
  }

  const img = g.getImageData(0, 0, W, W);
  const d = img.data;
  const znaky = drobneZnaky();
  /** Drobný znak do pixelů: inkoust násobí papír */
  const znak = (x: number, y: number, id: number, sila: number) => {
    const z = znaky[id % znaky.length];
    for (let k = 0; k < 16; k++) {
      const a = z[k] * sila;
      if (a <= 0) continue;
      const px = x + (k & 3), py = y + (k >> 2);
      if (px < 0 || py < 0 || px >= W || py >= W) continue;
      const i = (py * W + px) * 4;
      d[i] = d[i] * (1 - a) + (d[i] * INKOUST[0] * a) / 255;
      d[i + 1] = d[i + 1] * (1 - a) + (d[i + 1] * INKOUST[1] * a) / 255;
      d[i + 2] = d[i + 2] * (1 - a) + (d[i + 2] * INKOUST[2] * a) / 255;
    }
  };
  /* Prosvítající rub strany: tentýž druh textu, slabě a jinak rozložený */
  for (let x = xR - 5; x > xL; x -= ROZTEC)
    for (let b = 0; b < pasu; b++)
      for (let k = 0; k < ZNAKU; k++) if (r() < 0.8) znak(x + 1, yPas(b) + k * ROZTEC + 2, cele(r, 0, 999), 0.07);

  /* ——— Vektorové prvky se kreslí až po textu: seznam úkolů ——— */
  const titulky: { x: number; y: number; vel: number; pocet: number; obracene: boolean; svisle: boolean; barva?: string }[] = [];
  const fotky: { x: number; y: number; w: number; h: number }[] = [];
  const rysky: [number, number, number, number][] = [];

  for (const cl of clanky) {
    const sirka = cl.x1 - cl.x0;
    const vys = cl.y1 - cl.y0;
    /* Titulek svisle u pravého kraje článku, pod ním podtitulek */
    const tVel = Math.round(mezi(r, 15, Math.min(26, sirka * 0.3)));
    const tPocet = Math.max(2, Math.min(cele(r, 3, 6), Math.floor((vys - 6) / (tVel + 2))));
    const obracene = r() < 0.22;
    titulky.push({ x: cl.x1 - tVel - 4, y: cl.y0 + 3, vel: tVel, pocet: tPocet, obracene, svisle: true });
    const pVel = 9;
    const pPocet = Math.min(cele(r, 4, 9), Math.floor((vys - 6) / (pVel + 1)));
    titulky.push({ x: cl.x1 - tVel - pVel - 9, y: cl.y0 + 4 + tVel * 0.4, vel: pVel, pocet: pPocet, obracene: false, svisle: true });
    const vyhrada = { x0: cl.x1 - tVel - pVel - 12, y1: cl.y0 + Math.max(tPocet * (tVel + 2), pPocet * (pVel + 1) + tVel * 0.4) + 6 };
    let foto: { x: number; y: number; w: number; h: number } | null = null;
    if (sirka > 110 && vys > PAS * 1.5 && r() < 0.45) {
      const fw = Math.round(sirka * mezi(r, 0.35, 0.5));
      const fh = Math.round(PAS * (r() < 0.5 ? 1 : 2) - 6);
      foto = { x: cl.x0 + 4, y: cl.y0 + 3, w: fw, h: Math.min(fh, vys - 8) };
      fotky.push(foto);
    }
    /* Tělo článku: sloupce zprava doleva v každém pásu; konec odstavce dřív, nový odsazený */
    let odsad = 0;
    for (let yb = cl.y0; yb < cl.y1 - ROZTEC * 2; yb += PAS) {
      for (let x = cl.x1 - ROZTEC - 2; x > cl.x0 + 1; x -= ROZTEC) {
        if (x > vyhrada.x0 && yb < vyhrada.y1) continue;
        if (foto && x < foto.x + foto.w + 3 && yb < foto.y + foto.h + 2) continue;
        const delka = r() < 0.12 ? cele(r, 2, ZNAKU - 1) : ZNAKU;
        for (let k = odsad; k < delka; k++) {
          const y = yb + 1 + k * ROZTEC;
          if (y + 4 > cl.y1) break;
          znak(x, y, cele(r, 0, 999), r() < 0.04 ? 0.3 : 0.74);
        }
        odsad = delka < ZNAKU ? 1 : 0;
      }
    }
    rysky.push([cl.x0 - 2, cl.y1 + 1.5, cl.x1 + 1, cl.y1 + 1.5]);
    if (cl.x0 > xL + 2) rysky.push([cl.x0 - 2, cl.y0, cl.x0 - 2, cl.y1 + 1.5]);
  }

  /* Hlavička strany: tlustá linka, číslo strany a rubrika drobně */
  for (let x = xL + 4; x < xL + 90; x += 5) znak(x, M + 3, cele(r, 0, 999), 0.85);
  for (let x = xR - 60; x < xR - 4; x += 5) znak(x, M + 3, cele(r, 0, 999), 0.85);

  /* Zrno papíru */
  for (let i = 0; i < d.length; i += 4) {
    const z = 1 + (r() - 0.5) * 0.07;
    d[i] *= z;
    d[i + 1] *= z;
    d[i + 2] *= z;
  }
  g.putImageData(img, 0, 0);

  g.globalCompositeOperation = "multiply";
  const cerna = `rgb(${INKOUST})`;
  g.strokeStyle = cerna;
  g.fillStyle = cerna;
  g.lineCap = "square";

  /* Linky mezi články a pod hlavičkou */
  g.lineWidth = 0.8;
  g.beginPath();
  for (const [a, b2, c2, e] of rysky) {
    g.moveTo(a, b2);
    g.lineTo(c2, e);
  }
  g.stroke();
  g.lineWidth = 2.2;
  g.beginPath();
  g.moveTo(xL, M + 11);
  g.lineTo(xR, M + 11);
  g.stroke();

  /* Fotky: rastr teček pod 45°, tma podle vymyšleného snímku — krajina s horou, portrét, skupina lidí, dům */
  for (const f of fotky) {
    const druh = cele(r, 0, 3);
    const horizont = mezi(r, 0.45, 0.62);
    const vrch = mezi(r, 0.25, 0.75);
    const vlny = Array.from({ length: 3 }, () => [mezi(r, 4, 11), mezi(r, 0.01, 0.035), r() * 6]);
    const stromy = Array.from({ length: cele(r, 2, 5) }, () => [r(), mezi(r, 0.04, 0.09)]);
    const lidi = druh === 2 ? cele(r, 3, 5) : 1;
    const lide = Array.from({ length: lidi }, (_, k) => [druh === 2 ? (k + 0.5 + (r() - 0.5) * 0.3) / lidi : mezi(r, 0.4, 0.6), druh === 2 ? mezi(r, 0.13, 0.17) : mezi(r, 0.2, 0.26)]);
    const okna = [cele(r, 3, 5), cele(r, 2, 4)];
    /** Měkký okraj tvaru: d < 0 uvnitř */
    const uvnitr = (d: number, w = 0.03) => 1 - hladce(-w, w, d);
    const tma = (u: number, v: number) => {
      if (druh === 0) {
        let h = horizont - 0.22 * Math.exp(-(((u - vrch) / 0.16) ** 2));
        for (const [fr, a, ph] of vlny) h += a * Math.sin(fr * u + ph);
        let t = 0.1 + 0.16 * v + (0.42 + 0.3 * (v - h)) * uvnitr(h - v, 0.02);
        for (const [x, w] of stromy) t = Math.max(t, 0.82 * uvnitr(Math.hypot((u - x) / w, (v - horizont - 0.02) / (w * 1.8)) - 1, 0.25));
        return Math.min(1, t);
      }
      if (druh === 3) {
        const dum = Math.max(Math.abs(u - 0.5) - 0.3, Math.abs(v - 0.62) - 0.3);
        let t = 0.14 + 0.1 * v + 0.6 * uvnitr(dum, 0.015);
        const strecha = v - (0.32 - 0.3 * (0.4 - Math.abs(u - 0.5)));
        t = Math.max(t, 0.85 * uvnitr(-strecha, 0.015) * uvnitr(Math.abs(u - 0.5) - 0.4, 0.015));
        const ox = (u - 0.24) * okna[0] * 2, oy = (v - 0.45) * okna[1] * 3;
        if (dum < 0 && ox > 0 && oy > 0 && ox % 2 < 0.9 && oy % 2 < 0.9) t = 0.2;
        return Math.min(1, t);
      }
      let t = 0.22 + 0.2 * v;
      for (const [x, s2] of lide) {
        const hlava = Math.hypot((u - x) / (s2 * 0.62), (v - 0.38) / (s2 * 0.8)) - 1;
        const ramena = Math.hypot((u - x) / (s2 * 1.7), (v - 1.02) / (s2 * 2.3)) - 1;
        const vlasy = Math.hypot((u - x) / (s2 * 0.66), (v - 0.31) / (s2 * 0.62)) - 1;
        t = Math.max(t, 0.55 * uvnitr(hlava, 0.08), 0.8 * uvnitr(ramena, 0.06), 0.9 * uvnitr(vlasy, 0.08) * (v < 0.36 ? 1 : 0));
      }
      return Math.min(1, t);
    };
    const roztec = 2.1;
    g.save();
    g.beginPath();
    g.rect(f.x, f.y, f.w, f.h);
    g.clip();
    g.beginPath();
    const s45 = Math.SQRT1_2;
    const dl = (f.w + f.h) * 1.2;
    for (let a = -dl; a < dl; a += roztec)
      for (let b2 = -dl; b2 < dl; b2 += roztec) {
        const x = f.x + f.w / 2 + (a - b2) * s45;
        const y = f.y + f.h / 2 + (a + b2) * s45;
        if (x < f.x - 2 || y < f.y - 2 || x > f.x + f.w + 2 || y > f.y + f.h + 2) continue;
        const t = tma((x - f.x) / f.w, (y - f.y) / f.h);
        const rr = roztec * 0.58 * Math.sqrt(t);
        if (rr < 0.25) continue;
        g.moveTo(x + rr, y);
        g.arc(x, y, rr, 0, Math.PI * 2);
      }
    g.fill();
    g.restore();
    g.lineWidth = 0.7;
    g.strokeRect(f.x + 0.5, f.y + 0.5, f.w - 1, f.h - 1);
    /* Popisek pod fotkou */
    for (let x = f.x + 2; x < f.x + f.w - 30; x += 4) {
      g.fillRect(x, f.y + f.h + 3, 3, 2.4);
    }
  }

  /* Titulky; obrácené bílé na černém bloku */
  for (const t of titulky) {
    const dl = t.pocet * (t.vel + 2);
    if (t.obracene) {
      g.globalCompositeOperation = "multiply";
      g.fillStyle = cerna;
      g.fillRect(t.x - 2, t.y - 2, t.vel + 4, dl + 2);
      g.globalCompositeOperation = "source-over";
      g.strokeStyle = `rgb(${PAPIR})`;
    } else {
      g.globalCompositeOperation = "multiply";
      g.strokeStyle = t.barva ?? cerna;
    }
    g.lineWidth = Math.max(0.9, t.vel * 0.11);
    g.beginPath();
    for (let k = 0; k < t.pocet; k++) velkyZnak(g, t.x, t.y + k * (t.vel + 2), t.vel, r);
    g.stroke();
  }
  g.globalCompositeOperation = "multiply";

  /* Inzeráty dole: rámeček (občas rumělkový), velké znaky vodorovně, kroužek, řádky drobného textu */
  if (inzeratu) {
    const iy0 = yPas(pasu - inzeratu);
    const iy1 = yPas(pasu) - 4;
    let x = xL;
    while (x < xR - 20) {
      const sir = xR - x < 140 ? xR - x : Math.round(mezi(r, 0.3, 0.55) * (xR - xL));
      const ix0 = x + 2, ix1 = Math.min(xR, x + sir) - 2;
      const rumelka = r() < 0.5;
      const barva = rumelka ? RUMELKA : cerna;
      g.strokeStyle = barva;
      g.lineWidth = 2.4;
      g.strokeRect(ix0 + 1, iy0 + 1, ix1 - ix0 - 2, iy1 - iy0 - 2);
      g.lineWidth = 0.8;
      g.strokeRect(ix0 + 5, iy0 + 5, ix1 - ix0 - 10, iy1 - iy0 - 10);
      const vel = Math.round(mezi(r, 20, Math.min(32, (iy1 - iy0) * 0.42)));
      const pocet = Math.max(1, Math.min(cele(r, 2, 5), Math.floor((ix1 - ix0 - 24) / (vel + 3))));
      g.lineWidth = vel * 0.12;
      g.strokeStyle = r() < 0.6 ? barva : cerna;
      g.beginPath();
      for (let k = 0; k < pocet; k++) velkyZnak(g, ix0 + 12 + k * (vel + 3), iy0 + 10, vel, r);
      g.stroke();
      if (r() < 0.6) {
        g.lineWidth = 2;
        g.strokeStyle = barva;
        g.beginPath();
        const kr = Math.min(16, (iy1 - iy0) * 0.22);
        g.arc(ix1 - kr - 10, iy1 - kr - 10, kr, 0, Math.PI * 2);
        g.stroke();
      }
      g.fillStyle = cerna;
      for (let yy = iy0 + vel + 18; yy < iy1 - 9; yy += 5)
        for (let xx = ix0 + 10; xx < ix1 - 44; xx += 4) if (r() < 0.86) g.fillRect(xx, yy, 3, 2.6);
      x += sir;
    }
  }
  g.globalCompositeOperation = "source-over";
  return c;
}

/* ═══ Visačka ═══ */

const fotky = new Map<string, Promise<HTMLImageElement | null>>();
function nactiFoto(url: string | undefined): Promise<HTMLImageElement | null> {
  if (!url) return Promise.resolve(null);
  let p = fotky.get(url);
  if (!p) {
    p = new Promise((hotovo) => {
      const img = new Image();
      img.decoding = "async";
      const limit = window.setTimeout(() => hotovo(null), 3000);
      img.onload = () => {
        window.clearTimeout(limit);
        hotovo(img);
      };
      img.onerror = () => {
        window.clearTimeout(limit);
        hotovo(null);
      };
      img.src = url;
    });
    fotky.set(url, p);
  }
  return p;
}

const RUKA = '"Caveat", "Segoe Print", "Bradley Hand", "Comic Sans MS", cursive';
/** Caveat ze stránky (Hlava.astro), když ho stránka má; jinak zůstane náhradní písmo */
function pripravPismo(): Promise<unknown> {
  if (typeof document === "undefined" || !document.fonts) return Promise.resolve();
  return Promise.race([Promise.all([document.fonts.load("600 120px Caveat", "0123456789"), document.fonts.load("400 26px Caveat")]).catch(() => null), new Promise((r) => window.setTimeout(r, 1500))]);
}

/** Obrys kartičky (seříznuté horní rohy) zmenšený dovnitř o `o` px */
function obrysKarticky(g: CanvasRenderingContext2D, W: number, H: number, zk: number, o: number) {
  const s = o * Math.tan(Math.PI / 8);
  g.beginPath();
  g.moveTo(zk + s, o);
  g.lineTo(W - zk - s, o);
  g.lineTo(W - o, zk + s);
  g.lineTo(W - o, H - o);
  g.lineTo(o, H - o);
  g.lineTo(o, zk + s);
  g.closePath();
}

/** Tušová kresbička tvaru, když kus nemá fotku */
function kresbaTvaru(g: CanvasRenderingContext2D, tvar: TvarBaliku, x: number, y: number, w: number, h: number) {
  g.save();
  g.translate(x + w / 2, y + h * 0.58);
  const k = Math.min(w, h) / 100;
  g.scale(k, k);
  g.strokeStyle = "rgba(42,36,30,0.85)";
  g.lineWidth = 3.2;
  g.lineCap = "round";
  g.lineJoin = "round";
  g.beginPath();
  if (tvar === "miska") {
    g.ellipse(0, -18, 40, 9, 0, 0, Math.PI * 2);
    g.moveTo(-40, -18);
    g.bezierCurveTo(-38, 14, -16, 22, 0, 22);
    g.bezierCurveTo(16, 22, 38, 14, 40, -18);
    g.moveTo(-12, 22);
    g.lineTo(-11, 28);
    g.lineTo(11, 28);
    g.lineTo(12, 22);
  } else if (tvar === "hrnek" || tvar === "cajovka") {
    g.ellipse(0, -32, 24, 6, 0, 0, Math.PI * 2);
    g.moveTo(-24, -32);
    g.bezierCurveTo(-25, 0, -23, 24, -18, 30);
    g.lineTo(18, 30);
    g.bezierCurveTo(23, 24, 25, 0, 24, -32);
    if (tvar === "hrnek") {
      g.moveTo(24, -18);
      g.bezierCurveTo(44, -20, 44, 14, 23, 12);
    }
  } else if (tvar === "vaza") {
    g.ellipse(0, -40, 9, 3, 0, 0, Math.PI * 2);
    g.moveTo(-9, -40);
    g.bezierCurveTo(-9, -22, -30, -14, -28, 8);
    g.bezierCurveTo(-26, 26, -14, 32, 0, 32);
    g.bezierCurveTo(14, 32, 26, 26, 28, 8);
    g.bezierCurveTo(30, -14, 9, -22, 9, -40);
  } else {
    g.ellipse(0, 0, 46, 13, 0, 0, Math.PI * 2);
    g.moveTo(-26, 0);
    g.ellipse(0, 0, 26, 7, 0, 0, Math.PI * 2);
  }
  g.stroke();
  g.restore();
}

/**
 * Visačka 256 × 384 px: karton, rámeček, dírka, fotka (nebo kresbička),
 * číslo a jméno. Splní se, až je fotka načtená (nebo selhala) a písmo
 * připravené.
 */
export async function texturaVisacky(kus: KusNaSatku): Promise<HTMLCanvasElement> {
  const [W, H] = VISACKA_PX;
  const [foto] = await Promise.all([nactiFoto(kus.foto), pripravPismo()]);
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const r = nahoda((kus.seme || kus.cislo * 977) + 5);
  const zk = VISACKA.zkoseni * W;

  /* Karton: krémový, zrnitý, s vlákny */
  g.fillStyle = "#EDE3CB";
  g.fillRect(0, 0, W, H);
  const img = g.getImageData(0, 0, W, H);
  for (let i = 0; i < img.data.length; i += 4) {
    const z = 1 + (r() - 0.5) * 0.05;
    img.data[i] *= z;
    img.data[i + 1] *= z;
    img.data[i + 2] *= z;
  }
  g.putImageData(img, 0, 0);
  g.lineCap = "round";
  for (let k = 0; k < 320; k++) {
    const x = r() * W, y = r() * H, a = r() * Math.PI, dl = mezi(r, 3, 13);
    g.strokeStyle = r() < 0.5 ? "rgba(255,250,236,0.55)" : "rgba(176,152,110,0.32)";
    g.lineWidth = mezi(r, 0.5, 1.1);
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a) * dl * 0.5 + mezi(r, -2, 2), y + Math.sin(a) * dl * 0.5 + mezi(r, -2, 2), x + Math.cos(a) * dl, y + Math.sin(a) * dl);
    g.stroke();
  }
  /* Ke krajům kartička trochu ztmavne (ohmataná) */
  const okraj = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.62);
  okraj.addColorStop(0, "rgba(150,120,80,0)");
  okraj.addColorStop(1, "rgba(150,120,80,0.16)");
  g.fillStyle = okraj;
  g.fillRect(0, 0, W, H);

  /* Rumělkový rámeček podél obrysu — dvojitá linka, jak bývá na 荷札 */
  g.strokeStyle = RUMELKA;
  g.lineWidth = 3;
  obrysKarticky(g, W, H, zk, 9);
  g.stroke();
  g.lineWidth = 1.2;
  obrysKarticky(g, W, H, zk, 15);
  g.stroke();

  /* Dírka s kroužkem */
  const dx = W / 2, dy = VISACKA.dirkaY * H, dr = VISACKA.dirkaR * W;
  g.fillStyle = "#D8C6A0";
  g.beginPath();
  g.arc(dx, dy, dr * 2.1, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "rgba(120,96,60,0.5)";
  g.lineWidth = 1.2;
  g.stroke();
  g.fillStyle = "#4A4036";
  g.beginPath();
  g.arc(dx, dy, dr, 0, Math.PI * 2);
  g.fill();

  /* Fotka kusu přes skoro celou šířku */
  const fx = 22, fy = 68, fw = W - 44, fh = 150;
  if (foto) {
    /* Kus stojí uprostřed snímku — výřez kolem něj, ať je na visačce velký */
    const sw = foto.naturalWidth || foto.width, sh = foto.naturalHeight || foto.height;
    const strana = Math.min(sw, sh) * 0.66;
    const vw = strana, vh = (strana * fh) / fw;
    const vx = (sw - vw) / 2, vy = Math.min(sh - vh, Math.max(0, sh * 0.53 - vh / 2));
    g.save();
    g.filter = "contrast(1.12) saturate(1.08)";
    g.drawImage(foto, vx, vy, vw, vh, fx, fy, fw, fh);
    g.restore();
  } else {
    g.fillStyle = "rgba(255,252,240,0.6)";
    g.fillRect(fx, fy, fw, fh);
    kresbaTvaru(g, kus.tvar, fx, fy, fw, fh);
  }
  g.strokeStyle = "rgba(40,34,28,0.8)";
  g.lineWidth = 2;
  g.strokeRect(fx, fy, fw, fh);

  /* Číslo rukou, velké, ať se dá přečíst i z dálky */
  g.save();
  g.translate(W / 2, 338);
  g.rotate(mezi(r, -0.06, 0.04));
  g.fillStyle = "#231D18";
  g.textAlign = "center";
  g.textBaseline = "alphabetic";
  g.font = `600 ${kus.cislo > 9 ? 128 : 150}px ${RUKA}`;
  g.fillText(String(kus.cislo), 0, 0);
  g.restore();

  /* Jméno drobně dole */
  g.fillStyle = "#4A4038";
  g.textAlign = "center";
  let vel = 25;
  g.font = `400 ${vel}px ${RUKA}`;
  while (vel > 15 && g.measureText(kus.nazev).width > W - 46) {
    vel -= 1;
    g.font = `400 ${vel}px ${RUKA}`;
  }
  g.fillText(kus.nazev, W / 2, H - 20);
  return c;
}
