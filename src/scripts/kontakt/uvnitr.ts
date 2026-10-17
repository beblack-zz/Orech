/**
 * Kontakt uvnitř: kamera vjede po provázku oknem do dílny k ústředně
 * 交換台 (components/kontakt/kresba/uvnitr.ts) — skutečné ústředně
 * s kolíky. Devět linek, na každé jeden z party (data/ustredna.ts).
 *
 * Hra:
 *   kolík     z police jde vytáhnout myší i prstem a zastrčit do zdířky;
 *             šňůra kōhaku se za ním natáhne (řetízek s gravitací),
 *             v průzoru pod policí vyjede závaží, zdířka cvakne
 *   linka     tlačítko přes každé okénko (klik, ťuk, Enter, klávesy 1–9):
 *             volná linka si vezme nejbližší kolík, spojená ho pustí domů
 *   spojeno   kontrolka se rozsvítí, kami zvedne hrnek od niti k uchu
 *             a řekne, čemu rozumí; zavěšený hrnek se pak houpe
 *   porada    tři a víc linek naráz: skáčou si do řeči; Vázička zjedná
 *             ticho, při pěti mluví všichni naráz, při devíti se ozve
 *             „A kdo teď hlídá dílnu?!“
 *
 * Linka 二 je telefon dílny. Při vjetí zvoní a kolík do ní skočí sám:
 *
 *   0,0 s   linka 二 zvoní, kontrolka bliká, po provázku přiběhnou světélka
 *   0,9 s   kolík odletí do zdířky 二, ten, kdo má službu, zvedne hrnek
 *           („Haló, tady dílna!“), Bublinka odposlouchává ze svého okénka
 *   2,2 s   Cedulka skočí z okénka 四 na knihu a listuje
 *   2,6 s   Kachlík skočí z okénka 六 na psací stroj a ťuká odkaz
 *   5,7 s   dopis s odkazem odjede od kladky po provázku ven
 *   8,3 s   Cedulka a Kachlík skočí zpátky domů; jeden kolík se pohupuje
 *
 * Totéž (bez zvonění) se spustí, když host 二 zastrčí sám. Když je
 * zavřeno, je v dílně potmě a všichni spí: 二 zvoní do prázdna, Bublinka
 * vykoukne zpoza hrnečku („Psst… všichni spí.“). Zastrčený kolík někoho
 * rozespale probudí, zívne, řekne svou větu a zase usne — a když jich je
 * na lince víc, mluví ze spaní.
 *
 * S omezeným pohybem nic nekmitá ani nelétá: kolíky se přesunou rovnou,
 * šňůry se hned ustálí, ale hrát se dá stejně.
 */
import {
  uvnitr as kresba,
  uvnitrDefs,
  kolikSvg,
  hrnekTransform,
  nitD,
  pozaTransform,
  PAPIR,
  AKTIVNI,
  ZAVAZI_ZDVIH,
  POZA_SPI,
  POZA_SCHOVANA,
  type UvnitrBody,
  type LinkaBody,
  type Poza,
} from "../../components/kontakt/kresba/uvnitr";
import { prohnuty, provazek, dopis, f, lerp, omez, hladce, type Bod } from "../../components/kontakt/kresba/zaklad";
import { repliky, uvnitrHlaseni, uvnitrZavreno } from "../../data/kontakt";
import { CISLA, POCTY, linkyParty, reci, konference, ustrednaHlaseni } from "../../data/ustredna";
import type { PostavaId } from "../../data/parta";
import * as zvuk from "../parta2/zvuk";

const SIROKA = "(min-aspect-ratio: 6/5) and (min-width: 900px)";
/** Po kterých klávesách Kachlík skáče (indexy v řadách 11 + 11 + 10 + 9) */
const SKOKY = [13, 15, 17, 26, 28, 19, 21, 30, 24, 36, 38, 18];
/** Kolik článků má šňůra kolíku */
const UZLY = 16;
const NS = "http://www.w3.org/2000/svg";
/** Pořadí, ve kterém se v polici pohupuje nápověda (kolíky blízko středu) */
const POHUP = [3, 5, 2, 6, 1, 7, 0, 8, 4];

interface Volby {
  klidne: boolean;
  jmeno: (id: string) => string;
  bublina: (klic: string, obsah: string | Node, bodPx: Bod, doba: number, trida?: string) => HTMLElement;
  smazBubliny: () => void;
  /** Čas stránky (s přepínačem ?cas= posunutý) */
  ted: () => Date;
}

type StavKoliku = "doma" | "ruka" | "let" | "zdirka";
interface Let {
  od: Bod;
  kam: Bod;
  t: number;
  doba: number;
  vyska: number;
  hotovo: () => void;
}
interface Kolik {
  i: number;
  el: SVGGElement;
  lem: SVGPathElement;
  jadro: SVGPathElement;
  zkrut: SVGPathElement;
  zavazi: SVGGElement | null;
  stav: StavKoliku;
  linka: number | null;
  /** Pata pěšáka (kde začíná šňůra), když je mimo zdířku; scéna */
  pos: Bod;
  uzly: Bod[];
  stare: Bod[];
  /** Kolik šňůry je venku z police (scéna) */
  delka: number;
  klid: number;
  let: Let | null;
  posledni: string;
}
interface Linka {
  k: number;
  b: LinkaBody;
  id: PostavaId;
  jmeno: string;
  /** Zastrčený (nebo právě letící) kolík */
  kolik: number | null;
  /** Hrneček: kyv na niti (rad), rychlost, a jak moc je u ucha (0–1) */
  theta: number;
  omega: number;
  u: number;
  uCil: number;
  poza: Poza;
  pozaCil: Poza;
  skok: number;
  skokV: number;
  zvoni: boolean;
  /** Odskočil(a) z okénka (Cedulka na knihu, Kachlík ke stroji) */
  pryc: boolean;
  spi: boolean;
  vet: number;
  budik: number | undefined;
  zmena: boolean;
  el: {
    bunka: SVGGElement | null;
    zare: SVGElement | null;
    zareNika: SVGElement | null;
    obyv: SVGGElement | null;
    poza: SVGGElement | null;
    hrnek: SVGGElement | null;
    nit: SVGPathElement | null;
    nit2: SVGPathElement | null;
  };
}
/** Běh jedné scénky — zrušením se zastaví všechny její časovače a smyčky */
interface Beh {
  zruseno: boolean;
  casovace: number[];
}

export function uvnitrScena(sekce: HTMLElement, o: Volby) {
  const svgVen = sekce.querySelector<SVGSVGElement>(".ko-venku")!;
  const svg = sekce.querySelector<SVGSVGElement>(".ko-uvnitr")!;
  const panel = sekce.querySelector<HTMLElement>(".ko-panel")!;
  const hlaseni = sekce.querySelector<HTMLElement>(".ko-hlaseni");
  const mqSiroka = matchMedia(SIROKA);
  const klidne = o.klidne;
  let body: UvnitrBody | null = null;
  let k = 1;
  let kdo: PostavaId = "kapka";
  let uvnitr = false;
  let siroka = true;
  let otevreno = true;
  let stav = "";
  /** Hlášení pod tlačítky při samotném hovoru — při nahlédnutí oknem ne */
  let hlasit = true;
  /** Host už sáhl na kolík — nápověda v polici se přestane pohupovat */
  let dotkl = false;
  /** Kamera ještě letí dovnitř a hovor čeká, až dojede */
  let ceka = false;

  /* ——— stav ústředny, který přežije překreslení: linka → kolík ——— */
  const spojeni = new Map<number, number>();
  let koliky: Kolik[] = [];
  let linky: Linka[] = [];
  let beh2: Beh | null = null;
  let behVstup: Beh | null = null;
  let porada: number | undefined;
  let poradaTik = 0;
  let poradaKdo = -1;
  let bylo9 = false;
  let hlasenaPorada = false;
  /** Volná Cedulka a Kachlík mimo okénka (jádro) — kvůli bublinám */
  const venku = { cedulka: null as null | { x: number; y: number; s: number }, kachlik: null as null | { x: number; y: number; s: number } };

  /* ——— HTML vrstva s tlačítky linek (nad kresbou, mimo aria-hidden plátno) ——— */
  const vrstvaLinek = document.createElement("div");
  vrstvaLinek.className = "ko-us-linky";
  vrstvaLinek.setAttribute("role", "group");
  vrstvaLinek.setAttribute("aria-label", "Ústředna — linky party");
  const tlacitka = CISLA.map((_, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "ko-us-linka";
    b.dataset.l = String(i);
    b.setAttribute("aria-pressed", "false");
    vrstvaLinek.append(b);
    return b;
  });
  sekce.append(vrstvaLinek);

  const naPx = (p: Bod): Bod => [p[0] * k, p[1] * k];
  const naScenu = (e: PointerEvent): Bod => {
    const r = sekce.getBoundingClientRect();
    return [(e.clientX - r.left) / k, (e.clientY - r.top) / k];
  };
  const zJadra = (p: Bod): Bod => [body!.jadro.ox + p[0] * body!.jadro.k, body!.jadro.oy + p[1] * body!.jadro.k];
  const sablona = (t: string, d: Record<string, string | number>) => t.replace(/\{(\w+)\}/g, (_, x: string) => String(d[x] ?? ""));
  const vyber = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
  const nahlasText = (t: string) => {
    if (hlaseni) hlaseni.textContent = t;
  };
  const nahlas = (i: number) => {
    if (!hlaseni || !hlasit) return;
    hlaseni.textContent = otevreno
      ? uvnitrHlaseni[i].replace("{kdo}", o.jmeno(kdo))
      : uvnitrZavreno[Math.min(i, uvnitrZavreno.length - 1)].replace("{stav}", stav.charAt(0).toUpperCase() + stav.slice(1));
  };

  /* ═══ snímková smyčka: běží, jen když se něco hýbe ═══ */
  const ulohy = new Set<(cas: number, dt: number) => boolean>();
  let bezi = false;
  let minule = 0;
  function snimek(cas: number) {
    if (!uvnitr) {
      bezi = false;
      minule = 0;
      return;
    }
    const dt = minule ? Math.min(0.05, Math.max(0.001, (cas - minule) / 1000)) : 1 / 60;
    minule = cas;
    for (const u of [...ulohy]) if (!u(cas, dt)) ulohy.delete(u);
    const hybe = fyzika(cas, dt);
    if (ulohy.size || hybe) requestAnimationFrame(snimek);
    else {
      bezi = false;
      minule = 0;
    }
  }
  const rozbehni = () => {
    if (bezi || !uvnitr) return;
    bezi = true;
    requestAnimationFrame(snimek);
  };
  const pridej = (u: (cas: number, dt: number) => boolean) => {
    ulohy.add(u);
    rozbehni();
  };
  const novyBeh = (): Beh => ({ zruseno: false, casovace: [] });
  const za = (b: Beh, ms: number, fn: () => void) => b.casovace.push(window.setTimeout(() => !b.zruseno && fn(), ms));
  const zrus = (b: Beh | null) => {
    if (!b) return;
    b.zruseno = true;
    b.casovace.forEach((c) => window.clearTimeout(c));
  };

  /* ═══ vykreslení ═══ */
  function vykresli() {
    const r = sekce.getBoundingClientRect();
    if (r.width < 10 || r.height < 10) return;
    siroka = mqSiroka.matches;
    const H = siroka ? 900 : r.height;
    const W = siroka ? (900 * r.width) / r.height : r.width;
    k = siroka ? r.height / 900 : 1;
    const p = panel.getBoundingClientRect();
    const obsazeni = linkyParty(kdo).map((id) => ({ id, jmeno: o.jmeno(id) }));
    const v = kresba({ W, H, rezim: siroka ? "siroka" : "uzka", panel: { prava: (p.right - r.left) / k, dolni: (p.bottom - r.top) / k }, kdo, otevreno, cedulka: ["zavřeno", stav], linky: obsazeni });
    body = v.body;
    const b = body;
    svg.setAttribute("viewBox", `0 0 ${f(W)} ${f(H)}`);
    svg.classList.toggle("ko-us-noc", b.zavreno);
    svg.innerHTML = `<defs>${uvnitrDefs()}<radialGradient id="ko-u-koralek"><stop offset="0" stop-color="#FFF8E4"/><stop offset="0.35" stop-color="#FFE29A" stop-opacity="0.65"/><stop offset="1" stop-color="#FFC66E" stop-opacity="0"/></radialGradient></defs>${v.svg}<g class="ko-u-dynamika"><g class="ko-u-dopis" style="display:none">${dopis()}</g></g>`;
    hodiny();

    /* kolíky a šňůry do .ko-us-dyn */
    const dyn = svg.querySelector<SVGGElement>(".ko-us-dyn")!;
    let s = "";
    b.koliky.forEach((kl) => (s += `<g class="ko-provaz ko-us-snura" data-p="${kl.i}"><path class="ko-provaz-lem"/><path class="ko-provaz-jadro"/><path class="ko-provaz-zkrut" stroke-width="${f(b.sn * 0.34)}" stroke-linecap="round"/></g>`));
    const [x0, y0, x1, y1] = b.police;
    s += `<rect class="ko-us-chyt" x="${f(x0)}" y="${f(y0)}" width="${f(x1 - x0)}" height="${f(y1 - y0)}"/>`;
    b.koliky.forEach((kl) => (s += `<g class="ko-us-kolik" data-p="${kl.i}">${kolikSvg(kl.bily)}</g>`));
    dyn.innerHTML = s;

    koliky = b.koliky.map((kl) => {
      const sn = dyn.querySelector<SVGGElement>(`.ko-us-snura[data-p="${kl.i}"]`)!;
      return {
        i: kl.i,
        el: dyn.querySelector<SVGGElement>(`.ko-us-kolik[data-p="${kl.i}"]`)!,
        lem: sn.querySelector<SVGPathElement>(".ko-provaz-lem")!,
        jadro: sn.querySelector<SVGPathElement>(".ko-provaz-jadro")!,
        zkrut: sn.querySelector<SVGPathElement>(".ko-provaz-zkrut")!,
        zavazi: svg.querySelector<SVGGElement>(`.ko-us-zavazi[data-p="${kl.i}"]`),
        stav: "doma",
        linka: null,
        pos: [...kl.dira] as Bod,
        uzly: Array.from({ length: UZLY }, () => [...kl.dira] as Bod),
        stare: Array.from({ length: UZLY }, () => [...kl.dira] as Bod),
        delka: 0,
        klid: 99,
        let: null,
        posledni: "",
      };
    });
    const q = <T extends Element>(sel: string, l: number) => svg.querySelector<T>(`${sel}[data-l="${l}"]`);
    linky = b.linky.map((lb) => {
      const spi = b.zavreno && lb.id !== "bublinka";
      const poza = b.zavreno ? (lb.id === "bublinka" ? { ...POZA_SCHOVANA } : { ...POZA_SPI }) : { rot: 0, dy: 0 };
      return {
        k: lb.k,
        b: lb,
        id: lb.id,
        jmeno: o.jmeno(lb.id),
        kolik: null,
        theta: 0,
        omega: 0,
        u: 0,
        uCil: 0,
        poza: { ...poza },
        pozaCil: { ...poza },
        skok: 0,
        skokV: 0,
        zvoni: false,
        pryc: false,
        spi,
        vet: 0,
        budik: undefined,
        zmena: true,
        el: {
          bunka: q<SVGGElement>(".ko-us-bunka", lb.k),
          zare: q<SVGElement>(".ko-us-zare", lb.k),
          zareNika: q<SVGElement>(".ko-us-zare-nika", lb.k),
          obyv: q<SVGGElement>(".ko-us-obyv", lb.k),
          poza: q<SVGGElement>(".ko-us-poza", lb.k),
          hrnek: q<SVGGElement>(".ko-us-hrnek", lb.k),
          nit: q<SVGPathElement>(".ko-us-nit", lb.k),
          nit2: q<SVGPathElement>(".ko-us-nit2", lb.k),
        },
      };
    });
    linky.forEach((l) => l.el.obyv?.classList.toggle("spi", l.spi));
    venku.cedulka = venku.kachlik = null;

    /* spojení z minula: kolík rovnou ve zdířce, šňůra ustálená, hrnek u ucha */
    spojeni.forEach((pi, li) => {
      const p = koliky[pi], l = linky[li];
      p.stav = "zdirka";
      p.linka = li;
      l.kolik = pi;
      l.u = l.uCil = 1;
      tridaLinky(l, "sviti", true);
      ustalSnuru(p);
    });

    /* tlačítka linek přes okénka */
    linky.forEach((l) => {
      const t = tlacitka[l.k];
      const [a, bb, c, d] = l.b.bunka;
      t.style.left = `${f(a * k)}px`;
      t.style.top = `${f(bb * k)}px`;
      t.style.width = `${f((c - a) * k)}px`;
      t.style.height = `${f((d - bb) * k)}px`;
      t.setAttribute("aria-label", `Linka ${l.k + 1} · ${l.jmeno}${l.k === AKTIVNI ? " · telefon dílny" : ""}`);
      t.setAttribute("aria-pressed", String(l.kolik !== null));
    });
    navazKresbu();
    koliky.forEach(vykresliKolik);
    linky.forEach(vykresliLinku);
    rozbehni();
  }

  /** Ručičky nádražních hodin podle skutečného času */
  function hodiny() {
    const h = svg.querySelector<SVGGElement>(".ko-u-hodiny");
    if (!h) return;
    const x = h.dataset.x, y = h.dataset.y;
    const ted = o.ted();
    const min = ted.getMinutes();
    h.querySelector(".ko-u-hodinova")?.setAttribute("transform", `rotate(${f(((ted.getHours() % 12) + min / 60) * 30)} ${x} ${y})`);
    h.querySelector(".ko-u-minutova")?.setAttribute("transform", `rotate(${min * 6} ${x} ${y})`);
  }

  function tridaLinky(l: Linka, t: string, ano: boolean) {
    l.el.bunka?.classList.toggle(t, ano);
    l.el.zare?.classList.toggle(t, ano);
    l.el.zareNika?.classList.toggle(t, ano);
  }
  function zvoni(l: Linka, ano: boolean) {
    l.zvoni = ano;
    tridaLinky(l, "zvoni", ano);
    svg.classList.toggle("ko-us-zvoni", linky.some((x) => x.zvoni));
    if (ano) rozbehni();
  }
  const linkaKami = (id: PostavaId) => linky.find((l) => l.id === id);

  /* ═══ fyzika: kolíky v letu, šňůry, hrnečky na niti, pózy party ═══ */
  function fyzika(cas: number, dt: number) {
    if (!body) return false;
    let hybe = tah !== null;
    for (const p of koliky) {
      if (p.let) {
        hybe = true;
        krokLetu(p, dt);
      }
      if (krokSnury(p, dt)) hybe = true;
      vykresliKolik(p);
    }
    for (const l of linky) {
      if (krokLinky(l, cas, dt)) hybe = true;
      if (l.zmena) vykresliLinku(l);
    }
    return hybe;
  }

  function krokLetu(p: Kolik, dt: number) {
    const L = p.let!;
    L.t = klidne || L.doba <= 0 ? 1 : Math.min(1, L.t + (dt * 1000) / L.doba);
    const e = hladce(L.t);
    p.pos = [lerp(L.od[0], L.kam[0], e), lerp(L.od[1], L.kam[1], e) - Math.sin(Math.PI * e) * L.vyska];
    if (L.t >= 1) {
      p.pos = [...L.kam] as Bod;
      p.let = null;
      L.hotovo();
    }
  }

  /** Kde je kolíku konec šňůry (scéna) */
  function kotva(p: Kolik): Bod {
    if (p.stav === "zdirka" && p.linka !== null) {
      const j = linky[p.linka].b.jack;
      return [j[0], j[1] + 11 * body!.m];
    }
    return p.pos;
  }
  const dira = (p: Kolik) => body!.koliky[p.i].dira;

  /** Šňůra jako řetízek článků: gravitace, tlumení a jen tahová vazba (volná šňůra se prověsí) */
  function krokSnury(p: Kolik, dt: number) {
    const A = dira(p), B = kotva(p);
    const m = body!.m;
    const vzd = Math.hypot(B[0] - A[0], B[1] - A[1]);
    const cil = p.stav === "doma" ? 0 : vzd * 1.04 + 34 * m;
    const rozdil = cil - p.delka;
    if (p.klid > 40 && Math.abs(rozdil) < 0.2 && p.stav !== "ruka" && !p.let) return false;
    p.delka = Math.abs(rozdil) < 0.3 || klidne ? cil : p.delka + rozdil * 0.28;
    if (p.delka < 1 && p.stav === "doma") {
      if (p.lem.getAttribute("d")) {
        p.lem.setAttribute("d", "");
        p.jadro.setAttribute("d", "");
        p.zkrut.setAttribute("d", "");
        p.uzly.forEach((u, i) => {
          u[0] = p.stare[i][0] = A[0];
          u[1] = p.stare[i][1] = A[1];
        });
        vykresliZavazi(p);
      }
      p.klid = 99;
      return false;
    }
    const pohyb = krokRetizku(p, A, B, dt);
    p.klid = pohyb < 0.015 && Math.abs(rozdil) < 0.3 ? p.klid + 1 : 0;
    vykresliSnuru(p);
    return p.klid <= 40;
  }
  function krokRetizku(p: Kolik, A: Bod, B: Bod, dt: number) {
    const u = p.uzly, s = p.stare, n = UZLY;
    const clanek = p.delka / (n - 1);
    const g = 1700 * body!.m * dt * dt;
    let pohyb = 0;
    for (let i = 1; i < n - 1; i++) {
      const vx = (u[i][0] - s[i][0]) * 0.965, vy = (u[i][1] - s[i][1]) * 0.965;
      s[i][0] = u[i][0];
      s[i][1] = u[i][1];
      u[i][0] += vx;
      u[i][1] += vy + g;
      pohyb = Math.max(pohyb, Math.abs(vx) + Math.abs(vy));
    }
    u[0][0] = A[0];
    u[0][1] = A[1];
    u[n - 1][0] = B[0];
    u[n - 1][1] = B[1];
    for (let it = 0; it < 18; it++) {
      for (let i = 0; i < n - 1; i++) {
        const a = u[i], b = u[i + 1];
        const dx = b[0] - a[0], dy = b[1] - a[1];
        const d = Math.hypot(dx, dy);
        if (d <= clanek || d < 1e-6) continue;
        const o2 = (d - clanek) / d;
        const wa = i === 0 ? 0 : i + 1 === n - 1 ? 1 : 0.5;
        const wb = i + 1 === n - 1 ? 0 : i === 0 ? 1 : 0.5;
        a[0] += dx * o2 * wa;
        a[1] += dy * o2 * wa;
        b[0] -= dx * o2 * wb;
        b[1] -= dy * o2 * wb;
      }
    }
    return pohyb;
  }
  /** Šňůra hned v klidu (překreslení, omezený pohyb) */
  function ustalSnuru(p: Kolik) {
    const A = dira(p), B = kotva(p);
    const vzd = Math.hypot(B[0] - A[0], B[1] - A[1]);
    p.delka = p.stav === "doma" ? 0 : vzd * 1.04 + 34 * body!.m;
    const t = prohnuty(A, B, vzd * 0.3);
    p.uzly.forEach((u, i) => {
      const [x, y] = t(i / (UZLY - 1));
      u[0] = p.stare[i][0] = x;
      u[1] = p.stare[i][1] = y;
    });
    for (let i = 0; i < 160; i++) {
      krokRetizku(p, A, B, 1 / 60);
      p.stare.forEach((s, j) => {
        s[0] = lerp(s[0], p.uzly[j][0], 0.6);
        s[1] = lerp(s[1], p.uzly[j][1], 0.6);
      });
    }
    p.klid = 99;
    vykresliSnuru(p);
  }
  function vykresliSnuru(p: Kolik) {
    const u = p.uzly, n = UZLY;
    /* Catmull-Rom přes články, ať je šňůra hladká */
    const tvar = (t: number): Bod => {
      const x = omez(t) * (n - 1);
      const i = Math.min(n - 2, Math.floor(x));
      const q = x - i;
      const p0 = u[Math.max(0, i - 1)], p1 = u[i], p2 = u[i + 1], p3 = u[Math.min(n - 1, i + 2)];
      const q2 = q * q, q3 = q2 * q;
      const c = (a: number, b: number, cc: number, d: number) => 0.5 * (2 * b + (-a + cc) * q + (2 * a - 5 * b + 4 * cc - d) * q2 + (-a + 3 * b - 3 * cc + d) * q3);
      return [c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])];
    };
    const sn = body!.sn;
    const pr = provazek(tvar, sn, sn * 0.9, 0, 56);
    p.lem.setAttribute("d", pr.lem);
    p.jadro.setAttribute("d", pr.jadro);
    p.zkrut.setAttribute("d", pr.zkrut);
    vykresliZavazi(p);
  }
  function vykresliZavazi(p: Kolik) {
    const venkuU = p.delka / body!.m;
    p.zavazi?.setAttribute("transform", `translate(0 ${f(-ZAVAZI_ZDVIH * (1 - Math.exp(-venkuU / 170)))})`);
  }
  function vykresliKolik(p: Kolik) {
    const m = body!.m;
    const ve = p.stav === "zdirka" && p.linka !== null;
    const [x, y] = ve ? linky[p.linka!].b.jack : p.pos;
    const t = `translate(${f(x)} ${f(y)}) scale(${Math.round(m * 1e4) / 1e4})`;
    const klic = t + (ve ? "z" : "");
    if (klic === p.posledni) return;
    p.posledni = klic;
    p.el.setAttribute("transform", t);
    p.el.classList.toggle("ve-zdirce", ve);
  }

  /** Hrneček na niti (kyvadlo), cesta k uchu, póza a poskoky kami */
  function krokLinky(l: Linka, cas: number, dt: number) {
    let hybe = false;
    if (l.zvoni && !klidne) {
      l.theta = 0.17 * Math.sin((cas / 1000) * Math.PI * 2 * 7.5);
      l.omega = 0;
      l.zmena = hybe = true;
    } else if (l.theta !== 0 || l.omega !== 0) {
      if (klidne) l.theta = l.omega = 0;
      else {
        const w0 = Math.PI * 2 * 1.25;
        l.omega += (-w0 * w0 * Math.sin(l.theta) - 2 * 0.13 * w0 * l.omega) * dt;
        l.theta += l.omega * dt;
        if (Math.abs(l.theta) < 0.002 && Math.abs(l.omega) < 0.02) l.theta = l.omega = 0;
      }
      l.zmena = hybe = true;
    }
    if (l.u !== l.uCil) {
      const d = dt / 0.34;
      l.u = klidne ? l.uCil : l.u < l.uCil ? Math.min(l.uCil, l.u + d) : Math.max(l.uCil, l.u - d);
      /* puštěný hrneček se na niti rozhoupe */
      if (l.u === 0 && l.uCil === 0 && !klidne) l.omega += 2.6;
      l.zmena = hybe = true;
    }
    const a = klidne ? 1 : Math.min(1, dt * 9);
    if (Math.abs(l.poza.rot - l.pozaCil.rot) > 0.01 || Math.abs(l.poza.dy - l.pozaCil.dy) > 0.01) {
      l.poza.rot += (l.pozaCil.rot - l.poza.rot) * a;
      l.poza.dy += (l.pozaCil.dy - l.poza.dy) * a;
      if (Math.abs(l.poza.rot - l.pozaCil.rot) <= 0.01) l.poza.rot = l.pozaCil.rot;
      if (Math.abs(l.poza.dy - l.pozaCil.dy) <= 0.01) l.poza.dy = l.pozaCil.dy;
      l.zmena = hybe = true;
    }
    if (l.skok < 0 || l.skokV !== 0) {
      l.skokV += 1100 * dt;
      l.skok += l.skokV * dt;
      if (l.skok >= 0) l.skok = l.skokV = 0;
      l.zmena = hybe = true;
    }
    return hybe;
  }
  function vykresliLinku(l: Linka) {
    l.zmena = false;
    const { nohy, oko, ucho, delka } = l.b;
    const dy = l.poza.dy + l.skok;
    l.el.poza?.setAttribute("transform", pozaTransform({ rot: l.poza.rot, dy }, nohy));
    /* ucho se hýbe s pózou (náklon kolem chodidel) */
    const a = (l.poza.rot * Math.PI) / 180;
    const ux = ucho[0] - nohy[0], uy = ucho[1] - nohy[1];
    const u2: Bod = [nohy[0] + ux * Math.cos(a) - uy * Math.sin(a), nohy[1] + ux * Math.sin(a) + uy * Math.cos(a) + dy];
    const hr = hrnekTransform(oko, u2, delka, l.theta, hladce(l.u));
    l.el.hrnek?.setAttribute("transform", hr.transform);
    const d = nitD(oko, hr.pata, delka);
    l.el.nit?.setAttribute("d", d);
    l.el.nit2?.setAttribute("d", d);
  }
  const poskoc = (l: Linka, vyska: number) => {
    if (klidne) return;
    l.skokV = -Math.sqrt(2 * 1100 * vyska);
    l.skok = -0.01;
    l.zmena = true;
    rozbehni();
  };

  /* ═══ řeč: bublina od hlavy (i když kami zrovna odskočil z okénka) ═══ */
  function hlava(l: Linka): Bod {
    if (l.pryc && l.id === "cedulka" && venku.cedulka && body?.cedulka) {
      const c = venku.cedulka;
      return zJadra([c.x, c.y - body.cedulka.velikost * c.s * 0.72]);
    }
    if (l.pryc && l.id === "kachlik" && venku.kachlik && body) {
      const c = venku.kachlik;
      return zJadra([c.x + body.kachlik.velikost * c.s * 0.5, c.y + body.kachlik.velikost * c.s * 0.16]);
    }
    return [l.b.hlava[0], l.b.hlava[1] + (l.poza.dy + l.skok) * body!.m];
  }
  function rekni(l: Linka, text: string, doba: number, trida = "") {
    /* na úzké obrazovce menší bubliny, co se zalomí — ať nezakryjí celou ústřednu */
    o.bublina(`l${l.k}`, text, naPx(hlava(l)), doba, siroka || trida.includes("ko-us-rec") ? trida : `${trida} ko-us-rec`);
    if (l.pryc) return;
    l.el.obyv?.classList.add("mluvi");
    window.clearTimeout(Number(l.el.obyv?.dataset.mluvi));
    if (l.el.obyv) l.el.obyv.dataset.mluvi = String(window.setTimeout(() => l.el.obyv?.classList.remove("mluvi"), Math.min(doba, 2600)));
  }
  const dalsiVeta = (l: Linka) => {
    const v = reci[l.id].vety;
    return v[l.vet++ % v.length];
  };

  /* ═══ kolíky: let, zastrčení, vytažení, návrat domů ═══ */
  function volnyKolik(l: Linka) {
    let nej: Kolik | null = null, d = Infinity;
    /* kolík kousek vpravo pod zdířkou — šňůra pak visí šikmo a nezakryje zdířky pod sebou */
    const x = l.b.jack[0] + 40 * body!.m;
    for (const p of koliky) {
      if (p.stav !== "doma") continue;
      const dd = Math.abs(dira(p)[0] - x);
      if (dd < d) {
        d = dd;
        nej = p;
      }
    }
    return nej;
  }
  /** Kolík odletí do zdířky linky; linka je rezervovaná hned, spojí se při dopadu */
  function doZdirky(p: Kolik, l: Linka, doba: number, reakce = true) {
    if (p.stav === "doma") zvuk.ton(520, 880, 0.05, "triangle", 0.05);
    const od = p.stav === "zdirka" ? kotva(p) : p.pos;
    p.stav = "let";
    l.kolik = p.i;
    tlacitka[l.k].setAttribute("aria-pressed", "true");
    const j = l.b.jack;
    const cil: Bod = [j[0], j[1] + 11 * body!.m];
    p.let = { od, kam: cil, t: 0, doba, vyska: Math.min(90, Math.hypot(cil[0] - od[0], cil[1] - od[1]) * 0.25) * (doba > 200 ? 1 : 0.2), hotovo: () => spoj(l, p, reakce) };
    rozbehni();
  }
  function spoj(l: Linka, p: Kolik, reakce: boolean) {
    p.stav = "zdirka";
    p.linka = l.k;
    p.pos = kotva(p);
    p.klid = 0;
    spojeni.set(l.k, p.i);
    tridaLinky(l, "sviti", true);
    tridaLinky(l, "cil", false);
    zvuk.cvak();
    zvuk.ton(760, 470, 0.07, "triangle", 0.08);
    if (reakce) window.setTimeout(() => uvnitr && l.kolik === p.i && odpovez(l), klidne ? 0 : 160);
    zkontrolujPoradu();
  }
  /** Linka se rozpojí: hrneček se vrátí na niť a rozhoupe se */
  function rozpoj(l: Linka) {
    const pi = l.kolik;
    l.kolik = null;
    spojeni.delete(l.k);
    tlacitka[l.k].setAttribute("aria-pressed", "false");
    tridaLinky(l, "sviti", false);
    window.clearTimeout(l.budik);
    if (l.k === AKTIVNI && beh2 && !beh2.zruseno) {
      zrus(beh2);
      vsichniDomu();
    }
    if (!(l.id === "bublinka" && beh2 && !beh2.zruseno)) l.uCil = 0;
    l.zmena = true;
    if (body?.zavreno && l.id !== "bublinka") {
      l.spi = true;
      l.pozaCil = { ...POZA_SPI };
      l.el.obyv?.classList.add("spi");
    }
    if (pi !== null) koliky[pi].linka = null;
    nahlasText(sablona(ustrednaHlaseni.zaveseno, { cislo: CISLA[l.k] }));
    zkontrolujPoradu();
    rozbehni();
  }
  function domu(p: Kolik, doba = 420) {
    const od = kotva(p);
    p.linka = null;
    p.stav = "let";
    p.let = {
      od,
      kam: [...dira(p)] as Bod,
      t: 0,
      doba,
      vyska: 26 * body!.m,
      hotovo: () => {
        p.stav = "doma";
        p.pos = [...dira(p)] as Bod;
        zvuk.drevo(1.6);
      },
    };
    rozbehni();
  }
  /** Klik, ťuk nebo klávesa na lince: volná si vezme kolík, spojená ho pustí */
  function prepni(li: number) {
    if (!uvnitr || !body) return;
    const l = linky[li];
    sahl();
    if (l.kolik !== null) {
      const p = koliky[l.kolik];
      rozpoj(l);
      domu(p);
      return;
    }
    const p = volnyKolik(l);
    if (!p) return;
    doZdirky(p, l, 520);
  }

  /* ═══ co kdo řekne, když se spojí ═══ */
  function odpovez(l: Linka) {
    if (!body) return;
    if (l.k === AKTIVNI) {
      if (!body.zavreno) return sekvence2(false);
      /* zavřeno: 二 zazvoní do prázdna a pak se rozespale ozve ten, kdo má službu */
      zvoni(l, true);
      for (let i = 0; i < 6; i++) window.setTimeout(() => zvuk.ton(1350, 1340, 0.045, "square", 0.02), i * 65);
      window.setTimeout(() => {
        zvoni(l, false);
        if (l.kolik !== null) probud(l);
      }, klidne ? 0 : 700);
      return;
    }
    if (body.zavreno) return probud(l);
    /* kdo odskočil k práci, odpoví od ní — hrneček zůstane viset v okénku */
    if (!l.pryc) l.uCil = 1;
    l.zmena = true;
    poskoc(l, 7);
    const veta = dalsiVeta(l);
    zvuk.pop();
    rekni(l, veta, Math.max(2800, veta.length * 75));
    nahlasText(sablona(ustrednaHlaseni.spojeno, { cislo: CISLA[l.k], jmeno: l.jmeno, veta }));
    rozbehni();
  }
  /** Zavřeno: kolík kami rozespale probudí, zívne, řekne svou a zase usne (hrnek nechá u ucha) */
  function probud(l: Linka) {
    const veta = vyber(reci[l.id].ospale);
    l.uCil = 1;
    l.zmena = true;
    if (l.id === "bublinka") {
      /* Bublinka nespí — vykoukne zpoza hrnečku a zůstane vzhůru */
      l.pozaCil = { rot: 0, dy: 0 };
      rekni(l, veta, 3200);
      nahlasText(sablona(ustrednaHlaseni.spojeno, { cislo: CISLA[l.k], jmeno: l.jmeno, veta }));
      rozbehni();
      return;
    }
    l.spi = false;
    l.el.obyv?.classList.remove("spi");
    l.pozaCil = { rot: -3, dy: -2 };
    poskoc(l, 4);
    zvuk.ton(430, 170, 0.8, "sine", 0.045);
    window.setTimeout(() => rekni(l, veta, 3000, "ko-us-ospale"), klidne ? 0 : 380);
    nahlasText(sablona(ustrednaHlaseni.probudil, { cislo: CISLA[l.k], jmeno: l.jmeno, veta }));
    window.clearTimeout(l.budik);
    l.budik = window.setTimeout(() => {
      if (!uvnitr) return;
      l.spi = true;
      l.pozaCil = { ...POZA_SPI };
      l.el.obyv?.classList.add("spi");
      l.zmena = true;
      rozbehni();
    }, 3600);
    rozbehni();
  }

  /* ═══ porada: tři a víc linek naráz ═══ */
  const spojene = () => linky.filter((l) => l.kolik !== null && spojeni.has(l.k));
  function zkontrolujPoradu() {
    const n = spojene().length;
    if (n >= 3 && porada === undefined) {
      porada = window.setTimeout(tikPorady, 1800);
      if (!hlasenaPorada) {
        hlasenaPorada = true;
        window.setTimeout(() => {
          const n2 = spojene().length;
          if (uvnitr && n2 >= 3) nahlasText(sablona(body?.zavreno ? ustrednaHlaseni.konferenceSpi : ustrednaHlaseni.konference, { pocet: POCTY[n2] }));
        }, 1700);
      }
    }
    if (n < 3) {
      window.clearTimeout(porada);
      porada = undefined;
      hlasenaPorada = false;
    }
    if (n === 9 && !bylo9) {
      bylo9 = true;
      window.setTimeout(vsichniNaraz, 900);
    }
    if (n < 9) bylo9 = false;
  }
  function tikPorady() {
    porada = undefined;
    const sp = spojene();
    if (!uvnitr || sp.length < 3) return;
    const dal = (ms: number) => (porada = window.setTimeout(tikPorady, ms));
    /* než doběhne hovor na 二, porada počká */
    if (beh2 && !beh2.zruseno) return dal(1500);
    poradaTik++;
    if (body?.zavreno) {
      /* zavřeno: mluví ze spaní, Bublinka je okřikuje */
      const bu = sp.find((l) => l.id === "bublinka");
      if (bu && poradaTik % 3 === 0) rekni(bu, repliky.psst, 2200, "ko-us-rec");
      else {
        const spici = sp.filter((l) => l.id !== "bublinka" && l.k !== poradaKdo);
        const l = spici.length ? vyber(spici) : vyber(sp);
        poradaKdo = l.k;
        rekni(l, reci[l.id].zeSpani, 2300, "ko-us-rec ko-us-ospale");
      }
      return dal(2300 + Math.random() * 900);
    }
    const vaz = sp.find((l) => l.id === "vazicka");
    if (vaz && poradaTik % 6 === 0) {
      rekni(vaz, konference.ticho, 2400, "ko-us-rec");
      poskoc(vaz, 9);
      zvuk.ton(980, 760, 0.12, "triangle", 0.06);
      return dal(3400);
    }
    if (sp.length >= 5 && poradaTik % 5 === 0) {
      /* všichni naráz */
      sp.forEach((l, i) =>
        window.setTimeout(() => {
          if (!uvnitr || l.kolik === null) return;
          rekni(l, vyber(reci[l.id].doReci), 1800, "ko-us-rec");
          poskoc(l, 5);
          zvuk.ton(600 + Math.random() * 700, 900 + Math.random() * 600, 0.05, "sine", 0.03);
        }, i * 70),
      );
      return dal(2800);
    }
    const ostatni = sp.filter((l) => l.k !== poradaKdo);
    const l = vyber(ostatni.length ? ostatni : sp);
    poradaKdo = l.k;
    rekni(l, vyber(reci[l.id].doReci), 1800, "ko-us-rec");
    poskoc(l, 6);
    zvuk.ton(600 + Math.random() * 700, 900 + Math.random() * 600, 0.05, "sine", 0.035);
    dal(850 + Math.random() * 650);
  }
  /** Všech devět linek: každý se zeptá „Haló?“ a pak se ozve služba */
  function vsichniNaraz() {
    if (!uvnitr || spojene().length < 9) return;
    nahlasText(ustrednaHlaseni.vsichni);
    if (body?.zavreno) return;
    window.clearTimeout(porada);
    porada = undefined;
    linky.forEach((l, i) =>
      window.setTimeout(() => {
        if (!uvnitr) return;
        rekni(l, konference.vsichni, 1500, "ko-us-rec");
        poskoc(l, 6);
        zvuk.ton(700 + i * 60, 1000 + i * 60, 0.06, "sine", 0.03);
      }, i * 130),
    );
    window.setTimeout(() => {
      if (!uvnitr) return;
      rekni(linky[AKTIVNI], konference.vsichniZaver, 3000);
      poskoc(linky[AKTIVNI], 10);
      if (spojene().length >= 3 && porada === undefined) porada = window.setTimeout(tikPorady, 4200);
    }, 9 * 130 + 1500);
  }

  /* ═══ linka 二: hovor s rezervacemi ═══ */
  /** Trasa po lince 二: od okna pod stropem ke kladce na římse */
  function trasa(u: number): Bod {
    const b = body!;
    return prohnuty(b.vstup, b.kladka, siroka ? 10 : 3)(u);
  }
  function svetelka(b: Beh) {
    const dyn = svg.querySelector<SVGGElement>(".ko-u-dynamika")!;
    for (let i = 0; i < 3; i++) {
      za(b, i * 140, () => {
        const g = document.createElementNS(NS, "g");
        g.innerHTML = `<circle r="${f(11 * Math.max(0.5, body!.m * 1.2))}" fill="url(#ko-u-koralek)"/><circle r="3" fill="#FFFDF4"/>`;
        dyn.append(g);
        let t0 = -1;
        pridej((cas) => {
          if (b.zruseno) {
            g.remove();
            return false;
          }
          if (t0 < 0) t0 = cas;
          const u = omez((cas - t0) / 800);
          const [x, y] = trasa(hladce(u));
          g.setAttribute("transform", `translate(${f(x)} ${f(y)})`);
          if (u >= 1) g.remove();
          return u < 1;
        });
      });
    }
  }
  /** Napíše na papír prvních `n` písmen textu */
  function psani(n: number) {
    let zbyva = n;
    svg.querySelectorAll<SVGTextElement>(".ko-u-radek").forEach((t) => {
      const cely = t.dataset.text ?? "";
      t.textContent = cely.slice(0, Math.max(0, zbyva));
      zbyva -= cely.length;
    });
  }
  const celkem = PAPIR.reduce((a, r) => a + r.length, 0);

  /** Hovor na 二. `auto` = při vjetí: nejdřív zvoní a kolík do zdířky skočí sám */
  function sekvence2(auto: boolean) {
    if (!body) return;
    zrus(beh2);
    vsichniDomu();
    const b = (beh2 = novyBeh());
    const L2 = linky[AKTIVNI];
    if (klidne) {
      if (auto && L2.kolik === null) {
        const p = volnyKolik(L2);
        if (p) {
          doZdirky(p, L2, 0, false);
          krokLetu(p, 0);
        }
      }
      konec2();
      rekni(L2, repliky.halo, 6000);
      const bu = linkaKami("bublinka");
      if (bu) rekni(bu, repliky.bublinka, 6000);
      zrus(b);
      napoveda();
      return;
    }
    psani(0);
    if (!auto) return zvednuto(b);
    zvoni(L2, true);
    for (let i = 0; i < 6; i++) za(b, i * 65, () => zvuk.ton(1350, 1340, 0.045, "square", 0.022));
    za(b, 520, () => {
      for (let i = 0; i < 6; i++) za(b, i * 65, () => zvuk.ton(1350, 1340, 0.045, "square", 0.022));
    });
    svetelka(b);
    za(b, 880, () => {
      zvoni(L2, false);
      if (L2.kolik !== null) return zvednuto(b);
      const p = volnyKolik(L2);
      if (!p) return;
      doZdirky(p, L2, 380, false);
      const hotovo = p.let!.hotovo;
      p.let!.hotovo = () => {
        hotovo();
        if (!b.zruseno) zvednuto(b);
      };
    });
  }
  /** 二 je spojená: služba zvedne, Bublinka odposlouchává, Cedulka listuje, Kachlík píše */
  function zvednuto(b: Beh) {
    const L2 = linky[AKTIVNI];
    L2.uCil = 1;
    L2.zmena = true;
    poskoc(L2, 6);
    /* Cedulka má službu i knihu: po „Haló“ skočí ke knize, bublina s ní neodletí */
    rekni(L2, repliky.halo, L2.id === "cedulka" ? 1250 : 4200);
    nahlas(0);
    rozbehni();
    const bu = linkaKami("bublinka");
    za(b, 800, () => {
      if (!bu) return;
      bu.uCil = 1;
      bu.zmena = true;
      if (bu.kolik === null) tridaLinky(bu, "odposlech", true);
      bu.el.obyv?.classList.add("posloucha");
      rekni(bu, repliky.bublinka, 3800);
      rozbehni();
    });
    za(b, 1300, () => {
      nahlas(1);
      cedulkaNaKnihu(b);
    });
    za(b, 1700, () => kachlikKeStroji(b));
    za(b, 4800, () => dopisVen(b));
    za(b, 5800, () => {
      if (!bu) return;
      tridaLinky(bu, "odposlech", false);
      bu.el.obyv?.classList.remove("posloucha");
      if (bu.kolik === null) bu.uCil = 0;
      bu.zmena = true;
      rozbehni();
    });
    za(b, 6700, () => nahlas(2));
    za(b, 7300, () => {
      cedulkaDomu(b);
      kachlikDomu(b);
    });
    za(b, 8400, () => {
      zrus(b);
      napoveda();
      zkontrolujPoradu();
    });
  }
  /** Konečný stav hovoru na 二 bez pohybu (omezený pohyb, nebo překreslení uprostřed) */
  function konec2(hlasit2 = true) {
    psani(celkem);
    const L2 = linky[AKTIVNI];
    if (L2.kolik !== null) L2.u = L2.uCil = 1;
    L2.zmena = true;
    vsichniDomu();
    if (hlasit2) nahlas(2);
    rozbehni();
  }

  function cink() {
    const c = svg.querySelector(".ko-u-cink");
    c?.classList.add("ted");
    window.setTimeout(() => c?.classList.remove("ted"), 650);
    zvuk.cink();
  }

  /* ——— Cedulka: z okénka 四 na knihu a zpátky ——— */
  function cedulkaNaKnihu(b: Beh) {
    const L = linkaKami("cedulka");
    const ced = svg.querySelector<SVGGElement>(".ko-u-cedulka");
    const bb = body!;
    if (!L || !ced || !bb.cedulka || !bb.kniha || L.pryc) return;
    const v = bb.cedulka.velikost;
    const [hx, hy] = bb.cedulka.hak;
    const kn = bb.kniha;
    const doma = cedulkaDoma(L);
    const listy = [...svg.querySelectorAll<SVGPathElement>(".ko-u-list")];
    L.pryc = true;
    if (L.el.poza) L.el.poza.style.visibility = "hidden";
    ced.style.display = "";
    let t0 = -1;
    zvuk.ton(500, 900, 0.12, "sine", 0.04);
    pridej((cas) => {
      if (b.zruseno) return false;
      if (t0 < 0) t0 = cas;
      const s = (cas - t0) / 1000;
      if (s < 0.55) {
        /* skok po oblouku z okénka na hřbet knihy */
        const e = hladce(s / 0.55);
        const x = lerp(doma.x, hx, e), y = lerp(doma.y, hy, e) - Math.sin(Math.PI * e) * 120;
        const sk = lerp(doma.s, 1, e);
        venku.cedulka = { x, y, s: sk };
        ced.setAttribute("transform", `translate(${f(x)} ${f(y)}) rotate(${f(-20 * Math.sin(Math.PI * e))}) scale(${f(sk * 1000) / 1000})`);
        return true;
      }
      const z = s - 0.55;
      if (z < 0.05) {
        zvuk.papir();
        window.setTimeout(() => !b.zruseno && zvuk.papir(), 520);
      }
      venku.cedulka = { x: hx, y: hy, s: 1 };
      ced.setAttribute("transform", `translate(${f(hx)} ${f(hy)}) rotate(${f(16 * Math.sin(z * 4.6) * Math.exp(-z / 2.4))})`);
      listy.forEach((l, i) => {
        const p = omez((z - i * 0.52) / 0.75);
        l.setAttribute("d", p > 0 && p < 1 ? list(kn, Math.PI * hladce(p)) : "");
      });
      return z < 4.5;
    });
  }
  /** Kde má Cedulka v okénku nohy (jádro) a jak je tam malá */
  function cedulkaDoma(L: Linka) {
    const us = body!.us;
    return { x: us.ox + L.b.nohy[0] * us.m, y: us.oy + L.b.nohy[1] * us.m, s: L.b.kamiJ.v / body!.cedulka!.velikost };
  }
  function cedulkaDomu(b: Beh) {
    const L = linkaKami("cedulka");
    const ced = svg.querySelector<SVGGElement>(".ko-u-cedulka");
    if (!L || !ced || !L.pryc || !body?.cedulka) return;
    const doma = cedulkaDoma(L);
    const [hx, hy] = body.cedulka.hak;
    let t0 = -1;
    pridej((cas) => {
      if (b.zruseno) return false;
      if (t0 < 0) t0 = cas;
      const e = hladce((cas - t0) / 600);
      const x = lerp(hx, doma.x, e), y = lerp(hy, doma.y, e) - Math.sin(Math.PI * e) * 120;
      const sk = lerp(1, doma.s, e);
      venku.cedulka = { x, y, s: sk };
      ced.setAttribute("transform", `translate(${f(x)} ${f(y)}) rotate(${f(20 * Math.sin(Math.PI * e))}) scale(${f(sk * 1000) / 1000})`);
      if (e >= 1) {
        cedulkaJeDoma(L);
        return false;
      }
      return true;
    });
  }
  function cedulkaJeDoma(L: Linka) {
    const ced = svg.querySelector<SVGGElement>(".ko-u-cedulka");
    if (ced) ced.style.display = "none";
    svg.querySelectorAll(".ko-u-list").forEach((x) => x.setAttribute("d", ""));
    L.pryc = false;
    venku.cedulka = null;
    if (L.el.poza) L.el.poza.style.visibility = "";
    if (L.kolik !== null) L.uCil = 1;
    L.zmena = true;
    poskoc(L, 4);
  }

  /* ——— Kachlík: z okénka 六 po klávesách psacího stroje a zpátky ——— */
  function kachlikKeStroji(b: Beh) {
    const L = linkaKami("kachlik");
    const kach = svg.querySelector<SVGGElement>(".ko-u-kachlik");
    const bb = body!;
    if (!L || !kach || L.pryc) return;
    const v = bb.kachlik.velikost;
    const doma = { x: L.b.kamiJ.x, y: L.b.kamiJ.y, s: L.b.kamiJ.v / v };
    const klavesy = svg.querySelectorAll<SVGGElement>(".ko-u-klavesa");
    const naKlavesu = (i: number) => {
      const [x, y] = bb.klavesy[Math.min(i, bb.klavesy.length - 1)];
      return { x: x - v * 0.5, y: y - v * 0.9, s: 1 };
    };
    L.pryc = true;
    if (L.el.poza) L.el.poza.style.visibility = "hidden";
    kach.style.display = "";
    const zaSkok = Math.ceil(celkem / SKOKY.length);
    const radek4 = PAPIR.slice(0, 4).reduce((a, r) => a + r.length, 0);
    let napsano = 0;
    let t0 = -1;
    const PRVNI = 560, DOBA = 230;
    pridej((cas) => {
      if (b.zruseno) return false;
      if (t0 < 0) t0 = cas;
      const ms = cas - t0;
      const i = ms < PRVNI ? 0 : 1 + Math.floor((ms - PRVNI) / DOBA);
      if (i >= SKOKY.length) {
        const kon = naKlavesu(SKOKY[SKOKY.length - 1]);
        venku.kachlik = kon;
        kach.setAttribute("transform", `translate(${f(kon.x)} ${f(kon.y)})`);
        return false;
      }
      const u = i === 0 ? ms / PRVNI : (ms - PRVNI - (i - 1) * DOBA) / DOBA;
      const od = i === 0 ? doma : naKlavesu(SKOKY[i - 1]);
      const kam = naKlavesu(SKOKY[i]);
      const x = lerp(od.x, kam.x, u);
      const y = lerp(od.y, kam.y, u) - Math.sin(u * Math.PI) * v * (i === 0 ? 1.1 : 0.42);
      const sk = lerp(od.s, kam.s, u);
      const zmackni = u > 0.85 ? 1 - (u - 0.85) * 4 : 0;
      venku.kachlik = { x, y, s: sk };
      kach.setAttribute("transform", `translate(${f(x)} ${f(y + zmackni * v * 0.05)}) scale(${f(sk * 1000) / 1000} ${f(sk * (1 - zmackni * 0.06) * 1000) / 1000})`);
      /* dopad: klávesa dolů, písmena na papír */
      if (u > 0.9 && napsano < Math.min(celkem, (i + 1) * zaSkok)) {
        const klavesa = klavesy[SKOKY[i]];
        klavesa?.classList.add("dole");
        window.setTimeout(() => klavesa?.classList.remove("dole"), 110);
        zvuk.klapky(1);
        const pred = napsano;
        napsano = Math.min(celkem, (i + 1) * zaSkok);
        psani(napsano);
        if ((pred < radek4 && napsano >= radek4) || napsano === celkem) cink();
      }
      return true;
    });
  }
  function kachlikDomu(b: Beh) {
    const L = linkaKami("kachlik");
    const kach = svg.querySelector<SVGGElement>(".ko-u-kachlik");
    if (!L || !kach || !L.pryc || !venku.kachlik || !body) return;
    const od = { ...venku.kachlik };
    const v = body.kachlik.velikost;
    const doma = { x: L.b.kamiJ.x, y: L.b.kamiJ.y, s: L.b.kamiJ.v / v };
    let t0 = -1;
    pridej((cas) => {
      if (b.zruseno) return false;
      if (t0 < 0) t0 = cas;
      const e = hladce((cas - t0) / 620);
      const x = lerp(od.x, doma.x, e), y = lerp(od.y, doma.y, e) - Math.sin(Math.PI * e) * v * 1.1;
      const sk = lerp(od.s, doma.s, e);
      venku.kachlik = { x, y, s: sk };
      kach.setAttribute("transform", `translate(${f(x)} ${f(y)}) scale(${f(sk * 1000) / 1000})`);
      if (e >= 1) {
        kachlikJeDoma(L);
        return false;
      }
      return true;
    });
  }
  function kachlikJeDoma(L: Linka) {
    const kach = svg.querySelector<SVGGElement>(".ko-u-kachlik");
    if (kach) kach.style.display = "none";
    L.pryc = false;
    venku.kachlik = null;
    if (L.el.poza) L.el.poza.style.visibility = "";
    if (L.kolik !== null) L.uCil = 1;
    L.zmena = true;
    poskoc(L, 4);
  }
  /** Cedulka a Kachlík hned zpátky v okénkách, Bublinka přestane odposlouchávat */
  function vsichniDomu() {
    const c = linkaKami("cedulka"), ka = linkaKami("kachlik"), bu = linkaKami("bublinka");
    if (c?.pryc) cedulkaJeDoma(c);
    if (ka?.pryc) kachlikJeDoma(ka);
    if (bu) {
      tridaLinky(bu, "odposlech", false);
      bu.el.obyv?.classList.remove("posloucha");
      if (bu.kolik === null && !body?.zavreno) {
        bu.uCil = 0;
        bu.zmena = true;
      }
    }
    svg.querySelectorAll(".ko-u-list").forEach((x) => x.setAttribute("d", ""));
  }

  /** Dopis s odkazem odjede od kladky po provázku ven */
  function dopisVen(b: Beh) {
    const g = svg.querySelector<SVGGElement>(".ko-u-dopis");
    if (!g || !body) return;
    g.style.display = "";
    zvuk.uzel();
    let t0 = -1;
    const m = Math.max(0.55, (body.w0 / 5.6) * 1.05);
    pridej((cas) => {
      if (b.zruseno) {
        g.style.display = "none";
        return false;
      }
      if (t0 < 0) t0 = cas;
      const u = omez((cas - t0) / 1900);
      const [x, y] = trasa(1 - hladce(u));
      const objev = omez(u * 6);
      g.setAttribute("transform", `translate(${f(x)} ${f(y)}) scale(${f(m * objev * (1 - u * 0.45) * 1000) / 1000})`);
      if (u >= 1) g.style.display = "none";
      return u < 1;
    });
  }

  /* ═══ zavřeno: 二 zvoní do prázdna, Bublinka vykoukne zpoza hrnečku ═══ */
  function sekvenceZavreno() {
    if (!body) return;
    const b = (behVstup = novyBeh());
    const L2 = linky[AKTIVNI];
    const bu = linkaKami("bublinka");
    psani(0);
    if (klidne) {
      if (bu) {
        bu.pozaCil = { rot: 0, dy: 0 };
        bu.zmena = true;
        bu.poza = { rot: 0, dy: 0 };
        rekni(bu, repliky.psst, 6000);
      }
      nahlas(1);
      rozbehni();
      napoveda();
      return;
    }
    zvoni(L2, true);
    /* tři zazvonění do prázdna */
    for (let z = 0; z < 3; z++) for (let i = 0; i < 6; i++) za(b, z * 1300 + i * 65, () => zvuk.ton(1350, 1340, 0.045, "square", 0.02));
    svetelka(b);
    za(b, 1200, () => {
      if (!bu) return;
      bu.pozaCil = { rot: 0, dy: 0 };
      bu.zmena = true;
      rozbehni();
      za(b, 420, () => rekni(bu, repliky.psst, 3400));
    });
    za(b, 1500, () => nahlas(0));
    za(b, 3900, () => {
      zvoni(L2, false);
      nahlas(1);
      const psat = sekce.querySelector<HTMLElement>(".ko-psat");
      psat?.classList.add("ko-pozor");
      window.setTimeout(() => psat?.classList.remove("ko-pozor"), 2400);
      napoveda();
    });
  }

  /* ═══ nápověda bez slov: jeden kolík v polici se pohupuje, dokud na ně host nesáhne ═══ */
  function napoveda() {
    if (dotkl || !uvnitr) return;
    zrusPohup();
    const p = POHUP.map((i) => koliky[i]).find((x) => x && x.stav === "doma");
    p?.el.classList.add("ko-us-pohup");
  }
  const zrusPohup = () => svg.querySelectorAll(".ko-us-pohup").forEach((x) => x.classList.remove("ko-us-pohup"));
  const sahl = () => {
    dotkl = true;
    /* host hraje sám — i při nahlédnutí oknem mu hlášení říkají, co se děje */
    hlasit = true;
    zrusPohup();
  };

  /* ═══ tah kolíku myší i prstem ═══ */
  let tah: { p: Kolik; el: Element; id: number; start: Bod; cil: Linka | null; pohnul: boolean } | null = null;
  /** Stisk na spojené lince — z něj se stane tah, jakmile se prst pohne */
  let stisk: { l: Linka; x: number; y: number; id: number } | null = null;
  let zrusKlik = false;

  function cilTahu(bod: Bod): Linka | null {
    const m = body!.m;
    let nej: Linka | null = null, d = Infinity;
    for (const l of linky) {
      if (l.kolik !== null) continue;
      const [a, b, c, e] = l.b.bunka;
      const uvnitrBunky = bod[0] >= a && bod[0] <= c && bod[1] >= b && bod[1] <= e;
      const dd = Math.hypot(bod[0] - l.b.jack[0], bod[1] - l.b.jack[1]);
      if ((uvnitrBunky || dd < 34 * m) && dd < d) {
        d = dd;
        nej = l;
      }
    }
    return nej;
  }
  function zacniTah(p: Kolik, el: Element, e: PointerEvent) {
    sahl();
    if (p.stav === "zdirka" && p.linka !== null) {
      const pos = kotva(p);
      rozpoj(linky[p.linka]);
      p.pos = pos;
      zvuk.ton(620, 1000, 0.05, "triangle", 0.05);
    } else if (p.stav === "doma") zvuk.ton(520, 880, 0.05, "triangle", 0.05);
    p.let = null;
    p.stav = "ruka";
    p.klid = 0;
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* jsdom a staré prohlížeče */
    }
    tah = { p, el, id: e.pointerId, start: naScenu(e), cil: null, pohnul: false };
    sekce.classList.add("ko-us-tahne");
    tahni(e);
    rozbehni();
  }
  function tahni(e: PointerEvent) {
    if (!tah || !body || e.pointerId !== tah.id) return;
    const bod = naScenu(e);
    if (Math.hypot(bod[0] - tah.start[0], bod[1] - tah.start[1]) > 6 / k) tah.pohnul = true;
    tah.p.pos = [bod[0], bod[1] + 16 * body.m];
    const cil = cilTahu(bod);
    if (cil !== tah.cil) {
      if (tah.cil) tridaLinky(tah.cil, "cil", false);
      if (cil) tridaLinky(cil, "cil", true);
      tah.cil = cil;
    }
    tah.p.klid = 0;
    rozbehni();
  }
  function pust(e: PointerEvent) {
    if (!tah || e.pointerId !== tah.id) return;
    const { p, cil } = tah;
    tah = null;
    sekce.classList.remove("ko-us-tahne");
    if (cil) {
      tridaLinky(cil, "cil", false);
      doZdirky(p, cil, 110);
    } else domu(p, 380);
  }
  function zrusTah() {
    if (!tah) return;
    if (tah.cil) tridaLinky(tah.cil, "cil", false);
    tah = null;
    sekce.classList.remove("ko-us-tahne");
  }

  /** Posluchače na kresbě (po každém vykreslení znovu): police a kolíky v ní */
  function navazKresbu() {
    const chyt = (e: PointerEvent, el: Element, pevny?: Kolik) => {
      if (!body || tah || (e.pointerType === "mouse" && e.button !== 0)) return;
      const bod = naScenu(e);
      let p = pevny && pevny.stav === "doma" ? pevny : null;
      if (!p) {
        let d = Infinity;
        for (const x of koliky) {
          if (x.stav !== "doma") continue;
          const dd = Math.abs(dira(x)[0] - bod[0]);
          if (dd < d) {
            d = dd;
            p = x;
          }
        }
      }
      if (!p) return;
      e.preventDefault();
      zacniTah(p, el, e);
    };
    const pripoj = (el: Element, pevny?: Kolik) => {
      /* prst na kolíku nescrolluje stránku (touch-action na SVG nejde všude) */
      el.addEventListener("touchstart", (e) => e.cancelable && e.preventDefault(), { passive: false });
      el.addEventListener("pointerdown", (e) => chyt(e as PointerEvent, el, pevny));
      el.addEventListener("pointermove", (e) => tahni(e as PointerEvent));
      el.addEventListener("pointerup", (e) => pust(e as PointerEvent));
      el.addEventListener("pointercancel", (e) => pust(e as PointerEvent));
    };
    const police = svg.querySelector(".ko-us-chyt");
    if (police) pripoj(police);
    koliky.forEach((p) => pripoj(p.el, p));
  }

  /* tlačítka linek: klik/ťuk/Enter přepne, tah ze spojené linky vytáhne kolík */
  tlacitka.forEach((t, i) => {
    t.addEventListener("click", () => {
      if (zrusKlik) {
        zrusKlik = false;
        return;
      }
      prepni(i);
    });
    t.addEventListener("pointerdown", (e) => {
      zrusKlik = false;
      const l = linky[i];
      if (!l || l.kolik === null || e.button > 0) return;
      stisk = { l, x: e.clientX, y: e.clientY, id: e.pointerId };
    });
    t.addEventListener("pointermove", (e) => {
      if (tah && tah.el === t) return tahni(e);
      if (!stisk || stisk.id !== e.pointerId || Math.hypot(e.clientX - stisk.x, e.clientY - stisk.y) < 7) return;
      const l = stisk.l;
      stisk = null;
      if (l.kolik === null) return;
      const p = koliky[l.kolik];
      if (p.stav !== "zdirka") return;
      zrusKlik = true;
      zacniTah(p, t, e);
    });
    const konec = (e: PointerEvent) => {
      stisk = null;
      if (tah && tah.el === t) pust(e);
    };
    t.addEventListener("pointerup", konec);
    t.addEventListener("pointercancel", konec);
    t.addEventListener("pointerenter", () => {
      const l = linky[i];
      if (l && l.kolik === null && !tah) tridaLinky(l, "cil", true);
    });
    t.addEventListener("pointerleave", () => {
      const l = linky[i];
      if (l && (!tah || tah.cil !== l)) tridaLinky(l, "cil", false);
    });
    t.addEventListener("focus", () => {
      const l = linky[i];
      if (l && l.kolik === null) tridaLinky(l, "cil", true);
    });
    t.addEventListener("blur", () => {
      const l = linky[i];
      if (l) tridaLinky(l, "cil", false);
    });
  });
  /* klávesy 1–9 přepnou linku, když je kamera uvnitř */
  document.addEventListener("keydown", (e) => {
    if (!uvnitr || e.ctrlKey || e.metaKey || e.altKey || document.querySelector("dialog[open]")) return;
    const cil = e.target as HTMLElement | null;
    if (cil && (cil.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(cil.tagName))) return;
    const n = Number(e.key);
    if (!Number.isInteger(n) || n < 1 || n > 9) return;
    e.preventDefault();
    prepni(n - 1);
  });

  /** Zastaví všechno, co běží (scénky, poradu, tah, budíky) */
  function zrusVse() {
    ceka = false;
    zrus(beh2);
    zrus(behVstup);
    beh2 = behVstup = null;
    window.clearTimeout(porada);
    porada = undefined;
    zrusTah();
    stisk = null;
    ulohy.clear();
    linky.forEach((l) => window.clearTimeout(l.budik));
    svg.classList.remove("ko-us-zvoni");
  }

  /* ═══ průlet dovnitř a zpátky ven ═══ */
  function dovnitr(kdoNovy: PostavaId, ohniskoPx: Bod, hotovo: () => void, jeOtevreno = true, stavText = "", hovor = true) {
    if (uvnitr) return;
    kdo = kdoNovy;
    otevreno = jeOtevreno;
    stav = stavText;
    hlasit = hovor;
    spojeni.clear();
    hlasenaPorada = bylo9 = false;
    poradaTik = 0;
    /* panel se přepne dřív, než se změří — uvnitř má jiné řádky (zpátky ven, hlášení) */
    sekce.dataset.zastavka = "uvnitr";
    uvnitr = true;
    vykresli();
    svg.style.visibility = "visible";
    svgVen.style.transformOrigin = `${f(ohniskoPx[0])}px ${f(ohniskoPx[1])}px`;
    const rychle = klidne ? 1 : 0;
    svgVen.animate([{ transform: "scale(1)", opacity: 1 }, { transform: "scale(4.2)", opacity: 0 }], {
      duration: rychle || 950,
      easing: "cubic-bezier(.55,0,.8,.2)",
      fill: "forwards",
    });
    svg.animate([{ transform: "scale(1.14)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }], {
      duration: rychle || 820,
      delay: klidne ? 0 : 480,
      easing: "cubic-bezier(.2,.7,.3,1)",
      fill: "forwards",
    });
    sekce.querySelector<HTMLElement>(".ko-zavesit")?.focus({ preventScroll: true });
    const b = (behVstup = novyBeh());
    ceka = true;
    za(b, klidne ? 0 : 1250, () => {
      ceka = false;
      svgVen.style.visibility = "hidden";
      hotovo();
      if (!body) return;
      if (body.zavreno) sekvenceZavreno();
      else sekvence2(true);
    });
  }

  function ven(hotovo: () => void) {
    if (!uvnitr) return;
    zrusVse();
    o.smazBubliny();
    if (hlaseni) hlaseni.textContent = "";
    uvnitr = false;
    spojeni.clear();
    svgVen.style.visibility = "visible";
    svg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: klidne ? 1 : 450, fill: "forwards" });
    svgVen.animate([{ transform: "scale(4.2)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }], {
      duration: klidne ? 1 : 900,
      delay: klidne ? 0 : 150,
      easing: "cubic-bezier(.2,.75,.3,1)",
      fill: "forwards",
    });
    sekce.dataset.zastavka = "venku";
    window.setTimeout(() => {
      if (!uvnitr) svg.style.visibility = "hidden";
      hotovo();
    }, klidne ? 0 : 1060);
  }

  /** Okno se změnilo, když je kamera uvnitř — překreslit a ukázat hotový stav; spojení zůstanou */
  function prekresli() {
    if (!uvnitr) return;
    /* ještě letí kamera: jen překreslit, hovor se spustí, až dojede */
    const hovor2 = beh2 !== null;
    if (ceka) {
      zrusTah();
      vykresli();
      return;
    }
    zrusVse();
    /* kolíky v letu doletí rovnou */
    koliky.forEach((p) => {
      if (p.stav === "let" && p.linka !== null) spojeni.set(p.linka, p.i);
    });
    vykresli();
    if (!body) return;
    if (!body.zavreno && (hovor2 || spojeni.has(AKTIVNI))) konec2(false);
    else if (body.zavreno) {
      const bu = linkaKami("bublinka");
      if (bu) {
        bu.poza = { rot: 0, dy: 0 };
        bu.pozaCil = { rot: 0, dy: 0 };
        bu.zmena = true;
      }
    }
    napoveda();
    zkontrolujPoradu();
  }

  return { dovnitr, ven, prekresli };
}

/** List knihy v letu: θ = 0 leží vpravo, θ = π vlevo (souřadnice jádra) */
function list(kn: { hrbet: Bod; sirka: number; zdvih: number }, theta: number) {
  const [sx, sy] = kn.hrbet;
  const nahore = sy - 24, dole = sy + 22;
  const x = sx + Math.cos(theta) * kn.sirka;
  const zdvih = Math.sin(theta) * kn.zdvih;
  const prohyb = zdvih * 0.3;
  return `M${f(sx)} ${f(nahore)} Q${f((sx + x) / 2)} ${f(nahore - zdvih * 0.5 - prohyb)} ${f(x)} ${f(nahore - zdvih)} L${f(x)} ${f(dole - zdvih * 0.55)} Q${f((sx + x) / 2)} ${f(dole - zdvih * 0.3 - prohyb)} ${f(sx)} ${f(dole)} Z`;
}
