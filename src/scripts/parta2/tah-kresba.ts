/**
 * Hlavička nového vzhledu: ensō v levém konci bubliny a tah, který z něj
 * vybíhá po okraji. Čistá kresba bez prohlížeče — kruh z ní vykreslí
 * HlavickaEnso.astro už při buildu, tah po okraji skript (tah.ts) podle
 * toho, jak je pruh zrovna široký.
 *
 * Bublina je stadion: dva půlkruhy spojené rovnými hranami. Kruh sedí
 * v levém půlkruhu soustředně s ním a jeho vnější hrana drží od okraje
 * bubliny všude stejnou mezeru — logo opisuje křivku pruhu. Tah začíná
 * kapkou vpravo jako ve značce, obejde kruh po směru hodin a ve dvanácti,
 * kde se už ztenčil na vlas, z kruhu neuhne: běží rovně po horní hraně,
 * obloukem vpravo (tam na něm visí zvonkohra), zpátky po spodní hraně
 * a kousek před kruhem mu dojde tuš. Kruh, který se nedotáhl — jako ve
 * značce, jen přes celou bublinu.
 *
 * Barvy: kruh je soumrak ze značky (rumělka do noci), vlas pokračuje nocí
 * a po spodní hraně se rozednívá — kolem bubliny uběhne celý den.
 *
 * Souřadnice jsou pixely bubliny, počátek v jejím levém horním rohu.
 */
import { tah, cara, rad, type Bod } from "../../components/navrhy-loga/sdilene";

/** Výška bubliny — poloměr jejích konců je polovina */
export const VYSKA = 56;
export const R0 = VYSKA / 2;
/** Mezera mezi okrajem bubliny a vnější hranou tahu */
const MEZERA = 2.5;
/** Šířka tahu tam, kde opouští kruh: vlas, kterým se maluje bublina */
const VLAS = 1.5;
/** Osa vlasu — vlas drží od okraje stejnou mezeru jako kruh */
export const OSA = MEZERA + VLAS / 2;
/** Poloměr osy v obloucích bubliny */
const RHO = R0 - OSA;
/** Kolik pixelů před spodkem kruhu vlasu dojde tuš */
const DOBEH = 22;

/** Kruh začíná kousek nad třetí hodinou jako ve značce a končí ve dvanácti */
const ZACATEK = -26;
const KONEC = 270;
const ROZSAH = KONEC - ZACATEK;
/** Měřítko proti kresbě značky (Enso.astro: viewBox 200, poloměr 68) */
const K = (RHO - 2.2) / 68;
/** Plná síla štětce — o kus subtilnější než ve značce, kruh je větší */
const W = 17 * K;

const omez = (x: number) => Math.min(1, Math.max(0, x));
const hladce = (a: number, b: number, x: number) => {
  const t = omez((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const f = (n: number) => n.toFixed(2);

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const stupnice = (zastaveni: [number, string][]) => (t: number) => {
  const x = omez(t);
  let i = 0;
  while (i < zastaveni.length - 2 && zastaveni[i + 1][0] <= x) i++;
  const [a, ca] = zastaveni[i];
  const [b, cb] = zastaveni[i + 1];
  const k = (x - a) / (b - a);
  const A = hex(ca);
  const B = hex(cb);
  return `#${A.map((v, j) => Math.round(v + (B[j] - v) * k).toString(16).padStart(2, "0")).join("")}`;
};
/** Soumrak — stejné barvy jako ensō v soumraku (navrhy-loga/Enso.astro) */
const SOUMRAK = stupnice([[0, "#C4432B"], [0.28, "#C0708A"], [0.55, "#7A5E8E"], [0.8, "#4E4A84"], [1, "#2A2C5E"]]);
/** Vlas: noc po horní hraně, kolem zvonkohry fialová, po spodní hraně svítá */
const NOC_DO_RANA = stupnice([[0, "#2A2C5E"], [0.32, "#34376F"], [0.55, "#4E4A84"], [0.76, "#7A5E8E"], [1, "#C0708A"]]);

/* ——— Kruh ——— */

/*
 * Síla tahu jako ve značce: štětec dosedne, drží a od půlky se vytahuje.
 * Tady ale nekončí suchým ocasem — ztenčí se na vlas a ten pokračuje dál,
 * proto se k němu blíží plynule, bez schodu v šířce.
 */
const sirka = (t: number) => {
  if (t < 0.05) return W * (0.62 + 0.38 * (t / 0.05));
  if (t < 0.5) return W * (1 - 0.1 * ((t - 0.05) / 0.45));
  const k = hladce(0, 1, Math.pow((t - 0.5) / 0.5, 0.8));
  return VLAS + (0.9 * W - VLAS) * (1 - k);
};
/** Ruka nevede kruh dokonale — ke dvanácté ale dýchání utichne, ať vlas naváže rovně */
const dych = (u: number, t: number) =>
  (1 - hladce(0.7, 1, t)) * (0.022 * Math.sin(rad(u) * 2 + 0.6) + 0.01 * Math.sin(rad(u) * 5 + 1.3));
/** Vnější hrana tahu drží mezeru od okraje bubliny — osa leží o půl síly dovnitř */
const polomer = (u: number, t: number) => R0 - MEZERA - sirka(t) / 2 + 0.6 * RHO * dych(u, t);
const naKruhu = (u: number, t: number): Bod => {
  const r = polomer(u, t);
  return [R0 + r * Math.cos(rad(u)), R0 + r * Math.sin(rad(u))];
};
const stred = (t: number) => naKruhu(ZACATEK + ROZSAH * t, t);

/** Rýha hlavy kruhu — vlevo dole, naproti mezeře s květem; při scrollu se točí */
const R2 = 35 * K;
const ryhaStred = (t: number): Bod => {
  const u = 62 + 150 * t;
  const r = R2 * (1 + 0.03 * Math.sin(rad(u) * 3));
  return [R0 + r * Math.cos(rad(u)), R0 + r * Math.sin(rad(u))];
};
const ryhaSirka = (t: number) => (0.6 + 4.4 * Math.pow(Math.sin(Math.PI * t), 0.6) * (1 - 0.35 * t)) * K;

export function kruh() {
  /** Kapka, kde štětec dosedl — o kousek za začátkem tahu */
  const [ax, ay] = stred(0);
  const [bx, by] = stred(0.01);
  const smer = Math.atan2(by - ay, bx - ax);
  const kapka = {
    x: f(ax - Math.cos(smer) * 1.6 * K),
    y: f(ay - Math.sin(smer) * 1.6 * K),
    rx: f(W * 0.6),
    ry: f(W * 0.53),
    uhel: ((smer * 180) / Math.PI).toFixed(1),
  };

  /* SVG neumí kruhový přechod — kruh se vybarví úzkými výsečemi kolem středu.
     Mezeru s květem (t > 1) dostane konec noci a kapku před začátkem rumělka. */
  const VYSECI = 90;
  const vysece = Array.from({ length: VYSECI }, (_, i) => {
    const a0 = (i / VYSECI) * 360;
    const a1 = ((i + 1.15) / VYSECI) * 360;
    const t = (((((a0 + a1) / 2 - ZACATEK) % 360) + 360) % 360) / ROZSAH;
    const p = (u: number) => `${f(R0 + 40 * Math.cos(rad(u)))} ${f(R0 + 40 * Math.sin(rad(u)))}`;
    return { d: `M${R0} ${R0} L${p(a0)} A40 40 0 0 1 ${p(a1)} Z`, barva: SOUMRAK(t > 1 ? (t < 1.08 ? 1 : 0) : t) };
  });

  /** Květ v mezeře mezi vlasem nahoře a kapkou */
  const uKvetu = 306;
  const kvet = { x: f(R0 + 0.87 * RHO * Math.cos(rad(uKvetu))), y: f(R0 + 0.87 * RHO * Math.sin(rad(uKvetu))) };
  /** Kam dopadne plátek, když tah doběhne — dovnitř kruhu pod květ */
  const volny = { x: 36, y: 22 };

  return {
    tah: tah(stred, sirka, 200),
    kapka,
    ryha: tah(ryhaStred, ryhaSirka, 70),
    /** Osa pro odkrývání při úvodním kreslení — o kousek delší na začátku */
    odhal: cara(Array.from({ length: 121 }, (_, i) => {
      const t = -0.04 + (1.04 * i) / 120;
      return naKruhu(ZACATEK + ROZSAH * t, omez(t));
    })),
    odhalRyha: cara(Array.from({ length: 61 }, (_, i) => ryhaStred(-0.03 + (1.06 * i) / 60))),
    sirkaOdhalu: f(W * 1.9),
    vysece,
    kvet,
    /** Plátky květu v pixelech na jednotku kresby plátku (sdilene.ts) */
    kvetMeritko: 0.36,
    volny,
    volnyPosun: { dx: f(Number(kvet.x) - volny.x), dy: f(Number(kvet.y) - volny.y) },
  };
}

/* ——— Vlas po okraji bubliny ——— */

export interface Prechod {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  zastaveni: [number, string][];
}

export interface TahBublinou {
  /** Délka vlasu od dvanácté hodiny kruhu po místo, kde dojde tuš */
  delka: number;
  /** Vlas ve třech kusech (horní hrana, pravý oblouk, spodní hrana), každý s vlastním přechodem */
  kusy: { d: string; prechod: Prechod }[];
  /** Osa vlasu — po ní se vlas odkrývá */
  osa: string;
  /** Suchý štětec: tenké mezery v posledních centimetrech vlasu */
  struhy: { d: string; sirka: number; carky: string }[];
  /** Kolik pixelů od kruhu je vlas, když prochází nad místem x horní hrany */
  delkaNad: (x: number) => number;
}

export function tahBublinou(sirkaBubliny: number): TahBublinou {
  const vpravo = sirkaBubliny - R0;
  const horni = Math.max(0, vpravo - R0);
  const oblouk = Math.PI * RHO;
  const konecX = R0 + DOBEH;
  const dolni = Math.max(0, vpravo - konecX);
  const L = horni + oblouk + dolni;

  const bod = (s: number): Bod => {
    if (s <= horni) return [R0 + s, OSA];
    if (s <= horni + oblouk) {
      const u = -90 + ((s - horni) / oblouk) * 180;
      return [vpravo + RHO * Math.cos(rad(u)), R0 + RHO * Math.sin(rad(u))];
    }
    return [vpravo - (s - horni - oblouk), VYSKA - OSA];
  };
  const smer = (s: number): Bod => {
    const [xa, ya] = bod(Math.max(0, s - 0.5));
    const [xb, yb] = bod(Math.min(L, s + 0.5));
    const d = Math.hypot(xb - xa, yb - ya) || 1;
    return [(xb - xa) / d, (yb - ya) / d];
  };
  /** Vlas na začátku drží sílu konce kruhu, pak jemně dýchá a na konci se vytáhne do špičky */
  const sila = (s: number) => {
    const vlna = 0.09 * Math.sin(s / 53 + 1.1) + 0.05 * Math.sin(s / 23 + 0.3);
    return VLAS * (1 + vlna * hladce(0, 50, s)) * (1 - 0.78 * hladce(L - 64, L, s));
  };
  const obrys = (s0: number, s1: number) => {
    const levy: Bod[] = [];
    const pravy: Bod[] = [];
    const kroku = Math.max(2, Math.ceil((s1 - s0) / 3));
    for (let i = 0; i <= kroku; i++) {
      const s = s0 + ((s1 - s0) * i) / kroku;
      const [x, y] = bod(s);
      const [tx, ty] = smer(s);
      const w = sila(s) / 2;
      levy.push([x - ty * w, y + tx * w]);
      pravy.push([x + ty * w, y - tx * w]);
    }
    return `${cara(levy)} L${pravy.reverse().map(([x, y]) => `${f(x)} ${f(y)}`).join(" L")} Z`;
  };
  const barva = (s: number) => NOC_DO_RANA(s / L);
  const zastaveni = (kroku: number, kde: (k: number) => [number, number]) =>
    Array.from({ length: kroku + 1 }, (_, i) => {
      const [offset, s] = kde(i / kroku);
      return [Number(offset.toFixed(4)), barva(s)] as [number, string];
    });

  /* Kusy se o kousek překrývají, ať mezi nimi neprosvítá šev */
  const P = 0.6;
  const kusy = [
    {
      d: obrys(0, Math.min(L, horni + P)),
      prechod: { x1: R0, y1: 0, x2: vpravo, y2: 0, zastaveni: zastaveni(10, (k) => [k, k * horni]) },
    },
    {
      d: obrys(Math.max(0, horni - P), Math.min(L, horni + oblouk + P)),
      /* Oblouk barví svislý přechod — zastavení leží tam, kde oblouk prochází výškou */
      prechod: {
        x1: 0,
        y1: OSA,
        x2: 0,
        y2: VYSKA - OSA,
        zastaveni: zastaveni(12, (k) => [(1 + Math.sin(rad(-90 + 180 * k))) / 2, horni + k * oblouk]),
      },
    },
    {
      d: obrys(Math.max(0, horni + oblouk - P), L),
      prechod: { x1: vpravo, y1: 0, x2: konecX, y2: 0, zastaveni: zastaveni(10, (k) => [k, horni + oblouk + k * dolni]) },
    },
  ];

  const struha = (o: number, od: number) => {
    const body: Bod[] = [];
    for (let s = od; s < L + 2; s += 2) {
      const [x, y] = bod(Math.min(L, s));
      const [tx, ty] = smer(Math.min(L, s));
      body.push([x - ty * o, y + tx * o]);
    }
    return cara(body);
  };

  return {
    delka: L,
    kusy,
    osa: `M${R0} ${f(OSA)} H${f(vpravo)} A${f(RHO)} ${f(RHO)} 0 0 1 ${f(vpravo)} ${f(VYSKA - OSA)} H${f(konecX)}`,
    struhy: [
      { d: struha(-0.32, L - 80), sirka: 0.28, carky: "14 1.6 9 2.4 20 1.4 6 3" },
      { d: struha(0.36, L - 60), sirka: 0.26, carky: "7 2.2 16 1.8 5 2.6 11 3" },
    ],
    delkaNad: (x: number) => {
      if (x <= vpravo) return Math.max(0, x - R0);
      const u = -Math.acos(Math.min(1, (x - vpravo) / RHO)) * (180 / Math.PI);
      return horni + ((u + 90) / 180) * oblouk;
    },
  };
}

/* ——— Aktuální stránka v menu ——— */

/**
 * Zvýraznění aktuální stránky: šmouha suchým štětcem pod nápisem. Není to
 * vyplněný tvar, ale svazek chlupů štětce: každý je tenký tah, který se na
 * obou koncích zúží do špičky, a má vlastní začátek a konec. Krajní vlákna jsou kratší, takže se konce
 * šmouhy roztřepí, a některá se těsně před koncem přetrhnou a nechají za
 * sebou odtržený kousek — jako když štětci dochází barva. Uprostřed se
 * chlupy překrývají do plné barvy.
 *
 * Kreslí se do viewBoxu 100 × 40, který se roztáhne na šířku odkazu
 * (preserveAspectRatio="none"); výška zůstává, vlákna se jen prodlouží.
 */
export function zvyrazneni() {
  /* Pevná „náhoda“ — šmouha vyjde při každém buildu stejně */
  const nah = (i: number, k: number) => {
    const s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
    return s - Math.floor(s);
  };
  const VLAKEN = 30;
  const NAHORE = 8;
  const VYSKA_SMOUHY = 24;
  /** Jeden chlup: tenký tah, který se na obou koncích zúží do špičky */
  const chlup = (y0: number, i: number, od: number, po: number, sila: number) => {
    const delka = po - od;
    const nabeh = Math.min(5, delka * 0.3);
    return tah(
      (t) => {
        const x = od + delka * t;
        return [x, y0 + 0.45 * Math.sin(x * 0.045 + i * 0.7) + 0.6 * (nah(i, 12) - 0.5) * t];
      },
      (t) => {
        const x = delka * t;
        return sila * Math.min(1, x / nabeh, (delka - x) / (nabeh * 1.6)) ** 0.7;
      },
      Math.max(6, Math.ceil(delka / 3)),
    );
  };
  const vlakna: string[] = [];
  for (let i = 0; i < VLAKEN; i++) {
    const v = i / (VLAKEN - 1);
    const okraj = Math.abs(2 * v - 1);
    const y0 = NAHORE + VYSKA_SMOUHY * v + 0.4 * (nah(i, 13) - 0.5);
    const od = 3 + 8 * okraj ** 2.2 + 6 * nah(i, 1);
    const po = 98.5 - 13 * okraj ** 1.6 - 8 * nah(i, 2);
    const sila = (1.3 + 0.8 * nah(i, 3)) * (1 - 0.35 * okraj);
    /* Některá vlákna se před koncem přetrhnou — zbyde odtržený kousek */
    if (nah(i, 4) > 0.6) {
      const mezera = 1.5 + 3.5 * nah(i, 5);
      const kus = 4 + 8 * nah(i, 6);
      vlakna.push(chlup(y0, i, od, po - kus - mezera, sila));
      vlakna.push(chlup(y0, i, po - kus, po, sila * 0.75));
    } else vlakna.push(chlup(y0, i, od, po, sila));
    /* Na levém konci tu a tam chlup, který dosedl dřív */
    if (nah(i, 10) > 0.7) vlakna.push(chlup(y0, i, od - 5 - 4 * nah(i, 11), od + 2, sila * 0.6));
  }
  /* Pár vlásků, které ujely za šmouhu */
  for (const [y0, od, po] of [[12.5, 88, 99.5], [21, 91, 99], [27.5, 84, 96]] as const) {
    vlakna.push(chlup(y0, y0, od, po, 0.55));
  }
  return {
    vlakna,
    /** Odkrývání zleva doprava — široký tah přes celou výšku */
    osa: "M-6 20 H106",
  };
}
