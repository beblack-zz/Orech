/**
 * Míry úvodu O nás 2 — „Svět v kapce“. Jeviště je čtverec 1000 × 1000,
 * osa kapky leží na x = 500 a CSS jeviště staví na výšku sekce a posouvá
 * tak, aby osa padla na --kx (onas2.css). Trubka, kapka, svět v kapce,
 * hladina i skript, který kapku pouští (scripts/onas2/pocatek.ts), kreslí
 * ze stejných čísel — proto je tu i tvar kapky: build z něj nakreslí
 * visící kapku a skript ji podle něj nafukuje, škrtí a nechává padat.
 *
 * Hladina je v perspektivě. Oko je kousek nad vodou (výška KAMERA_H),
 * obzor leží na OBZOR_Y a kapka dopadne do hloubky DOPAD_Z — kruhy se
 * proto vzadu tisknou k obzoru a vpředu utíkají pod okraj obrazovky.
 * Jednotky světa: kapka má poloměr asi 0,8 (KAPKA_R / meritko(DOPAD_Z)),
 * kruhy jsou elipsy zhruba 1 : 6 a korunka se k oku zvětší asi o polovinu.
 */

export type Bod = [number, number];

/** Čísla do SVG na desetiny — kratší cesty a stejný výsledek při každém buildu */
export const f = (n: number) => (Math.round(n * 10) / 10).toString();

export const JEVISTE = 1000;
/** Svislá osa kapky (prasklina, dopad, ensō) */
export const OSA_X = 500;
/** Trubka pod stropem garáže — osa a poloměr */
export const TRUBKA_Y = 196;
export const TRUBKA_R = 32;
/** Kde z trubky kape — spodek trubky na ose */
export const PRASKLINA_Y = TRUBKA_Y + TRUBKA_R;
/** Kde na trubce stojí Kapka (střed chodidel, x) — vlevo od praskliny */
export const KAPKA_KAMI_X = 352;
/** Baňka plné visící kapky */
export const KAPKA_R = 156;
/** Kruh světa uvnitř baňky — kolem něj je tmavý lem, kde se světlo láme pryč */
export const SVET_R = 134;

/** Hladina v perspektivě */
export const OBZOR_Y = 716;
export const OHNISKO = 1200;
export const KAMERA_H = 1;
export const DOPAD_Z = 6;
export const DOPAD_Y = OBZOR_Y + (OHNISKO * KAMERA_H) / DOPAD_Z;

/**
 * Ensō za kapkou jako slunce na obzoru — střed a poloměr kruhu tahu
 * (Enso.astro má kruh R = 68 v rámečku 200, tah široký 19, takže spodek
 * tahu právě dosedne na obzor). Ve vodě pod ním je jeho odraz.
 */
export const ENSO_Y = 456;
export const ENSO_R = 236;

/** Bod světa (x do stran, z do hloubky, h nad vodou) → jeviště */
export const promitni = (x: number, z: number, h = 0): Bod => [
  OSA_X + (OHNISKO * x) / z,
  OBZOR_Y + (OHNISKO * (KAMERA_H - h)) / z,
];
/** Kolik jednotek jeviště dělá jednotka světa v hloubce z */
export const meritko = (z: number) => OHNISKO / z;
/** Bod jeviště pod obzorem → místo na hladině (opak promitni s h = 0) */
export const naHladinu = (sx: number, sy: number) => {
  const z = (OHNISKO * KAMERA_H) / Math.max(2, sy - OBZOR_Y);
  return { x: ((sx - OSA_X) * z) / OHNISKO, z };
};

/** Kruh na hladině v perspektivě jako lomená čára — vzadu se tiskne k obzoru, vpředu utíká pod okraj */
export function kruhNaHladine(x: number, z: number, r: number, kroku = 56): string {
  let d = "";
  let pero = false;
  for (let i = 0; i <= kroku; i++) {
    const u = (i / kroku) * Math.PI * 2;
    const zz = z + r * Math.sin(u);
    if (zz < 0.9) {
      pero = false;
      continue;
    }
    const [sx, sy] = promitni(x + r * Math.cos(u), zz);
    d += `${pero ? "L" : "M"}${f(sx)} ${f(sy)}`;
    pero = true;
  }
  return d;
}

const omez = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const hladko = (a: number, b: number, x: number) => {
  const t = omez((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Uzavřená hladká křivka bodů (Catmull-Rom jako Bézier, dokola) */
export function uzavrena(body: Bod[]) {
  const n = body.length;
  let d = `M${f(body[0][0])} ${f(body[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = body[(i - 1 + n) % n];
    const p1 = body[i];
    const p2 = body[(i + 1) % n];
    const p3 = body[(i + 2) % n];
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + "Z";
}

export interface TvarKapky {
  /** Obrys pro clipPath, lem i obrysovou čáru */
  d: string;
  /** Střed baňky a její poloměr — podle nich se staví svět uvnitř a odlesky */
  stred: Bod;
  r: number;
  /** Poloosy baňky (lem se natahuje s ní) */
  rx: number;
  ry: number;
  /** Nejužší místo krku — tady se kapka utrhne */
  krk: Bod;
}

/**
 * Kapka visící z praskliny.
 *  v — kolik vody nateklo (0 až 1, 1 = plná kapka, KAPKA_R)
 *  p — jak se krk škrtí před utržením (0 až 1)
 *  k — kmit baňky: kladný ji zplošťuje, záporný natahuje (asi −1 až 1)
 *
 * Malá kapka je čepička přitisknutá k trubce (horní půlku schová trubka),
 * jak roste, baňka se spouští a z praskliny k ní vedou rovné boky — plná
 * kapka je slza, žádná stopka. Teprve při škrcení se boky prohnou dovnitř,
 * krk se ztenčí na nit, baňka se zakulatí a o kus klesne.
 */
export function tvarKapky(v: number, p = 0, k = 0): TvarKapky {
  const R = KAPKA_R * Math.cbrt(Math.max(0.0005, v)) * (1 + 0.03 * p);
  const rx = R * (1 + 0.028 * k - 0.02 * p);
  const ry = R * (1.03 - 0.04 * p - 0.032 * k);
  const cy = PRASKLINA_Y + R * (0.18 + 1.62 * Math.pow(omez(v), 1.25)) + R * 0.45 * p * p;
  const nahore = PRASKLINA_Y - 6;
  const naBance = (u: number): Bod => [rx * Math.cos(u), cy + ry * Math.sin(u)];

  /*
   * Rameno — kde bok přechází v baňku. Klidná kapka má rameno v tečném
   * bodě: přímka z praskliny se baňky jen dotkne, takže bok jde rovně
   * a plynule (slza). Při škrcení se rameno stáčí k temeni.
   */
  const vzdalenost = cy - nahore;
  const uTecny = vzdalenost > rx * 1.02 ? -Math.PI / 2 + Math.acos(rx / vzdalenost) : -Math.PI / 2;
  const uRamena = mix(uTecny, -(76 * Math.PI) / 180, p);
  const rameno = naBance(uRamena);
  const pravy: Bod[] = [];
  let krk: Bod = [OSA_X, PRASKLINA_Y];
  let uOd = uRamena;

  if (rameno[1] < nahore + 4) {
    /* Čepička: baňka sahá až do trubky, krk ještě není */
    uOd = Math.asin(omez((nahore - cy) / ry, -1, 1));
    pravy.push(naBance(uOd));
  } else {
    /*
     * Bok je Bézierova křivka od praskliny k rameni. Klidná kapka má bok
     * skoro rovný a jen lehce vypouklý (špička slzy je mírně tupá); krátký
     * bok rostoucí kapky drží široké ústí. Do ramene křivka vjede po tečně
     * baňky, takže mezi bokem a baňkou není zlom. Při škrcení se bok
     * prohne dovnitř a jeho horní půlka se ztenčí na nit.
     */
    const delka = rameno[1] - nahore;
    const usti = mix(rameno[0], Math.min(rameno[0], 10), hladko(0, 90, delka)) * (1 - 0.3 * p);
    const skrceni = p * p * (3 - 2 * p);
    const tecna: Bod = [-rx * Math.sin(uRamena), ry * Math.cos(uRamena)];
    const tl = Math.hypot(tecna[0], tecna[1]) || 1;
    const a: Bod = [usti, nahore];
    const bok = Math.hypot(rameno[0] - usti, delka);
    /* Normála boku ven — o kousek vyboulí rovnou slzu */
    const ven: Bod = [delka / bok, -(rameno[0] - usti) / bok];
    const vyboule = bok * 0.045 * (1 - p);
    const c1: Bod = [
      mix(usti + (rameno[0] - usti) * 0.34 + ven[0] * vyboule, usti * 0.6, p),
      nahore + delka * 0.34 + ven[1] * vyboule,
    ];
    const c2: Bod = [rameno[0] - (tecna[0] / tl) * bok * 0.34, rameno[1] - (tecna[1] / tl) * bok * 0.34];
    const bez = (t: number, i: 0 | 1) => {
      const s = 1 - t;
      return s * s * s * a[i] + 3 * s * s * t * c1[i] + 3 * s * t * t * c2[i] + t * t * t * rameno[i];
    };
    pravy.push(a);
    let nejuzsi = Infinity;
    for (const t of [0.2, 0.42, 0.64, 0.84]) {
      const x = bez(t, 0) * (1 - (t < 0.5 ? 0.93 : mix(0.93, 0.55, (t - 0.5) / 0.34)) * skrceni);
      const y = bez(t, 1);
      pravy.push([Math.max(0.6, x), y]);
      if (x < nejuzsi) {
        nejuzsi = x;
        krk = [OSA_X, y];
      }
    }
  }
  const KROKU = 13;
  for (let i = uOd === uRamena ? 0 : 1; i <= KROKU; i++) pravy.push(naBance(mix(uOd, Math.PI / 2, i / KROKU)));

  /* Levá půlka zrcadlem, dno se nezdvojí */
  const body: Bod[] = [
    ...pravy.map(([x, y]): Bod => [OSA_X + x, y]),
    ...pravy
      .slice(0, -1)
      .reverse()
      .map(([x, y]): Bod => [OSA_X - x, y]),
  ];
  return { d: uzavrena(body), stred: [OSA_X, cy], r: R, rx, ry, krk };
}

/** Volně padající kapka — kulička, která se po utržení přelévá (k jako u tvarKapky) */
export function volnaKapka(cx: number, cy: number, r: number, k = 0): string {
  const rx = r * (1 + 0.09 * k);
  const ry = r * (1 - 0.09 * k);
  return `M${f(cx - rx)} ${f(cy)}A${f(rx)} ${f(ry)} 0 1 0 ${f(cx + rx)} ${f(cy)}A${f(rx)} ${f(ry)} 0 1 0 ${f(cx - rx)} ${f(cy)}Z`;
}
