/**
 * Život v krajině úvodu Domku 2 (UvodKrajina.astro). Podle ročního období
 * padá z koruny ořechu listí, na podzim občas spadne ořech, v zimě sněží,
 * na jaře letí z louky chmýří pampelišek a po nebi občas táhnou ptáci —
 * husy v klínu (předjaří, jaro, podzim), v létě vlaštovky. Klepnutím na kmen
 * se strom otřese: koruna se zachvěje, spadne z ní podle období listí
 * s ořechy, sníh, pyl nebo kapky a z dutiny hned vykoukne veverka.
 *
 * Pohyb je celý v CSS (uvod-zivot.css): skript kus postaví a do proměnných
 * mu napíše, odkud kam a jak dlouho; animuje se jen transformace
 * a průhlednost. Žádná snímková smyčka — časovače jen přidávají nové kusy
 * a hlídají, kolik jich je. Dohraný kus se odebere po poslední animaci
 * (dmz-zhasni, hejno po dmz-prelet); kdyby nedoběhla, uklidí ho hlídání
 * času. Sníh se pustí jednou a padá dokola.
 *
 * Vrstvy (z-index mezi čísly krajiny v domek2.css):
 *   ptáci             1  vlastní .dmu-ptaci hned za mlhou — nad kopci,
 *                        za domem i stromem
 *   klepací kmen      6  neviditelná plocha přes střed kmene; okraje kmene
 *                        nechává volné, ať jde klepnout na Vázičku za ním
 *   listí, ořechy,
 *   sníh, chmýří     11  .dmu-zivot nad loukou, pod Vázičkou a textem
 *
 * Odkud co padá, je v data-mista stromu (souřadnice jeho plátna, kresba/
 * orech.ts) — přepočítá se přes getScreenCTM jako u Vázičky (let-kami.ts)
 * a znovu, když se změní velikost úvodu. Když úvod není vidět, nic se
 * nepouští a animace stojí (třída dmz-stoji na sekci); hodiny, podle
 * kterých se plánuje, stojí s nimi. S omezeným pohybem se nespustí nic.
 *
 * Při návratu na stránku bez načtení (prechody.ts) se init volá znovu —
 * uvodZivot() si proto nejdřív uklidí po minulém běhu.
 *
 * Na telefonu (kvalita.ts) je kusů zhruba polovina: počty se sice zmenšují
 * s plochou úvodu, ale jen do 0,4 — na malé obrazovce by jich bylo hustěji
 * než na počítači. Ptáků je v hejnu o dvě pětiny méně.
 */
import { castic } from "../parta2/kvalita";

type Bod = { x: number; y: number };
type Mapa = (u: number, v: number) => Bod;
type Druh = "list" | "orech" | "semeno" | "hejno" | "naraz";
interface Kus { el: HTMLElement; druh: Druh; konec: number }
interface Mista { listi: [number, number][]; orechy: [number, number][]; kmen: { l: number; r: number; y0: number; y1: number } }

/** Strom (kresba/orech.ts): zem a osa kmene na plátně; kmen pro případ, že chybí v data-mista */
const STROM = { zem: 1300, osa: 1170, kmen: { l: 1068, r: 1272, y0: 1000, y1: 1230 } };
/** Hrana země louky na jejím plátně (kresba/svitani.ts) */
const LOUKA_ZEM = 148;
/** Obrazovka, ke které jsou vztažené počty a velikosti */
const VZOR = { w: 1440, h: 900 };
/** Tíže v px/s² na jednotku plátna stromu (9,81 m/s², strom má asi 72 jednotek na metr) */
const TIHA = 9.81 * 72;
/** Nejkratší rozestup klepnutí na kmen (ms) a jak dlouho trvá otřes a vykouknutí veverky */
const KLEPANI = { rozestup: 1200, otres: 950, veverka: 2500 };

const nahodne = (a: number, b: number) => a + Math.random() * (b - a);
const omez = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const los = <T>(pole: readonly T[]): T => pole[Math.floor(Math.random() * pole.length)];
const znamenko = () => (Math.random() < 0.5 ? -1 : 1);
const px = (n: number) => `${n.toFixed(1)}px`;
const sek = (n: number) => `${n.toFixed(2)}s`;
const deg = (n: number) => `${n.toFixed(1)}deg`;
const f = (n: number) => n.toFixed(2);

/* ═══ Kresby kusů ═══ */

/** Paprsky deštníčku chmýří: ze středu (0, −3), délka 7,6, od −66° do 66° od svislice */
const PAPRSKY = [-66, -44, -22, 0, 22, 44, 66].map((a) => {
  const r = (a * Math.PI) / 180;
  return [Math.sin(r) * 7.6, -3 - Math.cos(r) * 7.6];
});
const SVG = (viewBox: string, obsah: string) => `<svg viewBox="${viewBox}" overflow="visible" focusable="false">${obsah}</svg>`;
const KRESBA = {
  /** jeden lístek ořešáku — symbol z kresby stromu, barvu mu dá CSS období (ou-l0 … ou-l3) */
  list: (ton: string) => SVG("-17 -17 34 34", `<use href="#ou-ld" class="${ton}"/>`),
  /** ořech v zelené slupce, nebo puklý */
  orech: (puk: boolean) => SVG("-16 -16 32 32", `<use href="#${puk ? "ou-ob" : "ou-oa"}" class="${puk ? "ou-pukly" : "ou-orech"}"/>`),
  /** chmýří pampelišky: nažka na tenké stopce, nahoře deštníček */
  chmyri: SVG(
    "-8 -12 16 24",
    `<path d="M0 -3 L${PAPRSKY[0].map(f).join(" ")} A7.6 7.6 0 0 1 ${PAPRSKY[PAPRSKY.length - 1].map(f).join(" ")} Z" fill="#FFFFFF" fill-opacity="0.28"/>` +
      `<path d="${PAPRSKY.map(([x, y]) => `M0 -3 L${f(x)} ${f(y)}`).join(" ")}" stroke="#FFFFFF" stroke-width="0.6" stroke-linecap="round" fill="none"/>` +
      `<g fill="#FFFFFF">${PAPRSKY.map(([x, y]) => `<circle cx="${f(x)}" cy="${f(y)}" r="0.75"/>`).join("")}</g>` +
      `<path d="M0 -3 L0 7.6" stroke="#EDE6D2" stroke-width="0.7" fill="none"/>` +
      `<ellipse cx="0" cy="9.6" rx="1" ry="2.3" fill="#A08A58"/>`,
  ),
  /** chumáč sněhu z větve */
  chumac: SVG(
    "-6 -5 12 10",
    `<ellipse cx="0" cy="1.2" rx="5.2" ry="3.4" fill="#DCE5EF"/><circle cx="-1.8" cy="-0.6" r="3" fill="#F7FAFD"/><circle cx="1.9" cy="-0.2" r="2.6" fill="#F7FAFD"/><circle cx="0.2" cy="-1.8" r="2.2" fill="#FFFFFF"/>`,
  ),
  /** kapka z tajícího sněhu */
  kapka: SVG(
    "-3 -6 6 10",
    `<path d="M0 -5.5 C1.4 -2.6 2.6 -0.6 2.6 1.2 A2.6 2.6 0 0 1 -2.6 1.2 C-2.6 -0.6 -1.4 -2.6 0 -5.5 Z" fill="#CFE2F1"/><circle cx="-0.9" cy="1" r="0.8" fill="#FFFFFF" fill-opacity="0.85"/>`,
  ),
  /** suchá větvička (barva větviček stromu) */
  vetvicka: SVG("-12 -4 24 8", `<path d="M-10 1 L10 -1 M2 -0.2 L6 -3.2" stroke="#675F69" stroke-width="1.6" stroke-linecap="round" fill="none"/>`),
  /** husa letí doprava: křídla mávají kolem těla v bodě (12; 7,6), uvod-zivot.css */
  husa: SVG(
    "0 0 24 12",
    `<g class="dmz-kridla"><path d="M11.2 7 Q6.2 2.6 1.2 2.8 Q6.4 6.4 11.6 8.2 Z M12.8 7 Q17.8 2.6 22.8 2.8 Q17.6 6.4 12.4 8.2 Z"/></g>` +
      `<path d="M7.6 8 C9 6.4 12.6 6.2 15 6.7 L18.4 5.7 C19.9 5.4 20.6 6.6 19.6 7.2 L15.6 8.3 C13.4 9.2 9.4 9.4 7.6 8 Z"/>`,
  ),
  /** vlaštovka letí doprava: dlouhá špičatá křídla, vidlicový ocas; křídla kolem (10; 6,2) */
  vlastovka: SVG(
    "0 0 20 10",
    `<g class="dmz-kridla"><path d="M9.6 5.8 Q5.4 2.2 0.6 2.6 Q5.2 5.2 9.4 7 Z M10.4 5.8 Q14.6 2.2 19.4 2.6 Q14.8 5.2 10.6 7 Z"/></g>` +
      `<path d="M6.4 6.5 C7.8 5.3 11.2 5.1 13.4 5.8 C14.6 6.1 14.5 6.9 13.3 7.1 C11 7.6 7.9 7.6 6.4 6.5 Z M6.9 6.3 L2.4 5 L5.4 6.6 L2.4 8.2 L6.9 7 Z"/>`,
  ),
};
/** Rozpětí křídel v jednotkách kresby (šířka obrázku je 24 a 20) */
const ROZPETI = { husa: 21.6, vlastovka: 18.8 };

/** Místa ve stromě z data-mista — jen to, co je potřeba, a s rozumnými náhradami */
function ctiMista(strom: HTMLElement | null): Mista {
  let m: Record<string, unknown> = {};
  try {
    m = JSON.parse(strom?.dataset.mista ?? "{}");
  } catch {
    /* bez míst nic nepadá, sníh a ptáci jsou dál */
  }
  const body = (v: unknown) =>
    Array.isArray(v) ? v.filter((p): p is [number, number] => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1])) : [];
  const k = m.kmen as Mista["kmen"] | undefined;
  return { listi: body(m.listi), orechy: body(m.orechy), kmen: k && [k.l, k.r, k.y0, k.y1].every(Number.isFinite) ? k : STROM.kmen };
}

/** Úklid po minulém běhu (návrat na stránku, přepnutí omezeného pohybu) */
let uklidMinule: (() => void) | null = null;

export function uvodZivot() {
  uklidMinule?.();
  uklidMinule = null;

  const sekce = document.querySelector<HTMLElement>("#uvod.dm-uvod");
  const krajina = sekce?.querySelector<HTMLElement>(".dmu-krajina");
  const vrstva = krajina?.querySelector<HTMLElement>(".dmu-zivot");
  if (!sekce || !krajina || !vrstva) return;
  const S = sekce, K = krajina, Z = vrstva;
  const strom = K.querySelector<HTMLElement>(".dmu-orech");

  const uklid: (() => void)[] = [];
  uklidMinule = () => uklid.splice(0).reverse().forEach((fn) => fn());

  /* S omezeným pohybem nic — a když se to přepne, začne se znovu */
  const klidne = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  if (klidne?.addEventListener) {
    const znovu = () => uvodZivot();
    klidne.addEventListener("change", znovu);
    uklid.push(() => klidne.removeEventListener("change", znovu));
  }
  if (klidne?.matches) return;

  const sezona = S.dataset.sezona ?? "leto";
  const mista = ctiMista(strom);

  /* ═══ Hodiny, které stojí, když úvod není vidět ═══ */
  let rozbeh = -1, nabehano = 0;
  const hodiny = () => nabehano + (rozbeh >= 0 ? performance.now() - rozbeh : 0);

  /* ═══ Vlastní prvky v krajině ═══ */
  /* ptáci: nad kopci a mlhou, za domem a stromem */
  let ptaci: HTMLElement | null = null;
  if (sezona !== "zima") {
    K.querySelectorAll(".dmu-ptaci").forEach((el) => el.remove());
    const p = document.createElement("div");
    p.className = "dmu-ptaci";
    p.setAttribute("aria-hidden", "true");
    const za = K.querySelector(".dmu-mlha-2"), pred = K.querySelector(".uvod-kopce-dum");
    if (za) za.after(p);
    else if (pred) pred.before(p);
    else K.prepend(p);
    ptaci = p;
    uklid.push(() => p.remove());
  }
  /* klepací plocha přes střed kmene, hned za stromem (stejná vrstva jako kmen, ale navrch) */
  let klep: HTMLElement | null = null;
  if (strom) {
    K.querySelectorAll(".dmz-kmen").forEach((el) => el.remove());
    const k = document.createElement("div");
    k.className = "dmz-kmen";
    k.setAttribute("aria-hidden", "true");
    strom.after(k);
    klep = k;
    uklid.push(() => k.remove());
  }

  /* ═══ Měření krajiny ═══ */
  let W = 0, H = 0, m = 1, u = 0.7, plocha = 1;
  let zem = 0, loukaVrch = 0, loukaH = 0, loukaZem = 0;
  let startyListi: (Bod & { vaha: number })[] = [];
  let startyOrechu: Bod[] = [];

  /** Mapa ze souřadnic SVG prvku (jeho viewBox) do souřadnic sekce */
  const mapa = (el: Element | null | undefined, s: DOMRect): Mapa | null => {
    const c = (el as SVGGraphicsElement | null | undefined)?.getScreenCTM?.();
    if (!c) return null;
    return (x, y) => ({ x: c.a * x + c.c * y + c.e - s.left, y: c.b * x + c.d * y + c.f - s.top });
  };

  const zmer = () => {
    const s = S.getBoundingClientRect();
    W = s.width;
    H = s.height;
    m = omez(H / VZOR.h, 0.75, 1.3);
    plocha = omez((W * H) / (VZOR.w * VZOR.h), 0.4, 1.2);
    const louka = S.querySelector(".dmu-louka")?.getBoundingClientRect();
    loukaVrch = louka?.height ? louka.top - s.top : H * 0.82;
    loukaH = louka?.height ? louka.height : H * 0.18;
    const L = mapa(S.querySelector(".dmu-louka .louka-zem"), s);
    loukaZem = L ? L(0, LOUKA_ZEM).y : loukaVrch + loukaH * 0.6;

    /* plátno je u všech vrstev stromu stejné; přední koruna se kolébá, kmen stojí */
    const Mk = mapa(strom?.querySelector(".orech-kmen"), s);
    const M = mapa(strom?.querySelector(".orech-koruna-predni"), s) ?? Mk;
    if (!M) {
      startyListi = [];
      startyOrechu = [];
      zem = Math.min(loukaZem, H - 12);
      if (klep) klep.hidden = true;
      return;
    }
    const a = M(0, 0), b = M(100, 0);
    u = Math.hypot(b.x - a.x, b.y - a.y) / 100 || 0.7;
    zem = omez((Mk ?? M)(STROM.osa, STROM.zem).y, H * 0.5, H - 12);

    /* pod nadpisem a perexem padá listí jen občas */
    const t = S.querySelector(".uvod-text")?.getBoundingClientRect();
    const text = t?.width ? { l: t.left - s.left - 24, r: t.right - s.left + 24, b: t.bottom - s.top } : null;
    startyListi = mista.listi
      .map(([x, y]) => M(x, y))
      .filter((p) => p.x > -8 && p.x < W + 8 && p.y > H * 0.02 && p.y < zem - H * 0.1)
      .map((p) => ({ ...p, vaha: text && p.x > text.l && p.x < text.r && p.y < text.b ? 0.2 : 1 }));
    startyOrechu = mista.orechy
      .map(([x, y]) => M(x, y))
      .filter((p) => p.x > W * 0.02 && p.x < W * 0.98 && p.y > H * 0.03 && p.y < zem - 40 * m);

    /* klepací plocha: kmen bez krajních 18 % z obou stran */
    if (klep) {
      const k = mista.kmen, okraj = (k.r - k.l) * 0.18;
      const p0 = (Mk ?? M)(k.l + okraj, k.y0), p1 = (Mk ?? M)(k.r - okraj, k.y1);
      klep.style.left = px(Math.min(p0.x, p1.x));
      klep.style.top = px(Math.min(p0.y, p1.y));
      klep.style.width = px(Math.abs(p1.x - p0.x));
      klep.style.height = px(Math.abs(p1.y - p0.y));
      klep.hidden = false;
    }
  };

  /* ═══ Kusy ═══ */
  const kusy = new Map<HTMLElement, Kus>();
  const pocet = (druh: Druh) => {
    let n = 0;
    kusy.forEach((k) => {
      if (k.druh === druh) n++;
    });
    return n;
  };
  const odeber = (el: HTMLElement) => {
    el.remove();
    kusy.delete(el);
  };
  /** Postaví kus: třídy, proměnné do stylu a vnitřek */
  const postav = (trida: string, styl: Record<string, string | number>, obsah: string) => {
    const el = document.createElement("div");
    el.className = `dmz-c ${trida}`;
    for (const [k, v] of Object.entries(styl)) el.style.setProperty(k, String(v));
    el.innerHTML = obsah;
    return el;
  };
  /** Pustí kus do vrstvy; `zije` je za kolik vteřin dohraje (pro hlídání času) */
  const pust = (rodic: HTMLElement, druh: Druh, el: HTMLElement, zije: number) => {
    rodic.append(el);
    kusy.set(el, { el, druh, konec: hodiny() + zije * 1000 });
  };
  /* dohraný kus pryč: poslední animace je zhasnutí, u hejna přelet */
  const dohrano = (e: Event) => {
    const jmeno = (e as AnimationEvent).animationName;
    if (jmeno !== "dmz-zhasni" && jmeno !== "dmz-prelet") return;
    const el = (e.target as Element | null)?.closest<HTMLElement>(".dmz-c");
    if (el && kusy.has(el)) odeber(el);
  };
  for (const v of [Z, ptaci]) {
    if (!v) continue;
    v.addEventListener("animationend", dohrano);
    uklid.push(() => v.removeEventListener("animationend", dohrano));
  }
  /* kdyby animace nedoběhla (třeba bez stylů), uklidí kus hlídání času */
  const zametej = () => {
    const ted = hodiny();
    kusy.forEach((k) => {
      if (ted > k.konec + 3000) odeber(k.el);
    });
  };
  uklid.push(() => {
    kusy.forEach((k) => k.el.remove());
    kusy.clear();
    Z.querySelectorAll(".dmz-c").forEach((el) => el.remove());
  });

  /* ═══ Listí ═══ */
  const TONY = sezona === "podzim" ? ["ou-l0", "ou-l1", "ou-l1", "ou-l2", "ou-l2", "ou-l2", "ou-l3"] : ["ou-l1", "ou-l2", "ou-l2", "ou-l3"];
  /** Místo na okraji koruny; nad textem jen s pětinovou vahou */
  const startListu = () => {
    let l = Math.random() * startyListi.reduce((a, p) => a + p.vaha, 0);
    for (const p of startyListi) if ((l -= p.vaha) <= 0) return p;
    return startyListi[startyListi.length - 1];
  };
  /**
   * Lístek z koruny: snáší se jako kyvadlo, s větříkem trochu doprava, na
   * louce chvíli leží a zhasne. `d` je zpoždění animací (záporné = už letí).
   */
  const pustList = (d = 0, druh: Druh = "list") => {
    if (!startyListi.length) return;
    const p = startListu();
    const x = p.x + nahodne(-14, 14) * u, y = p.y + nahodne(-6, 12) * u;
    const dopad = Math.min(H - 6, nahodne(zem, Math.max(zem, loukaZem) + loukaH * 0.15));
    const dy = Math.max(40, dopad - y);
    const t = omez(dy / (nahodne(36, 58) * m), 4.5, 16);
    /* počet kývnutí je celý, ať dosedne v krajní poloze, kde se kyvadlo zastaví */
    const n = Math.max(2, Math.round(t / nahodne(0.9, 1.6)));
    const w = 34 * u * nahodne(0.72, 1.05);
    d = Math.max(d, -t * 0.9);
    const konec = d + t + nahodne(1, 2.4);
    pust(Z, druh, postav("dmz-pad dmz-list", {
      left: px(x - w / 2), top: px(y - w / 2), "--w": px(w), "--t": sek(t), "--d": sek(d),
      "--dx": px(dy * nahodne(-0.12, 0.3)), "--dy": px(dy), "--tk": sek(t / n), "--n": n,
      "--kx": px(nahodne(8, 22) * m), "--r": deg(znamenko() * nahodne(55, 115)), "--uhel": deg(nahodne(16, 32)),
      "--flip": deg(nahodne(25, 70)), "--konec": sek(konec),
    }, KRESBA.list(los(TONY))), konec + 1.2);
  };

  /* ═══ Ořechy ═══ */
  /** Ořech: padá zrychleně, dvakrát odskočí, asi tři vteřiny leží a zhasne */
  const pustOrech = (d = 0, puk = Math.random() < 0.4, druh: Druh = "orech") => {
    if (!startyOrechu.length) return;
    const p = los(startyOrechu);
    const x = p.x + nahodne(-6, 6) * u, y = p.y + nahodne(0, 8) * u;
    const D = Math.max(30, Math.min(H - 8, zem + loukaH * nahodne(0.02, 0.3)) - y);
    const g = TIHA * u;
    const t = Math.sqrt((2 * D) / g);
    /* v trávě odskočí jen kousek; druhý odskok má pětinu výšky — dohromady 1,447× doba prvního (keyframes v CSS) */
    const bh = omez(D * 0.025, 4 * m, 11 * m);
    const tb = 1.447 * 2 * Math.sqrt((2 * bh) / g);
    const w = 32 * u * nahodne(0.95, 1.1);
    const r0 = nahodne(-30, 30);
    const konec = d + t + tb + nahodne(2.6, 3.4);
    pust(Z, druh, postav("dmz-pad dmz-orech", {
      left: px(x - w / 2), top: px(y - w / 2), "--w": px(w), "--t": sek(t), "--d": sek(d), "--dy": px(D),
      "--tb": sek(tb), "--bh": px(bh), "--bx": px(znamenko() * nahodne(3, 10) * m),
      "--r0": deg(r0), "--r1": deg(r0 + znamenko() * nahodne(90, 240)), "--konec": sek(konec),
    }, `<div>${KRESBA.orech(puk)}</div>`), konec + 0.9);
  };

  /* ═══ Po otřesu: co padá volně (chumáče, kapky, větvičky) a co se práší (sníh, pyl) ═══ */
  const zKoruny = () => {
    if (!startyListi.length) return null;
    const p = startListu();
    return { x: p.x + nahodne(-40, 40) * u, y: p.y + nahodne(-20, 30) * u };
  };
  /** Těžší kus padá zrychleně až na zem, kde zhasne; `zpomal` ubere tíži (sníh brzdí vzduch) */
  const pustTize = (obsah: string, w: number, d: number, zpomal: number, toc: number) => {
    const p = zKoruny();
    if (!p) return;
    const D = Math.max(30, Math.min(H - 6, nahodne(zem, Math.max(zem, loukaZem))) - p.y);
    const t = Math.sqrt((2 * D) / (TIHA * u * zpomal));
    const r0 = nahodne(-25, 25);
    const konec = d + Math.max(0.2, t - 0.3);
    pust(Z, "naraz", postav("dmz-pad dmz-tize", {
      left: px(p.x - w / 2), top: px(p.y - w / 2), "--w": px(w), "--t": sek(t), "--d": sek(d),
      "--dx": px(nahodne(-10, 16) * m), "--dy": px(D), "--r0": deg(r0), "--r1": deg(r0 + znamenko() * toc), "--konec": sek(konec),
    }, obsah), konec + 0.4);
  };
  /** Prach z koruny — sněhový poprašek dolů, pyl jehněd víc do strany; cestou se rozplyne */
  const pustPrach = (pyl: boolean, d: number) => {
    const p = zKoruny();
    if (!p) return;
    const t = pyl ? nahodne(3.5, 6) : nahodne(2.6, 4.6);
    const s = (pyl ? nahodne(2.2, 3.6) : nahodne(2, 3.6)) * m;
    pust(Z, "naraz", postav(`dmz-pad dmz-prach ${pyl ? "dmz-pyl" : "dmz-snih"}`, {
      left: px(p.x - s / 2), top: px(p.y - s / 2), "--s": px(s), "--t": sek(t), "--d": sek(d),
      "--dx": px((pyl ? nahodne(30, 110) : nahodne(-20, 30)) * m), "--dy": px((pyl ? nahodne(-10, 80) : nahodne(60, 180)) * m),
      "--tk": sek(nahodne(0.9, 1.6)), "--kx": px(nahodne(3, 8) * m), "--konec": sek(d + t * 0.55), "--tout": sek(t * 0.45),
    }, "<i></i>"), d + t);
  };

  /* ═══ Chmýří ═══ */
  /** Semínko pampelišky z louky: vítr ho nese doprava a nahoru, kolébá se pod deštníčkem */
  const pustSemeno = (d = 0) => {
    if (!W) return;
    const t = nahodne(16, 24);
    d = Math.max(d, -t * 0.8);
    const w = 15 * m * nahodne(0.8, 1.1);
    const x = W * nahodne(0.03, 0.72), y = loukaVrch + loukaH * nahodne(0.12, 0.55);
    pust(Z, "semeno", postav("dmz-pad dmz-semeno", {
      left: px(x - w / 2), top: px(y - w * 0.75), "--w": px(w), "--t": sek(t), "--d": sek(d),
      "--dx": px(W * nahodne(0.18, 0.4)), "--dy": "0px", "--vy": px(-H * nahodne(0.25, 0.5)),
      "--tk": sek(nahodne(1.8, 3.2)), "--uhel": deg(nahodne(8, 16)), "--konec": sek(d + t - 2.4),
    }, `<div>${KRESBA.chmyri}</div>`), d + t);
  };

  /* ═══ Sníh: vzadu malé a pomalé vločky, vpředu větší a rychlejší; padají dokola ═══ */
  const snih = () => {
    const n = castic(Math.round(40 * omez(plocha, 0.5, 1.15)));
    const kusySnehu = document.createDocumentFragment();
    for (let i = 0; i < n; i++) {
      const q = i / n;
      const [s, t, o, kx] =
        q < 0.45 ? [nahodne(1.6, 2.6), nahodne(16, 24), nahodne(0.45, 0.6), nahodne(4, 10)]
        : q < 0.8 ? [nahodne(2.6, 3.8), nahodne(11, 16), nahodne(0.65, 0.8), nahodne(8, 16)]
        : [nahodne(4.2, 6.2), nahodne(7.5, 10.5), nahodne(0.82, 0.95), nahodne(12, 24)];
      const tk = nahodne(2.4, 4.4);
      kusySnehu.append(postav("dmz-vlocka", {
        left: `${nahodne(-4, 100).toFixed(2)}%`, "--s": px(s * m), "--o": o.toFixed(2),
        "--t": sek(t), "--d": sek(-nahodne(0, t)), "--dx": px(nahodne(-20, 50) * m),
        "--tk": sek(tk), "--d2": sek(-nahodne(0, tk)), "--kx": px(kx * m),
      }, "<i></i>"));
    }
    Z.append(kusySnehu);
  };

  /* ═══ Ptáci ═══ */
  /** Hejno přes horní část oblohy (8–32 % výšky): husy v klínu, nebo vlaštovky v obloučcích. Vrátí dobu přeletu. */
  const pustHejno = () => {
    if (!ptaci || !W) return 0;
    ptaci.querySelectorAll<HTMLElement>(".dmz-hejno").forEach(odeber);
    const vlastovky = sezona === "leto";
    /* klín potřebuje aspoň tři husy */
    const n = Math.max(vlastovky ? 2 : 3, castic(vlastovky ? 3 + Math.floor(Math.random() * 3) : 5 + Math.floor(Math.random() * 5), 0.6));
    const rozpeti = (vlastovky ? nahodne(9, 12) : nahodne(11, 14)) * omez(m, 0.85, 1.2);
    const w = vlastovky ? (rozpeti * 20) / ROZPETI.vlastovka : (rozpeti * 24) / ROZPETI.husa;
    const body: Bod[] = [{ x: 0, y: 0 }];
    if (vlastovky) {
      for (let i = 1, x = 0; i < n; i++) body.push({ x: (x -= w * nahodne(1.6, 3.2)), y: nahodne(-1.6, 1.6) * w });
    } else {
      /* klín: vedoucí vpředu, ramena dozadu nahoru a dolů, jedno bývá delší */
      const gx = w * nahodne(1.05, 1.3), gy = w * nahodne(0.42, 0.58);
      const horni = omez(Math.round((n - 1) / 2 + nahodne(-1, 1)), 1, n - 2);
      for (let j = 1; j < n; j++) {
        const i = j <= horni ? j : j - horni;
        body.push({ x: -i * gx + nahodne(-0.15, 0.15) * w, y: (j <= horni ? -1 : 1) * i * gy + nahodne(-0.12, 0.12) * w });
      }
    }
    /* celé hejno i s obloučky vlaštovek musí zůstat v pásu oblohy */
    const vlna = vlastovky ? 26 * m : 3 * m;
    const nahore = Math.min(...body.map((b) => b.y)) - w * 0.3 - vlna;
    const dole = Math.max(...body.map((b) => b.y)) + w * 0.3 + vlna;
    const delka = -Math.min(...body.map((b) => b.x)) + w;
    const yMin = H * 0.08 - nahore, yMax = Math.max(yMin, H * 0.32 - dole);
    const y0 = nahodne(yMin, yMax), y1 = omez(y0 + nahodne(-0.05, 0.05) * H, yMin, yMax);
    const vpravo = Math.random() < 0.5;
    const t = vlastovky ? nahodne(10, 15) : nahodne(35, 45);
    const ptak = vlastovky ? KRESBA.vlastovka : KRESBA.husa;
    const html = body
      .map((b) => {
        const th = vlastovky ? nahodne(1.4, 2.6) : nahodne(3, 6);
        const tm = vlastovky ? nahodne(1.2, 1.7) : nahodne(0.95, 1.25);
        const styl = [
          `left:${px(b.x)}`, `top:${px(b.y)}`, `--th:${sek(th)}`, `--dh:${sek(-nahodne(0, 2 * th))}`,
          `--tm:${sek(tm)}`, `--dm:${sek(-nahodne(0, tm))}`,
          vlastovky ? `--hy:${px(nahodne(10, 26) * m)};--naklon:${deg(nahodne(10, 20))}` : `--hx:${px(nahodne(-2, 2) * m)};--hy:${px(nahodne(-2.5, 2.5) * m)}`,
        ];
        return `<div class="dmz-ptak" style="${styl.join(";")}">${ptak}</div>`;
      })
      .join("");
    /* doleva letí zrcadlově kolem vedoucího (scaleX(−1) v CSS) */
    pust(ptaci, "hejno", postav(`dmz-hejno ${vlastovky ? "dmz-vlastovky" : "dmz-husy"}`, {
      "--w": px(w), "--t": sek(t), "--smer": vpravo ? 1 : -1,
      "--x0": px(vpravo ? -w : W + w), "--x1": px(vpravo ? W + delka + w : -delka - w), "--y0": px(y0), "--y1": px(y1),
    }, html), t);
    return t;
  };

  /* ═══ Plánování na hodinách, které stojí, když úvod není vidět ═══ */
  const planovace: { spust: () => void; stuj: () => void }[] = [];
  /** Opakovaná akce: poprvé za `prvni` ms, pak `krok` něco pustí a vrátí, za kolik ms znovu */
  const planuj = (prvni: number, krok: () => number) => {
    let kdy = prvni, id = 0;
    const spust = () => {
      window.clearTimeout(id);
      id = window.setTimeout(() => {
        id = 0;
        zametej();
        kdy = hodiny() + krok();
        spust();
      }, Math.max(0, kdy - hodiny()));
    };
    planovace.push({ spust, stuj: () => window.clearTimeout(id) });
  };
  /** Co se pustí hned při prvním rozběhu, ať úvod nezačíná prázdný */
  const predem: (() => void)[] = [];

  if (sezona === "podzim" || sezona === "leto") {
    /* podzim: 12–16 listů najednou, občas poryv změní kolik; léto: tu a tam jeden zelený */
    const podzim = sezona === "podzim";
    let zaklad = podzim ? nahodne(12, 16) : 3;
    const cil = () => Math.max(podzim ? 4 : 1, castic(Math.round(zaklad * plocha)));
    planuj(podzim ? 300 : nahodne(1500, 4000), () => {
      if (podzim && Math.random() < 0.06) zaklad = nahodne(12, 16);
      if (pocet("list") < cil()) pustList();
      return podzim ? nahodne(300, 850) : nahodne(2800, 6000);
    });
    predem.push(() => {
      for (let i = podzim ? Math.round(cil() * 0.7) : 1; i > 0; i--) pustList(-nahodne(0, 12));
    });
  }
  if (sezona === "podzim") {
    planuj(nahodne(2500, 6000), () => {
      if (pocet("orech") < castic(3)) pustOrech();
      return nahodne(5000, 11000);
    });
  }
  if (sezona === "jaro") {
    planuj(nahodne(800, 2500), () => {
      if (pocet("semeno") < Math.max(2, castic(Math.round(5 * plocha)))) pustSemeno();
      return nahodne(1800, 4200);
    });
    predem.push(() => {
      for (let i = 0; i < 3; i++) pustSemeno(-nahodne(2, 14));
    });
  }
  if (ptaci) {
    /* nové hejno, až to staré odletí, jinak jednou za 40–70 s */
    planuj(nahodne(5000, 16000), () => Math.max(nahodne(40000, 70000), pustHejno() * 1000 + 6000));
  }

  /* ═══ Klepnutí na kmen: otřes koruny, veverka a co spadne ═══ */
  const veverka = strom?.querySelector<SVGGElement>(".ou-veverka") ?? null;
  let naposled = -Infinity, otresId = 0, veverkaId = 0;
  const zatres = () => {
    const ted = performance.now();
    if (ted - naposled < KLEPANI.rozestup) return;
    naposled = ted;
    if (!W) zmer();

    /* koruna se místo kolébání tlumeně zachvěje (třída na obalu stromu, uvod-zivot.css) */
    if (strom) {
      const st = strom;
      st.classList.remove("dmz-otres");
      void st.offsetWidth;
      st.classList.add("dmz-otres");
      window.clearTimeout(otresId);
      otresId = window.setTimeout(() => st.classList.remove("dmz-otres"), KLEPANI.otres);
    }
    /* veverka hned vykoukne a rozhlédne se */
    if (veverka) {
      const v = veverka;
      v.classList.remove("dmz-vykoukni");
      void v.getBoundingClientRect();
      v.classList.add("dmz-vykoukni");
      window.clearTimeout(veverkaId);
      veverkaId = window.setTimeout(() => v.classList.remove("dmz-vykoukni"), KLEPANI.veverka);
    }

    /* a něco spadne — podle období (na telefonu zhruba polovina) */
    if (pocet("naraz") > castic(80)) return;
    const kolik = (a: number, b: number) => castic(a + Math.floor(Math.random() * (b - a + 1)));
    if (sezona === "podzim") {
      for (let i = castic(8); i > 0; i--) pustList(nahodne(0, 0.5), "naraz");
      for (let i = kolik(2, 3); i > 0; i--) pustOrech(nahodne(0.05, 0.6), undefined, "naraz");
    } else if (sezona === "leto") {
      for (let i = castic(4); i > 0; i--) pustList(nahodne(0, 0.5), "naraz");
      if (Math.random() < 0.4) pustOrech(nahodne(0.1, 0.5), false, "naraz");
    } else if (sezona === "zima") {
      for (let i = castic(6); i > 0; i--) pustTize(KRESBA.chumac, nahodne(6, 11) * m, nahodne(0, 0.6), 0.55, nahodne(20, 80));
      for (let i = castic(8); i > 0; i--) pustPrach(false, nahodne(0, 0.8));
    } else if (sezona === "jaro") {
      for (let i = castic(10); i > 0; i--) pustPrach(true, nahodne(0, 0.7));
    } else {
      /* předjaří: z tajícího sněhu skápne pár kapek, občas suchá větvička */
      for (let i = kolik(3, 4); i > 0; i--) pustTize(KRESBA.kapka, nahodne(5.5, 7.5) * m, nahodne(0, 0.5), 1, 0);
      if (Math.random() < 0.5) pustTize(KRESBA.vetvicka, 22 * u, nahodne(0.1, 0.4), 0.7, nahodne(120, 280));
    }
  };
  if (klep) klep.addEventListener("click", zatres);
  uklid.push(() => {
    window.clearTimeout(otresId);
    window.clearTimeout(veverkaId);
    strom?.classList.remove("dmz-otres");
    veverka?.classList.remove("dmz-vykoukni");
  });

  /* ═══ Vidět / nevidět ═══ */
  let bezi = false, poprve = true;
  const rozbehni = () => {
    if (bezi) return;
    bezi = true;
    rozbeh = performance.now();
    S.classList.remove("dmz-stoji");
    if (!W) zmer();
    if (poprve) {
      poprve = false;
      predem.forEach((fn) => fn());
    }
    planovace.forEach((p) => p.spust());
  };
  const zastav = () => {
    if (!bezi) return;
    nabehano = hodiny();
    rozbeh = -1;
    bezi = false;
    S.classList.add("dmz-stoji");
    planovace.forEach((p) => p.stuj());
  };
  uklid.push(() => {
    planovace.forEach((p) => p.stuj());
    S.classList.remove("dmz-stoji");
  });

  zmer();
  if (sezona === "zima") snih();
  S.classList.add("dmz-stoji");
  if ("IntersectionObserver" in window) {
    const pozor = new IntersectionObserver((zaznamy) => (zaznamy[zaznamy.length - 1].isIntersecting ? rozbehni() : zastav()));
    pozor.observe(S);
    uklid.push(() => pozor.disconnect());
  } else rozbehni();

  /* Změna okna: přeměřit, jen když se úvod opravdu změnil (lišta prohlížeče na mobilu ho nemění) */
  let cekaZmena = 0;
  const priZmene = () => {
    window.clearTimeout(cekaZmena);
    cekaZmena = window.setTimeout(() => {
      const s = S.getBoundingClientRect();
      if (Math.abs(s.width - W) >= 1 || Math.abs(s.height - H) >= 1) zmer();
    }, 250);
  };
  window.addEventListener("resize", priZmene);
  uklid.push(() => {
    window.removeEventListener("resize", priZmene);
    window.clearTimeout(cekaZmena);
  });
}
