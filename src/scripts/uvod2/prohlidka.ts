/**
 * Prohlídka dílny. Dvě věci:
 *
 * 1. Kamera — každá karta má data-kamera a kamera jede mezi nimi podle
 *    toho, jak daleko je člověk mezi dvěma kartami. První a poslední
 *    čtvrtinu cesty stojí, mezi tím plynule přejede, takže se u zastavení
 *    dá v klidu číst. S omezeným pohybem kamera stojí na celé dílně.
 *
 * 2. Co se v dílně dá dělat — roztočit kruh, prohníst hroudu (a vyplašit
 *    Bublinku), vypálit pec, vzít kus z police, otočit poukaz, postavit na
 *    kafe. Tlačítka v kresbě i v kartách mají data-akce, obsluha je jedna.
 *    Každá akce dává razítko a někdo z party k ní řekne svou repliku
 *    z data/kami.ts.
 */
import { priMereni, priScrollu, pozice, omez, hladce, klid, cislo } from "../parta2/stav";
import { rekni } from "../parta2/kami";
import * as zvuk from "../parta2/zvuk";
import { kamiInfo, krivka } from "../../data/kami";
import type { PostavaId } from "../../data/parta";
import { orazitkuj } from "./razitka";
import { kamera, cil } from "./kamera";

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
  const cile = karty.map((el) => cil(el.dataset.kamera) ?? { x: 800, y: 560, w: 1680, h: 1040 });
  let kotvy: number[] = [];
  let aktivni = "";

  /* ——— Repliky party ——— */
  const kamiEl = (id: PostavaId) =>
    rez.querySelector<HTMLElement>(`.rez-kami-${id}`) ??
    rez.querySelector<HTMLElement>(id === "bublinka" ? ".rez-bublinka" : id === "samotka" ? ".rez-samotka" : `[data-kami="${id}"]`);
  const rekl = new Set<string>();
  /** Řekne repliku z kami.ts — jen poprvé, ať to nevyskakuje při každém kliknutí */
  const prvniReplika = (klic: string, id: PostavaId, index: number) => {
    if (rekl.has(klic)) return;
    const text = kamiInfo[id]?.repliky[index];
    const el = kamiEl(id);
    if (!text || !el) return;
    rekl.add(klic);
    rekni(el, id, text);
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

  /*
   * Kotva karty = chvíle, kdy je její nadpis tam, kde se čte: na počítači
   * kousek pod horním okrajem, na mobilu těsně pod přilepenou kresbou.
   * Od kotvy kamera stojí, dokud se nepřiblíží další karta — teprve
   * v posledních dvou pětinách cesty přejede k dalšímu zastavení.
   */
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

  /* Klávesnicí po kresbě: zaměřené místo z jiného zastavení přiveze svou kartu */
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
    const kr = kruhy[i];
    if (!kr) return;
    window.clearTimeout(kruhCas[i]);
    kr.classList.add("toci");
    zvuk.nastavKruh(0.7, true);
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
    orazitkuj("kruh");
    prvniReplika("kruh", "vazicka", 3);
  };

  /* ——— Hrouda ——— */
  const hrouda = rez.querySelector<SVGGElement>(".hrouda");
  let hnuti = 0;
  const prask = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const o = rez.getBoundingClientRect();
    if (!o.width) return;
    const p = document.createElement("span");
    p.className = "prask";
    p.style.left = `${(((r.left + r.width / 2 - o.left) / o.width) * 100).toFixed(2)}%`;
    p.style.top = `${(((r.top + r.height / 2 - o.top) / o.height) * 100).toFixed(2)}%`;
    for (let i = 0; i < 8; i++) {
      const c = document.createElement("i");
      c.style.setProperty("--u", `${i * 45}deg`);
      p.append(c);
    }
    rez.append(p);
    window.setTimeout(() => p.remove(), 700);
  };
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
      const b = rez.querySelector<HTMLElement>(".rez-bublinka");
      if (b) {
        prask(b);
        window.setTimeout(() => prvniReplika("hrouda", "bublinka", 1), 380);
      }
      orazitkuj("stul");
    }
  };

  /* ——— Pec ——— */
  type StavPece = "studena" | "topi" | "chladne" | "hotova" | "otevrena";
  let stavPece: StavPece = "studena";
  const displej = rez.querySelector<SVGTextElement>(".pec-displej");
  const pecG = rez.querySelector<SVGGElement>(".rez-pec");
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
  /** Teplota od–do za danou dobu; každý snímek přepíše displej a záři */
  const prubeh = (od: number, kam: number, doba: number, hotovo: () => void) => {
    if (klid) {
      teplota(kam);
      hotovo();
      return;
    }
    const start = performance.now();
    const krok = (ted: number) => {
      const t = omez((ted - start) / doba);
      teplota(od + (kam - od) * hladce(t));
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
        prvniReplika("pec-vrchol", "pecinka", 3);
        prubeh(T_MAX, 60, 3600, () => {
          pecNastav("hotova", "Vychladlo. Můžeš otevřít.", "Otevřít pec");
          zvuk.nastavPec(0);
        });
      });
    } else if (stavPece === "topi" || stavPece === "chladne") {
      pecG?.classList.remove("tres");
      void pecG?.getBoundingClientRect();
      pecG?.classList.add("tres");
      const el = kamiEl("pecinka");
      const text = kamiInfo.pecinka?.repliky[1];
      if (el && text) rekni(el, "pecinka", text);
    } else if (stavPece === "hotova") {
      pecNastav("otevrena", "Otevřeno. Všechno přežilo — a Šamotka to zase unesla.", "Zavřít pec");
      zvuk.zlato();
      orazitkuj("pec");
      window.setTimeout(() => prvniReplika("pec-otevrena", "samotka", 0), 500);
    } else {
      teplota(T_NULA);
      pecNastav("studena", "Pec je studená.", "Zapálit pec");
    }
  };

  /* ——— Kusy z police ——— */
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
      orazitkuj("police");
      prvniReplika("police", "stripek", 2);
    }
  };

  /* ——— Nástěnka ——— */
  const poukaz = rez.querySelector<SVGGElement>(".nastenka-poukaz");
  const otocPoukaz = () => {
    if (!poukaz) return;
    zvuk.papir();
    orazitkuj("poukaz");
    prvniReplika("poukaz", "cedulka", 2);
    if (klid) {
      poukaz.classList.toggle("otoceny");
      return;
    }
    poukaz.classList.remove("otaci");
    void poukaz.getBoundingClientRect();
    poukaz.classList.add("otaci");
    window.setTimeout(() => poukaz.classList.toggle("otoceny"), 300);
    window.setTimeout(() => poukaz.classList.remove("otaci"), 640);
  };
  const vlaj = () => {
    zvuk.papir();
    for (const el of [rez.querySelector(".nastenka-workshop"), sekce.querySelector("[data-listek]")]) {
      if (!el) continue;
      el.classList.remove("vlaje");
      void (el as HTMLElement).getBoundingClientRect();
      el.classList.add("vlaje");
    }
  };

  /* ——— Kuchyňka ——— */
  const kavovar = rez.querySelector<SVGGElement>(".kavovar");
  let kafeCas: number | undefined;
  const kafe = () => {
    kavovar?.classList.add("vari");
    zvuk.para();
    window.clearTimeout(kafeCas);
    kafeCas = window.setTimeout(() => kavovar?.classList.remove("vari"), 3200);
    orazitkuj("pauza");
    prvniReplika("kafe", "kapka", 1);
  };

  sekce.addEventListener("click", (e) => {
    const el = (e.target as Element).closest<HTMLElement>("[data-akce]");
    if (!el) return;
    switch (el.dataset.akce) {
      case "kruh": roztoc(Number(el.dataset.kruh ?? 1)); break;
      case "hrouda": hnet(); break;
      case "pec": pec(); break;
      case "kus": vezmi(Number(el.dataset.kus ?? 0)); break;
      case "poukaz": otocPoukaz(); break;
      case "workshop": vlaj(); break;
      case "kafe": kafe(); break;
    }
  });
}

