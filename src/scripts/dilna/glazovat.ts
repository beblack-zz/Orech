/**
 * Glazovat — kout s glazurami (components/dilna/Glazovat.astro).
 *
 * Glazuje se tvůj kus (po přežahu), nebo naše miska, dokud žádný nemáš.
 * Kbelík na polici vybere glazuru do velkého kbelíku dole. Namáčí se
 * celý kus, nebo do půlky okrajem napřed — kus se v kleštích otočí
 * hlavou dolů. Dvě vrstvy nanejvýš. Syrová glazura je bledá; barvu ukáže
 * až pec. Kdo před výpalem neotře dno, má kus přilepený k Šamotce.
 *
 * Výpal jede po pálicí křivce z Party 2 (data/kami.ts), jen zrychleně:
 * pět vteřin nahoru, chvíle chladnutí, víko. Hotový kus se uloží a ukáže
 * se v dílně na regálu, na cestě i v noci.
 */
import { omez, hladce, klid, cislo } from "../parta2/stav";
import * as zvuk from "../parta2/zvuk";
import { rekni } from "../parta2/kami";
import { krivka } from "../../data/kami";
import { syrova, orechova } from "../../data/dilna";
import { kusSvg, vychoziKus } from "../../components/dilna/kus";
import type { Kus } from "../../components/dilna/kus";
import { tvujKus, ulozKus, priZmeneKusu } from "./stav-kusu";
import type { Ulozeny } from "./stav-kusu";
import { celaDeska } from "./zkousky";

/** Míry scény (viewBox 640 × 520) — kus visí v krabici 140 × 140 od y = 190 */
const SCENA_W = 640;
const KRABICE = 140;
const KRABICE_Y = 190;
const HLADINA = 381;

const O_GLAZURE: Record<string, string> = {
  celadon: "Celadon. Zelenkavý jako voda v rybníce — nejhezčí tam, kde je tenký.",
  tenmoku: "Tenmoku. Skoro černá, na hranách rezavá. Syrová vypadá jako bláto.",
  shino: "Shino. Krémová s oranžovými fleky. Každý kus dopadne jinak.",
  "matná bílá": "Matná bílá. Bez lesku, jako papír.",
  "popelová šedá": "Popelová šedá. Matná a klidná.",
  "železitá hnědá": "Železitá hnědá. Teplá — od železa, co je v ní.",
  [orechova.nazev]: "Ořechová. Tajná, se zlatými tečkami. Tu jinde nenajdeš.",
};

const T_MAX = krivka[krivka.length - 1][1];
const H_MAX = krivka[krivka.length - 1][0];
/** Teplota na pálicí křivce v podílu času 0–1 */
const teplotaV = (p: number) => {
  const h = p * H_MAX;
  for (let i = 1; i < krivka.length; i++) {
    const [h0, t0] = krivka[i - 1];
    const [h1, t1] = krivka[i];
    if (h <= h1) return t0 + (t1 - t0) * omez((h - h0) / Math.max(1e-6, h1 - h0));
  }
  return T_MAX;
};
const MILNIKY: [number, string][] = [
  [100, "Pod stovkou se čeká, než z hlíny odejde poslední voda."],
  [573, "573 °C — křemen v hlíně se mění. Pomalu, jinak praskne."],
  [1000, "Glazura začíná tát."],
  [T_MAX, `Vrchol: ${cislo(T_MAX)} °C. Glazura je sklo.`],
];

const klicKusu = (k: Kus) => `${k.druh}|${k.v}|${k.r.map((x) => x.toFixed(1)).join(",")}`;

export function glazovat() {
  const sc = document.querySelector<HTMLElement>("[data-glazovat]");
  if (!sc) return;
  const okno = sc.querySelector<HTMLElement>(".gl-okno")!;
  const kusEl = sc.querySelector<HTMLElement>(".gl-kus")!;
  const otocEl = sc.querySelector<HTMLElement>(".gl-kus-otoc")!;
  const kresba = sc.querySelector<HTMLElement>(".gl-kus-kresba")!;
  const kapky = sc.querySelector<HTMLElement>(".gl-kapky")!;
  const hladina = sc.querySelector<SVGEllipseElement>(".gl-hladina")!;
  const stitek = sc.querySelector<SVGTextElement>(".gl-stitek-text")!;
  const volby = [...sc.querySelectorAll<HTMLButtonElement>(".gl-sklenice-tlacitko")];
  const jakTl = [...sc.querySelectorAll<HTMLButtonElement>(".gl-jak [data-jak]")];
  const btNamocit = sc.querySelector<HTMLButtonElement>(".gl-namocit")!;
  const btOtrit = sc.querySelector<HTMLButtonElement>(".gl-otrit")!;
  const btVypalit = sc.querySelector<HTMLButtonElement>(".gl-vypalit")!;
  const btSmyt = sc.querySelector<HTMLButtonElement>(".gl-smyt")!;
  const houba = sc.querySelector<HTMLButtonElement>(".gl-houba")!;
  const pec = sc.querySelector<HTMLElement>(".gl-pec")!;
  const pecDisplej = sc.querySelector<SVGTextElement>(".gl-pec-displej")!;
  const pecText = sc.querySelector<HTMLElement>(".gl-pec-text")!;
  const fazeEl = sc.querySelector<HTMLElement>(".gl-faze")!;
  const cizi = sc.querySelector<HTMLElement>(".gl-cizi");
  const rada = sc.querySelector<HTMLElement>(".d-rada")!;
  const radaText = sc.querySelector<HTMLElement>(".d-rada-text")!;
  const kamiKapka = sc.querySelector<HTMLElement>(".gl-kami");

  let kus: Kus = vychoziKus();
  let klic = "";
  let vypaleno = false;
  let prilepeny = false;
  let stekla = false;
  let vybrana = "celadon";
  let jak: "cely" | "horni" = "cely";
  let prace = false;

  const rikej = (s: string) => {
    radaText.textContent = s;
    rada.classList.remove("nova");
    void rada.offsetWidth;
    rada.classList.add("nova");
  };

  const stav = () => (vypaleno ? "hotovy" : kus.glazury.length ? "glazovany" : "prezah");
  const kresliKus = () => {
    kresba.innerHTML = kusSvg(kus, stav(), {
      id: "gl-kus",
      stekla: vypaleno && stekla,
      prilepeny: vypaleno && prilepeny,
      popis: `${kus.nazev}${vypaleno ? ", vypálený" : kus.glazury.length ? ", v syrové glazuře" : ", po přežahu"}`,
    });
    fazeEl.textContent = vypaleno ? (prilepeny ? "Přilepené k Šamotce" : "Vypáleno") : kus.glazury.length ? `Syrová glazura · ${kus.glazury.length === 2 ? "dvě vrstvy" : "jedna vrstva"}` : "Po přežahu";
    /* Kleště drží kus za vršek, otočený za patku */
    const svg = kresba.querySelector("svg");
    const bb = bbox(svg);
    const otoceny = otocEl.classList.contains("hlavou-dolu");
    const vrch = otoceny ? KRABICE - bb.dole : bb.nahore;
    kusEl.style.setProperty("--vrch", `${((vrch / KRABICE) * 100).toFixed(1)}%`);
  };

  /** Kde v krabici (0–140) kus začíná a končí — z kresby, nebo odhadem */
  const bbox = (svg: SVGSVGElement | null) => {
    try {
      const b = svg?.getBBox();
      if (b && b.height > 0) return { nahore: (b.y / 200) * KRABICE, dole: ((b.y + b.height) / 200) * KRABICE };
    } catch {}
    return { nahore: 0.3 * KRABICE, dole: 0.95 * KRABICE };
  };

  const tlacitka = () => {
    btNamocit.disabled = prace || vypaleno;
    btOtrit.disabled = prace || vypaleno;
    houba.disabled = prace || vypaleno;
    btVypalit.disabled = prace || vypaleno || kus.glazury.length === 0;
    btSmyt.disabled = prace || (!vypaleno && kus.glazury.length === 0);
    volby.forEach((b) => (b.disabled = prace));
    jakTl.forEach((b) => (b.disabled = prace || vypaleno));
  };

  /* ——— Odkud je kus ——— */
  const nactiKus = (u: Ulozeny | null) => {
    if (u && klicKusu(u.kus) === klic) {
      /* Tentýž kus — změnilo se jen jméno nebo se právě vypálil */
      kus.jmeno = u.kus.jmeno;
      kresliKus();
      return;
    }
    if (prace) return;
    if (u) {
      kus = JSON.parse(JSON.stringify(u.kus)) as Kus;
      vypaleno = u.stav === "hotovy";
      stekla = !!u.stekla;
      if (!vypaleno) {
        kus.glazury = [];
        kus.dno = false;
      }
    } else {
      kus = vychoziKus();
      vypaleno = false;
      stekla = false;
    }
    klic = klicKusu(kus);
    prilepeny = false;
    if (cizi) cizi.hidden = !!u;
    otocEl.classList.remove("hlavou-dolu");
    kresliKus();
    tlacitka();
  };

  /* ——— Výběr glazury ——— */
  const odemceno = () => celaDeska();
  const vyber = (g: string, rict = true) => {
    if (g === orechova.nazev && !odemceno()) {
      rikej("Tenhle kbelík je přikrytý. Najdi všech šest zkoušek glazur — jsou schované po stránce.");
      return;
    }
    vybrana = g;
    volby.forEach((b) => {
      const je = b.dataset.glazura === g;
      b.setAttribute("aria-checked", String(je));
      b.tabIndex = je ? 0 : -1;
    });
    hladina.setAttribute("fill", syrova[g] ?? "#EEE");
    stitek.textContent = g;
    hladina.classList.remove("vlni");
    void hladina.getBoundingClientRect();
    hladina.classList.add("vlni");
    if (rict) {
      zvuk.kapka();
      rikej(O_GLAZURE[g] ?? g);
    }
  };
  volby.forEach((b, i) => {
    b.addEventListener("click", () => vyber(b.dataset.glazura ?? "celadon"));
    b.addEventListener("keydown", (e) => {
      const smer = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
      if (!smer) return;
      e.preventDefault();
      let j = i;
      do j = (j + smer + volby.length) % volby.length;
      while (volby[j].dataset.glazura === orechova.nazev && !odemceno() && j !== i);
      volby[j].focus();
      vyber(volby[j].dataset.glazura ?? "celadon");
    });
  });

  const odkryj = () => sc.classList.toggle("odkryto", odemceno());
  document.addEventListener("dilna:zkousky", () => {
    const bylo = sc.classList.contains("odkryto");
    odkryj();
    if (!bylo && odemceno()) {
      zvuk.zlato();
      rikej("Kbelík na kraji police se odkryl. Ořechová glazura — se zlatými tečkami.");
    }
  });

  jakTl.forEach((b) =>
    b.addEventListener("click", () => {
      jak = b.dataset.jak === "horni" ? "horni" : "cely";
      jakTl.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      rikej(jak === "horni" ? "Do půlky se namáčí okrajem napřed. Kus držíš za patku." : "Celý kus, na tři vteřiny. Pak ven a nechat okapat.");
    }),
  );

  /* ——— Namáčení ——— */
  const mer = () => okno.clientWidth / SCENA_W;
  const posun = (dy: number) => {
    kusEl.style.transform = `translateY(${(dy * mer()).toFixed(1)}px)`;
  };

  const kap = () => {
    const barva = syrova[vybrana] ?? "#EEE";
    for (let i = 0; i < 6; i++) {
      const k = document.createElement("span");
      k.className = "gl-kapka";
      k.style.left = `${30 + Math.random() * 40}%`;
      k.style.background = barva;
      k.style.animationDelay = `${(i * 0.11 + Math.random() * 0.1).toFixed(2)}s`;
      kapky.append(k);
      window.setTimeout(() => k.remove(), 1600);
    }
    window.setTimeout(() => zvuk.kapka(), 300);
    window.setTimeout(() => zvuk.kapka(), 640);
  };

  const namoc = () => {
    if (prace || vypaleno) return;
    if (kus.glazury.length >= 2) {
      rikej("Dvě vrstvy stačí. Třetí by v peci stekla až na Šamotku.");
      return;
    }
    if (vybrana === orechova.nazev && !odemceno()) return;
    prace = true;
    tlacitka();
    const hlavou = jak === "horni";
    const svg = kresba.querySelector("svg");
    const bb = bbox(svg);
    const ponor = hlavou ? HLADINA - KRABICE_Y - (KRABICE - (bb.nahore + bb.dole) / 2) : HLADINA + 8 - KRABICE_Y - bb.nahore;
    const t = klid ? 0 : 1;
    const pridejVrstvu = () => {
      kus.glazury.push({ g: vybrana, kde: jak });
      kus.dno = false;
      kresliKus();
    };
    const hotovo = () => {
      prace = false;
      tlacitka();
      const n = kus.glazury.length;
      rikej(
        n === 2
          ? "Dvě vrstvy. Kde se potkají, vznikne třetí barva — a možná to v peci trochu steče."
          : hlavou
            ? "Okrajem napřed, do půlky. Syrová glazura je bledá a matná — barvu ukáže až pec."
            : "Raz, dva, tři — a ven. Syrová glazura je bledá a matná. Barvu ukáže až pec. A dno otřít!",
      );
    };
    if (!t) {
      pridejVrstvu();
      hotovo();
      return;
    }
    rikej(hlavou ? "Za patku, hlavou dolů…" : "Pomalu dovnitř…");
    if (hlavou) otocEl.classList.add("hlavou-dolu");
    window.setTimeout(() => {
      posun(ponor);
      window.setTimeout(() => {
        hladina.classList.remove("vlni");
        void hladina.getBoundingClientRect();
        hladina.classList.add("vlni");
        zvuk.kapka();
        rikej("Raz…");
      }, 520);
      window.setTimeout(() => rikej("Raz… dva…"), 1000);
      window.setTimeout(() => {
        rikej("Raz… dva… tři.");
        pridejVrstvu();
      }, 1480);
      window.setTimeout(() => {
        posun(0);
        window.setTimeout(() => {
          kap();
          if (hlavou) otocEl.classList.remove("hlavou-dolu");
          window.setTimeout(() => {
            kresliKus();
            hotovo();
          }, hlavou ? 520 : 200);
        }, 640);
      }, 1900);
    }, hlavou ? 520 : 60);
  };
  btNamocit.addEventListener("click", namoc);

  /* ——— Otřít dno ——— */
  const otri = () => {
    if (prace || vypaleno) return;
    if (!kus.glazury.length) {
      rikej("Na dně nic není — nejdřív namočit.");
      return;
    }
    if (!kus.glazury.some((v) => v.kde === "cely")) {
      rikej("Dno je čisté — do půlky se glazura ke dnu nedostala.");
      kus.dno = true;
      return;
    }
    if (kus.dno) {
      rikej("Dno už je čisté.");
      return;
    }
    kus.dno = true;
    houba.classList.remove("otira");
    void houba.offsetWidth;
    houba.classList.add("otira");
    kusEl.classList.remove("otreno");
    void kusEl.offsetWidth;
    kusEl.classList.add("otreno");
    zvuk.hnet();
    window.setTimeout(kresliKus, klid ? 0 : 300);
    rikej("Čisté dno. Šamotka by poděkovala, kdyby to uměla.");
  };
  btOtrit.addEventListener("click", otri);
  houba.addEventListener("click", otri);

  /* ——— Výpal ——— */
  const vypal = () => {
    if (prace || vypaleno || !kus.glazury.length) return;
    prace = true;
    tlacitka();
    const prilepi = !kus.dno && kus.glazury.some((v) => v.kde === "cely");
    const steka = kus.glazury.length === 2;
    pec.hidden = false;
    void pec.offsetWidth;
    pec.classList.add("je");
    zvuk.vicko();
    const zar = (T: number) => {
      const z = omez((T - 380) / (T_MAX - 380));
      pec.style.setProperty("--zar", z.toFixed(3));
      pecDisplej.textContent = String(Math.round(T));
      zvuk.nastavPec(z);
    };
    let milnik = 0;
    const konec = () => {
      zar(60);
      zvuk.nastavPec(0);
      pecText.textContent = "Vychladlo. Víko nahoru…";
      zvuk.vicko();
      window.setTimeout(
        () => {
          pec.classList.remove("je");
          window.setTimeout(() => (pec.hidden = true), klid ? 0 : 400);
          vypaleno = true;
          prilepeny = prilepi;
          stekla = steka;
          kresliKus();
          prace = false;
          tlacitka();
          if (prilepi) {
            zvuk.tres();
            rikej("Přilepilo se to k Šamotce! Glazura na dně se v peci roztavila a přitavila kus k polici. Smyj glazuru a zkus to znovu — tentokrát s houbičkou.");
          } else {
            zvuk.zlato();
            kusEl.classList.remove("zari");
            void kusEl.offsetWidth;
            kusEl.classList.add("zari");
            rikej(`Vypáleno! Tohle je tvůj kus.${steka ? " Glazura trochu stekla — u dvou vrstev se to stává." : ""}`);
            if (kamiKapka) rekni(kamiKapka, "kapka", "Lesklé! Kde? Tady!");
            ulozKus({ kus: JSON.parse(JSON.stringify(kus)), stav: "hotovy", stekla: steka });
          }
        },
        klid ? 0 : 700,
      );
    };
    if (klid) {
      zar(T_MAX);
      pecText.textContent = MILNIKY[MILNIKY.length - 1][1];
      window.setTimeout(konec, 600);
      return;
    }
    pecText.textContent = "Víko zavřené. Topí se — pomalu.";
    const start = performance.now();
    const NAHORU = 5200;
    const DOLU = 1700;
    const krok = (ted: number) => {
      const uplynulo = ted - start;
      if (uplynulo < NAHORU) {
        const T = teplotaV(uplynulo / NAHORU);
        zar(T);
        while (milnik < MILNIKY.length && T >= MILNIKY[milnik][0] - 0.5) {
          pecText.textContent = MILNIKY[milnik][1];
          milnik++;
        }
        requestAnimationFrame(krok);
      } else if (uplynulo < NAHORU + DOLU) {
        if (milnik <= MILNIKY.length) {
          pecText.textContent = "Teď celou noc chladne. Zrychlíme to.";
          milnik = MILNIKY.length + 1;
        }
        zar(T_MAX - (T_MAX - 60) * hladce((uplynulo - NAHORU) / DOLU));
        requestAnimationFrame(krok);
      } else konec();
    };
    requestAnimationFrame(krok);
  };
  btVypalit.addEventListener("click", vypal);

  btSmyt.addEventListener("click", () => {
    if (prace) return;
    kus.glazury = [];
    kus.dno = false;
    vypaleno = false;
    prilepeny = false;
    stekla = false;
    otocEl.classList.remove("hlavou-dolu");
    kresliKus();
    tlacitka();
    zvuk.kapka();
    rikej("Smyto. V dílně by to po výpalu nešlo — tady ano.");
  });

  priZmeneKusu(nactiKus);
  nactiKus(tvujKus());
  odkryj();
  vyber("celadon", false);
}
