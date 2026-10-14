/**
 * Kresba svatyně pro /svatyne — malá lesní svatyně podle fotky (otevřený
 * rumělkový pavilon s prohnutou štítovou střechou, uvnitř svatyňka hokora,
 * před ním dva strážní draci místo lvích psů komainu). Je noc: dokud člověk nenajde všech devět
 * kami, svítí jen měsíc a přes cestu je provaz s cedulkou 九. Po odemčení
 * se rozsvítí lampiony, okna i lucerny a otevřou se dvířka svatyňky.
 *
 * Tři vrstvy na sobě, všechny ve stejných souřadnicích (scéna 1200 × 1000):
 *
 *   pozadi()   les, mlha, měsíční paprsky a štěrkové nádvoří — kreslí se
 *              daleko za okraje scény (viewBox -1800 -600 4800 1600), aby
 *              vyplnilo celou úvodní sekci, i když scéna sedí vpravo
 *   svatyne()  posvátný strom, destičky ema, pavilon, draci, nádržka
 *   popredi()  co má být před postavičkami: obětní skříňka (stojí na
 *              Šamotce), přední stěna nádržky (Bublinka je ve vodě),
 *              kořen nad Hlínkou a provaz se zámkem
 *
 * Postavičky mezi vrstvami pokládá stránka jako HTML (data/svatyne.ts).
 * Stavba je souměrná: levá půlka se kreslí jednou a zrcadlí (obe()).
 * Co se po odemčení rozsvítí, má třídu .sv-svetlo (a --z jako zpoždění),
 * dvířka .sv-dvere-l/-p, provaz .sv-provaz — přepíná to styles/svatyne.css.
 * Bez filtrů a textur: světlo a hmota jen přechody.
 */
import { chomac, nahoda } from "../parta2/tvary";

const f = (n: number) => Math.round(n * 10) / 10;
const S = 1200;
const C = 600;
const zrcadli = (s: string) => `<g transform="translate(${S} 0) scale(-1 1)">${s}</g>`;
/** Levá půlka a její zrcadlo — souměrnost stavby z jednoho zadání */
const obe = (s: string) => s + zrcadli(s);
/** Totéž kolem jiné osy než středu scény (stříška stojanu ema) */
const obeKolem = (cx: number, s: string) => s + `<g transform="translate(${f(2 * cx)} 0) scale(-1 1)">${s}</g>`;
const svetlo = (s: string, z = 0) => `<g class="sv-svetlo" style="--z:${z}">${s}</g>`;
const body = (b: [number, number][]) => "M" + b.map(([x, y]) => `${f(x)} ${f(y)}`).join(" L") + " Z";

const P = {
  shu: "#B4382B",
  shuSvetlo: "#DA5A41",
  shuStin: "#7E2621",
  shuTma: "#4C1819",
  strecha: "#3A2B33",
  strechaSvetlo: "#76606E",
  strechaTma: "#211920",
  zlato: "#E2B24A",
  zlatoSvetlo: "#F9E09A",
  zlatoStin: "#9A6E22",
  zelena: "#3E7C67",
  zelenaSvetlo: "#7DB898",
  kamen: "#8D8AA7",
  kamenSvetlo: "#BEBAD2",
  kamenStin: "#5D5A7B",
  kamenTma: "#3F3D5E",
  mech: "#4A6D5D",
  mechSvetlo: "#6F977C",
  drevo: "#9A7150",
  drevoSvetlo: "#C69C6E",
  drevoStin: "#654531",
  papir: "#F5F0E3",
  slama: "#D8C088",
  slamaStin: "#A68B52",
  mriz: "#1A1724",
  tma: "#1D1928",
  noc: "#2A2E45",
  zare: "#FFD98A",
};

/* ——— Přechody ——— */

const DEFS =
  `<linearGradient id="sv-sloup" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${P.shuTma}"/><stop offset="0.3" stop-color="${P.shu}"/><stop offset="0.55" stop-color="${P.shuSvetlo}"/><stop offset="0.8" stop-color="${P.shu}"/><stop offset="1" stop-color="${P.shuStin}"/></linearGradient>` +
  `<linearGradient id="sv-tram" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.shuSvetlo}"/><stop offset="0.45" stop-color="${P.shu}"/><stop offset="1" stop-color="${P.shuStin}"/></linearGradient>` +
  `<linearGradient id="sv-stit" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.shuTma}"/><stop offset="1" stop-color="${P.shuStin}"/></linearGradient>` +
  `<linearGradient id="sv-podhled" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5E1D1C"/><stop offset="1" stop-color="${P.shuStin}"/></linearGradient>` +
  `<linearGradient id="sv-krytina" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.strechaSvetlo}"/><stop offset="0.25" stop-color="${P.strecha}"/><stop offset="1" stop-color="${P.strechaTma}"/></linearGradient>` +
  `<linearGradient id="sv-zlato" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.zlatoSvetlo}"/><stop offset="0.5" stop-color="${P.zlato}"/><stop offset="1" stop-color="${P.zlatoStin}"/></linearGradient>` +
  `<linearGradient id="sv-kamen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.kamenSvetlo}"/><stop offset="0.35" stop-color="${P.kamen}"/><stop offset="1" stop-color="${P.kamenStin}"/></linearGradient>` +
  `<linearGradient id="sv-kamen-bok" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${P.kamenStin}"/><stop offset="0.5" stop-color="${P.kamen}"/><stop offset="1" stop-color="${P.kamenStin}"/></linearGradient>` +
  `<radialGradient id="sv-drak" cx="0.38" cy="0.3" r="0.85"><stop offset="0" stop-color="#F07250"/><stop offset="0.5" stop-color="#C9422F"/><stop offset="1" stop-color="#8A2722"/></radialGradient>` +
  `<radialGradient id="sv-drak-hlava" cx="0.45" cy="0.32" r="0.75"><stop offset="0" stop-color="#F68A64"/><stop offset="0.6" stop-color="#D24A34"/><stop offset="1" stop-color="#9A2C24"/></radialGradient>` +
  `<radialGradient id="sv-perla" cx="0.38" cy="0.35" r="0.7"><stop offset="0" stop-color="#FFFFFF"/><stop offset="0.45" stop-color="#FFEAB0"/><stop offset="1" stop-color="#E0A040"/></radialGradient>` +
  `<linearGradient id="sv-vnitrek" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#120F1A"/><stop offset="1" stop-color="#2A2336"/></linearGradient>` +
  `<linearGradient id="sv-okno" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2C3350"/><stop offset="1" stop-color="#3B4566"/></linearGradient>` +
  `<linearGradient id="sv-okno-svetlo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE3A0"/><stop offset="1" stop-color="#FFB45E"/></linearGradient>` +
  `<radialGradient id="sv-zare" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${P.zare}" stop-opacity="0.85"/><stop offset="0.4" stop-color="#FFB86B" stop-opacity="0.35"/><stop offset="1" stop-color="#FF9E5A" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="sv-zare-mekka" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#FFCB78" stop-opacity="0.5"/><stop offset="0.6" stop-color="#FFA860" stop-opacity="0.16"/><stop offset="1" stop-color="#FF9E5A" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="sv-lampion" cx="0.45" cy="0.42" r="0.6"><stop offset="0" stop-color="#FFF4C8"/><stop offset="0.45" stop-color="#FFB25A"/><stop offset="1" stop-color="#D2452C"/></radialGradient>` +
  `<radialGradient id="sv-lampion-tma" cx="0.45" cy="0.4" r="0.65"><stop offset="0" stop-color="#9A3A2E"/><stop offset="1" stop-color="#5A1E1E"/></radialGradient>` +
  `<radialGradient id="sv-zrcadlo" cx="0.4" cy="0.38" r="0.65"><stop offset="0" stop-color="#FFFBEA"/><stop offset="0.6" stop-color="#FFE29A"/><stop offset="1" stop-color="#D9A040"/></radialGradient>` +
  `<linearGradient id="sv-drevo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.drevoSvetlo}"/><stop offset="1" stop-color="${P.drevoStin}"/></linearGradient>` +
  `<linearGradient id="sv-kmen" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4A3E52"/><stop offset="0.3" stop-color="#352B3B"/><stop offset="0.75" stop-color="#211A27"/><stop offset="1" stop-color="#16121C"/></linearGradient>` +
  `<linearGradient id="sv-bambus" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9DB57A"/><stop offset="0.5" stop-color="#6E8C55"/><stop offset="1" stop-color="#4A633D"/></linearGradient>` +
  `<linearGradient id="sv-bambus-svisly" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4A633D"/><stop offset="0.5" stop-color="#8FA96D"/><stop offset="1" stop-color="#4A633D"/></linearGradient>` +
  `<linearGradient id="sv-voda" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6E88B0"/><stop offset="1" stop-color="#2B3A60"/></linearGradient>` +
  `<linearGradient id="sv-lem" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFB866" stop-opacity="0"/><stop offset="0.55" stop-color="#FFB866" stop-opacity="0.45"/><stop offset="1" stop-color="#FFB866" stop-opacity="0.6"/></linearGradient>` +
  `<linearGradient id="sv-slama" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EBD7A2"/><stop offset="0.5" stop-color="${P.slama}"/><stop offset="1" stop-color="${P.slamaStin}"/></linearGradient>`;

/* ——— Střecha ——— */

interface Stit {
  /** osa, výška vrcholu horní hrany, polovina rozpětí, o kolik hrana klesne */
  cx: number;
  ay: number;
  w: number;
  h: number;
  /** tloušťka krytiny a štítového prkna u vrcholu */
  tl: number;
  hafu: number;
}

/** Bod na horní hraně levé půlky střechy: t = 0 vrchol, 1 špička. Hrana je prohnutá a špička se zvedá. */
function hrana(s: Stit, t: number): [number, number] {
  const g = 1 - Math.pow(1 - t, 1.5);
  const zdvih = t > 0.78 ? Math.pow((t - 0.78) / 0.22, 2) * s.h * 0.17 : 0;
  return [s.cx - s.w * t, s.ay + s.h * g - zdvih];
}
const tlKrytiny = (s: Stit, t: number) => s.tl * (1 - 0.3 * t);
const tlHafu = (s: Stit, t: number) => s.hafu * (1 - 0.2 * t);
/** Spodní hrana štítového prkna v bodě t */
const spodekHafu = (s: Stit, t: number): [number, number] => {
  const [x, y] = hrana(s, t);
  return [x, y + tlKrytiny(s, t) + tlHafu(s, t)];
};

const N = 48;
/** Souměrný pás podél hrany: od posunu `nahore(t)` do `dole(t)`, pro t od 0 do t1 */
function pas(s: Stit, nahore: (t: number) => number, dole: (t: number) => number, t1 = 1) {
  const b: [number, number][] = [];
  for (let i = N; i >= 0; i--) {
    const t = (t1 * i) / N;
    const [x, y] = hrana(s, t);
    b.push([x, y + nahore(t)]);
  }
  for (let i = 1; i <= N; i++) {
    const t = (t1 * i) / N;
    const [x, y] = hrana(s, t);
    b.push([2 * s.cx - x, y + nahore(t)]);
  }
  for (let i = N; i >= 0; i--) {
    const t = (t1 * i) / N;
    const [x, y] = hrana(s, t);
    b.push([2 * s.cx - x, y + dole(t)]);
  }
  for (let i = 1; i <= N; i++) {
    const t = (t1 * i) / N;
    const [x, y] = hrana(s, t);
    b.push([x, y + dole(t)]);
  }
  return body(b);
}
/** Čára podél hrany přes obě půlky (posun od horní hrany) */
function cara(s: Stit, posun: (t: number) => number, t0 = 0, t1 = 1) {
  const b: string[] = [];
  for (let i = N; i >= 0; i--) {
    const t = t0 + ((t1 - t0) * i) / N;
    const [x, y] = hrana(s, t);
    b.push(`${f(x)} ${f(y + posun(t))}`);
  }
  for (let i = 0; i <= N; i++) {
    const t = t0 + ((t1 - t0) * i) / N;
    const [x, y] = hrana(s, t);
    b.push(`${f(2 * s.cx - x)} ${f(y + posun(t))}`);
  }
  return "M" + b.join(" L");
}
/** t, kde spodek štítového prkna sestoupí na výšku y (půlením) */
function tNaVysce(s: Stit, y: number) {
  let a = 0, b = 1;
  for (let i = 0; i < 30; i++) {
    const m = (a + b) / 2;
    if (spodekHafu(s, m)[1] < y) a = m;
    else b = m;
  }
  return (a + b) / 2;
}

/** Zlatá růžička — kryt hlavičky hřebu na prkně (kugikakushi) */
function ruzicka(x: number, y: number, r: number) {
  let s = "";
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    s += `<ellipse cx="${f(x + Math.cos(a) * r * 0.62)}" cy="${f(y + Math.sin(a) * r * 0.62)}" rx="${f(r * 0.48)}" ry="${f(r * 0.32)}" transform="rotate(${f((a * 180) / Math.PI)} ${f(x + Math.cos(a) * r * 0.62)} ${f(y + Math.sin(a) * r * 0.62)})" fill="${P.zlato}"/>`;
  }
  return s + `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 0.42)}" fill="${P.zlatoSvetlo}"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 0.16)}" fill="${P.zlatoStin}"/>`;
}

/** Zlatý květ o šesti okvětních lístcích (na gegyo a kaerumatě) */
function kvet(x: number, y: number, r: number) {
  let s = "";
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 3;
    const px = x + Math.cos(a) * r * 0.55, py = y + Math.sin(a) * r * 0.55;
    s += `<ellipse cx="${f(px)}" cy="${f(py)}" rx="${f(r * 0.34)}" ry="${f(r * 0.5)}" transform="rotate(${f((a * 180) / Math.PI + 90)} ${f(px)} ${f(py)})" fill="url(#sv-zlato)"/>`;
  }
  return s + `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 0.3)}" fill="${P.zlatoStin}"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 0.16)}" fill="${P.zlatoSvetlo}"/>`;
}

/**
 * Štítová střecha zepředu: krytina z kůry jako tlustý prohnutý pás, pod ní
 * rumělkové štítové prkno se zlatou lištou a růžičkami. `podrobne` přidá
 * vrstvy krytiny a růžičky (velká svatyně); malá svatyňka je má bez nich.
 */
function strecha(s: Stit, podrobne = true) {
  let o = "";
  o += `<path d="${pas(s, () => 0, (t) => tlKrytiny(s, t))}" fill="url(#sv-krytina)"/>`;
  if (podrobne) {
    for (const k of [0.32, 0.55, 0.78]) o += `<path d="${cara(s, (t) => tlKrytiny(s, t) * k)}" fill="none" stroke="${P.strechaTma}" stroke-width="1.4" opacity="0.6"/>`;
  }
  /* hrana, na kterou svítí měsíc */
  o += `<path d="${cara(s, () => 1.2)}" fill="none" stroke="${P.strechaSvetlo}" stroke-width="2.2" stroke-linecap="round" opacity="0.9"/>`;
  o += `<path d="${pas(s, (t) => tlKrytiny(s, t), (t) => tlKrytiny(s, t) + tlHafu(s, t))}" fill="url(#sv-tram)"/>`;
  o += `<path d="${cara(s, (t) => tlKrytiny(s, t) + tlHafu(s, t) - 1.4)}" fill="none" stroke="${P.zlato}" stroke-width="${podrobne ? 2.6 : 1.4}"/>`;
  o += `<path d="${cara(s, (t) => tlKrytiny(s, t) + 1)}" fill="none" stroke="${P.shuTma}" stroke-width="1.4" opacity="0.7"/>`;
  /* špičky: čelo krytiny a zlatý kryt konce prkna */
  const [tx, ty] = hrana(s, 1);
  const tk = tlKrytiny(s, 1), th = tlHafu(s, 1);
  o += obeKolem(
    s.cx,
    `<path d="M${f(tx)} ${f(ty)} l${f(-s.tl * 0.22)} ${f(-s.tl * 0.08)} l${f(s.tl * 0.12)} ${f(tk + th)} l${f(s.tl * 0.2)} ${f(-s.tl * 0.06)} Z" fill="${P.strechaSvetlo}" opacity="0.9"/>` +
      `<rect x="${f(tx - 1)}" y="${f(ty + tk)}" width="${f(s.tl * 0.42)}" height="${f(th)}" fill="url(#sv-zlato)"/>`,
  );
  if (podrobne) {
    for (const t of [0.3, 0.5, 0.7, 0.88]) {
      const [x, y] = hrana(s, t);
      const r = tlHafu(s, t) * 0.36;
      o += obeKolem(s.cx, ruzicka(x, y + tlKrytiny(s, t) + tlHafu(s, t) / 2, r));
    }
  }
  return o;
}

/** Onigawara na hřebeni: kamenný štít s oblačnými spirálami a zlatým erbem ořechu */
function onigawara(cx: number, y: number, m: number) {
  const p = (x: number, yy: number) => `${f(cx + x * m)} ${f(y + yy * m)}`;
  let l = "";
  l += `<path d="M${p(0, 4)} L${p(-36, 4)} C${p(-44, 2)} ${p(-46, -8)} ${p(-38, -14)} C${p(-46, -22)} ${p(-40, -36)} ${p(-28, -34)} C${p(-28, -48)} ${p(-14, -54)} ${p(-6, -46)} C${p(-4, -56)} ${p(0, -60)} ${p(0, -62)} Z" fill="url(#sv-kamen)"/>`;
  l += `<path d="M${p(-30, -6)} c${f(-6 * m)} ${f(-2 * m)} ${f(-6 * m)} ${f(-10 * m)} ${f(0)} ${f(-10 * m)} c${f(5 * m)} 0 ${f(5 * m)} ${f(6 * m)} ${f(1 * m)} ${f(6 * m)}" fill="none" stroke="${P.kamenStin}" stroke-width="${f(2 * m)}" stroke-linecap="round"/>`;
  l += `<path d="M${p(-24, -30)} c${f(-5 * m)} ${f(-1 * m)} ${f(-5 * m)} ${f(-9 * m)} ${f(0)} ${f(-9 * m)} c${f(4 * m)} 0 ${f(4 * m)} ${f(5 * m)} ${f(1 * m)} ${f(5 * m)}" fill="none" stroke="${P.kamenStin}" stroke-width="${f(2 * m)}" stroke-linecap="round"/>`;
  l += `<path d="M${p(-36, 2)} C${p(-40, -6)} ${p(-36, -12)} ${p(-30, -14)}" fill="none" stroke="${P.kamenSvetlo}" stroke-width="${f(1.6 * m)}" opacity="0.8"/>`;
  let s = obeKolem(cx, l);
  /* erb: ořech v kruhu */
  s += `<circle cx="${f(cx)}" cy="${f(y - 24 * m)}" r="${f(15 * m)}" fill="url(#sv-zlato)"/>`;
  s += `<circle cx="${f(cx)}" cy="${f(y - 24 * m)}" r="${f(15 * m)}" fill="none" stroke="${P.zlatoStin}" stroke-width="${f(1.4 * m)}"/>`;
  s += `<path d="M${f(cx)} ${f(y - 34 * m)} C${f(cx + 9 * m)} ${f(y - 32 * m)} ${f(cx + 10 * m)} ${f(y - 16 * m)} ${f(cx)} ${f(y - 13 * m)} C${f(cx - 10 * m)} ${f(y - 16 * m)} ${f(cx - 9 * m)} ${f(y - 32 * m)} ${f(cx)} ${f(y - 34 * m)} Z M${f(cx)} ${f(y - 33 * m)} V${f(y - 14 * m)}" fill="${P.zlatoStin}" stroke="${P.zlatoSvetlo}" stroke-width="${f(0.9 * m)}" opacity="0.9"/>`;
  return s;
}

/** Gegyo — zdobení pod vrcholem štítu: rumělkové prkno se zlatým lemem a květem */
function gegyo(cx: number, y: number, m: number) {
  const p = (x: number, yy: number) => `${f(cx + x * m)} ${f(y + yy * m)}`;
  const tvar = (k: number) =>
    `M${p(0, 0)} L${p(-20 * k, 0)} C${p(-30 * k, 6 * k)} ${p(-32 * k, 22 * k)} ${p(-22 * k, 32 * k)} C${p(-16 * k, 40 * k)} ${p(-8 * k, 44 * k)} ${p(-6 * k, 52 * k)} C${p(-4 * k, 60 * k)} ${p(-1 * k, 64 * k)} ${p(0, 68 * k)} ` +
    `C${p(1 * k, 64 * k)} ${p(4 * k, 60 * k)} ${p(6 * k, 52 * k)} C${p(8 * k, 44 * k)} ${p(16 * k, 40 * k)} ${p(22 * k, 32 * k)} C${p(32 * k, 22 * k)} ${p(30 * k, 6 * k)} ${p(20 * k, 0)} Z`;
  let s = `<path d="${tvar(1)}" fill="url(#sv-zlato)"/>`;
  s += `<path d="${tvar(0.9)}" transform="translate(0 ${f(2 * m)})" fill="url(#sv-tram)"/>`;
  s += obeKolem(cx, `<path d="M${p(-10, 46)} c${f(-6 * m)} ${f(-2 * m)} ${f(-9 * m)} ${f(-10 * m)} ${f(-3 * m)} ${f(-14 * m)}" fill="none" stroke="${P.zlato}" stroke-width="${f(1.8 * m)}" stroke-linecap="round"/>`);
  s += kvet(cx, y + 24 * m, 13 * m);
  return s;
}

/* ——— Pavilon ——— */

const ZEM = 760; /* pata schodů, začátek nádvoří */
const PODLAHA = 690; /* horní plocha kamenného soklu */
const SL = 416; /* osa levého sloupu */
const SLW = 30;
const KASHIRA = 420; /* horní hrana malovaného trámu */
const KETA = 372; /* horní hrana vaznice pod štítem */
const STIT: Stit = { cx: C, ay: 250, w: 350, h: 128, tl: 34, hafu: 17 };

/** Vějíř krokví pod přesahem střechy (ōgi-daruki) — levé křídlo */
function kridlo(klip = false) {
  const s = STIT;
  const t0 = tNaVysce(s, KETA);
  const b: [number, number][] = [];
  for (let i = 0; i <= N; i++) b.push(spodekHafu(s, t0 + ((1 - t0) * i) / N));
  const spicka = spodekHafu(s, 1);
  const dole: [number, number][] = [[spicka[0] + 8, spicka[1] + 8], [SL - SLW / 2, KASHIRA + 36], [SL - SLW / 2, KETA + 14], [b[0][0], KETA + 14]];
  const obrys = body([...b, ...dole]);
  /* ořez je jen jeden, zrcadlená půlka ho používá ve svých souřadnicích */
  if (klip) return `<clipPath id="sv-kridlo"><path d="${obrys}"/></clipPath>`;
  let o = `<path d="${obrys}" fill="url(#sv-podhled)"/>`;
  /* krokve se rozbíhají od sloupu ke krajům */
  const ohnisko: [number, number] = [SL + 10, KASHIRA + 60];
  let krokve = "", hrany = "";
  for (let i = 0; i <= 15; i++) {
    const [x, y] = spodekHafu(s, t0 + ((1 - t0) * i) / 15);
    krokve += `M${f(ohnisko[0])} ${f(ohnisko[1])} L${f(x)} ${f(y)} `;
    hrany += `M${f(ohnisko[0] - 3)} ${f(ohnisko[1])} L${f(x - 3)} ${f(y + 1)} `;
  }
  o += `<g clip-path="url(#sv-kridlo)"><path d="${hrany}" stroke="${P.shu}" stroke-width="3.2" opacity="0.75"/><path d="${krokve}" stroke="#3E1214" stroke-width="2.6"/></g>`;
  /* okapová vaznice: hrana, na které končí krokve */
  o += `<path d="M${f(spicka[0] + 6)} ${f(spicka[1] + 6)} L${SL - SLW / 2} ${KASHIRA + 34}" stroke="${P.shuStin}" stroke-width="9" stroke-linecap="round"/>`;
  o += `<path d="M${f(spicka[0] + 6)} ${f(spicka[1] + 3)} L${SL - SLW / 2} ${KASHIRA + 31}" stroke="${P.shuSvetlo}" stroke-width="2" stroke-linecap="round" opacity="0.7"/>`;
  return o;
}

/** Štít nad vaznicí: svislá prkna, uprostřed gegyo */
function stit() {
  const s = STIT;
  const t0 = tNaVysce(s, KETA);
  const b: [number, number][] = [];
  for (let i = 0; i <= N; i++) b.push(spodekHafu(s, t0 - (t0 * i) / N));
  for (let i = 1; i <= N; i++) {
    const [x, y] = spodekHafu(s, (t0 * i) / N);
    b.push([2 * C - x, y]);
  }
  b.push([2 * C - b[0][0], KETA + 2], [b[0][0], KETA + 2]);
  let o = `<path d="${body(b)}" fill="url(#sv-stit)"/>`;
  let prkna = "";
  for (let x = C - 168; x <= C + 168; x += 14) prkna += `M${x} ${KETA} V${STIT.ay + 40} `;
  o += `<clipPath id="sv-stit-klip"><path d="${body(b)}"/></clipPath><path d="${prkna}" stroke="${P.shuTma}" stroke-width="1.2" opacity="0.55" clip-path="url(#sv-stit-klip)"/>`;
  /* nosník uprostřed štítu a dvě zlaté kosočtverce */
  o += `<rect x="${C - 120}" y="${KETA - 30}" width="240" height="9" fill="${P.shuStin}"/><rect x="${C - 120}" y="${KETA - 30}" width="240" height="2.4" fill="${P.shuSvetlo}" opacity="0.6"/>`;
  o += obe(`<path d="M${C - 82} ${KETA - 25.5} l7 -7 l7 7 l-7 7 Z" fill="${P.zlato}"/>`);
  const vrch = spodekHafu(s, 0)[1];
  o += gegyo(C, vrch - 2, 0.95);
  return o;
}

/** Sloup se zlatými kováními nahoře a u paty */
function sloup(x: number) {
  const l = x - SLW / 2;
  let o = `<rect x="${l}" y="${KASHIRA}" width="${SLW}" height="${PODLAHA - KASHIRA}" fill="url(#sv-sloup)"/>`;
  o += `<rect x="${l - 1}" y="${KASHIRA + 26}" width="${SLW + 2}" height="9" fill="url(#sv-zlato)"/>`;
  o += `<rect x="${l - 2}" y="${PODLAHA - 16}" width="${SLW + 4}" height="16" fill="url(#sv-zlato)"/>`;
  o += `<path d="M${l - 2} ${PODLAHA - 9} H${l + SLW + 2}" stroke="${P.zlatoStin}" stroke-width="1.2"/>`;
  for (const k of [0.25, 0.5, 0.75]) o += `<circle cx="${f(l + SLW * k)}" cy="${PODLAHA - 12.5}" r="1.6" fill="${P.zlatoSvetlo}"/>`;
  return o;
}

/** Hlavice: velká patka, rameno a tři kostky pod vaznicí, ven z ní konzola s nosem kibana */
function hlavice(x: number) {
  let o = "";
  o += `<path d="M${x - 24} ${KASHIRA - 14} H${x + 24} L${x + 19} ${KASHIRA} H${x - 19} Z" fill="url(#sv-tram)"/>`;
  o += `<path d="M${x - 64} ${KASHIRA - 24} H${x + 64} C${x + 62} ${KASHIRA - 18} ${x + 52} ${KASHIRA - 14} ${x + 40} ${KASHIRA - 14} H${x - 40} C${x - 52} ${KASHIRA - 14} ${x - 62} ${KASHIRA - 18} ${x - 64} ${KASHIRA - 24} Z" fill="url(#sv-tram)"/>`;
  for (const d of [-50, 0, 50]) o += `<rect x="${x + d - 10}" y="${KETA + 14}" width="20" height="${KASHIRA - 24 - KETA - 14}" fill="${P.shu}"/><rect x="${x + d - 10}" y="${KETA + 14}" width="20" height="2.4" fill="${P.shuSvetlo}" opacity="0.7"/>`;
  /* konzola ven pod křídlo a její nos */
  const k = x - 70;
  o += `<path d="M${x - 15} ${KASHIRA - 12} H${k} C${k - 22} ${KASHIRA - 12} ${k - 30} ${KASHIRA + 2} ${k - 20} ${KASHIRA + 10} C${k - 12} ${KASHIRA + 16} ${k - 2} ${KASHIRA + 8} ${k + 2} ${KASHIRA + 2} H${x - 15} Z" fill="url(#sv-tram)"/>`;
  o += `<path d="M${k - 14} ${KASHIRA + 2} c-2 -6 6 -10 9 -5 c2 4 -3 7 -5 4" fill="none" stroke="${P.zlato}" stroke-width="1.8" stroke-linecap="round"/>`;
  o += `<rect x="${k - 4}" y="${KASHIRA - 24}" width="18" height="12" fill="${P.shu}"/>`;
  return o;
}

/** Malovaný trám kashiranuki: rumělka, zlatý rám a zelenozlaté úponky karakusa; konce jako nosy kibana */
function kashiranuki() {
  const y = KASHIRA, v = 26;
  const l = SL - 62;
  let o = "";
  /* nos na konci trámu (levý, zrcadlí se) */
  const nos =
    `<path d="M${l + 14} ${y} H${l} C${l - 20} ${y} ${l - 28} ${y + 14} ${l - 22} ${y + 24} C${l - 16} ${y + 34} ${l - 4} ${y + 34} ${l} ${y + v} H${l + 14} Z" fill="url(#sv-tram)"/>` +
    `<path d="M${l - 14} ${y + 18} c-2 -7 7 -11 11 -5 c3 5 -3 9 -6 5" fill="none" stroke="${P.zlato}" stroke-width="2" stroke-linecap="round"/>` +
    `<path d="M${l - 18} ${y + 8} q6 -6 14 -4" fill="none" stroke="${P.shuSvetlo}" stroke-width="1.4" opacity="0.7"/>`;
  o += obe(nos);
  o += `<rect x="${l + 12}" y="${y}" width="${2 * (C - l - 12)}" height="${v}" fill="url(#sv-tram)"/>`;
  /* malované pole mezi sloupy */
  const a = SL + SLW / 2 + 6;
  o += `<rect x="${a}" y="${y + 4}" width="${2 * (C - a)}" height="${v - 8}" fill="none" stroke="${P.zlato}" stroke-width="1.6"/>`;
  const ponka = (x0: number) => {
    let s = "";
    for (let i = 0; i < 3; i++) {
      const x = x0 + i * 50;
      s += `<path d="M${x} ${y + 13} c8 -10 20 -10 24 -2 c4 8 -6 12 -10 6 M${x + 24} ${y + 11} c6 8 18 8 22 2" fill="none" stroke="${P.zelenaSvetlo}" stroke-width="2" stroke-linecap="round"/>`;
      s += `<path d="M${x + 12} ${y + 7} q5 -3 9 1 q-5 2 -9 -1 Z M${x + 34} ${y + 19} q5 3 9 -1 q-5 -2 -9 1 Z" fill="${P.zelena}"/>`;
      s += `<circle cx="${x + 24}" cy="${y + 13}" r="2" fill="${P.zlato}"/>`;
    }
    return s;
  };
  o += obe(ponka(a + 10));
  o += `<rect x="${C - 18}" y="${y + 5}" width="36" height="${v - 10}" rx="3" fill="url(#sv-zlato)"/>` + kvet(C, y + v / 2, 7);
  o += `<path d="M${l + 12} ${y + 1} H${2 * C - l - 12}" stroke="${P.shuSvetlo}" stroke-width="1.6" opacity="0.7"/>`;
  return o;
}

/** Vaznice pod štítem se zlatými konci (uprostřed z ní visí deska se jménem) */
function keta() {
  let o = `<rect x="${SL - 40}" y="${KETA}" width="${2 * (C - SL + 40)}" height="14" fill="url(#sv-tram)"/>`;
  o += obe(`<rect x="${SL - 44}" y="${KETA - 1}" width="16" height="16" fill="url(#sv-zlato)"/>`);
  return o;
}

/** Deska hengaku se jménem svatyně — 胡桃神社, svatyně Ořechu — visí z vaznice přes kaerumatu */
function deska() {
  const w = 34, y = KETA + 4, h = 78;
  let o = `<path d="M${C - 10} ${KETA + 2} L${C} ${y} L${C + 10} ${KETA + 2}" fill="none" stroke="${P.zlatoStin}" stroke-width="1.6"/>`;
  o += `<rect x="${C - w / 2 - 5}" y="${y}" width="${w + 10}" height="${h}" rx="3" fill="#15111A"/>`;
  o += `<rect x="${C - w / 2 - 5}" y="${y}" width="${w + 10}" height="${h}" rx="3" fill="none" stroke="${P.zlato}" stroke-width="2"/>`;
  o += `<rect x="${C - w / 2}" y="${y + 5}" width="${w}" height="${h - 10}" fill="#1F2A4A"/>`;
  ["胡", "桃", "神", "社"].forEach((z, i) => {
    o += `<text x="${C}" y="${y + 21 + i * 15}" font-family="Yuji Syuku, Yu Mincho, serif" font-size="13" fill="${P.zlatoSvetlo}" text-anchor="middle">${z}</text>`;
  });
  return o;
}

/** Vnitřek: tma, zadní sloupky, mřížová okna (po odemčení prosvítí) */
function vnitrek() {
  const a = SL + SLW / 2, b = 2 * C - a;
  let o = `<rect x="${a}" y="${KASHIRA}" width="${b - a}" height="${PODLAHA - KASHIRA}" fill="url(#sv-vnitrek)"/>`;
  const okno = (x: number, w: number) => {
    const y = KASHIRA + 56, h = PODLAHA - 22 - y;
    let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#sv-okno)"/>`;
    s += svetlo(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#sv-okno-svetlo)"/>`, 3);
    let m = "";
    for (let xx = x + 11; xx < x + w; xx += 11) m += `M${xx} ${y} V${y + h} `;
    for (let yy = y + 11; yy < y + h; yy += 11) m += `M${x} ${yy} H${x + w} `;
    s += `<path d="${m}" stroke="${P.mriz}" stroke-width="3.6"/>`;
    s += `<rect x="${x - 4}" y="${y - 4}" width="${w + 8}" height="${h + 8}" fill="none" stroke="${P.shuTma}" stroke-width="8"/>`;
    return s;
  };
  o += obe(okno(a + 46, 82));
  o += obe(`<rect x="${a + 20}" y="${KASHIRA + 30}" width="14" height="${PODLAHA - KASHIRA - 30}" fill="${P.shuTma}"/><rect x="${a + 24}" y="${KASHIRA + 30}" width="3" height="${PODLAHA - KASHIRA - 30}" fill="${P.shuStin}"/>`);
  /* stín pod trámem a podlaha */
  o += `<rect x="${a}" y="${KASHIRA}" width="${b - a}" height="44" fill="#0E0B14" opacity="0.6"/>`;
  o += `<rect x="${a}" y="${PODLAHA - 10}" width="${b - a}" height="10" fill="#3B2A2C"/>`;
  return o;
}

/** Svatyňka hokora na stupňovitém oltáři; dvířka se po odemčení otevřou a za nimi svítí zrcadlo */
function hokora() {
  let o = "";
  /* záře za svatyňkou */
  o += svetlo(`<ellipse cx="${C}" cy="600" rx="190" ry="150" fill="url(#sv-zare)"/>`, 2);
  /* oltář: dva stupně černého laku se zlatou lištou */
  o += `<rect x="${C - 88}" y="${PODLAHA - 26}" width="176" height="26" fill="#1F1820"/><rect x="${C - 88}" y="${PODLAHA - 26}" width="176" height="3" fill="${P.zlato}"/>`;
  o += `<rect x="${C - 70}" y="${PODLAHA - 40}" width="140" height="14" fill="#2A2028"/><rect x="${C - 70}" y="${PODLAHA - 40}" width="140" height="2.4" fill="${P.zlato}"/>`;
  /* tělo */
  const yt = 572, yb = PODLAHA - 40;
  o += `<rect x="${C - 52}" y="${yt}" width="104" height="${yb - yt}" fill="url(#sv-tram)"/>`;
  o += obe(`<rect x="${C - 52}" y="${yt}" width="10" height="${yb - yt}" fill="url(#sv-sloup)"/><rect x="${C - 53}" y="${yb - 7}" width="12" height="7" fill="url(#sv-zlato)"/>`);
  o += `<rect x="${C - 56}" y="${yt - 6}" width="112" height="8" fill="${P.shuStin}"/><rect x="${C - 56}" y="${yt - 6}" width="112" height="2" fill="${P.zlato}"/>`;
  /* za dvířky: zrcadlo shintai */
  o += `<rect x="${C - 34}" y="${yt + 10}" width="68" height="${yb - yt - 10}" fill="#2A1A14"/>`;
  o += svetlo(`<rect x="${C - 34}" y="${yt + 10}" width="68" height="${yb - yt - 10}" fill="#FFCF7A"/><circle cx="${C}" cy="${yt + 36}" r="18" fill="url(#sv-zrcadlo)"/><circle cx="${C}" cy="${yt + 36}" r="18" fill="none" stroke="${P.zlatoStin}" stroke-width="2"/>`, 1);
  /* dvířka: černý lak, zlaté pásy a kroužky */
  const dvere = (x: number, tr: string) =>
    `<g class="${tr}"><rect x="${x}" y="${yt + 10}" width="34" height="${yb - yt - 10}" fill="#16121A"/>` +
    `<rect x="${x}" y="${yt + 16}" width="34" height="4" fill="${P.zlato}"/><rect x="${x}" y="${yb - 12}" width="34" height="4" fill="${P.zlato}"/>` +
    `<rect x="${x + 3}" y="${yt + 26}" width="28" height="${yb - yt - 42}" fill="none" stroke="${P.zlatoStin}" stroke-width="1.2"/></g>`;
  o += dvere(C - 34, "sv-dvere-l") + dvere(C, "sv-dvere-p");
  o += `<g class="sv-dvere-kruhy"><circle cx="${C - 5}" cy="${(yt + yb) / 2 + 6}" r="3" fill="none" stroke="${P.zlato}" stroke-width="1.6"/><circle cx="${C + 5}" cy="${(yt + yb) / 2 + 6}" r="3" fill="none" stroke="${P.zlato}" stroke-width="1.6"/></g>`;
  /* vpravo na oltáři váza se sakaki — vlevo stojí Vázička */
  o += vaza(C + 74, PODLAHA - 26);
  /* stříška svatyňky */
  const s: Stit = { cx: C, ay: 520, w: 92, h: 36, tl: 11, hafu: 6 };
  const t0 = tNaVysce(s, yt - 6);
  const b: [number, number][] = [];
  for (let i = 0; i <= 20; i++) b.push(spodekHafu(s, t0 - (t0 * i) / 20));
  for (let i = 1; i <= 20; i++) {
    const [x, y] = spodekHafu(s, (t0 * i) / 20);
    b.push([2 * C - x, y]);
  }
  b.push([2 * C - b[0][0], yt - 5], [b[0][0], yt - 5]);
  o += `<path d="${body(b)}" fill="url(#sv-stit)"/>`;
  o += strecha(s, false);
  o += kvet(C, spodekHafu(s, 0)[1] + 9, 6);
  o += onigawara(C, s.ay + 1, 0.32);
  return o;
}

/** Bílá váza s větvičkou sakaki a papírkem shide (tamagushi) */
function vaza(x: number, y: number) {
  let o = `<path d="M${x - 3} ${y - 32} h6 c0 4 8 6 9 14 c1 8 -3 14 -5 18 h-14 c-2 -4 -6 -10 -5 -18 c1 -8 9 -10 9 -14 Z" fill="#EEE8DC"/>`;
  o += `<path d="M${x + 2} ${y - 28} c4 3 7 6 7 12" fill="none" stroke="#FFFFFF" stroke-width="1.6" opacity="0.8"/>`;
  o += `<path d="M${x - 5} ${y - 22} h10" stroke="#C4432B" stroke-width="1.6"/>`;
  o += `<path d="M${x} ${y - 32} C${x - 2} ${y - 46} ${x - 6} ${y - 56} ${x - 8} ${y - 66} M${x} ${y - 40} C${x + 6} ${y - 50} ${x + 10} ${y - 56} ${x + 12} ${y - 64}" fill="none" stroke="#4A3A2A" stroke-width="1.6"/>`;
  for (const [dx, dy, u] of [[-10, -58, -40], [-4, -66, -10], [-12, -70, -60], [10, -56, 40], [14, -66, 20], [4, -50, 60], [-6, -48, -70]] as [number, number, number][]) {
    o += `<ellipse cx="${x + dx}" cy="${y + dy}" rx="3.4" ry="7" transform="rotate(${u} ${x + dx} ${y + dy})" fill="#2F5A45"/>`;
  }
  o += shideTvar(x + 3, y - 52, 9);
  return o;
}

/** Zvonek suzu s pleteným provazem ve třech barvách */
function zvonek(x: number) {
  const y0 = KASHIRA + 26;
  let o = `<g class="sv-zvonek" style="transform-origin:${x}px ${y0}px">`;
  o += `<path d="M${x} ${y0} V${y0 + 20}" stroke="${P.slamaStin}" stroke-width="2"/>`;
  o += `<circle cx="${x}" cy="${y0 + 36}" r="15" fill="url(#sv-zlato)"/><path d="M${x - 9} ${y0 + 40} H${x + 9}" stroke="${P.zlatoStin}" stroke-width="2.4" stroke-linecap="round"/><circle cx="${x}" cy="${y0 + 45}" r="2.4" fill="${P.zlatoStin}"/><circle cx="${x - 5}" cy="${y0 + 30}" r="3.4" fill="${P.zlatoSvetlo}" opacity="0.8"/>`;
  const barvy = ["#D9483A", "#F5EFE2", "#6B4E9A", "#F5EFE2"];
  const top = y0 + 52, bot = PODLAHA - 30;
  o += `<rect x="${x - 7}" y="${top}" width="14" height="${bot - top}" rx="6" fill="#F5EFE2"/>`;
  let pruhy = "";
  for (let y = top, i = 0; y < bot - 6; y += 8, i++) pruhy += `<path d="M${x - 7} ${y + 6} L${x + 7} ${y}" stroke="${barvy[i % 4]}" stroke-width="4.2"/>`;
  o += `<g clip-path="url(#sv-provaz-klip-${x})">${pruhy}</g><clipPath id="sv-provaz-klip-${x}"><rect x="${x - 7}" y="${top}" width="14" height="${bot - top}" rx="6"/></clipPath>`;
  o += `<path d="M${x - 9} ${bot} h18 l-3 22 h-12 Z" fill="#D9483A"/><path d="M${x - 9} ${bot} h18" stroke="${P.zlato}" stroke-width="3"/>`;
  return o + `</g>`;
}

/** Svatý provaz shimenawa se čtyřmi papírovými střapci shide */
function shimenawa(x1: number, x2: number, y: number, pruvis: number, tl: number, shide: number[]) {
  const mx = (x1 + x2) / 2;
  const d = `M${x1} ${y} Q${mx} ${y + pruvis * 2} ${x2} ${y}`;
  let o = `<path d="${d}" fill="none" stroke="url(#sv-slama)" stroke-width="${tl}" stroke-linecap="round"/>`;
  o += `<path d="${d}" fill="none" stroke="${P.slamaStin}" stroke-width="${tl}" stroke-dasharray="2.6 ${f(tl * 0.5)}" stroke-linecap="butt" opacity="0.7"/>`;
  o += `<path d="${d}" fill="none" stroke="#F6E8BE" stroke-width="${f(tl * 0.22)}" transform="translate(0 ${f(-tl * 0.22)})" opacity="0.7"/>`;
  for (const x of shide) {
    const t = (x - x1) / (x2 - x1);
    const yy = y + pruvis * 2 * 2 * t * (1 - t) + tl * 0.3;
    o += shideTvar(x, yy, tl * 0.32 + 6);
  }
  return o;
}
/** Papírový střapec shide: klikatý proužek */
function shideTvar(x: number, y: number, m: number) {
  const k = m / 10;
  return `<path class="sv-shide" style="transform-origin:${f(x)}px ${f(y)}px" d="M${f(x - 4 * k)} ${f(y)} h${f(8 * k)} v${f(9 * k)} h${f(-6 * k)} l${f(6 * k)} ${f(1 * k)} v${f(9 * k)} h${f(-6 * k)} l${f(6 * k)} ${f(1 * k)} v${f(10 * k)} l${f(-5 * k)} ${f(4 * k)} v${f(-10 * k)} h${f(6 * k)} l${f(-6 * k)} ${f(-1 * k)} v${f(-9 * k)} h${f(6 * k)} l${f(-6 * k)} ${f(-1 * k)} Z" fill="${P.papir}"/>`;
}

/** Lampion chōchin na šňůře z okapu; rozsvítí se */
function chochin(x: number, y: number, z: number) {
  let o = `<path d="M${x} ${y - 30} V${y - 4}" stroke="#2B2028" stroke-width="2"/>`;
  o += svetlo(`<circle class="sv-plamen" cx="${x}" cy="${y + 42}" r="90" fill="url(#sv-zare-mekka)"/>`, z);
  o += `<g class="sv-lampion" style="--z:${z}">`;
  o += `<rect x="${x - 15}" y="${y - 6}" width="30" height="9" rx="2" fill="#1E1820"/>`;
  o += `<ellipse cx="${x}" cy="${y + 42}" rx="30" ry="40" fill="url(#sv-lampion-tma)"/>`;
  o += svetlo(`<ellipse cx="${x}" cy="${y + 42}" rx="30" ry="40" fill="url(#sv-lampion)"/>`, z);
  let zebra = "";
  for (let i = 1; i < 9; i++) {
    const yy = y + 2 + i * 9;
    const w = 30 * Math.sqrt(Math.max(0, 1 - Math.pow((yy - y - 42) / 40, 2)));
    zebra += `M${f(x - w)} ${f(yy)} Q${x} ${f(yy + 3)} ${f(x + w)} ${f(yy)} `;
  }
  o += `<path d="${zebra}" fill="none" stroke="#5A1A18" stroke-width="1.2" opacity="0.55"/>`;
  o += `<rect x="${x - 6}" y="${y + 18}" width="12" height="48" fill="#1E1820" opacity="0.75"/>`;
  o += `<text x="${x}" y="${y + 39}" font-family="Yuji Syuku, Yu Mincho, serif" font-size="17" fill="#F7EBD2" text-anchor="middle">献</text><text x="${x}" y="${y + 60}" font-family="Yuji Syuku, Yu Mincho, serif" font-size="17" fill="#F7EBD2" text-anchor="middle">灯</text>`;
  o += `<rect x="${x - 15}" y="${y + 80}" width="30" height="9" rx="2" fill="#1E1820"/>`;
  o += `<path d="M${x} ${y + 89} v14" stroke="#D9483A" stroke-width="3"/><path d="M${x - 4} ${y + 100} h8 l-1 14 h-6 Z" fill="#D9483A"/>`;
  return o + `</g>`;
}

/** Kamenný sokl, schody a mech v koutech */
function sokl() {
  const l = C - 236, r = C + 236;
  let o = `<rect x="${l}" y="${PODLAHA}" width="${r - l}" height="${ZEM - PODLAHA}" fill="url(#sv-kamen)"/>`;
  o += `<rect x="${l - 6}" y="${PODLAHA - 4}" width="${r - l + 12}" height="10" fill="${P.kamenSvetlo}"/><rect x="${l - 6}" y="${PODLAHA + 6}" width="${r - l + 12}" height="3" fill="${P.kamenStin}" opacity="0.7"/>`;
  let spary = `M${l} ${PODLAHA + 36} H${r} `;
  for (let x = l + 62; x < r; x += 74) spary += `M${x} ${PODLAHA + 9} V${PODLAHA + 36} `;
  for (let x = l + 25; x < r; x += 74) spary += `M${x} ${PODLAHA + 36} V${ZEM} `;
  o += `<path d="${spary}" stroke="${P.kamenStin}" stroke-width="1.6" opacity="0.65"/>`;
  /* schody */
  const st: [number, number, number][] = [[96, PODLAHA + 6, 22], [110, PODLAHA + 28, 18], [124, PODLAHA + 46, 14]];
  for (const [w, y, h] of st) {
    o += `<rect x="${C - w}" y="${y}" width="${2 * w}" height="${h}" fill="url(#sv-kamen)"/><rect x="${C - w}" y="${y}" width="${2 * w}" height="3" fill="${P.kamenSvetlo}"/>`;
  }
  /* mech u paty */
  o += obe(`<path d="${chomac(l + 24, ZEM - 2, 40, 10, 9, 31, 0.3, 0.7)}" fill="${P.mech}"/><path d="${chomac(l + 18, ZEM - 6, 22, 6, 7, 32, 0.4, 0.7)}" fill="${P.mechSvetlo}" opacity="0.8"/>`);
  return o;
}

/* ——— Strážní draci ——— */

/** Kamenný podstavec strážného draka; horní plocha v (x, y) */
function podstavec(x: number, y: number) {
  let o = `<ellipse cx="${x}" cy="${y + 132}" rx="84" ry="10" fill="#141225" opacity="0.5"/>`;
  o += `<rect x="${x - 70}" y="${y + 106}" width="140" height="26" fill="url(#sv-kamen)"/>`;
  o += `<rect x="${x - 58}" y="${y + 94}" width="116" height="14" fill="url(#sv-kamen)"/>`;
  o += `<rect x="${x - 50}" y="${y + 22}" width="100" height="74" fill="url(#sv-kamen-bok)"/>`;
  o += `<rect x="${x - 38}" y="${y + 32}" width="76" height="54" fill="none" stroke="${P.kamenStin}" stroke-width="2"/>`;
  o += `<rect x="${x - 58}" y="${y + 10}" width="116" height="14" fill="url(#sv-kamen)"/>`;
  o += `<rect x="${x - 66}" y="${y}" width="132" height="12" fill="url(#sv-kamen)"/><rect x="${x - 66}" y="${y}" width="132" height="3" fill="${P.kamenSvetlo}"/>`;
  o += `<path d="${chomac(x - 50, y + 130, 34, 9, 8, 41, 0.3, 0.7)}" fill="${P.mech}"/><path d="${chomac(x + 46, y + 108, 20, 5, 7, 43, 0.4, 0.7)}" fill="${P.mech}" opacity="0.8"/>`;
  return o;
}

/** Plamen ze základny (bx, by) směrem u (radiány): délka d, šířka w, k ohne špičku do strany */
function plamen(bx: number, by: number, u: number, d: number, w: number, k = 0.25) {
  const dx = Math.cos(u), dy = Math.sin(u), nx = -dy, ny = dx;
  const tx = bx + dx * d + nx * d * k, ty = by + dy * d + ny * d * k;
  const lx = bx + (nx * w) / 2, ly = by + (ny * w) / 2;
  const rx = bx - (nx * w) / 2, ry = by - (ny * w) / 2;
  return (
    `M${f(lx)} ${f(ly)} C${f(lx + dx * d * 0.45 + nx * w * 0.25)} ${f(ly + dy * d * 0.45 + ny * w * 0.25)} ${f(tx + nx * w * 0.15 - dx * d * 0.25)} ${f(ty + ny * w * 0.15 - dy * d * 0.25)} ${f(tx)} ${f(ty)} ` +
    `C${f(tx - dx * d * 0.3 - nx * w * 0.05)} ${f(ty - dy * d * 0.3 - ny * w * 0.05)} ${f(rx + dx * d * 0.4 - nx * w * 0.15)} ${f(ry + dy * d * 0.4 - ny * w * 0.15)} ${f(rx)} ${f(ry)} Z`
  );
}

/** Bod a směr tečny na kubické Bézierově křivce */
function bez(b: number[][], t: number): [number, number, number, number] {
  const m = 1 - t;
  const x = m * m * m * b[0][0] + 3 * m * m * t * b[1][0] + 3 * m * t * t * b[2][0] + t * t * t * b[3][0];
  const y = m * m * m * b[0][1] + 3 * m * m * t * b[1][1] + 3 * m * t * t * b[2][1] + t * t * t * b[3][1];
  const tx = 3 * m * m * (b[1][0] - b[0][0]) + 6 * m * t * (b[2][0] - b[1][0]) + 3 * t * t * (b[3][0] - b[2][0]);
  const ty = 3 * m * m * (b[1][1] - b[0][1]) + 6 * m * t * (b[2][1] - b[1][1]) + 3 * t * t * (b[3][1] - b[2][1]);
  return [x, y, tx, ty];
}

type Bod = [number, number, number, number, number];

/** Body podél řetězu Bézierových křivek: x, y, jednotková tečna a s (0 krk … 1 konec ocasu) */
function vzorkuj(segmenty: number[][][], naSegment = 16): Bod[] {
  const b: Bod[] = [];
  segmenty.forEach((seg, i) => {
    for (let k = i === 0 ? 0 : 1; k <= naSegment; k++) {
      const t = k / naSegment;
      const [x, y, tx, ty] = bez(seg, t);
      const d = Math.hypot(tx, ty) || 1;
      b.push([x, y, tx / d, ty / d, (i + t) / segmenty.length]);
    }
  });
  return b;
}

/** Obrys trubky kolem osy: hřbetní strana je normála (−ty, tx), břišní opačná */
function trubka(b: Bod[], w: (s: number) => number, odHrbetu = 0.5, odBricha = -0.5) {
  const hrbet = b.map(([x, y, tx, ty, s]) => [x - ty * w(s) * odHrbetu, y + tx * w(s) * odHrbetu] as [number, number]);
  const bricho = b.map(([x, y, tx, ty, s]) => [x - ty * w(s) * odBricha, y + tx * w(s) * odBricha] as [number, number]);
  return body([...hrbet, ...bricho.reverse()]);
}

/**
 * Strážný drak v barvách svatyně, hadovitý jako na klasických malbách:
 * dlouhé tělo ve dvou vlnách se šupinami, krémovým břichem a zlatými
 * hřbetními ostny, hříva a vějíř na ocase ze zlatých, zelených a rumělkových
 * pramenů (barvy malovaného trámu), čtyři nohy se zlatými drápy, smyčky
 * vousů a obláček, ze kterého vystupuje. Stojí na kamenném podstavci místo
 * lvího psa komainu. Kreslí se levý (hlavou doprava, ke středu); pravý je
 * jeho zrcadlo. Jako u komainu má jeden tlamu otevřenou (a) a drží zářící
 * perlu, druhý zavřenou (un).
 */
function drak(x: number, y: number, otevrena: boolean) {
  const p = (dx: number, dy: number) => `${f(x + dx)} ${f(y + dy)}`;
  const ob = P.shuTma;
  const zl = "url(#sv-zlato)";
  const zlOb = P.zlatoStin;
  const zlaty = (d: string, sirka = 1.3) => `<path d="${d}" fill="${zl}" stroke="${zlOb}" stroke-width="${sirka}" stroke-linejoin="round"/>`;
  const pl = (bx: number, by: number, uhel: number, d: number, w: number, k = 0.25) => plamen(x + bx, y + by, (uhel * Math.PI) / 180, d, w, k);
  /* prameny hřívy a ocasu: zlatá, zelená z malovaného trámu, rumělka */
  const PRAMENY = [P.zlato, "#4E9479", "#E2603E", P.zlatoSvetlo, "#3E7C67"];
  const pramen = (bx: number, by: number, uhel: number, d: number, w: number, k: number, i: number) =>
    `<path d="${pl(bx, by, uhel, d, w, k)}" fill="${PRAMENY[i % PRAMENY.length]}" stroke="${i % PRAMENY.length === 1 || i % PRAMENY.length === 4 ? "#2C5C4A" : zlOb}" stroke-width="1"/>`;
  let o = "";

  /* osa těla: krk dolů do první vlny, hrb, druhá vlna, ocas nahoru */
  const osa = [
    [[54, -112], [44, -96], [38, -72], [30, -50]],
    [[30, -50], [22, -26], [6, -16], [-8, -24]],
    [[-8, -24], [-22, -32], [-22, -72], [-38, -80]],
    [[-38, -80], [-54, -88], [-58, -40], [-66, -26]],
    [[-66, -26], [-74, -12], [-92, -18], [-94, -48]],
    [[-94, -48], [-96, -70], [-88, -86], [-80, -96]],
  ].map((seg) => seg.map(([a, b]) => [x + a, y + b]));
  const b = vzorkuj(osa, 16);
  const w = (s: number) => (s < 0.3 ? 19 + (s / 0.3) * 8 : s < 0.62 ? 27 - ((s - 0.3) / 0.32) * 3 : s < 0.9 ? 24 - ((s - 0.62) / 0.28) * 12 : 12 - ((s - 0.9) / 0.1) * 8);

  /* noha: trubka rameno → loket → chodidlo, kroužky, plamínek u lokte a zlaté drápy */
  const noha = (r: number[], l: number[], c: number[], daleko: boolean, drapy: number[]) => {
    const seg = [
      [[x + r[0], y + r[1]], [x + (r[0] * 2 + l[0]) / 3, y + (r[1] * 2 + l[1]) / 3], [x + (r[0] + l[0] * 2) / 3, y + (r[1] + l[1] * 2) / 3], [x + l[0], y + l[1]]],
      [[x + l[0], y + l[1]], [x + (l[0] * 2 + c[0]) / 3, y + (l[1] * 2 + c[1]) / 3], [x + (l[0] + c[0] * 2) / 3, y + (l[1] + c[1] * 2) / 3], [x + c[0], y + c[1]]],
    ];
    const nb = vzorkuj(seg, 8);
    let s = zlaty(pl(l[0], l[1], Math.atan2(r[1] - c[1], r[0] - c[0]) * (180 / Math.PI) + 40, 15, 9, 0.35));
    s += `<path d="${trubka(nb, (t) => 15 - t * 6)}" fill="${daleko ? "#8E2A23" : "#B83C2D"}" stroke="${ob}" stroke-width="1.6"/>`;
    let krouzky = "";
    for (const [bx, by, tx, ty, t] of nb.filter((_, i) => i % 3 === 1)) {
      const ww = (15 - t * 6) / 2;
      krouzky += `M${f(bx - ty * ww)} ${f(by + tx * ww)} L${f(bx + ty * ww)} ${f(by - tx * ww)} `;
    }
    s += `<path d="${krouzky}" stroke="${daleko ? "#5E1C19" : "#7A2420"}" stroke-width="1.2" opacity="0.8"/>`;
    s += `<circle cx="${f(x + c[0])}" cy="${f(y + c[1])}" r="5.5" fill="${daleko ? "#8E2A23" : "#B83C2D"}" stroke="${ob}" stroke-width="1.4"/>`;
    for (const u of drapy) {
      const a = (u * Math.PI) / 180;
      const ex = c[0] + Math.cos(a) * 13, ey = c[1] + Math.sin(a) * 13;
      s += `<path d="M${p(c[0] + Math.cos(a) * 3, c[1] + Math.sin(a) * 3)} Q${p(c[0] + Math.cos(a) * 9 - Math.sin(a) * 3, c[1] + Math.sin(a) * 9 + Math.cos(a) * 3)} ${p(ex, ey)}" fill="none" stroke="${daleko ? P.zlatoStin : P.zlato}" stroke-width="2.2" stroke-linecap="round"/>`;
    }
    return s;
  };

  /* vzdálené nohy jsou za tělem */
  o += noha([26, -50], [16, -30], [22, -6], true, [10, 40, 70, 160]);
  o += noha([-70, -32], [-86, -18], [-88, -6], true, [10, 40, 70, 160]);

  /* vějíř pramenů na konci ocasu */
  [-118, -96, -74, -52, -30, -8].forEach((u, i) => (o += pramen(-80, -96, u, 30 + (i % 3) * 6, 8, -0.25, i)));

  /* hříva za hlavou a po krku */
  for (const [i, [bx, by, tx, ty, s]] of b.filter((q) => q[4] < 0.17).entries()) {
    if (i % 2) continue;
    const u = (Math.atan2(tx, -ty) * 180) / Math.PI + 35;
    o += pramen(bx - x - ty * w(s) * 0.3, by - y + tx * w(s) * 0.3, u, 34 - i * 0.6, 8, -0.3, i);
  }

  /* hřbetní ostny — za tělem, takže z něj jen vyčnívají */
  for (const [i, [bx, by, tx, ty, s]] of b.entries()) {
    if (i % 3 || s < 0.06 || s > 0.96) continue;
    const e = [bx - ty * w(s) * 0.45, by + tx * w(s) * 0.45];
    const v = 7 + w(s) * 0.22;
    o += zlaty(`M${f(e[0] - tx * 4)} ${f(e[1] - ty * 4)} L${f(e[0] - ty * v + tx * 4)} ${f(e[1] + tx * v + ty * 4)} L${f(e[0] + tx * 4)} ${f(e[1] + ty * 4)} Z`, 1.1);
  }

  /* tělo: rumělka, světlo na hřbetu, krémové břicho se štítky a šupiny */
  const obrys = trubka(b, w);
  o += `<path d="${obrys}" fill="#C4402E"/>`;
  o += `<path d="${trubka(b, w, 0.42, 0.18)}" fill="#E0614A" opacity="0.55"/>`;
  o += `<path d="${trubka(b, w, -0.12, -0.5)}" fill="#F0D9A4"/>`;
  let stitky = "";
  for (const [bx, by, tx, ty, s] of b) {
    stitky += `M${f(bx + ty * w(s) * 0.12)} ${f(by - tx * w(s) * 0.12)} L${f(bx + ty * w(s) * 0.5)} ${f(by - tx * w(s) * 0.5)} `;
  }
  o += `<path d="${stitky}" stroke="#B8893C" stroke-width="1.1"/>`;
  let supiny = "";
  for (const [i, [bx, by, tx, ty, s]] of b.entries()) {
    for (const k of i % 2 ? [0, 0.2, 0.4] : [0.1, 0.3]) {
      if (k > 0.44) continue;
      const cx = bx - ty * w(s) * k, cy = by + tx * w(s) * k;
      const r = Math.min(3.4, w(s) * 0.17);
      supiny += `M${f(cx - ty * r)} ${f(cy + tx * r)} Q${f(cx + tx * r * 1.4)} ${f(cy + ty * r * 1.4)} ${f(cx + ty * r)} ${f(cy - tx * r)} `;
    }
  }
  o += `<path d="${supiny}" fill="none" stroke="#7E2420" stroke-width="1.1" opacity="0.8"/>`;
  o += `<path d="${obrys}" fill="none" stroke="${ob}" stroke-width="2" stroke-linejoin="round"/>`;

  /* blízké nohy; s perlou má přední tlapu zvednutou */
  o += noha([-62, -34], [-48, -20], [-44, -6], false, [10, 40, 70, 160]);
  if (otevrena) {
    o += svetlo(`<circle cx="${f(x + 84)}" cy="${f(y - 66)}" r="34" fill="url(#sv-zare)"/>`, 5);
    for (const [u, d] of [[-90, 15], [-55, 11], [-125, 11]] as [number, number][]) o += zlaty(pl(84, -74, u, d, 9, 0.35));
    o += `<circle cx="${f(x + 84)}" cy="${f(y - 66)}" r="9" fill="url(#sv-perla)" stroke="${zlOb}" stroke-width="1.6"/>`;
    o += `<path d="M${p(79, -69)} q3 -4 7 -4" fill="none" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round"/>`;
    o += noha([34, -60], [54, -50], [72, -64], false, [-40, -5, 30, 65]);
  } else {
    /* bez perly má přední tlapu taky zvednutou, drápy roztažené jako na malbách */
    o += noha([34, -60], [54, -50], [70, -62], false, [-70, -30, 10, 50]);
  }

  /* hlava z profilu: dlouhá tlama s vyhrnutým nosem, parohy, smyčky vousů */
  const hx = 62, hy = -124;
  const h = (dx: number, dy: number) => p(hx + dx, hy + dy);
  /* hříva přímo za hlavou */
  [[-14, -12, 200], [-16, 0, 178], [-12, 10, 156], [-6, -18, 222]].forEach(([bx, by, u], i) => (o += pramen(hx + bx, hy + by, u, 42, 9, 0.2, i + 2)));
  /* parohy: vzdálený tmavší, bližší zlatý */
  const paroh = (dx: number, dy: number) =>
    `M${h(2 + dx, -18 + dy)} C${h(-6 + dx, -36 + dy)} ${h(-22 + dx, -46 + dy)} ${h(-42 + dx, -46 + dy)} M${h(-16 + dx, -40 + dy)} C${h(-16 + dx, -50 + dy)} ${h(-12 + dx, -57 + dy)} ${h(-6 + dx, -62 + dy)}`;
  o += `<path d="${paroh(9, 2)}" fill="none" stroke="${P.zlatoStin}" stroke-width="7" stroke-linecap="round"/>`;
  o += `<path d="${paroh(0, 0)}" fill="none" stroke="${zlOb}" stroke-width="8" stroke-linecap="round"/><path d="${paroh(0, 0)}" fill="none" stroke="${P.zlato}" stroke-width="5" stroke-linecap="round"/>`;
  o += `<path d="${paroh(0, 0)}" fill="none" stroke="${P.zlatoSvetlo}" stroke-width="1.6" stroke-linecap="round" transform="translate(-1 -1)" opacity="0.8"/>`;
  /* spodní čelist a tlama */
  if (otevrena) {
    o += `<path d="M${h(6, 4)} L${h(42, 3)} L${h(36, 24)} C${h(26, 22)} ${h(14, 16)} ${h(4, 10)} Z" fill="#3A1418"/>`;
    o += `<path d="M${h(12, 12)} C${h(24, 12)} ${h(40, 14)} ${h(50, 8)} C${h(54, 6)} ${h(56, 12)} ${h(52, 14)}" fill="none" stroke="#E0707A" stroke-width="4" stroke-linecap="round"/>`;
    o += `<path d="M${h(2, 8)} C${h(12, 14)} ${h(26, 22)} ${h(36, 23)} C${h(41, 24)} ${h(41, 30)} ${h(35, 31)} C${h(22, 30)} ${h(8, 24)} ${h(-4, 14)} Z" fill="url(#sv-drak-hlava)" stroke="${ob}" stroke-width="1.8"/>`;
    o += `<path d="M${h(30, 23)} l3 0 l-1.5 -7 Z M${h(19, 18)} l3 0 l-1.5 -6 Z" fill="#FFF6E2"/>`;
  } else {
    o += `<path d="M${h(4, 6)} L${h(40, 5)} C${h(45, 6)} ${h(45, 12)} ${h(39, 13)} C${h(26, 15)} ${h(12, 15)} ${h(0, 12)} Z" fill="url(#sv-drak-hlava)" stroke="${ob}" stroke-width="1.8"/>`;
  }
  /* lebka a horní čelist */
  o += `<path d="M${h(-16, -6)} C${h(-18, -18)} ${h(-4, -24)} ${h(8, -20)} C${h(16, -18)} ${h(22, -12)} ${h(28, -11)} L${h(40, -12)} C${h(46, -15)} ${h(54, -11)} ${h(52, -2)} C${h(51, 4)} ${h(46, 6)} ${h(40, 5)} L${h(8, 6)} C${h(0, 12)} ${h(-12, 10)} ${h(-16, -6)} Z" fill="url(#sv-drak-hlava)" stroke="${ob}" stroke-width="2"/>`;
  o += `<path d="M${h(14, -17)} C${h(22, -13)} ${h(30, -12)} ${h(42, -13)}" fill="none" stroke="#F79878" stroke-width="2.4" stroke-linecap="round" opacity="0.8"/>`;
  o += `<path d="M${h(45, -5)} c-4 -4 2 -9 5 -5 c2 3 -1 5 -3 3" fill="none" stroke="${ob}" stroke-width="1.8" stroke-linecap="round"/>`;
  if (otevrena) {
    o += `<path d="M${h(14, 6)} l3 0 l-1.5 6 Z M${h(22, 6)} l3 0 l-1.5 6 Z M${h(30, 5.5)} l3 0 l-1.5 6 Z M${h(37, 5)} l4 0 l-2 9 Z" fill="#FFF6E2"/>`;
  } else {
    o += `<path d="M${h(32, 5)} l4 0 l-2 9 Z" fill="#FFF6E2" stroke="${ob}" stroke-width="0.8"/>`;
    o += `<path d="M${h(8, 6)} L${h(40, 5)}" stroke="${ob}" stroke-width="1.6"/>`;
  }
  /* ploutvička za lícem */
  o += `<path d="M${h(-6, 2)} L${h(-26, -8)} L${h(-18, 2)} L${h(-30, 6)} L${h(-16, 10)} L${h(-24, 18)} L${h(-4, 12)} Z" fill="#E2603E" stroke="${ob}" stroke-width="1.6" stroke-linejoin="round"/>`;
  o += `<path d="M${h(-8, 4)} L${h(-20, -2)} M${h(-8, 7)} L${h(-22, 6)} M${h(-8, 10)} L${h(-18, 15)}" stroke="${P.zlato}" stroke-width="1.4"/>`;
  /* oko pod plamenným obočím */
  o += zlaty(pl(hx + 10, hy - 18, 210, 20, 10, 0.35));
  o += zlaty(pl(hx + 18, hy - 17, 235, 14, 8, 0.3));
  o += `<path d="M${h(6, -9)} C${h(9, -15)} ${h(20, -15)} ${h(23, -9)} C${h(20, -5)} ${h(9, -4)} ${h(6, -9)} Z" fill="#F6C850" stroke="${ob}" stroke-width="1.8"/>`;
  o += `<ellipse cx="${f(x + hx + 15)}" cy="${f(y + hy - 9.5)}" rx="1.8" ry="4.2" fill="#1A0F10"/><circle cx="${f(x + hx + 17)}" cy="${f(y + hy - 11)}" r="1.2" fill="#FFFFFF"/>`;
  /* vousy: jeden se stáčí ve smyčkách nad hlavu, druhý visí pod bradou */
  const vousy =
    `M${h(46, -8)} C${h(56, -30)} ${h(42, -52)} ${h(28, -46)} C${h(16, -41)} ${h(21, -29)} ${h(31, -34)} C${h(42, -40)} ${h(38, -64)} ${h(18, -68)} C${h(4, -70)} ${h(-6, -62)} ${h(-10, -56)} ` +
    `M${h(48, 0)} C${h(40, 20)} ${h(16, 34)} ${h(-6, 32)} C${h(-22, 31)} ${h(-28, 42)} ${h(-20, 48)}`;
  o += `<path d="${vousy}" fill="none" stroke="${zlOb}" stroke-width="4.2" stroke-linecap="round"/><path d="${vousy}" fill="none" stroke="${P.zlato}" stroke-width="2.4" stroke-linecap="round"/>`;
  const brada: [number, number][] = otevrena ? [[10, 20], [20, 25], [30, 29]] : [[10, 14], [20, 15], [30, 14]];
  brada.forEach(([bx, by], i) => (o += zlaty(pl(hx + bx, hy + by, 100 - i * 8, 14, 8, 0.3))));

  /* obláček, ze kterého drak vystupuje: chomáče zezadu dopředu, každý další
     přikryje vnitřní obrys předchozího, takže zůstane vidět jen vlnitý okraj */
  const chomace: [number, number, number, boolean][] = [
    [-72, -24, 12, false], [-42, -28, 14, true], [-8, -26, 13, false], [26, -27, 14, true], [54, -21, 11, false],
    [-94, -9, 10, false], [-78, -12, 13, true], [-54, -11, 15, false], [-26, -13, 16, true], [4, -11, 14, false], [32, -12, 15, true], [58, -9, 12, false], [74, -6, 8, false],
  ];
  o += `<path d="M${p(-102, -10)} H${f(x + 80)} V${f(y)} H${f(x - 102)} Z" fill="#F4EFE6"/>`;
  for (const [cx, cy, r, spirala] of chomace) {
    o += `<circle cx="${f(x + cx)}" cy="${f(y + cy)}" r="${r}" fill="#F4EFE6" stroke="#AAB6CB" stroke-width="1.5"/>`;
    if (spirala) o += `<path d="M${p(cx + r * 0.1, cy + r * 0.3)} c${f(-r * 0.5)} ${f(-r * 0.1)} ${f(-r * 0.5)} ${f(-r * 0.75)} ${f(0)} ${f(-r * 0.75)} c${f(r * 0.4)} 0 ${f(r * 0.45)} ${f(r * 0.45)} ${f(r * 0.1)} ${f(r * 0.45)}" fill="none" stroke="#9FB0C8" stroke-width="1.4" stroke-linecap="round"/>`;
  }
  o += `<path d="M${p(-104, -1.5)} H${f(x + 82)}" stroke="#C9D3E2" stroke-width="3"/>`;
  return o;
}


/* ——— Okolí ——— */

/** Posvátný strom shinboku: mohutný kmen u levého kraje, provaz se shide a kořeny */
function strom() {
  let o = "";
  const kmen = "M-40 -700 C-34 -300 -44 100 -46 420 C-48 640 -70 780 -110 880 L-140 1000 H300 C250 980 200 950 170 900 C140 840 136 700 140 520 C142 200 126 -300 122 -700 Z";
  o += `<path d="${kmen}" fill="url(#sv-kmen)"/>`;
  /* měsíc zleva: světlý lem na hraně kmene */
  o += `<path d="M-38 -700 C-32 -300 -42 100 -44 420 C-46 640 -66 780 -104 880" fill="none" stroke="#7A6C88" stroke-width="5" opacity="0.7"/>`;
  /* kůra po pruzích: vlevo je na ně vidět měsíc, vpravo tonou ve stínu */
  let pruhy = "";
  for (const [x, w] of [[-30, 14], [6, 10], [40, 16], [78, 12]] as [number, number][]) {
    pruhy += `M${x} -700 C${x + 4} -200 ${x - 4} 300 ${x} 560 C${x} 700 ${f(x - (60 - x) * 0.4)} 820 ${f(x - (60 - x) * 0.8)} 900 L${f(x - (60 - x) * 0.8 + w)} 900 C${f(x - (60 - x) * 0.4 + w)} 820 ${x + w} 700 ${x + w} 560 C${x + w - 4} 300 ${x + w + 4} -200 ${x + w} -700 Z `;
  }
  o += `<path d="${pruhy}" fill="#6E5F7C" opacity="0.18"/>`;
  /* suk a dutinka */
  o += `<ellipse cx="62" cy="250" rx="13" ry="22" fill="#15111B" opacity="0.7"/><ellipse cx="58" cy="246" rx="7" ry="13" fill="#0C0A10"/>`;
  o += `<path d="M0 120 c10 -10 22 -8 26 4 c-10 -4 -18 -4 -26 -4 Z" fill="#15111B" opacity="0.6"/>`;
  /* po odemčení na kmen z pravé strany dopadne teplé světlo svatyně */
  o += svetlo(`<path d="M140 -100 C142 200 136 500 140 700 C142 820 160 880 190 920 L170 920 C140 870 124 800 122 700 C118 500 124 200 122 -100 Z" fill="url(#sv-lem)"/>`, 4);
  /* kůra: dlouhé svislé rýhy, dole se rozbíhají do kořenů */
  let kura = "";
  for (const [x, k] of [[-14, -0.06], [22, -0.02], [58, 0.03], [92, 0.07], [114, 0.1]] as [number, number][]) {
    kura += `M${x} -700 C${f(x + 4)} -200 ${f(x - 4)} 300 ${f(x)} 560 C${f(x + k * 200)} 760 ${f(x + k * 600)} 880 ${f(x + k * 900)} 960 `;
  }
  o += `<path d="${kura}" fill="none" stroke="#14111B" stroke-width="3" stroke-linecap="round" opacity="0.5"/>`;
  /* kořeny: tři pruhy, které se noří do štěrku */
  o += `<path d="M120 860 C160 900 220 930 300 950 C250 960 190 950 150 930 Z" fill="#2A2330"/>`;
  o += `<path d="M150 900 C190 940 250 966 330 980 L330 1000 H190 C170 970 160 940 150 900 Z" fill="#2E2634"/>`;
  o += `<path d="${chomac(150, 990, 120, 16, 9, 81, 0.3, 0.7)}" fill="${P.mech}" opacity="0.8"/>`;
  /* shimenawa kolem kmene: vpředu prověšená, po stranách mizí za kmenem */
  const lano = "M-44 470 C0 520 90 522 140 470";
  o += `<path d="${lano}" fill="none" stroke="url(#sv-slama)" stroke-width="22" stroke-linecap="round"/>`;
  o += `<path d="${lano}" fill="none" stroke="${P.slamaStin}" stroke-width="22" stroke-dasharray="3 8" opacity="0.6"/>`;
  o += `<path d="M-44 466 C0 514 90 516 140 466" fill="none" stroke="#F6E8BE" stroke-width="4" opacity="0.6"/>`;
  for (const [x, y] of [[0, 506], [48, 518], [100, 504]] as [number, number][]) o += shideTvar(x, y, 15);
  return o;
}

/**
 * Cedr na pravém kraji — protiváha posvátnému stromu. Celý kmen s oběma
 * hranami a kořeny, ať vypadá jako strom, i když scéna nekončí u okraje okna.
 */
function cedr() {
  let o = "";
  const kmen =
    "M1182 -700 C1186 -300 1178 200 1182 560 C1184 760 1172 880 1132 950 C1112 976 1088 990 1060 1000 " +
    "H1380 C1352 990 1318 972 1298 944 C1270 880 1260 760 1262 560 C1266 200 1258 -300 1262 -700 Z";
  o += `<path d="${kmen}" fill="url(#sv-kmen)"/>`;
  /* měsíc zleva: světlý lem, pruhy kůry, rýhy */
  o += `<path d="M1184 -700 C1188 -300 1180 200 1184 560 C1186 760 1174 880 1134 950" fill="none" stroke="#7A6C88" stroke-width="4" opacity="0.7"/>`;
  let pruhy = "";
  for (const [x, w] of [[1194, 10], [1216, 8], [1238, 9]] as [number, number][]) {
    const k = (x - 1222) * 3;
    pruhy += `M${x} -700 C${x + 3} -200 ${x - 3} 300 ${x} 560 C${x} 720 ${f(x + k * 0.2)} 840 ${f(x + k * 0.6)} 940 L${f(x + k * 0.6 + w)} 940 C${f(x + k * 0.2 + w)} 840 ${x + w} 720 ${x + w} 560 C${x + w - 3} 300 ${x + w + 3} -200 ${x + w} -700 Z `;
  }
  o += `<path d="${pruhy}" fill="#6E5F7C" opacity="0.16"/>`;
  let kura = "";
  for (const x of [1200, 1228, 1250]) kura += `M${x} -700 C${x + 3} -200 ${x - 3} 300 ${x} 560 C${x} 720 ${f(x + (x - 1222) * 0.4)} 860 ${f(x + (x - 1222) * 1.2)} 960 `;
  o += `<path d="${kura}" fill="none" stroke="#14111B" stroke-width="2.4" stroke-linecap="round" opacity="0.5"/>`;
  o += `<ellipse cx="1240" cy="140" rx="8" ry="14" fill="#15111B" opacity="0.7"/>`;
  /* po odemčení teplé světlo svatyně na levé hraně */
  o += svetlo(`<path d="M1182 -100 C1180 200 1178 400 1182 560 C1184 760 1172 880 1132 950 L1150 950 C1190 880 1200 760 1198 560 C1196 400 1198 200 1198 -100 Z" fill="url(#sv-lem)"/>`, 5);
  /* kořeny a mech u paty */
  o += `<path d="M1150 930 C1120 960 1080 984 1030 1000 H1110 C1130 984 1146 962 1160 940 Z" fill="#2A2330"/>`;
  o += `<path d="${chomac(1220, 996, 130, 14, 9, 87, 0.3, 0.7)}" fill="${P.mech}" opacity="0.8"/>`;
  return o;
}

/** Stojan s destičkami ema; Cedulka visí v horní řadě mezi nimi */
function ema() {
  const x1 = 74, x2 = 236, zem = 880;
  let o = `<ellipse cx="${(x1 + x2) / 2}" cy="${zem + 4}" rx="110" ry="9" fill="#141225" opacity="0.45"/>`;
  for (const x of [x1, x2]) o += `<rect x="${x - 6}" y="630" width="12" height="${zem - 630}" fill="url(#sv-drevo)"/>`;
  for (const y of [690, 774]) o += `<rect x="${x1 - 12}" y="${y}" width="${x2 - x1 + 24}" height="8" fill="${P.drevo}"/><rect x="${x1 - 12}" y="${y}" width="${x2 - x1 + 24}" height="2" fill="${P.drevoSvetlo}"/>`;
  const s: Stit = { cx: (x1 + x2) / 2, ay: 598, w: 104, h: 26, tl: 9, hafu: 5 };
  o += strecha(s, false);
  /* destičky: domeček ze světlého dřeva s červenou šňůrkou a pár tahy písma */
  const r = nahoda(57);
  const desticka = (x: number, y: number, u: number) => {
    let d = `<g transform="rotate(${f(u)} ${f(x)} ${f(y)})"><path d="M${x} ${y} v5" stroke="#D9483A" stroke-width="1.6"/>`;
    d += `<path d="M${x - 13} ${y + 10} L${x} ${y + 3} L${x + 13} ${y + 10} V${y + 34} H${x - 13} Z" fill="${r() < 0.5 ? "#D7B98E" : "#CDAE80"}" stroke="${P.drevoStin}" stroke-width="1.2"/>`;
    d += `<path d="M${x - 7} ${y + 16} h${f(6 + r() * 6)} M${x - 7} ${y + 21} h${f(4 + r() * 9)} M${x - 7} ${y + 26} h${f(5 + r() * 7)}" stroke="#3A2E2A" stroke-width="1.2" opacity="0.7"/>`;
    if (r() < 0.35) d += `<circle cx="${x + 6}" cy="${y + 27}" r="3" fill="#C4432B" opacity="0.85"/>`;
    return d + `</g>`;
  };
  for (const x of [96, 126, 186, 214]) o += desticka(x, 698, (r() - 0.5) * 10);
  for (const x of [92, 120, 148, 176, 204, 228]) o += desticka(x, 782, (r() - 0.5) * 10);
  return o;
}

/** Nádržka chōzuya: kamenný žlab, bambusový chrlič, naběračky; přední stěna je v popředí */
function chozuyaZadni() {
  const l = 958, r = 1104, y = 820;
  let o = `<ellipse cx="${(l + r) / 2}" cy="${y + 70}" rx="96" ry="10" fill="#141225" opacity="0.5"/>`;
  /* sloupek s chrličem */
  o += `<rect x="1108" y="700" width="18" height="${y + 60 - 700}" fill="url(#sv-bambus-svisly)"/>`;
  for (const yy of [742, 796, 850]) o += `<rect x="1107" y="${yy}" width="20" height="4" rx="2" fill="#4A633D"/>`;
  o += `<path d="M1116 748 H1026 L1020 760 H1116 Z" fill="url(#sv-bambus)"/><path d="M1026 748 L1020 760" stroke="#C7D8A8" stroke-width="2"/>`;
  for (const xx of [1080, 1050]) o += `<rect x="${xx}" y="747" width="4" height="14" rx="2" fill="#4A633D"/>`;
  /* proud vody */
  o += `<path class="sv-proud" d="M1023 762 C1022 780 1023 796 1024 ${y + 2}" fill="none" stroke="#BFD3F0" stroke-width="3.4" stroke-linecap="round" stroke-dasharray="9 7" opacity="0.85"/>`;
  /* žlab: zadní hrana, hladina */
  o += `<path d="M${l} ${y} H${r} L${r - 6} ${y - 10} H${l + 6} Z" fill="${P.kamenSvetlo}"/>`;
  o += `<rect x="${l + 8}" y="${y - 6}" width="${r - l - 16}" height="8" fill="url(#sv-voda)"/>`;
  o += `<ellipse class="sv-kruh" cx="1024" cy="${y - 2}" rx="10" ry="2.4" fill="none" stroke="#DCE8FF" stroke-width="1.2"/>`;
  return o;
}
function chozuyaPredni() {
  const l = 958, r = 1104, y = 820;
  let o = `<path d="M${l} ${y} H${r} V${y + 62} H${l} Z" fill="url(#sv-kamen-bok)"/>`;
  o += `<rect x="${l}" y="${y}" width="${r - l}" height="4" fill="${P.kamenSvetlo}"/>`;
  o += `<rect x="${l + 12}" y="${y + 12}" width="${r - l - 24}" height="40" fill="none" stroke="${P.kamenStin}" stroke-width="1.6"/>`;
  o += `<text x="${(l + r) / 2}" y="${y + 42}" font-family="Yuji Syuku, Yu Mincho, serif" font-size="26" fill="${P.kamenStin}" text-anchor="middle" letter-spacing="8">洗心</text>`;
  /* naběračky přes okraj */
  for (const [x, u] of [[980, -20], [1084, 18]] as [number, number][]) {
    o += `<g transform="rotate(${u} ${x} ${y})"><path d="M${x} ${y - 2} V${y - 54}" stroke="#E2D2A8" stroke-width="3.4" stroke-linecap="round"/><rect x="${x - 8}" y="${y - 2}" width="16" height="11" rx="2" fill="#D9C79A"/><rect x="${x - 8}" y="${y - 2}" width="16" height="3" fill="#F0E2BC"/></g>`;
  }
  o += `<path d="${chomac(l + 10, y + 60, 26, 6, 7, 61, 0.3, 0.7)}" fill="${P.mech}"/><path d="${chomac(r - 8, y + 60, 20, 5, 7, 63, 0.3, 0.7)}" fill="${P.mech}" opacity="0.85"/>`;
  return o;
}

/** Cesta z plochých kamenů od schodů dopředu */
function cesta() {
  const r = nahoda(23);
  let o = "";
  const rady = [[ZEM + 6, 26], [ZEM + 40, 32], [ZEM + 80, 38], [ZEM + 126, 44], [ZEM + 178, 50]] as [number, number][];
  rady.forEach(([y, v], i) => {
    const w = 170 + i * 26;
    const kusu = 3 + (i % 2);
    let x = C - w / 2;
    for (let k = 0; k < kusu; k++) {
      const sw = w / kusu - 6;
      const d = `M${f(x + 3 + r() * 4)} ${f(y + r() * 3)} L${f(x + sw - r() * 4)} ${f(y + r() * 3)} L${f(x + sw + 2 - r() * 3)} ${f(y + v - 4 - r() * 3)} L${f(x - 1 + r() * 3)} ${f(y + v - 3 - r() * 3)} Z`;
      o += `<path d="${d}" fill="url(#sv-kamen)" opacity="0.92"/><path d="${d}" fill="none" stroke="${P.kamenTma}" stroke-width="1.4" opacity="0.6"/>`;
      x += sw + 6;
    }
  });
  return o;
}

/** Celá svatyně (prostřední vrstva) — scéna 1200 × 1000, přesahy do stran a nahoru jsou schválně */
export function svatyne() {
  let s = `<defs>${DEFS}</defs>`;
  s += strom() + cedr();
  /* stín pod pavilonem */
  s += `<ellipse cx="${C}" cy="${ZEM + 6}" rx="330" ry="22" fill="#141225" opacity="0.55"/>`;
  s += sokl();
  s += cesta();
  /* pavilon zezadu dopředu */
  s += vnitrek();
  s += hokora();
  s += kridlo(true) + obe(kridlo());
  s += stit();
  s += keta();
  s += deska();
  s += obe(hlavice(SL));
  s += kashiranuki();
  s += obe(sloup(SL));
  s += strecha(STIT);
  s += onigawara(C, STIT.ay + 2, 1.15);
  s += shimenawa(SL + SLW / 2, 2 * C - SL - SLW / 2, KASHIRA + 32, 14, 16, [490, 550, 650, 710]);
  s += zvonek(500) + zvonek(700);
  s += chochin(300, 450, 4) + chochin(900, 450, 5);
  /* světlo z otevřené svatyně na schodech a cestě */
  s += svetlo(`<ellipse cx="${C}" cy="${ZEM + 40}" rx="300" ry="90" fill="url(#sv-zare-mekka)"/>`, 6);
  s += ema();
  s += chozuyaZadni();
  s += obe(podstavec(340, 830));
  /* draci jsou o kus větší než podstavec — stočení přes jeho okraje */
  const vetsi = (d: string) => `<g transform="translate(340 830) scale(1.22) translate(-340 -830)">${d}</g>`;
  s += vetsi(drak(340, 830, true)) + zrcadli(vetsi(drak(340, 830, false)));
  return `<svg viewBox="0 0 ${S} 1000" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">${s}</svg>`;
}

/** Popředí: věci, které mají být před postavičkami */
export function popredi() {
  let s = "";
  /* obětní skříňka saisen-bako — stojí na Šamotce */
  const bx = C, by = 722;
  s += `<rect x="${bx - 58}" y="${by}" width="116" height="52" fill="url(#sv-drevo)"/>`;
  s += `<rect x="${bx - 62}" y="${by - 6}" width="124" height="10" fill="${P.drevoSvetlo}"/>`;
  let latky = "";
  for (let x = bx - 52; x <= bx + 52; x += 13) latky += `<path d="M${x} ${by - 4} l6 6 l6 -6" fill="none" stroke="${P.drevoStin}" stroke-width="2"/>`;
  s += latky;
  s += `<rect x="${bx - 58}" y="${by + 4}" width="116" height="4" fill="${P.drevoStin}" opacity="0.6"/>`;
  s += `<text x="${bx}" y="${by + 38}" font-family="Yuji Syuku, Yu Mincho, serif" font-size="24" fill="#2B1E18" text-anchor="middle" letter-spacing="10">奉納</text>`;
  s += obe(`<rect x="${bx - 58}" y="${by}" width="8" height="52" fill="${P.zlato}" opacity="0.85"/>`);
  s += chozuyaPredni();
  /* kořen přes Hlínku */
  s += `<path d="M110 1000 C150 960 210 950 280 966 C300 972 306 990 290 1000 Z" fill="#2E2634"/><path d="M130 990 C170 966 220 960 270 970" fill="none" stroke="#5E4E5C" stroke-width="3" opacity="0.6"/>`;
  /* provaz se zámkem: dokud nemáš všech devět */
  s += `<g class="sv-provaz">`;
  s += shimenawa(404, 796, 880, 22, 14, [470, 530, 670, 730]);
  s += `<path d="M584 912 L${C} 930 L616 912" fill="none" stroke="${P.slamaStin}" stroke-width="2"/>`;
  s += `<rect x="568" y="926" width="64" height="70" rx="4" fill="#C9A37A"/><rect x="568" y="926" width="64" height="8" rx="3" fill="#D9B88E"/>`;
  s += `<rect x="575" y="936" width="50" height="54" rx="2" fill="#FBF6EA" stroke="#B4382B" stroke-width="1.6"/>`;
  s += `<text x="${C}" y="975" font-family="Yuji Syuku, Yu Mincho, serif" font-size="34" fill="#2B2420" text-anchor="middle">九</text>`;
  s += `</g>`;
  return `<svg viewBox="0 0 ${S} 1000" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">${s}</svg>`;
}

/** Les, mlha, měsíční paprsky a nádvoří — daleko za okraje scény */
export function pozadi() {
  const r = nahoda(7);
  let s = `<defs>` +
    `<linearGradient id="sv-mlha" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8C93C4" stop-opacity="0"/><stop offset="0.6" stop-color="#8C93C4" stop-opacity="0.22"/><stop offset="1" stop-color="#8C93C4" stop-opacity="0"/></linearGradient>` +
    `<linearGradient id="sv-paprsek" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E6ECFF" stop-opacity="0.16"/><stop offset="0.55" stop-color="#E6ECFF" stop-opacity="0.07"/><stop offset="1" stop-color="#E6ECFF" stop-opacity="0"/></linearGradient>` +
    `<linearGradient id="sv-nadvori" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4A4874"/><stop offset="1" stop-color="#2B2950"/></linearGradient>` +
    `<radialGradient id="sv-nadvori-svetlo" cx="0.5" cy="0.4" r="0.5"><stop offset="0" stop-color="#8A86B8" stop-opacity="0.75"/><stop offset="1" stop-color="#8A86B8" stop-opacity="0"/></radialGradient>` +
    `</defs>`;
  /* cedry ve třech plánech: vzadu světlejší v mlze, vpředu tmavé; koruna je hladký štíhlý kužel */
  const plany = [
    { barva: "#2C3A5C", zem: 720, v: [460, 700], sirka: [90, 130], krok: 105, seed: 3, kmen: 0 },
    { barva: "#212B48", zem: 735, v: [640, 940], sirka: [120, 170], krok: 150, seed: 5, kmen: 8 },
  ];
  plany.forEach((pl, i) => {
    const rr = nahoda(pl.seed);
    let d = "";
    let kmeny = "";
    for (let x = -1800; x < 3000; x += pl.krok * (0.75 + rr() * 0.5)) {
      /* kolem svatyně vpředu nic — ať je vidět */
      if (i === 2 && x > -200 && x < 1400) continue;
      const v = pl.v[0] + rr() * (pl.v[1] - pl.v[0]);
      const w = pl.sirka[0] + rr() * (pl.sirka[1] - pl.sirka[0]);
      const top = pl.zem - v, pata = top + v * 0.84;
      /* štíhlý kužel, dole sukně: krajní větve visí níž než střed */
      d += `M${f(x)} ${f(top)} C${f(x + w * 0.14)} ${f(top + v * 0.24)} ${f(x + w * 0.42)} ${f(top + v * 0.62)} ${f(x + w * 0.52)} ${f(pata)} Q${f(x + w * 0.3)} ${f(pata - v * 0.05)} ${f(x)} ${f(pata - v * 0.04)} Q${f(x - w * 0.3)} ${f(pata - v * 0.05)} ${f(x - w * 0.52)} ${f(pata)} C${f(x - w * 0.42)} ${f(top + v * 0.62)} ${f(x - w * 0.14)} ${f(top + v * 0.24)} ${f(x)} ${f(top)} Z `;
      if (pl.kmen) kmeny += `M${f(x - pl.kmen / 2)} ${f(pata - 10)} H${f(x + pl.kmen / 2)} L${f(x + pl.kmen * 0.6)} ${pl.zem + 12} H${f(x - pl.kmen * 0.6)} Z `;
    }
    if (kmeny) s += `<path d="${kmeny}" fill="${pl.barva}"/>`;
    s += `<path d="${d}" fill="${pl.barva}"/>`;
    s += `<rect x="-1800" y="${pl.zem - 300}" width="4800" height="340" fill="url(#sv-mlha)"/>`;
  });
  /* vpředu vysoké rovné kmeny cedrů sugi, koruny jsou až nahoře v korunách; kolem svatyně volno */
  const rk = nahoda(17);
  let kmeny = "", lemy = "";
  for (let x = -1760; x < 3000; x += 150 + rk() * 170) {
    if (x > -140 && x < 1340) continue;
    const w = 34 + rk() * 40, pata = 752 + rk() * 14;
    kmeny += `M${f(x - w / 2)} -600 L${f(x + w / 2)} -600 L${f(x + w * 0.62)} ${f(pata)} L${f(x - w * 0.62)} ${f(pata)} Z `;
    lemy += `M${f(x - w / 2 + 3)} -600 L${f(x - w * 0.62 + 3)} ${f(pata)} `;
  }
  s += `<path d="${kmeny}" fill="#131A2E"/><path d="${lemy}" stroke="#3A4466" stroke-width="3" opacity="0.6"/>`;
  /* měsíční paprsky zleva shora */
  s += `<g class="sv-paprsky">`;
  for (const [x, w] of [[-420, 120], [-80, 70], [260, 150]] as [number, number][]) {
    s += `<path d="M${x - 300} -600 L${x - 300 + w} -600 L${x + 420 + w * 1.8} 900 L${x + 420} 900 Z" fill="url(#sv-paprsek)"/>`;
  }
  s += `</g>`;
  /* nádvoří: štěrk, kolem svatyně světlejší, a hrabané čáry */
  s += `<path d="M-1800 740 C-800 728 2000 728 3000 740 V1000 H-1800 Z" fill="url(#sv-nadvori)"/>`;
  s += `<ellipse cx="600" cy="850" rx="900" ry="190" fill="url(#sv-nadvori-svetlo)"/>`;
  let hrabane = "";
  for (let i = 1; i < 9; i++) hrabane += `M-1800 ${740 + i * 30} C-600 ${734 + i * 30} 1800 ${734 + i * 30} 3000 ${740 + i * 30} `;
  s += `<path d="${hrabane}" fill="none" stroke="#5D5A8A" stroke-width="1.6" opacity="0.4"/>`;
  /* kapradí a mech na krajích */
  for (let i = 0; i < 14; i++) {
    const x = i < 7 ? -1700 + i * 210 + r() * 80 : 1500 + (i - 7) * 210 + r() * 80;
    s += `<path d="${chomac(x, 752, 70 + r() * 50, 22 + r() * 10, 9, 70 + i, 0.4, 0.7)}" fill="#24334A"/>`;
  }
  /* kamenné lucerny dál v lese, rozsvítí se */
  for (const x of [-620, -260, 1460, 1820]) {
    s += `<g transform="translate(${x} 752) scale(1.1)">` +
      svetlo(`<circle cx="0" cy="-50" r="70" fill="url(#sv-zare-mekka)"/>`, 7) +
      `<path d="M-14 0 H14 L10 -9 H-10 Z" fill="${P.kamenStin}"/><rect x="-5" y="-32" width="10" height="23" fill="${P.kamen}"/>` +
      `<rect x="-12" y="-38" width="24" height="6" rx="1.5" fill="${P.kamenSvetlo}"/><rect x="-9" y="-56" width="18" height="18" fill="${P.kamenStin}"/>` +
      `<rect x="-6" y="-53" width="12" height="11" rx="1" fill="#3A3A5A"/>` + svetlo(`<rect x="-6" y="-53" width="12" height="11" rx="1" fill="#FFE9A8"/>`, 7) +
      `<path d="M-17 -56 Q0 -63 17 -56 L9 -67 Q0 -71 -9 -67 Z" fill="${P.kamen}"/><circle cx="0" cy="-72" r="3.4" fill="${P.kamenSvetlo}"/></g>`;
  }
  /* koruny nahoře — přes ně je vidět jen kus nebe */
  const rr = nahoda(13);
  for (let i = 0; i < 22; i++) {
    const x = -1800 + i * 230 + rr() * 80;
    if (x > 200 && x < 1000) continue;
    s += `<path d="${chomac(x, -560 + rr() * 90, 200 + rr() * 120, 110 + rr() * 50, 12, 90 + i, 0.5, 0.62)}" fill="#141B30"/>`;
  }
  return `<svg viewBox="-1800 -600 4800 1600" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">${s}</svg>`;
}

/* Výraz pro stránku: kde kdo sedí (v jednotkách scény) — x a y paty, w šířka */
export const SCENA = { sirka: S, vyska: 1000 };
