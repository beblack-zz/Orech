/**
 * Prohlídka dílny v suterénu. Stejný princip jako prohlídka na Úvodu 2
 * (scripts/uvod2/prohlidka.ts): karty mají data-kamera a kamera mezi nimi
 * jede podle toho, jak daleko je člověk mezi dvěma kartami. Záběry
 * spočítala kresba ze stejných metrů, ve kterých je dílna nakreslená.
 *
 * Do dílny se dá klikat: roztočit kruh (kopací i elektrický), prohníst
 * hroudu (a vyplašit Bublinku), vypálit a otevřít pec (vykoukne Šamotka),
 * vzít kus z regálu, pustit vodu v dřezu, postavit na kafe, rozsvítit
 * lampu, a u zadní stěny dveře, knihy a glazury. Tlačítka v kresbě
 * i v kartách mají data-akce, obsluha je jedna.
 */
import { priMereni, priScrollu, pozice, omez, hladce, klid, cislo } from "../parta2/stav";
import { rekni } from "../parta2/kami";
import * as zvuk from "../parta2/zvuk";
import { kamiInfo, krivka } from "../../data/kami";
import type { PostavaId } from "../../data/parta";
import { kamera, cil } from "../uvod2/kamera";

const T_MAX = krivka[krivka.length - 1][1];
const T_NULA = krivka[0][1];
const mobil = () => window.matchMedia("(max-width: 860px)").matches;

export function prohlidka() {
  const sekce = document.querySelector<HTMLElement>("#prohlidka");
  if (!sekce) return;
  const okno = sekce.querySelector<HTMLElement>(".prohlidka-okno")!;
  const svet = sekce.querySelector<HTMLElement>(".prohlidka-svet")!;
  const rez = svet.querySelector<HTMLElement>(".rez")!;
  const karty = [...sekce.querySelectorAll<HTMLElement>(".stanice")];
  const mapa = [...sekce.querySelectorAll<HTMLAnchorElement>("[data-mapa]")];
  const k = kamera(okno, svet);
  const cile = karty.map((el) => cil(el.dataset.kamera) ?? { x: 800, y: 500, w: 1480, h: 700 });
  let kotvy: number[] = [];
  let aktivni = "";

  /* ——— Repliky party ——— */
  const kamiEl = (id: PostavaId) =>
    rez.querySelector<HTMLElement>(`.rez-kami-${id}`) ??
    rez.querySelector<HTMLElement>(id === "bublinka" ? ".rez-bublinka" : id === "samotka" ? ".rez-samotka" : `[data-kami="${id}"]`);
  const rekl = new Set<string>();
  /** Řekne větu (nebo repliku z kami.ts) — jen poprvé, ať to nevyskakuje při každém kliknutí */
  const replika = (klic: string, id: PostavaId, t: string | number, znovu = false) => {
    if (rekl.has(klic) && !znovu) return;
    const el = kamiEl(id);
    const veta = typeof t === "number" ? kamiInfo[id]?.repliky[t] : t;
    if (!el || !veta) return;
    rekl.add(klic);
    rekni(el, id, veta);
  };

  /* ——— Kamera ——— */
  const nastavAktivni = (s: string) => {
    if (s === aktivni) return;
    aktivni = s;
    mapa.forEach((a) => {
      const je = a.dataset.mapa === s;
      a.classList.toggle("je", je);
      if (je) a.setAttribute("aria-current", "step");
      else a.removeAttribute("aria-current");
    });
    karty.forEach((kt) => kt.classList.toggle("aktivni", kt.dataset.stanice === s));
  };

  priMereni(() => {
    k.zmer();
    const vh = window.innerHeight;
    const scena = sekce.querySelector<HTMLElement>(".prohlidka-scena");
    const fokus = mobil() && scena ? scena.offsetHeight + 16 : vh * 0.18;
    kotvy = karty.map((el) => pozice(el).top - fokus);
    if (klid) k.na(cile[0]);
  });

  priScrollu((y) => {
    if (!kotvy.length) return;
    let i = 0;
    while (i < kotvy.length - 1 && y >= kotvy[i + 1]) i++;
    const t = i < kotvy.length - 1 ? omez((y - kotvy[i]) / Math.max(1, kotvy[i + 1] - kotvy[i])) : 0;
    if (!klid) {
      if (i >= kotvy.length - 1) k.na(cile[cile.length - 1]);
      else k.mezi(cile[i], cile[i + 1], hladce(omez((t - 0.6) / 0.4)));
    }
    nastavAktivni(karty[t > 0.8 ? Math.min(i + 1, karty.length - 1) : i].dataset.stanice ?? "");
  });

  /* Klávesnicí po kresbě: zaměřené místo z jiné zastávky přiveze svou kartu */
  rez.addEventListener("focusin", (e) => {
    const s = (e.target as HTMLElement).closest<HTMLElement>("[data-stanice]")?.dataset.stanice;
    if (s && s !== aktivni) {
      document.getElementById(`stanice-${s}`)?.scrollIntoView({ behavior: klid ? "auto" : "smooth", block: "center" });
    }
  });

  /* 1 pec · 2 stoly · 3 kruhy — ukáže je v kresbě */
  sekce.querySelectorAll<HTMLElement>("[data-ukaz]").forEach((a) => {
    const ukaz = (zap: boolean) =>
      rez.querySelectorAll(`[data-ukaz-v="${a.dataset.ukaz}"]`).forEach((m) => m.classList.toggle("ukazane", zap));
    a.addEventListener("mouseenter", () => ukaz(true));
    a.addEventListener("mouseleave", () => ukaz(false));
    a.addEventListener("focus", () => ukaz(true));
    a.addEventListener("blur", () => ukaz(false));
  });

  /* ——— Kruhy ——— */
  const kruhy = [...rez.querySelectorAll<SVGGElement>(".kruh")];
  const kruhCas: (number | undefined)[] = [];
  const roztoc = (i: number) => {
    const kr = kruhy.find((x) => Number(x.dataset.kruh) === i);
    if (!kr) return;
    window.clearTimeout(kruhCas[i]);
    kr.classList.add("toci");
    zvuk.nastavKruh(i === 2 ? 0.8 : 0.55, true);
    window.setTimeout(() => {
      kr.dataset.faze = String((Number(kr.dataset.faze ?? 0) + 1) % 4);
      kr.classList.remove("roste");
      void kr.getBoundingClientRect();
      kr.classList.add("roste");
    }, klid ? 0 : 420);
    kruhCas[i] = window.setTimeout(() => {
      kr.classList.remove("toci", "roste");
      if (!kruhy.some((x) => x.classList.contains("toci"))) zvuk.nastavKruh(0, false);
    }, 1500);
    if (i === 2) replika("kruh-el", "vazicka", "Elektrický je pohodlný. Kopací tě naučí trpělivost.");
    else replika("kruh", "vazicka", 3);
  };

  /* ——— Hrouda ——— */
  const hrouda = rez.querySelector<SVGGElement>(".hrouda");
  let hnuti = 0;
  const hnet = () => {
    if (hrouda) {
      hrouda.classList.remove("hnete");
      void hrouda.getBoundingClientRect();
      hrouda.classList.add("hnete");
    }
    zvuk.hnet();
    hnuti++;
    if (hnuti >= 2) rez.classList.add("kiku");
    if (hnuti === 3) {
      rez.classList.add("bublinka-venku");
      zvuk.pop();
      window.setTimeout(() => replika("hrouda", "bublinka", 1), 380);
    }
  };

  /* ——— Pec ——— */
  type StavPece = "studena" | "topi" | "chladne" | "hotova" | "otevrena";
  let stavPece: StavPece = "studena";
  const displej = rez.querySelector<SVGTextElement>(".dl-pec-displej");
  const pecG = rez.querySelector<SVGGElement>(".dl-pec");
  const pecTlacitko = sekce.querySelector<HTMLButtonElement>(".pec-tlacitko");
  const pecStav = sekce.querySelector<HTMLElement>(".pec-stav");
  const pecKarta = sekce.querySelector<HTMLElement>("#stanice-pec");

  const teplota = (T: number) => {
    const zar = omez((T - T_NULA) / (T_MAX - T_NULA));
    rez.style.setProperty("--zar", zar.toFixed(3));
    pecKarta?.style.setProperty("--zar", zar.toFixed(3));
    if (displej) displej.textContent = String(Math.round(T));
    zvuk.nastavPec(zar);
  };
  const pecNastav = (s: StavPece, text: string, tlacitko: string, zakazat = false) => {
    stavPece = s;
    rez.dataset.pec = s;
    if (pecStav) pecStav.textContent = text;
    if (pecTlacitko) {
      pecTlacitko.textContent = tlacitko;
      pecTlacitko.disabled = zakazat;
    }
  };
  const prubeh = (odT: number, kam: number, doba: number, hotovo: () => void) => {
    if (klid) {
      teplota(kam);
      hotovo();
      return;
    }
    const start = performance.now();
    const krok = (ted: number) => {
      const t = omez((ted - start) / doba);
      teplota(odT + (kam - odT) * hladce(t));
      if (t < 1) requestAnimationFrame(krok);
      else hotovo();
    };
    requestAnimationFrame(krok);
  };
  const pec = () => {
    if (stavPece === "studena") {
      pecNastav("topi", "Topí se. Pomalu — hlína se nedá uspěchat.", "Topí se…", true);
      prubeh(T_NULA, T_MAX, 4200, () => {
        pecNastav("chladne", `Vrchol: ${cislo(T_MAX)} °C. Teď celou noc chladne.`, "Chladne…", true);
        replika("pec-vrchol", "pecinka", 3);
        prubeh(T_MAX, 60, 3600, () => {
          pecNastav("hotova", "Vychladlo. Víko se dá odklopit.", "Odklopit víko");
          zvuk.nastavPec(0);
        });
      });
    } else if (stavPece === "topi" || stavPece === "chladne") {
      pecG?.classList.remove("tres");
      void pecG?.getBoundingClientRect();
      pecG?.classList.add("tres");
      replika("pec-netrpelivy", "pecinka", 1, true);
    } else if (stavPece === "hotova") {
      pecNastav("otevrena", "Víko nahoře. Všechno přežilo — a Šamotka to zase unesla.", "Zavřít víko");
      zvuk.vicko();
      window.setTimeout(() => replika("pec-otevrena", "samotka", 0), 500);
    } else {
      teplota(T_NULA);
      zvuk.vicko();
      pecNastav("studena", "Pec je studená.", "Zapálit pec");
    }
  };

  /* ——— Kusy z regálu ——— */
  const kusy = [...rez.querySelectorAll<SVGGElement>(".kus")];
  const cedulky = [...rez.querySelectorAll<HTMLElement>(".kus-cedulka")];
  const kusTlacitka = [...sekce.querySelectorAll<HTMLButtonElement>(".kus-vzit")];
  let vzaty = -1;
  const vezmi = (i: number) => {
    vzaty = vzaty === i ? -1 : i;
    kusy.forEach((x, j) => x.classList.toggle("vzaty", j === vzaty));
    cedulky.forEach((x, j) => x.classList.toggle("je", j === vzaty));
    kusTlacitka.forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.kus) === vzaty)));
    if (vzaty >= 0) {
      zvuk.cink();
      replika("regal", "stripek", 2);
    }
  };

  /* ——— Dřez: voda teče, Kapka je v sedmém nebi ——— */
  let vodaCas: number | undefined;
  const voda = () => {
    rez.classList.add("voda-tece");
    zvuk.kohoutek();
    window.clearTimeout(vodaCas);
    vodaCas = window.setTimeout(() => rez.classList.remove("voda-tece"), 1800);
    replika("voda", "kapka", 2);
  };

  /* ——— Kafe ——— */
  const kavovar = rez.querySelector<SVGGElement>(".dl-kavovar");
  let kafeCas: number | undefined;
  const kafe = () => {
    kavovar?.classList.add("vari");
    zvuk.para();
    window.clearTimeout(kafeCas);
    kafeCas = window.setTimeout(() => kavovar?.classList.remove("vari"), 3200);
    replika("kafe", "cedulka", "Kafe je samozřejmost. Hrnky jsou na skříňce — vyber si glazuru.");
  };

  /* ——— Lampa, dveře, knihy, glazury ——— */
  const lampa = rez.querySelector<SVGGElement>(".dl-lampa");
  const sviti = () => {
    lampa?.classList.toggle("sviti");
    zvuk.cvak();
  };

  sekce.addEventListener("click", (e) => {
    const el = (e.target as Element).closest<HTMLElement>("[data-akce]");
    if (!el) return;
    switch (el.dataset.akce) {
      case "kruh": roztoc(Number(el.dataset.kruh ?? 0)); break;
      case "hrouda": hnet(); break;
      case "pec": pec(); break;
      case "kus": vezmi(Number(el.dataset.kus ?? 0)); break;
      case "voda": voda(); break;
      case "kafe": kafe(); break;
      case "lampa": sviti(); break;
      case "dvere":
        zvuk.drevo(0.8);
        replika("dvere", "kachlik", "Za šedými dveřmi je schodiště do domu. Tam už nechoď — tam se bydlí.", true);
        break;
      case "knihy":
        zvuk.papir();
        replika("knihy", "cedulka", "Keramika, Japonsko, čaj. A pár románů na pauzu, když se čeká na pec.", true);
        break;
      case "glazury":
        zvuk.cink();
        replika("glazury", "kapka", "Lahvičky s glazurou! Kdybych byla kapka glazury, byla bych tahle tyrkysová.", true);
        break;
    }
  });
}
