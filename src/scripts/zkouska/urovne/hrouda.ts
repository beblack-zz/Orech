/**
 * Úroveň 一 Hrouda — „Šest stejných“ (scéna components/zkouska/urovne/Hrouda.astro,
 * kresba hrouda-kresba.ts, blok hrouda-model.ts).
 *
 * Na stole leží dlouhý blok hlíny a z jeho levého konce se drátem
 * odkrajuje šest hrud po 500 g. Drát jde za myší a kliknutí krojí; prstem
 * se drát táhne a puštěním se krojí (puštění mimo scénu řez zruší).
 * Krajíc skočí na váhu, ručička se rozhoupe a ukáže, kolik váží, hrouda
 * se uválí do koule a odkutálí na prkénko, kde dostane cedulku. Váha se
 * předem neukazuje — jde o odhad objemu. Blok není všude stejně tlustý
 * a centimetr váží se čtvercem výšky, takže stejně dlouhé kusy stejné
 * nejsou. Metr a délka u drátu jsou poctivá nápověda, víc ne.
 *
 * Na bloku spí Hlínka a každé 4–7 s se převalí jinam. Kdo krojí přes ni,
 * nekrojí, ale vzbudí ji; potřetí vzbuzená odejde spát k Pecince a hra
 * končí. Když blok dojde dřív, je zbytek poslední hroudou a ostatní chybí.
 * Po šesté hroudě jde zbytek zpátky do pytle.
 *
 * Body: průměrná odchylka e od 500 g po lomené čáře 0 → 100, 13 → 85,
 * 30 → 65, 55 → 40, 80 → 0, za každé probuzení −6. Prošlo, když e ≤ 55 g
 * a Hlínka se vzbudila nanejvýš dvakrát (ohodnot v hrouda-model.ts).
 *
 * Klávesnice: šipky posouvají drát o 1 cm, se Shiftem o 2 mm, mezerník
 * a Enter krojí. Tlačítka pod scénou posouvají po 2 mm (podržením
 * rychleji) a krojí.
 *
 * Na telefonu (kvalita.ts) odletuje od drátu polovina drobků.
 */
import type { Uroven, Vysledek } from "../hra";
import * as zvuk from "../../parta2/zvuk";
import { omez, mix, hladce, cislo, SVGNS } from "../../parta2/stav";
import { castic } from "../../parta2/kvalita";
import { urovenPodleId } from "../../../data/mistr";
import {
  CM, X0, ZAKLAD, CIL, HROUD, PROBUZENI_MAX,
  novyBlok, vyska, hmotnostMezi, ohodnot,
} from "../../../components/zkouska/urovne/hrouda-model";
import {
  SIRKA, VYSKA, VAHA, PODNOS, PYTEL, HLINKA,
  uhelVahy, kusBloku, blokSvg, koule, polomerKoule, cedulka, barvaOdchylky, odchylkaText,
} from "../../../components/zkouska/urovne/hrouda-kresba";

/** Nejkratší krajíc i nejkratší zbytek (cm) */
const MIN_KUS = 0.4;
const KROK_KLAVESA = 1;
const KROK_JEMNY = 0.2;
/** Kde za levým krajem se nejspíš bude krojit (cm) — tam Hlínka zaleze jen někdy */
const ZONA_DO = 9;

/* Časy krajíce na cestě z bloku přes váhu na prkénko (ms) */
const T_ODDELENI = 130;
const T_SKOK = 420;
const T_HNETENI = 380;
const T_SESKOK = 440;

const START = "Půl kila. Šestkrát. A potichu, prosím.";
const VZBUZENI = ["Au! Já tady spím.", "Krájej hlínu, ne mě.", "Ještě pět minut…"];
const ODCHOD = "Třikrát vzbuzená. Jdu spát k Pecince.";
const MUMLANI = ["Ještě pět minut.", "Zatím jsem jenom hrouda…", "Mokré ruce, prosím…", "Chrrr… půl kila…"];
const PRESNE = ["Na gram. Skoro jako Kachlík.", "Tohle by Kachlík orazítkoval.", "Přesně. Ani mě to nevzbudilo."];
const TEZKE = ["To je spíš na polévkovou mísu.", "Z toho budou dvě misky. Nebo jeden hrnec."];
const LEHKE = ["Z toho bude tak náprstek.", "Na misku málo. Na čajovou misku akorát."];
const POSTEL = ["Hej! To byla moje postel.", "Stěhuju se. Zase."];

const nahodne = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const f1 = (n: number) => n.toFixed(1);
/** Pružný doskok 0 → 1 s malým přešvihem */
const pruzne = (t: number) => {
  const u = omez(t);
  return 1 + 2.2 * Math.pow(u - 1, 3) + 1.2 * Math.pow(u - 1, 2);
};

type Faze = "ceka" | "miri" | "vazi" | "zaver" | "konec";
type Cil = { kam: "blok"; X: number } | { kam: "pytel" } | { kam: "pryc" };

interface Kus {
  i: number;
  g: number;
  el: SVGGElement;
  krajic: SVGGElement;
  kouleG: SVGGElement;
  telo: SVGGElement | null;
  stin: SVGElement | null;
  /** Spodní střed krajíce ve scéně, odkud se vydal */
  cx0: number;
  r: number;
  t0: number;
  tDopad: number;
  tHnet: number;
  tPryc: number;
  stav: "krajic" | "vaha" | "hnete" | "jede" | "doma";
  /** Ručička se ustálila a výsledek je venku */
  zvazeno: boolean;
  /** Na prkénku už visí cedulka */
  cedulka: boolean;
}

interface Drobek {
  el: SVGCircleElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  zem: number;
  t0: number;
}

interface Pohyb {
  typ: "valeni" | "skok" | "probuzeni" | "odchod";
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  t0: number;
  trvani: number;
  otocky: number;
  vyska: number;
  /** Kam dopadne: na blok, do pytle, pryč ze scény */
  kam: "blok" | "pytel" | "pryc";
  potom?: () => void;
}

export const hrouda: Uroven = (p) => {
  const koren = p.koren;
  const $ = <T extends Element>(s: string) => koren.querySelector<T>(s)!;
  const okno = $<HTMLElement>(".mh1-okno");
  const zadni = $<SVGSVGElement>(".mh1-zadni");
  const blokG = $<SVGGElement>(".mh1-blok");
  const rucicka = $<SVGGElement>(".mh1-rucicka");
  const kusyG = $<SVGGElement>(".mh1-kusy");
  const cedulkyG = $<SVGGElement>(".mh1-cedulky");
  const drobkyG = $<SVGGElement>(".mh1-drobky");
  const dratG = $<SVGGElement>(".mh1-drat");
  const dratRovina = $<SVGPathElement>(".mh1-drat-rovina");
  const dratRez = $<SVGPathElement>(".mh1-drat-rez");
  const delkaText = $<SVGTextElement>(".mh1-delka-text");
  const vysledekG = $<SVGGElement>(".mh1-vysledek");
  const vysledekTelo = $<SVGGElement>(".mh1-vysledek-telo");
  const vysledekPapir = $<SVGRectElement>(".mh1-vysledek-papir");
  const vysledekText = $<SVGTextElement>(".mh1-vysledek-text");
  const hlinkaEl = $<HTMLElement>(".mh1-hlinka");
  const hlaseni = $<HTMLElement>(".mh1-hlaseni");
  const btKrojit = $<HTMLButtonElement>(".mh1-krojit");
  const btPosun = [...koren.querySelectorAll<HTMLButtonElement>(".mh1-posun")];
  const klid = p.klid;

  const ac = new AbortController();
  const signal = ac.signal;

  /* ——— Stav ——— */
  const seme = Math.floor(Math.random() * 2147483646) + 1;
  const blok = novyBlok(seme);
  let L = 0;
  let dratX = Math.min(3, blok.delka / 2);
  const vahy: number[] = [];
  const delky: number[] = [];
  let probuzeni = 0;
  let faze: Faze = "ceka";
  let bezi = false;
  let zastaveno = false;
  let hotovo = false;
  let raf = 0;
  let predtim = 0;
  let opakovani: number | undefined;
  const plan: { t: number; fn: () => void }[] = [];
  const naplanuj = (za: number, fn: () => void) => plan.push({ t: performance.now() + za, fn });

  /* Ručička váhy — tlumená pružina */
  let rucUhel = uhelVahy(0);
  let rucRychlost = 0;
  let rucCil = uhelVahy(0);
  let rucKresleno = NaN;
  /** Kus, na jehož zvážení se čeká */
  let naVaze: Kus | null = null;

  const kusy: Kus[] = [];
  const drobky: Drobek[] = [];
  /** Drát: švih při řezu, cuknutí a brnknutí */
  let svih = -1e9;
  let brnk = -1e9;
  let cuk = -1e9;
  let dratKresleno = "";
  let ohrozena = false;

  /* Zbytek bloku na cestě do pytle a cedulka nad pytlem */
  let zbytekCesta: { t0: number; cx: number } | null = null;
  let plovouci: { el: SVGTextElement; t0: number } | null = null;

  /* Hlínka */
  const hl = { x: 0, y: 0, uhel: 0, rot: 0, dy: 0, sx: 1, sy: 1 };
  let hlPohyb: Pohyb | null = null;
  let hlMisto: "blok" | "pytel" | "pryc" = "blok";
  let hlDopad = -1e9;
  let hlBdi = false;
  let hlCas = 0;
  let hlKresleno = "";
  let mumlani = 0;
  let posledniRec = -1e9;
  let poradiVzbuzeni = Math.floor(Math.random() * VZBUZENI.length);
  let serie = false;

  /* ——— Pomůcky ——— */
  const sx = (x: number) => X0 + x * CM;
  const zeSceny = (X: number) => (X - X0) / CM;
  /** Horní plocha bloku ve scéně (y) v místě X; mimo blok stůl */
  const povrch = (X: number) => {
    const x = zeSceny(X);
    if (x < L || x > blok.delka) return ZAKLAD;
    return ZAKLAD - vyska(blok, x) * CM;
  };
  const naklon = (X: number) => (Math.atan2(povrch(X + 8) - povrch(X - 8), 16) * 180) / Math.PI;
  const stredNaBloku = (X: number) => povrch(X) - HLINKA.nad + 3;
  const SEDI_V_PYTLI = { x: PYTEL.x + 2, y: PYTEL.y - 6 };

  const rekni = (text: string, prednost = false) => {
    const t = performance.now();
    if (!prednost && t - posledniRec < 4000) return;
    posledniRec = t;
    p.rekni(text, hlinkaEl);
  };
  const oznam = (text: string) => {
    hlaseni.textContent = text;
  };
  const ukazatel = () => {
    const kolik = Math.min(HROUD, vahy.length + 1);
    p.ukazatel(`Hrouda ${kolik}/${HROUD}` + (probuzeni ? ` · budíček ${probuzeni}/${PROBUZENI_MAX}` : ""));
  };

  /* ——— Kresba: drát ——— */
  const hlinkaPodDratem = () => hlMisto === "blok" && Math.abs(sx(dratX) - hl.x) < HLINKA.polomer + 1.5;

  const dratMez = () => ({ lo: L + MIN_KUS, hi: blok.delka - MIN_KUS });
  const nastavDrat = (x: number) => {
    const { lo, hi } = dratMez();
    dratX = hi < lo ? Math.min(blok.delka, lo) : omez(x, lo, hi);
  };
  const posunDrat = (o: number) => {
    if (!bezi || hotovo || (faze !== "miri" && faze !== "vazi")) return;
    nastavDrat(dratX + o);
  };

  const kresliDrat = (t: number) => {
    const X = sx(dratX);
    /* Švih: drát projede blokem dolů a vrátí se; brnknutí: zachvěje se do stran */
    const s = (t - svih) / 260;
    const dy = s >= 0 && s < 1 && !klid ? (s < 0.35 ? mix(-34, 8, hladce(s / 0.35)) : mix(8, 0, hladce((s - 0.35) / 0.65))) : 0;
    const b = (t - brnk) / 520;
    const c = (t - cuk) / 260;
    const dx = b >= 0 && b < 1 && !klid ? Math.sin(b * Math.PI * 7) * 5 * (1 - b) : c >= 0 && c < 1 && !klid ? Math.sin(c * Math.PI * 4) * 2.2 * (1 - c) : 0;
    const zablesk = s >= 0 && s < 1 ? 0.9 * (1 - s) : 0;
    const top = povrch(X);
    const klic = `${f1(X + dx)}|${f1(dy)}|${f1(zablesk)}|${f1(top)}|${f1(dratX - L)}`;
    if (klic === dratKresleno) return;
    dratKresleno = klic;
    dratG.setAttribute("transform", `translate(${f1(X + dx)} ${f1(dy)})`);
    dratRez.setAttribute("opacity", f1(zablesk));
    dratRovina.setAttribute("d", top < ZAKLAD - 4 ? `M0 ${f1(top + 3)} V${ZAKLAD - 2}` : "");
    delkaText.textContent = `${cislo(Math.max(0, dratX - L), 1)} cm`;
  };

  /* ——— Kresba: Hlínka ——— */
  const kresliHlinku = () => {
    const w = HLINKA.sirka;
    /* Splácnutí drží chodidla na místě — střed klesne */
    const cy = hl.y + hl.dy + (1 - hl.sy) * HLINKA.nad;
    const left = ((hl.x - w / 2) / SIRKA) * 100;
    const top = ((cy - w * HLINKA.stred) / VYSKA) * 100;
    const transform = `rotate(${(hl.uhel + hl.rot).toFixed(2)}deg) scale(${hl.sx.toFixed(3)}, ${hl.sy.toFixed(3)})`;
    const klic = `${left.toFixed(3)}|${top.toFixed(3)}|${transform}`;
    if (klic === hlKresleno) return;
    hlKresleno = klic;
    hlinkaEl.style.left = `${left.toFixed(3)}%`;
    hlinkaEl.style.top = `${top.toFixed(3)}%`;
    hlinkaEl.style.transform = transform;
  };

  const usadNaBlok = (X: number) => {
    hl.x = X;
    hl.y = stredNaBloku(X);
    hl.uhel = naklon(X);
    hl.rot = 0;
    hl.dy = 0;
  };

  /** Kam si Hlínka lehne: většinou mimo místo, kde se bude krojit; když je blok krátký, zaleze do pytle */
  const noveMisto = (): { kam: "blok"; X: number } | { kam: "pytel" } => {
    const r = HLINKA.polomer / CM;
    const lo = L + 0.5 + r;
    const hi = blok.delka - blok.cepicka - 0.3;
    if (hi - lo < 0.5) return { kam: "pytel" };
    const mimo = L + ZONA_DO + r;
    const n = Math.random();
    if (hi > mimo + 0.3 && n < 0.7) return { kam: "blok", X: sx(mix(mimo, hi, Math.random())) };
    if (hi <= mimo + 0.3 && n < 0.55) return { kam: "pytel" };
    for (let i = 0; i < 8; i++) {
      const X = sx(mix(lo, hi, Math.random()));
      if (Math.abs(X - hl.x) > 34) return { kam: "blok", X };
    }
    return { kam: "blok", X: sx(mix(lo, hi, Math.random())) };
  };

  /** Hlínka se přesune: po bloku se převalí, do pytle a z odkrojeného kusu skočí, pryč se odkutálí */
  const presunHlinku = (cil: Cil, potom?: () => void, skokem = false) => {
    const t = performance.now();
    if (cil.kam === "blok") {
      const dx = cil.X - hl.x;
      const otocky = Math.round(dx / (2 * Math.PI * HLINKA.polomer));
      if (klid) {
        usadNaBlok(cil.X);
        hlMisto = "blok";
        potom?.();
        return;
      }
      hlPohyb = skokem
        ? { typ: "skok", x0: hl.x, y0: hl.y, x1: cil.X, y1: stredNaBloku(cil.X), t0: t, trvani: 720, otocky: 0, vyska: 46, kam: "blok", potom }
        : {
            typ: "valeni", x0: hl.x, y0: hl.y, x1: cil.X, y1: stredNaBloku(cil.X), t0: t,
            trvani: 520 + Math.abs(dx) * 2.1, otocky, vyska: 10 + Math.abs(dx) * 0.06, kam: "blok", potom,
          };
    } else if (cil.kam === "pytel") {
      if (klid) {
        hl.x = SEDI_V_PYTLI.x;
        hl.y = SEDI_V_PYTLI.y;
        hl.uhel = 0;
        hlMisto = "pytel";
        potom?.();
        return;
      }
      hlPohyb = {
        typ: "skok", x0: hl.x, y0: hl.y, x1: SEDI_V_PYTLI.x, y1: SEDI_V_PYTLI.y, t0: t,
        trvani: 950, otocky: 1, vyska: 90, kam: "pytel", potom,
      };
    } else {
      if (klid) {
        hlMisto = "pryc";
        hlinkaEl.classList.add("mh1-pryc");
        potom?.();
        return;
      }
      hlPohyb = {
        typ: "odchod", x0: hl.x, y0: hl.y, x1: SIRKA + 90, y1: hl.y + 60, t0: t,
        trvani: 1300, otocky: 3, vyska: 40, kam: "pryc", potom,
      };
    }
    zvuk.reakce("hlinka");
  };

  const usni = () => {
    hlBdi = false;
    hlinkaEl.classList.remove("mh1-vzhuru");
  };

  /** Pohyb Hlínky v čase t */
  const hybejHlinkou = (t: number) => {
    const m = hlPohyb;
    if (m) {
      const u = omez((t - m.t0) / m.trvani);
      if (m.typ === "probuzeni") {
        /* Vyskočí a otřepe se */
        hl.dy = -Math.sin(Math.min(1, u / 0.5) * Math.PI) * 30;
        hl.rot = u > 0.45 ? Math.sin((u - 0.45) * Math.PI * 6) * 9 * (1 - u) : 0;
        const natah = u < 0.5 ? Math.sin((u / 0.5) * Math.PI) : 0;
        hl.sy = 1 + natah * 0.1;
        hl.sx = 1 - natah * 0.06;
      } else {
        const e = m.typ === "odchod" ? u * u : hladce(u);
        hl.x = mix(m.x0, m.x1, e);
        const zem = m.typ === "valeni" ? stredNaBloku(hl.x) : mix(m.y0, m.y1, e);
        hl.y = zem;
        hl.dy = -Math.sin(u * Math.PI) * m.vyska;
        hl.uhel = m.typ === "valeni" ? mix(naklon(m.x0), naklon(m.x1), e) : 0;
        const smer = m.x1 >= m.x0 ? 1 : -1;
        hl.rot = m.otocky ? smer * Math.abs(m.otocky) * 360 * e : smer * Math.sin(u * Math.PI) * 22;
        const natah = Math.sin(u * Math.PI);
        hl.sy = 1 + natah * 0.05;
        hl.sx = 1 - natah * 0.03;
      }
      if (u >= 1) {
        hlPohyb = null;
        hl.dy = 0;
        hl.rot = 0;
        hl.sx = 1;
        hl.sy = 1;
        if (m.typ !== "probuzeni") {
          hlMisto = m.kam;
          if (m.kam === "blok") hl.uhel = naklon(hl.x);
          if (m.kam === "pryc") hlinkaEl.classList.add("mh1-pryc");
          else hlDopad = t;
        }
        m.potom?.();
      }
    } else {
      /* Dopad: splácne se a srovná */
      const d = (t - hlDopad) / 320;
      if (d >= 0 && d < 1 && !klid) {
        const s = Math.sin(d * Math.PI * 2) * (1 - d);
        hl.sy = 1 - s * 0.14;
        hl.sx = 1 + s * 0.09;
      } else {
        hl.sy = 1;
        hl.sx = 1;
      }
    }

    /* Převalení každých 4–7 s, dokud spí na bloku */
    if (!hlPohyb && !hlBdi && hlMisto === "blok" && (faze === "miri" || faze === "vazi") && t >= hlCas) {
      hlCas = t + 4000 + Math.random() * 3000;
      const cil = noveMisto();
      presunHlinku(cil, () => {
        if (hotovo) return;
        if (++mumlani % 3 === 1) rekni(nahodne(MUMLANI));
      });
    }

    const pod = hlinkaPodDratem() && !hlBdi && (faze === "miri" || faze === "vazi");
    if (pod !== ohrozena) {
      ohrozena = pod;
      hlinkaEl.classList.toggle("mh1-ohrozena", pod);
      dratG.classList.toggle("mh1-nebezpeci", pod);
    }
    kresliHlinku();
  };

  /* ——— Vzbuzená Hlínka ——— */
  const vzbud = () => {
    zvuk.ton(330, 160, 0.32, "triangle", 0.12);
    brnk = performance.now();
    if (hlBdi) {
      /* Už je vzhůru — podruhé se nepočítá, jen drát brnkne */
      return;
    }
    probuzeni++;
    zvuk.reakce("hlinka");
    hlBdi = true;
    hlinkaEl.classList.add("mh1-vzhuru");
    ukazatel();
    const konecHry = probuzeni >= PROBUZENI_MAX;
    rekni(konecHry ? ODCHOD : VZBUZENI[poradiVzbuzeni++ % VZBUZENI.length], true);
    oznam(konecHry ? "Hlínka se vzbudila potřetí a odchází." : `Hlínka se vzbudila. Budíček ${probuzeni} ze ${PROBUZENI_MAX}.`);
    const t = performance.now();
    if (!klid) hlPohyb = { typ: "probuzeni", x0: hl.x, y0: hl.y, x1: hl.x, y1: hl.y, t0: t, trvani: 900, otocky: 0, vyska: 0, kam: "blok" };
    if (konecHry) {
      faze = "zaver";
      dratG.classList.add("mh1-ceka");
      naplanuj(klid ? 600 : 1100, () => presunHlinku({ kam: "pryc" }));
      naplanuj(klid ? 1500 : 2700, dokonci);
      return;
    }
    naplanuj(klid ? 700 : 1000, () => {
      if (hotovo || hlMisto !== "blok" || faze === "zaver" || faze === "konec") return;
      const cil = noveMisto();
      presunHlinku(cil, () => {
        if (!hotovo) usni();
      });
      hlCas = performance.now() + 5000 + Math.random() * 2500;
    });
  };

  /* ——— Krájení ——— */
  const krojit = () => {
    if (!bezi || hotovo) return;
    if (faze !== "miri") {
      if (faze === "vazi") cuk = performance.now();
      return;
    }
    if (hlinkaPodDratem()) {
      vzbud();
      return;
    }
    rez(L, dratX, false);
  };

  const rez = (od: number, po: number, sam: boolean) => {
    const g = hmotnostMezi(blok, od, po);
    L = po;
    vahy.push(g);
    delky.push(po - od);
    faze = "vazi";
    dratG.classList.add("mh1-ceka");
    if (!sam) {
      zvuk.sumik(0.12, 3800, 1.2, 0.18);
      svih = performance.now();
      if (!klid) drobkyZ(sx(po));
    }
    blokG.innerHTML = L < blok.delka - 0.01 ? blokSvg(blok, L) : "";
    schovejVysledek();
    pridejKus(od, po, g);
    nastavDrat(dratX);
    ukazatel();
    /* Hlínka spala na tom, co se právě odkrojilo — přeskočí jinam, bez počítání */
    if (hlMisto === "blok") {
      const kam = hlPohyb?.typ === "valeni" ? hlPohyb.x1 : hl.x;
      if (Math.min(kam, hl.x) - HLINKA.polomer < sx(L)) {
        hlPohyb = null;
        hl.dy = 0;
        hl.rot = 0;
        presunHlinku(noveMisto(), hlBdi ? () => !hotovo && usni() : undefined, true);
        hlCas = performance.now() + 4000 + Math.random() * 3000;
        if (!sam) rekni(nahodne(POSTEL));
      }
    }
  };

  const drobkyZ = (X: number) => {
    const h = (ZAKLAD - povrch(X + 1)) || 60;
    for (let i = 0, n = castic(7); i < n; i++) {
      const el = document.createElementNS(SVGNS, "circle");
      el.setAttribute("r", f1(1.3 + Math.random() * 1.8));
      el.setAttribute("fill", i % 3 ? "#7A5A47" : "#A07D64");
      drobkyG.append(el);
      drobky.push({
        el, x: X + (Math.random() - 0.5) * 6, y: ZAKLAD - Math.random() * h * 0.8,
        vx: (Math.random() - 0.6) * 160, vy: -40 - Math.random() * 120, zem: ZAKLAD + 6 + Math.random() * 24, t0: performance.now(),
      });
    }
  };

  /* ——— Krajíc → váha → koule → prkénko ——— */
  const pridejKus = (od: number, po: number, g: number) => {
    const i = vahy.length - 1;
    const el = document.createElementNS(SVGNS, "g");
    el.setAttribute("class", "mh1-kus");
    const krajic = document.createElementNS(SVGNS, "g");
    krajic.innerHTML = kusBloku(blok, od, po, { id: `mh1-k${i}`, defs: "mh1-p", rez: true, bezStinu: true });
    const kouleG = document.createElementNS(SVGNS, "g");
    kouleG.innerHTML = koule(g);
    kouleG.setAttribute("opacity", "0");
    el.append(krajic, kouleG);
    kusyG.append(el);
    const k: Kus = {
      i, g, el, krajic, kouleG,
      telo: kouleG.querySelector<SVGGElement>(".mh1-koule-telo"),
      stin: kouleG.querySelector<SVGElement>(".mh1-koule-stin"),
      cx0: sx((od + po) / 2), r: polomerKoule(g), t0: performance.now(),
      tDopad: 0, tHnet: 0, tPryc: 0, stav: "krajic", zvazeno: false, cedulka: false,
    };
    kusy.push(k);
    if (klid) {
      k.stav = "vaha";
      k.tDopad = k.t0;
      polozKrajic(k, cilKrajice(k).dx, cilKrajice(k).dy, 0, 1, 1);
      naVahu(k);
    }
  };

  const cilKrajice = (k: Kus) => ({ dx: VAHA.x - k.cx0, dy: VAHA.miska + 2 - ZAKLAD });

  const polozKrajic = (k: Kus, dx: number, dy: number, uhel: number, sxk: number, syk: number) => {
    const c = k.cx0;
    k.krajic.setAttribute(
      "transform",
      `translate(${f1(dx)} ${f1(dy)}) rotate(${f1(uhel)} ${f1(c)} ${ZAKLAD}) translate(${f1(c)} ${ZAKLAD}) scale(${sxk.toFixed(3)} ${syk.toFixed(3)}) translate(${f1(-c)} ${-ZAKLAD})`,
    );
  };

  const polozKouli = (k: Kus, x: number, y: number, s: number, rot: number, stin: number) => {
    k.kouleG.setAttribute("transform", `translate(${f1(x)} ${f1(y)}) scale(${s.toFixed(3)})`);
    k.telo?.setAttribute("transform", `rotate(${f1(rot)})`);
    k.stin?.setAttribute("opacity", (0.3 * stin).toFixed(2));
  };

  /** Krajíc dosedl na misku: ručička se rozjede k jeho váze */
  const naVahu = (k: Kus) => {
    naVaze = k;
    rucCil = uhelVahy(k.g);
    if (klid) {
      rucUhel = rucCil;
      rucRychlost = 0;
    } else zvuk.ton(140, 60, 0.18, "sine", 0.3);
  };

  /** Ručička se ustálila: výsledek, cinknutí, co na to Hlínka */
  const zvazeno = (k: Kus) => {
    if (k.zvazeno) return;
    k.zvazeno = true;
    naVaze = null;
    zvuk.cink();
    const odch = k.g - CIL;
    ukazVysledek(k.g);
    const kolikata = k.i + 1;
    oznam(`${kolikata}. hrouda: ${cislo(Math.round(k.g))} gramů, ${Math.round(odch) === 0 ? "přesně" : `o ${cislo(Math.abs(Math.round(odch)))} ${odch > 0 ? "víc" : "míň"}`}.`);
    if (Math.round(odch) === 0) p.zprava("Přesně 500 g!");
    else if (!serie && vahy.length >= 3 && vahy.slice(-3).every((w) => Math.abs(w - CIL) <= 10) && k.i === vahy.length - 1) {
      serie = true;
      p.zprava("Tři za sebou do 10 g!");
    }
    if (Math.abs(odch) <= 8) {
      if (Math.random() < 0.6) rekni(nahodne(PRESNE));
    } else if (odch > 60) rekni(nahodne(TEZKE));
    else if (odch < -60) rekni(nahodne(LEHKE));
    k.tHnet = performance.now() + (klid ? 650 : 360);
  };

  /** Miska je volná — dál se krojí, nebo se končí */
  const miskaVolna = () => {
    rucCil = uhelVahy(0);
    if (hotovo || faze === "zaver" || faze === "konec") return;
    if (vahy.length >= HROUD || L >= blok.delka - 0.01) {
      zaver();
      return;
    }
    if (blok.delka - L < 2 * MIN_KUS + 0.01) {
      /* Na další řez už nezbylo — co zbylo, je poslední hrouda */
      p.zprava("Došla hlína.");
      rez(L, blok.delka, true);
      return;
    }
    faze = "miri";
    dratG.classList.remove("mh1-ceka");
    nastavDrat(dratX);
  };

  const hybejKusem = (k: Kus, t: number) => {
    const cil = cilKrajice(k);
    if (k.stav === "krajic") {
      const e = t - k.t0;
      if (e < T_ODDELENI) {
        const u = hladce(e / T_ODDELENI);
        polozKrajic(k, -7 * u, 0, -3 * u, 1, 1);
      } else if (e < T_ODDELENI + T_SKOK) {
        const u = (e - T_ODDELENI) / T_SKOK;
        const v = hladce(u);
        const x = mix(-7, cil.dx, v);
        const y = mix(0, cil.dy, v) - 4 * 46 * u * (1 - u);
        const natah = Math.sin(u * Math.PI);
        polozKrajic(k, x, y, mix(-3, 0, v) - natah * 7, 1 - natah * 0.04, 1 + natah * 0.07);
      } else {
        k.stav = "vaha";
        k.tDopad = t;
        naVahu(k);
      }
    }
    if (k.stav === "vaha") {
      const d = t - k.tDopad;
      const s = klid ? 0 : Math.exp(-d / 110) * Math.cos(d * 0.028);
      polozKrajic(k, cil.dx, cil.dy, 0, 1 + s * 0.09, 1 - s * 0.13);
      /* Pojistka, kdyby se ručička neustálila (třeba při skoku času) */
      if (!k.zvazeno && d > 1600) zvazeno(k);
      if (k.zvazeno && t >= k.tHnet) {
        k.stav = "hnete";
        if (!klid) {
          zvuk.hnet();
          naplanuj(190, () => zvuk.hnet());
        }
      }
    }
    if (k.stav === "hnete") {
      const d = klid ? 1 : omez((t - k.tHnet) / T_HNETENI);
      const vlna = Math.sin(d * Math.PI * 4) * (1 - d);
      const zmensi = mix(1, 0.5, hladce(d));
      polozKrajic(k, cil.dx, cil.dy, 0, zmensi * (1 + vlna * 0.16), zmensi * (1 - vlna * 0.14));
      k.krajic.setAttribute("opacity", (1 - omez((d - 0.35) / 0.4)).toFixed(2));
      k.kouleG.setAttribute("opacity", omez((d - 0.3) / 0.4).toFixed(2));
      polozKouli(k, VAHA.x, VAHA.miska + 1 - k.r, mix(0.6, 1, pruzne(d)), 0, 0.6);
      if (d >= 1) {
        k.stav = "jede";
        k.tPryc = t;
        k.krajic.remove();
        miskaVolna();
        if (klid) {
          k.stav = "doma";
          polozKouli(k, PODNOS.x + k.i * PODNOS.krok, PODNOS.y, 1, 0, 1);
          pridejCedulku(k);
        }
      }
    }
    if (k.stav === "jede") {
      /* Z misky jedním obloukem přes ostatní koule rovnou na své místo */
      const d = t - k.tPryc;
      const xC = PODNOS.x + k.i * PODNOS.krok;
      const y0 = VAHA.miska + 1 - k.r;
      const dx = xC - VAHA.x;
      const let_ = T_SESKOK + dx * 0.42;
      if (d < let_) {
        const u = d / let_;
        const x = mix(VAHA.x, xC, u);
        const y = mix(y0, PODNOS.y, u) - 4 * (58 + dx * 0.09) * u * (1 - u);
        polozKouli(k, x, y, 1, u * (dx / k.r) * (180 / Math.PI) * 0.6, 0);
      } else {
        if (!k.el.dataset.dopad) {
          k.el.dataset.dopad = "1";
          zvuk.drevo(0.85);
        }
        /* Dopad: splácnutí a malý odskok */
        const v = (d - let_) / 300;
        const odskok = v < 1 ? -Math.abs(Math.sin(v * Math.PI * 2)) * 6 * (1 - v) : 0;
        const rot = (dx / k.r) * (180 / Math.PI) * 0.6;
        polozKouli(k, xC, PODNOS.y + odskok, 1, rot, 1);
        if (v >= 0.35 && !k.cedulka) pridejCedulku(k);
        if (v >= 1) k.stav = "doma";
      }
    }
  };

  const pridejCedulku = (k: Kus) => {
    if (k.cedulka) return;
    k.cedulka = true;
    const obal = document.createElementNS(SVGNS, "g");
    obal.setAttribute("transform", `translate(${PODNOS.x + k.i * PODNOS.krok} 471)`);
    const vnitrek = document.createElementNS(SVGNS, "g");
    vnitrek.setAttribute("class", "mh1-cedulka");
    vnitrek.innerHTML = cedulka(k.g, k.i);
    obal.append(vnitrek);
    cedulkyG.append(obal);
    if (!klid) zvuk.papir();
  };

  /* ——— Výsledek nad váhou ——— */
  const ukazVysledek = (g: number) => {
    const odch = g - CIL;
    vysledekText.textContent = "";
    const a = document.createElementNS(SVGNS, "tspan");
    /* Nezlomitelné mezery — obyčejná by se na hranici tspanů ztratila */
    a.textContent = `${cislo(Math.round(g))} g\u00a0·\u00a0`;
    const b = document.createElementNS(SVGNS, "tspan");
    b.textContent = odchylkaText(odch);
    b.setAttribute("fill", barvaOdchylky(odch));
    b.setAttribute("font-weight", "700");
    vysledekText.append(a, b);
    const sirka = Math.max(110, (a.textContent.length + b.textContent.length) * 12.4 + 30);
    vysledekPapir.setAttribute("x", f1(-sirka / 2));
    vysledekPapir.setAttribute("width", f1(sirka));
    vysledekG.setAttribute("transform", `translate(${VAHA.x + 6} 122)`);
    vysledekG.setAttribute("opacity", "1");
    vysledekTelo.classList.remove("mh1-pop");
    void vysledekTelo.getBoundingClientRect();
    if (!klid) vysledekTelo.classList.add("mh1-pop");
  };
  const schovejVysledek = () => {
    vysledekG.setAttribute("opacity", "0");
    vysledekTelo.classList.remove("mh1-pop");
  };

  /* ——— Konec ——— */
  const zbytekGramu = () => (L < blok.delka - 0.01 ? hmotnostMezi(blok, L, blok.delka) : 0);

  const zaver = () => {
    if (faze === "zaver" || faze === "konec") return;
    faze = "zaver";
    dratG.classList.add("mh1-pryc");
    const zbytek = zbytekGramu();
    let za = 0;
    if (hlMisto === "blok") {
      if (hlPohyb?.typ === "valeni") hlPohyb = null;
      usni();
      presunHlinku({ kam: "pytel" });
      za = klid ? 0 : 520;
    }
    if (zbytek > 0.5) {
      naplanuj(za, () => {
        const cx = (sx(L) + sx(blok.delka)) / 2;
        zbytekCesta = { t0: performance.now(), cx };
        if (klid) blokG.setAttribute("opacity", "0");
      });
      naplanuj(za + (klid ? 0 : 820), () => {
        zvuk.zuch();
        p.zprava(`Zbytek ${cislo(Math.round(zbytek))} g zpátky do pytle.`);
        const el = document.createElementNS(SVGNS, "text");
        el.setAttribute("class", "mh1-plovouci");
        el.setAttribute("x", String(PYTEL.x));
        el.setAttribute("y", String(PYTEL.y - 52));
        el.setAttribute("text-anchor", "middle");
        el.textContent = `+${cislo(Math.round(zbytek))} g`;
        drobkyG.append(el);
        plovouci = { el, t0: performance.now() };
      });
    }
    naplanuj(za + (klid ? 900 : 2000), dokonci);
  };

  const dokonci = () => {
    if (hotovo || zastaveno) return;
    hotovo = true;
    faze = "konec";
    const o = ohodnot(vahy, probuzeni);
    const zbytek = zbytekGramu();
    const odchylky = vahy.map((w) => w - CIL);
    const nejlepsi = odchylky.length ? odchylky.reduce((a, b) => (Math.abs(b) < Math.abs(a) ? b : a)) : 0;
    const prumerHotovych = vahy.length ? vahy.reduce((s, w) => s + Math.abs(w - CIL), 0) / vahy.length : 0;
    let veta: string;
    let udaje: [string, string][];
    if (probuzeni >= PROBUZENI_MAX) {
      veta = ODCHOD;
      udaje = [
        ["Hotové hroudy", `${vahy.length} ze ${HROUD}`],
        ["Průměrná odchylka", vahy.length ? `${cislo(Math.round(prumerHotovych))} g` : "—"],
        ["Probuzení", `${probuzeni}×`],
      ];
    } else if (vahy.length < HROUD) {
      veta = "Hlína došla dřív než hroudy. Příště menší kusy.";
      udaje = [
        ["Hroudy z bloku", `${vahy.length} ze ${HROUD}`],
        ["Průměrná odchylka", `${cislo(Math.round(o.odchylka))} g`],
        ["Probuzení", `${probuzeni}×`],
      ];
    } else {
      veta = !o.proslo
        ? "Šest různých hrud. Misky by se pohádaly. Ještě jednou?"
        : o.body >= 85
          ? "Šest stejných. Z toho budou šestojčata."
          : o.body >= 65
            ? "Skoro stejné. Misky to poznají, lidi ne."
            : "Budou to různě velké misky. To se taky nosí.";
      udaje = [
        ["Průměrná odchylka", `${cislo(Math.round(o.odchylka))} g`],
        ["Nejlepší řez", `${odchylkaText(nejlepsi)} g`],
        ["Probuzení", `${probuzeni}×`],
        ["Zbytek v pytli", `${cislo(Math.round(zbytek))} g`],
      ];
    }
    const v: Vysledek = { body: o.body, proslo: o.proslo, veta, udaje };
    p.konec(v);
  };

  /* ——— Smyčka ——— */
  const krok = (t: number) => {
    const dt = omez((t - predtim) / 1000, 0, 0.05);
    predtim = t;

    for (let i = 0; i < plan.length; ) {
      if (plan[i].t <= t) {
        const [u] = plan.splice(i, 1);
        u.fn();
        if (!bezi || hotovo) return;
      } else i++;
    }

    /* Ručička: tlumená pružina, pak cinkne */
    if (!klid) {
      const a = -190 * (rucUhel - rucCil) - 13 * rucRychlost;
      rucRychlost += a * dt;
      rucUhel += rucRychlost * dt;
    } else {
      rucUhel = rucCil;
      rucRychlost = 0;
    }
    if (Math.abs(rucUhel - rucKresleno) > 0.02) {
      rucKresleno = rucUhel;
      rucicka.setAttribute("transform", `rotate(${rucUhel.toFixed(2)} ${VAHA.x} ${VAHA.y})`);
    }
    if (naVaze && Math.abs(rucUhel - rucCil) < 1 && Math.abs(rucRychlost) < 15 && t - naVaze.tDopad > 250) zvazeno(naVaze);

    for (const k of kusy) if (k.stav !== "doma") hybejKusem(k, t);
    if (!bezi || hotovo) return;

    for (let i = drobky.length - 1; i >= 0; i--) {
      const d = drobky[i];
      if (d.y < d.zem) {
        d.vy += 620 * dt;
        d.x += d.vx * dt;
        d.y = Math.min(d.zem, d.y + d.vy * dt);
      }
      const vek = t - d.t0;
      d.el.setAttribute("cx", f1(d.x));
      d.el.setAttribute("cy", f1(d.y));
      d.el.setAttribute("opacity", omez(1 - (vek - 900) / 500).toFixed(2));
      if (vek > 1400) {
        d.el.remove();
        drobky.splice(i, 1);
      }
    }

    if (zbytekCesta) {
      const u = omez((t - zbytekCesta.t0) / 820);
      const e = u * u * (3 - 2 * u);
      const dx = (PYTEL.x - zbytekCesta.cx) * e;
      const dy = (PYTEL.y + 26 - ZAKLAD) * e - Math.sin(u * Math.PI) * 70;
      const s = mix(1, 0.42, e);
      const c = zbytekCesta.cx;
      blokG.setAttribute("transform", `translate(${f1(dx)} ${f1(dy)}) translate(${f1(c)} ${ZAKLAD}) scale(${s.toFixed(3)}) translate(${f1(-c)} ${-ZAKLAD})`);
      blokG.setAttribute("opacity", omez((1 - u) / 0.25).toFixed(2));
      if (u >= 1) zbytekCesta = null;
    }
    if (plovouci) {
      const u = omez((t - plovouci.t0) / 1500);
      plovouci.el.setAttribute("transform", `translate(0 ${f1(-u * 26)})`);
      plovouci.el.setAttribute("opacity", omez(Math.min(u / 0.12, (1 - u) / 0.35)).toFixed(2));
    }

    hybejHlinkou(t);
    kresliDrat(t);
  };

  const smycka = () => {
    if (!bezi) return;
    krok(performance.now());
    if (bezi && !hotovo) raf = requestAnimationFrame(smycka);
  };

  /* ——— Výchozí stav scény (DOM zůstává z minulého pokusu) ——— */
  koren.dataset.seme = String(seme);
  blokG.removeAttribute("transform");
  blokG.removeAttribute("opacity");
  blokG.innerHTML = blokSvg(blok, 0);
  kusyG.textContent = "";
  cedulkyG.textContent = "";
  drobkyG.textContent = "";
  rucicka.setAttribute("transform", `rotate(${uhelVahy(0).toFixed(2)} ${VAHA.x} ${VAHA.y})`);
  rucKresleno = uhelVahy(0);
  schovejVysledek();
  dratG.setAttribute("class", "mh1-drat");
  dratRez.setAttribute("opacity", "0");
  okno.classList.remove("mh1-hraje", "mh1-miri");
  hlinkaEl.className = "mh1-hlinka";
  hlaseni.textContent = "";
  usadNaBlok(sx(blok.delka * 0.6));
  kresliHlinku();
  kresliDrat(0);
  ukazatel();

  /* ——— Vstup ——— */
  /** Kde je ukazatel, v centimetrech od začátku bloku */
  const zUkazatele = (e: PointerEvent) => {
    const b = zadni.getBoundingClientRect();
    return zeSceny(((e.clientX - b.left) / Math.max(1, b.width)) * SIRKA);
  };
  let miriPrst: number | null = null;
  let historie: { t: number; x: number }[] = [];
  const zaznamenej = (x: number) => {
    const t = performance.now();
    historie.push({ t, x });
    while (historie.length > 2 && t - historie[0].t > 320) historie.shift();
  };
  /** Prst při zvedání ujede — vezme se, kde byl drát před 60 ms, pokud se jen chvěl */
  const klidnaPoloha = () => {
    if (historie.length < 2) return null;
    const posledni = historie[historie.length - 1];
    let pred: { t: number; x: number } | null = null;
    for (const h of historie) if (posledni.t - h.t >= 60) pred = h;
    if (!pred) return null;
    return Math.abs(posledni.x - pred.x) < 0.6 ? pred.x : null;
  };

  const pripoj = () => {
    okno.addEventListener(
      "pointermove",
      (e) => {
        if (!bezi || hotovo) return;
        if (e.pointerType === "mouse" ? miriPrst === null || miriPrst === e.pointerId : miriPrst === e.pointerId) {
          const x = zUkazatele(e);
          nastavDrat(x);
          if (miriPrst === e.pointerId) zaznamenej(dratX);
        }
      },
      { signal },
    );
    okno.addEventListener(
      "pointerdown",
      (e) => {
        if (!bezi || hotovo) return;
        if (e.pointerType === "mouse" && e.button !== 0) return;
        void zvuk.odemkni();
        miriPrst = e.pointerId;
        try {
          okno.setPointerCapture(e.pointerId);
        } catch {
          /* bez zachycení to jde taky */
        }
        historie = [];
        nastavDrat(zUkazatele(e));
        zaznamenej(dratX);
        okno.classList.add("mh1-miri");
        e.preventDefault();
      },
      { signal },
    );
    const pust = (e: PointerEvent, zrus: boolean) => {
      if (e.pointerId !== miriPrst) return;
      miriPrst = null;
      okno.classList.remove("mh1-miri");
      try {
        if (okno.hasPointerCapture(e.pointerId)) okno.releasePointerCapture(e.pointerId);
      } catch {
        /* nic */
      }
      if (zrus || !bezi || hotovo) return;
      const b = zadni.getBoundingClientRect();
      const venku = e.clientX < b.left || e.clientX > b.right || e.clientY < b.top || e.clientY > b.bottom;
      if (venku) return;
      if (e.pointerType !== "mouse") {
        const x = klidnaPoloha();
        if (x !== null) nastavDrat(x);
      }
      krojit();
    };
    okno.addEventListener("pointerup", (e) => pust(e, false), { signal });
    okno.addEventListener("pointercancel", (e) => pust(e, true), { signal });

    koren.addEventListener(
      "keydown",
      (e) => {
        if (!bezi || hotovo || e.altKey || e.ctrlKey || e.metaKey) return;
        const naTlacitku = e.target instanceof Element && !!e.target.closest("button");
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          posunDrat((e.key === "ArrowLeft" ? -1 : 1) * (e.shiftKey ? KROK_JEMNY : KROK_KLAVESA));
          e.preventDefault();
        } else if ((e.key === " " || e.key === "Enter") && !naTlacitku) {
          e.preventDefault();
          if (!e.repeat) {
            void zvuk.odemkni();
            krojit();
          }
        }
      },
      { signal },
    );

    btKrojit.addEventListener(
      "click",
      () => {
        void zvuk.odemkni();
        krojit();
      },
      { signal },
    );
    for (const b of btPosun) {
      const smer = Number(b.dataset.posun) < 0 ? -1 : 1;
      const dost = () => {
        window.clearTimeout(opakovani);
        opakovani = undefined;
      };
      b.addEventListener(
        "pointerdown",
        (e) => {
          if (e.pointerType === "mouse" && e.button !== 0) return;
          dost();
          posunDrat(smer * KROK_JEMNY);
          let n = 0;
          const dalsi = () => {
            posunDrat(smer * KROK_JEMNY);
            n++;
            opakovani = window.setTimeout(dalsi, Math.max(28, 110 - n * 7));
          };
          opakovani = window.setTimeout(dalsi, 380);
        },
        { signal },
      );
      for (const typ of ["pointerup", "pointerleave", "pointercancel"] as const) b.addEventListener(typ, dost, { signal });
      /* Z klávesnice (Enter, mezerník na tlačítku) přijde jen click bez pointerdown */
      b.addEventListener(
        "click",
        (e) => {
          if (e.detail === 0) posunDrat(smer * KROK_JEMNY);
        },
        { signal },
      );
    }
  };

  return {
    start() {
      if (bezi || zastaveno || hotovo) return;
      bezi = true;
      faze = "miri";
      predtim = performance.now();
      hlCas = predtim + 3500 + Math.random() * 2500;
      okno.classList.add("mh1-hraje");
      pripoj();
      try {
        okno.focus({ preventScroll: true });
      } catch {
        /* fokus není nutný */
      }
      /* Úvodní větu řekl rámec při otevření — když je stejná, Hlínka řekne jinou */
      const uvod = urovenPodleId("hrouda").uvod;
      naplanuj(500, () => rekni(uvod === START ? "Já tu jen spím. Krájej kolem mě." : START, true));
      raf = requestAnimationFrame(smycka);
    },
    stop() {
      zastaveno = true;
      bezi = false;
      cancelAnimationFrame(raf);
      window.clearTimeout(opakovani);
      plan.length = 0;
      ac.abort();
      okno.classList.remove("mh1-miri");
    },
  };
};
