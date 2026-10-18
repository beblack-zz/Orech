/**
 * Úroveň 九 Kintsugi — poslední zastavení cesty hlíny, hlídá ho Střípek
 * (scéna components/zkouska/urovne/Strep.astro, kresba strep-kresba.ts).
 *
 * Ráno se otevřela pec a miska praskla na šest střepů. Při každém pokusu
 * se vylosuje jeden ze tří vzorů lomu a střepy se rozházejí po šátku,
 * každý pootočený. Hraje se ve dvou částech:
 *
 *   Slepit   střepy se táhnou myší nebo prstem a otáčí se kolečkem myši,
 *            klávesami Q a E, kulatými tlačítky u vybraného střepu, nebo
 *            druhým prstem. Střep zacvakne, když je jeho těžiště od svého
 *            místa blíž než 14 jednotek kresby (na malém displeji víc, aby
 *            to šlo prstem) a úhel nepřesahuje 12°.
 *   Zlato    spáry jsou tenké tmavé čáry laku a ukazatel je štětec. Kudy
 *            štětec projde blíž než 9 jednotek od spáry, tam je zlato.
 *            Kdo maluje na misce dál než 14 jednotek od spáry, kápne zlato
 *            vedle (každých 14 jednotek tahu jedna kapka). Hotovo, když má
 *            každá spára aspoň 95 % — zbytek se pak dozlatí sám.
 *
 * Body: 100 − 0,8·(Ta − 25 s) − 2,5·kapky − 0,5·(Tb − 20 s), kde Ta je čas
 * slepení a Tb čas zlacení; záporné závorky se nepočítají. Pod padesátkou
 * se srážky počítají napůl a dokončená hra má aspoň 25. Projde, kdo to
 * celé stihne do tří minut.
 *
 * Klávesnice: Tab chodí po střepech (neviditelná tlačítka .ms9-fokus),
 * šipky posouvají (se Shiftem víc), Q a E otáčí, Enter přiloží. Při zlacení
 * Enter obtáhne další spáru sám — pomaleji než ruka, ale bez kapek.
 *
 * Na telefonu (kvalita.ts) je zlatého prachu za štětcem polovina a třpyt
 * zlata se posouvá jen každý třetí snímek — jinak by se všechny zlaté
 * spáry překreslovaly šedesátkrát za vteřinu.
 */
import type { Uroven, Vysledek } from "../hra";
import { casText } from "../hra";
import * as zvuk from "../../parta2/zvuk";
import { omez, SVGNS } from "../../parta2/stav";
import { castic, telefon } from "../../parta2/kvalita";
import {
  MISKA,
  MEZE,
  VIEW_W,
  VIEW_H,
  VZORY,
  pripravVzor,
  rozhazej,
  strepySvg,
  sparySvg,
  cilStrepu,
  doMisky,
  transformace,
  posunStinu,
  vPolygonu,
  vMisce,
  odUsecky,
  odObrysu,
  SILUETA_D,
} from "../../../components/zkouska/urovne/strep-kresba";
import type { Bod, Dil, Poloha, Spara } from "../../../components/zkouska/urovne/strep-kresba";

/** Kam musí těžiště střepu, aby zacvakl (jednotky kresby) */
const TOL_POZICE = 14;
const TOL_UHEL = 12;
/** Jeden krok otočení — Q/E a tlačítka */
const KROK = 15;
/** Na dobu: kdo to nestihne za tři minuty, neprošlo */
const LIMIT = 180_000;
/** Štětec zlatí spáru do 9 jednotek, kape od 14 */
const ZLATO_R = 9;
const VEDLE_R = 14;
/** Kolik jednotek tahu mimo spáru dá jednu kapku */
const KAPKA_PO = 14;
const HOTOVO = 0.95;
/** Po jaké době bez pokroku Střípek napoví */
const NAPOVEDA_PO = 25_000;
/** Rychlost štětce, který z klávesnice obtahuje sám (jednotek za vteřinu) */
const SAM_RYCHLOST = 80;

const PENTA = [1318.5, 1568, 1760, 1975.5, 2349.3, 2637, 3136, 3520, 3951];
/** Nejvýš tolik zlatých zrnek naráz (na telefonu polovina) */
const ZRNEK_NARAZ = castic(28);
/** Po kolika snímcích se posune třpyt zlata: na telefonu každý třetí */
const TRPYT_PO = telefon() ? 3 : 1;

type Faze = "ceka" | "skladani" | "prechod" | "zlaceni" | "konec";

interface Strep {
  i: number;
  dil: Dil;
  el: SVGGElement;
  stin: SVGGElement;
  pol: Poloha;
  /** 0 leží, 1 zvednutý v ruce */
  zdvih: number;
  pevny: boolean;
}

interface ZlataSpara {
  s: Spara;
  zlato: Uint8Array;
  pocet: number;
  hotova: boolean;
}

interface Animace {
  od: number;
  doba: number;
  krok: (t: number) => void;
  konec?: () => void;
}

interface Castice {
  el: SVGCircleElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  vek: number;
  zivot: number;
}

const f = (n: number) => (Math.round(n * 10) / 10).toString();
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const pruzne = (t: number) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);
const zpomal = (t: number) => 1 - Math.pow(1 - t, 3);
/** Úhel do rozsahu −180…180 */
const uhel180 = (a: number) => ((((a + 180) % 360) + 360) % 360) - 180;

const kapkySlovy = (n: number) => (n === 0 ? "ani kapka" : n === 1 ? "1 kapka" : n < 5 ? `${n} kapky` : `${n} kapek`);

export const strep: Uroven = (p) => {
  const koren = p.koren;
  const svg = koren.querySelector<SVGSVGElement>(".mu-kresba")!;
  const vrstvaStrepu = svg.querySelector<SVGGElement>(".ms9-strepy")!;
  const vrstvaSpar = svg.querySelector<SVGGElement>(".ms9-spary")!;
  const jiskry = svg.querySelector<SVGGElement>(".ms9-jiskry")!;
  const napoveda = svg.querySelector<SVGGElement>(".ms9-napoveda")!;
  const cilStin = svg.querySelector<SVGEllipseElement>(".ms9-cil-stin")!;
  const stetecEl = svg.querySelector<SVGGElement>(".ms9-stetec")!;
  const zlatoGrad = svg.querySelector<SVGLinearGradientElement>("#ms9-zlato");
  const kami = koren.querySelector<HTMLElement>(".ms9-kami");
  const tlOtoc = [...koren.querySelectorAll<HTMLButtonElement>(".ms9-otoc")];
  const zastupci = [...koren.querySelectorAll<HTMLButtonElement>(".ms9-fokus:not(.ms9-fokus-zlato)")];
  const zastupceZlata = koren.querySelector<HTMLButtonElement>(".ms9-fokus-zlato")!;

  const ac = new AbortController();
  const { signal } = ac;
  const casovace = new Set<number>();
  const pozdeji = (ms: number, fn: () => void) => {
    const id = window.setTimeout(() => {
      casovace.delete(id);
      if (!zastaveno) fn();
    }, ms);
    casovace.add(id);
  };

  /* ——— Výchozí stav: nový vzor lomu, střepy rozházet, všechno ostatní pryč ——— */
  const vzor = Math.floor(Math.random() * VZORY.length);
  const v = pripravVzor(vzor);
  const polohy = rozhazej(v, Math.random);
  vrstvaStrepu.innerHTML = strepySvg(v, polohy);
  vrstvaStrepu.setAttribute("data-vzor", String(vzor));
  vrstvaSpar.innerHTML = sparySvg(v);
  jiskry.replaceChildren();
  napoveda.replaceChildren();
  koren.classList.remove("ms9-hraje", "ms9-faze-zlato", "ms9-hotovo", "ms9-prisel", "ms9-tahne", "ms9-maluje");
  cilStin.setAttribute("opacity", "0");
  stetecEl.setAttribute("display", "none");
  tlOtoc.forEach((b) => (b.hidden = true));
  zastupci.forEach((b) => (b.hidden = false));
  zastupceZlata.hidden = true;
  zlatoGrad?.removeAttribute("gradientTransform");

  const vrstvaPevne = vrstvaStrepu.querySelector<SVGGElement>(".ms9-pevne")!;
  const vrstvaVolne = vrstvaStrepu.querySelector<SVGGElement>(".ms9-volne")!;
  const zlatoCesty = [".ms9-zlato-okraj", ".ms9-zlato-stopa", ".ms9-zlato-lesk"].map((s) => vrstvaSpar.querySelector<SVGPathElement>(s)!);
  const kapkyEl = vrstvaSpar.querySelector<SVGGElement>(".ms9-kapky")!;
  const dalsiEl = vrstvaSpar.querySelector<SVGPathElement>(".ms9-dalsi path")!;

  const strepy: Strep[] = v.dily.map((dil, i) => {
    const el = vrstvaVolne.querySelector<SVGGElement>(`.ms9-strep[data-i="${i}"]`)!;
    return { i, dil, el, stin: el.querySelector<SVGGElement>(".ms9-strep-stin")!, pol: { ...polohy[i] }, zdvih: 0, pevny: false };
  });
  const spary: ZlataSpara[] = v.spary.map((s) => ({ s, zlato: new Uint8Array(s.body.length), pocet: 0, hotova: false }));
  const vzorkuCelkem = spary.reduce((a, s) => a + s.s.body.length, 0);

  let faze: Faze = "ceka";
  let zastaveno = false;
  /** p.konec už padl — od té chvíle nic */
  let skonceno = false;
  let raf = 0;
  let startCas = 0;
  let casSlepeni = 0;
  let zacatekZlaceni = 0;
  let casZlaceni = 0;
  let posledniPokrok = 0;
  let posledniNapoveda = 0;
  let posledniVeta = -1e9;
  let posledniZprava = -1e9;
  let varovano = false;
  let hudText = "";
  let pevnych = 0;
  let kapky = 0;
  let hotovychSpar = 0;
  let vybrany: Strep | null = null;
  let zlatoZmena = false;
  let otocZmena = true;
  let snimkuTrpytu = 0;
  const animace: Animace[] = [];
  const castice: Castice[] = [];
  /** Kdo za co tahá — pointerId → bod ve scéně */
  const ukazatele = new Map<number, Bod>();
  let tah: { id: number; s: Strep; dx: number; dy: number } | null = null;
  let otaceni: { id: number; uhel: number } | null = null;
  let stetec: { id: number; posledni: Bod; mimo: number; cas: number; dotyk: boolean } | null = null;
  let sam: { z: ZlataSpara; od: number; doba: number } | null = null;
  /** Hraje se z klávesnice? Jen pak fokus sám skáče na další střep a další spára bliká */
  let klavesnice = false;

  const ted = () => performance.now();
  const zKlavesnice = (el: Element) => {
    try {
      if (el.matches(":focus-visible")) return true;
    } catch {
      /* prohlížeč bez :focus-visible */
    }
    return klavesnice;
  };

  /* ——— Pomůcky ——— */
  const bodZ = (e: PointerEvent | WheelEvent): Bod => {
    const b = svg.getBoundingClientRect();
    if (!b.width || !b.height) return [e.clientX, e.clientY];
    return [((e.clientX - b.left) / b.width) * VIEW_W, ((e.clientY - b.top) / b.height) * VIEW_H];
  };
  /** Kolik jednotek kresby je jeden pixel na obrazovce — na telefonu víc */
  const jednotekNaPx = () => {
    const w = svg.getBoundingClientRect().width;
    return w > 0 ? VIEW_W / w : 1;
  };
  const tolPozice = () => Math.max(TOL_POZICE, 9 * jednotekNaPx());
  const doMiskyZeSceny = (b: Bod): Bod => [b[0] - MISKA.x, b[1] - MISKA.y];

  const rekni = (text: string, kotva?: Element | null) => {
    posledniVeta = ted();
    p.rekni(text, kotva);
  };
  const zprava = (text: string, rozestup = 4000) => {
    if (ted() - posledniZprava < rozestup) return;
    posledniZprava = ted();
    p.zprava(text);
  };

  const skonci = (v: Vysledek) => {
    if (skonceno) return;
    skonceno = true;
    p.konec(v);
  };

  const animuj = (doba: number, krok: (t: number) => void, konec?: () => void) => {
    if (p.klid || doba <= 0) {
      krok(1);
      konec?.();
      return;
    }
    animace.push({ od: ted(), doba, krok, konec });
  };

  const hud = () => {
    const cas = casText(faze === "ceka" ? 0 : ted() - startCas);
    const text =
      faze === "zlaceni" || faze === "konec" || faze === "prechod"
        ? `Zlato ${Math.floor(zlatoPodil() * 100)} % · ${cas}`
        : `Střepy ${pevnych}/${strepy.length} · ${cas}`;
    if (text !== hudText) {
      hudText = text;
      p.ukazatel(text);
    }
  };

  /* ——— Kresba střepu ——— */
  const kresli = (s: Strep) => {
    s.el.setAttribute("transform", transformace(s.dil, s.pol, 1 + (p.klid ? 0 : 0.045 * s.zdvih)));
    s.stin.setAttribute("transform", posunStinu(s.pol.a, s.zdvih));
    if (s === vybrany) otocZmena = true;
  };

  const vyber = (s: Strep | null) => {
    if (vybrany === s) return;
    vybrany?.el.classList.remove("ms9-vybrany");
    vybrany = s && !s.pevny ? s : null;
    if (vybrany) {
      vybrany.el.classList.add("ms9-vybrany");
      vrstvaVolne.appendChild(vybrany.el);
    }
    otocZmena = true;
  };

  /** Kulatá tlačítka otáčení stojí po stranách vybraného střepu */
  const umistiOtoceni = () => {
    otocZmena = false;
    const s = vybrany;
    const ukazat = faze === "skladani" && s !== null && !s.pevny && !tah;
    tlOtoc.forEach((b) => (b.hidden = !ukazat));
    if (!ukazat || !s) return;
    /* Po stranách střepu; když se jedna strana nevejde, obě na tu druhou nad sebe */
    const r = s.dil.polomer * 0.82 + 30;
    const vlevo = s.pol.x - r;
    const vpravo = s.pol.x + r;
    const y = s.pol.y + 16;
    const mista: Bod[] =
      vlevo >= 28 && vpravo <= VIEW_W - 28
        ? [[vlevo, y], [vpravo, y]]
        : vlevo < 28
          ? [[vpravo, y - 33], [vpravo, y + 33]]
          : [[vlevo, y - 33], [vlevo, y + 33]];
    const dolu = Math.max(0, mista[1][1] - (VIEW_H - 26));
    tlOtoc.forEach((b, i) => {
      const x = omez(mista[i][0], 28, VIEW_W - 28);
      const yb = omez(mista[i][1] - dolu, MEZE.y0, VIEW_H - 26);
      b.style.left = `${f((x / VIEW_W) * 100)}%`;
      b.style.top = `${f((yb / VIEW_H) * 100)}%`;
    });
  };

  /** Který volný střep je pod bodem — nahoře ležící vyhrává; s tolerancí i těsně vedle */
  const najdi = (b: Bod, tol: number): Strep | null => {
    const volne = [...vrstvaVolne.children].reverse().map((el) => strepy[Number((el as SVGGElement).dataset.i)]).filter((s) => s && !s.pevny);
    for (const s of volne) {
      const q = doMisky(s.dil, s.pol, b);
      if (vMisce(q) && vPolygonu(q, s.dil.body)) return s;
    }
    let nej: Strep | null = null;
    let nejD = tol;
    for (const s of volne) {
      const q = doMisky(s.dil, s.pol, b);
      for (const w of s.dil.vzorky) {
        const d = Math.hypot(q[0] - w[0], q[1] - w[1]) - 5;
        if (d < nejD) {
          nejD = d;
          nej = s;
        }
      }
    }
    return nej;
  };

  const doMeziStul = (s: Strep) => {
    s.pol.x = omez(s.pol.x, MEZE.x0, MEZE.x1);
    s.pol.y = omez(s.pol.y, MEZE.y0, MEZE.y1);
  };

  const otoc = (s: Strep, o: number) => {
    const pred = Math.floor(s.pol.a / KROK);
    s.pol.a = uhel180(s.pol.a + o);
    kresli(s);
    if (Math.floor(s.pol.a / KROK) !== pred || Math.abs(o) >= KROK) zvuk.ton(1900, 1650, 0.035, "triangle", 0.045);
  };

  /* ——— Slepit ——— */
  const zkusPrilozit = (s: Strep, jak: "pust" | "klavesa" | "tichy") => {
    if (s.pevny || faze !== "skladani") return false;
    const [tx, ty] = cilStrepu(s.dil);
    const vzd = Math.hypot(s.pol.x - tx, s.pol.y - ty);
    const uhel = Math.abs(uhel180(s.pol.a));
    const tol = tolPozice();
    if (vzd <= tol && uhel <= TOL_UHEL) {
      zamkni(s);
      return true;
    }
    if (jak === "tichy") return false;
    if (vzd <= tol * 2.4 && uhel > TOL_UHEL) zprava("Skoro. Ještě ho pootoč.");
    else if (jak === "klavesa") zprava(vzd <= tol * 2.4 ? "Kousek vedle." : "Tady ještě ne.", 1200);
    return false;
  };

  const zamkni = (s: Strep) => {
    s.pevny = true;
    if (vybrany === s) vyber(null);
    if (tah?.s === s) tah = null;
    pevnych++;
    posledniPokrok = ted();
    s.el.classList.add("ms9-pevny");
    s.el.classList.remove("ms9-hledej");
    vrstvaPevne.appendChild(s.el);
    napoveda.replaceChildren();
    const z = { ...s.pol };
    const zdvih0 = s.zdvih;
    const [tx, ty] = cilStrepu(s.dil);
    animuj(
      180,
      (t) => {
        const u = zpomal(t);
        s.pol = { x: mix(z.x, tx, u), y: mix(z.y, ty, u), a: mix(z.a, 0, u) };
        s.zdvih = zdvih0 * (1 - u);
        kresli(s);
      },
      () => {
        s.pol = { x: tx, y: ty, a: 0 };
        s.zdvih = 0;
        kresli(s);
        s.stin.setAttribute("display", "none");
        if (!p.klid) {
          s.el.classList.remove("ms9-lesk");
          void s.el.getBoundingClientRect();
          s.el.classList.add("ms9-lesk");
        }
      },
    );
    zvuk.drevo(1.6);
    zvuk.ton(2637, 2480, 0.24, "sine", 0.07);
    cilStin.setAttribute("opacity", f(0.6 * (pevnych / strepy.length) ** 2));

    const zastupce = zastupci[s.i];
    const mel = document.activeElement === zastupce && klavesnice;
    zastupce.hidden = true;
    if (pevnych === 1) rekni("Sedí.");
    else if (pevnych === 4) rekni("Tenhle jsem byl skoro já.");
    hud();
    if (pevnych === strepy.length) {
      slepeno(mel);
      return;
    }
    if (mel) {
      const dalsi = strepy.find((x) => !x.pevny && x.i > s.i) ?? strepy.find((x) => !x.pevny);
      if (dalsi) zastupci[dalsi.i].focus({ preventScroll: true });
    }
  };

  const zvedni = (s: Strep) => {
    vyber(s);
    koren.classList.add("ms9-tahne");
    const z0 = s.zdvih;
    animuj(120, (t) => {
      if (tah?.s !== s) return;
      s.zdvih = mix(z0, 1, zpomal(t));
      kresli(s);
    });
    zvuk.sumik(0.09, 1300, 0.9, 0.05);
  };

  const poloz = (s: Strep) => {
    koren.classList.remove("ms9-tahne");
    const z0 = s.zdvih;
    animuj(160, (t) => {
      if (tah?.s === s || s.pevny) return;
      s.zdvih = z0 * (1 - pruzne(t));
      kresli(s);
    }, () => {
      if (s.pevny || tah?.s === s) return;
      s.zdvih = 0;
      kresli(s);
    });
    otocZmena = true;
  };

  /* ——— Napověda: střep, který dlouho nikdo nenašel, a kam patří ——— */
  const napovez = () => {
    const volne = strepy.filter((s) => !s.pevny);
    if (!volne.length) return;
    const s = volne[Math.floor(Math.random() * volne.length)];
    posledniNapoveda = ted();
    napoveda.innerHTML = `<path d="${SILUETA_D}" clip-path="url(#ms9-d${s.i})" fill="#F3D27A"/>`;
    s.el.classList.remove("ms9-hledej");
    void s.el.getBoundingClientRect();
    s.el.classList.add("ms9-hledej");
    rekni("Tenhle se zatoulal. Patří tam, kde to bliká.");
    pozdeji(4200, () => {
      s.el.classList.remove("ms9-hledej");
      if (napoveda.firstChild) napoveda.replaceChildren();
    });
  };

  /* ——— Zlato ——— */
  const zlatoPodil = () => spary.reduce((a, z) => a + z.pocet, 0) / Math.max(1, vzorkuCelkem);

  const slepeno = (zKlaves: boolean) => {
    casSlepeni = ted() - startCas;
    faze = "prechod";
    tah = null;
    otaceni = null;
    vyber(null);
    koren.classList.remove("ms9-tahne");
    koren.classList.add("ms9-faze-zlato");
    tlOtoc.forEach((b) => (b.hidden = true));
    zvuk.nalezeno();
    zprava("Slepeno. Teď štětcem zlato do spár.", 0);
    zastupceZlata.hidden = false;
    if (zKlaves) zastupceZlata.focus({ preventScroll: true });
    hud();
    pozdeji(p.klid ? 300 : 950, () => {
      faze = "zlaceni";
      zacatekZlaceni = ted();
      posledniPokrok = ted();
      if (document.activeElement === zastupceZlata) ukazDalsi();
      hud();
    });
  };

  /** Zlato po spárách: jen běhy pozlacených bodů, ať je vidět, kde ještě chybí */
  const kresliZlato = () => {
    zlatoZmena = false;
    let d = "";
    for (const z of spary) {
      const b = z.s.body;
      for (let k = 0; k < b.length; k++) {
        if (!z.zlato[k]) continue;
        const navazuje = k > 0 && z.zlato[k - 1] && z.s.spoj[k];
        if (navazuje) d += `L${f(b[k][0])} ${f(b[k][1])}`;
        else {
          d += `M${f(b[k][0])} ${f(b[k][1])}`;
          const pokracuje = k + 1 < b.length && z.zlato[k + 1] && z.s.spoj[k + 1];
          if (!pokracuje) d += "l0.1 0";
        }
      }
    }
    zlatoCesty.forEach((c) => c.setAttribute("d", d));
  };

  const odSpar = (q: Bod) => {
    let m = Infinity;
    for (const z of spary) for (const b of z.s.body) m = Math.min(m, Math.hypot(q[0] - b[0], q[1] - b[1]));
    return m;
  };

  const castici = (x: number, y: number) => {
    if (p.klid || castice.length > ZRNEK_NARAZ) return;
    const el = document.createElementNS(SVGNS, "circle");
    el.setAttribute("r", f(0.8 + Math.random() * 1.3));
    el.setAttribute("fill", Math.random() < 0.5 ? "#FFF3C4" : "#F3D27A");
    jiskry.appendChild(el);
    const u = Math.random() * Math.PI * 2;
    const rych = 20 + Math.random() * 40;
    castice.push({ el, x, y, vx: Math.cos(u) * rych, vy: Math.sin(u) * rych - 30, vek: 0, zivot: 0.5 + Math.random() * 0.4 });
  };

  const hvezda = (x: number, y: number, velikost = 1, trvala = false) => {
    const g = document.createElementNS(SVGNS, "g");
    g.setAttribute("transform", `translate(${f(x)} ${f(y)}) scale(${f(velikost)})`);
    g.innerHTML = `<use href="#ms9-jiskra" class="${trvala ? "ms9-trpyt" : "ms9-hvezda"}" fill="#FFF3C4"${trvala ? ` style="animation-delay:${f(Math.random() * 1.6)}s"` : ""}/>`;
    jiskry.appendChild(g);
    if (!trvala) pozdeji(1000, () => g.remove());
  };

  const dokonciSparu = (z: ZlataSpara) => {
    z.hotova = true;
    z.zlato.fill(1);
    z.pocet = z.zlato.length;
    zlatoZmena = true;
    hotovychSpar++;
    posledniPokrok = ted();
    zvuk.furin(PENTA[Math.min(PENTA.length - 1, hotovychSpar - 1)], 0.1);
    const stred = z.s.body[Math.floor(z.s.body.length / 2)];
    hvezda(stred[0] + MISKA.x, stred[1] + MISKA.y, 0.9);
    if (document.activeElement === zastupceZlata) ukazDalsi();
    if (spary.every((x) => x.hotova)) dokonceno();
  };

  const zkontrolujSpary = () => {
    for (const z of spary) if (!z.hotova && z.pocet >= z.zlato.length * HOTOVO) dokonciSparu(z);
  };

  const kapni = (q: Bod) => {
    kapky++;
    const g = document.createElementNS(SVGNS, "g");
    g.setAttribute("transform", `translate(${f(q[0])} ${f(q[1])}) rotate(${Math.round(Math.random() * 360)})`);
    /* Kapka s cákancem: tmavší lem, aby byla vidět i na krémové glazuře */
    const r = 4 + Math.random() * 1.6;
    const sat = 1.2 + Math.random() * 0.8;
    g.innerHTML =
      `<g class="ms9-kapka-tvar"><circle r="${f(r)}" fill="#E2B04A" stroke="#7A5412" stroke-opacity="0.7" stroke-width="0.9"/>` +
      `<circle cx="${f(r + 3.4)}" cy="0.8" r="${f(sat)}" fill="#E2B04A" stroke="#7A5412" stroke-opacity="0.6" stroke-width="0.6"/>` +
      `<circle cx="${f(-r - 2.6)}" cy="-1.4" r="${f(sat * 0.6)}" fill="#E9BC52"/>` +
      `<circle cx="${f(-r * 0.3)}" cy="${f(-r * 0.35)}" r="${f(r * 0.34)}" fill="#FFF6D0" opacity="0.9"/></g>`;
    kapkyEl.appendChild(g);
    zvuk.ton(300, 150, 0.09, "sine", 0.12);
    if (kapky === 1 || (kapky % 5 === 0 && ted() - posledniVeta > 6000)) rekni("Zlato do spáry, ne vedle. Je drahé.");
  };

  /** Tah štětcem z a do b (body ve scéně) */
  const maluj = (a: Bod, b: Bod, zacatek: boolean) => {
    const st = stetec;
    if (!st) return;
    const A = doMiskyZeSceny(a);
    const B = doMiskyZeSceny(b);
    const R = Math.max(ZLATO_R, (st.dotyk ? 9 : 6) * jednotekNaPx());
    const Rv = Math.max(VEDLE_R, R + 5);
    let nove = 0;
    for (const z of spary) {
      if (z.hotova) continue;
      const body = z.s.body;
      for (let k = 0; k < body.length; k++) {
        if (z.zlato[k] || odUsecky(body[k], A, B) > R) continue;
        z.zlato[k] = 1;
        z.pocet++;
        nove++;
      }
    }
    if (nove) {
      zlatoZmena = true;
      posledniPokrok = ted();
      for (let k = 0, kolik = castic(Math.min(3, Math.ceil(nove / 2))); k < kolik; k++) castici(b[0] + (Math.random() - 0.5) * 6, b[1] + (Math.random() - 0.5) * 6);
    }
    /* Kapky vedle: po tahu v krocích po 3 jednotkách */
    const delka = Math.hypot(B[0] - A[0], B[1] - A[1]);
    const n = Math.max(1, Math.ceil(delka / 3));
    for (let k = zacatek ? 0 : 1; k <= n; k++) {
      const q: Bod = [mix(A[0], B[0], k / n), mix(A[1], B[1], k / n)];
      if (!vMisce(q) && odObrysu(q) > 10) {
        st.mimo = 0;
        continue;
      }
      const d = odSpar(q);
      if (d <= R) st.mimo = 0;
      else if (d > Rv) {
        st.mimo += k === 0 ? KAPKA_PO : delka / n;
        if (st.mimo >= KAPKA_PO) {
          st.mimo -= KAPKA_PO;
          kapni(q);
        }
      }
    }
    zkontrolujSpary();
  };

  const ukazStetec = (b: Bod | null) => {
    if (!b) {
      stetecEl.setAttribute("display", "none");
      return;
    }
    stetecEl.setAttribute("display", "inline");
    stetecEl.setAttribute("transform", `translate(${f(b[0])} ${f(b[1])})`);
  };

  /** Klávesnice: další nedokončená spára pulzuje */
  const ukazDalsi = () => {
    const z = spary.find((x) => !x.hotova);
    const ukazat = z && faze === "zlaceni" && document.activeElement === zastupceZlata && zKlavesnice(zastupceZlata);
    dalsiEl.setAttribute("d", ukazat ? z.s.d : "");
  };

  /** Enter při zlacení: štětec obtáhne další spáru sám, pomalu a bez kapek */
  const obtahniSam = () => {
    if (faze !== "zlaceni" || sam || stetec) return;
    const z = spary.find((x) => !x.hotova);
    if (!z) return;
    sam = { z, od: ted(), doba: Math.max(1100, (z.s.delka / SAM_RYCHLOST) * 1000) };
    dalsiEl.setAttribute("d", "");
  };

  const krokSam = () => {
    if (!sam) return;
    const { z, od, doba } = sam;
    const t = omez((ted() - od) / doba);
    const n = z.s.body.length;
    const az = Math.min(n - 1, Math.floor(t * (n - 1)));
    for (let k = 0; k <= az; k++) {
      if (!z.zlato[k]) {
        z.zlato[k] = 1;
        z.pocet++;
        zlatoZmena = true;
      }
    }
    const b = z.s.body[az];
    ukazStetec([b[0] + MISKA.x, b[1] + MISKA.y]);
    zvuk.stetecSila(0.35);
    if (t >= 1) {
      sam = null;
      zvuk.stetecSila(0);
      ukazStetec(null);
      if (!z.hotova) dokonciSparu(z);
    }
  };

  const dokonceno = () => {
    casZlaceni = ted() - zacatekZlaceni;
    faze = "konec";
    stetec = null;
    sam = null;
    zvuk.stetecSila(0);
    ukazStetec(null);
    dalsiEl.setAttribute("d", "");
    zastupceZlata.hidden = true;
    koren.classList.remove("ms9-maluje");
    koren.classList.add("ms9-hotovo");
    hud();
    zvuk.zlato();
    /* Zlato se rozzáří, po spárách přeběhne lesk a ke slepené misce přijde Střípek */
    if (!p.klid) {
      const vsechny = spary.flatMap((z) => z.s.body);
      for (let k = 0; k < 6; k++) {
        const b = vsechny[Math.floor(((k + 0.5) / 6) * vsechny.length)];
        hvezda(b[0] + MISKA.x, b[1] + MISKA.y, 0.7 + Math.random() * 0.5, true);
      }
    }
    pozdeji(p.klid ? 200 : 650, () => {
      koren.classList.add("ms9-prisel");
      zvuk.reakce("stripek");
    });
    pozdeji(p.klid ? 500 : 1350, () => rekni("Tohle zlato? To je jizva. Nejhezčí věc, co mám.", kami));
    pozdeji(p.klid ? 1800 : 3600, () => skonci(vysledek()));
  };

  const vysledek = (): Vysledek => {
    const ta = casSlepeni / 1000;
    const tb = casZlaceni / 1000;
    const hrube = 100 - Math.max(0, ta - 25) * 0.8 - kapky * 2.5 - Math.max(0, tb - 20) * 0.5;
    /* Kdo to dotáhne do konce, má aspoň 可 se ctí: pod padesátkou se srážky počítají napůl */
    const body = Math.round(omez(hrube >= 50 ? hrube : 50 - (50 - hrube) / 2, 25, 100));
    const veta =
      body >= 85
        ? "Prasklina se neschovala. Stala se tou nejhezčí částí."
        : body >= 65
          ? "Drží. A leskne se. Co víc chtít."
          : kapky >= 4
            ? "Trochu zlata vedle. Vypadá to bohatě."
            : "Pomalu, ale drží. Jako já.";
    return {
      body,
      proslo: true,
      veta,
      udaje: [
        ["Slepeno za", casText(casSlepeni)],
        ["Zlato vedle", kapkySlovy(kapky)],
        ["Zlacení", casText(casZlaceni)],
      ],
    };
  };

  const prohra = () => {
    const bylo = faze;
    faze = "konec";
    tah = null;
    otaceni = null;
    stetec = null;
    sam = null;
    zvuk.stetecSila(0);
    ukazStetec(null);
    vyber(null);
    tlOtoc.forEach((b) => (b.hidden = true));
    koren.classList.remove("ms9-tahne", "ms9-maluje");
    zvuk.ton(220, 140, 0.5, "sine", 0.15);
    p.zprava("Tři minuty jsou pryč.");
    const procent = Math.floor(zlatoPodil() * 100);
    const body = Math.min(39, Math.round((pevnych / strepy.length) * 30 + (bylo === "zlaceni" ? procent / 10 : 0)));
    pozdeji(900, () =>
      skonci({
        body,
        proslo: false,
        veta: "Ještě to drží jen silou vůle.",
        udaje: [
          ["Slepeno", `${pevnych} z ${strepy.length} střepů`],
          ["Zlato", `${procent} %`],
          ["Zlato vedle", kapkySlovy(kapky)],
        ],
      }),
    );
  };

  /* ——— Smyčka ——— */
  const smycka = () => {
    raf = 0;
    if (zastaveno || skonceno) return;
    const t = ted();
    for (let i = animace.length - 1; i >= 0; i--) {
      const a = animace[i];
      const u = omez((t - a.od) / a.doba);
      a.krok(u);
      if (u >= 1) {
        animace.splice(i, 1);
        a.konec?.();
      }
    }
    for (let i = castice.length - 1; i >= 0; i--) {
      const c = castice[i];
      c.vek += 1 / 60;
      c.x += c.vx / 60;
      c.y += c.vy / 60;
      c.vy += 70 / 60;
      const k = c.vek / c.zivot;
      if (k >= 1) {
        c.el.remove();
        castice.splice(i, 1);
        continue;
      }
      c.el.setAttribute("cx", f(c.x));
      c.el.setAttribute("cy", f(c.y));
      c.el.setAttribute("opacity", f(1 - k));
    }
    krokSam();
    if (zlatoZmena) kresliZlato();
    if (otocZmena) umistiOtoceni();
    if (zlatoGrad && !p.klid && (faze === "zlaceni" || faze === "konec" || faze === "prechod") && ++snimkuTrpytu >= TRPYT_PO) {
      snimkuTrpytu = 0;
      zlatoGrad.setAttribute("gradientTransform", `translate(${f(Math.sin(t / 700) * 46)} ${f(Math.cos(t / 900) * 30)})`);
    }
    if (stetec && t - stetec.cas > 90) zvuk.stetecSila(0);

    if (faze === "skladani" || faze === "prechod" || faze === "zlaceni") {
      const uplynulo = t - startCas;
      if (uplynulo >= LIMIT) prohra();
      else {
        if (!varovano && uplynulo >= LIMIT - 30_000) {
          varovano = true;
          p.zprava("Ještě půl minuty.");
        }
        if (faze === "skladani" && t - posledniPokrok > NAPOVEDA_PO && t - posledniNapoveda > NAPOVEDA_PO && !tah) napovez();
        hud();
      }
    }
    /* Běží i při závěrečné slávě (třpyt zlata), skončí s p.konec */
    if (!skonceno) raf = requestAnimationFrame(smycka);
  };

  /* ——— Ovládání ——— */
  const zachyt = (id: number) => {
    try {
      svg.setPointerCapture(id);
    } catch {
      /* ukazatel už není aktivní */
    }
  };

  const dolu = (e: PointerEvent) => {
    if (faze !== "skladani" && faze !== "zlaceni") return;
    if (e.button > 0) return;
    klavesnice = false;
    zvuk.odemkni();
    const b = bodZ(e);
    ukazatele.set(e.pointerId, b);

    if (faze === "skladani") {
      if (tah && tah.id !== e.pointerId) {
        /* Druhý prst: otáčení kolem prvního */
        const p1 = ukazatele.get(tah.id) ?? b;
        otaceni = { id: e.pointerId, uhel: Math.atan2(b[1] - p1[1], b[0] - p1[0]) };
        zachyt(e.pointerId);
        e.preventDefault();
        return;
      }
      const s = najdi(b, (e.pointerType === "touch" ? 14 : 5) * jednotekNaPx());
      if (!s) {
        vyber(null);
        return;
      }
      e.preventDefault();
      zachyt(e.pointerId);
      tah = { id: e.pointerId, s, dx: s.pol.x - b[0], dy: s.pol.y - b[1] };
      zvedni(s);
      zastupci[s.i].focus({ preventScroll: true });
      return;
    }

    /* Zlacení */
    if (sam) return;
    e.preventDefault();
    zachyt(e.pointerId);
    stetec = { id: e.pointerId, posledni: b, mimo: 0, cas: ted(), dotyk: e.pointerType === "touch" };
    koren.classList.add("ms9-maluje");
    ukazStetec(b);
    maluj(b, b, true);
  };

  const pohyb = (e: PointerEvent) => {
    const b = bodZ(e);
    if (ukazatele.has(e.pointerId)) ukazatele.set(e.pointerId, b);
    if (faze === "skladani") {
      if (tah && e.pointerId === tah.id) {
        const s = tah.s;
        s.pol.x = b[0] + tah.dx;
        s.pol.y = b[1] + tah.dy;
        doMeziStul(s);
        kresli(s);
      }
      if (tah && otaceni && (e.pointerId === otaceni.id || e.pointerId === tah.id)) {
        const p1 = ukazatele.get(tah.id);
        const p2 = ukazatele.get(otaceni.id);
        if (p1 && p2) {
          const u = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);
          const o = uhel180(((u - otaceni.uhel) * 180) / Math.PI);
          otaceni.uhel = u;
          if (o) otoc(tah.s, o);
        }
      }
      return;
    }
    if (faze !== "zlaceni") return;
    if (stetec && e.pointerId === stetec.id) {
      const t = ted();
      const rychlost = Math.hypot(b[0] - stetec.posledni[0], b[1] - stetec.posledni[1]) / Math.max(8, t - stetec.cas);
      maluj(stetec.posledni, b, false);
      /* Tahle čára mohla dozlatit poslední spáru */
      if (faze !== "zlaceni" || !stetec) return;
      stetec.posledni = b;
      stetec.cas = t;
      zvuk.stetecSila(omez(0.15 + rychlost * 0.9));
      ukazStetec(b);
    } else if (!sam && e.pointerType !== "touch") ukazStetec(b);
  };

  const nahoru = (e: PointerEvent) => {
    ukazatele.delete(e.pointerId);
    if (otaceni && e.pointerId === otaceni.id) {
      otaceni = null;
      return;
    }
    if (tah && e.pointerId === tah.id) {
      const s = tah.s;
      tah = null;
      otaceni = null;
      poloz(s);
      zkusPrilozit(s, "pust");
      return;
    }
    if (stetec && e.pointerId === stetec.id) {
      const dotyk = stetec.dotyk;
      stetec = null;
      koren.classList.remove("ms9-maluje");
      zvuk.stetecSila(0);
      if (dotyk) ukazStetec(null);
    }
  };

  const kolecko = (e: WheelEvent) => {
    if (faze !== "skladani") return;
    const s = tah?.s ?? najdi(bodZ(e), 0);
    if (!s) return;
    e.preventDefault();
    let dy = e.deltaY;
    if (e.deltaMode === 1) dy *= 33;
    else if (e.deltaMode === 2) dy *= 800;
    const o = omez(dy * 0.15, -KROK, KROK);
    if (!o) return;
    vyber(s);
    otoc(s, o);
    if (!tah) zkusPrilozit(s, "tichy");
  };

  const klavesa = (e: KeyboardEvent) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    klavesnice = true;
    if (faze === "zlaceni") {
      if ((e.key === "Enter" || e.key === " ") && document.activeElement === zastupceZlata) {
        e.preventDefault();
        obtahniSam();
      } else if (document.activeElement === zastupceZlata) ukazDalsi();
      return;
    }
    if (faze !== "skladani") return;
    const klic = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    /* Q a E točí i střepem, který je zrovna v ruce; ostatní klávesy počkají, až ho pustí */
    if (tah && klic !== "q" && klic !== "e") return;
    const s = tah ? tah.s : vybrany;
    if (!s || s.pevny) return;
    const k = e.shiftKey ? 24 : 5;
    switch (klic) {
      case "ArrowLeft":
        s.pol.x -= k;
        break;
      case "ArrowRight":
        s.pol.x += k;
        break;
      case "ArrowUp":
        s.pol.y -= k;
        break;
      case "ArrowDown":
        s.pol.y += k;
        break;
      case "q":
        otoc(s, -KROK);
        break;
      case "e":
        otoc(s, KROK);
        break;
      case "Enter":
        e.preventDefault();
        zkusPrilozit(s, "klavesa");
        return;
      default:
        return;
    }
    e.preventDefault();
    doMeziStul(s);
    kresli(s);
    if (!tah) zkusPrilozit(s, "tichy");
  };

  return {
    start() {
      if (zastaveno || faze !== "ceka") return;
      faze = "skladani";
      startCas = ted();
      posledniPokrok = startCas;
      posledniNapoveda = startCas;

      svg.addEventListener("pointerdown", dolu, { signal });
      svg.addEventListener("pointermove", pohyb, { signal });
      svg.addEventListener("pointerup", nahoru, { signal });
      svg.addEventListener("pointercancel", nahoru, { signal });
      svg.addEventListener("lostpointercapture", (e) => {
        if (tah?.id === e.pointerId || stetec?.id === e.pointerId || otaceni?.id === e.pointerId) nahoru(e);
      }, { signal });
      svg.addEventListener("pointerleave", (e) => {
        if (e.pointerType !== "touch" && !stetec && !sam) ukazStetec(null);
      }, { signal });
      svg.addEventListener("wheel", kolecko, { passive: false, signal });
      koren.addEventListener("keydown", klavesa, { signal });

      zastupci.forEach((b, i) => {
        b.addEventListener("focus", () => {
          if (zKlavesnice(b)) klavesnice = true;
          if (faze === "skladani" && !strepy[i].pevny) vyber(strepy[i]);
        }, { signal });
        /* Enter na tlačítku = přiložit (klávesy řeší klavesa(), klik ze čtečky sem) */
        b.addEventListener("click", (e) => {
          if (e.detail === 0 && faze === "skladani" && !strepy[i].pevny && vybrany === strepy[i]) zkusPrilozit(strepy[i], "klavesa");
        }, { signal });
      });
      zastupceZlata.addEventListener("focus", ukazDalsi, { signal });
      zastupceZlata.addEventListener("blur", () => dalsiEl.setAttribute("d", ""), { signal });
      zastupceZlata.addEventListener("click", (e) => {
        if (e.detail === 0) obtahniSam();
      }, { signal });
      tlOtoc.forEach((b) => {
        b.addEventListener("pointerdown", (e) => e.preventDefault(), { signal });
        b.addEventListener("click", () => {
          const s = vybrany;
          if (!s || faze !== "skladani") return;
          otoc(s, Number(b.dataset.smer) * KROK);
          zkusPrilozit(s, "tichy");
        }, { signal });
      });

      koren.classList.add("ms9-hraje");
      rekni("Rozbít něco není konec světa. Je to začátek kintsugi.");
      hud();
      raf = requestAnimationFrame(smycka);
    },
    stop() {
      zastaveno = true;
      ac.abort();
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      casovace.forEach((id) => window.clearTimeout(id));
      casovace.clear();
      zvuk.stetecSila(0);
      koren.classList.remove("ms9-hraje");
    },
  };
};
