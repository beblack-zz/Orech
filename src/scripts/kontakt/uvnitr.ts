/**
 * Kontakt uvnitř: kamera vjede po provázku oknem do dílny k ústředně
 * (components/kontakt/kresba/uvnitr.ts) a odehraje se, co se stane, když
 * zavoláš:
 *
 *   0,0 s   linka 二 zvoní, kontrolka bliká, po provázku přiběhnou světélka
 *   0,9 s   ten, kdo má službu, zvedne hrnek („Haló, tady dílna!“),
 *           ucho k němu přitiskne i Bublinka
 *   2,2 s   Cedulka se rozhoupe a obrací listy knihy rezervací
 *   2,6 s   Kachlík skáče po klávesách a odkaz se píše po písmenech,
 *           na konci řádku cinkne zvonek
 *   5,6 s   dopis s odkazem odjede po provázku zpátky ven
 *
 * Když je zavřeno, je v dílně potmě: linka 二 zvoní do prázdna, z hroudy
 * vykoukne Bublinka („Psst… všichni spí.“) a na ústředně visí cedulka
 * s příští otevírací dobou.
 *
 * Kreslí se v souřadnicích jádra kresby (Cedulka, Kachlík, klávesy, listy)
 * a scény (světélka, dopis). S omezeným pohybem je hned vidět konec.
 */
import { uvnitr as kresba, UVNITR_DEFS, PAPIR, type UvnitrBody } from "../../components/kontakt/kresba/uvnitr";
import { prohnuty, dopis, f, lerp, omez, hladce, type Bod } from "../../components/kontakt/kresba/zaklad";
import { repliky, uvnitrHlaseni, uvnitrZavreno } from "../../data/kontakt";
import type { PostavaId } from "../../data/parta";
import * as zvuk from "../parta2/zvuk";

const SIROKA = "(min-aspect-ratio: 6/5) and (min-width: 900px)";
/** Po kterých klávesách Kachlík skáče (indexy v řadách 11 + 11 + 10 + 9) */
const SKOKY = [13, 15, 17, 26, 28, 19, 21, 30, 24, 36, 38, 18];

interface Volby {
  klidne: boolean;
  jmeno: (id: string) => string;
  bublina: (klic: string, obsah: string | Node, bodPx: Bod, doba: number, trida?: string) => HTMLElement;
  smazBubliny: () => void;
  /** Čas stránky (s přepínačem ?cas= posunutý) */
  ted: () => Date;
}

export function uvnitrScena(sekce: HTMLElement, o: Volby) {
  const svgVen = sekce.querySelector<SVGSVGElement>(".ko-venku")!;
  const svg = sekce.querySelector<SVGSVGElement>(".ko-uvnitr")!;
  const panel = sekce.querySelector<HTMLElement>(".ko-panel")!;
  const hlaseni = sekce.querySelector<HTMLElement>(".ko-hlaseni");
  const mqSiroka = matchMedia(SIROKA);
  let body: UvnitrBody | null = null;
  let k = 1;
  let kdo: PostavaId = "kapka";
  let uvnitr = false;
  let zrusit: (() => void) | null = null;
  let siroka = true;
  let otevreno = true;
  let stav = "";
  /** Hlášení pod tlačítky jen při hovoru — při nahlédnutí oknem ne */
  let hlasit = true;

  const naPx = (p: Bod): Bod => [p[0] * k, p[1] * k];
  const nahlas = (i: number) => {
    if (!hlaseni || !hlasit) return;
    hlaseni.textContent = otevreno
      ? uvnitrHlaseni[i].replace("{kdo}", o.jmeno(kdo))
      : uvnitrZavreno[Math.min(i, uvnitrZavreno.length - 1)].replace("{stav}", stav.charAt(0).toUpperCase() + stav.slice(1));
  };

  function vykresli() {
    const r = sekce.getBoundingClientRect();
    if (r.width < 10 || r.height < 10) return;
    siroka = mqSiroka.matches;
    const H = siroka ? 900 : r.height;
    const W = siroka ? (900 * r.width) / r.height : r.width;
    k = siroka ? r.height / 900 : 1;
    const p = panel.getBoundingClientRect();
    const v = kresba({ W, H, rezim: siroka ? "siroka" : "uzka", panel: { prava: (p.right - r.left) / k, dolni: (p.bottom - r.top) / k }, kdo, otevreno, cedulka: ["zavřeno", stav] });
    body = v.body;
    svg.setAttribute("viewBox", `0 0 ${f(W)} ${f(H)}`);
    svg.innerHTML = `<defs>${UVNITR_DEFS}<radialGradient id="ko-u-koralek"><stop offset="0" stop-color="#FFF8E4"/><stop offset="0.35" stop-color="#FFE29A" stop-opacity="0.65"/><stop offset="1" stop-color="#FFC66E" stop-opacity="0"/></radialGradient></defs>${v.svg}<g class="ko-u-dynamika"><g class="ko-u-dopis" style="display:none">${dopis()}</g></g>`;
    hodiny();
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

  /* ——— trasa po aktivní lince: pod stropem ke kladce a dolů k hrnku ——— */
  function trasa(u: number): Bod {
    const b = body!;
    const s1 = prohnuty(b.vstup, b.kladka, siroka ? 10 : 4);
    const s2 = prohnuty(b.kladka, b.pata, siroka ? 6 : 4);
    const d1 = Math.hypot(b.kladka[0] - b.vstup[0], b.kladka[1] - b.vstup[1]);
    const d2 = Math.hypot(b.pata[0] - b.kladka[0], b.pata[1] - b.kladka[1]);
    const zlom = d1 / (d1 + d2);
    return u < zlom ? s1(u / zlom) : s2((u - zlom) / (1 - zlom));
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

  /** Konečný stav bez pohybu (omezený pohyb, nebo překreslení uprostřed) */
  function konec() {
    svg.classList.remove("ko-zvoni");
    if (!otevreno) {
      psani(0);
      nahlas(1);
      return;
    }
    psani(celkem);
    svg.classList.add("ko-hovor");
    nahlas(2);
  }

  /* ——— řetěz u ústředny ——— */
  function hraj() {
    if (!body) return;
    const b = body;
    if (b.zavreno) return hrajZavreno(b);
    if (o.klidne) {
      konec();
      o.bublina("kdo", repliky.halo, naPx(b.hlavaKdo), 6000);
      o.bublina("bublinka", repliky.bublinka, naPx(b.hlavaBublinka), 6000);
      return;
    }
    const casovace: number[] = [];
    let zruseno = false;
    const za = (ms: number, fn: () => void) => casovace.push(window.setTimeout(() => !zruseno && fn(), ms));
    const smycky: ((cas: number) => boolean)[] = [];
    const smycka = (fn: (cas: number) => boolean) => {
      smycky.push(fn);
      if (smycky.length === 1) requestAnimationFrame(krok);
    };
    function krok(cas: number) {
      if (zruseno) return;
      for (let i = smycky.length - 1; i >= 0; i--) if (!smycky[i](cas)) smycky.splice(i, 1);
      if (smycky.length) requestAnimationFrame(krok);
    }
    zrusit = () => {
      zruseno = true;
      casovace.forEach((c) => window.clearTimeout(c));
      svg.classList.remove("ko-zvoni", "ko-hovor");
    };

    psani(0);
    svg.classList.add("ko-zvoni");
    for (let i = 0; i < 6; i++) za(i * 65, () => zvuk.ton(1350, 1340, 0.045, "square", 0.022));
    /* světélka přiběhnou po lince */
    const dyn = svg.querySelector<SVGGElement>(".ko-u-dynamika")!;
    for (let i = 0; i < 3; i++) {
      za(i * 140, () => {
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.innerHTML = `<circle r="11" fill="url(#ko-u-koralek)"/><circle r="3" fill="#FFFDF4"/>`;
        dyn.append(g);
        let t0 = -1;
        smycka((cas) => {
          if (t0 < 0) t0 = cas;
          const u = omez((cas - t0) / 800);
          const [x, y] = trasa(hladce(u));
          g.setAttribute("transform", `translate(${f(x)} ${f(y)})`);
          if (u >= 1) g.remove();
          return u < 1;
        });
      });
    }

    za(900, () => {
      svg.classList.remove("ko-zvoni");
      svg.classList.add("ko-hovor");
      zvuk.cvak();
      o.bublina("kdo", repliky.halo, naPx(b.hlavaKdo), 4200);
      nahlas(0);
    });
    za(1700, () => o.bublina("bublinka", repliky.bublinka, naPx(b.hlavaBublinka), 3800));

    /* Cedulka se rozhoupe a obrací listy */
    za(2200, () => {
      nahlas(1);
      const ced = svg.querySelector<SVGGElement>(".ko-u-cedulka");
      const listy = [...svg.querySelectorAll<SVGPathElement>(".ko-u-list")];
      if (!b.cedulka || !ced || !b.kniha) return;
      const [hx, hy] = b.cedulka.hak;
      const kn = b.kniha;
      let t0 = -1;
      zvuk.papir();
      za(520, () => zvuk.papir());
      smycka((cas) => {
        if (t0 < 0) t0 = cas;
        const s = (cas - t0) / 1000;
        ced.setAttribute("transform", `translate(${hx} ${hy}) rotate(${f(26 * Math.cos(s * 4.6) * Math.exp(-s / 2.4))})`);
        listy.forEach((l, i) => {
          const p = omez((s - i * 0.52) / 0.75);
          l.setAttribute("d", p > 0 && p < 1 ? list(kn, Math.PI * hladce(p)) : "");
        });
        return s < 4.5;
      });
    });

    /* Kachlík skáče po klávesách a píše */
    za(2600, () => {
      const kach = svg.querySelector<SVGGElement>(".ko-u-kachlik");
      if (!kach) return;
      const v = b.kachlik.velikost;
      const klavesy = svg.querySelectorAll<SVGGElement>(".ko-u-klavesa");
      const naKlavesu = (i: number): Bod => {
        const [x, y] = b.klavesy[Math.min(i, b.klavesy.length - 1)];
        return [x - v * 0.5, y - v * 0.9];
      };
      const start: Bod = [b.kachlik.x, b.kachlik.y];
      const zaSkok = Math.ceil(celkem / SKOKY.length);
      const radek4 = PAPIR.slice(0, 4).reduce((a, r) => a + r.length, 0);
      let napsano = 0;
      let t0 = -1;
      const DOBA = 230;
      smycka((cas) => {
        if (t0 < 0) t0 = cas;
        const s = (cas - t0) / DOBA;
        const i = Math.floor(s);
        if (i >= SKOKY.length) {
          kach.setAttribute("transform", `translate(${f(naKlavesu(SKOKY[SKOKY.length - 1])[0])} ${f(naKlavesu(SKOKY[SKOKY.length - 1])[1])})`);
          return false;
        }
        const u = s - i;
        const od = i === 0 ? start : naKlavesu(SKOKY[i - 1]);
        const kam = naKlavesu(SKOKY[i]);
        const x = lerp(od[0], kam[0], u);
        const y = lerp(od[1], kam[1], u) - Math.sin(u * Math.PI) * v * 0.42;
        const zmackni = u > 0.85 ? 1 - (u - 0.85) * 4 : 0;
        kach.setAttribute("transform", `translate(${f(x)} ${f(y + zmackni * v * 0.05)}) scale(1 ${f(1 - zmackni * 0.06)})`);
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
    });

    /* dopis s odkazem odjede po lince zpátky ven */
    za(5700, () => {
      const g = svg.querySelector<SVGGElement>(".ko-u-dopis");
      if (!g) return;
      g.style.display = "";
      zvuk.uzel();
      let t0 = -1;
      const m = Math.max(0.55, (b.w0 / 5.6) * 1.05);
      smycka((cas) => {
        if (t0 < 0) t0 = cas;
        const u = omez((cas - t0) / 1900);
        const [x, y] = trasa(1 - hladce(u));
        g.setAttribute("transform", `translate(${f(x)} ${f(y)}) scale(${f(m * (1 - u * 0.45))})`);
        if (u >= 1) g.style.display = "none";
        return u < 1;
      });
    });
    za(7600, () => nahlas(2));
  }

  /* ——— zavřeno: zvoní do prázdna, z hroudy vykoukne Bublinka ——— */
  function hrajZavreno(b: UvnitrBody) {
    if (o.klidne) {
      konec();
      o.bublina("bublinka", repliky.psst, naPx(b.hlavaBublinka), 6000);
      return;
    }
    const casovace: number[] = [];
    let zruseno = false;
    const za = (ms: number, fn: () => void) => casovace.push(window.setTimeout(() => !zruseno && fn(), ms));
    zrusit = () => {
      zruseno = true;
      casovace.forEach((c) => window.clearTimeout(c));
      svg.classList.remove("ko-zvoni", "ko-vykukuje");
    };
    psani(0);
    svg.classList.add("ko-zvoni");
    /* tři zazvonění do prázdna */
    for (let z = 0; z < 3; z++) for (let i = 0; i < 6; i++) za(z * 1300 + i * 65, () => zvuk.ton(1350, 1340, 0.045, "square", 0.02));
    /* světélka doběhnou k hrnku v kolébce */
    const dyn = svg.querySelector<SVGGElement>(".ko-u-dynamika")!;
    for (let i = 0; i < 3; i++) {
      za(i * 140, () => {
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.innerHTML = `<circle r="11" fill="url(#ko-u-koralek)"/><circle r="3" fill="#FFFDF4"/>`;
        dyn.append(g);
        let t0 = -1;
        const krok = (cas: number) => {
          if (zruseno) return g.remove();
          if (t0 < 0) t0 = cas;
          const u = omez((cas - t0) / 800);
          const [x, y] = trasa(hladce(u));
          g.setAttribute("transform", `translate(${f(x)} ${f(y)})`);
          if (u < 1) requestAnimationFrame(krok);
          else g.remove();
        };
        requestAnimationFrame(krok);
      });
    }
    za(1200, () => {
      svg.classList.add("ko-vykukuje");
      o.bublina("bublinka", repliky.psst, naPx(b.hlavaBublinka), 3400);
    });
    za(1500, () => nahlas(0));
    za(3900, () => {
      svg.classList.remove("ko-zvoni");
      nahlas(1);
      const psat = sekce.querySelector<HTMLElement>(".ko-psat");
      psat?.classList.add("ko-pozor");
      za(2400, () => psat?.classList.remove("ko-pozor"));
    });
  }

  function cink() {
    const c = svg.querySelector(".ko-u-cink");
    c?.classList.add("ted");
    window.setTimeout(() => c?.classList.remove("ted"), 650);
    zvuk.cink();
  }

  /* ——— průlet dovnitř a zpátky ven ——— */
  function dovnitr(kdoNovy: PostavaId, ohniskoPx: Bod, hotovo: () => void, jeOtevreno = true, stavText = "", hovor = true) {
    if (uvnitr) return;
    kdo = kdoNovy;
    otevreno = jeOtevreno;
    stav = stavText;
    hlasit = hovor;
    /* panel se přepne dřív, než se změří — uvnitř má jiné řádky (zpátky ven, hlášení) */
    sekce.dataset.zastavka = "uvnitr";
    vykresli();
    uvnitr = true;
    svg.style.visibility = "visible";
    svgVen.style.transformOrigin = `${f(ohniskoPx[0])}px ${f(ohniskoPx[1])}px`;
    const rychle = o.klidne ? 1 : 0;
    svgVen.animate([{ transform: "scale(1)", opacity: 1 }, { transform: "scale(4.2)", opacity: 0 }], {
      duration: rychle || 950,
      easing: "cubic-bezier(.55,0,.8,.2)",
      fill: "forwards",
    });
    svg.animate([{ transform: "scale(1.14)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }], {
      duration: rychle || 820,
      delay: o.klidne ? 0 : 480,
      easing: "cubic-bezier(.2,.7,.3,1)",
      fill: "forwards",
    });
    sekce.querySelector<HTMLElement>(".ko-zavesit")?.focus({ preventScroll: true });
    window.setTimeout(() => {
      if (!uvnitr) return;
      svgVen.style.visibility = "hidden";
      hotovo();
      hraj();
    }, o.klidne ? 0 : 1250);
  }

  function ven(hotovo: () => void) {
    if (!uvnitr) return;
    zrusit?.();
    zrusit = null;
    o.smazBubliny();
    if (hlaseni) hlaseni.textContent = "";
    uvnitr = false;
    svgVen.style.visibility = "visible";
    svg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: o.klidne ? 1 : 450, fill: "forwards" });
    svgVen.animate([{ transform: "scale(4.2)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }], {
      duration: o.klidne ? 1 : 900,
      delay: o.klidne ? 0 : 150,
      easing: "cubic-bezier(.2,.75,.3,1)",
      fill: "forwards",
    });
    sekce.dataset.zastavka = "venku";
    window.setTimeout(() => {
      if (!uvnitr) svg.style.visibility = "hidden";
      hotovo();
    }, o.klidne ? 0 : 1060);
  }

  /** Okno se změnilo, když je kamera uvnitř — překreslit a ukázat hotový stav */
  function prekresli() {
    if (!uvnitr) return;
    zrusit?.();
    zrusit = null;
    vykresli();
    konec();
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
