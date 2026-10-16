/**
 * Úvod O nás 2 — „Svět v kapce“ v pohybu. Fyziku a tvary počítá
 * kapka-fyzika.ts (bez DOM); tady se každý snímek jen přečte a přepíše
 * do SVG: obrys kapky (#pk-tvar), poloha světa uvnitř a odlesků, kruhy na
 * hladině, korunky, sloupky a perly. Prvky pro sprška se nezakládají při
 * každém snímku — berou se ze zásoby a nepotřebné se schovají.
 *
 * Smyčka běží, jen když je úvod vidět (kdyzVidet ze stav.ts) — mimo
 * obrazovku se nic nepočítá a kapka počká. Když plná kapka jen visí,
 * nepřepisuje se nic: kapka má vlastní vrstvu SVG a dýchá transformací
 * v CSS (třída pk-dycha), takže se svět uvnitř nepřekresluje. Při prvním dopadu se za kapkou
 * namaluje ensō (logo dostane třídu anim), Kapka na trubce poskočí
 * a tečka za nadpisem s ní. Zvuky jsou z parta2/zvuk.ts a hrají jen se
 * zapnutým zvukem.
 *
 * S omezeným pohybem se nic nespouští: kapka visí, ensō stojí, klidné
 * kruhy jsou nakreslené rovnou (Pocatek.astro).
 */
import { klid, kdyzVidet, SVGNS } from "../parta2/stav";
import * as zvuk from "../parta2/zvuk";
import { Divadlo, type Snimek } from "./kapka-fyzika";
import { KAPKA_R } from "../../components/onas2/kresba/miry";

const c1 = (n: number) => (Math.round(n * 10) / 10).toString();
const c3 = (n: number) => n.toFixed(3);

/** Zásoba stejných prvků v jedné skupině — kolik je potřeba, tolik je vidět */
class Zasoba {
  private prvky: SVGElement[] = [];
  private videt = 0;
  constructor(
    private rodic: Element,
    private znacka: string,
  ) {}
  dej(i: number): SVGElement {
    while (this.prvky.length <= i) {
      const el = document.createElementNS(SVGNS, this.znacka) as SVGElement;
      this.rodic.appendChild(el);
      this.prvky.push(el);
    }
    const el = this.prvky[i];
    if (i >= this.videt) el.removeAttribute("display");
    return el;
  }
  /** Po snímku: co se nepoužilo, schovat */
  hotovo(pouzito: number) {
    for (let i = pouzito; i < this.videt; i++) this.prvky[i].setAttribute("display", "none");
    this.videt = pouzito;
  }
}

export function pocatek() {
  const sekce = document.querySelector<HTMLElement>("[data-pocatek]");
  const zad = sekce?.querySelector<SVGSVGElement>(".pk-kresba-zad");
  if (!sekce || !zad || klid) return;
  const najdi = <T extends Element>(s: string) => sekce.querySelector<T>(s)!;

  const tvar = najdi<SVGPathElement>("#pk-tvar");
  const kapkaG = najdi<SVGGElement>(".pk-kapka");
  const svet = najdi<SVGGElement>(".pk-svet");
  const lesky = najdi<SVGGElement>(".pk-lesky");
  const lem = najdi<SVGEllipseElement>(".pk-lem");
  const krkLesky = sekce.querySelectorAll<SVGElement>(".pk-krk-lesk");
  const cepicka = najdi<SVGPathElement>(".pk-cepicka");
  const satelit = najdi<SVGCircleElement>(".pk-satelit");
  const stopy = najdi<SVGGElement>(".pk-stopy");
  const stopa = stopy.querySelectorAll<SVGPathElement>(".pk-stopa");
  const zare = najdi<SVGGElement>(".pk-zare");
  /* Teplé světlo kapky na trubce a stropě (kresba/trubka.ts) */
  const zarTrubky = sekce.querySelectorAll<SVGElement>(".pkt-zar");
  /* Ensō za kapkou i jeho odraz ve vodě */
  const ensa = sekce.querySelectorAll<HTMLElement>(".pk-enso-logo");
  const kami = sekce.querySelector<HTMLElement>(".pk-kami");
  const pustit = sekce.querySelector<HTMLButtonElement>(".pk-pustit");

  const z = {
    kruhDol: new Zasoba(najdi(".pk-kruhy-dol"), "path"),
    kruhHor: new Zasoba(najdi(".pk-kruhy-hor"), "path"),
    zStena: new Zasoba(najdi(".pk-z-stena"), "path"),
    zHrana: new Zasoba(najdi(".pk-z-hrana"), "path"),
    zPerly: new Zasoba(najdi(".pk-z-perly"), "circle"),
    sloupy: new Zasoba(najdi(".pk-sloupy"), "path"),
    pStena: new Zasoba(najdi(".pk-p-stena"), "path"),
    pHrana: new Zasoba(najdi(".pk-p-hrana"), "path"),
    pOdlesky: new Zasoba(najdi(".pk-p-odlesky"), "path"),
    pPerly: new Zasoba(najdi(".pk-p-perly"), "circle"),
    zablesky: new Zasoba(najdi(".pk-zablesky"), "circle"),
  };

  sekce.classList.add("pk-bezi");
  const divadlo = new Divadlo();
  let posledniPlink = 0;
  divadlo.udalosti = {
    dopad: (velka, kolikaty) => {
      if (velka) {
        zvuk.kapka();
        zvuk.ton(360, 110, 0.34, "sine", 0.42);
        zvuk.sumik(0.5, 900, 0.6, 0.2);
        if (kolikaty === 1) {
          ensa.forEach((e) => e.classList.add("anim"));
          sekce.classList.add("pk-enso-je");
        }
        kami?.classList.remove("reaguje");
        void kami?.offsetWidth;
        kami?.classList.add("reaguje");
        window.setTimeout(() => kami?.classList.remove("reaguje"), 1000);
        sekce.classList.remove("pk-skok");
        void sekce.offsetWidth;
        sekce.classList.add("pk-skok");
      } else zvuk.kapka();
    },
    perla: (r) => {
      const ted = performance.now();
      if (ted - posledniPlink < 70) return;
      posledniPlink = ted;
      zvuk.ton(2200 + Math.random() * 1400, 1500, 0.05, "sine", Math.min(0.05, 0.012 + r * 0.25));
    },
  };

  /* Klepnutí: na kapku — spadne; na hladinu — kápne tam malá */
  if (pustit) {
    pustit.hidden = false;
    pustit.addEventListener("click", () => divadlo.pust());
  }
  najdi(".pk-voda").addEventListener("click", (e) => {
    const r = zad.getBoundingClientRect();
    const ev = e as MouseEvent;
    divadlo.kapni(((ev.clientX - r.left) / r.width) * 1000, ((ev.clientY - r.top) / r.height) * 1000);
  });

  const nastav = (el: Element, a: Record<string, string>) => {
    for (const k in a) el.setAttribute(k, a[k]);
  };

  function vykresli(sn: Snimek) {
    const k = sn.kapka;
    if (k) {
      kapkaG.removeAttribute("display");
      tvar.setAttribute("d", k.d);
      const s = `translate(${c1(k.cx)} ${c1(k.cy)}) scale(${c3(k.r / KAPKA_R)})`;
      svet.setAttribute("transform", s);
      lesky.setAttribute("transform", s);
      nastav(lem, { cx: c1(k.cx), cy: c1(k.cy), rx: c1(k.rx), ry: c1(k.ry) });
      kapkaG.setAttribute("opacity", c3(k.o));
      krkLesky.forEach((el) => (k.krk ? el.removeAttribute("display") : el.setAttribute("display", "none")));
    } else kapkaG.setAttribute("display", "none");

    if (sn.cepicka) {
      cepicka.removeAttribute("display");
      cepicka.setAttribute("d", sn.cepicka);
    } else cepicka.setAttribute("display", "none");

    satelit.setAttribute("r", sn.satelit ? c1(sn.satelit.r) : "0");
    if (sn.satelit) nastav(satelit, { cx: c1(sn.satelit.x), cy: c1(sn.satelit.y) });

    if (sn.stopy) {
      const st = sn.stopy;
      stopy.setAttribute("opacity", c3(st.o));
      const cary: [number, number, number][] = [
        [-40, 40, 0],
        [18, 0, 0],
        [62, 70, -20],
      ];
      stopa.forEach((el, i) => el.setAttribute("d", `M${c1(st.x + cary[i][0])} ${c1(st.y0 + cary[i][1])}V${c1(st.y1 + cary[i][2])}`));
    } else stopy.setAttribute("opacity", "0");

    zare.setAttribute("opacity", c3(Math.min(1.6, sn.zare) / 1.6 + 0.15));
    const zt = c3(sn.zarTrubky);
    zarTrubky.forEach((el) => el.setAttribute("opacity", zt));

    let i = 0;
    for (const r of sn.kruhy) {
      nastav(z.kruhDol.dej(i), { d: r.dol, "stroke-width": c1(r.w * 1.4), "stroke-opacity": c3(r.o * 0.7) });
      nastav(z.kruhHor.dej(i), { d: r.d, stroke: r.teply ? "#FFD9A6" : "#D6E8FF", "stroke-width": c1(r.w), "stroke-opacity": c3(r.o) });
      i++;
    }
    z.kruhDol.hotovo(i);
    z.kruhHor.hotovo(i);

    let zs = 0;
    let ps = 0;
    for (const kor of sn.koruny) {
      nastav(z.zStena.dej(zs), { d: kor.zad + kor.trnyZad, opacity: c3(kor.o * 0.5) });
      nastav(z.zHrana.dej(zs), { d: kor.hranaZad, "stroke-opacity": c3(kor.o * 0.6) });
      nastav(z.pStena.dej(ps), { d: kor.pred + kor.trnyPred, opacity: c3(kor.o * 0.66) });
      nastav(z.pHrana.dej(ps), { d: kor.hranaPred, "stroke-opacity": c3(kor.o * 0.9) });
      nastav(z.pOdlesky.dej(ps), { d: kor.odlesky, "stroke-opacity": c3(kor.o * 0.32) });
      zs++;
      ps++;
    }
    for (const zas of [z.zStena, z.zHrana]) zas.hotovo(zs);
    for (const zas of [z.pStena, z.pHrana, z.pOdlesky]) zas.hotovo(ps);

    i = 0;
    for (const s of sn.sloupy) nastav(z.sloupy.dej(i++), { d: s.d, opacity: c3(s.o) });
    z.sloupy.hotovo(i);

    i = 0;
    for (const p of sn.perlyZad) nastav(z.zPerly.dej(i++), { cx: c1(p.x), cy: c1(p.y), r: c1(p.r) });
    z.zPerly.hotovo(i);
    i = 0;
    for (const p of [...sn.perlyPred, ...sn.male]) nastav(z.pPerly.dej(i++), { cx: c1(p.x), cy: c1(p.y), r: c1(p.r) });
    z.pPerly.hotovo(i);

    i = 0;
    for (const zb of sn.zablesky) nastav(z.zablesky.dej(i++), { cx: c1(zb.x), cy: c1(zb.y), r: c1(zb.r), opacity: c3(zb.o) });
    z.zablesky.hotovo(i);
  }

  let minule = 0;
  let ticho = false;
  kdyzVidet(sekce, (t) => {
    /* Po návratu na obrazovku nepřeskakovat — dlouhá pauza je jeden krok */
    const dt = minule ? Math.min(0.05, (t - minule) / 1000) : 1 / 60;
    minule = t;
    divadlo.krok(dt);
    /* V tichu se kreslí jen jednou, pak dýchání převezme CSS */
    const ted = divadlo.klidna();
    if (!ted || !ticho) vykresli(divadlo.snimek());
    if (ted !== ticho) sekce.classList.toggle("pk-dycha", ted);
    ticho = ted;
  });
  /* Když se odroluje pryč a zpátky, začít bez skoku */
  new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) minule = 0;
  }).observe(sekce);
}
