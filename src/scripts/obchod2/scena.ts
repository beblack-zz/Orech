/**
 * Krámek (components/obchod2/Kramek.astro): scéna na jednu obrazovku,
 * po které jezdí kamera od zastávky k zastávce — šipkami v jízdence
 * dole, tažením prstu do strany nebo klávesami ← →. Stránka se kvůli
 * tomu neprodlužuje, scroll jde normálně dál k šátku. Cestou běží den:
 *
 *   celek → okno patra → přízemí → večer (lampiony a cedule se
 *   rozsvěcují podle data-prah) → zavíráme (noren se uklidí, cedulka
 *   se otočí na 準備中 a spadne roleta)
 *
 * Hodina u zastávek roste a všechno ostatní se z ní počítá: tma
 * (prolnutí noční kopie kresby, --tma), svit (co už svítí) i zavírání.
 * Hodina jde i do data-hodina sekce a kotvy na jejím konci — obloha
 * webu (parta2/nebe.ts) jde s ní.
 *
 * Pro teď ale hodiny stojí ve 22:00 (JEN_NOC níž) — krámek je jen v noci —
 * a kamera stojí na celku (JEN_CELEK): žádné zastávky, žádný zoom, jízdenka
 * ze scény zmizela (17. 10. 2026). Ovládání níž zůstává pro případ návratu.
 *
 * Široká obrazovka má zastávky celek, okno, přízemí, večer, zavíráme;
 * úzká projíždí okno a přízemí po kouscích (kresba/scena.ts → ZASTAVKY).
 * S omezeným pohybem kamera nejede, jen přeskočí.
 */
import { priMereni, omez, hladce, mix, klid, vyzadej } from "../parta2/stav";
import * as zvuk from "../parta2/zvuk";
import { nocni, teple, prebarvi } from "../../components/obchod2/kresba/noc";

interface Ram {
  x: number;
  y: number;
  w: number;
  h: number;
}
type Rozvrzeni = "siroka" | "uzka";
interface Zastavka {
  id: string;
  /** Jak se zastávka jmenuje v jízdence */
  nazev: string;
  /** Kolik je u ní hodin */
  h: number;
}

const W = 3200;
const H = 2000;

/**
 * Pro teď jen noc (16. 10. 2026): hodiny se nepřepínají, krámek stojí
 * celou cestu ve 22:00, kdy svítí. Zastávka Zavíráme (roleta dolů) se
 * vynechá a čas v jízdence se schová. Den se vrátí s null.
 */
const JEN_NOC: number | null = 22;

const CESTA_DEN: Record<Rozvrzeni, Zastavka[]> = {
  siroka: [
    { id: "celek", nazev: "Krámek", h: 14 },
    { id: "okno", nazev: "Z Japonska", h: 15.5 },
    { id: "prizemi", nazev: "Z dílny", h: 17 },
    { id: "noc", nazev: "Večer", h: 22 },
    { id: "konec", nazev: "Zavíráme", h: 22.75 },
  ],
  uzka: [
    { id: "celek", nazev: "Krámek", h: 14 },
    { id: "okno", nazev: "Z Japonska", h: 15 },
    { id: "okno2", nazev: "Z Japonska", h: 15.5 },
    { id: "vylohaL", nazev: "Z dílny", h: 16.2 },
    { id: "dvere", nazev: "U pultu", h: 16.6 },
    { id: "vylohaP", nazev: "Z dílny", h: 17 },
    { id: "noc", nazev: "Večer", h: 22 },
    { id: "konec", nazev: "Zavíráme", h: 22.75 },
  ],
};

/** Kamera stojí na celku krámku a nikam nejede (17. 10. 2026). Zastávky se vrátí s false. */
const JEN_CELEK = true;

const jenNoc = (z: Zastavka[]) => (JEN_NOC === null ? z : z.filter((x) => x.id !== "konec").map((x) => ({ ...x, h: JEN_NOC })));
const jenCelek = (z: Zastavka[]) => (JEN_CELEK ? z.filter((x) => x.id === "celek") : z);
const CESTA: Record<Rozvrzeni, Zastavka[]> = { siroka: jenCelek(jenNoc(CESTA_DEN.siroka)), uzka: jenCelek(jenNoc(CESTA_DEN.uzka)) };

/** Zastávka z jednoho rozvržení, která v druhém není → nejbližší, která je */
const NAHRADA: Record<Rozvrzeni, Record<string, string>> = {
  siroka: { okno2: "okno", vylohaL: "prizemi", dvere: "prizemi", vylohaP: "prizemi" },
  uzka: { prizemi: "vylohaL" },
};

/** Tma (prolnutí noční kresby), svit (co už svítí) a zavírání (0 = otevřeno, 1 = roleta dole) z hodiny */
const tmaZ = (h: number) => hladce(omez((h - 18) / (21.4 - 18)));
const svitZ = (h: number) => omez((h - 18.6) / (22 - 18.6));
const zavrenoZ = (h: number) => omez((h - 22.05) / (22.6 - 22.05));

/** Jak dlouho jede kamera z hodiny a do hodiny b (ms) — do večera déle, ať se stihne rozsvítit, zpátky rychleji */
const trvani = (a: number, b: number) => {
  if (klid) return 0;
  let ms = 650 + Math.abs(b - a) * 560;
  if (zavrenoZ(a) !== zavrenoZ(b)) ms += 1200;
  return Math.min(4400, ms) * (b < a ? 0.6 : 1);
};

interface Kamera {
  s: number;
  fx: number;
  fy: number;
  ax: number;
  ay: number;
}
const mixKamera = (a: Kamera, b: Kamera, k: number): Kamera => ({
  s: Math.exp(mix(Math.log(a.s), Math.log(b.s), k)),
  fx: mix(a.fx, b.fx, k),
  fy: mix(a.fy, b.fy, k),
  ax: mix(a.ax, b.ax, k),
  ay: mix(a.ay, b.ay, k),
});

export function scena() {
  const sekce = document.querySelector<HTMLElement>("#kramek");
  if (!sekce) return;
  const scenaEl = sekce.querySelector<HTMLElement>(".krm-scena")!;
  const svet = sekce.querySelector<HTMLElement>(".krm-svet")!;
  const kotva = sekce.querySelector<HTMLElement>(".krm-kotva");
  const uvod = sekce.querySelector<HTMLElement>(".krm-uvod");
  const konec = sekce.querySelector<HTMLElement>(".krm-konec");
  const popisky = [...sekce.querySelectorAll<HTMLElement>(".krm-popisek")];
  const casText = sekce.querySelector<HTMLElement>(".krm-cas-text");
  const zbozi = sekce.querySelector<HTMLElement>(".krm-zbozi");
  const cesta = sekce.querySelector<HTMLElement>(".krm-cesta");
  const zpet = cesta?.querySelector<HTMLButtonElement>('[data-cesta="zpet"]');
  const dal = cesta?.querySelector<HTMLButtonElement>('[data-cesta="dal"]');
  const dalText = cesta?.querySelector<HTMLElement>(".krm-cesta-dal-text");
  const kdeText = cesta?.querySelector<HTMLElement>(".krm-cesta-kde");
  const svetla = [...sekce.querySelectorAll<SVGGElement>(".krm-svetla [data-prah]")].map((el) => ({
    el,
    prah: Number(el.dataset.prah),
    neon: el.classList.contains("krm-neon"),
    sviti: false,
  }));
  const zastavky = JSON.parse(sekce.dataset.zastavky ?? "{}") as Record<Rozvrzeni, { id: string; ram: Ram }[]>;

  /* Noční kopie vrstev: HTML nese jen denní kresbu, noční se z ní přebarví až tady —
     po načtení, až bude chvíle, nebo hned, jakmile se jede do večera */
  let nocHotova = false;
  const udelejNoc = () => {
    if (nocHotova) return;
    nocHotova = true;
    sekce.querySelectorAll<SVGSVGElement>("svg[data-noc]").forEach((noc) => {
      const kde = noc.dataset.noc;
      const den = sekce.querySelector<SVGSVGElement>(`svg[data-vrstva="${kde}"]`);
      if (den) noc.innerHTML = kde === "uvnitr" ? prebarvi(den.innerHTML, teple, "ku") : prebarvi(den.innerHTML, nocni, "kn");
    });
  };
  /* Den stranou (jen noc): celé denní vrstvy (zdroj noční kresby) se odloží jako kopie
     do <template class="krm-den-stranou">, kde se nekreslí, neanimují ani nepočítají
     styly — nic se nemaže. V DOM z nich zůstane jen to, na co odkazuje zbytek krámku
     (vrstva světel bere z denní kresby tvary, přechody a ořezy `#kd-…`), přesunuté
     do <defs> téže denní vrstvy, ať mají pořád stejné okolí jako dřív. */
  const odlozDen = () => {
    const dny = [...sekce.querySelectorAll<SVGSVGElement>("svg.krm-den")];
    if (!dny.length) return;
    const stranou = document.createElement("template");
    stranou.className = "krm-den-stranou";
    dny.forEach((den) => stranou.content.append(den.cloneNode(true)));
    sekce.append(stranou);
    /* co z denní kresby potřebuje zbytek krámku — i odkazy uvnitř toho, co potřebuje */
    const ODKAZ = /#(kd-[\w-]+)/g;
    const hledej = (el: Element, kam: Set<string>) => {
      for (const e of [el, ...el.querySelectorAll("*")])
        for (const a of e.attributes) for (const m of a.value.matchAll(ODKAZ)) kam.add(m[1]);
    };
    const potreba = new Set<string>();
    for (const e of sekce.querySelectorAll("*")) {
      if (e.closest("svg.krm-den")) continue;
      for (const a of e.attributes) for (const m of a.value.matchAll(ODKAZ)) potreba.add(m[1]);
    }
    const prvky = new Map<string, Element>();
    const fronta = [...potreba];
    while (fronta.length) {
      const id = fronta.pop()!;
      if (prvky.has(id)) continue;
      const el = dny.map((d) => d.querySelector(`[id="${id}"]`)).find(Boolean);
      if (!el) continue;
      prvky.set(id, el);
      const dalsi = new Set<string>();
      hledej(el, dalsi);
      dalsi.forEach((x) => !prvky.has(x) && fronta.push(x));
    }
    /* vnořené potřebné prvky jdou s rodičem, přesouvají se jen nejvyšší */
    const nejvyssi = [...prvky.values()].filter((el) => ![...prvky.values()].some((o) => o !== el && o.contains(el)));
    for (const den of dny) {
      const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
      defs.setAttribute("class", "krm-den-potreba");
      for (const el of nejvyssi) if (den.contains(el)) defs.append(el);
      den.replaceChildren(defs);
    }
  };
  /* Jen noc: kresba musí být noční hned, jinak by krámek na začátku probleskl ve dne */
  if (JEN_NOC !== null) {
    udelejNoc();
    odlozDen();
    const casEl = sekce.querySelector<HTMLElement>(".krm-cas");
    if (casEl) casEl.style.display = "none";
  } else window.setTimeout(udelejNoc, 2500);

  let rozvrzeni: Rozvrzeni | "" = "";
  let cestaTed = CESTA.siroka;
  let vw = 1;
  let vh = 1;
  let kamery = new Map<string, Kamera>();
  let posledni = "";
  let klidCas: number | undefined;
  let hodinaTed = -1;

  /** Zastávka, na které kamera stojí nebo ke které jede */
  let kde = 0;
  /** Zastávka, ze které naposled vyjela (karty a popisky podle ní ještě chvíli drží) */
  let odkud = "celek";
  /** Kde kamera právě je a kolik je hodin */
  let ted: { k: Kamera | null; h: number } = { k: null, h: CESTA.siroka[0].h };
  let pohyb: { od: { k: Kamera; h: number }; start: number; dur: number } | null = null;
  let snimek = 0;

  const cil = () => cestaTed[kde];

  /* ——— Kam se vejde zastávka: obdélník obrazovky, do kterého se rám zastávky vtěsná ——— */
  const plocha = (id: string): Ram => {
    const hlava = vw < 700 ? 64 : 76;
    const karta = id === "celek" ? uvod : id === "konec" ? konec : null;
    if (karta && rozvrzeni === "siroka") {
      const vpravo = karta.offsetLeft + karta.offsetWidth + 24;
      return { x: vpravo, y: hlava, w: Math.max(200, vw - vpravo - 24), h: vh - hlava - 96 };
    }
    if (karta) {
      const nahore = Math.max(hlava + 160, karta.offsetTop - 12);
      return { x: 8, y: hlava, w: vw - 16, h: nahore - hlava };
    }
    // dole popisek s odkazem do nabídky (a na telefonu pod ním jízdenka)
    const dole = rozvrzeni === "uzka" ? 204 : 132;
    return { x: 20, y: hlava, w: vw - 40, h: vh - hlava - dole };
  };

  const kamera = (id: string): Kamera => {
    const z = zastavky[rozvrzeni || "siroka"].find((x) => x.id === id) ?? zastavky[rozvrzeni || "siroka"][0];
    const r = z.ram;
    const p = plocha(id);
    const s = Math.max(Math.min(p.w / r.w, p.h / r.h), vw / W);
    return { s, fx: r.x + r.w / 2, fy: r.y + r.h / 2, ax: p.x + p.w / 2, ay: p.y + p.h / 2 };
  };

  const nastavKameru = (k: Kamera) => {
    let tx = k.ax - k.s * k.fx;
    const ty = k.ay - k.s * k.fy;
    // Svět vždycky přes celou šířku — vlevo a vpravo za sousedy už nic není
    tx = Math.min(0, Math.max(vw - k.s * W, tx));
    const t = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${k.s.toFixed(4)})`;
    if (t === posledni) return;
    posledni = t;
    svet.style.transform = t;
    // Bubliny a obrysy tlačítek ve světě drží stejnou velikost na obrazovce
    svet.style.setProperty("--s", k.s.toFixed(4));
    svet.classList.add("jede");
    window.clearTimeout(klidCas);
    klidCas = window.setTimeout(() => svet.classList.remove("jede"), 180);
  };

  const hodina = (h: number) => {
    const hh = Math.floor(h);
    const mm = Math.floor(((h - hh) * 60) / 5) * 5;
    return `${hh}:${String(mm).padStart(2, "0")}`;
  };

  /* ——— Den běží: z hodiny tma, světla a zavírání ——— */
  const nastavHodinu = (h: number) => {
    if (Math.abs(h - hodinaTed) < 0.002) return;
    hodinaTed = h;
    const tma = tmaZ(h);
    const svit = svitZ(h);
    const zav = zavrenoZ(h);
    sekce.dataset.hodina = h.toFixed(3);
    if (kotva) kotva.dataset.hodina = h.toFixed(3);
    scenaEl.style.setProperty("--tma", tma.toFixed(3));
    scenaEl.style.setProperty("--hod", (((h % 12) / 12) * 360).toFixed(1));
    scenaEl.style.setProperty("--min", (((h % 1) * 360) % 360).toFixed(1));
    scenaEl.classList.toggle("je-den", tma < 0.001);
    scenaEl.classList.toggle("je-noc", tma > 0.999);
    scenaEl.classList.toggle("vecer", h > 18.2);
    if (casText) casText.textContent = hodina(h);

    for (const s of svetla) {
      const ma = svit > 0 && svit >= s.prah - 1e-6;
      if (ma === s.sviti) continue;
      s.sviti = ma;
      s.el.classList.toggle("sviti", ma);
      if (ma && s.neon && !klid) {
        s.el.classList.remove("blika");
        void s.el.getBoundingClientRect();
        s.el.classList.add("blika");
        zvuk.blesk();
      }
    }

    /* Zavírání: nejdřív se uklidí noren a otočí cedulka, pak spadne roleta */
    const noren = omez(zav / 0.25);
    const roleta = hladce(omez((zav - 0.25) / 0.75));
    scenaEl.style.setProperty("--noren", noren.toFixed(3));
    scenaEl.style.setProperty("--zavreno", roleta.toFixed(3));
    scenaEl.classList.toggle("zavira", zav > 0.08);
    if (zbozi) zbozi.inert = roleta > 0.85;
  };

  /* ——— Karty a popisky: u cílové zastávky se ukážou, až tam kamera skoro dojede ——— */
  const nastavKarty = (t: number) => {
    const c = cil().id;
    const vidi = (pro: string[]) => pro.includes(c) && (!pohyb || t > 0.75 || pro.includes(odkud));
    scenaEl.classList.toggle("bez-uvodu", !vidi(["celek"]));
    for (const p of popisky) p.classList.toggle("je", vidi((p.dataset.pro ?? "").split(" ")));
    konec?.classList.toggle("je", vidi(["konec"]));
  };

  /* ——— Jízdenka: kde jsme a kam se jede dál ——— */
  const nastavCestu = () => {
    const dalsi = cestaTed[kde + 1];
    if (kdeText) kdeText.textContent = cil().nazev;
    if (zpet) zpet.disabled = kde === 0;
    if (dal) {
      const text = dalsi ? dalsi.nazev : "Znovu od rána";
      if (dalText) dalText.textContent = text;
      dal.setAttribute("aria-label", dalsi ? `Dál: ${dalsi.nazev}` : "Znovu od rána");
      dal.classList.toggle("znovu", !dalsi);
    }
  };

  const krok = (now: number) => {
    if (!pohyb || !ted.k) return;
    const t = pohyb.dur > 0 ? omez((now - pohyb.start) / pohyb.dur) : 1;
    const od = pohyb.od;
    const c = cil();
    const b = kamery.get(c.id)!;
    // Do večera kamera nejdřív dojede a pak se rozsvěcuje, z večera nejdřív zhasne a pak jede
    const kc = od.h < 18 && c.h >= 20 ? hladce(omez(t / 0.45)) : od.h >= 20 && c.h < 18 ? hladce(omez((t - 0.55) / 0.45)) : hladce(t);
    const k = mixKamera(od.k, b, kc);
    const h = mix(od.h, c.h, t);
    ted = { k, h };
    if (t >= 1) {
      pohyb = null;
      odkud = c.id;
    }
    nastavKameru(k);
    nastavHodinu(h);
    nastavKarty(t);
    // Obloha si v dalším snímku přečte novou hodinu
    vyzadej();
    if (pohyb) snimek = requestAnimationFrame(krok);
  };

  /** Pošle kameru na zastávku (index v cestě); plynule jede, jinak skočí */
  const jed = (i: number, plynule = true) => {
    const j = Math.round(omez(i, 0, cestaTed.length - 1));
    if (!ted.k || (j === kde && !pohyb)) return;
    const c = cestaTed[j];
    if (c.h > 17) udelejNoc();
    if (!pohyb) odkud = cil().id;
    kde = j;
    cesta?.classList.remove("zve");
    pohyb = { od: { k: ted.k, h: ted.h }, start: performance.now(), dur: plynule ? trvani(ted.h, c.h) : 0 };
    window.cancelAnimationFrame(snimek);
    nastavCestu();
    krok(performance.now());
  };
  const jedNa = (id: string, plynule = true) => {
    const hledej = NAHRADA[rozvrzeni || "siroka"][id] ?? id;
    const i = cestaTed.findIndex((z) => z.id === hledej);
    if (i >= 0) jed(i, plynule);
  };

  /** Bez jízdy: kamera stojí na zastávce (po změně velikosti okna, na začátku) */
  const postav = () => {
    window.cancelAnimationFrame(snimek);
    pohyb = null;
    odkud = cil().id;
    ted = { k: kamery.get(cil().id)!, h: cil().h };
    nastavKameru(ted.k!);
    nastavHodinu(ted.h);
    nastavKarty(1);
    nastavCestu();
  };

  priMereni(() => {
    vw = scenaEl.clientWidth || window.innerWidth;
    vh = scenaEl.clientHeight || window.innerHeight;
    const nove: Rozvrzeni = vw < 760 || vw / vh < 0.95 ? "uzka" : "siroka";
    const zmena = nove !== rozvrzeni;
    if (zmena) {
      const bylo = rozvrzeni ? cil().id : "celek";
      rozvrzeni = nove;
      sekce.dataset.rozvrzeni = nove;
      cestaTed = CESTA[nove];
      const id = NAHRADA[nove][bylo] ?? bylo;
      kde = Math.max(0, cestaTed.findIndex((z) => z.id === id));
    }
    kamery = new Map(zastavky[nove].map((z) => [z.id, kamera(z.id)]));
    posledni = "";
    hodinaTed = -1;
    // Rozjetá kamera dojede k nově změřenému cíli; jinak se jen postaví
    if (zmena || !pohyb) postav();
  });

  /* ——— Ovládání ——— */
  dal?.addEventListener("click", () => jed(kde + 1 < cestaTed.length ? kde + 1 : 0));
  zpet?.addEventListener("click", () => jed(kde - 1));
  sekce.querySelectorAll<HTMLElement>("[data-jed]").forEach((a) =>
    a.addEventListener("click", (e) => {
      e.preventDefault();
      jedNa(a.dataset.jed!);
    }),
  );

  /* Klávesnice: šipky do stran, a kus, na který skočí fokus (Tab), si kamera najde */
  sekce.addEventListener("keydown", (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
    e.preventDefault();
    jed(e.key === "ArrowRight" ? kde + 1 : kde - 1);
  });
  sekce.addEventListener("focusin", (e) => {
    const t = e.target as Element;
    const el = t.closest<HTMLElement>("[data-zastavka]");
    if (el?.dataset.zastavka && t.matches(":focus-visible")) jedNa(el.dataset.zastavka, false);
  });

  /* Prstem: tah do strany jede na další nebo předchozí zastávku (svisle se dál scrolluje) */
  let tah: { x: number; y: number; id: number } | null = null;
  scenaEl.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "touch" || (e.target as Element).closest(".krm-karta, .krm-cesta")) return;
    tah = { x: e.clientX, y: e.clientY, id: e.pointerId };
  });
  scenaEl.addEventListener("pointerup", (e) => {
    if (!tah || e.pointerId !== tah.id) return;
    const dx = e.clientX - tah.x;
    const dy = e.clientY - tah.y;
    tah = null;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) jed(dx < 0 ? kde + 1 : kde - 1);
  });
  scenaEl.addEventListener("pointercancel", () => (tah = null));

  initKousky(sekce);
}

/* ——— Drobnosti ve scéně: lampiony, automat, kočka ——— */
function initKousky(sekce: HTMLElement) {
  const bublina = sekce.querySelector<HTMLElement>(".krm-bublina");
  let bublinaCas: number | undefined;
  const rekni = (u: HTMLElement, text: string) => {
    if (!bublina) return;
    bublina.textContent = text;
    bublina.hidden = false;
    bublina.style.left = `${parseFloat(u.style.left) + parseFloat(u.style.width) / 2}px`;
    bublina.style.top = `${parseFloat(u.style.top)}px`;
    bublina.classList.remove("je");
    void bublina.offsetWidth;
    bublina.classList.add("je");
    window.clearTimeout(bublinaCas);
    bublinaCas = window.setTimeout(() => {
      bublina.classList.remove("je");
      bublinaCas = window.setTimeout(() => (bublina.hidden = true), 400);
    }, 3200);
  };

  /* Lampion pod myší se rozhoupe — denní, noční i svítící dvojník spolu */
  sekce.querySelectorAll<HTMLElement>(".krm-lampion-zona").forEach((z) =>
    z.addEventListener("pointerenter", () => {
      if (klid) return;
      sekce.querySelectorAll<SVGGElement>(`.krm-lampion[data-i="${z.dataset.i}"]`).forEach((g) => {
        g.classList.remove("kyv");
        void g.getBoundingClientRect();
        g.classList.add("kyv");
      });
    }),
  );

  /* Automat na nápady: cvakne, vypadne plechovka a otevře se náhodný kus */
  const automat = sekce.querySelector<HTMLButtonElement>(".krm-automat");
  automat?.addEventListener("click", () => {
    const kusy = [...sekce.querySelectorAll<HTMLElement>(".krm-svet [data-kramek-kus]")];
    if (!kusy.length) return;
    const volne = kusy.filter((k) => !k.classList.contains("v-satku"));
    const kus = (volne.length ? volne : kusy)[Math.floor(Math.random() * (volne.length || kusy.length))];
    const jmeno = kus.querySelector(".krm-paska")?.textContent ?? "";
    zvuk.cvak();
    automat.classList.remove("vydava");
    void automat.offsetWidth;
    automat.classList.add("vydava");
    rekni(automat, `Cvak! Automat ti vybral: ${jmeno}.`);
    window.setTimeout(() => {
      zvuk.pop();
      kus.querySelector<HTMLButtonElement>("[data-otevri-kus]")?.click();
    }, klid ? 0 : 900);
  });

  const kocka = sekce.querySelector<HTMLElement>(".krm-zona-kocka");
  kocka?.addEventListener("click", () => {
    rekni(kocka, ["Mňau.", "Mrrr…", "(spí dál)"][Math.floor(Math.random() * 3)]);
    sekce.querySelectorAll<SVGGElement>(".krm-kocka-ocas").forEach((g) => {
      g.classList.remove("mrska");
      void g.getBoundingClientRect();
      g.classList.add("mrska");
    });
  });
}
