/**
 * Krámek na úvodu jako rozsypané střepy (components/domek2/VKramku.astro).
 * Žádný jeden talíř ani rámečky: náhodné kousky různých velikostí, každý
 * jen glazura nebo obrázek a pod ním měkký stín, žádné obrysy. Jeden
 * obrázek se může rozlomit na víc střepů — kusy leží kousek od sebe
 * a trochu pootočené, ale pořád je poznat, co na nich bylo:
 *
 *   text     jeden velký krémový střep vlevo, na něm leží HTML text
 *   kramek   fotka živého nočního krámku z /obchod (lampiony, zboží, světla)
 *   futatsu  podpisový hrnek
 *   hagi     miska z Japonska
 *   drobky   pár malých střepů kolem (glazura, kus modrého vzoru)
 *
 * Každý prvek je nepravidelná hrouda rozlámaná jako Voronoi (náhoda
 * s pevným semenem, kresba je při každém buildu stejná); mezi kusy je
 * všude stejná mezera (MEZERA), kterou prosvítá pozadí.
 * Po najetí na obrázek se celý nadzvedne (styles/uvod-ochutnavky.css).
 */
export const STREPY = { w: 1400, h: 800 };
const { w: W, h: H } = STREPY;

type Bod = [number, number];
type Mnohouhelnik = Bod[];

function nahoda(seme: number) {
  let s = seme;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

const teziste = (b: Mnohouhelnik): Bod => {
  let a = 0, x = 0, y = 0;
  for (let i = 0; i < b.length; i++) {
    const [x0, y0] = b[i], [x1, y1] = b[(i + 1) % b.length];
    const f = x0 * y1 - x1 * y0;
    a += f;
    x += (x0 + x1) * f;
    y += (y0 + y1) * f;
  }
  return Math.abs(a) < 1e-6 ? b[0] : [x / (3 * a), y / (3 * a)];
};
const plocha = (b: Mnohouhelnik) => {
  let a = 0;
  for (let i = 0; i < b.length; i++) a += b[i][0] * b[(i + 1) % b.length][1] - b[(i + 1) % b.length][0] * b[i][1];
  return Math.abs(a / 2);
};

/** Rozřízne konvexní mnohoúhelník přímkou bodem c pod úhlem u */
function rez(b: Mnohouhelnik, c: Bod, u: number): [Mnohouhelnik, Mnohouhelnik] {
  const n: Bod = [-Math.sin(u), Math.cos(u)];
  const s = (p: Bod) => (p[0] - c[0]) * n[0] + (p[1] - c[1]) * n[1];
  const a: Mnohouhelnik = [], z: Mnohouhelnik = [];
  for (let i = 0; i < b.length; i++) {
    const p = b[i], q = b[(i + 1) % b.length];
    const sp = s(p), sq = s(q);
    (sp >= 0 ? a : z).push(p);
    if ((sp >= 0) !== (sq >= 0)) {
      const t = sp / (sp - sq);
      const x: Bod = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
      a.push(x);
      z.push(x);
    }
  }
  return [a, z];
}

/** Hrany do zubů: každou hranu rozdělí a body odsune kolmo do strany */
function zuby(b: Mnohouhelnik, R: () => number, krok = 26, amp = 6): Mnohouhelnik {
  const out: Mnohouhelnik = [];
  for (let i = 0; i < b.length; i++) {
    const p = b[i], q = b[(i + 1) % b.length];
    out.push(p);
    const d = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (d < 1) continue;
    const k = Math.floor(d / krok);
    const nx = -(q[1] - p[1]) / d, ny = (q[0] - p[0]) / d;
    for (let j = 1; j < k; j++) {
      const t = (j + (R() - 0.5) * 0.5) / k;
      const o = (R() - 0.5) * 2 * amp;
      out.push([p[0] + (q[0] - p[0]) * t + nx * o, p[1] + (q[1] - p[1]) * t + ny * o]);
    }
  }
  return out;
}

interface Kus { body: Mnohouhelnik; dx: number; dy: number; r: number; cx: number; cy: number }

const TAU = Math.PI * 2;

/**
 * Nepravidelná hrouda vepsaná do obdélníku: body po superelipse s náhodným
 * poloměrem. `mocnina` 2 je elipsa, 4 skoro obdélník se zaoblenými rohy —
 * do té se vejde celý produkt z fotky.
 */
function hrouda(x: number, y: number, w: number, h: number, R: () => number, min = 0.6, mocnina = 2, n = 12): Mnohouhelnik {
  const cx = x + w / 2, cy = y + h / 2, a0 = R() * TAU;
  return Array.from({ length: n }, (_, i): Bod => {
    const a = a0 + ((i + (R() - 0.5) * 0.6) / n) * TAU;
    const c = Math.cos(a), si = Math.sin(a);
    const k = 1 / Math.pow(Math.pow(Math.abs(c), mocnina) + Math.pow(Math.abs(si), mocnina), 1 / mocnina);
    const r = (min + (1 - min) * R()) * k;
    return [cx + (c * w * r) / 2, cy + (si * h * r) / 2];
  });
}

/**
 * Voronoi s mezerou: pro každé semeno kus hroudy, který je mu blíž než
 * ostatním semenům, a dělicí čára se k němu posune o půl mezery. Mezi
 * sousedními kusy je tak všude stejně široká mezera.
 */
function bunky(b: Mnohouhelnik, semena: Bod[], mezera: number): Mnohouhelnik[] {
  return semena
    .map((s, i) => {
      let kus = b;
      semena.forEach((t, j) => {
        if (i === j || kus.length < 3) return;
        const d = Math.hypot(s[0] - t[0], s[1] - t[1]);
        const m: Bod = [(s[0] + t[0]) / 2 + ((s[0] - t[0]) / d) * (mezera / 2), (s[1] + t[1]) / 2 + ((s[1] - t[1]) / d) * (mezera / 2)];
        const u = Math.atan2(t[1] - s[1], t[0] - s[0]) + Math.PI / 2;
        const [a, z] = rez(kus, m, u);
        const strana = (s[0] - m[0]) * -Math.sin(u) + (s[1] - m[1]) * Math.cos(u);
        kus = strana >= 0 ? a : z;
      });
      return kus;
    })
    .filter((k) => k.length >= 3 && plocha(k) > 300);
}

/** Mezera mezi střepy jednoho prvku (v jednotkách kresby, asi 4 px na šířku 1300 px) */
const MEZERA = 4.5;

/** Rozbitý prvek: obrys hroudy a praskliny uvnitř (cesty pro masku) */
interface Rozbity { obrys: Mnohouhelnik; praskliny: string[] }

/** Vzdálenost bodu od úsečky */
const odUsecky = (p: Bod, a: Bod, b: Bod) => {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dy * t);
};

/**
 * Rozlámaná hrouda: ulomený okraj do zubů, uvnitř Voronoi lomy. Lomy jsou
 * zalomené čáry; do masky se kreslí černě s tloušťkou MEZERA, takže obě
 * strany praskliny do sebe přesně zapadají a mezera je všude stejná.
 * Sdílená hrana dvou kusů se zalomí stejně z obou stran — náhoda je
 * odvozená z jejích (zaokrouhlených) konců — a kreslí se jen jednou.
 */
function strepiny(x: number, y: number, w: number, h: number, kolik: number, seme: number, min = 0.62, mocnina = 2): Rozbity {
  const R = nahoda(seme);
  const obrys = zuby(hrouda(x, y, w, h, R, min, mocnina), R, 30, 5);
  const semena: Bod[] = [];
  const minD = Math.sqrt((w * h) / kolik) * 0.6;
  for (let pokus = 0; semena.length < kolik && pokus < 800; pokus++) {
    const p: Bod = [x + w * (0.1 + 0.8 * R()), y + h * (0.1 + 0.8 * R())];
    if (semena.every((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) > minD)) semena.push(p);
  }
  const naObrysu = (p: Bod) => obrys.some((a, i) => odUsecky(p, a, obrys[(i + 1) % obrys.length]) < 0.6);
  const klic = (p: Bod) => `${Math.round(p[0])},${Math.round(p[1])}`;
  const hotove = new Set<string>();
  const praskliny: string[] = [];
  for (const kus of bunky(obrys, semena, 0)) {
    for (let i = 0; i < kus.length; i++) {
      let a = kus[i], b = kus[(i + 1) % kus.length];
      const delka = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (delka < 2) continue;
      /* hrana po okraji hroudy není prasklina */
      if (naObrysu([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2])) continue;
      if (klic(a) > klic(b)) [a, b] = [b, a];
      const k = `${klic(a)}|${klic(b)}`;
      if (hotove.has(k)) continue;
      hotove.add(k);
      /* zalomení: pár bodů odsunutých kolmo, z obou stran stejně */
      let semeno = 7;
      for (const c of k) semeno = (semeno * 31 + c.charCodeAt(0)) % 2147483646;
      const Z = nahoda(semeno + 1);
      const nx = -(b[1] - a[1]) / delka, ny = (b[0] - a[0]) / delka;
      const usek = Math.max(2, Math.round(delka / 24));
      const amp = Math.min(6, delka * 0.07);
      let d = `M${a[0].toFixed(1)} ${a[1].toFixed(1)}`;
      for (let j = 1; j < usek; j++) {
        const t = (j + (Z() - 0.5) * 0.6) / usek;
        const o = (Z() - 0.5) * 2 * amp;
        d += ` L${(a[0] + (b[0] - a[0]) * t + nx * o).toFixed(1)} ${(a[1] + (b[1] - a[1]) * t + ny * o).toFixed(1)}`;
      }
      praskliny.push(`${d} L${b[0].toFixed(1)} ${b[1].toFixed(1)}`);
    }
  }
  return { obrys, praskliny };
}

/* ——— Rozvržení ——— */
const TEXT = { x: 40, y: 96, w: 600, h: 640 };
/* Textový střep je ručně: velký nepravidelný sedmiúhelník, do kterého se vejde obdélník s textem */
const TEXT_KUS: Kus = (() => {
  const R = nahoda(5);
  const b = zuby([[70, 176], [318, 92], [612, 150], [648, 432], [584, 712], [262, 742], [40, 566]], R, 46, 4);
  const [cx, cy] = teziste(b);
  return { body: b, dx: 0, dy: 0, r: -2.2, cx, cy };
})();
const KRAMEK = { x: 676, y: 16, w: 710, h: 440 };
const FUTATSU = { x: 664, y: 462, w: 330, h: 330 };
const HAGI = { x: 1016, y: 478, w: 370, h: 310 };

const kramekKusy = strepiny(KRAMEK.x, KRAMEK.y, KRAMEK.w, KRAMEK.h, 8, 23, 0.72, 3);
/* produkty: skoro obdélníková hrouda, ať je na střepech celý kus */
const futatsuKusy = strepiny(FUTATSU.x, FUTATSU.y, FUTATSU.w, FUTATSU.h, 5, 41, 0.9, 4);
const hagiKusy = strepiny(HAGI.x, HAGI.y, HAGI.w, HAGI.h, 5, 67, 0.9, 4);

type Glazura = "shino" | "indigo" | "rez" | "vzor";
/** Drobky: malé ulomené kousky, každý s vlastní glazurou */
const drobky: { kus: Kus; glazura: Glazura }[] = (() => {
  const R = nahoda(97);
  const mista: [number, number, number, Glazura][] = [
    [612, 742, 34, "indigo"], [26, 40, 46, "vzor"], [1376, 470, 28, "rez"], [652, 470, 22, "shino"], [600, 40, 30, "rez"], [36, 744, 38, "shino"], [1300, 784, 26, "vzor"],
  ];
  return mista.map(([x, y, s, glazura]) => {
    const n = 4 + Math.floor(R() * 3);
    const b: Mnohouhelnik = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + R() * 0.6;
      const rr = s * (0.6 + R() * 0.5);
      b.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.8]);
    }
    return { kus: { body: b, dx: 0, dy: 0, r: (R() - 0.5) * 40, cx: x, cy: y }, glazura };
  });
})();

const body = (b: Mnohouhelnik) => b.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
const pr = (v: number, z: number) => +((v / z) * 100).toFixed(3);

/** Kam HTML položí text (obdélník na textovém střepu) a cenovky, v procentech plochy */
export function rozvrzeni() {
  const box = { x: 150, y: 200, w: 410, h: 420 };
  return {
    text: {
      left: pr(box.x, W), top: pr(box.y, H), width: pr(box.w, W), height: pr(box.h, H), r: TEXT_KUS.r,
      ox: pr(TEXT_KUS.cx - box.x, box.w), oy: pr(TEXT_KUS.cy - box.y, box.h),
    },
    futatsu: { left: pr(FUTATSU.x + FUTATSU.w * 0.5, W), top: pr(FUTATSU.y + FUTATSU.h + 4, H), r: -3 },
    hagi: { left: pr(HAGI.x + HAGI.w * 0.55, W), top: pr(HAGI.y + HAGI.h + 2, H), r: 3 },
  };
}

export interface Obrazky {
  /** Fotka živého krámku z /obchod (scripts/kramek-uvod-foto.mjs), 16 : 10 */
  kramek: string;
  futatsu: string;
  hagi: string;
}

export function strepy(p: string, img: Obrazky) {
  const R = nahoda(11);
  let krakele = "";
  for (let i = 0; i < 40; i++) {
    let x = TEXT.x + R() * TEXT.w, y = TEXT.y + R() * TEXT.h;
    let d = `M${x.toFixed(1)} ${y.toFixed(1)}`;
    for (let j = 0; j < 3; j++) {
      x += (R() - 0.5) * 56;
      y += (R() - 0.5) * 56;
      d += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    krakele += `<path d="${d}"/>`;
  }

  const defs =
    `<radialGradient id="${p}-shino" cx="0.35" cy="0.3" r="0.9"><stop offset="0" stop-color="#FBF6EC"/><stop offset="0.6" stop-color="#F1E7D6"/><stop offset="1" stop-color="#E0D0B5"/></radialGradient>` +
    `<linearGradient id="${p}-lesk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.28"/><stop offset="0.3" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>` +
    `<pattern id="${p}-vzor" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(18)"><rect width="22" height="22" fill="#F4EEE2"/><circle cx="11" cy="11" r="6" fill="none" stroke="#2F4F9A" stroke-width="2.4"/><circle cx="11" cy="11" r="1.8" fill="#2F4F9A"/></pattern>` +
    `<filter id="${p}-stin" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="5"/></filter>`;

  let n = 0;
  /** Jeden střep: stín, lom hlíny (tloušťka), plocha oříznutá na tvar, lesk */
  const strep = (k: Kus, vypln: string, trida = "") => {
    const id = `${p}-k${n++}`;
    const pts = body(k.body);
    return (
      `<g class="${p}-kus ${trida}" style="--dx:${k.dx.toFixed(1)}px;--dy:${k.dy.toFixed(1)}px;--r:${k.r.toFixed(2)}deg;transform-origin:${k.cx.toFixed(1)}px ${k.cy.toFixed(1)}px">` +
      `<clipPath id="${id}"><polygon points="${pts}"/></clipPath>` +
      `<polygon points="${pts}" transform="translate(3 8)" fill="#1E1230" opacity="0.28" filter="url(#${p}-stin)"/>` +
      `<g clip-path="url(#${id})">${vypln}<rect width="${W}" height="${H}" fill="url(#${p}-lesk)"/></g>` +
      `</g>`
    );
  };

  /* Krámek: fotka 16 : 10 zvětšená tak, aby průčelí うつわ屋 i s cedulí sedělo doprostřed oblasti */
  const kW = 980, kH = kW / 1.6;
  const kX = KRAMEK.x + KRAMEK.w / 2 - kW * 0.53, kY = KRAMEK.y + KRAMEK.h / 2 - kH * 0.5;
  const kramekVypln =
    `<rect width="${W}" height="${H}" fill="#2B2F5E"/>` +
    `<image href="${img.kramek}" x="${kX}" y="${kY}" width="${kW}" height="${kH}"/>`;
  const fS = 290;
  const futatsuVypln = `<rect width="${W}" height="${H}" fill="#EDE3D1"/><image href="${img.futatsu}" x="${FUTATSU.x + FUTATSU.w / 2 - fS / 2}" y="${FUTATSU.y + FUTATSU.h / 2 - fS / 2}" width="${fS}" height="${fS}"/>`;
  const hS = 540;
  const hagiVypln = `<rect width="${W}" height="${H}" fill="#3E6E73"/><image href="${img.hagi}" x="${HAGI.x + HAGI.w / 2 - hS * 0.46}" y="${HAGI.y + HAGI.h / 2 - hS * 0.5}" width="${hS}" height="${hS}"/>`;
  const textVypln =
    `<rect width="${W}" height="${H}" fill="url(#${p}-shino)"/>` +
    `<g fill="none" stroke="#9C8668" stroke-width="0.8" opacity="0.32">${krakele}</g>` +
    /* kus modrého pruhu po okraji talíře, ze kterého střep je */
    `<path d="M${TEXT.x - 20} ${TEXT.y + TEXT.h - 70} Q${TEXT.x + TEXT.w * 0.5} ${TEXT.y + TEXT.h + 10} ${TEXT.x + TEXT.w + 30} ${TEXT.y + TEXT.h - 110}" fill="none" stroke="#2F4F9A" stroke-width="16" opacity="0.85"/>` +
    `<path d="M${TEXT.x - 20} ${TEXT.y + TEXT.h - 96} Q${TEXT.x + TEXT.w * 0.5} ${TEXT.y + TEXT.h - 16} ${TEXT.x + TEXT.w + 30} ${TEXT.y + TEXT.h - 136}" fill="none" stroke="#2F4F9A" stroke-width="2.5" opacity="0.7"/>` +
    `<text class="${p}-znak" x="${TEXT.x + TEXT.w / 2}" y="${TEXT.y + TEXT.h / 2 + 90}" text-anchor="middle" font-size="260" fill="#C9B79A" opacity="0.35">器</text>`;
  const glazury: Record<Glazura, string> = {
    shino: `<rect width="${W}" height="${H}" fill="url(#${p}-shino)"/>`,
    indigo: `<rect width="${W}" height="${H}" fill="#2B3C7A"/>`,
    rez: `<rect width="${W}" height="${H}" fill="#B9582B"/>`,
    vzor: `<rect width="${W}" height="${H}" fill="url(#${p}-vzor)"/>`,
  };

  /** Rozbitý obrázek: maska = obrys hroudy bez prasklin, pod tím stín; celý prvek je odkaz */
  const skupina = (r: Rozbity, vypln: string, odkaz: { href: string; label: string }, trida: string) => {
    const id = `${p}-m${n++}`;
    const pts = body(r.obrys);
    return (
      `<a href="${odkaz.href}" aria-label="${odkaz.label}" class="${p}-odkaz ${trida}"><g class="${p}-prvek">` +
      `<mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">` +
      `<polygon points="${pts}" fill="#fff"/>` +
      `<g fill="none" stroke="#000" stroke-width="${MEZERA}" stroke-linejoin="round" stroke-linecap="round">${r.praskliny.map((d) => `<path d="${d}"/>`).join("")}</g>` +
      `</mask>` +
      /* stín jen kolem hroudy, ne v prasklinách — tam má prosvítat čisté pozadí */
      `<mask id="${id}-s" maskUnits="userSpaceOnUse" x="-40" y="-40" width="${W + 80}" height="${H + 80}"><rect x="-40" y="-40" width="${W + 80}" height="${H + 80}" fill="#fff"/><polygon points="${pts}" fill="#000"/></mask>` +
      `<g mask="url(#${id}-s)"><polygon points="${pts}" transform="translate(3 8)" fill="#1E1230" opacity="0.28" filter="url(#${p}-stin)"/></g>` +
      `<g mask="url(#${id})">${vypln}<rect width="${W}" height="${H}" fill="url(#${p}-lesk)"/></g>` +
      `</g></a>`
    );
  };

  return (
    `<defs>${defs}</defs>` +
    drobky.map((d) => strep(d.kus, glazury[d.glazura], `${p}-drobek`)).join("") +
    strep(TEXT_KUS, textVypln, `${p}-textovy`) +
    skupina(kramekKusy, kramekVypln, { href: "/obchod", label: "Noční krámek うつわ屋 — vejít do krámku" }, `${p}-kramek`) +
    skupina(hagiKusy, hagiVypln, { href: "/obchod", label: "Miska Hagi z Japonska — v krámku" }, `${p}-hagi`) +
    skupina(futatsuKusy, futatsuVypln, { href: "/obchod/futatsu", label: "Futatsu, podpisový hrnek dílny" }, `${p}-futatsu`)
  );
}
