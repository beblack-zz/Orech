/**
 * Vázička v letu po úvodu Domku 2 (01 Kami z /marcel bez kruhu, podoba
 * `let` ve scripts/vazicka-gejsa). Lítá nad loukou a schovává se: za dům na
 * pahorku, za kmen starého ořešáku, který stojí vpravo jako rám, do jeho
 * koruny a do trávy. Ze schovky párkrát vykoukne, pak letí jinam. Kdo na ni
 * klepne, ten ji našel — zatočí se, vymění květy (to umí sama, beh.js)
 * a uletí do jiné schovky.
 *
 * Schovávání je pořadí vrstev: krajina má v domek2.css z-index po vrstvách
 * (kopce 1, dům 3, zadní koruna 4, kmen 6, přední koruna 8, louka 10, text 20)
 * a Vázička si bere číslo mezi nimi. Vrstvu mění jen tam, kde nepřekrývá nic,
 * co přeskakuje; když to nejde, na okamžik zmizí, ať to neprobliklo.
 *
 * Kde co je, se měří z kresby, takže schovky sedí na každé šířce okna: dům
 * a louka přes getScreenCTM svých vrstev, strom z obdélníku vrstvy kmene
 * a jejího viewBoxu (strom posouvá CSS transformace a s tou getScreenCTM
 * ne všude počítá). Kde ve stromě co je — obrysy obou korun, nejužší kus
 * kmene a schovky v koruně —, zapisuje kresba stromu do data-mista
 * (kresba/orech.ts); bez nich se do stromu neschovává. Do koruny jen
 * v létě a na podzim, kdy má listí (data-sezona na sekci). Co je mimo obraz,
 * pod nadpisem nebo kam se nevejde, se vynechá. S omezeným pohybem nelétá:
 * zůstane vykukovat zpoza první schovky, která je vidět.
 *
 * Jednou za návštěvu webu (localStorage, při vývoji pokaždé) po deseti
 * vteřinách na úvodu vyletí ze schovky k závěsu pod hlavičkou, cukne jím
 * a řekne o hledání kami — ve třech větách, u třetí vystoupá k bráně, která
 * otevírá omamori s přehledem nalezených. Pak se vrátí ke schovávání.
 * Závěs se mezitím rozzáří a u řeči o komnatách bliknou lístky (parta2.css).
 */
import { rekni } from "../parta2/kami";
import { rozhoupejZaves } from "../parta2/zaves";

type Bod = { x: number; y: number };
type Obdelnik = { l: number; t: number; r: number; b: number };
type Mapa = (u: number, v: number) => Bod;
type Drzeni = { naklon: number; otoc: number; pohled: [number, number] } | null;

/** Kde je postava v rámečku 180 × 180, v násobcích jeho strany od středu (změřeno z kresby) */
const POSTAVA = { l: -0.21, r: 0.22, t: -0.24, vlasy: -0.06, oci: 0.15, b: 0.43 };

/** Vrstvy, do kterých se Vázička schovává (mezi čísly krajiny v domek2.css) */
const Z = { dum: 2, kmen: 5, koruna: 7, trava: 9, volna: 12 };
/** Překážky a jejich vrstva — podle nich se pozná, jestli změna vrstvy neprobliká */
const ZP = { dum: 3, korunaZadni: 4, kmen: 6, korunaPredni: 8, louka: 10 };
/** Kmen na plátně stromu (1800 × 1400, kresba/orech.ts): od vidlice (kolem 930) k zemi v 1300 */
const KMEN = { vrch: 900, zem: 1300 };
/**
 * O kolik jednotek plátna stromu vykoukne z koruny dál, než je `vykuk`
 * z kresby. Ten je jen kousek za koncem větvičky, ale listí kolem konce
 * sahá ještě asi o 40 dál — takhle je vidět obličej a půlka postavy zůstane
 * v listí (vyzkoušeno náhledem). Kdyby kresba posunula vykuk ven sama, patří sem 0.
 */
const VYKUK_KORUNA = 35;
/**
 * Louka (plátno 3600 × 240, kresba/svitani.ts): hrana země se vlní kolem
 * y 148 o ± 8 a nejvyšší stébla zadní trávy sahají do y 82 — výš je pruh
 * louky průhledný.
 */
const LOUKA = { zem: 148, vlna: 8, trava: 82 };

/** Obdélník vrstvy, která může zakrýt; `volno` jsou místa v něm, o kterých kresba ví, že jsou prázdná */
interface Prekazka { z: number; r: Obdelnik; volno?: Obdelnik[] }

/** Místa ve stromě v souřadnicích jeho plátna — data-mista z kresba/orech.ts (OrechMista) */
type Ramecek = [number, number, number, number];
interface MistaStromu {
  /** obdélníky [x0, y0, x1, y1] kolem listí přední a zadní koruny */
  predni: Ramecek | null;
  zadni: Ramecek | null;
  /** kde je kmen nejužší: mezi x l a r ve výškách y0 až y1 */
  kmen: { l: number; r: number; y0: number; y1: number } | null;
  /** schovky v koruně: odkud se k ní letí, kde je schovaná za předními listy, kde vykoukne a kudy ven */
  koruna: { venku: Bod; skryta: Bod; vykuk: Bod; smer: Bod }[];
}

const cisla = (a: unknown, n: number): number[] | null =>
  Array.isArray(a) && a.length === n && a.every((c) => typeof c === "number" && Number.isFinite(c)) ? (a as number[]) : null;
const bodZ = (a: unknown): Bod | null => {
  const c = cisla(a, 2);
  return c && { x: c[0], y: c[1] };
};

/** Přečte data-mista stromu; co chybí nebo nedává smysl, vynechá (bez míst se do stromu neschovává) */
function mistaStromu(el: HTMLElement | null): MistaStromu | null {
  let d: unknown;
  try {
    d = JSON.parse(el?.dataset.mista ?? "");
  } catch {
    return null;
  }
  if (!d || typeof d !== "object") return null;
  const o = d as Record<string, unknown>;
  const ramecek = (a: unknown) => {
    const c = cisla(a, 4);
    return c && c[0] < c[2] && c[1] < c[3] ? (c as Ramecek) : null;
  };
  const k = (o.kmen && typeof o.kmen === "object" ? o.kmen : {}) as Record<string, unknown>;
  const km = cisla([k.l, k.r, k.y0, k.y1], 4);
  const koruna = (Array.isArray(o.koruna) ? o.koruna : []).flatMap((s: unknown) => {
    const m = (s && typeof s === "object" ? s : {}) as Record<string, unknown>;
    const venku = bodZ(m.venku), skryta = bodZ(m.skryta), vykuk = bodZ(m.vykuk), smer = bodZ(m.smer);
    const l = smer ? Math.hypot(smer.x, smer.y) : 0;
    return venku && skryta && vykuk && smer && l > 0 ? [{ venku, skryta, vykuk, smer: { x: smer.x / l, y: smer.y / l } }] : [];
  });
  return {
    predni: ramecek(o.predni),
    zadni: ramecek(o.zadni),
    kmen: km && km[0] < km[1] && km[2] < km[3] ? { l: km[0], r: km[1], y0: km[2], y1: km[3] } : null,
    koruna,
  };
}

interface Vykuk { bod: Bod; naklon: number; otoc: number; pohled: [number, number] }
interface Schovka {
  id: string;
  z: number;
  /** zmenšení v hloubce: u domu je dál, v trávě blíž */
  m: number;
  pristup: Bod;
  skryta: Bod;
  vykuky: Vykuk[];
}
interface Akce { delka: number; krok: (q: number) => void; start?: () => void }

const nahodne = (a: number, b: number) => a + Math.random() * (b - a);
const omez = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const hladce = (q: number) => q * q * (3 - 2 * q);
const kCili = (v: number, cil: number, dt: number, tau: number) => v + (cil - v) * (1 - Math.exp(-dt / tau));
const prekryva = (a: Obdelnik, b: Obdelnik) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;

const HLASKY = ["Ach! Tak tady jsem.", "Prozrazená!", "Zkusím to jinde…", "To bylo rychlé!", "Hledej dál!"];

/** Co řekne o hledání kami, za kolik vteřin na úvodu a kam si zapíše, že už to řekla */
const O_KAMI = {
  po: 10,
  klic: "vazicka-rekla-o-kami",
  vety: [
    "Psst! Po webu se schovává devět kami. Malí, černí nebo bílí — vykukují zpoza věcí.",
    "Na koho klepneš, ten se navlékne sem na závěs. Při třech, šesti a devíti se otevře komnata.",
    "Klepni na červenou bránu nahoře a uvidíš, koho už máš a kdo ti ještě chybí.",
  ],
};
/** Jak dlouho visí bublina (rekni v parta2/kami.ts ji zavře za 3,6 s + 30 ms na znak) */
const delkaBubliny = (text: string) => 3.9 + text.length * 0.03;
const VYVOJ = !!import.meta.env?.DEV;
/**
 * Rozzáří závěs (zaves-zari), lístky komnat (zaves-listky) nebo jen bránu
 * nahoře (zaves-brana, ta vystřídá záři celého závěsu) — animace jsou
 * v parta2.css a doběhnou samy.
 */
const rozzar = (trida: "zaves-zari" | "zaves-listky" | "zaves-brana") => {
  const z = document.querySelector<HTMLElement>("[data-zaves]");
  if (!z) return;
  z.classList.remove(trida);
  if (trida === "zaves-brana") z.classList.remove("zaves-zari");
  void z.offsetWidth;
  z.classList.add(trida);
};

export function letKami() {
  const sekce = document.querySelector<HTMLElement>("#uvod.dm-uvod");
  const obal = sekce?.querySelector<HTMLElement>(".let-kami");
  const vg = obal?.querySelector<HTMLElement>("[data-vazicka-gejsa]");
  if (!sekce || !obal || !vg) return;
  const S = sekce, O = obal, VG = vg;

  const klidne = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

  /* ═══ Měření krajiny ═══ */
  let B = 90, W = 0, H = 0;
  let schovky: Schovka[] = [];
  let prekazky: Prekazka[] = [];
  let textR: Obdelnik | null = null;
  /** Místa ve stromě se nemění — stačí je přečíst jednou */
  const strom = mistaStromu(S.querySelector<HTMLElement>(".dmu-orech"));

  /** Mapa ze souřadnic SVG prvku (jeho viewBox) do souřadnic sekce */
  const mapa = (el: SVGGraphicsElement | null, s: DOMRect): Mapa | null => {
    const ctm = el?.getScreenCTM?.();
    if (!ctm) return null;
    return (u, v) => {
      const p = new DOMPoint(u, v).matrixTransform(ctm);
      return { x: p.x - s.left, y: p.y - s.top };
    };
  };
  /**
   * Mapa z plátna stromu do souřadnic sekce. Strom posouvá CSS transformace,
   * se kterou getScreenCTM ne všude počítá, proto z obdélníku vrstvy a jejího
   * viewBoxu (vrstva ho vyplňuje celý, výchozí „meet“ na střed).
   */
  const mapaStromu = (el: SVGSVGElement | null, s: DOMRect): Mapa | null => {
    const vb = el?.getAttribute("viewBox")?.trim().split(/[\s,]+/).map(Number);
    const r = el?.getBoundingClientRect();
    if (!r || !r.width || !r.height || vb?.length !== 4 || !vb.every(Number.isFinite) || vb[2] <= 0 || vb[3] <= 0) return null;
    const k = Math.min(r.width / vb[2], r.height / vb[3]);
    const x0 = r.left - s.left + (r.width - vb[2] * k) / 2 - vb[0] * k;
    const y0 = r.top - s.top + (r.height - vb[3] * k) / 2 - vb[1] * k;
    return (u, v) => ({ x: x0 + u * k, y: y0 + v * k });
  };
  const obdelnik = (m: Mapa, u0: number, v0: number, u1: number, v1: number): Obdelnik => {
    const a = m(u0, v0), b = m(u1, v1);
    return { l: Math.min(a.x, b.x), t: Math.min(a.y, b.y), r: Math.max(a.x, b.x), b: Math.max(a.y, b.y) };
  };
  const vRamu = (p: Bod, okraj = 0) => p.x > okraj && p.x < W - okraj && p.y > okraj && p.y < H - okraj;
  /** Obrys postavy se středem rámečku v `p` a zmenšením `m` */
  const obrys = (p: Bod, m: number): Obdelnik => ({
    l: p.x + POSTAVA.l * B * m, r: p.x + POSTAVA.r * B * m, t: p.y + POSTAVA.t * B * m, b: p.y + POSTAVA.b * B * m,
  });
  /** Zakrývá překážka obrys? Kdo je celý v jejím volném místě, toho ne. */
  const zakryva = (p: Prekazka, o: Obdelnik) =>
    prekryva(o, p.r) && !p.volno?.some((v) => o.l >= v.l - 1 && o.r <= v.r + 1 && o.t >= v.t - 1 && o.b <= v.b + 1);
  /** Jde vykouknutí vidět? Je v obraze, ne pod nadpisem a nezakrývá ho nic bližšího než to, za čím se schovává. */
  const jdeVidet = (v: Vykuk, m: number, zSchovky: number, vlastni: number) => {
    const o = obrys(v.bod, m);
    const uzsi = { l: o.l + 8, t: o.t + 8, r: o.r - 8, b: o.b - 8 };
    if (!vRamu(v.bod, B * 0.3)) return false;
    if (textR && prekryva(o, textR)) return false;
    return !prekazky.some((p) => p.z > zSchovky && p.z !== vlastni && zakryva(p, uzsi));
  };
  const pridej = (s: Schovka, vlastni: number) => {
    s.vykuky = s.vykuky.filter((v) => jdeVidet(v, s.m, s.z, vlastni));
    if (s.vykuky.length && vRamu(s.skryta, 10)) schovky.push(s);
  };

  const zmer = () => {
    const s = S.getBoundingClientRect();
    W = s.width;
    H = s.height;
    B = Math.round(omez(Math.min(W * 0.07, H * 0.11), 58, 112));
    O.style.width = O.style.height = `${B}px`;
    const t = S.querySelector(".uvod-text")?.getBoundingClientRect();
    textR = t ? { l: t.left - s.left - 16, t: t.top - s.top - 16, r: t.right - s.left + 16, b: t.bottom - s.top + 16 } : null;

    const D = mapa(S.querySelector<SVGGraphicsElement>(".uvod-kopce-dum .krajina-domek"), s);
    const K = strom ? mapaStromu(S.querySelector<SVGSVGElement>(".dmu-orech .orech-kmen"), s) : null;
    const L = mapa(S.querySelector<SVGGraphicsElement>(".uvod-louka .louka-zem"), s);
    const louka = S.querySelector(".uvod-louka")?.getBoundingClientRect();
    const loukaVrch = louka ? louka.top - s.top : H;
    /* pruh louky je vysoký, ať má tráva celé vršky — zakrývá až od nejvyšších stébel */
    const travaVrch = Math.max(loukaVrch, L ? L(0, LOUKA.trava).y : loukaVrch);
    /* listí má koruna jen v létě a na podzim; v zimě je holá a na jaře jen řídké mladé lístky (orechStyly) — není za čím se schovat */
    const listi = !["zima", "predjari", "jaro"].includes(S.dataset.sezona ?? "");

    /* Nejdřív překážky, ať jde u každé schovky poznat, co ji zakrývá */
    prekazky = [];
    if (D) prekazky.push({ z: ZP.dum, r: obdelnik(D, 30, 95, 476, 305) });
    /* koruny jsou jen obdélníky kolem listí; přístupy do koruny v tom předním jsou volné (doplní je schovky) */
    const predni: Prekazka | null = K && listi && strom?.predni ? { z: ZP.korunaPredni, r: obdelnik(K, ...strom.predni), volno: [] } : null;
    if (K && strom) {
      if (listi && strom.zadni) prekazky.push({ z: ZP.korunaZadni, r: obdelnik(K, ...strom.zadni) });
      /* kmen od vidlice k zemi v šířce nejužšího místa; ke kořenům se rozšiřuje, ale ty už jsou v louce */
      if (strom.kmen) prekazky.push({ z: ZP.kmen, r: obdelnik(K, strom.kmen.l, KMEN.vrch, strom.kmen.r, KMEN.zem) });
      if (predni) prekazky.push(predni);
    }
    if (louka) prekazky.push({ z: ZP.louka, r: { l: 0, t: travaVrch, r: W, b: H } });

    schovky = [];

    /* Dům (kresba 480 × 320): štít mezi x 118 a 270, hřeben v 196/100, zem v 300, vpravo tmavý strom do 472 */
    if (D) {
      const u = Math.hypot(D(1, 0).x - D(0, 0).x, D(1, 0).y - D(0, 0).y);
      const m = 0.8, bm = B * m;
      const pata = D(196, 296);
      const skryta = { x: pata.x, y: pata.y - POSTAVA.b * bm };
      /* celá musí být pod střechou — vrch postavy pod šikmou střechou v místě jejího ramene */
      const vrch = skryta.y + POSTAVA.t * bm;
      if (vrch > D(196, 100 + (POSTAVA.r * bm) / u + 4).y) {
        const hreben = D(196, 100);
        pridej({
          id: "dum", z: Z.dum, m,
          pristup: { x: D(476, 0).x - POSTAVA.l * bm + 6, y: skryta.y },
          skryta,
          vykuky: [
            { bod: { x: skryta.x, y: hreben.y - (POSTAVA.oci + 0.05) * bm }, naklon: 0, otoc: 0, pohled: [0, 1.2] },
            { bod: { x: D(118, 0).x - 0.08 * bm, y: skryta.y - 0.04 * bm }, naklon: -9, otoc: -28, pohled: [-1.4, 0] },
            /* vpravo stojí tmavý strom (do x 472), vykukuje až zpoza něj */
            { bod: { x: D(474, 0).x + 0.06 * bm, y: skryta.y - 0.06 * bm }, naklon: 9, otoc: 28, pohled: [1.4, 0] },
          ],
        }, ZP.dum);
      }
    }

    /* Ořech (plátno 1800 × 1400): kde je kmen nejužší a schovky v koruně má v data-mista */
    if (K && strom) {
      const u = Math.hypot(K(1, 0).x - K(0, 0).x, K(1, 0).y - K(0, 0).y);

      /* Kmen: celá se schová za jeho nejužší kus (x l–r, výšky y0–y1) nad trávou, vykoukne z hrany na své straně */
      if (strom.kmen) {
        const { l, r, y0, y1 } = strom.kmen;
        const m = 0.95, bm = B * m;
        const vrch = K(0, y0).y, spod = Math.min(K(0, y1).y, travaVrch);
        if ((POSTAVA.r - POSTAVA.l) * bm < (r - l) * u - 10 && (POSTAVA.b - POSTAVA.t) * bm < spod - vrch - 4) {
          /* uprostřed kmene a uprostřed výšky, kam se vejde */
          const skryta = { x: K((l + r) / 2, 0).x, y: (vrch + spod) / 2 - ((POSTAVA.t + POSTAVA.b) / 2) * bm };
          for (const st of [-1, 1] as const) {
            const hrana = K(st < 0 ? l : r, 0).x;
            /* přístup kousek za obrysem kmene (místy je o pár jednotek širší), ať se vrstva mění, když ho nepřekrývá (jinak by na okamžik zmizela) */
            const venku = K(st < 0 ? l - 14 : r + 14, 0).x;
            pridej({
              id: `kmen${st}`, z: Z.kmen, m,
              pristup: { x: venku + st * (Math.max(-POSTAVA.l, POSTAVA.r) * bm + 8), y: skryta.y },
              skryta,
              vykuky: [
                { bod: { x: hrana + st * 0.09 * bm, y: skryta.y }, naklon: st * 10, otoc: st * 28, pohled: [st * 1.6, 0.3] },
                { bod: { x: hrana + st * 0.07 * bm, y: skryta.y - 0.14 * bm }, naklon: st * 14, otoc: st * 18, pohled: [st * 1.2, -0.6] },
              ],
            }, ZP.kmen);
          }
        }
      }

      /*
       * Koruna: zvenku se zanoří mezi listy (před zadní korunu, za přední)
       * a vykoukne z okraje — nakloní se, natočí a kouká tam, kam ukazuje
       * `smer` (ven z koruny). Místo, odkud přilétá, je mimo listí, takže
       * ho obdélník přední koruny nezakrývá. Jen když má koruna listí.
       */
      const mk = 0.9;
      if (listi) strom.koruna.forEach((k, i) => {
        const { x: sx, y: sy } = k.smer;
        const pristup = K(k.venku.x, k.venku.y);
        predni?.volno?.push(obrys(pristup, mk));
        pridej({
          id: `koruna${i}`, z: Z.koruna, m: mk,
          pristup,
          skryta: K(k.skryta.x, k.skryta.y),
          vykuky: [{
            bod: K(k.vykuk.x + sx * VYKUK_KORUNA, k.vykuk.y + sy * VYKUK_KORUNA),
            naklon: sx * 12, otoc: sx * 30, pohled: [sx * 1.5, omez(0.4 + sy, -1, 1.3)],
          }],
        }, ZP.korunaPredni);
      });
    }

    /* Tráva: zanoří se do louky, z trávy jí koukají jen květy, pak vystrčí hlavu */
    if (louka && L) {
      const m = 1.1, bm = B * m;
      /* hrana země se vlní: schová se pod její střed s rezervou i na nejnižší místo, vykoukne nad nejvyšší */
      const hrana = Math.max(loukaVrch, L(0, LOUKA.zem).y) + 6;
      const hranaVrch = Math.max(loukaVrch, L(0, LOUKA.zem - LOUKA.vlna).y) + 6;
      for (let i = 0; i < 2; i++) {
        const x = nahodne(W * 0.08, W * 0.92);
        pridej({
          id: `trava${i}`, z: Z.trava, m,
          pristup: { x, y: travaVrch - POSTAVA.b * bm - 6 },
          skryta: { x, y: hrana - POSTAVA.vlasy * bm + 0.04 * bm },
          vykuky: [{ bod: { x, y: hranaVrch - (POSTAVA.oci + 0.16) * bm }, naklon: 0, otoc: 0, pohled: [0, 1.3] }],
        }, ZP.louka);
      }
    }
  };

  /** Volné místo na obloze: v obraze, mimo nadpis */
  const volneMisto = (): Bod => {
    for (let i = 0; i < 30; i++) {
      const p = { x: nahodne(W * 0.1, W * 0.9), y: nahodne(H * 0.14, H * 0.62) };
      if (!textR || !prekryva(obrys(p, 1), textR)) return p;
    }
    return { x: W * 0.7, y: H * 0.3 };
  };

  /* ═══ Stav a akce ═══ */
  const poz = { x: 0, y: 0, m: 1 };
  let predX = 0, predY = 0;
  let z = Z.volna;
  let schovka: Schovka | null = null;
  /** jak je natočená a kam kouká, když to neříká let */
  let drzi: Drzeni = null;
  const vid = { otoc: 0, naklon: 0, vitr: 0, pohled: [0, 0] as [number, number], vx: 0, vy: 0 };
  let cas = 0;
  let fronta: Akce[] = [];
  let akce: Akce | null = null;
  let akceCas = 0;

  /** Přelet obloukem; rychlost podle šířky okna */
  const let_ = (cil: () => Bod, m: number): Akce => {
    let a: Bod = poz, b: Bod = poz, c: Bod = poz, m0 = 1;
    return {
      delka: 1,
      start() {
        a = { x: poz.x, y: poz.y };
        b = cil();
        m0 = poz.m;
        const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        this.delka = omez(d / Math.max(220, W * 0.16), 0.7, 3.6);
        /* kontrolní bod stranou a vždycky trochu nahoru — vyletí a snese se */
        const o = (Math.random() < 0.5 ? -1 : 1) * nahodne(0.15, 0.35) * d;
        c = {
          x: (a.x + b.x) / 2 - ((b.y - a.y) / d) * o,
          y: Math.max(B * 0.3, Math.min((a.y + b.y) / 2 + ((b.x - a.x) / d) * o, Math.min(a.y, b.y) - 0.1 * d)),
        };
        drzi = null;
      },
      krok(q) {
        const t = hladce(q);
        poz.x = (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * c.x + t * t * b.x;
        poz.y = (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * c.y + t * t * b.y;
        poz.m = m0 + (m - m0) * t;
      },
    };
  };
  /** Pomalý přesun rovně — zanoření, vykouknutí, schování */
  const posun = (cil: () => Bod, delka: number, d: Drzeni | (() => Drzeni)): Akce => {
    let a: Bod = poz, b: Bod = poz;
    return {
      delka,
      start() {
        a = { x: poz.x, y: poz.y };
        b = cil();
        drzi = typeof d === "function" ? d() : d;
      },
      krok(q) {
        const t = hladce(q);
        poz.x = a.x + (b.x - a.x) * t;
        poz.y = a.y + (b.y - a.y) * t;
      },
    };
  };
  const cekej = (delka: number, d?: Drzeni): Akce => ({ delka, start: () => { if (d !== undefined) drzi = d; }, krok: () => {} });
  const hned = (fn: () => void): Akce => ({ delka: 0.01, start: fn, krok: () => {} });
  /** Přestup do jiné vrstvy; když přitom překrývá něco, co přeskakuje, na okamžik zmizí */
  const vrstva = (nova: number): Akce => {
    let mizi = false, hotovo = false;
    return {
      delka: 0.01,
      start() {
        const lo = Math.min(z, nova), hi = Math.max(z, nova);
        const o = obrys(poz, poz.m);
        mizi = prekazky.some((p) => p.z > lo && p.z < hi && zakryva(p, o));
        this.delka = mizi ? 0.36 : 0.01;
        hotovo = false;
      },
      krok(q) {
        if (mizi) O.style.opacity = Math.abs(1 - 2 * q).toFixed(3);
        if (!hotovo && (!mizi || q >= 0.5)) {
          z = nova;
          O.style.zIndex = String(z);
          hotovo = true;
        }
        if (q >= 1) O.style.opacity = "";
      },
    };
  };
  const PRED: Drzeni = { naklon: 0, otoc: 0, pohled: [0, 0] };

  /** Další kolo: přelet, zanoření do schovky, jedno až dvě vykouknutí, odlet */
  let posledni = "";
  const dalsiKolo = () => {
    zmer();
    /* jinam, než byla — a za kmen ne hned z druhé strany */
    const druh = (id: string) => id.replace(/-?\d+$/, "");
    const moznosti = schovky.filter((s) => druh(s.id) !== druh(posledni));
    if (!moznosti.length) {
      fronta.push(let_(volneMisto, 1), cekej(nahodne(1, 2)));
      return;
    }
    /* do trávy jen občas — strom a dům jsou lepší schovky */
    const vahy = moznosti.map((s) => (s.id.startsWith("trava") ? 0.6 : 1));
    let los = Math.random() * vahy.reduce((a, b) => a + b, 0);
    let s = moznosti[0];
    for (let i = 0; i < moznosti.length; i++) {
      los -= vahy[i];
      if (los <= 0) {
        s = moznosti[i];
        break;
      }
    }
    posledni = s.id;
    const id = s.id;
    /* po změně okna se schovky přeměří — bere se vždycky čerstvá */
    const ted = () => schovky.find((x) => x.id === id) ?? s;

    if (Math.random() < 0.35) fronta.push(let_(volneMisto, 1), cekej(nahodne(0.3, 0.9)));
    fronta.push(
      let_(() => ted().pristup, s.m),
      cekej(0.15),
      hned(() => (schovka = ted())),
      vrstva(s.z),
      posun(() => ted().skryta, 0.9, PRED),
      cekej(nahodne(1.2, 2.4)),
    );
    const poradi = [...s.vykuky.keys()].sort(() => Math.random() - 0.5);
    const kolik = Math.random() < 0.55 ? 2 : 1;
    for (let i = 0; i < kolik; i++) {
      const k = poradi[i % poradi.length];
      const v = () => ted().vykuky[k] ?? ted().vykuky[0];
      fronta.push(
        posun(() => v().bod, nahodne(0.45, 0.7), () => ({ naklon: v().naklon, otoc: v().otoc, pohled: v().pohled })),
        cekej(nahodne(1.3, 2.4)),
        posun(() => ted().skryta, 0.45, PRED),
        cekej(nahodne(0.7, 1.5)),
      );
    }
    fronta.push(posun(() => ted().pristup, 0.8, null), vrstva(Z.volna), hned(() => (schovka = null)));
  };

  /* ═══ Vykreslení ═══ */
  const vykresli = (dt: number) => {
    const vx = dt > 0 ? (poz.x - predX) / dt : 0, vy = dt > 0 ? (poz.y - predY) / dt : 0;
    predX = poz.x;
    predY = poz.y;
    if (dt > 0) {
      vid.vx = kCili(vid.vx, vx, dt, 0.15);
      vid.vy = kCili(vid.vy, vy, dt, 0.15);
      const k = omez(vid.vx / 260, -1, 1);
      /* v letu se natočí, kam letí, předkloní se a vítr jí čechrá rukávy a šňůry */
      const cil = drzi ?? { naklon: k * 9, otoc: k * 42, pohled: [k * 1.9, omez(vid.vy / 300, -1, 1) * 1.1] };
      vid.naklon = kCili(vid.naklon, cil.naklon, dt, 0.25);
      vid.otoc = kCili(vid.otoc, cil.otoc, dt, 0.3);
      vid.pohled = [kCili(vid.pohled[0], cil.pohled[0], dt, 0.2), kCili(vid.pohled[1], cil.pohled[1], dt, 0.2)];
      vid.vitr = kCili(vid.vitr, -omez(vid.vx / 200, -2.5, 2.5), dt, 0.2);
    }
    /* ve schovce se vznáší jen maličko, ať nevyleze */
    const vlna = klidne ? 0 : Math.sin(cas * 2.3) * (schovka ? 1.5 : 4) * poz.m;
    O.style.transform = `translate3d(${(poz.x - B / 2).toFixed(1)}px, ${(poz.y - B / 2 + vlna).toFixed(1)}px, 0) rotate(${vid.naklon.toFixed(2)}deg) scale(${poz.m.toFixed(3)})`;

    /* natočení, protivítr a pohled předá kresbě (kami-kvety.js) */
    const sc = (VG as HTMLElement & { __scena?: { stav: () => { dyn: { otoc?: number }; vstup: { vitr?: number; pohled?: [number, number] } } } }).__scena;
    if (sc) {
      const { dyn, vstup } = sc.stav();
      dyn.otoc = vid.otoc;
      vstup.vitr = vid.vitr;
      vstup.pohled = vid.pohled;
    }
  };

  /* ═══ O hledání kami: jednou, po deseti vteřinách ═══ */
  const uzRekla = () => {
    if (VYVOJ) return false;
    try {
      return localStorage.getItem(O_KAMI.klic) === "1";
    } catch {
      return false;
    }
  };
  const zapamatujRekla = () => {
    if (VYVOJ) return;
    try {
      localStorage.setItem(O_KAMI.klic, "1");
    } catch {
      /* bez úložiště to řekne při každé návštěvě úvodu — nevadí */
    }
  };
  /** Místo vlevo vedle závěsu (je v hlavičce, ta je fixed — měří se až při odletu) */
  const uZavesu = (): Bod | null => {
    const r = document.querySelector("[data-zaves] > svg")?.getBoundingClientRect();
    if (!r || !r.width) return null;
    const s = S.getBoundingClientRect();
    const x = r.left - s.left - POSTAVA.r * B - 14;
    return { x: x > B * 0.5 ? x : r.right - s.left - POSTAVA.l * B + 14, y: r.top - s.top + r.height * 0.42 };
  };
  /** Výš, k bráně nahoře — jen tak, ať jí květy nezalezou pod pruh hlavičky */
  const uBrany = (): Bod | null => {
    const z = uZavesu();
    const r = document.querySelector("[data-zaves] > svg")?.getBoundingClientRect();
    if (!z || !r) return z;
    const s = S.getBoundingClientRect();
    return { x: z.x, y: Math.max(r.top - s.top + r.height * 0.14 - POSTAVA.oci * B, r.top - s.top - POSTAVA.t * B + 4) };
  };
  let reklaOKami = uzRekla();
  const rekniOKami = () => {
    reklaOKami = true;
    if (!uZavesu()) return;
    zapamatujRekla();
    O.style.opacity = "";
    /* nakloní se k závěsu a kouká na něj (je vpravo od ní, pokud se nevešla vlevo) */
    const kZavesu = (): Drzeni => {
      const r = document.querySelector("[data-zaves] > svg")?.getBoundingClientRect();
      const st = r && r.left + r.width / 2 - S.getBoundingClientRect().left < poz.x ? -1 : 1;
      return { naklon: st * 7, otoc: st * 34, pohled: [st * 1.9, -0.7] };
    };
    const kBrane = (): Drzeni => {
      const k = kZavesu();
      return k && { ...k, naklon: k.naklon * 0.6, pohled: [k.pohled[0] * 0.8, -1.3] };
    };
    const [prvni, druha, treti] = O_KAMI.vety;
    fronta = [
      /* ze schovky ven stejnou cestou, jakou do ní zalezla */
      ...(schovka ? [posun(() => schovka?.pristup ?? { x: poz.x, y: poz.y }, 0.6, null)] : []),
      vrstva(Z.volna),
      hned(() => (schovka = null)),
      let_(() => uZavesu() ?? volneMisto(), 1),
      posun(() => ({ x: poz.x, y: poz.y }), 0.4, kZavesu),
      hned(() => {
        rozzar("zaves-zari");
        rekni(VG, "vazicka", prvni, { kontrast: true });
      }),
      cekej(delkaBubliny(prvni)),
      hned(() => {
        rozhoupejZaves();
        rozzar("zaves-listky");
        rekni(VG, "vazicka", druha, { kontrast: true });
      }),
      cekej(delkaBubliny(druha)),
      /* vystoupá k bráně, ta se rozsvítí */
      posun(() => uBrany() ?? { x: poz.x, y: poz.y }, 0.7, kBrane),
      hned(() => {
        rozzar("zaves-brana");
        rekni(VG, "vazicka", treti, { kontrast: true });
      }),
      cekej(delkaBubliny(treti)),
    ];
    akce = null;
  };

  /* S omezeným pohybem jen vykukuje zpoza první schovky, kterou je vidět */
  if (klidne) {
    const postav = () => {
      zmer();
      const s = schovky.find((x) => x.id === "dum") ?? schovky.find((x) => x.id.startsWith("kmen")) ?? schovky[0];
      if (!s) {
        O.classList.remove("pripravena");
        return;
      }
      const v = s.vykuky[0];
      Object.assign(poz, { x: v.bod.x, y: v.bod.y, m: s.m });
      z = s.z;
      O.style.zIndex = String(z);
      Object.assign(vid, { naklon: v.naklon, otoc: v.otoc, pohled: v.pohled });
      vykresli(0);
      O.classList.add("pripravena");
    };
    postav();
    if (!uzRekla()) {
      window.setTimeout(() => {
        if (!O.classList.contains("pripravena") || window.scrollY > H * 0.25) return;
        zapamatujRekla();
        rozzar("zaves-zari");
        rekni(VG, "vazicka", O_KAMI.vety[0], { kontrast: true });
        const [prvni, druha, treti] = O_KAMI.vety;
        window.setTimeout(() => {
          rozzar("zaves-listky");
          rekni(VG, "vazicka", druha, { kontrast: true });
          window.setTimeout(() => {
            rozzar("zaves-brana");
            rekni(VG, "vazicka", treti, { kontrast: true });
          }, delkaBubliny(druha) * 1000);
        }, delkaBubliny(prvni) * 1000);
      }, O_KAMI.po * 1000);
    }
    /* kresba se rozběhne (beh.js) až po chvíli — natočení jí předá, jakmile je */
    window.setTimeout(() => vykresli(0), 400);
    window.addEventListener("resize", postav);
    return;
  }

  const zacni = () => {
    zmer();
    const p = volneMisto();
    Object.assign(poz, { x: p.x, y: p.y, m: 1 });
    predX = p.x;
    predY = p.y;
    z = Z.volna;
    schovka = null;
    drzi = null;
    O.style.zIndex = String(z);
    O.style.opacity = "";
    fronta = [];
    akce = null;
  };
  zacni();
  vykresli(0);
  O.classList.add("pripravena");

  /* ═══ Našla ses: klepnutí ve schovce ═══ */
  let hlaska = 0;
  VG.addEventListener("pointerdown", () => {
    if (!schovka) return;
    rekni(VG, "vazicka", HLASKY[hlaska++ % HLASKY.length], { kontrast: true });
    O.style.opacity = "";
    /* počká, až se dotočí (beh.js), a uletí jinam */
    fronta = [
      cekej(1.3, PRED),
      posun(() => schovka?.pristup ?? volneMisto(), 0.5, null),
      vrstva(Z.volna),
      hned(() => (schovka = null)),
      let_(volneMisto, 1),
    ];
    akce = null;
  });

  /* ═══ Smyčka: běží jen, když je úvod vidět ═══ */
  let videt = false;
  let minule: number | null = null;
  const smycka = (ted: number) => {
    if (!videt) {
      minule = null;
      return;
    }
    const dt = minule == null ? 0 : Math.min(0.05, (ted - minule) / 1000);
    minule = ted;
    cas += dt;
    if (!reklaOKami && cas >= O_KAMI.po && window.scrollY < H * 0.25) rekniOKami();
    if (!akce) {
      if (!fronta.length) dalsiKolo();
      akce = fronta.shift() ?? null;
      akceCas = 0;
      akce?.start?.();
    }
    if (akce) {
      akceCas += dt;
      const q = Math.min(1, akceCas / akce.delka);
      akce.krok(q);
      if (q >= 1) akce = null;
    }
    vykresli(dt);
    requestAnimationFrame(smycka);
  };
  new IntersectionObserver((zaznamy) => {
    const bylo = videt;
    videt = zaznamy[0].isIntersecting;
    if (videt && !bylo) requestAnimationFrame(smycka);
  }).observe(S);

  /* Změna okna: přeměřit a začít znovu z volného místa */
  let cekaResize = 0;
  window.addEventListener("resize", () => {
    window.clearTimeout(cekaResize);
    cekaResize = window.setTimeout(() => {
      zacni();
      vykresli(0);
    }, 220);
  });
}
