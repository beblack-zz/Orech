/**
 * Jízdenka (components/rezervace/Jizdenka.astro): údaje, obrázek s vláčkem
 * a označení.
 *
 * Vláček má vůz na každý vybraný odjezd, na cedulce vozu je jeho čas
 * a v oknech sedí tvoje skupina — hodina se zamlouvá celá, takže nikdo
 * cizí s vámi nejede. Obloha obrázku je obloha první vybrané hodiny. Když se
 * vybere první hodina, vláček přijede; s další hodinou se připojí vůz
 * a vláček sebou trhne. Výřez obrázku se přizpůsobí délce vlaku, ať je
 * vidět celý.
 *
 * Jízdenka umí ještě dvě podoby (třída na .rz-listek):
 *
 *   kurz  zvláštní jízdenka: na obrázku parní vlak se salonem, kde vedle
 *         stínů ostatních přihlášených sedí tvoje skupina, a obloha nad
 *         ním pomalu projde celý den kurzu od rána do večera. Pod údaji
 *         je mapa trasy — program kurzu jako zastávky na lince.
 *   pas   permanentka na jeden den v týdnu: vůz na každý spoj (ranní,
 *         večerní), v něm ostatní držitelé jako stíny. Pod údaji jsou
 *         všechny jízdy, na které platí — každý týden jedna; dny kurzů
 *         jsou přeškrtnuté (výluka).
 *
 * Kde vláček je, říká proměnná --l-x na obrázku; dědí ji vlak i jeho
 * odraz (<use>), takže jedou spolu.
 */
import { vlak, delka, zvlastniVlak, DELKA_ZVLASTNIHO } from "../../components/rezervace/vlak";
import type { Misto } from "../../components/rezervace/vlak";
import { rezervace as R, permanentka as P, hhmm } from "../../data/rezervace";
import { sklonuj, zPoctu } from "../../data/pocty";
import { paleta } from "../parta2/paleta";
import { klid, omez, mix, mixBarva, hladce } from "../parta2/stav";
import * as zvuk from "../parta2/zvuk";
import { BARVY_LIDI, KAZDY, mistaKurzu } from "./odjezdy";
import type { Den, KurzDne, Jizda } from "./simulace";

const DNY = ["neděle", "pondělí", "úterý", "středa", "čtvrtek", "pátek", "sobota"];
const MESICE = ["leden", "únor", "březen", "duben", "květen", "červen", "červenec", "srpen", "září", "říjen", "listopad", "prosinec"];
const MESICE_2 = ["ledna", "února", "března", "dubna", "května", "června", "července", "srpna", "září", "října", "listopadu", "prosince"];
const dvoj = (n: number) => String(n).padStart(2, "0");
const kc = (n: number) => `${n.toLocaleString("cs-CZ")} Kč`;
const lidi = (n: number) => (n === 1 ? "1 člověk" : `${n} lidi`);
const odjezdu = (n: number) => sklonuj(n, "odjezd", "odjezdy", "odjezdů");
/** Kolik času je n odjezdů: „1,5 hodiny“, „3 hodiny“, „6 hodin“ */
const trvani = (n: number) => {
  const h = n * R.blok;
  return `${String(h).replace(".", ",")} ${!Number.isInteger(h) || (h >= 2 && h <= 4) ? "hodiny" : h === 1 ? "hodina" : "hodin"}`;
};
const datum = (d: Date) => `${d.getDate()}. ${MESICE_2[d.getMonth()]} ${d.getFullYear()}`;

/** Poměr stran obrázku — stejný jako aspect-ratio v rezervace.css */
const POMER = 2.5;
/** Jak dlouho trvá obloze nad zvláštním vlakem cesta od rána do večera (a pak zase zpátky) */
const DEN_KURZU = 48000;
const naJaro = (t: number) => 1 - Math.pow(1 - t, 3);
const rozjezd = (t: number) => t * t;

/** Odjezdy po sobě se slijí do jednoho úseku: 9:00–12:00, 15:00–16:30 */
export const useky = (hodiny: number[]) => {
  const out: [number, number][] = [];
  for (const x of [...hodiny].sort((a, b) => a - b)) {
    const p = out[out.length - 1];
    if (p && p[1] === x) p[1] = x + R.blok;
    else out.push([x, x + R.blok]);
  }
  return out.map(([a, b]) => `${hhmm(a)}–${hhmm(b)}`).join(", ");
};

/** Odjezdová melodie — japonská nádraží hrají před odjezdem krátkou znělku */
const melodie = () =>
  [1318.5, 1568, 1760, 2349.3, 1975.5, 1760, 1568, 1975.5].forEach((f, i) => window.setTimeout(() => zvuk.furin(f, 0.09), i * 150));

const prvek = <K extends keyof HTMLElementTagNameMap>(tag: K, trida: string, text = "") => {
  const el = document.createElement(tag);
  if (trida) el.className = trida;
  if (text) el.textContent = text;
  return el;
};

export interface UdajeJizdenky {
  den?: Den;
  hodiny: number[];
  osob: number;
  cena: number;
  /** Nastupuje se do zvláštního vlaku toho dne */
  kurz?: KurzDne;
  /** Permanentka: na které spoje, odkdy dokdy a kolik jich je už prodaných */
  pas?: { spoje: number[]; platnost: { od: Date; do: Date; jizdy: Jizda[] }; obsazeno: ReadonlyMap<number, number> };
  /** Zamlouvá člen se svým odkazem — jízdenka platí hned, nikdo ji nepotvrzuje */
  hned?: boolean;
}

type Druh = "hodiny" | "kurz" | "pas";

export function initJizdenka() {
  const koren = document.querySelector<HTMLElement>(".rz-listek");
  const scena = koren?.querySelector<SVGSVGElement>(".rz-listek-scena");
  const vlakG = scena?.querySelector<SVGGElement>(".rz-l-vlak");
  if (!koren || !scena || !vlakG) return null;
  const obraz = koren.querySelector<HTMLElement>(".rz-listek-obraz")!;
  const prazdno = koren.querySelector<HTMLElement>(".rz-listek-prazdno")!;
  const slunce = scena.querySelector<SVGCircleElement>(".rz-l-slunce")!;
  const nebeG = scena.querySelector<SVGLinearGradientElement>("#rz-l-nebe");
  const moreG = scena.querySelector<SVGLinearGradientElement>("#rz-l-more");
  const cislo = koren.querySelector<HTMLElement>(".rz-listek-cislo b")!;
  const lDen = koren.querySelector<HTMLElement>(".rz-l-den")!;
  const lHodiny = koren.querySelector<HTMLElement>(".rz-l-hodiny")!;
  const lLide = koren.querySelector<HTMLElement>(".rz-l-lide")!;
  const lCena = koren.querySelector<HTMLElement>(".rz-l-cena")!;
  const napis = (trida: string) => koren.querySelector<HTMLElement>(trida);
  const druhText = napis(".rz-listek-druh-text");
  const cilText = napis(".rz-listek-cil-text");
  const radekVlaku = napis(".rz-listek-vlak");
  const denPopis = napis(".rz-l-den-popis");
  const hodinyPopis = napis(".rz-l-hodiny-popis");
  const program = napis(".rz-listek-program");
  const jizdy = napis(".rz-listek-jizdy");
  const jizdyPopis = napis(".rz-lj-popis");
  const jizdyMesice = napis(".rz-lj-mesice");
  const platnost = napis(".rz-listek-platnost");

  let pocet = 0;
  let druh: Druh = "hodiny";
  let W = 960;
  let x = 0;
  let animace = 0;
  let cekaPrijezd = false;
  let videt = false;
  /** Poslední výřez obrázku — podle něj se umisťuje slunce */
  let ram = { L: 520, w: 1100, hgt: 440 };

  const posun = (nove: number) => {
    x = nove;
    scena.style.setProperty("--l-x", x.toFixed(1));
  };
  /**
   * Plynule z jednoho místa na druhé; s omezeným pohybem rovnou. Zpětné
   * volání, ne Promise — kód po await už by po přechodu na jinou stránku
   * nepatřil téhle (parta2/prechody.ts) a nevypnul by se.
   */
  const jed = (od: number, kam: number, doba: number, prubeh: (t: number) => number, potom?: () => void) => {
    cancelAnimationFrame(animace);
    if (klid || doba <= 0) {
      posun(kam);
      potom?.();
      return;
    }
    const start = performance.now();
    const krok = (t: number) => {
      const p = omez((t - start) / doba);
      posun(mix(od, kam, prubeh(p)));
      if (p < 1) animace = requestAnimationFrame(krok);
      else potom?.();
    };
    animace = requestAnimationFrame(krok);
  };

  const prijed = () => {
    cekaPrijezd = false;
    if (!pocet) return;
    jed(-W, 0, druh === "kurz" ? 2100 : 1500, naJaro, () => {
      zvuk.drevo(0.6);
      if (druh === "kurz") zvuk.para();
    });
  };

  /** Obloha a slunce obrázku podle hodiny */
  const osvetli = (h: number) => {
    const p = paleta(h + 0.5);
    const [a, b, c] = p.barvy;
    scena.style.setProperty("--l-nebe-a", a);
    scena.style.setProperty("--l-nebe-b", b);
    scena.style.setProperty("--l-nebe-c", c);
    scena.style.setProperty("--vl-sklo", mixBarva(c, "#EFE4E4", 0.42));
    scena.style.setProperty("--vl-sedadla", mixBarva(b, "#5E4A56", 0.62));
    scena.style.setProperty("--vl-noc", p.hvezdy.toFixed(2));
    const t = omez((h + 0.5 - 5.3) / (20.4 - 5.3));
    slunce.setAttribute("cx", ((ram.L - ram.w) / 2 + ram.w * (0.12 + 0.76 * t)).toFixed(1));
    slunce.setAttribute("cy", (-ram.hgt * 0.64 * Math.sin(Math.PI * t) * 0.78 - 8).toFixed(1));
    slunce.setAttribute("r", (ram.hgt * 0.2).toFixed(1));
  };

  /* Nad zvláštním vlakem jde obloha pomalu celým dnem kurzu a zase zpátky —
     jen když je obrázek vidět a pohyb není omezený. Překresluje se po krocích,
     ne v každém snímku. */
  let denOd = 0;
  let denDo = 0;
  let denStart = 0;
  let denSmycka = 0;
  let denNaposled = -1;
  const krokDne = (t: number) => {
    denSmycka = 0;
    if (druh !== "kurz" || !pocet) return;
    if (videt) {
      const f = ((t - denStart) / DEN_KURZU) % 2;
      const h = mix(denOd, denDo, hladce(f < 1 ? f : 2 - f));
      if (Math.abs(h - denNaposled) > 0.03) {
        denNaposled = h;
        osvetli(h);
      }
    }
    denSmycka = requestAnimationFrame(krokDne);
  };
  const spustDen = (od: number, kam: number) => {
    denOd = od;
    denDo = kam;
    if (klid || denSmycka) return;
    denStart = performance.now();
    denNaposled = -1;
    denSmycka = requestAnimationFrame(krokDne);
  };

  new IntersectionObserver(([e]) => {
    videt = e.isIntersecting;
    if (videt && cekaPrijezd) prijed();
  }, { threshold: 0.35 }).observe(obraz);

  const vyrez = (L: number) => {
    let w = L + 440;
    let hgt = w / POMER;
    if (hgt < 440) {
      hgt = 440;
      w = hgt * POMER;
    }
    W = w;
    const y0 = -hgt * 0.64;
    scena.setAttribute("viewBox", `${((L - w) / 2).toFixed(1)} ${y0.toFixed(1)} ${w.toFixed(1)} ${hgt.toFixed(1)}`);
    scena.style.setProperty("--l-w", w.toFixed(1));
    /* Přechod oblohy od horního okraje výřezu k obzoru, moře od obzoru dolů — nad a pod tím barva pokračuje */
    nebeG?.setAttribute("y1", y0.toFixed(1));
    nebeG?.setAttribute("y2", "-14");
    moreG?.setAttribute("y1", "-14");
    moreG?.setAttribute("y2", (y0 + hgt).toFixed(1));
    ram = { L, w, hgt };
  };

  /** Mapa trasy zvláštního vlaku: zastávky programu a na konci cíl */
  const kresliProgram = (k: KurzDne | undefined) => {
    if (!program) return;
    program.hidden = !k;
    program.textContent = "";
    if (!k) return;
    const zastavky = [...k.kurz.program].sort((a, b) => a.h - b.h);
    const konec = (zastavky[zastavky.length - 1]?.h ?? R.do - R.blok) + R.blok;
    program.style.setProperty("--zastavek", String(zastavky.length + 1));
    for (const z of [...zastavky.map((x) => ({ ...x, cil: false })), { h: konec, nazev: "Cíl", popis: "Vlak je zpátky v Ořechu.", cil: true }]) {
      const li = prvek("li", z.cil ? "rz-lp-cil" : "");
      li.title = z.popis;
      li.append(prvek("span", "rz-lp-cas", hhmm(z.h)), prvek("i", ""), prvek("span", "rz-lp-nazev", z.nazev));
      program.append(li);
    }
  };

  /** Jízdy permanentky po měsících — každá je políčko, výluky jsou přeškrtnuté */
  const kresliJizdy = (pas: UdajeJizdenky["pas"]) => {
    if (!jizdy || !jizdyMesice || !jizdyPopis) return;
    jizdy.hidden = !pas;
    jizdyMesice.textContent = "";
    if (!pas) return;
    const plati = pas.platnost.jizdy.filter((j) => !j.vyluka).length;
    const vyluk = pas.platnost.jizdy.length - plati;
    jizdyPopis.textContent = `${sklonuj(plati, "jízda", "jízdy", "jízd")} na jeden spoj${vyluk ? ` · ${sklonuj(vyluk, "výluka", "výluky", "výluk")}, když jede kurz` : ""}`;
    let mesic = -1;
    let radek: HTMLElement | null = null;
    for (const j of pas.platnost.jizdy) {
      if (j.datum.getMonth() !== mesic) {
        mesic = j.datum.getMonth();
        radek = prvek("p", "rz-lj-mesic");
        radek.append(prvek("b", "", MESICE[mesic]));
        jizdyMesice.append(radek);
      }
      const den = prvek("span", `rz-lj-den den-${j.datum.getDay()}${j.vyluka ? " vyluka" : ""}`, `${j.datum.getDate()}`);
      den.title = `${DNY[j.datum.getDay()]} ${j.datum.getDate()}. ${MESICE_2[mesic]}${j.vyluka ? " — výluka, jede kurz" : ""}`;
      radek?.append(den);
    }
  };

  return {
    obnov(u: UdajeJizdenky, zmenaVybrane: boolean) {
      const hodiny = [...u.hodiny].sort((a, b) => a - b);
      const d = u.den;
      const novy: Druh = u.kurz ? "kurz" : u.pas ? "pas" : "hodiny";
      const n = novy === "kurz" ? 1 : novy === "pas" ? u.pas!.spoje.length : hodiny.length;
      const zmenaDruhu = novy !== druh;
      druh = novy;
      koren.classList.toggle("kurz", druh === "kurz");
      koren.classList.toggle("pas", druh === "pas");
      const dlouhyDen = d ? `${DNY[d.datum.getDay()]} ${datum(d.datum)}` : "ještě nevybraný";
      const ddmm = d ? `${dvoj(d.datum.getDate())}${dvoj(d.datum.getMonth() + 1)}` : "";

      /* Hlavička a trasa podle toho, co se kupuje */
      const c = u.kurz?.kurz;
      if (druhText) druhText.textContent = druh === "kurz" ? "Zvláštní jízdenka na kurz" : druh === "pas" ? "Permanentka do dílny" : "Jízdenka do dílny";
      if (cilText) cilText.textContent = c ? c.nazev : "Dílna";
      if (radekVlaku) {
        radekVlaku.hidden = druh === "hodiny";
        radekVlaku.textContent =
          druh === "kurz" && c
            ? `Zvláštní vlak „${c.vlak}“ (${c.cteni} — ${c.vyznam}) · lektor ${c.lektor}`
            : druh === "pas"
              ? `${d ? KAZDY[d.datum.getDay()].replace(/^k/, "K") : "Jeden den v týdnu"} po ${P.mesicu} měsíce, pokaždé stejným spojem.`
              : "";
      }
      if (denPopis) denPopis.textContent = druh === "pas" ? "Platí" : "Den";
      if (hodinyPopis) hodinyPopis.textContent = druh === "pas" ? "Spoj" : "Odjezd";
      if (platnost) {
        const az = u.hned ? "." : ", až ji potvrdíme.";
        platnost.textContent =
          druh === "kurz"
            ? `Platí na uvedený kurz${az}`
            : druh === "pas"
              ? `Platí na uvedený spoj po celou dobu platnosti${az}`
              : `Platí pro uvedený den a odjezd${az}`;
      }

      /* Údaje */
      if (druh === "kurz" && c && d) {
        const hodinyKurzu = c.program.map((z) => z.h);
        const od = Math.min(...hodinyKurzu);
        const konec = Math.max(...hodinyKurzu) + R.blok;
        lDen.textContent = dlouhyDen;
        lHodiny.textContent = `${hhmm(od)}–${hhmm(konec)} · celý den, ${sklonuj(c.program.length, "zastávka", "zastávky", "zastávek")}`;
        lLide.textContent = `${lidi(u.osob)} · ${u.osob === 1 ? "jedno místo" : `${u.osob} místa`} ${zPoctu(c.mist)}`;
        lCena.textContent = `${kc(u.osob * c.cena)} · ${lidi(u.osob)} × ${kc(c.cena)}`;
        cislo.textContent = `${ddmm}·Z·${u.osob}`;
      } else if (druh === "pas" && u.pas) {
        const pl = u.pas.platnost;
        const pocetJizd = pl.jizdy.filter((j) => !j.vyluka).length;
        const celkem = u.pas.spoje.length * u.osob * P.cena;
        lDen.textContent = `od ${datum(pl.od)} do ${datum(pl.do)}`;
        lHodiny.textContent = `${u.pas.spoje.map((h) => `${P.spoje.find((s) => s.h === h)?.nazev ?? ""} ${hhmm(h)}–${hhmm(h + R.blok)}`).join(" a ")}${d ? ` · ${KAZDY[d.datum.getDay()]}` : ""}`;
        lLide.textContent = lidi(u.osob);
        lCena.textContent = `${kc(celkem)}${pocetJizd ? ` · jedna jízda vyjde na ${kc(Math.round(P.cena / pocetJizd))}` : ""}`;
        cislo.textContent = `${ddmm}·P${u.pas.spoje.join("+")}·${u.osob}`;
      } else {
        lDen.textContent = dlouhyDen;
        lHodiny.textContent = hodiny.length ? `${useky(hodiny)} · ${trvani(hodiny.length)}` : "ještě nevybraný";
        lLide.textContent = lidi(u.osob);
        lCena.textContent = hodiny.length ? `${kc(hodiny.length * u.osob * u.cena)} · ${odjezdu(hodiny.length)} × ${lidi(u.osob)} × ${kc(u.cena)}` : `${kc(u.cena)} za člověka a hodinu a půl`;
        cislo.textContent = d && hodiny.length ? `${ddmm}·${hhmm(hodiny[0]).replace(":", "").padStart(4, "0")}·${u.osob}` : "—";
      }
      koren.classList.toggle("je-vyplnena", !!d && n > 0);
      kresliProgram(u.kurz);
      kresliJizdy(u.pas);

      /* Obrázek */
      if (druh === "kurz" && u.kurz && c) {
        vyrez(DELKA_ZVLASTNIHO);
        vlakG.innerHTML = zvlastniVlak({ mista: mistaKurzu(u.kurz, u.osob, true), emblem: c.emblem, cedule: c.nazev });
        const hodinyKurzu = c.program.map((z) => z.h);
        /* Když už obloha dnem jde, zůstane, kde je — jinak začíná ráno */
        osvetli(denSmycka && denNaposled >= 0 ? denNaposled : Math.min(...hodinyKurzu));
        spustDen(Math.min(...hodinyKurzu), Math.max(...hodinyKurzu));
      } else if (druh === "pas" && u.pas) {
        vyrez(delka(n));
        /* Na spoji sedí i ostatní držitelé permanentky — jako stíny na krajích vozu */
        const vozy = u.pas.spoje.map((h) => {
          const mista: Misto[] = Array(6).fill(null);
          [2, 3, 1, 4].slice(0, u.osob).forEach((m, k) => (mista[m] = { kdo: "ty", barva: BARVY_LIDI[k] }));
          [0, 5, 4, 1].filter((m) => !mista[m]).slice(0, u.pas!.obsazeno.get(h) ?? 0).forEach((m) => (mista[m] = { kdo: "stin" }));
          return { cislo: `${h}`, mista };
        });
        vlakG.innerHTML = vlak(vozy, { smer: 1 });
        osvetli(u.pas.spoje[0]);
      } else {
        vyrez(delka(Math.max(1, n)));
        /* Vůz je celý váš — skupina sedí uprostřed, zbytek oken je prázdný */
        const mista: Misto[] = Array(6).fill(null);
        [2, 3, 1, 4].slice(0, u.osob).forEach((m, k) => (mista[m] = { kdo: "ty", barva: BARVY_LIDI[k] }));
        vlakG.innerHTML = n ? vlak(hodiny.map((h) => ({ cislo: hhmm(h), mista })), { smer: 1 }) : "";
        osvetli(hodiny[0] ?? 10);
      }
      prazdno.hidden = n > 0;
      prazdno.textContent = d?.kurz ? "Nastup na tabuli a zvláštní vlak přijede." : "Vyber odjezd a vlak přijede.";

      /* Jiný druh jízdenky je jiný vlak — přijede znovu, ne že by se jen přepřáhl */
      const bylo = zmenaDruhu ? 0 : pocet;
      pocet = n;
      koren.classList.remove("oznacena");
      if (!n) {
        cancelAnimationFrame(animace);
        posun(0);
        return;
      }
      if (!zmenaVybrane) return;
      if (bylo === 0) {
        if (klid) return posun(0);
        posun(-W);
        if (videt) prijed();
        else cekaPrijezd = true;
      } else if (bylo !== n && videt) {
        /* Připojil se nebo odpojil vůz — vláček sebou trhne */
        jed(bylo < n ? -26 : 18, 0, 420, naJaro);
        zvuk.drevo(bylo < n ? 0.7 : 0.55);
      }
    },

    /** Průvodčí označí jízdenku: cvak, razítko, melodie a vláček odjede */
    oznac() {
      koren.classList.remove("oznacena");
      void koren.offsetWidth;
      koren.classList.add("oznacena");
      zvuk.spoust();
      window.setTimeout(() => zvuk.razitko(), 260);
      window.setTimeout(melodie, 480);
      if (druh === "kurz") window.setTimeout(() => zvuk.para(), 560);
      if (klid) return;
      window.setTimeout(() => {
        jed(0, W * 1.1, druh === "kurz" ? 2100 : 1500, rozjezd, () => {
          /* Za chvíli přijede další — jízdenka zůstane označená */
          window.setTimeout(() => {
            if (!pocet) return;
            posun(-W);
            prijed();
          }, 1400);
        });
      }, 520);
    },
  };
}

export type Jizdenka = NonNullable<ReturnType<typeof initJizdenka>>;
