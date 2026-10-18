/**
 * Prohlídka dílny v suterénu. Na jednu obrazovku jako Rok dílny na O nás
 * (scripts/uvod2/rok.ts): scroll s ní nehýbe, zastávky se přepínají
 * značkami dole, šipkami po stranách, šipkami na klávesnici, když je
 * prohlídka na obrazovce, nebo tažením prstu po kartě. Karta odjede do
 * strany a kamera plynule dojede k záběru z její data-kamera. Záběry
 * spočítala kresba ze stejných metrů, ve kterých je dílna nakreslená.
 * Obloha jde se zastávkou: karty mají každá svou hodinu (data-hodina)
 * a při přepnutí se všechny přetočí na hodinu vybrané.
 *
 * Do dílny se dá klikat: roztočit kruh (kopací i elektrický), prohníst
 * hroudu (a vyplašit Bublinku), vypálit a otevřít pec (vykoukne Šamotka),
 * vzít kus z regálu, pustit vodu v dřezu, postavit na kafe, rozsvítit
 * lampu, a u zadní stěny dveře, knihy a glazury. Tlačítka v kresbě
 * i v kartách mají data-akce, obsluha je jedna.
 */
import { priMereni, omez, mix, hladce, klid, cislo, vyzadej } from "../parta2/stav";
import { rekni } from "../parta2/kami";
import * as zvuk from "../parta2/zvuk";
import { kamiInfo, krivka } from "../../data/kami";
import type { PostavaId } from "../../data/parta";
import { kamera, cil, smichej } from "../uvod2/kamera";
import type { Cil } from "../uvod2/kamera";
import { UDALOST } from "../parta2/pozdeji";

const T_MAX = krivka[krivka.length - 1][1];
const T_NULA = krivka[0][1];
/** Jak dlouho kamera jede k další zastávce, v milisekundách */
const JIZDA = 1100;

export function prohlidka() {
  const sekce = document.querySelector<HTMLElement>("#prohlidka");
  if (!sekce) return;
  const okno = sekce.querySelector<HTMLElement>(".prohlidka-okno")!;
  const svet = sekce.querySelector<HTMLElement>(".prohlidka-svet")!;
  const rez = svet.querySelector<HTMLElement>(".rez")!;
  const pas = sekce.querySelector<HTMLElement>(".prohlidka-pas")!;
  const karty = [...sekce.querySelectorAll<HTMLElement>(".stanice")];
  const mapa = [...sekce.querySelectorAll<HTMLButtonElement>("[data-mapa]")];
  const zpet = sekce.querySelector<HTMLButtonElement>(".prohlidka-sipka-zpet");
  const dal = sekce.querySelector<HTMLButtonElement>(".prohlidka-sipka-dal");
  const k = kamera(okno, svet);
  const cile = karty.map((el) => cil(el.dataset.kamera) ?? { x: 800, y: 500, w: 1480, h: 700 });
  const hodiny = karty.map((el) => Number(el.dataset.hodina));
  const n = karty.length;
  let aktivni = -1;
  /* Kresba dílny se do .rez-kresba vloží až cestou k prohlídce (parta2/pozdeji.ts),
     proto se v ní hledá až ve chvíli, kdy je potřeba, a po vložení se do ní
     přenese, co se mezitím změnilo (displej pece, vzatý kus, lampa) */
  const vKresbe = <T extends Element>(sel: string) => rez.querySelector<T>(sel);
  const vseVKresbe = <T extends Element>(sel: string) => [...rez.querySelectorAll<T>(sel)];

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

  /* ——— Obloha: hodina vybrané zastávky na všech kartách ——— */
  let hodina = hodiny[0] ?? 10;
  let ramecNebe = 0;
  const nastavNebe = (h: number) => {
    hodina = h;
    for (const kt of karty) kt.dataset.hodina = h.toFixed(3);
    vyzadej();
  };
  const nebeNa = (cilova: number, hned: boolean) => {
    cancelAnimationFrame(ramecNebe);
    if (!Number.isFinite(cilova)) return;
    if (hned) return nastavNebe(cilova);
    const odkud = hodina;
    const start = performance.now();
    const krok = (cas: number) => {
      const t = omez((cas - start) / JIZDA);
      nastavNebe(mix(odkud, cilova, hladce(t)));
      if (t < 1) ramecNebe = requestAnimationFrame(krok);
    };
    ramecNebe = requestAnimationFrame(krok);
  };

  /* ——— Kamera: kde je teď a kam jede ——— */
  let ted: Cil = cile[0];
  let ramec = 0;
  const jedNa = (kam: Cil, hned: boolean) => {
    cancelAnimationFrame(ramec);
    if (hned) {
      ted = kam;
      k.na(kam);
      return;
    }
    const odkud = ted;
    const start = performance.now();
    const krok = (cas: number) => {
      const t = omez((cas - start) / JIZDA);
      ted = smichej(odkud, kam, hladce(t));
      k.na(ted);
      if (t < 1) ramec = requestAnimationFrame(krok);
    };
    ramec = requestAnimationFrame(krok);
  };

  /* ——— Zastávky ——— */
  const stanice = (i: number, hned = false) => {
    const j = Math.max(0, Math.min(i, n - 1));
    if (j === aktivni) return;
    aktivni = j;
    const s = karty[j].dataset.stanice;
    pas.style.setProperty("--i", String(j));
    karty.forEach((kt, x) => {
      kt.classList.toggle("aktivni", x === j);
      /* Karty mimo obrazovku nejdou proklikat tabulátorem a čtečka je přeskočí */
      kt.inert = x !== j;
    });
    mapa.forEach((b) => {
      const je = b.dataset.mapa === s;
      b.classList.toggle("je", je);
      if (je) b.setAttribute("aria-current", "step");
      else b.removeAttribute("aria-current");
    });
    if (zpet) zpet.disabled = j === 0;
    if (dal) dal.disabled = j === n - 1;
    jedNa(cile[j], hned || klid);
    nebeNa(hodiny[j], hned || klid);
  };
  const naStanici = (s: string | undefined) => {
    const i = karty.findIndex((kt) => kt.dataset.stanice === s);
    if (i >= 0) stanice(i);
  };

  mapa.forEach((b) => b.addEventListener("click", () => naStanici(b.dataset.mapa)));
  zpet?.addEventListener("click", () => stanice(aktivni - 1));
  dal?.addEventListener("click", () => stanice(aktivni + 1));

  /* Odkazy na zastávky v kartách (1 pec · 2 stoly · 3 kruhy) přepnou kartu, nerolují */
  sekce.addEventListener("click", (e) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>("a[href^='#stanice-']");
    if (!a) return;
    e.preventDefault();
    naStanici(a.getAttribute("href")?.slice("#stanice-".length));
  });

  /* Šipky na klávesnici, když je prohlídka z větší části na obrazovce a nepíše se do pole */
  let videt = false;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => (videt = e.intersectionRatio >= 0.5), { threshold: [0, 0.5, 1] }).observe(sekce);
  }
  const naKlavesy = (e: KeyboardEvent) => {
    if (!sekce.isConnected) return document.removeEventListener("keydown", naKlavesy);
    if (!videt || e.altKey || e.ctrlKey || e.metaKey) return;
    if ((e.target as Element | null)?.closest?.("input, textarea, select, [contenteditable]")) return;
    if (e.key === "ArrowLeft" && aktivni > 0) {
      e.preventDefault();
      stanice(aktivni - 1);
    } else if (e.key === "ArrowRight" && aktivni < n - 1) {
      e.preventDefault();
      stanice(aktivni + 1);
    }
  };
  document.addEventListener("keydown", naKlavesy);

  /* Prstem po kartě do strany: dost daleko a víc do strany než nahoru */
  const kartyEl = sekce.querySelector<HTMLElement>(".prohlidka-karty")!;
  let tah: { x: number; y: number; id: number } | null = null;
  kartyEl.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse") tah = { x: e.clientX, y: e.clientY, id: e.pointerId };
  });
  kartyEl.addEventListener("pointerup", (e) => {
    if (!tah || tah.id !== e.pointerId) return;
    const dx = e.clientX - tah.x;
    const dy = e.clientY - tah.y;
    tah = null;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    stanice(aktivni + (dx < 0 ? 1 : -1));
  });
  kartyEl.addEventListener("pointercancel", () => (tah = null));

  priMereni(() => {
    k.zmer();
    /* Po změně velikosti okna stojí kamera rovnou u zastávky, nejede znovu */
    cancelAnimationFrame(ramec);
    ted = cile[Math.max(0, aktivni)];
    k.na(ted);
  });

  /* Klávesnicí po kresbě: zaměřené místo z jiné zastávky přepne na svou kartu.
     Jen z klávesnice — kliknutí myší věc taky zaměří, ale karta kvůli němu odjíždět nemá */
  rez.addEventListener("focusin", (e) => {
    const cil = e.target as HTMLElement;
    let zKlavesnice = true;
    try {
      zKlavesnice = cil.matches(":focus-visible");
    } catch {
      /* prohlížeč :focus-visible nezná — radši nepřepínat */
      zKlavesnice = false;
    }
    if (!zKlavesnice) return;
    const s = cil.closest<HTMLElement>("[data-stanice]")?.dataset.stanice;
    if (s && s !== karty[aktivni]?.dataset.stanice) naStanici(s);
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
  const kruhCas: (number | undefined)[] = [];
  const roztoc = (i: number) => {
    const kruhy = vseVKresbe<SVGGElement>(".kruh");
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
  let hnuti = 0;
  const hnet = () => {
    const hrouda = vKresbe<SVGGElement>(".hrouda");
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
  /** Co ukazuje displej pece (null = jak ho nakreslil build) */
  let naDispleji: string | null = null;
  const pecTlacitko = sekce.querySelector<HTMLButtonElement>(".pec-tlacitko");
  const pecStav = sekce.querySelector<HTMLElement>(".pec-stav");
  const pecKarta = sekce.querySelector<HTMLElement>("#stanice-pec");

  const teplota = (T: number) => {
    const zar = omez((T - T_NULA) / (T_MAX - T_NULA));
    rez.style.setProperty("--zar", zar.toFixed(3));
    pecKarta?.style.setProperty("--zar", zar.toFixed(3));
    naDispleji = String(Math.round(T));
    const displej = vKresbe<SVGTextElement>(".dl-pec-displej");
    if (displej) displej.textContent = naDispleji;
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
      const pecG = vKresbe<SVGGElement>(".dl-pec");
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
  const cedulky = [...rez.querySelectorAll<HTMLElement>(".kus-cedulka")];
  const kusTlacitka = [...sekce.querySelectorAll<HTMLButtonElement>(".kus-vzit")];
  let vzaty = -1;
  const vezmi = (i: number) => {
    vzaty = vzaty === i ? -1 : i;
    vseVKresbe<SVGGElement>(".kus").forEach((x, j) => x.classList.toggle("vzaty", j === vzaty));
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
  let kafeCas: number | undefined;
  const kafe = () => {
    const kavovar = vKresbe<SVGGElement>(".dl-kavovar");
    kavovar?.classList.add("vari");
    zvuk.para();
    window.clearTimeout(kafeCas);
    kafeCas = window.setTimeout(() => kavovar?.classList.remove("vari"), 3200);
    replika("kafe", "cedulka", "Kafe je samozřejmost. Hrnky jsou na skříňce — vyber si glazuru.");
  };

  /* ——— Lampa, dveře, knihy, glazury ——— */
  let lampaSviti = false;
  const sviti = () => {
    lampaSviti = !lampaSviti;
    vKresbe<SVGGElement>(".dl-lampa")?.classList.toggle("sviti", lampaSviti);
    zvuk.cvak();
  };

  /* Kresba právě dorazila: přenést do ní, co se stihlo změnit předtím */
  rez.addEventListener(UDALOST, () => {
    const displej = vKresbe<SVGTextElement>(".dl-pec-displej");
    if (displej && naDispleji !== null) displej.textContent = naDispleji;
    vseVKresbe<SVGGElement>(".kus").forEach((x, j) => x.classList.toggle("vzaty", j === vzaty));
    vKresbe<SVGGElement>(".dl-lampa")?.classList.toggle("sviti", lampaSviti);
  });

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

  /* Adresa s #stanice-… otevře rovnou tu zastávku */
  const zAdresy = karty.findIndex((kt) => `#${kt.id}` === location.hash);
  stanice(Math.max(0, zAdresy), true);
}
